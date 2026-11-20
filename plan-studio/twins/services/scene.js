// Services from a plan: placed as symbols on the plan, assembled in 3D on a first-pass route, clash-checked, rerouted,
// fitted and pre-checked. Everything shown is computed in model.js from the plan model at load (the 16A plan by default,
// or a plan dropped into Plan to 4D). three.js r170: physical materials, a studio environment, soft shadows.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { SYSTEMS, HOT, buildServices } from "./model.js?v=3";

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const phone = matchMedia("(max-width: 860px)").matches || (navigator.hardwareConcurrency || 8) <= 4;
const $ = (s) => document.querySelector(s);
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const ORDER = ["fix", "hvac", "water", "drain", "elec"];
const hex = (c) => "#" + c.toString(16).padStart(6, "0");
const KEEP = "assembl-twin-dropped-plan";

// ---------------------------------------------------------------------------------------------------- the plan
const qs = new URLSearchParams(location.search);
let model = null, planName = "16A";
if (qs.get("plan") === "dropped") {
  try { const kept = JSON.parse(sessionStorage.getItem(KEEP) || "null"); if (kept?.plan?.buildings?.length) { model = kept.plan; planName = (kept.name || "your plan").replace(/\.json$/i, ""); } } catch { /* storage blocked */ }
  if (!model) $("#source").textContent = "That plan isn't in this tab any more, so this is the 16A plan.";
}
if (!model) model = await (await fetch("./plan16a.json")).json();
const homes = model.buildings.filter((b) => b.levels?.[0]?.rooms?.length && b.levels[0].walls?.length);
const RESULTS = new Map(homes.map((b) => [b.id, buildServices(model, b.id)]));
const is16A = planName === "16A";
const nameOf = (b) => b.name || b.id;

// ---------------------------------------------------------------------------------------------------- renderer and studio
const canvas = $("#stage");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, phone ? 1.6 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.84;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = (() => {
  // a photo studio: a dim warm room, one big overhead softbox, three tall strip boxes round the set and a low rose bounce
  const sc = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(60, 30, 60), new THREE.MeshBasicMaterial({ color: new THREE.Color("#8d8183"), side: THREE.BackSide })); room.position.y = 12; sc.add(room);
  const panel = (w, h, k, x, y, z, col = "#fff7f2") => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 1, 0); sc.add(m); };
  panel(22, 22, 2.6, 0, 26, 0);
  for (let i = 0; i < 3; i++) { const a = (i * Math.PI * 2) / 3 + 0.5; panel(4, 14, 5.5, Math.cos(a) * 24, 10, Math.sin(a) * 24); }
  panel(40, 3, 1.1, 0, 1.2, -28, "#f3d9e3");
  const t = pmrem.fromScene(sc, 0.02).texture; sc.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } }); return t;
})(); scene.environmentIntensity = 0.9;
const workLight = new THREE.PointLight(0xfff0dc, 0, 8, 2); scene.add(workLight);
scene.add(new THREE.HemisphereLight(0xfffaf5, 0xe6d9df, 0.55));
const key = new THREE.DirectionalLight(0xfff4ec, 2.3);
key.castShadow = true; key.shadow.mapSize.set(phone ? 1024 : 2048, phone ? 1024 : 2048);
key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 3;
scene.add(key, key.target);
const fill = new THREE.DirectionalLight(0xf3e6ee, 0.5); scene.add(fill, fill.target);
const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 400);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.08; controls.enabled = false; controls.enablePan = false;
controls.maxPolarAngle = Math.PI * 0.47; controls.minPolarAngle = 0.05;
// lens effects on larger screens (off on phones and low-power devices)
let composer = null, bokeh = null;
if ((!phone || qs.get("fx") === "1") && qs.get("fx") !== "0") {
  scene.background = new THREE.Color(0xf6efec); scene.backgroundIntensity = 1.8; renderer.setClearAlpha(1);   // the lens passes need a solid ground behind the model
  composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }));
  composer.addPass(new RenderPass(scene, camera));
  // depth of field: a wide lens on the whole house, a fast one on each clash
  bokeh = new BokehPass(scene, camera, { focus: 20, aperture: 0.0003, maxblur: 0.011 }); composer.addPass(bokeh);
  composer.addPass(new OutputPass());
}

// ---------------------------------------------------------------------------------------------------- materials
const phys = (o) => new THREE.MeshPhysicalMaterial(o), std = (o) => new THREE.MeshStandardMaterial(o);
const ribs = (() => { const c = document.createElement("canvas"); c.width = 8; c.height = 64; const g = c.getContext("2d"); const gr = g.createLinearGradient(0, 0, 8, 0); gr.addColorStop(0, "#000"); gr.addColorStop(0.5, "#fff"); gr.addColorStop(1, "#000"); g.fillStyle = gr; g.fillRect(0, 0, 8, 64); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();

// ---------------------------------------------------------------------------------------------------- textures, drawn in code
const cv = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const tex = (c, rep = true) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
function grain(g, x, y, w, h, n) {
  for (let i = 0; i < n; i++) {
    const yy = y + rnd() * h, a = 0.03 + rnd() * 0.09, k = rnd() * 5 - 2.5;
    g.strokeStyle = rnd() < 0.55 ? `rgba(112,78,46,${a})` : `rgba(255,242,220,${a})`; g.lineWidth = 0.5 + rnd() * 1.4;
    g.beginPath(); g.moveTo(x, yy); g.bezierCurveTo(x + w / 3, yy + k, x + (2 * w) / 3, yy - k, x + w, yy + rnd() * 3 - 1.5); g.stroke();
  }
}
const TEX = {
  wood: (() => { const c = cv(512, 128), g = c.getContext("2d"); g.fillStyle = "#e6cfa9"; g.fillRect(0, 0, 512, 128); grain(g, 0, 0, 512, 128, 300);
    for (let i = 0; i < 3; i++) { const x = rnd() * 512, y = rnd() * 128, gr = g.createRadialGradient(x, y, 0, x, y, 9); gr.addColorStop(0, "rgba(92,60,36,.5)"); gr.addColorStop(1, "rgba(92,60,36,0)"); g.fillStyle = gr; g.fillRect(x - 9, y - 9, 18, 18); }
    const t = tex(c); t.repeat.set(4, 1); return t; })(),
  // 2.4 m of oak floor: 140 mm boards with staggered joints
  boards: (() => { const n = 1024, c = cv(n, n), g = c.getContext("2d"), bw = n * (0.14 / 2.4);
    for (let y = 0, r = 0; y < n; y += bw, r++) { let x = -rnd() * n * 0.5;
      while (x < n) { const len = n * (0.5 + rnd() * 0.5), v = 196 + Math.round(rnd() * 26); g.save(); g.beginPath(); g.rect(x, y, len, bw); g.clip();
        g.fillStyle = `rgb(${v + 14},${v - 18},${v - 62})`; g.fillRect(x, y, len, bw); grain(g, x, y, len, bw, 26); g.restore();
        g.fillStyle = "rgba(70,44,28,.5)"; g.fillRect(x + len - 1, y, 1.5, bw); x += len; }
      g.fillStyle = "rgba(70,44,28,.42)"; g.fillRect(0, y, n, 1.3); }
    return tex(c); })(),
  // 2.4 m of concrete pavers, 600 mm, with plum joints: the brand grid, underfoot
  pavers: (() => { const n = 512, c = cv(n, n), g = c.getContext("2d"); g.fillStyle = "#ebe2dd"; g.fillRect(0, 0, n, n);
    for (let i = 0; i < 9000; i++) { const a = rnd() * 0.07; g.fillStyle = rnd() < 0.5 ? `rgba(101,74,78,${a})` : `rgba(255,255,255,${a * 1.6})`; g.fillRect(rnd() * n, rnd() * n, 1 + rnd() * 2, 1 + rnd() * 2); }
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = `rgba(101,74,78,${rnd() * 0.035})`; g.fillRect(i * 128, j * 128, 128, 128); }
    g.fillStyle = "rgba(101,74,78,.3)"; for (let i = 0; i <= 4; i++) { g.fillRect(i * 128 - 1, 0, 2, n); g.fillRect(0, i * 128 - 1, n, 2); }
    return tex(c); })(),
  fade: (() => { const c = cv(256, 256), g = c.getContext("2d"), gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, "#fff"); gr.addColorStop(0.3, "#fff"); gr.addColorStop(0.72, "#000"); g.fillStyle = "#000"; g.fillRect(0, 0, 256, 256); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(c); return t; })(),
};
const M = {
  wall: std({ color: 0xf6eeea, roughness: 0.93 }),
  poche: std({ color: 0x654a4e, roughness: 0.75 }),
  ghost: phys({ color: 0xffffff, roughness: 0.2, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, clearcoat: 0.6 }),
  edge: new THREE.LineBasicMaterial({ color: 0x654a4e, transparent: true, opacity: 0 }),
  roof: new THREE.LineBasicMaterial({ color: 0x654a4e, transparent: true, opacity: 0 }),
  floor: phys({ color: 0xffffff, map: TEX.boards, roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.35 }),
  pile: std({ color: 0xc4b09a, map: TEX.wood, roughness: 0.82 }),
  joist: std({ color: 0xffffff, map: TEX.wood, roughness: 0.74 }),
  pad: std({ color: 0xd6cfca, roughness: 0.96 }),
  oak: phys({ color: 0xe9d3b4, map: TEX.wood, roughness: 0.55, clearcoat: 0.2 }),
  stone: phys({ color: 0xefebe6, roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
  ceramic: phys({ color: 0xfbfaf8, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.06 }),
  satin: phys({ color: 0xf3f0ed, roughness: 0.4, clearcoat: 0.35 }),
  grey: phys({ color: 0xd8d4d2, roughness: 0.45, clearcoat: 0.2 }),
  chrome: std({ color: 0xffffff, metalness: 1, roughness: 0.1 }),
  steel: std({ color: 0xdedcdb, metalness: 0.88, roughness: 0.3 }),
  dark: phys({ color: 0x171215, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.04 }),
  glass: phys({ color: 0xe4f0f2, roughness: 0.04, transparent: true, opacity: 0.2, depthWrite: false, clearcoat: 1 }),
  copper: std({ color: 0xc98a5e, metalness: 0.95, roughness: 0.28 }),
  brass: std({ color: 0xc9a65a, metalness: 0.95, roughness: 0.3 }),
  lid: phys({ color: 0x3b3236, roughness: 0.6 }),
  led: new THREE.MeshBasicMaterial({ color: 0xe0443a, toneMapped: false }),
  lamp: new THREE.MeshBasicMaterial({ color: 0xd9d2cc, toneMapped: false }),
  clash: new THREE.LineBasicMaterial({ color: 0x654a4e, transparent: true, opacity: 0, toneMapped: false, depthTest: false }),
  ring: new THREE.MeshBasicMaterial({ color: 0xd9bacb, transparent: true, opacity: 0, toneMapped: false, depthTest: false, depthWrite: false }),
  tip: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, toneMapped: false }),
  clip: std({ color: 0xb9b3b1, metalness: 0.6, roughness: 0.4 }),
};
const PIPE = {
  // real materials: blue and red PEX, grey uPVC waste, galvanised spiral duct, white lagged refrigerant lines, white TPS cable
  water: phys({ color: 0x2f6fb5, roughness: 0.34, clearcoat: 0.7, clearcoatRoughness: 0.2 }),
  hot: phys({ color: HOT, roughness: 0.34, clearcoat: 0.7, clearcoatRoughness: 0.2 }),
  drain: phys({ color: 0xa3a9ac, roughness: 0.3, clearcoat: 0.85, clearcoatRoughness: 0.12 }),
  duct: std({ color: 0xd3d6da, metalness: 0.92, roughness: 0.34, bumpMap: ribs, bumpScale: 1.6 }),
  refrig: phys({ color: 0xf1eee9, roughness: 0.85, sheen: 0.5, sheenColor: new THREE.Color(0xffffff) }),
  elec: phys({ color: 0xf3efe8, roughness: 0.45, clearcoat: 0.25 }),
};
const SYSMAT = { fix: M.satin, hvac: PIPE.refrig, water: PIPE.water, drain: PIPE.drain, elec: PIPE.elec };
const BEAD = Object.fromEntries(Object.entries({ water: 0xd3e8ff, hot: 0xffd6d0, drain: 0xffffff, hvac: 0xffffff, elec: 0xd9bacb }).map(([k, c]) => [k, new THREE.MeshBasicMaterial({ color: c, toneMapped: false, transparent: true, opacity: 0.95 })]));
const symMat = Object.fromEntries(Object.entries(SYSTEMS).map(([k, v]) => [k, new THREE.MeshBasicMaterial({ color: v.color, transparent: true })]));
const symRing = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true });
const CELL_BOX = new THREE.BoxGeometry(0.16, 0.16, 0.16), CELL_EDGE = new THREE.EdgesGeometry(CELL_BOX);
const POOL = new THREE.MeshBasicMaterial({ map: (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,236,206,1)"); gr.addColorStop(0.45, "rgba(255,236,206,0.45)"); gr.addColorStop(1, "rgba(255,236,206,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })(), transparent: true, opacity: 0, depthWrite: false, toneMapped: false });

// ---------------------------------------------------------------------------------------------------- the world (rebuilt when the home changes)
let W = null;   // { root, pieces, symbols, homesBuilt, bounds, ground, total, counts }
const geoCache = new Map();
const rbox = (w, h, d, r = 0.02, s = 3) => { const k = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}|${r}`; if (!geoCache.has(k)) geoCache.set(k, new RoundedBoxGeometry(w, h, d, s, Math.min(r, w / 2.01, h / 2.01, d / 2.01))); return geoCache.get(k); };
const mesh = (geo, mat, x = 0, y = 0, z = 0, shadow = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; return m; };

function build(sel) {
  if (W) { scene.remove(W.root); W.root.traverse((o) => { if (o.geometry && !o.userData.shared) o.geometry.dispose(); }); }
  const ids = sel === "all" ? homes.map((b) => b.id) : [sel];
  const floor0 = Math.min(...ids.map((id) => homes.find((b) => b.id === id).floorLevel ?? 0));
  const root = new THREE.Group(); scene.add(root);
  const out = { root, pieces: [], symbols: [], homes: [], clashes: [], fittings: [], flows: [], lamps: [], leds: [], pools: [], clashPts: [], shots: [], sysGroups: [], walls: [], planMats: [], tips: null, ids };
  const bb = new THREE.Box3();
  let groundY = Infinity;
  const placed = ids.map((id) => {
    const S = RESULTS.get(id), B = S.building, g = new THREE.Group();
    if (sel === "all") g.position.set(B.origin?.[0] ?? 0, (B.floorLevel ?? 0) - floor0, -(B.origin?.[1] ?? 0));
    groundY = Math.min(groundY, g.position.y + S.ground); root.add(g);
    return { S, g };
  });
  for (const { S, g } of placed) {
    buildHome(S, g, out, groundY - g.position.y);
    const F = S.footprint;
    bb.expandByPoint(V3(F.u0 - 1.2, 0, F.v0 - 1.2).add(g.position)); bb.expandByPoint(V3(F.u1 + 1.2, S.plate + 0.4, F.v1 + 1.2).add(g.position));
  }
  out.bounds = bb; out.ground = groundY;
  // studio ground: soft shadows and a faint metre grid that fades out
  const c = bb.getCenter(V3()), size = bb.getSize(V3()), span = Math.max(size.x, size.z) * 3.2 + 20;
  const pav = TEX.pavers.clone(); pav.repeat.set(span / 2.4, span / 2.4); pav.needsUpdate = true;
  const groundM = mesh(new THREE.PlaneGeometry(span, span), new THREE.MeshStandardMaterial({ map: pav, alphaMap: TEX.fade, transparent: true, roughness: 0.95 }), c.x, groundY, c.z, false);
  groundM.rotation.x = -Math.PI / 2; root.add(groundM);
  // one close-up per cluster of clashes: from just outside the nearest wall, at pipe height
  const cl = [];
  for (const p of out.clashPts) { const k = cl.find((q) => q.c.distanceTo(p) < 2.2); if (k) { k.pts.push(p); k.c.copy(k.pts.reduce((a, b) => a.add(b), V3()).multiplyScalar(1 / k.pts.length)); } else cl.push({ c: p.clone(), pts: [p] }); }
  out.shots = cl.sort((a, b) => b.pts.length - a.pts.length).slice(0, 2).sort((a, b) => a.c.x - b.c.x).map(({ c: q }) => {
    const ds = [[q.x - bb.min.x, V3(-1, 0, 0)], [bb.max.x - q.x, V3(1, 0, 0)], [q.z - bb.min.z, V3(0, 0, -1)], [bb.max.z - q.z, V3(0, 0, 1)]].sort((a, b) => a[0] - b[0]);
    const dir = ds[0][1], side = V3(dir.z, 0, -dir.x);
    const pos = q.clone().addScaledVector(dir, 1.9).addScaledVector(side, 0.8); pos.y = q.y < 0 ? Math.max(groundY + 0.2, q.y - 0.04) : q.y + 0.7;
    return { pos, tgt: q.clone(), w: 0 };
  });
  // the key light follows the model so its shadow camera fits
  key.position.set(c.x + 7, 16, c.z + 10); key.target.position.copy(c);
  const sc = key.shadow.camera, half = Math.max(size.x, size.z) * 0.75 + 2;
  Object.assign(sc, { left: -half, right: half, top: half, bottom: -half, near: 1, far: 60 }); sc.updateProjectionMatrix();
  fill.position.set(c.x - 9, 7, c.z - 7); fill.target.position.copy(c);
  // a growing tip for runs being laid
  out.tips = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 10), M.tip, 96); out.tips.count = 0; out.tips.frustumCulled = false; root.add(out.tips);
  // timeline: plan symbols, then the 3D pieces by system
  out.symbols.sort((a, b) => ORDER.indexOf(a.sys) - ORDER.indexOf(b.sys)).forEach((s, i, all) => { s.t = 1.0 + (i / Math.max(1, all.length - 1)) * 6.6; });
  const WIN = { fix: [10.6, 12.6], hvac: [12.0, 14.4], water: [13.4, 16.4], drain: [15.4, 17.8], elec: [16.8, 19.2] };
  for (const k of ORDER) {
    const list = out.pieces.filter((p) => p.sys === k);
    list.forEach((p, i) => { const [a, b] = WIN[k]; p.t = a + (i / Math.max(1, list.length - 1)) * (b - a - 0.4); });
  }
  out.walls.forEach((w, i, all) => { w.t = 8.0 + (i / Math.max(1, all.length - 1)) * 1.8; });
  out.total = out.pieces.reduce((t, p) => t + p.parts, 0);
  out.counts = Object.fromEntries(ORDER.map((k) => [k, { sym: out.symbols.filter((s) => s.sys === k).length, parts: out.pieces.filter((p) => p.sys === k).reduce((t, p) => t + p.parts, 0) }]));
  W = out;
}

function buildHome(S, g, out, G) {
  const L = S.level, F = S.footprint, plate = S.plate;
  const SG = Object.fromEntries(ORDER.map((k) => { const x = new THREE.Group(); x.userData.sys = k; g.add(x); out.sysGroups.push(x); return [k, x]; }));
  // ------------------------------------------------ floor, piles, plan
  const fw = F.u1 - F.u0, fd = F.v1 - F.v0;
  const bmap = TEX.boards.clone(); bmap.repeat.set(fw / 2.4, fd / 2.4); bmap.needsUpdate = true;
  const floorMat = M.floor.clone(); floorMat.map = bmap;
  const floorM = mesh(new THREE.BoxGeometry(fw, 0.03, fd), floorMat, F.u0 + fw / 2, -0.015, F.v0 + fd / 2); g.add(floorM);
  // the subfloor, as built: joists at 450 centres on bearers, on timber piles with concrete pads; each stepped clear of the pipes
  const piles = new THREE.Group(); g.add(piles); piles.scale.y = 0.001; out.walls.push({ g: piles, piles: true });
  if (/timber|pile/i.test(L.floorType || "timber")) {
    const segsU = S.runs.flatMap((r) => { const o = []; for (const p of [r.pts, r.firstPts || r.pts]) for (let i = 1; i < p.length; i++) o.push([p[i - 1], p[i]]); return o; }).filter(([a, b]) => Math.min(a[1], b[1]) < -0.02);
    const risers = segsU.filter(([a, b]) => Math.hypot(a[0] - b[0], a[2] - b[2]) < 0.02).map(([a]) => [a[0], a[2]]);
    const horiz = segsU.filter(([a, b]) => Math.hypot(a[0] - b[0], a[2] - b[2]) >= 0.02);
    const nudge = (v, bad) => { for (const d of [0, 0.08, -0.08, 0.16, -0.16, 0.24, -0.24, 0.32, -0.32]) if (!bad(v + d)) return v + d; return null; };
    for (let x = F.u0 + 0.06; x <= F.u1 - 0.05; x += 0.45) { const jx = nudge(x, (q) => risers.some((r) => Math.abs(r[0] - q) < 0.08)); if (jx != null) piles.add(mesh(new THREE.BoxGeometry(0.045, 0.14, fd - 0.02), M.joist, jx, -0.1, F.v0 + fd / 2)); }
    const nz = Math.max(2, Math.round(fd / 1.6)), nx = Math.max(2, Math.round(fw / 1.5));
    for (let j = 0; j <= nz; j++) {
      const bz = nudge(F.v0 + 0.12 + ((fd - 0.24) * j) / nz, (q) => risers.some((r) => Math.abs(r[1] - q) < 0.11)); if (bz == null) continue;
      piles.add(mesh(new THREE.BoxGeometry(fw - 0.02, 0.1, 0.09), M.joist, F.u0 + fw / 2, -0.22, bz));
      for (let i = 0; i <= nx; i++) {
        const px = nudge(F.u0 + 0.12 + ((fw - 0.24) * i) / nx, (q) => horiz.some(([a, b]) => segPointXZ(a, b, q, bz) < 0.17) || risers.some((r) => Math.hypot(r[0] - q, r[1] - bz) < 0.17)); if (px == null) continue;
        const h = -0.27 - G; piles.add(mesh(new THREE.BoxGeometry(0.125, h, 0.125), M.pile, px, -0.27 - h / 2, bz), mesh(new THREE.BoxGeometry(0.32, 0.07, 0.32), M.pad, px, G + 0.035, bz));
      }
    }
  }
  const planTex = new THREE.CanvasTexture(drawPlan(S)); planTex.colorSpace = THREE.SRGBColorSpace; planTex.anisotropy = 8;
  const planMat = new THREE.MeshBasicMaterial({ map: planTex, transparent: true, depthWrite: false, opacity: 0 });
  const pad = 0.6, planM = mesh(new THREE.PlaneGeometry(fw + 2 * pad, fd + 2 * pad), planMat, F.u0 + fw / 2, 0.004, F.v0 + fd / 2, false);
  planM.rotation.x = -Math.PI / 2; planM.renderOrder = 1; g.add(planM);
  out.planMats.push({ mat: planMat });
  // ------------------------------------------------ walls: a section model, solid to the cut with a plum cut face, glass above
  const CUT = 1.05;
  for (const w of [...L.walls, ...(L.partitions || [])]) {
    const wg = new THREE.Group(); wg.scale.y = 0.001; g.add(wg);
    wallPieces(w, !!L.partitions?.includes(w), plate, CUT, wg);
    out.walls.push({ g: wg });
  }
  // roof outline and the top plate of the outside walls, as fine lines
  const roof = roofLines(S); if (roof) g.add(roof);
  const plateLine = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(fw, plate, fd)), M.roof); plateLine.position.set(F.u0 + fw / 2, plate / 2, F.v0 + fd / 2); g.add(plateLine);
  // ------------------------------------------------ plan symbols
  for (const s of S.sym) {
    const sg = new THREE.Group();
    const r = s.sys === "elec" ? 0.09 : s.sys === "fix" ? 0.15 : 0.135;
    const disc = new THREE.Mesh(s.sys === "fix" ? rbox(r * 2, 0.012, r * 2, 0.004, 1) : new THREE.CylinderGeometry(r, r, 0.012, 24), symMat[s.sys]);
    const ring = new THREE.Mesh(new THREE.RingGeometry(r * 0.42, r * 0.58, 24), symRing); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.008;
    sg.add(disc, ring); sg.position.set(s.u, 0.014, s.v); sg.scale.setScalar(0.0001); g.add(sg);
    out.symbols.push({ sys: s.sys, g: sg, mats: [symMat[s.sys]] });
  }
  // ------------------------------------------------ kitchen bench (cabinets and stone top) as part of the fixtures
  if (S.bench) {
    const b = S.bench, e = b.e, len = b.a1 - b.a0, dep = b.depth, mid = (b.a0 + b.a1) / 2;
    const bg = new THREE.Group();
    const c = e.axis === "x" ? [mid, e.c + e.inward[1] * dep / 2] : [e.c + e.inward[0] * dep / 2, mid];
    bg.position.set(c[0], 0, c[1]); bg.rotation.y = Math.atan2(e.inward[0], e.inward[1]);
    bg.add(mesh(rbox(len, 0.86, dep - 0.02, 0.012), M.oak, 0, 0.43, -0.01), mesh(rbox(len + 0.02, 0.04, dep + 0.02, 0.008), M.stone, 0, 0.88, 0));
    for (let i = 1; i < Math.round(len / 0.6); i++) bg.add(mesh(new THREE.BoxGeometry(0.004, 0.8, 0.004), M.dark, -len / 2 + i * (len / Math.round(len / 0.6)), 0.43, dep / 2 - 0.015, false));
    SG.fix.add(bg); out.pieces.push({ sys: "fix", obj: bg, parts: 1, home: bg.position.clone(), label: "Kitchen bench", pick: true });
  }
  // ------------------------------------------------ fixtures and appliances
  for (const b of S.boxes) {
    const o = fixtureModel(b, plate); if (!o) continue;
    o.userData.label = b.label; (SG[b.sys] || SG.fix).add(o);
    out.pieces.push({ sys: b.sys, obj: o, parts: 1, home: o.position.clone(), label: b.label, pick: true });
  }
  // devices from the symbols: lights, sockets, switches, alarms; and the outside bits
  for (const s of S.sym) {
    const o = deviceModel(s, S, out, G); if (!o) continue;
    o.userData.label = s.label; SG[s.sys].add(o);
    out.pieces.push({ sys: s.sys, obj: o, parts: s.sys === "elec" ? 1 : 0, home: o.position.clone(), label: s.label, pick: true });
  }
  // ------------------------------------------------ runs: tubes with rounded bends, laid on the first-pass route, then rerouted
  const runsSorted = [...S.runs].sort((a, b) => ORDER.indexOf(a.sys) - ORDER.indexOf(b.sys));
  for (const r of runsSorted) {
    const isDuct = r.kind === "duct", rad = isDuct ? r.w / 2 : r.sys === "water" ? Math.max(r.r, 0.019) : r.sys === "elec" ? Math.max(r.r, 0.0125) : r.kind === "refrig" ? 0.036 : r.sys === "drain" ? Math.max(r.r, 0.03) : r.r;
    const fine = phone ? 0.05 : 0.03;
    const curveF = rounded(r.pts, isDuct ? 0.16 : Math.max(rad * 2.2, 0.04)), lenF = curveF.getLength();
    const firstPts = r.firstPts || r.pts;
    let curveI = rounded(firstPts, isDuct ? 0.16 : Math.max(rad * 2.2, 0.04)); if (curveI.getLength() < 1e-3) curveI = curveF;
    const segs = Math.max(6, Math.min(phone ? 380 : 700, Math.ceil(Math.max(lenF, curveI.getLength()) / fine)));
    const radial = rad > 0.05 ? 20 : rad > 0.02 ? 14 : rad > 0.01 ? 10 : 7;
    const geo = new THREE.TubeGeometry(curveF, segs, rad, radial, false);
    const geoI = new THREE.TubeGeometry(curveI, segs, rad, radial, false);
    if (isDuct) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * lenF / 0.045); }
    geo.morphAttributes.position = [geoI.attributes.position]; geo.morphAttributes.normal = [geoI.attributes.normal];
    const mat = r.sys === "water" ? (r.hot ? PIPE.hot : PIPE.water) : r.sys === "drain" ? PIPE.drain : r.sys === "elec" ? PIPE.elec : isDuct ? PIPE.duct : PIPE.refrig;
    const m = new THREE.Mesh(geo, mat); m.castShadow = rad > 0.012; m.receiveShadow = true;
    m.morphTargetInfluences = [1]; m.userData.label = r.label; m.frustumCulled = false;
    geo.setDrawRange(0, 0);
    SG[r.sys].add(m);
    const parts = Math.max(1, r.pts.length - 1) + Math.max(0, r.pts.length - 2);
    out.pieces.push({ sys: r.sys, run: r, mesh: m, segs, radial, curveF, curveI, len: lenF, parts, rad, label: r.label, pick: true, dur: Math.max(0.45, Math.min(1.3, lenF / 6)), group: SG[r.sys], hot: r.hot });
    // fittings and clips go on once the route is final
    fittingsFor(r, curveF, rad, SG[r.sys], out);
    // flow beads along the final route (not on drops, vents or refrigerant lines)
    if (!["drop", "vent", "refrig", "duct"].includes(r.kind)) {
      const n = Math.max(1, Math.min(9, Math.round(lenF / 0.85)));
      for (let i = 0; i < n; i++) out.flows.push({ curve: curveF, len: lenF, phase: i / n, sys: r.sys, hot: r.hot, rad, group: SG[r.sys] });
    }
  }
  // first-pass clash points, on their flattened levels: one square cell each
  const seen = [];
  for (const p of S.firstClashes.at) {
    out.clashPts.push(V3(p[0], p[1], p[2]).add(g.position));
    if (seen.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]) < 0.1)) continue; seen.push(p);
    const cg = new THREE.Group(); cg.position.set(p[0], p[1], p[2]);
    const cell = new THREE.LineSegments(CELL_EDGE, M.clash); cell.renderOrder = 6;
    const fillM = new THREE.Mesh(CELL_BOX, M.ring); fillM.renderOrder = 5;
    cg.add(cell, fillM); g.add(cg); out.clashes.push({ g: cg });
  }
  out.homes.push({ S, g, SG });
}

// rounded orthogonal path: straight runs joined by tight bends
function rounded(pts, rb) {
  const P = []; for (const p of pts) { const v = V3(p[0], p[1], p[2]); if (!P.length || P.at(-1).distanceTo(v) > 1e-5) P.push(v); }
  const path = new THREE.CurvePath();
  if (P.length < 2) { path.add(new THREE.LineCurve3(P[0] || V3(), (P[0] || V3()).clone().add(V3(0, 1e-4, 0)))); return path; }
  let cur = P[0].clone();
  for (let i = 1; i < P.length; i++) {
    const a = P[i - 1], b = P[i];
    if (i < P.length - 1) {
      const c = P[i + 1], d1 = b.clone().sub(a), d2 = c.clone().sub(b), l1 = d1.length(), l2 = d2.length();
      d1.normalize(); d2.normalize();
      const r = Math.min(rb, l1 / 2, l2 / 2);
      if (r > 2e-3 && d1.dot(d2) < 0.999) {
        const p1 = b.clone().addScaledVector(d1, -r), p2 = b.clone().addScaledVector(d2, r);
        if (cur.distanceTo(p1) > 1e-5) path.add(new THREE.LineCurve3(cur.clone(), p1));
        path.add(new THREE.QuadraticBezierCurve3(p1, b.clone(), p2)); cur = p2; continue;
      }
    }
    if (cur.distanceTo(b) > 1e-5) path.add(new THREE.LineCurve3(cur.clone(), b.clone()));
    cur = b.clone();
  }
  return path;
}

function fittingsFor(r, curve, rad, parent, out) {
  const P = r.pts.map((p) => V3(p[0], p[1], p[2]));
  const add = (o) => { o.scale.setScalar(0.0001); parent.add(o); out.fittings.push(o); };
  if (r.sys === "drain" && r.kind !== "vent") {
    // push-fit collars either side of every bend, and a P-trap under each fixture
    for (let i = 1; i < P.length - 1; i++) for (const [a, b] of [[P[i - 1], P[i]], [P[i + 1], P[i]]]) {
      const d = b.clone().sub(a); const l = d.length(); if (l < 0.12) continue; d.normalize();
      const at = b.clone().addScaledVector(d, -Math.min(0.16, l / 2));
      const c = mesh(new THREE.CylinderGeometry(rad * 1.3, rad * 1.3, 0.07, 18), PIPE.drain, at.x, at.y, at.z); c.quaternion.setFromUnitVectors(V3(0, 1, 0), d); add(c);
    }
    if (r.kind === "branch") { const t = mesh(new THREE.TorusGeometry(rad * 2.4, rad, 10, 18, Math.PI), PIPE.drain, P[0].x, P[0].y - rad * 2.4, P[0].z); t.rotation.z = Math.PI; add(t); }
  }
  if (r.kind === "vent") { const top = P.at(-1); add(mesh(new THREE.CylinderGeometry(rad * 2.2, rad * 1.4, 0.12, 18), M.grey, top.x, top.y + 0.04, top.z)); }
  if (r.kind === "duct") {
    const end = P.at(-1), d = end.clone().sub(P.at(-2)).normalize();
    const hood = mesh(rbox(0.26, 0.26, 0.06, 0.015), M.grey, end.x, end.y, end.z); hood.quaternion.setFromUnitVectors(V3(0, 0, 1), d); add(hood);
  }
  // clips along horizontal runs of pipe and cable, about every metre
  if (["water", "elec"].includes(r.sys) || r.kind === "refrig" || (r.sys === "drain" && r.kind !== "vent")) {
    for (let i = 1; i < P.length; i++) {
      const a = P[i - 1], b = P[i]; if (Math.abs(a.y - b.y) > 0.05) continue;
      const l = a.distanceTo(b), n = Math.floor(l / 1.1); const d = b.clone().sub(a).normalize();
      for (let k = 1; k <= n; k++) {
        const at = a.clone().lerp(b, k / (n + 1));
        const clip = mesh(new THREE.BoxGeometry(rad * 2.6 + 0.01, 0.012, 0.025), M.clip, at.x, at.y + rad + 0.006, at.z, false);
        clip.rotation.y = Math.atan2(d.x, d.z) + Math.PI / 2; add(clip);
      }
    }
  }
}

// ---------------------------------------------------------------------------------------------------- fixtures, built in code
function fixtureModel(b, plate) {
  const o = new THREE.Group(), [w0, h, d0] = b.s;
  const face = b.face || [0, 1];
  // local frame: width along x, depth along z, facing +z; turned to face into the room
  const along = Math.abs(face[0]) > 0.5;
  const w = along ? d0 : w0, d = along ? w0 : d0;
  o.position.set(b.c[0], b.c[1] - b.s[1] / 2, b.c[2]);
  o.rotation.y = Math.atan2(face[0], face[1]);
  const A = (...m) => (m.forEach((x) => o.add(x)), o);
  switch (b.kind) {
    case "shower": {
      A(mesh(rbox(0.9, 0.05, 0.9, 0.02), M.ceramic, 0, 0.025, 0), mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.006, 20), M.steel, 0, 0.052, 0));
      const panel = mesh(new THREE.BoxGeometry(0.88, 1.9, 0.01), M.glass, 0, 1.0, 0.44, false); panel.renderOrder = 2; A(panel);
      A(mesh(new THREE.BoxGeometry(0.9, 0.02, 0.02), M.chrome, 0, 1.96, 0.44), mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.0, 10), M.chrome, -0.2, 1.4, -0.42), mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 24), M.chrome, -0.2, 1.92, -0.32));
      break;
    }
    case "wc": {
      const pan = mesh(new THREE.CylinderGeometry(0.19, 0.15, 0.38, 28), M.ceramic, 0, 0.19, 0.06); pan.scale.z = 1.45; A(pan);
      const seat = mesh(new THREE.TorusGeometry(0.15, 0.025, 10, 28), M.ceramic, 0, 0.39, 0.07); seat.rotation.x = Math.PI / 2; seat.scale.y = 1.4; A(seat);
      A(mesh(rbox(0.36, 0.4, 0.16, 0.03), M.ceramic, 0, 0.6, -0.24), mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.01, 18), M.chrome, 0, 0.805, -0.24));
      break;
    }
    case "basin": {
      A(mesh(rbox(0.5, 0.42, 0.38, 0.015), M.oak, 0, 0.52, -0.01), mesh(rbox(0.52, 0.09, 0.42, 0.03), M.ceramic, 0, 0.78, 0));
      const bowl = mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.02, 28), M.satin, 0, 0.82, 0.03, false); bowl.scale.z = 0.75; A(bowl);
      A(mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.16, 12), M.chrome, 0, 0.9, -0.15), mesh(new THREE.BoxGeometry(0.02, 0.016, 0.1), M.chrome, 0, 0.97, -0.11));
      break;
    }
    case "sink": {
      A(mesh(new THREE.BoxGeometry(0.72, 0.012, 0.42), M.steel, 0, 0.902, 0.02, false), mesh(new THREE.BoxGeometry(0.66, 0.006, 0.36), M.dark, 0, 0.905, 0.02, false));
      const neck = mesh(new THREE.TorusGeometry(0.12, 0.012, 10, 24, Math.PI), M.chrome, 0, 1.04, -0.08); neck.rotation.y = Math.PI / 2; A(neck, mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.14, 12), M.chrome, 0, 0.97, -0.2));
      break;
    }
    case "hob": {
      A(mesh(new THREE.BoxGeometry(0.58, 0.008, 0.5), M.dark, 0, 0.905, 0.02, false));
      for (const [x, z, r] of [[-0.14, -0.1, 0.09], [0.14, -0.1, 0.07], [-0.14, 0.13, 0.07], [0.14, 0.13, 0.09]]) { const ring = mesh(new THREE.RingGeometry(r - 0.006, r, 32), M.grey, x, 0.911, z + 0.02, false); ring.rotation.x = -Math.PI / 2; A(ring); }
      A(mesh(new THREE.BoxGeometry(0.58, 0.56, 0.01), M.dark, 0, 0.44, d / 2 + 0.004, false), mesh(new THREE.BoxGeometry(0.4, 0.016, 0.02), M.steel, 0, 0.66, d / 2 + 0.02, false));
      break;
    }
    case "dish": A(mesh(new THREE.BoxGeometry(0.58, 0.76, 0.012), M.steel, 0, 0.44, d / 2 + 0.006, false), mesh(new THREE.BoxGeometry(0.36, 0.016, 0.022), M.steel, 0, 0.78, d / 2 + 0.02, false)); break;
    case "washer": {
      A(mesh(rbox(0.6, 0.85, 0.6, 0.03), M.satin, 0, 0.425, 0));
      const door = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.02, 32), M.dark, 0, 0.42, 0.3); door.rotation.x = Math.PI / 2;
      const rim = mesh(new THREE.TorusGeometry(0.18, 0.018, 12, 36), M.chrome, 0, 0.42, 0.305); A(door, rim, mesh(new THREE.BoxGeometry(0.5, 0.06, 0.01), M.grey, 0, 0.77, 0.302, false));
      break;
    }
    case "tub": A(mesh(rbox(0.6, 0.86, 0.5, 0.02), M.satin, 0, 0.43, 0), mesh(new THREE.BoxGeometry(0.5, 0.012, 0.4), M.steel, 0, 0.865, 0.01, false), mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.18, 12), M.chrome, 0, 0.96, -0.18)); break;
    case "cyl": {
      A(mesh(new THREE.CylinderGeometry(0.27, 0.27, 1.42, 40), M.satin, 0, 0.73, 0));
      const dome = mesh(new THREE.SphereGeometry(0.27, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.satin, 0, 1.44, 0); dome.scale.y = 0.4; A(dome);
      A(mesh(new THREE.CylinderGeometry(0.272, 0.272, 0.05, 40), M.poche, 0, 1.1, 0, false), mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.02, 40), M.grey, 0, 0.01, 0));
      for (const x of [-0.09, 0.09]) A(mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.16, 12), M.copper, x, 1.6, 0));
      break;
    }
    case "hp-in": {
      o.position.y = b.c[1] - 0.15;
      A(mesh(rbox(w, 0.3, d, 0.05), M.satin, 0, 0.15, 0), mesh(new THREE.BoxGeometry(w - 0.12, 0.025, 0.01), M.dark, 0, 0.04, d / 2 - 0.02, false), mesh(new THREE.BoxGeometry(0.04, 0.012, 0.004), M.led, w / 2 - 0.1, 0.22, d / 2 + 0.002, false));
      break;
    }
    case "hp-out": {
      A(mesh(rbox(w, 0.65, d, 0.03), M.grey, 0, 0.36, 0));
      for (const r of [0.07, 0.12, 0.17, 0.22]) A(mesh(new THREE.TorusGeometry(r, 0.006, 6, 40), M.dark, -w / 2 + 0.3, 0.38, d / 2 + 0.004, false));
      A(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.012, 16), M.dark, -w / 2 + 0.3, 0.38, d / 2 + 0.006, false).rotateX(Math.PI / 2));
      for (const x of [-w / 2 + 0.08, w / 2 - 0.08]) A(mesh(new THREE.BoxGeometry(0.06, 0.04, d + 0.06), M.dark, x, 0.02, 0));
      break;
    }
    case "fan": { o.position.y = plate - 0.03; A(mesh(rbox(0.3, 0.03, 0.3, 0.012), M.satin, 0, 0.015, 0)); for (let i = -2; i <= 2; i++) A(mesh(new THREE.BoxGeometry(0.22, 0.004, 0.012), M.grey, 0, -0.001, i * 0.04, false)); break; }
    case "hood": {
      o.position.y = b.c[1] - 0.1;
      A(mesh(rbox(w, 0.08, d, 0.01), M.steel, 0, 0.04, 0), mesh(new THREE.BoxGeometry(0.26, plate - b.c[1] - 0.02, 0.24), M.steel, 0, 0.08 + (plate - b.c[1] - 0.02) / 2, 0));
      break;
    }
    case "board": { o.position.y = b.c[1] - 0.25; A(mesh(rbox(w, 0.5, d, 0.012), M.grey, 0, 0.25, 0), mesh(new THREE.BoxGeometry(0.004, 0.44, 0.004), M.dark, 0, 0.25, d / 2 + 0.002, false)); break; }
    default: return null;
  }
  return o;
}
function deviceModel(s, S, out, G) {
  const o = new THREE.Group(); o.position.set(s.u, s.h ?? 0, s.v);
  const face = s.face || [0, 1]; o.rotation.y = Math.atan2(face[0], face[1]);
  const plate = S.plate;
  switch (s.kind) {
    case "light": { const pool = mesh(new THREE.PlaneGeometry(1.5, 1.5), POOL.clone(), 0, -(plate - 0.008), 0, false); pool.rotation.x = -Math.PI / 2; pool.renderOrder = 2; pool.raycast = () => {}; o.add(pool); out.pools.push(pool); o.position.y = plate - 0.012; o.add(mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.022, 24), M.satin, 0, 0, 0, false)); const lamp = mesh(new THREE.CircleGeometry(0.048, 24), M.lamp.clone(), 0, -0.012, 0, false); lamp.rotation.x = Math.PI / 2; o.add(lamp); out.lamps.push(lamp); break; }
    case "alarm": { o.position.y = plate - 0.02; o.add(mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.035, 24), M.satin, 0, 0, 0, false)); const led = mesh(new THREE.SphereGeometry(0.008, 8, 6), M.led.clone(), 0.03, -0.019, 0, false); o.add(led); out.leds.push(led); break; }
    case "gpo": o.add(mesh(rbox(0.13, 0.075, 0.012, 0.004, 1), M.satin, 0, 0, 0, false), mesh(new THREE.BoxGeometry(0.018, 0.02, 0.004), M.dark, -0.03, 0, 0.007, false), mesh(new THREE.BoxGeometry(0.018, 0.02, 0.004), M.dark, 0.03, 0, 0.007, false)); break;
    case "switch": o.add(mesh(rbox(0.075, 0.075, 0.012, 0.004, 1), M.satin, 0, 0, 0, false), mesh(new THREE.BoxGeometry(0.03, 0.04, 0.008), M.grey, 0, 0, 0.008, false)); break;
    case "toby": o.position.y = G; o.add(mesh(rbox(0.32, 0.12, 0.22, 0.02), M.lid, 0, 0.06, 0)); break;
    case "gully": o.position.y = G; o.add(mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.16, 20), M.grey, 0, 0.08, 0), mesh(new THREE.BoxGeometry(0.18, 0.012, 0.18), M.steel, 0, 0.165, 0)); break;
    case "tap": o.position.y = 0.5; o.add(mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.1, 12), M.chrome, 0, 0, 0.05).rotateX(Math.PI / 2), mesh(new THREE.BoxGeometry(0.05, 0.012, 0.012), M.chrome, 0, 0.03, 0.08)); break;
    case "tv": o.position.y = -0.06; o.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.09, 12), M.brass, 0, 0, 0)); break;
    default: return null;
  }
  return o;
}

// ---------------------------------------------------------------------------------------------------- walls, roof, plan drawing
const GHOST = qs.get("walls") === "glass";
function wallPieces(w, centred, plate, CUT, parent) {
  const t0 = Math.max(w.thickness, 0.05), side = centred ? 0 : -(w.out ?? 1);
  const base = centred ? w.at : w.at + (side * t0) / 2;
  const ops = [...(w.openings || [])].sort((a, b) => a.a - b.a);
  const spans = []; let cur = w.from;
  for (const o of ops) { spans.push([cur, o.a, 0, plate]); cur = o.b; spans.push([o.a, o.b, 0, o.sill || 0]); spans.push([o.a, o.b, o.head ?? 2.1, plate]); }
  spans.push([cur, w.to, 0, plate]);
  const box = (a, b, y0, y1, mat, shadow) => {
    if (b - a < 1e-3 || y1 - y0 < 1e-3) return;
    const geo = w.axis === "x" ? new THREE.BoxGeometry(b - a, y1 - y0, t0) : new THREE.BoxGeometry(t0, y1 - y0, b - a);
    const m = mesh(geo, mat, 0, (y0 + y1) / 2, 0, shadow);
    if (w.axis === "x") m.position.set((a + b) / 2, (y0 + y1) / 2, base); else m.position.set(base, (y0 + y1) / 2, (a + b) / 2);
    parent.add(m); return m;
  };
  for (const [a, b, y0, y1] of spans) {
    // solid below the cut, glass above it, a plum cut face where the cut passes through
    box(a, b, y0, Math.min(y1, CUT), M.wall, true);
    if (y0 < CUT && y1 > CUT) { const p = box(a, b, CUT, CUT + 0.012, M.poche, false); }
    if (GHOST) { const gm = box(a, b, Math.max(y0, CUT + 0.012), y1, M.ghost, false); if (gm) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(gm.geometry), M.edge); e.position.copy(gm.position); parent.add(e); } }
  }
}
function roofLines(S) {
  const F = S.footprint, R = S.building.roof || { type: "gable", ridge: F.u1 - F.u0 >= F.v1 - F.v0 ? "x" : "z", pitchDeg: 15, eave: 0.45, verge: 0.25 };
  if (!/gable/i.test(R.type || "gable")) return null;
  const e = R.eave ?? 0.45, gV = R.verge ?? 0.25, tan = Math.tan(THREE.MathUtils.degToRad(R.pitchDeg ?? 15)), y0 = S.plate;
  const pts = [];
  const seg = (a, b) => pts.push(...a, ...b);
  if ((R.ridge || "x") === "x") {
    const x0 = F.u0 - gV, x1 = F.u1 + gV, z0 = F.v0 - e, z1 = F.v1 + e, zm = (F.v0 + F.v1) / 2, yr = y0 + (zm - z0) * tan;
    seg([x0, y0, z0], [x1, y0, z0]); seg([x0, y0, z1], [x1, y0, z1]); seg([x0, yr, zm], [x1, yr, zm]);
    for (const x of [x0, x1]) { seg([x, y0, z0], [x, yr, zm]); seg([x, y0, z1], [x, yr, zm]); }
  } else {
    const z0 = F.v0 - gV, z1 = F.v1 + gV, x0 = F.u0 - e, x1 = F.u1 + e, xm = (F.u0 + F.u1) / 2, yr = y0 + (xm - x0) * tan;
    seg([x0, y0, z0], [x0, y0, z1]); seg([x1, y0, z0], [x1, y0, z1]); seg([xm, yr, z0], [xm, yr, z1]);
    for (const z of [z0, z1]) { seg([x0, y0, z], [xm, yr, z]); seg([x1, y0, z], [xm, yr, z]); }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return new THREE.LineSegments(geo, M.roof);
}
function drawPlan(S) {
  const L = S.level, F = S.footprint, pad = 0.6, wM = F.u1 - F.u0 + 2 * pad, dM = F.v1 - F.v0 + 2 * pad;
  const px = Math.min(150, 2048 / Math.max(wM, dM)), c = document.createElement("canvas");
  c.width = Math.round(wM * px); c.height = Math.round(dM * px);
  const g = c.getContext("2d"), X = (u) => (u - F.u0 + pad) * px, Y = (v) => (v - F.v0 + pad) * px;
  g.fillStyle = "#FFFDFB"; g.fillRect(X(F.u0), Y(F.v0), (F.u1 - F.u0) * px, (F.v1 - F.v0) * px);
  for (const r of L.rooms) { g.fillStyle = "rgba(227,208,210,0.5)"; g.fillRect(X(r.u), Y(r.v), r.w * px, r.d * px); }
  g.fillStyle = "#654A4E";
  const band = (w, centred) => {
    const t0 = Math.max(w.thickness, 0.06), side = centred ? 0 : -(w.out ?? 1);
    let cur = w.from; const ops = [...(w.openings || [])].sort((a, b) => a.a - b.a); const spans = [];
    for (const o of ops) { spans.push([cur, o.a]); cur = o.b; }
    spans.push([cur, w.to]);
    const b0 = centred ? w.at - t0 / 2 : Math.min(w.at, w.at + side * t0);
    for (const [a, b] of spans) if (b > a) { if (w.axis === "x") g.fillRect(X(a), Y(b0), (b - a) * px, t0 * px); else g.fillRect(X(b0), Y(a), t0 * px, (b - a) * px); }
  };
  for (const w of L.walls) band(w, false);
  for (const p of L.partitions || []) band(p, true);
  g.font = `500 ${Math.round(px * 0.14)}px "IBM Plex Mono", ui-monospace, monospace`; g.fillStyle = "rgba(101,74,78,0.85)";
  for (const r of L.rooms) if (r.w > 0.9 && r.d > 0.6) g.fillText(r.name.toUpperCase(), X(r.u + 0.12), Y(r.v + 0.28));
  return c;
}
function gridTexture(span) {
  const n = 1024, c = document.createElement("canvas"); c.width = c.height = n;
  const g = c.getContext("2d"), step = n / span;
  g.strokeStyle = "rgba(101,74,78,0.10)"; g.lineWidth = 1;
  for (let i = 0; i <= span; i++) { const p = Math.round(i * step) + 0.5; g.beginPath(); g.moveTo(p, 0); g.lineTo(p, n); g.moveTo(0, p); g.lineTo(n, p); g.stroke(); }
  g.globalCompositeOperation = "destination-in";
  const gr = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(0.32, "rgba(0,0,0,0.8)"); gr.addColorStop(0.62, "rgba(0,0,0,0)");
  g.fillStyle = gr; g.fillRect(0, 0, n, n);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function segPointXZ(a, b, x, z) {
  const dx = b[0] - a[0], dz = b[2] - a[2], l2 = dx * dx + dz * dz; let t = l2 ? ((x - a[0]) * dx + (z - a[2]) * dz) / l2 : 0; t = Math.max(0, Math.min(1, t));
  return Math.hypot(a[0] + dx * t - x, a[2] + dz * t - z);
}

// ---------------------------------------------------------------------------------------------------- the panel
const legend = $("#legend"), hidden = new Set();
legend.innerHTML = ORDER.map((k) => `<button class="lg" type="button" data-sys="${k}" aria-pressed="true"><i style="background:${hex(SYSTEMS[k].color)}"></i><span class="lg-n">${SYSTEMS[k].name}</span><span class="lg-bar"><b></b></span><span class="lg-c mono">0/0</span></button>`).join("");
legend.addEventListener("click", (e) => { const b = e.target.closest(".lg"); if (!b) return; const k = b.dataset.sys; hidden.has(k) ? hidden.delete(k) : hidden.add(k); b.setAttribute("aria-pressed", String(!hidden.has(k))); });

let sel = qs.get("home") && (qs.get("home") === "all" || RESULTS.has(qs.get("home"))) ? qs.get("home") : homes[0].id;
const homesEl = $("#homes");
if (homes.length > 1) {
  homesEl.hidden = false;
  homesEl.innerHTML = [...homes.map((b) => `<button type="button" data-home="${b.id}">${nameOf(b)}</button>`), `<button type="button" data-home="all">${homes.length === 2 ? "Both" : "All"}</button>`].join("");
  homesEl.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b || b.dataset.home === sel) return; choose(b.dataset.home, true); });
}
function panelFor() {
  const ids = W.ids, list = ids.map((id) => RESULTS.get(id));
  const same = list.length > 1 && list.every((S) => JSON.stringify(S.checks.map((c) => [c.title, c.value, c.pass])) === JSON.stringify(list[0].checks.map((c) => [c.title, c.value, c.pass])));
  const block = (S, title) => `${title ? `<li class="ch-home mono">${title}</li>` : ""}${S.checks.map((c) => `<li data-id="${c.id}" class="${c.pass ? "" : "fail"}"><span class="ck" aria-hidden="true"></span><div><p class="ct">${c.title}</p><p class="cv mono">${c.clause} · ${c.value}</p>${c.fixed ? `<p class="cf">${c.fixed}</p>` : ""}</div></li>`).join("")}`;
  $("#checks").onclick = (e) => e.target.closest("li[data-id]")?.classList.toggle("open");
  $("#checks").innerHTML = same || list.length === 1 ? block(list[0], same ? `Both homes: the same plan, the same result` : "") : list.map((S) => block(S, nameOf(S.building))).join("");
  const stats = {};
  for (const S of list) for (const [k, v] of Object.entries(S.stats)) stats[k] = list.length > 1 && !same ? (stats[k] ? stats[k] + " · " : "") + v : v;
  $("#stats").innerHTML = Object.entries(stats).map(([k, v]) => `<li><i style="background:${hex(SYSTEMS[k].color)}"></i>${v}${same ? " (each)" : ""}</li>`).join("");
  const notes = [...new Set(list.flatMap((S) => S.notes))];
  $("#notes").innerHTML = notes.map((n) => `<li>${n}</li>`).join("");
  $("#parts-total").textContent = W.total.toLocaleString("en-NZ");
  const where = sel === "all" ? (homes.length === 2 ? "both homes" : "all homes") : nameOf(homes.find((b) => b.id === sel)).toLowerCase();
  $("#kick").textContent = `Plan to 4D · services · ${is16A ? "16A" : planName}${homes.length > 1 ? ` · ${where}` : ""}`;
  for (const b of homesEl.querySelectorAll("button")) b.setAttribute("aria-pressed", String(b.dataset.home === sel));
}

// ---------------------------------------------------------------------------------------------------- timeline
const END = 31;
let t = reduce ? END : 0, playing = !reduce, userMoved = false, explode = 0, explodeGoal = 0, orbit = 0;
const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const back = (x) => { x = Math.min(1, Math.max(0, x)); const c = 1.6; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const span = (a, b) => ease((t - a) / (b - a));
controls.addEventListener("start", () => { userMoved = true; });
const cam = { plan: { pos: V3(), tgt: V3() }, iso: { pos: V3(), tgt: V3() }, low: { pos: V3(), tgt: V3() }, shift: 0, lift: 0 };
let shotW = 0; const _p = V3(), _t = V3();
const EXPL = { drain: -0.95, water: -0.48, fix: 0, elec: 0.55, hvac: 1.15 };
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = V3(), _s = V3();

function apply(dt, now) {
  const k3 = span(8.0, 10.6); shotW = 0;
  // camera: top-down plan, then a slow tilt into 3D, then (until someone takes over) a slow turn round the model
  if (!userMoved) {
    if (t < 27.5 || reduce) { orbit = 0; camera.position.lerpVectors(cam.plan.pos, cam.iso.pos, k3); controls.target.lerpVectors(cam.plan.tgt, cam.iso.tgt, k3);
      // while the water and waste go in, drop low enough to see under the floor
      const lo = reduce ? 0 : span(13.0, 14.6) * (1 - span(17.8, 19.2)); if (lo > 0) { camera.position.lerp(cam.low.pos, lo); controls.target.lerp(cam.low.tgt, lo); } }
    else {
      orbit += dt * 0.05 * Math.min(1, (t - 27.5) / 2);
      const off = cam.iso.pos.clone().sub(cam.iso.tgt); off.applyAxisAngle(V3(0, 1, 0), orbit);
      camera.position.copy(cam.iso.tgt).add(off); controls.target.copy(cam.iso.tgt);
    }
    // the clash close-ups: fly to each cluster, hold while it reroutes, then pull back
    if (W.shots.length && !reduce) {
      const n = W.shots.length;
      W.shots.forEach((s, i) => { const a = span(19.4 + i * 2, 20.7 + i * 2), o = i < n - 1 ? span(19.4 + (i + 1) * 2, 20.7 + (i + 1) * 2) : span(25.3, 26.9); s.w = a * (1 - o); shotW += s.w; });
      if (shotW > 0.001) { _p.copy(camera.position).multiplyScalar(1 - shotW); _t.copy(controls.target).multiplyScalar(1 - shotW); for (const s of W.shots) { _p.addScaledVector(s.pos, s.w); _t.addScaledVector(s.tgt, s.w); } camera.position.copy(_p); controls.target.copy(_t); }
    }
    const ex = ease(explode);
    if (ex > 0.001) { const off = camera.position.clone().sub(controls.target).multiplyScalar(1 + 0.18 * ex); controls.target.y -= 0.3 * ex; camera.position.copy(controls.target).add(off); }
    camera.lookAt(controls.target);
  }
  controls.enabled = t >= 10.6;
  controls.minDistance = shotW > 0.001 ? 0.4 : cam.minD; controls.maxPolarAngle = Math.PI * (shotW > 0.001 ? 0.62 : 0.47);
  workLight.intensity = 7 * shotW; if (shotW > 0.001) workLight.position.copy(camera.position).add(_p.set(0, 0.2, 0));
  if (bokeh) { bokeh.uniforms.focus.value = camera.position.distanceTo(controls.target); bokeh.uniforms.aperture.value = 0.0003 + 0.0065 * shotW; }
  setShift(k3);
  // plan and floor: the plan fades in, then the floor turns to a pale sheet you can see the subfloor through
  for (const { mat } of W.planMats) mat.opacity = Math.min(1, t / 0.8) * (1 - span(8.4, 10.8));
  M.ghost.opacity = 0.075 * span(8.6, 10.4); M.edge.opacity = 0.13 * span(8.6, 10.4); M.roof.opacity = 0.2 * span(9.6, 11);
  for (const w of W.walls) w.g.scale.y = Math.max(0.001, back((t - w.t) / 0.7));
  // symbols pop in on the plan, then go as the 3D parts arrive
  let symPlaced = 0; const symBy = Object.fromEntries(ORDER.map((k) => [k, 0]));
  for (const x of W.symbols) {
    const k = back((t - x.t) / 0.35), gone = span(10.2, 11.2);
    x.g.scale.setScalar(Math.max(0.0001, k * (1 - gone)));
    x.g.visible = !hidden.has(x.sys) && gone < 1 && t > x.t;
    if (t >= x.t) { symPlaced++; symBy[x.sys]++; }
  }
  // 3D: fixtures drop in with a soft landing; runs draw themselves on the first-pass route, with a bright tip
  const morph = 1 - span(23.4, 25.0);
  let partsPlaced = 0, tips = 0; const partsBy = Object.fromEntries(ORDER.map((k) => [k, 0]));
  for (const p of W.pieces) {
    const vis = !hidden.has(p.sys);
    if (p.mesh) {
      const k = Math.min(1, Math.max(0, (t - p.t) / p.dur)), ke = ease(k);
      p.mesh.visible = vis && k > 0;
      p.mesh.geometry.setDrawRange(0, Math.floor(ke * p.segs) * p.radial * 6);
      p.mesh.morphTargetInfluences[0] = morph;
      if (k > 0 && k < 1 && vis && tips < 96) {
        const a = p.curveF.getPointAt(ke), b = p.curveI.getPointAt(ke); _v.lerpVectors(a, b, morph);
        p.mesh.parent.localToWorld(_v); W.root.worldToLocal(_v);
        _m.compose(_v, _q, _s.setScalar(Math.max(0.018, p.rad * 1.5))); W.tips.setMatrixAt(tips++, _m);
      }
      if (t >= p.t + p.dur * 0.5) { partsPlaced += p.parts; partsBy[p.sys] += p.parts; }
    } else {
      const k = Math.min(1, Math.max(0, (t - p.t) / 0.6));
      p.obj.visible = vis && k > 0;
      p.obj.position.copy(p.home); p.obj.position.y += (1 - back(k)) * 0.9;
      if (t >= p.t + 0.3) { partsPlaced += p.parts; partsBy[p.sys] += p.parts; }
    }
  }
  W.tips.count = tips; W.tips.instanceMatrix.needsUpdate = true;
  // the first pass's clash points flash, then clear as each system moves to its own level
  const c = span(19.4, 19.9) * (1 - span(24.5, 25.3));
  M.clash.opacity = c; M.ring.opacity = c * (0.16 + 0.1 * Math.sin(now / 240));
  for (const x of W.clashes) x.g.visible = c > 0.01;
  const nFirst = W.ids.reduce((s, id) => s + RESULTS.get(id).firstClashes.count, 0), nFinal = W.ids.reduce((s, id) => s + RESULTS.get(id).finalClashes.count, 0);
  const clashState = t < 19.4 ? "" : t < 24.2 ? `First pass: ${nFirst} hard clashes` : `Rerouted, each system on its own level: ${nFinal} clashes`;
  $("#clash").textContent = clashState; $("#clash").classList.toggle("ok", t >= 24.2);
  // fittings and clips go on once the route is final
  W.fittings.forEach((f, i) => { const k = back((t - 25.2 - (i % 40) * 0.02) / 0.4); f.scale.setScalar(Math.max(0.0001, k)); f.visible = k > 0.001 && !hidden.has(f.parent.userData.sys); });
  // pull the systems apart (and back)
  explode += (explodeGoal - explode) * (1 - Math.exp(-dt * 4));
  for (const g of W.sysGroups) g.position.y = EXPL[g.userData.sys] * ease(explode);
  // lights on, alarms blinking, water, waste, air and power moving
  const on = span(26.4, 27.4);
  for (const l of W.lamps) l.material.color.setRGB(0.85 + 0.15 * on, 0.82 + 0.13 * on, 0.8 + 0.02 * on);
  for (const p of W.pools) { p.material.opacity = 0.42 * on; p.visible = on > 0.01 && !hidden.has("elec"); p.position.y = -(p.parent.position.y - 0.006) - EXPL.elec * ease(explode); }
  const blink = on > 0 && Math.floor(now / 900) % 3 === 0;
  for (const l of W.leds) l.visible = on > 0.5 ? blink : true;
  flows(on, now);
  // the counter, the legend, the checks
  const in3d = t >= 10.6, inClash = t >= 19.4 && t < 25.6 && nFirst > 0;
  $("#count").textContent = (inClash ? Math.round(nFinal + (nFirst - nFinal) * morph) : in3d ? partsPlaced : symPlaced).toLocaleString("en-NZ");
  $("#count-of").textContent = inClash ? "" : "/ " + (in3d ? W.total : W.symbols.length).toLocaleString("en-NZ");
  $("#count-cap").textContent = inClash ? (morph > 0.5 ? "clashes, first pass" : "clashes left") : in3d ? "parts placed" : "symbols on the plan";
  for (const b of legend.querySelectorAll(".lg")) {
    const k = b.dataset.sys, n = in3d ? partsBy[k] : symBy[k], of = in3d ? W.counts[k].parts : W.counts[k].sym;
    b.querySelector(".lg-bar b").style.width = `${of ? (n / of) * 100 : 0}%`; b.querySelector(".lg-c").textContent = `${n}/${of}`;
  }
  $("#panel").classList.toggle("show", t >= 26.0);
  [...$("#checks").querySelectorAll("li[data-id]")].forEach((li, i) => li.classList.toggle("in", t >= 26.4 + i * 0.3));
  $("#seek").value = String(Math.round((Math.min(t, END) / END) * 1000));
  $("#play").textContent = playing ? "Pause" : t >= END ? "Replay" : "Play";
  $("#apart").disabled = t < 26.0;
}

// flow beads: instanced per system and home, moving along each final route
const FLOW = new Map();
function flowMeshes() {
  for (const [, im] of FLOW) im.parent?.remove(im);
  FLOW.clear();
  const geo = new THREE.SphereGeometry(1, 10, 8);
  const groups = new Map();
  for (const f of W.flows) { const key = f.group.uuid + (f.hot ? "h" : ""); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(f); }
  for (const [key, list] of groups) {
    const im = new THREE.InstancedMesh(geo, list[0].hot ? BEAD.hot : BEAD[list[0].sys], list.length);
    im.frustumCulled = false; im.userData.list = list; im.visible = false; list[0].group.add(im); FLOW.set(key, im);
  }
}
const SPEED = { water: 0.9, drain: 0.45, hvac: 1.1, elec: 2.2 };
function flows(on, now) {
  const show = on > 0.2 && !reduce;
  for (const [, im] of FLOW) {
    const list = im.userData.list, sys = list[0].sys;
    im.visible = show && !hidden.has(sys);
    if (!im.visible) continue;
    for (let i = 0; i < list.length; i++) {
      const f = list[i], u = (f.phase + (now / 1000) * SPEED[sys] / f.len) % 1;
      f.curve.getPointAt(u, _v);
      const r = f.rad * (sys === "drain" ? 1.18 : 1.5);
      _m.compose(_v, _q, _s.setScalar(r * Math.min(1, on * 1.2))); im.setMatrixAt(i, _m);
    }
    im.instanceMatrix.needsUpdate = true;
  }
}

// hover and tap labels
const tip = $("#tip"), ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let lastPick = 0;
canvas.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") pick(e); });
canvas.addEventListener("pointerup", (e) => { if (e.pointerType !== "mouse") pick(e); });
canvas.addEventListener("pointerleave", () => { tip.hidden = true; });
function pick(e) {
  if (t < 10.6 || performance.now() - lastPick < 40) return; lastPick = performance.now();
  const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const objs = W.pieces.filter((p) => (p.mesh || p.obj).visible).map((p) => p.mesh || p.obj);
  const hit = ray.intersectObjects(objs, true)[0];
  if (!hit) { tip.hidden = true; return; }
  let o = hit.object; while (o && !o.userData.label) o = o.parent;
  const p = W.pieces.find((x) => (x.mesh || x.obj) === o);
  if (!o) { tip.hidden = true; return; }
  tip.innerHTML = `<i style="background:${hex(p?.hot ? HOT : SYSTEMS[p?.sys || "fix"].color)}"></i>${o.userData.label}`;
  tip.hidden = false; tip.style.left = `${Math.min(r.width - 240, e.clientX - r.left + 14)}px`; tip.style.top = `${e.clientY - r.top + 14}px`;
}

// ---------------------------------------------------------------------------------------------------- framing
function setShift(k) {
  const w = canvas.clientWidth, h = canvas.clientHeight, px = cam.shift * k, py = cam.lift * k * (1 - 0.9 * shotW);
  if (px > 0.5 || py > 0.5) { camera.aspect = (w + px) / (h + py); camera.setViewOffset(w + px, h + py, px, py, w, h); }
  else { camera.aspect = w / h; camera.clearViewOffset(); }
  camera.updateProjectionMatrix();
}
function frame() {
  const w = canvas.clientWidth, h = canvas.clientHeight, a = w / h;
  renderer.setSize(w, h, false); if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); }
  const bb = W.bounds, c = bb.getCenter(V3()), size = bb.getSize(V3());
  const vf = THREE.MathUtils.degToRad(camera.fov), wide = a > 1.2;
  cam.shift = wide ? Math.min(380, w * 0.26) : 0; cam.lift = a < 0.8 ? h * 0.44 : 0;
  const aEff = (w + cam.shift) / (h + cam.lift), hf = 2 * Math.atan(Math.tan(vf / 2) * aEff);
  // top-down: fit the plan with room for the cards
  const needV = (size.z + 1.2) / (2 * Math.tan(vf / 2)), needH = (size.x + 1.0) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * a);
  cam.plan.tgt.copy(c).setY(0); cam.plan.pos.set(c.x, Math.max(needV, needH) * (phone ? 1.22 : 1.12) + 1, c.z + 0.01);
  // 3D: from the south-west and above, far enough to hold the whole model
  const rad = 0.5 * Math.hypot(size.x, size.z, size.y + 1.2);
  const d = Math.max(rad / Math.sin(vf / 2), rad / Math.sin(hf / 2)) * (phone ? 1.0 : 0.7);
  const dir = V3(-0.52, 0.5, 0.8).normalize();
  cam.iso.tgt.set(c.x, 0.4, c.z + (wide ? 0 : 0.3)); cam.iso.pos.copy(cam.iso.tgt).addScaledVector(dir, d);
  cam.low.tgt.set(c.x, -0.3, c.z); cam.low.pos.copy(cam.low.tgt).addScaledVector(V3(-0.5, 0.085, 0.86).normalize(), d * 0.72);
  cam.minD = d * 0.25; controls.maxDistance = d * 2.2;
}
new ResizeObserver(() => frame()).observe(canvas);

// ---------------------------------------------------------------------------------------------------- start, switch home, playback
function choose(id, replay) {
  sel = id; build(sel); flowMeshes(); frame(); panelFor();
  if (replay) { t = reduce ? END : 9.0; playing = !reduce; userMoved = false; orbit = 0; }
  const u = new URL(location.href); if (id === homes[0].id) u.searchParams.delete("home"); else u.searchParams.set("home", id); history.replaceState(null, "", u);
}
choose(sel, false);
let last = performance.now();
renderer.setAnimationLoop((now) => {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (playing) { t = Math.min(END, t + dt); if (t >= END) playing = false; }
  apply(dt, now); controls.update(); if (composer) composer.render(dt); else renderer.render(scene, camera);
});
$("#play").addEventListener("click", () => { if (t >= END) { t = 0; userMoved = false; orbit = 0; explodeGoal = 0; } playing = !playing; });
$("#skip").addEventListener("click", () => { t = END; playing = false; });
$("#seek").addEventListener("input", (e) => { t = (Number(e.target.value) / 1000) * END; playing = false; if (t < 10.6) userMoved = false; });
$("#apart").addEventListener("click", (e) => { explodeGoal = explodeGoal ? 0 : 1; e.currentTarget.setAttribute("aria-pressed", String(!!explodeGoal)); e.currentTarget.textContent = explodeGoal ? "Put it back together" : "Pull the systems apart"; });

// drop a plan model (.json) straight onto this page
const zone = $("#dropzone");
addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("on"); });
addEventListener("dragleave", (e) => { if (!e.relatedTarget) zone.classList.remove("on"); });
addEventListener("drop", async (e) => {
  e.preventDefault(); zone.classList.remove("on");
  const f = e.dataTransfer?.files?.[0]; if (!f) return;
  try {
    const plan = JSON.parse(await f.text());
    if (!Array.isArray(plan.buildings)) throw new Error("no buildings");
    sessionStorage.setItem(KEEP, JSON.stringify({ plan, name: f.name }));
    location.search = "?plan=dropped";
  } catch { $("#source").textContent = "That file isn't a plan model. Drop the .json that Plan to 4D saves, or use the drop tool for a PDF."; }
});
if (!is16A) $("#source").textContent = `Services for ${planName}, read from the plan you dropped into Plan to 4D. It stays in this browser tab.`;
window.__services = { RESULTS, setT: (x) => { t = x; playing = false; }, explode: (v) => { explodeGoal = v; explode = v; }, choose, cam: (p, tg) => { userMoved = true; camera.position.set(...p); controls.target.set(...tg); camera.lookAt(controls.target); } };
