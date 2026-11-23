// Where an opened model stands on its site, worked out by matching it to a building LINZ already has. Pure: no page, no three.js,
// tested on its own with invented footprints (tests/architecture/place-fit.test.mjs).
//
// An IFC from Revit rarely says where it is (its IfcSite latitude and longitude is often the template's default), and the
// project's site point is a LINZ address point: the road address of the property, not the middle of the building. When the model
// also carries a building that is already there (an existing hall or church kept beside the new work, say), that building's
// footprint is fitted to the LINZ outline of similar size and shape near the site point: a turn and a move, least squares on
// points round the two footprints, with the residual in metres. The result is assumed until a person presses Confirm.
//
// Frames: model plan points are p = (x, −z) from the scene's (x, z) (so up the plan is +p_y). NZTM points are (e, n).
// A fit is NZTM ≈ R(φ)·p + t, R the turn anticlockwise by φ. placementFrom turns it into the page's placement (siteGround.ts
// frameOf: turnDeg, and east / north from the site point), with the grid convergence γ at the point: turnDeg = φ − γ.

export type P2 = [number, number];
export const plan = (x: number, z: number): P2 => [x, -z];

/** convex hull (Andrew's monotone chain), anticlockwise, without repeating the first point */
export function hull(pts: P2[]): P2[] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o: P2, a: P2, b: P2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: P2[] = [], up: P2[] = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
export const area = (r: P2[]) => { let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]); return Math.abs(a) / 2; };
const centroid = (pts: P2[]): P2 => { let x = 0, y = 0; for (const p of pts) { x += p[0]; y += p[1]; } return [x / pts.length, y / pts.length]; };

/** points every `step` metres round a closed ring */
export function samples(ring: P2[], step = 0.5): P2[] {
  const out: P2[] = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(1, Math.ceil(L / step));
    for (let t = 0; t < k; t++) out.push([a[0] + ((b[0] - a[0]) * t) / k, a[1] + ((b[1] - a[1]) * t) / k]);
  }
  return out;
}
const nearestOnRing = (q: P2, ring: P2[]): P2 => {
  let best: P2 = ring[0], bd = Infinity;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-12;
    const t = Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / L2)), p: P2 = [a[0] + t * dx, a[1] + t * dy], d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
    if (d < bd) { bd = d; best = p; }
  }
  return best;
};
/** the long axis of a set of points (principal direction), radians */
const axis = (pts: P2[]) => { const [cx, cy] = centroid(pts); let xx = 0, yy = 0, xy = 0; for (const [x, y] of pts) { xx += (x - cx) ** 2; yy += (y - cy) ** 2; xy += (x - cx) * (y - cy); } return 0.5 * Math.atan2(2 * xy, xx - yy); };
const rot = (p: P2, c: number, s: number): P2 => [p[0] * c - p[1] * s, p[0] * s + p[1] * c];

export interface Fit { phi: number; t: P2; rms: number; max: number; areaRatio: number }
/**
 * The turn and move that best put footprint `a` (model plan) onto ring `b` (NZTM): from each of four starting turns (the long
 * axes lined up, then a quarter turn at a time), iterative closest points with the closed-form 2D least squares each round.
 * `starts` adds starting turns (the IFC's own true north, turned onto the grid, when it has one).
 * The residual is measured both ways (a's points to b's edges and b's to a's), so a small footprint inside a large outline
 * does not look like a good fit.
 */
export function fitFootprint(a: P2[], b: P2[], rounds = 30, starts: number[] = []): Fit & { second: Fit | null } {
  const A = samples(a), B = samples(b), ca = centroid(A), cb = centroid(B), base = axis(B) - axis(A);
  const fits: Fit[] = [];
  const inits = [0, 1, 2, 3].map((k) => base + (k * Math.PI) / 2).concat(starts);
  for (const phi0 of inits) {
    let phi = phi0, c = Math.cos(phi), s = Math.sin(phi);
    let t: P2 = [cb[0] - (ca[0] * c - ca[1] * s), cb[1] - (ca[0] * s + ca[1] * c)];
    for (let it = 0; it < rounds; it++) {
      const moved = A.map((p) => { const r = rot(p, c, s); return [r[0] + t[0], r[1] + t[1]] as P2; });
      const near = moved.map((p) => nearestOnRing(p, b));
      // closed-form: the turn that best maps A onto its nearest points, about their centroids
      const pa = centroid(A), pb = centroid(near);
      let sxx = 0, sxy = 0;
      for (let i = 0; i < A.length; i++) { const ax = A[i][0] - pa[0], ay = A[i][1] - pa[1], bx = near[i][0] - pb[0], by = near[i][1] - pb[1]; sxx += ax * bx + ay * by; sxy += ax * by - ay * bx; }
      phi = Math.atan2(sxy, sxx); c = Math.cos(phi); s = Math.sin(phi);
      const r = rot(pa, c, s); t = [pb[0] - r[0], pb[1] - r[1]];
    }
    const moved = A.map((p) => { const r = rot(p, c, s); return [r[0] + t[0], r[1] + t[1]] as P2; });
    const back = B.map((q) => { const inv = rot([q[0] - t[0], q[1] - t[1]], c, -s); return nearestOnRing(inv, a); });
    const d1 = moved.map((p) => { const q = nearestOnRing(p, b); return Math.hypot(p[0] - q[0], p[1] - q[1]); });
    const d2 = B.map((q, i) => { const r = rot(back[i], c, s); return Math.hypot(q[0] - r[0] - t[0], q[1] - r[1] - t[1]); });
    const all = d1.concat(d2), rms = Math.sqrt(all.reduce((x, d) => x + d * d, 0) / all.length);
    fits.push({ phi: ((phi % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), t, rms, max: Math.max(...all), areaRatio: area(a) / Math.max(1e-9, area(b)) });
  }
  fits.sort((x, y) => x.rms - y.rms);
  // a second fit almost as good but turned well away from the first: the shape is symmetric and the turn is a guess
  const second = fits.find((f) => Math.abs(Math.atan2(Math.sin(f.phi - fits[0].phi), Math.cos(f.phi - fits[0].phi))) > 0.35 && f.rms < fits[0].rms + 0.25) ?? null;
  return { ...fits[0], second };
}

export interface Candidate { id: string; label: string; ring: P2[] }
export interface Match { candidate: Candidate; fit: Fit & { second: Fit | null }; distance: number; tried: number }
/**
 * The LINZ outline that best fits the footprint: outlines whose area is within 0.6 to 1.6 times the footprint's and whose middle
 * is within `within` metres of `near` (the site point, NZTM); the lowest residual wins. null when none is close in size.
 */
export function bestMatch(footprint: P2[], list: Candidate[], near: P2, within = 450, starts: number[] = []): Match | null {
  const fa = area(hull(footprint));
  let best: Match | null = null, tried = 0;
  for (const c of list) {
    const h = hull(c.ring), ca = area(h);
    if (!(ca > 0) || fa / ca < 0.6 || fa / ca > 1.6) continue;
    const m = centroid(h), d = Math.hypot(m[0] - near[0], m[1] - near[1]);
    if (d > within) continue;
    tried++;
    const fit = fitFootprint(hull(footprint), h, 30, starts);
    if (!best || fit.rms < best.fit.rms) best = { candidate: c, fit, distance: d, tried: 0 };
  }
  if (best) best.tried = tried;
  return best;
}

/** the page's placement from a fit: turnDeg (siteGround.ts frameOf) and east / north of the building's middle from the site point */
export function placementFrom(fit: { phi: number; t: P2 }, middle: { x: number; z: number }, site: { e: number; n: number }, gammaDeg: number) {
  const c = Math.cos(fit.phi), s = Math.sin(fit.phi), pc = plan(middle.x, middle.z), r = rot(pc, c, s);
  const e = r[0] + fit.t[0], n = r[1] + fit.t[1];
  const turn = (((fit.phi * 180) / Math.PI - gammaDeg) % 360 + 540) % 360 - 180;
  return { turnDeg: Math.round(turn * 100) / 100, east: Math.round((e - site.e) * 100) / 100, north: Math.round((n - site.n) * 100) / 100 };
}

// ---- the parts of an opened model, grouped into buildings ----------------------------------------------------------------------
export interface Part { box: [number, number, number, number]; name: string; cls: string }   // plan box in the scene: x0, z0, x1, z1
/**
 * Group a model's parts into separate buildings: parts whose plan boxes touch (within `gap` metres) are one building. Parts
 * bigger than `maxSpan` (a topography mesh, a road) are left out. Returns each group's part indices, largest first.
 */
export function clusters(parts: Part[], gap = 0.6, maxSpan = 120): number[][] {
  const ok = parts.map((p, i) => ({ i, b: p.box })).filter(({ b }) => b.every(Number.isFinite) && Math.max(b[2] - b[0], b[3] - b[1]) <= maxSpan);
  const parent = new Map<number, number>(); for (const { i } of ok) parent.set(i, i);
  const find = (i: number): number => { let r = i; while (parent.get(r) !== r) r = parent.get(r)!; parent.set(i, r); return r; };
  // sweep along x so only overlapping-in-x boxes are compared
  const byX = [...ok].sort((a, b) => a.b[0] - b.b[0]);
  for (let a = 0; a < byX.length; a++) for (let b = a + 1; b < byX.length && byX[b].b[0] <= byX[a].b[2] + gap; b++) {
    const A = byX[a].b, B = byX[b].b;
    if (B[1] <= A[3] + gap && A[1] <= B[3] + gap) parent.set(find(byX[a].i), find(byX[b].i));
  }
  const groups = new Map<number, number[]>();
  for (const { i } of ok) { const r = find(i); if (!groups.has(r)) groups.set(r, []); groups.get(r)!.push(i); }
  const span = (g: number[]) => { let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity; for (const i of g) { const b = parts[i].box; x0 = Math.min(x0, b[0]); z0 = Math.min(z0, b[1]); x1 = Math.max(x1, b[2]); z1 = Math.max(z1, b[3]); } return (x1 - x0) * (z1 - z0); };
  return [...groups.values()].sort((a, b) => span(b) - span(a));
}
/** words that mark a part as a building already on the site (in its IFC name, type or class); a person can pick one instead */
export const EXISTING = /\b(existing|exist|chapel|church|hall|retained|heritage|demolish)/i;
/** the group that most looks like an existing building: the one with most parts whose names say so (null when none do) */
export function existingGroup(parts: Part[], groups: number[][]): number | null {
  let best = -1, bestN = 0;
  groups.forEach((g, k) => { const n = g.filter((i) => EXISTING.test(`${parts[i].name} ${parts[i].cls}`)).length; if (n > bestN) { bestN = n; best = k; } });
  return best >= 0 ? best : null;
}

// ---- the record kept with the project ----------------------------------------------------------------------------------------
/**
 * Where the building stands, as the workspace keeps it (site_sources.placement):
 *   { east, north: metres on the NZTM grid from the site point to the building's middle; turn_deg: frameOf's turn;
 *     status: 'assumed' | 'set by a person'; method: 'matched' | 'by hand' | 'site point'; residual_m, matched_to (words only);
 *     site_point: { lat, lng } it is measured from; model: the model file's name; confirmed_by, confirmed_at }
 * Anything that does not fit is dropped, never guessed at.
 */
export interface PlacementRecord { east: number; north: number; turn_deg: number; status: 'assumed' | 'set by a person'; method: 'matched' | 'by hand' | 'site point'; residual_m: number | null; matched_to: string | null; site_point: { lat: number; lng: number }; model: string; confirmed_by: string | null; confirmed_at: string | null }
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
export function normalPlacement(v: unknown): PlacementRecord | null {
  const o = v as Record<string, unknown> | null;
  if (!o || typeof o !== 'object' || !num(o.east) || !num(o.north) || !num(o.turn_deg)) return null;
  const sp = o.site_point as Record<string, unknown> | undefined;
  if (!sp || !num(sp.lat) || !num(sp.lng)) return null;
  if (Math.hypot(o.east, o.north) > 2000) return null;
  const by = o.confirmed_by ? String(o.confirmed_by) : null, at = o.confirmed_at ? String(o.confirmed_at) : null;
  return { east: o.east, north: o.north, turn_deg: o.turn_deg, status: by && at && o.status === 'set by a person' ? 'set by a person' : 'assumed',
    method: o.method === 'matched' ? 'matched' : o.method === 'by hand' ? 'by hand' : 'site point', residual_m: num(o.residual_m) ? o.residual_m : null,
    matched_to: o.matched_to ? String(o.matched_to).slice(0, 120) : null, site_point: { lat: sp.lat, lng: sp.lng }, model: String(o.model ?? '').slice(0, 200), confirmed_by: by, confirmed_at: at };
}
/** does a kept placement still apply: the same site point (within a metre or so) and the same model file */
export const placementFits = (r: PlacementRecord | null, point: { lat: number; lng: number } | null, model: string) =>
  !!r && !!point && Math.abs(r.site_point.lat - point.lat) < 1e-5 && Math.abs(r.site_point.lng - point.lng) < 1e-5 && (!r.model || !model || r.model === model);

// ---- the model's own ground against LiDAR, after the fit -------------------------------------------------------------------------
const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
/**
 * How the model's own ground surface (its site or toposolid parts) sits on LiDAR's: `pts` are points of that surface (scene x, y, z),
 * `ground(x, z)` LiDAR's ground there (NaN where unknown or under the building's platform). Returns the median offset (the model's
 * ground above LiDAR's), the median absolute deviation about it, and the small move (dx, dz, in a grid of ±`reach` m) that makes
 * that deviation least; null with fewer than 20 usable points.
 */
export function groundAgreement(pts: [number, number, number][], ground: (x: number, z: number) => number, reach = 1.5, step = 0.5) {
  const at = (dx: number, dz: number) => {
    const d: number[] = [];
    for (const [x, y, z] of pts) { const g = ground(x + dx, z + dz); if (g === g) d.push(y - g); }
    if (d.length < 20) return null;
    const off = median(d);
    return { offset: off, mad: median(d.map((v) => Math.abs(v - off))), n: d.length };
  };
  const here = at(0, 0);
  if (!here) return null;
  let best = { ...here, dx: 0, dz: 0 };
  for (let dx = -reach; dx <= reach + 1e-9; dx += step) for (let dz = -reach; dz <= reach + 1e-9; dz += step) {
    const r = at(dx, dz); if (r && r.n >= here.n * 0.8 && (r.mad < best.mad - 0.005 || (Math.abs(r.mad - best.mad) <= 0.005 && Math.hypot(dx, dz) < Math.hypot(best.dx, best.dz)))) best = { ...r, dx, dz };
  }
  const r2 = (v: number) => Math.round(v * 100) / 100;
  return { offset: r2(here.offset), mad: r2(here.mad), n: here.n, best: { dx: best.dx, dz: best.dz, offset: r2(best.offset), mad: r2(best.mad) } };
}
