// Placing picked pieces in a model (plan-studio/twins/src/twin/library/fit.ts): a piece goes in a fit-out place for its
// role when it fits there, and is never put through a wall, whether placed by the rules or dropped by hand.
// Run with:  node --test tests/architecture/library-place.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { plan, dropAt, footprint, hitsWall, overlaps, roomKind, planBoxes, clear } from '../../plan-studio/twins/src/twin/library/fit.ts';
import { CATALOGUE } from '../../plan-studio/twins/src/twin/library/catalogue.ts';

const root = new URL('../../', import.meta.url);
const hero = JSON.parse(readFileSync(new URL('plan-studio/twins/drop/hero.plan.json', root), 'utf8'));
const { walls, rooms } = planBoxes(hero);
const want = (id, room = '', k = 0) => { const it = CATALOGUE.find((x) => x.id === id); return { uid: `${id}#${k}`, id, role: it.role, w: it.dims.w / 1000, d: it.dims.d / 1000, h: it.dims.h / 1000, room, fit: it.fit }; };
// a seeded random source, so the test is the same every run
const rnd = (() => { let s = 7; return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648); })();

test('the sample plan model reads into walls and rooms', () => {
  assert.ok(walls.length >= 8, `${walls.length} walls`);
  assert.ok(rooms.some((r) => roomKind(r.name) === 'Living'));
  assert.ok(rooms.some((r) => roomKind(r.name) === 'Bedroom'));
  assert.equal(roomKind('Living and dining'), 'Living');
  assert.equal(roomKind('Ensuite'), 'Bathroom');
  assert.equal(roomKind('Wardrobe 1'), '');
});

test('footprints turn with the piece', () => {
  const a = footprint(0, 0, 0, 2, 1), b = footprint(0, 0, Math.PI / 2, 2, 1);
  assert.deepEqual([a.x1 - a.x0, a.z1 - a.z0].map((v) => +v.toFixed(6)), [2, 1]);
  assert.deepEqual([b.x1 - b.x0, b.z1 - b.z0].map((v) => +v.toFixed(6)), [1, 2]);
});

test('a piece fills a place for its role in the room asked for, when it fits; otherwise it is set out with the reason', () => {
  const liv = rooms.find((r) => roomKind(r.name) === 'Living'), bed = rooms.find((r) => roomKind(r.name) === 'Bedroom');
  const cx = (r) => (r.x0 + r.x1) / 2, cz = (r) => (r.z0 + r.z1) / 2;
  const slots = [
    { key: 's1', role: 'sofa', room: liv.name, x: cx(liv), y: 0, z: cz(liv), rot: 0 },
    { key: 's2', role: 'bed', room: bed.name, x: cx(bed), y: 0, z: cz(bed), rot: 0 },
    { key: 's3', role: 'sofa', room: liv.name, x: liv.x0 + 0.05, y: 0, z: cz(liv), rot: 0 }, // half through the wall
    { key: 's4', role: 'armchair', room: liv.name, x: cx(liv), y: 0, z: cz(liv), rot: 0, maxW: 0.5 },
  ];
  const r = plan([want('LIB-SEAT-01', 'Living'), want('LIB-BED-01', 'Bedroom'), want('HERO-LIV-01', 'Living', 1), want('LIB-SEAT-02', 'Living'), want('LIB-SEAT-01', 'Study', 2), want('LIB-DEC-01', 'Living')], slots, rooms, walls);
  assert.deepEqual(r.placed.map((p) => [p.id, p.slot]), [['LIB-SEAT-01', 's1'], ['LIB-BED-01', 's2']]);
  const why = Object.fromEntries(r.toPlace.map((t) => [t.uid, t.why]));
  assert.match(why['HERO-LIV-01#1'], /wall|outside the rooms|another picked piece/, 'the second sofa place is half through a wall, and the first is taken');
  assert.match(why['LIB-SEAT-02#0'], /bigger than the place/);
  assert.match(why['LIB-SEAT-01#2'], /no free place for it in a study/);
  assert.match(why['LIB-DEC-01#0'], /no place for one of these/);
  for (const p of r.placed) assert.equal(hitsWall(p.box, walls), false, `${p.id} clear of the walls`);
});

test('placement never puts a piece through a wall: 2000 seeded drops of every floor piece across the sample model', () => {
  const pieces = CATALOGUE.filter((x) => x.fit !== 'hang' && x.dims.w < 3000 && x.dims.d < 3000);
  const all = { x0: Math.min(...walls.map((w) => w.x0)) - 1, x1: Math.max(...walls.map((w) => w.x1)) + 1, z0: Math.min(...walls.map((w) => w.z0)) - 1, z1: Math.max(...walls.map((w) => w.z1)) + 1 };
  let ok = 0, refused = 0, nudged = 0;
  const taken = [];
  for (let i = 0; i < 2000; i++) {
    const it = pieces[i % pieces.length], w = { w: it.dims.w / 1000, d: it.dims.d / 1000 };
    const x = all.x0 + rnd() * (all.x1 - all.x0), z = all.z0 + rnd() * (all.z1 - all.z0), rot = Math.floor(rnd() * 4) * (Math.PI / 2);
    const at = dropAt(w, x, z, rot, rooms, walls, i % 50 === 0 ? [] : taken.slice(-6));
    if (!at.ok) { refused++; continue; }
    const b = footprint(at.x, at.z, rot, w.w, w.d);
    assert.equal(hitsWall(b, walls), false, `${it.id} dropped at ${x.toFixed(2)}, ${z.toFixed(2)} stands clear of every wall`);
    assert.equal(clear(b, rooms, walls), '', `${it.id} stands inside the rooms`);
    ok++; if (at.nudged) nudged++;
    if (i % 7 === 0) taken.push(b);
  }
  assert.ok(ok > 300, `${ok} placed (${nudged} moved clear of a wall), ${refused} refused`);
});

test('a drop outside every room, or where nothing fits, is refused in plain words', () => {
  const far = dropAt({ w: 1, d: 1 }, 1000, 1000, 0, rooms, walls);
  assert.equal(far.ok, false); assert.match(far.why, /inside a room/);
  const wc = rooms.reduce((a, r) => ((r.x1 - r.x0) * (r.z1 - r.z0) < (a.x1 - a.x0) * (a.z1 - a.z0) ? r : a));
  const huge = dropAt({ w: 6, d: 6 }, (wc.x0 + wc.x1) / 2, (wc.z0 + wc.z1) / 2, 0, rooms, walls, [], 0.3);
  assert.equal(huge.ok, false); assert.match(huge.why, /does not fit there/);
  assert.equal(overlaps({ x0: 0, x1: 1, z0: 0, z1: 1 }, { x0: 1, x1: 2, z0: 0, z1: 1 }), false, 'touching is not overlapping');
});
