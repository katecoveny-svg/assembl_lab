// NZTA Motor Vehicle Register (open data, CC BY 4.0), asked live: how many of one make, model and year are on the NZ register,
// how they came into the country, and their typical fuel, engine and rated economy.
//
// Vehicle facts only. The public dataset carries no plates, no owners and no addresses, and this module only ever asks it for
// counts grouped by model-level fields (fuel, import status, engine size, rated economy, previous country, body, year of first NZ
// registration). It never requests individual records, VIN fragments, engine numbers, postcodes or districts.
//
// Source: NZ Transport Agency Waka Kotahi, Motor Vehicle Register, https://opendata-nzta.opendata.arcgis.com/datasets/7b4df667d5014f1a93e6050b31d18407
// NZTA updates it monthly; it is "accurate up to the end of the previous month". Registration is not licensing (rego).
//
// lookupModel() never throws: on a timeout or an NZTA error it returns { status: "unavailable" } and car_check carries on without it.

const ITEM = "7b4df667d5014f1a93e6050b31d18407";
const ITEM_API = `https://opendata-nzta.opendata.arcgis.com/api/search/v1/collections/dataset/items/${ITEM}`;
export const DATASET_URL = `https://opendata-nzta.opendata.arcgis.com/datasets/${ITEM}`;
// The feature service NZTA publishes the register through. The name carries the month it was first published, but NZTA refreshes it
// in place; if it ever moves, the URL is re-read from the dataset's catalogue entry.
const DEFAULT_SERVICE = "https://services.arcgis.com/CXBb7LAjgIIdcsPt/arcgis/rest/services/MVR_Mar26/FeatureServer";
export const SOURCE = { name: "NZ Transport Agency Waka Kotahi, Motor Vehicle Register (open data)", url: DATASET_URL, licence: "CC BY 4.0" };

const TTL = 12 * 3600e3, MAX_MEMO = 500, PER_REQUEST_MS = 4500;
const memo = new Map();
let service = { url: DEFAULT_SERVICE, asOf: null, at: 0 };

// ---------- names ---------------------------------------------------------------------------------------------------
const MAKE_ALIASES = {
  VW: "VOLKSWAGEN", VOLKS: "VOLKSWAGEN", MERC: "MERCEDES-BENZ", MERCEDES: "MERCEDES-BENZ", "MERCEDES BENZ": "MERCEDES-BENZ", BENZ: "MERCEDES-BENZ",
  CHEVY: "CHEVROLET", LANDROVER: "LAND ROVER", "RANGE ROVER": "LAND ROVER", ALFA: "ALFA ROMEO", "ASTON": "ASTON MARTIN", BEEMER: "BMW",
};
const SAFE = /^[A-Z0-9][A-Z0-9 .\-/&+]{0,39}$/; // no quotes, no LIKE wildcards: nothing that can change the query
const clean = (s) => String(s ?? "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();
// tests only: forget the memo and the resolved service (so a stubbed run doesn't leak into a live one)
export function _resetForTests() { memo.clear(); service = { url: DEFAULT_SERVICE, asOf: null, at: 0 }; }
export function normMake(s) { const m = clean(s); return MAKE_ALIASES[m] || m; }
// "CX5" → also try "CX-5"; "C-HR" → also "CHR"
function modelCandidates(s) {
  const m = clean(s), out = new Set([m]);
  out.add(m.replace(/^([A-Z]+)(\d)/, "$1-$2"));
  out.add(m.replace(/-/g, ""));
  return [...out].filter((x) => SAFE.test(x));
}
const cap = (w) => w.charAt(0) + w.slice(1).toLowerCase();
const ACRONYM_MAKES = new Set(["BMW", "MG", "BYD", "GWM", "LDV", "GMC", "DS", "BAIC", "JAC"]);
const titleMake = (s) => { const u = String(s || "").toUpperCase(); return ACRONYM_MAKES.has(u) ? u : u.split(/([\s-])/).map((w) => (/[\s-]/.test(w) ? w : cap(w))).join(""); };
const ACRONYM_MODELS = new Set(["GTI", "GTS", "GTR", "STI", "WRX", "BRZ", "AMG", "SVR", "SRT", "XLT", "GLX", "GLS", "GLE", "GLC", "GLA", "CLA", "CLS", "SLK", "XJR", "TTS", "RCZ", "MPV", "SUV", "EV", "PHEV", "HEV"]);
// model words with a digit, of two letters or fewer, or a known badge stay in capitals (CX-5, RAV4, C-HR, CR-V, GTI); others are title-cased (Aqua, Leaf, Fit)
const titleModel = (s) => String(s || "").toUpperCase().split(/([\s-])/).map((w) => (/[\s-]/.test(w) || /\d/.test(w) || w.length <= 2 || ACRONYM_MODELS.has(w) ? w : cap(w))).join("");
const titleCountry = (s) => { const u = String(s || "").toUpperCase(); return ["USA", "UAE", "UK"].includes(u) ? u : u.split(" ").map(cap).join(" "); };

// ---------- value maps ----------------------------------------------------------------------------------------------
// The register's MOTIVE_POWER → the fuels car_check and running_cost use
export function fuelOf(mp) {
  const p = String(mp || "").toUpperCase();
  if (!p) return null;
  if (p.startsWith("PLUGIN") || p.includes("[PETROL EXTENDED]")) return "plug-in hybrid";
  if (p.includes("HYBRID")) return "hybrid";
  if (p === "ELECTRIC") return "electric";
  if (p === "PETROL") return "petrol";
  if (p === "DIESEL") return "diesel";
  return "other";
}
const IMPORT_LABEL = { NEW: "NZ-new", USED: "used import", "RE-REG": "re-registered", SCRATCH: "scratch-built" };

// ---------- NZTA requests -------------------------------------------------------------------------------------------
async function getJson(url, fetchImpl, ms = PER_REQUEST_MS) {
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetchImpl(url, { signal: ac.signal, headers: { accept: "application/json" } });
    if (!r.ok) throw new Error(`NZTA register: HTTP ${r.status}`);
    const j = await r.json();
    if (j && j.error) throw new Error(`NZTA register: ${j.error.message || j.error.code || "error"}`);
    return j;
  } finally { clearTimeout(t); }
}
// NZTA's service is sometimes slow on a cold query and fine a second later: one retry
const getJsonRetry = (url, fetchImpl) => getJson(url, fetchImpl).catch(() => getJson(url, fetchImpl));

// Where the register lives and how current it is (the catalogue entry's "modified" date; data runs to the end of the month before).
async function resolveService(fetchImpl, force = false) {
  if (!force && service.asOf && Date.now() - service.at < TTL) return service;
  try {
    const j = await getJson(ITEM_API, fetchImpl, 4000), p = j.properties || j;
    const url = (p.url || "").replace(/\/+$/, "").replace(/\/\d+$/, "");
    const mod = new Date(Number(p.modified) || Date.parse(p.modified));
    const end = isNaN(mod) ? null : new Date(Date.UTC(mod.getUTCFullYear(), mod.getUTCMonth(), 0)); // last day of the previous month
    service = { url: /FeatureServer$/.test(url) ? url : service.url, asOf: end ? end.toISOString().slice(0, 10) : service.asOf, at: Date.now() };
  } catch { service = { ...service, at: Date.now() - TTL + 15 * 60e3 }; } // try the catalogue again in 15 minutes
  return service;
}

const statsUrl = (base, where, groupBy) => `${base}/0/query?` + new URLSearchParams({
  f: "json", where, returnGeometry: "false", groupByFieldsForStatistics: groupBy,
  outStatistics: JSON.stringify([{ statisticType: "count", onStatisticField: "OBJECTID", outStatisticFieldName: "n" }]),
});
const rows = (j) => (j.features || []).map((f) => f.attributes);

// ---------- summaries -----------------------------------------------------------------------------------------------
const pct = (n, total) => (total ? Math.round((1000 * n) / total) / 10 : 0);
function shares(list, keyFn, total) {
  const m = new Map();
  for (const r of list) { const k = keyFn(r); if (k == null) continue; m.set(k, (m.get(k) || 0) + r.n); }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ value: k, n, pct: pct(n, total) }));
}
function quantile(pairs, q) { // pairs: [{value:number, n}], sorted by value
  const total = pairs.reduce((s, p) => s + p.n, 0); let acc = 0;
  for (const p of pairs) { acc += p.n; if (acc >= q * total) return p.value; }
  return pairs.length ? pairs[pairs.length - 1].value : null;
}

export function summarise({ make, model, year, fuelImport, econCc, countryBody, firstReg }, asOf) {
  const total = fuelImport.reduce((s, r) => s + r.n, 0);
  const name = `${year} ${titleMake(make)} ${titleModel(model)}`;
  const period = asOf ? `register to ${new Date(asOf + "T00:00:00Z").toLocaleDateString("en-NZ", { month: "long", year: "numeric", timeZone: "UTC" })}` : "latest monthly register";
  if (!total) return { status: "live", found: false, make, model, year, name, total: 0, asOf, period, source: SOURCE, truth: "Source" };
  const imports = shares(fuelImport, (r) => IMPORT_LABEL[r.IMPORT_STATUS] || (r.IMPORT_STATUS ? String(r.IMPORT_STATUS).toLowerCase() : null), total);
  const fuels = shares(fuelImport, (r) => fuelOf(r.MOTIVE_POWER), total);
  const share = (label) => (imports.find((x) => x.value === label) || { pct: 0 }).pct;
  // rated economy: most common value, rounded to 0.1 L/100km, ignoring blanks and obvious typos
  const econ = shares(econCc, (r) => { const v = parseFloat(r.FC_COMBINED); return isFinite(v) && v > 0.5 && v < 25 ? Math.round(v * 10) / 10 : null; }, total);
  const econKnown = econ.reduce((s, e) => s + e.n, 0);
  // engine size: real engines only (EVs are recorded as 0, 1 or a motor figure such as 85), and none for a mostly electric model
  const mostlyElectric = fuels[0] && fuels[0].value === "electric" && fuels[0].pct >= 50;
  const cc = mostlyElectric ? [] : shares(econCc, (r) => (r.CC_RATING >= 500 ? Math.round(r.CC_RATING) : null), total);
  const country = shares(countryBody, (r) => (r.PREVIOUS_COUNTRY ? titleCountry(r.PREVIOUS_COUNTRY) : null), total);
  const body = shares(countryBody, (r) => (r.BODY_TYPE ? String(r.BODY_TYPE).toLowerCase() : null), total);
  const regYears = shares(firstReg, (r) => (r.FIRST_NZ_REGISTRATION_YEAR > 1900 ? r.FIRST_NZ_REGISTRATION_YEAR : null), total).map((x) => ({ value: x.value, n: x.n })).sort((a, b) => a.value - b.value);
  return {
    status: "live", found: true, make, model, year, name, total, asOf, period,
    nzNewPct: share("NZ-new"), usedImportPct: share("used import"), imports: imports.slice(0, 4),
    fuel: fuels[0] ? { value: fuels[0].value, pct: fuels[0].pct } : null, fuels: fuels.slice(0, 4),
    ratedEconomy: econ[0] && econKnown >= 3 ? { lPer100km: econ[0].value, pctOfKnown: pct(econ[0].n, econKnown),
      basis: "Most common rated combined fuel economy recorded on the register. Imports are often rated on overseas test cycles; real-world use is usually higher." } : null,
    engineCc: cc[0] ? { cc: cc[0].value, pct: cc[0].pct } : null,
    previousCountry: country[0] ? { value: country[0].value, pct: country[0].pct } : null,
    body: body[0] ? { value: body[0].value, pct: body[0].pct } : null,
    firstNzRegistration: regYears.length ? { from: quantile(regYears, 0.1), median: quantile(regYears, 0.5), to: quantile(regYears, 0.9) } : null,
    source: SOURCE, truth: "Source",
  };
}

// ---------- lookup --------------------------------------------------------------------------------------------------
// lookupModel({ make, model, year }) → { status: "live" | "cached", found, total, nzNewPct, fuel, ratedEconomy, ... } or
// { status: "unavailable" | "skipped", reason }. Pass { fetch } to stub NZTA in tests.
export async function lookupModel({ make, model, year } = {}, { fetch: fetchImpl = globalThis.fetch, budgetMs = 12000 } = {}) {
  const mk = normMake(make), cands = modelCandidates(model), yr = Number(year);
  if (!mk || !cands.length || !SAFE.test(mk)) return { status: "skipped", reason: "Needs a make and model in plain letters and numbers." };
  if (!Number.isInteger(yr) || yr < 1950 || yr > 2030) return { status: "skipped", reason: "Needs the model year to look up the register." };
  const key = `${mk}|${cands[0]}|${yr}`, hit = memo.get(key);
  if (hit && Date.now() - hit.at < TTL) return { ...hit.value, status: "cached" };
  const run = async () => {
    const svc = await resolveService(fetchImpl);
    const base = `MAKE='${mk}' AND VEHICLE_YEAR=${yr}`;
    // 1. which register MODEL name this is: exact, a hyphen variant, or the commonest model starting with it
    const list = cands.map((c) => `MODEL='${c}'`).join(" OR ");
    const names = rows(await getJsonRetry(statsUrl(svc.url, `${base} AND (${list} OR MODEL LIKE '${cands[0]}%')`, "MODEL"), fetchImpl)).sort((a, b) => b.n - a.n);
    const exact = names.find((r) => cands.includes(String(r.MODEL || "").toUpperCase()));
    let reg = exact || names[0], subFilter = "";
    // Some makes register the family as the model and the variant as the sub-model (MERCEDES-BENZ "C-CLASS" / "C 200 2.0P/7AT…")
    if (!reg) {
      const spaced = cands[0].replace(/^([A-Z]+)(\d)/, "$1 $2"), tight = cands[0].replace(/\s+/g, "");
      if (SAFE.test(spaced) && SAFE.test(tight)) {
        subFilter = ` AND (SUBMODEL LIKE '${spaced}%' OR SUBMODEL LIKE '${tight}%')`;
        reg = rows(await getJsonRetry(statsUrl(svc.url, base + subFilter, "MODEL"), fetchImpl)).sort((a, b) => b.n - a.n)[0];
      }
    }
    if (!reg) return summarise({ make: mk, model: cands[0], year: yr, fuelImport: [], econCc: [], countryBody: [], firstReg: [] }, svc.asOf);
    const where = `${base} AND MODEL='${String(reg.MODEL).replace(/'/g, "''")}'` + subFilter;
    // 2. grouped counts, in parallel
    // the count, import and fuel split is required; the other three fill in detail and may be left out if NZTA is slow
    const [main, ...rest] = await Promise.allSettled([
      getJsonRetry(statsUrl(svc.url, where, "MOTIVE_POWER,IMPORT_STATUS"), fetchImpl),
      getJsonRetry(statsUrl(svc.url, where, "FC_COMBINED,CC_RATING"), fetchImpl),
      getJsonRetry(statsUrl(svc.url, where, "PREVIOUS_COUNTRY,BODY_TYPE"), fetchImpl),
      getJsonRetry(statsUrl(svc.url, where, "FIRST_NZ_REGISTRATION_YEAR"), fetchImpl),
    ]);
    if (main.status === "rejected") throw main.reason;
    const [fuelImport, econCc, countryBody, firstReg] = [main, ...rest].map((x) => (x.status === "fulfilled" ? rows(x.value) : []));
    const out = summarise({ make: mk, model: subFilter ? `${reg.MODEL} ${clean(model)}` : String(reg.MODEL), year: yr, fuelImport, econCc, countryBody, firstReg }, svc.asOf);
    if (!exact) out.matchedFrom = clean(model);
    if (subFilter) out.note = `Matched on the register's sub-model. Some ${titleMake(mk)} models are registered under other names, so the real count may be higher.`;
    return out;
  };
  try {
    const value = await Promise.race([run(), new Promise((_, rej) => setTimeout(() => rej(new Error("NZTA register took too long")), budgetMs))]);
    value.fetchedAt = new Date().toISOString();
    if (memo.size >= MAX_MEMO) memo.delete(memo.keys().next().value);
    memo.set(key, { at: Date.now(), value });
    return value;
  } catch (e) {
    return { status: "unavailable", reason: `The NZTA register didn't answer in time (${e.message}). Try again shortly.`, source: SOURCE };
  }
}

// ---------- what it means for a listing -------------------------------------------------------------------------------
// registerCues(reg, listing) → flags in car_check's shape: { level: "ask" | "watch" | "info", title, why, truth: "Source" }.
// Only plain comparisons between the listing and the register; no guesses about the individual car.
export function registerCues(reg, f = {}) {
  const out = [], cue = (level, title, why) => out.push({ level, title, why, truth: "Source" });
  if (!reg || (reg.status !== "live" && reg.status !== "cached")) return out;
  if (!reg.found) {
    cue("info", "Not found on the NZ register", `No ${reg.name} is on NZTA's register under that name. Check the spelling of the make and model, or it may not have been registered here yet.`);
    return out;
  }
  const n = reg.total.toLocaleString("en-NZ");
  if (reg.fuel && f.fuel && reg.fuel.pct >= 90 && reg.fuel.value !== f.fuel && !(reg.fuel.value === "hybrid" && f.fuel === "petrol"))
    cue("ask", "Fuel doesn't match the register", `${reg.fuel.pct}% of the ${n} ${reg.name}s on NZTA's register are ${reg.fuel.value}; this listing says ${f.fuel}. Check which it is.`);
  if (f.imported === "no" && reg.total >= 30 && reg.nzNewPct < 10) {
    const few = reg.nzNewPct === 0 ? "None" : reg.nzNewPct < 1 ? "Fewer than 1%" : `Only ${reg.nzNewPct}%`;
    cue("ask", "Most of these are used imports", `${few} of the ${n} ${reg.name}s on the register were sold new in NZ. Ask for proof this one is NZ-new; a vehicle information report shows it.`);
  }
  if (f.imported === "yes" && reg.total >= 30 && reg.usedImportPct < 10)
    cue("info", "Unusual as a used import", `${reg.nzNewPct}% of the ${n} ${reg.name}s on the register were sold new in NZ. Not a problem in itself; check the import papers and the odometer history.`);
  if (reg.total < 30)
    cue("info", "Rare on the NZ register", `Only ${n} ${reg.name}${reg.total === 1 ? " is" : "s are"} on NZTA's register. Ask the seller how easy parts and servicing are to get.`);
  return out;
}

// One line for model-visible text
export function registerLine(reg) {
  if (!reg) return "";
  if (reg.status === "unavailable" || reg.status === "skipped") return `NZ register: not looked up (${reg.reason})`;
  if (!reg.found) return `NZ register (NZTA, ${reg.period || "latest"}): no ${reg.name} found.`;
  const bits = [`${reg.total.toLocaleString("en-NZ")} on the register`];
  if (reg.usedImportPct >= 50) bits.push(`${reg.usedImportPct}% used imports${reg.previousCountry ? `, mostly from ${reg.previousCountry.value}` : ""}`);
  else bits.push(`${reg.nzNewPct}% NZ-new`);
  if (reg.fuel) bits.push(`${reg.fuel.pct}% ${reg.fuel.value}`);
  if (reg.engineCc) bits.push(`typically ${reg.engineCc.cc.toLocaleString("en-NZ")} cc`);
  if (reg.ratedEconomy) bits.push(`rated ${reg.ratedEconomy.lPer100km.toFixed(1)} L/100 km combined (rated, not real-world)`);
  return `NZ register (NZTA open data, ${reg.period}): ${reg.name}: ${bits.join("; ")}.${reg.note ? " " + reg.note : ""}`;
}
