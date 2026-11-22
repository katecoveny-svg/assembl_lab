// Make a light "browser copy" of a big building GLB (from ifc2glb.py) so it opens in 3D in a browser.
// Geometry of walls, slabs, roofs, glazing, doors, stairs is never simplified; only furniture and fixtures are.
// Every element stays its own node, named by its IFC GUID, so picking still works.
//
// Usage: node make-browser-copy.mjs IN.glb OUT.glb [--instanced FURN.glb] [--classes elements.json]
//          [--ratio 0.25] [--error 0.01] [--position-bits 16]
//   --instanced  a GLB from ifc2glb_instanced.py: its elements (by GUID) replace the same elements in IN, so
//                repeated furniture shares one mesh per type instead of one copy per element.
//   --classes    elements.json from glb_clusters.py ([{guid, cls, name}]): which elements may be simplified.
//                Without it only the --instanced elements are simplified.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, join, weld, prune, meshopt, simplifyPrimitive, mergeDocuments, unpartition, getBounds } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import { createHash } from 'node:crypto';
import { statSync, readFileSync, writeFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const [IN, OUT] = argv;
if (!IN || !OUT) { console.error('usage: node make-browser-copy.mjs IN.glb OUT.glb [--instanced F.glb] [--classes elements.json]'); process.exit(2); }
const RATIO = Number(opt('--ratio', '0.25')), ERROR = Number(opt('--error', '0.01')), PBITS = Number(opt('--position-bits', '16'));
const SIMPLIFY_CLASSES = new Set(opt('--simplify-classes', 'IFCFURNISHINGELEMENT,IFCFURNITURE,IFCFLOWTERMINAL,IFCSANITARYTERMINAL,IFCLIGHTFIXTURE').toUpperCase().split(','));
const PROTECTED = new Set(['IFCWALL', 'IFCWALLSTANDARDCASE', 'IFCSLAB', 'IFCROOF', 'IFCCURTAINWALL', 'IFCPLATE', 'IFCMEMBER',
  'IFCWINDOW', 'IFCDOOR', 'IFCSTAIR', 'IFCSTAIRFLIGHT', 'IFCRAMP', 'IFCRAMPFLIGHT', 'IFCRAILING', 'IFCCOLUMN', 'IFCBEAM', 'IFCCOVERING', 'IFCFOOTING']);

const t0 = Date.now(); const times = {};
const lap = (k) => { times[k] = +((Date.now() - t0) / 1000).toFixed(1); console.log(`[${times[k]}s] ${k}`); };

await MeshoptEncoder.ready; await MeshoptDecoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });

function stats(doc) {
  const root = doc.getRoot(); let prims = 0, unique = 0, drawn = 0, drawCalls = 0;
  const meshTris = new Map();
  for (const m of root.listMeshes()) {
    let t = 0; for (const p of m.listPrimitives()) { const i = p.getIndices(); t += (i ? i.getCount() : p.getAttribute('POSITION').getCount()) / 3; }
    meshTris.set(m, t); unique += t; prims += m.listPrimitives().length;
  }
  let nodesWithMesh = 0;
  for (const n of root.listNodes()) { const m = n.getMesh(); if (m) { nodesWithMesh++; drawn += meshTris.get(m); drawCalls += m.listPrimitives().length; } }
  return { meshes: root.listMeshes().length, primitives: prims, materials: root.listMaterials().length, elements: nodesWithMesh, uniqueTriangles: Math.round(unique), drawnTriangles: Math.round(drawn), drawCalls };
}

const classOf = new Map(); const nameOf = new Map();
if (opt('--classes')) for (const e of JSON.parse(readFileSync(opt('--classes'), 'utf8'))) { classOf.set(e.guid, String(e.cls).toUpperCase()); nameOf.set(e.guid, e.name); }

const doc = await io.read(IN); lap('read input');
const before = stats(doc); console.log('before', before);
const root = doc.getRoot(); const scene = root.getDefaultScene() || root.listScenes()[0];
const fromInstanced = new Set(); let frameCheck = null; let replaced = 0;

// 1. Swap in the instanced furniture (same GUIDs, shared meshes per type).
if (opt('--instanced')) {
  const inst = await io.read(opt('--instanced')); lap('read instanced');
  const instNodes = new Map(inst.getRoot().listNodes().filter((n) => n.getMesh()).map((n) => [n.getName(), n]));
  let maxDiff = 0, checked = 0;
  for (const n of root.listNodes()) {
    const g = n.getName(); if (!instNodes.has(g) || !n.getMesh()) continue;
    if (checked < 200) { const a = getBounds(n), b = getBounds(instNodes.get(g)); for (let k = 0; k < 3; k++) maxDiff = Math.max(maxDiff, Math.abs(a.min[k] - b.min[k]), Math.abs(a.max[k] - b.max[k])); checked++; }
    n.dispose(); replaced++;
  }
  frameCheck = { checked, maxBoundsDifferenceMetres: +maxDiff.toFixed(4) };
  console.log('frame check (instanced vs original bounds)', frameCheck);
  if (maxDiff > 0.05) { console.error('instanced elements do not line up with the original (>50 mm); stopping'); process.exit(3); }
  const map = mergeDocuments(doc, inst);
  for (const s of root.listScenes()) if (s !== scene) { for (const c of s.listChildren()) scene.addChild(c); s.dispose(); }
  for (const [src, dst] of map) if (src.propertyType === 'Mesh') fromInstanced.add(dst);
  await doc.transform(unpartition()); lap(`swapped ${replaced} elements for the instanced copies`);
}

// 2. Repeated elements modelled in world coordinates (mullions, fins, panels): same shape at another place.
//    Move each shape to its own origin, share one mesh, put the place in the node's matrix. Shape is not changed.
const matId = new Map(); const mid = (m) => { if (!m) return -1; if (!matId.has(m)) matId.set(m, matId.size); return matId.get(m); };
const groups = new Map(); const usage = new Map();
for (const n of root.listNodes()) { const m = n.getMesh(); if (m) usage.set(m, (usage.get(m) || []).concat(n)); }
for (const [m, nodes] of usage) {
  if (nodes.length !== 1 || fromInstanced.has(m)) continue;
  const mn = [Infinity, Infinity, Infinity];
  for (const p of m.listPrimitives()) { const a = p.getAttribute('POSITION').getArray(); for (let i = 0; i < a.length; i += 3) for (let k = 0; k < 3; k++) if (a[i + k] < mn[k]) mn[k] = a[i + k]; }
  const h = createHash('sha1');
  for (const p of m.listPrimitives()) {
    h.update(`m${mid(p.getMaterial())}|`);
    const a = p.getAttribute('POSITION').getArray(); const q = new Int32Array(a.length);
    for (let i = 0; i < a.length; i++) q[i] = Math.round((a[i] - mn[i % 3]) * 1e4); h.update(Buffer.from(q.buffer));
    const nn = p.getAttribute('NORMAL'); if (nn) { const b = nn.getArray(); const r = new Int16Array(b.length); for (let i = 0; i < b.length; i++) r[i] = Math.round(b[i] * 1e3); h.update(Buffer.from(r.buffer)); }
    const idx = p.getIndices(); if (idx) h.update(Buffer.from(idx.getArray().buffer, idx.getArray().byteOffset, idx.getArray().byteLength));
  }
  const key = h.digest('hex'); if (!groups.has(key)) groups.set(key, []); groups.get(key).push({ m, node: nodes[0], mn });
}
let sharedShapes = 0, sharedElements = 0;
for (const list of groups.values()) {
  if (list.length < 2) continue; sharedShapes++; sharedElements += list.length;
  const canon = list[0].m; const done = new Set();
  for (const p of canon.listPrimitives()) { const acc = p.getAttribute('POSITION'); if (done.has(acc)) continue; done.add(acc); const a = acc.getArray().slice(); for (let i = 0; i < a.length; i++) a[i] -= list[0].mn[i % 3]; acc.setArray(a); }
  for (const { node, mn } of list) {
    const M = node.getMatrix().slice();
    M[12] += M[0] * mn[0] + M[4] * mn[1] + M[8] * mn[2]; M[13] += M[1] * mn[0] + M[5] * mn[1] + M[9] * mn[2]; M[14] += M[2] * mn[0] + M[6] * mn[1] + M[10] * mn[2];
    node.setMatrix(M); node.setMesh(canon);
  }
}
lap(`shared ${sharedElements} world-placed elements as ${sharedShapes} shapes`);

// 3. Remove exact duplicates, merge each element's parts by material (one element = one node), weld.
await doc.transform(join({ keepMeshes: true }), weld(), dedup()); lap('dedup, merge parts by material, weld');

// 4. Simplify furniture and fixtures only (never a protected class, even if it shares a mesh with furniture).
const meshNodes = new Map();
for (const n of root.listNodes()) { const m = n.getMesh(); if (m) meshNodes.set(m, (meshNodes.get(m) || []).concat(n)); }
let simpMeshes = 0, simpBefore = 0, simpAfter = 0; const simpClasses = {};
for (const [m, nodes] of meshNodes) {
  const cls = nodes.map((n) => classOf.get(n.getName()) || '');
  if (cls.some((c) => PROTECTED.has(c))) continue;
  const ok = fromInstanced.has(m) || (cls.length && cls.every((c) => SIMPLIFY_CLASSES.has(c)));
  if (!ok) continue;
  for (const c of cls) simpClasses[c || 'unknown'] = (simpClasses[c || 'unknown'] || 0) + 1;
  for (const p of m.listPrimitives()) {
    const tb = p.getIndices().getCount() / 3; simpBefore += tb * nodes.length;
    simplifyPrimitive(p, { simplifier: MeshoptSimplifier, ratio: RATIO, error: ERROR, lockBorder: false });
    simpAfter += (p.getIndices().getCount() / 3) * nodes.length;
  }
  simpMeshes++;
}
lap(`simplified ${simpMeshes} furniture/fixture shapes: ${Math.round(simpBefore).toLocaleString()} -> ${Math.round(simpAfter).toLocaleString()} drawn triangles`);

// 5. Keep the IFC class and name on each element (for the 3D page's picking), prune, quantize + meshopt.
if (classOf.size) for (const n of root.listNodes()) { const g = n.getName(); if (classOf.has(g)) n.setExtras({ ...n.getExtras(), ifc_guid: g, ifc_class: classOf.get(g), ifc_name: nameOf.get(g) }); }
await doc.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium', quantizePosition: PBITS, quantizeNormal: 10 }));
lap('prune, quantize, meshopt compress');
const after = stats(doc);
await io.write(OUT, doc); lap('write');
const report = {
  input: { path: IN, bytes: statSync(IN).size, ...before },
  instanced: opt('--instanced') ? { path: opt('--instanced'), bytes: statSync(opt('--instanced')).size, replacedElements: replaced, frameCheck } : null,
  output: { path: OUT, bytes: statSync(OUT).size, ...after },
  settings: { simplifyRatio: RATIO, simplifyError: ERROR, positionBits: PBITS, normalBits: 10, meshopt: 'medium', simplifyClasses: [...SIMPLIFY_CLASSES], protectedClasses: [...PROTECTED] },
  steps: { sharedWorldPlacedShapes: sharedShapes, sharedWorldPlacedElements: sharedElements, simplifiedShapes: simpMeshes, simplifiedByClass: simpClasses, simplifiedDrawnTrianglesBefore: Math.round(simpBefore), simplifiedDrawnTrianglesAfter: Math.round(simpAfter) },
  seconds: times, node: process.version, gltfTransform: '4.5.1',
};
writeFileSync(OUT.replace(/\.glb$/i, '') + '.report.json', JSON.stringify(report, null, 2));
console.log('after', after); console.log(`done: ${(report.input.bytes / 1e6).toFixed(1)} MB -> ${(report.output.bytes / 1e6).toFixed(1)} MB in ${times.write}s`);
