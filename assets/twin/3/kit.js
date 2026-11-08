// assembl lab · twin kit v3: the shared base for the NVIDIA SimReady twins, pulled out of the grocery DC twin (store/dc/).
// Renderer and light (PBR, room environment, one soft key light, GTAO and bloom by tier), quality tiers with a one-step
// drop when a device can't hold about 24 fps, the meshopt GLB loader with a progress bar, instancing, draw-call baking,
// shadow stand-ins, plain hi-vis figures, the guided tour, 3D tags, path lines and the bottom bar's controls.
// A twin brings its own layout.js and sim.js (no rendering) and world.js (the scene), and wires them with this file.
// Overlays live in /assets/twin/3/overlay.css. The study machines and the v1/v2 stage twins don't use this.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
export { THREE, mergeGeometries };

export const KIT_VERSION = 3;
export const $ = s => document.querySelector(s);
export const params = new URLSearchParams(location.search);
export const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || params.get('motion') === 'reduce';
export const phone = matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 700;
if (params.has('clean')) document.documentElement.classList.add('clean'); // ?clean: no overlays, for stills

// ── quality tiers ────────────────────────────────────────────────────────────────────────────────────────────────
export const TIERS = {
  high: { dpr: 1.75, shadow: 2048, ao: true, bloom: true, msaa: 4 },
  mid: { dpr: 1.25, shadow: 1024, ao: false, bloom: true, msaa: 4 },
  low: { dpr: 1.0, shadow: 0, ao: false, bloom: false, msaa: 0 },
};
export const ORDER = ['low', 'mid', 'high'];

// ── renderer, camera, light ──────────────────────────────────────────────────────────────────────────────────────
// o: { canvas, stage, bg, fog:[near,far], cam:{pos,target,fov,near,far,min,max,polar}, sun:{pos,box:[l,r,t,b,near,far]},
//      exposure, env, clamp:{x:[a,b],z:[a,b],y:[a,b]}, onNoWebGL }
export function createViewer(o) {
  let tier = params.get('quality') in TIERS ? params.get('quality') : phone ? 'low' : 'mid';
  const fixedTier = params.has('quality');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: o.canvas, antialias: tier === 'low', powerPreference: 'high-performance', preserveDrawingBuffer: params.has('capture') });
    if (!renderer.capabilities.isWebGL2) throw new Error('WebGL2 needed');
  } catch (e) { (o.onNoWebGL || noWebGL)(); throw e; }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  if (!fixedTier && !phone) { // a discrete or high-end GPU starts at high; everything else stays at mid
    try { const gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info'); const name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '';
      if (/NVIDIA|GeForce|RTX|Radeon RX|Apple M\d (Pro|Max|Ultra)/i.test(name)) tier = 'high'; } catch (e) { /* keep mid */ }
  }
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = o.exposure ?? 1.12;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.info.autoReset = false;
  const scene = new THREE.Scene(), bg = o.bg ?? 0x150f15;
  scene.background = new THREE.Color(bg); if (o.fog) scene.fog = new THREE.Fog(bg, o.fog[0], o.fog[1]);
  const c = o.cam || {}, camera = new THREE.PerspectiveCamera(c.fov ?? 38, 1, c.near ?? 0.3, c.far ?? 900);
  camera.position.fromArray(c.pos || [60, 40, 60]);
  const controls = new OrbitControls(camera, o.canvas);
  controls.target.fromArray(c.target || [0, 0, 0]); controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.maxPolarAngle = c.polar ?? 1.47; controls.minDistance = c.min ?? 3.5; controls.maxDistance = c.max ?? 200; controls.screenSpacePanning = false;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = o.env ?? 0.65;
  const hemi = new THREE.HemisphereLight(0xf5f2ec, 0x7a746c, o.hemi ?? 1.05); scene.add(hemi);
  const s = o.sun || {}, sun = new THREE.DirectionalLight(0xfff3e2, s.intensity ?? 2.9);
  sun.position.fromArray(s.pos || [-16, 52, 14]); sun.target.position.fromArray(s.target || [0, 0, 0]); scene.add(sun, sun.target);
  const [l, r, t, b, n, f] = s.box || [-48, 48, 34, -34, 10, 120];
  Object.assign(sun.shadow.camera, { left: l, right: r, top: t, bottom: b, near: n, far: f });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.035;
  sun.shadow.camera.layers.enable(SHADOW_LAYER); // shadow-only stand-ins live on layer 1
  renderer.shadowMap.autoUpdate = false;

  let composer = null;
  const v = { renderer, scene, camera, controls, sun, hemi, get tier() { return tier; }, fps: 0, offset: o.offset ?? true };
  function applyTier() {
    const T = TIERS[tier];
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, T.dpr));
    sun.castShadow = T.shadow > 0;
    if (T.shadow && sun.shadow.mapSize.x !== T.shadow) { sun.shadow.mapSize.set(T.shadow, T.shadow); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
    if (composer) { composer.dispose(); composer = null; }
    if (T.ao || T.bloom) {
      const size = renderer.getDrawingBufferSize(new THREE.Vector2());
      const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: T.msaa });
      composer = new EffectComposer(renderer, rt); composer.addPass(new RenderPass(scene, camera));
      if (T.ao) {
        const g = new GTAOPass(scene, camera, size.x, size.y); g.output = GTAOPass.OUTPUT.Default; g.blendIntensity = 0.85;
        const ar = o.aoRadius ?? 0.55;
        g.updateGtaoMaterial({ radius: ar, distanceExponent: 1.4, thickness: ar * 2.2, scale: 1.0, samples: 12, distanceFallOff: 1.0 });
        g.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 }); composer.addPass(g);
      }
      // the threshold sits above lit white paint, so only things that give off light bloom
      if (T.bloom) composer.addPass(new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.35, 0.35, 2.4));
      composer.addPass(new OutputPass());
    }
    resize(); document.documentElement.dataset.tier = tier;
  }
  function resize() {
    const w = o.stage.clientWidth, h = o.stage.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < 700 ? (c.fovPhone ?? 48) : (c.fov ?? 38);
    // on wide screens the figures panel covers the right; shift the picture's centre left so the scene sits in the open
    const d = !v.offset || params.has('clean') ? 0 : w > 1180 ? 170 : w > 760 ? 150 : 0;
    if (d) { camera.aspect = (w + 2 * d) / h; camera.setViewOffset(w + 2 * d, h, 2 * d, 0, w, h); } else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); }
  }
  new ResizeObserver(resize).observe(o.stage);
  // keep the camera over the site and above the ground
  const cl = o.clamp;
  function keepIn() {
    if (cl) { const T = controls.target; if (cl.x) T.x = THREE.MathUtils.clamp(T.x, cl.x[0], cl.x[1]); if (cl.z) T.z = THREE.MathUtils.clamp(T.z, cl.z[0], cl.z[1]); if (cl.y) T.y = THREE.MathUtils.clamp(T.y, cl.y[0], cl.y[1]); }
    if (camera.position.y < (c.floor ?? 0.6)) camera.position.y = c.floor ?? 0.6;
  }
  let shadowTick = 0, frames = 0, fpsT = 0, since = 0, drops = 0, lastDrop = 0;
  function render(dt, raw = dt) {
    keepIn(); renderer.info.reset();
    if (sun.castShadow && (tier === 'high' || (shadowTick++ & 1) === 0)) renderer.shadowMap.needsUpdate = true; // mid: shadows every other frame
    if (composer) composer.render(dt); else renderer.render(scene, camera);
    v.calls = renderer.info.render.calls; v.tris = renderer.info.render.triangles;
    frames++; fpsT += raw; since += raw; // real elapsed time, not the clamped step
    if (fpsT >= 1) { v.fps = frames / fpsT; frames = 0; fpsT = 0; if (params.has('debug')) { const d = $('#debug'); if (d) d.textContent = `${v.fps.toFixed(0)} fps · ${tier} · ${v.calls} calls · ${(v.tris / 1e6).toFixed(2)}M tris`; } }
    if (!fixedTier && since > 5 && v.fps && v.fps < 24 && drops < 2 && ORDER.indexOf(tier) > 0 && since - lastDrop > 4) { tier = ORDER[ORDER.indexOf(tier) - 1]; drops++; lastDrop = since; applyTier(); }
  }
  Object.assign(v, { applyTier, resize, render });
  return v;
}

export function noWebGL() {
  document.documentElement.classList.add('no-webgl');
  const l = $('#loader'), f = $('#fallback'); if (l) l.hidden = true; if (f) f.hidden = false;
}

// ── loading: SimReady GLBs (meshopt) and textures, with one progress bar for all of them ─────────────────────────
// files: { key: { url, bytes } }, tex: { key: url }
export async function loadModels({ files, tex = {}, renderer, onProgress }) {
  const gl = new GLTFLoader(); gl.setMeshoptDecoder(MeshoptDecoder);
  const tl = new THREE.TextureLoader(), aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const total = Object.values(files).reduce((s, f) => s + f.bytes, 0), got = {};
  const tick = () => onProgress && onProgress(Object.values(got).reduce((s, b) => s + b, 0), total, Object.keys(files).length);
  const assets = {}, textures = {};
  tick();
  await Promise.all([
    ...Object.entries(files).map(([k, f]) => gl.loadAsync(f.url, e => { got[k] = e.loaded; tick(); }).then(g => {
      got[k] = f.bytes; tick();
      g.scene.traverse(o => { if (!o.isMesh) return; o.castShadow = o.receiveShadow = true;
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) { for (const t of ['map', 'normalMap', 'roughnessMap', 'metalnessMap']) if (m[t]) m[t].anisotropy = aniso;
          // glass with transmission makes three.js render the whole scene a second time; plain see-through glass is enough
          if (m.transmission > 0) { m.transmission = 0; m.transparent = true; m.opacity = Math.min(m.opacity, 0.35); m.depthWrite = false; } } });
      assets[k] = g.scene;
    })),
    ...Object.entries(tex).map(([k, url]) => tl.loadAsync(url).then(t => { t.colorSpace = /albedo/.test(k) ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso; textures[k] = t; })),
  ]);
  return { assets, tex: textures };
}
// the standard progress line under the loader bar
export function progressUI(done, total, n) {
  const f = Math.min(1, done / Math.max(1, total)), bar = $('#load-bar'); if (bar) bar.style.transform = `scaleX(${f})`;
  const p = $('#load-pct'); if (p) p.textContent = `${Math.round(f * 100)}%`;
  const t = $('#load-text'); if (t) t.textContent = `${(done / 1048576).toFixed(1)} of ${(total / 1048576).toFixed(1)} MB · ${n} NVIDIA SimReady models`;
}

// ── scene helpers ────────────────────────────────────────────────────────────────────────────────────────────────
export const std = o => new THREE.MeshStandardMaterial(o);
export function box(w, h, d, mat, x = 0, y = 0, z = 0, parent) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; if (parent) parent.add(m); return m; }
export function cyl(r, h, mat, x = 0, y = 0, z = 0, parent, seg = 32, rTop = r) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, r, h, seg), mat); m.position.set(x, y + h / 2, z); m.castShadow = m.receiveShadow = true; if (parent) parent.add(m); return m; }
export const M4 = (x, y, z, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sx, sy, sz));

// Merge a group's meshes into one mesh per material (fewer draw calls). deep=false takes only direct children.
export function bake(group, { deep = true, cast = false, receive = true, skip = null } = {}) {
  group.updateMatrixWorld(true);
  const inv = group.matrixWorld.clone().invert(), buckets = new Map(), gone = [];
  const visit = o => {
    if (o !== group && skip && skip(o)) return;
    if (o.isMesh && !o.isInstancedMesh && o !== group) {
      const g = o.geometry.clone();
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
      // meshopt GLBs carry quantised (normalised integer) attributes: expand them to plain floats before transforming and merging
      for (const k of Object.keys(g.attributes)) { const a = g.attributes[k]; if (a.normalized || a.isInterleavedBufferAttribute || !(a.array instanceof Float32Array)) {
        const f = new Float32Array(a.count * a.itemSize), get = ['getX', 'getY', 'getZ', 'getW'];
        for (let i = 0; i < a.count; i++) for (let c = 0; c < a.itemSize; c++) f[i * a.itemSize + c] = a[get[c]](i);
        g.setAttribute(k, new THREE.BufferAttribute(f, a.itemSize)); } }
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);
      if (!buckets.has(o.material)) buckets.set(o.material, []); buckets.get(o.material).push(g); gone.push(o);
    }
    if (deep || o === group) for (const c of [...o.children]) visit(c);
  };
  visit(group);
  for (const o of gone) o.parent.remove(o);
  for (const [mat, list] of buckets) { const m = new THREE.Mesh(mergeGeometries(list), mat); m.castShadow = cast; m.receiveShadow = receive; group.add(m); }
  return group;
}
// A shadow-only stand-in: every mesh under src merged into one position-only geometry on layer 1, which only the sun's
// shadow camera renders. A SimReady forklift then casts its shadow in one draw instead of thirty-six.
export const SHADOW_LAYER = 1; const shadowMat = new THREE.MeshBasicMaterial();
export function shadowProxy(src) {
  src.updateMatrixWorld(true); const inv = src.matrixWorld.clone().invert(), list = [], p = new THREE.Vector3();
  src.traverse(o => {
    if (!o.isMesh) return; const a = o.geometry.attributes.position, M = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    const pos = new Float32Array(a.count * 3); for (let i = 0; i < a.count; i++) { p.fromBufferAttribute(a, i).applyMatrix4(M); pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex(o.geometry.index ? Array.from(o.geometry.index.array) : [...Array(a.count).keys()]); list.push(g);
  });
  if (!list.length) return null;
  const m = new THREE.Mesh(mergeGeometries(list), shadowMat); m.castShadow = true; m.receiveShadow = false; m.layers.set(SHADOW_LAYER); m.frustumCulled = false;
  return m;
}
// A SimReady model placed once as a real object (with its own shadow stand-in when it moves), cast off from a loaded scene.
export function place(src, x, y, z, ry = 0, parent, { cast = true } = {}) {
  const g = src.clone(true); g.position.set(x, y, z); g.rotation.y = ry; g.traverse(o => { if (o.isMesh) { o.castShadow = cast; o.receiveShadow = true; } }); if (parent) parent.add(g); return g;
}
// An instanced copy of a GLB: one InstancedMesh per primitive, each carrying its local transform.
export class Instanced {
  constructor(src, cap, { cast = true, receive = true } = {}) {
    this.parts = []; this.cap = cap; this.n = 0;
    src.updateMatrixWorld(true);
    src.traverse(o => {
      if (!o.isMesh) return;
      const im = new THREE.InstancedMesh(o.geometry, o.material, cap);
      im.castShadow = cast; im.receiveShadow = receive; im.frustumCulled = false; im.count = 0;
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.parts.push({ im, local: o.matrixWorld.clone() });
    });
    this.m = new THREE.Matrix4();
  }
  addTo(parent) { for (const p of this.parts) parent.add(p.im); return this; }
  set(i, mat) { for (const p of this.parts) { this.m.multiplyMatrices(mat, p.local); p.im.setMatrixAt(i, this.m); } }
  commit(n) { this.n = n; for (const p of this.parts) { p.im.count = n; p.im.instanceMatrix.needsUpdate = true; } }
  set visible(v) { for (const p of this.parts) p.im.visible = v; }
}
// a plain mesh repeated by instancing (pallet loads, bags, markings): set(i, matrix) then commit(n)
export class Repeat {
  constructor(geo, mat, cap, { cast = true, receive = true } = {}) { this.im = new THREE.InstancedMesh(geo, mat, cap); this.im.castShadow = cast; this.im.receiveShadow = receive; this.im.frustumCulled = false; this.im.count = 0; this.im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.cap = cap; }
  addTo(p) { p.add(this.im); return this; }
  set(i, m) { if (i < this.cap) this.im.setMatrixAt(i, m); }
  commit(n) { this.im.count = Math.min(n, this.cap); this.im.instanceMatrix.needsUpdate = true; }
}
// vertical ribs of an insulated wall panel or cladding sheet, as a small normal map
export function ribTexture(ribs = 4) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 4; const g = c.getContext('2d');
  for (let x = 0; x < 64; x++) { const s = Math.sin(x / 64 * Math.PI * 2 * ribs); const r = 128 + s * 60; g.fillStyle = `rgb(${r | 0},128,255)`; g.fillRect(x, 0, 1, 4); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
// a word or two painted on the floor or a wall (bay numbers, zone names): a small canvas texture on a plane
export function label(text, { w = 4, h = 1, color = '#f2efe8', size = 64, weight = 600, bg = null } = {}) {
  const c = document.createElement('canvas'); c.width = Math.round(256 * w / h); c.height = 256; const g = c.getContext('2d');
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); }
  g.fillStyle = color; g.font = `${weight} ${size * 2}px "Instrument Sans", system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, c.width / 2, c.height / 2 + 6);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, transparent: !bg, roughness: 0.9, metalness: 0, depthWrite: !!bg }));
  return m;
}

// ── people: a plain figure, enough to read as a worker at site scale. Not a likeness of anyone. ──────────────────
// Body, legs and arms are each one vertex-coloured mesh, so a person costs five draws.
const SKIN = [0xc79f86, 0x9c6f55, 0xe0bfa6, 0x6e4c3a, 0xb98a6b];
const personMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.02 });
function tinted(geo, color, m) { const g = geo.clone(); if (m) g.applyMatrix4(m); const cc = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = cc.r; a[i * 3 + 1] = cc.g; a[i * 3 + 2] = cc.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k); return g; }
const PG = { torso: new THREE.CapsuleGeometry(0.17, 0.36, 4, 10), ring: new THREE.CylinderGeometry(0.192, 0.192, 0.05, 14, 1, true), head: new THREE.SphereGeometry(0.105, 14, 10),
  hair: new THREE.SphereGeometry(0.11, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), hips: new THREE.CapsuleGeometry(0.15, 0.08, 4, 10), leg: new THREE.CapsuleGeometry(0.068, 0.72, 3, 8),
  arm: new THREE.CapsuleGeometry(0.05, 0.52, 3, 8), boot: new THREE.BoxGeometry(0.11, 0.08, 0.24), hand: new THREE.SphereGeometry(0.045, 8, 6), cap: new THREE.SphereGeometry(0.118, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.42) };
export const OUTFIT = {
  hivis: { vest: 0xd8cf3c, band: 0xd9d9d9, shirt: 0x3b4149, trouser: 0x2b2f36 },
  hivisOrange: { vest: 0xe07a2a, band: 0xd9d9d9, shirt: 0x3b4149, trouser: 0x2b2f36 },
  whites: { vest: 0xf1f0ec, band: 0xe9e7e2, shirt: 0xf1f0ec, trouser: 0xe6e4df, cap: 0xf4f4f2 },   // food-plant whites, hair cover
  scrubs: { vest: 0x3f6f8a, band: 0x3f6f8a, shirt: 0x3f6f8a, trouser: 0x355f77 },
  scrubsGreen: { vest: 0x4d7f6c, band: 0x4d7f6c, shirt: 0x4d7f6c, trouser: 0x44705f },
  plain: { vest: 0x6b5b6e, band: 0x6b5b6e, shirt: 0x5b4f5f, trouser: 0x343842 },
};
export function makePerson(i, outfit = OUTFIT.hivis) {
  const o = typeof outfit === 'number' ? { ...OUTFIT.hivis, vest: outfit } : outfit;
  const g = new THREE.Group(); g.name = 'person';
  const skin = SKIN[i % SKIN.length];
  const body = new THREE.Mesh(mergeGeometries([
    tinted(PG.torso, o.vest, M4(0, 1.2, 0, 1.12, 1, 0.72)), tinted(PG.ring, o.band, M4(0, 1.08, 0, 1.12, 1, 0.72)),
    tinted(PG.head, skin, M4(0, 1.62, 0)), o.cap ? tinted(PG.cap, o.cap, M4(0, 1.64, 0)) : tinted(PG.hair, [0x241c18, 0x5a3d2b, 0x1b1714][i % 3], M4(0, 1.635, 0)),
    tinted(PG.hips, o.trouser, M4(0, 0.92, 0, 1.15, 1, 0.75)),
  ]), personMat);
  body.castShadow = true; g.add(body);
  const legGeo = mergeGeometries([tinted(PG.leg, o.trouser, M4(0, -0.428, 0)), tinted(PG.boot, 0x1a1a1a, M4(0, -0.86, 0.04))]);
  const armGeo = mergeGeometries([tinted(PG.arm, o.shirt, M4(0, -0.31, 0)), tinted(PG.hand, skin, M4(0, -0.62, 0))]);
  const limb = (geo, x, y) => { const pivot = new THREE.Group(); pivot.position.set(x, y, 0); const m = new THREE.Mesh(geo, personMat); m.castShadow = true; pivot.add(m); g.add(pivot); return pivot; };
  const legL = limb(legGeo, -0.09, 0.9), legR = limb(legGeo, 0.09, 0.9), armL = limb(armGeo, -0.235, 1.43), armR = limb(armGeo, 0.235, 1.43);
  g.userData = { legL, legR, armL, armR, phase: (i * 1.7) % 6 };
  return g;
}
export function animatePerson(p, moving, dt, speed = 1.2, pose = 'walk') {
  const u = p.userData;
  if (pose === 'seated') { u.legL.rotation.x = u.legR.rotation.x = -1.45; u.armL.rotation.x = u.armR.rotation.x = -0.6; return; }
  if (pose === 'push') { u.armL.rotation.x = u.armR.rotation.x = -1.05; }
  if (moving) u.phase += dt * speed * 5.2;
  const s = moving ? Math.sin(u.phase) : 0;
  u.legL.rotation.x = s * 0.55; u.legR.rotation.x = -s * 0.55;
  if (pose === 'walk') { u.armL.rotation.x = -s * 0.45; u.armR.rotation.x = s * 0.45; }
  if (pose === 'work') { const w = Math.sin(performance.now() / 380 + u.phase) * 0.35; u.armL.rotation.x = -0.9 + w; u.armR.rotation.x = -0.75 - w; }
  if (pose === 'carry') { u.armL.rotation.x = u.armR.rotation.x = -0.95; }
  if (pose === 'stand') { u.armL.rotation.x = u.armR.rotation.x = 0; }
}

// ── tour: each stop is a camera position and target, or something to follow; one plain caption each ─────────────
// stops: [{ id, title, text, pos, target } | { ..., follow: key, off: [x,y,z] }], follow(key) → { x, y, z } or null
export const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export function createTour({ stops, viewer, follow, dwell = 11, followDwell = 13, onGo }) {
  const { camera, controls } = viewer, t0 = { pos: new THREE.Vector3(), target: new THREE.Vector3() };
  const T = { on: !reduce, i: 0, t: 0, fly: null, chosen: null, stops };
  function view(s, out = t0) {
    const f = s.follow ? follow(s.follow) : null;
    if (f) { out.target.set(f.x, f.y ?? 1, f.z); const off = f.off || s.off || [6, 4, 6]; out.pos.set(f.x + off[0], (f.y ?? 1) + off[1], f.z + off[2]); }
    else { out.pos.fromArray(s.pos); out.target.fromArray(s.target); }
    if (camera.aspect < 1) out.pos.sub(out.target).multiplyScalar(Math.min(1.7, 1.05 / camera.aspect)).add(out.target); // portrait: stand back
    return out;
  }
  function go(i, instant = reduce) {
    T.i = (i + stops.length) % stops.length; T.t = 0; const s = stops[T.i];
    try { s.do && s.do(); } catch (e) { console.warn('tour stop', e); }
    T.fly = instant ? null : { from: camera.position.clone(), fromT: controls.target.clone(), t: 0, dur: 2.8 };
    if (instant) { const v = view(s); camera.position.copy(v.pos); controls.target.copy(v.target); if (T.chosen != null && !s.follow) T.chosen = null; }
    const st = $('#tour-step'); if (st) st.textContent = `Tour · ${T.i + 1} of ${stops.length}`;
    $('#tour-title').textContent = s.title; $('#tour-text').textContent = typeof s.text === 'function' ? s.text() : s.text;
    document.querySelectorAll('.tag[data-stop]').forEach(t => t.classList.toggle('on', +t.dataset.stop === T.i));
    onGo && onGo(T.i, s);
  }
  function set(on) {
    T.on = on; const b = $('#tour-play'); b.setAttribute('aria-pressed', String(on));
    b.innerHTML = on ? ICON.pause + '<span>Pause tour</span>' : ICON.play + '<span>Play tour</span>'; b.setAttribute('aria-label', on ? 'Pause tour' : 'Play tour');
    $('#tour').classList.toggle('paused', !on); if (on) go(T.i);
  }
  controls.addEventListener('start', () => { T.chosen = null; T.fly = null; if (T.on) set(false); });
  const fv = { pos: new THREE.Vector3(), target: new THREE.Vector3() };
  function update(dt) { // call once a frame before controls.update()
    const s = stops[T.i], cur = T.chosen != null ? stops[T.chosen] : s;
    if (!T.on && T.chosen == null) return;
    view(cur, fv);
    if (T.fly) {
      T.fly.t += dt; const f = ease(Math.min(1, T.fly.t / T.fly.dur));
      camera.position.lerpVectors(T.fly.from, fv.pos, f); controls.target.lerpVectors(T.fly.fromT, fv.target, f);
      if (T.fly.t >= T.fly.dur) { T.fly = null; if (T.chosen != null && !stops[T.chosen].follow) T.chosen = null; }
    } else if (cur.follow) { camera.position.lerp(fv.pos, Math.min(1, dt * 2.2)); controls.target.lerp(fv.target, Math.min(1, dt * 3)); }
    else if (!reduce && T.on) { const a = dt * 0.025, ox = camera.position.x - controls.target.x, oz = camera.position.z - controls.target.z;
      camera.position.x = controls.target.x + ox * Math.cos(a) - oz * Math.sin(a); camera.position.z = controls.target.z + ox * Math.sin(a) + oz * Math.cos(a); }
    if (T.on && !T.fly) { T.t += dt; if (!reduce && T.t > (s.follow ? followDwell : dwell)) go(T.i + 1); }
  }
  // the stop being followed right now (for a focus ring), or null
  const following = () => { const s = T.chosen != null ? stops[T.chosen] : stops[T.i]; return (T.on || T.chosen != null) && s.follow ? s.follow : null; };
  Object.assign(T, { go, set, update, view, following, choose(i) { set(false); T.chosen = i; go(i); } });
  return T;
}

// ── 3D tags: buttons pinned to places in the scene; tapping one flies the camera there ───────────────────────────
// defs: [{ text, sub, pos:[x,y,z], stop (tour index or null), quiet, near (only show within this camera distance) }]
export function createTags(container, defs, onPick) {
  const v3 = new THREE.Vector3();
  const els = defs.map(t => {
    const el = document.createElement(t.stop == null ? 'div' : 'button');
    el.className = 'tag' + (t.quiet ? ' quiet' : '') + (t.cls ? ' ' + t.cls : '');
    if (t.stop != null) { el.dataset.stop = t.stop; el.type = 'button'; el.addEventListener('click', () => onPick && onPick(t.stop)); }
    el.innerHTML = `<b>${t.text}</b>${t.sub ? `<span>${t.sub}</span>` : ''}`; container.append(el); return el;
  });
  function place(camera, w, h, show = true, dist = 0) {
    defs.forEach((t, i) => {
      const el = els[i]; if (t.near && dist > t.near) { el.style.visibility = 'hidden'; return; }
      v3.fromArray(typeof t.pos === 'function' ? t.pos() : t.pos).project(camera);
      const vis = show && !t.hidden && v3.z < 1 && Math.abs(v3.x) < 1.05 && Math.abs(v3.y) < 1.05;
      el.style.visibility = vis ? 'visible' : 'hidden';
      if (vis) el.style.transform = `translate(${((v3.x + 1) / 2 * w).toFixed(1)}px, ${((1 - v3.y) / 2 * h).toFixed(1)}px) translate(-50%, -100%)`;
    });
  }
  function setText(i, text, sub) { const el = els[i], html = `<b>${text}</b>${sub ? `<span>${sub}</span>` : ''}`; if (el._h !== html) { el._h = html; el.innerHTML = html; } }
  return { els, place, setText, defs };
}

// ── path lines (people rose, vehicles ivory) and the focus ring under whatever the tour follows ──────────────────
export const ROSE = new THREE.Color(0xd9bacb), IVORY = new THREE.Color(0xf9f6f2);
export function createPaths(scene, cap = 6000) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(cap * 6), 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(cap * 6), 3).setUsage(THREE.DynamicDrawUsage));
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false }));
  lines.frustumCulled = false; lines.renderOrder = 5; scene.add(lines);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.12, 48), new THREE.MeshBasicMaterial({ color: 0xd9bacb, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04; ring.renderOrder = 6; ring.visible = false; scene.add(ring);
  // list: [{ pts: [{x,z}], vehicle: bool, y }]
  function update(list, show = true) {
    lines.visible = show; if (!show) return;
    const pos = geo.attributes.position.array, col = geo.attributes.color.array; let n = 0;
    for (const p of list) { const c = p.vehicle ? IVORY : ROSE, y = p.y ?? 0.05;
      for (let i = 1; i < p.pts.length && n < cap; i++, n++) { pos.set([p.pts[i - 1].x, y, p.pts[i - 1].z, p.pts[i].x, y, p.pts[i].z], n * 6); col.set([c.r, c.g, c.b, c.r, c.g, c.b], n * 6); } }
    geo.setDrawRange(0, n * 2); geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
  }
  return { lines, ring, update, focus(p, r = 1) { ring.visible = !!p; if (p) { ring.position.x = p.x; ring.position.z = p.z; ring.scale.setScalar(r); } } };
}

// ── the bottom bar: tour back, play and next, model speed, run or pause the model, the phone figures sheet ───────
export const ICON = {
  play: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4.5v11l9-5.5z"/></svg>',
  pause: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5.5 4.5h3v11h-3zM11.5 4.5h3v11h-3z"/></svg>',
  modelPause: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M7.5 6.5h1.8v7H7.5zM10.7 6.5h1.8v7h-1.8z"/></svg>',
  modelPlay: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8.2 6.3v7.4l5.6-3.7z"/></svg>',
};
// state: { speed, running }; onChange(state) after any change
export function wireBar(tour, state, onChange = () => {}) {
  const step = d => { const i = (tour.i + d + tour.stops.length) % tour.stops.length; tour.chosen = tour.on ? null : i; tour.go(i); };
  $('#tour-prev').addEventListener('click', () => step(-1));
  $('#tour-next').addEventListener('click', () => step(1));
  $('#tour-play').addEventListener('click', () => { tour.chosen = null; tour.set(!tour.on); });
  document.querySelectorAll('[name="speed"]').forEach(r => { if (+r.value === state.speed) r.checked = true; r.addEventListener('change', () => { state.speed = +r.value; onChange(state); }); });
  const run = $('#sim-run');
  const sync = () => {
    run.setAttribute('aria-pressed', String(state.running));
    run.innerHTML = state.running ? ICON.modelPause + '<span>Pause model</span>' : ICON.modelPlay + '<span>Run model</span>'; run.setAttribute('aria-label', state.running ? 'Pause model' : 'Run model');
    document.documentElement.classList.toggle('sim-paused', !state.running);
  };
  run.addEventListener('click', () => { state.running = !state.running; sync(); onChange(state); });
  const pt = $('#panel-toggle');
  if (pt) pt.addEventListener('click', () => { const open = $('#panel').classList.toggle('open'); pt.setAttribute('aria-expanded', String(open)); pt.querySelector('span').textContent = open ? 'Hide figures' : 'All figures'; });
  addEventListener('keydown', e => {
    if (e.target.closest('input, button, summary, a, select')) return;
    if (e.key === 'ArrowRight') $('#tour-next').click(); else if (e.key === 'ArrowLeft') $('#tour-prev').click(); else if (e.key === ' ') { e.preventDefault(); tour.set(!tour.on); }
  });
  sync(); return { sync };
}
// write a figure only when it changes (the panel refreshes four times a second)
export function setK(k, v) { const el = document.querySelector(`[data-k="${k}"]`); if (el && el.textContent !== String(v)) el.textContent = v; }
export const pct = x => `${Math.round(x * 100)}%`, num = (x, d = 0) => Number(x).toLocaleString('en-NZ', { maximumFractionDigits: d, minimumFractionDigits: d });
