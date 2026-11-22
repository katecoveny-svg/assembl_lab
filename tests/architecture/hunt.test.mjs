// Found work: the settings, what "Add to pipeline" makes in both stores, "Not for us" memory, the day's cache, and that nothing is
// created without a press. No browser and no network: the feed is a stub, the shared store is the fake of Supabase's client.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore, memoryBackend, memoryFiles } from '../../architecture/js/store.js';
import { createSwitch, createCloudStore, createGateway, createTeam } from '../../architecture/js/cloud.js';
import { mountAccount } from '../../architecture/js/account.js';
import { sampleProject } from '../../architecture/js/model.js';
import { AUTH_STORAGE_KEY } from '../../architecture/js/config.js';
import { fakeSupabase } from './fake-supabase.mjs';
import {
  REGIONS, SECTORS, SECTOR_KEYS, SOURCE_IDS, SOURCES as UI_SOURCES, HUNT_ENQUIRY_ACTION, emptyHunt, cleanHunt, huntIsEmpty, huntQuery, readAnswer, cleanSignal, fitWord, fitSteps, daysLeft, buyerInitials,
  sourceLine, sourceLink, addedAs, enquiryFromSignal, cleanDismissed, dismiss, restore, scopeOf, SETTING, cacheFresh,
} from '../../architecture/js/hunt-model.js';
import { createHunt, ringHtml, fitHtml } from '../../architecture/js/hunt.js';

const NOW = new Date(2026, 10, 22, 10, 0, 0); // Sun 22 Nov 2026, 10:00 (built from local parts: same answer in any time zone)
const ME = '00000000-0000-4000-8000-00000000a11c', PRACTICE = '11111111-1111-4111-8111-111111111111', OTHER = '22222222-2222-4222-8222-222222222222';
const tick = (ms = 15) => new Promise((r) => setTimeout(r, ms));

const SIG = (o = {}) => ({ id: 'gets:35471034', title: 'CON00004041-2026 Manga-o-nua Hillcrest Library Design Services', buyer: 'Hamilton City Council', region: 'Waikato', regions: ['Waikato'], closes: '2026-12-07T04:00:00.000Z', closesDay: '2026-12-07', daysLeft: 15,
  value: null, valueText: '', url: 'https://www.gets.govt.nz//HamCC/ExternalTenderDetails.htm?id=35471034', source: 'gets', sourceName: 'GETS', published: '2026-11-11', fit: 94, reasons: ['matches “library”', 'in Waikato', 'asks for design or advice', 'closes in 15 days'], ...o });
const SIG2 = SIG({ id: 'gets:35522653', title: 'Lower Helwick Street Redevelopment Concept Design', buyer: 'Queenstown-Lakes District Council', region: 'New Zealand', closesDay: '2026-12-04', url: 'https://www.gets.govt.nz//QLDC/ExternalTenderDetails.htm?id=35522653', fit: 66, reasons: ['matches “design”'] });
const ANSWER = (signals = [SIG(), SIG2], extra = {}) => ({ type: 'assembl.feeds', feeds: { hunt: { id: 'hunt', fetchedAt: new Date(2026, 10, 22, 9, 41).toISOString(), values: { signals, sources: [{ id: 'gets', name: 'GETS', ok: true }], needsLens: false, considered: 362 }, ...extra } } });
const json = (b, status = 200) => ({ ok: status < 400, status, json: async () => b });

/** a stand-in feed that records what it was asked */
function feed(answer = ANSWER()) {
  const calls = [];
  const f = async (url) => { calls.push(String(url)); if (typeof answer === 'function') return answer(url); return json(answer); };
  f.calls = calls;
  return f;
}
/** a stand-in for crm.js: it holds the enquiries and "draws" by recording */
function screen(ctx, { feedImpl = feed(), readOnly = false } = {}) {
  const log = { draws: 0, added: [] };
  const state = { enquiries: [] };
  const reload = async () => { state.enquiries = await ctx.store.list('enquiry'); };
  const h = createHunt(ctx, { enquiries: () => state.enquiries, readOnly, redraw: () => { log.draws++; }, added: async (t) => { log.added.push(t); await reload(); }, fetch: feedImpl, now: () => NOW });
  return { h, log, state, reload, feed: feedImpl };
}
const click = (h, act, id = '') => h.click({ target: { closest: () => ({ dataset: { hunt: act, id } }) } });
const SET = { keywords: ['library', 'design'], regions: ['Waikato'], sectors: ['civic'], min: null, max: null, sources: { radar: true, gets: true } };
const browserCtx = async ({ settings = SET, me = 'Mere' } = {}) => {
  const store = createStore(memoryBackend(), { files: memoryFiles() });
  if (settings) await store.save('setting', { id: SETTING.hunt, value: settings });
  return { store, me, practice: null, account: null };
};

// ---- the settings -------------------------------------------------------------------------------------------------------------------------
test('the settings keep only known regions and sectors, bounded words, and a range of dollars', () => {
  const h = cleanHunt({ keywords: ' Library, school,LIBRARY,, ' + 'x'.repeat(60), regions: ['Auckland', 'Narnia', 'Waikato'], sectors: ['education', 'spaceport'], min: '2,000,000', max: '$50000', sources: { gets: false } });
  assert.deepEqual(h.keywords, ['Library', 'school', 'x'.repeat(40)], 'duplicates ignoring case are dropped, long words are cut');
  assert.deepEqual(h.regions, ['Auckland', 'Waikato']); assert.deepEqual(h.sectors, ['education']);
  assert.equal(h.min, 50000); assert.equal(h.max, 2000000); assert.deepEqual(h.sources, { radar: true, gets: false });
  assert.throws(() => cleanHunt({ min: 'lots' }), /dollars/);
  assert.equal(cleanHunt({ keywords: Array.from({ length: 40 }, (_, i) => `w${i}`) }).keywords.length, 20);
  assert.deepEqual(cleanHunt(null), emptyHunt());
});

test('the empty settings find nothing: no words and no sector means nothing is looked up', () => {
  assert.ok(huntIsEmpty(emptyHunt())); assert.ok(huntIsEmpty(null));
  assert.ok(huntIsEmpty(cleanHunt({ regions: ['Auckland'], min: 1000 })), 'regions and a range alone are not something to look for');
  assert.ok(!huntIsEmpty(cleanHunt({ keywords: ['library'] }))); assert.ok(!huntIsEmpty(cleanHunt({ sectors: ['health'] })));
  assert.deepEqual(emptyHunt().sources, { radar: true, gets: true });
});

test('the feed question is built from the settings and is the same for the same settings', () => {
  assert.equal(huntQuery(cleanHunt(SET)), 'feeds=hunt&keywords=library%2Cdesign&regions=Waikato&sectors=civic');
  assert.equal(huntQuery(cleanHunt(SET)), huntQuery(cleanHunt({ ...SET })));
  assert.equal(huntQuery(cleanHunt({ keywords: ['a'], min: 50000, max: 2000000 })), 'feeds=hunt&keywords=a&min=50000&max=2000000');
});

test('the page\'s lists are the feed\'s lists', async () => {
  const feedSide = await import('../../api/_feeds/hunt.js');
  assert.deepEqual(REGIONS, feedSide.REGIONS);
  assert.deepEqual(SECTOR_KEYS, Object.keys(feedSide.SECTORS));
  assert.deepEqual(SECTORS.map(([, l]) => l), Object.values(feedSide.SECTORS).map((s) => s.label));
  assert.deepEqual(SOURCE_IDS.filter((id) => id !== 'radar'), Object.keys(feedSide.SOURCES), 'every source the page can switch on is one the feed has, bar the radar, which is read from the shared records');
  assert.ok(UI_SOURCES.every((s) => /^https:\/\//.test(s.url)));
});

// ---- the feed's answer --------------------------------------------------------------------------------------------------------------------
test('the answer is read into plain cards; a link that is not https is dropped; the feed\'s own plain error is passed on', () => {
  const a = readAnswer(ANSWER([SIG(), SIG({ id: 'gets:2', url: 'javascript:alert(1)' }), { id: '', title: 'no id' }, SIG({ id: 'gets:3', fit: 250, reasons: ['<b>x</b>'] })]));
  assert.deepEqual(a.signals.map((s) => s.id), ['gets:35471034', 'gets:3']); assert.equal(a.signals[1].fit, 100);
  assert.equal(a.considered, 362); assert.equal(a.needsLens, false);
  assert.throws(() => readAnswer({ feeds: { hunt: { error: 'GETS did not answer just now. Nothing could be looked at. Try again in a few minutes.' } } }), /GETS did not answer just now/);
  assert.throws(() => readAnswer({ feeds: {} }), /did not answer/);
  assert.equal(cleanSignal({ id: 'x', title: 't', url: 'http://insecure.example' }), null);
});

test('a fit reads as a word and as five notches, and a closing day as days left', () => {
  assert.deepEqual([94, 66, 47].map(fitWord), ['Strong fit', 'Good fit', 'Possible fit']);
  assert.deepEqual([94, 66, 47, 5, 100].map(fitSteps), [5, 3, 2, 1, 5]);
  assert.equal(daysLeft(SIG(), NOW), 15); assert.equal(daysLeft(SIG({ closesDay: '' }), NOW), null); assert.equal(daysLeft(SIG({ closesDay: '2026-11-22' }), NOW), 0);
  assert.equal(buyerInitials('Hamilton City Council'), 'HC'); assert.equal(buyerInitials('Auckland'), 'AU');
  assert.equal(buyerInitials('Ministry of Education - School Infrastructure'), 'ME');
  assert.equal(buyerInitials(''), '–');
});

test('the countdown ring and fit meter say it in words as well as a picture', () => {
  assert.match(ringHtml(15), /Closes in 15 days/); assert.match(ringHtml(15), /stroke-dasharray="53\.\d+ 106\.\d+"/, 'half full at 15 of 30 days');
  assert.match(ringHtml(2), /is-soon/); assert.match(ringHtml(8), /is-near/); assert.match(ringHtml(0), /Closes today/); assert.match(ringHtml(1), /Closes tomorrow/);
  assert.match(ringHtml(null), /No closing date stated/); assert.match(ringHtml(null), /dashed/);
  assert.match(ringHtml(90), /stroke-dasharray="106\.\d+ 106\.\d+"/, 'full at 30 days or more');
  assert.match(fitHtml(94), /Strong fit, 94 out of 100/); assert.equal((fitHtml(66).match(/<i class="on">/g) ?? []).length, 3);
});

// ---- what "Add to pipeline" makes -----------------------------------------------------------------------------------------------------------
test('an added finding is an enquiry in New with the notice, the buyer, the closing date as the next step date, and no owner', () => {
  const { enquiry: e, activity: a } = enquiryFromSignal(SIG({ value: 2500000 }), { now: NOW, who: 'Mere' });
  assert.equal(e.stage, 'new'); assert.equal(e.title, SIG().title); assert.equal(e.owner, '', 'a person picks who'); assert.equal(e.value_nzd, null, 'a value is only what a person types');
  assert.equal(e.next_action, 'Read the tender documents'); assert.equal(HUNT_ENQUIRY_ACTION, e.next_action); assert.equal(e.next_action_due, '2026-12-07'); assert.equal(e.contact_id, '', 'a buyer is not a person');
  assert.equal(e.source, 'GETS tender 35471034 · Hamilton City Council · https://www.gets.govt.nz//HamCC/ExternalTenderDetails.htm?id=35471034');
  assert.equal(sourceLink(e.source), SIG().url); assert.equal(sourceLine(SIG()), e.source);
  assert.equal(e.archived, false); assert.equal(e.project_id, '');
  assert.equal(a.kind, 'note'); assert.equal(a.enquiry_id, e.id); assert.equal(a.who, 'Mere');
  assert.match(a.body, /Found by the hunt in GETS/); assert.match(a.body, /buyer Hamilton City Council/); assert.match(a.body, /closing 7 Dec/); assert.match(a.body, /matches “library”/);
  assert.match(a.body, /states a value of \$2,500,000\. That is not the enquiry's value/); assert.match(a.body, /Nothing has been sent, registered or submitted/);
  assert.equal(enquiryFromSignal(SIG({ closesDay: '', closes: null }), { now: NOW }).enquiry.next_action_due, '', 'no closing date stated, none made up');
  assert.throws(() => enquiryFromSignal({ id: 'x', title: 't', url: 'http://x' }, { now: NOW }), /no link/);
});

test('a finding already in the pipeline is found by its notice link, archived or not', () => {
  const e = enquiryFromSignal(SIG(), { now: NOW }).enquiry;
  assert.equal(addedAs(SIG(), [e])?.id, e.id); assert.equal(addedAs(SIG(), [{ ...e, archived: true }])?.id, e.id);
  assert.equal(addedAs(SIG2, [e]), null); assert.equal(addedAs(SIG({ title: 'Hill house' }), [{ ...e, title: 'Hill house', source: 'Referral' }]), null, 'matched on the link, not the title');
});

// ---- "Not for us" ---------------------------------------------------------------------------------------------------------------------------------
test('"Not for us" is kept per practice and let go of long after the notice closed', () => {
  let k = dismiss({}, SIG(), NOW); assert.deepEqual(k, { 'gets:35471034': '2026-12-07' });
  k = dismiss(k, SIG({ id: 'gets:9', closesDay: '' }), NOW); assert.equal(k['gets:9'], '2026-11-22', 'no closing day: the day it was hidden');
  assert.deepEqual(restore(k, 'gets:9', NOW), { 'gets:35471034': '2026-12-07' });
  assert.deepEqual(cleanDismissed({ 'gets:1': '2026-01-01', 'gets:2': '2026-12-01', bad: '2026-12-01', 'gets:3': 'soon', 'gets:4': { a: 1 } }, NOW), { 'gets:2': '2026-12-01' });
  assert.deepEqual(cleanDismissed(null, NOW), {}); assert.deepEqual(cleanDismissed([1], NOW), {});
  assert.equal(scopeOf(null), 'browser'); assert.equal(scopeOf({ id: PRACTICE }), `p-${PRACTICE}`);
  assert.notEqual(SETTING.dismissed(scopeOf({ id: PRACTICE })), SETTING.dismissed(scopeOf({ id: OTHER })));
});

test('the day\'s answer is used only for the same day and the same settings', () => {
  const q = huntQuery(cleanHunt(SET)), c = { query: q, day: '2026-11-22', answer: {} };
  assert.ok(cacheFresh(c, q, NOW)); assert.ok(!cacheFresh({ ...c, day: '2026-11-21' }, q, NOW)); assert.ok(!cacheFresh(c, q + '&x=1', NOW)); assert.ok(!cacheFresh(null, q, NOW)); assert.ok(!cacheFresh({ ...c, answer: null }, q, NOW));
});

// ---- the strip, in a browser (records in this browser) --------------------------------------------------------------------------------------
test('with nothing set it looks at nothing, makes nothing, and says "Set what to look for"', async () => {
  const ctx = await browserCtx({ settings: null }), s = screen(ctx);
  await s.h.start();
  assert.equal(s.feed.calls.length, 0, 'no source is asked until the practice has set something');
  assert.deepEqual(await ctx.store.list('enquiry'), []);
  const html = s.h.html();
  assert.match(html, /Set what to look for/); assert.match(html, /data-hunt="open-settings"/); assert.doesNotMatch(html, /Add to pipeline/);
  assert.match(html, /Nothing is looked up until then/);
});

test('it looks once when the screen opens, shows cards, and creates nothing until a person presses', async () => {
  const ctx = await browserCtx(), s = screen(ctx);
  await s.h.start();
  assert.equal(s.feed.calls.length, 1); assert.equal(s.feed.calls[0], '/api/live/?feeds=hunt&keywords=library%2Cdesign&regions=Waikato&sectors=civic');
  assert.deepEqual(await ctx.store.list('enquiry'), [], 'opening the screen creates nothing');
  assert.deepEqual(await ctx.store.list('crm_activity'), []);
  const html = s.h.html();
  assert.match(html, /Hillcrest Library Design Services/); assert.match(html, /Hamilton City Council/); assert.match(html, /Waikato/); assert.match(html, /Closes in 15 days/); assert.match(html, /Strong fit/);
  assert.match(html, /Looked at 9:41 am today/); assert.match(html, /Add to pipeline/); assert.match(html, /Not for us/); assert.match(html, /Why this/);
  assert.match(html, /target="_blank" rel="noopener noreferrer"/, 'the notice opens in another tab');
  assert.match(html, /Nothing is contacted or sent/); assert.match(html, /MBIE \(Crown copyright/);
  assert.equal((html.match(/data-hunt="add"/g) ?? []).length, 2);
});

test('Add to pipeline makes one enquiry and one history line in the browser store, and shows the card as added', async () => {
  const ctx = await browserCtx(), s = screen(ctx);
  await s.h.start();
  await click(s.h, 'add', 'gets:35471034');
  const es = await ctx.store.list('enquiry'), as = await ctx.store.list('crm_activity');
  assert.equal(es.length, 1); assert.equal(es[0].stage, 'new'); assert.equal(es[0].next_action, 'Read the tender documents'); assert.equal(es[0].next_action_due, '2026-12-07'); assert.equal(es[0].owner, ''); assert.equal(es[0].value_nzd, null);
  assert.equal(as.length, 1); assert.equal(as[0].enquiry_id, es[0].id); assert.match(as[0].body, /Found by the hunt/); assert.equal(as[0].who, 'Mere');
  assert.equal(s.log.added.length, 1); assert.match(s.log.added[0], /Added “CON00004041-2026 Manga-o-nua Hillcrest Library Design Services” to the pipeline/);
  const html = s.h.html();
  assert.match(html, /Added to the pipeline/); assert.match(html, new RegExp(`href="#/crm/e/${encodeURIComponent(es[0].id)}"`));
  assert.equal((html.match(/data-hunt="add"/g) ?? []).length, 1, 'only the other card can still be added');
  await click(s.h, 'add', 'gets:35471034'); // pressed again (a double press)
  assert.equal((await ctx.store.list('enquiry')).length, 1, 'never made twice');
});

test('Add to pipeline makes the same enquiry in the shared records, in the practice\'s own rows', async () => {
  const fake = fakeSupabase({ userId: ME }), local = createStore(memoryBackend(), { files: memoryFiles() });
  const store = createCloudStore({ client: fake, practice: { id: PRACTICE, name: 'Tui Architects', role: 'member' }, local });
  const team = createTeam(createGateway(fake));
  fake.db.practice = [{ id: PRACTICE, name: 'Tui Architects', created_by: ME, extra: { hunt: SET } }];
  const ctx = { store, me: 'Mere', practice: { id: PRACTICE, name: 'Tui Architects', role: 'member' }, account: { hunt: () => team.hunt(PRACTICE) } };
  const s = screen(ctx);
  await s.h.start();
  assert.equal(s.feed.calls.length, 1, 'the practice\'s settings were read from practice.extra.hunt');
  assert.equal(fake.db.enquiry?.length ?? 0, 0, 'nothing is made by opening the screen');
  await click(s.h, 'add', 'gets:35522653');
  assert.equal(fake.db.enquiry.length, 1); const r = fake.db.enquiry[0];
  assert.equal(r.practice_id, PRACTICE); assert.equal(r.stage, 'new'); assert.equal(r.title, SIG2.title); assert.equal(r.next_action, 'Read the tender documents'); assert.equal(r.next_action_due, '2026-12-04'); assert.ok(!r.owner, 'owner unset'); assert.equal(r.value_nzd, null); assert.ok(!r.contact_id, 'no person');
  assert.match(r.source, /^GETS tender 35522653 · Queenstown-Lakes District Council · https:\/\/www\.gets\.govt\.nz/);
  assert.equal(fake.db.crm_activity.length, 1); assert.match(fake.db.crm_activity[0].body, /Found by the hunt/);
  assert.equal(fake.db.contact?.length ?? 0, 0, 'no person is invented for a buyer');
  assert.match(s.h.html(), /Added to the pipeline/);
});

test('"Not for us" hides the card, is remembered for this practice, and does not come back; it can be brought back', async () => {
  const ctx = await browserCtx(), s = screen(ctx);
  await s.h.start();
  await click(s.h, 'no', 'gets:35522653');
  assert.doesNotMatch(s.h.html(), /Lower Helwick/); assert.match(s.h.html(), /1 hidden as not for us/);
  assert.deepEqual(await ctx.store.list('enquiry'), [], 'hiding creates nothing');
  // a later visit the same day, and the next day
  const again = screen(ctx); await again.h.start();
  assert.doesNotMatch(again.h.html(), /Lower Helwick/, 'it does not come back');
  assert.equal(again.feed.calls.length, 0, 'and the day\'s answer was kept, so nothing was asked again');
  // another practice in this browser has its own memory
  const other = { ...ctx, practice: { id: OTHER, name: 'Kahu', role: 'owner' }, account: { hunt: async () => SET } }, o = screen(other); await o.h.start();
  assert.match(o.h.html(), /Lower Helwick/);
  // bring it back
  await click(s.h, 'toggle-hidden'); assert.match(s.h.html(), /Bring back/);
  await click(s.h, 'back', 'gets:35522653'); assert.match(s.h.html(), /Lower Helwick/);
  assert.deepEqual(cleanDismissed((await ctx.store.get('setting', SETTING.dismissed('browser'))).value, NOW), {});
});

test('the answer is kept for the day: a second visit does not ask again, "Look again" does, and a change of settings does', async () => {
  const ctx = await browserCtx(), a = screen(ctx);
  await a.h.start(); assert.equal(a.feed.calls.length, 1);
  const b = screen(ctx); await b.h.start(); assert.equal(b.feed.calls.length, 0, 'same day, same settings: the kept answer');
  assert.match(b.h.html(), /Looked at 9:41 am today/);
  await click(b.h, 'look'); assert.equal(b.feed.calls.length, 1, 'the person asked to look again');
  await ctx.store.save('setting', { id: SETTING.hunt, value: cleanHunt({ ...SET, keywords: ['hall'] }) });
  const c = screen(ctx); await c.h.start(); assert.equal(c.feed.calls.length, 1, 'other settings, other question');
  assert.match(c.feed.calls[0], /keywords=hall/);
});

test('when the notices cannot be read it says so in plain words, shows yesterday\'s findings when it has them, and makes nothing', async () => {
  const ctx = await browserCtx();
  const old = screen(ctx); await old.h.start();
  const cache = (await ctx.store.get('setting', SETTING.cache('browser'))).value;
  await ctx.store.save('setting', { id: SETTING.cache('browser'), value: { ...cache, day: '2026-11-21' } }); // that answer is from yesterday
  const down = screen(ctx, { feedImpl: feed(() => json({}, 503)) });
  await down.h.start();
  const html = down.h.html();
  assert.match(html, /not answering just now \(503\)/); assert.match(html, /Try again/); assert.match(html, /Showing what was found on Sat 21 Nov/); assert.match(html, /may be out of date/);
  assert.match(html, /Hillcrest Library/); assert.deepEqual(await ctx.store.list('enquiry'), []);
  const offline = screen(await browserCtx(), { feedImpl: async () => { throw new TypeError('Failed to fetch'); } });
  await offline.h.start(); assert.match(offline.h.html(), /could not be reached\. Check the connection/); assert.doesNotMatch(offline.h.html(), /TypeError|Failed to fetch/);
  const feedError = screen(await browserCtx(), { feedImpl: feed({ feeds: { hunt: { id: 'hunt', error: 'GETS did not answer just now. Nothing could be looked at. Try again in a few minutes.' } } }) });
  await feedError.h.start(); assert.match(feedError.h.html(), /GETS did not answer just now/); assert.doesNotMatch(feedError.h.html(), /data-hunt="add"/);
});

test('one source down is said plainly above the findings from the others', async () => {
  const a = ANSWER([SIG()]); a.feeds.hunt.values.sources = [{ id: 'gets', name: 'GETS', ok: true }, { id: 'other', name: 'Other', ok: false, error: 'Other did not answer just now. Its findings are left out for now; try again in a few minutes.' }];
  const s = screen(await browserCtx(), { feedImpl: feed(a) }); await s.h.start();
  assert.match(s.h.html(), /Other did not answer just now/); assert.match(s.h.html(), /Hillcrest/);
});

test('nothing found says so and when it will look again', async () => {
  const s = screen(await browserCtx(), { feedImpl: feed(ANSWER([])) }); await s.h.start();
  assert.match(s.h.html(), /Nothing fits right now\. 362 open tenders looked at/);
});

test('a viewer sees the findings and has no buttons to add or hide', async () => {
  const ctx = { ...(await browserCtx()), practice: { id: PRACTICE, name: 'Tui', role: 'viewer' }, account: { hunt: async () => SET } };
  const s = screen(ctx, { readOnly: true }); await s.h.start();
  assert.match(s.h.html(), /Hillcrest/); assert.doesNotMatch(s.h.html(), /Add to pipeline|Not for us/);
  assert.equal(await s.h.add('gets:35471034'), null); assert.deepEqual(await ctx.store.list('enquiry'), []);
});

test('the page makes no request to anything but the lab\'s own feed', async () => {
  const s = screen(await browserCtx()); await s.h.start();
  assert.ok(s.feed.calls.every((u) => u.startsWith('/api/live/?feeds=hunt')));
});

// ---- saving the settings ------------------------------------------------------------------------------------------------------------------
const form = (o) => {
  const entries = Object.entries(o).flatMap(([k, v]) => (Array.isArray(v) ? v.map((x) => [k, x]) : [[k, v]]));
  globalThis.FormData = class { constructor() {} get(k) { return entries.find(([a]) => a === k)?.[1] ?? null; } getAll(k) { return entries.filter(([a]) => a === k).map(([, v]) => v); } };
  return { target: { closest: () => ({}) }, preventDefault() {} };
};

test('in a browser, saving "what to look for" keeps it as a setting here and looks again', async () => {
  const ctx = await browserCtx({ settings: null }), s = screen(ctx); await s.h.start();
  assert.equal(s.feed.calls.length, 0);
  await s.h.submit(form({ keywords: 'school, library', sectors: ['education'], regions: ['Auckland', 'Waikato'], min: '50000', max: '2,000,000', sources: ['radar', 'gets'] }));
  assert.deepEqual((await ctx.store.get('setting', SETTING.hunt)).value, { keywords: ['school', 'library'], regions: ['Auckland', 'Waikato'], sectors: ['education'], min: 50000, max: 2000000, sources: { radar: true, gets: true } });
  assert.equal(s.feed.calls.length, 1); assert.match(s.feed.calls[0], /keywords=school%2Clibrary&regions=Auckland%2CWaikato&sectors=education&min=50000&max=2000000/);
  assert.deepEqual(await ctx.store.list('enquiry'), []);
  await s.h.submit(form({ keywords: '', sectors: [], regions: ['Auckland'], min: 'lots', max: '', sources: ['radar', 'gets'] }));
  assert.match(s.h.html(), /Type the value as dollars/); assert.equal(s.feed.calls.length, 1, 'a refused change looks at nothing');
  await s.h.submit(form({ keywords: '', sectors: [], regions: [], min: '', max: '', sources: ['radar', 'gets'] }));
  assert.match(s.h.html(), /Set what to look for/);
});

test('the practice\'s settings: anyone in it reads them, an owner changes them, the rest of extra is kept', async () => {
  const fake = fakeSupabase({ userId: ME }), team = createTeam(createGateway(fake));
  fake.db.practice = [{ id: PRACTICE, name: 'Tui', created_by: ME, extra: { theme: 'sketch' } }, { id: OTHER, name: 'Kahu', created_by: ME }];
  assert.equal(await team.hunt(PRACTICE), null); assert.equal(await team.hunt(OTHER), null, 'a practice with no extra at all');
  assert.deepEqual(await team.setHunt(PRACTICE, cleanHunt(SET)), cleanHunt(SET));
  assert.deepEqual(fake.db.practice[0].extra, { theme: 'sketch', hunt: cleanHunt(SET) }, 'only the hunt is added');
  assert.deepEqual(await team.hunt(PRACTICE), cleanHunt(SET));
  fake.viewer = true;
  await assert.rejects(team.setHunt(PRACTICE, emptyHunt()), (e) => e.code === 'refused' && /only an owner/.test(e.message) && /Nothing was changed/.test(e.message));
  assert.deepEqual(fake.db.practice[0].extra.hunt, cleanHunt(SET));
  await assert.rejects(team.setHunt(PRACTICE, 'x'), /Say what to look for/);
});

async function signedIn({ role = 'owner', hunt, radar } = {}) {
  const fake = fakeSupabase({ userId: ME, rpc: { my_invitations: () => [], practice_people: () => [], ...(radar ? { hunt_signals: radar } : {}) } });
  fake.db.practice = [{ id: PRACTICE, name: 'Tui Architects', created_by: ME, extra: hunt ? { hunt } : {} }];
  fake.db.practice_member = [{ practice_id: PRACTICE, user_id: ME, role }];
  const session = { access_token: 'x.y.z', user: { id: ME, email: 'mere@example.org', user_metadata: { full_name: 'Mere Ngata' } } };
  fake.auth = { getSession: async () => ({ data: { session }, error: null }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), refreshSession: async () => ({ data: { session: null }, error: { message: 'x' } }), signOut: async () => ({ error: null }) };
  const mem = new Map([[AUTH_STORAGE_KEY, 'kept'], ['assembl.architecture.practice', PRACTICE]]);
  const win = { location: { href: 'https://lab.assembl.co.nz/architecture/', hash: '' }, history: { state: null, replaceState() {} }, localStorage: { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, String(v)), removeItem: (k) => void mem.delete(k) }, addEventListener() {}, removeEventListener() {}, open() {} };
  const el = () => ({ innerHTML: '', hidden: false, listeners: {}, addEventListener(t, fn) { this.listeners[t] = fn; } });
  const local = createStore(memoryBackend(), { files: memoryFiles() }), store = createSwitch(local);
  await local.saveProject(sampleProject());
  const account = mountAccount({ store, local, slot: el(), panel: el(), nameLabel: el(), win, loadClient: async () => ({ createClient: () => fake }) });
  await account.ready;
  for (let i = 0; i < 40 && account.state.phase !== 'in'; i++) await tick(5);
  await tick();
  return { account, fake, store };
}

test('signed in as an owner: the practice\'s settings are read from the shared records and saved there', async () => {
  const p = await signedIn({ hunt: cleanHunt(SET) });
  assert.deepEqual(await p.account.hunt(), cleanHunt(SET));
  const ctx = { store: p.store, me: 'Mere', practice: p.account.state.practice, account: p.account };
  const s = screen(ctx); await s.h.start();
  assert.equal(s.feed.calls.length, 1);
  assert.match(s.h.html(), /Add to pipeline/); assert.match(s.h.html(), /data-hunt="open-settings"/);
  await click(s.h, 'open-settings'); assert.match(s.h.html(), /Saved for everyone in Tui Architects/); assert.match(s.h.html(), /type="submit"/);
  await s.h.submit(form({ keywords: 'marae', sectors: [], regions: ['Auckland'], min: '', max: '', sources: ['radar', 'gets'] }));
  assert.deepEqual(p.fake.db.practice[0].extra.hunt, { keywords: ['marae'], regions: ['Auckland'], sectors: [], min: null, max: null, sources: { radar: true, gets: true } });
  assert.deepEqual(await p.store.list('enquiry'), [], 'saving what to look for adds nothing to the pipeline');
});

test('signed in as a member: the settings are shown and cannot be changed, and nothing is sent', async () => {
  const p = await signedIn({ role: 'member', hunt: cleanHunt(SET) });
  const before = p.fake.writes().length;
  await assert.rejects(p.account.setHunt(emptyHunt()), /Only an owner of Tui Architects/);
  assert.equal(p.fake.writes().length, before);
  const s = screen({ store: p.store, me: 'Mere', practice: p.account.state.practice, account: p.account }); await s.h.start();
  await click(s.h, 'open-settings');
  const html = s.h.html();
  assert.match(html, /Set by an owner of Tui Architects/); assert.match(html, /Only an owner can change this/); assert.doesNotMatch(html, /type="submit"/); assert.match(html, /disabled/);
  await s.h.submit(form({ keywords: 'x', sectors: [], regions: [], min: '', max: '', sources: ['radar', 'gets'] }));
  assert.equal(p.fake.writes().length, before, 'a member\'s submit is ignored');
});

test('with no owner to set it, a member of a practice with no settings sees that an owner sets them', async () => {
  const p = await signedIn({ role: 'member' });
  const s = screen({ store: p.store, me: 'Mere', practice: p.account.state.practice, account: p.account }); await s.h.start();
  assert.equal(s.feed.calls.length, 0); assert.match(s.h.html(), /An owner of the practice sets this/); assert.doesNotMatch(s.h.html(), /data-hunt="open-settings"[^>]*>\s*<svg[^>]*>[\s\S]{0,300}Set what to look for/);
});

// ---- the files ----------------------------------------------------------------------------------------------------------------------------
test('the page code has no way to contact anyone: no mail, no form post, no submit to GETS', () => {
  const src = readFileSync(new URL('../../architecture/js/hunt.js', import.meta.url), 'utf8') + readFileSync(new URL('../../architecture/js/hunt-model.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /mailto:|method:\s*['"]POST|sendBeacon|XMLHttpRequest|WebSocket/);
  assert.equal((src.match(/fetchImpl\(/g) ?? []).length, 1, 'one request in all, to the lab\'s own feed');
  const css = readFileSync(new URL('../../architecture/hunt.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css.replace(/var\([^)]*\)/g, ''), /#[0-9a-fA-F]{3,8}\b|rgba?\(/, 'colours only as fallbacks inside var()');
});

// ---- the radar's notices, read through arch.hunt_signals and scored here ----------------------------------------------------------------
const kbRow = (o = {}) => ({ id: 'kb-1', source: 'GETS — Government tenders', category: 'tenders', title: 'Library Design Services', url: 'https://www.gets.govt.nz//EN/ExternalTenderDetails.htm?id=99000001',
  published_at: '2026-11-20T01:00:00Z', inserted_at: '2026-11-20T01:00:00Z', snippet: 'Concept to developed design for a new library.', buyer: 'Hamilton City Council', closes_text: 'Monday, 7 December 2026 5:00 PM +13:00', region: 'Waikato', categories: '95121700 - Public buildings', ...o });

test('the radar\'s notices are scored in the browser against the practice\'s words and shown as cards', async () => {
  let asked = null;
  const p = await signedIn({ hunt: cleanHunt({ ...SET, sources: { radar: true, gets: false } }), radar: (a) => { asked = a; return [kbRow(), kbRow({ id: 'kb-2', title: 'Supply of road salt', url: 'https://www.gets.govt.nz//EN/ExternalTenderDetails.htm?id=99000002', region: 'Otago', categories: '' })]; } });
  const ctx = { store: p.store, me: 'Mere', practice: p.account.state.practice, account: p.account };
  const s = screen(ctx); await s.h.start();
  assert.equal(s.feed.calls.length, 0, 'the live feed is not asked when only the radar is on');
  assert.equal(asked.p_practice, PRACTICE);
  const out = s.h.html();
  assert.match(out, /Library Design Services/); assert.match(out, /Hamilton City Council/); assert.doesNotMatch(out, /road salt/, 'the one that is not a fit is left out');
  await click(s.h, 'add', 'gets:99000001');
  const [enq] = await ctx.store.list('enquiry');
  assert.equal(enq.title, 'Library Design Services'); assert.equal(enq.stage, 'new'); assert.equal(enq.next_action, 'Read the tender documents'); assert.equal(enq.next_action_due, '2026-12-07'); assert.ok(!enq.owner);
});

test('a notice found by both the radar and the live feed shows once; the radar failing leaves the feed\'s findings in, and says so', async () => {
  const both = await signedIn({ hunt: cleanHunt(SET), radar: () => [kbRow({ title: 'Library Design Services', url: 'https://www.gets.govt.nz//EN/ExternalTenderDetails.htm?id=35471034' })] });
  const ctx = { store: both.store, me: 'Mere', practice: both.account.state.practice, account: both.account };
  const s = screen(ctx); await s.h.start();
  const ids = (s.h.state.answer?.signals ?? []).map((x) => x.id);
  assert.equal(new Set(ids).size, ids.length, 'no notice twice');
  const down = await signedIn({ hunt: cleanHunt(SET), radar: () => { throw new Error('boom'); } });
  const s2 = screen({ store: down.store, me: 'Mere', practice: down.account.state.practice, account: down.account }); await s2.h.start();
  assert.equal(s2.feed.calls.length, 1); assert.match(s2.h.html(), /radar.s notices could not be read/i); assert.match(s2.h.html(), /Add to pipeline/);
});
