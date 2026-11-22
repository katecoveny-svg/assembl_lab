// Found work ("auto hunting the pipeline"): the rules, with no page in them.
// What the practice looks for, how it is asked of the live feed, what an "Add to pipeline" press makes, which signals were added
// already, and which a person said are not for them. Nothing here saves, sends or reaches the network: hunt.js does the saving,
// and only when a person presses a button.
//
// The practice's settings (practice.extra.hunt when signed in, a browser setting otherwise) hold only what the practice typed:
//   { keywords:[text], regions:[NZ region], sectors:[sector key], min: NZD|null, max: NZD|null, sources:{ gets: true }, cultural: true|false }
// cultural: "always show kaupapa Māori and Indigenous work, whatever the other words" (a match is kept even when it misses the words and sectors).
// No client details belong in them.
import { newEnquiry, newActivity, dayKey, shortDay } from './crm-model.js';

export const REGIONS = ['Northland', 'Auckland', 'Waikato', 'Bay of Plenty', 'Gisborne', "Hawke's Bay", 'Taranaki', 'Manawatu-Wanganui', 'Wellington', 'Tasman', 'Nelson', 'Marlborough', 'West Coast', 'Canterbury', 'Otago', 'Southland', 'Chatham Islands'];
/** the sectors the feed knows (api/_feeds/hunt.js SECTORS): tests keep the two lists the same */
export const SECTORS = [
  ['education', 'Education'], ['health', 'Health'], ['housing', 'Housing'], ['civic', 'Civic and community'],
  ['commercial', 'Commercial and workplace'], ['heritage', 'Heritage and conservation'], ['justice', 'Justice and safety'], ['sport', 'Sport and recreation'], ['kaupapa', 'Kaupapa Māori and Indigenous'],
];
export const SECTOR_KEYS = SECTORS.map(([k]) => k);
export const sectorLabel = (key) => SECTORS.find(([k]) => k === key)?.[1] ?? String(key ?? '');
/** the sources a practice can switch on or off. Only sources whose terms allow automated reading are here (docs/architecture/pipeline-hunt.md). */
export const SOURCES = [
  { id: 'radar', name: 'Radar', long: 'Notices the assembl radar has already collected', url: 'https://www.gets.govt.nz/ExternalIndex.htm', says: 'Public tender notices the assembl radar collects daily (needs the shared records).' },
  { id: 'gets', name: 'GETS', long: 'NZ Government Electronic Tenders Service', url: 'https://www.gets.govt.nz/ExternalIndex.htm', says: 'Open tenders from councils, the Ministry of Education, Health NZ, universities and other public buyers, read straight from the published list.' }];
export const SOURCE_IDS = SOURCES.map((s) => s.id);
/** the sources the live feed reads itself; "radar" is read from the shared records and scored in the browser */
export const FEED_SOURCE_IDS = ['gets'];

export const HUNT_ENQUIRY_ACTION = 'Read the tender documents';
export const SHOWN_MAX = 12;

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
/** whole days from one "YYYY-MM-DD" to another, counted on the calendar (so the zone the browser is in cannot shift it) */
const dayDiff = (a, b) => { const x = DAY.exec(a), y = DAY.exec(b); return x && y ? Date.UTC(+y[1], +y[2] - 1, +y[3]) / 864e5 - Date.UTC(+x[1], +x[2] - 1, +x[3]) / 864e5 : NaN; };
const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

/** nothing to look for: it finds nothing until the practice sets something */
export const emptyHunt = () => ({ keywords: [], regions: [], sectors: [], min: null, max: null, sources: Object.fromEntries(SOURCE_IDS.map((id) => [id, true])), cultural: false });

const money = (v) => {
  if (v === '' || v == null) return null;
  const d = String(v).replace(/[\s,$]/g, '');
  if (!/^\d{1,11}(\.\d{1,2})?$/.test(d)) throw new Error('Type the value as dollars, for example 250000. Leave it empty if you have no range.');
  return Number(d);
};

/** Settings as they are kept: bounded lists, known regions and sectors, numbers or null. Anything else is dropped. Throws a plain sentence for a value that is not dollars. */
export function cleanHunt(raw) {
  const r = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const words = (Array.isArray(r.keywords) ? r.keywords : String(r.keywords ?? '').split(/[,\n;]/)).map((k) => clean(k).slice(0, 40)).filter(Boolean);
  const seen = new Set(), keywords = words.filter((k) => !seen.has(k.toLowerCase()) && seen.add(k.toLowerCase())).slice(0, 20);
  const regions = REGIONS.filter((x) => (Array.isArray(r.regions) ? r.regions : []).includes(x));
  const sectors = SECTOR_KEYS.filter((x) => (Array.isArray(r.sectors) ? r.sectors : []).includes(x));
  let min = money(r.min), max = money(r.max);
  if (min != null && max != null && min > max) [min, max] = [max, min];
  const src = r.sources && typeof r.sources === 'object' ? r.sources : {};
  const sources = Object.fromEntries(SOURCE_IDS.map((id) => [id, src[id] !== false]));
  return { keywords, regions, sectors, min, max, sources, cultural: r.cultural === true };
}
/** looks for nothing at all (no keywords, no sector and the cultural switch off): regions and a range alone are not something to look for */
export const huntIsEmpty = (h) => !h || (!h.keywords?.length && !h.sectors?.length && !h.cultural);

/** the query string the live feed is asked with: /api/live/?feeds=hunt&... Same settings give the same string (it keys the day's cache). */
export function huntQuery(h) {
  const p = new URLSearchParams({ feeds: 'hunt' });
  if (h.keywords?.length) p.set('keywords', h.keywords.join(','));
  if (h.regions?.length) p.set('regions', h.regions.join(','));
  if (h.sectors?.length) p.set('sectors', h.sectors.join(','));
  if (h.min != null) p.set('min', String(h.min));
  if (h.max != null) p.set('max', String(h.max));
  if (h.cultural) p.set('cultural', '1');
  const on = FEED_SOURCE_IDS.filter((id) => h.sources?.[id] !== false);
  if (on.length && on.length < FEED_SOURCE_IDS.length) p.set('sources', on.join(','));
  return p.toString();
}
export const sourcesOn = (h) => SOURCE_IDS.filter((id) => h?.sources?.[id] !== false);

// ---- what the feed gave back ------------------------------------------------------------------------------------------------------------
/** the cultural flag on a finding: { on, why:[words] }. Missing or malformed means off. */
export function cleanCultural(c) {
  const why = (Array.isArray(c?.why) ? c.why : []).map((w) => clean(w).slice(0, 40)).filter(Boolean).slice(0, 8);
  return { on: c?.on === true && why.length > 0, why: c?.on === true ? why : [] };
}
/** one signal as the page keeps it: only the fields the cards use, bounded. A link must be https. */
export function cleanSignal(s) {
  if (!s || typeof s !== 'object' || !clean(s.id) || !clean(s.title)) return null;
  if (!/^https:\/\//.test(String(s.url ?? ''))) return null;
  const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  return {
    id: clean(s.id).slice(0, 80), title: clean(s.title).slice(0, 300), buyer: clean(s.buyer).slice(0, 200), region: clean(s.region).slice(0, 80),
    closes: s.closes && !Number.isNaN(Date.parse(s.closes)) ? String(s.closes) : null, closesDay: /^\d{4}-\d{2}-\d{2}$/.test(s.closesDay ?? '') ? s.closesDay : '',
    value: num(s.value), url: String(s.url).slice(0, 500), source: clean(s.source).slice(0, 20) || 'gets', sourceName: clean(s.sourceName).slice(0, 40) || 'GETS',
    published: /^\d{4}-\d{2}-\d{2}$/.test(s.published ?? '') ? s.published : '', fit: Math.max(0, Math.min(100, Math.round(num(s.fit) ?? 0))),
    cultural: cleanCultural(s.cultural),
    reasons: (Array.isArray(s.reasons) ? s.reasons : []).map((x) => clean(x).slice(0, 160)).filter(Boolean).slice(0, 10),
  };
}

/** The feed's answer (feeds.hunt) as the page uses it: { signals, sources, needsLens, considered, fetchedAt }. Throws the feed's own plain sentence when it has an error. */
export function readAnswer(body) {
  const h = body?.feeds?.hunt;
  if (!h) throw new Error('The hunt did not answer. Try again in a minute.');
  if (h.error) throw new Error(String(h.error));
  const v = h.values ?? {};
  return {
    signals: (Array.isArray(v.signals) ? v.signals : []).map(cleanSignal).filter(Boolean).slice(0, 40),
    sources: (Array.isArray(v.sources) ? v.sources : []).map((x) => ({ id: clean(x.id), name: clean(x.name), ok: !!x.ok, error: clean(x.error).slice(0, 300) })),
    needsLens: !!v.needsLens, considered: Number(v.considered) || 0, fetchedAt: h.fetchedAt && !Number.isNaN(Date.parse(h.fetchedAt)) ? h.fetchedAt : new Date().toISOString(),
  };
}

/** how a fit reads in words. Meter segments are out of 5. */
export const fitWord = (fit) => (fit >= 75 ? 'Strong fit' : fit >= 60 ? 'Good fit' : 'Possible fit');
export const fitSteps = (fit) => Math.max(1, Math.min(5, Math.round(fit / 20)));
/** whole days to the closing day (negative when it has passed), or null with no closing day */
export const daysLeft = (s, now = new Date()) => (s.closesDay ? dayDiff(dayKey(now), s.closesDay) : null);
export function buyerInitials(buyer) {
  const words = String(buyer ?? '').replace(/[^\p{L}\p{N}\s-]/gu, ' ').split(/[\s-]+/).filter((w) => w && !/^(the|of|and|for|te)$/i.test(w));
  if (!words.length) return '–';
  return (words.length === 1 ? [...words[0]].slice(0, 2).join('') : `${[...words[0]][0]}${[...words[1]][0]}`).toLocaleUpperCase('en-NZ');
}

// ---- added already, and "Not for us" ----------------------------------------------------------------------------------------------------
/** the tender's number in GETS, from its id ("gets:35471034" gives "35471034") */
const refOf = (s) => String(s.id).replace(/^[a-z]+:/, '');
/** the line kept as the enquiry's source: where it came from, who is buying, and the link to the notice */
export const sourceLine = (s) => `${s.sourceName} tender ${refOf(s)} · ${s.buyer || 'buyer not stated'} · ${s.url}`;
/** the link inside a source line, or '' */
export const sourceLink = (text) => { const m = /(https:\/\/\S+)/.exec(String(text ?? '')); return m ? m[1] : ''; };
/** the enquiry (archived or not) already made from this signal, or null: matched on the notice's link, never on the title */
export const addedAs = (s, enquiries = []) => enquiries.find((e) => sourceLink(e.source) && sourceLink(e.source) === s.url) ?? null;

/**
 * What pressing "Add to pipeline" makes: a new enquiry in the New column and one history line. Returns { enquiry, activity }; saves nothing.
 *   title            the notice's title        source           "GETS tender 35471034 · Hamilton City Council · https://..."
 *   next_action      "Read the tender documents"               next_action_due  the closing day (empty when the notice states none)
 *   owner            empty: the person picks   value_nzd        null: a value is only what a person types
 *   no person is made: a buyer is an organisation, and a contact is a person someone has actually spoken to
 */
export function enquiryFromSignal(s, { now = new Date(), who = '' } = {}) {
  const sig = cleanSignal(s);
  if (!sig) throw new Error('That finding cannot be added: it has no link to the notice.');
  const enquiry = newEnquiry({ title: sig.title, source: sourceLine(sig), next_action: HUNT_ENQUIRY_ACTION, next_action_due: sig.closesDay, owner: '', value_nzd: null, now });
  const lines = [`Found by the hunt in ${sig.sourceName} public tender notices${sig.buyer ? `, buyer ${sig.buyer}` : ''}${sig.closesDay ? `, closing ${shortDay(sig.closesDay, now)}` : ''}.`];
  if (sig.reasons.length) lines.push(`Why it looked like a fit: ${sig.reasons.join('; ')}.`);
  if (sig.value != null) lines.push(`The notice states a value of $${sig.value.toLocaleString('en-NZ')}. That is not the enquiry's value: a person sets that.`);
  lines.push(`Notice: ${sig.url}`, 'Nothing has been sent, registered or submitted.');
  const activity = newActivity({ enquiry_id: enquiry.id, kind: 'note', body: lines.join(' '), who, now, at: now instanceof Date ? now.toISOString() : new Date(now).toISOString() });
  return { enquiry, activity };
}

/** what is kept for "Not for us": { <signal id>: <its closing day, or the day it was hidden> }. Entries older than 90 days past their closing are let go. */
export function cleanDismissed(raw, now = new Date()) {
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  const today = dayKey(now);
  for (const [id, day] of Object.entries(raw)) {
    if (!/^[a-z]+:\S{1,60}$/.test(id) || !/^\d{4}-\d{2}-\d{2}$/.test(String(day))) continue;
    if (dayDiff(day, today) > 90) continue;
    out[id] = day;
  }
  return Object.fromEntries(Object.entries(out).slice(-500));
}
export const dismiss = (kept, s, now = new Date()) => ({ ...cleanDismissed(kept, now), [s.id]: s.closesDay || dayKey(now) });
export const restore = (kept, id, now = new Date()) => { const o = cleanDismissed(kept, now); delete o[id]; return o; };

/** the setting ids this browser uses, per practice (or "browser" when no practice is in use) */
export const scopeOf = (practice) => (practice?.id ? `p-${String(practice.id).slice(0, 36)}` : 'browser');
export const SETTING = { hunt: 'hunt', dismissed: (scope) => `hunt-dismissed:${scope}`, cache: (scope) => `hunt-cache:${scope}` };

/** is a kept answer still today's, for these same settings? The day is the day where the person is. */
export function cacheFresh(cache, query, now = new Date()) {
  return !!cache && cache.query === query && cache.day === dayKey(now) && !!cache.answer;
}
