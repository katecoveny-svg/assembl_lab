// State-model harness for the café twin. Written BEFORE the 3D/GLB change so that the change cannot alter the
// business behaviour: queue, orders, kitchen tickets, the pass, drinks, tables, cabinet stock and specials, the bin,
// the week P&L and the proof ledger are compared with a golden baseline generated from the unmodified page.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadCafe, modelSource, modelHash, baseline, traceDay, snapshot, PAGE } from './cafe-harness.mjs';

const golden = JSON.parse(readFileSync(new URL('./golden/cafe-model-baseline.json', import.meta.url), 'utf8'));
const html = readFileSync(PAGE, 'utf8');
const K = loadCafe();

test('the business model script is byte-identical to the baseline (3D work must not touch it)', () => {
  assert.equal(modelHash(modelSource(html)), golden.modelSha256);
});

test('every behaviour snapshot matches the golden baseline (queue, pass, kitchen, tables, stock, P&L, proof)', () => {
  const now = baseline(K);
  for (const k of Object.keys(now)) assert.deepEqual(JSON.parse(JSON.stringify(now[k])), golden[k], k);
});

test('the model is deterministic: the same settings give the same day twice', () => {
  const a = traceDay(K, { ...K.BASE }, 2, 15), b = traceDay(K, { ...K.BASE }, 2, 15);
  assert.deepEqual(a, b);
});

test('a lever changes outcomes, not the customers (arrivals drawn lever-free)', () => {
  const a = K.newDay({ ...K.BASE }, 1), b = K.newDay({ ...K.BASE, ...K.PROPOSED, deposits: false }, 1);
  assert.deepEqual(a.parties.map(p => [p.type, p.size, Math.round(p.arr * 1000)]), b.parties.map(p => [p.type, p.size, Math.round(p.arr * 1000)]));
});

test('operational state the 3D scene reads stays within its physical meaning through a busy day', () => {
  for (const [S, dow] of [[{ ...K.BASE }, 5], [{ ...K.BASE, station: true }, 5], [{ ...K.BASE, mode: 'dinner' }, 4]]) {
    const d = K.newDay(S, dow), M = K.MODES[S.mode];
    while (d.t < M.end) {
      K.step(S, d);
      const [, q, , , , tickets, pass, drinks] = snapshot(K, S, d);
      assert.ok(q >= 0 && tickets >= 0 && pass >= 0 && drinks >= 0);
      assert.equal(d.tables.length, 14);
      d.tables.forEach(T => assert.ok(['free', 'seated', 'ordered', 'eating', 'paying', 'held', 'reset'].includes(T.state), T.state));
      Object.values(d.stock).forEach(v => assert.ok(v >= 0));
      assert.ok(d.binKg >= 0);
    }
  }
});

test('honesty labels are not removed: Simulated / Live / Proposed / Estimate / Source and key statements', () => {
  // Copy may be shorter or move into the decision adapter. Check evidence boundaries,
  // rather than requiring the old long page to repeat every label a fixed number of times.
  const surface = html + readFileSync(new URL('../decision-workbench.mjs', import.meta.url), 'utf8');
  for (const label of ['Simulated', 'SIMULATED', 'Live', 'Proposed', 'PROPOSED', 'Estimate', 'Source', 'Vendor claim', 'Your data'])
    assert.ok(surface.includes(label), label);
  for (const boundary of ['Fictional NZ venue · simulated outcomes', 'not measured savings', 'They do not replace the simulation or connect to your POS.'])
    assert.ok(surface.includes(boundary), boundary);
  for (const s of ['Nothing here is running today: each row is a', "These are the twin's results on estimated inputs, not evidence.",
    'A generic, fictional venue, not a real one.', 'Files are read inside this browser tab. Nothing is uploaded or sent anywhere.',
    'Independent assembl concept. Simulated data unless explicitly stated otherwise.', 'truth: SIMU'])
    assert.ok(html.includes(s), s);
});

test('assistance authority levels are unchanged (Observe, Recommend, Act with approval, Act within limits)', () => {
  assert.ok(html.includes('const LEVELS = [["Observe", "Watches and reports. Changes nothing."], ["Recommend", "Suggests a change with its reasons. A person decides."], ["Act with approval", "Prepares the change; it goes ahead when a person approves it."], ["Act within limits", "Acts on its own inside limits the owner set, and logs every action."]];'));
});
