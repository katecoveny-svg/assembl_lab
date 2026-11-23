import * as THREE from 'three/webgpu';
import { cushion, pillow, roundedBox, drape, foldedThrow, strapLeaf, lathe, tube, sheet, merge, fromSdf, smoothNormals, type V3 } from './geo';
import { cloth, timber, stoneMat, metalMat, glazeMat, barkMat, leafMat, glowMat, plain, rugMaterial, rugPattern, type Timber } from './mats';
import * as S from './sdf';
import { rng, pnoise } from './ptex';

// The library's own pieces, built in code at real size (metres), each centred on its footprint with its base at
// y = 0 (a pendant hangs with its top at y = 0) and its front facing +z. Every surface has a fine texture of its own
// (ptex.ts), the soft goods are shaped by height fields (geo.ts) and the sculpture is signed-distance sculpting turned
// into a mesh (sdf.ts). All of it is a proposal: userData.source is 'library'.

export interface Built { obj: THREE.Group; tris: number }
const mk = (g: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], name: string, cast = true) => {
  const o = new THREE.Mesh(g, m);
  o.name = name; o.castShadow = cast; o.receiveShadow = true;
  return o;
};
function finish(id: string, name: string, material: string, parts: THREE.Object3D[]) {
  const g = new THREE.Group();
  g.name = id;
  for (const p of parts) g.add(p);
  const box = new THREE.Box3().setFromObject(g), size = box.getSize(new THREE.Vector3());
  g.userData = { kind: 'furniture', name, material, source: 'library', libId: id, w: size.x, h: size.y, d: size.z };
  return g;
}
const add = (list: THREE.Object3D[], g: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], name: string, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0) => {
  const o = mk(g, m, name); o.position.set(x, y, z); o.rotation.set(rx, ry, rz, 'YXZ'); list.push(o); return o;
};
/** a timber member: a rounded box w × h × d, grain along its longer horizontal axis, end grain (material 1) on its ends */
function member(kind: Timber, w: number, h: number, d: number, r = 0.003, o: { seed?: number; step?: number } = {}) {
  void kind;
  const g = roundedBox(w, h, d, r, { along: w >= d ? 'x' : 'z', step: o.step ?? 0.04, seg: 3, end: true });
  if (o.seed) { const uv = g.getAttribute('uv'); const R = rng(o.seed); const du = R.range(0, 3), dv = R.range(0, 3); for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) + du, uv.getY(i) + dv); }
  return g;
}
const clamp = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
/** a post standing up (grain along y), w × d in plan, h tall, its base at y = 0; taper: how much narrower at the foot */
function post(w: number, d: number, h: number, r = 0.003, taper = 0, seed = 1) {
  const g = roundedBox(h, w, d, r, { along: 'x', step: 0.05, seg: 3 });
  const uv = g.getAttribute('uv'), R = rng(seed), du = R.range(0, 3), dv = R.range(0, 3);
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) + du, uv.getY(i) + dv);
  g.rotateZ(Math.PI / 2);
  g.translate(0, h / 2, 0);
  if (taper) { const p = g.getAttribute('position'); for (let i = 0; i < p.count; i++) { const k = 1 - taper * (1 - p.getY(i) / h); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } g.computeVertexNormals(); }
  return g;
}
/** turn a sheet's triangles over if its normals point away from `dir` */
function faceOut(g: THREE.BufferGeometry, dir: V3) {
  const n = g.getAttribute('normal');
  if (n.getX(0) * dir[0] + n.getY(0) * dir[1] + n.getZ(0) * dir[2] >= 0) return g;
  const I = g.getIndex()!, a = I.array as Uint32Array | Uint16Array;
  for (let i = 0; i < a.length; i += 3) { const t = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = t; }
  I.needsUpdate = true; g.computeVertexNormals();
  return g;
}
const tri = (o: THREE.Object3D) => { let n = 0; o.traverse((m) => { const g = (m as THREE.Mesh).geometry; if ((m as THREE.Mesh).isMesh && g) n += (g.getIndex()?.count ?? g.getAttribute('position').count) / 3; }); return Math.round(n); };
export const triangles = tri;

// ---- seating ---------------------------------------------------------------------------------------------------------------
/** three-seat sofa: wool bouclé on an oiled oak plinth, crowned seat cushions with a rolled front, piped seams */
export function sofa(o: { colour?: number; seats?: number; timber?: Timber } = {}) {
  const C = cloth('boucle', o.colour ?? 0xe6dfd2), wood = timber(o.timber ?? 'oak'), wEnd = timber(o.timber ?? 'oak', { end: true }), P: THREE.Object3D[] = [];
  const seats = o.seats ?? 3, sw = 0.66, W = seats * sw + 0.44, D = 0.95;
  add(P, member(o.timber ?? 'oak', W - 0.08, 0.075, D - 0.1, 0.004, { seed: 3 }), [wood, wEnd], 'plinth', 0, 0.0375, -0.01);
  const deck = cushion(W, 0.19, D, { r: 0.05, crown: 0.004, bulge: 0.006, piping: 0.0045, seed: 11, step: 0.045, wrinkle: 0.5, open: true });
  add(P, deck.geo, C, 'deck', 0, 0.075 + 0.095, 0); if (deck.piping) add(P, deck.piping, C, 'deck_welt', 0, 0.17, 0);
  for (const s of [-1, 1]) {
    const arm = cushion(0.22, 0.34, D, { r: 0.07, crown: 0.012, bulge: 0.01, piping: 0.0045, seed: 13 + s, step: 0.03, open: true });
    add(P, arm.geo, C, 'arm', s * (W / 2 - 0.11), 0.265 + 0.17, 0); if (arm.piping) add(P, arm.piping, C, 'arm_welt', s * (W / 2 - 0.11), 0.435, 0);
  }
  const back = cushion(W - 0.44, 0.16, 0.42, { r: 0.05, crown: 0.01, piping: 0.0045, seed: 12, step: 0.05, open: true });
  const bk = add(P, back.geo, C, 'back', 0, 0.265 + 0.21, -D / 2 + 0.08, 0, Math.PI / 2 - 0.06); if (back.piping) { const b2 = add(P, back.piping, C, 'back_welt', 0, bk.position.y, bk.position.z, 0, bk.rotation.x); void b2; }
  for (let k = 0; k < seats; k++) {
    const x = (k - (seats - 1) / 2) * sw;
    const seat = cushion(sw - 0.006, 0.16, D - 0.22, { r: 0.05, crown: 0.03, bulge: 0.01, front: 0.016, piping: 0.0045, lump: 0.005, wrinkle: 1.2, seed: 20 + k * 3, step: 0.017, open: true });
    add(P, seat.geo, C, 'seat_cushion', x, 0.265 + 0.08, 0.1); if (seat.piping) add(P, seat.piping, C, 'seat_welt', x, 0.345, 0.1);
    const bc = cushion(sw - 0.01, 0.19, 0.44, { r: 0.07, crown: 0.045, under: 0.02, bulge: 0.012, piping: 0.0045, lump: 0.007, wrinkle: 1.5, seed: 30 + k * 5, step: 0.018, open: true });
    const m = add(P, bc.geo, C, 'back_cushion', x, 0.585, -D / 2 + 0.25, 0, Math.PI / 2 - 0.24);
    if (bc.piping) add(P, bc.piping, C, 'back_welt', x, m.position.y, m.position.z, 0, m.rotation.x);
  }
  // two scatter cushions in the corners, in a rust linen and an oat knit
  const pl = [[cloth('linen', 0xa65f42), -1, 0.4], [cloth('knit', 0xcdbfa6), 1, -0.35]] as const;
  for (const [mat, s, turn] of pl) {
    const g = pillow(0.48, 0.46, 0.15, { seed: s > 0 ? 7 : 8, crease: 1.2 });
    add(P, g, mat, 'scatter_cushion', s * (W / 2 - 0.42), 0.6, -D / 2 + 0.42, turn, -0.28);
  }
  return finish('LIB-SEAT-01', 'Three-seat sofa, wool bouclé on an oak plinth', 'wool bouclé, oiled oak; linen and knit cushions', P);
}

/** lounge armchair: an oiled oak frame with knitted wool seat and back cushions */
export function armchair(o: { colour?: number; timber?: Timber } = {}) {
  const tk = o.timber ?? 'oak', wood = timber(tk), wEnd = timber(tk, { end: true }), C = cloth('knit', o.colour ?? 0xd6c8b0), P: THREE.Object3D[] = [];
  const W = 0.74, D = 0.8, sy = 0.36;
  for (const s of [-1, 1]) {
    // front and back legs, the back ones raking back; an arm rail; a low side stretcher
    add(P, post(0.045, 0.045, 0.6, 0.004, 0.25, 4 + s), wood, 'front_leg', s * (W / 2 - 0.04), 0, D / 2 - 0.06);
    // the back legs run on up past the arm as the back stiles, so the top rail behind the cushion is held at both ends
    add(P, post(0.045, 0.045, 0.8, 0.004, 0.2, 6 + s), wood, 'back_leg', s * (W / 2 - 0.04), 0, -D / 2 + 0.08, 0, -0.12);
    add(P, member(tk, 0.055, 0.03, D - 0.02, 0.006, { seed: 8 + s }), [wood, wEnd], 'arm_rail', s * (W / 2 - 0.04), 0.615, 0.02);
    add(P, member(tk, 0.03, 0.05, D - 0.16, 0.004, { seed: 10 + s }), [wood, wEnd], 'side_rail', s * (W / 2 - 0.04), sy - 0.06, 0);
  }
  for (const z of [D / 2 - 0.06, -D / 2 + 0.1]) add(P, member(tk, W - 0.1, 0.06, 0.03, 0.004, { seed: 12 }), [wood, wEnd], 'cross_rail', 0, sy - 0.06, z);
  // back frame: the top rail behind the back cushion, set into the two back stiles
  add(P, member(tk, W - 0.1, 0.05, 0.028, 0.004, { seed: 14 }), [wood, wEnd], 'back_rail', 0, 0.74, -D / 2 + 0.01, 0, -0.32);
  const seat = cushion(W - 0.12, 0.13, D - 0.16, { r: 0.04, crown: 0.022, front: 0.012, bulge: 0.008, piping: 0.004, wrinkle: 1.1, seed: 41, step: 0.016, open: true });
  add(P, seat.geo, C, 'seat_cushion', 0, sy + 0.065, 0.03); if (seat.piping) add(P, seat.piping, C, 'seat_welt', 0, sy + 0.065, 0.03);
  const bc = cushion(W - 0.14, 0.13, 0.46, { r: 0.05, crown: 0.035, under: 0.012, bulge: 0.01, piping: 0.004, wrinkle: 1.3, seed: 43, step: 0.016, open: true });
  const m = add(P, bc.geo, C, 'back_cushion', 0, 0.62, -D / 2 + 0.17, 0, Math.PI / 2 - 0.32);
  if (bc.piping) add(P, bc.piping, C, 'back_welt', 0, m.position.y, m.position.z, 0, m.rotation.x);
  return finish('LIB-SEAT-02', 'Lounge armchair, knitted wool on an oak frame', 'knitted wool, oiled oak', P);
}

/** dining chair: oak, a steam-bent top rail and a woven paper-cord seat */
export function diningChair(o: { timber?: Timber } = {}) {
  const tk = o.timber ?? 'ash', wood = timber(tk), wEnd = timber(tk, { end: true }), cord = cloth('cord', 0xc9b088), P: THREE.Object3D[] = [];
  const W = 0.48, D = 0.5, sy = 0.45;
  for (const s of [-1, 1]) {
    add(P, post(0.032, 0.032, sy, 0.003, 0.2, 20 + s), wood, 'front_leg', s * (W / 2 - 0.03), 0, D / 2 - 0.03);
    const bl = add(P, post(0.032, 0.036, 0.8, 0.003, 0.15, 22 + s), wood, 'back_leg', s * (W / 2 - 0.035), 0, -D / 2 + 0.04, 0, -0.07);
    void bl;
  }
  // the seat frame and the woven cord over it, dipping a little in the middle
  for (const z of [D / 2 - 0.03, -D / 2 + 0.045]) add(P, member(tk, W - 0.05, 0.035, 0.022, 0.003, { seed: 24 }), [wood, wEnd], 'seat_rail', 0, sy - 0.0175, z);
  for (const s of [-1, 1]) add(P, member(tk, 0.022, 0.035, D - 0.07, 0.003, { seed: 25 + s }), [wood, wEnd], 'seat_rail', s * (W / 2 - 0.03), sy - 0.0175, 0);
  const seatG = roundedBox(W - 0.05, 0.016, D - 0.06, 0.006, { step: 0.012, along: 'x' });
  { const p = seatG.getAttribute('position'); for (let i = 0; i < p.count; i++) { const x = p.getX(i) / (W / 2), z = p.getZ(i) / (D / 2); p.setY(i, p.getY(i) - 0.01 * clamp(1 - x * x) * clamp(1 - z * z)); } seatG.computeVertexNormals(); }
  add(P, seatG, cord, 'woven_seat', 0, sy + 0.004, 0.005);
  // steam-bent top rail, and a lower back rail
  for (const [y, h] of [[0.76, 0.07], [0.6, 0.03]] as const) {
    const g = member(tk, W - 0.04, h, 0.02, 0.004, { seed: 26 + y * 10 });
    const p = g.getAttribute('position'); for (let i = 0; i < p.count; i++) { const x = p.getX(i) / (W / 2); p.setZ(i, p.getZ(i) - 0.045 * x * x); } g.computeVertexNormals();
    add(P, g, [wood, wEnd], 'back_rail', 0, y, -D / 2 + 0.035 - (y - 0.45) * 0.07 + 0.02, 0, -0.07);
  }
  // stretchers
  for (const s of [-1, 1]) add(P, member(tk, 0.018, 0.018, D - 0.08, 0.004, { seed: 30 + s }), [wood, wEnd], 'stretcher', s * (W / 2 - 0.032), 0.16, 0);
  return finish('LIB-SEAT-03', 'Dining chair, ash with a woven cord seat', 'oiled ash, woven paper cord', P);
}

// ---- tables ------------------------------------------------------------------------------------------------------------------
/** solid oak dining table: a 40 mm top of three glued boards with eased edges, tapered legs and aprons */
export function diningTable(o: { l?: number; w?: number; timber?: Timber } = {}) {
  const tk = o.timber ?? 'oak', wood = timber(tk), wEnd = timber(tk, { end: true }), P: THREE.Object3D[] = [];
  const L = o.l ?? 2.0, W = o.w ?? 0.95, H = 0.75, t = 0.04;
  for (let k = 0; k < 3; k++) {
    const bw = W / 3;
    add(P, member(tk, L, t, bw + 0.0004, k === 0 || k === 2 ? 0.004 : 0.0006, { seed: 50 + k * 7, step: 0.05 }), [wood, wEnd], 'top_board', 0, H - t / 2, (k - 1) * bw);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(P, post(0.065, 0.065, H - t, 0.004, 0.3, 60 + sx * 2 + sz), wood, 'leg', sx * (L / 2 - 0.12), 0, sz * (W / 2 - 0.09));
  for (const sz of [-1, 1]) add(P, member(tk, L - 0.3, 0.09, 0.024, 0.003, { seed: 70 + sz }), [wood, wEnd], 'apron', 0, H - t - 0.045, sz * (W / 2 - 0.1));
  for (const sx of [-1, 1]) add(P, member(tk, 0.024, 0.09, W - 0.25, 0.003, { seed: 72 + sx }), [wood, wEnd], 'apron', sx * (L / 2 - 0.13), H - t - 0.045, 0);
  return finish('LIB-TAB-01', 'Dining table, solid oak, 2000 × 950', 'oiled European oak', P);
}

/** round banquet table for ten: a 1660 mm oak top (1800 mm over the cloth and its folds) on a pedestal, under a washed linen cloth that falls in soft folds to just
 *  above the floor (the folds are a height field round the hem, deeper toward it, as cloth hangs from a table edge) */
export function banquetTable(o: { linen?: number } = {}) {
  const P: THREE.Object3D[] = [], R = 0.83, H = 0.75, wood = timber('oak');
  const linen = cloth('linen', o.linen ?? 0xf1ede5, { double: true });
  // the cloth: across the top, over the edge with a small roll, then down to 30 mm off the floor, flaring a little toward the hem
  const prof: [number, number][] = [[0.0005, H + 0.004], [R * 0.5, H + 0.004], [R - 0.02, H + 0.003], [R + 0.004, H - 0.012], [R + 0.012, H - 0.05]];
  for (let k = 1; k <= 36; k++) { const f = k / 36; prof.push([R + 0.014 + 0.022 * f * f, H - 0.05 - (H - 0.08) * f]); }
  const g = lathe(prof, 200), p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = Math.hypot(x, z);
    if (r < R - 0.01 || y > H - 0.02) continue;
    // folds: deeper toward the hem, broad ones from the table's edge and finer ones between; the hem rises and falls with them
    const a = Math.atan2(z, x), drop = clamp((H - 0.02 - y) / (H - 0.05));
    const wave = Math.sin(a * 14) * 0.55 + Math.sin(a * 31 + 1.3) * 0.25 + Math.sin(a * 6 + 0.4) * 0.2;
    const f = wave * 0.034 * Math.pow(drop, 0.7);
    const k = (r + f) / r; p.setX(i, x * k); p.setZ(i, z * k);
    if (y < 0.06) p.setY(i, y + Math.max(0, wave) * 0.012);
  }
  g.computeVertexNormals();
  add(P, g, linen, 'cloth');
  add(P, lathe([[0.0005, 0.02], [0.32, 0.02], [0.34, 0.0], [0.0005, 0.0]], 48), wood, 'pedestal_foot');
  add(P, lathe([[0.06, 0.02], [0.05, H - 0.05], [0.0005, H - 0.05]], 32), wood, 'pedestal');
  return finish('LIB-TAB-04', 'Round banquet table for ten, 1800 mm', 'washed linen cloth, oiled oak pedestal', P);
}

/** low coffee table: a travertine slab on an oak plinth */
export function coffeeTable() {
  const P: THREE.Object3D[] = [], trav = stoneMat('travertine', 0xe7dccb, 0xc8b499, 0.7), wood = timber('oak'), wEnd = timber('oak', { end: true });
  add(P, roundedBox(1.2, 0.045, 0.65, 0.008, { step: 0.04 }), trav, 'top', 0, 0.36, 0);
  add(P, member('oak', 0.9, 0.31, 0.36, 0.006, { seed: 80, step: 0.04 }), [wood, wEnd], 'plinth', 0, 0.155, 0);
  return finish('LIB-TAB-02', 'Coffee table, travertine on an oak plinth', 'honed travertine, oiled oak', P);
}

// ---- beds ----------------------------------------------------------------------------------------------------------------------
/** queen bed: an oak frame, an upholstered linen headboard, a duvet that falls over the sides, pillows and a folded throw */
export function bed(o: { linen?: number; timber?: Timber } = {}) {
  const tk = o.timber ?? 'oak', wood = timber(tk), wEnd = timber(tk, { end: true }), P: THREE.Object3D[] = [];
  const mw = 1.53, ml = 2.03, W = mw + 0.1, L = ml + 0.08, rail = 0.3;
  const sheetM = cloth('linen', 0xf1ede5), duvet = cloth('linen', o.linen ?? 0xe3dccf, { double: true }), pillowM = cloth('linen', 0xefebe3), euroM = cloth('linen', 0xb9a98e), head = cloth('twill', 0xcfc4b2);
  // frame: side rails, foot rail, legs
  for (const s of [-1, 1]) add(P, member(tk, 0.04, 0.17, L, 0.004, { seed: 90 + s }), [wood, wEnd], 'side_rail', s * (W / 2 - 0.02), rail - 0.085, 0);
  add(P, member(tk, W, 0.17, 0.04, 0.004, { seed: 92 }), [wood, wEnd], 'foot_rail', 0, rail - 0.085, L / 2 - 0.02);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(P, post(0.06, 0.06, rail - 0.17 + 0.02, 0.004, 0.15, 93 + sx + sz * 3), wood, 'leg', sx * (W / 2 - 0.05), 0, sz * (L / 2 - 0.05));
  // headboard: an upholstered panel framed in oak
  const hb = cushion(W - 0.06, 0.07, 0.62, { r: 0.025, crown: 0.012, bulge: 0.004, piping: 0.004, wrinkle: 0.6, seed: 95, step: 0.02 });
  const hbm = add(P, hb.geo, head, 'headboard', 0, rail + 0.38, -L / 2 + 0.035, 0, Math.PI / 2); if (hb.piping) add(P, hb.piping, head, 'headboard_welt', 0, hbm.position.y, hbm.position.z, 0, hbm.rotation.x);
  add(P, member(tk, W + 0.04, 0.035, 0.08, 0.005, { seed: 96 }), [wood, wEnd], 'headboard_cap', 0, rail + 0.71, -L / 2 + 0.03);
  for (const s of [-1, 1]) add(P, post(0.04, 0.07, rail + 0.69, 0.004, 0, 97 + s), wood, 'headboard_post', s * (W / 2 + 0.0), 0, -L / 2 + 0.03);
  // mattress in its fitted sheet
  const mt = 0.24, top = rail + 0.02 + mt;
  add(P, roundedBox(mw, mt, ml, 0.035, { step: 0.05 }), sheetM, 'mattress', 0, rail + 0.02 + mt / 2, 0.02);
  // the duvet: laid from below the pillows to the foot, falling over three sides
  const dv = drape(mw + 0.02, ml, mw + 0.66, ml - 0.38 + 0.3, top + 0.005, { roll: 0.06, seed: 98, step: 0.022, pleats: 1.3, lumps: 2.2, back: 0.38, turn: 0.22 });
  add(P, dv, duvet, 'duvet', 0, 0, 0.02);
  // pillows: two sleeping pillows leaning on the headboard, two euro squares in front, all with corner creases
  for (const s of [-1, 1]) add(P, pillow(0.72, 0.5, 0.17, { seed: 100 + s, crease: 1.1, step: 0.016 }), euroM, 'euro_pillow', s * 0.37, top + 0.27, -ml / 2 + 0.15, s * 0.04, -0.32);
  for (const s of [-1, 1]) add(P, pillow(0.7, 0.46, 0.15, { seed: 104 + s, crease: 1.3, chop: s > 0 ? 0.2 : 0, step: 0.016 }), pillowM, 'pillow', s * 0.36, top + 0.2, -ml / 2 + 0.33, -s * 0.05, -0.75);
  // a chunky knitted throw folded across the foot
  add(P, foldedThrow(1.15, 0.44, 3, 0.02, { seed: 106, step: 0.02, wrinkle: 1.6 }), cloth('chunky', 0x9a8a70), 'throw', 0.05, top + 0.035, ml / 2 - 0.42, 0.04);
  return finish('LIB-BED-01', 'Queen bed, oak, with washed linen and a knitted throw', 'oiled oak, washed linen, wool twill, chunky knit', P);
}

// ---- storage ----------------------------------------------------------------------------------------------------------------------
/** sideboard: an oak case with four fluted doors on short tapered legs, brass pulls */
export function sideboard() {
  const P: THREE.Object3D[] = [], wood = timber('oak'), wEnd = timber('oak', { end: true }), brass = metalMat(0xc9a66b, 0.28);
  const W = 1.8, D = 0.45, H = 0.72, legs = 0.14;
  add(P, member('oak', W, 0.025, D, 0.004, { seed: 110 }), [wood, wEnd], 'top', 0, H - 0.0125, 0);
  add(P, member('oak', W - 0.02, 0.02, D - 0.02, 0.003, { seed: 111 }), [wood, wEnd], 'base', 0, legs + 0.01, 0);
  for (const s of [-1, 1]) add(P, member('oak', 0.02, H - legs - 0.045, D - 0.01, 0.003, { seed: 112 + s }), [wood, wEnd], 'end', s * (W / 2 - 0.01), (H + legs) / 2 - 0.005, 0);
  add(P, member('oak', W - 0.04, H - legs - 0.05, 0.012, 0.002, { seed: 114 }), [wood, wEnd], 'back', 0, (H + legs) / 2 - 0.005, -D / 2 + 0.01);
  // doors: vertical flutes 22 mm apart, each a shallow half-round
  const dw = (W - 0.05) / 4, dh = H - legs - 0.06, pitch = 0.022;
  for (let k = 0; k < 4; k++) {
    const g = sheet(dw - 0.004, dh, 0.0037, (s, t) => { const ph = (s % pitch) / pitch; return [s - (dw - 0.004) / 2, t - dh / 2, 0.006 * Math.sqrt(Math.max(0, 1 - (2 * ph - 1) ** 2))]; }, 0.12);
    const uv = g.getAttribute('uv'); for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i) + k * 0.7, uv.getX(i));
    faceOut(g, [0, 0, 1]);
    add(P, g, wood, 'fluted_door', -W / 2 + 0.025 + dw * (k + 0.5), (H + legs) / 2 - 0.005, D / 2 - 0.012);
    add(P, roundedBox(0.012, 0.09, 0.022, 0.005, { step: 0.02 }), brass, 'pull', -W / 2 + 0.025 + dw * (k + 0.5) + (k % 2 ? -1 : 1) * (dw / 2 - 0.03), (H + legs) / 2, D / 2 + 0.008);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(P, post(0.04, 0.04, legs, 0.004, 0.3, 116 + sx + sz * 2), wood, 'leg', sx * (W / 2 - 0.07), 0, sz * (D / 2 - 0.06));
  return finish('LIB-STO-01', 'Sideboard, oak with fluted doors', 'oiled oak, brushed brass', P);
}

// ---- lighting ---------------------------------------------------------------------------------------------------------------------
/** pleated linen pendant: an accordion-pleated drum lit from inside, on a cloth cord from a brass canopy. Hangs from y = 0. */
export function pendant() {
  const P: THREE.Object3D[] = [], brass = metalMat(0xc9a66b, 0.28), shade = glowMat(0xf3e9d8, 0.55, 'linen'), cordM = cloth('twill', 0x2b2622);
  const drop = 0.9, Rb = 0.27, Rt = 0.15, Hs = 0.32, pleats = 44;
  add(P, lathe([[0.0, -0.024], [0.062, -0.022], [0.065, -0.006], [0.06, 0], [0.0, 0]], 48), brass, 'canopy', 0, 0, 0);
  add(P, tube([[0, -0.02, 0], [0, -drop * 0.5, 0.002], [0, -drop, 0]], 0.0035, { radial: 6, per: 0.05 }), cordM, 'cord', 0, 0, 0);
  add(P, lathe([[0.0, -0.05], [0.016, -0.05], [0.02, -0.02], [0.018, 0], [0.0, 0]], 32), brass, 'lamp_holder', 0, -drop, 0);
  // the shade: a cone of pleats, each pleat a sharp fold
  const seg = pleats * 8, rows = 24, pos: number[] = [], idx: number[] = [], uv: number[] = [];
  for (let j = 0; j <= rows; j++) {
    const t = j / rows, r0 = Rt + (Rb - Rt) * t, y = -drop - 0.02 - t * Hs;
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2, ph = ((i / seg) * pleats) % 1, fold = 1 - Math.abs(ph * 2 - 1);
      const r = r0 * (1 + 0.055 * fold * (0.6 + 0.4 * t));
      pos.push(Math.cos(a) * r, y, Math.sin(a) * r); uv.push(a * Rb, t * Hs * 1.1);
    }
  }
  for (let j = 0; j < rows; j++) for (let i = 0; i < seg; i++) { const a = j * (seg + 1) + i; idx.push(a, a + 1, a + seg + 1, a + 1, a + seg + 2, a + seg + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  add(P, g, shade, 'pleated_shade', 0, 0, 0);
  // brass rims and a warm opal bulb
  for (const [r, y] of [[Rt * 1.03, -drop - 0.02], [Rb * 1.03, -drop - 0.02 - Hs]] as const) add(P, new THREE.TorusGeometry(r, 0.0025, 6, 96).rotateX(Math.PI / 2), brass, 'rim', 0, y, 0);
  add(P, new THREE.SphereGeometry(0.045, 24, 16), new THREE.MeshStandardMaterial({ color: 0xfff4e0, emissive: 0xffd9a8, emissiveIntensity: 2.2, roughness: 0.4 }), 'bulb', 0, -drop - 0.1, 0);
  return finish('LIB-LGT-01', 'Pleated linen pendant on a cloth cord', 'washed linen, brushed brass', P);
}

/** tripod floor lamp: three turned oak legs, a brass hub and a linen drum shade */
export function floorLamp() {
  const P: THREE.Object3D[] = [], wood = timber('oak'), brass = metalMat(0xc9a66b, 0.28), shade = glowMat(0xefe4d2, 0.45, 'linen');
  const H = 1.58, hub = 1.12;
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + 0.4, spread = 0.27;
    const foot = new THREE.Vector3(Math.cos(a) * spread, 0, Math.sin(a) * spread), top = new THREE.Vector3(0, hub, 0);
    const L = foot.distanceTo(top);
    const g = lathe([[0.008, 0], [0.012, 0.02], [0.016, L * 0.4], [0.015, L * 0.8], [0.012, L - 0.01], [0.009, L]], 20);
    const uv = g.getAttribute('uv'); for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i) + k, uv.getX(i));
    const m = add(P, g, wood, 'leg', foot.x, 0, foot.z);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(foot).normalize());
  }
  add(P, lathe([[0, -0.03], [0.028, -0.03], [0.03, 0.0], [0.024, 0.03], [0.01, 0.04], [0, 0.04]], 32), brass, 'hub', 0, hub, 0);
  add(P, tube([[0, hub + 0.04, 0], [0, H - 0.2, 0]], 0.007, { radial: 12, per: 0.1 }), brass, 'stem', 0, 0, 0);
  // linen drum shade, open top and bottom, a brass spider inside
  const Rs = 0.22, Hs = 0.3, sh = new THREE.CylinderGeometry(Rs, Rs * 1.04, Hs, 96, 6, true);
  { const uv = sh.getAttribute('uv'); for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.PI * 2 * Rs, uv.getY(i) * Hs); }
  add(P, sh, shade, 'drum_shade', 0, H - Hs / 2, 0);
  for (const y of [H, H - Hs]) add(P, new THREE.TorusGeometry(y === H ? Rs : Rs * 1.04, 0.002, 6, 96).rotateX(Math.PI / 2), brass, 'rim', 0, y, 0);
  add(P, new THREE.SphereGeometry(0.04, 20, 14), new THREE.MeshStandardMaterial({ color: 0xfff4e0, emissive: 0xffd9a8, emissiveIntensity: 2, roughness: 0.4 }), 'bulb', 0, H - 0.17, 0);
  add(P, tube([[0.02, hub - 0.02, 0], [0.12, 0.3, 0.05], [0.25, 0.004, 0.12], [0.5, 0.004, 0.18]], 0.0025, { radial: 5, per: 0.04 }), plain(0x2a2623, 0.7), 'cable', 0, 0, 0);
  return finish('LIB-LGT-02', 'Tripod floor lamp, turned oak and a linen drum', 'oiled oak, brushed brass, washed linen', P);
}

// ---- rugs and textiles -------------------------------------------------------------------------------------------------------------
/** hand-knotted wool rug: an ivory ground with a charcoal lattice, the pile knotted, the sides bound, the ends fringed */
export function rug(o: { w?: number; d?: number } = {}) {
  const W = o.w ?? 2.4, D = o.d ?? 1.7, T = 0.013, P: THREE.Object3D[] = [];
  const ivory: [number, number, number] = [228, 220, 204], char: [number, number, number] = [58, 54, 50], sand: [number, number, number] = [176, 156, 128];
  const pat = rugPattern('lattice', W, D, (u, v) => {
    // knots 4 mm apart: the design is sampled per knot, so its edges step the way a knotted rug's do
    const kx = Math.floor((u * W) / 0.004) * 0.004, kz = Math.floor((v * D) / 0.004) * 0.004;
    const border = Math.min(kx, W - kx, kz, D - kz);
    const x = kx - W / 2, z = kz - D / 2;
    const dia = Math.abs(((x / 0.32 + z / 0.22) % 2 + 2) % 2 - 1), dib = Math.abs(((x / 0.32 - z / 0.22) % 2 + 2) % 2 - 1);
    const wob = (pnoise(kx * 3, kz * 3, 256, 256, 5) - 0.5) * 0.08;
    let c = ivory;
    if (border < 0.11 && border > 0.085) c = char;
    else if (border > 0.11 && (Math.abs(dia - 0.5 + wob) < 0.045 || Math.abs(dib - 0.5 - wob) < 0.045)) c = char;
    else if (border > 0.11 && Math.abs(dia - 0.5) < 0.1 && Math.abs(dib - 0.5) < 0.1) c = sand;
    // abrash: slow drifts in the wool's dye lot, and each knot a little lighter or darker
    const ab = 1 + (pnoise(kx * 1.3, kz * 0.6, 256, 256, 6) - 0.5) * 0.08 + (pnoise(kx * 250, kz * 250, 4096, 4096, 7) - 0.5) * 0.1;
    return [Math.min(255, c[0] * ab), Math.min(255, c[1] * ab), Math.min(255, c[2] * ab)];
  });
  const m = rugMaterial(pat);
  // the rug lies almost flat: a hint of lift at one corner and a soft ripple
  const lift = (x: number, z: number) => 0.004 * Math.exp(-(((x - W / 2) ** 2 + (z - D / 2) ** 2) / 0.05)) + 0.0015 * Math.sin(x * 3.1 + 0.4) * Math.sin(z * 2.3);
  const topG = sheet(W, D, 0.03, (s, t) => [s - W / 2, T + lift(s, t), t - D / 2]);
  add(P, topG, m, 'pile');
  // bound sides: a rolled overcast edge along the long sides, a short band at the ends
  const side = cloth('twill', 0x3d3935);
  for (const sz of [-1, 1]) add(P, tube(Array.from({ length: 25 }, (_, i) => { const s = (i / 24) * W; return [s - W / 2, T * 0.55 + lift(s, sz > 0 ? D : 0), sz * (D / 2)] as V3; }), T * 0.55, { radial: 8, per: 0.04 }), side, 'bound_edge');
  for (const sx of [-1, 1]) add(P, tube(Array.from({ length: 19 }, (_, i) => { const t = (i / 18) * D; return [sx * (W / 2), T * 0.5 + lift(sx > 0 ? W : 0, t), t - D / 2] as V3; }), T * 0.5, { radial: 8, per: 0.04 }), cloth('linen', 0xd9cfbd), 'end_band');
  // fringes: tassels of warp threads, knotted in pairs, lying out on the floor
  const R = rng(9), fr: THREE.BufferGeometry[] = [];
  for (const sx of [-1, 1]) for (let i = 0; i < Math.floor(D / 0.022); i++) {
    const z = -D / 2 + 0.011 + i * 0.022 + R.range(-0.003, 0.003), len = R.range(0.06, 0.085), bend = R.range(-0.25, 0.25);
    const pts: V3[] = [[sx * W / 2, T * 0.5, z], [sx * (W / 2 + len * 0.35), 0.004, z + bend * len * 0.3], [sx * (W / 2 + len), 0.0025, z + bend * len]];
    fr.push(tube(pts, 0.0022, { radial: 5, per: 0.02 }));
  }
  add(P, merge(fr), cloth('linen', 0xe8dfcc), 'fringe');
  return finish('LIB-RUG-01', 'Hand-knotted wool rug, lattice', 'hand-knotted wool, cotton fringe', P);
}

/** a chunky knitted throw, folded in three */
export function throwBlanket(o: { colour?: number } = {}) {
  const P: THREE.Object3D[] = [];
  add(P, foldedThrow(0.62, 0.44, 3, 0.016, { seed: 120, step: 0.012, wrinkle: 1.3 }), cloth('chunky', o.colour ?? 0xa86b4f), 'throw', 0, 0, 0);
  return finish('LIB-TEX-01', 'Folded throw, chunky wool knit', 'chunky-knit merino', P);
}

// ---- decor and sculpture ------------------------------------------------------------------------------------------------------------
/** pierced stone form: a lobed limestone figure with a tunnel through it, chiselled, on a limestone block */
export function pierced() {
  const P: THREE.Object3D[] = [], lime = stoneMat('limestone', 0xddd5c6, 0xc5b9a5, 0.4), base = stoneMat('basalt', 0x3a3936, 0x262523, 0.7);
  const body = S.smoothUnion(0.07, S.ellipsoid([0.15, 0.2, 0.105], [0, 0.22, 0]), S.ellipsoid([0.09, 0.11, 0.08], [0.05, 0.43, 0.01]), S.ellipsoid([0.1, 0.05, 0.09], [-0.02, 0.06, 0]));
  const hole = S.rotate(0.25, 0, S.capsule([0.02, 0.27, -0.25], [-0.03, 0.25, 0.25], 0.055));
  const cut = S.smoothSubtract(0.035, body, hole);
  const scoop = S.smoothSubtract(0.04, cut, S.sphere(0.07, [0.14, 0.34, 0.06]));
  const sdf = S.roughen(0.0025, 38, 5, S.roughen(0.006, 9, 6, scoop));
  const g = fromSdf(S.mesh(sdf, [-0.22, 0.0, -0.17], [0.22, 0.58, 0.17], 0.0048));
  add(P, g, lime, 'sculpted_form', 0, 0.06, 0);
  add(P, roundedBox(0.26, 0.06, 0.2, 0.004, { step: 0.03 }), base, 'block', 0, 0.03, 0);
  return finish('LIB-DEC-01', 'Pierced stone form', 'chiselled limestone on a basalt block', P);
}

/** twisted ring: a bronze loop whose flattened section turns one and a half times as it goes round, on a stone foot */
export function twistedRing() {
  const P: THREE.Object3D[] = [], bronze = metalMat(0x9a6e45, 0.22), base = stoneMat('travertine', 0xd8cbb6, 0xb39e82, 0.6);
  const Rr = 0.16, rx = 0.052, ry = 0.016;
  const ring: S.SDF = (x, y, z) => {
    const phi = Math.atan2(z, x), qx = Math.hypot(x, z) - Rr, a = phi * 1.5, c = Math.cos(a), s = Math.sin(a);
    const ux = (c * qx - s * y) / rx, uy = (s * qx + c * y) / ry;
    return (Math.hypot(ux, uy) - 1) * Math.min(rx, ry) * 0.9;
  };
  const stand = S.rotate(0, Math.PI / 2, ring);
  const sdf = S.roughen(0.0008, 60, 3, stand);
  const g = fromSdf(S.mesh(sdf, [-0.23, -0.23, -0.07], [0.23, 0.23, 0.07], 0.0035));
  add(P, g, bronze, 'bronze_ring', 0, 0.035 + 0.215, 0);
  add(P, lathe([[0, 0], [0.085, 0], [0.09, 0.006], [0.088, 0.034], [0.06, 0.04], [0, 0.04]], 48), base, 'foot', 0, 0, 0);
  return finish('LIB-DEC-02', 'Twisted ring, cast bronze', 'cast bronze on a travertine foot', P);
}

/** thrown stoneware vase: a full belly and narrow neck, throwing rings, a crackled ash glaze stopping short of a raw foot */
export function vase(o: { colour?: number } = {}) {
  const P: THREE.Object3D[] = [], gl = glazeMat(o.colour ?? 0xb7b39c, { crackle: 0.7, gloss: 0.55 }), clay = stoneMat('limestone', 0xb08a68, 0x8e6c50, 0.2);
  const prof: [number, number][] = [];
  for (let i = 0; i <= 60; i++) {
    const t = i / 60, y = 0.012 + t * 0.4;
    const belly = 0.11 * Math.sin(Math.PI * Math.min(1, t * 1.25)) ** 0.8, neck = t > 0.72 ? 0.032 + (t - 0.86) ** 2 * 1.6 : 0;
    const r = Math.max(0.03, t > 0.72 ? Math.max(neck, belly * (1 - (t - 0.72) * 3)) : Math.max(0.065, belly)) + 0.0011 * Math.sin(t * 0.4 * Math.PI * 2 * 28);
    prof.push([r, y]);
  }
  // a rolled lip, then the inside of the neck going down, 5 mm inside the outside
  const top = prof[prof.length - 1];
  prof.push([top[0] + 0.0015, top[1] + 0.002], [top[0] - 0.002, top[1] + 0.004], [top[0] - 0.005, top[1] + 0.001]);
  for (let i = 59; i >= 44; i--) prof.push([Math.max(0.01, prof[i][0] - 0.005), prof[i][1]]);
  add(P, lathe(prof, 96), gl, 'glazed_body', 0, 0, 0);
  add(P, lathe([[0, 0], [0.058, 0], [0.062, 0.004], [0.066, 0.014], [0.0, 0.014]], 64), clay, 'raw_foot', 0, 0, 0);
  // three dried stems
  const R = rng(12), stems: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 3; k++) { const a = R.range(-0.4, 0.4) + k * 2.1, l = R.range(0.35, 0.55); stems.push(tube([[0, 0.3, 0], [Math.sin(a) * 0.04, 0.42, Math.cos(a) * 0.04], [Math.sin(a) * 0.12, 0.42 + l * 0.7, Math.cos(a) * 0.1], [Math.sin(a) * 0.2, 0.42 + l, Math.cos(a) * 0.16]], 0.0022, { radial: 5, per: 0.03 })); }
  add(P, merge(stems), plain(0x5b4635, 0.85), 'dried_stems');
  return finish('LIB-DEC-03', 'Thrown stoneware vase with dried stems', 'stoneware, crackled ash glaze', P);
}

// ---- native planting ---------------------------------------------------------------------------------------------------------------
/** harakeke (New Zealand flax): fans of keeled strap leaves, red-brown at the base, and two flower stalks (kōrari) */
export function harakeke(o: { seed?: number; size?: number } = {}) {
  const R = rng(o.seed ?? 31), sz = o.size ?? 1, leaves: THREE.BufferGeometry[] = [], P: THREE.Object3D[] = [];
  const fans = 7;
  for (let f = 0; f < fans; f++) {
    const fa = (f / fans) * Math.PI * 2 + R.range(-0.3, 0.3), fr = R.range(0.04, 0.12) * sz, cx = Math.cos(fa) * fr, cz = Math.sin(fa) * fr, plane = fa + Math.PI / 2 + R.range(-0.3, 0.3);
    const n = R.int(7, 9);
    for (let i = 0; i < n; i++) {
      const s = (i / (n - 1)) * 2 - 1, outer = Math.abs(s);
      const lean = s * 0.55 + R.range(-0.08, 0.08), away = 0.12 + outer * 0.25;
      const dir: V3 = [Math.cos(plane) * Math.sin(lean) + Math.cos(fa) * away, Math.cos(lean), Math.sin(plane) * Math.sin(lean) + Math.sin(fa) * away];
      const len = (1.55 - outer * 0.55 + R.range(-0.15, 0.1)) * sz, wid = R.range(0.055, 0.075) * sz;
      leaves.push(strapLeaf([cx + Math.cos(plane) * s * 0.02, 0, cz + Math.sin(plane) * s * 0.02], dir, len, wid, { droop: 0.35 + outer * 0.9, twist: R.range(0.15, 0.45), keel: 0.5, seg: 22, across: 4, cols: [0x8a4a2c, 0x56703a, R.next() < 0.3 ? 0x9a8a50 : 0x6e7d45] }));
    }
  }
  add(P, merge(leaves), leafMat(0xffffff, { mm: 60, veins: 30 }), 'leaves');
  // kōrari: two tall flower stalks with seed pods, dark against the leaves
  const stalk = plain(0x3b2a22, 0.75), pods: THREE.BufferGeometry[] = [], st: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 2; k++) {
    const a = R.range(0, Math.PI * 2), top: V3 = [Math.cos(a) * 0.15 * sz, 2.2 * sz + R.range(-0.2, 0.1), Math.sin(a) * 0.15 * sz];
    st.push(tube([[0, 0.1, 0], [top[0] * 0.4, top[1] * 0.5, top[2] * 0.4], top], 0.009 * sz, { radial: 6, per: 0.1 }));
    for (let j = 0; j < 12; j++) {
      const t = 0.66 + j * 0.028, py = top[1] * t, side = j % 2 ? 1 : -1;
      const pod = new THREE.CapsuleGeometry(0.008 * sz, 0.05 * sz, 3, 6);
      pod.rotateZ(side * 0.35); pod.translate(top[0] * t + side * 0.022 * sz, py + 0.03 * sz, top[2] * t);
      pods.push(pod.toNonIndexed());
    }
  }
  add(P, merge(st), stalk, 'korari');
  const pm = merge(pods.map((g) => { g.setIndex(null); return g; })); add(P, pm, plain(0x2a1f1a, 0.6), 'seed_pods');
  return finish('LIB-NAT-01', 'Harakeke (New Zealand flax)', 'living plant: harakeke, Phormium tenax', P);
}

/** tī kōuka (cabbage tree): a corky trunk forking into three heads of strap leaves over a skirt of dead ones */
export function tiKouka(o: { seed?: number; height?: number } = {}) {
  const R = rng(o.seed ?? 41), H = o.height ?? 3.2, P: THREE.Object3D[] = [];
  const barkM = barkMat(0x8a7a66, 0x4e4337);
  const fork: V3 = [0.04, H * 0.52, 0.02], trunks: THREE.BufferGeometry[] = [], live: THREE.BufferGeometry[] = [], dead: THREE.BufferGeometry[] = [];
  trunks.push(tube([[0, 0, 0], [0.02, H * 0.25, 0.01], fork], 0.11, { radial: 14, per: 0.1 }));
  const heads: V3[] = [];
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + R.range(-0.3, 0.3), out = R.range(0.35, 0.6), up = R.range(0.75, 1.05) * (H - fork[1] - 0.45);
    const tip: V3 = [fork[0] + Math.cos(a) * out, fork[1] + up, fork[2] + Math.sin(a) * out];
    trunks.push(tube([fork, [fork[0] + Math.cos(a) * out * 0.35, fork[1] + up * 0.55, fork[2] + Math.sin(a) * out * 0.35], tip], 0.065, { radial: 12, per: 0.08 }));
    heads.push(tip);
  }
  // a little flare and root buttressing at the base
  trunks.push(lathe([[0.2, 0], [0.16, 0.06], [0.12, 0.2], [0.105, 0.4]], 24));
  for (const h of heads) {
    // live leaves burst from the head in all directions, the lower ones bending down
    for (let i = 0; i < 70; i++) {
      const u = R.next(), th = R.range(0, Math.PI * 2), el = Math.acos(1 - u * 1.35) * 0.9, dir: V3 = [Math.sin(el) * Math.cos(th), Math.cos(el), Math.sin(el) * Math.sin(th)];
      const len = R.range(0.55, 0.85), lowness = clamp(el / 1.4);
      live.push(strapLeaf(h, dir, len, R.range(0.035, 0.05), { droop: 0.2 + lowness * 1.2, twist: R.range(0, 0.3), keel: 0.3, seg: 10, across: 2, cols: [0x6f7a3a, 0x4b6a2e, 0x7f8a48], taper: 0.7 }));
    }
    // dead leaves hang beneath it in a skirt
    for (let i = 0; i < 30; i++) {
      const th = R.range(0, Math.PI * 2), dir: V3 = [Math.cos(th) * 0.35, -1, Math.sin(th) * 0.35];
      dead.push(strapLeaf([h[0], h[1] - 0.05, h[2]], dir, R.range(0.4, 0.7), 0.035, { droop: 0.05, twist: R.range(0, 0.6), keel: 0.15, seg: 8, across: 2, cols: [0x8b7656, 0x9c8564, 0x7a6449] }));
    }
  }
  add(P, merge(trunks), barkM, 'trunk');
  add(P, merge(live), leafMat(0xffffff, { mm: 40, veins: 18 }), 'leaves');
  add(P, merge(dead), leafMat(0xffffff, { mm: 40, veins: 18 }), 'dead_leaves');
  return finish('LIB-NAT-02', 'Tī kōuka (cabbage tree)', 'living plant: tī kōuka, Cordyline australis', P);
}

/** a ground fern clump: arching fronds of paired leaflets, and two young fronds still unrolling (koru) */
export function fern(o: { seed?: number; size?: number } = {}) {
  const R = rng(o.seed ?? 51), sz = o.size ?? 1, P: THREE.Object3D[] = [], leaflets: THREE.BufferGeometry[] = [], stems: THREE.BufferGeometry[] = [];
  const fronds = 13;
  for (let f = 0; f < fronds; f++) {
    const a = (f / fronds) * Math.PI * 2 + R.range(-0.2, 0.2), len = R.range(0.6, 0.9) * sz, rise = R.range(0.6, 0.95);
    // the rachis: up and out, then arching over
    const pts: V3[] = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12; const out = len * (0.15 + 0.85 * t), y = len * rise * Math.sin(Math.PI * 0.62 * t) * (1 - 0.35 * t); pts.push([Math.cos(a) * out * 0.9, y, Math.sin(a) * out * 0.9]); }
    stems.push(tube(pts, 0.003 * sz, { radial: 5, per: 0.04 }));
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
    const pairs = 22;
    for (let k = 2; k < pairs; k++) {
      const t = k / pairs, p = curve.getPointAt(t), tg = curve.getTangentAt(t);
      const side = new THREE.Vector3(0, 1, 0).cross(tg).normalize();
      const L = (0.13 * Math.sin(Math.PI * Math.min(1, t * 1.1)) + 0.015) * sz;
      for (const s of [-1, 1]) {
        const d = side.clone().multiplyScalar(s).addScaledVector(tg, 0.55).addScaledVector(new THREE.Vector3(0, 1, 0), 0.08).normalize();
        leaflets.push(strapLeaf([p.x, p.y, p.z], [d.x, d.y, d.z], L, 0.018 * sz * (0.6 + 0.4 * Math.sin(Math.PI * t)), { droop: 0.9, twist: 0.1, keel: 0.15, seg: 5, across: 2, cols: [0x3f5a2a, 0x4a6a30, 0x6a7f3c], taper: 0.6 }));
      }
    }
  }
  // koru: young fronds still coiled
  for (let k = 0; k < 2; k++) {
    const a = R.range(0, Math.PI * 2), pts: V3[] = [];
    for (let i = 0; i <= 30; i++) { const t = i / 30; const h = 0.32 * sz * Math.min(1, t * 1.6); const coil = t > 0.6 ? (t - 0.6) / 0.4 : 0; const r = 0.05 * sz * (1 - coil * 0.8); const ang = coil * Math.PI * 3.2; pts.push([Math.cos(a) * (0.04 + Math.sin(ang) * r), h + (1 - Math.cos(ang)) * r * 0.9 - coil * 0.02, Math.sin(a) * (0.04 + Math.sin(ang) * r)]); }
    stems.push(tube(pts, 0.006 * sz, { radial: 6, per: 0.01 }));
  }
  add(P, merge(stems), plain(0x4a5a2c, 0.6), 'rachis');
  add(P, merge(leaflets), leafMat(0xffffff, { mm: 20, veins: 6 }), 'leaflets');
  return finish('LIB-NAT-03', 'Ground fern clump with koru', 'living plant: native ground fern', P);
}

// ---- procedural versions of the library's GLB pieces (Kate, 22 Nov 2026: "procedural is key") -------------------------
/** bedside table: an oak case with two drawers on tapered legs, brass knobs */
export function bedsideTable(o: { timber?: Timber } = {}) {
  const tk = o.timber ?? 'oak', wood = timber(tk), wEnd = timber(tk, { end: true }), brass = metalMat(0xc9a66b, 0.28), P: THREE.Object3D[] = [];
  const W = 0.52, D = 0.42, H = 0.54, legs = 0.16;
  add(P, member(tk, W, 0.022, D, 0.004, { seed: 130 }), [wood, wEnd], 'top', 0, H - 0.011, 0);
  for (const s of [-1, 1]) add(P, member(tk, 0.018, H - legs - 0.022, D - 0.004, 0.003, { seed: 131 + s }), [wood, wEnd], 'side', s * (W / 2 - 0.009), legs + (H - legs - 0.022) / 2, 0);
  add(P, member(tk, W, 0.018, D, 0.003, { seed: 133 }), [wood, wEnd], 'bottom', 0, legs + 0.009, 0);
  add(P, member(tk, W - 0.03, H - legs - 0.04, 0.01, 0.002, { seed: 134 }), [wood, wEnd], 'back', 0, legs + (H - legs) / 2, -D / 2 + 0.006);
  const dh = (H - legs - 0.05) / 2;
  for (let k = 0; k < 2; k++) {
    const y = legs + 0.021 + dh / 2 + k * (dh + 0.004);
    add(P, member(tk, W - 0.042, dh - 0.004, 0.02, 0.003, { seed: 135 + k }), [wood, wEnd], 'drawer_front', 0, y, D / 2 - 0.012);
    add(P, lathe([[0, 0], [0.011, 0], [0.013, 0.006], [0.009, 0.016], [0.0045, 0.02], [0, 0.02]], 24).rotateX(Math.PI / 2), brass, 'knob', 0, y, D / 2 - 0.002);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(P, post(0.034, 0.034, legs, 0.004, 0.3, 137 + sx + sz * 2), wood, 'leg', sx * (W / 2 - 0.045), 0, sz * (D / 2 - 0.045), 0, sz * 0.05, -sx * 0.05);
  return finish('LIB-TAB-03', 'Bedside table, oak with two drawers', 'oiled oak, brushed brass', P);
}

/** table lamp: a turned ash base with a brass neck and a linen drum shade */
export function tableLamp() {
  const P: THREE.Object3D[] = [], ash = timber('ash'), brass = metalMat(0xc9a66b, 0.28), shade = glowMat(0xefe4d2, 0.45, 'linen');
  const g = lathe([[0, 0], [0.06, 0], [0.064, 0.006], [0.07, 0.03], [0.075, 0.07], [0.068, 0.12], [0.045, 0.17], [0.022, 0.2], [0.016, 0.215], [0, 0.215]], 48);
  const uv = g.getAttribute('uv'); for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i), uv.getX(i));
  add(P, g, ash, 'turned_base');
  add(P, tube([[0, 0.21, 0], [0, 0.33, 0]], 0.006, { radial: 12, per: 0.05 }), brass, 'neck');
  const Rs = 0.15, Hs = 0.2, sh = new THREE.CylinderGeometry(Rs * 0.92, Rs, Hs, 72, 4, true);
  { const u2 = sh.getAttribute('uv'); for (let i = 0; i < u2.count; i++) u2.setXY(i, u2.getX(i) * Math.PI * 2 * Rs, u2.getY(i) * Hs); }
  add(P, sh, shade, 'drum_shade', 0, 0.3 + Hs / 2, 0);
  for (const [r, y] of [[Rs * 0.92, 0.3 + Hs], [Rs, 0.3]] as const) add(P, new THREE.TorusGeometry(r, 0.0018, 6, 72).rotateX(Math.PI / 2), brass, 'rim', 0, y, 0);
  add(P, new THREE.SphereGeometry(0.03, 18, 12), new THREE.MeshStandardMaterial({ color: 0xfff4e0, emissive: 0xffd9a8, emissiveIntensity: 2, roughness: 0.4 }), 'bulb', 0, 0.37, 0);
  return finish('LIB-LGT-03', 'Table lamp, turned ash and linen', 'oiled ash, brushed brass, washed linen', P);
}

/** counter stool: splayed oak legs, a brass foot ring and a round bouclé seat */
export function counterStool() {
  const P: THREE.Object3D[] = [], wood = timber('oak'), brass = metalMat(0xc9a66b, 0.28), C = cloth('boucle', 0xcdbb9f);
  const H = 0.66, spread = 0.19;
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4, foot = new THREE.Vector3(Math.cos(a) * spread, 0, Math.sin(a) * spread), top = new THREE.Vector3(Math.cos(a) * 0.12, H - 0.03, Math.sin(a) * 0.12);
    const L = foot.distanceTo(top), g = lathe([[0.012, 0], [0.014, 0.03], [0.017, L * 0.6], [0.016, L]], 16);
    const m = add(P, g, wood, 'leg', foot.x, 0, foot.z); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(foot).normalize());
  }
  add(P, new THREE.TorusGeometry(0.166, 0.008, 10, 72).rotateX(Math.PI / 2), brass, 'foot_ring', 0, 0.24, 0);
  add(P, lathe([[0, 0], [0.16, 0], [0.17, 0.008], [0.17, 0.02], [0, 0.02]], 48), wood, 'seat_base', 0, H - 0.03, 0);
  // the cushion: a crowned disc with a rolled edge
  const prof: [number, number][] = [[0, -0.001]];
  for (let i = 0; i <= 12; i++) { const a = -Math.PI / 2 + (i / 12) * Math.PI; prof.push([0.165 + Math.cos(a) * 0.035, 0.035 + Math.sin(a) * 0.035]); }
  for (let i = 1; i <= 8; i++) { const r = 0.165 * (1 - i / 8); prof.push([Math.max(0.0005, r), 0.07 + 0.012 * (1 - (r / 0.165) ** 2)]); }
  const cg = lathe(prof, 64); boxUVFor(cg);
  add(P, cg, C, 'seat_cushion', 0, H - 0.01, 0);
  return finish('LIB-SEAT-04', 'Counter stool, oak and bouclé', 'oiled oak, brushed brass, wool bouclé', P);
}
function boxUVFor(g: THREE.BufferGeometry) {
  const p = g.getAttribute('position'), uv = g.getAttribute('uv');
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), p.getZ(i) + p.getY(i) * 0.5);
}

/** arched mirror: a slim brass frame round an arched glass, hung on a wall */
export function archedMirror() {
  // silvered glass: pale and glossy, so it reads as a mirror whatever room it faces
  const P: THREE.Object3D[] = [], brass = metalMat(0xc4a46f, 0.3), glass = new THREE.MeshPhysicalMaterial({ color: 0xbcc3c3, metalness: 0.35, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.02 });
  const W = 0.5, H = 0.86, R = W / 2, pts: V3[] = [];
  const side = (x: number, y0: number, y1: number) => { for (let i = 0; i <= 10; i++) pts.push([x, y0 + ((y1 - y0) * i) / 10, 0]); };
  side(-R, 0.02, H - R);
  for (let i = 1; i < 30; i++) { const a = Math.PI - (i / 30) * Math.PI; pts.push([Math.cos(a) * R, H - R + Math.sin(a) * R, 0]); }
  side(R, H - R, 0.02);
  for (let i = 1; i < 12; i++) pts.push([R - (2 * R * i) / 12, 0.0, 0]);
  const sh = new THREE.Shape(); sh.moveTo(-R + 0.01, 0.01); sh.lineTo(R - 0.01, 0.01); sh.lineTo(R - 0.01, H - R); sh.absarc(0, H - R, R - 0.01, 0, Math.PI, false); sh.lineTo(-R + 0.01, 0.01);
  add(P, new THREE.ShapeGeometry(sh, 32), glass, 'mirror_glass', 0, 0, 0.012);
  add(P, tube(pts, 0.012, { radial: 10, per: 0.015, closed: true }), brass, 'frame', 0, 0, 0.012);
  add(P, new THREE.ExtrudeGeometry(sh, { depth: 0.008, bevelEnabled: false }), plain(0x2c2a28, 0.8), 'backing', 0, 0, 0.0);
  return finish('LIB-DEC-04', 'Arched mirror, brass frame', 'mirror glass, brushed brass', P);
}

/** double wardrobe: an ash case with two fluted doors on a recessed plinth */
export function wardrobe() {
  const P: THREE.Object3D[] = [], wood = timber('ash'), wEnd = timber('ash', { end: true }), brass = metalMat(0xc9a66b, 0.28);
  const W = 1.2, D = 0.6, H = 2.2, base = 0.08;
  add(P, member('ash', W - 0.06, base, D - 0.08, 0.003, { seed: 150 }), [wood, wEnd], 'plinth', 0, base / 2, -0.02);
  add(P, member('ash', W, 0.025, D, 0.004, { seed: 151 }), [wood, wEnd], 'top', 0, H - 0.0125, 0);
  for (const s of [-1, 1]) add(P, member('ash', 0.025, H - base - 0.025, D, 0.004, { seed: 152 + s }), [wood, wEnd], 'side', s * (W / 2 - 0.0125), base + (H - base - 0.025) / 2, 0);
  add(P, member('ash', W, 0.025, D, 0.004, { seed: 154 }), [wood, wEnd], 'bottom', 0, base + 0.0125, 0);
  add(P, member('ash', W - 0.04, H - base - 0.05, 0.012, 0.002, { seed: 155 }), [wood, wEnd], 'back', 0, base + (H - base) / 2, -D / 2 + 0.01);
  const dw = (W - 0.054) / 2, dh = H - base - 0.06, pitch = 0.028;
  for (let k = 0; k < 2; k++) {
    const g = sheet(dw - 0.003, dh, 0.004, (s2, t) => { const ph = (s2 % pitch) / pitch; return [s2 - (dw - 0.003) / 2, t - dh / 2, 0.007 * Math.sqrt(Math.max(0, 1 - (2 * ph - 1) ** 2))]; }, 0.2);
    const uv = g.getAttribute('uv'); for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i) + k * 0.9, uv.getX(i));
    faceOut(g, [0, 0, 1]);
    const x = (k - 0.5) * (dw + 0.003);
    add(P, g, wood, 'fluted_door', x, base + 0.03 + dh / 2, D / 2 - 0.012);
    add(P, roundedBox(0.014, 0.32, 0.024, 0.006, { step: 0.03 }), brass, 'pull', x + (k ? -1 : 1) * (dw / 2 - 0.045), 1.05, D / 2 + 0.01);
  }
  return finish('LIB-STO-02', 'Double wardrobe, fluted ash', 'oiled ash, brushed brass', P);
}

/** S-fold linen curtain on a ceiling track: deep even folds that soften and swing a little towards the hem */
export function curtain(o: { w?: number; h?: number } = {}) {
  const P: THREE.Object3D[] = [], W = o.w ?? 1.8, H = o.h ?? 2.39, C = cloth('linen', 0xf3eee5, { double: true }), track = plain(0x2b2927, 0.5, 0.3);
  const R = rng(160), pitch = 0.15, folds = Math.round(W / pitch);
  const ph = Array.from({ length: 4 }, () => R.range(0, 6.28));
  const g = sheet(W, H - 0.03, 0.008, (s, t) => {
    const down = 1 - t / (H - 0.03); // 0 at the hem, 1 at the track
    const amp = 0.03 * (0.85 + 0.15 * down) + 0.008 * Math.sin(s * 3 + ph[0]) * (1 - down);
    const sway = 0.012 * (1 - down) ** 2 * Math.sin(s * 1.7 + ph[1]);
    const fold = Math.sin((s / pitch) * Math.PI * 2 + 0.25 * (1 - down) * Math.sin(s * 5 + ph[2]));
    const hem = t < 0.04 ? 0.004 * Math.sin(s * 40 + ph[3]) : 0;
    return [s - W / 2, t + 0.012 * (1 - down) * Math.sin(s * 2.3 + ph[3]) * 0, fold * amp + sway + hem];
  }, 0.04);
  smoothNormals(g);
  add(P, g, C, 'curtain', 0, 0.01, 0.06);
  add(P, roundedBox(W + 0.06, 0.025, 0.05, 0.004, { step: 0.1 }), track, 'ceiling_track', 0, H - 0.0125, 0.06);
  void folds;
  return finish('LIB-TEX-02', 'S-fold linen curtain on a ceiling track', 'washed linen, powder-coated track', P);
}

/** ponga (silver tree fern): a fibrous trunk carrying old frond bases, and a crown of long arching fronds, silver beneath */
export function ponga(o: { seed?: number; height?: number } = {}) {
  const R = rng(o.seed ?? 61), H = o.height ?? 1.9, P: THREE.Object3D[] = [], leaflets: THREE.BufferGeometry[] = [], stems: THREE.BufferGeometry[] = [];
  const top: V3 = [0.03, H, 0.02];
  const trunk = tube([[0, 0, 0], [0.02, H * 0.5, 0.01], top], 0.11, { radial: 14, per: 0.1 });
  add(P, trunk, barkMat(0x5a4a3c, 0x2f261f), 'trunk');
  // old frond bases (stipe stubs) clothing the upper trunk
  const stubs: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 40; i++) { const y = H * (0.55 + R.next() * 0.43), a = R.range(0, Math.PI * 2); stubs.push(tube([[Math.cos(a) * 0.1, y, Math.sin(a) * 0.1], [Math.cos(a) * 0.17, y - 0.06, Math.sin(a) * 0.17]], 0.012, { radial: 5, per: 0.05 })); }
  add(P, merge(stubs), plain(0x3e3128, 0.9), 'frond_bases');
  const fronds = 18;
  for (let f = 0; f < fronds; f++) {
    const a = (f / fronds) * Math.PI * 2 + R.range(-0.15, 0.15), len = R.range(1.5, 1.9), rise = R.range(0.55, 0.85);
    const pts: V3[] = [];
    for (let i = 0; i <= 14; i++) { const t = i / 14, out = len * t * 0.85, y = len * (rise * Math.sin(Math.PI * 0.6 * t) - 0.3 * t * t); pts.push([top[0] + Math.cos(a) * out, top[1] + y, top[2] + Math.sin(a) * out]); }
    stems.push(tube(pts, 0.007, { radial: 5, per: 0.06 }));
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
    const pairs = 26;
    for (let k = 2; k < pairs; k++) {
      const t = k / pairs, p = curve.getPointAt(t), tg = curve.getTangentAt(t), side = new THREE.Vector3(0, 1, 0).cross(tg).normalize();
      const L = 0.34 * Math.sin(Math.PI * Math.min(1, t * 1.08)) + 0.04;
      for (const s of [-1, 1]) {
        const d = side.clone().multiplyScalar(s).addScaledVector(tg, 0.3).addScaledVector(new THREE.Vector3(0, 1, 0), 0.04).normalize();
        leaflets.push(strapLeaf([p.x, p.y, p.z], [d.x, d.y, d.z], L, 0.075 * (0.6 + 0.4 * Math.sin(Math.PI * t)), { droop: 0.5, twist: 0.08, keel: 0.12, seg: 6, across: 2, cols: [0x3f5d2b, 0x4c6d31, 0x627a38], taper: 0.45 }));
      }
    }
  }
  add(P, merge(stems), plain(0x4a3f2c, 0.7), 'stipes');
  add(P, merge(leaflets), leafMat(0xffffff, { mm: 30, veins: 8 }), 'fronds');
  return finish('LIB-NAT-04', 'Ponga (silver tree fern)', 'living plant: ponga, Cyathea dealbata', P);
}

/** the builders, by catalogue id; finish: one of the catalogue entry's finish ids (the first when left out) */
export const BUILDERS: Record<string, (finish?: string) => THREE.Group> = {
  'LIB-SEAT-01': (f) => sofa({ colour: ({ ivory: 0xe6dfd2, oat: 0xcdbb9f, charcoal: 0x4a4642 } as Record<string, number>)[f ?? 'ivory'] }),
  'LIB-SEAT-02': (f) => armchair({ colour: ({ oat: 0xd6c8b0, sage: 0x9aa08a, rust: 0xa8654a } as Record<string, number>)[f ?? 'oat'] }),
  'LIB-SEAT-03': (f) => diningChair({ timber: (f as Timber) ?? 'ash' }),
  'LIB-TAB-01': (f) => diningTable({ timber: (f as Timber) ?? 'oak' }),
  'LIB-TAB-02': () => coffeeTable(),
  'LIB-TAB-04': (f) => banquetTable({ linen: ({ white: 0xf1ede5, oat: 0xe3dccf, clay: 0xb98b6e } as Record<string, number>)[f ?? 'white'] }),
  'LIB-BED-01': (f) => bed({ linen: ({ oat: 0xe3dccf, white: 0xf1ede5, clay: 0xb98b6e } as Record<string, number>)[f ?? 'oat'] }),
  'LIB-STO-01': () => sideboard(),
  'LIB-LGT-01': () => pendant(),
  'LIB-LGT-02': () => floorLamp(),
  'LIB-RUG-01': () => rug(),
  'LIB-TEX-01': (f) => throwBlanket({ colour: ({ rust: 0xa86b4f, oat: 0xcfc2aa, moss: 0x6f7652 } as Record<string, number>)[f ?? 'rust'] }),
  'LIB-DEC-01': () => pierced(),
  'LIB-DEC-02': () => twistedRing(),
  'LIB-DEC-03': (f) => vase({ colour: ({ ash: 0xb7b39c, iron: 0x6b4a38, milk: 0xece6da } as Record<string, number>)[f ?? 'ash'] }),
  'LIB-NAT-01': () => harakeke(),
  'LIB-NAT-02': () => tiKouka(),
  'LIB-NAT-03': () => fern(),
  'LIB-TAB-03': (f) => bedsideTable({ timber: (f as Timber) ?? 'oak' }),
  'LIB-LGT-03': () => tableLamp(),
  'LIB-SEAT-04': () => counterStool(),
  'LIB-DEC-04': () => archedMirror(),
  'LIB-STO-02': () => wardrobe(),
  'LIB-TEX-02': () => curtain(),
  'LIB-NAT-04': () => ponga(),
};
void smoothNormals;
