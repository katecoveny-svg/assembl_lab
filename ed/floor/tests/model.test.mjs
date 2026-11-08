// The ED floor draws the department page's model unchanged. These values were produced by the original inline script
// in ed/index.html before it moved to ed/sim.js; if they change, the model changed. Run: `node --test ed/floor/tests/`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ED } from '../../sim.js';

test('a normal week matches the original page\'s model exactly', () => {
  assert.deepEqual(ED.week({ ...ED.BASE }, 11), { within6: 0.7137718396711202, medWait: 17, board: 11.4375, ramped: 1.255952380952381, visits: 1946, diverted: 0 });
});
test('a changed week matches too (fast-track and eight doctors)', () => {
  assert.deepEqual(ED.week({ ...ED.BASE, fastTrack: true, doctors: 8 }, 3), { within6: 0.8840653728294178, medWait: 4, board: 12.608630952380953, ramped: 0.27232142857142855, visits: 1958, diverted: 0 });
});
test('the floor has a place for every space the model has', async () => {
  const L = await import('../layout.js');
  assert.equal(L.CUBICLES.length, ED.BASE.cubicles); assert.equal(L.RESUS.length, ED.BASE.resus); assert.equal(L.MINORS.length, ED.BASE.ftChairs); assert.equal(L.SEATS.length, 40);
});
