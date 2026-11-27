// assembl lab · Auckland live: the 3D city. Real ground (LINZ heights, OSM land cover), OSM building heights, a sky and sun
// set by the real time in Auckland, a moving harbour, and the live vehicles (vehicles.js). Natural colours only.
import * as T from 'three';
import { cameraPose, flightPose } from './camera-flight.mjs';
import { createFerryBuilding } from './ferry-building.js';
import { createBusSightlines, busCameraPose } from './bus-sightline.mjs';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { sunPosition, AREA, ORIGIN } from './transit.js';
import { createFleet, createBeacons } from './vehicles.js?v=5e5a5ccf6f';

const DATA = new URL('./data/', import.meta.url).href;
const WM = AREA.maxX - AREA.minX, HM = AREA.maxY - AREA.minY, X0 = AREA.minX - ORIGIN.E, Z0 = ORIGIN.N - AREA.maxY; // world x, z of the north-west corner
const LAND_MIN = 0.6; // land sits at least this far above the sea surface so the shore reads

// ------------------------------------------------------------------------------------------------ small noise library (GLSL)
const NOISE = `
float hash12(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash12(i),hash12(i+vec2(1,0)),u.x), mix(hash12(i+vec2(0,1)),hash12(i+vec2(1,1)),u.x), u.y); }
float fbm(vec2 p){ float a=0.5, s=0.0; for(int i=0;i<4;i++){ s+=a*vnoise(p); p*=2.03; a*=0.5; } return s; }`;

function waterNormals(size = 256) { // tileable normal map from summed waves, built at load
  const d = new Uint8Array(size * size * 4), H = new Float32Array(size * size), TAU = Math.PI * 2;
  const waves = []; let seed = 3; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 28; i++) waves.push([1 + Math.floor(rnd() * 9), Math.floor(rnd() * 9) - 4, rnd() * TAU, 1 / (1 + i * 0.35)]);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { let h = 0; for (const [a, b, ph, amp] of waves) h += amp * Math.sin(TAU * (a * x + b * y) / size + ph); H[y * size + x] = h; }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const hx = H[y * size + (x + 1) % size] - H[y * size + (x - 1 + size) % size], hy = H[((y + 1) % size) * size + x] - H[((y - 1 + size) % size) * size + x];
    const v = new T.Vector3(-hx * 0.35, -hy * 0.35, 1).normalize(), i = (y * size + x) * 4;
    d[i] = (v.x * 0.5 + 0.5) * 255; d[i + 1] = (v.y * 0.5 + 0.5) * 255; d[i + 2] = (v.z * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  const t = new T.DataTexture(d, size, size); t.wrapS = t.wrapT = T.RepeatWrapping; t.generateMipmaps = true; t.minFilter = T.LinearMipmapLinearFilter; t.magFilter = T.LinearFilter; t.needsUpdate = true;
  return t;
}

export async function createWorld(canvas, { phone = false, capture = false, timeMs = null } = {}) {
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: capture, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, phone ? 1.5 : 1.75));
  renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.AgXToneMapping; renderer.toneMappingExposure = 1.04;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;

  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(42, 1, 2, 160000);
  const controls = new MapControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.08; controls.minDistance = 60; controls.maxDistance = 26000; controls.maxPolarAngle = Math.PI * 0.47; controls.screenSpacePanning = false;

  // ---------------------------------------------------------------- data
  const lightsTex = new T.TextureLoader().load(DATA + 'ground-lights.webp');
  const [hHead, hBuf, bBuf, tex] = await Promise.all([
    fetch(DATA + 'ground-height.json').then((r) => r.json()), fetch(DATA + 'ground-height.bin').then((r) => r.arrayBuffer()),
    fetch(DATA + 'buildings.bin').then((r) => r.arrayBuffer()), new T.TextureLoader().loadAsync(DATA + 'ground-colour.webp'),
  ]);
  const GW = hHead.width, GH = hHead.height, STEP = hHead.stepMetres, grid = new Int16Array(hBuf);
  // land / sea from the colour map's alpha (OSM water polygons), read once at low resolution
  const mw = 1024, mh = Math.round(mw * tex.image.height / tex.image.width), mc = document.createElement('canvas'); mc.width = mw; mc.height = mh;
  const mctx = mc.getContext('2d', { willReadFrequently: true }); mctx.drawImage(tex.image, 0, 0, mw, mh); const mask = mctx.getImageData(0, 0, mw, mh).data;
  const isLand = (x, z) => { const u = Math.floor((x - X0) / WM * mw), v = Math.floor((z - Z0) / HM * mh); if (u < 0 || v < 0 || u >= mw || v >= mh) return false; return mask[(v * mw + u) * 4 + 3] > 127; };
  const rawH = (i, j) => grid[Math.min(GH - 1, Math.max(0, j)) * GW + Math.min(GW - 1, Math.max(0, i))] / 10;
  function heightAt(x, z) { // metres above NZVD2016 on land; 0 on the sea
    const gx = (x - X0) / STEP, gz = (z - Z0) / STEP, i = Math.floor(gx), j = Math.floor(gz), fx = gx - i, fz = gz - j;
    const h = (rawH(i, j) * (1 - fx) + rawH(i + 1, j) * fx) * (1 - fz) + (rawH(i, j + 1) * (1 - fx) + rawH(i + 1, j + 1) * fx) * fz;
    return isLand(x, z) ? Math.max(LAND_MIN, h) : 0;
  }

  function groundAt(x, z) { // terrain height regardless of the water mask (matches the ground mesh)
    const gx = (x - X0) / STEP, gz = (z - Z0) / STEP, i = Math.floor(gx), j = Math.floor(gz), fx = gx - i, fz = gz - j;
    return Math.max(LAND_MIN, (rawH(i, j) * (1 - fx) + rawH(i + 1, j) * fx) * (1 - fz) + (rawH(i, j + 1) * (1 - fx) + rawH(i + 1, j + 1) * fx) * fz);
  }

  // ---------------------------------------------------------------- sky, sun, light
  const sky = new Sky(); sky.scale.setScalar(150000); scene.add(sky);
  // A camera-only upper-sky gradient. Keep the physical sun and the unfiltered sky used by scene lighting.
  sky.material.fragmentShader = sky.material.fragmentShader.replace('#include <tonemapping_fragment>', `
    float skyElevation = normalize(vWorldPosition-cameraPosition).y;
    float gradient = smoothstep(0.01,0.58,skyElevation) * smoothstep(-.08,.14,vSunDirection.y);
    gl_FragColor.rgb = mix(gl_FragColor.rgb,vec3(.22,.35,.54),gradient*.55);
    #include <tonemapping_fragment>`);

  const su = sky.material.uniforms; su.turbidity.value = 3.2; su.rayleigh.value = 1.4; su.mieCoefficient.value = 0.004; su.mieDirectionalG.value = 0.8;
  // after dark the sky model drifts purple; a plain night gradient (navy to near-black) fades in over it
  const nightSky = new T.Mesh(new T.SphereGeometry(140000, 32, 16), new T.ShaderMaterial({ side: T.BackSide, transparent: true, depthWrite: false, fog: false,
    uniforms: { uA: { value: 0 } }, vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec3 vD; uniform float uA; void main(){ float h = clamp(vD.y, 0.0, 1.0); vec3 c = mix(vec3(0.075, 0.11, 0.16), vec3(0.012, 0.02, 0.04), pow(h, 0.45)); gl_FragColor = vec4(c, uA); }' }));
  nightSky.renderOrder = -1; nightSky.frustumCulled = false; scene.add(nightSky);
  // horizon haze: blends the far edge of the sea into the sky in the fog's own colour, so there is no hard line
  const haze = new T.Mesh(new T.CylinderGeometry(60000, 60000, 12000, 64, 1, true), new T.ShaderMaterial({ side: T.BackSide, transparent: true, depthWrite: false, fog: false,
    uniforms: { uC: { value: new T.Color() } }, vertexShader: 'varying float vY; void main(){ vY = position.y / 6000.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying float vY; uniform vec3 uC; void main(){ float a = 1.0 - smoothstep(-0.6, 0.15, vY); gl_FragColor = vec4(uC, a);\n#include <colorspace_fragment>\n}' }));
  haze.position.y = 1000; haze.renderOrder = -1; haze.frustumCulled = false; scene.add(haze);
  const sun = new T.DirectionalLight('#fff4e5', 3); sun.castShadow = true;
  const sm = phone ? 1024 : 2048; sun.shadow.mapSize.set(sm, sm); const sc = sun.shadow.camera; sc.near = 100; sc.far = 12000; sc.left = sc.bottom = -1600; sc.right = sc.top = 1600;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 1.2; scene.add(sun, sun.target);
  const hemi = new T.HemisphereLight('#cfe0ff', '#5d5a4c', 0.9); scene.add(hemi);
  scene.fog = new T.FogExp2('#bcc9d4', 0.000055);
  const pmrem = new T.PMREMGenerator(renderer), skyScene = new T.Scene(), skyCopy = new Sky(); skyCopy.scale.setScalar(1000); skyScene.add(skyCopy);
  let envRT = null, night = 0, sunState = null;
  function setTime(ms, cloudPct = null) {
    const s = sunPosition(ms); sunState = s;
    const el = s.elevation * Math.PI / 180, az = s.azimuth * Math.PI / 180;
    const dir = new T.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
    su.sunPosition.value.copy(dir);
    const cloud = cloudPct == null ? 0.25 : Math.min(1, Math.max(0, cloudPct / 100));
    su.turbidity.value = 2.2 + cloud * 6.2; su.rayleigh.value = 1.35 + cloud * 1.1; su.mieCoefficient.value = 0.003 + cloud * 0.012;
    for (const k of ['turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG', 'sunPosition']) skyCopy.material.uniforms[k].value = su[k].value.clone ? su[k].value.clone() : su[k].value;
    const day = T.MathUtils.smoothstep(s.elevation, -6, 10), golden = 1 - T.MathUtils.smoothstep(s.elevation, 2, 22);
    const twilight = Math.max(0, 1 - Math.abs(s.elevation + 3) / 7);
    night = 1 - T.MathUtils.smoothstep(s.elevation, -8, 1);
    nightSky.material.uniforms.uA.value = T.MathUtils.clamp((-s.elevation - 3) / 9, 0, 1);
    sun.intensity = day * (2.75 - cloud * 1.42); sun.color.set('#fff4e5').lerp(new T.Color('#ffb36b'), golden * 0.8);
    hemi.intensity = 0.1 + twilight * 0.3 + day * (0.36 + cloud * 0.27); hemi.color.set('#cfe0ff').lerp(new T.Color('#1d2a44'), night);
    hemi.groundColor.set('#5d5a4c').lerp(new T.Color('#111318'), night);
    scene.fog.color.set('#bcc9d4').lerp(new T.Color('#e6c3a3'), golden * day * 0.6).lerp(new T.Color('#0b1119'), night).lerp(new T.Color('#b4bac0'), cloud * day * 0.4);
    renderer.toneMappingExposure = 0.9 - cloud * day * 0.18 + night * 0.23; haze.material.uniforms.uC.value.copy(scene.fog.color);
    sky.visible = true; sun.userData.dir = dir;
    if (envRT) envRT.dispose(); envRT = pmrem.fromScene(skyScene, 0, 1, 2000); scene.environment = envRT.texture;
    scene.environmentIntensity = 0.05 + twilight * 0.35 + day * 0.45;
    fleet.setNight(night); bMat.userData.uNight.value = night; gMat.userData.uNight.value = night;
    return s;
  }

  // ---------------------------------------------------------------- ground
  const stride = phone ? 2 : 1, sx = Math.floor((GW - 1) / stride), sz = Math.floor((GH - 1) / stride);
  const gGeo = new T.PlaneGeometry(WM, HM, sx, sz); gGeo.rotateX(-Math.PI / 2); gGeo.translate(X0 + WM / 2, 0, Z0 + HM / 2);
  { const p = gGeo.attributes.position; for (let j = 0; j <= sz; j++) for (let i = 0; i <= sx; i++) p.setY(j * (sx + 1) + i, Math.max(LAND_MIN, rawH(i * stride, j * stride))); gGeo.computeVertexNormals(); }
  tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy(); tex.generateMipmaps = true;
  const gMat = new T.MeshStandardMaterial({ map: tex, alphaTest: 0.5, roughness: 0.93, metalness: 0 });
  gMat.userData.uNight = { value: 0 };
  gMat.onBeforeCompile = (s) => {
    s.uniforms.uNight = gMat.userData.uNight; s.uniforms.uLights = { value: lightsTex };
    s.uniforms.uWaterfront = aerial; s.uniforms.uHasWaterfront = hasAerial;
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nuniform float uNight;\nuniform sampler2D uLights;\nuniform sampler2D uWaterfront;\nuniform float uHasWaterfront;' + NOISE)
      .replace('#include <map_fragment>', `#include <map_fragment>
        float dn = fbm(vWPos.xz / 3.5) * 0.6 + fbm(vWPos.xz / 40.0) * 0.4;
        // GeoTIFF crop bounds in NZTM: 1756960–1758400 E, 5920080–5921520 N.
        // North is negative Z, and the texture's upper edge is north.
        vec2 orthoUv = vec2((vWPos.x + 2336.0) / 1440.0, (vWPos.z + 816.0) / 1440.0);
        vec2 inset = min(orthoUv,vec2(1.0)-orthoUv);
        float feather = smoothstep(0.0,0.075,inset.x) * smoothstep(0.0,0.11,inset.y);
        diffuseColor.rgb *= 0.86 + 0.28 * dn;
        if (uHasWaterfront > 0.5 && feather > 0.0) {
        vec3 photo = texture2D(uWaterfront, clamp(vec2(orthoUv.x,1.0-orthoUv.y),0.0,1.0)).rgb;
        // No overlay if the tile is missing/nodata; preserve authoritative water alpha.
        float present = smoothstep(.004,.018,max(photo.r,max(photo.g,photo.b)));
        float blend = feather * uHasWaterfront * present;
        diffuseColor.rgb = mix(diffuseColor.rgb, photo * (1.12 + 0.04 * dn), blend);
        }
        // street lights at night, from the OSM road map (ground-lights.webp); dimmer and patchy away from the road centre
        float road = texture2D(uLights, vMapUv).r;
        vec3 nightGlow = mix(vec3(1.0, 0.66, 0.34), vec3(0.95, 0.9, 0.82), step(0.8, road)) * road * (0.7 + 0.6 * vnoise(vWPos.xz / 18.0)) * uNight;`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += nightGlow * 0.3 + diffuseColor.rgb * uNight * 0.04;');
  };
  // Auckland Council open orthophoto is a visual overlay only, not a height/shore/transit source.
  const aerial = { value: null }, hasAerial = { value: 0 };
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let aerialDetailRequested = false;
  let aerialDetailReady = false;
  function loadAerial(file, isDetail = false) {
    new T.TextureLoader().load(DATA + file, (t) => {
      if (aerialDetailReady) { t.dispose(); return; }
      t.colorSpace = T.SRGBColorSpace; t.anisotropy = Math.min(phone ? 4 : 12, renderer.capabilities.getMaxAnisotropy());
      const former = aerial.value;
      aerial.value = t; hasAerial.value = 1; aerialDetailReady = isDetail;
      former?.dispose();
    }, undefined, () => {});
  }
  loadAerial('waterfront-aerial.webp');
  const ground = new T.Mesh(gGeo, gMat); ground.receiveShadow = true; ground.name = 'ground_LINZ_heights_OSM_landcover'; scene.add(ground);

  // ---------------------------------------------------------------- the sea
  const wn = waterNormals(phone ? 128 : 192); wn.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const wMat = new T.MeshStandardMaterial({ color: '#305958', roughness: 0.25, metalness: 0.0, normalMap: wn, normalScale: new T.Vector2(0.19, 0.19), envMapIntensity: 1.0 });
  wMat.userData.t = { value: 0 };
  // One quarter-resolution, throttled planar sampling pass; no extra pass on phones.
  const reflection = (phone || !renderer.extensions.has('EXT_color_buffer_float')) ? null : new Reflector(new T.PlaneGeometry(1, 1), { textureWidth: 480, textureHeight: 270, multisample: 0, clipBias: 0.002 });
  const reflected = { value: 0 };
  if (reflection) { reflection.rotation.x = -Math.PI / 2; reflection.updateMatrixWorld(); }
  const reflectionMatrix = reflection ? reflection.material.uniforms.textureMatrix.value.clone() : new T.Matrix4();
  const inverseReceiver = reflection ? reflection.matrixWorld.clone().invert() : new T.Matrix4();

  wMat.onBeforeCompile = (s) => {
    s.uniforms.uT = wMat.userData.t;
    s.uniforms.uShore = { value: tex };
    if (reflection) {
      s.uniforms.uMirror = { value: reflection.getRenderTarget().texture };
      s.uniforms.uReflect = reflected; s.uniforms.uMirrorMatrix = { value: reflectionMatrix };
    }
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nuniform float uT;\nuniform sampler2D uShore;' + (reflection ? '\nuniform sampler2D uMirror; uniform float uReflect; uniform mat4 uMirrorMatrix;' : ''))
      .replace('#include <normal_fragment_maps>', `
        vec2 drift = vec2(sin(vWPos.z * 0.019 + vWPos.x * 0.004), cos(vWPos.x * 0.017 - vWPos.z * 0.003));
        vec2 wa = vWPos.xz / 32.7 + drift * 0.12 + vec2(uT * 0.013, uT * 0.003),
          wb = mat2(0.97, -0.24, 0.24, 0.97) * vWPos.xz / 11.6 + drift.yx * 0.17 + vec2(-uT * 0.012, uT * 0.016),
          wc = mat2(0.56, 0.83, -0.83, 0.56) * vWPos.xz / 181.1 + vec2(uT*0.002, -uT*0.003);
        vec3 n1 = texture2D(normalMap, wa).xyz * 2.0 - 1.0, n2 = texture2D(normalMap, wb).xyz * 2.0 - 1.0, n3 = texture2D(normalMap, wc).xyz * 2.0 - 1.0;
        // The broad, directional swell reads separately from wind-driven capillary detail.
        vec2 p = vWPos.xz;
        const vec2 ds = vec2(.88,.475), dc = vec2(-.31,.951), dr = vec2(.49,.872);
        float shoreView = 1.0-smoothstep(330.0, 1900.0, length(vViewPosition));
        float breakup = .75+.25*sin(dot(p,vec2(.0038,.0075))-uT*.071);
        vec2 swell = ds * cos(dot(ds,p)*.16-uT*.89)*.028
                   + dc * cos(dot(dc,p)*.31-uT*1.31)*.018
                   + dr * cos(dot(dr,p)*.61-uT*1.94)*.011*breakup;
        vec3 mapN = normalize(vec3((n1.xy*.72 + n2.xy*(.34+.23*shoreView) + n3.xy*.52) * normalScale + swell, 1.0));
        float fadeN = 1.0 - smoothstep(570.0, 3900.0, length(vViewPosition));
        mapN = normalize(mix(vec3(0.0, 0.0, 1.0), mapN, 0.08 + 0.92 * fadeN)); // far water calms to a mirror instead of shimmering stripes
        normal = normalize(tbn * mapN);`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        // Tint water alongside mapped wharves, not a claim about depth or tides.
        vec2 uvLand = (vWPos.xz - vec2(${X0.toFixed(1)}, ${Z0.toFixed(1)})) / vec2(${WM.toFixed(1)},${HM.toFixed(1)});
        float coast = 0.0;
        if (all(greaterThan(uvLand, vec2(.004))) && all(lessThan(uvLand, vec2(.996))) && length(vViewPosition) < 3100.0) {
          uvLand.y = 1.0 - uvLand.y;
          vec2 d = vec2(19.0/${WM.toFixed(1)},19.0/${HM.toFixed(1)});
          coast = max(max(texture2D(uShore,uvLand+vec2(d.x,0.)).a,texture2D(uShore,uvLand-vec2(d.x,0.)).a),
                     max(texture2D(uShore,uvLand+vec2(0.,d.y)).a,texture2D(uShore,uvLand-vec2(0.,d.y)).a));
        }
        float currentBand = sin(vWPos.x*.021 + vWPos.z*.014 + sin(vWPos.z*.008 + uT*.06)*1.2);
        diffuseColor.rgb = mix(diffuseColor.rgb*(.95+.06*currentBand), diffuseColor.rgb*vec3(1.13,1.23,1.12), coast*.54);
      `);
    s.fragmentShader = s.fragmentShader.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      float waterVariability = .5+.5*sin(dot(vWPos.xz,vec2(.032,.016)) + sin(vWPos.z*.018)-uT*.29);
      roughnessFactor = mix(.19,.31,waterVariability) + .05*smoothstep(650.,3200.,length(vViewPosition));
    `);
    if (reflection) s.fragmentShader = s.fragmentShader.replace('#include <opaque_fragment>', `
      vec4 mc = uMirrorMatrix * vec4(vWPos,1.0);
      vec2 reflUV = mc.xy / max(0.00001, mc.w) + mapN.xy * vec2(0.24, 0.14);
      float viewNormal = clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
      float fresnel = 0.020 + 0.98 * pow(1.0 - viewNormal, 5.0);
      float edge = smoothstep(0.0,0.035,reflUV.x) * (1.0-smoothstep(0.965,1.0,reflUV.x)) * smoothstep(0.0,0.035,reflUV.y) * (1.0-smoothstep(0.965,1.0,reflUV.y));
      if (uReflect > 0.0 && edge > 0.0) {
        vec3 localReflection = texture2D(uMirror, clamp(reflUV,vec2(0.003),vec2(0.997))).rgb;
        outgoingLight = mix(outgoingLight, localReflection * vec3(.62,.72,.70), min(.52,fresnel*.82) * uReflect * edge);
      }
      #include <opaque_fragment>`);
  };
  const wGeo = new T.PlaneGeometry(140000, 140000, 1, 1); wGeo.rotateX(-Math.PI / 2);
  { const uv = wGeo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 140, uv.getY(i) * 140); }
  const sea = new T.Mesh(wGeo, wMat); sea.renderOrder = -3; sea.receiveShadow = false; sea.name = 'sea_surface_not_bathymetry'; scene.add(sea);
  // far land beyond the data box: a flat, hazy ring so the horizon is not an edge (not data; hidden by fog at distance)

  // ---------------------------------------------------------------- buildings (OSM heights via OpenMapTiles)
  let detailedFerry = null;
  if (new URLSearchParams(location.search).get('landmark') !== 'off') {
    try { detailedFerry = createFerryBuilding(DATA); } catch (e) { console.warn('Ferry Building detail unavailable', e); }
    if (detailedFerry) scene.add(detailedFerry);
  }
  const words = new Int16Array(bBuf), allowTier1 = !phone;
  const WALLS = ['#a29989', '#a78e6b', '#865c4a', '#c2bbb1', '#858e91', '#8f8674', '#afa497', '#697176'].map((c) => new T.Color(c));
  const TOWERS = ['#556775', '#6d8792', '#a49b8b', '#414f59', '#808d87', '#ada799'].map((c) => new T.Color(c));
  const ROOF = ['#7d7b77', '#8f8b84', '#5f6163', '#9a968e', '#6c625a'].map((c) => new T.Color(c));
  const sight = createBusSightlines();
  const P = [], N = [], C = [], F = [], I = []; let vtx = 0, nb = 0, sourceIndex = 0;
  function pushV(x, y, z, nx, ny, nz, c, fu, fv, seed) { P.push(x, y, z); N.push(nx, ny, nz); C.push(c.r, c.g, c.b); F.push(fu, fv, seed); return vtx++; }
  for (let k = 0; k < words.length;) {
    const tier = words[k], h = words[k + 1] / 10, mh = words[k + 2] / 10, g = words[k + 3] / 10, n = words[k + 4]; k += 5;
    const pts = []; for (let i = 0; i < n; i++) pts.push([words[k + i * 2] / 2, words[k + i * 2 + 1] / 2]); k += n * 2;

    // Keep low waterfront buildings on phones while leaving out the wider suburban tier.
    // Seed from source order so materials cannot change between breakpoints or culling choices.
    const sourceSeed = (++sourceIndex * 0.61803) % 1;
    const nearWharf = pts.some(([x,z]) => x > -2540 && x < -1180 && z > -550 && z < 210);
    if (tier === 1 && !allowTier1 && !nearWharf) continue;
    nb++; const seed = sourceSeed, wall = (h > 40 ? TOWERS : WALLS)[Math.floor(seed * 997) % (h > 40 ? TOWERS.length : WALLS.length)], roof = ROOF[Math.floor(seed * 7919) % ROOF.length];
    // Ferry Building: OSM's footprint and tower are each mapped here (cross-checked in the orthophoto).
    const bx = pts.reduce((a,q) => a+q[0],0)/n, bz = pts.reduce((a,q) => a+q[1],0)/n;
    const ferry = Math.abs(bx+1756) < 2 && Math.abs(bz+382) < 3 && (h === 19 || h === 26);
    sight.add(pts,g+mh-2,g+h+(ferry && detailedFerry ? 22 : 0));
    if (ferry && detailedFerry) continue; // replace only the mapped shell and tower
    const facadeWall = ferry ? new T.Color('#b9935d') : wall;
    const facadeRoof = ferry ? new T.Color('#434039') : roof;
    const y0 = g + mh - (mh > 0 ? 0 : 2), y1 = g + h; // walls start 2 m below the grid ground so slopes do not show gaps
    // walls: winding-independent (normals from the outline's orientation)
    let area = 0; for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
    const sgn = area > 0 ? 1 : -1;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz); if (L < 0.3) continue;
      const nx = (dz / L) * sgn, nz = (-dx / L) * sgn;
      const fz = Math.floor(h) + (ferry ? 300 : 0) + seed * 0.99; // building height in metres + a per-building seed in the fraction
      const v0 = pushV(a[0], y0, a[1], nx, 0, nz, facadeWall, 0, y0 - g, fz), v1 = pushV(b[0], y0, b[1], nx, 0, nz, facadeWall, L, y0 - g, fz);
      const v2 = pushV(b[0], y1, b[1], nx, 0, nz, facadeWall, L, h, fz), v3 = pushV(a[0], y1, a[1], nx, 0, nz, facadeWall, 0, h, fz);
      if (sgn > 0) I.push(v0, v2, v1, v0, v3, v2); else I.push(v0, v1, v2, v0, v2, v3);
    }
    const tri = T.ShapeUtils.triangulateShape(pts.map(([x, z]) => new T.Vector2(x, z)), []), base = vtx;
    for (const [x, z] of pts) pushV(x, y1, z, 0, 1, 0, facadeRoof, x, z, -1);
    for (const t of tri) { // keep every roof triangle facing up
      const [a, b, c] = t.map((q) => pts[q]), up = (b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1]);
      if (up > 0) I.push(base + t[0], base + t[1], base + t[2]); else I.push(base + t[0], base + t[2], base + t[1]);
    }
  }
  const bGeo = new T.BufferGeometry();
  bGeo.setAttribute('position', new T.Float32BufferAttribute(P, 3)); bGeo.setAttribute('normal', new T.Float32BufferAttribute(N, 3));
  bGeo.setAttribute('color', new T.Float32BufferAttribute(C, 3)); bGeo.setAttribute('facade', new T.Float32BufferAttribute(F, 3)); bGeo.setIndex(I);
  // every roof faces up whichever way its outline ran
  const bMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, side: T.FrontSide });
  bMat.userData.uNight = { value: 0 };
  bMat.onBeforeCompile = (s) => {
    s.uniforms.roofPhoto = aerial; s.uniforms.roofReady = hasAerial; s.uniforms.uNight = bMat.userData.uNight;
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 roofXZ; attribute vec3 facade;\nvarying vec3 vFac;\nvarying float vUp;').replace('#include <begin_vertex>', '#include <begin_vertex>\nroofXZ = position.xz; vFac = facade; vUp = normal.y;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vFac;\nvarying float vUp;\nvarying vec2 roofXZ; uniform sampler2D roofPhoto; uniform float roofReady; uniform float uNight;' + NOISE)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float isWall = 1.0 - step(0.5, abs(vUp));
        float isFerry = step(300.0,vFac.z);
        float bH = floor(vFac.z) - 300.0 * isFerry, bSeed = fract(vFac.z);
        float ribbon = step(0.58, bSeed) * step(18.0, bH);
        float warehouse = (1.0 - step(13.0, bH)) * step(0.46, bSeed);
        float fl = vFac.y / mix(3.1,4.3,bSeed), bay = vFac.x / mix(2.2,5.6,bSeed);
        vec2 cell = vec2(floor(bay), floor(fl)); vec2 f = vec2(fract(bay), fract(fl));
        // Smooth silhouettes and blend into facade colour as a window becomes subpixel.
        float fw = max(fwidth(bay), 0.001), fh = max(fwidth(fl), 0.001);
        float margin = mix(0.13,0.065,ribbon);
        float wx = smoothstep(margin-fw,margin+fw,f.x) * (1.0-smoothstep(1.0-margin-fw,1.0-margin+fw,f.x));
        float wy = smoothstep(0.27-fh,0.27+fh,f.y) * (1.0-smoothstep(0.86-fh,0.86+fh,f.y));
        float aa = 1.0 - smoothstep(0.12,0.72,max(fw,fh));
        float glazing = mix(1.0, smoothstep(bH*0.44,bH*0.64,vFac.y), warehouse);
        float win = isWall * smoothstep(0.55,1.2,vFac.y) * mix(0.39,wx*wy,aa) * glazing;
        float pane = hash12(cell + bSeed * 17.0);
        float glassTower = smoothstep(22.0,58.0,bH);
        vec3 streetGlass = mix(vec3(0.045,0.065,0.075),vec3(0.15,0.19,0.20),glassTower);
        vec3 tint = mix(vec3(0.67,0.83,0.96),vec3(0.92,0.94,0.86),bSeed);
        // Different planes catch the sky differently; floors are not a repeated black sticker.
        float pier = smoothstep(margin,margin+.065,min(f.x,1.0-f.x)) * smoothstep(.27,.36,f.y);
        float cap = smoothstep(.75,.86,f.y) * wx;
        float facing = pow(1.0-abs(dot(normalize(vNormal),normalize(vViewPosition))),2.0);
        vec3 glassFalloff = mix(vec3(.64,.70,.74),vec3(1.07,1.13,1.19),smoothstep(.32,.84,f.y));
        float skyView = abs(normalize(vViewPosition).y);
        vec3 reflectedSky = mix(vec3(.115,.135,.14),vec3(.205,.25,.30),smoothstep(.12,.64,skyView+facing*.35));
        vec3 paneColor = mix(streetGlass * tint * mix(vec3(1.0),glassFalloff,aa*.86),reflectedSky,(.15+.48*facing)*glassTower);
        paneColor *= 1.0+(pane-.5)*.23*aa;
        paneColor *= 1.0 - .23*(1.0-pier)*aa;
        vec3 sillColor = diffuseColor.rgb * (1.22 + .10*bSeed);
        float skirt = isWall * (1.0-smoothstep(1.5,4.4,vFac.y));
        diffuseColor.rgb *= mix(1.0,.78,skirt);
        diffuseColor.rgb = mix(diffuseColor.rgb,sillColor,cap*aa*isWall*.14);
        float grime = fbm(vec2(vFac.x * 0.4, vFac.y * 0.25) + bSeed * 31.0);
        float joint = (1.-smoothstep(.016,.033,abs(fract(vFac.y*.5)-.5)))*aa*(1.-glassTower);
        diffuseColor.rgb *= mix(1.,.87,joint*isWall);
        diffuseColor.rgb *= mix(0.88 + 0.2 * grime, 0.9 + 0.18 * fbm(vFac.xy * 0.15), 1.0 - isWall);
        diffuseColor.rgb *= mix(1.0, 0.55 + 0.45 * smoothstep(0.0, 4.0, vFac.y), isWall); // contact shade at the foot of walls
        diffuseColor.rgb = mix(diffuseColor.rgb, paneColor + diffuseColor.rgb * 0.08, win * 0.92);
        vec2 roofUV = (roofXZ + vec2(2336.,816.))/1440.;
        vec2 edge = min(roofUV,1.-roofUV);
        if(vUp>.5 && roofReady>.5 && min(edge.x,edge.y)>0.){
          vec3 sampleRoof=texture2D(roofPhoto,vec2(roofUV.x,1.-roofUV.y)).rgb;
          diffuseColor.rgb=mix(diffuseColor.rgb,sampleRoof,smoothstep(0.,.05,min(edge.x,edge.y)));
        }
        // The listed Edwardian terminal has sandstone columns and arch-headed recesses over a granite base.
        if (isFerry > 0.5 && isWall > 0.5) {
          float hx = fract(vFac.x / 5.25);
          float hy = fract((vFac.y - 1.2) / 4.8);
          float pilaster = 1.0-smoothstep(.10,.20,abs(hx-.5));
          float arch = (1.0-smoothstep(.21,.32,abs(hx-.03))) * smoothstep(.11,.23,hy) * (1.0-smoothstep(.71,.82,hy+pow(abs(hx-.03)*1.1,2.0)));
          arch += (1.0-smoothstep(.21,.32,abs(hx-.97))) * smoothstep(.11,.23,hy) * (1.0-smoothstep(.71,.82,hy+pow(abs(hx-.97)*1.1,2.0)));
          float cornice = smoothstep(.88,.92,hy) * (1.0-smoothstep(.96,.98,hy));
          vec3 stone = vec3(.42,.285,.147) * (.94+.13*grime);
          stone = mix(stone,vec3(.54,.39,.21),max(pilaster*.7,cornice));
          stone = mix(stone,vec3(.034,.037,.033),clamp(arch*.85,0.0,.88));
          diffuseColor.rgb = mix(vec3(.16,.15,.145)*(0.9+grime*.2),stone,smoothstep(.75,1.55,vFac.y));
        }
        float tallB = smoothstep(8.0, 30.0, bH);
        float pLit = mix(0.04, 0.42, tallB);
        float lit = mix(pLit * 0.6, step(1.0 - pLit, hash12(cell + bSeed * 113.0)), aa) * win;`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, mix(0.12,0.27,pane), win);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += mix(vec3(1.0, 0.76, 0.48), vec3(0.85, 0.92, 1.0), step(0.7, hash12(cell * 1.7))) * lit * uNight * 1.1;');
  };
  const buildings = new T.Mesh(bGeo, bMat); buildings.castShadow = true; buildings.receiveShadow = true; buildings.name = 'buildings_OSM_render_height'; scene.add(buildings);

  // ---------------------------------------------------------------- the Sky Tower from the lab's mapped parts (auckland/3d/skytower-parts.json)
  try {
    const st = await (await fetch('/auckland/3d/skytower-parts.json')).json(), s = st.scale || 3.255208333333333e-5;
    const toM = (v) => v / s, g0 = (st.ground - 0.018) / s, parts = [];
    for (const b of st.parts) {
      const shape = new T.Shape(b.points.map(([x, z]) => new T.Vector2(toM(x), -toM(z))));
      let g = new T.ExtrudeGeometry(shape, { depth: Math.max(0.5, b.height - b.minHeight), bevelEnabled: false, curveSegments: 6 }); g.rotateX(-Math.PI / 2); g.translate(0, g0 + b.minHeight, 0);
      if (b.roofShape === 'pyramidal') g.scale(1, 1, 1);
      parts.push(g);
    }
    const tower = new T.Group(); tower.name = 'Sky_Tower_OSM_parts_unverified_heights';
    for (const g of parts) { const m = new T.Mesh(g, new T.MeshStandardMaterial({ color: '#d4d2cc', roughness: 0.55 })); m.castShadow = m.receiveShadow = true; tower.add(m); }
    scene.add(tower);
  } catch { /* the tower is a nicety; the page works without it */ }

  // ---------------------------------------------------------------- vehicles, route line, stop marker
  const fleet = createFleet(scene), beacons = createBeacons(scene, 1600, phone);
  const lineMat = new LineMaterial({ color: 0xffffff, linewidth: phone ? 4 : 5, worldUnits: false, transparent: true, opacity: 0.95, depthTest: true });
  let routeLine = null;
  function showRoute(shapes, colour) {
    if (routeLine) { scene.remove(routeLine); routeLine.traverse((o) => o.geometry?.dispose()); routeLine = null; }
    if (!shapes?.length) return;
    routeLine = new T.Group();
    for (const enc of shapes) {
      const pos = []; let x = 0, z = 0;
      for (let i = 0; i < enc.length; i += 2) { x += enc[i]; z += enc[i + 1]; pos.push(x, heightAt(x, z) + 4, z); }
      if (pos.length < 6) continue;
      const g = new LineGeometry(); g.setPositions(pos); const l = new Line2(g, lineMat); l.computeLineDistances(); l.renderOrder = 5; routeLine.add(l);
    }
    lineMat.color.set(colour || '#ffffff'); scene.add(routeLine);
  }
  const stopMarker = new T.Group();
  { const pole = new T.Mesh(new T.CylinderGeometry(0.6, 0.6, 26, 12), new T.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.35, roughness: 0.4 })); pole.position.y = 13;
    const ring = new T.Mesh(new T.TorusGeometry(14, 1.1, 8, 48), new T.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.5 })); ring.rotation.x = Math.PI / 2; ring.position.y = 1.2;
    const head = new T.Mesh(new T.SphereGeometry(3.2, 20, 12), pole.material); head.position.y = 27; stopMarker.add(pole, ring, head); stopMarker.visible = false; scene.add(stopMarker); }
  function showStop(x, z) { if (x == null) { stopMarker.visible = false; return; } stopMarker.position.set(x, heightAt(x, z), z); stopMarker.visible = true; }

  // ---------------------------------------------------------------- camera
  const views = {
    harbour: { t: [-1830, 12, -305], p: [-1515, 645, -736] },
    'ferry-building': { t: [-1755, 15.2, -382], p: [-1737, 43, -492] },
    waterfront: { t: [-1880, 71, -358], p: [-1540, 184, -869] },
    city: { t: [-2150, 45, 315], p: [-1450, 420, -690] },
    overview: { t: [-900, 0, 1500], p: [5200, 9000, -9500] },
  };
  let fly = null, follow = null, cinematic = null, busFollow = false, nextSightCheck = 0;
  const stopFlight = () => {
    if (cinematic) { camera.fov = canvas.clientWidth < canvas.clientHeight ? 55 : 42; camera.updateProjectionMatrix(); }
    cinematic = null; fly = null;
  };
  function flyCinematic(v, { fromHarbour = false } = {}) {
    stopFlight(); follow = null;
    if (reducedMotion.matches) { setView(v); return; }
    if (fromHarbour) setView(phone ? { t: [-1830, 12, -305], p: [-1520, 810, -775] } : views.harbour);
    cinematic = {
      started: performance.now(), duration: phone ? 2150 : 2600,
      from: cameraPose(controls.target.toArray(),camera.position.toArray(),camera.fov),
      to: cameraPose(v.t,v.p,canvas.clientWidth < canvas.clientHeight ? 55 : 42),
    };
  }
  controls.addEventListener('start',()=>{ stopFlight(); busFollow = false; });
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) stopFlight(); });
  function setView(v) { stopFlight(); controls.target.set(...v.t); camera.position.set(...v.p); controls.update(); }
  function flyTo(t, dist = 900, pitch = 0.5, bearing = null, bus = false) {
    stopFlight();
    const to = new T.Vector3(t[0], t[1] ?? 0, t[2]), off = camera.position.clone().sub(controls.target); off.y = 0; if (off.lengthSq() < 1) off.set(0.6, 0, -1);
    if (Number.isFinite(bearing)) {
      // Look across the bow or the kerb-side entrance while keeping the reported vehicle heading.
      const angle = bearing + .25;
      off.set(-Math.sin(angle),0,Math.cos(angle));
    }
    off.normalize().multiplyScalar(Math.cos(pitch) * dist); off.y = Math.sin(pitch) * dist;
    busFollow = bus; nextSightCheck = performance.now()+1700;
    const toP = bus ? new T.Vector3(...busCameraPose(to.toArray(),Math.atan2(-off.x,off.z),dist,pitch,sight)) : to.clone().add(off);
    if (reducedMotion.matches) { fly = null; controls.target.copy(to); camera.position.copy(toP); controls.update(); return; }
    fly = { t0: performance.now(), dur: 1400, fromT: controls.target.clone(), fromP: camera.position.clone(), toT: to, toP };
  }
  let inset = 0;
  function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; if (inset) camera.setViewOffset(w, h, 0, inset / 2, w, h); else camera.clearViewOffset(); camera.fov = w < h ? 55 : 42; camera.updateProjectionMatrix(); lineMat.resolution.set(w, h); beacons.material.uniforms.uPR.value = renderer.getPixelRatio(); }
  new ResizeObserver(resize).observe(canvas); resize(); setView(phone ? { t: [-1830, 12, -305], p: [-1520, 810, -775] } : views.harbour);

  // ---------------------------------------------------------------- live vehicle state with short tweens between real fixes
  const state = new Map(); let list = [], selectedId = null;
  function setVehicles(vs) { // [{id, mode, x, z, heading|null, colour}]
    const now = performance.now(), seen = new Set();
    for (const v of vs) {
      seen.add(v.id); const y = v.mode === 'ferry' ? 0 : groundAt(v.x, v.z) + (v.mode === 'train' ? 0.3 : 0.05); // a bus over mapped water is on a bridge: keep it on the deck line, never under the ground
      const s = state.get(v.id);
      if (!s) { state.set(v.id, { ...v, y, fx: v.x, fz: v.z, fy: y, tx: v.x, tz: v.z, ty: y, t0: now, h: v.heading ?? 0 }); continue; }
      const moved = Math.hypot(v.x - s.tx, v.z - s.tz);
      let heading = v.heading; if (heading == null && moved > 8) heading = Math.atan2(v.x - s.tx, -(v.z - s.tz)); if (heading == null) heading = s.h;
      Object.assign(s, v, { fx: s.x ?? v.x, fz: s.z ?? v.z, fy: s.y ?? y, tx: v.x, tz: v.z, ty: y, t0: now, h: heading });
      if (reducedMotion.matches || moved > 3000) { s.fx = v.x; s.fz = v.z; s.fy = y; } // a jump: do not glide across the harbour
    }
    for (const id of [...state.keys()]) if (!seen.has(id)) state.delete(id);
  }
  function stepVehicles(now) {
    list = [];
    for (const s of state.values()) {
      const k = Math.min(1, (now - s.t0) / 2000), e = k * k * (3 - 2 * k);
      s.x = s.fx + (s.tx - s.fx) * e; s.z = s.fz + (s.tz - s.fz) * e; s.y = s.fy + (s.ty - s.fy) * e;
      list.push({ id: s.id, mode: s.mode, x: s.x, y: s.y, z: s.z, heading: s.h, colour: s.colour, route: s.route });
    }
    const selected=state.get(selectedId);
    const range=selected ? camera.position.distanceTo(v3.set(selected.x,selected.y,selected.z)) : Infinity;
    fleet.update(list,selectedId,range);beacons.update(list,selectedId,range<150);
  }
  // nearest vehicle to a screen point (pixels), for taps
  const v3 = new T.Vector3();
  function pick(px, py, radius = 26) {
    const w = canvas.clientWidth, h = canvas.clientHeight; let best = null, bd = radius;
    for (const v of list) {
      const close = camera.position.distanceToSquared(v3.set(v.x,v.y,v.z)) < 210*210;
      const lift = close ? v.mode==='ferry' ? 3 : 1.7 : 12;
      v3.set(v.x, v.y + lift, v.z).project(camera); if (v3.z > 1) continue; const d = Math.hypot((v3.x * 0.5 + 0.5) * w - px, (-v3.y * 0.5 + 0.5) * h - py); if (d < bd) { bd = d; best = v.id; } }
    return best;
  }
  function screenOf(id, lift = 20) { const s = state.get(id); if (!s) return null; v3.set(s.x, s.y + lift, s.z).project(camera); if (v3.z > 1) return null; return [(v3.x * 0.5 + 0.5) * canvas.clientWidth, (-v3.y * 0.5 + 0.5) * canvas.clientHeight]; }

  // ---------------------------------------------------------------- loop
  let running = true, last = 0, frames = 0, onFrame = null;
  let lastReflect = -Infinity;
  const reflectedAt = new T.Vector3(Infinity, 0, 0), reflectedTarget = new T.Vector3(Infinity, 0, 0);
  const loop = (t) => {
    if (!running) return; requestAnimationFrame(loop);
    if (phone && t - last < 30) return; last = t; frames++;
    if (fly) { const k = Math.min(1, (t - fly.t0) / fly.dur), e = 1 - Math.pow(1 - k, 3); controls.target.lerpVectors(fly.fromT, fly.toT, e); camera.position.lerpVectors(fly.fromP, fly.toP, e); if (k >= 1) fly = null; }
    if (cinematic) {
      const k = Math.min(1, (t - cinematic.started) / cinematic.duration);
      const p = flightPose(cinematic.from, cinematic.to, k);
      controls.target.set(...p.target); camera.position.set(...p.position);
      camera.fov = p.fov; camera.updateProjectionMatrix();
      if (k >= 1) cinematic = null;
    }
    stepVehicles(t);
    if (follow && !fly && !cinematic) {
      const s = state.get(follow);
      if (s) {
        const lift=busFollow?1.75:s.mode==='ferry'?3.1:0;
        const point=[s.x,s.y+lift,s.z];
        const d = new T.Vector3(...point).sub(controls.target);
        controls.target.add(d.multiplyScalar(reducedMotion.matches ? 1 : 0.08)); camera.position.add(d);
        if(busFollow && t>=nextSightCheck) {
          nextSightCheck=t+600;
          if(!sight.clear(camera.position.toArray(),point)) {
            const pose=busCameraPose(point,s.h+2.15,phone?35:28,.32,sight);
            const p=new T.Vector3(...pose);
            if(camera.position.distanceTo(p)>2) {
              // Cut away from an occluding façade rather than tweening through solid geometry.
              camera.position.copy(p); controls.target.set(...point);
            }
          }
        }
      }
    }
    controls.update();
    // the sun's shadow box follows what the camera is looking at
    const dir = sun.userData.dir || new T.Vector3(0, 1, 0); sun.target.position.copy(controls.target); sun.position.copy(controls.target).addScaledVector(dir, 6000);
    const dist = camera.position.distanceTo(controls.target), nearWanted = T.MathUtils.clamp(dist * 0.01, 1, 300);
    if (Math.abs(camera.near - nearWanted) > nearWanted * 0.2) { camera.near = nearWanted; camera.updateProjectionMatrix(); }
    scene.fog.density = 0.000055 * T.MathUtils.clamp(2600 / dist, 0.12, 1); // haze for street views, a clear map when zoomed right out
    if (!phone && !navigator.connection?.saveData && !/^(slow-2g|2g|3g)$/.test(navigator.connection?.effectiveType || '') &&
      !aerialDetailRequested && frames > 15 && dist < 620 && Math.abs(controls.target.x + 1600) < 825 && Math.abs(controls.target.z + 100) < 800) {
      aerialDetailRequested = true; loadAerial('waterfront-aerial-detail.webp', true);
    }
    // Close-up shadows need centimetre-scale contact, not the city-wide metre bias.
    // Keep the light centred at 6 km; narrow only the depth window around its target.
    const span = T.MathUtils.clamp(dist * 1.12, 155, 4000), depthRange = T.MathUtils.clamp(span * 2.8, 950, 5500);
    if (Math.abs(sc.right - span) > Math.max(12, span * .10)) {
      sc.left = sc.bottom = -span; sc.right = sc.top = span;
      sc.near = 6000 - depthRange; sc.far = 6000 + depthRange; sc.updateProjectionMatrix();
      sun.shadow.normalBias = T.MathUtils.clamp(span * .0013, .20, 1.2);
      sun.shadow.bias = -T.MathUtils.lerp(.000075, .00032, T.MathUtils.smoothstep(span, 190, 1300));
    }
    sun.castShadow = dir.y > .055;
    wMat.userData.t.value = reducedMotion.matches ? 0 : t / 1000; haze.position.x = camera.position.x; haze.position.z = camera.position.z; nightSky.position.copy(camera.position);
    if (reflection) {
      const enabled = dist < 3200 && Math.abs(controls.target.x + 2020) < 1800 && Math.abs(controls.target.z + 250) < 1600;
      reflected.value = enabled ? 1 - T.MathUtils.smoothstep(dist, 2450, 3200) : 0;
      const moved = reflectedAt.distanceToSquared(camera.position) > 12 || reflectedTarget.distanceToSquared(controls.target) > 10;
      if (enabled && (t - lastReflect >= 140 || (moved && t - lastReflect >= 47))) {
        lastReflect = t; reflectedAt.copy(camera.position); reflectedTarget.copy(controls.target);
        sea.visible = false; camera.updateMatrixWorld();
        try {
          reflection.onBeforeRender(renderer, scene, camera);
          reflectionMatrix.multiplyMatrices(reflection.material.uniforms.textureMatrix.value, inverseReceiver);
        } finally { sea.visible = true; }
      }
    }
    renderer.render(scene, camera); onFrame?.();
  };
  requestAnimationFrame(loop);
  document.addEventListener('visibilitychange', () => { const was = running; running = !document.hidden; if (running && !was) requestAnimationFrame(loop); });

  const sunNow = setTime(timeMs ?? Date.now());
  return {
    hasStreetView(v) {
      const y=groundAt(v.x,v.z)+1.8, to=[v.x,y,v.z];
      const heading=(v.heading||0)+1.84, distance=phone?28:21;
      for(const delta of [0,.73,-.73,1.49,-1.49,Math.PI]){
        const a=heading+delta;
        if(sight.clear([v.x-Math.sin(a)*distance,y+.36*distance,v.z+Math.cos(a)*distance],to))return true;
      }
      return false;
    },
    renderer, scene, camera, controls, heightAt, isLand, setTime, setVehicles, pick, screenOf, showRoute, showStop, flyTo, flyCinematic, stopFlight, views, setView,
    get flying() { return !!cinematic; },
    get sun() { return sunState; }, get frames() { return frames; }, set onFrame(f) { onFrame = f; },
    select(id) { selectedId = id; follow = id; busFollow = false; },
    unfollow() { follow = null; },
    setInset(px) { inset = Math.max(0, Math.round(px)); resize(); }, // keep the middle of the view above a bottom sheet
    stats: () => ({ landmarkTris: detailedFerry?.userData.triangles || 0, landmarkBatches: detailedFerry?.children.length || 0, aerial: !!hasAerial.value, aerialDetail: aerialDetailReady, reflecting: reflected.value > 0, buildings: nb, groundVerts: gGeo.attributes.position.count, buildingTris: I.length / 3, drawCalls: renderer.info.render.calls, sun: sunNow }),
  };
}
