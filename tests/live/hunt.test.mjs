import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { onRequest } from '../../functions/api/live.js';
import { clearMemo, UA } from '../../api/_feeds/util.js';
import {
  parseGetsRss, parseGetsDate, publishedValue, parseLens, lensIsEmpty, scoreTender, rankTenders, fetchHunt, GETS_FEED, FIT_MIN, SECTORS, REGIONS, SOURCES,
} from '../../api/_feeds/hunt.js';
import { withFetch, host, text } from './helpers.mjs';

// Offline. The sample is a trimmed copy of the real GETS RSS feed (read on 22 Nov 2026) plus three hand-made items in the same
// format (one already closed, one with a link that is not GETS, one with no closing date and a stated budget). Nothing here calls GETS.
const XML = fs.readFileSync(new URL('./fixtures/gets-rss.xml', import.meta.url), 'utf8');
const NOW = new Date('2026-11-22T10:00:00+13:00'); // Sunday 22 November 2026, Auckland
const BASE = 'https://lab.assembl.co.nz/api/live/';
const tenders = parseGetsRss(XML);
const by = (needle) => tenders.find((t) => t.title.includes(needle));
const get = async (q) => { const res = await onRequest({ request: new Request(BASE + q), env: {} }); return { res, body: await res.json() }; };
test.beforeEach(() => clearMemo());

// ---- reading the feed ---------------------------------------------------------------------------------------------------------------
test('the GETS feed is read into tenders with buyer, regions, closing time and link', () => {
  assert.equal(tenders.length, 13, 'the link that is not GETS is dropped');
  const lib = by('Hillcrest Library');
  assert.equal(lib.id, '35471034'); assert.equal(lib.buyer, 'Hamilton City Council'); assert.deepEqual(lib.regions, ['Waikato']);
  assert.equal(lib.url, 'https://www.gets.govt.nz//HamCC/ExternalTenderDetails.htm?id=35471034');
  assert.equal(lib.closes, '2026-12-07T04:00:00.000Z', 'Monday, 7 December 2026 5:00 PM +13:00');
  assert.ok(lib.categories.some((c) => c.startsWith('81101500')));
  assert.deepEqual(by('Matamata').regions, ['Auckland', 'Bay of Plenty', 'Waikato'], 'several regions are all kept');
  assert.match(by('QUEENSTOWN').title, /^DESIGN & BUILD/, '&amp; in a title is decoded');
});

test('a malformed cell in the real feed (an unclosed bold tag) does not lose the closing date', () => {
  assert.equal(parseGetsDate('Monday, 31 December 2029 5:00 PM +13:00'), '2029-12-31T04:00:00.000Z');
  assert.equal(parseGetsDate('Saturday, 30 June 2029 11:30 PM +12:00'), '2029-06-30T11:30:00.000Z');
  assert.equal(parseGetsDate('soon'), null);
  const bad = XML.match(/<item>[\s\S]*?<\/item>/)[0].replace('Close date: &lt;/b&gt;', 'Close date: ').replace('&lt;/b&gt;&lt;/td&gt;&lt;td&gt;', '&lt;/td&gt;&lt;td&gt;');
  assert.ok(parseGetsRss(`<rss><channel>${bad}</channel></rss>`).length <= 1);
});

test('an item with no closing date and a budget it states itself', () => {
  const t = by('Community Hall Concept Design');
  assert.equal(t.closes, null); assert.equal(t.value, 2500000); assert.match(t.valueText, /estimated project budget/);
  assert.equal(by('Vanuatu').value, 16300000, 'a real notice that states an estimated contract value');
  assert.equal(by('Hillcrest').value, null, 'no value is guessed when a notice states none');
});

test('a value is taken only from the notice\'s own words, never an annual or unrelated figure', () => {
  assert.equal(publishedValue('The annual budget currently stands at $19m per annum, with a 9-year term')?.value, undefined);
  assert.equal(publishedValue('Total contract value is $850,000 over two years.')?.value, 850000);
  assert.equal(publishedValue('Estimated contract value: $1.2 million').value, 1200000);
  assert.equal(publishedValue('Fund of $27.75 million to be administered by the Authority'), null);
  assert.equal(publishedValue('estimated budget $300k per year'), null);
});

test('feed text is data: an entity declaration gives nothing, and markup in a title is not kept', () => {
  assert.deepEqual(parseGetsRss('<!DOCTYPE x [<!ENTITY a "b">]><rss><channel><item><title>x</title><link>https://www.gets.govt.nz/A/ExternalTenderDetails.htm?id=1</link></item></channel></rss>'), []);
  const t = parseGetsRss('<rss><channel><item><title>&lt;img src=x onerror=alert(1)&gt;Hall &amp;amp; Library</title><link>https://www.gets.govt.nz/A/ExternalTenderDetails.htm?id=1</link><description></description></item></channel></rss>');
  assert.equal(t.length, 1); assert.ok(!/[<>]/.test(t[0].title), t[0].title);
});

// ---- the lens -----------------------------------------------------------------------------------------------------------------------
test('the lens keeps only known regions and sectors, bounded lists and numbers', () => {
  const l = parseLens({ keywords: ' library , School,library,' + 'x'.repeat(80) + ',' + Array.from({ length: 40 }, (_, i) => `k${i}`).join(','), regions: 'auckland, Hawke\'s Bay, Narnia', sectors: 'Education,health,spaceport', min: '2,000,000', max: '50000', sources: 'gets, nothing' });
  assert.equal(l.keywords.length, 20); assert.deepEqual(l.keywords.slice(0, 2), ['library', 'School']); assert.ok(l.keywords.every((k) => k.length <= 40));
  assert.deepEqual(l.regions, ['Auckland', "Hawke's Bay"]); assert.deepEqual(l.sectors, ['education', 'health']);
  assert.equal(l.min, 50000); assert.equal(l.max, 2000000, 'a swapped range is put right');
  assert.ok(REGIONS.includes('Auckland') && Object.keys(SECTORS).includes('education'));
  assert.equal(parseLens({ min: 'lots' }).min, null);
  assert.ok(lensIsEmpty(parseLens({ regions: 'Auckland', min: '1' })), 'regions and a range alone are not something to look for');
  assert.ok(lensIsEmpty(parseLens({})));
});

// ---- scoring ------------------------------------------------------------------------------------------------------------------------
test('a design-services notice in the practice\'s region and sector scores high, with reasons in words', () => {
  const s = scoreTender(by('Hillcrest'), parseLens({ keywords: 'library', regions: 'Waikato', sectors: 'civic' }), NOW);
  assert.ok(s.fit >= 70, `fit ${s.fit}`); assert.equal(s.id, 'gets:35471034'); assert.equal(s.region, 'Waikato'); assert.equal(s.daysLeft, 15); assert.equal(s.closesDay, '2026-12-07');
  assert.equal(s.value, null); assert.equal(s.source, 'gets'); assert.equal(s.published, '2026-11-11');
  const r = s.reasons.join('; ');
  assert.match(r, /matches “library”/); assert.match(r, /in Waikato/); assert.match(r, /asks for design or advice/); assert.match(r, /closes in 15 days/);
  assert.deepEqual(s.matched, { keywords: ['library'], sectors: ['civic'] });
});

test('scoring is deterministic: the same notice, lens and day give the same answer', () => {
  const lens = parseLens({ keywords: 'design,hall', regions: 'Auckland', sectors: 'civic' });
  assert.deepEqual(rankTenders(tenders, lens, NOW), rankTenders([...tenders].reverse(), lens, NOW));
});

test('closed notices, other regions and things the practice did not ask for are left out', () => {
  const lens = parseLens({ keywords: 'pavilion,library', regions: 'Auckland' });
  assert.equal(scoreTender(by('Closed last week'), lens, NOW), null, 'closed on 13 November');
  assert.equal(scoreTender(by('Hillcrest'), lens, NOW), null, 'Waikato is not Auckland');
  assert.equal(scoreTender(by('Whanganui'), parseLens({ keywords: 'library' }), NOW), null, 'matches nothing it asked for');
  assert.equal(scoreTender(by('Hillcrest'), parseLens({ keywords: 'library' }), new Date('2026-12-08T09:00:00+13:00')), null, 'closed this morning');
});

test('software and equipment notices are left out even when a keyword is in their text', () => {
  const lens = parseLens({ keywords: 'architecture,architectural,design' });
  assert.equal(scoreTender(by('Amotai'), lens, NOW), null, 'its overview says "architectural patterns"');
  assert.equal(scoreTender(by('Biometric'), parseLens({ keywords: 'architecture' }), NOW), null);
});

test('building works rank below design work, and design and build is works', () => {
  const lens = parseLens({ keywords: 'pool,events centre,design' });
  const design = scoreTender(by('Lower Helwick'), parseLens({ keywords: 'design' }), NOW), works = scoreTender(by('Pahiatua Pool'), lens, NOW);
  assert.ok(design.fit > works.fit + 20, `${design.fit} vs ${works.fit}`);
  assert.match(works.reasons.join('; '), /building work or supply/);
  assert.equal(rankTenders([by('Pahiatua Pool')], lens, NOW).length, 0, 'under the fit minimum, so it is not shown');
  assert.equal(FIT_MIN, 45);
});

test('a notice that lists the whole country is national, and "New Zealand" counts for any region', () => {
  const t = { ...by('Hillcrest'), regions: ['New Zealand'] };
  const s = scoreTender(t, parseLens({ keywords: 'library', regions: 'Otago' }), NOW);
  assert.match(s.reasons.join('; '), /nationwide/); assert.equal(s.region, 'New Zealand');
  const all = { ...by('Hillcrest'), regions: REGIONS };
  assert.equal(scoreTender(all, parseLens({ keywords: 'library', regions: 'Otago' }), NOW).region, 'New Zealand');
  assert.equal(scoreTender({ ...by('Hillcrest'), regions: ['International'] }, parseLens({ keywords: 'library', regions: 'Otago' }), NOW), null);
});

test('a stated value is compared with the practice\'s range, and an unstated one is never invented', () => {
  const t = by('Community Hall Concept Design');
  const inside = scoreTender(t, parseLens({ keywords: 'hall', min: '1000000', max: '5000000' }), NOW), under = scoreTender(t, parseLens({ keywords: 'hall', min: '5000000' }), NOW);
  assert.match(inside.reasons.join('; '), /fits your usual range/); assert.match(under.reasons.join('; '), /under your usual range/);
  assert.ok(inside.fit > under.fit + 20);
  assert.equal(inside.closes, null); assert.match(inside.reasons.join('; '), /no closing date/);
});

test('the soonest to close breaks a tie, and a tight deadline is said plainly', () => {
  const a = { ...by('Hillcrest'), id: 'a', title: 'Library Design Services A', closes: '2026-11-24T04:00:00.000Z' }, b = { ...a, id: 'b', title: 'Library Design Services B', closes: '2026-12-20T04:00:00.000Z' };
  const lens = parseLens({ keywords: 'library' });
  assert.match(scoreTender(a, lens, NOW).reasons.join('; '), /closes in 2 days: tight/);
  assert.equal(rankTenders([b, a], lens, NOW).length, 2);
});

// ---- the feed: through the same function Cloudflare runs --------------------------------------------------------------------------------
const q = (o) => `?feeds=hunt&${new URLSearchParams(o)}`;
test('feeds=hunt reads only the published RSS feed, once, and answers with signals and the credit', async () => {
  await withFetch([[host('www.gets.govt.nz'), () => text(XML)]], async (calls) => {
    const { res, body } = await get(q({ keywords: 'library,design', regions: 'Waikato,Auckland,Taranaki', sectors: 'civic' }));
    assert.equal(res.status, 200);
    const h = body.feeds.hunt;
    assert.equal(h.id, 'hunt'); assert.equal(h.truth, 'Live'); assert.equal(h.status, 'live'); assert.equal(h.unit, 'signals'); assert.equal(h.value, h.values.signals.length);
    assert.ok(h.values.signals.length >= 2); assert.equal(h.values.considered, 13); assert.equal(h.values.needsLens, false);
    assert.equal(h.values.signals[0].title.includes('Library'), true, 'the best fit first');
    for (const s of h.values.signals) { assert.ok(s.fit >= FIT_MIN && s.fit <= 100); assert.ok(s.reasons.length); assert.match(s.url, /^https:\/\/www\.gets\.govt\.nz\//); assert.ok(s.title && s.buyer && s.published); }
    assert.deepEqual(h.values.sources.map((x) => [x.id, x.ok, x.read]), [['gets', true, 13]]);
    assert.match(h.licence.attribution, /MBIE/); assert.match(h.licence.attribution, /Crown copyright/); assert.equal(h.source.feed, GETS_FEED);
    assert.match(h.note, /Nothing has been contacted/);
    assert.equal(calls.length, 1); assert.equal(calls[0].href, GETS_FEED, 'only the RSS feed: never a page, a detail page or a search');
    assert.equal(calls[0].init.headers['user-agent'], UA, 'it says who is asking');
    assert.match(res.headers.get('cache-control'), /s-maxage=900/, 'a short cache');
    // a second ask with another lens inside the hour does not go back to GETS
    await get(q({ keywords: 'hall' }));
    assert.equal(calls.length, 1);
  });
});

test('with nothing to look for it reads nothing and says "set what to look for"', async () => {
  await withFetch([], async (calls) => {
    for (const qs of ['?feeds=hunt', q({ regions: 'Auckland', min: '1000' })]) {
      const { body } = await get(qs);
      const h = body.feeds.hunt;
      assert.equal(h.value, 0); assert.equal(h.values.needsLens, true); assert.deepEqual(h.values.signals, []); assert.match(h.note, /says what to look for/);
    }
    assert.equal(calls.length, 0, 'no source is read until the practice has said what it wants');
  });
});

test('when GETS is down the answer says so in plain words and is not cached', async () => {
  await withFetch([[host('www.gets.govt.nz'), () => text('Service Unavailable', 503)]], async () => {
    const { res, body } = await get(q({ keywords: 'library' }));
    const h = body.feeds.hunt;
    assert.match(h.error, /GETS did not answer just now/); assert.match(h.error, /Try again in a few minutes/); assert.ok(!/HTTP|503|undefined/.test(h.error), h.error);
    assert.equal(res.headers.get('cache-control'), 'no-store');
  });
});

test('a list with no tenders in it is an error, not "nothing found"', async () => {
  await withFetch([[host('www.gets.govt.nz'), () => text('<rss><channel><title>GETS</title></channel></rss>')]], async () => {
    const { body } = await get(q({ keywords: 'library' }));
    assert.match(body.feeds.hunt.error, /did not answer/);
  });
});

test('one source down leaves the others\' findings in, and says which one failed', async () => {
  const ok = { id: 'ok', name: 'Sample source', short: 'Sample', url: 'https://example.test/', read: async () => ({ tenders, fetchedAt: NOW.toISOString(), stale: false }) };
  const bad = { id: 'bad', name: 'Other source', short: 'Other', url: 'https://example.test/other', read: async () => { throw new Error('HTTP 500 from example.test'); } };
  const h = await fetchHunt({ keywords: 'library' }, { ok, bad });
  assert.equal(h.truth, 'Partial'); assert.ok(h.values.signals.length >= 1);
  assert.deepEqual(h.values.sources.map((s) => [s.id, s.ok]), [['ok', true], ['bad', false]]);
  assert.match(h.values.sources[1].error, /Other did not answer just now/); assert.ok(!/HTTP 500/.test(h.values.sources[1].error), 'no raw error text');
  await assert.rejects(fetchHunt({ keywords: 'library' }, { bad }), /Other did not answer just now/);
  await assert.rejects(fetchHunt({ keywords: 'library', sources: 'gets' }, { ok }), /No source is switched on/);
});

test('the sources a practice switched off are not read', async () => {
  const on = { id: 'a', name: 'A', short: 'A', url: 'u', read: async () => ({ tenders: [], fetchedAt: NOW.toISOString() }) }, off = { id: 'b', name: 'B', short: 'B', url: 'u', read: async () => { throw new Error('should not be read'); } };
  const h = await fetchHunt({ keywords: 'library', sources: 'a' }, { a: on, b: off });
  assert.deepEqual(h.values.sources.map((s) => s.id), ['a']);
});

test('the source list names GETS with its feed, terms and cadence', () => {
  assert.deepEqual(Object.keys(SOURCES), ['gets']);
  assert.equal(SOURCES.gets.feed, 'https://www.gets.govt.nz/ExternalRSSFeed.htm'); assert.match(SOURCES.gets.licence.url, /GetsTermsAndConditions/); assert.equal(SOURCES.gets.cadence, 'hourly');
});

// ---- notices read from the radar's tables (arch.hunt_signals rows) go through the same scorer ---------------------------------------------
import { tenderFromKb, rankKbRows as rankKb } from "../../architecture/js/hunt-rank.js";
const KB = { id: "kb-1", title: "Library Design Services", url: "https://www.gets.govt.nz//EN/ExternalTenderDetails.htm?id=99000001", published_at: "2026-11-20T01:00:00Z", inserted_at: "2026-11-20T02:00:00Z",
  snippet: "Concept to developed design for a new library.", buyer: "Hamilton City Council", closes_text: "Monday, 7 December 2026 5:00 PM +13:00", region: "Waikato", categories: "81101500 - Civil engineering 95121700 - Public buildings" };
test("a radar row becomes a tender: id from the link, closing date read, regions matched by name, only GETS links", () => {
  const t = tenderFromKb(KB);
  assert.equal(t.id, "99000001"); assert.equal(t.closes, "2026-12-07T04:00:00.000Z"); assert.deepEqual(t.regions, ["Waikato"]); assert.deepEqual(t.categories, ["81101500", "95121700"]);
  assert.equal(tenderFromKb({ ...KB, url: "https://example.com/x?id=1" }), null); assert.equal(tenderFromKb({ ...KB, title: "" }), null); assert.equal(tenderFromKb(null), null);
  assert.deepEqual(tenderFromKb({ ...KB, region: "Bay of Plenty Hawke's Bay" }).regions, ["Bay of Plenty", "Hawke's Bay"]);
});
test("radar rows are ranked like feed tenders and marked as from the radar; closed, wrong-region and off-topic rows drop out", () => {
  const lens = parseLens({ keywords: "library", regions: "Waikato" }), now = new Date("2026-11-22T00:00:00Z");
  const r = rankKb([KB, { ...KB, id: "2", url: KB.url.replace("99000001", "99000002"), closes_text: "Monday, 1 June 2026 5:00 PM +12:00" }, { ...KB, id: "3", url: KB.url.replace("99000001", "99000003"), region: "Otago" }, { ...KB, id: "4", url: KB.url.replace("99000001", "99000004"), title: "Supply of road salt", snippet: "", categories: "" }], lens, now);
  assert.equal(r.length, 1); assert.equal(r[0].id, "gets:99000001"); assert.equal(r[0].source, "radar"); assert.ok(r[0].fit >= 45 && r[0].reasons.length);
  assert.deepEqual(rankKb(null, lens, now), []);
});
