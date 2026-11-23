import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyFlight, newShot, timeline } from '../../plan-studio/twins/src/twin/flightPath.ts';
import { proofWindow, proofDigest } from '../../plan-studio/twins/src/twin/cameraProof.ts';

const route = { ...emptyFlight('synthetic'), shots: [
  newShot('A', { x: -5, z: -5, dwell: 8 }), newShot('B', { x: 5, z: -5 }),
] };
test('proof from a real flight timeline starts near its cursor, includes motion, and never runs past the end', () => {
  const t = timeline(route, () => 0);
  assert.throws(() => proofWindow(t, 0), /no camera movement/);
  assert.deepEqual(proofWindow(t, 8), { start: 8, duration: 5 });
  assert.deepEqual(proofWindow(t, t.duration), { start: t.duration - 5, duration: 5 });
});
test('proof refuses tiny clips and recognises a pan that returns to its original view', () => {
  const make = (duration) => ({ duration, at: (t) => ({ eye: [0, 1.6, 0], look: [Math.cos(t * Math.PI / 2), 1.6, Math.sin(t * Math.PI / 2)] }) });
  assert.throws(() => proofWindow(make(2), 0), /at least three seconds/);
  assert.deepEqual(proofWindow(make(4), 0), { start: 0, duration: 4 });
});
test('captures bind the exact payload to the receipt', async () => {
  const bytes = new Blob(['abc']);
  assert.equal(await proofDigest(bytes), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.notEqual(await proofDigest(new Blob(['abd'])), await proofDigest(bytes));
});
