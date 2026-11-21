// Outdoor furniture for decks, built in code at real size (metres): a low teak sofa and lounge chairs with
// weatherproof canvas cushions, a slatted low table, sun loungers, concrete planters with natives, and the
// rules that set them out on a deck with clear walking space. Everything here is a proposal, not from the plan.
import * as THREE from 'three/webgpu';
import { concrete, pbr } from '../objects/tex';
import { boxUV } from '../objects/util';
import { planting, type Species } from './plants';
import { addContactShadow, boxCushionGeo, buildScandiDiningSuite, craftMats, jug, pillowGeo, thrownGeo, TILE, type InteriorMaterials } from './scandiInteriors';

const mk = (g: THREE.BufferGeometry, m: THREE.Material, cast = true) => {
  const o = new THREE.Mesh(g, m);
  o.castShadow = cast;
  o.receiveShadow = true;
  return o;
};
const tag = <T extends THREE.Object3D>(o: T, name: string, material: string) => {
  o.userData = { kind: 'furniture', name, source: 'proposed', material, note: 'Modelled in code; a proposal, not from the plan.' };
  return o;
};
/** a teak board w × h × d centred at (x, y, z), its grain along `along` */
const board = (w: number, h: number, d: number, x: number, y: number, z: number, along: 'x' | 'y' | 'z' = 'x') => mk(boxUV(new THREE.BoxGeometry(w, h, d).translate(x, y, z), TILE.oak, along), craftMats().teak);

let potMat: THREE.MeshPhysicalMaterial | null = null, soilMat: THREE.MeshStandardMaterial | null = null;
const pot = () => (potMat ??= pbr(concrete(512, { colour: 0xbdb6aa, tile: 0.5, seed: 91, pores: 0.6, mottle: 0.8, rough: 0.82, name: 'fibre_cement_planter' }), 'fibre_cement_planter') as unknown as THREE.MeshPhysicalMaterial);

/**
 * A low outdoor seat facing +z, `width` wide over its arms: a teak frame (posts, rails, a slatted back and
 * sides) carrying canvas box cushions with welted seams. One cushion makes a lounge chair, three a sofa.
 */
export function outdoorSeat(width = 2.1, cushions = 3): THREE.Group {
  const C = craftMats(), g = new THREE.Group();
  const dep = 0.86, hw = width / 2, zf = dep / 2, zb = -dep / 2;
  addContactShadow(g, width + 0.3, dep + 0.3, 0, 0);
  for (const s of [-1, 1]) {
    // posts: the back ones run up to carry the back slats, the front ones stop under the arm
    g.add(board(0.05, 0.56, 0.05, s * (hw - 0.025), 0.28, zf - 0.025, 'y'), board(0.05, 0.74, 0.05, s * (hw - 0.025), 0.37, zb + 0.025, 'y'));
    // arm: a flat cap from post to post, one slat under it, and the side rail of the seat frame
    g.add(board(0.075, 0.028, dep + 0.01, s * (hw - 0.025), 0.574, 0, 'z'), board(0.022, 0.07, dep - 0.1, s * (hw - 0.025), 0.44, 0, 'z'), board(0.03, 0.08, dep - 0.1, s * (hw - 0.025), 0.24, 0, 'z'));
  }
  // seat frame front and back, and the slatted seat deck
  g.add(board(width - 0.1, 0.08, 0.03, 0, 0.24, zf - 0.025), board(width - 0.1, 0.08, 0.03, 0, 0.24, zb + 0.025));
  const nd = 7, dw = (dep - 0.12) / nd;
  for (let i = 0; i < nd; i++) g.add(board(width - 0.1, 0.018, dw - 0.012, 0, 0.279, zb + 0.06 + dw * (i + 0.5)));
  // back: three slats between the back posts
  for (const y of [0.42, 0.55, 0.685]) g.add(board(width - 0.1, 0.075, 0.022, 0, y, zb + 0.025));

  const inner = width - 0.12, cw = inner / cushions;
  for (let k = 0; k < cushions; k++) {
    const x = -inner / 2 + cw * (k + 0.5);
    const seat = mk(boxCushionGeo(cw - 0.006, 0.7, 0.14, { crown: 0.024, r: 0.045, edge: 0.02, bulge: 0.008, piping: 0.004, front: 0.008, lump: 0.003, seed: 40 + k, tile: TILE.linen }), C.outdoor);
    seat.position.set(x, 0.358, 0.055);
    g.add(seat);
    const bg = boxCushionGeo(cw - 0.012, 0.36, 0.15, { crown: 0.04, under: 0.012, r: 0.06, edge: 0.03, bulge: 0.01, piping: 0.004, lump: 0.004, seed: 50 + k, tile: TILE.linen }).rotateX(Math.PI / 2);
    const back = mk(boxUV(bg, TILE.linen, 'x'), C.outdoor);
    back.position.set(x, 0.6, zb + 0.145);
    back.rotation.x = -0.16;
    g.add(back);
  }
  // one or two scatter cushions in a lichen green canvas
  const sc = (x: number, yaw: number, seed: number) => { const p = mk(pillowGeo(0.44, 0.44, 0.15, { seed, tile: TILE.linen }), C.outdoorDark); p.position.set(x, 0.62, -0.06); p.rotation.set(-0.32, yaw, 0.04, 'YXZ'); g.add(p); };
  sc(-inner / 2 + 0.25, 0.3, 3);
  if (cushions > 1) sc(inner / 2 - 0.27, -0.25, 4);
  return tag(g, cushions > 1 ? 'Outdoor sofa, teak with canvas cushions' : 'Outdoor lounge chair, teak with canvas cushions', 'oiled teak, weatherproof canvas');
}

/** a low slatted teak table, long axis along x, with a jug and a bowl on it */
export function lowTable(l = 1.0, w = 0.55): THREE.Group {
  const C = craftMats(), g = new THREE.Group();
  addContactShadow(g, l + 0.25, w + 0.25, 0, 0);
  const n = 6, sw = (w - (n - 1) * 0.008) / n;
  for (let i = 0; i < n; i++) g.add(board(l, 0.022, sw, 0, 0.349, -w / 2 + sw / 2 + i * (sw + 0.008)));
  for (const s of [-1, 1]) {
    g.add(board(l - 0.12, 0.05, 0.024, 0, 0.313, s * (w / 2 - 0.05)), board(0.024, 0.05, w - 0.1, s * (l / 2 - 0.07), 0.313, 0, 'z'));
    for (const t of [-1, 1]) g.add(board(0.045, 0.338, 0.045, s * (l / 2 - 0.07), 0.169, t * (w / 2 - 0.05), 'y'));
  }
  const j = jug(C.glazeSand, 0.8);
  j.position.set(-l * 0.22, 0.36, 0.03);
  j.rotation.y = 2.2;
  const bowl = mk(thrownGeo([[0.05, 0], [0.054, 0.01], [0.105, 0.04], [0.15, 0.066]], { wall: 0.006, seg: 36, samples: 16 }), C.glazeWhite);
  bowl.position.set(l * 0.16, 0.36, -0.03);
  g.add(j, bowl);
  return tag(g, 'Low outdoor table, slatted teak', 'oiled teak; stoneware jug and bowl');
}

/** a sun lounger, head at −z with its back raised: teak frame and slats, a canvas pad in two parts */
export function sunLounger(): THREE.Group {
  const C = craftMats(), g = new THREE.Group();
  const L = 2.0, W = 0.68, hinge = -0.28, rake = 0.6;
  addContactShadow(g, W + 0.25, L + 0.2, 0, 0);
  for (const s of [-1, 1]) {
    g.add(board(0.035, 0.07, L, s * (W / 2 - 0.0175), 0.285, 0, 'z'));
    for (const z of [-L / 2 + 0.12, L / 2 - 0.12]) g.add(board(0.05, 0.25, 0.05, s * (W / 2 - 0.045), 0.125, z, 'y'));
  }
  for (const z of [-L / 2 + 0.015, L / 2 - 0.015]) g.add(board(W - 0.07, 0.07, 0.03, 0, 0.285, z));
  // the flat part of the bed, hinge to foot
  const flatLen = L / 2 - hinge - 0.03, nf = 11, fw = flatLen / nf;
  for (let i = 0; i < nf; i++) g.add(board(W - 0.075, 0.018, fw - 0.012, 0, 0.312, hinge + fw * (i + 0.5)));
  // the back: a slatted frame raised on a prop
  const back = new THREE.Group(), backLen = L / 2 + hinge - 0.03, nb = 7, bw = backLen / nb;
  for (const s of [-1, 1]) back.add(board(0.03, 0.03, backLen, s * (W / 2 - 0.055), 0, -backLen / 2, 'z'));
  for (let i = 0; i < nb; i++) back.add(board(W - 0.08, 0.018, bw - 0.012, 0, 0.022, -bw * (i + 0.5)));
  const bpad = mk(boxCushionGeo(W - 0.1, backLen - 0.03, 0.07, { crown: 0.014, r: 0.05, edge: 0.02, piping: 0.004, lump: 0.002, tile: TILE.linen, seed: 61 }), C.outdoor);
  bpad.position.set(0, 0.068, -backLen / 2);
  back.add(bpad);
  back.position.set(0, 0.305, hinge);
  back.rotation.x = rake;
  g.add(back);
  const propTop = new THREE.Vector3(0, 0.305 + Math.sin(rake) * backLen * 0.6, hinge - Math.cos(rake) * backLen * 0.6);
  for (const s of [-1, 1]) { const len = propTop.y - 0.3; g.add(board(0.022, len + 0.02, 0.03, s * (W / 2 - 0.09), 0.3 + len / 2, propTop.z, 'y')); }
  g.add(board(W - 0.16, 0.022, 0.03, 0, propTop.y - 0.005, propTop.z));
  const pad = mk(boxCushionGeo(W - 0.1, flatLen - 0.02, 0.07, { crown: 0.014, r: 0.05, edge: 0.02, piping: 0.004, lump: 0.002, tile: TILE.linen, seed: 62 }), C.outdoor);
  pad.position.set(0, 0.357, hinge + flatLen / 2);
  g.add(pad);
  return tag(g, 'Sun lounger, teak with a canvas pad', 'oiled teak, weatherproof canvas');
}

/** a round fibre-cement planter with a native in it: `r` is the rim radius, `h` the height */
export function planter(r = 0.26, h = 0.5, sp: Species = 'harakeke', size = 0.6, seed = 1): THREE.Group {
  const g = new THREE.Group();
  g.add(mk(thrownGeo([[r * 0.74, 0], [r * 0.77, 0.015], [r * 0.93, h * 0.6], [r, h - 0.03], [r, h]], { wall: 0.022, seg: 40, samples: 14, floor: h - 0.07, tile: 0.5 }), pot()));
  soilMat ??= new THREE.MeshStandardMaterial({ name: 'potting_mix', color: 0x2e241c, roughness: 1 });
  g.add(mk(new THREE.CircleGeometry(r - 0.02, 32).rotateX(-Math.PI / 2).translate(0, h - 0.055, 0), soilMat, false));
  g.add(planting([{ sp, x: 0, y: h - 0.07, z: 0, s: size, r: seed }], 'Deck planter: a proposed native in a pot, not from the plan.'));
  return tag(g, 'Planter with a native', 'fibre cement pot');
}

export interface DeckRect { u0: number; u1: number; v0: number; v1: number; drop?: number }
/**
 * Furnish the decks of one building. The largest deck gets a lounge setting (sofa, two chairs, low table) at
 * the end that reaches past the house and a dining table at the other, with planters at the dining end; a
 * smaller one keeps just the dining table. Every piece stays at least 0.4 m in from the deck's open edges and
 * a metre-wide way is left between the two settings. `W` × `D` is the house footprint (u × v) the decks wrap.
 */
export function furnishDecks(mats: InteriorMaterials, decks: DeckRect[], W: number, D: number, floor = 0): THREE.Group {
  const root = new THREE.Group();
  root.name = 'deck_furniture';
  root.userData = { kind: 'fitout', name: 'Deck furniture (proposed)', source: 'proposed', note: 'Proposed outdoor furniture, modelled in code; not from the plan.' };
  const ds = decks.filter((d) => Math.min(d.u1 - d.u0, d.v1 - d.v0) >= 3.2).sort((p, q) => (q.u1 - q.u0) * (q.v1 - q.v0) - (p.u1 - p.u0) * (p.v1 - p.v0))[0];
  if (!ds) return root;
  const alongU = ds.u1 - ds.u0 >= ds.v1 - ds.v0;
  const L = alongU ? ds.u1 - ds.u0 : ds.v1 - ds.v0, Dp = alongU ? ds.v1 - ds.v0 : ds.u1 - ds.u0;
  const y = floor - (ds.drop ?? 0.05) + 0.005;
  // deck coordinates: a runs along the deck from its lounge end, b across it from the house side
  const [lo, hi, houseLen] = alongU ? [ds.u0, ds.u1, W] : [ds.v0, ds.v1, D];
  const fromLow = -lo >= hi - houseLen; // the end that reaches furthest past the house has the open outlook
  const [c0, c1, houseDep] = alongU ? [ds.v0, ds.v1, D] : [ds.u0, ds.u1, W];
  const houseAtLow = Math.abs(c0 - houseDep) < Math.abs(c1) || c0 >= houseDep - 0.3;
  const A = alongU ? new THREE.Vector3(fromLow ? 1 : -1, 0, 0) : new THREE.Vector3(0, 0, fromLow ? 1 : -1);
  const B = alongU ? new THREE.Vector3(0, 0, houseAtLow ? 1 : -1) : new THREE.Vector3(houseAtLow ? 1 : -1, 0, 0);
  const O = alongU ? new THREE.Vector3(fromLow ? ds.u0 : ds.u1, y, houseAtLow ? ds.v0 : ds.v1) : new THREE.Vector3(houseAtLow ? ds.u0 : ds.u1, y, fromLow ? ds.v0 : ds.v1);
  /** stand a piece at (a, b) with its front towards (fa, fb) */
  const put = (o: THREE.Object3D, a: number, b: number, fa: number, fb: number) => {
    o.position.copy(O).addScaledVector(A, a).addScaledVector(B, b);
    const dir = A.clone().multiplyScalar(fa).addScaledVector(B, fb);
    o.rotation.y = Math.atan2(dir.x, dir.z);
    root.add(o);
  };
  const dining = (a: number, b: number, perSide: number) => put(tag(buildScandiDiningSuite(mats, perSide, 0, true), 'Outdoor table and chairs', 'oiled teak, canvas seat pads; stoneware'), a, b, B.x !== 0 ? 1 : 0, B.x !== 0 ? 0 : 1);
  if (L >= 7.6 && Dp >= 3.4) {
    const bm = Math.min(Dp / 2 + 0.15, Dp - 1.75);
    // the sofa looks out over the lounge end; the low table before it; one chair across the table, one at its house end
    put(outdoorSeat(2.1, 3), 3.53, bm, -1, 0);
    const lt = lowTable(0.95, 0.55);
    put(lt, 2.33, bm, 1, 0);
    put(outdoorSeat(0.82, 1), 1.23, bm - 0.5, 1, 0.3);
    put(outdoorSeat(0.82, 1), 2.36, 0.78, 0.1, 1);
    dining(L - 1.67, Dp / 2, 2);
    put(planter(0.27, 0.52, 'harakeke', 0.62, 1), L - 0.62, 0.47, 0, 1);
    put(planter(0.19, 0.36, 'hebe', 0.55, 2), L - 1.14, 0.36, 0, 1);
    put(planter(0.24, 0.44, 'carex', 0.9, 3), L - 0.64, Dp - 0.66, 0, 1);
  } else {
    dining(L * 0.62, Dp / 2, L >= 5.5 ? 3 : 2);
  }
  // a pair of sun loungers on any other deck deep enough to leave a way past them
  for (const d of decks) {
    if (d === ds) continue;
    const dU = d.u1 - d.u0 >= d.v1 - d.v0, dl = dU ? d.u1 - d.u0 : d.v1 - d.v0, dd = dU ? d.v1 - d.v0 : d.u1 - d.u0;
    if (dd < 2.9 || dl < 3.4) continue;
    const yd = floor - (d.drop ?? 0.05) + 0.005;
    for (const s of [-1, 1]) {
      const lg = sunLounger();
      // side by side at the outer edge, feet towards the outlook, 0.45 m in from the edge
      const outerHigh = dU ? Math.abs(d.v0 - D) < Math.abs(d.v1) || d.v0 >= D - 0.3 : Math.abs(d.u0 - W) < Math.abs(d.u1) || d.u0 >= W - 0.3;
      const across = outerHigh ? (dU ? d.v1 : d.u1) - 0.45 - 1.0 : (dU ? d.v0 : d.u0) + 0.45 + 1.0, mid = (dU ? d.u0 + d.u1 : d.v0 + d.v1) / 2 + s * 0.42;
      lg.position.set(dU ? mid : across, yd, dU ? across : mid);
      lg.rotation.y = dU ? (outerHigh ? 0 : Math.PI) : outerHigh ? Math.PI / 2 : -Math.PI / 2;
      root.add(lg);
    }
  }
  return root;
}
