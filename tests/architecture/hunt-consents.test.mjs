// Found work, "Building consents": the panel under "Rule changes coming": its regions first (from the lens) then New Zealand, the latest month, non-residential value,
// the top three building types, new dwellings, the change on a year earlier in words and arrows, the copy and source line, the needs-a-key and error states, and
// that nothing the feed sends can become markup. Stand-ins only: no browser and no network. The numbers come from the live-feed fixtures through the real shaping.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createStore, memoryBackend, memoryFiles } from '../../architecture/js/store.js';
import { createHunt } from '../../architecture/js/hunt.js';
import { createConsentsLane, money, count, changeWords, orderScopes, cleanScope, COPY, CONSENTS_SETTING, LICENCE_NAME } from '../../architecture/js/hunt-consents.js';
import { SETTING } from '../../architecture/js/hunt-model.js';
import { readTable, shapeAll } from '../../api/_feeds/consents-parse.js';
import { dimIds } from '../../api/_feeds/consents-config.js';

const NOW = new Date(2026, 10, 23, 10, 0, 0);
const raw = (f) => fs.readFileSync(new URL(`../live/fixtures/${f}`, import.meta.url), 'utf8');
const CELLS = [...readTable(raw('consents-nonres.json'), { kind: 'nonres', ids: dimIds(), valueMult: 1000 }).cells, ...readTable(raw('consents-dwellings.json'), { kind: 'dwellings', ids: dimIds(), valueMult: 1000 }).cells];
const SHAPED = shapeAll(CELLS, ['Auckland', 'Waikato', 'Manawatu-Wanganui', 'Canterbury', 'Otago']);
const FEED = (over = {}) => ({ feeds: { consents: { id: 'consents', fetchedAt: NOW.toISOString(), licence: { name: LICENCE_NAME }, values: { period: '2026-09', regions: SHAPED.regions, national: SHAPED.national, ...over } } } });
const json = (b, status = 200) => ({ ok: status < 400, status, json: async () => b });
const stub = (answer = FEED()) => { const calls = []; const f = async (u) => { calls.push(String(u)); return typeof answer === 'function' ? answer(u) : json(answer); }; f.calls = calls; return f; };
const memo = () => { const kv = new Map(); return { kv, readKept: async (id) => kv.get(id) ?? null, writeKept: async (id, v) => { kv.set(id, v); } }; };
const lane = async ({ regions = ['Waikato', 'Auckland'], answer, kept = memo() } = {}) => {
  const fetch = stub(answer), L = createConsentsLane({}, { regions: () => regions, fetch, now: () => NOW, readKept: kept.readKept, writeKept: kept.writeKept, scope: 't' });
  await L.start(); return { L, fetch, kept, html: () => L.html() };
};
const names = (html) => [...html.matchAll(/<h4 id="[^"]*" class="hc-name">([^<]*)</g)].map((m) => m[1]);

test('the panel: the practice\'s regions first, in the order it set them, then New Zealand; one card each, with the month, non-residential value, top three types and new dwellings', async () => {
  const { html: h } = await lane(), html = h();
  assert.deepEqual(names(html), ['Waikato', 'Auckland', 'New Zealand']);
  const akl = html.split('<li class="hc-card').find((c) => c.includes('data-scope="Auckland"'));
  assert.match(akl, /September 2026/); assert.match(akl, /Non-residential consents[^]*\$96 million/); assert.match(akl, /140 buildings/);
  assert.match(akl, /Biggest building types, by value/); assert.deepEqual([...akl.matchAll(/class="hc-tn">([^<]*)</g)].map((m) => m[1]), ['Education', 'Offices', 'Retail and hospitality'], 'three, biggest first');
  assert.match(akl, /\$30 million/); assert.match(akl, /New dwellings[^]*450 dwellings/);
  assert.ok(html.includes('class="hc-card is-national"'));
});
test('the change on a year earlier is in words as well as arrows, and never in colour alone', async () => {
  const html = (await lane()).html(), akl = html.split('<li class="hc-card').find((c) => c.includes('data-scope="Auckland"'));
  assert.match(akl, /<span class="hc-chg is-up"><svg class="hc-arrow"[^>]*aria-hidden="true"[^]*?<span>up 20% on September 2025<\/span>/);
  assert.match(akl, /is-down[^]*<span>down 10% on September 2025<\/span>/); assert.match(akl, /is-same[^]*<span>about the same as September 2025<\/span>/);
  assert.deepEqual(changeWords({ pct: -25, dir: 'down' }, 'September 2025'), { dir: 'down', text: 'down 25% on September 2025' }); assert.equal(changeWords({ pct: 3.14, dir: 'up' }, 'May 2026').text, 'up 3.1% on May 2026');
  assert.equal(changeWords({ pct: 0.4, dir: 'same' }, 'May 2026').text, 'about the same as May 2026'); assert.equal(changeWords({ pct: null, dir: null }, 'May 2026').text, 'no figure for May 2026 to compare');
  assert.equal(changeWords({ pct: null, dir: 'up' }, 'May 2026').text, 'up from none in May 2026'); assert.equal(changeWords(undefined, '').text, 'no figure for a year earlier to compare');
  assert.match(html, /hc-chg is-none[^]*no figure for September 2025 to compare|class="hc-chg is-/);
});
test('plain numbers in NZD', () => {
  assert.equal(money(96000000), '$96 million'); assert.equal(money(1234000000), '$1.2 billion'); assert.equal(money(48213000), '$48.2 million'); assert.equal(money(850000), '$850 thousand'); assert.equal(money(420), '$420'); assert.equal(money(null), 'no figure'); assert.equal(money(NaN), 'no figure');
  assert.equal(count(1, 'dwelling', 'dwellings'), '1 dwelling'); assert.equal(count(1450, 'dwelling', 'dwellings'), '1,450 dwellings'); assert.equal(count(null, 'a', 'b'), 'no figure');
});
test('the copy and the source line are as agreed', async () => {
  const html = (await lane()).html();
  assert.equal(COPY, 'Building consents are permission to build, not a commission. They can show where work is coming.'); assert.ok(html.includes(COPY));
  assert.match(html, /Stats NZ, licensed under <a href="https:\/\/creativecommons\.org\/licenses\/by\/4\.0\/"[^>]*>Creative Commons Attribution 4\.0 International<\/a>/);
  assert.match(html, /New Zealand dollars/); assert.ok(!/Add to pipeline/i.test(html), 'a consent is not work: no add-to-pipeline'); assert.ok(!/\bAI\b/.test(html));
});
test('with no regions in the lens the country shows, with a hint and a way to show every region; with regions the missing ones are named', async () => {
  const { L } = await lane({ regions: [] }), html = L.html();
  assert.deepEqual(names(html), ['New Zealand']); assert.match(html, /Pick regions in “What to look for”/); assert.match(html, /data-consents="all"[^>]*aria-pressed="false">Show every region/);
  await L.click({ target: { closest: (q) => (q === '[data-consents]' ? { dataset: { consents: 'all' } } : null) } });
  assert.deepEqual(names(L.html()), ['Auckland', 'Waikato', 'Manawatu-Wanganui', 'Canterbury', 'Otago', 'New Zealand']);
  assert.match((await lane({ regions: ['Auckland', 'Southland'] })).html(), /No figures came back for Southland\./);
  assert.deepEqual(orderScopes(SHAPED.regions, SHAPED.national, ['Otago', 'Auckland', 'Otago']).scopes.map((s) => s.name), ['Otago', 'Auckland', 'New Zealand']);
});
test('it looks once a day (kept), and "Check again" looks again; the feed is asked for consents only', async () => {
  const kept = memo(), a = await lane({ kept }); assert.equal(a.fetch.calls.length, 1); assert.match(a.fetch.calls[0], /^\/api\/live\/\?feeds=consents$/); assert.ok(kept.kv.has(CONSENTS_SETTING.cache('t')));
  const b = await lane({ kept }); assert.equal(b.fetch.calls.length, 0, 'today\'s copy is used'); assert.deepEqual(names(b.html()), ['Waikato', 'Auckland', 'New Zealand']);
  await b.L.click({ target: { closest: (q) => (q === '[data-consents]' ? { dataset: { consents: 'look' } } : null) } }); assert.equal(b.fetch.calls.length, 1);
});
test('needs a key: the panel says so plainly, shows no figures, and keeps nothing', async () => {
  const kept = memo(), { html } = await lane({ answer: FEED({ needsKey: true, regions: [], national: null }), kept }), h = html();
  assert.match(h, /not switched on yet\. They need a free key from Stats NZ, which an assembl owner adds\. Nothing has been read\./); assert.ok(!h.includes('hc-card')); assert.equal(kept.kv.size, 0);
});
test('errors: the feed down, a bad answer and a slow one each say what happened and offer to try again', async () => {
  assert.match((await lane({ answer: () => json({}, 502) })).html(), /not answering just now \(502\)/);
  assert.match((await lane({ answer: { feeds: {} } })).html(), /did not answer/);
  assert.match((await lane({ answer: { feeds: { consents: { error: 'Stats NZ did not give the building consents tables' } } } })).html(), /did not give the building consents tables/);
  assert.match((await lane({ answer: () => { throw new Error('offline'); } })).html(), /could not be reached/);
  assert.match((await lane({ answer: FEED({ regions: [], national: null }) })).html(), /No building consent figures came back/);
});
test('XSS: nothing the feed sends becomes markup: names, labels, months, the licence and extra fields are escaped, cut or dropped', async () => {
  const evil = '<img src=x onerror=alert(1)>', quote = '"><script>alert(2)</script>';
  const bad = { name: `Auckland${evil}`, month: quote, against: evil, period: '2026-09', nonres: { value: 5e6, valueYoy: { pct: 5, dir: 'up' }, count: 3, countYoy: { pct: 1, dir: 'same' } }, types: [{ key: 'education', label: evil, value: 1e6, count: 1, yoy: { pct: 5, dir: 'javascript:alert(3)' } }], dwellings: { count: 4, yoy: { pct: 2, dir: 'up' } }, html: '<b>x</b>', href: 'javascript:alert(4)' };
  const feed = FEED({ regions: [bad], national: { ...SHAPED.national, name: quote } }); feed.feeds.consents.licence = { name: `${evil} CC`, url: 'javascript:alert(5)' };
  const { html: h, L } = await lane({ regions: [`Auckland${evil}`], answer: feed }), html = h();
  assert.ok(!/<img|<script|onerror=[^&]|javascript:/i.test(html.replace(/&lt;img[^]*?&gt;/g, '')), 'no live tag, handler or script URL');
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;')); assert.ok(html.includes('&lt;script&gt;')); assert.ok(!html.includes('<b>x</b>'));
  assert.match(html, /hc-chg is-none/, 'an unknown direction is shown as none'); assert.ok(!html.includes('javascript'));
  assert.equal(L.state.regions[0].types[0].yoy.dir, null);
  assert.equal(cleanScope({ name: '' }), null); assert.equal(cleanScope('x'), null); assert.equal(cleanScope({ name: 'x'.repeat(500) }).name.length, 60);
  assert.ok(!/href="javascript/.test(html)); assert.match(html, /href="https:\/\/creativecommons\.org\/licenses\/by\/4\.0\/"/, 'the licence link is ours, never the feed\'s');
});
test('Found work mounts it in its own block, below "Rule changes coming", from its own module and stylesheet', async () => {
  const store = createStore(memoryBackend(), { files: memoryFiles() });
  await store.save('setting', { id: SETTING.hunt, value: { keywords: ['library'], regions: ['Waikato', 'Auckland'], sectors: [], min: null, max: null, sources: { radar: false, gets: false }, cultural: false } });
  const fetch = stub((u) => json(String(u).includes('feeds=consents') ? FEED() : { feeds: { rules: { fetchedAt: NOW.toISOString(), values: { rules: [], sources: [{ id: 'legislation', name: 'NZ Legislation', ok: true }] } } } }));
  const h = createHunt({ store, me: 'Mere', practice: null, account: null }, { readOnly: false, redraw: () => {}, fetch, now: () => NOW });
  await h.start(); await new Promise((r) => setTimeout(r, 30));
  const html = h.html();
  assert.ok(html.includes('data-consents-lane') && html.includes('Building consents')); assert.ok(html.indexOf('data-consents-lane') > html.indexOf('data-rules-lane'), 'below Rule changes coming');
  assert.equal((html.match(/data-consents-lane/g) ?? []).length, 1); assert.ok(h.consents && typeof h.consents.html === 'function');
  assert.ok(fetch.calls.some((c) => /feeds=consents$/.test(c)));
  assert.ok(fs.existsSync(new URL('../../architecture/hunt-consents.css', import.meta.url)) && fs.existsSync(new URL('../../architecture/js/hunt-consents.js', import.meta.url)));
  const src = fs.readFileSync(new URL('../../architecture/js/hunt.js', import.meta.url), 'utf8');
  assert.equal(src.split('\n').filter((l) => /consents/i.test(l)).length <= 12, true, 'hunt.js only mounts it');
  const css = fs.readFileSync(new URL('../../architecture/hunt-consents.css', import.meta.url), 'utf8'); assert.ok(!/#[0-9a-f]{3,8}\b/i.test(css.replace(/var\([^)]*\)/g, '')), 'colours come from the page\'s own properties, so both looks work');
});
