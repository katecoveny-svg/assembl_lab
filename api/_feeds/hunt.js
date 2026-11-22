// hunt: "auto hunting the pipeline". Finds likely work for an architecture practice in public tender notices and ranks it against what
// the practice said to look for. Nothing here contacts, registers for or submits anything: it reads one public list and scores it.
//
// GET /api/live/?feeds=hunt&keywords=library,school&regions=Auckland,Waikato&sectors=education,health&min=50000&max=2000000&sources=gets
//   keywords  up to 20 words or short phrases (40 characters each)     regions  NZ regions as GETS writes them (Auckland, Waikato, ...)
//   sectors   education | health | housing | civic | commercial | heritage | justice | sport     min, max  typical value in NZD (optional)
//   sources   which sources to read (default: all of them that are on). Only "gets" today.
//   cultural  1 = always keep kaupapa Māori and Indigenous work (words in the notice), even when it misses the keywords and sectors; sector "kaupapa" finds it by its words. Each signal carries cultural: { on, why:[words] }.
//   → feeds.hunt = { id:"hunt", value:<number of signals>, values:{ signals:[...], sources:[{ id, name, ok, read, error? }], needsLens, considered, lens }, source, licence, note, ... }
//   signal = { id, title, buyer, region, regions, closes (ISO), closesDay (NZ date), daysLeft, value (NZD or null), valueText, url, source, sourceName, published (day), fit (0-100), reasons:[text], matched:{ keywords, sectors } }
//   With no keywords and no sectors it finds nothing and does not read any source ("set what to look for").
//
// Source 1: GETS, the NZ Government Electronic Tenders Service, through the RSS feed GETS publishes for this (https://www.gets.govt.nz/ExternalRSSFeed.htm,
// linked from its public index page as "Current tenders"). Only that feed is read, never GETS's pages, detail pages or anything behind a login.
// The feed is MBIE's Crown copyright, licensed for reuse under NZGOAL (CC BY 4.0) with attribution to MBIE (GETS terms and conditions, clause 3.5).
// It is read at most once an hour by a warm instance (the feed is about 1 MB and GETS asks for no caching, so we hold our own copy briefly).
// Read the notes in docs/architecture/pipeline-hunt.md for the terms in full and for the clause (3.2 e) this was weighed against.
//
// Prior art, ported to plain JS: the RSS reader from lib/os/data/gets.ts and the scoring idea from lib/workforce/jobs/radar-rank.ts
// (the assemblnz repo): lens terms found, freshness (radar-rank: 14 days, 1.5 points a day), a base weight for a tender, and the
// whaiao-hunt rule "main-contractor works, maintenance and supply are not a fit unless design services are sought separately".
import { getText, memo, nzToday, envelope } from "./util.js";

export const GETS_FEED = "https://www.gets.govt.nz/ExternalRSSFeed.htm";
const GETS_INDEX = "https://www.gets.govt.nz/ExternalIndex.htm";
export const L_GETS = { name: "Crown copyright (MBIE), reuse under NZGOAL: CC BY 4.0", url: "https://www.gets.govt.nz/GetsTermsAndConditions.htm",
  attribution: "Tender notices from the NZ Government Electronic Tenders Service (GETS), MBIE, Crown copyright, reused under the NZGOAL framework with attribution to MBIE." };

import { parseLens, lensIsEmpty, rankTenders, parseGetsRss, REGIONS, NATIONWIDE } from "../../architecture/js/hunt-rank.js";
export * from "../../architecture/js/hunt-rank.js";

// ---- the sources --------------------------------------------------------------------------------------------------------------------
/** What a source is, for the practice's settings and for the credit line. Add a source here only when its terms allow automated reading (see the docs). */
export const SOURCES = {
  gets: {
    id: "gets", name: "GETS (NZ Government Electronic Tenders Service)", short: "GETS", url: GETS_INDEX, feed: GETS_FEED, licence: L_GETS, cadence: "hourly",
    // one read of the whole open-tenders feed, held for an hour by a warm instance; a failure after a good read gives the last good copy, marked stale
    async read(opts = {}) {
      const got = await memo("hunt:gets", 60 * 60e3, async () => {
        const xml = await getText(GETS_FEED, { ms: opts.ms ?? 25000, headers: { accept: "application/rss+xml, application/xml, text/xml" } });
        const tenders = parseGetsRss(xml);
        if (!tenders.length) throw new Error("GETS answered, but the list had no tenders in it");
        return { tenders, fetchedAt: new Date().toISOString() };
      });
      return { tenders: got.tenders, fetchedAt: got.fetchedAt, stale: !!got.stale };
    },
  },
};

const plain = (src) => `${src.short ?? src.name} did not answer just now.`;

/**
 * The hunt feed. params = { keywords, regions, sectors, min, max, sources } (the strings from the query). `registry` is for tests.
 * One source failing leaves the others' findings in (truth "Partial", and that source says why); every source failing is a plain error.
 */
export async function fetchHunt(params = {}, registry = SOURCES) {
  const lens = parseLens(params.hunt ?? params);
  const on = (lens.sources.length ? lens.sources : Object.keys(registry)).filter((id) => Object.hasOwn(registry, id));
  const base = { id: "hunt", label: "Found work", unit: "signals", cadence: "hourly", source: { name: "GETS, the NZ Government Electronic Tenders Service", url: GETS_INDEX, feed: GETS_FEED }, licence: L_GETS };
  if (lensIsEmpty(lens)) {
    return { licence: L_GETS, ...envelope({ ...base, value: 0, values: { signals: [], sources: [], needsLens: true, considered: 0, lens }, asOf: nzToday().ymd, live: true, note: "Nothing is looked up until the practice says what to look for: add a few keywords or pick a sector." }) };
  }
  if (!on.length) throw new Error("No source is switched on. Switch on at least one in the hunt settings.");
  const now = new Date();
  const settled = await Promise.allSettled(on.map((id) => registry[id].read()));
  const sources = [], signals = []; let considered = 0, stale = false;
  settled.forEach((s, i) => {
    const src = registry[on[i]];
    if (s.status === "fulfilled") {
      const ranked = rankTenders(s.value.tenders, lens, now);
      considered += s.value.tenders.length; stale ||= !!s.value.stale;
      signals.push(...ranked);
      sources.push({ id: src.id, name: src.name, url: src.url, ok: true, read: s.value.tenders.length, found: ranked.length, fetchedAt: s.value.fetchedAt, ...(s.value.stale ? { stale: true } : {}) });
    } else sources.push({ id: src.id, name: src.name, url: src.url, ok: false, read: 0, found: 0, error: plain(src) + " Its findings are left out for now; try again in a few minutes." });
  });
  if (!sources.some((s) => s.ok)) throw new Error(sources.map((s) => s.error.replace(" Its findings are left out for now; try again in a few minutes.", "")).join(" ") + " Nothing could be looked at. Try again in a few minutes.");
  signals.sort((a, b) => b.fit - a.fit || (a.daysLeft ?? 9e9) - (b.daysLeft ?? 9e9));
  const partial = sources.some((s) => !s.ok);
  const out = envelope({ ...base, value: signals.length, unit: signals.length === 1 ? "signal" : "signals", values: { signals: signals.slice(0, 40), sources, needsLens: false, considered, lens }, asOf: nzToday(now).ymd, live: true,
    note: `Found in public tender notices (${sources.filter((s) => s.ok).map((s) => s.name).join(", ")}) by matching what the practice asked for. A fit score is a reading of the notice, not a promise: read the tender documents before deciding. Nothing has been contacted, registered for or submitted.` });
  out.licence = L_GETS;
  if (partial) { out.truth = "Partial"; out.truthLabel = "Partial: a source did not answer"; }
  if (stale) out.stale = true;
  return out;
}
