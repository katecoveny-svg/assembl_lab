// Signed-distance sculpting turned into a mesh: sample an SDF on a grid and extract its zero surface with surface nets
// (one vertex per boundary cell at the mean of its edge crossings, one quad per crossing edge), then normals from the
// SDF's gradient. Pure arrays, no three.js, so it is tested under node.

export type SDF = (x: number, y: number, z: number) => number;

export interface Mesh { positions: Float32Array; normals: Float32Array; indices: Uint32Array }

export function surfaceNets(f: SDF, min: [number, number, number], max: [number, number, number], res: number): Mesh {
  const nx = res, ny = Math.max(2, Math.round((res * (max[1] - min[1])) / (max[0] - min[0]))), nz = Math.max(2, Math.round((res * (max[2] - min[2])) / (max[0] - min[0])));
  const sx = (max[0] - min[0]) / nx, sy = (max[1] - min[1]) / ny, sz = (max[2] - min[2]) / nz;
  const V = new Float32Array((nx + 1) * (ny + 1) * (nz + 1));
  const at = (i: number, j: number, k: number) => (k * (ny + 1) + j) * (nx + 1) + i;
  for (let k = 0; k <= nz; k++) for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) V[at(i, j, k)] = f(min[0] + i * sx, min[1] + j * sy, min[2] + k * sz);
  const cellV = new Int32Array(nx * ny * nz).fill(-1);
  const cell = (i: number, j: number, k: number) => (k * ny + j) * nx + i;
  const P: number[] = [];
  const corners = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const d = new Float32Array(8);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    let inside = 0;
    for (let c = 0; c < 8; c++) { d[c] = V[at(i + corners[c][0], j + corners[c][1], k + corners[c][2])]; if (d[c] < 0) inside++; }
    if (inside === 0 || inside === 8) continue;
    let px = 0, py = 0, pz = 0, n = 0;
    for (const [a, b] of edges) {
      if ((d[a] < 0) === (d[b] < 0)) continue;
      const t = d[a] / (d[a] - d[b]);
      px += corners[a][0] + (corners[b][0] - corners[a][0]) * t; py += corners[a][1] + (corners[b][1] - corners[a][1]) * t; pz += corners[a][2] + (corners[b][2] - corners[a][2]) * t; n++;
    }
    cellV[cell(i, j, k)] = P.length / 3;
    P.push(min[0] + (i + px / n) * sx, min[1] + (j + py / n) * sy, min[2] + (k + pz / n) * sz);
  }
  const I: number[] = [];
  // a quad for every grid edge whose ends differ in sign, joining the four cells that share it
  const quad = (a: number, b: number, c: number, e: number, flip: boolean) => {
    if (a < 0 || b < 0 || c < 0 || e < 0) return;
    if (flip) I.push(a, c, b, b, c, e); else I.push(a, b, c, b, e, c);
  };
  for (let k = 1; k < nz; k++) for (let j = 1; j < ny; j++) for (let i = 0; i < nx; i++) {
    const s0 = V[at(i, j, k)] < 0, s1 = V[at(i + 1, j, k)] < 0; if (s0 === s1) continue;
    quad(cellV[cell(i, j - 1, k - 1)], cellV[cell(i, j, k - 1)], cellV[cell(i, j - 1, k)], cellV[cell(i, j, k)], s0);
  }
  for (let k = 1; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 1; i < nx; i++) {
    const s0 = V[at(i, j, k)] < 0, s1 = V[at(i, j + 1, k)] < 0; if (s0 === s1) continue;
    quad(cellV[cell(i - 1, j, k - 1)], cellV[cell(i - 1, j, k)], cellV[cell(i, j, k - 1)], cellV[cell(i, j, k)], s0);
  }
  for (let k = 0; k < nz; k++) for (let j = 1; j < ny; j++) for (let i = 1; i < nx; i++) {
    const s0 = V[at(i, j, k)] < 0, s1 = V[at(i, j, k + 1)] < 0; if (s0 === s1) continue;
    quad(cellV[cell(i - 1, j - 1, k)], cellV[cell(i, j - 1, k)], cellV[cell(i - 1, j, k)], cellV[cell(i, j, k)], s0);
  }
  const positions = new Float32Array(P), normals = new Float32Array(P.length);
  const h = Math.min(sx, sy, sz) * 0.5;
  for (let v = 0; v < positions.length; v += 3) {
    const x = positions[v], y = positions[v + 1], z = positions[v + 2];
    let gx = f(x + h, y, z) - f(x - h, y, z), gy = f(x, y + h, z) - f(x, y - h, z), gz = f(x, y, z + h) - f(x, y, z - h);
    const l = Math.hypot(gx, gy, gz) || 1; gx /= l; gy /= l; gz /= l;
    normals[v] = gx; normals[v + 1] = gy; normals[v + 2] = gz;
  }
  // wind every triangle so its face points the way the SDF grows (outwards)
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
    const ux = positions[b] - positions[a], uy = positions[b + 1] - positions[a + 1], uz = positions[b + 2] - positions[a + 2];
    const vx = positions[c] - positions[a], vy = positions[c + 1] - positions[a + 1], vz = positions[c + 2] - positions[a + 2];
    const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
    const nx = normals[a] + normals[b] + normals[c], ny = normals[a + 1] + normals[b + 1] + normals[c + 1], nz = normals[a + 2] + normals[b + 2] + normals[c + 2];
    if (fx * nx + fy * ny + fz * nz < 0) { const k = I[t + 1]; I[t + 1] = I[t + 2]; I[t + 2] = k; }
  }
  return { positions, normals, indices: new Uint32Array(I) };
}

// ---- SDF building blocks ----
export const smin = (a: number, b: number, k: number) => { const h = Math.max(0, Math.min(1, 0.5 + (0.5 * (b - a)) / k)); return b * (1 - h) + a * h - k * h * (1 - h); };
export const smax = (a: number, b: number, k: number) => -smin(-a, -b, k);

/**
 * A thrown stoneware vessel, sculpted: a lobed, gently twisting body of revolution, hollow with a rolled lip, on a
 * foot. Height `H` metres. Outer radius profile is a sum of smooth bumps (belly, shoulder, neck).
 */
export function vesselSDF(H = 0.3): SDF {
  const prof = (t: number) => {
    // t = y / H in [0, 1]
    const belly = 0.36 * Math.exp(-(((t - 0.36) / 0.26) ** 2));
    const neck = 0.16 + 0.05 * Math.exp(-(((t - 0.9) / 0.08) ** 2));
    return (Math.max(neck, 0.13 + belly) + 0.02 * Math.sin(t * 9)) * H * 0.62;
  };
  return (x, y, z) => {
    const t = y / H, th = Math.atan2(z, x);
    const lobes = 1 + 0.07 * Math.sin(5 * th + 2.6 * t) * Math.sin(Math.PI * Math.min(1, Math.max(0, t)));
    const r = prof(Math.min(1, Math.max(0, t))) * lobes;
    const q = Math.hypot(x, z);
    const outer = (q - r) * 0.8;
    const caps = smax(-y, y - H, 0.006);
    const body = smax(outer, caps, 0.01);
    // hollow from the lip down to a thick base, wall 8 mm, lip rolled by the smooth blend
    const inner = smax((q - (r - 0.008)) * 0.8, 0.025 - y, 0.006);
    return smax(body, -inner, 0.004);
  };
}
