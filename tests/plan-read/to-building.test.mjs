// The drop page's step from an AI read to a twin building (toBuilding in planTrace.ts), on a made-up 8 m by 6 m box.
// Run with:  node --test tests/plan-read/*.test.mjs
// planTrace.ts is TypeScript: Node (22.18 or later) strips the types as it loads it. Its one value import has no file
// extension (the bundler adds it), so a small resolve hook below adds ".ts". No drawing, no real house, no network.
import { register } from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';

register('data:text/javascript,' + encodeURIComponent(`
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
export async function resolve(spec, ctx, next) {
  if (/^\\.\\.?\\//.test(spec) && !/\\.[cm]?[jt]s$/.test(spec) && ctx.parentURL?.endsWith('.ts')) {
    const u = new URL(spec + '.ts', ctx.parentURL);
    if (existsSync(fileURLToPath(u))) return next(u.href, ctx);
  }
  return next(spec, ctx);
}`));
const { toBuilding } = await import('../../plan-studio/twins/src/twin/planTrace.ts');

// 10 mm per pixel. Outside wall centrelines at x 100 and 900, y 100 and 700 (15 px thick). With the 150 mm walls the page
// makes the footprint 8.15 by 6.15 m and puts home u = (10 x - 925) / 1000, v = (10 y - 925) / 1000 (metres).
const u = (x) => (10 * x - 925) / 1000, v = (y) => (10 * y - 925) / 1000;
const W = (x1, y1, x2, y2, t = 10, ext = false) => ({ a: [x1, y1], b: [x2, y2], t, ext, conf: 0.9 });
const O = (kind, x1, y1, x2, y2) => ({ kind, a: [x1, y1], b: [x2, y2], conf: 0.9 });
const R = (name, x, y, w, h, fixtures = '') => ({ name, x, y, w, h, conf: 0.8, ...(fixtures ? { fixtures } : {}) });
function plan({ walls = [], openings = [], rooms = [] } = {}) {
  return {
    label: 'Made-up box', src: 'ai', dims: [], north: null, mmPerPx: 10, offsetMm: [0, 0], scaleNote: '', notes: '', image: null,
    walls: [W(100, 100, 900, 100, 15, true), W(900, 100, 900, 700, 15, true), W(900, 700, 100, 700, 15, true), W(100, 700, 100, 100, 15, true),
      W(500, 100, 500, 400), W(100, 400, 500, 400),            // a bedroom in the north-west corner
      W(170, 100, 170, 300), W(100, 300, 170, 300),            // a wardrobe 0.6 m deep inside it, against its west wall
      W(700, 100, 700, 330), W(700, 450, 700, 700),            // two wall pieces in line with a 1.2 m gap between them
      ...walls],
    openings, rooms,
  };
}
const opts = { plate: 2.4, pitch: 15, floor: 0.6, roof: 'gable' };
const near = (a, b, tol = 0.03) => Math.abs(a - b) <= tol;
const build = (p) => { const b = toBuilding(p, 't', opts); return { b, L: b.building.levels[0] }; };

test('a wardrobe 0.6 m deep is kept as a room, and the bedroom box that swallowed it is cut back to its far wall', () => {
  const { b, L } = build(plan({ rooms: [R('Bedroom 2', 100, 100, 400, 300), R('W/R', 100, 100, 70, 200), R('Sliver', 700, 450, 2.5, 100)] }));
  const robe = L.rooms.find((r) => r.name === 'W/R'), bed = L.rooms.find((r) => r.name === 'Bedroom 2');
  assert.ok(robe, 'wardrobe kept'); assert.ok(robe.w >= 0.45 && robe.w < 0.7, `wardrobe width ${robe.w}`);
  assert.ok(near(robe.u, 0.15) && near(robe.v, 0.15), 'wardrobe against the outside walls');
  assert.ok(bed.u > robe.u + robe.w, `bedroom starts beyond the wardrobe (${bed.u})`);
  assert.ok(near(bed.u, u(170) + 0.05), `bedroom stops at the wardrobe wall's far face (${bed.u})`);
  assert.ok(near(bed.u + bed.w, u(500) - 0.05) && near(bed.v + bed.d, v(400) - 0.05), 'its other sides unchanged');
  assert.ok(!L.rooms.some((r) => r.name === 'Sliver'), 'a 25 cm sliver is still not a room');
  assert.ok(b.report.some((t) => /1 room cut back where a smaller room/.test(t)));
});

test('rooms whose tag prints "?" keep "?" as the printed name, get a suggested name marked as such, and the report says so', () => {
  const { b, L } = build(plan({ rooms: [R('?', 500, 100, 200, 300, 'desk, chair'), R('', 720, 100, 170, 300)] }));
  assert.deepEqual(L.rooms.map((r) => [r.name, r.nameSrc, r.printed]), [['Room 1', 'drawn', '?'], ['Room 2', 'drawn', '?']]);
  assert.deepEqual(b.labels.map((t) => t.text), ['Room 1', 'Room 2']);
  assert.ok(b.report.includes('2 room tags print "?" on the drawing, or there is no tag. Names suggested from what is drawn in each room: check them above.'));
});

test('suggested names on a read: bed drawn gives Bedroom, the small room off it through its sliders gives Wardrobe; printed names stay', () => {
  const p = plan({ rooms: [R('?', 100, 100, 400, 300, 'double bed'), R('?', 100, 100, 70, 200), R('Study', 720, 450, 170, 240)], openings: [O('door-double', 170, 120, 170, 280)] });
  const { b, L } = build(p);
  const by = Object.fromEntries(L.rooms.map((r) => [r.name, r]));
  assert.equal(by.Bedroom.nameSrc, 'drawn'); assert.equal(by.Wardrobe.nameSrc, 'drawn'); assert.equal(by.Study.nameSrc, 'printed');
  assert.ok(b.report.some((t) => t.startsWith('2 room tags print "?"')));
});

test("a person's name wins, and still wins when the same read is built again (an option changed)", async () => {
  const { applyNameEdits } = await import('../../plan-studio/twins/src/twin/roomNames.ts');
  const p = plan({ rooms: [R('?', 100, 100, 400, 300, 'double bed')] });
  const edits = {};
  const first = build(p).L.rooms; edits[first[0].id] = 'Main bedroom';
  applyNameEdits(first, edits);
  assert.deepEqual([first[0].name, first[0].nameSrc, first[0].printed], ['Main bedroom', 'person', '?']);
  const again = toBuilding(p, 't', { ...opts, roof: 'skillion', pitch: 8 }).building.levels[0].rooms;
  assert.equal(again[0].name, 'Bedroom');                     // a fresh build suggests again
  applyNameEdits(again, edits);
  assert.deepEqual([again[0].name, again[0].nameSrc], ['Main bedroom', 'person']);
});

test('two wall pieces in line with no opening between them stay two walls (a hall runs past), with no invented opening', () => {
  const { L } = build(plan());
  const at = L.partitions.filter((p) => p.axis === 'z' && near(p.at, u(700), 0.06));
  assert.equal(at.length, 2, JSON.stringify(at));
  assert.ok(at.every((p) => p.openings.length === 0));
});

test('the same two pieces with a door read in the gap become one wall with that door', () => {
  const { L } = build(plan({ openings: [O('door', 700, 345, 700, 435)] }));
  const at = L.partitions.filter((p) => p.axis === 'z' && near(p.at, u(700), 0.06));
  assert.equal(at.length, 1);
  assert.equal(at[0].openings.length, 1); assert.equal(at[0].openings[0].kind, 'door');
  assert.ok(near(at[0].openings[0].a, v(330), 0.06) && near(at[0].openings[0].b, v(450), 0.06));
});

test('outside: a 3.6 m bi-fold read as door-double keeps its full width as a sliding or folding door', () => {
  const { L } = build(plan({ openings: [O('door-double', 150, 700, 510, 700)] }));
  const S = L.walls.find((w) => w.id === 'S').openings;
  assert.equal(S.length, 1); assert.equal(S[0].type, 'slider');
  assert.ok(near(S[0].a, u(150)) && near(S[0].b, u(510)), `${S[0].a} to ${S[0].b}`);
});

test('outside: a pair of doors under 1.6 m stays hinged at full width; a single door read too wide is cut to 1.2 m about its centre', () => {
  const { L } = build(plan({ openings: [O('door-double', 150, 700, 280, 700), O('door', 600, 700, 750, 700)] }));
  const S = L.walls.find((w) => w.id === 'S').openings;
  const pair = S.find((o) => o.name === 'Double doors'), one = S.find((o) => o.name === 'Door');
  assert.equal(pair.type, 'hinged'); assert.ok(near(pair.b - pair.a, 1.3));
  assert.ok(near(one.b - one.a, 1.2) && near((one.a + one.b) / 2, (u(600) + u(750)) / 2), `${one.a} to ${one.b}`);
});

test('outside: fixed glazing is a window to the floor, not a sliding door; a glazed door is a door', () => {
  const { L } = build({ ...plan({ openings: [O('glazing', 600, 100, 800, 100), O('door', 200, 700, 290, 700)] }), rev: '2026-11-22b' });
  const N = L.walls.find((w) => w.id === 'N').openings, S = L.walls.find((w) => w.id === 'S').openings;
  assert.equal(N[0].kind, 'window'); assert.equal(N[0].type, 'fixed'); assert.equal(N[0].sill, 0);
  assert.equal(S[0].kind, 'door');
});

test('inside: wardrobe sliders read as door-double keep their full width; a single door stays one leaf wide', () => {
  const { L } = build(plan({ openings: [O('door-double', 200, 400, 370, 400), O('door', 500, 150, 500, 240)] }));
  const south = L.partitions.find((p) => p.axis === 'x' && near(p.at, v(400), 0.06));
  const east = L.partitions.find((p) => p.axis === 'z' && near(p.at, u(500), 0.06));
  assert.equal(south.openings.length, 1); assert.equal(south.openings[0].kind, 'opening');
  assert.ok(near(south.openings[0].a, u(200)) && near(south.openings[0].b, u(370)), `${south.openings[0].a} to ${south.openings[0].b}`);
  assert.equal(east.openings.length, 1); assert.equal(east.openings[0].kind, 'door'); assert.ok(near(east.openings[0].b - east.openings[0].a, 0.9));
});

test('from the linework reader (a vector PDF), "glazing" stays a sliding door, as before', () => {
  const p = plan({ openings: [O('glazing', 600, 100, 800, 100)] }); p.src = 'drawing';
  const N = toBuilding(p, 't', opts).building.levels[0].walls.find((w) => w.id === 'N').openings;
  assert.equal(N[0].kind, 'door'); assert.equal(N[0].type, 'slider');
});

test('an AI reply from before the 2026-11-22b prompts (no revision stamp) keeps the old meaning: "glazing" is a sliding door', () => {
  const N = build(plan({ openings: [O('glazing', 600, 100, 800, 100)] })).L.walls.find((w) => w.id === 'N').openings;
  assert.equal(N[0].kind, 'door'); assert.equal(N[0].type, 'slider');
});
