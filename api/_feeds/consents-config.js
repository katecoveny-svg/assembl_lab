// consents-config: the ONE small file that says which Stats NZ tables and codes the building consents feed reads (consents.js, consents-parse.js).
// The ids and codes below are the best reading of the Aotearoa Data Explorer (ADE) docs, NOT confirmed against the live catalogue: the catalogue
// cannot be listed without a subscription key. After the key is set, open
//     /api/live/?feeds=consents&discover=1
// on the deployed lab, read the real dataflow ids, and correct FLOW_DEFAULTS (or set the env names below, where the runtime passes them: Node and
// tests do; Cloudflare Pages passes only STATSNZ_API_KEY from functions/api/live.js, so there the correction is an edit to this file).
// Read from the ADE API user guide on 23 Nov 2026 (docs/live-data.md has the links).
import { envVar } from "./util.js";

export const ADE_BASE = "https://api.data.stats.govt.nz/rest/"; // the only host the feed talks to
export const KEY_HEADER = "Ocp-Apim-Subscription-Key"; // the ADE API user guide and the API portal both name this header
export const KEY_NAME = "STATSNZ_API_KEY"; // the Cloudflare Pages secret; read only through envVar(), sent only in KEY_HEADER, never returned or logged

/** Dataflows: [agency, id, version]. "latest" is the guide's own default. GUESSES: confirm with ?discover=1. */
export const FLOW_DEFAULTS = {
  nonres: { agency: "STATSNZ", id: "BLD_BLD_002", version: "latest", what: "non-residential consents by region and building type: value and number" },
  dwellings: { agency: "STATSNZ", id: "BLD_BLD_001", version: "latest", what: "new dwellings by region: number" },
};

/** Which dimension of a table plays which part. Candidates are tried in order; the first dimension whose id matches wins. Env: CONSENTS_DIM_REGION etc. */
export const DIM_DEFAULTS = {
  region: ["REGION", "REGIONAL_COUNCIL", "AREA", "REGC"],
  type: ["BUILDING_TYPE", "BLDG_TYPE", "BUILDING", "TYPE", "USE"],
  measure: ["MEASURE", "MEAS", "VARIABLE", "INDICATOR"],
};
export const DIM_FALLBACK = { region: /region|area|council/i, type: /build|type|use|categor/i, measure: /measure|variable|indicator/i };

/** Value is published in thousands of dollars in Infoshare ("$000"). An UNIT_MULT attribute in the answer, when there is one, wins over this. Env: CONSENTS_VALUE_MULT. */
export const VALUE_MULT_DEFAULT = 1000;

/** Measures: a code (exact, upper case) or a label pattern. Anything else in the measure dimension is dropped. */
export const MEASURES = {
  value: { codes: ["VALUE", "VAL", "VALUE_OF_BUILDING_WORK"], match: /\bvalue\b/i },
  count: { codes: ["NUMBER", "NUM", "COUNT", "NUMBER_OF_BUILDINGS", "NUMBER_OF_DWELLINGS"], match: /number|count|dwellings|buildings/i },
};

/** The building types an architecture practice cares about. A series matches by code (exact) or label. Anything not here is dropped, except the totals. */
export const TYPES = [
  { key: "education", label: "Education", codes: [], match: /\beducation|\bschools?\b|\btertiary|\buniversit|\bearly childhood/i },
  { key: "health", label: "Health", codes: [], match: /\bhealth|\bhospitals?\b|\bmedical|\baged care|\bnursing|\brest home/i },
  { key: "community", label: "Community", codes: [], match: /\bcommunity|\bsocial\b|\bcultural|\brecreation|\breligious|\bplaces? of worship|\bsports?\b/i },
  { key: "offices", label: "Offices", codes: [], match: /\boffices?\b|\badministration|\bpublic transport/i },
  { key: "retail", label: "Retail and hospitality", codes: [], match: /\bretail|\bhospitality|\bshops?\b|\brestaurants?\b|\bbars?\b|\baccommodation|\bhotels?\b|\bhostels?\b/i },
  { key: "industrial", label: "Industrial", codes: [], match: /\bfactor(y|ies)\b|\bindustrial|\bstorage|\bwarehouse|\bfarm/i },
];
/** A series that is the whole of non-residential building (so the six types are not added up when it is there). */
export const NONRES_TOTAL = /^(total )?non-?residential( buildings?)?( total)?$/i;
/** In the dwellings table: the series that is new dwellings, all kinds together. */
export const DWELLINGS_TOTAL = /^(total )?(new )?(residential )?dwellings?( units)?( total)?$|^new dwellings$|^total$/i;
/** The whole country, and not a region. */
export const NATIONAL = /^(total( new zealand)?|new zealand|all regions|national|nz)$/i;

/** Region names as Stats NZ writes them that the lab spells another way (compared with accents and punctuation removed). */
export const REGION_ALIASES = { manawatuwhanganui: "Manawatu-Wanganui", manawatuwanganui: "Manawatu-Wanganui", hawkesbay: "Hawke's Bay", gisbornetairawhiti: "Gisborne", tairawhitigisborne: "Gisborne" };

export const LIMITS = { ms: 8000, maxChars: 6_000_000, maxObs: 200_000, monthsBack: 16, discoverMax: 25, discoverChars: 3_000_000, perRegionBytes: 2048, topTypes: 3 };

const FLOW_RE = /^[A-Za-z0-9_]{2,24},[A-Za-z0-9_.\-]{2,60}(,[A-Za-z0-9_.]{1,12})?$/;
/** The configured flows, with any valid env override ("AGENCY,ID" or "AGENCY,ID,VERSION"). A malformed override is ignored. */
export function flows(env) {
  const out = {};
  for (const [k, d] of Object.entries(FLOW_DEFAULTS)) {
    const raw = envVar(`CONSENTS_${k.toUpperCase()}_FLOW`, env);
    const m = typeof raw === "string" && FLOW_RE.test(raw.trim()) ? raw.trim().split(",") : null;
    out[k] = m ? { ...d, agency: m[0], id: m[1], version: m[2] || "latest" } : { ...d };
  }
  return out;
}
export function dimIds(env) {
  const out = {};
  for (const [role, d] of Object.entries(DIM_DEFAULTS)) {
    const raw = envVar(`CONSENTS_DIM_${role.toUpperCase()}`, env);
    out[role] = typeof raw === "string" && /^[A-Za-z0-9_]{1,40}$/.test(raw.trim()) ? [raw.trim().toUpperCase(), ...d] : d;
  }
  return out;
}
export function valueMult(env) {
  const n = Number(envVar("CONSENTS_VALUE_MULT", env));
  return [1, 1000, 1000000].includes(n) ? n : VALUE_MULT_DEFAULT;
}
