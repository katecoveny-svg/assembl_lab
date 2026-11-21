// site: live facts about one point of land, for the architecture tool (Plan Studio). Key-less public services only.
//
// GET /api/live/?feeds=site&lat=<WGS84>&lon=<WGS84>
//   → feeds.site = { id:"site", point:{lat,lon}, truth, facts:{ <factId>: fact } , ... }
//   one fact per question, each its own envelope: { id, label, truth, truthLabel, status, fetchedAt, asOf, cadence, value, unit,
//   values, source:{name,url,service,layer}, licence:{name,attribution,url,caveat?}, note?, limits? }.
//   A fact that could not be fetched or is not wired is { id, label, truth:"Unavailable", status:"unavailable"|"not-wired", reason, ... }.
//   truth is "Live" only when the answer came from the publisher's service during this request.
//
// These are facts for a person to read. Nothing here says whether a site meets any rule, and nothing is assessed against
// the Building Code or a plan. No owner, title number or legal description is requested from any service.
//
// Sources checked on 21 Nov 2026 (see docs/live-data.md for the terms found):
//   LINZ NZ Primary Parcels (LINZ's ArcGIS mirror, CC BY 4.0)               parcel
//   Auckland Council ArcGIS open data (services1.arcgis.com/n4yPwebTjJCmXB6W), CC BY 4.0 unless an item says otherwise:
//     Unitary Plan Base Zone, AUP overlays, Flood Plains, Flood Prone Areas, Overland Flow Paths, Coastal Inundation 1% AEP (+1 m),
//     Tsunami Evacuation Zones, Shallow and Large Scale Landslide Susceptibility 2025, Liquefaction Vulnerability (basic)
//   Open-Meteo (weather now, sun times): free tier is non-commercial only. The licence note travels in the envelope.
// Not wired: NZS 3604 zones (BRANZ Maps has no open service), coastal erosion lines (ASCIE: see the fact), elevation (in the model).
import { getJSON, memo, round } from "./util.js";

const AC = "https://services1.arcgis.com/n4yPwebTjJCmXB6W/ArcGIS/rest/services";
const LINZ = "https://services.arcgis.com/xdsHIIxuCWByZiCB/arcgis/rest/services";
const ACOPEN = "https://www.aucklandcouncil.govt.nz/en/geospatial/council-open-data/user-licence-auckland-council-open-data.html";
const inNZ = (lat, lon) => isFinite(lat) && isFinite(lon) && lat <= -34 && lat >= -47.5 && lon >= 166 && lon <= 179;
const day = (ms) => (ms == null || !isFinite(ms) ? null : new Date(+ms).toISOString().slice(0, 10));
const NEAR_M = 50; // "near" for lines and points (overland flow paths, heritage places, trees, wetlands) and the flood "within" check
const OLFP_M = 25;

const L_AC = { name: "CC BY 4.0 (Auckland Council's default licence for its open data)", url: ACOPEN, attribution: "Contains data from Auckland Council, licensed for reuse under CC BY 4.0." };
const L_LINZ = { name: "CC BY 4.0", url: "https://www.linz.govt.nz/products-services/data/licensing-and-using-data/attributing-linz-data", attribution: "Sourced from the LINZ Data Service and licensed for reuse under CC BY 4.0." };

// ---- one ArcGIS query, as a URL and as a call ------------------------------------------------------------------------------------
export function arcQueryUrl(base, svc, { lat, lon, distance, outFields = "*", geometry = false }) {
  const p = new URLSearchParams({ geometry: `${lon},${lat}`, geometryType: "esriGeometryPoint", inSR: "4326", spatialRel: "esriSpatialRelIntersects", outFields, returnGeometry: String(geometry), f: geometry ? "geojson" : "json" });
  if (geometry) p.set("outSR", "4326");
  if (distance) { p.set("distance", String(distance)); p.set("units", "esriSRUnit_Meter"); }
  // no resultRecordCount: on these hosted layers it makes the query 50-100 times slower (measured 0.5 s without, 50 s with); the server's own cap is 2000
  return `${base}/${svc}/FeatureServer/0/query?${p}`;
}
async function arc(base, svc, o) {
  const j = await getJSON(arcQueryUrl(base, svc, o));
  if (j.error) throw new Error(`${svc}: ${j.error.message || "query error"}${j.error.details?.[0] ? " (" + j.error.details[0] + ")" : ""}`);
  return j;
}
const attrs = (j) => (j.features || []).map((f) => f.attributes || f.properties || {});
// the publisher's own date for a layer: dataLastEditDate from the layer's metadata, kept a day per warm instance
const layerDate = (base, svc) => memo("sitemeta:" + svc, 24 * 3600e3, () => getJSON(`${base}/${svc}/FeatureServer/0?f=json`, { ms: 5000 }).then((m) => day(m.editingInfo?.dataLastEditDate) || "unknown")).catch(() => "unknown");
const coded = (j, field, code) => { const d = (j.fields || []).find((f) => f.name === field)?.domain; return d?.codedValues?.find((c) => c.code === code)?.name ?? null; };

// ---- fact builders -----------------------------------------------------------------------------------------------------------------
const base = (id, label, extra) => ({ id, label, fetchedAt: new Date().toISOString(), ...extra });
export const liveFact = (id, label, f) => base(id, label, { truth: "Live", truthLabel: "Live", status: "live", asOf: null, cadence: null, value: null, unit: "", ...f });
export const unavailableFact = (id, label, reason, extra = {}) => base(id, label, { truth: "Unavailable", truthLabel: "Unavailable", status: "unavailable", reason, ...extra });
export const notWiredFact = (id, label, reason, extra = {}) => base(id, label, { truth: "Unavailable", truthLabel: "Unavailable · not wired", status: "not-wired", reason, ...extra });
const asOfNote = (d) => (d && d !== "unknown" ? d : null);

// ---- parcel (LINZ) ---------------------------------------------------------------------------------------------------------------------
// outFields is a short list on purpose: appellation (legal description), titles and affected_surveys are never requested.
export const PARCEL_FIELDS = "id,parcel_intent,land_district,survey_area,calc_area";
export function parseParcel(geo, asOf) {
  const f = (geo.features || [])[0];
  const src = { name: "LINZ Data Service, NZ Primary Parcels (via LINZ's ArcGIS service)", url: "https://data.linz.govt.nz/layer/50772-nz-primary-parcels/", service: `${LINZ}/LINZ_NZ_Primary_Parcels/FeatureServer/0`, layer: "LINZ NZ Primary Parcels" };
  if (!f) return liveFact("site.parcel", "Land parcel at this point", { asOf, cadence: "as LINZ republishes (the layer edit date is in asOf)", value: null, unit: "m²", values: { parcel: null }, source: src, licence: L_LINZ,
    note: "No primary parcel polygon at this point (for example offshore). Nothing is guessed." });
  const a = f.properties || {};
  return liveFact("site.parcel", "Land parcel at this point", {
    asOf, cadence: "as LINZ republishes (the layer edit date is in asOf)", value: a.calc_area != null ? round(a.calc_area, 0) : null, unit: "m² (LINZ calculated area)",
    values: { parcelId: a.id ?? null, intent: a.parcel_intent ?? null, landDistrict: a.land_district ?? null, calcAreaM2: a.calc_area != null ? round(a.calc_area, 0) : null,
      surveyAreaM2: a.survey_area != null ? round(a.survey_area, 0) : null, outline: f.geometry, crs: "EPSG:4326", withheld: ["appellation (legal description)", "titles", "affected surveys"] },
    source: src, licence: L_LINZ,
    note: "The outline is LINZ's digital cadastral parcel, a map of boundaries, not a survey. The legal description and titles are deliberately not returned. For a part-lot the survey area can be larger than the calculated area.",
  });
}
async function parcel({ lat, lon }) {
  const [geo, asOf] = await Promise.all([arc(LINZ, "LINZ_NZ_Primary_Parcels", { lat, lon, geometry: true, outFields: PARCEL_FIELDS }), layerDate(LINZ, "LINZ_NZ_Primary_Parcels")]);
  return parseParcel(geo, asOfNote(asOf));
}

// ---- planning zone (Auckland Unitary Plan base zone layer) ---------------------------------------------------------------------------
export function parseZone(j, asOf) {
  const src = { name: "Auckland Council, Unitary Plan Base Zone", url: "https://data-aucklandcouncil.opendata.arcgis.com/", service: `${AC}/Unitary_Plan_Base_Zone/FeatureServer/0`, layer: "Unitary Plan Base Zone" };
  const a = attrs(j)[0];
  if (!a) return liveFact("site.zone", "Planning zone", { asOf, cadence: "as Auckland Council updates the Unitary Plan", value: null, values: { zone: null }, source: src, licence: L_AC, note: "No base zone layer polygon at this point." });
  const zone = coded(j, "ZONE", a.ZONE), group = coded(j, "GROUPZONE", a.GROUPZONE), status = coded(j, "VERSIONSTATUS", a.VERSIONSTATUS);
  const islands = /Hauraki Gulf Islands/i.test(zone || "");
  return liveFact("site.zone", "Planning zone", {
    asOf, cadence: "as Auckland Council updates the Unitary Plan", value: zone, unit: "",
    values: { zone, zoneCode: a.ZONE ?? null, group, planStatus: status, scheme: "Auckland Unitary Plan, base zone layer", haurakiGulfIslands: islands },
    source: src, licence: L_AC,
    note: islands
      ? "This point is in the Hauraki Gulf Islands. The Unitary Plan layer shows only 'Hauraki Gulf Islands' here: the island's own zones and rules are in the Hauraki Gulf Islands section of the Auckland Council District Plan, which Auckland Council does not publish as an open map layer that we found. So no finer zone is returned. Read the plan itself, or ask the Council."
      : "The zone as mapped in the Auckland Unitary Plan base zone layer. A fact to read, not a planning assessment.",
  });
}
async function zone({ lat, lon }) {
  const [j, asOf] = await Promise.all([arc(AC, "Unitary_Plan_Base_Zone", { lat, lon, outFields: "ZONE,GROUPZONE,VERSIONSTATUS" }), layerDate(AC, "Unitary_Plan_Base_Zone")]);
  return parseZone(j, asOfNote(asOf));
}

// ---- overlays (AUP regional/district overlays that hit the point) -----------------------------------------------------------------
// [service, label, "poly" | "near"] — points and small features use a 50 m reach, polygons must contain the point.
export const OVERLAYS = [
  ["Significant_Ecological_Areas_Overlay", "Significant Ecological Areas", "poly"], ["Outstanding_Natural_Landscapes_Overlay", "Outstanding Natural Landscapes", "poly"],
  ["Outstanding_Natural_Features_Overlay", "Outstanding Natural Features", "poly"], ["Outstanding_Natural_Character_Overlay", "Outstanding Natural Character", "poly"],
  ["High_Natural_Character_Overlay", "High Natural Character", "poly"], ["Historic_Heritage_Overlay_Extent_of_Place", "Historic Heritage extent of place", "poly"],
  ["Historic_Heritage_Overlay_Place", "Historic Heritage place", "near"], ["Notable_Trees_Overlay", "Notable Trees", "near"], ["Notable_Group_of_Trees_Overlay", "Notable Group of Trees", "poly"],
  ["Sites_and_Places_of_Significance_to_Mana_Whenua_Overlay", "Sites and Places of Significance to Mana Whenua", "poly"], ["Ridgeline_Protection_Overlay", "Ridgeline Protection", "poly"],
  ["Wetland_Management_Areas_Overlay", "Wetland Management Areas", "near"], ["Natural_Stream_Management_Areas_Overlay", "Natural Stream Management Areas", "poly"], ["Designation", "Designations", "poly"],
];
export function parseOverlays(results, asOf) {
  const hits = [], failed = [];
  results.forEach((r, i) => {
    const [svc, label, mode] = OVERLAYS[i];
    if (r.status === "rejected") { failed.push(label); return; }
    for (const a of attrs(r.value)) hits.push({ overlay: label, schedule: a.SCHEDULE ?? null, name: a.NAME ?? null, reach: mode === "near" ? `within ${NEAR_M} m` : "at the point" });
  });
  const checked = OVERLAYS.map((o) => o[1]).filter((l) => !failed.includes(l));
  const src = { name: "Auckland Council, Auckland Unitary Plan overlay layers", url: "https://data-aucklandcouncil.opendata.arcgis.com/", service: AC + "/<layer>/FeatureServer/0", layer: OVERLAYS.map((o) => o[0]).join(", ") };
  return liveFact("site.overlays", "Planning overlays at this point", {
    asOf, cadence: "as Auckland Council updates the Unitary Plan", value: hits.length, unit: "overlay layers with a hit",
    values: { hits, checked, notChecked: failed, complete: !failed.length, reachM: NEAR_M },
    source: src, licence: L_AC,
    note: "Only the Unitary Plan overlay layers listed in 'checked' were asked. The Hauraki Gulf Islands section of the District Plan has overlays of its own (heritage, for example) that are not in these layers, so an empty list does not mean no overlay applies. A fact to read, not a planning assessment.",
  });
}
async function overlays({ lat, lon }) {
  const rs = await Promise.allSettled(OVERLAYS.map(([svc, , mode]) => arc(AC, svc, { lat, lon, outFields: "SCHEDULE,NAME", distance: mode === "near" ? NEAR_M : 0 })));
  if (rs.every((r) => r.status === "rejected")) throw new Error("none of the overlay layers answered: " + (rs[0].reason?.message || "error"));
  return parseOverlays(rs, null);
}

// ---- hazards ------------------------------------------------------------------------------------------------------------------------
const HAZ_NOTE = "Mapped extents are modelled and vary in age and detail; not being inside a mapped area does not mean the site cannot be affected. A fact to read, not a hazard or Building Code assessment; site-specific advice is still needed.";

export function parseFloodPlains(atPoint, near, asOf) {
  const row = (a) => ({ eventAEPPercent: a.RAINFALL_EVENT != null ? round(100 / a.RAINFALL_EVENT, 2) : null, rainfallEventYears: a.RAINFALL_EVENT ?? null, climateChange: a.CLIMATE_CHANGE_ADJUSTED ?? null,
    developmentScenario: a.DEVELOPMENT_SCENARIO ?? null, modelType: a.Model_Type ?? null, yearProduced: a.YEAR_PRODUCED ?? null, report: a.DOCUMENT_NAME ?? null, reportUrl: a.PDF_Link ?? null, published: day(a.Published_Date) });
  const here = attrs(atPoint).map(row), nearby = attrs(near).map(row);
  return liveFact("site.floodPlain", "Flood plain (1% annual chance, modelled)", {
    asOf, cadence: "updated by catchment as Healthy Waters models are published", value: here.length ? "inside a mapped flood plain" : "not inside a mapped flood plain", unit: "",
    values: { insideMapped: here.length > 0, mappedWithinNearM: nearby.length > 0, nearM: NEAR_M, atPoint: here, nearby: here.length ? [] : nearby },
    source: { name: "Auckland Council Healthy Waters, Flood Plains", url: "https://data-aucklandcouncil.opendata.arcgis.com/", service: `${AC}/Flood_Plains/FeatureServer/0`, layer: "Flood Plains" },
    licence: { name: "Auckland Council: internal and external use, with the Catchments and Hydrology disclaimer (no Creative Commons version is named on the item; the Council default is CC BY 4.0)", url: ACOPEN,
      attribution: "Contains data from Auckland Council (Healthy Waters), Flood Plains.", caveat: "The item's disclaimer says the layer is catchment-level modelling with varied accuracy and currency, does not replace site-specific assessment and is not an endorsement or approval of any development." },
    note: HAZ_NOTE,
  });
}
async function floodPlain({ lat, lon }) {
  const [a, n, d] = await Promise.all([arc(AC, "Flood_Plains", { lat, lon }), arc(AC, "Flood_Plains", { lat, lon, distance: NEAR_M }), layerDate(AC, "Flood_Plains")]);
  return parseFloodPlains(a, n, asOfNote(d));
}

export function parseFloodProne(atPoint, near, asOf) {
  const row = (a) => ({ maxDepthM: a.MaxDepth ?? null, volumeM3: a.VolumeM3 ?? null, catchmentAreaM2: a.CatchmentArea ?? null, canFill: a.CanFill ?? null, spills: /spill/i.test(a.Level100y_text || "") ? true : null, lastEdited: day(a.last_edited_date) });
  const here = attrs(atPoint).map(row), nearby = attrs(near).map(row);
  return liveFact("site.floodProne", "Flood prone area (possible ponding)", {
    asOf, cadence: "updated by Healthy Waters as models are revised", value: here.length ? "inside a mapped flood prone area" : "not inside a mapped flood prone area", unit: "",
    values: { insideMapped: here.length > 0, mappedWithinNearM: nearby.length > 0, nearM: NEAR_M, atPoint: here, nearby: here.length ? [] : nearby },
    source: { name: "Auckland Council Healthy Waters, Flood Prone Areas", url: "https://data-aucklandcouncil.opendata.arcgis.com/", service: `${AC}/Flood_Prone_Areas/FeatureServer/0`, layer: "Flood Prone Areas" },
    licence: { name: "Creative Commons per Auckland Council Healthy Waters (the item says 'refer to Healthy Waters' and names no version; the Council default is CC BY 4.0)", url: ACOPEN, attribution: "Contains data from Auckland Council (Healthy Waters, WSP), Flood Prone Areas." },
    note: "Flood prone areas are depressions where water may pond if stormwater outlets block. " + HAZ_NOTE,
  });
}
async function floodProne({ lat, lon }) {
  const [a, n, d] = await Promise.all([arc(AC, "Flood_Prone_Areas", { lat, lon }), arc(AC, "Flood_Prone_Areas", { lat, lon, distance: NEAR_M }), layerDate(AC, "Flood_Prone_Areas")]);
  return parseFloodProne(a, n, asOfNote(d));
}

export function parseOverland(j, asOf) {
  const rows = attrs(j);
  return liveFact("site.overlandFlow", "Overland flow paths nearby", {
    asOf, cadence: "ad hoc, with Auckland Council LiDAR updates", value: rows.length, unit: `mapped path segments within ${OLFP_M} m${j.exceededTransferLimit ? " (at least)" : ""}`,
    values: { segmentsWithinReach: rows.length, atLeast: !!j.exceededTransferLimit, reachM: OLFP_M, catchmentAreaGroups: [...new Set(rows.map((a) => a.CatchmentAreaGroup).filter((x) => x != null))].sort() },
    source: { name: "Auckland Council Healthy Waters, Overland Flow Paths", url: "https://data-aucklandcouncil.opendata.arcgis.com/", service: `${AC}/Overland_Flow_Paths/FeatureServer/0`, layer: "Overland Flow Paths" },
    licence: { name: "Creative Commons per Auckland Council Healthy Waters (the item says 'refer to Healthy Waters' and names no version; the Council default is CC BY 4.0)", url: ACOPEN, attribution: "Contains data from Auckland Council (Healthy Waters, WSP), Overland Flow Paths." },
    note: "Overland flow paths show where surface water would run when the stormwater network is overloaded. They come from LiDAR terrain (2016-17), not from hydraulic modelling. The count is of line segments, not of separate streams. " + HAZ_NOTE,
  });
}
async function overlandFlow({ lat, lon }) {
  const [j, d] = await Promise.all([arc(AC, "Overland_Flow_Paths", { lat, lon, distance: OLFP_M, outFields: "CatchmentAreaGroup" }), layerDate(AC, "Overland_Flow_Paths")]);
  return parseOverland(j, asOfNote(d));
}

export function parseCoastal(now, plus1, asOfNow) {
  const one = (j) => attrs(j).map((a) => ({ probabilityPercent: a.AEP_percent ?? null, returnPeriodYears: a.ARI_years ?? null, seaLevelRise: a.SeaLevelRiseScenario ?? null, model: a.ModelType ?? null, author: a.Author ?? null, status: a.Status ?? null }));
  const a = one(now), b = one(plus1);
  return liveFact("site.coastalInundation", "Coastal storm-tide flooding (1% annual chance)", {
    asOf: asOfNow, cadence: "updated as Auckland Council revises the NIWA storm-tide models", value: a.length ? "inside the mapped extent today" : "outside the mapped extent today", unit: "",
    values: { today: { inside: a.length > 0, matches: a }, withOneMetreSeaLevelRise: { inside: b.length > 0, matches: b } },
    source: { name: "Auckland Council, Coastal Inundation 1% AEP (and 1% AEP + 1 m sea level rise)", url: "https://data-aucklandcouncil.opendata.arcgis.com/", service: `${AC}/Coastal_Inundation_1_AEP/FeatureServer/0`, layer: "Coastal Inundation - 1 % AEP; Coastal Inundation - 1% AEP 1m sea level rise" },
    licence: { name: "Creative Commons (the item says 'available to the public under Creative Commons license' and names no version; the Council default is CC BY 4.0)", url: ACOPEN, attribution: "Contains data from Auckland Council (Coastal Inundation, NIWA)." },
    note: "Sea-water coverage from a storm-tide (tide, surge and wave set-up). It leaves out wave run-up, overtopping, rainfall flooding and coastal erosion. " + HAZ_NOTE,
  });
}
async function coastal({ lat, lon }) {
  const [a, b, d] = await Promise.all([arc(AC, "Coastal_Inundation_1_AEP", { lat, lon }), arc(AC, "Coastal_Inundation_1_AEP_1m_sea_level_rise", { lat, lon }), layerDate(AC, "Coastal_Inundation_1_AEP")]);
  return parseCoastal(a, b, asOfNote(d));
}

export function parseTsunami(j, asOf) {
  const rows = attrs(j).map((a) => ({ zone: a.ZONETYPE ?? null, note: a.COMMENTS ?? null }));
  return liveFact("site.tsunami", "Tsunami evacuation zone", {
    asOf, cadence: "occasional (modelling by eCoast, 2023)", value: rows.length ? rows.map((r) => r.zone).join(", ") + " zone" : "not in a mapped evacuation zone", unit: "",
    values: { inside: rows.length > 0, zones: rows },
    source: { name: "Auckland Emergency Management, Auckland Tsunami Evacuation Zones (eCoast, GNS Science)", url: "https://data-aucklandcouncil.opendata.arcgis.com/", service: `${AC}/Tsunami_Evacuation_Zones/FeatureServer/0`, layer: "Tsunami Evacuation Zones" },
    licence: { name: "No licence is stated on the item; the Council default is CC BY 4.0", url: ACOPEN, attribution: "Contains data from Auckland Emergency Management and Auckland Council (eCoast, GNS Science)." },
    note: "Evacuation zones are for emergency planning. They are not a building or design hazard rating. " + HAZ_NOTE,
  });
}
async function tsunami({ lat, lon }) {
  const [j, d] = await Promise.all([arc(AC, "Tsunami_Evacuation_Zones", { lat, lon, outFields: "ZONETYPE,COMMENTS" }), layerDate(AC, "Tsunami_Evacuation_Zones")]);
  return parseTsunami(j, asOfNote(d));
}

const LAND_NOTE = "Susceptibility says where landslides are more or less likely to start; it does not say how often one will happen, and it is not a geotechnical report or a site assessment.";
export function parseShallowLandslide(j, asOf) {
  const a = attrs(j)[0];
  return liveFact("site.landslideShallow", "Shallow landslide susceptibility (2025)", {
    asOf, cadence: "occasional (2025 regional mapping)", value: a ? a.SusceptibilityValue ?? null : null, unit: "",
    values: a ? { susceptibility: a.SusceptibilityValue ?? null, code: a.SusceptibilityCode ?? null, slopeDegrees: a.Slope ?? null, cellAreaM2: 1024, subRegion: a.SubRegion ?? null, method: a.MeanPredSource ?? null } : { susceptibility: null },
    source: { name: "Auckland Council, Shallow Landslide Susceptibility 2025", url: "https://data-aucklandcouncil.opendata.arcgis.com/", service: `${AC}/Shallow_Landslide_Susceptibility/FeatureServer/0`, layer: "Shallow Landslide Susceptibility" },
    licence: { ...L_AC, name: "CC BY 4.0 (stated on the item)" }, note: (a ? "" : "No mapped cell at this point. ") + LAND_NOTE + " The cell is 32 m by 32 m.",
  });
}
export function parseLargeLandslide(j, asOf) {
  const a = attrs(j)[0];
  return liveFact("site.landslideLarge", "Large-scale landslide susceptibility (2025)", {
    asOf, cadence: "occasional (2025 regional mapping)", value: a ? a.SusceptibilityValue ?? null : null, unit: "",
    values: a ? { susceptibility: a.SusceptibilityValue ?? null, code: a.SusceptibilityCode ?? null, confidence: a.Confidence ?? null, totalScore: a.TotalScore ?? null, slopeUnitAreaM2: a.Shape__Area != null ? round(a.Shape__Area, 0) : null, zone: a.Zone ?? null } : { susceptibility: null },
    source: { name: "Auckland Council, Large Scale Landslide Susceptibility 2025", url: "https://data-aucklandcouncil.opendata.arcgis.com/", service: `${AC}/Large_Scale_Landslide_Susceptibility/FeatureServer/0`, layer: "Large Scale Landslide Susceptibility" },
    licence: { ...L_AC, name: "CC BY 4.0 (stated on the item)" }, note: (a ? "" : "No mapped slope unit at this point. ") + LAND_NOTE + " The mapped unit is a whole slope (often several hectares), so it is coarse.",
  });
}
async function landslideShallow({ lat, lon }) { const [j, d] = await Promise.all([arc(AC, "Shallow_Landslide_Susceptibility", { lat, lon, outFields: "SusceptibilityValue,SusceptibilityCode,Slope,SubRegion,MeanPredSource" }), layerDate(AC, "Shallow_Landslide_Susceptibility")]); return parseShallowLandslide(j, asOfNote(d)); }
async function landslideLarge({ lat, lon }) { const [j, d] = await Promise.all([arc(AC, "Large_Scale_Landslide_Susceptibility", { lat, lon, outFields: "SusceptibilityValue,SusceptibilityCode,Confidence,TotalScore,Zone,Shape__Area" }), layerDate(AC, "Large_Scale_Landslide_Susceptibility")]); return parseLargeLandslide(j, asOfNote(d)); }

export function parseLiquefaction(j, asOf) {
  const a = attrs(j)[0];
  return liveFact("site.liquefaction", "Liquefaction vulnerability (basic desktop assessment)", {
    asOf, cadence: "rarely (University of Auckland study, 2022 version)", value: a ? a.Vulnerability ?? null : null, unit: "",
    values: a ? { vulnerability: a.Vulnerability ?? null, description: a.VulnerabilityDescription ?? null, assessmentLevel: a.LiquefactionAssessmentLevel ?? null, recordStatus: a.RecordStatus ?? null } : { vulnerability: null },
    source: { name: "Auckland Council, Liquefaction Vulnerability Basic Assessment (University of Auckland Uniservices)", url: "https://data-aucklandcouncil.opendata.arcgis.com/", service: `${AC}/Liquefaction_Vulnerability_Basic_Assessment/FeatureServer/0`, layer: "Liquefaction Vulnerability Basic Assessment" },
    licence: { ...L_AC, name: "CC BY 4.0 (stated on the item)" },
    note: (a ? "" : "No mapped area at this point. ") + "Level A is a desktop study from geology maps, groundwater and seismic hazard; it flags where more investigation is needed. It is not a geotechnical assessment.",
  });
}
async function liquefaction({ lat, lon }) { const [j, d] = await Promise.all([arc(AC, "Liquefaction_Vulnerability_Basic_Assessment", { lat, lon, outFields: "Vulnerability,VulnerabilityDescription,LiquefactionAssessmentLevel,RecordStatus" }), layerDate(AC, "Liquefaction_Vulnerability_Basic_Assessment")]); return parseLiquefaction(j, asOfNote(d)); }

// ---- weather now and today's sun times (Open-Meteo) -------------------------------------------------------------------------------
export function weatherUrl({ lat, lon }) {
  return `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,wind_direction_10m,cloud_cover,precipitation,is_day&daily=sunrise,sunset,daylight_duration&forecast_days=1&timezone=Pacific%2FAuckland`;
}
export function parseSiteWeather(j) {
  const c = j.current || {}, d = j.daily || {};
  if (c.temperature_2m == null) throw new Error("weather: no current temperature");
  return liveFact("site.weather", "Weather now and today's sun times", {
    asOf: c.time, cadence: "hourly model run", value: round(c.temperature_2m, 1), unit: "°C",
    values: { at: c.time, tempC: c.temperature_2m, feelsC: c.apparent_temperature, humidity: c.relative_humidity_2m, windKmh: c.wind_speed_10m, gustKmh: c.wind_gusts_10m ?? null, windFromDeg: c.wind_direction_10m ?? null,
      cloudPct: c.cloud_cover, rainMm: c.precipitation, isDay: !!c.is_day, sunrise: d.sunrise?.[0] ?? null, sunset: d.sunset?.[0] ?? null, daylightHours: d.daylight_duration?.[0] != null ? round(d.daylight_duration[0] / 3600, 2) : null, timezone: "Pacific/Auckland (local times)", gridCell: j.latitude != null && j.longitude != null ? { lat: j.latitude, lon: j.longitude } : null },
    source: { name: "Open-Meteo (weather models, grid cell nearest the point)", url: "https://open-meteo.com/", service: "https://api.open-meteo.com/v1/forecast", layer: "current, daily sunrise and sunset" },
    licence: { name: "Open-Meteo data CC BY 4.0; the free API is for non-commercial use only", url: "https://open-meteo.com/en/terms", attribution: "Weather data by Open-Meteo.com (CC BY 4.0).",
      caveat: "Open-Meteo's free tier may only be used for non-commercial purposes. assembl needs a paid Open-Meteo plan, or another source, before this is used in a paid product." },
    note: "Modelled for the weather-model grid cell nearest the point (its centre is in values.gridCell, which can be a few kilometres away), not measured on the site.",
    limits: "Open-Meteo free tier: under 10,000 calls a day, 5,000 an hour, 600 a minute, per IP address.",
  });
}
async function weather({ lat, lon }) { return parseSiteWeather(await getJSON(weatherUrl({ lat, lon }))); }

// ---- facts that are not wired, said plainly ----------------------------------------------------------------------------------------
const NOT_WIRED = () => [
  notWiredFact("site.nzs3604Zones", "Wind, earthquake, exposure (corrosion) and snow zones (NZS 3604)",
    "Not wired: terms. BRANZ Maps is a website for people (listed on the Building CodeHub, which links to a BRANZ page and an ArcGIS Experience). BRANZ publishes no open data service for it and no terms that allow automated use, and its site sits behind a bot challenge that we do not work around.",
    { source: { name: "BRANZ Maps", url: "https://codehub.building.govt.nz/resources/branz-maps" }, needs: "A written yes from BRANZ, or a person reading the zones off BRANZ Maps for the site." }),
  notWiredFact("site.elevation", "Ground height at the point", "In the model already: the 3D twin holds the LINZ 1 m LiDAR height grid for the site. Auckland Council's 0.5 m DEM is published as a tiles-only image service, which has no point query.",
    { source: { name: "LINZ 1 m LiDAR, inside the twin (site.terrain)", url: "https://data.linz.govt.nz/" } }),
  notWiredFact("site.coastalErosion", "Coastal erosion and instability (ASCIE)",
    "Not wired: the open layer (Areas Susceptible to Coastal Instability or Erosion, levels A, B and C for 2050, 2080 and 2130) is lines, not areas, so a point answer would need interpretation we would be guessing at. Its item names no licence. The service exists at the URL in source.",
    { source: { name: "Auckland Council, CoastalInstabilityAndErosion", url: `${AC}/CoastalInstabilityAndErosion/FeatureServer` } }),
];

// ---- the group ------------------------------------------------------------------------------------------------------------------------
export const SITE_FACTS = { parcel, zone, overlays, floodPlain, floodProne, overlandFlow, coastalInundation: coastal, tsunami, landslideShallow, landslideLarge, liquefaction, weather };

export function sitePoint({ lat, lon, lng }) {
  const la = +lat, lo = +(lon ?? lng);
  if (!inNZ(la, lo)) throw new Error("site: lat and lon (WGS84 decimal degrees, inside New Zealand) are required, for example ?feeds=site&lat=-36.80&lon=175.08");
  return { lat: round(la, 5), lon: round(lo, 5) }; // about a metre; the parcel, zone and hazard layers are not finer than that
}

export async function fetchSite(params) {
  const point = sitePoint(params);
  const ids = Object.keys(SITE_FACTS);
  // Nothing is kept between requests except each layer's own edit date: a fact marked Live came from the publisher during this request
  // (the edge cache in front may replay an earlier answer, and fetchedAt says when it was fetched).
  const settled = await Promise.allSettled(ids.map((id) => SITE_FACTS[id](point)));
  const facts = {};
  settled.forEach((s, i) => {
    const id = ids[i];
    facts[id] = s.status === "fulfilled" ? s.value : unavailableFact("site." + id, id, "The source did not answer: " + String(s.reason?.message || s.reason).slice(0, 200));
  });
  for (const f of NOT_WIRED()) facts[f.id.replace(/^site\./, "")] = f;
  const failed = Object.values(facts).filter((f) => f.status === "unavailable").length;
  const live = Object.values(facts).filter((f) => f.status === "live").length;
  return {
    id: "site", label: `Site facts at ${point.lat}, ${point.lon}`, value: live, unit: "facts answered live", values: { point, counts: { live, unavailable: failed, notWired: Object.values(facts).filter((f) => f.status === "not-wired").length } }, facts,
    asOf: new Date().toISOString().slice(0, 10), period: "now", fetchedAt: new Date().toISOString(), cadence: "hourly",
    source: { name: "LINZ Data Service; Auckland Council open data; Open-Meteo (each fact names its own source and licence)", url: "https://lab.assembl.co.nz/" },
    truth: failed ? "Partial" : "Live", truthLabel: failed ? `${live} facts answered live, ${failed} unavailable: see each fact` : "Live", status: "live",
    note: "Facts for a person to read: where the land is, what the maps say about it, and what the weather is doing. This is not a planning, hazard or Building Code assessment, and no fact here says whether the site meets any rule.",
  };
}
