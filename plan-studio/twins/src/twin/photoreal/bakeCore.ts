// The light bake's kernel: traces sky and sun light through the model's real geometry and returns, per surface sample
// point, the irradiance from the sky and every bounce (direct sun is left out: the live view draws it with a sharp
// shadow map) and the mean direction that light arrives from. No three.js and no DOM, so the same code runs in a web
// worker, on the page and in node (tests/photoreal). Every sample draws its random numbers from its own index, so the
// result does not depend on how the work is split between workers: the same scene always bakes to the same numbers.
//
// Method after "room-at-dawn" by Leon Lin (MIT, https://github.com/leonxlnx/room-at-dawn, src/bake/worker.js and
// baker.js): a first pass of full paths at a few samples, smoothed over the mesh, then a final gather that reads the
// first pass where its rays land; edge-aware smoothing; samples buried in other geometry repaired from neighbours.
// Changed here for a building in daylight: the sun is a real light with next-event estimation at every path vertex
// (soft-edged, from a sun disc), the sky is the page's own sky picture, glass and foliage let light through by a
// probability, and the stored light excludes the direct sun.
//
// MIT notice for the parts adapted from room-at-dawn:
//   Copyright (c) 2026 Leon Lin. Permission is hereby granted, free of charge, to any person obtaining a copy of this
//   software and associated documentation files (the "Software"), to deal in the Software without restriction,
//   including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
//   copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following
//   conditions: The above copyright notice and this permission notice shall be included in all copies or substantial
//   portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.

import { BVH, type Hit } from './bvh.ts';

/** per material: albedo r g b, pass-through probability, flags (1 = two-sided, 2 = no light cache: shade on the fly) */
export const MS = 5;

export interface SkyMap {
  w: number;
  h: number;
  /** linear RGB radiance, equirectangular in three.js's convention: u = atan2(z, x) / 2π + 0.5, v = asin(y) / π + 0.5, row 0 = straight down */
  data: Float32Array;
}
export interface Sun {
  /** unit direction towards the sun */
  dir: [number, number, number];
  /** irradiance on a surface square to the sun, linear RGB */
  E: [number, number, number];
  /** angular radius of the disc the shadow rays sample, radians (softens shadow edges) */
  radius: number;
}
export interface BakeScene {
  bvh: BVH;
  mats: Float32Array;
  sky: SkyMap;
  sun: Sun;
  /** per ordered triangle corner: the sample whose light it carries (front side), −1 for none */
  triSample: Int32Array;
  /** the same for the back side of two-sided triangles */
  triSampleB: Int32Array;
  maxDepth: number;
  seed: number;
}

/** out record per sample */
export const OUT = 10; // Er Eg Eb (sky + bounce), Dx Dy Dz (mean direction), valid, Sr Sg Sb (direct sun)

// ---- random numbers: a per-sample stream (mulberry32 seeded by a hash of index and pass) ----
let rs = 1;
function seedRng(i: number, pass: number, seed: number) {
  let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(pass + 1, 0xc2b2ae35) ^ seed;
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15; h = Math.imul(h, 0x846ca68b); h ^= h >>> 16;
  rs = h | 0;
}
function rnd() {
  rs = (rs + 0x6d2b79f5) | 0;
  let t = Math.imul(rs ^ (rs >>> 15), 1 | rs);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const halton = (i: number, b: number) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };

const INV_PI = 1 / Math.PI;
const EPS = 4e-4;

export class Tracer {
  S: BakeScene;
  private hit: Hit = { t: 0, tri: 0, u: 0, v: 0 };
  private nrm = new Float32Array(3);
  cache: Float32Array | null = null; // per sample: total irradiance (sky + bounce + direct sun), RGB
  private sk = [0, 0, 0];
  private H2: Float32Array = new Float32Array(0);
  private H3: Float32Array = new Float32Array(0);
  constructor(S: BakeScene) { this.S = S; }

  sky(dx: number, dy: number, dz: number) {
    const s = this.S.sky;
    const u = (Math.atan2(dz, dx) / (2 * Math.PI) + 0.5) * s.w - 0.5;
    const v = (Math.asin(Math.max(-1, Math.min(1, dy))) / Math.PI + 0.5) * s.h - 0.5;
    const x0 = Math.floor(u), y0 = Math.max(0, Math.min(s.h - 1, Math.floor(v)));
    const fx = u - x0, fy = Math.max(0, Math.min(1, v - y0));
    const xa = ((x0 % s.w) + s.w) % s.w, xb = (xa + 1) % s.w, y1 = Math.min(s.h - 1, y0 + 1);
    const D = s.data, a = (y0 * s.w + xa) * 3, b = (y0 * s.w + xb) * 3, c = (y1 * s.w + xa) * 3, d = (y1 * s.w + xb) * 3;
    for (let k = 0; k < 3; k++) this.sk[k] = (D[a + k] * (1 - fx) + D[b + k] * fx) * (1 - fy) + (D[c + k] * (1 - fx) + D[d + k] * fx) * fy;
  }

  /** transmission (0..1) along a ray towards the sun: glass and foliage pass some light, anything else blocks */
  private shadow(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number) {
    const B = this.S.bvh, M = this.S.mats, h = this.hit;
    let T = 1;
    for (let k = 0; k < 8; k++) {
      if (!B.intersect(ox, oy, oz, dx, dy, dz, 1e5, h, true)) return T;
      const thru = M[B.mat[h.tri] * MS + 3];
      if (thru <= 0) return 0;
      T *= thru; if (T < 0.02) return 0;
      ox += dx * (h.t + EPS); oy += dy * (h.t + EPS); oz += dz * (h.t + EPS);
    }
    return 0;
  }

  /** direct sun irradiance (cosine-weighted, visibility from a jittered point on the sun disc) at a point */
  private sunAt(px: number, py: number, pz: number, nx: number, ny: number, nz: number, r1: number, r2: number) {
    const s = this.S.sun;
    let dx = s.dir[0], dy = s.dir[1], dz = s.dir[2];
    // jitter within the disc
    const rad = s.radius * Math.sqrt(r1), ph = 2 * Math.PI * r2;
    let tx = Math.abs(dy) < 0.9 ? -dz : 1, ty = Math.abs(dy) < 0.9 ? 0 : 0, tz = Math.abs(dy) < 0.9 ? dx : 0;
    let tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
    const bx = dy * tz - dz * ty, by = dz * tx - dx * tz, bz = dx * ty - dy * tx;
    dx += (tx * Math.cos(ph) + bx * Math.sin(ph)) * rad; dy += (ty * Math.cos(ph) + by * Math.sin(ph)) * rad; dz += (tz * Math.cos(ph) + bz * Math.sin(ph)) * rad;
    tl = Math.hypot(dx, dy, dz); dx /= tl; dy /= tl; dz /= tl;
    const c = dx * nx + dy * ny + dz * nz;
    if (c <= 0) return 0;
    const v = this.shadow(px + nx * EPS, py + ny * EPS, pz + nz * EPS, dx, dy, dz);
    return c * v;
  }

  private nd = [0, 0, 0];
  private cosDir(nx: number, ny: number, nz: number, r1: number, r2: number) {
    const r = Math.sqrt(r1), ph = 2 * Math.PI * r2;
    const x = r * Math.cos(ph), y = r * Math.sin(ph), z = Math.sqrt(Math.max(0, 1 - r1));
    let tx: number, ty: number, tz: number;
    if (Math.abs(nx) > 0.9) { tx = 0; ty = 1; tz = 0; } else { tx = 1; ty = 0; tz = 0; }
    let bx = ny * tz - nz * ty, by = nz * tx - nx * tz, bz = nx * ty - ny * tx;
    const bl = 1 / Math.hypot(bx, by, bz); bx *= bl; by *= bl; bz *= bl;
    tx = by * nz - bz * ny; ty = bz * nx - bx * nz; tz = bx * ny - by * nx;
    this.nd[0] = tx * x + bx * y + nx * z; this.nd[1] = ty * x + by * y + ny * z; this.nd[2] = tz * x + bz * y + nz * z;
  }

  /** first opaque-enough hit: surfaces with a pass-through probability let the ray continue at random */
  private back = false;
  private traceRay(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number): boolean {
    const B = this.S.bvh, M = this.S.mats, h = this.hit;
    for (let k = 0; k < 8; k++) {
      if (!B.intersect(ox, oy, oz, dx, dy, dz, 1e5, h)) return false;
      const thru = M[B.mat[h.tri] * MS + 3];
      if (thru > 0 && rnd() < thru) { ox += dx * (h.t + EPS); oy += dy * (h.t + EPS); oz += dz * (h.t + EPS); continue; }
      B.normal(h.tri, this.nrm);
      this.back = this.nrm[0] * dx + this.nrm[1] * dy + this.nrm[2] * dz > 0;
      // report the hit point relative to the original origin through a shared origin
      this.hx = ox + dx * h.t; this.hy = oy + dy * h.t; this.hz = oz + dz * h.t;
      return true;
    }
    return false;
  }
  private hx = 0; private hy = 0; private hz = 0;

  /** light cache (total irradiance) at the current hit, interpolated across the triangle; false if the triangle has none */
  private cr = 0; private cg = 0; private cb = 0;
  private cacheAt(): boolean {
    const C = this.cache; if (!C) return false;
    const h = this.hit, two = this.back;
    const T = two ? this.S.triSampleB : this.S.triSample;
    const a = T[h.tri * 3], b = T[h.tri * 3 + 1], c = T[h.tri * 3 + 2];
    if (a < 0 || b < 0 || c < 0) return false;
    const w = 1 - h.u - h.v;
    this.cr = C[a * 3] * w + C[b * 3] * h.u + C[c * 3] * h.v;
    this.cg = C[a * 3 + 1] * w + C[b * 3 + 1] * h.u + C[c * 3 + 1] * h.v;
    this.cb = C[a * 3 + 2] * w + C[b * 3 + 2] * h.u + C[c * 3 + 2] * h.v;
    return true;
  }

  /** irradiance at a hit with no cache (bush, far ground): direct sun plus a sky estimate from one ray */
  private onTheFly(nx: number, ny: number, nz: number) {
    const s = this.S.sun, px = this.hx, py = this.hy, pz = this.hz;
    const sv = this.sunAt(px, py, pz, nx, ny, nz, rnd(), rnd());
    this.cosDir(nx, ny, nz, rnd(), rnd());
    const d0 = this.nd[0], d1 = this.nd[1], d2 = this.nd[2];
    let sr = 0, sg = 0, sb = 0;
    if (!this.S.bvh.intersect(px + nx * EPS, py + ny * EPS, pz + nz * EPS, d0, d1, d2, 1e5, this.hit, true)) { this.sky(d0, d1, d2); sr = this.sk[0]; sg = this.sk[1]; sb = this.sk[2]; }
    else { this.sky(d0, Math.abs(d1), d2); sr = this.sk[0] * 0.25; sg = this.sk[1] * 0.25; sb = this.sk[2] * 0.25; }
    this.cr = s.E[0] * sv + Math.PI * sr; this.cg = s.E[1] * sv + Math.PI * sg; this.cb = s.E[2] * sv + Math.PI * sb;
  }

  /**
   * Trace a run of samples. samples: [px py pz nx ny nz] each; first = index of the first one in the whole bake (seeds
   * its random stream). mode 0: full paths (first pass); mode 1: final gather against `cache`.
   */
  job(samples: Float32Array, first: number, spp: number, mode: 0 | 1): Float32Array {
    const S = this.S, M = S.mats, sun = S.sun;
    if (this.H2.length !== spp) {
      this.H2 = new Float32Array(spp); this.H3 = new Float32Array(spp);
      for (let s = 0; s < spp; s++) { this.H2[s] = halton(s + 1, 2); this.H3[s] = halton(s + 1, 3); }
    }
    const n = samples.length / 6, out = new Float32Array(n * OUT);
    const clampL = 6 * Math.max(sun.E[0], sun.E[1], sun.E[2], 0.5);
    for (let i = 0; i < n; i++) {
      seedRng(first + i, mode, S.seed);
      const px = samples[i * 6], py = samples[i * 6 + 1], pz = samples[i * 6 + 2];
      const nx = samples[i * 6 + 3], ny = samples[i * 6 + 4], nz = samples[i * 6 + 5];
      // a vertex with no usable normal (degenerate geometry) is marked invalid and filled from its neighbours
      if (!(nx * nx + ny * ny + nz * nz > 0.25)) { out[i * OUT + 6] = 0; continue; }
      const ox = px + nx * EPS * 1.5, oy = py + ny * EPS * 1.5, oz = pz + nz * EPS * 1.5;
      let er = 0, eg = 0, eb = 0, ddx = 0, ddy = 0, ddz = 0, wl = 0, backs = 0, sunV = 0;
      const j1 = rnd(), j2 = rnd();
      // direct sun at the point, for the cache only (the live view draws it)
      const nSun = mode === 0 ? Math.max(4, spp >> 1) : 0;
      for (let k = 0; k < nSun; k++) sunV += this.sunAt(px, py, pz, nx, ny, nz, (k + rnd()) / nSun, rnd());
      for (let s = 0; s < spp; s++) {
        let u1 = this.H2[s] + j1, u2 = this.H3[s] + j2; if (u1 >= 1) u1 -= 1; if (u2 >= 1) u2 -= 1;
        this.cosDir(nx, ny, nz, u1, u2);
        const d0 = this.nd[0], d1 = this.nd[1], d2 = this.nd[2];
        let lr = 0, lg = 0, lb = 0;
        if (!this.traceRay(ox, oy, oz, d0, d1, d2)) {
          this.sky(d0, d1, d2); lr = this.sk[0]; lg = this.sk[1]; lb = this.sk[2];
        } else {
          const m = S.bvh.mat[this.hit.tri] * MS, flags = M[m + 4];
          if (this.back && this.hit.t < 0.04 && !(flags & 1)) backs++;
          if (this.back && !(flags & 1)) { /* inside of a closed solid: no light */ }
          else if (mode === 1) {
            let hnx = this.nrm[0], hny = this.nrm[1], hnz = this.nrm[2];
            if (this.back) { hnx = -hnx; hny = -hny; hnz = -hnz; }
            if (!(flags & 2) && this.cacheAt()) { /* cached */ } else this.onTheFly(hnx, hny, hnz);
            lr = M[m] * this.cr * INV_PI; lg = M[m + 1] * this.cg * INV_PI; lb = M[m + 2] * this.cb * INV_PI;
          } else {
            // full path from the hit
            let br = 1, bg = 1, bb = 1;
            let hnx = this.nrm[0], hny = this.nrm[1], hnz = this.nrm[2];
            let mm = m, back = this.back;
            for (let depth = 0; depth < S.maxDepth; depth++) {
              if (back && !(M[mm + 4] & 1)) break;
              if (back) { hnx = -hnx; hny = -hny; hnz = -hnz; }
              const ar = M[mm], ag = M[mm + 1], ab = M[mm + 2];
              const hx = this.hx, hy = this.hy, hz = this.hz;
              const sv = this.sunAt(hx, hy, hz, hnx, hny, hnz, rnd(), rnd());
              if (sv > 0) { lr += br * ar * INV_PI * sun.E[0] * sv; lg += bg * ag * INV_PI * sun.E[1] * sv; lb += bb * ab * INV_PI * sun.E[2] * sv; }
              br *= ar; bg *= ag; bb *= ab;
              if (depth >= 1) { const p = Math.min(0.9, Math.max(br, bg, bb)); if (rnd() > p) break; br /= p; bg /= p; bb /= p; }
              this.cosDir(hnx, hny, hnz, rnd(), rnd());
              const e0 = this.nd[0], e1 = this.nd[1], e2 = this.nd[2];
              if (!this.traceRay(hx + hnx * EPS, hy + hny * EPS, hz + hnz * EPS, e0, e1, e2)) { this.sky(e0, e1, e2); lr += br * this.sk[0]; lg += bg * this.sk[1]; lb += bb * this.sk[2]; break; }
              mm = S.bvh.mat[this.hit.tri] * MS; back = this.back; hnx = this.nrm[0]; hny = this.nrm[1]; hnz = this.nrm[2];
            }
          }
        }
        // irradiance estimator for cosine sampling: π × mean radiance
        lr = Math.min(lr * Math.PI, clampL); lg = Math.min(lg * Math.PI, clampL); lb = Math.min(lb * Math.PI, clampL);
        er += lr; eg += lg; eb += lb;
        const l = 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
        ddx += d0 * l; ddy += d1 * l; ddz += d2 * l; wl += l;
      }
      const k = 1 / spp, o = i * OUT;
      out[o] = er * k; out[o + 1] = eg * k; out[o + 2] = eb * k;
      if (wl > 1e-9) { const dl = Math.hypot(ddx, ddy, ddz) || 1; out[o + 3] = ddx / dl; out[o + 4] = ddy / dl; out[o + 5] = ddz / dl; }
      out[o + 6] = backs > spp * 0.35 ? 0 : 1;
      const sv = nSun ? sunV / nSun : 0;
      out[o + 7] = sun.E[0] * sv; out[o + 8] = sun.E[1] * sv; out[o + 9] = sun.E[2] * sv;
    }
    return out;
  }
}

/**
 * Repair samples buried in other geometry from their neighbours, then edge-aware smoothing over the mesh graph
 * (after room-at-dawn's baker.js). E, D: 3 floats per sample (in place); ok: 1 valid, 0 buried; N: sample normals.
 */
export function smooth(E: Float32Array, D: Float32Array, ok: Uint8Array, N: Float32Array, ea: Uint32Array, eb: Uint32Array, iters: number) {
  const nS = ok.length, nE = ea.length;
  for (let i = 0; i < nS; i++) if (!(Number.isFinite(E[i * 3]) && Number.isFinite(E[i * 3 + 1]) && Number.isFinite(E[i * 3 + 2]))) { ok[i] = 0; E[i * 3] = E[i * 3 + 1] = E[i * 3 + 2] = 0; D[i * 3] = D[i * 3 + 1] = D[i * 3 + 2] = 0; }
  const acc = new Float32Array(nS * 6), wsum = new Float32Array(nS);
  for (let it = 0; it < 6; it++) {
    acc.fill(0); wsum.fill(0); let bad = 0;
    for (let k = 0; k < nE; k++) {
      const a = ea[k], b = eb[k];
      if (!ok[a] && ok[b] === 1) { for (let c = 0; c < 3; c++) { acc[a * 6 + c] += E[b * 3 + c]; acc[a * 6 + 3 + c] += D[b * 3 + c]; } wsum[a]++; }
      if (!ok[b] && ok[a] === 1) { for (let c = 0; c < 3; c++) { acc[b * 6 + c] += E[a * 3 + c]; acc[b * 6 + 3 + c] += D[a * 3 + c]; } wsum[b]++; }
    }
    for (let i = 0; i < nS; i++) if (!ok[i] && wsum[i] > 0) { for (let c = 0; c < 3; c++) { E[i * 3 + c] = acc[i * 6 + c] / wsum[i]; D[i * 3 + c] = acc[i * 6 + 3 + c] / wsum[i]; } ok[i] = 2; bad++; }
    for (let i = 0; i < nS; i++) if (ok[i] === 2) ok[i] = 1;
    if (!bad) break;
  }
  const lum = (i: number) => 0.2126 * E[i * 3] + 0.7152 * E[i * 3 + 1] + 0.0722 * E[i * 3 + 2];
  for (let it = 0; it < iters; it++) {
    acc.fill(0); wsum.fill(0);
    for (let k = 0; k < nE; k++) {
      const a = ea[k], b = eb[k];
      const nd = N[a * 3] * N[b * 3] + N[a * 3 + 1] * N[b * 3 + 1] + N[a * 3 + 2] * N[b * 3 + 2];
      if (nd < 0.9) continue;
      const la = lum(a), lb = lum(b), dl = (la - lb) / (0.3 * (la + lb) * 0.5 + 1e-4);
      const w = 1 / (1 + dl * dl);
      for (let c = 0; c < 3; c++) { acc[a * 6 + c] += w * E[b * 3 + c]; acc[a * 6 + 3 + c] += w * D[b * 3 + c]; acc[b * 6 + c] += w * E[a * 3 + c]; acc[b * 6 + 3 + c] += w * D[a * 3 + c]; }
      wsum[a] += w; wsum[b] += w;
    }
    for (let i = 0; i < nS; i++) {
      const ws = wsum[i]; if (ws <= 0) continue;
      const self = Math.max(1, ws * 0.6);
      for (let c = 0; c < 3; c++) { E[i * 3 + c] = (E[i * 3 + c] * self + acc[i * 6 + c]) / (self + ws); D[i * 3 + c] = (D[i * 3 + c] * self + acc[i * 6 + 3 + c]) / (self + ws); }
    }
  }
}

// ---- storage: RGB9E5 for light (4 bytes) and an octahedral direction (2 bytes) per sample ----
export function packRGB9E5(r: number, g: number, b: number): number {
  const MAXV = 65408; // (2^9 − 1) / 2^9 × 2^(31 − 15)
  r = Math.min(Math.max(r, 0), MAXV); g = Math.min(Math.max(g, 0), MAXV); b = Math.min(Math.max(b, 0), MAXV);
  const m = Math.max(r, g, b);
  if (m < 1e-9) return 0;
  let e = Math.max(-16, Math.floor(Math.log2(m))) + 1 + 15;
  let den = Math.pow(2, e - 15 - 9);
  if (Math.floor(m / den + 0.5) === 512) { den *= 2; e++; }
  const rm = Math.floor(r / den + 0.5), gm = Math.floor(g / den + 0.5), bm = Math.floor(b / den + 0.5);
  return ((e << 27) | (bm << 18) | (gm << 9) | rm) >>> 0;
}
export function unpackRGB9E5(v: number, out: number[] | Float32Array, o = 0) {
  const e = (v >>> 27) - 15 - 9, s = Math.pow(2, e);
  out[o] = (v & 511) * s; out[o + 1] = ((v >>> 9) & 511) * s; out[o + 2] = ((v >>> 18) & 511) * s;
}
export function packOct(x: number, y: number, z: number): number {
  const l = Math.abs(x) + Math.abs(y) + Math.abs(z) || 1;
  let u = x / l, v = y / l;
  if (z < 0) { const ou = u; u = (1 - Math.abs(v)) * (ou >= 0 ? 1 : -1); v = (1 - Math.abs(ou)) * (v >= 0 ? 1 : -1); }
  const qu = Math.round((u * 0.5 + 0.5) * 255), qv = Math.round((v * 0.5 + 0.5) * 255);
  return (qv << 8) | qu;
}
export function unpackOct(p: number, out: number[] | Float32Array, o = 0) {
  let u = ((p & 255) / 255) * 2 - 1, v = ((p >>> 8) / 255) * 2 - 1;
  const z = 1 - Math.abs(u) - Math.abs(v);
  if (z < 0) { const ou = u; u = (1 - Math.abs(v)) * (ou >= 0 ? 1 : -1); v = (1 - Math.abs(ou)) * (v >= 0 ? 1 : -1); }
  const l = Math.hypot(u, v, z) || 1; out[o] = u / l; out[o + 1] = v / l; out[o + 2] = z / l;
}

export const MAGIC = 0x31424741; // 'AGB1'
/** bake file: magic, json length, json (meta), pad to 4, then per sample uint32 light + uint16 direction */
export function packBake(E: Float32Array, D: Float32Array, meta: Record<string, unknown>): ArrayBuffer {
  const n = E.length / 3;
  const json = new TextEncoder().encode(JSON.stringify({ ...meta, samples: n }));
  const head = 8 + json.length, pad = (4 - (head % 4)) % 4;
  const buf = new ArrayBuffer(head + pad + n * 4 + n * 2 + ((n * 2) % 4 ? 2 : 0));
  const dv = new DataView(buf); dv.setUint32(0, MAGIC, true); dv.setUint32(4, json.length, true);
  new Uint8Array(buf, 8, json.length).set(json);
  const L = new Uint32Array(buf, head + pad, n), O = new Uint16Array(buf, head + pad + n * 4, n);
  for (let i = 0; i < n; i++) { L[i] = packRGB9E5(E[i * 3], E[i * 3 + 1], E[i * 3 + 2]); O[i] = packOct(D[i * 3], D[i * 3 + 1], D[i * 3 + 2]); }
  return buf;
}
export function unpackBake(buf: ArrayBuffer): { meta: Record<string, unknown> & { samples: number }; E: Float32Array; D: Float32Array } | null {
  const dv = new DataView(buf);
  if (buf.byteLength < 8 || dv.getUint32(0, true) !== MAGIC) return null;
  const jl = dv.getUint32(4, true), head = 8 + jl, pad = (4 - (head % 4)) % 4;
  const meta = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 8, jl)));
  const n = meta.samples as number;
  const L = new Uint32Array(buf, head + pad, n), O = new Uint16Array(buf, head + pad + n * 4, n);
  const E = new Float32Array(n * 3), D = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { unpackRGB9E5(L[i], E, i * 3); unpackOct(O[i], D, i * 3); }
  return { meta, E, D };
}

/** a short content hash (FNV-1a over the bytes) so a bake file is only applied to the geometry it was made for */
export function fnv(bytes: Uint8Array, h = 0x811c9dc5): number {
  for (let i = 0; i < bytes.length; i++) { h ^= bytes[i]; h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
