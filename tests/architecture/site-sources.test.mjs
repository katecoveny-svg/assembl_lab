// Site and sources: the rules with no page in them (slots, versions, the site_sources record, what goes to the 3D page),
// and what the two stores do with owner_kind 'source' and with the record on the project. Invented data only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createStore, memoryBackend, memoryFiles, OWNER_KINDS } from '../../architecture/js/store.js';
import { newProject } from '../../architecture/js/model.js';
import { createCloudStore, createGateway, toRecord, fromRecord } from '../../architecture/js/cloud.js';
import { ADDONS } from '../../architecture/js/modules.js';
import {
  SLOTS, checkSource, isSource, nextVersion, bySlot, sourceExtra, normalSiteSources, isConfirmed, pathPoints, pointFromSite, pointDiffers,
  parcelStatus, pickModel, siteHandoff, sourceList, blobSlots, withSiteSources, confirmPath, hasModel,
} from '../../architecture/js/site-sources-rules.js';
import { fakeSupabase } from './fake-supabase.mjs';

const mem = () => createStore(memoryBackend(), { files: memoryFiles() });
const bytes = (s) => new TextEncoder().encode(s);
const PDF = bytes('%PDF-1.4\n1 0 obj'), PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10]);
const note = (o) => ({ id: o.id, name: o.name, owner_kind: o.owner_kind ?? 'source', kept_at: o.kept_at ?? '2026-11-23T00:00:00Z', size: o.size ?? 10, extra: o.extra ?? sourceExtra({ slot: o.slot, version: o.version ?? 1, by: 'Aroha' }) });

test('five slots, in order, and the fixed ones all go to the 3D page except survey and other', () => {
  assert.deepEqual(SLOTS.map((s) => s.id), ['drawing_set', 'site_plan', 'camera_sketch', 'survey', 'flythrough', 'films', 'other']);
  assert.deepEqual(blobSlots(), ['drawing_set', 'site_plan', 'camera_sketch']);
});

test('each slot takes its own kinds, and says plainly when a file is not what its name says', () => {
  assert.equal(checkSource('drawing_set', 'set.pdf', PDF), '');
  assert.match(checkSource('drawing_set', 'set.png', PNG), /takes PDF/);
  assert.equal(checkSource('site_plan', 'plan.png', PNG), '');
  assert.equal(checkSource('camera_sketch', 'path.pdf', PDF), '');
  assert.match(checkSource('camera_sketch', 'path.png', PDF), /does not start the way a \.png/);
  for (const n of ['s.pdf', 's.csv', 's.xml', 's.landxml']) assert.equal(checkSource('survey', n, n.endsWith('pdf') ? PDF : bytes('<?xml version="1.0"?>')) && n.endsWith('csv') ? '' : checkSource('survey', n, n.endsWith('pdf') ? PDF : n.endsWith('csv') ? bytes('x,y,z\n1,2,3') : bytes('<?xml version="1.0"?>')), '');
  assert.match(checkSource('survey', 's.docx', PDF), /takes PDF, DWG, CSV, XML, LANDXML/);
  assert.equal(checkSource('other', 'anything.zip', bytes('PK')), '');
  assert.match(checkSource('drawing_set', 'e.pdf', new Uint8Array(0)), /empty/);
  assert.match(checkSource('nowhere', 'a.pdf', PDF), /not a place/);
});

test('owner kinds: source is allowed in the browser store and the shared one, and models and documents still are', async () => {
  assert.deepEqual(OWNER_KINDS, ['document', 'model', 'source']);
  const s = mem();
  const f = await s.putFile({ project_id: 'p', owner_kind: 'source', owner_id: 'p', name: 'set.pdf', type: 'application/pdf', data: PDF, extra: sourceExtra({ slot: 'drawing_set', version: 1, by: 'Aroha', note: 'Issued for consent' }) });
  assert.equal(f.owner_kind, 'source');
  assert.deepEqual((await s.getFile(f.id)).extra.source, { slot: 'drawing_set', version: 1, by: 'Aroha', note: 'Issued for consent' });
  await assert.rejects(s.putFile({ project_id: 'p', owner_kind: 'invoice', owner_id: 'p', name: 'x.pdf', data: PDF }), /needs the record it belongs to/);
  const fake = fakeSupabase();
  fake.auth = { getSession: async () => ({ data: { session: { access_token: 't' } } }) };
  const cloud = createCloudStore({ gateway: createGateway(fake), practice: { id: '11111111-1111-4111-8111-111111111111', name: 'Tui', role: 'member' }, local: mem() });
  const b = newProject({ name: 'House' });
  const pid = await cloud.saveProject(b);
  const c = await cloud.putFile({ project_id: pid, owner_kind: 'source', owner_id: pid, name: 'plan.png', type: 'image/png', data: PNG, extra: sourceExtra({ slot: 'site_plan', version: 1 }) });
  assert.equal(fake.db.file.at(-1).owner_kind, 'source');
  assert.equal(c.extra.source.slot, 'site_plan');
});

test('the migration allows source, and the page’s list and the database’s agree', () => {
  const dir = new URL('../../supabase/migrations/', import.meta.url);
  const f = readdirSync(dir).find((n) => /arch_file_source_kind\.sql$/.test(n));
  assert.ok(f, 'a migration is written');
  const sql = readFileSync(new URL(f, dir), 'utf8');
  for (const k of OWNER_KINDS) assert.ok(sql.includes(`'${k}'`), `${k} is in the migration`);
  assert.match(sql, /owner_kind <> 'source' or owner_id = project_id/);
  assert.ok(f > '20261122100200_arch_files_storage.sql');
});

test('versions stack by slot: a new drawing set keeps the old one; other stacks by file name', () => {
  const a = note({ id: 'a', name: 'set-A.pdf', slot: 'drawing_set', version: 1, kept_at: '2026-11-20T00:00:00Z' });
  const b = note({ id: 'b', name: 'set-B.pdf', slot: 'drawing_set', version: 2, kept_at: '2026-11-21T00:00:00Z' });
  const o1 = note({ id: 'o1', name: 'Notes.pdf', slot: 'other', version: 1 }), o2 = note({ id: 'o2', name: 'notes.PDF', slot: 'other', version: 2, kept_at: '2026-11-22T00:00:00Z' }), o3 = note({ id: 'o3', name: 'photo.png', slot: 'other', version: 1 });
  const all = [a, b, o1, o2, o3];
  assert.equal(nextVersion(all, 'drawing_set', 'anything.pdf'), 3);
  assert.equal(nextVersion(all, 'survey', 's.csv'), 1);
  assert.equal(nextVersion(all, 'other', 'NOTES.pdf'), 3, 'same name, whatever its case');
  assert.equal(nextVersion(all, 'other', 'new.pdf'), 1);
  const slots = Object.fromEntries(bySlot(all).map((s) => [s.slot.id, s.stacks]));
  assert.equal(slots.drawing_set.length, 1);
  assert.equal(slots.drawing_set[0].latest.id, 'b');
  assert.deepEqual(slots.drawing_set[0].older.map((f) => f.id), ['a']);
  assert.equal(slots.other.length, 2);
  assert.deepEqual(slots.other.find((s) => s.latest.id === 'o2').older.map((f) => f.id), ['o1']);
  // removing v1 does not renumber v2
  assert.equal(bySlot([b]).find((s) => s.slot.id === 'drawing_set').stacks[0].latest.version, 2);
  assert.equal(nextVersion([b], 'drawing_set', 'x.pdf'), 3);
  // models and documents are not sources
  assert.equal(isSource(note({ id: 'm', name: 'house.ifc', owner_kind: 'model', slot: 'drawing_set' })), false);
  assert.equal(isSource({ owner_kind: 'source', name: 'x.pdf', extra: {} }), false);
});

test('the one-line note is trimmed and kept to a line', () => {
  assert.equal(sourceExtra({ slot: 'survey', version: 1, note: `  ${'x'.repeat(300)}  ` }).source.note.length, 140);
  assert.equal(sourceExtra({ slot: 'survey', version: 1 }).source.by, '');
});

test('site_sources: the contract keeps its shape, and anything that does not fit is dropped, never guessed at', () => {
  assert.deepEqual(normalSiteSources(undefined), { point: null, camera_path: null });
  const good = { point: { lat: -36.8, lng: 175.1, source: 'LINZ address, chosen on the Site tab' }, camera_path: { pts: [[0, 0, 1.6], [5, 2, 1.6]], sketch_file_id: 'f1', traced_by: 'person', confirmed_by: 'Aroha', confirmed_at: '2026-11-23T01:00:00Z' } };
  assert.deepEqual(normalSiteSources(good), good);
  assert.deepEqual(Object.keys(normalSiteSources(good)), ['point', 'camera_path']);
  assert.deepEqual(Object.keys(normalSiteSources(good).camera_path), ['pts', 'sketch_file_id', 'traced_by', 'confirmed_by', 'confirmed_at']);
  assert.equal(normalSiteSources({ point: { lat: 51.5, lng: -0.1, source: 'x' } }).point, null, 'a point outside New Zealand is not kept');
  assert.equal(normalSiteSources({ camera_path: { pts: [[0, 0]], traced_by: 'tool' } }).camera_path, null, 'a point needs u, v and h');
  assert.equal(normalSiteSources({ camera_path: { pts: [] } }).camera_path, null);
  assert.equal(normalSiteSources({ camera_path: { pts: [[0, 0, 1]], traced_by: 'robot' } }).camera_path.traced_by, 'tool');
});

test('a path is confirmed only when a person is named and a time kept', () => {
  const p = { pts: [[0, 0, 1.6]], sketch_file_id: null, traced_by: 'tool', confirmed_by: null, confirmed_at: null };
  assert.equal(isConfirmed(p), false);
  assert.equal(isConfirmed(null), false);
  const c = confirmPath(p, 'Aroha', '2026-11-23T02:00:00Z');
  assert.equal(isConfirmed(c), true);
  assert.equal(c.traced_by, 'tool', 'who traced it is not changed by who confirmed it');
  assert.equal(confirmPath(null, 'Aroha'), null);
  assert.equal(confirmPath(p, '').confirmed_by, 'Someone in this practice');
});

test('the path is drawn from above: v across (west to east), u up (south to north), centred, nothing invented', () => {
  const pts = pathPoints({ pts: [[0, 0, 1], [10, 0, 1], [10, 10, 1]] });
  assert.equal(pts.length, 3);
  assert.ok(pts[1][1] < pts[0][1], 'further north is higher up the drawing');
  assert.ok(pts[2][0] > pts[1][0], 'further east is further right');
  assert.ok(pts.flat().every((x) => x >= 0 && x <= 100));
  assert.deepEqual(pathPoints(null), []);
  assert.equal(pathPoints({ pts: [[3, 3, 1]] }).length, 1, 'one point does not divide by zero');
});

test('the site point is the Site tab’s point, with where it came from', () => {
  assert.equal(pointFromSite({ lat: null, lon: null }), null);
  assert.equal(pointFromSite({ lat: 10, lon: 10 }), null, 'outside New Zealand');
  assert.deepEqual(pointFromSite({ lat: -36.8, lon: 175.1 }), { lat: -36.8, lng: 175.1, source: 'a point typed on the Site tab' });
  assert.match(pointFromSite({ lat: -36.8, lon: 175.1, address: { address: '1 Test Street' } }).source, /LINZ address/);
  assert.equal(pointFromSite({ lat: -36.8, lon: 175.1, address: { address: '1 Test Street' } }).source.includes('Test Street'), false, 'the street is not in the source line');
  assert.equal(pointDiffers(null, { lat: null }), false);
  assert.equal(pointDiffers(pointFromSite({ lat: -36.8, lon: 175.1 }), { lat: -36.8, lon: 175.1 }), false);
  assert.equal(pointDiffers(pointFromSite({ lat: -36.8, lon: 175.1 }), { lat: -36.9, lon: 175.1 }), true);
  assert.equal(pointDiffers(pointFromSite({ lat: -36.8, lon: 175.1 }), { lat: null }), true);
});

test('parcel status is only what the Site tab’s facts say', () => {
  assert.equal(parcelStatus(undefined).state, 'no-site');
  assert.equal(parcelStatus({ lat: -36.8, lon: 175.1, facts: [] }).state, 'none');
  const live = parcelStatus({ lat: -36.8, lon: 175.1, facts: [{ id: 'site.parcel', status: 'live', value: 1200, unit: 'm²', asOf: '2026-11-03', source: { name: 'LINZ' } }] });
  assert.equal(live.state, 'live');
  assert.match(live.says, /1.200 m²|1,200 m²/);
  assert.equal(parcelStatus({ lat: -36.8, lon: 175.1, facts: [{ id: 'site.parcel', status: 'unavailable', reason: 'timed out' }] }).state, 'down');
  assert.equal(parcelStatus({ lat: -36.8, lon: 175.1, facts: [{ id: 'site.parcel', status: 'not-wired', reason: 'No service.' }] }).state, 'off');
});

test('which model goes across: a browser copy first, else the model if it is small enough, else nothing', () => {
  const p = { id: 'p' };
  const ifc = (id, at, size = 10) => ({ id, name: `${id}.ifc`, owner_kind: 'model', kept_at: at, size, extra: { model: { kind: 'ifc', version: 1 } } });
  const copy = (id, of, at) => ({ id, name: `${id}.glb`, owner_kind: 'model', kept_at: at, size: 5, extra: { model: { kind: 'glb', version: 1 }, browser_copy_of: of } });
  assert.equal(pickModel([], p), null);
  assert.equal(pickModel([ifc('a', '2026-11-20T00:00:00Z')], p).note.id, 'a');
  assert.equal(pickModel([ifc('a', '2026-11-20T00:00:00Z'), ifc('b', '2026-11-22T00:00:00Z')], p).note.id, 'b', 'the latest');
  const both = pickModel([ifc('b', '2026-11-22T00:00:00Z'), copy('c', 'b', '2026-11-22T01:00:00Z')], p);
  assert.equal(both.note.id, 'c');
  assert.equal(both.why, 'browser copy');
  assert.equal(pickModel([ifc('a', '2026-11-20T00:00:00Z'), copy('c', 'a', '2026-11-20T01:00:00Z'), ifc('b', '2026-11-22T00:00:00Z')], p).note.id, 'b', 'a copy of an older model does not beat the latest model');
  const huge = ifc('h', '2026-11-22T00:00:00Z', 900 * 1024 * 1024);
  assert.equal(pickModel([huge], p), null, 'too big to draw, no copy');
  assert.equal(hasModel([huge], p), true);
  assert.equal(pickModel([huge, copy('hc', 'h', '2026-11-22T02:00:00Z')], p).note.id, 'hc');
  assert.equal(pickModel([{ id: 'd', name: 'set.pdf', owner_kind: 'model', kept_at: '2026-11-22T00:00:00Z', extra: {} }], p), null, 'a PDF is a drawing set, not a model');
  assert.equal(pickModel([{ ...ifc('s', '2026-11-22T00:00:00Z'), owner_kind: 'source' }], p), null, 'sources are not models');
});

test('what the 3D page is told about the site: record, sources list; the point from the Site tab when the record has none', () => {
  const files = [note({ id: 'a', name: 'set.pdf', slot: 'drawing_set' }), note({ id: 'b', name: 'path.png', slot: 'camera_sketch' }), note({ id: 'c', name: 'x.csv', slot: 'survey' })];
  const project = { site: { lat: -36.8, lon: 175.1 }, site_sources: { camera_path: { pts: [[0, 0, 1.6]], traced_by: 'tool', sketch_file_id: 'b', confirmed_by: null, confirmed_at: null } } };
  const h = siteHandoff(project, files);
  assert.deepEqual(Object.keys(h), ['point', 'camera_path', 'sources']);
  assert.deepEqual(h.point, { lat: -36.8, lng: 175.1, source: 'a point typed on the Site tab' });
  assert.equal(h.camera_path.confirmed_by, null, 'an unconfirmed path is handed across as unconfirmed');
  assert.deepEqual(h.sources, [{ kind: 'drawing_set', name: 'set.pdf', file_id: 'a' }, { kind: 'camera_sketch', name: 'path.png', file_id: 'b' }, { kind: 'survey', name: 'x.csv', file_id: 'c' }]);
  assert.deepEqual(sourceList([]), []);
});

test('the record saves on the project like any other field, in the browser store', async () => {
  const s = mem(), b = newProject({ name: 'Sample-like' });
  await s.saveProject(b);
  const pid = b.project.id;
  const path = { pts: [[0, 0, 1.6], [6, 4, 1.6]], sketch_file_id: 'f_sketch', traced_by: 'tool', confirmed_by: null, confirmed_at: null };
  await withSiteSources(s, pid, (ss) => ({ ...ss, camera_path: path }));
  let p = await s.get('project', pid);
  assert.deepEqual(p.site_sources, { point: null, camera_path: path });
  await withSiteSources(s, pid, (ss) => ({ ...ss, camera_path: confirmPath(ss.camera_path, 'Aroha', '2026-11-23T03:00:00Z') }));
  p = await s.get('project', pid);
  assert.equal(p.site_sources.camera_path.confirmed_by, 'Aroha');
  assert.equal(p.name, 'Sample-like', 'the rest of the project is untouched');
  assert.equal(await withSiteSources(s, 'nope', (x) => x), null);
});

test('shared records carry site_sources in the project’s extra column and give it back (no new column needed)', async () => {
  const ss = { point: { lat: -36.8, lng: 175.1, source: 'a point typed on the Site tab' }, camera_path: { pts: [[0, 0, 1.6]], sketch_file_id: 'f', traced_by: 'person', confirmed_by: 'Aroha', confirmed_at: '2026-11-23T03:00:00Z' } };
  const b = newProject({ name: 'Shared' });
  const rec = toRecord('project', { ...b.project, site_sources: ss }, { practice_id: '11111111-1111-4111-8111-111111111111' });
  assert.deepEqual(rec.extra.site_sources, ss);
  assert.equal('site_sources' in rec, false, 'it is not a column');
  const back = fromRecord('project', { ...rec, id: rec.id });
  assert.deepEqual(back.site_sources, ss);
  assert.equal(back.site_lat ?? back.site?.lat, back.site.lat);
});

test('the section is an add-on of the Site tab, with its own stylesheet and nothing client-specific in its files', () => {
  assert.ok(ADDONS.includes('./site-sources.js'));
  const src = readFileSync(new URL('../../architecture/js/site-sources.js', import.meta.url), 'utf8');
  assert.match(src, /registerProjectPanel\(\{ id: 'site-sources', title: 'Site and sources', tab: 'site'/);
  assert.match(src, /site-sources\.css/);
  const css = readFileSync(new URL('../../architecture/site-sources.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,6}\b/, 'no colour of its own: it follows the look');
});
