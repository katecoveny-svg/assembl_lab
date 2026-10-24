// attendance: Ministry of Education school attendance, termly. Education Counts sits behind a browser challenge, so we read
//   the Ministry's own workbook as redistributed by Figure.NZ (CC BY 4.0, ~0.5 MB .xlsx).
// vehicles: NZ Transport Agency Motor Vehicle Register (CC BY 4.0) on ArcGIS. We ask the server to count new passenger
//   cars by month and motive power, so only a ~10 KB summary comes back.
import { getText, getBuffer, getJSON, envelope, memo, round, nzToday, MONTHS } from "./util.js";
import { xlsx } from "./zip.js";

const FIGURE_NZ = "https://figure.nz/table/XBOXi5MKS9Sbkocv/download-source-dataset";
const REGION_OF = { auckland: "Auckland Region", hamilton: "Waikato Region", wellington: "Wellington Region", christchurch: "Canterbury Region" };

export function parseAttendance(buf, place) {
  const wb = xlsx(buf);
  const rows = wb.rows("National"); if (!rows) throw new Error("attendance: no National sheet");
  const clean = (s) => String(s).replace(/\s+/g, " ").trim();
  const hi = rows.findIndex((r) => clean(r[0]) === "Year" && clean(r[1]) === "Term");
  if (hi < 0) throw new Error("attendance: header not found");
  const head = rows[hi].map(clean);
  const col = (re) => head.findIndex((h) => re.test(h));
  const cReg = col(/^Students Attending more than 90%.*\(%\)/i), cChronic = col(/^Students Attending 70% or less.*\(%\)/i), cN = col(/^Total Students/i), cPresent = col(/Present Half-Days/i);
  const data = rows.slice(hi + 1).filter((r) => /^\d{4}$/.test(clean(r[0])) && /^[1-4]$/.test(clean(r[1])))
    .map((r) => ({ year: +r[0], term: +r[1], regularPct: round(+r[cReg], 1), chronicPct: round(+r[cChronic], 1), students: +r[cN], presentPct: cPresent >= 0 ? round(+r[cPresent], 1) : null }))
    .sort((a, b) => b.year - a.year || b.term - a.term);
  if (!data.length || data[0].regularPct == null) throw new Error("attendance: no data rows");
  const now = data[0], yearAgo = data.find((d) => d.year === now.year - 1 && d.term === now.term) || null;
  let region = null;
  const rc = wb.rows("Regional Council");
  if (rc && REGION_OF[place]) {
    const h2 = rc.findIndex((r) => clean(r[0]) === "Year"); const hd = (rc[h2] || []).map(clean);
    const iR = hd.findIndex((h) => /^Students Attending more than 90%.*\(%\)/i.test(h));
    const r = rc.slice(h2 + 1).find((x) => +x[0] === now.year && +x[1] === now.term && clean(x[2]) === REGION_OF[place]);
    if (r && iR >= 0) region = { name: REGION_OF[place], regularPct: round(+r[iR], 1) };
  }
  const period = `Term ${now.term} ${now.year}`;
  return envelope({
    id: "attendance", label: "Students attending school regularly (more than 90% of the term)", value: now.regularPct, unit: "%", asOf: `${now.year}-T${now.term}`, period,
    values: { ...now, yearAgo, region, trend: data.slice(0, 8).reverse() },
    cadence: "quarterly", live: false, source: { name: "Ministry of Education attendance data (via Figure.NZ)", url: "https://figure.nz/table/XBOXi5MKS9Sbkocv" },
    note: "Published once a term. Regular attendance means present more than 90% of the term; 70% or less is chronic absence.",
  });
}
export function fetchAttendance({ place }) {
  return memo("attendance:" + place, 12 * 3600e3, async () => parseAttendance(await getBuffer(FIGURE_NZ, { ms: 8000 }), place));
}

// Vehicle register: discover the current service (it is renamed with each refresh, e.g. MVR_Mar26), then count.
const HUB = "https://opendata-nzta.opendata.arcgis.com/api/search/v1/collections/all/items?q=Motor%20Vehicle%20Register&limit=10";
const FALLBACK_SVC = "https://services.arcgis.com/CXBb7LAjgIIdcsPt/arcgis/rest/services/MVR_Mar26/FeatureServer";
const POWER = (m) => /^ELECTRIC$/.test(m) ? "electric" : /PLUGIN/.test(m) ? "plugInHybrid" : /HYBRID|ELECTRIC \[/.test(m) ? "hybrid" : /DIESEL/.test(m) ? "diesel" : /PETROL/.test(m) ? "petrol" : "other";

export function parseVehicles(j, now = new Date()) {
  if (j.error) throw new Error("vehicles: " + (j.error.message || "query error"));
  const by = {};
  for (const { attributes: a } of j.features || []) {
    const k = `${a.FIRST_NZ_REGISTRATION_YEAR}-${String(a.FIRST_NZ_REGISTRATION_MONTH).padStart(2, "0")}`;
    const m = (by[k] = by[k] || { month: k, total: 0, electric: 0, plugInHybrid: 0, hybrid: 0, petrol: 0, diesel: 0, other: 0 });
    m[POWER(a.MOTIVE_POWER || "")] += a.n; m.total += a.n;
  }
  const t = nzToday(now); const thisMonth = `${t.year}-${String(t.month).padStart(2, "0")}`;
  const months = Object.values(by).filter((m) => m.month < thisMonth).sort((a, b) => a.month.localeCompare(b.month)); // drop the part month
  if (!months.length) throw new Error("vehicles: no complete month");
  const last = months.at(-1); const yearAgo = by[`${+last.month.slice(0, 4) - 1}${last.month.slice(4)}`] || null;
  const period = `${MONTHS[+last.month.slice(5) - 1]} ${last.month.slice(0, 4)}`;
  return envelope({
    id: "vehicles", label: "New passenger cars registered", value: last.total, unit: "cars", asOf: last.month, period,
    values: { ...last, evSharePct: round(((last.electric + last.plugInHybrid) / last.total) * 100, 1), yearAgoTotal: yearAgo?.total ?? null,
      changePct: yearAgo ? round(((last.total - yearAgo.total) / yearAgo.total) * 100, 1) : null, trend: months.slice(-12) },
    cadence: "monthly", live: false, source: { name: "NZ Transport Agency, Motor Vehicle Register open data", url: "https://opendata-nzta.opendata.arcgis.com/" },
    note: "New (not used-import) passenger cars and vans by month of first NZ registration. The register is refreshed monthly; recent months can still grow slightly.",
  });
}
export function fetchVehicles() {
  return memo("vehicles", 12 * 3600e3, async () => {
    let svc = FALLBACK_SVC;
    try {
      const hub = await getJSON(HUB, { ms: 5000 });
      const f = (hub.features || []).map((x) => x.properties).find((p) => p.type === "Feature Service" && /^Motor Vehicle Register$/i.test(p.title) && /\/FeatureServer\/?$/.test(p.url || ""));
      if (f) svc = f.url.replace(/\/$/, "");
    } catch (e) { /* use the last known service */ }
    const t = nzToday();
    const q = new URLSearchParams({
      where: `FIRST_NZ_REGISTRATION_YEAR>=${t.year - 1} AND IMPORT_STATUS='NEW' AND VEHICLE_TYPE='PASSENGER CAR/VAN'`,
      groupByFieldsForStatistics: "FIRST_NZ_REGISTRATION_YEAR,FIRST_NZ_REGISTRATION_MONTH,MOTIVE_POWER",
      outStatistics: JSON.stringify([{ statisticType: "count", onStatisticField: "OBJECTID", outStatisticFieldName: "n" }]), f: "json",
    });
    return parseVehicles(JSON.parse(await getText(`${svc}/0/query?${q}`, { ms: 8000 })));
  });
}
