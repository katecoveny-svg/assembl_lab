// The full check of a plan set (plan-studio/twins/src/twin/planRun.ts): the order of the steps, their statuses, a failing
// step not stopping the others, the report's shape and version code, and the site point kept out of the report.
// Run with:  node --test tests/plan-run/*.test.mjs   (Node 22.18 or later strips the TypeScript types as it loads)
// The models here are made up or the lab's own public example; none is a client's house.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  STEPS, STATUSES, STANDING, AGENTS, REPORT_TYPE, square, runSteps, drawingsStep, namesStep, groundStep, factsStep, factLines, codeStep, checkStep,
  buildReport, reportText, reportFileName, holdsPoint, planCounts, scaleConfirmed,
} from '../../plan-studio/twins/src/twin/planRun.ts';
import { runCodeChecks } from '../../plan-studio/twins/src/twin/codeChecks.ts';
import { modelFingerprint } from '../../architecture/js/fingerprint.js';

const root = new URL('../../', import.meta.url);
const hero = JSON.parse(readFileSync(new URL('plan-studio/twins/drop/hero.plan.json', root), 'utf8'));
const POINT = { lat: -36.859, lon: 174.7775 };   // Auckland Domain: a public place, used only as a test point

/** a made-up box with three rooms, one of them named from what is drawn */
function box() {
  const wall = (id, axis, at, to, openings = []) => ({ id, axis, at, from: 0, to, out: 1, thickness: 0.14, source: 'traced', openings });
  return {
    schema: 'assembl.plan-model.v1', job: { title: 'Made-up test box', drawings: 'none: a test' },
    buildings: [{ id: 'b', name: 'Box', origin: [0, 0], floorLevel: 0.6, roof: { type: 'gable', pitchDeg: 15, source: 'assumed' }, levels: [{
      plate: 2.4, walls: [wall('N', 'x', 0, 8, [{ kind: 'window', a: 1, b: 2, sill: 0.9, head: 2.1, source: 'traced' }]), wall('S', 'x', 6, 8), wall('W', 'z', 0, 6), wall('E', 'z', 8, 6, [{ kind: 'door', a: 1, b: 1.9, sill: 0, head: 2.1, source: 'traced' }])],
      partitions: [{ id: 'P1', axis: 'z', at: 4, from: 0, to: 6, openings: [{ kind: 'door', a: 2, b: 2.8 }] }],
      rooms: [
        { id: 'R1', name: 'Bedroom', nameSrc: 'printed', printed: 'Bedroom', u: 0.14, v: 0.14, w: 3.8, d: 5.7, source: 'traced' },
        { id: 'R2', name: 'Bathroom', nameSrc: 'drawn', printed: '?', u: 4.1, v: 0.14, w: 2, d: 2, source: 'traced' },
        { id: 'R3', name: 'Living', nameSrc: 'person', printed: 'Lounge', u: 4.1, v: 2.2, w: 3.8, d: 3.6, source: 'traced' },
      ],
    }] }],
  };
}
const RECORD = (fp, over = {}) => ({
  v: 1, fingerprint: fp, at: '2026-11-22T03:00:00.000Z', file: { kind: 'pdf', pages: 6 }, seconds: 2.4,
  plan: { page: 3, title: 'Ground Floor Plan', reader: 'linework', scale: '1:100 from the title block, agreeing with 9 dimension strings (within 0.6%).', plans: 1 },
  sheets: [{ page: 1, title: 'Site Plan', role: 'site', model: 'test-model', ok: true }, { page: 5, title: 'Elevations', role: 'elevation', ok: false, note: 'the AI plan reader was not asked to read it' }],
  skipped: 3, heights: { plate: { value: 2.4, from: 'assumed' }, floor: { value: 0.6, from: 'assumed' }, roof: { type: 'gable', pitch: 15, from: 'assumed' } },
  site: { read: true, kinds: ['path', 'deck'] }, notes: [], ...over,
});
/** a site answer shaped like the lab's feed, with things in it that would point to the site */
const FACTS = {
  parcel: { id: 'site.parcel', label: 'Land parcel at this point', status: 'live', value: 736721, unit: 'm² (LINZ calculated area)', asOf: '2026-11-03', values: { parcelId: 6567129, outline: { type: 'Polygon', coordinates: [[[174.7775, -36.859], [174.778, -36.8595]]] } }, source: { name: 'LINZ' } },
  zone: { id: 'site.zone', label: 'Planning zone', status: 'live', value: 'Residential - Single House Zone', asOf: '2026-11-20', source: { name: 'Auckland Council' } },
  overlays: { id: 'site.overlays', label: 'Planning overlays at this point', status: 'live', value: 1, values: { hits: [{ overlay: 'Historic Heritage extent of place', schedule: '1566', name: 'A named heritage place' }] }, source: { name: 'Auckland Council' } },
  weather: { id: 'site.weather', label: 'Weather now', status: 'live', value: 19.7, unit: '°C', values: { gridCell: { lat: -36.871704, lon: 174.78947 } } },
  landslideLarge: { id: 'site.landslideLarge', label: 'Large-scale landslide susceptibility (2025)', status: 'live', value: 'Very High', asOf: '2025-09-16' },
  tsunami: { id: 'site.tsunami', label: 'Tsunami evacuation zone', status: 'error', reason: 'the council map did not answer' },
  nzs3604Zones: { id: 'site.nzs3604Zones', label: 'Wind, earthquake, exposure and snow zones (NZS 3604)', status: 'not-wired', reason: 'Not wired: terms.', needs: 'A written yes from BRANZ, or a person reading the zones off BRANZ Maps for the site.' },
  elevation: { id: 'site.elevation', label: 'Ground height at the point', status: 'not-wired', reason: 'In the model already: the 3D twin holds the LINZ 1 m LiDAR height grid for the site.' },
};
const GROUND_READ = { kind: 'read', survey: 'Auckland LiDAR 1m DEM (2024)', flown: { from: '2024-01-10', to: '2024-03-02' }, readOn: '2026-11-22', seconds: 6.2, floorRule: 'Floor level 52.10 m (NZVD2016): 0.45 m above the highest surveyed ground under the house (51.65 m), so no ground is cut. Assumed until you set it.', under: { min: 50.1, max: 51.65 }, placement: { turnTag: 'assumed', moveTag: 'assumed', floorTag: 'assumed' }, tops: true, boundary: 'drawn', emptyCells: 0 };

test('six steps, in the order the brief sets, with only the four statuses', () => {
  assert.deepEqual(STEPS.map((s) => s.id), ['drawings', 'names', 'ground', 'facts', 'code', 'check']);
  assert.deepEqual(STATUSES, ['done', 'needs a person', 'not run', 'failed']);
  assert.equal(square('done'), '■');
  for (const s of ['needs a person', 'not run', 'failed', 'running', 'waiting']) assert.equal(square(s), '□', s);
});

test('the steps run in order, each timed, and a step that throws is failed with its reason while the rest still run', async () => {
  let t = 0; const now = () => (t += 250), seen = [];
  const defs = [
    { id: 'drawings', run: () => ({ status: 'done', summary: 'a', lines: [], check: ['check a'] }) },
    { id: 'names', run: async () => { throw new Error('the names could not be read'); } },
    { id: 'ground', run: () => ({ status: 'banana', summary: 'x', lines: [], check: [] }) },
    { id: 'facts', run: () => ({ status: 'failed', summary: 'x', lines: [], check: [] }) },
    { id: 'code', run: () => ({ status: 'needs a person', reason: 'two lines', summary: 'c', lines: ['l'], check: ['check c', 'check a'] }) },
    { id: 'check', run: (done) => checkStep(done) },
  ];
  const out = await runSteps(defs, (done, running) => seen.push([done.length, running]), now);
  assert.deepEqual(out.map((r) => r.id), STEPS.map((s) => s.id), 'every step ran, in order');
  assert.deepEqual(out.map((r) => r.status), ['done', 'failed', 'failed', 'failed', 'needs a person', 'needs a person']);
  assert.equal(out[1].reason, 'the names could not be read');
  assert.match(out[2].reason, /no status it is allowed \(banana\)/, 'an unknown status is a failure, never shown as done');
  assert.match(out[3].reason, /failed without saying why/, 'a failure always says why');
  assert.ok(out.every((r) => r.ms === 250), 'each step is timed');
  assert.deepEqual(seen.slice(0, 4), [[0, 'drawings'], [1, null], [1, 'names'], [2, null]], 'the checklist is told before and after each step');
  // the last step gathers what a person must check from every step, once each
  const list = out[5].lines;
  assert.equal(list.filter((l) => l === 'check a').length, 1, 'gathered once');
  assert.ok(list.includes('check c'));
  assert.ok(list.some((l) => /Names failed \(the names could not be read\)|Room names failed/.test(l)), 'a failed step asks a person to do it');
  assert.match(list[list.length - 1], /Agents prepare, people approve/);
});

test('drawings: a read from linework with a confirmed scale is done; an unconfirmed scale needs a person; a model file was not read', () => {
  const plan = box(), fp = modelFingerprint(plan);
  const a = drawingsStep(plan, RECORD(fp));
  assert.equal(a.status, 'done');
  assert.ok(a.lines.some((l) => /sheet 3 \(“Ground Floor Plan”\), measured from its linework, in this browser/.test(l)));
  assert.ok(a.lines.some((l) => /Scale: 1:100 from the title block, agreeing with 9 dimension strings/.test(l)));
  assert.ok(a.lines.some((l) => /4 outside walls, 1 inside wall, 3 openings, 3 rooms/.test(l)), 'counts of walls, openings and rooms');
  assert.ok(a.check.some((c) => /Assumed, not read: ceiling 2.40 m, floor 0.60 m above the ground, roof gable/.test(c)), 'assumed heights flagged');
  assert.ok(a.check.some((c) => /No car bay was found on the site plan\. The reader often misses parking/.test(c)), 'parking flagged when the site plan has none');
  assert.ok(a.check.some((c) => /Sheet 5 \(elevations\) was not read/.test(c)));
  const ai = drawingsStep(plan, RECORD(fp, { plan: { page: 2, title: 'Plan', reader: 'ai', model: 'gpt-test', rev: '2026-11-22b', scale: '1:100 from the title block (no dimension strings to check it against).', plans: 1 } }));
  assert.equal(ai.status, 'needs a person');
  assert.ok(ai.lines.some((l) => /AI plan reader on the lab’s server \(model gpt-test, prompts 2026-11-22b\)/.test(l)), 'which reader, with the model name');
  assert.ok(ai.check.some((c) => /± about 150 mm/.test(c)));
  assert.equal(scaleConfirmed('From the 7.2 m length you gave.'), true);
  assert.equal(scaleConfirmed('No scale on the sheet and no dimension strings: give one length.'), false);
  const file = drawingsStep(hero, null);
  assert.equal(file.status, 'not run');
  assert.match(file.reason, /opened as a plan model file/);
  assert.ok(file.lines.some((l) => /Drawings the model names: Draft set printed 17 November 2026/.test(l)));
});

test('room names: printed, suggested and set by a person are told apart, and a suggestion needs a person', () => {
  const r = namesStep(box());
  assert.equal(r.status, 'needs a person');
  assert.match(r.lines[0], /3 rooms: 1 printed on the drawing, 1 suggested from what is drawn, 1 named by a person/);
  assert.ok(r.check.some((c) => /Check the 1 suggested room name against the drawing: Bathroom/.test(c)));
  const p = box(); p.buildings[0].levels[0].rooms[1].nameSrc = 'person';
  assert.equal(namesStep(p).status, 'done');
  const blank = box(); blank.buildings[0].levels[0].rooms[0].name = '?';
  assert.ok(namesStep(blank).check.some((c) => /no name/.test(c)));
  assert.match(namesStep(hero).lines[0], /10 rooms: 10 named in the model file \(where each came from is not recorded\)/);
});

test('ground: no point asks for one; LINZ ground says which survey, when and the floor rule; its own ground is said so', () => {
  const none = groundStep({ kind: 'none' });
  assert.equal(none.status, 'needs a person');
  assert.equal(none.summary, 'Give the site point to put the house on real ground.');
  const read = groundStep(GROUND_READ);
  assert.equal(read.status, 'done');
  assert.ok(read.lines.some((l) => /Auckland LiDAR 1m DEM \(2024\), flown 2024-01-10 to 2024-03-02\. Read by this browser straight from LINZ on 2026-11-22 in 6.2 s/.test(l)));
  assert.ok(read.lines.some((l) => /0.45 m above the highest surveyed ground/.test(l)), 'the floor rule');
  assert.ok(read.check.some((c) => /floor level follows a rule/.test(c)) && read.check.some((c) => /North is taken as up the sheet/.test(c)));
  assert.equal(groundStep({ kind: 'unavailable', reason: 'LINZ has no 1 m cover here.' }).status, 'needs a person');
  assert.equal(groundStep({ kind: 'bad-point' }).status, 'needs a person');
  const own = groundStep({ kind: 'own', source: hero.site.terrain.source, pointGiven: true });
  assert.equal(own.status, 'done');
  assert.ok(own.check.some((c) => /check the point is this site/.test(c)));
});

test('site facts: which are live and which are not connected, with anything that points to the site left out', () => {
  const L = factLines(FACTS), by = Object.fromEntries(L.map((f) => [f.id, f]));
  assert.equal(by.zone.state, 'live'); assert.equal(by.zone.value, 'Residential - Single House Zone');
  assert.equal(by.nzs3604Zones.state, 'not connected');
  assert.equal(by.tsunami.state, 'no answer');
  assert.match(by.parcel.value, /not copied here/); assert.match(by.weather.value, /not copied here/);
  assert.match(by.overlays.value, /1 overlay at or near the point: Historic Heritage extent of place/);
  const s = factsStep({ kind: 'fetched', facts: FACTS });
  assert.equal(s.status, 'done');
  assert.equal(s.summary, '5 live, 2 not connected, 1 no answer.');
  assert.ok(s.check.some((c) => c === 'Not connected, so look them up by hand: Wind, earthquake, exposure and snow zones (NZS 3604).'), 'the ground height is left to the ground step');
  const text = JSON.stringify(s);
  for (const bad of ['736721', '6567129', 'A named heritage place', '1566', '174.78947', '-36.871704', '174.7775']) assert.ok(!text.includes(bad), `left out: ${bad}`);
  assert.ok(s.check.some((c) => /not proof the site cannot be affected/.test(c)));
  assert.equal(factsStep({ kind: 'none' }).status, 'not run');
  assert.throws(() => factsStep({ kind: 'fetched', facts: {} }), /no facts/);
});

test('code pre-check: counts of the four results, and every “does not meet” line listed first with its citation', () => {
  const checks = runCodeChecks(hero), r = codeStep(checks, 'the model’s own surveyed ground');
  const n = (s) => checks.filter((c) => c.status === s).length;
  assert.equal(r.summary, `${n('meets the cited figure')} meet · ${n('does not meet the cited figure')} do not meet · ${n('cannot tell from this model')} cannot tell · ${n('not applicable')} not applicable.`);
  const fails = checks.filter((c) => c.status === 'does not meet the cited figure');
  const firstFail = r.lines.findIndex((l) => l.startsWith('□ Does not meet'));
  if (fails.length) {
    assert.equal(r.status, 'needs a person');
    assert.equal(firstFail, 2, 'straight after the counts and the ground line');
    for (const l of r.lines.filter((x) => x.startsWith('□ Does not meet'))) assert.match(l, /Cited: .+, https:\/\/(www\.building\.govt\.nz|www\.legislation\.govt\.nz)\//);
  } else assert.equal(r.status, 'done');
  assert.ok(!JSON.stringify(r).match(/\bcomplies\b|\bcompliant\b/i), 'never says complies');
  // a made-up stair that is too steep does not meet D1/AS1 and is listed with its clause
  const steep = { ...box(), site: { fall: { at: [0, 0], y: 0, slopeX: 0, slopeZ: 0, source: 'assumed' }, features: [{ kind: 'steps', pts: [[10, 0], [11, 0]], levels: [0, 1.0], width: 1, risers: 5, going: 0.2, handrails: 1, source: 'written' }] } };
  const s2 = codeStep(runCodeChecks(steep), 'the model’s own fall plane');
  assert.ok(s2.lines.some((l) => /□ Does not meet: .*riser.* Cited: D1\/AS1 Table 6/.test(l)), 'the riser over 190 mm is listed with D1/AS1 Table 6');
});

test('the report: its type, the plain standing sentence, the version code of the exact model, dated files, no site point', async () => {
  const fp = modelFingerprint(hero);
  assert.equal(fp, '99eea08ce8e9', 'the example’s version code, as the ops page records it');
  const saved = JSON.parse(JSON.stringify(hero)); saved.site.terrain.point = { lat: POINT.lat, lon: POINT.lon };   // a person saved the plan with its point
  const defs = [
    { id: 'drawings', run: () => drawingsStep(saved, null) },
    { id: 'names', run: () => namesStep(saved) },
    { id: 'ground', run: () => groundStep(GROUND_READ) },
    { id: 'facts', run: () => factsStep({ kind: 'fetched', facts: FACTS }) },
    { id: 'code', run: () => codeStep(runCodeChecks(saved), 'LINZ ground') },
    { id: 'check', run: (done) => checkStep(done) },
  ];
  const results = await runSteps(defs);
  const r = buildReport({ plan: saved, fingerprint: fp, tool: 'twin-test.js', ranAt: new Date('2026-11-22T03:04:05Z'), results });
  assert.equal(r.type, REPORT_TYPE); assert.equal(REPORT_TYPE, 'assembl.plan-run.v1');
  assert.equal(r.standing, 'A pre-check prepared by software for a person to review. It is not a compliance decision or a professional sign-off.');
  assert.equal(STANDING, r.standing);
  assert.deepEqual(Object.keys(r), ['type', 'standing', 'model', 'ranAt', 'seconds', 'steps', 'personMustCheck', 'agents', 'privacy']);
  assert.equal(r.model.fingerprint, fp); assert.equal(r.model.revision, 'A'); assert.equal(r.model.title, 'A house on Waiheke Island');
  assert.deepEqual(r.steps.map((s) => s.id), STEPS.map((s) => s.id));
  for (const s of r.steps) { assert.ok(STATUSES.includes(s.status)); assert.equal(s.square, s.status === 'done' ? '■' : '□'); assert.equal(typeof s.seconds, 'number'); }
  assert.ok(r.personMustCheck.length >= 5);
  assert.equal(r.agents, AGENTS); assert.match(AGENTS, /No agent drafts replies, lodges anything or approves anything/);
  assert.equal(reportFileName(r, 'txt'), 'plan-run-99eea08ce8e9-2026-11-22.txt');
  assert.equal(reportFileName(r, 'json'), 'plan-run-99eea08ce8e9-2026-11-22.json');
  const t = reportText(r);
  assert.match(t, /^Plan set check: run report\nA pre-check prepared by software for a person to review\. It is not a compliance decision or a professional sign-off\./);
  assert.match(t, /version 99eea08ce8e9/);
  assert.match(t, /Before relying on it, a person checks:\n\[ \] /);
  // the point: not in the report or its text, though the plan holds it and the facts carried things near it
  assert.equal(holdsPoint(r, POINT), false);
  assert.equal(holdsPoint(t, POINT), false);
  assert.equal(holdsPoint({ x: 'at -36.8590, 174.7775' }, POINT), true, 'the guard does catch the point');
  assert.equal(holdsPoint({ x: 'at 36.859 S' }, POINT), true, 'with or without its sign');
  assert.equal(holdsPoint(r, null), false);
  assert.ok(!JSON.stringify(r).includes('736721') && !JSON.stringify(r).includes('6567129'), 'nothing of the parcel');
});

test('counts of what the model holds', () => {
  assert.deepEqual(planCounts(box()), { buildings: 1, outside: 4, inside: 1, openings: 3, rooms: 3, decks: 0, features: 0 });
  const c = planCounts(hero);
  assert.equal(c.rooms, 10); assert.equal(c.outside, 4); assert.equal(c.openings >= 13, true);
});
