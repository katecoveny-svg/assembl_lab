// Project covers: the plan drawn from a plan model, true to its proportions with nothing added; the decorative sketch
// for a project with no model; and a project's status at a glance. No browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { planOutline, coverSvg, sketchSvg, isOutline, outlineFor, HOSTED_OUTLINES } from '../../architecture/js/cover.js';
import { HOSTED_MODELS, newProject, recordApproval, markDone, askForApproval } from '../../architecture/js/model.js';
import { modelFingerprint } from '../../architecture/js/fingerprint.js';
import { glance, segments } from '../../architecture/js/glance.js';

const root = new URL('../../', import.meta.url);
const wall = (axis, at, from, to, out, extra = {}) => ({ id: `${axis}${at}`, name: 'w', axis, at, from, to, out, thickness: 0.2, cladding: 'x', ...extra });
/** a plain box of a house, 10 m along x and 6 m along z, outside faces at 0 and at 10 and 6 */
const box = (more = {}) => ({ schema: 'assembl.plan-model.v1', buildings: [{ id: 'h', origin: [0, 0], levels: [{ id: 'L1', name: 'Ground floor', floor: 0,
  walls: [wall('x', 0, 0, 10, -1), wall('x', 6, 0, 10, 1), wall('z', 0, 0, 6, -1), wall('z', 10, 0, 6, 1)], partitions: [], rooms: [{ id: 'R1', name: 'Room', u: 0.2, v: 0.2, w: 9.6, d: 5.6 }], decks: [], ...more }] }] });
const viewBox = (svg) => svg.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);

test('a plain box: the extent is the model’s own, and the drawing keeps its proportions', () => {
  const o = planOutline(box());
  assert.ok(isOutline(o));
  assert.deepEqual([o.x, o.y, o.w, o.h], [0, 0, 10, 6]);
  assert.equal(o.walls.length, 4); assert.equal(o.parts.length, 0); assert.equal(o.glass.length, 0); assert.equal(o.decks.length, 0);
  assert.equal(o.rooms, 1); assert.equal(o.level, 'Ground floor');
  const svg = coverSvg(o), [, , vw, vh] = viewBox(svg);
  assert.ok(Math.abs(vw / vh - (10 + 1.2) / (6 + 1.2)) < 1e-9, 'the margin is the same on every side, so width to height is the model’s');
  assert.match(svg, /preserveAspectRatio="xMidYMid meet"/, 'scaled whole, never stretched');
  assert.match(svg, /role="img" aria-label="Ground floor plan, drawn from the plan model"/);
  assert.match(svg, /stroke="currentColor"/); assert.match(svg, /vector-effect="non-scaling-stroke"/);
});

test('an outside wall’s thickness runs inwards from its face; a partition is centred; openings leave gaps', () => {
  const plan = box({ partitions: [{ id: 'P', axis: 'z', at: 5, from: 0.2, to: 5.8, thickness: 0.1, openings: [{ kind: 'door', a: 2, b: 2.9 }] }] });
  plan.buildings[0].levels[0].walls[0].openings = [{ kind: 'window', a: 2, b: 4 }, { kind: 'door', a: 6, b: 7 }];
  const o = planOutline(plan);
  // the wall along x at z = 0, facing out to -z: from z 0 to 0.2, cut at the window (2 to 4) and the door (6 to 7)
  assert.deepEqual(o.walls.filter((r) => r[1] === 0 && r[3] === 0.2), [[0, 0, 2, 0.2], [4, 0, 6, 0.2], [7, 0, 10, 0.2]]);
  assert.deepEqual(o.walls.filter((r) => r[1] === 5.8), [[0, 5.8, 10, 6]], 'the wall at z = 6 facing +z runs inwards to 5.8');
  assert.deepEqual(o.walls.filter((r) => r[0] === 9.8), [[9.8, 0, 10, 6]]);
  assert.deepEqual(o.glass, [[2, 0, 4, 0.2]], 'a window is drawn across the wall; a door is a gap only');
  assert.deepEqual(o.parts, [[4.95, 0.2, 5.05, 2], [4.95, 2.9, 5.05, 5.8]], 'the partition is centred on 5 and cut at its door');
});

test('decks and a building’s origin are where the model puts them, and nothing is drawn that it does not have', () => {
  const plan = box({ decks: [{ id: 'D', u0: -2, u1: 0, v0: 0, v1: 6 }] });
  plan.buildings[0].origin = [100, 50];
  const o = planOutline(plan);
  assert.deepEqual([o.x, o.y, o.w, o.h], [98, 50, 12, 6]);
  assert.deepEqual(o.decks, [[98, 50, 100, 56]]);
  const svg = coverSvg(o);
  assert.equal((svg.match(/<path/g) ?? []).length, 2, 'walls and decks only: no partitions or windows were in the model');
  assert.doesNotMatch(svg, /<text|<circle|<image/, 'no labels, symbols or pictures are added');
  // the lowest level is drawn when there are several
  plan.buildings[0].levels.push({ id: 'L2', name: 'First floor', floor: 3, walls: [wall('x', 0, 0, 30, -1)] });
  assert.equal(planOutline(plan).level, 'Ground floor');
  assert.equal(planOutline(plan).w, 12, 'the upper floor is not drawn');
});

test('a model with nothing to draw has no outline; a bad outline is never drawn', () => {
  assert.equal(planOutline(null), null);
  assert.equal(planOutline({ buildings: [] }), null);
  assert.equal(planOutline({ buildings: [{ levels: [{ walls: [{ axis: 'y', at: 0, from: 0, to: 4 }] }] }] }), null);
  assert.equal(coverSvg(null), '');
  assert.equal(coverSvg({ v: 1, x: 0, y: 0, w: 0, h: 5, walls: [], parts: [], glass: [], decks: [] }), '', 'no size');
  assert.equal(isOutline({ v: 1, x: 0, y: 0, w: 1, h: 1, walls: [[0, 0, 'x', 1]], parts: [], glass: [], decks: [] }), false);
  assert.equal(coverSvg(planOutline(box()), { label: 'A "plan" <here>' }).includes('aria-label="A &quot;plan&quot; &lt;here&gt;"'), true, 'the label is escaped');
});

test('the lab’s hosted models: the kept outlines are exactly what their files say', () => {
  assert.deepEqual(Object.keys(HOSTED_OUTLINES).sort(), HOSTED_MODELS.map((m) => m.fingerprint).sort(), 'one outline per hosted model, by fingerprint');
  for (const m of HOSTED_MODELS) {
    const plan = JSON.parse(readFileSync(new URL(`plan-studio/twins/drop/${m.file_name}`, root), 'utf8'));
    assert.equal(modelFingerprint(plan), m.fingerprint);
    assert.deepEqual(HOSTED_OUTLINES[m.fingerprint], planOutline(plan), `${m.file_name}: re-make HOSTED_OUTLINES if the file changed`);
    // proportions, worked out a second way: the outside walls' faces and the decks, straight from the file
    const L = plan.buildings[0].levels[0], xs = [], zs = [];
    for (const w of L.walls) (w.axis === 'x' ? zs : xs).push(w.at);
    for (const w of L.walls) (w.axis === 'x' ? xs : zs).push(w.from, w.to);
    for (const d of L.decks) { xs.push(d.u0, d.u1); zs.push(d.v0, d.v1); }
    const o = HOSTED_OUTLINES[m.fingerprint];
    assert.ok(Math.abs(o.w - (Math.max(...xs) - Math.min(...xs))) < 0.011 && Math.abs(o.h - (Math.max(...zs) - Math.min(...zs))) < 0.011, `${m.file_name}: ${o.w} by ${o.h} m`);
  }
});

test('which outline a project draws: its own, then a hosted one, then this browser’s; the sketch otherwise', () => {
  const own = planOutline(box()), hosted = HOSTED_MODELS[0].fingerprint;
  assert.equal(outlineFor({ fingerprint: 'abc', outline: own }), own);
  assert.equal(outlineFor({ fingerprint: hosted }), HOSTED_OUTLINES[hosted]);
  assert.equal(outlineFor({ fingerprint: 'abc' }, { abc: own }), own);
  assert.equal(outlineFor({ fingerprint: 'abc', outline: { v: 9 } }, { abc: own }), own, 'a damaged outline on the project is passed over');
  assert.equal(outlineFor({ fingerprint: '' }), null);
  assert.equal(outlineFor(null), null);
  const sk = sketchSvg();
  assert.match(sk, /aria-hidden="true"/); assert.match(sk, /data-decorative="true"/);
  assert.doesNotMatch(sk, /role="img"|aria-label/, 'the sketch is never offered to a screen reader as the project’s drawing');
});

test('at a glance: one status and a short next step for each project', () => {
  const T = '2026-11-20T00:00:00.000Z';
  const b = newProject({ name: 'House', now: T });
  assert.deepEqual(segments(b.stages), ['now', 'todo', 'todo', 'todo', 'todo', 'todo', 'todo']);
  let g = glance(b);
  assert.deepEqual([g.status, g.word, g.next, g.stage.n, g.done], ['needs', 'Needs something', 'Look up the site facts', 1, 0]);
  b.project.site.facts = [{ label: 'Zone', status: 'live' }];
  g = glance(b);
  assert.equal(g.status, 'go'); assert.match(g.next, /^\d+ open tasks$/);
  b.tasks.find((t) => t.stage === 'predesign').status = 'blocked';
  assert.deepEqual([glance(b).status, glance(b).next], ['needs', '1 blocked task']);
  askForApproval(b, 'predesign', T);
  assert.deepEqual([glance(b).status, glance(b).word], ['waiting', 'Waiting on a person']);
  assert.equal(glance(b).segs[0], 'wait');
  recordApproval(b, 'predesign', { who: 'Mere Ngata', role: 'Owner or client' }, T);
  assert.deepEqual([glance(b).status, glance(b).next], ['needs', 'Approved: mark the stage done']);
  markDone(b, 'predesign', T);
  g = glance(b);
  assert.deepEqual([g.status, g.next, g.stage.label, g.done], ['needs', 'Attach the plan model', 'Concept design', 1]);
  assert.deepEqual(glance({ project: null, stages: [] }).status, 'needs');
});
