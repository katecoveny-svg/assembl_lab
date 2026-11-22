// Site facts for one point, from the lab's own live feed (/api/live/?feeds=site), kept as a dated snapshot.
// The feed describes what each published map shows at the point. It is not a planning, hazard or Building Code
// assessment, and a point outside a mapped hazard is not proof the site cannot be affected.
//
// Where the point goes. The feed takes query parameters only, so the point is sent in the feed's address
// (?feeds=site&lat=..&lon=..). The feed asks the public map services about it and does not store it, apart from a
// short-lived cache of its answer under that address (functions/api/live.js; for the site feed the answer says
// Cache-Control: s-maxage=900, stale-while-revalidate=3600). The page does not put the point in a share link or print it.
//
// What is kept: each fact's label, value, unit, status, date, note, source name and credit line.
// What is left out on purpose: the feed's "values" (they include the parcel outline, which is the location drawn
// out), and the weather fact (it is this hour's weather, not a fact about the site, and its free terms are for
// non-commercial use only).

export const FEED = '/api/live/';
const LEFT_OUT = new Set(['site.weather']);

/** "lat, lon" in decimal degrees, inside New Zealand's main islands. Same test as the 3D page's site facts card. */
export function parseWhere(text) {
  const m = String(text ?? '').trim().match(/^(-?\d{1,2}(?:\.\d+)?)\s*[,\s]\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = Number(m[1]), lon = Number(m[2]);
  if (!(lat <= -34 && lat >= -47.5 && lon >= 166 && lon <= 179)) return null;
  return { lat, lon };
}

const text = (v) => (v == null ? '' : String(v));

// ---- the street address -------------------------------------------------------------------------------------------------------------
// The site can be set from a New Zealand street address instead of coordinates. The words typed are sent to the lab's address feed
// (/api/live/?feeds=address&q=..), which asks LINZ's public NZ Addresses service and gives back up to eight matches, each with a point.
// The feed does not log or store the words, apart from the short-lived cache of its answer under that address (five minutes).
// The project keeps the one address that was chosen (its text, suburb, town, council and LINZ's id) beside the point; the street
// address is not put in a share link, and it is printed in the client pack only if that project's setting says so.
export const ADDRESS_MIN = 4, ADDRESS_MAX = 120;
export const ADDRESS_CREDIT = 'Sourced from the LINZ Data Service and licensed for reuse under the CC BY 4.0 licence.';

/** one match as the project keeps it: what is shown to confirm the site, and nothing else (the point is kept as site.lat and site.lon) */
export function keptAddress(m) {
  return { id: m?.id == null ? null : m.id, address: text(m?.address), suburb: text(m?.suburb), town: text(m?.town), council: text(m?.council) };
}
/** "Ponsonby, Auckland": where the site is, without the street. The town is left out when it repeats the suburb. */
export function placeLine(a) {
  const parts = [a?.suburb, a?.town].map(text).filter(Boolean);
  return parts.filter((p, i) => parts.indexOf(p) === i).join(', ');
}
/** what the client pack says about the site's place: the suburb and town, or the full address when the project's setting allows it */
export function packPlace(site) {
  const a = site?.address;
  if (!a || !a.address) return '';
  return site.print_address ? a.address : placeLine(a);
}
/** the street and the rest of an address, for the two lines of a suggestion: "14 Ponsonby Road" and "Ponsonby, Auckland" */
export function splitAddress(full) {
  const i = text(full).indexOf(',');
  return i < 0 ? { street: text(full), rest: '' } : { street: text(full).slice(0, i).trim(), rest: text(full).slice(i + 1).trim() };
}

/** Ask the address feed. Returns { matches, more }. Throws with the feed's own plain words, or a plain reason; nothing is guessed. */
export async function askAddress(words, fetchImpl = globalThis.fetch, { signal } = {}) {
  const q = String(words ?? '').trim();
  if (q.length < ADDRESS_MIN) return { matches: [], more: false };
  if (q.length > ADDRESS_MAX) throw new Error(`That is too long for an address: ${ADDRESS_MAX} characters at most.`);
  let r;
  try { r = await fetchImpl(`${FEED}?feeds=address&q=${encodeURIComponent(q)}`, { headers: { accept: 'application/json' }, signal }); }
  catch (e) { if (e?.name === 'AbortError') throw e; throw new Error('The address search could not be reached. Check the connection, or enter the site as coordinates instead.'); }
  if (!r.ok) throw new Error(`The address search is not answering just now (${r.status}). Try again in a minute, or enter the site as coordinates instead.`);
  const a = (await r.json())?.feeds?.address;
  if (!a || a.error) throw new Error(a?.error ? String(a.error) : 'The address search gave no answer. Try again in a minute, or enter the site as coordinates instead.');
  const num = (v) => typeof v === 'number' && Number.isFinite(v);
  const matches = (a.values?.matches ?? []).filter((m) => m && text(m.address) && num(m.lat) && num(m.lon) && parseWhere(`${m.lat}, ${m.lon}`)).slice(0, 8).map((m) => ({ ...keptAddress(m), lat: m.lat, lon: m.lon, unit: m.unit ?? null }));
  return { matches, more: !!a.values?.more };
}

/** One fact as the project keeps it */
export function trimFact(f) {
  return {
    id: text(f.id), label: text(f.label), status: text(f.status), truthLabel: text(f.truthLabel),
    value: f.value == null || typeof f.value === 'object' ? null : f.value, unit: text(f.unit), asOf: f.asOf == null ? null : text(f.asOf),
    note: text(f.note), reason: text(f.reason), needs: text(f.needs),
    source: { name: text(f.source?.name) }, licence: { attribution: text(f.licence?.attribution) },
  };
}

/** The feed's answer as a list of kept facts, in the feed's own order */
export function snapshotFacts(siteFeed) {
  const facts = siteFeed?.facts;
  if (!facts || typeof facts !== 'object') throw new Error(siteFeed?.error ? String(siteFeed.error) : 'no facts came back');
  return Object.values(facts).filter((f) => f && typeof f === 'object' && !LEFT_OUT.has(f.id)).map(trimFact);
}

export const answered = (facts) => (facts ?? []).filter((f) => f.status === 'live');
export const notConnected = (facts) => (facts ?? []).filter((f) => f.status === 'not-wired');
export const noAnswer = (facts) => (facts ?? []).filter((f) => f.status !== 'live' && f.status !== 'not-wired');
/** each publisher's credit line, once */
export const credits = (facts) => [...new Set(answered(facts).map((f) => f.licence?.attribution).filter(Boolean))];

export function showValue(f) {
  if (f.value === null || f.value === undefined || f.value === '') return 'Nothing mapped at this point';
  const s = typeof f.value === 'number' ? f.value.toLocaleString('en-NZ') : String(f.value);
  return f.unit ? `${s} ${f.unit}` : s;
}

/** Ask the feed. Returns { facts, fetched_at }. Throws with a plain reason; nothing is guessed when it fails. */
export async function fetchSiteFacts({ lat, lon }, fetchImpl = globalThis.fetch, ms = 60000) {
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetchImpl(`${FEED}?feeds=site&lat=${lat}&lon=${lon}`, { headers: { accept: 'application/json' }, signal: ctl.signal });
    if (!r.ok) throw new Error(`the lab's feed answered ${r.status}`);
    const site = (await r.json())?.feeds?.site;
    const facts = snapshotFacts(site);
    if (!facts.length) throw new Error('no facts came back');
    return { facts, fetched_at: new Date().toISOString() };
  } catch (e) {
    if (e?.name === 'AbortError') throw new Error('the feed took too long to answer');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
