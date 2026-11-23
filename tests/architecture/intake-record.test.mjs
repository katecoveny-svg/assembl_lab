// What the intake agent keeps with a project (architecture/js/intake-record.js), through the browser store and through the shared
// records' own project mapping (tests/architecture/fake-supabase.mjs), so it is checked that it comes back from Supabase unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import { syntheticSet } from './fixtures/sheet-set.mjs';
import { intakeRun } from '../../architecture/js/intake-run.js';
import { createJob, runJob, approve } from '../../architecture/js/conductor.js';
import { toRecord, normalIntake, withIntake, EMPTY } from '../../architecture/js/intake-record.js';
import { createStore, memoryBackend } from '../../architecture/js/store.js';
import { newProject } from '../../architecture/js/model.js';
import { toRecord as cloudRecord, fromRecord } from '../../architecture/js/cloud.js';

const lib = async () => { const l = await import('../../architecture/vendor/pdfjs/pdf.min.mjs'); l.GlobalWorkerOptions.workerSrc = new URL('../../architecture/vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href; return l; };
async function result() {
  const set = syntheticSet(), run = intakeRun({ entries: set.files.map((f) => ({ path: f.path, file: new File([f.bytes], f.path.split('/').pop()) })), lib: await lib(), draw: async () => 'data:image/jpeg;base64,AAAA',
    readSheet: async () => ({ plan: { is_drawing_sheet: true, number: 'A-301', title: 'Sections', scale: null, rev: null, date: null, register: [], confidence: 1, notes: '' }, provider: 'gemini', model: 'g' }) });
  const job = createJob({ id: 'j', kind: 'intake', project_id: 'p', steps: run.defs });
  await runJob(job, run.handlers); approve(job, 'model', 'Kate'); await runJob(job, run.handlers);
  return { run, job };
}

test('a finished run becomes a record that holds the files, the sheets, the register, the missing list and the job, and nothing else', async () => {
  const { run, job } = await result(), rec = toRecord(run.state, job, 'Kate');
  assert.equal(rec.v, 1); assert.equal(rec.by, 'Kate'); assert.equal(rec.files.length, 11); assert.equal(rec.sheets.length, 7); assert.equal(rec.register.rows.length, 7);
  assert.deepEqual(rec.index.missing.map((m) => m.number), ['S-100']); assert.equal(rec.job.status, 'done'); assert.equal(rec.job.steps.find((s) => s.id === 'model').calls, 1);
  assert.ok(rec.files.every((f) => !('file' in f)), 'no File object goes into the record');
  assert.ok(!JSON.stringify(rec).includes('items'), 'no page text items are kept');
  assert.deepEqual(normalIntake(JSON.parse(JSON.stringify(rec))), rec, 'it survives JSON unchanged');
});
test('a record that does not fit is dropped to what does: nothing invalid is kept', async () => {
  const { run, job } = await result(), rec = toRecord(run.state, job);
  const bad = JSON.parse(JSON.stringify(rec)); bad.sheets[0].page = 0; bad.sheets[1].from = 'guess'; bad.files[0].path = 5; bad.register.rows[0].number = null;
  const n = normalIntake(bad);
  assert.equal(n.sheets.length, 5); assert.equal(n.files.length, 10); assert.equal(n.register.rows.length, 6);
  assert.deepEqual(normalIntake(null), EMPTY); assert.deepEqual(normalIntake({ v: 2 }), EMPTY); assert.deepEqual(normalIntake('x'), EMPTY);
});
test('a job saved while a step was running comes back with that step failed, so it is never shown as still running', async () => {
  const { run, job } = await result(), rec = toRecord(run.state, job); rec.job.steps[4].status = 'running'; rec.job.status = 'running';
  const n = normalIntake(rec); assert.equal(n.job.steps[4].status, 'failed'); assert.match(n.job.steps[4].reason, /closed/);
});
test('the record is kept with the project in the browser store, and a later change keeps the rest of the project', async () => {
  const store = createStore(memoryBackend());
  const b = newProject({ name: 'Sample', now: '2026-11-23T00:00:00.000Z' }); await store.saveProject(b); const id = b.project.id;
  const { run, job } = await result();
  await withIntake(store, id, () => toRecord(run.state, job, 'Kate'));
  const back = await store.get('project', id);
  assert.equal(back.name, 'Sample'); assert.equal(back.intake.sheets.length, 7);
  await withIntake(store, id, (cur) => ({ ...cur, by: 'Ana' }));
  assert.equal((await store.get('project', id)).intake.by, 'Ana'); assert.equal((await store.get('project', id)).intake.sheets.length, 7);
  assert.equal(await withIntake(store, 'nope', (c) => c), null);
});
test('in the practice\'s shared records the intake rides in the project row\'s extra column and comes back unchanged: no new table', async () => {
  const b = newProject({ name: 'Sample', now: '2026-11-23T00:00:00.000Z' }), { run, job } = await result();
  b.project.intake = toRecord(run.state, job, 'Kate');
  const row = cloudRecord('project', b.project);
  assert.deepEqual(row.extra.intake, b.project.intake);
  assert.ok(!('intake' in row), 'not a column of its own');
  assert.deepEqual(fromRecord('project', row).intake, b.project.intake);
});
