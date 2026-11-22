// assembl lab · New Zealand Transverse Mercator 2000 (EPSG:2193) and LINZ's map-sheet tile names. Plain arithmetic.
//
// Projection: the transverse Mercator series LINZ publishes for NZTM2000 (GRS80 ellipsoid, central meridian 173° E, scale
// 0.9996, false easting 1 600 000 m, false northing 10 000 000 m). Latitude and longitude are taken as NZGD2000. A GPS or
// web-map point is WGS84, which sits within about a metre of NZGD2000 today; that difference is not corrected here.
//
// Tile names: LINZ's own rule, read from its code (github.com/linz/argo-tasks, src/utils/mapsheet.ts, MIT): Topo50 sheets
// are 24 km wide and 36 km high from a top-left corner at 988 000 E, 6 234 000 N; rows are lettered from AS and three codes
// (BI, BO, CI) are not used; a sheet is cut into smaller tiles named <sheet>_<scale>_<row><column>, counted from the top left.

const A = 6378137, F = 1 / 298.257222101, K0 = 0.9996, LON0 = (173 * Math.PI) / 180, FE = 1600000, FN = 10000000;
const E2 = 2 * F - F * F, EP2 = E2 / (1 - E2);
const meridian = (lat) => {
  const e4 = E2 * E2, e6 = e4 * E2;
  return A * ((1 - E2 / 4 - (3 * e4) / 64 - (5 * e6) / 256) * lat - ((3 * E2) / 8 + (3 * e4) / 32 + (45 * e6) / 1024) * Math.sin(2 * lat) + ((15 * e4) / 256 + (45 * e6) / 1024) * Math.sin(4 * lat) - ((35 * e6) / 3072) * Math.sin(6 * lat));
};

/** latitude, longitude (degrees) → { e, n } in metres */
export function toNZTM(latDeg, lonDeg) {
  const lat = (latDeg * Math.PI) / 180, w = (lonDeg * Math.PI) / 180 - LON0, s = Math.sin(lat), c = Math.cos(lat), t = Math.tan(lat);
  const nu = A / Math.sqrt(1 - E2 * s * s), T = t * t, C = EP2 * c * c, a = w * c, a2 = a * a;
  const e = FE + K0 * nu * (a + ((1 - T + C) * a2 * a) / 6 + ((5 - 18 * T + T * T + 72 * C - 58 * EP2) * a2 * a2 * a) / 120);
  const n = FN + K0 * (meridian(lat) + nu * t * (a2 / 2 + ((5 - T + 9 * C + 4 * C * C) * a2 * a2) / 24 + ((61 - 58 * T + T * T + 600 * C - 330 * EP2) * a2 * a2 * a2) / 720));
  return { e, n };
}

/** { e, n } in metres → latitude, longitude (degrees) */
export function fromNZTM(e, n) {
  const m = (n - FN) / K0, mu = m / (A * (1 - E2 / 4 - (3 * E2 * E2) / 64 - (5 * E2 * E2 * E2) / 256)), e1 = (1 - Math.sqrt(1 - E2)) / (1 + Math.sqrt(1 - E2));
  const p1 = mu + ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) + ((21 * e1 * e1) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) + ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) + ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);
  const s = Math.sin(p1), c = Math.cos(p1), t = Math.tan(p1), C = EP2 * c * c, T = t * t, nu = A / Math.sqrt(1 - E2 * s * s), rho = (A * (1 - E2)) / (1 - E2 * s * s) ** 1.5, d = (e - FE) / (nu * K0);
  const lat = p1 - ((nu * t) / rho) * ((d * d) / 2 - ((5 + 3 * T + 10 * C - 4 * C * C - 9 * EP2) * d ** 4) / 24 + ((61 + 90 * T + 298 * C + 45 * T * T - 252 * EP2 - 3 * C * C) * d ** 6) / 720);
  const lon = LON0 + (d - ((1 + 2 * T + C) * d ** 3) / 6 + ((5 - 2 * C + 28 * T - 3 * C * C + 8 * EP2 + 24 * T * T) * d ** 5) / 120) / c;
  return { lat: (lat * 180) / Math.PI, lon: (lon * 180) / Math.PI };
}

/** grid convergence at a point, in degrees: how far grid north (up the map) is turned from true north, positive clockwise */
export function gridConvergence(latDeg, lonDeg) {
  const lat = (latDeg * Math.PI) / 180, w = (lonDeg * Math.PI) / 180 - LON0;
  return (Math.atan(Math.tan(w) * Math.sin(lat)) * 180) / Math.PI;
}

const SHEET = { width: 24000, height: 36000, originE: 988000, originN: 6234000 };
/** the Topo50 sheet over a point, with its top-left corner. The code may name a sheet LINZ never published: ask for it and see. */
export function sheetAt(e, n) {
  const col = Math.floor((e - SHEET.originE) / SHEET.width), row = Math.floor((SHEET.originN - n) / SHEET.height);
  if (col < 0 || col > 99 || row < 0 || row > 60) return null;
  let k = row; if (k >= 16) k++; if (k >= 22) k++; if (k >= 42) k++; // BI, BO and CI do not exist
  k += 18; // rows start at "AS"
  return { code: String.fromCharCode(65 + Math.floor(k / 26), 65 + (k % 26)) + String(col).padStart(2, "0"), left: SHEET.originE + col * SHEET.width, top: SHEET.originN - row * SHEET.height, width: SHEET.width, height: SHEET.height };
}
/** the tile of a given scale (10000, 5000, 2000, 1000) over a point: name, top-left corner and size in metres */
export function tileAt(e, n, scale) {
  const s = sheetAt(e, n); if (!s) return null;
  if (scale === 50000) return { name: s.code, sheet: s.code, left: s.left, top: s.top, width: s.width, height: s.height };
  const w = (s.width * scale) / 50000, h = (s.height * scale) / 50000, col = Math.floor((e - s.left) / w), row = Math.floor((s.top - n) / h);
  return { name: `${s.code}_${scale}_${String(row + 1).padStart(2, "0")}${String(col + 1).padStart(2, "0")}`, sheet: s.code, left: s.left + col * w, top: s.top - row * h, width: w, height: h };
}
