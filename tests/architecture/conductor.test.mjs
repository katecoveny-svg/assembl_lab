// The conductor (architecture/js/conductor.js): a job's steps run in order, one retry for a free step, and a paid step is never run
// again unless a person says so. Offline, no page.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createJob, runJob, approve, retry, recover, jobStatus, summary, STATUS, LOG_LIMIT } from '../../architecture/js/conductor.js';

let t = 0; const now = () => new Date(Date.UTC(2026, 10, 23, 0, 0, t++)).toISOString();
const mk = (steps) => createJob({ id: 'j1', kind: 'intake', project_id: 'p1', steps }, now);

test('steps run in order and the job ends done, with a log of each step', async () => {
  const order = [], job = mk([{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }]);
  await runJob(job, { a: async () => { order.push('a'); return { note: 'did a' }; }, b: async () => { order.push('b'); } }, { now });
  assert.deepEqual(order, ['a', 'b']);
  assert.equal(job.status, STATUS.done);
  assert.deepEqual(job.steps.map((s) => s.status), ['done', 'done']);
  assert.equal(job.steps[0].note, 'did a');
  assert.ok(job.log.some((l) => l.step === 'a' && l.event === 'running') && job.log.some((l) => l.step === 'b' && l.event === 'done'));
  assert.ok(job.log.every((l) => l.at && 'text' in l));
});

test('a free step that fails is run once more; if it works the second time the job goes on', async () => {
  let n = 0; const job = mk([{ id: 'a' }, { id: 'b' }]);
  await runJob(job, { a: async () => { if (++n === 1) throw new Error('flaky'); }, b: async () => {} }, { now });
  assert.equal(n, 2); assert.equal(job.steps[0].attempts, 2); assert.equal(job.status, STATUS.done);
  assert.ok(job.log.some((l) => l.event === 'failed once' && l.text === 'flaky'));
});

test('a free step that fails twice is failed with its reason, and later steps do not run', async () => {
  let n = 0, later = 0; const job = mk([{ id: 'a' }, { id: 'b' }]);
  await runJob(job, { a: async () => { n++; throw new Error('no network'); }, b: async () => { later++; } }, { now });
  assert.equal(n, 2, 'one retry, no more');
  assert.equal(job.steps[0].status, STATUS.failed); assert.equal(job.steps[0].reason, 'no network');
  assert.equal(job.steps[1].status, STATUS.waiting); assert.equal(later, 0); assert.equal(job.status, STATUS.failed);
});

test('a paid step waits for a person and does not run on its own', async () => {
  let calls = 0; const job = mk([{ id: 'a' }, { id: 'pay', paid: true }, { id: 'z' }]);
  const h = { a: async () => {}, pay: { approval: () => '3 sheets, 3 paid requests.', run: async ({ paid }) => { paid(); calls++; } }, z: async () => {} };
  await runJob(job, h, { now });
  assert.equal(calls, 0);
  assert.equal(job.steps[1].status, STATUS.person); assert.equal(job.steps[1].reason, '3 sheets, 3 paid requests.'); assert.equal(job.steps[2].status, STATUS.waiting);
  assert.equal(job.status, STATUS.person);
  await runJob(job, h, { now }); assert.equal(calls, 0, 'running the job again does not approve anything');
  assert.throws(() => approve(job, 'pay', ''), /person/);
  assert.throws(() => approve(job, 'pay', '   '), /person/);
  approve(job, 'pay', 'Kate', now);
  await runJob(job, h, { now });
  assert.equal(calls, 1); assert.equal(job.steps[1].calls, 1); assert.equal(job.steps[1].approved_by, 'Kate'); assert.equal(job.status, STATUS.done);
  assert.equal(summary(job).paid_calls, 1);
});

test('a paid step that fails is not retried by the conductor; only a person can run it again', async () => {
  let calls = 0; const job = mk([{ id: 'pay', paid: true }]);
  const h = { pay: { run: async ({ paid }) => { paid(); calls++; throw new Error('provider out'); } } };
  await runJob(job, h, { now });
  approve(job, 'pay', 'Kate', now);
  await runJob(job, h, { now });
  assert.equal(calls, 1, 'one paid request, no automatic second');
  assert.equal(job.steps[0].status, STATUS.failed); assert.match(job.steps[0].reason, /provider out/);
  assert.ok(job.log.some((l) => l.event === 'failed' && /not run again until a person says so/.test(l.text)));
  await runJob(job, h, { now }); assert.equal(calls, 1, 'running the job again does not retry a paid step');
  assert.throws(() => retry(job, 'pay', ''), /person/);
  retry(job, 'pay', 'Kate', now);
  await runJob(job, h, { now });
  assert.equal(calls, 2); assert.equal(job.steps[0].calls, 2); assert.equal(job.steps[0].status, STATUS.failed);
});

test('a step that is not needed is marked done without running, and without asking a person (even a paid one)', async () => {
  let ran = 0; const job = mk([{ id: 'pay', paid: true }, { id: 'z' }]);
  await runJob(job, { pay: { when: () => false, run: async () => { ran++; } }, z: async () => {} }, { now });
  assert.equal(ran, 0); assert.equal(job.steps[0].status, STATUS.done); assert.equal(job.steps[0].note, 'not needed'); assert.equal(job.status, STATUS.done);
});

test('a job is not run twice at once', async () => {
  let release; const job = mk([{ id: 'a' }]);
  const first = runJob(job, { a: () => new Promise((r) => { release = r; }) }, { now });
  await assert.rejects(() => runJob(job, { a: async () => {} }, { now }), /already running/);
  release(); await first; assert.equal(job.status, STATUS.done);
});

test('a step with no handler fails with a reason; retry needs the step to be failed', async () => {
  const job = mk([{ id: 'a' }]);
  await runJob(job, {}, { now });
  assert.equal(job.steps[0].status, STATUS.failed); assert.ok(job.steps[0].reason);
  assert.throws(() => retry(job, 'nope', 'Kate'), /no such step/);
  const j2 = mk([{ id: 'a' }]); assert.throws(() => retry(j2, 'a', 'Kate'), /Only a failed step/);
});

test('a job read back after the page closed mid-step shows that step as failed, and keeps what it knew', async () => {
  const job = mk([{ id: 'a' }, { id: 'b' }]);
  job.steps[0].status = STATUS.done; job.steps[1].status = STATUS.running;
  const back = recover(JSON.parse(JSON.stringify(job)), now);
  assert.equal(back.steps[1].status, STATUS.failed); assert.match(back.steps[1].reason, /closed/); assert.equal(back.status, STATUS.failed);
  assert.equal(recover({ v: 2 }), null); assert.equal(recover(null), null);
});

test('the job is plain data: it survives JSON, and the log is capped', async () => {
  const job = mk([{ id: 'a' }]);
  await runJob(job, { a: async ({ log }) => { for (let i = 0; i < LOG_LIMIT + 50; i++) log(`line ${i}`); } }, { now });
  assert.equal(job.log.length, LOG_LIMIT); assert.equal(JSON.parse(JSON.stringify(job)).steps[0].status, 'done');
  assert.equal(jobStatus(job), STATUS.done);
});

test('a job needs steps with their own ids', () => {
  assert.throws(() => createJob({ id: 'x', kind: 'k', steps: [] }), /steps/);
  assert.throws(() => createJob({ id: 'x', kind: 'k', steps: [{ id: 'a' }, { id: 'a' }] }), /own id/);
});
