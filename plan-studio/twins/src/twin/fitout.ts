import * as THREE from 'three/webgpu';
import type { Quality } from '../objects/util';
import { buildRug, buildThrow } from '../objects/soft';
import { buildKettle } from '../objects/kitchen';
import { buildPendant } from '../objects/nzdesign';
import type { BuildingSpec, RoomSpec } from './homes';
import { armchair, art, bed, bedside, coffeeTable, desk, diningChair, diningTable, floorLamp, interiorMats, kitchenRun, laundryTub, shower, sofa, toilet, vanity, wardrobe, type Finishes, type InteriorMats } from './furniture';

// The fit-out step: furnish every room of a plan model from its name. Placement follows simple
// rules a designer would start from (bed head against a solid wall, wardrobe opposite the window,
// sofa facing the view, sink under the kitchen window, shower in the corner away from the door),
// so a dropped plan comes back furnished without hand placement. Everything here is "proposed".

type Side = 'N' | 'S' | 'W' | 'E';
interface SideInfo {
  side: Side;
  exterior: boolean;
  /** opening intervals along the side, in the side's running coordinate */
  openings: [number, number, string][];
  len: number;
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

export function fitOut(spec: BuildingSpec, q: Quality, fin: Finishes, ceiling: (u: number, v: number) => number, overrides?: (room: RoomSpec, M: InteriorMats) => THREE.Object3D[] | null) {
  const M = interiorMats(q, fin);
  const L = spec.levels[0];
  const W = Math.max(...L.walls.filter((w) => w.axis === 'z').map((w) => w.at));
  const D = Math.max(...L.walls.filter((w) => w.axis === 'x').map((w) => w.at));
  const root = new THREE.Group();
  root.name = 'fit_out';
  root.userData = { kind: 'fitout', name: 'Fit-out (proposed)', source: 'proposed', palette: fin.name };
  const lights: THREE.PointLight[] = [];

  const sidesOf = (r: RoomSpec): SideInfo[] => {
    const u0 = r.u;
    const u1 = r.u + r.w;
    const v0 = r.v;
    const v1 = r.v + r.d;
    const near = (a: number, b: number) => Math.abs(a - b) < 0.25;
    const out: SideInfo[] = [];
    const mk = (side: Side, line: number, axis: 'x' | 'z', lo: number, hi: number, exterior: boolean) => {
      const ops: [number, number, string][] = [];
      for (const w of L.walls) if (w.axis === axis && near(w.at, line)) for (const o of w.openings ?? []) if (o.b > lo && o.a < hi) ops.push([Math.max(lo, o.a), Math.min(hi, o.b), o.kind]);
      for (const p of L.partitions) if (p.axis === axis && near(p.at, line)) for (const o of p.openings ?? []) if (o.b > lo && o.a < hi) ops.push([Math.max(lo, o.a), Math.min(hi, o.b), o.kind]);
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
    const custom = overrides?.(r, M);
    if (custom) {
      g.add(...custom);
      root.add(g);
      continue;
    }
    const ss = sidesOf(r);
    const by = Object.fromEntries(ss.map((s) => [s.side, s])) as Record<Side, SideInfo>;
    const ws = winSide(ss) ?? by.N;
    const at = (side: Side, along: number, inset: number): [number, number] => {
      if (side === 'N') return [along, v0 + inset];
      if (side === 'S') return [along, v1 - inset];
      if (side === 'W') return [u0 + inset, along];
      return [u1 - inset, along];
    };
    if (/bed/.test(n) && !/bunk/.test(n)) {
      // headboard on a perpendicular solid wall, exterior if possible
      const cands = perp[ws.side].map((s) => by[s]).sort((a, b) => Number(b.exterior && !b.openings.length) - Number(a.exterior && !a.openings.length) || openLen(a) - openLen(b));
      const hs = cands[0];
      const robeSide = by[opposite[ws.side]];
      const robeD = robeSide.len > 1.2 && !robeSide.exterior ? 0.6 : 0;
      const across = ws.side === 'N' || ws.side === 'S' ? [v0, v1] : [u0, u1];
      // depth available between the window wall (plus 0.3) and the wardrobe front
      const lo = ws.side === 'N' || ws.side === 'W' ? across[0] + 0.3 : across[0] + robeD + 0.05;
      const hi = ws.side === 'N' || ws.side === 'W' ? across[1] - robeD - 0.05 : across[1] - 0.3;
      const mid = (lo + hi) / 2;
      const bw = Math.min(1.53, hi - lo - 0.9 > 1.53 ? 1.53 : Math.max(1.37, hi - lo - 0.9));
      const [bu, bv] = at(hs.side, mid, 2.03 / 2 + 0.03);
      g.add(place(bed(M, bw), bu, bv, faceAwayFrom[hs.side]));
      for (const s of [-1, 1]) {
        const off = mid + s * (bw / 2 + 0.28);
        if (off - 0.23 < lo - 0.25 || off + 0.23 > hi + 0.25) continue;
        const [tu, tv] = at(hs.side, off, 0.22);
        g.add(place(bedside(M), tu, tv, faceAwayFrom[hs.side]));
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
    } else if (/lounge|living|family/.test(n)) {
      // sofa with its back to the side opposite the view, facing the window
      const back = opposite[ws.side];
      const depth = ws.side === 'N' || ws.side === 'S' ? r.d : r.w;
      const span = ws.side === 'N' || ws.side === 'S' ? r.w : r.d;
      const centre = ws.side === 'N' || ws.side === 'S' ? cu : cv;
      const sw = Math.min(2.3, span - 0.8);
      const inset = Math.min(depth - 1.6, 0.55);
      const [su, sv] = at(back, centre, inset);
      g.add(place(sofa(M, sw), su, sv, faceAwayFrom[back]));
      const [tu, tv] = at(back, centre, inset + 1.0);
      g.add(place(coffeeTable(M), tu, tv));
      const rug = lib('wool_rug', () => buildRug(q));
      const [ru, rv] = at(back, centre, inset + 0.75);
      g.add(place(rug, ru, rv, ws.side === 'N' || ws.side === 'S' ? Math.PI / 2 : 0, 0.002));
      const [cu2, cv2] = at(back, centre + sw / 2 + 0.55, inset + 1.25);
      g.add(place(armchair(M), cu2, cv2, faceAwayFrom[back] - (Math.PI / 2) * 0.7));
      const [lu, lv] = at(back, centre - sw / 2 - 0.3, 0.3);
      g.add(place(floorLamp(M), lu, lv));
      // the library guitar on a wall hanger beside the sofa (private builds)
      const gs = new THREE.Group();
      gs.name = 'slot_guitar';
      const [gu, gv] = at(back, centre + sw / 2 + 0.25, 0.06);
      place(gs, gu, gv, faceAwayFrom[back], 0.95);
      g.add(gs);
      const th = lib('wool_throw', () => buildThrow(q));
      const [hu, hv] = at(back, centre - sw / 2 + 0.25, inset - 0.05);
      g.add(place(th, hu, hv, faceAwayFrom[back], 0.62));
    } else if (/dining/.test(n)) {
      const longU = r.w >= r.d;
      const l = Math.min(1.8, (longU ? r.w : r.d) - 1.4);
      const tb = diningTable(M, Math.max(1.2, l), 0.9);
      g.add(place(tb, cu, cv, longU ? 0 : Math.PI / 2));
      const seats = l >= 1.6 ? 3 : 2;
      for (let i = 0; i < seats; i++) {
        const t = (i + 0.5) / seats - 0.5;
        for (const s of [-1, 1]) {
          const du = longU ? t * l : s * 0.62;
          const dv = longU ? s * 0.62 : t * l;
          const rot = longU ? (s > 0 ? Math.PI : 0) : s > 0 ? -Math.PI / 2 : Math.PI / 2;
          g.add(place(diningChair(M), cu + du, cv + dv, rot));
        }
      }
      const pend = lib('pendant', () => buildPendant(q));
      const top = ceiling(cu, cv);
      pend.position.set(cu, top - 0.9 - 0.25 + Math.max(0, top - 3.0) * -0.4, cv);
      g.add(pend);
      const lamp = new THREE.PointLight(0xffd9a8, 0, 6, 2);
      lamp.position.set(cu, pend.position.y + 0.05, cv);
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
      const kettle = lib('kettle', () => buildKettle(q));
      const [eu, ev] = at(runSide.side, start + 0.35, 0.3);
      g.add(place(kettle, eu, ev, 0.4, 0.91));
      // a slot the asset library fills (Kōwhai Studio knife block)
      const slot = new THREE.Group();
      slot.name = 'slot_knife_block';
      const [nu, nv] = at(runSide.side, start + 0.85, 0.42);
      g.add(place(slot, nu, nv, faceAwayFrom[runSide.side], 0.91));
    } else if (/bath|ensuite|shower/.test(n)) {
      // shower in the corner furthest from the door
      const door = ss.flatMap((s) => doorsOn(s).map(([x, y]) => (s.side === 'N' || s.side === 'S' ? at(s.side, (x + y) / 2, 0) : at(s.side, (x + y) / 2, 0))))[0] ?? [cu, cv];
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
      // vanity along the other long side, toilet beside it
      const vs: Side = s1 === 'N' ? 'S' : 'N';
      const alongLo = s2 === 'W' ? u0 + sw + 0.05 : u0 + 0.05;
      const alongHi = s2 === 'W' ? u1 - 0.05 : u1 - sw - 0.05;
      const [vu, vv] = at(vs, alongLo + 0.42, 0.24);
      g.add(place(vanity(M, Math.min(0.75, alongHi - alongLo - 0.7)), vu, vv, faceAwayFrom[vs]));
      const [tu, tv] = at(s1, s2 === 'W' ? alongHi - 0.25 : alongLo + 0.25, 0.3);
      g.add(place(toilet(M), tu, tv, faceAwayFrom[s1]));
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
      const [tu, tv] = at(s.side, s.side === 'N' || s.side === 'S' ? cu : cv, 0.3);
      g.add(place(toilet(M), tu, tv, faceAwayFrom[s.side]));
    } else if (/study|office/.test(n)) {
      const s = ws ?? by.N;
      const [du, dv] = at(s.side, s.side === 'N' || s.side === 'S' ? cu : cv, 0.36);
      g.add(place(desk(M, Math.min(1.4, s.len - 0.4)), du, dv, faceAwayFrom[s.side] + Math.PI));
      const [cu3, cv3] = at(s.side, s.side === 'N' || s.side === 'S' ? cu : cv, 0.95);
      g.add(place(diningChair(M), cu3, cv3, faceAwayFrom[s.side] + Math.PI));
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
