// hunt: "auto hunting the pipeline". Finds likely work for an architecture practice in public tender notices and ranks it against what
// the practice said to look for. Nothing here contacts, registers for or submits anything: it reads one public list and scores it.
//
// GET /api/live/?feeds=hunt&keywords=library,school&regions=Auckland,Waikato&sectors=education,health&min=50000&max=2000000&sources=gets
//   keywords  up to 20 words or short phrases (40 characters each)     regions  NZ regions as GETS writes them (Auckland, Waikato, ...)
//   sectors   education | health | housing | civic | commercial | heritage | justice | sport     min, max  typical value in NZD (optional)
//   sources   which sources to read (default: all of them that are on). Only "gets" today.
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

export const REGIONS = ["Northland", "Auckland", "Waikato", "Bay of Plenty", "Gisborne", "Hawke's Bay", "Taranaki", "Manawatu-Wanganui", "Wellington", "Tasman", "Nelson", "Marlborough", "West Coast", "Canterbury", "Otago", "Southland", "Chatham Islands"];
export const NATIONWIDE = "New Zealand";

/** The sectors a practice can pick. Each is a list of plain words found in the notice's title, buyer or overview. */
export const SECTORS = {
  education: { label: "Education", words: ["school", "schools", "kura", "wharekura", "kindergarten", "early learning", "ece", "university", "tertiary", "campus", "classroom", "classrooms", "polytechnic", "intermediate", "college", "teaching space", "learning space", "ministry of education"] },
  health: { label: "Health", words: ["hospital", "clinic", "health", "medical", "aged care", "rest home", "dementia", "mental health", "te whatu ora", "health new zealand", "hauora"] },
  housing: { label: "Housing", words: ["housing", "residential", "apartment", "apartments", "dwelling", "dwellings", "papakainga", "kainga", "kāinga", "townhouse", "townhouses", "social housing", "retirement village", "masterplan housing"] },
  civic: { label: "Civic and community", words: ["library", "libraries", "community centre", "community hub", "civic", "town hall", "pool", "aquatic", "marae", "museum", "gallery", "hall", "recreation centre", "public toilet", "public toilets", "cemetery", "streetscape", "plaza", "waterfront"] },
  commercial: { label: "Commercial and workplace", words: ["office", "offices", "fit-out", "fitout", "workplace", "retail", "commercial", "hotel", "accommodation", "headquarters", "tenancy"] },
  heritage: { label: "Heritage and conservation", words: ["heritage", "restoration", "conservation", "historic", "strengthening", "seismic upgrade", "earthquake-prone", "earthquake prone"] },
  justice: { label: "Justice and safety", words: ["police", "court", "courthouse", "corrections", "prison", "fire station", "fenz", "emergency services", "defence"] },
  sport: { label: "Sport and recreation", words: ["stadium", "sports", "sport", "arena", "events centre", "gym", "changing rooms", "clubrooms", "pavilion", "grandstand", "recreation"] },
};

// Words that say a notice is asking for design or advice (architects), and words that say it is building work or supply.
const DESIGN_WORDS = ["architect", "architects", "architectural", "architecture", "design services", "lead design", "lead designer", "concept design", "detailed design", "developed design", "design team", "design and consenting", "design and consent", "master plan", "masterplan", "masterplanning", "feasibility", "spatial framework", "options assessment", "business case", "consultancy", "consultant", "consultants", "professional services", "design review", "briefing", "heritage assessment", "building condition"];
// In the overview (not only the title) these still say that design is being sought.
const STRONG_DESIGN = ["architects", "architectural services", "architectural design", "registered architect", "lead architect", "design services", "lead design", "concept design", "detailed design", "master plan", "masterplan", "feasibility study"];
// Notices that are about buildings and places, not software, supplies or services: by UNSPSC family (building and facility construction 72, structures 30,
// land and buildings 95, professional engineering 8110) or by words in the title and overview. A hunt for an architecture practice leaves the rest out.
const BUILT_FAMILIES = ["72", "95", "30", "8110", "8112"], IT_FAMILIES = ["43", "8111", "8115", "8116"];
const BUILT_WORDS = ["building", "buildings", "facility", "facilities", "refurbishment", "redevelopment", "renovation", "construction", "fit-out", "fitout", "masterplan", "master plan", "architect", "architects", "architectural", "design services", "concept design", "detailed design", "feasibility", "library", "pavilion", "classroom", "classrooms", "toilet block", "marae", "stadium", "hospital", "town hall", "community hall", "pool", "streetscape", "housing", "apartment", "apartments", "dwelling", "dwellings", "campus"];
// Roads, pipes, electrical gear and collections: not an architecture practice's work.
const INFRA_WORDS = ["roundabout", "cycle path", "cycleway", "culvert", "stormwater", "sewer", "wastewater", "watermain", "reservoir", "bridge", "intersection", "carriageway", "pavement", "state highway", "transmission line", "substation", "network design", "electricity", "electrical", "disconnector", "earth switch", "telemetry", "high voltage", "groyne", "pa system", "collections"];
const WORKS_WORDS = ["supply", "drain laying", "plumbing", "main contractor", "main contractors", "maintenance", "repair", "repairs", "supply of", "supply and install", "replacement", "fire alarm", "painting", "cleaning", "resurfacing", "reseal", "mowing", "contractors", "contractor", "design and build", "design & build", "design build", "construction contract", "civil works", "earthworks", "demolition", "roofing", "reroof", "re-roof", "flooring supply"];

const clean = (s) => String(s ?? "").trim();
export const fold = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const escRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** a whole word or phrase (an "s" on the end is allowed), in text that has been folded to plain lower case */
const RE = new Map(); // compiled once per term: a notice list is scored against the same few dozen words hundreds of times
const wordRe = (term) => { let r = RE.get(term); if (!r) { r = new RegExp(`(?:^|[^a-z0-9])${escRe(fold(term).trim())}s?(?=$|[^a-z0-9])`); if (RE.size > 2000) RE.clear(); RE.set(term, r); } return r; };
const hit = (text, term) => wordRe(term).test(text);

// ---- the practice's lens, from the query ---------------------------------------------------------------------------------------------
const list = (v, max, len) => [...new Set(String(v ?? "").split(",").map((s) => s.replace(/\s+/g, " ").trim().slice(0, len)).filter(Boolean))].slice(0, max);
const money = (v) => { const d = String(v ?? "").replace(/[^\d.]/g, ""), n = Number(d); return /\d/.test(d) && Number.isFinite(n) && n >= 0 ? Math.min(n, 1e11) : null; };

/** The lens a practice asked for, cleaned: only known regions and sectors, bounded lists, numbers or null. */
export function parseLens(p = {}) {
  const regionKey = new Map(REGIONS.map((r) => [fold(r), r]));
  const regions = list(p.regions, 17, 40).map((r) => regionKey.get(fold(r))).filter(Boolean);
  const sectors = list(p.sectors, 8, 20).map((s) => fold(s)).filter((s) => Object.hasOwn(SECTORS, s));
  const keywords = list(p.keywords, 20, 40);
  let min = money(p.min), max = money(p.max);
  if (min != null && max != null && min > max) [min, max] = [max, min];
  const sources = list(p.sources, 8, 20).map((s) => fold(s));
  return { keywords, regions: [...new Set(regions)], sectors: [...new Set(sectors)], min, max, sources };
}
export const lensIsEmpty = (l) => !l.keywords.length && !l.sectors.length;

// ---- reading the GETS feed ----------------------------------------------------------------------------------------------------------
const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const safeChar = (n) => (Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : "");
export const decodeEntities = (s) => String(s)
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => safeChar(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => safeChar(Number(d)))
  .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
const stripCdata = (s) => s.replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, "$1");
/** markup (already decoded) to plain text, with a line break at each cell, row and <br> */
export function markupToText(html) {
  return decodeEntities(String(html).replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ").replace(/<\/(td|th|tr|p|div|li)>|<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, " "))
    .replace(/[​-‍﻿]/g, "").replace(/[ \t\r]+/g, " ").replace(/\n\s*/g, "\n").trim();
}
const tag = (block, name) => { const m = block.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, "i")); return m ? stripCdata(m[1]) : ""; };

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
/** "Saturday, 30 June 2029 11:30 PM +12:00" to an ISO time, or null */
export function parseGetsDate(text) {
  const m = String(text).match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)\s*([+-])(\d{2}):(\d{2})/i);
  if (!m) return null;
  const month = MONTHS.indexOf(m[2].toLowerCase());
  if (month < 0) return null;
  let hour = Number(m[4]) % 12;
  if (m[6].toUpperCase() === "PM") hour += 12;
  const offset = (m[7] === "-" ? -1 : 1) * (Number(m[8]) * 60 + Number(m[9]));
  const utc = Date.UTC(Number(m[3]), month, Number(m[1]), hour, Number(m[5])) - offset * 60000;
  return Number.isFinite(utc) ? new Date(utc).toISOString() : null;
}

const LABEL = /^(RFx ID|Organisation|Open date|Close date|Categories|Region|Overview):/i;
/** The fields of the description table. Region and Categories can hold several lines; Overview holds the rest of the text. */
function fields(text) {
  const out = {}, lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(new RegExp(`${LABEL.source}\\s*(.*)$`, "i"));
    if (!m) continue;
    const key = m[1].toLowerCase(), rest = [];
    if (m[2]) rest.push(m[2]);
    for (let j = i + 1; j < lines.length && !LABEL.test(lines[j]); j++) { rest.push(lines[j]); if (key !== "overview" && key !== "region" && key !== "categories") break; }
    out[key] = key === "region" || key === "categories" ? rest : rest.join(" ");
  }
  return out;
}

export const isGetsUrl = (url) => { try { const u = new URL(url); return u.protocol === "https:" && u.hostname === "www.gets.govt.nz" && !u.port && !u.username && !u.password; } catch { return false; } };

/**
 * A value the notice itself states: "estimated contract value ... $16.3 million". Only that wording, never an annual figure, and never a guess.
 * Returns { value, text } or null.
 */
export function publishedValue(overview) {
  const m = String(overview ?? "").match(/\b(?:estimated|total|contract|project|construction|indicative)\s+(?:contract\s+|project\s+|construction\s+)?(?:value|budget|cost|price)\b[^$]{0,60}?(?:NZD?\s*)?\$\s?([\d][\d,]*(?:\.\d+)?)\s*(million|m|thousand|k)?\b([^.]{0,40})/i);
  if (!m || /\b(per annum|per year|a year|annually|p\.a\.)\b/i.test(m[3] ?? "")) return null;
  const n = Number(m[1].replace(/,/g, "")), mult = /^m/i.test(m[2] ?? "") ? 1e6 : /^(k|thousand)/i.test(m[2] ?? "") ? 1e3 : 1;
  const value = n * mult;
  return Number.isFinite(value) && value > 0 ? { value: Math.round(value), text: m[0].slice(0, 120).replace(/\s+/g, " ").trim() } : null;
}

/** GETS RSS text to tenders: { id, title, buyer, regions, categories, closes, closesText, opened, published, overview, url, value, valueText }. Feed text is data: never run, never shown as markup. */
export function parseGetsRss(xml) {
  if (/<!ENTITY/i.test(xml)) return [];
  const out = [];
  for (const item of String(xml).match(/<item\b[\s\S]*?<\/item>/gi) ?? []) {
    const title = markupToText(decodeEntities(tag(item, "title"))).replace(/\s+/g, " ").slice(0, 300);
    const link = decodeEntities(tag(item, "link")).trim();
    if (!title || !isGetsUrl(link)) continue;
    const f = fields(markupToText(decodeEntities(tag(item, "description"))));
    const id = clean(f["rfx id"] ?? new URL(link).searchParams.get("id") ?? link).slice(0, 40);
    const closes = f["close date"] ? parseGetsDate(f["close date"]) : null, opened = f["open date"] ? parseGetsDate(f["open date"]) : null;
    const dcDate = clean(tag(item, "dc:date")), full = f.overview ?? "", overview = full.slice(0, 900);
    const pv = publishedValue(full); // read from the whole overview, before it is shortened
    out.push({
      id, title, buyer: (f.organisation ?? markupToText(decodeEntities(tag(item, "dc:creator")))).slice(0, 200), url: link,
      regions: (f.region ?? []).map((r) => r.slice(0, 60)).slice(0, 20), categories: (f.categories ?? []).map((c) => c.slice(0, 120)).slice(0, 12),
      closes, closesText: clean(f["close date"]).slice(0, 80), opened: opened || (Number.isNaN(Date.parse(dcDate)) ? null : new Date(dcDate).toISOString()),
      overview, value: pv?.value ?? null, valueText: pv?.text ?? "",
    });
  }
  return out;
}

/** the date a time falls on in New Zealand ("2026-11-22") */
export const nzDay = (v) => { const t = new Date(v); return Number.isNaN(t.getTime()) ? "" : nzToday(t).ymd; };
const dayNo = (ymd) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) / 864e5 : NaN; };
const daysBetween = (a, b) => dayNo(b) - dayNo(a);

const money$ = (n) => (n >= 1e6 ? `$${+(n / 1e6).toFixed(1)} million` : n >= 1e3 ? `$${Math.round(n / 1e3)}k` : `$${n}`);
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// ---- scoring ------------------------------------------------------------------------------------------------------------------------
// Ported from radar-rank (terms found x 12, freshness (14 - age in days) x 1.5, a base weight of 18 for a tender), with the practice's
// own region, sector and value range added, and whaiao-hunt's rule that building works and supply are not a fit unless design is sought.
// Deterministic: the same notice, lens and day give the same score. The reasons say, in words, what made it.
export const FIT_MIN = 45;

/** Score one tender against a lens. Returns a signal, or null when it is closed, outside the regions, or matches nothing the practice asked for. */
export function scoreTender(t, lens, now = new Date()) {
  const today = nzDay(now);
  const closesDay = t.closes ? nzDay(t.closes) : "";
  const daysLeft = closesDay ? daysBetween(today, closesDay) : null;
  if (t.closes && Date.parse(t.closes) <= now.getTime()) return null; // closed
  const title = fold(t.title), rest = fold(`${t.buyer} ${t.overview}`), all = `${title} ${rest}`;
  const reasons = [], matched = { keywords: [], sectors: [] };
  const cats = t.categories ?? [], builtCat = cats.some((c) => BUILT_FAMILIES.some((f) => c.startsWith(f)));
  if (!builtCat && cats.some((c) => IT_FAMILIES.some((f) => c.startsWith(f)))) return null; // software and equipment
  if (!builtCat && !BUILT_WORDS.some((w) => hit(title, w)) && !STRONG_DESIGN.concat(["refurbishment", "redevelopment", "renovation", "new building"]).some((w) => hit(rest, w))) return null; // not about buildings or places
  let score = 18; // a tender notice is real, dated work: the radar's base weight for one

  let kw = 0;
  for (const k of lens.keywords) {
    if (hit(title, k)) { kw += 12; matched.keywords.push(k); } else if (hit(rest, k)) { kw += 6; matched.keywords.push(k); }
  }
  score += Math.min(kw, 36);
  let sec = 0;
  for (const key of lens.sectors) if (SECTORS[key].words.some((w) => hit(all, w))) { sec += 12; matched.sectors.push(key); }
  score += Math.min(sec, 24);
  if (!matched.keywords.length && !matched.sectors.length) return null;
  if (matched.keywords.length) reasons.push(`matches ${matched.keywords.slice(0, 3).map((k) => `“${k}”`).join(" and ")}`);
  if (matched.sectors.length) reasons.push(`${matched.sectors.slice(0, 2).map((k) => SECTORS[k].label.toLowerCase()).join(" and ")} work`);

  // where
  const regions = t.regions ?? [], all17 = regions.filter((r) => r !== NATIONWIDE && r !== "International");
  const named = all17.length >= 8 ? [] : all17; // a notice that lists most of the country is a national one
  let regionLabel = named.length ? (named.length > 2 ? `${named.slice(0, 2).join(", ")} and ${named.length - 2} more` : named.join(" and ")) : regions.includes(NATIONWIDE) || all17.length ? "New Zealand" : regions[0] ?? "";
  if (lens.regions.length) {
    const inside = named.filter((r) => lens.regions.includes(r));
    if (inside.length) { score += 10; reasons.push(`in ${inside.join(" and ")}`); }
    else if (!named.length && (regions.includes(NATIONWIDE) || all17.length)) { score += 3; reasons.push("nationwide, so it includes your regions"); }
    else return null; // somewhere else
  }

  // design asked for, or building work
  const designed = DESIGN_WORDS.some((w) => hit(title, w)) || STRONG_DESIGN.some((w) => hit(rest, w));
  const works = WORKS_WORDS.some((w) => hit(title, w));
  if (designed) { score += 24; reasons.push("asks for design or advice"); }
  if (INFRA_WORDS.some((w) => hit(title, w))) { score -= 20; reasons.push("looks like infrastructure, equipment or supply rather than buildings"); }
  if (!designed && works) { score -= 20; reasons.push("looks like building work or supply rather than design"); }

  // value, when the notice states one
  if (t.value != null) {
    const low = lens.min != null && t.value < lens.min, high = lens.max != null && t.value > lens.max;
    if (low || high) { score -= 15; reasons.push(`stated value ${money$(t.value)} is ${low ? "under" : "over"} your usual range`); }
    else if (lens.min != null || lens.max != null) { score += 8; reasons.push(`stated value ${money$(t.value)} fits your usual range`); }
  }

  // timing and freshness (the radar's 14-day freshness window)
  if (daysLeft != null) {
    if (daysLeft <= 2) { score -= 12; reasons.push(daysLeft <= 0 ? "closes today: very tight" : `closes in ${plural(daysLeft, "day")}: tight`); }
    else if (daysLeft <= 60) reasons.push(`closes in ${plural(daysLeft, "day")}`);
    else reasons.push(`closes ${closesDay.split("-").reverse().join("/")}: plenty of time`);
  } else { score -= 8; reasons.push("no closing date in the notice"); }
  const age = t.opened ? Math.max(0, daysBetween(nzDay(t.opened), today)) : null;
  if (age != null) { score += Math.max(0, 14 - age) * 1.5; if (age <= 7) reasons.push(age === 0 ? "opened today" : `opened ${plural(age, "day")} ago`); }

  const fit = Math.max(0, Math.min(100, Math.round(score)));
  return {
    id: `gets:${t.id}`, title: t.title, buyer: t.buyer, region: regionLabel, regions, closes: t.closes, closesDay, daysLeft,
    value: t.value, valueText: t.valueText, url: t.url, source: "gets", sourceName: "GETS", published: t.opened ? nzDay(t.opened) : "",
    fit, reasons, matched,
  };
}

/** Score and order a list of tenders: best fit first, then the soonest to close. Only those at or above FIT_MIN. */
export function rankTenders(tenders, lens, now = new Date(), limit = 40) {
  return tenders.map((t) => scoreTender(t, lens, now)).filter((s) => s && s.fit >= FIT_MIN)
    .sort((a, b) => b.fit - a.fit || (a.daysLeft ?? 9e9) - (b.daysLeft ?? 9e9) || a.title.localeCompare(b.title)).slice(0, limit);
}

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
