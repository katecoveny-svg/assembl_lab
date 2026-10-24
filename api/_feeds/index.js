// Registry of live feeds. Each entry: fetch(params) → envelope, cadence (drives edge caching).
import { fetchWeather, fetchAir } from "./weather.js";
import { fetchPower, fetchGenmix } from "./power.js";
import { fetchFuel } from "./fuel.js";
import { fetchFpi, fetchFoodPrices } from "./statsnz.js";
import { fetchFx, fetchGdt } from "./markets.js";
import { fetchCalendar } from "./calendar.js";
import { fetchEd, fetchUrgentCare, fetchWastewater } from "./health.js";
import { fetchAttendance, fetchVehicles } from "./people.js";
import { CADENCE_TTL } from "./util.js";

export const FEEDS = {
  weather: { fetch: fetchWeather, cadence: "hourly" },
  air: { fetch: fetchAir, cadence: "hourly" },
  power: { fetch: fetchPower, cadence: "daily" },
  genmix: { fetch: fetchGenmix, cadence: "monthly" },
  fuel: { fetch: fetchFuel, cadence: "weekly" },
  fpi: { fetch: fetchFpi, cadence: "monthly" },
  foodprices: { fetch: fetchFoodPrices, cadence: "monthly" },
  fx: { fetch: fetchFx, cadence: "daily" },
  gdt: { fetch: fetchGdt, cadence: "fortnightly" },
  calendar: { fetch: fetchCalendar, cadence: "daily" },
  ed: { fetch: fetchEd, cadence: "quarterly" },
  urgentcare: { fetch: fetchUrgentCare, cadence: "5-min" },
  wastewater: { fetch: fetchWastewater, cadence: "weekly" },
  attendance: { fetch: fetchAttendance, cadence: "quarterly" },
  vehicles: { fetch: fetchVehicles, cadence: "monthly" },
};

// Run the requested feeds in parallel. One failing feed returns {id, error} and never fails the others.
export async function runFeeds(ids, params) {
  const want = [...new Set(ids)].filter((id) => FEEDS[id]).slice(0, 16);
  const settled = await Promise.allSettled(want.map((id) => FEEDS[id].fetch(params)));
  const feeds = {};
  settled.forEach((s, i) => { feeds[want[i]] = s.status === "fulfilled" ? s.value : { id: want[i], error: String(s.reason?.message || s.reason).slice(0, 200) }; });
  // the shortest cadence among feeds that succeeded sets how long the edge may cache the combined answer
  const ok = want.filter((id) => !feeds[id].error);
  const ttl = (ok.length ? ok : want).map((id) => CADENCE_TTL[FEEDS[id].cadence]).reduce((a, b) => (a.sMaxAge <= b.sMaxAge ? a : b), CADENCE_TTL.quarterly);
  // if anything failed, cache briefly so a transient upstream error is retried soon
  const failed = want.length - ok.length;
  return { feeds, cache: failed ? { sMaxAge: Math.min(ttl.sMaxAge, 300), swr: 600 } : ttl, unknown: ids.filter((id) => !FEEDS[id]) };
}
