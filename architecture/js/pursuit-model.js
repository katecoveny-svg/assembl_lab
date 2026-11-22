// Pursuit studio: the rules, with no page in them. pursuit.js draws these and saves through the page's store.
// Nothing here saves, sends or reaches the network, and nothing here makes up a figure.
//
//   noticeOf(enquiry, acts, pursuit)   what is known about the notice: title, buyer, region, closing day, link, reference,
//                                      text, and whether it is public, kaupapa Māori or housing work (each with where it came from)
//   countdown(day, now)                the days to the closing day, in words
//   readPursuit(enquiry)               the enquiry's pursuit record (enquiry.pursuit; extra.pursuit in the shared records), cleaned
//   withPursuit(enquiry, patch, o)     the enquiry with its pursuit record changed and one history line added (nothing saved)
//   applicable(notice)                 every requirement in the data file, marked yes, maybe or no for this notice, with why
//   forSection(key, list)              the requirements one section draws on
//   esgCoverage(sections)              which environmental, social and governance points the draft's own words cover
//   templateDraft(input)               a free starting draft built from what the practice has: markers wherever a fact is missing
//   figuresNotGiven(text, given)       numbers in a section that are not in the notice, the practice's records or the sources
//   programmeRows(p) / teamRows(...)   the programme by stage and the team's hours, from what the practice typed only
//
// The record (enquiry.pursuit), version 1:
//   { v, context: { buyer, region, closes, ref, cultural, public, residential },   the practice's own corrections, '' / null when not set
//     notice: { text, at, by },                                                    the notice text the practice pasted
//     ideas: { at, model, prompt_revision, usage, cost_usd, summary, ideas[], deciders[], questions[], go_no_go[], gaps } | null,
//     keep: [idea ids], checks: { <go/no-go id>: true },
//     draft: { at, from: 'model'|'template', model, notes, sections: { <key>: { body, needs[], cites[], from, by, at, edited } } } | null,
//     experience: [project ids], scope: [stage keys], weeks: { <stage key>: weeks }, start: 'YYYY-MM-DD',
//     site: { lat, lon, place, address } | null, print_address, massing: { w, d, h, x, z, turn, around },
//     requirements_version, history: [{ at, who, what }] }

import { STAGES, STAGE_KEYS } from './model.js';
import { dayKey, daysBetween, shortDay } from './crm-model.js';
import { REQUIREMENTS } from './pursuit-requirements.js';
import { SECTIONS, SECTION_KEYS, MODEL_SECTION_KEYS, FEES_TEXT, MARK, plain, cleanIdeas, sectionTitle, NOTICE_MAX } from './pursuit-schema.js';

export const PURSUIT_V = 1;
export const HISTORY_MAX = 40;
export const DEFAULT_MASSING = { w: 14, d: 9, h: 7, x: 0, z: 0, turn: 0, around: 6 };
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const clip = (s, n) => { const t = String(s ?? '').replace(/\r\n?/g, '\n').trim(); return t.length > n ? t.slice(0, n) : t; };
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const num = (v, lo, hi) => (typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? v : null);

// ---- the notice ------------------------------------------------------------------------------------------------------------
/** the parts of a Found work source line: "GETS tender 35471034 · Hamilton City Council · https://..." */
export function readSource(text) {
  const t = String(text ?? ''), url = (/(https:\/\/\S+)/.exec(t) ?? [])[1] ?? '';
  const parts = t.replace(url, '').split('·').map(clean).filter(Boolean);
  const head = parts[0] ?? '', ref = (/tender\s+(\S+)/i.exec(head) ?? [])[1] ?? '';
  const buyer = parts[1] && !/^buyer not stated$/i.test(parts[1]) ? parts[1] : '';
  const from = /^(GETS|Radar)\b/i.test(head) ? head.split(/\s+/)[0] : '';
  return { url, ref, buyer, from, head };
}
/** a finding or lead kept on the enquiry itself (another part of the page may add one): only its plain fields are read */
function findingOf(e) {
  for (const k of ['finding', 'signal', 'lead', 'notice']) if (isObj(e?.[k])) return e[k];
  return null;
}
const CULTURAL = ['kaupapa maori', 'marae', 'mana whenua', 'iwi', 'hapu', 'kura kaupapa', 'wharekura', 'kohanga reo', 'papakainga', 'te reo maori', 'runanga', 'whanau ora', 'maori', 'indigenous', 'te tiriti'];
const HOMES = ['housing', 'homes', 'dwelling', 'dwellings', 'papakainga', 'apartments', 'townhouses', 'residential', 'social housing', 'kainga'];
const hasWord = (text, words) => { const t = ` ${plain(text)} `; return words.filter((w) => t.includes(` ${w} `) || t.includes(` ${w}s `)); };

/**
 * What is known about the notice. Each field says where it came from: 'practice' (typed in the studio), 'finding' (kept on the
 * enquiry by Found work), 'source' (the enquiry's source line), 'next step' (the closing day Found work put as the next step's date),
 * 'notice' (found in the notice text), or '' when it is not known.
 */
export function noticeOf(e, acts = [], pursuit = readPursuit(e)) {
  const f = findingOf(e) ?? {}, s = readSource(e?.source), c = pursuit.context, text = pursuit.notice.text || clip(f.text ?? f.summary ?? f.snippet ?? f.description ?? '', NOTICE_MAX);
  const pick = (...pairs) => { for (const [v, from] of pairs) if (clean(v)) return { v: clean(v), from }; return { v: '', from: '' }; };
  const buyer = pick([c.buyer, 'practice'], [f.buyer, 'finding'], [s.buyer, 'source']);
  const region = pick([c.region, 'practice'], [f.region, 'finding']);
  const closesFinding = DAY.test(f.closesDay ?? '') ? f.closesDay : DAY.test(String(f.closes ?? '').slice(0, 10)) ? String(f.closes).slice(0, 10) : '';
  const closesStep = /read the tender documents/i.test(e?.next_action ?? '') && DAY.test(e?.next_action_due ?? '') ? e.next_action_due : '';
  const closes = pick([DAY.test(c.closes ?? '') ? c.closes : '', 'practice'], [closesFinding, 'finding'], [closesStep, 'next step']);
  const url = pick([/^https:\/\//.test(f.url ?? '') ? f.url : '', 'finding'], [s.url, 'source']);
  const first = (Array.isArray(acts) ? acts : []).filter((a) => a && a.kind === 'note' && /Found by the hunt/.test(a.body ?? '')).sort((a, b) => String(a.at).localeCompare(String(b.at)))[0];
  const why = first ? ((/Why it looked like a fit: ([^]*?)\.(?: The notice| Notice:|$)/.exec(first.body) ?? [])[1] ?? '') : '';
  const words = `${e?.title ?? ''} ${text} ${(f.cultural?.why ?? []).join(' ')}`;
  const culturalWords = hasWord(words, CULTURAL), homeWords = hasWord(words, HOMES);
  const flag = (set, found, foundFrom) => (typeof set === 'boolean' ? { v: set, from: 'practice' } : found ? { v: true, from: foundFrom } : { v: false, from: '' });
  const isPublic = typeof c.public === 'boolean' ? { v: c.public, from: 'practice' } : s.from ? { v: true, from: 'source' } : { v: false, from: '' };
  return {
    title: clean(e?.title), buyer: buyer.v, buyer_from: buyer.from, region: region.v, region_from: region.from, closes: closes.v, closes_from: closes.from,
    url: url.v, ref: clean(c.ref) || s.ref, source: s.from || (clean(e?.source) ? 'typed' : ''), text, text_from: pursuit.notice.text ? 'practice' : text ? 'finding' : '',
    cultural: flag(c.cultural, culturalWords.length > 0 || f.cultural?.on === true, 'notice').v, cultural_from: flag(c.cultural, culturalWords.length > 0 || f.cultural?.on === true, 'notice').from, cultural_words: culturalWords,
    residential: flag(c.residential, homeWords.length > 0, 'notice').v, residential_from: flag(c.residential, homeWords.length > 0, 'notice').from,
    public: isPublic.v, public_from: isPublic.from, why: clean(why),
  };
}

/** { days, text, soon, past } for the closing day; days is null when there is none */
export function countdown(day, now = new Date()) {
  if (!DAY.test(day ?? '')) return { days: null, text: 'No closing date known', soon: false, past: false };
  const d = daysBetween(now, `${day}T12:00:00`);
  const text = d === 0 ? 'Closes today' : d === 1 ? 'Closes tomorrow' : d > 1 ? `Closes in ${d} days` : d === -1 ? 'Closed yesterday' : `Closed ${-d} days ago`;
  return { days: d, text, soon: d >= 0 && d <= 7, past: d < 0, on: shortDay(day, now) };
}

// ---- the record --------------------------------------------------------------------------------------------------------------
export function emptyPursuit() {
  return { v: PURSUIT_V, context: {}, notice: { text: '', at: '', by: '' }, ideas: null, keep: [], checks: {}, draft: null, experience: [], scope: [], weeks: {}, start: '',
    site: null, print_address: false, massing: { ...DEFAULT_MASSING }, requirements_version: REQUIREMENTS.version, history: [] };
}
function cleanSection(s, key) {
  if (!isObj(s)) return null;
  const body = key === 'fees' && !clean(s.body) ? FEES_TEXT : clip(s.body, 6000);
  return { body, needs: (Array.isArray(s.needs) ? s.needs : []).map((x) => clip(x, 300)).filter(Boolean).slice(0, 8),
    cites: (Array.isArray(s.cites) ? s.cites : []).map((x) => clean(x)).filter((x) => REQUIREMENTS.items.some((r) => r.id === x)).slice(0, 12),
    from: ['model', 'template', 'practice'].includes(s.from) ? s.from : 'practice', by: clean(s.by).slice(0, 80), at: clean(s.at).slice(0, 40), edited: s.edited === true };
}
/** the pursuit record on an enquiry, cleaned and bounded. An enquiry with none gives an empty record. */
export function readPursuit(e) {
  const r = isObj(e?.pursuit) ? e.pursuit : {}, out = emptyPursuit();
  const c = isObj(r.context) ? r.context : {};
  out.context = {
    buyer: clean(c.buyer).slice(0, 200), region: clean(c.region).slice(0, 80), closes: DAY.test(c.closes ?? '') ? c.closes : '', ref: clean(c.ref).slice(0, 60),
    ...(typeof c.cultural === 'boolean' ? { cultural: c.cultural } : {}), ...(typeof c.public === 'boolean' ? { public: c.public } : {}), ...(typeof c.residential === 'boolean' ? { residential: c.residential } : {}),
  };
  if (isObj(r.notice)) out.notice = { text: clip(r.notice.text, NOTICE_MAX), at: clean(r.notice.at).slice(0, 40), by: clean(r.notice.by).slice(0, 80) };
  if (isObj(r.ideas)) {
    const i = cleanIdeas(r.ideas, out.notice.text);
    // a saved quote check is kept as it was made against the text of the day; checked again against today's text
    out.ideas = { ...i, at: clean(r.ideas.at).slice(0, 40), model: clean(r.ideas.model).slice(0, 80), prompt_revision: clean(r.ideas.prompt_revision).slice(0, 20),
      usage: isObj(r.ideas.usage) ? { input_tokens: num(r.ideas.usage.input_tokens, 0, 1e7) ?? 0, output_tokens: num(r.ideas.usage.output_tokens, 0, 1e7) ?? 0 } : null,
      cost_usd: num(r.ideas.cost_usd, 0, 100), sample: r.ideas.sample === true };
  }
  const ids = new Set((out.ideas?.ideas ?? []).map((i) => i.id));
  out.keep = (Array.isArray(r.keep) ? r.keep : []).filter((x) => ids.has(x));
  out.checks = Object.fromEntries(Object.entries(isObj(r.checks) ? r.checks : {}).filter(([k, v]) => /^g\d{1,2}$/.test(k) && v === true));
  if (isObj(r.draft) && isObj(r.draft.sections)) {
    const sections = {};
    for (const k of SECTION_KEYS) { const s = cleanSection(r.draft.sections[k], k); if (s) sections[k] = s; }
    out.draft = { at: clean(r.draft.at).slice(0, 40), from: r.draft.from === 'model' ? 'model' : 'template', model: clean(r.draft.model).slice(0, 80), notes: clip(r.draft.notes, 1200), sections,
      usage: isObj(r.draft.usage) ? { input_tokens: num(r.draft.usage.input_tokens, 0, 1e7) ?? 0, output_tokens: num(r.draft.usage.output_tokens, 0, 1e7) ?? 0 } : null, cost_usd: num(r.draft.cost_usd, 0, 100), sample: r.draft.sample === true };
  }
  out.experience = (Array.isArray(r.experience) ? r.experience : []).map(clean).filter(Boolean).slice(0, 20);
  out.scope = STAGE_KEYS.filter((k) => (Array.isArray(r.scope) ? r.scope : []).includes(k));
  out.weeks = Object.fromEntries(STAGE_KEYS.map((k) => [k, num(r.weeks?.[k], 0.5, 260)]).filter(([, v]) => v != null));
  out.start = DAY.test(r.start ?? '') ? r.start : '';
  if (isObj(r.site) && num(r.site.lat, -47.5, -34) != null && num(r.site.lon, 166, 179) != null) out.site = { lat: r.site.lat, lon: r.site.lon, place: clean(r.site.place).slice(0, 120), address: clean(r.site.address).slice(0, 160) };
  out.print_address = r.print_address === true;
  const m = isObj(r.massing) ? r.massing : {};
  out.massing = { w: num(m.w, 1, 300) ?? DEFAULT_MASSING.w, d: num(m.d, 1, 300) ?? DEFAULT_MASSING.d, h: num(m.h, 1, 120) ?? DEFAULT_MASSING.h, x: num(m.x, -300, 300) ?? 0, z: num(m.z, -300, 300) ?? 0,
    turn: num(m.turn, -180, 180) ?? 0, around: num(m.around, 2, 60) ?? DEFAULT_MASSING.around };
  out.requirements_version = clean(r.requirements_version) || REQUIREMENTS.version;
  out.history = (Array.isArray(r.history) ? r.history : []).filter((h) => isObj(h) && clean(h.what)).slice(-HISTORY_MAX).map((h) => ({ at: clean(h.at).slice(0, 40), who: clean(h.who).slice(0, 80), what: clean(h.what).slice(0, 200) }));
  return out;
}

/**
 * The enquiry with its pursuit record changed: patch is merged over the record (one level deep for context, notice and
 * massing; draft.sections merged by section unless draft.replace). One history line is added when `what` is given. Saves nothing.
 */
export function withPursuit(e, patch = {}, { who = '', now = new Date(), what = '' } = {}) {
  const cur = readPursuit(e), at = (now instanceof Date ? now : new Date(now)).toISOString();
  const next = { ...cur, ...patch };
  // context, notice and massing are merged; checks and weeks are always given whole, so a key can be taken away
  for (const k of ['context', 'notice', 'massing']) if (isObj(patch[k])) next[k] = { ...cur[k], ...patch[k] };
  if (isObj(patch.draft) && isObj(cur.draft) && !patch.draft.replace) next.draft = { ...cur.draft, ...patch.draft, sections: { ...cur.draft.sections, ...(patch.draft.sections ?? {}) } };
  if (next.draft) { next.draft = { ...next.draft }; delete next.draft.replace; }
  next.requirements_version = REQUIREMENTS.version;
  next.history = what ? [...cur.history, { at, who: clean(who), what: clean(what).slice(0, 200) }].slice(-HISTORY_MAX) : cur.history;
  const out = { ...e, pursuit: next };
  return { ...e, pursuit: readPursuit(out) };
}
/** about how big the record is when saved, in characters: the shared records keep it on the enquiry row */
export const pursuitSize = (e) => JSON.stringify(e?.pursuit ?? {}).length;

// ---- requirements ----------------------------------------------------------------------------------------------------------
const APPLIES = {
  always: () => ['yes', 'Applies to any design work.'],
  public: (n) => (n.public ? ['yes', 'The buyer is a public agency.'] : ['maybe', 'Applies when the buyer is a public agency.']),
  residential: (n) => (n.residential ? ['maybe', 'Homes: a voluntary rating the buyer may ask about.'] : ['no', 'For homes; this notice is not marked as housing.']),
  nonresidential: (n) => (n.residential ? ['no', 'For buildings other than homes; this notice is marked as housing.'] : ['maybe', 'A voluntary rating the buyer may ask about.']),
  cultural: (n) => (n.cultural ? ['yes', 'The notice is marked as kaupapa Māori work.'] : ['maybe', 'Check with the buyer whether mana whenua engagement is expected.']),
};
/** every requirement with { applies: 'yes'|'maybe'|'no', why } for this notice, in the data file's order */
export function applicable(notice, data = REQUIREMENTS) {
  return data.items.map((r) => { const [applies, why] = (APPLIES[r.applies] ?? APPLIES.always)(notice); return { ...r, applies, why }; });
}
/** the requirements a section draws on (those that apply or may apply) */
export const forSection = (key, list) => list.filter((r) => r.applies !== 'no' && r.informs.includes(key));
/** the ids to send with a request: everything that applies or may apply */
export const requirementIds = (list) => list.filter((r) => r.applies !== 'no').map((r) => r.id);

// ---- ESG coverage ----------------------------------------------------------------------------------------------------------
// Each point is found by its words in the draft, never by a score. A point named only inside "[practice to add: …]" is "named".
export const ESG = {
  E: { label: 'Environmental', points: [
    { id: 'op-carbon', label: 'Operational energy and carbon', words: ['operational carbon', 'operational energy', 'energy use', 'energy efficien', 'nabers', 'h1', 'thermal', 'insulation', 'passive design', 'heating and cooling'] },
    { id: 'emb-carbon', label: 'Embodied carbon', words: ['embodied carbon', 'whole-of-life', 'whole of life', 'life cycle assessment', 'lca', 'upfront carbon', 'carbon comparison'] },
    { id: 'waste', label: 'Construction and demolition waste', words: ['waste', 'demolition', 'reuse', 're-use', 'recycl', 'circular'] },
    { id: 'materials', label: 'Materials', words: ['materials', 'timber', 'low-carbon concrete', 'epd', 'environmental product declaration', 'wool'] },
    { id: 'water', label: 'Water', words: ['water use', 'rainwater', 'stormwater', 'greywater', 'water efficien', 'water sensitive'] },
    { id: 'resilience', label: 'Resilience to climate and hazards', words: ['resilien', 'climate adaptation', 'adapt to climate', 'flood', 'sea level', 'overland flow', 'natural hazard', 'overheating'] },
  ] },
  S: { label: 'Social', points: [
    { id: 'econ', label: 'Economic benefit to New Zealand (Rule 8)', words: ['economic benefit', 'rule 8', 'broader outcomes'] },
    { id: 'maori-pasifika', label: 'Māori and Pasifika businesses', words: ['maori business', 'maori-owned', 'maori owned', 'pasifika', 'pacific business', 'supplier diversity', 'maori and pasifika'] },
    { id: 'local-jobs', label: 'Local employment and training', words: ['local employ', 'local workforce', 'apprentic', 'cadet', 'graduate', 'internship', 'training', 'local subcontract', 'local supplier'] },
    { id: 'mana-whenua', label: 'Mana whenua engagement', words: ['mana whenua', 'iwi', 'hapu', 'te aranga', 'marae'] },
    { id: 'community', label: 'Community and user engagement', words: ['community engagement', 'engage the community', 'engaging the community', 'engagement with', 'user engagement', 'co-design', 'hui', 'workshop', 'stakeholder'] },
    { id: 'access', label: 'Accessibility', words: ['accessib', 'nzs 4121', 'universal design', 'disabled', 'disabilit', 'mobility'] },
    { id: 'safety', label: 'Health and safety', words: ['health and safety', 'safety in design', 'design safety', 'hswa', 'section 39', 'risk register'] },
  ] },
  G: { label: 'Governance', points: [
    { id: 'tiriti', label: 'Te Tiriti o Waitangi', words: ['te tiriti', 'treaty'] },
    { id: 'quality', label: 'Quality assurance', words: ['quality assurance', 'peer review', 'design review', 'checking', 'iso 9001', 'document control'] },
    { id: 'risk', label: 'Risk management', words: ['risk register', 'risk management', 'mitigat', 'manage the risk', 'risks are'] },
    { id: 'hold-points', label: 'Hold points and sign-off', words: ['hold point', 'sign-off', 'sign off', 'signs off', 'signed off', 'approval', 'stage gate'] },
    { id: 'conflicts', label: 'Conflicts of interest', words: ['conflict of interest', 'conflicts of interest'] },
    { id: 'reporting', label: 'Reporting on commitments', words: ['report on', 'reporting', 'monitor'] },
  ] },
};
/** "[practice to add: …]" spans taken out of a text, and what is left */
export function splitMarkers(text) {
  const t = String(text ?? ''), marks = [];
  const rest = t.replace(/\[practice to add[^\]]*\]/gi, (m) => { marks.push(m); return ' '; });
  return { rest, marks };
}
export const markerCount = (text) => splitMarkers(text).marks.length;
/** a word or phrase that starts at a word boundary ("recycl" finds recycling; "iwi" does not find kiwi) */
const found = (text, words) => { const t = ` ${plain(text)} `; return words.some((w) => t.includes(` ${plain(w)}`)); };

/**
 * For each point: { id, label, state: 'covered'|'named'|'not yet', sections: [keys] }. covered: the draft's own words mention it;
 * named: only inside a "[practice to add: …]" marker; not yet: nowhere in the draft. Coverage only: nothing is rated.
 */
export function esgCoverage(sections = {}) {
  const out = {};
  for (const [group, g] of Object.entries(ESG)) {
    out[group] = { label: g.label, points: g.points.map((p) => {
      const inText = [], inMarks = [];
      for (const k of SECTION_KEYS) {
        const body = sections?.[k]?.body;
        if (!body) continue;
        // the draft's own words: quotations (the notice's title or text, in quotation marks) are not the practice's commitments
        const { rest: own, marks } = splitMarkers(body), rest = own.replace(/“[^”]*”|"[^"\n]*"/g, ' ');
        if (found(rest, p.words)) inText.push(k); else if (marks.some((m) => found(m, p.words))) inMarks.push(k);
      }
      return { id: p.id, label: p.label, state: inText.length ? 'covered' : inMarks.length ? 'named' : 'not yet', sections: inText.length ? inText : inMarks };
    }) };
    out[group].covered = out[group].points.filter((p) => p.state === 'covered').length;
  }
  return out;
}

// ---- numbers that came from nowhere -----------------------------------------------------------------------------------------
const NUMBER = /\$?\d[\d,]*(?:\.\d+)?\s?%?/g;
const norm = (n) => n.replace(/[$,%\s]/g, '').replace(/\.0+$/, '');
/** numbers in a text, normalised ("$85,000" -> "85000", "10 %" -> "10") */
export const numbersIn = (text) => [...new Set((String(text ?? '').match(NUMBER) ?? []).map(norm).filter(Boolean))];
/**
 * The numbers in a section that appear nowhere in what was given (the notice, the practice's typed figures, the sources' own
 * summaries and titles). Stage numbers 1 to 7 are fine. Each one is a figure for the practice to check before it is used.
 */
export function figuresNotGiven(text, given = []) {
  const ok = new Set(['1', '2', '3', '4', '5', '6', '7']);
  for (const g of given) for (const n of numbersIn(g)) ok.add(n);
  return numbersIn(splitMarkers(text).rest).filter((n) => !ok.has(n));
}
/** everything a draft's figures may come from */
export function givenTexts({ notice, team = [], projects = [], pursuit, data = REQUIREMENTS }) {
  return [notice?.title, notice?.text, notice?.closes, notice?.ref, ...team.map((t) => `${t.name} ${t.capacity ?? ''}`), ...projects.map((p) => p.name),
    ...Object.values(pursuit?.weeks ?? {}).map(String), pursuit?.start ?? '',
    ...data.items.flatMap((r) => [r.title, r.summary, r.note ?? '', r.evidence?.quote ?? ''])].filter(Boolean);
}

// ---- the programme, the team -------------------------------------------------------------------------------------------------
const addDays = (day, n) => { const [y, m, d] = day.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + Math.round(n))).toISOString().slice(0, 10); };
/**
 * The stages in scope in order, each with the weeks the practice typed and where it falls: { key, n, label, weeks, from, to, startDay, endDay, hold }.
 * A stage with no weeks typed has weeks null and is drawn as "to be typed". Nothing is assumed.
 */
export function programmeRows(p) {
  const scope = p?.scope?.length ? p.scope : [];
  let at = 0;
  return STAGES.filter((s) => scope.includes(s.key)).map((s) => {
    const weeks = p.weeks?.[s.key] ?? null, from = at, to = weeks != null ? at + weeks : at;
    if (weeks != null) at = to;
    const next = STAGES[STAGE_KEYS.indexOf(s.key) + 1];
    return { key: s.key, n: STAGE_KEYS.indexOf(s.key) + 1, label: s.label, weeks, from, to, startDay: p.start && weeks != null ? addDays(p.start, from * 7) : '', endDay: p.start && weeks != null ? addDays(p.start, to * 7) : '',
      hold: next ? `Buyer signs off ${s.label.toLowerCase()} before ${next.label.toLowerCase()}` : 'Buyer accepts completion' };
  });
}
export const programmeWeeks = (rows) => rows.reduce((a, r) => a + (r.weeks ?? 0), 0);

/**
 * The team from the practice's Money settings: [{ name, capacity, planned, free }]. capacity is the hours a week a person typed;
 * planned is the average hours a week already allocated over the given weeks; free is the difference. null wherever nothing was typed.
 */
export function teamRows(team = [], load = []) {
  return team.map((t) => {
    const cap = typeof t.capacity === 'number' ? t.capacity : null;
    const weeks = load.length ? load.map((w) => w.people?.[t.name] ?? 0) : [];
    const planned = weeks.length ? Math.round((weeks.reduce((a, b) => a + b, 0) / weeks.length) * 10) / 10 : null;
    return { name: t.name, capacity: cap, planned, free: cap != null && planned != null ? Math.round((cap - planned) * 10) / 10 : null };
  });
}

// ---- a free starting draft ------------------------------------------------------------------------------------------------------
const listOf = (a) => (a.length <= 1 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);
/**
 * Template text for every section from what the practice already has: the notice, kept ideas, the team, ticked projects, the
 * programme and the requirements. Every fact it does not have is a "[practice to add: …]" marker. No model, no network, free.
 */
export function templateDraft({ notice, pursuit, team = [], projects = [], list = applicable(notice), who = '', now = new Date() }) {
  const at = (now instanceof Date ? now : new Date(now)).toISOString();
  const kept = (pursuit?.ideas?.ideas ?? []).filter((i) => pursuit.keep.includes(i.id));
  const rows = programmeRows(pursuit ?? {});
  const cites = (k) => forSection(k, list).map((r) => r.id);
  const s = (key, body, needs = []) => [key, { body, needs, cites: key === 'fees' ? [] : cites(key), from: 'template', by: who, at, edited: false }];
  const buyer = notice.buyer || 'the buyer';
  const sections = Object.fromEntries([
    s('understanding', `${buyer} is seeking ${notice.title ? `“${notice.title}”` : 'architectural services'}${notice.region ? ` in ${notice.region}` : ''}.${notice.closes ? ` Responses close ${shortDay(notice.closes, now)}.` : ''}\n\n[practice to add: the brief in the practice's own words, from the notice and the tender documents: what the buyer wants to achieve, for whom, and what success looks like.]`, ['The brief, from the tender documents']),
    s('approach', `${kept.length ? `The practice would:\n\n${kept.map((i) => `${i.title}. ${i.what}`).join('\n\n')}` : '[practice to add: how the practice would run this work, stage by stage.]'}\n\n[practice to add: who leads each stage and how the buyer is involved.]`, ['How the practice would run the work']),
    s('programme', rows.length ? `The work would run through the NZIA stages in scope: ${listOf(rows.map((r) => `${r.label.toLowerCase()}${r.weeks != null ? ` (${r.weeks} weeks)` : ''}`))}. At the end of each stage the buyer signs off before the next one starts.${rows.some((r) => r.weeks == null) ? '\n\n[practice to add: weeks for each stage in scope.]' : ''}` : '[practice to add: the stages in scope and the weeks for each. Tick them in the programme below.]', ['Stages in scope and weeks']),
    s('team', team.length ? `The team for this work would be drawn from: ${listOf(team.map((t) => `${t.name}${t.capacity != null ? ` (${t.capacity} hours a week)` : ''}`))}.\n\n[practice to add: each person's role on this job and the experience that matters here.]` : '[practice to add: the people who would do this work, their roles and their hours. Add the practice\'s people in Settings, Money.]', ['Roles and CV points']),
    s('experience', projects.length ? projects.map((p) => `${p.name}${p.stage ? ` (reached ${p.stage.toLowerCase()})` : ''}: [practice to add: the practice's role, the scale and the outcome, and why it is relevant here.]`).join('\n\n') : '[practice to add: two or three of the practice\'s own projects that show it can do this work. Tick them in the list above.]', ['Project details']),
    s('economic', 'The practice would set out the economic benefit to New Zealand it offers on this job, as the notice asks.\n\n[practice to add: local people and subconsultants it would use, training or graduate places, Māori, Pasifika, small and regional businesses in its supply chain, and how it would report on them.]', ['Commitments the practice can keep']),
    s('sustainability', '[practice to add: how the practice would address operational energy and carbon, embodied carbon (MBIE\'s whole-of-life method is voluntary), construction waste, materials, water, and resilience to climate and natural hazards on this job.]', ['Sustainability approach']),
    s('tiriti', notice.cultural ? 'The practice would honour Te Tiriti o Waitangi by seeking a relationship with mana whenua from the outset, through the buyer, and by supporting a narrative process that mana whenua lead, in line with the Te Aranga principles.\n\n[practice to add: the practice\'s existing relationships and how it would resource this.]' : '[practice to add: whether mana whenua engagement is expected on this work, and how the practice would honour Te Tiriti o Waitangi in its approach. Ask the buyer if the notice does not say.]', ['Mana whenua relationships']),
    s('hsid', 'As designer, the practice has a duty under section 39 of the Health and Safety at Work Act 2015 to design out risks so far as is reasonably practicable, and to pass on what others need to build, use and maintain the building safely.\n\n[practice to add: how the practice runs design safety reviews and keeps a safety in design risk register.]', ['Safety in design process']),
    s('access', 'Accessibility for disabled people would be designed in from the first stage, with NZS 4121:2001 as the reference.\n\n[practice to add: how the practice would involve users, including disabled people, in the design.]', ['Accessibility approach']),
    s('risk', '[practice to add: the main risks to the programme and the outcome, and how the practice would manage each one.]', ['Risks and how they are managed']),
    s('quality', '[practice to add: how the practice checks its own work: design reviews, sign-off at each hold point, document control.]', ['Quality process']),
    s('fees', FEES_TEXT, ['The fee proposal']),
  ]);
  return { at, from: 'template', model: '', notes: 'Started from the template: every marker is something the practice still has to write.', sections };
}

/** sections in order, each with its title and its saved text (or nothing yet) */
export const draftSections = (draft) => SECTIONS.map((s) => ({ ...s, ...(draft?.sections?.[s.key] ?? { body: '', needs: [], cites: [] }) }));
export { SECTIONS, SECTION_KEYS, MODEL_SECTION_KEYS, sectionTitle };
/** today's day, where the person is */
export const today = (now = new Date()) => dayKey(now);
