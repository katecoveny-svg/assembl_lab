// Places the lab knows about. Districts are Health NZ's 20 districts; each has a main ED hospital
// (for weather), a grid node (for wholesale power) and a Nager.Date region code (for anniversary days).
export const PLACES = {
  auckland: { name: "Tāmaki Makaurau Auckland", lat: -36.85, lon: 174.76, node: "OTA2201", region: "NZ-AUK" },
  hamilton: { name: "Kirikiriroa Hamilton", lat: -37.79, lon: 175.28, node: "HAM2201", region: "NZ-WKO" },
  wellington: { name: "Te Whanganui-a-Tara Wellington", lat: -41.29, lon: 174.78, node: "HAY2201", region: "NZ-WGN" },
  christchurch: { name: "Ōtautahi Christchurch", lat: -43.53, lon: 172.64, node: "ISL2201", region: "NZ-CAN" },
};

// key → [Health NZ district name as published, main ED hospital, lat, lon, holiday region, grid node]
const D = {
  northland: ["Northland", "Whangārei Hospital", -35.73, 174.32, "NZ-NTL", "OTA2201"],
  waitemata: ["Waitematā", "North Shore Hospital", -36.78, 174.76, "NZ-AUK", "OTA2201"],
  "auckland-district": ["Auckland", "Auckland City Hospital", -36.86, 174.77, "NZ-AUK", "OTA2201"],
  "counties-manukau": ["Counties Manukau", "Middlemore Hospital", -36.96, 174.84, "NZ-AUK", "OTA2201"],
  waikato: ["Waikato", "Waikato Hospital", -37.80, 175.28, "NZ-WKO", "HAM2201"],
  lakes: ["Lakes", "Rotorua Hospital", -38.13, 176.25, "NZ-BOP", "HAM2201"],
  "bay-of-plenty": ["Bay of Plenty", "Tauranga Hospital", -37.71, 176.15, "NZ-BOP", "HAM2201"],
  tairawhiti: ["Tairāwhiti", "Gisborne Hospital", -38.66, 178.00, "NZ-GIS", "HAM2201"],
  taranaki: ["Taranaki", "Taranaki Base Hospital", -39.07, 174.08, "NZ-TKI", "HAY2201"],
  "hawkes-bay": ["Hawke's Bay", "Hawke's Bay Hospital", -39.63, 176.83, "NZ-HKB", "HAY2201"],
  whanganui: ["Whanganui", "Whanganui Hospital", -39.94, 175.04, "NZ-MWT", "HAY2201"],
  midcentral: ["MidCentral", "Palmerston North Hospital", -40.34, 175.62, "NZ-MWT", "HAY2201"],
  wairarapa: ["Wairarapa", "Wairarapa Hospital", -40.95, 175.66, "NZ-WGN", "HAY2201"],
  "capital-and-coast": ["Capital and Coast", "Wellington Regional Hospital", -41.31, 174.78, "NZ-WGN", "HAY2201"],
  "hutt-valley": ["Hutt Valley", "Hutt Hospital", -41.20, 174.92, "NZ-WGN", "HAY2201"],
  "nelson-marlborough": ["Nelson Marlborough", "Nelson Hospital", -41.29, 173.27, "NZ-NSN", "ISL2201"],
  "west-coast": ["West Coast", "Te Nīkau Grey Hospital", -42.45, 171.21, "NZ-WTC", "ISL2201"],
  canterbury: ["Canterbury", "Christchurch Hospital", -43.53, 172.63, "NZ-CAN", "ISL2201"],
  "south-canterbury": ["South Canterbury", "Timaru Hospital", -44.39, 171.24, "NZ-CAN", "ISL2201"],
  southern: ["Southern", "Dunedin Hospital", -45.87, 170.51, "NZ-OTA", "ISL2201"],
};
export const DISTRICTS = Object.fromEntries(Object.entries(D).map(([k, [name, hospital, lat, lon, region, node]]) =>
  [k, { key: k, name, hospital, lat, lon, region, node }]));
for (const d of Object.values(DISTRICTS)) PLACES[d.key] = { name: `${d.hospital}, ${d.name}`, lat: d.lat, lon: d.lon, node: d.node, region: d.region, district: d.key };

// Normalise a published district or region label ("WAITEMATĀ", "Waitemata", "Hawke's Bay", "Midland | Te Manawa Taki") to a key.
export function districtKey(label) {
  const s = label.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[’']/g, "").replace(/\|.*$/, "").replace(/&/g, "and").replace(/[^a-z]+/g, " ").trim();
  const map = { auckland: "auckland-district", "counties manukau": "counties-manukau", "bay of plenty": "bay-of-plenty", "hawkes bay": "hawkes-bay",
    "capital and coast": "capital-and-coast", "hutt valley": "hutt-valley", "nelson marlborough": "nelson-marlborough", "west coast": "west-coast",
    "south canterbury": "south-canterbury", "te manawa taki": "midland", "central te ikaroa": "central", "te waipounamu": "south-island" };
  if (map[s]) return map[s];
  if (DISTRICTS[s]) return s;
  return s.replace(/ /g, "-");
}
export const REGIONS = { northern: "Northern | Te Tai Tokerau", midland: "Midland | Te Manawa Taki", central: "Central | Te Ikaroa", "south-island": "South Island | Te Waipounamu" };
export const placeOf = (key) => PLACES[(key || "auckland").toLowerCase()] || PLACES.auckland;
