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
