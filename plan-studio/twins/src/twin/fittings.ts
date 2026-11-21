// Fittings, small appliances, linen and cladding ribs, all modelled in code at real size.
import * as THREE from 'three/webgpu';
import { scandiMats } from './editorial';
import { createLatheVesselGeo, createRoundedBoxGeo } from './scandiInteriors';

const mesh = (g: THREE.BufferGeometry, m: THREE.Material, shadow = true) => { const o = new THREE.Mesh(g, m); o.castShadow = shadow; o.receiveShadow = true; return o; };
const tagged = (o: THREE.Object3D, name: string, material: string) => { o.userData = { kind: 'fitout', name, source: 'proposed', material, note: 'Modelled in code; a proposal, not from the plan.' }; return o; };
const tube = (pts: [number, number, number][], r: number, m: THREE.Material, seg = 24) => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), seg, r, 12, false), m);
let steelM: THREE.MeshStandardMaterial | null = null, blackM: THREE.MeshStandardMaterial | null = null, towelM: THREE.MeshPhysicalMaterial | null = null, opalM: THREE.MeshStandardMaterial | null = null;
const steel = () => (steelM ??= new THREE.MeshStandardMaterial({ name: 'brushed_stainless', color: 0xc9cbcc, roughness: 0.32, metalness: 0.92 }));
const black = () => (blackM ??= new THREE.MeshStandardMaterial({ name: 'matt_black', color: 0x18191b, roughness: 0.5, metalness: 0.6 }));
const towel = () => (towelM ??= new THREE.MeshPhysicalMaterial({ name: 'linen_towel', color: 0xd9cfbf, roughness: 0.95, sheen: 0.5, sheenColor: new THREE.Color(0xf3ece0), sheenRoughness: 0.8, side: THREE.DoubleSide }));
const opal = () => (opalM ??= new THREE.MeshStandardMaterial({ name: 'opal_glass_lit', color: 0xfff3dc, emissive: 0xffd9a0, emissiveIntensity: 1.6, roughness: 0.4 }));

/** a gooseneck mixer: collar, riser, swept spout with an aerator, and a side lever. Stands at the origin, spout towards +z. */
export function mixerTap(height = 0.36, reach = 0.2) {
  const M = scandiMats().tapwareMat, g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.027, 0.032, 0.035, 24).translate(0, 0.0175, 0), M));
  g.add(tube([[0, 0.03, 0], [0, height * 0.72, 0], [0, height, reach * 0.3], [0, height * 0.98, reach * 0.78], [0, height * 0.8, reach]], 0.013, M, 32));
  g.add(mesh(new THREE.CylinderGeometry(0.0155, 0.0155, 0.022, 16).translate(0, height * 0.8 - 0.008, reach), M));
  g.add(mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.05, 16).rotateZ(Math.PI / 2).translate(0.035, 0.07, 0), M));
  g.add(mesh(new THREE.CylinderGeometry(0.005, 0.0065, 0.09, 10).rotateZ(-0.5).translate(0.085, 0.105, 0), M));
  return tagged(g, 'Gooseneck mixer, brushed bronze', 'brushed bronze');
}

/** a shower set: wall mixer plate and lever, riser rail, a 250 mm rain rose on an arm, and a hand shower on a hose. Back at z = 0, facing +z. */
export function showerSet() {
  const M = scandiMats().tapwareMat, g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.01, 32).rotateX(Math.PI / 2).translate(0, 1.05, 0.006), M));
  g.add(mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.045, 16).rotateX(Math.PI / 2).translate(0, 1.05, 0.03), M));
  g.add(mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.08, 10).translate(0, 1.0, 0.045), M));
  g.add(tube([[0, 1.3, 0.035], [0, 2.02, 0.035], [0, 2.08, 0.07], [0, 2.09, 0.32]], 0.011, M, 28));
  for (const y of [1.3, 1.9]) g.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.035, 12).rotateX(Math.PI / 2).translate(0, y, 0.0175), M));
  g.add(mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.009, 40).translate(0, 2.075, 0.32), M));
  g.add(mesh(new THREE.CylinderGeometry(0.018, 0.012, 0.03, 16).translate(0, 2.09, 0.32), M));
  // hand shower on its bracket, with a hose looping down to the outlet
  g.add(mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.16, 12).rotateX(0.5).translate(0.09, 1.52, 0.07), M));
  g.add(mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.012, 24).rotateX(0.5 + Math.PI / 2).translate(0.09, 1.6, 0.115), M));
  g.add(tube([[0.09, 1.45, 0.03], [0.13, 1.1, 0.06], [0.1, 0.88, 0.05], [0.05, 0.95, 0.02]], 0.0065, steel(), 30));
  return tagged(g, 'Shower set: rain rose, hand shower, wall mixer', 'brushed bronze, stainless hose');
}

/** a heated towel rail with two linen towels folded over it. Back at z = 0. */
export function towelRail(w = 0.6) {
  const g = new THREE.Group(), B = black();
  for (const y of [0, 0.22, 0.44, 0.66]) g.add(mesh(new THREE.CylinderGeometry(0.011, 0.011, w, 12).rotateZ(Math.PI / 2).translate(0, y, 0.09), B));
  for (const x of [-w / 2, w / 2]) { g.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.7, 12).translate(x, 0.33, 0.09), B)); for (const y of [0.05, 0.61]) g.add(mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.09, 10).rotateX(Math.PI / 2).translate(x, y, 0.045), B)); }
  // a towel is a strip of cloth hung over a rail: down the front, over the top, down the back, with soft folds across its width
  const drape = (y: number, front: number, back: number, tw: number, x0: number) => {
    const NX = 14, pts: [number, number][] = [];
    for (let i = 0; i <= 10; i++) pts.push([0.105 + 0.006 * Math.sin(i * 0.9), y - front * (1 - i / 10)]);
    for (let i = 1; i <= 6; i++) { const a = (i / 6) * Math.PI; pts.push([0.09 + 0.015 * Math.cos(a), y + 0.015 * Math.sin(a)]); }
    for (let i = 1; i <= 8; i++) pts.push([0.075 - 0.004 * Math.sin(i * 0.8), y - back * (i / 8)]);
    const pos: number[] = [], idx: number[] = [];
    for (let j = 0; j <= NX; j++) for (let i = 0; i < pts.length; i++) { const u = j / NX, ripple = 0.004 * Math.sin(u * 19 + i * 0.35) * Math.min(1, i / 4); pos.push(x0 + (u - 0.5) * tw, pts[i][1], pts[i][0] + ripple); }
    for (let j = 0; j < NX; j++) for (let i = 0; i < pts.length - 1; i++) { const a = j * pts.length + i, b = a + pts.length; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    return mesh(geo, towel());
  };
  g.add(drape(0.66, 0.34, 0.26, w * 0.42, -w * 0.2), drape(0.44, 0.3, 0.24, w * 0.4, w * 0.22));
  return tagged(g, 'Heated towel rail with linen towels', 'matt black rail, washed linen');
}

/** a stack of three folded towels */
export function towelStack() {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) { const t = mesh(createRoundedBoxGeo(0.3 - i * 0.012, 0.045, 0.2, 0.02, 4), towel()); t.position.y = 0.0225 + i * 0.046; t.rotation.y = (i - 1) * 0.06; g.add(t); }
  return tagged(g, 'Folded linen towels', 'washed linen');
}

/** a two-slice toaster: rounded stainless body, two slots, lever and dial */
export function toaster() {
  const g = new THREE.Group();
  g.add(mesh(createRoundedBoxGeo(0.29, 0.185, 0.17, 0.035, 5).translate(0, 0.0975, 0), steel()));
  for (const z of [-0.035, 0.035]) g.add(mesh(new THREE.BoxGeometry(0.2, 0.004, 0.028).translate(0, 0.191, z), black()));
  g.add(mesh(new THREE.BoxGeometry(0.012, 0.03, 0.04).translate(0.151, 0.13, 0), black()), mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.01, 16).rotateZ(Math.PI / 2).translate(0.149, 0.06, 0.04), black()));
  for (const [x, z] of [[-0.11, -0.06], [0.11, -0.06], [-0.11, 0.06], [0.11, 0.06]]) g.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.008, 10).translate(x, 0.004, z), black(), false));
  return tagged(g, 'Two-slice toaster', 'brushed stainless');
}

/** a compact espresso machine: body, group head with portafilter, steam wand, drip tray and two cups on top */
export function espresso() {
  const g = new THREE.Group(), M = scandiMats();
  g.add(mesh(createRoundedBoxGeo(0.28, 0.3, 0.34, 0.02, 4).translate(0, 0.2, -0.03), steel()));
  g.add(mesh(new THREE.BoxGeometry(0.27, 0.05, 0.12).translate(0, 0.025, 0.17), black()), mesh(new THREE.BoxGeometry(0.24, 0.004, 0.1).translate(0, 0.052, 0.17), steel(), false));
  g.add(mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.045, 20).translate(0, 0.2, 0.17), steel()), mesh(new THREE.CylinderGeometry(0.033, 0.026, 0.025, 20).translate(0, 0.165, 0.17), black()));
  g.add(mesh(new THREE.CylinderGeometry(0.011, 0.013, 0.12, 12).rotateX(Math.PI / 2).translate(0, 0.165, 0.25), M.oakMat));
  g.add(tube([[0.11, 0.27, 0.14], [0.125, 0.2, 0.19], [0.12, 0.1, 0.21]], 0.006, steel(), 12));
  for (const x of [-0.09, 0, 0.09]) g.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.012, 14).rotateX(Math.PI / 2).translate(x, 0.3, 0.145), black(), false));
  const cup = createLatheVesselGeo([[0, 0], [0.026, 0], [0.036, 0.05], [0.032, 0.05], [0.023, 0.006], [0, 0.006]]);
  for (const x of [-0.06, 0.05]) g.add(mesh(cup.clone().translate(x, 0.35, -0.05), M.plasterMat));
  return tagged(g, 'Espresso machine with cups', 'brushed stainless, oak handle, stoneware cups');
}

/** an oak knife block with five knives */
export function knifeBlock() {
  const g = new THREE.Group(), M = scandiMats();
  const block = mesh(createRoundedBoxGeo(0.1, 0.22, 0.13, 0.012, 3), M.oakMat); block.rotation.x = -0.35; block.position.set(0, 0.115, 0); g.add(block);
  for (let i = 0; i < 5; i++) { const h = mesh(new THREE.BoxGeometry(0.014, 0.085, 0.02), black()); h.rotation.x = -0.35; h.position.set(-0.032 + i * 0.016, 0.245 - (i % 2) * 0.012, -0.085 + (i % 2) * 0.02); g.add(h); }
  return tagged(g, 'Oak knife block', 'oak, black handles');
}

/** a turned ceramic table lamp with a linen drum shade, lit */
export function tableLamp() {
  const g = new THREE.Group(), M = scandiMats();
  g.add(mesh(createLatheVesselGeo([[0, 0], [0.06, 0], [0.085, 0.05], [0.075, 0.14], [0.03, 0.21], [0.018, 0.26], [0, 0.26]]), M.terracottaMat));
  g.add(mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.1, 8).translate(0, 0.31, 0), M.tapwareMat));
  g.add(mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.17, 32, 1, true).translate(0, 0.4, 0), M.linenMat), mesh(new THREE.SphereGeometry(0.035, 16, 12).translate(0, 0.38, 0), opal(), false));
  return tagged(g, 'Turned ceramic table lamp, linen shade', 'terracotta ceramic, linen, bronze');
}

// --- cladding ribs -----------------------------------------------------------------------------------
export interface RibWall { a: THREE.Vector3; b: THREE.Vector3; out: THREE.Vector3; openings: { a: number; b: number; sill: number; head: number }[] }
/**
 * Profiled steel cladding as real ribs: a trapezoidal rib every `pitch` along each wall, floor to roof, broken
 * around openings. `a`→`b` is the wall line at floor level; opening positions are metres from `a`.
 */
export function claddingRibs(model: THREE.Object3D, walls: RibWall[], material: THREE.Material, pitch = 0.2, below = 0.22) {
  const tops: THREE.Object3D[] = [];
  model.traverse((o) => { if (o.name === 'soffit_and_underlay' || /roof/.test(o.name)) tops.push(o); });
  const ray = new THREE.Raycaster(), up = new THREE.Vector3(0, 1, 0), parts: THREE.BufferGeometry[] = [];
  // the rib's section: 46 mm at the wall, 22 mm at its face, standing 26 mm proud
  const rib = (h: number) => {
    const s = new THREE.Shape(); s.moveTo(-0.023, 0); s.lineTo(-0.011, 0.026); s.lineTo(0.011, 0.026); s.lineTo(0.023, 0); s.closePath();
    return new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false }).rotateX(-Math.PI / 2); // section in x (along the wall) and −z→ now y up, standing out along −z
  };
  for (const w of walls) {
    const len = w.a.distanceTo(w.b), dir = w.b.clone().sub(w.a).normalize(), yaw = Math.atan2(-w.out.x, -w.out.z);
    const n = Math.floor((len - 0.1) / pitch);
    for (let i = 0; i <= n; i++) {
      const t = (len - n * pitch) / 2 + i * pitch, p = w.a.clone().addScaledVector(dir, t).addScaledVector(w.out, 0.02);
      ray.set(new THREE.Vector3(p.x, w.a.y + 1.6, p.z), up); ray.far = 8;
      const hit = ray.intersectObjects(tops, true)[0], top = (hit ? hit.point.y : w.a.y + 2.45) - 0.012, y0 = w.a.y - below;
      const spans: [number, number][] = [];
      const op = w.openings.find((o) => t > o.a - 0.05 && t < o.b + 0.05);
      if (!op) spans.push([y0, top]);
      else { if (op.sill > 0.12) spans.push([y0, w.a.y + op.sill - 0.03]); if (top - (w.a.y + op.head) > 0.12) spans.push([w.a.y + op.head + 0.06, top]); }
      for (const [s0, s1] of spans) { if (s1 - s0 < 0.08) continue; const g = rib(s1 - s0); g.rotateY(yaw); g.translate(p.x - w.out.x * 0.006, s0, p.z - w.out.z * 0.006); parts.push(g); }
    }
  }
  if (!parts.length) return null;
  const pos: number[] = [], nor: number[] = [], idx: number[] = []; let base = 0;
  for (const g of parts) { const gi = g.toNonIndexed(), P = gi.getAttribute('position'), N = gi.getAttribute('normal'); for (let i = 0; i < P.count; i++) { pos.push(P.getX(i), P.getY(i), P.getZ(i)); nor.push(N.getX(i), N.getY(i), N.getZ(i)); idx.push(base++); } }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); geo.setIndex(idx);
  const m = mesh(geo, material); m.name = 'cladding_ribs';
  m.userData = { kind: 'element', name: 'Profiled steel cladding ribs', source: 'assumed', material: 'pre-painted steel, trapezoidal ribs at 200 mm centres', note: 'Rib size and spacing are assumed until the cladding profile is confirmed.' };
  return m;
}
