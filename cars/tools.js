// assembl lab · Agent-ready cars: the tool logic behind /api/mcp and the /cars/ page.
// One source, two homes: the MCP function imports this file from api/_cars/, and the lab build copies it to /cars/tools.js so
// the page runs the same functions in the browser when the endpoint can't be reached. No Node APIs, no dependencies.
//
// Truth labels (never blurred): Simulated (the demo dealer and its stock are invented), Source (copied from an official
// document), Estimate (an assumption we state, with its basis), Your data (facts the buyer or the chat passed in),
// Live / Latest published (a public feed, with its period). Nothing here looks a car up anywhere, scrapes a listing site,
// or contacts a dealer: the two "write" tools only return a request a person at the (fictional) dealer would have to confirm.

export const VERSION = "1.0.0";
export const SITE_URL = "https://assembl-lab.vercel.app";

// ---------- the fictional dealer group -------------------------------------------------------------------------------
export const DEALER = {
  name: "Harbour Lane Motors (demo)",
  note: "A fictional dealer group invented for this demonstration. It has no yard, no phone and no stock; every listing is Simulated.",
  sites: {
    auckland: { id: "auckland", name: "Harbour Lane Motors Auckland (demo)", address: "1 Harbour Lane, Penrose, Auckland (fictional address)", region: "Auckland", lat: -36.910, lon: 174.815 },
    hamilton: { id: "hamilton", name: "Harbour Lane Motors Hamilton (demo)", address: "2 Harbour Lane, Te Rapa, Hamilton (fictional address)", region: "Waikato", lat: -37.745, lon: 175.236 },
    tauranga: { id: "tauranga", name: "Harbour Lane Motors Tauranga (demo)", address: "3 Harbour Lane, Mount Maunganui (fictional address)", region: "Bay of Plenty", lat: -37.660, lon: 176.195 },
  },
  contact: "hello@harbourlane.example (not monitored: .example is a reserved test domain)",
  traderNote: "Invented number in a format no real trader uses. Real traders are on the Motor Vehicle Traders Register.",
  hours: { weekday: [9, 10, 11, 13, 14, 15, 16], saturday: [9, 10, 11, 12, 13, 14], sunday: [] },
};

// Places a buyer might name. qsdep = the MBIE Quarterly Survey of Domestic Electricity Prices location (its own spelling).
export const PLACES = {
  auckland: { name: "Tāmaki Makaurau Auckland", lat: -36.85, lon: 174.76, qsdep: "Auckland Central" },
  "north shore": { name: "North Shore, Auckland", lat: -36.79, lon: 174.75, qsdep: "Auckland North Shore" },
  pukekohe: { name: "Pukekohe", lat: -37.20, lon: 174.90, qsdep: "Pukekohe" },
  whangarei: { name: "Whangārei", lat: -35.73, lon: 174.32, qsdep: "Whangarei" },
  hamilton: { name: "Kirikiriroa Hamilton", lat: -37.79, lon: 175.28, qsdep: "Hamilton" },
  cambridge: { name: "Cambridge", lat: -37.89, lon: 175.47, qsdep: "Cambridge" },
  waikato: { name: "Waikato", lat: -37.79, lon: 175.28, qsdep: "Hamilton" },
  tauranga: { name: "Tauranga", lat: -37.69, lon: 176.17, qsdep: "Tauranga" },
  "bay of plenty": { name: "Bay of Plenty", lat: -37.69, lon: 176.17, qsdep: "Tauranga" },
  rotorua: { name: "Rotorua", lat: -38.14, lon: 176.25, qsdep: "Rotorua" },
  taupo: { name: "Taupō", lat: -38.69, lon: 176.07, qsdep: "Taupo" },
  "new plymouth": { name: "New Plymouth", lat: -39.06, lon: 174.08, qsdep: "New Plymouth" },
  napier: { name: "Napier", lat: -39.49, lon: 176.91, qsdep: "Napier" },
  "palmerston north": { name: "Palmerston North", lat: -40.35, lon: 175.61, qsdep: "Palmerston North" },
  wellington: { name: "Te Whanganui-a-Tara Wellington", lat: -41.29, lon: 174.78, qsdep: "Wellington City" },
  nelson: { name: "Whakatū Nelson", lat: -41.27, lon: 173.28, qsdep: "Nelson" },
  christchurch: { name: "Ōtautahi Christchurch", lat: -43.53, lon: 172.64, qsdep: "Christchurch" },
  dunedin: { name: "Ōtepoti Dunedin", lat: -45.87, lon: 170.50, qsdep: "Dunedin" },
  queenstown: { name: "Queenstown", lat: -45.03, lon: 168.66, qsdep: "Queenstown" },
  invercargill: { name: "Waihōpai Invercargill", lat: -46.41, lon: 168.35, qsdep: "Invercargill" },
};
const fold = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z ]+/g, " ").replace(/\s+/g, " ").trim();
export function resolvePlace(input) {
  const s = fold(input);
  if (!s) return null;
  if (PLACES[s]) return { key: s, ...PLACES[s] };
  for (const [k, p] of Object.entries(PLACES)) if (s.includes(k) || fold(p.name).includes(s) || fold(p.qsdep) === s) return { key: k, ...p };
  if (/kirikiriroa/.test(s)) return { key: "hamilton", ...PLACES.hamilton };
  if (/tamaki|akl/.test(s)) return { key: "auckland", ...PLACES.auckland };
  if (/mount maunganui|mt maunganui|papamoa/.test(s)) return { key: "tauranga", ...PLACES.tauranga };
  return null;
}
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
    source: { name: "MBIE weekly fuel price monitoring", url: "https://www.mbie.govt.nz/building-and-energy/energy-and-natural-resources/energy-statistics-and-modelling/energy-statistics/weekly-fuel-price-monitoring" },
    fetchedAt: "2026-10-25T00:00:00.000Z",
  },
  qsdep: {
    surveyDate: "2026-08-15", retrieved: "2026-10-25", basis: "8,000 kWh/yr",
    url: "https://www.mbie.govt.nz/assets/Data-Files/Energy/nz-energy-quarterly-and-energy-in-nz/qsdep-report-15Aug2026.pdf",
    national: { location: "New Zealand", totalCents: 42.1 },
    locations: [["Auckland Central", 41.3], ["Auckland North Shore", 41.33], ["Pukekohe", 45.7], ["Whangarei", 44.53], ["Hamilton", 39.78], ["Cambridge", 43.74], ["Tauranga", 45.01],
      ["Rotorua", 42.93], ["Taupo", 42.16], ["New Plymouth", 43.47], ["Napier", 41.35], ["Palmerston North", 43.08], ["Wellington City", 37.2], ["Nelson", 38.43],
      ["Christchurch", 38.61], ["Dunedin", 42.49], ["Queenstown", 42.38], ["Invercargill", 39.02]].map(([location, totalCents]) => ({ location, totalCents })),
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
// `arg` is the matching car_check input for a listing the chat already has.
export const CIN_FIELDS = [
  { key: "supplier.name", label: "Supplier name", section: "Supplier", arg: "supplier_name", type: "string" },
  { key: "supplier.address", label: "Supplier address", section: "Supplier", arg: "supplier_address", type: "string" },
  { key: "supplier.contact", label: "Supplier contact", section: "Supplier", arg: null, type: "string" },
  { key: "supplier.traderRegistrationNumber", label: "Motor vehicle trader registration number", section: "Supplier", arg: "trader_registration_number", type: "string" },
  { key: "price.cash", label: "Cash price (NZD)", section: "Sale information", arg: "price_nzd", type: "number" },
  { key: "price.includes", label: "Price includes GST, registration and licensing", section: "Sale information", arg: "price_includes_on_road_costs", type: "string" },
  { key: "securityInterest.registered", label: "Security interest registered on the PPSR (money owing)", section: "Security interest", arg: "money_owing", type: "string" },
  { key: "vehicle.makeModel", label: "Make and model", section: "Vehicle", arg: "model", type: "string" },
  { key: "vehicle.year", label: "Vehicle year", section: "Vehicle", arg: "year", type: "integer" },
  { key: "vehicle.engineCapacity", label: "Engine capacity (cc)", section: "Vehicle", arg: "engine_cc", type: "integer" },
  { key: "vehicle.vin", label: "VIN or chassis number", section: "Vehicle", arg: "vin_or_chassis", type: "string" },
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

// ---------- JSON-LD (schema.org Car + Offer) ------------------------------------------------------------------------
const FUEL_LD = { petrol: "Gasoline", diesel: "Diesel", hybrid: "Hybrid electric (petrol)", "plug-in hybrid": "Plug-in hybrid electric (petrol)", electric: "Electric" };
const BODY_LD = { hatch: "Hatchback", sedan: "Sedan", suv: "SUV", ute: "Pickup (ute)", van: "Van" };
export function toJsonLd(car, base = SITE_URL) {
  const site = DEALER.sites[car.site], v = (k) => car.cin[k]?.value;
  return {
    "@context": "https://schema.org", "@type": "Car", "@id": `${base}/cars/#${car.id}`,
    name: car.title, brand: { "@type": "Brand", name: car.make }, model: car.model, vehicleConfiguration: car.variant,
    vehicleModelDate: String(car.year), productionDate: String(car.year), bodyType: BODY_LD[car.body], color: car.colour,
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
    }
  }
  return errs;
}

// ---------- tool definitions (MCP tools/list) ----------------------------------------------------------------------
const id = { type: "string", pattern: "^hl-\\d{3}$", description: "A demo car id from search_cars, e.g. hl-014" };
const ymdOrMonth = (d) => ({ type: "string", pattern: "^\\d{4}-\\d{2}(-\\d{2})?$", description: d });
const yn = (d) => ({ type: "string", enum: ["yes", "no", "unknown"], description: d });
const FUEL_ENUM = ["petrol", "diesel", "hybrid", "plug-in hybrid", "electric"];
export const CARD_URI = "ui://cars/car-check.html";
export const TOOLS = [
  {
    name: "search_cars", title: "Search the demo dealer's cars",
    description: "Search Harbour Lane Motors (demo), a fictional dealer with 48 Simulated used cars in Auckland, Hamilton and Tauranga. Give natural constraints; returns a ranked shortlist with why each car matched and how many were excluded and why. 'hybrid' includes plug-in hybrids. Every listing is Simulated: do not present these as real cars for sale.",
    inputSchema: { type: "object", additionalProperties: false, properties: {
      budget_max: { type: "number", minimum: 0, description: "Most the buyer will pay, NZD cash price" },
      budget_min: { type: "number", minimum: 0, description: "Least, NZD" },
      body: { type: "string", enum: ["hatch", "sedan", "suv", "ute", "van"], description: "Body type" },
      seats_min: { type: "integer", minimum: 2, maximum: 12 },
      fuel: { type: "string", enum: FUEL_ENUM, description: "Fuel. 'hybrid' also matches plug-in hybrids" },
      max_km: { type: "integer", minimum: 0, description: "Highest odometer reading, km" },
      min_year: { type: "integer", minimum: 1990, maximum: 2030 },
      near: { type: "string", description: "Where the buyer is: a NZ town or region, e.g. Hamilton, Auckland, Tauranga, Rotorua" },
      max_distance_km: { type: "number", minimum: 0, description: "Furthest dealer site from 'near', km" },
      must_have: { type: "array", maxItems: 10, items: { type: "string", maxLength: 60 }, description: "Plain-language must-haves, e.g. 'no money owing', 'towing', 'towing 2000 kg', 'awd', '7 seats', 'nz new', '5 star safety', 'wof 6 months'" },
      test_drive_day: { type: "string", maxLength: 20, description: "Day for a test drive: a weekday name like 'saturday', or YYYY-MM-DD within the next 7 days" },
      query: { type: "string", maxLength: 60, description: "Make or model words, e.g. 'RAV4' or 'Toyota'" },
      sort: { type: "string", enum: ["best match", "price", "newest", "lowest km"] },
      limit: { type: "integer", minimum: 1, maximum: 10, description: "How many to return (default 5)" },
    } },
    annotations: { title: "Search the demo dealer's cars", readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "get_car", title: "Get one car's notice, checks and test-drive slots",
    description: "The full Consumer Information Notice for one demo car as data (every field with its truth label), quick checks (WOF and licence months left, money owing as stated), estimated fuel economy, RightCar-style safety stars (Simulated), test-drive slots for the next 7 days and the schema.org JSON-LD.",
    inputSchema: { type: "object", additionalProperties: false, required: ["car_id"], properties: { car_id: id } },
    annotations: { title: "Get one car", readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "car_check", title: "Is this car a good buy?",
    description: "Check a car before paying. Pass a demo car_id OR the facts of any listing the chat already has (for example from another app earlier in this conversation): make, model, year, km, price, fuel, region and whatever notice fields are known. Returns what the listing is missing compared with the Consumer Information Notice a dealer must show, red flags, the checks to run before paying (official sites only), fair-price questions (no invented market prices) and the weekly running cost. It does NOT look the car up anywhere and never fetches a listing site.",
    inputSchema: { type: "object", additionalProperties: false, properties: {
      car_id: id,
      make: { type: "string", maxLength: 40 }, model: { type: "string", maxLength: 60, description: "Model and variant, e.g. 'Aqua G' or 'RAV4 Hybrid GX'" },
      year: { type: "integer", minimum: 1980, maximum: 2030 }, odometer_km: { type: "integer", minimum: 0, maximum: 2000000 },
      price_nzd: { type: "number", minimum: 0 }, fuel: { type: "string", enum: [...FUEL_ENUM, "unknown"] },
      body: { type: "string", enum: ["hatch", "sedan", "suv", "ute", "van", "unknown"] },
      region: { type: "string", maxLength: 60, description: "Where the buyer will drive it (sets power price)" },
      seller: { type: "string", enum: ["dealer", "private", "unknown"], description: "Dealer (motor vehicle trader) or private seller" },
      source: { type: "string", maxLength: 120, description: "Where these facts came from, e.g. 'listing shown earlier in this chat'" },
      wof_expiry: ymdOrMonth("WOF expiry, YYYY-MM-DD or YYYY-MM"), licence_expiry: ymdOrMonth("Licence (rego) expiry"),
      money_owing: yn("Is a security interest (money owing) registered on the PPSR, as stated by the seller?"),
      price_includes_on_road_costs: yn("Does the price include GST, registration and licensing?"),
      imported: yn("Used import?"), year_first_registered_overseas: { type: "integer", minimum: 1980, maximum: 2030 },
      country_last_registered: { type: "string", maxLength: 40 }, imported_as_damaged: yn("Imported as a damaged vehicle?"),
      odometer_may_be_inaccurate: { type: "boolean" },
      trader_registration_number: { type: "string", maxLength: 40 }, supplier_name: { type: "string", maxLength: 80 }, supplier_address: { type: "string", maxLength: 120 },
      engine_cc: { type: "integer", minimum: 0, maximum: 10000 }, vin_or_chassis: { type: "string", maxLength: 40 },
      ruc_applies: yn("Do road user charges apply?"), ruc_outstanding: yn("Are road user charges outstanding?"),
      km_per_week: { type: "number", minimum: 0, maximum: 5000, description: "For the running cost (default 200)" },
    } },
    annotations: { title: "Is this car a good buy?", readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    _meta: { ui: { resourceUri: CARD_URI }, "openai/outputTemplate": CARD_URI, "openai/toolInvocation/invoking": "Checking the notice", "openai/toolInvocation/invoked": "Checked" },
  },
  {
    name: "running_cost", title: "Weekly running cost",
    description: "Weekly and annual cost to run a car: fuel at MBIE's latest weekly national price, or home charging at MBIE's latest surveyed household power price for the place; road user charges at NZTA light-vehicle rates (diesel, EV, plug-in hybrid; petrol pays excise in the pump price); WOF, licence and maintenance as labelled estimates. Each line carries its truth label and source. Pass car_id, or fuel plus economy (or make and model).",
    inputSchema: { type: "object", additionalProperties: false, properties: {
      car_id: id, fuel: { type: "string", enum: FUEL_ENUM },
      make: { type: "string", maxLength: 40 }, model: { type: "string", maxLength: 60 }, year: { type: "integer", minimum: 1980, maximum: 2030 },
      economy: { type: "number", minimum: 0, maximum: 60, description: "L/100km for petrol, diesel and hybrids; kWh/100km for electric" },
      km_per_week: { type: "number", minimum: 0, maximum: 5000, description: "Default 200" },
      place: { type: "string", maxLength: 60, description: "Town for the power price, e.g. Hamilton (default Auckland)" },
      electricity_c_per_kwh: { type: "number", minimum: 0, maximum: 200, description: "The buyer's own power price (Your data), e.g. an off-peak EV plan" },
      fuel_c_per_litre: { type: "number", minimum: 0, maximum: 1000, description: "The buyer's own pump price (Your data)" },
      electric_share: { type: "number", minimum: 0, maximum: 1, description: "Plug-in hybrids: share of km driven on electricity (default 0.5, Estimate)" },
    } },
    annotations: { title: "Weekly running cost", readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  {
    name: "book_test_drive", title: "Request a test drive (needs the dealer's confirmation)",
    description: "Ask the demo dealer for a test drive in one of the free slots from get_car. Simulated: nothing is sent to anyone and nothing is stored. Returns a request id and says a person at the dealer must confirm. Only call after the buyer has approved the time.",
    inputSchema: { type: "object", additionalProperties: false, required: ["car_id", "slot"], properties: {
      car_id: id, slot: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}", description: "A slot start from get_car, e.g. 2026-10-31T10:00:00+13:00" },
      buyer_note: { type: "string", maxLength: 200, description: "Optional note for the dealer. Don't include contact details: this demo collects none." },
    } },
    annotations: { title: "Request a test drive", readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: "hold_car", title: "Ask the dealer to hold a car (needs approval)",
    description: "Ask the demo dealer to hold a car for up to 3 days. Simulated: nothing is held, sent or stored. Returns a request id and says a person at the dealer must approve it. Only call after the buyer has said yes.",
    inputSchema: { type: "object", additionalProperties: false, required: ["car_id"], properties: {
      car_id: id, hold_until: ymdOrMonth("Hold until (YYYY-MM-DD), at most 3 days ahead; default 2 days"), reason: { type: "string", maxLength: 200 },
    } },
    annotations: { title: "Ask the dealer to hold a car", readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
];

// ---------- helpers over the stock ----------------------------------------------------------------------------------
const FUEL_LABEL = { petrol: "Petrol", diesel: "Diesel", hybrid: "Petrol hybrid", "plug-in hybrid": "Plug-in hybrid (petrol)", electric: "Electric" };
export const fuelLabel = (f) => FUEL_LABEL[f] || f;
const findCar = (stock, cid) => stock.cars.find((c) => c.id === String(cid || "").toLowerCase().trim());
const truthNote = "Simulated: Harbour Lane Motors (demo) is fictional and so is every car it lists.";
const wofMonths = (car, today) => car.cin["wof.expiry"].value ? monthsBetween(today, car.cin["wof.expiry"].value) : null;

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
const nzYear = (now) => +nzParts(now).ymd.slice(0, 4);

// ---------- search_cars -------------------------------------------------------------------------------------------
const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
function parseMustHave(list) {
  const rules = [], notUnderstood = [];
  for (const raw of list || []) {
    const s = fold(raw), n = (s.match(/(\d{3,4})/) || [])[1];
    if (/money owing|no finance|no lien|security interest|ppsr|unencumbered|clear title/.test(s)) rules.push({ key: "noMoneyOwing", label: "no money owing (as stated)" });
    else if (/tow/.test(s)) rules.push({ key: "towing", kg: n ? +n : 1000, label: `towing ${n ? Number(n).toLocaleString("en-NZ") : "1,000"} kg braked` });
    else if (/awd|4wd|4x4|all wheel|four wheel/.test(s)) rules.push({ key: "awd", label: "AWD or 4WD" });
    else if (/(\d+) ?seat/.test(s)) rules.push({ key: "seats", n: +s.match(/(\d+) ?seat/)[1], label: s.match(/(\d+) ?seat/)[1] + " seats" });
    else if (/nz new|new zealand new|not imported/.test(s)) rules.push({ key: "nzNew", label: "NZ-new" });
    else if (/5 star|five star|safety/.test(s)) rules.push({ key: "fiveStar", label: "5-star safety (RightCar-style, Simulated)" });
    else if (/wof/.test(s)) { const m = +(s.match(/(\d+) ?month/) || [0, 6])[1]; rules.push({ key: "wof", months: m, label: `WOF with ${m}+ months left` }); }
    else if (/available|not on hold/.test(s)) rules.push({ key: "available", label: "not on hold" });
    else if (/test drive/.test(s)) { const d = WEEKDAYS.find((w) => s.includes(w)); if (d) rules.push({ key: "day", day: d, label: `test drive on ${d[0].toUpperCase() + d.slice(1)}` }); else notUnderstood.push(raw); }
    else notUnderstood.push(raw);
  }
  return { rules, notUnderstood };
}
export function searchCars(stock, args = {}, now = new Date()) {
  const today = nzParts(now).ymd, near = args.near ? resolvePlace(args.near) : null;
  const { rules, notUnderstood } = parseMustHave(args.must_have);
  let day = args.test_drive_day ? fold(args.test_drive_day) : null;
  const ruleDay = rules.find((r) => r.key === "day"); if (!day && ruleDay) day = ruleDay.day;
  const fuels = args.fuel === "hybrid" ? ["hybrid", "plug-in hybrid"] : args.fuel ? [args.fuel] : null;
  const q = fold(args.query), excluded = {}, rows = [];
  const ex = (why) => { excluded[why] = (excluded[why] || 0) + 1; };
  for (const car of stock.cars) {
    const site = DEALER.sites[car.site], dist = near ? km(near, site) : null, why = [];
    if (args.budget_max != null) { if (car.priceNzd > args.budget_max) { ex("over budget"); continue; } why.push(`${money(car.priceNzd)}, ${money(args.budget_max - car.priceNzd)} under your ${money(args.budget_max)}`); }
    if (args.budget_min != null && car.priceNzd < args.budget_min) { ex("under budget floor"); continue; }
    if (args.body && car.body !== args.body) { ex("different body type"); continue; }
    if (args.body) why.push(`${car.body === "suv" ? "SUV" : car.body}, ${car.seats} seats`);
    if (args.seats_min && car.seats < args.seats_min) { ex("too few seats"); continue; }
    if (fuels && !fuels.includes(car.fuel)) { ex("different fuel"); continue; }
    if (fuels) why.push(fuelLabel(car.fuel) + (car.economy ? ` · ${car.economy.value} ${car.economy.unit} (Estimate)` : ""));
    if (args.max_km != null && car.odometerKm > args.max_km) { ex("too many km"); continue; }
    if (args.min_year && car.year < args.min_year) { ex("too old"); continue; }
    if (args.max_distance_km != null && dist != null && dist > args.max_distance_km) { ex("too far away"); continue; }
    if (q && !fold(`${car.make} ${car.model} ${car.variant}`).includes(q)) { ex("doesn't match the make or model"); continue; }
    let fail = null;
    for (const r of rules) {
      if (r.key === "noMoneyOwing") { if (car.cin["securityInterest.registered"].value !== "no") { fail = "money owing stated"; break; } why.push("No money owing stated on the notice (run a PPSR search before paying)"); }
      if (r.key === "towing") { if ((car.towingKg || 0) < r.kg) { fail = "can't tow enough"; break; } why.push(`Tows ${car.towingKg.toLocaleString("en-NZ")} kg braked`); }
      if (r.key === "awd") { if (!/AWD|4WD/.test(car.drivetrain)) { fail = "not AWD or 4WD"; break; } why.push(car.drivetrain); }
      if (r.key === "seats") { if (car.seats < r.n) { fail = "too few seats"; break; } }
      if (r.key === "nzNew") { if (car.imported) { fail = "used import"; break; } why.push("NZ-new"); }
      if (r.key === "fiveStar") { if (car.safety.stars < 5) { fail = "under 5 stars"; break; } why.push("5 stars (RightCar-style, Simulated)"); }
      if (r.key === "wof") { const m = wofMonths(car, today); if (m == null || m < r.months) { fail = "WOF too short"; break; } why.push(`WOF ${m} months left`); }
      if (r.key === "available") { if (car.hold.status !== "available") { fail = "on hold"; break; } }
    }
    if (fail) { ex(fail); continue; }
    let slots = null;
    if (day) {
      const all = slotsFor(car, now);
      slots = /^\d{4}-\d{2}-\d{2}$/.test(args.test_drive_day || "") ? all.filter((s) => s.date === args.test_drive_day) : all.filter((s) => fold(s.day) === day);
      if (!slots.length) { ex(car.hold.status !== "available" ? "on hold" : "no test-drive slot that day"); continue; }
      why.push(`${slots.length} test-drive slot${slots.length === 1 ? "" : "s"} ${slots[0].day}`);
    }
    if (near) why.push(dist < 15 ? `At the ${site.region} site, near ${near.name}` : `${dist} km from ${near.name} (${site.region} site)`);
    if (car.hold.status !== "available") why.push("On hold for another buyer (Simulated)");
    const score = (args.budget_max ? (args.budget_max - car.priceNzd) / args.budget_max : 0) * 0.6 + (near ? -(dist / 120) : 0) + (car.year - 2015) * 0.15 - car.odometerKm / 120000 + car.safety.stars * 0.1 + (car.hold.status === "available" ? 0 : -3);
    rows.push({ car, dist, why, slots, score });
  }
  const sort = args.sort || "best match";
  rows.sort(sort === "price" ? (a, b) => a.car.priceNzd - b.car.priceNzd : sort === "newest" ? (a, b) => b.car.year - a.car.year : sort === "lowest km" ? (a, b) => a.car.odometerKm - b.car.odometerKm : (a, b) => b.score - a.score);
  const limit = Math.min(10, args.limit || 5);
  const interpreted = [args.budget_max != null && `up to ${money(args.budget_max)}`, args.body, args.fuel === "hybrid" ? "hybrid (incl. plug-in)" : args.fuel, near && `near ${near.name}`, ...rules.map((r) => r.label), day && !ruleDay && `test drive ${args.test_drive_day}`].filter(Boolean);
  return {
    truth: "Simulated", note: truthNote, dealer: DEALER.name, interpreted, notUnderstood, nearResolved: args.near ? (near ? near.name : `"${args.near}" not recognised; distance ignored`) : null,
    total: stock.cars.length, matched: rows.length, excluded,
    results: rows.slice(0, limit).map((r, i) => ({ rank: i + 1, id: r.car.id, title: r.car.title, priceNzd: r.car.priceNzd, odometerKm: r.car.odometerKm, fuel: r.car.fuel, body: r.car.body, seats: r.car.seats,
      site: DEALER.sites[r.car.site].name, distanceKm: r.dist, hold: r.car.hold.status, why: r.why, testDriveSlots: r.slots ? r.slots.slice(0, 4) : undefined, render: r.car.render })),
    next: "Call get_car for the full notice and slots, car_check before paying, running_cost for the weekly cost.",
  };
}

// ---------- get_car ------------------------------------------------------------------------------------------------
export function getCar(stock, args, now = new Date()) {
  const car = findCar(stock, args.car_id);
  if (!car) return { error: `No demo car with id "${args.car_id}". Ids look like hl-001 to hl-048; use search_cars.` };
  const { jsonld, ...record } = car;
  return { truth: "Simulated", note: truthNote, car: record, checks: quickChecks(car, now), testDriveSlots: slotsFor(car, now), jsonld: jsonld || toJsonLd(car),
    schema: `${SITE_URL}/cars/schema.json` };
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
const PHEV_KWH = 21; // kWh/100km in electric mode for a mid-size plug-in hybrid SUV (Estimate)
export function economyFor({ make, model, fuel, economy }) {
  if (economy) return { value: economy, unit: fuel === "electric" ? "kWh/100km" : "L/100km", truth: "Your data", basis: "Economy you supplied" };
  const name = `${make || ""} ${model || ""}`, hit = MODEL_ECONOMY.find(([re, f]) => re.test(name) && (!fuel || fuel === f || (fuel === "hybrid" && f === "hybrid")));
  const f = fuel || (hit && hit[1]) || "petrol", v = hit && (!fuel || hit[1] === fuel) ? hit[2] : DEFAULT_ECONOMY[f];
  return { value: v, unit: f === "electric" ? "kWh/100km" : "L/100km", truth: "Estimate", fuel: f,
    basis: hit && (!fuel || hit[1] === fuel) ? `Typical combined figure for a ${name.trim()} of this era; this car's own figure is on RightCar` : `Typical for a ${fuelLabel(f).toLowerCase()} car; pass the car's own figure for a better answer` };
}
function tariffFor(qsdep, place) {
  const loc = place?.qsdep, row = (loc && qsdep.locations.find((l) => l.location === loc)) || null;
  return { cents: row ? row.totalCents : qsdep.national.totalCents, location: row ? (place.name || row.location) : "New Zealand average", surveyDate: qsdep.surveyDate, url: qsdep.url || SNAPSHOT.qsdep.url, retrieved: qsdep.retrieved };
}
const r2 = (x) => Math.round(x * 100) / 100;
export function runningCost(args = {}, ctx = {}, stock = null, now = new Date()) {
  const car = args.car_id && stock ? findCar(stock, args.car_id) : null;
  if (args.car_id && stock && !car) return { error: `No demo car with id "${args.car_id}".` };
  const fuel = car ? car.fuel : args.fuel || economyFor(args).fuel || "petrol";
  const eco = car ? { ...car.economy } : economyFor({ ...args, fuel });
  const kmw = args.km_per_week != null ? args.km_per_week : 200, place = resolvePlace(args.place) || (car ? resolvePlace(car.site) : resolvePlace("auckland"));
  const fuelEnv = ctx.fuel && !ctx.fuel.error ? ctx.fuel : SNAPSHOT.fuel, qsdep = ctx.qsdep || SNAPSHOT.qsdep, fv = fuelEnv.values;
  const fuelTruth = { truth: fuelEnv.truth || "Latest published", period: fuelEnv.period, status: fuelEnv.status || "snapshot", statusLabel: fuelEnv.statusLabel || "", source: fuelEnv.source };
  const lines = [], year = car ? car.year : args.year, age = year ? nzYear(now) - year : null;
  const add = (l) => lines.push({ ...l, weekly: r2(l.weekly), annual: Math.round(l.weekly * 52) });
  const petrolLine = (litresPerWeek, label) => {
    const own = args.fuel_c_per_litre, cpl = own || fv.petrol91.retail;
    add({ key: "energy", label, weekly: (litresPerWeek * cpl) / 100, truth: own ? "Your data" : fuelTruth.truth, period: own ? null : fuelTruth.period, status: own ? null : fuelTruth.status, statusLabel: own ? null : fuelTruth.statusLabel,
      source: own ? null : fuelTruth.source, basis: `${r2(litresPerWeek)} L × ${cpl} c/L (${own ? "your price" : "91, MBIE adjusted retail, national average"})`,
      note: own ? null : `Includes ${fv.petrol91.taxes} c/L of taxes (excise, ETS levy and GST): petrol's road charge is inside the pump price.` });
  };
  const elecLine = (kwhPerWeek, label) => {
    const own = args.electricity_c_per_kwh, t = tariffFor(qsdep, place), c = own || t.cents;
    add({ key: "energy", label, weekly: (kwhPerWeek * c) / 100, truth: own ? "Your data" : "Latest published", period: own ? null : `survey of ${fmtDate(t.surveyDate)}`, status: own ? null : "snapshot",
      statusLabel: own ? null : `snapshot · copied ${t.retrieved || SNAPSHOT.qsdep.retrieved}`, source: own ? null : { name: `MBIE Quarterly Survey of Domestic Electricity Prices, ${t.location}`, url: t.url },
      basis: `${r2(kwhPerWeek)} kWh (incl. ${ESTIMATES.chargingLoss * 100}% charging losses, Estimate) × ${c} c/kWh (${own ? "your rate" : "average household price, " + t.location}, incl. GST)`,
      note: own ? null : "An area average for an 8,000 kWh/yr household. Off-peak EV plans are often far cheaper: pass your own rate." });
  };
  let rucRate = 0;
  if (fuel === "electric") { elecLine((kmw * eco.value / 100) * (1 + ESTIMATES.chargingLoss), "Home charging"); rucRate = RUC.perThousandKm.electric; }
  else if (fuel === "plug-in hybrid") {
    const share = args.electric_share != null ? args.electric_share : ESTIMATES.phevElectricShare;
    elecLine((kmw * share * PHEV_KWH / 100) * (1 + ESTIMATES.chargingLoss), `Charging (${Math.round(share * 100)}% of km${args.electric_share != null ? "" : ", Estimate"})`);
    petrolLine(kmw * (1 - share) * eco.value / 100, `Petrol (${Math.round((1 - share) * 100)}% of km)`); rucRate = RUC.perThousandKm["plug-in hybrid"];
  } else if (fuel === "diesel") {
    const own = args.fuel_c_per_litre, cpl = own || fv.diesel.retail, l = kmw * eco.value / 100;
    add({ key: "energy", label: "Diesel", weekly: (l * cpl) / 100, truth: own ? "Your data" : fuelTruth.truth, period: own ? null : fuelTruth.period, status: own ? null : fuelTruth.status, statusLabel: own ? null : fuelTruth.statusLabel,
      source: own ? null : fuelTruth.source, basis: `${r2(l)} L × ${cpl} c/L (${own ? "your price" : "MBIE adjusted retail, national average"})`, note: "Diesel carries almost no excise; the road charge is RUC instead." });
    rucRate = RUC.perThousandKm.diesel;
  } else petrolLine(kmw * eco.value / 100, fuel === "hybrid" ? "Petrol (hybrid)" : "Petrol");
  add({ key: "ruc", label: "Road user charges", weekly: (kmw / 1000) * rucRate, truth: rucRate ? RUC.truth : "Source", period: rucRate ? RUC.label : null,
    source: RUC.source, basis: rucRate ? `${kmw} km × $${rucRate} per 1,000 km (${fuelLabel(fuel).toLowerCase()})` : "Petrol and ordinary hybrids don't buy RUC: the road charge is in the pump price", note: rucRate ? RUC.caveat : null });
  add({ key: "wof_licence", label: "WOF and licence", weekly: (ESTIMATES.licence.annual + ESTIMATES.wof.annual) / 52, truth: "Estimate", basis: `${ESTIMATES.licence.basis} ${ESTIMATES.wof.basis}`, source: LINKS.wof });
  const mBase = ESTIMATES.maintenance[fuel] || ESTIMATES.maintenance.petrol, mAnnual = mBase * (age != null && age > 8 ? ESTIMATES.maintenance.olderFactor : 1);
  add({ key: "maintenance", label: "Servicing, tyres, brakes", weekly: mAnnual / 52, truth: "Estimate", basis: `${money(mAnnual)} a year. ${ESTIMATES.maintenance.basis}` });
  const totalWeekly = r2(lines.reduce((s, l) => s + l.weekly, 0));
  return {
    car: car ? { id: car.id, title: car.title, truth: "Simulated" } : { make: args.make, model: args.model, year: args.year, truth: "Your data" },
    fuel, economy: eco, kmPerWeek: kmw, place: place ? place.name : "New Zealand average",
    lines, totalWeekly, totalAnnual: Math.round(totalWeekly * 52),
    notIncluded: ["insurance", "finance", "depreciation", "parking and tolls"],
    feeds: { fuel: { period: fuelEnv.period, status: fuelEnv.status || "snapshot", statusLabel: fuelEnv.statusLabel || "" } },
  };
}

// ---------- car_check ------------------------------------------------------------------------------------------------
function factsFromCar(car) {
  const v = (k) => car.cin[k].value;
  return { make: car.make, model: `${car.model} ${car.variant}`.trim(), year: car.year, odometer_km: car.odometerKm, price_nzd: car.priceNzd, fuel: car.fuel, body: car.body, seller: "dealer",
    wof_expiry: v("wof.expiry"), licence_expiry: v("licence.expiry"), money_owing: v("securityInterest.registered"), price_includes_on_road_costs: v("price.includes") ? "yes" : "unknown",
    imported: car.imported ? "yes" : "no", year_first_registered_overseas: v("import.yearFirstRegisteredOverseas"), country_last_registered: v("import.countryLastRegistered"), imported_as_damaged: v("import.damaged"),
    odometer_may_be_inaccurate: v("odometer.mayBeInaccurate"), trader_registration_number: v("supplier.traderRegistrationNumber"), supplier_name: v("supplier.name"), supplier_address: v("supplier.address"),
    engine_cc: v("vehicle.engineCapacity"), vin_or_chassis: v("vehicle.vin"), ruc_applies: v("ruc.applies"), ruc_outstanding: v("ruc.outstanding"), region: car.site };
}
const known = (x) => x !== undefined && x !== null && x !== "" && x !== "unknown";
export function carCheck(stock, args = {}, ctx = {}, now = new Date()) {
  const car = args.car_id ? findCar(stock, args.car_id) : null;
  if (args.car_id && !car) return { error: `No demo car with id "${args.car_id}". To check another listing, pass its facts instead of car_id.` };
  const f = car ? { ...factsFromCar(car), km_per_week: args.km_per_week } : args, dataTruth = car ? "Simulated" : "Your data";
  if (!car && !known(f.make) && !known(f.model)) return { error: "Pass a demo car_id, or at least the make and model of the listing (plus whatever else is known)." };
  const today = nzParts(now).ymd, thisYear = nzYear(now), seller = f.seller || "unknown";
  const name = car ? car.title : [f.year, f.make, f.model].filter(known).join(" ");
  // what's missing versus the notice
  const isImport = f.imported === "yes" || known(f.year_first_registered_overseas) || known(f.country_last_registered);
  const argOf = { "vehicle.makeModel": known(f.make) && known(f.model) ? "x" : undefined, "fuel.type": known(f.fuel) ? "x" : undefined };
  const missing = [];
  for (const fld of CIN_FIELDS) {
    if (fld.importOnly && f.imported === "no") continue;
    const has = fld.key in argOf ? argOf[fld.key] : fld.arg ? (fld.key === "price.includes" ? known(f.price_includes_on_road_costs) : known(f[fld.arg])) : car ? true : false;
    if (!has) missing.push({ key: fld.key, label: fld.label + (fld.importOnly && f.imported !== "yes" ? " (if it's a used import)" : ""), section: fld.section });
  }
  if (!car && f.imported !== "yes" && f.imported !== "no") missing.unshift({ key: "import.isImported", label: "Whether it's a used import or NZ-new", section: "Used imports" });
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
  if (seller === "dealer" && !known(f.trader_registration_number)) flag("ask", "Trader registration number not shown", "Every dealer notice shows one. Look the trader up on the Motor Vehicle Traders Register.");
  if (!known(f.price_nzd)) flag("ask", "No price", "Ask for the cash price including GST, registration and licensing.");
  else if (seller !== "private" && f.price_includes_on_road_costs !== "yes") flag("ask", "On-road costs unclear", "A dealer's cash price on the notice includes GST, registration and licensing. Confirm the drive-away figure.");
  // checks before paying (official sites only)
  const checks = [
    { id: "ppsr", title: "Money owing (PPSR search)", how: "Search the plate or VIN on the Personal Property Securities Register on the day you pay.", link: LINKS.ppsr, status: "not run", truth: "Source" },
    { id: "wof", title: "WOF and licence status", how: "NZTA's free check shows the WOF and licence expiry for a plate.", link: LINKS.wof, status: "not run", truth: "Source" },
    { id: "report", title: "Vehicle information report", how: "Past odometer readings, import and stolen status come from NZTA's Motor Vehicle Register. NZTA doesn't sell the report itself; private providers do (we don't link to any).", link: null, status: "not run", truth: "Source" },
    { id: "inspection", title: "Pre-purchase inspection", how: "An independent mechanic or inspection service, before you agree a price. Never the seller's own workshop.", link: null, status: "not run", truth: "Source" },
    { id: "safety", title: "Safety rating and fuel economy", how: "RightCar shows the real star rating and fuel economy for the plate.", link: LINKS.rightcar, status: "not run", truth: "Source" },
  ];
  if (seller !== "private") checks.push({ id: "trader", title: "Trader is registered", how: "Search the trader's name or number on the Motor Vehicle Traders Register; ask for a copy of the notice when you buy.", link: LINKS.traderRegister, status: "not run", truth: "Source" });
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
  const rc = runningCost(car ? { car_id: car.id, km_per_week: f.km_per_week, place: args.region || car.site } : { make: f.make, model: f.model, year: f.year, fuel: known(fl) ? fl : undefined, km_per_week: f.km_per_week, place: f.region }, ctx, stock, now);
  if (known(f.price_nzd) && rc.totalWeekly) fairPrice.questions.push(`Put the running cost next to the price: about ${money(rc.totalWeekly)} a week is ${money(rc.totalWeekly * 156)} over three years, on top of ${money(f.price_nzd)}.`);
  const stops = flags.filter((x) => x.level === "stop").length, asks = flags.filter((x) => x.level === "ask").length;
  return {
    lookedUp: false,
    statement: car ? "I didn't look this car up anywhere. It's a Simulated demo car; everything below comes from its notice and labelled estimates." : "I didn't look this car up anywhere. Everything below comes from the facts passed in (Your data), official guidance and labelled estimates.",
    car: { name, id: car ? car.id : null, truth: dataTruth, seller, source: car ? "demo stock" : f.source || "facts passed in", render: car ? car.render : { kind: f.body && f.body !== "unknown" ? f.body : "hatch" } },
    facts: Object.fromEntries(Object.entries(f).filter(([k, v]) => known(v) && k !== "km_per_week").map(([k, v]) => [k, { value: v, truth: dataTruth }])),
    notice: { required: seller !== "private", present: CIN_FIELDS.length - missing.filter((m) => m.key !== "import.isImported").length, total: CIN_FIELDS.length, missing,
      note: seller === "private" ? "A private seller doesn't have to give a notice, but these are still the facts to ask for." : "A dealer must show every one of these on the Consumer Information Notice, online listings included." },
    redFlags: flags, checks, fairPrice, runningCost: rc,
    summary: stops ? `${stops} thing${stops > 1 ? "s" : ""} to resolve before paying, ${asks} question${asks === 1 ? "" : "s"} to ask.` : asks ? `Nothing stops the sale on these facts; ${asks} question${asks === 1 ? "" : "s"} to ask and ${checks.length} checks to run before paying.` : `No red flags in these facts. Run the ${checks.length} checks before paying.`,
    sources: [LINKS.cin, LINKS.traderDuties],
  };
}

// ---------- book_test_drive and hold_car (Simulated requests, approval required) -------------------------------------
const reqId = (p) => p + "-" + Math.random().toString(36).slice(2, 6).toUpperCase() + Date.now().toString(36).slice(-3).toUpperCase();
export function bookTestDrive(stock, args, now = new Date()) {
  const car = findCar(stock, args.car_id);
  if (!car) return { error: `No demo car with id "${args.car_id}".` };
  const slots = slotsFor(car, now), slot = slots.find((s) => s.start.slice(0, 16) === String(args.slot).slice(0, 16));
  if (!slot) return { error: car.hold.status !== "available" ? `${car.title} is on hold for another buyer (Simulated); no test drives.` : `That slot isn't free. Free slots: ${slots.slice(0, 6).map((s) => s.start).join(", ")}${slots.length > 6 ? " …" : ""}` };
  const site = DEALER.sites[car.site];
  return { simulated: true, requestId: reqId("TD"), status: "requested: waiting for a person at the dealer to confirm", authority: "act with approval",
    car: { id: car.id, title: car.title }, slot, site: site.name, address: site.address,
    sideEffects: "None. This is a demo: nothing was sent to anyone, nothing was stored, and the request id is not saved.",
    nextStep: `A person at ${site.name} would confirm or offer another time. Until then it isn't booked.`, note: truthNote };
}
export function holdCar(stock, args, now = new Date()) {
  const car = findCar(stock, args.car_id);
  if (!car) return { error: `No demo car with id "${args.car_id}".` };
  if (car.hold.status !== "available") return { error: `${car.title} is already on hold for another buyer (Simulated).` };
  const today = nzParts(now).ymd, until = args.hold_until ? (args.hold_until.length === 7 ? args.hold_until + "-01" : args.hold_until) : addDays(today, 2);
  const days = (new Date(until + "T12:00:00Z") - new Date(today + "T12:00:00Z")) / 864e5;
  if (days < 0 || days > 3) return { error: `A hold can run from today to ${addDays(today, 3)} (3 days at most).` };
  const site = DEALER.sites[car.site];
  return { simulated: true, requestId: reqId("HOLD"), status: "requested: a person at the dealer must approve the hold", authority: "act with approval",
    car: { id: car.id, title: car.title, priceNzd: car.priceNzd }, holdUntil: until, site: site.name,
    sideEffects: "None. Nothing is held, sent or stored: this demo dealer is fictional and the request id is not saved.",
    nextStep: `Until ${site.name} approves, the car isn't held and anyone could buy it.`, note: truthNote };
}

// ---------- one entry point for MCP and the page ------------------------------------------------------------------
const fmtLine = (l) => `${l.label}: ${money(l.weekly, 2)}/wk (${l.truth}${l.period ? " · " + l.period : ""})`;
function summarize(name, r) {
  if (r.error) return r.error;
  if (name === "search_cars") return `${r.matched} of ${r.total} demo cars match (${r.interpreted.join(", ") || "no filters"}). Simulated stock from ${r.dealer}.\n` +
    r.results.map((c) => `${c.rank}. ${c.id} · ${c.title} · ${money(c.priceNzd)} · ${c.odometerKm.toLocaleString("en-NZ")} km · ${c.site}${c.hold !== "available" ? " · ON HOLD" : ""}\n   why: ${c.why.join("; ")}`).join("\n") +
    (Object.keys(r.excluded).length ? `\nExcluded: ${Object.entries(r.excluded).map(([k, v]) => `${v} ${k}`).join(", ")}.` : "") + (r.notUnderstood.length ? `\nNot understood: ${r.notUnderstood.join(", ")}.` : "");
  if (name === "get_car") { const c = r.car, k = r.checks; return `${c.title} (${c.id}) · ${money(c.priceNzd)} · ${c.odometerKm.toLocaleString("en-NZ")} km · ${DEALER.sites[c.site].name}. Simulated listing.\nNotice: ${k.cinFields.present}/${k.cinFields.total} fields. WOF to ${fmtDate(k.wof.expiry)} (${k.wof.monthsLeft} months). Licence to ${fmtDate(k.licence.expiry)}. Money owing: ${k.moneyOwing.note}\nEconomy ${c.economy.value} ${c.economy.unit} (Estimate). Safety ${c.safety.stars} stars (RightCar-style, Simulated).\nFree test-drive slots: ${r.testDriveSlots.slice(0, 8).map((s) => s.start).join(", ") || "none"}`; }
  if (name === "running_cost") return `${r.car.title || [r.car.year, r.car.make, r.car.model].filter(Boolean).join(" ") || fuelLabel(r.fuel)} at ${r.kmPerWeek} km a week in ${r.place}: about ${money(r.totalWeekly, 2)} a week, ${money(r.totalAnnual)} a year.\n` + r.lines.map(fmtLine).join("\n") + `\nNot included: ${r.notIncluded.join(", ")}.`;
  if (name === "car_check") return `${r.statement}\n${r.car.name}: ${r.summary}\nNotice fields present: ${r.notice.present}/${r.notice.total}${r.notice.missing.length ? ` · missing: ${r.notice.missing.map((m) => m.label).join("; ")}` : ""}.\n` +
    (r.redFlags.length ? "Red flags and questions:\n" + r.redFlags.map((x) => `- [${x.level}] ${x.title}: ${x.why}`).join("\n") + "\n" : "") +
    "Checks before paying:\n" + r.checks.map((c) => `- ${c.title}: ${c.how}${c.link ? " " + c.link.url : ""}`).join("\n") + `\nFair price: ${r.fairPrice.note}\n` + r.fairPrice.questions.map((q) => "- " + q).join("\n") +
    `\nRunning cost: about ${money(r.runningCost.totalWeekly, 2)} a week at ${r.runningCost.kmPerWeek} km.`;
  if (name === "book_test_drive") return `Requested ${r.requestId}: test drive of ${r.car.title} at ${r.slot.label}. ${r.nextStep} ${r.sideEffects}`;
  if (name === "hold_car") return `Requested ${r.requestId}: hold ${r.car.title} until ${fmtDate(r.holdUntil)}. ${r.nextStep} ${r.sideEffects}`;
  return JSON.stringify(r);
}
// callTool(name, args, { stock, ctx, now }) → { structuredContent, text, isError } or throws { code, message } for unknown tools
export function callTool(name, args = {}, env = {}) {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) { const e = new Error(`Unknown tool: ${name}`); e.code = -32602; throw e; }
  const errs = validate(tool.inputSchema, args || {});
  if (errs.length) return { isError: true, text: `Invalid arguments for ${name}: ${errs.join("; ")}.`, structuredContent: { error: "invalid arguments", details: errs } };
  const { stock, ctx = {}, now = new Date() } = env;
  const r = name === "search_cars" ? searchCars(stock, args, now) : name === "get_car" ? getCar(stock, args, now) : name === "car_check" ? carCheck(stock, args, ctx, now)
    : name === "running_cost" ? runningCost(args, ctx, stock, now) : name === "book_test_drive" ? bookTestDrive(stock, args, now) : holdCar(stock, args, now);
  return { isError: !!r.error, text: summarize(name, r), structuredContent: r };
}
