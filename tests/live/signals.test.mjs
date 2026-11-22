import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { onRequest } from '../../functions/api/live.js';
import { clearMemo, UA } from '../../api/_feeds/util.js';
import { fetchSignals, SIGNAL_SOURCES, NOT_WIRED } from '../../api/_feeds/signals.js';
import { BEEHIVE_FEEDS, feedsFor, isChallenge, SIGNAL_LIMITS } from '../../api/_feeds/signals-beehive.js';
import { GAZETTE_QUERIES, gazetteUrl } from '../../api/_feeds/signals-gazette.js';
import {
  parseBeehiveRss, parseDigitalNzGazette, classify, classifyGazette, toSignal, scoreSignal, rankSignals, linkSignals, whereIs, placesIn, statedAmount, parseLens,
  DNZ_FIELDS, FIT_MIN, HORIZONS, PLACES,
} from '../../architecture/js/signals-rank.js';
import { REGIONS } from '../../architecture/js/hunt-rank.js';
import { withFetch, text, json } from './helpers.mjs';

// Offline. The fixtures are written for these tests in the real shapes (Beehive portfolio RSS, DigitalNZ search JSON) as read on 22 Nov 2026.
// Their items are made up, and no person is named in them. Nothing here calls Beehive or DigitalNZ.
const read = (f) => fs.readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf8');
const XML = { education: read('beehive-education.xml'), health: read('beehive-health.xml'), maori: read('beehive-maori.xml'), treaty: read('beehive-treaty.xml') };
const DNZ = { land: JSON.parse(read('dnz-gazette-land.json')), schools: JSON.parse(read('dnz-gazette-schools.json')) };
const NOW = new Date('2026-11-22T10:00:00+13:00');
const BASE = 'https://lab.assembl.co.nz/api/live/';
const byTerm = { 6729: XML.education, 6724: XML.health, 6756: XML.maori, 6734: XML.treaty };
const empty = '<?xml version="1.0"?><rss version="2.0"><channel><title>x</title></channel></rss>';
const records = () => [
  ...parseBeehiveRss(XML.education, { label: 'Education' }), ...parseBeehiveRss(XML.health, { label: 'Health' }), ...parseBeehiveRss(XML.maori, { label: 'Māori Development' }),
  ...parseBeehiveRss(XML.treaty, { label: 'Treaty of Waitangi Negotiations' }), ...parseDigitalNzGazette(DNZ.land), ...parseDigitalNzGazette(DNZ.schools),
];
const lens = (p) => parseLens(p);
/** routes for both sources: Beehive by portfolio term, DigitalNZ by its subject filter */
const routes = (over = {}) => [
  [(u) => u.host === 'www.beehive.govt.nz', (u, init) => {
    const term = Number(u.pathname.match(/\/taxonomy\/term\/(\d+)\/feed$/)?.[1]);
    if (over.beehive) return over.beehive(u, term, init);
    return text(byTerm[term] ?? empty);
  }],
  [(u) => u.host === 'api.digitalnz.org', (u, init) => (over.dnz ? over.dnz(u, init) : json(u.searchParams.getAll('and[subject][]').includes('Establishment of a school') ? DNZ.schools : u.searchParams.get('page') === '1' ? DNZ.land : { search: { results: [] } }))],
];
test.beforeEach(() => { clearMemo(); SIGNAL_LIMITS.ms = 8000; });

// ---- reading Beehive ---------------------------------------------------------------------------------------------------------------
test('a Beehive portfolio feed is read into releases: title, link, NZ day, summary; speeches and off-site links are left out', () => {
  const r = parseBeehiveRss(XML.education, { label: 'Education' });
  assert.equal(r.length, 9, 'the speech and the link to another site are dropped');
  const d = r.find((x) => x.id === '900001');
  assert.equal(d.title, 'Drury gets land for a new primary school'); assert.equal(d.url, 'https://www.beehive.govt.nz/release/drury-gets-land-new-primary-school');
  assert.equal(d.day, '2026-11-10'); assert.equal(d.portfolio, 'Education'); assert.equal(d.source, 'beehive'); assert.match(d.summary, /future primary school/);
  assert.ok(!r.some((x) => /speech|example\.com/.test(x.url)));
});

test('feed text is data: entity declarations give nothing, markup and scripts are stripped, entities decoded, sizes bounded', () => {
  assert.deepEqual(parseBeehiveRss('<!DOCTYPE x [<!ENTITY a "b">]><rss><channel><item><title>x</title><link>https://www.beehive.govt.nz/release/x-y-z</link><pubDate>Mon, 16 Nov 2026 11:00:00 +1300</pubDate></item></channel></rss>'), []);
  assert.deepEqual(parseBeehiveRss('<html>not a feed</html>'), []);
  assert.deepEqual(parseBeehiveRss('<rss>' + 'x'.repeat(2_000_001) + '</rss>'), [], 'a feed over 2 MB is not read');
  const hall = parseBeehiveRss(XML.education).find((x) => x.id === '900010');
  assert.equal(hall.title, 'Hall & library upgrade funded in Rotorua');
  assert.ok(!/[<>]|alert|&nbsp;/.test(hall.title + hall.summary), hall.summary);
  const many = '<rss><channel>' + Array.from({ length: 80 }, (_, i) => `<item><title>New school ${i}</title><link>https://www.beehive.govt.nz/release/new-school-${i}</link><pubDate>Mon, 16 Nov 2026 11:00:00 +1300</pubDate></item>`).join('') + '</channel></rss>';
  assert.equal(parseBeehiveRss(many).length, 60, 'at most 60 items a feed');
});

test('an answer that is a bot-protection page is recognised, so it is reported and never worked around', () => {
  assert.ok(isChallenge('<html><iframe src="/_Incapsula_Resource?SWUDNSAI=31">Request unsuccessful. Incapsula incident ID: 1</iframe></html>'));
  assert.ok(isChallenge('<title>Pardon Our Interruption</title>'));
  assert.ok(!isChallenge(XML.education));
});

// ---- reading the Gazette through DigitalNZ ------------------------------------------------------------------------------------------
test('DigitalNZ Gazette records: only title, date, link and subjects are kept; open-licence records only; links must be the Gazette', () => {
  const r = parseDigitalNzGazette(DNZ.land);
  assert.equal(r.length, 7, 'the record without an open licence and the one linking elsewhere are dropped');
  const k = r.find((x) => x.noticeNo === '2026-ln9001');
  assert.equal(k.url, 'https://gazette.govt.nz/notice/id/2026-ln9001'); assert.equal(k.day, '2026-11-04'); assert.deepEqual(k.subjects.slice(0, 2), ['Land Notices', 'Public Works Act']);
  assert.equal(r.find((x) => x.noticeNo === '2026-ln9006').url, 'https://gazette.govt.nz/notice/id/2026-ln9006', 'http is made https');
  for (const x of r) assert.deepEqual(Object.keys(x).sort(), ['day', 'id', 'noticeNo', 'source', 'sourceName', 'subjects', 'title', 'url']);
  assert.ok(!JSON.stringify(r).includes('Delegate'), 'a description that came back anyway is never passed on');
  assert.deepEqual(parseDigitalNzGazette({ nope: 1 }), []); assert.deepEqual(parseDigitalNzGazette(null), []);
});

test('the DigitalNZ question asks only for the fields needed, never description or fulltext, and never puts the key in the URL', () => {
  assert.equal(DNZ_FIELDS, 'id,title,date,landing_url,subject,rights');
  for (const q of GAZETTE_QUERIES) {
    const u = new URL(gazetteUrl(q));
    assert.equal(u.searchParams.get('fields'), DNZ_FIELDS);
    assert.ok(!/description|fulltext|api_key/i.test(u.search), u.search);
    assert.equal(u.searchParams.getAll('and[primary_collection][]')[0], 'New Zealand Gazette');
    assert.ok(Number(u.searchParams.get('per_page')) <= 100);
  }
});

// ---- the rules --------------------------------------------------------------------------------------------------------------------
test('a release is classified by what it says is happening: land, planning, money; late, policy, people and infrastructure are left out', () => {
  const c = (title, summary = '') => classify({ title, summary });
  assert.equal(c('Land secured for South Auckland hospital', 'Land on Karaka Road in Drury has been secured.').stage, 'land');
  assert.equal(c('Funding approved for Kumeū secondary school', 'with design work to begin next year').stage, 'planning');
  assert.equal(c('Four more school redevelopments get the green light', 'investing $37 million to redevelop four schools').stage, 'funded');
  assert.match(c('Sod turned on Whangārei Hospital redevelopment').reason, /construction has started/);
  assert.match(c('Cardiac lab upgrade complete at Auckland City Hospital').reason, /construction has started or finished/);
  assert.match(c('Pharmacies to provide more funded medicines').reason, /not buildings|names no building/);
  assert.match(c('Energy resilience for Far North marae', 'solar').reason, /energy resilience/);
  assert.match(c('New school property agency begins operations', 'will build school property').reason, /organisation/);
  assert.match(c('Unlocking papakāinga across New Zealand', 'New national environmental standards make it easier to build homes.').reason, /policy/);
  assert.match(c('Better planning frees 1500 bed nights in Hawke\'s Bay', 'at the Memorial Hospital').reason, /not buildings/);
  assert.equal(c('Deed of Settlement signed').stage, 'settlement');
});

test('Gazette notice titles: land for a public building is kept; roads, cemeteries, disposals, corrections and conversions are not', () => {
  const g = (title, subjects = ['Land Notices', 'Public Works Act']) => classifyGazette({ title, subjects });
  assert.deepEqual([g('Notice of Intention to Take Land for Education Purposes—Kumeū Secondary School Project').stage, g('Notice of Intention to Take Land for Education Purposes—X').intention], ['land', true]);
  assert.equal(g('Land Acquired for Education Purposes—Cemetery Road, Lake Hāwea').sector, 'education', 'a road in the place name does not make it a road notice');
  assert.equal(g('Land Set Apart for State Housing Purposes—Freeland Avenue').purpose, 'state housing');
  assert.equal(g('Land to be Acquired for Local Purpose (Community Use) Reserve—Taihape').purpose, 'community use');
  assert.match(g('Land to be Acquired for the Purpose of Local Purpose (Soil Conservation and River Control purposes) Reserve—Papamoa').reason, /soil conservation/);
  assert.match(g('Land Declared Road—Great South Road').reason, /not a notice about land/);
  assert.match(g('Land Acquired for Cemetery Purposes—Mākara').reason, /cemetery/);
  assert.match(g('Land Declared No Longer Needed for Education Purposes').reason, /let go/);
  assert.match(g('Amendment—Establishment of X as a Charter School', ['Establishment of a school']).reason, /correction or amendment/);
  assert.match(g('Conversion of X School as a Charter School', ['Establishment of a school']).reason, /changing type/);
  assert.equal(g('New School Establishment', ['Departmental', 'Establishment of a school']).stage, 'school');
});

test('places: towns to their regions, longest name first, ambiguous names left out, nationwide words', () => {
  assert.ok(PLACES.every((p) => REGIONS.includes(p.region)), 'every place maps to a region the lens knows');
  assert.deepEqual(whereIs('Land on Karaka Road in Drury').regions, ['Auckland']);
  assert.deepEqual(placesIn('Mount Wellington and Havelock North').map((p) => p.name), ['Mount Wellington', 'Havelock North'], 'not "Wellington"');
  assert.deepEqual(whereIs('Two Hawke’s Bay marae').regions, ["Hawke's Bay"], 'a curly apostrophe still matches');
  assert.equal(whereIs('Funding for schools across New Zealand').region, 'New Zealand');
  assert.equal(whereIs('Four schools').region, '');
  assert.deepEqual(whereIs('Richmond Road and Lincoln Road').regions, [], 'street-name towns are not in the list');
  assert.equal(whereIs('marae in Whanganui and Napier and Tauranga').region, 'Manawatu-Wanganui, Hawke\'s Bay and 1 more');
});

test('a stated amount is taken as written, never worked out', () => {
  assert.deepEqual(statedAmount('investing a further $37 million to redevelop'), { value: 37e6, text: '$37 million' });
  assert.deepEqual(statedAmount('$8.6m brings marae'), { value: 8.6e6, text: '$8.6 million' });
  assert.equal(statedAmount('a new 24-bed wing'), null);
  assert.equal(statedAmount('$950,000 loan'), null, 'only millions and billions, as stated');
});

test('every signal says why in our own words, with its source, date, link, buyer (stated or likely) and a horizon marked as an estimate', () => {
  for (const r of records()) {
    const t = toSignal(r);
    if (t.dropped) { assert.ok(t.dropped.why.length > 5); continue; }
    const s = t.signal;
    assert.equal(s.kind, 'signal'); assert.match(s.id, /^[a-z]+:\S{1,60}$/); assert.match(s.day, /^\d{4}-\d{2}-\d{2}$/); assert.match(s.sourceUrl, /^https:\/\//);
    assert.ok(['Beehive', 'NZ Gazette'].includes(s.source)); assert.ok(['beehive', 'gazette'].includes(s.sourceId));
    assert.ok(s.why.length > 60 && s.why.length <= 300, s.why); assert.match(s.why, /\bmay\b/, 'a signal says may, never will');
    assert.ok(!/\busually\b|\bwill lead\b|\bguarantee/i.test(s.why), s.why);
    assert.ok(Object.values(HORIZONS).includes(s.horizon)); assert.match(s.horizon, /\(estimate\)$/); assert.equal(s.horizonBasis, 'estimate');
    assert.ok(['stated', 'likely'].includes(s.buyerBasis) && s.buyer.length > 3);
    assert.ok(s.evidence.length >= 1 && s.evidence.every((e) => e.label && /^https:\/\//.test(e.url)));
    assert.equal(typeof s.cultural.on, 'boolean');
    if (s.sourceId === 'beehive') assert.ok(!s.why.includes(r.summary.slice(0, 40)), 'the release summary is not repeated');
  }
});

// ---- scoring against the lens -----------------------------------------------------------------------------------------------------
test('the practice\'s lens: sectors and keywords score, regions filter, nothing is kept that matches nothing', () => {
  const all = records();
  const ed = rankSignals(all, lens({ sectors: 'education' }), NOW);
  assert.ok(ed.signals.length >= 6); assert.ok(ed.signals.every((s) => s.fit >= FIT_MIN && s.sectors.includes('education')));
  assert.ok(ed.signals.some((s) => s.title.startsWith('Govt funds new classrooms at Wakatipu')));
  const akl = rankSignals(all, lens({ sectors: 'education', regions: 'Auckland' }), NOW);
  assert.ok(!akl.signals.some((s) => /Wakatipu|Lake Hāwea/.test(s.title)), 'Otago signals are left out for an Auckland practice');
  assert.ok(akl.dropped.some((d) => /outside the practice's regions/.test(d.why)));
  const four = akl.signals.find((s) => s.title.startsWith('Four more school'));
  assert.ok(four, 'a release that names no place is kept and says so'); assert.ok(four.reasons.includes('no place named in the record: open it to check'));
  const kw = rankSignals(all, lens({ keywords: 'hospital' }), NOW);
  assert.ok(kw.signals.length >= 1 && kw.signals.every((s) => s.matched.keywords.includes('hospital')));
  assert.equal(rankSignals(all, lens({ keywords: 'spaceport' }), NOW).signals.length, 0);
  const s1 = rankSignals(all, lens({ sectors: 'health' }), NOW), s2 = rankSignals(all, lens({ sectors: 'health' }), NOW);
  assert.deepEqual(s1.signals.map((s) => [s.id, s.fit]), s2.signals.map((s) => [s.id, s.fit]), 'the same records, lens and day give the same answer');
});

test('freshness and age: a release older than 18 months is history; a new one scores higher', () => {
  const r = rankSignals(records(), lens({ sectors: 'education' }), NOW);
  assert.ok(r.dropped.some((d) => d.title.includes('Christchurch school') && d.why === 'older than 18 months'));
  const mk = (day) => toSignal({ source: 'beehive', sourceName: 'B', id: day, title: 'New classrooms funded at a school', url: 'https://www.beehive.govt.nz/release/x', day, summary: '$5 million for new classrooms' }).signal;
  const fresh = scoreSignal(mk('2026-11-20'), lens({ sectors: 'education' }), NOW).signal, old = scoreSignal(mk('2025-09-01'), lens({ sectors: 'education' }), NOW).signal;
  assert.ok(fresh.fit > old.fit); assert.ok(old.reasons.includes('more than a year old'));
});

test('the kaupapa Māori lens: marae and wharekura signals are flagged and kept with "always show"; settlements only with the lens', () => {
  const all = records();
  const on = rankSignals(all, lens({ keywords: 'spaceport', cultural: '1' }), NOW);
  assert.ok(on.signals.length >= 3, 'kept on the cultural switch alone');
  assert.ok(on.signals.every((s) => s.cultural.on));
  const marae = on.signals.find((s) => s.title.includes('New Plymouth'));
  assert.ok(marae.cultural.why.includes('marae')); assert.equal(marae.region, 'Taranaki'); assert.ok(marae.reasons.some((x) => /kaupapa Māori/.test(x)));
  assert.ok(on.signals.some((s) => s.title.includes('Te Wharekura o Tāmaki') && s.cultural.why.includes('wharekura')));
  const settle = on.signals.find((s) => s.stage === 'settlement');
  assert.ok(settle, 'a settlement shows with the lens'); assert.match(settle.why, /for the iwi to decide/); assert.match(settle.buyer, /if it chooses to build/);
  const off = rankSignals(all, lens({ sectors: 'education,civic,health,housing' }), NOW);
  assert.ok(!off.signals.some((s) => s.stage === 'settlement')); assert.ok(off.dropped.some((d) => /Treaty settlement/.test(d.why)));
});

// ---- reading across signals -------------------------------------------------------------------------------------------------------
test('signals about the same place or street are linked, and a big city alone does not link unrelated releases', () => {
  const r = rankSignals(records(), lens({ sectors: 'education,health,housing,civic' }), NOW);
  const get = (t) => r.signals.find((s) => s.title.startsWith(t));
  const school = get('Drury gets land'), hospital = get('Land secured for South Auckland hospital');
  assert.ok(school.links.some((l) => l.id === hospital.id && l.why === 'same place: Drury'), 'school land and hospital land in Drury');
  assert.ok(hospital.links.some((l) => l.id === school.id), 'links go both ways');
  const kumeu = get('Funding approved for Kumeū'), notice = get('Notice of Intention to Take Land for Education Purposes—Kumeū');
  assert.ok(kumeu.links.some((l) => l.id === notice.id), 'a funding release and a Gazette notice for the same school');
  const ed = get('Land Acquired for Education Purposes—Freeland'), house = get('Land Set Apart for State Housing Purposes—Freeland');
  assert.ok(ed.links.some((l) => l.id === house.id && l.why === 'same street: Freeland Avenue'));
  assert.ok(school.reasons.some((x) => /linked to 1 other signal|linked to \d other signals/.test(x)));
  const city = (id, title, sector) => ({ id, title, sourceId: 'beehive', sectors: [sector], places: ['Christchurch'] });
  const two = linkSignals([city('a', 'New library in Christchurch', 'civic'), city('b', 'Hospital wing in Christchurch', 'health')]);
  assert.equal(two[0].links.length, 0, 'two unrelated releases about one big city are not linked');
});

// ---- the feed --------------------------------------------------------------------------------------------------------------------
test('the signals feed: nothing is fetched until the practice says what to look for', async () => {
  await withFetch([], async (calls) => {
    const out = await fetchSignals({ hunt: { regions: 'Auckland' } });
    assert.equal(out.values.needsLens, true); assert.equal(out.value, 0); assert.equal(calls.length, 0);
    assert.ok(out.values.notWired.length >= 8);
  });
});

test('Beehive reads only the portfolios the lens needs, once an hour, with an honest user agent', async () => {
  assert.deepEqual(feedsFor(lens({ sectors: 'health' })).map((f) => f.id), ['health', 'regional']);
  assert.equal(feedsFor(lens({ keywords: 'school' })).length, BEEHIVE_FEEDS.length, 'keywords read every portfolio');
  assert.ok(feedsFor(lens({ sectors: 'education', cultural: '1' })).some((f) => f.id === 'maori'));
  await withFetch(routes(), async (calls) => {
    const out = await fetchSignals({ hunt: { sectors: 'education', regions: 'Auckland' } });
    const n = calls.length;
    assert.ok(n >= 2 && n <= BEEHIVE_FEEDS.length, `${n} calls`);
    assert.ok(calls.every((c) => c.init.headers['user-agent'] === UA));
    assert.ok(calls.every((c) => /^\/taxonomy\/term\/\d+\/feed$/.test(c.url.pathname)));
    await fetchSignals({ hunt: { sectors: 'education', regions: 'Auckland' } });
    assert.equal(calls.length, n, 'a warm instance does not ask again within the hour');
    assert.ok(out.value >= 3);
    const bee = out.values.sources.find((s) => s.id === 'beehive');
    assert.equal(bee.ok, true); assert.ok(bee.found >= 3);
    const gz = out.values.sources.find((s) => s.id === 'gazette');
    assert.equal(gz.ok, false); assert.equal(gz.needsKey, true); assert.match(gz.error, /DigitalNZ API key/);
    assert.ok(!calls.some((c) => c.url.host === 'api.digitalnz.org'), 'without a key DigitalNZ is never called');
    assert.notEqual(out.truth, 'Partial', 'a source switched off for want of a key does not make the answer partial');
    assert.match(out.licence.attribution, /beehive\.govt\.nz/);
  });
});

test('with a DigitalNZ key, the Gazette is read: key in the header only, never returned', async () => {
  const env = { DIGITALNZ_API_KEY: 'test-key-123' };
  await withFetch(routes(), async (calls) => {
    const out = await fetchSignals({ hunt: { sectors: 'education,housing,civic' }, env });
    const dnz = calls.filter((c) => c.url.host === 'api.digitalnz.org');
    assert.equal(dnz.length, GAZETTE_QUERIES.length);
    for (const c of dnz) { assert.equal(c.init.headers['Authentication-Token'], 'test-key-123'); assert.ok(!c.href.includes('test-key-123')); assert.equal(c.url.searchParams.get('fields'), DNZ_FIELDS); }
    const gz = out.values.sources.find((s) => s.id === 'gazette');
    assert.equal(gz.ok, true); assert.ok(gz.found >= 4);
    assert.ok(out.values.signals.some((s) => s.sourceId === 'gazette' && s.evidence[0].label.startsWith('NZ Gazette notice 2026-ln')));
    assert.ok(!JSON.stringify(out).includes('test-key-123'));
  });
});

test('one source failing leaves the other in, marked partial; every source failing is a plain error', async () => {
  const env = { DIGITALNZ_API_KEY: 'k' };
  await withFetch(routes({ dnz: () => text('nope', 503) }), async () => {
    const out = await fetchSignals({ hunt: { sectors: 'education' }, env });
    assert.equal(out.truth, 'Partial'); assert.ok(out.value >= 1);
    assert.match(out.values.sources.find((s) => s.id === 'gazette').error, /did not answer/);
  });
  clearMemo();
  await withFetch(routes({ beehive: () => text('down', 500), dnz: () => text('down', 500) }), async () => {
    await assert.rejects(fetchSignals({ hunt: { sectors: 'education' }, env }), /No early signals could be read/);
  });
});

test('a bot-protection page from Beehive is reported as blocked, not worked around', async () => {
  const wall = '<html><head><META NAME="ROBOTS" CONTENT="NOINDEX, NOFOLLOW"></head><body><iframe src="/_Incapsula_Resource?SWUDNSAI=31">Request unsuccessful. Incapsula incident ID: 1</iframe></body></html>';
  await withFetch(routes({ beehive: () => text(wall) }), async (calls) => {
    await assert.rejects(fetchSignals({ hunt: { sectors: 'education' } }), /bot-protection page/);
    assert.ok(calls.every((c) => c.init.headers['user-agent'] === UA), 'asked once each, as itself, with no retry under another name');
  });
  clearMemo();
  await withFetch(routes({ beehive: () => text(wall) }), async () => {
    const out = await fetchSignals({ hunt: { sectors: 'education' }, env: { DIGITALNZ_API_KEY: 'k' } });
    const bee = out.values.sources.find((s) => s.id === 'beehive');
    assert.equal(bee.ok, false); assert.equal(bee.blocked, true); assert.match(bee.error, /not worked around/);
    assert.equal(out.truth, 'Partial');
  });
});

test('a feed that does not answer in time is given up on, and the rest of the answer still comes', async () => {
  SIGNAL_LIMITS.ms = 60;
  const hang = (u, init) => new Promise((resolve, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted'))));
  await withFetch(routes({ beehive: (u, term, init) => (term === 6729 ? text(XML.education) : hang(u, init)) }), async () => {
    const t0 = Date.now();
    const out = await fetchSignals({ hunt: { sectors: 'education' } });
    assert.ok(Date.now() - t0 < 2000);
    const bee = out.values.sources.find((s) => s.id === 'beehive');
    assert.equal(bee.ok, true); assert.equal(bee.partial, true); assert.ok(bee.failed.length >= 1);
    assert.equal(out.truth, 'Partial');
  });
});

test('through /api/live/: feeds=signals with the hunt lens; only the DigitalNZ key is passed on from the runtime', async () => {
  await withFetch(routes(), async () => {
    const res = await onRequest({ request: new Request(BASE + '?feeds=signals&sectors=education,civic,kaupapa&cultural=1&regions=Auckland'), env: { DIGITALNZ_API_KEY: 'secret-k', OTHER_SECRET: 'x' } });
    const body = await res.json();
    const f = body.feeds.signals;
    assert.equal(f.id, 'signals'); assert.ok(f.value >= 3, JSON.stringify(f).slice(0, 300));
    assert.ok(f.values.signals.every((s) => s.regions.includes('Auckland') || !s.regions.length));
    assert.ok(f.values.sources.find((s) => s.id === 'gazette').ok);
    assert.ok(!JSON.stringify(body).includes('secret-k'));
    assert.match(res.headers.get('cache-control'), /s-maxage=900/);
  });
  clearMemo();
  await withFetch(routes(), async () => {
    const res = await onRequest({ request: new Request(BASE + '?feeds=signals&sectors=education'), env: {} });
    const f = (await res.json()).feeds.signals;
    assert.equal(f.values.sources.find((s) => s.id === 'gazette').needsKey, true);
  });
});

test('the feed is registered and every source it names carries a licence and a credit line', () => {
  for (const s of Object.values(SIGNAL_SOURCES)) { assert.ok(s.licence.name && s.licence.url.startsWith('https://') && s.licence.attribution.length > 30); assert.equal(typeof s.read, 'function'); }
  for (const n of NOT_WIRED) { assert.ok(['not allowed', 'link only', 'unclear'].includes(n.status)); assert.match(n.url, /^https:\/\//); assert.ok(n.reason.length > 20); }
  const code = ['api/_feeds/signals.js', 'api/_feeds/signals-beehive.js', 'api/_feeds/signals-gazette.js', 'architecture/js/signals-rank.js'].map((f) => fs.readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8')).join('\n');
  assert.ok(!/\bBuffer\b|\brequire\(|from ["']node:|import\.meta\.url|with \{ type: ["']json/.test(code), 'runs on Cloudflare: no Node-only APIs');
  assert.ok(!/resultRecordCount/.test(code));
});
