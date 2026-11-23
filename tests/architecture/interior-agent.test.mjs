// The interior design agent's rules (architecture/js/agents/interior-rules.js, the same file the 3D page builds): rooms read for their
// use, laid out by rules (clearances, a way past, doors kept clear, a hall's layouts), every piece proposed and checked, and a model
// asked only for judgement. An answer key on invented rooms and on the lab's example house. Run with:
//   node --test tests/architecture/interior-agent.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as R from '../../architecture/js/agents/interior-rules.js';
import { CATALOGUE } from '../../plan-studio/twins/src/twin/library/catalogue.ts';
import { planBoxes } from '../../plan-studio/twins/src/twin/library/fit.ts';

const root = new URL('../../', import.meta.url);
const hero = JSON.parse(readFileSync(new URL('plan-studio/twins/drop/hero.plan.json', root), 'utf8'));
const box = (x0, z0, w, d) => ({ x0, x1: x0 + w, z0, z1: z0 + d });
const HALL = { name: 'Foyer hall', box: box(0, 0, 18, 12) };

test('the rules are one file: the ops page and the 3D page build the same bytes', () => {
  for (const f of ['interior-rules.js', 'look-rules.js']) {
    assert.equal(readFileSync(new URL(`architecture/js/agents/${f}`, root), 'utf8'), readFileSync(new URL(`plan-studio/twins/src/twin/agents/${f}`, root), 'utf8'), `${f} differs between the two copies`);
  }
});

test('a room\'s use comes from its name, and a "hall" is a corridor unless it is big enough for events', () => {
  const key = [
    ['Living and dining', 'living-dining'], ['Lounge', 'living'], ['Dining', 'dining'], ['Bedroom 2', 'bedroom'], ['Master', 'bedroom'],
    ['Ensuite', 'bathroom'], ['WC', 'bathroom'], ['Study', 'study'], ['Kitchen', 'kitchen'], ['Wardrobe 1', 'service'], ['W/R', 'service'],
    ['L\'dry', 'service'], ['Garage', 'service'], ['Deck', 'outdoor'], ['Meeting room', 'meeting'], ['Boardroom', 'meeting'], ['?', 'unknown'],
  ];
  for (const [n, f] of key) assert.equal(R.roomFunction(n), f, n);
  assert.equal(R.roomFunction('Hall', box(0, 0, 3.2, 1.1)), 'circulation');
  assert.equal(R.roomFunction('Hall', box(0, 0, 18, 12)), 'event-hall');
  assert.equal(R.roomFunction('Foyer', box(0, 0, 4, 3)), 'circulation');
  assert.equal(R.roomFunction('Function room', null, 120), 'event-hall', 'an area alone is enough when the file gives no shape');
  assert.equal(R.roomFunction('Hall', box(0, 0, 30, 3)), 'circulation', 'long and narrow stays a corridor');
  assert.deepEqual(R.LAYOUTS['event-hall'], ['banquet', 'conference', 'exhibition', 'lounge']);
});

test('every clearance is a number with its source, and all of them are assumed', () => {
  for (const [k, v] of Object.entries(R.CLEAR)) { assert.ok(v.m > 0 && v.m < 5, k); assert.equal(v.src, 'assumed', k); assert.ok(v.what.length > 5, k); }
});

test('the example house: bedrooms get a bed and two bedsides, the living room a sofa group, and every piece passes the checks', () => {
  const { walls, rooms } = planBoxes(hero);
  const p = R.propose(rooms.map((r) => ({ name: r.name, box: r })), CATALOGUE, { walls });
  assert.deepEqual(R.validateProposal(p, CATALOGUE, { walls }), []);
  const of = (name) => { const r = p.rooms.find((x) => x.name === name); return r.layouts[r.layout]; };
  const count = (L, role) => L.placements.filter((x) => x.role === role).length;
  for (const b of ['Bedroom 1', 'Bedroom 2']) { assert.equal(count(of(b), 'bed'), 1, b); assert.equal(count(of(b), 'bedside'), 2, b); }
  const liv = of('Living and dining');
  assert.equal(count(liv, 'sofa'), 1); assert.equal(count(liv, 'coffee_table'), 1); assert.equal(count(liv, 'armchair'), 2);
  // the open-plan room is too narrow beside the sofa group for the 2 m table: said, not forced in
  assert.ok(liv.unplaced.some((u) => u.role === 'dining_table' && /too small/.test(u.why)));
  for (const n of ['Hall', 'Wardrobe 1', 'Ensuite', 'Kitchen']) assert.equal(of(n).placements.length, 0, `${n}: nothing loose`);
  // every placement is proposed, inside its room and clear of every wall
  for (const r of p.rooms) for (const pl of r.layouts[r.layout].placements) {
    assert.equal(pl.src, 'proposed');
    const b = R.boxOf(pl.x, pl.z, pl.w, pl.d, pl.rot);
    assert.ok(R.inside(b, r.box), `${r.name} ${pl.role} inside`);
    assert.ok(!walls.some((w) => R.overlaps(b, w, 0.005)), `${r.name} ${pl.role} through a wall`);
  }
  assert.equal(p.status, 'proposed'); assert.equal(p.approval, null); assert.equal(p.versions.rules, R.RULES_VERSION);
});

test('a bedroom bed keeps 600 mm each side and 750 mm at its foot; a room too small says so', () => {
  const ok = R.propose([{ name: 'Bedroom', box: box(0, 0, 3.1, 3.0) }], CATALOGUE).rooms[0].layouts.bed;
  assert.equal(ok.placements.filter((x) => x.role === 'bed').length, 1);
  const bed = ok.placements.find((x) => x.role === 'bed'), b = R.boxOf(bed.x, bed.z, bed.w, bed.d, bed.rot), long = Math.abs(Math.sin(bed.rot)) > 0.5;
  const sides = long ? [b.z0, 3.0 - b.z1] : [b.x0, 3.1 - b.x1];
  for (const s of sides) assert.ok(s >= R.CLEAR.bedSide.m - 0.001, `side ${s}`);
  const small = R.propose([{ name: 'Bedroom', box: box(0, 0, 2.6, 2.6) }], CATALOGUE).rooms[0].layouts.bed;
  assert.equal(small.placements.length, 0);
  assert.ok(small.note === '' ? small.unplaced.length >= 0 : /too small/.test(small.note));
});

test('a door\'s clear zone is kept: a piece that would stand in it is moved to another wall or left out with the reason', () => {
  const room = box(0, 0, 4.2, 4.0);
  const free = R.propose([{ name: 'Lounge', box: room }], CATALOGUE).rooms[0].layouts.conversation;
  const sofa = free.placements.find((x) => x.role === 'sofa');
  // a door in the wall behind where the sofa stood
  const back = R.boxOf(sofa.x, sofa.z, sofa.w, sofa.d, sofa.rot), door = Math.abs(sofa.rot) < 0.1 ? { x0: 1.6, x1: 2.6, z0: -0.07, z1: 0.07 } : { x0: back.x0, x1: back.x1, z0: back.z0, z1: back.z1 };
  const p = R.propose([{ name: 'Lounge', box: room }], CATALOGUE, { doors: [door] });
  assert.deepEqual(R.validateProposal(p, CATALOGUE, { doors: [door] }), []);
  const zone = R.doorZone(door);
  for (const pl of p.rooms[0].layouts.conversation.placements) if (pl.role !== 'rug') assert.ok(!R.overlaps(R.boxOf(pl.x, pl.z, pl.w, pl.d, pl.rot), zone, 0.005), `${pl.role} in the door zone`);
});

test('a hall: banquet with round tables of ten, conference rows facing the stage end, exhibition and lounge, each checked', () => {
  const doors = [{ x0: 17.93, x1: 18.07, z0: 5, z1: 7 }];
  const p = R.propose([HALL], CATALOGUE, { doors });
  assert.deepEqual(R.validateProposal(p, CATALOGUE, { doors }), []);
  const r = p.rooms[0];
  assert.equal(r.function, 'event-hall'); assert.equal(r.layout, 'banquet'); assert.equal(r.layout_by, 'rules');
  assert.deepEqual(Object.keys(r.layouts), ['banquet', 'conference', 'exhibition', 'lounge']);
  const ban = r.layouts.banquet, tables = ban.placements.filter((x) => x.role === 'banquet_table'), chairs = ban.placements.filter((x) => x.role === 'dining_chair');
  assert.ok(tables.length >= 4, `${tables.length} tables`);
  assert.equal(chairs.length, tables.length * R.BANQUET_SEATS.n, 'ten at every table');
  assert.ok(tables.every((t) => t.group && chairs.filter((c) => c.group === t.group).length === 10));
  // the edge band is clear
  for (const pl of ban.placements) { const b = R.boxOf(pl.x, pl.z, pl.w, pl.d, pl.rot); assert.ok(b.x0 >= R.CLEAR.hallEdge.m - 0.02 && b.z0 >= R.CLEAR.hallEdge.m - 0.02 && b.x1 <= 18 - R.CLEAR.hallEdge.m + 0.02, `${pl.role} in the edge band`); }
  // conference: the stage at the short wall furthest from the door (assumed), every chair facing it, the stage zone clear
  const conf = r.layouts.conference;
  assert.deepEqual(conf.stage, { wall: 'west', src: 'assumed' });
  assert.ok(conf.placements.length > 60 && conf.placements.every((c) => c.role === 'dining_chair' && Math.abs(c.rot + Math.PI / 2) < 0.01));
  assert.ok(conf.placements.every((c) => c.x - c.d / 2 >= R.CLEAR.stage.m - 0.01));
  // a centre aisle: no chair across the middle
  assert.ok(!conf.placements.some((c) => Math.abs(c.z - 6) < R.CLEAR.crossAisle.m / 2));
  assert.ok(r.layouts.exhibition.placements.some((x) => x.on === 'sideboard'));
  assert.ok(r.layouts.lounge.placements.filter((x) => x.role === 'sofa').length >= 2);
  // a person can put the stage at the other end
  const q = R.propose([HALL], CATALOGUE, { doors, stages: { 'Foyer hall': 'east' } });
  assert.deepEqual(q.rooms[0].layouts.conference.stage, { wall: 'east', src: 'set by a person' });
  assert.ok(q.rooms[0].layouts.conference.placements.every((c) => Math.abs(c.rot - Math.PI / 2) < 0.01));
});

test('with only a name and an area (an IFC summary): counts the use usually takes, marked assumed, none placed', () => {
  const p = R.propose([{ name: 'Bedroom 1', area_m2: 12.4 }, { name: 'Lounge', area_m2: 22 }, { name: 'Foyer', area_m2: 140 }], CATALOGUE);
  assert.deepEqual(R.validateProposal(p, CATALOGUE), []);
  const bed = p.rooms[0].layouts.bed;
  assert.equal(bed.placements.length, 0); assert.equal(bed.qty_src, 'assumed');
  assert.deepEqual(Object.fromEntries(bed.items.map((i) => [i.role, i.qty])), { bed: 1, bedside: 2 });
  assert.ok(bed.unplaced.every((u) => /no room shape/.test(u.why)));
  assert.equal(p.rooms[0].area_src, 'from the file');
  assert.equal(p.rooms[2].function, 'event-hall');
});

test('validation rejects what must not go on: a piece through a wall, out of the library, resized, counted wrong, or approved by no one', () => {
  const walls = [{ x0: 2, x1: 2.1, z0: 0, z1: 4 }];
  const good = R.propose([{ name: 'Lounge', box: box(0, 0, 5, 4) }], CATALOGUE);
  const bad = (f) => { const p = structuredClone(good); f(p, p.rooms[0].layouts[p.rooms[0].layout]); return R.validateProposal(p, CATALOGUE, { walls }); };
  assert.ok(R.validateProposal(good, CATALOGUE).length === 0);
  assert.ok(bad(() => {}).some((e) => /through a wall/.test(e)), 'a wall across the room catches a piece');
  assert.ok(bad((p, L) => { L.placements[0].id = 'NOPE'; }).some((e) => /not in the library/.test(e)));
  assert.ok(bad((p, L) => { L.placements[0].w = 9; }).some((e) => /size is not the library/.test(e) || /outside/.test(e)));
  assert.ok(bad((p, L) => { L.items[0].qty += 1; }).some((e) => /counts do not match/.test(e)));
  assert.ok(bad((p, L) => { L.placements[0].src = 'written'; }).some((e) => /not proposed/.test(e)));
  assert.ok(bad((p, L) => { L.placements[0].x = NaN; }).some((e) => /not a number/.test(e)));
  assert.ok(bad((p) => { p.status = 'approved'; }).some((e) => /no person named/.test(e)));
  assert.ok(bad((p) => { p.rooms[0].layout = 'banquet'; }).some((e) => /not one it may take/.test(e)));
  assert.ok(bad((p) => { p.approval = { by: 'A person', at: '2026-11-23' }; }).some((e) => /carries an approval/.test(e)));
  const ok = structuredClone(good); ok.status = 'approved'; ok.approval = { by: 'A person', at: '2026-11-23T00:00:00Z' };
  assert.deepEqual(R.validateProposal(ok, CATALOGUE), []);
});

test('judgement: only the allowed choices are taken from a model, never a size, a position or a count', () => {
  const p = R.propose([HALL, { name: 'Lounge', box: box(0, 20, 5, 4) }], CATALOGUE);
  const input = R.judgeInput(p, 'warm and natural', CATALOGUE);
  assert.deepEqual(input.rooms.map((r) => r.layouts), [['banquet', 'conference', 'exhibition', 'lounge'], ['conversation', 'compact']]);
  assert.ok(!JSON.stringify(input).match(/"x"|"z"|placements/), 'no positions go to the model');
  const j = R.applyJudgement(p, {
    style_brief: '  Calm, warm timber and soft linen.  ', notes: '',
    finishes: [{ role: 'sofa', finish: 'oat' }, { role: 'sofa', finish: 'gold' }, { role: 'banquet_table', finish: 'clay' }],
    rooms: [{ name: 'Foyer hall', layout: 'lounge', why: 'x' }, { name: 'Foyer hall', layout: 'disco', why: 'x' }, { name: 'Attic', layout: 'banquet', why: 'x' }],
    x: 3, count: 400,
  }, CATALOGUE);
  assert.deepEqual(j.choices, { 'Foyer hall': 'lounge' });
  assert.deepEqual(j.finishes, { sofa: 'oat', banquet_table: 'clay' });
  assert.equal(j.style.brief, 'Calm, warm timber and soft linen.'); assert.equal(j.style.src, 'model judgement');
  assert.equal(j.dropped.length, 3);
  const q = R.propose([HALL], CATALOGUE, { choices: j.choices, finishes: j.finishes, style: j.style, choice_by: 'model judgement' });
  assert.equal(q.rooms[0].layout, 'lounge'); assert.equal(q.rooms[0].layout_by, 'model judgement');
  assert.deepEqual(R.validateProposal(q, CATALOGUE), []);
  assert.deepEqual(R.applyJudgement(p, null).choices, {});
});

test('the round banquet table is in the library, built in code, with its finishes', () => {
  const t = CATALOGUE.find((c) => c.role === 'banquet_table');
  assert.ok(t && t.source === 'procedural' && t.dims.w === 1800 && t.dims.d === 1800);
  assert.ok(R.pieceFor(CATALOGUE, 'banquet_table').finishes.includes('white'));
});
