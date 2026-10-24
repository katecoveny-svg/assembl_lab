// footprint: LINZ NZ Building Outlines (LINZ Data Service layer 101290, CC BY 4.0), read from LINZ's public ArcGIS
// FeatureServer mirror. Roof outlines of buildings ≥ 10 m², ±1 m, NZGD2000 / NZTM; we ask for WGS84 GeoJSON.
// Key-less: the service is "Query,Extract" with maxRecordCount 2000 and no token. We cap a request at 500 m and 60
// buildings so one call stays ~25–60 KB. The layer is republished when LINZ processes new aerial imagery (the
// mirror's last data edit is read from the layer metadata), not on a fixed schedule; we re-check daily.
import { getText, getJSON, envelope, memo, round } from "./util.js";
import { placeOf } from "./places.js";

// With a free LDS API key in LINZ_API_KEY (data.linz.govt.nz/my/api/; the same env name the OKComputer reference app reads)
// the LINZ Data Service WFS is asked first, since it carries each update before the mirror does; the mirror stays the
// fallback and the key-less default.
export const LINZ_FS = "https://services.arcgis.com/xdsHIIxuCWByZiCB/arcgis/rest/services/LINZ_NZ_Building_Outlines/FeatureServer/0";
const LDS = "https://data.linz.govt.nz/layer/101290-nz-building-outlines/";
export const linzKey = () => process.env.LINZ_API_KEY || null;
const FIELDS = "building_id,name,use_,suburb_locality,town_city,territorial_authority,capture_method,capture_source_name,capture_source_from,capture_source_to,last_modified,Shape__Area";
const MAX_RADIUS = 500, MAX_N = 60;

const inNZ = (lat, lon) => isFinite(lat) && isFinite(lon) && lat <= -34 && lat >= -47.5 && lon >= 166 && lon <= 179;
const day = (ms) => (ms == null ? null : new Date(+ms).toISOString().slice(0, 10));

// Resolve the query area from the request: lat/lon (+radius), a bbox "minLon,minLat,maxLon,maxLat", or the place's coordinates.
export function footprintQuery({ lat, lon, lng, radius, bbox, place } = {}) {
  if (bbox) {
    const b = String(bbox).split(",").map(Number);
    if (b.length === 4 && inNZ(b[1], b[0]) && inNZ(b[3], b[2]) && b[2] > b[0] && b[3] > b[1]) {
      const spanM = Math.max((b[2] - b[0]) * 111320 * Math.cos((b[1] + b[3]) / 2 * Math.PI / 180), (b[3] - b[1]) * 111320);
      if (spanM <= 2 * MAX_RADIUS) return { kind: "bbox", bbox: b, lat: round((b[1] + b[3]) / 2, 5), lon: round((b[0] + b[2]) / 2, 5), radiusM: Math.round(spanM / 2) };
    }
  }
  let la = +lat, lo = +(lon ?? lng);
  if (!inNZ(la, lo)) { const p = placeOf(place); la = p.lat; lo = p.lon; }
  const r = Math.min(MAX_RADIUS, Math.max(20, Math.round(+radius) || 150));
  return { kind: "point", lat: round(la, 5), lon: round(lo, 5), radiusM: r };
}

export function footprintUrl(q) {
  const p = new URLSearchParams({ outFields: FIELDS, outSR: "4326", inSR: "4326", returnGeometry: "true", f: "geojson", resultRecordCount: String(MAX_N), spatialRel: "esriSpatialRelIntersects" });
  if (q.kind === "bbox") { p.set("geometry", q.bbox.join(",")); p.set("geometryType", "esriGeometryEnvelope"); }
  else { p.set("geometry", `${q.lon},${q.lat}`); p.set("geometryType", "esriGeometryPoint"); p.set("distance", String(q.radiusM)); p.set("units", "esriSRUnit_Meter"); }
  return `${LINZ_FS}/query?${p}`;
}

// The LDS WFS equivalent of footprintUrl(): a bbox around the point (WFS 2.0 with EPSG:4326 takes lon,lat here), GeoJSON out.
export function ldsUrl(q, key) {
  const b = q.kind === "bbox" ? q.bbox : (() => { const dLat = q.radiusM / 111320, dLon = q.radiusM / (111320 * Math.cos(q.lat * Math.PI / 180)); return [q.lon - dLon, q.lat - dLat, q.lon + dLon, q.lat + dLat]; })();
  const p = new URLSearchParams({ service: "WFS", version: "2.0.0", request: "GetFeature", typeNames: "layer-101290", outputFormat: "json", srsName: "EPSG:4326", count: String(MAX_N), bbox: `${b.map((n) => round(n, 6)).join(",")},EPSG:4326` });
  return `https://data.linz.govt.nz/services;key=${encodeURIComponent(key)}/wfs?${p}`;
}
// Area of a lon/lat polygon in m² (equirectangular shoelace; fine at building scale), used when the source has no Shape__Area.
export function polygonAreaM2(geom) {
  const ring = (r) => { const lat0 = r.reduce((s, c) => s + c[1], 0) / r.length * Math.PI / 180; const kx = 111320 * Math.cos(lat0), ky = 111320; let a = 0;
    for (let i = 0; i < r.length - 1; i++) a += r[i][0] * kx * r[i + 1][1] * ky - r[i + 1][0] * kx * r[i][1] * ky; return Math.abs(a) / 2; };
  const poly = (rings) => rings.reduce((s, r, i) => s + (i ? -1 : 1) * ring(r), 0);
  if (!geom) return null;
  return geom.type === "Polygon" ? poly(geom.coordinates) : geom.type === "MultiPolygon" ? geom.coordinates.reduce((s, p) => s + poly(p), 0) : null;
}

// GeoJSON from either service (+ optional layer metadata) → envelope. The mirror's Shape__Area is in square metres (the
// layer is NZTM); the WFS has no area field, so it is computed from the geometry. Dates arrive as epoch ms (mirror) or ISO (WFS).
export function parseFootprint(geo, q, layerMeta, via = "arcgis-mirror") {
  if (geo.error) throw new Error("footprint: " + (geo.error.message || "query error"));
  const feats = (geo.features || []).filter((f) => f.geometry && /Polygon/.test(f.geometry.type));
  const toDay = (v) => (v == null || v === "" ? null : typeof v === "number" || /^\d{10,}$/.test(v) ? day(v) : String(v).slice(0, 10));
  const buildings = feats.map((f) => { const a = f.properties || {}; return {
    id: a.building_id, name: a.name || null, use: a.use_ ?? a.use ?? null, suburb: a.suburb_locality || null, town: a.town_city || null, territorialAuthority: a.territorial_authority || null,
    areaM2: round(a.Shape__Area != null ? a.Shape__Area : polygonAreaM2(f.geometry), 1), captureMethod: a.capture_method || null, captureSource: a.capture_source_name || null,
    capturedFrom: toDay(a.capture_source_from), capturedTo: toDay(a.capture_source_to), lastModified: toDay(a.last_modified),
  }; }).sort((x, y) => (y.areaM2 || 0) - (x.areaM2 || 0));
  const totalM2 = round(buildings.reduce((s, b) => s + (b.areaM2 || 0), 0), 0);
  const latestCapture = buildings.map((b) => b.capturedTo).filter(Boolean).sort().at(-1) || null;
  const dataEdited = layerMeta?.editingInfo?.dataLastEditDate ? day(layerMeta.editingInfo.dataLastEditDate) : null;
  const asOf = dataEdited || buildings.map((b) => b.lastModified).filter(Boolean).sort().at(-1) || latestCapture;
  const named = buildings.find((b) => b.name);
  const where = q.kind === "bbox" ? `box ${q.bbox.map((n) => round(n, 4)).join(", ")}` : `within ${q.radiusM} m of ${q.lat}, ${q.lon}`;
  const byId = new Map(buildings.map((b) => [b.id, b]));
  const features = feats.map((f, i) => { const b = byId.get(f.properties?.building_id) || {}; return { type: "Feature", id: f.properties?.building_id ?? i, geometry: f.geometry,
    properties: { building_id: f.properties?.building_id, name: b.name || null, use: b.use || null, areaM2: b.areaM2 ?? null, capturedTo: b.capturedTo || null, source: "LINZ NZ Building Outlines, CC BY 4.0" } }; });
  return envelope({
    id: "footprint", label: `Building outlines ${where}${named ? ` (${named.name})` : ""}`, value: totalM2, unit: "m² of roof outline", asOf,
    period: `layer updated ${asOf || "date unknown"}`,
    values: { query: q, count: buildings.length, truncated: buildings.length >= MAX_N, totalAreaM2: totalM2, largest: buildings[0] || null, buildings,
      latestCapture, layerDataEdited: dataEdited, crs: "EPSG:4326 (served); source layer NZGD2000 / NZTM 2000", licence: "LINZ, CC BY 4.0", via, keyed: via === "lds-wfs",
      geojson: { type: "FeatureCollection", features } },
    cadence: "daily", live: false,
    source: { name: "LINZ Data Service, NZ Building Outlines (layer 101290), CC BY 4.0", url: LDS },
    note: "Roof outlines from aerial imagery (≥ 10 m², about ±1 m), not floor plans: a shell for a 3D model, refreshed only when a region is re-flown. Attribution: Sourced from the LINZ Data Service and licensed for reuse under CC BY 4.0.",
  });
}

export function fetchFootprint(params) {
  const q = footprintQuery(params);
  const key = `footprint:${q.kind}:${q.lat},${q.lon},${q.radiusM}${q.bbox ? ":" + q.bbox.join(",") : ""}`;
  return memo(key, 6 * 3600e3, async () => {
    const meta = memo("footprint:meta", 24 * 3600e3, () => getJSON(`${LINZ_FS}?f=json`, { ms: 5000 })).catch(() => null);
    if (linzKey()) { // LDS first, mirror if it fails
      try { const geo = await getJSON(ldsUrl(q, linzKey()), { ms: 8000 }); if ((geo.features || []).length || geo.type === "FeatureCollection") return parseFootprint(geo, q, null, "lds-wfs"); } catch (e) { /* fall back to the mirror */ }
    }
    return parseFootprint(await getJSON(footprintUrl(q), { ms: 8000 }), q, await meta, "arcgis-mirror");
  });
}
// kept for callers that want the raw text (tests, debugging)
export const footprintRaw = (params) => getText(footprintUrl(footprintQuery(params)));
