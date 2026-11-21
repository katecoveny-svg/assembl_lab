// Saves small real responses for the offline tests in tests/live/site.test.mjs. Run by hand: node tests/live/capture-fixtures.mjs
// Uses the same URL builders as the feed. Nothing that names a person or identifies a title is saved: the parcel query never asks for
// the legal description, titles or surveys, and the fixture adds those three keys set to "redacted" so a test can prove they are never returned.
import fs from "node:fs";
import { arcQueryUrl, PARCEL_FIELDS, OVERLAYS, weatherUrl } from "../../api/_feeds/site.js";

const AC = "https://services1.arcgis.com/n4yPwebTjJCmXB6W/ArcGIS/rest/services", LINZ = "https://services.arcgis.com/xdsHIIxuCWByZiCB/arcgis/rest/services";
const P = { lat: -36.80, lon: 175.08 };
const dir = new URL("./fixtures/", import.meta.url);
const get = async (u) => { const r = await fetch(u, { headers: { "user-agent": "assembl-lab/1.0 (+https://lab.assembl.co.nz)" } }); if (!r.ok) throw new Error(r.status + " " + u); return r.json(); };
const save = (name, j) => { fs.writeFileSync(new URL(name + ".json", dir), JSON.stringify(j, null, 1) + "\n"); console.log("saved", name); };
// keep only the coded-value domains actually used by the returned rows
const trim = (j, keepFeatures = 99) => {
  if (!j.features) return j;
  j.features = j.features.slice(0, keepFeatures);
  if (j.fields) j.fields = j.fields.filter((f) => f.domain?.codedValues && j.features.some((x) => (x.attributes || {})[f.name] != null)).map((f) => ({ name: f.name, domain: { type: "codedValue", codedValues: f.domain.codedValues.filter((c) => j.features.some((x) => x.attributes[f.name] === c.code)) } }));
  delete j.uniqueIdField; delete j.geometryProperties; delete j.spatialReference;
  for (const f of j.features) { delete f.attributes.GlobalID; delete f.attributes.OBJECTID; delete f.attributes.SDEObjectID; }
  return j;
};
const bbox = (svc) => `${AC}/${svc}/FeatureServer/0/query?` + new URLSearchParams({ geometry: "174.95,-36.92,175.22,-36.74", geometryType: "esriGeometryEnvelope", inSR: "4326", spatialRel: "esriSpatialRelIntersects", outFields: "*", returnGeometry: "false", f: "json" });

// the test point
const parcel = await get(arcQueryUrl(LINZ, "LINZ_NZ_Primary_Parcels", { ...P, geometry: true, outFields: PARCEL_FIELDS }));
for (const f of parcel.features) delete f.properties.OBJECTID;
parcel.features[0].properties.appellation = "redacted"; parcel.features[0].properties.titles = "redacted"; parcel.features[0].properties.affected_surveys = "redacted";
save("parcel", parcel);
save("zone", trim(await get(arcQueryUrl(AC, "Unitary_Plan_Base_Zone", { ...P, outFields: "ZONE,GROUPZONE,VERSIONSTATUS" }))));
save("overlays-empty", trim(await get(arcQueryUrl(AC, "Significant_Ecological_Areas_Overlay", { ...P, outFields: "SCHEDULE,NAME" }))));
save("flood-plain-empty", trim(await get(arcQueryUrl(AC, "Flood_Plains", P))));
save("flood-plain-near", trim(await get(arcQueryUrl(AC, "Flood_Plains", { ...P, distance: 50 }))));
save("flood-prone-empty", trim(await get(arcQueryUrl(AC, "Flood_Prone_Areas", P))));
save("flood-prone-near", trim(await get(arcQueryUrl(AC, "Flood_Prone_Areas", { ...P, distance: 50 }))));
save("olfp", trim(await get(arcQueryUrl(AC, "Overland_Flow_Paths", { ...P, distance: 25, outFields: "CatchmentAreaGroup" })), 6));
save("coastal-empty", trim(await get(arcQueryUrl(AC, "Coastal_Inundation_1_AEP", P))));
save("tsunami-empty", trim(await get(arcQueryUrl(AC, "Tsunami_Evacuation_Zones", { ...P, outFields: "ZONETYPE,COMMENTS" }))));
save("landslide-shallow", trim(await get(arcQueryUrl(AC, "Shallow_Landslide_Susceptibility", { ...P, outFields: "SusceptibilityValue,SusceptibilityCode,Slope,SubRegion,MeanPredSource" }))));
save("landslide-large", trim(await get(arcQueryUrl(AC, "Large_Scale_Landslide_Susceptibility", { ...P, outFields: "SusceptibilityValue,SusceptibilityCode,Confidence,TotalScore,Zone,Shape__Area" }))));
save("liquefaction", trim(await get(arcQueryUrl(AC, "Liquefaction_Vulnerability_Basic_Assessment", { ...P, outFields: "Vulnerability,VulnerabilityDescription,LiquefactionAssessmentLevel,RecordStatus" }))));
save("weather", await get(weatherUrl(P)));
// hits from elsewhere on the island, only to show the shape of a hit (attributes only, no geometry)
save("coastal-hit", trim(await get(bbox("Coastal_Inundation_1_AEP")), 1));
save("tsunami-hit", trim(await get(bbox("Tsunami_Evacuation_Zones")), 1));
save("overlay-hit-sea", trim(await get(bbox("Significant_Ecological_Areas_Overlay")), 1));
save("overlay-hit-tree", trim(await get(bbox("Notable_Trees_Overlay")), 1));
// layer metadata (edit date) for one layer
const m = await get(`${AC}/Unitary_Plan_Base_Zone/FeatureServer/0?f=json`); save("layer-meta", { editingInfo: { dataLastEditDate: m.editingInfo?.dataLastEditDate } });
