// consents: "Building consents" for Found work. Monthly building consents by region and building type from Stats NZ's Aotearoa Data Explorer (ADE) API.
// Consents are permission to build, not a commission: they show where design work may be coming, not a single job. Read-only: nothing is contacted or submitted.
//
// GET /api/live/?feeds=consents[&regions=Auckland,Waikato]     (without regions: every region the table has, then the country; the page orders them by the practice's own regions)
//   → feeds.consents = { id:"consents", value:<regions shown>, values:{ period, regions:[scope], national:scope|null, regionsAsked, flows:[{ kind, id, ok, observations, cells, dropped, roles, error? }], needsKey? }, source, licence, note }
//   scope = { name, national, period:"2026-09", month, against, nonres:{ value, valueYoy:{pct,dir}, count, countYoy, basis }, types:[{ key, label, value, count, yoy }] (top three by value),
//             dwellings:{ count, yoy } }       value is NZD; yoy compares the latest month with the same month a year earlier
// GET /api/live/?feeds=consents&discover=1
//   → the Data Explorer table list, cut to tables named like building consents: values:{ discover:true, dataflows:[{ id, name, version, agency }], matched, scanned, capped, configured }.
//     Read-only, kept a day by a warm instance, at most 25 entries, never carries the key. Use it to correct api/_feeds/consents-config.js.
// Without STATSNZ_API_KEY nothing is fetched: the answer says it needs a key, is Partial and is kept in the cache only briefly. The rest of the request is unaffected.
//
// Read on 23 Nov 2026 (ADE API user guide, API portal, terms): base https://api.data.stats.govt.nz/rest/, key in the Ocp-Apim-Subscription-Key header, SDMX 2.1,
// format=jsondata, content under CC BY 4.0. No numeric rate limit is published; keys shared across a team may be throttled ("fair use").
// Calls per answer: two data requests (cached six hours by a warm instance) and nothing else; discover is one catalogue request (two if the first format is refused).
import { envelope, nzToday, getText, memo, envVar, UA } from "./util.js";
import { parseLens, REGIONS } from "../../architecture/js/hunt-rank.js";
import { ADE_BASE, KEY_HEADER, KEY_NAME, LIMITS, flows, dimIds, valueMult } from "./consents-config.js";
import { readTable, parseDataflows, consentFlows, shapeAll, monthsAgo } from "./consents-parse.js";

export const L_CONSENTS = { name: "Creative Commons Attribution 4.0 International (CC BY 4.0)", url: "https://portal.apis.stats.govt.nz/terms",
  attribution: "Stats NZ, licensed under Creative Commons Attribution 4.0 International. Changes on a year earlier are worked out by assembl from Stats NZ's figures.",
  caveat: "Consents issued are permission to build, not a commission. A region's single month moves a lot; read the change on a year earlier as a hint." };
const SOURCE = { name: "Stats NZ, Aotearoa Data Explorer: building consents", url: "https://explore.data.stats.govt.nz/" };

class NeedsKey extends Error { constructor() { super("needs a subscription key from Stats NZ (free). An assembl owner adds it as STATSNZ_API_KEY. Nothing has been read."); this.needsKey = true; } }
const redact = (s, key) => String(s ?? "").split(key).join("[key]").slice(0, 160);

/** GET with the key in its header only, a hard time limit, and a cap on how much is read (the connection is dropped at the cap). */
async function getCapped(url, key, { accept = "application/json", max = LIMITS.maxChars } = {}) {
  if (!String(url).startsWith(ADE_BASE)) throw new Error("Refusing to call a host that is not Stats NZ.");
  const c = new AbortController(), t = setTimeout(() => c.abort(), LIMITS.ms);
  try {
    // "manual", not "error": Cloudflare Workers refuse redirect "error". A redirect then arrives as a 3xx, which is not ok and is refused below, so the key is never sent on to another host.
    const r = await fetch(url, { signal: c.signal, redirect: "manual", headers: { "user-agent": UA, accept, [KEY_HEADER]: key, "accept-encoding": "gzip" } });
    if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status} from ${new URL(url).host}`), { status: r.status });
    const reader = r.body.getReader(), dec = new TextDecoder(); let text = "";
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      text += dec.decode(value, { stream: true });
      if (text.length > max) { c.abort(); throw new Error("Stats NZ sent more than the feed will read."); }
    }
    return text + dec.decode();
  } finally { clearTimeout(t); }
}

export const dataUrl = (f, from) => `${ADE_BASE}data/${f.agency},${f.id},${f.version}/all?format=jsondata&startPeriod=${from}`;
export const catalogueUrl = `${ADE_BASE}dataflow/STATSNZ/all?detail=allstubs`;
const ago = (hours) => hours * 60 * 60e3;

async function readFlow(kind, f, key, env, now) {
  return memo(`consents:data:${f.agency}:${f.id}:${f.version}`, ago(6), async () => {
    const text = await getCapped(dataUrl(f, monthsAgo(now, LIMITS.monthsBack)), key);
    const t = readTable(text, { kind, ids: dimIds(env), valueMult: valueMult(env) });
    return { cells: t.cells, dropped: t.dropped, roles: t.roles, observations: t.observations, fetchedAt: new Date().toISOString() };
  });
}

const needsKeyAnswer = (base, lens, asOf, extra = {}) => ({ ...envelope({ ...base, value: 0, values: { regions: [], national: null, regionsAsked: lens.regions, flows: [], needsKey: true, ...extra }, asOf, live: true,
  note: "Building consents need a Stats NZ key. Nothing has been read." }), status: "unavailable", reason: "needs a STATSNZ_API_KEY", truth: "Partial", truthLabel: "Not switched on: needs a key", licence: L_CONSENTS });

/** The consents feed. params: { env, discover, hunt (the lens) }. */
export async function fetchConsents(params = {}) {
  const lens = parseLens(params.hunt ?? params), env = params.env, now = new Date(), asOf = nzToday(now).ymd;
  const base = { id: "consents", label: "Building consents", unit: "regions", cadence: "monthly", source: SOURCE };
  const key = envVar(KEY_NAME, env) || null;
  const fl = flows(env);
  if (!key) return needsKeyAnswer(base, lens, asOf, params.discover ? { discover: true, dataflows: [] } : {});

  if (params.discover) { // the table list, cut to building consents. Read-only, cached a day, capped, no key in it.
    let text;
    try {
      text = await memo("consents:discover", ago(24), async () => {
        try { return await getCapped(catalogueUrl, key, { accept: "application/vnd.sdmx.structure+json;version=1.0", max: LIMITS.discoverChars }); }
        catch (e) { if (e?.status === 406 || e?.status === 400) return getCapped(catalogueUrl, key, { accept: "application/xml", max: LIMITS.discoverChars }); throw e; }
      });
    } catch (e) { throw new Error(`The Stats NZ table list could not be read: ${redact(e?.message || e, key)}`); }
    const hit = consentFlows(parseDataflows(text));
    return { ...envelope({ ...base, id: "consents", label: "Building consents: tables found", value: hit.flows.length, unit: hit.flows.length === 1 ? "table" : "tables",
      values: { discover: true, dataflows: hit.flows, matched: hit.matched, scanned: hit.scanned, capped: hit.capped, configured: { nonres: `${fl.nonres.agency},${fl.nonres.id},${fl.nonres.version}`, dwellings: `${fl.dwellings.agency},${fl.dwellings.id},${fl.dwellings.version}` } },
      asOf, live: true, note: "Tables in Aotearoa Data Explorer whose names are about building consents. Correct api/_feeds/consents-config.js with the ids you want. Nothing else was read." }), licence: L_CONSENTS };
  }

  const kinds = ["nonres", "dwellings"];
  const settled = await Promise.allSettled(kinds.map((k) => readFlow(k, fl[k], key, env, now)));
  const status = settled.map((s, i) => s.status === "fulfilled"
    ? { kind: kinds[i], id: fl[kinds[i]].id, ok: true, observations: s.value.observations, cells: s.value.cells.length, dropped: s.value.dropped, roles: s.value.roles, ...(s.value.stale ? { stale: true } : {}) }
    : { kind: kinds[i], id: fl[kinds[i]].id, ok: false, error: redact(s.reason?.message || s.reason, key) });
  const good = settled.filter((s) => s.status === "fulfilled").map((s) => s.value);
  if (!good.length) throw new Error(`Stats NZ did not give the building consents tables (${status.map((s) => `${s.id}: ${s.error}`).join("; ").slice(0, 120)}). Run ?feeds=consents&discover=1 and check consents-config.js.`);
  const shaped = shapeAll(good.flatMap((g) => g.cells), lens.regions.length ? lens.regions : REGIONS), stale = good.some((g) => g.stale);
  const period = shaped.national?.period ?? shaped.regions[0]?.period ?? null;
  const partial = status.some((s) => !s.ok) || !(shaped.national || shaped.regions.length);
  const out = envelope({ ...base, value: shaped.regions.length + (shaped.national ? 1 : 0), unit: "areas", asOf: period ?? asOf, period: period ?? asOf,
    values: { period, regions: shaped.regions, national: shaped.national, regionsAsked: lens.regions, flows: status }, live: false,
    note: shaped.national || shaped.regions.length
      ? "Building consents issued, by month: permission to build, not a commission. They can show where work is coming. Non-residential value and the top building types, new dwellings, and the change on the same month a year earlier."
      : "Stats NZ answered but nothing matched the table and codes the feed expects. Run ?feeds=consents&discover=1 and correct consents-config.js." });
  out.licence = L_CONSENTS;
  if (partial) { out.truth = "Partial"; out.truthLabel = status.some((s) => !s.ok) ? "Partial: a table did not answer" : "Partial: nothing matched the expected codes"; }
  if (stale) out.stale = true;
  return out;
}
