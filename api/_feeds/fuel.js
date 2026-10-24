// MBIE weekly fuel price monitoring (CC BY 4.0). The CSV is ~2.9 MB and in date order,
// so we ask for only its last ~48 KB with an HTTP Range request (the server supports byte ranges).
import { getText, envelope, memo, round, splitCSV } from "./util.js";

const URL_ = "https://www.mbie.govt.nz/assets/Data-Files/Energy/Weekly-fuel-price-monitoring/weekly-table.csv";
const NAMES = { "Regular Petrol": "petrol91", "Premium Petrol 95R": "petrol95", Diesel: "diesel" };

export function parseFuel(tail) {
  const rows = tail.split(/\r?\n/).map(splitCSV).filter((r) => r.length >= 7 && /^\d{4}w\d+$/.test(r[0]));
  if (!rows.length) throw new Error("fuel: no rows");
  const weeks = [...new Set(rows.map((r) => r[1]))].sort();
  const pick = (date) => {
    const o = { date };
    for (const r of rows.filter((x) => x[1] === date)) {
      const k = NAMES[r[2]];
      if (k && r[5] === "NZD c/L") {
        o[k] = o[k] || {};
        if (r[3] === "Adjusted retail price") o[k].retail = round(+r[4], 1);
        if (r[3] === "Importer margin") o[k].margin = round(+r[4], 1);
        if (r[3] === "Importer cost") o[k].cost = round(+r[4], 1);
        if (r[3] === "Taxes") o[k].taxes = round(+r[4], 1);
      }
      if (r[3] === "Dubai crude price" && r[5] === "USD/bbl") o.crudeUsd = +r[4];
      if (r[3] === "Exchange rate") o.usdPerNzd = +r[4];
      o.status = r[6];
    }
    return o;
  };
  // the tail may start mid-week: only use weeks that have all three fuels
  const full = weeks.map(pick).filter((w) => w.petrol91?.retail && w.petrol95?.retail && w.diesel?.retail);
  if (!full.length) throw new Error("fuel: no complete week");
  const now = full[full.length - 1], prev = full[full.length - 2];
  const d = new Date(now.date + "T00:00:00Z");
  const period = `week to ${d.getUTCDate()} ${d.toLocaleString("en-NZ", { month: "short", timeZone: "UTC" })} ${d.getUTCFullYear()}`;
  return envelope({
    id: "fuel", label: "Fuel prices, national average (adjusted retail)", value: now.petrol91.retail, unit: "c/L", asOf: now.date, period,
    values: { ...now, petrol91Dollars: round(now.petrol91.retail / 100, 3), petrol95Dollars: round(now.petrol95.retail / 100, 3), dieselDollars: round(now.diesel.retail / 100, 3),
      change91: prev ? round(now.petrol91.retail - prev.petrol91.retail, 1) : null, changeDiesel: prev ? round(now.diesel.retail - prev.diesel.retail, 1) : null,
      trend: full.slice(-8).map((w) => ({ date: w.date, petrol91: w.petrol91.retail, diesel: w.diesel.retail })) },
    cadence: "weekly", live: false,
    source: { name: "MBIE weekly fuel price monitoring", url: "https://www.mbie.govt.nz/building-and-energy/energy-and-natural-resources/energy-statistics-and-modelling/energy-statistics/weekly-fuel-price-monitoring" },
    note: `${now.status} figures. Adjusted retail price is MBIE's estimate of the typical pump price after discounts.`,
  });
}
export function fetchFuel() {
  return memo("fuel", 3 * 3600e3, async () => parseFuel(await getText(URL_, { headers: { Range: "bytes=-48000" } })));
}
