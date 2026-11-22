// Signed-distance sculpting, turned into a triangle mesh by marching cubes. Pure (no three.js), deterministic.
//
// A shape is a function from a point to its signed distance (negative inside). The primitives and operators below
// (smooth union, smooth subtraction, a twist of space, noise on the surface) build sculptural objects in a few
// lines; mesh() samples the function on a grid and polygonises the zero surface.
//
// The marching-cubes case table is not copied in: it is worked out here, once, from the cube's geometry. For each of
// the 256 corner patterns, the contour on each face is traced (a face with two opposite corners inside is split so
// the inside corners stay apart, the same rule on both sides of every face, so neighbouring cells always agree and the
// mesh has no cracks), the face segments are chained into loops, and each loop is fanned into triangles.

export type Vec = [number, number, number];
export type SDF = (x: number, y: number, z: number) => number;

// ---- primitives ------------------------------------------------------------------------------------------------------
export const sphere = (r: number, c: Vec = [0, 0, 0]): SDF => (x, y, z) => Math.hypot(x - c[0], y - c[1], z - c[2]) - r;
/** an ellipsoid (approximate distance, good near the surface) */
export const ellipsoid = (r: Vec, c: Vec = [0, 0, 0]): SDF => (x, y, z) => {
  const px = (x - c[0]) / r[0], py = (y - c[1]) / r[1], pz = (z - c[2]) / r[2];
  const k0 = Math.hypot(px, py, pz), k1 = Math.hypot(px / r[0], py / r[1], pz / r[2]);
  return k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -Math.min(r[0], r[1], r[2]);
};
/** a torus in the xz plane: ring radius R, tube radius r */
export const torus = (R: number, r: number, c: Vec = [0, 0, 0]): SDF => (x, y, z) => Math.hypot(Math.hypot(x - c[0], z - c[2]) - R, y - c[1]) - r;
/** a rounded box with half-sizes b and corner radius r */
export const roundBox = (b: Vec, r: number, c: Vec = [0, 0, 0]): SDF => (x, y, z) => {
  const qx = Math.abs(x - c[0]) - b[0] + r, qy = Math.abs(y - c[1]) - b[1] + r, qz = Math.abs(z - c[2]) - b[2] + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
};
/** a capsule from a to b with radius r */
export const capsule = (a: Vec, b: Vec, r: number): SDF => (x, y, z) => {
  const pax = x - a[0], pay = y - a[1], paz = z - a[2], bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz)));
  return Math.hypot(pax - bax * h, pay - bay * h, paz - baz * h) - r;
};
/** a vertical cylinder of radius r and half-height h */
export const cylinder = (r: number, h: number, c: Vec = [0, 0, 0]): SDF => (x, y, z) => {
  const dx = Math.hypot(x - c[0], z - c[2]) - r, dy = Math.abs(y - c[1]) - h;
  return Math.min(Math.max(dx, dy), 0) + Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
};

// ---- operators -------------------------------------------------------------------------------------------------------
/** smooth union with blend radius k (polynomial smooth minimum) */
export const smoothUnion = (k: number, ...fs: SDF[]): SDF => (x, y, z) => {
  let d = fs[0](x, y, z);
  for (let i = 1; i < fs.length; i++) { const e = fs[i](x, y, z), h = Math.max(k - Math.abs(d - e), 0) / k; d = Math.min(d, e) - h * h * k * 0.25; }
  return d;
};
/** a with b carved out of it, the cut edge rounded by k */
export const smoothSubtract = (k: number, a: SDF, b: SDF): SDF => (x, y, z) => {
  const d1 = a(x, y, z), d2 = -b(x, y, z), h = Math.max(k - Math.abs(d1 - d2), 0) / k;
  return Math.max(d1, d2) + h * h * k * 0.25;
};
export const intersect = (a: SDF, b: SDF): SDF => (x, y, z) => Math.max(a(x, y, z), b(x, y, z));
/** twist space about the y axis by `rate` radians per metre */
export const twist = (rate: number, f: SDF): SDF => (x, y, z) => { const a = rate * y, c = Math.cos(a), s = Math.sin(a); return f(c * x - s * z, y, s * x + c * z); };
/** turn space about y by angle a (radians), then about x by b */
export const rotate = (a: number, b: number, f: SDF): SDF => {
  const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
  return (x, y, z) => { const x1 = ca * x + sa * z, z1 = -sa * x + ca * z, y2 = cb * y - sb * z1, z2 = sb * y + cb * z1; return f(x1, y2, z2); };
};
export const translate = (t: Vec, f: SDF): SDF => (x, y, z) => f(x - t[0], y - t[1], z - t[2]);
/** scale space unevenly (distance corrected by the smallest factor, so it stays a lower bound) */
export const stretch = (s: Vec, f: SDF): SDF => { const m = Math.min(s[0], s[1], s[2]); return (x, y, z) => f(x / s[0], y / s[1], z / s[2]) * m; };
/** move the surface out by amp × a smooth 3D noise of the given frequency: chisel and pitting on stone, hammering on bronze */
export const roughen = (amp: number, freq: number, seed: number, f: SDF): SDF => (x, y, z) => f(x, y, z) - amp * (noise3(x * freq, y * freq, z * freq, seed) - 0.5);

// ---- 3D value noise --------------------------------------------------------------------------------------------------
function h3(x: number, y: number, z: number, s: number) {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(z | 0, 0x1b873593) ^ Math.imul(s | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** smooth 3D value noise in [0, 1] */
export function noise3(x: number, y: number, z: number, seed: number) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const f = (t: number) => t * t * (3 - 2 * t), u = f(x - ix), v = f(y - iy), w = f(z - iz);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  return l(
    l(l(h3(ix, iy, iz, seed), h3(ix + 1, iy, iz, seed), u), l(h3(ix, iy + 1, iz, seed), h3(ix + 1, iy + 1, iz, seed), u), v),
    l(l(h3(ix, iy, iz + 1, seed), h3(ix + 1, iy, iz + 1, seed), u), l(h3(ix, iy + 1, iz + 1, seed), h3(ix + 1, iy + 1, iz + 1, seed), u), v),
    w,
  );
}

// ---- the marching-cubes table, worked out from the cube ------------------------------------------------------------------
// corners: bit 0 x, bit 1 y, bit 2 z. edges: the 12 pairs of corners one bit apart.
const CORNER: Vec[] = [0, 1, 2, 3, 4, 5, 6, 7].map((c) => [c & 1, (c >> 1) & 1, (c >> 2) & 1] as Vec);
const EDGES: [number, number][] = [];
for (let a = 0; a < 8; a++) for (const bit of [1, 2, 4]) if (!(a & bit)) EDGES.push([a, a | bit]);
const edgeOf = (a: number, b: number) => EDGES.findIndex(([p, q]) => (p === a && q === b) || (p === b && q === a));
// faces as corner loops, wound counter-clockwise seen from outside the cube
const FACES: number[][] = [
  [0, 4, 6, 2], [1, 3, 7, 5], // x = 0, x = 1
  [0, 1, 5, 4], [2, 6, 7, 3], // y = 0, y = 1
  [0, 2, 3, 1], [4, 5, 7, 6], // z = 0, z = 1
];
/** for each corner pattern (bit c set = corner c inside), the triangles as triples of edge numbers */
export const TRI_TABLE: number[][] = (() => {
  const table: number[][] = [];
  for (let m = 0; m < 256; m++) {
    const inside = (c: number) => ((m >> c) & 1) === 1;
    // directed segments on each face: from the edge where the contour enters to where it leaves, inside on the left
    const segs: [number, number][] = [];
    for (const F of FACES) {
      const cross: { e: number; out: boolean }[] = [];
      for (let k = 0; k < 4; k++) {
        const a = F[k], b = F[(k + 1) % 4];
        if (inside(a) !== inside(b)) cross.push({ e: edgeOf(a, b), out: inside(a) }); // out: walking a→b we leave the inside
      }
      if (cross.length === 2) {
        const [p, q] = cross;
        segs.push(p.out ? [p.e, q.e] : [q.e, p.e]);
      } else if (cross.length === 4) {
        // a saddle face: cut off each inside corner on its own
        for (let k = 0; k < 4; k++) {
          const c = F[k];
          if (!inside(c)) continue;
          const prev = F[(k + 3) % 4], next = F[(k + 1) % 4];
          segs.push([edgeOf(c, next), edgeOf(prev, c)]);
        }
      }
    }
    // chain the segments into loops and fan each loop
    const tris: number[] = [];
    const left = [...segs];
    while (left.length) {
      const loop = [left[0][0], left[0][1]];
      left.splice(0, 1);
      for (let guard = 0; guard < 16 && loop[loop.length - 1] !== loop[0]; guard++) {
        const at = left.findIndex((s) => s[0] === loop[loop.length - 1]);
        if (at < 0) break;
        loop.push(left[at][1]);
        left.splice(at, 1);
      }
      loop.pop();
      for (let k = 1; k + 1 < loop.length; k++) tris.push(loop[0], loop[k + 1], loop[k]);
    }
    table.push(tris);
  }
  return table;
})();

export interface Mesh { positions: Float32Array; normals: Float32Array; indices: Uint32Array }
/**
 * Sample f on a grid over [min, max] with cells of `cell` metres and return the zero surface as an indexed mesh with
 * smooth normals (from the distance field's gradient). Vertices on shared cell edges are shared, so the mesh is closed
 * wherever the shape lies inside the box.
 */
export function mesh(f: SDF, min: Vec, max: Vec, cell: number): Mesh {
  const nx = Math.max(2, Math.ceil((max[0] - min[0]) / cell) + 1), ny = Math.max(2, Math.ceil((max[1] - min[1]) / cell) + 1), nz = Math.max(2, Math.ceil((max[2] - min[2]) / cell) + 1);
  const val = new Float32Array(nx * ny * nz);
  const at = (i: number, j: number, k: number) => (k * ny + j) * nx + i;
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) val[at(i, j, k)] = f(min[0] + i * cell, min[1] + j * cell, min[2] + k * cell);
  const pos: number[] = [], idx: number[] = [];
  const shared = new Map<number, number>();
  // a grid edge: its lower grid point and its direction (0 x, 1 y, 2 z)
  const vertexOn = (i: number, j: number, k: number, dir: number) => {
    const key = at(i, j, k) * 3 + dir;
    const got = shared.get(key);
    if (got !== undefined) return got;
    const a = val[at(i, j, k)], b = dir === 0 ? val[at(i + 1, j, k)] : dir === 1 ? val[at(i, j + 1, k)] : val[at(i, j, k + 1)];
    const t = Math.abs(a - b) < 1e-12 ? 0.5 : a / (a - b);
    const p: Vec = [min[0] + i * cell, min[1] + j * cell, min[2] + k * cell];
    p[dir] += t * cell;
    const id = pos.length / 3;
    pos.push(p[0], p[1], p[2]);
    shared.set(key, id);
    return id;
  };
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let m = 0;
    for (let c = 0; c < 8; c++) if (val[at(i + (c & 1), j + ((c >> 1) & 1), k + ((c >> 2) & 1))] < 0) m |= 1 << c;
    if (m === 0 || m === 255) continue;
    const tris = TRI_TABLE[m];
    for (const e of tris) {
      const [a, b] = EDGES[e], ca = CORNER[a], cb = CORNER[b], dir = ca[0] !== cb[0] ? 0 : ca[1] !== cb[1] ? 1 : 2;
      idx.push(vertexOn(i + Math.min(ca[0], cb[0]), j + Math.min(ca[1], cb[1]), k + Math.min(ca[2], cb[2]), dir));
    }
  }
  // normals from the field's gradient; triangles turned to face the same way
  const positions = new Float32Array(pos), normals = new Float32Array(pos.length), e = cell * 0.5;
  for (let v = 0; v < pos.length; v += 3) {
    const x = pos[v], y = pos[v + 1], z = pos[v + 2];
    const gx = f(x + e, y, z) - f(x - e, y, z), gy = f(x, y + e, z) - f(x, y - e, z), gz = f(x, y, z + e) - f(x, y, z - e), l = Math.hypot(gx, gy, gz) || 1;
    normals[v] = gx / l; normals[v + 1] = gy / l; normals[v + 2] = gz / l;
  }
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2], vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
    if (fx * (normals[a] + normals[b] + normals[c]) + fy * (normals[a + 1] + normals[b + 1] + normals[c + 1]) + fz * (normals[a + 2] + normals[b + 2] + normals[c + 2]) < 0) { const s = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = s; }
  }
  return { positions, normals, indices: new Uint32Array(idx) };
}

/** how many mesh edges are used by other than exactly two triangles (0 for a closed surface) */
export function openEdges(m: Mesh) {
  const count = new Map<string, number>();
  for (let t = 0; t < m.indices.length; t += 3) for (let k = 0; k < 3; k++) {
    const a = m.indices[t + k], b = m.indices[t + ((k + 1) % 3)], key = a < b ? `${a},${b}` : `${b},${a}`;
    count.set(key, (count.get(key) ?? 0) + 1);
  }
  let bad = 0;
  for (const c of count.values()) if (c !== 2) bad++;
  return bad;
}
