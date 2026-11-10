import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCafe } from './cafe-harness.mjs';
import { compareWeeks, decisionBrief, DECISIONS } from '../decision-workbench.mjs';
const K = loadCafe();
const money = n => '$' + n.toFixed(0), fmt = (n, d = 0) => n.toFixed(d);

test('the desk compares the selected combination, including overlapping effects, against a matched baseline', () => {
  const state = { ...K.BASE, demand: 1.2, roster: true, waste: true };
  const baseline = K.week({ ...state, ...K.AS_IS }), current = K.week(state);
  const rows = compareWeeks(baseline, current);
  assert.equal(rows.find(r => r.key === 'ebitda').delta, current.ebitda - baseline.ebitda);
  assert.notEqual(rows.find(r => r.key === 'ebitda').delta, K.proof(state).w, 'must not advertise all changes when only two are active');
  for (const key of ['wasteKg', 'walked', 'hours']) assert.equal(rows.find(r => r.key === key).after, current[key]);
  assert.ok(compareWeeks(baseline, baseline).every(r => r.delta === 0));
});

test('decision brief records active mode-compatible changes, assumptions and a human review boundary', () => {
  const state = { ...K.BASE, mode: 'dinner', station: true, waste: true };
  const baseline = K.week({ ...state, ...K.AS_IS }), current = K.week(state);
  const text = decisionBrief({ state, baseline, current, levers: K.LEVERS, weather: 'Dry week', money, fmt });
  assert.ok(text.includes('Waste tracking and prep planning'));
  assert.ok(!text.includes('Second grinder'));
  for (const required of ['DRAFT · FOR MANAGER REVIEW', 'not measured savings', 'not imported venue files', 'equipment purchase', 'No roster, price, order or connected system has been changed.']) assert.ok(text.includes(required), required);
  assert.ok(text.includes(`${money(baseline.ebitda)} → ${money(current.ebitda)}`));
  for (const d of DECISIONS) assert.ok(K.LEVERS.find(l => l.k === d.key).modes.includes('dinner'));
});
