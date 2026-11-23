// Offline tests for /auckland/live/: the parsing and logic in auckland/live/transit.js, the baked static data, and the
// not-yet-deployed Supabase function supabase/functions/at-live/index.ts (imported as TypeScript; Node strips the types).
// Positions fixture: a trimmed real answer from bus-positions (23 Nov 2026). Trip updates and alerts: we have no AT key here,
// so those fixtures are written by hand in the shape AT's realtime API documents. They test parsing only, never shown on the page.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as X from '../../auckland/live/transit.js';
import { handler, trimTripUpdates, trimAlerts, mapStopTrips, corsFor, validStopId } from '../../supabase/functions/at-live/index.ts';
import { fx } from './helpers.mjs';

const data = (f) => JSON.parse(fs.readFileSync(new URL(`../../auckland/live/data/${f}`, import.meta.url), 'utf8'));

test('NZTM2000 matches PROJ to the millimetre, and back', () => {
  const [E, N] = X.toNZTM(-36.8485, 174.7622); // Sky Tower; PROJ (pyproj EPSG:4326 → 2193): 1757111.1728, 5920484.6191
  assert.ok(Math.abs(E - 1757111.1728) < 0.005 && Math.abs(N - 5920484.6191) < 0.005, `${E} ${N}`);
  const [E2, N2] = X.toNZTM(-41.3, 174.0); // PROJ: 1683719.6002, 5427457.0046
  assert.ok(Math.abs(E2 - 1683719.6002) < 0.005 && Math.abs(N2 - 5427457.0046) < 0.005);
  const [lat, lon] = X.fromNZTM(E, N); assert.ok(Math.abs(lat + 36.8485) < 1e-8 && Math.abs(lon - 174.7622) < 1e-8);
});

test('world frame: north is -z, the Sky Tower sits where the lab city model puts it', () => {
  const p = X.toWorld(-36.8485, 174.7622);
  assert.ok(Math.abs(p.x + 2185) < 1 && Math.abs(p.z - 219) < 1, JSON.stringify(p)); // auckland/3d/skytower-parts.json centre × 30720
  assert.equal(X.inArea(-36.8485, 174.7622), true);
  assert.equal(X.inArea(-36.79, 175.01), false); // Waiheke is outside the 3D box
});

test('positions: a real bus-positions answer parses; vehicles off a trip are kept but not counted as on a trip', () => {
  const p = X.parsePositions(fx('at-positions'));
  assert.equal(p.vehicles.length, 24); // includes four fixes with no trip, some far outside Auckland (Northland, Wellington)
  assert.ok(p.vehicles.every((v) => typeof v.id === 'string' && Number.isFinite(v.lat) && Number.isFinite(v.lon)));
  assert.equal(p.onTrip, p.vehicles.filter((v) => v.routeId).length);
  assert.ok(p.feedTime > 1.79e9 && p.newestFix > 1.79e9);
  const train = p.vehicles.find((v) => v.routeId === 'S-C-201' && v.speedKmh > 0); assert.equal(train.speedKmh, 103); // 28.583 m/s
});

test('positions: bad fixes are dropped, missing values stay null', () => {
  const p = X.parsePositions({ vehicles: [
    { vehicle_id: 1, route_id: '70-205', latitude: 'x', longitude: 174.7 }, { vehicle_id: 2, latitude: 51.5, longitude: -0.1 },
    { vehicle_id: 3, route_id: '', trip_id: '', latitude: -36.85, longitude: 174.76, bearing: null, speed: null, timestamp: null, occupancy_status: null },
  ], timestamp: 1795392657275 });
  assert.equal(p.vehicles.length, 1); const v = p.vehicles[0];
  assert.deepEqual([v.id, v.routeId, v.bearing, v.speedKmh, v.ts, v.occupancy], ['3', null, null, null, null, null]);
  assert.deepEqual(X.parsePositions(null).vehicles, []);
});

test('speed units: whole numbers read as km/h (AT buses), fractions as m/s (trains, ferries)', () => {
  assert.equal(X.speedKmh(88), 88); assert.equal(X.speedKmh(21.944444444444443), 79); assert.equal(X.speedKmh(5.14444), 19);
  assert.equal(X.speedKmh(0), 0); assert.equal(X.speedKmh(null), null); assert.equal(X.speedKmh(-3), null);
});

// hand-written in AT's documented JSON shape (realtime API, snake case, wrapped in response)
const TU = { status: 'OK', response: { header: { timestamp: 1795392600 }, entity: [
  { id: 'a', trip_update: { trip: { trip_id: 'T1', route_id: '70-205', schedule_relationship: 0 }, vehicle: { id: '512000741' }, stop_time_update: { stop_sequence: 5, stop_id: 'S5', arrival: { delay: 420, time: 1795392500 } }, timestamp: 1795392590 } },
  { id: 'b', trip_update: { trip: { trip_id: 'T2', route_id: 'E-W-201', schedule_relationship: 0 }, stop_time_update: [{ stop_sequence: 9, stop_id: 'S9', departure: { delay: -30, time: 1795392400 } }], timestamp: 1795392580 } },
  { id: 'c', trip_update: { trip: { trip_id: 'T3', route_id: 'DEV-209', schedule_relationship: 3 }, timestamp: 1795392580 } },
  { id: 'd', trip_update: { trip: { trip_id: 'T4', route_id: '25B-202' }, stop_time_update: [{ stop_sequence: 2, stop_id: 'S2' }], timestamp: 1795392580 } },
  { id: 'e', trip_update: { trip: { trip_id: 'T5', route_id: '25L-202' }, stop_time_update: [{ stop_sequence: 2, stop_id: 'S2', departure: { delay: -200 } }], timestamp: 1795392580 } },
  { id: 'f', vehicle: { position: { latitude: 0, longitude: 0 } } },
] } };
const NOW = 1795392600;

test('trip updates: delay, event, stop and cancellation are read; nothing is made up', () => {
  const u = X.parseTripUpdates(TU);
  assert.equal(u.size, 5);
  assert.deepEqual([u.get('T1').delay, u.get('T1').event, u.get('T1').stopId, u.get('T1').vehicleId], [420, 'arrival', 'S5', '512000741']);
  assert.deepEqual([u.get('T2').delay, u.get('T2').event], [-30, 'departure']);
  assert.equal(u.get('T3').cancelled, true);
  assert.equal(u.get('T4').delay, null); // a stop event with no delay stays unknown
  assert.equal(X.parseTripUpdates({ entity: TU.response.entity }).size, 5); // at-live's unwrapped shape
});

test('delay status: on time band, late, very late, early, cancelled, unknown, and old updates', () => {
  const u = X.parseTripUpdates(TU);
  assert.equal(X.delayStatus(u.get('T1'), NOW).status, 'late'); assert.equal(X.delayStatus(u.get('T1'), NOW).label, '7 min late');
  assert.equal(X.delayStatus(u.get('T2'), NOW).status, 'on-time');
  assert.equal(X.delayStatus(u.get('T3'), NOW).status, 'cancelled');
  assert.equal(X.delayStatus(u.get('T4'), NOW).status, 'unknown');
  assert.equal(X.delayStatus(u.get('T5'), NOW).status, 'early');
  assert.equal(X.delayStatus(undefined, NOW).status, 'unknown');
  assert.equal(X.delayStatus({ delay: 900, ts: NOW - 3600 }, NOW).status, 'unknown'); // an hour-old update is not used
  assert.equal(X.delayStatus({ delay: 300 }, NOW).status, 'on-time'); assert.equal(X.delayStatus({ delay: 301 }, NOW).status, 'late');
  assert.equal(X.delayStatus({ delay: -60 }, NOW).status, 'on-time'); assert.equal(X.delayStatus({ delay: -61 }, NOW).status, 'early');
});

test('alerts: text, routes, stops and active periods', () => {
  const A = { response: { entity: [
    { id: 'x', alert: { header_text: { translation: [{ text: 'Detour', language: 'en' }] }, description_text: { translation: [{ text: 'Roadworks on Dominion Rd' }] }, informed_entity: [{ route_id: '25B-202' }, { stop_id: 'S2' }], active_period: [{ start: NOW - 60, end: NOW + 60 }], effect: 'DETOUR' } },
    { id: 'y', alert: { header_text: { translation: [{ text: 'Old' }] }, informed_entity: [{ route_id: '25B-202' }], active_period: [{ start: NOW - 7200, end: NOW - 3600 }] } },
  ] } };
  const al = X.parseAlerts(A); assert.equal(al.length, 2); assert.equal(al[0].header, 'Detour'); assert.deepEqual(al[0].stops, ['S2']);
  assert.deepEqual(X.alertsFor(al, { routeIds: ['25B-202'] }, NOW).map((a) => a.id), ['x']);
  assert.deepEqual(X.alertsFor(al, { stopIds: ['S2'] }, NOW).map((a) => a.id), ['x']);
  assert.deepEqual(X.alertsFor(al, { routeIds: ['70-205'] }, NOW), []);
});

test('GTFS times in Auckland: summer and winter offsets, and times past midnight', () => {
  assert.equal(new Date(X.gtfsTimeToEpoch('20261123', '08:00:00') * 1000).toISOString(), '2026-11-22T19:00:00.000Z'); // NZDT +13
  assert.equal(new Date(X.gtfsTimeToEpoch('2026-07-01', '08:00:00') * 1000).toISOString(), '2026-06-30T20:00:00.000Z'); // NZST +12
  assert.equal(new Date(X.gtfsTimeToEpoch('20261123', '25:10:00') * 1000).toISOString(), '2026-11-23T12:10:00.000Z');
  assert.equal(X.gtfsTimeToEpoch('bad', '08:00:00'), null); assert.equal(X.gtfsTimeToEpoch('20261123', ''), null);
  assert.equal(X.nzServiceDate(Date.UTC(2026, 10, 22, 12, 30)), '2026-11-23'); // 1:30 am in Auckland
});

test('next arrivals: live when a fresh delay exists and the vehicle has not passed; timetable otherwise; never invented', () => {
  const u = X.parseTripUpdates(TU), base = X.gtfsTimeToEpoch('20261123', '13:30:00'); // 00:30 UTC; NOW is 00:10 UTC
  const trips = [
    { trip_id: 'T1', route_id: '70-205', arrival_time: '13:30:00', stop_sequence: 8, trip_headsign: 'Botany', service_date: '2026-11-23' }, // live: +7 min
    { trip_id: 'T2', route_id: 'E-W-201', arrival_time: '13:20:00', stop_sequence: 4, trip_headsign: 'Swanson', service_date: '2026-11-23' }, // already passed (seq 9 > 4)
    { trip_id: 'T3', route_id: 'DEV-209', arrival_time: '13:40:00', stop_sequence: 3, service_date: '2026-11-23' }, // cancelled
    { trip_id: 'T9', route_id: '70-205', arrival_time: '13:25:00', stop_sequence: 8, trip_headsign: 'Botany', service_date: '2026-11-23' }, // no update: timetable
    { trip_id: 'T8', route_id: '70-205', arrival_time: '12:00:00', stop_sequence: 8, service_date: '2026-11-23' }, // gone
  ];
  const rows = X.arrivalsForStop(trips, u, NOW);
  assert.deepEqual(rows.map((r) => [r.tripId, r.status]), [['T9', 'scheduled'], ['T1', 'live'], ['T3', 'cancelled']]);
  const t1 = rows.find((r) => r.tripId === 'T1'); assert.equal(t1.predicted, base + 420); assert.equal(t1.delay, 420);
  const t9 = rows.find((r) => r.tripId === 'T9'); assert.equal(t9.predicted, null); assert.equal(t9.delay, null);
  assert.deepEqual(X.arrivalsForStop([], u, NOW), []); assert.deepEqual(X.arrivalsForStop(null, null, NOW), []);
});

test('baked AT GTFS index: licence carried, search finds routes, stops, ferry terminals and stations', () => {
  const routes = data('routes.json'), stops = data('stops.json');
  for (const d of [routes, stops]) { assert.match(d.licence.name, /Creative Commons Attribution 4\.0/); assert.match(d.url, /gtfs\.at\.govt\.nz/); assert.ok(d.feedStart && d.feedEnd); }
  const idx = X.buildIndex(routes, stops);
  assert.ok(idx.routes.size > 150 && idx.stops.size > 5000);
  const modes = [...idx.routes.values()].reduce((m, r) => ((m[r.mode] = (m[r.mode] || 0) + 1), m), {});
  assert.ok(modes.bus > 100 && modes.train >= 3 && modes.ferry >= 10, JSON.stringify(modes));
  const top = (q) => X.search(idx, q, 3)[0];
  assert.equal(top('70').route.short, '70');
  assert.equal(top('E-W').route.short, 'E-W');
  assert.equal(top('nx1').route.short, 'NX1');
  assert.equal(top('Devonport').kind, 'ferry'); assert.match(top('Devonport').stop.name, /Ferry Terminal - Devonport/);
  assert.match(top('downtown').stop.name, /Ferry Terminal - Downtown/);
  assert.match(top('Britomart').stop.name, /Waitemata Train Station/); // the former name still finds the station
  assert.equal(top('Newmarket').kind, 'station');
  assert.deepEqual(X.search(idx, '   '), []); assert.deepEqual(X.search(idx, '__proto__'), []);
  const s = idx.stops.get(top('Devonport').id); assert.ok(s.routes.some((id) => idx.routes.get(id).short === 'DEV'));
});

test('without trip updates, a stop lists vehicles on its routes by straight-line distance only', () => {
  const idx = X.buildIndex(data('routes.json'), data('stops.json'));
  const s = idx.stops.get(X.search(idx, 'Devonport', 1)[0].id), p = X.parsePositions(fx('at-positions'));
  const near = X.vehiclesForStop(s, [...p.vehicles, { id: 'z', routeId: 'DEV-209', lat: -36.8335, lon: 174.7955 }]);
  assert.equal(near[0].id, 'z'); assert.ok(near[0].metres < 600); assert.ok(near.every((v) => s.routes.includes(v.routeId) && !('delay' in v)));
});

test('sun over Auckland: high at the December solstice, low at the June one', () => {
  const dec = X.sunPosition(Date.UTC(2026, 11, 21, 0, 20)), jun = X.sunPosition(Date.UTC(2026, 5, 21, 0, 20));
  assert.ok(Math.abs(dec.elevation - 76.6) < 0.5 && (dec.azimuth > 350 || dec.azimuth < 10), JSON.stringify(dec));
  assert.ok(Math.abs(jun.elevation - 29.7) < 0.7, JSON.stringify(jun));
  assert.ok(X.sunPosition(Date.UTC(2026, 10, 23, 12, 0)).elevation < 0); // 1 am
});

test('baked ground and buildings: headers match the binaries; sources and licences recorded', () => {
  const h = data('ground-height.json'), bin = fs.readFileSync(new URL('../../auckland/live/data/ground-height.bin', import.meta.url));
  assert.equal(bin.length, h.width * h.height * 2);
  assert.ok(h.sources.some((s) => /Land Information New Zealand/.test(s.licence)) && h.sources.some((s) => /ODbL/.test(s.licence)));
  const w = new Int16Array(fs.readFileSync(new URL('../../auckland/live/data/buildings.bin', import.meta.url)).buffer.slice(0));
  let k = 0, n = 0, tall = 0;
  while (k < w.length) { const c = w[k + 4]; assert.ok(c >= 3 && c < 5000 && (w[k] === 0 || w[k] === 1)); if (w[k] === 0) tall++; k += 5 + c * 2; n++; }
  assert.equal(k, w.length); assert.equal(n, h.buildings.tall + h.buildings.lowNearCentre); assert.equal(tall, h.buildings.tall);
  const sample = data('sample-positions.json'); assert.match(sample.sample.note, /saved copy of a real answer/i); assert.ok(sample.vehicles.length > 100);
});

// ------------------------------------------------------------------------------------------------ at-live (Supabase function)
const LAB = 'https://lab.assembl.co.nz', KEY = 'test-key-not-real';
function atStub(over = {}) {
  const calls = [];
  const f = async (u, init) => {
    calls.push({ url: String(u), headers: init?.headers });
    const p = new URL(String(u)).pathname;
    if (over[p]) return over[p]();
    if (p.endsWith('/tripupdates')) return new Response(JSON.stringify(TU));
    if (p.endsWith('/servicealerts')) return new Response(JSON.stringify({ response: { entity: [] } }));
    if (p.includes('/stoptrips')) return new Response(JSON.stringify({ data: [{ type: 'stoptrip', id: '1', attributes: { trip_id: 'T1', route_id: '70-205', arrival_time: '13:30:00', departure_time: '13:30:00', stop_sequence: 8, trip_headsign: 'Botany', service_date: '2026-11-23' } }] }));
    return new Response('nope', { status: 404 });
  };
  return { f, calls };
}
const req = (q = '', origin = LAB, method = 'GET') => new Request('https://x.supabase.co/functions/v1/at-live' + q, { method, headers: origin ? { origin } : {} });

test('at-live: no key → 503 that names no secret; the key goes only in the AT header and never comes back', async () => {
  const none = await handler(req(), { key: undefined, fetch: atStub().f }); assert.equal(none.status, 503);
  const s = atStub(), res = await handler(req(), { key: KEY, fetch: s.f, now: () => NOW * 1000 }), text = await res.text();
  assert.equal(res.status, 200); assert.ok(!text.includes(KEY));
  assert.ok(s.calls.every((c) => c.headers['Ocp-Apim-Subscription-Key'] === KEY && !c.url.includes(KEY)));
  assert.ok(s.calls.some((c) => c.url === 'https://api.at.govt.nz/realtime/legacy/tripupdates'));
  const j = JSON.parse(text); assert.equal(X.parseTripUpdates(j.tripUpdates).get('T1').delay, 420); assert.match(j.licence.name, /Attribution 4\.0/);
  assert.equal(res.headers.get('access-control-allow-origin'), LAB);
});

test('at-live: CORS only for the lab, its previews and localhost', () => {
  assert.equal(corsFor('https://lab.assembl.co.nz')['Access-Control-Allow-Origin'], 'https://lab.assembl.co.nz');
  assert.equal(corsFor('https://feat-x.assembl-lab.pages.dev')['Access-Control-Allow-Origin'], 'https://feat-x.assembl-lab.pages.dev');
  assert.equal(corsFor('http://localhost:4174')['Access-Control-Allow-Origin'], 'http://localhost:4174');
  assert.equal(corsFor('https://evil.example')['Access-Control-Allow-Origin'], undefined);
  assert.equal(corsFor('https://lab.assembl.co.nz.evil.example')['Access-Control-Allow-Origin'], undefined);
  assert.equal(corsFor(null)['Access-Control-Allow-Origin'], undefined);
});

test('at-live: stop timetable is mapped, stop ids are checked, failures are labelled not hidden', async () => {
  const s = atStub(), res = await handler(req('?stop=96701-2a8a3f29'), { key: KEY, fetch: s.f, now: () => NOW * 1000 }), j = await res.json();
  assert.equal(j.stopTripsVerified, false); assert.equal(j.stops['96701-2a8a3f29'].trips[0].trip_id, 'T1');
  assert.ok(s.calls.some((c) => /\/gtfs\/v3\/stops\/96701-2a8a3f29\/stoptrips\?filter\[date\]=2026-11-23&filter\[start_hour\]=13/.test(c.url)));
  assert.equal((await handler(req('?stop=a,b,c,d,e,f,g'), { key: KEY, fetch: s.f })).status, 400);
  assert.equal((await handler(req('?stop=../../x'), { key: KEY, fetch: s.f })).status, 400);
  assert.equal(validStopId('__proto__'), false); assert.equal(validStopId('133-08da14b5'), true);
  const down = atStub({ '/realtime/legacy/tripupdates': () => new Response('x', { status: 500 }) });
  const r2 = await handler(req(), { key: KEY, fetch: down.f, now: () => NOW * 1000 + 999999 }); // past the cache
  assert.equal(r2.status, 502); assert.equal(r2.headers.get('cache-control'), 'no-store'); assert.equal((await r2.json()).tripUpdates.error, 'unavailable');
  assert.equal((await handler(req('', LAB, 'POST'), { key: KEY, fetch: s.f })).status, 405);
  assert.equal((await handler(req('', LAB, 'OPTIONS'), { key: KEY, fetch: s.f })).status, 204);
});

test('at-live trimming keeps only what the page reads', () => {
  const t = trimTripUpdates(TU); assert.equal(t.entity.length, 5); assert.deepEqual(Object.keys(t.entity[0].trip_update).sort(), ['delay', 'stop_time_update', 'timestamp', 'trip', 'vehicle']);
  const a = trimAlerts({ response: { entity: [{ id: 1, alert: { header_text: { translation: [{ text: 'h' }] }, url: 'x', informed_entity: [{ route_id: 'r', agency_id: 'AM' }] } }] } });
  assert.deepEqual(a.entity[0].alert.informed_entity, [{ route_id: 'r', stop_id: undefined }]); assert.equal(a.entity[0].alert.url, undefined);
  assert.deepEqual(mapStopTrips({ data: [{ attributes: { route_id: 'x' } }] }, '2026-11-23'), []); // no trip id, no row
});
