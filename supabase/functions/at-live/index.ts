// assembl lab · at-live: Auckland Transport realtime trip updates, service alerts and (optionally) the timetable at a stop,
// passed through for https://lab.assembl.co.nz/auckland/live/. NOT DEPLOYED: Kate decides. Deploy with
//   supabase functions deploy at-live --no-verify-jwt        and set the secret once: supabase secrets set AT_API_KEY=...
// The key is read from Deno.env and sent only in AT's Ocp-Apim-Subscription-Key header. It is never returned or logged.
//
//   GET /functions/v1/at-live                 → { tripUpdates: {header, entity}, alerts: {header, entity}, ... }
//   GET /functions/v1/at-live?stop=ID[,ID]    → the same, plus stops[ID].trips: the timetable at that stop for the next 2 hours
//
// Sources (AT developer portal, https://dev-portal.at.govt.nz/realtime-api): /realtime/legacy/tripupdates and
// /realtime/legacy/servicealerts (the same base the bus-positions function uses for vehicle locations). The stop timetable uses
// the AT GTFS API (https://dev-portal.at.govt.nz/GTFS-API) /gtfs/v3/stops/{id}/stoptrips: its query form is written from AT's
// portal and has NOT been checked against a live answer yet (no key here). The answer says so in `stopTripsVerified: false`.
// Licence: AT open data, Creative Commons Attribution 4.0 International, under the AT API terms of use.

const AT = "https://api.at.govt.nz";
const TIMEOUT_MS = 8000;
const TTL = { tripupdates: 10_000, alerts: 60_000, stoptrips: 60_000 };
const ALLOWED = [/^https:\/\/lab\.assembl\.co\.nz$/, /^https:\/\/([a-z0-9-]+\.)?assembl-lab\.pages\.dev$/, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];
export const LICENCE = { name: "Creative Commons Attribution 4.0 International", url: "https://creativecommons.org/licenses/by/4.0/", attribution: "Contains Auckland Transport data, CC BY 4.0", terms: "https://dev-portal.at.govt.nz/api-terms-of-use" };

export function corsFor(origin: string | null): Record<string, string> {
  const ok = !!origin && ALLOWED.some((r) => r.test(origin));
  return { ...(ok ? { "Access-Control-Allow-Origin": origin as string } : {}), "Vary": "Origin", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "content-type, accept" };
}

const n = (v: unknown) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? undefined : Number(v));
const ev = (e: any) => (e && (e.delay !== undefined || e.time !== undefined) ? { delay: n(e.delay), time: n(e.time) } : undefined);

// keep only what the page reads; AT sends the latest stop event per trip
export function trimTripUpdates(j: any) {
  const src = j?.response || j || {}, out: any[] = [];
  for (const e of src.entity || []) {
    const tu = e?.trip_update; if (!tu?.trip?.trip_id) continue;
    const stus = Array.isArray(tu.stop_time_update) ? tu.stop_time_update : tu.stop_time_update ? [tu.stop_time_update] : [];
    out.push({ id: String(e.id ?? tu.trip.trip_id), trip_update: {
      trip: { trip_id: String(tu.trip.trip_id), route_id: tu.trip.route_id, schedule_relationship: n(tu.trip.schedule_relationship), start_date: tu.trip.start_date, start_time: tu.trip.start_time },
      vehicle: tu.vehicle?.id ? { id: String(tu.vehicle.id) } : undefined,
      stop_time_update: stus.slice(-1).map((s: any) => ({ stop_sequence: n(s.stop_sequence), stop_id: s.stop_id, arrival: ev(s.arrival), departure: ev(s.departure) })),
      timestamp: n(tu.timestamp), delay: n(tu.delay) } });
  }
  return { header: { timestamp: n(src.header?.timestamp) }, entity: out };
}
export function trimAlerts(j: any) {
  const src = j?.response || j || {}, out: any[] = [];
  const tr = (t: any) => (t?.translation ? { translation: t.translation.map((x: any) => ({ text: String(x.text ?? "").slice(0, 2000), language: x.language })) } : undefined);
  for (const e of src.entity || []) {
    const a = e?.alert; if (!a) continue;
    out.push({ id: String(e.id ?? out.length), alert: {
      active_period: (a.active_period || []).map((p: any) => ({ start: n(p.start), end: n(p.end) })),
      informed_entity: (a.informed_entity || []).map((x: any) => ({ route_id: x.route_id, stop_id: x.stop_id })),
      cause: a.cause, effect: a.effect, header_text: tr(a.header_text), description_text: tr(a.description_text) } });
  }
  return { header: { timestamp: n(src.header?.timestamp) }, entity: out };
}
// JSON:API resource objects → the fields arrivalsForStop() reads (auckland/live/transit.js)
export function mapStopTrips(j: any, serviceDate: string) {
  const list = Array.isArray(j?.data) ? j.data : [];
  return list.map((d: any) => { const a = d?.attributes || {}; return {
    trip_id: a.trip_id, route_id: a.route_id, arrival_time: a.arrival_time, departure_time: a.departure_time, stop_sequence: n(a.stop_sequence),
    trip_headsign: a.trip_headsign, stop_headsign: a.stop_headsign, service_date: String(a.service_date || serviceDate).slice(0, 10) }; }).filter((t: any) => t.trip_id);
}
export function nzNow(ms: number) { // date and hour in Auckland
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-NZ", { timeZone: "Pacific/Auckland", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit" }).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) };
}
export const validStopId = (s: string) => /^[A-Za-z0-9_.:-]{1,40}$/.test(s) && s !== "__proto__" && s !== "constructor";

const cache = new Map<string, { at: number; value: unknown }>(); // finished values only, never an in-flight promise
async function cached<T>(key: string, ttl: number, now: number, get: () => Promise<T>): Promise<T> {
  const hit = cache.get(key); if (hit && now - hit.at < ttl) return hit.value as T;
  const value = await get(); cache.set(key, { at: now, value }); if (cache.size > 500) cache.delete(cache.keys().next().value as string); return value;
}
async function atGet(path: string, key: string, f: typeof fetch) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const r = await f(AT + path, { headers: { "Ocp-Apim-Subscription-Key": key, Accept: "application/json" }, signal: ctl.signal });
    if (!r.ok) throw new Error(`AT answered ${r.status}`);
    return await r.json();
  } finally { clearTimeout(t); }
}

export async function handler(req: Request, deps: { fetch?: typeof fetch; key?: string | undefined; now?: () => number } = {}): Promise<Response> {
  const f = deps.fetch || fetch, now = (deps.now || Date.now)(), cors = corsFor(req.headers.get("origin"));
  const json = (body: unknown, status = 200, cacheSec = 0) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": cacheSec ? `public, max-age=${cacheSec}` : "no-store" } });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...cors, "Access-Control-Max-Age": "86400" } });
  if (req.method !== "GET") return json({ error: "method_not_allowed" }, 405);
  const key = "key" in deps ? deps.key : (globalThis as any).Deno?.env?.get("AT_API_KEY");
  if (!key) return json({ error: "not_configured", message: "The Auckland Transport key is not set on this function." }, 503);

  const url = new URL(req.url), stops = (url.searchParams.get("stop") || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (stops.length > 6 || !stops.every(validStopId)) return json({ error: "bad_stop" }, 400);
  const base = { fetchedAt: new Date(now).toISOString(), source: { name: "Auckland Transport realtime API", url: "https://dev-portal.at.govt.nz/realtime-api" }, licence: LICENCE };

  const [tu, al] = await Promise.allSettled([
    cached("tu", TTL.tripupdates, now, async () => trimTripUpdates(await atGet("/realtime/legacy/tripupdates", key, f))),
    cached("al", TTL.alerts, now, async () => trimAlerts(await atGet("/realtime/legacy/servicealerts", key, f))),
  ]);
  const out: any = { ...base,
    tripUpdates: tu.status === "fulfilled" ? tu.value : { error: "unavailable", reason: String((tu as PromiseRejectedResult).reason?.message || "failed").slice(0, 120) },
    alerts: al.status === "fulfilled" ? al.value : { error: "unavailable", reason: String((al as PromiseRejectedResult).reason?.message || "failed").slice(0, 120) } };
  if (stops.length) {
    const { date, hour } = nzNow(now); out.stops = {}; out.stopTripsVerified = false;
    out.stopTripsSource = { name: "Auckland Transport GTFS API", url: "https://dev-portal.at.govt.nz/GTFS-API" };
    await Promise.all(stops.map(async (id) => {
      try {
        const q = `/gtfs/v3/stops/${encodeURIComponent(id)}/stoptrips?filter[date]=${date}&filter[start_hour]=${hour}&filter[hour_range]=2`;
        out.stops[id] = { trips: await cached("st:" + id + ":" + date + ":" + hour, TTL.stoptrips, now, async () => mapStopTrips(await atGet(q, key, f), date)) };
      } catch (e) { out.stops[id] = { error: "unavailable", reason: String((e as Error)?.message || "failed").slice(0, 120) }; }
    }));
  }
  const failed = !!out.tripUpdates.error;
  return json(out, failed ? 502 : 200, failed ? 0 : 5);
}

if ((globalThis as any).Deno?.serve) (globalThis as any).Deno.serve((req: Request) => handler(req));
