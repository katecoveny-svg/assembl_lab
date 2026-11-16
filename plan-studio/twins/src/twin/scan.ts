import * as THREE from 'three/webgpu';
import { GaussianSplat } from 'three/addons/objects/GaussianSplat.js';
import { createGaussianSplatGeometry, writeCovariance } from 'three/addons/utils/GaussianSplatUtils.js';
import { GaussianSplatPLYLoader } from 'three/addons/loaders/GaussianSplatPLYLoader.js';
import { SPZLoader } from 'three/addons/loaders/SPZLoader.js';
import { SPLATLoader } from 'three/addons/loaders/SPLATLoader.js';
import { KSPLATLoader } from 'three/addons/loaders/KSPLATLoader.js';
import { inPoly, type Site } from './site';

// Site scans as 3D Gaussian splats, drawn by three.js's own WebGPU splat renderer.
//
// The sample is synthetic: a planted section generated here in code, standing in for a drone or
// phone capture of a site before building. A real capture (.ply from 3DGS training, .spz, .splat,
// .ksplat) replaces it through loadScanFile.

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
function vnoise(x: number, y: number, seed: number) {
  const h = (i: number, j: number) => {
    let n = Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(seed, 2147483647);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return h(xi, yi) * (1 - u) * (1 - v) + h(xi + 1, yi) * u * (1 - v) + h(xi, yi + 1) * (1 - u) * v + h(xi + 1, yi + 1) * u * v;
}
const fbm = (x: number, y: number, seed: number) => vnoise(x, y, seed) * 0.5 + vnoise(x * 2.1, y * 2.1, seed + 1) * 0.3 + vnoise(x * 4.3, y * 4.3, seed + 2) * 0.2;

class SplatBuffer {
  centers: number[] = [];
  cov: number[] = [];
  colors: number[] = [];
  private q = new THREE.Quaternion();
  private z = new THREE.Vector3(0, 0, 1);
  private tmp = new Float32Array(6);
  /** a splat: centre, its three radii, the direction of its thinnest axis, colour (sRGB 0..1), opacity */
  add(p: THREE.Vector3, sx: number, sy: number, sz: number, normal: THREE.Vector3 | null, r: number, g: number, b: number, a = 0.92) {
    this.centers.push(p.x, p.y, p.z);
    if (normal) this.q.setFromUnitVectors(this.z, normal);
    else this.q.identity();
    writeCovariance(this.tmp, 0, sx, sy, sz, this.q.x, this.q.y, this.q.z, this.q.w);
    for (let i = 0; i < 6; i++) this.cov.push(this.tmp[i]);
    this.colors.push(Math.round(Math.min(1, Math.max(0, r)) * 255), Math.round(Math.min(1, Math.max(0, g)) * 255), Math.round(Math.min(1, Math.max(0, b)) * 255), Math.round(a * 255));
  }
  get count() {
    return this.centers.length / 3;
  }
  build() {
    return createGaussianSplatGeometry(new Float32Array(this.centers), new Float32Array(this.cov), new Uint8Array(this.colors));
  }
}

/**
 * A simulated capture of the site as it stands today, generated from the survey: ground (lawn,
 * concrete drive), the existing dwelling, the surveyed trees and the boundary hedge. It stands
 * in for a drone or phone capture so the layer can be shown and aligned; it is not a scan.
 */
export function syntheticCapture(site: Site, o: { density?: number; seed?: number } = {}) {
  const R = rng(o.seed ?? 7);
  const S = new SplatBuffer();
  const p = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const dens = o.density ?? 1;
  const B = site.data.boundary;
  const xs = [B.NW, B.NE, B.E, B.Sp, B.SW].map((q) => q[0]);
  const ns = [B.NW, B.NE, B.E, B.Sp, B.SW].map((q) => q[1]);
  const e0 = Math.min(...xs) - 6;
  const e1 = Math.max(...xs) + 6;
  const n0 = Math.min(...ns) - 6;
  const n1 = Math.max(...ns) + 6;
  const drive = site.data.impervious.polys;
  const put = (e: number, n: number, y: number, sx: number, sy: number, sz: number, nrm: THREE.Vector3 | null, r: number, g: number, b: number, a = 0.92) => {
    p.set(e, y, -n);
    S.add(p, sx, sy, sz, nrm, r, g, b, a);
  };
  // ground
  const nGround = Math.round(160000 * dens);
  for (let i = 0; i < nGround; i++) {
    const e = e0 + R() * (e1 - e0);
    const n = n0 + R() * (n1 - n0);
    const inside = inPoly([e, n], site.lot) || inPoly([e, n], site.leg);
    if (!inside && R() < 0.55) continue;
    const y = site.existing(e, n);
    if (drive.some((q) => inPoly([e, n], q))) {
      const g = 0.66 + 0.12 * R() + 0.06 * fbm(e * 0.4, n * 0.4, 5);
      put(e, n, y + 0.005, 0.06, 0.06, 0.006, up, g, g * 0.98, g * 0.93);
    } else {
      const k = inside ? 1 : 0.8;
      const s = fbm(e * 0.3, n * 0.3, 11);
      const stripe = Math.floor((e * 0.88 + n * 0.47 + 100) / 1.1) % 2 ? 0.95 : 1.04;
      put(e, n, y + 0.01, 0.07, 0.07, 0.01, up, (0.22 + 0.1 * s) * stripe * k, (0.4 + 0.13 * s) * stripe * k, (0.15 + 0.06 * s) * stripe * k, 0.95);
    }
  }
  // the existing dwelling: painted walls with dark window bands, roofs to the surveyed ridges
  const E = site.data.existing;
  for (const part of [E.west, E.east]) {
    const r = part.rect;
    const base = Math.min(...r.map((q) => site.existing(q[0], q[1])));
    const per: [number, number][] = r.map((q) => [q[0], q[1]]);
    for (let k = 0; k < 4; k++) {
      const a = per[k];
      const b = per[(k + 1) % 4];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const nrm = new THREE.Vector3(b[1] - a[1], 0, b[0] - a[0]).normalize();
      for (let i = 0; i < 2600 * dens * (L / 8); i++) {
        const t = R();
        const e = a[0] + (b[0] - a[0]) * t;
        const n = a[1] + (b[1] - a[1]) * t;
        const g0 = site.existing(e, n);
        const y = g0 + R() * (E.eave - g0);
        const win = Math.floor(t * L) % 3 === 1 && y > g0 + 0.9 && y < g0 + 2.2;
        const c = win ? 0.18 : 0.8 + 0.06 * R();
        put(e, n, y, 0.06, 0.06, 0.02, nrm, c, c * 0.97, c * (win ? 1.1 : 0.9));
      }
    }
    const c: [number, number] = [(r[0][0] + r[2][0]) / 2, (r[0][1] + r[2][1]) / 2];
    for (let i = 0; i < 9000 * dens; i++) {
      const s = R();
      const t = R();
      const e = r[0][0] + (r[1][0] - r[0][0]) * s + (r[3][0] - r[0][0]) * t;
      const n = r[0][1] + (r[1][1] - r[0][1]) * s + (r[3][1] - r[0][1]) * t;
      // height falls from the ridge towards the eaves (a hip, approximately)
      const d = Math.max(Math.abs(s - 0.5), Math.abs(t - 0.5)) * 2;
      const y = part.ridge - (part.ridge - E.eave) * d;
      const g = 0.38 + 0.08 * R();
      put(e, n, y, 0.08, 0.08, 0.02, up, g * 1.05, g * 0.92, g * 0.86);
      void c;
    }
    void base;
  }
  // surveyed trees: broadleaf canopies (species not recorded on the survey)
  for (const [i, t] of site.data.trees.entries()) {
    const g0 = site.existing(t[0], t[1]);
    const h = 3.2 + (i % 2) * 0.8;
    const rad = 1.9 + (i % 3) * 0.3;
    for (let k = 0; k < 900 * dens; k++) {
      const q = R();
      put(t[0] + (R() - 0.5) * 0.25, t[1] + (R() - 0.5) * 0.25, g0 + q * h * 0.55, 0.04, 0.07, 0.04, null, 0.3, 0.25, 0.2);
    }
    for (let k = 0; k < 16000 * dens; k++) {
      const u = R() * Math.PI * 2;
      const v = Math.acos(1 - R() * 1.8);
      const lump = 0.8 + 0.3 * fbm(Math.cos(u) * 3 + i, Math.sin(u) * 3 + v * 2, 17);
      const sr = rad * lump * Math.sqrt(R() * 0.3 + 0.7);
      const top = Math.cos(v);
      const gg = 0.55 + 0.4 * top + 0.2 * R();
      put(t[0] + Math.cos(u) * Math.sin(v) * sr, t[1] + Math.sin(u) * Math.sin(v) * sr, g0 + h * 0.55 + Math.cos(v) * h * 0.45 * lump, 0.09, 0.09, 0.05, null, 0.13 * gg, 0.25 * gg, 0.11 * gg, 0.9);
    }
  }
  // the clipped hedge along the west boundary
  const [ha, hb] = site.data.hedge;
  for (let i = 0; i < 22000 * dens; i++) {
    const t = R();
    const e = ha[0] + (hb[0] - ha[0]) * t + (R() - 0.5) * 0.9;
    const n = ha[1] + (hb[1] - ha[1]) * t + (R() - 0.5) * 0.9;
    const y = site.existing(e, n) + R() * 1.7;
    const g = 0.55 + 0.35 * R();
    put(e, n, y, 0.07, 0.07, 0.05, null, 0.14 * g, 0.27 * g, 0.12 * g, 0.9);
  }
  // capture haze
  for (let i = 0; i < 1500 * dens; i++) {
    const e = e0 + R() * (e1 - e0);
    const n = n0 + R() * (n1 - n0);
    const g = 0.5 + 0.4 * R();
    put(e, n, site.existing(e, n) + R() * 5, 0.05, 0.05, 0.05, null, g * 0.8, g * 0.85, g * 0.8, 0.15);
  }
  const splat = new GaussianSplat(S.build());
  splat.name = 'site_capture_simulated';
  splat.userData = { kind: 'scan', source: 'simulated', splats: S.count, note: 'Simulated capture generated in code from the survey. Not a scan.' };
  return splat;
}

/** A capture from a file: 3DGS .ply, .spz, .splat or .ksplat. */
export async function loadScanFile(name: string, data: ArrayBuffer) {
  const ext = name.toLowerCase().split('.').pop();
  let geo: THREE.BufferGeometry | undefined;
  if (ext === 'ply') geo = new GaussianSplatPLYLoader().parse(data);
  else if (ext === 'spz') geo = (await new SPZLoader().parse(data)) as THREE.BufferGeometry | undefined;
  else if (ext === 'splat') geo = new SPLATLoader().parse(data);
  else if (ext === 'ksplat') geo = new KSPLATLoader().parse(data);
  else throw new Error(`.${ext} is not a splat format this viewer reads (ply, spz, splat, ksplat)`);
  if (!geo) throw new Error(`${name} could not be read as a splat file`);
  const splat = new GaussianSplat(geo);
  splat.name = name;
  splat.userData = { kind: 'scan', source: name, splats: geo.getAttribute('position').count };
  return splat;
}
