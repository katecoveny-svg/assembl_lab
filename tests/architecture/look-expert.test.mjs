// The 3D look expert's scoring (architecture/js/agents/look-rules.js, the same file the 3D page builds): measures in, a short scored
// checklist out, the critique kept to its schema, and the report always for a person. Offline, no page. Run with:
//   node --test tests/architecture/look-expert.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../../architecture/js/agents/look-rules.js';

const GOOD = {
  floating: [], buried: [], windows: 8, glassless: [], frameless: [], shadowMap: true, shadowLights: 1, casters: 900, solids: 1000,
  plants: 40, inBand: [], greyDefaults: [], frameMs: { median: 22, tier: 'phone', where: 'test' },
  views: { 'three-quarter': { ok: true }, entry: { ok: true }, aerial: { ok: true } },
};
const res = (r, id) => r.items.find((i) => i.id === id).result;

test('a scene that meets every check scores 100 and is still for a person', () => {
  const r = L.scoreLook(GOOD);
  assert.equal(r.score, 100); assert.equal(r.measured, r.of);
  assert.equal(r.status, 'for a person');
  assert.deepEqual(L.validateReport(r), []);
  assert.equal(r.versions.rules, L.LOOK_VERSION);
  assert.ok(r.items.every((i) => i.result === 'pass' && i.src), 'each item says where it was measured');
});

test('each fault fails its own line, with what was found', () => {
  const r = L.scoreLook({ ...GOOD, floating: ['Sofa'], buried: ['Pōhutukawa'], glassless: ['Window 3'], frameless: ['W1', 'W2', 'W3'], inBand: ['Harakeke'], greyDefaults: ['a', 'b', 'c', 'd'], shadowMap: false, frameMs: { median: 80 }, views: { 'three-quarter': { ok: true }, entry: { ok: false }, aerial: { ok: true } } });
  for (const id of ['rest', 'glass', 'frames', 'planting', 'materials', 'shadows', 'frametime', 'views']) assert.equal(res(r, id), 'fail', id);
  assert.match(r.items.find((i) => i.id === 'rest').value, /1 floating: Sofa; 1 buried: Pōhutukawa/);
  assert.match(r.items.find((i) => i.id === 'views').value, /entry/);
  assert.equal(r.score, 0);
});

test('near misses are "check", not a pass: one frame in ten missing, a few grey parts, a slowish frame, few shadow casters', () => {
  const r = L.scoreLook({ ...GOOD, windows: 10, frameless: ['W9'], greyDefaults: ['a'], frameMs: { median: 40 }, casters: 100 });
  for (const id of ['frames', 'materials', 'frametime', 'shadows']) assert.equal(res(r, id), 'check', id);
  assert.ok(r.score > 0 && r.score < 100);
});

test('what was not measured is never a pass, and does not count in the score', () => {
  const r = L.scoreLook({ floating: [], buried: [] });
  assert.equal(res(r, 'rest'), 'pass');
  assert.equal(r.items.filter((i) => i.result === 'not measured').length, r.of - 1);
  assert.equal(r.score, 100); assert.equal(r.measured, 1);
  assert.equal(L.scoreLook({}).score, null);
  assert.equal(res(L.scoreLook({ ...GOOD, plants: 0 }), 'planting'), 'not measured');
  assert.equal(res(L.scoreLook({ ...GOOD, windows: 0 }), 'glass'), 'not measured');
});

test('the critique: scores kept to 1 to 5, five short notes at most, marked a model\'s opinion; match is null with no render', () => {
  const c = L.cleanCritique({ scores: { materials: 9, light: 0, composition: 3.46, realism: 'x', match: null }, notes: Array.from({ length: 8 }, (_, i) => `note ${i}   with   spaces`), summary: 'Fine.' });
  assert.deepEqual(c.scores, { materials: 5, light: 1, composition: 3.5, realism: null, match: null });
  assert.equal(c.notes.length, 5); assert.equal(c.notes[0], 'note 0 with spaces');
  assert.equal(c.src, 'model opinion');
  const r = L.scoreLook(GOOD, { scores: { materials: 4, light: 4, composition: 5, realism: 3, match: 2 }, notes: [], summary: '', prompts: L.CRITIQUE_PROMPTS });
  assert.equal(r.score, 100, 'the critique does not move the measured score');
  assert.equal(r.critique.scores.match, 2); assert.equal(r.versions.prompt, L.CRITIQUE_PROMPTS);
  assert.deepEqual(L.validateReport(r), []);
});

test('a report that says it approves, or has a bad result, is rejected', () => {
  const r = L.scoreLook(GOOD);
  assert.ok(L.validateReport({ ...r, status: 'approved' }).some((e) => /never approves/.test(e)));
  assert.ok(L.validateReport({ ...r, items: [{ id: 'x', result: 'great' }] }).length);
  assert.ok(L.validateReport({ ...r, score: 140 }).length);
  assert.deepEqual(L.validateReport(null), ['not a look review']);
});

test('the limits are numbers with their source', () => {
  for (const [k, v] of Object.entries(L.LIMITS)) assert.equal(v.src, 'assumed', k);
  assert.equal(L.LIMITS.band.m, 1.8, 'the same clear band as model-dress');
  assert.deepEqual(L.VIEWS, ['three-quarter', 'entry', 'aerial']);
});
