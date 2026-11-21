// Shared by the offline live-data tests: a stubbed fetch that answers from small saved fixtures and records every call.
import fs from "node:fs";
export const fx = (name) => JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), "utf8"));
export const json = (b, status = 200) => new Response(JSON.stringify(b), { status, headers: { "content-type": "application/json" } });
export const text = (b, status = 200) => new Response(b, { status });

// router: array of [predicate(url:URL), handler(url, init) → Response]; first match wins; no match = an unexpected host and the test fails loudly
export async function withFetch(routes, fn) {
  const real = globalThis.fetch, calls = [];
  globalThis.fetch = async (u, init) => {
    const url = new URL(typeof u === "string" ? u : u.url);
    calls.push({ url, href: url.href, init });
    for (const [match, h] of routes) if (match(url)) return h(url, init);
    throw new Error("unexpected fetch in an offline test: " + url.href.slice(0, 140));
  };
  try { return await fn(calls); } finally { globalThis.fetch = real; }
}
export const host = (h) => (u) => u.host === h;

// Every Auckland Council / LINZ layer answers with a real saved response; override per layer with `over` (a fixture object, a Response, or a function of the URL).
export function siteRoutes(over = {}) {
  const table = {
    LINZ_NZ_Primary_Parcels: fx("parcel"), Unitary_Plan_Base_Zone: fx("zone"), Flood_Plains: null, Flood_Prone_Areas: null, Overland_Flow_Paths: fx("olfp"),
    Coastal_Inundation_1_AEP: fx("coastal-empty"), Coastal_Inundation_1_AEP_1m_sea_level_rise: fx("coastal-empty"), Tsunami_Evacuation_Zones: fx("tsunami-empty"),
    Shallow_Landslide_Susceptibility: fx("landslide-shallow"), Large_Scale_Landslide_Susceptibility: fx("landslide-large"), Liquefaction_Vulnerability_Basic_Assessment: fx("liquefaction"),
    ...over,
  };
  const routes = [];
  routes.push([(u) => u.host === "api.open-meteo.com", () => (over.weather ? over.weather() : json(fx("weather")))]);
  routes.push([(u) => u.pathname.includes("/FeatureServer/0") && !u.pathname.endsWith("/query"), () => json(fx("layer-meta"))]);
  routes.push([(u) => u.pathname.endsWith("/query"), (u) => {
    const name = u.pathname.split("/").at(-4);
    if (name in table) {
      const v = table[name];
      if (v instanceof Response) return v;
      if (typeof v === "function") return v(u);
      if (v !== null) return json(v);
      // flood layers: empty at the point, the real saved "near" response when a 50 m reach is asked
      if (u.searchParams.get("distance")) return json(name === "Flood_Plains" ? fx("flood-plain-near") : fx("flood-prone-near"));
      return json(fx(name === "Flood_Plains" ? "flood-plain-empty" : "flood-prone-empty"));
    }
    return json(fx("overlays-empty")); // every overlay layer: a real empty answer
  }]);
  return routes;
}
