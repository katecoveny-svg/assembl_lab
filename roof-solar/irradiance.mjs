// roof-solar · how much sunlight reaches the ground at a place, from an open data set.
//
// Source: NASA Langley Research Center POWER Project, climatology API v2.10.2 (https://power.larc.nasa.gov), the 25-year
// monthly climatology for January 2001 to December 2025, built from MERRA-2 and CERES SYN1deg satellite and model data.
//   ALLSKY_SFC_SW_DWN  all-sky sunlight on a flat surface (global horizontal), kWh/m2/day
//   ALLSKY_SFC_SW_DIFF  the part of it that comes scattered from the sky (diffuse horizontal), kWh/m2/day
//   ALLSKY_SFC_SW_DNI  sunlight straight from the sun on a surface facing it (direct normal), kWh/m2/day
//   T2M  air temperature at 2 m, degrees C
// Licence: NASA's referencing page states no licence or formal terms; it asks users to name the service, its version and the
// date accessed. That is shown on the page. These are 25-year averages, not weather for any one year.
// Privacy: the request carries the point rounded to the nearest half degree (about 50 km), never the house.
import { MONTHS } from "./sun.mjs";

export const POWER = "https://power.larc.nasa.gov/api/temporal/climatology/point";
export const POWER_PARAMS = ["ALLSKY_SFC_SW_DWN", "ALLSKY_SFC_SW_DIFF", "ALLSKY_SFC_SW_DNI", "CLRSKY_SFC_SW_DWN", "T2M"];
const KEYS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
export const roundHalf = (x) => Math.round(x * 2) / 2;
export function climatologyUrl(lat, lon) {
  return `${POWER}?parameters=${POWER_PARAMS.join(",")}&community=RE&longitude=${roundHalf(lon)}&latitude=${roundHalf(lat)}&format=JSON`;
}
/** the API's answer to twelve monthly numbers per parameter; a fill value (-999) or a missing month is an error, never a guess */
export function parseClimatology(j) {
  const p = j?.properties?.parameter; if (!p) throw new Error("NASA POWER sent no data for this place");
  const fill = j?.header?.fill_value ?? -999, out = {};
  const names = { ghi: "ALLSKY_SFC_SW_DWN", dhi: "ALLSKY_SFC_SW_DIFF", dni: "ALLSKY_SFC_SW_DNI", clear: "CLRSKY_SFC_SW_DWN", temp: "T2M" };
  for (const [k, name] of Object.entries(names)) {
    const row = p[name]; if (!row) throw new Error(`NASA POWER sent no ${name}`);
    out[k] = KEYS.map((m) => { const v = row[m]; if (typeof v !== "number" || v === fill || !isFinite(v)) throw new Error(`NASA POWER has no ${name} for ${m}`); return v; });
  }
  return { ...out, grid: { lon: j.geometry?.coordinates?.[0] ?? null, lat: j.geometry?.coordinates?.[1] ?? null, elevationM: j.geometry?.coordinates?.[2] ?? null },
    period: j.header?.range || "25-year monthly climatology", version: j.header?.api?.version ? "v" + String(j.header.api.version).replace(/^v/, "") : null, sources: j.header?.sources || [], units: "kWh/m2/day, degrees C" };
}
export async function fetchClimatology(lat, lon, { fetch: f = fetch, signal } = {}) {
  const r = await f(climatologyUrl(lat, lon), { signal });
  if (!r.ok) throw new Error(`NASA POWER answered HTTP ${r.status}`);
  const c = parseClimatology(await r.json());
  return { ...c, accessed: new Date().toISOString().slice(0, 10), url: climatologyUrl(lat, lon) };
}

/**
 * Spread a month's daily totals over the sun's steps of a representative day, so each step has a beam and a diffuse power (W/m2).
 *  beam on a surface facing the sun: follows a clear-sky shape, Meinel and Meinel: I = 1353 x 0.7^(AM^0.678) W/m2, with AM = 1/cos(zenith);
 *  diffuse on the flat: follows cos(zenith). Each is scaled so its day total equals NASA's monthly mean for that month.
 * This puts an average day's sunlight where a clear day would put it. It carries no real hour-by-hour cloud.
 * @returns {{dni:number[], dhi:number[], ghi:number[], closure:number}} closure = (summed flat sunlight) / (NASA's flat figure)
 */
export function spreadDay(steps, month) {
  const cz = steps.map((s) => Math.max(0, Math.sin((s.elevation * Math.PI) / 180)));
  const shapeB = cz.map((c) => (c > 0.001 ? 1353 * Math.pow(0.7, Math.pow(1 / c, 0.678)) : 0));
  const shapeD = cz.slice();
  const hours = steps.map((s) => s.stepMin / 60);
  const sum = (a) => a.reduce((t, x, i) => t + x * hours[i], 0); // W/m2 x h = Wh/m2
  const sb = sum(shapeB), sd = sum(shapeD);
  const kB = sb > 0 ? (month.dni * 1000) / sb : 0, kD = sd > 0 ? (month.dhi * 1000) / sd : 0;
  const dni = shapeB.map((x) => x * kB), dhi = shapeD.map((x) => x * kD), ghi = dni.map((b, i) => b * cz[i] + dhi[i]);
  return { dni, dhi, ghi, closure: month.ghi > 0 ? sum(ghi) / (month.ghi * 1000) : NaN };
}
export { MONTHS };
