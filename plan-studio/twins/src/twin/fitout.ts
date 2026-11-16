import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { boxUV, type Quality } from '../objects/util';
import { buildCushion, buildRug, buildThrow } from '../objects/soft';
import { buildKettle } from '../objects/kitchen';
import { buildPendant } from '../objects/nzdesign';
import { build as buildGuitar } from '../objects/guitar';
import { build as buildSpeaker } from '../objects/speaker';
import type { BuildingSpec, RoomSpec } from './homes';
import { slot } from './library';
import { planting, type Species } from './plants';
import { armchair, art, bed, bedside, coffeeTable, desk, diningChair, diningTable, floorLamp, interiorMats, kitchenRun, laundryTub, shower, sofa, toilet, vanity, wardrobe, type Finishes, type InteriorMats } from './furniture';

// The fit-out step: furnish every room of a plan model from its name. Placement follows simple
// rules a designer would start from (bed head against a solid wall, wardrobe opposite the window,
// sofa facing the view, sink under the kitchen window, shower in the corner away from the door),
// so a dropped plan comes back furnished without hand placement. Each piece is a library slot
// (Kate's Kōwhai Studio and curated pieces) with assembl's own procedural piece as the fallback.
// Rooms also get skirtings, sheer curtains at their glazing, a plant and some styling. Everything
// here is "proposed".

type Side = 'N' | 'S' | 'W' | 'E';
interface SideInfo {
  side: Side;
  exterior: boolean;
  /** opening intervals along the side, in the side's running coordinate: [from, to, kind, sill] */
  openings: [number, number, string, number][];
  len: number;
}

/** what the viewer needs to light a room from its windows: home-local metres (x = u, z = v) */
export interface InteriorRoom {
  name: string;
  u0: number;
  u1: number;
  v0: number;
  v1: number;
  ceil: number;
}
export interface InteriorWindow {
  /** centre on the inside face, home-local */
  c: [number, number, number];
  /** inward normal (u, v) */
  n: [number, number];
  w: number;
  h: number;
}

const libCache = new Map<string, THREE.Object3D>();
function lib(key: string, make: () => THREE.Object3D) {
  let o = libCache.get(key);
  if (!o) {
    o = make();
    libCache.set(key, o);
  }
  const c = o.clone(true);
  c.userData = { kind: 'furniture', name: key.replace(/_/g, ' '), source: 'proposed', material: 'from the assembl objects library' };
  return c;
}

function place(o: THREE.Object3D, u: number, v: number, rotY = 0, y = 0) {
  o.position.set(u, y, v);
  o.rotation.y = rotY;
  return o;
}
/** rotation so a piece's front (+z) faces the given side's inward normal */
const faceAwayFrom: Record<Side, number> = { N: 0, S: Math.PI, W: Math.PI / 2, E: -Math.PI / 2 };

/** a potted plant: glazed pot, potting mix and a native at indoor size */
function pottedPlant(M: InteriorMats, sp: Species, h: number, seed: number) {
  const g = new THREE.Group();
  g.name = 'potted_plant';
  const r = 0.17 + h * 0.03;
  const pot = new THREE.CylinderGeometry(r, r * 0.78, r * 1.9, 32, 1, true);
  pot.translate(0, r * 0.95, 0);
  const base = new THREE.CircleGeometry(r * 0.78, 32);
  base.rotateX(Math.PI / 2);
  base.translate(0, 0.005, 0);
  const potM = new THREE.Mesh(mergeGeometries([boxUV(pot, 0.3, 'y'), boxUV(base, 0.3, 'y')]), M.pot);
  potM.name = 'planter_pot';
  potM.castShadow = potM.receiveShadow = true;
  const soil = new THREE.Mesh(new THREE.CircleGeometry(r * 0.96, 32).rotateX(-Math.PI / 2).translate(0, r * 1.75, 0), M.soil);
  soil.name = 'potting_mix';
  const plant = planting([{ sp, x: 0, y: r * 1.7, z: 0, s: h, r: seed }], 'Indoor plant, proposed styling');
  g.add(potM, soil, plant);
  g.userData = { kind: 'furniture', name: 'Potted plant', material: 'glazed ceramic pot', source: 'proposed' };
  return g;
}

/** a short stack of books for a table top */
function books(seed: number) {
  const g = new THREE.Group();
  g.name = 'books';
  const cols = [0x2f3b44, 0xb9a27f, 0x6b3d32, 0xd8d0c2, 0x3f4a3a];
  let y = 0;
  for (let i = 0; i < 3; i++) {
    const w = 0.24 - i * 0.025;
    const d = 0.18 - i * 0.015;
    const t = 0.025 + ((seed + i) % 3) * 0.008;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, t, d).translate(0, y + t / 2, 0), new THREE.MeshStandardMaterial({ color: cols[(seed + i) % cols.length], roughness: 0.75 }));
    b.rotation.y = (i - 1) * 0.12;
    b.castShadow = b.receiveShadow = true;
    g.add(b);
    y += t;
  }
  g.userData = { kind: 'furniture', name: 'Books', source: 'proposed' };
  return g;
}

/** a turned ceramic vase */
function vase(M: InteriorMats, h = 0.24) {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    pts.push(new THREE.Vector2(0.045 + 0.05 * Math.sin(Math.PI * Math.min(1, t * 1.15)) - (t > 0.85 ? (t - 0.85) * 0.2 : 0), t * h));
  }
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), M.ceramic);
  m.name = 'ceramic_vase';
  m.castShadow = m.receiveShadow = true;
  m.userData = { kind: 'furniture', name: 'Ceramic vase', source: 'proposed' };
  return m;
}

export function fitOut(spec: BuildingSpec, q: Quality, fin: Finishes, ceiling: (u: number, v: number) => number, overrides?: (room: RoomSpec, M: InteriorMats) => THREE.Object3D[] | null) {
  const M = interiorMats(q, fin);
  const L = spec.levels[0];
  const W = Math.max(...L.walls.filter((w) => w.axis === 'z').map((w) => w.at));
  const D = Math.max(...L.walls.filter((w) => w.axis === 'x').map((w) => w.at));
  const root = new THREE.Group();
  root.name = 'fit_out';
  root.userData = { kind: 'fitout', name: 'Fit-out (proposed)', source: 'proposed', palette: fin.name };
  const lights: THREE.PointLight[] = [];
  const skirt: THREE.BufferGeometry[] = [];

  const sidesOf = (r: RoomSpec): SideInfo[] => {
    const u0 = r.u;
    const u1 = r.u + r.w;
    const v0 = r.v;
    const v1 = r.v + r.d;
    const near = (a: number, b: number) => Math.abs(a - b) < 0.25;
    const out: SideInfo[] = [];
    const mk = (side: Side, line: number, axis: 'x' | 'z', lo: number, hi: number, exterior: boolean) => {
      const ops: [number, number, string, number][] = [];
      for (const w of L.walls) if (w.axis === axis && near(w.at, line)) for (const o of w.openings ?? []) if (o.b > lo && o.a < hi) ops.push([Math.max(lo, o.a), Math.min(hi, o.b), o.kind, o.sill]);
      for (const p of L.partitions) if (p.axis === axis && near(p.at, line)) for (const o of p.openings ?? []) if (o.b > lo && o.a < hi) ops.push([Math.max(lo, o.a), Math.min(hi, o.b), o.kind, o.sill]);
      out.push({ side, exterior, openings: ops, len: hi - lo });
    };
    mk('N', v0, 'x', u0, u1, v0 < 0.25);
    mk('S', v1, 'x', u0, u1, v1 > D - 0.25);
    mk('W', u0, 'z', v0, v1, u0 < 0.25);
    mk('E', u1, 'z', v0, v1, u1 > W - 0.25);
    return out;
  };
  const openLen = (s: SideInfo) => s.openings.reduce((a, [x, y]) => a + (y - x), 0);
  const winSide = (ss: SideInfo[]) => ss.filter((s) => s.exterior && s.openings.length).sort((a, b) => openLen(b) - openLen(a))[0];
  const opposite: Record<Side, Side> = { N: 'S', S: 'N', W: 'E', E: 'W' };
  const perp: Record<Side, Side[]> = { N: ['W', 'E'], S: ['W', 'E'], W: ['N', 'S'], E: ['N', 'S'] };
  const doorsOn = (s: SideInfo) => s.openings.filter(([, , k]) => k === 'door' || k === 'opening');

  // which sides of a room have wall (a partition or an exterior wall) at all: open-plan edges get no skirting
  const hasWall = (r: RoomSpec, side: Side) => {
    const line = side === 'N' ? r.v : side === 'S' ? r.v + r.d : side === 'W' ? r.u : r.u + r.w;
    const axis = side === 'N' || side === 'S' ? 'x' : 'z';
    const lo = axis === 'x' ? r.u : r.v;
    const hi = axis === 'x' ? r.u + r.w : r.v + r.d;
    const near = (a: number) => Math.abs(a - line) < 0.25;
    const cover: [number, number][] = [];
    for (const w of [...L.walls, ...L.partitions]) if (w.axis === axis && near(w.at) && w.to > lo && w.from < hi) cover.push([Math.max(lo, w.from), Math.min(hi, w.to)]);
    return cover;
  };

  for (const r of L.rooms) {
    const n = r.name.toLowerCase();
    const u0 = r.u;
    const u1 = r.u + r.w;
    const v0 = r.v;
    const v1 = r.v + r.d;
    const cu = (u0 + u1) / 2;
    const cv = (v0 + v1) / 2;
    const g = new THREE.Group();
    g.name = `fitout_${r.id}_${n.replace(/[^a-z0-9]+/g, '_')}`;
    const ss = sidesOf(r);
    const by = Object.fromEntries(ss.map((s) => [s.side, s])) as Record<Side, SideInfo>;
    const ws = winSide(ss) ?? by.N;
    const at = (side: Side, along: number, inset: number): [number, number] => {
      if (side === 'N') return [along, v0 + inset];
      if (side === 'S') return [along, v1 - inset];
      if (side === 'W') return [u0 + inset, along];
      return [u1 - inset, along];
    };

    // skirtings: 65 × 12 mm wherever there is wall, broken at doors, openings and floor-level glazing
    if (!/bath|ensuite|shower|wc|toilet/.test(n)) {
      for (const s of ss) {
        for (const [a0, a1] of hasWall(r, s.side)) {
          const cuts = s.openings.filter(([, , k, sill]) => k !== 'window' || sill < 0.1).map(([a, b]) => [a, b] as [number, number]).sort((x, y) => x[0] - y[0]);
          let x = a0;
          const segs: [number, number][] = [];
          for (const [a, b] of cuts) {
            if (a > x + 0.02) segs.push([x, Math.min(a, a1)]);
            x = Math.max(x, b);
          }
          if (a1 > x + 0.02) segs.push([x, a1]);
          for (const [a, b] of segs) {
            const len = b - a;
            if (len < 0.05) continue;
            const mid = (a + b) / 2;
            const [pu, pv] = at(s.side, mid, 0.006);
            const geo = new THREE.BoxGeometry(s.side === 'N' || s.side === 'S' ? len : 0.012, 0.065, s.side === 'N' || s.side === 'S' ? 0.012 : len);
            geo.translate(pu, 0.0325, pv);
            skirt.push(boxUV(geo, 0.5, 'x'));
          }
        }
      }
    }

    // sheer curtains, stacked either side of every floor-length opening in living rooms and bedrooms
    const curtains = (s: SideInfo) => {
      for (const [a, b, k, sill] of s.openings) {
        if (k === 'opening' || (k === 'door' && !s.exterior)) continue;
        if (sill > 0.2 && !/bed/.test(n)) continue;
        for (const e of [a, b]) {
          const w = Math.min(0.5, Math.max(0.3, (b - a) * 0.18));
          const along = e === a ? a - 0.04 + w / 2 : b + 0.04 - w / 2;
          const [pu, pv] = at(s.side, along, 0.07);
          const top = Math.min(3.0, ceiling(pu, pv) - 0.02);
          const sl = slot('curtain', null, { fitW: w, fitH: top - 0.015 });
          g.add(place(sl, pu, pv, faceAwayFrom[s.side], 0.015));
        }
      }
    };

    const custom = overrides?.(r, M);
    if (custom) {
      g.add(...custom);
      root.add(g);
      continue;
    }

    if (/bed/.test(n) && !/bunk/.test(n)) {
      // headboard on a perpendicular solid wall, exterior if possible
      const cands = perp[ws.side].map((s) => by[s]).sort((a, b) => Number(b.exterior && !b.openings.length) - Number(a.exterior && !a.openings.length) || openLen(a) - openLen(b));
      const hs = cands[0];
      const robeSide = by[opposite[ws.side]];
      const robeD = robeSide.len > 1.2 && !robeSide.exterior ? 0.6 : 0;
      const across = ws.side === 'N' || ws.side === 'S' ? [v0, v1] : [u0, u1];
      const lo = ws.side === 'N' || ws.side === 'W' ? across[0] + 0.3 : across[0] + robeD + 0.05;
      const hi = ws.side === 'N' || ws.side === 'W' ? across[1] - robeD - 0.05 : across[1] - 0.3;
      const mid = (lo + hi) / 2;
      const bw = Math.min(1.53, hi - lo - 0.9 > 1.53 ? 1.53 : Math.max(1.37, hi - lo - 0.9));
      // the library bed is a king; at queen width it is narrowed to suit these rooms
      const [bu, bv] = at(hs.side, mid, 2.03 / 2 + 0.03);
      g.add(place(slot('bed', bed(M, bw), { fitW: bw + 0.2 }), bu, bv, faceAwayFrom[hs.side]));
      const [ru, rv] = at(hs.side, mid, 1.45);
      g.add(place(slot('rug', null, { maxW: 2.6 }), ru, rv, faceAwayFrom[hs.side] + Math.PI / 2, 0.002));
      for (const s of [-1, 1]) {
        const off = mid + s * (bw / 2 + 0.36);
        if (off - 0.26 < lo - 0.25 || off + 0.26 > hi + 0.25) continue;
        const [tu, tv] = at(hs.side, off, 0.24);
        g.add(place(slot('bedside', bedside(M)), tu, tv, faceAwayFrom[hs.side]));
        const [lu, lv] = at(hs.side, off + s * 0.08, 0.2);
        g.add(place(slot('table_lamp'), lu, lv, faceAwayFrom[hs.side], 0.54));
      }
      if (robeD) {
        // wardrobe along the side opposite the window, clear of any door on the adjacent sides
        const runLo = robeSide.side === 'N' || robeSide.side === 'S' ? u0 : v0;
        const runHi = robeSide.side === 'N' || robeSide.side === 'S' ? u1 : v1;
        let a = runLo + 0.02;
        let b = runHi - 0.02;
        for (const ps of perp[robeSide.side]) {
          const dd = doorsOn(by[ps]);
          const nearEnd = dd.some(([x, y]) => (robeSide.side === 'S' || robeSide.side === 'E' ? y > runHi - 1.1 : x < runLo + 1.1));
          if (nearEnd) {
            if (ps === 'W' || ps === 'N') a += 0.9;
            else b -= 0.9;
          }
        }
        for (const [x, y] of doorsOn(robeSide)) {
          if (x - a > b - y) b = Math.min(b, x - 0.1);
          else a = Math.max(a, y + 0.1);
        }
        if (b - a > 0.9) {
          const [wu, wv] = at(robeSide.side, (a + b) / 2, 0.3);
          g.add(place(wardrobe(M, b - a, Math.min(2.4, ceiling(wu, wv) - 0.05)), wu, wv, faceAwayFrom[robeSide.side]));
        }
      }
      const [au, av] = at(opposite[hs.side], (lo + hi) / 2, 0.02);
      const pic = art(M, 0.8, 0.6, r.id.length);
      pic.position.set(au, 1.5, av);
      pic.rotation.y = faceAwayFrom[opposite[hs.side]];
      g.add(pic);
      curtains(ws);
      // a plant in the window corner away from the bed
      const pcAlong = ws.side === 'N' || ws.side === 'S' ? (hs.side === 'W' ? u1 - 0.32 : u0 + 0.32) : hs.side === 'N' ? v1 - 0.32 : v0 + 0.32;
      const [pu, pv] = at(ws.side, pcAlong, 0.32);
      g.add(place(pottedPlant(M, 'kawakawa', 0.55, r.id.length), pu, pv));
    } else if (/lounge|living|family/.test(n)) {
      // sofa with its back to the side opposite the view, facing the window
      const back = opposite[ws.side];
      const depth = ws.side === 'N' || ws.side === 'S' ? r.d : r.w;
      const span = ws.side === 'N' || ws.side === 'S' ? r.w : r.d;
      const centre = ws.side === 'N' || ws.side === 'S' ? cu : cv;
      const sw = Math.min(2.3, span - 0.8);
      const inset = Math.min(depth - 1.6, 0.55);
      const [su, sv] = at(back, centre, inset);
      g.add(place(slot('sofa', sofa(M, sw), { maxW: span - 0.9 }), su, sv, faceAwayFrom[back]));
      const [tu, tv] = at(back, centre, inset + 1.12);
      g.add(place(slot('coffee_table', coffeeTable(M), { maxD: 0.9 }), tu, tv, faceAwayFrom[back]));
      const [mu, mv] = at(back, centre - 0.25, inset + 1.12);
      g.add(place(books(r.id.length), mu, mv, faceAwayFrom[back] + 0.2, 0.38));
      const [ru, rv] = at(back, centre, inset + 0.8);
      g.add(place(slot('rug', lib('wool_rug', () => buildRug(q))), ru, rv, faceAwayFrom[back], 0.002));
      const [cu2, cv2] = at(back, centre + sw / 2 + 0.5, inset + 1.35);
      g.add(place(slot('armchair', armchair(M)), cu2, cv2, faceAwayFrom[back] - (Math.PI / 2) * 0.6));
      const [lu, lv] = at(back, centre - sw / 2 - 0.35, 0.32);
      g.add(place(slot('floor_lamp', floorLamp(M)), lu, lv, faceAwayFrom[back]));
      // the guitar on a wall hanger beside the sofa, a speaker by the glazing, a plant in the corner
      const [gu, gv] = at(back, centre + sw / 2 + 0.35, 0.0);
      g.add(place(slot('guitar', lib('guitar', () => buildGuitar(q))), gu, gv, faceAwayFrom[back], 0.9));
      const spAlong = (ws.side === 'N' || ws.side === 'S' ? u1 : v1) - 0.3;
      const [ku, kv] = at(ws.side, spAlong, 0.35);
      g.add(place(slot('speaker', lib('speaker', () => buildSpeaker(q))), ku, kv, faceAwayFrom[ws.side] + Math.PI + 0.35));
      const plAlong = (ws.side === 'N' || ws.side === 'S' ? u0 : v0) + 0.34;
      const [pu, pv] = at(ws.side, plAlong, 0.34);
      g.add(place(pottedPlant(M, 'harakeke', 0.7, 3), pu, pv));
      const th = lib('wool_throw', () => buildThrow(q));
      const [hu, hv] = at(back, centre - sw / 2 + 0.3, inset - 0.05);
      g.add(place(th, hu, hv, faceAwayFrom[back], 0.62));
      for (const s of [-1, 1]) {
        const cush = lib('cushion', () => buildCushion(q));
        const [xu, xv] = at(back, centre + s * (sw / 2 - 0.45), inset - 0.18);
        cush.scale.setScalar(0.9);
        g.add(place(cush, xu, xv, faceAwayFrom[back] + s * 0.25 - Math.PI / 2 * 0, 0.48));
      }
      curtains(ws);
    } else if (/dining/.test(n)) {
      const longU = r.w >= r.d;
      const l = Math.min(1.8, (longU ? r.w : r.d) - 1.4);
      const tb = diningTable(M, Math.max(1.2, l), 0.9);
      g.add(place(tb, cu, cv, longU ? 0 : Math.PI / 2));
      const seats = l >= 1.6 ? 3 : 2;
      for (let i = 0; i < seats; i++) {
        const t = (i + 0.5) / seats - 0.5;
        for (const s of [-1, 1]) {
          const du = longU ? t * l : s * 0.6;
          const dv = longU ? s * 0.6 : t * l;
          const rot = longU ? (s > 0 ? Math.PI : 0) : s > 0 ? -Math.PI / 2 : Math.PI / 2;
          g.add(place(slot('dining_chair', diningChair(M)), cu + du, cv + dv, rot));
        }
      }
      g.add(place(vase(M), cu + 0.15, cv - 0.05, 0, 0.75));
      const top = ceiling(cu, cv);
      const pend = slot('pendant', lib('pendant', () => buildPendant(q)));
      pend.position.set(cu, top - 0.01, cv);
      // the procedural pendant hangs from its own origin
      pend.children.forEach((c) => (c.position.y = -0.9 - 0.25 + Math.max(0, top - 3.0) * -0.4));
      g.add(pend);
      const lamp = new THREE.PointLight(0xffd9a8, 0, 6, 2);
      lamp.position.set(cu, Math.min(top - 1.0, 2.0), cv);
      lamp.castShadow = false;
      lamp.visible = false;
      lights.push(lamp);
      g.add(lamp);
    } else if (/kitchen/.test(n)) {
      const fit = (L.fitout ?? []).find((f) => f.u0 >= u0 - 0.3 && f.u1 <= u1 + 0.3 && f.v0 >= v0 - 0.3 && f.v1 <= v1 + 0.3);
      // the run goes on the window side (sink under the window), else the longest exterior side
      const runSide = ws ?? ss.filter((s) => s.exterior).sort((a, b) => b.len - a.len)[0] ?? by.S;
      const lo = runSide.side === 'N' || runSide.side === 'S' ? u0 : v0;
      const hi = runSide.side === 'N' || runSide.side === 'S' ? u1 : v1;
      const len = fit ? Math.min(hi - lo, Math.max(fit.u1 - fit.u0, fit.v1 - fit.v0) + 0.7) : hi - lo - 0.05;
      const start = hi - len;
      const win = runSide.openings.find(([, , k]) => k === 'window');
      const mid = (start + hi) / 2;
      const local = (x: number) => (runSide.side === 'S' || runSide.side === 'W' ? -(x - mid) : x - mid);
      const run = kitchenRun(M, len, {
        fridge: len > 2.6,
        sinkAt: win ? local((win[0] + win[1]) / 2) : undefined,
        windowFrom: win ? Math.min(local(win[0]), local(win[1])) : undefined,
        windowTo: win ? Math.max(local(win[0]), local(win[1])) : undefined,
      });
      const [ku, kv] = at(runSide.side, mid, 0.3);
      g.add(place(run, ku, kv, faceAwayFrom[runSide.side]));
      // bench-top things along the run, away from the sink: kettle, toaster, coffee, knives
      const benchY = 0.91;
      const along = (x: number, inset: number) => at(runSide.side, x, inset);
      const sinkAt = win ? (win[0] + win[1]) / 2 : hi - 0.6;
      const spots = [start + 0.3, start + 0.62, start + 0.95, start + 1.25].filter((x) => Math.abs(x - sinkAt) > 0.45);
      const items: [string, () => THREE.Object3D | null, number][] = [
        ['kettle', () => lib('kettle', () => buildKettle(q)), 0.22],
        ['toaster', () => null, 0.18],
        ['espresso', () => null, 0.18],
        ['knife_block', () => null, 0.42],
      ];
      items.forEach(([role, fb, inset], i) => {
        if (i >= spots.length) return;
        const [eu, ev] = along(spots[i], inset + 0.0);
        g.add(place(slot(role, fb()), eu, ev, faceAwayFrom[runSide.side] + (role === 'kettle' ? 0.4 : 0), benchY));
      });
    } else if (/bath|ensuite|shower/.test(n)) {
      // shower in the corner furthest from the door
      const door = ss.flatMap((s) => doorsOn(s).map(([x, y]) => at(s.side, (x + y) / 2, 0)))[0] ?? [cu, cv];
      const corners: [number, number, Side, Side][] = [
        [u0, v0, 'N', 'W'],
        [u1, v0, 'N', 'E'],
        [u0, v1, 'S', 'W'],
        [u1, v1, 'S', 'E'],
      ];
      corners.sort((a, b) => Math.hypot(b[0] - door[0], b[1] - door[1]) - Math.hypot(a[0] - door[0], a[1] - door[1]));
      const [xu, xv, s1, s2] = corners[0];
      const sw = Math.min(0.9, r.w - 0.8);
      const sd = Math.min(0.9, r.d - 0.8);
      const su = xu + (s2 === 'W' ? sw / 2 : -sw / 2);
      const sv = xv + (s1 === 'N' ? sd / 2 : -sd / 2);
      const sh = shower(M, sw, sd);
      // the shower's back wall is at its −z: turn it so the tiles sit against the corner walls
      sh.rotation.y = s1 === 'N' ? (s2 === 'W' ? 0 : -Math.PI / 2) : s2 === 'W' ? Math.PI / 2 : Math.PI;
      sh.position.set(su, 0, sv);
      g.add(sh);
      // vanity along the other long side with the arched mirror over it, toilet beside it
      const vs: Side = s1 === 'N' ? 'S' : 'N';
      const alongLo = s2 === 'W' ? u0 + sw + 0.05 : u0 + 0.05;
      const alongHi = s2 === 'W' ? u1 - 0.05 : u1 - sw - 0.05;
      const vw = Math.min(0.75, alongHi - alongLo - 0.7);
      const [vu, vv] = at(vs, alongLo + 0.42, 0.24);
      const van = vanity(M, vw);
      van.getObjectByName('mirror')?.removeFromParent();
      g.add(place(van, vu, vv, faceAwayFrom[vs]));
      const [mu, mv] = at(vs, alongLo + 0.42, 0.0);
      const fbMirror = new THREE.Mesh(new THREE.BoxGeometry(vw - 0.05, 0.75, 0.01).translate(0, 0.375, 0.005), M.chrome);
      fbMirror.name = 'mirror';
      g.add(place(slot('mirror', fbMirror), mu, mv, faceAwayFrom[vs], 1.08));
      const tAlong = s2 === 'W' ? alongHi - 0.25 : alongLo + 0.25;
      const [tu, tv] = at(s1, tAlong, 0.0);
      const fbToilet = toilet(M);
      fbToilet.position.z = 0.3;
      g.add(place(slot('toilet', fbToilet), tu, tv, faceAwayFrom[s1]));
      // towel rail on the wall opposite the shower's long side, where there is room
      const trSide: Side = s2 === 'W' ? 'E' : 'W';
      const trAlong = (trSide === 'E' || trSide === 'W' ? (s1 === 'N' ? v1 - 0.45 : v0 + 0.45) : cu);
      if (!by[trSide].openings.some(([a, b]) => trAlong > a - 0.35 && trAlong < b + 0.35)) {
        const [ou, ov] = at(trSide, trAlong, 0.0);
        g.add(place(slot('towel_rail'), ou, ov, faceAwayFrom[trSide], 0.55));
      }
    } else if (/l'?dry|laundry/.test(n)) {
      const s = by[opposite[ws.side]];
      const [lu, lv] = at(s.side, cu, 0.26);
      g.add(place(laundryTub(M), lu, lv, faceAwayFrom[s.side]));
      if (/wc/.test(n)) {
        const [tu, tv] = at(ws.side, (ws.side === 'N' || ws.side === 'S' ? u0 : v0) + 0.45, 0.3);
        g.add(place(toilet(M), tu, tv, faceAwayFrom[ws.side]));
      }
    } else if (/^wc|toilet/.test(n)) {
      const s = ss.filter((x) => !doorsOn(x).length).sort((a, b) => a.len - b.len)[0] ?? by.N;
      const [tu, tv] = at(s.side, s.side === 'N' || s.side === 'S' ? cu : cv, 0.0);
      const fb = toilet(M);
      fb.position.z = 0.3;
      g.add(place(slot('toilet', fb), tu, tv, faceAwayFrom[s.side]));
    } else if (/study|office/.test(n)) {
      const s = ws ?? by.N;
      const [du, dv] = at(s.side, s.side === 'N' || s.side === 'S' ? cu : cv, 0.36);
      g.add(place(desk(M, Math.min(1.4, s.len - 0.4)), du, dv, faceAwayFrom[s.side] + Math.PI));
      const [cu3, cv3] = at(s.side, s.side === 'N' || s.side === 'S' ? cu : cv, 0.95);
      g.add(place(diningChair(M), cu3, cv3, faceAwayFrom[s.side] + Math.PI));
      const [lu, lv] = at(s.side, (s.side === 'N' || s.side === 'S' ? cu : cv) + 0.5, 0.25);
      g.add(place(slot('table_lamp'), lu, lv, faceAwayFrom[s.side], 0.75));
      curtains(s);
    } else if (/w\/r|robe|walk/.test(n)) {
      const s = ss.filter((x) => !doorsOn(x).length).sort((a, b) => b.len - a.len)[0] ?? by.N;
      const [wu, wv] = at(s.side, s.side === 'N' || s.side === 'S' ? cu : cv, 0.3);
      g.add(place(wardrobe(M, s.len - 0.1, Math.min(2.4, ceiling(wu, wv) - 0.05)), wu, wv, faceAwayFrom[s.side]));
    }
    // a soft light in every room for evenings
    if (!/hall|w\/r|robe/.test(n)) {
      const p = new THREE.PointLight(0xffd6a0, 0, Math.max(r.w, r.d) * 1.8, 2);
      p.position.set(cu, Math.min(2.3, ceiling(cu, cv) - 0.3), cv);
      p.castShadow = false;
      p.visible = false;
      lights.push(p);
      g.add(p);
    }
    root.add(g);
  }
  if (skirt.length) {
    const sk = new THREE.Mesh(mergeGeometries(skirt), M.trim);
    sk.name = 'skirtings';
    sk.receiveShadow = true;
    sk.userData = { kind: 'fitout', name: 'Skirtings, 65 × 12 mm painted', source: 'proposed' };
    root.add(sk);
  }

  // what the viewer needs for daylight through the glazing (see App.updateInterior)
  const rooms: InteriorRoom[] = L.rooms.map((r) => ({ name: r.name, u0: r.u, u1: r.u + r.w, v0: r.v, v1: r.v + r.d, ceil: ceiling(r.u + r.w / 2, r.v + r.d / 2) }));
  const windows: InteriorWindow[] = [];
  for (const w of L.walls) {
    const inward: [number, number] = w.axis === 'x' ? (w.at < D / 2 ? [0, 1] : [0, -1]) : w.at < W / 2 ? [1, 0] : [-1, 0];
    const face = w.at + (w.axis === 'x' ? inward[1] : inward[0]) * (w.thickness + 0.02);
    for (const o of w.openings ?? []) {
      if (o.kind === 'door' && o.type === 'hinged') continue;
      const mid = (o.a + o.b) / 2;
      const y = (o.sill + o.head) / 2;
      windows.push({ c: w.axis === 'x' ? [mid, y, face] : [face, y, mid], n: inward, w: o.b - o.a, h: o.head - o.sill });
    }
  }
  root.userData.interior = { rooms, windows };
  root.userData.lights = lights;
  root.userData.mats = M;
  return root;
}

/** evening: interior lamps on, glowing shades */
export function setInteriorLights(fitouts: THREE.Object3D[], night: number) {
  for (const f of fitouts) {
    const lights = (f.userData.lights ?? []) as THREE.PointLight[];
    for (const l of lights) {
      l.intensity = night * 7;
      l.visible = night > 0.05;
    }
    const M = f.userData.mats as InteriorMats | undefined;
    if (M) M.lampGlow.emissiveIntensity = night * 2.2;
  }
}
