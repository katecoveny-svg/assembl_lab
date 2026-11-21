// Native bush built in code, to the standard of the lab's birds and their kōwhai and mānuka sprigs:
// real wood with bark relief and real leaves, no smooth lumps and no leaf pictures.
//
// Kānuka: slender leaning stems, pale bark flaking in long strips, bare below and a high airy crown of
// fine foliage in soft clouds, white with flower in December.
// Pōhutukawa: several massive, sinuous trunks from one flared base, aerial roots, leathery leaves dark
// above and silver beneath, crimson brushes of stamens in December.
// Ponga (silver fern): a dark fibrous trunk, arching pinnate fronds green above and silver beneath, a
// skirt of dead brown fronds, koru at the crown. Harakeke and tī kōuka give scale near the house.
//
// Detail is spent where it is seen. Trees kept in the clearing are each grown once at their surveyed
// size, with foliage as many fine tufts. The surveyed bush around is drawn from a few modelled trees per
// species, coarser with distance. Phones get the coarser sets throughout.
//
// The survey gives each tree top's position, height and spread. Species, the clearing, the kept
// specimens and the understorey are proposed and tagged so.
import * as THREE from 'three/webgpu';
import { scanSet } from './scanned';

type Tree = [number, number, number, number, string];
type Kind = 'kanuka' | 'pohutukawa';
type RGB = [number, number, number];

/** A proposed clearing, carried by the plan model at `site.terrain.clearing`. The survey's tree list is left as it is. */
export interface Clearing {
  source?: string;
  note?: string;
  /** areas cleared: every surveyed tree inside is removed unless `keep` (a fraction, 0 to 1) spares it or it is a specimen */
  zones?: { name?: string; pts: [number, number][]; keep?: number; enabled?: boolean; note?: string; /** only trees that rise above this falling line of sight are removed */ sightline?: { eye: [number, number, number]; drop: number } }[];
  /** surveyed trees kept inside the zones: the tree top nearest each point */
  specimens?: { at: [number, number]; as?: Kind; name?: string }[];
  /** proposed understorey: [x, z, height or size] */
  planting?: { ponga?: [number, number, number][]; harakeke?: [number, number, number][]; tikouka?: [number, number, number][] };
}
export interface BushOptions { clearing?: Clearing; keepOut?: { x0: number; x1: number; z0: number; z1: number }[] }

const TAU = Math.PI * 2;
const UP = new THREE.Vector3(0, 1, 0);
const XA = new THREE.Vector3(1, 0, 0);
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const rng32 = (a: number) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const h3 = (x: number, y: number, z: number) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
/** smooth value noise, 0 to 1 */
function vnoise(x: number, y: number, z: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), fx = x - xi, fy = y - yi, fz = z - zi;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), sz = fz * fz * (3 - 2 * fz);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  return l(l(l(h3(xi, yi, zi), h3(xi + 1, yi, zi), sx), l(h3(xi, yi + 1, zi), h3(xi + 1, yi + 1, zi), sx), sy), l(l(h3(xi, yi, zi + 1), h3(xi + 1, yi, zi + 1), sx), l(h3(xi, yi + 1, zi + 1), h3(xi + 1, yi + 1, zi + 1), sx), sy), sz);
}
const inPoly = (x: number, z: number, poly: [number, number][]) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if (a[1] > z !== b[1] > z && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]) c = !c; }
  return c;
};

/** a growing mesh: positions, normals, colours, bark coordinates */
class Buf {
  p: number[] = []; n: number[] = []; c: number[] = []; t: number[] = []; i: number[] = [];
  get count() { return this.p.length / 3; }
  vert(px: number, py: number, pz: number, nx: number, ny: number, nz: number, r: number, g: number, b: number, u = 0, v = 0) {
    this.p.push(px, py, pz); this.n.push(nx, ny, nz); this.c.push(r, g, b); this.t.push(u, v);
    return this.p.length / 3 - 1;
  }
  tri(a: number, b: number, c: number) { this.i.push(a, b, c); }
  /** add another mesh, turned, sized and moved by `m`, its colours multiplied by a tint */
  add(o: Buf, m: THREE.Matrix4, tr = 1, tg = 1, tb = 1) {
    const e = m.elements, base = this.count, s = Math.hypot(e[0], e[1], e[2]) || 1;
    for (let k = 0; k < o.p.length; k += 3) {
      const x = o.p[k], y = o.p[k + 1], z = o.p[k + 2], nx = o.n[k], ny = o.n[k + 1], nz = o.n[k + 2];
      this.p.push(e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]);
      this.n.push((e[0] * nx + e[4] * ny + e[8] * nz) / s, (e[1] * nx + e[5] * ny + e[9] * nz) / s, (e[2] * nx + e[6] * ny + e[10] * nz) / s);
      this.c.push(o.c[k] * tr, o.c[k + 1] * tg, o.c[k + 2] * tb);
    }
    for (let k = 0; k < o.t.length; k++) this.t.push(o.t[k]);
    for (let k = 0; k < o.i.length; k++) this.i.push(o.i[k] + base);
  }
  /** a small correction to a tree's spread and its height above the ground line, leaving its foot where it stands */
  fit(sr: number, sy: number) { for (let k = 0; k < this.p.length; k += 3) { const y = this.p[k + 1], f = Math.min(1, Math.max(0, y / 1.5)), s = 1 + (sr - 1) * f; this.p[k] *= s; this.p[k + 2] *= s; if (y > 0.3) this.p[k + 1] = 0.3 + (y - 0.3) * sy; } }
  geo(uv = false) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    if (uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(this.t, 2));
    g.setIndex(this.i);
    return g;
  }
}

// --- wood ------------------------------------------------------------------------------------------------
interface Bark { rad: (r: number, a: number, p: THREE.Vector3, s: number) => number; col: (k: number, p: THREE.Vector3, s: number, a: number) => RGB }
/** bark as relief and colour: how far the surface stands off the limb's own radius, and its tone there */
function barkOf(kind: 'kanuka' | 'pohutukawa' | 'ponga' | 'tikouka' | 'root', amp: number, seed: number): Bark {
  if (kind === 'kanuka')
    // long papery strips: shallow flutes that wander up the stem, and plates lifting where the bark flakes
    return {
      rad: (r, a, p) => r * (1 + amp * (0.07 * Math.sin(a * 5 + vnoise(p.x * 2.5 + seed, p.y * 0.45, p.z * 2.5) * 9) + (vnoise(p.x * 11, p.y * 2.2 + seed, p.z * 11) > 0.6 ? 0.08 : 0))),
      col: (k, p, s) => { const n = 0.72 + 0.5 * vnoise(p.x * 6, p.y * 1.3 + seed, p.z * 6), f = k > 1.035 ? 1.22 : k < 0.97 ? 0.7 : 1, m = s < 0.5 ? 0.62 + 0.76 * s : 1; return [0.9 * n * f * m, 0.92 * n * f * m * (s < 0.5 ? 1.08 : 1), 1.32 * n * f * m]; },
    };
  if (kind === 'pohutukawa' || kind === 'root')
    // deep furrows twisting round the limb, and burls
    return {
      rad: (r, a, p, s) => r * (1 + amp * (0.1 * Math.sin(a * 7 + s * 1.7 + vnoise(p.x * 1.5 + seed, p.y * 0.8, p.z * 1.5) * 7) + 0.34 * (vnoise(p.x * 2.1 + seed, p.y * 2.1, p.z * 2.1) - 0.5) + 0.1 * (vnoise(p.x * 7, p.y * 5, p.z * 7 + seed) - 0.5))),
      col: (k, p) => { const n = 0.7 + 0.5 * vnoise(p.x * 4 + seed, p.y * 2, p.z * 4), f = k < 0.96 ? 0.62 : k > 1.06 ? 1.15 : 1, li = vnoise(p.x * 1.3, p.y * 1.1 + seed, p.z * 1.3) > 0.66 ? 1.25 : 1; return kind === 'root' ? [0.62 * n * f, 0.5 * n * f, 0.62 * n * f] : [0.6 * n * f * li, 0.64 * n * f * li, 1.0 * n * f * li]; },
    };
  if (kind === 'ponga')
    // a mat of dark fibre, ribbed
    return {
      rad: (r, a, p) => r * (1 + amp * (0.12 * Math.sin(a * 9 + p.y * 2.2) + 0.22 * (vnoise(p.x * 9 + seed, p.y * 6, p.z * 9) - 0.5))),
      col: (k, p) => { const n = 0.6 + 0.6 * vnoise(p.x * 14, p.y * 5 + seed, p.z * 14), f = k < 0.98 ? 0.6 : 1.1; return [0.36 * n * f, 0.32 * n * f, 0.4 * n * f]; },
    };
  // tī kōuka: pale corky bark in small blocks
  return {
    rad: (r, a, p) => r * (1 + amp * (0.07 * Math.sin(a * 8) * Math.sin(p.y * 9 + seed) + 0.12 * (vnoise(p.x * 8, p.y * 6 + seed, p.z * 8) - 0.5))),
    col: (k, p) => { const n = 0.8 + 0.4 * vnoise(p.x * 9, p.y * 7 + seed, p.z * 9), f = k < 0.98 ? 0.65 : 1.05; return [0.95 * n * f, 1.02 * n * f, 1.6 * n * f]; },
  };
}

/** a limb swept along points, its surface displaced as bark; normals from the displaced surface; bark coordinates in metres */
function sweep(b: Buf, pts: THREE.Vector3[], R: (u: number, a: number, s: number) => number, radial: number, bark: Bark, tile = 0.62) {
  const S = pts.length - 1; if (S < 1) return;
  const T = pts.map((_, i) => pts[Math.min(S, i + 1)].clone().sub(pts[Math.max(0, i - 1)]).normalize());
  const N = new THREE.Vector3().crossVectors(T[0], Math.abs(T[0].y) < 0.9 ? UP : XA).normalize(), B = new THREE.Vector3(), ax = new THREE.Vector3();
  const P = new Float32Array((S + 1) * radial * 3), K = new Float32Array((S + 1) * radial), lens = new Float32Array(S + 1);
  let len = 0;
  for (let i = 0; i <= S; i++) {
    if (i > 0) {
      len += pts[i].distanceTo(pts[i - 1]);
      ax.crossVectors(T[i - 1], T[i]); const sl = ax.length();
      if (sl > 1e-6) N.applyAxisAngle(ax.divideScalar(sl), Math.asin(Math.min(1, sl)));
      N.addScaledVector(T[i], -N.dot(T[i])).normalize();
    }
    lens[i] = len; B.crossVectors(T[i], N);
    const u = i / S;
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * TAU, r0 = R(u, a, len), r = bark.rad(r0, a, pts[i], len), ca = Math.cos(a), sa = Math.sin(a), o = (i * radial + j) * 3;
      P[o] = pts[i].x + (N.x * ca + B.x * sa) * r; P[o + 1] = pts[i].y + (N.y * ca + B.y * sa) * r; P[o + 2] = pts[i].z + (N.z * ca + B.z * sa) * r;
      K[i * radial + j] = r0 > 0 ? r / r0 : 1;
    }
  }
  const nU = Math.max(1, Math.round((TAU * Math.max(0.02, R(0.3, 0, len * 0.3))) / tile)), base = b.count, q = new THREE.Vector3();
  for (let i = 0; i <= S; i++) {
    const i0 = Math.max(0, i - 1), i1 = Math.min(S, i + 1);
    for (let j = 0; j <= radial; j++) {
      const jj = j % radial, ja = (jj + 1) % radial, jb = (jj + radial - 1) % radial, o = (i * radial + jj) * 3, oa = (i * radial + ja) * 3, ob = (i * radial + jb) * 3, o0 = (i0 * radial + jj) * 3, o1 = (i1 * radial + jj) * 3;
      const ax1 = P[oa] - P[ob], ay1 = P[oa + 1] - P[ob + 1], az1 = P[oa + 2] - P[ob + 2], ux = P[o1] - P[o0], uy = P[o1 + 1] - P[o0 + 1], uz = P[o1 + 2] - P[o0 + 2];
      let nx = ay1 * uz - az1 * uy, ny = az1 * ux - ax1 * uz, nz = ax1 * uy - ay1 * ux;
      const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      if (nx * (P[o] - pts[i].x) + ny * (P[o + 1] - pts[i].y) + nz * (P[o + 2] - pts[i].z) < 0) { nx = -nx; ny = -ny; nz = -nz; }
      const c = bark.col(K[i * radial + jj], q.set(P[o], P[o + 1], P[o + 2]), lens[i], (jj / radial) * TAU);
      b.vert(P[o], P[o + 1], P[o + 2], nx, ny, nz, c[0], c[1], c[2], (j / radial) * nU, lens[i] / tile);
    }
  }
  for (let i = 0; i < S; i++) for (let j = 0; j < radial; j++) { const a = base + i * (radial + 1) + j, c = a + radial + 1; b.tri(a, a + 1, c); b.tri(c, a + 1, c + 1); }
}
interface LimbOpt { radial: number; perM: number; bark: Bark; /** swelling into roots near the ground: `from` is how far along the limb the ground is */ flare?: { amt: number; len: number; lobes: number; ph: number; from: number }; maxSeg?: number }
/** a limb through control points; `R` is its radius along the way. Returns the curve so branches can leave it. */
function limb(b: Buf, ctrl: THREE.Vector3[], R: (u: number) => number, o: LimbOpt) {
  const curve = new THREE.CatmullRomCurve3(ctrl, false, 'centripetal');
  const L = curve.getLength(), S = Math.max(2, Math.min(o.maxSeg ?? 44, Math.ceil(L * o.perM)));
  const f = o.flare;
  sweep(b, curve.getSpacedPoints(S), f ? (u, a, s) => R(u) * (1 + f.amt * Math.exp(-Math.max(0, s - f.from) / f.len) * (0.6 + 0.4 * Math.cos(f.lobes * a + f.ph))) : (u) => R(u), o.radial, o.bark);
  return curve;
}
/** a unit vector at right angles to `d`, at a random turn about it */
function perp(d: THREE.Vector3, rnd: () => number) {
  const x = new THREE.Vector3().crossVectors(d, Math.abs(d.y) < 0.9 ? UP : XA).normalize(), y = new THREE.Vector3().crossVectors(d, x), t = rnd() * TAU;
  return x.multiplyScalar(Math.cos(t)).addScaledVector(y, Math.sin(t));
}

// --- leaves ----------------------------------------------------------------------------------------------
/**
 * One pointed leaf from `a` along `d`, turned to face `out` as nearly as it can, so a crown lit from outside shades as
 * a soft mass. `soft` leans its normal towards `out`. With `hex` the outline is a fuller oval.
 */
function leaf(b: Buf, a: THREE.Vector3, d: THREE.Vector3, len: number, w: number, out: THREE.Vector3, soft: number, c0: RGB, c1: RGB, fold = 0.12, hex = false) {
  let sx = d.y * out.z - d.z * out.y, sy = d.z * out.x - d.x * out.z, sz = d.x * out.y - d.y * out.x, sl = Math.hypot(sx, sy, sz);
  if (sl < 1e-4) { const o = Math.abs(d.y) < 0.9 ? UP : XA; sx = d.y * o.z - d.z * o.y; sy = d.z * o.x - d.x * o.z; sz = d.x * o.y - d.y * o.x; sl = Math.hypot(sx, sy, sz) || 1; }
  sx /= sl; sy /= sl; sz /= sl;
  // the face normal: side × d
  let fx = sy * d.z - sz * d.y, fy = sz * d.x - sx * d.z, fz = sx * d.y - sy * d.x;
  if (fx * out.x + fy * out.y + fz * out.z < 0) { sx = -sx; sy = -sy; sz = -sz; fx = -fx; fy = -fy; fz = -fz; }
  let nx = fx * (1 - soft) + out.x * soft, ny = fy * (1 - soft) + out.y * soft, nz = fz * (1 - soft) + out.z * soft; const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
  const h = w / 2, lift = fold * w, mr = (c0[0] + c1[0]) / 2, mg = (c0[1] + c1[1]) / 2, mb = (c0[2] + c1[2]) / 2;
  const v = (t: number, s: number, up: number, r: number, g: number, bl: number) => b.vert(a.x + d.x * len * t + sx * h * s + fx * up, a.y + d.y * len * t + sy * h * s + fy * up, a.z + d.z * len * t + sz * h * s + fz * up, nx + sx * s * 0.35, ny + sy * s * 0.35, nz + sz * s * 0.35, r, g, bl);
  const A = v(0, 0, 0, c0[0], c0[1], c0[2]), tip = v(1, 0, -len * 0.06, c1[0], c1[1], c1[2]);
  if (!hex) {
    const l = v(0.45, 1, lift, mr, mg, mb), r = v(0.45, -1, lift, mr, mg, mb);
    b.tri(A, l, r); b.tri(l, tip, r);
  } else {
    const l1 = v(0.26, 0.86, lift, mr * 0.92, mg * 0.92, mb * 0.92), r1 = v(0.26, -0.86, lift, mr * 0.92, mg * 0.92, mb * 0.92), l2 = v(0.72, 0.94, lift, mr * 1.06, mg * 1.06, mb * 1.06), r2 = v(0.72, -0.94, lift, mr * 1.06, mg * 1.06, mb * 1.06);
    b.tri(A, l1, r1); b.tri(l1, l2, r1); b.tri(r1, l2, r2); b.tri(l2, tip, r2);
  }
}
/** a spray seen from far off: two slim wedges fanning out from `a` about `d`, facing `out`; finer to the eye than one broad blade */
function spray(b: Buf, a: THREE.Vector3, d: THREE.Vector3, len: number, w: number, out: THREE.Vector3, soft: number, c0: RGB, c1: RGB) {
  let sx = d.y * out.z - d.z * out.y, sy = d.z * out.x - d.x * out.z, sz = d.x * out.y - d.y * out.x, sl = Math.hypot(sx, sy, sz);
  if (sl < 1e-4) { const o = Math.abs(d.y) < 0.9 ? UP : XA; sx = d.y * o.z - d.z * o.y; sy = d.z * o.x - d.x * o.z; sz = d.x * o.y - d.y * o.x; sl = Math.hypot(sx, sy, sz) || 1; }
  sx /= sl; sy /= sl; sz /= sl;
  let fx = sy * d.z - sz * d.y, fy = sz * d.x - sx * d.z, fz = sx * d.y - sy * d.x;
  if (fx * out.x + fy * out.y + fz * out.z < 0) { sx = -sx; sy = -sy; sz = -sz; fx = -fx; fy = -fy; fz = -fz; }
  let nx = fx * (1 - soft) + out.x * soft, ny = fy * (1 - soft) + out.y * soft, nz = fz * (1 - soft) + out.z * soft; const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
  for (const e of [-1, 1]) {
    const k = 0.34 * e, ex = d.x + sx * k, ey = d.y + sy * k, ez = d.z + sz * k, px = a.x + ex * len, py = a.y + ey * len - len * 0.08, pz = a.z + ez * len, h = w * 0.5;
    const A = b.vert(a.x, a.y, a.z, nx, ny, nz, c0[0], c0[1], c0[2]), L = b.vert(px + sx * h, py + sy * h, pz + sz * h, nx + sx * 0.3, ny + sy * 0.3, nz + sz * 0.3, c1[0], c1[1], c1[2]), R = b.vert(px - sx * h, py - sy * h, pz - sz * h, nx - sx * 0.3, ny - sy * 0.3, nz - sz * 0.3, c1[0], c1[1], c1[2]);
    b.tri(A, L, R);
  }
}
const dirOn = (rnd: () => number, yMin: number, yMax: number) => { const y = yMin + rnd() * (yMax - yMin), ph = rnd() * TAU, sr = Math.sqrt(Math.max(0, 1 - y * y)); return V(sr * Math.cos(ph), y, sr * Math.sin(ph)); };

/** a tuft of kānuka: fine sprigs of narrow leaves in a soft cloud about 0.4 m in radius, dusted with white flower */
function kanukaTuft(seed: number, sprigs: number, per: number, L: number, W: number, flower: number, coarse = false): Buf {
  const rnd = rng32(seed), b = new Buf(), R = 0.42, p = V(), bd = V(), out = V(), fa = V(), fd = V();
  for (let s = 0; s < sprigs; s++) {
    const d = dirOn(rnd, -0.55, 1), start = d.clone().multiplyScalar(0.04 + rnd() * 0.1).add(V((rnd() - 0.5) * 0.1, (rnd() - 0.5) * 0.1, (rnd() - 0.5) * 0.1));
    const len = R * (0.6 + rnd() * 0.42), droop = 0.08 + rnd() * 0.16;
    const e1 = new THREE.Vector3().crossVectors(d, Math.abs(d.y) < 0.9 ? UP : XA).normalize(), e2 = new THREE.Vector3().crossVectors(d, e1);
    for (let k = 0; k < per; k++) {
      const t = (k + 0.5 + rnd() * 0.5) / per;
      p.copy(start).addScaledVector(d, len * t); p.y -= droop * len * t * t;
      const dist = p.length(); if (dist > 1e-3) out.copy(p).divideScalar(dist); else out.copy(d);
      const a = k * 2.4 + rnd() * 0.9, splay = 0.45 + rnd() * 0.6;
      bd.copy(d).multiplyScalar(Math.cos(splay)).addScaledVector(e1, Math.cos(a) * Math.sin(splay)).addScaledVector(e2, Math.sin(a) * Math.sin(splay)).normalize();
      const depth = Math.min(1, dist / R), sh = (0.42 + 0.62 * depth) * (0.82 + 0.36 * rnd()), warm = rnd();
      if (coarse) {
        // seen from far off a blade stands for a whole spray: blunter, evener in tone, and paler where the spray is in flower
        const fl = flower > 0 && out.y > -0.2 && rnd() < flower ? 0.5 + 0.3 * rnd() : 0, k = (0.6 + 0.45 * depth) * (0.88 + 0.24 * rnd());
        const r = (0.115 * (1 + 0.2 * warm)) * (1 - fl) + 0.5 * fl, g2 = 0.158 * (1 - fl) + 0.5 * fl, bl = 0.07 * (1 - fl) + 0.4 * fl;
        spray(b, p, bd, L * (0.8 + 0.4 * rnd()), W, out, 0.75, [r * k * 0.78, g2 * k * 0.78, bl * k * 0.78], [r * k * 1.1, g2 * k * 1.1, bl * k * 1.1]);
        continue;
      }
      leaf(b, p, bd, L * (0.75 + 0.5 * rnd()), W, out, 0.62, [0.075 * sh * (1 + 0.25 * warm), 0.112 * sh, 0.05 * sh], [0.17 * sh * (1 + 0.3 * warm), 0.225 * sh, 0.098 * sh], 0.15);
      if (flower > 0 && out.y > -0.25 && depth > 0.45 && rnd() < flower) {
        // a spray of small white flowers along the twiglet
        fd.copy(perp(out, rnd)); fa.copy(p).addScaledVector(bd, L * (0.2 + rnd() * 0.5)).addScaledVector(out, 0.012).addScaledVector(fd, -W * 0.7);
        const wsh = 0.82 + 0.18 * rnd();
        leaf(b, fa, fd, W * 1.5, W * 1.35, out, 0.3, [0.78 * wsh, 0.78 * wsh, 0.66 * wsh], [0.95 * wsh, 0.95 * wsh, 0.88 * wsh], 0);
      }
    }
  }
  return b;
}
/** a tuft of pōhutukawa: twig ends with opposite pairs of leathery oval leaves, silver beneath and in bud, with crimson brushes of stamens in flower */
function pohutuTuft(seed: number, ends: number, pairs: number, L: number, W: number, hex: boolean, flower: number): Buf {
  const rnd = rng32(seed), b = new Buf(), R = 0.36, p = V(), bd = V(), out = V(), tipP = V();
  for (let e = 0; e < ends; e++) {
    const d = e === 0 ? V(0, 1, 0) : dirOn(rnd, 0.05, 0.95), start = d.clone().multiplyScalar(0.04 + rnd() * 0.08), tl = R * (0.55 + rnd() * 0.45);
    const e1 = new THREE.Vector3().crossVectors(d, Math.abs(d.y) < 0.9 ? UP : XA).normalize(), e2 = new THREE.Vector3().crossVectors(d, e1), turn = rnd() * TAU;
    for (let k = 0; k < pairs; k++) {
      const t = 0.3 + (0.7 * (k + 1)) / pairs;
      p.copy(start).addScaledVector(d, tl * t);
      for (let side = 0; side < 2; side++) {
        const a = turn + k * (Math.PI / 2) + side * Math.PI + (rnd() - 0.5) * 0.5, splay = (k === pairs - 1 ? 0.55 : 0.95) + rnd() * 0.4;
        bd.copy(d).multiplyScalar(Math.cos(splay)).addScaledVector(e1, Math.cos(a) * Math.sin(splay)).addScaledVector(e2, Math.sin(a) * Math.sin(splay)).normalize();
        out.copy(p).addScaledVector(bd, L * 0.5); const ol = out.length() || 1; out.divideScalar(ol);
        const depth = Math.min(1, ol / R), sh = (0.5 + 0.55 * depth) * (0.88 + 0.24 * rnd());
        // leaves that hang below the twig show their felted silver underside
        const under = bd.y < -0.38;
        const c0: RGB = under ? [0.13 * sh, 0.16 * sh, 0.12 * sh] : [0.03 * sh, 0.066 * sh, 0.026 * sh], c1: RGB = under ? [0.22 * sh, 0.26 * sh, 0.2 * sh] : [0.062 * sh, 0.115 * sh, 0.045 * sh];
        leaf(b, p, bd, L * (0.8 + 0.4 * rnd()), W, out, 0.5, c0, c1, 0.2, hex);
      }
    }
    // the bud pair at the tip, silver with down
    tipP.copy(start).addScaledVector(d, tl);
    for (let side = 0; side < 2; side++) {
      const a = turn + side * Math.PI + 0.8;
      bd.copy(d).multiplyScalar(0.92).addScaledVector(e1, Math.cos(a) * 0.4).addScaledVector(e2, Math.sin(a) * 0.4).normalize();
      out.copy(tipP).normalize();
      leaf(b, tipP, bd, L * 0.5, W * 0.55, out, 0.4, [0.16, 0.21, 0.14], [0.3, 0.35, 0.26], 0.3, false);
    }
    if (flower > 0 && d.y > 0.2 && rnd() < flower) {
      // a brush of stamens: crimson needles in a half-sphere about the twig's end
      const n = hex ? 22 : 8;
      for (let k = 0; k < n; k++) {
        const nd = dirOn(rnd, 0.0, 1);
        bd.copy(e1).multiplyScalar(nd.x).addScaledVector(d, nd.y).addScaledVector(e2, nd.z).normalize();
        const br = 0.8 + 0.4 * rnd();
        leaf(b, tipP, bd, (hex ? 0.085 : 0.12) * (0.8 + 0.4 * rnd()), hex ? 0.014 : 0.04, bd, 0.5, [0.42 * br, 0.008, 0.02], [0.95 * br, 0.05, 0.07], 0);
      }
    }
  }
  return b;
}

// --- trees -----------------------------------------------------------------------------------------------
interface Tip { p: THREE.Vector3; d: THREE.Vector3; s: number }
/** how finely a tree is grown: 0 a kept specimen, 1 near, 2 middle distance, 3 far */
interface Grade { lod: 0 | 1 | 2 | 3; trunk: number; branch: number; twig: number; perM: number; relief: number; prim: number; sec: number; twigs: number; tuft: number }
const GRADES: Grade[] = [
  { lod: 0, trunk: 12, branch: 6, twig: 3, perM: 2.2, relief: 1, prim: 1, sec: 3, twigs: 1.5, tuft: 1.15 },
  { lod: 1, trunk: 6, branch: 4, twig: 3, perM: 0.9, relief: 0.6, prim: 0.72, sec: 2, twigs: 0.9, tuft: 1.6 },
  { lod: 2, trunk: 5, branch: 3, twig: 3, perM: 0.5, relief: 0, prim: 0.56, sec: 2, twigs: 0, tuft: 2.15 },
  { lod: 3, trunk: 3, branch: 3, twig: 3, perM: 0.22, relief: 0, prim: 0.42, sec: 2, twigs: 0, tuft: 2.9 },
];

/** kānuka: one to three slender stems leaning apart, bare for the lower half, branches rising steeply into a light crown */
function growKanuka(b: Buf, rnd: () => number, H: number, R: number, G: Grade, ground?: (dx: number, dz: number) => number, stemsWanted?: number): Tip[] {
  const tips: Tip[] = [], seed = rnd() * 50;
  const nSt = stemsWanted ?? 1 + (rnd() < 0.3 ? 1 : 0) + (rnd() < 0.05 ? 1 : 0), a0 = rnd() * TAU;
  const bark = barkOf('kanuka', G.relief, seed), smooth = barkOf('kanuka', 0, seed);
  for (let s = 0; s < nSt; s++) {
    const h = H * (s === 0 ? 1 : 0.7 + rnd() * 0.24), la = a0 + (s * TAU) / nSt + (rnd() - 0.5) * 0.9, lean = (0.05 + rnd() * 0.15) * (nSt > 1 ? 1.35 : 1);
    const bx = nSt > 1 ? Math.cos(la) * 0.17 : 0, bz = nSt > 1 ? Math.sin(la) * 0.17 : 0, r0 = 0.026 + 0.006 * h, wob = h * 0.028, gy = ground ? ground(bx, bz) : 0;
    const ctrl: THREE.Vector3[] = [];
    for (let k = 0; k <= 6; k++) { const t = k / 6, off = lean * h * Math.pow(t, 1.25); ctrl.push(V(bx + Math.cos(la) * off + (k ? (rnd() - 0.5) * wob : 0), gy - 0.55 + (h + 0.55) * t, bz + Math.sin(la) * off + (k ? (rnd() - 0.5) * wob : 0))); }
    const rAt = (u: number) => r0 * (1 - 0.87 * Math.pow(u, 0.9));
    const trunk = limb(b, ctrl, rAt, { radial: G.trunk, perM: G.perM, bark, flare: { amt: G.lod < 2 ? 0.85 : 0.4, len: 0.42, lobes: 3 + Math.floor(rnd() * 2), ph: rnd() * TAU, from: 0.55 } });
    if (G.lod === 0) {
      // surface roots where the stem meets the ground, and long strips of bark hanging loose
      const nr = 3 + Math.floor(rnd() * 2);
      for (let k = 0; k < nr; k++) {
        const ra = (k / nr) * TAU + rnd() * 0.8, L = 0.5 + rnd() * 0.7, c = Math.cos(ra), sn = Math.sin(ra), g = (dd: number) => (ground ? ground(bx + c * dd, bz + sn * dd) : gy - dd * 0.12);
        limb(b, [V(bx, gy + 0.16, bz), V(bx + c * L * 0.4, g(L * 0.4) + 0.03, bz + sn * L * 0.4), V(bx + c * L, g(L) - 0.07, bz + sn * L)], (u) => r0 * (0.55 - 0.42 * u), { radial: 5, perM: 5, bark: smooth });
      }
      const strips = 9 + Math.floor(rnd() * 7);
      for (let k = 0; k < strips; k++) {
        const u = 0.06 + rnd() * 0.42, P0 = trunk.getPointAt(u), T0 = trunk.getTangentAt(u), o = perp(T0, rnd), side = new THREE.Vector3().crossVectors(T0, o), r = rAt(u) * 1.06, L = 0.25 + rnd() * 0.6, w = 0.012 + rnd() * 0.016, curl = 0.02 + rnd() * 0.07;
        const tone = 0.8 + rnd() * 0.5, base = b.count;
        for (let q = 0; q <= 4; q++) {
          const t = q / 4, off = r + curl * t * t, cx = P0.x - T0.x * L * t + o.x * off, cy = P0.y - T0.y * L * t + o.y * off, cz = P0.z - T0.z * L * t + o.z * off, sh = tone * (1 - 0.25 * t);
          for (const e of [-1, 1]) b.vert(cx + side.x * w * e, cy + side.y * w * e, cz + side.z * w * e, o.x, o.y, o.z, 1.15 * sh, 1.2 * sh, 1.8 * sh, 0.2 + e * 0.03, u * 9 + t);
        }
        for (let q = 0; q < 4; q++) { const a = base + q * 2; b.tri(a, a + 1, a + 2); b.tri(a + 2, a + 1, a + 3); b.tri(a, a + 2, a + 1); b.tri(a + 2, a + 3, a + 1); }
      }
      // a few dead twigs low on the stem
      for (let k = 0; k < 4; k++) {
        const u = 0.18 + rnd() * 0.3, P0 = trunk.getPointAt(u), o = perp(trunk.getTangentAt(u), rnd), L = 0.3 + rnd() * 0.7, d = o.clone().multiplyScalar(0.85).add(V(0, 0.5, 0)).normalize();
        limb(b, [P0, P0.clone().addScaledVector(d, L * 0.5).add(V((rnd() - 0.5) * 0.1, (rnd() - 0.5) * 0.1, (rnd() - 0.5) * 0.1)), P0.clone().addScaledVector(d, L).add(V(0, L * 0.15, 0))], (t) => 0.011 * (1 - 0.8 * t), { radial: 3, perM: 4, bark: smooth });
      }
    }
    // the crown
    const u0 = 0.44 + rnd() * 0.12, nP = Math.max(3, Math.round((6 + h * 0.36) * G.prim));
    for (let i = 0; i < nP; i++) {
      const f = (i + 0.5) / nP, u = u0 + (1 - u0) * Math.pow(f, 0.85) * 0.97, P0 = trunk.getPointAt(u), az = i * 2.39996 + rnd() * 0.7;
      const len = Math.max(0.55, R * (1 - 0.6 * f) * (0.78 + 0.44 * rnd())), elev = 0.4 + 0.55 * f + (rnd() - 0.5) * 0.3, out = V(Math.cos(az), 0, Math.sin(az));
      const d0 = out.clone().multiplyScalar(Math.cos(elev)).add(V(0, Math.sin(elev), 0)), d1 = d0.clone().add(V(0, 0.4, 0)).normalize(), j = () => V((rnd() - 0.5) * len * 0.16, (rnd() - 0.5) * len * 0.1, (rnd() - 0.5) * len * 0.16);
      const p1 = P0.clone().addScaledVector(d0, len * 0.36).add(j()), p2 = p1.clone().addScaledVector(d1, len * 0.34).add(j()), p3 = p2.clone().addScaledVector(d1.clone().add(V(0, 0.35, 0)).normalize(), len * 0.3);
      const rb = Math.max(0.012, rAt(u) * 0.5), br = limb(b, [P0, p1, p2, p3], (t) => rb * (1 - 0.8 * t), { radial: G.branch, perM: G.perM * 1.5, bark: G.lod === 0 ? bark : smooth, maxSeg: 10 });
      tips.push({ p: p3, d: br.getTangentAt(1), s: 1.05 });
      for (let k = 0; k < G.sec; k++) {
        const v = 0.28 + (0.62 * (k + rnd())) / G.sec, Q = br.getPointAt(v), Tb = br.getTangentAt(v), sd = perp(Tb, rnd), d = Tb.clone().multiplyScalar(0.55).addScaledVector(sd, 0.85).add(V(0, 0.3, 0)).normalize();
        const l2 = Math.max(0.35, len * (0.55 - 0.3 * v) * (0.8 + 0.4 * rnd())), q1 = Q.clone().addScaledVector(d, l2 * 0.5).add(V((rnd() - 0.5) * l2 * 0.2, (rnd() - 0.5) * l2 * 0.1, (rnd() - 0.5) * l2 * 0.2)), q2 = q1.clone().addScaledVector(d.clone().add(V(0, 0.4, 0)).normalize(), l2 * 0.5);
        let sc: THREE.CatmullRomCurve3 | null = null;
        if (G.lod < 3) sc = limb(b, [Q, q1, q2], (t) => rb * 0.5 * (1 - v * 0.5) * (1 - 0.75 * t), { radial: G.twig, perM: G.perM * 1.6, bark: smooth, maxSeg: 6 });
        tips.push({ p: q2, d: d.clone(), s: 0.95 });
        const nt = Math.floor(G.twigs) + (rnd() < G.twigs % 1 ? 1 : 0);
        for (let m = 0; m < nt && sc; m++) {
          const w = 0.35 + rnd() * 0.5, Q2 = sc.getPointAt(w), sd2 = perp(sc.getTangentAt(w), rnd), d2 = sc.getTangentAt(w).multiplyScalar(0.5).addScaledVector(sd2, 0.9).add(V(0, 0.25, 0)).normalize(), l3 = l2 * (0.4 + rnd() * 0.25), e = Q2.clone().addScaledVector(d2, l3);
          if (G.lod === 0) limb(b, [Q2, Q2.clone().addScaledVector(d2, l3 * 0.5).add(V(0, l3 * 0.06, 0)), e], (t) => 0.009 * (1 - 0.7 * t), { radial: 3, perM: 3, bark: smooth, maxSeg: 3 });
          tips.push({ p: e, d: d2, s: 0.85 });
        }
      }
    }
    tips.push({ p: ctrl[6].clone(), d: V(0, 1, 0), s: 1 });
  }
  return tips;
}

/** pōhutukawa: several heavy trunks from one flared base, leaning out and forking low, limbs wandering, a broad dome of leaf */
function growPohutukawa(b: Buf, rnd: () => number, H: number, R: number, G: Grade, ground?: (dx: number, dz: number) => number): Tip[] {
  const tips: Tip[] = [], seed = rnd() * 50, bark = barkOf('pohutukawa', G.relief, seed), smooth = barkOf('pohutukawa', 0, seed), rootB = barkOf('root', 0, seed);
  const nTr = G.lod >= 2 ? 3 : 3 + Math.floor(rnd() * 2.4), spread = Math.max(0.28, Math.min(0.95, R / H)), a0 = rnd() * TAU, rBase = (0.15 + 0.017 * H) * (0.85 + rnd() * 0.3);
  const depthMax = G.lod <= 1 ? 2 : 1;
  const fork = (P: THREE.Vector3, dir: THREE.Vector3, len: number, r: number, depth: number) => {
    const kids = depth === depthMax ? 2 + (rnd() < 0.55 ? 1 : 0) : 2 + (rnd() < 0.3 ? 1 : 0);
    for (let k = 0; k < kids; k++) {
      const sd = perp(dir, rnd), lift = depth <= 1 ? 0.5 : 0.18, d = dir.clone().multiplyScalar(0.62).addScaledVector(sd, 0.6 + rnd() * 0.5).add(V(0, lift, 0)).normalize();
      const L = len * (0.75 + rnd() * 0.45), w = () => V((rnd() - 0.5) * L * 0.3, (rnd() - 0.5) * L * 0.18, (rnd() - 0.5) * L * 0.3);
      const p1 = P.clone().addScaledVector(d, L * 0.35).add(w()), d1 = d.clone().add(V(0, 0.3, 0)).addScaledVector(perp(d, rnd), 0.35).normalize(), p2 = p1.clone().addScaledVector(d1, L * 0.35).add(w()), p3 = p2.clone().addScaledVector(d1.clone().add(V(0, 0.4, 0)).normalize(), L * 0.3);
      const rr = r * (0.7 + rnd() * 0.2), c = limb(b, [P, p1, p2, p3], (t) => rr * (1 - 0.5 * t), { radial: depth >= 2 ? G.branch + (G.lod === 0 ? 2 : 0) : G.twig + (G.lod === 0 ? 1 : 0), perM: G.perM * (depth >= 2 ? 1.2 : 1.6), bark: depth >= 2 ? bark : smooth, maxSeg: 12 });
      // leafy shoots along the outer limbs
      if (depth <= 1) {
        const ns = G.lod === 0 ? 4 + Math.floor(rnd() * 2) : G.lod === 1 ? 2 : G.lod === 2 ? 1 : 0;
        for (let m = 0; m < ns; m++) {
          const v = 0.25 + (0.7 * (m + rnd())) / Math.max(1, ns), Q = c.getPointAt(v), ds = c.getTangentAt(v).multiplyScalar(0.4).addScaledVector(perp(c.getTangentAt(v), rnd), 0.8).add(V(0, 0.55, 0)).normalize(), l3 = 0.3 + rnd() * 0.45, e = Q.clone().addScaledVector(ds, l3);
          if (G.lod === 0) limb(b, [Q, Q.clone().addScaledVector(ds, l3 * 0.5).add(V(0, 0.03, 0)), e], (t) => 0.014 * (1 - 0.6 * t), { radial: 3, perM: 3, bark: smooth, maxSeg: 3 });
          tips.push({ p: e, d: ds, s: 1 });
        }
      }
      if (depth > 0) fork(p3, c.getTangentAt(1), len * 0.66, rr * 0.5, depth - 1);
      else tips.push({ p: p3, d: c.getTangentAt(1), s: 1.1 });
      // aerial roots: bundles of fine red-brown strands hanging from under the heavy limbs
      if (G.lod === 0 && depth >= 2 && rnd() < 0.75) {
        const v = 0.3 + rnd() * 0.5, Q = c.getPointAt(v), n = 5 + Math.floor(rnd() * 6), drop = Math.min(Q.y + 0.4, 0.5 + rnd() * 1.6);
        for (let m = 0; m < n; m++) {
          const o = V((rnd() - 0.5) * 0.16, -rr * 0.6, (rnd() - 0.5) * 0.16), L2 = drop * (0.5 + rnd() * 0.5), sw = () => (rnd() - 0.5) * 0.09;
          limb(b, [Q.clone().add(o), Q.clone().add(o).add(V(sw(), -L2 * 0.4, sw())), Q.clone().add(o).add(V(sw(), -L2 * 0.75, sw())), Q.clone().add(o).add(V(sw() * 0.5, -L2, sw() * 0.5))], (t) => 0.011 * (1 - 0.7 * t), { radial: 3, perM: 2.5, bark: rootB, maxSeg: 4 });
        }
      }
    }
  };
  for (let s = 0; s < nTr; s++) {
    const az = a0 + (s * TAU) / nTr + (rnd() - 0.5) * 0.7, tilt = (0.25 + 0.75 * spread) * (0.7 + rnd() * 0.5), c = Math.cos(az), sn = Math.sin(az), Lt = H * (0.36 + rnd() * 0.14), r0 = rBase * (s === 0 ? 1 : 0.7 + rnd() * 0.3);
    const bx = c * rBase * 0.75, bz = sn * rBase * 0.75, gy = ground ? ground(bx, bz) : 0, dir = V(c * Math.sin(tilt), Math.cos(tilt), sn * Math.sin(tilt));
    const w = () => V((rnd() - 0.5) * Lt * 0.22, (rnd() - 0.5) * Lt * 0.08, (rnd() - 0.5) * Lt * 0.22);
    const p0 = V(bx * 0.4, gy - 0.6, bz * 0.4), p1 = V(bx, gy + 0.25, bz), p2 = p1.clone().addScaledVector(dir, Lt * 0.4).add(w()), p3 = p2.clone().addScaledVector(dir.clone().addScaledVector(perp(dir, rnd), 0.3).normalize(), Lt * 0.35).add(w()), p4 = p3.clone().addScaledVector(dir.clone().add(V(0, 0.35, 0)).normalize(), Lt * 0.3);
    const tr = limb(b, [p0, p1, p2, p3, p4], (u) => r0 * (1 - 0.48 * u), { radial: G.trunk + (G.lod === 0 ? 2 : 0), perM: G.perM * 1.3, bark, flare: { amt: G.lod < 2 ? 1.0 : 0.4, len: 0.6, lobes: 4 + Math.floor(rnd() * 2), ph: rnd() * TAU, from: 0.8 } });
    fork(p4, tr.getTangentAt(1), H * 0.3, r0 * 0.52, depthMax);
    if (G.lod === 0) {
      // heavy roots running out over the ground
      for (let k = 0; k < 2; k++) {
        const ra = az + (rnd() - 0.5) * 1.5, L = 1.2 + rnd() * 1.5, rc = Math.cos(ra), rs = Math.sin(ra), g = (dd: number) => (ground ? ground(bx + rc * dd, bz + rs * dd) : gy - dd * 0.1);
        limb(b, [V(bx * 0.6, gy + 0.3, bz * 0.6), V(bx + rc * L * 0.3, g(L * 0.3) + 0.1, bz + rs * L * 0.3), V(bx + rc * L * 0.65 + (rnd() - 0.5) * 0.3, g(L * 0.65) + 0.02, bz + rs * L * 0.65 + (rnd() - 0.5) * 0.3), V(bx + rc * L, g(L) - 0.12, bz + rs * L)], (u) => r0 * (0.5 - 0.42 * u), { radial: 7, perM: 4, bark });
      }
    }
  }
  return tips;
}

interface Kit { wood: THREE.BufferGeometry; leaves: THREE.BufferGeometry; H: number; R: number }
const tuftCache = new Map<string, Buf>();
/** foliage tufts by species, fineness (0 finest) and whether in flower; three of each so no two neighbours match */
function tuft(kind: Kind, lod: number, flower: boolean, v: number): Buf {
  const key = `${kind}/${lod}/${flower ? 1 : 0}/${v}`;
  let t = tuftCache.get(key);
  if (!t) {
    const seed = 100 + v * 31 + lod * 7 + (flower ? 3 : 0) + (kind === 'kanuka' ? 0 : 500);
    if (kind === 'kanuka') t = lod === 0 ? kanukaTuft(seed, 15, 14, 0.115, 0.03, flower ? 0.5 : 0) : lod === 1 ? kanukaTuft(seed, 8, 8, 0.19, 0.05, flower ? 0.4 : 0) : lod === 2 ? kanukaTuft(seed, 5, 6, 0.2, 0.062, flower ? 0.4 : 0, true) : kanukaTuft(seed, 3, 3, 0.27, 0.1, flower ? 0.4 : 0, true);
    else t = lod === 0 ? pohutuTuft(seed, 8, 5, 0.125, 0.054, true, flower ? 0.7 : 0) : lod === 1 ? pohutuTuft(seed, 4, 4, 0.21, 0.094, false, flower ? 0.7 : 0) : lod === 2 ? pohutuTuft(seed, 3, 3, 0.31, 0.15, false, flower ? 0.7 : 0) : pohutuTuft(seed, 2, 2, 0.5, 0.26, false, flower ? 0.8 : 0);
    tuftCache.set(key, t);
  }
  return t;
}
const tipMatrix = (t: Tip, size: number, rnd: () => number, m = new THREE.Matrix4()) => {
  const ax = t.d.clone().lerp(UP, 0.45).normalize(), q = new THREE.Quaternion().setFromUnitVectors(UP, ax).multiply(new THREE.Quaternion().setFromAxisAngle(UP, rnd() * TAU)), s = size * t.s * (0.85 + rnd() * 0.3);
  return m.compose(t.p.clone().addScaledVector(ax, 0.3 * s), q, V(s, s, s));
};
/** where a tuft sits in its crown, 0 deep and low to 1 high and outside: stands in for the shade a crown casts on itself */
const exposure = (p: THREE.Vector3, yLo: number, yHi: number, R: number) => Math.max(0, Math.min(1, 0.62 * ((p.y - yLo) / Math.max(0.5, yHi - yLo)) + 0.42 * Math.min(1, Math.hypot(p.x, p.z) / Math.max(0.5, R))));

/** one whole tree for drawing many times: wood and foliage, base at the origin */
function kit(kind: Kind, variant: number, G: Grade, tuftLod: number): Kit {
  const rnd = rng32(variant * 7919 + (kind === 'kanuka' ? 11 : 97) + G.lod * 131), wood = new Buf(), leaves = new Buf();
  const H0 = kind === 'kanuka' ? 11 : 10, R0 = kind === 'kanuka' ? 2.4 : 4.6;
  const tips = kind === 'kanuka' ? growKanuka(wood, rnd, H0, R0, G) : growPohutukawa(wood, rnd, H0, R0, G);
  let yHi = 0, yLo = 1e9, R = 0; for (const t of tips) { yHi = Math.max(yHi, t.p.y); yLo = Math.min(yLo, t.p.y); R = Math.max(R, Math.hypot(t.p.x, t.p.z)); }
  const m = new THREE.Matrix4();
  for (const t of tips) {
    const ex = exposure(t.p, yLo, yHi, R), fl = kind === 'kanuka' ? ex > 0.4 && rnd() < 0.62 : ex > 0.5 && rnd() < 0.45, sh = 0.6 + 0.55 * ex;
    leaves.add(tuft(kind, tuftLod, fl, Math.floor(rnd() * 3)), tipMatrix(t, G.tuft, rnd, m), sh, sh, sh);
  }
  return { wood: wood.geo(true), leaves: leaves.geo(), H: yHi + 0.38 * G.tuft, R: R + 0.34 * G.tuft };
}

// --- ponga -----------------------------------------------------------------------------------------------
/**
 * A ponga frond one unit long, built along +Z and arching down: a rachis with pairs of pinnae, each pinna a blade
 * whose edges are cut into forward-pointing pinnules. Green above and silver beneath, as two faces.
 * `K` is pinnules a side (1 gives a plain tapered pinna for distance); `S` the rachis segments.
 */
function frond(seed: number, pairs: number, K: number, dead: boolean, S = 22): Buf {
  const rnd = rng32(seed), b = new Buf(), bend = dead ? 0.5 + rnd() * 0.3 : 1.15 + rnd() * 0.35, sway = (rnd() - 0.5) * 0.1;
  const P: THREE.Vector3[] = [], Tn: THREE.Vector3[] = [], Un: THREE.Vector3[] = [];
  const p = V(0, 0, 0);
  for (let i = 0; i <= S; i++) {
    const t = i / S, th = -bend * Math.pow(t, 1.7), T = V(sway * Math.sin(t * 3), Math.sin(th), Math.cos(th)).normalize();
    P.push(p.clone()); Tn.push(T); Un.push(V(0, Math.cos(th), -Math.sin(th)));
    p.addScaledVector(T, 1 / S);
  }
  const at = (t: number) => { const f = Math.min(S - 1e-4, Math.max(0, t * S)), i = Math.floor(f), a = f - i; return { p: P[i].clone().lerp(P[i + 1], a), T: Tn[i].clone().lerp(Tn[i + 1], a).normalize(), U: Un[i].clone().lerp(Un[i + 1], a).normalize() }; };
  // the rachis: three-sided, brown at the stipe, greener along the blade
  const rc: RGB = dead ? [0.17, 0.11, 0.07] : [0.17, 0.14, 0.08];
  sweep(b, P, (u) => 0.0125 * (1 - 0.86 * u), 3, { rad: (r) => r, col: (_k, _q, s) => (dead ? rc : [rc[0] * (1 - 0.5 * s) + 0.1 * s, rc[1] * (1 - 0.3 * s) + 0.12 * s, rc[2]]) });
  const top0: RGB = dead ? [0.15, 0.095, 0.055] : [0.034, 0.085, 0.022], top1: RGB = dead ? [0.26, 0.17, 0.095] : [0.085, 0.17, 0.045], un0: RGB = dead ? [0.2, 0.14, 0.085] : [0.3, 0.36, 0.3], un1: RGB = dead ? [0.27, 0.19, 0.11] : [0.46, 0.52, 0.45];
  const pd = V(), pp = V(), a = V(), c = V(), e = V();
  for (let i = 0; i < pairs; i++) {
    for (const side of [-1, 1]) {
      const t = 0.15 + (0.85 * (i + (side > 0 ? 0.62 : 0.38))) / pairs, f = (t - 0.15) / 0.85, env = Math.pow(Math.sin(Math.PI * Math.pow(f, 0.58)), 0.85), Lp = (0.185 * env + 0.012) * (dead ? 0.45 + 0.4 * rnd() : 0.92 + 0.16 * rnd());
      const fr = at(t), fwd = dead ? 0.95 + rnd() * 0.45 : 0.25 + 0.3 * f + (rnd() - 0.5) * 0.12, d0 = V(side * Math.cos(fwd), 0, 0).addScaledVector(fr.T, Math.sin(fwd)).normalize();
      const lift = (dead ? -0.3 : 0.2) + (rnd() - 0.5) * (dead ? 0.5 : 0.16), droop = dead ? 0.5 + rnd() * 0.5 : 0.5 + rnd() * 0.2, W = (dead ? 0.009 : 0.023) * (0.6 + 0.4 * env), tone = 0.82 + 0.36 * rnd();
      const pt = (s: number, o: THREE.Vector3) => o.copy(fr.p).addScaledVector(d0, Lp * s).addScaledVector(fr.U, (lift * s - droop * s * s) * Lp);
      const U = fr.U;
      for (let k = 0; k < K; k++) {
        const s0 = k / K, s1 = (k + 1) / K;
        pt(s0, a); pt(s1, c); pd.copy(c).sub(a).normalize(); pp.crossVectors(U, pd).normalize();
        const wk = W * Math.pow(1 - s0 * 0.9, 0.7), lo = K === 1 ? wk : wk * 0.5, hi = K === 1 ? wk * 0.22 : wk, g = 0.8 + 0.2 * s0;
        // six points: the midrib at each end, and the blade's edge either side, sagging a little
        const ring: [THREE.Vector3, number, number][] = [[a, 0, 0], [c, 0, 0], [a, 1, lo], [c, 1, hi], [a, -1, lo], [c, -1, hi]];
        const mk = (under: boolean) => ring.map(([q, sd, w]) => {
          e.copy(q).addScaledVector(pp, sd * w).addScaledVector(U, -w * 0.3);
          const col = under ? (sd === 0 ? un0 : un1) : sd === 0 ? top0 : top1, sgn = under ? -1 : 1, k2 = (under ? 1 : g) * tone;
          return b.vert(e.x, e.y, e.z, sgn * (U.x + pp.x * sd * 0.45), sgn * (U.y + pp.y * sd * 0.45), sgn * (U.z + pp.z * sd * 0.45), col[0] * k2, col[1] * k2, col[2] * k2);
        });
        const [A, C, AL, CL, AR, CR] = mk(false); b.tri(A, C, CL); b.tri(A, CL, AL); b.tri(A, CR, C); b.tri(A, AR, CR);
        const [A2, C2, AL2, CL2, AR2, CR2] = mk(true); b.tri(A2, CL2, C2); b.tri(A2, AL2, CL2); b.tri(A2, C2, CR2); b.tri(A2, CR2, AR2);
      }
    }
  }
  return b;
}
/** a ponga trunk of height `h`: dark fibre, wider at the foot, old frond bases as pegs up its top half, and koru at the crown */
function pongaTrunk(seed: number, h: number, fine: boolean): Buf {
  const rnd = rng32(seed), b = new Buf(), bark = barkOf('ponga', fine ? 1 : 0.5, seed), lx = (rnd() - 0.5) * 0.3, lz = (rnd() - 0.5) * 0.3;
  const ctrl = [V(0, -0.45, 0), V(lx * 0.2, h * 0.3, lz * 0.2), V(lx * 0.7, h * 0.7, lz * 0.7), V(lx, h, lz)], r0 = 0.105;
  const c = limb(b, ctrl, (u) => r0 * (1 + 0.75 * Math.exp(-Math.max(0, u * (h + 0.45) - 0.45) / 0.4)) * (1 - 0.12 * u), { radial: fine ? 9 : 6, perM: fine ? 4 : 1.5, bark });
  // old stipe bases
  const n = fine ? 60 : 18;
  for (let k = 0; k < n; k++) {
    const u = 0.42 + 0.57 * (k / n), P0 = c.getPointAt(u), a = k * 2.39996, o = V(Math.cos(a), 0, Math.sin(a)), tip = P0.clone().addScaledVector(o, r0 * 0.98 + 0.05).add(V(0, 0.07, 0)), w = 0.016, s = V(-o.z, 0, o.x);
    const i0 = b.vert(P0.x + o.x * r0 * 0.9 + s.x * w, P0.y - 0.02, P0.z + o.z * r0 * 0.9 + s.z * w, o.x, 0.2, o.z, 0.5, 0.42, 0.5), i1 = b.vert(P0.x + o.x * r0 * 0.9 - s.x * w, P0.y - 0.02, P0.z + o.z * r0 * 0.9 - s.z * w, o.x, 0.2, o.z, 0.5, 0.42, 0.5), i2 = b.vert(P0.x + o.x * r0 * 0.9, P0.y + 0.03, P0.z + o.z * r0 * 0.9, o.x, 0.5, o.z, 0.4, 0.34, 0.4), i3 = b.vert(tip.x, tip.y, tip.z, o.x, 0.6, o.z, 0.8, 0.66, 0.7);
    b.tri(i0, i3, i2); b.tri(i1, i2, i3); b.tri(i0, i1, i3);
  }
  // koru: young fronds still coiled, brown with scale
  const top = ctrl[3];
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU + rnd() * 0.8, o = V(Math.cos(a), 0, Math.sin(a)), hh = 0.22 + rnd() * 0.3, pts: THREE.Vector3[] = [], base = top.clone().addScaledVector(o, 0.04);
    for (let q = 0; q <= 5; q++) { const t = q / 5; pts.push(base.clone().addScaledVector(o, 0.07 * t * t).add(V(0, hh * t, 0))); }
    const cc = pts[5].clone().addScaledVector(o, 0.045);
    for (let q = 1; q <= 14; q++) { const t = q / 14, ang = Math.PI - t * TAU * 1.5, rr = 0.045 * (1 - 0.72 * t); pts.push(cc.clone().addScaledVector(o, Math.cos(ang) * rr).add(V(0, Math.sin(ang) * rr, 0))); }
    sweep(b, pts, (u) => 0.016 * (1 - 0.6 * u), fine ? 5 : 3, { rad: (r) => r, col: (_k, pq) => { const n2 = 0.75 + 0.5 * vnoise(pq.x * 60, pq.y * 60, pq.z * 60); return [0.62 * n2, 0.44 * n2, 0.26 * n2]; } });
  }
  return b;
}

// --- harakeke and tī kōuka -------------------------------------------------------------------------------
/** a strap leaf: starts along `dir`, bends over towards the ground, keeled down its middle */
function strap(b: Buf, base: THREE.Vector3, dir: THREE.Vector3, len: number, w: number, droop: number, K: number, c0: RGB, c1: RGB, keel = 0.25, sideHint?: THREE.Vector3) {
  const side = sideHint ? sideHint.clone() : new THREE.Vector3().crossVectors(dir, UP); if (side.lengthSq() < 1e-5) side.set(1, 0, 0); side.normalize();
  const upP = new THREE.Vector3().crossVectors(side, dir).normalize(), p = base.clone(), d = V(), n = V(), start = b.count;
  for (let k = 0; k <= K; k++) {
    const t = k / K, th = droop * Math.pow(t, 1.8);
    d.copy(dir).multiplyScalar(Math.cos(th)).addScaledVector(upP, -Math.sin(th)); n.copy(upP).multiplyScalar(Math.cos(th)).addScaledVector(dir, Math.sin(th));
    const wt = w * Math.min(1, 0.45 + t * 5) * Math.pow(1 - Math.pow(t, 2.4), 0.8) * 0.5, lift = keel * wt, r = c0[0] + (c1[0] - c0[0]) * t, g = c0[1] + (c1[1] - c0[1]) * t, bl = c0[2] + (c1[2] - c0[2]) * t;
    b.vert(p.x - side.x * wt + n.x * lift, p.y - side.y * wt + n.y * lift, p.z - side.z * wt + n.z * lift, n.x - side.x * 0.4, n.y - side.y * 0.4, n.z - side.z * 0.4, r * 0.9, g * 0.9, bl * 0.9);
    b.vert(p.x, p.y, p.z, n.x, n.y, n.z, r * 1.08, g * 1.08, bl);
    b.vert(p.x + side.x * wt + n.x * lift, p.y + side.y * wt + n.y * lift, p.z + side.z * wt + n.z * lift, n.x + side.x * 0.4, n.y + side.y * 0.4, n.z + side.z * 0.4, r * 0.9, g * 0.9, bl * 0.9);
    p.addScaledVector(d, len / K);
  }
  for (let k = 0; k < K; k++) { const a = start + k * 3; b.tri(a, a + 1, a + 3); b.tri(a + 3, a + 1, a + 4); b.tri(a + 1, a + 2, a + 4); b.tri(a + 4, a + 2, a + 5); }
}
/** harakeke: fans of stiff sword leaves, the outer ones arching over, with dark flower stalks standing above */
function harakeke(seed: number, K: number): Buf {
  const rnd = rng32(seed), b = new Buf(), fans = 4 + Math.floor(rnd() * 3);
  for (let f = 0; f < fans; f++) {
    const fa = rnd() * TAU, fd = V(Math.cos(fa), 0, Math.sin(fa)), fn = new THREE.Vector3().crossVectors(fd, UP), base = V((rnd() - 0.5) * 0.5, -0.05, (rnd() - 0.5) * 0.5), n = 7 + Math.floor(rnd() * 4);
    for (let i = 0; i < n; i++) {
      const s = (i / (n - 1)) * 2 - 1, phi = s * (0.5 + rnd() * 0.3), dir = V(0, Math.cos(phi), 0).addScaledVector(fd, Math.sin(phi)).add(V((rnd() - 0.5) * 0.12, 0, (rnd() - 0.5) * 0.12)).normalize();
      const len = (1.5 + rnd() * 0.75) * (1 - 0.25 * Math.abs(s)), tone = 0.8 + 0.4 * rnd(), old = rnd() < 0.08;
      strap(b, base.clone().addScaledVector(fd, s * 0.06), dir, len, 0.085 + rnd() * 0.03, 0.25 + Math.abs(s) * 0.9 + rnd() * 0.5, K, old ? [0.2, 0.15, 0.08] : [0.06 * tone, 0.105 * tone, 0.04 * tone], old ? [0.3, 0.24, 0.13] : [0.15 * tone, 0.2 * tone, 0.08 * tone], 0.35, fn.clone().multiplyScalar(s >= 0 ? 1 : -1));
    }
  }
  // kōrari: flower stalks with their seed pods, standing well above the leaves
  const stalkBark: Bark = { rad: (r) => r, col: () => [0.1, 0.045, 0.04] };
  for (let k = 0; k < 2 + Math.floor(rnd() * 2); k++) {
    const a = rnd() * TAU, lean = 0.12 + rnd() * 0.2, h = 2.5 + rnd() * 0.8, top = V(Math.cos(a) * lean * h, h, Math.sin(a) * lean * h), c = limb(b, [V((rnd() - 0.5) * 0.3, 0, (rnd() - 0.5) * 0.3), top.clone().multiplyScalar(0.5).add(V(0, 0.1, 0)), top], (u) => 0.014 * (1 - 0.6 * u), { radial: 4, perM: 2.5, bark: stalkBark });
    for (let m = 0; m < 9; m++) {
      const u = 0.55 + 0.44 * (m / 9), P0 = c.getPointAt(u), sgn = m % 2 ? 1 : -1, o = V(Math.cos(a + 1.57) * sgn, 0.55, Math.sin(a + 1.57) * sgn).normalize();
      for (let q = 0; q < 3; q++) strap(b, P0.clone().addScaledVector(o, 0.03 + q * 0.035), o.clone().add(V(0, 0.9 + q * 0.2, 0)).normalize(), 0.09, 0.022, 0.1, 1, [0.06, 0.03, 0.03], [0.12, 0.05, 0.04], 0.5);
    }
  }
  return b;
}
/** tī kōuka: a pale corky stem forking into heads of long narrow leaves, the old ones hanging as a skirt */
function tikouka(seed: number, h: number, wood: Buf, leaves: Buf) {
  const rnd = rng32(seed), bark = barkOf('tikouka', 1, seed), heads = h > 3.2 ? 2 + Math.floor(rnd() * 2) : 1;
  const fk = h * (heads > 1 ? 0.62 : 1), lean = V((rnd() - 0.5) * 0.25, 0, (rnd() - 0.5) * 0.25), top = V(lean.x * fk, fk, lean.z * fk);
  limb(wood, [V(0, -0.4, 0), top.clone().multiplyScalar(0.45).add(V((rnd() - 0.5) * 0.08, 0, (rnd() - 0.5) * 0.08)), top], (u) => (0.075 + 0.012 * h) * (1 - 0.3 * u), { radial: 9, perM: 3, bark, flare: { amt: 0.7, len: 0.3, lobes: 3, ph: rnd() * TAU, from: 0.4 } });
  const head = (at: THREE.Vector3, ax: THREE.Vector3) => {
    const e1 = new THREE.Vector3().crossVectors(ax, XA).normalize(), e2 = new THREE.Vector3().crossVectors(ax, e1);
    for (let i = 0; i < 64; i++) {
      const y = 1 - (i / 63) * 1.5, ph = i * 2.39996, sr = Math.sqrt(Math.max(0, 1 - Math.min(1, y * y))), dir = ax.clone().multiplyScalar(Math.max(-0.5, y)).addScaledVector(e1, Math.cos(ph) * sr).addScaledVector(e2, Math.sin(ph) * sr).normalize(), tone = 0.8 + 0.4 * rnd();
      strap(leaves, at.clone().addScaledVector(dir, 0.03), dir, 0.6 + rnd() * 0.3, 0.05, y > 0.5 ? 0.12 + rnd() * 0.25 : 0.5 + (0.5 - y) * 0.9 + rnd() * 0.3, 3, [0.07 * tone, 0.12 * tone, 0.045 * tone], [0.16 * tone, 0.23 * tone, 0.09 * tone], 0.3);
    }
    // the skirt of dead leaves under the head
    for (let i = 0; i < 22; i++) { const ph = i * 2.39996, dir = V(Math.cos(ph) * 0.5, -0.85, Math.sin(ph) * 0.5).normalize(), tone = 0.7 + 0.5 * rnd(); strap(leaves, at.clone().add(V(0, -0.05 - rnd() * 0.2, 0)), dir, 0.45 + rnd() * 0.3, 0.04, 0.15, 2, [0.2 * tone, 0.14 * tone, 0.08 * tone], [0.32 * tone, 0.25 * tone, 0.15 * tone], 0.3); }
  };
  if (heads === 1) head(top, V(lean.x, 1, lean.z).normalize());
  else for (let k = 0; k < heads; k++) {
    const a = (k / heads) * TAU + rnd(), d = V(Math.cos(a) * 0.55, 1, Math.sin(a) * 0.55).normalize(), L = h * 0.38 * (0.8 + rnd() * 0.4), end = top.clone().addScaledVector(d, L);
    limb(wood, [top.clone().add(V(0, -0.1, 0)), top.clone().addScaledVector(d, L * 0.5).add(V(0, -L * 0.05, 0)), end], (u) => (0.06 + 0.008 * h) * (1 - 0.25 * u), { radial: 7, perM: 3, bark });
    head(end, d.clone().lerp(UP, 0.5).normalize());
  }
}

// --- the bush --------------------------------------------------------------------------------------------
/**
 * The bush from a survey's tree tops: [x, z, height, crown radius, colour from the aerial photo], thinned by the plan
 * model's proposed clearing. Broad, lower crowns are drawn as pōhutukawa and the rest as kānuka; the survey does not
 * say which is which.
 */
export async function nativeBush(trees: Tree[], groundAt: (x: number, z: number) => number, centre: [number, number], opts: BushOptions = {}): Promise<THREE.Group> {
  const g = new THREE.Group(); g.name = 'bush_from_survey';
  const lite = matchMedia('(max-width: 760px)').matches;
  const C = opts.clearing, zones = (C?.zones ?? []).filter((z) => z.enabled !== false && z.pts?.length >= 3), keepOut = opts.keepOut ?? [];
  const rnd = (i: number) => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

  // materials: scanned bark relief over the modelled bark, and matt leaf
  const woodM = new THREE.MeshStandardMaterial({ name: 'bark', vertexColors: true, roughness: 0.95 });
  try { const [bc, bn, br] = await scanSet('bark', 1, 1); woodM.map = bc; woodM.normalMap = bn; woodM.roughnessMap = br; woodM.roughness = 1; woodM.normalScale.set(1.6, 1.6); woodM.color.setRGB(1.5, 1.5, 1.5); }
  catch { woodM.color.setRGB(0.14, 0.13, 0.115); }
  const kanukaM = new THREE.MeshStandardMaterial({ name: 'kanuka_foliage', vertexColors: true, roughness: 0.72, side: THREE.DoubleSide, envMapIntensity: 0.55 });
  const pohutuM = new THREE.MeshStandardMaterial({ name: 'pohutukawa_foliage', vertexColors: true, roughness: 0.5, side: THREE.DoubleSide, envMapIntensity: 0.6 });
  const frondM = new THREE.MeshStandardMaterial({ name: 'ponga_frond', vertexColors: true, roughness: 0.62, envMapIntensity: 0.5 });
  const strapM = new THREE.MeshStandardMaterial({ name: 'harakeke_and_ti_kouka_leaf', vertexColors: true, roughness: 0.55, side: THREE.DoubleSide, envMapIntensity: 0.6 });

  // which surveyed trees the proposed clearing removes, and which it keeps as specimens
  const specAt = new Map<number, { as?: Kind; name?: string }>();
  for (const s of C?.specimens ?? []) {
    let best = -1, bd = 3;
    trees.forEach((t, i) => { const d = Math.hypot(t[0] - s.at[0], t[1] - s.at[1]); if (d < bd) { bd = d; best = i; } });
    if (best >= 0) specAt.set(best, s);
  }
  const cleared = (t: Tree, i: number) => {
    for (const z of zones) {
      if (!inPoly(t[0], t[1], z.pts)) continue;
      if (z.sightline) { const e = z.sightline.eye, d = Math.hypot(t[0] - e[0], t[1] - e[2]); if (groundAt(t[0], t[1]) + t[2] < e[1] - d * z.sightline.drop) continue; }
      if (rnd(i * 1.7 + 0.3) >= (z.keep ?? 0)) return true;
    }
    return false;
  };
  const distHouse = (x: number, z: number) => {
    if (!keepOut.length) return Math.hypot(x - centre[0], z - centre[1]);
    let d = 1e9; for (const k of keepOut) d = Math.min(d, Math.hypot(Math.max(k.x0 - x, 0, x - k.x1), Math.max(k.z0 - z, 0, z - k.z1)));
    return d;
  };
  const kindOf = (t: Tree): Kind => (t[3] >= 3.6 && t[2] <= 15 ? 'pohutukawa' : 'kanuka');
  const tintOf = (hex: string, s: number, out = new THREE.Color()) => {
    // each tree keeps the lean of hue the aerial photo gives it, without the photo's own blue shade
    out.set(`#${hex}`); const l = Math.max(0.04, (out.r + out.g + out.b) / 3), v = 0.86 + rnd(s + 3) * 0.3;
    return out.setRGB(Math.max(0.7, Math.min(1.3, 1 + 0.5 * (out.r / l - 1))) * v, Math.max(0.75, Math.min(1.25, 1 + 0.4 * (out.g / l - 1))) * v, Math.max(0.6, Math.min(1.05, 0.86 + 0.3 * (out.b / l - 1))) * v);
  };

  // finer trees reach further out on the downhill side, where the decks and the living room look
  const fall = V(groundAt(centre[0] - 8, centre[1]) - groundAt(centre[0] + 8, centre[1]), 0, groundAt(centre[0], centre[1] - 8) - groundAt(centre[0], centre[1] + 8)).multiplyScalar(-1);
  if (fall.lengthSq() > 1e-6) fall.normalize();
  const grade = (x: number, z: number) => { const dx = x - centre[0], dz = z - centre[1], l = Math.hypot(dx, dz) || 1; return distHouse(x, z) * (1 - 0.4 * Math.max(0, (dx * fall.x + dz * fall.z) / l)); };
  // phones keep the same leaf sizes as desktops near the house: the far-off grade, with its broad blades, is only ever
  // used well beyond walking range, or it reads as giant paper triangles when the camera comes close
  const A = lite ? 12 : 22, Bd = lite ? 60 : 46;
  const heroes: { t: Tree; kind: Kind; name?: string }[] = [], groups = new Map<string, { kind: Kind; band: number; v: number; list: Tree[] }>();
  let removed = 0;
  trees.forEach((t, i) => {
    const spec = specAt.get(i);
    if (!spec && cleared(t, i)) { removed++; return; }
    const kind = spec?.as ?? kindOf(t);
    if (spec) { heroes.push({ t, kind, name: spec.name }); return; }
    const band = distHouse(t[0], t[1]) < A ? 1 : grade(t[0], t[1]) < Bd ? 2 : 3, v = Math.floor(rnd(i + 0.5) * 3), key = `${kind}/${band}/${v}`;
    let e = groups.get(key); if (!e) groups.set(key, (e = { kind, band, v, list: [] }));
    e.list.push(t);
  });

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  // the surveyed bush around the clearing: a few modelled trees of each species, sized to each tree top
  for (const { kind, band, v, list } of groups.values()) {
    const G = GRADES[band], k = kit(kind, v + 1, G, band);
    const wood = new THREE.InstancedMesh(k.wood, woodM, list.length), leaves = new THREE.InstancedMesh(k.leaves, kind === 'kanuka' ? kanukaM : pohutuM, list.length);
    list.forEach(([x, z, h, r, hex], i) => {
      const s = x * 7.3 + z * 3.1, gy = groundAt(x, z);
      q.setFromAxisAngle(UP, rnd(s) * TAU);
      const sy = Math.max(2.5, h) / k.H, sr = Math.max(sy * 0.7, Math.min(sy * 1.5, (r * 1.15) / k.R));
      m.compose(V(x, gy, z), q, V(sr, sy, sr));
      wood.setMatrixAt(i, m); leaves.setMatrixAt(i, m);
      tintOf(hex, s, c); if (band === 3) c.multiplyScalar(0.86); // distant foliage sits under haze already
      leaves.setColorAt(i, c);
    });
    wood.name = `${kind}_wood_${band}`; leaves.name = `${kind}_foliage_${band}`;
    for (const o of [wood, leaves]) { o.instanceMatrix.needsUpdate = true; o.frustumCulled = false; o.castShadow = band < 3; o.receiveShadow = true; g.add(o); }
    if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
  }

  // the specimens kept in the clearing: each grown once, at its surveyed height and spread
  const inst = new Map<string, { kind: Kind; geo: Buf; m: THREE.Matrix4[]; c: THREE.Color[] }>();
  const kept: string[] = [];
  heroes.forEach(({ t, kind, name }, hi) => {
    const [x, z, h, r, hex] = t, gy = groundAt(x, z), s = x * 7.3 + z * 3.1, rr = rng32(Math.floor(1000 + s * 13) + hi * 71), G = lite ? GRADES[1] : GRADES[0], wood = new Buf();
    const ground = (dx: number, dz: number) => groundAt(x + dx, z + dz) - gy;
    const R = kind === 'kanuka' ? Math.max(1.5, r * 1.05) : Math.max(3, r * 1.1);
    const tips = kind === 'kanuka' ? growKanuka(wood, rr, h, R, G, ground, name && /group|pair/i.test(name) ? 3 : undefined) : growPohutukawa(wood, rr, h, R, G, ground);
    let yHi = 0, yLo = 1e9, Rm = 0;
    const measure = () => { yHi = 0; yLo = 1e9; Rm = 0; for (const tp of tips) { yHi = Math.max(yHi, tp.p.y); yLo = Math.min(yLo, tp.p.y); Rm = Math.max(Rm, Math.hypot(tp.p.x, tp.p.z)); } };
    measure();
    if (kind === 'pohutukawa') {
      // bring the grown tree to the surveyed height and spread
      const sy = Math.max(0.7, Math.min(1.35, (h - 0.4) / yHi)), sr = Math.max(0.7, Math.min(1.35, R / Rm));
      wood.fit(sr, sy); for (const tp of tips) { tp.p.x *= sr; tp.p.z *= sr; tp.p.y = 0.3 + (tp.p.y - 0.3) * sy; }
      measure();
    }
    const mesh = new THREE.Mesh(wood.geo(true), woodM);
    mesh.position.set(x, gy, z); mesh.castShadow = mesh.receiveShadow = true; mesh.name = `${kind}_specimen_wood`;
    const label = kind === 'kanuka' ? 'Kānuka' : 'Pōhutukawa';
    mesh.userData = { kind: 'planting', name: `${label}, kept`, source: 'survey', note: `${name ? `${name}. ` : ''}A surveyed tree kept in the proposed clearing: position, ${h} m height and ${r} m spread from the LiDAR canopy. The species is assumed; the form is modelled in code.` };
    g.add(mesh); kept.push(`${label} at ${x.toFixed(1)}, ${z.toFixed(1)}`);
    tintOf(hex, s, c);
    for (const tp of tips) {
      const ex = exposure(tp.p, yLo, yHi, Rm), fl = kind === 'kanuka' ? ex > 0.4 && rr() < 0.62 : ex > 0.5 && rr() < 0.5, v = Math.floor(rr() * 3), key = `${kind}/${fl ? 1 : 0}/${v}`, sh = 0.58 + 0.6 * ex;
      let e = inst.get(key); if (!e) inst.set(key, (e = { kind, geo: tuft(kind, lite ? 1 : 0, fl, v), m: [], c: [] }));
      const tm = tipMatrix(tp, G.tuft, rr); tm.premultiply(m.makeTranslation(x, gy, z));
      e.m.push(tm); e.c.push(new THREE.Color(c.r * sh, c.g * sh, c.b * sh));
    }
  });
  for (const e of inst.values()) {
    const im = new THREE.InstancedMesh(e.geo.geo(), e.kind === 'kanuka' ? kanukaM : pohutuM, e.m.length);
    e.m.forEach((mm, i) => { im.setMatrixAt(i, mm); im.setColorAt(i, e.c[i]); });
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.frustumCulled = false; im.castShadow = im.receiveShadow = true; im.name = `${e.kind}_specimen_foliage`;
    g.add(im);
  }

  // understorey: ponga under the standing bush near the house, and the proposed planting the clearing names
  const inZone = (x: number, z: number) => zones.some((zn) => !zn.sightline && inPoly(x, z, zn.pts));
  const blocked = (x: number, z: number, pad = 1.2) => keepOut.some((k) => x > k.x0 - pad && x < k.x1 + pad && z > k.z0 - pad && z < k.z1 + pad);
  {
    type Spot = { x: number; z: number; h: number; grade: 0 | 1 | 2; proposed: boolean };
    const spots: Spot[] = [];
    for (const [x, z, h] of C?.planting?.ponga ?? []) if (!blocked(x, z, 0.3)) spots.push({ x, z, h, grade: lite ? 1 : 0, proposed: true });
    const standing = trees.filter((t, i) => distHouse(t[0], t[1]) < 34 && (specAt.has(i) || !cleared(t, i)));
    standing.forEach(([x, z, h], i) => {
      if (h < 5 || rnd(i * 3.7) < 0.8) return;
      const a = rnd(i * 5.1) * TAU, d = 1.5 + rnd(i * 2.3) * 1.7, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      if (inZone(px, pz) || blocked(px, pz)) return;
      spots.push({ x: px, z: pz, h: 1.4 + rnd(i * 9.9) * 2.6, grade: !lite && distHouse(px, pz) < 15 ? 1 : 2, proposed: false });
    });
    const fr = [frond(41, 24, 5, false), frond(42, 16, 2, false, 14), frond(43, 8, 1, false, 7)], frDead = frond(44, 12, 2, true, 8);
    const lists: { m: THREE.Matrix4[] }[] = [{ m: [] }, { m: [] }, { m: [] }], dead: THREE.Matrix4[] = [];
    const trunks = new Map<string, { geo: Buf; m: THREE.Matrix4[] }>();
    const e = new THREE.Euler(), one = V(1, 1, 1), tm = new THREE.Matrix4();
    spots.forEach((sp, si) => {
      const rr = rng32(900 + si * 37), gy = groundAt(sp.x, sp.z) - 0.05, hv = sp.h < 2 ? 1.6 : sp.h < 3.2 ? 2.6 : 3.8, key = `${hv}/${sp.grade === 0 ? 1 : 0}/${si % 2}`;
      let tk = trunks.get(key); if (!tk) trunks.set(key, (tk = { geo: pongaTrunk(70 + hv * 10 + (si % 2), hv, sp.grade === 0), m: [] }));
      const yaw = rr() * TAU, sy = sp.h / hv;
      tk.m.push(new THREE.Matrix4().compose(V(sp.x, gy, sp.z), new THREE.Quaternion().setFromAxisAngle(UP, yaw), V(1, sy, 1)));
      // the trunk leans a little: find its top the way the trunk was built
      const tr0 = rng32(70 + hv * 10 + (si % 2)), lx = (tr0() - 0.5) * 0.3, lz = (tr0() - 0.5) * 0.3, top = V(lx, sp.h, lz).applyAxisAngle(UP, yaw).add(V(sp.x, gy, sp.z));
      const n = sp.grade === 0 ? 19 : sp.grade === 1 ? 13 : 9, len0 = Math.min(3.1, 1.7 + sp.h * 0.42);
      for (let k = 0; k < n; k++) {
        const tier = k / n, az = k * 2.39996 + rr() * 0.4, elev = 1.05 - tier * 0.95 + (rr() - 0.5) * 0.18, len = len0 * (0.78 + 0.3 * rr()) * (0.8 + 0.2 * tier);
        tm.compose(top.clone().add(V(Math.cos(az) * 0.05, -0.04, Math.sin(az) * 0.05)), q.setFromEuler(e.set(-elev, -az + Math.PI / 2, (rr() - 0.5) * 0.3, 'YXZ')), one.clone().multiplyScalar(len));
        lists[sp.grade].m.push(tm.clone());
      }
      // the skirt: last year's fronds hanging brown against the trunk
      const nd = sp.grade === 2 ? 2 : 4 + Math.floor(rr() * 3);
      for (let k = 0; k < nd; k++) {
        const az = k * 2.39996 + rr(), len = len0 * (0.45 + 0.22 * rr());
        tm.compose(top.clone().add(V(Math.cos(az) * 0.09, -0.1 - rr() * 0.12, Math.sin(az) * 0.09)), q.setFromEuler(e.set(0.95 + rr() * 0.3, -az + Math.PI / 2, (rr() - 0.5) * 0.4, 'YXZ')), one.clone().multiplyScalar(len));
        dead.push(tm.clone());
      }
    });
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, ms: THREE.Matrix4[], name: string) => {
      if (!ms.length) return;
      const im = new THREE.InstancedMesh(geo, mat, ms.length);
      ms.forEach((mm, i) => im.setMatrixAt(i, mm)); im.instanceMatrix.needsUpdate = true; im.frustumCulled = false; im.castShadow = im.receiveShadow = true; im.name = name;
      g.add(im);
    };
    lists.forEach((l, i) => add(fr[i].geo(), frondM, l.m, `ponga_fronds_${i}`));
    add(frDead.geo(), frondM, dead, 'ponga_dead_fronds');
    for (const tk of trunks.values()) add(tk.geo.geo(true), woodM, tk.m, 'ponga_trunks');
  }
  {
    const hk = C?.planting?.harakeke ?? [], geos = [harakeke(5, lite ? 3 : 6).geo(), harakeke(6, lite ? 3 : 6).geo()];
    for (let v = 0; v < 2; v++) {
      const list = hk.filter((_, i) => i % 2 === v && !blocked(hk[i][0], hk[i][1], 0.2)); if (!list.length) continue;
      const im = new THREE.InstancedMesh(geos[v], strapM, list.length);
      list.forEach(([x, z, s], i) => { m.compose(V(x, groundAt(x, z) - 0.16, z), q.setFromAxisAngle(UP, rnd(x * 3.3 + z) * TAU), V(s || 1, s || 1, s || 1)); im.setMatrixAt(i, m); });
      im.instanceMatrix.needsUpdate = true; im.frustumCulled = false; im.castShadow = im.receiveShadow = true; im.name = 'harakeke';
      im.userData = { kind: 'planting', name: 'Harakeke', source: 'proposed', note: 'Proposed planting, modelled in code. Not from the plan or the survey.' };
      g.add(im);
    }
    const tw = new Buf(), tl = new Buf();
    (C?.planting?.tikouka ?? []).forEach(([x, z, h], i) => {
      if (blocked(x, z, 0.2)) return;
      const w1 = new Buf(), l1 = new Buf(); tikouka(300 + i * 17, h, w1, l1);
      m.makeTranslation(x, groundAt(x, z), z); tw.add(w1, m); tl.add(l1, m);
    });
    if (tw.count) {
      const wm = new THREE.Mesh(tw.geo(true), woodM), lm = new THREE.Mesh(tl.geo(), strapM);
      for (const o of [wm, lm]) { o.castShadow = o.receiveShadow = true; o.name = 'ti_kouka'; o.userData = { kind: 'planting', name: 'Tī kōuka', source: 'proposed', note: 'Proposed planting, modelled in code. Not from the plan or the survey.' }; g.add(o); }
    }
  }

  const clearNote = C ? ` A clearing for the house is proposed, not surveyed: ${removed} surveyed tree${removed === 1 ? '' : 's'} inside it ${removed === 1 ? 'is' : 'are'} left out and ${heroes.length} kept as specimens. The survey's own list of trees is unchanged.` : '';
  g.userData = {
    kind: 'planting', name: 'Bush', source: 'survey',
    note: `One tree per tree top in the LiDAR canopy: position, height and spread from the survey, hue from the aerial photo. Species are not identified by the survey. The trees are modelled in code as kānuka and pōhutukawa in December flower, with ponga beneath, which is typical of regenerating coastal bush here; species and understorey are proposed.${clearNote}`,
    clearing: C ? { source: 'proposed', note: C.note ?? '', zones: zones.map((z) => z.name ?? 'zone'), removed, kept } : null,
  };
  return g;
}
