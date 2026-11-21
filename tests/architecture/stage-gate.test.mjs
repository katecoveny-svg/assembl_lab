import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STAGES, STAGE_KEYS, newProject, sampleProject, gate, askForApproval, backToWork, recordApproval, markDone, nextAction, closingStatement,
  closingApprovals, currentStage, allDone, statusMark, HOSTED_MODELS,
} from '../../architecture/js/model.js';

const T0 = '2026-11-22T00:00:00.000Z';
const fresh = () => newProject({ name: 'Test house', client: 'A client', now: T0 });

test('there are seven stages, in the order the brief names them', () => {
  assert.deepEqual(STAGES.map((s) => s.label), ['Predesign', 'Concept design', 'Developed design', 'Detailed design', 'Contract administration', 'Project observation', 'Completion']);
});

test('a new project starts in Predesign with the other six stages to come', () => {
  const b = fresh();
  assert.equal(b.project.stage, 'predesign');
  assert.deepEqual(b.stages.map((s) => s.status), ['in_progress', 'not_started', 'not_started', 'not_started', 'not_started', 'not_started', 'not_started']);
  assert.equal(b.stages[0].started_at, T0);
  assert.ok(b.tasks.length > 0 && b.tasks.every((t) => t.status === 'todo' && t.project_id === b.project.id));
  assert.ok(b.checklist.some((c) => c.list === 'consent') && b.checklist.some((c) => c.list === 'completion'));
  assert.throws(() => newProject({ name: ' ' }), /name/);
});

test('a stage cannot be marked done without a closing approval', () => {
  const b = fresh();
  assert.equal(gate(b, 'predesign').ok, false);
  assert.throws(() => markDone(b, 'predesign', T0), /named person/);
  askForApproval(b, 'predesign', T0);
  assert.equal(gate(b, 'predesign').ok, false, 'asking for approval is not an approval');
  assert.throws(() => markDone(b, 'predesign', T0), /named person/);
  assert.equal(b.stages[0].status, 'awaiting_approval');
});

test('an approval needs a named person', () => {
  const b = fresh();
  assert.throws(() => recordApproval(b, 'predesign', { who: '', role: 'Registered architect' }, T0), /name/);
  assert.throws(() => recordApproval(b, 'predesign', { who: ' K ', role: 'Registered architect' }, T0), /name/);
  assert.equal(b.approvals.length, 0);
  // a nameless row slipped in from elsewhere does not open the gate either
  b.approvals.push({ id: 'a1', stage: 'predesign', who: '', role: 'Other', what: closingStatement('predesign'), note: '', at: T0, fingerprint: '' });
  assert.equal(gate(b, 'predesign').ok, false);
});

test('an approval of something else, or on another stage, does not close the stage', () => {
  const b = fresh();
  b.approvals.push({ id: 'a1', stage: 'predesign', who: 'Aroha Example', role: 'Other', what: 'This may be shown to the client', note: '', at: T0, fingerprint: '' });
  b.approvals.push({ id: 'a2', stage: 'concept', who: 'Aroha Example', role: 'Other', what: closingStatement('concept'), note: '', at: T0, fingerprint: '' });
  assert.equal(gate(b, 'predesign').ok, false);
});

test('with a named closing approval the stage can be marked done and the next one starts', () => {
  const b = fresh();
  askForApproval(b, 'predesign', T0);
  const a = recordApproval(b, 'predesign', { who: 'Test Person', role: 'Registered architect', note: 'by phone' }, '2026-11-22T01:00:00.000Z');
  assert.equal(a.what, closingStatement('predesign'));
  assert.equal(a.stage, 'predesign'); assert.equal(a.who, 'Test Person'); assert.equal(a.at, '2026-11-22T01:00:00.000Z'); assert.equal(a.fingerprint, '');
  assert.equal(gate(b, 'predesign').ok, true);
  const r = markDone(b, 'predesign', '2026-11-22T02:00:00.000Z');
  assert.equal(r.stage.status, 'done'); assert.equal(r.stage.done_at, '2026-11-22T02:00:00.000Z');
  assert.equal(r.next.key, 'concept'); assert.equal(r.next.status, 'in_progress'); assert.equal(r.next.started_at, '2026-11-22T02:00:00.000Z');
  assert.equal(b.project.stage, 'concept');
  assert.throws(() => markDone(b, 'predesign', T0), /already done/);
});

test('a stage that has not started cannot be approved or marked done', () => {
  const b = fresh();
  assert.throws(() => recordApproval(b, 'concept', { who: 'Test Person', role: 'Other' }, T0), /not started/);
  assert.throws(() => markDone(b, 'concept', T0), /not started/);
  assert.throws(() => askForApproval(b, 'concept', T0), /in progress/);
  assert.equal(gate(b, 'nope').ok, false);
});

test('awaiting approval can go back to in progress', () => {
  const b = fresh();
  askForApproval(b, 'predesign', T0); backToWork(b, 'predesign', T0);
  assert.equal(b.stages[0].status, 'in_progress');
  assert.throws(() => backToWork(b, 'predesign', T0));
});

test('on a model stage an approval only counts on the model version it was made on', () => {
  const b = fresh();
  recordApproval(b, 'predesign', { who: 'Test Person', role: 'Other' }, T0); markDone(b, 'predesign', T0);
  b.project.model = { fingerprint: 'aaaaaaaaaaaa', drawings: 'd', revision: 'A', file_name: 'a.json' };
  const a = recordApproval(b, 'concept', { who: 'Test Person', role: 'Registered architect' }, T0);
  assert.equal(a.fingerprint, 'aaaaaaaaaaaa');
  assert.equal(gate(b, 'concept').ok, true);
  b.project.model.fingerprint = 'bbbbbbbbbbbb'; // the model is replaced
  const g = gate(b, 'concept');
  assert.equal(g.ok, false); assert.match(g.reason, /changed since the approval/);
  assert.equal(closingApprovals(b, 'concept').stale.length, 1);
  assert.throws(() => markDone(b, 'concept', T0), /changed since the approval/);
  recordApproval(b, 'concept', { who: 'Test Person', role: 'Registered architect' }, T0);
  assert.equal(gate(b, 'concept').ok, true);
});

test('all seven stages can be walked to the end, one approval each', () => {
  const b = fresh();
  for (const key of STAGE_KEYS) {
    assert.equal(currentStage(b).key, key);
    askForApproval(b, key, T0); recordApproval(b, key, { who: 'Test Person', role: 'Owner or client' }, T0); markDone(b, key, T0);
  }
  assert.equal(allDone(b), true); assert.equal(currentStage(b), null);
  assert.equal(b.project.stage, 'completion');
  assert.equal(b.approvals.length, 7);
  assert.equal(nextAction(b).kind, 'pack');
});

test('what to do next is one action, and it follows the work', () => {
  const b = fresh();
  assert.equal(nextAction(b).kind, 'tool', 'first: look up the site facts');
  b.project.site = { lat: -36.8, lon: 175.08, facts: [{ id: 'site.zone', label: 'Planning zone', status: 'live' }], fetched_at: T0 };
  assert.equal(nextAction(b).kind, 'tasks');
  for (const t of b.tasks.filter((t) => t.stage === 'predesign')) t.status = 'done';
  assert.equal(nextAction(b).kind, 'ask');
  askForApproval(b, 'predesign', T0);
  assert.equal(nextAction(b).kind, 'approve');
  recordApproval(b, 'predesign', { who: 'Test Person', role: 'Other' }, T0);
  assert.equal(nextAction(b).kind, 'done');
  markDone(b, 'predesign', T0);
  const n = nextAction(b);
  assert.equal(n.kind, 'tool'); assert.equal(n.stage, 'concept'); assert.match(n.text, /plan model/);
});

test('the sample is labelled, links the hosted example model, and has nothing made up in it', () => {
  const b = sampleProject(T0);
  assert.equal(b.project.sample, true);
  assert.equal(b.project.name, 'A house on Waiheke Island');
  assert.equal(b.project.client, '', 'no invented client');
  assert.equal(b.project.model.fingerprint, HOSTED_MODELS[0].fingerprint);
  assert.equal(b.project.site.lat, null, 'no site point ships with the sample');
  assert.equal(b.approvals.length, 0, 'no approvals are made up');
  assert.equal(b.activity.length, 0);
  assert.doesNotMatch(JSON.stringify(b), /\b(road|street|avenue|drive|lane)\b/i, 'no street address');
});

test('status is a filled or open square with a word', () => {
  assert.equal(statusMark('task', 'done'), '■ Done');
  assert.equal(statusMark('task', 'todo'), '□ To do');
  assert.equal(statusMark('stage', 'awaiting_approval'), '□ Awaiting approval');
  assert.equal(statusMark('stage', 'done'), '■ Done');
  assert.equal(statusMark('rfi', 'sent'), '□ Sent');
});
