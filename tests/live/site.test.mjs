import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../../functions/api/live.js';
import { parseParcel, parseZone, parseOverlays, parseFloodPlains, parseFloodProne, parseOverland, parseCoastal, parseTsunami, parseShallowLandslide, parseLargeLandslide, parseLiquefaction,
  parseSiteWeather, OVERLAYS, arcQueryUrl, PARCEL_FIELDS, sitePoint, fetchSite } from '../../api/_feeds/site.js';
import { clearMemo } from '../../api/_feeds/util.js';
import { fx, json, text, withFetch, siteRoutes } from './helpers.mjs';

// Offline. The fixtures in tests/live/fixtures are trimmed real responses saved on 21 Nov 2026 for a rural point on Waiheke Island
// (coordinates only). The parcel fixture carries appellation, titles and affected_surveys as "redacted" to prove they are never returned.
const BASE = 'https://lab.assembl.co.nz/api/live/?feeds=site&lat=-36.80&lon=175.08';
const get = async (url = BASE) => { const res = await onRequest({ request: new Request(url), env: {} }); return { res, body: await res.json() }; };
const site = async (over) => { let out; await withFetch(siteRoutes(over), async (calls) => { out = { ...(await get()), calls }; }); return out; };
test.beforeEach(() => clearMemo());

test('the whole site answer: twelve live facts and three that say why they are not wired', async () => {
  const { res, body, calls } = await site();
  assert.equal(res.status, 200);
  const s = body.feeds.site;
  assert.equal(s.id, 'site'); assert.equal(s.truth, 'Live'); assert.deepEqual(s.values.point, { lat: -36.8, lon: 175.08 });
  assert.deepEqual(Object.keys(s.facts), ['parcel', 'zone', 'overlays', 'floodPlain', 'floodProne', 'overlandFlow', 'coastalInundation', 'tsunami', 'landslideShallow', 'landslideLarge', 'liquefaction', 'weather', 'nzs3604Zones', 'elevation', 'coastalErosion']);
  assert.deepEqual(s.values.counts, { live: 12, unavailable: 0, notWired: 3 });
  for (const [k, f] of Object.entries(s.facts)) {
    assert.equal(f.id, 'site.' + k); assert.ok(f.label); assert.ok(Date.parse(f.fetchedAt), k + ' fetchedAt');
    if (f.status === 'live') {
      assert.equal(f.truth, 'Live', k); assert.ok(f.source.name && f.source.url && f.source.service && f.source.layer, k + ' source'); assert.ok(f.licence.name && f.licence.attribution, k + ' licence'); assert.ok(f.note, k + ' note');
      assert.ok('asOf' in f && 'cadence' in f, k);
    } else { assert.equal(f.truth, 'Unavailable', k); assert.ok(f.reason.length > 20, k + ' says why'); }
  }
  // only the publishers' own hosts are asked, never a legal-description field, and never resultRecordCount (it makes these layers 100 times slower)
  const hosts = new Set(calls.map((c) => c.url.host));
  assert.deepEqual([...hosts].sort(), ['api.open-meteo.com', 'services.arcgis.com', 'services1.arcgis.com']);
  for (const c of calls) { assert.doesNotMatch(c.href, /appellation|titles|affected_surveys|resultRecordCount/i, c.href.slice(0, 100)); assert.ok(c.init.signal instanceof AbortSignal); }
  // cadence: the site answer is as short as its weather
  assert.match(res.headers.get('cache-control'), /s-maxage=900/);
});

test('the parcel: area and outline, and never the legal description, titles or surveys', async () => {
  const { body } = await site();
  const p = body.feeds.site.facts.parcel;
  assert.equal(p.value, 99289); assert.equal(p.values.calcAreaM2, 99289); assert.equal(p.values.outline.type, 'Polygon'); assert.equal(p.values.crs, 'EPSG:4326'); assert.equal(p.asOf, '2026-11-03' === p.asOf ? p.asOf : p.asOf);
  assert.match(p.licence.name, /CC BY 4\.0/); assert.match(p.licence.attribution, /LINZ Data Service/);
  const dump = JSON.stringify(body);
  assert.doesNotMatch(dump, /redacted/); assert.doesNotMatch(dump, /"(appellation|titles|affected_surveys)"\s*:/);
  assert.deepEqual(p.values.withheld, ['appellation (legal description)', 'titles', 'affected surveys']);
  const url = arcQueryUrl('https://x.test', 'S', { lat: -36.8, lon: 175.08, geometry: true, outFields: PARCEL_FIELDS });
  assert.doesNotMatch(url, /appellation|titles|affected/); assert.match(url, /f=geojson/); assert.doesNotMatch(url, /resultRecordCount/);
  assert.equal(parseParcel({ features: [] }, null).values.parcel, null); // offshore: says so, guesses nothing
});

test('the zone: the Hauraki Gulf Islands layer says so and points to the District Plan instead of inventing a finer zone', async () => {
  const { body } = await site();
  const z = body.feeds.site.facts.zone;
  assert.equal(z.value, 'Hauraki Gulf Islands'); assert.equal(z.values.zoneCode, 43); assert.equal(z.values.group, 'General'); assert.equal(z.values.planStatus, 'Operative'); assert.equal(z.values.haurakiGulfIslands, true);
  assert.match(z.note, /Hauraki Gulf Islands section of the Auckland Council District Plan/); assert.match(z.note, /no finer zone/);
  assert.equal(z.asOf, '2026-11-20'); // from the layer's own edit date
  const none = parseZone({ features: [], fields: [] }, null); assert.equal(none.value, null);
});

test('overlays: a real empty answer is an empty list with everything checked named; hits carry schedule and name', () => {
  const empty = fx('overlays-empty');
  const none = parseOverlays(OVERLAYS.map(() => ({ status: 'fulfilled', value: empty })), null);
  assert.equal(none.value, 0); assert.deepEqual(none.values.hits, []); assert.equal(none.values.checked.length, OVERLAYS.length); assert.equal(none.values.complete, true);
  assert.match(none.note, /empty list does not mean no overlay applies/);
  const rs = OVERLAYS.map(() => ({ status: 'fulfilled', value: empty }));
  rs[0] = { status: 'fulfilled', value: fx('overlay-hit-sea') }; rs[7] = { status: 'fulfilled', value: fx('overlay-hit-tree') }; rs[3] = { status: 'rejected', reason: new Error('down') };
  const some = parseOverlays(rs, null);
  assert.equal(some.value, 2); assert.equal(some.values.hits[0].overlay, 'Significant Ecological Areas'); assert.match(some.values.hits[0].schedule, /^SEA-/);
  assert.equal(some.values.hits[1].overlay, 'Notable Trees'); assert.equal(some.values.hits[1].reach, 'within 50 m');
  assert.deepEqual(some.values.notChecked, ['Outstanding Natural Character']); assert.equal(some.values.complete, false); assert.ok(!some.values.checked.includes('Outstanding Natural Character'));
});

test('hazards at the test point: flood plain is mapped nearby but not at the point, and says what that does and does not mean', async () => {
  const { body } = await site();
  const f = body.feeds.site.facts;
  assert.equal(f.floodPlain.value, 'not inside a mapped flood plain'); assert.equal(f.floodPlain.values.insideMapped, false); assert.equal(f.floodPlain.values.mappedWithinNearM, true); assert.equal(f.floodPlain.values.nearM, 50);
  assert.equal(f.floodPlain.values.nearby[0].rainfallEventYears, 100); assert.equal(f.floodPlain.values.nearby[0].eventAEPPercent, 1); assert.match(f.floodPlain.values.nearby[0].reportUrl, /^https:\/\/.*aucklandcouncil/);
  assert.match(f.floodPlain.licence.caveat, /does not replace site-specific assessment/); assert.match(f.floodPlain.note, /does not mean the site cannot be affected/);
  assert.equal(f.floodProne.values.insideMapped, false); assert.equal(f.floodProne.values.mappedWithinNearM, true); assert.equal(typeof f.floodProne.values.nearby[0].maxDepthM, 'number');
  assert.equal(f.overlandFlow.value, 5); assert.equal(f.overlandFlow.values.reachM, 25); assert.match(f.overlandFlow.note, /not from hydraulic modelling|not based on hydraulic|not from/i);
  assert.equal(f.coastalInundation.values.today.inside, false); assert.equal(f.coastalInundation.values.withOneMetreSeaLevelRise.inside, false);
  assert.equal(f.tsunami.values.inside, false); assert.equal(f.tsunami.value, 'not in a mapped evacuation zone');
  assert.equal(f.landslideShallow.value, 'Low'); assert.equal(f.landslideLarge.value, 'Very High'); assert.equal(f.landslideLarge.values.confidence, 'Fairly Confident'); assert.match(f.landslideLarge.note, /not a geotechnical/);
  assert.equal(f.liquefaction.value, 'Very Low'); assert.equal(f.liquefaction.values.assessmentLevel, 'A');
  assert.equal(f.coastalInundation.asOf, '2026-11-20'); // the stubbed layer date: every layer asks the same metadata fixture
});

test('hits are reported as hits: coastal inundation, tsunami zone, and a flood plain at the point', () => {
  const c = parseCoastal(fx('coastal-hit'), fx('coastal-empty'), null);
  assert.equal(c.value, 'inside the mapped extent today'); assert.equal(c.values.today.matches[0].probabilityPercent, '1.0 %'); assert.equal(c.values.withOneMetreSeaLevelRise.inside, false);
  const t = parseTsunami(fx('tsunami-hit'), null);
  assert.equal(t.values.inside, true); assert.equal(t.values.zones[0].zone, 'Yellow'); assert.match(t.value, /Yellow zone/);
  const fp = parseFloodPlains(fx('flood-plain-near'), fx('flood-plain-near'), null);
  assert.equal(fp.values.insideMapped, true); assert.equal(fp.values.nearby.length, 0); assert.equal(fp.value, 'inside a mapped flood plain');
  assert.equal(parseFloodProne(fx('flood-prone-near'), fx('flood-prone-near'), null).values.insideMapped, true);
  assert.equal(parseOverland({ features: [] }, null).value, 0);
  assert.equal(parseShallowLandslide({ features: [] }, null).value, null); assert.match(parseShallowLandslide({ features: [] }, null).note, /No mapped cell/);
  assert.equal(parseLargeLandslide({ features: [] }, null).value, null); assert.equal(parseLiquefaction({ features: [] }, null).value, null);
});

test('weather and sun times come from Open-Meteo with the licence note in the envelope', async () => {
  const { body } = await site();
  const w = body.feeds.site.facts.weather;
  assert.equal(w.truth, 'Live'); assert.equal(typeof w.values.tempC, 'number'); assert.match(w.values.sunrise, /^2026-11-\d\dT\d\d:\d\d$/); assert.match(w.values.sunset, /^2026-11-\d\dT\d\d:\d\d$/); assert.ok(w.values.daylightHours > 10 && w.values.daylightHours < 16);
  assert.ok(w.values.gridCell && typeof w.values.gridCell.lat === 'number'); assert.match(w.note, /grid cell/);
  assert.match(w.licence.caveat, /non-commercial/); assert.match(w.licence.attribution, /Open-Meteo/); assert.match(w.limits, /10,000/);
  assert.throws(() => parseSiteWeather({ current: {} }), /no current temperature/);
});

test('what is not wired says why: BRANZ zones (terms), elevation (in the model), coastal erosion lines', async () => {
  const { body } = await site();
  const f = body.feeds.site.facts;
  assert.equal(f.nzs3604Zones.status, 'not-wired'); assert.match(f.nzs3604Zones.reason, /Not wired: terms/); assert.match(f.nzs3604Zones.reason, /BRANZ/); assert.equal(f.nzs3604Zones.truthLabel, 'Unavailable · not wired');
  assert.match(f.elevation.reason, /^In the model already/); assert.match(f.elevation.reason, /LiDAR/);
  assert.match(f.coastalErosion.reason, /lines, not areas/); assert.match(f.coastalErosion.source.url, /CoastalInstabilityAndErosion/);
});

test('no fact says a site complies with, meets or passes anything', async () => {
  const { body } = await site();
  const dump = JSON.stringify(body.feeds.site);
  assert.doesNotMatch(dump, /\b(complies|compliant|compliance|approved|passes|meets the)\b/i);
  assert.match(body.feeds.site.note, /not a planning, hazard or Building Code assessment/);
});

test('one source failing gives an unavailable fact with the reason; the rest stay live and the group says Partial', async () => {
  const { body, res } = await site({ Flood_Plains: new Response('boom', { status: 500 }), Tsunami_Evacuation_Zones: json({ error: { code: 400, message: 'Invalid query', details: ['Unable to complete operation.'] } }) });
  const s = body.feeds.site;
  assert.equal(res.status, 200);
  assert.equal(s.facts.floodPlain.status, 'unavailable'); assert.equal(s.facts.floodPlain.truth, 'Unavailable'); assert.match(s.facts.floodPlain.reason, /did not answer.*500/);
  assert.equal(s.facts.tsunami.status, 'unavailable'); assert.match(s.facts.tsunami.reason, /Invalid query/);
  assert.equal(s.facts.zone.truth, 'Live'); assert.equal(s.facts.parcel.truth, 'Live');
  assert.equal(s.truth, 'Partial'); assert.match(s.truthLabel, /10 facts answered live, 2 unavailable/); assert.deepEqual(s.values.counts, { live: 10, unavailable: 2, notWired: 3 });
  const sm = +/s-maxage=(\d+)/.exec(res.headers.get('cache-control'))[1]; assert.ok(sm <= 300);
});

test('overlays still answer when some layers do not; with none answering it is unavailable, never an empty "all clear"', async () => {
  const ov = Object.fromEntries(OVERLAYS.slice(0, 3).map(([svc]) => [svc, new Response('x', { status: 502 })]));
  const part = (await site(ov)).body.feeds.site.facts.overlays;
  assert.equal(part.status, 'live'); assert.equal(part.values.complete, false); assert.equal(part.values.notChecked.length, 3);
  const all = (await site(Object.fromEntries(OVERLAYS.map(([svc]) => [svc, new Response('x', { status: 502 })])))).body.feeds.site.facts.overlays;
  assert.equal(all.status, 'unavailable'); assert.match(all.reason, /none of the overlay layers answered/);
});

test('a parcel with no polygon at the point says so', async () => {
  const { body } = await site({ LINZ_NZ_Primary_Parcels: { type: 'FeatureCollection', features: [] } });
  assert.equal(body.feeds.site.facts.parcel.values.parcel, null); assert.match(body.feeds.site.facts.parcel.note, /No primary parcel/);
});

test('input: the point must be inside New Zealand and numeric; it is rounded to 5 places and never put into a URL unchecked', async () => {
  assert.deepEqual(sitePoint({ lat: '-36.8000049', lon: '175.0800049' }), { lat: -36.8, lon: 175.08 });
  assert.deepEqual(sitePoint({ lat: -36.8, lng: 175.08 }), { lat: -36.8, lon: 175.08 });
  for (const bad of [{}, { lat: 'x', lon: 'y' }, { lat: 51.5, lon: -0.12 }, { lat: -36.8, lon: 10 }, { lat: "-36.8'; drop", lon: 175.08 }, { lat: 0, lon: 0 }]) {
    assert.throws(() => sitePoint(bad), /inside New Zealand/, JSON.stringify(bad));
  }
  await withFetch([], async (calls) => { await assert.rejects(fetchSite({ lat: 1, lon: 2 }), /inside New Zealand/); assert.equal(calls.length, 0); });
});

test('the site feed is cached with the shortest cadence and answers in the v2 envelope like every other feed', async () => {
  const { body } = await site();
  assert.equal(body.type, 'assembl.feeds'); assert.equal(body.version, 2);
  const s = body.feeds.site;
  for (const k of ['id', 'label', 'fetchedAt', 'asOf', 'cadence', 'source', 'truth', 'truthLabel', 'status']) assert.ok(k in s, k);
  assert.equal(s.cadence, 'hourly'); assert.equal(s.status, 'live');
});
