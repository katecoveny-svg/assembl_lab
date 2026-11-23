// The building's own bounds in an opened model (plan-studio/twins/src/twin/modelBounds.ts): far-off strays and site surfaces
// do not make the camera frame an empty field. Invented boxes only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildingBounds } from '../../plan-studio/twins/src/twin/modelBounds.ts';

const part = (x, z, w = 2, h = 3, y = 0) => [x, y, z, x + w, y + h, z + w];

test('a building of many parts with a few strays far off: the box is the building', () => {
  const parts = [];
  for (let i = 0; i < 60; i++) parts.push(part(-130 + (i % 10) * 5, -500 + Math.floor(i / 10) * 5, 2, 8, 50));
  parts.push(part(-260, -650), part(70, -360), part(-130, -360));   // strays a hundred metres and more away
  parts.push([-400, 40, -900, 200, 52, -200]);                        // a site surface, hundreds of metres across
  const { box, left } = buildingBounds(parts);
  assert.equal(left, 4);
  assert.deepEqual(box.map(Math.round), [-130, 50, -500, -83, 58, -473]);
});

test('few parts, or none out of place: the plain box round everything', () => {
  const few = [part(0, 0), part(100, 100)];
  assert.deepEqual(buildingBounds(few).box, [0, 0, 0, 102, 3, 102]);
  const tidy = Array.from({ length: 20 }, (_, i) => part(i, i));
  assert.equal(buildingBounds(tidy).left, 0);
  assert.equal(buildingBounds([part(0, 0, 1), [NaN, 0, 0, 1, 1, 1]]).kept, 1);
});
