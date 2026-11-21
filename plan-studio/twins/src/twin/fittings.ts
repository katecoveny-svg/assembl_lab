// Fittings, small appliances, linen and cladding ribs, all modelled in code at real size.
import * as THREE from 'three/webgpu';
import { scandiMats } from './editorial';
import { craftMats, createRoundedBoxGeo, thrownGeo, TILE } from './scandiInteriors';
import { boxUV, tubeUV } from '../objects/util';

const mesh = (g: THREE.BufferGeometry, m: THREE.Material, shadow = true) => { const o = new THREE.Mesh(g, m); o.castShadow = shadow; o.receiveShadow = true; return o; };
const tagged = (o: THREE.Object3D, name: string, material: string) => { o.userData = { kind: 'fitout', name, source: 'proposed', material, note: 'Modelled in code; a proposal, not from the plan.' }; return o; };
const tube = (pts: [number, number, number][], r: number, m: THREE.Material, seg = 24) => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), seg, r, 12, false), m);
let towelM: THREE.MeshPhysicalMaterial | null = null, darkM: THREE.MeshStandardMaterial | null = null, rubberM: THREE.MeshStandardMaterial | null = null, glassM: THREE.MeshPhysicalMaterial | null = null, mirrorM: THREE.MeshPhysicalMaterial | null = null, bladeM: THREE.MeshStandardMaterial | null = null;
/** brushed stainless, the brushing running along `along` */
const brushed = (g: THREE.BufferGeometry, along: 'x' | 'y' | 'z' = 'x') => boxUV(g, TILE.metal, along);
const steel = () => craftMats().steel;
const black = () => craftMats().black;
/** satin charcoal: moulded end caps, bezels, knobs */
const dark = () => (darkM ??= new THREE.MeshStandardMaterial({ name: 'satin_charcoal', color: 0x232426, roughness: 0.42, metalness: 0.35 }));
const rubber = () => (rubberM ??= new THREE.MeshStandardMaterial({ name: 'rubber_foot', color: 0x111112, roughness: 0.9 }));
const gaugeGlass = () => (glassM ??= new THREE.MeshPhysicalMaterial({ name: 'gauge_face', color: 0xf4f1ea, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 }));
const polished = () => (bladeM ??= new THREE.MeshStandardMaterial({ name: 'polished_steel', color: 0xe3e6e8, roughness: 0.14, metalness: 0.8 }));
const towel = () => (towelM ??= (() => { const m = craftMats().linen.clone(); m.name = 'linen_towel'; m.side = THREE.DoubleSide; return m; })());
const opal = () => craftMats().opal;
const rbox = (w: number, h: number, d: number, r: number, x = 0, y = 0, z = 0) => createRoundedBoxGeo(w, h, d, r, 3).translate(x, y, z);
const cyl = (r0: number, r1: number, h: number, seg = 24) => new THREE.CylinderGeometry(r0, r1, h, seg);

/** a gooseneck mixer: collar, riser, swept spout with an aerator, and a side lever. Stands at the origin, spout towards +z. */
export function mixerTap(height = 0.36, reach = 0.2) {
  const M = scandiMats().tapwareMat, g = new THREE.Group();
  g.add(mesh(cyl(0.027, 0.032, 0.035).translate(0, 0.0175, 0), M));
  g.add(mesh(cyl(0.034, 0.034, 0.004, 28).translate(0, 0.002, 0), M));
  g.add(tube([[0, 0.03, 0], [0, height * 0.72, 0], [0, height, reach * 0.3], [0, height * 0.98, reach * 0.78], [0, height * 0.8, reach]], 0.013, M, 32));
  g.add(mesh(cyl(0.0155, 0.0155, 0.022, 16).translate(0, height * 0.8 - 0.008, reach), M));
  g.add(mesh(cyl(0.014, 0.014, 0.05, 16).rotateZ(Math.PI / 2).translate(0.035, 0.07, 0), M));
  g.add(mesh(cyl(0.005, 0.0065, 0.09, 10).rotateZ(-0.5).translate(0.085, 0.105, 0), M));
  return tagged(g, 'Gooseneck mixer, brushed bronze', 'brushed bronze');
}

/**
 * A shower set fixed to the wall: mixer plate and lever, a riser rail on two wall brackets that sweeps over to a
 * 250 mm rain rose, a hand shower held in a slider on the rail, and its hose looping down to a wall outlet.
 * Back at z = 0, facing +z.
 */
export function showerSet() {
  const M = scandiMats().tapwareMat, g = new THREE.Group();
  // mixer: plate on the wall, body, lever
  g.add(mesh(cyl(0.075, 0.075, 0.01, 32).rotateX(Math.PI / 2).translate(0, 1.05, 0.005), M));
  g.add(mesh(cyl(0.02, 0.024, 0.045, 16).rotateX(Math.PI / 2).translate(0, 1.05, 0.03), M));
  g.add(mesh(cyl(0.006, 0.006, 0.085, 10).translate(0, 1.0, 0.045), M));
  // riser rail and arm, with a bracket to the wall at each end of the upright
  g.add(tube([[0, 1.28, 0.04], [0, 1.6, 0.04], [0, 2.02, 0.04], [0, 2.085, 0.075], [0, 2.095, 0.2], [0, 2.095, 0.32]], 0.011, M, 36));
  for (const y of [1.3, 1.95]) { g.add(mesh(cyl(0.011, 0.011, 0.04, 12).rotateX(Math.PI / 2).translate(0, y, 0.02), M)); g.add(mesh(cyl(0.022, 0.022, 0.006, 20).rotateX(Math.PI / 2).translate(0, y, 0.003), M)); }
  g.add(mesh(new THREE.SphereGeometry(0.0125, 12, 8).translate(0, 1.28, 0.04), M));
  // rain rose hanging from the end of the arm
  g.add(mesh(cyl(0.012, 0.016, 0.03, 16).translate(0, 2.08, 0.32), M));
  g.add(mesh(cyl(0.125, 0.125, 0.008, 40).translate(0, 2.062, 0.32), M));
  g.add(mesh(cyl(0.118, 0.118, 0.002, 40).translate(0, 2.057, 0.32), dark(), false));
  // hand shower: a slider clamped on the rail, a cradle, the handset standing in it
  g.add(mesh(rbox(0.036, 0.04, 0.036, 0.006, 0, 1.56, 0.04), M));
  g.add(mesh(cyl(0.012, 0.015, 0.03, 14).rotateX(1.05).translate(0, 1.565, 0.068), M));
  g.add(mesh(cyl(0.0105, 0.012, 0.19, 14).rotateX(0.5).translate(0, 1.6, 0.098), M));
  g.add(mesh(cyl(0.046, 0.04, 0.014, 28).rotateX(0.5 + Math.PI / 2).translate(0, 1.69, 0.152), M));
  g.add(mesh(cyl(0.04, 0.04, 0.002, 28).rotateX(0.5 + Math.PI / 2).translate(0, 1.694, 0.159), dark(), false));
  // hose from the foot of the handset down to the outlet elbow on the wall
  g.add(tube([[0, 1.518, 0.053], [0.012, 1.4, 0.06], [0.05, 1.1, 0.085], [0.07, 0.86, 0.08], [0.05, 0.76, 0.06], [0.012, 0.8, 0.04], [0, 0.86, 0.03]], 0.0065, steel(), 40));
  g.add(mesh(cyl(0.012, 0.012, 0.03, 12).rotateX(Math.PI / 2).translate(0, 0.86, 0.015), M));
  g.add(mesh(cyl(0.024, 0.024, 0.006, 20).rotateX(Math.PI / 2).translate(0, 0.86, 0.003), M));
  return tagged(g, 'Shower set: rain rose, hand shower, wall mixer', 'brushed bronze, stainless hose');
}

/** a heated towel rail on four wall brackets, with two linen towels folded over it. Back at z = 0. */
export function towelRail(w = 0.6) {
  const g = new THREE.Group(), B = black();
  for (const y of [0, 0.22, 0.44, 0.66]) g.add(mesh(cyl(0.011, 0.011, w, 12).rotateZ(Math.PI / 2).translate(0, y, 0.09), B));
  for (const x of [-w / 2, w / 2]) {
    g.add(mesh(cyl(0.012, 0.012, 0.7, 12).translate(x, 0.33, 0.09), B));
    for (const y of [0.05, 0.61]) { g.add(mesh(cyl(0.009, 0.009, 0.09, 10).rotateX(Math.PI / 2).translate(x, y, 0.045), B)); g.add(mesh(cyl(0.02, 0.02, 0.005, 16).rotateX(Math.PI / 2).translate(x, y, 0.0025), B)); }
  }
  // a towel is a strip of cloth hung over a rail: down the front, over the top, down the back, with soft folds across its width
  const drape = (y: number, front: number, back: number, tw: number, x0: number) => {
    const NX = 14, pts: [number, number][] = [];
    for (let i = 0; i <= 10; i++) pts.push([0.105 + 0.006 * Math.sin(i * 0.9), y - front * (1 - i / 10)]);
    for (let i = 1; i <= 6; i++) { const a = (i / 6) * Math.PI; pts.push([0.09 + 0.015 * Math.cos(a), y + 0.015 * Math.sin(a)]); }
    for (let i = 1; i <= 8; i++) pts.push([0.075 - 0.004 * Math.sin(i * 0.8), y - back * (i / 8)]);
    const pos: number[] = [], idx: number[] = [], uv: number[] = [];
    for (let j = 0; j <= NX; j++) for (let i = 0; i < pts.length; i++) { const u = j / NX, ripple = 0.004 * Math.sin(u * 19 + i * 0.35) * Math.min(1, i / 4); pos.push(x0 + (u - 0.5) * tw, pts[i][1], pts[i][0] + ripple); uv.push((u * tw) / TILE.linen, (i * 0.035) / TILE.linen); }
    for (let j = 0; j < NX; j++) for (let i = 0; i < pts.length - 1; i++) { const a = j * pts.length + i, b = a + pts.length; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    return mesh(geo, towel());
  };
  g.add(drape(0.66, 0.34, 0.26, w * 0.42, -w * 0.2), drape(0.44, 0.3, 0.24, w * 0.4, w * 0.22));
  return tagged(g, 'Heated towel rail with linen towels', 'matt black rail, washed linen');
}

/** a stack of three folded towels */
export function towelStack() {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) { const t = mesh(boxUV(createRoundedBoxGeo(0.3 - i * 0.012, 0.045, 0.2, 0.02, 4), TILE.linen, 'x'), towel()); t.position.y = 0.0225 + i * 0.046; t.rotation.y = (i - 1) * 0.06; g.add(t); }
  return tagged(g, 'Folded linen towels', 'washed linen');
}

/** an arched wall mirror in a slim bronze frame. Back at z = 0, its foot at y = 0. */
export function wallMirror(w = 0.5, h = 0.9) {
  const g = new THREE.Group();
  const arch = (ww: number, hh: number) => { const s = new THREE.Shape(), r = ww / 2; s.moveTo(-r, 0); s.lineTo(r, 0); s.lineTo(r, hh - r); s.absarc(0, hh - r, r, 0, Math.PI, false); s.lineTo(-r, 0); return s; };
  g.add(mesh(new THREE.ExtrudeGeometry(arch(w, h), { depth: 0.016, bevelEnabled: false, curveSegments: 32 }), scandiMats().tapwareMat));
  // a true mirror would need the room reflected; this reads as bright silvered glass instead of mirroring the dark ground
  mirrorM ??= new THREE.MeshPhysicalMaterial({ name: 'mirror_silvered', color: 0xd3dbde, roughness: 0.07, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.03 });
  g.add(mesh(new THREE.ExtrudeGeometry(arch(w - 0.016, h - 0.016), { depth: 0.004, bevelEnabled: false, curveSegments: 32 }).translate(0, 0.008, 0.0135), mirrorM, false));
  return tagged(g, 'Arched mirror, bronze frame', 'mirror glass, brushed bronze');
}

/**
 * A two-slice toaster: a brushed stainless shell between satin end caps, slot bezels, a lever in its track,
 * a browning dial and two buttons, a crumb tray line, a shadow gap above the plinth and four rubber feet.
 */
export function toaster() {
  const g = new THREE.Group();
  g.add(mesh(rbox(0.262, 0.012, 0.15, 0.004, 0, 0.012, 0), dark()));
  g.add(mesh(brushed(rbox(0.25, 0.17, 0.168, 0.03, 0, 0.105, 0)), steel()));
  for (const s of [-1, 1]) g.add(mesh(rbox(0.03, 0.176, 0.174, 0.022, s * 0.137, 0.106, 0), dark()));
  // top: a recessed plate with two slots, each with a polished bezel and a dark throat
  g.add(mesh(brushed(rbox(0.2, 0.004, 0.11, 0.0015, 0, 0.19, 0)), steel(), false));
  for (const z of [-0.027, 0.027]) {
    g.add(mesh(rbox(0.176, 0.003, 0.034, 0.001, 0, 0.1925, z), polished(), false));
    g.add(mesh(new THREE.BoxGeometry(0.166, 0.004, 0.024).translate(0, 0.1928, z), black(), false));
  }
  // lever end: a track, the lever, a dial with a pointer, two buttons with a lamp
  g.add(mesh(new THREE.BoxGeometry(0.002, 0.085, 0.007).translate(0.1525, 0.118, 0), black(), false));
  g.add(mesh(rbox(0.02, 0.012, 0.046, 0.004, 0.162, 0.155, 0), polished()));
  g.add(mesh(cyl(0.016, 0.017, 0.012, 28).rotateZ(Math.PI / 2).translate(0.158, 0.062, 0.045), polished()));
  g.add(mesh(new THREE.BoxGeometry(0.002, 0.012, 0.002).translate(0.1645, 0.068, 0.045), black(), false));
  for (const z of [-0.05, -0.028]) g.add(mesh(cyl(0.0065, 0.0065, 0.005, 16).rotateZ(Math.PI / 2).translate(0.1535, 0.062, z), polished(), false));
  g.add(mesh(cyl(0.002, 0.002, 0.004, 8).rotateZ(Math.PI / 2).translate(0.1535, 0.077, -0.039), opal(), false));
  // crumb tray front on the other end, with a finger pull
  g.add(mesh(new THREE.BoxGeometry(0.002, 0.012, 0.12).translate(-0.1525, 0.034, 0), black(), false));
  g.add(mesh(rbox(0.006, 0.006, 0.03, 0.002, -0.155, 0.034, 0), polished(), false));
  for (const [x, z] of [[-0.11, -0.06], [0.11, -0.06], [-0.11, 0.06], [0.11, 0.06]]) g.add(mesh(cyl(0.011, 0.012, 0.007, 12).translate(x, 0.0035, z), rubber(), false));
  return tagged(g, 'Two-slice toaster', 'brushed stainless, satin charcoal ends');
}

/**
 * A compact espresso machine on four feet: brushed body with a recessed front, group head and portafilter with
 * an oak handle, a pressure gauge, steam wand on a ball joint, two knurled knobs, a slatted drip tray, and a
 * cup rail round the warming top with two cups.
 */
export function espresso() {
  const g = new THREE.Group(), C = craftMats();
  for (const [x, z] of [[-0.11, -0.16], [0.11, -0.16], [-0.11, 0.1], [0.11, 0.1]]) { g.add(mesh(cyl(0.014, 0.016, 0.03, 16).translate(x, 0.015, z), polished())); g.add(mesh(cyl(0.017, 0.017, 0.004, 16).translate(x, 0.002, z), rubber(), false)); }
  g.add(mesh(brushed(rbox(0.28, 0.3, 0.33, 0.014, 0, 0.18, -0.035)), steel()));
  // side panel lines and the recessed dark fascia under the top
  for (const s of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.0015, 0.24, 0.28).translate(s * 0.1403, 0.18, -0.035), dark(), false));
  g.add(mesh(rbox(0.25, 0.1, 0.006, 0.003, 0, 0.255, 0.131), dark(), false));
  // group head, portafilter with twin spouts and an oak handle
  g.add(mesh(cyl(0.036, 0.034, 0.05, 28).translate(0, 0.215, 0.165), polished()));
  g.add(mesh(cyl(0.03, 0.03, 0.03, 20).rotateX(Math.PI / 2).translate(0, 0.225, 0.14), polished()));
  g.add(mesh(cyl(0.035, 0.03, 0.024, 28).translate(0, 0.178, 0.165), polished()));
  for (const x of [-0.011, 0.011]) g.add(mesh(cyl(0.005, 0.004, 0.02, 10).translate(x, 0.157, 0.165), polished(), false));
  g.add(mesh(cyl(0.009, 0.009, 0.03, 12).rotateX(Math.PI / 2).translate(0, 0.178, 0.208), polished()));
  g.add(mesh(boxUV(cyl(0.012, 0.014, 0.1, 16).rotateX(Math.PI / 2).translate(0, 0.178, 0.27), TILE.oak, 'z'), C.oak));
  // pressure gauge: bezel, face, needle
  g.add(mesh(cyl(0.024, 0.024, 0.01, 28).rotateX(Math.PI / 2).translate(-0.085, 0.262, 0.137), polished(), false));
  g.add(mesh(cyl(0.02, 0.02, 0.002, 28).rotateX(Math.PI / 2).translate(-0.085, 0.262, 0.1425), gaugeGlass(), false));
  g.add(mesh(new THREE.BoxGeometry(0.0015, 0.016, 0.001).rotateZ(-0.7).translate(-0.081, 0.266, 0.144), black(), false));
  // rocker switch and lamp
  g.add(mesh(rbox(0.024, 0.014, 0.006, 0.002, 0.075, 0.262, 0.136), polished(), false));
  g.add(mesh(cyl(0.003, 0.003, 0.004, 10).rotateX(Math.PI / 2).translate(0.103, 0.262, 0.135), opal(), false));
  // knurled knobs for steam and hot water, on short stems either side
  for (const s of [-1, 1]) { g.add(mesh(cyl(0.006, 0.006, 0.02, 10).rotateZ(Math.PI / 2).translate(s * 0.15, 0.275, 0.07), polished(), false)); g.add(mesh(cyl(0.018, 0.018, 0.018, 12).rotateZ(Math.PI / 2).translate(s * 0.168, 0.275, 0.07), dark())); }
  // steam wand: ball joint under the body's front corner, the wand, its tip
  g.add(mesh(new THREE.SphereGeometry(0.011, 14, 10).translate(0.118, 0.225, 0.135), polished(), false));
  g.add(tube([[0.118, 0.225, 0.135], [0.126, 0.19, 0.165], [0.128, 0.12, 0.185], [0.122, 0.075, 0.19]], 0.0055, polished(), 16));
  g.add(mesh(cyl(0.0065, 0.004, 0.014, 10).translate(0.1215, 0.068, 0.1905), polished(), false));
  // drip tray: a steel tray with a slatted grate
  g.add(mesh(brushed(rbox(0.27, 0.032, 0.13, 0.006, 0, 0.046, 0.185)), steel()));
  g.add(mesh(new THREE.BoxGeometry(0.25, 0.002, 0.11).translate(0, 0.0625, 0.185), black(), false));
  for (let i = 0; i < 12; i++) g.add(mesh(new THREE.BoxGeometry(0.25, 0.003, 0.004).translate(0, 0.064, 0.137 + i * 0.0088), polished(), false));
  // warming top: an inset plate, a rail on four posts, two stoneware cups
  g.add(mesh(new THREE.BoxGeometry(0.24, 0.002, 0.27).translate(0, 0.331, -0.035), dark(), false));
  const rail = [[-0.125, 0.352, -0.185], [0.125, 0.352, -0.185], [0.125, 0.352, 0.115], [-0.125, 0.352, 0.115]] as [number, number, number][];
  rail.forEach((p, i) => { const q = rail[(i + 1) % 4]; const len = Math.hypot(q[0] - p[0], q[2] - p[2]); const bar = cyl(0.003, 0.003, len, 8); if (p[2] === q[2]) bar.rotateZ(Math.PI / 2); else bar.rotateX(Math.PI / 2); g.add(mesh(bar.translate((p[0] + q[0]) / 2, p[1], (p[2] + q[2]) / 2), polished(), false)); g.add(mesh(cyl(0.003, 0.003, 0.024, 8).translate(p[0], 0.34, p[2]), polished(), false)); });
  const cup = thrownGeo([[0.02, 0], [0.023, 0.005], [0.034, 0.03], [0.036, 0.05]], { wall: 0.004, seg: 20, samples: 10 });
  for (const [x, z] of [[-0.06, -0.08], [0.05, -0.02]]) g.add(mesh(cup.clone().translate(x, 0.332, z), C.glazeSand));
  return tagged(g, 'Espresso machine with cups', 'brushed and polished stainless, oak handle, stoneware cups');
}

/** a pour-over kettle on its base: spun brushed body, gooseneck spout, lid with an oak knob, a steel strap handle with an oak grip */
export function kettle() {
  const g = new THREE.Group(), C = craftMats();
  g.add(mesh(new THREE.LatheGeometry([[0.0001, 0], [0.086, 0], [0.09, 0.004], [0.09, 0.016], [0.084, 0.02], [0.0001, 0.02]].map(([r, y]) => new THREE.Vector2(r, y)), 40), dark()));
  g.add(mesh(cyl(0.003, 0.003, 0.004, 8).rotateX(Math.PI / 2).translate(0, 0.01, 0.0895), opal(), false));
  const body = new THREE.LatheGeometry([[0.0001, 0.022], [0.078, 0.022], [0.083, 0.027], [0.08, 0.07], [0.068, 0.13], [0.056, 0.165], [0.054, 0.172], [0.05, 0.172]].map(([r, y]) => new THREE.Vector2(r, y)), 48);
  g.add(mesh(brushed(body, 'x'), steel()));
  g.add(mesh(new THREE.LatheGeometry([[0.0001, 0.184], [0.02, 0.183], [0.044, 0.178], [0.053, 0.173], [0.053, 0.17]].map(([r, y]) => new THREE.Vector2(r, y)).reverse(), 40), steel()));
  g.add(mesh(boxUV(new THREE.LatheGeometry([[0.0001, 0.21], [0.012, 0.209], [0.015, 0.2], [0.009, 0.19], [0.008, 0.183]].map(([r, y]) => new THREE.Vector2(r, y)).reverse(), 20), TILE.oak, 'y'), C.oak));
  // gooseneck: from low on the body, out, up and over to a fine tip
  const neck = new THREE.CatmullRomCurve3([[0, 0.05, 0.074], [0, 0.058, 0.115], [0, 0.1, 0.14], [0, 0.15, 0.142], [0, 0.178, 0.158], [0, 0.182, 0.18]].map((p) => new THREE.Vector3(...(p as [number, number, number]))));
  const ng = new THREE.TubeGeometry(neck, 32, 0.008, 10, false), np = ng.getAttribute('position');
  for (let i = 0; i < np.count; i++) { const t = Math.floor(i / 11) / 32, c = neck.getPointAt(Math.min(1, t)), k = 1.25 - 0.7 * t; np.setXYZ(i, c.x + (np.getX(i) - c.x) * k, c.y + (np.getY(i) - c.y) * k, c.z + (np.getZ(i) - c.z) * k); }
  ng.computeVertexNormals();
  g.add(mesh(tubeUV(ng, neck.getLength(), 0.008, TILE.metal), steel()));
  // handle: a steel strap off the back with an oak grip
  for (const y of [0.16, 0.062]) g.add(mesh(cyl(0.0045, 0.0045, 0.05, 8).rotateX(Math.PI / 2).translate(0, y, y > 0.1 ? -0.078 : -0.098), polished()));
  g.add(mesh(boxUV(new THREE.CapsuleGeometry(0.0115, 0.085, 6, 14).translate(0, 0.111, -0.124), TILE.oak, 'y'), C.oak));
  for (const y of [0.16, 0.062]) g.add(mesh(new THREE.SphereGeometry(0.0065, 10, 8).translate(0, y, -0.124), polished(), false));
  return tagged(g, 'Pour-over kettle on its base', 'brushed stainless, oak grip and knob');
}

/** an oak knife block, raked back on a foot, with five knives: riveted handles, bolsters, a sliver of blade at each slot */
export function knifeBlock() {
  const g = new THREE.Group(), C = craftMats(), tilt = -0.42;
  const block = new THREE.Group();
  block.add(mesh(boxUV(createRoundedBoxGeo(0.105, 0.225, 0.12, 0.01, 3), TILE.oak, 'y'), C.oak));
  for (let i = 0; i < 5; i++) {
    const x = -0.036 + i * 0.018, lift = (i % 2) * 0.012, big = i === 2 ? 1.15 : 1;
    block.add(mesh(new THREE.BoxGeometry(0.003, 0.0012, 0.05 * big).translate(x, 0.1128, 0.004), black(), false));
    block.add(mesh(new THREE.BoxGeometry(0.0022, 0.02 + lift, 0.034 * big).translate(x, 0.118 + lift / 2, 0.004), polished(), false));
    block.add(mesh(rbox(0.012, 0.014, 0.03 * big, 0.003, x, 0.134 + lift, 0.004), polished()));
    block.add(mesh(rbox(0.014, 0.088, 0.024 * big, 0.005, x, 0.184 + lift, 0.002), dark()));
    for (const y of [0.16, 0.185, 0.21]) block.add(mesh(cyl(0.0022, 0.0022, 0.0146, 8).rotateZ(Math.PI / 2).translate(x, y + lift, 0.002), polished(), false));
  }
  block.rotation.x = tilt;
  block.position.set(0, 0.128, 0.01);
  g.add(block);
  // the foot the block leans on
  g.add(mesh(boxUV(createRoundedBoxGeo(0.105, 0.03, 0.15, 0.006, 3).translate(0, 0.015, 0.005), TILE.oak, 'z'), C.oak));
  return tagged(g, 'Oak knife block', 'oiled oak, steel knives with riveted handles');
}

/** a thrown ceramic table lamp with a linen drum shade, lit */
export function tableLamp() {
  const g = new THREE.Group(), C = craftMats(), M = scandiMats();
  g.add(mesh(thrownGeo([[0.05, 0], [0.056, 0.01], [0.086, 0.06], [0.082, 0.13], [0.04, 0.2], [0.02, 0.245], [0.019, 0.26]], { wall: 0.016, seg: 32, samples: 20 }), C.glazeRust));
  g.add(mesh(cyl(0.006, 0.006, 0.1, 8).translate(0, 0.31, 0), M.tapwareMat));
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.17, 32, 1, true).translate(0, 0.4, 0), new THREE.MeshPhysicalMaterial({ name: 'linen_shade_lit', color: 0xf3eadb, emissive: 0xffd18c, emissiveIntensity: 0.5, roughness: 0.75, sheen: 0.4, side: THREE.DoubleSide }));
  g.add(shade, mesh(new THREE.SphereGeometry(0.03, 16, 12).translate(0, 0.38, 0), opal(), false));
  return tagged(g, 'Thrown ceramic table lamp, linen shade', 'rust-glazed stoneware, linen, bronze');
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
