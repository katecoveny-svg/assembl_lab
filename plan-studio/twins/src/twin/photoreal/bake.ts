// The light bake's driver on the page: picks the surfaces that receive baked light (the house, its fit-out, the
// site works and the ground near it), tessellates their big faces, welds their vertices into sample points, gathers
// every nearby surface as an occluder (bush included), fans the tracing out to web workers, smooths the result on the
// mesh graph and writes it back as vertex attributes. Deterministic: the same plan bakes to the same file.
import * as THREE from 'three/webgpu';
import { MS, fnv, packBake, unpackBake, type SkyMap, type Sun } from './bakeCore.ts';
import { bakeWithPool, inlinePool, type BakeInput, type Pool } from './bakeRun.ts';
import { tessellate, type AttrIn } from './tessellate.ts';

export interface Receiver {
  mesh: THREE.Mesh;
  back: boolean;
  ids: Uint32Array;
  idsB: Uint32Array | null;
  orig: THREE.BufferGeometry;
  geo: THREE.BufferGeometry;
}
export interface Prepared {
  receivers: Receiver[];
  samples: Float32Array;
  ea: Uint32Array;
  eb: Uint32Array;
  occ: { o: THREE.Mesh; inst: number[] | null }[];
  soup: { tri: Float32Array; mat: Uint16Array } | null;
  triSample: Int32Array | null;
  triSampleB: Int32Array | null;
  mats: Float32Array | null;
  hash: string;
  focus: [number, number, number];
  stats: Record<string, number | string>;
}
export interface BakeOpts {
  spp?: number;
  workers?: number;
  log?: (m: string) => void;
  progress?: (f: number, label: string) => void;
}

const V = new THREE.Vector3(), N3 = new THREE.Matrix3(), M4 = new THREE.Matrix4(), IM = new THREE.Matrix4();

function shown(o: THREE.Object3D | null): boolean { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; }
function mat0(o: THREE.Mesh) { return (Array.isArray(o.material) ? o.material[0] : o.material) as THREE.MeshStandardMaterial; }
const isGlass = (m: THREE.MeshPhysicalMaterial) => (m.transmission ?? 0) > 0 || /glass|window|lens/i.test(m.name ?? '') || (m.transparent && m.opacity < 0.5);
const isFoliage = (o: THREE.Object3D, m: THREE.Material) => /foliage|leaf|leaves|frond|harakeke|fern|grass|tussock|canopy|crown|shrub|flax/i.test(`${o.name} ${m.name}`) || (m.alphaTest ?? 0) > 0;

/** mean linear colour of a texture (for bounce light), memoised */
const texMean = new Map<THREE.Texture, [number, number, number]>();
function meanOf(t: THREE.Texture | null | undefined): [number, number, number] {
  if (!t || !t.image) return [1, 1, 1];
  const hit = texMean.get(t); if (hit) return hit;
  let res: [number, number, number] = [1, 1, 1];
  try {
    const c = document.createElement('canvas'); c.width = c.height = 16;
    const g = c.getContext('2d', { willReadFrequently: true })!;
    g.drawImage(t.image as CanvasImageSource, 0, 0, 16, 16);
    const d = g.getImageData(0, 0, 16, 16).data;
    const lin = (x: number) => { x /= 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
    let r = 0, gg = 0, b = 0;
    for (let i = 0; i < d.length; i += 4) { r += lin(d[i]); gg += lin(d[i + 1]); b += lin(d[i + 2]); }
    const n = d.length / 4;
    res = t.colorSpace === THREE.SRGBColorSpace || t.colorSpace === undefined ? [r / n, gg / n, b / n] : [r / n, gg / n, b / n];
  } catch { /* unreadable image: neutral */ }
  texMean.set(t, res);
  return res;
}

/** how finely a receiver is tessellated, metres: floors carry contact shadows, so they are the densest */
function maxEdgeFor(o: THREE.Mesh, m: THREE.Material, layer: string): number {
  const s = `${o.name} ${m.name}`.toLowerCase();
  if (layer === 'ground' || /survey|terrain|ground/.test(s)) return 1e9;
  if (/joist|bearer|pile|framing|treated_pine|core/.test(s)) return 0.8;
  if (/roof/.test(s)) return 1.2;
  if (/rug|throw|cushion|linen|wool|boucle|fabric/.test(s)) return 0.5;
  if (/deck|board/.test(s)) return 0.3;
  if (/floor|tile|porcelain|travertine/.test(s)) return 0.12;
  if (/lining|partition|ceiling|wall_paint|interior|skirting|soffit/.test(s)) return 0.25;
  if (/cladding|fascia|flashing|retaining|path|pad|parking|paving|mulch|bed/.test(s)) return 0.4;
  return 0.3;
}

function copyAttr(a: THREE.BufferAttribute | THREE.InterleavedBufferAttribute): Float32Array {
  const n = a.count, s = a.itemSize, out = new Float32Array(n * s);
  for (let i = 0; i < n; i++) for (let k = 0; k < s; k++) out[i * s + k] = a.getComponent(i, k);
  return out;
}

/** a receiver's own, tessellated copy of its geometry (so per-vertex light never lands on a shared buffer) */
function ownGeometry(o: THREE.Mesh, maxEdge: number, boxUV = false): THREE.BufferGeometry {
  const g = o.geometry;
  const attrs: Record<string, AttrIn> = {};
  if (!g.attributes.normal) g.computeVertexNormals();
  for (const [name, a] of Object.entries(g.attributes)) {
    if (name === 'gi' || name === 'gd' || name === 'giB') continue;
    attrs[name] = { array: copyAttr(a as THREE.BufferAttribute), itemSize: a.itemSize, unit: name === 'normal' };
  }
  o.updateMatrixWorld();
  const e = o.matrixWorld.elements;
  const sc = Math.max(Math.hypot(e[0], e[1], e[2]), Math.hypot(e[4], e[5], e[6]), Math.hypot(e[8], e[9], e[10]));
  const idx = g.index ? (g.index.array as ArrayLike<number>) : null;
  const t = g.groups.length > 1 || maxEdge > 1e8 ? null : tessellate(attrs, idx, maxEdge, sc, Math.max(g.attributes.position.count, 60000));
  const out = new THREE.BufferGeometry();
  if (!t) { for (const [k, a] of Object.entries(attrs)) out.setAttribute(k, new THREE.BufferAttribute(a.array, a.itemSize)); out.setIndex(g.index ? Array.from(g.index.array as ArrayLike<number>) : Array.from({ length: g.attributes.position.count }, (_, i) => i)); for (const gr of g.groups) out.addGroup(gr.start, gr.count, gr.materialIndex); }
  else { for (const [k, a] of Object.entries(t.attrs)) out.setAttribute(k, new THREE.BufferAttribute(a, attrs[k].itemSize)); out.setIndex(new THREE.BufferAttribute(t.index, 1)); }
  if (boxUV) {
    // box-projected UVs in metres, so drawn micro-detail lies at its real size
    const p = out.attributes.position, nr = out.attributes.normal, uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) {
      const ax = Math.abs(nr.getX(i)), ay = Math.abs(nr.getY(i)), az = Math.abs(nr.getZ(i));
      const x = p.getX(i) * sc, y = p.getY(i) * sc, z = p.getZ(i) * sc;
      if (ay >= ax && ay >= az) { uv[i * 2] = x; uv[i * 2 + 1] = z; } else if (ax >= az) { uv[i * 2] = z; uv[i * 2 + 1] = y; } else { uv[i * 2] = x; uv[i * 2 + 1] = y; }
    }
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  } else if (!out.attributes.uv) out.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(out.attributes.position.count * 2), 2));
  out.boundingBox = null; out.computeBoundingSphere();
  out.name = g.name;
  return out;
}

/** a stand-in for a heavy instanced mesh in the bake: its bounding box, shrunk a little, with the same matrices */
const proxies = new Map<THREE.BufferGeometry, THREE.BufferGeometry>();
function proxyMesh(src: THREE.Mesh, foliage: boolean): THREE.Mesh {
  let g = proxies.get(src.geometry);
  if (!g) {
    if (!src.geometry.boundingBox) src.geometry.computeBoundingBox();
    const b = src.geometry.boundingBox!, c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3()).multiplyScalar(foliage ? 0.8 : 0.6);
    g = new THREE.BoxGeometry(Math.max(s.x, 0.02), Math.max(s.y, 0.02), Math.max(s.z, 0.02)).translate(c.x, c.y, c.z);
    proxies.set(src.geometry, g);
  }
  const m = new THREE.MeshStandardMaterial({ color: foliage ? 0x3c5a2a : 0x4a3b2c, side: THREE.DoubleSide });
  m.name = foliage ? 'bake_proxy_foliage' : 'bake_proxy_tree';
  m.userData.bakeThru = foliage ? 0.55 : 0.15;
  const p = new THREE.Mesh(g, m) as unknown as THREE.InstancedMesh;
  (p as unknown as { getMatrixAt: (k: number, out: THREE.Matrix4) => void }).getMatrixAt = (k, out) => (src as THREE.InstancedMesh).getMatrixAt(k, out);
  p.matrixWorld.copy(src.matrixWorld);
  p.name = src.name + '_proxy';
  return p as unknown as THREE.Mesh;
}

/**
 * Choose receivers and occluders and build everything the tracer needs. `roots`: layer objects by id.
 * Receivers get their tessellated geometry swapped in (restore with `restoreGeometry`).
 */
export function prepare(roots: Record<string, THREE.Object3D | undefined>, focus: THREE.Vector3, opts: { receiveR?: number; occludeR?: number; log?: (m: string) => void } = {}): Prepared {
  const t0 = performance.now();
  const receiveR = opts.receiveR ?? 34, occludeR = opts.occludeR ?? 60;
  const receivers: Receiver[] = [];
  const recSet = new Set<THREE.Mesh>();
  const occ: { o: THREE.Mesh; inst: number[] | null }[] = [];
  const sphere = new THREE.Sphere();
  for (const id of ['model', 'site', 'ground', 'planting', 'lights', 'bush']) {
    const r = roots[id];
    if (!r || !shown(r)) continue;
    r.updateMatrixWorld(true);
    r.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || !shown(mesh) || (o as unknown as { isPoints?: boolean }).isPoints || o.name === 'sea' || o.userData.bakeOccluder === false) return;
      const m = mat0(mesh);
      if (!m) return;
      if (mesh.isInstancedMesh) {
        const im = mesh as THREE.InstancedMesh, keep: number[] = [];
        for (let k = 0; k < im.count; k++) { im.getMatrixAt(k, IM); V.setFromMatrixPosition(IM).applyMatrix4(im.matrixWorld); if (V.distanceTo(focus) < occludeR) keep.push(k); }
        if (!keep.length) return;
        // dense foliage and heavy trees count as a box each (foliage lets about half the light through): the bush is
        // millions of leaf triangles, and its shade on the house is soft anyway; the live sun's shadows use every leaf
        const tpi = (mesh.geometry.index ? mesh.geometry.index.count : mesh.geometry.attributes.position.count) / 3;
        if (isFoliage(mesh, m) || tpi > 3000) occ.push({ o: proxyMesh(mesh, isFoliage(mesh, m)), inst: keep });
        else occ.push({ o: mesh, inst: keep });
        return;
      }
      if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
      sphere.copy(mesh.geometry.boundingSphere!).applyMatrix4(mesh.matrixWorld);
      if (sphere.center.distanceTo(focus) - sphere.radius > occludeR && id !== 'ground') return;
      const lit = (m as THREE.MeshStandardMaterial).isMeshStandardMaterial && !isGlass(m as THREE.MeshPhysicalMaterial) && !(m.transparent && m.opacity < 0.98)
        && !isFoliage(mesh, m) && ['model', 'site', 'ground'].includes(id) && !/far|sea/i.test(mesh.name)
        && sphere.center.distanceTo(focus) - sphere.radius < receiveR && !mesh.userData.noBake;
      if (lit) {
        const orig = mesh.geometry;
        const plain = !m.map && !m.normalMap && !m.roughnessMap && !(m as unknown as { bumpMap?: unknown }).bumpMap;
        const geo = ownGeometry(mesh, maxEdgeFor(mesh, m, id), plain);
        mesh.geometry = geo;
        receivers.push({ mesh, back: m.side === THREE.DoubleSide, ids: new Uint32Array(0), idsB: null, orig, geo });
        recSet.add(mesh);
      }
      occ.push({ o: mesh, inst: null });
    });
  }
  const tPrep = performance.now();
  opts.log?.(`[bake] ${receivers.length} receivers tessellated in ${((tPrep - t0) / 1000).toFixed(1)} s, ${occ.length} occluder meshes`);

  // ---- sample points, welded by position and normal; nudged a hair inside their own surface ----
  const S: number[] = [];
  // weld map: a numeric hash of quantised position and normal → candidate ids (checked exactly)
  const key = new Map<number, number[]>();
  const ea: number[] = [], eb: number[] = [];
  const sid = (px: number, py: number, pz: number, nx: number, ny: number, nz: number) => {
    const qx = Math.round(px * 2000), qy = Math.round(py * 2000), qz = Math.round(pz * 2000), a = Math.round(nx * 16), b = Math.round(ny * 16), c = Math.round(nz * 16);
    let h = Math.imul(qx, 73856093) ^ Math.imul(qy, 19349663) ^ Math.imul(qz, 83492791) ^ Math.imul(a * 1024 + b * 32 + c, 2654435761);
    h = h >>> 0;
    const list = key.get(h);
    if (list) for (const id of list) {
      const o = id * 6;
      if (Math.round(S[o] * 2000) === qx && Math.round(S[o + 1] * 2000) === qy && Math.round(S[o + 2] * 2000) === qz && Math.round(S[o + 3] * 16) === a && Math.round(S[o + 4] * 16) === b && Math.round(S[o + 5] * 16) === c) return id;
    }
    const id = S.length / 6; S.push(px, py, pz, nx, ny, nz);
    if (list) list.push(id); else key.set(h, [id]);
    return id;
  };
  const nv = new THREE.Vector3();
  for (const r of receivers) {
    const o = r.mesh, g = o.geometry, p = g.attributes.position, nr = g.attributes.normal, ind = g.index!;
    N3.getNormalMatrix(o.matrixWorld);
    const n = p.count, wp = new Float32Array(n * 3), wn = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      V.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); wp[i * 3] = V.x; wp[i * 3 + 1] = V.y; wp[i * 3 + 2] = V.z;
      nv.fromBufferAttribute(nr, i).applyMatrix3(N3).normalize(); wn[i * 3] = nv.x; wn[i * 3 + 1] = nv.y; wn[i * 3 + 2] = nv.z;
    }
    const nud = new Float32Array(n * 3), cnt = new Uint16Array(n), nt = ind.count;
    for (let i = 0; i < nt; i += 3) {
      const a = ind.getX(i), b = ind.getX(i + 1), c = ind.getX(i + 2);
      const cx = (wp[a * 3] + wp[b * 3] + wp[c * 3]) / 3, cy = (wp[a * 3 + 1] + wp[b * 3 + 1] + wp[c * 3 + 1]) / 3, cz = (wp[a * 3 + 2] + wp[b * 3 + 2] + wp[c * 3 + 2]) / 3;
      for (const q of [a, b, c]) { nud[q * 3] += cx; nud[q * 3 + 1] += cy; nud[q * 3 + 2] += cz; cnt[q]++; }
    }
    r.ids = new Uint32Array(n); r.idsB = r.back ? new Uint32Array(n) : null;
    for (let i = 0; i < n; i++) {
      let px = wp[i * 3], py = wp[i * 3 + 1], pz = wp[i * 3 + 2];
      const nx = wn[i * 3], ny = wn[i * 3 + 1], nz = wn[i * 3 + 2];
      if (cnt[i]) {
        let dx = nud[i * 3] / cnt[i] - px, dy = nud[i * 3 + 1] / cnt[i] - py, dz = nud[i * 3 + 2] / cnt[i] - pz;
        const dn = dx * nx + dy * ny + dz * nz; dx -= dn * nx; dy -= dn * ny; dz -= dn * nz;
        const dl = Math.hypot(dx, dy, dz);
        if (dl > 1e-6) { const s = Math.min(0.004, dl * 0.3) / dl; px += dx * s; py += dy * s; pz += dz * s; }
      }
      r.ids[i] = sid(px, py, pz, nx, ny, nz);
      if (r.idsB) r.idsB[i] = sid(px, py, pz, -nx, -ny, -nz);
    }
    for (let i = 0; i < nt; i += 3) {
      const a = ind.getX(i), b = ind.getX(i + 1), c = ind.getX(i + 2);
      for (const ids of r.idsB ? [r.ids, r.idsB] : [r.ids]) {
        const A = ids[a], B = ids[b], C = ids[c];
        if (A !== B) { ea.push(A); eb.push(B); } if (B !== C) { ea.push(B); eb.push(C); } if (C !== A) { ea.push(C); eb.push(A); }
      }
    }
  }
  const samples = new Float32Array(S);

  // the hash names the geometry the light belongs to: sample positions to a millimetre
  const q = new Int32Array(samples.length); for (let i = 0; i < samples.length; i++) q[i] = Math.round(samples[i] * 1000);
  const hash = fnv(new Uint8Array(q.buffer)).toString(16) + '-' + (samples.length / 6);
  const stats = {
    receivers: receivers.length, samples: samples.length / 6,
    receiverTris: receivers.reduce((s, r) => s + r.mesh.geometry.index!.count / 3, 0),
    prepSeconds: +((performance.now() - t0) / 1000).toFixed(1), tessellateSeconds: +((tPrep - t0) / 1000).toFixed(1),
  };
  opts.log?.(`[bake] prepared ${JSON.stringify(stats)}`);
  return { receivers, occ, samples, ea: new Uint32Array(ea), eb: new Uint32Array(eb), soup: null, triSample: null, triSampleB: null, mats: null, hash, focus: [focus.x, focus.y, focus.z], stats };
}

/** the occluder soup (every nearby triangle in world space) and the material table: built only when tracing */
export function buildSoup(P: Prepared) {
  const occ = P.occ, receivers = P.receivers;
  const mats: number[] = [], matId = new Map<string, number>();
  const matFor = (o: THREE.Mesh, m: THREE.MeshPhysicalMaterial) => {
    const fol = isFoliage(o, m), glass = isGlass(m);
    const k = `${m.name === 'bake_proxy_foliage' || m.name === 'bake_proxy_tree' ? m.name : m.uuid}|${fol ? 1 : 0}`;
    let id = matId.get(k);
    if (id !== undefined) return id;
    const c = m.color ?? new THREE.Color(0.5, 0.5, 0.5), t = meanOf(m.map);
    let alb = [c.r * t[0], c.g * t[1], c.b * t[2]];
    if ((m.metalness ?? 0) > 0.5) alb = alb.map((x) => x * 0.35); // metals reflect specularly: little diffuse bounce
    alb = alb.map((x) => Math.min(0.9, Math.max(0.01, x)));
    const thru = m.userData.bakeThru ?? (glass ? 0.88 : fol ? 0.35 : m.transparent && m.opacity < 0.98 ? 1 - m.opacity : 0);
    const flags = (m.side === THREE.DoubleSide || fol || m.userData.bakeThru !== undefined ? 1 : 0);
    id = mats.length / MS; matId.set(k, id); mats.push(alb[0], alb[1], alb[2], thru, flags);
    return id;
  };
  let nTri = 0;
  for (const { o, inst } of occ) {
    const g = o.geometry, tc = (g.index ? g.index.count : g.attributes.position.count) / 3;
    nTri += tc * (inst ? inst.length : 1);
  }
  const tri = new Float32Array(nTri * 9), mat = new Uint16Array(nTri), triSample = new Int32Array(nTri * 3).fill(-1), triSampleB = new Int32Array(nTri * 3).fill(-1);
  let to = 0;
  const recOf = new Map(receivers.map((r) => [r.mesh, r]));
  for (const { o, inst } of occ) {
    const g = o.geometry, p = g.attributes.position, ind = g.index, m = mat0(o) as THREE.MeshPhysicalMaterial;
    const mi = matFor(o, m), n = ind ? ind.count : p.count, rec = recOf.get(o);
    const reps = inst ?? [-1];
    for (const k of reps) {
      if (k >= 0) { (o as unknown as THREE.InstancedMesh).getMatrixAt(k, IM); M4.multiplyMatrices(o.matrixWorld, IM); } else M4.copy(o.matrixWorld);
      for (let i = 0; i < n; i += 3) {
        for (let c = 0; c < 3; c++) {
          const vi = ind ? ind.getX(i + c) : i + c;
          V.fromBufferAttribute(p, vi).applyMatrix4(M4);
          tri[to * 9 + c * 3] = V.x; tri[to * 9 + c * 3 + 1] = V.y; tri[to * 9 + c * 3 + 2] = V.z;
          if (rec) { triSample[to * 3 + c] = rec.ids[vi]; if (rec.idsB) triSampleB[to * 3 + c] = rec.idsB[vi]; }
        }
        mat[to] = mi; to++;
      }
    }
  }
  P.soup = { tri, mat }; P.triSample = triSample; P.triSampleB = triSampleB; P.mats = new Float32Array(mats);
  P.stats.occluderTris = nTri; P.stats.materials = mats.length / MS;
}
/** drop the tracing data once the light is written */
export function freeSoup(P: Prepared) { P.soup = null; P.triSample = null; P.triSampleB = null; P.mats = null; P.occ = []; }

/** put the original geometry back */
export function restoreGeometry(P: Prepared) {
  for (const r of P.receivers) { r.mesh.geometry = r.orig; r.geo.dispose(); }
}

/** the bake's input as plain arrays (for the workers here, or a scene file for node) */
export function bakeInput(P: Prepared, sky: SkyMap, sun: Sun): BakeInput {
  if (!P.soup) buildSoup(P);
  return { samples: P.samples, ea: P.ea, eb: P.eb, tri: P.soup!.tri, mat: P.soup!.mat, triSample: P.triSample!, triSampleB: P.triSampleB!, mats: P.mats!, sky, sun, focus: P.focus, hash: P.hash };
}

/** a pool of web workers */
function webPool(n: number): Pool {
  const ws: Worker[] = [];
  const call = (w: number, msg: Record<string, unknown>, want: string, transfer: Transferable[] = []) => new Promise<MessageEvent>((res, rej) => {
    const wk = ws[w];
    wk.onmessage = (ev) => { if (ev.data.type === want) res(ev); };
    wk.onerror = (e) => rej(new Error('bake worker: ' + e.message));
    wk.postMessage(msg, transfer);
  });
  return {
    size: n,
    async init(w, d) { ws[w] = new Worker(new URL('./bakeWorker.ts', import.meta.url), { type: 'module' }); await call(w, { type: 'init', d }, 'ready'); },
    async cache(w, c) { await call(w, { type: 'cache', cache: c }, 'cached'); },
    async job(w, j) { const s = j.samples; const ev = await call(w, { type: 'job', ...j }, 'done', [s.buffer]); return ev.data.out as Float32Array; },
    close() { ws.forEach((w) => w.terminate()); },
  };
}

/** run the bake in web workers; returns per-sample irradiance (sky + bounce) and mean direction */
export async function runBake(P: Prepared, sky: SkyMap, sun: Sun, o: BakeOpts = {}): Promise<{ E: Float32Array; D: Float32Array; secs: number; timing: Record<string, number> }> {
  const t0 = performance.now();
  const I = bakeInput(P, sky, sun);
  freeSoup(P);
  const n = Math.max(1, o.workers ?? Math.min(8, navigator.hardwareConcurrency || 2));
  const pool = typeof Worker === 'undefined' ? inlinePool() : webPool(n);
  const r = await bakeWithPool(I, pool, { spp: o.spp ?? 96, log: o.log, progress: o.progress, now: () => performance.now() });
  return { ...r, secs: (performance.now() - t0) / 1000 };
}

/** write the light into each receiver as vertex attributes */
export function applyLight(P: Prepared, E: Float32Array, D: Float32Array) {
  for (const r of P.receivers) {
    const n = r.ids.length, gi = new Float32Array(n * 3), gd = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const s = r.ids[i]; for (let c = 0; c < 3; c++) { gi[i * 3 + c] = E[s * 3 + c]; gd[i * 3 + c] = D[s * 3 + c]; } }
    r.mesh.geometry.setAttribute('gi', new THREE.BufferAttribute(gi, 3));
    r.mesh.geometry.setAttribute('gd', new THREE.BufferAttribute(gd, 3));
    if (r.idsB) {
      const gb = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const s = r.idsB[i]; for (let c = 0; c < 3; c++) gb[i * 3 + c] = E[s * 3 + c]; }
      r.mesh.geometry.setAttribute('giB', new THREE.BufferAttribute(gb, 3));
    }
  }
}

export function saveBake(P: Prepared, E: Float32Array, D: Float32Array, meta: Record<string, unknown>) {
  return packBake(E, D, { ...meta, hash: P.hash });
}
/** apply a bake file if it was made for this geometry; returns why not otherwise */
export function loadBake(P: Prepared, buf: ArrayBuffer): { ok: true; meta: Record<string, unknown> } | { ok: false; reason: string } {
  const b = unpackBake(buf);
  if (!b) return { ok: false, reason: 'not a bake file' };
  if (b.meta.hash !== P.hash) return { ok: false, reason: `made for other geometry (${String(b.meta.hash)} ≠ ${P.hash})` };
  applyLight(P, b.E, b.D);
  return { ok: true, meta: b.meta };
}
