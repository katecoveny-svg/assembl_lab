// Browser copies: a light GLB made from a model too big for a browser (docs/architecture/browser-copy.md). It is kept
// like any model with extra.browser_copy_of = its model's file id, shown under that model (not as a stack of its own),
// and Open in 3D hands it over instead. All data here is invented.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BROWSER_3D_LIMIT, copyOf, browserCopyFor, handoverFor, copyProblem, stacks, isModel } from '../../architecture/js/models-rules.js';
import { createStore, memoryBackend, memoryFiles } from '../../architecture/js/store.js';

const MB = 1024 * 1024;
const ifc = (id, size, kept = '2026-11-20T09:00:00Z', name = 'pavilion.ifc') => ({ id, name, size, owner_kind: 'model', kept_at: kept, extra: { model: { kind: 'ifc', version: 1 }, ifc: { counts: { walls: 4 } } } });
const glb = (id, size, of, kept = '2026-11-21T09:00:00Z', name = 'pavilion-browser.glb') => ({ id, name, size, owner_kind: 'model', kept_at: kept, extra: { model: { kind: 'glb', version: 1 }, ...(of ? { browser_copy_of: of } : {}) } });

/** a tiny plain GLB (one triangle), made here: the stand-in for a browser copy in the store */
function tinyGlb() {
  const pos = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), json = { asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, name: '0InventedGuid000000001' }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }], buffers: [{ byteLength: 36 }], bufferViews: [{ buffer: 0, byteLength: 36 }], accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [0, 0, 0], max: [1, 1, 0] }] };
  let jt = new TextEncoder().encode(JSON.stringify(json)); const pj = new Uint8Array(Math.ceil(jt.length / 4) * 4).fill(0x20); pj.set(jt); jt = pj;
  const out = new Uint8Array(12 + 8 + jt.length + 8 + 36), dv = new DataView(out.buffer);
  dv.setUint32(0, 0x46546c67, true); dv.setUint32(4, 2, true); dv.setUint32(8, out.length, true);
  dv.setUint32(12, jt.length, true); dv.setUint32(16, 0x4e4f534a, true); out.set(jt, 20);
  dv.setUint32(20 + jt.length, 36, true); dv.setUint32(24 + jt.length, 0x004e4942, true); out.set(new Uint8Array(pos.buffer), 28 + jt.length);
  return out;
}

test('a GLB with browser_copy_of is a copy of that model; anything else is not', () => {
  assert.equal(copyOf(glb('g', MB, 'm1')), 'm1');
  assert.equal(copyOf(glb('g', MB, null)), '', 'a plain GLB');
  assert.equal(copyOf({ ...ifc('i', MB), extra: { browser_copy_of: 'm1' } }), '', 'only a .glb can be a browser copy');
  assert.equal(copyOf({ name: 'x.glb', extra: { browser_copy_of: 7 } }), '', 'the id is a string');
});

test('the newest copy a browser can open is the one used; a copy over the limit is not', () => {
  const big = ifc('m1', 400 * MB);
  const old = glb('c1', 40 * MB, 'm1', '2026-11-21T09:00:00Z'), fresh = glb('c2', 30 * MB, 'm1', '2026-11-22T09:00:00Z'), heavy = glb('c3', 150 * MB, 'm1', '2026-11-23T09:00:00Z');
  const other = glb('c4', 10 * MB, 'm9', '2026-11-23T10:00:00Z');
  assert.equal(browserCopyFor(big, [big, old, fresh, heavy, other])?.id, 'c2');
  assert.equal(browserCopyFor(big, [big, other]), null);
  assert.equal(browserCopyFor(null, [old]), null);
});

test('Open in 3D hands over the copy; a too-big model with no copy hands over nothing; a small one hands itself over', () => {
  const big = ifc('m1', 400 * MB), copy = glb('c1', 6 * MB, 'm1'), small = ifc('m2', 3 * MB, undefined, 'shed.ifc'), smallCopy = glb('c2', MB, 'm2');
  assert.equal(handoverFor(big, [big, copy]).id, 'c1', 'a too-big IFC opens in 3D through its copy');
  assert.equal(handoverFor(big, [big]), null);
  assert.equal(handoverFor(small, [small]).id, 'm2');
  assert.equal(handoverFor(small, [small, smallCopy]).id, 'c2', 'a lighter copy is used whenever there is one');
  assert.equal(handoverFor({ id: 'd', name: 'set.pdf', size: 900 * MB }, []).id, 'd', 'the limit is for models, not drawing sets');
});

test('copies sit under their model, not in a stack of their own, until that model is removed', () => {
  const big = ifc('m1', 400 * MB), copy = glb('c1', 6 * MB, 'm1'), loose = glb('g1', 2 * MB, null, '2026-11-19T09:00:00Z', 'site.glb');
  assert.deepEqual(stacks([big, copy, loose]).map((s) => s.latest.id), ['m1', 'g1']);
  assert.deepEqual(stacks([copy, loose]).map((s) => s.latest.id), ['c1', 'g1'], 'a copy whose model is gone shows on its own, so it can be found and removed');
  const v2 = { ...ifc('m1b', 410 * MB, '2026-11-22T09:00:00Z'), extra: { model: { kind: 'ifc', version: 2 } } };
  const s = stacks([big, v2, copy]);
  assert.equal(s.length, 1, 'a copy of an earlier version is not a stack either');
  assert.equal(browserCopyFor(s[0].latest, [big, v2, copy]), null, 'the newest version needs its own copy');
});

test('only a .glb under the limit, for a model still kept, is kept as a copy', () => {
  const src = ifc('m1', 400 * MB);
  assert.equal(copyProblem({ name: 'copy.glb', size: 30 * MB }, src), '');
  assert.match(copyProblem({ name: 'copy.ifc', size: MB }, src), /\.glb file/);
  assert.match(copyProblem({ name: 'copy.glb', size: MB }, undefined), /not kept here any more/);
  assert.match(copyProblem({ name: 'copy.glb', size: BROWSER_3D_LIMIT + 1 }, src), /too big to open in 3D in a browser as well: the most is 100 MB/);
});

test('the browser store keeps a copy with browser_copy_of, and the Models section reads it back as the copy', async () => {
  const s = createStore(memoryBackend(), { files: memoryFiles() }), p = { id: 'p_sample' };
  const model = await s.putFile({ project_id: p.id, owner_kind: 'model', owner_id: p.id, name: 'pavilion.ifc', data: 'ISO-10303-21;', extra: { model: { kind: 'ifc', version: 1 } } });
  const data = tinyGlb();
  const copy = await s.putFile({ project_id: p.id, owner_kind: 'model', owner_id: p.id, name: 'pavilion-browser.glb', type: 'model/gltf-binary', data, extra: { model: { kind: 'glb', version: 1 }, browser_copy_of: model.id } });
  const all = (await s.listFiles({ project_id: p.id })).filter((f) => isModel(f, p));
  assert.equal(stacks(all).length, 1);
  assert.equal(browserCopyFor(stacks(all)[0].latest, all).id, copy.id);
  const back = await s.getFile(copy.id);
  assert.equal(Buffer.compare(Buffer.from(back.data), Buffer.from(data)), 0, 'its bytes, as kept');
  assert.equal(back.extra.browser_copy_of, model.id);
});

test('the card view reads a meshopt-compressed, quantized browser copy (made by tools/browser-copy from an invented building)', async () => {
  const { glbMeshes, meshesOf, meshoptDecoder } = await import('../../architecture/js/model-view.js');
  const bytes = new Uint8Array(readFileSync(new URL('./fixtures/browser-copy-sample.glb', import.meta.url)));
  assert.match(new TextDecoder().decode(bytes.subarray(0, 4000)), /EXT_meshopt_compression/);
  assert.throws(() => glbMeshes(bytes), (e) => e.code === 'meshopt' && /compressed/.test(e.message), 'without the decoder it says so');
  const got = await meshesOf('glb', bytes);
  assert.equal(got.triangles, 12480, 'slab, three walls, twelve mullions and six chairs, as drawn');
  const again = glbMeshes(bytes, undefined, await meshoptDecoder());
  assert.equal(again.triangles, got.triangles);
  // where it sits: the invented building runs 100 to 112 m east, 50 to 53 m up, -200 to -192 m along z
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const part of got.parts) for (let i = 0; i < part.positions.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], part.positions[i + k]); hi[k] = Math.max(hi[k], part.positions[i + k]); }
  const near = (a, b) => assert.ok(Math.abs(a - b) < 0.01, `${a} is within 10 mm of ${b}`);
  near(lo[0], 100); near(hi[0], 112); near(lo[1], 50); near(hi[1], 53); near(lo[2], -200); near(hi[2], -191.95);
});

test('the page wires it up: a .glb chooser on a too-big model, the copy kept with its model id, Open in 3D through the copy', () => {
  const src = readFileSync(new URL('../../architecture/js/models.js', import.meta.url), 'utf8');
  assert.match(src, /data-mcopy data-for="\$\{esc\(f\.id\)\}" accept="\.glb"/);
  assert.match(src, /Add a browser copy/);
  assert.match(src, /const versions = st\.reduce\(\(n, x\) => n \+ 1 \+ x\.older\.length, 0\);/, 'a copy is not counted as a version of its model');
  assert.match(src, /keepOne\(file, ctx, p, \{ copyOf: copyPick\.dataset\.for \}\)/);
  assert.match(src, /browser_copy_of: opts\.copyOf/);
  assert.match(src, /const note = handoverFor\(source, models\) \?\? source;/);
  assert.match(src, /■ Browser copy · \$\{esc\(nb\(sizeText\(copy\.size\)\)\)\}/);
  assert.match(src, /const big = k\.to3d === 'model' && tooBigFor3d\(f\.size\) && !copy;/, 'no Too big line when there is a copy');
  const plan = readFileSync(new URL('../../plan-studio/twins/src/twin/projectPlan.ts', import.meta.url), 'utf8');
  assert.match(plan, /gl\.setMeshoptDecoder\(MeshoptDecoder\);\s*obj = \(await gl\.parseAsync\(input\.bytes, ''\)\)\.scene;/, 'the 3D page reads a meshopt copy');
});
