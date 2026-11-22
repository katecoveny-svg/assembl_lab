// Code pre-checks: every rule gets a tiny made-up model that meets its cited figure, one that does not, and one that
// lacks the measurement. Run with:  node --test tests/code-checks/*.test.mjs
// The module under test is TypeScript with no imports. Node (22.18 or later) strips the types as it loads the file,
// so there is no build step. None of the models here is a real house.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CAUTION, RULES, STANDING, STATUSES, derivedFrom, resultsAsText, roomUse, runCodeChecks, tally } from '../../plan-studio/twins/src/twin/codeChecks.ts';

const MEETS = 'meets the cited figure', FAILS = 'does not meet the cited figure', CANNOT = 'cannot tell from this model', NA = 'not applicable';

// ---------------------------------------------------------------------------------------------- tiny made-up models
/** a 4 m by 3 m room in the corner of a 4.28 m by 3.28 m box, with openings on two outside walls */
function house(openings = {}, room = {}, extra = {}) {
  const wall = (id, axis, at, to, list = []) => ({ id, axis, at, from: 0, to, out: 1, thickness: 0.14, source: 'written', openings: list });
  return {
    schema: 'assembl.plan-model.v1', job: { title: 'Made-up test box' },
    buildings: [{ id: 'box', name: 'Box', origin: [0, 0], floorLevel: 0, roof: { type: 'flat', pitchDeg: 0 }, levels: [{
      id: 'L1', name: 'Ground floor', floor: 0, plate: 2.4,
      walls: [wall('N', 'x', 0, 4.28, openings.N), wall('S', 'x', 3.28, 4.28, openings.S), wall('W', 'z', 0, 3.28, openings.W), wall('E', 'z', 4.28, 3.28, openings.E)],
      partitions: [], rooms: [{ id: 'R1', name: 'Bedroom', u: 0.14, v: 0.14, w: 4, d: 3, source: 'written', ...room }], ...extra,
    }] }],
  };
}
const win = (a, b, sill, head, more = {}) => ({ kind: 'window', name: 'Test window', a, b, sill, head, source: 'written', ...more });
const door = (a, b, head, more = {}) => ({ kind: 'door', type: 'hinged', name: 'Test door', a, b, sill: 0, head, source: 'written', ...more });
/** a second opening wall, so the home is not a one-outside-wall unit (G4/AS1 2.2.2) */
const opener = { W: [win(1, 1.1, 1, 1.1, { name: 'Small opener' })] };

/** one flight of outside steps, 2 m on plan */
const steps = (more = {}) => ({ kind: 'steps', pts: [[0, 0], [2, 0]], levels: [0, -1.2], width: 1, source: 'written', ...more });
const site = (features, ground) => ({ schema: 'assembl.plan-model.v1', buildings: [], site: { features, ...(ground ? { fall: ground } : {}) } });
const flat = (y) => ({ at: [0, 0], y, slopeX: 0, slopeZ: 0, source: 'survey' });
const landing = (len, more = {}) => ({ kind: 'landing', pts: [[2, -0.5], [2 + len, -0.5], [2 + len, 0.5], [2, 0.5]], levels: [-1.2, -1.2], source: 'written', ...more });
/** a 3 m by 2 m deck beside the box, floor level 0, over flat ground */
const withDeck = (deck, groundY) => {
  const p = house({}, {}, { decks: [{ id: 'DK', name: 'Deck', u0: 0, u1: 3, v0: -2, v1: 0, drop: 0, source: 'written', ...deck }] });
  if (groundY !== undefined) p.site = { fall: flat(groundY) };
  return p;
};

const one = (plan, rule, subject) => {
  const list = runCodeChecks(plan).filter((c) => c.rule === rule && (!subject || c.subject === subject));
  assert.equal(list.length, 1, `expected one "${rule}" result${subject ? ' for ' + subject : ''}, got ${list.length}`);
  return list[0];
};

// ---------------------------------------------------------------------------------------------- the rules table itself
test('every rule carries a full citation to an official source', () => {
  assert.equal(RULES.length, 10);
  assert.equal(new Set(RULES.map((r) => r.id)).size, RULES.length);
  for (const r of RULES) {
    for (const k of ['short', 'document', 'edition', 'effective', 'clause', 'publisher', 'url', 'readOn', 'requirement']) assert.ok(String(r.cite[k] ?? '').length > 2, `${r.id} is missing ${k}`);
    assert.match(r.cite.url, /^https:\/\/www\.(building|legislation)\.govt\.nz\//, `${r.id} must cite building.govt.nz or legislation.govt.nz`);
    assert.match(r.cite.readOn, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(r.leavesOut.length > 20, `${r.id} must say what it leaves out`);
  }
});

test('the wording never claims compliance', () => {
  const hero = JSON.parse(readFileSync(new URL('../../plan-studio/twins/drop/hero.plan.json', import.meta.url), 'utf8'));
  const text = resultsAsText(hero, runCodeChecks(hero), new Date(2026, 10, 22));
  assert.ok(text.split('\n')[1] === STANDING && STANDING === 'A pre-check against cited figures. It is not a compliance decision. A person reviews it.');
  // the only uses of "compl…" allowed are the disclaimers
  const claims = text.split('\n').map((l) => l.replace(/https?:\/\/\S+/g, '')).filter((l) => /\bcompl(y|ies|iant|iance)\b/i.test(l) && !/not a compliance decision|never says a design complies/i.test(l));
  assert.deepEqual(claims, []);
  assert.doesNotMatch(text, /\bpass(es|ed)?\b/i);
  for (const c of runCodeChecks(hero)) assert.ok(STATUSES.includes(c.status));
});

// ---------------------------------------------------------------------------------------------- 1. natural light (G7/AS1 2.1.2.1(a))
test('natural light: meets, does not meet, lacks the measurement', () => {
  // 12 m² floor. A 1.5 x 1.2 window is 1.8 m², 15%.
  const ok = one(house({ N: [win(1, 2.5, 0.9, 2.1)] }), 'natural-light');
  assert.equal(ok.status, MEETS); assert.equal(ok.measured, 15); assert.equal(ok.derived, 'written');
  assert.match(ok.says, /^Meets the figure in G7\/AS1 2\.1\.2\.1\(a\): .*15% against glazing no less than 10% of the floor area\.$/);
  // a 0.6 x 1.0 window is 0.6 m², 5%
  const no = one(house({ N: [win(1, 1.6, 1, 2)] }), 'natural-light');
  assert.equal(no.status, FAILS); assert.equal(no.measured, 5);
  // the room has no size
  const lacks = one(house({ N: [win(1, 2.5, 0.9, 2.1)] }, { w: undefined }), 'natural-light');
  assert.equal(lacks.status, CANNOT); assert.match(lacks.needs, /position and size/);
  // an opening with no head height: glazing may be missing from the count
  const noHead = one(house({ N: [win(1, 1.6, 1, 2), { kind: 'window', name: 'Unsized window', a: 2, b: 3 }] }), 'natural-light');
  assert.equal(noHead.status, CANNOT); assert.match(noHead.needs, /Unsized window/);
});

test('natural light: names, doors, close calls and the 3.0 m ceiling limit', () => {
  assert.equal(one(house({}, { name: 'Bathroom' }), 'natural-light').status, NA);
  assert.equal(one(house({}, { name: 'Hall' }), 'natural-light').status, NA);
  assert.equal(one(house({}, { name: 'Room 4' }), 'natural-light').status, CANNOT);
  // a door is only counted as glass on an assumption, and the result says so
  const byDoor = one(house({ N: [door(1, 2, 2)] }), 'natural-light');
  assert.equal(byDoor.status, MEETS); assert.equal(byDoor.derived, 'assumed'); assert.match(byDoor.says, /rests on an assumed size/i);
  // a door the model says is solid is not glass
  assert.equal(one(house({ N: [door(1, 2, 2, { material: 'cedar' })] }), 'natural-light').status, FAILS);
  // 10.4% from a scaled window is too close to call; the same figure written on the drawings is taken as it is
  const scaled = one(house({ N: [win(1, 2.04, 0.9, 2.1, { source: 'scaled' })] }), 'natural-light');
  assert.equal(scaled.status, CANNOT); assert.match(scaled.needs, /caution band/);
  assert.equal(one(house({ N: [win(1, 2.04, 0.9, 2.1)] }), 'natural-light').status, MEETS);
  // a window is shared between two rooms by the length on each
  const shared = house({ N: [win(1, 3, 0.9, 2.1)] }, { w: 2 });
  assert.equal(one(shared, 'natural-light').measured, 22.8);   // the room runs to 2.14 m, so 1.14 m of the 2 m window sits on it: 1.368 m² over 6 m²
  // a raking ceiling over 3.0 m is outside G7/AS1: the result carries the warning
  const tall = house({ N: [win(1, 2.5, 0.9, 2.1)] });
  tall.buildings[0].roof = { type: 'skillion', pitchDeg: 15, high: 'v1' };
  assert.ok(one(tall, 'natural-light').caveats.some((k) => /over 3\.0 m/.test(k)));
  assert.ok(!one(house({ N: [win(1, 2.5, 0.9, 2.1)] }), 'natural-light').caveats.some((k) => /over 3\.0 m/.test(k)));
});

// ---------------------------------------------------------------------------------------------- 2. ventilation (G4/AS1 2.2.1.2)
test('ventilation: meets, does not meet, lacks the measurement', () => {
  // 12 m² floor needs 0.6 m² net openable. Stated: 0.9 m².
  const ok = one(house({ N: [win(1, 2.5, 0.9, 2.1, { openableArea: 0.9 })], ...opener }), 'ventilation');
  assert.equal(ok.status, MEETS); assert.equal(ok.measured, 7.5);
  assert.match(ok.says, /^Meets the figure in G4\/AS1 2\.2\.1\.2: /);
  // only fixed glass on this room: nothing opens
  const no = one(house({ N: [win(1, 2.5, 0.9, 2.1, { type: 'fixed' })], E: [win(4, 4.1, 1, 1.1, { name: 'Elsewhere' })], S: [win(5, 5.1, 1, 1.1, { name: 'Elsewhere 2' })] }, { w: 2 }), 'ventilation');
  assert.equal(no.status, FAILS); assert.ok(no.caveats.some((k) => /mechanical ventilation/.test(k)));
  // stated openable area that falls short
  const short = one(house({ N: [win(1, 2.5, 0.9, 2.1, { openableArea: 0.3 })], W: [win(1, 1.1, 1, 1.1, { name: 'Small opener', openableArea: 0.01 })] }), 'ventilation');
  assert.equal(short.status, FAILS);
  // a window that opens, but the model does not say how much of it
  const lacks = one(house({ N: [win(1, 2.5, 0.9, 2.1)], ...opener }), 'ventilation');
  assert.equal(lacks.status, CANNOT); assert.match(lacks.needs, /net openable area of Test window/);
});

test('ventilation: small spaces, one outside wall, unknown names', () => {
  assert.equal(one(house({ N: [win(1, 2.5, 0.9, 2.1)], ...opener }, { name: 'Hall' }), 'ventilation').status, NA);
  assert.equal(one(house({ N: [win(1, 2.5, 0.9, 2.1, { openableArea: 0.9 })] }), 'ventilation').status, NA);   // openers on one wall only: 2.2.2 applies
  assert.equal(one(house({ N: [win(1, 2.5, 0.9, 2.1)], ...opener }, { name: 'Room 4' }), 'ventilation').status, CANNOT);
  assert.equal(one(house({ N: [win(1, 2.5, 0.9, 2.1)], ...opener }, { name: 'Bathroom' }), 'ventilation').status, CANNOT);   // bathrooms are checked
});

// ---------------------------------------------------------------------------------------------- 3. stair pitch (D1/AS1 Table 6)
test('stair pitch: meets, does not meet, lacks the measurement', () => {
  // 1.2 m over 2 m on plan is 31°
  const ok = one(site([steps()]), 'stair-pitch');
  assert.equal(ok.status, MEETS); assert.equal(ok.measured, 31); assert.match(ok.says, /D1\/AS1 Table 6/);
  // 200 mm risers on 240 mm goings is 39.8°
  const no = one(site([steps({ levels: [0, -2], risers: 10, going: 0.24 })]), 'stair-pitch');
  assert.equal(no.status, FAILS); assert.equal(no.measured, 39.8);
  // no levels
  const lacks = one(site([steps({ levels: undefined })]), 'stair-pitch');
  assert.equal(lacks.status, CANNOT); assert.match(lacks.needs, /levels/);
  // a steep overall slope without the steps is not called: the pitch line can be flatter
  const steep = one(site([steps({ levels: [0, -1.7] })]), 'stair-pitch');
  assert.equal(steep.status, CANNOT); assert.match(steep.needs, /number of risers and the going/);
  // assumed levels are named in the sentence
  const assumed = one(site([steps({ source: 'position scaled from the site sheet; landing levels are assumed' })]), 'stair-pitch');
  assert.equal(assumed.derived, 'assumed'); assert.match(assumed.says, /This rests on an assumed size\.$/);
});

// ---------------------------------------------------------------------------------------------- 4. riser height (D1/AS1 Table 6)
test('stair riser: meets, does not meet, lacks the measurement', () => {
  const ok = one(site([steps({ risers: 7 })]), 'stair-riser');          // 171 mm
  assert.equal(ok.status, MEETS); assert.equal(ok.measured, 171);
  const no = one(site([steps({ risers: 6 })]), 'stair-riser');          // 200 mm
  assert.equal(no.status, FAILS); assert.equal(no.measured, 200);
  const lacks = one(site([steps()]), 'stair-riser');
  assert.equal(lacks.status, CANNOT); assert.match(lacks.needs, /number of risers/);
  // 188 mm from a scaled rise is within 5 mm of the figure
  assert.equal(one(site([steps({ levels: [0, -1.316], risers: 7, source: 'scaled' })]), 'stair-riser').status, CANNOT);
});

// ---------------------------------------------------------------------------------------------- 5. tread depth (D1/AS1 Table 6)
test('stair tread: meets, does not meet, lacks the measurement', () => {
  const ok = one(site([steps({ going: 0.3 })]), 'stair-tread');
  assert.equal(ok.status, MEETS); assert.equal(ok.measured, 300);
  assert.equal(one(site([steps({ treads: 6 })]), 'stair-tread').measured, 333);   // 2 m over 6 treads
  const no = one(site([steps({ going: 0.25 })]), 'stair-tread');
  assert.equal(no.status, FAILS); assert.equal(no.measured, 250);
  const lacks = one(site([steps()]), 'stair-tread');
  assert.equal(lacks.status, CANNOT); assert.match(lacks.needs, /going of each step/);
});

// ---------------------------------------------------------------------------------------------- 6. rise between landings (D1/AS1 Table 7)
test('rise between landings: meets, does not meet, lacks the measurement', () => {
  assert.equal(one(site([steps()]), 'stair-flight-rise').status, MEETS);
  const no = one(site([steps({ pts: [[0, 0], [8, 0]], levels: [0, -4.5] })]), 'stair-flight-rise');
  assert.equal(no.status, FAILS); assert.equal(no.measured, 4.5); assert.match(no.says, /D1\/AS1 Table 7/);
  assert.equal(one(site([steps({ levels: undefined })]), 'stair-flight-rise').status, CANNOT);
});

// ---------------------------------------------------------------------------------------------- 7. landing length (D1/AS1 4.3.4)
test('landing length: meets, does not meet, lacks the measurement', () => {
  const ok = one(site([steps(), landing(1.0)]), 'landing-length');
  assert.equal(ok.status, MEETS); assert.equal(ok.measured, 1000); assert.match(ok.measuredText, /along the line of the flight/);
  const no = one(site([steps(), landing(0.8)]), 'landing-length');
  assert.equal(no.status, FAILS); assert.equal(no.measured, 800);
  const lacks = one(site([steps(), { kind: 'landing', levels: [-1.2, -1.2] }]), 'landing-length');
  assert.equal(lacks.status, CANNOT); assert.match(lacks.needs, /outline/);
  // 0.8 m one way and 1.0 m the other, with no flight to show which way people walk
  const either = one(site([landing(0.8)]), 'landing-length');
  assert.equal(either.status, CANNOT); assert.match(either.needs, /direction of travel/);
  // a scaled landing 910 mm long is too close to call
  assert.equal(one(site([steps(), landing(0.91, { source: 'scaled' })]), 'landing-length').status, CANNOT);
});

// ---------------------------------------------------------------------------------------------- 8. handrail (D1/AS1 6.0.1)
test('handrail: meets, does not meet, lacks the measurement', () => {
  assert.equal(one(site([steps({ handrails: 1 })]), 'stair-handrail').status, MEETS);
  assert.equal(one(site([steps({ handrails: 'both' })]), 'stair-handrail').measured, 2);
  const no = one(site([steps({ handrails: 0, risers: 7 })]), 'stair-handrail');
  assert.equal(no.status, FAILS); assert.match(no.says, /D1\/AS1 6\.0\.1/);
  const lacks = one(site([steps()]), 'stair-handrail');
  assert.equal(lacks.status, CANNOT); assert.match(lacks.needs, /handrails recorded/);
  // two or three risers at a house: a handrail may be left off
  assert.equal(one(site([steps({ levels: [0, -0.5], handrails: 0, risers: 3 })]), 'stair-handrail').status, NA);
  // no handrail and no riser count: cannot say which case it is
  assert.equal(one(site([steps({ handrails: 'none' })]), 'stair-handrail').status, CANNOT);
  // wider than 2.0 m follows a different paragraph
  assert.equal(one(site([steps({ width: 2.4, handrails: 1 })]), 'stair-handrail').status, NA);
});

// ---------------------------------------------------------------------------------------------- 9. a barrier where the fall is 1 m or more (Building Code F4.3.1)
test('barrier where the fall is 1 m or more: meets, does not meet, lacks the measurement', () => {
  // a deck 2 m above flat ground
  const ok = one(withDeck({ rail: ['glass'] }, -2), 'barrier-needed', 'Deck');
  assert.equal(ok.status, MEETS); assert.equal(ok.measured, 2); assert.match(ok.says, /Building Code F4\.3\.1/);
  const no = one(withDeck({ rail: ['none'] }, -2), 'barrier-needed', 'Deck');
  assert.equal(no.status, FAILS); assert.match(no.measuredText, /records no barrier/);
  // no ground in the model
  const lacks = one(withDeck({ rail: ['glass'] }), 'barrier-needed', 'Deck');
  assert.equal(lacks.status, CANNOT); assert.match(lacks.needs, /ground levels/);
  // the model does not say whether there is a barrier ("posts" are the deck's own posts, not a barrier)
  const silent = one(withDeck({ rail: ['posts'] }, -2), 'barrier-needed', 'Deck');
  assert.equal(silent.status, CANNOT); assert.match(silent.needs, /a barrier recorded/);
  // 0.4 m of fall: no barrier called for. 1.1 m of fall to surveyed ground: too close to call.
  assert.equal(one(withDeck({ rail: ['none'] }, -0.4), 'barrier-needed', 'Deck').status, NA);
  assert.equal(one(withDeck({ rail: ['glass'] }, -1.1), 'barrier-needed', 'Deck').status, CANNOT);
  // stairs and landings are measured the same way
  assert.equal(one(site([steps({ barrier: 'glass', levels: [2, 0.8] })], flat(-1)), 'barrier-needed').status, MEETS);
  assert.equal(one(site([landing(1, { barrier: 'none', levels: [2, 2] })], flat(0)), 'barrier-needed').status, FAILS);
});

// ---------------------------------------------------------------------------------------------- 10. barrier height (F4/AS1 Table 1)
test('barrier height: meets, does not meet, lacks the measurement', () => {
  const ok = one(withDeck({ rail: ['glass'], barrierHeight: 1.0, barrierHeightSource: 'written' }, -2), 'barrier-height', 'Deck');
  assert.equal(ok.status, MEETS); assert.equal(ok.measured, 1000); assert.match(ok.says, /F4\/AS1 Table 1/);
  // 950 mm is enough on a stair and not on a deck
  const no = one(withDeck({ rail: ['glass'], barrierHeight: 0.95, barrierHeightSource: 'written' }, -2), 'barrier-height', 'Deck');
  assert.equal(no.status, FAILS);
  assert.equal(one(site([steps({ barrier: 'glass', barrierHeight: 0.95, levels: [2, 0.8] })], flat(-1)), 'barrier-height').status, MEETS);
  assert.equal(one(site([steps({ barrier: 'glass', barrierHeight: 0.85, levels: [2, 0.8] })], flat(-1)), 'barrier-height').status, FAILS);
  const lacks = one(withDeck({ rail: ['glass'] }, -2), 'barrier-height', 'Deck');
  assert.equal(lacks.status, CANNOT); assert.match(lacks.needs, /barrier height/);
  // no barrier is called for where the fall is under 1 m
  assert.equal(one(withDeck({ rail: ['glass'], barrierHeight: 0.5 }, -0.4), 'barrier-height', 'Deck').status, NA);
});

// ---------------------------------------------------------------------------------------------- the model as a whole
test('an empty or broken model gives answers, not guesses and not a crash', () => {
  for (const bad of [null, undefined, {}, { buildings: 'no' }, { buildings: [{}] }, { buildings: [{ levels: [{ rooms: [{}], walls: [{}], decks: [{}] }] }], site: { features: [{ kind: 'steps' }, { kind: 'landing' }], terrain: { heights: [] } } }]) {
    const list = runCodeChecks(bad);
    assert.ok(list.length >= RULES.length);
    assert.ok(list.every((c) => c.status === CANNOT || c.status === NA), 'nothing measured, so nothing may be called either way');
    for (const r of RULES) assert.ok(list.some((c) => c.rule === r.id), `${r.id} has no line`);
  }
});

test('labels and room names are read the same way every time', () => {
  assert.equal(derivedFrom('scaled from the 17 November 2026 sheets'), 'scaled');
  assert.equal(derivedFrom('position scaled from the site sheet; landing levels are assumed, in proportion to the flights'), 'assumed');
  assert.equal(derivedFrom('proposed'), 'proposed');
  assert.equal(derivedFrom('ai'), 'read by AI');
  assert.equal(derivedFrom(undefined), 'not labelled');
  assert.equal(derivedFrom('written'), 'written');
  assert.deepEqual(['Bedroom 1', 'Living and dining', 'Kitchen', 'Study', 'Ensuite', 'Hall', 'Wardrobe 1', 'Garage', 'Room 4'].map(roomUse), ['habitable', 'habitable', 'habitable', 'habitable', 'wet', 'small', 'small', 'specialised', 'unknown']);
  assert.ok(CAUTION.ratioShare > 0 && CAUTION.groundM > 0);
});

test('the example model: every result is one of the four answers, and the count adds up', () => {
  const hero = JSON.parse(readFileSync(new URL('../../plan-studio/twins/drop/hero.plan.json', import.meta.url), 'utf8'));
  const list = runCodeChecks(hero), t = tally(list);
  assert.equal(STATUSES.reduce((n, s) => n + t[s], 0), list.length);
  // every measured result says how it was derived; the stair levels in the example are assumed, and the results say so
  for (const c of list.filter((x) => x.status === MEETS || x.status === FAILS)) assert.ok(c.derived, `${c.rule} ${c.subject} does not say how it was measured`);
  for (const c of list.filter((x) => x.rule === 'stair-pitch')) { assert.equal(c.derived, 'assumed'); assert.match(c.says, /assumed/); }
  // no street address anywhere in what the tool writes
  assert.doesNotMatch(resultsAsText(hero, list, new Date(2026, 10, 22)), /\b\d+[A-Za-z]?\s+[A-Z][a-z]+\s+(Road|Street|Avenue|Lane|Drive|Place|Terrace)\b/);
});
