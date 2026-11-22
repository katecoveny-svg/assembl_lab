// The geometry check: does a generated photo (or a film frame) keep the building's geometry? It compares the photo's
// edges with the model's own line drawing of the same view (lines.ts, from the exact passes), inside the building only.
// Deterministic and free: no model call, no randomness; the same pictures always give the same report.
//
// 1. The photo is scaled to the model view's size and its edges found (Canny on the log of brightness, so an edge in shade
//    counts like one in sun; thresholds from the building's own gradients).
// 2. The model's building edges are the black pixels of the line drawing; each knows its part (walls, openings, roof,
//    deck, deck balustrade, stair, poles…) from the part mask, and its direction from the drawing's local shape. The
//    cladding's fine ribs are drawn but not scored. With the model's own render of the view as reference, only the edges
//    that render shows are scored (an edge the model's picture cannot show cannot be asked of a photo).
// 3. A small global shift and scale (at most 3% and 4%) is allowed and reported, so a photo framed a few pixels off is
//    not called a different building.
// 4. A model edge is kept when the photo has an edge of the same direction (within about 11–22°) within `tau` pixels
//    (0.23% of the diagonal, 3 px at 1040 × 780): an edge chamfer test, read from distance transforms of the photo's
//    edges by direction. Busy photos match by chance more often, so the same test is run with every edge moved
//    3·tau + 2 px in eight directions, and the score is the share kept above that chance: (kept − chance) / (1 − chance).
// 5. The report: the score overall and for each part, the mean chamfer distance, the share of the photo's own edges on
//    the building that lie on a model edge, and the regions (tiles joined up) where the model's edges are not found,
//    each with the part that drifts there and how much of it looks like planting in front.
// The verdict is "holds" or "drifts"; it is a check of edges, not a professional review of the design, and a person
// still looks at every picture.

import { PART_NAMES, isBuilding, isScored } from './lines.ts';

export interface Img { w: number; h: number; ch: number; px: Uint8Array }

/** area-averaged when shrinking, bilinear when growing; RGB out */
export function resizeRGB(img: Img, w: number, h: number): Uint8Array {
  const { w: W, h: H, ch, px } = img, out = new Uint8Array(w * h * 3);
  const sx = W / w, sy = H / h, at = (x: number, y: number, k: number) => px[(y * W + x) * ch + (ch >= 3 ? k : 0)];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    for (let k = 0; k < 3; k++) {
      let v: number;
      if (sx > 1.01 || sy > 1.01) {
        const x0 = x * sx, x1 = x0 + sx, y0 = y * sy, y1 = y0 + sy;
        let s = 0, a = 0;
        for (let yy = Math.floor(y0); yy < Math.min(H, Math.ceil(y1)); yy++) {
          const wy = Math.min(yy + 1, y1) - Math.max(yy, y0);
          for (let xx = Math.floor(x0); xx < Math.min(W, Math.ceil(x1)); xx++) { const wx = Math.min(xx + 1, x1) - Math.max(xx, x0), q = wx * wy; s += at(xx, yy, k) * q; a += q; }
        }
        v = s / a;
      } else {
        const fx = Math.min(W - 1, Math.max(0, (x + 0.5) * sx - 0.5)), fy = Math.min(H - 1, Math.max(0, (y + 0.5) * sy - 0.5));
        const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(W - 1, x0 + 1), y1 = Math.min(H - 1, y0 + 1), tx = fx - x0, ty = fy - y0;
        v = (at(x0, y0, k) * (1 - tx) + at(x1, y0, k) * tx) * (1 - ty) + (at(x0, y1, k) * (1 - tx) + at(x1, y1, k) * tx) * ty;
      }
      out[(y * w + x) * 3 + k] = Math.round(v);
    }
  }
  return out;
}

function blur(src: Float32Array, w: number, h: number, sigma: number): Float32Array {
  const r = Math.max(1, Math.ceil(sigma * 3)), k = new Float32Array(2 * r + 1);
  let s = 0; for (let i = -r; i <= r; i++) { k[i + r] = Math.exp(-(i * i) / (2 * sigma * sigma)); s += k[i + r]; }
  for (let i = 0; i < k.length; i++) k[i] /= s;
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let a = 0; for (let i = -r; i <= r; i++) a += k[i + r] * src[y * w + Math.min(w - 1, Math.max(0, x + i))]; tmp[y * w + x] = a; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let a = 0; for (let i = -r; i <= r; i++) a += k[i + r] * tmp[Math.min(h - 1, Math.max(0, y + i)) * w + x]; out[y * w + x] = a; }
  return out;
}

/** exact Euclidean distance (pixels) from every pixel to the nearest set pixel (Felzenszwalb and Huttenlocher) */
export function distanceTransform(set: Uint8Array, w: number, h: number): Float32Array {
  const INF = 1e12, f = new Float64Array(Math.max(w, h)), d = new Float64Array(Math.max(w, h)), v = new Int32Array(Math.max(w, h)), z = new Float64Array(Math.max(w, h) + 1);
  const g = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) g[i] = set[i] ? 0 : INF;
  const pass = (n: number, get: (i: number) => number, put: (i: number, x: number) => void) => {
    for (let i = 0; i < n; i++) f[i] = get(i);
    let k = 0; v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
    for (let q = 1; q < n; q++) {
      let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
      k++; v[k] = q; z[k] = s; z[k + 1] = Infinity;
    }
    k = 0;
    for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]; }
    for (let i = 0; i < n; i++) put(i, d[i]);
  };
  for (let x = 0; x < w; x++) pass(h, (y) => g[y * w + x], (y, val) => { g[y * w + x] = val; });
  for (let y = 0; y < h; y++) pass(w, (x) => g[y * w + x], (x, val) => { g[y * w + x] = val; });
  const out = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = Math.sqrt(g[i]);
  return out;
}

export interface Edges { edge: Uint8Array; theta: Float32Array; mag: Float32Array; high: number }
/** Canny edges of an RGB picture; thresholds from the gradients inside `roi` (high = that percentile, low = 0.4 of it) */
export function cannyRGB(rgb: Uint8Array, w: number, h: number, roi: Uint8Array | null, o: { sigma?: number; pct?: number; log?: boolean } = {}): Edges {
  const n = w * h, g = new Float32Array(n);
  // on the log of brightness an edge in shade is as strong as the same edge in sun (shading divides, the log subtracts)
  for (let i = 0; i < n; i++) { const y = 0.299 * rgb[i * 3] + 0.587 * rgb[i * 3 + 1] + 0.114 * rgb[i * 3 + 2]; g[i] = o.log ? 46 * Math.log(y + 8) : y; }
  const b = blur(g, w, h, o.sigma ?? 1.2), mag = new Float32Array(n), theta = new Float32Array(n);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const gx = b[i - w + 1] + 2 * b[i + 1] + b[i + w + 1] - b[i - w - 1] - 2 * b[i - 1] - b[i + w - 1];
    const gy = b[i + w - 1] + 2 * b[i + w] + b[i + w + 1] - b[i - w - 1] - 2 * b[i - w] - b[i - w + 1];
    mag[i] = Math.hypot(gx, gy);
    let t = Math.atan2(gy, gx); if (t < 0) t += Math.PI; if (t >= Math.PI) t -= Math.PI;
    theta[i] = t;
  }
  // thinning: keep a pixel only where its gradient is the largest across the edge
  const thin = new Float32Array(n);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x, t = theta[i], m = mag[i];
    if (!m) continue;
    const a = t < Math.PI / 8 || t >= (7 * Math.PI) / 8 ? 1 : t < (3 * Math.PI) / 8 ? w + 1 : t < (5 * Math.PI) / 8 ? w : w - 1;
    if (m >= mag[i - a] && m > mag[i + a]) thin[i] = m;
  }
  const vals: number[] = [];
  for (let i = 0; i < n; i++) if ((!roi || roi[i]) && mag[i] > 0) vals.push(mag[i]);
  vals.sort((p, q) => p - q);
  const high = Math.max(8, vals.length ? vals[Math.min(vals.length - 1, Math.floor(vals.length * (o.pct ?? 0.8)))] : 40), low = high * 0.4;
  // hysteresis: strong pixels, and weak ones joined to them
  const edge = new Uint8Array(n), stack: number[] = [];
  for (let i = 0; i < n; i++) if (thin[i] >= high) { edge[i] = 1; stack.push(i); }
  while (stack.length) {
    const i = stack.pop()!, x = i % w, y = (i / w) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      const j = yy * w + xx; if (!edge[j] && thin[j] >= low) { edge[j] = 1; stack.push(j); }
    }
  }
  return { edge, theta, mag, high };
}

/** direction across a one-pixel line, from the local second derivatives of the blurred drawing (0..π) */
function lineTheta(ink: Uint8Array, w: number, h: number): Float32Array {
  const f = new Float32Array(w * h); for (let i = 0; i < f.length; i++) f[i] = ink[i];
  const b = blur(f, w, h, 1.5), th = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const xx = b[i + 1] + b[i - 1] - 2 * b[i], yy = b[i + w] + b[i - w] - 2 * b[i], xy = (b[i + w + 1] + b[i - w - 1] - b[i + w - 1] - b[i - w + 1]) / 4;
    // 0.5·atan2(2xy, xx − yy) is the direction of the larger curvature, which runs along a bright line; across it is a
    // quarter turn on (the direction a photo's gradient takes at that edge)
    let t = 0.5 * Math.atan2(2 * xy, xx - yy) + Math.PI / 2; if (t < 0) t += Math.PI; if (t >= Math.PI) t -= Math.PI;
    th[i] = t;
  }
  return th;
}

const BINS = 16, BIN = Math.PI / BINS;
const binOf = (t: number) => Math.min(BINS - 1, Math.floor(t / BIN));
/** the eight places a model edge is moved to, to see how often a busy photo matches by chance (multiples of the offset) */
const AROUND: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7071, 0.7071], [-0.7071, 0.7071], [0.7071, -0.7071], [-0.7071, -0.7071]];
/** the parts the verdict rests on: the brief's openings, roof line, deck edges, balustrade posts and glass, stair, poles */
export const KEY_PARTS = [2, 3, 4, 5, 6, 7];

export interface CheckInput {
  /** the photo or frame, any size close to the model view's shape */
  photo: Img;
  /** the model's line drawing at w × h (lines.ts: 0 = building edge) */
  line: Uint8Array;
  /** the model's part map and glass flags at w × h (lines.ts maskFrom) */
  part: Uint8Array;
  glass: Uint8Array;
  w: number;
  h: number;
  /**
   * the model's own render of the same view (the twin's normal look). When given, only the model edges this render
   * shows are scored: an edge the model's own picture does not show (dark on dark, behind glass) cannot be asked of a photo.
   */
  reference?: Img | null;
}
export interface CheckOpts { tau?: number; shift?: number; scale?: number; pct?: number; overlay?: boolean }
export interface PartScore { part: number; name: string; key: boolean; edges: number; kept: number; share: number; chance: number; score: number; status: 'kept' | 'weak' | 'drifts' | 'too few edges' }
export interface Region { x: number; y: number; w: number; h: number; part: number; name: string; edges: number; kept: number; share: number; planting: number; cause: 'changed' | 'hidden by planting' }
export interface Report {
  type: 'assembl.planstudio.geometry-check';
  verdict: 'holds' | 'drifts';
  /**
   * how much of the building's edges the photo keeps, above chance (0..1): (kept − chance) / (1 − chance), where chance
   * is how often the same edges, moved 3·tau + 2 px in eight directions, still find a photo edge
   */
  score: number;
  /** the plain share of scored model edges with a photo edge of their direction within tau */
  share: number;
  chance: number;
  /** mean distance (px) from a scored model edge to the nearest photo edge of its direction, capped at 4·tau */
  chamfer: number;
  /** share of the photo's edges on the building's solid faces that lie on a model edge (for information: texture lowers it) */
  precision: number;
  tau: number;
  align: { dx: number; dy: number; scale: number };
  size: { w: number; h: number };
  /** scored: building edges (less the cladding ribs) the model's own render shows, or all of them with no reference */
  edges: { model: number; scored: number; photo: number };
  reference: boolean;
  parts: PartScore[];
  regions: Region[];
  reasons: string[];
  limits: typeof LIMITS;
  /** the photo dimmed: scored model edges kept in green, missing in red; drifting regions boxed (RGB, w × h) */
  overlay?: Uint8Array;
}

/**
 * Thresholds, set on the sample house's opening view on 23 Nov 2026 (docs/digital-twins/PHOTO-FILM.md has the table), with
 * the twin's normal-look render as reference: a second render of the model (another build) keeps 94%; the baked-light
 * render keeps 78% overall but only 66% of the roof line and none of the deck edge above chance (its board ends and dark
 * fascia read differently); the two photos Google Gemini made keep 67% and 73%, with the stair at 65% and 71%. Every key
 * part and the building as a whole must keep 75%; 75–85% is reported as weak. The check is deliberately strict: it would
 * rather send a faithful picture to a person than pass a changed one. Without a reference the scores run lower and the
 * verdict is less reliable (looser limits, not calibrated).
 */
export const LIMITS = { score: 0.75, part: 0.75, weak: 0.85, partMinEdges: 300, scoreNoRef: 0.5, partNoRef: 0.5, regionShare: 0.5, regionMinEdges: 120 };

export function checkGeometry(I: CheckInput, o: CheckOpts = {}): Report {
  const { w, h, line, part, glass } = I, n = w * h, diag = Math.hypot(w, h);
  const tau = o.tau ?? Math.max(2, 0.0023 * diag), cap = 4 * tau, pct = o.pct ?? 0.8;
  const fit = (im: Img) => (im.w === w && im.h === h && im.ch === 3 ? im.px : resizeRGB(im, w, h));
  const rgb = fit(I.photo);
  // the building, and a band round it where its silhouette lies
  const bld = new Uint8Array(n); for (let i = 0; i < n; i++) bld[i] = isBuilding(part[i]) ? 1 : 0;
  const dB = distanceTransform(bld, w, h), roi = new Uint8Array(n); for (let i = 0; i < n; i++) roi[i] = dB[i] <= 8 ? 1 : 0;
  // model edges: black ink on a scored part (the building less the cladding ribs)
  const ink = new Uint8Array(n), medge = new Uint8Array(n);
  for (let i = 0; i < n; i++) { ink[i] = 255 - line[i]; if (line[i] < 40 && isScored(part[i])) medge[i] = 1; }
  const mth = lineTheta(ink, w, h);
  // distance transforms of a picture's edges by direction; dist(i, x, y) = nearest edge of model edge i's direction to (x, y)
  const binned = (px: Uint8Array) => {
    const E = cannyRGB(px, w, h, roi, { pct, log: true });
    const by: Float32Array[] = [];
    for (let b = 0; b < BINS; b++) { const s = new Uint8Array(n); for (let i = 0; i < n; i++) if (E.edge[i] && binOf(E.theta[i]) === b) s[i] = 1; by.push(distanceTransform(s, w, h)); }
    return { E, by, all: distanceTransform(E.edge, w, h) };
  };
  const near = (by: Float32Array[], i: number, x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return cap;
    const j = y * w + x, b = binOf(mth[i]);
    return Math.min(cap, by[(b + BINS - 1) % BINS][j], by[b][j], by[(b + 1) % BINS][j]);
  };
  const Ph = binned(rgb);
  let pts: number[] = []; for (let i = 0; i < n; i++) if (medge[i]) pts.push(i);
  const modelCount = pts.length;
  if (I.reference) {
    const R = binned(fit(I.reference));
    pts = pts.filter((i) => near(R.by, i, i % w, (i / w) | 0) <= tau);
  }
  // global alignment: a small shift and scale about the centre, by the mean capped distance of a sample of model edges
  const cx = w / 2, cy = h / 2, maxS = Math.round((o.shift ?? 0.03) * w), sc = o.scale ?? 0.04;
  const sample = pts.filter((_, k) => k % 3 === 0);
  const cost = (s: number, dx: number, dy: number) => {
    let a = 0;
    for (const i of sample) {
      const x = Math.round(cx + s * ((i % w) - cx) + dx), y = Math.round(cy + s * (((i / w) | 0) - cy) + dy);
      a += x < 0 || y < 0 || x >= w || y >= h ? cap : Math.min(cap, Ph.all[y * w + x]);
    }
    return a / Math.max(1, sample.length);
  };
  const still = { s: 1, dx: 0, dy: 0, c: cost(1, 0, 0) };
  let best = { ...still };
  for (let s = 1 - sc; s <= 1 + sc + 1e-9; s += 0.01) for (let dy = -maxS; dy <= maxS; dy += 2) for (let dx = -maxS; dx <= maxS; dx += 2) {
    const c = cost(s, dx, dy); if (c < best.c - 1e-9) best = { s, dx, dy, c };
  }
  const c0 = { ...best };
  for (let s = c0.s - 0.005; s <= c0.s + 0.005 + 1e-9; s += 0.0025) for (let dy = c0.dy - 2; dy <= c0.dy + 2; dy++) for (let dx = c0.dx - 2; dx <= c0.dx + 2; dx++) {
    const c = cost(s, dx, dy); if (c < best.c - 1e-9) best = { s, dx, dy, c };
  }
  // a move is taken only if it fits clearly better (5%): one changed part must not drag the whole picture to itself
  if (best.c > 0.95 * still.c) best = still;
  const at = (i: number, ox = 0, oy = 0) => [Math.round(cx + best.s * ((i % w) - cx) + best.dx + ox), Math.round(cy + best.s * (((i / w) | 0) - cy) + best.dy + oy)];
  // every scored edge: kept if a photo edge of its direction lies within tau; and how often it would be by chance
  const off = 3 * tau + 2;
  const kept = new Uint8Array(n);
  let sumD = 0, nk = 0, nc = 0;
  const byPart = new Map<number, { e: number; k: number; c: number }>();
  for (const i of pts) {
    const [x, y] = at(i), d = near(Ph.by, i, x, y);
    sumD += d;
    const ok = d <= tau; if (ok) { kept[i] = 1; nk++; }
    let ch = 0; for (const [ax, ay] of AROUND) { const [xx, yy] = at(i, Math.round(ax * off), Math.round(ay * off)); if (near(Ph.by, i, xx, yy) <= tau) ch++; }
    nc += ch / AROUND.length;
    const e = byPart.get(part[i]) ?? { e: 0, k: 0, c: 0 }; e.e++; if (ok) e.k++; e.c += ch / AROUND.length; byPart.set(part[i], e);
  }
  const kappa = (k: number, c: number, e: number) => { if (!e) return 0; const r = k / e, q = c / e; return q >= 1 ? 0 : Math.max(-1, (r - q) / (1 - q)); };
  const share = pts.length ? nk / pts.length : 0, chance = pts.length ? nc / pts.length : 0, score = kappa(nk, nc, pts.length);
  // precision: photo edges on the solid faces of the building (not glass, not the silhouette band), on a model edge?
  const dM = distanceTransform(medge, w, h);
  let pe = 0, pk = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const j = y * w + x; if (!Ph.E.edge[j]) continue;
    const mx = Math.round(cx + ((x - best.dx) - cx) / best.s), my = Math.round(cy + ((y - best.dy) - cy) / best.s);
    if (mx < 0 || my < 0 || mx >= w || my >= h) continue;
    const i = my * w + mx; if (!bld[i] || glass[i] || nearOutside(bld, w, h, mx, my, 3)) continue;
    pe++; if (dM[i] <= tau) pk++;
  }
  // parts
  const ref = !!I.reference, pLim = ref ? LIMITS.part : LIMITS.partNoRef, sLim = ref ? LIMITS.score : LIMITS.scoreNoRef;
  const parts: PartScore[] = [...byPart.entries()].filter(([p]) => isScored(p)).map(([p, v]) => {
    const sc2 = kappa(v.k, v.c, v.e), key = KEY_PARTS.includes(p);
    const status: PartScore['status'] = v.e < LIMITS.partMinEdges ? 'too few edges' : sc2 < pLim ? 'drifts' : sc2 < LIMITS.weak ? 'weak' : 'kept';
    return { part: p, name: PART_NAMES[p] ?? String(p), key, edges: v.e, kept: v.k, share: +(v.k / v.e).toFixed(3), chance: +(v.c / v.e).toFixed(3), score: +sc2.toFixed(3), status };
  });
  parts.sort((a, b) => Number(b.key) - Number(a.key) || a.score - b.score);
  // regions: tiles where the scored edges are mostly not found, joined up
  const T = Math.max(16, Math.round(0.04 * w)), tw = Math.ceil(w / T), th = Math.ceil(h / T);
  const te = new Int32Array(tw * th), tk = new Int32Array(tw * th);
  for (const i of pts) { const t = Math.floor((i / w) / T) * tw + Math.floor((i % w) / T); te[t]++; if (kept[i]) tk[t]++; }
  const bad = new Uint8Array(tw * th); for (let t = 0; t < tw * th; t++) if (te[t] >= T * 0.6 && tk[t] / te[t] < LIMITS.regionShare) bad[t] = 1;
  const seen = new Uint8Array(tw * th), regions: Region[] = [];
  for (let t0 = 0; t0 < tw * th; t0++) {
    if (!bad[t0] || seen[t0]) continue;
    const q = [t0]; seen[t0] = 1; const cells: number[] = [];
    while (q.length) { const t = q.pop()!; cells.push(t); const tx = t % tw, ty = (t / tw) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = tx + dx, y = ty + dy; if (x < 0 || y < 0 || x >= tw || y >= th) continue; const u = y * tw + x; if (bad[u] && !seen[u]) { seen[u] = 1; q.push(u); } } }
    let x0 = w, y0 = h, x1 = 0, y1 = 0, e = 0, k = 0, green = 0, area = 0; const miss = new Map<number, number>();
    for (const t of cells) {
      const tx = (t % tw) * T, ty = ((t / tw) | 0) * T; x0 = Math.min(x0, tx); y0 = Math.min(y0, ty); x1 = Math.max(x1, Math.min(w, tx + T)); y1 = Math.max(y1, Math.min(h, ty + T)); e += te[t]; k += tk[t];
      for (let y = ty; y < Math.min(h, ty + T); y++) for (let x = tx; x < Math.min(w, tx + T); x++) {
        const i = y * w + x;
        if (medge[i] && !kept[i]) miss.set(part[i], (miss.get(part[i]) ?? 0) + 1);
        if (!bld[i]) continue;
        const [px, py] = at(i);
        if (px < 0 || py < 0 || px >= w || py >= h) continue;
        area++; const r = rgb[(py * w + px) * 3], g = rgb[(py * w + px) * 3 + 1], b = rgb[(py * w + px) * 3 + 2];
        if (g > r + 6 && g > b + 6) green++;
      }
    }
    if (e < LIMITS.regionMinEdges) continue;
    const top = [...miss.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0, planting = area ? green / area : 0;
    regions.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, part: top, name: PART_NAMES[top] ?? String(top), edges: e, kept: k, share: +(e ? k / e : 0).toFixed(3), planting: +planting.toFixed(2), cause: planting > 0.5 ? 'hidden by planting' : 'changed' });
  }
  regions.sort((a, b) => (b.edges - b.kept) - (a.edges - a.kept));
  const pc = (v: number) => `${Math.round(v * 100)}%`;
  const reasons: string[] = [];
  if (score < sLim) reasons.push(`the photo keeps ${pc(score)} of the building's edges above chance (at least ${pc(sLim)} needed)`);
  for (const q of parts) if (q.key && q.status === 'drifts') reasons.push(`${q.name}: ${pc(q.score)} of its edges kept above chance (at least ${pc(pLim)} needed)`);
  if (Math.abs(best.dx) > 0.02 * w || Math.abs(best.dy) > 0.02 * h || Math.abs(best.s - 1) > 0.03) reasons.push(`the photo is framed differently from the model view (shift ${best.dx}, ${best.dy} px, scale ${best.s.toFixed(3)})`);
  if (!pts.length) reasons.push('no building edges to check in this view');
  const rep: Report = {
    type: 'assembl.planstudio.geometry-check', verdict: reasons.length ? 'drifts' : 'holds', score: +score.toFixed(3), share: +share.toFixed(3), chance: +chance.toFixed(3),
    chamfer: +(sumD / Math.max(1, pts.length)).toFixed(2), precision: +(pe ? pk / pe : 0).toFixed(3), tau: +tau.toFixed(2),
    align: { dx: best.dx, dy: best.dy, scale: +best.s.toFixed(4) }, size: { w, h },
    edges: { model: modelCount, scored: pts.length, photo: Ph.E.edge.reduce((a, v) => a + v, 0) }, reference: ref, parts, regions, reasons, limits: LIMITS,
  };
  if (o.overlay !== false) rep.overlay = overlay(rgb, w, h, pts, kept, regions, best);
  return rep;
}

function nearOutside(bld: Uint8Array, w: number, h: number, x: number, y: number, r: number) {
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h || !bld[yy * w + xx]) return true; }
  return false;
}

function overlay(rgb: Uint8Array, w: number, h: number, pts: number[], kept: Uint8Array, regions: Region[], a: { s: number; dx: number; dy: number }): Uint8Array {
  const out = new Uint8Array(w * h * 3);
  for (let i = 0; i < w * h; i++) { const g = 0.299 * rgb[i * 3] + 0.587 * rgb[i * 3 + 1] + 0.114 * rgb[i * 3 + 2]; out[i * 3] = out[i * 3 + 1] = out[i * 3 + 2] = 40 + g * 0.45; }
  const cx = w / 2, cy = h / 2;
  const put = (x: number, y: number, c: number[]) => { if (x < 0 || y < 0 || x >= w || y >= h) return; const j = (y * w + x) * 3; out[j] = c[0]; out[j + 1] = c[1]; out[j + 2] = c[2]; };
  for (const i of pts) {
    const x = Math.round(cx + a.s * ((i % w) - cx) + a.dx), y = Math.round(cy + a.s * (((i / w) | 0) - cy) + a.dy);
    put(x, y, kept[i] ? [60, 220, 90] : [240, 50, 50]);
  }
  for (const r of regions) {
    const c = r.cause === 'changed' ? [255, 170, 0] : [120, 200, 255];
    for (let x = r.x; x < r.x + r.w; x++) for (const y of [r.y, r.y + 1, r.y + r.h - 2, r.y + r.h - 1]) put(x, y, c);
    for (let y = r.y; y < r.y + r.h; y++) for (const x of [r.x, r.x + 1, r.x + r.w - 2, r.x + r.w - 1]) put(x, y, c);
  }
  return out;
}
