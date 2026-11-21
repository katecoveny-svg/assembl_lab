// Registry of live feeds. Each entry: fetch(params) → envelope, cadence (drives edge caching).
import { fetchWeather, fetchAir } from "./weather.js";
import { fetchPower, fetchGenmix } from "./power.js";
import { fetchFuel } from "./fuel.js";
import { fetchFpi, fetchFoodPrices, fetchRts } from "./statsnz.js";
import { fetchFx, fetchGdt } from "./markets.js";
import { fetchCalendar } from "./calendar.js";
import { fetchEd, fetchUrgentCare, fetchWastewater, fetchEdHistory } from "./health.js";
import { fetchAttendance, fetchVehicles } from "./people.js";
import { fetchFootprint } from "./linz.js";
import { fetchGrocery } from "./grocery.js";
import { fetchSite } from "./site.js";
import { fetchRetailers, fetchTariffs } from "./retail.js";
import { fetchGround, fetchSurface } from "./ground.js";
import { CADENCE_TTL, withStatus } from "./util.js";

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
  footprint: { fetch: fetchFootprint, cadence: "daily" }, // LINZ building outlines near lat/lon (or the place)
  site: { fetch: fetchSite, cadence: "hourly" }, // facts about one point of land (?lat=&lon=): parcel, zone, overlays, hazards, weather; one envelope per fact in .facts
  ground: { fetch: fetchGround, cadence: "weekly" }, // LINZ 1 m LiDAR bare-ground heights in a square round lat/lon (?radius= half-width in metres)
  surface: { fetch: fetchSurface, cadence: "weekly" }, // the same square from LINZ's surface model: tree tops and roofs
  grocery: { fetch: fetchGrocery, cadence: "annual" }, // Commerce Commission Annual Grocery Report: snapshot, not fetched
  rts: { fetch: fetchRts, cadence: "quarterly" }, // Stats NZ Retail Trade Survey, supermarket and hardware
  edhistory: { fetch: fetchEdHistory, cadence: "quarterly" },
  retailers: { fetch: fetchRetailers, cadence: "monthly" }, // EMI: every retailer's connections, nationally and by network region
  tariffs: { fetch: fetchTariffs, cadence: "quarterly" }, // MBIE QSDEP residential price for the place: snapshot, not fetched // national 6-hour series since the Sept 2023 baseline
};

// Run the requested feeds in parallel. One failing feed returns {id, error} and never fails the others.
export async function runFeeds(ids, params) {
  const known = (id) => Object.prototype.hasOwnProperty.call(FEEDS, id); // not "constructor" or "__proto__"
  const want = [...new Set(ids)].filter(known).slice(0, 24);
  const settled = await Promise.allSettled(want.map((id) => FEEDS[id].fetch(params)));
  const feeds = {};
  settled.forEach((s, i) => { feeds[want[i]] = s.status === "fulfilled" ? withStatus(s.value) : { id: want[i], error: String(s.reason?.message || s.reason).slice(0, 200) }; });
  // the shortest cadence among feeds that succeeded sets how long the edge may cache the combined answer
  const ok = want.filter((id) => !feeds[id].error && !feeds[id].stale && feeds[id].truth !== "Partial"); // a Partial answer (the site feed with a fact down) is retried soon too
  const ttl = (ok.length ? ok : want).map((id) => CADENCE_TTL[FEEDS[id].cadence]).reduce((a, b) => (a.sMaxAge <= b.sMaxAge ? a : b), CADENCE_TTL.quarterly);
  // if anything failed, cache briefly so a transient upstream error is retried soon
  const failed = want.length - ok.length;
  return { feeds, cache: failed ? { sMaxAge: Math.min(ttl.sMaxAge, 300), swr: 600 } : ttl, unknown: ids.filter((id) => !known(id)) };
}
