import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, memoryBackend, browserBackend, KINDS } from '../../architecture/js/store.js';
import { newProject, sampleProject, recordApproval, markDone, activity, BUNDLE_TYPE, readBundle, writeBundle, copyBundle, fileSlug } from '../../architecture/js/model.js';

const T0 = '2026-11-22T00:00:00.000Z';
const mem = () => createStore(memoryBackend());

test('save, get, list and remove one row', async () => {
  const s = mem();
  assert.equal(s.persistent, true);
  await s.save('task', { id: 't1', project_id: 'p1', stage: 'predesign', title: 'Visit the site', status: 'todo' });
  await s.save('task', { id: 't2', project_id: 'p2', stage: 'predesign', title: 'Other project', status: 'todo' });
  assert.equal((await s.get('task', 't1')).title, 'Visit the site');
  assert.equal(await s.get('task', 'missing'), null);
  assert.equal((await s.list('task')).length, 2);
  assert.deepEqual((await s.list('task', { project_id: 'p1' })).map((t) => t.id), ['t1']);
  await s.save('task', { id: 't1', project_id: 'p1', stage: 'predesign', title: 'Visit the site', status: 'done' });
  assert.equal((await s.get('task', 't1')).status, 'done', 'saving again replaces the row');
  assert.equal(await s.remove('task', 't1'), true);
  assert.equal(await s.remove('task', 't1'), false);
  assert.equal((await s.list('task')).length, 1);
});

test('rows handed out are copies: changing one does not change what is saved', async () => {
  const s = mem();
  const row = { id: 't1', project_id: 'p1', title: 'A' };
  await s.save('task', row); row.title = 'changed after saving';
  const got = await s.get('task', 't1'); got.title = 'changed after reading';
  assert.equal((await s.get('task', 't1')).title, 'A');
});

test('unknown kinds and rows without an id are refused', async () => {
  const s = mem();
  await assert.rejects(s.list('invoice'), /Unknown kind/);
  await assert.rejects(s.save('task', { title: 'no id' }), /needs an id/);
  assert.ok(KINDS.includes('project') && KINDS.includes('approval') && KINDS.includes('activity'));
});

test('a whole project is saved, loaded and removed without touching another project', async () => {
  const s = mem();
  const a = newProject({ name: 'House A', now: T0 }), b = newProject({ name: 'House B', now: T0 });
  a.activity.push(activity(a.project.id, 'Kate', 'Project created', 'House A', T0));
  await s.saveProject(a); await s.saveProject(b);
  const got = await s.loadProject(a.project.id);
  assert.equal(got.project.name, 'House A');
  assert.equal(got.stages.length, 7); assert.equal(got.tasks.length, a.tasks.length); assert.equal(got.checklist.length, a.checklist.length);
  assert.equal(got.activity[0].who, 'Kate');
  got.tasks.pop(); await s.saveProject(got);
  assert.equal((await s.loadProject(a.project.id)).tasks.length, a.tasks.length - 1, 'saving a bundle replaces that project’s rows');
  assert.equal((await s.loadProject(b.project.id)).tasks.length, b.tasks.length, 'the other project is untouched');
  assert.equal(await s.removeProject(a.project.id), true);
  assert.equal(await s.loadProject(a.project.id), null);
  assert.equal((await s.list('task', { project_id: a.project.id })).length, 0);
  assert.equal((await s.list('project')).length, 1);
});

test('what is saved survives a new store on the same backend (a page reload)', async () => {
  const backend = memoryBackend();
  const a = newProject({ name: 'House A', now: T0 });
  await createStore(backend).saveProject(a);
  const again = await createStore(backend).loadProject(a.project.id);
  assert.equal(again.project.name, 'House A');
});

test('a browser that refuses storage does not stop the page, and says it is not saving', async () => {
  const throwing = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('QuotaExceededError'); }, removeItem() { throw new Error('blocked'); } };
  const s = createStore(throwing);
  await s.save('task', { id: 't1', project_id: 'p1', title: 'kept in memory' });
  assert.equal((await s.get('task', 't1')).title, 'kept in memory', 'the work is still there for this visit');
  assert.equal(s.persistent, false, 'and the page can say it will not last');
  const none = createStore(null);
  assert.equal(none.persistent, false);
  await none.save('task', { id: 't1', title: 'x' });
  assert.equal((await none.list('task')).length, 1);
  assert.equal(browserBackend(), null, 'no localStorage in Node: the probe fails safely');
});

test('unreadable saved data is treated as empty, not as a crash', async () => {
  const backend = memoryBackend();
  backend.setItem('assembl.architecture.v1.task', '{not json');
  const s = createStore(backend);
  assert.deepEqual(await s.list('task'), []);
  await s.save('task', { id: 't1', title: 'fresh' });
  assert.equal((await s.list('task')).length, 1);
});

test('export gives a named file with everything about the project', async () => {
  const s = mem();
  const a = newProject({ name: 'Te Whare: Stage 1!', client: 'A client', now: T0 });
  a.project.site = { lat: -36.8, lon: 175.08, facts: [{ id: 'site.zone', label: 'Planning zone', status: 'live', value: 'Z', source: { name: 'Council' }, licence: { attribution: 'Credit.' } }], fetched_at: T0 };
  recordApproval(a, 'predesign', { who: 'Test Person', role: 'Registered architect' }, T0); markDone(a, 'predesign', T0);
  a.rfis.push({ id: 'r1', project_id: a.project.id, received_at: '2026-11-20', from: 'Council', question: 'Q?', response: '', status: 'open', sent_at: '' });
  await s.saveProject(a);
  const { file_name, text } = await s.exportProject(a.project.id, T0);
  const d = new Date(T0), local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  assert.equal(file_name, `te-whare-stage-1-project-${local}.json`, 'named with the date where the person is');
  const j = JSON.parse(text);
  assert.equal(j.type, BUNDLE_TYPE); assert.equal(j.exported_at, T0);
  assert.equal(j.project.name, 'Te Whare: Stage 1!');
  assert.equal(j.approvals.length, 1); assert.equal(j.rfis.length, 1); assert.equal(j.stages.length, 7);
  assert.equal(j.project.site.facts[0].source.name, 'Council');
  await assert.rejects(s.exportProject('missing'), /not in this browser/);
});

test('export then import into an empty browser gives the same project back', async () => {
  const from = mem(), to = mem();
  const a = newProject({ name: 'House A', client: 'A client', now: T0 });
  recordApproval(a, 'predesign', { who: 'Test Person', role: 'Registered architect', note: 'n' }, T0); markDone(a, 'predesign', T0);
  a.documents.push({ id: 'd1', project_id: a.project.id, stage: 'predesign', title: 'Brief', kind: 'Brief', version: '1', date: '2026-11-20', source: 'client', note: '' });
  a.checklist[0].document_id = 'd1';
  a.activity.push(activity(a.project.id, 'Kate', 'Stage done', 'Predesign', T0));
  await from.saveProject(a);
  const before = await from.loadProject(a.project.id);
  const { text } = await from.exportProject(a.project.id, T0);
  const r = await to.importProject(text, T0);
  assert.deepEqual(r, { project_id: a.project.id, copied: false });
  const sort = (b) => { for (const k of Object.keys(b)) if (Array.isArray(b[k])) b[k].sort((x, y) => x.id.localeCompare(y.id)); return b; };
  assert.deepEqual(sort(await to.loadProject(a.project.id)), sort(before));
});

test('importing a project that is already here adds a copy and never overwrites', async () => {
  const s = mem();
  const a = newProject({ name: 'House A', now: T0 });
  a.documents.push({ id: 'd1', project_id: a.project.id, stage: 'detailed', title: 'Drawings', kind: 'Drawing', version: 'A', date: '', source: '', note: '' });
  a.checklist[1].document_id = 'd1';
  await s.saveProject(a);
  const { text } = await s.exportProject(a.project.id, T0);
  const kept = await s.loadProject(a.project.id); kept.project.name = 'House A, edited since the export'; await s.saveProject(kept);
  const r = await s.importProject(text, T0);
  assert.equal(r.copied, true); assert.notEqual(r.project_id, a.project.id);
  assert.equal((await s.get('project', a.project.id)).name, 'House A, edited since the export', 'the project already here is untouched');
  const copy = await s.loadProject(r.project_id);
  assert.equal(copy.project.name, 'House A (imported copy)');
  assert.equal(copy.tasks.length, a.tasks.length);
  assert.ok(copy.tasks.every((t) => t.project_id === r.project_id && !a.tasks.some((o) => o.id === t.id)), 'the copy has ids of its own');
  const linked = copy.checklist.find((c) => c.document_id);
  assert.equal(linked.document_id, copy.documents[0].id, 'links inside the copy point at the copy’s own documents');
  assert.equal((await s.list('project')).length, 2);
});

test('import refuses files that are not projects, in plain words, and saves nothing', async () => {
  const s = mem();
  await assert.rejects(s.importProject('not json'), /not JSON/);
  await assert.rejects(s.importProject('{"type":"something-else"}'), /not a project exported from this page/);
  await assert.rejects(s.importProject(JSON.stringify({ type: BUNDLE_TYPE, project: { id: 'p1' } })), /no name or id/);
  await assert.rejects(s.importProject(JSON.stringify({ type: BUNDLE_TYPE, project: { id: 'p1', name: 'X', stage: 'predesign' }, stages: [] })), /all seven stages/);
  assert.equal((await s.list('project')).length, 0);
});

test('a plan model file is not mistaken for a project file', () => {
  assert.throws(() => readBundle('{"schema":"assembl.plan-model.v1","buildings":[]}'), /not a project exported from this page/);
});

test('the sample round-trips with its Sample label', async () => {
  const b = sampleProject(T0), back = readBundle(JSON.stringify(writeBundle(b, T0)));
  assert.equal(back.project.sample, true);
  assert.equal(copyBundle(back, T0).project.sample, true);
});

test('file names are plain', () => {
  assert.equal(fileSlug('A house on Waiheke Island'), 'a-house-on-waiheke-island');
  assert.equal(fileSlug('  '), 'project');
  assert.equal(fileSlug('Whare Ōtāhuhu'), 'whare-otahuhu');
});
