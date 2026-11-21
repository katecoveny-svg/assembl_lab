import { espresso, kettle, knifeBlock, mixerTap, showerSet, tableLamp, toaster, towelRail, towelStack, wallMirror } from './fittings';
import { scandiIsland, scandiMats, suite } from './editorial';
import { buildDiningChair, buildMasterBedroomSuite, buildScandiDiningSuite, buildSculptedBoucleSofa, craftMats } from './scandiInteriors';
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
/** the code-built Scandinavian suites in place of the library pieces (set by a project before it builds) */
export const scandi = { on: false };

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
      if (scandi.on) return;
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
      // a bedroom that opens onto its own wardrobe room needs no second wardrobe along a wall
      const hasRobeRoom = L.rooms.some((x) => x !== r && /w\/r|robe|walk/i.test(x.name) && x.u < u1 + 0.4 && x.u + x.w > u0 - 0.4 && x.v < v1 + 0.4 && x.v + x.d > v0 - 0.4);
      const robeD = !hasRobeRoom && robeSide.len > 1.2 && !robeSide.exterior ? 0.6 : 0;
      const across = ws.side === 'N' || ws.side === 'S' ? [v0, v1] : [u0, u1];
      const lo = ws.side === 'N' || ws.side === 'W' ? across[0] + 0.3 : across[0] + robeD + 0.05;
      const hi = ws.side === 'N' || ws.side === 'W' ? across[1] - robeD - 0.05 : across[1] - 0.3;
      const mid = (lo + hi) / 2;
      const bw = Math.min(1.53, hi - lo - 0.9 > 1.53 ? 1.53 : Math.max(1.37, hi - lo - 0.9));
      if (scandi.on) {
        // the bed at its real size (never scaled): a queen where the room takes one, else a double or a king single
        const avail = hi - lo;
        const bw2 = avail >= 2.25 ? 1.53 : avail >= 1.95 ? 1.37 : 1.07, bl2 = bw2 < 1.2 ? 1.9 : 2.03;
        // centred on the widest solid stretch of its head wall when the headboard fits there (between two windows, say)
        const hLo = hs.side === 'N' || hs.side === 'S' ? u0 : v0, hHi = hLo + hs.len;
        let gap: [number, number] = [hLo, hHi], x = hLo;
        const gaps: [number, number][] = [];
        for (const [a, b] of [...hs.openings].sort((p, q2) => p[0] - q2[0])) { if (a > x) gaps.push([x, a]); x = Math.max(x, b); }
        if (hHi > x) gaps.push([x, hHi]);
        gap = gaps.sort((p, q2) => q2[1] - q2[0] - (p[1] - p[0]))[0] ?? gap;
        const bedMid = gap[1] - gap[0] >= bw2 + 0.16 && hs.openings.length ? Math.min(hi - bw2 / 2 - 0.1, Math.max(lo + bw2 / 2 + 0.1, (gap[0] + gap[1]) / 2)) : mid;
        // a side table where there is 450 mm clear beside the bed; the suite's +x runs along the wall this way
        const sgn = hs.side === 'E' || hs.side === 'N' ? 1 : -1;
        const tableFits = (dir: number) => { const c = bedMid + dir * (bw2 / 2 + 0.34); return c - 0.22 >= hLo + 0.04 + (dir < 0 && lo > hLo + 0.31 ? lo - hLo : 0) && c + 0.22 <= hHi - 0.04 - (dir > 0 && hi < hHi - 0.31 ? hHi - hi : 0); };
        const deep = hs.side === 'N' || hs.side === 'S' ? r.d : r.w;
        const sb = suite(buildMasterBedroomSuite(scandiMats(), { w: bw2, l: bl2, tables: [tableFits(-sgn), tableFits(sgn)], rugW: Math.min(bw2 + 1.3, avail - 0.2), rugD: Math.max(0, Math.min(2.0, deep - 1.0)) }), 'Oak bed, linen and side tables', 'European oak, washed linen, wool, turned ceramic lamps');
        const [xu, xv] = at(hs.side, bedMid, bl2 / 2 + 0.12);
        g.add(place(sb, xu, xv, faceAwayFrom[hs.side]));
      } else {
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
      // a print on the wall facing the bed, only where there is a metre of solid wall to hang it on
      {
        const os = by[opposite[hs.side]], oLo = os.side === 'N' || os.side === 'S' ? u0 : v0;
        const cover = hasWall(r, os.side);
        let best: [number, number] | null = null;
        for (const [c0, c1] of cover) {
          let x2 = Math.max(c0, oLo + robeD);
          for (const [a, b] of [...os.openings].sort((p, q2) => p[0] - q2[0]).concat([[c1, c1, '', 0]])) { if (Math.min(a, c1) - x2 > (best ? best[1] - best[0] : 1.0)) best = [x2, Math.min(a, c1)]; x2 = Math.max(x2, b); }
        }
        if (best) {
          const [au, av] = at(os.side, (best[0] + best[1]) / 2, 0.02);
          const pic = art(M, 0.8, 0.6, r.id.length);
          pic.position.set(au, 1.5, av);
          pic.rotation.y = faceAwayFrom[os.side];
          g.add(pic);
        }
      }
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
      if (scandi.on && span >= 3.3 && depth >= 3.4) {
        // the bouclé sofa suite, facing the view: three seats where the room is wide enough, clear of any bench that reaches in behind it
        const seats = span >= 4.75 ? 3 : 2;
        const sw2 = seats * 1.07;
        let inset2 = hasWall(r, back).length ? 0.62 : 0.95;
        for (const f of L.fitout ?? []) {
          if (f.y0 > 0.3) continue;
          const [into, a0, a1] = back === 'N' ? [f.v1 - v0, f.u0, f.u1] : back === 'S' ? [v1 - f.v0, f.u0, f.u1] : back === 'W' ? [f.u1 - u0, f.v0, f.v1] : [u1 - f.u0, f.v0, f.v1];
          const far = back === 'N' ? f.v0 - v0 : back === 'S' ? v1 - f.v1 : back === 'W' ? f.u0 - u0 : u1 - f.u1;
          if (into > -0.7 && far < 1.2 && a1 > centre - sw2 / 2 - 0.9 && a0 < centre + sw2 / 2 + 0.9) inset2 = Math.max(inset2, into + 0.95 + 0.52);
        }
        inset2 = Math.min(inset2, depth - 2.75);
        const rugBack = Math.min(1.02, inset2 - 0.06);
        const rugDepth = Math.min(3.2, depth - inset2 - 0.25 + rugBack);
        const sofaSuite = suite(buildSculptedBoucleSofa(scandiMats(), seats, rugDepth, rugBack), 'Bouclé sofa, travertine table, wool rug and arc lamp', 'bouclé wool, oiled oak, veincut travertine, bronze');
        // the lamp stands off one end: centre the whole group in the room
        const wrap = new THREE.Group();
        sofaSuite.position.x = span - sw2 > 1.9 ? 0.3 : 0.12;
        wrap.add(sofaSuite);
        wrap.userData = sofaSuite.userData;
        const [xu, xv] = at(back, centre, inset2);
        g.add(place(wrap, xu, xv, faceAwayFrom[back]));
        const plA = (ws.side === 'N' || ws.side === 'S' ? u0 : v0) + 0.36;
        const [qu, qv] = at(ws.side, plA, 0.36);
        g.add(place(pottedPlant(M, 'harakeke', 0.75, 3), qu, qv));
      } else {
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
      }
    } else if (/dining/.test(n)) {
      const longU = r.w >= r.d;
      if (scandi.on && Math.max(r.w, r.d) >= 3.1 && Math.min(r.w, r.d) >= 2.6) {
        const ds = suite(buildScandiDiningSuite(scandiMats(), Math.max(r.w, r.d) >= 3.9 ? 3 : 2, ceiling(cu, cv)), 'Oak dining table, six chairs and lantern', 'European oak, linen, alabaster and bronze lantern');
        g.add(place(ds, cu, cv, longU ? 0 : Math.PI / 2));
        const lamp2 = new THREE.PointLight(0xffd9a8, 0, 6, 2);
        lamp2.position.set(cu, 1.6, cv);
        lamp2.visible = false;
        lights.push(lamp2);
        g.add(lamp2);
        root.add(g);
        continue;
      }
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
      if (scandi.on) { const ts = run.getObjectByName('slot_tap'); if (ts) { ts.clear(); ts.add(mixerTap()); } }
      const [ku, kv] = at(runSide.side, mid, 0.3);
      g.add(place(run, ku, kv, faceAwayFrom[runSide.side]));
      if (scandi.on) {
        for (const f of L.fitout ?? []) {
          if (!/island/i.test(f.name) || f.y0 > 0.2 || !(f.u1 > u0 - 0.5 && f.u0 < u1 + 0.5 && f.v1 > v0 - 0.5 && f.v0 < v1 + 0.9)) continue;
          const lu = f.u1 - f.u0, lv = f.v1 - f.v0, alongU = lu >= lv;
          // stools on the long side away from the run
          const runNear = runSide.side === 'N' ? f.v0 - v0 : runSide.side === 'S' ? v1 - f.v1 : runSide.side === 'W' ? f.u0 - u0 : u1 - f.u1;
          void runNear;
          const flip = alongU ? runSide.side === 'S' : runSide.side === 'E';
          const isl = suite(scandiIsland(alongU ? lu : lv, alongU ? lv : lu, 3), 'Island: fluted oak, travertine top, bar stools', 'European oak, veincut travertine, bouclé and steel stools');
          g.add(place(isl, (f.u0 + f.u1) / 2, (f.v0 + f.v1) / 2, alongU ? (flip ? Math.PI : 0) : flip ? -Math.PI / 2 : Math.PI / 2));
        }
      }
      // bench-top things on the clear stretches of bench, never on the cooktop or at the sink: coffee, toaster and
      // kettle together on the longest stretch (packed from the end away from the sink), knives on the next
      const bench = run.userData.bench as { free: [number, number][]; sinkAt: number; y: number } | undefined;
      const toAlong = (xl: number) => (runSide.side === 'S' || runSide.side === 'W' ? mid - xl : mid + xl);
      const items: [string, () => THREE.Object3D | null, number, number, number][] = [
        ['espresso', () => (scandi.on ? espresso() : null), 0.36, 0.26, 0],
        ['toaster', () => (scandi.on ? toaster() : null), 0.36, 0.2, 0.12],
        ['kettle', () => (scandi.on ? kettle() : lib('kettle', () => buildKettle(q))), 0.26, 0.21, -0.9],
        ['knife_block', () => (scandi.on ? knifeBlock() : null), 0.16, 0.17, 0],
      ];
      if (bench) {
        const spans = [...bench.free].sort((p, q2) => q2[1] - q2[0] - (p[1] - p[0])).map(([a2, b2]) => ({ a: a2, b: b2, fromB: Math.abs(b2 - bench.sinkAt) > Math.abs(a2 - bench.sinkAt), used: 0.05 }));
        for (const [role, make, w, inset, turn] of items) {
          const sp = spans.find((x) => x.b - x.a - x.used >= w);
          if (!sp) continue;
          const xl = sp.fromB ? sp.b - sp.used - w / 2 : sp.a + sp.used + w / 2;
          sp.used += w + 0.08;
          const [eu, ev] = at(runSide.side, toAlong(xl), inset);
          g.add(place(slot(role, make()), eu, ev, faceAwayFrom[runSide.side] + turn, bench.y));
        }
      }
    } else if (/bath|ensuite|shower/.test(n)) {
      // Every fixture goes against a stretch of solid wall, clear of door swings, of walls that stand inside the
      // room and of each other, with room to stand in front of it: shower first, then vanity, toilet, towel rail.
      type Rect = [number, number, number, number];
      const hit = (a: Rect, b: Rect) => a[0] < b[2] - 0.005 && a[2] > b[0] + 0.005 && a[1] < b[3] - 0.005 && a[3] > b[1] + 0.005;
      const rectAt = (side: Side, along: number, w: number, d: number): Rect => (side === 'N' ? [along - w / 2, v0, along + w / 2, v0 + d] : side === 'S' ? [along - w / 2, v1 - d, along + w / 2, v1] : side === 'W' ? [u0, along - w / 2, u0 + d, along + w / 2] : [u1 - d, along - w / 2, u1, along + w / 2]);
      const gapTo = (pu: number, pv: number, t: Rect) => Math.hypot(Math.max(t[0] - pu, 0, pu - t[2]), Math.max(t[1] - pv, 0, pv - t[3]));
      const keep: Rect[] = [], solids: Rect[] = [], fixtures: Rect[] = [];
      for (const s2 of ss) for (const [a, b, k] of s2.openings) if (k !== 'window') keep.push(rectAt(s2.side, (a + b) / 2, b - a + 0.06, 0.7));
      for (const p of [...L.partitions, ...L.walls]) {
        const t = (p.thickness ?? 0.1) / 2 + 0.01;
        if (p.axis === 'x' && p.at > v0 + 0.3 && p.at < v1 - 0.3 && p.to > u0 + 0.05 && p.from < u1 - 0.05) solids.push([Math.max(u0, p.from), p.at - t, Math.min(u1, p.to), p.at + t]);
        if (p.axis === 'z' && p.at > u0 + 0.3 && p.at < u1 - 0.3 && p.to > v0 + 0.05 && p.from < v1 - 0.05) solids.push([p.at - t, Math.max(v0, p.from), p.at + t, Math.min(v1, p.to)]);
      }
      const doors = ss.flatMap((s2) => doorsOn(s2).map(([x, y]) => at(s2.side, (x + y) / 2, 0)));
      const fromDoors = (pu: number, pv: number) => doors.reduce((a, [du, dv]) => a + Math.hypot(pu - du, pv - dv), 0);
      const clearOf = (side: Side, a: number, b: number) => !by[side].openings.some(([x, y]) => b > x - 0.04 && a < y + 0.04);
      const narrow = Math.min(r.w, r.d) < 1.35;
      let shRect: Rect;
      const sh = (() => {
        if (narrow) {
          // a slim room: the shower fills its far end wall to wall, glass across the front
          const alongU = r.w >= r.d, sdep = Math.min(0.95, (alongU ? r.w : r.d) * 0.4);
          const ends: [Rect, number, number, number][] = alongU
            ? [[[u1 - sdep, v0, u1, v1], -Math.PI / 2, u1 - sdep / 2, cv], [[u0, v0, u0 + sdep, v1], Math.PI / 2, u0 + sdep / 2, cv]]
            : [[[u0, v1 - sdep, u1, v1], Math.PI, cu, v1 - sdep / 2], [[u0, v0, u1, v0 + sdep], 0, cu, v0 + sdep / 2]];
          const [rc, rot, pu, pv] = ends.filter(([t]) => !keep.some((k) => hit(t, k))).sort((p, q2) => fromDoors(q2[2], q2[3]) - fromDoors(p[2], p[3]))[0] ?? ends[0];
          shRect = rc;
          const o = shower(M, alongU ? r.d : r.w, sdep, true);
          o.rotation.y = rot;
          o.position.set(pu, 0, pv);
          o.userData.depth = sdep;
          return o;
        }
        const sw = Math.min(0.9, r.w - 0.8), sd = Math.min(0.9, r.d - 0.8);
        const corners: [number, number, Side, Side][] = [[u0, v0, 'N', 'W'], [u1, v0, 'N', 'E'], [u0, v1, 'S', 'W'], [u1, v1, 'S', 'E']];
        const rectOf = ([xu, xv, , s2]: [number, number, Side, Side]): Rect => [s2 === 'W' ? xu : xu - sw, xv === v0 ? xv : xv - sd, s2 === 'W' ? xu + sw : xu, xv === v0 ? xv + sd : xv];
        const good = corners.filter((c) => { const t = rectOf(c); return !keep.some((k) => hit(t, k)) && !solids.some((k) => hit(t, k)) && clearOf(c[2], t[0], t[2]) && clearOf(c[3], t[1], t[3]); });
        // furthest from the doors; a nib wall beside the corner makes it the drawn shower alcove
        const score = (c: [number, number, Side, Side]) => { const t = rectOf(c); return fromDoors(c[0], c[1]) + (solids.some((k) => hit([t[0] - 0.15, t[1] - 0.15, t[2] + 0.15, t[3] + 0.15], k)) ? 1.5 : 0); };
        const c = (good.length ? good : corners).sort((p, q2) => score(q2) - score(p))[0];
        const [xu, xv, s1, s2] = c;
        shRect = rectOf(c);
        const o = shower(M, sw, sd);
        // the shower's back wall is at its −z: turn it so the tiles sit against the corner walls
        o.rotation.y = s1 === 'N' ? (s2 === 'W' ? 0 : -Math.PI / 2) : s2 === 'W' ? Math.PI / 2 : Math.PI;
        o.position.set(xu + (s2 === 'W' ? sw / 2 : -sw / 2), 0, xv + (s1 === 'N' ? sd / 2 : -sd / 2));
        o.userData.depth = s1 === 'N' ? (s2 === 'W' ? sd : sw) : s2 === 'W' ? sw : sd;
        return o;
      })();
      if (scandi.on) { sh.getObjectByName('shower_rose')?.removeFromParent(); const set = showerSet(); set.position.set(0, 0, -(sh.userData.depth as number) / 2 + 0.012); sh.add(set); }
      g.add(sh);
      fixtures.push(shRect!);
      /** the best place for a fixture w wide and d deep standing against a wall, with `clear` to stand in front */
      const spot = (w: number, d: number, clear: number, score: (side: Side, pu: number, pv: number) => number) => {
        let best: { side: Side; along: number } | null = null, bs = -Infinity;
        for (const s2 of ss) {
          const lo2 = s2.side === 'N' || s2.side === 'S' ? u0 : v0, hi2 = lo2 + s2.len, cover = hasWall(r, s2.side);
          for (let a = lo2 + w / 2 + 0.02; a <= hi2 - w / 2 - 0.02 + 1e-6; a += 0.02) {
            if (!clearOf(s2.side, a - w / 2, a + w / 2) || !cover.some(([c0, c1]) => a - w / 2 >= c0 - 0.06 && a + w / 2 <= c1 + 0.06)) continue;
            const body = rectAt(s2.side, a, w, d), front = rectAt(s2.side, a, w, d + clear);
            if (front[0] < u0 - 0.01 || front[1] < v0 - 0.01 || front[2] > u1 + 0.01 || front[3] > v1 + 0.01) continue;
            if ([...keep, ...solids, ...fixtures].some((t) => hit(body, t)) || [...solids, ...fixtures].some((t) => hit(front, t))) continue;
            const sc = score(s2.side, (body[0] + body[2]) / 2, (body[1] + body[3]) / 2);
            if (sc > bs) { bs = sc; best = { side: s2.side, along: a }; }
          }
        }
        return best;
      };
      const quiet = (side: Side) => (by[side].openings.length ? 0 : 2);
      // vanity: on a wall with no door or window, as near the shower as it fits (one run of plumbing)
      const vd = narrow ? 0.36 : 0.46;
      let vRect: Rect | null = null;
      for (const vw of narrow ? [0.6, 0.5] : [0.9, 0.75, 0.6]) {
        const vp = spot(vw, vd, narrow ? 0.4 : 0.55, (side, pu, pv) => quiet(side) - 0.6 * gapTo(pu, pv, shRect!));
        if (!vp) continue;
        vRect = rectAt(vp.side, vp.along, vw, vd);
        fixtures.push(vRect);
        const [vu, vv] = at(vp.side, vp.along, vd / 2);
        const van = vanity(M, vw, vd), fix = van.userData.fix as { topY: number; mixerZ: number; shelfY: number };
        van.getObjectByName('mirror')?.removeFromParent();
        if (scandi.on) {
          // the mixer stands on the stone behind the basin; folded towels on the shelf below
          van.getObjectByName('basin_mixer')?.removeFromParent();
          const mt = mixerTap(0.3, 0.15);
          mt.position.set(0, fix.topY, fix.mixerZ);
          const ts = towelStack();
          ts.position.set(-vw / 2 + 0.24, fix.shelfY, 0);
          van.add(mt, ts);
        }
        g.add(place(van, vu, vv, faceAwayFrom[vp.side]));
        // the mirror hangs on the wall behind the basin
        const [mu, mv] = at(vp.side, vp.along, 0.0);
        const fbMirror = new THREE.Mesh(new THREE.BoxGeometry(vw - 0.05, 0.75, 0.01).translate(0, 0.375, 0.005), M.chrome);
        fbMirror.name = 'mirror';
        g.add(place(slot('mirror', scandi.on ? wallMirror(narrow ? 0.42 : 0.5, 0.9) : fbMirror), mu, mv, faceAwayFrom[vp.side], 1.08));
        break;
      }
      // toilet: back to a wall, beside the vanity where it can be
      const tp = spot(0.7, 0.66, 0.4, (side, pu, pv) => quiet(side) * 0.5 - 0.3 * (vRect ? gapTo(pu, pv, vRect) : 0) + 0.05 * fromDoors(pu, pv));
      if (tp) {
        fixtures.push(rectAt(tp.side, tp.along, 0.7, 0.66));
        const [tu, tv] = at(tp.side, tp.along, 0.0);
        g.add(place(slot('toilet', toilet(M)), tu, tv, faceAwayFrom[tp.side]));
      }
      // towel rail: fixed to a wall within reach of the shower
      const rp = spot(0.66, 0.13, 0.3, (_side, pu, pv) => -gapTo(pu, pv, shRect!));
      if (rp) {
        const [ou, ov] = at(rp.side, rp.along, 0.0);
        g.add(place(slot('towel_rail', scandi.on ? towelRail() : null), ou, ov, faceAwayFrom[rp.side], 0.55));
      }
    } else if (/l'?dry|laundry/.test(n)) {
      const s = by[opposite[ws.side]];
      const [lu, lv] = at(s.side, cu, 0.26);
      g.add(place(laundryTub(M), lu, lv, faceAwayFrom[s.side]));
      if (/wc/.test(n)) {
        const [tu, tv] = at(ws.side, (ws.side === 'N' || ws.side === 'S' ? u0 : v0) + 0.45, 0.0);
        g.add(place(toilet(M), tu, tv, faceAwayFrom[ws.side]));
      }
    } else if (/^wc|toilet/.test(n)) {
      const s = ss.filter((x) => !doorsOn(x).length).sort((a, b) => a.len - b.len)[0] ?? by.N;
      const [tu, tv] = at(s.side, s.side === 'N' || s.side === 'S' ? cu : cv, 0.0);
      g.add(place(slot('toilet', toilet(M)), tu, tv, faceAwayFrom[s.side]));
    } else if (/study|office/.test(n)) {
      const s = ws ?? by.N;
      const [du, dv] = at(s.side, s.side === 'N' || s.side === 'S' ? cu : cv, 0.36);
      const dk = desk(M, Math.min(1.4, s.len - 0.4));
      // the code-built table lamp replaces the desk's own lamp
      if (scandi.on) dk.getObjectByName('desk_lamp')?.removeFromParent();
      g.add(place(dk, du, dv, faceAwayFrom[s.side] + Math.PI));
      const [cu3, cv3] = at(s.side, s.side === 'N' || s.side === 'S' ? cu : cv, 0.95);
      // the oak chair with back posts faces −z, so it needs no half turn to face the desk
      if (scandi.on) g.add(place(suite(buildDiningChair(craftMats().oak, craftMats().linen), 'Oak desk chair', 'oiled oak, linen seat pad'), cu3, cv3, faceAwayFrom[s.side]));
      else g.add(place(diningChair(M), cu3, cv3, faceAwayFrom[s.side] + Math.PI));
      const [lu, lv] = at(s.side, (s.side === 'N' || s.side === 'S' ? cu : cv) + 0.5, 0.25);
      g.add(place(slot('table_lamp', scandi.on ? tableLamp() : null), lu, lv, faceAwayFrom[s.side], 0.75));
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
