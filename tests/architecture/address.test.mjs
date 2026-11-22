// The Site tab's street-address search: its rules, what the project keeps, where it is kept, and what it does not reveal.
// (The box itself is checked in a test browser: see the report's stills.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { askAddress, keptAddress, placeLine, packPlace, splitAddress, ADDRESS_CREDIT, parseWhere } from '../../architecture/js/facts.js';
import { createSearch, addressBoxHtml, DELAY_MS } from '../../architecture/js/address.js';
import { createStore, memoryBackend } from '../../architecture/js/store.js';
import { newProject, activity } from '../../architecture/js/model.js';
import { createCloudStore, toRecord, fromRecord } from '../../architecture/js/cloud.js';
import { fakeSupabase } from './fake-supabase.mjs';

const MATCH = { id: 3072790, address: '243 Ponsonby Road, Ponsonby, Auckland', suburb: 'Ponsonby', town: 'Auckland', council: 'Auckland', unit: null, lat: -36.849847, lon: 174.744459 };
const feed = (matches, more = false) => ({ ok: true, status: 200, json: async () => ({ feeds: { address: { id: 'address', values: { matches, more } } } }) });

test('what is kept of a match, and how the place reads without the street', () => {
  assert.deepEqual(keptAddress(MATCH), { id: 3072790, address: '243 Ponsonby Road, Ponsonby, Auckland', suburb: 'Ponsonby', town: 'Auckland', council: 'Auckland' }, 'the point is kept as site.lat and site.lon, not here');
  assert.equal(placeLine(MATCH), 'Ponsonby, Auckland');
  assert.equal(placeLine({ suburb: 'Waihi', town: 'Waihi' }), 'Waihi', 'a town that repeats the suburb is said once');
  assert.equal(placeLine({}), '');
  assert.deepEqual(splitAddress('2/243 Ponsonby Road, Ponsonby, Auckland'), { street: '2/243 Ponsonby Road', rest: 'Ponsonby, Auckland' });
  assert.deepEqual(splitAddress('Somewhere'), { street: 'Somewhere', rest: '' });
});

test('privacy: the client pack says the suburb and town, and the street only when the project’s setting is on', () => {
  const site = { lat: -36.84, lon: 174.74, address: keptAddress(MATCH) };
  assert.equal(packPlace(site), 'Ponsonby, Auckland');
  assert.doesNotMatch(packPlace(site), /Ponsonby Road|243/);
  assert.equal(packPlace({ ...site, print_address: true }), '243 Ponsonby Road, Ponsonby, Auckland');
  assert.equal(packPlace({ lat: -36.8, lon: 175.08 }), '', 'a typed point has no address to print');
  assert.equal(packPlace(null), '');
});

test('privacy, in the page’s own source: the pack goes through packPlace, no share link or hand-over carries the site, and the credit travels with the address', () => {
  const app = readFileSync(new URL('../../architecture/js/app.js', import.meta.url), 'utf8');
  const pack = app.slice(app.indexOf('function packView'), app.indexOf('async function render'));
  assert.match(pack, /packPlace\(s\)/);
  assert.doesNotMatch(pack, /\.address\.address|address\.suburb|s\.address\.|\.lat|\.lon/, 'the pack never reaches into the address or the point itself');
  assert.match(pack, /ADDRESS_CREDIT/);
  const model = readFileSync(new URL('../../architecture/js/model.js', import.meta.url), 'utf8');
  const links = model.slice(model.indexOf('export function twinLink'), model.indexOf('// ---- a run report handed over')).replace(/^\s*\/\/.*$/gm, '').replace(/^\s*\*.*$/gm, '').replace(/^\s*\/\*.*$/gm, '');
  assert.doesNotMatch(links, /\bsite\b|address|\blat\b|\blon\b/, 'the link to the 3D page and its hand-over carry no site, address or point');
  assert.match(ADDRESS_CREDIT, /LINZ Data Service.*CC BY 4\.0/);
  const log = app.slice(app.indexOf("act === 'addr-use'"), app.indexOf("act === 'addr-change'"));
  assert.doesNotMatch(log, /log\([^)]*address\)|\.address\.address/, 'the activity log never holds the street address');
});

test('asking: the words go in the feed’s address and nothing else, only the first eight matches come back, and a match without a point in New Zealand is dropped', async () => {
  let asked = '';
  const nine = Array.from({ length: 9 }, (_, i) => ({ ...MATCH, id: i + 1 }));
  const got = await askAddress('14 Ponsonby Rd, Ponsonby', async (u, init) => { asked = u; assert.ok(!/lat=|lon=/.test(u)); assert.equal(init.headers.accept, 'application/json'); return feed([...nine, { ...MATCH, id: 99, lat: 51.5, lon: -0.12 }, { id: 98, address: 'No point' }], true); });
  assert.equal(asked, '/api/live/?feeds=address&q=14%20Ponsonby%20Rd%2C%20Ponsonby');
  assert.equal(got.matches.length, 8); assert.equal(got.more, true); assert.ok(got.matches.every((m) => parseWhere(`${m.lat}, ${m.lon}`)));
  assert.equal((await askAddress('abc', async () => { throw new Error('should not be asked'); })).matches.length, 0, 'under 4 characters nothing is asked');
  await assert.rejects(askAddress('x'.repeat(121), async () => feed([])), /too long/);
});

test('asking: plain words when it fails, and an aborted question stays an abort', async () => {
  await assert.rejects(askAddress('14 Ponsonby Road', async () => { throw new TypeError('Failed to fetch'); }), /could not be reached.*coordinates/);
  await assert.rejects(askAddress('14 Ponsonby Road', async () => ({ ok: false, status: 503, json: async () => ({}) })), /not answering just now \(503\).*coordinates/);
  await assert.rejects(askAddress('14 Ponsonby Road', async () => ({ ok: true, json: async () => ({ feeds: { address: { id: 'address', error: 'The LINZ address service did not answer just now.' } } }) })), /LINZ address service did not answer/);
  await assert.rejects(askAddress('14 Ponsonby Road', async () => ({ ok: true, json: async () => ({ feeds: {} }) })), /gave no answer/);
  await assert.rejects(askAddress('14 Ponsonby Road', async () => { const e = new Error('x'); e.name = 'AbortError'; throw e; }), (e) => e.name === 'AbortError');
});

// a fake clock and a fake page, for the box's rules
function rig(ask) {
  const log = { options: [], active: [], msgs: [], open: [], picked: [] }, timers = []; let now = 0;
  const view = { options: (l) => log.options.push(l.map((m) => m.id)), active: (i) => log.active.push(i), message: (t) => log.msgs.push(t), open: (o) => log.open.push(o) };
  const s = createSearch({ ask, view, onPick: (m) => log.picked.push(m.id), timers: { set: (fn, ms) => { const t = { fn, at: now + ms }; timers.push(t); return t; }, clear: (t) => { if (t) t.dead = true; } }, controller: () => ({ abort() { this.aborted = true; }, signal: { n: 1 } }) });
  const tick = async (ms) => { now += ms; for (const t of timers.filter((x) => !x.dead && x.at <= now)) { t.dead = true; t.fn(); } await new Promise((r) => setImmediate(r)); }; // a question still on its way is not waited for
  return { s, log, tick };
}
const two = [{ ...MATCH, id: 1 }, { ...MATCH, id: 2, address: '2/243 Ponsonby Road, Ponsonby, Auckland' }];

test('the box waits 300 ms for a pause, asks once, and asks nothing under 4 characters', async () => {
  assert.equal(DELAY_MS, 300);
  const asked = []; const { s, log, tick } = rig(async (q) => { asked.push(q); return { matches: two, more: false }; });
  s.typed('14'); await tick(1000); assert.deepEqual(asked, []);
  s.typed('243 P'); await tick(100); s.typed('243 Po'); await tick(200); assert.deepEqual(asked, [], 'a key press restarts the wait');
  await tick(150); assert.deepEqual(asked, ['243 Po']);
  assert.deepEqual(log.options.at(-1), [1, 2]); assert.equal(log.open.at(-1), true); assert.match(log.msgs.at(-1), /^2 matches\. Use the up and down arrows/);
});

test('an overtaken answer is ignored, and a failed question says why in plain words', async () => {
  let release; const slow = new Promise((r) => { release = r; });
  const { s, log, tick } = rig(async (q) => (q === '243 Pon' ? slow.then(() => ({ matches: [{ ...MATCH, id: 7 }], more: false })) : { matches: two, more: false }));
  s.typed('243 Pon'); await tick(300); s.typed('243 Ponsonby'); await tick(300);
  release(); await new Promise((r) => setImmediate(r));
  assert.deepEqual(log.options.at(-1), [1, 2], 'the later question wins');
  const bad = rig(async () => { throw new Error('The address search is not answering just now (503). Try again in a minute, or enter the site as coordinates instead.'); });
  bad.s.typed('243 Ponsonby'); await bad.tick(300);
  assert.match(bad.log.msgs.at(-1), /not answering just now/); assert.equal(bad.log.open.at(-1), false);
  const none = rig(async () => ({ matches: [], more: false })); none.s.typed('999 Nowhere'); await none.tick(300);
  assert.match(none.log.msgs.at(-1), /No current address matches that\. Check the spelling/);
  const more = rig(async () => ({ matches: two, more: true })); more.s.typed('243 Ponsonby'); await more.tick(300);
  assert.match(more.log.msgs.at(-1), /Add the suburb or town to narrow it/);
});

test('keyboard: down and up move through the matches and wrap, Home and End jump, Enter picks, Escape closes; Enter with nothing active is left alone', async () => {
  const { s, log, tick } = rig(async () => ({ matches: [...two, { ...MATCH, id: 3 }], more: false }));
  s.typed('243 Ponsonby'); await tick(300);
  assert.equal(s.key('Enter'), false, 'nothing active yet: Enter does what it always does');
  assert.equal(s.key('ArrowDown'), true); assert.equal(s.state.at, 0);
  s.key('ArrowDown'); s.key('ArrowDown'); s.key('ArrowDown'); assert.equal(s.state.at, 0, 'wraps round');
  s.key('ArrowUp'); assert.equal(s.state.at, 2);
  s.key('Home'); assert.equal(s.state.at, 0); s.key('End'); assert.equal(s.state.at, 2);
  assert.equal(s.key('Escape'), true); assert.equal(s.state.open, false); assert.equal(s.key('Escape'), false);
  assert.equal(s.key('ArrowDown'), true); assert.equal(s.state.open, true, 'down opens it again');
  s.key('End'); s.key('Enter'); assert.deepEqual(log.picked, [3]); assert.equal(s.state.open, false);
  s.typed('243 Ponsonby'); await tick(300); s.pick(1); assert.deepEqual(log.picked, [3, 2], 'a click picks too');
});

test('the markup is a combobox with a listbox, a label, help and a status line that is read out', () => {
  const html = addressBoxHtml();
  assert.match(html, /<label class="addr-lab" for="addr-in" id="addr-lab">Site address<\/label>/);
  assert.match(html, /role="combobox"[^>]*aria-autocomplete="list"[^>]*aria-expanded="false"[^>]*aria-controls="addr-list"/);
  assert.match(html, /<ul class="addr-list" id="addr-list" role="listbox" aria-labelledby="addr-lab" hidden>/);
  assert.match(html, /id="addr-msg" role="status" aria-live="polite"/);
  assert.match(html, /autocomplete="off"/); assert.match(html, /maxlength="120"/);
  assert.match(addressBoxHtml({ busy: true }), /disabled/);
});

// ---- where it is kept ----------------------------------------------------------------------------------------------------
const T0 = '2026-11-22T00:00:00.000Z';
test('this browser’s store keeps the address and the print setting on the project, and a typed point replaces them', async () => {
  const store = createStore(memoryBackend());
  const b = newProject({ name: 'A house', now: T0 });
  b.project.site = { lat: MATCH.lat, lon: MATCH.lon, facts: [{ id: 'site.zone', label: 'Zone', value: 'Z' }], fetched_at: T0, address: keptAddress(MATCH), print_address: true };
  await store.saveProject(b);
  const back = await store.get('project', b.project.id);
  assert.deepEqual(back.site.address, keptAddress(MATCH)); assert.equal(back.site.print_address, true); assert.equal(back.site.lat, MATCH.lat);
  const app = readFileSync(new URL('../../architecture/js/app.js', import.meta.url), 'utf8');
  assert.match(app, /p\.site = \{ lat: where\.lat, lon: where\.lon, facts: got\.facts, fetched_at: got\.fetched_at \};/, 'the coordinates path writes a site with no address');
});

test('the shared records keep the address in the project’s extra column (no new column, no migration) and give it back unchanged', async () => {
  const b = newProject({ name: 'A house', now: T0 });
  const site = { lat: MATCH.lat, lon: MATCH.lon, facts: [], fetched_at: T0, address: keptAddress(MATCH), print_address: true };
  const rec = toRecord('project', { ...b.project, site }, { practice_id: '11111111-1111-4111-8111-111111111111' });
  assert.deepEqual(rec.extra.site, { address: keptAddress(MATCH), print_address: true });
  assert.deepEqual(Object.keys(rec).filter((k) => /addr/i.test(k)), [], 'no address column');
  assert.deepEqual(fromRecord('project', JSON.parse(JSON.stringify(rec))).site, site);
  const fake = fakeSupabase(), local = createStore(memoryBackend());
  const cloud = createCloudStore({ client: fake, practice: { id: '11111111-1111-4111-8111-111111111111', name: 'A practice', role: 'member' }, local });
  await cloud.saveProject({ ...b, project: { ...b.project, site } });
  assert.deepEqual((await cloud.get('project', b.project.id)).site.address, keptAddress(MATCH));
});

test('the address is not in the address of any request to the shared records (it travels in the body only)', async () => {
  const seen = [];
  const fake = fakeSupabase(); const real = fake.from.bind(fake);
  fake.from = (t) => { seen.push(t); return real(t); };
  const cloud = createCloudStore({ client: fake, practice: { id: '11111111-1111-4111-8111-111111111111', name: 'A practice', role: 'member' }, local: createStore(memoryBackend()) });
  const b = newProject({ name: 'A house', now: T0 });
  b.project.site = { lat: MATCH.lat, lon: MATCH.lon, facts: [], fetched_at: T0, address: keptAddress(MATCH) };
  b.activity.push(activity(b.project.id, 'Kate', 'Site set from a street address', '0 facts answered', T0));
  await cloud.saveProject(b);
  assert.ok(seen.length, 'tables were asked'); assert.ok(seen.every((t) => /^[a-z_]+$/.test(t) && !/ponsonby/i.test(t)));
});
