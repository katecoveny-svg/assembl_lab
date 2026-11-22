// assembl lab · the whole /api/live/ answer as plain data, so one piece of code serves both runtimes:
//   functions/api/live.js  (Cloudflare Pages Functions: the lab today)   and   api/live.js  (the old Vercel Node function).
// Takes the query string as URLSearchParams and returns { status, headers, body }. No req/res, no process, no Buffer.
//
// GET /api/live/?feeds=weather,power,fuel&place=auckland&district=waikato[&lat=-36.86&lon=174.77&radius=150]
//   lat/lon (or bbox=minLon,minLat,maxLon,maxLat) steer the footprint feed and the site feed; without them footprint uses the place's coordinates.
//   retailer=<slug or EMI code> adds that retailer's regional footprint to the retailers feed.
//   → { type:"assembl.feeds", version:2, fetchedAt, place, district, feeds:{ <id>: envelope | {id,error} } }
//   envelope = { id, label, value, values, unit, asOf, period, fetchedAt, cadence, source:{name,url}, truth:"Live"|"Latest published", truthLabel, status, statusLabel, note? }
//   feeds=site&lat=&lon= returns feeds.site.facts: one envelope per fact about that point of land (see api/_feeds/site.js).
//
// GET /api/live/?place=auckland (no feeds) keeps the original v1 answer used by /live.js:
//   → { type:"assembl.live", version:1, fetchedAt, weather:{...}|null, power:{...}|null, errors:[...] }
import { runFeeds, FEEDS } from "./index.js";
import { PLACES, DISTRICTS } from "./places.js";

const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const clean = (s, ok) => { const v = (s || "").toString().toLowerCase().trim(); return has(ok, v) ? v : null; };
const num = (s) => { const v = parseFloat(s); return isFinite(v) ? v : undefined; };

export const CORS = { "Access-Control-Allow-Origin": "*", "X-Content-Type-Options": "nosniff" };

export async function handleLive(q /* URLSearchParams */) {
  const place = clean(q.get("place"), PLACES) || "auckland";
  const district = clean(q.get("district"), DISTRICTS) || PLACES[place].district || "auckland-district";
  const headers = { ...CORS, "Content-Type": "application/json; charset=utf-8" };

  const feedsParam = q.get("feeds");
  if (!feedsParam) { // v1, unchanged shape
    const { feeds } = await runFeeds(["weather", "power"], { place, district });
    const w = feeds.weather, p = feeds.power;
    const v1w = w.error ? null : { ...w.values, hourly: w.values.hourly, source: w.source };
    const v1p = p.error ? null : { node: p.values.node, date: p.values.date, interim: p.values.interim, avgCentsPerKWh: p.values.avgCentsPerKWh, minCents: p.values.minCents,
      maxCents: p.values.maxCents, periods: p.values.periods, note: p.note, source: p.source };
    headers["Cache-Control"] = w.error || p.error ? "no-store" : "public, s-maxage=900, stale-while-revalidate=3600"; // a failure is never cached
    return { status: 200, headers, body: { type: "assembl.live", version: 1, fetchedAt: new Date().toISOString(), weather: v1w, power: v1p,
      errors: [w, p].filter((x) => x.error).map((x) => x.error) } };
  }

  const ids = feedsParam.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const bbox = q.get("bbox"), retailer = q.get("retailer");
  const geo = { lat: num(q.get("lat")), lon: num(q.get("lon") ?? q.get("lng")), radius: num(q.get("radius")), bbox: typeof bbox === "string" && /^[-\d.,]{7,80}$/.test(bbox) ? bbox : undefined,
    retailer: typeof retailer === "string" && /^[a-z0-9-]{2,60}$/i.test(retailer) ? retailer.toLowerCase() : undefined }; // steers the retailers feed only
  const { feeds, cache, unknown } = await runFeeds(ids, { place, district, ...geo });
  headers["Cache-Control"] = cache ? `public, s-maxage=${cache.sMaxAge}, stale-while-revalidate=${cache.swr}` : "no-store";
  return { status: 200, headers, body: { type: "assembl.feeds", version: 2, fetchedAt: new Date().toISOString(), place, district, feeds,
    ...(unknown.length ? { unknown, available: Object.keys(FEEDS) } : {}) } };
}
