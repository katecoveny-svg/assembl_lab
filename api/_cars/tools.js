// assembl lab · Agent-ready cars: the tool logic behind /api/mcp and the /cars/ page.
// One source, two homes: the MCP function imports this file from api/_cars/, and the lab build copies it to /cars/tools.js so
// the page runs the same functions in the browser when the endpoint can't be reached. No Node APIs, no dependencies.
//
// Truth labels (never blurred): Simulated (the demo dealer and its stock are invented), Source (copied from an official
// document), Estimate (an assumption we state, with its basis), Your data (facts the buyer or the chat passed in),
// Live / Latest published (a public feed, with its period). Nothing here looks a car up by plate or owner, fetches a listing
// page, or contacts a dealer: the two "write" tools only return a request a person at the (fictional) dealer would have to confirm.
// car_check adds model-level facts from NZTA's open Motor Vehicle Register (./register.js): counts by make, model and year only.
//
// Directory readiness (v1.1, 26 Oct 2026; docs checked that day): every tool has a title, a "Use this when…" description,
// documented parameters with examples, closed enums (16 NZ regions, fuel, body, must-haves), explicit annotations and an
// outputSchema; results carry no request, trace or session ids and no fetch timestamps; location is a region, never a town.

import { lookupModel, registerCues, registerLine, SOURCE as REGISTER_SOURCE } from "./register.js";

export const VERSION = "1.1.0";
// TODO(Kate): the permanent home is an assembl.co.nz address. When the endpoint moves, change SITE_URL (and the images move with it).
export const SITE_URL = "https://assembl-lab.vercel.app";
export const MCP_URL = `${SITE_URL}/api/mcp/`;
export const IMG_BASE = `${SITE_URL}/cars/img/`;
export const IMAGE_LABEL = "Render · simulated car";
export const IMAGE_NOTE = "Every image is a studio render of a Simulated car from assembl's 3D car kit, not a photograph.";

// ---------- the fictional dealer group -------------------------------------------------------------------------------
export const DEALER = {
  name: "Harbour Lane Motors (demo)",
  note: "A fictional dealer group invented for this demonstration. It has no yard, no phone and no stock; every listing is Simulated.",
  sites: {
    auckland: { id: "auckland", name: "Harbour Lane Motors Auckland (demo)", town: "Auckland", address: "1 Harbour Lane, Penrose, Auckland (fictional address)", region: "Auckland", lat: -36.910, lon: 174.815 },
    hamilton: { id: "hamilton", name: "Harbour Lane Motors Hamilton (demo)", town: "Hamilton", address: "2 Harbour Lane, Te Rapa, Hamilton (fictional address)", region: "Waikato", lat: -37.745, lon: 175.236 },
    tauranga: { id: "tauranga", name: "Harbour Lane Motors Tauranga (demo)", town: "Tauranga", address: "3 Harbour Lane, Mount Maunganui (fictional address)", region: "Bay of Plenty", lat: -37.660, lon: 176.195 },
  },
  contact: "hello@harbourlane.example (not monitored: .example is a reserved test domain)",
  traderNote: "Invented number in a format no real trader uses. Real traders are on the Motor Vehicle Traders Register.",
  hours: { weekday: [9, 10, 11, 13, 14, 15, 16], saturday: [9, 10, 11, 12, 13, 14], sunday: [] },
};

// ---------- New Zealand's 16 regions (the only location the tools take) --------------------------------------------
// Each region's main centre gives the distance to the dealer's sites and the MBIE household power price (QSDEP location,
// in MBIE's own spelling). A region, never a town, street or coordinates: the plugin guidelines ask for no raw location fields.
export const REGIONS = [
  { name: "Northland", centre: "Whangārei", lat: -35.725, lon: 174.323, qsdep: "Whangarei" },
  { name: "Auckland", centre: "Tāmaki Makaurau Auckland", lat: -36.85, lon: 174.76, qsdep: "Auckland Central" },
  { name: "Waikato", centre: "Kirikiriroa Hamilton", lat: -37.79, lon: 175.28, qsdep: "Hamilton" },
  { name: "Bay of Plenty", centre: "Tauranga", lat: -37.69, lon: 176.17, qsdep: "Tauranga" },
  { name: "Gisborne", centre: "Gisborne", lat: -38.66, lon: 178.02, qsdep: "Gisborne" },
  { name: "Hawke's Bay", centre: "Napier", lat: -39.49, lon: 176.91, qsdep: "Napier" },
  { name: "Taranaki", centre: "New Plymouth", lat: -39.06, lon: 174.08, qsdep: "New Plymouth" },
  { name: "Manawatū-Whanganui", centre: "Palmerston North", lat: -40.35, lon: 175.61, qsdep: "Palmerston North" },
  { name: "Wellington", centre: "Te Whanganui-a-Tara Wellington", lat: -41.29, lon: 174.78, qsdep: "Wellington City" },
  { name: "Tasman", centre: "Richmond", lat: -41.34, lon: 173.18, qsdep: "Richmond" },
  { name: "Nelson", centre: "Whakatū Nelson", lat: -41.27, lon: 173.28, qsdep: "Nelson" },
  { name: "Marlborough", centre: "Blenheim", lat: -41.51, lon: 173.95, qsdep: "Blenheim" },
  { name: "West Coast", centre: "Greymouth", lat: -42.45, lon: 171.21, qsdep: "Greymouth" },
  { name: "Canterbury", centre: "Ōtautahi Christchurch", lat: -43.53, lon: 172.64, qsdep: "Christchurch" },
  { name: "Otago", centre: "Ōtepoti Dunedin", lat: -45.87, lon: 170.50, qsdep: "Dunedin" },
  { name: "Southland", centre: "Waihōpai Invercargill", lat: -46.41, lon: 168.35, qsdep: "Invercargill" },
];
export const REGION_NAMES = REGIONS.map((r) => r.name);
const fold = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z ]+/g, " ").replace(/\s+/g, " ").trim();
const rkey = (s) => fold(s).replace(/ /g, "");
const REGION_ALIASES = { hawkesbay: "Hawke's Bay", manawatuwanganui: "Manawatū-Whanganui", bop: "Bay of Plenty", tamakimakaurau: "Auckland", tetaitokerau: "Northland", tetairawhiti: "Gisborne", eastcape: "Gisborne" };
export const regionByName = (s) => { const k = rkey(s); if (!k) return null; return REGIONS.find((r) => rkey(r.name) === k) || (REGION_ALIASES[k] ? REGIONS.find((r) => r.name === REGION_ALIASES[k]) : null) || null; };
// Words a buyer (or a host's coarse location hint) might use, mapped to a region. Used only to turn words into a region
// (the page's paste reader, ChatGPT's openai/userLocation hint); no tool takes a town as input.
export const TOWNS = {
  "kerikeri": "Northland", "whangarei": "Northland", "kaitaia": "Northland", "auckland": "Auckland", "north shore": "Auckland", "manukau": "Auckland", "pukekohe": "Auckland", "waiheke": "Auckland",
  "hamilton": "Waikato", "kirikiriroa": "Waikato", "cambridge": "Waikato", "te awamutu": "Waikato", "taupo": "Waikato", "thames": "Waikato", "tauranga": "Bay of Plenty", "mount maunganui": "Bay of Plenty",
  "mt maunganui": "Bay of Plenty", "papamoa": "Bay of Plenty", "rotorua": "Bay of Plenty", "whakatane": "Bay of Plenty", "gisborne": "Gisborne", "napier": "Hawke's Bay", "hastings": "Hawke's Bay",
  "new plymouth": "Taranaki", "hawera": "Taranaki", "palmerston north": "Manawatū-Whanganui", "whanganui": "Manawatū-Whanganui", "wanganui": "Manawatū-Whanganui", "levin": "Manawatū-Whanganui",
  "wellington": "Wellington", "lower hutt": "Wellington", "upper hutt": "Wellington", "porirua": "Wellington", "masterton": "Wellington", "paraparaumu": "Wellington", "kapiti": "Wellington",
  "richmond": "Tasman", "motueka": "Tasman", "nelson": "Nelson", "blenheim": "Marlborough", "picton": "Marlborough", "greymouth": "West Coast", "westport": "West Coast", "hokitika": "West Coast",
  "christchurch": "Canterbury", "rangiora": "Canterbury", "ashburton": "Canterbury", "timaru": "Canterbury", "dunedin": "Otago", "queenstown": "Otago", "wanaka": "Otago", "oamaru": "Otago",
  "invercargill": "Southland", "gore": "Southland",
};
export function regionFromText(s) {
  const f = fold(s); if (!f) return null;
  const r = regionByName(f); if (r) return r;
  for (const reg of REGIONS) if (f.includes(fold(reg.name))) return reg;
  for (const [t, rn] of Object.entries(TOWNS)) if (new RegExp(`\\b${t}\\b`).test(f)) return regionByName(rn);
  if (/\btamaki\b|\bakl\b/.test(f)) return regionByName("Auckland");
  if (/\bhawke/.test(f)) return regionByName("Hawke's Bay");
  if (/\bmanawatu\b/.test(f)) return regionByName("Manawatū-Whanganui");
  if (/\bbop\b|bay of plenty/.test(f)) return regionByName("Bay of Plenty");
  return null;
}
// ChatGPT may send _meta["openai/userLocation"] ({ city, region, country, … }) as a coarse hint: use only a NZ region from it.
export function regionFromLocationHint(loc) {
  if (!loc || typeof loc !== "object") return null;
  if (loc.country && !/^(nz|new zealand|aotearoa)$/i.test(String(loc.country).trim())) return null;
  return regionFromText(loc.region) || regionFromText(loc.city) || null;
}
const siteRegion = (siteId) => regionByName(DEALER.sites[siteId].region);
const rad = (d) => (d * Math.PI) / 180;
export function km(a, b) {
  const R = 6371, dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

// ---------- official sources and rates ------------------------------------------------------------------------------
export const LINKS = {
  cin: { name: "Consumer Information Notice template (MBIE, Nov 2020)", url: "https://www.consumerprotection.govt.nz/assets/uploads/documents/consumer-information-notice-vehicle-trader.pdf" },
  traderDuties: { name: "Motor Vehicle Traders Register: traders' responsibilities to buyers", url: "https://motortraders.mbie.govt.nz/for-consumers/traders-responsibilities-to-buyers" },
  traderRegister: { name: "Motor Vehicle Traders Register (search a trader)", url: "https://motortraders.mbie.govt.nz/" },
  ppsr: { name: "PPSR: how the register helps when buying used goods", url: "https://ppsr.companiesoffice.govt.nz/help-centre/information-for-debtors-and-consumers/how-the-ppsr-can-help-when-buying-used-goods/" },
  wof: { name: "NZTA: check a vehicle's WOF and licence", url: "https://www.nzta.govt.nz/check-wof" },
  rightcar: { name: "RightCar (NZTA): safety rating and fuel economy", url: "https://rightcar.govt.nz/" },
  ruc: { name: "NZTA: RUC rates and transaction fees", url: "https://www.nzta.govt.nz/vehicles/road-user-charges/ruc-rates-and-transaction-fees" },
  ev: { name: "NZTA: RUC for electric vehicles", url: "https://nzta.govt.nz/vehicles/road-user-charges/ruc-for-electric-vehicles" },
};
// Credits for the public data the running cost uses (shown wherever the figures appear).
export const CREDITS = {
  fuel: { name: "MBIE weekly fuel price monitoring", licence: "CC BY 4.0", url: "https://www.mbie.govt.nz/building-and-energy/energy-and-natural-resources/energy-statistics-and-modelling/energy-statistics/weekly-fuel-price-monitoring" },
  power: { name: "MBIE Quarterly Survey of Domestic Electricity Prices", licence: "CC BY 4.0", url: "https://www.mbie.govt.nz/building-and-energy/energy-and-natural-resources/energy-statistics-and-modelling/energy-statistics/energy-prices/electricity-cost-and-price-monitoring" },
  ruc: { name: "NZTA Waka Kotahi road user charge rates", licence: null, url: LINKS.ruc.url },
};
// Light-vehicle road user charges, $ per 1,000 km incl. GST. Petrol and ordinary petrol hybrids pay excise inside the pump
// price instead (MBIE's "taxes" line). NOTE: nzta.govt.nz refused automated fetches from this build, so these are the rates in
// NZTA's table as transcribed by a secondary source on 25 Oct 2026 (table effective 6 Aug 2026). Check before relying on them.
export const RUC = {
  perThousandKm: { diesel: 76, electric: 76, "plug-in hybrid": 38 },
  asOf: "2026-08-06", checked: "2026-10-25",
  truth: "Latest published",
  label: "NZTA light-vehicle RUC rates (table effective 6 Aug 2026)",
  source: LINKS.ruc,
  caveat: "Transcribed from NZTA's RUC rate table; not fetched live from nzta.govt.nz (it refuses automated requests). Light EVs have paid RUC since 1 April 2024. Check NZTA before relying on a rate.",
};
// Built-in snapshots: used only when the live feed can't be reached (labelled "snapshot", never "Live").
export const SNAPSHOT = {
  fuel: {
    id: "fuel", label: "Fuel prices, national average (adjusted retail)", value: 357.9, unit: "c/L", asOf: "2026-10-16", period: "week to 16 Oct 2026",
    values: { date: "2026-10-16", status: "Provisional", petrol91: { retail: 357.9, taxes: 77.3 }, petrol95: { retail: 373.7, taxes: 77.3 }, diesel: { retail: 321.7, taxes: 0.9 }, retrieved: "2026-10-25", snapshot: true },
    truth: "Latest published", truthLabel: "Latest published · week to 16 Oct 2026", status: "snapshot", statusLabel: "snapshot · copied 2026-10-25",
    source: { name: "MBIE weekly fuel price monitoring", url: CREDITS.fuel.url },
    fetchedAt: "2026-10-25T00:00:00.000Z",
  },
  qsdep: {
    surveyDate: "2026-08-15", retrieved: "2026-10-25", basis: "8,000 kWh/yr",
    url: "https://www.mbie.govt.nz/assets/Data-Files/Energy/nz-energy-quarterly-and-energy-in-nz/qsdep-report-15Aug2026.pdf",
    national: { location: "New Zealand", totalCents: 42.1 },
    locations: [["Auckland Central", 41.3], ["Auckland North Shore", 41.33], ["Pukekohe", 45.7], ["Whangarei", 44.53], ["Hamilton", 39.78], ["Cambridge", 43.74], ["Tauranga", 45.01],
      ["Rotorua", 42.93], ["Taupo", 42.16], ["Gisborne", 48.37], ["New Plymouth", 43.47], ["Napier", 41.35], ["Palmerston North", 43.08], ["Wellington City", 37.2], ["Richmond", 38.78], ["Nelson", 38.43],
      ["Blenheim", 47.12], ["Greymouth", 48.53], ["Christchurch", 38.61], ["Dunedin", 42.49], ["Queenstown", 42.38], ["Invercargill", 39.02]].map(([location, totalCents]) => ({ location, totalCents })),
  },
};
// Stated assumptions for the parts of running cost no public feed covers. Each is labelled Estimate wherever it appears.
export const ESTIMATES = {
  licence: { annual: 115, basis: "About $115 a year to licence (register) a light passenger vehicle; the exact fee depends on the vehicle. Check NZTA's fee before you rely on it." },
  wof: { annual: 70, basis: "About $70 for a WOF inspection (each inspector sets its own price), assumed once a year. NZTA sets how often; the rules are under review." },
  maintenance: { electric: 420, hybrid: 620, petrol: 680, "plug-in hybrid": 640, diesel: 880, olderFactor: 1.2,
    basis: "assembl assumption for servicing, tyres and brakes by fuel type, plus 20% for cars over eight years old. Not a quote." },
  chargingLoss: 0.10,
  phevElectricShare: 0.5,
};

// ---------- the Consumer Information Notice, as data -----------------------------------------------------------------
// Order and wording follow MBIE's example CIN (Nov 2020) under the Consumer Information Standards (Used Motor Vehicles)
// Regulations 2008. A dealer (motor vehicle trader) must display one on every used vehicle offered for sale, online too.
// `arg` is the matching car_check input for a listing the chat already has. For the supplier and the VIN, car_check asks only
// whether the listing shows them (yes/no), never the values: it needs no names, addresses or identifiers to do its job.
export const CIN_FIELDS = [
  { key: "supplier.name", label: "Supplier name", section: "Supplier", arg: "supplier_details_shown", type: "string" },
  { key: "supplier.address", label: "Supplier address", section: "Supplier", arg: "supplier_details_shown", type: "string" },
  { key: "supplier.contact", label: "Supplier contact", section: "Supplier", arg: null, type: "string" },
  { key: "supplier.traderRegistrationNumber", label: "Motor vehicle trader registration number", section: "Supplier", arg: "trader_number_shown", type: "string" },
  { key: "price.cash", label: "Cash price (NZD)", section: "Sale information", arg: "price_nzd", type: "number" },
  { key: "price.includes", label: "Price includes GST, registration and licensing", section: "Sale information", arg: "price_includes_on_road_costs", type: "string" },
  { key: "securityInterest.registered", label: "Security interest registered on the PPSR (money owing)", section: "Security interest", arg: "money_owing", type: "string" },
  { key: "vehicle.makeModel", label: "Make and model", section: "Vehicle", arg: "model", type: "string" },
  { key: "vehicle.year", label: "Vehicle year", section: "Vehicle", arg: "year", type: "integer" },
  { key: "vehicle.engineCapacity", label: "Engine capacity (cc)", section: "Vehicle", arg: "engine_cc", type: "integer" },
  { key: "vehicle.vin", label: "VIN or chassis number", section: "Vehicle", arg: "vin_shown", type: "string" },
  { key: "odometer.km", label: "Actual distance travelled (km)", section: "Odometer", arg: "odometer_km", type: "integer" },
  { key: "odometer.mayBeInaccurate", label: "Odometer may be inaccurate", section: "Odometer", arg: "odometer_may_be_inaccurate", type: "boolean" },
  { key: "radio.fm88to108", label: "Receives 88–108 MHz without a band expander", section: "Radio", arg: null, type: "boolean" },
  { key: "wof.expiry", label: "WOF or CoF expiry", section: "WOF", arg: "wof_expiry", type: "date" },
  { key: "licence.expiry", label: "Vehicle licence (rego) expiry", section: "Licence", arg: "licence_expiry", type: "date" },
  { key: "registration.registered", label: "Registered vehicle", section: "Registration", arg: null, type: "boolean" },
  { key: "registration.plate", label: "Registration plate", section: "Registration", arg: null, type: "string" },
  { key: "registration.yearFirstRegisteredNz", label: "Year first registered in NZ", section: "Registration", arg: null, type: "integer" },
  { key: "registration.reRegistered", label: "Re-registered vehicle", section: "Registration", arg: null, type: "boolean" },
  { key: "fuel.type", label: "Operating fuel type", section: "Fuel and RUC", arg: "fuel", type: "string" },
  { key: "ruc.applies", label: "Road user charges apply", section: "Fuel and RUC", arg: "ruc_applies", type: "string" },
  { key: "ruc.outstanding", label: "Outstanding road user charges", section: "Fuel and RUC", arg: "ruc_outstanding", type: "string" },
  { key: "import.yearFirstRegisteredOverseas", label: "Year first registered overseas", section: "Used imports", arg: "year_first_registered_overseas", type: "integer", importOnly: true },
  { key: "import.countryLastRegistered", label: "Country where last registered", section: "Used imports", arg: "country_last_registered", type: "string", importOnly: true },
  { key: "import.damaged", label: "Imported as a damaged vehicle", section: "Used imports", arg: "imported_as_damaged", type: "string", importOnly: true },
];

// JSON Schema for one car record's CIN block, published at /cars/schema.json and as the cars://schema/cin resource.
export function cinJsonSchema() {
  const field = (f) => {
    const value = f.type === "date" ? { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" } : f.type === "integer" ? { type: ["integer", "null"] } : f.type === "number" ? { type: "number" } : f.type === "boolean" ? { type: "boolean" } : { type: ["string", "null"] };
    return { type: "object", title: f.label, description: `${f.section}. ${f.importOnly ? "Required for used imports; 'Not applicable: NZ-new' otherwise." : "Required on every dealer notice."}`,
      required: ["label", "value", "truth"], properties: { label: { const: f.label }, value, truth: { enum: ["Simulated", "Source", "Estimate", "Your data"] }, note: { type: "string" } } };
  };
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `${SITE_URL}/cars/schema.json`,
    title: "Consumer Information Notice (used motor vehicle), as data",
    description: "Every field a New Zealand motor vehicle trader must show on a used vehicle's Consumer Information Notice, keyed for agents. Field order and wording follow MBIE's example notice (Nov 2020) under the Consumer Information Standards (Used Motor Vehicles) Regulations 2008. Each field carries a truth label. In the assembl lab demo every value is Simulated.",
    "x-source": LINKS.cin, "x-trader-duties": LINKS.traderDuties,
    "x-truth-labels": { Simulated: "Invented for the demo dealer", Source: "Copied from an official document", Estimate: "An assumption, with its basis", "Your data": "Facts the buyer or the chat supplied" },
    type: "object",
    required: CIN_FIELDS.map((f) => f.key),
    properties: Object.fromEntries(CIN_FIELDS.map((f) => [f.key, field(f)])),
    additionalProperties: false,
  };
}

// ---------- dates (Pacific/Auckland without a library) ---------------------------------------------------------------
const TZ = "Pacific/Auckland";
export function nzParts(d) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, weekday: "long" }).formatToParts(d);
  const g = (t) => p.find((x) => x.type === t)?.value;
  return { ymd: `${g("year")}-${g("month")}-${g("day")}`, weekday: g("weekday"), hour: +g("hour") % 24, minute: +g("minute") };
}
function nzOffset(ymd) { // "+13:00" or "+12:00" for that NZ date at noon
  try {
    const s = new Intl.DateTimeFormat("en-NZ", { timeZone: TZ, timeZoneName: "shortOffset" }).formatToParts(new Date(ymd + "T00:00:00Z")).find((x) => x.type === "timeZoneName")?.value || "GMT+13";
    const m = s.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/); return m ? `${m[1]}${m[2].padStart(2, "0")}:${m[3] || "00"}` : "+13:00";
  } catch (e) { return "+13:00"; }
}
const addDays = (ymd, n) => { const d = new Date(ymd + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const monthsBetween = (fromYmd, toYmd) => { const a = new Date(fromYmd + "T00:00:00Z"), b = new Date(toYmd + "T00:00:00Z"); return Math.round(((b - a) / 864e5 / 30.44) * 10) / 10; };
export const fmtDate = (ymd) => { if (!ymd) return "unknown"; const d = new Date(ymd.length === 7 ? ymd + "-01T12:00:00Z" : ymd + "T12:00:00Z"); return d.toLocaleDateString("en-NZ", { day: ymd.length === 7 ? undefined : "numeric", month: "short", year: "numeric", timeZone: "UTC" }); };
export const money = (n, d = 0) => (n == null || !isFinite(n) ? "–" : "$" + Number(n).toLocaleString("en-NZ", { minimumFractionDigits: d, maximumFractionDigits: d }));
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

// Test-drive slots for the next 7 days, computed from the site's hours and a deterministic "already booked" pattern so the
// page and the endpoint agree. A car on hold has none.
export function slotsFor(car, now = new Date()) {
  if (!car || car.hold?.status !== "available") return [];
  const today = nzParts(now), out = [];
  for (let i = 0; i < 7; i++) {
    const ymd = addDays(today.ymd, i), wd = new Date(ymd + "T12:00:00Z").toLocaleDateString("en-NZ", { weekday: "long", timeZone: "UTC" });
    const hours = wd === "Saturday" ? DEALER.hours.saturday : wd === "Sunday" ? DEALER.hours.sunday : DEALER.hours.weekday, off = nzOffset(ymd);
    for (const h of hours) {
      if (i === 0 && h <= today.hour + 1) continue; // not in the past, and not within the hour
      if (hash(car.id + ymd + h) % 10 < 3) continue; // ~30% already booked (Simulated)
      const hh = String(h).padStart(2, "0");
      out.push({ start: `${ymd}T${hh}:00:00${off}`, end: `${ymd}T${hh}:30:00${off}`, day: wd, date: ymd, label: `${wd.slice(0, 3)} ${fmtDate(ymd).replace(/ \d{4}$/, "")}, ${h > 12 ? h - 12 : h}${h >= 12 ? "pm" : "am"}` });
    }
  }
  return out;
}

// ---------- images: studio renders of the Simulated cars (src/cars/_build/render-cars.mjs) ---------------------------
export function imagesFor(car) {
  const alt = `${IMAGE_LABEL}: ${car.year} ${car.make} ${car.model} ${car.variant}, ${String(car.colour || "").toLowerCase()}, front three-quarter view`;
  return [
    { ratio: "4:3", width: 1200, height: 900, url: `${IMG_BASE}${car.id}-4x3.webp`, alt, label: IMAGE_LABEL, kind: "render" },
    { ratio: "1:1", width: 800, height: 800, url: `${IMG_BASE}${car.id}-1x1.webp`, alt, label: IMAGE_LABEL, kind: "render" },
  ];
}
const imgs = (car) => (car.images && car.images.length ? car.images : imagesFor(car));
const img = (car, ratio) => { const i = imgs(car).find((x) => x.ratio === ratio) || imgs(car)[0]; return { url: i.url, alt: i.alt }; };

// ---------- JSON-LD (schema.org Car + Offer) ------------------------------------------------------------------------
const FUEL_LD = { petrol: "Gasoline", diesel: "Diesel", hybrid: "Hybrid electric (petrol)", "plug-in hybrid": "Plug-in hybrid electric (petrol)", electric: "Electric" };
const BODY_LD = { hatch: "Hatchback", sedan: "Sedan", suv: "SUV", ute: "Pickup (ute)", van: "Van" };
export function toJsonLd(car, base = SITE_URL) {
  const site = DEALER.sites[car.site], v = (k) => car.cin[k]?.value;
  return {
    "@context": "https://schema.org", "@type": "Car", "@id": `${base}/cars/#${car.id}`,
    name: car.title, brand: { "@type": "Brand", name: car.make }, model: car.model, vehicleConfiguration: car.variant,
    vehicleModelDate: String(car.year), productionDate: String(car.year), bodyType: BODY_LD[car.body], color: car.colour,
    image: imgs(car).map((i) => ({ "@type": "ImageObject", contentUrl: i.url, url: i.url, width: i.width, height: i.height, caption: IMAGE_LABEL, description: i.alt, creditText: "assembl lab · 3D render, not a photograph" })),
    vehicleIdentificationNumber: v("vehicle.vin"), fuelType: FUEL_LD[car.fuel], driveWheelConfiguration: car.drivetrain,
    vehicleSeatingCapacity: car.seats, vehicleEngine: car.cin["vehicle.engineCapacity"].value ? { "@type": "EngineSpecification", engineDisplacement: { "@type": "QuantitativeValue", value: v("vehicle.engineCapacity"), unitCode: "CMQ" } } : undefined,
    mileageFromOdometer: { "@type": "QuantitativeValue", value: car.odometerKm, unitCode: "KMT" },
    fuelEfficiency: { "@type": "QuantitativeValue", value: car.economy.value, unitText: car.economy.unit, description: `Estimate: ${car.economy.basis}` },
    itemCondition: "https://schema.org/UsedCondition",
    offers: { "@type": "Offer", price: car.priceNzd, priceCurrency: "NZD", availability: car.hold.status === "available" ? "https://schema.org/InStock" : "https://schema.org/LimitedAvailability",
      seller: { "@type": "AutoDealer", name: site.name, address: site.address, description: DEALER.note }, url: `${base}/cars/#${car.id}`,
      priceSpecification: { "@type": "PriceSpecification", price: car.priceNzd, priceCurrency: "NZD", valueAddedTaxIncluded: true, description: "Cash price including GST, registration and licensing (Simulated)" } },
    additionalProperty: [
      ...CIN_FIELDS.map((f) => ({ "@type": "PropertyValue", propertyID: "cin:" + f.key, name: f.label, value: car.cin[f.key].value ?? "Not applicable" })),
      { "@type": "PropertyValue", propertyID: "safetyRating", name: "Safety rating (RightCar-style stars)", value: car.safety.stars, description: "Simulated" },
      { "@type": "PropertyValue", propertyID: "truth", name: "Truth label for every notice field above", value: "Simulated", description: DEALER.note },
    ],
    isPartOf: { "@type": "Dataset", name: "Agent-ready cars stock feed (demo)", url: `${base}/cars/feed.json` },
  };
}

// ---------- a small JSON Schema checker (the subset our tool schemas use) ---------------------------------------------
export function validate(schema, value, path = "arguments") {
  if (schema.anyOf && !schema.anyOf.some((b) => !validate(b, value, path).length)) return [`${path} doesn't match any allowed shape`];
  const errs = [], t = Array.isArray(value) ? "array" : value === null ? "null" : typeof value;
  const want = schema.type ? [].concat(schema.type) : null;
  const ok = (w) => w === t || (w === "integer" && t === "number" && Number.isInteger(value)) || (w === "number" && t === "number" && isFinite(value));
  if (want && !want.some(ok)) return [`${path} should be ${want.join(" or ")}`];
  if (schema.enum && !schema.enum.includes(value)) errs.push(`${path} should be one of: ${schema.enum.join(", ")}`);
  if (t === "number") { if (schema.minimum != null && value < schema.minimum) errs.push(`${path} should be at least ${schema.minimum}`); if (schema.maximum != null && value > schema.maximum) errs.push(`${path} should be at most ${schema.maximum}`); }
  if (t === "string") { if (schema.maxLength != null && value.length > schema.maxLength) errs.push(`${path} is longer than ${schema.maxLength} characters`); if (schema.pattern && !new RegExp(schema.pattern).test(value)) errs.push(`${path} doesn't match ${schema.pattern}`); }
  if (t === "array") { if (schema.maxItems != null && value.length > schema.maxItems) errs.push(`${path} has more than ${schema.maxItems} items`); if (schema.items) value.forEach((v, i) => errs.push(...validate(schema.items, v, `${path}[${i}]`))); }
  if (t === "object") {
    for (const r of schema.required || []) if (value[r] === undefined) errs.push(`${path}.${r} is required`);
    for (const [k, v] of Object.entries(value)) {
      if (schema.properties && schema.properties[k]) errs.push(...validate(schema.properties[k], v, `${path}.${k}`));
      else if (schema.additionalProperties === false) errs.push(`${path}.${k} is not a known field`);
      else if (schema.additionalProperties && typeof schema.additionalProperties === "object") errs.push(...validate(schema.additionalProperties, v, `${path}.${k}`));
    }
  }
  return errs;
}

// ---------- tool definitions (MCP tools/list) ----------------------------------------------------------------------
const FUEL_ENUM = ["petrol", "diesel", "hybrid", "plug-in hybrid", "electric"];
const BODY_ENUM = ["hatch", "sedan", "suv", "ute", "van"];
export const MUST_HAVES = ["no money owing", "awd or 4wd", "nz new", "5 star safety", "not on hold"];
const ID = { type: "string", pattern: "^hl-\\d{3}$", description: "A demo car's id from search_cars. Example: \"hl-014\"." };
const REGION = (d) => ({ type: "string", enum: REGION_NAMES, description: `${d} One of New Zealand's 16 regions, never a town, address or coordinates: map a town to its region, e.g. Hamilton → "Waikato", Tauranga → "Bay of Plenty", Napier → "Hawke's Bay", Queenstown → "Otago".` });
const DAY = { type: "string", pattern: "^(monday|tuesday|wednesday|thursday|friday|saturday|sunday|\\d{4}-\\d{2}-\\d{2})$", description: "A day within the next 7 days: a weekday name in lower case, or a date. Example: \"saturday\" or \"2026-10-31\"." };
const YMD_OR_MONTH = (d) => ({ type: "string", pattern: "^\\d{4}-\\d{2}(-\\d{2})?$", description: d });
const YN = (d) => ({ type: "string", enum: ["yes", "no", "unknown"], description: d });
// MCP Apps views (versioned: the URI is the cache key, so a breaking change to a view gets a new URI)
export const UI = { results: "ui://cars/results.v1.html", check: "ui://cars/car-check.v2.html", gallery: "ui://cars/gallery.v1.html" };
export const CARD_URI = UI.check;
export const LEGACY_CARD_URI = "ui://cars/car-check.html"; // still served (same view) for hosts that cached the old tool list
const uiMeta = (uri, invoking, invoked) => ({ ui: { resourceUri: uri, visibility: ["model", "app"] }, "openai/outputTemplate": uri, "openai/toolInvocation/invoking": invoking, "openai/toolInvocation/invoked": invoked });

// output schemas: the exact top-level shape each tool returns as structuredContent (nested detail left open)
const T = {
  s: (d) => ({ type: "string", ...(d ? { description: d } : {}) }), n: { type: "number" }, i: { type: "integer" }, b: { type: "boolean" },
  // nullable as anyOf, not a type array: more portable across clients (MCP Inspector's strict check)
  sn: { anyOf: [{ type: "string" }, { type: "null" }] }, nn: { anyOf: [{ type: "number" }, { type: "null" }] }, o: (properties, required = []) => ({ type: "object", properties, required }), a: (items) => ({ type: "array", items }),
};
const IMG_OUT = T.o({ url: T.s(), alt: T.s() }, ["url", "alt"]);
const SLOT_OUT = T.o({ start: T.s(), label: T.s(), day: T.s(), date: T.s() }, ["start", "label"]);
const LINE_OUT = T.o({ key: T.s(), label: T.s(), weekly: T.n, annual: T.n, truth: T.s(), basis: T.s() }, ["key", "label", "weekly", "truth"]);
const RC_OUT = T.o({ car: T.o({}), fuel: T.s(), economy: T.o({ value: T.n, unit: T.s(), truth: T.s() }), kmPerWeek: T.n, region: T.s(), place: T.s(), lines: T.a(LINE_OUT), totalWeekly: T.n, totalAnnual: T.n,
  compare: T.o({ fuel: T.s(), label: T.s(), totalWeekly: T.n }), rates: T.o({}), notIncluded: T.a(T.s()), feeds: T.o({}), credits: T.a(T.o({ name: T.s(), url: T.s() })) }, ["fuel", "kmPerWeek", "lines", "totalWeekly", "totalAnnual"]);
const OUT = {
  search_cars: T.o({ truth: T.s(), note: T.s(), dealer: T.s(), interpreted: T.a(T.s()), region: T.sn, regionFrom: T.sn, total: T.i, matched: T.i, closeMatches: T.i, excluded: { type: "object", additionalProperties: { type: "integer" } },
    results: T.a(T.o({ rank: T.i, id: T.s(), title: T.s(), year: T.i, priceNzd: T.n, odometerKm: T.i, fuel: T.s(), body: T.s(), seats: T.i, region: T.s(), site: T.s(), distanceKm: T.nn, hold: T.s(),
      match: { type: "string", enum: ["exact", "close"] }, missed: T.a(T.s()), why: T.a(T.s()), image: IMG_OUT, testDriveSlots: T.a(SLOT_OUT) }, ["rank", "id", "title", "priceNzd", "odometerKm", "region", "match", "image"])),
    imageNote: T.s(), next: T.s() }, ["truth", "total", "matched", "results"]),
  get_car: T.o({ truth: T.s(), note: T.s(), car: T.o({ id: T.s(), title: T.s(), priceNzd: T.n, odometerKm: T.i, region: T.s(), site: T.s() }, ["id", "title", "priceNzd", "odometerKm"]),
    notice: T.o({}), noticeNotes: T.o({}), checks: T.o({}), economy: T.o({}), safety: T.o({}), images: T.a(T.o({ url: T.s(), ratio: T.s(), width: T.i, height: T.i, alt: T.s(), label: T.s() }, ["url", "alt"])),
    imageNote: T.s(), testDriveSlots: T.a(SLOT_OUT), moreSlots: T.i, jsonld: T.s(), schema: T.s() }, ["truth", "car", "notice", "checks", "images", "testDriveSlots"]),
  car_check: T.o({ lookedUp: T.b, statement: T.s(), car: T.o({ name: T.s(), truth: T.s() }), facts: T.o({}), notice: T.o({ present: T.i, total: T.i, missing: T.a(T.o({})) }), redFlags: T.a(T.o({ level: T.s(), title: T.s(), why: T.s() })),
    checks: T.a(T.o({ id: T.s(), title: T.s(), how: T.s() })), fairPrice: T.o({ marketPrice: { type: "null" }, note: T.s(), questions: T.a(T.s()) }), runningCost: RC_OUT, summary: T.s(), sources: T.a(T.o({})), credits: T.a(T.o({})) },
    ["lookedUp", "statement", "car", "notice", "redFlags", "checks", "fairPrice", "summary"]),
  running_cost: RC_OUT,
  book_test_drive: T.o({ simulated: T.b, status: T.s(), car: T.o({ id: T.s(), title: T.s() }), slot: SLOT_OUT, site: T.s(), address: T.s(), sideEffects: T.s(), nextStep: T.s(), note: T.s() }, ["simulated", "status", "car", "slot", "nextStep"]),
  hold_car: T.o({ simulated: T.b, status: T.s(), car: T.o({ id: T.s(), title: T.s(), priceNzd: T.n }), holdUntil: T.s(), site: T.s(), sideEffects: T.s(), nextStep: T.s(), note: T.s() }, ["simulated", "status", "car", "holdUntil", "nextStep"]),
};

export const TOOLS = [
  {
    name: "search_cars", title: "Search demo cars for sale",
    description: "Use this when the user wants to find a used car to buy in New Zealand and gives any of: budget, body type, fuel, seats, kilometres, year, their region, must-haves or a test-drive day. " +
      "Searches Harbour Lane Motors (demo), a fictional dealer with 48 Simulated used cars at sites in Auckland, Waikato and Bay of Plenty. Returns 3–8 cars, each with a studio render, price, km, region and why it matched, plus how many were excluded and why; " +
      "if fewer than 3 match exactly, it adds the closest cars that miss one soft limit (budget, km, year, distance or test-drive day), marked as close matches. 'hybrid' includes plug-in hybrids. " +
      "Do not use for selling a car, valuations, finance or insurance. Every car is Simulated: never present one as a real car for sale.",
    inputSchema: { type: "object", additionalProperties: false, properties: {
      budget_max: { type: "number", minimum: 0, maximum: 500000, description: "Most the buyer will pay: the cash price in NZD, which includes GST and on-road costs. Example: 35000 for \"under $35k\"." },
      budget_min: { type: "number", minimum: 0, maximum: 500000, description: "Least the buyer wants to spend, NZD. Example: 15000." },
      body: { type: "string", enum: BODY_ENUM, description: "Body type. Map \"hatchback\" → \"hatch\", \"pickup\" or \"double cab\" → \"ute\", \"people mover\" → \"van\". Example: \"suv\"." },
      seats_min: { type: "integer", minimum: 2, maximum: 9, description: "Fewest seats needed. Example: 7 for a seven-seater." },
      fuel: { type: "string", enum: FUEL_ENUM, description: "Fuel. \"hybrid\" also matches plug-in hybrids; use \"electric\" for an EV. Example: \"hybrid\"." },
      max_km: { type: "integer", minimum: 0, maximum: 1000000, description: "Highest odometer reading, km. Example: 100000 for \"under 100k km\"." },
      min_year: { type: "integer", minimum: 1990, maximum: 2030, description: "Oldest model year. Example: 2018 for \"2018 or newer\"." },
      region: REGION("The buyer's region, used to rank cars by distance to the dealer's sites."),
      max_distance_km: { type: "number", minimum: 0, maximum: 2000, description: "Furthest a dealer site may be from the main centre of the buyer's region, km (needs region). Example: 50." },
      must_have: { type: "array", maxItems: 5, items: { type: "string", enum: MUST_HAVES }, description: "Requirements from this fixed list. \"no money owing\" means none stated on the notice (a PPSR search is still needed). Example: [\"no money owing\", \"awd or 4wd\"]." },
      towing_kg_min: { type: "integer", minimum: 0, maximum: 3500, description: "Braked towing capacity needed, kg. Use 1000 when the user only says \"towing\". Example: 2000 for a boat." },
      wof_months_min: { type: "integer", minimum: 0, maximum: 12, description: "Fewest months of WOF left. Example: 6." },
      test_drive_day: DAY,
      query: { type: "string", maxLength: 60, description: "Make or model words. Example: \"RAV4\" or \"Toyota Aqua\"." },
      sort: { type: "string", enum: ["closest match", "price", "newest", "lowest km"], description: "Order of results. Default \"closest match\"." },
      limit: { type: "integer", minimum: 3, maximum: 8, description: "How many cars to return, 3 to 8. Default 5. Example: 8 for \"show me more\"." },
    } },
    outputSchema: OUT.search_cars,
    annotations: { title: "Search demo cars for sale", readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    _meta: uiMeta(UI.results, "Searching the demo dealer's cars", "Cars found"),
  },
  {
    name: "get_car", title: "Get one demo car's details",
    description: "Use this when the user wants the full details of one car from search_cars: its Consumer Information Notice (the facts a New Zealand dealer must display), quick checks (WOF and licence months left, money owing as stated), estimated fuel economy, " +
      "Simulated safety stars, studio renders and free test-drive times for the next 7 days. Shows a gallery. Needs a car_id from search_cars. " +
      "Do not use for a listing from anywhere else (car_check takes its facts). The car is Simulated, not a real car for sale.",
    inputSchema: { type: "object", additionalProperties: false, required: ["car_id"], properties: {
      car_id: ID,
      test_drive_day: { ...DAY, description: "Only list test-drive times on this day. " + DAY.description },
    } },
    outputSchema: OUT.get_car,
    annotations: { title: "Get one demo car's details", readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    _meta: uiMeta(UI.gallery, "Opening the car", "Car details ready"),
  },
  {
    name: "car_check", title: "Check a car before buying",
    description: "Use this when the user asks whether a particular used car is a good buy, or what to check before paying for it, in New Zealand. Pass a demo car_id, or the facts of a listing the user has given in this conversation: " +
      "make, model, year, km, price, fuel, region and whatever else is known. Returns which Consumer Information Notice facts are missing, red flags, the official checks to run before paying (PPSR, NZTA WOF and licence, RightCar), " +
      "questions to test the price (it has no market price data and never invents one), the weekly running cost, and live facts for the make, model and year from NZTA's open Motor Vehicle Register (how many are registered, the import split, fuel, engine size, rated economy). " +
      "It reports on the vehicle model only, never a particular car's owner, and fetches no listing pages: do not pass links, plates or names. " +
      "Do not use for valuations, finance or insurance quotes.",
    inputSchema: { type: "object", additionalProperties: false, properties: {
      car_id: ID,
      make: { type: "string", maxLength: 40, description: "Make. Example: \"Toyota\"." },
      model: { type: "string", maxLength: 60, description: "Model and variant. Example: \"Aqua G\" or \"RAV4 Hybrid GX\"." },
      year: { type: "integer", minimum: 1980, maximum: 2030, description: "Model year. Example: 2016." },
      odometer_km: { type: "integer", minimum: 0, maximum: 2000000, description: "Odometer reading, km. Example: 98000 for \"98k\"." },
      price_nzd: { type: "number", minimum: 0, maximum: 1000000, description: "Asking price, NZD. Example: 11500 for \"$11.5k\"." },
      fuel: { type: "string", enum: [...FUEL_ENUM, "unknown"], description: "Fuel. Example: \"hybrid\"." },
      body: { type: "string", enum: [...BODY_ENUM, "unknown"], description: "Body type. Example: \"hatch\"." },
      region: REGION("Where the buyer will drive it; sets the power price for an EV or plug-in hybrid."),
      seller: { type: "string", enum: ["dealer", "private", "unknown"], description: "A dealer (motor vehicle trader) or a private seller. Example: \"dealer\"." },
      source: { type: "string", enum: ["typed by the buyer", "shown earlier in this chat", "unknown"], description: "Where these facts came from. Example: \"typed by the buyer\"." },
      wof_expiry: YMD_OR_MONTH("WOF expiry, YYYY-MM-DD or YYYY-MM. Example: \"2027-03\"."),
      licence_expiry: YMD_OR_MONTH("Licence (rego) expiry, YYYY-MM-DD or YYYY-MM. Example: \"2026-12\"."),
      money_owing: YN("Does the seller say a security interest (money owing) is registered on the PPSR? Example: \"unknown\"."),
      price_includes_on_road_costs: YN("Does the price include GST, registration and licensing? Example: \"yes\"."),
      imported: YN("Is it a used import? \"no\" means NZ-new. Example: \"yes\"."),
      year_first_registered_overseas: { type: "integer", minimum: 1980, maximum: 2030, description: "Used imports: year first registered overseas. Example: 2016." },
      country_last_registered: { type: "string", enum: ["Japan", "United Kingdom", "Australia", "Singapore", "United States", "other", "unknown"], description: "Used imports: country where last registered. Example: \"Japan\"." },
      imported_as_damaged: YN("Used imports: did it arrive in NZ as a damaged vehicle? Example: \"no\"."),
      odometer_may_be_inaccurate: { type: "boolean", description: "True when the listing says the odometer may be inaccurate." },
      supplier_details_shown: YN("Does the listing show the dealer's business name and address? Example: \"yes\"."),
      trader_number_shown: YN("Does the listing show a motor vehicle trader registration number? Example: \"no\"."),
      vin_shown: YN("Does the listing show the VIN or chassis number? Answer yes or no; never pass the number itself."),
      engine_cc: { type: "integer", minimum: 0, maximum: 10000, description: "Engine capacity, cc (0 for electric). Example: 1496." },
      ruc_applies: YN("Do road user charges apply (diesel, electric, plug-in hybrid)? Example: \"yes\"."),
      ruc_outstanding: YN("Are road user charges outstanding? Example: \"no\"."),
      km_per_week: { type: "number", minimum: 0, maximum: 5000, description: "Kilometres a week for the running cost. Default 200. Example: 250." },
    } },
    outputSchema: OUT.car_check,
    annotations: { title: "Check a car before buying", readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    _meta: uiMeta(UI.check, "Checking the car", "Check ready"),
  },
  {
    name: "running_cost", title: "Estimate a car's weekly running cost",
    description: "Use this when the user asks what a car will cost to run each week or year in New Zealand, or wants to compare petrol, hybrid, diesel and electric running costs. " +
      "Pass a demo car_id, or a fuel plus make and model (or the car's own economy figure). Prices fuel at MBIE's latest weekly national price and home charging at MBIE's surveyed household power price for the region, " +
      "adds NZTA road user charges (diesel, EV, plug-in hybrid; petrol pays excise in the pump price) and labelled estimates for WOF, licence and servicing, and compares a typical car on the other fuel. " +
      "Excludes insurance, finance and depreciation. Do not use for a particular service station's prices or for loan repayments.",
    inputSchema: { type: "object", additionalProperties: false, properties: {
      car_id: ID,
      fuel: { type: "string", enum: FUEL_ENUM, description: "Fuel, when there's no car_id. Example: \"electric\"." },
      body: { type: "string", enum: BODY_ENUM, description: "Body type, for the comparison car. Example: \"hatch\"." },
      make: { type: "string", maxLength: 40, description: "Make, to look up typical economy. Example: \"Nissan\"." },
      model: { type: "string", maxLength: 60, description: "Model, to look up typical economy. Example: \"Leaf\"." },
      year: { type: "integer", minimum: 1980, maximum: 2030, description: "Model year (cars over eight years old get a servicing uplift). Example: 2018." },
      economy: { type: "number", minimum: 0, maximum: 60, description: "The car's own economy: L/100km for petrol, diesel and hybrids, kWh/100km for electric. Example: 4.2 or 17." },
      km_per_week: { type: "number", minimum: 0, maximum: 5000, description: "Kilometres a week. Default 200. Example: 300." },
      region: REGION("Region for the household power price. Default: the demo car's site region, otherwise Auckland."),
      electricity_c_per_kwh: { type: "number", minimum: 0, maximum: 200, description: "The buyer's own power price in cents per kWh (Your data), such as an off-peak EV plan. Example: 18." },
      fuel_c_per_litre: { type: "number", minimum: 0, maximum: 1000, description: "The buyer's own pump price in cents per litre (Your data). Example: 299.9." },
      electric_share: { type: "number", minimum: 0, maximum: 1, description: "Plug-in hybrids only: share of kilometres driven on electricity, 0 to 1. Default 0.5 (Estimate). Example: 0.7." },
    } },
    outputSchema: OUT.running_cost,
    annotations: { title: "Estimate a car's weekly running cost", readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    // callable by the car_check card's sliders (MCP Apps tools/call needs "app"; widgetAccessible is ChatGPT's older alias)
    _meta: { ui: { visibility: ["model", "app"] }, "openai/widgetAccessible": true, "openai/toolInvocation/invoking": "Working out the running cost", "openai/toolInvocation/invoked": "Running cost ready" },
  },
  {
    name: "book_test_drive", title: "Request a test drive (the dealer confirms)",
    description: "Use this when the buyer has chosen a free test-drive time from get_car or search_cars and has said yes to asking the dealer. Simulated: nothing is sent and nothing is stored; " +
      "it returns a request that a person at Harbour Lane Motors (demo) would have to confirm. Ask the buyer before calling it. Do not pass the buyer's name, phone or email: this demo collects none. " +
      "Each call is a new request, so don't repeat it for the same time.",
    inputSchema: { type: "object", additionalProperties: false, required: ["car_id", "slot"], properties: {
      car_id: ID,
      slot: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}", description: "A free slot's start time from get_car or search_cars. Example: \"2026-10-31T10:00:00+13:00\"." },
      buyer_note: { type: "string", maxLength: 200, description: "Optional note for the dealer, without contact details. Example: \"I'll bring a child seat to try\"." },
    } },
    outputSchema: OUT.book_test_drive,
    annotations: { title: "Request a test drive (the dealer confirms)", readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    _meta: { "openai/toolInvocation/invoking": "Preparing the request", "openai/toolInvocation/invoked": "Request prepared" },
  },
  {
    name: "hold_car", title: "Ask the dealer to hold a car (the dealer approves)",
    description: "Use this when the buyer wants a car kept for them for up to 3 days and has said yes to asking the dealer. Simulated: nothing is held, sent or stored, and it takes no deposit or payment; " +
      "it returns a request that a person at the dealer would have to approve. Ask the buyer before calling it. Each call is a new request. Do not use it to pay or promise a deposit.",
    inputSchema: { type: "object", additionalProperties: false, required: ["car_id"], properties: {
      car_id: ID,
      hold_until: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "Hold until this date, at most 3 days ahead. Default 2 days. Example: \"2026-10-29\"." },
      reason: { type: "string", maxLength: 200, description: "Optional reason, without contact details. Example: \"Booking a pre-purchase inspection\"." },
    } },
    outputSchema: OUT.hold_car,
    annotations: { title: "Ask the dealer to hold a car (the dealer approves)", readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    _meta: { "openai/toolInvocation/invoking": "Preparing the request", "openai/toolInvocation/invoked": "Request prepared" },
  },
];

// ---------- helpers over the stock ----------------------------------------------------------------------------------
const FUEL_LABEL = { petrol: "Petrol", diesel: "Diesel", hybrid: "Petrol hybrid", "plug-in hybrid": "Plug-in hybrid (petrol)", electric: "Electric" };
export const fuelLabel = (f) => FUEL_LABEL[f] || f;
const findCar = (stock, cid) => stock.cars.find((c) => c.id === String(cid || "").toLowerCase().trim());
const truthNote = "Simulated: Harbour Lane Motors (demo) is fictional and so is every car it lists.";
const wofMonths = (car, today) => car.cin["wof.expiry"].value ? monthsBetween(today, car.cin["wof.expiry"].value) : null;
const nzYear = (now) => +nzParts(now).ymd.slice(0, 4);

export function quickChecks(car, now = new Date()) {
  const today = nzParts(now).ymd, w = wofMonths(car, today), l = car.cin["licence.expiry"].value ? monthsBetween(today, car.cin["licence.expiry"].value) : null;
  const present = CIN_FIELDS.filter((f) => car.cin[f.key] && car.cin[f.key].value !== undefined && car.cin[f.key].value !== null && car.cin[f.key].value !== "").length;
  const si = car.cin["securityInterest.registered"].value;
  return {
    cinFields: { present, total: CIN_FIELDS.length, truth: "Simulated" },
    wof: { expiry: car.cin["wof.expiry"].value, monthsLeft: w, ok: w != null && w >= 2 },
    licence: { expiry: car.cin["licence.expiry"].value, monthsLeft: l, ok: l != null && l >= 1 },
    moneyOwing: { stated: si, ok: si === "no", note: si === "no" ? "None registered, as stated on the notice. Stated is not searched: run a PPSR search before paying." : si === "yes" ? "A security interest is registered. " + (car.cin["securityInterest.registered"].note || "") : "Not stated." },
    odometer: { km: car.odometerKm, mayBeInaccurate: !!car.cin["odometer.mayBeInaccurate"].value, kmPerYear: Math.round(car.odometerKm / Math.max(0.5, nzYear(now) - car.year + 0.5)) },
    importDamaged: car.cin["import.damaged"].value === "yes",
  };
}

// ---------- search_cars -------------------------------------------------------------------------------------------
const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
// a soft limit a "close match" may miss, and by how much at most
const NEAR = { budget: 0.10, km: 0.20, year: 1, distance: 0.5 };
export function searchCars(stock, args = {}, now = new Date(), ctx = {}) {
  const today = nzParts(now).ymd;
  const region = args.region ? regionByName(args.region) : ctx.userRegion ? regionByName(ctx.userRegion) : null;
  const regionFrom = args.region ? "your input" : region ? "your coarse location (sent by the app)" : null;
  const must = new Set(args.must_have || []), day = args.test_drive_day ? String(args.test_drive_day).toLowerCase() : null;
  const isDate = day && /^\d{4}-\d{2}-\d{2}$/.test(day);
  const fuels = args.fuel === "hybrid" ? ["hybrid", "plug-in hybrid"] : args.fuel ? [args.fuel] : null;
  const q = fold(args.query), excluded = {}, exact = [], close = [];
  for (const car of stock.cars) {
    const site = DEALER.sites[car.site], dist = region ? km(region, site) : null, why = [], fails = [];
    // every filter is evaluated, so a car that misses only one soft limit can be offered as a close match
    const fail = (reason, soft = false, over = 0, missed = reason) => fails.push({ reason, soft, over, missed });
    if (args.budget_max != null) { if (car.priceNzd > args.budget_max) { const o = (car.priceNzd - args.budget_max) / args.budget_max; fail("over budget", o <= NEAR.budget, o, `${money(car.priceNzd - args.budget_max)} over your ${money(args.budget_max)} budget`); } else why.push(`${money(car.priceNzd)}, ${money(args.budget_max - car.priceNzd)} under your ${money(args.budget_max)}`); }
    if (args.budget_min != null && car.priceNzd < args.budget_min) fail("under budget floor");
    if (args.body) { if (car.body !== args.body) fail("different body type"); else why.push(`${car.body === "suv" ? "SUV" : car.body}, ${car.seats} seats`); }
    if (args.seats_min && car.seats < args.seats_min) fail("too few seats");
    if (fuels) { if (!fuels.includes(car.fuel)) fail("different fuel"); else why.push(fuelLabel(car.fuel) + (car.economy ? ` · ${car.economy.value} ${car.economy.unit} (Estimate)` : "")); }
    if (args.max_km != null && car.odometerKm > args.max_km) { const o = (car.odometerKm - args.max_km) / Math.max(1, args.max_km); fail("too many km", o <= NEAR.km, o, `${(car.odometerKm - args.max_km).toLocaleString("en-NZ")} km over your ${args.max_km.toLocaleString("en-NZ")} km limit`); }
    if (args.min_year && car.year < args.min_year) { const o = args.min_year - car.year; fail("too old", o <= NEAR.year, o / 10, `a ${car.year}, ${o} year${o > 1 ? "s" : ""} older than you asked`); }
    if (args.max_distance_km != null && dist != null && dist > args.max_distance_km) { const o = (dist - args.max_distance_km) / Math.max(1, args.max_distance_km); fail("too far away", o <= NEAR.distance, o, `${dist} km away, past your ${args.max_distance_km} km`); }
    if (q && !fold(`${car.make} ${car.model} ${car.variant}`).includes(q)) fail("doesn't match the make or model");
    if (must.has("no money owing")) { if (car.cin["securityInterest.registered"].value !== "no") fail("money owing stated"); else why.push("No money owing stated on the notice (run a PPSR search before paying)"); }
    if (args.towing_kg_min) { if ((car.towingKg || 0) < args.towing_kg_min) fail("can't tow enough"); else why.push(`Tows ${car.towingKg.toLocaleString("en-NZ")} kg braked`); }
    if (must.has("awd or 4wd")) { if (!/AWD|4WD/.test(car.drivetrain)) fail("not AWD or 4WD"); else why.push(car.drivetrain); }
    if (must.has("nz new")) { if (car.imported) fail("used import"); else why.push("NZ-new"); }
    if (must.has("5 star safety")) { if (car.safety.stars < 5) fail("under 5 stars"); else why.push("5 stars (RightCar-style, Simulated)"); }
    if (args.wof_months_min) { const m = wofMonths(car, today); if (m == null || m < args.wof_months_min) fail("WOF too short"); else why.push(`WOF ${m} months left`); }
    if (must.has("not on hold") && car.hold.status !== "available") fail("on hold");
    let slots = null;
    if (day) {
      const all = slotsFor(car, now);
      slots = isDate ? all.filter((s) => s.date === day) : all.filter((s) => s.day.toLowerCase() === day);
      if (!all.length) fail("on hold");
      else if (!slots.length) fail("no test-drive slot that day", true, 0.05, `no free test-drive time ${isDate ? "on " + fmtDate(day) : "on " + day[0].toUpperCase() + day.slice(1)} (other days have some)`);
      else why.push(`${slots.length} test-drive slot${slots.length === 1 ? "" : "s"} ${slots[0].day}`);
    }
    if (region) why.push(dist < 15 ? `At the ${site.town} site, in ${region.name}` : `${dist} km from ${region.centre} (${site.town} site, ${site.region})`);
    if (car.hold.status !== "available") why.push("On hold for another buyer (Simulated)");
    const score = (args.budget_max ? (args.budget_max - car.priceNzd) / args.budget_max : 0) * 0.6 + (region ? -(dist / 120) : 0) + (car.year - 2015) * 0.15 - car.odometerKm / 120000 + car.safety.stars * 0.1 + (car.hold.status === "available" ? 0 : -3);
    const row = { car, dist, why, slots, score, fails };
    if (!fails.length) exact.push(row);
    else { excluded[fails[0].reason] = (excluded[fails[0].reason] || 0) + 1; if (fails.length === 1 && fails[0].soft) close.push(row); }
  }
  const sort = args.sort || "closest match";
  const by = sort === "price" ? (a, b) => a.car.priceNzd - b.car.priceNzd : sort === "newest" ? (a, b) => b.car.year - a.car.year : sort === "lowest km" ? (a, b) => a.car.odometerKm - b.car.odometerKm : (a, b) => b.score - a.score;
  exact.sort(by); close.sort((a, b) => a.fails[0].over - b.fails[0].over || b.score - a.score);
  const limit = Math.max(3, Math.min(8, args.limit || 5));
  const picked = exact.slice(0, limit), extra = picked.length < 3 ? close.slice(0, 3 - picked.length) : [];
  const interpreted = [args.budget_max != null && `up to ${money(args.budget_max)}`, args.budget_min != null && `from ${money(args.budget_min)}`, args.body, args.seats_min && `${args.seats_min}+ seats`,
    args.fuel === "hybrid" ? "hybrid (incl. plug-in)" : args.fuel, args.max_km != null && `under ${args.max_km.toLocaleString("en-NZ")} km`, args.min_year && `${args.min_year} or newer`,
    region && `near ${region.name}${args.region ? "" : " (from your coarse location)"}`, args.max_distance_km != null && `within ${args.max_distance_km} km`, ...[...must], args.towing_kg_min && `towing ${args.towing_kg_min.toLocaleString("en-NZ")} kg braked`,
    args.wof_months_min && `WOF ${args.wof_months_min}+ months`, day && `test drive ${isDate ? fmtDate(day) : day}`, args.query && `"${args.query}"`].filter(Boolean);
  const out = (r, i, match) => ({ rank: i + 1, id: r.car.id, title: r.car.title, year: r.car.year, priceNzd: r.car.priceNzd, odometerKm: r.car.odometerKm, fuel: r.car.fuel, body: r.car.body, seats: r.car.seats,
    region: DEALER.sites[r.car.site].region, site: DEALER.sites[r.car.site].town, distanceKm: r.dist, hold: r.car.hold.status, match, ...(match === "close" ? { missed: [r.fails[0].missed] } : {}),
    why: r.why, image: img(r.car, "1:1"), ...(r.slots ? { testDriveSlots: r.slots.slice(0, 4).map(slotOut) } : {}) });
  return {
    truth: "Simulated", note: truthNote, dealer: DEALER.name, interpreted, region: region ? region.name : null, regionFrom,
    total: stock.cars.length, matched: exact.length, closeMatches: extra.length, excluded,
    results: [...picked.map((r, i) => out(r, i, "exact")), ...extra.map((r, i) => out(r, picked.length + i, "close"))],
    imageNote: IMAGE_NOTE,
    next: "More: get_car (full notice, gallery and test-drive times), car_check (before paying), running_cost (weekly cost).",
  };
}
const slotOut = (s) => ({ start: s.start, label: s.label, day: s.day, date: s.date });

// ---------- get_car ------------------------------------------------------------------------------------------------
// notes worth carrying to the model; the rest live in the full record (cars://car/{id} and /cars/feed.json)
const NOTE_KEYS = ["securityInterest.registered", "odometer.mayBeInaccurate", "import.damaged", "registration.reRegistered", "radio.fm88to108", "vehicle.vin", "registration.plate", "supplier.traderRegistrationNumber"];
export function getCar(stock, args, now = new Date()) {
  const car = findCar(stock, args.car_id);
  if (!car) return { error: `No demo car with id "${args.car_id}". Ids run from hl-001 to hl-048; search_cars lists them.` };
  const site = DEALER.sites[car.site], all = slotsFor(car, now), day = args.test_drive_day ? String(args.test_drive_day).toLowerCase() : null;
  const slots = day ? all.filter((s) => (/^\d{4}/.test(day) ? s.date === day : s.day.toLowerCase() === day)) : all;
  return {
    truth: "Simulated", note: truthNote,
    car: { id: car.id, title: car.title, make: car.make, model: car.model, variant: car.variant, year: car.year, body: car.body, seats: car.seats, colour: car.colour, drivetrain: car.drivetrain, transmission: car.transmission,
      fuel: car.fuel, priceNzd: car.priceNzd, odometerKm: car.odometerKm, region: site.region, site: site.town, imported: car.imported, towingKg: car.towingKg, hold: car.hold.status, headline: car.headline, highlights: car.highlights, render: car.render },
    notice: Object.fromEntries(CIN_FIELDS.map((f) => [f.key, car.cin[f.key].value ?? null])),
    noticeNotes: Object.fromEntries(NOTE_KEYS.filter((k) => car.cin[k] && car.cin[k].note).map((k) => [k, car.cin[k].note])),
    checks: quickChecks(car, now),
    economy: { value: car.economy.value, unit: car.economy.unit, truth: "Estimate", basis: "Typical figure for this model (manufacturer test), not measured on this car" },
    safety: { stars: car.safety.stars, truth: "Simulated", basis: "RightCar-style rating invented for the demo" },
    images: imgs(car).map((i) => ({ url: i.url, ratio: i.ratio, width: i.width, height: i.height, alt: i.alt, label: i.label })), imageNote: IMAGE_NOTE,
    testDriveSlots: slots.slice(0, 10).map(slotOut), moreSlots: Math.max(0, slots.length - 10),
    jsonld: `cars://car/${car.id}`, schema: `${SITE_URL}/cars/schema.json`,
  };
}

// ---------- running_cost ---------------------------------------------------------------------------------------------
// Typical combined economy by model family: an Estimate, stated with its basis. Used when no figure is passed in.
export const MODEL_ECONOMY = [
  [/aqua|prius c/i, "hybrid", 3.9], [/prius/i, "hybrid", 4.1], [/corolla.*hybrid|hybrid.*corolla/i, "hybrid", 4.2], [/corolla/i, "petrol", 6.2], [/rav4.*(phev|plug)/i, "plug-in hybrid", 6.0],
  [/rav4.*hybrid|rav4/i, "hybrid", 4.8], [/highlander.*hybrid/i, "hybrid", 5.6], [/highlander/i, "petrol", 9.5], [/swift/i, "petrol", 4.8], [/cx-?5/i, "petrol", 7.4], [/cx-?3/i, "petrol", 6.3],
  [/fit.*hybrid|jazz.*hybrid/i, "hybrid", 3.6], [/fit|jazz/i, "petrol", 5.0], [/leaf/i, "electric", 17.0], [/niro.*ev|e-niro/i, "electric", 15.9], [/niro/i, "hybrid", 4.4],
  [/sportage/i, "petrol", 8.0], [/ioniq.*(ev|electric)/i, "electric", 13.8], [/ioniq/i, "hybrid", 3.9], [/tucson/i, "petrol", 8.0], [/outlander.*(phev|plug)/i, "plug-in hybrid", 6.5],
  [/outlander/i, "petrol", 8.1], [/ranger/i, "diesel", 8.9], [/hilux/i, "diesel", 8.5], [/hiace/i, "diesel", 8.6], [/model ?3|model ?y|tesla/i, "electric", 15.0], [/atto ?3/i, "electric", 16.0],
  [/zs ?ev|mg4|mg ?4/i, "electric", 17.8], [/demio|mazda ?2/i, "petrol", 5.2], [/mazda ?3/i, "petrol", 6.4], [/yaris.*hybrid/i, "hybrid", 3.6], [/yaris/i, "petrol", 5.0],
];
const DEFAULT_ECONOMY = { petrol: 7.5, diesel: 8.5, hybrid: 4.5, "plug-in hybrid": 6.5, electric: 17.0 };
// the comparison car: a typical car of the same body on the other fuel (Estimate)
const COMPARE_ECONOMY = { electric: { hatch: 15.5, sedan: 15.5, suv: 18.0, ute: 24.0, van: 22.0 }, petrol: { hatch: 6.2, sedan: 6.8, suv: 8.4, ute: 10.5, van: 10.0 } };
const BODY_WORD = { hatch: "hatch", sedan: "sedan", suv: "SUV", ute: "ute", van: "van" };
const PHEV_KWH = 21; // kWh/100km in electric mode for a mid-size plug-in hybrid SUV (Estimate)
export function economyFor({ make, model, fuel, economy }) {
  if (economy) return { value: economy, unit: fuel === "electric" ? "kWh/100km" : "L/100km", truth: "Your data", basis: "Economy you supplied" };
  const name = `${make || ""} ${model || ""}`, hit = MODEL_ECONOMY.find(([re, f]) => re.test(name) && (!fuel || fuel === f || (fuel === "hybrid" && f === "hybrid")));
  const f = fuel || (hit && hit[1]) || "petrol", v = hit && (!fuel || hit[1] === fuel) ? hit[2] : DEFAULT_ECONOMY[f];
  return { value: v, unit: f === "electric" ? "kWh/100km" : "L/100km", truth: "Estimate", fuel: f,
    basis: hit && (!fuel || hit[1] === fuel) ? `Typical combined figure for a ${name.trim()} of this era; this car's own figure is on RightCar` : `Typical for a ${fuelLabel(f).toLowerCase()} car; pass the car's own figure for a better answer` };
}
function tariffFor(qsdep, region) {
  const row = (region && qsdep.locations.find((l) => l.location === region.qsdep)) || null;
  return { cents: row ? row.totalCents : qsdep.national.totalCents, location: row ? row.location : "New Zealand average", surveyDate: qsdep.surveyDate, url: qsdep.url || SNAPSHOT.qsdep.url, retrieved: qsdep.retrieved };
}
const r2 = (x) => Math.round(x * 100) / 100;
// the lines for one car on one fuel: shared by the car itself and the comparison car
function costLines({ fuel, eco, kmw, region, age, own, fuelEnv, qsdep, phevShare }) {
  const lines = [], fv = fuelEnv.values, used = new Set();
  const fuelTruth = { truth: fuelEnv.truth || "Latest published", period: fuelEnv.period, status: fuelEnv.status || "snapshot", source: fuelEnv.source };
  const add = (l) => lines.push({ ...l, weekly: r2(l.weekly), annual: Math.round(l.weekly * 52) });
  const petrol = (litres, label) => {
    const cpl = own.fuel_c_per_litre || fv.petrol91.retail; if (!own.fuel_c_per_litre) used.add("fuel");
    add({ key: "energy", label, weekly: (litres * cpl) / 100, truth: own.fuel_c_per_litre ? "Your data" : fuelTruth.truth, period: own.fuel_c_per_litre ? null : fuelTruth.period, status: own.fuel_c_per_litre ? null : fuelTruth.status,
      source: own.fuel_c_per_litre ? null : fuelTruth.source, basis: `${r2(litres)} L × ${cpl} c/L (${own.fuel_c_per_litre ? "your price" : "91, MBIE adjusted retail, national average"})`,
      note: own.fuel_c_per_litre ? null : `Includes ${fv.petrol91.taxes} c/L of taxes (excise, ETS levy and GST): petrol's road charge is inside the pump price.` });
  };
  const elec = (kwh, label) => {
    const t = tariffFor(qsdep, region), c = own.electricity_c_per_kwh || t.cents; if (!own.electricity_c_per_kwh) used.add("power");
    add({ key: "energy", label, weekly: (kwh * c) / 100, truth: own.electricity_c_per_kwh ? "Your data" : "Latest published", period: own.electricity_c_per_kwh ? null : `survey of ${fmtDate(t.surveyDate)}`, status: own.electricity_c_per_kwh ? null : "snapshot",
      source: own.electricity_c_per_kwh ? null : { name: `MBIE Quarterly Survey of Domestic Electricity Prices, ${t.location}`, url: t.url },
      basis: `${r2(kwh)} kWh (incl. ${ESTIMATES.chargingLoss * 100}% charging losses, Estimate) × ${c} c/kWh (${own.electricity_c_per_kwh ? "your rate" : `average household price, ${t.location}`}, incl. GST)`,
      note: own.electricity_c_per_kwh ? null : "An area average for an 8,000 kWh/yr household. Off-peak EV plans are often far cheaper: pass your own rate." });
  };
  let rucRate = 0;
  if (fuel === "electric") { elec((kmw * eco.value / 100) * (1 + ESTIMATES.chargingLoss), "Home charging"); rucRate = RUC.perThousandKm.electric; }
  else if (fuel === "plug-in hybrid") {
    elec((kmw * phevShare.value * PHEV_KWH / 100) * (1 + ESTIMATES.chargingLoss), `Charging (${Math.round(phevShare.value * 100)}% of km${phevShare.own ? "" : ", Estimate"})`);
    petrol(kmw * (1 - phevShare.value) * eco.value / 100, `Petrol (${Math.round((1 - phevShare.value) * 100)}% of km)`); rucRate = RUC.perThousandKm["plug-in hybrid"];
  } else if (fuel === "diesel") {
    const cpl = own.fuel_c_per_litre || fv.diesel.retail, l = kmw * eco.value / 100; if (!own.fuel_c_per_litre) used.add("fuel");
    add({ key: "energy", label: "Diesel", weekly: (l * cpl) / 100, truth: own.fuel_c_per_litre ? "Your data" : fuelTruth.truth, period: own.fuel_c_per_litre ? null : fuelTruth.period, status: own.fuel_c_per_litre ? null : fuelTruth.status,
      source: own.fuel_c_per_litre ? null : fuelTruth.source, basis: `${r2(l)} L × ${cpl} c/L (${own.fuel_c_per_litre ? "your price" : "MBIE adjusted retail, national average"})`, note: "Diesel carries almost no excise; the road charge is RUC instead." });
    rucRate = RUC.perThousandKm.diesel;
  } else petrol(kmw * eco.value / 100, fuel === "hybrid" ? "Petrol (hybrid)" : "Petrol");
  if (rucRate) used.add("ruc");
  add({ key: "ruc", label: "Road user charges", weekly: (kmw / 1000) * rucRate, truth: rucRate ? RUC.truth : "Source", period: rucRate ? RUC.label : null,
    source: RUC.source, basis: rucRate ? `${kmw} km × $${rucRate} per 1,000 km (${fuelLabel(fuel).toLowerCase()})` : "Petrol and ordinary hybrids don't buy RUC: the road charge is in the pump price", note: rucRate ? RUC.caveat : null });
  add({ key: "wof_licence", label: "WOF and licence", weekly: (ESTIMATES.licence.annual + ESTIMATES.wof.annual) / 52, truth: "Estimate", basis: `${ESTIMATES.licence.basis} ${ESTIMATES.wof.basis}`, source: LINKS.wof });
  const mBase = ESTIMATES.maintenance[fuel] || ESTIMATES.maintenance.petrol, mAnnual = mBase * (age != null && age > 8 ? ESTIMATES.maintenance.olderFactor : 1);
  add({ key: "maintenance", label: "Servicing, tyres, brakes", weekly: mAnnual / 52, truth: "Estimate", basis: `${money(mAnnual)} a year. ${ESTIMATES.maintenance.basis}` });
  return { lines, used, rucRate, mAnnual, total: r2(lines.reduce((s, l) => s + l.weekly, 0)) };
}
export function runningCost(args = {}, ctx = {}, stock = null, now = new Date()) {
  const car = args.car_id && stock ? findCar(stock, args.car_id) : null;
  if (args.car_id && stock && !car) return { error: `No demo car with id "${args.car_id}". Ids run from hl-001 to hl-048.` };
  const fuel = car ? car.fuel : args.fuel || economyFor(args).fuel || "petrol";
  const eco = car ? { value: car.economy.value, unit: car.economy.unit, truth: car.economy.truth } : economyFor({ ...args, fuel });
  const kmw = args.km_per_week != null ? args.km_per_week : 200;
  const region = regionByName(args.region) || (car ? siteRegion(car.site) : null) || regionByName(ctx.userRegion) || regionByName("Auckland");
  const fuelEnv = ctx.fuel && !ctx.fuel.error ? ctx.fuel : SNAPSHOT.fuel, qsdep = ctx.qsdep || SNAPSHOT.qsdep;
  const year = car ? car.year : args.year, age = year ? nzYear(now) - year : null, body = car ? car.body : args.body || "hatch";
  const own = { fuel_c_per_litre: args.fuel_c_per_litre, electricity_c_per_kwh: args.electricity_c_per_kwh };
  const phevShare = { value: args.electric_share != null ? args.electric_share : ESTIMATES.phevElectricShare, own: args.electric_share != null };
  const mine = costLines({ fuel, eco, kmw, region, age, own, fuelEnv, qsdep, phevShare });
  // the comparison: a typical car of the same body on the other fuel (an EV for anything that burns fuel, a petrol car for an EV)
  const alt = fuel === "electric" ? "petrol" : "electric", altEco = { value: COMPARE_ECONOMY[alt][body] || COMPARE_ECONOMY[alt].hatch, unit: alt === "electric" ? "kWh/100km" : "L/100km", truth: "Estimate" };
  const other = costLines({ fuel: alt, eco: altEco, kmw, region, age, own, fuelEnv, qsdep, phevShare });
  const t = tariffFor(qsdep, region), fv = fuelEnv.values;
  return {
    car: car ? { id: car.id, title: car.title, truth: "Simulated" } : { make: args.make, model: args.model, year: args.year, truth: "Your data" },
    fuel, economy: { value: eco.value, unit: eco.unit, truth: eco.truth }, kmPerWeek: kmw, region: region.name, place: `${region.name} (MBIE power price for ${t.location})`,
    lines: mine.lines, totalWeekly: mine.total, totalAnnual: Math.round(mine.total * 52),
    compare: { fuel: alt, label: `A typical ${alt === "electric" ? "electric" : "petrol"} ${BODY_WORD[body] || "car"}`, economy: altEco, totalWeekly: other.total, energyWeekly: other.lines[0].weekly, rucWeekly: other.lines.find((l) => l.key === "ruc").weekly,
      basis: "Same km, region, fixed costs and age; economy is a typical figure for the body type (Estimate)" },
    // everything a view needs to redo the sums at another distance or power price, without another call
    rates: { petrol91Cpl: own.fuel_c_per_litre && fuel !== "diesel" ? own.fuel_c_per_litre : fv.petrol91.retail, dieselCpl: own.fuel_c_per_litre && fuel === "diesel" ? own.fuel_c_per_litre : fv.diesel.retail,
      electricityCkwh: own.electricity_c_per_kwh || t.cents, electricityLocation: own.electricity_c_per_kwh ? "your rate" : t.location, rucPerThousandKm: RUC.perThousandKm,
      wofLicenceAnnual: ESTIMATES.licence.annual + ESTIMATES.wof.annual, maintenanceAnnual: { [fuel]: mine.mAnnual, [alt]: other.mAnnual }, chargingLoss: ESTIMATES.chargingLoss, phevElectricShare: phevShare.value, phevKwhPer100km: PHEV_KWH },
    notIncluded: ["insurance", "finance", "depreciation", "parking and tolls"],
    feeds: { fuel: { period: fuelEnv.period, status: fuelEnv.status || "snapshot" } },
    credits: ["fuel", "power", "ruc"].filter((k) => mine.used.has(k) || other.used.has(k)).map((k) => CREDITS[k]),
  };
}

// ---------- car_check ------------------------------------------------------------------------------------------------
function factsFromCar(car) {
  const v = (k) => car.cin[k].value;
  return { make: car.make, model: `${car.model} ${car.variant}`.trim(), year: car.year, odometer_km: car.odometerKm, price_nzd: car.priceNzd, fuel: car.fuel, body: car.body, seller: "dealer",
    wof_expiry: v("wof.expiry"), licence_expiry: v("licence.expiry"), money_owing: v("securityInterest.registered"), price_includes_on_road_costs: v("price.includes") ? "yes" : "unknown",
    imported: car.imported ? "yes" : "no", year_first_registered_overseas: v("import.yearFirstRegisteredOverseas"), country_last_registered: v("import.countryLastRegistered"), imported_as_damaged: v("import.damaged"),
    odometer_may_be_inaccurate: v("odometer.mayBeInaccurate"), supplier_details_shown: "yes", trader_number_shown: "yes", vin_shown: "yes",
    engine_cc: v("vehicle.engineCapacity"), ruc_applies: v("ruc.applies"), ruc_outstanding: v("ruc.outstanding"), region: DEALER.sites[car.site].region };
}
const known = (x) => x !== undefined && x !== null && x !== "" && x !== "unknown";
// The model's NZTA register facts, short enough for the model to read (no fetch time; the data month is in `period`)
export function registerSummary(reg, demo = false) {
  if (!reg) return null;
  const base = { status: reg.status === "cached" ? "live" : reg.status, truth: "Source", source: REGISTER_SOURCE, ...(demo ? { scope: "Real NZTA figures for this model and year; the demo car itself is Simulated." } : {}) };
  if (reg.status !== "live" && reg.status !== "cached") return { ...base, found: null, reason: reg.reason };
  if (!reg.found) return { ...base, found: false, name: reg.name, period: reg.period };
  const pick = (o, ...k) => (o ? Object.fromEntries(k.map((x) => [x, o[x]])) : null);
  return { ...base, found: true, name: reg.name, period: reg.period, total: reg.total, nzNewPct: reg.nzNewPct, usedImportPct: reg.usedImportPct,
    // an engine size means nothing for a battery EV (the register's figure for one isn't a displacement), so it's left out
    fuel: pick(reg.fuel, "value", "pct"), engineCc: reg.fuel && reg.fuel.value === "electric" ? null : pick(reg.engineCc, "cc", "pct"), previousCountry: pick(reg.previousCountry, "value", "pct"),
    ratedEconomy: reg.ratedEconomy ? { lPer100km: reg.ratedEconomy.lPer100km, basis: "Rated combined figure recorded on the register: rated, not real-world." } : null,
    firstNzRegistration: reg.firstNzRegistration || null, ...(reg.matchedFrom ? { matchedFrom: reg.matchedFrom } : {}), ...(reg.note ? { note: reg.note } : {}) };
}
// Look the model up on NZTA's register before car_check runs (car_check itself stays synchronous for the page's offline copy).
// Tries the model as given and, for a model with a variant ("Aqua G", "RAV4 Hybrid GX"), its first word too, in parallel.
const GENERIC_FIRST = new Set(["MODEL", "SERIES", "CLASS", "LAND", "GRAND", "NEW", "THE"]);
export async function registerFor(stock, args = {}, opts = {}) {
  const car = args.car_id ? findCar(stock, args.car_id) : null;
  const make = car ? car.make : args.make, model = car ? car.model : args.model, year = car ? car.year : args.year;
  if (typeof make !== "string" || typeof model !== "string" || /[:\/@]/.test(make + model)) return lookupModel({}, opts); // "skipped", with its reason
  const words = model.trim().split(/\s+/), first = words[0];
  const tries = [lookupModel({ make, model, year }, opts)];
  if (words.length > 1 && first.length >= 2 && !GENERIC_FIRST.has(first.toUpperCase())) tries.push(lookupModel({ make, model: first, year }, opts));
  const [whole, short] = await Promise.all(tries);
  return whole.found || !short || (short.status !== "live" && short.status !== "cached") || !short.found ? whole : { ...short, matchedFrom: model };
}
export function carCheck(stock, args = {}, ctx = {}, now = new Date()) {
  const car = args.car_id ? findCar(stock, args.car_id) : null;
  if (args.car_id && !car) return { error: `No demo car with id "${args.car_id}". To check another listing, pass its facts instead of car_id.` };
  const f = car ? { ...factsFromCar(car), km_per_week: args.km_per_week, ...(args.region ? { region: args.region } : {}) } : args, dataTruth = car ? "Simulated" : "Your data";
  if (!car && !known(f.make) && !known(f.model)) return { error: "Pass a demo car_id, or at least the make and model of the listing (plus whatever else is known)." };
  const today = nzParts(now).ymd, thisYear = nzYear(now), seller = f.seller || "unknown";
  const name = car ? car.title : [f.year, f.make, f.model].filter(known).join(" ");
  // what's missing versus the notice
  const isImport = f.imported === "yes" || known(f.year_first_registered_overseas) || known(f.country_last_registered);
  const argOf = { "vehicle.makeModel": known(f.make) && known(f.model) ? "x" : undefined, "fuel.type": known(f.fuel) ? "x" : undefined };
  const missing = [];
  for (const fld of CIN_FIELDS) {
    if (fld.importOnly && f.imported === "no") continue;
    const has = fld.key in argOf ? argOf[fld.key] : fld.arg ? (/_shown$/.test(fld.arg) ? f[fld.arg] === "yes" : known(f[fld.arg])) : !!car;
    if (!has) missing.push({ key: fld.key, label: fld.label + (fld.importOnly && f.imported !== "yes" ? " (if it's a used import)" : "") });
  }
  if (!car && f.imported !== "yes" && f.imported !== "no") missing.unshift({ key: "import.isImported", label: "Whether it's a used import or NZ-new" });
  // red flags
  const flags = [], flag = (level, title, why) => flags.push({ level, title, why, truth: dataTruth });
  const wm = known(f.wof_expiry) ? monthsBetween(today, f.wof_expiry.length === 7 ? f.wof_expiry + "-28" : f.wof_expiry) : null;
  if (wm == null) flag("ask", "WOF expiry not shown", "Ask for the expiry, or check it yourself on NZTA's free WOF and licence check.");
  else if (wm < 0) flag("stop", "WOF has expired", `Expired ${fmtDate(f.wof_expiry)}. Don't drive it away without a new WOF; ask who pays for it.`);
  else if (wm < 2) flag("watch", "WOF runs out soon", `Expires ${fmtDate(f.wof_expiry)} (${wm} months). Ask for a fresh WOF as part of the sale.`);
  const lm = known(f.licence_expiry) ? monthsBetween(today, f.licence_expiry.length === 7 ? f.licence_expiry + "-28" : f.licence_expiry) : null;
  if (lm == null) flag("ask", "Licence (rego) expiry not shown", "Ask, or check it on NZTA's free check.");
  else if (lm < 0) flag("watch", "Licence (rego) has lapsed", `Lapsed ${fmtDate(f.licence_expiry)}. You'd have to relicense it before driving, and may owe back fees.`);
  if (f.money_owing === "yes") flag("stop", "Money owing is registered", "A security interest is registered on the PPSR, so a lender could repossess the car. Get it cleared, in writing, before you pay.");
  else if (!known(f.money_owing)) flag("ask", "Money owing unknown", "Nobody has said whether there's a security interest. Run a PPSR search before paying: it takes minutes.");
  if (f.imported_as_damaged === "yes") flag("stop", "Imported as a damaged vehicle", "Ask what the damage was and for the repair certification. Get an independent inspection.");
  else if (isImport && !known(f.imported_as_damaged)) flag("ask", "Import damage status not shown", "A dealer's notice must say whether a used import arrived damaged. Ask.");
  if (f.odometer_may_be_inaccurate === true) flag("watch", "Odometer may be inaccurate", "The seller says the reading may be wrong. A vehicle history report shows past readings from the register.");
  if (known(f.odometer_km) && known(f.year)) {
    const per = Math.round(f.odometer_km / Math.max(0.5, thisYear - f.year + 0.5));
    if (per > 25000) flag("watch", "High use for its age", `About ${per.toLocaleString("en-NZ")} km a year. Ask for the service history.`);
    if (per < 3000 && thisYear - f.year > 3) flag("ask", "Very low km for its age", `About ${per.toLocaleString("en-NZ")} km a year. Worth checking the odometer history.`);
  } else flag("ask", "Odometer reading not given", "A dealer must state the actual distance travelled.");
  const fl = f.fuel;
  if (fl === "electric") flag("ask", "Battery health unknown", (/leaf/i.test(f.model || "") ? "Leafs have no active battery cooling, so health varies a lot. " : "") + "Ask for a battery state-of-health report before agreeing a price.");
  if ((fl === "hybrid" || fl === "plug-in hybrid") && known(f.year) && thisYear - f.year > 8) flag("ask", "Older hybrid battery", "Ask whether the hybrid battery has been tested or replaced.");
  if ((fl === "diesel" || fl === "electric" || fl === "plug-in hybrid") && f.ruc_outstanding === "yes") flag("watch", "Road user charges outstanding", "Ask the seller to clear the RUC or adjust the price.");
  if ((fl === "diesel" || fl === "electric" || fl === "plug-in hybrid") && !known(f.ruc_outstanding)) flag("ask", "RUC status not shown", "This fuel pays road user charges. Ask whether any are outstanding.");
  if (car && car.cin["registration.reRegistered"].value) flag("watch", "Re-registered vehicle", "It was deregistered at some point and registered again. Ask why, and get an independent inspection.");
  if (car && car.cin["radio.fm88to108"].value === false) flag("info", "Japanese-market radio", "It won't receive all NZ FM stations without a band expander. Minor, but it's on the notice.");
  if (seller === "private") flag("ask", "Private sale", "A private seller doesn't have to give you a Consumer Information Notice, the Consumer Guarantees Act doesn't apply, and the Motor Vehicle Disputes Tribunal only hears claims against traders. Do every check yourself.");
  if (seller === "dealer" && f.trader_number_shown !== "yes") flag("ask", "Trader registration number not shown", "Every dealer notice shows one. Look the trader up on the Motor Vehicle Traders Register.");
  // NZTA register: plain comparisons between the listing and the model's figures (register.js), labelled Source
  const reg = ctx.register || null;
  for (const c of registerCues(reg, { fuel: known(f.fuel) ? f.fuel : undefined, imported: f.imported })) flags.push(c);
  if (!known(f.price_nzd)) flag("ask", "No price", "Ask for the cash price including GST, registration and licensing.");
  else if (seller !== "private" && f.price_includes_on_road_costs !== "yes") flag("ask", "On-road costs unclear", "A dealer's cash price on the notice includes GST, registration and licensing. Confirm the drive-away figure.");
  // checks before paying (official sites only)
  const checks = [
    { id: "ppsr", title: "Money owing (PPSR search)", how: "Search the plate or VIN on the Personal Property Securities Register on the day you pay.", link: LINKS.ppsr },
    { id: "wof", title: "WOF and licence status", how: "NZTA's free check shows the WOF and licence expiry for a plate.", link: LINKS.wof },
    { id: "report", title: "This car's own records (by plate)", how: "The model facts here come live from NZTA's open register. This car's own records go by its plate: WOF and licence on NZTA's free check, money owing on the PPSR, and past odometer readings, import and stolen status in a vehicle information report (private providers sell these; we don't link to one).", link: null },
    { id: "inspection", title: "Pre-purchase inspection", how: "An independent mechanic or inspection service, before you agree a price. Never the seller's own workshop.", link: null },
    { id: "safety", title: "Safety rating and fuel economy", how: "RightCar shows the real star rating and fuel economy for the plate.", link: LINKS.rightcar },
  ];
  if (seller !== "private") checks.push({ id: "trader", title: "Trader is registered", how: "Search the trader's name or number on the Motor Vehicle Traders Register; ask for a copy of the notice when you buy.", link: LINKS.traderRegister });
  // fair price: questions and comparisons the buyer can run, never an invented market price
  const fairPrice = {
    marketPrice: null, note: "Not looked up: this tool has no market price data and doesn't invent one.",
    questions: [
      known(f.year) && known(f.make) ? `Compare at least three ${f.year - 1}–${f.year + 1} ${f.make} ${String(f.model || "").split(" ")[0]} listings${known(f.odometer_km) ? ` with ${Math.max(0, Math.round((f.odometer_km - 15000) / 1000))},000–${Math.round((f.odometer_km + 15000) / 1000)},000 km` : ""}, the same day, in your region.` : "Compare at least three listings of the same model, year and km, the same day.",
      "Is that the drive-away cash price, with GST, registration and licensing in it? Anything added at signing (paint protection, warranty, finance fees) is negotiable.",
      "Ask for the service history and when the next big service is due.",
      seller === "dealer" ? "Ask what the dealer will fix before handover, and get it on the agreement." : "Ask why it's being sold, and how long they've owned it.",
    ].filter(Boolean),
  };
  const rc = runningCost(car ? { car_id: car.id, km_per_week: f.km_per_week, region: f.region } : { make: f.make, model: f.model, year: f.year, fuel: known(fl) ? fl : undefined, body: known(f.body) ? f.body : undefined, km_per_week: f.km_per_week, region: f.region }, ctx, stock, now);
  if (known(f.price_nzd) && rc.totalWeekly) fairPrice.questions.push(`Put the running cost next to the price: about ${money(rc.totalWeekly)} a week is ${money(rc.totalWeekly * 156)} over three years, on top of ${money(f.price_nzd)}.`);
  const stops = flags.filter((x) => x.level === "stop").length, asks = flags.filter((x) => x.level === "ask").length;
  return {
    lookedUp: false,
    statement: car ? `I didn't look this car up by plate or owner. It's a Simulated demo car: the checks below come from its notice and labelled estimates${reg && reg.found ? ", and the register figures are real NZTA counts for its model" : ""}.`
      : `I didn't look this car up by plate or owner. Everything below comes from the facts passed in (Your data), official guidance and labelled estimates${reg && reg.found ? ", plus NZTA's open register for the model" : ""}.`,
    car: { name, id: car ? car.id : null, truth: dataTruth, seller, source: car ? "demo stock" : f.source || "facts passed in", body: car ? car.body : known(f.body) ? f.body : null, ...(car ? { image: img(car, "4:3") } : {}) },
    facts: Object.fromEntries(Object.entries(f).filter(([k, v]) => known(v) && k !== "km_per_week" && k !== "source").map(([k, v]) => [k, v])), factsTruth: dataTruth,
    notice: { required: seller !== "private", present: CIN_FIELDS.length - missing.filter((m) => m.key !== "import.isImported").length, total: CIN_FIELDS.length, missing,
      note: seller === "private" ? "A private seller doesn't have to give a notice, but these are still the facts to ask for." : "A dealer must show every one of these on the Consumer Information Notice, online listings included." },
    redFlags: flags, checks, checksTruth: "Source", fairPrice, runningCost: rc, register: registerSummary(reg, !!car),
    summary: stops ? `${stops} thing${stops > 1 ? "s" : ""} to resolve before paying, ${asks} question${asks === 1 ? "" : "s"} to ask.` : asks ? `Nothing stops the sale on these facts; ${asks} question${asks === 1 ? "" : "s"} to ask and ${checks.length} checks to run before paying.` : `No red flags in these facts. Run the ${checks.length} checks before paying.`,
    sources: [LINKS.cin, LINKS.traderDuties], credits: [...rc.credits, ...(reg && reg.found ? [REGISTER_SOURCE] : [])],
  };
}

// ---------- book_test_drive and hold_car (Simulated requests, approval required) -------------------------------------
// The reference a person at a real dealer would quote goes only in the result's _meta (hidden from the model; the plugin
// guidelines keep request ids out of model-visible output unless they're strictly needed). In this demo nothing keeps it.
const reqRef = (p) => p + "-" + Math.random().toString(36).slice(2, 6).toUpperCase() + Date.now().toString(36).slice(-3).toUpperCase();
const CONTACT = /[^\s@]+@[^\s@]+\.[a-z]{2,}|(?:\+64|\b0)[\s-]?\d{1,2}[\s-]?\d{3}[\s-]?\d{3,4}\b/i;
const noContact = (field, v) => (v && CONTACT.test(v) ? `${field} looks like it has contact details in it. Leave them out: this demo collects none, and a live version would ask for them only on the dealer's confirmation page.` : null);
export function bookTestDrive(stock, args, now = new Date()) {
  const car = findCar(stock, args.car_id);
  if (!car) return { error: `No demo car with id "${args.car_id}".` };
  const bad = noContact("buyer_note", args.buyer_note); if (bad) return { error: bad };
  const slots = slotsFor(car, now), slot = slots.find((s) => s.start.slice(0, 16) === String(args.slot).slice(0, 16));
  if (!slot) return { error: car.hold.status !== "available" ? `${car.title} is on hold for another buyer (Simulated); no test drives.` : `That time isn't free. Free times: ${slots.slice(0, 6).map((s) => s.start).join(", ")}${slots.length > 6 ? " …" : ""}` };
  const site = DEALER.sites[car.site];
  return { simulated: true, status: "requested: waiting for a person at the dealer to confirm", authority: "act with approval",
    car: { id: car.id, title: car.title }, slot: slotOut(slot), site: site.name, address: site.address,
    sideEffects: "None. This is a demo: nothing was sent to anyone and nothing was stored.",
    nextStep: `A person at ${site.name} would confirm or offer another time. Until then it isn't booked.`, note: truthNote, _ref: reqRef("TD") };
}
export function holdCar(stock, args, now = new Date()) {
  const car = findCar(stock, args.car_id);
  if (!car) return { error: `No demo car with id "${args.car_id}".` };
  const bad = noContact("reason", args.reason); if (bad) return { error: bad };
  if (car.hold.status !== "available") return { error: `${car.title} is already on hold for another buyer (Simulated).` };
  const today = nzParts(now).ymd, until = args.hold_until || addDays(today, 2);
  const days = (new Date(until + "T12:00:00Z") - new Date(today + "T12:00:00Z")) / 864e5;
  if (days < 0 || days > 3) return { error: `A hold can run from today to ${addDays(today, 3)} (3 days at most).` };
  const site = DEALER.sites[car.site];
  return { simulated: true, status: "requested: a person at the dealer must approve the hold", authority: "act with approval",
    car: { id: car.id, title: car.title, priceNzd: car.priceNzd }, holdUntil: until, site: site.name,
    sideEffects: "None. Nothing is held, sent or stored, and no deposit is taken: this demo dealer is fictional.",
    nextStep: `Until ${site.name} approves, the car isn't held and anyone could buy it.`, note: truthNote, _ref: reqRef("HOLD") };
}

// ---------- one entry point for MCP and the page ------------------------------------------------------------------
const fmtLine = (l) => `${l.label}: ${money(l.weekly, 2)}/wk (${l.truth}${l.period ? " · " + l.period : ""})`;
const credit = (c) => `${c.name}${c.licence ? ` (${c.licence})` : ""}`;
function summarize(name, r) {
  if (r.error) return r.error;
  if (name === "search_cars") return `${r.matched} of ${r.total} demo cars match (${r.interpreted.join(", ") || "no filters"}). Simulated stock from ${r.dealer}.${r.closeMatches ? ` Also ${r.closeMatches} close match${r.closeMatches > 1 ? "es" : ""}, each missing one limit.` : ""}\n` +
    r.results.map((c) => `${c.rank}. ${c.id} · ${c.title} · ${money(c.priceNzd)} · ${c.odometerKm.toLocaleString("en-NZ")} km · ${c.site === c.region ? c.site : `${c.site}, ${c.region}`}${c.hold !== "available" ? " · ON HOLD" : ""}${c.match === "close" ? ` · CLOSE MATCH: ${c.missed.join("; ")}` : ""}\n   why: ${c.why.join("; ") || "no filters"}`).join("\n") +
    (Object.keys(r.excluded).length ? `\nExcluded: ${Object.entries(r.excluded).map(([k, v]) => `${v} ${k}`).join(", ")}.` : "") + `\nImages: ${IMAGE_NOTE}`;
  if (name === "get_car") { const c = r.car, k = r.checks; return `${c.title} (${c.id}) · ${money(c.priceNzd)} · ${c.odometerKm.toLocaleString("en-NZ")} km · ${c.site === c.region ? c.site : `${c.site}, ${c.region}`}. Simulated listing.\nNotice: ${k.cinFields.present}/${k.cinFields.total} fields. WOF to ${fmtDate(k.wof.expiry)} (${k.wof.monthsLeft} months). Licence to ${fmtDate(k.licence.expiry)}. Money owing: ${k.moneyOwing.note}\nEconomy ${r.economy.value} ${r.economy.unit} (Estimate). Safety ${r.safety.stars} stars (RightCar-style, Simulated).\nFree test-drive times: ${r.testDriveSlots.map((s) => `${s.label} (${s.start})`).join(", ") || "none"}${r.moreSlots ? ` and ${r.moreSlots} more` : ""}.\nImages: ${IMAGE_NOTE}`; }
  if (name === "running_cost") return `${r.car.title || [r.car.year, r.car.make, r.car.model].filter(Boolean).join(" ") || fuelLabel(r.fuel)} at ${r.kmPerWeek} km a week in ${r.region}: about ${money(r.totalWeekly, 2)} a week, ${money(r.totalAnnual)} a year.\n` + r.lines.map(fmtLine).join("\n") +
    `\nCompared with ${r.compare.label.toLowerCase()}: about ${money(r.compare.totalWeekly, 2)} a week (Estimate).\nNot included: ${r.notIncluded.join(", ")}.\nData: ${r.credits.map(credit).join("; ")}.`;
  if (name === "car_check") return `${r.statement}\n${r.car.name}: ${r.summary}\n${r.register ? registerLine(r.register) + (r.register.scope ? ` (${r.register.scope})` : "") + "\n" : ""}Notice fields present: ${r.notice.present}/${r.notice.total}${r.notice.missing.length ? ` · missing: ${r.notice.missing.map((m) => m.label).join("; ")}` : ""}.\n` +
    (r.redFlags.length ? "Red flags and questions:\n" + r.redFlags.map((x) => `- [${x.level}] ${x.title}: ${x.why}`).join("\n") + "\n" : "") +
    "Checks before paying:\n" + r.checks.map((c) => `- ${c.title}: ${c.how}${c.link ? " " + c.link.url : ""}`).join("\n") + `\nFair price: ${r.fairPrice.note}\n` + r.fairPrice.questions.map((q) => "- " + q).join("\n") +
    `\nRunning cost: about ${money(r.runningCost.totalWeekly, 2)} a week at ${r.runningCost.kmPerWeek} km (${r.runningCost.compare.label.toLowerCase()}: about ${money(r.runningCost.compare.totalWeekly, 2)}).\nData: ${r.credits.map(credit).join("; ")}.`;
  if (name === "book_test_drive") return `Requested (Simulated): a test drive of ${r.car.title} at ${r.slot.label}. ${r.nextStep} ${r.sideEffects}`;
  if (name === "hold_car") return `Requested (Simulated): hold ${r.car.title} until ${fmtDate(r.holdUntil)}. ${r.nextStep} ${r.sideEffects}`;
  return JSON.stringify(r);
}
// small, safe clean-ups before validation: region names without macrons or apostrophes, weekday case, stray spaces
function normalise(args) {
  const a = { ...args };
  for (const [k, v] of Object.entries(a)) { if (v === undefined) delete a[k]; else if (typeof v === "string") a[k] = v.trim(); }
  if (typeof a.region === "string") { const r = regionByName(a.region); if (r) a.region = r.name; }
  if (typeof a.test_drive_day === "string") a.test_drive_day = a.test_drive_day.toLowerCase();
  return a;
}
const LINKISH = /\bhttps?:|\bwww\.|\b[a-z0-9-]+\.(?:co\.nz|com|nz|net|org|io)\b/i;
// callTool(name, args, { stock, ctx, now }) → { structuredContent, text, isError, meta } or throws { code, message } for unknown tools.
// meta is the result's _meta: data for a view, never shown to the model.
export function callTool(name, args = {}, env = {}) {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) { const e = new Error(`Unknown tool: ${name}`); e.code = -32602; throw e; }
  const a = args && typeof args === "object" && !Array.isArray(args) ? normalise(args) : args;
  const errs = validate(tool.inputSchema, a || {});
  if (errs.length) {
    const town = a && typeof a.region === "string" && !regionByName(a.region) ? regionFromText(a.region) : null;
    return { isError: true, text: town ? `region takes one of New Zealand's 16 regions, not a town: for ${a.region} use "${town.name}".` : `Invalid arguments for ${name}: ${errs.join("; ")}.` };
  }
  if (name === "car_check") { const bad = Object.entries(a).find(([, v]) => typeof v === "string" && LINKISH.test(v)); if (bad) return { isError: true, text: `car_check doesn't take links and never fetches pages (${bad[0]} looks like one). Pass the listing's facts instead: make, model, year, km, price, fuel, region.` }; }
  const { stock, ctx = {}, now = new Date() } = env;
  const r = name === "search_cars" ? searchCars(stock, a, now, ctx) : name === "get_car" ? getCar(stock, a, now) : name === "car_check" ? carCheck(stock, a, ctx, now)
    : name === "running_cost" ? runningCost(a, ctx, stock, now) : name === "book_test_drive" ? bookTestDrive(stock, a, now) : holdCar(stock, a, now);
  if (r.error) return { isError: true, text: r.error };
  const { _ref, ...full } = r, meta = {};
  if (_ref) meta["assembl/requestRef"] = _ref;
  // the model gets a compact running cost; the card gets the full one (rates for its sliders, each line's source) in _meta
  let structuredContent = full;
  if (name === "running_cost") { structuredContent = compactCost(full, true); meta["assembl/view"] = { runningCost: full }; }
  if (name === "car_check") { structuredContent = { ...full, runningCost: compactCost(full.runningCost, false) }; meta["assembl/view"] = { runningCost: full.runningCost }; }
  return { isError: false, text: summarize(name, full), structuredContent, meta: Object.keys(meta).length ? meta : undefined };
}
function compactCost(rc, detail) {
  const lines = rc.lines.map((l) => ({ key: l.key, label: l.label, weekly: l.weekly, annual: l.annual, truth: l.truth, ...(detail ? { ...(l.period ? { period: l.period } : {}), basis: l.basis } : {}) }));
  return { ...(detail ? { car: rc.car, economy: rc.economy, place: rc.place } : {}), fuel: rc.fuel, kmPerWeek: rc.kmPerWeek, region: rc.region, lines, totalWeekly: rc.totalWeekly, totalAnnual: rc.totalAnnual,
    compare: { fuel: rc.compare.fuel, label: rc.compare.label, totalWeekly: rc.compare.totalWeekly }, notIncluded: rc.notIncluded, ...(detail ? { feeds: rc.feeds, credits: rc.credits } : {}) };
}
