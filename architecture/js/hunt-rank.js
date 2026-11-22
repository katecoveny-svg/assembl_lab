// Ranking rules for found work: pure functions, no network. Shared by the live feed (api/_feeds/hunt.js, which reads the GETS RSS) and the
// ops page (architecture/js/hunt.js, which scores the notices the assembl radar already collected, in the browser).
// Prior art, ported to plain JS: the RSS reader from lib/os/data/gets.ts and the scoring idea from lib/workforce/jobs/radar-rank.ts (the assemblnz repo).
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
  kaupapa: { label: "Kaupapa Māori and Indigenous", words: [] }, // filled in below from CULTURAL_PLACES and CULTURAL_DESIGN; scored by culturalMatch()
};

// ---- the kaupapa Māori and Indigenous lens ---------------------------------------------------------------------------------------------
// A finding aid: it reads the words in a public notice and says which of these words it found. It does not judge cultural fit, it does not
// know whose rohe a place is in, and it contacts nobody. Every word is written with its macrons; fold() makes the match macron-insensitive
// ("Te Atatu marae" and "Te Atatū marae" are the same text). Whole words only: bare "te", "whare" and "trust" never match, and a place name
// that merely contains a Māori word ("Te Atatu", "Pouakai", "Whare Ra") does not match unless one of these words stands beside it.
// Spellings were taken from the te reo skill, Te Aka Māori Dictionary and the publishers' own names. Review them with a reo speaker (docs/architecture/pipeline-hunt-cultural-sources.md).
export const CULTURAL_PLACES = ["marae", "wharenui", "wharekai", "whare kai", "whare tūpuna", "whare karakia", "whare taonga", "wharekura", "kura kaupapa", "kura", "kaupapa Māori", "Māori medium", "Māori-medium", "whānau room", "kōhanga reo", "wānanga", "papakāinga", "kaumātua housing", "urupā", "ātea", "pā site", "Māori housing", "Māori health", "hauora Māori", "taha Māori", "Pasifika", "Pacific church", "fale", "cultural centre", "Indigenous"];
export const CULTURAL_DESIGN = ["Te Aranga", "mana whenua", "tangata whenua", "cultural narrative", "cultural design", "cultural landscape", "iwi engagement", "mātauranga Māori", "kaitiakitanga", "whakairo", "tukutuku", "pou", "carving", "taonga", "Te Tiriti"];
/** buyers and funders: matched in the buyer field and in the text */
export const CULTURAL_BUYERS = ["iwi", "hapū", "rūnanga", "Māori trust board", "Māori land trust", "ahu whenua trust", "Māori incorporation", "Te Puni Kōkiri", "Te Tumu Paeroa", "Te Arawhiti", "Te Mātāwai", "Whai Kāinga Whai Oranga", "Waikato-Tainui", "Te Uru Taumatua", "Ngāti Whātua Ōrākei"];
/** a buyer whose name starts with one of these (a whole word) is an iwi or hapū entity: "Ngāti Porou Whanau Ora", "Ngāi Tahu Property", "Ngā Hapū o ..." */
export const CULTURAL_BUYER_PREFIXES = ["Ngāti", "Ngāi", "Ngā"];
// "Indigenous planting" and "indigenous vegetation" are landscape words, not a people, and "Indigenous businesses" is a supplier rule: they do not count
const INDIGENOUS_PLANTS = /(?:^|[^a-z0-9])indigenous(?=$|[^a-z0-9])(?!\s+(?:planting|plantings|plants|vegetation|species|flora|fauna|biodiversity|bush|forest|forests|trees|revegetation|habitat|habitats|ecosystem|ecosystems|landscaping|wildlife|birds|restoration|bird|business|businesses|suppliers?|enterprises?|firms?|compan(?:y|ies)|providers?|workers?|employment|apprentices?|owned)|-owned)/;
// Procurement "broader outcomes" text often says "Māori and Pasifika businesses are encouraged": suppliers and jobs, not a Pasifika building.
const PASIFIKA_PLACE = /(?:^|[^a-z0-9])pasifika(?=$|[^a-z0-9])(?!\s+(?:business|businesses|suppliers?|enterprises?|firms?|compan(?:y|ies)|providers?|workers?|employment|apprentices?|owned)|-owned)/;
SECTORS.kaupapa.words = [...CULTURAL_PLACES, ...CULTURAL_DESIGN];
// Buildings of this kind are buildings even when the title has no other building word ("Wharekura upgrade").
const CULTURAL_BUILT = ["wharenui", "wharekai", "whare kai", "whare tūpuna", "whare karakia", "whare taonga", "wharekura", "kura kaupapa", "kura", "kaupapa Māori", "Māori medium", "Māori-medium", "whānau room", "kōhanga reo", "papakāinga", "kaumātua housing", "Māori housing", "fale", "taha Māori"];


// Words that say a notice is asking for design or advice (architects), and words that say it is building work or supply.
const DESIGN_WORDS = ["architect", "architects", "architectural", "architecture", "design services", "lead design", "lead designer", "concept design", "detailed design", "developed design", "design team", "design and consenting", "design and consent", "master plan", "masterplan", "masterplanning", "feasibility", "spatial framework", "options assessment", "business case", "consultancy", "consultant", "consultants", "professional services", "design review", "briefing", "heritage assessment", "building condition"];
// In the overview (not only the title) these still say that design is being sought.
const STRONG_DESIGN = ["architects", "architectural services", "architectural design", "registered architect", "lead architect", "design services", "lead design", "concept design", "detailed design", "master plan", "masterplan", "feasibility study"];
// Notices that are about buildings and places, not software, supplies or services: by UNSPSC family (building and facility construction 72, structures 30,
// land and buildings 95, professional engineering 8110) or by words in the title and overview. A hunt for an architecture practice leaves the rest out.
const BUILT_FAMILIES = ["72", "95", "30", "8110", "8112"], IT_FAMILIES = ["43", "8111", "8115", "8116"];
const BUILT_WORDS = ["building", "buildings", "facility", "facilities", "refurbishment", "redevelopment", "renovation", "construction", "fit-out", "fitout", "masterplan", "master plan", "architect", "architects", "architectural", "design services", "concept design", "detailed design", "feasibility", "library", "pavilion", "classroom", "classrooms", "toilet block", "marae", "stadium", "hospital", "town hall", "community hall", "pool", "streetscape", "housing", "apartment", "apartments", "dwelling", "dwellings", "campus"];
// Roads, pipes, electrical gear and collections: not an architecture practice's work.
const BUILT_WORDS_ALL = BUILT_WORDS.concat(CULTURAL_BUILT);
const INFRA_WORDS = ["roundabout", "cycle path", "cycleway", "culvert", "stormwater", "sewer", "wastewater", "watermain", "reservoir", "bridge", "intersection", "carriageway", "pavement", "state highway", "transmission line", "substation", "network design", "electricity", "electrical", "disconnector", "earth switch", "telemetry", "high voltage", "groyne", "pa system", "collections"];
const WORKS_WORDS = ["supply", "drain laying", "plumbing", "main contractor", "main contractors", "maintenance", "repair", "repairs", "supply of", "supply and install", "replacement", "fire alarm", "painting", "cleaning", "resurfacing", "reseal", "mowing", "contractors", "contractor", "design and build", "design & build", "design build", "construction contract", "civil works", "earthworks", "demolition", "roofing", "reroof", "re-roof", "flooring supply"];

const clean = (s) => String(s ?? "").trim();
export const fold = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const escRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** a whole word or phrase (an "s" on the end is allowed), in text that has been folded to plain lower case */
const RE = new Map(); // compiled once per term: a notice list is scored against the same few dozen words hundreds of times
const wordRe = (term) => { let r = RE.get(term); if (!r) { r = new RegExp(`(?:^|[^a-z0-9])${escRe(fold(term).trim())}s?(?=$|[^a-z0-9])`); if (RE.size > 2000) RE.clear(); RE.set(term, r); } return r; };
const hit = (text, term) => wordRe(term).test(text);

/**
 * Does this notice carry kaupapa Māori or Indigenous words? { on, why } where why is the words found, as written in the lists above
 * (at most 8, places first, then design language, then buyers). t = { title, buyer, overview }. It reads words; it says nothing about
 * whether a practice is the right one for the work or what the community wants.
 */
export function culturalMatch(t = {}) {
  const title = fold(t.title), buyer = fold(t.buyer), rest = fold(t.overview), text = `${title} ${buyer} ${rest}`;
  const why = [], seen = new Set();
  const add = (label) => { const k = fold(label); if (!seen.has(k)) { seen.add(k); why.push(label); } };
  for (const term of [...CULTURAL_PLACES, ...CULTURAL_DESIGN, ...CULTURAL_BUYERS]) {
    const k = fold(term);
    if (k === "indigenous" ? INDIGENOUS_PLANTS.test(text) : k === "pasifika" ? PASIFIKA_PLACE.test(text) : hit(text, term)) add(term);
  }
  const first = clean(t.buyer).split(/\s+/)[0] ?? "";
  if (first && CULTURAL_BUYER_PREFIXES.some((p) => fold(p) === fold(first).replace(/[^a-z0-9]/g, ""))) add(first.replace(/[^\p{L}\p{N}-]/gu, ""));
  return { on: why.length > 0, why: why.slice(0, 8) };
}

// ---- the practice's lens, from the query ---------------------------------------------------------------------------------------------
const list = (v, max, len) => [...new Set(String(v ?? "").split(",").map((s) => s.replace(/\s+/g, " ").trim().slice(0, len)).filter(Boolean))].slice(0, max);
const money = (v) => { const d = String(v ?? "").replace(/[^\d.]/g, ""), n = Number(d); return /\d/.test(d) && Number.isFinite(n) && n >= 0 ? Math.min(n, 1e11) : null; };

/** The lens a practice asked for, cleaned: only known regions and sectors, bounded lists, numbers or null, and the "always show cultural work" switch. */
export function parseLens(p = {}) {
  const regionKey = new Map(REGIONS.map((r) => [fold(r), r]));
  const regions = list(p.regions, 17, 40).map((r) => regionKey.get(fold(r))).filter(Boolean);
  const sectors = list(p.sectors, 8, 20).map((s) => fold(s)).filter((s) => Object.hasOwn(SECTORS, s));
  const keywords = list(p.keywords, 20, 40);
  let min = money(p.min), max = money(p.max);
  if (min != null && max != null && min > max) [min, max] = [max, min];
  const sources = list(p.sources, 8, 20).map((s) => fold(s));
  const cultural = p.cultural === true || /^(1|true|on)$/i.test(String(p.cultural ?? ""));
  return { keywords, regions: [...new Set(regions)], sectors: [...new Set(sectors)], min, max, sources, cultural };
}
export const lensIsEmpty = (l) => !l.keywords.length && !l.sectors.length && !l.cultural;

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
const NZ_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland", year: "numeric", month: "2-digit", day: "2-digit" });
export const nzDay = (v) => { const t = new Date(v); return Number.isNaN(t.getTime()) ? "" : NZ_DAY.format(t); };
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
  if (!builtCat && !BUILT_WORDS_ALL.some((w) => hit(title, w)) && !STRONG_DESIGN.concat(["refurbishment", "redevelopment", "renovation", "new building"]).some((w) => hit(rest, w))) return null; // not about buildings or places
  let score = 18; // a tender notice is real, dated work: the radar's base weight for one

  let kw = 0;
  for (const k of lens.keywords) {
    if (hit(title, k)) { kw += 12; matched.keywords.push(k); } else if (hit(rest, k)) { kw += 6; matched.keywords.push(k); }
  }
  score += Math.min(kw, 36);
  const cultural = culturalMatch(t);
  let sec = 0;
  for (const key of lens.sectors) if (key === "kaupapa" ? cultural.on : SECTORS[key].words.some((w) => hit(all, w))) { sec += 12; matched.sectors.push(key); }
  score += Math.min(sec, 24);
  const keptCultural = lens.cultural && cultural.on; // "always show": kept even when it misses the practice's own words and sectors
  if (!matched.keywords.length && !matched.sectors.length && !keptCultural) return null;
  if (matched.keywords.length) reasons.push(`matches ${matched.keywords.slice(0, 3).map((k) => `“${k}”`).join(" and ")}`);
  if (matched.sectors.length) reasons.push(`${matched.sectors.slice(0, 2).map((k) => (k === "kaupapa" ? SECTORS[k].label : SECTORS[k].label.toLowerCase())).join(" and ")} work`);
  if (lens.cultural && cultural.on) { score += 8; reasons.push(`kaupapa Māori or Indigenous words in the notice: ${cultural.why.slice(0, 4).map((w) => `“${w}”`).join(", ")}`); }

  // where
  const regions = t.regions ?? [], all17 = regions.filter((r) => r !== NATIONWIDE && r !== "International");
  const named = all17.length >= 8 ? [] : all17; // a notice that lists most of the country is a national one
  let regionLabel = named.length ? (named.length > 2 ? `${named.slice(0, 2).join(", ")} and ${named.length - 2} more` : named.join(" and ")) : regions.includes(NATIONWIDE) || all17.length ? "New Zealand" : regions[0] ?? "";
  if (lens.regions.length) {
    const inside = named.filter((r) => lens.regions.includes(r));
    if (inside.length) { score += 10; reasons.push(`in ${inside.join(" and ")}`); }
    else if (!named.length && (regions.includes(NATIONWIDE) || all17.length)) { score += 3; reasons.push("nationwide, so it includes your regions"); }
    else if (t.regionUnknown) reasons.push("the alert email does not state a region"); // an alert email has no region: kept, and said so
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
    fit, reasons, matched, cultural,
  };
}

/** Score and order a list of tenders: best fit first, then the soonest to close. Only those at or above FIT_MIN. */
export function rankTenders(tenders, lens, now = new Date(), limit = 40) {
  return tenders.map((t) => scoreTender(t, lens, now)).filter((s) => s && s.fit >= FIT_MIN)
    .sort((a, b) => b.fit - a.fit || (a.daysLeft ?? 9e9) - (b.daysLeft ?? 9e9) || a.title.localeCompare(b.title)).slice(0, limit);
}

// ---- notices the radar has already collected (public.kb_documents), read through arch.hunt_signals ------------------------------------
/** One row of arch.hunt_signals to a tender the scorer understands. The row holds only public fields; a snippet of 200 characters stands in for the overview. */
export function tenderFromKb(row) {
  row = row && typeof row === "object" ? row : {};
  const url = clean(row.url);
  if (!isGetsUrl(url)) return null; // only notices that link to the public GETS page
  const id = clean(new URL(url).searchParams.get("id") ?? row.id).slice(0, 40);
  const title = clean(row.title).replace(/\s+/g, " ").slice(0, 300);
  if (!id || !title) return null;
  const regionText = ` ${fold(row.region)} `;
  const regions = [...REGIONS, NATIONWIDE, "International"].filter((r) => regionText.includes(` ${fold(r)} `)).map((r) => r);
  const closesText = clean(row.closes_text).slice(0, 80), closes = closesText ? parseGetsDate(closesText) : null;
  const opened = row.published_at || row.inserted_at, overview = clean(row.snippet).slice(0, 200);
  const pv = publishedValue(overview);
  return {
    id, title, buyer: clean(row.buyer).slice(0, 200), url, regions, categories: clean(row.categories).match(/\b\d{8}\b/g) ?? [],
    closes, closesText, opened: opened && !Number.isNaN(Date.parse(opened)) ? new Date(opened).toISOString() : null, overview, value: pv?.value ?? null, valueText: pv?.text ?? "",
  };
}

/** Score the rows from arch.hunt_signals against a lens. Same scorer, same gates, same reasons as the live feed; source is marked "radar". */
export function rankKbRows(rows, lens, now = new Date(), limit = 40) {
  const tenders = (Array.isArray(rows) ? rows : []).map(tenderFromKb).filter(Boolean);
  return rankTenders(tenders, lens, now, limit).map((s) => ({ ...s, source: "radar", sourceName: "Radar" }));
}

// ---- "Leads to look into": news stories, read only for a building or a place a practice could design or improve --------------------------
// A lead is a story, not a tender and not an opportunity. This reads a headline and a short summary that the radar collected, decides whether the story is about a
// place or building that someone may need to design, repair or rebuild, and writes one short reason in assembl's own words. It never quotes the story, and the
// page never shows the summary: only the headline, the source, the day and a link. Deterministic: the same story, lens and day give the same answer.
export const LEAD_MIN = 50;
export const NEWS_HOSTS = ["stuff.co.nz", "www.stuff.co.nz", "rnz.co.nz", "www.rnz.co.nz", "newsroom.co.nz", "www.newsroom.co.nz", "thedailyblog.co.nz", "www.thedailyblog.co.nz"];
const NEWS_NAME = { stuff: "Stuff", rnz: "RNZ", newsroom: "Newsroom", "the daily blog": "The Daily Blog" };

// a place or a building: [word, how it reads in a reason]
const LEAD_PLACES = [["school", "school"], ["kura", "kura"], ["wharekura", "wharekura"], ["kindergarten", "kindergarten"], ["early learning centre", "early learning centre"], ["university", "university building"], ["campus", "campus"], ["classroom", "classroom block"],
  ["marae", "marae building"], ["wharenui", "wharenui"], ["wharekai", "wharekai"], ["hospital", "hospital"], ["clinic", "clinic"], ["health centre", "health centre"], ["medical centre", "medical centre"], ["rest home", "rest home"], ["aged care", "aged care facility"], ["care home", "care home"],
  ["library", "library"], ["community centre", "community centre"], ["community hall", "community hall"], ["hall", "hall"], ["pool", "pool"], ["aquatic centre", "aquatic centre"], ["town hall", "town hall"], ["civic centre", "civic centre"], ["museum", "museum"], ["gallery", "gallery"], ["theatre", "theatre"],
  ["stadium", "stadium"], ["pavilion", "pavilion"], ["clubrooms", "clubrooms"], ["grandstand", "grandstand"], ["sports centre", "sports centre"], ["recreation centre", "recreation centre"], ["leisure centre", "leisure centre"], ["events centre", "events centre"],
  ["church", "church"], ["courthouse", "courthouse"], ["police station", "police station"], ["fire station", "fire station"], ["prison", "prison"], ["housing", "housing"], ["apartments", "apartment building"], ["retirement village", "retirement village"],
  ["hotel", "hotel"], ["office block", "office building"], ["cemetery", "cemetery"], ["public toilets", "public toilets"], ["cultural centre", "cultural centre"], ["homestead", "homestead"], ["woolshed", "woolshed"], ["villa", "villa"], ["whare", "whare"],
  ["building", "building"], ["buildings", "buildings"]];
const BUILDING_NOT_NEXT = new Set(["a", "an", "the", "his", "her", "their", "its", "our", "my", "your", "up", "trust", "credibility", "work", "works", "project", "consent", "consents", "confidence", "support", "momentum", "bridges", "on", "from", "out", "back", "blocks", "society", "site", "sites", "industry", "code", "warrant", "inspector", "inspectors", "materials", "costs"]);
const BUILDING_NOT_PREV = new Set(["spent", "been", "are", "is", "was", "were", "keep", "keeps", "for", "by", "about", "tough", "of", "started", "start", "begin", "begins", "stop", "from"]);
const NOT_A_PLACE_NEXT = new Set(["principal", "principals", "teacher", "teachers", "student", "students", "pupil", "pupils", "kids", "fees", "fee", "wag", "zone", "uniform", "uniforms", "holidays", "leavers", "board", "roll", "bus", "lunch", "lunches", "trustees", "champion", "champions", "team", "teams", "game", "games", "final", "ball", "camp", "year", "results", "exam", "exams", "strike", "strikes", "party", "table", "of", "tour", "gate", "fence", "year", "term", "children", "child", "staff", "visit", "cocktails", "consent", "consents", "work", "up", "trust", "credibility", "society", "inspector", "owner", "owners", "manager", "managers", "company", "contractor", "contractors", "site"]);
const HOSPITAL_PATIENT = /\b(?:to|in|into|from|at|of)\s+(?:the\s+)?(?:\w+\s+)?hospital\b|\bairlifted\b|\bhospital(?:ised|ized)\b/;
// what is happening to it: weak cues alone do not pass a story that is politics, sport or crime
const STRONG_CUES = ["upgrade", "upgraded", "upgrades", "rebuild", "rebuilt", "rebuilding", "redevelop", "redevelopment", "redeveloped", "refurbish", "refurbished", "refurbishment", "renovate", "renovated", "renovation", "restore", "restored", "restoration", "extension", "revamp", "revamped", "replace", "replaced", "replacement", "fire-damaged", "fire damaged", "damaged by fire", "destroyed", "gutted", "demolish", "demolished", "demolition", "earthquake-prone", "earthquake prone", "strengthening", "to be built", "funding for", "funding to", "takes over", "taken over", "converted", "repurpose", "repurposed", "condemned", "unsafe", "leaky", "mothballed", "red-stickered", "red stickered", "fire-ravaged", "burnt down", "burned down"];
const WEAK_CUES = ["new", "approved", "proposed", "plans", "plan for", "consent", "bought", "purchased", "sold", "expand", "expansion", "expanded", "funding", "funded", "million for", "build", "built", "overcrowded", "run-down", "closed", "closure"];
const DAMAGE_CUES = ["fire-damaged", "fire damaged", "damaged by fire", "destroyed", "gutted", "condemned", "unsafe", "fire-ravaged", "burnt down", "burned down", "red-stickered", "red stickered", "leaky", "earthquake-prone", "earthquake prone"];
const CRIME = /\b(?:jailed|sentenced|murder|arrested|charged|guilty|convicted|trial|stabbing|homicide|burglary|ram.?raid|offender|court hears|pleaded|manslaughter|sex offender)\b/;
const SPORT = /\b(?:all blacks|warriors|black caps|silver ferns|phoenix|rugby|netball|cricket|nrl|fifa|semi-final|quarter-final|cup final|test match|beat|beats|thrash|thrashed|rout|defeat|hat-trick)\b/;
const POLITICS = /\b(?:mp|mps|minister|ministers|prime minister|labour|nz first|opposition|poll|polls|election|coalition|parliament|caucus|luxon|hipkins|policy|policies|manifesto)\b/;
const OPINION = /^(?:opinion|editorial|comment|column|analysis|letters?|my view|cartoon)\s*[:|-]|\|\s*opinion\b/;
const FOREIGN = /\b(?:indonesia|indonesian|australia|australian|sydney|melbourne|brisbane|perth|united states|u\.s\.|london|britain|british|england|china|chinese|gaza|israel|ukraine|russia|india|japan|italy|italian|los angeles|california|texas|new york|canada|europe|france|paris|germany|ireland|south africa|thailand|philippines|korea|fiji|samoa|tonga|vanuatu|hong kong)\b/;
const NZ_WORDS = /\b(?:nz|new zealand|aotearoa|kiwi|kiwis)\b/;
const SECTION_OUT = /\/(?:world-news|world|sport|sports|entertainment|opinion|crime|crime-and-justice|travel|lifestyle|life-style|quizzes|podcasts?|pacific|political|politics|business-news|motoring|weather)\//;
// towns and cities to their regions: only so a story can be checked against the practice's regions. Not exhaustive: a story that names no place here is kept.
const TOWNS = { auckland: "Auckland", waiheke: "Auckland", manukau: "Auckland", papakura: "Auckland", "north shore": "Auckland", henderson: "Auckland", whangarei: "Northland", kaitaia: "Northland", kerikeri: "Northland", dargaville: "Northland", hamilton: "Waikato", cambridge: "Waikato", taupo: "Waikato", thames: "Waikato", coromandel: "Waikato", tauranga: "Bay of Plenty", rotorua: "Bay of Plenty", whakatane: "Bay of Plenty", opotiki: "Bay of Plenty", mount: "", gisborne: "Gisborne", tairawhiti: "Gisborne", napier: "Hawke's Bay", hastings: "Hawke's Bay", wairoa: "Hawke's Bay", "new plymouth": "Taranaki", hawera: "Taranaki", whanganui: "Manawatu-Wanganui", wanganui: "Manawatu-Wanganui", "palmerston north": "Manawatu-Wanganui", levin: "Manawatu-Wanganui", feilding: "Manawatu-Wanganui", ohakune: "Manawatu-Wanganui", "lower hutt": "Wellington", "upper hutt": "Wellington", porirua: "Wellington", masterton: "Wellington", kapiti: "Wellington", wairarapa: "Wellington", richmond: "Tasman", motueka: "Tasman", takaka: "Tasman", blenheim: "Marlborough", picton: "Marlborough", greymouth: "West Coast", westport: "West Coast", hokitika: "West Coast", christchurch: "Canterbury", timaru: "Canterbury", ashburton: "Canterbury", kaikoura: "Canterbury", rolleston: "Canterbury", dunedin: "Otago", queenstown: "Otago", wanaka: "Otago", oamaru: "Otago", alexandra: "Otago", invercargill: "Southland", gore: "Southland", te: "" };
delete TOWNS.mount; delete TOWNS.te;
/** the regions a story names, by region or by town (whole words, macron-insensitive) */
export function regionsNamed(text) {
  const t = fold(text), out = new Set();
  for (const r of REGIONS) if (hit(t, r)) out.add(r);
  for (const [town, region] of Object.entries(TOWNS)) if (hit(t, town)) out.add(region);
  if (hit(t, "hawkes bay")) out.add("Hawke's Bay");
  return [...out];
}

const tokens = (s) => fold(s).split(/[^a-z0-9$-]+/).filter(Boolean);
const phraseAt = (toks, phrase) => { const p = fold(phrase).split(/[^a-z0-9$-]+/).filter(Boolean), at = []; for (let i = 0; i + p.length <= toks.length; i++) if (p.every((w, k) => toks[i + k] === w || toks[i + k] === `${w}s`)) at.push(i); return at; };

/** the places in a text, with where they stand: [{ at, word, noun }] */
function placesIn(text) {
  const toks = tokens(text), found = [];
  for (const [word, noun] of LEAD_PLACES) for (const at of phraseAt(toks, word)) {
    const next = toks[at + word.split(" ").length], prev = toks[at - 1];
    if (next && NOT_A_PLACE_NEXT.has(next)) continue;
    if (word === "building" && ((next && BUILDING_NOT_NEXT.has(next)) || (prev && BUILDING_NOT_PREV.has(prev)))) continue; // "building credibility", "spent 15 years building"
    if (word === "buildings" && prev && BUILDING_NOT_PREV.has(prev)) continue;
    if (word === "hospital" && HOSPITAL_PATIENT.test(fold(text))) continue;
    if (word === "hall" && prev === "mcdonald") continue;
    found.push({ at, word, noun });
  }
  return { toks, found };
}
const cuesIn = (toks, list) => list.flatMap((c) => phraseAt(toks, c).map((at) => ({ at, cue: c })));

/**
 * Is this story about a place or building that a practice could design or improve? Returns a lead or null.
 *   story  { id, title, snippet, url, source, published }  (the snippet is read for ranking and then dropped)
 * The headline must name a place or building and say what is happening to it (new, upgrade, rebuild, fire-damaged, funding for ...), close together.
 * Politics, sport results, crime and opinion are left out unless the headline is plainly about a building project.
 */
export function scoreLead(story, lens, now = new Date()) {
  const title = clean(story.title), snippet = clean(story.snippet), url = clean(story.url);
  if (!title || /^https:\/\//.test(url) === false) return null;
  const host = (() => { try { return new URL(url).hostname.toLowerCase(); } catch { return ""; } })();
  if (!NEWS_HOSTS.includes(host)) return null;
  if (SECTION_OUT.test(new URL(url).pathname)) return null;
  const ft = fold(title), all = `${ft} ${fold(snippet)}`;
  if (OPINION.test(ft)) return null;
  const { toks, found } = placesIn(title);
  if (!found.length) return null; // the headline itself must name the place
  const cues = [...cuesIn(toks, STRONG_CUES).map((c) => ({ ...c, strong: true })), ...cuesIn(toks, WEAK_CUES).map((c) => ({ ...c, strong: false }))];
  let pair = null;
  for (const p of found) for (const c of cues) {
    const gap = (c.at < p.at ? p.at - c.at : c.at - p.at) + (p.word.startsWith("building") ? 2 : 0), near = c.cue === "new" ? c.at < p.at && gap <= 4 : gap <= 7;
    if (near && (!pair || (c.strong && !pair.strong) || (c.strong === pair.strong && gap < pair.gap))) pair = { place: p, cue: c.cue, strong: c.strong, gap };
  }
  if (!pair) { // the cue may sit in the summary when it is a plain building project
    const st = tokens(snippet), sc = cuesIn(st, STRONG_CUES);
    if (sc.length) pair = { place: found[0], cue: sc[0].cue, strong: true, gap: 99 };
  }
  if (!pair) return null;
  const crime = CRIME.test(ft), sport = SPORT.test(ft), politics = POLITICS.test(ft);
  if ((crime || sport || politics) && !pair.strong) return null;
  if (crime && !DAMAGE_CUES.includes(pair.cue)) return null;
  const named = regionsNamed(`${title} ${snippet}`);
  if (FOREIGN.test(ft) && !named.length && !NZ_WORDS.test(all)) return null;
  const reasons = [], matched = { keywords: [], sectors: [] };
  let score = LEAD_MIN + (pair.strong ? 6 : 0);
  for (const k of lens.keywords ?? []) { if (hit(ft, k)) { score += 12; matched.keywords.push(k); } else if (hit(fold(snippet), k)) { score += 6; matched.keywords.push(k); } }
  const cultural = culturalMatch({ title, overview: snippet });
  let sec = 0;
  for (const key of lens.sectors ?? []) if (key === "kaupapa" ? cultural.on : SECTORS[key].words.some((w) => hit(all, w))) { sec += 10; matched.sectors.push(key); }
  score += Math.min(sec, 20) + Math.min(matched.keywords.length * 6, 12);
  if (lens.cultural && cultural.on) score += 10;
  if (lens.regions?.length && named.length) {
    const inside = named.filter((r) => lens.regions.includes(r));
    if (!inside.length) return null; // the story names somewhere else
    score += 10; reasons.push(`In ${inside.join(" and ")}.`);
  }
  const age = story.published ? Math.max(0, daysBetween(nzDay(story.published), nzDay(now))) : null;
  if (age != null) score += age <= 3 ? 6 : age <= 7 ? 3 : age > 21 ? -5 : 0;
  const noun = pair.place.noun, art = /^[aeiou]/.test(noun) ? "An" : "A", fire = /\bfire\b/.test(ft);
  const c = pair.cue;
  const burnt = fire && (DAMAGE_CUES.includes(c) || /^(?:rebuil|restor|replace|repair|redevelop)/.test(c));
  const main = DAMAGE_CUES.includes(c) || burnt ? `${art} ${noun} was ${fire ? "damaged by fire" : /unsafe|condemned|leaky|earthquake|red/.test(c) ? "found to be unsafe or in poor condition" : "badly damaged"}: repair or rebuild may follow.`
    : /^(?:demolish|demolition|strengthening)/.test(c) ? `${art} ${noun} may be demolished or strengthened: replacement or design work may follow.`
    : /^(?:takes over|taken over|converted|repurpose|bought|purchased|sold)/.test(c) ? `${art} ${noun} is changing hands or changing use: a fit-out or conversion may follow.`
    : /^(?:funding|funded|million for)/.test(c) ? `Funding is named for a ${noun}: a project may follow.`
    : c === "new" || /^(?:to be built|build|built|plan|plans|proposed|approved|consent)/.test(c) ? `A new ${noun} is announced or proposed: design or briefing work may follow.`
    : `${art} ${noun} is to be upgraded, extended or replaced: design work may follow.`;
  reasons.unshift(main);
  if (matched.keywords.length) reasons.push(`Mentions ${matched.keywords.slice(0, 3).map((k) => `“${k}”`).join(" and ")}, from your words.`);
  if (matched.sectors.length) reasons.push(`Fits your ${matched.sectors.slice(0, 2).map((k) => (k === "kaupapa" ? SECTORS[k].label : SECTORS[k].label.toLowerCase())).join(" and ")} work.`);
  if (cultural.on) reasons.push(`Carries kaupapa Māori or Indigenous words: ${cultural.why.slice(0, 4).map((w) => `“${w}”`).join(", ")}.`);
  const regionLabel = named.length ? (named.length > 2 ? `${named.slice(0, 2).join(", ")} and ${named.length - 2} more` : named.join(" and ")) : "";
  return {
    id: story.id, kind: "lead", title, url, source: "news", sourceName: story.sourceName, published: story.published ? nzDay(story.published) : "",
    reason: main, reasons, fit: Math.max(0, Math.min(100, Math.round(score))), region: regionLabel, matched, cultural,
  };
}

/** One row of arch.hunt_leads to a story the scorer reads. The snippet is carried only to this scorer. */
export function storyFromKb(row) {
  row = row && typeof row === "object" ? row : {};
  const id = clean(row.id).slice(0, 60), title = clean(row.title).replace(/\s+/g, " ").slice(0, 200), url = clean(row.url).slice(0, 500);
  if (!id || !title) return null;
  const name = clean(row.source).replace(/\s+[—–-]\s+top stories$/i, "").toLowerCase();
  const published = row.published_at && !Number.isNaN(Date.parse(row.published_at)) ? new Date(row.published_at).toISOString() : "";
  return { id: `lead:${id}`, title, url, snippet: clean(row.snippet).slice(0, 200), sourceName: NEWS_NAME[name] ?? clean(row.source).slice(0, 40), published };
}

/** Score and order the stories: best fit first, then the newest. The same story told by two sources shows once. Returns leads without any summary text. */
export function rankLeads(rows, lens, now = new Date(), limit = 12) {
  const seen = new Set();
  return (Array.isArray(rows) ? rows : []).map(storyFromKb).filter(Boolean).map((s) => scoreLead(s, lens, now)).filter((l) => l && l.fit >= LEAD_MIN)
    .sort((a, b) => b.fit - a.fit || b.published.localeCompare(a.published) || a.title.localeCompare(b.title))
    .filter((l) => { const k = fold(l.title).replace(/[^a-z0-9]+/g, " ").trim().slice(0, 50); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, limit);
}
