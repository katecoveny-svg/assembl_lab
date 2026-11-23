// The existing buildings round an opened model (plan-studio/twins/src/twin/contextRules.ts): LINZ outlines read, put in the
// scene, and given a height from the LiDAR tops grid, or an assumed one. Invented outlines only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { outlinesUrl, parseOutlines, heightFromTops, toSceneRings, ASSUMED_HEIGHT } from '../../plan-studio/twins/src/twin/contextRules.ts';

const sq = (x, z, w) => [[x, z], [x + w, z], [x + w, z + w], [x, z + w], [x, z]];

test('the outlines query asks LINZ for buildings round the point, in NZTM', () => {
  const u = new URL(outlinesUrl(-41.29, 174.78, 200));
  assert.match(u.hostname, /arcgis\.com$/); assert.equal(u.searchParams.get('outSR'), '2193'); assert.equal(u.searchParams.get('distance'), '200');
});

test('outlines are read; an error from LINZ is said in words', () => {
  const list = parseOutlines({ features: [{ attributes: { building_id: 7, name: '', use_: 'Unknown' }, geometry: { rings: [sq(0, 0, 10)] } }, { attributes: { building_id: 8 } }] });
  assert.equal(list.length, 1); assert.equal(list[0].id, '7'); assert.equal(list[0].use, null);
  assert.throws(() => parseOutlines({ error: { message: 'bad' } }), /bad/);
});

test('height: the 80th percentile of the tops inside the outline; null where the grid does not reach or nothing stands clear', () => {
  const n = 51, heights = new Array(n * n).fill(0);
  // a 10 m block 6 m tall at x, z 0..10 on a 100 m grid centred on 0, 0 (2 m cells)
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const x = -50 + i * 2, z = -50 + j * 2; if (x >= 0 && x <= 10 && z >= 0 && z <= 10) heights[j * n + i] = 6; }
  const T = { centre: [0, 0], size: 100, n, heights };
  assert.equal(heightFromTops(sq(0, 0, 10), T), 6);
  assert.equal(heightFromTops(sq(-30, -30, 8), T), null, 'nothing standing there');
  assert.equal(heightFromTops(sq(200, 200, 8), T), null, 'outside the grid');
  assert.equal(heightFromTops(sq(0, 0, 10), null), null);
  assert.equal(ASSUMED_HEIGHT, 5);
});

test('outlines into the scene, leaving out what stands under the model', () => {
  const list = [{ id: 'a', name: null, use: null, rings: [sq(1000, 2000, 10)] }, { id: 'b', name: null, use: null, rings: [sq(1100, 2000, 10)] }];
  const got = toSceneRings(list, (e, n) => [e - 1000, -(n - 2000)], { x0: -2, x1: 12, z0: -12, z1: 2 });
  assert.deepEqual(got.map((g) => g.o.id), ['b']);
  assert.deepEqual(got[0].ring[0], [100, -0]);
});
