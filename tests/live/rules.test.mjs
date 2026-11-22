// Rule changes coming: the Legislation API reader, the ranking and the feed. Offline. The fixtures are written for these tests in the real response
// shape (checked 22 Nov 2026: { results:[...], page, per_page, total }). There is no real key here: the tests use a made-up one and prove it never leaves the header.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { onRequest } from '../../functions/api/live.js';
import { clearMemo } from '../../api/_feeds/util.js';
import { RULE_SEARCHES, searchUrl, versionsUrl, readLegislation, RULES_LIMITS, NeedsKeyError } from '../../api/_feeds/rules-legislation.js';
import { fetchRules } from '../../api/_feeds/rules.js';
import { runFeeds, FEEDS } from '../../api/_feeds/index.js';
import {
  parseWorks, parseVersionsDate, dayFromVersionId, legislationUrl, billUrl, classify, rankRules, filterRules, mergeRules, billFromRow, rankBillRows, cleanRule, noteText, topicCounts,
  TOPIC_KEYS, STAGES, NOT_LEGAL_ADVICE, RULES,
} from '../../architecture/js/rules-rank.js';
import { withFetch, json } from './helpers.mjs';

const read = (f) => JSON.parse(fs.readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf8'));
const WORKS = read('rules-works.json'), VERSIONS = read('rules-versions.json');
const NOW = new Date('2026-11-22T10:00:00+13:00');
const KEY = 'test-key-not-a-real-key-0000';
const BASE = 'https://lab.assembl.co.nz/api/live/';
test.beforeEach(() => clearMemo());

/** every search answers with the fixture; the versions endpoint answers for the work that has no date */
const routes = (over = {}) => [[(u) => u.host === 'api.legislation.govt.nz', (u, init) => {
  if (over.api) return over.api(u, init);
  if (u.pathname.includes('/versions/')) return json(VERSIONS);
  return json(u.searchParams.get('search_term') === 'building' && u.searchParams.get('page') === '1' ? WORKS : { results: [], page: 1, per_page: 30, total: 0 });
}]];
const titles = (r) => r.map((x) => x.title);

// ---- parsing the real shape -------------------------------------------------------------------------------------------------------------
test('the works list is read into bounded records: stage, status, agencies, version date and links, from the real shape', () => {
  const recs = parseWorks(WORKS), by = (t) => recs.find((r) => r.title.startsWith(t));
  const eq = by('Building (Earthquake-prone');
  assert.equal(eq.stage, 'act'); assert.equal(eq.status, 'In force'); assert.equal(eq.day, '2026-11-18'); assert.deepEqual(eq.agencies, ['Ministry of Business, Innovation, and Employment']);
  assert.deepEqual(eq.formats.map((f) => f.type), ['html', 'pdf', 'xml']); assert.match(eq.url, /^https:\/\/www\.legislation\.govt\.nz\/act\/public\/2026\/0012\/latest\/whole\.html$/);
  assert.equal(by('Building (Exempt Small').stage, 'order'); assert.equal(by('Resource Management (Auckland').stage, 'regulations');
  const b = by('Heritage New Zealand'); assert.equal(b.stage, 'bill'); assert.match(b.status, /not law until it passes/);
  const sop = by('Resource Management (Consenting'); assert.equal(sop.stage, 'amendment paper'); assert.match(sop.url, /\/amendment-paper\/government\/2026\/0813\//);
  assert.ok(recs.every((r) => STAGES.includes(r.stage)));
});
test('a repealed act, and a record whose only links are off www.legislation.govt.nz or not https, are not read', () => {
  const recs = parseWorks(WORKS);
  assert.ok(!recs.some((r) => /^Building Act 1991/.test(r.title)), 'repealed');
  assert.ok(!recs.some((r) => /Evacuation/.test(r.title)), 'an off-site host and an http link leave nothing to link to');
  for (const bad of ['https://evil.example/act/public/2026/1/x.html', 'http://www.legislation.govt.nz/act/public/2026/1/x.html', 'https://www.legislation.govt.nz.evil.example/a', 'https://www.legislation.govt.nz:444/act/x', 'https://user:p@www.legislation.govt.nz/act/x', 'https://www.legislation.govt.nz/act/x?q=1', 'https://www.legislation.govt.nz/act/x#h', 'javascript:alert(1)', '', null]) assert.equal(legislationUrl(bad), '', String(bad));
  assert.equal(legislationUrl('https://www.legislation.govt.nz/act/public/2026/0012/latest/whole.pdf'), 'https://www.legislation.govt.nz/act/public/2026/0012/latest/whole.pdf');
  assert.equal(billUrl('https://bills.parliament.nz/v/6/ba467863-d6b0-4968-1027-08de369d9192'), 'https://bills.parliament.nz/v/6/ba467863-d6b0-4968-1027-08de369d9192');
  assert.equal(billUrl('https://bills.parliament.nz.evil.example/v/6/ba467863-d6b0-4968-1027-08de369d9192'), ''); assert.equal(billUrl('https://bills.parliament.nz/x'), '');
});
test('parsing is strict and bounded: a wrong shape gives nothing, 100 results at most, text cut, unknown fields never kept', () => {
  for (const j of [null, [], {}, { results: 'x' }, { results: [null, 5, 'x', {}] }, '<html>']) assert.deepEqual(parseWorks(j), []);
  const many = { results: Array.from({ length: 300 }, (_, i) => ({ title: `Building Act ${i}`, act_status: 'in_force', act_type: 'public', secret: 'x', latest_matching_version: { version_id: `act_public_2026_${1000 + i}_2026-11-01`, formats: [{ type: 'html', url: `https://www.legislation.govt.nz/act/public/2026/${1000 + i}/latest/whole.html` }] } })) };
  const r = parseWorks(many); assert.equal(r.length, 100);
  assert.ok(!JSON.stringify(r).includes('secret')); assert.deepEqual(Object.keys(r[0]).sort(), ['agencies', 'day', 'formats', 'id', 'kindPath', 'source', 'stage', 'status', 'title', 'url', 'versionId', 'workId']);
  const long = parseWorks({ results: [{ title: 'B'.repeat(900), act_status: 'in_force', act_type: 'public', latest_matching_version: { version_id: 'act_public_2026_1_2026-01-01', formats: [{ type: 'html', url: 'https://www.legislation.govt.nz/act/public/2026/1/latest/whole.html' }] } }] });
  assert.equal(long[0].title.length, 300);
});
test('the version date is the last date in the version_id; an impossible date is not a date; the versions answer is read in a few shapes', () => {
  assert.equal(dayFromVersionId('act_public_2026_0012_2026-11-18'), '2026-11-18'); assert.equal(dayFromVersionId('act_public_2026_0012_latest'), '');
  assert.equal(dayFromVersionId('act_public_2026_0012_2026-13-45'), ''); assert.equal(dayFromVersionId(undefined), '');
  assert.equal(parseVersionsDate(VERSIONS), '2026-11-09'); assert.equal(parseVersionsDate([{ version_id: 'x_2026-01-02' }, { version_id: 'x_2026-03-04' }]), '2026-03-04'); assert.equal(parseVersionsDate({}), '');
});

// ---- ranking and the mapping, in our own words ----------------------------------------------------------------------------------------------
test('the built environment is kept, newest version first, each with what it may change', () => {
  const k = rankRules(parseWorks(WORKS), { now: NOW });
  assert.deepEqual(titles(k.rules), ['Building (Exempt Small Stand-alone Dwellings) Order 2026', 'Building (Earthquake-prone Buildings) Amendment Act 2026', 'Resource Management (Consenting and Other System Changes) Amendment Bill',
    'Education (School Boards) Amendment Regulations 2026', 'Resource Management (Auckland District Plan Modification) Regulations 2026', 'Heritage New Zealand Pouhere Taonga Bill', 'Building and Construction Sector (Strengthening Occupational Licensing Regimes) Amendment Bill']);
  assert.deepEqual(k.rules.map((r) => r.day), [...k.rules.map((r) => r.day)].sort().reverse());
  const w = (t) => k.rules.find((r) => r.title.startsWith(t));
  assert.deepEqual(w('Building (Earthquake').affects[0], 'seismic strengthening work and deadlines'); assert.match(w('Building (Earthquake').why, /seismic strengthening/);
  assert.match(w('Building (Exempt').affects[0], /granny flat/); assert.match(w('Building (Exempt').why, /without a building consent/);
  assert.match(w('Building and Construction Sector').affects[0], /who may design or sign off/);
  assert.match(w('Resource Management (Auckland').why, /zoning and height rules in Auckland/); assert.deepEqual(w('Resource Management (Auckland').regions, ['Auckland']);
  assert.match(w('Heritage').affects[0], /listed buildings and consent for changes/);
  assert.match(w('Education (School Boards)').affects[0], /school building programmes/);
  assert.match(w('Resource Management (Consenting').affects[0], /resource consents/);
});
test('every why says "may", gives no verdict and no legal advice; the disclaimer is the lab\'s own', () => {
  const k = rankRules(parseWorks(WORKS), { now: NOW }).rules;
  for (const r of [...k, ...RULES.map((x) => ({ why: typeof x.why === 'function' ? x.why('Auckland') : x.why }))]) {
    assert.match(r.why, /\bmay\b/i, r.why); assert.doesNotMatch(r.why, /\b(must|will|shall|complies|compliant|illegal|you should|you must|guaranteed)\b/i, r.why);
  }
  assert.equal(NOT_LEGAL_ADVICE, 'This is not legal advice. Read the legislation and talk to the council or an adviser.');
});
test('unrelated acts are dropped: minerals, gambling, building societies, elected members, tertiary pastoral care, repealed, a year old, undated', () => {
  const k = rankRules(parseWorks(WORKS), { now: NOW }), gone = k.dropped.map((d) => d.title);
  for (const t of ['Crown Minerals (Petroleum) Amendment Act 2026', 'Gambling (Harm Prevention) Amendment Act 2026', 'Building Societies Amendment Act 2026', "Local Government (Elected Members' Remuneration) Amendment Act 2026",
    'Education (Pastoral Care of Tertiary and International Learners) Amendment Order 2026', 'Housing Restructuring and Tenancy Matters Act 1992']) { assert.ok(gone.includes(t), t); assert.ok(!titles(k.rules).includes(t), t); }
  assert.equal(k.dropped.find((d) => /Housing Restructuring/.test(d.title)).why, 'Older than a year.');
  for (const t of ['Crown Minerals Act 1991', 'Gambling Act 2003', 'Building Societies Act 1965', 'Overseas Investment Act 2005', 'Education and Training Act 2020', 'Climate Change Response (Emissions Trading Reform) Amendment Act', 'Fisheries Act 1996', 'Electoral Act 1993', 'Capacity Building Fund Order', 'Hazardous Substances (Fireworks) Regulations 2026', 'Residential Tenancies Amendment Act']) assert.equal(classify(t), null, t);
  for (const t of ['Building Act 2004', 'Building Code Amendment Regulations', 'Construction Contracts Amendment Act', 'Unit Titles Act 2010', 'Te Ture Whenua Māori Act 1993', 'Fire and Emergency New Zealand Act 2017', 'Health and Safety at Work (Asbestos) Regulations', 'Natural Hazards Commission Act 2023', 'Public Works Amendment Act', 'Infrastructure Funding and Financing Act 2020', 'Kāinga Ora–Homes and Communities Act 2019', 'Accessibility for New Zealanders Act 2019', 'Urban Development Act 2020', 'Local Government (Water Services) Act 2025', 'Resource Management (Natural Hazards) Amendment Act', 'Residential Tenancies (Healthy Homes Standards) Regulations 2019']) assert.ok(classify(t), t);
  assert.equal(classify('Te Ture Whenua Māori Act 1993').topics.includes('maori'), true);
});
test('a title that says what it is about gets the most specific rule first; macrons do not matter', () => {
  assert.equal(classify('Building (Earthquake-prone Buildings) Amendment Act').rule, 'earthquake-prone'); assert.equal(classify('Building and Construction Sector (Strengthening Occupational Licensing Regimes) Amendment Bill').rule, 'licensing');
  assert.equal(classify('Building (Exempt Small Stand-alone Dwellings) Order').rule, 'small-dwellings'); assert.equal(classify('Building Act 2004').rule, 'building');
  assert.equal(classify('Te Ture Whenua Maori Act').rule, classify('Te Ture Whenua Māori Act').rule); assert.equal(classify('Maori Land Court Rules').rule, 'maori-land');
  assert.match(classify('Resource Management (Queenstown District Plan Modification) Order').why, /in Queenstown/); assert.match(classify('District Plan Modification Order').why, /in the district it names/);
});
test('a bill and the act it became show once, as the act; the same title from both sources shows once', () => {
  const act = parseWorks(WORKS).find((r) => /Earthquake/.test(r.title));
  const bill = billFromRow({ title: 'Building (Earthquake-prone Buildings) Amendment Bill', url: 'https://bills.parliament.nz/v/6/350162e5-1747-474b-30bb-08de385625f0', published_at: '2026-09-25 00:00:00+00', current_stage: 'Royal Assent', bill_status: 'Terminated' });
  const k = rankRules([bill, act], { now: NOW }); assert.equal(k.rules.length, 1); assert.equal(k.rules[0].stage, 'act'); assert.equal(k.droppedCount, 1);
  const a = rankRules([act], { now: NOW }).rules, b = rankBillRows([{ title: 'Heritage New Zealand Pouhere Taonga Bill', url: 'https://bills.parliament.nz/v/6/350162e5-1747-474b-30bb-08de385625f1', published_at: '2026-11-01 00:00:00+00', current_stage: 'Select Committee' }], { now: NOW }).rules;
  const m = mergeRules(a, b, a); assert.equal(m.length, 2);
});
test('bills from Parliament: only bills.parliament.nz links, passed is told from before Parliament, the snippet is never read', () => {
  const r = billFromRow({ title: 'Planning Bill', url: 'https://bills.parliament.nz/v/6/ba467863-d6b0-4968-1027-08de369d9192', published_at: '2026-09-30 00:00:00+00', current_stage: 'Royal Assent', bill_status: 'Terminated', snippet: 'SECRET TEXT' });
  assert.equal(r.status, 'Passed: royal assent given'); assert.ok(!JSON.stringify(r).includes('SECRET'));
  const sc = billFromRow({ title: 'Building Amendment Bill', url: 'https://bills.parliament.nz/v/6/ae8d569d-871d-4d61-c816-08ded59a19e9', published_at: '2026-06-30', current_stage: 'Select Committee' });
  assert.equal(sc.status, 'Before Parliament: select committee');
  const row = (o) => ({ title: o.title, url: o.url, published_at: '2026-09-30 00:00:00+00', current_stage: o.stage });
  assert.equal(rankBillRows([row({ title: 'Building Amendment Bill', url: sc.url, stage: 'Select Committee' })], { now: NOW }).rules[0].badge, 'Bill'); assert.equal(rankBillRows([row({ title: 'Planning Bill', url: r.url, stage: 'Royal Assent' })], { now: NOW }).rules[0].badge, 'Passed');
  assert.equal(billFromRow({ title: 'x Bill', url: 'https://evil.example/v/6/ba467863-d6b0-4968-1027-08de369d9192' }), null);
});
test('region and topic filters: a national rule always stays, a regional one only for its region, a topic narrows', () => {
  const rules = rankRules(parseWorks(WORKS), { now: NOW }).rules;
  assert.equal(filterRules(rules, {}).length, rules.length);
  assert.ok(!titles(filterRules(rules, { regions: ['Waikato'] })).some((t) => /Auckland District Plan/.test(t)), 'another region is left out');
  assert.ok(titles(filterRules(rules, { regions: ['Auckland'] })).some((t) => /Auckland District Plan/.test(t)));
  assert.equal(filterRules(rules, { regions: ['Waikato'] }).length, rules.length - 1, 'every national rule stays');
  assert.deepEqual(titles(filterRules(rules, { topic: 'heritage' })), ['Heritage New Zealand Pouhere Taonga Bill']);
  assert.deepEqual(titles(filterRules(rules, { topic: 'schools', regions: ['Waikato'] })), ['Education (School Boards) Amendment Regulations 2026']);
  assert.deepEqual(filterRules(rules, { topic: 'maori' }), []); const c = topicCounts(rules); assert.ok(TOPIC_KEYS.every((k) => k in c)); assert.equal(c.building, 3);
});
test('cleanRule keeps only bounded, linked, known-stage items, and a note carries our words and the link only', () => {
  const r = rankRules(parseWorks(WORKS), { now: NOW }).rules[0];
  assert.deepEqual(cleanRule(r), r); assert.equal(cleanRule({ ...r, sourceUrl: 'https://evil.example/x' }), null); assert.equal(cleanRule({ ...r, stage: 'whatever' }), null); assert.equal(cleanRule({ ...r, kind: 'signal' }), null);
  assert.deepEqual(cleanRule({ ...r, topics: ['building', 'nope'], formats: [{ type: 'html', url: 'https://evil.example' }] }).topics, ['building']);
  const n = noteText(r); assert.match(n, /^Building \(Exempt Small Stand-alone Dwellings\) Order 2026 \(order, in force, version of 2026-11-20\)\. It may change: more small-dwelling/); assert.ok(n.includes(r.sourceUrl)); assert.ok(n.endsWith(NOT_LEGAL_ADVICE));
  assert.throws(() => noteText({ kind: 'rule' }), /no link/);
});

// ---- the reader and the feed ---------------------------------------------------------------------------------------------------------------
test('the searches are title searches for the built environment, newest updated first, a few pages, under the request limits', () => {
  const terms = [...new Set(RULE_SEARCHES.map((q) => q.term))];
  for (const t of ['building', 'construction', 'resource management', 'local government', 'heritage', 'Te Ture Whenua Māori', 'Māori land', 'housing', 'education', 'health and safety at work', 'fire and emergency', 'climate change', 'natural hazards', 'unit titles', 'public works', 'infrastructure', 'urban development', 'Kāinga Ora', 'accessibility']) assert.ok(terms.includes(t), t);
  assert.ok(RULE_SEARCHES.length + RULES_LIMITS.versionCalls < 50, 'under Cloudflare\'s 50 subrequests'); assert.ok(RULE_SEARCHES.every((q) => q.page >= 1 && q.page <= 2));
  const u = new URL(searchUrl({ term: 'Kāinga Ora', page: 1 }));
  assert.equal(u.origin + u.pathname, 'https://api.legislation.govt.nz/v0/works/'); assert.equal(u.searchParams.get('search_field'), 'title'); assert.equal(u.searchParams.get('sort_by'), 'most_recently_updated'); assert.equal(u.searchParams.get('search_term'), 'Kāinga Ora');
  assert.equal(new URL(versionsUrl('act_public_2026_0050')).searchParams.get('sort'), 'desc'); assert.equal(new URL(searchUrl({ term: 'x', page: 99 })).searchParams.get('page'), '3');
});
test('with the key set the feed reads every search, sends the key only as X-Api-Key, dates the undated item from the versions endpoint, and shapes items like early signals', async () => {
  await withFetch(routes(), async (calls) => {
    const out = await fetchRules({ env: { LEGISLATION_API_KEY: KEY }, hunt: {} });
    assert.equal(out.id, 'rules'); assert.equal(out.cadence, '6-hourly'); assert.equal(out.values.sources[0].ok, true); assert.equal(out.truth, 'Live');
    const unit = out.values.rules.find((r) => /Unit Titles/.test(r.title)); assert.ok(unit, 'dated by the versions endpoint'); assert.equal(unit.day, '2026-11-09');
    const r = out.values.rules[0];
    for (const k of ['id', 'kind', 'title', 'source', 'sourceUrl', 'day', 'stage', 'status', 'agencies', 'why', 'affects']) assert.ok(k in r, k);
    assert.equal(r.kind, 'rule'); assert.match(r.id, /^rule:/);
    assert.equal(calls.filter((c) => !c.url.pathname.includes('/versions/')).length, RULE_SEARCHES.length); assert.equal(calls.filter((c) => c.url.pathname.includes('/versions/')).length, 1);
    assert.ok(calls.length < 50);
    for (const c of calls) { assert.equal(c.init.headers['X-Api-Key'], KEY); assert.ok(!c.href.includes(KEY), 'never in a URL'); assert.equal(c.url.host, 'api.legislation.govt.nz'); }
    assert.ok(!JSON.stringify(out).includes(KEY), 'never in the answer');
    assert.ok(out.licence.attribution.includes('Parliamentary Counsel Office'));
  });
});
test('"needs a key": without the secret nothing is fetched, the answer says so, and it is only briefly cached', async () => {
  await withFetch([], async (calls) => {
    const out = await fetchRules({ env: {}, hunt: {} });
    assert.equal(calls.length, 0); assert.equal(out.value, 0); assert.equal(out.values.sources[0].needsKey, true); assert.match(out.values.sources[0].error, /needs a key/); assert.equal(out.status, 'unavailable'); assert.equal(out.truth, 'Partial');
    await assert.rejects(readLegislation({}), (e) => e instanceof NeedsKeyError && e.needsKey);
    const run = await runFeeds(['rules', 'grocery'], { env: undefined, place: 'auckland', district: 'auckland-district', hunt: {} });
    assert.ok(!run.feeds.rules.error, 'not a failure'); assert.ok(run.cache && run.cache.sMaxAge <= 300, 'so the key works soon after it is added');
  });
});
test('through /api/live/: the key is passed from the Pages secret only for this feed, the answer is cached six hours, and other secrets are not passed on', async () => {
  const seen = [];
  await withFetch(routes({ api: (u, init) => { seen.push(init.headers['X-Api-Key']); return json(u.pathname.includes('/versions/') ? VERSIONS : u.searchParams.get('search_term') === 'building' && u.searchParams.get('page') === '1' ? WORKS : { results: [] }); } }), async () => {
    const res = await onRequest({ request: new Request(`${BASE}?feeds=rules`), env: { LEGISLATION_API_KEY: KEY, SUPABASE_SERVICE_ROLE_KEY: 'x', SOMETHING_ELSE: 'y' } });
    const body = await res.json(); assert.equal(res.status, 200); assert.ok(body.feeds.rules.values.rules.length >= 7);
    assert.match(res.headers.get('cache-control'), /s-maxage=21600/); assert.ok(seen.length && seen.every((k) => k === KEY));
    assert.ok(!JSON.stringify(body).includes(KEY)); assert.ok(!JSON.stringify(body).includes('SUPABASE'));
  });
  await withFetch([], async (calls) => {
    const res = await onRequest({ request: new Request(`${BASE}?feeds=rules,grocery`), env: {} }); const body = await res.json();
    assert.equal(body.feeds.rules.values.sources[0].needsKey, true); assert.ok(body.feeds.grocery && !body.feeds.grocery.error, 'the rest of the answer is unaffected'); assert.equal(calls.filter((c) => c.url.host === 'api.legislation.govt.nz').length, 0);
    assert.match(res.headers.get('cache-control'), /s-maxage=(\d{1,3})\b/);
  });
});
test('regions can be asked of the feed too; a failing search leaves the rest and marks the answer partial; all failing is an error without the key in it', async () => {
  await withFetch(routes(), async () => {
    const out = await fetchRules({ env: { LEGISLATION_API_KEY: KEY }, hunt: { regions: 'Waikato' } });
    assert.ok(!out.values.rules.some((r) => /Auckland District Plan/.test(r.title))); assert.ok(out.values.rules.some((r) => /Heritage/.test(r.title)));
  });
  clearMemo();
  await withFetch(routes({ api: (u) => (u.searchParams.get('search_term') === 'heritage' ? new Response('nope', { status: 500 }) : json(u.searchParams.get('search_term') === 'building' && u.searchParams.get('page') === '1' ? WORKS : { results: [] })) }), async () => {
    const out = await fetchRules({ env: { LEGISLATION_API_KEY: KEY }, hunt: {} });
    assert.equal(out.truth, 'Partial'); assert.ok(out.values.sources[0].partial); assert.ok(out.values.rules.length > 3);
  });
  clearMemo();
  await withFetch(routes({ api: () => new Response(`bad ${KEY}`, { status: 401 }) }), async () => {
    await assert.rejects(fetchRules({ env: { LEGISLATION_API_KEY: KEY }, hunt: {} }), (e) => !String(e.message).includes(KEY));
    const run = await runFeeds(['rules'], { env: { LEGISLATION_API_KEY: KEY }, hunt: {} });
    assert.ok(run.feeds.rules.error); assert.ok(!JSON.stringify(run).includes(KEY)); assert.equal(run.cache, null, 'a failure is never cached');
  });
});
test('the feed is registered, and no key appears anywhere in the code, the fixtures or the docs', () => {
  assert.ok(FEEDS.rules && FEEDS.rules.cadence === '6-hourly');
  const files = ['api/_feeds/rules.js', 'api/_feeds/rules-legislation.js', 'architecture/js/rules-rank.js', 'architecture/js/hunt-rules.js', 'functions/api/live.js', 'tests/live/fixtures/rules-works.json', 'tests/live/fixtures/rules-versions.json'];
  for (const f of files) assert.doesNotMatch(fs.readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8'), /[A-Za-z0-9]{32,}/, f);
});
