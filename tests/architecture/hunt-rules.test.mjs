// Found work, "Rule changes coming": the lane's cards, the topic filter, "Not for us", "Note it on a project", signed out versus signed in, and that
// there is no "Add to pipeline" for a rule. Stand-ins only: no browser and no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createStore, memoryBackend, memoryFiles } from '../../architecture/js/store.js';
import { newProject, activity } from '../../architecture/js/model.js';
import { createHunt } from '../../architecture/js/hunt.js';
import { createRulesLane, RULES_SETTING } from '../../architecture/js/hunt-rules.js';
import { parseWorks, rankRules, NOT_LEGAL_ADVICE } from '../../architecture/js/rules-rank.js';
import { SETTING, cleanDismissed } from '../../architecture/js/hunt-model.js';
import { AUTH_STORAGE_KEY } from '../../architecture/js/config.js';

const NOW = new Date(2026, 10, 22, 10, 0, 0);
const WORKS = JSON.parse(fs.readFileSync(new URL('../live/fixtures/rules-works.json', import.meta.url), 'utf8'));
const RULES = rankRules(parseWorks(WORKS), { now: NOW }).rules;
const json = (b, status = 200) => ({ ok: status < 400, status, json: async () => b });
const FEED = (rules = RULES, sources = [{ id: 'legislation', name: 'NZ Legislation', ok: true }]) => ({ feeds: { rules: { fetchedAt: NOW.toISOString(), values: { rules, sources } } } });
const BILL_ROWS = [
  { title: 'Building (Energy Efficient Office Buildings) Amendment Bill', url: 'https://bills.parliament.nz/v/6/6ad74b9d-5a90-435a-4146-08dee85e8f6d', published_at: '2026-07-23 00:00:00+00', current_stage: 'First Reading', bill_status: 'Active', source: 'NZ Parliament — Bills API', snippet: '{ "title": "SECRET SNIPPET' },
  { title: 'Gambling Amendment Bill', url: 'https://bills.parliament.nz/v/6/6ad74b9d-5a90-435a-4146-08dee85e8f60', published_at: '2026-07-23 00:00:00+00', current_stage: 'First Reading' },
];
// the building consents panel (hunt-consents.js) asks the same address for feeds=consents: answered with nothing to show, and not counted here
const stubFetch = (answer = FEED()) => { const calls = []; const f = async (u) => { if (String(u).includes('feeds=consents')) return json({ feeds: { consents: { values: { regions: [], national: null } } } }); calls.push(String(u)); return typeof answer === 'function' ? answer(u) : json(answer); }; f.calls = calls; return f; };
const mk = async ({ signedIn = false, answer, rows = BILL_ROWS, readOnly = false, regions = [] } = {}) => {
  const store = createStore(memoryBackend(), { files: memoryFiles() });
  await store.save('setting', { id: SETTING.hunt, value: { keywords: ['library'], regions, sectors: [], min: null, max: null, sources: { radar: false, gets: false }, cultural: false } });
  const ctx = { store, me: 'Mere', practice: signedIn ? { id: '11111111-1111-4111-8111-111111111111', name: 'Kahu', role: 'owner' } : null, account: signedIn ? { huntRules: async () => rows, hunt: async () => ({ keywords: ['library'], regions, sectors: [], sources: { radar: false, gets: false } }) } : null };
  const fetch = stubFetch(answer);
  const log = { draws: 0 }, h = createHunt(ctx, { readOnly, redraw: () => { log.draws++; }, fetch, now: () => NOW });
  await h.start(); await new Promise((r) => setTimeout(r, 20));
  return { ctx, h, fetch, log, store };
};
const click = (h, act, extra = {}, sel = null) => h.click({ target: { closest: (q) => (q === '[data-rules]' ? { dataset: { rules: act, ...extra }, closest: () => (sel ? { querySelector: () => sel } : null) } : null) } });

test('the lane sits in Found work under "Leads and early signals", with a card per rule: title, stage, status, date, agencies, what it may change, links, badge', async () => {
  const { h } = await mk(), html = h.html();
  assert.ok(html.includes('Rule changes coming')); assert.ok(html.indexOf('Rule changes coming') > html.indexOf('Leads and early signals'), 'below the leads');
  assert.equal((html.match(/class="hunt-card is-rule"/g) ?? []).length, RULES.length);
  const card = html.split('<li class="hunt-card is-rule"').find((c) => c.includes('Earthquake-prone'));
  assert.match(card, /hunt-rule-badge is-in-force">In force</); assert.match(card, /hunt-rule-stage">act</); assert.match(card, /Version of 18 Nov/); assert.match(card, /Administered by[^]*Ministry of Business, Innovation, and Employment/);
  assert.match(card, /What it may change[^]*May change which buildings need seismic strengthening/); assert.match(card, /href="https:\/\/www\.legislation\.govt\.nz\/act\/public\/2026\/0012\/latest\/whole\.html"/); assert.match(card, /whole\.pdf/);
  assert.match(card, /This is not legal advice\. Read the legislation and talk to the council or an adviser\./);
  assert.match(html.split('<li class="hunt-card is-rule"').find((c) => c.includes('Heritage New Zealand')), /hunt-rule-badge is-bill">Bill</);
  assert.ok(html.includes(NOT_LEGAL_ADVICE)); assert.match(html, /legislation\.govt\.nz<\/a>, Parliamentary Counsel Office/);
});
test('a rule offers "Note it on a project" and "Not for us", never "Add to pipeline"', async () => {
  const { h } = await mk(), laneHtml = h.html().slice(h.html().indexOf('data-rules-lane'));
  assert.ok(!/Add to pipeline/.test(laneHtml)); assert.ok(!/data-hunt="add"/.test(laneHtml)); assert.match(laneHtml, /Note it on a project/); assert.match(laneHtml, /data-rules="no"/);
  assert.deepEqual(await (await mk()).store.list('enquiry'), [], 'nothing is made without a press');
});
test('signed out: legislation only, no bills, and the page says why; signed in: the radar\'s bills join, ranked, with no snippet shown', async () => {
  const out = await mk(); assert.ok(!/Energy Efficient Office/.test(out.h.html())); assert.match(out.h.html(), /Signed out, only legislation shows/);
  assert.equal(out.fetch.calls.length, 1); assert.equal(out.fetch.calls[0], '/api/live/?feeds=rules');
  const inn = await mk({ signedIn: true }), html = inn.h.html();
  assert.match(html, /Building \(Energy Efficient Office Buildings\) Amendment Bill/); assert.ok(!/Gambling Amendment Bill/.test(html), 'an unrelated bill is dropped'); assert.ok(!/SECRET SNIPPET/.test(html));
  assert.match(html, /Before Parliament: first reading/); assert.ok(!/Signed out, only legislation/.test(html));
  assert.match(html, /href="https:\/\/bills\.parliament\.nz\/v\/6\/6ad74b9d-5a90-435a-4146-08dee85e8f6d"/);
});
test('without the key the lane says legislation is not switched on, and bills still show for a member', async () => {
  const needs = FEED([], [{ id: 'legislation', name: 'NZ Legislation', ok: false, needsKey: true, error: 'NZ Legislation is not switched on: it needs a key' }]);
  const a = await mk({ answer: needs }); assert.match(a.h.html(), /Legislation is not switched on yet\. It needs a free key from the Parliamentary Counsel Office/);
  const b = await mk({ answer: needs, signedIn: true }); assert.match(b.h.html(), /Energy Efficient Office/); assert.match(b.h.html(), /only bills are shown/);
});
test('a feed that fails says so in plain words and does not break the tenders; "Check again" asks again', async () => {
  let fail = true; const { h, fetch } = await mk({ answer: () => (fail ? json({}, 500) : json(FEED())) });
  assert.match(h.html(), /Legislation is not answering just now \(500\)/); assert.match(h.html(), /Try again/);
  fail = false; await click(h, 'look'); assert.equal(fetch.calls.length, 2); assert.match(h.html(), /Building \(Earthquake-prone/);
});
test('the topic filter narrows the lane and keeps counts; the practice\'s regions leave out other regions', async () => {
  const { h } = await mk(); assert.match(h.html(), /aria-pressed="true"[^>]*><span>All<\/span>/);
  await click(h, 'topic', { topic: 'heritage' });
  let html = h.html(); assert.equal((html.match(/class="hunt-card is-rule"/g) ?? []).length, 1); assert.match(html, /Heritage New Zealand Pouhere Taonga Bill/);
  await click(h, 'topic', { topic: '' }); assert.equal((h.html().match(/class="hunt-card is-rule"/g) ?? []).length, RULES.length);
  const w = await mk({ regions: ['Waikato'] }); assert.ok(!/Auckland District Plan/.test(w.h.html())); assert.match(w.h.html(), /Heritage New Zealand/);
  const a = await mk({ regions: ['Auckland'] }); assert.match(a.h.html(), /Auckland District Plan/);
});
test('"Not for us" hides a rule, is remembered, and can be brought back; it does not touch the leads\' own memory', async () => {
  const { h, store } = await mk(), id = RULES.find((r) => /Heritage/.test(r.title)).id;
  await click(h, 'no', { id }); assert.ok(!/Heritage New Zealand Pouhere/.test(h.html().split('hunt-hidden')[0])); assert.match(h.html(), /1 hidden as not for us/);
  assert.deepEqual(Object.keys(cleanDismissed((await store.get('setting', RULES_SETTING.dismissed('browser'))).value, NOW)), [id]);
  assert.equal(await store.get('setting', SETTING.dismissed('browser')), null);
  await click(h, 'toggle-hidden'); assert.match(h.html(), /Bring back/); await click(h, 'back', { id }); assert.match(h.html().split('hunt-hidden')[0], /Heritage New Zealand Pouhere/);
});
test('"Note it on a project" adds one history line to the chosen project, with our words and the link; nothing else is made', async () => {
  const { h, store, ctx } = await mk(); const p = newProject({ name: 'Rata Street house', now: NOW });
  await store.save('project', p.project ?? p); const pid = (p.project ?? p).id;
  const id = RULES.find((r) => /Exempt Small/.test(r.title)).id;
  await click(h, 'note', { id }); assert.match(h.html(), /Which project\?[^]*Rata Street house/); assert.match(h.html(), /data-rules="note-save"/);
  await click(h, 'note-save', { id }, { value: pid });
  const acts = await store.list('activity', { project_id: pid }); assert.equal(acts.length, 1);
  assert.equal(acts[0].action, 'Rule change noted'); assert.equal(acts[0].who, 'Mere'); assert.match(acts[0].detail, /^Building \(Exempt Small Stand-alone Dwellings\) Order 2026 \(order, in force, version of 2026-11-20\)\. It may change: more small-dwelling/);
  assert.match(acts[0].detail, /https:\/\/www\.legislation\.govt\.nz\/regulation\/public\/2026\/0150\//); assert.ok(acts[0].detail.endsWith(NOT_LEGAL_ADVICE));
  assert.match(h.html(), /Noted “Building \(Exempt Small Stand-alone Dwellings\) Order 2026” on Rata Street house/);
  assert.deepEqual(await store.list('enquiry'), []); assert.deepEqual(await store.list('crm_activity'), []);
});
test('with no project to note it on the page says so; a viewer sees the cards and no buttons', async () => {
  const { h } = await mk(); await click(h, 'note', { id: RULES[0].id }); assert.match(h.html(), /There is no project to note it on yet/);
  const v = await mk({ readOnly: true }), html = v.h.html().slice(v.h.html().indexOf('data-rules-lane'));
  assert.ok(!/data-rules="note"/.test(html)); assert.ok(!/data-rules="no"/.test(html)); assert.match(html, /hunt-card is-rule/);
});
test('the day\'s answer is kept: a second visit the same day does not ask the feed again; "Check again" does', async () => {
  const a = await mk(); const f2 = stubFetch(); const h2 = createHunt(a.ctx, { redraw() {}, fetch: f2, now: () => NOW }); await h2.start(); await new Promise((r) => setTimeout(r, 20));
  assert.equal(f2.calls.length, 0); assert.match(h2.html(), /Building \(Earthquake-prone/);
  await click(h2, 'look'); assert.equal(f2.calls.length, 1);
});
test('markup from a feed is data: a rule with a script in its title is shown as text, and a rule with an off-site link is dropped', async () => {
  const bad = { ...RULES[0], id: 'rule:x-1', title: '<img src=x onerror=alert(1)> Building Act' }, off = { ...RULES[1], id: 'rule:x-2', sourceUrl: 'https://evil.example/x' };
  const { h } = await mk({ answer: FEED([bad, off]) }); const html = h.html();
  assert.ok(!html.includes('<img src=x')); assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt; Building Act/); assert.equal((html.match(/class="hunt-card is-rule"/g) ?? []).length, 1);
});
test('the lane is its own module and stylesheet, and hunt.js only adds a small separate block for it', () => {
  const src = fs.readFileSync(new URL('../../architecture/js/hunt.js', import.meta.url), 'utf8');
  assert.equal((src.match(/rules\./g) ?? []).length >= 5, true); assert.ok(!/ruleCard|rulesHtml/.test(src));
  assert.ok(fs.existsSync(new URL('../../architecture/hunt-rules.css', import.meta.url)));
});
