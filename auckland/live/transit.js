// assembl lab · Auckland live transport: the plain logic behind /auckland/live/ (no DOM, no three.js), shared by the page,
// the bake script (tools/transit/bake-at.mjs) and the tests (tests/live/auckland-transit.test.mjs).
// Rule: nothing here invents a delay or an arrival. A value we do not have stays null and the page says so.

// ------------------------------------------------------------------------------------------------ NZTM2000 (EPSG:2193)
// Transverse Mercator on GRS80, as LINZ defines NZTM: central meridian 173°E, scale 0.9996, false E 1 600 000, false N 10 000 000.
const A = 6378137, F = 1 / 298.257222101, K0 = 0.9996, LON0 = 173, FE = 1600000, FN = 10000000;
const E2 = F * (2 - F), EP2 = E2 / (1 - E2), RAD = Math.PI / 180;
function arc(phi) {
  const e4 = E2 * E2, e6 = e4 * E2;
  return A * ((1 - E2 / 4 - 3 * e4 / 64 - 5 * e6 / 256) * phi - (3 * E2 / 8 + 3 * e4 / 32 + 45 * e6 / 1024) * Math.sin(2 * phi)
    + (15 * e4 / 256 + 45 * e6 / 1024) * Math.sin(4 * phi) - (35 * e6 / 3072) * Math.sin(6 * phi));
}
export function toNZTM(lat, lon) {
  const phi = lat * RAD, s = Math.sin(phi), c = Math.cos(phi), t = Math.tan(phi);
  const n = A / Math.sqrt(1 - E2 * s * s), T = t * t, C = EP2 * c * c, Aa = (lon - LON0) * RAD * c, M = arc(phi);
  const E = FE + K0 * n * (Aa + (1 - T + C) * Aa ** 3 / 6 + (5 - 18 * T + T * T + 72 * C - 58 * EP2) * Aa ** 5 / 120);
  const N = FN + K0 * (M + n * t * (Aa * Aa / 2 + (5 - T + 9 * C + 4 * C * C) * Aa ** 4 / 24 + (61 - 58 * T + T * T + 600 * C - 330 * EP2) * Aa ** 6 / 720));
  return [E, N];
}

// Inverse by Newton's method on toNZTM (converges to well under a millimetre in a few steps across New Zealand).
export function fromNZTM(E, N) {
  let lat = -41, lon = 173 + (E - FE) / 88000;
  for (let i = 0; i < 8; i++) {
    const [e0, n0] = toNZTM(lat, lon), [e1, n1] = toNZTM(lat + 1e-5, lon), [e2, n2] = toNZTM(lat, lon + 1e-5);
    const a = (e1 - e0) / 1e-5, b = (e2 - e0) / 1e-5, c = (n1 - n0) / 1e-5, d = (n2 - n0) / 1e-5, det = a * d - b * c, de = E - e0, dn = N - n0;
    lat += (d * de - b * dn) / det; lon += (a * dn - c * de) / det;
  }
  return [lat, lon];
}

// ------------------------------------------------------------------------------------------------ the 3D world's frame
// Same NZTM box as the lab's LINZ terrain (assets/models/auckland/linz-terrain.json). World units are metres:
// x = east of the box centre, z = south of it (three.js looks down -z, so north is -z), y = height above NZVD2016.
export const AREA = { minX: 1748544, maxX: 1770048, minY: 5911168, maxY: 5930240 };
export const ORIGIN = { E: (AREA.minX + AREA.maxX) / 2, N: (AREA.minY + AREA.maxY) / 2 };
export function toWorld(lat, lon) { const [E, N] = toNZTM(lat, lon); return { x: E - ORIGIN.E, z: ORIGIN.N - N }; }
export function inArea(lat, lon) { const [E, N] = toNZTM(lat, lon); return E >= AREA.minX && E <= AREA.maxX && N >= AREA.minY && N <= AREA.maxY; }

// ------------------------------------------------------------------------------------------------ modes
export const modeOf = (routeType) => (Number(routeType) === 2 ? "train" : Number(routeType) === 4 ? "ferry" : "bus");

// ------------------------------------------------------------------------------------------------ vehicle positions
// Kate's Supabase function bus-positions: {vehicles:[{vehicle_id, route_id, trip_id, latitude, longitude, bearing, speed,
// timestamp, occupancy_status}], count, timestamp(ms)}. Bearing is degrees from north.
// Speed: GTFS-realtime says metres per second, but AT's feed mixes units. Whole numbers (buses, e.g. 88 on a motorway, which
// would be 317 km/h as m/s) read as km/h; fractional values (trains, e.g. 21.944 = 79.0 km/h ÷ 3.6) read as m/s. This is our
// reading of the data on 23 Nov 2026, not AT's statement; the page shows speed as "about".
export function speedKmh(v) { const s = num(v); if (s === null || s < 0) return null; return Math.round(Number.isInteger(s) ? s : s * 3.6); }
const num = (v) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
export function parsePositions(j) {
  const list = Array.isArray(j?.vehicles) ? j.vehicles : [];
  const vehicles = [];
  for (const v of list) {
    const lat = num(v?.latitude), lon = num(v?.longitude);
    if (lat === null || lon === null || lat < -48 || lat > -33 || lon < 165 || lon > 179) continue; // not a New Zealand fix
    const ts = num(v.timestamp);
    vehicles.push({
      id: String(v.vehicle_id ?? ""), routeId: v.route_id ? String(v.route_id) : null, tripId: v.trip_id ? String(v.trip_id) : null,
      lat, lon, bearing: num(v.bearing), speedKmh: speedKmh(v.speed), ts,
      occupancy: num(v.occupancy_status),
    });
  }
  const feedMs = num(j?.timestamp);
  const newest = vehicles.reduce((m, v) => (v.ts && v.ts > m ? v.ts : m), 0);
  return { vehicles, onTrip: vehicles.filter((v) => v.routeId).length, feedTime: feedMs ? Math.round(feedMs / 1000) : null, newestFix: newest || null };
}
// GTFS-realtime OccupancyStatus, worded for people
export const OCCUPANCY = ["Empty", "Seats free", "Few seats free", "Standing room", "Crushed standing", "Full", "Not taking passengers"];

// ------------------------------------------------------------------------------------------------ trip updates (at-live)
// AT realtime JSON is GTFS-realtime in snake case, wrapped as {status, response:{header, entity}}. at-live passes the same
// entity shape through ({header, entity}), so this reads both. One update per trip: AT usually sends only the latest stop event.
function entities(feed) { return feed?.response?.entity || feed?.entity || []; }
export function parseTripUpdates(feed) {
  const out = new Map();
  for (const e of entities(feed)) {
    const tu = e?.trip_update; if (!tu?.trip?.trip_id) continue;
    const stus = Array.isArray(tu.stop_time_update) ? tu.stop_time_update : tu.stop_time_update ? [tu.stop_time_update] : [];
    const last = stus[stus.length - 1] || null;
    const ev = last?.departure?.delay != null ? "departure" : last?.arrival?.delay != null ? "arrival" : null;
    const delay = ev ? num(last[ev].delay) : num(tu.delay);
    out.set(String(tu.trip.trip_id), {
      tripId: String(tu.trip.trip_id), routeId: tu.trip.route_id ? String(tu.trip.route_id) : null,
      vehicleId: tu.vehicle?.id ? String(tu.vehicle.id) : null, cancelled: Number(tu.trip.schedule_relationship) === 3,
      delay, event: ev, stopId: last?.stop_id ? String(last.stop_id) : null, stopSeq: num(last?.stop_sequence),
      time: ev ? num(last[ev].time) : null, ts: num(tu.timestamp),
      startDate: tu.trip.start_date ? String(tu.trip.start_date).replaceAll("-", "") : null,
    });
  }
  return out;
}

// On time is our display band, not AT's punctuality measure: up to 1 minute early or 5 minutes late. The page says so.
export const ON_TIME = { earlySec: 60, lateSec: 300 };
// AT publishes roughly every 30 seconds. Never promote untimestamped or old data to live.
export const STALE_UPDATE_SEC = 120;
export function timestampFresh(ts, nowSec) {
  return Number.isFinite(ts) && ts > 0 && ts <= nowSec + 30 && nowSec - ts <= STALE_UPDATE_SEC;
}
export function delayStatus(update, nowSec) {
  if (!update) return { status: "unknown", label: "Delay not known", minutes: null };
  if (nowSec && !timestampFresh(update.ts, nowSec)) return { status: "unknown", label: "Delay not known (no recent update)", minutes: null };
  if (update.cancelled) return { status: "cancelled", label: "Cancelled", minutes: null };
  if (update.delay === null || update.delay === undefined) return { status: "unknown", label: "Delay not known", minutes: null };
  const d = update.delay, m = Math.round(d / 60);
  if (d < -ON_TIME.earlySec) return { status: "early", label: `${-m} min early`, minutes: m };
  if (d > ON_TIME.lateSec) return { status: "late", label: `${m} min late`, minutes: m };
  return { status: "on-time", label: m === 0 ? "On time" : m > 0 ? `On time (${m} min behind)` : `On time (${-m} min ahead)`, minutes: m };
}

// ------------------------------------------------------------------------------------------------ alerts (at-live)
const txt = (t) => t?.translation?.find((x) => !x.language || /^en/i.test(x.language))?.text || t?.translation?.[0]?.text || "";
export function parseAlerts(feed) {
  const out = [];
  for (const e of entities(feed)) {
    const a = e?.alert; if (!a) continue;
    const ie = Array.isArray(a.informed_entity) ? a.informed_entity : [];
    const ap = Array.isArray(a.active_period) ? a.active_period : [];
    out.push({
      id: String(e.id ?? out.length), header: txt(a.header_text).trim(), description: txt(a.description_text).trim(),
      effect: a.effect ?? null, cause: a.cause ?? null,
      routes: [...new Set(ie.map((x) => x.route_id).filter(Boolean).map(String))], stops: [...new Set(ie.map((x) => x.stop_id).filter(Boolean).map(String))],
      periods: ap.map((p) => ({ start: num(p.start), end: num(p.end) })),
    });
  }
  return out;
}
export function alertsFor(alerts, { routeIds = [], stopIds = [] }, nowSec) {
  const r = new Set(routeIds), s = new Set(stopIds);
  return alerts.filter((a) => (a.routes.some((x) => r.has(x)) || a.stops.some((x) => s.has(x)))
    && (!a.periods.length || a.periods.some((p) => (!p.start || p.start <= nowSec) && (!p.end || p.end >= nowSec))));
}

// ------------------------------------------------------------------------------------------------ time in Auckland
// Offset of Pacific/Auckland from UTC (minutes) at a given instant, from the browser's own time zone tables.
export function nzOffsetMin(ms) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-NZ", { timeZone: "Pacific/Auckland", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return Math.round((Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(ms / 1000) * 1000) / 60000);
}
// GTFS times count from "noon minus 12 hours" on the service day, local time, and may pass 24:00:00.
export function gtfsTimeToEpoch(serviceDate, hms) {
  const d = String(serviceDate).replace(/-/g, ""), m = /^(\d+):(\d\d):(\d\d)$/.exec(String(hms || "").trim());
  if (!/^\d{8}$/.test(d) || !m) return null;
  const noonUtc = Date.UTC(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6, 8), 12);
  const noonLocal = noonUtc - nzOffsetMin(noonUtc) * 60000; // the instant it is 12:00 in Auckland
  return Math.round((noonLocal - 12 * 3600e3) / 1000) + (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]);
}
export const nzClock = (sec) => (sec ? new Intl.DateTimeFormat("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(sec * 1000)).replace(/\s/g, "").toLowerCase() : "–");
export function nzServiceDate(ms) { const t = new Date(ms + nzOffsetMin(ms) * 60000); return t.toISOString().slice(0, 10); }

// ------------------------------------------------------------------------------------------------ next arrivals at a stop
// stopTrips: AT GTFS API stop trips passed on by at-live ({trip_id, route_id, arrival_time, departure_time, stop_sequence,
// trip_headsign, service_date}). An estimate is the timetable time plus the last reported delay,
// not an official stop-specific prediction. Use the schedule when no current progress applies.
export function arrivalsForStop(stopTrips, updates, nowSec, { limit = 8, routes = null } = {}) {
  const rows = [];
  for (const st of stopTrips || []) {
    const tripId = String(st.trip_id ?? ""), sched = gtfsTimeToEpoch(st.service_date, st.arrival_time || st.departure_time);
    if (!tripId || sched === null) continue;
    const update = updates?.get(tripId), seq = num(st.stop_sequence);
    const date = String(st.service_date || "").replaceAll("-", "");
    const u = update && (!update.routeId || update.routeId === String(st.route_id))
      && (!update.startDate || update.startDate === date) ? update : null;
    const fresh = u && timestampFresh(u.ts, nowSec);
    let predicted = null, status = "scheduled", delay = null;
    if (fresh && u.cancelled) status = "cancelled";
    else if (fresh && seq !== null && Number.isFinite(u.stopSeq)) {
      if (u.stopSeq > seq || (u.stopSeq === seq && u.event === "departure" && u.time && u.time <= nowSec)) status = "passed";
      else if (Number.isFinite(u.delay)) { delay = u.delay; predicted = sched + u.delay; status = "estimated"; }
    } else if (u && !fresh) status = "stale";
    const when = predicted ?? sched;
    if (status === "passed" || when < nowSec - 60) continue;
    const r = routes?.get(String(st.route_id));
    rows.push({ tripId, routeId: String(st.route_id ?? ""), route: r?.short || String(st.route_id ?? "").split("-")[0], mode: r?.mode || null,
      headsign: st.trip_headsign || st.stop_headsign || "", scheduled: sched, predicted, delay, status, vehicleId: fresh ? u.vehicleId : null,
      dueMin: Math.max(0, Math.round((when - nowSec) / 60)) });
  }
  return rows.sort((a, b) => (a.predicted ?? a.scheduled) - (b.predicted ?? b.scheduled)).slice(0, limit);
}

// ------------------------------------------------------------------------------------------------ static index (from the bake)
// routes.json {routes:[{id, short, type, color, agency, heads}]}; stops.json {stops:[[id, code, name, lat, lon, locType, parent, routeIdx[]]]}
export function buildIndex(routesJson, stopsJson) {
  const routes = new Map(), stops = new Map(), byShort = new Map();
  const list = routesJson?.routes || [];
  list.forEach((r) => { const o = { ...r, mode: modeOf(r.type) }; routes.set(r.id, o); (byShort.get(r.short.toLowerCase()) || byShort.set(r.short.toLowerCase(), []).get(r.short.toLowerCase())).push(o); });
  const rows = stopsJson?.stops || [];
  rows.forEach((s) => stops.set(s[0], { id: s[0], code: s[1], name: s[2], lat: s[3], lon: s[4], station: s[5] === 1, parent: s[6] >= 0 ? rows[s[6]][0] : null, routes: (s[7] || []).map((i) => list[i]?.id).filter(Boolean) }));
  for (const s of stops.values()) if (s.parent && stops.get(s.parent)) { const p = stops.get(s.parent); (p.children ||= []).push(s.id); for (const r of s.routes) if (!p.routes.includes(r)) p.routes.push(r); }
  for (const s of stops.values()) s.modes = [...new Set(s.routes.map((id) => routes.get(id)?.mode).filter(Boolean))];
  return { routes, stops, byShort };
}
const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
// Former names people still type, mapped to the name in AT's data (Britomart station is Waitematā since the City Rail Link opened).
export const ALIASES = { britomart: "waitemata train station" };
const coreName = (nm) => nm.replace(/\b(ferry terminal|train station)\b/g, " ").replace(/\s+/g, " ").trim();
// Search routes by number, stops by name or stop number, ferry terminals and train stations by name. Best matches first.
export function search(index, q, limit = 12) {
  const n = norm(q); if (!n) return [];
  const out = [], words = n.split(" "), alias = ALIASES[n], weakOk = words.some((w) => w.length > 1);
  for (const r of index.routes.values()) {
    const s = norm(r.short); let score = 0;
    if (s === n) score = 100; else if (s.startsWith(n)) score = 70 - (s.length - n.length);
    else if (n.length > 2 && words.every((w) => norm(r.heads.join(" ")).includes(w))) score = 25;
    if (score) out.push({ kind: "route", id: r.id, score: score + (r.mode !== "bus" ? 3 : 0), route: r });
  }
  for (const s of index.stops.values()) {
    if (s.parent && index.stops.get(s.parent)) { if (s.code !== n) continue; } // platforms show under their station, unless asked for by number
    const nm = norm(s.name), core = coreName(nm); let score = 0;
    if (s.code && s.code === n) score = 95; else if (nm === n || core === n) score = 90; else if (alias && nm === alias) score = 88;
    else if (nm.startsWith(n) || core.startsWith(n)) score = 62;
    else if (weakOk && words.every((w) => nm.split(" ").some((t) => t.startsWith(w)))) score = 48; else if (weakOk && words.every((w) => nm.includes(w))) score = 30;
    if (!score) continue;
    if (!s.routes.length) score -= 40;
    score += (s.station ? 6 : 0) + (s.modes.includes("ferry") ? 14 : 0) + (s.modes.includes("train") ? 12 : 0) + Math.min(6, s.routes.length);
    out.push({ kind: s.modes.includes("ferry") && !s.modes.includes("bus") ? "ferry" : s.modes.includes("train") ? "station" : "stop", id: s.id, score, stop: s });
  }
  return out.sort((a, b) => b.score - a.score || (a.route?.short || a.stop?.name || "").localeCompare(b.route?.short || b.stop?.name || "")).slice(0, limit);
}

// Without trip updates we can still say which vehicles are out on the routes that serve a stop, and how far away they are
// in a straight line. That is not an arrival time and the page never calls it one.
export function vehiclesForStop(stop, vehicles, max = 8) {
  if (!stop) return [];
  const rs = new Set(stop.routes), here = toNZTM(stop.lat, stop.lon);
  return vehicles.filter((v) => v.routeId && rs.has(v.routeId)).map((v) => { const p = toNZTM(v.lat, v.lon); return { ...v, metres: Math.round(Math.hypot(p[0] - here[0], p[1] - here[1])) }; })
    .sort((a, b) => a.metres - b.metres).slice(0, max);
}

// ------------------------------------------------------------------------------------------------ sun over Auckland
// NOAA solar position (good to a fraction of a degree). Returns degrees: elevation above the horizon, azimuth clockwise from north.
export function sunPosition(ms, lat = -36.8485, lon = 174.7633) {
  const jd = ms / 86400000 + 2440587.5, T = (jd - 2451545) / 36525;
  const L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360, M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const C = Math.sin(M * RAD) * (1.914602 - T * (0.004817 + 0.000014 * T)) + Math.sin(2 * M * RAD) * (0.019993 - 0.000101 * T) + Math.sin(3 * M * RAD) * 0.000289;
  const lambda = L0 + C - 0.00569 - 0.00478 * Math.sin((125.04 - 1934.136 * T) * RAD);
  const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60, eps = eps0 + 0.00256 * Math.cos((125.04 - 1934.136 * T) * RAD);
  const decl = Math.asin(Math.sin(eps * RAD) * Math.sin(lambda * RAD));
  const y = Math.tan((eps / 2) * RAD) ** 2;
  const eqt = 4 / RAD * (y * Math.sin(2 * L0 * RAD) - 2 * e * Math.sin(M * RAD) + 4 * e * y * Math.sin(M * RAD) * Math.cos(2 * L0 * RAD) - 0.5 * y * y * Math.sin(4 * L0 * RAD) - 1.25 * e * e * Math.sin(2 * M * RAD));
  const utcMin = ((ms / 60000) % 1440 + 1440) % 1440, tst = ((utcMin + eqt + 4 * lon) % 1440 + 1440) % 1440;
  const ha = (tst / 4 < 0 ? tst / 4 + 180 : tst / 4 - 180) * RAD, phi = lat * RAD;
  const cosZ = Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(ha), zen = Math.acos(Math.min(1, Math.max(-1, cosZ)));
  let az = Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(phi) - Math.tan(decl) * Math.cos(phi)) / RAD + 180;
  az = (az + 360) % 360;
  return { elevation: 90 - zen / RAD, azimuth: az };
}
