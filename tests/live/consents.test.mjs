// Building consents: the Stats NZ Aotearoa Data Explorer reader, the shaping and the feed. Offline: the fixtures are written for these tests in the SDMX-JSON
// shape (invented numbers; the real catalogue cannot be read without a key). There is no real key here: the tests use a made-up one and prove it only ever
// travels in the Ocp-Apim-Subscription-Key header.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { onRequest } from '../../functions/api/live.js';
import { handleLive } from '../../api/_feeds/handle.js';
import { clearMemo } from '../../api/_feeds/util.js';
import { runFeeds, FEEDS } from '../../api/_feeds/index.js';
import { fetchConsents, dataUrl, catalogueUrl } from '../../api/_feeds/consents.js';
import { ADE_BASE, KEY_HEADER, LIMITS, flows, dimIds, valueMult, FLOW_DEFAULTS } from '../../api/_feeds/consents-config.js';
import { readTable, shapeScope, shapeAll, change, periodOf, monthLabel, yearEarlier, parseDataflows, consentFlows, tidy } from '../../api/_feeds/consents-parse.js';
import { withFetch, json, text } from './helpers.mjs';

const raw = (f) => fs.readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf8');
const NONRES = raw('consents-nonres.json'), DWELL = raw('consents-dwellings.json'), FLOWS_JSON = raw('consents-dataflows.json'), FLOWS_XML = raw('consents-dataflows.xml');
const KEY = 'test-key-not-a-real-key-0000';
const ENV = { STATSNZ_API_KEY: KEY };
const BASE = 'https://lab.assembl.co.nz/api/live/';
test.beforeEach(() => clearMemo());

const ade = (u) => u.host === 'api.data.stats.govt.nz';
/** the two data tables and the catalogue answer from the fixtures; over.* replaces one */
const routes = (over = {}) => [[ade, (u, init) => {
  if (over.any) return over.any(u, init);
  if (u.pathname.startsWith('/rest/data/')) return u.pathname.includes(FLOW(over, 'dwellings')) ? (over.dwellings ?? text(DWELL)) : (over.nonres ?? text(NONRES));
  if (u.pathname.startsWith('/rest/dataflow/')) return over.catalogue ?? text(FLOWS_JSON);
  return new Response('?', { status: 404 });
}]];
const FLOW = (o, k) => o.ids?.[k] ?? FLOW_DEFAULTS[k].id;
const read = (kind, body) => readTable(body, { kind, ids: dimIds(), valueMult: 1000 });
const cellsOf = () => [...read('nonres', NONRES).cells, ...read('dwellings', DWELL).cells];

// ---- the parser: bounded, unknown codes dropped ------------------------------------------------------------------------------------------
test('the table is read into classified cells; unknown regions, building types and measures are dropped and counted, never passed on', () => {
  const a = read('nonres', NONRES), b = read('dwellings', DWELL);
  assert.deepEqual(a.roles, { time: 'TIME_PERIOD', region: 'REGION', type: 'BUILDING_TYPE', measure: 'MEASURE' });
  assert.ok(a.cells.length > 1000);
  assert.ok(!a.cells.some((c) => /Antarctica|Mystery|<|>/.test(JSON.stringify(c))), 'nothing from a code that is not configured gets through');
  assert.equal(a.dropped.region, 360, 'the region that is not a New Zealand region'); assert.equal(a.dropped.type, 180, 'the building type that matches none of the six'); assert.equal(a.dropped.measure, 719, 'floor area is not a measure the feed reads');
  assert.equal(b.dropped.type, 90, 'alterations are not new dwellings');
  assert.deepEqual([...new Set(a.cells.map((c) => c.measure))].sort(), ['count', 'value']);
  assert.deepEqual([...new Set(a.cells.map((c) => c.type))].sort(), ['community', 'education', 'health', 'industrial', 'offices', 'retail', 'total']);
  assert.deepEqual([...new Set(a.cells.map((c) => c.scope))].sort(), ['Auckland', 'Canterbury', 'Manawatu-Wanganui', 'Otago', 'Waikato', 'national']);
});
test('both SDMX-JSON shapes are read: the one with a "data" wrapper and "structures" (2.0), and the plain one with "structure" (1.0); a flat data set works too', () => {
  assert.ok(JSON.parse(NONRES).data.structures && !JSON.parse(NONRES).structure); assert.ok(JSON.parse(DWELL).structure && !JSON.parse(DWELL).data);
  assert.ok(read('dwellings', DWELL).cells.length > 0);
  const flat = JSON.stringify({ data: { dataSets: [{ observations: { '0:0:0': [50, 0], '0:0:1': [60, 0] } }], structure: { dimensions: { series: [], observation: [
    { id: 'REGION', values: [{ id: 'AKL', name: 'Auckland' }] }, { id: 'MEASURE', values: [{ id: 'NUMBER', name: 'Number of dwellings' }] }, { id: 'TIME_PERIOD', values: [{ id: '2026-08' }, { id: '2026-09' }] }] } } } });
  const f = readTable(flat, { kind: 'dwellings', ids: dimIds(), valueMult: 1 });
  assert.deepEqual(f.cells.map((c) => [c.scope, c.period, c.value]), [['Auckland', '2026-08', 50], ['Auckland', '2026-09', 60]]);
});
test('the reader is bounded: at most LIMITS.maxObs observations are looked at, text is cut, and bad numbers, dates and shapes are dropped', () => {
  const was = LIMITS.maxObs; LIMITS.maxObs = 40; // the real limit is 200,000: the same rule with a smaller number, so the test stays small
  try {
    const n = 100, obs = {}; for (let i = 0; i < n; i++) obs[i] = [1, 0];
    const big = JSON.stringify({ data: { dataSets: [{ series: { '0:0:0': { observations: obs } } }], structure: { dimensions: { series: [{ id: 'REGION', values: [{ id: 'A', name: 'Auckland' }] }, { id: 'MEASURE', values: [{ id: 'NUM', name: 'Number of dwellings' }] }, { id: 'BUILDING_TYPE', values: [{ id: 'T', name: 'Total' }] }],
      observation: [{ id: 'TIME_PERIOD', values: Array.from({ length: n }, () => ({ id: '2026-09' })) }] } } } });
    const t = readTable(big, { kind: 'dwellings', ids: dimIds(), valueMult: 1 });
    assert.equal(t.observations, 40); assert.equal(t.cells.length, 40);
  } finally { LIMITS.maxObs = was; }
  assert.throws(() => readTable(' '.repeat(LIMITS.maxChars + 10) + '{}', { kind: 'nonres', ids: dimIds() }), /not SDMX-JSON/, 'more text than the reader will take is refused');
  assert.throws(() => readTable('<html>not json</html>', { kind: 'nonres', ids: dimIds() }), /not SDMX-JSON/);
  assert.throws(() => readTable('{"data":{"dataSets":[]}}', { kind: 'nonres', ids: dimIds() }), /no data/);
  const bad = JSON.stringify({ data: { dataSets: [{ series: { '0:0:0': { observations: { 0: ['abc', 0], 1: [-5, 0], 2: [1e15, 0], 3: [7, 0] }, attributes: [] } } }], structure: { dimensions: { series: [{ id: 'REGION', values: [{ id: 'A', name: 'Auckland' }] }, { id: 'MEASURE', values: [{ id: 'NUM', name: 'Number of dwellings' }] }, { id: 'BUILDING_TYPE', values: [{ id: 'T', name: 'Total' }] }],
    observation: [{ id: 'TIME_PERIOD', values: [{ id: '2026-01' }, { id: '2026-02' }, { id: '2026-03' }, { id: 'last year' }] }] } } } });
  const d = readTable(bad, { kind: 'dwellings', ids: dimIds(), valueMult: 1 });
  assert.equal(d.cells.length, 0); assert.equal(d.dropped.value, 2, 'negative and absurd values'); assert.equal(d.dropped.period, 1, 'a period that is not a month');
  assert.equal(tidy('<b>x</b>\u0000\n  y'.repeat(30), 20).length <= 20, true); assert.ok(!/[<>]/.test(tidy('<img onerror=1>')));
  assert.equal(periodOf('2026-09'), '2026-09'); assert.equal(periodOf('2026-M09'), '2026-09'); assert.equal(periodOf('2026-09-30'), '2026-09'); assert.equal(periodOf('2026-13'), null); assert.equal(periodOf('Q3 2026'), null);
  assert.equal(monthLabel('2026-09'), 'September 2026'); assert.equal(yearEarlier('2026-09'), '2025-09');
});
test('value is in thousands of dollars: an UNIT_MULT in the answer is used, and otherwise the configured multiplier', () => {
  const noAttr = JSON.parse(NONRES); noAttr.data.structures[0].attributes.series = [];
  const a = shapeScope('Auckland', readTable(JSON.stringify(noAttr), { kind: 'nonres', ids: dimIds(), valueMult: 1000 }).cells);
  assert.equal(a.nonres.value, 96000000, 'the configured multiplier, no attribute in the answer');
  assert.equal(shapeScope('Auckland', cellsOf()).nonres.value, 96000000, 'UNIT_MULT 3 on the value series');
  const ones = JSON.parse(NONRES); ones.data.structures[0].attributes.series[0].values[1].id = '0';
  assert.equal(shapeScope('Auckland', readTable(JSON.stringify(ones), { kind: 'nonres', ids: dimIds(), valueMult: 1000 }).cells).nonres.value, 96000, 'the answer says units, so units');
  assert.equal(valueMult({ CONSENTS_VALUE_MULT: '1000000' }), 1000000); assert.equal(valueMult({ CONSENTS_VALUE_MULT: '7' }), 1000);
});

// ---- year-on-year maths and the shape -----------------------------------------------------------------------------------------------------
test('change on a year earlier: percentage to one decimal, up, down, about the same (under 1%), and nothing to compare', () => {
  assert.deepEqual(change(120, 100), { pct: 20, dir: 'up' }); assert.deepEqual(change(75, 100), { pct: -25, dir: 'down' }); assert.deepEqual(change(99.5, 100), { pct: -0.5, dir: 'same' });
  assert.deepEqual(change(100, 100), { pct: 0, dir: 'same' }); assert.deepEqual(change(10, 3), { pct: 233.3, dir: 'up' });
  assert.deepEqual(change(5, 0), { pct: null, dir: 'up' }); assert.deepEqual(change(0, 0), { pct: 0, dir: 'same' }); assert.deepEqual(change(null, 5), { pct: null, dir: null }); assert.deepEqual(change(5, null), { pct: null, dir: null });
});
test('one region: the latest month, non-residential value and count, the top three building types by value, new dwellings, each against the same month a year earlier', () => {
  const s = shapeScope('Auckland', cellsOf());
  assert.equal(s.period, '2026-09'); assert.equal(s.month, 'September 2026'); assert.equal(s.against, 'September 2025'); assert.equal(s.nonres.basis, 'total');
  assert.deepEqual(s.nonres.valueYoy, { pct: 20, dir: 'up' }); assert.equal(s.nonres.count, 140); assert.deepEqual(s.nonres.countYoy, { pct: 0, dir: 'same' });
  assert.deepEqual(s.types.map((t) => [t.key, t.value, t.yoy.dir]), [['education', 30000000, 'same'], ['offices', 21000000, 'up'], ['retail', 15500000, 'up']], 'three, biggest first');
  assert.deepEqual(s.dwellings, { count: 450, yoy: { pct: -10, dir: 'down' } });
  const all = shapeScope('Auckland', cellsOf(), undefined, 6); assert.equal(all.types.length, 6);
  assert.deepEqual(all.types.find((t) => t.key === 'health').yoy, { pct: -25, dir: 'down' });
  assert.deepEqual(shapeScope('Waikato', cellsOf(), undefined, 6).types.find((t) => t.key === 'health').yoy, { pct: null, dir: null }, 'no figure a year earlier: nothing is invented');
  assert.equal(shapeScope('Southland', cellsOf()), null);
});
test('the total is the total series when there is one, and otherwise the six types added up (and it says which)', () => {
  const noTotal = cellsOf().filter((c) => c.type !== 'total'), s = shapeScope('Auckland', noTotal);
  assert.equal(s.nonres.basis, 'types'); assert.equal(s.nonres.value, (30000 + 12000 + 9000 + 21000 + 15500 + 8500) * 1000);
});
test('region ordering: the regions come in the order asked, regions with no figures are left out, and the country is its own entry', () => {
  const s = shapeAll(cellsOf(), ['Waikato', 'Southland', 'Auckland', 'Otago']);
  assert.deepEqual(s.regions.map((r) => r.name), ['Waikato', 'Auckland', 'Otago']); assert.equal(s.national.name, 'New Zealand'); assert.equal(s.national.national, true);
  assert.deepEqual(shapeAll(cellsOf(), []).regions, []);
});
test('what one region costs in bytes: at most 2 KB, and the whole answer for every region stays small', () => {
  const s = shapeAll(cellsOf(), ['Auckland', 'Waikato', 'Canterbury', 'Manawatu-Wanganui', 'Otago']);
  for (const r of [...s.regions, s.national]) assert.ok(JSON.stringify(r).length <= LIMITS.perRegionBytes, `${r.name}: ${JSON.stringify(r).length} bytes`);
});

// ---- needs a key ---------------------------------------------------------------------------------------------------------------------------
test('without the key nothing is fetched: the answer says it needs a key, is Partial, is kept only briefly, and the rest of the request still works', async () => {
  await withFetch(routes(), async (calls) => {
    const f = await fetchConsents({ hunt: { regions: 'Auckland' } });
    assert.equal(calls.length, 0, 'no fetch without a key'); assert.equal(f.status, 'unavailable'); assert.equal(f.reason, 'needs a STATSNZ_API_KEY'); assert.equal(f.truth, 'Partial'); assert.match(f.truthLabel, /needs a key/);
    assert.equal(f.values.needsKey, true); assert.deepEqual(f.values.regions, []); assert.equal(f.values.national, null); assert.match(f.licence.name, /CC BY 4\.0/);
    const d = await fetchConsents({ discover: true }); assert.equal(calls.length, 0, 'discover needs a key too'); assert.equal(d.values.needsKey, true);
    const r = await runFeeds(['consents', 'grocery'], {});
    assert.equal(calls.length, 0); assert.equal(r.feeds.consents.status, 'unavailable'); assert.ok(!r.feeds.grocery.error && r.feeds.grocery.status !== 'unavailable', 'the other feed in the same request is unaffected');
    assert.ok(r.cache && r.cache.sMaxAge <= 300, 'a short cache so the key works as soon as it is added');
  });
});
test('through the Pages function: only the named secrets reach the feeds, and the key is sent only in the header, never in a URL or an answer', async () => {
  let seen = null;
  await withFetch(routes({ any: (u, init) => { seen = { href: u.href, headers: init.headers }; return u.pathname.startsWith('/rest/data/') ? text(u.pathname.includes('001') ? DWELL : NONRES) : text(FLOWS_JSON); } }), async (calls) => {
    const res = await onRequest({ request: new Request(`${BASE}?feeds=consents&regions=Auckland`), env: { STATSNZ_API_KEY: KEY, SOME_OTHER_SECRET: 'other-secret-value' } });
    const body = await res.text();
    assert.equal(res.status, 200); assert.ok(calls.length === 2 && calls.every((c) => c.init.headers[KEY_HEADER] === KEY), 'both calls carry the key in the header');
    assert.ok(calls.every((c) => !c.href.includes(KEY)), 'not in the URL'); assert.ok(!body.includes(KEY) && !body.includes('other-secret-value'), 'not in the answer');
    assert.ok(!JSON.stringify(calls.map((c) => c.init.headers)).includes('other-secret-value'));
    assert.equal(JSON.parse(body).feeds.consents.values.regions[0].name, 'Auckland');
  });
  const src = fs.readFileSync(new URL('../../functions/api/live.js', import.meta.url), 'utf8');
  assert.deepEqual([...src.matchAll(/context\.env\?\.([A-Z_]+)\)/g)].map((m) => m[1]).sort(), ['DIGITALNZ_API_KEY', 'LEGISLATION_API_KEY', 'STATSNZ_API_KEY']);
});

// ---- the feed -------------------------------------------------------------------------------------------------------------------------------
test('the feed: both tables read once, the requested regions in the order asked, then the country, with the licence and credit', async () => {
  await withFetch(routes(), async (calls) => {
    const f = await fetchConsents({ env: ENV, hunt: { regions: 'Waikato,Auckland' } });
    assert.equal(calls.length, 2); const urls = calls.map((c) => c.href).sort();
    assert.match(urls[0], /^https:\/\/api\.data\.stats\.govt\.nz\/rest\/data\/STATSNZ,BLD_BLD_001,latest\/all\?format=jsondata&startPeriod=\d{4}-\d{2}$/); assert.match(urls[1], /BLD_BLD_002/);
    assert.equal(f.id, 'consents'); assert.equal(f.cadence, 'monthly'); assert.equal(f.truth, 'Latest published'); assert.equal(f.asOf, '2026-09'); assert.match(f.truthLabel, /2026-09/);
    assert.deepEqual(f.values.regions.map((r) => r.name), ['Waikato', 'Auckland']); assert.equal(f.values.national.name, 'New Zealand'); assert.deepEqual(f.values.regionsAsked, ['Waikato', 'Auckland']);
    assert.match(f.licence.name, /Creative Commons Attribution 4\.0 International/); assert.match(f.licence.attribution, /^Stats NZ, licensed under Creative Commons Attribution 4\.0 International/);
    assert.deepEqual(f.values.flows.map((x) => [x.kind, x.id, x.ok]), [['nonres', 'BLD_BLD_002', true], ['dwellings', 'BLD_BLD_001', true]]);
    assert.ok(f.truth !== 'Partial'); assert.ok(JSON.stringify(f.values).length < 8000);
    for (const r of f.values.regions) assert.ok(JSON.stringify(r).length <= LIMITS.perRegionBytes);
    assert.ok(!JSON.stringify(f).includes(KEY));
  });
});
test('with no regions in the lens the answer has every region the table has, in the lab\'s own order, then the country; the second ask is kept by the warm instance', async () => {
  await withFetch(routes(), async (calls) => {
    const f = await fetchConsents({ env: ENV }); assert.deepEqual(f.values.regions.map((r) => r.name), ['Auckland', 'Waikato', 'Manawatu-Wanganui', 'Canterbury', 'Otago']);
    await fetchConsents({ env: ENV, hunt: { regions: 'Otago' } }); assert.equal(calls.length, 2, 'no second trip to Stats NZ');
  });
});
test('one table down: the other still answers, the answer is Partial, and nothing is invented for the missing one', async () => {
  await withFetch(routes({ dwellings: new Response('no', { status: 500 }) }), async () => {
    const f = await fetchConsents({ env: ENV, hunt: { regions: 'Auckland' } });
    assert.equal(f.truth, 'Partial'); assert.match(f.truthLabel, /did not answer/); assert.equal(f.values.regions[0].dwellings.count, null); assert.ok(f.values.regions[0].nonres.value > 0);
    assert.deepEqual(f.values.flows.map((x) => x.ok), [true, false]); assert.match(f.values.flows[1].error, /HTTP 500/);
  });
});
test('both tables down (a wrong dataflow id): the feed fails plainly, says where to look, and the key is redacted from any message', async () => {
  await withFetch(routes({ any: () => { throw new Error(`connection to https://x/?k=${KEY} failed`); } }), async () => {
    await assert.rejects(() => fetchConsents({ env: ENV }), (e) => { assert.match(e.message, /discover/); assert.ok(!e.message.includes(KEY)); return true; });
    const r = await runFeeds(['consents'], { env: ENV }); assert.ok(r.feeds.consents.error && !r.feeds.consents.error.includes(KEY)); assert.equal(r.cache, null, 'a failure is never cached');
  });
  await withFetch(routes({ any: () => new Response('missing', { status: 404 }) }), async () => { await assert.rejects(() => fetchConsents({ env: ENV }), /HTTP 404/); });
});
test('an answer that matches none of the expected codes is Partial and says so, not an empty success', async () => {
  const other = JSON.stringify({ data: { dataSets: [{ series: { '0:0': { observations: { 0: [1, 0] } } } }], structure: { dimensions: { series: [{ id: 'REGION', values: [{ id: 'Z', name: 'Atlantis' }] }, { id: 'MEASURE', values: [{ id: 'NUM', name: 'Number' }] }], observation: [{ id: 'TIME_PERIOD', values: [{ id: '2026-09' }] }] } } } });
  await withFetch(routes({ nonres: text(other), dwellings: text(other) }), async () => {
    const f = await fetchConsents({ env: ENV }); assert.equal(f.truth, 'Partial'); assert.match(f.truthLabel, /nothing matched/); assert.equal(f.values.national, null); assert.deepEqual(f.values.regions, []);
  });
});
test('the table ids and dimension names can be corrected: by env where the runtime passes it, and a malformed override is ignored', async () => {
  assert.equal(flows({}).nonres.id, 'BLD_BLD_002');
  assert.equal(flows({ CONSENTS_NONRES_FLOW: 'STATSNZ,BCI_BCI_007,2.0' }).nonres.id, 'BCI_BCI_007'); assert.equal(flows({ CONSENTS_NONRES_FLOW: 'STATSNZ,BCI_BCI_007,2.0' }).nonres.version, '2.0');
  assert.equal(flows({ CONSENTS_NONRES_FLOW: '../../etc/passwd' }).nonres.id, 'BLD_BLD_002'); assert.equal(flows({ CONSENTS_DWELLINGS_FLOW: 'a b,c' }).dwellings.id, 'BLD_BLD_001');
  assert.equal(dimIds({ CONSENTS_DIM_REGION: 'rgn' }).region[0], 'RGN'); assert.deepEqual(dimIds({ CONSENTS_DIM_REGION: 'x;y' }).region, dimIds({}).region);
  await withFetch(routes({ ids: { nonres: 'BCI_BCI_007' } }), async (calls) => {
    await fetchConsents({ env: { ...ENV, CONSENTS_NONRES_FLOW: 'STATSNZ,BCI_BCI_007' } }); assert.ok(calls.some((c) => c.href.includes('STATSNZ,BCI_BCI_007,latest/all')));
  });
  assert.equal(dataUrl({ agency: 'STATSNZ', id: 'X', version: 'latest' }, '2025-07'), `${ADE_BASE}data/STATSNZ,X,latest/all?format=jsondata&startPeriod=2025-07`);
});

// ---- discover mode ----------------------------------------------------------------------------------------------------------------------------
test('discover: only the tables named like building consents (id, name, version, agency), from JSON or XML; markup in a name is made inert', () => {
  for (const body of [FLOWS_JSON, FLOWS_XML]) {
    const all = parseDataflows(body), hit = consentFlows(all);
    assert.equal(all.length, 7); assert.deepEqual(hit.flows.map((f) => f.id), ['BLD_BLD_101', 'BLD_BLD_102', 'BLD_BLD_103', 'BLD_BLD_104']);
    assert.deepEqual(Object.keys(hit.flows[0]).sort(), ['agency', 'id', 'name', 'version']); assert.equal(hit.flows[0].agency, 'STATSNZ'); assert.equal(hit.flows[0].version, '1.0');
    assert.ok(!hit.flows.some((f) => /CPI|Forestry|liquor/i.test(f.name))); assert.ok(!hit.flows.some((f) => /[<>]/.test(f.name)), 'no markup survives'); assert.equal(hit.scanned, 7); assert.equal(hit.matched, 4); assert.equal(hit.capped, false);
  }
  assert.deepEqual(parseDataflows('not a structure message'), []); assert.deepEqual(parseDataflows('{"nope":1}'), []);
});
test('discover through the feed: read-only, capped at 25, kept a day, never carries the key, and falls back to XML when the JSON format is refused', async () => {
  const many = JSON.stringify({ data: { dataflows: Array.from({ length: 60 }, (_, i) => ({ id: `BLD_${i}`, agencyID: 'STATSNZ', version: '1.0', name: `Building consents issued, table ${i} ${'x'.repeat(300)}` })) } });
  await withFetch(routes({ catalogue: text(many) }), async (calls) => {
    const d = await fetchConsents({ env: ENV, discover: true });
    assert.equal(calls.length, 1); assert.equal(calls[0].href, catalogueUrl); assert.equal(calls[0].init.headers[KEY_HEADER], KEY); assert.match(calls[0].init.headers.accept, /sdmx.*json/);
    assert.equal(d.values.discover, true); assert.equal(d.values.dataflows.length, 25); assert.equal(d.values.matched, 60); assert.equal(d.values.capped, true); assert.ok(d.values.dataflows.every((f) => f.name.length <= 120));
    assert.deepEqual(d.values.configured, { nonres: 'STATSNZ,BLD_BLD_002,latest', dwellings: 'STATSNZ,BLD_BLD_001,latest' });
    assert.ok(!JSON.stringify(d).includes(KEY)); assert.ok(JSON.stringify(d).length < 8000, 'capped in size');
    await fetchConsents({ env: ENV, discover: true }); assert.equal(calls.length, 1, 'a day in the warm instance');
  });
  clearMemo();
  await withFetch(routes({ any: (u, init) => (/json/.test(init.headers.accept) ? new Response('no', { status: 406 }) : text(FLOWS_XML)) }), async (calls) => {
    const d = await fetchConsents({ env: ENV, discover: true }); assert.equal(calls.length, 2); assert.equal(d.values.dataflows.length, 4);
  });
  clearMemo();
  await withFetch(routes({ any: () => { throw new Error(`down ${KEY}`); } }), async () => { await assert.rejects(() => fetchConsents({ env: ENV, discover: true }), (e) => /table list/.test(e.message) && !e.message.includes(KEY)); });
});
test('discover and the regions travel through /api/live/ (handleLive), and the feed is on the monthly cadence', async () => {
  assert.equal(FEEDS.consents.cadence, 'monthly');
  await withFetch(routes(), async (calls) => {
    const r = await handleLive(new URLSearchParams('feeds=consents&discover=1'), ENV);
    assert.equal(r.status, 200); assert.equal(r.body.feeds.consents.values.discover, true); assert.equal(calls.length, 1); assert.ok(!JSON.stringify(r.body).includes(KEY));
    const n = await handleLive(new URLSearchParams('feeds=consents&regions=Otago,Auckland'), ENV); assert.deepEqual(n.body.feeds.consents.values.regions.map((x) => x.name), ['Otago', 'Auckland']);
    assert.match(n.headers['Cache-Control'], /s-maxage=43200/);
  });
});

test('the Stats NZ fetch uses a redirect setting Cloudflare Workers accept, and a redirect is refused', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../../api/_feeds/consents.js', import.meta.url), 'utf8');
  assert.ok(!/redirect:\s*"error"/.test(src), 'Workers refuse redirect "error"');
  assert.match(src, /redirect:\s*"manual"/);
  assert.match(src, /if \(!r\.ok\) throw/, 'a 3xx is not ok, so it is refused and the key goes nowhere else');
});

test('discover also finds building tables by their BLD id, and shows sample names when nothing matches', async () => {
  const { consentFlows } = await import('../../api/_feeds/consents-parse.js');
  const got = consentFlows([{ id: 'BLD_BLD_009', name: '' }, { id: 'POP_X', name: 'Population' }]);
  assert.equal(got.matched, 1); assert.equal(got.flows[0].id, 'BLD_BLD_009');
  const none = consentFlows([{ id: 'POP_X', name: 'Population' }]);
  assert.deepEqual(none.sample, ['POP_X: Population']);
});
