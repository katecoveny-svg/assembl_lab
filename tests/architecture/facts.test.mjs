import test from 'node:test';
import assert from 'node:assert/strict';
import { parseWhere, snapshotFacts, trimFact, answered, notConnected, credits, showValue, fetchSiteFacts } from '../../architecture/js/facts.js';

const FEED = { feeds: { site: { facts: {
  parcel: { id: 'site.parcel', label: 'Land parcel at this point', status: 'live', truthLabel: 'Live', value: 1200, unit: 'm²', asOf: '2026-11-03', note: 'A map, not a survey.',
    values: { outline: { type: 'Polygon', coordinates: [[[175.08, -36.8]]] }, parcelId: 123 }, source: { name: 'LINZ', url: 'https://example.invalid' }, licence: { name: 'CC BY 4.0', attribution: 'Sourced from LINZ.' } },
  zone: { id: 'site.zone', label: 'Planning zone', status: 'live', truthLabel: 'Live', value: 'A zone', unit: '', asOf: null, source: { name: 'Council' }, licence: { attribution: 'Contains council data.' } },
  flood: { id: 'site.floodPlain', label: 'Flood plain', status: 'live', truthLabel: 'Live', value: null, source: { name: 'Council' }, licence: { attribution: 'Contains council data.' } },
  weather: { id: 'site.weather', label: 'Weather now', status: 'live', value: 19.9, unit: '°C', source: { name: 'Open-Meteo' }, licence: { attribution: 'Weather data by Open-Meteo.com.' } },
  zones3604: { id: 'site.nzs3604Zones', label: 'NZS 3604 zones', status: 'not-wired', truthLabel: 'Unavailable · not wired', reason: 'No open service.', needs: 'A written yes.', source: { name: 'BRANZ Maps' } },
  down: { id: 'site.tsunami', label: 'Tsunami', status: 'unavailable', reason: 'timed out' },
} } } };

test('a point must be latitude, longitude inside New Zealand', () => {
  assert.deepEqual(parseWhere('-36.80, 175.08'), { lat: -36.8, lon: 175.08 });
  assert.deepEqual(parseWhere(' -41.29 174.78 '), { lat: -41.29, lon: 174.78 });
  for (const bad of ['', 'Waiheke', '175.08, -36.80', '51.5, -0.12', '-36.8', '-36.8, 175.08, 3']) assert.equal(parseWhere(bad), null, bad);
});

test('the snapshot keeps label, value, date, note, source and credit, and nothing that draws the location', () => {
  const facts = snapshotFacts(FEED.feeds.site);
  const parcel = facts.find((f) => f.id === 'site.parcel');
  assert.deepEqual(parcel, { id: 'site.parcel', label: 'Land parcel at this point', status: 'live', truthLabel: 'Live', value: 1200, unit: 'm²', asOf: '2026-11-03', note: 'A map, not a survey.', reason: '', needs: '',
    source: { name: 'LINZ' }, licence: { attribution: 'Sourced from LINZ.' } });
  assert.doesNotMatch(JSON.stringify(facts), /outline|coordinates|parcelId/);
});

test('this hour’s weather is left out of the snapshot', () => {
  assert.equal(snapshotFacts(FEED.feeds.site).some((f) => f.id === 'site.weather'), false);
});

test('facts are grouped by whether the publisher answered', () => {
  const facts = snapshotFacts(FEED.feeds.site);
  assert.deepEqual(answered(facts).map((f) => f.id), ['site.parcel', 'site.zone', 'site.floodPlain']);
  assert.deepEqual(notConnected(facts).map((f) => f.id), ['site.nzs3604Zones']);
  assert.equal(notConnected(facts)[0].reason, 'No open service.');
  assert.deepEqual(credits(facts), ['Sourced from LINZ.', 'Contains council data.'], 'each credit once, answered facts only');
});

test('values read plainly, and an empty answer is not dressed up', () => {
  assert.equal(showValue(trimFact(FEED.feeds.site.facts.parcel)), '1,200 m²');
  assert.equal(showValue(trimFact(FEED.feeds.site.facts.zone)), 'A zone');
  assert.equal(showValue(trimFact(FEED.feeds.site.facts.flood)), 'Nothing mapped at this point');
});

test('fetching asks the lab’s own feed for the point and returns a dated snapshot', async () => {
  let asked = '';
  const ok = async (url) => { asked = url; return { ok: true, json: async () => FEED }; };
  const got = await fetchSiteFacts({ lat: -36.8, lon: 175.08 }, ok);
  assert.equal(asked, '/api/live/?feeds=site&lat=-36.8&lon=175.08');
  assert.equal(got.facts.length, 5);
  assert.ok(!Number.isNaN(Date.parse(got.fetched_at)));
});

test('when the feed fails nothing is made up', async () => {
  await assert.rejects(fetchSiteFacts({ lat: -36.8, lon: 175.08 }, async () => ({ ok: false, status: 502 })), /answered 502/);
  await assert.rejects(fetchSiteFacts({ lat: -36.8, lon: 175.08 }, async () => ({ ok: true, json: async () => ({ feeds: {} }) })), /no facts came back/);
  await assert.rejects(fetchSiteFacts({ lat: -36.8, lon: 175.08 }, async () => ({ ok: true, json: async () => ({ feeds: { site: { error: 'point is outside New Zealand' } } }) })), /outside New Zealand/);
  await assert.rejects(fetchSiteFacts({ lat: -36.8, lon: 175.08 }, async () => { throw new Error('offline'); }), /offline/);
});
