// Electricity retail: who sells power where, and what households pay for it.
//
// retailers: Electricity Authority EMI "Market share trends by network reporting region" (CC BY 4.0). One CSV with a row per
//   month × network region × retailer since 2003 (~9.7 MB, sorted by month). We read the dataset listing for the newest file,
//   then fetch only its tail with a byte range (~300 KB covers the latest month) and keep the latest month's rows: every
//   retailer's ICP count and share nationally and in each of the 40 network regions. Updated monthly, about two weeks in.
//
// tariffs: MBIE "Quarterly Survey of Domestic Electricity Prices" (QSDEP), the modelled residential price (8,000 kWh/yr,
//   incl. GST) split into lines and energy for 42 locations and NZ. MBIE's site sits behind a bot wall, so this is a
//   snapshot copied from the published report (./snapshots/qsdep.json) with its retrieval date; quarterly (Feb/May/Aug/Nov).
//
// Neither source carries any retailer's actual plan prices: no public dataset does (Powerswitch holds them under supply
// agreements; Ahiko sells an API). A retailer's own tariff is "Your data" and only appears when the retailer supplies it.
import { createRequire } from "node:module";
import { getText, envelope, memo, round, splitCSV } from "./util.js";
const QSDEP = createRequire(import.meta.url)("./snapshots/qsdep.json");

const LIST = "https://www.emi.ea.govt.nz/Retail/Datasets/MarketStructure";
const BLOB = "https://emidatasets.blob.core.windows.net/publicdata/Datasets/Retail/MarketStructure";
const TAIL_BYTES = 400_000;

// lab place → EMI network reporting region and QSDEP survey location
export const PLACE_MAP = {
  auckland: { region: "Auckland (Vector)", location: "Auckland Central" },
  hamilton: { region: "Waikato (WEL Networks)", location: "Hamilton" },
  wellington: { region: "Wellington (Wellington Electricity)", location: "Wellington City" },
  christchurch: { region: "Central Canterbury (Orion New Zealand)", location: "Christchurch" },
};

export const slug = (s) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Newest file name from the EMI listing page; falls back to a date-stamped guess if the page is unreadable.
export function newestFile(html) {
  const names = [...html.matchAll(/(\d{8})_MarketShareTrendsByNetworkReportingRegion\.csv/g)].map((m) => m[1]).sort();
  if (!names.length) throw new Error("retailers: no file in EMI listing");
  return `${names.at(-1)}_MarketShareTrendsByNetworkReportingRegion.csv`;
}

// Parse the tail of the CSV: drop the partial first line, keep rows of the latest month.
export function parseMarketShare(tail, fileName) {
  const lines = tail.split(/\r?\n/).slice(1).filter(Boolean);
  const rows = lines.map(splitCSV).filter((r) => r.length >= 6 && /^\d{4}-\d{2}-\d{2}$/.test(r[0]));
  if (!rows.length) throw new Error("retailers: no rows in tail");
  const month = rows.reduce((m, r) => (r[0] > m ? r[0] : m), "");
  const latest = rows.filter((r) => r[0] === month);
  const byRetailer = new Map(), regions = {};
  for (const [, region, code, name, icp] of latest) {
    const n = parseInt(icp, 10); if (!isFinite(n)) continue;
    const r = byRetailer.get(code) || { code, name, slug: slug(name), icps: 0, regions: 0 };
    r.icps += n; r.regions += 1; byRetailer.set(code, r);
    (regions[region] ||= []).push({ code, name, slug: slug(name), icps: n });
  }
  const total = [...byRetailer.values()].reduce((s, r) => s + r.icps, 0);
  const national = [...byRetailer.values()].sort((a, b) => b.icps - a.icps)
    .map((r) => ({ ...r, sharePct: round((100 * r.icps) / total, 2) }));
  for (const k of Object.keys(regions)) {
    const t = regions[k].reduce((s, r) => s + r.icps, 0);
    regions[k] = regions[k].sort((a, b) => b.icps - a.icps).map((r) => ({ ...r, sharePct: round((100 * r.icps) / t, 2) }));
  }
  const big4 = national.slice(0, 4).reduce((s, r) => s + r.sharePct, 0);
  return envelope({
    id: "retailers", label: "Electricity retailers by connections (ICPs)", value: national.length, unit: "retailers with connections",
    asOf: month, period: `month ended ${month}`,
    values: { month, totalIcps: total, retailers: national, regions, regionNames: Object.keys(regions).sort(), big4SharePct: round(big4, 1), file: fileName },
    cadence: "monthly", live: true,
    source: { name: "Electricity Authority EMI, market share trends by network reporting region", url: LIST },
    note: "Connections (ICPs) each retailer bills, by the network region they sit in. Says who sells where, not what they charge.",
  });
}

export function fetchRetailers({ retailer } = {}) {
  return memo("retailers", 6 * 3600e3, async () => {
    let file;
    try { file = newestFile(await getText(LIST, { ms: 6000 })); }
    catch (e) { file = "20260930_MarketShareTrendsByNetworkReportingRegion.csv"; }
    const url = `${BLOB}/${file}`;
    const head = await fetch(url, { method: "HEAD", redirect: "follow" });
    const len = parseInt(head.headers.get("content-length") || "0", 10);
    if (!len) throw new Error("retailers: no content-length");
    const tail = await getText(url, { headers: { Range: `bytes=${Math.max(0, len - TAIL_BYTES)}-${len - 1}` }, ms: 12000 });
    return parseMarketShare(tail, file);
  }).then((e) => { // ?retailer=<slug|code> adds that retailer's footprint without disturbing the shared memo
    if (!retailer) return e;
    const footprint = retailerFootprint(e, retailer);
    return { ...e, values: { ...e.values, footprint, retailer: footprint ? footprint.slug : null } };
  });
}

// One retailer's footprint (slug or EMI code) from the retailers envelope: national share and the regions it serves, strongest first.
export function retailerFootprint(env, who) {
  const w = (who || "").toLowerCase();
  const r = env.values.retailers.find((x) => x.slug === w || x.code.toLowerCase() === w);
  if (!r) return null;
  const regions = Object.entries(env.values.regions).map(([region, rows]) => { const hit = rows.find((x) => x.code === r.code); return hit ? { region, icps: hit.icps, sharePct: hit.sharePct, rank: rows.indexOf(hit) + 1 } : null; })
    .filter(Boolean).sort((a, b) => b.sharePct - a.sharePct);
  return { ...r, rank: env.values.retailers.indexOf(r) + 1, regions };
}

// QSDEP snapshot → envelope for a place (or NZ)
export function buildTariffs(place, snap = QSDEP) {
  const loc = PLACE_MAP[place]?.location;
  const row = snap.locations.find((l) => l.location === loc) || snap.national;
  return envelope({
    id: "tariffs", label: `Residential electricity price, ${row.location}`, value: row.totalCents, unit: "c/kWh incl. GST",
    asOf: snap.surveyDate, period: `survey of ${snap.surveyDate}`,
    values: { location: row.location, totalCents: row.totalCents, linesCents: row.linesCents, energyCents: row.energyCents,
      national: snap.national, quarterChangePct: snap.national.quarterChangePct, basis: snap.basis, locations: snap.locations, retrieved: snap.retrieved, snapshot: true },
    cadence: "quarterly", live: false,
    source: { name: `MBIE, Quarterly Survey of Domestic Electricity Prices, ${snap.surveyDate}`, url: snap.url },
    note: `Modelled average for an ${snap.basis} household, all retailers in the area; not any one retailer's plan. Copied ${snap.retrieved}; MBIE's site refuses automated fetches.`,
  });
}
export async function fetchTariffs({ place }) { return buildTariffs(place); }
