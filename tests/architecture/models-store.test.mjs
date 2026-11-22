// What the Models section asks of the two stores: a note's "extra" (a model's version and summary) kept and given back,
// carried through export, import and moving a project up; and a big file's record written after its parts are in.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, memoryBackend, memoryFiles } from '../../architecture/js/store.js';
import { newProject } from '../../architecture/js/model.js';
import { createCloudStore, createGateway, moveProjects, dbId, CloudError } from '../../architecture/js/cloud.js';
import { createUpload } from '../../architecture/js/upload.js';
import { fakeSupabase } from './fake-supabase.mjs';
import { fakeTus, patterned } from './fake-tus.mjs';

const PRACTICE = { id: '11111111-1111-4111-8111-111111111111', name: 'Tui Architects', role: 'member' };
const mem = () => createStore(memoryBackend(), { files: memoryFiles() });
const EXTRA = { model: { kind: 'ifc', version: 2, by: 'Aroha' }, ifc: { counts: { walls: 12 }, spaces: { net_m2: 108.5 } } };

function shared({ role = 'member', token = 'tok' } = {}) {
  const fake = fakeSupabase(), local = mem();
  fake.auth = { getSession: async () => ({ data: { session: token ? { access_token: token } : null } }) };
  const gateway = createGateway(fake);
  const cloud = createCloudStore({ gateway, practice: { ...PRACTICE, role }, local });
  return { fake, local, cloud };
}
async function sharedProject(cloud, name = 'House A') {
  const b = newProject({ name });
  return { b, pid: await cloud.saveProject(b) };
}

test('browser store: extra rides on the note, is copied, and is absent when not given', async () => {
  const s = mem();
  const plain = await s.putFile({ project_id: 'p', owner_kind: 'model', owner_id: 'p', name: 'a.rvt', data: new Uint8Array(4) });
  assert.equal('extra' in plain, false, 'notes without extra look as before');
  const given = structuredClone(EXTRA);
  const m = await s.putFile({ project_id: 'p', owner_kind: 'model', owner_id: 'p', name: 'a.ifc', data: new Uint8Array(4), extra: given });
  given.model.version = 99;
  assert.deepEqual(m.extra, EXTRA, 'a copy is kept, not the caller’s object');
  assert.deepEqual((await s.listFiles({ project_id: 'p' })).find((f) => f.id === m.id).extra, EXTRA);
  assert.deepEqual((await s.getFile(m.id)).extra, EXTRA);
  const bad = await s.putFile({ project_id: 'p', owner_kind: 'model', owner_id: 'p', name: 'b.ifc', data: new Uint8Array(1), extra: [1, 2] });
  assert.equal('extra' in bad, false, 'only a plain object is kept');
});

test('export with the files and import elsewhere: the model keeps its version and summary', async () => {
  const s = mem(), b = newProject({ name: 'House B' }), pid = b.project.id;
  await s.saveProject(b);
  await s.putFile({ project_id: pid, owner_kind: 'model', owner_id: pid, name: 'a.ifc', data: 'ISO-10303-21;', extra: EXTRA });
  const out = await s.exportProject(pid, undefined, { files: true });
  const other = mem();
  const got = await other.importProject(out.text);
  const [f] = await other.listFiles({ project_id: got.project_id });
  assert.deepEqual(f.extra, EXTRA);
});

test('shared store: extra goes in the record’s extra column and comes back on the note', async () => {
  const { fake, cloud } = shared();
  const { pid } = await sharedProject(cloud);
  const m = await cloud.putFile({ project_id: pid, owner_kind: 'model', owner_id: pid, name: 'a.ifc', type: '', data: 'ISO-10303-21;', extra: EXTRA });
  assert.deepEqual(fake.db.file.at(-1).extra, EXTRA);
  assert.deepEqual(m.extra, EXTRA);
  assert.deepEqual((await cloud.listFiles({ project_id: pid }))[0].extra, EXTRA);
  const doc = await cloud.putFile({ project_id: pid, owner_kind: 'document', owner_id: 'd_1', name: 'brief.pdf', data: '%PDF' });
  assert.equal('extra' in doc, false, 'an empty extra column gives a note without extra, as before');
});

test('a big file in parts: filePlace says where, the parts go straight to storage, fileKept writes the record', async () => {
  const { fake, cloud } = shared();
  const { pid } = await sharedProject(cloud);
  const before = fake.writes().length;
  const place = await cloud.filePlace({ project_id: pid });
  assert.equal(place.path, `${PRACTICE.id}/${dbId(pid)}/${place.id}`, 'ids only in the path, never the file’s name');
  assert.equal(fake.writes().length, before, 'nothing is written by asking where');
  assert.equal(await cloud.fileToken(), 'tok');
  // the parts go to the stand-in tus server, then the record
  const tus = fakeTus({ token: 'tok' }), file = patterned(13 * 1024 * 1024, 'Big house.rvt');
  const up = createUpload({ file, endpoint: tus.endpoint, fetch: tus.fetch, sleep: async () => {}, key: 'k',
    metadata: { bucketName: 'arch-files', objectName: place.path, contentType: 'application/octet-stream' },
    headers: async () => ({ authorization: `Bearer ${await cloud.fileToken()}`, 'x-upsert': 'false' }) });
  await up.start();
  fake.files.set(`arch-files/${place.path}`, new Blob([tus.objects.get(`arch-files/${place.path}`)]));
  const note = await cloud.fileKept({ ...place, project_id: pid, owner_kind: 'model', owner_id: pid, name: file.name, type: file.type, size: file.size, extra: { model: { kind: 'rvt', version: 1 } } });
  assert.deepEqual([note.name, note.size, note.owner_kind, note.extra.model.kind], ['Big house.rvt', 13 * 1024 * 1024, 'model', 'rvt']);
  const back = await cloud.getFile(note.id);
  assert.equal(Buffer.compare(Buffer.from(back.data), Buffer.from(await file.arrayBuffer())), 0, 'read back byte for byte');
});

test('fileKept refuses a path outside the practice’s place, and removes the contents when the record is refused', async () => {
  const { fake, cloud } = shared();
  const { pid } = await sharedProject(cloud);
  const place = await cloud.filePlace({ project_id: pid });
  await assert.rejects(cloud.fileKept({ ...place, path: `${PRACTICE.id}/elsewhere/${place.id}`, project_id: pid, owner_kind: 'model', owner_id: pid, name: 'a.rvt', size: 1 }), /not in this practice’s place/);
  fake.files.set(`arch-files/${place.path}`, new Blob(['x']));
  fake.fail = (op) => (op.table === 'file' && op.action === 'insert' ? { code: '42501', message: 'new row violates row-level security policy' } : null);
  await assert.rejects(cloud.fileKept({ ...place, project_id: pid, owner_kind: 'model', owner_id: pid, name: 'a.rvt', size: 1 }), (e) => e instanceof CloudError && /The file was not kept/.test(e.message));
  assert.equal(fake.files.has(`arch-files/${place.path}`), false, 'the contents went with the refused record');
});

test('viewers and the Sample: no place is given', async () => {
  const v = shared({ role: 'viewer' });
  const { pid } = await sharedProject(shared().cloud);
  await assert.rejects(v.cloud.filePlace({ project_id: pid }), (e) => e.code === 'read_only');
  const { cloud } = shared();
  await assert.rejects(cloud.filePlace({ project_id: 'p_sample-waiheke-house' }), /The Sample’s files stay in this browser/);
  const signedOut = shared({ token: null });
  assert.equal(await signedOut.cloud.fileToken(), null);
});

test('moving a browser project up carries each model’s version and summary', async () => {
  const { local, cloud } = shared();
  const b = newProject({ name: 'House C' }), pid = b.project.id;
  await local.saveProject(b);
  await local.putFile({ project_id: pid, owner_kind: 'model', owner_id: pid, name: 'a.ifc', data: 'ISO-10303-21;', extra: EXTRA });
  const [r] = await moveProjects({ local, cloud, ids: [pid] });
  assert.equal(r.outcome, 'copied');
  assert.deepEqual((await cloud.listFiles({ project_id: pid }))[0].extra, EXTRA);
});
