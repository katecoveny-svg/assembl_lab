// rules-legislation: NZ legislation (acts, bills, amendment papers, regulations, orders) read from the Parliamentary Counsel Office's
// Legislation API (version 0, beta) for the "Rule changes coming" lane in Found work (rules.js).
// Read on 22 Nov 2026:
//   - Terms (https://www.legislation.govt.nz/learn-more/legislation-data/api-terms-of-use/): free to use and reuse, no copyright in NZ legislation,
//     10,000 requests per key per day and 2,000 per IP per five minutes, the key kept confidential, a beta whose secondary legislation records
//     may be incomplete.
//   - The key is the Pages secret LEGISLATION_API_KEY, sent only in the X-Api-Key header, never in a URL, never returned, never logged.
//     Without it nothing is fetched and the feed says it needs a key (the rest of the answer is unaffected).
//   - There is no "updated since" filter. Each version_id ends in its date; when one does not, the versions endpoint is asked for the first few items only.
//
// Calls per answer: at most 21 searches (title search, most recently updated first) + 6 versions lookups = 27, under Cloudflare's 50. Each search is
// kept six hours by a warm instance, and the feed's answer is cached six hours at the edge (CADENCE_TTL "6-hourly").
import { getJSON, memo, envVar } from "./util.js";
import { parseWorks, parseVersionsDate, classify } from "../../architecture/js/rules-rank.js";

export const API = "https://api.legislation.govt.nz/v0/";
export const RULES_LIMITS = { ms: 8000, versionCalls: 6, perPage: 30 };
export const L_LEGISLATION = { name: "Free to use and reuse: Parliamentary Counsel Office Legislation API terms of use (NZ legislation carries no copyright)",
  url: "https://www.legislation.govt.nz/learn-more/legislation-data/api-terms-of-use/",
  attribution: "NZ legislation from the New Zealand Legislation website, Parliamentary Counsel Office (legislation.govt.nz)." };
export const legislationKey = (env) => envVar("LEGISLATION_API_KEY", env) || null;

/** The title searches: the built environment, most recently updated first. Two pages for the two broadest. */
export const RULE_SEARCHES = [
  ["building", 2], ["construction", 1], ["resource management", 2], ["local government", 1], ["heritage", 1], ["Te Ture Whenua Māori", 1], ["Māori land", 1], ["housing", 1],
  ["education", 1], ["health and safety at work", 1], ["fire and emergency", 1], ["climate change", 1], ["natural hazards", 1], ["unit titles", 1], ["public works", 1],
  ["infrastructure", 1], ["urban development", 1], ["Kāinga Ora", 1], ["accessibility", 1],
].flatMap(([term, pages]) => Array.from({ length: pages }, (_, i) => ({ id: `${term.toLowerCase().replace(/[^a-z]+/g, "-")}-${i + 1}`, term, page: i + 1 })));

export function searchUrl(q) {
  const p = new URLSearchParams({ search_term: q.term, search_field: "title", sort_by: "most_recently_updated", page: String(Math.max(1, Math.min(3, q.page))), per_page: String(RULES_LIMITS.perPage) });
  return `${API}works/?${p}`;
}
export const versionsUrl = (workId) => `${API}works/${encodeURIComponent(workId)}/versions/?sort=desc`;

export class NeedsKeyError extends Error { constructor() { super("needs a key from the Parliamentary Counsel Office (free). An assembl owner adds it as LEGISLATION_API_KEY. Not read."); this.needsKey = true; } }
const redact = (s, key) => String(s ?? "").split(key).join("[key]").slice(0, 160);

/** Read every search, dedupe, and date the top few undated items. Returns { records, fetchedAt, read, failed, stale }. Without a key it throws NeedsKeyError and fetches nothing. */
export async function readLegislation(env) {
  const key = legislationKey(env);
  if (!key) throw new NeedsKeyError();
  const headers = { accept: "application/json", "X-Api-Key": key };
  const settled = await Promise.allSettled(RULE_SEARCHES.map((q) => memo(`rules:leg:${q.id}`, 6 * 60 * 60e3, async () => {
    const json = await getJSON(searchUrl(q), { ms: RULES_LIMITS.ms, headers });
    return { records: parseWorks(json), fetchedAt: new Date().toISOString() };
  })));
  const byId = new Map(), failed = []; let stale = false, fetchedAt = null;
  settled.forEach((s, i) => {
    if (s.status === "fulfilled") {
      stale ||= !!s.value.stale; fetchedAt = fetchedAt && fetchedAt > s.value.fetchedAt ? fetchedAt : s.value.fetchedAt;
      for (const r of s.value.records) if (!byId.has(r.id)) byId.set(r.id, r);
    } else failed.push({ feed: RULE_SEARCHES[i].id, error: redact(s.reason?.message || s.reason, key) });
  });
  if (!byId.size && failed.length === RULE_SEARCHES.length) throw new Error("The Legislation API did not answer just now.");
  // the first items (they are the most recently updated) that carry no date, and that are about the built environment, ask the versions endpoint
  const records = [...byId.values()];
  const undated = records.filter((r) => !r.day && r.workId && classify(r.title)).slice(0, RULES_LIMITS.versionCalls);
  await Promise.allSettled(undated.map((r) => memo(`rules:ver:${r.workId}`, 6 * 60 * 60e3, async () => {
    const day = parseVersionsDate(await getJSON(versionsUrl(r.workId), { ms: RULES_LIMITS.ms, headers }));
    if (day) r.day = day;
    return { day };
  }).then((v) => { if (v?.day && !r.day) r.day = v.day; })));
  return { records, fetchedAt: fetchedAt ?? new Date().toISOString(), read: RULE_SEARCHES.length - failed.length, failed, stale };
}
