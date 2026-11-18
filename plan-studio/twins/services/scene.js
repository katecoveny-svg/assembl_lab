// 16A services: the plan model's services placed as symbols on the plan, then assembled in 3D, then checked.
// Everything shown is computed in model.js from plan16a.json at load. three.js r170.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { SYSTEMS, HOT, buildServices } from "./model.js";

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s) => document.querySelector(s);
const model = await (await fetch("./plan16a.json")).json();
const S = buildServices(model);
const L = S.level, W = 10.8, D = 6.0, CX = W / 2, CZ = D / 2 + 0.5;

// ---------------------------------------------------------------------------------------------------- renderer
const canvas = $("#stage");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xfdfaf8);
const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 200);
const controls = new OrbitControls(camera, canvas);
controls.target.set(CX, 0.6, CZ); controls.enableDamping = true; controls.enabled = false;
controls.maxPolarAngle = Math.PI * 0.49; controls.minDistance = 6; controls.maxDistance = 40;
scene.add(new THREE.HemisphereLight(0xffffff, 0xe9dcdc, 1.25));
const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.position.set(6, 16, 9); scene.add(sun);

// ground, slab and the plan drawn on the floor
const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshBasicMaterial({ color: 0xf6efed }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -0.64; scene.add(ground);
const slab = new THREE.Mesh(new THREE.BoxGeometry(W, 0.04, D), new THREE.MeshStandardMaterial({ color: 0xeadcdf, transparent: true, opacity: 0.5, roughness: 1 }));
slab.position.set(CX, -0.03, D / 2); scene.add(slab);
const planTex = new THREE.CanvasTexture(drawPlan()); planTex.colorSpace = THREE.SRGBColorSpace; planTex.anisotropy = 8;
const planMat = new THREE.MeshBasicMaterial({ map: planTex, transparent: true });
const planMesh = new THREE.Mesh(new THREE.PlaneGeometry(W + 1.2, D + 1.2), planMat);
planMesh.rotation.x = -Math.PI / 2; planMesh.position.set(CX, 0.003, D / 2); scene.add(planMesh);

// walls: glass-like ghosts with plum edges, cut at the openings
const wallMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0, roughness: 0.4, depthWrite: false });
const edgeMat = new THREE.LineBasicMaterial({ color: 0x654a4e, transparent: true, opacity: 0 });
const walls = new THREE.Group(); scene.add(walls);
for (const w of [...L.walls, ...(L.partitions || [])]) wallPieces(w, !!L.partitions?.includes(w));

// ---------------------------------------------------------------------------------------------------- symbols on the plan
const order = ["fix", "hvac", "water", "drain", "elec"];
const sysMat = Object.fromEntries(Object.entries(SYSTEMS).map(([k, v]) => [k, new THREE.MeshStandardMaterial({ color: v.color, roughness: 0.45, metalness: 0.05 })]));
const hotMat = new THREE.MeshStandardMaterial({ color: HOT, roughness: 0.45 });
const symMat = Object.fromEntries(Object.entries(SYSTEMS).map(([k, v]) => [k, new THREE.MeshBasicMaterial({ color: v.color, transparent: true })]));
const symbols = [...S.sym].sort((a, b) => order.indexOf(a.sys) - order.indexOf(b.sys)).map((s, i) => {
  const g = new THREE.Group();
  const shape = s.sys === "fix" ? new THREE.PlaneGeometry(0.26, 0.26) : s.sys === "elec" ? new THREE.CircleGeometry(0.085, 20) : new THREE.CircleGeometry(0.13, 24);
  const m = new THREE.Mesh(shape, symMat[s.sys]); m.rotation.x = -Math.PI / 2; g.add(m);
  const ring = new THREE.Mesh(new THREE.RingGeometry(s.sys === "elec" ? 0.11 : 0.16, s.sys === "elec" ? 0.125 : 0.18, 28), symMat[s.sys]); ring.rotation.x = -Math.PI / 2; g.add(ring);
  g.position.set(s.u, 0.012 + i * 0.0001, s.v); g.scale.setScalar(0.0001); scene.add(g);
  return { s, g, t: 1.0 + (i / Math.max(1, S.sym.length - 1)) * 6.6 };
});

// ---------------------------------------------------------------------------------------------------- 3D elements
const pieces = [];   // { sys, g, t, parts }
const runsSorted = [...S.runs].sort((a, b) => order.indexOf(a.sys) - order.indexOf(b.sys));
const boxesSorted = [...S.boxes].sort((a, b) => order.indexOf(a.sys) - order.indexOf(b.sys));
const fixMat = new THREE.MeshStandardMaterial({ color: 0xe7e1e1, roughness: 0.6 });
const fixEdge = new THREE.LineBasicMaterial({ color: 0x6e6468, transparent: true, opacity: 0.55 });
for (const b of boxesSorted) {
  const g = new THREE.Group();
  const geo = new THREE.BoxGeometry(...b.s);
  const mesh = new THREE.Mesh(geo, b.sys === "fix" ? fixMat : sysMat[b.sys]); g.add(mesh);
  if (b.sys === "fix") g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), fixEdge));
  g.position.set(...b.c); g.userData.home = g.position.clone(); scene.add(g); g.visible = false;
  pieces.push({ sys: b.sys, g, parts: 1 });
}
for (const r of runsSorted) {
  const g = new THREE.Group();
  const mat = r.sys === "water" && r.hot ? hotMat : sysMat[r.sys];
  for (let i = 1; i < r.pts.length; i++) {
    const a = new THREE.Vector3(...r.pts[i - 1]), b = new THREE.Vector3(...r.pts[i]);
    const len = a.distanceTo(b); if (len < 1e-4) continue;
    const geo = r.w ? new THREE.BoxGeometry(r.w, len, r.h) : new THREE.CylinderGeometry(r.r, r.r, len, r.r > 0.02 ? 14 : 8);
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    g.add(m);
    if (i < r.pts.length - 1 && !r.w) { const j = new THREE.Mesh(new THREE.SphereGeometry(r.r * 1.35, 10, 8), mat); j.position.copy(b); g.add(j); }
  }
  g.userData.home = new THREE.Vector3(); scene.add(g); g.visible = false;
  pieces.push({ sys: r.sys, g, parts: Math.max(1, r.pts.length - 1) + Math.max(0, r.pts.length - 2) });
}
// symbol-only devices (switches, sockets, lights, alarms, traps) get a small body in 3D too
for (const s of S.sym.filter((x) => x.sys === "elec" && x.kind !== "board")) {
  const g = new THREE.Group();
  const geo = s.kind === "light" ? new THREE.CylinderGeometry(0.09, 0.09, 0.03, 18) : s.kind === "alarm" ? new THREE.CylinderGeometry(0.07, 0.07, 0.05, 16) : new THREE.BoxGeometry(0.09, 0.12, 0.09);
  g.add(new THREE.Mesh(geo, sysMat.elec)); g.position.set(s.u, s.h ?? 0.3, s.v); g.userData.home = g.position.clone(); scene.add(g); g.visible = false;
  pieces.push({ sys: "elec", g, parts: 1 });
}
pieces.sort((a, b) => order.indexOf(a.sys) - order.indexOf(b.sys));
const TOTAL_PARTS = pieces.reduce((t, p) => t + p.parts, 0);
pieces.forEach((p, i) => { p.t = 10.6 + (i / Math.max(1, pieces.length - 1)) * 8.6; });

// first-pass clash points (on their flattened levels), shown briefly before the reroute
const clashMat = new THREE.MeshBasicMaterial({ color: 0xc0392b, transparent: true, opacity: 0 });
const clashMarks = S.firstClashes.at.map((p) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), clashMat); m.position.set(...p); scene.add(m); return m; });

// ---------------------------------------------------------------------------------------------------- the panel
const counts = Object.fromEntries(order.map((k) => [k, { sym: S.sym.filter((s) => s.sys === k).length, parts: pieces.filter((p) => p.sys === k).reduce((t, p) => t + p.parts, 0) }]));
const legend = $("#legend");
legend.innerHTML = order.map((k) => `<button class="lg" type="button" data-sys="${k}" aria-pressed="true"><i style="background:#${SYSTEMS[k].color.toString(16).padStart(6, "0")}"></i><span class="lg-n">${SYSTEMS[k].name}</span><span class="lg-bar"><b></b></span><span class="lg-c mono">0/0</span></button>`).join("");
const hidden = new Set();
legend.addEventListener("click", (e) => {
  const b = e.target.closest(".lg"); if (!b) return; const k = b.dataset.sys;
  hidden.has(k) ? hidden.delete(k) : hidden.add(k); b.setAttribute("aria-pressed", String(!hidden.has(k))); kick();
});
$("#checks").innerHTML = S.checks.map((c) => `<li data-id="${c.id}"><span class="ck" aria-hidden="true"></span><div><p class="ct">${c.title}</p><p class="cv mono">${c.clause} · ${c.value}</p>${c.fixed ? `<p class="cf">${c.fixed}</p>` : ""}</div></li>`).join("");
$("#stats").innerHTML = Object.entries(S.stats).map(([k, v]) => `<li><i style="background:#${SYSTEMS[k].color.toString(16).padStart(6, "0")}"></i>${v}</li>`).join("");
$("#parts-total").textContent = TOTAL_PARTS.toLocaleString("en-NZ");

// ---------------------------------------------------------------------------------------------------- timeline
const END = 27.5;
let t = reduce ? END : 0, playing = !reduce, last = performance.now(), userMoved = false;
const camPlan = { pos: new THREE.Vector3(CX, 15.5, CZ + 0.01), tgt: new THREE.Vector3(CX, 0, CZ) };
const camIso = { pos: new THREE.Vector3(CX - 7.2, 8.6, CZ + 11.6), tgt: new THREE.Vector3(CX, 0.5, CZ - 0.3) };
const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const span = (a, b) => ease((t - a) / (b - a));
controls.addEventListener("start", () => { userMoved = true; });

function apply() {
  // camera: plan, then a slow tilt into 3D (until someone takes over)
  if (!userMoved || t < 10.6) {
    const k = span(8.0, 10.6);
    camera.position.lerpVectors(camPlan.pos, camIso.pos, k);
    controls.target.lerpVectors(camPlan.tgt, camIso.tgt, k);
    camera.lookAt(controls.target);
  }
  controls.enabled = t >= 10.6;
  // the plan on the floor fades back as the walls come up
  planMat.opacity = 1 - 0.55 * span(8.4, 10.4);
  wallMat.opacity = 0.16 * span(8.4, 10.4); edgeMat.opacity = 0.42 * span(8.4, 10.4);
  // symbols pop in, then settle to small markers in 3D
  let symPlaced = 0; const symBy = Object.fromEntries(order.map((k) => [k, 0]));
  for (const x of symbols) {
    const k = span(x.t, x.t + 0.35);
    const settle = 1 - 0.55 * span(9.0, 10.4);
    x.g.scale.setScalar(Math.max(0.0001, (k < 1 ? k * 1.18 : 1) * settle));
    x.g.visible = !hidden.has(x.s.sys);
    if (t >= x.t) { symPlaced++; symBy[x.s.sys]++; }
  }
  // 3D pieces drop into place
  let partsPlaced = 0; const partsBy = Object.fromEntries(order.map((k) => [k, 0]));
  for (const p of pieces) {
    const k = span(p.t, p.t + 0.7);
    p.g.visible = k > 0 && !hidden.has(p.sys);
    p.g.position.copy(p.g.userData.home); p.g.position.y += (1 - k) * 2.6;
    p.g.scale.setScalar(0.6 + 0.4 * k);
    if (t >= p.t + 0.35) { partsPlaced += p.parts; partsBy[p.sys] += p.parts; }
  }
  // clashes: the first pass's clash points flash red, then clear as each system moves to its own level
  const c = span(19.6, 20.2) * (1 - span(21.4, 22.2));
  clashMat.opacity = c * 0.85;
  const clashState = t < 19.6 ? "" : t < 21.4 ? `First pass: ${S.firstClashes.count} hard clashes` : `Rerouted onto separate levels: ${S.finalClashes.count} clashes`;
  $("#clash").textContent = clashState; $("#clash").classList.toggle("on", !!clashState && t < 24.5); $("#clash").classList.toggle("ok", t >= 21.4);
  // the counter
  const in3d = t >= 10.6;
  $("#count").textContent = (in3d ? partsPlaced : symPlaced).toLocaleString("en-NZ");
  $("#count-of").textContent = "/ " + (in3d ? TOTAL_PARTS : S.sym.length).toLocaleString("en-NZ");
  $("#count-cap").textContent = in3d ? "3D parts placed" : "plan symbols placed";
  for (const b of legend.querySelectorAll(".lg")) {
    const k = b.dataset.sys, n = in3d ? partsBy[k] : symBy[k], of = in3d ? counts[k].parts : counts[k].sym;
    b.querySelector(".lg-bar b").style.width = `${of ? (n / of) * 100 : 0}%`; b.querySelector(".lg-c").textContent = `${n}/${of}`;
  }
  // checks tick in
  const panel = $("#panel"); panel.classList.toggle("show", t >= 22.2);
  [...$("#checks").children].forEach((li, i) => li.classList.toggle("in", t >= 22.6 + i * 0.42));
  $("#seek").value = String(Math.round((t / END) * 1000));
  $("#play").textContent = playing ? "Pause" : t >= END ? "Replay" : "Play";
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (playing) { t = Math.min(END, t + dt); if (t >= END) playing = false; }
  apply(); controls.update(); renderer.render(scene, camera);
  if (playing || controls.enabled) requestAnimationFrame(frame); else running = false;
}
let running = false;
function kick() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } }
controls.addEventListener("change", kick);

$("#play").addEventListener("click", () => { if (t >= END) { t = 0; userMoved = false; } playing = !playing; kick(); });
$("#skip").addEventListener("click", () => { t = END; playing = false; kick(); });
$("#seek").addEventListener("input", (e) => { t = (Number(e.target.value) / 1000) * END; playing = false; if (t < 10.6) userMoved = false; kick(); });

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight, a = w / h;
  renderer.setSize(w, h, false); camera.aspect = a;
  // fit the plan (about 12.4 x 8.4 m with its surroundings) whatever the screen's shape
  const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  camPlan.pos.y = Math.max(8.6 / (2 * tanH), 12.6 / (2 * tanH * a)) * 1.05;
  // 3D: the same view, pulled back on narrow screens; on wide screens the house sits left of the checks panel
  const k = Math.max(1.18, 1.6 / a), wide = a > 1.2;
  camIso.tgt.set(CX + (wide ? 1.6 : 0), 0.5, CZ - 0.3 + (wide ? 0 : 0.6));
  camIso.pos.set(camIso.tgt.x - 7.2 * k, 0.5 + 8.1 * k, camIso.tgt.z + 11.9 * k);
  camera.updateProjectionMatrix(); kick();
}
addEventListener("resize", resize); resize();
window.__services = { S, setT: (x) => { t = x; playing = false; kick(); } };

// ---------------------------------------------------------------------------------------------------- helpers
function wallPieces(w, centred) {
  const t0 = Math.max(w.thickness, 0.05), H = L.plate;
  const side = centred ? 0 : -(w.out ?? 1);
  const base = centred ? w.at : w.at + (side * t0) / 2;
  const spans = []; let cur = w.from;
  const ops = [...(w.openings || [])].sort((a, b) => a.a - b.a);
  for (const o of ops) { spans.push([cur, o.a, 0, H]); cur = o.b; spans.push([o.a, o.b, 0, o.sill || 0]); spans.push([o.a, o.b, o.head ?? 2.1, H]); }
  spans.push([cur, w.to, 0, H]);
  for (const [a, b, y0, y1] of spans) {
    if (b - a < 1e-3 || y1 - y0 < 1e-3) continue;
    const geo = w.axis === "x" ? new THREE.BoxGeometry(b - a, y1 - y0, t0) : new THREE.BoxGeometry(t0, y1 - y0, b - a);
    const m = new THREE.Mesh(geo, wallMat);
    if (w.axis === "x") m.position.set((a + b) / 2, (y0 + y1) / 2, base); else m.position.set(base, (y0 + y1) / 2, (a + b) / 2);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat); e.position.copy(m.position);
    walls.add(m, e);
  }
}

function drawPlan() {
  const px = 140, pad = 0.6, c = document.createElement("canvas");
  c.width = Math.round((W + 2 * pad) * px); c.height = Math.round((D + 2 * pad) * px);
  const g = c.getContext("2d"), X = (u) => (u + pad) * px, Y = (v) => (v + pad) * px;
  g.fillStyle = "rgba(255,253,251,0.0)"; g.fillRect(0, 0, c.width, c.height);
  for (const r of L.rooms) { g.fillStyle = "rgba(227,208,210,0.55)"; g.fillRect(X(r.u), Y(r.v), r.w * px, r.d * px); }
  g.fillStyle = "#654A4E";
  const band = (w, centred) => {
    const t0 = Math.max(w.thickness, 0.06), side = centred ? 0 : -(w.out ?? 1), base = centred ? w.at - t0 / 2 : w.at + (side < 0 ? -t0 : 0) + (side > 0 ? 0 : 0);
    let cur = w.from; const ops = [...(w.openings || [])].sort((a, b) => a.a - b.a); const spans = [];
    for (const o of ops) { spans.push([cur, o.a]); cur = o.b; }
    spans.push([cur, w.to]);
    const b0 = centred ? w.at - t0 / 2 : Math.min(w.at, w.at + side * t0);
    for (const [a, b] of spans) if (b > a) { if (w.axis === "x") g.fillRect(X(a), Y(b0), (b - a) * px, t0 * px); else g.fillRect(X(b0), Y(a), t0 * px, (b - a) * px); }
  };
  for (const w of L.walls) band(w, false);
  for (const p of L.partitions || []) band(p, true);
  g.font = `500 ${Math.round(px * 0.15)}px "IBM Plex Mono", ui-monospace, monospace`; g.textAlign = "left"; g.fillStyle = "rgba(101,74,78,0.85)";
  for (const r of L.rooms) g.fillText(r.name.toUpperCase(), X(r.u + 0.14), Y(r.v + 0.3));
  return c;
}
