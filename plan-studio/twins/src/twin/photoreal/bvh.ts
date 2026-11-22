// A compact bounding-volume hierarchy over a triangle soup, for the light bake. No three.js: it runs the same in a web
// worker, on the page and under node (the tests). Binned SAH build, flat typed-array nodes, iterative traversal.
// Closest hit for paths, any hit for shadow rays. Deterministic: the same soup always builds the same tree.

export interface Soup {
  /** world positions, 9 floats per triangle (a, b, c) */
  tri: Float32Array;
  /** material index per triangle */
  mat: Uint16Array;
}

export interface Hit {
  t: number;
  tri: number;
  u: number;
  v: number;
}

const BINS = 12;
const LEAF = 4;

export class BVH {
  /** per node: minx miny minz maxx maxy maxz */
  box: Float32Array;
  /** per node: [left child | first tri] and [right child | -count-1 for a leaf] */
  link: Int32Array;
  /** triangle order after the build */
  order: Uint32Array;
  /** per ordered triangle: v0 (3), e1 (3), e2 (3) */
  pre: Float32Array;
  mat: Uint16Array;
  nodes = 0;

  constructor(soup: Soup) {
    const n = soup.tri.length / 9;
    const T = soup.tri;
    const cen = new Float32Array(n * 3), bb = new Float32Array(n * 6);
    for (let i = 0; i < n; i++) {
      const o = i * 9;
      for (let k = 0; k < 3; k++) {
        const a = T[o + k], b = T[o + 3 + k], c = T[o + 6 + k];
        const lo = Math.min(a, b, c), hi = Math.max(a, b, c);
        bb[i * 6 + k] = lo; bb[i * 6 + 3 + k] = hi; cen[i * 3 + k] = (lo + hi) * 0.5;
      }
    }
    const idx = new Uint32Array(n);
    for (let i = 0; i < n; i++) idx[i] = i;
    const maxNodes = Math.max(1, 2 * Math.ceil(n / 1) );
    this.box = new Float32Array(maxNodes * 6);
    this.link = new Int32Array(maxNodes * 2);
    const binB = new Float32Array(BINS * 6), binN = new Uint32Array(BINS);
    const rB = new Float32Array(BINS * 6), rN = new Uint32Array(BINS);
    const stack: number[] = [];
    const mk = (s: number, e: number) => {
      const id = this.nodes++;
      let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
      for (let i = s; i < e; i++) {
        const q = idx[i] * 6;
        if (bb[q] < x0) x0 = bb[q]; if (bb[q + 1] < y0) y0 = bb[q + 1]; if (bb[q + 2] < z0) z0 = bb[q + 2];
        if (bb[q + 3] > x1) x1 = bb[q + 3]; if (bb[q + 4] > y1) y1 = bb[q + 4]; if (bb[q + 5] > z1) z1 = bb[q + 5];
      }
      const b = id * 6;
      this.box[b] = x0; this.box[b + 1] = y0; this.box[b + 2] = z0; this.box[b + 3] = x1; this.box[b + 4] = y1; this.box[b + 5] = z1;
      this.link[id * 2] = s; this.link[id * 2 + 1] = -(e - s) - 1;
      stack.push(id, s, e);
      return id;
    };
    const area = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => {
      const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
      return dx < 0 ? 0 : dx * dy + dy * dz + dz * dx;
    };
    if (n > 0) mk(0, n);
    while (stack.length) {
      const e = stack.pop()!, s = stack.pop()!, id = stack.pop()!;
      const cnt = e - s;
      if (cnt <= LEAF) continue;
      // centroid bounds
      let c0x = Infinity, c0y = Infinity, c0z = Infinity, c1x = -Infinity, c1y = -Infinity, c1z = -Infinity;
      for (let i = s; i < e; i++) {
        const q = idx[i] * 3, x = cen[q], y = cen[q + 1], z = cen[q + 2];
        if (x < c0x) c0x = x; if (y < c0y) c0y = y; if (z < c0z) c0z = z; if (x > c1x) c1x = x; if (y > c1y) c1y = y; if (z > c1z) c1z = z;
      }
      let bestAxis = -1, bestSplit = 0, bestCost = Infinity;
      const ext = [c1x - c0x, c1y - c0y, c1z - c0z], lo = [c0x, c0y, c0z];
      for (let ax = 0; ax < 3; ax++) {
        if (ext[ax] < 1e-9) continue;
        binN.fill(0);
        for (let k = 0; k < BINS; k++) { binB[k * 6] = binB[k * 6 + 1] = binB[k * 6 + 2] = Infinity; binB[k * 6 + 3] = binB[k * 6 + 4] = binB[k * 6 + 5] = -Infinity; }
        const sc = BINS / ext[ax];
        for (let i = s; i < e; i++) {
          const t = idx[i];
          let k = ((cen[t * 3 + ax] - lo[ax]) * sc) | 0; if (k >= BINS) k = BINS - 1;
          binN[k]++;
          const q = t * 6, w = k * 6;
          for (let j = 0; j < 3; j++) { if (bb[q + j] < binB[w + j]) binB[w + j] = bb[q + j]; if (bb[q + 3 + j] > binB[w + 3 + j]) binB[w + 3 + j] = bb[q + 3 + j]; }
        }
        // sweep from the right
        let ax0 = Infinity, ay0 = Infinity, az0 = Infinity, ax1 = -Infinity, ay1 = -Infinity, az1 = -Infinity, acc = 0;
        for (let k = BINS - 1; k > 0; k--) {
          const w = k * 6;
          if (binN[k]) {
            ax0 = Math.min(ax0, binB[w]); ay0 = Math.min(ay0, binB[w + 1]); az0 = Math.min(az0, binB[w + 2]);
            ax1 = Math.max(ax1, binB[w + 3]); ay1 = Math.max(ay1, binB[w + 4]); az1 = Math.max(az1, binB[w + 5]);
          }
          acc += binN[k]; rN[k] = acc;
          rB[k] = area(ax0, ay0, az0, ax1, ay1, az1);
        }
        ax0 = ay0 = az0 = Infinity; ax1 = ay1 = az1 = -Infinity; acc = 0;
        for (let k = 0; k < BINS - 1; k++) {
          const w = k * 6;
          if (binN[k]) {
            ax0 = Math.min(ax0, binB[w]); ay0 = Math.min(ay0, binB[w + 1]); az0 = Math.min(az0, binB[w + 2]);
            ax1 = Math.max(ax1, binB[w + 3]); ay1 = Math.max(ay1, binB[w + 4]); az1 = Math.max(az1, binB[w + 5]);
          }
          acc += binN[k];
          if (!acc || !rN[k + 1]) continue;
          const cost = area(ax0, ay0, az0, ax1, ay1, az1) * acc + rB[k + 1] * rN[k + 1];
          if (cost < bestCost) { bestCost = cost; bestAxis = ax; bestSplit = k; }
        }
      }
      let mid: number;
      if (bestAxis < 0) {
        mid = (s + e) >> 1; // all centroids coincide: split by count
      } else {
        const sc = BINS / ext[bestAxis];
        let i = s, j = e - 1;
        while (i <= j) {
          const t = idx[i];
          let k = ((cen[t * 3 + bestAxis] - lo[bestAxis]) * sc) | 0; if (k >= BINS) k = BINS - 1;
          if (k <= bestSplit) i++; else { idx[i] = idx[j]; idx[j] = t; j--; }
        }
        mid = i;
        if (mid === s || mid === e) mid = (s + e) >> 1;
      }
      const l = mk(s, mid), r = mk(mid, e);
      this.link[id * 2] = l; this.link[id * 2 + 1] = r;
    }
    this.box = this.box.slice(0, Math.max(1, this.nodes) * 6);
    this.link = this.link.slice(0, Math.max(1, this.nodes) * 2);
    this.order = idx;
    this.pre = new Float32Array(n * 9);
    this.mat = new Uint16Array(n);
    for (let i = 0; i < n; i++) {
      const o = idx[i] * 9, p = i * 9;
      this.pre[p] = T[o]; this.pre[p + 1] = T[o + 1]; this.pre[p + 2] = T[o + 2];
      this.pre[p + 3] = T[o + 3] - T[o]; this.pre[p + 4] = T[o + 4] - T[o + 1]; this.pre[p + 5] = T[o + 5] - T[o + 2];
      this.pre[p + 6] = T[o + 6] - T[o]; this.pre[p + 7] = T[o + 7] - T[o + 1]; this.pre[p + 8] = T[o + 8] - T[o + 2];
      this.mat[i] = soup.mat[idx[i]];
    }
  }

  private st = new Int32Array(128);

  /** closest hit along o + t·d, t in (tmin, tmax). Returns false on a miss; fills `h`. `h.tri` is the ordered index. */
  intersect(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, tmax: number, h: Hit, any = false): boolean {
    if (!this.nodes) return false;
    const B = this.box, L = this.link, P = this.pre, st = this.st;
    const ix = 1 / dx, iy = 1 / dy, iz = 1 / dz;
    const sx = ix < 0 ? 1 : 0, sy = iy < 0 ? 1 : 0, sz = iz < 0 ? 1 : 0;
    let sp = 0, best = tmax, found = false;
    st[sp++] = 0;
    while (sp > 0) {
      const nd = st[--sp];
      const b = nd * 6;
      // slab test
      let t0 = ((sx ? B[b + 3] : B[b]) - ox) * ix, t1 = ((sx ? B[b] : B[b + 3]) - ox) * ix;
      const ty0 = ((sy ? B[b + 4] : B[b + 1]) - oy) * iy, ty1 = ((sy ? B[b + 1] : B[b + 4]) - oy) * iy;
      if (ty0 > t0) t0 = ty0; if (ty1 < t1) t1 = ty1;
      const tz0 = ((sz ? B[b + 5] : B[b + 2]) - oz) * iz, tz1 = ((sz ? B[b + 2] : B[b + 5]) - oz) * iz;
      if (tz0 > t0) t0 = tz0; if (tz1 < t1) t1 = tz1;
      if (t0 > t1 || t1 < 0 || t0 > best) continue;
      const r = L[nd * 2 + 1];
      if (r < 0) {
        const first = L[nd * 2], end = first + (-r - 1);
        for (let i = first; i < end; i++) {
          const p = i * 9;
          const e1x = P[p + 3], e1y = P[p + 4], e1z = P[p + 5], e2x = P[p + 6], e2y = P[p + 7], e2z = P[p + 8];
          const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x;
          const det = e1x * px + e1y * py + e1z * pz;
          if (det > -1e-12 && det < 1e-12) continue;
          const inv = 1 / det;
          const tx = ox - P[p], ty = oy - P[p + 1], tz = oz - P[p + 2];
          const u = (tx * px + ty * py + tz * pz) * inv;
          if (u < 0 || u > 1) continue;
          const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
          const v = (dx * qx + dy * qy + dz * qz) * inv;
          if (v < 0 || u + v > 1) continue;
          const t = (e2x * qx + e2y * qy + e2z * qz) * inv;
          if (t > 1e-7 && t < best) {
            best = t; found = true; h.t = t; h.tri = i; h.u = u; h.v = v;
            if (any) return true;
          }
        }
      } else {
        // near child last on the stack so it pops first
        const l = L[nd * 2];
        const lb = l * 6, rb = r * 6;
        const dl = (B[lb] + B[lb + 3] - 2 * ox) * dx + (B[lb + 1] + B[lb + 4] - 2 * oy) * dy + (B[lb + 2] + B[lb + 5] - 2 * oz) * dz;
        const dr = (B[rb] + B[rb + 3] - 2 * ox) * dx + (B[rb + 1] + B[rb + 4] - 2 * oy) * dy + (B[rb + 2] + B[rb + 5] - 2 * oz) * dz;
        if (sp + 2 > st.length) { const s2 = new Int32Array(st.length * 2); s2.set(st); this.st = s2; return this.intersect(ox, oy, oz, dx, dy, dz, tmax, h, any); }
        if (dl < dr) { st[sp++] = r; st[sp++] = l; } else { st[sp++] = l; st[sp++] = r; }
      }
    }
    return found;
  }

  /** geometric normal of ordered triangle i (unnormalised e1 × e2) into out */
  normal(i: number, out: Float32Array | number[]) {
    const P = this.pre, p = i * 9;
    const e1x = P[p + 3], e1y = P[p + 4], e1z = P[p + 5], e2x = P[p + 6], e2y = P[p + 7], e2z = P[p + 8];
    let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    out[0] = nx; out[1] = ny; out[2] = nz;
  }
}
