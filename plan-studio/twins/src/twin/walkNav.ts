// Walking through a plan model at eye height: walls stop you, doorways let you through, floors and stairs carry you up.
// Built from the plan model itself (not from the meshes), so it is cheap enough for a phone and can be tested in Node.
// Works for the classic axis walls (walls[].axis/at/from/to) and for free-form buildings (walls[].line, slabs, stairs).
//
// Pure module: no three.js, no browser. World frame as the 3D page uses it: x = u + origin[0], z = v + origin[1], y up.

import { inside, isFreeform, segDist, pieces, type FreeBuilding, type Pt } from './freeformGeom.ts'; // the extension lets Node's tests load this file directly

export interface Barrier { a: Pt; b: Pt; half: number; y0: number; y1: number; what: string }
export interface Floor { poly: Pt[]; y: number; what: string; holes?: Pt[][] }
export interface Ramp { a: Pt; b: Pt; half: number; y0: number; y1: number; what: string }
export interface Nav { barriers: Barrier[]; floors: Floor[]; ramps: Ramp[]; start?: { at: Pt; y: number; look: Pt } }

export const EYE = 1.6, RADIUS = 0.25, STEP_UP = 0.45, KNEE = 0.35, HEAD = 1.75;
/** an opening a person walks through: a door or opening from the floor up to at least 1.9 m */
export const passable = (o: { kind?: string; sill?: number; head?: number }) => (o.kind === 'door' || o.kind === 'opening') && (o.sill ?? 0) <= 0.06 && (o.head ?? 2.1) >= 1.9;

type AnyPlan = { buildings: Record<string, unknown>[] };
type AxisWall = { axis: 'x' | 'z'; at: number; from: number; to: number; thickness?: number; openings?: { kind?: string; a: number; b: number; sill?: number; head?: number }[] };

/** solid runs of a wall between the openings a person can walk through */
function solidRuns(L: number, ops: { kind?: string; a: number; b: number; sill?: number; head?: number }[]) {
  const gaps = ops.filter(passable).map((o) => [Math.max(0, o.a), Math.min(L, o.b)] as [number, number]).sort((p, q) => p[0] - q[0]);
  const runs: [number, number][] = []; let s = 0;
  for (const [a, b] of gaps) { if (a > s + 0.02) runs.push([s, a]); s = Math.max(s, b); }
  if (L > s + 0.02) runs.push([s, L]);
  return runs;
}

export function navFromPlan(plan: AnyPlan): Nav {
  const nav: Nav = { barriers: [], floors: [], ramps: [] };
  for (const raw of plan.buildings ?? []) {
    const ox = (raw.origin as Pt | undefined)?.[0] ?? 0, oz = (raw.origin as Pt | undefined)?.[1] ?? 0, base = (raw.floorLevel as number | undefined) ?? 0;
    const W = (p: Pt): Pt => [p[0] + ox, p[1] + oz];
    if (isFreeform(raw)) {
      const b = raw as unknown as FreeBuilding;
      for (const L of b.levels) {
        const y0 = base + L.floor;
        const slabs = L.slab?.length ? L.slab : L.floor === 0 ? [b.footprint] : [];
        for (const s of slabs) nav.floors.push({ poly: s.map(W), y: y0, what: `${b.name}, ${L.name}`, holes: (L.voids ?? []).map((h) => h.map(W)) });
        for (const w of L.walls) {
          const h = w.kind === 'balustrade' ? (typeof w.height === 'number' ? w.height : 1.0) : 3.0;
          for (const pc of pieces(w)) {
            const dir: Pt = [(pc.b[0] - pc.a[0]) / pc.L, (pc.b[1] - pc.a[1]) / pc.L];
            const at = (s: number): Pt => W([pc.a[0] + dir[0] * s, pc.a[1] + dir[1] * s]);
            for (const [s0, s1] of solidRuns(pc.L, pc.openings)) nav.barriers.push({ a: at(s0), b: at(s1), half: Math.max(0.03, w.thickness / 2), y0, y1: y0 + h, what: w.name ?? w.id });
          }
        }
        for (const st of L.stairs ?? []) {
          const y1 = base + st.to, ys = base + st.from;
          if (st.kind === 'straight' && st.line && st.line.length >= 2) {
            const a = W(st.line[0]), e = W(st.line[st.line.length - 1]);
            nav.ramps.push({ a, b: e, half: st.width / 2, y0: ys, y1, what: st.name ?? st.id });
          } else if (st.kind === 'spiral' && st.centre && st.r) {
            // a spiral as short straight ramps round its centre line
            const n = 16, a0 = ((st.startDeg ?? 0) * Math.PI) / 180, turn = ((st.turnDeg ?? 360) * Math.PI) / 180, rc = st.r - st.width / 2;
            for (let i = 0; i < n; i++) {
              const t0 = i / n, t1 = (i + 1) / n, p = (t: number): Pt => W([st.centre![0] + Math.cos(a0 + turn * t) * rc, st.centre![1] + Math.sin(a0 + turn * t) * rc]);
              nav.ramps.push({ a: p(t0), b: p(t1), half: st.width / 2, y0: ys + (y1 - ys) * t0, y1: ys + (y1 - ys) * t1, what: st.name ?? st.id });
            }
          }
        }
      }
    } else {
      // the classic house: axis walls on the ground floor, the floor over the walls' box
      const L = (raw.levels as { walls: AxisWall[]; partitions?: AxisWall[] }[] | undefined)?.[0];
      if (!L) continue;
      const xs = L.walls.filter((w) => w.axis === 'z').map((w) => w.at), zs = L.walls.filter((w) => w.axis === 'x').map((w) => w.at);
      if (xs.length && zs.length) nav.floors.push({ poly: [[0, 0], [Math.max(...xs), 0], [Math.max(...xs), Math.max(...zs)], [0, Math.max(...zs)]].map((p) => W(p as Pt)), y: base, what: String(raw.name ?? raw.id ?? 'building') });
      for (const w of [...L.walls, ...(L.partitions ?? [])]) {
        const P = (s: number): Pt => W(w.axis === 'x' ? [s, w.at] : [w.at, s]);
        for (const [s0, s1] of solidRuns(w.to - w.from, (w.openings ?? []).map((o) => ({ ...o, a: o.a - w.from, b: o.b - w.from })))) nav.barriers.push({ a: P(w.from + s0), b: P(w.from + s1), half: Math.max(0.03, (w.thickness ?? 0.14) / 2), y0: base, y1: base + 3, what: 'wall' });
      }
    }
  }
  return nav;
}

/** the floor a person standing at (x, z) with feet at `feet` stands on: the highest floor, stair or ground they can step onto */
export function floorAt(nav: Nav, x: number, z: number, feet: number, ground?: (x: number, z: number) => number | null) {
  let best = -Infinity;
  const take = (y: number) => { if (y <= feet + STEP_UP && y > best) best = y; };
  for (const f of nav.floors) if (inside([x, z], f.poly) && !(f.holes ?? []).some((h) => inside([x, z], h))) take(f.y);
  for (const r of nav.ramps) { const s = segDist([x, z], r.a, r.b); if (s.d <= r.half) take(r.y0 + (r.y1 - r.y0) * s.t); }
  const g = ground?.(x, z);
  if (g != null && Number.isFinite(g)) take(g);
  return best === -Infinity ? null : best;
}

/** one step: move the eye point by (dx, dz), sliding along anything in the way, then settle onto the floor underneath */
export function step(nav: Nav, eye: { x: number; y: number; z: number }, dx: number, dz: number, ground?: (x: number, z: number) => number | null) {
  const feet = eye.y - EYE;
  let x = eye.x + dx, z = eye.z + dz;
  // walls whose height overlaps the body between knee and head
  const hits = nav.barriers.filter((b) => b.y1 > feet + KNEE && b.y0 < feet + HEAD);
  for (let k = 0; k < 4; k++) {
    let moved = false;
    for (const b of hits) {
      const s = segDist([x, z], b.a, b.b), need = RADIUS + b.half;
      if (s.d < need) {
        const nx = s.d > 1e-6 ? (x - s.q[0]) / s.d : -(b.b[1] - b.a[1]), nz = s.d > 1e-6 ? (z - s.q[1]) / s.d : b.b[0] - b.a[0], nl = Math.hypot(nx, nz) || 1;
        x = s.q[0] + (nx / nl) * need; z = s.q[1] + (nz / nl) * need; moved = true;
      }
    }
    if (!moved) break;
  }
  const f = floorAt(nav, x, z, feet, ground);
  // nothing to stand on within a step (the edge of a slab with no barrier, or off the survey): stay put
  if (f == null || f < feet - 1.2) return { x: eye.x, y: eye.y, z: eye.z, blocked: true, floor: feet };
  return { x, y: f + EYE, z, blocked: Math.hypot(x - eye.x - dx, z - eye.z - dz) > 1e-3, floor: f };
}
