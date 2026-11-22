// address: find a New Zealand street address and give back its point, so a person can set a site without knowing coordinates.
// Source: LINZ NZ Addresses (LINZ's own ArcGIS Online mirror, key-less, CC BY 4.0), checked on 22 Nov 2026.
//
// GET /api/live/?feeds=address&q=<text>     (q: 4 to 120 characters, for example "14 Ponsonby Rd, Ponsonby" or "Flat 2, 243 Ponsonby Road")
//   → feeds.address = { id:"address", value:<number of matches>, values:{ matches:[{ id, address, suburb, town, council, lat, lon, unit }], more }, source, licence, note, ... }
//   Up to 8 matches, best first. Only addresses LINZ marks "Current" (the layer also holds "Proposed" ones, which are not built yet).
//
// What happens to the text: it is turned into a short list of letters, digits, spaces and apostrophes (so nothing in it can change the
// query), then asked of LINZ's public service in the query string. It is not logged, not kept in memory between requests and not
// stored. The edge cache in front of the function keeps an answer under its address for five minutes, as it does for the site feed.
// The address owner's name is not in this dataset; it holds only the address, its suburb, town and council, and a point.
//
// The service is fast on its number and road fields and slow on a leading wildcard, so the question is built from those:
//   address_number (and suffix, unit) exactly, the road name from its start, and every other word anywhere in the address.
import { getJSON, memo, round } from "./util.js";

const LINZ = "https://services.arcgis.com/xdsHIIxuCWByZiCB/arcgis/rest/services";
const SVC = `${LINZ}/LINZ_NZ_Addresses/FeatureServer/0`;
export const L_ADDR = { name: "CC BY 4.0", url: "https://www.linz.govt.nz/products-services/data/licensing-and-using-data/attributing-linz-data", attribution: "Sourced from the LINZ Data Service and licensed for reuse under the CC BY 4.0 licence." };
const SOURCE = { name: "LINZ Data Service, NZ Addresses (via LINZ's ArcGIS service)", url: "https://data.linz.govt.nz/layer/123113-nz-addresses/", service: SVC, layer: "LINZ NZ Addresses" };
export const MIN_Q = 4, MAX_Q = 120, MAX_MATCHES = 8, FETCH_N = 40;
const FIELDS = "address_id,full_address,unit,suburb_locality,town_city,territorial_authority,address_number,address_number_suffix,full_road_name_ascii,full_address_ascii";

// Abbreviations people type. Each maps to the words LINZ spells out. "st" is a street unless it opens the road name (St Heliers).
const ABBR = { st: ["street"], rd: ["road"], ave: ["avenue"], av: ["avenue"], pl: ["place"], cres: ["crescent"], tce: ["terrace"], ter: ["terrace"], dr: ["drive"], hwy: ["highway"], cl: ["close"], ct: ["court"],
  ln: ["lane"], pde: ["parade"], esp: ["esplanade"], blvd: ["boulevard"], sq: ["square"], gr: ["grove"], hts: ["heights"], pk: ["park"], cct: ["circuit"], rdg: ["ridge"], wy: ["way"], tr: ["track"] };
const ABBR_FIRST = { st: ["st", "saint"], mt: ["mount", "mt"], pt: ["point", "pt"], nth: ["north"], sth: ["south"] };
const UNIT_WORDS = "flat|unit|apt|apartment|suite|shop|room|lot";

/** lower case, no macrons or other accents, nothing but letters, digits, spaces, "/", "-" and apostrophes */
export function normaliseQuery(q) {
  return String(q ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[‘’ʼ]/g, "'").toLowerCase()
    .replace(/[^a-z0-9'/\- ]+/g, " ").replace(/\s+/g, " ").trim();
}

/** Take the text apart: unit, street number (and its letter), and the words that follow. Returns null when there is no street word. */
export function parseAddressQuery(q) {
  let s = normaliseQuery(q), unit = null, number = null, suffix = null;
  let m;
  if ((m = s.match(new RegExp(`^(?:${UNIT_WORDS})\\s*([0-9]{1,4}[a-z]?|[a-z])[\\s/-]+(\\d{1,5})([a-z])?(?:-\\d{1,5})?(?=\\s|$)\\s*(.*)$`)))) { unit = m[1]; number = m[2]; suffix = m[3] || null; s = m[4]; }
  else if ((m = s.match(/^([0-9]{1,4}[a-z]?)\s*\/\s*(\d{1,5})([a-z])?(?:-\d{1,5})?(?=\s|$)\s*(.*)$/))) { unit = m[1]; number = m[2]; suffix = m[3] || null; s = m[4]; }
  else if ((m = s.match(/^(\d{1,5})([a-z])?(?:-\d{1,5})?(?=\s|$)\s*(.*)$/))) { number = m[1]; suffix = m[2] || null; s = m[3]; }
  const words = s.replace(/-/g, " ").split(" ").filter(Boolean);
  if (!words.some((w) => w.replace(/[^a-z]/g, "").length >= 2)) return null;
  return { unit, number: number == null ? null : +number, suffix, words };
}


const lit = (s) => `'${s.replace(/'/g, "''")}'`;
const like = (col, s, mode) => `UPPER(${col}) LIKE ${lit((mode === "start" ? "" : "%") + s.toUpperCase() + "%")}`;
const any = (list) => (list.length > 1 ? `(${list.join(" OR ")})` : list[0]);

/** The WHERE clause for a parsed query. Every value in it is a word of letters, digits and apostrophes, or a number. */
export function buildWhere(p) {
  const c = ["address_lifecycle = 'Current'"];
  if (p.number != null) c.push(`address_number = ${Math.trunc(p.number)}`);
  if (p.suffix) c.push(`UPPER(address_number_suffix) = ${lit(p.suffix.toUpperCase())}`);
  if (p.unit) c.push(`UPPER(unit) = ${lit(p.unit.toUpperCase())}`);
  p.words.forEach((w, i) => {
    if (i === 0) { // an abbreviation opening the road name is a whole word ("St " not "Stanley"); anything else may still be being typed
      const a = ABBR_FIRST[w]; c.push(any((a ? a.map((x) => like("full_road_name_ascii", x + " ", "start")) : [like("full_road_name_ascii", w, "start")]))); return; }
    if (w.length < 2 && !/^\d$/.test(w)) return;
    const a = ABBR[w] ? [...ABBR[w], ...(w.length > 2 ? [w] : [])] : [w];
    c.push(any(a.map((x) => like("full_address_ascii", x, "any"))));
  });
  return c.join(" AND ");
}

export function addressUrl(where, n = FETCH_N) {
  const p = new URLSearchParams({ where, outFields: FIELDS, returnGeometry: "true", outSR: "4326", resultRecordCount: String(n), f: "json" });
  return `${SVC}/query?${p}`;
}

const lc = (s) => normaliseQuery(s);
/** How well a record answers the parsed query: higher is better. Exact number and street first, then the other words, then the shorter address. */
export function scoreMatch(a, p, typed) {
  const full = lc(a.full_address_ascii), road = lc(a.full_road_name_ascii), suburb = lc(a.suburb_locality), words = full.replace(/[,/]/g, " ").split(" ");
  let s = 0;
  const flat = full.replace(/\s+/g, " ");
  if (flat.replace(/,/g, "").startsWith(typed.replace(/,/g, ""))) s += 100; // what was typed is how the address opens
  if (p.number != null && a.address_number === p.number) {
    s += 20;
    if (p.unit) s += lc(a.unit) === p.unit ? 30 : -30;
    else s += a.unit ? 0 : 15; // asked for a house, the house itself first, then its flats
    if (p.suffix ? lc(a.address_number_suffix) === p.suffix : !a.address_number_suffix) s += 5;
  }
  p.words.forEach((w, i) => {
    const forms = (i === 0 ? ABBR_FIRST[w] : ABBR[w]) || [w];
    if (i === 0) s += forms.some((x) => road.startsWith(x)) ? 20 : 0;
    if (i > 0 && forms.some((x) => suburb.startsWith(x))) s += 3; // a word that opens the suburb ("Auckland" in Auckland Central) beats one that only matches the town
    s += forms.some((x) => words.includes(x)) ? 8 : forms.some((x) => words.some((t) => t.startsWith(x))) ? 4 : forms.some((x) => full.includes(x)) ? 1 : 0;
  });
  return s - full.length / 1000;
}

export function parseMatches(j, p, typed) {
  const rows = (j.features || []).filter((f) => f.attributes && f.geometry && isFinite(f.geometry.x) && isFinite(f.geometry.y));
  const ranked = rows.map((f) => ({ f, score: scoreMatch(f.attributes, p, typed) })).sort((x, y) => y.score - x.score || String(x.f.attributes.full_address).localeCompare(String(y.f.attributes.full_address)));
  return ranked.slice(0, MAX_MATCHES).map(({ f }) => { const a = f.attributes; return { id: a.address_id, address: a.full_address, suburb: a.suburb_locality ?? null, town: a.town_city ?? null, council: a.territorial_authority ?? null,
    unit: a.unit ?? null, lat: round(f.geometry.y, 6), lon: round(f.geometry.x, 6) }; });
}

const day = (ms) => (ms == null || !isFinite(ms) ? null : new Date(+ms).toISOString().slice(0, 10));
const layerDate = () => memo("addrmeta", 24 * 3600e3, () => getJSON(`${SVC}?f=json`, { ms: 5000 }).then((m) => day(m.editingInfo?.dataLastEditDate) || null)).catch(() => null);

export async function fetchAddress(params = {}) {
  const raw = String(params.q ?? "").trim();
  if (raw.length < MIN_Q) throw new Error(`Type at least ${MIN_Q} characters of the address, for example 14 Ponsonby Road.`);
  if (raw.length > MAX_Q) throw new Error(`That is too long for an address: ${MAX_Q} characters at most.`);
  const p = parseAddressQuery(raw);
  if (!p) throw new Error("Add the street name after the number, for example 14 Ponsonby Road.");
  let j;
  try { j = await getJSON(addressUrl(buildWhere(p)), { ms: 8000 }); }
  catch (e) { throw new Error("The LINZ address service did not answer just now. Try again in a minute, or enter the site as coordinates instead."); }
  if (j.error) throw new Error("The LINZ address service could not run that search. Try fewer words, or enter the site as coordinates instead.");
  const matches = parseMatches(j, p, normaliseQuery(raw)), asOf = await layerDate();
  return {
    id: "address", label: "Street address", value: matches.length, unit: matches.length === 1 ? "match" : "matches",
    values: { matches, more: !!j.exceededTransferLimit || (j.features || []).length > MAX_MATCHES, current: true },
    asOf, period: asOf || "now", fetchedAt: new Date().toISOString(), cadence: "5-min", source: SOURCE, licence: L_ADDR, truth: "Live", truthLabel: "Live", status: "live",
    note: "Addresses are LINZ's authoritative NZ Addresses (current ones only). The point is where LINZ places the address, which is usually at the building or the entrance, not on the boundary. A fact to read: it does not say who owns the land or what can be built on it.",
  };
}
