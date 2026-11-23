// The maths behind a camera path drawn by an architect on a site plan (cameraPathUI.ts is the card that uses it).
// Pure functions, no three.js and no page, so they are tested directly (tests/architecture/cam-path.test.mjs):
//   traceStroke   find the drawn line on a picture of the sketch by its colour, and give it back as an ordered polyline
//   simplify      fewer nodes along the same line (Ramer–Douglas–Peucker)
//   align2        the move, turn and scale that takes two points picked on the sketch to the two matching points on the ground
//   spline        a centripetal Catmull–Rom curve through the nodes, sampled evenly along its length
//   pathRecord    the record that goes back to the workspace: nodes in the model's frame, who traced it, who confirmed it
// A traced path is a proposal: it is only the path once a person confirms it (pathRecord with confirmed_by).

export type P2 = [number, number];
export type P3 = [number, number, number];
export interface Pixels { width: number; height: number; data: ArrayLike<number> }

const hueOf = (r: number, g: number, b: number) => {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return 0;
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
};
const hex = (r: number, g: number, b: number) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

/** ink that is a colour, not black, grey or paper: strongly saturated and not dark */
const coloured = (r: number, g: number, b: number) => Math.max(r, g, b) - Math.min(r, g, b) >= 90 && Math.max(r, g, b) >= 110;

/** The most used strong colour on the sketch (the pen the path was drawn in), as a hue in degrees, with how many pixels. */
export function strokeColour(img: Pixels): { hue: number; pixels: number; hex: string } | null {
  const bins = new Array(36).fill(0), sum = Array.from({ length: 36 }, () => [0, 0, 0]), d = img.data;
  for (let k = 0; k < img.width * img.height; k++) {
    const r = d[k * 4], g = d[k * 4 + 1], b = d[k * 4 + 2];
    if ((d[k * 4 + 3] ?? 255) < 128 || !coloured(r, g, b)) continue;
    const i = Math.floor(hueOf(r, g, b) / 10) % 36; bins[i]++; sum[i][0] += r; sum[i][1] += g; sum[i][2] += b;
  }
  let best = -1, n = 0;
  for (let i = 0; i < 36; i++) { if (!bins[i]) continue; const v = bins[(i + 35) % 36] + bins[i] + bins[(i + 1) % 36]; if (v > n || (v === n && bins[i] > bins[best])) { n = v; best = i; } }
  if (best < 0 || bins[best] === 0) return null;
  const s = sum[best];
  return { hue: best * 10 + 5, pixels: n, hex: hex(s[0] / bins[best], s[1] / bins[best], s[2] / bins[best]) };
}

export interface Trace { pts: P2[]; colour: string; hue: number; pixels: number; cell: number; pieces: number; why?: string }

/**
 * Find the line drawn in one colour and return it as an ordered polyline in picture pixels (x right, y down).
 * The pen colour is the most used strong colour unless `hue` is given. The line is gathered into cells about a pen width
 * across, broken pieces (a dashed line) are joined across small gaps, and the longest run through them is the path.
 */
export function traceStroke(img: Pixels, o: { hue?: number; tol?: number; cell?: number; gap?: number } = {}): Trace {
  const W = img.width, H = img.height, d = img.data;
  const found = o.hue == null ? strokeColour(img) : { hue: o.hue, pixels: 0, hex: '' };
  if (!found) return { pts: [], colour: '', hue: 0, pixels: 0, cell: 0, pieces: 0, why: 'no coloured line on the sketch' };
  const tol = o.tol ?? 22, near = (h: number) => Math.min(Math.abs(h - found.hue), 360 - Math.abs(h - found.hue)) <= tol;
  const cell = o.cell ?? Math.max(3, Math.round(Math.min(W, H) / 120)), cw = Math.ceil(W / cell), ch = Math.ceil(H / cell);
  const cnt = new Uint32Array(cw * ch), sx = new Float64Array(cw * ch), sy = new Float64Array(cw * ch);
  let pixels = 0, rr = 0, gg = 0, bb = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x, r = d[k * 4], g = d[k * 4 + 1], b = d[k * 4 + 2];
    if ((d[k * 4 + 3] ?? 255) < 128 || !coloured(r, g, b) || !near(hueOf(r, g, b))) continue;
    const c = Math.floor(y / cell) * cw + Math.floor(x / cell); cnt[c]++; sx[c] += x + 0.5; sy[c] += y + 0.5; pixels++; rr += r; gg += g; bb += b;
  }
  const colour = pixels ? hex(rr / pixels, gg / pixels, bb / pixels) : found.hex;
  const cells: number[] = []; for (let c = 0; c < cnt.length; c++) if (cnt[c] >= 2) cells.push(c);
  if (cells.length < 2) return { pts: [], colour, hue: found.hue, pixels, cell, pieces: 0, why: 'the coloured line is too short to follow' };
  const isOn = new Uint8Array(cw * ch); for (const c of cells) isOn[c] = 1;
  // pieces: cells touching (8 ways)
  const comp = new Int32Array(cw * ch).fill(-1); let pieces = 0;
  const nb = (c: number, r: number) => { const out: number[] = [], cx = c % cw, cy = Math.floor(c / cw); for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (!dx && !dy) continue; const x = cx + dx, y = cy + dy; if (x >= 0 && y >= 0 && x < cw && y < ch && isOn[y * cw + x]) out.push(y * cw + x); } return out; };
  for (const c of cells) {
    if (comp[c] >= 0) continue;
    const q = [c]; comp[c] = pieces;
    while (q.length) { const a = q.pop()!; for (const b of nb(a, 1)) if (comp[b] < 0) { comp[b] = pieces; q.push(b); } }
    pieces++;
  }
  // join pieces across small gaps (a dashed or broken line): any two cells of different pieces within `gap` cells are linked
  const gap = o.gap ?? 4, links = new Map<number, number[]>();
  const link = (a: number, b: number) => { (links.get(a) ?? links.set(a, []).get(a)!).push(b); };
  for (const c of cells) for (const b of nb(c, 1)) link(c, b);
  if (pieces > 1) {
    // the nearest cell of each other piece, for each piece pair, if close enough
    const best = new Map<string, [number, number, number]>();
    for (const a of cells) for (const b of nb(a, gap)) {
      if (comp[a] === comp[b]) continue;
      const key = comp[a] < comp[b] ? `${comp[a]}-${comp[b]}` : `${comp[b]}-${comp[a]}`, dd = Math.hypot((a % cw) - (b % cw), Math.floor(a / cw) - Math.floor(b / cw));
      const cur = best.get(key); if (!cur || dd < cur[2]) best.set(key, [a, b, dd]);
    }
    for (const [a, b] of best.values()) { link(a, b); link(b, a); }
  }
  // the biggest joined group, then the longest run through it (two breadth-first walks)
  const far = (start: number) => {
    const dist = new Map<number, number>([[start, 0]]), par = new Map<number, number>(), q = [start];
    let last = start;
    for (let i = 0; i < q.length; i++) { const a = q[i]; for (const b of links.get(a) ?? []) if (!dist.has(b)) { dist.set(b, dist.get(a)! + 1); par.set(b, a); q.push(b); last = b; } }
    return { last, dist, par };
  };
  let group: Map<number, number> | null = null, seed = cells[0];
  { const seen = new Set<number>(); for (const c of cells) { if (seen.has(c)) continue; const f = far(c); for (const k of f.dist.keys()) seen.add(k); if (!group || f.dist.size > group.size) { group = f.dist; seed = c; } } }
  const A = far(seed).last, fromA = far(A), B = fromA.last, run: number[] = [B];
  while (run[run.length - 1] !== A) run.push(fromA.par.get(run[run.length - 1])!);
  const raw: P2[] = run.map((c) => [sx[c] / cnt[c], sy[c] / cnt[c]]);
  // the run steps from cell to cell, so it zigzags along a thick line: a short running mean straightens it (ends kept)
  const k = 3, pts: P2[] = raw.map((_, i) => { const w = Math.min(k, i, raw.length - 1 - i); let x = 0, y = 0; for (let j = i - w; j <= i + w; j++) { x += raw[j][0]; y += raw[j][1]; } return [x / (2 * w + 1), y / (2 * w + 1)]; });
  return { pts: simplify(pts, cell * 1.2), colour, hue: found.hue, pixels, cell, pieces };
}

/** Ramer–Douglas–Peucker: drop nodes that stand within `eps` of the line through their neighbours */
export function simplify<T extends number[]>(pts: T[], eps: number): T[] {
  if (pts.length < 3) return pts.slice();
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [i, j] = stack.pop()!, [ax, ay] = pts[i], [bx, by] = pts[j], L = Math.hypot(bx - ax, by - ay) || 1e-9;
    let k = -1, dm = 0;
    for (let m = i + 1; m < j; m++) { const dd = Math.abs((bx - ax) * (ay - pts[m][1]) - (ax - pts[m][0]) * (by - ay)) / L; if (dd > dm) { dm = dd; k = m; } }
    if (k > 0 && dm > eps) { keep[k] = 1; stack.push([i, k], [k, j]); }
  }
  return pts.filter((_, i) => keep[i]);
}

export interface Align { scale: number; turnDeg: number; apply: (p: P2) => P2; invert: (p: P2) => P2 }
/** The similarity (move, turn, even scale; never a mirror) that takes sketch points a1, a2 to ground points b1, b2. */
export function align2(a1: P2, a2: P2, b1: P2, b2: P2): Align {
  const ax = a2[0] - a1[0], ay = a2[1] - a1[1], bx = b2[0] - b1[0], by = b2[1] - b1[1], aa = ax * ax + ay * ay;
  if (aa < 1e-12 || bx * bx + by * by < 1e-12) throw new Error('the two points are the same point');
  // m = b / a as complex numbers
  const mr = (bx * ax + by * ay) / aa, mi = (by * ax - bx * ay) / aa, mm = mr * mr + mi * mi;
  return {
    scale: Math.sqrt(mm), turnDeg: (Math.atan2(mi, mr) * 180) / Math.PI,
    apply: ([x, y]) => { const dx = x - a1[0], dy = y - a1[1]; return [b1[0] + mr * dx - mi * dy, b1[1] + mi * dx + mr * dy]; },
    invert: ([x, y]) => { const dx = x - b1[0], dy = y - b1[1]; return [a1[0] + (mr * dx + mi * dy) / mm, a1[1] + (mr * dy - mi * dx) / mm]; },
  };
}

/** a point on the centripetal Catmull–Rom segment from p1 to p2 (p0 and p3 its neighbours), t from 0 to 1 */
function crPoint(p0: number[], p1: number[], p2: number[], p3: number[], t: number) {
  const dt = (a: number[], b: number[]) => Math.max(1e-6, Math.sqrt(Math.hypot(...a.map((v, i) => v - b[i]))));
  const t0 = 0, t1 = t0 + dt(p0, p1), t2 = t1 + dt(p1, p2), t3 = t2 + dt(p2, p3), u = t1 + (t2 - t1) * t;
  return p1.map((_, i) => {
    const A1 = ((t1 - u) * p0[i] + (u - t0) * p1[i]) / (t1 - t0), A2 = ((t2 - u) * p1[i] + (u - t1) * p2[i]) / (t2 - t1), A3 = ((t3 - u) * p2[i] + (u - t2) * p3[i]) / (t3 - t2);
    const B1 = ((t2 - u) * A1 + (u - t0) * A2) / (t2 - t0), B2 = ((t3 - u) * A2 + (u - t1) * A3) / (t3 - t1);
    return ((t2 - u) * B1 + (u - t1) * B2) / (t2 - t1);
  });
}
export interface Spline { pts: number[][]; at: number[]; length: number; point: (s: number) => number[] }
/** A centripetal Catmull–Rom curve through every node (the ends extended straight), sampled about `step` apart along its length. */
export function spline(nodes: number[][], step = 0.25): Spline {
  if (nodes.length < 2) throw new Error('a path needs at least two points');
  const n = nodes.length, ext = (a: number[], b: number[]) => a.map((v, i) => 2 * v - b[i]);
  const P = [ext(nodes[0], nodes[1]), ...nodes, ext(nodes[n - 1], nodes[n - 2])];
  const dense: number[][] = [];
  for (let i = 1; i < P.length - 2; i++) {
    const L = Math.hypot(...P[i + 1].map((v, k) => v - P[i][k])), m = Math.max(4, Math.ceil(L / (step / 4)));
    for (let j = 0; j < m; j++) dense.push(crPoint(P[i - 1], P[i], P[i + 1], P[i + 2], j / m));
  }
  dense.push(nodes[n - 1].slice());
  const cum = [0]; for (let i = 1; i < dense.length; i++) cum.push(cum[i - 1] + Math.hypot(...dense[i].map((v, k) => v - dense[i - 1][k])));
  const length = cum[cum.length - 1];
  const point = (s: number) => {
    const x = Math.max(0, Math.min(length, s));
    let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= x) lo = mid; else hi = mid; }
    const f = cum[hi] > cum[lo] ? (x - cum[lo]) / (cum[hi] - cum[lo]) : 0;
    return dense[lo].map((v, k) => v + (dense[hi][k] - v) * f);
  };
  const count = Math.max(2, Math.round(length / step) + 1), pts: number[][] = [], at: number[] = [];
  for (let i = 0; i < count; i++) { const s = (length * i) / (count - 1); at.push(s); pts.push(point(s)); }
  return { pts, at, length, point };
}

/** Where the camera is and what it looks at, `s` metres along a path in plan (x, z): eye `h` above the ground, looking `ahead` metres on. */
export function eyeAt(sp: Spline, s: number, ground: (x: number, z: number) => number, h: number, ahead = 6) {
  const p = sp.point(s), y = ground(p[0], p[1]) + h;
  let q: number[];
  if (s + ahead <= sp.length) q = sp.point(s + ahead);
  else { const a = sp.point(Math.max(0, sp.length - 0.5)), b = sp.point(sp.length), L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, over = s + ahead - sp.length; q = [b[0] + ((b[0] - a[0]) / L) * over, b[1] + ((b[1] - a[1]) / L) * over]; }
  return { eye: [p[0], y, p[1]] as P3, look: [q[0], Math.max(y - 0.6, ground(q[0], q[1]) + h * 0.85), q[1]] as P3 };
}

export const DEFAULT_EYE = 1.6;
export const PATH_SCHEMA = 'assembl.camera-path.v1';
export interface CameraPath {
  schema: typeof PATH_SCHEMA;
  /** nodes in the model's own frame, metres: [u, v, h] = [x, z, height of the eye above the ground there] (y is up) */
  pts: P3[];
  /** the same nodes from the site point: [metres north, metres east, h]; null when the model has no site point */
  pts_site: P3[] | null;
  frame: string;
  height: { value: number; source: 'assumed' | 'set by hand'; basis: string };
  sketch_file_id: string | null;
  /** who drew the line: the tool's tracer (a proposal until confirmed) or a person */
  traced_by: 'tool' | 'person';
  /** how, in words: which line it followed, and whether a person edited it */
  traced_how: string;
  confirmed_by: string | null;
  confirmed_at: string | null;
  length_m: number;
  align?: { sketch: [P2, P2]; ground: [P2, P2]; metres_per_pixel: number; turn_deg: number } | null;
  site_point?: { lat: number; lng: number; source: string } | null;
  model?: string;
}
/**
 * The camera-path record. `toSite` turns a model point (x, z) into metres north and east of the site point (null: no site).
 * Without `confirmedBy` it is a proposal (confirmed_by and confirmed_at stay null).
 */
export function pathRecord(o: { nodes: P2[]; h?: number; hSource?: 'assumed' | 'set by hand'; sketchFileId?: string | null; tracedBy: 'tool' | 'person'; tracedHow?: string; confirmedBy?: string | null; at?: string; frame: string; toSite?: ((x: number, z: number) => P2) | null; align?: CameraPath['align']; sitePoint?: CameraPath['site_point']; model?: string }): CameraPath {
  if (o.nodes.length < 2) throw new Error('a path needs at least two points');
  const h = o.h ?? DEFAULT_EYE, r = (v: number) => Math.round(v * 1000) / 1000, who = o.confirmedBy?.trim() || null;
  let L = 0; for (let i = 1; i < o.nodes.length; i++) L += Math.hypot(o.nodes[i][0] - o.nodes[i - 1][0], o.nodes[i][1] - o.nodes[i - 1][1]);
  return {
    schema: PATH_SCHEMA,
    pts: o.nodes.map(([x, z]) => [r(x), r(z), r(h)]),
    pts_site: o.toSite ? o.nodes.map(([x, z]) => { const [nn, e] = o.toSite!(x, z); return [r(nn), r(e), r(h)] as P3; }) : null,
    frame: o.frame,
    height: { value: h, source: o.hSource ?? (o.h == null ? 'assumed' : 'set by hand'), basis: 'eye height above the ground at each point' },
    sketch_file_id: o.sketchFileId ?? null, traced_by: o.tracedBy, traced_how: o.tracedHow ?? (o.tracedBy === 'tool' ? 'traced by the tool' : 'drawn by a person'),
    confirmed_by: who, confirmed_at: who ? o.at ?? new Date().toISOString() : null,
    length_m: Math.round(L * 10) / 10, align: o.align ?? null, site_point: o.sitePoint ?? null, model: o.model,
  };
}
