// Where an IFC says it stands, read from the file's own text, and how an opened model is put on its site.
// Pure: no page, no three.js, so it is tested directly (tests/architecture/model-site.test.mjs).
//
//   readIfcSite(text)   IfcSite RefLatitude / RefLongitude / RefElevation, the model context's TrueNorth, an IfcMapConversion
//                       (Revit writes one with Shared Coordinates) and its IfcProjectedCRS, the length unit and the storeys.
//                       IFC2X3 files usually carry only the latitude and longitude. Nothing is guessed: what the file does not
//                       say is null, and `said` lists what it did say.
//   pickSitePoint()     which site point to use: the workspace's hand-over, then the IFC's own, then one a person types.
//   northFrom()         which way north is in the model, and where that came from.
//   floorFor()          the model's ground-storey level against the LiDAR ground under it, by a stated rule.
// The STEP text is read the same way the workspace's IFC summary reads it (architecture/js/ifc-summary.js); web-ifc, which
// draws the model, is not needed for these few entries.

export type Src = 'from the workspace' | 'from the IFC' | 'typed here' | 'from the IFC map conversion';
export interface IfcSiteInfo {
  schema: string | null;
  /** metres per model length unit */
  unit: number; unitSaid: boolean;
  lat: number | null; lng: number | null; elevation: number | null;
  /** true north as a direction in the model's plan (IFC x, y), from IfcGeometricRepresentationContext.TrueNorth */
  trueNorth: [number, number] | null;
  map: { eastings: number; northings: number; height: number; xAxis: [number, number]; scale: number; crs: string | null } | null;
  storeys: { name: string; elevation: number }[];
  said: string[];
}

const ENT = /#(\d+)\s*=\s*([A-Z0-9_]+)\s*\(([\s\S]*?)\)\s*;/g;
/** split one entity's arguments at the top level */
export function args(s: string): string[] {
  const out: string[] = []; let depth = 0, cur = '', q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { cur += c; if (c === "'") { if (s[i + 1] === "'") { cur += "'"; i++; } else q = false; } continue; }
    if (c === "'") { q = true; cur += c; continue; }
    if (c === '(') depth++;
    if (c === ')') depth--;
    if (c === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim() || out.length) out.push(cur.trim());
  return out;
}
const numOf = (s: string | undefined) => { if (!s || s === '$' || s === '*') return null; const m = s.match(/^IFC[A-Z]+\((.*)\)$/); const v = Number(m ? m[1] : s); return Number.isFinite(v) ? v : null; };
const strOf = (s: string | undefined) => (s && s.startsWith("'") ? s.slice(1, -1).replace(/''/g, "'") : null);
const listOf = (s: string | undefined) => (s && s.startsWith('(') ? args(s.slice(1, -1)) : []);
/** IfcCompoundPlaneAngleMeasure (degrees, minutes, seconds, millionths of a second; all carry the sign) to decimal degrees */
export function compoundAngle(s: string | undefined): number | null {
  const p = listOf(s).map(Number);
  if (p.length < 3 || p.some((v) => !Number.isFinite(v))) return null;
  return p[0] + p[1] / 60 + p[2] / 3600 + (p[3] ?? 0) / 3.6e9;
}

const PREFIX: Record<string, number> = { MILLI: 1e-3, CENTI: 1e-2, DECI: 0.1, KILO: 1e3 };

/** Read the site, north, map conversion, unit and storeys from an IFC file's text. */
export function readIfcSite(text: string): IfcSiteInfo {
  const ents = new Map<string, { type: string; a: string[] }>();
  const want = /^(IFCSITE|IFCGEOMETRICREPRESENTATIONCONTEXT|IFCDIRECTION|IFCMAPCONVERSION|IFCPROJECTEDCRS|IFCSIUNIT|IFCCONVERSIONBASEDUNIT|IFCMEASUREWITHUNIT|IFCUNITASSIGNMENT|IFCPROJECT|IFCBUILDINGSTOREY)$/;
  let m: RegExpExecArray | null; ENT.lastIndex = 0;
  while ((m = ENT.exec(text))) if (want.test(m[2])) ents.set('#' + m[1], { type: m[2], a: args(m[3]) });
  const of = (type: string) => [...ents.values()].filter((e) => e.type === type);
  const said: string[] = [];
  const schema = text.match(/FILE_SCHEMA\s*\(\s*\(\s*'([^']+)'/)?.[1] ?? null;
  // length unit: the project's unit assignment, else any length unit
  let unit = 1, unitSaid = false;
  const lenUnit = (ref: string): number | null => {
    const e = ents.get(ref); if (!e) return null;
    if (e.type === 'IFCSIUNIT' && e.a[1] === '.LENGTHUNIT.') return (PREFIX[(e.a[2] ?? '').replace(/\./g, '')] ?? 1);
    if (e.type === 'IFCCONVERSIONBASEDUNIT' && e.a[1] === '.LENGTHUNIT.') { const mw = ents.get(e.a[3]); const f = numOf(mw?.a[0]); const base: number | null = mw ? lenUnit(mw.a[1]) : null; return f != null && base != null ? f * base : null; }
    return null;
  };
  const proj = of('IFCPROJECT')[0], ua = proj ? ents.get(proj.a[8]) : of('IFCUNITASSIGNMENT')[0];
  for (const r of listOf(ua?.a[0])) { const u = lenUnit(r); if (u != null) { unit = u; unitSaid = true; break; } }
  if (unitSaid) said.push(`length unit ${unit === 1e-3 ? 'millimetres' : unit === 1 ? 'metres' : `${unit} m`}`);
  // the site
  const site = of('IFCSITE')[0];
  const lat = compoundAngle(site?.a[9]), lng = compoundAngle(site?.a[10]), elevRaw = numOf(site?.a[11]);
  const elevation = elevRaw == null ? null : elevRaw * unit;
  if (lat != null && lng != null) said.push('IfcSite RefLatitude and RefLongitude');
  if (elevation != null) said.push('IfcSite RefElevation');
  // true north, from the 3D model context
  let trueNorth: [number, number] | null = null;
  for (const c of of('IFCGEOMETRICREPRESENTATIONCONTEXT')) {
    const d = ents.get(c.a[5]); if (d?.type !== 'IFCDIRECTION') continue;
    const v = listOf(d.a[0]).map(Number); if (v.length >= 2 && Math.hypot(v[0], v[1]) > 1e-9) { const L = Math.hypot(v[0], v[1]); trueNorth = [v[0] / L, v[1] / L]; said.push('TrueNorth in the model context'); break; }
  }
  // map conversion (IFC4): the model's origin and x axis on a map grid
  let map: IfcSiteInfo['map'] = null;
  const mc = of('IFCMAPCONVERSION')[0];
  if (mc) {
    const crs = ents.get(mc.a[1]), e = numOf(mc.a[2]), n = numOf(mc.a[3]);
    if (e != null && n != null) {
      const ax = numOf(mc.a[5]) ?? 1, ay = numOf(mc.a[6]) ?? 0, L = Math.hypot(ax, ay) || 1;
      map = { eastings: e, northings: n, height: numOf(mc.a[4]) ?? 0, xAxis: [ax / L, ay / L], scale: numOf(mc.a[7]) ?? 1, crs: crs?.type === 'IFCPROJECTEDCRS' ? strOf(crs.a[0]) : null };
      said.push(`IfcMapConversion${map.crs ? ' to ' + map.crs : ''}`);
    }
  }
  const storeys = of('IFCBUILDINGSTOREY').map((s) => ({ name: strOf(s.a[2]) ?? '', elevation: (numOf(s.a[9]) ?? 0) * unit })).sort((a, b) => a.elevation - b.elevation);
  if (storeys.length) said.push(`${storeys.length} storeys`);
  return { schema, unit, unitSaid, lat, lng, elevation, trueNorth, map, storeys, said };
}

/** NZTM2000 is the only map grid the page can turn into a point (EPSG:2193). */
export const isNZTM = (crs: string | null | undefined) => !!crs && /(^|\D)2193(\D|$)|NZTM/i.test(crs);

export interface SitePoint { lat: number; lng: number; source: Src; note: string }
/** The site point to use, in order: the workspace's hand-over, the IFC's own, one typed here. `fromMap` turns NZTM into a point. */
export function pickSitePoint(o: { handoff?: { lat: number; lng: number; source?: string } | null; ifc?: IfcSiteInfo | null; typed?: { lat: number; lng: number } | null; fromMap?: (e: number, n: number) => { lat: number; lon: number } }): SitePoint | null {
  const ok = (lat: unknown, lng: unknown) => typeof lat === 'number' && typeof lng === 'number' && lat > -48 && lat < -33 && lng > 165 && lng < 179.5;
  if (o.typed && ok(o.typed.lat, o.typed.lng)) return { lat: o.typed.lat, lng: o.typed.lng, source: 'typed here', note: 'typed or picked on this page' };
  if (o.handoff && ok(o.handoff.lat, o.handoff.lng)) return { lat: o.handoff.lat, lng: o.handoff.lng, source: 'from the workspace', note: `the project’s site point in the workspace${o.handoff.source ? ' (' + o.handoff.source + ')' : ''}` };
  const f = o.ifc;
  if (f?.map && isNZTM(f.map.crs) && o.fromMap) { const q = o.fromMap(f.map.eastings, f.map.northings); if (ok(q.lat, q.lon)) return { lat: q.lat, lng: q.lon, source: 'from the IFC map conversion', note: `the model’s origin on NZTM2000, from its IfcMapConversion (${f.map.crs})` }; }
  if (f && ok(f.lat, f.lng)) return { lat: f.lat!, lng: f.lng!, source: 'from the IFC', note: 'IfcSite RefLatitude and RefLongitude (often the project’s reference point, not the building)' };
  return null;
}

export type NorthTag = 'from the IFC' | 'set by hand' | 'proposed';
/**
 * North in the page's model frame: degrees clockwise from −z (three.js x right, z toward the viewer, y up; an IFC's plan y is −z).
 * From TrueNorth when the file has it, else from a map conversion's grid north turned by the grid convergence `gammaDeg`;
 * otherwise 0 (up the model's plan), which is a proposal until a person confirms or sets it.
 */
export function northFrom(f: IfcSiteInfo | null, gammaDeg = 0): { deg: number; tag: NorthTag; says: string } {
  const r = (v: number) => Math.round(v * 100) / 100;
  if (f?.trueNorth) return { deg: r((Math.atan2(f.trueNorth[0], f.trueNorth[1]) * 180) / Math.PI), tag: 'from the IFC', says: 'TrueNorth in the IFC’s model context' };
  if (f?.map && isNZTM(f.map.crs)) {
    // grid north in the model's plan is the x axis's map direction turned back: (sin φ, cos φ) with φ = atan2(xAxisOrdinate, xAxisAbscissa)
    const phi = Math.atan2(f.map.xAxis[1], f.map.xAxis[0]);
    return { deg: r((phi * 180) / Math.PI - gammaDeg), tag: 'from the IFC', says: `grid north from the IFC’s map conversion, turned ${r(gammaDeg)}° for the grid convergence` };
  }
  return { deg: 0, tag: 'proposed', says: 'the file gives no north, so north is proposed as up the model’s plan until you confirm or set it' };
}

/** The storey taken as the ground storey: the lowest at or above −0.5 m (below that is a basement), else the lowest. */
export function groundStorey(storeys: IfcSiteInfo['storeys']) {
  if (!storeys.length) return null;
  const s = storeys.find((x) => x.elevation >= -0.5) ?? storeys[0];
  return { ...s, why: storeys.length === 1 ? 'the only storey' : s === storeys[0] ? 'the lowest storey' : 'the lowest storey not below −0.5 m (lower ones are taken as basements)' };
}

export type FloorTag = 'from the IFC' | 'assumed' | 'set by hand';
export const FAR = 2; // metres: a stated level further than this from the LiDAR ground looks like a site datum
/**
 * The ground storey's level in NZVD2016, and the words for it.
 *   stated      the level the file gives it (RefElevation plus the storey's elevation), or null
 *   bottomBelow how far the model's lowest part sits below the ground storey level (m, ≥ 0)
 *   under       LiDAR ground under the footprint (NZVD2016)
 *   byHand      a level a person set
 * Rule when nothing is stated (or the stated level looks like a site datum): the model's lowest part at the mean surveyed
 * ground under its footprint, the ground under it cut and filled to a level platform. The model is not moved
 * silently: a far-off stated level is reported with its distance, and the person can choose to keep it.
 */
export function floorFor(o: { stated: number | null; bottomBelow: number; under: { min: number; max: number; mean: number }; byHand?: number | null; keepStated?: boolean }): { floor: number; tag: FloorTag; text: string; far: number | null } {
  const f2 = (v: number) => v.toFixed(2), u = o.under, rule = u.mean + o.bottomBelow;
  const range = `LiDAR ground under the model runs ${f2(u.min)} to ${f2(u.max)} m (mean ${f2(u.mean)}).`;
  const far = o.stated == null ? null : Math.round((o.stated - u.mean) * 100) / 100;
  if (o.byHand != null) return { floor: o.byHand, tag: 'set by hand', text: `Ground storey at ${f2(o.byHand)} m NZVD2016, set by hand. ${range}`, far };
  if (o.stated != null && (Math.abs(far!) <= FAR || o.keepStated)) {
    return { floor: o.stated, tag: 'from the IFC', text: `Ground storey at ${f2(o.stated)} m, the level the IFC states (its datum is not named in the file; taken as NZVD2016). ${range}${Math.abs(far!) > FAR ? ` That is ${f2(Math.abs(far!))} m ${far! > 0 ? 'above' : 'below'} the LiDAR ground: kept at your choice.` : ''}`, far };
  }
  const base = `Ground storey at ${f2(rule)} m NZVD2016: the model’s lowest part (${f2(o.bottomBelow)} m below the ground storey) at the mean LiDAR ground under it; the ground under the model is cut and filled to a level platform a metre wider than it. Assumed until you set it. ${range}`;
  if (o.stated != null) return { floor: rule, tag: 'assumed', text: `The IFC states its ground storey at ${f2(o.stated)} m, ${f2(Math.abs(far!))} m ${far! > 0 ? 'above' : 'below'} the LiDAR ground: that looks like a site datum, not NZVD2016. It is not used. ${base}`, far };
  return { floor: rule, tag: 'assumed', text: base, far };
}
