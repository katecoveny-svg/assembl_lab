// The asset library: one catalogue (plan-studio/twins/src/twin/library/catalogue.ts) and its manifest for the ops page
// (plan-studio/twins/library/catalogue.json, written by tools/library-shots.py), every picture made and small, the
// picks kept on a project in both stores, viewers kept out, and the hand-over to the 3D page agreeing on both sides.
// Run with:  node --test tests/architecture/library.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync, existsSync } from 'node:fs';
import { CATALOGUE, CATEGORIES, ROOMS } from '../../plan-studio/twins/src/twin/library/catalogue.ts';
import { cleanPick, selectionsOf, addPick, setPick, removePick, pickCount, canPick, saveSelections, selectionsHandoff, picksHref, SELECTIONS_KEY, SELECTIONS_TYPE, ROOM_CHOICES, MANIFEST_URL, MAX_QTY } from '../../architecture/js/selections.js';
import { createStore, memoryBackend } from '../../architecture/js/store.js';
import { newProject, twinLink } from '../../architecture/js/model.js';
import { createCloudStore, toRecord, fromRecord, CloudError } from '../../architecture/js/cloud.js';
import { fakeSupabase } from './fake-supabase.mjs';

const root = new URL('../../', import.meta.url);
const T0 = '2026-11-22T00:00:00.000Z';
const PRACTICE = { id: '11111111-1111-4111-8111-111111111111', name: 'Tui Architects', role: 'member' };
const man = JSON.parse(readFileSync(new URL('plan-studio/twins/library/catalogue.json', root), 'utf8'));
const LIMIT = 60 * 1024;

// ---- the catalogue -----------------------------------------------------------------------------------------------------
test('catalogue: ids unique, every piece in a known category, with real dimensions, a licence, a credit and a picture', () => {
  const ids = CATALOGUE.map((x) => x.id);
  assert.equal(new Set(ids).size, ids.length, 'ids are unique');
  assert.ok(CATALOGUE.length >= 50, `the library has ${CATALOGUE.length} pieces`);
  const cats = new Set(CATEGORIES.map((c) => c.id));
  for (const c of CATEGORIES) assert.ok(CATALOGUE.some((x) => x.category === c.id), `${c.title} has at least one piece`);
  for (const it of CATALOGUE) {
    assert.ok(cats.has(it.category), `${it.id}: category`);
    for (const k of ['w', 'd', 'h']) assert.ok(Number.isInteger(it.dims[k]) && it.dims[k] > 0 && it.dims[k] < 10000, `${it.id}: ${k} in whole millimetres`);
    assert.ok(it.licence.length > 20 && it.credit.length > 5, `${it.id}: licence and credit travel with it`);
    assert.match(it.pic, /^pics\/[A-Z0-9-]+\.webp$/);
    assert.ok(['floor', 'wall', 'hang', 'surface'].includes(it.fit), `${it.id}: fit`);
    assert.ok(it.rooms.length && it.rooms.every((r) => ROOMS.includes(r)), `${it.id}: rooms`);
    assert.ok(it.source === 'procedural' || (it.source === 'glb' && it.glb), `${it.id}: source`);
    for (const f of it.finishes ?? []) assert.match(f.swatch, /^#[0-9a-f]{6}$/i, `${it.id}: finish swatch`);
  }
  assert.deepEqual([...ROOMS], ROOM_CHOICES, 'the 3D page and the ops page offer the same rooms');
});

test('catalogue: titles name what a piece is, with no brand or product names, and no bare "AI"', () => {
  const banned = /\b(AI|IKEA|Vitra|Fritz|Hansen|Kartell|Muuto|HAY|Ercol|Menu|Gubi|Flos|Louis Poulsen|Artek|Herman Miller|Eames|Fisher|Paykel|Bosch|Miele|Smeg|Breville|Fender|Gibson|Tesla|Resene|Dulux)\b|[®™©]/;
  for (const it of CATALOGUE) assert.doesNotMatch(it.title, banned, `${it.id}: ${it.title}`);
});

test('manifest: written from the catalogue, every picture there and at most 60 KB, model bounds checked against the dimensions', () => {
  assert.equal(man.schema, 'assembl.library.v1');
  assert.equal(man.base, MANIFEST_URL.replace(/catalogue\.json$/, ''), 'the ops page finds pictures where the manifest says');
  assert.deepEqual(man.items.map((x) => x.id), CATALOGUE.map((x) => x.id), 'the manifest lists the catalogue, in order (run tools/library-shots.py after changing it)');
  assert.deepEqual(man.categories, CATEGORIES);
  for (const it of man.items) {
    const c = CATALOGUE.find((x) => x.id === it.id);
    assert.deepEqual({ title: it.title, category: it.category, dims: it.dims, licence: it.licence }, { title: c.title, category: c.category, dims: c.dims, licence: c.licence }, `${it.id} matches the catalogue`);
    const file = new URL(`plan-studio/twins/library/${it.pic}`, root);
    assert.ok(existsSync(file), `${it.id}: picture ${it.pic} exists`);
    const bytes = statSync(file).size;
    assert.ok(bytes > 2000 && bytes <= LIMIT, `${it.id}: picture is ${bytes} bytes (at most ${LIMIT})`);
    const head = readFileSync(file).subarray(0, 12);
    assert.equal(head.subarray(0, 4).toString(), 'RIFF'); assert.equal(head.subarray(8, 12).toString(), 'WEBP');
    // the stated size is the model's own: measured when the picture was made, within 2 % or 10 mm
    assert.ok(it.measured, `${it.id}: measured`);
    for (const k of ['w', 'd', 'h']) assert.ok(Math.abs(it.measured[k] - it.dims[k]) <= Math.max(10, it.dims[k] * 0.02), `${it.id}: ${k} stated ${it.dims[k]} mm, model ${it.measured[k]} mm`);
    assert.ok(it.tris > 0 && it.tris < 250000, `${it.id}: ${it.tris} triangles`);
  }
});

// ---- picks -------------------------------------------------------------------------------------------------------------------
test('picks: added with a quantity and a room, merged when the same, changed, removed, and kept to a safe shape', () => {
  let list = [];
  list = addPick(list, { id: 'LIB-SEAT-01', qty: 1, room: 'Living', finish: 'oat', who: 'Ana', now: T0 });
  list = addPick(list, { id: 'LIB-SEAT-01', qty: 2, room: 'Living', finish: 'oat', who: 'Ana', now: T0 });
  list = addPick(list, { id: 'LIB-SEAT-01', qty: 1, room: 'Study', finish: 'oat', now: T0 });
  list = addPick(list, { id: 'HERO-NAT-01', qty: 500, room: 'Garage', now: T0 });
  assert.equal(list.length, 3);
  assert.equal(list[0].qty, 3, 'the same piece, finish and room adds up');
  assert.equal(list[2].qty, MAX_QTY, 'quantity capped');
  assert.equal(list[2].room, '', 'a room not on the list is left as any room');
  assert.equal(pickCount(list), 3 + 1 + MAX_QTY);
  list = setPick(list, list[1].uid, { qty: 4, room: 'Bedroom' });
  assert.deepEqual([list[1].qty, list[1].room], [4, 'Bedroom']);
  list = removePick(list, list[0].uid);
  assert.deepEqual(list.map((p) => p.id), ['LIB-SEAT-01', 'HERO-NAT-01']);
  assert.throws(() => addPick(list, { id: '<script>' }), /not in the library/);
  assert.equal(cleanPick({ id: 'x y' }), null);
  assert.deepEqual(selectionsOf({ selections: [{ id: 'LIB-RUG-01', qty: '2', room: 'Living', uid: 'sel_abcd1234' }, null, { id: 'bad id' }] }).map((p) => [p.id, p.qty, p.uid]), [['LIB-RUG-01', 2, 'sel_abcd1234']]);
  assert.deepEqual(selectionsOf({}), []);
});

test('picks are kept on the project in the browser store, and logged', async () => {
  const s = createStore(memoryBackend()), b = newProject({ name: 'Bach on the point', now: T0 });
  await s.saveProject(b);
  const list = addPick([], { id: 'LIB-BED-01', qty: 1, room: 'Bedroom', finish: 'white', now: T0 });
  await saveSelections(s, b.project.id, list, { who: 'Ana', detail: '1 × Queen bed', now: T0 });
  const back = await s.loadProject(b.project.id);
  assert.deepEqual(selectionsOf(back.project).map((p) => [p.id, p.qty, p.room, p.finish]), [['LIB-BED-01', 1, 'Bedroom', 'white']]);
  assert.ok(back.activity.some((a) => a.action === 'Selections changed' && a.who === 'Ana'));
  // a project file carries them (export, import)
  const x = await s.exportProject(b.project.id, T0), s2 = createStore(memoryBackend());
  const got = await s2.importProject(x.text, T0);
  assert.equal(selectionsOf((await s2.loadProject(got.project_id)).project).length, 1);
});

test('picks are kept in the shared records in the project row’s extra column, and come back unchanged', async () => {
  const p = { ...newProject({ name: 'House on the ridge', now: T0 }).project, selections: [{ uid: 'sel_aaaa1111', id: 'LIB-SEAT-02', qty: 2, room: 'Living', finish: 'sage', added_at: T0, added_by: 'Ana' }] };
  const rec = toRecord('project', p, { practice_id: PRACTICE.id });
  assert.deepEqual(rec.extra.selections, p.selections, 'project.extra.selections in the database');
  assert.deepEqual(fromRecord('project', rec).selections, p.selections);
  const fake = fakeSupabase(), local = createStore(memoryBackend());
  const cloud = createCloudStore({ client: fake, practice: PRACTICE, local });
  const b = newProject({ name: 'House on the ridge', now: T0 });
  await cloud.saveProject(b);
  const list = addPick([], { id: 'HERO-OUT-01', qty: 1, room: 'Outdoor', now: T0 });
  await saveSelections(cloud, b.project.id, list, { who: 'Ana', now: T0 });
  const row = fake.db.project.find((r) => r.name === 'House on the ridge');
  assert.deepEqual(row.extra.selections.map((x) => x.id), ['HERO-OUT-01'], 'in the row’s extra column');
  const back = await cloud.get('project', b.project.id);
  assert.deepEqual(selectionsOf(back).map((x) => [x.id, x.room]), [['HERO-OUT-01', 'Outdoor']]);
});

test('roles: a viewer of the shared records can look but not change the picks; members, the browser and the Sample can', async () => {
  assert.equal(canPick({ shared: true, sample: false, role: 'viewer' }), false);
  assert.equal(canPick({ shared: true, sample: false, role: 'member' }), true);
  assert.equal(canPick({ shared: true, sample: false, role: 'owner' }), true);
  assert.equal(canPick({ shared: true, sample: true, role: 'viewer' }), true, 'the Sample stays in the browser');
  assert.equal(canPick({ shared: false }), true);
  // and the shared records refuse a viewer's write regardless of the page
  const fake = fakeSupabase(), local = createStore(memoryBackend());
  const member = createCloudStore({ client: fake, practice: PRACTICE, local });
  const b = newProject({ name: 'House on the ridge', now: T0 });
  await member.saveProject(b);
  const viewer = createCloudStore({ client: fake, practice: { ...PRACTICE, role: 'viewer' }, local });
  await assert.rejects(saveSelections(viewer, b.project.id, addPick([], { id: 'LIB-RUG-01', now: T0 }), { now: T0 }), (e) => e instanceof CloudError && /viewer/.test(e.message));
  assert.deepEqual(selectionsOf(await member.get('project', b.project.id)), [], 'nothing was changed');
  // the section leaves out what a viewer cannot use
  const view = readFileSync(new URL('architecture/js/library-view.js', root), 'utf8');
  assert.match(view, /place\.can \? `<button type="button" class="link" data-lib="remove"/);
  assert.match(view, /place\.can \? `<div class="lib-add">/);
  assert.match(view, /if \(what === 'add' && place\.can\)/);
});

// ---- the hand-over to the 3D page ---------------------------------------------------------------------------------------------
test('hand-over: both sides use the same key, entry type and address; the 3D page reads only its own project’s picks', () => {
  const src = readFileSync(new URL('plan-studio/twins/src/twin/library/picks.ts', root), 'utf8');
  assert.equal(src.match(/PICKS_KEY = '([^']+)'/)?.[1], SELECTIONS_KEY);
  assert.equal(src.match(/PICKS_TYPE = '([^']+)'/)?.[1], SELECTIONS_TYPE);
  assert.match(src, /get\('picks'\)/);
  assert.match(src, /String\(h\.project_id\) !== pid/);
  const plan = readFileSync(new URL('plan-studio/twins/src/twin/projectPlan.ts', root), 'utf8');
  assert.match(plan, /has\('picks'\)[\s\S]{0,200}import\('\.\/library\/picks'\)/, 'the 3D page loads the picks code only when asked');
  const p = { ...newProject({ name: 'Example house', now: T0 }).project, model: { fingerprint: '99eea08ce8e9', file_name: 'hero.plan.json' } };
  const h = selectionsHandoff(p, addPick([], { id: 'LIB-SEAT-01', qty: 2, room: 'Living', now: T0 }));
  assert.equal(h.key, SELECTIONS_KEY);
  assert.deepEqual(JSON.parse(h.value), { type: SELECTIONS_TYPE, project_id: p.id, model: '99eea08ce8e9', items: [{ id: 'LIB-SEAT-01', qty: 2, room: 'Living', finish: '' }] });
  assert.equal(picksHref(twinLink(p.model), p.id), `/plan-studio/twins/drop/?plan=hero.plan.json&picks=${encodeURIComponent(p.id)}`);
  assert.equal(picksHref({ href: '/plan-studio/twins/drop/?fin=' }, 'p_1'), '/plan-studio/twins/drop/?fin=&picks=p_1');
  assert.equal(picksHref(null, 'p_1'), null);
});

test('the library loads lazily: registered with the page, its screen, styles, catalogue and pictures only with the Presentation tab', () => {
  const reg = readFileSync(new URL('architecture/js/library.js', root), 'utf8');
  assert.match(reg, /tab: 'presentation'/);
  assert.match(reg, /import\('\.\/library-view\.js'\)/, 'the screen is imported on demand');
  assert.match(reg, /MutationObserver/);
  assert.doesNotMatch(reg, /^import .*library-view/m, 'and never at the top');
  const view = readFileSync(new URL('architecture/js/library-view.js', root), 'utf8');
  assert.match(view, /loading="lazy"/);
  const css = readFileSync(new URL('architecture/library.css', root), 'utf8');
  assert.doesNotMatch(css.replace(/\/\*[\s\S]*?\*\//g, ''), /#[0-9a-f]{3,8}\b|rgba?\(/i, 'styled only with the ops.css tokens');
  assert.ok(statSync(new URL('architecture/js/library.js', root)).size < 4000, 'the part loaded with the page stays small');
});
