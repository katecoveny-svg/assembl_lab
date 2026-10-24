// footprint: LINZ NZ Building Outlines (LINZ Data Service layer 101290, CC BY 4.0), read from LINZ's public ArcGIS
// FeatureServer mirror. Roof outlines of buildings ≥ 10 m², ±1 m, NZGD2000 / NZTM; we ask for WGS84 GeoJSON.
// Key-less: the service is "Query,Extract" with maxRecordCount 2000 and no token. We cap a request at 500 m and 60
// buildings so one call stays ~25–60 KB. The layer is republished when LINZ processes new aerial imagery (the
// mirror's last data edit is read from the layer metadata), not on a fixed schedule; we re-check daily.
import { getText, getJSON, envelope, memo, round } from "./util.js";
import { placeOf } from "./places.js";

export const LINZ_FS = "https://services.arcgis.com/xdsHIIxuCWByZiCB/arcgis/rest/services/LINZ_NZ_Building_Outlines/FeatureServer/0";
const LDS = "https://data.linz.govt.nz/layer/101290-nz-building-outlines/";
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

// GeoJSON from the service (+ optional layer metadata) → envelope. Shape__Area is in square metres (the layer is NZTM).
export function parseFootprint(geo, q, layerMeta) {
  if (geo.error) throw new Error("footprint: " + (geo.error.message || "query error"));
  const feats = (geo.features || []).filter((f) => f.geometry && /Polygon/.test(f.geometry.type));
  const buildings = feats.map((f) => { const a = f.properties || {}; return {
    id: a.building_id, name: a.name || null, use: a.use_ || null, suburb: a.suburb_locality || null, town: a.town_city || null, territorialAuthority: a.territorial_authority || null,
    areaM2: round(a.Shape__Area, 1), captureMethod: a.capture_method || null, captureSource: a.capture_source_name || null, capturedFrom: day(a.capture_source_from), capturedTo: day(a.capture_source_to), lastModified: day(a.last_modified),
  }; }).sort((x, y) => (y.areaM2 || 0) - (x.areaM2 || 0));
  const totalM2 = round(buildings.reduce((s, b) => s + (b.areaM2 || 0), 0), 0);
  const latestCapture = buildings.map((b) => b.capturedTo).filter(Boolean).sort().at(-1) || null;
  const dataEdited = layerMeta?.editingInfo?.dataLastEditDate ? day(layerMeta.editingInfo.dataLastEditDate) : null;
  const asOf = dataEdited || buildings.map((b) => b.lastModified).filter(Boolean).sort().at(-1) || latestCapture;
  const named = buildings.find((b) => b.name);
  const where = q.kind === "bbox" ? `box ${q.bbox.map((n) => round(n, 4)).join(", ")}` : `within ${q.radiusM} m of ${q.lat}, ${q.lon}`;
  const features = feats.map((f, i) => ({ type: "Feature", id: f.properties?.building_id ?? i, geometry: f.geometry,
    properties: { building_id: f.properties?.building_id, name: f.properties?.name || null, use: f.properties?.use_ || null, areaM2: round(f.properties?.Shape__Area, 1), capturedTo: day(f.properties?.capture_source_to), source: "LINZ NZ Building Outlines, CC BY 4.0" } }));
  return envelope({
    id: "footprint", label: `Building outlines ${where}${named ? ` (${named.name})` : ""}`, value: totalM2, unit: "m² of roof outline", asOf,
    period: `layer updated ${asOf || "date unknown"}`,
    values: { query: q, count: buildings.length, truncated: buildings.length >= MAX_N, totalAreaM2: totalM2, largest: buildings[0] || null, buildings,
      latestCapture, layerDataEdited: dataEdited, crs: "EPSG:4326 (served); source layer NZGD2000 / NZTM 2000", licence: "LINZ, CC BY 4.0",
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
    const [geo, meta] = await Promise.all([
      getJSON(footprintUrl(q), { ms: 8000 }),
      memo("footprint:meta", 24 * 3600e3, () => getJSON(`${LINZ_FS}?f=json`, { ms: 5000 })).catch(() => null),
    ]);
    return parseFootprint(geo, q, meta);
  });
}
// kept for callers that want the raw text (tests, debugging)
export const footprintRaw = (params) => getText(footprintUrl(footprintQuery(params)));
