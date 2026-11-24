// assembl lab · Auckland live: the 3D city. Real ground (LINZ heights, OSM land cover), OSM building heights, a sky and sun
// set by the real time in Auckland, a moving harbour, and the live vehicles (vehicles.js). Natural colours only.
import * as T from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { sunPosition, AREA, ORIGIN } from './transit.js';
import { createFleet, createBeacons } from './vehicles.js';

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
  renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.9;
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
  const su = sky.material.uniforms; su.turbidity.value = 3.2; su.rayleigh.value = 1.4; su.mieCoefficient.value = 0.004; su.mieDirectionalG.value = 0.8;
  // after dark the sky model drifts purple; a plain night gradient (navy to near-black) fades in over it
  const nightSky = new T.Mesh(new T.SphereGeometry(140000, 32, 16), new T.ShaderMaterial({ side: T.BackSide, transparent: true, depthWrite: false, fog: false,
    uniforms: { uA: { value: 0 } }, vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec3 vD; uniform float uA; void main(){ float h = clamp(vD.y, 0.0, 1.0); vec3 c = mix(vec3(0.075, 0.11, 0.16), vec3(0.012, 0.02, 0.04), pow(h, 0.45)); gl_FragColor = vec4(c, uA); }' }));
  nightSky.renderOrder = -1; nightSky.frustumCulled = false; scene.add(nightSky);
  // horizon haze: blends the far edge of the sea into the sky in the fog's own colour, so there is no hard line
  const haze = new T.Mesh(new T.CylinderGeometry(60000, 60000, 12000, 64, 1, true), new T.ShaderMaterial({ side: T.BackSide, transparent: true, depthWrite: false, fog: false,
    uniforms: { uC: { value: new T.Color() } }, vertexShader: 'varying float vY; void main(){ vY = position.y / 6000.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying float vY; uniform vec3 uC; void main(){ float a = 1.0 - smoothstep(-0.6, 0.15, vY); gl_FragColor = vec4(uC, a); }' }));
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
    su.turbidity.value = 2.6 + cloud * 7; su.rayleigh.value = 1.2 + cloud * 1.2; su.mieCoefficient.value = 0.003 + cloud * 0.012;
    for (const k of ['turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG', 'sunPosition']) skyCopy.material.uniforms[k].value = su[k].value.clone ? su[k].value.clone() : su[k].value;
    const day = T.MathUtils.smoothstep(s.elevation, -6, 10), golden = 1 - T.MathUtils.smoothstep(s.elevation, 2, 22);
    const twilight = Math.max(0, 1 - Math.abs(s.elevation + 3) / 7);
    night = 1 - T.MathUtils.smoothstep(s.elevation, -8, 1);
    nightSky.material.uniforms.uA.value = T.MathUtils.clamp((-s.elevation - 3) / 9, 0, 1);
    sun.intensity = day * (3.2 - cloud * 1.8); sun.color.set('#fff4e5').lerp(new T.Color('#ffb36b'), golden * 0.8);
    hemi.intensity = 0.1 + twilight * 0.3 + day * (0.45 + cloud * 0.22); hemi.color.set('#cfe0ff').lerp(new T.Color('#1d2a44'), night);
    hemi.groundColor.set('#5d5a4c').lerp(new T.Color('#111318'), night);
    scene.fog.color.set('#bcc9d4').lerp(new T.Color('#e6c3a3'), golden * day * 0.6).lerp(new T.Color('#0b1119'), night).lerp(new T.Color('#b4bac0'), cloud * day * 0.4);
    renderer.toneMappingExposure = 0.8 - cloud * day * 0.16 + night * 0.3; haze.material.uniforms.uC.value.copy(scene.fog.color);
    sky.visible = true; sun.userData.dir = dir;
    if (envRT) envRT.dispose(); envRT = pmrem.fromScene(skyScene, 0, 1, 2000); scene.environment = envRT.texture;
    scene.environmentIntensity = 0.05 + twilight * 0.35 + day * 0.6;
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
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nuniform float uNight;\nuniform sampler2D uLights;' + NOISE)
      .replace('#include <map_fragment>', `#include <map_fragment>
        float dn = fbm(vWPos.xz / 3.5) * 0.6 + fbm(vWPos.xz / 40.0) * 0.4;
        diffuseColor.rgb *= 0.86 + 0.28 * dn;
        // street lights at night, from the OSM road map (ground-lights.webp); dimmer and patchy away from the road centre
        float road = texture2D(uLights, vMapUv).r;
        vec3 nightGlow = mix(vec3(1.0, 0.66, 0.34), vec3(0.95, 0.9, 0.82), step(0.8, road)) * road * (0.7 + 0.6 * vnoise(vWPos.xz / 18.0)) * uNight;`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += nightGlow * 0.3 + diffuseColor.rgb * uNight * 0.04;');
  };
  const ground = new T.Mesh(gGeo, gMat); ground.receiveShadow = true; ground.name = 'ground_LINZ_heights_OSM_landcover'; scene.add(ground);

  // ---------------------------------------------------------------- the sea
  const wn = waterNormals(); wn.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const wMat = new T.MeshStandardMaterial({ color: '#1b3b44', roughness: 0.1, metalness: 0.0, normalMap: wn, normalScale: new T.Vector2(0.4, 0.4), envMapIntensity: 1.25 });
  wMat.userData.t = { value: 0 };
  wMat.onBeforeCompile = (s) => {
    s.uniforms.uT = wMat.userData.t;
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nuniform float uT;')
      .replace('#include <normal_fragment_maps>', `
        vec2 wa = vWPos.xz / 38.0 + vec2(uT * 0.011, uT * 0.006), wb = vWPos.xz / 13.0 + vec2(-uT * 0.017, uT * 0.013), wc = vWPos.xz / 260.0 + vec2(uT*0.002, -uT*0.003);
        vec3 n1 = texture2D(normalMap, wa).xyz * 2.0 - 1.0, n2 = texture2D(normalMap, wb).xyz * 2.0 - 1.0, n3 = texture2D(normalMap, wc).xyz * 2.0 - 1.0;
        vec3 mapN = normalize(vec3((n1.xy + n2.xy * 0.6 + n3.xy * 0.8) * normalScale, 1.0));
        float fadeN = 1.0 - smoothstep(1200.0, 6000.0, length(vViewPosition));
        mapN = normalize(mix(vec3(0.0, 0.0, 1.0), mapN, 0.08 + 0.92 * fadeN)); // far water calms to a mirror instead of shimmering stripes
        normal = normalize(tbn * mapN);`)
      .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= 0.9 + 0.2 * smoothstep(-0.5, 0.5, sin(vWPos.x * 0.002 + vWPos.z * 0.0013));');
  };
  const wGeo = new T.PlaneGeometry(140000, 140000, 1, 1); wGeo.rotateX(-Math.PI / 2);
  { const uv = wGeo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 140, uv.getY(i) * 140); }
  const sea = new T.Mesh(wGeo, wMat); sea.receiveShadow = false; sea.name = 'sea_surface_not_bathymetry'; scene.add(sea);
  // far land beyond the data box: a flat, hazy ring so the horizon is not an edge (not data; hidden by fog at distance)

  // ---------------------------------------------------------------- buildings (OSM heights via OpenMapTiles)
  const words = new Int16Array(bBuf), allowTier1 = !phone;
  const WALLS = ['#9c978d', '#a8987c', '#7a4f40', '#bdb9b0', '#858b8e', '#8f877d', '#a7a296', '#6b7176'].map((c) => new T.Color(c));
  const TOWERS = ['#56656f', '#6f7d86', '#9a988f', '#46535c', '#8a8e8c', '#aaa69c'].map((c) => new T.Color(c));
  const ROOF = ['#7d7b77', '#8f8b84', '#5f6163', '#9a968e', '#6c625a'].map((c) => new T.Color(c));
  const P = [], N = [], C = [], F = [], I = []; let vtx = 0, nb = 0;
  function pushV(x, y, z, nx, ny, nz, c, fu, fv, seed) { P.push(x, y, z); N.push(nx, ny, nz); C.push(c.r, c.g, c.b); F.push(fu, fv, seed); return vtx++; }
  for (let k = 0; k < words.length;) {
    const tier = words[k], h = words[k + 1] / 10, mh = words[k + 2] / 10, g = words[k + 3] / 10, n = words[k + 4]; k += 5;
    const pts = []; for (let i = 0; i < n; i++) pts.push([words[k + i * 2] / 2, words[k + i * 2 + 1] / 2]); k += n * 2;
    if (tier === 1 && !allowTier1) continue;
    nb++; const seed = (nb * 0.61803) % 1, wall = (h > 40 ? TOWERS : WALLS)[Math.floor(seed * 997) % (h > 40 ? TOWERS.length : WALLS.length)], roof = ROOF[Math.floor(seed * 7919) % ROOF.length];
    const y0 = g + mh - (mh > 0 ? 0 : 2), y1 = g + h; // walls start 2 m below the grid ground so slopes do not show gaps
    // walls: winding-independent (normals from the outline's orientation)
    let area = 0; for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
    const sgn = area > 0 ? 1 : -1; let per = 0;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz); if (L < 0.3) continue;
      const nx = (dz / L) * sgn, nz = (-dx / L) * sgn;
      const fz = Math.floor(h) + seed * 0.99; // building height in metres + a per-building seed in the fraction
      const v0 = pushV(a[0], y0, a[1], nx, 0, nz, wall, per, y0 - g, fz), v1 = pushV(b[0], y0, b[1], nx, 0, nz, wall, per + L, y0 - g, fz);
      const v2 = pushV(b[0], y1, b[1], nx, 0, nz, wall, per + L, h, fz), v3 = pushV(a[0], y1, a[1], nx, 0, nz, wall, per, h, fz);
      if (sgn > 0) I.push(v0, v2, v1, v0, v3, v2); else I.push(v0, v1, v2, v0, v2, v3);
      per += L;
    }
    const tri = T.ShapeUtils.triangulateShape(pts.map(([x, z]) => new T.Vector2(x, z)), []), base = vtx;
    for (const [x, z] of pts) pushV(x, y1, z, 0, 1, 0, roof, x, z, -1);
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
    s.uniforms.uNight = bMat.userData.uNight;
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 facade;\nvarying vec3 vFac;\nvarying float vUp;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvFac = facade; vUp = normal.y;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vFac;\nvarying float vUp;\nuniform float uNight;' + NOISE)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float isWall = 1.0 - step(0.5, abs(vUp));
        float bH = floor(vFac.z), bSeed = fract(vFac.z);
        float ribbon = step(0.58, bSeed) * step(18.0, bH);
        float warehouse = (1.0 - step(13.0, bH)) * step(0.46, bSeed);
        float fl = vFac.y / mix(3.1, 4.3, bSeed), bay = vFac.x / mix(2.2, 5.6, bSeed);
        vec2 cell = vec2(floor(bay), floor(fl)); vec2 f = vec2(fract(bay), fract(fl));
        float win = isWall * step(0.9, vFac.y) * step(0.14, f.x) * step(f.x, 0.86) * step(0.3, f.y) * step(f.y, 0.86);
        win = mix(win, isWall * step(1.2, vFac.y) * step(0.06, f.x) * step(0.25, f.y) * step(f.y, 0.89), ribbon);
        float glazing = mix(1.0, step(bH * 0.56, vFac.y), warehouse);
        float aa = clamp(1.6 - max(fwidth(bay), fwidth(fl)) * 2.0, 0.0, 1.0); // windows smaller than a pixel average out, no shimmer
        win = mix(isWall * step(0.9, vFac.y) * 0.4, win, aa) * glazing;
        float grime = fbm(vec2(vFac.x * 0.4, vFac.y * 0.25) + bSeed * 31.0);
        diffuseColor.rgb *= mix(0.88 + 0.2 * grime, 0.9 + 0.18 * fbm(vFac.xy * 0.15), 1.0 - isWall);
        diffuseColor.rgb *= mix(1.0, 0.55 + 0.45 * smoothstep(0.0, 4.0, vFac.y), isWall); // contact shade at the foot of walls
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.09, 0.11, 0.13) + diffuseColor.rgb * 0.12, win * 0.88);
        float tallB = smoothstep(8.0, 30.0, bH);
        float pLit = mix(0.04, 0.42, tallB);
        float lit = mix(pLit * 0.6, step(1.0 - pLit, hash12(cell + bSeed * 113.0)), aa) * win;`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.12, win);')
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
    harbour: { t: [-2100, 0, 600], p: [-600, 900, -2300] },
    city: { t: [-2185, 0, 300], p: [-1500, 520, -650] },
    overview: { t: [-900, 0, 1500], p: [5200, 9000, -9500] },
  };
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let fly = null, follow = null;
  function setView(v) { controls.target.set(...v.t); camera.position.set(...v.p); controls.update(); }
  function flyTo(t, dist = 900, pitch = 0.5) {
    const to = new T.Vector3(t[0], t[1] ?? 0, t[2]), off = camera.position.clone().sub(controls.target); off.y = 0; if (off.lengthSq() < 1) off.set(0.6, 0, -1);
    off.normalize().multiplyScalar(Math.cos(pitch) * dist); off.y = Math.sin(pitch) * dist;
    if (reducedMotion.matches) { fly = null; controls.target.copy(to); camera.position.copy(to).add(off); controls.update(); return; }
    fly = { t0: performance.now(), dur: 1400, fromT: controls.target.clone(), fromP: camera.position.clone(), toT: to, toP: to.clone().add(off) };
  }
  let inset = 0;
  function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; if (inset) camera.setViewOffset(w, h, 0, inset / 2, w, h); else camera.clearViewOffset(); camera.fov = w < h ? 55 : 42; camera.updateProjectionMatrix(); lineMat.resolution.set(w, h); beacons.material.uniforms.uPR.value = renderer.getPixelRatio(); }
  new ResizeObserver(resize).observe(canvas); resize(); setView(phone ? { t: [-2150, 0, -200], p: [-1300, 1500, -3300] } : views.harbour);

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
      list.push({ id: s.id, mode: s.mode, x: s.x, y: s.y, z: s.z, heading: s.h, colour: s.colour });
    }
    fleet.update(list); beacons.update(list, selectedId);
  }
  // nearest vehicle to a screen point (pixels), for taps
  const v3 = new T.Vector3();
  function pick(px, py, radius = 26) {
    const w = canvas.clientWidth, h = canvas.clientHeight; let best = null, bd = radius;
    for (const v of list) { v3.set(v.x, v.y + 12, v.z).project(camera); if (v3.z > 1) continue; const d = Math.hypot((v3.x * 0.5 + 0.5) * w - px, (-v3.y * 0.5 + 0.5) * h - py); if (d < bd) { bd = d; best = v.id; } }
    return best;
  }
  function screenOf(id) { const s = state.get(id); if (!s) return null; v3.set(s.x, s.y + 20, s.z).project(camera); if (v3.z > 1) return null; return [(v3.x * 0.5 + 0.5) * canvas.clientWidth, (-v3.y * 0.5 + 0.5) * canvas.clientHeight]; }

  // ---------------------------------------------------------------- loop
  let running = true, last = 0, frames = 0, onFrame = null;
  const loop = (t) => {
    if (!running) return; requestAnimationFrame(loop);
    if (phone && t - last < 30) return; last = t; frames++;
    if (fly) { const k = Math.min(1, (t - fly.t0) / fly.dur), e = 1 - Math.pow(1 - k, 3); controls.target.lerpVectors(fly.fromT, fly.toT, e); camera.position.lerpVectors(fly.fromP, fly.toP, e); if (k >= 1) fly = null; }
    stepVehicles(t);
    if (follow && !fly) { const s = state.get(follow); if (s) { const d = new T.Vector3(s.x, s.y, s.z).sub(controls.target); controls.target.add(d.multiplyScalar(0.08)); camera.position.add(d); } }
    controls.update();
    // the sun's shadow box follows what the camera is looking at
    const dir = sun.userData.dir || new T.Vector3(0, 1, 0); sun.target.position.copy(controls.target); sun.position.copy(controls.target).addScaledVector(dir, 6000);
    const dist = camera.position.distanceTo(controls.target), nearWanted = T.MathUtils.clamp(dist * 0.01, 1, 300);
    if (Math.abs(camera.near - nearWanted) > nearWanted * 0.2) { camera.near = nearWanted; camera.updateProjectionMatrix(); }
    scene.fog.density = 0.000055 * T.MathUtils.clamp(2600 / dist, 0.12, 1); // haze for street views, a clear map when zoomed right out
    const span = T.MathUtils.clamp(dist * 1.2, 400, 4000);
    if (Math.abs(sc.right - span) > 50) { sc.left = sc.bottom = -span; sc.right = sc.top = span; sc.updateProjectionMatrix(); }
    wMat.userData.t.value = t / 1000; haze.position.x = camera.position.x; haze.position.z = camera.position.z; nightSky.position.copy(camera.position);
    renderer.render(scene, camera); onFrame?.();
  };
  requestAnimationFrame(loop);
  document.addEventListener('visibilitychange', () => { const was = running; running = !document.hidden; if (running && !was) requestAnimationFrame(loop); });

  const sunNow = setTime(timeMs ?? Date.now());
  return {
    renderer, scene, camera, controls, heightAt, isLand, setTime, setVehicles, pick, screenOf, showRoute, showStop, flyTo, views, setView,
    get sun() { return sunState; }, get frames() { return frames; }, set onFrame(f) { onFrame = f; },
    select(id) { selectedId = id; follow = id; },
    unfollow() { follow = null; },
    setInset(px) { inset = Math.max(0, Math.round(px)); resize(); }, // keep the middle of the view above a bottom sheet
    stats: () => ({ buildings: nb, groundVerts: gGeo.attributes.position.count, buildingTris: I.length / 3, drawCalls: renderer.info.render.calls, sun: sunNow }),
  };
}
