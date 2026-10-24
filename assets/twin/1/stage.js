// assembl lab · twin stage v1
// One rendering and interaction base for every 3D twin. The look is an architect's maquette: pale card and timber
// under a studio lamp, on a paper table, with colour reserved for things that carry data. Everything here exists to
// show state: light follows the real sun for the twin's place and clock, weather is visible, flows move on the GPU,
// anything can be hovered or pinned with its number and where the number comes from, and the camera moves with intent.
// Quality steps down automatically (or with ?quality=low|mid|high), and reduced motion is respected throughout.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
export { THREE, OrbitControls, RoundedBoxGeometry };
// keep glows, glass, rings, steam and ghosts out of the ambient-occlusion buffer (the stock pass only skips points and lines)
GTAOPass.prototype.overrideVisibility = function () { const cache = this._visibilityCache; this.scene.traverse(o => { cache.set(o, o.visible); const m = o.material;
  if (o.isPoints || o.isLine || o.isSprite || (m && !Array.isArray(m) && m.transparent && m.depthWrite === false)) o.visible = false; }); };

export const PLACES = {
  auckland: [-36.85, 174.76], hamilton: [-37.79, 175.28], wellington: [-41.29, 174.78], christchurch: [-43.53, 172.64],
  nelson: [-41.27, 173.28], queenstown: [-45.03, 168.66], rotorua: [-38.14, 176.25], dunedin: [-45.87, 170.5],
  tauranga: [-37.69, 176.17], napier: [-39.49, 176.91], newplymouth: [-39.06, 174.08], palmerston: [-40.35, 175.61],
  invercargill: [-46.41, 168.35], whangarei: [-35.73, 174.32], nz: [-41.0, 174.0]
};
export const calm = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();
const params = new URLSearchParams(location.search);
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- the sun: position for a place and moment (good to a fraction of a degree, plenty for light)
export function solar(date, lat, lon) {
  const rad = Math.PI / 180, d = date.getTime() / 864e5 - 10957.5;
  const g = (357.529 + 0.98560028 * d) * rad, q = 280.459 + 0.98564736 * d;
  const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad, e = (23.439 - 0.00000036 * d) * rad;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)), dec = Math.asin(Math.sin(e) * Math.sin(L));
  const gmst = ((18.697374558 + 24.06570982441908 * d) % 24 + 24) % 24;
  const H = (gmst * 15 + lon) * rad - ra, la = lat * rad;
  const elev = Math.asin(Math.sin(la) * Math.sin(dec) + Math.cos(la) * Math.cos(dec) * Math.cos(H));
  const az = Math.atan2(-Math.sin(H), Math.tan(dec) * Math.cos(la) - Math.sin(la) * Math.cos(H)); // from north, clockwise
  return { elev, az };
}
// A New Zealand wall-clock moment: month 0-11, day of month, local decimal hour. Daylight saving roughly late Sep to early Apr.
export function nzDate(year, month, day, hour) {
  const dst = month >= 9 || month <= 2 || (month === 8 && day >= 27) || (month === 3 && day <= 5);
  return new Date(Date.UTC(year, month, day) + (hour - (dst ? 13 : 12)) * 3600e3);
}

// ---------- quality
function detectTier(renderer) {
  const q = params.get('quality'); if (q === 'low' || q === 'mid' || q === 'high') return q;
  if (window.__labEmbed) return 'low';
  if (!renderer) return 'low';
  const ua = navigator.userAgent, gl = renderer.getContext();
  let r = ''; try { const dbg = gl.getExtension('WEBGL_debug_renderer_info'); r = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : ''; } catch (e) {}
  if (/SwiftShader|llvmpipe|Software|Basic Render/i.test(r)) return 'low';
  if (/CrOS/.test(ua)) return 'mid';
  if (/Android|iPhone|iPad|Mobi/.test(ua)) return 'mid';
  if (/Intel/i.test(r) && !/Iris\(R\) Xe|Arc/i.test(r)) return 'mid';
  if ((navigator.hardwareConcurrency || 8) <= 4) return 'mid';
  return 'high';
}
const TIERS = {
  high: { dpr: 1.75, shadow: 4096, ao: true, tilt: true, samples: 4, post: true, rain: 1400 },
  mid: { dpr: 1.25, shadow: 2048, ao: false, tilt: true, samples: 4, post: true, rain: 700 },
  low: { dpr: 1, shadow: 1024, ao: false, tilt: false, samples: 0, post: false, rain: 300 }
};

// ---------- post: tilt-shift blur (the miniature look), a soft lamp falloff and a whisper of grain
const TiltShader = {
  uniforms: { tDiffuse: { value: null }, uDir: { value: new THREE.Vector2(1, 0) }, uFocus: { value: 0.5 }, uBand: { value: 0.16 },
    uAmount: { value: 5 }, uRes: { value: new THREE.Vector2(1, 1) }, uVig: { value: 0 }, uGrain: { value: 0 }, uTime: { value: 0 } },
  vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader: `uniform sampler2D tDiffuse;uniform vec2 uDir;uniform float uFocus;uniform float uBand;uniform float uAmount;uniform vec2 uRes;uniform float uVig;uniform float uGrain;uniform float uTime;varying vec2 vUv;
  float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233))+uTime)*43758.5453);}
  void main(){float d=abs(vUv.y-uFocus);float r=clamp((d-uBand)/0.45,0.0,1.0);r=r*r*uAmount;
    vec4 c;
    if(r>0.05){vec2 o1=uDir*r*1.3846153846/uRes;vec2 o2=uDir*r*3.2307692308/uRes;
      c=texture2D(tDiffuse,vUv)*0.2270270270+texture2D(tDiffuse,vUv+o1)*0.3162162162+texture2D(tDiffuse,vUv-o1)*0.3162162162+texture2D(tDiffuse,vUv+o2)*0.0702702703+texture2D(tDiffuse,vUv-o2)*0.0702702703;}
    else c=texture2D(tDiffuse,vUv);
    if(uVig>0.0){vec2 q=(vUv-0.5)*vec2(uRes.x/uRes.y,1.0);c.rgb*=mix(1.0,1.0-uVig,smoothstep(0.35,1.05,length(q)));}
    if(uGrain>0.0){c.rgb+=(h(vUv*uRes)-0.5)*uGrain;}
    gl_FragColor=c;}`
};

// ---------- palette for the maquette (light studio and dark room)
export const LOOK = {
  light: { bg: 0xEAE4DC, table: 0xE5DED5, card: 0xF3EEE7, card2: 0xE9E1D7, roof: 0xDCD3C8, timber: 0xD2B08A, felt: 0xCDD5BF, road: 0xC9C3BC,
    water: 0x9FBAC6, steel: 0xD3D7DA, ink: 0x492B3E, hemiSky: 0xFFFFFF, hemiGround: 0xD8CFC4, exposure: 1.0, vig: 0.10 },
  dark: { bg: 0x1B1219, table: 0x241A22, card: 0xE9E3DC, card2: 0xDDD4CA, roof: 0xCEC4B9, timber: 0xC6A47F, felt: 0xB5BFA8, road: 0xA9A29C,
    water: 0x7FA0AE, steel: 0xC4C9CC, ink: 0xF5F1F2, hemiSky: 0xC9C6E0, hemiGround: 0x3A2C36, exposure: 0.9, vig: 0.22 }
};
export const isDark = () => document.documentElement.dataset.theme === 'dark' || (document.documentElement.dataset.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
export const cssColor = (name, fallback = '#999') => new THREE.Color((getComputedStyle(document.documentElement).getPropertyValue(name) || '').trim() || fallback);

// ---------- geometry: rounded, light-catching shapes so nothing reads as a raw WebGL box
const geoCache = new Map();
const cached = (key, make) => { if (!geoCache.has(key)) geoCache.set(key, make()); return geoCache.get(key); };
export const geo = {
  // rounded box; r defaults to a gentle bevel proportional to the smallest side
  rbox(w, h, d, r) { r = r == null ? Math.min(0.22, Math.min(w, h, d) * 0.08) : r; r = Math.min(r, Math.min(w, h, d) / 2 - 0.001);
    return cached(`rb|${w}|${h}|${d}|${r}`, () => new RoundedBoxGeometry(w, h, d, r > 0.05 ? 3 : 1, Math.max(0.001, r))); },
  // vertical tank or silo from a lathe profile with a filleted base and a cone, dome or flat top
  tank(r, h, top = 'cone', topH = r * 0.6, seg = 32) {
    return cached(`tk|${r}|${h}|${top}|${topH}|${seg}`, () => {
      const f = Math.min(r * 0.12, 0.35), p = [new THREE.Vector2(0, 0), new THREE.Vector2(r - f, 0), new THREE.Vector2(r, f), new THREE.Vector2(r, h - f)];
      if (top === 'cone') { p.push(new THREE.Vector2(r - f * 0.3, h)); p.push(new THREE.Vector2(0.06, h + topH)); }
      else if (top === 'dome') { for (let i = 1; i <= 8; i++) { const a = i / 8 * Math.PI / 2; p.push(new THREE.Vector2(Math.cos(a) * r, h - f + Math.sin(a) * topH)); } }
      else { p.push(new THREE.Vector2(r - f, h)); p.push(new THREE.Vector2(0, h)); }
      p.push(new THREE.Vector2(0, p[p.length - 1].y));
      const g = new THREE.LatheGeometry(p, seg); g.computeVertexNormals(); return g; }); },
  cyl(r, h, seg = 28) { return cached(`cy|${r}|${h}|${seg}`, () => new THREE.CylinderGeometry(r, r, h, seg)); },
  // a pipe that bends through its points (smooth, like a real pipe run)
  pipe(points, r = 0.3, seg = 48) { const c = new THREE.CatmullRomCurve3(points.map(p => Array.isArray(p) ? new THREE.Vector3(...p) : p), false, 'catmullrom', 0.05);
    return new THREE.TubeGeometry(c, seg, r, 10, false); },
  // a felt tree: soft canopy balls on a timber trunk
  sphere(r, d = 2) { return cached(`sp|${r}|${d}`, () => new THREE.IcosahedronGeometry(r, d)); },
  capsule(r, l) { return cached(`ca|${r}|${l}`, () => new THREE.CapsuleGeometry(r, l, 4, 10)); },
  // a gabled roof prism (w along x, d along z, h ridge height)
  gable(w, d, h) { return cached(`gb|${w}|${d}|${h}`, () => { const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.lineTo(-w / 2, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2 }); g.translate(0, 0, -d / 2); g.computeVertexNormals(); return g; }); }
};

// ---------- materials
const std = o => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.86, metalness: 0 }, o));
function makeMaterials(look) {
  const M = {
    card: std({ color: look.card }), card2: std({ color: look.card2 }), roof: std({ color: look.roof, roughness: 0.9 }),
    timber: std({ color: look.timber, roughness: 0.74 }), felt: std({ color: look.felt, roughness: 0.98 }), road: std({ color: look.road, roughness: 0.95 }),
    steel: std({ color: look.steel, metalness: 0.55, roughness: 0.36 }), dark: std({ color: 0x3E3640, roughness: 0.7 }),
    water: new THREE.MeshPhysicalMaterial({ color: look.water, roughness: 0.12, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.1 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xDCE8EC, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.38, clearcoat: 1, depthWrite: false }),
    window: std({ color: 0xE7E2DA, emissive: 0xFFC98A, emissiveIntensity: 0, roughness: 0.4 }),
    table: std({ color: look.table, roughness: 1 }),
    ghost: new THREE.MeshBasicMaterial({ color: 0x8E6E88, transparent: true, opacity: 0.22, depthWrite: false })
  };
  // a data colour: something that carries a number. Slight self-light so it reads at night, never a neon glow.
  M.data = (color, glow = 0.18) => std({ color, emissive: color, emissiveIntensity: glow, roughness: 0.55 });
  M.tint = (color, o = {}) => std(Object.assign({ color }, o));
  return M;
}
function ghostMaterial(color = 0x8E6E88) {
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: 0.5 } },
    vertexShader: 'varying vec3 vN;varying vec3 vV;void main(){vec4 p=vec4(position,1.0);vec3 n=normal;\n#ifdef USE_INSTANCING\np=instanceMatrix*p;n=mat3(instanceMatrix)*n;\n#endif\nvec4 mv=modelViewMatrix*p;vN=normalize(normalMatrix*n);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
    fragmentShader: 'uniform vec3 uColor;uniform float uOpacity;varying vec3 vN;varying vec3 vV;void main(){float f=pow(1.0-abs(dot(normalize(vN),normalize(vV))),2.2);gl_FragColor=vec4(uColor,(0.12+0.88*f)*uOpacity);}' });
}

// ---------- GPU flow: instances that move along a curve entirely in the vertex shader (no per-frame CPU work)
function makeFlow(stage, o) {
  const pts = o.points.map(p => Array.isArray(p) ? new THREE.Vector3(...p) : p.clone());
  const curve = new THREE.CatmullRomCurve3(pts, !!o.closed, o.curve || 'centripetal', 0.3);
  const N = 256, sp = curve.getSpacedPoints(N - 1), data = new Float32Array(N * 4);
  sp.forEach((p, i) => { data[i * 4] = p.x; data[i * 4 + 1] = p.y; data[i * 4 + 2] = p.z; data[i * 4 + 3] = 1; });
  const tex = new THREE.DataTexture(data, N, 1, THREE.RGBAFormat, THREE.FloatType); tex.minFilter = tex.magFilter = THREE.NearestFilter; tex.needsUpdate = true;
  const count = o.count || 80, length = curve.getLength();
  const g = o.geometry || (o.shape === 'box' ? geo.rbox(1, 1, 1, 0.2) : o.shape === 'capsule' ? geo.capsule(0.35, 0.5) : geo.sphere(0.5, 1));
  const mat = o.material || std({ color: o.color || 0x4F7C93, emissive: o.color || 0x4F7C93, emissiveIntensity: o.glow == null ? 0.25 : o.glow, roughness: 0.5 });
  const U = { uCurve: { value: tex }, uN: { value: N }, uT: { value: Math.random() }, uRate: { value: o.rate == null ? 1 : o.rate }, uSize: { value: o.size || 0.4 },
    uJit: { value: o.jitter == null ? 0.25 : o.jitter }, uClosed: { value: o.closed ? 1 : 0 } };
  mat.onBeforeCompile = sh => { Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
      attribute float aOff;attribute float aScl;attribute float aIdx;uniform sampler2D uCurve;uniform float uN;uniform float uT;uniform float uRate;uniform float uSize;uniform float uJit;uniform float uClosed;
      vec3 twCurve(float u){float x=u*(uN-1.0);float i=floor(x);float f=x-i;vec3 a=texture2D(uCurve,vec2((i+0.5)/uN,0.5)).xyz;vec3 b=texture2D(uCurve,vec2((min(i+1.0,uN-1.0)+0.5)/uN,0.5)).xyz;return mix(a,b,f);}`)
      .replace('#include <begin_vertex>', `float u=fract(aOff+uT);vec3 c=twCurve(u);
      float vis=step(aIdx,uRate)*(uClosed>0.5?1.0:smoothstep(0.0,0.03,u)*(1.0-smoothstep(0.97,1.0,u)));
      vec3 jit=vec3(fract(sin(aIdx*91.7)*43758.5)-0.5,fract(sin(aIdx*37.1)*12345.6)-0.5,fract(sin(aIdx*13.3)*9876.5)-0.5)*uJit;
      vec3 transformed=position*uSize*aScl*vis+c+jit;`); };
  mat.customProgramCacheKey = () => 'twflow';
  const mesh = new THREE.InstancedMesh(g, mat, count);
  const off = new Float32Array(count), scl = new Float32Array(count), idx = new Float32Array(count), I = new THREE.Matrix4();
  for (let i = 0; i < count; i++) { off[i] = i / count + (o.bunch ? 0 : (Math.random() - 0.5) * 0.4 / count); scl[i] = 0.8 + Math.random() * 0.4; idx[i] = (i + 0.5) / count; mesh.setMatrixAt(i, I); }
  // shuffle idx so lowering the rate thins the stream evenly instead of cutting it off
  for (let i = count - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  g.setAttribute && null;
  const ig = g.clone(); ig.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 1)); ig.setAttribute('aScl', new THREE.InstancedBufferAttribute(scl, 1)); ig.setAttribute('aIdx', new THREE.InstancedBufferAttribute(idx, 1));
  mesh.geometry = ig; mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = false;
  (o.parent || stage.root).add(mesh);
  let speed = o.speed == null ? 4 : o.speed;
  const f = { mesh, curve, length, material: mat, uniforms: U,
    set(p) { if (p.rate != null) U.uRate.value = clamp(p.rate, 0, 1); if (p.speed != null) speed = p.speed; if (p.size != null) U.uSize.value = p.size;
      if (p.color != null) { mat.color.set(p.color); if (mat.emissive) mat.emissive.set(p.color); } if (p.visible != null) mesh.visible = p.visible; return f; },
    update(dt) { U.uT.value = (U.uT.value + dt * speed * (calm ? 0.35 : 1) / length) % 1; },
    dispose() { mesh.parent && mesh.parent.remove(mesh); ig.dispose(); tex.dispose(); } };
  return f;
}

// ---------- rain: falling streaks drawn on the GPU
function makeRain(stage, count, extent) {
  const pos = new Float32Array(count * 2 * 3), seed = new Float32Array(count * 2 * 3), end = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) { const x = (Math.random() * 2 - 1) * extent, z = (Math.random() * 2 - 1) * extent, ph = Math.random();
    for (let k = 0; k < 2; k++) { seed.set([x, z, ph], (i * 2 + k) * 3); end[i * 2 + k] = k; } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3)); g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uT: { value: 0 }, uH: { value: extent * 0.9 }, uWind: { value: new THREE.Vector2(0.2, 0.1) }, uOp: { value: 0 }, uColor: { value: new THREE.Color(0x8FA6B4) } },
    vertexShader: 'attribute vec3 aSeed;attribute float aEnd;uniform float uT;uniform float uH;uniform vec2 uWind;varying float vE;void main(){float y=uH*(1.0-fract(aSeed.z+uT));vec3 p=vec3(aSeed.x,y,aSeed.y);float L=1.6;p+=vec3(uWind.x*L,L,uWind.y*L)*aEnd;vE=aEnd;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}',
    fragmentShader: 'uniform float uOp;uniform vec3 uColor;varying float vE;void main(){gl_FragColor=vec4(uColor,uOp*(0.25+0.75*vE));}' });
  const lines = new THREE.LineSegments(g, m); lines.frustumCulled = false; lines.visible = false; stage.scene.add(lines);
  return { lines, m, update(dt, level, wind) { lines.visible = level > 0.02; m.uniforms.uOp.value = 0.55 * level; m.uniforms.uT.value = (m.uniforms.uT.value + dt * (calm ? 0.3 : 0.9)) % 1;
    if (wind) m.uniforms.uWind.value.set(wind[0] * 0.25, wind[1] * 0.25); } };
}

// ---------- the stage
// o: { id, canvas, box, place:'hamilton'|[lat,lon], extent (scene radius in units), north (radians, world rotation of north from +z),
//      controls:{minDistance,maxDistance,maxPolarAngle,enablePan}, fov, ao:{radius}, table:true, tiltBand, onTheme }
export function createStage(o) {
  const canvas = o.canvas, box = o.box || canvas.parentElement, extent = o.extent || 50;
  box.classList.add('tw');
  const place = (Array.isArray(o.place) ? o.place : (PLACES[o.place] || PLACES.nz)).slice();
  const posterMode = params.get('poster') === '1';
  if (posterMode) document.documentElement.classList.add('tw-poster');
  let renderer = null;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: posterMode }); }
  catch (e) { renderer = null; }
  const ok = !!renderer;
  let tierName = detectTier(renderer), tier = TIERS[tierName];
  const scene = new THREE.Scene(), root = new THREE.Group(); scene.add(root);
  const camera = new THREE.PerspectiveCamera(o.fov || 34, 1, 0.5, extent * 14);
  const controls = new OrbitControls(camera, canvas);
  Object.assign(controls, { enableDamping: true, dampingFactor: 0.08, enablePan: false, minDistance: extent * 0.25, maxDistance: extent * 3.4, maxPolarAngle: Math.PI * 0.46, rotateSpeed: 0.7, zoomSpeed: 0.8 }, o.controls || {});
  let look = isDark() ? LOOK.dark : LOOK.light, dark = isDark();
  const M = makeMaterials(look);

  // lights: hemisphere fill, the sun (shadows), a soft studio key from the environment map
  const hemi = new THREE.HemisphereLight(look.hemiSky, look.hemiGround, 0.9); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1dd, 2.6); sun.castShadow = ok; scene.add(sun); scene.add(sun.target);
  const moonFill = new THREE.DirectionalLight(0x9fb2d9, 0); moonFill.position.set(-1, 2, -1); scene.add(moonFill);
  function configShadow() { sun.shadow.mapSize.set(tier.shadow, tier.shadow); const s = sun.shadow.camera, r = extent * 1.15;
    Object.assign(s, { left: -r, right: r, top: r, bottom: -r, near: 1, far: extent * 6 }); s.updateProjectionMatrix();
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04 * extent / 50; if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  configShadow();

  // the paper table the model sits on, fading into the room
  let table = null;
  if (o.table !== false) { table = new THREE.Mesh(new THREE.CircleGeometry(extent * 12, 96), M.table); table.rotation.x = -Math.PI / 2; table.position.y = (o.tableY == null ? -1.05 : o.tableY); table.receiveShadow = true; scene.add(table); }

  if (ok) {
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, tier.dpr));
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = look.exposure;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; pmrem.dispose();
    scene.environmentIntensity = 0.55;
  }

  // ---- post
  let composer = null, gtao = null, tiltH = null, tiltV = null, renderPass = null;
  function buildPost() {
    if (composer) { composer.dispose && composer.dispose(); composer = null; gtao = null; }
    if (!ok || !tier.post || posterMode && false) return;
    const sz = renderer.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(Math.max(1, sz.x), Math.max(1, sz.y), { type: THREE.HalfFloatType, samples: tier.samples });
    composer = new EffectComposer(renderer, rt);
    renderPass = new RenderPass(scene, camera); composer.addPass(renderPass);
    if (tier.ao) { gtao = new GTAOPass(scene, camera, sz.x, sz.y); gtao.output = GTAOPass.OUTPUT.Default; gtao.blendIntensity = o.ao && o.ao.intensity != null ? o.ao.intensity : 0.95;
      const ar = (o.ao && o.ao.radius) || extent * 0.05;
      gtao.updateGtaoMaterial({ radius: ar, distanceExponent: 1.4, thickness: ar * 0.6, scale: 1.0, samples: 16 });
      gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 7, rings: 2, samples: 16 }); composer.addPass(gtao); }
    composer.addPass(new OutputPass());
    if (tier.tilt || look.vig) { tiltH = new ShaderPass(TiltShader); tiltV = new ShaderPass(TiltShader); tiltV.uniforms.uDir.value.set(0, 1);
      composer.addPass(tiltH); composer.addPass(tiltV); }
    resize();
  }

  // ---- theme
  function applyTheme() {
    dark = isDark(); look = dark ? LOOK.dark : LOOK.light;
    scene.background = new THREE.Color(look.bg); scene.fog = new THREE.Fog(look.bg, extent * 2.6, extent * 7.5);
    ['card', 'card2', 'roof', 'timber', 'felt', 'road', 'steel', 'water', 'table'].forEach(k => M[k].color.set(look[k])); hemi.color.set(look.hemiSky); hemi.groundColor.set(look.hemiGround);
    if (ok) renderer.toneMappingExposure = look.exposure;
    box.style.background = '#' + new THREE.Color(look.bg).getHexString();
    if (o.onTheme) o.onTheme(dark, look);
    lightNow();
  }
  new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme); } catch (e) {}

  // ---- clock, sun and weather
  const clock = { date: new Date(), elev: 0.6, az: 0, day: 1, night: 0 };
  const weather = { rain: 0, cloud: 0, fog: 0, wet: 0, wind: [0.4, 0.15] };
  const north = o.north || 0;
  const sunDir = new THREE.Vector3();
  function setClock(date) { clock.date = date; const s = solar(date, place[0], place[1]); clock.elev = s.elev; clock.az = s.az; lightNow(); }
  function setWeather(w) { Object.assign(weather, w); lightNow(); }
  function lightNow() {
    const el = clock.elev, az = clock.az + north;
    const day = smooth(-0.11, 0.2, el); clock.day = day; clock.night = 1 - smooth(-0.14, 0.03, el);
    const lowSun = 1 - smooth(0.05, 0.6, el), cloud = clamp(weather.cloud + weather.rain * 0.6, 0, 1);
    const elv = Math.max(el, 0.08); // keep a usable light angle even at dusk so the model never goes flat
    sunDir.set(-Math.sin(az) * Math.cos(elv), Math.sin(elv), Math.cos(az) * Math.cos(elv)).normalize();
    sun.position.copy(sunDir).multiplyScalar(extent * 3); sun.target.position.set(0, 0, 0);
    sun.color.setHSL(0.09 - 0.04 * lowSun, 0.55 * lowSun + 0.15, 0.62 + 0.25 * (1 - lowSun));
    sun.intensity = (dark ? 2.3 : 2.7) * day * (1 - 0.72 * cloud);
    if ('intensity' in sun.shadow) sun.shadow.intensity = 1 - 0.55 * cloud;
    hemi.intensity = (dark ? 0.55 : 0.85) * (0.35 + 0.65 * day) * (1 + 0.35 * cloud);
    moonFill.intensity = clock.night * (dark ? 0.55 : 0.7);
    scene.environmentIntensity = (dark ? 0.32 : 0.5) * (0.4 + 0.6 * day) + 0.12 * cloud;
    M.window.emissiveIntensity = clock.night * 1.6;
    const wet = clamp(Math.max(weather.wet, weather.rain), 0, 1);
    M.felt.roughness = 0.98 - 0.45 * wet; M.road.roughness = 0.95 - 0.6 * wet; M.table.roughness = 1 - 0.3 * wet;
    if (scene.fog) { const near = extent * (2.6 - 1.9 * weather.fog), far = extent * (7.5 - 5.2 * weather.fog); scene.fog.near = near; scene.fog.far = far; }
  }
  let rain = null;

  // ---- size
  let W = 1, H = 1;
  function resize(w, h) {
    W = Math.max(1, Math.round(w || box.clientWidth || canvas.clientWidth || 800)); H = Math.max(1, Math.round(h || canvas.clientHeight || box.clientHeight || 500));
    camera.aspect = W / H; if (!o.fov) camera.fov = W / H < 1 ? 46 : 34; camera.updateProjectionMatrix();
    if (!ok) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, tier.dpr)); renderer.setSize(W, H, false);
    if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(W, H);
      const pr = renderer.getPixelRatio(); [tiltH, tiltV].forEach(p => p && p.uniforms.uRes.value.set(W * pr, H * pr)); }
    stage.pointScale = H * renderer.getPixelRatio() / (2 * Math.tan(camera.fov * Math.PI / 360));
  }

  // ---- camera direction: eased moves with a gentle arc, focus for the miniature blur, and follow
  let move = null, follow = null, focusAmt = 1;
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
  function flyTo(v, opt = {}) {
    const p1 = new THREE.Vector3(...(v.p || v.position)), t1 = new THREE.Vector3(...(v.t || v.target));
    if (camera.aspect < 1 && !opt.exact) p1.sub(t1).multiplyScalar(1.3).add(t1);
    const dur = calm || opt.instant ? 0 : (opt.dur || 1.6);
    follow = null; focusAmt = v.focus || 1;
    if (!dur) { camera.position.copy(p1); controls.target.copy(t1); move = null; controls.update(); return; }
    move = { p0: camera.position.clone(), t0: controls.target.clone(), p1, t1, k: 0, dur, arc: opt.arc == null ? 0.18 : opt.arc };
  }
  function stepMove(dt) {
    if (!move) return; move.k = Math.min(1, move.k + dt / move.dur); const e = ease(move.k);
    tmpA.lerpVectors(move.p0, move.p1, e); const lift = Math.sin(Math.PI * e) * move.arc * move.p0.distanceTo(move.p1); tmpA.y += lift;
    camera.position.copy(tmpA); controls.target.lerpVectors(move.t0, move.t1, e);
    if (move.k >= 1) move = null;
  }
  function followObj(obj, opt = {}) {
    if (!obj) { follow = null; ui.setFollow(null); return; }
    move = null; follow = { obj, off: opt.offset ? new THREE.Vector3(...opt.offset) : null, title: opt.title || '' };
    ui.setFollow(follow.title || 'this');
  }
  function stepFollow(dt) {
    if (!follow) return; follow.obj.getWorldPosition(tmpB); if (follow.off) tmpB.add(follow.off);
    const d = tmpA.copy(tmpB).sub(controls.target).multiplyScalar(Math.min(1, dt * 3));
    controls.target.add(d); camera.position.add(d);
  }
  controls.addEventListener('start', () => { move = null; if (follow) followObj(null); });
  const project = (v3, out = {}) => { tmpA.copy(v3).project(camera); out.x = (tmpA.x + 1) / 2 * W; out.y = (1 - tmpA.y) / 2 * H; out.visible = tmpA.z < 1 && out.x > -40 && out.x < W + 40 && out.y > -40 && out.y < H + 40; return out; };

  // ---- UI layer inside the stage box
  const uiEl = document.createElement('div'); uiEl.className = 'tw-ui'; box.appendChild(uiEl);
  uiEl.innerHTML = `<div class="tw-tools" role="toolbar" aria-label="Ways to explore this twin">
      <button type="button" class="tw-btn" data-tw="tour" hidden>Guided tour</button>
      <button type="button" class="tw-btn" data-tw="explore" aria-expanded="false" aria-controls="tw-explore-${o.id || 'x'}" hidden>Explore</button>
      <button type="button" class="tw-btn" data-tw="compare" aria-expanded="false" hidden>Compare</button>
      <button type="button" class="tw-btn tw-ico" data-tw="sound" aria-pressed="false" aria-label="Sound is off" title="Sound is off" hidden><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 8h3l4-3v10l-4-3H3z" fill="currentColor"/><path class="tw-wave" d="M13 7.2a4 4 0 0 1 0 5.6M15.3 5a7 7 0 0 1 0 10" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/><path class="tw-mute" d="M13.5 7.5l4.5 5m0-5-4.5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
    </div>
    <div class="tw-pop tw-explore" id="tw-explore-${o.id || 'x'}" role="dialog" aria-label="Parts of the twin" hidden><div class="tw-pop-h">Tap a part to see its live number</div><div class="tw-list"></div></div>
    <div class="tw-pop tw-comparepop" role="dialog" aria-label="Compare" hidden></div>
    <div class="tw-hover" aria-hidden="true" hidden></div>
    <div class="tw-pins" aria-live="polite"></div>
    <div class="tw-following" hidden><span></span><button type="button" class="tw-link">Stop following</button></div>
    <div class="tw-tour" role="dialog" aria-label="Guided tour" hidden></div>
    <div class="tw-dialwrap"></div>`;
  const $u = s => uiEl.querySelector(s);
  const btn = n => $u(`[data-tw="${n}"]`);
  const ui = {
    setFollow(t) { const f = $u('.tw-following'); f.hidden = !t; if (t) f.querySelector('span').textContent = 'Following ' + t; }
  };
  $u('.tw-following .tw-link').onclick = () => followObj(null);

  // ---- touch anything: hover for the live number, tap or click to pin, Explore lists every part (keyboard friendly)
  const picks = [], pinned = [];
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), bb = new THREE.Box3(), anc = new THREE.Vector3(), scr = {};
  let hovered = null, lastMove = null, downAt = null;
  function anchorOf(spec, out) {
    if (spec.anchor) { if (typeof spec.anchor === 'function') out.copy(spec.anchor()); else out.set(...spec.anchor); return out; }
    bb.setFromObject(spec.obj); if (bb.isEmpty()) { spec.obj.getWorldPosition(out); return out; }
    out.set((bb.min.x + bb.max.x) / 2, bb.max.y, (bb.min.z + bb.max.z) / 2); return out;
  }
  function glow(spec, on) {
    spec.obj.traverse(m => { if (!m.isMesh || m.isInstancedMesh || !m.material || Array.isArray(m.material)) return;
      if (on) { if (!m.userData.twGlow || m.userData.twBase !== m.material) { m.userData.twBase = m.material; const c = m.material.clone();
          if (c.emissive) { c.emissive = new THREE.Color(spec.color || 0xD9822B); c.emissiveIntensity = 0.16; } m.userData.twGlow = c; }
        m.material = m.userData.twGlow; }
      else if (m.userData.twGlow && m.material === m.userData.twGlow) m.material = m.userData.twBase; });
  }
  const truthTag = t => t ? `<span class="tw-truth tw-t-${String(t).toLowerCase().replace(/[^a-z]/g, '')}">${esc(t)}</span>` : '';
  function cardHTML(spec, pin) {
    let v = ''; try { v = typeof spec.value === 'function' ? spec.value() : (spec.value || ''); } catch (e) { v = ''; }
    const src = spec.source ? `<span class="tw-src">${spec.href ? `<a href="${esc(spec.href)}" target="_blank" rel="noopener">${esc(spec.source)}</a>` : esc(spec.source)}</span>` : '';
    const acts = pin ? `<div class="tw-acts">${spec.panel ? `<button type="button" class="tw-link" data-a="panel">Show in the panel</button>` : ''}${spec.follow ? `<button type="button" class="tw-link" data-a="follow">Follow</button>` : ''}<button type="button" class="tw-link" data-a="focus">Look closer</button></div>` : '';
    return `<div class="tw-ch"><b>${esc(spec.title)}</b>${pin ? `<button type="button" class="tw-x" aria-label="Close ${esc(spec.title)}">×</button>` : ''}</div><div class="tw-cv">${v}</div><div class="tw-cf">${truthTag(spec.truth)}${src}</div>${acts}`;
  }
  function pickable(obj, spec) { spec.obj = obj; obj.userData.twPick = spec; picks.push(spec); if (!spec.hidden) refreshExplore(); return obj; }
  function findSpec(o3) { while (o3) { if (o3.userData && o3.userData.twPick) return o3.userData.twPick; o3 = o3.parent; } return null; }
  function hitTest(cx, cy) {
    const r = canvas.getBoundingClientRect(); ndc.set((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    // the nearest solid thing under the pointer wins, so a part hidden behind a wall can't be picked through it
    const hits = ray.intersectObject(scene, true);
    for (const h of hits) { const o = h.object; if (!o.isMesh) continue;
      let vis = true; for (let q = o; q; q = q.parent) if (q.visible === false) { vis = false; break; } if (!vis) continue;
      const s = findSpec(o); if (s && !s.disabled) return s;
      const m = o.material; if (o.isInstancedMesh || !m || Array.isArray(m) || m.isShaderMaterial || (m.transparent && m.opacity < 0.5)) continue;
      return null; }
    return null;
  }
  const hoverEl = $u('.tw-hover');
  canvas.addEventListener('pointermove', e => { if (e.pointerType === 'touch') return; lastMove = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerleave', () => { lastMove = null; setHover(null); });
  canvas.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY, performance.now()]; });
  canvas.addEventListener('pointerup', e => { if (!downAt) return; const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]), quick = performance.now() - downAt[2] < 450; downAt = null;
    if (moved < 6 && quick) { const s = hitTest(e.clientX, e.clientY); if (s) pin(s); } });
  function setHover(s) {
    if (s === hovered) return; if (hovered && !pinned.some(p => p.spec === hovered)) glow(hovered, false);
    hovered = s; canvas.style.cursor = s ? 'pointer' : '';
    if (s) { glow(s, true); hoverEl.innerHTML = cardHTML(s, false); hoverEl.hidden = false; } else hoverEl.hidden = true;
  }
  function placeCard(el, spec) { anchorOf(spec, anc); project(anc, scr); if (!scr.visible) { el.style.visibility = 'hidden'; return; } el.style.visibility = '';
    const cw = el.offsetWidth, ch = el.offsetHeight, x = clamp(scr.x, cw / 2 + 8, W - cw / 2 - 8), y = clamp(scr.y - 12, ch + 8, H - 8);
    el.style.transform = `translate(${Math.round(x - cw / 2)}px,${Math.round(y - ch)}px)`; }
  function pin(spec, opt = {}) {
    let p = pinned.find(x => x.spec === spec);
    if (!p) { if (pinned.length >= 3) unpin(pinned[0].spec);
      const el = document.createElement('div'); el.className = 'tw-card tw-pinned'; el.setAttribute('role', 'group'); el.setAttribute('aria-label', spec.title);
      el.innerHTML = cardHTML(spec, true); $u('.tw-pins').appendChild(el); p = { spec, el, t: 0 }; pinned.push(p); glow(spec, true);
      el.addEventListener('click', ev => { const a = ev.target.closest('[data-a]'), x = ev.target.closest('.tw-x');
        if (x) { unpin(spec); return; } if (!a) return;
        if (a.dataset.a === 'panel') { const t = document.querySelector(spec.panel); if (t) { t.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'center' }); t.classList.remove('tw-flash'); void t.offsetWidth; t.classList.add('tw-flash'); } }
        if (a.dataset.a === 'follow') followObj(spec.followObj || spec.obj, { title: spec.title.toLowerCase(), offset: spec.followOffset });
        if (a.dataset.a === 'focus') focusOn(spec); }); }
    if (opt.focus) focusOn(spec); if (spec.onPin) spec.onPin(); return p;
  }
  function unpin(spec) { const i = pinned.findIndex(x => x.spec === spec); if (i < 0) return; pinned[i].el.remove(); pinned.splice(i, 1); if (hovered !== spec) glow(spec, false); }
  function focusOn(spec) {
    if (spec.view) { flyTo(spec.view); return; }
    bb.setFromObject(spec.obj); const c = bb.getCenter(new THREE.Vector3()), size = bb.getSize(new THREE.Vector3()).length() || 6;
    const dir = camera.position.clone().sub(controls.target).normalize(); dir.y = Math.max(dir.y, 0.45); dir.normalize();
    const dist = clamp(size * 1.9, controls.minDistance * 1.05, controls.maxDistance * 0.7);
    flyTo({ p: c.clone().add(dir.multiplyScalar(dist)).toArray(), t: c.toArray(), focus: 1.6 }, { exact: true });
  }
  function updateCards(dt) {
    if (lastMove) { const s = hitTest(lastMove[0], lastMove[1]); setHover(s); lastMove = null; }
    if (hovered && !hoverEl.hidden) { hovered._t = (hovered._t || 0) + dt; if (hovered._t > 0.3) { hovered._t = 0; hoverEl.innerHTML = cardHTML(hovered, false); } placeCard(hoverEl, hovered); }
    pinned.forEach(p => { p.t += dt; if (p.t > 0.4) { p.t = 0; const cv = p.el.querySelector('.tw-cv'); let v = ''; try { v = typeof p.spec.value === 'function' ? p.spec.value() : (p.spec.value || ''); } catch (e) {} if (cv && cv.innerHTML !== v) cv.innerHTML = v; } placeCard(p.el, p.spec); });
  }
  // Explore: every pickable part as a button
  function refreshExplore() { const list = $u('.tw-list'), vis = picks.filter(p => !p.hidden); btn('explore').hidden = !vis.length;
    list.innerHTML = vis.map((p, i) => `<button type="button" class="tw-item" data-i="${picks.indexOf(p)}"><b>${esc(p.title)}</b>${p.hint ? `<span>${esc(p.hint)}</span>` : ''}</button>`).join(''); }
  $u('.tw-list').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (!b) return; const s = picks[+b.dataset.i]; closePops(); pin(s, { focus: true }); });
  function closePops() { uiEl.querySelectorAll('.tw-pop').forEach(p => p.hidden = true); ['explore', 'compare'].forEach(n => btn(n).setAttribute('aria-expanded', 'false')); }
  function togglePop(name, sel) { const pop = $u(sel), open = pop.hidden; closePops(); pop.hidden = !open; btn(name).setAttribute('aria-expanded', open ? 'true' : 'false'); if (open) { const f = pop.querySelector('button'); f && f.focus(); } }
  btn('explore').onclick = () => togglePop('explore', '.tw-explore');
  document.addEventListener('keydown', e => { if (e.key !== 'Escape') return; if (!uiEl.querySelector('.tw-pop:not([hidden])') && !pinned.length && !follow && tour.on === false) return; closePops(); while (pinned.length) unpin(pinned[0].spec); followObj(null); if (tour.on) tour.end(); });
  document.addEventListener('pointerdown', e => { if (!uiEl.contains(e.target)) closePops(); });

  // ---- guided tour: the camera and short notes in step, like a person walking you round
  const tourEl = $u('.tw-tour');
  const tour = { on: false, i: 0, steps: [], title: '',
    set(steps, title = 'Guided tour') { tour.steps = steps; tour.title = title; btn('tour').hidden = !steps.length; },
    start(i = 0) { if (!tour.steps.length) return; tour.on = true; closePops(); tourEl.hidden = false; uiEl.classList.add('tw-touring'); tour.go(i); },
    go(i) { tour.i = clamp(i, 0, tour.steps.length - 1); const s = tour.steps[tour.i];
      try { s.do && s.do(); } catch (e) { console.warn('tour step', e); }
      if (s.view) flyTo(typeof s.view === 'string' ? stage.views[s.view] : s.view, { dur: s.dur || 2.2, exact: !!s.exact });
      // the tour's own cards: one per stop, and none on a phone, where the note itself is the card
      while (pinned.length) unpin(pinned[0].spec); clearTimeout(tour.pt);
      if (s.pin && W >= 640) tour.pt = setTimeout(() => { if (tour.on) pin(typeof s.pin === 'function' ? s.pin() : s.pin); }, calm ? 0 : 1300);
      const n = tour.steps.length;
      tourEl.innerHTML = `<div class="tw-tour-h"><span>${esc(tour.title)} · ${tour.i + 1} of ${n}</span><button type="button" class="tw-x" data-t="end" aria-label="End the tour">×</button></div>
        <b class="tw-tour-t">${esc(s.title)}</b><p>${s.text}</p>
        <div class="tw-tour-f"><span class="tw-dots" aria-hidden="true">${tour.steps.map((_, k) => `<i class="${k === tour.i ? 'on' : k < tour.i ? 'done' : ''}"></i>`).join('')}</span>
        <button type="button" class="tw-btn" data-t="back" ${tour.i ? '' : 'disabled'}>Back</button><button type="button" class="tw-btn tw-primary" data-t="next">${tour.i === n - 1 ? 'Finish' : 'Next'}</button></div>`;
      const nb = tourEl.querySelector('[data-t="next"]'); nb && nb.focus({ preventScroll: true }); },
    end() { tour.on = false; clearTimeout(tour.pt); while (pinned.length) unpin(pinned[0].spec); tourEl.hidden = true; uiEl.classList.remove('tw-touring'); const s = tour.onEnd; s && s(); btn('tour').focus({ preventScroll: true }); }
  };
  btn('tour').onclick = () => tour.start(0);
  tourEl.addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (!b) return; const a = b.dataset.t;
    if (a === 'end') tour.end(); else if (a === 'back') tour.go(tour.i - 1); else if (a === 'next') { if (tour.i >= tour.steps.length - 1) tour.end(); else tour.go(tour.i + 1); } });
  tourEl.addEventListener('keydown', e => { if (e.key === 'ArrowRight') tour.go(tour.i + 1); if (e.key === 'ArrowLeft') tour.go(tour.i - 1); });

  // ---- compare: a translucent ghost of another moment or choice over the live scene
  const cmp = { opts: [], cur: null, onChange: null, label: 'Compare' };
  function compare(opt) { cmp.opts = opt.options || []; cmp.onChange = opt.onChange; cmp.label = opt.label || 'Compare'; btn('compare').hidden = !cmp.opts.length; drawCompare(); return compareApi; }
  // set the ghost from code (a tour stop, an API call); the button and menu follow
  const compareApi = { set(id, quiet) { cmp.cur = id == null ? null : String(id); drawCompare(); if (!quiet && cmp.onChange) cmp.onChange(cmp.cur); return compareApi; }, get: () => cmp.cur };
  function drawCompare() { const pop = $u('.tw-comparepop'); btn('compare').textContent = cmp.cur ? `${cmp.label}: ${cmp.opts.find(x => x.id === cmp.cur)?.short || 'on'}` : cmp.label;
    btn('compare').classList.toggle('tw-on', !!cmp.cur);
    pop.innerHTML = `<div class="tw-pop-h">${esc(opt_hint())}</div>` + [{ id: null, label: 'No ghost', note: 'Just the live scene' }, ...cmp.opts].map(x => `<button type="button" class="tw-item" data-c="${x.id || ''}" aria-pressed="${cmp.cur === x.id}"><b>${esc(x.label)}</b>${x.note ? `<span>${esc(x.note)}</span>` : ''}</button>`).join(''); }
  const opt_hint = () => 'Show a ghost of another moment or choice over the live scene';
  btn('compare').onclick = () => togglePop('compare', '.tw-comparepop');
  $u('.tw-comparepop').addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (!b) return; cmp.cur = b.dataset.c || null; closePops(); drawCompare(); cmp.onChange && cmp.onChange(cmp.cur); });
  const GM = ghostMaterial();
  function ghost(obj) { const g = obj.clone(true); g.traverse(m => { if (m.isMesh) { m.material = GM; m.castShadow = false; m.receiveShadow = false; m.userData = {}; } }); g.visible = false; g.userData.twGhost = true; (obj.parent || root).add(g); return g; }

  // ---- sound: quiet ambience that follows the state (a dryer's hum, steam, tills, a room's murmur). Off until asked for.
  const sound = (() => {
    let ctx = null, master = null, on = false; const layers = {}, defs = {};
    let noiseBuf = null;
    const KEY = 'labSound';
    function mkNoise() { const n = ctx.sampleRate * 2, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0); let l = 0; for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; l = (l + 0.02 * w) / 1.02; d[i] = l * 3.5 + w * 0.12; } return b; }
    function build(name) { const d = defs[name]; if (!ctx || layers[name]) return; const g = ctx.createGain(); g.gain.value = 0; g.connect(master); const L = { g, d, level: d.level || 0, acc: 0 };
      if (d.type === 'hum') { [1, 1.004, 2].forEach((m, i) => { const os = ctx.createOscillator(); os.type = i === 2 ? 'sine' : 'sawtooth'; os.frequency.value = d.freq * m;
          const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = d.freq * 3; const og = ctx.createGain(); og.gain.value = i === 2 ? 0.25 : 0.18; os.connect(lp).connect(og).connect(g); os.start(); }); }
      else if (d.type === 'noise' || d.type === 'rain' || d.type === 'chatter' || d.type === 'wind') { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
          const f = ctx.createBiquadFilter(); f.type = d.type === 'rain' ? 'highpass' : 'bandpass'; f.frequency.value = d.f || (d.type === 'rain' ? 1400 : d.type === 'chatter' ? 850 : d.type === 'wind' ? 380 : 600); f.Q.value = d.q || (d.type === 'chatter' ? 1.4 : 0.7);
          s.connect(f).connect(g); s.start(); L.f = f; }
      layers[name] = L; }
    function blip(freq, dur, gain) { const t = ctx.currentTime, os = ctx.createOscillator(), g = ctx.createGain(); os.type = 'sine'; os.frequency.value = freq; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); os.connect(g).connect(master); os.start(t); os.stop(t + dur + 0.02); }
    const api = {
      layer(name, def) { defs[name] = def; if (ctx) build(name); btn('sound').hidden = false; return api; },
      set(name, level) { const d = defs[name]; if (!d) return; d.level = clamp(level, 0, 1); const L = layers[name]; if (L && L.d.type !== 'ticks') L.g.gain.setTargetAtTime(d.level * (d.gain || 0.3), ctx.currentTime, 0.4); },
      get on() { return on; },
      toggle(v) { on = v == null ? !on : !!v; try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) {}
        if (on && !ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) { on = false; return; } ctx = new C(); master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination); noiseBuf = mkNoise(); Object.keys(defs).forEach(build); Object.keys(defs).forEach(n => api.set(n, defs[n].level || 0)); }
        if (ctx) { if (on) ctx.resume(); master.gain.setTargetAtTime(on ? 0.5 : 0, ctx.currentTime, 0.15); if (!on) setTimeout(() => { if (!on && ctx) ctx.suspend(); }, 600); }
        const b = btn('sound'); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.setAttribute('aria-label', on ? 'Sound is on' : 'Sound is off'); b.title = on ? 'Sound is on' : 'Sound is off'; },
      update(dt) { if (!on || !ctx) return; for (const n in layers) { const L = layers[n], d = defs[n];
          if (d.type === 'ticks') { L.acc += dt * (d.level || 0) * (d.rate || 2); while (L.acc >= 1) { L.acc -= 1; blip(d.freq * (0.97 + Math.random() * 0.06), d.dur || 0.06, (d.gain || 0.08)); } }
          if (d.type === 'chatter' && L.f) { L.f.frequency.setTargetAtTime(700 + Math.random() * 500, ctx.currentTime, 0.08); L.g.gain.setTargetAtTime((d.level || 0) * (d.gain || 0.3) * (0.55 + Math.random() * 0.6), ctx.currentTime, 0.12); } } }
    };
    btn('sound').onclick = () => api.toggle();
    return api;
  })();

  // ---- the time dial: an outer season wheel (12 months, bar = that month's load) and an inner 24-hour ring you can turn
  let dialObj = null;
  function dial(d) {
    const NM = d.months ? d.months.labels.length : 12, wrap = $u('.tw-dialwrap'), S = 120, C = S / 2, R0 = 37, RL = 17, RD = 27;
    const pol = (r, a) => [C + r * Math.sin(a), C - r * Math.cos(a)];
    const arc = (r1, r2, a1, a2) => { const [x1, y1] = pol(r2, a1), [x2, y2] = pol(r2, a2), [x3, y3] = pol(r1, a2), [x4, y4] = pol(r1, a1), l = a2 - a1 > Math.PI ? 1 : 0;
      return `M${x1} ${y1}A${r2} ${r2} 0 ${l} 1 ${x2} ${y2}L${x3} ${y3}A${r1} ${r1} 0 ${l} 0 ${x4} ${y4}Z`; };
    wrap.innerHTML = `<svg class="tw-dial" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">
      ${d.months ? `<g class="tw-months" role="slider" tabindex="0" aria-label="${esc(d.months.title || 'Month')}" aria-valuemin="0" aria-valuemax="${NM - 1}"></g>` : ''}
      ${d.day ? `<circle class="tw-dtrack" cx="${C}" cy="${C}" r="${RD}"/><g class="tw-dmarks"></g><g class="tw-dhand" role="slider" tabindex="0" aria-label="${esc(d.day.title || 'Time of day')}" aria-valuemin="0" aria-valuemax="24"><line x1="${C}" y1="${C - 15}" x2="${C}" y2="${C - RD + 3}"/><circle cx="${C}" cy="${C - RD}" r="5"/></g>` : ''}
      <text class="tw-dt1" x="${C}" y="${C + 2}" text-anchor="middle"></text><text class="tw-dt2" x="${C}" y="${C + 14}" text-anchor="middle"></text></svg>`;
    const svg = wrap.querySelector('svg'), mg = svg.querySelector('.tw-months'), hand = svg.querySelector('.tw-dhand'), t1 = svg.querySelector('.tw-dt1'), t2 = svg.querySelector('.tw-dt2');
    if (d.day && d.day.marks) svg.querySelector('.tw-dmarks').innerHTML = d.day.marks.map(m => { const a = m.h / 24 * Math.PI * 2, [x1, y1] = pol(RD - 4, a), [x2, y2] = pol(RD + 4, a);
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="stroke:${m.c || 'var(--live)'}"><title>${esc(m.t || '')}</title></line>`; }).join('');
    let lastKey = '';
    const drawMonths = () => { if (!mg) return; const vals = d.months.values(), mx = Math.max(...vals, 1e-9), cur = d.months.get();
      mg.innerHTML = vals.map((v, i) => { const gap = Math.min(0.035, Math.PI / NM * 0.2), a1 = i / NM * Math.PI * 2 + gap, a2 = (i + 1) / NM * Math.PI * 2 - gap, len = 3 + v / mx * RL;
        return `<path d="${arc(R0, R0 + len, a1, a2)}" class="${i === cur ? 'on' : ''}"><title>${esc(d.months.labels[i])}</title></path>`; }).join('');
      mg.setAttribute('aria-valuenow', cur); mg.setAttribute('aria-valuetext', d.months.labels[cur]); };
    const update = () => {
      const held = !!(d.day && d.day.held && d.day.held());
      const m = d.months ? d.months.get() : -1, h = d.day ? d.day.get() % 24 : -1, key = m + '|' + (d.months ? d.months.values().join(',') : '') + '|' + Math.floor(h * 6) + '|' + held;
      if (key === lastKey) return; lastKey = key;
      if (d.months) drawMonths();
      if (d.day) { hand.setAttribute('transform', `rotate(${h / 24 * 360} ${C} ${C})`); hand.classList.toggle('tw-held', held); const hh = Math.floor(h), mm = Math.floor((h % 1) * 6) * 10;
        hand.setAttribute('aria-valuenow', h.toFixed(1)); hand.setAttribute('aria-valuetext', `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
        t1.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`; }
      t2.textContent = d.months ? d.months.short ? d.months.short[m] : d.months.labels[m].slice(0, 3) : (d.label || '');
    };
    let drag = null;
    const angAt = e => { const r = svg.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * S - C, y = (e.clientY - r.top) / r.height * S - C; return { a: (Math.atan2(x, -y) + Math.PI * 2) % (Math.PI * 2), r: Math.hypot(x, y) }; };
    const apply = (mode, a) => { if (mode === 'm' && d.months) { const i = Math.floor(a / (Math.PI * 2) * NM) % NM; if (i !== d.months.get()) d.months.set(i); }
      if (mode === 'h' && d.day) d.day.set(a / (Math.PI * 2) * 24); update(); };
    if (d.onCenter) wrap.title = `${d.months ? 'Drag the outer ring to change the month. ' : ''}Drag the hand to set the time. Tap the centre to hold or release the clock.`;
    svg.addEventListener('pointerdown', e => { const p = angAt(e); if (d.onCenter && p.r < RD - 9) { d.onCenter(); lastKey = ''; update(); e.preventDefault(); return; } drag = p.r > R0 - 2 && d.months ? 'm' : d.day ? 'h' : 'm'; svg.setPointerCapture(e.pointerId); apply(drag, p.a); e.preventDefault(); });
    svg.addEventListener('pointermove', e => { if (drag) apply(drag, angAt(e).a); });
    svg.addEventListener('pointerup', () => drag = null);
    mg && mg.addEventListener('keydown', e => { const k = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0; if (!k) return; e.preventDefault(); d.months.set((d.months.get() + k + NM) % NM); update(); });
    hand && hand.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && d.onCenter) { e.preventDefault(); d.onCenter(); lastKey = ''; update(); return; } const k = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0; if (!k) return; e.preventDefault(); d.day.set(((d.day.get() + k) % 24 + 24) % 24); update(); });
    dialObj = { update }; update(); return dialObj;
  }

  // ---- the loop
  const frameFns = [], flows = [];
  let visible = true, last = performance.now(), time = 0, frames = 0, slowAcc = 0, slowN = 0, raf = 0;
  try { new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(canvas); } catch (e) {}
  function render(dt) {
    if (!ok) return;
    if (tiltH) { const f = project(controls.target, {}); const fy = clamp(1 - f.y / H, 0.15, 0.85);
      const amt = tier.tilt ? (o.tilt == null ? 4.5 : o.tilt) * focusAmt : 0; [tiltH, tiltV].forEach(p => { p.uniforms.uFocus.value = fy; p.uniforms.uAmount.value = amt; p.uniforms.uBand.value = o.tiltBand || 0.17; });
      tiltV.uniforms.uVig.value = look.vig; tiltV.uniforms.uGrain.value = tierName === 'high' ? 0.012 : 0; tiltV.uniforms.uTime.value = (time % 10); }
    if (composer) composer.render(dt); else renderer.render(scene, camera);
  }
  function adapt(dt) { // step quality down if the device is struggling (never up, to avoid flicker)
    if (params.get('quality') || frames < 90 || tierName === 'low') return;
    slowAcc += dt; slowN++;
    if (slowN >= 90) { const avg = slowAcc / slowN; slowAcc = 0; slowN = 0;
      if (avg > (tierName === 'high' ? 0.026 : 0.04)) { setTier(tierName === 'high' ? 'mid' : 'low'); } }
  }
  function setTier(n) { tierName = n; tier = TIERS[n]; configShadow(); buildPost(); box.dataset.twTier = n; }
  function tick(dt) {
    time += dt; frames++;
    for (const f of frameFns) { try { f(dt, time); } catch (e) { console.error(e); } }
    stepMove(dt); stepFollow(dt); controls.update();
    flows.forEach(f => f.update(dt));
    if (rain) rain.update(dt, weather.rain, weather.wind);
    updateCards(dt); if (dialObj) dialObj.update(); sound.update(dt);
    render(dt); adapt(dt);
    window.__fps = frames / Math.max(0.001, time);
  }
  function frame(now) { raf = requestAnimationFrame(frame); const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (!visible || document.hidden) return; tick(dt); }

  // ---- no WebGL: show the poster still instead, keep the panels working
  if (!ok) { const img = document.createElement('img'); img.className = 'tw-poster-img'; img.alt = (canvas.getAttribute('aria-label') || '3D view') + ' (still image; this device could not start the 3D view)';
    img.src = `/assets/posters/${o.id || 'twin'}.webp`; canvas.replaceWith(img); }

  const stage = {
    THREE, ok, renderer, scene, camera, controls, root, M, geo, sun, hemi, clock, weather, look: () => look, dark: () => dark, extent,
    get tier() { return tierName; }, setTier, views: {}, pointScale: 300, project,
    add(obj, opt = {}) { obj.traverse(m => { if (m.isMesh) { m.castShadow = opt.cast !== false; m.receiveShadow = opt.receive !== false; } }); (opt.parent || root).add(obj); return obj; },
    mesh(g, mat, pos, opt = {}) { const m = new THREE.Mesh(g, mat); if (pos) m.position.set(...pos); if (opt.rot) m.rotation.set(...opt.rot); if (opt.scale) m.scale.set(...opt.scale); return stage.add(m, opt); },
    flow(opt) { const f = makeFlow(stage, opt); flows.push(f); return f; },
    ghost, ghostMaterial, compare, compareSet: (id, quiet) => compareApi.set(id, quiet), refreshExplore, pickable, pin, unpin, focusOn, flyTo, follow: followObj, tour, sound, dial,
    setPlace(pl) { const v = Array.isArray(pl) ? pl : PLACES[pl]; if (v) { place[0] = v[0]; place[1] = v[1]; setClock(clock.date); } },
    setClock, setWeather, lightNow, applyTheme, resize,
    setViews(v, sel = '[data-view]') { stage.views = v; document.querySelectorAll(sel).forEach(b => { b.addEventListener('click', () => { document.querySelectorAll(sel).forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); flyTo(v[b.dataset.view]); }); }); },
    onFrame(fn) { frameFns.push(fn); return stage; },
    start(view) { applyTheme(); resize(); buildPost(); if (view) flyTo(view, { instant: true }); if (!rain && ok) rain = makeRain(stage, tier.rain, extent * 1.2);
      box.dataset.twTier = tierName; last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); return stage; },
    advance(sec, step = 0.1) { for (let t = 0; t < sec; t += step) tick(step); },
    renderNow() { render(0); }
  };
  addEventListener('resize', () => { if (o.onResize) o.onResize(); else resize(); });
  return stage;
}
