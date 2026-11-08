/**
 * NZGD2000 / New Zealand Transverse Mercator 2000 (EPSG:2193) <-> WGS84 lat/lon.
 *
 * LINZ publishes the national LiDAR DEMs in NZTM2000, so every click on the map has to be
 * projected before we can find the right tile and pixel window. This is the Krüger series
 * (Karney 2011) to fourth order in n, which is accurate to well under a millimetre across
 * New Zealand — far finer than the 1 m DEM cell. NZGD2000 and WGS84 differ by less than a
 * metre here, which is also below a DEM cell, so no datum shift is applied.
 */

const A_GRS80 = 6378137;
const F_GRS80 = 1 / 298.257222101;
const K0 = 0.9996;
const LON0 = (173 * Math.PI) / 180;
const FALSE_EASTING = 1_600_000;
const FALSE_NORTHING = 10_000_000;

const n = F_GRS80 / (2 - F_GRS80);
const n2 = n * n;
const n3 = n2 * n;
const n4 = n3 * n;
const RECTIFYING_RADIUS = (A_GRS80 / (1 + n)) * (1 + n2 / 4 + n4 / 64);

const ALPHA = [
  n / 2 - (2 * n2) / 3 + (5 * n3) / 16 + (41 * n4) / 180,
  (13 * n2) / 48 - (3 * n3) / 5 + (557 * n4) / 1440,
  (61 * n3) / 240 - (103 * n4) / 140,
  (49561 * n4) / 161280,
];
const BETA = [
  n / 2 - (2 * n2) / 3 + (37 * n3) / 96 - n4 / 360,
  n2 / 48 + n3 / 15 - (437 * n4) / 1440,
  (17 * n3) / 480 - (37 * n4) / 840,
  (4397 * n4) / 161280,
];
const DELTA = [
  2 * n - (2 * n2) / 3 - 2 * n3 + (116 * n4) / 45,
  (7 * n2) / 3 - (8 * n3) / 5 - (227 * n4) / 45,
  (56 * n3) / 15 - (136 * n4) / 35,
  (4279 * n4) / 630,
];

export type Nztm = { x: number; y: number };
export type LatLon = { lat: number; lon: number };

/** WGS84/NZGD2000 degrees -> NZTM2000 metres (x = easting, y = northing). */
export function toNztm(lat: number, lon: number): Nztm {
  const phi = (lat * Math.PI) / 180;
  const dLambda = (lon * Math.PI) / 180 - LON0;
  const e2sqrt = (2 * Math.sqrt(n)) / (1 + n); // first eccentricity e
  const sinPhi = Math.sin(phi);
  const t = Math.sinh(Math.atanh(sinPhi) - e2sqrt * Math.atanh(e2sqrt * sinPhi));
  const xiP = Math.atan2(t, Math.cos(dLambda));
  const etaP = Math.atanh(Math.sin(dLambda) / Math.sqrt(1 + t * t));
  let xi = xiP;
  let eta = etaP;
  for (let j = 1; j <= 4; j++) {
    const a = ALPHA[j - 1];
    xi += a * Math.sin(2 * j * xiP) * Math.cosh(2 * j * etaP);
    eta += a * Math.cos(2 * j * xiP) * Math.sinh(2 * j * etaP);
  }
  return {
    x: FALSE_EASTING + K0 * RECTIFYING_RADIUS * eta,
    y: FALSE_NORTHING + K0 * RECTIFYING_RADIUS * xi,
  };
}

/** NZTM2000 metres -> WGS84/NZGD2000 degrees. */
export function fromNztm(x: number, y: number): LatLon {
  const xi = (y - FALSE_NORTHING) / (K0 * RECTIFYING_RADIUS);
  const eta = (x - FALSE_EASTING) / (K0 * RECTIFYING_RADIUS);
  let xiP = xi;
  let etaP = eta;
  for (let j = 1; j <= 4; j++) {
    const b = BETA[j - 1];
    xiP -= b * Math.sin(2 * j * xi) * Math.cosh(2 * j * eta);
    etaP -= b * Math.cos(2 * j * xi) * Math.sinh(2 * j * eta);
  }
  const chi = Math.asin(Math.sin(xiP) / Math.cosh(etaP));
  let phi = chi;
  for (let j = 1; j <= 4; j++) phi += DELTA[j - 1] * Math.sin(2 * j * chi);
  const lambda = LON0 + Math.atan2(Math.sinh(etaP), Math.cos(xiP));
  return { lat: (phi * 180) / Math.PI, lon: (lambda * 180) / Math.PI };
}

/** Rough mainland + offshore-islands envelope, used to reject obviously non-NZ input early. */
export function isInNewZealand(lat: number, lon: number): boolean {
  return lat <= -29 && lat >= -53 && lon >= 165 && lon <= 179.99;
}
