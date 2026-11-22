// Draw two GLBs (a model and its browser copy) from the same camera, headless, with a small software rasteriser (no GPU,
// no browser), and measure how far apart the two pictures are. Usage:
//   node compare-still.mjs A.glb B.glb OUT_PREFIX [--w 1600 --h 1000 --az 215 --el 32 --zoom 1]
// Writes OUT_PREFIX-a.png, -b.png, -diff.png (red: drawn in one only; amber: colour differs) and prints the numbers.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dequantize } from '@gltf-transform/functions';
import { MeshoptDecoder } from 'meshoptimizer';
import { writeFileSync, unlinkSync, openSync, readSync, closeSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const argv = process.argv.slice(2), opt = (k, d) => (argv.includes(k) ? Number(argv[argv.indexOf(k) + 1]) : d);
const [A, B, OUT] = argv, W = opt('--w', 1600), H = opt('--h', 1000), AZ = opt('--az', 215), EL = opt('--el', 32), ZOOM = opt('--zoom', 1);
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const xf = (m, x, y, z) => [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];

// a plain (uncompressed) GLB is read piece by piece from disk as it is drawn, so a 900 MB file needs little memory
function leanLoad(path) {
  const t = Date.now(), fd = openSync(path, 'r'), head = Buffer.alloc(20); readSync(fd, head, 0, 20, 0);
  const jlen = head.readUInt32LE(12), jbuf = Buffer.alloc(jlen); readSync(fd, jbuf, 0, jlen, 20);
  const j = JSON.parse(jbuf.toString('utf8')); if (j.extensionsRequired?.length) { closeSync(fd); return null; }
  const binAt = 20 + jlen + 8, items = [];
  const read = (ai) => { const a = j.accessors[ai], bv = j.bufferViews[a.bufferView], comps = { SCALAR: 1, VEC3: 3 }[a.type], size = a.componentType === 5126 || a.componentType === 5125 ? 4 : 2;
    if (bv.byteStride && bv.byteStride !== comps * size) throw new Error('strided data not handled');
    const b = Buffer.alloc(a.count * comps * size); readSync(fd, b, 0, b.length, binAt + (bv.byteOffset ?? 0) + (a.byteOffset ?? 0));
    const ab = b.buffer.slice(b.byteOffset, b.byteOffset + b.length);
    return a.componentType === 5126 ? new Float32Array(ab) : a.componentType === 5125 ? new Uint32Array(ab) : new Uint16Array(ab); };
  const I = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  const mul = (a, m) => { const o = new Array(16); for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[k * 4 + r] = a[r] * m[k * 4] + a[4 + r] * m[k * 4 + 1] + a[8 + r] * m[k * 4 + 2] + a[12 + r] * m[k * 4 + 3]; return o; };
  const walk = (ni, parent) => { const n = j.nodes[ni]; if (n.rotation || n.scale) throw new Error('TRS not handled'); const local = n.matrix ?? (n.translation ? [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, ...n.translation, 1] : I); const M = mul(parent, local);
    if (n.mesh != null) for (const p of j.meshes[n.mesh].primitives) { const c = j.materials?.[p.material]?.pbrMetallicRoughness?.baseColorFactor ?? [0.8, 0.8, 0.8, 1];
      items.push({ M, c, get: () => ({ pos: read(p.attributes.POSITION), idx: p.indices != null ? read(p.indices) : null }), centre: () => { const a = j.accessors[p.attributes.POSITION]; return [0, 1, 2].map((k) => (a.min[k] + a.max[k]) / 2); } }); }
    for (const k of n.children ?? []) walk(k, M); };
  for (const ni of j.scenes[j.scene ?? 0].nodes) walk(ni, I);
  return { items, ms: Date.now() - t, lean: true };
}
async function load(path) {
  const lean = leanLoad(path); if (lean) return lean;
  const t = Date.now(); const doc = await io.read(path); await doc.transform(dequantize());
  const items = [];
  for (const n of doc.getRoot().listNodes()) {
    const mesh = n.getMesh(); if (!mesh) continue; const M = n.getWorldMatrix();
    for (const p of mesh.listPrimitives()) {
      const pos = p.getAttribute('POSITION'), idx = p.getIndices(); if (!pos) continue;
      const c = p.getMaterial()?.getBaseColorFactor() ?? [0.8, 0.8, 0.8, 1];
      const arr = { pos: pos.getArray(), idx: idx ? idx.getArray() : null }; items.push({ M, c, get: () => arr, centre: () => { const a = arr.pos; const k = Math.floor(a.length / 6) * 3; return [a[k], a[k + 1], a[k + 2]]; } });
    }
  }
  return { items, ms: Date.now() - t };
}
// frame on where most of the model is (10th to 90th percentile of element centres), not on far strays
function frame(items) {
  const cs = [[], [], []];
  for (const it of items) { const p = it.centre(); const w = xf(it.M, p[0], p[1], p[2]); for (let j = 0; j < 3; j++) cs[j].push(w[j]); }
  const q = (arr, f) => { const s = Float64Array.from(arr).sort(); return s[Math.floor(f * (s.length - 1))]; };
  const lo = cs.map((a) => q(a, 0.1)), hi = cs.map((a) => q(a, 0.9));
  return { c: lo.map((v, j) => (v + hi[j]) / 2), r: Math.max(hi[0] - lo[0], hi[2] - lo[2], hi[1] - lo[1]) * 0.75 + 5 };
}
function camera({ c, r }) {
  const az = (AZ * Math.PI) / 180, el = (EL * Math.PI) / 180, d = (r / Math.tan((20 * Math.PI) / 180)) / ZOOM;
  const eye = [c[0] + d * Math.cos(el) * Math.cos(az), c[1] + d * Math.sin(el), c[2] + d * Math.cos(el) * Math.sin(az)];
  const f = c.map((v, i) => v - eye[i]); const fl = Math.hypot(...f); f.forEach((v, i) => (f[i] = v / fl));
  let s = [f[1] * 0 - f[2] * 1, f[2] * 0 - f[0] * 0, f[0] * 1 - f[1] * 0]; const sl = Math.hypot(...s); s = s.map((v) => v / sl);
  const u = [s[1] * f[2] - s[2] * f[1], s[2] * f[0] - s[0] * f[2], s[0] * f[1] - s[1] * f[0]];
  return { eye, f, s, u, focal: (H / 2) / Math.tan((20 * Math.PI) / 180) };
}
function draw({ items }, cam) {
  const t = Date.now(); const Z = new Float32Array(W * H).fill(Infinity), C = new Uint8Array(W * H * 3).fill(255);
  const L = [0.45, 0.8, 0.35]; const ll = Math.hypot(...L); L.forEach((v, i) => (L[i] = v / ll));
  const proj = (w) => { const d = [w[0] - cam.eye[0], w[1] - cam.eye[1], w[2] - cam.eye[2]]; const z = d[0] * cam.f[0] + d[1] * cam.f[1] + d[2] * cam.f[2];
    return [W / 2 + (cam.focal * (d[0] * cam.s[0] + d[1] * cam.s[1] + d[2] * cam.s[2])) / z, H / 2 - (cam.focal * (d[0] * cam.u[0] + d[1] * cam.u[1] + d[2] * cam.u[2])) / z, z]; };
  let tris = 0;
  for (const it of items) {
    const { pos: a, idx } = it.get(); const n = idx ? idx.length : a.length / 3;
    const V = new Float64Array((a.length / 3) * 3), P = new Float64Array((a.length / 3) * 3);
    for (let i = 0; i < a.length; i += 3) { const w = xf(it.M, a[i], a[i + 1], a[i + 2]); V.set(w, i); P.set(proj(w), i); }
    for (let k = 0; k < n; k += 3) {
      const i0 = (idx ? idx[k] : k) * 3, i1 = (idx ? idx[k + 1] : k + 1) * 3, i2 = (idx ? idx[k + 2] : k + 2) * 3; tris++;
      const z0 = P[i0 + 2], z1 = P[i1 + 2], z2 = P[i2 + 2]; if (z0 < 0.5 || z1 < 0.5 || z2 < 0.5) continue;
      const x0 = P[i0], y0 = P[i0 + 1], x1 = P[i1], y1 = P[i1 + 1], x2 = P[i2], y2 = P[i2 + 1];
      const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0); if (area === 0) continue;
      const minx = Math.max(0, Math.floor(Math.min(x0, x1, x2))), maxx = Math.min(W - 1, Math.ceil(Math.max(x0, x1, x2)));
      const miny = Math.max(0, Math.floor(Math.min(y0, y1, y2))), maxy = Math.min(H - 1, Math.ceil(Math.max(y0, y1, y2)));
      if (minx > maxx || miny > maxy) continue;
      const e1 = [V[i1] - V[i0], V[i1 + 1] - V[i0 + 1], V[i1 + 2] - V[i0 + 2]], e2 = [V[i2] - V[i0], V[i2 + 1] - V[i0 + 1], V[i2 + 2] - V[i0 + 2]];
      const nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0], nl = Math.hypot(nx, ny, nz) || 1;
      const sh = 0.38 + 0.62 * Math.abs((nx * L[0] + ny * L[1] + nz * L[2]) / nl);
      const r = Math.min(255, it.c[0] ** (1 / 2.2) * 255 * sh), g = Math.min(255, it.c[1] ** (1 / 2.2) * 255 * sh), b = Math.min(255, it.c[2] ** (1 / 2.2) * 255 * sh);
      for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
        const px = x + 0.5, py = y + 0.5;
        const w0 = ((x1 - px) * (y2 - py) - (x2 - px) * (y1 - py)) / area, w1 = ((x2 - px) * (y0 - py) - (x0 - px) * (y2 - py)) / area, w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;
        const z = w0 * z0 + w1 * z1 + w2 * z2, o = y * W + x; if (z >= Z[o]) continue;
        Z[o] = z; C[o * 3] = r; C[o * 3 + 1] = g; C[o * 3 + 2] = b;
      }
    }
  }
  return { Z, C, tris, ms: Date.now() - t };
}
function png(C, path) {
  const ppm = path.replace(/\.png$/, '.ppm'); writeFileSync(ppm, Buffer.concat([Buffer.from(`P6\n${W} ${H}\n255\n`), Buffer.from(C)]));
  execFileSync('sips', ['-s', 'format', 'png', ppm, '--out', path], { stdio: 'ignore' }); unlinkSync(ppm);
}
const a = await load(A), b = await load(B);
const cam = camera(frame(a.items));
const ra = draw(a, cam), rb = draw(b, cam);
png(ra.C, `${OUT}-a.png`); png(rb.C, `${OUT}-b.png`);
let both = 0, onlyA = 0, onlyB = 0, colourOff = 0, sumDiff = 0; const D = new Uint8Array(W * H * 3);
for (let o = 0; o < W * H; o++) {
  const ia = ra.Z[o] < Infinity, ib = rb.Z[o] < Infinity;
  const g = Math.round((ra.C[o * 3] + ra.C[o * 3 + 1] + ra.C[o * 3 + 2]) / 3 * 0.35 + 166); D[o * 3] = D[o * 3 + 1] = D[o * 3 + 2] = ia ? g : 255;
  if (ia && ib) { both++; const d = (Math.abs(ra.C[o * 3] - rb.C[o * 3]) + Math.abs(ra.C[o * 3 + 1] - rb.C[o * 3 + 1]) + Math.abs(ra.C[o * 3 + 2] - rb.C[o * 3 + 2])) / 3; sumDiff += d; if (d > 24) { colourOff++; D[o * 3] = 230; D[o * 3 + 1] = 160; D[o * 3 + 2] = 40; } }
  else if (ia !== ib) { if (ia) onlyA++; else onlyB++; D[o * 3] = 210; D[o * 3 + 1] = 30; D[o * 3 + 2] = 40; }
}
png(D, `${OUT}-diff.png`);
const covered = both + onlyA + onlyB;
console.log(JSON.stringify({ size: [W, H], camera: { azimuth: AZ, elevation: EL, zoom: ZOOM },
  a: { path: A, triangles: ra.tris, loadMs: a.ms, drawMs: ra.ms }, b: { path: B, triangles: rb.tris, loadMs: b.ms, drawMs: rb.ms },
  pixels: { covered, inBoth: both, onlyInA: onlyA, onlyInB: onlyB, coverageDifferencePct: +((100 * (onlyA + onlyB)) / covered).toFixed(3),
    colourOffPct: +((100 * colourOff) / covered).toFixed(3), meanColourDifference: +(sumDiff / Math.max(1, both)).toFixed(2) } }, null, 1));
