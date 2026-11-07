// Grocery DC twin: renderer, loading, quality tiers, the guided tour, overlays and the frame loop.
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
import * as L from './layout.js';
import { Sim, ASSUME } from './sim.js';
import { World, ASSET_FILES, TEX_FILES } from './world.js';

const $ = s => document.querySelector(s);
const params = new URLSearchParams(location.search);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || params.get('motion') === 'reduce';
const phone = matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 700;
const TIERS = {
  high: { dpr: 1.75, shadow: 2048, ao: true, bloom: true, msaa: 4 },
  mid: { dpr: 1.25, shadow: 1024, ao: false, bloom: true, msaa: 4 },
  low: { dpr: 1.0, shadow: 0, ao: false, bloom: false, msaa: 0 },
};
const ORDER = ['low', 'mid', 'high'];
let tier = params.get('quality') in TIERS ? params.get('quality') : phone ? 'low' : 'mid'; // desktops start at mid; a strong GPU starts at high (below)
const fixedTier = params.has('quality');
if (params.has('clean')) document.documentElement.classList.add('clean'); // ?clean: no overlays, for stills

// ── renderer ─────────────────────────────────────────────────────────────────────────────────────────────────────
const canvas = $('#c'), stage = $('#stage');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: tier === 'low', powerPreference: 'high-performance', preserveDrawingBuffer: params.has('capture') });
  if (!renderer.capabilities.isWebGL2) throw new Error('WebGL2 needed');
} catch (e) { noWebGL(); throw e; }
renderer.outputColorSpace = THREE.SRGBColorSpace;
if (!params.has('quality') && !phone) { // a discrete or high-end GPU starts at high; everything else stays at mid
  try { const gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info'); const name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '';
    if (/NVIDIA|GeForce|RTX|Radeon RX|Apple M\d (Pro|Max|Ultra)/i.test(name)) tier = 'high'; } catch (e) { /* keep mid */ }
}
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.info.autoReset = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x150f15);
scene.fog = new THREE.Fog(0x150f15, 110, 300);
const camera = new THREE.PerspectiveCamera(38, 1, 0.3, 700);
camera.position.set(75.5, 45, 42);
const controls = new OrbitControls(camera, canvas);
controls.target.set(-2, 0, 0); controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.maxPolarAngle = 1.47; controls.minDistance = 3.5; controls.maxDistance = 150; controls.screenSpacePanning = false;

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.65;
const hemi = new THREE.HemisphereLight(0xf5f2ec, 0x7a746c, 1.05); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff3e2, 2.9); sun.position.set(-16, 52, 14); sun.target.position.set(0, 0, 0); scene.add(sun, sun.target);
Object.assign(sun.shadow.camera, { left: -48, right: 48, top: 34, bottom: -34, near: 10, far: 120 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.035;
sun.shadow.camera.layers.enable(1); // shadow-only stand-ins for the SimReady vehicles live on layer 1
renderer.shadowMap.autoUpdate = false; let shadowTick = 0;

let composer = null, gtao = null, bloom = null;
function applyTier() {
  const T = TIERS[tier];
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, T.dpr));
  sun.castShadow = T.shadow > 0;
  if (T.shadow && sun.shadow.mapSize.x !== T.shadow) { sun.shadow.mapSize.set(T.shadow, T.shadow); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  if (composer) { composer.dispose(); composer = null; }
  if (T.ao || T.bloom) {
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: T.msaa });
    composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, camera));
    if (T.ao) {
      gtao = new GTAOPass(scene, camera, size.x, size.y);
      gtao.output = GTAOPass.OUTPUT.Default; gtao.blendIntensity = 0.85;
      gtao.updateGtaoMaterial({ radius: 0.55, distanceExponent: 1.4, thickness: 1.2, scale: 1.0, samples: 12, distanceFallOff: 1.0 });
      gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
      composer.addPass(gtao);
    }
    if (T.bloom) { bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.35, 0.35, 2.4); composer.addPass(bloom); } // threshold above lit white paint: only emitters bloom
    composer.addPass(new OutputPass());
  }
  resize();
  document.documentElement.dataset.tier = tier;
}
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < 700 ? 48 : 38;
  // on wide screens the figures panel covers the right; shift the picture's centre left so the scene sits in the open
  const d = params.has('clean') ? 0 : w > 1180 ? 170 : w > 760 ? 150 : 0;
  if (d) { camera.aspect = (w + 2 * d) / h; camera.setViewOffset(w + 2 * d, h, 2 * d, 0, w, h); } else camera.clearViewOffset();
  camera.updateProjectionMatrix();
  if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); }
}
new ResizeObserver(resize).observe(stage);

// ── loading ──────────────────────────────────────────────────────────────────────────────────────────────────────
const total = Object.values(ASSET_FILES).reduce((s, b) => s + b, 0);
const got = {}; const bar = $('#load-bar'), loadText = $('#load-text');
function progress() {
  const done = Object.values(got).reduce((s, b) => s + b, 0), f = Math.min(1, done / total);
  bar.style.transform = `scaleX(${f})`; $('#load-pct').textContent = `${Math.round(f * 100)}%`;
  loadText.textContent = `${(done / 1048576).toFixed(1)} of ${(total / 1048576).toFixed(1)} MB · ${Object.keys(ASSET_FILES).length} NVIDIA SimReady models`;
}
async function loadAll() {
  const gl = new GLTFLoader(); gl.setMeshoptDecoder(MeshoptDecoder);
  const tl = new THREE.TextureLoader();
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const assets = {}, tex = {};
  await Promise.all([
    ...Object.keys(ASSET_FILES).map(k => gl.loadAsync(`/assets/models/simready/${k}.glb`, e => { got[k] = e.loaded; progress(); }).then(g => {
      got[k] = ASSET_FILES[k]; progress();
      g.scene.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) { for (const t of ['map', 'normalMap', 'roughnessMap', 'metalnessMap']) if (m[t]) m[t].anisotropy = aniso;
        // glass with transmission makes three.js render the whole scene a second time; plain see-through glass is enough here
        if (m.transmission > 0) { m.transmission = 0; m.transparent = true; m.opacity = Math.min(m.opacity, 0.35); m.depthWrite = false; } } } });
      assets[k] = g.scene;
    })),
    ...TEX_FILES.map(k => tl.loadAsync(`/assets/models/simready/tex/${k}.webp`).then(t => { t.colorSpace = /albedo/.test(k) ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso; tex[k] = t; })),
  ]);
  return { assets, tex };
}

// ── tour ─────────────────────────────────────────────────────────────────────────────────────────────────────────
// Each stop is a camera position and target (or an agent to follow), with one plain caption.
const STOPS = [
  { id: 'overview', title: 'The whole building', pos: [75.5, 45, 42], target: [8, 0, 1],
    text: 'A fictional ambient grocery DC in South Auckland, about 72 by 40 metres, running a simulated morning shift. Trucks dock at the front; stock is stored in the racking at the back, picked, wrapped and sent out again.' },
  { id: 'inbound', title: 'Inbound', pos: [14, 8.5, -1.5], target: [30, 0.6, -13.5],
    text: 'Supplier trucks back onto doors 1 and 2. A forklift unloads each pallet into a staging lane, and the receiver checks it against the delivery before it can be stored.' },
  { id: 'putaway', title: 'Putaway and let-down', follow: { kind: 'orderPicker', n: 0 }, off: [5.5, 4.2, 6.5],
    text: 'Two order pickers lift checked pallets into reserve, up to 5.4 m high, and let a full pallet down to the pick face whenever a face falls to 10 cartons.' },
  { id: 'picking', title: 'Picking', follow: { kind: 'picker', n: 0 }, off: [4.2, 3.6, 5.2],
    text: 'Four pickers build store pallets with hand pallet jacks, one aisle per order, carton by carton. Their walking and picking set the pace of the whole building.' },
  { id: 'totes', title: 'Totes', pos: [-13.5, 5.2, 16.5], target: [-19.5, 0.8, 7.8],
    text: 'Small items are picked into totes at row G and ride a SimReady roller conveyor to the tote station, where they are stacked thirty to a pallet.' },
  { id: 'wrap', title: 'Wrap and label', pos: [-1.5, 7.5, 25.5], target: [8.5, 0.6, 13.2],
    text: 'Finished pallets queue for two turntable wrappers, then get a printed label before a forklift takes them to their store’s lane.' },
  { id: 'dispatch', title: 'Dispatch', pos: [18.5, 10.5, 25], target: [31, 0.6, 5],
    text: 'Each store route has a 12-pallet lane in front of its door. A second forklift loads the truck, and the truck leaves for the stores when it is full.' },
  { id: 'numbers', title: 'Every number is simulated', pos: [-44, 40, 52], target: [2, 0, 0],
    text: 'The panel’s figures come from this page’s model as it runs: walk speeds, lift speeds and handling times you can read under How this model works. None of it is a real site’s data.' },
];
const tour = { on: !reduce, i: 0, t: 0, fly: null, user: false };
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
function stopView(s, out = { pos: new THREE.Vector3(), target: new THREE.Vector3() }) {
  if (s.follow && world) {
    const v = world.views.filter(x => x.a.kind === s.follow.kind)[s.follow.n];
    out.target.set(v.g.position.x, 1.0 + (v.a.pose.lift || 0) * 0.55, v.g.position.z);
    // in the racking, look along the aisle from its open end instead of through the racks
    const inRacks = v.g.position.x < L.AISLE_ENTRY_X + 0.5 && v.g.position.z < L.AISLES[3] - 1;
    const off = inRacks ? [6.8, 3.0 + (v.a.pose.lift || 0) * 0.4, 0] : s.off;
    out.pos.set(out.target.x + off[0], out.target.y + off[1], out.target.z + off[2]);
  } else { out.pos.fromArray(s.pos); out.target.fromArray(s.target); }
  if (camera.aspect < 1) out.pos.sub(out.target).multiplyScalar(Math.min(1.7, 1.05 / camera.aspect)).add(out.target); // portrait: stand back
  return out;
}
function goStop(i, instant = reduce) {
  tour.i = (i + STOPS.length) % STOPS.length; tour.t = 0;
  const s = STOPS[tour.i];
  tour.fly = instant ? null : { from: camera.position.clone(), fromT: controls.target.clone(), t: 0, dur: 2.8 };
  if (instant) { const v = stopView(s); camera.position.copy(v.pos); controls.target.copy(v.target); if (followStop != null && !s.follow) followStop = null; }
  $('#tour-step').textContent = `Tour · ${tour.i + 1} of ${STOPS.length}`;
  $('#tour-title').textContent = s.title; $('#tour-text').textContent = s.text;
  document.querySelectorAll('.tag[data-stop]').forEach(t => t.classList.toggle('on', +t.dataset.stop === tour.i));
}
function setTour(on) {
  tour.on = on; $('#tour-play').setAttribute('aria-pressed', String(on));
  $('#tour-play').innerHTML = on ? ICON.pause + '<span>Pause tour</span>' : ICON.play + '<span>Play tour</span>'; $('#tour-play').setAttribute('aria-label', on ? 'Pause tour' : 'Play tour');
  $('#tour').classList.toggle('paused', !on);
  if (on) goStop(tour.i);
}
controls.addEventListener('start', () => { followStop = null; tour.fly = null; if (tour.on) setTour(false); tour.user = true; });

// ── overlays: 3D tags, path lines, focus ring ────────────────────────────────────────────────────────────────────
const TAGS = [
  { text: 'Inbound', sub: 'Doors 1–2 · staging · receiving', pos: [27, 3.4, -13], stop: 1 },
  { text: 'Reserve and pick faces', sub: '7 rows · 504 pallet positions', pos: [-20, 7.0, -7.4], stop: 2 },
  { text: 'Pick aisles', sub: 'Hand pallet jacks', pos: [-14, 2.8, -4.3], stop: 3 },
  { text: 'Tote line', sub: 'SimReady roller conveyor', pos: [-21, 2.1, 8.6], stop: 4 },
  { text: 'Wrap and label', sub: 'Two turntable wrappers', pos: [8, 3.5, 13.4], stop: 5 },
  { text: 'Dispatch', sub: 'Doors 3–6 · store lanes', pos: [26, 3.2, 7], stop: 6 },
  { text: 'Block stack', sub: 'Not simulated', pos: [8, 3.0, -13], stop: null, quiet: true },
];
const tagEls = TAGS.map((t, i) => {
  const el = document.createElement(t.stop == null ? 'div' : 'button');
  el.className = 'tag' + (t.quiet ? ' quiet' : ''); if (t.stop != null) { el.dataset.stop = t.stop; el.type = 'button'; el.addEventListener('click', () => { setTour(false); followStop = t.stop; goStop(t.stop); }); }
  el.innerHTML = `<b>${t.text}</b><span>${t.sub}</span>`; $('#tags').append(el); return el;
});
const doorTags = [];
let followStop = null; // a stop the visitor chose from a tag: keep following it until they move the camera
const v3 = new THREE.Vector3();
function placeTags() {
  const w = stage.clientWidth, h = stage.clientHeight, show = $('#t-labels').checked;
  const project = (p, el) => {
    v3.fromArray(p).project(camera);
    const vis = show && v3.z < 1 && Math.abs(v3.x) < 1.05 && Math.abs(v3.y) < 1.05;
    el.style.visibility = vis ? 'visible' : 'hidden';
    if (vis) el.style.transform = `translate(${((v3.x + 1) / 2 * w).toFixed(1)}px, ${((1 - v3.y) / 2 * h).toFixed(1)}px) translate(-50%, -100%)`;
  };
  TAGS.forEach((t, i) => project(t.pos, tagEls[i]));
  const near = camera.position.distanceTo(controls.target) < 46;
  doorTags.forEach(d => { if (!near) { d.el.style.visibility = 'hidden'; return; } project(d.pos, d.el); });
}

let world, sim, pathLines, ring;
const PATH_CAP = 6000;
function buildOverlays() {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PATH_CAP * 6), 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(PATH_CAP * 6), 3).setUsage(THREE.DynamicDrawUsage));
  pathLines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false }));
  pathLines.frustumCulled = false; pathLines.renderOrder = 5; scene.add(pathLines);
  ring = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.12, 48), new THREE.MeshBasicMaterial({ color: 0xd9bacb, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; ring.renderOrder = 6; scene.add(ring);
  // door tags
  [...L.INBOUND_DOORS.map((d, i) => ({ id: d.id, z: d.z, k: 'in', i })), ...L.ROUTES.map((r, i) => ({ id: r.door, z: r.z, k: 'out', i, name: r.name }))].forEach(d => {
    const el = document.createElement('div'); el.className = 'tag door'; $('#tags').append(el); doorTags.push({ ...d, el, pos: [L.DOOR_X - 0.6, 4.3, d.z] });
  });
}
const ROSE = new THREE.Color(0xd9bacb), IVORY = new THREE.Color(0xf9f6f2);
function updatePaths() {
  const show = $('#t-paths').checked; pathLines.visible = show; if (!show) return;
  const pos = pathLines.geometry.attributes.position.array, col = pathLines.geometry.attributes.color.array; let n = 0;
  for (const a of sim.agents) {
    if (!a.path || a.job === 'idle' || a.job === 'wait') continue;
    const pts = a.path.remaining(sim.t - a.t0); if (pts.length < 2) continue;
    const c = (a.kind === 'forklift' || a.kind === 'orderPicker') ? IVORY : ROSE;
    for (let i = 1; i < pts.length && n < PATH_CAP; i++, n++) {
      pos.set([pts[i - 1].x, 0.05, pts[i - 1].z, pts[i].x, 0.05, pts[i].z], n * 6);
      col.set([c.r, c.g, c.b, c.r, c.g, c.b], n * 6);
    }
  }
  pathLines.geometry.setDrawRange(0, n * 2); pathLines.geometry.attributes.position.needsUpdate = true; pathLines.geometry.attributes.color.needsUpdate = true;
}

// ── panel ────────────────────────────────────────────────────────────────────────────────────────────────────────
const pct = x => `${Math.round(x * 100)}%`, num = x => x.toLocaleString('en-NZ');
const STATE = { arriving: 'Arriving', opening: 'Door opening', loading: 'Loading', unloading: 'Unloading', closing: 'Door closing', leaving: 'Leaving', away: 'On the road', docked: 'Docked' };
function updatePanel() {
  const m = sim.metrics(); const set = (k, v) => { const el = document.querySelector(`[data-k="${k}"]`); if (el && el.textContent !== String(v)) el.textContent = v; };
  set('clock', m.clock); set('speed', `${speed}×`);
  set('trucksIn', num(m.trucksIn)); set('received', num(m.received)); set('toCheck', num(m.toCheck)); set('toPut', num(m.toPut + m.noSpace));
  set('reserve', pct(m.reserve)); set('facesLow', `${m.facesLow} of ${m.faces}`); set('replens', num(m.replens)); set('putaways', num(m.putaways));
  set('cph', m.elapsed < 300 ? 'warming up' : num(m.cartonsPerHour)); set('cartons', num(m.cartons)); set('storePallets', num(m.storePallets)); set('totes', num(m.totes)); set('shorts', num(m.shorts));
  set('queue', num(m.queue)); set('wrapUtil', pct(m.wrapUtil)); set('wrapped', num(m.wrapped));
  set('loaded', num(m.loaded)); set('trucksOut', num(m.trucksOut));
  set('uPick', pct(m.utilPickers)); set('uFork', pct(m.utilForklifts)); set('uOP', pct(m.utilOrderPickers));
  const doors = $('#doors');
  m.doors.forEach((d, i) => {
    let row = doors.children[i];
    if (!row) { row = document.createElement('li'); row.innerHTML = '<span class="d-n"></span><span class="d-l"></span><span class="d-bar"><i></i></span><span class="d-s"></span>'; doors.append(row); }
    row.querySelector('.d-n').textContent = d.door; row.querySelector('.d-l').textContent = d.label;
    const f = d.state === 'away' ? 0 : d.n / d.cap; row.querySelector('i').style.transform = `scaleX(${f})`;
    const txt = d.kind === 'in' ? (d.state === 'unloading' ? `${d.n} left to unload` : STATE[d.state]) : (d.state === 'loading' ? `${d.n} of ${d.cap} loaded` : d.state === 'away' ? `${d.lane} waiting in lane` : STATE[d.state]);
    row.querySelector('.d-s').textContent = txt; row.dataset.state = d.state;
    const tag = doorTags[i]; if (tag) tag.el.innerHTML = `<b>Door ${d.door} · ${d.label}</b><span>${txt}</span>`;
  });
  const ev = sim.events[0]; set('event', ev ? `${sim.clock(ev.t)} · ${ev.text}` : 'The shift has just started');
  // mobile summary
  set('m-clock', m.clock);
}
function fillAssumptions() {
  const rows = [
    ['Walking', `${ASSUME.walk} m/s; ${ASSUME.walkJack} m/s with a loaded pallet jack`],
    ['Picking', `${ASSUME.faceStop} s a pick face plus ${ASSUME.perCarton} s a carton; ${ASSUME.linesMin}–${ASSUME.linesMax} faces an order, ${ASSUME.cartonsMin}–${ASSUME.cartonsMax} cartons a face`],
    ['Forklifts', `${ASSUME.forklift} m/s, forks ${ASSUME.liftRate} m/s, ${ASSUME.handle} s to engage or release`],
    ['Order pickers', `${ASSUME.orderPicker} m/s; let-down when a face falls to ${ASSUME.reorder} cartons`],
    ['Wrap and label', `${ASSUME.wrapCycle} s to wrap, ${ASSUME.labelTime} s to label`],
    ['Receiving', `${ASSUME.scanTime} s to check a pallet; a supplier truck every ${ASSUME.inboundGap / 60} min a door`],
    ['Totes', `${ASSUME.toteFill} s to fill, ${ASSUME.cartonsPerTote} cartons a tote, ${L.TOTES_PER_PALLET} totes a pallet, conveyor ${L.TOTE_LINE.speed} m/s`],
    ['Trucks', `12 pallets each; ${ASSUME.truckGap / 60} min until the next truck for a route; ${ASSUME.dockMove} s on or off the dock`],
    ['People', `${ASSUME.pickers} pallet pickers, ${ASSUME.totePickers} tote pickers, a receiver, a labeller, a tote builder, 3 forklift and 2 order picker drivers`],
  ];
  $('#assume').innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
}

// ── controls ─────────────────────────────────────────────────────────────────────────────────────────────────────
const ICON = {
  play: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4.5v11l9-5.5z"/></svg>',
  pause: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5.5 4.5h3v11h-3zM11.5 4.5h3v11h-3z"/></svg>',
  modelPause: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M7.5 6.5h1.8v7H7.5zM10.7 6.5h1.8v7h-1.8z"/></svg>',
  modelPlay: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8.2 6.3v7.4l5.6-3.7z"/></svg>',
};
let speed = 4, simRunning = !reduce;
function wire() {
  const step = d => { const i = (tour.i + d + STOPS.length) % STOPS.length; followStop = tour.on ? null : i; goStop(i); };
  $('#tour-prev').addEventListener('click', () => step(-1));
  $('#tour-next').addEventListener('click', () => step(1));
  $('#tour-play').addEventListener('click', () => { followStop = null; setTour(!tour.on); });
  document.querySelectorAll('[name="speed"]').forEach(r => r.addEventListener('change', () => { speed = +r.value; }));
  $('#sim-run').addEventListener('click', () => { simRunning = !simRunning; syncRun(); });
  $('#panel-toggle').addEventListener('click', () => { const open = $('#panel').classList.toggle('open'); $('#panel-toggle').setAttribute('aria-expanded', String(open)); $('#panel-toggle span').textContent = open ? 'Hide figures' : 'All figures'; });
  addEventListener('keydown', e => {
    if (e.target.closest('input, button, summary, a')) return;
    if (e.key === 'ArrowRight') { $('#tour-next').click(); } else if (e.key === 'ArrowLeft') { $('#tour-prev').click(); } else if (e.key === ' ') { e.preventDefault(); setTour(!tour.on); }
  });
  syncRun();
}
function syncRun() {
  $('#sim-run').setAttribute('aria-pressed', String(simRunning));
  $('#sim-run').innerHTML = simRunning ? ICON.modelPause + '<span>Pause model</span>' : ICON.modelPlay + '<span>Run model</span>'; $('#sim-run').setAttribute('aria-label', simRunning ? 'Pause model' : 'Run model');
  document.documentElement.classList.toggle('sim-paused', !simRunning);
}
function noWebGL() {
  document.documentElement.classList.add('no-webgl');
  $('#loader').hidden = true; $('#fallback').hidden = false;
}

// ── frame loop ───────────────────────────────────────────────────────────────────────────────────────────────────
const clock = new THREE.Clock(); let acc = 0, frames = 0, fpsT = 0, fps = 0, panelT = 0, pathT = 0, sinceStart = 0, downgraded = 0;
const fv = { pos: new THREE.Vector3(), target: new THREE.Vector3() };
function frame() {
  const raw = clock.getDelta(), dt = Math.min(raw, 0.1); sinceStart += raw;
  if (simRunning) { acc += dt * speed; let steps = 0; while (acc > 0.1 && steps < 40) { sim.step(0.1); acc -= 0.1; steps++; } if (steps >= 40) acc = 0; }
  world.speed = simRunning ? speed : 0;
  world.sync(simRunning ? dt : 0, camera.position);
  // camera: tour flight, follow, gentle drift
  const s = STOPS[tour.i];
  if (tour.on || followStop != null) {
    stopView(followStop != null ? STOPS[followStop] : s, fv);
    if (tour.fly) {
      tour.fly.t += dt; const f = ease(Math.min(1, tour.fly.t / tour.fly.dur));
      camera.position.lerpVectors(tour.fly.from, fv.pos, f); controls.target.lerpVectors(tour.fly.fromT, fv.target, f);
      if (tour.fly.t >= tour.fly.dur) { tour.fly = null; if (followStop != null && !STOPS[followStop].follow) followStop = null; }
    } else if ((followStop != null ? STOPS[followStop] : s).follow) {
      camera.position.lerp(fv.pos, Math.min(1, dt * 2.2)); controls.target.lerp(fv.target, Math.min(1, dt * 3));
    } else if (!reduce && tour.on) {
      const a = dt * 0.025; const ox = camera.position.x - controls.target.x, oz = camera.position.z - controls.target.z;
      camera.position.x = controls.target.x + ox * Math.cos(a) - oz * Math.sin(a); camera.position.z = controls.target.z + ox * Math.sin(a) + oz * Math.cos(a);
    }
    if (tour.on && !tour.fly) { tour.t += dt; if (!reduce && tour.t > (s.follow ? 13 : 11)) goStop(tour.i + 1); }
  }
  controls.update();
  // keep the camera over the site and above the floor
  controls.target.x = THREE.MathUtils.clamp(controls.target.x, -40, 52); controls.target.z = THREE.MathUtils.clamp(controls.target.z, -26, 26); controls.target.y = THREE.MathUtils.clamp(controls.target.y, 0, 8);
  if (camera.position.y < 0.6) camera.position.y = 0.6;
  // focus ring under the agent the tour follows
  const fs = followStop != null ? STOPS[followStop] : s;
  if (fs.follow && (tour.on || followStop != null)) { const v = world.views.filter(x => x.a.kind === fs.follow.kind)[fs.follow.n]; ring.visible = true; ring.position.x = v.g.position.x; ring.position.z = v.g.position.z; } else ring.visible = false;
  pathT += dt; if (pathT > 0.2) { pathT = 0; updatePaths(); }
  panelT += dt; if (panelT > 0.25) { panelT = 0; updatePanel(); }
  placeTags();
  renderer.info.reset();
  if (sun.castShadow && (tier === 'high' || (shadowTick++ & 1) === 0)) renderer.shadowMap.needsUpdate = true; // mid: shadows every other frame
  if (composer) composer.render(dt); else renderer.render(scene, camera);
  window.__dc.calls = renderer.info.render.calls; window.__dc.tris = renderer.info.render.triangles;
  // fps, and a one-step quality drop if this device can't hold about 24 fps
  frames++; fpsT += raw; // real elapsed time, not the clamped step
  if (fpsT >= 1) { fps = frames / fpsT; frames = 0; fpsT = 0; window.__dc.fps = fps; window.__dc.calls = renderer.info.render.calls; window.__dc.tris = renderer.info.render.triangles; if (params.has('debug')) $('#debug').textContent = `${fps.toFixed(0)} fps · ${tier} · ${renderer.info.render.calls} calls · ${(renderer.info.render.triangles / 1e6).toFixed(2)}M tris`; }
  if (!fixedTier && sinceStart > 5 && fps && fps < 24 && downgraded < 2 && ORDER.indexOf(tier) > 0 && sinceStart - (window.__dc.lastDrop || 0) > 4) {
    tier = ORDER[ORDER.indexOf(tier) - 1]; downgraded++; window.__dc.lastDrop = sinceStart; applyTier();
  }
  if (maxFrames && ++frameCount >= maxFrames) { document.documentElement.classList.add('still'); return; } // ?frames=N: stop after N frames (for stills on slow test machines)
  requestAnimationFrame(frame);
}
const maxFrames = +params.get('frames') || 0; let frameCount = 0;

// ── start ────────────────────────────────────────────────────────────────────────────────────────────────────────
window.__dc = { tier: () => tier, fps: 0 };
(async () => {
  wire(); fillAssumptions(); progress();
  applyTier();
  const { assets, tex } = await loadAll().catch(e => { console.error(e); $('#load-text').textContent = 'The 3D models did not load. Reload to try again.'; throw e; });
  sim = new Sim(11); window.__dc.sim = sim; window.__dc.scene = scene; window.__dc.renderer = renderer; window.__dc.camera = camera;
  world = new World(scene, assets, tex, sim, { tier });
  buildOverlays();
  if (params.has('stop')) { tour.on = false; followStop = STOPS[+params.get('stop')]?.follow ? +params.get('stop') : null; goStop(+params.get('stop'), true); } else goStop(0, true);
  setTour(tour.on && !params.has('stop'));
  if (params.has('t')) { const T = +params.get('t'); while (sim.t < T) sim.step(0.1); }
  updatePanel();
  renderer.compile(scene, camera);
  $('#loader').classList.add('done'); setTimeout(() => { $('#loader').hidden = true; }, 600);
  document.documentElement.classList.add('ready');
  clock.getDelta(); requestAnimationFrame(frame);
})();
