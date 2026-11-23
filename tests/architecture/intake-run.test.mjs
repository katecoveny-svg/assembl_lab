// The intake agent end to end, offline: a synthetic drawing set (tests/architecture/fixtures/sheet-set.mjs, invented, made here) is
// read by the real pdf.js in architecture/vendor, run by the conductor. The model is a stand-in; nothing leaves this process.
import test from 'node:test';
import assert from 'node:assert/strict';
import { syntheticSet } from './fixtures/sheet-set.mjs';
import { intakeRun } from '../../architecture/js/intake-run.js';
import { createJob, runJob, approve, retry, STATUS } from '../../architecture/js/conductor.js';

let libP; const lib = () => (libP ??= (async () => { const l = await import('../../architecture/vendor/pdfjs/pdf.min.mjs'); l.GlobalWorkerOptions.workerSrc = new URL('../../architecture/vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href; return l; })());
const entries = (set) => set.files.map((f) => ({ path: f.path, file: new File([f.bytes], f.path.split('/').pop()) }));
const SHEET_READ = { is_drawing_sheet: true, number: 'A-301', title: 'Sections', scale: '1:50', rev: 'B', date: '12/08/2026', register: [], confidence: 0.9, notes: '' };
const mkJob = (defs) => createJob({ id: 'job-1', kind: 'intake', project_id: 'p1', steps: defs });

async function build({ readSheet, kept = [] } = {}) {
  const set = syntheticSet(), asked = [];
  const run = intakeRun({
    entries: entries(set), lib: await lib(), saveRecord: async (st) => { kept.push(st); },
    draw: async (pdf, n) => `data:image/jpeg;base64,${Buffer.from(`page ${n}`).toString('base64')}`,
    readSheet: readSheet ?? (async (img) => { asked.push(img); return { plan: SHEET_READ, provider: 'openai', model: 'gpt-test' }; }),
  });
  return { set, run, asked, kept, job: mkJob(run.defs) };
}

test('the steps sort the files, split the PDF into its sheets and stop before the paid read, with a person to say go', async () => {
  const { run, job, asked } = await build();
  await runJob(job, run.handlers);
  const st = run.state;
  assert.deepEqual(job.steps.map((s) => s.status), [STATUS.done, STATUS.done, STATUS.done, STATUS.done, STATUS.person, STATUS.waiting, STATUS.waiting]);
  assert.match(job.steps[4].reason, /1 sheet has no text of its own.*1 paid request/);
  assert.equal(asked.length, 0, 'nothing was sent anywhere');
  // sorted
  const kinds = Object.fromEntries(Object.entries(Object.groupBy(st.files, (f) => f.kind)).map(([k, v]) => [k, v.length]));
  assert.deepEqual(kinds, { pdf: 2, image: 2, model: 1, geodata: 1, table: 1, document: 1, archive: 1, other: 1, ignored: 1 });
  // split: the notes PDF is a document with no sheets; the drawing PDF is seven sheets
  assert.deepEqual(st.files.filter((f) => f.kind === 'pdf').map((f) => [f.name, f.pdf, f.pages]).sort(), [['Architectural.pdf', 'drawings', 7], ['site visit.pdf', 'document', 1]]);
  assert.equal(st.sheets.length, 7);
  // read: numbers from the sheets' own text, the scanned sheet unread
  assert.deepEqual(st.sheets.map((s) => s.number), ['A-000', 'A-101', 'A-102', 'A-103', 'A-201', null, 'A-501']);
  assert.deepEqual(st.sheets.map((s) => s.status), ['read', 'read', 'read', 'read', 'read', 'unread', 'read']);
  assert.equal(st.sheets[5].no_text, true); assert.ok(st.sheets.every((s) => s.paper === 'A1'));
  assert.equal(st.register.found, true); assert.equal(st.register.rows.length, 7);
});

test('every field of every readable sheet is what the synthetic title block prints', async () => {
  const { run, job } = await build();
  await runJob(job, run.handlers);
  const by = Object.fromEntries(run.state.sheets.filter((s) => s.number).map((s) => [s.number, s]));
  assert.deepEqual([by['A-101'].title, by['A-101'].scale, by['A-101'].rev, by['A-101'].date_iso], ['Site plan', '1:200', 'C', '2026-08-12']);
  assert.deepEqual([by['A-102'].title, by['A-102'].rev], ['Ground floor plan', 'B'], 'the other title block layout, label to the left');
  assert.deepEqual([by['A-103'].date, by['A-103'].date_iso], ['14 Aug 2026', '2026-08-14']);
  assert.equal(by['A-201'].title, 'Elevations north and south'); assert.equal(by['A-501'].scale, '1:5, 1:10');
  assert.ok(Object.values(by).every((s) => s.from === 'text' && s.unread.length === 0));
});

test('after a person says go, the one sheet with no text is read by the model, and the index and the missing list are built', async () => {
  const { run, job, asked, kept } = await build();
  await runJob(job, run.handlers);
  approve(job, 'model', 'Kate');
  await runJob(job, run.handlers);
  assert.equal(job.status, STATUS.done); assert.equal(asked.length, 1, 'one request for one sheet with no text, none for the 6 that had text');
  assert.equal(job.steps[4].calls, 1);
  const s = run.state.sheets[5];
  assert.equal(s.number, 'A-301'); assert.equal(s.from, 'model'); assert.equal(s.how.number, 'model'); assert.equal(s.model, 'openai gpt-test'); assert.match(s.note, /Check it/);
  const idx = run.state.index;
  assert.deepEqual(idx.missing.map((m) => m.number), ['S-100']); assert.equal(idx.missing[0].title, 'Topographic survey');
  assert.deepEqual(idx.unlisted, ['Set/Drawings/Architectural.pdf#7']); assert.equal(idx.unreadable, 0);
  assert.equal(kept.length, 1, 'kept once, at the last step');
});

test('before the model read, the sheet that has no text is only possibly missing, and the index says so', async () => {
  const { run, job } = await build();
  // run to the person step, then skip it as a person would not: build the index from what the text gave
  await runJob(job, run.handlers);
  const { buildIndex } = await import('../../architecture/js/intake-rules.js');
  const idx = buildIndex(run.state.sheets, run.state.register);
  assert.deepEqual(idx.missing.map((m) => m.number), ['A-301', 'S-100']); assert.equal(idx.unreadable, 1, 'one sheet could not be read, so A-301 may be there');
});

test('a reply the schema refuses is thrown away and the sheet stays unread; if nothing was read the paid step fails and is not run again', async () => {
  let n = 0;
  const { run, job } = await build({ readSheet: async () => { n++; return { plan: { number: 'A-301' }, provider: 'openai', model: 'm' }; } });
  await runJob(job, run.handlers); approve(job, 'model', 'Kate'); await runJob(job, run.handlers);
  assert.equal(n, 1, 'asked once, not retried by itself');
  assert.equal(job.steps[4].status, STATUS.failed); assert.match(job.steps[4].reason, /No sheet could be read by a model/);
  assert.equal(run.state.sheets[5].number, null); assert.equal(run.state.sheets[5].status, 'unread'); assert.equal(job.steps[5].status, STATUS.waiting);
  await runJob(job, run.handlers); assert.equal(n, 1, 'running the job again does not ask again');
  retry(job, 'model', 'Kate'); await runJob(job, run.handlers); assert.equal(n, 2, 'a person asked, so it asked again');
});

test('a provider that is out (the call throws) fails the paid step with its reason', async () => {
  const { run, job } = await build({ readSheet: async () => { throw new Error('model_error'); } });
  await runJob(job, run.handlers); approve(job, 'model', 'Kate'); await runJob(job, run.handlers);
  assert.equal(job.steps[4].status, STATUS.failed); assert.match(job.steps[4].reason, /model_error/);
});

test('a set with no sheet that needs a model never asks a person for money', async () => {
  const set = syntheticSet(), only = set.files.filter((f) => !f.path.endsWith('Architectural.pdf'));
  const run = intakeRun({ entries: entries({ files: only }), lib: await lib(), saveRecord: async () => {}, readSheet: async () => { throw new Error('must not be called'); } });
  const job = mkJob(run.defs); await runJob(job, run.handlers);
  assert.equal(job.status, STATUS.done); assert.equal(job.steps[4].note, 'not needed'); assert.equal(run.state.sheets.length, 0); assert.equal(run.state.index.found, false);
});

test('a PDF that cannot be opened is listed with a plain problem and does not stop the rest', async () => {
  const set = syntheticSet(); set.files.push({ path: 'Set/broken.pdf', bytes: new TextEncoder().encode('%PDF-1.4\nnot really') });
  const run = intakeRun({ entries: entries(set), lib: await lib(), saveRecord: async () => {}, readSheet: async () => ({ plan: SHEET_READ }) });
  const job = mkJob(run.defs); await runJob(job, run.handlers);
  const bad = run.state.files.find((f) => f.name === 'broken.pdf');
  assert.match(bad.problem, /could not be opened as a PDF/); assert.equal(run.state.sheets.length, 7); assert.equal(job.steps[1].status, STATUS.done);
});

test('the result holds no client data: it is only what the synthetic set printed', async () => {
  const { run, job } = await build();
  await runJob(job, run.handlers);
  const text = JSON.stringify(run.state.sheets.map((s) => [s.title, s.number]));
  assert.doesNotMatch(text, /whaiao|weteriana|wesley|ryuki/i);
});

test('the files are kept before the paid step, so waiting for a person loses nothing; a file is only kept once', async () => {
  const keptFiles = [], set = syntheticSet();
  const run = intakeRun({ entries: entries(set), lib: await lib(), saveFiles: async (st, log) => { for (const f of st.files.filter((x) => x.kind !== 'ignored')) { f.file_id = `id-${f.name}`; keptFiles.push(f.path); } log('kept'); }, readSheet: async () => ({ plan: SHEET_READ }) });
  const job = mkJob(run.defs); await runJob(job, run.handlers);
  assert.equal(job.steps[3].id, 'keep'); assert.equal(job.steps[3].status, STATUS.done); assert.equal(job.steps[4].status, STATUS.person);
  assert.equal(keptFiles.length, set.files.length - 1, 'every file but the system file');
});

test('a sheet a model already read, in the same file, is not sent again; a changed file is', async () => {
  const first = await build();
  await runJob(first.job, first.run.handlers); approve(first.job, 'model', 'Kate'); await runJob(first.job, first.run.handlers);
  const prior = { sheets: first.run.state.sheets, register: first.run.state.register };
  assert.ok(prior.sheets[5].file_sha && prior.sheets[5].model);
  let asked = 0;
  const again = intakeRun({ entries: entries(syntheticSet()), lib: await lib(), prior, readSheet: async () => { asked++; return { plan: SHEET_READ }; } });
  const job = mkJob(again.defs); await runJob(job, again.handlers);
  assert.equal(job.status, STATUS.done, 'no person needed: nothing is left to read'); assert.equal(asked, 0); assert.equal(job.steps[4].note, 'not needed');
  assert.equal(again.state.sheets[5].number, 'A-301'); assert.equal(again.state.sheets[5].from, 'model');
  // the same sheet in a file with other contents is a new read
  const set2 = syntheticSet(); set2.files[0].bytes = new Uint8Array([...set2.files[0].bytes, 10, 10]);
  const changed = intakeRun({ entries: entries(set2), lib: await lib(), prior, readSheet: async () => { asked++; return { plan: SHEET_READ }; } });
  const j2 = mkJob(changed.defs); await runJob(j2, changed.handlers);
  assert.equal(j2.steps[4].status, STATUS.person); assert.equal(asked, 0);
});

test('the fingerprint works without crypto.subtle (a page that is not https) and gives the same answer', async () => {
  const { sha256, sha256Js } = await import('../../architecture/js/intake-run.js');
  const { createHash } = await import('node:crypto');
  const samples = [new Uint8Array(0), new TextEncoder().encode('abc'), new Uint8Array(55).fill(7), new Uint8Array(56).fill(9), new Uint8Array(64).fill(1), new Uint8Array(1000).map((_, i) => i * 31)];
  for (const b of samples) { const want = createHash('sha256').update(b).digest('hex'); assert.equal(sha256Js(b), want, `${b.length} bytes`); assert.equal(await sha256(b), want); }
});
