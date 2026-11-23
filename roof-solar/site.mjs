// roof-solar · everything the page reads about one place, from open sources, in the visitor's browser.
//   LINZ 1 m LiDAR surface and ground heights   straight from LINZ's public bucket on Amazon S3 (CC BY 4.0), by the lab's reader in ./linz/
//   LINZ NZ Building Outlines                    LINZ's public ArcGIS service, asked for the buildings round the point (CC BY 4.0)
//   NASA POWER monthly sunlight                  the point rounded to half a degree (see irradiance.mjs)
//   LINZ NZ Addresses                            only when someone types an address: the words go to the lab's own /api/live address feed
// The point itself goes to LINZ and nowhere else, and is never stored by the lab.
import { readLayer, unpackHeights } from "./linz/ground.js";
import { toNZTM } from "./linz/nztm.js";
import { fetchClimatology } from "./irradiance.mjs";
import { inRings } from "./roof.mjs";

export const OUTLINES = "https://services.arcgis.com/xdsHIIxuCWByZiCB/arcgis/rest/services/LINZ_NZ_Building_Outlines/FeatureServer/0";
export const OUTLINE_CREDIT = "Sourced from the LINZ Data Service and licensed for reuse under CC BY 4.0.";
export const inNZ = (lat, lon) => isFinite(lat) && isFinite(lon) && lat <= -34 && lat >= -47.5 && lon >= 166 && lon <= 179;

export function outlinesUrl(lat, lon, radiusM = 130) {
  const p = new URLSearchParams({ geometry: `${lon},${lat}`, geometryType: "esriGeometryPoint", inSR: "4326", distance: String(radiusM), units: "esriSRUnit_Meter", spatialRel: "esriSpatialRelIntersects",
    outFields: "building_id,name,use_,Shape__Area,capture_source_to", outSR: "2193", returnGeometry: "true", f: "json", resultRecordCount: "250" });
  return `${OUTLINES}/query?${p}`;
}
/** esri JSON features (NZTM rings) to buildings: { id, name, use, areaM2, rings, capturedTo } */
export function parseOutlines(j) {
  if (j?.error) throw new Error(`LINZ's building outlines: ${j.error.message || "query error"}`);
  return (j.features || []).filter((f) => f.geometry?.rings?.length).map((f) => ({ id: f.attributes.building_id, name: f.attributes.name || null, use: f.attributes.use_ && f.attributes.use_ !== "Unknown" ? f.attributes.use_ : null,
    areaM2: Math.round(f.attributes.Shape__Area || 0), rings: f.geometry.rings, capturedTo: f.attributes.capture_source_to ? new Date(+f.attributes.capture_source_to).toISOString().slice(0, 10) : null }));
}
const distToRings = (e, n, rings) => { let best = Infinity; for (const r of rings) for (let i = 0; i < r.length - 1; i++) { const [x1, y1] = r[i], [x2, y2] = r[i + 1], dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((e - x1) * dx + (n - y1) * dy) / L)) : 0; best = Math.min(best, Math.hypot(e - (x1 + t * dx), n - (y1 + t * dy))); } return best; };
/** the building the point is in; else the nearest outline within `within` metres; else null */
export function pickBuilding(buildings, e, n, within = 40) {
  const inside = buildings.filter((b) => inRings(e, n, b.rings)).sort((a, b) => a.areaM2 - b.areaM2)[0]; if (inside) return { building: inside, how: "the outline the point is inside" };
  let best = null, bd = Infinity; for (const b of buildings) { const d = distToRings(e, n, b.rings); if (d < bd) { bd = d; best = b; } }
  return best && bd <= within ? { building: best, how: `the nearest outline, ${bd.toFixed(0)} m from the point` } : null;
}

async function json(url, f, signal, ms = 15000) {
  const c = new AbortController(), t = setTimeout(() => c.abort(new Error("LINZ's building outlines did not answer in time")), ms);
  signal?.addEventListener?.("abort", () => c.abort(signal.reason), { once: true });
  try { const r = await f(url, { signal: c.signal }); if (!r.ok) throw new Error(`HTTP ${r.status}`); return await r.json(); } finally { clearTimeout(t); }
}

/**
 * Read a place. Throws with plain words if the 1 m LiDAR, the outlines or the sunlight data are not there: nothing is filled in.
 * @returns {{ point, grid:{e0,n0}, dsm, dem, surface, ground, buildings, chosen, how, climate, outlinesAsOf, credits }}
 */
export async function loadSite(lat, lon, { fetch: f = (...a) => fetch(...a), signal, onStage = () => {}, radius = 90 } = {}) {
  if (!inNZ(lat, lon)) throw new Error("That point is outside New Zealand's main islands.");
  const stage = (s) => onStage(s);
  stage("Reading LINZ's 1 m LiDAR");
  const surfaceP = readLayer("surface", { lat, lon, radius, signal, fetch: f }), groundP = readLayer("ground", { lat, lon, radius, signal, fetch: f });
  const outlinesP = Promise.all([json(outlinesUrl(lat, lon), f, signal), json(`${OUTLINES}?f=json`, f, signal, 8000).catch(() => null)]);
  const climateP = fetchClimatology(lat, lon, { fetch: f, signal });
  const [surface, ground] = await Promise.all([surfaceP, groundP]);
  if (surface.status === "unavailable") throw new Error(surface.reason);
  if (ground.status === "unavailable") throw new Error(ground.reason);
  stage("Reading building outlines");
  const [oj, meta] = await outlinesP, buildings = parseOutlines(oj);
  stage("Reading sunlight data");
  const climate = await climateP;
  const dsm = unpackHeights(surface.values.heights), dem = unpackHeights(ground.values.heights), { e, n } = toNZTM(lat, lon);
  const pick = pickBuilding(buildings, e, n);
  const ms = meta?.editingInfo?.dataLastEditDate;
  return { point: { lat, lon, e, n }, dsm, dem, surface, ground, buildings, chosen: pick?.building ?? null, how: pick?.how ?? null, climate,
    outlinesAsOf: ms != null && isFinite(ms) ? new Date(+ms).toISOString().slice(0, 10) : null,
    credits: { lidar: surface.licence?.attribution, outlines: OUTLINE_CREDIT } };
}

// ---- address search: the same lab feed the plan page uses (LINZ NZ Addresses, CC BY 4.0) ------------------------------------------------
export const ADDRESS_CREDIT = "Sourced from the LINZ Data Service and licensed for reuse under the CC BY 4.0 licence.";
export async function askAddress(words, signal, f = (...a) => fetch(...a)) {
  const q = String(words || "").trim(); if (q.length < 4) return { matches: [], more: false };
  if (q.length > 120) throw new Error("That is too long for an address: 120 characters at most.");
  let r; try { r = await f(`/api/live/?feeds=address&q=${encodeURIComponent(q)}`, { headers: { accept: "application/json" }, signal }); } catch (e) { if (e?.name === "AbortError") throw e; throw new Error("The address search could not be reached. Pick a point on the map instead."); }
  if (!r.ok) throw new Error(`The address search is not answering just now (${r.status}). Try again in a minute, or pick a point on the map.`);
  const a = (await r.json())?.feeds?.address; if (!a || a.error) throw new Error(a?.error ? String(a.error) : "The address search gave no answer. Try again in a minute.");
  return { matches: (a.values?.matches ?? []).filter((m) => m && m.address && inNZ(m.lat, m.lon)).slice(0, 8).map((m) => ({ address: String(m.address), suburb: m.suburb || "", town: m.town || "", lat: m.lat, lon: m.lon })), more: !!a.values?.more };
}
