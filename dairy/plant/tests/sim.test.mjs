// Headless checks for the dairy plant floor's model (no rendering): run with `node --test dairy/plant/tests/`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Sim, ASSUME } from '../sim.js';

const day = o => { const s = new Sim(o); s.run(86400, 0.5); return s; };
const base = day({ month: 4, bays: 4, forklifts: 2 });

test('the season model\'s own figures are the inputs', () => {
  assert.equal(ASSUME.peakLitres, 4.4e6); assert.equal(ASSUME.tankerLitres, 28000); assert.equal(ASSUME.litresPerKg, 7.5);
  assert.equal(ASSUME.dryerTph, 30); assert.equal(ASSUME.boxTonnes, 22); assert.equal(ASSUME.share[4], 13.5);
});
test('an October day takes about the season model\'s milk and makes about its powder', () => {
  const m = base.metrics();
  assert.ok(Math.abs(m.perDay - 4.4e6 / 28000) < 1e-9);
  assert.ok(m.litres > 3.9e6 && m.litres < 5.0e6, `litres ${m.litres}`);
  assert.ok(m.powderT > 520 && m.powderT < 640, `powder ${m.powderT}`);   // 4.4 M L / 7.5 L a kg = 587 t
});
test('nothing is lost: every pallet is somewhere, and the store never overfills', () => {
  for (const p of base.pallets.values()) assert.ok(p.where, `pallet ${p.id} has no place`);
  const inStore = base.slots.filter(x => x !== null);
  assert.equal(new Set(inStore).size, inStore.length); for (const id of inStore) assert.ok(base.pallets.has(id));
});
test('the same settings give the same day twice', () => {
  assert.deepEqual(day({ month: 4, bays: 4, forklifts: 2 }).metrics(), base.metrics());
});
test('levers move the queues the way they should', () => {
  const three = day({ month: 4, bays: 3, forklifts: 2 }).metrics(), five = day({ month: 4, bays: 5, forklifts: 2 }).metrics(), one = day({ month: 4, bays: 4, forklifts: 1 }).metrics();
  assert.ok(three.longWaits > base.metrics().longWaits && five.longWaits < base.metrics().longWaits);
  assert.ok(one.boxes < base.metrics().boxes, 'one forklift ships fewer containers');
  assert.ok(day({ month: 1, bays: 4, forklifts: 2 }).metrics().tankersIn < 40, 'July is quiet');
});
