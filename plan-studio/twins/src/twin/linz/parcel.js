// The legal parcel outline at a point, read by the browser from LINZ's NZ Primary Parcels layer (LINZ's own ArcGIS service),
// so the Real ground card can draw the boundary without sending the site point to the lab's server.
// It asks for the same short list of fields as the lab's site feed (api/_feeds/site.js, checked by a test): the legal
// description, titles and affected surveys are never requested. Licence: CC BY 4.0. A map of boundaries, not a survey.
// Web APIs only; runs in the browser and in Node for the tests.
export const PARCELS = "https://services.arcgis.com/xdsHIIxuCWByZiCB/arcgis/rest/services/LINZ_NZ_Primary_Parcels/FeatureServer/0";
export const PARCEL_FIELDS = "id,parcel_intent,land_district,survey_area,calc_area";
export const PARCEL_CREDIT = "Sourced from the LINZ Data Service and licensed for reuse under CC BY 4.0.";

/** the query for the parcel under a point, in WGS84, as GeoJSON (the same parameters as the site feed's parcel query) */
export function parcelQueryUrl(lat, lon) {
  const p = new URLSearchParams({ geometry: `${lon},${lat}`, geometryType: "esriGeometryPoint", inSR: "4326", spatialRel: "esriSpatialRelIntersects", outFields: PARCEL_FIELDS, returnGeometry: "true", f: "geojson" });
  p.set("outSR", "4326");
  return `${PARCELS}/query?${p}`;
}

async function getJSON(url, { fetch: f = fetch, signal, ms = 15000 } = {}) {
  const c = new AbortController(), t = setTimeout(() => c.abort(new Error(`LINZ's parcel map did not answer within ${Math.round(ms / 1000)} s`)), ms);
  const stop = () => c.abort(signal.reason ?? new Error("stopped"));
  if (signal) { if (signal.aborted) stop(); else signal.addEventListener("abort", stop, { once: true }); }
  try {
    const r = await f(url, { signal: c.signal });
    if (!r.ok) throw new Error(`LINZ's parcel map answered HTTP ${r.status}`);
    const j = await r.json();
    if (j?.error) throw new Error(`LINZ's parcel map: ${j.error.message || "query error"}`);
    return j;
  } catch (e) { if (c.signal.aborted && c.signal.reason instanceof Error) throw c.signal.reason; throw e; } finally { clearTimeout(t); signal?.removeEventListener?.("abort", stop); }
}

/**
 * The parcel at a point: { rings: [[lon, lat], ...][], asOf, credit, calcAreaM2 }, or { rings: [] , none: true } where LINZ has
 * no primary parcel (open water, say). A failure throws; it is never an empty boundary.
 */
export async function parcelAt(lat, lon, o = {}) {
  const [geo, meta] = await Promise.all([getJSON(parcelQueryUrl(lat, lon), o), getJSON(`${PARCELS}?f=json`, { ...o, ms: 8000 }).catch(() => null)]);
  const f = (geo.features || [])[0], ms = meta?.editingInfo?.dataLastEditDate, asOf = ms != null && isFinite(ms) ? new Date(+ms).toISOString().slice(0, 10) : null;
  if (!f) return { rings: [], none: true, asOf, credit: PARCEL_CREDIT, calcAreaM2: null };
  const g = f.geometry || {}, polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
  const a = f.properties || {};
  return { rings: polys.flat(), asOf, credit: PARCEL_CREDIT, calcAreaM2: a.calc_area != null ? Math.round(a.calc_area) : null };
}
