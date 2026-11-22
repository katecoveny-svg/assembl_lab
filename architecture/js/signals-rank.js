// Early signals: public records that can come months or years before an architect is hired (land bought for a school, money announced
// for a hospital wing, a new school established), read as plain rules. Pure functions, no network. Used by the live feed
// (api/_feeds/signals.js) and, if a page wants it, in the browser.
//
// A signal says, in our own words: what happened, why it may lead to design work, the likely buyer, a rough horizon (an estimate,
// always marked as one) and where it came from. Nothing is taken from a record beyond its title, its short summary, its date and its
// link. Every sentence that says "may" means may: no rule here claims that design work usually follows, because no source we read says so.
//
// Reuses the Found work lens (architecture/js/hunt-rank.js): fold, SECTORS, culturalMatch, REGIONS, parseLens. That file is not changed here.
import { fold, SECTORS, culturalMatch, REGIONS, NATIONWIDE, parseLens, lensIsEmpty, decodeEntities, markupToText, nzDay } from "./hunt-rank.js";

export { parseLens, lensIsEmpty };
export const FIT_MIN = 40;
export const MAX_AGE_DAYS = 540; // about 18 months: older records are history, not signals

// ---- matching -------------------------------------------------------------------------------------------------------------------------
/** folded (no macrons, lower case) with curly apostrophes made straight and dashes made spaces, so "Hawke’s Bay" and "Hawke's Bay" match */
export const norm = (s) => fold(s).replace(/[‘’ʼ`]/g, "'").replace(/[–—]/g, " ");
const escRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const RE = new Map();
const wordRe = (term) => {
  let r = RE.get(term);
  if (!r) { r = new RegExp(`(?:^|[^a-z0-9'])${escRe(norm(term).trim())}s?(?=$|[^a-z0-9])`); if (RE.size > 3000) RE.clear(); RE.set(term, r); }
  return r;
};
/** a whole word or phrase (an "s" on the end allowed) in text already passed through norm() */
export const has = (text, term) => wordRe(term).test(text);
const first = (text, list) => list.find((w) => has(text, w)) ?? null;

// ---- places ---------------------------------------------------------------------------------------------------------------------------
// Towns, suburbs and districts, each with its region as REGIONS spells it. Names that are also common street or school names
// ("Richmond", "Lincoln", "Clyde", "Waitangi" on its own) are left out on purpose. A finding aid, not a gazetteer.
const PLACE_TABLE = {
  Northland: "Northland|Te Tai Tokerau|Whangārei|Far North|Kaipara|Kaitāia|Kaikohe|Kerikeri|Dargaville|Paihia|Moerewa|Kawakawa|Hokianga|Mangawhai|Waitangi Treaty Grounds|Ruakākā",
  Auckland: "Auckland|Tāmaki Makaurau|Drury|Manukau|Papakura|Pukekohe|Takanini|Karaka|Paerata|Ōrewa|Silverdale|Milldale|Warkworth|Wellsford|Albany|Henderson|Westgate|Hobsonville|Whenuapai|Kumeū|Huapai|Waiheke|Mount Roskill|Ōtāhuhu|Māngere|Ōtara|Glen Innes|Onehunga|Ponsonby|Grey Lynn|Botany|Flat Bush|Howick|Pakuranga|Takapuna|Devonport|Northcote|Glenfield|New Lynn|Avondale|Panmure|Mount Wellington|Penrose|Ellerslie|Remuera|Epsom|Mount Albert|Kingsland|Parnell|Wynyard Quarter|Rodney|Waiuku|Beachlands|Clevedon|Great Barrier|Red Hills|Point England|Manurewa|Wiri|Papatoetoe",
  Waikato: "Waikato|Hamilton|Kirikiriroa|Te Awamutu|Huntly|Ngāruawāhia|Pōkeno|Tuakau|Morrinsville|Te Aroha|Matamata|Thames|Coromandel|Whitianga|Waihī|Paeroa|Tokoroa|Putāruru|Taupō|Tūrangi|Ōtorohanga|Te Kūiti|Waitomo|Raglan|Hauraki|Matamata-Piako|Waipā|Cambridge",
  "Bay of Plenty": "Bay of Plenty|Tauranga|Mount Maunganui|Pāpāmoa|Ōmokoroa|Te Puke|Katikati|Rotorua|Whakatāne|Kawerau|Ōpōtiki|Edgecumbe|Murupara|Tōrere|Western Bay of Plenty",
  Gisborne: "Gisborne|Tairāwhiti|Tolaga Bay|Ruatōria|Tokomaru Bay",
  "Hawke's Bay": "Hawke's Bay|Napier|Hastings|Havelock North|Flaxmere|Wairoa|Waipukurau|Waipawa|Heretaunga|Central Hawke's Bay",
  Taranaki: "Taranaki|New Plymouth|Ngāmotu|Hāwera|Stratford|Inglewood|Waitara|Ōpunake|Eltham|South Taranaki",
  "Manawatu-Wanganui": "Manawatū|Manawatu-Wanganui|Manawatū-Whanganui|Whanganui|Palmerston North|Feilding|Levin|Horowhenua|Tararua|Dannevirke|Pahiatua|Rangitīkei|Marton|Taihape|Ruapehu|Ohakune|Taumarunui|Foxton|Turitea",
  Wellington: "Wellington|Te Whanganui-a-Tara|Porirua|Lower Hutt|Upper Hutt|Hutt Valley|Petone|Wainuiomata|Kāpiti|Paraparaumu|Waikanae|Ōtaki|Masterton|Carterton|Featherston|Martinborough|Greytown|Wairarapa|Johnsonville|Kilbirnie|Newtown|Mākara",
  Tasman: "Tasman|Motueka|Tākaka|Golden Bay|Māpua",
  Nelson: "Nelson|Whakatū",
  Marlborough: "Marlborough|Blenheim|Picton|Renwick",
  "West Coast": "West Coast|Te Tai Poutini|Westport|Buller|Greymouth|Grey District|Hokitika|Westland|Reefton",
  Canterbury: "Canterbury|Christchurch|Ōtautahi|Selwyn|Rolleston|Waimakariri|Rangiora|Kaiapoi|Ashburton|Timaru|Temuka|Geraldine|Waimate|Mackenzie|Twizel|Hurunui|Kaikōura|Akaroa|Woolston|Riccarton|Hornby|Papanui|Kirwee|Darfield|Pegasus|Halswell",
  Otago: "Otago|Dunedin|Ōtepoti|Queenstown|Wānaka|Lake Hāwea|Cromwell|Arrowtown|Frankton|Balclutha|Clutha|Ōamaru|Waitaki|Mosgiel|Queenstown-Lakes|Queenstown Lakes|Central Otago|Wakatipu|St Clair",
  Southland: "Southland|Murihiku|Invercargill|Gore|Te Anau|Winton|Riverton|Bluff|Stewart Island|Rakiura",
  "Chatham Islands": "Chatham Islands|Rēkohu|Wharekauri",
};
const REGION_NAMES = new Set(["northland", "auckland", "waikato", "bay of plenty", "gisborne", "hawke's bay", "taranaki", "manawatu", "manawatu-wanganui", "manawatu whanganui", "wellington", "tasman", "nelson", "marlborough", "west coast", "canterbury", "otago", "southland", "chatham islands"]);
/** every place, longest name first so "Mount Wellington" is found before "Wellington" and "Havelock North" before anything shorter */
export const PLACES = Object.entries(PLACE_TABLE).flatMap(([region, names]) => names.split("|").map((name) => ({ name, region, key: norm(name), town: !REGION_NAMES.has(norm(name)) })))
  .sort((a, b) => b.key.length - a.key.length);
if (PLACES.some((p) => !REGIONS.includes(p.region))) throw new Error("signals-rank: a place is mapped to a region the lens does not know");
const NATIONAL = ["nationwide", "across new zealand", "around new zealand", "around the country", "across the country", "throughout new zealand", "all regions", "nationally"];

/** Places named in a text: [{ name, region, town }], each span used once, in order of appearance. */
export function placesIn(text) {
  const t = ` ${norm(text)} `, taken = [], out = [];
  for (const p of PLACES) {
    const re = new RegExp(`(?:^|[^a-z0-9'])(${escRe(p.key)})(?=$|[^a-z0-9])`, "g");
    let m;
    while ((m = re.exec(t))) {
      const start = m.index + m[0].length - m[1].length, end = start + m[1].length;
      if (taken.some(([a, b]) => start < b && end > a)) continue;
      taken.push([start, end]); out.push({ name: p.name, region: p.region, town: p.town, at: start });
    }
  }
  return out.sort((a, b) => a.at - b.at).map(({ at, ...p }) => p);
}
/** { region, regions, towns } for a text: region is a label ("Auckland", "Auckland and Waikato", "New Zealand" or "") */
export function whereIs(text) {
  const found = placesIn(text), regions = [...new Set(found.map((p) => p.region))], towns = [...new Set(found.filter((p) => p.town).map((p) => p.name))];
  if (!regions.length && NATIONAL.some((w) => norm(text).includes(w))) return { region: NATIONWIDE, regions: [NATIONWIDE], towns };
  const label = regions.length > 2 ? `${regions.slice(0, 2).join(", ")} and ${regions.length - 2} more` : regions.join(" and ");
  return { region: label, regions, towns };
}

// ---- what a record is about -----------------------------------------------------------------------------------------------------------
/** Buildings and places an architect designs. Each maps to the words used in a "why" sentence and to a sector of the lens. */
const FACILITIES = [
  ["specialist school", "a specialist school", "education"], ["primary school", "a primary school", "education"], ["secondary school", "a secondary school", "education"],
  ["high school", "a high school", "education"], ["intermediate", "an intermediate school", "education"], ["school", "school buildings", "education"], ["classroom", "classrooms", "education"],
  ["wharekura", "a wharekura", "education"], ["kura", "a kura", "education"], ["kōhanga reo", "a kōhanga reo", "education"], ["kindergarten", "a kindergarten", "education"],
  ["early learning centre", "an early learning centre", "education"], ["campus", "campus buildings", "education"],
  ["hospital", "hospital buildings", "health"], ["ward", "a hospital ward", "health"], ["health centre", "a health centre", "health"], ["health hub", "a health hub", "health"],
  ["clinic", "a clinic", "health"], ["aged care", "aged care buildings", "health"], ["rest home", "a rest home", "health"], ["hauora", "hauora facilities", "health"],
  ["papakāinga", "papakāinga housing", "housing"], ["social housing", "social housing", "housing"], ["state housing", "state housing", "housing"], ["housing", "housing", "housing"],
  ["homes", "new homes", "housing"], ["apartments", "apartments", "housing"], ["kaumātua housing", "kaumātua housing", "housing"],
  ["marae", "marae buildings", "kaupapa"], ["wharenui", "a wharenui", "kaupapa"], ["wharekai", "a wharekai", "kaupapa"],
  ["library", "a library", "civic"], ["community centre", "a community centre", "civic"], ["community hub", "a community hub", "civic"], ["community facility", "community facilities", "civic"],
  ["community hall", "a community hall", "civic"], ["town hall", "a town hall", "civic"], ["museum", "a museum", "civic"], ["gallery", "a gallery", "civic"], ["theatre", "a theatre", "civic"],
  ["arts centre", "an arts centre", "civic"], ["aquatic centre", "an aquatic centre", "sport"], ["pool", "a pool", "sport"], ["stadium", "a stadium", "sport"], ["sports hub", "a sports hub", "sport"],
  ["courthouse", "a courthouse", "justice"], ["police station", "a police station", "justice"], ["fire station", "a fire station", "justice"], ["prison", "prison buildings", "justice"],
  ["treaty grounds", "a heritage site", "heritage"], ["heritage building", "a heritage building", "heritage"], ["historic building", "a historic building", "heritage"],
];
// A record has to say something is being built, changed, bought or planned. Words for money alone are not enough.
const NEW_WORK = ["new", "build", "builds", "built", "rebuild", "rebuilt", "redevelop", "redevelopment", "redevelopments", "upgrade", "upgrades", "extension", "expand", "expansion", "replace", "replacement",
  "refurbish", "refurbishment", "strengthen", "strengthening", "restore", "restoration", "preserve", "renovate", "renovation", "relocate", "relocated", "rebuilt in safer", "wing", "block", "more classrooms", "additional classrooms"];
const LAND = ["land secured", "secured land", "land for a future", "land for a new", "land has been secured", "land purchase", "purchased land", "buys land", "bought land", "site secured", "site purchased",
  "site for a new", "site for a future", "land acquired", "acquire land", "acquisition of land", "land to be acquired", "intention to take land", "land set apart"];
const PLANNING = ["business case", "planning is under way", "planning underway", "planning under way", "masterplan", "master plan", "design work", "detailed design", "concept design", "feasibility", "site selection", "early works"];
const LATE = ["sod turned", "sod turning", "turned the sod", "turns the sod", "ground broken", "breaks ground", "construction has started", "construction starts", "construction begins", "construction has begun",
  "construction is set to begin", "construction is under way", "construction underway", "under construction", "topping out", "officially opened", "opens", "opened", "now open", "complete", "completed", "completion",
  "finished", "handed over", "doors open", "welcomes first"];
const POLICY = ["standards", "national environmental standards", "rules", "regulations", "reform", "changes to", "strategy", "framework", "guidance", "consultation", "policy"];
// Not an architecture practice's work: roads and pipes, energy kit, farms, and announcements about people, medicines and results.
const INFRA = ["road", "roads", "highway", "motorway", "rail", "railway", "city rail link", "bridge", "pipeline", "water storage", "reservoir", "wastewater", "stormwater", "water supply", "water infrastructure",
  "broadband", "electricity", "solar", "battery", "batteries", "energy resilience", "generator", "generators", "flood protection", "stopbank", "stopbanks", "cycleway", "irrigation", "horticulture", "farmland",
  "soil conservation", "river control", "cemetery", "esplanade", "recreation reserve", "scenic reserve", "conservation purposes"];
const NOT_BUILT = ["medicine", "medicines", "screening", "vaccine", "vaccination", "appointment", "appointments", "appointed", "reappointed", "reappointments", "honours", "curriculum", "attendance", "exam", "ncea",
  "health targets", "tobacco", "smoking", "pharmac", "social media", "trophy", "scholarship", "bed nights", "waitlists", "wait times"];
// About an organisation or its people, even when a building word is in the title ("New school property agency begins operations").
const ORG = ["agency", "begins operations", "chief executive", "board appointments", "chair", "annual report"];
const SETTLEMENT = ["deed of settlement", "claims settlement", "treaty settlement", "settlement legislation", "settlement bill", "agreement in principle", "initialled", "redress"];
const FUNDING = ["$", "million", "billion", "funding", "funds", "fund", "funded", "invest", "investment", "investing", "grant", "grants", "green light", "approved", "approves", "budget"];
// "New Zealand" and "New Plymouth" are not news of something new
const unNew = (t) => t.replace(/(^|[^a-z0-9])new (zealand|plymouth)(?=$|[^a-z0-9])/g, "$1$2");
const fundingIn = (t) => /\$\s?\d/.test(t) || FUNDING.slice(1).some((w) => has(t, w));

/** "$37 million" or "$8.6m" as the record states it, or null. Never worked out, never a fee. */
export function statedAmount(text) {
  const m = String(text ?? "").match(/\$\s?(\d{1,4}(?:[.,]\d{1,3})?)\s?(million|m|billion|bn|b)\b/i);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, "")), big = /^b/i.test(m[2]);
  return Number.isFinite(n) && n > 0 ? { value: Math.round(n * (big ? 1e9 : 1e6)), text: `$${m[1]} ${big ? "billion" : "million"}` } : null;
}

const DAY = 864e5;
const ageDays = (day, now) => { const t = Date.parse(`${day}T12:00:00+12:00`); return Number.isFinite(t) ? Math.floor((now.getTime() - t) / DAY) : null; };
const dayText = (day) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day ?? ""); return m ? `${+m[3]} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+m[2] - 1]} ${m[1]}` : ""; };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const where = (w) => (w.towns.length ? ` in ${w.towns.slice(0, 2).join(" and ")}` : w.region && w.region !== NATIONWIDE ? ` in ${w.region}` : "");

// ---- horizons (estimates, never read from a source) -----------------------------------------------------------------------------------
export const HORIZONS = {
  land: "2 years or more (estimate)",
  planning: "6 to 24 months (estimate)",
  funded: "6 to 18 months (estimate)",
  school: "1 to 3 years (estimate)",
  settlement: "years, if at all (estimate)",
};

// ---- buyers ---------------------------------------------------------------------------------------------------------------------------
// "stated" when the record names the body; "likely" when it comes from what kind of record it is. School property: the New Zealand School
// Property Agency began on 1 October 2026 to "build, manage, and maintain school property" (Beehive release of that day).
const BUYERS_STATED = [
  ["new zealand school property agency", "New Zealand School Property Agency"], ["nzspa", "New Zealand School Property Agency"], ["health new zealand", "Health New Zealand"],
  ["health nz", "Health New Zealand"], ["te whatu ora", "Health New Zealand"], ["kainga ora", "Kāinga Ora"], ["ministry of education", "Ministry of Education"],
  ["department of corrections", "Department of Corrections"], ["new zealand police", "New Zealand Police"], ["fire and emergency", "Fire and Emergency New Zealand"],
  ["ministry of justice", "Ministry of Justice"], ["heritage new zealand", "Heritage New Zealand Pouhere Taonga"],
];
const BUYER_BY_SECTOR = {
  education: "New Zealand School Property Agency (school property, since 1 October 2026)", health: "Health New Zealand", housing: "Kāinga Ora or a community housing provider",
  kaupapa: "the marae, hapū or trust that receives the funding", civic: "the local council or community trust", sport: "the local council or sports trust", justice: "the agency named in the release",
  heritage: "the owner of the heritage place",
};
const COUNCIL = /\b((?:[A-Z][\p{L}'’-]+[ -]){0,3}[A-Z][\p{L}'’-]+) (District|City|Regional) Council\b/u;
function buyerFor(text, sector) {
  const t = norm(text);
  const s = BUYERS_STATED.find(([k]) => has(t, k));
  if (s) return { buyer: s[1], buyerBasis: "stated" };
  const c = String(text).match(COUNCIL);
  if (c) return { buyer: `${c[1]} ${c[2]} Council`, buyerBasis: "stated" };
  return { buyer: BUYER_BY_SECTOR[sector] ?? "the public body named in the record", buyerBasis: "likely" };
}

// ---- reading a record -----------------------------------------------------------------------------------------------------------------
/**
 * What a record is about, from its title (first) and its summary. Returns { keep, stage, facility, sector, reason } where stage is
 * land | planning | funded | school | settlement, or keep:false with the reason it was left out (in plain words).
 */
export function classify({ title = "", summary = "" }) {
  const T = norm(title), S = norm(summary), A = `${T} ${S}`, Tn = unNew(T), An = unNew(A);
  if (SETTLEMENT.some((w) => has(A, w)) || /\bsettlement\b/.test(T)) return { keep: true, stage: "settlement", facility: null, sector: "kaupapa" };
  const facT = FACILITIES.find(([w]) => has(T, w)), fac = facT ?? FACILITIES.find(([w]) => has(S, w));
  const infraT = first(T, INFRA);
  if (infraT) return { keep: false, reason: `about ${infraT}, not buildings` };
  const orgT = first(T, ORG);
  if (orgT) return { keep: false, reason: "about an organisation or its people, not a building" };
  if (!fac) return { keep: false, reason: first(A, NOT_BUILT) ? "about services or people, not buildings" : "names no building or place an architect designs" };
  if (first(T, NOT_BUILT) && !facT) return { keep: false, reason: "about services or people, not buildings" };
  const facility = fac[1], sector = fac[2];
  if (first(T, LAND)) return { keep: true, stage: "land", facility, sector };
  if (first(T, LATE)) return { keep: false, reason: "construction has started or finished: the design team is already in place" };
  if (first(T, POLICY) && !fundingIn(A)) return { keep: false, reason: "a rule or policy change, not a project" };
  if (first(T, PLANNING)) return { keep: true, stage: "planning", facility, sector };
  if (first(S, LAND)) return { keep: true, stage: "land", facility, sector };
  const work = NEW_WORK.some((w) => has(An, w)), money = fundingIn(A);
  if (first(S, POLICY) && !money && !first(Tn, NEW_WORK)) return { keep: false, reason: "a rule or policy change, not a project" };
  if (first(S, LATE) && !first(Tn, NEW_WORK) && !money) return { keep: false, reason: "construction has started or finished: the design team is already in place" };
  if (first(S, PLANNING) && (work || money)) return { keep: true, stage: "planning", facility, sector };
  if (work && (money || facT)) return { keep: true, stage: "funded", facility, sector, lateToo: !!first(S, LATE) };
  return { keep: false, reason: "does not say anything new is being built, changed or bought" };
}

// ---- Gazette notices (read through DigitalNZ: title, date, link and subjects only) -------------------------------------------------------
const PURPOSE = { education: ["education", "education", "school buildings"], school: ["education", "education", "school buildings"], "state housing": ["housing", "state housing", "state housing"],
  housing: ["housing", "housing", "housing"], health: ["health", "health", "health buildings"], hospital: ["health", "hospital", "hospital buildings"],
  "community use": ["civic", "community use", "community buildings"], "community buildings": ["civic", "community buildings", "community buildings"], library: ["civic", "a library", "a library"],
  "civic": ["civic", "civic", "civic buildings"], police: ["justice", "police", "police buildings"], court: ["justice", "court", "court buildings"], "fire": ["justice", "fire service", "a fire station"],
  marae: ["kaupapa", "marae", "marae buildings"], "māori reservation": ["kaupapa", "a Māori reservation", "marae or papakāinga"] };
/** A Gazette notice title to { keep, stage, sector, purpose, facility, placeText, reason } */
export function classifyGazette({ title = "", subjects = [] }) {
  const raw = String(title), T = norm(raw), head = norm(raw.split(/[—–]/)[0]); // the head says what the land is for; the rest is the place
  if (/^(amendment|corrigendum|correction)\b/.test(T)) return { keep: false, reason: "a correction or amendment to an earlier notice" };
  if (/no longer (needed|required)/.test(T) || /\bdisposal\b/.test(T)) return { keep: false, reason: "land being let go, not built on" };
  const subj = subjects.map(norm);
  if (subj.includes("establishment of a school") || /\bnew school establishment\b/.test(T) || /^establishment of .+ as a charter school/.test(T)) {
    if (/^conversion of\b/.test(T)) return { keep: false, reason: "an existing school changing type, not new premises" };
    const charter = /charter school/.test(T);
    return { keep: true, stage: charter ? "planning" : "school", sector: "education", purpose: "education", facility: charter ? "premises for a charter school" : "a new school", charter };
  }
  const isLand = subj.includes("land notices") || /\bland\b/.test(T);
  const m = head.match(/(?:intention to take land|land (?:and [a-z ]+ )?(?:acquired|set apart|to be acquired|taken|declared)[a-z ]*?) for (?:the purpose of )?(?:a |an )?(.+?)(?: purposes?\b| reserve\b|$)/);
  if (!isLand || !m) return { keep: false, reason: "not a notice about land for a public building" };
  const lp = head.match(/local purpose \(([^)]{2,80})\)/); // "Local Purpose (Community Use) Reserve": the words in brackets say what for
  const p = (lp ? lp[1] : m[1]).replace(/\s*purposes?$/, "").trim();
  if (INFRA.some((w) => has(p, w)) || /\broad\b/.test(head)) return { keep: false, reason: `land for ${has(head, "road") ? "a road" : p}, not buildings` };
  const key = Object.keys(PURPOSE).find((k) => has(p, k));
  if (!key) return { keep: false, reason: `land for ${p || "a purpose"} that is not a building an architect designs` };
  const [sector, purpose, facility] = PURPOSE[key];
  return { keep: true, stage: "land", sector, purpose, facility, intention: /intention to take/.test(T) };
}

// ---- turning records into signals -----------------------------------------------------------------------------------------------------
/**
 * One record to an unscored signal, or { dropped } with the reason. A record is
 *   { source:"beehive"|"gazette", sourceName, id, title, url, day (YYYY-MM-DD), summary?, portfolio?, subjects?, noticeNo? }
 * The why is written from the rule that matched and the record's own facts; it never repeats the record's text beyond its title.
 */
export function toSignal(r) {
  const title = String(r.title ?? "").replace(/\s+/g, " ").trim().slice(0, 300), summary = String(r.summary ?? "").slice(0, 600);
  if (!title || !r.url || !/^\d{4}-\d{2}-\d{2}$/.test(r.day ?? "")) return { dropped: { title, why: "missing a title, link or date" } };
  const gz = r.source === "gazette";
  const c = gz ? classifyGazette(r) : classify({ title, summary });
  if (!c.keep) return { dropped: { title, source: r.source, why: c.reason } };
  const text = gz ? `${title} ${(r.subjects ?? []).join(" ")}` : `${title} ${summary}`;
  const w = whereIs(gz ? `${title.split(/[—–]/).slice(1).join(" ")} ${(r.subjects ?? []).slice(2).join(" ")}` || title : text);
  const amount = gz ? null : statedAmount(`${title} ${summary}`);
  const cultural = culturalMatch({ title, buyer: "", overview: gz ? (r.subjects ?? []).join(" ") : summary });
  const sectors = new Set([c.sector]);
  for (const [key, s] of Object.entries(SECTORS)) if (key !== "kaupapa" && s.words.some((x) => has(norm(text), x))) sectors.add(key);
  if (cultural.on) sectors.add("kaupapa");
  let { buyer, buyerBasis } = buyerFor(text, c.sector);
  const evidence = [{ label: gz ? `NZ Gazette notice ${r.noticeNo || ""}`.trim() + `, ${dayText(r.day)}` : `Beehive release, ${dayText(r.day)}`, url: r.url }];
  let why;
  const at = where(w);
  if (gz && c.stage === "school") {
    why = `The Minister of Education has formally established a new school (Gazette, ${dayText(r.day)}). A new school may need new buildings, which may lead to design work; the notice itself says where.`;
  } else if (gz && c.charter) {
    const sponsor = title.match(/^establishment of (.+?):/i)?.[1];
    if (sponsor) { buyer = sponsor.slice(0, 120); buyerBasis = "stated"; }
    why = `A charter school has been established (Gazette, ${dayText(r.day)}). It may start in existing premises; if it needs new or altered ones, that may lead to design work.`;
  } else if (gz) {
    why = `${c.intention ? "The Crown has given notice that it intends to take" : "The Crown has acquired or set apart"} land for ${c.purpose} purposes${at} (Gazette, ${dayText(r.day)}). Land is an early step: it may lead to design work later.`;
  } else if (c.stage === "settlement") {
    why = `A Treaty settlement step was announced on ${dayText(r.day)}. Settlements can include cultural redress and land or property returned to the iwi, which may later lead to building work. Whether anything is built, and who designs it, is for the iwi to decide.`;
    buyer = "the iwi's post-settlement governance entity, if it chooses to build"; buyerBasis = "likely";
  } else if (c.stage === "land") {
    why = `A Government release (${dayText(r.day)}) says land has been secured for ${c.facility}${at}. Land is an early step: it may lead to design work later.`;
  } else if (c.stage === "planning") {
    why = `A Government release (${dayText(r.day)}) says ${c.facility}${at} ${has(norm(`${title} ${summary}`), "business case") ? "has a business case" : "is being planned"}. This may lead to design work.`;
  } else {
    why = `A Government release (${dayText(r.day)}) announces money for ${c.facility}${at}${amount ? ` (${amount.text}, as stated)` : ""}. This may lead to design work, unless a design team is already in place.`;
    if (c.lateToo) why += " The release also mentions construction or completion, so some of the work may already be designed.";
  }
  return {
    signal: {
      id: `${r.source}:${String(r.id).slice(0, 40)}`, kind: "signal", title, source: SOURCE_SHORT[r.source] ?? r.source, sourceId: r.source, sourceName: r.sourceName, sourceUrl: r.url, day: r.day,
      region: w.region, regions: w.regions, places: w.towns, why, horizon: HORIZONS[c.stage], horizonBasis: "estimate", stage: c.stage, buyer, buyerBasis,
      evidence, cultural, sectors: [...sectors], ...(amount ? { amount: amount.value, amountText: amount.text } : {}), ...(r.portfolio ? { portfolio: r.portfolio } : {}),
    },
  };
}

/** how a source is named on a card (the page shows `source`); sourceId stays the short key */
export const SOURCE_SHORT = { beehive: "Beehive", gazette: "NZ Gazette" };
const BASE = { land: 24, planning: 26, funded: 22, school: 26, settlement: 18 };
const plural = (n, one) => `${n} ${one}${n === 1 ? "" : "s"}`;

/** Score one signal against the practice's lens. Returns the signal with fit, reasons and matched, or { dropped }. Same rules every time. */
export function scoreSignal(s, lens, now = new Date()) {
  const age = ageDays(s.day, now);
  if (age == null || age > MAX_AGE_DAYS) return { dropped: { title: s.title, source: s.sourceId, why: "older than 18 months" } };
  if (age < -2) return { dropped: { title: s.title, source: s.sourceId, why: "dated in the future" } };
  if (s.stage === "settlement" && !lens.cultural && !lens.sectors.includes("kaupapa")) return { dropped: { title: s.title, source: s.sourceId, why: "a Treaty settlement: shown only with the kaupapa Māori lens" } };
  const T = norm(s.title), R = norm(`${s.why} ${(s.places ?? []).join(" ")} ${s.portfolio ?? ""}`);
  const reasons = [], matched = { keywords: [], sectors: [] };
  let score = BASE[s.stage] ?? 16, kw = 0;
  for (const k of lens.keywords) { if (has(T, k)) { kw += 12; matched.keywords.push(k); } else if (has(R, k)) { kw += 6; matched.keywords.push(k); } }
  score += Math.min(kw, 36);
  let sec = 0;
  for (const key of lens.sectors) if (s.sectors.includes(key) || (key === "kaupapa" && s.cultural.on)) { sec += 12; matched.sectors.push(key); }
  score += Math.min(sec, 24);
  const keptCultural = lens.cultural && s.cultural.on;
  if (!matched.keywords.length && !matched.sectors.length && !keptCultural) return { dropped: { title: s.title, source: s.sourceId, why: "does not match what the practice looks for" } };
  if (matched.keywords.length) reasons.push(`matches ${matched.keywords.slice(0, 3).map((k) => `“${k}”`).join(" and ")}`);
  if (matched.sectors.length) reasons.push(`${matched.sectors.slice(0, 2).map((k) => (k === "kaupapa" ? SECTORS[k].label : SECTORS[k].label.toLowerCase())).join(" and ")} work`);
  if (keptCultural) { score += 8; reasons.push(`kaupapa Māori or Indigenous words: ${s.cultural.why.slice(0, 4).map((w) => `“${w}”`).join(", ")}`); }
  if (lens.regions.length) {
    const inside = s.regions.filter((r) => lens.regions.includes(r));
    if (inside.length) { score += 10; reasons.push(`in ${inside.join(" and ")}`); }
    else if (s.region === NATIONWIDE) { score += 2; reasons.push("nationwide"); }
    else if (!s.regions.length) reasons.push("no place named in the record: open it to check");
    else return { dropped: { title: s.title, source: s.sourceId, why: `in ${s.region}, outside the practice's regions` } };
  }
  reasons.push({ land: "land bought or set aside: an early step", planning: "at the planning stage", funded: "money announced", school: "a new school established", settlement: "a Treaty settlement step" }[s.stage]);
  if (age <= 30) { score += 10; reasons.push(age <= 0 ? "published today" : `published ${plural(age, "day")} ago`); }
  else if (age <= 90) score += 6;
  else if (age <= 180) score += 2;
  else if (age > 365) { score -= 10; reasons.push("more than a year old"); }
  if (s.amount >= 1e6) { score += 4; reasons.push(`states ${s.amountText}`); }
  return { signal: { ...s, fit: Math.max(0, Math.min(100, Math.round(score))), reasons, matched } };
}

// ---- reading across signals ---------------------------------------------------------------------------------------------------------
const NAMED = /((?:[A-ZĀĒĪŌŪ][\p{L}'’-]+ ){0,4}(?:[A-ZĀĒĪŌŪ][\p{L}'’-]+) (?:School|College|High School|Intermediate|Kura|Wharekura|Marae|Hospital|Library|Stadium|Secondary School Project))\b/gu;
const STREET = /—\s*(?:\d+[a-z]?(?:\s*(?:and|–|-)\s*\d+[a-z]?)?\s+)?([A-Z][\p{L}'’]+(?: [A-Z][\p{L}'’]+)? (?:Road|Street|Avenue|Drive|Place|Crescent|Terrace|Lane|Way|Parade|Highway))\b/u;
/** keys that two records about the same place or facility share: named facilities, streets (Gazette), towns */
export function linkKeys(s) {
  const keys = [];
  for (const m of String(s.title).matchAll(NAMED)) { const k = norm(m[1]).replace(/^(?:the|new|govt|government|at|for|in) /, "").trim(); if (k.split(" ").length >= 2) keys.push(["facility", k, m[1].trim()]); }
  const st = String(s.title).match(STREET);
  if (st) keys.push(["street", norm(st[1]), st[1]]);
  for (const t of s.places ?? []) keys.push(["place", norm(t), t]);
  return keys;
}
// Cities big enough that two unrelated announcements often name them: a town link there needs a shared sector or a second source.
const BIG = new Set(["auckland", "hamilton", "tauranga", "christchurch", "dunedin", "wellington", "napier", "hastings", "palmerston north", "nelson", "new plymouth", "rotorua", "whangarei", "invercargill", "lower hutt", "porirua", "manukau", "queenstown", "gisborne", "whanganui"]);
/**
 * Link signals about the same place or facility: "same place: Drury", "same facility: Wakatipu High School". A town alone links only
 * signals in a big city when they share a sector or come from different sources (a funding release and a Gazette notice), so two
 * unrelated releases about Christchurch do not join up; a smaller place (Drury, Kumeū) links on its own. Region names never link. Adds links:[{ id, title, why }] (at most 5) to each signal; returns the list.
 */
export function linkSignals(list) {
  const keyed = list.map((s) => ({ s, keys: linkKeys(s) }));
  for (const a of keyed) a.s.links = [];
  for (let i = 0; i < keyed.length; i++) for (let j = i + 1; j < keyed.length; j++) {
    const a = keyed[i], b = keyed[j];
    let why = null;
    for (const [kind, k, label] of a.keys) {
      if (!b.keys.some(([kb, k2]) => kb === kind && k2 === k)) continue;
      if (kind === "place" && BIG.has(k) && !(a.s.sourceId !== b.s.sourceId || a.s.sectors.some((x) => b.s.sectors.includes(x)))) continue;
      why = `same ${kind === "place" ? "place" : kind}: ${label}`; break;
    }
    if (!why) continue;
    if (a.s.links.length < 5) a.s.links.push({ id: b.s.id, title: b.s.title, why });
    if (b.s.links.length < 5) b.s.links.push({ id: a.s.id, title: a.s.title, why });
  }
  return list;
}

/**
 * Records to ranked signals: classify, score against the lens, keep those at or above FIT_MIN (or flagged kaupapa Māori with "always show"), link, give linked ones a small lift
 * (+6: two records about one place say more than one), best first. Returns { signals, dropped, considered }. dropped is a few examples.
 */
export function rankSignals(records, lens, now = new Date(), limit = 40) {
  const kept = [], dropped = [];
  const seen = new Set();
  for (const r of Array.isArray(records) ? records : []) {
    const t = toSignal(r);
    if (t.dropped) { dropped.push(t.dropped); continue; }
    if (seen.has(t.signal.id)) continue; seen.add(t.signal.id);
    const sc = scoreSignal(t.signal, lens, now);
    if (sc.dropped) { dropped.push(sc.dropped); continue; }
    // "Always show kaupapa Māori and Indigenous work": such a signal is kept under the usual bar (it still has to be about a building, in the regions and recent)
    if (sc.signal.fit < FIT_MIN && !(lens.cultural && sc.signal.cultural.on)) { dropped.push({ title: sc.signal.title, source: sc.signal.sourceId, why: `fit ${sc.signal.fit}, under ${FIT_MIN}` }); continue; }
    kept.push(sc.signal);
  }
  linkSignals(kept);
  for (const s of kept) if (s.links.length) { s.fit = Math.min(100, s.fit + 6); s.reasons.push(`linked to ${plural(s.links.length, "other signal")}`); }
  kept.sort((a, b) => b.fit - a.fit || (a.day < b.day ? 1 : a.day > b.day ? -1 : 0) || a.title.localeCompare(b.title));
  const top = kept.slice(0, limit), ids = new Set(top.map((s) => s.id));
  for (const s of top) s.links = s.links.filter((l) => ids.has(l.id)); // only links to signals that are in the answer
  return { signals: top, dropped: dropped.slice(0, 12), droppedCount: dropped.length, considered: (records ?? []).length };
}

// ---- reading feeds (strict and bounded) ---------------------------------------------------------------------------------------------
const MAX_XML = 2_000_000, MAX_ITEMS = 60;
const tag = (block, name) => { const m = block.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, "i")); return m ? m[1].replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, "$1") : ""; };
const text1 = (s, max) => markupToText(decodeEntities(String(s))).replace(/\s+/g, " ").trim().slice(0, max);
// release slugs keep their macrons percent-encoded ("/release/10m-investment-new-ringat%C5%AB-marae-complex")
export const isBeehiveRelease = (url) => { try { const u = new URL(url); return u.protocol === "https:" && u.hostname === "www.beehive.govt.nz" && !u.port && !u.username && /^\/release\/(?:[a-z0-9-]|%[0-9a-f]{2}){3,300}$/i.test(u.pathname); } catch { return false; } };

/** Beehive RSS (one portfolio) to records. Only ministerial releases (/release/...), never speeches. Feed text is data: never run. */
export function parseBeehiveRss(xml, feed = {}) {
  const s = String(xml ?? "");
  if (s.length > MAX_XML || /<!ENTITY/i.test(s) || !/<rss\b/i.test(s)) return [];
  const out = [];
  for (const item of (s.match(/<item\b[\s\S]*?<\/item>/gi) ?? []).slice(0, MAX_ITEMS)) {
    const title = text1(tag(item, "title"), 300), url = decodeEntities(tag(item, "link")).trim(), guid = text1(tag(item, "guid"), 40).replace(/[^0-9A-Za-z-]/g, "");
    const t = Date.parse(text1(tag(item, "pubDate"), 60));
    if (!title || !isBeehiveRelease(url) || !Number.isFinite(t)) continue;
    out.push({ source: "beehive", sourceName: "Beehive (Government releases)", id: guid || url.split("/").pop().slice(0, 40), title, url, day: nzDay(t), published: new Date(t).toISOString(),
      summary: text1(tag(item, "description"), 600), portfolio: String(feed.label ?? "").slice(0, 60) });
  }
  return out;
}

export const isGazetteNotice = (url) => { try { const u = new URL(url); return (u.protocol === "https:" || u.protocol === "http:") && u.hostname === "gazette.govt.nz" && !u.port && !u.username && /^\/notice\/id\/\d{4}-[a-z]{2}\d{1,6}$/.test(u.pathname); } catch { return false; } };
/** The fields asked of DigitalNZ. Never "description" or "fulltext": those carry the names of the officials who signed the notice. */
export const DNZ_FIELDS = "id,title,date,landing_url,subject,rights";
/** A DigitalNZ search answer (Gazette records) to records. Keeps only records whose rights say Creative Commons; ignores any other field. */
export function parseDigitalNzGazette(json) {
  const results = json?.search?.results;
  if (!Array.isArray(results)) return [];
  const out = [];
  for (const r of results.slice(0, 200)) {
    if (!r || typeof r !== "object") continue;
    const url = String(r.landing_url ?? "").replace(/^http:/, "https:"), title = text1(r.title ?? "", 300);
    const day = String(Array.isArray(r.date) ? r.date[0] : r.date ?? "").slice(0, 10);
    if (!title || !isGazetteNotice(url) || !/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    if (!/creative commons/i.test(String(r.rights ?? ""))) continue; // DigitalNZ commercial terms: follow each record's own rights
    const noticeNo = url.match(/\/notice\/id\/(\d{4}-[a-z]{2}\d+)$/)[1];
    out.push({ source: "gazette", sourceName: "New Zealand Gazette (through DigitalNZ)", id: noticeNo, noticeNo, title, url, day,
      subjects: (Array.isArray(r.subject) ? r.subject : []).slice(0, 8).map((x) => text1(x, 80)) });
  }
  return out;
}
