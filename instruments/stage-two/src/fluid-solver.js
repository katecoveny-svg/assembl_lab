// Original small position-based fluid implementation. Positions and density
// constraints are three-dimensional; spatial hashing bounds neighbour searches.
export class Fluid {
  constructor(nx = 8, ny = 10, nz = 8) {
    this.n = nx * ny * nz;
    this.p = new Float32Array(this.n * 3);
    this.v = new Float32Array(this.n * 3);
    this.old = new Float32Array(this.n * 3);
    this.lambda = new Float32Array(this.n);
    this.delta = new Float32Array(this.n * 3);
    this.h = 0.27;
    this.rest = 0;
    this.steps = 0;
    let i = 0;
    for (let y = 0; y < ny; y++)
      for (let z = 0; z < nz; z++)
        for (let x = 0; x < nx; x++) {
          this.p[i++] = (x - (nx - 1) / 2) * 0.135 - 0.45;
          this.p[i++] = y * 0.135 - 0.3;
          this.p[i++] = (z - (nz - 1) / 2) * 0.135;
        }
    this.hash();
    let sum = 0;
    for (let k = 0; k < this.n; k++) {
      let density = 0;
      this.each(k, (j, r) => (density += this.kernel(r)));
      sum += density;
    }
    this.rest = sum / this.n;
  }
  kernel(r) {
    const q = Math.max(0, 1 - (r * r) / (this.h * this.h));
    return q * q * q;
  }
  hash() {
    this.grid = new Map();
    for (let i = 0; i < this.n; i++) {
      const k = i * 3,
        key = this.key(
          Math.floor(this.p[k] / this.h),
          Math.floor(this.p[k + 1] / this.h),
          Math.floor(this.p[k + 2] / this.h),
        );
      const cell = this.grid.get(key);
      if (cell) cell.push(i);
      else this.grid.set(key, [i]);
    }
  }
  key(x, y, z) {
    return `${x},${y},${z}`;
  }
  each(i, fn) {
    const k = i * 3,
      p = this.p,
      h = this.h,
      x = Math.floor(p[k] / h),
      y = Math.floor(p[k + 1] / h),
      z = Math.floor(p[k + 2] / h);
    for (let dz = -1; dz <= 1; dz++)
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const cell = this.grid.get(this.key(x + dx, y + dy, z + dz));
          if (!cell) continue;
          for (const j of cell) {
            const l = j * 3,
              a = p[k] - p[l],
              b = p[k + 1] - p[l + 1],
              c = p[k + 2] - p[l + 2],
              r = Math.hypot(a, b, c);
            if (r < h) fn(j, r, a, b, c);
          }
        }
  }
  bounds(k) {
    this.p[k] = Math.max(-1.35, Math.min(1.35, this.p[k]));
    this.p[k + 1] = Math.max(-1.4, Math.min(1.4, this.p[k + 1]));
    this.p[k + 2] = Math.max(-1.05, Math.min(1.05, this.p[k + 2]));
  }
  step(dt, gravity = 5) {
    const p = this.p,
      v = this.v,
      n = this.n,
      h = this.h,
      rest = this.rest;
    this.old.set(p);
    for (let i = 0; i < n; i++) {
      const k = i * 3;
      v[k + 1] -= gravity * dt;
      for (let a = 0; a < 3; a++)
        p[k + a] += Math.max(-5, Math.min(5, v[k + a])) * dt;
      this.bounds(k);
    }
    for (let iteration = 0; iteration < 3; iteration++) {
      this.hash();
      for (let i = 0; i < n; i++) {
        let density = 0,
          gx = 0,
          gy = 0,
          gz = 0,
          grad2 = 0;
        this.each(i, (j, r, a, b, c) => {
          density += this.kernel(r);
          if (j === i) return;
          const q = 1 - (r * r) / (h * h),
            g = (-6 * q * q) / (h * h * rest);
          gx += g * a;
          gy += g * b;
          gz += g * c;
          grad2 += g * g * r * r;
        });
        const constraint = Math.max(density / rest - 1, 0);
        this.lambda[i] =
          -constraint / (grad2 + gx * gx + gy * gy + gz * gz + 0.05);
      }
      this.delta.fill(0);
      for (let i = 0; i < n; i++) {
        const k = i * 3;
        this.each(i, (j, r, a, b, c) => {
          if (j === i) return;
          const q = 1 - (r * r) / (h * h),
            g = (-6 * q * q) / (h * h * rest),
            s = (this.lambda[i] + this.lambda[j]) * g;
          this.delta[k] += s * a;
          this.delta[k + 1] += s * b;
          this.delta[k + 2] += s * c;
        });
      }
      for (let i = 0; i < n; i++) {
        const k = i * 3;
        for (let a = 0; a < 3; a++)
          p[k + a] += Math.max(-0.04, Math.min(0.04, this.delta[k + a]));
        this.bounds(k);
      }
    }
    for (let k = 0; k < p.length; k++)
      v[k] = ((p[k] - this.old[k]) / dt) * 0.993;
    // XSPH-style neighbour velocity blending: a bounded viscosity approximation.
    // Compute from the same velocity snapshot before applying any correction.
    this.hash();
    this.delta.fill(0);
    for (let i = 0; i < n; i++) {
      const k = i * 3;
      let weight = 0;
      this.each(i, (j, r) => {
        if (j === i) return;
        const w = this.kernel(r);
        weight += w;
        for (let a = 0; a < 3; a++)
          this.delta[k + a] += (v[j * 3 + a] - v[k + a]) * w;
      });
      if (weight > 0)
        for (let a = 0; a < 3; a++) this.delta[k + a] *= 0.14 / weight;
    }
    for (let k = 0; k < v.length; k++) v[k] += this.delta[k];
    this.steps++;
  }
  stir(x, z, strength = 1) {
    for (let i = 0; i < this.n; i++) {
      const k = i * 3,
        dx = this.p[k] - x,
        dz = this.p[k + 2] - z,
        w = Math.exp(-(dx * dx + dz * dz) / 0.65);
      this.v[k] += -dz * w * strength * 2;
      this.v[k + 1] += w * strength * 2;
      this.v[k + 2] += dx * w * strength * 2;
    }
  }
  snapshot() {
    return { p: Array.from(this.p), v: Array.from(this.v) };
  }
  restore(s) {
    this.p.set(s.p);
    this.v.set(s.v);
  }
}
