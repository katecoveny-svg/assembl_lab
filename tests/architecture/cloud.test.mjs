// The shared store, against a small fake of Supabase's client. No network, no database.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, memoryBackend, memoryFiles } from '../../architecture/js/store.js';
import { newProject, sampleProject, SAMPLE_ID, recordApproval, askForApproval, markDone, activity, readBundle, sourceRef, isEdited, missingSourced, consentRow, CONSENT_SOURCED, twinHandoff, twinLink } from '../../architecture/js/model.js';
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
    model: { fingerprint: '99eea08ce8e9', drawings: 'Draft set', revision: 'A', file_name: 'house.plan.json', file: { id: 'file_aaaaaaaa-bbbb-4ccc-8ddd-000000000001', name: 'house.plan.json', type: 'application/json', size: 16, kept_at: T0 }, handover: { to: '3d' } }, colour: 'plum', sample: false };
  const rec = toRecord('project', p, { practice_id: PRACTICE.id });
  assert.match(rec.id, UUID);
  assert.equal(rec.practice_id, PRACTICE.id);
  assert.equal(rec.stage, 'contract_admin', 'the table calls stage five contract_admin');
  assert.deepEqual([rec.site_lat, rec.site_lon, rec.site_fetched_at], [LAT, LON, T0]);
  assert.deepEqual(rec.site_facts, p.site.facts);
  assert.deepEqual([rec.model_fingerprint, rec.model_drawings, rec.model_revision, rec.model_file_name], ['99eea08ce8e9', 'Draft set', 'A', 'house.plan.json']);
  const note = { ...p.model.file, id: 'aaaaaaaa-bbbb-4ccc-8ddd-000000000001' };
  assert.deepEqual(rec.extra, { colour: 'plum', site: { basis: 'typed' }, model: { file: note, handover: { to: '3d' } } }, 'unknown fields ride in extra; "sample" is never sent; the kept model file’s note carries the file’s database id');
  assert.ok(!('site' in rec) && !('model' in rec) && !('sample' in rec));
  const back = fromRecord('project', JSON.parse(JSON.stringify(rec)));
  const { sample, ...want } = p;
  assert.deepEqual(back, { ...want, id: rec.id, model: { ...p.model, file: note } });
  // nothing known yet: empty text is null in the table and '' again on the page
  const blank = toRecord('project', b.project, { practice_id: PRACTICE.id });
  assert.deepEqual([blank.site_lat, blank.site_lon, blank.site_fetched_at, blank.model_fingerprint, blank.model_drawings], [null, null, null, null, null]);
  assert.deepEqual(blank.site_facts, []);
  assert.deepEqual(fromRecord('project', blank).model, { fingerprint: '', drawings: '', revision: '', file_name: '', file: null }, 'the same model shape as newProject gives (file: null when no file is kept)');
  assert.deepEqual(fromRecord('project', { ...blank, extra: {} }).model.file, null, 'a row with no model note still reads with file: null');
  assert.deepEqual(fromRecord('project', { ...blank, site_facts: {} }).site.facts, [], 'the table’s own default, {}, reads as no facts');
});

test('every kind of row survives the trip to the table and back', () => {
  const pid = 'p_3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b', P = dbId(pid), id = (x) => `${x}_aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee${x.length}`;
  // B's shapes (model.js): a sourced row carries source_ref and origin; "edited" is not stored on the row, it is worked out
  const source_ref = sourceRef('ac1011', 'title', '“General items”', 'Record of title no older than 90 days, with all consent notices and encumbrances');
  const taskRef = sourceRef('nzia', 'contract.2', '5. Contract administration', 'Manage the contractual and financial transactions during construction');
  const rows = {
    task: { id: id('t'), project_id: pid, stage: 'contract', title: 'Manage the money during construction', owner: '', status: 'doing', due: '2026-12-01', note: '', origin: 'source', source_ref: taskRef, colour: 'x' },
    document: { id: id('d'), project_id: pid, stage: 'detailed', title: 'Drawings', kind: 'Drawing', version: 'B', date: '', source: 'Shared drive', note: '', file: { id: 'f1', name: 'drawings.pdf', type: 'application/pdf', size: 3, kept_at: T0 } },
    approval: { id: id('a'), project_id: pid, stage: 'concept', who: 'Mere Ngata', role: 'Owner or client', what: 'Closes Concept design. The concept shown is accepted to develop.', note: '', at: '2026-11-22T03:04:05.678Z', fingerprint: '99eea08ce8e9' },
    rfi: { id: id('r'), project_id: pid, received_at: '2026-11-20', from: 'Council', question: 'What is the cladding?', response: '', status: 'open', sent_at: '' },
    observation: { id: id('o'), project_id: pid, date: '2026-11-21', by: 'Kate', note: 'Piles in.' },
    variation: { id: id('x'), project_id: pid, title: 'Deck wider', status: 'raised', note: '' },
    defect: { id: id('f'), project_id: pid, title: 'Door sticks', status: 'open', note: 'Bedroom 2' },
    checklist_item: { id: id('c'), project_id: pid, stage: 'detailed', list: 'consent', title: source_ref.title, status: 'gathered', document_id: id('d'), note: '', origin: 'source', source_ref },
    activity: { id: id('v'), project_id: pid, at: '2026-11-22T03:04:05.678Z', who: 'Kate', action: 'Added task', detail: '' },
  };
  for (const [kind, row] of Object.entries(rows)) {
    const rec = JSON.parse(JSON.stringify(toRecord(kind, row)));
    assert.match(rec.id, UUID, kind);
    assert.equal(rec.project_id, P, kind);
    const want = { ...row, id: dbId(row.id), project_id: P };
    if (kind === 'checklist_item') want.document_id = dbId(row.document_id);
    if (kind === 'document') want.file = { ...row.file, id: dbId('f1') };
    assert.deepEqual(fromRecord(kind, rec), want, kind);
    assert.ok(!('edited' in fromRecord(kind, rec)), `${kind}: no stored "edited" is added to the page’s row`);
  }
  // the flat column names and types the tables expect
  const t = toRecord('task', rows.task);
  assert.deepEqual([t.stage, t.owner, t.note, t.due], ['contract_admin', null, null, '2026-12-01']);
  assert.deepEqual(t.source, taskRef, 'source_ref is kept in the source column');
  assert.equal(t.edited, true, 'the practice reworded the sourced task, so the table says edited');
  assert.equal(isEdited(rows.task), true);
  assert.deepEqual(t.extra, { origin: 'source', colour: 'x' });
  const c = toRecord('checklist_item', rows.checklist_item);
  assert.deepEqual([c.source, c.edited], [source_ref, false], 'an item still in the source’s own wording is not edited');
  assert.equal(toRecord('checklist_item', { ...rows.checklist_item, title: 'Our own wording' }).edited, true);
  const own = toRecord('task', { id: id('t'), project_id: pid, stage: 'concept', title: 'Our own task', owner: '', status: 'todo', due: '', note: '', origin: 'practice' });
  assert.deepEqual([own.source, own.edited], [null, false], 'an item with no source is not edited and has no source');
  assert.ok(!('source_ref' in fromRecord('task', own)), 'and it comes back without one');
  const r = toRecord('rfi', rows.rfi);
  assert.deepEqual([r.from_party, r.received_at, r.sent_at, r.response], ['Council', '2026-11-20T00:00:00Z', null, null]);
  assert.ok(!('from' in r));
  assert.equal(fromRecord('rfi', { ...r, received_at: '2026-11-20T00:00:00+00:00' }).received_at, '2026-11-20', 'a date reads back as the date, however the database writes midnight');
  assert.deepEqual(toRecord('document', rows.document).extra, { file: { ...rows.document.file, id: dbId('f1') } }, 'the kept file’s note rides in extra, with the file’s database id');
  assert.deepEqual(toRecord('document', { ...rows.document, file: null }).extra, { file: null }, 'a removed file stays removed');
  assert.equal(toRecord('checklist_item', { ...rows.checklist_item, document_id: '' }).document_id, null);
  // a stage has no id of its own in the table: project and key
  const s = toRecord('stage', { id: `${pid}:contract`, project_id: pid, key: 'contract', status: 'in_progress', started_at: T0, done_at: null });
  assert.deepEqual(s, { project_id: P, key: 'contract_admin', status: 'in_progress', started_at: T0, done_at: null, extra: {} });
  assert.deepEqual(fromRecord('stage', s), { id: `${P}:contract`, project_id: P, key: 'contract', status: 'in_progress', started_at: T0, done_at: null });
  assert.throws(() => toRecord('payroll', { id: 'x' }), /Unknown kind/);
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
  await assert.rejects(cloud.list('payroll'), /Unknown kind/);
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

// ---- the real client, with the network replaced: what actually goes in a shared-records address ------------------------------
test('with Supabase’s own client: the site point never appears in the address of a request to the shared records, and the real “not switched on” answer is understood', async () => {
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

// ---- files: the browser store's own shapes (store.js), against the fake client --------------------------------------------
const NOTE_KEYS = ['id', 'project_id', 'owner_kind', 'owner_id', 'name', 'type', 'size', 'kept_at'].sort();
const PLAN = JSON.stringify({ schema: 'assembl.plan.v1', buildings: [{ id: 'b1', storeys: [{ rooms: [] }] }] });
const pdf = (n = 3000) => new Uint8Array(n).map((_, i) => (i * 7 + 3) % 256);

test('files: the same four calls and shapes as the browser store, kept in the practice’s private folder', async () => {
  const { cloud, fake } = setup();
  const b = newProject({ name: 'House', now: T0 });
  b.documents.push({ id: 'd_aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', project_id: b.project.id, stage: 'detailed', title: 'Consent plans', kind: 'Drawing', version: '', date: '', source: '', note: '' });
  await cloud.saveProject(b);
  const pid = dbId(b.project.id), did = dbId(b.documents.at(-1).id), bytes = pdf();
  const note = await cloud.putFile({ project_id: b.project.id, owner_kind: 'document', owner_id: b.documents.at(-1).id, name: 'Ridge house consent plans.pdf', type: 'application/pdf', data: bytes });
  assert.deepEqual(Object.keys(note).sort(), NOTE_KEYS, 'exactly the note the browser store hands back');
  assert.match(note.id, UUID);
  assert.deepEqual({ ...note, id: '', kept_at: '' }, { id: '', project_id: pid, owner_kind: 'document', owner_id: did, name: 'Ridge house consent plans.pdf', type: 'application/pdf', size: 3000, kept_at: '' });
  assert.ok(!Number.isNaN(Date.parse(note.kept_at)), 'kept_at is a time');
  const [path] = [...fake.files.keys()];
  assert.equal(path, `arch-files/${PRACTICE.id}/${pid}/${note.id}`, 'the path begins with the practice id and is made of ids only');
  assert.ok(!/Ridge|consent|plans|pdf/i.test(path), 'the file’s own name is not in the path');
  assert.deepEqual(fake.db.file[0], { id: note.id, practice_id: PRACTICE.id, project_id: pid, owner_kind: 'document', owner_id: did, name: 'Ridge house consent plans.pdf', mime: 'application/pdf', size: 3000, storage_path: `${PRACTICE.id}/${pid}/${note.id}`, extra: {}, seq: fake.db.file[0].seq, created_at: fake.db.file[0].created_at });
  // getFile: the note plus the contents as a Uint8Array, byte for byte
  const got = await cloud.getFile(note.id);
  assert.ok(got.data instanceof Uint8Array);
  assert.deepEqual([...got.data], [...bytes]);
  assert.deepEqual(Object.keys(got).sort(), [...NOTE_KEYS, 'data'].sort());
  // text, an ArrayBuffer and a typed array are kept as the same bytes, as in the browser
  const m = await cloud.putFile({ project_id: pid, owner_kind: 'model', owner_id: pid, name: 'house.plan.json', type: 'application/json', data: PLAN });
  const ab = await cloud.putFile({ project_id: pid, owner_kind: 'model', owner_id: pid, name: 'a.json', data: new TextEncoder().encode(PLAN).buffer });
  for (const x of [m, ab]) assert.equal(new TextDecoder().decode((await cloud.getFile(x.id)).data), PLAN);
  assert.equal(ab.type, '', 'no type given: none is made up');
  // listFiles: notes only, by project, by owner
  const all = await cloud.listFiles({ project_id: b.project.id });
  assert.deepEqual(all.map((f) => f.name), ['Ridge house consent plans.pdf', 'house.plan.json', 'a.json'], 'in the order they were kept');
  for (const f of all) { assert.deepEqual(Object.keys(f).sort(), NOTE_KEYS); assert.ok(!('data' in f)); }
  assert.deepEqual((await cloud.listFiles({ project_id: pid, owner_kind: 'model' })).map((f) => f.name), ['house.plan.json', 'a.json']);
  assert.deepEqual((await cloud.listFiles({ owner_id: b.documents.at(-1).id })).map((f) => f.id), [note.id], 'the page’s own id finds the owner');
  assert.deepEqual(await cloud.listFiles({ project_id: 'p_00000000-0000-4000-8000-000000000000' }), []);
  // the page's own id for a file ("file_<uuid>") finds the same file
  const named = await cloud.putFile({ id: 'file_aaaaaaaa-bbbb-4ccc-8ddd-000000000009', project_id: pid, owner_kind: 'document', owner_id: did, name: 'b.pdf', data: 'x' });
  assert.equal(named.id, 'aaaaaaaa-bbbb-4ccc-8ddd-000000000009');
  assert.equal((await cloud.getFile('file_aaaaaaaa-bbbb-4ccc-8ddd-000000000009')).name, 'b.pdf');
  // a shared file is never written over: the same id again is refused, and the first is untouched
  await assert.rejects(cloud.putFile({ id: named.id, project_id: pid, owner_kind: 'document', owner_id: did, name: 'other.pdf', data: 'yy' }), says(/already kept under that id\. The file was not kept\./));
  assert.equal(new TextDecoder().decode((await cloud.getFile(named.id)).data), 'x');
  // removeFile
  assert.equal(await cloud.getFile('file_00000000-0000-4000-8000-000000000000'), null);
  assert.equal(await cloud.getFile(''), null);
  assert.equal(await cloud.removeFile(note.id), true);
  assert.equal(await cloud.removeFile(note.id), false);
  assert.equal(await cloud.getFile(note.id), null);
  assert.equal(fake.files.size, 3);
  // the browser store's own refusals, in its own words
  await assert.rejects(cloud.putFile({ project_id: pid, owner_kind: 'document', owner_id: did, name: 'none.pdf' }), /There is nothing in that file to keep/);
  await assert.rejects(cloud.putFile({ project_id: pid, owner_kind: 'invoice', owner_id: did, name: 'a', data: 'x' }), /needs the record it belongs to/);
  await assert.rejects(cloud.putFile({ name: 'loose.pdf', owner_kind: 'document', owner_id: did, data: 'x' }), /needs the record it belongs to/);
  const big = new Uint8Array(1); Object.defineProperty(big, 'byteLength', { value: 60 * 1024 * 1024 });
  await assert.rejects(cloud.putFile({ project_id: pid, owner_kind: 'document', owner_id: did, name: 'big.bin', data: big }), says(/“big\.bin” is 60 MB\. The limit is 50 MB a file in the shared records, so it was not kept/));
  assert.equal(cloud.fileLimit, 50 * 1024 * 1024);
  assert.equal(cloud.filesPersistent, true);
});

test('files: the same calls give the same shapes from the browser store and the shared store', async () => {
  const { cloud, local } = setup();
  const b = newProject({ name: 'House', now: T0 });
  await local.saveProject(b); await cloud.saveProject(b);
  const put = (s) => s.putFile({ project_id: b.project.id, owner_kind: 'model', owner_id: b.project.id, name: 'house.plan.json', type: 'application/json', data: PLAN });
  const here = await put(local), there = await put(cloud);
  assert.deepEqual(Object.keys(here).sort(), Object.keys(there).sort());
  const [h, t] = [await local.getFile(here.id), await cloud.getFile(there.id)];
  assert.deepEqual(Object.keys(h).sort(), Object.keys(t).sort());
  assert.deepEqual([...h.data], [...t.data]);
  for (const k of ['owner_kind', 'name', 'type', 'size']) assert.equal(h[k], t[k], k);
  assert.deepEqual(Object.keys((await local.listFiles())[0]).sort(), Object.keys((await cloud.listFiles())[0]).sort());
});

test('files: a refusal is said plainly, and the contents are not left behind when the record is refused', async () => {
  const { cloud, fake } = setup();
  const b = newProject({ name: 'House', now: T0 }); await cloud.saveProject(b);
  const one = { project_id: b.project.id, owner_kind: 'document', owner_id: 'd_aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', name: 'a.pdf', type: 'application/pdf', data: 'x' };
  fake.viewer = true; // the database's view, whatever the page believes
  await assert.rejects(cloud.putFile(one), says(/refused that file: your role in the practice does not allow it\. The file was not kept\./, 'refused'));
  assert.equal(fake.files.size, 0);
  fake.viewer = false;
  fake.fail = (op) => (op.table === 'file' && op.action === 'insert' ? { code: '42501', message: 'new row violates row-level security policy for table "file"' } : null);
  await assert.rejects(cloud.putFile(one), says(/The file was not kept/, 'refused'));
  assert.equal(fake.files.size, 0, 'the uploaded contents were removed again');
  fake.fail = (op) => (op.action === 'upload' ? { message: 'Bucket not found', statusCode: '404' } : null);
  await assert.rejects(cloud.putFile(one), says(/Keeping files in the shared records is not switched on yet/));
  fake.fail = (op) => (op.action === 'upload' ? { message: 'TypeError: Failed to fetch' } : null);
  await assert.rejects(cloud.putFile(one), says(/could not be reached just now\. The file was not kept\./, 'offline'));
  fake.fail = null;
  // a record whose contents have gone is "not there", not an error; removing it again finishes the job
  const kept = await cloud.putFile(one);
  fake.files.clear();
  assert.equal(await cloud.getFile(kept.id), null);
  assert.equal(await cloud.removeFile(kept.id), true);
  assert.equal(fake.db.file.length, 0);
  // offline while reading is an error, never a quiet "no file"
  await cloud.putFile(one);
  fake.fail = (op) => (op.action === 'download' ? { message: 'TypeError: Failed to fetch' } : null);
  await assert.rejects(cloud.getFile(fake.db.file[0].id), says(/could not be reached/, 'offline'));
});

test('files: a viewer reads and downloads, and cannot keep or remove a file', async () => {
  const m = setup();
  const b = newProject({ name: 'House', now: T0 }); await m.cloud.saveProject(b);
  const kept = await m.cloud.putFile({ project_id: b.project.id, owner_kind: 'model', owner_id: b.project.id, name: 'house.plan.json', type: 'application/json', data: PLAN });
  const v = createCloudStore({ client: m.fake, practice: { ...PRACTICE, role: 'viewer' }, local: m.local });
  m.fake.log.length = 0;
  await assert.rejects(v.putFile({ project_id: b.project.id, owner_kind: 'model', owner_id: b.project.id, name: 'x.json', data: 'x' }), says(/You are a viewer in Tui Architects: you can read everything and change nothing\. Nothing was changed\./, 'read_only'));
  await assert.rejects(v.removeFile(kept.id), says(/viewer/, 'read_only'));
  assert.equal(m.fake.writes().filter((w) => w.action !== 'download').length, 0, 'nothing was sent');
  assert.equal((await v.listFiles({ project_id: b.project.id })).length, 1);
  assert.equal(new TextDecoder().decode((await v.getFile(kept.id)).data), PLAN);
  const x = await v.exportProject(b.project.id, T0, { files: true });
  assert.equal(x.file_count, 1, 'a viewer can export with the files');
});

test('files: the Sample’s files stay in the browser, also while signed in', async () => {
  const { cloud, local, fake } = setup();
  await local.saveProject(sampleProject(T0));
  fake.log.length = 0;
  const f = await cloud.putFile({ project_id: SAMPLE_ID, owner_kind: 'document', owner_id: 'd1', name: 'notes.txt', type: 'text/plain', data: 'hello' });
  assert.match(f.id, /^file_/, 'the browser store’s own id');
  assert.equal(new TextDecoder().decode((await cloud.getFile(f.id)).data), 'hello');
  assert.deepEqual((await cloud.listFiles({ project_id: SAMPLE_ID })).map((x) => x.name), ['notes.txt']);
  assert.deepEqual((await cloud.listFiles()).map((x) => x.name), ['notes.txt'], 'listed with the shared files when no project is named');
  assert.equal(fake.files.size, 0);
  assert.equal(fake.writes().filter((w) => w.table === 'file' || w.table.startsWith('storage/')).length, 0, 'not one file request was made for the Sample');
  assert.equal(await cloud.removeFile(f.id), true);
  assert.equal((await local.listFiles()).length, 0);
});

test('files: export with the files from the shared records, and import them into a browser and back, byte for byte', async () => {
  const { cloud, local, fake } = setup();
  const b = newProject({ name: 'House A', now: T0 });
  b.documents.push({ id: 'd_aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', project_id: b.project.id, stage: 'predesign', title: 'Brief', kind: 'Brief', version: '1', date: '', source: '', note: '' });
  await cloud.saveProject(b);
  const pid = dbId(b.project.id), bytes = pdf(4096);
  const f = await cloud.putFile({ project_id: pid, owner_kind: 'document', owner_id: b.documents.at(-1).id, name: 'brief.pdf', type: 'application/pdf', data: bytes });
  const d = await cloud.get('document', b.documents.at(-1).id);
  await cloud.save('document', { ...d, file: { id: f.id, name: f.name, type: f.type, size: f.size, kept_at: f.kept_at } });
  const m = await cloud.putFile({ project_id: pid, owner_kind: 'model', owner_id: pid, name: 'house.plan.json', type: 'application/json', data: PLAN });
  const p = await cloud.get('project', pid);
  await cloud.save('project', { ...p, model: { fingerprint: 'abc123abc123', drawings: 'A', revision: 'A', file_name: 'house.plan.json', file: { id: m.id, name: m.name, type: m.type, size: m.size, kept_at: m.kept_at } } });
  // records only: the file says so, and says where the files stay
  const plain = await cloud.exportProject(pid, T0);
  assert.deepEqual([plain.files_included, plain.file_count], [false, 0]);
  assert.match(JSON.parse(plain.text).note, /Files are not included: only the records\. The files stay in the shared records of Tui Architects\./);
  // with the files
  const x = await cloud.exportProject(pid, T0, { files: true });
  assert.deepEqual([x.files_included, x.file_count, x.file_bytes], [true, 2, 4096 + new TextEncoder().encode(PLAN).length]);
  assert.match(x.file_name, /^house-a-project-\d{4}-\d{2}-\d{2}-with-files\.json$/);
  // into another browser: the same files, byte for byte, and the records point at them
  const other = createStore(memoryBackend(), { files: memoryFiles() });
  const r = await other.importProject(x.text, T0);
  assert.deepEqual(r, { project_id: pid, copied: false, files: 2, files_failed: 0 });
  assert.deepEqual([...(await other.getFile(f.id)).data], [...bytes]);
  const doc = (await other.list('document', { project_id: pid }))[0];
  assert.equal((await other.getFile(doc.file.id)).name, 'brief.pdf');
  assert.equal(new TextDecoder().decode((await other.getFile((await other.get('project', pid)).model.file.id)).data), PLAN);
  // and back up into the shared records: the project is already there, so it comes in beside it as a copy, with files
  fake.log.length = 0;
  const back = await cloud.importProject(x.text, T0);
  assert.equal(back.copied, true); assert.equal(back.files, 2); assert.equal(back.files_failed, 0);
  const copy = await cloud.loadProject(back.project_id), copyFiles = await cloud.listFiles({ project_id: back.project_id });
  assert.equal(copyFiles.length, 2);
  assert.ok(copyFiles.every((c) => c.id !== f.id && c.id !== m.id), 'the copy’s files have ids of their own');
  assert.equal(new TextDecoder().decode((await cloud.getFile(copy.project.model.file.id)).data), PLAN, 'the copy’s model note finds its own file');
  assert.deepEqual([...(await cloud.getFile(copy.documents[0].file.id)).data], [...bytes]);
  assert.equal(copyFiles.find((c) => c.owner_kind === 'document').owner_id, copy.documents[0].id);
  assert.equal((await cloud.listFiles({ project_id: pid })).length, 2, 'the project already there keeps its own files');
  // a file whose contents have gone is counted, not hidden
  fake.files.delete(`arch-files/${PRACTICE.id}/${pid}/${f.id}`);
  const short = await cloud.exportProject(pid, T0, { files: true });
  assert.deepEqual([short.file_count, short.files_missing], [1, 1]);
  // a file the shared records refuse on import is counted too
  fake.fail = (op) => (op.action === 'upload' ? { message: 'The object exceeded the maximum allowed size', statusCode: '413' } : null);
  const refused = await cloud.importProject(x.text, T0);
  assert.deepEqual([refused.files, refused.files_failed], [0, 2]);
});

test('files: the 3D hand-over reads the model file from the shared records', async () => {
  const { cloud, local } = setup();
  const s = createSwitch(local).use(cloud);
  const b = newProject({ name: 'House', now: T0 });
  await s.saveProject(b);
  const pid = dbId(b.project.id);
  // as the page attaches a model (app.js): keep the file, then save the project with the note
  const meta = await s.putFile({ project_id: pid, owner_kind: 'model', owner_id: pid, name: 'ridge.plan.json', type: 'application/json', data: PLAN });
  const p = await s.get('project', pid);
  p.model = { fingerprint: 'abc123abc123', drawings: 'A', revision: 'A', file_name: 'ridge.plan.json', file: { id: meta.id, name: meta.name, type: meta.type, size: meta.size, kept_at: meta.kept_at } };
  await s.save('project', p);
  // as the page reads it back (app.js ready3d)
  const again = await s.get('project', pid);
  assert.equal(twinLink(again.model).handoff, true, 'a kept file: handed across, not chosen again');
  const f = await s.getFile(again.model.file.id);
  const h = twinHandoff(new TextDecoder().decode(f.data), again.model.file_name);
  assert.deepEqual(JSON.parse(h.value), { plan: JSON.parse(PLAN), name: 'ridge.plan.json' });
  assert.equal(await local.getFile(meta.id), null, 'it came from the shared records: this browser never had it');
});

// ---- moving a browser project with files up ---------------------------------------------------------------------------------
test('move: a browser project with a document file and a model file goes up with both, and each note finds its file', async () => {
  const { cloud, local, fake } = setup();
  const b = newProject({ name: 'House A', now: T0 }), pid = b.project.id;
  b.documents.push({ id: 'd_aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', project_id: pid, stage: 'predesign', title: 'Brief', kind: 'Brief', version: '1', date: '', source: '', note: '' });
  b.checklist[0].document_id = b.documents.at(-1).id;
  await local.saveProject(b);
  const bytes = pdf(5000);
  const df = await local.putFile({ project_id: pid, owner_kind: 'document', owner_id: b.documents.at(-1).id, name: 'brief.pdf', type: 'application/pdf', data: bytes });
  await local.save('document', { ...(await local.get('document', b.documents.at(-1).id)), file: { id: df.id, name: df.name, type: df.type, size: df.size, kept_at: df.kept_at } });
  const mf = await local.putFile({ project_id: pid, owner_kind: 'model', owner_id: pid, name: 'house.plan.json', type: 'application/json', data: PLAN });
  const lp = await local.get('project', pid);
  lp.model = { fingerprint: 'abc123abc123', drawings: 'A', revision: 'A', file_name: 'house.plan.json', file: { id: mf.id, name: mf.name, type: mf.type, size: mf.size, kept_at: mf.kept_at } };
  await local.save('project', lp);
  const before = JSON.stringify(await local.loadProject(pid)), filesBefore = JSON.stringify(await local.listFiles());

  const [r] = await moveProjects({ local, cloud, ids: [pid], now: T0 });
  assert.equal(r.outcome, 'copied', r.reason);
  assert.equal(r.counts.files, 2);
  assert.equal(fake.files.size, 2);
  const up = await cloud.loadProject(pid), upFiles = await cloud.listFiles({ project_id: pid });
  assert.equal(upFiles.length, 2);
  // the notes on the records point at the shared files: download each by the note the page holds
  const doc = up.documents.find((d) => d.title === 'Brief');
  assert.equal(doc.file.id, dbId(df.id));
  assert.deepEqual([...(await cloud.getFile(doc.file.id)).data], [...bytes], 'the document’s file, byte for byte');
  assert.equal(new TextDecoder().decode((await cloud.getFile(up.project.model.file.id)).data), PLAN, 'the model’s file');
  assert.deepEqual(upFiles.map((f) => [f.owner_kind, f.owner_id]).sort(), [['document', doc.id], ['model', up.project.id]].sort());
  assert.equal(up.checklist[0].document_id, doc.id, 'the checklist still points at the document');
  // the page's view of the moved project (app.js render): every kept file is found by the note on its record
  const kept = new Map(upFiles.map((f) => [f.id, f]));
  assert.ok(kept.has(doc.file.id) && kept.has(up.project.model.file.id));
  // the browser copy is exactly as it was, files and all
  assert.equal(JSON.stringify(await local.loadProject(pid)), before);
  assert.equal(JSON.stringify(await local.listFiles()), filesBefore);
  // asking again copies nothing again
  const again = await moveProjects({ local, cloud, ids: [pid], now: T0 });
  assert.equal(again[0].outcome, 'already');
  assert.equal(fake.files.size, 2);
});

test('move: a copy whose file fails says so, claims nothing, and a second try sends only what is missing', async () => {
  const { cloud, local, fake } = setup();
  const b = newProject({ name: 'House A', now: T0 }), pid = b.project.id;
  await local.saveProject(b);
  const one = await local.putFile({ project_id: pid, owner_kind: 'model', owner_id: pid, name: 'a.json', data: PLAN });
  const two = await local.putFile({ project_id: pid, owner_kind: 'model', owner_id: pid, name: 'b.json', data: '{"buildings":[]}' });
  let uploads = 0;
  fake.fail = (op) => (op.action === 'upload' && ++uploads === 2 ? { message: 'TypeError: Failed to fetch' } : null);
  const [r] = await moveProjects({ local, cloud, ids: [pid], now: T0 });
  assert.equal(r.outcome, 'failed');
  assert.match(r.reason, /could not be reached just now\. The file was not kept\./);
  assert.equal((await local.get('setting', 'moved')).value[pid].state, 'failed');
  fake.fail = null; fake.log.length = 0;
  const [again] = await moveProjects({ local, cloud, ids: [pid], now: T0 });
  assert.equal(again.outcome, 'copied', again.reason);
  assert.equal(again.counts.files, 2);
  assert.deepEqual(fake.log.filter((o) => o.action === 'upload').map((o) => o.path.split('/').pop()), [dbId(two.id)], 'only the file that did not arrive is sent');
  assert.deepEqual((await cloud.listFiles({ project_id: pid })).map((f) => f.id).sort(), [dbId(one.id), dbId(two.id)].sort());
  // a file the shared records say they kept but cannot list back is not counted as copied
  const c = newProject({ name: 'House C', now: T0 }); await local.saveProject(c);
  await local.putFile({ project_id: c.project.id, owner_kind: 'model', owner_id: c.project.id, name: 'c.json', data: PLAN });
  let reads = 0;
  const realFrom = fake.from; // the second read of the file list (the read-back after the copy) comes back empty
  fake.from = (t) => { const q = realFrom(t); if (t !== 'file') return q; const run = q.run.bind(q); q.run = () => { const out = run(); return q.action === 'select' && ++reads === 2 ? { data: [], error: null } : out; }; return q; };
  const [lost] = await moveProjects({ local, cloud, ids: [c.project.id], now: T0 });
  fake.from = realFrom;
  assert.equal(reads, 2);
  assert.equal(lost.outcome, 'failed');
  assert.match(lost.reason, /missing some files/);
});

// ---- sourced lists in the shared records -----------------------------------------------------------------------------------
test('sourced items keep their source in the shared records, and “Add the sourced items” adds them in one write', async () => {
  const { cloud, fake } = setup();
  const b = newProject({ name: 'House', now: T0 });
  b.checklist[0].title = 'Form 2, signed by the owner'; // the practice rewords a sourced item
  await cloud.saveProject(b);
  const back = await cloud.loadProject(b.project.id);
  const first = back.checklist.find((c) => c.source_ref?.id === CONSENT_SOURCED[0].source_ref.id);
  assert.deepEqual(first.source_ref, CONSENT_SOURCED[0].source_ref, 'the source comes back as it went');
  assert.equal(first.origin, 'source');
  assert.equal(isEdited(first), true, 'the page still sees the item as edited');
  assert.equal(fake.db.checklist_item.find((c) => c.id === first.id).edited, true, 'and the table says so too');
  assert.equal(back.tasks.filter((t) => t.source_ref).length, b.tasks.filter((t) => t.source_ref).length);
  assert.equal(back.checklist.find((c) => c.list === 'completion').origin, 'starter');
  assert.deepEqual(missingSourced(back, 'consent'), [], 'nothing is missing on a project made with sources');
  // an older project, made before the lists had sources: the page's button adds the 35 items (app.js sourced-consent)
  const old = newProject({ name: 'Older', now: T0 });
  old.checklist = old.checklist.filter((c) => !c.source_ref).concat([{ id: 'c_aaaaaaaa-bbbb-4ccc-8ddd-000000000777', project_id: old.project.id, stage: 'detailed', list: 'consent', title: 'Our own item', status: 'needed', document_id: '', note: '' }]);
  await cloud.saveProject(old);
  const o = await cloud.loadProject(old.project.id), add = missingSourced(o, 'consent');
  assert.equal(add.length, 35);
  o.checklist.push(...add.map((x) => consentRow(o.project.id, x)));
  fake.log.length = 0;
  await cloud.saveProject(o);
  assert.deepEqual(fake.writes().map((w) => `${w.action} ${w.table} ${w.rows.length}`), ['upsert checklist_item 35'], 'one write: all 35 go in together, nothing else is touched');
  const after = await cloud.loadProject(old.project.id);
  assert.equal(missingSourced(after, 'consent').length, 0);
  assert.equal(after.checklist.filter((c) => c.source_ref?.council === 'Auckland Council').length, CONSENT_SOURCED.filter((c) => c.source_ref.council).length);
  assert.ok(after.checklist.some((c) => c.title === 'Our own item'), 'what was already there is unchanged');
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
  // the browser store keeps files itself (store.js): signed out, a file goes to this browser
  const here = await s.putFile({ project_id: a.project.id, owner_kind: 'document', owner_id: 'd1', name: 'a.pdf', type: 'application/pdf', data: 'x' });
  assert.match(here.id, /^file_/);
  assert.equal(fake.log.length, 0, 'nothing was sent');
  assert.equal(s.filesPersistent, local.filesPersistent);
  assert.equal(s.fileLimit, 25 * 1024 * 1024, 'the browser’s limit');
  s.use(cloud);
  assert.equal(s.shared, true);
  assert.equal(s.filesPersistent, true);
  assert.equal(s.fileLimit, 50 * 1024 * 1024, 'the shared records’ limit');
  assert.deepEqual(await s.list('project'), [], 'a browser project is not shown as shared, and is not uploaded by signing in');
  assert.deepEqual(await s.listFiles(), [], 'and nor are its files');
  const b = newProject({ name: 'Shared', now: T0 });
  await s.saveProject(b);
  assert.equal(fake.db.project.length, 1);
  const there = await s.putFile({ project_id: dbId(b.project.id), owner_kind: 'document', owner_id: 'd1', name: 'a.pdf', type: 'application/pdf', data: 'x' });
  assert.equal(there.name, 'a.pdf');
  assert.equal(fake.files.size, 1);
  s.use(null);
  assert.equal(s.shared, false);
  assert.deepEqual((await s.list('project')).map((p) => p.name), ['In the browser'], 'signed out: the browser store, exactly as before');
  assert.deepEqual((await s.listFiles()).map((f) => f.id), [here.id], 'and its own files');
  assert.equal(await s.getFile(there.id), null, 'a shared file is not in this browser');
  assert.equal(s.persistent, true);
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
