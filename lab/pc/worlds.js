// assembl lab · the business twins as small 3D models, for the point-cloud look. Each twin is built here from plain three.js
// geometry, in metres with the ground at y = 0 and parts named by what they are, so the same model can be a twin card's still and
// a piece of the hero's diorama ("Small worlds, assembled": the twins standing together on one piece of land by a harbour).
// The places are invented, like the twins themselves; nothing here is a real site.
import * as THREE from "three";
import { makeForm, normalise, objectForm, resample, rng, KIND } from "./engine.js";

// ------------------------------------------------------------------------------------------------ geometry helpers
const mesh = (geo, x, y, z, { w = 1, ry = 0, rx = 0, rz = 0, name = "" } = {}) => { const m = new THREE.Mesh(geo); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.userData.w = w; m.name = name; return m; };
const box = (sx, sy, sz, x = 0, y = 0, z = 0, o = {}) => mesh(new THREE.BoxGeometry(sx, sy, sz), x, y + sy / 2, z, o);
const cyl = (r, h, x = 0, y = 0, z = 0, o = {}) => mesh(new THREE.CylinderGeometry(o.top ?? r, r, h, o.seg ?? 20), x, y + h / 2, z, o);
const group = (name, ...kids) => { const g = new THREE.Group(); g.name = name; kids.flat().forEach((k) => g.add(k)); return g; };
const at = (g, x, y, z, ry = 0, s = 1) => { g.position.set(x, y, z); g.rotation.y = ry; g.scale.setScalar(s); return g; };
// a gable roof: a triangular prism along z, eaves overhanging the walls
function roof(w, d, h, y, o = {}) {
  const s = new THREE.Shape(); s.moveTo(-w / 2 - 0.35, 0); s.lineTo(w / 2 + 0.35, 0); s.lineTo(0, h); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d + 0.7, bevelEnabled: false }); g.translate(0, 0, -(d + 0.7) / 2);
  return mesh(g, 0, y, 0, { name: "roof", ...o });
}
const wire = (pts, r = 0.035, w = 3) => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 24, r, 4, false), 0, 0, 0, { w, name: "line" });
function car(x, z, ry = 0, { long = 4.3, tall = 0.62 } = {}) {
  const g = group("car", box(1.8, 0.7, long, 0, 0.28, 0, { name: "car_body" }), box(1.58, tall, long * 0.5, 0, 0.98, -0.15, { name: "car_cabin" }));
  for (const [wx, wz] of [[-0.84, long * 0.32], [0.84, long * 0.32], [-0.84, -long * 0.32], [0.84, -long * 0.32]]) g.add(mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.24, 12), wx, 0.33, wz, { rz: Math.PI / 2, name: "wheel" }));
  return at(g, x, 0, z, ry);
}
function tree(x, z, h = 6, kind = 0) {
  if (kind) return group("tree", cyl(0.22, h * 0.45, x, 0, z, { seg: 6 }), mesh(new THREE.IcosahedronGeometry(h * 0.32, 0), x, h * 0.62, z, { name: "crown" }));
  return group("tree", cyl(0.18, h * 0.25, x, 0, z, { seg: 6 }), mesh(new THREE.ConeGeometry(h * 0.24, h * 0.8, 7), x, h * 0.62, z, { name: "crown" }));
}
function house(x, z, ry = 0, { w = 9, d = 8, wall = 2.8, pitch = 2.3, solar = false, deck = true } = {}) {
  const g = group("house", box(w, wall, d, 0, 0, 0, { name: "walls" }), roof(w, d, pitch, wall));
  if (deck) g.add(box(w * 0.6, 0.35, 2.4, -w * 0.15, 0, d / 2 + 1.2, { name: "deck" }));
  g.add(box(0.9, 2.1, 0.12, w * 0.25, 0, d / 2 + 0.06, { name: "door" }), box(2.2, 1.3, 0.1, -w * 0.22, 0.9, d / 2 + 0.05, { w: 0.4, name: "window" }));
  g.add(box(0.9, 0.6, 0.35, w / 2 + 0.3, 0.3, -d * 0.2, { name: "heat_pump" }));
  if (solar) { const slope = Math.atan2(pitch, w / 2 + 0.35); for (let i = 0; i < 3; i++) g.add(box(w * 0.36, 0.06, 1.6, w * 0.2, wall + pitch * 0.45, -d * 0.3 + i * 1.75, { rz: -slope, name: "solar_panel" })); }
  return at(g, x, 0, z, ry);
}

// ------------------------------------------------------------------------------------------------ the twins
export function cafe() {
  const g = group("cafe",
    box(12.6, 0.35, 9.6, 0, 4.2, 0, { name: "roof" }), box(12, 4.2, 0.3, 0, 0, -4.35, { name: "wall_back" }),
    box(0.3, 4.2, 9, -5.85, 0, 0, { name: "wall_west" }), box(0.3, 4.2, 9, 5.85, 0, 0, { name: "wall_east" }),
    box(12, 0.9, 0.4, 0, 3.3, 4.4, { name: "fascia" }), box(11.4, 3.1, 0.08, 0, 0.2, 4.45, { w: 0.22, name: "shopfront_glass" }),
    mesh(new THREE.BoxGeometry(11.4, 0.12, 2.4), 0, 3.0, 5.6, { rx: 0.3, name: "awning" }),
    box(6, 1.1, 1, -0.5, 0, -1.6, { name: "counter" }), box(2.2, 1.6, 0.8, 3.6, 0, -3.5, { name: "kitchen_pass" }),
    box(0.6, 1, 0.08, 6.6, 0, 6.2, { ry: 0.5, name: "menu_board" }));
  for (const x of [-5.85, -2, 2, 5.85]) g.add(box(0.4, 4.2, 0.4, x, 0, 4.4, { name: "pilaster" }));
  for (const [x, z] of [[-4.2, 7.6], [-1.2, 7.6], [1.8, 7.6], [4.6, 7.6], [-2.7, 10.2], [0.3, 10.2], [3.2, 10.2]]) {
    g.add(cyl(0.48, 0.06, x, 0.72, z, { name: "table_top" }), cyl(0.05, 0.72, x, 0, z, { seg: 6, name: "table_leg" }));
    for (const s of [-1, 1]) g.add(box(0.44, 0.44, 0.44, x + s * 0.78, 0, z, { name: "chair_seat" }), box(0.44, 0.5, 0.06, x + s * 0.78, 0.44, z + s * 0.2, { name: "chair_back" }));
  }
  for (const x of [-6.6, 6.9]) g.add(box(1.1, 0.6, 0.6, x, 0, 8.6, { name: "planter" }), mesh(new THREE.IcosahedronGeometry(0.55, 0), x, 1.1, 8.6, { name: "shrub" }));
  g.userData.anchor = [0, 4.6, 4.6];
  return g;
}
export function store() {
  const g = group("supermarket",
    box(44, 7.5, 28, 0, 0, -8, { name: "shed" }), box(16, 2.2, 0.4, 0, 7.5, 6.2, { name: "sign" }),
    box(14, 0.4, 4.4, 0, 4.4, 8.1, { name: "entry_canopy" }), box(11, 4, 0.1, 0, 0, 6.06, { w: 0.25, name: "entry_glass" }),
    box(6, 1.6, 4, -12, 7.5, -10, { name: "plant_hvac" }), box(4, 1.2, 3, 8, 7.5, -14, { name: "plant_hvac" }), box(9, 3, 6, 25.5, 0, -16, { name: "loading_dock" }));
  for (const x of [-6.4, 6.4]) g.add(cyl(0.18, 4.4, x, 0, 10, { seg: 8, name: "canopy_post" }));
  for (let row = 0; row < 2; row++) for (let i = 0; i < 13; i++) g.add(box(0.14, 0.03, 4.8, -16.8 + i * 2.8, 0, 15 + row * 11, { w: 6, name: "bay_line" }));
  const r = rng(21);
  for (let row = 0; row < 2; row++) for (let i = 0; i < 12; i++) if (r() < 0.55) g.add(car(-15.4 + i * 2.8, 15 + row * 11, 0, { long: 4.1 }));
  g.add(box(3.2, 2.2, 1.2, 19, 0, 20, { name: "trolley_bay" }));
  g.userData.anchor = [0, 9.8, 6.4];
  return g;
}
export function ed() {
  const g = group("emergency_department",
    box(36, 8, 22, 0, 0, -6, { name: "block" }), box(24, 4.4, 16, -4, 8, -8, { name: "upper_floor" }),
    cyl(5, 0.12, -4, 12.4, -8, { seg: 36, name: "helipad" }), box(14, 0.4, 7.6, 9, 4.2, 9, { name: "ambulance_canopy" }), box(10, 1.4, 0.3, -9, 5.8, 5.2, { name: "sign" }));
  for (const y of [2.8, 5.6]) g.add(box(36.3, 0.25, 22.3, 0, y, -6, { name: "floor_band" }));
  for (const [dx, dz] of [[-2.2, 0], [2.2, 0]]) g.add(box(0.5, 0.06, 3.2, -4 + dx, 12.52, -8 + dz, { w: 4, name: "helipad_h" }));
  g.add(box(4.9, 0.06, 0.5, -4, 12.52, -8, { w: 4, name: "helipad_h" }));
  for (const [x, z] of [[3, 5.6], [15, 5.6], [3, 12.4], [15, 12.4]]) g.add(cyl(0.22, 4.2, x, 0, z, { seg: 8, name: "canopy_post" }));
  for (const x of [6.5, 11.5]) g.add(group("ambulance", box(2.2, 2.4, 4.6, x, 0.4, 9.6, { name: "ambulance_body" }), box(2.2, 1.6, 1.6, x, 0.4, 12.7, { name: "ambulance_cab" })));
  g.userData.anchor = [-4, 12.6, -8];
  return g;
}
export function dairy() {
  const g = group("dairy_plant",
    box(7, 30, 7, 10, 0, -8, { name: "dryer_tower" }), cyl(0.8, 8, 11.5, 30, -9.5, { name: "stack" }), box(8, 2.4, 8, 10, 30, -8, { name: "tower_head" }),
    box(28, 9, 16, -2, 0, 7, { name: "process_hall" }), box(16, 0.7, 0.7, -2, 11, -8, { name: "pipe_bridge" }));
  for (let i = 0; i < 4; i++) { const x = -16 + i * 5; g.add(cyl(2.1, 14, x, 0, -9, { name: "milk_silo" }), cyl(2.1, 1.6, x, 14, -9, { top: 0.3, name: "silo_cap" })); }
  for (let i = 0; i < 4; i++) { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(7, 0); s.lineTo(0, 2.6); s.closePath(); const sg = new THREE.ExtrudeGeometry(s, { depth: 16, bevelEnabled: false }); sg.translate(0, 0, -8); g.add(mesh(sg, -16 + i * 7, 9, 7, { name: "sawtooth_roof" })); }
  g.add(group("milk_tanker", box(2.5, 2.8, 2.4, 0, 0.5, 21, { name: "tanker_cab" }), mesh(new THREE.CylinderGeometry(1.25, 1.25, 10, 20), 0, 2.1, 14.6, { rx: Math.PI / 2, name: "tanker_barrel" })));
  g.userData.anchor = [10, 38, -8];
  return g;
}
export function energy() {
  const g = group("energy_street");
  const xs = [-19.5, -6.5, 6.5, 19.5];
  xs.forEach((x, i) => g.add(house(x, -4, 0, { solar: i === 1 || i === 3, w: i === 2 ? 10 : 9 })));
  g.add(box(2.2, 1.6, 0.8, -1.2, 0, -8.6, { name: "home_battery" }));
  for (let i = -3; i <= 3; i++) g.add(box(2.4, 0.03, 0.16, i * 6.5, 0, 9, { w: 6, name: "road_marking" }));
  const tops = [];
  for (const x of [-26, -13, 0, 13, 26]) { g.add(cyl(0.16, 9, x, 0, 4.2, { seg: 8, name: "power_pole" }), box(2.4, 0.14, 0.14, x, 8.4, 4.2, { name: "crossarm" })); tops.push(x); }
  for (const dx of [-1, 0, 1]) for (let i = 0; i < tops.length - 1; i++) { const a = tops[i], b = tops[i + 1], y = 8.55; g.add(wire([[a + dx, y, 4.2], [(a + b) / 2 + dx, y - 0.8, 4.2], [b + dx, y, 4.2]])); }
  xs.forEach((x) => g.add(wire([[x + 0.5, 8.4, 4.2], [x + 0.6, 6.4, 1.6], [x + 0.8, 4.4, 0]], 0.025, 2.5)));
  for (const x of [-26, 26]) g.add(tree(x + (x < 0 ? -4 : 4), -2, 7, 1));
  g.userData.anchor = [0, 9, 4.2];
  return g;
}
export function cars() {
  const g = group("car_yard",
    box(26, 0.4, 14, 0, 6, -6, { name: "showroom_roof" }), box(26, 6, 0.3, 0, 0, -12.85, { name: "showroom_back" }), box(0.3, 6, 14, -12.85, 0, -6, { name: "showroom_side" }),
    box(25.4, 5.6, 0.1, 0, 0, 0.95, { w: 0.22, name: "showroom_glass" }), box(0.3, 6, 14, 12.85, 0, -6, { name: "showroom_side" }),
    box(1, 8, 0.5, 15.5, 0, 6, { name: "sign_pylon" }), box(3.4, 2.2, 0.6, 15.5, 8, 6, { name: "sign_panel" }));
  g.add(car(-6, -6, 0.6), car(1, -7, -0.4), car(7.5, -5, 0.2, { long: 4.8, tall: 0.8 }));
  for (let i = 0; i < 6; i++) g.add(car(-12 + i * 4.4, 6.5, 0.18, { long: i % 3 === 1 ? 4.8 : 4.3, tall: i % 3 === 1 ? 0.8 : 0.62 }));
  for (const x of [-13, -5, 3]) g.add(cyl(0.06, 6, x, 0, 12, { seg: 6, name: "flag_pole" }), box(0.06, 1.6, 0.9, x, 4.4, 12.45, { name: "flag" }));
  g.userData.anchor = [15.5, 10.4, 6];
  return g;
}
export const TWINS = { cafe, store, ed, dairy, energy, cars };

// ------------------------------------------------------------------------------------------------ forms
// lighter weight on big flat areas so small parts (chairs, wheels, wires) keep enough points to read
const weightOf = (m) => m.userData.w ?? 1;
// concatenate forms (counts add up), keep every anchor, then shuffle so any subset is still a fair sample
export function merge(forms) {
  const n = forms.reduce((s, f) => s + f.n, 0), o = makeForm(n); let k = 0;
  for (const f of forms) { o.pos.set(f.pos, k * 3); o.light.set(f.light, k); o.kind.set(f.kind, k); Object.assign(o.anchors, f.anchors); k += f.n; }
  return resample(o, n, 11);
}
// one twin on its own (a card's still): the model, a ground disc, its anchor
export function twinForm(id, n = 160000) {
  const g = TWINS[id](); const f = objectForm(g, n, { weight: weightOf, edgeShare: 0.38, groundShare: 0.07 });
  f.anchors = { [id]: g.userData.anchor }; return normalise(f, 1.5);
}

// the hero: every twin standing on one cut piece of land, hills at the back, a harbour at the front, a ferry on the water
const W = 172, D = 112, X0 = -W / 2, Z0 = -D / 2, SEA = -1.1;
// x, z, turn, pad radius, model scale (the café and the street are drawn a little larger, as on any site model)
const SITES = { dairy: [-60, -30, 0.15, 24, 1], ed: [-8, -24, 0, 24, 1], energy: [44, -36, 0, 32, 1.15], cars: [-56, 14, 0.12, 20, 1], cafe: [-12, 22, 0, 13, 1.55], store: [44, 14, -0.08, 30, 1] };
function natural(x, z) {
  const h = 19 * smooth(-10, -56, z) * (0.6 + 0.4 * Math.sin(x * 0.04 + 1.1)) + 2.2 * Math.sin(x * 0.09) * Math.cos(z * 0.11) * smooth(14, -30, z);
  return h - 6 * smooth(33, 44, z) * smooth(30, 12, x) * smooth(-86, -70, x - 4);   // the harbour bites into the front edge
}
// each twin stands on a level pad cut into the land at its own height
const padAt = (x0, z0) => Math.max(0, natural(x0, z0));
function height(x, z) { let h = natural(x, z); for (const [x0, z0, , r] of Object.values(SITES)) { const t = smooth(r * 1.25, r * 0.8, Math.hypot(x - x0, z - z0)); h = h * (1 - t) + padAt(x0, z0) * t; } return h; }
function smooth(a, b, v) { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); }
function terrain() {
  const geo = new THREE.PlaneGeometry(W, D, 115, 70); geo.rotateX(-Math.PI / 2); const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, Math.max(SEA - 0.6, height(p.getX(i), p.getZ(i))));
  geo.computeVertexNormals(); return mesh(geo, 0, 0, 0, { w: 0.1, name: "land" });
}
function skirt() {                                                    // the cut faces of the plinth, from the land's edge down to its base
  const pts = [], segs = 90, B = -12;
  for (let s = 0; s < 4; s++) for (let i = 0; i <= segs; i++) { const t = i / segs; const [x, z] = [[X0 + W * t, Z0], [X0 + W, Z0 + D * t], [X0 + W * (1 - t), Z0 + D], [X0, Z0 + D * (1 - t)]][s]; pts.push([x, z]); }
  const pos = [], idx = [];
  pts.forEach(([x, z], i) => { pos.push(x, Math.max(SEA - 0.6, height(x, z)), z, x, B, z); if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  return mesh(geo, 0, 0, 0, { w: 0.22, name: "plinth" });
}
// the water and the strata lines on the cut faces, as points (no surfaces to sample)
function waterAndStrata(n, seed = 9) {
  const r = rng(seed), f = makeForm(n), nW = Math.round(n * 0.5), nC = Math.round(n * 0.3); let k = 0;
  while (k < nW) {
    const x = X0 + r() * W, z = Z0 + r() * D; if (height(x, z) > SEA - 0.05) continue;
    const ripple = 0.5 + 0.5 * Math.sin(x * 0.55 + z * 0.9) * Math.sin(z * 0.37 - x * 0.21), crest = Math.pow(Math.abs(Math.sin(z * 0.9 + Math.sin(x * 0.13) * 2)), 14);
    f.pos.set([x, SEA + 0.08 * ripple, z], k * 3); f.light[k] = 0.2 + 0.22 * ripple + 0.4 * crest + (r() < 0.025 ? 0.35 : 0); f.kind[k] = KIND.surface; k++;
  }
  // contour lines every 1.5 m over the land: the hills read the way they do on a site model
  while (k < nW + nC) {
    const x = X0 + r() * W, z = Z0 + r() * D, h = height(x, z), c = h / 1.5; if (h < 0.75 || Math.abs(c - Math.round(c)) > 0.05) continue;
    f.pos.set([x, h + 0.05, z], k * 3); f.light[k] = 0.34 + 0.025 * Math.round(c) + 0.1 * r(); f.kind[k] = KIND.edge; k++;
  }
  const layers = [-3.4, -6.8, -10.2];
  while (k < n) {
    const s = Math.floor(r() * 4), t = r(), [x, z] = [[X0 + W * t, Z0], [X0 + W, Z0 + D * t], [X0 + W * (1 - t), Z0 + D], [X0, Z0 + D * (1 - t)]][s], y = layers[Math.floor(r() * 3)] + 0.25 * Math.sin(t * 40 + s);
    if (y > height(x, z) - 0.4) continue;
    f.pos.set([x, y, z], k * 3); f.light[k] = 0.42 + 0.2 * r(); f.kind[k] = KIND.edge; k++;
  }
  return f;
}
export async function worldForm(n = 240000) {
  const root = group("small_world", terrain(), skirt());
  const anchors = {};
  for (const [id, [x, z, ry, , sc]] of Object.entries(SITES)) {
    const g = at(TWINS[id](), x, padAt(x, z), z, ry, sc); root.add(g);
    const a = new THREE.Vector3(...g.userData.anchor).multiplyScalar(sc).applyEuler(g.rotation).add(g.position); anchors[id] = [a.x, a.y, a.z];
  }
  // trees on the hills and along the waterfront; a ferry (from Sea State's own boat code) crossing the harbour
  const r = rng(17);
  for (let i = 0; i < 90; i++) { const x = X0 + 5 + r() * (W - 10), z = Z0 + 3 + r() * 48; if (Object.values(SITES).some(([sx, sz, , sr]) => Math.hypot(x - sx, z - sz) < sr * 0.95)) continue; const h = height(x, z); if (h < 0.4) continue; root.add(tree(x, z, 5 + r() * 4, r() < 0.4 ? 1 : 0).translateY(h)); }
  for (let i = 0; i < 8; i++) { const x = -34 + i * 6.5 + r() * 2, z = 34 + r() * 1.5; if (height(x, z) > 0.2) root.add(tree(x, z, 4.5 + r() * 2, 1).translateY(height(x, z))); }
  try { const { ferry } = await import("/sea/js/boats.js"); const fe = ferry().group; at(fe, -32, SEA - 0.3, 46, 1.3, 1.1); fe.traverse((o) => { if (o.isMesh) o.userData.w = 1.6; }); root.add(fe); anchors.ferry = [-32, SEA + 5, 46]; } catch { /* the diorama reads without the ferry */ }
  const nPts = Math.round(n * 0.16), f = objectForm(root, n - nPts, { weight: weightOf, edgeShare: 0.34, groundShare: 0 });
  const out = merge([f, waterAndStrata(nPts)]); out.anchors = anchors;
  return normalise(out, 2.1);
}

// Sea State's door: its own ferry and water taxi (sea/js/boats.js) on a swell of points
export async function seaForm(n = 160000) {
  const { ferry, waterTaxi } = await import("/sea/js/boats.js");
  const fe = at(ferry().group, -3, 0.1, 0, 0.9), wt = at(waterTaxi().group, 9, 0.2, 7, -0.5);
  const boats = objectForm(group("boats", fe, wt), Math.round(n * 0.62), { edgeShare: 0.4, groundShare: 0 });
  const r = rng(5), m = n - boats.n, sea = makeForm(m);
  for (let i = 0; i < m; i++) {
    const x = (r() - 0.5) * 40, z = (r() - 0.5) * 24, y = 0.35 * Math.sin(x * 0.32 + z * 0.18) + 0.18 * Math.sin(x * 0.81 - z * 0.57) + 0.06 * Math.sin(x * 2.3 + z * 1.9);
    const crest = (y + 0.6) / 1.2, fade = 1 - Math.min(1, Math.hypot(x / 20, z / 12)) * 0.7;
    sea.pos.set([x, y, z], i * 3); sea.light[i] = Math.min(1, (0.12 + 0.42 * crest * crest) * fade + (r() < 0.02 ? 0.35 : 0)); sea.kind[i] = KIND.surface;
  }
  const out = merge([boats, sea]); out.anchors = { ferry: [-3, 4, 0] }; return normalise(out, 1.6);
}
