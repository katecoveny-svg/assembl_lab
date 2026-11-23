// The existing buildings round an opened model (plan-studio/twins/src/twin/contextRules.ts): LINZ outlines read, put in the
// scene, and given a height from the LiDAR tops grid, or an assumed one. Invented outlines only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { outlinesUrl, parseOutlines, heightFromTops, toSceneRings, ASSUMED_HEIGHT, outlineRadius, readOutlines, heightFromGrids, gridWindow, finishFor, orientedBox, polyArea, PAGE } from '../../plan-studio/twins/src/twin/contextRules.ts';
import { buildingBounds } from '../../plan-studio/twins/src/twin/modelBounds.ts';

const sq = (x, z, w) => [[x, z], [x + w, z], [x + w, z + w], [x, z + w], [x, z]];

test('the outlines query asks LINZ for buildings round the point, in NZTM', () => {
  const u = new URL(outlinesUrl(-41.29, 174.78, 200));
  assert.match(u.hostname, /arcgis\.com$/); assert.equal(u.searchParams.get('outSR'), '2193'); assert.equal(u.searchParams.get('distance'), '200');
  assert.equal(new URL(outlinesUrl(-41.29, 174.78)).searchParams.get('distance'), '300', 'the default reaches 300 m');
  assert.equal(new URL(outlinesUrl(-41.29, 174.78, 300, 1000)).searchParams.get('resultOffset'), '1000');
  assert.equal(outlineRadius(0), 300); assert.equal(outlineRadius(400), 400); assert.equal(outlineRadius(5000), 600);
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

test('the 0-buildings fault: a topography mesh in the file no longer hides every outline round the model', () => {
  // an invented model: twelve wall parts of a 20 x 12 m building, and one 400 m topography surface as Revit exports it
  const parts = [];
  for (let i = 0; i < 12; i++) parts.push([i * 1.6, 0, 0, i * 1.6 + 1.6, 6, 0.3], [i * 1.6, 0, 11.7, i * 1.6 + 1.6, 6, 12]);
  parts.push([-200, -2, -200, 200, 0, 200]);
  const all = parts.reduce((a, b) => [Math.min(a[0], b[0]), 0, Math.min(a[2], b[2]), Math.max(a[3], b[3]), 0, Math.max(a[5], b[5])]);
  const own = buildingBounds(parts).box;
  // outlines 40 to 150 m off, in a scene where NZTM e, n = x + 1000, −z + 2000
  const list = [40, 80, 150].map((d, k) => ({ id: String(k), name: null, use: null, rings: [sq(1000 + d, 2000 - d, 10)] }));
  const toScene = (e, n) => [e - 1000, -(n - 2000)];
  const byAll = toSceneRings(list, toScene, { x0: all[0], x1: all[3], z0: all[2], z1: all[5] });
  const byOwn = toSceneRings(list, toScene, { x0: own[0] - 2, x1: own[3] + 2, z0: own[2] - 2, z1: own[5] + 2 });
  assert.equal(byAll.length, 0, 'the box round everything left every outline out (the fault)');
  assert.equal(byAll.left, 3);
  assert.equal(byOwn.length, 3, 'the building\'s own box leaves them in');
});

test('outlines are read a page at a time while LINZ says there are more', async () => {
  const asked = [];
  const get = async (u) => { const off = Number(new URL(u).searchParams.get('resultOffset')); asked.push(off); const f = (k) => ({ attributes: { building_id: off + k }, geometry: { rings: [sq(k, 0, 5)] } });
    return off === 0 ? { features: [f(1), f(2)], exceededTransferLimit: true } : { features: [f(3)] }; };
  const r = await readOutlines(-41, 174, 300, get);
  assert.deepEqual(asked, [0, PAGE]); assert.equal(r.list.length, 3); assert.equal(r.complete, true);
});

test('heights from LINZ DSM less DEM inside an outline (NZTM, 1 m cells); null where the grids do not reach', () => {
  const n = 101, dem = { n, originE: 999.5, originN: 2100.5, data: new Float32Array(n * n).fill(20) }, dsm = { ...dem, data: new Float32Array(n * n).fill(20) };
  // a 10 x 10 m roof 7 m above the ground, cells e 1010..1020, n 2060..2070
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) { const e = dem.originE + c, nn = dem.originN - r; if (e >= 1010 && e <= 1020 && nn >= 2060 && nn <= 2070) dsm.data[r * n + c] = 27; }
  const ring = [[1010, 2060], [1020, 2060], [1020, 2070], [1010, 2070], [1010, 2060]];
  assert.equal(heightFromGrids(ring, dsm, dem), 7);
  assert.equal(heightFromGrids(ring.map(([e, nn]) => [e + 500, nn]), dsm, dem), null, 'outside the grids');
  assert.equal(heightFromGrids(ring, null, dem), null);
  const w = gridWindow([{ rings: [ring] }, { rings: [ring.map(([e, nn]) => [e + 100, nn])] }]);
  assert.equal(w.e, 1065); assert.equal(w.half, 57);
});

test('finishes by rule: weatherboard and a pitched roof for a small house, brick and a low roof for a large school block', () => {
  const house = finishFor({ id: 'h1', use: null }, sq(0, 0, 12));
  assert.equal(house.cladding, 'weatherboard'); assert.equal(house.roof, 'gable');
  const mid = finishFor({ id: 'h2', use: null }, [[0, 0], [24, 0], [24, 14], [0, 14], [0, 0]]);
  assert.equal(mid.cladding, 'brick'); assert.equal(mid.roof, 'hip');
  const school = finishFor({ id: 's', use: 'School' }, [[0, 0], [60, 0], [60, 20], [0, 20], [0, 0]]);
  assert.equal(school.cladding, 'brick'); assert.equal(school.roof, 'low');
  const ell = finishFor({ id: 'l', use: null }, [[0, 0], [12, 0], [12, 4], [4, 4], [4, 12], [0, 12], [0, 0]]);
  assert.equal(ell.roof, 'low', 'an L-shaped outline is not given a made-up pitched roof');
  assert.equal(finishFor({ id: 'h1', use: null }, sq(0, 0, 12)).wall, house.wall, 'the same building gets the same colour each time');
  const ob = orientedBox([[0, 0], [10, 10], [5, 15], [-5, 5], [0, 0]]);
  assert.ok(Math.abs(ob.L - Math.hypot(10, 10)) < 1e-6 && Math.abs(ob.W - Math.hypot(5, 5)) < 1e-6);
  assert.equal(polyArea(sq(0, 0, 10)), 100);
});
