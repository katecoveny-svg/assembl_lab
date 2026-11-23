// roof-solar · the 3D view's drawing data (look.mjs): trees and roofs come from the LiDAR grids, sized as measured. Invented sample grids.
import test from 'node:test';
import assert from 'node:assert/strict';
import { canopyTrees, drawRoof, roofCap, buildingMask, CROWN_BASE } from '../../roof-solar/look.mjs';

// a 60 m square, 1 m cells, ground at 10 m sloping 0.05 m per metre east
const N = 60, originE = 1000, originN = 2000;
const grid = (f) => { const data = new Float32Array(N * N); for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) data[j * N + i] = f(originE + i, originN - j); return { n: N, originE, originN, data }; };
const groundZ = (e) => 10 + 0.05 * (e - originE);
// a gable house: outline 1010..1022 east, 1980..1990 north, eaves 3 m up, ridge along east-west at north 1985, 2.5 m higher
const house = { id: 1, rings: [[[1010, 1980], [1022, 1980], [1022, 1990], [1010, 1990], [1010, 1980]]] };
const inHouse = (e, n) => e >= 1010 && e <= 1022 && n >= 1980 && n <= 1990;
const roofZ = (e, n) => groundZ(e) + 3 + 2.5 * (1 - Math.abs(n - 1985) / 5);
// a tree: a cone 9 m tall, crown radius 4 m, centred at 1040, 1970
const treeZ = (e, n) => { const d = Math.hypot(e - 1040, n - 1970); return d < 4 ? groundZ(e) + 9 * (1 - d / 4 * 0.6) : -Infinity; };
const dem = grid((e) => groundZ(e));
const dsm = grid((e, n) => Math.max(inHouse(e, n) ? roofZ(e, n) : groundZ(e), treeZ(e, n)));

test('trees: one tree, its top the measured top, its crown about as wide as measured, none on the house', () => {
  const trees = canopyTrees(dsm, dem, [house]);
  const tall = trees.filter((t) => t.kind === 'tree');
  assert.equal(tall.length, 1);
  const t = tall[0];
  assert.ok(Math.hypot(t.e - 1040, t.n - 1970) <= 1, 'top where the canopy is highest');
  assert.ok(Math.abs(t.top - (groundZ(1040) + 9)) < 0.01, 'top is the measured surface');
  assert.ok(t.radius > 2.5 && t.radius < 5.5, `crown radius ${t.radius}`);
  assert.ok(Math.abs(t.base - (t.ground + t.height * CROWN_BASE.tree)) < 1e-9, 'crown base is the stated assumption');
  for (const x of trees) assert.ok(!inHouse(x.e, x.n), 'no tree inside an outline');
});

test('mask: the house and a metre round it', () => {
  const m = buildingMask(dsm, [house], 1);
  const at = (e, n) => m[(originN - n) * N + (e - originE)];
  assert.equal(at(1015, 1985), 1); assert.equal(at(1009, 1985), 1); assert.equal(at(1007, 1985), 0);
});

test('roof: planes found and drawn at the fitted height, ridge kept, cap above the ridge', () => {
  const r = drawRoof(dsm, house.rings);
  assert.ok(r.planes.length >= 2, `planes ${r.planes.length}`);
  for (const [e, n] of [[1013, 1982], [1019, 1988], [1016, 1983.5]]) { const z = r.roofAt(e, n).z; assert.ok(Math.abs(z - roofZ(e, n)) < 0.08, `roof at ${e},${n}: ${z} vs ${roofZ(e, n)}`); }
  const ridge = r.roofAt(1016, 1985).z; assert.ok(Math.abs(ridge - roofZ(1016, 1985)) < 0.3, `ridge ${ridge}`);
  const cap = roofCap(dsm, house.rings, r.planes, r.grid); assert.ok(cap > roofZ(1022, 1985) && cap < roofZ(1022, 1985) + 2, `cap ${cap}`);
});
