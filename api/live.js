// assembl lab · live and latest public data. Key-less public sources only, cached at the edge.
//
// GET /api/live/?feeds=weather,power,fuel&place=auckland&district=waikato[&lat=-36.86&lon=174.77&radius=150]
//   lat/lon (or bbox=minLon,minLat,maxLon,maxLat) only steer the footprint feed; without them it uses the place's coordinates.
//   retailer=<slug or EMI code> adds that retailer's regional footprint to the retailers feed.
//   → { type:"assembl.feeds", version:2, fetchedAt, place, feeds:{ <id>: envelope | {id,error} } }
//   envelope = { id, label, value, values, unit, asOf, period, fetchedAt, cadence, source:{name,url}, truth:"Live"|"Latest published", truthLabel, note? }
//
// GET /api/live/?place=auckland (no feeds) keeps the original v1 answer used by /live.js:
//   → { type:"assembl.live", version:1, fetchedAt, weather:{...}|null, power:{...}|null, errors:[...] }
import { runFeeds, FEEDS } from "./_feeds/index.js";
import { PLACES, DISTRICTS } from "./_feeds/places.js";

const clean = (s, ok) => { const v = (s || "").toString().toLowerCase().trim(); return ok[v] ? v : null; };

export default async function handler(req, res) {
  const q = req.query || {};
  const place = clean(q.place, PLACES) || "auckland";
  const district = clean(q.district, DISTRICTS) || PLACES[place].district || "auckland-district";
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (!q.feeds) { // v1, unchanged shape
    const { feeds } = await runFeeds(["weather", "power"], { place, district });
    const w = feeds.weather, p = feeds.power;
    const v1w = w.error ? null : { ...w.values, hourly: w.values.hourly, source: w.source };
    const v1p = p.error ? null : { node: p.values.node, date: p.values.date, interim: p.values.interim, avgCentsPerKWh: p.values.avgCentsPerKWh, minCents: p.values.minCents,
      maxCents: p.values.maxCents, periods: p.values.periods, note: p.note, source: p.source };
    res.setHeader("Cache-Control", "public, s-maxage=900, stale-while-revalidate=3600");
    return res.status(200).json({ type: "assembl.live", version: 1, fetchedAt: new Date().toISOString(), weather: v1w, power: v1p,
      errors: [w, p].filter((x) => x.error).map((x) => x.error) });
  }

  const ids = q.feeds.toString().split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const num = (s) => { const v = parseFloat(s); return isFinite(v) ? v : undefined; };
  const geo = { lat: num(q.lat), lon: num(q.lon ?? q.lng), radius: num(q.radius), bbox: typeof q.bbox === "string" && /^[-\d.,]{7,80}$/.test(q.bbox) ? q.bbox : undefined,
    retailer: typeof q.retailer === "string" && /^[a-z0-9-]{2,60}$/i.test(q.retailer) ? q.retailer.toLowerCase() : undefined }; // steers the retailers feed only
  const { feeds, cache, unknown } = await runFeeds(ids, { place, district, ...geo });
  res.setHeader("Cache-Control", `public, s-maxage=${cache.sMaxAge}, stale-while-revalidate=${cache.swr}`);
  return res.status(200).json({ type: "assembl.feeds", version: 2, fetchedAt: new Date().toISOString(), place, district, feeds,
    ...(unknown.length ? { unknown, available: Object.keys(FEEDS) } : {}) });
}
