// Rule changes coming: NZ legislation and bills that may change how buildings are designed, consented, funded or protected.
// Pure: no network, no page, no clock unless one is passed. Used by the live feed (api/_feeds/rules-legislation.js, rules.js), by the page
// (hunt-rules.js) for the bills a member's records hold, and by the tests.
//
// What it does, in order:
//   parseWorks(json)         the Legislation API's works list (Parliamentary Counsel Office, v0 beta) into bounded records; links only on www.legislation.govt.nz
//   parseVersionsDate(json)  the newest version's date from a versions answer (the fallback when a version_id carries none)
//   billFromRow(row)         one bill from the radar's Parliament rows (arch.hunt_rules) as a record
//   classify(title)          what a title may change, in our own words (the RULES table below); null when it is not about the built environment
//   rankRules(records, ...)  keep the built environment, drop the rest (with a reason), dedupe, newest first
//   filterRules(items, ...)  by the practice's regions and by one topic
//
// Every "why" says "may": a title tells us what an instrument is about, not what it does. Nothing here is legal advice.
import { fold } from "./hunt-rank.js";
import { whereIs } from "./signals-rank.js";

export const LEGISLATION_HOST = "www.legislation.govt.nz";
export const BILLS_HOST = "bills.parliament.nz";
export const NOT_LEGAL_ADVICE = "This is not legal advice. Read the legislation and talk to the council or an adviser.";
export const STAGES = ["bill", "amendment paper", "act", "regulations", "order"];
export const MAX_AGE_DAYS = 365; // a version older than this is history, not a change coming
export const RULES_MAX = 40;
/** the topics a person can filter by; each rule below names one or more */
export const TOPICS = [
  ["building", "Building and consent"], ["safety", "Seismic, fire and site safety"], ["planning", "Planning and zoning"], ["housing", "Housing"],
  ["heritage", "Heritage"], ["schools", "Schools"], ["licensing", "Who may design or sign off"], ["maori", "Māori land"],
  ["funding", "Infrastructure and funding"], ["hazards", "Natural hazards and climate"],
];
export const TOPIC_KEYS = TOPICS.map(([k]) => k);
export const topicLabel = (k) => TOPICS.find(([key]) => key === k)?.[1] ?? "";

const clean = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const T = (s) => fold(s).replace(/[()‘’'",:;]/g, " ").replace(/\s+/g, " ").trim();

// ---- what a title may change -------------------------------------------------------------------------------------------------------------
/** Titles that sound built-environment but are not (or are not for a design practice). Checked before the rules. */
const NOT_FOR_US = /building societ|capacity building|nation building|team building|electoral|official information|remuneration|elected member|emissions trading|crown minerals|gambling/;
/**
 * The rules, most specific first. A title can match several; the first gives the "why", up to two give "affects".
 *   topics   the filter chips it belongs to        re   tested against the folded title (lowercase, no macrons)
 *   affects  what it may change, in a phrase       why  a sentence that says "may" (a function when it uses a place)
 */
export const RULES = [
  { id: "licensing", topics: ["licensing"], re: /occupational licensing|licensed building practitioner|registered architects?|architects act|chartered professional engineers?|plumbers? gasfitters|plumbers and drainlayers|drainlayers?|electrical workers?|building practitioners?/,
    affects: "who may design or sign off building work", why: "May change who is allowed to design, build or sign off building work." },
  { id: "small-dwellings", topics: ["building", "housing"], re: /exempt .*(stand.?alone|small).*dwellings?|small stand.?alone dwellings?|granny flats?|minor dwellings?/,
    affects: "more small-dwelling (granny flat) work without building consent", why: "May let more small stand-alone dwellings (granny flats) be built without a building consent, which could mean more small-dwelling work." },
  { id: "earthquake-prone", topics: ["safety", "building"], re: /earthquake.?prone|seismic|structural strengthening/,
    affects: "seismic strengthening work and deadlines", why: "May change which buildings need seismic strengthening, how they are assessed and by when." },
  { id: "district-plan", topics: ["planning"], re: /district plan|plan modification|plan change|proposed plan/,
    affects: "zoning and height rules in that district", why: (place) => `May change zoning and height rules ${place ? `in ${place}` : "in the district it names"}.` },
  { id: "heritage", topics: ["heritage"], re: /heritage|historic places|pouhere taonga|antiquities/,
    affects: "listed buildings and consent for changes", why: "May change how listed buildings are protected and what consent changes to them need." },
  { id: "school", topics: ["schools"], re: /school (boards?|property|sites?|buildings?|network|planning)|early (learning|childhood) (services|premises)/,
    affects: "school building programmes", why: "May change who looks after school sites and property, which may affect school building programmes." },
  { id: "building-code", topics: ["building"], re: /building code/,
    affects: "what a design must meet under the Building Code", why: "May change what a design has to meet under the Building Code." },
  { id: "building-consent", topics: ["building"], re: /building consents?|code compliance|building (product|products)|product certification|building (warrant|guarantee)s?/,
    affects: "building consent and how products and methods are accepted", why: "May change how building consents are applied for and decided, and which products and methods are accepted." },
  { id: "construction-contracts", topics: ["funding", "building"], re: /construction contracts?|retention (money|funds?)|payment claims?/,
    affects: "payment, retention and disputes on construction contracts", why: "May change how construction work is paid for, how retentions are held and how disputes are settled." },
  { id: "building", topics: ["building"], re: /\bbuilding\b|construction sector|building and construction/,
    affects: "building rules and how buildings are designed and built", why: "May change the rules for how buildings are designed, consented and built." },
  { id: "planning", topics: ["planning"], re: /resource management|resource consents?|fast.?track|planning (act|bill)|natural (and built )?environment (act|bill)|national (policy statement|environmental standard)|spatial plan/,
    affects: "how land use and resource consents are decided", why: "May change how land use and resource consents are planned, decided and appealed." },
  { id: "local-government", topics: ["funding", "planning"], re: /local government|local authorit|development contributions|rates capping/,
    affects: "council planning, development contributions and who pays for infrastructure", why: "May change how councils plan, charge development contributions and pay for infrastructure." },
  { id: "water", topics: ["funding", "planning"], re: /water services|drinking water|wastewater|stormwater|three waters/,
    affects: "water, wastewater and stormwater requirements for development", why: "May change what water, wastewater and stormwater a development has to provide or pay for." },
  { id: "maori-land", topics: ["maori", "housing"], re: /te ture whenua|maori land|papakainga|whenua maori/,
    affects: "building and development on Māori land", why: "May change how Māori land can be built on, developed or used, including papakāinga." },
  { id: "unit-titles", topics: ["housing"], re: /unit titles?/,
    affects: "how shared-ownership developments (unit titles) are set up and run", why: "May change how unit title developments are set up, managed and repaired." },
  { id: "kainga-ora", topics: ["housing"], re: /kainga ora/,
    affects: "public housing design and delivery", why: "May change how public housing is planned, designed and delivered." },
  { id: "healthy-homes", topics: ["housing", "building"], re: /healthy homes/,
    affects: "standards for rented homes", why: "May change the standards rented homes have to meet." },
  { id: "housing", topics: ["housing"], re: /\bhousing\b|retirement villages?|social housing|community housing/,
    affects: "housing supply and public housing work", why: "May change how housing is planned, funded or delivered." },
  { id: "health-safety", topics: ["safety"], re: /health and safety at work|construction work|asbestos|worksafe/,
    affects: "site safety duties for design and construction", why: "May change safety duties for people who design, manage or carry out construction work." },
  { id: "fire", topics: ["safety", "building"], re: /fire and emergency|fire safety|evacuation/,
    affects: "fire safety and evacuation in buildings", why: "May change fire safety and evacuation requirements for buildings." },
  { id: "hazards", topics: ["hazards"], re: /natural hazards?|climate (change )?adaptation|managed retreat|coastal hazards?|\bflood|civil defence|emergency management/,
    affects: "design and consent in areas exposed to natural hazards", why: "May change how natural hazards are weighed in design, consent and insurance." },
  { id: "public-works", topics: ["planning", "funding"], re: /public works|compulsory acquisition/,
    affects: "how land is taken or set aside for public projects", why: "May change how land is acquired or set aside for public projects." },
  { id: "infrastructure", topics: ["funding"], re: /infrastructure|urban development|te waihanga/,
    affects: "funding and planning of infrastructure and new neighbourhoods", why: "May change how infrastructure and new neighbourhoods are planned and paid for." },
  { id: "accessibility", topics: ["building"], re: /accessibility|accessible (buildings|communities)/,
    affects: "access requirements in buildings and public spaces", why: "May change access requirements for buildings and public spaces." },
];

/** What a title may change: { rule, matches, affects, why, topics } or null when it is not about the built environment. */
export function classify(title) {
  const t = T(title);
  if (!t || NOT_FOR_US.test(t)) return null;
  const matches = RULES.filter((r) => r.re.test(t));
  if (!matches.length) return null;
  const first = matches[0];
  const place = (() => { const w = whereIs(title); return w.towns[0] || (w.regions.find((r) => r !== "New Zealand") ?? ""); })();
  const why = typeof first.why === "function" ? first.why(place) : first.why;
  return { rule: first.id, matches: matches.map((m) => m.id), affects: [...new Set(matches.slice(0, 2).map((m) => m.affects))],
    why, topics: [...new Set(matches.flatMap((m) => m.topics))].slice(0, 3) };
}

// ---- reading the Legislation API ------------------------------------------------------------------------------------------------------------
const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;
export const realDay = (s) => { const m = YMD.exec(String(s ?? "")); if (!m) return ""; const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? String(s) : ""; };
/** the version date a version_id carries: its last YYYY-MM-DD ("act_public_2026_0012_2026-11-01"); '' when it has none */
export function dayFromVersionId(id) {
  const all = String(id ?? "").match(/\d{4}-\d{2}-\d{2}/g);
  return all ? realDay(all[all.length - 1]) : "";
}
/** a link on www.legislation.govt.nz: https, no port, no login, a plain path, no query or fragment. Anything else is ''. */
export function legislationUrl(u) {
  try {
    const x = new URL(String(u ?? ""));
    if (x.protocol !== "https:" || x.hostname !== LEGISLATION_HOST || x.port || x.username || x.password || x.search || x.hash) return "";
    return /^\/[A-Za-z0-9/_.\-%]{1,300}$/.test(x.pathname) ? `https://${LEGISLATION_HOST}${x.pathname}` : "";
  } catch { return ""; }
}
/** a Parliament bill page: https://bills.parliament.nz/v/<n>/<uuid> */
export function billUrl(u) {
  try {
    const x = new URL(String(u ?? ""));
    if (x.protocol !== "https:" || x.hostname !== BILLS_HOST || x.port || x.username || x.password || x.search || x.hash) return "";
    return /^\/v\/\d{1,2}\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(x.pathname) ? `https://${BILLS_HOST}${x.pathname}` : "";
  } catch { return ""; }
}
const word = (v) => { const s = String(v ?? "").toLowerCase().trim(); return /^[a-z_ -]{1,40}$/.test(s) ? s.replace(/[ -]/g, "_") : ""; };
const agencyName = (a) => clean(typeof a === "string" ? a : a?.name ?? a?.title ?? "").slice(0, 80);
const PATH_KIND = /^\/(act|bill|regulation|amendment-paper|legislativeinstrument|secondary-legislation)\/([a-z-]+)\/(\d{4})\/([A-Za-z0-9-]{1,12})(?:\/|$)/;
const STATUS_GONE = /repeal|revok|expir|replac|withdraw|lapse|terminat/;
const STATUS_WORDS = { in_force: "In force", not_yet_in_force: "Not yet in force", partially_in_force: "Partly in force", partly_in_force: "Partly in force" };

/**
 * The Legislation API's works list as bounded records. Real shape (checked 22 Nov 2026):
 *   { results:[ { title, act_classification|instrument_classification, act_status|instrument_status, act_type, instrument_type_group,
 *                 administering_agencies[], latest_matching_version{ title, version_id, is_latest_version, formats[{ type, url }] } } ], page, per_page, total }
 * A record: { id, title, stage, status, agencies, versionId, day, workId, formats:[{type,url}], url, kindPath }. Returns [] for anything that is not that shape.
 * Not read: anything outside the shape. Not kept: any field other than the ones named here.
 */
export function parseWorks(json) {
  const list = Array.isArray(json?.results) ? json.results.slice(0, 100) : [];
  const out = [];
  for (const r of list) {
    if (!r || typeof r !== "object") continue;
    const v = r.latest_matching_version && typeof r.latest_matching_version === "object" ? r.latest_matching_version : {};
    const title = clean(v.title || r.title).slice(0, 300);
    if (!title) continue;
    const formats = [], seen = new Set();
    for (const f of Array.isArray(v.formats) ? v.formats.slice(0, 12) : []) {
      const type = String(f?.type ?? "").toLowerCase(), url = legislationUrl(f?.url);
      if (!["html", "pdf", "xml"].includes(type) || !url || seen.has(type)) continue;
      seen.add(type); formats.push({ type, url });
    }
    if (!formats.length) continue; // no link on www.legislation.govt.nz: nothing to read, so nothing to show
    const m = PATH_KIND.exec(new URL(formats[0].url).pathname);
    const kindPath = m ? m[1] : "";
    const group = word(r.instrument_type_group), isInstrument = !!(r.instrument_type_group || r.instrument_status || r.instrument_classification);
    let stage = "";
    if (kindPath === "bill") stage = "bill";
    else if (kindPath === "amendment-paper") stage = "amendment paper";
    else if (kindPath === "act" || (!isInstrument && (r.act_type || r.act_status || r.act_classification))) stage = "act";
    else if (isInstrument || ["regulation", "legislativeinstrument", "secondary-legislation"].includes(kindPath)) {
      const t = T(title);
      stage = /^regulations?$|^regulation/.test(group) ? "regulations" : group === "order" ? "order" : /\bregulations?\b/.test(t) ? "regulations" : /\border\b/.test(t) ? "order" : "";
    }
    if (!stage) continue;
    const rawStatus = word(r.act_status ?? r.instrument_status);
    if (STATUS_GONE.test(rawStatus)) continue; // repealed, revoked, expired: not a change coming
    const status = stage === "bill" ? "Bill, not law until it passes" : stage === "amendment paper" ? "Proposed change to a bill"
      : STATUS_WORDS[rawStatus] ?? (rawStatus ? rawStatus.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()) : "Status not stated");
    const versionId = /^[A-Za-z0-9_.\-]{3,120}$/.test(String(v.version_id ?? "")) ? String(v.version_id) : "";
    const workId = /^[A-Za-z0-9_\-]{3,80}$/.test(String(r.work_id ?? v.work_id ?? "")) ? String(r.work_id ?? v.work_id) : (m ? `${m[1]}_${m[2].replace(/-/g, "")}_${m[3]}_${m[4]}`.slice(0, 80) : "");
    const pathId = m ? `${m[1]}-${m[2]}-${m[3]}-${m[4]}`.replace(/--+/g, "-").toLowerCase().slice(0, 56) : "";
    const id = pathId ? `rule:${pathId}` : workId ? `rule:${workId.toLowerCase().slice(0, 56)}` : "";
    if (!id) continue;
    out.push({ id, title, stage, status, agencies: (Array.isArray(r.administering_agencies) ? r.administering_agencies : []).map(agencyName).filter(Boolean).slice(0, 3),
      versionId, day: dayFromVersionId(versionId), workId, formats, url: formats.find((f) => f.type === "html")?.url ?? formats[0].url, kindPath, source: "legislation" });
  }
  return out;
}
/** The newest version's date from GET works/{id}/versions/?sort=desc. The answer's exact shape is not documented here, so a few are tried: { results:[{version_id}] } or a list. */
export function parseVersionsDate(json) {
  const list = Array.isArray(json) ? json : Array.isArray(json?.results) ? json.results : Array.isArray(json?.versions) ? json.versions : [];
  let best = "";
  for (const v of list.slice(0, 20)) { const d = dayFromVersionId(v?.version_id ?? v?.id); if (d && d > best) best = d; }
  return best;
}

// ---- Parliament bills the radar collected ----------------------------------------------------------------------------------------------------
const BILL_STAGE = { "select committee": "select committee", "first reading": "first reading", "second reading": "second reading", "third reading": "third reading", "committee of whole house": "committee of the whole House", "royal assent": "royal assent" };
/** One row of arch.hunt_rules (title, url, published_at, source, bill_status, current_stage; snippet is never read here) as a record, or null. */
export function billFromRow(row) {
  const title = clean(row?.title).slice(0, 300), url = billUrl(row?.url);
  if (!title || !url) return null;
  const day = realDay(String(row?.published_at ?? row?.day ?? "").slice(0, 10));
  const stage = BILL_STAGE[fold(row?.current_stage)] ?? "", passed = stage === "royal assent";
  const uuid = url.split("/").pop().replace(/-/g, "").slice(0, 24).toLowerCase();
  return { id: `rule:bill-${uuid}`, title, stage: "bill", status: passed ? "Passed: royal assent given" : stage ? `Before Parliament: ${stage}` : "Before Parliament",
    agencies: [], versionId: "", day, workId: "", formats: [{ type: "html", url }], url, kindPath: "bill", source: "parliament", passed };
}

// ---- turning a record into a card -------------------------------------------------------------------------------------------------------------
const nzDay = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const dayDiff = (a, b) => (Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) / 864e5;
const badgeOf = (rec) => (rec.stage === "bill" || rec.stage === "amendment paper" ? (rec.passed ? "Passed" : "Bill") : /^in force$/i.test(rec.status) ? "In force" : /^not yet in force$/i.test(rec.status) ? "Not yet in force" : "");
/** The base of a title for telling a bill from the act it became: no trailing Act/Bill, year or "No 2". */
export const titleKey = (title) => T(title).replace(/\b(act|bill)\b(?:\s+\d{4})?\s*$/, "").replace(/\bno\s*\d+\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/** A record as an item of the lane, or { dropped, why }. */
export function toRule(rec, now = new Date()) {
  const c = classify(rec.title);
  if (!c) return { dropped: true, title: rec.title, why: "Not about buildings, planning, housing or property." };
  if (!rec.day) return { dropped: true, title: rec.title, why: "No version date could be read." };
  const age = dayDiff(rec.day, nzDay(now));
  if (age > MAX_AGE_DAYS) return { dropped: true, title: rec.title, why: "Older than a year." };
  const w = whereIs(rec.title), regions = w.regions.filter((r) => r !== "New Zealand");
  const hosted = rec.source === "parliament" ? "NZ Parliament" : "NZ Legislation";
  return { id: rec.id, kind: "rule", title: rec.title, source: hosted, sourceUrl: rec.url, day: rec.day, stage: rec.stage, status: rec.status, badge: badgeOf(rec), agencies: rec.agencies ?? [],
    why: c.why, affects: c.affects, topics: c.topics, regions, region: regions.length ? regions.slice(0, 2).join(" and ") : "New Zealand", formats: rec.formats, sourceKind: rec.source, passed: !!rec.passed };
}

/**
 * Keep the built environment from records (from either source), drop the rest, dedupe a bill against the act it became, newest first.
 *   → { rules, dropped:[{ title, why }] (a few), droppedCount, considered }
 */
export function rankRules(records, { now = new Date(), limit = RULES_MAX } = {}) {
  const kept = [], dropped = []; let considered = 0;
  for (const rec of Array.isArray(records) ? records : []) {
    considered++;
    const r = toRule(rec, now);
    if (r.dropped) dropped.push({ title: r.title, why: r.why }); else kept.push(r);
  }
  const best = new Map(), RANK = { act: 5, regulations: 4, order: 4, "amendment paper": 2, bill: 1 };
  for (const r of kept) {
    const k = titleKey(r.title), prev = best.get(k);
    // an act beats the bill it came from; the same stage: the later day, then the legislation site's copy
    if (!prev || RANK[r.stage] > RANK[prev.stage] || (RANK[r.stage] === RANK[prev.stage] && (r.day > prev.day || (r.day === prev.day && r.sourceKind === "legislation")))) {
      if (prev) dropped.push({ title: prev.title, why: "The same title is already shown from the other source." });
      best.set(k, r);
    } else dropped.push({ title: r.title, why: "The same title is already shown from the other source." });
  }
  const rules = [...best.values()].sort((a, b) => b.day.localeCompare(a.day) || a.title.localeCompare(b.title)).slice(0, limit);
  return { rules, dropped: dropped.slice(0, 12), droppedCount: dropped.length, considered };
}

/** The same ranking for the bills the page reads from the radar's rows. */
export const rankBillRows = (rows, opts) => rankRules((Array.isArray(rows) ? rows : []).slice(0, 300).map(billFromRow).filter(Boolean), opts);

/** By the practice's regions (empty means anywhere; a national rule always stays) and by one topic (null means all). */
export function filterRules(items, { regions = [], topic = null } = {}) {
  const want = new Set(regions);
  return (Array.isArray(items) ? items : []).filter((r) => (!want.size || !r.regions?.length || r.regions.some((x) => want.has(x))) && (!topic || r.topics?.includes(topic)));
}
/** how many items each topic has, for the chips */
export const topicCounts = (items) => Object.fromEntries(TOPIC_KEYS.map((k) => [k, (items ?? []).filter((r) => r.topics?.includes(k)).length]));

/** Merge the feed's rules with the bills' (the same ranking, so a bill that became an act shows once). */
export function mergeRules(...lists) {
  const recs = lists.flat().filter(Boolean);
  const k = new Map();
  for (const r of recs) k.set(r.id, r);
  const all = [...k.values()], best = new Map(), RANK = { act: 5, regulations: 4, order: 4, "amendment paper": 2, bill: 1 };
  for (const r of all) { const key = titleKey(r.title), p = best.get(key); if (!p || RANK[r.stage] > RANK[p.stage] || (RANK[r.stage] === RANK[p.stage] && r.day > p.day)) best.set(key, r); }
  return [...best.values()].sort((a, b) => b.day.localeCompare(a.day) || a.title.localeCompare(b.title)).slice(0, RULES_MAX);
}

/** An item as the page keeps it: bounded, links only on the two hosts, our own words. Null for anything else. */
export function cleanRule(x) {
  if (!x || typeof x !== "object" || x.kind !== "rule") return null;
  const id = clean(x.id), title = clean(x.title).slice(0, 300);
  const url = x.sourceUrl && (legislationUrl(x.sourceUrl) || billUrl(x.sourceUrl));
  if (!/^[a-z]+:\S{1,60}$/.test(id) || !title || !url || !STAGES.includes(x.stage)) return null;
  const formats = (Array.isArray(x.formats) ? x.formats : []).map((f) => ({ type: String(f?.type), url: legislationUrl(f?.url) || billUrl(f?.url) })).filter((f) => ["html", "pdf", "xml"].includes(f.type) && f.url).slice(0, 3);
  const regions = (Array.isArray(x.regions) ? x.regions : []).map((r) => clean(r).slice(0, 40)).filter(Boolean).slice(0, 4);
  return { id, kind: "rule", title, source: clean(x.source).slice(0, 40) || "NZ Legislation", sourceUrl: url, day: realDay(x.day), stage: x.stage, status: clean(x.status).slice(0, 80), badge: ["Bill", "Passed", "In force", "Not yet in force"].includes(x.badge) ? x.badge : "",
    agencies: (Array.isArray(x.agencies) ? x.agencies : []).map(agencyName).filter(Boolean).slice(0, 3), why: clean(x.why).slice(0, 300), affects: (Array.isArray(x.affects) ? x.affects : []).map((a) => clean(a).slice(0, 120)).filter(Boolean).slice(0, 2),
    topics: (Array.isArray(x.topics) ? x.topics : []).filter((t) => TOPIC_KEYS.includes(t)).slice(0, 3), regions, region: clean(x.region).slice(0, 60) || "New Zealand", formats: formats.length ? formats : [{ type: "html", url }], sourceKind: x.sourceKind === "parliament" ? "parliament" : "legislation", passed: x.passed === true };
}

/** the line kept on a project when a person notes a rule on it: our own words and the link; nothing from the instrument's text */
export function noteText(r) {
  const it = cleanRule(r);
  if (!it) throw new Error("That rule cannot be noted: it has no link.");
  const what = it.affects.length ? ` It may change: ${it.affects[0]}.` : "";
  return `${it.title} (${it.stage}${it.status ? `, ${it.status.toLowerCase()}` : ""}${it.day ? `, version of ${it.day}` : ""}).${what} Read it: ${it.sourceUrl} ${NOT_LEGAL_ADVICE}`.slice(0, 700);
}
