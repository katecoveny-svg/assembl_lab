// Stats NZ Selected price indexes (CC BY 4.0). One CSV of ~11 MB per monthly release, sorted by series.
// We never download all of it: fpi streams from the start and stops after the food subgroups (~2.3 MB);
// foodprices asks for a byte range starting ~3 MB in and stops after the last item it needs (~2.5 MB).
// Both are cached at the edge for a day (monthly data).
import { getText, streamLines, envelope, memo, round, nzToday, MONTHS, splitCSV } from "./util.js";

const BASE = "https://www.stats.govt.nz";
const csvUrl = (m, y) => `${BASE}/assets/Uploads/Selected-price-indexes/Selected-price-indexes-${MONTHS[m - 1]}-${y}/Download-data/selected-price-indexes-${MONTHS[m - 1].toLowerCase()}-${y}.csv`;
const SOURCE = (period, url) => ({ name: `Stats NZ, Selected price indexes: ${period}`, url });

// Find the latest release: try the predictable URL for the last three months, then the CSV download listing.
async function latestCsv() {
  return memo("spi:url", 6 * 3600e3, async () => {
    const t = nzToday();
    for (let back = 1; back <= 3; back++) {
      const d = new Date(Date.UTC(t.year, t.month - 1 - back, 1)); const m = d.getUTCMonth() + 1, y = d.getUTCFullYear();
      try { const head = await getText(csvUrl(m, y), { headers: { Range: "bytes=0-200" }, ms: 5000 }); if (/^"?Series_reference/.test(head)) return { url: csvUrl(m, y), m, y }; } catch (e) { /* try older */ }
    }
    const html = await getText(`${BASE}/large-datasets/csv-files-for-download/`);
    const links = [...html.replace(/\\\//g, "/").matchAll(/(\/assets\/Uploads\/Selected-price-indexes\/[^"&]*?selected-price-indexes-([a-z]+)-(\d{4})\.csv)/gi)]
      .map((x) => ({ url: BASE + x[1], m: MONTHS.findIndex((n) => n.toLowerCase() === x[2].toLowerCase()) + 1, y: +x[3] }))
      .filter((x) => x.m > 0).sort((a, b) => b.y * 12 + b.m - (a.y * 12 + a.m));
    if (!links.length) throw new Error("spi: no release found");
    return links[0];
  });
}

const FPI = { "CPIM.SE901": "Food", "CPIM.SE9011": "Fruit and vegetables", "CPIM.SE9012": "Meat, poultry and fish", "CPIM.SE9013": "Grocery food",
  "CPIM.SE9014": "Non-alcoholic beverages", "CPIM.SE9015": "Restaurant meals and ready-to-eat food" };
const periodLabel = (p) => `${MONTHS[+p.split(".")[1] - 1]} ${p.split(".")[0]}`;

// Lines → { series: [[period, value], ...] } for the wanted series. Returns false when the stream can stop.
export function seriesCollector(wanted, stopWhen) {
  const out = {}; let seenAll = false;
  return {
    out,
    line(l) {
      if (!l.startsWith('"CPIM')) return true;
      const r = splitCSV(l); const code = r[0];
      if (wanted[code]) { (out[code] = out[code] || []).push([r[1], +r[2]]); return true; }
      if (Object.keys(out).length === Object.keys(wanted).length) seenAll = true;
      return !(seenAll || stopWhen(code));
    },
  };
}

export function buildFpi(series, src) {
  const food = series["CPIM.SE901"]; if (!food || food.length < 13) throw new Error("fpi: food index missing");
  const last = food[food.length - 1][0];
  const chg = (s, back) => { if (!s || s.length <= back) return null; const a = s[s.length - 1][1], b = s[s.length - 1 - back][1]; return round(((a - b) / b) * 100, 1); };
  const groups = Object.entries(FPI).filter(([c]) => c !== "CPIM.SE901" && series[c]).map(([c, name]) => ({ code: c, name, annualPct: chg(series[c], 12), monthlyPct: chg(series[c], 1), index: series[c].at(-1)[1] }));
  const period = periodLabel(last);
  return envelope({
    id: "fpi", label: "Food prices, annual change", value: chg(food, 12), unit: "% a year", asOf: last.replace(".", "-"), period,
    values: { index: food.at(-1)[1], annualPct: chg(food, 12), monthlyPct: chg(food, 1), groups, trend: food.slice(-13).map(([p, v]) => ({ period: p, index: v })) },
    cadence: "monthly", live: false, source: SOURCE(period, src.url),
    note: "Changes computed from the published index levels; Stats NZ's own rounding can differ by 0.1.",
  });
}
export function fetchFpi() {
  return memo("fpi", 6 * 3600e3, async () => {
    const src = await latestCsv();
    const col = seriesCollector(FPI, (code) => /^CPIM\.SE901(AC|PC)|^CPIM\.SE9S/.test(code));
    await streamLines(src.url, (l) => col.line(l), { ms: 12000 });
    return buildFpi(col.out, src);
  });
}

// Average retail prices (the "Selected monthly weighted average prices" block)
export const ITEMS = {
  "CPIM.SAP0100": ["oranges", "Oranges", "kg"], "CPIM.SAP0101": ["bananas", "Bananas", "kg"], "CPIM.SAP0102": ["apples", "Apples", "kg"],
  "CPIM.SAP0103": ["kiwifruit", "Kiwifruit", "kg"], "CPIM.SAP0106": ["lettuce", "Lettuce", "kg"], "CPIM.SAP0107": ["broccoli", "Broccoli", "kg"],
  "CPIM.SAP0109": ["tomatoes", "Tomatoes", "kg"], "CPIM.SAP0110": ["carrots", "Carrots", "kg"], "CPIM.SAP0112": ["potatoes", "Potatoes", "kg"],
  "CPIM.SAP0116": ["beefMince", "Beef mince", "kg"], "CPIM.SAP0127": ["milk2l", "Milk, 2 L", "each"], "CPIM.SAP0129": ["cheese", "Cheese, mild cheddar", "kg"],
  "CPIM.SAP0130": ["eggs", "Eggs, dozen", "each"], "CPIM.SAP0131": ["butter", "Butter, 500 g", "each"], "CPIM.SAP0149": ["bread", "Bread, white 600 g", "each"],
};
export function buildFoodPrices(series, src) {
  const items = {}; let last = null;
  for (const [code, [key, name, per]] of Object.entries(ITEMS)) {
    const s = series[code]; if (!s || !s.length) continue;
    const [p, v] = s[s.length - 1]; last = !last || p > last ? p : last;
    const yearAgo = s.length > 12 ? s[s.length - 13][1] : null;
    items[key] = { name, price: v, per, period: p, annualPct: yearAgo ? round(((v - yearAgo) / yearAgo) * 100, 1) : null };
  }
  const n = Object.keys(items).length; if (n < 5) throw new Error("foodprices: too few items");
  const period = periodLabel(last);
  return envelope({
    id: "foodprices", label: "Average retail food prices", value: n, unit: "items", asOf: last.replace(".", "-"), period,
    values: { items }, cadence: "monthly", live: false, source: SOURCE(period, src.url),
  });
}
export function fetchFoodPrices() {
  return memo("foodprices", 6 * 3600e3, async () => {
    const src = await latestCsv();
    const maxCode = Object.keys(ITEMS).sort().at(-1);
    const run = async (from) => {
      const col = seriesCollector(ITEMS, (code) => code > maxCode && code.startsWith("CPIM.SAP"));
      await streamLines(src.url, (l) => col.line(l), { headers: { Range: `bytes=${from}-` }, ms: 12000 });
      return col.out;
    };
    // The price block starts ~3.46 MB in (Sept 2026 file) and moves ~15 KB later each month. Start a little before it;
    // if the first item is missing or cut short, step back further. Typical download ~2.1 MB.
    let out = {};
    for (const from of [3350000, 2900000, 2000000]) {
      out = await run(from);
      if (Object.keys(out).length === Object.keys(ITEMS).length && out["CPIM.SAP0100"]?.length >= 13) break;
    }
    return buildFoodPrices(out, src);
  });
}
