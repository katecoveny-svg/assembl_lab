// The Models add-on's parts that run without a page: it registers itself, and reads a plain GLB into triangles.
// (Handing a model to the 3D page: tests/architecture/models-handoff.test.mjs.) (The section itself is checked in a test browser: see the report's stills.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { projectPanels, navItems, getRoute, _reset } from '../../architecture/js/modules.js';
import { TWIN_FILE_INPUT } from '../../architecture/js/models-rules.js';

test('it registers a project section (order 10), the #/models screen and a top-bar link, and loads nothing heavy with the page', async () => {
  _reset();
  const m = await import('../../architecture/js/models.js');
  assert.deepEqual(projectPanels().map((p) => [p.id, p.title, p.order]), [['models', 'Models', 10]]);
  assert.equal(getRoute('models').title, 'Models');
  assert.deepEqual(navItems().map((n) => [n.id, n.label, n.hash, n.order]), [['models', 'Models', '#/models', 10]]);
  assert.match(navItems()[0].icon, /^<svg /);
  assert.ok(!('handToTwin' in m), 'the old hand-over by scripting a second window is gone');
  assert.equal(m.modelSummary({ extra: { ifc: { counts: { walls: 2 } } } }).counts.walls, 2);
  assert.equal(m.modelSummary({}), null);
  const src = readFileSync(new URL('../../architecture/js/models.js', import.meta.url), 'utf8');
  const eager = [...src.matchAll(/^import .* from '([^']+)';$/gm)].map((x) => x[1]);
  assert.deepEqual(eager.sort(), ['./config.js', './model.js', './models-rules.js', './modules.js'], 'the reader, the 3D view and the uploader load only when needed');
  assert.match(src, /import\('\.\/model-view\.js'\)/); assert.match(src, /import\('\.\/upload\.js'\)/);
  assert.ok(!/web-ifc/.test(readFileSync(new URL('../../architecture/js/models-rules.js', import.meta.url), 'utf8')));
});

test('the built 3D page that is live still has that chooser input and reads an .ifc from it', () => {
  const dir = new URL('../../plan-studio/twins/drop/assets/', import.meta.url);
  const built = readdirSync(dir).filter((f) => /^projectPlan-.*\.js$/.test(f)).map((f) => readFileSync(new URL(f, dir), 'utf8')).join('\n');
  assert.ok(built.includes(`id="${TWIN_FILE_INPUT}"`), 'the input is in the bundle');
  assert.match(built, new RegExp(`${TWIN_FILE_INPUT}"\\)\\.addEventListener\\("change"`), 'and a change on it reads the file');
  assert.match(built, /"ifc"/);
});

/** a GLB with one box (8 corners, 12 triangles), moved by its node, with a base colour */
function boxGlb({ draco = false } = {}) {
  const pos = new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1]);
  const idx = new Uint16Array([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7]);
  const bin = new Uint8Array(pos.byteLength + idx.byteLength);
  bin.set(new Uint8Array(pos.buffer), 0); bin.set(new Uint8Array(idx.buffer), pos.byteLength);
  const json = {
    asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, translation: [10, 0, 0] }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: 0 }] }], materials: [{ pbrMetallicRoughness: { baseColorFactor: [0.2, 0.4, 0.6, 1] } }],
    buffers: [{ byteLength: bin.length }], bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: pos.byteLength }, { buffer: 0, byteOffset: pos.byteLength, byteLength: idx.byteLength }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 8, type: 'VEC3' }, { bufferView: 1, componentType: 5123, count: 36, type: 'SCALAR' }],
    ...(draco ? { extensionsUsed: ['KHR_draco_mesh_compression'] } : {}),
  };
  let jt = new TextEncoder().encode(JSON.stringify(json));
  const pad = (b, fill) => { const n = Math.ceil(b.length / 4) * 4, o = new Uint8Array(n).fill(fill); o.set(b); return o; };
  jt = pad(jt, 0x20); const bb = pad(bin, 0);
  const out = new Uint8Array(12 + 8 + jt.length + 8 + bb.length), dv = new DataView(out.buffer);
  dv.setUint32(0, 0x46546c67, true); dv.setUint32(4, 2, true); dv.setUint32(8, out.length, true);
  dv.setUint32(12, jt.length, true); dv.setUint32(16, 0x4e4f534a, true); out.set(jt, 20);
  dv.setUint32(20 + jt.length, bb.length, true); dv.setUint32(24 + jt.length, 0x004e4942, true); out.set(bb, 28 + jt.length);
  return out;
}

test('a plain GLB is read into triangles, placed by its node, with its colour; a compressed one is said plainly', async () => {
  const { glbMeshes } = await import('../../architecture/js/model-view.js');
  const got = glbMeshes(boxGlb());
  assert.equal(got.triangles, 12);
  assert.equal(got.parts.length, 1);
  assert.deepEqual([...got.parts[0].positions.slice(0, 6)], [10, 0, 0, 11, 0, 0], 'moved 10 along x by its node');
  assert.deepEqual(got.parts[0].color, [0.2, 0.4, 0.6, 1]);
  assert.equal(got.parts[0].indices.length, 36);
  assert.throws(() => glbMeshes(boxGlb({ draco: true })), /compressed/);
  assert.throws(() => glbMeshes(new Uint8Array(16)), /not a GLB/);
  assert.equal(glbMeshes(boxGlb(), 5).cut, true, 'past the triangle limit the rest is left out, and it says so');
});
