import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, memoryBackend, memoryFiles, FILE_LIMIT, sizeText, bytesToBase64, base64ToBytes } from '../../architecture/js/store.js';
import { newProject, readBundle, writeBundle, copyBundle, bundleFiles } from '../../architecture/js/model.js';

const T0 = '2026-11-22T00:00:00.000Z';
const mem = (o = {}) => createStore(memoryBackend(), { files: memoryFiles(o) });
const bytes = (n, v = 7) => new Uint8Array(n).fill(v);
const text = (u8) => new TextDecoder().decode(u8);

/** a project with one document that has a file, and a plan model whose file is kept */
async function withFiles(s, name = 'House A') {
  const b = newProject({ name, now: T0 }), pid = b.project.id;
  b.documents.push({ id: 'd1', project_id: pid, stage: 'predesign', title: 'Brief', kind: 'Brief', version: '1', date: '', source: '', note: '' });
  await s.saveProject(b);
  const f = await s.putFile({ project_id: pid, owner_kind: 'document', owner_id: 'd1', name: 'brief.pdf', type: 'application/pdf', data: bytes(2048) });
  await s.save('document', { ...(await s.get('document', 'd1')), file: { id: f.id, name: f.name, type: f.type, size: f.size, kept_at: f.kept_at } });
  const m = await s.putFile({ project_id: pid, owner_kind: 'model', owner_id: pid, name: 'house.plan.json', type: 'application/json', data: '{"buildings":[]}' });
  const p = await s.get('project', pid);
  p.model = { fingerprint: 'abc123abc123', drawings: 'A', revision: 'A', file_name: 'house.plan.json', file: { id: m.id, name: m.name, type: m.type, size: m.size, kept_at: m.kept_at } };
  await s.save('project', p);
  return { pid, f, m };
}

test('a file is kept, listed without its contents, read back byte for byte, and removed', async () => {
  const s = mem();
  const meta = await s.putFile({ project_id: 'p1', owner_kind: 'document', owner_id: 'd1', name: 'brief.pdf', type: 'application/pdf', data: bytes(3000, 9) });
  assert.equal(meta.size, 3000); assert.equal(meta.name, 'brief.pdf'); assert.match(meta.id, /^file_/); assert.ok(meta.kept_at);
  assert.equal('data' in meta, false, 'the note handed back does not carry the contents');
  const list = await s.listFiles({ project_id: 'p1' });
  assert.equal(list.length, 1); assert.equal('data' in list[0], false, 'lists carry the notes only');
  assert.equal((await s.listFiles({ project_id: 'other' })).length, 0);
  const got = await s.getFile(meta.id);
  assert.deepEqual([...got.data], [...bytes(3000, 9)]); assert.equal(got.type, 'application/pdf');
  assert.equal(await s.getFile('missing'), null);
  assert.equal(await s.removeFile(meta.id), true); assert.equal(await s.removeFile(meta.id), false);
  assert.equal(await s.getFile(meta.id), null);
});

test('text, an ArrayBuffer and a typed array are all kept as the same bytes', async () => {
  const s = mem(), put = (data) => s.putFile({ project_id: 'p', owner_kind: 'model', owner_id: 'p', name: 'm.json', data });
  const a = await put('{"é":1}'), b = await put(new TextEncoder().encode('{"é":1}').buffer), c = await put(new TextEncoder().encode('{"é":1}'));
  for (const m of [a, b, c]) assert.equal(text((await s.getFile(m.id)).data), '{"é":1}');
  assert.equal(a.size, 8, 'size is counted in bytes, not characters');
});

test('the limit is clear: a file over it is refused in plain words and nothing is kept', async () => {
  const s = mem();
  await assert.rejects(s.putFile({ project_id: 'p', owner_kind: 'document', owner_id: 'd', name: 'big.pdf', data: bytes(FILE_LIMIT + 1) }), /“big\.pdf” is 25 MB\. The limit is 25 MB a file, because files are kept in this browser/);
  assert.equal((await s.listFiles()).length, 0);
  assert.equal((await s.putFile({ project_id: 'p', owner_kind: 'document', owner_id: 'd', name: 'ok.pdf', data: bytes(1024) })).size, 1024);
});

test('a full or refusing browser gives a plain message, and the file already kept is untouched', async () => {
  const s = mem({ quota: 5000 });
  const first = await s.putFile({ project_id: 'p', owner_kind: 'document', owner_id: 'd', name: 'a.pdf', data: bytes(4000) });
  await assert.rejects(s.putFile({ project_id: 'p', owner_kind: 'document', owner_id: 'd', name: 'b.pdf', data: bytes(4000) }), /This browser is full, so “b\.pdf” was not kept/);
  assert.equal((await s.getFile(first.id)).size, 4000);
  const broken = createStore(memoryBackend(), { files: { put: async () => { throw new Error('The operation is insecure.'); }, get: async () => null, delete: async () => false, list: async () => [] } });
  await assert.rejects(broken.putFile({ project_id: 'p', owner_kind: 'document', owner_id: 'd', name: 'c.pdf', data: bytes(10) }), /This browser would not keep “c\.pdf” \(The operation is insecure\.\)/);
});

test('a file needs the record it belongs to', async () => {
  const s = mem();
  await assert.rejects(s.putFile({ project_id: 'p', owner_kind: 'invoice', owner_id: 'x', name: 'a', data: bytes(1) }), /needs the record it belongs to/);
  await assert.rejects(s.putFile({ project_id: 'p', owner_kind: 'document', owner_id: 'd', name: 'a' }), /nothing in that file/);
});

test('with no place given for files the store still works (memory), and says files are not kept past the tab', async () => {
  const s = createStore(memoryBackend()); // no IndexedDB under node
  assert.equal(s.filesPersistent, false);
  const m = await s.putFile({ project_id: 'p', owner_kind: 'document', owner_id: 'd', name: 'a.txt', data: 'hello' });
  assert.equal(text((await s.getFile(m.id)).data), 'hello');
  assert.equal(mem().filesPersistent, true);
});

test('removing a project removes its files and leaves another project’s files alone', async () => {
  const s = mem();
  const a = await withFiles(s, 'House A');
  const other = await s.putFile({ project_id: 'p-other', owner_kind: 'document', owner_id: 'dx', name: 'x.pdf', data: bytes(10) });
  assert.equal((await s.listFiles({ project_id: a.pid })).length, 2);
  await s.removeProject(a.pid);
  assert.equal((await s.listFiles({ project_id: a.pid })).length, 0);
  assert.ok(await s.getFile(other.id));
});

test('export says plainly whether files are included: records only by default', async () => {
  const s = mem(), { pid } = await withFiles(s);
  const x = await s.exportProject(pid, T0);
  assert.equal(x.files_included, false); assert.equal(x.file_count, 0); assert.match(x.file_name, /^house-a-project-\d{4}-\d{2}-\d{2}\.json$/);
  const j = JSON.parse(x.text);
  assert.equal(j.files_included, false); assert.equal('files' in j, false);
  assert.match(j.note, /Files are not included: only the records\./);
  assert.equal(j.documents[0].file.name, 'brief.pdf', 'the record still names the file it had');
  assert.equal(x.text.includes('data_base64'), false);
});

test('export with files carries every file, and importing it into another browser gives them back byte for byte', async () => {
  const from = mem(), to = mem(), { pid, f, m } = await withFiles(from);
  const x = await from.exportProject(pid, T0, { files: true });
  assert.equal(x.files_included, true); assert.equal(x.file_count, 2); assert.equal(x.file_bytes, 2048 + 16); assert.match(x.file_name, /-with-files\.json$/);
  const j = JSON.parse(x.text);
  assert.equal(j.files_included, true); assert.equal(j.files.length, 2); assert.match(j.note, /Files are included: 2\./);
  const r = await to.importProject(x.text, T0);
  assert.deepEqual(r, { project_id: pid, copied: false, files: 2, files_failed: 0 });
  assert.deepEqual([...(await to.getFile(f.id)).data], [...bytes(2048)]);
  assert.equal(text((await to.getFile(m.id)).data), '{"buildings":[]}');
  assert.equal((await to.get('document', 'd1')).file.id, f.id);
});

test('importing a records-only file brings no files: the document still names its file, and the contents are not here', async () => {
  const from = mem(), to = mem(), { pid, f } = await withFiles(from);
  const r = await to.importProject((await from.exportProject(pid, T0)).text, T0);
  assert.deepEqual(r, { project_id: pid, copied: false }, 'the answer is the same as before files existed');
  assert.equal((await to.get('document', 'd1')).file.name, 'brief.pdf');
  assert.equal(await to.getFile(f.id), null);
  assert.equal((await to.listFiles({ project_id: pid })).length, 0);
});

test('importing a project with files beside itself makes a copy whose files and pointers have ids of their own', async () => {
  const s = mem(), { pid, f, m } = await withFiles(s);
  const r = await s.importProject((await s.exportProject(pid, T0, { files: true })).text, T0);
  assert.equal(r.copied, true); assert.equal(r.files, 2); assert.notEqual(r.project_id, pid);
  const copy = await s.loadProject(r.project_id), files = await s.listFiles({ project_id: r.project_id });
  assert.equal(files.length, 2);
  const docFile = files.find((x) => x.owner_kind === 'document'), modelFile = files.find((x) => x.owner_kind === 'model');
  assert.notEqual(docFile.id, f.id); assert.notEqual(modelFile.id, m.id);
  assert.equal(copy.documents[0].file.id, docFile.id); assert.equal(docFile.owner_id, copy.documents[0].id);
  assert.equal(copy.project.model.file.id, modelFile.id); assert.equal(modelFile.owner_id, r.project_id);
  assert.equal((await s.listFiles({ project_id: pid })).length, 2, 'the project already here keeps its own files');
  assert.ok(await s.getFile(f.id));
});

test('a file the browser refuses on import is counted, not hidden', async () => {
  const from = mem(), to = mem({ quota: 100 }), { pid } = await withFiles(from);
  const r = await to.importProject((await from.exportProject(pid, T0, { files: true })).text, T0);
  assert.equal(r.files, 1); assert.equal(r.files_failed, 1);
});

test('the bundle keeps only well-formed files, and an old project file (no files_included) still reads', () => {
  const b = newProject({ name: 'House A', now: T0 });
  const old = writeBundle(b, T0); delete old.files_included;
  assert.equal('files' in readBundle(JSON.stringify(old)), false);
  const j = writeBundle(b, T0, [{ id: 'file_1', name: 'a.pdf', data_base64: 'AAEC', owner_kind: 'document', owner_id: 'd1' }, { id: 'file_2', name: 'no contents' }, null]);
  assert.equal(bundleFiles(j).length, 1);
  assert.equal(readBundle(JSON.stringify(j)).files.length, 1);
  assert.equal(copyBundle(readBundle(JSON.stringify(j)), T0).files[0].id !== 'file_1', true);
});

test('sizes read plainly, and base64 goes there and back', () => {
  assert.equal(sizeText(0), '0 bytes'); assert.equal(sizeText(1000), '1000 bytes'); assert.equal(sizeText(1024), '1 KB'); assert.equal(sizeText(180193), '176 KB');
  assert.equal(sizeText(2.4 * 1024 * 1024), '2.4 MB'); assert.equal(sizeText(FILE_LIMIT), '25 MB');
  const u = new Uint8Array(70000).map((_, i) => i % 256);
  assert.deepEqual([...base64ToBytes(bytesToBase64(u))], [...u]);
});
