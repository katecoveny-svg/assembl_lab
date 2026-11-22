// Room names for a read plan (roomNames.ts): printed names kept, names suggested from what is drawn where a tag prints "?",
// and a person's name winning over both. Run with:  node --test tests/plan-read/*.test.mjs
// The module is TypeScript with no imports; Node (22.18 or later) strips the types as it loads it. All rooms are made up.
import test from 'node:test';
import assert from 'node:assert/strict';
import { applyNameEdits, fromFixtures, NAME_NOTE, readingOrder, suggestNames, unprinted } from '../../plan-studio/twins/src/twin/roomNames.ts';

const room = (id, name, u, v, w, d, fixtures = '', order = 0) => ({ id, name, u, v, w, d, fixtures, order });
const names = (rooms, links = []) => Object.fromEntries([...suggestNames(rooms, links)].map(([id, n]) => [id, n.name]));

test('a tag that is blank or only "?" names nothing; anything else is a printed name', () => {
  for (const s of ['', '?', '??', ' ? ', undefined, null]) assert.equal(unprinted(s), true, String(s));
  for (const s of ['Bed 1', 'WC', 'W/R', '?Store']) assert.equal(unprinted(s), false, s);
});

test('the rules from what is drawn', () => {
  const cases = [
    ['double bed, bedside tables', 'Bedroom'], ['bunk beds', 'Bedroom'],
    ['toilet, basin', 'WC'], ['WC pan', 'WC'],
    ['toilet, basin, shower', 'Bathroom'], ['bath, vanity', 'Bathroom'], ['basin', 'Bathroom'],
    ['bench, hob, sink', 'Kitchen'], ['benches with a sink', 'Kitchen'], ['oven', 'Kitchen'],
    ['washing machine, dryer', 'Laundry'], ['hanging rail', 'Wardrobe'],
  ];
  for (const [f, want] of cases) assert.equal(fromFixtures(f), want, f);
  for (const f of ['', 'sofa, coffee table', 'island', 'desk, chair']) assert.equal(fromFixtures(f), null, f);
});

test('printed names are kept exactly; only "?" rooms get a suggestion, marked as drawn, with the printed "?" kept', () => {
  const m = suggestNames([room('a', 'Bed 1', 0, 0, 3, 3, 'bed'), room('b', '?', 3, 0, 3, 3, 'bed')], []);
  assert.deepEqual(m.get('a'), { name: 'Bed 1', src: 'printed', printed: 'Bed 1', why: 'printed on the drawing' });
  assert.equal(m.get('b').src, 'drawn'); assert.equal(m.get('b').printed, '?'); assert.match(m.get('b').why, /drawn in it: bed/);
  assert.equal(NAME_NOTE.drawn, 'named from what is drawn: check'); assert.equal(NAME_NOTE.person, 'named by a person');
});

test('several bedrooms are numbered in sheet reading order; a number the drawing prints is not used twice', () => {
  assert.deepEqual(names([room('r', '?', 4, 0, 3, 3, 'bed', 1), room('l', '?', 0, 0, 3, 3, 'bed', 0)]), { l: 'Bedroom 1', r: 'Bedroom 2' });
  assert.deepEqual(names([room('p', 'Bedroom 1', 0, 0, 3, 3), room('q', '?', 4, 0, 3, 3, 'bed', 1)]), { p: 'Bedroom 1', q: 'Bedroom 2' });
  assert.deepEqual(names([room('only', '?', 0, 0, 3, 3, 'queen bed')]), { only: 'Bedroom' });
});

test('a bathroom is an ensuite only when every door of it opens off a bedroom', () => {
  const bed = room('bed', '?', 0, 0, 3, 3, 'bed'), wet = room('wet', '?', 3.1, 0, 2, 2, 'toilet, basin, shower');
  assert.equal(names([bed, wet], [{ a: 'wet', b: 'bed' }]).wet, 'Ensuite');
  assert.equal(names([bed, wet, room('hall', '?', 3.1, 2.1, 3, 1)], [{ a: 'wet', b: 'bed' }, { a: 'wet', b: 'hall' }]).wet, 'Bathroom');
  assert.equal(names([bed, wet], [{ a: 'wet', b: null }]).wet, 'Bathroom');               // a door to outside, or to a space that is not a room
  assert.equal(names([bed, wet], []).wet, 'Bathroom');                                    // no door found: not called an ensuite
  assert.equal(names([room('b2', 'Bed 2', 0, 0, 3, 3), wet], [{ a: 'wet', b: 'b2' }]).wet, 'Ensuite');   // a printed bedroom counts
});

test('a small room with nothing drawn, off a bedroom, is a wardrobe; two are numbered', () => {
  const bed = room('bed', '?', 0.75, 0, 3, 3, 'bed');
  assert.equal(names([bed, room('w', '?', 0, 0, 0.65, 2)], [{ a: 'w', b: 'bed' }]).w, 'Wardrobe');
  assert.equal(names([bed, room('w', '?', 0, 0, 0.65, 2)], []).w, 'Wardrobe');           // no door read: touching the bedroom is enough
  assert.equal(names([room('x', '?', 0.75, 0, 3, 3, 'desk', 0), room('w', '?', 0, 0, 0.65, 2, '', 1)], [{ a: 'w', b: 'x' }]).w, 'Room 2');   // not off a bedroom (two Rooms: numbered)
  const two = names([bed, room('w1', '?', 0, 0, 0.65, 2, '', 1), room('b2', '?', 5, 0, 3, 3, 'bed', 2), room('w2', '?', 4.25, 0, 0.65, 2, '', 3)], [{ a: 'w1', b: 'bed' }, { a: 'w2', b: 'b2' }]);
  assert.equal(two.w1, 'Wardrobe 1'); assert.equal(two.w2, 'Wardrobe 2');
});

test('a corridor shape with two or more doors off it is a hall; anything else is "Room"', () => {
  assert.equal(names([room('h', '?', 0, 0, 3.2, 1.1)], [{ a: 'h', b: 'x' }, { a: 'y', b: 'h' }]).h, 'Hall');
  assert.equal(names([room('h', '?', 0, 0, 3.2, 1.1)], [{ a: 'h', b: 'x' }]).h, 'Room');   // one door: not a hall
  assert.equal(names([room('s', '?', 0, 0, 2, 3, 'chair')]).s, 'Room');
});

test("a person's name wins over the printed and the suggested name; clearing the box gives the room back", () => {
  const rs = [{ id: 'a', name: 'Bedroom 1', nameSrc: 'drawn', printed: '?', suggested: 'Bedroom 1' }, { id: 'b', name: 'Study', nameSrc: 'printed', printed: 'Study' }];
  applyNameEdits(rs, { a: 'Main bedroom', b: 'Office' });
  assert.deepEqual(rs.map((r) => [r.name, r.nameSrc]), [['Main bedroom', 'person'], ['Office', 'person']]);
  applyNameEdits(rs, { a: '  ', b: '' });
  assert.deepEqual(rs.map((r) => [r.name, r.nameSrc]), [['Bedroom 1', 'drawn'], ['Study', 'printed']]);
});

test('reading order is rows top to bottom, then left to right', () => {
  const o = readingOrder([{ id: 'c', x: 50, y: 400 }, { id: 'b', x: 300, y: 105 }, { id: 'a', x: 40, y: 100 }], 50);
  assert.deepEqual(['a', 'b', 'c'].map((k) => o.get(k)), [0, 1, 2]);
});
