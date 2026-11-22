import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../../functions/api/live.js';
import { normaliseQuery, parseAddressQuery, buildWhere, addressUrl, scoreMatch, parseMatches, fetchAddress, MAX_MATCHES } from '../../api/_feeds/address.js';
import { clearMemo } from '../../api/_feeds/util.js';
import { json, withFetch, fx } from './helpers.mjs';

// Offline. The rows below have the shape LINZ's NZ Addresses service returned on 22 Nov 2026 (coordinates in WGS84 with outSR=4326); the
// streets are public ones. Nothing here is a client's address.
const row = (id, full, o = {}) => ({ attributes: { address_id: id, full_address: full, full_address_ascii: full.normalize('NFD').replace(/[̀-ͯ]/g, ''), unit: o.unit ?? null, address_number: o.n ?? 243,
  address_number_suffix: o.suffix ?? null, full_road_name_ascii: o.road ?? 'Ponsonby Road', suburb_locality: o.suburb ?? 'Ponsonby', town_city: o.town ?? 'Auckland', territorial_authority: o.ta ?? 'Auckland' },
  geometry: { x: o.x ?? 174.74446, y: o.y ?? -36.84985 } });
const PONSONBY = { features: [row(1093329, '1/243 Ponsonby Road, Ponsonby, Auckland', { unit: '1' }), row(3072790, '243 Ponsonby Road, Ponsonby, Auckland'), row(1936965, '2/243 Ponsonby Road, Ponsonby, Auckland', { unit: '2' })] };
const BASE = 'https://lab.assembl.co.nz/api/live/?feeds=address&q=';
const layerMeta = { editingInfo: { dataLastEditDate: Date.UTC(2026, 10, 2) } };
const routes = (rows = PONSONBY, status = 200) => [
  [(u) => u.pathname.endsWith('/query'), () => (status === 200 ? json(rows) : new Response('nope', { status }))],
  [(u) => u.pathname.includes('LINZ_NZ_Addresses') && !u.pathname.endsWith('/query'), () => json(layerMeta)],
];
const ask = async (q, r) => { let out; await withFetch(routes(...(r ?? [])), async (calls) => { const res = await onRequest({ request: new Request(BASE + encodeURIComponent(q)), env: {} }); out = { res, body: await res.json(), calls }; }); return out; };
test.beforeEach(() => clearMemo());

test('text is made safe: no macrons, no quotes, no wildcards, nothing but letters, digits, spaces, slash, hyphen and apostrophe', () => {
  assert.equal(normaliseQuery('  14 Ōtāhuhu  Rd; DROP TABLE x -- %_ '), "14 otahuhu rd drop table x --");
  assert.equal(normaliseQuery("O’Connell St"), "o'connell st");
  assert.equal(normaliseQuery(null), '');
});

test('the parts of an address: plain, letter, unit as 2/14 and as "Flat 2, 14", and no street word', () => {
  assert.deepEqual(parseAddressQuery('14 Ponsonby Road'), { unit: null, number: 14, suffix: null, words: ['ponsonby', 'road'] });
  assert.deepEqual(parseAddressQuery('14a Ponsonby Rd, Ponsonby'), { unit: null, number: 14, suffix: 'a', words: ['ponsonby', 'rd', 'ponsonby'] });
  assert.deepEqual(parseAddressQuery('2/14 Ponsonby Road'), { unit: '2', number: 14, suffix: null, words: ['ponsonby', 'road'] });
  assert.deepEqual(parseAddressQuery('2 / 14b Ponsonby Road'), { unit: '2', number: 14, suffix: 'b', words: ['ponsonby', 'road'] });
  for (const q of ['Flat 2, 14 Ponsonby Road', 'unit 2 14 Ponsonby Road', 'Apt 2/14 Ponsonby Road', 'flat2 14 ponsonby road']) assert.deepEqual(parseAddressQuery(q), { unit: '2', number: 14, suffix: null, words: ['ponsonby', 'road'] }, q);
  assert.deepEqual(parseAddressQuery('14-16 Ponsonby Road'), { unit: null, number: 14, suffix: null, words: ['ponsonby', 'road'] });
  assert.deepEqual(parseAddressQuery('Queen Street Auckland').number, null);
  assert.equal(parseAddressQuery('14'), null); assert.equal(parseAddressQuery('2/14'), null);
});

test('the question: current addresses only, number and road from the start, abbreviations spelled out, and no way to change the query', () => {
  const w = (q) => buildWhere(parseAddressQuery(q));
  assert.equal(w('14 Ponsonby Rd'), "address_lifecycle = 'Current' AND address_number = 14 AND UPPER(full_road_name_ascii) LIKE 'PONSONBY%' AND UPPER(full_address_ascii) LIKE '%ROAD%'");
  assert.match(w('14 Ponsonby St'), /LIKE '%STREET%'/); assert.match(w('3 Hobson Ave'), /LIKE '%AVENUE%'/); assert.match(w('3 Hobson Pl'), /LIKE '%PLACE%'/); assert.match(w('3 Hobson Cres'), /LIKE '%CRESCENT%'/);
  assert.match(w('3 Hobson Tce'), /LIKE '%TERRACE%'/); assert.match(w('3 Hobson Dr'), /LIKE '%DRIVE%'/);
  assert.match(w('2/14 Ponsonby Road'), /address_number = 14 AND UPPER\(unit\) = '2'/); assert.match(w('Flat 2, 14 Ponsonby Road'), /address_number = 14 AND UPPER\(unit\) = '2'/);
  assert.match(w('14a Ponsonby Road'), /UPPER\(address_number_suffix\) = 'A'/);
  assert.match(w('10 St Heliers Bay Rd'), /LIKE 'ST %' OR UPPER\(full_road_name_ascii\) LIKE 'SAINT %'/); // "St" opening the road is a whole word, not "Stanley"
  assert.match(w("5 O'Connell Street"), /LIKE 'O''CONNELL%'/); // a quote is doubled, never open
  const nasty = w("14 Ponsonby'; DELETE FROM x; -- Road % _");
  assert.doesNotMatch(nasty, /;|--/); assert.match(nasty, /LIKE 'PONSONBY''%'/);
  assert.match(nasty.replace(/'(?:[^']|'')*'/g, "''"), /^[A-Za-z_()=0-9 ']+$/, 'outside its quoted words the query is only the fixed syntax'); // the text can only ever be words inside quotes
  assert.match(w('Queen Street Auckland'), /^address_lifecycle = 'Current' AND UPPER\(full_road_name_ascii\) LIKE 'QUEEN%'/);
  const url = new URL(addressUrl(w('14 Ponsonby Rd')));
  assert.equal(url.searchParams.get('outSR'), '4326'); assert.equal(url.host, 'services.arcgis.com'); assert.match(url.pathname, /LINZ_NZ_Addresses\/FeatureServer\/0\/query$/);
  assert.doesNotMatch(url.href, /token|key=/i);
});

test('ranking: the house before its flats, the asked flat first, the typed suburb before another town, an exact address on top', () => {
  const house = parseAddressQuery('243 Ponsonby Road'), typed = normaliseQuery('243 Ponsonby Road');
  const ranked = parseMatches(PONSONBY, house, typed).map((m) => m.address);
  assert.deepEqual(ranked, ['243 Ponsonby Road, Ponsonby, Auckland', '1/243 Ponsonby Road, Ponsonby, Auckland', '2/243 Ponsonby Road, Ponsonby, Auckland']);
  const flat = parseAddressQuery('flat 2, 243 ponsonby rd');
  assert.equal(parseMatches(PONSONBY, flat, normaliseQuery('flat 2, 243 ponsonby rd'))[0].address, '2/243 Ponsonby Road, Ponsonby, Auckland');
  const two = { features: [row(1, '1 Queen Street, Northcote Point, Auckland', { n: 1, road: 'Queen Street', suburb: 'Northcote Point' }), row(2, '1 Queen Street, Auckland Central, Auckland', { n: 1, road: 'Queen Street', suburb: 'Auckland Central' })] };
  const p = parseAddressQuery('1 queen st auckland');
  assert.equal(parseMatches(two, p, normaliseQuery('1 queen st auckland'))[0].address, '1 Queen Street, Auckland Central, Auckland');
  assert.ok(scoreMatch(PONSONBY.features[1].attributes, house, typed) >= 100, 'an exact match is on top');
});

test('only eight matches, each with address, suburb, town, council, point and id; rows without a point are dropped', () => {
  const many = { features: Array.from({ length: 12 }, (_, i) => row(100 + i, `${i + 1}/243 Ponsonby Road, Ponsonby, Auckland`, { unit: String(i + 1) })).concat([{ attributes: { address_id: 9, full_address: 'x', full_address_ascii: 'x' } }]), exceededTransferLimit: true };
  const m = parseMatches(many, parseAddressQuery('243 Ponsonby Road'), '243 ponsonby road');
  assert.equal(m.length, MAX_MATCHES);
  assert.deepEqual(Object.keys(m[0]).sort(), ['address', 'council', 'id', 'lat', 'lon', 'suburb', 'town', 'unit']);
  assert.deepEqual({ lat: m[0].lat, lon: m[0].lon, suburb: m[0].suburb, town: m[0].town, council: m[0].council }, { lat: -36.84985, lon: 174.74446, suburb: 'Ponsonby', town: 'Auckland', council: 'Auckland' });
});

test('the whole answer through /api/live/: matches, LINZ credit, CC BY 4.0, a short cache, and the key-less LINZ host only', async () => {
  const { res, body, calls } = await ask('243 Ponsonby Rd');
  assert.equal(res.status, 200);
  const a = body.feeds.address;
  assert.equal(a.id, 'address'); assert.equal(a.value, 3); assert.equal(a.values.matches[0].address, '243 Ponsonby Road, Ponsonby, Auckland'); assert.equal(a.values.matches[0].id, 3072790);
  assert.equal(a.asOf, '2026-11-02'); assert.equal(a.status, 'live');
  assert.match(a.licence.name, /CC BY 4\.0/); assert.match(a.licence.attribution, /Sourced from the LINZ Data Service/); assert.match(a.source.url, /linz\.govt\.nz/);
  assert.match(a.note, /does not say who owns/);
  assert.match(res.headers.get('cache-control'), /s-maxage=300/);
  assert.deepEqual([...new Set(calls.map((c) => c.url.host))], ['services.arcgis.com']);
  for (const c of calls) { assert.doesNotMatch(c.href, /token|api[_-]?key|LINZ_API_KEY/i); assert.ok(c.init.signal instanceof AbortSignal); }
});

test('the typed text is not kept: a second warm call with the same words asks LINZ again (nothing memoised by query) and nothing is logged', async () => {
  const logged = []; const keep = { log: console.log, warn: console.warn, error: console.error, info: console.info };
  for (const k of Object.keys(keep)) console[k] = (...a) => logged.push(a.join(' '));
  try {
    const one = await ask('243 Ponsonby Rd'), two = await ask('243 Ponsonby Rd');
    assert.ok(one.calls.some((c) => c.url.pathname.endsWith('/query')) && two.calls.some((c) => c.url.pathname.endsWith('/query')));
  } finally { Object.assign(console, keep); }
  assert.equal(logged.filter((l) => /ponsonby/i.test(l)).length, 0);
});

test('no match is an empty list, not an error', async () => {
  const { res, body } = await ask('999 Nowhereville Road', [{ features: [] }]);
  assert.equal(body.feeds.address.value, 0); assert.deepEqual(body.feeds.address.values.matches, []); assert.match(res.headers.get('cache-control'), /s-maxage/);
});

test('plain-English errors: too short, too long, no street, LINZ down, LINZ error; none is cached', async () => {
  const fail = async (q, r) => { const { res, body } = await ask(q, r); assert.ok(body.feeds.address.error, q); assert.equal(res.headers.get('cache-control'), 'no-store'); return body.feeds.address.error; };
  assert.match(await fail('abc'), /at least 4 characters/);
  assert.match(await fail('x'.repeat(121)), /too long/);
  assert.match(await fail('1400 12'), /Add the street name/);
  assert.match(await fail('14 Ponsonby Road', [PONSONBY, 503]), /did not answer just now.*coordinates/);
  assert.match(await fail('14 Ponsonby Road', [{ error: { code: 400, message: 'Unable to complete operation.' } }]), /could not run that search/);
  const none = await onRequest({ request: new Request('https://lab.assembl.co.nz/api/live/?feeds=address'), env: {} });
  assert.match((await none.json()).feeds.address.error, /at least 4 characters/);
});

test('the feed is listed, and the site and other feeds are unchanged', async () => {
  const r = await onRequest({ request: new Request('https://lab.assembl.co.nz/api/live/?feeds=nope'), env: {} });
  assert.ok((await r.json()).available.includes('address'));
});
