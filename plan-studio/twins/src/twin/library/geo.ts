import * as THREE from 'three/webgpu';
import { type Mesh } from './sdf';
import { rng, pnoise } from './ptex';

// Geometry for the library pieces, built in code at real size (metres), with UVs in metres so the ptex maps sit at
// their true scale. Soft goods get their shape from height fields: crowns, bulges and wrinkles pushed out along the
// surface normal (cushions, pillows, the duvet, the folded throw); timber gets bevelled edges and grain that wraps
// round each edge the way it does on a solid board.

export type V3 = [number, number, number];
const clamp = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

/** samples along one axis of a rounded box: dense through each rounded edge (equal angle steps), even in between */
function axis(H: number, r: number, seg: number, step: number) {
  const out: number[] = [];
  const inner = H - r;
  for (let k = 0; k <= seg; k++) out.push(-inner - r * Math.tan((Math.PI / 4) * (1 - k / seg)));
  const n = Math.max(1, Math.ceil((2 * inner) / step));
  for (let k = 1; k < n; k++) out.push(-inner + (2 * inner * k) / n);
  for (let k = seg; k >= 0; k--) out.push(inner + r * Math.tan((Math.PI / 4) * (1 - k / seg)));
  return out;
}

interface FaceSpec { n: V3; a: 0 | 1 | 2; b: 0 | 1 | 2 }
const FACES: FaceSpec[] = [
  { n: [0, 1, 0], a: 0, b: 2 }, { n: [0, -1, 0], a: 0, b: 2 },
  { n: [1, 0, 0], a: 2, b: 1 }, { n: [-1, 0, 0], a: 2, b: 1 },
  { n: [0, 0, 1], a: 0, b: 1 }, { n: [0, 0, -1], a: 0, b: 1 },
];

export interface RoundedOpts { seg?: number; step?: number; along?: 'x' | 'z'; end?: boolean; skipBottom?: boolean }
/**
 * A box w × h × d (x, y, z) centred on the origin with every edge rounded to radius r. along: the axis the grain (u)
 * runs along; the four long faces unfold round that axis so the grain carries over each edge. end: the two end faces
 * go in material group 1 (an end-grain material).
 */
export function roundedBox(w: number, h: number, d: number, r: number, o: RoundedOpts = {}) {
  const half: V3 = [w / 2, h / 2, d / 2];
  r = Math.max(0.0005, Math.min(r, half[0] * 0.98, half[1] * 0.98, half[2] * 0.98));
  const seg = o.seg ?? 4, step = o.step ?? 0.05, along = o.along === 'z' ? 2 : 0, other = along === 0 ? 2 : 0;
  const S = [axis(half[0], r, seg, step), axis(half[1], r, seg, step), axis(half[2], r, seg, step)];
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = [];
  const groups: [number, number, number][] = [];
  const HB = half[other], HY = half[1];
  for (const F of FACES) {
    if (o.skipBottom && F.n[1] < 0) continue;
    const fa = S[F.a], fb = S[F.b], base = pos.length / 3, start = idx.length;
    const ax = F.n.findIndex((c) => c !== 0), sgn = F.n[ax];
    for (let j = 0; j < fb.length; j++) for (let i = 0; i < fa.length; i++) {
      const p: V3 = [0, 0, 0];
      p[ax] = sgn * half[ax]; p[F.a] = fa[i]; p[F.b] = fb[j];
      const inner: V3 = [clamp(p[0], -(half[0] - r), half[0] - r), clamp(p[1], -(half[1] - r), half[1] - r), clamp(p[2], -(half[2] - r), half[2] - r)];
      let nx = p[0] - inner[0], ny = p[1] - inner[1], nz = p[2] - inner[2];
      const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      const q: V3 = [inner[0] + nx * r, inner[1] + ny * r, inner[2] + nz * r];
      pos.push(q[0], q[1], q[2]); nor.push(nx, ny, nz);
      // UVs in metres; round the grain axis the four long faces unfold one after the other
      // (c: how far short of the box's edge the seam between two faces lies, so v carries straight over it)
      const c = 0.2929 * r, oo = q[other] * (along === 0 ? 1 : -1);
      if (ax === along) uv.push(q[other], q[1]);
      else if (ax === 1) uv.push(q[along], sgn > 0 ? oo + HB : 3 * HB + 2 * HY - 4 * c - oo);
      else if ((along === 0 ? sgn : -sgn) > 0) uv.push(q[along], 2 * HB + HY - 2 * c - q[1]);
      else uv.push(q[along], 4 * HB + 3 * HY - 6 * c + q[1]);
    }
    const W = fa.length;
    for (let j = 0; j < fb.length - 1; j++) for (let i = 0; i < W - 1; i++) {
      const a0 = base + j * W + i, a1 = a0 + 1, b0 = a0 + W, b1 = b0 + 1;
      // wind so the face looks outwards
      const flip = (F.a === 0 && F.b === 2 ? -1 : 1) * (F.a === 2 && F.b === 1 ? -1 : 1) * sgn < 0;
      if (flip) idx.push(a0, a1, b0, a1, b1, b0); else idx.push(a0, b0, a1, a1, b0, b1);
    }
    groups.push([start, idx.length - start, o.end && ax === along ? 1 : 0]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  if (o.end) for (const [s, c, m] of groups) g.addGroup(s, c, m);
  fixWinding(g);
  return g;
}

/** turn over any triangle whose winding disagrees with its vertex normals */
export function fixWinding(g: THREE.BufferGeometry) {
  const p = g.getAttribute('position'), n = g.getAttribute('normal'), I = g.getIndex();
  if (!I || !n) return g;
  const ix = I.array as Uint32Array | Uint16Array;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), m = new THREE.Vector3();
  for (let t = 0; t < ix.length; t += 3) {
    a.fromBufferAttribute(p, ix[t]); b.fromBufferAttribute(p, ix[t + 1]); c.fromBufferAttribute(p, ix[t + 2]);
    const f = b.sub(a).cross(c.sub(a));
    m.set(n.getX(ix[t]) + n.getX(ix[t + 1]) + n.getX(ix[t + 2]), n.getY(ix[t]) + n.getY(ix[t + 1]) + n.getY(ix[t + 2]), n.getZ(ix[t]) + n.getZ(ix[t + 1]) + n.getZ(ix[t + 2]));
    if (f.dot(m) < 0) { const s = ix[t + 1]; ix[t + 1] = ix[t + 2]; ix[t + 2] = s; }
  }
  I.needsUpdate = true;
  return g;
}

/** vertex normals averaged over every vertex at the same place (so faces built apart shade as one surface) */
export function smoothNormals(g: THREE.BufferGeometry, q = 1e-5) {
  const p = g.getAttribute('position'), I = g.getIndex();
  const N = new Float32Array(p.count * 3), key = new Map<string, number>(), rep = new Int32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    const k = `${Math.round(p.getX(i) / q)},${Math.round(p.getY(i) / q)},${Math.round(p.getZ(i) / q)}`;
    let r = key.get(k); if (r === undefined) { r = i; key.set(k, i); } rep[i] = r;
  }
  const ix = I ? (I.array as ArrayLike<number>) : Array.from({ length: p.count }, (_, i) => i);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let t = 0; t < ix.length; t += 3) {
    a.fromBufferAttribute(p, ix[t]); b.fromBufferAttribute(p, ix[t + 1]); c.fromBufferAttribute(p, ix[t + 2]);
    const f = b.clone().sub(a).cross(c.clone().sub(a)); // area weighted
    for (const v of [ix[t], ix[t + 1], ix[t + 2]]) { const r = rep[v] * 3; N[r] += f.x; N[r + 1] += f.y; N[r + 2] += f.z; }
  }
  const out = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const r = rep[i] * 3, l = Math.hypot(N[r], N[r + 1], N[r + 2]) || 1; out[i * 3] = N[r] / l; out[i * 3 + 1] = N[r + 1] / l; out[i * 3 + 2] = N[r + 2] / l; }
  g.setAttribute('normal', new THREE.Float32BufferAttribute(out, 3));
  return g;
}

/** UVs in metres by projecting each vertex onto the plane its normal faces most (for sculpted and soft forms) */
export function boxUV(g: THREE.BufferGeometry, scale = 1) {
  const p = g.getAttribute('position'), n = g.getAttribute('normal'), uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    const [u, v] = ay >= ax && ay >= az ? [p.getX(i), p.getZ(i)] : ax >= az ? [p.getZ(i), p.getY(i)] : [p.getX(i), p.getY(i)];
    uv[i * 2] = u * scale; uv[i * 2 + 1] = v * scale;
  }
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

/** an SDF mesh (sdf.ts) as a three.js geometry, with box-projected UVs in metres */
export function fromSdf(m: Mesh) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(m.positions, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(m.normals, 3));
  g.setIndex(new THREE.BufferAttribute(m.indices, 1));
  return boxUV(g);
}

/** a lathe (turned) form from [radius, height] points, UVs in metres (u round the widest girth, v up the profile) */
export function lathe(profile: [number, number][], segs = 64) {
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 1e-4), y)), segs);
  const rmax = Math.max(...profile.map((p) => p[0]));
  const len = [0];
  for (let i = 1; i < profile.length; i++) len.push(len[i - 1] + Math.hypot(profile[i][0] - profile[i - 1][0], profile[i][1] - profile[i - 1][1]));
  const uv = g.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) {
    const j = Math.round(uv.getY(i) * (profile.length - 1));
    uv.setXY(i, uv.getX(i) * Math.PI * 2 * rmax, len[Math.min(j, len.length - 1)]);
  }
  return g;
}

/** a tube through points (Catmull-Rom), UVs in metres (u along, v round) */
export function tube(points: V3[], radius: number, o: { radial?: number; per?: number; closed?: boolean } = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), o.closed ?? false, 'centripetal');
  const L = curve.getLength(), seg = Math.max(4, Math.ceil(L / (o.per ?? 0.01)));
  const g = new THREE.TubeGeometry(curve, seg, radius, o.radial ?? 8, o.closed ?? false);
  const uv = g.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * L, uv.getY(i) * Math.PI * 2 * radius);
  return g;
}

/** a grid over [0, w] × [0, d] (cell `step`), mapped through fn(s, t) → position; UVs are (s, t) in metres */
export function sheet(w: number, d: number, step: number, fn: (s: number, t: number) => V3, stepT = step) {
  const nx = Math.max(2, Math.ceil(w / step) + 1), nz = Math.max(2, Math.ceil(d / stepT) + 1);
  const pos = new Float32Array(nx * nz * 3), uv = new Float32Array(nx * nz * 2), idx: number[] = [];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const s = (w * i) / (nx - 1), t = (d * j) / (nz - 1), p = fn(s, t), k = j * nx + i;
    pos[k * 3] = p[0]; pos[k * 3 + 1] = p[1]; pos[k * 3 + 2] = p[2]; uv[k * 2] = s; uv[k * 2 + 1] = t;
  }
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i; idx.push(a, a + nx, a + 1, a + 1, a + nx, a + nx + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ---- folds: soft ridges and hollows that a height field pushes out along the surface ---------------------------------------
export interface Fold { a: V3; b: V3; w: number; amp: number }
/** the displacement the folds give at p: each a ridge along a segment, tapering to nothing at both ends */
export function foldAt(folds: Fold[], x: number, y: number, z: number) {
  let s = 0;
  for (const f of folds) {
    const bx = f.b[0] - f.a[0], by = f.b[1] - f.a[1], bz = f.b[2] - f.a[2], L2 = bx * bx + by * by + bz * bz || 1;
    const t = clamp(((x - f.a[0]) * bx + (y - f.a[1]) * by + (z - f.a[2]) * bz) / L2);
    const dx = x - f.a[0] - bx * t, dy = y - f.a[1] - by * t, dz = z - f.a[2] - bz * t, d2 = (dx * dx + dy * dy + dz * dz) / (f.w * f.w);
    if (d2 > 9) continue;
    s += f.amp * Math.exp(-d2) * Math.sin(Math.PI * t) ** 0.7;
  }
  return s;
}

// ---- cushions ----------------------------------------------------------------------------------------------------------
export interface CushionOpts {
  /** edge radius */
  r?: number;
  /** rise of the top at its centre, and of the underside */
  crown?: number; under?: number;
  /** side panels bow out by this much at mid height */
  bulge?: number;
  /** extra roll-down of the front (+z) edge, as a sat-in seat has */
  front?: number;
  /** wrinkles: pull lines from the corners and creases across the front */
  wrinkle?: number;
  /** soft unevenness of the fill */
  lump?: number;
  /** welt radius (0: none) */
  piping?: number;
  seed?: number;
  /** grid step on the faces (metres) */
  step?: number;
  /** leave out the underside (it rests on something) */
  open?: boolean;
}
/**
 * An upholstered box cushion w × h × d centred on the origin: rounded edges, a crowned top, bowed sides, a rolled
 * front, fill lumps and wrinkles from a seeded fold field. Returns the cushion and its welts (piping), each a geometry.
 */
export function cushion(w: number, h: number, d: number, o: CushionOpts = {}) {
  const seed = o.seed ?? 1, R = rng(seed), hw = w / 2, hh = h / 2, hd = d / 2;
  const r = Math.min(o.r ?? h * 0.35, hh * 0.95, hw * 0.5, hd * 0.5), crown = o.crown ?? h * 0.18, under = o.under ?? 0, bulge = o.bulge ?? h * 0.05, front = o.front ?? 0, lump = o.lump ?? 0.004, wr = o.wrinkle ?? 1;
  const g = roundedBox(w, h, d, r, { seg: 4, step: o.step ?? 0.016, skipBottom: o.open });
  // folds: pull lines running in from each top corner, a few long soft folds, creases along a sat-in front
  const folds: Fold[] = [];
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    const k = R.int(2, 4);
    for (let i = 0; i < k; i++) {
      const ang = Math.atan2(-sz * hd, -sx * hw) + R.range(-0.5, 0.5), len = R.range(0.06, 0.2) * Math.min(1, (w + d) / 1.4);
      const ax = sx * (hw - r * 0.3), az = sz * (hd - r * 0.3);
      folds.push({ a: [ax, hh, az], b: [ax + Math.cos(ang) * len, hh + crown * 0.5, az + Math.sin(ang) * len], w: R.range(0.006, 0.012), amp: R.range(0.0015, 0.004) * wr * (R.next() < 0.3 ? -1 : 1) });
      // and down the side from the same corner
      folds.push({ a: [ax, hh - r * 0.4, az], b: [ax + sx * 0.004, hh - r * 0.4 - R.range(0.03, 0.08), az + sz * 0.004], w: 0.006, amp: R.range(0.001, 0.0025) * wr });
    }
  }
  for (let i = 0; i < 3; i++) { const x0 = R.range(-hw * 0.7, hw * 0.7), z0 = R.range(-hd * 0.7, hd * 0.7), a = R.range(0, Math.PI), L = R.range(0.1, 0.3); folds.push({ a: [x0, hh + crown, z0], b: [x0 + Math.cos(a) * L, hh + crown, z0 + Math.sin(a) * L], w: R.range(0.02, 0.04), amp: R.range(0.001, 0.003) * wr }); }
  if (front > 0) for (let i = 0; i < 4; i++) { const x0 = R.range(-hw * 0.85, hw * 0.6), L = R.range(0.12, 0.35); folds.push({ a: [x0, hh, hd - r * 0.5], b: [x0 + L, hh - 0.01, hd - R.range(0, 0.02)], w: R.range(0.007, 0.014), amp: R.range(0.002, 0.004) * wr }); }
  const disp = (x: number, y: number, z: number, nx: number, ny: number, nz: number): V3 => {
    const ux = clamp(1 - (x / hw) ** 2), uz = clamp(1 - (z / hd) ** 2), top = smooth(0.2, 0.9, ny), bot = smooth(0.2, 0.9, -ny), side = 1 - Math.abs(ny);
    let dy = crown * Math.pow(ux * uz, 0.6) * top - under * Math.pow(ux * uz, 0.6) * bot;
    const t = clamp((z - (hd - 0.14)) / 0.14);
    dy -= front * t * t * (y > 0 ? 1 : 0.3);
    const b = bulge * Math.sin(Math.PI * clamp((y + hh) / h)) * side;
    const l = lump * (pnoise(x * 9 + 3.1, z * 9 + 1.7, 64, 64, seed) - 0.5 + (pnoise(x * 23, z * 23 + y * 17, 256, 256, seed + 1) - 0.5) * 0.4);
    const f = foldAt(folds, x, y, z) + l;
    return [x + nx * (b + f), y + dy + ny * f, z + nz * (b + f)];
  };
  const p = g.getAttribute('position'), n = g.getAttribute('normal');
  for (let i = 0; i < p.count; i++) { const q = disp(p.getX(i), p.getY(i), p.getZ(i), n.getX(i), n.getY(i), n.getZ(i)); p.setXYZ(i, q[0], q[1], q[2]); }
  smoothNormals(g);
  boxUVKeep(g);
  // welts round the top and bottom seams, following the same shape
  let piping: THREE.BufferGeometry | null = null;
  if (o.piping) {
    const parts: THREE.BufferGeometry[] = [];
    for (const sy of [1, -1]) {
      const pts: V3[] = [], rr = r * 0.707, ix = hw - r, iz = hd - r, yy = sy * (hh - r + rr);
      const corner = (cx: number, cz: number, a0: number) => { for (let k = 0; k < 6; k++) { const a = a0 + (k / 6) * (Math.PI / 2); pts.push([cx + Math.cos(a) * rr, yy, cz + Math.sin(a) * rr]); } };
      const edge = (x0: number, z0: number, x1: number, z1: number) => { const m = Math.max(2, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.03)); for (let k = 0; k < m; k++) pts.push([x0 + ((x1 - x0) * k) / m, yy, z0 + ((z1 - z0) * k) / m]); };
      edge(ix + rr, -iz, ix + rr, iz); corner(ix, iz, 0); edge(ix, iz + rr, -ix, iz + rr); corner(-ix, iz, Math.PI / 2);
      edge(-ix - rr, iz, -ix - rr, -iz); corner(-ix, -iz, Math.PI); edge(-ix, -iz - rr, ix, -iz - rr); corner(ix, -iz, Math.PI * 1.5);
      const moved = pts.map(([x, y, z]) => { const l = Math.hypot(x, z) || 1, nn = 0.707; return disp(x, y, z, (x / l) * nn, sy * nn, (z / l) * nn); });
      parts.push(tube(moved, o.piping, { radial: 6, per: 0.012, closed: true }));
    }
    piping = merge(parts);
  }
  return { geo: g, piping };
}
/** box UVs that keep the existing UV wherever a face is flat (roundedBox already unfolded them); here: all re-projected */
function boxUVKeep(g: THREE.BufferGeometry) { return boxUV(g); }

/**
 * A scatter cushion or pillow standing in the x-y plane: two plump faces meeting at a seam, ears at the corners and
 * creases radiating from each corner where the cover is pulled tight.
 */
export function pillow(w: number, h: number, t: number, o: { seed?: number; step?: number; crease?: number; chop?: number; welt?: number } = {}) {
  const seed = o.seed ?? 1, R = rng(seed), step = o.step ?? 0.012, crease = o.crease ?? 1, chop = o.chop ?? 0;
  const nx = Math.ceil(w / step), ny = Math.ceil(h / step);
  const rays = [0, 1, 2, 3].map(() => ({ k: R.int(5, 8), ph: R.range(0, Math.PI * 2), amp: R.range(0.6, 1) }));
  const pos: number[] = [], idx: number[] = [];
  for (const side of [1, -1]) {
    const base = pos.length / 3;
    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
      // closer spacing towards the seam, where the surface turns fastest
      const u = -Math.cos((i / nx) * Math.PI), v = -Math.cos((j / ny) * Math.PI);
      const fill = Math.pow(clamp(1 - Math.abs(u) ** 2.6), 0.5) * Math.pow(clamp(1 - Math.abs(v) ** 2.6), 0.5);
      // the seam is drawn in along each side, leaving the corners as ears
      const pinchX = 1 - 0.07 * Math.sin(Math.PI * (v * 0.5 + 0.5)) ** 2, pinchY = 1 - 0.07 * Math.sin(Math.PI * (u * 0.5 + 0.5)) ** 2;
      let x = (u * w) / 2 * pinchX, y = (v * h) / 2 * pinchY;
      let z = side * (t / 2) * fill;
      // creases from each corner
      let cr = 0;
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([cx, cy], k) => {
        const dx = u - cx, dy = v - cy, dist = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
        cr += rays[k].amp * Math.exp(-dist / 0.35) * Math.sin(ang * rays[k].k * 2 + rays[k].ph) * clamp(dist / 0.08);
      });
      z += side * cr * 0.006 * crease * fill ** 0.3;
      if (chop > 0) { const c = Math.exp(-(u * u) / 0.01) * chop * 0.4; z -= side * c * t * fill; }
      z += side * (pnoise(u * 3 + 5, v * 3, 64, 64, seed + (side > 0 ? 0 : 9)) - 0.5) * 0.004 * fill;
      pos.push(x, y, z);
    }
    const W = nx + 1;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const a = base + j * W + i, b = a + 1, c = a + W, e = c + 1;
      if (side > 0) idx.push(a, b, c, b, e, c); else idx.push(a, c, b, b, c, e);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  smoothNormals(g);
  const uv = new Float32Array((pos.length / 3) * 2);
  for (let i = 0; i < pos.length / 3; i++) { uv[i * 2] = pos[i * 3]; uv[i * 2 + 1] = pos[i * 3 + 1]; }
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

// ---- the duvet: a quilt lying on the mattress and falling over its sides --------------------------------------------
/**
 * A cloth of size cw × cl laid centred over a top of w × l at height y0, its edges rolling over a radius `roll` and
 * hanging down; the corners flare. Folds: gravity pleats in the hanging parts, soft lumps and long folds on top.
 * Returns the cloth as one sheet (UVs in metres of cloth) and its hem path for a rolled-edge tube.
 */
export function drape(w: number, l: number, cw: number, cl: number, y0: number, o: { roll?: number; seed?: number; step?: number; pleats?: number; lumps?: number; back?: number; turn?: number } = {}) {
  const roll = o.roll ?? 0.05, seed = o.seed ?? 1, R = rng(seed), pleat = o.pleats ?? 1, lumps = o.lumps ?? 1;
  const hw = w / 2, hl = l / 2, back = o.back ?? 0; // back: how far short of the head end the cloth stops
  const folds: Fold[] = [];
  for (let i = 0; i < 6; i++) { const x0 = R.range(-hw * 0.8, hw * 0.8), z0 = R.range(-hl * 0.6, hl * 0.9), a = R.range(-0.6, 0.6) + (R.next() < 0.5 ? 0 : Math.PI / 2), L = R.range(0.3, 0.8); folds.push({ a: [x0, 0, z0], b: [x0 + Math.cos(a) * L, 0, z0 + Math.sin(a) * L], w: R.range(0.03, 0.07), amp: R.range(0.006, 0.016) * lumps * (R.next() < 0.35 ? -0.6 : 1) }); }
  const pl = Array.from({ length: 5 }, (_, i) => ({ f: 5 + i * 2.3 + R.range(0, 1.5), ph: R.range(0, 6.28), a: R.range(0.4, 1) / (1 + i * 0.4) }));
  const turn = o.turn ?? 0; // a turned-down band at the head end, metres
  const map = (s: number, t: number): V3 => {
    // cloth coordinates centred on the top: x across, z from the head end down to the foot
    const cx = s - cw / 2, cz = t - hl + back;
    const px = clamp(cx, -hw, hw), pz = clamp(cz, -hl, hl);
    let ex = cx - px, ez = cz - pz;
    const e = Math.hypot(ex, ez);
    let x: number, y: number, z: number;
    if (e < 1e-9) { x = px; z = pz; y = y0; } else {
      const nx = ex / e, nz = ez / e;
      // over the rounded edge, then straight down
      const arc = (roll * Math.PI) / 2;
      const out = e < arc ? roll * Math.sin(e / roll) : roll + 0.0;
      const down = e < arc ? roll * (1 - Math.cos(e / roll)) : roll + (e - arc);
      // hanging cloth falls a little outward at the corners and swings in near the floor
      const corner = Math.abs(nx) > 0.2 && Math.abs(nz) > 0.2 ? 1 : 0;
      const flare = (e > arc ? (e - arc) * 0.12 : 0) * (1 + corner * 1.5);
      x = px + nx * (out + flare); z = pz + nz * (out + flare); y = y0 - down;
      // gravity pleats in the hanging part, deeper further down
      const along = Math.abs(nx) > Math.abs(nz) ? cz : cx, dd = clamp((e - arc) / 0.4);
      let pv = 0; for (const p of pl) pv += p.a * Math.sin(along * p.f * 2 + p.ph + dd * 0.8);
      const amp = 0.012 * pleat * dd * (1 + corner);
      x += nx * pv * amp; z += nz * pv * amp;
      ex = nx; ez = nz;
    }
    // the top: quilt loft, lumps and folds
    const top = clamp(1 - e / 0.06);
    const loft = 0.02 * Math.pow(clamp(1 - (cx / (hw + 0.1)) ** 2) * clamp(1 - (cz / (hl + 0.1)) ** 2), 0.4);
    y += (loft + foldAt(folds, cx, 0, cz) + (pnoise(cx * 4, cz * 4, 64, 64, seed + 3) - 0.5) * 0.012 * lumps) * (0.3 + 0.7 * top);
    if (turn > 0 && cz < -hl + back + turn + 0.02) y += 0.012 * smooth(-hl + back + turn + 0.02, -hl + back + turn - 0.02, cz);
    return [x, y, z];
  };
  const g = sheet(cw, cl, o.step ?? 0.02, map);
  smoothNormals(g);
  return g;
}

/**
 * A blanket folded in layers and laid flat: `layers` lengths of cloth, each `thick`, stacked with rounded folds
 * at alternate ends. Width w (x), folded length L (z). The top gets wrinkles, the folds soft bulges, the cut ends a
 * little wave. A closed solid: outer and inner skins and the two side edges.
 */
export function foldedThrow(w: number, L: number, layers = 3, thick = 0.012, o: { seed?: number; step?: number; wrinkle?: number } = {}) {
  const seed = o.seed ?? 1, R = rng(seed), step = o.step ?? 0.012, wr = o.wrinkle ?? 1;
  // the centreline of the cloth in the y-z plane: back and forth with half-round folds
  const gap = thick * 1.05, path: [number, number][] = [];
  const per = Math.ceil(L / step);
  for (let k = 0; k < layers; k++) {
    const y = gap * (k + 0.5), dir = k % 2 === 0 ? 1 : -1;
    for (let i = 0; i <= per; i++) { const t = i / per; path.push([y, dir > 0 ? -L / 2 + t * L : L / 2 - t * L]); }
    if (k < layers - 1) {
      const cz = dir > 0 ? L / 2 : -L / 2, cy = gap * (k + 1);
      for (let i = 1; i < 10; i++) { const a = -Math.PI / 2 + (i / 10) * Math.PI; path.push([cy + Math.sin(a) * (gap / 2), cz + dir * Math.cos(a) * (gap / 2) * 1.4]); }
    }
  }
  const folds: Fold[] = [];
  for (let i = 0; i < 7; i++) { const x0 = R.range(-w / 2, w / 2), z0 = R.range(-L / 2, L / 2), a = R.range(0, Math.PI), len = R.range(0.08, 0.25); folds.push({ a: [x0, 0, z0], b: [x0 + Math.cos(a) * len, 0, z0 + Math.sin(a) * len], w: R.range(0.006, 0.014), amp: R.range(0.002, 0.005) * wr }); }
  const nxs = Math.ceil(w / step), P = path.length;
  // arc length along the path for v
  const sArc = [0]; for (let i = 1; i < P; i++) sArc.push(sArc[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
  const normalAt = (i: number): [number, number] => { const a = path[Math.max(0, i - 1)], b = path[Math.min(P - 1, i + 1)], dy = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dy, dz) || 1; return [dz / l, -dy / l]; };
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const topLayer = layers - 1;
  const at = (i: number, x: number, off: number): V3 => {
    const [y, z] = path[i];
    // one side of the cloth stays one side all the way through the folds: up on even layers, down on odd ones
    const [ny, nz] = normalAt(i);
    const layer = Math.min(layers - 1, Math.floor(y / gap));
    const onTop = layer === topLayer && (topLayer % 2 === 0 ? off > 0 : off < 0);
    const wav = (pnoise(x * 6 + 2, sArc[i] * 6, 128, 128, seed) - 0.5) * 0.006;
    const f = (onTop ? foldAt(folds, x, 0, z) + wav : wav * 0.4) * clamp(1 - Math.abs(x) / (w / 2) * 0.2);
    const edge = (Math.abs(x) > w / 2 - 0.01 ? (pnoise(sArc[i] * 12, x > 0 ? 3 : 7, 256, 16, seed + 2) - 0.5) * 0.01 : 0);
    return [x + edge, y + ny * (off + f), z + nz * (off + f) + (pnoise(x * 4, sArc[i], 64, 64, seed + 5) - 0.5) * 0.004];
  };
  const skin = (off: number, flip: boolean) => {
    const base = pos.length / 3;
    for (let i = 0; i < P; i++) for (let j = 0; j <= nxs; j++) { const x = -w / 2 + (w * j) / nxs; const p = at(i, x, off); pos.push(...p); uv.push(x, sArc[i]); }
    const W = nxs + 1;
    for (let i = 0; i < P - 1; i++) for (let j = 0; j < nxs; j++) { const a = base + i * W + j, b = a + 1, c = a + W, e = c + 1; if (flip) idx.push(a, b, c, b, e, c); else idx.push(a, c, b, b, c, e); }
  };
  skin(thick / 2, false);
  skin(-thick / 2, true);
  // the two side edges and the two cut ends close the solid
  const W = nxs + 1, inner = P * W;
  for (const j of [0, nxs]) for (let i = 0; i < P - 1; i++) { const a = i * W + j, b = (i + 1) * W + j, c = inner + a, e = inner + b; if (j === 0) idx.push(a, b, c, b, e, c); else idx.push(a, c, b, b, c, e); }
  for (const i of [0, P - 1]) for (let j = 0; j < nxs; j++) { const a = i * W + j, b = a + 1, c = inner + a, e = inner + b; if (i === 0) idx.push(a, c, b, b, c, e); else idx.push(a, b, c, b, e, c); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ---- strap leaves -----------------------------------------------------------------------------------------------------------
/**
 * One strap leaf: a blade `len` long and `wid` wide at its widest, folded into a keel (V) along its midrib, rising
 * from `base` towards `dir` (a unit vector, mostly up) and arching over under its own weight (`droop`), with a slow
 * twist. UVs: u across the blade (m), v along it (m). Vertex colour runs base → mid → tip.
 */
export function strapLeaf(base: V3, dir: V3, len: number, wid: number, o: { droop?: number; twist?: number; keel?: number; seg?: number; across?: number; cols?: [number, number, number]; taper?: number; split?: number; seed?: number } = {}) {
  const seg = o.seg ?? 18, ac = o.across ?? 4, droop = o.droop ?? 0.5, tw = o.twist ?? 0.6, keel = o.keel ?? 0.35, taper = o.taper ?? 0.85;
  const cols = (o.cols ?? [0x5a3a2a, 0x3f5e2c, 0x7b7a3c]).map((c) => new THREE.Color(c));
  const up = new THREE.Vector3(...dir).normalize();
  const side = new THREE.Vector3(0, 1, 0).cross(up); if (side.lengthSq() < 1e-6) side.set(1, 0, 0); side.normalize();
  const pos: number[] = [], col: number[] = [], uv: number[] = [], idx: number[] = [];
  const p = new THREE.Vector3(...base), t = up.clone(), tmp = new THREE.Color();
  const dl = len / seg;
  for (let i = 0; i <= seg; i++) {
    const s = i / seg;
    const width = wid * (s < 0.08 ? 0.55 + s * 5 : Math.pow(clamp((1 - s) / (1 - 0.08)), 1 - taper) * (1 - 0.15 * s));
    const ang = tw * s * Math.PI, ca = Math.cos(ang), sa = Math.sin(ang);
    const nrm = new THREE.Vector3().crossVectors(t, side).normalize();
    const sd = side.clone().multiplyScalar(ca).addScaledVector(nrm, sa), nd = nrm.clone().multiplyScalar(ca).addScaledVector(side, -sa);
    if (s < 0.5) cols[0].clone().lerp(cols[1], smooth(0, 0.5, s)).getRGB(tmp); else tmp.copy(cols[1]).lerp(cols[2], smooth(0.55, 1, s));
    for (let j = 0; j <= ac; j++) {
      const a = (j / ac) * 2 - 1, k = Math.abs(a);
      const q = p.clone().addScaledVector(sd, (a * width) / 2).addScaledVector(nd, k * keel * width * 0.5 * (1 - s * 0.5));
      pos.push(q.x, q.y, q.z); col.push(tmp.r, tmp.g, tmp.b); uv.push((a * width) / 2, s * len);
    }
    // step along: the blade bends over under its weight
    t.addScaledVector(new THREE.Vector3(0, -1, 0), droop * dl * (0.4 + s)).normalize();
    p.addScaledVector(t, dl);
  }
  const W = ac + 1;
  for (let i = 0; i < seg; i++) for (let j = 0; j < ac; j++) { const a = i * W + j, b = a + 1, c = a + W, e = c + 1; idx.push(a, c, b, b, c, e); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** merge geometries that share the same attributes (position, normal, uv, optional colour) into one */
export function merge(list: THREE.BufferGeometry[]) {
  const withColour = list.some((g) => g.getAttribute('color'));
  let nv = 0, ni = 0;
  for (const g of list) { nv += g.getAttribute('position').count; ni += g.getIndex() ? g.getIndex()!.count : g.getAttribute('position').count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), col = withColour ? new Float32Array(nv * 3) : null, idx = new Uint32Array(ni);
  let ov = 0, oi = 0;
  for (const g of list) {
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    const p = g.getAttribute('position'), n = g.getAttribute('normal'), u = g.getAttribute('uv'), c = g.getAttribute('color'), I = g.getIndex();
    for (let i = 0; i < p.count; i++) {
      pos[(ov + i) * 3] = p.getX(i); pos[(ov + i) * 3 + 1] = p.getY(i); pos[(ov + i) * 3 + 2] = p.getZ(i);
      nor[(ov + i) * 3] = n.getX(i); nor[(ov + i) * 3 + 1] = n.getY(i); nor[(ov + i) * 3 + 2] = n.getZ(i);
      if (u) { uv[(ov + i) * 2] = u.getX(i); uv[(ov + i) * 2 + 1] = u.getY(i); }
      if (col) { col[(ov + i) * 3] = c ? c.getX(i) : 1; col[(ov + i) * 3 + 1] = c ? c.getY(i) : 1; col[(ov + i) * 3 + 2] = c ? c.getZ(i) : 1; }
    }
    if (I) for (let k = 0; k < I.count; k++) idx[oi + k] = I.getX(k) + ov; else for (let k = 0; k < p.count; k++) idx[oi + k] = ov + k;
    ov += p.count; oi += I ? I.count : p.count;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (col) g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  return g;
}

/** place a geometry: translate, then turn about y (radians) */
export const at = (g: THREE.BufferGeometry, x: number, y: number, z: number, ry = 0, rx = 0, rz = 0) => {
  if (rx) g.rotateX(rx); if (rz) g.rotateZ(rz); if (ry) g.rotateY(ry);
  return g.translate(x, y, z);
};
