// consents-parse: reads what Stats NZ's Aotearoa Data Explorer (ADE) API sends and turns it into a few bounded numbers.
// Pure functions: no network, no key, no process. Everything that comes back from the API is data: it is cut to size, matched against the
// configured codes (consents-config.js) and dropped if it matches nothing. Nothing from the answer is ever run, or shown as markup.
//
// Shapes read (ADE API user guide, 23 Nov 2026: SDMX 2.1 REST; format=jsondata for data, a structure message for the catalogue):
//   data      SDMX-JSON: { data:{ dataSets:[{ series:{ "0:1:2":{ attributes:[..], observations:{ "0":[value, ..attrs] } } } }], structure|structures:[{ dimensions:{ series:[..], observation:[..] }, attributes }] } }
//             (also the same without the "data" wrapper, and a flat dataSet with every dimension on the observation)
//   catalogue SDMX-JSON structure message ({ data:{ dataflows:[{ id, agencyID, version, name|names }] } }) or the SDMX-ML stubs (<str:Dataflow id agencyID version><com:Name>)
import { REGIONS } from "../../architecture/js/hunt-rank.js";
import { MEASURES, TYPES, NONRES_TOTAL, DWELLINGS_TOTAL, NATIONAL, REGION_ALIASES, DIM_FALLBACK, LIMITS } from "./consents-config.js";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** A label from the API: text only, no control characters or markup, at most n characters. */
export const tidy = (s, n = 80) => String(s ?? "").replace(/[\u0000-\u001f\u007f<>`]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
const fold = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]+/g, "");
const REGION_KEY = new Map([...REGIONS.map((r) => [fold(r), r]), ...Object.entries(REGION_ALIASES)]);

/** "2026-09", "2026-M09", "2026-09-30" → "2026-09"; anything else → null. */
export function periodOf(s) {
  const m = /^(\d{4})-(?:M)?(0[1-9]|1[0-2])(?:-\d{2})?$/.exec(String(s ?? "").trim());
  return m ? `${m[1]}-${m[2]}` : null;
}
export const monthLabel = (p) => { const m = /^(\d{4})-(\d{2})$/.exec(p ?? ""); return m ? `${MONTH_NAMES[+m[2] - 1]} ${m[1]}` : ""; };
export const yearEarlier = (p) => { const m = /^(\d{4})-(\d{2})$/.exec(p ?? ""); return m ? `${+m[1] - 1}-${m[2]}` : null; };
export const monthsAgo = (now, n) => { const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - n, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`; };

// ---- the catalogue (discover mode) -----------------------------------------------------------------------------------------------------------
/** Dataflows named like building consents. Returns [{ id, name, version, agency }], at most `max`. */
export function parseDataflows(text, max = 2000) {
  const body = String(text ?? "").slice(0, LIMITS.discoverChars), out = [];
  const push = (id, name, version, agency) => { id = String(id ?? "").trim(); if (/^[A-Za-z0-9_.\-]{1,60}$/.test(id) && out.length < max) out.push({ id, name: tidy(name, 120), version: tidy(version ?? "", 12), agency: tidy(agency ?? "", 24) }); };
  if (/^\s*[{[]/.test(body)) {
    let j; try { j = JSON.parse(body); } catch { return []; }
    const list = j?.data?.dataflows ?? j?.dataflows ?? j?.data?.structures?.dataflows ?? [];
    for (const f of Array.isArray(list) ? list : []) push(f?.id, f?.name ?? f?.names?.en ?? Object.values(f?.names ?? {})[0], f?.version, f?.agencyID ?? f?.agencyId);
  } else {
    for (const m of body.matchAll(/<(?:[\w]+:)?Dataflow\b([^>]*)>([\s\S]*?)<\/(?:[\w]+:)?Dataflow>/g)) {
      const attr = (n) => new RegExp(`\\b${n}="([^"]*)"`).exec(m[1])?.[1];
      const names = [...m[2].matchAll(/<(?:[\w]+:)?Name\b([^>]*)>([^<]*)<\/(?:[\w]+:)?Name>/g)], en = names.find((x) => /xml:lang="en/.test(x[1])) ?? names[0];
      push(attr("id"), decodeXml(en?.[2] ?? ""), attr("version"), attr("agencyID"));
    }
  }
  return out;
}
const decodeXml = (s) => String(s).replace(/&(amp|lt|gt|quot|apos|#39);/g, (_, e) => ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'" })[e]);
/** Only the tables whose names are about building consents. */
export function consentFlows(all, max = LIMITS.discoverMax) {
  const hit = all.filter((f) => /consent/i.test(f.name) && /build|dwelling|residential|construction/i.test(f.name));
  return { flows: hit.slice(0, max), matched: hit.length, scanned: all.length, capped: hit.length > max };
}

// ---- data ------------------------------------------------------------------------------------------------------------------------------------
const valuesOf = (dim) => (Array.isArray(dim?.values) ? dim.values : []);
const nameOf = (v) => tidy(v?.name ?? v?.names?.en ?? Object.values(v?.names ?? {})[0] ?? v?.id);

/** Which dimension plays which role. ids: { region:[..], type:[..], measure:[..] } (config); time is the observation dimension called TIME_PERIOD or *TIME*. */
export function resolveRoles(dims, ids) {
  const roles = { time: dims.findIndex((d) => /^TIME(_PERIOD)?$/i.test(d.id) || /time/i.test(d.id)) }, taken = new Set(roles.time >= 0 ? [roles.time] : []);
  for (const role of ["region", "type", "measure"]) {
    let i = -1;
    for (const c of ids[role] ?? []) { i = dims.findIndex((d, k) => !taken.has(k) && String(d.id).toUpperCase() === String(c).toUpperCase()); if (i >= 0) break; }
    if (i < 0) i = dims.findIndex((d, k) => !taken.has(k) && (DIM_FALLBACK[role].test(d.id) || DIM_FALLBACK[role].test(d.name ?? "")));
    roles[role] = i; if (i >= 0) taken.add(i);
  }
  return roles;
}

/**
 * Read one table's SDMX-JSON into classified cells.
 *   opts { kind:"nonres"|"dwellings", ids:{region,type,measure}, valueMult }
 * Returns { cells:[{ scope, type, measure, period, value }], dropped:{ region, type, measure, period, value }, roles, observations }
 *   scope  "national" or a region name as the lab spells it. type "total" or a TYPES key (nonres), "dwellings" (dwellings table). measure "value" | "count".
 * Unknown regions, building types, measures and periods are dropped and counted, never passed on.
 */
export function readTable(text, opts) {
  const dropped = { region: 0, type: 0, measure: 0, period: 0, value: 0 }, out = { cells: [], dropped, roles: null, observations: 0 };
  let j; try { j = JSON.parse(String(text ?? "").slice(0, LIMITS.maxChars)); } catch { throw new Error("Stats NZ sent something that is not SDMX-JSON."); }
  const d = j?.data ?? j, s = d?.structure ?? d?.structures?.[0] ?? j?.structure, ds = (d?.dataSets ?? [])[0];
  const serDims = s?.dimensions?.series ?? [], obsDims = s?.dimensions?.observation ?? [], dims = [...serDims, ...obsDims];
  if (!ds || !dims.length) throw new Error("Stats NZ sent no data for that table.");
  const roles = resolveRoles(dims, opts.ids); out.roles = Object.fromEntries(Object.entries(roles).map(([k, i]) => [k, i >= 0 ? tidy(dims[i].id, 40) : null]));
  if (roles.time < 0 || roles.region < 0) throw new Error("The table has no time or region dimension the feed knows: run discover and correct consents-config.js.");
  const attrs = s?.attributes ?? {};
  // series-level and observation-level attribute definitions are kept apart: UNIT_MULT (a power of ten) may be on either
  const walker = walkWith(ds, serDims.length, obsDims.length, attrs.series ?? [], attrs.observation ?? []);
  for (const o of walker) {
    out.observations++;
    const at = (r) => (roles[r] >= 0 ? dims[roles[r]]?.values?.[o.idx[roles[r]]] : undefined);
    const period = periodOf(at("time")?.id ?? at("time")?.name); if (!period) { dropped.period++; continue; }
    const rv = at("region"), rLabel = tidy(rv?.name ?? rv?.names?.en ?? rv?.id), rCode = tidy(rv?.id, 40);
    const scope = NATIONAL.test(rLabel) || NATIONAL.test(rCode) ? "national" : REGION_KEY.get(fold(rLabel)) ?? REGION_KEY.get(fold(rCode));
    if (!scope) { dropped.region++; continue; }
    let measure;
    if (roles.measure >= 0) {
      const mv = at("measure"), mc = tidy(mv?.id, 40).toUpperCase(), ml = nameOf(mv);
      measure = MEASURES.value.codes.includes(mc) ? "value" : MEASURES.count.codes.includes(mc) ? "count" : MEASURES.value.match.test(ml) ? "value" : MEASURES.count.match.test(ml) ? "count" : null;
    } else measure = opts.kind === "dwellings" ? "count" : null;
    if (!measure) { dropped.measure++; continue; }
    let type;
    const tv = roles.type >= 0 ? at("type") : null, tc = tidy(tv?.id, 40).toUpperCase(), tl = nameOf(tv);
    if (opts.kind === "dwellings") type = roles.type < 0 || DWELLINGS_TOTAL.test(tl) || DWELLINGS_TOTAL.test(tc) ? "dwellings" : null;
    else if (roles.type < 0) type = null;
    else type = NONRES_TOTAL.test(tl) || NONRES_TOTAL.test(tc) ? "total" : TYPES.find((t) => t.codes.includes(tc))?.key ?? TYPES.find((t) => t.match.test(tl))?.key ?? null;
    if (!type) { dropped.type++; continue; }
    const mult = measure === "value" ? (o.mult ?? opts.valueMult ?? 1) : 1, value = o.value * mult;
    if (!Number.isFinite(value) || value < 0 || value > 1e13) { dropped.value++; continue; }
    out.cells.push({ scope, type, measure, period, value });
  }
  return out;
}
/** Every observation as { idx:[value index per dimension], value, mult }, at most LIMITS.maxObs of them. */
function walkWith(ds, nSer, nObs, serAttrs, obsAttrs) {
  const idOf = (defs) => defs.map((a) => a.id), mult = (attrIdx, defs) => {
    const i = idOf(defs).indexOf("UNIT_MULT"); if (i < 0 || !Array.isArray(attrIdx)) return null;
    const k = Number(defs[i]?.values?.[attrIdx[i]]?.id ?? defs[i]?.values?.[attrIdx[i]]?.name); return Number.isInteger(k) && k >= 0 && k <= 9 ? 10 ** k : null;
  };
  const num = (v) => (typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN);
  return (function* () {
    let n = 0;
    for (const [sk, ser] of Object.entries(ds?.series ?? {})) {
      const sIdx = sk.split(":").map(Number); if (sIdx.length !== nSer || sIdx.some((x) => !Number.isInteger(x))) continue;
      const sMult = mult(ser?.attributes, serAttrs);
      for (const [ok, ov] of Object.entries(ser?.observations ?? {})) {
        if (++n > LIMITS.maxObs) return;
        const oIdx = ok.split(":").map(Number); if (oIdx.length !== nObs || oIdx.some((x) => !Number.isInteger(x))) continue;
        const v = num(Array.isArray(ov) ? ov[0] : ov); if (!Number.isFinite(v)) continue;
        yield { idx: [...sIdx, ...oIdx], value: v, mult: (Array.isArray(ov) ? mult(ov.slice(1), obsAttrs) : null) ?? sMult };
      }
    }
    if (nSer === 0) for (const [ok, ov] of Object.entries(ds?.observations ?? {})) {
      if (++n > LIMITS.maxObs) return;
      const oIdx = ok.split(":").map(Number); if (oIdx.length !== nObs || oIdx.some((x) => !Number.isInteger(x))) continue;
      const v = num(Array.isArray(ov) ? ov[0] : ov); if (!Number.isFinite(v)) continue;
      yield { idx: oIdx, value: v, mult: Array.isArray(ov) ? mult(ov.slice(1), obsAttrs) : null };
    }
  })();
}

// ---- shaping ---------------------------------------------------------------------------------------------------------------------------------
/** Change on a year earlier: { pct (one decimal, or null when there is nothing to compare), dir: "up" | "down" | "same" | null }. Under 1% is "same". */
export function change(cur, prev) {
  if (!Number.isFinite(cur) || !Number.isFinite(prev)) return { pct: null, dir: null };
  if (prev === 0) return cur === 0 ? { pct: 0, dir: "same" } : { pct: null, dir: "up" };
  const pct = Math.round(((cur - prev) / prev) * 1000) / 10;
  return { pct, dir: Math.abs(pct) < 1 ? "same" : pct > 0 ? "up" : "down" };
}

/** Sum the cells into a lookup. Two series that map to one type (retail and hospitality) are added; a table that lists a parent and its children would double count: see docs. */
function index(cells) {
  const m = new Map();
  for (const c of cells) { const k = `${c.scope}|${c.type}|${c.measure}|${c.period}`; m.set(k, (m.get(k) ?? 0) + c.value); }
  return m;
}
/**
 * The few numbers for one region (or the country): the latest month, non-residential value and count, the top building types by value, new dwellings,
 * each with the change on the same month a year earlier. cells: both tables' cells together. Returns null when there is nothing to show for the scope.
 */
export function shapeScope(scope, cells, idx = index(cells), top = LIMITS.topTypes) {
  const mine = cells.filter((c) => c.scope === scope);
  const nonresPeriods = mine.filter((c) => c.type !== "dwellings" && c.measure === "value").map((c) => c.period), any = mine.map((c) => c.period);
  const latest = [...(nonresPeriods.length ? nonresPeriods : any)].sort().pop();
  if (!latest) return null;
  const prevP = yearEarlier(latest), get = (type, measure, p) => (idx.has(`${scope}|${type}|${measure}|${p}`) ? idx.get(`${scope}|${type}|${measure}|${p}`) : null);
  const total = (measure, p) => {
    const t = get("total", measure, p); if (t != null) return { v: t, basis: "total" };
    const parts = TYPES.map((x) => get(x.key, measure, p)).filter((x) => x != null);
    return parts.length ? { v: parts.reduce((a, b) => a + b, 0), basis: "types" } : { v: null, basis: null };
  };
  const nv = total("value", latest), nc = total("count", latest);
  const types = TYPES.map((t) => ({ key: t.key, label: t.label, value: get(t.key, "value", latest), count: get(t.key, "count", latest), before: get(t.key, "value", prevP) }))
    .filter((t) => t.value != null && t.value > 0).sort((a, b) => b.value - a.value).slice(0, top)
    .map((t) => ({ key: t.key, label: t.label, value: Math.round(t.value), count: t.count == null ? null : Math.round(t.count), yoy: change(t.value, t.before) }));
  const dw = get("dwellings", "count", latest);
  return { name: scope === "national" ? "New Zealand" : scope, national: scope === "national", period: latest, month: monthLabel(latest), against: monthLabel(prevP),
    nonres: { value: nv.v == null ? null : Math.round(nv.v), valueYoy: change(nv.v, total("value", prevP).v), count: nc.v == null ? null : Math.round(nc.v), countYoy: change(nc.v, total("count", prevP).v), basis: nv.basis },
    types, dwellings: { count: dw == null ? null : Math.round(dw), yoy: change(dw, get("dwellings", "count", prevP)) } };
}
/** The requested regions in the order asked (regions the data has nothing for are left out), then the country. */
export function shapeAll(cells, regions) {
  const idx = index(cells), out = [];
  for (const r of regions) { const s = shapeScope(r, cells, idx); if (s) out.push(s); }
  const nat = shapeScope("national", cells, idx);
  return { regions: out, national: nat };
}
