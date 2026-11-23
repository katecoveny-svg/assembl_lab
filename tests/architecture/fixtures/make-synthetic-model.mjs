// A made-up building at the scale of a big browser copy, for the 3D page's finished look (dressModel.ts) and its tests.
// Everything here is invented: a four-storey block 60 × 24 m with a curtain wall down both long sides, brick ends, concrete
// floors, a standing-seam gable roof, five thousand chairs (four thousand as one GPU-instanced node, a thousand as nodes that
// share one mesh, the way tools/browser-copy shares repeated shapes), herringbone paving, planting beds and the site's ground.
// Nodes carry extras { ifc_guid, ifc_class, ifc_name } and materials carry names, as IfcOpenShell and the browser-copy script
// write them. It sits away from the origin (x 200, y 30, z -150), as a georeferenced model would.
//
// Nothing is written to the repository: `syntheticGLB()` returns the bytes; `node make-synthetic-model.mjs OUT.glb` writes a
// file for headless stills.
import { writeFileSync } from 'node:fs';

const O = [200, 30, -150];
export const SPEC = { length: 60, depth: 24, storeys: 4, storey: 3.6, bay: 1.5, chairs: { instanced: 4000, shared: 1000 } };

function box(w, h, d, seg = 1) {
  // a box from (−w/2, 0, −d/2) to (w/2, h, d/2), each face cut into seg × seg quads, flat normals
  const P = [], N = [], I = [];
  const face = (o, u, v, n) => {
    const base = P.length / 3;
    for (let j = 0; j <= seg; j++) for (let i = 0; i <= seg; i++) {
      const a = i / seg, b = j / seg;
      P.push(o[0] + u[0] * a + v[0] * b, o[1] + u[1] * a + v[1] * b, o[2] + u[2] * a + v[2] * b); N.push(...n);
    }
    for (let j = 0; j < seg; j++) for (let i = 0; i < seg; i++) { const k = base + j * (seg + 1) + i; I.push(k, k + 1, k + seg + 2, k, k + seg + 2, k + seg + 1); }
  };
  const x0 = -w / 2, x1 = w / 2, z0 = -d / 2, z1 = d / 2;
  face([x0, 0, z1], [w, 0, 0], [0, h, 0], [0, 0, 1]);
  face([x1, 0, z0], [-w, 0, 0], [0, h, 0], [0, 0, -1]);
  face([x1, 0, z1], [0, 0, -d], [0, h, 0], [1, 0, 0]);
  face([x0, 0, z0], [0, 0, d], [0, h, 0], [-1, 0, 0]);
  face([x0, h, z1], [w, 0, 0], [0, 0, -d], [0, 1, 0]);
  face([x0, 0, z0], [w, 0, 0], [0, 0, d], [0, -1, 0]);
  return { P, N, I };
}
function cylinder(r, h, n) {
  const P = [], N = [], I = [];
  for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); P.push(c * r, 0, s * r, c * r, h, s * r); N.push(c, 0, s, c, 0, s); }
  for (let i = 0; i < n; i++) { const k = i * 2; I.push(k, k + 1, k + 3, k, k + 3, k + 2); }
  return { P, N, I };
}
function merge(parts) {
  const P = [], N = [], I = [];
  for (const [g, t] of parts) { const base = P.length / 3; for (let i = 0; i < g.P.length; i += 3) P.push(g.P[i] + t[0], g.P[i + 1] + t[1], g.P[i + 2] + t[2]); N.push(...g.N); for (const k of g.I) I.push(k + base); }
  return { P, N, I };
}
/** a gable roof over w × d, ridge along x, pitch in degrees, sheets 0.05 thick (top faces only, both slopes, and gables) */
function gable(w, d, pitch) {
  const h = Math.tan((pitch * Math.PI) / 180) * (d / 2), x0 = -w / 2 - 0.4, x1 = w / 2 + 0.4, z0 = -d / 2 - 0.6, z1 = d / 2 + 0.6, hh = h + 0.6 * Math.tan((pitch * Math.PI) / 180);
  const P = [], N = [], I = [];
  const quad = (a, b, c, e) => { const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [e[0] - a[0], e[1] - a[1], e[2] - a[2]]; const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]; const l = Math.hypot(...n); const k = P.length / 3; P.push(...a, ...b, ...c, ...e); for (let i = 0; i < 4; i++) N.push(n[0] / l, n[1] / l, n[2] / l); I.push(k, k + 1, k + 2, k, k + 2, k + 3); };
  const y0 = -0.6 * Math.tan((pitch * Math.PI) / 180);
  quad([x0, y0, z1], [x1, y0, z1], [x1, hh + y0, 0], [x0, hh + y0, 0]);
  quad([x1, y0, z0], [x0, y0, z0], [x0, hh + y0, 0], [x1, hh + y0, 0]);
  return { P, N, I, h };
}

export function syntheticGLB() {
  const L = SPEC.length, D = SPEC.depth, S = SPEC.storeys, H = SPEC.storey, bay = SPEC.bay;
  const meshes = [], nodes = [], materials = [], accessors = [], views = [], chunks = [];
  let offset = 0;
  const push = (arr, type, target) => { const b = Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength); const pad = (4 - (b.length % 4)) % 4; chunks.push(b, Buffer.alloc(pad)); views.push({ buffer: 0, byteOffset: offset, byteLength: b.length, ...(target ? { target } : {}) }); offset += b.length + pad; return views.length - 1; };
  const mat = (name, rgba, blend = false) => { materials.push({ name, pbrMetallicRoughness: { baseColorFactor: rgba, metallicFactor: 0, roughnessFactor: 0.8 }, ...(blend ? { alphaMode: 'BLEND' } : {}), doubleSided: true }); return materials.length - 1; };
  const mesh = (name, g, material) => {
    const pos = new Float32Array(g.P), nor = new Float32Array(g.N), idx = new Uint32Array(g.I);
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], pos[i + k]); hi[k] = Math.max(hi[k], pos[i + k]); }
    accessors.push({ bufferView: push(pos, 'p', 34962), componentType: 5126, count: pos.length / 3, type: 'VEC3', min: lo, max: hi });
    accessors.push({ bufferView: push(nor, 'n', 34962), componentType: 5126, count: nor.length / 3, type: 'VEC3' });
    accessors.push({ bufferView: push(idx, 'i', 34963), componentType: 5125, count: idx.length, type: 'SCALAR' });
    const a = accessors.length;
    meshes.push({ name, primitives: [{ attributes: { POSITION: a - 3, NORMAL: a - 2 }, indices: a - 1, material }] });
    return { index: meshes.length - 1, tris: idx.length / 3 };
  };
  let guid = 0, drawn = 0;
  const node = (m, cls, name, t, extra = {}) => { nodes.push({ name: `G${String(guid).padStart(5, '0')}`, mesh: m.index, translation: [O[0] + t[0], O[1] + t[1], O[2] + t[2]], extras: { ifc_guid: `0Synth${String(guid++).padStart(16, '0')}`, ifc_class: cls, ifc_name: name }, ...extra }); drawn += m.tris; };

  const mGlass = mat('Glass - Clear Low-E', [0.55, 0.64, 0.66, 0.3], true), mAlu = mat('Aluminium - Anodised Dark', [0.2, 0.2, 0.21, 1]);
  const mBrick = mat('Brick - Common', [0.6, 0.35, 0.28, 1]), mConc = mat('Concrete - Cast-in-Place', [0.7, 0.7, 0.68, 1]);
  const mRoof = mat('Metal - Standing Seam', [0.3, 0.3, 0.32, 1]), mFab = mat('Fabric - Upholstery Charcoal', [0.32, 0.3, 0.3, 1]);
  const mOak = mat('Wood - Oak', [0.7, 0.55, 0.38, 1]), mPave = mat('Paving - Herringbone Clay', [0.6, 0.48, 0.4, 1]);
  const mBed = mat('Planting - Native Bed', [0.35, 0.3, 0.22, 1]), mTopo = mat('Topography', [0.5, 0.55, 0.42, 1]);
  const mDoor = mat('Door - Timber', [0.5, 0.36, 0.24, 1]);

  // the site's ground, then the paving and the beds just above it
  node(mesh('topo', box(140, 0.02, 100, 4), mTopo), 'IFCSITE', 'Topography', [0, -0.02, 0]);
  node(mesh('paving_front', box(L + 6, 0.05, 6), mPave), 'IFCBUILDINGELEMENTPROXY', 'Paving - forecourt', [0, 0, D / 2 + 3]);
  node(mesh('path', box(3, 0.05, 18), mPave), 'IFCBUILDINGELEMENTPROXY', 'Paving - path', [0, 0, D / 2 + 6 + 9]);
  for (const s of [-1, 1]) node(mesh(`bed_${s}`, box(L - 6, 0.08, 4), mBed), 'IFCGEOGRAPHICELEMENT', 'Planting bed', [0, 0, s < 0 ? -D / 2 - 3 : D / 2 + 6 + 2.5].map((v, i) => (i === 0 ? s * 0 : v)));
  // floors and roof
  for (let f = 0; f <= S; f++) node(mesh(`slab_${f}`, box(L, 0.3, D), mConc), 'IFCSLAB', `Floor: ${f === 0 ? 'ground' : 'level ' + f}`, [0, f * H - (f === 0 ? 0.3 : 0), 0]);
  const g = gable(L, D, 14);
  node(mesh('roof', g, mRoof), 'IFCROOF', 'Roof: standing seam', [0, S * H, 0]);
  // brick ends, with a timber door in each
  for (const s of [-1, 1]) node(mesh(`end_${s}`, box(0.3, S * H, D), mBrick), 'IFCWALLSTANDARDCASE', 'Basic Wall: brick end', [s * (L / 2 - 0.15), 0, 0]);
  const door = mesh('door', box(0.08, 2.4, 1.2), mDoor);
  for (const s of [-1, 1]) node(door, 'IFCDOOR', 'Door: single timber', [s * (L / 2 + 0.05), 0, 0]);
  // the curtain wall: shared panel and mullion meshes on both long sides
  const panel = mesh('panel', box(bay - 0.06, H - 0.06, 0.03), mGlass), mull = mesh('mullion', box(0.06, H, 0.16, 2), mAlu), tran = mesh('transom', box(bay, 0.08, 0.16, 2), mAlu);
  const n = Math.round(L / bay);
  for (const s of [-1, 1]) for (let f = 0; f < S; f++) for (let i = 0; i < n; i++) {
    const x = -L / 2 + (i + 0.5) * bay, z = s * (D / 2);
    node(panel, 'IFCPLATE', 'System Panel: glazed', [x, f * H + 0.03, z]);
    node(mull, 'IFCMEMBER', 'Rectangular Mullion: 60 x 160', [x - bay / 2, f * H, z]);
    node(tran, 'IFCMEMBER', 'Rectangular Mullion: transom', [x, f * H, z]);
  }
  // chairs: a seat, a back and four round legs, about 1,600 triangles
  const chairG = merge([[box(0.46, 0.06, 0.46, 8), [0, 0.44, 0]], [box(0.46, 0.42, 0.05, 6), [0, 0.5, -0.2]], ...[[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].map(([x, z]) => [cylinder(0.018, 0.44, 24), [x, 0, z]])]);
  const chair = mesh('chair', chairG, mFab);
  const table = mesh('table', merge([[box(1.6, 0.04, 0.8, 4), [0, 0.72, 0]], [box(0.06, 0.72, 0.06), [-0.7, 0, -0.32]], [box(0.06, 0.72, 0.06), [0.7, 0, -0.32]], [box(0.06, 0.72, 0.06), [-0.7, 0, 0.32]], [box(0.06, 0.72, 0.06), [0.7, 0, 0.32]]]), mOak);
  const spots = [];
  for (let f = 0; f < S; f++) for (let i = 0; i < 38; i++) for (let j = 0; j < 33; j++) spots.push([-L / 2 + 3 + i * 1.45, f * H, -D / 2 + 2 + j * 0.62]);
  const inst = spots.slice(0, SPEC.chairs.instanced), shared = spots.slice(SPEC.chairs.instanced, SPEC.chairs.instanced + SPEC.chairs.shared);
  // GPU instancing: one node, a translation per chair
  const tr = new Float32Array(inst.length * 3); inst.forEach((p, k) => { tr[k * 3] = p[0]; tr[k * 3 + 1] = p[1]; tr[k * 3 + 2] = p[2]; });
  accessors.push({ bufferView: push(tr), componentType: 5126, count: inst.length, type: 'VEC3' });
  nodes.push({ name: 'chairs_instanced', mesh: chair.index, translation: O, extras: { ifc_guid: '0SynthChairs000000000', ifc_class: 'IFCFURNISHINGELEMENT', ifc_name: 'Chair: upholstered (4,000 instances)' }, extensions: { EXT_mesh_gpu_instancing: { attributes: { TRANSLATION: accessors.length - 1 } } } });
  drawn += chair.tris * inst.length;
  for (const p of shared) node(chair, 'IFCFURNISHINGELEMENT', 'Chair: upholstered', p);
  for (let f = 0; f < S; f++) for (let i = 0; i < 12; i++) node(table, 'IFCFURNITURE', 'Table: oak', [-L / 2 + 6 + i * 4.4, f * H, 0]);

  const bin = Buffer.concat(chunks);
  const json = { asset: { version: '2.0', generator: 'assembl synthetic test model (invented)' }, extensionsUsed: ['EXT_mesh_gpu_instancing'], scene: 0, scenes: [{ nodes: nodes.map((_, i) => i) }], nodes, meshes, materials, accessors, bufferViews: views, buffers: [{ byteLength: bin.length }] };
  let js = Buffer.from(JSON.stringify(json)); js = Buffer.concat([js, Buffer.alloc((4 - (js.length % 4)) % 4, 0x20)]);
  const head = Buffer.alloc(12); head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + bin.length, 8);
  const ch = (b, t) => { const h = Buffer.alloc(8); h.writeUInt32LE(b.length, 0); h.writeUInt32LE(t, 4); return Buffer.concat([h, b]); };
  return { glb: Buffer.concat([head, ch(js, 0x4e4f534a), ch(bin, 0x004e4942)]), nodes: nodes.length, meshes: meshes.length, drawn, json };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const out = process.argv[2];
  if (!out) { console.error('usage: node make-synthetic-model.mjs OUT.glb'); process.exit(1); }
  const r = syntheticGLB();
  writeFileSync(out, r.glb);
  console.log(`${out}: ${r.nodes} nodes, ${r.meshes} meshes, ${(r.drawn / 1e6).toFixed(1)} M triangles drawn, ${(r.glb.length / 1e6).toFixed(1)} MB`);
}
