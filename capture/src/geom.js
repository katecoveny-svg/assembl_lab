// assembl capture · small geometry kit (no dependencies). Row-major 3×3 matrices as plain arrays or
// Float64Array(9); quaternions [x, y, z, w]. Shared by the capture page, the pose solver and the tests.

export const DEG = Math.PI / 180;

export const m3 = {
  I: () => [1, 0, 0, 0, 1, 0, 0, 0, 1],
  mul(a, b) {
    const o = new Array(9);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) o[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
    return o;
  },
  T: (a) => [a[0], a[3], a[6], a[1], a[4], a[7], a[2], a[5], a[8]],
  vec: (a, v) => [a[0] * v[0] + a[1] * v[1] + a[2] * v[2], a[3] * v[0] + a[4] * v[1] + a[5] * v[2], a[6] * v[0] + a[7] * v[1] + a[8] * v[2]],
  det: (a) => a[0] * (a[4] * a[8] - a[5] * a[7]) - a[1] * (a[3] * a[8] - a[5] * a[6]) + a[2] * (a[3] * a[7] - a[4] * a[6]),
  rotX(t) { const c = Math.cos(t), s = Math.sin(t); return [1, 0, 0, 0, c, -s, 0, s, c]; },
  rotY(t) { const c = Math.cos(t), s = Math.sin(t); return [c, 0, s, 0, 1, 0, -s, 0, c]; },
  rotZ(t) { const c = Math.cos(t), s = Math.sin(t); return [c, -s, 0, s, c, 0, 0, 0, 1]; },
  skew: (v) => [0, -v[2], v[1], v[2], 0, -v[0], -v[1], v[0], 0],
};

export const v3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  scale: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  norm: (a) => Math.hypot(a[0], a[1], a[2]),
  unit(a) { const n = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / n, a[1] / n, a[2] / n]; },
};

/** Rodrigues: axis-angle vector → rotation matrix. */
export function expSO3(w) {
  const t = Math.hypot(w[0], w[1], w[2]);
  if (t < 1e-12) { const K = m3.skew(w); return [1 + 0, -w[2], w[1], w[2], 1, -w[0], -w[1], w[0], 1].map((v, i) => (i % 4 === 0 ? 1 : K[i])); }
  const k = [w[0] / t, w[1] / t, w[2] / t], c = Math.cos(t), s = Math.sin(t), C = 1 - c;
  const [x, y, z] = k;
  return [c + x * x * C, x * y * C - z * s, x * z * C + y * s,
    y * x * C + z * s, c + y * y * C, y * z * C - x * s,
    z * x * C - y * s, z * y * C + x * s, c + z * z * C];
}

/** rotation matrix → axis-angle vector. */
export function logSO3(R) {
  const tr = R[0] + R[4] + R[8];
  const c = Math.min(1, Math.max(-1, (tr - 1) / 2));
  const t = Math.acos(c);
  if (t < 1e-9) return [(R[7] - R[5]) / 2, (R[2] - R[6]) / 2, (R[3] - R[1]) / 2];
  if (Math.PI - t < 1e-6) {
    // near 180°: axis from the diagonal
    const x = Math.sqrt(Math.max(0, (R[0] + 1) / 2)), y = Math.sqrt(Math.max(0, (R[4] + 1) / 2)), z = Math.sqrt(Math.max(0, (R[8] + 1) / 2));
    const ax = [x, R[1] >= 0 ? y : -y, R[2] >= 0 ? z : -z];
    return v3.scale(v3.unit(ax), t);
  }
  const s = t / (2 * Math.sin(t));
  return [(R[7] - R[5]) * s, (R[2] - R[6]) * s, (R[3] - R[1]) * s];
}

export const rotAngleDeg = (A, B) => v3.norm(logSO3(m3.mul(m3.T(A), B))) / DEG;

export function quatFromMat3(m) {
  const tr = m[0] + m[4] + m[8];
  let x, y, z, w;
  if (tr > 0) { const S = Math.sqrt(tr + 1) * 2; w = 0.25 * S; x = (m[7] - m[5]) / S; y = (m[2] - m[6]) / S; z = (m[3] - m[1]) / S; }
  else if (m[0] > m[4] && m[0] > m[8]) { const S = Math.sqrt(1 + m[0] - m[4] - m[8]) * 2; w = (m[7] - m[5]) / S; x = 0.25 * S; y = (m[1] + m[3]) / S; z = (m[2] + m[6]) / S; }
  else if (m[4] > m[8]) { const S = Math.sqrt(1 + m[4] - m[0] - m[8]) * 2; w = (m[2] - m[6]) / S; x = (m[1] + m[3]) / S; y = 0.25 * S; z = (m[5] + m[7]) / S; }
  else { const S = Math.sqrt(1 + m[8] - m[0] - m[4]) * 2; w = (m[3] - m[1]) / S; x = (m[2] + m[6]) / S; y = (m[5] + m[7]) / S; z = 0.25 * S; }
  const n = Math.hypot(x, y, z, w);
  return [x / n, y / n, z / n, w / n];
}

export function mat3FromQuat([x, y, z, w]) {
  return [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y),
    2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x),
    2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)];
}

/** Rotation part of a column-major 4×4 (WebGL) as a row-major 3×3, and the translation. */
export function poseFromColumnMajor(m) {
  return { R: [m[0], m[4], m[8], m[1], m[5], m[9], m[2], m[6], m[10]], t: [m[12], m[13], m[14]] };
}
export function columnMajorFromPose(R, t) {
  return [R[0], R[3], R[6], 0, R[1], R[4], R[7], 0, R[2], R[5], R[8], 0, t[0], t[1], t[2], 1];
}

/**
 * W3C DeviceOrientation (alpha, beta, gamma in degrees; Z-X'-Y'' intrinsic, Earth frame x east, y north,
 * z up) plus the screen orientation angle → camera-to-world rotation for the rear camera, with the
 * camera in OpenGL axes (x right, y up, looking down −z) and the world gravity-aligned, +Y up
 * (Earth north becomes −Z). An upright phone in portrait looking north gives the identity.
 */
export function cameraRotationFromDeviceOrientation(alpha, beta, gamma, screenAngleDeg = 0) {
  const Rdev = m3.mul(m3.mul(m3.rotZ(alpha * DEG), m3.rotX(beta * DEG)), m3.rotY(gamma * DEG));
  const earthToYUp = m3.rotX(-90 * DEG);
  const camInDev = m3.rotZ(-screenAngleDeg * DEG);
  return m3.mul(m3.mul(earthToYUp, Rdev), camInDev);
}

/** Gravity direction ("down") in the camera frame, from a camera-to-world rotation in the +Y-up world. */
export const gravityInCamera = (Rc2w) => m3.vec(m3.T(Rc2w), [0, -1, 0]);

/* ---------------- dense linear algebra for small problems ---------------- */

/** Symmetric eigen-decomposition (cyclic Jacobi). A: n×n row-major (copied). Returns {values, vectors (columns)} sorted ascending. */
export function symEig(Ain, n) {
  const A = Float64Array.from(Ain);
  const V = new Float64Array(n * n);
  for (let i = 0; i < n; i++) V[i * n + i] = 1;
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += A[p * n + q] * A[p * n + q];
    if (off < 1e-26) break;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      const apq = A[p * n + q];
      if (Math.abs(apq) < 1e-300) continue;
      const theta = (A[q * n + q] - A[p * n + p]) / (2 * apq);
      const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) {
        const akp = A[k * n + p], akq = A[k * n + q];
        A[k * n + p] = c * akp - s * akq; A[k * n + q] = s * akp + c * akq;
      }
      for (let k = 0; k < n; k++) {
        const apk = A[p * n + k], aqk = A[q * n + k];
        A[p * n + k] = c * apk - s * aqk; A[q * n + k] = s * apk + c * aqk;
      }
      for (let k = 0; k < n; k++) {
        const vkp = V[k * n + p], vkq = V[k * n + q];
        V[k * n + p] = c * vkp - s * vkq; V[k * n + q] = s * vkp + c * vkq;
      }
    }
  }
  const idx = [...Array(n).keys()].sort((a, b) => A[a * n + a] - A[b * n + b]);
  return {
    values: idx.map((i) => A[i * n + i]),
    vectors: idx.map((i) => Array.from({ length: n }, (_, k) => V[k * n + i])),
  };
}

/** SVD of a 3×3 (row-major): A = U diag(S) Vᵀ, S descending; U, V proper or improper as they come. */
export function svd3(A) {
  const AtA = m3.mul(m3.T(A), A);
  const { values, vectors } = symEig(AtA, 3);
  const order = [2, 1, 0];
  const V = new Array(9), U = new Array(9), S = [];
  order.forEach((k, col) => { const v = vectors[k]; V[col] = v[0]; V[3 + col] = v[1]; V[6 + col] = v[2]; S.push(Math.sqrt(Math.max(0, values[k]))); });
  for (let col = 0; col < 3; col++) {
    const v = [V[col], V[3 + col], V[6 + col]];
    let u = m3.vec(A, v);
    const n = v3.norm(u);
    if (n > 1e-12 * (S[0] || 1)) u = v3.scale(u, 1 / n);
    else {
      // complete with the cross product of the other two
      const a = [U[0], U[3], U[6]], b = [U[1], U[4], U[7]];
      u = col === 2 ? v3.unit(v3.cross(a, b)) : [col === 0 ? 1 : 0, col === 1 ? 1 : 0, 0];
    }
    U[col] = u[0]; U[3 + col] = u[1]; U[6 + col] = u[2];
  }
  return { U, S, V };
}

/** Nearest rotation (polar decomposition via SVD). */
export function nearestRotation(M) {
  const { U, V } = svd3(M);
  let R = m3.mul(U, m3.T(V));
  if (m3.det(R) < 0) { const D = [1, 0, 0, 0, 1, 0, 0, 0, -1]; R = m3.mul(m3.mul(U, D), m3.T(V)); }
  return R;
}

/** In-place Cholesky solve of a dense SPD system (n×n row-major A, rhs b). Returns x or null. */
export function choleskySolve(A, b, n) {
  const L = Float64Array.from(A);
  for (let j = 0; j < n; j++) {
    let d = L[j * n + j];
    for (let k = 0; k < j; k++) d -= L[j * n + k] * L[j * n + k];
    if (!(d > 0)) return null;
    const ljj = Math.sqrt(d);
    L[j * n + j] = ljj;
    for (let i = j + 1; i < n; i++) {
      let s = L[i * n + j];
      for (let k = 0; k < j; k++) s -= L[i * n + k] * L[j * n + k];
      L[i * n + j] = s / ljj;
    }
  }
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) { let s = b[i]; for (let k = 0; k < i; k++) s -= L[i * n + k] * y[k]; y[i] = s / L[i * n + i]; }
  const x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) { let s = y[i]; for (let k = i + 1; k < n; k++) s -= L[k * n + i] * x[k]; x[i] = s / L[i * n + i]; }
  return x;
}

/**
 * Similarity (Umeyama) that maps points A onto B: B ≈ s R A + t. A, B: arrays of [x,y,z].
 * Used to align solved camera centres with ground truth (tests) or with gravity-aligned priors.
 */
export function umeyama(A, B, withScale = true) {
  const n = A.length;
  const ma = [0, 0, 0], mb = [0, 0, 0];
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { ma[k] += A[i][k] / n; mb[k] += B[i][k] / n; }
  const S = new Array(9).fill(0);
  let va = 0;
  for (let i = 0; i < n; i++) {
    const a = v3.sub(A[i], ma), b = v3.sub(B[i], mb);
    va += v3.dot(a, a) / n;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) S[r * 3 + c] += (b[r] * a[c]) / n;
  }
  const { U, S: sv, V } = svd3(S);
  const d = m3.det(U) * m3.det(V) < 0 ? -1 : 1;
  const D = [1, 0, 0, 0, 1, 0, 0, 0, d];
  const R = m3.mul(m3.mul(U, D), m3.T(V));
  const s = withScale ? (sv[0] + sv[1] + d * sv[2]) / va : 1;
  const t = v3.sub(mb, v3.scale(m3.vec(R, ma), s));
  return { R, s, t };
}

/** Deterministic PRNG (tests, RANSAC). */
export function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function gaussian(rng) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
