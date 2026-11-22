// The shared store, against a small fake of Supabase's client. No network, no database.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, memoryBackend } from '../../architecture/js/store.js';
import { newProject, sampleProject, SAMPLE_ID, recordApproval, askForApproval, markDone, activity, readBundle } from '../../architecture/js/model.js';
import { createCloudStore, createGateway, createSwitch, createTeam, moveProjects, probeShared, toRecord, fromRecord, dbId, explain, CloudError, NOT_ON } from '../../architecture/js/cloud.js';
import { fakeSupabase, PGRST106, JWT_EXPIRED } from './fake-supabase.mjs';

const T0 = '2026-11-22T00:00:00.000Z';
const PRACTICE = { id: '11111111-1111-4111-8111-111111111111', name: 'Tui Architects', role: 'member' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const LAT = -36.80123, LON = 175.08456; // a made-up point, to check it never leaks

function setup({ role = 'member', ...rest } = {}) {
  const fake = fakeSupabase(), local = createStore(memoryBackend()), trouble = [];
  const cloud = createCloudStore({ client: fake, practice: { ...PRACTICE, role }, local, onTrouble: (c) => trouble.push(c), ...rest });
  return { fake, local, cloud, trouble };
}
const says = (re, code) => (e) => { assert.ok(e instanceof CloudError, `a CloudError, got ${e}`); assert.match(e.message, re); if (code) assert.equal(e.code, code); return true; };

// ---- ids and shapes -------------------------------------------------------------------------------------------------
test('ids: a page id becomes a database uuid, the same one every time', () => {
  const u = '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b';
  assert.equal(dbId(`t_${u}`), u);
  assert.equal(dbId(`p_${u}`), u);
  assert.equal(dbId(u.toUpperCase()), u);
  const odd = dbId('lf8x2k-ab12cd34-ef56gh78'); // an id made without crypto.randomUUID
  assert.match(odd, UUID);
  assert.equal(dbId('lf8x2k-ab12cd34-ef56gh78'), odd);
  assert.notEqual(dbId('lf8x2k-ab12cd34-ef56gh79'), odd);
  assert.throws(() => dbId(''), /needs an id/);
});

test('a project maps to flat columns and back: site, model, stage name, and fields the database does not know', () => {
  const b = newProject({ name: 'House on the ridge', client: 'M. Ngata', now: T0 });
  const p = { ...b.project, stage: 'contract', site: { lat: LAT, lon: LON, facts: [{ id: 'site.zone', label: 'Zone', value: 'Rural' }], fetched_at: T0, basis: 'typed' },
    model: { fingerprint: '99eea08ce8e9', drawings: 'Draft set', revision: 'A', file_name: 'house.plan.json', handover: { to: '3d' } }, colour: 'plum', sample: false };
  const rec = toRecord('project', p, { practice_id: PRACTICE.id });
  assert.match(rec.id, UUID);
  assert.equal(rec.practice_id, PRACTICE.id);
  assert.equal(rec.stage, 'contract_admin', 'the table calls stage five contract_admin');
  assert.deepEqual([rec.site_lat, rec.site_lon, rec.site_fetched_at], [LAT, LON, T0]);
  assert.deepEqual(rec.site_facts, p.site.facts);
  assert.deepEqual([rec.model_fingerprint, rec.model_drawings, rec.model_revision, rec.model_file_name], ['99eea08ce8e9', 'Draft set', 'A', 'house.plan.json']);
  assert.deepEqual(rec.extra, { colour: 'plum', site: { basis: 'typed' }, model: { handover: { to: '3d' } } }, 'unknown fields ride in extra; "sample" is never sent');
  assert.ok(!('site' in rec) && !('model' in rec) && !('sample' in rec));
  const back = fromRecord('project', JSON.parse(JSON.stringify(rec)));
  const { sample, ...want } = p;
  assert.deepEqual(back, { ...want, id: rec.id });
  // nothing known yet: empty text is null in the table and '' again on the page
  const blank = toRecord('project', b.project, { practice_id: PRACTICE.id });
  assert.deepEqual([blank.site_lat, blank.site_lon, blank.site_fetched_at, blank.model_fingerprint, blank.model_drawings], [null, null, null, null, null]);
  assert.deepEqual(blank.site_facts, []);
  assert.deepEqual(fromRecord('project', blank).model, { fingerprint: '', drawings: '', revision: '', file_name: '' });
  assert.deepEqual(fromRecord('project', { ...blank, site_facts: {} }).site.facts, [], 'the table’s own default, {}, reads as no facts');
});

test('every kind of row survives the trip to the table and back', () => {
  const pid = 'p_3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b', P = dbId(pid), id = (x) => `${x}_aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee${x.length}`;
  const source = { name: 'Auckland Council checklist', clause: '4.2', url: 'https://example.org/c', read_on: '2026-11-20' };
  const rows = {
    task: { id: id('t'), project_id: pid, stage: 'contract', title: 'Set up the register', owner: '', status: 'doing', due: '2026-12-01', note: '', source, edited: true, colour: 'x' },
    document: { id: id('d'), project_id: pid, stage: 'detailed', title: 'Drawings', kind: 'Drawing', version: 'B', date: '', source: 'Shared drive', note: '', file_id: 'f1' },
    approval: { id: id('a'), project_id: pid, stage: 'concept', who: 'Mere Ngata', role: 'Owner or client', what: 'Closes Concept design. The concept shown is accepted to develop.', note: '', at: '2026-11-22T03:04:05.678Z', fingerprint: '99eea08ce8e9' },
    rfi: { id: id('r'), project_id: pid, received_at: '2026-11-20', from: 'Council', question: 'What is the cladding?', response: '', status: 'open', sent_at: '' },
    observation: { id: id('o'), project_id: pid, date: '2026-11-21', by: 'Kate', note: 'Piles in.' },
    variation: { id: id('x'), project_id: pid, title: 'Deck wider', status: 'raised', note: '' },
    defect: { id: id('f'), project_id: pid, title: 'Door sticks', status: 'open', note: 'Bedroom 2' },
    checklist_item: { id: id('c'), project_id: pid, stage: 'detailed', list: 'consent', title: 'Record of title', status: 'gathered', document_id: id('d'), note: '', source, edited: false },
    activity: { id: id('v'), project_id: pid, at: '2026-11-22T03:04:05.678Z', who: 'Kate', action: 'Added task', detail: '' },
  };
  for (const [kind, row] of Object.entries(rows)) {
    const rec = JSON.parse(JSON.stringify(toRecord(kind, row)));
    assert.match(rec.id, UUID, kind);
    assert.equal(rec.project_id, P, kind);
    const want = { ...row, id: dbId(row.id), project_id: P };
    if (kind === 'checklist_item') want.document_id = dbId(row.document_id);
    if (kind === 'task' || kind === 'checklist_item') want.edited ??= false;
    assert.deepEqual(fromRecord(kind, rec), want, kind);
  }
  // the flat column names and types the tables expect
  const t = toRecord('task', rows.task);
  assert.deepEqual([t.stage, t.owner, t.note, t.due, t.edited], ['contract_admin', null, null, '2026-12-01', true]);
  assert.deepEqual(t.source, source);
  assert.deepEqual(t.extra, { colour: 'x' });
  const r = toRecord('rfi', rows.rfi);
  assert.deepEqual([r.from_party, r.received_at, r.sent_at, r.response], ['Council', '2026-11-20T00:00:00Z', null, null]);
  assert.ok(!('from' in r));
  assert.equal(fromRecord('rfi', { ...r, received_at: '2026-11-20T00:00:00+00:00' }).received_at, '2026-11-20', 'a date reads back as the date, however the database writes midnight');
  assert.deepEqual(toRecord('document', rows.document).extra, { file_id: 'f1' });
  assert.equal(toRecord('checklist_item', { ...rows.checklist_item, document_id: '' }).document_id, null);
  // a stage has no id of its own in the table: project and key
  const s = toRecord('stage', { id: `${pid}:contract`, project_id: pid, key: 'contract', status: 'in_progress', started_at: T0, done_at: null });
  assert.deepEqual(s, { project_id: P, key: 'contract_admin', status: 'in_progress', started_at: T0, done_at: null, extra: {} });
  assert.deepEqual(fromRecord('stage', s), { id: `${P}:contract`, project_id: P, key: 'contract', status: 'in_progress', started_at: T0, done_at: null });
  assert.throws(() => toRecord('invoice', { id: 'x' }), /Unknown kind/);
});

test('a value that does not fit its column is kept in extra and comes back as it was; the database’s own columns are never sent', () => {
  const row = { id: 'd_aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', project_id: 'p_aaaaaaaa-bbbb-4ccc-8ddd-ffffffffffff', stage: 'concept', title: 'Brief', kind: '', version: '', date: 'early 2027', source: { name: 'NZIA', url: 'https://example.org' }, note: '',
    user_id: 'forged', recorded_at: 'forged', seq: 1, practice_id: 'forged' };
  const rec = toRecord('document', row);
  assert.deepEqual([rec.date, rec.source], [null, null]);
  assert.deepEqual(rec.extra, { date: 'early 2027', source: { name: 'NZIA', url: 'https://example.org' } });
  for (const k of ['user_id', 'recorded_at', 'seq', 'practice_id']) assert.ok(!(k in rec), k);
  const back = fromRecord('document', rec);
  assert.equal(back.date, 'early 2027');
  assert.deepEqual(back.source, { name: 'NZIA', url: 'https://example.org' });
  const odd = fromRecord('task', toRecord('task', { id: row.id, project_id: row.project_id, title: 'T', status: 'todo', edited: 'yes' }));
  assert.equal(odd.edited, 'yes');
});

test('errors are put in plain words, and the database’s own text is never passed on', () => {
  assert.equal(explain(PGRST106).message, NOT_ON);
  assert.equal(explain(PGRST106).code, 'not_switched_on');
  assert.equal(NOT_ON, 'Shared records are not switched on yet.');
  assert.equal(explain(JWT_EXPIRED).code, 'signed_out');
  assert.equal(explain({ code: 'PGRST301', message: 'JWT expired' }).code, 'signed_out');
  assert.equal(explain({ code: '42501', message: 'new row violates row-level security policy for table "task"' }).code, 'refused');
  assert.equal(explain({ message: 'TypeError: Failed to fetch' }).code, 'offline');
  assert.equal(explain({ code: 'PGRST205', message: "Could not find the table 'arch.checklist_item' in the schema cache" }).code, 'out_of_date');
  assert.match(explain({ code: '23514', message: 'A practice must keep at least one owner. Make someone else an owner first.' }).message, /at least one owner/);
  // a check failure quotes the failing row, site point and all: none of it may reach the page
  const leaky = { code: '23514', message: `new row for relation "project" violates check constraint`, details: `Failing row contains (House, ${LAT}, ${LON}, M. Ngata).`, hint: `${LAT}` };
  for (const e of [leaky, { code: '22P02', message: `invalid input syntax for type double precision: "${LAT}"` }, { code: 'XX000', message: `boom ${LAT} M. Ngata` }, { code: `${LAT}`, message: 'x' }]) {
    const said = explain(e);
    assert.ok(!/36\.8|175\.0|Ngata|House/.test(said.message), said.message);
    assert.ok(!('details' in said) && !said.cause);
  }
});

// ---- the store --------------------------------------------------------------------------------------------------------
test('save, get, list and remove one row in the shared store', async () => {
  const { cloud, fake } = setup();
  const b = newProject({ name: 'House', now: T0 });
  await cloud.saveProject(b);
  const pid = dbId(b.project.id);
  const row = { id: 't_3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b', project_id: b.project.id, stage: 'predesign', title: 'Meet the neighbours', owner: 'Kate', status: 'todo', due: '', note: '' };
  const saved = await cloud.save('task', row);
  assert.equal(saved.id, '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b', 'the id is a database uuid');
  assert.equal(saved.project_id, pid);
  assert.equal((await cloud.get('task', row.id)).title, 'Meet the neighbours', 'the page’s own id still finds it');
  assert.equal((await cloud.get('task', saved.id)).owner, 'Kate');
  assert.equal(await cloud.get('task', 't_00000000-0000-4000-8000-000000000000'), null);
  assert.equal((await cloud.list('task', { project_id: b.project.id })).length, b.tasks.length + 1);
  assert.equal((await cloud.list('task', { project_id: b.project.id, stage: 'predesign' })).length, b.tasks.filter((t) => t.stage === 'predesign').length + 1);
  await cloud.save('task', { ...row, status: 'done' });
  assert.equal((await cloud.get('task', row.id)).status, 'done', 'saving again replaces the row');
  assert.equal(fake.db.task.filter((t) => t.id === saved.id).length, 1);
  assert.equal(await cloud.remove('task', row.id), true);
  assert.equal(await cloud.remove('task', row.id), false);
  await assert.rejects(cloud.list('invoice'), /Unknown kind/);
  await assert.rejects(cloud.save('task', { title: 'no id' }), /needs an id/);
  assert.equal(cloud.persistent, true);
});

test('a whole project goes up and comes back the same, in the order it was written', async () => {
  const { cloud, fake } = setup();
  const b = newProject({ name: 'House on the ridge', client: 'M. Ngata', now: T0 });
  b.project.site = { lat: LAT, lon: LON, facts: [{ id: 'site.zone', value: 'Rural' }], fetched_at: T0 };
  b.documents.push({ id: 'd_aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', project_id: b.project.id, stage: 'predesign', title: 'Brief', kind: 'Brief', version: '1', date: '2026-11-01', source: '', note: '' });
  b.checklist[0].document_id = 'd_aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
  b.activity.push(activity(b.project.id, 'Kate', 'Project created', b.project.name, T0));
  const id = await cloud.saveProject(b);
  assert.equal(id, dbId(b.project.id));
  assert.equal(fake.db.project.length, 1);
  assert.equal(fake.db.project[0].practice_id, PRACTICE.id);
  assert.equal(fake.db.stage.length, 7);
  const back = await cloud.loadProject(b.project.id);
  assert.equal(back.project.id, id);
  assert.equal(back.project.name, 'House on the ridge');
  assert.deepEqual(back.project.site, b.project.site);
  assert.deepEqual(back.stages.map((s) => [s.key, s.status]), b.stages.map((s) => [s.key, s.status]));
  assert.equal(back.stages[4].key, 'contract');
  assert.equal(back.stages[0].id, `${id}:predesign`);
  assert.deepEqual(back.tasks.map((t) => t.title), b.tasks.map((t) => t.title), 'tasks read back in the order they were written');
  assert.deepEqual(back.checklist.map((c) => c.title), b.checklist.map((c) => c.title));
  assert.equal(back.checklist[0].document_id, 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');
  assert.equal(back.activity.length, 1);
  for (const list of ['tasks', 'documents', 'checklist', 'activity']) for (const r of back[list]) { assert.match(r.id, UUID); assert.equal(r.project_id, id); }
  assert.equal(await cloud.loadProject('p_00000000-0000-4000-8000-000000000000'), null);
  // the rules still run on what came back: approve and close the first stage
  askForApproval(back, 'predesign', T0);
  recordApproval(back, 'predesign', { who: 'Mere Ngata', role: 'Owner or client' }, T0);
  markDone(back, 'predesign', T0);
  await cloud.saveProject(back);
  const after = await cloud.loadProject(id);
  assert.deepEqual(after.stages.slice(0, 2).map((s) => s.status), ['done', 'in_progress']);
  assert.equal(after.project.stage, 'concept');
  assert.equal(after.approvals.length, 1);
  // every list the page reads at once
  assert.equal((await cloud.list('project')).length, 1);
  assert.equal((await cloud.list('stage')).length, 7);
});

test('saving a project writes only what changed, and never removes a colleague’s row it had not seen', async () => {
  const { cloud, fake } = setup();
  const b = newProject({ name: 'House', now: T0 });
  await cloud.saveProject(b);
  const mine = await cloud.loadProject(b.project.id);
  // meanwhile a colleague adds a task and edits another, straight into the shared records
  fake.db.task.push({ id: '99999999-9999-4999-8999-999999999999', project_id: mine.project.id, stage: 'predesign', title: 'Colleague’s task', owner: null, status: 'todo', due: null, note: null, source: null, edited: false, extra: {}, seq: 9999 });
  fake.db.task.find((t) => t.id === mine.tasks[1].id).note = 'colleague wrote this';
  // I change one task, remove another, and save the whole project
  mine.tasks[0].status = 'done';
  const removed = mine.tasks.splice(2, 1)[0];
  fake.log.length = 0;
  await cloud.saveProject(mine);
  const writes = fake.writes();
  assert.deepEqual(writes.map((w) => `${w.action} ${w.table} ${w.rows.length || w.filters[0][2].length}`), ['upsert task 1', 'delete task 1'], 'one changed row written, one removed row deleted, nothing else');
  assert.equal(fake.db.task.find((t) => t.id === mine.tasks[0].id).status, 'done');
  assert.ok(!fake.db.task.some((t) => t.id === removed.id));
  assert.ok(fake.db.task.some((t) => t.title === 'Colleague’s task'), 'the colleague’s new task is still there');
  assert.equal(fake.db.task.find((t) => t.id === mine.tasks[1].id).note, 'colleague wrote this', 'a row I did not change is not written over');
  // saving the same bundle again writes nothing at all
  fake.log.length = 0;
  await cloud.saveProject(mine);
  assert.equal(fake.writes().length, 0);
});

test('approvals and activity can only be added in the shared store', async () => {
  const { cloud, fake } = setup();
  const b = newProject({ name: 'House', now: T0 });
  askForApproval(b, 'predesign', T0);
  const a = recordApproval(b, 'predesign', { who: 'Mere Ngata', role: 'Owner or client' }, T0);
  await cloud.saveProject(b);
  await assert.rejects(cloud.remove('approval', a.id), says(/permanent record/, 'append_only'));
  await assert.rejects(cloud.save('approval', { ...a, who: 'Someone Else' }), says(/cannot be changed/, 'append_only'));
  const v = await cloud.save('activity', activity(b.project.id, 'Kate', 'Asked for approval', 'Predesign', T0));
  await assert.rejects(cloud.remove('activity', v.id), says(/permanent record/));
  const loaded = await cloud.loadProject(b.project.id);
  loaded.approvals[0].who = 'Someone Else';
  fake.log.length = 0;
  await assert.rejects(cloud.saveProject(loaded), says(/cannot be changed\. Nothing was saved/, 'append_only'));
  assert.equal(fake.writes().length, 0, 'nothing at all is written when part of the bundle cannot be');
  assert.equal(fake.db.approval[0].who, 'Mere Ngata');
  // an approval dropped from the bundle stays on the record
  const again = await cloud.loadProject(b.project.id);
  again.approvals = [];
  await cloud.saveProject(again);
  assert.equal(fake.db.approval.length, 1);
  // a stage marked done with no approval is refused by the database, in plain words
  const c = newProject({ name: 'Second', now: T0 });
  c.stages[0].status = 'done';
  await assert.rejects(cloud.saveProject(c), says(/cannot be marked done until an approval.*Part of this project may already be saved/));
});

test('a project with approvals or activity is kept; only an owner can remove an empty one', async () => {
  const { cloud } = setup({ role: 'owner' });
  const b = newProject({ name: 'House', now: T0 });
  b.activity.push(activity(b.project.id, 'Kate', 'Project created', 'House', T0));
  await cloud.saveProject(b);
  await assert.rejects(cloud.removeProject(b.project.id), says(/so the record is kept\. Nothing was removed/, 'kept'));
  assert.ok(await cloud.get('project', b.project.id));
  const c = newProject({ name: 'Made by mistake', now: T0 });
  await cloud.saveProject(c);
  assert.equal(await cloud.removeProject(c.project.id), true);
  assert.equal(await cloud.get('project', c.project.id), null);
  assert.equal((await cloud.list('task', { project_id: c.project.id })).length, 0);
  const member = setup();
  const d = newProject({ name: 'Member’s', now: T0 });
  await member.cloud.saveProject(d);
  await assert.rejects(member.cloud.removeProject(d.project.id), says(/Only an owner/));
});

test('the Sample stays in the browser and is never uploaded', async () => {
  const { cloud, local, fake } = setup();
  await cloud.saveProject(sampleProject(T0));
  assert.equal(fake.writes().length, 0, 'nothing was sent');
  assert.ok(await local.get('project', SAMPLE_ID));
  const b = newProject({ name: 'Real project', now: T0 });
  await cloud.saveProject(b);
  const projects = await cloud.list('project');
  assert.deepEqual(projects.map((p) => p.name).sort(), ['A house on Waiheke Island', 'Real project']);
  assert.equal(projects.find((p) => p.id === SAMPLE_ID).sample, true);
  assert.equal((await cloud.list('stage')).length, 14, 'both projects’ stages, for the projects screen');
  // working on the Sample while signed in still only touches the browser
  fake.log.length = 0;
  const s = await cloud.loadProject(SAMPLE_ID);
  assert.equal(s.project.sample, true);
  const t = s.tasks[0];
  await cloud.save('task', { ...t, status: 'done' });
  await cloud.save('activity', activity(SAMPLE_ID, 'Kate', 'Task done', t.title, T0));
  const p = await cloud.get('project', SAMPLE_ID); p.site = { lat: LAT, lon: LON, facts: [], fetched_at: T0 };
  await cloud.save('project', p);
  assert.equal(await cloud.remove('task', s.tasks[1].id), true);
  assert.equal((await cloud.get('task', t.id)).status, 'done');
  assert.equal(fake.log.length, 0, 'not one request, read or write, was made for the Sample');
  assert.equal((await local.get('task', t.id)).status, 'done');
  assert.ok(!fake.db.project.some((r) => r.name.includes('Waiheke')));
  // an exported sample that is imported while signed in also stays in the browser
  const text = (await cloud.exportProject(SAMPLE_ID, T0)).text;
  fake.log.length = 0;
  const got = await cloud.importProject(text, T0);
  assert.equal(got.copied, true);
  assert.equal(fake.writes().length, 0);
  await cloud.removeProject(SAMPLE_ID);
  assert.equal(await local.get('project', SAMPLE_ID), null);
  // settings are this browser's own
  await cloud.save('setting', { id: 'me', value: 'Kate' });
  assert.equal((await local.get('setting', 'me')).value, 'Kate');
  assert.equal((await cloud.get('setting', 'me')).value, 'Kate');
});

// ---- when the shared records cannot be used -----------------------------------------------------------------------------
test('“not switched on yet”: the API’s PGRST106 answer is said in plain words and nothing is claimed saved', async () => {
  const { cloud, fake, trouble } = setup();
  fake.fail = () => ({ ...PGRST106, status: 406 });
  const b = newProject({ name: 'House', now: T0 });
  await assert.rejects(cloud.saveProject(b), says(/^Shared records are not switched on yet\. Nothing was saved\.$/, 'not_switched_on'));
  await assert.rejects(cloud.list('project'), says(/^Shared records are not switched on yet\.$/, 'not_switched_on'));
  await assert.rejects(cloud.save('task', b.tasks[0]), says(/not switched on yet\. Nothing was saved\./));
  assert.ok(trouble.includes('not_switched_on'), 'the page is told, so it can go back to the browser store');
  assert.equal(await probeShared(createGateway(fake)), 'not_switched_on');
  fake.fail = () => ({ code: '42501', message: 'permission denied for schema arch', status: 401 }); // switched on, not signed in
  assert.equal(await probeShared(createGateway(fake)), 'ready');
  fake.fail = () => { throw new TypeError('Failed to fetch'); };
  assert.equal(await probeShared(createGateway(fake)), 'unreachable');
  fake.fail = null;
  assert.equal(await probeShared(createGateway(fake)), 'ready');
});

test('an expired sign-in is renewed once and the call made again; if it cannot be renewed the person is told', async () => {
  let renewals = 0, expired = true;
  const a = setup({ refresh: async () => { renewals++; expired = false; return true; } });
  a.fake.fail = () => (expired ? { ...JWT_EXPIRED, status: 401 } : null);
  const b = newProject({ name: 'House', now: T0 });
  await a.cloud.saveProject(b);
  assert.equal(renewals, 1);
  assert.equal(a.fake.db.project.length, 1, 'saved after the sign-in was renewed');
  assert.deepEqual(a.trouble, []);

  const c = setup({ refresh: async () => false });
  c.fake.fail = () => ({ ...JWT_EXPIRED, status: 401 });
  await assert.rejects(c.cloud.saveProject(b), says(/^Your sign-in has expired\. Sign in again\. Nothing was saved\.$/, 'signed_out'));
  await assert.rejects(c.cloud.loadProject(b.project.id), says(/sign-in has expired/, 'signed_out'));
  assert.ok(c.trouble.includes('signed_out'));
  assert.equal(c.fake.db.project, undefined, 'nothing reached the shared records');
  const d = setup(); // no way to renew at all
  d.fake.fail = () => ({ code: 'PGRST301', message: 'JWT expired', status: 401 });
  await assert.rejects(d.cloud.save('task', b.tasks[0]), says(/sign-in has expired.*Nothing was saved/, 'signed_out'));
});

test('a viewer’s write is refused: by the page before it is sent, and by the database regardless', async () => {
  const v = setup({ role: 'viewer' });
  const b = newProject({ name: 'House', now: T0 });
  await assert.rejects(v.cloud.saveProject(b), says(/You are a viewer in Tui Architects: you can read everything and change nothing\. Nothing was changed\./, 'read_only'));
  await assert.rejects(v.cloud.save('task', b.tasks[0]), says(/viewer/, 'read_only'));
  await assert.rejects(v.cloud.remove('task', b.tasks[0].id), says(/viewer/, 'read_only'));
  await assert.rejects(v.cloud.save('activity', activity(b.project.id, 'V', 'Project exported', '', T0)), says(/viewers cannot add to the activity log, so this was not logged/, 'read_only'));
  await assert.rejects(v.cloud.importProject(JSON.stringify({ type: 'assembl.architecture-project.v1', project: b.project, stages: b.stages }), T0), says(/viewer/));
  await assert.rejects(v.cloud.putFile({ project_id: b.project.id, name: 'a.pdf', blob: new Blob(['x']) }), says(/viewer/));
  assert.equal(v.fake.writes().length, 0, 'nothing was sent');
  assert.deepEqual(await v.cloud.list('project'), [], 'reading is fine');
  // the page thinks this person is a member (their role changed since they opened it): the database still says no
  const s = setup({ role: 'member' });
  await s.cloud.saveProject(b);
  s.fake.viewer = true;
  await assert.rejects(s.cloud.save('task', { ...b.tasks[0], status: 'done' }), says(/^The shared records refused that: your role in the practice does not allow it\. Nothing was saved\.$/, 'refused'));
  await assert.rejects(s.cloud.saveProject(newProject({ name: 'Another', now: T0 })), says(/refused that.*Nothing was saved/, 'refused'));
  assert.equal(await s.cloud.remove('task', b.tasks[0].id), false, 'a delete the database ignores is reported as not removed');
  assert.equal(s.fake.db.task.find((t) => t.id === dbId(b.tasks[0].id)).status, 'todo');
  assert.equal(s.fake.db.project.length, 1);
});

test('when the network drops, the page is told plainly and nothing is claimed', async () => {
  const { cloud, fake } = setup();
  const b = newProject({ name: 'House', now: T0 });
  await cloud.saveProject(b);
  fake.fail = () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(cloud.save('task', { ...b.tasks[0], status: 'done' }), says(/^The shared records could not be reached just now\. Nothing was saved\.$/, 'offline'));
  await assert.rejects(cloud.loadProject(b.project.id), says(/could not be reached/, 'offline'));
  // a save that fails part-way says so, rather than "nothing was saved"
  const c = newProject({ name: 'Half', now: T0 });
  fake.fail = (op) => (op.table === 'task' ? { message: 'TypeError: Failed to fetch' } : null);
  await assert.rejects(cloud.saveProject(c), says(/could not be reached just now\. Part of this project may already be saved: open it again/, 'offline'));
});

test('lists longer than the API’s 1000-row limit are read in full', async () => {
  const { cloud, fake } = setup();
  const b = newProject({ name: 'Long job', now: T0 });
  for (let i = 0; i < 2300; i++) b.activity.push({ ...activity(b.project.id, 'Kate', 'Changed task', `n${i}`, new Date(Date.parse(T0) + i * 1000)), id: `v_${crypto.randomUUID()}` });
  await cloud.saveProject(b);
  assert.equal(fake.db.activity.length, 2300);
  const back = await cloud.loadProject(b.project.id);
  assert.equal(back.activity.length, 2300);
  assert.equal(back.activity[0].detail, 'n2299', 'newest first, as the browser store gives it');
});

// ---- the real client, with the network replaced: what actually goes in an address -----------------------------------------
test('with Supabase’s own client: the site point never appears in an address, and the real “not switched on” answer is understood', async () => {
  const { createClient } = await import('../../architecture/vendor/supabase-js.mjs');
  const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SCHEMA } = await import('../../architecture/js/config.js');
  const seen = []; let mode = 'ok';
  const fetchFake = async (url, init = {}) => {
    const headers = Object.fromEntries(new Headers(init.headers).entries());
    seen.push({ url: String(url), method: init.method ?? 'GET', headers, body: typeof init.body === 'string' ? init.body : '' });
    if (mode === 'off') return new Response(JSON.stringify(PGRST106), { status: 406, headers: { 'content-type': 'application/json' } });
    const echo = /return=representation/.test(headers.prefer ?? '') && init.body ? init.body : '[]';
    return new Response(init.method === 'POST' ? (echo.startsWith('[') ? echo : `[${echo}]`) : '[]', { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: fetchFake } });
  const local = createStore(memoryBackend());
  const cloud = createCloudStore({ client, practice: PRACTICE, local, schema: SCHEMA });
  const b = newProject({ name: 'House on the ridge', client: 'M. Ngata', now: T0, id: 'p_aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' }); // a fixed id, so the addresses checked below are the same every run
  b.project.site = { lat: LAT, lon: LON, facts: [{ id: 'site.zone', value: 'Rural' }], fetched_at: T0 };
  b.activity.push(activity(b.project.id, 'Kate', 'Site facts saved', '14 facts answered', T0));
  await cloud.saveProject(b);
  await cloud.save('project', b.project);
  await cloud.get('project', b.project.id);
  await cloud.list('project');
  await cloud.list('task', { project_id: b.project.id });
  assert.ok(seen.length >= 8);
  for (const r of seen) {
    assert.ok(r.url.startsWith(`${SUPABASE_URL}/rest/v1/`), r.url);
    assert.ok(!/36\.8|175\.0|80123|08456|Ngata|ridge/i.test(decodeURIComponent(r.url)), `nothing private in the address: ${r.url}`);
    assert.equal(r.headers['accept-profile'] ?? r.headers['content-profile'], 'arch', 'every request names the arch schema');
    assert.equal(r.headers.apikey, SUPABASE_PUBLISHABLE_KEY);
    assert.ok(!Object.values(r.headers).some((h) => /36\.8|175\.0/.test(h)));
  }
  const sent = seen.find((r) => r.method === 'POST' && /\/project\?/.test(r.url));
  assert.deepEqual([JSON.parse(sent.body).site_lat, JSON.parse(sent.body).site_lon], [LAT, LON], 'the point travels in the body of the request only');
  assert.match(SUPABASE_PUBLISHABLE_KEY, /^sb_publishable_/, 'only the publishable key is in the page');
  mode = 'off';
  await assert.rejects(cloud.saveProject(newProject({ name: 'Another', now: T0 })), says(/^Shared records are not switched on yet\. Nothing was saved\.$/, 'not_switched_on'));
  assert.equal(await probeShared(createGateway(client, { schema: SCHEMA })), 'not_switched_on');
});

// ---- moving this browser's projects up ------------------------------------------------------------------------------------
test('move: chosen browser projects are copied up, the browser copy is left alone, and the report is read back', async () => {
  const { cloud, local, fake } = setup();
  const a = newProject({ name: 'House A', client: 'A', now: T0 }), b = newProject({ name: 'House B', now: T0 }), c = newProject({ name: 'Stays here', now: T0 });
  askForApproval(a, 'predesign', T0); recordApproval(a, 'predesign', { who: 'Mere Ngata', role: 'Owner or client' }, T0); markDone(a, 'predesign', T0);
  a.activity.push(activity(a.project.id, 'Kate', 'Stage done', 'Predesign', T0));
  for (const x of [a, b, c, sampleProject(T0)]) await local.saveProject(x);
  const before = JSON.stringify(await local.loadProject(a.project.id));
  const report = await moveProjects({ local, cloud, ids: [a.project.id, b.project.id, SAMPLE_ID, 'p_missing'], now: T0 });
  assert.deepEqual(report.map((r) => r.outcome), ['copied', 'copied', 'skipped', 'failed']);
  assert.deepEqual(report[0].counts, { stages: 7, tasks: a.tasks.length, documents: 0, approvals: 1, rfis: 0, observations: 0, variations: 0, defects: 0, checklist: a.checklist.length, activity: 1, files: 0 });
  assert.match(report[2].reason, /Sample stays in this browser/);
  assert.deepEqual(fake.db.project.map((p) => p.name).sort(), ['House A', 'House B'], 'only the chosen projects went up');
  assert.equal(JSON.stringify(await local.loadProject(a.project.id)), before, 'the browser copy is exactly as it was');
  assert.equal((await local.list('project')).length, 4);
  const up = await cloud.loadProject(a.project.id);
  assert.deepEqual(up.stages.slice(0, 2).map((s) => s.status), ['done', 'in_progress']);
  assert.equal(up.approvals[0].who, 'Mere Ngata');
  assert.equal(up.approvals[0].brought_in.from, 'browser', 'an approval recorded without sign-in says so once it is shared');
  assert.equal(up.activity[0].brought_in.from, 'browser');
  // asking again does not copy over the shared project (a colleague may have changed it since)
  fake.db.project.find((p) => p.name === 'House A').client = 'changed by a colleague';
  const again = await moveProjects({ local, cloud, ids: [a.project.id], now: T0 });
  assert.equal(again[0].outcome, 'already');
  assert.equal(fake.db.project.find((p) => p.name === 'House A').client, 'changed by a colleague');
  assert.equal((await local.get('setting', 'moved')).value[a.project.id].state, 'copied');
});

test('move: a copy that fails says why, claims nothing, and can be tried again', async () => {
  const { cloud, local, fake } = setup();
  const a = newProject({ name: 'House A', now: T0 }), b = newProject({ name: 'House B', now: T0 });
  await local.saveProject(a); await local.saveProject(b);
  fake.fail = (op) => (op.table === 'checklist_item' && op.action === 'upsert' ? { message: 'TypeError: Failed to fetch' } : null);
  const report = await moveProjects({ local, cloud, ids: [a.project.id, b.project.id], now: T0 });
  assert.equal(report.length, 1, 'it stops at the first failure when the shared records cannot be reached');
  assert.equal(report[0].outcome, 'failed');
  assert.match(report[0].reason, /could not be reached just now\. Part of this project may already be saved/);
  fake.fail = null;
  const retry = await moveProjects({ local, cloud, ids: [a.project.id, b.project.id], now: T0 });
  assert.deepEqual(retry.map((r) => r.outcome), ['copied', 'copied']);
  assert.equal(fake.db.checklist_item.length, a.checklist.length + b.checklist.length);
  assert.equal(fake.db.task.length, a.tasks.length + b.tasks.length, 'no row is doubled by the second try');
  const viewer = createCloudStore({ client: fake, practice: { ...PRACTICE, role: 'viewer' }, local });
  const c = newProject({ name: 'House C', now: T0 }); await local.saveProject(c);
  assert.match((await moveProjects({ local, cloud: viewer, ids: [c.project.id] }))[0].reason, /viewer/);
});

// ---- files ---------------------------------------------------------------------------------------------------------------
test('files: kept in the practice’s private folder, found again, listed and removed', async () => {
  const { cloud, fake } = setup();
  const b = newProject({ name: 'House', now: T0 });
  await cloud.saveProject(b);
  const pid = dbId(b.project.id), blob = new Blob(['%PDF-1.7 plans'], { type: 'application/pdf' });
  const f = await cloud.putFile({ project_id: b.project.id, name: 'Ridge house consent plans.pdf', blob, checksum: 'abc' });
  assert.match(f.id, UUID);
  assert.deepEqual({ ...f, id: '', created_at: '' }, { checksum: 'abc', id: '', project_id: pid, document_id: '', name: 'Ridge house consent plans.pdf', type: 'application/pdf', size: blob.size, created_at: '' });
  const [path] = [...fake.files.keys()];
  assert.equal(path, `arch-files/${PRACTICE.id}/${pid}/${f.id}`, 'the path begins with the practice id and is made of ids only');
  assert.ok(!/Ridge|consent|plans|pdf/i.test(path), 'the file’s own name is not in the path');
  assert.equal(fake.db.file[0].storage_path, `${PRACTICE.id}/${pid}/${f.id}`);
  const got = await cloud.getFile(f.id);
  assert.equal(await got.blob.text(), '%PDF-1.7 plans');
  assert.equal(got.name, 'Ridge house consent plans.pdf');
  const g2 = await cloud.putFile(new Blob(['note']), { name: 'note.txt', type: 'text/plain' }); // the other order, and no project
  assert.equal(fake.db.file[1].storage_path, `${PRACTICE.id}/practice/${g2.id}`);
  assert.deepEqual((await cloud.listFiles({ project_id: b.project.id })).map((x) => x.name), ['Ridge house consent plans.pdf']);
  assert.equal((await cloud.listFiles()).length, 2);
  assert.equal(await cloud.getFile('f_00000000-0000-4000-8000-000000000000'), null);
  assert.equal(await cloud.removeFile(f.id), true);
  assert.equal(await cloud.removeFile(f.id), false);
  assert.equal(fake.files.size, 1);
  await assert.rejects(cloud.putFile({ name: 'none.pdf' }), /Choose a file/);
  await assert.rejects(cloud.putFile({ name: 'big.bin', blob: { size: 1 } }), /Choose a file/);
  const big = new Blob(['x']); Object.defineProperty(big, 'size', { value: 60 * 1024 * 1024 });
  await assert.rejects(cloud.putFile({ name: 'big.bin', blob: big }), says(/over 50 MB.*not kept/));
});

test('files: a refusal is said plainly, and bytes are not left behind when the record is refused', async () => {
  const { cloud, fake } = setup();
  fake.viewer = true; // the database's view, whatever the page believes
  await assert.rejects(cloud.putFile({ name: 'a.pdf', blob: new Blob(['x']) }), says(/refused that file: your role in the practice does not allow it\. The file was not kept\./, 'refused'));
  assert.equal(fake.files.size, 0);
  fake.viewer = false;
  fake.fail = (op) => (op.table === 'file' && op.action === 'insert' ? { code: '42501', message: 'new row violates row-level security policy for table "file"' } : null);
  await assert.rejects(cloud.putFile({ name: 'a.pdf', blob: new Blob(['x']) }), says(/The file was not kept/, 'refused'));
  assert.equal(fake.files.size, 0, 'the uploaded bytes were removed again');
  fake.fail = (op) => (op.action === 'upload' ? { message: 'Bucket not found', statusCode: '404' } : null);
  await assert.rejects(cloud.putFile({ name: 'a.pdf', blob: new Blob(['x']) }), says(/Keeping files in the shared records is not switched on yet/));
});

// ---- people ----------------------------------------------------------------------------------------------------------------
test('team: practices, invitations and roles go through the database, and its refusals are passed on in plain words', async () => {
  const me = '00000000-0000-4000-8000-00000000a11c';
  const fake = fakeSupabase({ userId: me, rpc: {
    my_invitations: () => [{ id: 'inv-1', practice_id: PRACTICE.id, practice_name: 'Tui Architects', role: 'member', created_at: T0 }],
    accept_invitation: ({ p_invitation }) => { if (p_invitation !== 'inv-1') throw { code: '42501', message: 'There is no open invitation for this account' }; return PRACTICE.id; },
    practice_people: ({ p_practice }) => [{ user_id: me, email: 'kate@example.org', name: 'Kate', role: 'owner', created_at: T0, p_practice }],
  } });
  const team = createTeam(createGateway(fake));
  assert.deepEqual(await team.myPractices(me), []);
  const made = await team.createPractice('  Tui Architects ');
  assert.equal(made.role, 'owner');
  assert.deepEqual(await team.myPractices(me), [{ id: made.id, role: 'owner', name: 'Tui Architects' }]);
  await assert.rejects(team.createPractice(' '), /Give the practice a name/);
  assert.equal((await team.myInvitations())[0].practice_name, 'Tui Architects');
  assert.equal(await team.acceptInvitation('inv-1'), PRACTICE.id);
  assert.deepEqual(fake.log.at(-1).args, { p_invitation: 'inv-1' }, 'only the invitation’s id is sent: the address comes from the sign-in');
  await assert.rejects(team.acceptInvitation('someone-elses'), says(/^There is no open invitation for this account\.$/, 'refused'));
  assert.equal((await team.people(made.id))[0].email, 'kate@example.org');
  const inv = await team.invite(made.id, '  Mere@Example.org ', 'viewer');
  assert.equal(inv.email, 'mere@example.org');
  assert.deepEqual(fake.db.invitation.map((i) => [i.practice_id, i.email, i.role]), [[made.id, 'mere@example.org', 'viewer']]);
  assert.equal((await team.invitations(made.id)).length, 1);
  await assert.rejects(team.invite(made.id, 'not an address', 'viewer'), /does not look like an email/);
  await assert.rejects(team.invite(made.id, 'a@b.nz', 'admin'), /Choose a role/);
  assert.equal(await team.cancelInvitation(inv.id), true);
  assert.equal((await team.setRole(made.id, me, 'owner')).role, 'owner');
  fake.fail = (op) => (op.table === 'practice_member' && op.action !== 'select' ? { code: '23514', message: 'A practice must keep at least one owner. Make someone else an owner first.' } : null);
  await assert.rejects(team.setRole(made.id, me, 'viewer'), says(/^A practice must keep at least one owner\. Make someone else an owner first\.$/));
  await assert.rejects(team.removePerson(made.id, me), says(/at least one owner/));
  fake.fail = null; fake.viewer = true; // the database ignores a non-owner's change
  await assert.rejects(team.setRole(made.id, me, 'viewer'), says(/only an owner can change roles\. Nothing was changed/, 'refused'));
  await assert.rejects(team.removePerson(made.id, 'someone'), says(/only an owner can remove someone else/, 'refused'));
});

// ---- one store for the page --------------------------------------------------------------------------------------------------
test('the page’s one store: the browser by default, the shared store when told, and back again', async () => {
  const { cloud, local, fake } = setup();
  const s = createSwitch(local);
  assert.equal(s.shared, false);
  const a = newProject({ name: 'In the browser', now: T0 });
  await s.saveProject(a);
  assert.equal(fake.log.length, 0);
  assert.equal((await s.list('project')).length, 1);
  await assert.rejects(s.putFile({ name: 'a.pdf', blob: new Blob(['x']) }), /Keeping files in this browser is not built yet/);
  s.use(cloud);
  assert.equal(s.shared, true);
  assert.deepEqual(await s.list('project'), [], 'a browser project is not shown as shared, and is not uploaded by signing in');
  const b = newProject({ name: 'Shared', now: T0 });
  await s.saveProject(b);
  assert.equal(fake.db.project.length, 1);
  assert.equal((await s.putFile({ name: 'a.pdf', blob: new Blob(['x']) })).name, 'a.pdf');
  s.use(null);
  assert.equal(s.shared, false);
  assert.deepEqual((await s.list('project')).map((p) => p.name), ['In the browser'], 'signed out: the browser store, exactly as before');
  assert.equal(s.persistent, true);
  // when the other storage functions arrive in the browser store, the same object passes them through
  local.listFiles = async () => [{ id: 'f1', name: 'kept in the browser.pdf' }];
  assert.equal((await s.listFiles())[0].name, 'kept in the browser.pdf');
});

test('export and import in the shared store: the file is the same format, and an import never writes over a project', async () => {
  const { cloud, fake } = setup();
  const b = newProject({ name: 'House', client: 'M. Ngata', now: T0 });
  askForApproval(b, 'predesign', T0); recordApproval(b, 'predesign', { who: 'Mere Ngata', role: 'Owner or client' }, T0);
  await cloud.saveProject(b);
  const f = await cloud.exportProject(b.project.id, new Date(2026, 10, 22, 9));
  assert.equal(f.file_name, 'house-project-2026-11-22.json');
  const file = readBundle(f.text);
  assert.equal(file.tasks.length, b.tasks.length);
  const got = await cloud.importProject(f.text, T0);
  assert.equal(got.copied, true);
  assert.match(got.project_id, UUID);
  assert.deepEqual(fake.db.project.map((p) => p.name).sort(), ['House', 'House (imported copy)']);
  assert.equal(fake.db.task.length, b.tasks.length * 2);
  assert.equal(fake.db.approval.find((a) => a.project_id === got.project_id).extra.brought_in.from, 'file');
  await assert.rejects(cloud.exportProject('p_00000000-0000-4000-8000-000000000000'), /not in the shared records/);
  await assert.rejects(cloud.importProject('{"type":"something else"}'), /not a project exported from this page/);
  // a file whose project id belongs to another practice (which this person cannot see) also comes in as a copy
  const other = newProject({ name: 'From elsewhere', now: T0 });
  let first = true;
  fake.fail = (op) => { if (op.table === 'project' && op.action === 'upsert' && first) { first = false; return { code: '42501', message: 'new row violates row-level security policy (USING expression) for table "project"' }; } return null; };
  const text = JSON.stringify({ type: 'assembl.architecture-project.v1', project: other.project, stages: other.stages, tasks: other.tasks, checklist: other.checklist });
  const again = await cloud.importProject(text, T0);
  assert.equal(again.copied, true);
  assert.ok(fake.db.project.some((p) => p.name === 'From elsewhere (imported copy)'));
});
