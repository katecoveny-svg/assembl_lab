// rules: "Rule changes coming" for Found work. NZ legislation and bills that may change how buildings are designed, consented, funded or protected.
// Read-only: nothing is contacted, registered for or submitted. Each item names its source, its version date and its links, and says what it may
// change in our own words (architecture/js/rules-rank.js). It is not legal advice.
//
// GET /api/live/?feeds=rules[&regions=Auckland,Waikato]
//   → feeds.rules = { id:"rules", value:<number of rules>, values:{ rules:[...], sources:[{ id, name, url, ok, read, found, error?, needsKey? }], dropped:[{ title, why }], droppedCount, considered,
//       regions }, source, licence, note }
//   rule = { id, kind:"rule", title, source, sourceUrl, day, stage:"bill"|"amendment paper"|"act"|"regulations"|"order", status, badge, agencies[], why, affects[], topics[], regions[], region, formats:[{type,url}] }
// The Parliament bills the radar collected are not read here: the page reads them for signed-in members (arch.hunt_rules) and merges them.
// Without LEGISLATION_API_KEY the answer says it needs a key and has no rules; nothing else in the request is affected.
import { envelope, nzToday } from "./util.js";
import { readLegislation, L_LEGISLATION } from "./rules-legislation.js";
import { rankRules, filterRules } from "../../architecture/js/rules-rank.js";
import { parseLens } from "../../architecture/js/hunt-rank.js";

const SOURCE = { id: "legislation", name: "NZ Legislation (Parliamentary Counsel Office)", url: "https://www.legislation.govt.nz/" };

export async function fetchRules(params = {}) {
  const lens = parseLens(params.hunt ?? params);
  const base = { id: "rules", label: "Rule changes coming", unit: "rules", cadence: "6-hourly", source: { name: "NZ Legislation", url: SOURCE.url } };
  const now = new Date();
  let read;
  try { read = await readLegislation(params.env); }
  catch (e) {
    if (!e?.needsKey) throw e;
    // switched off for want of a key: an honest answer, kept in the cache only briefly so the key works as soon as it is added
    return { ...envelope({ ...base, value: 0, values: { rules: [], sources: [{ ...SOURCE, ok: false, read: 0, found: 0, needsKey: true, error: `NZ Legislation is not switched on: it ${e.message}` }], dropped: [], droppedCount: 0, considered: 0, regions: lens.regions }, asOf: nzToday(now).ymd, live: true,
      note: "Rule changes need a key to read NZ legislation. Nothing has been read." }), status: "unavailable", reason: "needs a LEGISLATION_API_KEY", truth: "Partial", truthLabel: "Not switched on: needs a key", licence: L_LEGISLATION };
  }
  const ranked = rankRules(read.records, { now });
  const rules = filterRules(ranked.rules, { regions: lens.regions });
  const partial = read.failed.length > 0;
  const out = envelope({ ...base, value: rules.length, unit: rules.length === 1 ? "rule" : "rules",
    values: { rules, sources: [{ ...SOURCE, ok: true, read: read.records.length, found: rules.length, feedsRead: read.read, fetchedAt: read.fetchedAt, ...(partial ? { partial: true, failed: read.failed.slice(0, 8) } : {}), ...(read.stale ? { stale: true } : {}) }],
      dropped: ranked.dropped, droppedCount: ranked.droppedCount, considered: ranked.considered, regions: lens.regions },
    asOf: nzToday(now).ymd, live: true,
    note: "Legislation that may change how buildings are designed, consented, funded or protected, newest version first. Each says what it may change in our own words. This is not legal advice: read the legislation and talk to the council or an adviser." });
  out.licence = L_LEGISLATION;
  if (partial) { out.truth = "Partial"; out.truthLabel = "Partial: some searches did not answer"; }
  if (read.stale) out.stale = true;
  return out;
}
