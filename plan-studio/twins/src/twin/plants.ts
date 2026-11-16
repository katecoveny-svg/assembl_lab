import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Native planting for the twins, built as geometry (no alpha cut-outs, so they path-trace and
// cast true shadows): harakeke, nīkau, whekī / ponga tree ferns, ground ferns, tussock,
// tī kōuka and small-leaved shrubs. Each species has a few seeded variants; placements are
// instanced. Forms follow the plants' habit at maturity; sizes are typical, not surveyed.

type V3 = THREE.Vector3;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** a builder that collects triangles with per-vertex colour */
class Geo {
  pos: number[] = [];
  col: number[] = [];
  idx: number[] = [];
  vert(p: V3, c: THREE.Color) {
    this.pos.push(p.x, p.y, p.z);
    this.col.push(c.r, c.g, c.b);
    return this.pos.length / 3 - 1;
  }
  tri(a: number, b: number, c: number) {
    this.idx.push(a, b, c);
  }
  /** a ribbon along a polyline: widths per point, `side` the across direction per point, optional V-fold */
  ribbon(pts: V3[], side: V3[], widths: number[], colour: (t: number, edge: number) => THREE.Color, fold = 0, foldDir?: V3[]) {
    const n = pts.length;
    const rows: number[][] = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const w = widths[i] / 2;
      const s = side[i];
      const f = foldDir ? foldDir[i].clone().multiplyScalar(fold * w) : V();
      const l = this.vert(pts[i].clone().addScaledVector(s, -w).add(f), colour(t, 1));
      const m = this.vert(pts[i].clone(), colour(t, 0));
      const r = this.vert(pts[i].clone().addScaledVector(s, w).add(f), colour(t, 1));
      rows.push([l, m, r]);
    }
    for (let i = 0; i < n - 1; i++) {
      const [a0, b0, c0] = rows[i];
      const [a1, b1, c1] = rows[i + 1];
      this.tri(a0, a1, b0);
      this.tri(b0, a1, b1);
      this.tri(b0, b1, c0);
      this.tri(c0, b1, c1);
    }
  }
  /** a tapered tube along a polyline (trunks, stems) */
  tube(pts: V3[], radii: number[], seg: number, colour: (t: number, a: number) => THREE.Color) {
    const n = pts.length;
    const base = this.pos.length / 3;
    let prevN = V(1, 0, 0);
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const d = (i < n - 1 ? pts[i + 1].clone().sub(pts[i]) : pts[i].clone().sub(pts[i - 1])).normalize();
      let nn = prevN.clone().sub(d.clone().multiplyScalar(prevN.dot(d)));
      if (nn.lengthSq() < 1e-6) nn = Math.abs(d.y) < 0.9 ? V(0, 1, 0).cross(d) : V(1, 0, 0).cross(d);
      nn.normalize();
      prevN = nn;
      const b = d.clone().cross(nn).normalize();
      for (let k = 0; k <= seg; k++) {
        const a = (k / seg) * Math.PI * 2;
        const p = pts[i].clone().addScaledVector(nn, Math.cos(a) * radii[i]).addScaledVector(b, Math.sin(a) * radii[i]);
        this.vert(p, colour(t, a));
      }
    }
    for (let i = 0; i < n - 1; i++) {
      for (let k = 0; k < seg; k++) {
        const a = base + i * (seg + 1) + k;
        const c = a + seg + 1;
        this.tri(a, c, a + 1);
        this.tri(a + 1, c, c + 1);
      }
    }
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.idx);
    g.computeVertexNormals();
    return g;
  }
}

const C = (hex: number, k = 1) => new THREE.Color(hex).multiplyScalar(k);
/** a curve that leaves a base in direction `dir` (unit, horizontal part) at elevation `up`, arching down under `droop` */
function arch(base: V3, dir: V3, len: number, up: number, droop: number, n: number) {
  const pts: V3[] = [];
  const h = dir.clone().setY(0).normalize();
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const s = t * len;
    const y = Math.sin(up) * s - droop * s * s;
    const x = Math.cos(up) * s;
    pts.push(base.clone().addScaledVector(h, x).add(V(0, y, 0)));
  }
  return pts;
}
function sides(pts: V3[], fallback = V(0, 1, 0)) {
  return pts.map((p, i) => {
    const d = (i < pts.length - 1 ? pts[i + 1].clone().sub(p) : p.clone().sub(pts[i - 1])).normalize();
    let s = d.clone().cross(fallback);
    if (s.lengthSq() < 1e-6) s = V(1, 0, 0);
    return s.normalize();
  });
}

// --- species ------------------------------------------------------------------------------------
export function harakeke(seed: number, size = 1) {
  const R = rng(seed);
  const g = new Geo();
  const leaves = 28 + Math.floor(R() * 14);
  for (let i = 0; i < leaves; i++) {
    const a = R() * Math.PI * 2;
    const dir = V(Math.cos(a), 0, Math.sin(a));
    const len = (1.0 + R() * 1.0) * size;
    const up = 1.0 + R() * 0.45;
    const base = V((R() - 0.5) * 0.25 * size, 0, (R() - 0.5) * 0.25 * size);
    const pts = arch(base, dir, len, up, 0.18 + R() * 0.25, 12);
    const sd = sides(pts);
    const w = pts.map((_, k) => 0.07 * size * (1 - (k / 11) * 0.85));
    const fold = pts.map(() => V(0, 0.35, 0));
    const tone = 0.75 + 0.35 * R();
    g.ribbon(pts, sd, w, (t, e) => (e ? C(0x6b4a2a, 0.8) : C(0x4f6b2c, tone * (0.85 + 0.25 * t))), 1, fold);
  }
  return g.build();
}

export function nikau(seed: number, height = 5) {
  const R = rng(seed);
  const g = new Geo();
  const lean = V((R() - 0.5) * 0.25, 0, (R() - 0.5) * 0.25);
  const trunk: V3[] = [];
  const tn = 14;
  for (let i = 0; i < tn; i++) {
    const t = i / (tn - 1);
    trunk.push(V(lean.x * t * height * 0.15, t * height, lean.z * t * height * 0.15));
  }
  // ringed grey-green trunk
  g.tube(trunk, trunk.map((_, i) => 0.14 - 0.03 * (i / (tn - 1))), 10, (t) => {
    const ring = Math.abs(Math.sin(t * height * 9.0)) > 0.92 ? 0.7 : 1;
    return C(0x7d7f6a, ring * (0.95 + 0.1 * t));
  });
  // bulging crownshaft
  const top = trunk[tn - 1];
  const cs = [0, 0.15, 0.4, 0.65, 0.8].map((s) => top.clone().add(V(0, s, 0)));
  g.tube(cs, [0.12, 0.17, 0.17, 0.13, 0.07], 12, () => C(0x5e7a3b, 1.1));
  // fronds: a shuttlecock crown, rising then arching
  const crown = top.clone().add(V(0, 0.8, 0));
  const fronds = 9 + Math.floor(R() * 3);
  for (let f = 0; f < fronds; f++) {
    const a = (f / fronds) * Math.PI * 2 + R() * 0.3;
    const dir = V(Math.cos(a), 0, Math.sin(a));
    const len = 2.4 + R() * 0.8;
    const rach = arch(crown, dir, len, 1.15 - R() * 0.25, 0.32 + R() * 0.12, 18);
    g.tube(rach, rach.map((_, k) => 0.025 * (1 - k / 18)), 4, () => C(0x627543));
    const sd = sides(rach);
    // pinnae either side, angled upward into a V
    for (let k = 2; k < rach.length - 1; k++) {
      const t = k / (rach.length - 1);
      const plen = (0.75 - 0.45 * Math.abs(t - 0.45)) * (1 - t * 0.35);
      for (const s of [-1, 1]) {
        const out = sd[k].clone().multiplyScalar(s).add(V(0, 0.55, 0)).normalize();
        const tip = rach[k].clone().addScaledVector(out, plen).add(V(0, -0.12 * plen, 0));
        const mid = rach[k].clone().lerp(tip, 0.5).add(V(0, 0.05, 0));
        const along = rach[k + 1].clone().sub(rach[k]).normalize();
        g.ribbon([rach[k], mid, tip], [along, along, along], [0.045, 0.04, 0.005], () => C(0x3f6a2a, 0.9 + 0.2 * R()));
      }
    }
  }
  return g.build();
}

export function treeFern(seed: number, height = 3, silver = true) {
  const R = rng(seed);
  const g = new Geo();
  const tn = 12;
  const bend = V((R() - 0.5) * 0.4, 0, (R() - 0.5) * 0.4);
  const trunk: V3[] = [];
  for (let i = 0; i < tn; i++) {
    const t = i / (tn - 1);
    trunk.push(V(bend.x * t * t, t * height, bend.z * t * t));
  }
  g.tube(trunk, trunk.map((_, i) => 0.17 - 0.05 * (i / (tn - 1))), 10, (t, a) => C(0x3b2b20, 0.8 + 0.3 * Math.abs(Math.sin(a * 5 + t * 40))));
  const crown = trunk[tn - 1].clone().add(V(0, 0.1, 0));
  const fronds = 10 + Math.floor(R() * 5);
  for (let f = 0; f < fronds; f++) {
    const a = (f / fronds) * Math.PI * 2 + R() * 0.4;
    const dir = V(Math.cos(a), 0, Math.sin(a));
    const len = 2.0 + R() * 0.7;
    const rach = arch(crown, dir, len, 0.65 + R() * 0.25, 0.28 + R() * 0.1, 16);
    g.tube(rach, rach.map((_, k) => 0.02 * (1 - k / 16)), 4, () => C(0x4a5a2a));
    const sd = sides(rach);
    for (let k = 1; k < rach.length - 1; k++) {
      const t = k / (rach.length - 1);
      const plen = 0.5 * Math.sin(Math.PI * Math.min(1, t * 1.1 + 0.08));
      for (const s of [-1, 1]) {
        const out = sd[k].clone().multiplyScalar(s).add(V(0, -0.1, 0)).normalize();
        const tip = rach[k].clone().addScaledVector(out, plen).add(V(0, -0.08 * plen, 0));
        const along = rach[k + 1].clone().sub(rach[k]).normalize();
        // pinnules as a toothed ribbon
        const pts = [0, 0.33, 0.66, 1].map((u) => rach[k].clone().lerp(tip, u).add(V(0, -0.04 * Math.sin(u * Math.PI), 0)));
        g.ribbon(pts, pts.map(() => along), [0.09, 0.1, 0.07, 0.01], (_t, e) => (e && silver ? C(0x8a9a78) : C(0x3c5e26, 0.85 + 0.25 * R())));
      }
    }
  }
  return g.build();
}

export function groundFern(seed: number, size = 0.8) {
  const R = rng(seed);
  const g = new Geo();
  const fronds = 7 + Math.floor(R() * 5);
  for (let f = 0; f < fronds; f++) {
    const a = R() * Math.PI * 2;
    const dir = V(Math.cos(a), 0, Math.sin(a));
    const len = size * (0.7 + R() * 0.5);
    const rach = arch(V(), dir, len, 0.9 + R() * 0.4, 0.5 / size, 10);
    const sd = sides(rach);
    for (let k = 1; k < rach.length - 1; k++) {
      const t = k / (rach.length - 1);
      const plen = 0.16 * size * Math.sin(Math.PI * Math.min(1, t + 0.1));
      for (const s of [-1, 1]) {
        const tip = rach[k].clone().addScaledVector(sd[k], s * plen).add(V(0, -0.02, 0));
        const along = rach[k + 1].clone().sub(rach[k]).normalize();
        g.ribbon([rach[k], tip], [along, along], [0.05 * size, 0.01], () => C(0x4e7a2e, 0.85 + 0.3 * R()));
      }
    }
  }
  return g.build();
}

export function tussock(seed: number, size = 0.7, golden = false) {
  const R = rng(seed);
  const g = new Geo();
  const n = 70 + Math.floor(R() * 40);
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2;
    const dir = V(Math.cos(a), 0, Math.sin(a));
    const len = size * (0.6 + R() * 0.6);
    const pts = arch(V((R() - 0.5) * 0.12, 0, (R() - 0.5) * 0.12), dir, len, 1.15 + R() * 0.3, 0.9 / size, 6);
    const tone = golden ? C(0xb59a57, 0.8 + 0.35 * R()) : C(0x7a8a4a, 0.7 + 0.4 * R());
    g.ribbon(pts, sides(pts), pts.map((_, k) => 0.012 * (1 - k / 6)), () => tone);
  }
  return g.build();
}

export function cabbageTree(seed: number, height = 4) {
  const R = rng(seed);
  const g = new Geo();
  const trunk = [0, 0.3, 0.55].map((t) => V(0, t * height, 0));
  g.tube(trunk, [0.14, 0.11, 0.09], 8, () => C(0x6b5e4e));
  const heads: V3[] = [];
  const nb = 2 + Math.floor(R() * 3);
  for (let b = 0; b < nb; b++) {
    const a = R() * Math.PI * 2;
    const p0 = trunk[2];
    const p1 = p0.clone().add(V(Math.cos(a) * 0.5, 0.45 * height * 0.25 + 0.4, Math.sin(a) * 0.5));
    const p2 = p1.clone().add(V(Math.cos(a) * 0.25, 0.35 * height * 0.2 + 0.3, Math.sin(a) * 0.25));
    g.tube([p0, p1, p2], [0.08, 0.06, 0.05], 6, () => C(0x6b5e4e));
    heads.push(p2);
  }
  for (const h of heads) {
    for (let i = 0; i < 60; i++) {
      const a = R() * Math.PI * 2;
      const el = (R() * 1.6 - 0.45) * 0.95;
      const dir = V(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el));
      const len = 0.6 + R() * 0.3;
      const pts = [0, 0.35, 0.7, 1].map((t) => h.clone().addScaledVector(dir, t * len).add(V(0, -0.35 * t * t * len, 0)));
      g.ribbon(pts, sides(pts), [0.04, 0.035, 0.025, 0.004], () => C(0x6f7f42, 0.85 + 0.3 * R()));
    }
  }
  return g.build();
}

export function shrub(seed: number, size = 0.9, hex = 0x3f5f2a) {
  const R = rng(seed);
  const g = new Geo();
  const n = Math.round(260 * size);
  for (let i = 0; i < n; i++) {
    const u = R() * Math.PI * 2;
    const v = Math.acos(1 - R() * 1.7);
    const r = size * (0.45 + 0.1 * R()) * Math.sqrt(0.6 + 0.4 * R());
    const c = V(Math.cos(u) * Math.sin(v) * r, size * 0.45 + Math.cos(v) * size * 0.42, Math.sin(u) * Math.sin(v) * r);
    const nrm = c.clone().sub(V(0, size * 0.45, 0)).normalize();
    const t1 = nrm.clone().cross(V(0, 1, 0.3)).normalize();
    const l = 0.07 * (0.8 + 0.5 * R());
    const tone = C(hex, 0.75 + 0.45 * R());
    const a = g.vert(c.clone().addScaledVector(t1, -l), tone);
    const b = g.vert(c.clone().addScaledVector(t1, l), tone);
    const d = g.vert(c.clone().addScaledVector(nrm.clone().cross(t1), l * 0.6).addScaledVector(nrm, 0.01), tone);
    const e = g.vert(c.clone().addScaledVector(nrm.clone().cross(t1), -l * 0.6).addScaledVector(nrm, 0.01), tone);
    g.tri(a, d, b);
    g.tri(a, b, e);
  }
  // a few stems under the canopy
  for (let i = 0; i < 6; i++) {
    const a = R() * Math.PI * 2;
    g.tube([V(), V(Math.cos(a) * 0.2 * size, size * 0.5, Math.sin(a) * 0.2 * size)], [0.025, 0.015], 5, () => C(0x4b3b2b));
  }
  return g.build();
}

// --- planting ----------------------------------------------------------------------------------------
export type Species = 'harakeke' | 'nikau' | 'wheki' | 'ponga' | 'fern' | 'tussock' | 'carex' | 'tikouka' | 'kawakawa' | 'hebe' | 'coprosma';
const LABEL: Record<Species, string> = {
  harakeke: 'Harakeke (flax)',
  nikau: 'Nīkau',
  wheki: 'Whekī (tree fern)',
  ponga: 'Ponga (silver tree fern)',
  fern: 'Ground fern',
  tussock: 'Tussock',
  carex: 'Carex (sedge)',
  tikouka: 'Tī kōuka (cabbage tree)',
  kawakawa: 'Kawakawa',
  hebe: 'Hebe',
  coprosma: 'Coprosma',
};
function make(sp: Species, seed: number) {
  switch (sp) {
    case 'harakeke':
      return harakeke(seed, 1);
    case 'nikau':
      return nikau(seed, 4 + (seed % 3) * 0.9);
    case 'wheki':
      return treeFern(seed, 2.4 + (seed % 3) * 0.6, false);
    case 'ponga':
      return treeFern(seed, 3.0 + (seed % 3) * 0.7, true);
    case 'fern':
      return groundFern(seed, 0.8);
    case 'tussock':
      return tussock(seed, 0.75, true);
    case 'carex':
      return tussock(seed, 0.55, false);
    case 'tikouka':
      return cabbageTree(seed, 4);
    case 'kawakawa':
      return shrub(seed, 1.0, 0x3d6a2c);
    case 'hebe':
      return shrub(seed, 0.8, 0x4a6a3a);
    case 'coprosma':
      return shrub(seed, 0.9, 0x5a5a2c);
  }
}

let leafMat: THREE.MeshStandardMaterial | null = null;
export function plantMaterial() {
  if (!leafMat) leafMat = new THREE.MeshStandardMaterial({ name: 'native_foliage', vertexColors: true, side: THREE.DoubleSide, roughness: 0.62, metalness: 0 });
  return leafMat;
}

export interface Placement {
  sp: Species;
  x: number;
  y: number;
  z: number;
  s?: number;
  r?: number;
}

/** instance the placements: 3 variants per species, each an InstancedMesh with its name and provenance */
export function planting(list: Placement[], note: string, source = 'proposed') {
  const g = new THREE.Group();
  g.name = 'native_planting';
  const by = new Map<Species, Placement[]>();
  for (const p of list) by.set(p.sp, [...(by.get(p.sp) ?? []), p]);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  for (const [sp, ps] of by) {
    const variants = [11, 23, 37].map((s) => make(sp, s + sp.length * 7));
    variants.forEach((geo, vi) => {
      const mine = ps.filter((_, i) => i % variants.length === vi);
      if (!mine.length) return;
      const im = new THREE.InstancedMesh(geo, plantMaterial(), mine.length);
      mine.forEach((p, i) => {
        q.setFromAxisAngle(V(0, 1, 0), p.r ?? (i * 2.399) % (Math.PI * 2));
        const s = p.s ?? 1;
        m.compose(V(p.x, p.y, p.z), q, V(s, s, s));
        im.setMatrixAt(i, m);
      });
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
      im.castShadow = true;
      im.receiveShadow = true;
      im.name = `${sp}_${vi}`;
      im.userData = { kind: 'planting', name: LABEL[sp], source, note };
      g.add(im);
    });
  }
  return g;
}

/** merge helper for callers that want one mesh */
export function merged(list: THREE.BufferGeometry[]) {
  return mergeGeometries(list);
}
