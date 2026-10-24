// Health feeds.
// ed: Health NZ "Shorter stays in ED" health target, by district and region, from the accessible (Word) versions of the
//     quarterly district factsheets (~120 KB) and national factsheet (~70 KB), found via the publications pages. CC BY 4.0.
// urgentcare: Pegasus 24 Hour Surgery (Christchurch) public wait-time page, live. Urgent care, not a hospital ED.
// wastewater: PHF Science COVID-19 in wastewater (GitHub, weekly, CC BY 4.0). A respiratory signal, not hospitalisations.
import { createRequire } from "node:module";
import { getText, getBuffer, envelope, memo, round, nzToday, splitCSV } from "./util.js";
import { docxParagraphs } from "./zip.js";
import { DISTRICTS, REGIONS, districtKey } from "./places.js";
const ED_HISTORY = createRequire(import.meta.url)("./snapshots/edhistory.json");

const HNZ = "https://www.healthnz.govt.nz";
const fyOf = (t) => (t.month >= 7 ? t.year : t.year - 1); // 2025 → "2025-26"
const fyLabel = (y) => `${y}-${String((y + 1) % 100).padStart(2, "0")}`;

// District factsheets: "NORTHLAND FACTSHEET: April - June 2026" … "SSED performance" "86.0%" … "SSED 2025/26 milestone" "77%"
export function parseDistrictFactsheet(paras) {
  const out = {}; let cur = null; let period = null;
  for (let i = 0; i < paras.length; i++) {
    const p = paras[i];
    const h = p.match(/^(.+?) FACTSHEET:\s*(.+)$/i);
    if (h) { cur = districtKey(h[1]); period = h[2].replace(/\s*[-–]\s*/, "–").trim(); out[cur] = { key: cur, name: h[1], period }; continue; }
    if (!cur) continue;
    const num = (s) => { const m = (s || "").match(/-?[\d.,]+/); return m ? +m[0].replace(/,/g, "") : null; };
    if (p === "SSED performance") out[cur].pct = num(paras[i + 1]);
    else if (/^SSED \d{4}\/\d{2} milestone$/.test(p)) { out[cur].milestone = num(paras[i + 1]); out[cur].milestoneYear = p.match(/\d{4}\/\d{2}/)[0]; }
    else if (p === "SSED 2030 target") out[cur].target = num(paras[i + 1]);
    else if (p === "People treated in Emergency departments") out[cur].attendances = num(paras[i + 1]);
  }
  const rows = Object.values(out).filter((r) => r.pct != null);
  if (rows.length < 10) throw new Error("ed: fewer than 10 districts parsed");
  return { period, rows };
}
// National factsheet: "Shorter stays in ED …" then "National result" "Quarter" "Result" "Q4 25/26" "76.3%" "Q4 24/25" "73.9%"
export function parseNationalFactsheet(paras) {
  const i = paras.findIndex((p) => /^Shorter stays in ED/i.test(p));
  if (i < 0) return null;
  const qs = []; for (let k = i; k < Math.min(i + 12, paras.length); k++) { const m = paras[k].match(/^Q([1-4]) (\d{2})\/(\d{2})$/); if (m) qs.push({ q: paras[k], pct: +(paras[k + 1] || "").replace("%", "") }); }
  const att = paras.findIndex((p, k) => k > i && p === "Emergency department attendances");
  const daily = paras.findIndex((p, k) => k > i && p === "Average daily emergency department attendances");
  const n = (s) => +(s || "").replace(/[^\d.]/g, "");
  return { latest: qs[0] || null, yearAgo: qs[1] || null, attendances: att > 0 ? n(paras[att + 2]) : null, dailyAttendances: daily > 0 ? n(paras[daily + 2]) : null };
}
const docLinks = (html, re) => [...new Set([...html.matchAll(/href="(https:\/\/static\.info\.content\.health\.nz\/docs\/publications\/[^"]+)"/g)].map((m) => m[1]))].filter((u) => re.test(u));

export function buildEd(cur, prev, nat, district, urls) {
  const key = DISTRICTS[district] ? district : "auckland-district";
  const row = cur.rows.find((r) => r.key === key);
  const prevRow = prev && prev.rows.find((r) => r.key === key);
  const quarter = (period) => { const m = (period || "").match(/(January|April|July|October)\S*\s*–\s*\w+\s+(\d{4})/i); if (!m) return period; const q = { january: 3, april: 4, july: 1, october: 2 }[m[1].toLowerCase()]; const y = +m[2]; const fy = q >= 3 ? y - 1 : y; return `Q${q} ${fy}/${String((fy + 1) % 100).padStart(2, "0")}`; };
  const districts = cur.rows.filter((r) => DISTRICTS[r.key]).map((r) => ({ key: r.key, name: DISTRICTS[r.key].name, hospital: DISTRICTS[r.key].hospital, pct: r.pct, attendances: r.attendances ?? null }));
  const regions = cur.rows.filter((r) => REGIONS[r.key]).map((r) => ({ key: r.key, name: REGIONS[r.key], pct: r.pct }));
  return envelope({
    id: "ed", label: `Shorter stays in ED: seen within 6 hours, ${DISTRICTS[key].name}`, value: row ? row.pct : null, unit: "%",
    asOf: cur.period, period: `${quarter(cur.period)} (${cur.period})`,
    values: { district: key, districtName: DISTRICTS[key].name, hospital: DISTRICTS[key].hospital, pct: row?.pct ?? null, attendances: row?.attendances ?? null,
      previous: prevRow ? { pct: prevRow.pct, period: prev.period } : null, milestone: row?.milestone ?? null, milestoneYear: row?.milestoneYear ?? null, target: row?.target ?? 95,
      national: nat?.latest ? { pct: nat.latest.pct, quarter: nat.latest.q, yearAgo: nat.yearAgo, attendances: nat.attendances, dailyAttendances: nat.dailyAttendances } : null,
      districts, regions, quarter: quarter(cur.period) },
    cadence: "quarterly", live: false,
    source: { name: "Health NZ | Te Whatu Ora, health target district factsheets", url: urls.page },
    note: "District figure, covering every ED in the district. Health NZ publishes no hospital-level or live ED figures.",
  });
}
async function edData() {
  return memo("ed:data", 6 * 3600e3, async () => {
    const t = nzToday(); const fy = fyOf(t);
    let distLinks = [], natLinks = [], page = "";
    for (const y of [fy, fy - 1]) {
      if (distLinks.length >= 1) break;
      try {
        page = `${HNZ}/publications/district-and-regional-factsheets-${fyLabel(y)}`;
        distLinks = docLinks(await getText(page), /regional-and-district-factsheets-accessible[^/]*\.docx$/i);
        if (distLinks.length < 2) { // previous quarter for the trend may be on last year's page
          try { distLinks.push(...docLinks(await getText(`${HNZ}/publications/district-and-regional-factsheets-${fyLabel(y - 1)}`), /regional-and-district-factsheets-accessible[^/]*\.docx$/i)); } catch (e) { /* trend optional */ }
        }
      } catch (e) { distLinks = []; }
    }
    if (!distLinks.length) throw new Error("ed: factsheet links not found");
    for (const y of [fy, fy - 1]) {
      if (natLinks.length) break;
      try {
        const perf = await getText(`${HNZ}/publications/health-targets-performance-resources-${fyLabel(y)}`);
        natLinks = docLinks(perf, /factsheet[^/]*\.docx$/i).filter((u) => /accessible/i.test(u) && !/district|regional|ethnicity/i.test(u));
      } catch (e) { natLinks = []; }
    }
    const [cur, prev, nat] = await Promise.all([
      getBuffer(distLinks[0]).then((b) => parseDistrictFactsheet(docxParagraphs(b))),
      distLinks[1] ? getBuffer(distLinks[1]).then((b) => parseDistrictFactsheet(docxParagraphs(b))).catch(() => null) : null,
      natLinks[0] ? getBuffer(natLinks[0]).then((b) => parseNationalFactsheet(docxParagraphs(b))).catch(() => null) : null,
    ]);
    return { cur, prev, nat, urls: { page, district: distLinks[0], national: natLinks[0] || null } };
  });
}
export async function fetchEd({ district }) {
  const d = await edData();
  return buildEd(d.cur, d.prev, d.nat, district, d.urls);
}

// edhistory: the national quarterly series back to the September 2023 baseline, for the target trend line.
// The quarters come from ./snapshots/edhistory.json (DPMC and Health NZ factsheets, copied by hand with their URLs and
// the retrieval date: there is no machine-readable series and the DPMC PDFs are not parsed here). At run time we append
// any newer quarter from the Health NZ national factsheet, and read the ten-year same-quarter series from Health NZ's
// "5 and 10 years of results" accessible document when the publications page links one.
// "Q4 25/26" → { quarter:"Q4 2025/26", end:"2026-06", label:"Apr–Jun 2026" }
export function quarterInfo(q) {
  const m = String(q).match(/^Q([1-4])\s+(\d{2})\/(\d{2})$/); if (!m) return null;
  const n = +m[1], fy = 2000 + +m[2]; const endMonth = [9, 12, 3, 6][n - 1]; const y = n <= 2 ? fy : fy + 1;
  const lab = ["Jul–Sep", "Oct–Dec", "Jan–Mar", "Apr–Jun"][n - 1];
  return { quarter: `Q${n} ${fy}/${String((fy + 1) % 100).padStart(2, "0")}`, end: `${y}-${String(endMonth).padStart(2, "0")}`, label: `${lab} ${y}` };
}
// "5 and 10 years of results" paragraphs → { quarter:"Q4", years:[...], pct:[...] } for the ED target, or null
export function parseTenYear(paras) {
  const i = paras.findIndex((p) => /^Shorter stays in emergency departments/i.test(p));
  if (i < 0) return null;
  for (let k = i + 1; k < Math.min(i + 8, paras.length); k++) {
    const m = paras[k].match(/^Q([1-4]) results \(last 10 years\):\s*(.+)$/i); if (!m) continue;
    const pairs = [...m[2].matchAll(/([\d.]+)%\s+in\s+(\d{4}\/\d{2})/g)];
    if (pairs.length >= 5) return { quarter: `Q${m[1]}`, years: pairs.map((p) => p[2]), pct: pairs.map((p) => +p[1]) };
  }
  return null;
}
export function buildEdHistory(snap, nat, tenYear, urls = {}) {
  const series = snap.series.map((s) => ({ quarter: s.quarter, label: s.label, end: s.end, pct: s.pct, source: s.source, url: s.url, ...(s.note ? { note: s.note } : {}) }));
  let appended = null;
  for (const q of [nat?.yearAgo, nat?.latest].filter(Boolean)) {
    const info = quarterInfo(q.q); if (!info || !isFinite(q.pct)) continue;
    if (!series.some((s) => s.end === info.end)) { const row = { ...info, pct: q.pct, source: "Health NZ national health targets factsheet (accessible)", url: urls.national || snap.sources.healthnz.url }; series.push(row); appended = row; }
  }
  series.sort((a, b) => a.end.localeCompare(b.end));
  const latest = series.at(-1), first = series[0];
  const yearAgo = series.find((s) => s.end === `${+latest.end.slice(0, 4) - 1}${latest.end.slice(4)}`) || null;
  const longRun = { ...snap.longRun };
  if (tenYear) longRun[tenYear.quarter] = { years: tenYear.years, pct: tenYear.pct, url: urls.tenYear || snap.sources.healthnz.url, live: true };
  const e = envelope({
    id: "edhistory", label: "Shorter stays in ED, national, each quarter since the baseline", value: latest.pct, unit: "% seen within 6 hours",
    asOf: latest.end, period: `${latest.quarter} (${latest.label})`,
    values: { target: snap.target, milestones: snap.milestones, baseline: snap.baseline, series, latest, yearAgo,
      gapToTargetPts: round(snap.target.pct - latest.pct, 1), changeSinceBaselinePts: round(latest.pct - first.pct, 1),
      longRun, appendedFromHealthNZ: appended ? appended.quarter : null, snapshotRetrieved: snap.retrieved, sources: snap.sources },
    cadence: "quarterly", live: false,
    source: { name: "DPMC Government Targets factsheets and Health NZ health target factsheets", url: snap.sources.dpmc.url },
    note: `Quarters up to ${snap.series.at(-1).quarter} were copied from the published factsheets on ${snap.retrieved}; anything later comes from the Health NZ national factsheet at run time. First-published results: later revisions can differ by about 0.1.`,
  });
  return e;
}
export async function fetchEdHistory() {
  return memo("edhistory", 6 * 3600e3, async () => {
    let nat = null, urls = {};
    try { const d = await edData(); nat = d.nat; urls.national = d.urls.national; } catch (e) { /* snapshot only */ }
    let tenYear = null;
    try {
      const t = nzToday(); const fy = fyOf(t);
      for (const y of [fy, fy - 1]) {
        const perf = await getText(`${HNZ}/publications/health-targets-performance-resources-${fyLabel(y)}`).catch(() => "");
        const links = docLinks(perf, /5-and-10-years-of-results-accessible[^/]*\.docx$/i).sort().reverse();
        if (links.length) { urls.tenYear = links[0]; tenYear = parseTenYear(docxParagraphs(await getBuffer(links[0]))); break; }
      }
    } catch (e) { /* long-run series optional */ }
    return buildEdHistory(ED_HISTORY, nat, tenYear, urls);
  });
}

// Pegasus 24 Hour Surgery: "Estimated Wait – For Less Urgent Patients 4 Hours … 29 Patients Waiting … 2 Time-Critical Patients … 10 Patients Receiving Treatment … Last updated: 7:52 PM, 23 Oct 2026"
export function parsePegasus(html) {
  const t = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ");
  const g = (re) => { const m = t.match(re); return m ? m[1] : null; };
  const waitTxt = g(/Estimated Wait[^0-9A-Za-z]+For Less Urgent Patients\s+([0-9.]+\+?\s*(?:Hours?|Hrs?|Minutes?|Mins?))/i);
  const waiting = g(/(\d+)\s*Patients? Waiting/i), critical = g(/(\d+)\s*Time-Critical/i), treating = g(/(\d+)\s*Patients? Receiving Treatment/i);
  const updated = g(/Last updated:\s*([0-9:]+\s*[AP]M,\s*\d+\s+\w+\s+\d{4})/i);
  if (!waitTxt && waiting == null) throw new Error("urgentcare: page layout changed");
  const hours = waitTxt ? (/min/i.test(waitTxt) ? parseFloat(waitTxt) / 60 : parseFloat(waitTxt)) : null;
  return envelope({
    id: "urgentcare", label: "Pegasus 24 Hour Surgery, Christchurch (urgent care, not an ED)", value: hours, unit: "hours, estimated wait for less urgent patients",
    asOf: updated, period: updated ? `updated ${updated}` : "now",
    values: { waitText: waitTxt, waitHours: hours, waiting: waiting == null ? null : +waiting, timeCritical: critical == null ? null : +critical, inTreatment: treating == null ? null : +treating, updated },
    cadence: "5-min", live: true, source: { name: "Pegasus Health, 24 Hour Surgery wait-time dashboard", url: "https://www.pegasus.health.nz/wait-time-dashboard" },
    note: "Shown as published by Pegasus Health. Pegasus publishes no reuse terms; ask before using commercially.",
  });
}
export function fetchUrgentCare() {
  return memo("urgentcare", 4 * 60e3, async () => parsePegasus(await getText("https://www.pegasus.health.nz/wait-time-dashboard")));
}

// PHF Science wastewater: national and regional SARS-CoV-2 genome copies per person per day, weekly
const WW = "https://raw.githubusercontent.com/ESR-NZ/covid_in_wastewater/main/data/";
const WW_REGION = { "auckland-district": "Auckland", waitemata: "Auckland", "counties-manukau": "Auckland", northland: "Northland", waikato: "Waikato", lakes: "Bay of Plenty",
  "bay-of-plenty": "Bay of Plenty", tairawhiti: "Gisborne", taranaki: "Taranaki", "hawkes-bay": "Hawke's Bay", whanganui: "Manawatū-Whanganui", midcentral: "Manawatū-Whanganui",
  wairarapa: "Wellington", "capital-and-coast": "Wellington", "hutt-valley": "Wellington", "nelson-marlborough": "Nelson", "west-coast": "West Coast", canterbury: "Canterbury",
  "south-canterbury": "Canterbury", southern: "Otago", auckland: "Auckland", hamilton: "Waikato", wellington: "Wellington", christchurch: "Canterbury" };
export function parseWastewater(national, cases, regional, place) {
  const rows = (csv) => csv.trim().split(/\r?\n/).slice(1).map(splitCSV);
  const nat = rows(national).map((r) => ({ week: r[0], copies: +r[2] })).filter((r) => r.week && isFinite(r.copies));
  if (nat.length < 4) throw new Error("wastewater: too few weeks");
  const cs = Object.fromEntries(rows(cases).map((r) => [r[0], +r[1]]));
  const last = nat.slice(-12); const now = last.at(-1), prev = last.at(-2);
  const avg4 = (a) => a.reduce((s, x) => s + x.copies, 0) / a.length;
  const change4 = round(((avg4(nat.slice(-4)) - avg4(nat.slice(-8, -4))) / avg4(nat.slice(-8, -4))) * 100, 0);
  let region = null;
  const want = WW_REGION[place];
  if (regional && want) {
    const rr = rows(regional).filter((r) => r[1] === want).map((r) => ({ week: r[0], copies: +r[2], sites: +r[4] }));
    if (rr.length) region = { name: want, week: rr.at(-1).week, copies: rr.at(-1).copies, trend: rr.slice(-12).map((x) => ({ week: x.week, copies: x.copies })) };
  }
  const direction = change4 > 15 ? "rising" : change4 < -15 ? "falling" : "steady";
  return envelope({
    id: "wastewater", label: "COVID-19 in wastewater, national", value: now.copies, unit: "genome copies per person per day", asOf: now.week, period: `week ending ${now.week}`,
    values: { week: now.week, copies: now.copies, previous: prev?.copies ?? null, change4wkPct: change4, direction, casesPerDay: cs[now.week] ?? null,
      trend: last.map((x) => ({ week: x.week, copies: x.copies, cases: cs[x.week] ?? null })), region },
    cadence: "weekly", live: false,
    source: { name: "PHF Science (formerly ESR), COVID-19 Data Repository", url: "https://github.com/ESR-NZ/covid_in_wastewater" },
    note: "A community infection signal, not hospital admissions. Flu and RSV hospitalisation data are published only as dashboards, not as open data.",
  });
}
export function fetchWastewater({ place }) {
  return memo("ww:" + (WW_REGION[place] || "nat"), 3 * 3600e3, async () => {
    const [n, c, r] = await Promise.all([getText(WW + "ww_national.csv"), getText(WW + "cases_national.csv"), WW_REGION[place] ? getText(WW + "ww_regional.csv").catch(() => null) : null]);
    return parseWastewater(n, c, r, place);
  });
}
