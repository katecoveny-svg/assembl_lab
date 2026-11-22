// Free-form buildings in the plan model (assembl.plan-model.v1, `form: "freeform"`): walls as polylines at any angle
// (tapered and curved plans), rooms as polygons, more than one level (a mezzanine as a slab polygon with its edges),
// stairs, and a gable roof over any footprint (a ridge line, a pitch and a height, so a steep A-frame over a tapering
// plan is the same rule as a shallow gable over a box).
//
// Pure module: no three.js, no browser. The meshes are made in freeform.ts; walking is in walkNav.ts. Units are metres.
// Frame: u across the sheet (x in the model), v down the sheet (z in the model), y up from the building's floor level.
// Every size carries `source` (written, scaled, assumed, read, ...) the same way the rest of the plan model does.

export type Pt = [number, number];
export type Src = string;

export interface FreeOpening {
  id?: string; name?: string;
  kind: 'door' | 'window' | 'glazing' | 'opening';
  /** hinged (one leaf), double (two leaves), sliding, pivot or auto (automatic sliding) */
  type?: 'hinged' | 'double' | 'sliding' | 'pivot' | 'auto';
  /** distances along the wall's line from its first point, metres */
  a: number; b: number;
  sill: number; head: number;
  /** a pointed (gothic) or round head over the opening */
  arch?: 'pointed' | 'round';
  /** which way a hinged leaf swings: +1 to the left of the line's direction, −1 to the right */
  swing?: 1 | -1;
  /** the hinge end of a single leaf: at a or at b */
  hinge?: 'a' | 'b';
  source?: Src; note?: string;
}
export interface FreeWall {
  id: string; name?: string;
  line: Pt[];
  thickness: number;
  /** wall (solid), glass (a glazed wall with mullions), partition (inside, solid), balustrade (a barrier at an edge) */
  kind?: 'wall' | 'glass' | 'partition' | 'balustrade';
  external?: boolean;
  /** height above this level's floor: a number, or "roof" to run up to the underside of the roof */
  height?: number | 'roof';
  /** mullion spacing along a glass wall, metres */
  mullions?: number;
  /** or the mullions where the drawing puts them: distances along the line */
  mullionsAt?: number[];
  material?: string;
  openings?: FreeOpening[];
  source?: Src; note?: string;
}
export interface FreeRoom { id: string; name: string; poly: Pt[]; source?: Src; nameSrc?: 'printed' | 'drawn' | 'person'; printed?: string; finish?: string; u?: number; v?: number; w?: number; d?: number }
export interface FreeStair { id: string; name?: string; kind: 'straight' | 'spiral'; line?: Pt[]; centre?: Pt; r?: number; startDeg?: number; turnDeg?: number; width: number; from: number; to: number; source?: Src; note?: string }
export interface Seat { kind: 'round-table' | 'chair'; at: Pt; d?: number; seats?: number; deg?: number; label?: string }
export interface FreeLevel {
  id: string; name: string;
  /** floor height above the building's floor level */
  floor: number;
  /** the floor's outline(s); the ground floor may leave it out and take the footprint */
  slab?: Pt[][];
  /** holes in the floor (a stair or lift opening, a void) */
  voids?: Pt[][];
  slabThickness?: number;
  walls: FreeWall[];
  rooms?: FreeRoom[];
  stairs?: FreeStair[];
  /** furniture layouts by name (e.g. banquet, auditorium); `layout` is the one shown first */
  layouts?: Record<string, { note?: string; seats: Seat[] }>;
  layout?: string;
  /** legacy fields kept empty so older readers of the plan model do not fail */
  partitions?: unknown[]; plate?: number;
}
export interface FreeRoof {
  type: 'gable';
  /** the ridge, in plan */
  ridge: [Pt, Pt];
  /** height of the roof's underside at the ridge, above floor level */
  height: number;
  pitchDeg: number;
  thickness?: number;
  /** overhang past the footprint, metres */
  eave?: number;
  cover?: string; colour?: string;
  skylights?: { side: 1 | -1; a: number; b: number; from: number; to: number }[];
  /** small gables standing out of the roof (over a bridge, a window): the roof is the higher of the two inside `poly` */
  dormers?: { poly: Pt[]; ridge: [Pt, Pt]; height: number; pitchDeg: number; source?: Src; note?: string }[];
  source?: Src; note?: string;
}
export interface FreeBuilding {
  id: string; name: string; form: 'freeform';
  origin: Pt; floorLevel?: number;
  /** outside outline of the ground floor (outer faces) */
  footprint: Pt[];
  roof: FreeRoof;
  levels: FreeLevel[];
  finish?: Record<string, string>;
  kind?: 'proposed' | 'existing';
  note?: string;
}

export const isFreeform = (b: unknown): b is FreeBuilding => !!b && (b as { form?: string }).form === 'freeform' && Array.isArray((b as FreeBuilding).footprint);

// ------------------------------------------------------------------------------------------------ plane geometry
export const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];
export const len = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);
export function lineLength(line: Pt[]) { let L = 0; for (let i = 1; i < line.length; i++) L += len(line[i - 1], line[i]); return L; }
/** signed area (positive when the points run anticlockwise in u, v) */
export function area(poly: Pt[]) { let s = 0; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; }
export function bbox(pts: Pt[]) {
  let u0 = Infinity, v0 = Infinity, u1 = -Infinity, v1 = -Infinity;
  for (const [u, v] of pts) { u0 = Math.min(u0, u); v0 = Math.min(v0, v); u1 = Math.max(u1, u); v1 = Math.max(v1, v); }
  return { u0, v0, u1, v1, w: u1 - u0, d: v1 - v0 };
}
export function inside(p: Pt, poly: Pt[]) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}
/** distance from p to the segment a–b, and the parameter t of the nearest point */
export function segDist(p: Pt, a: Pt, b: Pt) {
  const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz;
  const t = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L2)) : 0;
  const q: Pt = [a[0] + t * dx, a[1] + t * dz];
  return { d: Math.hypot(p[0] - q[0], p[1] - q[1]), t, q };
}
/** the point at distance s along a polyline, and the unit direction there */
export function along(line: Pt[], s: number): { p: Pt; dir: Pt; seg: number } {
  let r = Math.max(0, s);
  for (let i = 1; i < line.length; i++) {
    const L = len(line[i - 1], line[i]);
    if (r <= L || i === line.length - 1) {
      const t = L ? Math.min(1, r / L) : 0, a = line[i - 1], b = line[i];
      return { p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], dir: L ? [(b[0] - a[0]) / L, (b[1] - a[1]) / L] : [1, 0], seg: i - 1 };
    }
    r -= L;
  }
  return { p: line[0], dir: [1, 0], seg: 0 };
}
/** a polyline cut into straight pieces, each with the openings that fall on it (in the piece's own distances) */
export function pieces(w: FreeWall) {
  const out: { a: Pt; b: Pt; s0: number; L: number; openings: (FreeOpening & { a: number; b: number })[] }[] = [];
  let s0 = 0;
  for (let i = 1; i < w.line.length; i++) {
    const a = w.line[i - 1], b = w.line[i], L = len(a, b);
    const ops = (w.openings ?? []).filter((o) => o.b > s0 + 1e-6 && o.a < s0 + L - 1e-6).map((o) => ({ ...o, a: Math.max(0, o.a - s0), b: Math.min(L, o.b - s0) }));
    if (L > 1e-4) out.push({ a, b, s0, L, openings: ops });
    s0 += L;
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ the roof
/** the roof as a height field: underside height above floor level at any plan point (a gable through the ridge line) */
export function roofAt(roof: FreeRoof, withDormers = true) {
  const plane = (r: { ridge: [Pt, Pt]; height: number; pitchDeg: number }) => {
    const [r0, r1] = r.ridge, tanP = Math.tan((r.pitchDeg * Math.PI) / 180);
    const dx = r1[0] - r0[0], dz = r1[1] - r0[1], L = Math.hypot(dx, dz) || 1, nx = -dz / L, nz = dx / L;
    return (u: number, v: number) => r.height - Math.abs((u - r0[0]) * nx + (v - r0[1]) * nz) * tanP;
  };
  const main = plane(roof), ds = withDormers ? (roof.dormers ?? []).map((d) => ({ poly: d.poly, at: plane(d) })) : [];
  return (u: number, v: number) => { let y = main(u, v); for (const d of ds) if (inside([u, v], d.poly)) y = Math.max(y, d.at(u, v)); return y; };
}
/** a dormer's own roof as a height field */
export const dormerAt = (d: NonNullable<FreeRoof['dormers']>[number]) => roofAt({ type: 'gable', ridge: d.ridge, height: d.height, pitchDeg: d.pitchDeg }, false);
/** which side of the ridge a point is on (+1 or −1), for splitting the roof into its two planes */
export function ridgeSide(roof: FreeRoof, p: Pt) {
  const [r0, r1] = roof.ridge;
  return (r1[0] - r0[0]) * (p[1] - r0[1]) - (r1[1] - r0[1]) * (p[0] - r0[0]) >= 0 ? 1 : -1;
}
/** clip a polygon to one side of the infinite ridge line (Sutherland–Hodgman against one half-plane) */
export function clipToSide(poly: Pt[], roof: FreeRoof, side: 1 | -1): Pt[] {
  const [r0, r1] = roof.ridge;
  const f = (p: Pt) => side * ((r1[0] - r0[0]) * (p[1] - r0[1]) - (r1[1] - r0[1]) * (p[0] - r0[0]));
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], fa = f(a), fb = f(b);
    if (fa >= 0) out.push(a);
    if ((fa >= 0) !== (fb >= 0)) { const t = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  return out;
}
/** a polygon pushed out by d (miter, capped), for the eave overhang */
export function offset(poly: Pt[], d: number): Pt[] {
  const s = area(poly) > 0 ? 1 : -1, n = poly.length, out: Pt[] = [];
  // outward normal of an edge (dx, dz): (dz, −dx) when the signed area is positive, the other way when it is negative
  const nrm = (e: Pt): Pt => { const l = Math.hypot(e[0], e[1]) || 1; return [(s * e[1]) / l, (-s * e[0]) / l]; };
  for (let i = 0; i < n; i++) {
    const p0 = poly[(i - 1 + n) % n], p1 = poly[i], p2 = poly[(i + 1) % n];
    const n0 = nrm(sub(p1, p0)), n1 = nrm(sub(p2, p1));
    let mx = n0[0] + n1[0], mz = n0[1] + n1[1]; const ml = Math.hypot(mx, mz) || 1; mx /= ml; mz /= ml;
    const k = Math.min(3, 1 / Math.max(0.2, mx * n1[0] + mz * n1[1]));
    out.push([p1[0] + mx * d * k, p1[1] + mz * d * k]);
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ checks against the drawing
/** the overall size of the footprint, and the area enclosed */
export function footprintSize(b: FreeBuilding) { const bb = bbox(b.footprint); return { W: bb.w, D: bb.d, area: Math.abs(area(b.footprint)), u0: bb.u0, v0: bb.v0 }; }
/** seats in a layout: chairs, plus a round table's seats */
export function seatCount(seats: Seat[]) { return seats.reduce((t, s) => t + (s.kind === 'round-table' ? s.seats ?? 0 : 1), 0); }
/** headroom under the roof at a point on a level: the room a person has between that floor and the roof's underside */
export function headroom(b: FreeBuilding, levelId: string, p: Pt) { const L = b.levels.find((l) => l.id === levelId); return L ? roofAt(b.roof)(p[0], p[1]) - L.floor : NaN; }
