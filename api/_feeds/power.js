// Electricity Authority EMI public datasets (CC BY 4.0).
// power: yesterday's (or the latest) final or interim nodal prices, 48 half-hours, for the place's grid node.
// genmix: the latest full month of grid-connected generation by fuel, from the monthly Generation_MD file (~0.8 MB).
import { getText, envelope, memo, round, nzToday, MONTHS, splitCSV } from "./util.js";
import { placeOf } from "./places.js";

const BLOB = "https://emidatasets.blob.core.windows.net/publicdata/Datasets/Wholesale";
const NODE_NAMES = { OTA2201: "Ōtāhuhu (OTA2201)", HAM2201: "Hamilton (HAM2201)", HAY2201: "Haywards (HAY2201)", ISL2201: "Islington (ISL2201)" };

export function parsePrices(csv, node, ymd, interim) {
  const lines = csv.trim().split(/\r?\n/); const head = splitCSV(lines[0]).map((h) => h.trim());
  const iNode = head.findIndex((h) => /pointofconnection|^node|poc/i.test(h)), iPrice = head.findIndex((h) => /dollarspermegawatthour|price/i.test(h)),
    iTP = head.findIndex((h) => /tradingperiod|^tp$/i.test(h));
  if (iNode < 0 || iPrice < 0) throw new Error("power: unexpected columns");
  const rows = lines.slice(1).map(splitCSV).filter((r) => r[iNode] === node);
  if (!rows.length) throw new Error("power: node not in file");
  const tp = rows.map((r, i) => ({ tp: iTP >= 0 ? +r[iTP] : i + 1, mwh: +r[iPrice] })).sort((a, b) => a.tp - b.tp);
  const avg = tp.reduce((s, x) => s + x.mwh, 0) / tp.length;
  const date = `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6)}`;
  return envelope({
    id: "power", label: `Wholesale power, ${NODE_NAMES[node] || node}`, value: round(avg / 10, 2), unit: "c/kWh", asOf: date,
    period: date + (interim ? " (interim)" : ""),
    values: { node: NODE_NAMES[node] || node, date, interim, avgCentsPerKWh: round(avg / 10, 2), minCents: round(Math.min(...tp.map((x) => x.mwh)) / 10, 2),
      maxCents: round(Math.max(...tp.map((x) => x.mwh)) / 10, 2), periods: tp.map((x) => round(x.mwh / 10, 2)) },
    cadence: "daily", live: true,
    source: { name: "Electricity Authority EMI", url: "https://www.emi.ea.govt.nz/Wholesale/Datasets/DispatchAndPricing/FinalEnergyPrices" },
    note: "Wholesale spot price before network, retail margin and GST." + (interim ? " Interim prices, replaced by final prices once declared." : ""),
  });
}
export function fetchPower({ place }) {
  const node = placeOf(place).node;
  return memo("power:" + node, 30 * 60e3, async () => {
    const t = nzToday(); const base = Date.UTC(t.year, t.month - 1, t.day);
    let last;
    for (let back = 0; back <= 4; back++) {
      const ymd = new Date(base - back * 864e5).toISOString().slice(0, 10).replace(/-/g, "");
      for (const interim of [false, true]) {
        try {
          const csv = await getText(`${BLOB}/DispatchAndPricing/FinalEnergyPrices/${ymd}_FinalEnergyPrices${interim ? "_I" : ""}.csv`, { ms: 6000 });
          return parsePrices(csv, node, ymd, interim);
        } catch (e) { last = e; }
      }
    }
    throw last || new Error("power: no recent file");
  });
}

// Generation mix. Fuel codes vary in case and spelling across months (Hydro/HYD, Geo/GEO ...).
const FUEL = { hyd: "hydro", hydro: "hydro", geo: "geothermal", win: "wind", wind: "wind", sol: "solar", solar: "solar", gas: "gas", coal: "coal", diesel: "diesel", wood: "wood", ele: "battery" };
const RENEW = new Set(["hydro", "geothermal", "wind", "solar", "wood"]);
export function parseGeneration(csv, yyyymm) {
  const lines = csv.replace(/^﻿/, "").trim().split(/\r?\n/); const head = splitCSV(lines[0]);
  const iFuel = head.indexOf("Fuel_Code"), tpCols = head.map((h, i) => (/^TP\d+$/.test(h) ? i : -1)).filter((i) => i >= 0);
  if (iFuel < 0 || !tpCols.length) throw new Error("genmix: unexpected columns");
  const kwh = {};
  for (const l of lines.slice(1)) {
    const r = splitCSV(l); const f = FUEL[(r[iFuel] || "").toLowerCase()] || "other";
    let s = 0; for (const i of tpCols) s += +r[i] || 0;
    kwh[f] = (kwh[f] || 0) + s;
  }
  const gen = Object.entries(kwh).filter(([f]) => f !== "battery"); // battery discharge is storage, not a source
  const total = gen.reduce((s, [, v]) => s + v, 0); if (!total) throw new Error("genmix: empty");
  const share = Object.fromEntries(gen.map(([f, v]) => [f, round((v / total) * 100, 1)]).sort((a, b) => b[1] - a[1]));
  const renew = gen.filter(([f]) => RENEW.has(f)).reduce((s, [, v]) => s + v, 0);
  const period = `${MONTHS[+yyyymm.slice(4) - 1]} ${yyyymm.slice(0, 4)}`;
  return envelope({
    id: "genmix", label: "Electricity generation mix, New Zealand", value: round((renew / total) * 100, 1), unit: "% renewable", asOf: `${yyyymm.slice(0, 4)}-${yyyymm.slice(4)}`, period,
    values: { renewablePct: round((renew / total) * 100, 1), sharePct: share, totalGWh: round(total / 1e6, 0) },
    cadence: "monthly", live: false, source: { name: "Electricity Authority EMI, generation output by plant", url: "https://www.emi.ea.govt.nz/Wholesale/Datasets/Generation/Generation_MD" },
    note: "Grid-connected metered generation; small embedded solar is not included.",
  });
}
export function fetchGenmix() {
  return memo("genmix", 6 * 3600e3, async () => {
    const t = nzToday(); let last;
    for (let back = 1; back <= 3; back++) {
      const d = new Date(Date.UTC(t.year, t.month - 1 - back, 1)); const ym = d.toISOString().slice(0, 7).replace("-", "");
      try { return parseGeneration(await getText(`${BLOB}/Generation/Generation_MD/${ym}_Generation_MD.csv`), ym); } catch (e) { last = e; }
    }
    throw last;
  });
}
