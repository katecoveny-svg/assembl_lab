// assembl capture · prepare a raw splat for the web: the steps of splat-viewer/tools/prepare_splat.py
// (v1.0.0), ported to plain JS so they run in the browser after training. Same order, same defaults,
// same manifest schema ("assembl.splatcar.manifest/1"), so the result opens in the splat-car viewer.
//
//   1 load + sanitise            2 opacity pre-filter          3 ground: lower-envelope RANSAC
//   4 level (positions, quaternions AND spherical harmonics)  5 find the subject (x–z occupancy blob)
//   6 align long axis to +X, front to +X (roofline heuristic)  7 scale from one known dimension
//   8 crop + floor removal       9 floaters (opacity, size, k-NN outliers)
//  10 SPZ within the byte budget (thin splats first, keep SH)  11 manifest   12 QA renders (RGBA)
//
// Differences from the Python tool (all deliberate, all recorded in the report):
//   · decimation is importance pruning (opacity × projected area), not splat-transform's merge;
//   · SPZ is written by spz.js (v3) instead of splat-transform; no SOG output;
//   · "object" mode (study app: rocks, shells, engines) keeps steps 3–4 and 7–9 and skips the car-only
//     parts (front heuristic, wheels/door anchors, interior entry, car tour).

import { Splats } from "./ply.js";
import { encodeSpz } from "./spz.js";
import { m3, quatFromMat3, mulberry32, gaussian, symEig, choleskySolve, DEG } from "../geom.js";

export const VERSION = "1.0.0-js";

/* ------------------------------------------------------------------ log */
class Log {
  constructor(onStep) { this.steps = []; this.t0 = performance.now(); this.onStep = onStep; }
  step(name, info = {}) {
    const st = { step: name, ...clean(info), t: +((performance.now() - this.t0) / 1000).toFixed(2) };
    this.steps.push(st);
    this.onStep?.(st);
  }
}
function clean(o) {
  const r = (v) => (typeof v === "number" ? +v.toFixed(5) : Array.isArray(v) || ArrayBuffer.isView(v) ? Array.from(v, r) : v && typeof v === "object" ? clean(v) : v);
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, r(v)]));
}
const r3 = (v) => Array.from(v, (x) => +(+x).toFixed(4));
const yieldUI = () => new Promise((res) => setTimeout(res, 0));

/* ------------------------------------------------------------ helpers */
function percentile(arr, p) {
  if (!arr.length) return NaN;
  const a = Float64Array.from(arr).sort();
  const x = (p / 100) * (a.length - 1), i = Math.floor(x), f = x - i;
  return i + 1 < a.length ? a[i] * (1 - f) + a[i + 1] * f : a[i];
}
const sigmoid = (x) => 1 / (1 + Math.exp(-x));

function alphas(s) { const a = new Float32Array(s.n); for (let i = 0; i < s.n; i++) a[i] = sigmoid(s.opacity[i]); return a; }

function medianPos(s) {
  const out = [0, 0, 0];
  for (let k = 0; k < 3; k++) { const c = new Float32Array(s.n); for (let i = 0; i < s.n; i++) c[i] = s.pos[i * 3 + k]; out[k] = percentile(c, 50); }
  return out;
}

function quatMulWxyz(a, b) {
  const [aw, ax, ay, az] = a, [bw, bx, by, bz] = b;
  return [aw * bw - ax * bx - ay * by - az * bz, aw * bx + ax * bw + ay * bz - az * by, aw * by - ax * bz + ay * bw + az * bx, aw * bz + ax * by - ay * bx + az * bw];
}

function rotBetween(a, b) {
  const na = Math.hypot(...a), nb = Math.hypot(...b);
  a = a.map((x) => x / na); b = b.map((x) => x / nb);
  const v = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const c = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  if (c < -0.999999) {
    let axis = [0, a[2], -a[1]];
    if (Math.hypot(...axis) < 1e-6) axis = [-a[2], 0, a[0]];
    return axisAngle(axis, Math.PI);
  }
  const K = m3.skew(v), K2 = m3.mul(K, K), f = 1 / (1 + c);
  return [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (i % 4 === 0 ? 1 : 0) + K[i] + K2[i] * f);
}

function axisAngle(axis, ang) {
  const n = Math.hypot(...axis), [x, y, z] = axis.map((v) => v / n), c = Math.cos(ang), s = Math.sin(ang), C = 1 - c;
  return [c + x * x * C, x * y * C - z * s, x * z * C + y * s, y * x * C + z * s, c + y * y * C, y * z * C - x * s, z * x * C - y * s, z * y * C + x * s, c + z * z * C];
}

/* ----------------------------------------- spherical-harmonic rotation */
function shBasis(d) {
  const [x, y, z] = d, xx = x * x, yy = y * y, zz = z * z;
  const C1 = 0.4886025119029199;
  const C2 = [1.0925484305920792, -1.0925484305920792, 0.31539156525252005, -1.0925484305920792, 0.5462742152960396];
  const C3 = [-0.5900435899266435, 2.890611442640554, -0.4570457994644658, 0.3731763325901154, -0.4570457994644658, 1.445305721320277, -0.5900435899266435];
  return [
    [-C1 * y, C1 * z, -C1 * x],
    [C2[0] * x * y, C2[1] * y * z, C2[2] * (2 * zz - xx - yy), C2[3] * x * z, C2[4] * (xx - yy)],
    [C3[0] * y * (3 * xx - yy), C3[1] * x * y * z, C3[2] * y * (4 * zz - xx - yy), C3[3] * z * (2 * zz - 3 * xx - 3 * yy), C3[4] * x * (4 * zz - xx - yy), C3[5] * z * (xx - yy), C3[6] * x * (xx - 3 * yy)],
  ];
}

/** Per-band A_l with c' = A_l c for an object rotated by R (least squares on random directions; exact per band). */
export function shRotationMatrices(R) {
  const rng = mulberry32(7);
  const M = 400;
  const Ys = [[], [], []], Yrs = [[], [], []];
  for (let i = 0; i < M; i++) {
    let d = [gaussian(rng), gaussian(rng), gaussian(rng)];
    const n = Math.hypot(...d); d = d.map((v) => v / n);
    const dr = m3.vec(m3.T(R), d); // Rᵀ d
    const b = shBasis(d), br = shBasis(dr);
    for (let l = 0; l < 3; l++) { Ys[l].push(b[l]); Yrs[l].push(br[l]); }
  }
  return [3, 5, 7].map((n, l) => {
    const Y = Ys[l], Yr = Yrs[l];
    const YtY = new Float64Array(n * n);
    for (const row of Y) for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) YtY[a * n + b] += row[a] * row[b];
    const A = new Float64Array(n * n);
    for (let col = 0; col < n; col++) {
      const rhs = new Float64Array(n);
      for (let i = 0; i < M; i++) for (let a = 0; a < n; a++) rhs[a] += Y[i][a] * Yr[i][col];
      const x = choleskySolve(YtY, rhs, n);
      for (let a = 0; a < n; a++) A[a * n + col] = x[a];
    }
    return A; // Y A = Yr  ⇒  c' = A c
  });
}

/** p' = scale·R·p + t; rotates quaternions and SH, adds log(scale) to log-scales. In place. */
export function applySimilarity(s, R, scale = 1, t = [0, 0, 0]) {
  const isI = R.every((v, i) => Math.abs(v - (i % 4 === 0 ? 1 : 0)) < 1e-12);
  const q = (() => { const [x, y, z, w] = quatFromMat3(R); return [w, x, y, z]; })();
  const ls = Math.log(scale);
  for (let i = 0; i < s.n; i++) {
    const p = [s.pos[i * 3], s.pos[i * 3 + 1], s.pos[i * 3 + 2]];
    const r = m3.vec(R, p);
    s.pos[i * 3] = r[0] * scale + t[0]; s.pos[i * 3 + 1] = r[1] * scale + t[1]; s.pos[i * 3 + 2] = r[2] * scale + t[2];
    if (!isI) {
      const o = quatMulWxyz(q, [s.rot[i * 4], s.rot[i * 4 + 1], s.rot[i * 4 + 2], s.rot[i * 4 + 3]]);
      s.rot.set(o, i * 4);
    }
    if (scale !== 1) { s.scale[i * 3] += ls; s.scale[i * 3 + 1] += ls; s.scale[i * 3 + 2] += ls; }
  }
  if (s.K && !isI) {
    const mats = shRotationMatrices(R), sizes = [3, 5, 7], K = s.K, tmp = new Float32Array(7);
    for (let i = 0; i < s.n; i++) for (let c = 0; c < 3; c++) {
      const base = i * 3 * K + c * K;
      let o = 0;
      for (let l = 0; l < 3; l++) {
        const n = sizes[l];
        if (o + n > K) break;
        const A = mats[l];
        for (let a = 0; a < n; a++) { let v = 0; for (let b = 0; b < n; b++) v += A[a * n + b] * s.frest[base + o + b]; tmp[a] = v; }
        for (let a = 0; a < n; a++) s.frest[base + o + a] = tmp[a];
        o += n;
      }
    }
  }
  return s;
}

/* ------------------------------------------------------ ground plane */
function fitPlaneSVD(pts) {
  const n = pts.length / 3, c = [0, 0, 0];
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) c[k] += pts[i * 3 + k] / n;
  const C = new Float64Array(9);
  for (let i = 0; i < n; i++) {
    const d = [pts[i * 3] - c[0], pts[i * 3 + 1] - c[1], pts[i * 3 + 2] - c[2]];
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) C[a * 3 + b] += d[a] * d[b];
  }
  const { vectors } = symEig(C, 3);
  return { normal: vectors[0], centroid: c };
}

/**
 * Ground as a plane through the lower envelope: for each candidate up axis, grid the area around the
 * subject, take the 3rd-lowest splat per cell, RANSAC a plane through those minima. The right axis
 * gives a flat plane under the seed with most cells on it. (prepare_splat.py: ground_from_envelope.)
 */
export function groundFromEnvelope(P, seed, rCar, rng, axes, maxTiltDeg = 40) {
  axes = axes || { "+y": [0, 1, 0], "-y": [0, -1, 0], "+z": [0, 0, 1], "-z": [0, 0, -1], "+x": [1, 0, 0], "-x": [-1, 0, 0] };
  const results = [];
  const N = P.length / 3;
  for (const [name, up] of Object.entries(axes)) {
    let e1 = Math.abs(up[0]) < 0.9 ? [0, up[2], -up[1]] : [-up[2], 0, up[0]];
    const ne = Math.hypot(...e1); e1 = e1.map((v) => v / ne);
    const e2 = [up[1] * e1[2] - up[2] * e1[1], up[2] * e1[0] - up[0] * e1[2], up[0] * e1[1] - up[1] * e1[0]];
    const win = 6 * rCar, cell = rCar / 4;
    const cells = new Map();
    for (let i = 0; i < N; i++) {
      const rx = P[i * 3] - seed[0], ry = P[i * 3 + 1] - seed[1], rz = P[i * 3 + 2] - seed[2];
      const u = rx * e1[0] + ry * e1[1] + rz * e1[2], v = rx * e2[0] + ry * e2[1] + rz * e2[2], h = rx * up[0] + ry * up[1] + rz * up[2];
      if (Math.abs(u) >= win || Math.abs(v) >= win || h >= 3 * rCar) continue;
      const key = Math.floor((u + win) / cell) * 100000 + Math.floor((v + win) / cell);
      let c = cells.get(key);
      if (!c) { c = []; cells.set(key, c); }
      c.push(h, i);
    }
    const E = [];
    for (const c of cells.values()) {
      if (c.length / 2 < 6) continue;
      const order = [];
      for (let k = 0; k < c.length; k += 2) order.push(k);
      order.sort((a, b) => c[a] - c[b]);
      const i = c[order[2] + 1];
      E.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
    }
    const m = E.length / 3;
    if (m < 50) continue;
    const thresh = 0.05 * rCar;
    let best = null;
    for (let it = 0; it < 800; it++) {
      const a = Math.floor(rng() * m) * 3, b = Math.floor(rng() * m) * 3, c = Math.floor(rng() * m) * 3;
      const ab = [E[b] - E[a], E[b + 1] - E[a + 1], E[b + 2] - E[a + 2]], ac = [E[c] - E[a], E[c + 1] - E[a + 1], E[c + 2] - E[a + 2]];
      let nrm = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
      const ln = Math.hypot(...nrm);
      if (ln < 1e-12) continue;
      nrm = nrm.map((v) => v / ln);
      if (nrm[0] * up[0] + nrm[1] * up[1] + nrm[2] * up[2] < 0) nrm = nrm.map((v) => -v);
      if (nrm[0] * up[0] + nrm[1] * up[1] + nrm[2] * up[2] < Math.cos(maxTiltDeg * DEG)) continue;
      const d = -(nrm[0] * E[a] + nrm[1] * E[a + 1] + nrm[2] * E[a + 2]);
      const hs = nrm[0] * seed[0] + nrm[1] * seed[1] + nrm[2] * seed[2] + d;
      if (!(0.15 * rCar < hs && hs < 4 * rCar)) continue;
      let cnt = 0;
      for (let k = 0; k < m; k++) if (Math.abs(nrm[0] * E[k * 3] + nrm[1] * E[k * 3 + 1] + nrm[2] * E[k * 3 + 2] + d) < thresh) cnt++;
      if (!best || cnt > best.cnt) best = { cnt, nrm, d };
    }
    if (!best) continue;
    const inl = [];
    for (let k = 0; k < m; k++) if (Math.abs(best.nrm[0] * E[k * 3] + best.nrm[1] * E[k * 3 + 1] + best.nrm[2] * E[k * 3 + 2] + best.d) < thresh) inl.push(E[k * 3], E[k * 3 + 1], E[k * 3 + 2]);
    const { normal, centroid } = fitPlaneSVD(inl);
    let n2 = normal;
    if (n2[0] * best.nrm[0] + n2[1] * best.nrm[1] + n2[2] * best.nrm[2] < 0) n2 = n2.map((v) => -v);
    const d2 = -(n2[0] * centroid[0] + n2[1] * centroid[1] + n2[2] * centroid[2]);
    let cnt = 0, ss = 0;
    for (let k = 0; k < m; k++) { const dist = n2[0] * E[k * 3] + n2[1] * E[k * 3 + 1] + n2[2] * E[k * 3 + 2] + d2; if (Math.abs(dist) < thresh) { cnt++; ss += dist * dist; } }
    results.push({ axis: name, normal: n2, d: d2, cells: m, inlierCells: cnt, fraction: cnt / m, rms: Math.sqrt(ss / Math.max(1, cnt)),
      seedHeight: n2[0] * seed[0] + n2[1] * seed[1] + n2[2] * seed[2] + d2 });
  }
  if (!results.length) return null;
  const best = results.reduce((a, b) => (b.fraction * Math.sqrt(b.inlierCells) > a.fraction * Math.sqrt(a.inlierCells) ? b : a));
  return { best, results };
}

/* ---------------------------------------- 2-D morphology (scipy-like) */
// Grids are Uint8Array(nx*nz), index i*nz + j; 4-connected cross structuring element (scipy's default).
function dilate(G, nx, nz, it = 1) {
  let a = G;
  for (let k = 0; k < it; k++) {
    const b = new Uint8Array(a.length);
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const q = i * nz + j;
      b[q] = a[q] || (i > 0 && a[q - nz]) || (i < nx - 1 && a[q + nz]) || (j > 0 && a[q - 1]) || (j < nz - 1 && a[q + 1]) ? 1 : 0;
    }
    a = b;
  }
  return a;
}
function erode(G, nx, nz, it = 1) {
  let a = G;
  for (let k = 0; k < it; k++) {
    const b = new Uint8Array(a.length);
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const q = i * nz + j;
      b[q] = a[q] && i > 0 && a[q - nz] && i < nx - 1 && a[q + nz] && j > 0 && a[q - 1] && j < nz - 1 && a[q + 1] ? 1 : 0;
    }
    a = b;
  }
  return a;
}
const closing = (G, nx, nz, it) => erode(dilate(G, nx, nz, it), nx, nz, it);
const opening = (G, nx, nz, it) => dilate(erode(G, nx, nz, it), nx, nz, it);
function label(G, nx, nz) {
  const L = new Int32Array(G.length);
  let n = 0;
  const stack = [];
  for (let q0 = 0; q0 < G.length; q0++) {
    if (!G[q0] || L[q0]) continue;
    n++; L[q0] = n; stack.push(q0);
    while (stack.length) {
      const q = stack.pop(), i = Math.floor(q / nz), j = q % nz;
      const nb = [i > 0 ? q - nz : -1, i < nx - 1 ? q + nz : -1, j > 0 ? q - 1 : -1, j < nz - 1 ? q + 1 : -1];
      for (const r of nb) if (r >= 0 && G[r] && !L[r]) { L[r] = n; stack.push(r); }
    }
  }
  return { L, n };
}
function fillHoles(G, nx, nz) {
  const outside = new Uint8Array(G.length), stack = [];
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    if (i === 0 || j === 0 || i === nx - 1 || j === nz - 1) { const q = i * nz + j; if (!G[q] && !outside[q]) { outside[q] = 1; stack.push(q); } }
  }
  while (stack.length) {
    const q = stack.pop(), i = Math.floor(q / nz), j = q % nz;
    for (const r of [i > 0 ? q - nz : -1, i < nx - 1 ? q + nz : -1, j > 0 ? q - 1 : -1, j < nz - 1 ? q + 1 : -1]) if (r >= 0 && !G[r] && !outside[r]) { outside[r] = 1; stack.push(r); }
  }
  const o = new Uint8Array(G.length);
  for (let q = 0; q < G.length; q++) o[q] = outside[q] ? 0 : 1;
  return o;
}

/** Connected occupied x–z region containing (or nearest to) the seed. P2: Float32Array of x,z pairs. */
function footprintComponent(P2, cell, seedXZ, minCount = 3) {
  const m = P2.length / 2;
  let lo0 = Infinity, lo1 = Infinity, hi0 = -Infinity, hi1 = -Infinity;
  for (let i = 0; i < m; i++) { lo0 = Math.min(lo0, P2[i * 2]); hi0 = Math.max(hi0, P2[i * 2]); lo1 = Math.min(lo1, P2[i * 2 + 1]); hi1 = Math.max(hi1, P2[i * 2 + 1]); }
  lo0 -= cell; lo1 -= cell; hi0 += cell; hi1 += cell;
  const nx = Math.max(1, Math.floor((hi0 - lo0) / cell) + 1), nz = Math.max(1, Math.floor((hi1 - lo1) / cell) + 1);
  const idx = new Int32Array(m);
  const G = new Int32Array(nx * nz);
  for (let i = 0; i < m; i++) { const q = Math.floor((P2[i * 2] - lo0) / cell) * nz + Math.floor((P2[i * 2 + 1] - lo1) / cell); idx[i] = q; G[q]++; }
  let occ = new Uint8Array(nx * nz);
  for (let q = 0; q < G.length; q++) occ[q] = G[q] >= minCount ? 1 : 0;
  occ = opening(closing(occ, nx, nz, 2), nx, nz, 1);
  const { L, n } = label(occ, nx, nz);
  if (!n) return new Uint8Array(m).fill(1);
  const si = Math.min(nx - 1, Math.max(0, Math.floor((seedXZ[0] - lo0) / cell))), sj = Math.min(nz - 1, Math.max(0, Math.floor((seedXZ[1] - lo1) / cell)));
  let target = L[si * nz + sj];
  if (!target) {
    const size = new Float64Array(n + 1), ci = new Float64Array(n + 1), cj = new Float64Array(n + 1);
    for (let q = 0; q < L.length; q++) if (L[q]) { size[L[q]]++; ci[L[q]] += Math.floor(q / nz); cj[L[q]] += q % nz; }
    let best = Infinity;
    for (let k = 1; k <= n; k++) { const d = Math.hypot(ci[k] / size[k] - si, cj[k] / size[k] - sj) / Math.sqrt(size[k]); if (d < best) { best = d; target = k; } }
  }
  const keep = new Uint8Array(m);
  for (let i = 0; i < m; i++) keep[i] = L[idx[i]] === target ? 1 : 0;
  return keep;
}

/* -------------------------------------------------- k-NN outliers */
/** Mean distance to the k nearest neighbours (excluding self), exact, via a uniform grid. */
export function knnMeanDistance(P, k = 10) {
  const n = P.length / 3;
  let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < n; i++) for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], P[i * 3 + a]); hi[a] = Math.max(hi[a], P[i * 3 + a]); }
  const ext = hi.map((h, a) => Math.max(1e-6, h - lo[a]));
  // splats lie on surfaces: aim for ~2k points per cell assuming area-like distribution
  const area = 2 * (ext[0] * ext[1] + ext[1] * ext[2] + ext[0] * ext[2]);
  let cell = Math.sqrt((area * 2 * k) / Math.max(1, n));
  cell = Math.max(cell, Math.max(...ext) / 1024);
  const dims = ext.map((e) => Math.max(1, Math.ceil(e / cell) + 1));
  const key = (x, y, z) => (x * dims[1] + y) * dims[2] + z;
  const cellOf = new Int32Array(n);
  const counts = new Map();
  for (let i = 0; i < n; i++) {
    const c = key(Math.floor((P[i * 3] - lo[0]) / cell), Math.floor((P[i * 3 + 1] - lo[1]) / cell), Math.floor((P[i * 3 + 2] - lo[2]) / cell));
    cellOf[i] = c; counts.set(c, (counts.get(c) || 0) + 1);
  }
  const start = new Map(); let acc = 0;
  for (const [c, v] of counts) { start.set(c, acc); acc += v; }
  const fill = new Map(start), order = new Int32Array(n);
  for (let i = 0; i < n; i++) { const c = cellOf[i], p = fill.get(c); order[p] = i; fill.set(c, p + 1); }
  const out = new Float32Array(n);
  const best = new Float64Array(k);
  for (let i = 0; i < n; i++) {
    const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
    const cx = Math.floor((x - lo[0]) / cell), cy = Math.floor((y - lo[1]) / cell), cz = Math.floor((z - lo[2]) / cell);
    let r = 1;
    for (;;) {
      best.fill(Infinity);
      let found = 0;
      for (let a = Math.max(0, cx - r); a <= Math.min(dims[0] - 1, cx + r); a++)
        for (let b = Math.max(0, cy - r); b <= Math.min(dims[1] - 1, cy + r); b++)
          for (let c = Math.max(0, cz - r); c <= Math.min(dims[2] - 1, cz + r); c++) {
            const kk = key(a, b, c), s0 = start.get(kk);
            if (s0 === undefined) continue;
            const s1 = s0 + counts.get(kk);
            for (let p = s0; p < s1; p++) {
              const j = order[p];
              if (j === i) continue;
              const dx = P[j * 3] - x, dy = P[j * 3 + 1] - y, dz = P[j * 3 + 2] - z, d2 = dx * dx + dy * dy + dz * dz;
              if (d2 < best[k - 1]) { let q = k - 1; while (q > 0 && best[q - 1] > d2) { best[q] = best[q - 1]; q--; } best[q] = d2; found++; }
            }
          }
      const kth = Math.sqrt(best[k - 1]);
      if ((found >= k && kth <= r * cell) || r > 10) {
        let s = 0, c = 0;
        for (let q = 0; q < k; q++) if (best[q] < Infinity) { s += Math.sqrt(best[q]); c++; }
        out[i] = c ? s / c : Infinity;
        break;
      }
      r++;
    }
  }
  return out;
}

/* --------------------------------------------------------- QA render */
/** Opacity-weighted orthographic point render (RGBA bytes), like prepare_splat.py's ortho_render. */
export function orthoRender(s, axes, lims, W = 900, bg = [255, 253, 251], minAlpha = 0.15) {
  const [a, b] = axes, [[a0, a1], [b0, b1]] = lims;
  const H = Math.max(1, Math.round((W * (b1 - b0)) / (a1 - a0)));
  const acc = new Float32Array(W * H * 3), cnt = new Float32Array(W * H);
  for (let i = 0; i < s.n; i++) {
    const al = sigmoid(s.opacity[i]);
    if (al <= minAlpha) continue;
    const pa = s.pos[i * 3 + a], pb = s.pos[i * 3 + b];
    if (!(pa > a0 && pa < a1 && pb > b0 && pb < b1)) continue;
    const u = Math.floor(((pa - a0) / (a1 - a0)) * (W - 1)), v = Math.floor(((b1 - pb) / (b1 - b0)) * (H - 1));
    const q = v * W + u;
    for (let c = 0; c < 3; c++) acc[q * 3 + c] += Math.min(1, Math.max(0, 0.5 + 0.28209479177387814 * s.fdc[i * 3 + c])) * al;
    cnt[q] += al;
  }
  const out = new Uint8ClampedArray(W * H * 4);
  for (let q = 0; q < W * H; q++) {
    for (let c = 0; c < 3; c++) out[q * 4 + c] = cnt[q] > 0 ? (acc[q * 3 + c] / cnt[q]) * 255 : bg[c];
    out[q * 4 + 3] = 255;
  }
  return { width: W, height: H, data: out };
}

/* ------------------------------------------------- decimation + SPZ */
/** Keep the `target` most important splats: opacity × projected area (exp(2/3 Σ log-scales)). */
export function pruneToCount(s, target) {
  if (target >= s.n) return s;
  const imp = new Float32Array(s.n);
  for (let i = 0; i < s.n; i++) imp[i] = sigmoid(s.opacity[i]) * Math.exp((2 / 3) * (s.scale[i * 3] + s.scale[i * 3 + 1] + s.scale[i * 3 + 2]));
  const thr = percentile(imp, 100 * (1 - target / s.n));
  const mask = new Uint8Array(s.n);
  let kept = 0;
  for (let i = 0; i < s.n && kept < target; i++) if (imp[i] > thr) { mask[i] = 1; kept++; }
  for (let i = 0; i < s.n && kept < target; i++) if (!mask[i] && imp[i] === thr) { mask[i] = 1; kept++; }
  return s.subset(mask);
}

async function compressToBudget(s, budget, log, { shMin = 1, minSplats = 350000 } = {}) {
  const attempts = [];
  let best = null;
  for (let sh = Math.min(3, s.shDegree); sh >= shMin || (sh >= 0 && s.shDegree < shMin); sh--) {
    let cur = s.withShDegree(sh);
    let bytes = await encodeSpz(cur);
    attempts.push({ sh, splats: cur.n, bytes: bytes.length });
    if (bytes.length <= budget) { best = { sh, splats: cur.n, bytes }; break; }
    let target = Math.floor((cur.n * budget * 0.97) / bytes.length);
    if (target < minSplats && sh > shMin) continue;
    for (let k = 0; k < 4; k++) {
      cur = pruneToCount(s.withShDegree(sh), target);
      bytes = await encodeSpz(cur);
      attempts.push({ sh, splats: cur.n, bytes: bytes.length, decimated: true });
      if (bytes.length <= budget) { best = { sh, splats: cur.n, bytes, splatsObj: cur }; break; }
      target = Math.floor((target * budget * 0.97) / bytes.length);
      await yieldUI();
    }
    if (best) break;
    if (sh === 0) break;
  }
  log.step("compress_spz", { attempts, chosen: best ? [best.sh, best.splats, best.bytes.length] : null, budget });
  return { best, attempts };
}

/* ------------------------------------------------------------ manifest */
const STANDARD_ANCHORS = {
  frontWheel: { u: 0.83, v: 1.0, h: 0.28, n: [0, 0, 1] }, rearWheel: { u: 0.17, v: 1.0, h: 0.28, n: [0, 0, 1] },
  headlamp: { u: 0.97, v: 0.78, h: 0.56, n: [1, 0, 0.4] }, frontCentre: { u: 1.0, v: 0.5, h: 0.42, n: [1, 0, 0] },
  bonnet: { u: 0.82, v: 0.5, h: 0.74, n: [0.3, 1, 0] }, cabin: { u: 0.45, v: 0.5, h: 0.92, n: [0, 1, 0] },
  doorMirror: { u: 0.62, v: 1.0, h: 0.7, n: [0, 0, 1] }, sideSill: { u: 0.5, v: 1.0, h: 0.18, n: [0, 0, 1] },
  tailLamp: { u: 0.02, v: 0.22, h: 0.66, n: [-1, 0, -0.4] }, boot: { u: 0.06, v: 0.5, h: 0.8, n: [-0.6, 1, 0] },
  towPoint: { u: 0.0, v: 0.5, h: 0.3, n: [-1, 0, 0] }, roof: { u: 0.38, v: 0.5, h: 1.0, n: [0, 1, 0] },
};

function snapAnchor(s, al, pt, normal, radius) {
  const nn = Math.hypot(...normal), n = normal.map((v) => v / nn);
  let best = null, bestScore = Infinity;
  for (let i = 0; i < s.n; i++) {
    if (al[i] <= 0.5) continue;
    const dx = s.pos[i * 3] - pt[0], dy = s.pos[i * 3 + 1] - pt[1], dz = s.pos[i * 3 + 2] - pt[2];
    const d = Math.hypot(dx, dy, dz);
    if (d >= radius) continue;
    const score = d - 0.6 * (dx * n[0] + dy * n[1] + dz * n[2]);
    if (score < bestScore) { bestScore = score; best = [s.pos[i * 3], s.pos[i * 3 + 1], s.pos[i * 3 + 2]]; }
  }
  return best ? [best, true] : [pt, false];
}

function fitDistance(bmin, bmax, target, azDeg, elDeg, vfovDeg = 40, aspect = 1.6, fill = 0.8) {
  const corners = [];
  for (const x of [bmin[0], bmax[0]]) for (const y of [bmin[1], bmax[1]]) for (const z of [bmin[2], bmax[2]]) corners.push([x, y, z]);
  const az = azDeg * DEG, el = elDeg * DEG;
  const back = [Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)];
  let right = [back[2], 0, -back[0]]; // cross([0,1,0], back)
  const rn = Math.hypot(...right); right = right.map((v) => v / rn);
  const up = [back[1] * right[2] - back[2] * right[1], back[2] * right[0] - back[0] * right[2], back[0] * right[1] - back[1] * right[0]];
  const ty = Math.tan((vfovDeg * DEG) / 2), tx = ty * aspect;
  let lo = 0.3, hi = 80;
  for (let it = 0; it < 50; it++) {
    const d = (lo + hi) / 2, cam = target.map((t, k) => t + back[k] * d);
    let ok = true, behind = false;
    for (const c of corners) {
      const rel = [c[0] - cam[0], c[1] - cam[1], c[2] - cam[2]];
      const zc = -(rel[0] * back[0] + rel[1] * back[1] + rel[2] * back[2]);
      if (zc <= 0.05) { behind = true; break; }
      if (Math.abs(rel[0] * right[0] + rel[1] * right[1] + rel[2] * right[2]) / zc > fill * tx || Math.abs(rel[0] * up[0] + rel[1] * up[1] + rel[2] * up[2]) / zc > fill * ty) ok = false;
    }
    if (behind) { lo = d; continue; }
    if (ok) hi = d; else lo = d;
  }
  return hi;
}
const orbitPose = (tgt, radius, azDeg, elDeg) => [tgt[0] + radius * Math.cos(elDeg * DEG) * Math.cos(azDeg * DEG), tgt[1] + radius * Math.sin(elDeg * DEG), tgt[2] + radius * Math.cos(elDeg * DEG) * Math.sin(azDeg * DEG)];

function buildManifest(o, name, s, rbMin, rbMax, fullMin, fullMax, files, log, scale, front, budget) {
  const al = alphas(s);
  const size = rbMax.map((v, k) => v - rbMin[k]);
  const centre = rbMax.map((v, k) => (v + rbMin[k]) / 2);
  const exterior = o.mode === "exterior";
  centre[1] = size[1] * (exterior ? 0.42 : 0.5);
  const radius = Math.hypot(...size) / 2;
  const fov = 40;
  const fit = fitDistance(rbMin, rbMax, centre, 35, exterior ? 14 : 22, fov, 1.6, 0.8);
  const start = orbitPose(centre, fit, 35, exterior ? 14 : 22);
  const anchors = {};
  if (exterior) {
    for (const [key, a] of Object.entries(STANDARD_ANCHORS)) {
      const pt = [rbMin[0] + a.u * size[0], rbMin[1] + a.h * size[1], rbMin[2] + a.v * size[2]];
      const [snapped, ok] = snapAnchor(s, al, pt, a.n, 0.25 * Math.max(...size));
      const nn = Math.hypot(...a.n);
      anchors[key] = { position: r3(snapped), normal: r3(a.n.map((v) => v / nn)), snapped: ok };
    }
  }
  const seatSide = o.interiorSeat === "left" ? -1 : 1;
  let interior;
  if (exterior) {
    const eye = [centre[0] - 0.02 * size[0], Math.max(0.82, 0.8 * size[1]), seatSide * Math.min(0.36, 0.22 * size[2])];
    const door = [eye[0] + 0.15, eye[1] + 0.05, seatSide * (size[2] / 2 + 0.9)];
    const look = [eye[0] + 2, eye[1] - 0.12, eye[2]];
    let cab = 0;
    for (let i = 0; i < s.n; i++) if (Math.abs(s.pos[i * 3] - eye[0]) < 0.5 && Math.abs(s.pos[i * 3 + 2]) < 0.5 && s.pos[i * 3 + 1] > 0.35 && s.pos[i * 3 + 1] < eye[1] + 0.1 && al[i] > 0.5) cab++;
    interior = { available: false, splatUrl: null, reason: "Exterior-only capture. The cabin is not captured from inside; a separate doors-open interior pass is needed.",
      cabinSplatsInVolume: cab, entry: { door: r3(door), eye: r3(eye), lookAt: r3(look), fovDeg: 70 }, seatSide: o.interiorSeat || "right",
      align: { offset: r3([eye[0] + 0.3, 0.62, 0]), yawDeg: 0, status: "Requires validation" } };
  } else {
    interior = { available: false, splatUrl: null, reason: o.mode === "object" ? "Object capture: no interior." : "Interior capture.", entry: null };
  }
  let tour = [];
  if (exterior) {
    const tgtH = size[1] * 0.45;
    const stop = (id, title, hotspot, az, el, dist, target) => {
      const tgt = target || [centre[0], tgtH, centre[2]];
      const d = dist === "fit" ? fitDistance(rbMin, rbMax, tgt, az, el, fov, 1.6, 0.84) : dist;
      const pos = orbitPose(tgt, d, az, el);
      pos[1] = Math.max(pos[1], 0.25);
      return { id, title, hotspot, camera: { position: r3(pos), target: r3(tgt), fovDeg: fov } };
    };
    const at = (k, fb) => (anchors[k] ? anchors[k].position : fb);
    const [Lc, Hc, Wc] = size;
    tour = [
      stop("overview", "First look", "powertrain", 35, 14, "fit"),
      stop("front", "Front and lights", "safety", 8, 9, 1.15 * Wc + 1.6, [Lc * 0.3, tgtH * 0.95, 0]),
      stop("profile", "Profile and size", "dimensions", 90, 5, "fit"),
      stop("wheels", "Wheels and tyres", "wheels", 68, 6, 1.7, at("frontWheel", [Lc * 0.33, 0.3, Wc / 2])),
      stop("cabin", "Cabin and tech", "tech", 125, 50, 2.6, at("cabin", [0, Hc * 0.85, 0])),
      stop("rear", "Rear three-quarter", "economy", 148, 12, "fit"),
      stop("boot", "Boot and towing", "boot", 182, 24, 2.4, at("boot", [-Lc * 0.44, Hc * 0.75, 0])),
      stop("warranty", "Ownership", "warranty", 240, 16, "fit"),
    ];
  }
  return {
    schema: "assembl.splatcar.manifest/1",
    id: name,
    createdAt: new Date().toISOString().replace(/\.\d+Z$/, "+00:00"),
    generator: `assembl capture prepare.js ${VERSION} (port of prepare_splat.py 1.0.0)`,
    mode: o.mode,
    units: "metres",
    axes: exterior ? { up: "+y", front: "+x", right: "+z", note: "car faces +X; ground plane is y = 0" } : { up: "+y", front: "+x", right: "+z", note: "longest side along X; resting surface is y = 0" },
    ground: { y: 0 },
    scale: { factor: +scale.toFixed(6), basis: o.lengthM ? (exterior ? "overall length from spec sheet" : "longest side entered by the user") : null, specLengthM: o.lengthM || null, metric: !!o.metric },
    bounds: { min: r3(rbMin), max: r3(rbMax), fullMin: r3(fullMin), fullMax: r3(fullMax), centre: r3(rbMin.map((v, k) => (v + rbMax[k]) / 2)), size: r3(size) },
    measured: { lengthM: +size[0].toFixed(3), widthM: +size[2].toFixed(3), heightM: +size[1].toFixed(3),
      note: "robust 0.3–99.7 percentile extents of solid splats; height is above the fitted ground plane" + (exterior ? "; width includes mirrors" : ""),
      specWidthM: o.widthM || null, specHeightM: o.heightM || null },
    camera: { start: { position: r3(start), target: r3(centre), fovDeg: fov },
      orbit: { minDistance: +(radius * 0.55 + (exterior ? 0.6 : 0.05)).toFixed(3), maxDistance: +(fit * 2.2).toFixed(3), minPolarDeg: exterior ? 20 : 8, maxPolarDeg: exterior ? 86 : 88, targetMinY: exterior ? 0.15 : 0 } },
    interior, anchors, tour, files,
    splatCount: s.n, budgetBytes: budget,
    steps: log.steps.map((x) => x.step),
  };
}

/* ------------------------------------------------ subject from cameras */
/**
 * The point closest (least squares) to every camera's optical axis: in a walk-round or an object ring all
 * cameras look at the subject, so this is a far better seed than the median of all splats (which sits on
 * the table in a table-top scene). frames: Nerfstudio frames (row-major camera-to-world, OpenGL axes).
 */
export function subjectFromCameras(frames, mode = "exterior") {
  const seed = seedFromCameras(frames);
  if (!seed) return {};
  const d = frames.map((f) => { const M = f.transform_matrix; return Math.hypot(M[0][3] - seed[0], M[1][3] - seed[1], M[2][3] - seed[2]); }).sort((a, b) => a - b);
  const dCam = d[Math.floor(d.length / 2)];
  // an object on a table fills roughly the middle third of the frame: radius ≈ 0.4 × camera distance
  return { seed, cameraDistance: dCam, subjectRadius: mode === "object" ? 0.4 * dCam : undefined };
}

export function seedFromCameras(frames) {
  const A = new Float64Array(9), b = [0, 0, 0];
  let n = 0;
  for (const f of frames) {
    const M = f.transform_matrix;
    const c = [M[0][3], M[1][3], M[2][3]];
    let d = [-M[0][2], -M[1][2], -M[2][2]];           // camera looks down −Z
    const dn = Math.hypot(...d); d = d.map((v) => v / dn);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      const P = (i === j ? 1 : 0) - d[i] * d[j];
      A[i * 3 + j] += P; b[i] += P * c[j];
    }
    n++;
  }
  if (n < 2) return null;
  const x = choleskySolve(A, b, 3);
  return x ? Array.from(x) : null;
}

/* ------------------------------------------------------------ main */
/**
 * prepareSplat(splats, options) → { splats, spz (Uint8Array), manifest, report, qa: {top, side, front} }
 *
 * options: {
 *   name, mode: "exterior" | "object" | "interior",
 *   lengthM          known overall length (car spec) or the object's longest side, metres
 *   widthM, heightM  spec figures for the report only
 *   metric           input already metric (WebXR); length then only checks, applied beyond scaleTolerance
 *   up: "auto" | "+y" | …   (WebXR and the attitude-levelled pose solver give +y)
 *   front: "auto" | "+x" | "-x", yawDeg, seed: [x,y,z], subjectRadius (source units; see subjectFromCameras)
 *   cropMarginM, floorCutM, flatFloorM, minOpacity, maxSizeM, outlierK, outlierStd
 *   budgetMB (default 8 exterior / 5 interior / 3 object), shMin, minSplats
 *   onStep(step)     progress callback
 * }
 */
export async function prepareSplat(input, opts = {}) {
  const o = {
    mode: "exterior", name: "capture", metric: false, scaleTolerance: 0.03, up: "auto", front: "auto", yawDeg: 0,
    cropMarginM: null, floorCutM: null, flatFloorM: null, minOpacity: 0.06, maxSizeM: null, outlierK: 10, outlierStd: 3.0,
    budgetMB: null, shMin: 1, minSplats: null, interiorSeat: "right", ...opts,
  };
  const exterior = o.mode === "exterior", object = o.mode === "object";
  // object mode works at table-top scale: margins and size limits relative to the object
  const unit = object && o.lengthM ? o.lengthM : 1;
  o.cropMarginM ??= exterior ? 0.12 : 0.08 * unit;
  o.floorCutM ??= exterior ? 0.015 : 0.004 * unit;
  o.flatFloorM ??= exterior ? 0.08 : 0.03 * unit;
  o.maxSizeM ??= exterior ? 0.3 : 0.25 * unit;
  o.minSplats ??= exterior ? 350000 : 120000;
  const budget = Math.round((o.budgetMB ?? (exterior ? 8 : o.mode === "interior" ? 5 : 3)) * 1e6);
  const log = new Log(o.onStep);
  const rng = mulberry32(3);

  // 1. load + sanitise ------------------------------------------------------------
  let s = input;
  const n0 = s.n;
  const fin = new Uint8Array(s.n);
  for (let i = 0; i < s.n; i++) {
    let ok = Number.isFinite(s.opacity[i]);
    for (let k = 0; k < 3 && ok; k++) ok = Number.isFinite(s.pos[i * 3 + k]) && Number.isFinite(s.scale[i * 3 + k]) && Number.isFinite(s.fdc[i * 3 + k]);
    const rn = Math.hypot(s.rot[i * 4], s.rot[i * 4 + 1], s.rot[i * 4 + 2], s.rot[i * 4 + 3]);
    fin[i] = ok && rn > 1e-8 ? 1 : 0;
  }
  s = s.subset(fin);
  for (let i = 0; i < s.n; i++) { const rn = Math.hypot(s.rot[i * 4], s.rot[i * 4 + 1], s.rot[i * 4 + 2], s.rot[i * 4 + 3]); for (let k = 0; k < 4; k++) s.rot[i * 4 + k] /= rn; }
  log.step("load", { splats: n0, finite: s.n, sh_degree: s.shDegree });

  // 2. opacity pre-filter -------------------------------------------------------------
  let al = alphas(s);
  { const keep = al.map((a) => (a >= o.minOpacity ? 1 : 0)); const before = s.n; s = s.subset(keep); log.step("opacity_prefilter", { kept: s.n, removed: before - s.n, min_opacity: o.minOpacity }); }
  al = alphas(s);
  await yieldUI();

  let scale = 1, front = o.front, rbMin, rbMax, L = null;
  if (o.mode !== "interior") {
    // 3. ground plane ---------------------------------------------------------------
    const dense = [];
    for (let i = 0; i < s.n; i++) if (al[i] > 0.35) dense.push(i);
    let sample = dense;
    if (sample.length > 400000) { sample = []; for (let k = 0; k < 400000; k++) sample.push(dense[Math.floor(rng() * dense.length)]); }
    const seed = o.seed || medianPos(s);
    const dist = sample.map((i) => Math.hypot(s.pos[i * 3] - seed[0], s.pos[i * 3 + 1] - seed[1], s.pos[i * 3 + 2] - seed[2]));
    // subject radius: from the cameras when the host knows it (object rings), else prepare_splat.py's
    // heuristic (22nd percentile of dense-splat distances from the seed), which assumes the subject dominates
    const rCar = o.subjectRadius || percentile(dist, 22);
    const sel = [];
    for (let i = 0; i < s.n; i++) if (al[i] > 0.2) sel.push(s.pos[i * 3], s.pos[i * 3 + 1], s.pos[i * 3 + 2]);
    const axes = o.up === "auto" ? undefined : { [o.up]: { "+x": [1, 0, 0], "-x": [-1, 0, 0], "+y": [0, 1, 0], "-y": [0, -1, 0], "+z": [0, 0, 1], "-z": [0, 0, -1] }[o.up] };
    // a known up axis (WebXR, or poses levelled with the phone's gravity) allows only a nearly level ground
    const res = groundFromEnvelope(Float32Array.from(sel), seed, rCar, rng, axes, axes ? 6 : 40);
    if (!res) throw new Error("Ground plane not found. Pass up: '+y' (phone captures) or a seed point on the subject.");
    const { best, results } = res;
    log.step("ground_plane", { method: "lower-envelope RANSAC", axis: best.axis, normal: best.normal, inlier_cells: best.inlierCells, cells: best.cells,
      rms_src_units: best.rms, seed, seed_height_src: best.seedHeight, r_car: rCar, candidates: results.map((r) => ({ axis: r.axis, fraction: +r.fraction.toFixed(3), inlierCells: r.inlierCells })) });
    await yieldUI();

    // 4. level ----------------------------------------------------------------------
    const Rl = rotBetween(best.normal, [0, 1, 0]);
    applySimilarity(s, Rl, 1, [0, best.d, 0]);
    const cl = m3.vec(Rl, seed); cl[1] += best.d;
    log.step("level", { rotation_quat_wxyz: (() => { const [x, y, z, w] = quatFromMat3(Rl); return [w, x, y, z]; })(), ground_y: 0, dense_centre_levelled: cl });
    await yieldUI();

    // 5. find the subject -------------------------------------------------------------
    al = alphas(s);
    const sceneScale = rCar;
    const hmaxGuess = Math.max(cl[1] * 6, 3.5 * sceneScale), win = 10 * sceneScale;
    // skip the bottom of the subject so ground/table texture can't bridge it to its surroundings
    const minBodyY = Math.max(0.3 * cl[1], object ? 0.05 * sceneScale : 0);
    const bodyIdx = [];
    for (let i = 0; i < s.n; i++) {
      const x = s.pos[i * 3], y = s.pos[i * 3 + 1], z = s.pos[i * 3 + 2];
      if (al[i] > 0.25 && y > minBodyY && y < hmaxGuess && Math.abs(x - cl[0]) < win && Math.abs(z - cl[2]) < win) bodyIdx.push(i);
    }
    const P2 = new Float32Array(bodyIdx.length * 2);
    bodyIdx.forEach((i, k) => { P2[k * 2] = s.pos[i * 3]; P2[k * 2 + 1] = s.pos[i * 3 + 2]; });
    const cell = Math.max(sceneScale / 8, 1e-4);
    const comp = footprintComponent(P2, cell, [cl[0], cl[2]], 3);
    let car = [];
    bodyIdx.forEach((i, k) => { if (comp[k]) car.push(s.pos[i * 3], s.pos[i * 3 + 1], s.pos[i * 3 + 2]); });
    car = Float32Array.from(car);
    log.step("segment_subject", { candidates: bodyIdx.length, subject_points: car.length / 3, grid_cell: cell });
    if (car.length < 30) throw new Error("Could not find the subject in the splat (too few points above the ground)");

    // 6. align long axis to X, front to +X ---------------------------------------------------
    const m = car.length / 3;
    const xs = new Float32Array(m), zs = new Float32Array(m);
    for (let i = 0; i < m; i++) { xs[i] = car[i * 3]; zs[i] = car[i * 3 + 2]; }
    const cxz = [percentile(xs, 50), percentile(zs, 50)];
    let sxx = 0, sxz = 0, szz = 0;
    for (let i = 0; i < m; i++) { const a = xs[i] - cxz[0], b = zs[i] - cxz[1]; sxx += a * a; sxz += a * b; szz += b * b; }
    const { vectors } = symEig([sxx, sxz, sxz, szz], 2);
    const longDir = vectors[1];
    const yaw = Math.atan2(longDir[1], longDir[0]);
    const Ry = axisAngle([0, 1, 0], yaw);
    const tc = m3.vec(Ry, [cxz[0], 0, cxz[1]]).map((v) => -v);
    applySimilarity(s, Ry, 1, tc);
    const applyToCar = (R, t = [0, 0, 0], sc = 1) => { for (let i = 0; i < m; i++) { const r = m3.vec(R, [car[i * 3], car[i * 3 + 1], car[i * 3 + 2]]); car[i * 3] = r[0] * sc + t[0]; car[i * 3 + 1] = r[1] * sc + t[1]; car[i * 3 + 2] = r[2] * sc + t[2]; } };
    applyToCar(Ry, tc);
    let frontAuto = "+x", hA = 0, hB = 0;
    if (exterior) {
      for (let i = 0; i < m; i++) xs[i] = car[i * 3];
      const lo = percentile(xs, 0.5), hi = percentile(xs, 99.5), Lu = hi - lo;
      const endA = [], endB = [];
      for (let i = 0; i < m; i++) { if (car[i * 3] > hi - 0.18 * Lu) endA.push(car[i * 3 + 1]); if (car[i * 3] < lo + 0.18 * Lu) endB.push(car[i * 3 + 1]); }
      hA = endA.length ? percentile(endA, 95) : 0; hB = endB.length ? percentile(endB, 95) : 0;
      frontAuto = hA <= hB ? "+x" : "-x";
    }
    front = o.front === "auto" ? frontAuto : o.front;
    if (front === "-x") { const Rf = axisAngle([0, 1, 0], Math.PI); applySimilarity(s, Rf); applyToCar(Rf); }
    if (o.yawDeg) { const Re = axisAngle([0, 1, 0], o.yawDeg * DEG); applySimilarity(s, Re); applyToCar(Re); }
    log.step("align", { yaw_deg: yaw / DEG, front_auto: exterior ? frontAuto : "n/a (object)", front_used: front, end_heights: [hA, hB], extra_yaw_deg: o.yawDeg });
    await yieldUI();

    // 7. scale to metres -------------------------------------------------------------------
    for (let i = 0; i < m; i++) xs[i] = car[i * 3];
    let lox = percentile(xs, 0.2), hix = percentile(xs, 99.8);
    const Lunits = hix - lox;
    let note = "not scaled (no known length)";
    if (o.lengthM) {
      const need = o.lengthM / Lunits;
      if (o.metric && Math.abs(need - 1) <= o.scaleTolerance) note = `metric input; measured length ${Lunits.toFixed(3)} m within ${(o.scaleTolerance * 100).toFixed(0)}% of ${o.lengthM} m — kept`;
      else { scale = need; note = `scaled ×${scale.toFixed(5)} so measured length ${Lunits.toFixed(4)} → ${o.lengthM} m`; }
    }
    for (let i = 0; i < m; i++) zs[i] = car[i * 3 + 2];
    const xm = (lox + hix) / 2, zm = (percentile(zs, 0.2) + percentile(zs, 99.8)) / 2;
    const ts = [-xm * scale, 0, -zm * scale];
    applySimilarity(s, m3.I(), scale, ts);
    applyToCar(m3.I(), ts, scale);
    log.step("scale", { measured_length_src: Lunits, scale, note });

    // 8. crop ---------------------------------------------------------------------------------
    for (let i = 0; i < m; i++) { xs[i] = car[i * 3]; zs[i] = car[i * 3 + 2]; }
    const ys = new Float32Array(m); for (let i = 0; i < m; i++) ys[i] = car[i * 3 + 1];
    L = percentile(xs, 99.8) - percentile(xs, 0.2);
    const Wd = percentile(zs, 99.8) - percentile(zs, 0.2), Ht = percentile(ys, 99.7);
    const mg = o.cropMarginM;
    let bmin = [-L / 2 - mg, o.floorCutM, -Wd / 2 - mg], bmax = [L / 2 + mg, Ht + mg, Wd / 2 + mg];
    if (o.cropBox) { bmin = o.cropBox.slice(0, 3); bmax = o.cropBox.slice(3); bmin[1] = Math.max(bmin[1], o.floorCutM); }
    {
      const keep = new Uint8Array(s.n);
      for (let i = 0; i < s.n; i++) { let ok = true; for (let k = 0; k < 3; k++) { const v = s.pos[i * 3 + k]; if (v < bmin[k] || v > bmax[k]) ok = false; } keep[i] = ok ? 1 : 0; }
      const before = s.n; s = s.subset(keep);
      log.step("crop", { shape: "box", box_min: bmin, box_max: bmax, kept: s.n, removed: before - s.n });
    }
    // footprint-aware floor removal: low splats only where the subject itself is (plan silhouette + margin)
    {
      al = alphas(s);
      const cellM = exterior ? 0.02 : 0.01 * unit;
      const lowH = exterior ? 0.1 : 0.05 * unit, hiH = exterior ? 0.15 : 0.08 * unit;
      const nx = Math.floor((bmax[0] - bmin[0]) / cellM) + 2, nz = Math.floor((bmax[2] - bmin[2]) / cellM) + 2;
      const ij = new Int32Array(s.n);
      let G = new Uint8Array(nx * nz);
      for (let i = 0; i < s.n; i++) {
        const a = Math.min(nx - 1, Math.max(0, Math.floor((s.pos[i * 3] - bmin[0]) / cellM))), b = Math.min(nz - 1, Math.max(0, Math.floor((s.pos[i * 3 + 2] - bmin[2]) / cellM)));
        ij[i] = a * nz + b;
        if (s.pos[i * 3 + 1] > hiH && al[i] > 0.3) G[a * nz + b] = 1;
      }
      let sil = fillHoles(closing(G, nx, nz, 3), nx, nz);
      sil = dilate(sil, nx, nz, 2);
      const keep = new Uint8Array(s.n);
      let removed = 0, cells = 0;
      for (let q = 0; q < sil.length; q++) cells += sil[q];
      for (let i = 0; i < s.n; i++) { const drop = s.pos[i * 3 + 1] < lowH && !sil[ij[i]]; keep[i] = drop ? 0 : 1; removed += drop ? 1 : 0; }
      s = s.subset(keep);
      log.step("floor_outside_silhouette", { removed, low_height_m: lowH, silhouette_cells: cells, cell_m: cellM });
    }
    // road / table and shadow under the subject: flat, horizontal discs near the ground
    {
      const keep = new Uint8Array(s.n).fill(1);
      let removed = 0;
      for (let i = 0; i < s.n; i++) {
        if (s.pos[i * 3 + 1] >= o.flatFloorM) continue;
        const [w, x, y, z] = [s.rot[i * 4], s.rot[i * 4 + 1], s.rot[i * 4 + 2], s.rot[i * 4 + 3]];
        const sc = [Math.exp(s.scale[i * 3]), Math.exp(s.scale[i * 3 + 1]), Math.exp(s.scale[i * 3 + 2])];
        const kmin = sc[0] <= sc[1] && sc[0] <= sc[2] ? 0 : sc[1] <= sc[2] ? 1 : 2;
        // y component of the local axis kmin (column kmin of the rotation matrix)
        const ny = [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)][kmin];
        const smax = Math.max(...sc), smin = Math.min(...sc);
        if (Math.abs(ny) > 0.85 && smax > 3 * smin && 2 * smax > (exterior ? 0.015 : 0.004 * unit)) { keep[i] = 0; removed++; }
      }
      s = s.subset(keep);
      log.step("flat_floor_splats", { removed, below_m: o.flatFloorM });
    }
  } else {
    const Rl = rotBetween({ "+y": [0, 1, 0], "-y": [0, -1, 0], "+z": [0, 0, 1], "-z": [0, 0, -1] }[o.up === "auto" ? "+y" : o.up] || [0, 1, 0], [0, 1, 0]);
    applySimilarity(s, Rl);
    const c = medianPos(s);
    applySimilarity(s, m3.I(), 1, c.map((v) => -v));
    const keep = new Uint8Array(s.n);
    for (let i = 0; i < s.n; i++) keep[i] = Math.hypot(s.pos[i * 3], s.pos[i * 3 + 1], s.pos[i * 3 + 2]) < 1.6 ? 1 : 0;
    s = s.subset(keep);
    log.step("interior_crop", { centre: c, radius_m: 1.6, kept: s.n });
  }
  await yieldUI();

  // 9. floaters --------------------------------------------------------------------------------
  {
    al = alphas(s);
    const keep = new Uint8Array(s.n);
    let removedSize = 0;
    for (let i = 0; i < s.n; i++) {
      const size = 2 * Math.exp(Math.max(s.scale[i * 3], s.scale[i * 3 + 1], s.scale[i * 3 + 2]));
      keep[i] = size < o.maxSizeM && al[i] >= o.minOpacity ? 1 : 0;
      removedSize += keep[i] ? 0 : 1;
    }
    s = s.subset(keep);
    let removedKnn = 0;
    if (s.n > o.outlierK + 1) {
      const md = knnMeanDistance(s.pos, o.outlierK);
      const lmd = Array.from(md, (v) => Math.log(v + 1e-9));
      // statistics over finite values only: a splat with no neighbours in reach is an outlier by definition
      let cnt = 0, sum = 0, sq = 0;
      for (const v of lmd) if (Number.isFinite(v)) { cnt++; sum += v; sq += v * v; }
      const mean = sum / Math.max(1, cnt);
      const sd = Math.sqrt(Math.max(0, sq / Math.max(1, cnt) - mean * mean));
      const thr = mean + o.outlierStd * sd;
      const k2 = Uint8Array.from(lmd, (v) => (Number.isFinite(v) && v < thr ? 1 : 0));
      removedKnn = k2.reduce((a, b) => a + (1 - b), 0);
      s = s.subset(k2);
    }
    log.step("floaters", { removed_oversize: removedSize, removed_knn: removedKnn, kept: s.n, max_size_m: o.maxSizeM, knn: o.outlierK, std: o.outlierStd });
  }
  await yieldUI();

  // robust bounds -------------------------------------------------------------------------------
  al = alphas(s);
  const solid = [[], [], []];
  for (let i = 0; i < s.n; i++) if (al[i] > 0.4) for (let k = 0; k < 3; k++) solid[k].push(s.pos[i * 3 + k]);
  rbMin = solid.map((c) => percentile(c, 0.3)); rbMax = solid.map((c) => percentile(c, 99.7));
  const fullMin = [0, 1, 2].map((k) => { let v = Infinity; for (let i = 0; i < s.n; i++) v = Math.min(v, s.pos[i * 3 + k]); return v; });
  const fullMax = [0, 1, 2].map((k) => { let v = -Infinity; for (let i = 0; i < s.n; i++) v = Math.max(v, s.pos[i * 3 + k]); return v; });
  if (o.mode !== "interior") rbMin[1] = 0;

  // 10. compress -----------------------------------------------------------------------------------
  const { best, attempts } = await compressToBudget(s, budget, log, { shMin: o.shMin, minSplats: o.minSplats });
  const spz = best ? best.bytes : null;
  const shipped = best?.splatsObj || (best ? s.withShDegree(best.sh) : s);
  const files = {};
  if (spz) files.spz = { url: `${o.name}.spz`, bytes: spz.length, withinBudget: true, shBands: best.sh, splats: best.splats, attempts };
  else files.spz = { url: null, bytes: null, withinBudget: false, attempts };

  // 11. manifest -------------------------------------------------------------------------------------
  const manifest = buildManifest(o, o.name, s, rbMin, rbMax, fullMin, fullMax, files, log, scale, front, budget);
  log.step("manifest", { id: o.name });

  // 12. QA renders --------------------------------------------------------------------------------------
  const pad = exterior ? 0.4 : 0.15 * (L || 1);
  const lx = [rbMin[0] - pad, rbMax[0] + pad], lz = [rbMin[2] - pad, rbMax[2] + pad], ly = [-0.1 * (exterior ? 1 : L || 1), rbMax[1] + pad];
  const qa = { top: orthoRender(s, [0, 2], [lx, lz]), side: orthoRender(s, [0, 1], [lx, ly]) };
  const fr = s.subset(Uint8Array.from({ length: s.n }, (_, i) => (s.pos[i * 3] > 0 ? 1 : 0)));
  for (let i = 0; i < fr.n; i++) fr.pos[i * 3 + 2] *= -1;
  qa.front = orthoRender(fr, [2, 1], [[-lz[1], -lz[0]], ly], 600);
  log.step("qa_renders", {});

  const report = { tool: `prepare.js ${VERSION}`, options: Object.fromEntries(Object.entries(o).filter(([k]) => k !== "onStep")), steps: log.steps };
  return { splats: shipped, cleaned: s, spz, manifest, report, qa };
}
