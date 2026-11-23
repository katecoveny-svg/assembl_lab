// The ops page's Agents section (architecture/js/agents.js): where the interior agent's rooms come from, the steps the conductor
// runs (a paid judgement only when asked, a person's approval), and the hand-back from the 3D page. Offline, no page.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { roomsFor, readHandback, INTERIOR_STEPS, HANDBACK_KEY, HANDBACK_TYPE } from '../../architecture/js/agents.js';
import { projectPanels, ADDONS } from '../../architecture/js/modules.js';
import { SAMPLE_ID } from '../../architecture/js/model.js';
import * as R from '../../architecture/js/agents/interior-rules.js';
import { CATALOGUE } from '../../plan-studio/twins/src/twin/library/catalogue.ts';

const root = new URL('../../', import.meta.url);
const hero = readFileSync(new URL('plan-studio/twins/drop/hero.plan.json', root), 'utf8');
const fakeFetch = async () => new Response(hero);

test('the section is on each project\'s Model tab, loaded with the page', () => {
  assert.ok(ADDONS.includes('./agents.js'));
  const p = projectPanels().find((x) => x.id === 'agents');
  assert.equal(p.tab, 'model'); assert.equal(p.title, 'Agents');
});

test('the steps: rooms, rules, a paid judgement, and a person\'s approval', () => {
  assert.deepEqual(INTERIOR_STEPS.map((s) => s.id), ['rooms', 'propose', 'judge', 'approve']);
  assert.equal(INTERIOR_STEPS.find((s) => s.id === 'judge').paid, true);
  assert.equal(INTERIOR_STEPS.find((s) => s.id === 'approve').person, true);
});

test('the sample: rooms with shapes and walls from its plan model, and a proposal that passes its checks', async () => {
  const got = await roomsFor({ store: {} }, { id: SAMPLE_ID, sample: true }, fakeFetch);
  assert.ok(got.rooms.length >= 8 && got.rooms.every((r) => r.box && r.box_src));
  assert.ok(got.walls.length >= 8);
  const p = R.propose(got.rooms, CATALOGUE, { walls: got.walls });
  assert.deepEqual(R.validateProposal(p, CATALOGUE, { walls: got.walls }), []);
  assert.ok(R.totals(p).placed > 5);
});

test('a project with a kept IFC: its spaces\' names and areas (no shapes); none, and it says there are no rooms', async () => {
  const files = [
    { name: 'old.ifc', created_at: '2026-11-01', extra: { ifc: { spaces: { list: [{ name: '1', long_name: 'Old room', net_m2: 9 }] } } } },
    { name: 'new.ifc', created_at: '2026-11-20', extra: { ifc: { spaces: { list: [{ name: '01', long_name: 'Bedroom 1', net_m2: 12.5 }, { name: '02', long_name: '', net_m2: null, gross_m2: 30 }] } } } },
  ];
  const ctx = { store: { listFiles: async () => files } };
  const got = await roomsFor(ctx, { id: 'p1' });
  assert.deepEqual(got.rooms, [{ name: 'Bedroom 1', area_m2: 12.5, area_src: 'from the file' }, { name: '02', area_m2: 30, area_src: 'from the file' }]);
  assert.match(got.from, /new\.ifc/);
  const none = await roomsFor({ store: { listFiles: async () => [] } }, { id: 'p2' });
  assert.deepEqual(none.rooms, []);
});

test('the hand-back: this project\'s own first, then one from a model opened from Models; anything else is ignored', () => {
  const m = new Map(), st = { getItem: (k) => m.get(k) ?? null };
  assert.equal(readHandback('p1', st), null);
  m.set(`${HANDBACK_KEY}:latest`, JSON.stringify({ type: HANDBACK_TYPE, project: 'latest', at: '2026-11-23T01:00:00Z', look: { score: 80 } }));
  assert.equal(readHandback('p1', st).key, `${HANDBACK_KEY}:latest`);
  m.set(`${HANDBACK_KEY}:p1`, JSON.stringify({ type: HANDBACK_TYPE, project: 'p1', at: '2026-11-23T02:00:00Z' }));
  assert.equal(readHandback('p1', st).key, `${HANDBACK_KEY}:p1`);
  m.set(`${HANDBACK_KEY}:p2`, 'not json'); m.delete(`${HANDBACK_KEY}:latest`);
  assert.equal(readHandback('p2', st), null);
  m.set(`${HANDBACK_KEY}:p3`, JSON.stringify({ type: 'other', project: 'p3' }));
  assert.equal(readHandback('p3', st), null);
});
