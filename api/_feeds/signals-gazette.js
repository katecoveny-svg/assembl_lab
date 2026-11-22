// signals-gazette: New Zealand Gazette notices, read through the DigitalNZ API, for the early signals feed (signals.js).
// Read on 22 Nov 2026:
//   - The Gazette (gazette.govt.nz, Department of Internal Affairs) is licensed CC BY 3.0 NZ ("you are free to copy, distribute and adapt the
//     material", https://gazette.govt.nz/copyright). Its own RSS needs an API key asked for by email, allows one query a day and no anonymous
//     use (https://gazette.govt.nz/find-a-notice). Its pages answered our test clients with a bot-protection page, so they are not read.
//   - DigitalNZ (DIA) carries every Gazette notice, with "rights": Crown copyright, metadata under CC BY 3.0 NZ, usage "Use commercially".
//     Its Developer API terms (https://digitalnz.org/about/terms-of-use/developer-api-terms-of-use) allow keyless use for non-commercial
//     purposes only; commercial use needs a (free) API key and the commercial terms, which also ask that each record's rights are followed.
//     The lab is commercial, so this source stays off until Kate asks for a key and adds it as the Pages secret DIGITALNZ_API_KEY.
//     The key goes in the Authentication-Token header (DigitalNZ API v3 docs), never in the URL, and is never returned.
//
// Only these fields are asked for: id, title, date, landing_url, subject, rights. Never description or fulltext: a notice's text names the
// officials who signed it (and a land notice can describe private land). A test proves the others are never requested or returned.
import { getJSON, memo, envVar } from "./util.js";
import { parseDigitalNzGazette, DNZ_FIELDS } from "../../architecture/js/signals-rank.js";
import { SIGNAL_LIMITS } from "./signals-beehive.js";

export const DNZ = "https://api.digitalnz.org/v3/records.json";
export const L_GAZETTE = { name: "CC BY 3.0 NZ (New Zealand Gazette, Department of Internal Affairs), read through DigitalNZ", url: "https://gazette.govt.nz/copyright",
  attribution: "Notices from the New Zealand Gazette, Crown copyright, Department of Internal Affairs, licensed under CC BY 3.0 NZ; found through DigitalNZ." };
export const dnzKey = (env) => envVar("DIGITALNZ_API_KEY", env) || null;

/** The searches: Public Works Act land notices (newest 200, about two to four months) and school establishments (newest 40). */
export const GAZETTE_QUERIES = [
  { id: "land-1", subjects: ["Land Notices", "Public Works Act"], perPage: 100, page: 1 },
  { id: "land-2", subjects: ["Land Notices", "Public Works Act"], perPage: 100, page: 2 },
  { id: "schools", subjects: ["Establishment of a school"], perPage: 40, page: 1 },
];
export function gazetteUrl(q) {
  const p = new URLSearchParams();
  p.append("and[primary_collection][]", "New Zealand Gazette");
  for (const s of q.subjects) p.append("and[subject][]", s);
  p.set("sort", "date"); p.set("direction", "desc"); p.set("per_page", String(Math.min(100, q.perPage))); p.set("page", String(Math.max(1, Math.min(5, q.page))));
  p.set("fields", DNZ_FIELDS);
  return `${DNZ}?${p}`;
}

export class NeedsKeyError extends Error { constructor() { super("needs a DigitalNZ API key for commercial use (free; Kate's decision). Not read."); this.needsKey = true; } }

/**
 * The Gazette source for signals.js. Each search is held for six hours by a warm instance (the Gazette is published on weekdays).
 * Returns { records, fetchedAt, read, failed, stale }. Without a key it throws NeedsKeyError and nothing is fetched.
 */
export async function readGazette(lens = {}, env) {
  const key = dnzKey(env);
  if (!key) throw new NeedsKeyError();
  const settled = await Promise.allSettled(GAZETTE_QUERIES.map((q) => memo(`signals:gazette:${q.id}`, 6 * 60 * 60e3, async () => {
    const json = await getJSON(gazetteUrl(q), { ms: SIGNAL_LIMITS.ms, headers: { accept: "application/json", "Authentication-Token": key } });
    return { records: parseDigitalNzGazette(json), fetchedAt: new Date().toISOString() };
  })));
  const records = [], failed = []; let stale = false, fetchedAt = null;
  settled.forEach((s, i) => {
    if (s.status === "fulfilled") { records.push(...s.value.records); stale ||= !!s.value.stale; fetchedAt = fetchedAt && fetchedAt > s.value.fetchedAt ? fetchedAt : s.value.fetchedAt; }
    else failed.push({ feed: GAZETTE_QUERIES[i].id, error: String(s.reason?.message || s.reason).replace(key, "[key]").slice(0, 160) });
  });
  if (!records.length && failed.length === GAZETTE_QUERIES.length) throw new Error("DigitalNZ did not answer just now.");
  return { records, fetchedAt: fetchedAt ?? new Date().toISOString(), read: GAZETTE_QUERIES.length - failed.length, failed, stale };
}

export const SOURCE_GAZETTE = { id: "gazette", name: "New Zealand Gazette (through DigitalNZ)", short: "NZ Gazette", url: "https://gazette.govt.nz/find-a-notice", licence: L_GAZETTE, cadence: "daily", read: (lens, env) => readGazette(lens, env) };
