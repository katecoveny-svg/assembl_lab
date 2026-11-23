// Placing an opened model by matching a building it carries to a LINZ outline (plan-studio/twins/src/twin/placeFit.ts).
// Invented footprints only: no real outline, model or place.
import test from 'node:test';
import assert from 'node:assert/strict';
import { hull, area, fitFootprint, bestMatch, placementFrom, clusters, existingGroup, normalPlacement, placementFits, plan } from '../../plan-studio/twins/src/twin/placeFit.ts';

const rect = (w, d) => [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]];
const ell = () => [[0, 0], [20, 0], [20, 8], [8, 8], [8, 16], [0, 16]];
const move = (r, phi, t) => r.map(([x, y]) => [x * Math.cos(phi) - y * Math.sin(phi) + t[0], x * Math.sin(phi) + y * Math.cos(phi) + t[1]]);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

test('hull and area', () => {
  assert.equal(area(hull([[0, 0], [4, 0], [4, 3], [0, 3], [2, 1]])), 12);
});

test('an L-shaped footprint is found again after a turn and a move, to millimetres', () => {
  const phi = 0.61, t = [1758000.5, 5919000.25], b = move(ell(), phi, t);
  const f = fitFootprint(ell(), b);
  assert.ok(f.rms < 0.01, `rms ${f.rms}`);
  assert.ok(Math.abs(wrap(f.phi - phi)) < 1e-3);
  assert.ok(Math.abs(f.t[0] - t[0]) < 0.01 && Math.abs(f.t[1] - t[1]) < 0.01);
  assert.equal(f.second, null, 'an L is not symmetric: one turn only');
});

test('a noisy outline still fits, and the residual says how far off it is', () => {
  const phi = -1.2, t = [500, 800], b = move(ell(), phi, t).map(([x, y], i) => [x + (i % 2 ? 0.3 : -0.3), y + (i % 3 ? 0.2 : -0.2)]);
  const f = fitFootprint(ell(), b);
  assert.ok(f.rms > 0.05 && f.rms < 0.5, `rms ${f.rms}`);
  assert.ok(Math.abs(wrap(f.phi - phi)) < 0.05);
});

test('a plain rectangle fits, and the 180° alternative is flagged as a guess', () => {
  const f = fitFootprint(rect(18, 9), move(rect(18, 9), 0.3, [10, 20]));
  assert.ok(f.rms < 0.01);
  assert.ok(f.second, 'a rectangle reads the same turned half way round');
});

test('the best match among outlines: similar size near the point; none when nothing is close in size', () => {
  const target = move(ell(), 0.4, [120, -60]);
  const list = [
    { id: 'small', label: 'a shed', ring: move(rect(4, 3), 0, [20, 20]) },
    { id: 'big', label: 'a barn', ring: move(rect(60, 40), 0, [-100, 0]) },
    { id: 'same-size-wrong-shape', label: 'a hall', ring: move(rect(16, 12.1), 0.2, [80, 80]) },
    { id: 'target', label: 'the one', ring: target },
  ];
  const m = bestMatch(ell(), list, [0, 0]);
  assert.equal(m.candidate.id, 'target'); assert.ok(m.fit.rms < 0.01); assert.equal(m.tried, 2);
  assert.equal(bestMatch(rect(2, 2), list.slice(1), [0, 0]), null);
  assert.equal(bestMatch(ell(), list, [5000, 5000]), null, 'too far from the site point');
});

test('placement from a fit: the turn less the grid convergence, and the move from the site point', () => {
  const fit = { phi: Math.PI / 6, t: [1000, 2000] };
  const p = placementFrom(fit, { x: 5, z: -3 }, { e: 990, n: 1990 }, 1.5);
  const pc = plan(5, -3), e = pc[0] * Math.cos(fit.phi) - pc[1] * Math.sin(fit.phi) + 1000, n = pc[0] * Math.sin(fit.phi) + pc[1] * Math.cos(fit.phi) + 2000;
  assert.equal(p.turnDeg, 28.5); assert.ok(Math.abs(p.east - (e - 990)) < 0.01 && Math.abs(p.north - (n - 1990)) < 0.01);
});

test('parts grouped into buildings; the group named as existing is found; a topography mesh is left out', () => {
  const parts = [
    { box: [0, 0, 10, 0.3], name: 'Basic Wall:Ext', cls: 'IfcWall' }, { box: [9.8, 0, 10.1, 8], name: 'Basic Wall:Ext', cls: 'IfcWall' },
    { box: [40, 0, 48, 0.3], name: 'Existing wall', cls: 'IfcWall' }, { box: [47.8, 0, 48, 12], name: 'Existing wall', cls: 'IfcWall' },
    { box: [-200, -200, 200, 200], name: 'Toposolid', cls: 'IfcSite' },
  ];
  const g = clusters(parts);
  assert.equal(g.length, 2); assert.ok(!g.flat().includes(4));
  assert.deepEqual(g[existingGroup(parts, g)].sort(), [2, 3]);
  assert.equal(existingGroup(parts.slice(0, 2), clusters(parts.slice(0, 2))), null);
});

test('the placement record: kept as the contract says, confirmed only with a person and a time, and only for its point and model', () => {
  const r = normalPlacement({ east: 12.5, north: -40, turn_deg: 31, status: 'set by a person', method: 'matched', residual_m: 0.4, site_point: { lat: -41, lng: 174 }, model: 'm.glb', confirmed_by: 'AB', confirmed_at: '2026-11-23T00:00:00Z' });
  assert.equal(r.status, 'set by a person');
  assert.equal(normalPlacement({ ...r, confirmed_at: null }).status, 'assumed');
  assert.equal(normalPlacement({ east: 'x', north: 0, turn_deg: 0, site_point: { lat: 1, lng: 2 } }), null);
  assert.equal(normalPlacement({ east: 1, north: 0, turn_deg: 0 }), null, 'no site point: dropped');
  assert.ok(placementFits(r, { lat: -41, lng: 174 }, 'm.glb'));
  assert.ok(!placementFits(r, { lat: -41.001, lng: 174 }, 'm.glb'));
  assert.ok(!placementFits(r, { lat: -41, lng: 174 }, 'other.glb'));
});

test('a starting turn from the IFC\'s true north is tried as well', () => {
  const b = move(rect(18, 9.5), 1.0, [0, 0]);
  const f = fitFootprint(rect(18, 9.5), b, 30, [1.0 + Math.PI]);
  assert.ok(f.rms < 0.01);
});

test('the model\'s own ground against LiDAR: the offset, the deviation, and the small move that best lines them up', async () => {
  const { groundAgreement } = await import('../../plan-studio/twins/src/twin/placeFit.ts');
  // LiDAR ground: low swales 6 m apart. The model's ground: the same, 0.4 m higher, 1 m west.
  const lidar = (x, z) => 1.5 * Math.sin(x / 1) + 0.5 * Math.cos(z / 1.3);
  const pts = [];
  for (let x = -20; x <= 20; x += 1) for (let z = -20; z <= 20; z += 2) pts.push([x, lidar(x + 1, z) + 0.4, z]);
  const g = groundAgreement(pts, lidar);
  assert.ok(g.mad > 0.1, 'as placed they disagree');
  assert.equal(g.best.dx, 1); assert.equal(g.best.dz, 0); assert.equal(g.best.offset, 0.4); assert.equal(g.best.mad, 0);
  assert.equal(groundAgreement(pts.slice(0, 5), lidar), null, 'too few points');
});
