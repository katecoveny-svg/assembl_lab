// Free-form buildings and walk mode (plan-studio/twins/src/twin/freeformGeom.ts and walkNav.ts): a tapered plan with a
// curved wall, a gable roof over it, a mezzanine reached by a stair, doorways that let you through and walls that do not.
// Run with:  node --test tests/plan-run/*.test.mjs   (Node 22.18 or later strips the TypeScript types as it loads)
// The building here is made up for the test; it is nobody's drawing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { isFreeform, roofAt, clipToSide, offset, area, pieces, footprintSize, seatCount, headroom, inside, along } from '../../plan-studio/twins/src/twin/freeformGeom.ts';
import { navFromPlan, step, floorAt, passable, EYE } from '../../plan-studio/twins/src/twin/walkNav.ts';

/** a made-up hall: 20 m wide at the front tapering to 12 m at the back, 30 m long, a mezzanine on the east at 3.6 m */
function hall() {
  const fp = [[0, 0], [20, 0], [16, 30], [4, 30]];
  const ext = (id, a, b, openings = []) => ({ id, line: [a, b], thickness: 0.2, external: true, height: 'roof', source: 'scaled', openings });
  return {
    schema: 'assembl.plan-model.v1', job: { title: 'Made-up tapered hall' },
    buildings: [{
      id: 'h', name: 'Hall', form: 'freeform', origin: [100, 50], floorLevel: 0.3, footprint: fp,
      roof: { type: 'gable', ridge: [[10, -1], [10, 31]], height: 9, pitchDeg: 30, eave: 0.5, source: 'assumed' },
      levels: [
        { id: 'L0', name: 'Ground floor', floor: 0, walls: [
          ext('front', [0, 0], [20, 0], [{ kind: 'door', type: 'auto', a: 9, b: 11, sill: 0, head: 2.4 }]),
          ext('east', [20, 0], [16, 30]), ext('back', [16, 30], [4, 30]),
          // a curved west wall as a polyline, with a door in its second piece
          { id: 'west', line: [[4, 30], [2.2, 20], [1, 10], [0, 0]], thickness: 0.2, external: true, openings: [{ kind: 'door', a: 12, b: 13.8, sill: 0, head: 2.2 }] },
          { id: 'glass', kind: 'glass', line: [[0, 5], [20, 5]], thickness: 0.1, mullions: 1.5, openings: [{ kind: 'window', a: 0, b: 20, sill: 0, head: 3 }] },
        ], stairs: [{ id: 's1', kind: 'straight', line: [[17, 10], [17, 16]], width: 1.2, from: 0, to: 3.6 }], rooms: [{ id: 'R1', name: 'Hall', poly: fp }],
          layouts: { banquet: { seats: [{ kind: 'round-table', at: [8, 15], seats: 10 }, { kind: 'round-table', at: [8, 18], seats: 10 }] }, auditorium: { seats: Array.from({ length: 24 }, (_, i) => ({ kind: 'chair', at: [5 + (i % 6), 12 + Math.floor(i / 6)] })) } } },
        { id: 'L1', name: 'Mezzanine', floor: 3.6, slab: [[[15, 8], [19, 8], [17, 24], [15, 24]]], walls: [{ id: 'edge', kind: 'balustrade', line: [[15, 8], [15, 24]], thickness: 0.06, height: 1 }] },
      ],
    }],
  };
}

test('a free-form building is told apart from the classic axis-wall house', () => {
  const b = hall().buildings[0];
  assert.ok(isFreeform(b));
  assert.ok(!isFreeform({ id: 'x', levels: [{ walls: [{ axis: 'x', at: 0, from: 0, to: 5 }] }] }));
  const s = footprintSize(b);
  assert.equal(s.W, 20); assert.equal(s.D, 30);
  assert.equal(Math.round(s.area), 480, 'trapezium (20 + 12) / 2 × 30');
});

test('the gable roof is a height field through the ridge line, so a tapering plan needs no special case', () => {
  const b = hall().buildings[0], r = roofAt(b.roof);
  assert.equal(r(10, 15), 9, 'on the ridge');
  assert.ok(Math.abs(r(0, 0) - (9 - 10 * Math.tan(Math.PI / 6))) < 1e-9, 'front corner: 10 m from the ridge at 30°');
  assert.ok(Math.abs(r(4, 30) - r(16, 30)) < 1e-9, 'symmetric about the ridge');
  assert.ok(r(4, 30) > r(0, 0), 'the narrow back has taller side walls than the wide front');
  assert.ok(Math.abs(headroom(b, 'L1', [17, 16]) - (9 - 7 * Math.tan(Math.PI / 6) - 3.6)) < 1e-9);
  const west = clipToSide(offset(b.footprint, 0.5), b.roof, -1), east = clipToSide(offset(b.footprint, 0.5), b.roof, 1);
  assert.ok(Math.abs(Math.abs(area(west)) + Math.abs(area(east)) - Math.abs(area(offset(b.footprint, 0.5)))) < 1e-6, 'the two roof planes cover the eaves outline exactly');
  assert.ok(Math.abs(area(offset(b.footprint, 0.5))) > Math.abs(area(b.footprint)), 'the eave overhang grows the outline');
});

test('walls at any angle are cut into straight pieces carrying their openings', () => {
  const w = hall().buildings[0].levels[0].walls[3];
  const ps = pieces(w);
  assert.equal(ps.length, 3);
  const withDoor = ps.filter((p) => p.openings.length);
  assert.equal(withDoor.length, 1, 'the door falls in one piece');
  const L0 = Math.hypot(1.8, 10);
  assert.ok(Math.abs(withDoor[0].openings[0].a - (12 - L0)) < 1e-9, 'in that piece’s own distances');
  const p = along(w.line, L0);
  assert.ok(Math.abs(p.p[0] - 2.2) < 1e-9 && Math.abs(p.p[1] - 20) < 1e-9);
});

test('seats are counted from the layouts (tables of ten, rows of chairs)', () => {
  const L = hall().buildings[0].levels[0].layouts;
  assert.equal(seatCount(L.banquet.seats), 20);
  assert.equal(seatCount(L.auditorium.seats), 24);
});

test('walk mode: doorways let you through, walls and glass stop you', () => {
  const plan = hall(), nav = navFromPlan(plan), ox = 100, oz = 50;
  assert.ok(passable({ kind: 'door', sill: 0, head: 2.1 }));
  assert.ok(!passable({ kind: 'window', sill: 0, head: 3 }), 'a full-height window is still glass');
  // outside the front, walking north to south through the automatic door at u 9 to 11
  let e = { x: ox + 10, y: 0.3 + EYE, z: oz - 2 };
  for (let i = 0; i < 20; i++) e = step(nav, e, 0, 0.2, () => 0);
  assert.ok(e.z > oz + 1, `through the front door (z ${e.z.toFixed(2)})`);
  assert.ok(Math.abs(e.y - (0.3 + EYE)) < 1e-9, 'on the ground floor');
  // the glass screen at v = 5 stops you
  for (let i = 0; i < 30; i++) e = step(nav, e, 0, 0.2, () => 0);
  assert.ok(e.z < oz + 5, `the glass wall at v = 5 stops you (z ${e.z.toFixed(2)})`);
  // walking into the east wall from inside: you slide along it, you do not pass it
  let f = { x: ox + 15, y: 0.3 + EYE, z: oz + 20 };
  for (let i = 0; i < 40; i++) f = step(nav, f, 0.2, 0, () => 0);
  const eastU = 20 - (4 / 30) * 20;
  assert.ok(f.x - ox < eastU, `stopped by the east wall (u ${(f.x - ox).toFixed(2)} < ${eastU.toFixed(2)})`);
});

test('walk mode: the stair carries you up to the mezzanine, and its barrier keeps you on it', () => {
  const plan = hall(), nav = navFromPlan(plan), ox = 100, oz = 50;
  assert.equal(floorAt(nav, ox + 17, oz + 13, 2.0, () => 0), 0.3 + 1.8, 'half way up the flight, for someone already on it');
  assert.equal(floorAt(nav, ox + 17, oz + 13, 0.3, () => 0), 0.3, 'not a step up from the ground floor beside it');
  let e = { x: ox + 17, y: 0.3 + EYE, z: oz + 9.6 };
  for (let i = 0; i < 40; i++) e = step(nav, e, 0, 0.2, () => 0);
  assert.ok(Math.abs(e.y - (0.3 + 3.6 + EYE)) < 1e-6, `at the top of the stair, on the mezzanine (eye ${e.y.toFixed(2)})`);
  // walking west off the mezzanine edge: the balustrade at u = 15 stops you
  for (let i = 0; i < 30; i++) e = step(nav, e, -0.2, 0, () => 0);
  assert.ok(e.x - ox > 15, `the barrier stops you at the edge (u ${(e.x - ox).toFixed(2)})`);
  assert.ok(Math.abs(e.y - (0.3 + 3.6 + EYE)) < 1e-6, 'still on the mezzanine');
  // under the mezzanine on the ground floor you stay on the ground floor
  assert.equal(floorAt(nav, ox + 16, oz + 20, 0.3, () => 0), 0.3);
});

test('walk mode works for the classic axis-wall house too', () => {
  const plan = { buildings: [{ id: 'b', origin: [0, 0], floorLevel: 0.6, levels: [{ walls: [
    { axis: 'x', at: 0, from: 0, to: 8, thickness: 0.14, openings: [{ kind: 'door', a: 3, b: 4, sill: 0, head: 2.1 }] }, { axis: 'x', at: 6, from: 0, to: 8 }, { axis: 'z', at: 0, from: 0, to: 6 }, { axis: 'z', at: 8, from: 0, to: 6 }] }] }] };
  const nav = navFromPlan(plan);
  assert.equal(nav.floors.length, 1);
  let e = { x: 3.5, y: 0.6 + EYE, z: -1 };
  for (let i = 0; i < 15; i++) e = step(nav, e, 0, 0.2, () => 0.6);
  assert.ok(e.z > 1, 'through the door'); assert.ok(inside([e.x, e.z], nav.floors[0].poly));
  let g = { x: 6, y: 0.6 + EYE, z: -1 };
  for (let i = 0; i < 15; i++) g = step(nav, g, 0, 0.2, () => 0.6);
  assert.ok(g.z < 0, 'the wall beside the door stops you');
});
