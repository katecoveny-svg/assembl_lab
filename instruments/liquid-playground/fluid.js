// A small 2D particle liquid using "double density relaxation"
// (Clavet, Beaudoin and Poulin 2005). Positions are in art units.
// Particles push apart when crowded and pull together when spread out.
// A playful model, not an engineering fluid simulation.

export function createFluid({ max = 1200, h = 0.055 } = {}) {
  return {
    max, h, n: 0,
    x: new Float32Array(max), y: new Float32Array(max),
    px: new Float32Array(max), py: new Float32Array(max),
    vx: new Float32Array(max), vy: new Float32Array(max),
    ci: new Uint8Array(max),
  };
}

export function addParticle(f, x, y, ci, vx = 0, vy = 0) {
  if (f.n >= f.max) return false;
  const i = f.n++;
  f.x[i] = x; f.y[i] = y; f.vx[i] = vx; f.vy[i] = vy; f.ci[i] = ci;
  return true;
}

export function removeParticle(f, i) {
  const j = --f.n;
  for (const k of ["x", "y", "px", "py", "vx", "vy", "ci"]) f[k][i] = f[k][j];
}

const REST = 3.2, K = 0.11, KNEAR = 0.32;

export function stepFluid(f, { dt = 1 / 60, gx = 0, gy = 2.2, ax = 1, ay = 1, stir = null }) {
  const { n, h, x, y, px, py, vx, vy } = f;
  for (let i = 0; i < n; i++) {
    vx[i] += gx * dt; vy[i] += gy * dt;
    if (stir) {
      const dx = x[i] - stir.x, dy = y[i] - stir.y, d2 = dx * dx + dy * dy, r2 = stir.r * stir.r;
      if (d2 < r2) {
        const w = 1 - d2 / r2;
        if (stir.kind === "swirl") { vx[i] += -dy * w * 9 * dt * 6; vy[i] += dx * w * 9 * dt * 6; }
        else { vx[i] += (stir.vx - vx[i]) * w * 0.35; vy[i] += (stir.vy - vy[i]) * w * 0.35; }
      }
    }
    px[i] = x[i]; py[i] = y[i];
    x[i] += vx[i] * dt; y[i] += vy[i] * dt;
  }
  // spatial grid
  const inv = 1 / h, cols = Math.ceil((2 * ax) * inv) + 3, rows = Math.ceil((2 * ay) * inv) + 3;
  const head = new Int32Array(cols * rows).fill(-1), next = new Int32Array(n);
  const cell = (i) => {
    const cx = Math.min(cols - 1, Math.max(0, Math.floor((x[i] + ax) * inv) + 1));
    const cy = Math.min(rows - 1, Math.max(0, Math.floor((y[i] + ay) * inv) + 1));
    return cy * cols + cx;
  };
  for (let i = 0; i < n; i++) { const c = cell(i); next[i] = head[c]; head[c] = i; }
  for (let i = 0; i < n; i++) {
    const cx = Math.min(cols - 1, Math.max(0, Math.floor((x[i] + ax) * inv) + 1));
    const cy = Math.min(rows - 1, Math.max(0, Math.floor((y[i] + ay) * inv) + 1));
    let rho = 0, rhoN = 0;
    const nb = [], qs = [];
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const c = cy + oy, d = cx + ox;
      if (c < 0 || d < 0 || c >= rows || d >= cols) continue;
      for (let j = head[c * cols + d]; j !== -1; j = next[j]) {
        if (j === i) continue;
        const dx = x[j] - x[i], dy = y[j] - y[i], r2 = dx * dx + dy * dy;
        if (r2 >= h * h) continue;
        const q = 1 - Math.sqrt(r2) * inv;
        rho += q * q; rhoN += q * q * q;
        nb.push(j); qs.push(q);
      }
    }
    const P = K * (rho - REST), PN = KNEAR * rhoN;
    let dxi = 0, dyi = 0;
    for (let m = 0; m < nb.length; m++) {
      const j = nb[m], q = qs[m];
      let dx = x[j] - x[i], dy = y[j] - y[i];
      const r = Math.hypot(dx, dy) || 1e-6;
      dx /= r; dy /= r;
      const D = (P * q + PN * q * q) * h * 0.5;
      x[j] += dx * D * 0.5; y[j] += dy * D * 0.5;
      dxi -= dx * D * 0.5; dyi -= dy * D * 0.5;
    }
    x[i] += dxi; y[i] += dyi;
  }
  const m = h * 0.25;
  for (let i = 0; i < n; i++) {
    if (x[i] < -ax + m) x[i] = -ax + m;
    if (x[i] > ax - m) x[i] = ax - m;
    if (y[i] < -ay + m) y[i] = -ay + m;
    if (y[i] > ay - m) y[i] = ay - m;
    vx[i] = ((x[i] - px[i]) / dt) * 0.995;
    vy[i] = ((y[i] - py[i]) / dt) * 0.995;
    const sp = vx[i] * vx[i] + vy[i] * vy[i];
    if (sp > 16) { const k = 4 / Math.sqrt(sp); vx[i] *= k; vy[i] *= k; }
  }
}
