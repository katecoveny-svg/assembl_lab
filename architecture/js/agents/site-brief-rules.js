// The site agent's rules (roster: "site context"), with no page in them, so they are tested on their own.
//
// One job: bring everything already known about a project's site together into one cited site brief (assembl.site-brief.v1)
// and hand it to the 3D page. It reads what other agents and feeds have already found; it never decides anything about the site.
//   - the drawing set as intake read it (sheet number, title, scale), and the site plan sheets' own printed words (free, text first):
//     existing buildings, future stages, parking, levels (RL / FFL), boundary notes. A model reads a site plan picture only when a
//     person says go (site-brief.js, a paid step): north, outlines of the labelled buildings, the boundary, parking, future stages
//   - the project's saved site facts snapshot (parcel, zone, overlays, flood, landslide, liquefaction), as kept
//   - LINZ: the parcel outline, building outlines, which 1 m LiDAR survey covers the point (DEM and DSM), the address as kept
//   - live: weather now and today's forecast (Open-Meteo through /api/live), the sun at the site now and at golden hour (computed
//     here), nearby Auckland Transport stops from the GTFS file the lab already bakes (Auckland only), at-live if it answers
//   - the project's model: element counts by class, storeys, existing buildings modelled in it, fly-through path and shots
//
// Every item: { id, group, name, value, unit, source, date, licence, label, sheet?, how?, note? }
//   label is one of read | measured | live | assumed | proposed. how (drawings only) is written | read | scaled.
//   A thing that is not known is never given a value: it is listed in gaps as "not connected", "no survey" and the like.
// Nothing here is a planning, hazard or Building Code assessment. Agents prepare, people approve.

export const TYPE = 'assembl.site-brief.v1';
export const RULES = 'site-brief-rules 2026-11-23';
export const LABELS = ['read', 'measured', 'live', 'assumed', 'proposed'];
export const HOWS = ['written', 'read', 'scaled'];
export const GROUPS = [
  { id: 'drawings', word: 'Drawings' }, { id: 'site', word: 'Site facts' }, { id: 'linz', word: 'LINZ' },
  { id: 'live', word: 'Live' }, { id: 'transport', word: 'Transport' }, { id: 'model', word: 'Model' },
];
export const PAID_CAP = 6;   // site plan reads a person may approve in one brief (testing cap)

const LINZ_CC = { name: 'CC BY 4.0', attribution: 'Sourced from the LINZ Data Service and licensed for reuse under CC BY 4.0.', url: 'https://www.linz.govt.nz/products-services/data/licensing-and-using-data/attributing-linz-data' };
const OM = { name: 'Open-Meteo data CC BY 4.0; free API for non-commercial use only', attribution: 'Weather data by Open-Meteo.com (CC BY 4.0).', url: 'https://open-meteo.com/en/terms' };
const AT_CC = { name: 'CC BY 4.0', attribution: 'Contains Auckland Transport data, CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' };
const DRAWINGS = { name: "The architect's drawings: the practice's own, not for publishing", attribution: '', url: '' };
const OWN = { name: 'This project’s own records', attribution: '', url: '' };
const COMPUTED = { name: 'Computed here (no licence needed)', attribution: '', url: '' };

const str = (v, n = 200) => (v == null ? '' : String(v)).slice(0, n);
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const r1 = (v, d = 1) => (num(v) == null ? null : +v.toFixed(d));

/** one brief item. Throws on a label or how the contract does not have, so a bad item never reaches the 3D page. */
export function item(o) {
  const it = {
    id: str(o.id, 80), group: str(o.group, 20), name: str(o.name, 120), value: o.value ?? null, unit: str(o.unit, 20),
    source: str(o.source, 240), date: o.date == null ? null : str(o.date, 40), licence: str(o.licence?.name ?? o.licence, 160), label: o.label,
    ...(o.sheet ? { sheet: str(o.sheet, 24) } : {}), ...(o.how ? { how: o.how } : {}), ...(o.note ? { note: str(o.note, 300) } : {}),
  };
  if (!LABELS.includes(it.label)) throw new Error(`${it.id}: label must be one of ${LABELS.join(', ')}`);
  if (it.how && !HOWS.includes(it.how)) throw new Error(`${it.id}: how must be one of ${HOWS.join(', ')}`);
  if (!GROUPS.some((g) => g.id === it.group)) throw new Error(`${it.id}: no such group`);
  return it;
}
const short = (t, n = 90) => { const s = String(t ?? '').split(/(?<=[.:;])\s/)[0].replace(/[.:;]$/, ''); return s.length > n ? `${s.slice(0, n - 1)}…` : s; };
const gap = (what, why, group) => ({ what: str(what, 120), why: str(why, 240), group });

// ---- the sun (suncalc's formulae, the same as the 3D page's App.sunDir) ----------------------------------------------------------------
const RAD = Math.PI / 180;
/** the sun at a UTC instant over a point: { alt, az } in degrees, az from north, clockwise */
export function sunAt(lat, lng, date) {
  const d = date.valueOf() / 86400000 - 0.5 + 2440588 - 2451545;
  const M = RAD * (357.5291 + 0.98560028 * d);
  const C = RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const L = M + C + RAD * 102.9372 + Math.PI, e = RAD * 23.4397;
  const dec = Math.asin(Math.sin(e) * Math.sin(L)), ra = Math.atan2(Math.sin(L) * Math.cos(e), Math.cos(L));
  const H = RAD * (280.16 + 360.9856235 * d) - RAD * -lng - ra, phi = RAD * lat;
  const alt = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi));
  return { alt: alt / RAD, az: (((az / RAD + 180) % 360) + 360) % 360 };
}
/** NZ clock time for an instant, "h:mm am" */
export function nzClock(date) {
  return new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', hour: 'numeric', minute: '2-digit', hour12: true }).format(date).replace(/\s+/g, ' ').toLowerCase();
}
/** the evening golden hour on the NZ day of `date`: from when the sun sinks below 6° to sunset (-0.83°), searched minute by minute */
export function goldenHour(lat, lng, date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit', }).formatToParts(date).map((x) => [x.type, x.value]));
  const t0 = Date.UTC(+p.year, +p.month - 1, +p.day);   // UTC midnight of the NZ date; the NZ day lies within 14 h before to 36 h after
  const local = (ms) => +new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', day: '2-digit' }).format(new Date(ms));
  let start = null, end = null;
  for (let ms = t0 - 14 * 3600e3; ms < t0 + 36 * 3600e3; ms += 60e3) {
    if (local(ms) !== +p.day) continue;
    const a = sunAt(lat, lng, new Date(ms)).alt, b = sunAt(lat, lng, new Date(ms + 60e3)).alt;
    if (b < a) { if (start == null && a >= 6 && b < 6) start = ms + 60e3; if (end == null && a >= -0.833 && b < -0.833) { end = ms + 60e3; break; } }
  }
  if (start == null || end == null) return null;
  const mid = new Date((start + end) / 2), s = sunAt(lat, lng, mid);
  return { from: new Date(start).toISOString(), to: new Date(end).toISOString(), at: mid.toISOString(), alt: r1(s.alt), az: r1(s.az, 0) };
}

// ---- distances on the ground ---------------------------------------------------------------------------------------------------------
/** metres east and north of `o` (a small-area tangent plane: good to well under a metre across a site) */
export function toEN(o, lat, lng) { const k = 6371008.8 * RAD; return [(lng - o.lng) * k * Math.cos(o.lat * RAD), (lat - o.lat) * k]; }
export function fromEN(o, e, n) { const k = 6371008.8 * RAD; return { lat: o.lat + n / k, lng: o.lng + e / (k * Math.cos(o.lat * RAD)) }; }
export const metres = (o, lat, lng) => Math.hypot(...toEN(o, lat, lng));
const centroid = (pts) => { const n = pts.length || 1; return pts.reduce((a, p) => [a[0] + p[0] / n, a[1] + p[1] / n], [0, 0]); };

// ---- the drawing set: which sheets are about the site, and what their own words say ------------------------------------------------------
const SITE_TITLE = /\b(site|location|locality|block|context|existing|survey|lot|parcel|staging|landscape|external works)\b.*\b(plan|layout|context|analysis|survey)\b|\bsite\b/i;
/** the intake sheets that are about the site (by printed title), in set order */
export function siteSheets(sheets) { return (sheets ?? []).filter((s) => s?.title && SITE_TITLE.test(s.title)); }

/** a scale's denominator from printed text ("1:200 @ A1" → 200), or null; NTS and "as shown" give null */
export function scaleDenom(t) { const m = String(t ?? '').match(/1\s*:\s*(\d{1,5})/); return m ? +m[1] : null; }
/** metres per pixel for a sheet picture: the paper's width in mm, the printed scale, the picture's width in pixels */
export function metresPerPixel(sheet, imgW) {
  const d = scaleDenom(sheet?.scale), w = num(sheet?.w_mm);
  if (!d || !w || !(imgW > 0)) return null;
  return (w / 1000) * d / imgW;
}

const LEVEL = /\b(F\.?F\.?L|FGL|RL|SSL|TOS|GL|NGL)\b\.?\s*[:=]?\s*(-?\d{1,4}(?:\.\d{1,3})?)\s*(m\b)?/gi;
const EXISTING = /\b(EXISTING|EX\.?)\s+([A-Z][A-Z0-9 '’&/-]{2,40})/gi;
const FUTURE = /\b(FUTURE|PROPOSED FUTURE|STAGE\s+\d+[A-Z]?)\b[ :-]*([A-Z0-9 '’&/-]{0,40})/gi;
const PARKING = /\b(\d{1,4})\s*(?:NO\.?\s*)?(?:CAR\s*PARKS?|CARPARKS?|PARKING\s+(?:SPACES|BAYS)|CAR\s+SPACES|SPACES)\b|\b(CAR\s*PARK(?:ING)?|CARPARK|PARKING)\b/gi;
const BOUNDARY = /\b(BOUNDARY|LOT\s+\d+\s+DP\s+\d+|SITE AREA\s*[:=]?\s*[\d,.]+\s*(?:m²|m2|sqm|ha))/gi;
const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

/**
 * What a site plan sheet's own printed words say (pdf.js text items, as intake reads them): free, no model.
 * page: { items: [{ s, x, y, w, h }] }. Returns { existing: [{ name, x, y }], future: [...], parking: [{ text, count, x, y }], levels: [{ kind, value, x, y }], boundary: [...] }
 * x, y: where the words sit on the sheet, in PDF points from the top left. Every entry is "written" on that sheet.
 */
export function sheetWords(page) {
  const out = { existing: [], future: [], parking: [], levels: [], boundary: [] };
  for (const it of page?.items ?? []) {
    const s = clean(it.s); if (!s) continue;
    const at = { x: r1(it.x, 0), y: r1(it.y, 0) };
    for (const m of s.matchAll(LEVEL)) out.levels.push({ kind: m[1].toUpperCase().replace(/\./g, ''), value: +m[2], text: clean(m[0]), ...at });
    for (const m of s.matchAll(EXISTING)) { const name = clean(`${m[1].toUpperCase().startsWith('EX') && m[1].length <= 3 ? 'Existing' : m[1]} ${m[2]}`).replace(/\s+(TO BE|REMOVED|RETAINED).*$/i, (x) => x); out.existing.push({ name: title(name), ...at }); }
    for (const m of s.matchAll(FUTURE)) { const t = clean(m[0]); if (t.length > 3) out.future.push({ name: title(t), ...at }); }
    for (const m of s.matchAll(PARKING)) out.parking.push({ text: clean(m[0]), count: m[1] ? +m[1] : null, ...at });
    for (const m of s.matchAll(BOUNDARY)) out.boundary.push({ text: clean(m[0]), ...at });
  }
  const uniq = (l, k) => { const seen = new Set(); return l.filter((x) => { const key = k(x); if (seen.has(key)) return false; seen.add(key); return true; }); };
  out.existing = uniq(out.existing, (x) => x.name.toLowerCase());
  out.future = uniq(out.future, (x) => x.name.toLowerCase());
  out.levels = uniq(out.levels, (x) => `${x.kind}${x.value}`);
  out.parking = uniq(out.parking, (x) => x.text.toLowerCase());
  out.boundary = uniq(out.boundary, (x) => x.text.toLowerCase());
  return out;
}
const title = (s) => s.toLowerCase().replace(/(^|\s)([a-zāēīōū])/g, (m, a, b) => a + b.toUpperCase()).replace(/\bRl\b/g, 'RL').replace(/\bFfl\b/g, 'FFL');

// ---- a model's read of a site plan picture (/api/plan-read mode "sitebrief") --------------------------------------------------------------
/** '' when a sitebrief read has the contract's shape, else what is wrong (the server validates too; this guards the page) */
export function readProblem(r) {
  if (!r || typeof r !== 'object') return 'not a read';
  if (!(r.north_deg === null || num(r.north_deg) != null)) return 'north_deg';
  for (const k of ['existing', 'future', 'parking', 'levels']) if (!Array.isArray(r[k])) return k;
  if (!Array.isArray(r.boundary)) return 'boundary';
  if (r.existing.some((b) => typeof b.label !== 'string' || !Array.isArray(b.points))) return 'existing[]';
  return '';
}

/**
 * Put a site plan read onto the ground. With the sheet's metres per pixel and the north the read found, a pixel offset becomes metres
 * east and north. The drawn boundary's centre is laid on the LINZ parcel's centre: that alignment is assumed (said so on every place
 * that uses it), and how far the two outlines then differ is measured and returned (fit_m), so a person can see whether to trust it.
 * Returns null when the read lacks a north, a scale or a boundary, or there is no parcel.
 */
export function registerRead(read, mPerPx, parcelRing, origin) {
  if (!read || num(read.north_deg) == null || !(mPerPx > 0) || !(read.boundary?.length >= 3) || !(parcelRing?.length >= 3) || !origin) return null;
  const th = read.north_deg * RAD, north = [Math.sin(th), Math.cos(th)], east = [Math.cos(th), -Math.sin(th)];
  const bc = centroid(read.boundary.map((p) => [p.x, p.y]));
  const parcel = parcelRing.map(([lat, lng]) => toEN(origin, lat, lng)), pc = centroid(parcel);
  const toEn = (p) => { const d = [p.x - bc[0], -(p.y - bc[1])]; return [pc[0] + mPerPx * (d[0] * east[0] + d[1] * east[1]), pc[1] + mPerPx * (d[0] * north[0] + d[1] * north[1])]; };
  // how well the drawn boundary sits on the parcel: the mean distance from each drawn corner to the nearest parcel corner
  const drawn = read.boundary.map(toEn);
  const fit = drawn.reduce((s, q) => s + Math.min(...parcel.map((c) => Math.hypot(c[0] - q[0], c[1] - q[1]))), 0) / drawn.length;
  return { toEn, fit_m: r1(fit), area_drawn_m2: r1(Math.abs(shoelace(drawn)), 0), area_parcel_m2: r1(Math.abs(shoelace(parcel)), 0) };
}
const shoelace = (p) => p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]; return s + (a[0] * b[1] - b[0] * a[1]) / 2; }, 0);

/**
 * Name the LINZ outlines from the site plan: each labelled existing building (its outline's centre on the ground) is matched to the
 * nearest LINZ outline whose centre is within `within` metres, one to one. Returns outlines with { name, name_from, matched_m }.
 * outlines: [{ id, name, use, ring: [[lat, lng]] }]; labelled: [{ label, en: [e, n] }] (metres from origin).
 */
export function nameOutlines(outlines, labelled, origin, within = 8) {
  const cs = outlines.map((o) => centroid(o.ring.map(([la, ln]) => toEN(origin, la, ln))));
  const pairs = [];
  labelled.forEach((l, i) => cs.forEach((c, j) => { const d = Math.hypot(c[0] - l.en[0], c[1] - l.en[1]); if (d <= within) pairs.push({ i, j, d }); }));
  pairs.sort((a, b) => a.d - b.d);
  const li = new Set(), oj = new Map();
  for (const p of pairs) if (!li.has(p.i) && !oj.has(p.j)) { li.add(p.i); oj.set(p.j, p); }
  return outlines.map((o, j) => {
    const p = oj.get(j), c = fromEN(origin, cs[j][0], cs[j][1]);
    if (p) return { ...o, centre: c, name: labelled[p.i].label, name_from: labelled[p.i].sheet ? `site plan ${labelled[p.i].sheet}` : 'site plan', matched_m: r1(p.d) };
    return { ...o, centre: c, name: o.name || (o.use ? `Existing ${o.use.toLowerCase()}` : 'Existing building'), name_from: o.name ? 'LINZ' : o.use ? 'LINZ use' : 'none', matched_m: null };
  });
}

// ---- LINZ building outlines (the same public service the 3D page reads) ------------------------------------------------------------------
export const OUTLINES = 'https://services.arcgis.com/xdsHIIxuCWByZiCB/arcgis/rest/services/LINZ_NZ_Building_Outlines/FeatureServer/0';
export function outlinesQuery(lat, lng, radiusM = 120) {
  const p = new URLSearchParams({ geometry: `${lng},${lat}`, geometryType: 'esriGeometryPoint', inSR: '4326', distance: String(radiusM), units: 'esriSRUnit_Meter', spatialRel: 'esriSpatialRelIntersects', outFields: 'building_id,name,use_,last_modified', outSR: '4326', returnGeometry: 'true', f: 'json', resultRecordCount: '200' });
  return `${OUTLINES}/query?${p}`;
}
/** LINZ's answer as [{ id, name, use, ring: [[lat, lng]] }] (the outer ring only) */
export function parseOutlines(j) {
  if (j?.error) throw new Error(`LINZ building outlines: ${j.error.message || 'query error'}`);
  return (j?.features ?? []).filter((f) => f.geometry?.rings?.[0]?.length >= 3).map((f) => ({ id: String(f.attributes?.building_id ?? ''), name: f.attributes?.name || null, use: f.attributes?.use_ && f.attributes.use_ !== 'Unknown' ? String(f.attributes.use_) : null, ring: f.geometry.rings[0].map(([x, y]) => [r1(y, 7), r1(x, 7)]) }));
}

// ---- Auckland Transport stops near the point (the lab's baked GTFS: auckland/live/data/stops.json, routes.json) ---------------------------
const AKL = { lat0: -37.45, lat1: -36.1, lng0: 174.15, lng1: 175.6 };
export const inAuckland = (p) => !!p && p.lat >= AKL.lat0 && p.lat <= AKL.lat1 && p.lng >= AKL.lng0 && p.lng <= AKL.lng1;
const MODE = { 0: 'tram', 1: 'train', 2: 'train', 3: 'bus', 4: 'ferry', 700: 'bus', 712: 'bus', 1000: 'ferry' };
/** the nearest stops (stations first count once; their platforms are folded in), within maxM metres, nearest first */
export function nearStops(stopsJson, routesJson, p, { n = 5, maxM = 800 } = {}) {
  const rows = stopsJson?.stops ?? [], routes = routesJson?.routes ?? [], out = [];
  for (const s of rows) {
    if (s[6] >= 0) continue;   // a platform: its station stands for it
    const d = metres(p, s[3], s[4]); if (d > maxM) continue;
    const rs = (s[7] ?? []).map((i) => routes[i]).filter(Boolean);
    out.push({ id: String(s[0]), code: String(s[1] ?? ''), name: String(s[2] ?? ''), lat: s[3], lng: s[4], m: Math.round(d), routes: [...new Set(rs.map((r) => r.short))].slice(0, 12), modes: [...new Set(rs.map((r) => MODE[r.type] ?? 'bus'))] });
  }
  // a station's platforms carry its routes
  for (const s of out) if (!s.routes.length) { const kids = rows.filter((k) => k[6] >= 0 && String(rows[k[6]]?.[0]) === s.id); const rs = kids.flatMap((k) => (k[7] ?? []).map((i) => routes[i])).filter(Boolean); s.routes = [...new Set(rs.map((r) => r.short))].slice(0, 12); s.modes = [...new Set(rs.map((r) => MODE[r.type] ?? 'bus'))]; }
  return out.sort((a, b) => a.m - b.m).slice(0, n);
}

// ---- the model ---------------------------------------------------------------------------------------------------------------------
/** what the project's model says: from a plan model (the sample) or a kept IFC summary. { counts: {class: n}, storeys, existing, from } */
export function modelFacts({ plan, ifc } = {}) {
  if (plan?.buildings) {
    const c = { walls: 0, partitions: 0, openings: 0, rooms: 0, decks: 0 }; let storeys = 0;
    for (const b of plan.buildings) { storeys = Math.max(storeys, b.levels?.length ?? 0); for (const L of b.levels ?? []) { c.walls += L.walls?.length ?? 0; c.partitions += L.partitions?.length ?? 0; c.openings += L.openings?.length ?? 0; c.rooms += L.rooms?.length ?? 0; c.decks += L.decks?.length ?? 0; } }
    const existing = plan.buildings.filter((b) => /existing/i.test(`${b.status ?? ''} ${b.name ?? ''}`)).length;
    return { counts: Object.fromEntries(Object.entries(c).filter(([, v]) => v)), storeys, buildings: plan.buildings.length, existing, from: 'the plan model' };
  }
  if (ifc?.classes) return { counts: { ...ifc.classes }, storeys: ifc.storey_count ?? ifc.storeys?.length ?? 0, buildings: ifc.buildings ?? null, existing: null, from: 'the IFC file' };
  return null;
}

// ---- the brief ---------------------------------------------------------------------------------------------------------------------------
/**
 * Build the brief from what was gathered. Every input is optional; what is missing becomes a gap, never a value.
 *   project:  { id, site: { lat, lon, facts, fetched_at, address }, site_sources, sample }
 *   intake:   project.intake (sheets)            words: { [sheetId]: sheetWords(page) }      reads: { [sheetId]: { read, provider, model, at, mPerPx } }
 *   parcel:   { ring: [[lat, lng]], id, area_m2, asOf } | { error }        outlines: [{ id, name, use, ring }] | { error }
 *   lidar:    { dem: { survey, captured, licence } | { error|none }, dsm: ... }
 *   weather:  the /api/live site.weather fact (values) | { error }          forecast: weather feed values | null
 *   stops:    [{...}] | { error } | null (not Auckland)                       atLive: 'on' | 'off'
 *   model:    modelFacts(...)        flight: { shots, version, status } | null       cameraPath: site_sources.camera_path
 *   planSite: the sample plan model's site (features, north, ffl) when the drawings are the sample
 *   now:      Date
 */
export function buildBrief(g, { now = new Date(), by = 'site agent' } = {}) {
  const items = [], gaps = [], scene = { existing: [], boundary: [], features: [], sun: null, weather: null };
  const add = (o) => items.push(item(o));
  const p = g.project ?? {}, site = p.site ?? {};
  const pt = num(site.lat) != null && num(site.lon) != null ? { lat: site.lat, lng: site.lon } : (g.point ?? null);
  const today = now.toISOString().slice(0, 10);
  const point = pt ? { lat: pt.lat, lng: pt.lng, source: site.address ? 'the project’s chosen address (LINZ NZ Addresses)' : 'the project’s site point' } : null;
  if (!point) gaps.push(gap('Site point', 'not set: give the project a site point or address on the Site tab', 'site'));

  // -- drawings
  const sheets = g.intake?.sheets ?? [], ss = siteSheets(sheets);
  if (!sheets.length && !g.planSite) gaps.push(gap('Drawing set', 'not dropped: drop the drawing set in Intake', 'drawings'));
  if (sheets.length) add({ id: 'drawings.sheets', group: 'drawings', name: 'Sheets in the set', value: sheets.length, unit: 'sheets', source: 'Intake: the set’s own title blocks', date: g.intake?.updated_at?.slice(0, 10) ?? null, licence: DRAWINGS, label: 'read', how: 'read' });
  if (sheets.length && !ss.length) gaps.push(gap('Site plan', 'no sheet in the set is titled as a site plan', 'drawings'));
  for (const s of ss) {
    const num_ = s.number || s.id;
    add({ id: `drawings.sheet.${num_}`, group: 'drawings', name: s.title, value: s.scale || 'scale not printed', source: `Title block, ${s.file?.split('/').pop() ?? 'set'} page ${s.page}`, date: s.date_iso ?? s.date ?? null, licence: DRAWINGS, label: 'read', how: s.from === 'model' ? 'read' : 'written', sheet: num_, note: s.from === 'model' ? 'Read by a model from a picture of the sheet: check it.' : '' });
    const w = g.words?.[s.id];
    if (w) {
      for (const e of w.existing) add({ id: `drawings.existing.${num_}.${e.name}`, group: 'drawings', name: e.name, value: 'existing, labelled', source: `Printed on ${num_}`, date: s.date_iso ?? null, licence: DRAWINGS, label: 'read', how: 'written', sheet: num_ });
      for (const f of w.future) add({ id: `drawings.future.${num_}.${f.name}`, group: 'drawings', name: f.name, value: 'future stage, labelled', source: `Printed on ${num_}`, date: s.date_iso ?? null, licence: DRAWINGS, label: 'read', how: 'written', sheet: num_ });
      for (const k of w.parking) add({ id: `drawings.parking.${num_}.${k.text}`, group: 'drawings', name: 'Parking', value: k.count ?? k.text, unit: k.count ? 'spaces' : '', source: `Printed on ${num_}: “${k.text}”`, date: s.date_iso ?? null, licence: DRAWINGS, label: 'read', how: 'written', sheet: num_ });
      for (const L of w.levels) add({ id: `drawings.level.${num_}.${L.kind}${L.value}`, group: 'drawings', name: L.kind === 'FFL' ? 'Floor level' : `Level (${L.kind})`, value: L.value, unit: 'm', source: `Printed on ${num_}: “${L.text}”`, date: s.date_iso ?? null, licence: DRAWINGS, label: 'read', how: 'written', sheet: num_, note: 'A drawing level may be on a site datum, not NZVD2016: compare before using it with LiDAR heights.' });
      for (const b of w.boundary) add({ id: `drawings.boundary.${num_}.${b.text}`, group: 'drawings', name: 'Boundary note', value: b.text, source: `Printed on ${num_}`, date: s.date_iso ?? null, licence: DRAWINGS, label: 'read', how: 'written', sheet: num_ });
    } else if (s.from !== 'model') gaps.push(gap(`${num_} words`, 'the sheet’s own text was not read yet: run the site agent with the drawing set kept', 'drawings'));
    const rd = g.reads?.[s.id];
    if (rd?.read && !readProblem(rd.read)) {
      const R = rd.read, src = `${num_} read by ${rd.provider ?? 'a model'}${rd.model ? ` (${rd.model})` : ''}`, date = rd.at?.slice(0, 10) ?? today;
      if (num(R.north_deg) != null) add({ id: `drawings.north.${num_}`, group: 'drawings', name: 'North point', value: r1(R.north_deg, 0), unit: '° from up', source: src, date, licence: DRAWINGS, label: 'read', how: 'read', sheet: num_ });
      else gaps.push(gap(`${num_} north`, 'the read found no north point', 'drawings'));
      const reg = point ? registerRead(R, rd.mPerPx, g.parcel?.ring, point) : null;
      for (const [i, b] of R.existing.entries()) {
        const sz = rd.mPerPx && b.points?.length >= 3 ? r1(Math.abs(shoelace(b.points.map((q) => [q.x * rd.mPerPx, q.y * rd.mPerPx]))), 0) : null;
        add({ id: `drawings.existing.read.${num_}.${i}`, group: 'drawings', name: b.label || 'Existing building', value: sz ?? 'outlined', unit: sz ? 'm² on the sheet' : '', source: src, date, licence: DRAWINGS, label: sz ? 'measured' : 'read', how: sz ? 'scaled' : 'read', sheet: num_, note: sz ? `Scaled at ${s.scale}; the sheet’s scale and paper size assumed exact.` : '' });
        if (reg && b.points?.length >= 3) scene.existing.push({ label: b.label || 'Existing building', sheet: num_, en: centroid(b.points.map(reg.toEn)), from: 'site plan' });
      }
      for (const [i, f] of R.future.entries()) {
        add({ id: `drawings.future.read.${num_}.${i}`, group: 'drawings', name: f.label || 'Future stage', value: 'outlined', source: src, date, licence: DRAWINGS, label: 'proposed', how: 'read', sheet: num_ });
        if (reg && f.points?.length >= 3) scene.boundary.push({ kind: 'future', label: f.label || 'Future stage', ring: f.points.map(reg.toEn).map(([e, n]) => { const q = fromEN(point, e, n); return [r1(q.lat, 7), r1(q.lng, 7)]; }), source: `${src}; laid on the parcel (assumed alignment)`, tag: 'proposed' });
      }
      for (const [i, k] of R.parking.entries()) add({ id: `drawings.parking.read.${num_}.${i}`, group: 'drawings', name: 'Parking', value: num(k.count) ?? 'outlined', unit: num(k.count) ? 'spaces' : '', source: src, date, licence: DRAWINGS, label: 'read', how: 'read', sheet: num_ });
      for (const [i, L] of R.levels.entries()) add({ id: `drawings.level.read.${num_}.${i}`, group: 'drawings', name: L.text || 'Level', value: num(L.value), unit: 'm', source: src, date, licence: DRAWINGS, label: 'read', how: 'read', sheet: num_ });
      if (reg) {
        add({ id: `drawings.fit.${num_}`, group: 'drawings', name: 'Site plan laid on the LINZ parcel', value: reg.fit_m, unit: 'm mean corner gap', source: `${num_} boundary against the LINZ parcel, centres aligned`, date: today, licence: COMPUTED, label: 'measured', note: `Alignment assumed (centre on centre, north from the sheet); drawn ${reg.area_drawn_m2} m², parcel ${reg.area_parcel_m2} m².` });
        scene.boundary.push({ kind: 'drawn', label: `Boundary as drawn (${num_})`, ring: R.boundary.map(reg.toEn).map(([e, n]) => { const q = fromEN(point, e, n); return [r1(q.lat, 7), r1(q.lng, 7)]; }), source: `${src}; laid on the parcel (assumed alignment)`, tag: 'assumed' });
      } else gaps.push(gap(`${num_} on the ground`, !rd.mPerPx ? 'no printed scale and paper size, so it cannot be scaled' : num(R.north_deg) == null ? 'no north point' : !g.parcel?.ring ? 'no LINZ parcel to lay it on' : 'no boundary in the read', 'drawings'));
    } else if (!rd) gaps.push(gap(`${num_} picture read`, 'not asked: a model reads the site plan picture only when a person says go (paid)', 'drawings'));
  }
  if (g.planSite) {
    const P = g.planSite, F = P.features ?? [];
    const counts = F.reduce((m, f) => ((m[f.kind] = (m[f.kind] ?? 0) + 1), m), {});
    for (const [k, n] of Object.entries(counts)) add({ id: `drawings.sample.${k}`, group: 'drawings', name: k === 'boundary' ? 'Boundary' : k[0].toUpperCase() + k.slice(1), value: n, unit: n === 1 ? 'outline' : 'outlines', source: 'The sample’s plan model (its site plan, as read)', date: null, licence: OWN, label: 'read', how: 'read' });
    if (num(P.terrain?.ffl) != null) add({ id: 'drawings.sample.ffl', group: 'drawings', name: 'Floor level', value: r1(P.terrain.ffl, 2), unit: 'm', source: 'The sample’s plan model', date: null, licence: OWN, label: 'read', how: 'read' });
    if (Array.isArray(P.north)) add({ id: 'drawings.sample.north', group: 'drawings', name: 'North', value: r1(Math.atan2(P.north[1], P.north[0]) / RAD, 0), unit: '° in the model frame', source: 'The sample’s plan model', date: null, licence: OWN, label: 'read', how: 'read' });
    for (const f of F) if (f.kind === 'boundary' || f.kind === 'parking') scene.features.push({ kind: f.kind, label: f.kind === 'boundary' ? 'Boundary' : 'Parking', pts: f.pts.map(([u, v]) => [r1(u, 2), r1(v, 2)]), open: !!f.open, source: 'the sample’s site plan', tag: 'read' });
  }

  // -- site facts, as kept
  const facts = site.facts ?? [];
  if (point && !facts.length) gaps.push(gap('Site facts', 'not looked up: press Look up on the Site tab', 'site'));
  for (const f of facts) {
    if (f.status === 'live') add({ id: f.id, group: 'site', name: f.label, value: f.value ?? 'nothing mapped at this point', unit: f.unit, source: f.source?.name ?? '', date: f.asOf ?? site.fetched_at?.slice(0, 10) ?? null, licence: f.licence?.attribution || '', label: 'read', note: `Snapshot of ${site.fetched_at?.slice(0, 10) ?? 'an earlier day'}. What the published map shows at the point, not an assessment.` });
    else if (!(f.id === 'site.elevation' && num(g.lidar?.dem?.height) != null)) gaps.push(gap(f.label, f.status === 'not-wired' ? `not connected${f.reason ? `: ${short(f.reason.replace(/^Not wired:\s*/i, ''))}` : ''}` : `no answer when it was looked up${f.reason ? ` (${short(f.reason)})` : ''}`, 'site'));
  }
  if (site.address?.address) add({ id: 'linz.address', group: 'linz', name: 'Address', value: 'chosen and kept (not shown here)', source: 'LINZ NZ Addresses, through /api/live address', date: null, licence: LINZ_CC, label: 'read', note: 'The street address stays in the project; it is not put in the brief.' });

  // -- LINZ
  if (point) {
    if (g.parcel?.ring) {
      add({ id: 'linz.parcel', group: 'linz', name: 'Parcel outline', value: num(g.parcel.area_m2) != null ? Math.round(g.parcel.area_m2) : 'outline', unit: num(g.parcel.area_m2) != null ? 'm² (LINZ calculated)' : '', source: 'LINZ NZ Primary Parcels', date: g.parcel.asOf ?? today, licence: LINZ_CC, label: 'measured', note: 'Cadastral outline for orientation: not a boundary survey.' });
      scene.boundary.push({ kind: 'parcel', label: 'Boundary · LINZ parcel', ring: g.parcel.ring, source: 'LINZ NZ Primary Parcels (CC BY 4.0)', tag: 'measured' });
    } else gaps.push(gap('LINZ parcel', g.parcel?.error ? `LINZ did not answer (${str(g.parcel.error, 80)})` : g.parcel?.none ? 'no parcel at the point' : 'not read', 'linz'));
    if (Array.isArray(g.outlines)) {
      const named = nameOutlines(g.outlines, scene.existing.map((x) => ({ label: x.label, sheet: x.sheet, en: x.en })), point);
      const fromPlan = named.filter((o) => o.name_from.startsWith('site plan')).length;
      add({ id: 'linz.outlines', group: 'linz', name: 'Building outlines nearby', value: named.length, unit: 'within 120 m', source: 'LINZ NZ Building Outlines', date: today, licence: LINZ_CC, label: 'measured', note: fromPlan ? `${fromPlan} named from the site plan (nearest outline within 8 m, alignment assumed).` : 'Named from LINZ where LINZ names them.' });
      scene.existing = named.map((o) => ({ id: o.id, label: o.name, name_from: o.name_from, matched_m: o.matched_m, centre: { lat: r1(o.centre.lat, 7), lng: r1(o.centre.lng, 7) }, ring: o.ring, tag: o.name_from.startsWith('site plan') ? 'read' : 'measured' }));
    } else { gaps.push(gap('LINZ building outlines', g.outlines?.error ? `LINZ did not answer (${str(g.outlines.error, 80)})` : 'not read', 'linz')); scene.existing = []; }
    for (const k of ['dem', 'dsm']) {
      const L = g.lidar?.[k], word = k === 'dem' ? 'LiDAR ground (1 m DEM)' : 'LiDAR surface (1 m DSM)';
      if (L?.survey && k === 'dem' && num(L.height) != null) add({ id: 'linz.height', group: 'linz', name: 'Ground height at the point', value: r1(L.height, 1), unit: 'm (NZVD2016)', source: 'LINZ 1 m LiDAR DEM, read at the point', date: L.captured ?? null, licence: { name: L.licence || 'CC BY 4.0' }, label: 'measured', note: 'A survey from the air, not a site survey.' });
      if (L?.survey) add({ id: `linz.${k}`, group: 'linz', name: word, value: L.survey, source: `LINZ elevation, ${k === 'dem' ? 'dem_1m' : 'dsm_1m'} (sheet record)`, date: L.captured ?? null, licence: { name: L.licence || 'CC BY 4.0' }, label: 'read', note: 'Heights in NZVD2016. The 3D page reads the heights themselves from LINZ.' });
      else gaps.push(gap(word, L?.error ? `LINZ did not answer (${str(L.error, 80)})` : L?.none ? 'no survey: LINZ has no 1 m cover at the point' : 'not read', 'linz'));
    }
    gaps.push(gap('Aerial imagery', 'not connected: the lab has no LINZ Basemaps key; the 3D page shows LiDAR ground, not a photo', 'linz'));
  }
  if (!(g.project?.site_sources?.files?.survey || g.hasSurvey)) gaps.push(gap('Topographic survey', 'no survey: none kept in Site and sources', 'linz'));

  // -- live
  if (point) {
    const s = sunAt(point.lat, point.lng, now), gh = goldenHour(point.lat, point.lng, now);
    add({ id: 'live.sun', group: 'live', name: 'Sun now', value: `${r1(s.alt, 0)}° up, ${r1(s.az, 0)}° from north`, source: 'Computed for the site point and this time (suncalc formulae)', date: now.toISOString(), licence: COMPUTED, label: 'live' });
    if (gh) add({ id: 'live.golden', group: 'live', name: 'Golden hour today', value: `${nzClock(new Date(gh.from))} to ${nzClock(new Date(gh.to))}`, source: 'Computed: sun from 6° to sunset', date: today, licence: COMPUTED, label: 'live' });
    scene.sun = { at: now.toISOString(), alt: r1(s.alt), az: r1(s.az, 0), golden: gh };
    const W = g.weather;
    if (W?.values) {
      const v = W.values;
      add({ id: 'live.weather', group: 'live', name: 'Weather now', value: `${r1(v.tempC, 0)} °C, wind ${r1(v.windKmh, 0)} km/h, cloud ${r1(v.cloudPct, 0)}%`, source: W.source?.name ?? 'Open-Meteo', date: v.at ?? null, licence: OM, label: 'live', note: 'Modelled for the nearest weather grid cell, not measured on site. Free tier: non-commercial use.' });
      if (v.sunrise && v.sunset) add({ id: 'live.daylight', group: 'live', name: 'Sunrise and sunset', value: `${v.sunrise.slice(11, 16)} to ${v.sunset.slice(11, 16)}`, source: W.source?.name ?? 'Open-Meteo', date: v.sunrise.slice(0, 10), licence: OM, label: 'live' });
      scene.weather = { tempC: num(v.tempC), cloudPct: num(v.cloudPct), windKmh: num(v.windKmh), windFromDeg: num(v.windFromDeg), rainMm: num(v.rainMm), at: v.at ?? null };
    } else gaps.push(gap('Weather now', W?.error ? `no answer (${str(W.error, 80)})` : 'not read', 'live'));
    const fc = g.forecast?.values?.today;
    if (fc && num(fc.maxC) != null) add({ id: 'live.forecast', group: 'live', name: 'Today’s forecast', value: `${r1(fc.minC, 0)}–${r1(fc.maxC, 0)} °C${num(fc.rainChancePct) != null ? `, ${fc.rainChancePct}% chance of rain` : ''}`, source: `${g.forecast.source?.name ?? 'Open-Meteo'} for ${g.forecast.values.place ?? 'the nearest place the feed knows'}`, date: today, licence: OM, label: 'live', note: 'The feed’s forecast is for its nearest named place, not the site point.' });
    else gaps.push(gap('Forecast', 'not connected for a point: the live feed forecasts named places only', 'live'));
    const coastal = facts.find((f) => f.id === 'site.coastalInundation');
    gaps.push(gap('Tide', coastal?.value && /inside/i.test(String(coastal.value)) ? 'not connected: the coastal layer says the site is in a storm-tide extent, and the lab has no tide feed' : 'not connected: the lab has no tide feed', 'live'));
  }

  // -- transport
  if (point && inAuckland(point)) {
    if (Array.isArray(g.stops)) {
      if (g.stops.length) {
        for (const s of g.stops) add({ id: `transport.stop.${s.id}`, group: 'transport', name: s.name, value: s.m, unit: 'm away (straight line)', source: `Auckland Transport GTFS (static)${g.gtfs?.feedStart ? `, timetable ${g.gtfs.feedStart}–${g.gtfs.feedEnd}` : ''}`, date: g.gtfs?.built?.slice(0, 10) ?? null, licence: AT_CC, label: 'measured', note: `${s.modes.join(', ') || 'bus'}${s.routes.length ? `: ${s.routes.join(', ')}` : ''}` });
      } else gaps.push(gap('Public transport', 'no stop within 800 m (straight line)', 'transport'));
    } else gaps.push(gap('Public transport', g.stops?.error ? `stops not read (${str(g.stops.error, 80)})` : 'not read', 'transport'));
    if (g.atLive !== 'on') gaps.push(gap('Live arrivals', 'not connected: the at-live function is not switched on', 'transport'));
  } else if (point) gaps.push(gap('Public transport', 'not connected outside Auckland', 'transport'));

  // -- model
  const M = g.model;
  if (M) {
    for (const [k, n] of Object.entries(M.counts).slice(0, 16)) add({ id: `model.count.${k}`, group: 'model', name: k.replace(/^Ifc/, ''), value: n, unit: '', source: `Counted in ${M.from}`, date: null, licence: OWN, label: 'measured' });
    if (M.storeys) add({ id: 'model.storeys', group: 'model', name: 'Storeys', value: M.storeys, source: `Counted in ${M.from}`, date: null, licence: OWN, label: 'measured' });
    if (M.existing) add({ id: 'model.existing', group: 'model', name: 'Existing buildings in the model', value: M.existing, source: `Counted in ${M.from}`, date: null, licence: OWN, label: 'measured' });
    else gaps.push(gap('Existing buildings in the model', M.existing === 0 ? 'none modelled: the 3D page shows LINZ outlines instead' : 'the model does not say which buildings exist', 'model'));
  } else gaps.push(gap('Model', 'no model kept yet: keep an IFC in Models, or open the plan', 'model'));
  const cp = g.cameraPath ?? p.site_sources?.camera_path;
  if (cp?.pts?.length) add({ id: 'model.path', group: 'model', name: 'Camera path', value: cp.pts.length, unit: 'points', source: `Traced by ${cp.traced_by === 'person' ? 'a person' : 'the tool'}`, date: cp.confirmed_at?.slice(0, 10) ?? null, licence: OWN, label: cp.confirmed_by ? 'read' : 'proposed', note: cp.confirmed_by ? `Confirmed by ${cp.confirmed_by}.` : 'Proposed until a person confirms it.' });
  else gaps.push(gap('Camera path', 'none yet: trace one on the 3D page', 'model'));
  if (g.flight?.shots) add({ id: 'model.shots', group: 'model', name: 'Fly-through shots', value: g.flight.shots, unit: 'shots', source: `Fly-through v${g.flight.version ?? 1}`, date: g.flight.at?.slice(0, 10) ?? null, licence: OWN, label: g.flight.status === 'confirmed' ? 'read' : 'proposed' });
  else gaps.push(gap('Shot list', 'no fly-through saved yet', 'model'));

  const brief = {
    type: TYPE, v: 1, project: str(p.id, 80), made_at: now.toISOString(), made_by: str(by, 80),
    versions: { rules: RULES, prompts: g.prompts ?? null, reads: Object.values(g.reads ?? {}).filter((r) => r?.read).length },
    point, items, gaps, scene,
    counts: Object.fromEntries(LABELS.map((l) => [l, items.filter((i) => i.label === l).length])),
    status: 'proposed', approval: null,
    note: 'Prepared by the site agent from the sources named on each item. Not a planning, hazard or Building Code assessment.',
  };
  const bad = briefProblem(brief);
  if (bad) throw new Error(`The brief did not pass its checks: ${bad}`);
  return brief;
}

/** '' when a brief is an assembl.site-brief.v1 the 3D page may trust, else what is wrong */
export function briefProblem(b) {
  if (!b || b.type !== TYPE || b.v !== 1) return 'not a site brief';
  if (!Array.isArray(b.items) || !Array.isArray(b.gaps)) return 'items or gaps missing';
  for (const it of b.items) {
    if (!LABELS.includes(it.label)) return `${it.id}: label`;
    if (!it.source) return `${it.id}: no source`;
    if (!('date' in it) || !('licence' in it) || !('value' in it)) return `${it.id}: value, date or licence missing`;
    if (it.group === 'drawings' && !HOWS.includes(it.how) && it.id.indexOf('drawings.fit') !== 0) return `${it.id}: a drawing fact needs how (written, read or scaled)`;
  }
  if (b.point && !(num(b.point.lat) != null && num(b.point.lng) != null)) return 'point';
  if (!b.scene || !Array.isArray(b.scene.existing) || !Array.isArray(b.scene.boundary)) return 'scene';
  return '';
}

/**
 * What goes across to the 3D page as site.brief (additive to the hand-over): the brief without its long notes. The point stays as the
 * hand-over already carries it. Returns null for no brief or one that fails its checks.
 */
export function briefForHandoff(b) {
  if (!b || briefProblem(b)) return null;
  return { type: b.type, v: 1, made_at: b.made_at, status: b.status, approval: b.approval, point: b.point, versions: b.versions,
    items: b.items.map(({ note, ...x }) => x), gaps: b.gaps, scene: b.scene, counts: b.counts };
}

/** the brief as a person approves it: named, dated; nothing about the site changes */
export function approveBrief(b, who, now = new Date()) {
  const by = str(who, 80).trim();
  if (!by) throw new Error('An approval names the person.');
  if (briefProblem(b)) throw new Error('This brief does not pass its checks.');
  return { ...b, status: 'approved', approval: { by, at: now.toISOString(), note: 'Approved as the site brief for this project. Not a planning, hazard or Building Code sign-off.' } };
}
