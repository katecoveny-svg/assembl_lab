// "Send to a project": the 3D page hands the model and its run report to the ops page (/architecture/) through the tab's
// session storage. This checks the two sides agree on the key and the shape, that the ops page refuses a report whose
// model is another version, and what it adds to a project. Run with:  node --test tests/plan-run/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PLAN_RUN_KEY, PLAN_RUN_TYPE, RUN_REPORT_TYPE, RUN_STANDING, readPlanRun, runReportDocument, runReportStage, runReportFileName, newProject } from '../../architecture/js/model.js';
import { modelFingerprint } from '../../architecture/js/fingerprint.js';
import { REPORT_TYPE, STANDING, buildReport, reportText, runSteps, namesStep, checkStep, holdsPoint } from '../../plan-studio/twins/src/twin/planRun.ts';

const root = new URL('../../', import.meta.url);
const src = readFileSync(new URL('plan-studio/twins/src/twin/planRunUI.ts', root), 'utf8');
const plan = { schema: 'assembl.plan-model.v1', job: { title: 'A made-up house', drawings: 'Set B' }, revision: { current: 'B' }, buildings: [{ id: 'h', levels: [{ walls: [], rooms: [{ id: 'R1', name: 'Living', nameSrc: 'printed' }] }] }], site: { features: [] } };

async function entry(p = plan) {
  const results = await runSteps([{ id: 'names', run: () => namesStep(p) }, { id: 'check', run: (d) => checkStep(d) }]);
  const report = buildReport({ plan: p, fingerprint: modelFingerprint(p), tool: 'twin-test.js', ranAt: new Date('2026-11-22T03:00:00Z'), results });
  // the same shape the 3D page writes (planRunUI.ts, sendToProject)
  return { type: 'assembl.plan-run-handoff.v1', name: `${p.job.title}.plan.json`, fingerprint: report.model.fingerprint, plan: p, report, text: reportText(report) };
}

test('both sides use the same key, entry type, report type and standing sentence', () => {
  assert.equal(src.match(/HANDOFF_KEY = '([^']+)'/)?.[1], PLAN_RUN_KEY);
  assert.match(src, new RegExp(`type: '${PLAN_RUN_TYPE.replace(/\./g, '\\.')}'`), 'the 3D page writes the entry type the ops page reads');
  assert.match(src, /JSON\.stringify\(\{ type: 'assembl\.plan-run-handoff\.v1', name: .*, fingerprint: r\.model\.fingerprint, plan: withPlan \? plan : null, report: r, text: reportText\(r\) \}\)/);
  assert.match(src, /window\.open\(OPS_PAGE, '_blank'\)/, 'opened with its opener, so the new tab starts with a copy of this tab’s session storage');
  assert.doesNotMatch(src, /noopener/, 'noopener would stop the copy');
  assert.equal(src.match(/OPS_PAGE = '([^']+)'/)?.[1], '/architecture/?from=plan-run');
  assert.equal(RUN_REPORT_TYPE, REPORT_TYPE);
  assert.equal(RUN_STANDING, STANDING);
});

test('the ops page reads what the 3D page writes, and the version code survives the trip', async () => {
  const e = await entry(), h = readPlanRun(JSON.stringify(e), modelFingerprint);
  assert.equal(h.fingerprint, modelFingerprint(plan));
  assert.equal(h.title, 'A made-up house'); assert.equal(h.revision, 'B');
  assert.equal(modelFingerprint(JSON.parse(h.planText)), h.fingerprint, 'the model attached is the version the report names');
  assert.match(h.summary, /^2 steps: 1 done, 1 need a person, 0 not run, 0 failed\./);
  assert.match(h.text, /It is not a compliance decision or a professional sign-off\./);
  // a report that came without its model (too big to pass across) is still read
  const lone = readPlanRun(JSON.stringify({ ...e, plan: null }), modelFingerprint);
  assert.equal(lone.plan, null); assert.equal(lone.planText, null);
});

test('anything else is refused in plain words, and nothing is added', async () => {
  const e = await entry();
  assert.throws(() => readPlanRun('not json', modelFingerprint), /not readable/);
  assert.throws(() => readPlanRun(JSON.stringify({ ...e, type: 'x' }), modelFingerprint), /not a run report/);
  assert.throws(() => readPlanRun(JSON.stringify({ ...e, fingerprint: 'abc' }), modelFingerprint), /does not say which model version/);
  const other = { ...plan, revision: { current: 'C' } };
  assert.throws(() => readPlanRun(JSON.stringify({ ...e, plan: other }), modelFingerprint), /not the version the report was run on/);
});

test('on the project: a Report document named for the model version, dated, in a design stage, with the standing sentence', async () => {
  const h = readPlanRun(JSON.stringify(await entry()), modelFingerprint);
  const b = newProject({ name: 'Test project', now: '2026-11-22T00:00:00Z' });
  assert.equal(runReportStage(b), 'concept', 'a new project is in Predesign: the report goes to Concept design');
  for (const k of ['predesign', 'concept']) b.stages.find((s) => s.key === k).status = 'done';
  b.stages.find((s) => s.key === 'developed').status = 'in_progress';
  assert.equal(runReportStage(b), 'developed');
  const d = runReportDocument(b.project.id, 'concept', h, '2026-11-22T05:00:00Z');
  assert.equal(d.kind, 'Report'); assert.equal(d.version, h.fingerprint); assert.equal(d.date, '2026-11-22'); assert.equal(d.stage, 'concept');
  assert.equal(d.title, 'Plan set check: A made-up house');
  assert.match(d.note, /^A pre-check prepared by software for a person to review\. It is not a compliance decision or a professional sign-off\./);
  assert.ok(d.note.length <= 400);
  assert.equal(runReportFileName(h), `plan-run-${h.fingerprint}-2026-11-22.txt`);
  assert.equal(holdsPoint(d, { lat: -36.859, lon: 174.7775 }), false);
});
