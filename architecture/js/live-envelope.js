// assembl. Architecture OS — Live Site, HIRB Envelope & IoT Digital Twin (#/envelope & Project Tab)
//
// Connects directly to NZ public open-data feeds + browser-direct LINZ 1 m LiDAR:
//   - /api/live/?feeds=address&q=...                LINZ NZ Addresses (CC BY 4.0)
//   - /api/live/?feeds=site&lat=...&lon=...         LINZ Primary Parcels + Auckland Unitary Plan zone/overlays/hazards + weather
//   - /api/live/?feeds=footprint&lat=...&lon=...    LINZ NZ Building Outlines (layer 101290, CC BY 4.0)
//   - /api/live/?feeds=weather,air,power,genmix     Open-Meteo + Electricity Authority EMI wholesale power & generation mix
//   - ../../roof-solar/linz/ground.js               Browser-direct 1 m LINZ LiDAR DEM (NZTM2000 / NZVD2016)
//   - Outdoor LIVE feeds clearly separated from SIMULATED Studio IoT, with custom HTTP JSON / WebSocket live IoT connector.
//
// No bare 'three' imports: loads vendor Three.js r170 via relative URL from assets/vendor/three/three.module.min.js.

import { registerNav, registerRoute, registerProjectTab } from './modules.js';
import { toNZTM } from '../../roof-solar/linz/nztm.js';

const THREE_URL = new URL('../../assets/vendor/three/three.module.min.js', import.meta.url).href;
const GROUND_URL = new URL('../../roof-solar/linz/ground.js', import.meta.url).href;
const FEED_BASE = '/api/live/';

let threeMod = null;
const loadThree = async () => (threeMod ??= await import(THREE_URL));

// ---- Public Aotearoa Site Presets (no private client sites) -------------------------------------------------------
export const NZ_SITE_PRESETS = [
  {
    id: 'takapuna',
    short: 'Takapuna',
    name: 'Takapuna Coastal Headland, Tāmaki Makaurau',
    lat: -36.7932,
    lon: 174.7762,
    place: 'auckland',
    note: 'Hauraki Gulf coastal residential parcel · AUP Mixed Housing Urban',
  },
  {
    id: 'ponsonby',
    short: 'Ponsonby',
    name: 'Ponsonby Ridge, Tāmaki Makaurau',
    lat: -36.8548,
    lon: 174.7458,
    place: 'auckland',
    note: 'Inner-city character ridge · tight boundary envelope',
  },
  {
    id: 'oneroa',
    short: 'Waiheke',
    name: 'Oneroa Headland, Waiheke Island',
    lat: -36.7822,
    lon: 175.0112,
    place: 'auckland',
    note: 'Sloping coastal hillside · Hauraki Gulf Islands',
  },
  {
    id: 'oriental',
    short: 'Wellington',
    name: 'Oriental Bay, Te Whanganui-a-Tara',
    lat: -41.2906,
    lon: 174.7942,
    place: 'wellington',
    note: 'Harbour amphitheatre · high coastal wind exposure',
  },
  {
    id: 'sumner',
    short: 'Sumner',
    name: 'Sumner Coast, Ōtautahi Christchurch',
    lat: -43.5718,
    lon: 172.7618,
    place: 'christchurch',
    note: 'Port Hills volcanic edge · coastal solar exposure',
  },
];

const CAMERA_SHOTS = [
  { id: 'iso', label: 'Iso', yaw: 0.68, pitch: 0.58, distScale: 1.45 },
  { id: 'north', label: 'HIRB North', yaw: 0.04, pitch: 0.32, distScale: 1.35 },
  { id: 'plan', label: 'Plan', yaw: 0.0, pitch: 1.44, distScale: 1.55 },
  { id: 'eye', label: 'Street Eye', yaw: -0.58, pitch: 0.19, distScale: 1.05 },
];

const HIRB_PRESETS = [
  { id: 'aup-sh', label: 'AUP 2.5m/45°', baseHeightM: 2.5, angleDeg: 45, maxHeightM: 8.0, mdrs: false },
  { id: 'aup-mhu', label: 'MHU 3m/45°', baseHeightM: 3.0, angleDeg: 45, maxHeightM: 11.0, mdrs: false },
  { id: 'nz-mdrs', label: 'MDRS 4m/60°', baseHeightM: 4.0, angleDeg: 60, maxHeightM: 11.0, mdrs: true },
];

const GENMIX_COLORS = {
  hydro: '#6CD4A0',
  geothermal: '#D9BACB',
  wind: '#8FC3D4',
  solar: '#F2C97D',
  wood: '#B49A78',
  gas: '#C97B63',
  coal: '#7D6A74',
  other: '#917A85',
};

// ---- Pure Architectural & Geospatial Helpers (Node-testable) ------------------------------------------------------

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const round = (v, d = 2) => (v == null || !Number.isFinite(v) ? null : Number(v.toFixed(d)));

/** Nearest regional place key for /api/live/ power & weather feeds */
export function resolvePlaceKey(lat, lon) {
  const la = Number(lat), lo = Number(lon);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return 'auckland';
  const hubs = [
    ['auckland', -36.85, 174.76],
    ['hamilton', -37.79, 175.28],
    ['wellington', -41.29, 174.78],
    ['christchurch', -43.53, 172.64],
  ];
  let best = 'auckland', bestD = Infinity;
  for (const [key, hLat, hLon] of hubs) {
    const d = Math.hypot(la - hLat, (lo - hLon) * Math.cos((la * Math.PI) / 180));
    if (d < bestD) { bestD = d; best = key; }
  }
  return best;
}

/**
 * Zone-aware indicative NZ HIRB (Height in Relation to Boundary) parameters.
 * Plain guidance for 3D envelope exploration; not a formal council or planning assessment.
 */
export function resolveHirbRules(zoneName = '', overrides = {}) {
  const z = String(zoneName || '').trim();
  const zl = z.toLowerCase();
  let base = {
    zoneLabel: z || 'Indicative NZ Residential Envelope',
    baseHeightM: 2.5,
    angleDeg: 45,
    maxHeightM: 8.0,
    coverageMaxPct: 40,
    mdrs: false,
  };
  if (/terrace\s+housing|apartment|thab/i.test(zl)) {
    base = { zoneLabel: z, baseHeightM: 8.0, angleDeg: 60, maxHeightM: 16.0, coverageMaxPct: 50, mdrs: false };
  } else if (/mixed\s+housing\s+urban/i.test(zl)) {
    base = { zoneLabel: z, baseHeightM: 3.0, angleDeg: 45, maxHeightM: 11.0, coverageMaxPct: 45, mdrs: false };
  } else if (/mixed\s+housing\s+suburban/i.test(zl)) {
    base = { zoneLabel: z, baseHeightM: 2.5, angleDeg: 45, maxHeightM: 8.0, coverageMaxPct: 40, mdrs: false };
  } else if (/single\s+house/i.test(zl)) {
    base = { zoneLabel: z, baseHeightM: 2.5, angleDeg: 45, maxHeightM: 8.0, coverageMaxPct: 35, mdrs: false };
  } else if (/hauraki\s+gulf|coastal|rural/i.test(zl)) {
    base = { zoneLabel: z, baseHeightM: 2.5, angleDeg: 45, maxHeightM: 9.0, coverageMaxPct: 35, mdrs: false };
  } else if (/business|centre|town|city|mixed\s+use/i.test(zl)) {
    base = { zoneLabel: z, baseHeightM: 8.0, angleDeg: 60, maxHeightM: 18.0, coverageMaxPct: 70, mdrs: false };
  }
  return {
    ...base,
    baseHeightM: clamp(Number(overrides.baseHeightM ?? base.baseHeightM), 1.5, 12),
    angleDeg: clamp(Number(overrides.angleDeg ?? base.angleDeg), 25, 75),
    maxHeightM: clamp(Number(overrides.maxHeightM ?? base.maxHeightM), 4, 28),
    coverageMaxPct: clamp(Number(overrides.coverageMaxPct ?? base.coverageMaxPct), 15, 90),
    mdrs: Boolean(overrides.mdrs ?? base.mdrs),
  };
}

/** Extract outer lon/lat rings from GeoJSON Polygon or MultiPolygon */
export function extractOuterRings(geom) {
  if (!geom || typeof geom !== 'object') return [];
  if (geom.type === 'Polygon') return geom.coordinates?.[0] ? [geom.coordinates[0]] : [];
  if (geom.type === 'MultiPolygon') return (geom.coordinates || []).map((p) => p?.[0]).filter(Boolean);
  return [];
}

/** Signed 2D area in local (x East, z South) metres */
export function signedAreaXZ(ring) {
  if (!Array.isArray(ring) || ring.length < 3) return 0;
  let a = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x0, z0] = ring[i];
    const [x1, z1] = ring[(i + 1) % ring.length];
    a += x0 * z1 - x1 * z0;
  }
  return a / 2;
}

/** Point-in-polygon ray cast in XZ metres */
export function pointInRingXZ(x, z, ring) {
  if (!Array.isArray(ring) || ring.length < 3) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i];
    const [xj, zj] = ring[j];
    const intersect = (zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Shortest Euclidean distance from point (px, pz) to segment (ax, az)-(bx, bz) */
export function distPointToSegmentXZ(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  if (lenSq < 1e-9) return Math.hypot(px - ax, pz - az);
  const t = clamp(((px - ax) * dx + (pz - az) * dz) / lenSq, 0, 1);
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

function stripDuplicateClose(pts) {
  if (pts.length > 1) {
    const first = pts[0], last = pts[pts.length - 1];
    if (Math.hypot(first[0] - last[0], first[1] - last[1]) < 1e-4) return pts.slice(0, -1);
  }
  return pts;
}

/**
 * Normalize a LINZ GeoJSON parcel polygon into local NZTM2000 metres:
 *   +x = East, +z = South (-z = North), consistently oriented with positive signed area.
 */
export function normalizeParcelPolygon(geojsonGeometry, origin) {
  const rings = extractOuterRings(geojsonGeometry);
  if (!rings.length || !origin) return null;
  const oEN = toNZTM(origin.lat, origin.lon);
  let pts = stripDuplicateClose(
    rings[0]
      .filter((c) => Array.isArray(c) && c.length >= 2 && Number.isFinite(c[0]) && Number.isFinite(c[1]))
      .map(([lon, lat]) => {
        const { e, n } = toNZTM(lat, lon);
        return [round(e - oEN.e, 3), round(-(n - oEN.n), 3)];
      }),
  );
  if (pts.length < 3) return null;
  let area = signedAreaXZ(pts);
  if (area < 0) {
    pts = pts.slice().reverse();
    area = -area;
  }
  let cx = 0, cz = 0;
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of pts) {
    cx += x; cz += z;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  cx /= pts.length;
  cz /= pts.length;
  const edges = pts.map((a, i) => {
    const b = pts[(i + 1) % pts.length];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const len = Math.hypot(dx, dz) || 1;
    // Positive signedAreaXZ means interior lies to the (+z left) normal (-dz/len, dx/len)
    return { a, b, len, nx: -dz / len, nz: dx / len, mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] };
  });
  return {
    ring: pts,
    edges,
    centroid: [round(cx, 2), round(cz, 2)],
    areaM2: round(Math.abs(area), 1),
    bounds: { minX, maxX, minZ, maxZ, width: round(maxX - minX, 2), depth: round(maxZ - minZ, 2) },
  };
}

/** Synthesize a clean illustrative coastal residential parcel if LINZ parcel is absent (e.g. offshore/offline) */
export function buildIllustrativeParcel(widthM = 20, depthM = 30) {
  const hw = widthM / 2, hd = depthM / 2;
  const ring = [[-hw, -hd], [hw, -hd], [hw + 1.4, hd], [-hw + 0.6, hd]];
  const edges = ring.map((a, i) => {
    const b = ring[(i + 1) % ring.length];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const len = Math.hypot(dx, dz) || 1;
    return { a, b, len, nx: -dz / len, nz: dx / len, mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] };
  });
  return {
    ring,
    edges,
    centroid: [0.5, 0],
    areaM2: round(Math.abs(signedAreaXZ(ring)), 1),
    bounds: { minX: -hw, maxX: hw + 1.4, minZ: -hd, maxZ: hd, width: widthM + 1.4, depth: depthM },
    illustrative: true,
  };
}

/** Normalize LINZ Building Outlines GeoJSON into local XZ metres and flag on-site vs neighbour structures */
export function normalizeBuildings(geojson, origin, parcelRing = null) {
  const features = geojson?.features ?? [];
  if (!features.length || !origin) return [];
  const oEN = toNZTM(origin.lat, origin.lon);
  const out = [];
  for (const feat of features) {
    for (const rawRing of extractOuterRings(feat.geometry)) {
      const pts = stripDuplicateClose(
        rawRing
          .filter((c) => Array.isArray(c) && c.length >= 2)
          .map(([lon, lat]) => {
            const { e, n } = toNZTM(lat, lon);
            return [round(e - oEN.e, 2), round(-(n - oEN.n), 2)];
          }),
      );
      if (pts.length < 3) continue;
      const areaM2 = round(Math.abs(signedAreaXZ(pts)), 1);
      if (areaM2 < 8) continue;
      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
      const cz = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      const onSite = Array.isArray(parcelRing) && parcelRing.length >= 3 ? pointInRingXZ(cx, cz, parcelRing) : false;
      // Indicative extrusion height from footprint area (LINZ outlines carry no height; labelled assumed in UI)
      const heightM = areaM2 > 320 ? 8.2 : areaM2 > 140 ? 6.4 : areaM2 > 55 ? 4.8 : 3.2;
      out.push({
        id: feat.properties?.building_id ?? feat.id ?? out.length + 1,
        name: feat.properties?.name || null,
        ring: pts,
        centroid: [round(cx, 2), round(cz, 2)],
        areaM2,
        onSite,
        heightM,
      });
    }
  }
  return out;
}

/**
 * Exact HIRB permitted height above boundary ground at local point (x, z).
 * Uses minimum distance across every parcel boundary segment so convex and concave parcels are handled accurately.
 */
export function hirbMaxHeightAt(x, z, parcelRing, rules) {
  if (!Array.isArray(parcelRing) || parcelRing.length < 3) return rules?.maxHeightM ?? 8;
  const r = rules || resolveHirbRules();
  const slope = Math.tan((r.angleDeg * Math.PI) / 180);
  const inside = pointInRingXZ(x, z, parcelRing);
  let minDist = Infinity;
  let nearestEdge = 0;
  for (let i = 0; i < parcelRing.length; i++) {
    const [ax, az] = parcelRing[i];
    const [bx, bz] = parcelRing[(i + 1) % parcelRing.length];
    const d = distPointToSegmentXZ(x, z, ax, az, bx, bz);
    if (d < minDist) {
      minDist = d;
      nearestEdge = i;
    }
  }
  if (!inside) return { permittedM: 0, edgeDistM: -minDist, nearestEdge, inside: false };
  const permittedM = Math.min(r.maxHeightM, r.baseHeightM + minDist * slope);
  return { permittedM, edgeDistM: minDist, nearestEdge, inside: true };
}

/**
 * Compute frosted 3D HIRB daylight plane prism samples, peak ridge height, and volume (m³) over a parcel.
 */
export function computeHirbEnvelope(parcel, rules, stepM = 1.0) {
  if (!parcel?.ring?.length) return null;
  const r = rules || resolveHirbRules();
  const { minX, maxX, minZ, maxZ } = parcel.bounds;
  const nx = Math.max(8, Math.min(64, Math.ceil((maxX - minX) / stepM)));
  const nz = Math.max(8, Math.min(64, Math.ceil((maxZ - minZ) / stepM)));
  const dx = (maxX - minX) / nx;
  const dz = (maxZ - minZ) / nz;
  const heights = new Float32Array((nx + 1) * (nz + 1)).fill(NaN);
  let maxPeakM = 0;
  let volumeM3 = 0;
  let insideCount = 0;

  for (let j = 0; j <= nz; j++) {
    const z = minZ + j * dz;
    for (let i = 0; i <= nx; i++) {
      const x = minX + i * dx;
      const evalPt = hirbMaxHeightAt(x, z, parcel.ring, r);
      if (evalPt.inside) {
        heights[j * (nx + 1) + i] = evalPt.permittedM;
        if (evalPt.permittedM > maxPeakM) maxPeakM = evalPt.permittedM;
        volumeM3 += evalPt.permittedM * dx * dz;
        insideCount++;
      }
    }
  }
  return {
    nx,
    nz,
    minX,
    maxX,
    minZ,
    maxZ,
    dx,
    dz,
    heights,
    baseHeightM: r.baseHeightM,
    angleDeg: r.angleDeg,
    maxHeightM: r.maxHeightM,
    maxPeakM: round(maxPeakM, 2),
    envelopeVolumeM3: round(volumeM3, 0),
    sampleCount: insideCount,
  };
}

/**
 * Evaluate proposed architectural pavilion massing against parcel boundaries & HIRB daylight planes.
 * massing = { cx, cz, width, depth, height, rotDeg }
 */
export function evaluateMassingCompliance(massing, parcel, rules, sampleGround = () => 0) {
  if (!parcel?.ring?.length || !massing) {
    return { compliant: true, maxBreachM: 0, minClearanceM: 0, worstEdgeIndex: -1, siteCoveragePct: 0, gfaM2: 0, cornerChecks: [] };
  }
  const rad = ((massing.rotDeg || 0) * Math.PI) / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  const hw = massing.width / 2, hd = massing.depth / 2;
  const baseGroundY = sampleGround(massing.cx, massing.cz);
  const roofElevationY = baseGroundY + massing.height;

  // Sample 4 roof corners + 4 edge midpoints + ridge centre for thorough HIRB checking
  const localPts = [
    [-hw, -hd, 'NW'], [hw, -hd, 'NE'], [hw, hd, 'SE'], [-hw, hd, 'SW'],
    [0, -hd, 'N'], [hw, 0, 'E'], [0, hd, 'S'], [-hw, 0, 'W'], [0, 0, 'Centre'],
  ];

  const cornerChecks = [];
  let maxBreachM = 0;
  let minClearanceM = Infinity;
  let worstEdgeIndex = -1;

  for (const [lx, lz, tag] of localPts) {
    const wx = massing.cx + lx * cos - lz * sin;
    const wz = massing.cz + lx * sin + lz * cos;
    const ptGroundY = sampleGround(wx, wz);
    const localRoofH = roofElevationY - ptGroundY;
    const check = hirbMaxHeightAt(wx, wz, parcel.ring, rules);
    const breachM = check.inside ? Math.max(0, localRoofH - check.permittedM) : Math.max(localRoofH, Math.abs(check.edgeDistM));
    const clearanceM = check.inside ? check.permittedM - localRoofH : -breachM;
    if (breachM > maxBreachM) {
      maxBreachM = breachM;
      worstEdgeIndex = check.nearestEdge;
    }
    if (clearanceM < minClearanceM) minClearanceM = clearanceM;
    cornerChecks.push({
      tag,
      x: round(wx, 2),
      z: round(wz, 2),
      insideParcel: check.inside,
      permittedM: round(check.permittedM, 2),
      actualM: round(localRoofH, 2),
      breachM: round(breachM, 2),
      clearanceM: round(clearanceM, 2),
      nearestEdge: check.nearestEdge,
    });
  }

  const footprintM2 = massing.width * massing.depth;
  const storeys = Math.max(1, Math.floor((massing.height - 0.6) / 3.0));
  const siteCoveragePct = parcel.areaM2 > 0 ? round((footprintM2 / parcel.areaM2) * 100, 1) : 0;

  return {
    compliant: maxBreachM <= 0.01 && cornerChecks.every((c) => c.insideParcel),
    maxBreachM: round(maxBreachM, 2),
    minClearanceM: round(minClearanceM === Infinity ? 0 : minClearanceM, 2),
    worstEdgeIndex,
    siteCoveragePct,
    footprintM2: round(footprintM2, 0),
    gfaM2: round(footprintM2 * storeys, 0),
    storeys,
    cornerChecks,
  };
}

/**
 * Extract 1 m topographic contour line segments via Marching Squares from a square elevation grid.
 * Grid coordinates map column i -> x = (i - half) * cell, row j -> z = (j - half) * cell (north-up rows -> +z south).
 */
export function extractContourSegments(grid, intervalM = 1.0, majorStep = 5) {
  if (!grid?.data || !grid.n || grid.n < 2) return [];
  const { n, cell = 1, data } = grid;
  const half = (n - 1) / 2;
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < data.length; i++) {
    const v = data[i];
    if (Number.isFinite(v)) {
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi - lo < intervalM * 0.25) return [];

  const startLvl = Math.ceil(lo / intervalM) * intervalM;
  const endLvl = Math.floor(hi / intervalM) * intervalM;
  const maxLevels = 48;
  const step = (endLvl - startLvl) / intervalM > maxLevels ? Math.ceil(((endLvl - startLvl) / intervalM) / maxLevels) * intervalM : intervalM;

  const interp = (a, b, va, vb, lvl) => {
    const denom = vb - va;
    if (Math.abs(denom) < 1e-6) return (a + b) * 0.5;
    return a + ((lvl - va) / denom) * (b - a);
  };

  const out = [];
  for (let lvl = startLvl; lvl <= endLvl + 1e-6; lvl += step) {
    const segments = [];
    for (let j = 0; j < n - 1; j++) {
      const z0 = (j - half) * cell;
      const z1 = (j + 1 - half) * cell;
      const row0 = j * n, row1 = (j + 1) * n;
      for (let i = 0; i < n - 1; i++) {
        const v0 = data[row0 + i];     // NW
        const v1 = data[row0 + i + 1]; // NE
        const v2 = data[row1 + i + 1]; // SE
        const v3 = data[row1 + i];     // SW
        if (!Number.isFinite(v0) || !Number.isFinite(v1) || !Number.isFinite(v2) || !Number.isFinite(v3)) continue;
        const x0 = (i - half) * cell;
        const x1 = (i + 1 - half) * cell;
        const pts = [];
        if ((v0 < lvl) !== (v1 < lvl)) pts.push([interp(x0, x1, v0, v1, lvl), z0]);
        if ((v1 < lvl) !== (v2 < lvl)) pts.push([x1, interp(z0, z1, v1, v2, lvl)]);
        if ((v2 < lvl) !== (v3 < lvl)) pts.push([interp(x1, x0, v2, v3, lvl), z1]);
        if ((v3 < lvl) !== (v0 < lvl)) pts.push([x0, interp(z1, z0, v3, v0, lvl)]);
        if (pts.length >= 2) {
          segments.push([pts[0][0], pts[0][1], pts[1][0], pts[1][1]]);
          if (pts.length === 4) segments.push([pts[2][0], pts[2][1], pts[3][0], pts[3][1]]);
        }
      }
    }
    if (segments.length) {
      const roundedLvl = round(lvl, 2);
      const isMajor = Math.abs(Math.round(roundedLvl / (majorStep * intervalM)) * (majorStep * intervalM) - roundedLvl) < 0.05;
      out.push({ level: roundedLvl, isMajor, segments });
    }
  }
  return out;
}

/**
 * Convert meteorological wind (blowing FROM degrees clockwise from North, km/h)
 * into 3D scene velocity (vx East, vz South in m/s) + NZ compass bearing.
 */
export function computeWindVector(windFromDeg = 225, windKmh = 18) {
  const fromDeg = ((Number(windFromDeg) || 0) % 360 + 360) % 360;
  const kmh = Math.max(0, Number(windKmh) || 0);
  const speedMs = kmh / 3.6;
  const fromRad = (fromDeg * Math.PI) / 180;
  const toDeg = (fromDeg + 180) % 360;
  // +X = East, +Z = South (-Z = North): wind FROM North (0°) pushes toward +Z (South)
  const vx = -speedMs * Math.sin(fromRad);
  const vz = speedMs * Math.cos(fromRad);
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const compass = dirs[Math.round(fromDeg / 22.5) % 16];
  const beaufort = kmh < 1 ? 0 : kmh < 6 ? 1 : kmh < 12 ? 2 : kmh < 20 ? 3 : kmh < 29 ? 4 : kmh < 39 ? 5 : kmh < 50 ? 6 : kmh < 62 ? 7 : 8;
  return {
    fromDeg: round(fromDeg, 0),
    toDeg: round(toDeg, 0),
    kmh: round(kmh, 1),
    speedMs: round(speedMs, 2),
    vx: round(vx, 3),
    vz: round(vz, 3),
    compass,
    beaufort,
  };
}

/**
 * Southern Hemisphere solar position for Aotearoa latitude (x East, y Up, z South).
 * At solar noon in NZ, the sun lies due North (azimuth ~ 0°, z < 0).
 */
export function computeSolarPosition(latDeg = -36.85, dayOfYear = 330, localHour = 13.5, radius = 95) {
  const lat = (latDeg * Math.PI) / 180;
  const decl = (23.44 * Math.PI / 180) * Math.sin((2 * Math.PI * (284 + dayOfYear)) / 365);
  const hourAngle = ((localHour - 12.4) * 15 * Math.PI) / 180; // NZ solar noon ~ 12:24–12:40
  const sinAlt = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(hourAngle);
  const alt = Math.asin(clamp(sinAlt, -1, 1));
  const cosAlt = Math.max(1e-4, Math.cos(alt));
  const cosAz = clamp((Math.sin(decl) - Math.sin(alt) * Math.sin(lat)) / (cosAlt * Math.cos(lat)), -1, 1);
  let az = Math.acos(cosAz);
  if (hourAngle > 0) az = 2 * Math.PI - az; // afternoon -> West (az > 180°)
  const x = radius * Math.cos(alt) * Math.sin(az);
  const y = radius * Math.sin(alt);
  const z = -radius * Math.cos(alt) * Math.cos(az);
  return {
    altitudeDeg: round((alt * 180) / Math.PI, 1),
    azimuthDeg: round((az * 180) / Math.PI, 1),
    x: round(x, 2),
    y: round(y, 2),
    z: round(z, 2),
    isDay: alt > 0.02,
  };
}

/** Estimate rooftop solar PV array capacity & live generation from pavilion roof area + live Open-Meteo radiation */
export function estimateRooftopSolar(roofAreaM2 = 140, solarWm2 = 580, cloudPct = 25, isDay = true) {
  const usableM2 = Math.max(12, roofAreaM2 * 0.42); // 42% clear north-facing roof area
  const panelEfficiency = 0.21;
  const arrayKwPeak = round(usableM2 * panelEfficiency, 1);
  const irradiance = isDay ? Math.max(0, Number.isFinite(solarWm2) ? solarWm2 : (100 - (cloudPct || 0)) * 7.8) : 0;
  const currentKw = round(Math.min(arrayKwPeak, (usableM2 * irradiance * panelEfficiency * 0.84) / 1000), 2);
  const dailyKwhEst = round(arrayKwPeak * (4.1 * (1 - (clamp(cloudPct || 0, 0, 100) / 100) * 0.55)), 1);
  return { usableM2: round(usableM2, 0), arrayKwPeak, currentKw, dailyKwhEst };
}

/** Deterministic baseline Simulated Studio IoT telemetry (always clearly labelled SIMULATED) */
export function createSimulatedIotTelemetry(liveContext = {}, nowMs = Date.now()) {
  const outdoorTempC = Number.isFinite(liveContext.outdoorTempC) ? liveContext.outdoorTempC : 18.4;
  const outdoorHumidityPct = Number.isFinite(liveContext.outdoorHumidityPct) ? liveContext.outdoorHumidityPct : 68;
  const windKmh = Number.isFinite(liveContext.windKmh) ? liveContext.windKmh : 18;
  const rainMm = Number.isFinite(liveContext.rainMm) ? liveContext.rainMm : 0;
  const rooftopSolarKw = Number.isFinite(liveContext.rooftopSolarKw) ? liveContext.rooftopSolarKw : 3.2;

  const phase = (nowMs / 1000) * 0.08;
  const indoorTempC = round(clamp(20.6 + (outdoorTempC - 18) * 0.24 + Math.sin(phase) * 0.25, 17.5, 25.5), 1);
  const deltaTempC = round(indoorTempC - outdoorTempC, 1);
  const humidityPct = round(clamp(51 + (outdoorHumidityPct - 65) * 0.22 + Math.cos(phase * 0.7) * 1.4, 38, 72), 0);
  const crossVentActive = windKmh >= 8 && Math.abs(deltaTempC) >= 1.2 && outdoorTempC >= 13 && outdoorTempC <= 24;
  const co2Ppm = Math.round(clamp((crossVentActive ? 465 : 590) + Math.sin(phase * 1.3) * 28, 410, 950));
  const tankPct = round(clamp(74 + Math.min(20, rainMm * 3.5) + Math.sin(phase * 0.2) * 1.2, 22, 99), 0);
  const studioLoadKw = round(clamp(1.85 + Math.sin(phase * 0.9) * 0.35, 0.8, 4.5), 2);
  const netExportKw = round(rooftopSolarKw - studioLoadKw, 2);

  return {
    source: 'simulated',
    sourceLabel: 'Simulated Studio IoT',
    updatedAt: new Date(nowMs).toISOString(),
    indoorTempC,
    outdoorTempC: round(outdoorTempC, 1),
    deltaTempC,
    humidityPct,
    co2Ppm,
    passiveVentMode: crossVentActive ? 'Cross-vent active' : deltaTempC > 2.5 ? 'Night purge ready' : 'Envelope sealed',
    tankPct,
    tankLitres: Math.round((tankPct / 100) * 10000),
    rooftopSolarKw: round(rooftopSolarKw, 2),
    studioLoadKw,
    netExportKw,
    liveFields: [],
  };
}

/**
 * Merge a user's live JSON polling or WebSocket IoT payload onto baseline telemetry.
 * Supports flat or nested sensor payloads (Home Assistant / MQTT bridge / custom JSON).
 */
export function mergeIotTelemetry(baseline, payload, meta = {}) {
  const base = baseline || createSimulatedIotTelemetry();
  if (!payload || typeof payload !== 'object') return base;
  const src = payload.telemetry && typeof payload.telemetry === 'object' ? payload.telemetry
    : payload.data && typeof payload.data === 'object' ? payload.data
    : payload;

  const pickNum = (keys, lo, hi) => {
    for (const k of keys) {
      const v = Number(src[k]);
      if (Number.isFinite(v) && v >= lo && v <= hi) return v;
    }
    return null;
  };

  const liveFields = [];
  const next = { ...base };

  const t = pickNum(['indoorTempC', 'indoor_temp', 'tempC', 'temp', 'temperature'], -10, 55);
  if (t !== null) { next.indoorTempC = round(t, 1); liveFields.push('indoorTempC'); }

  const rh = pickNum(['humidityPct', 'humidity', 'rh', 'indoor_rh', 'relative_humidity'], 0, 100);
  if (rh !== null) { next.humidityPct = round(rh, 0); liveFields.push('humidityPct'); }

  const co2 = pickNum(['co2Ppm', 'co2', 'co2_ppm', 'iaq_co2'], 300, 5000);
  if (co2 !== null) { next.co2Ppm = Math.round(co2); liveFields.push('co2Ppm'); }

  const tank = pickNum(['tankPct', 'rainwaterPct', 'rainwater_pct', 'tank_pct', 'tank'], 0, 100);
  if (tank !== null) {
    next.tankPct = round(tank, 0);
    next.tankLitres = Math.round((next.tankPct / 100) * 10000);
    liveFields.push('tankPct');
  }

  const pv = pickNum(['rooftopSolarKw', 'solarKw', 'solar_kw', 'pv_kw', 'pvKw'], 0, 100);
  if (pv !== null) { next.rooftopSolarKw = round(pv, 2); liveFields.push('rooftopSolarKw'); }

  const load = pickNum(['studioLoadKw', 'loadKw', 'load_kw', 'power_kw', 'demandKw'], 0, 100);
  if (load !== null) { next.studioLoadKw = round(load, 2); liveFields.push('studioLoadKw'); }

  next.deltaTempC = round(next.indoorTempC - next.outdoorTempC, 1);
  next.netExportKw = round(next.rooftopSolarKw - next.studioLoadKw, 2);
  next.passiveVentMode = next.co2Ppm > 800
    ? 'Purge recommended'
    : Math.abs(next.deltaTempC) >= 1.2 && next.outdoorTempC >= 13 && next.outdoorTempC <= 24
      ? 'Cross-vent optimal'
      : 'Envelope steady';

  if (liveFields.length) {
    next.source = meta.transport === 'ws' ? 'live-ws' : 'live-http';
    next.sourceLabel = meta.transport === 'ws' ? 'Live WebSocket IoT' : 'Live HTTP IoT';
    next.updatedAt = new Date().toISOString();
    next.liveFields = liveFields;
  }
  return next;
}

// ---- CSS Injection & Utility Helpers -----------------------------------------------------------------------------

function ensureLiveEnvelopeCss() {
  if (typeof document === 'undefined') return;
  if (document.querySelector('link[data-live-envelope-css], link[href*="live-envelope.css"]')) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = new URL('../live-envelope.css?v=2', import.meta.url).href;
  l.dataset.liveEnvelopeCss = '1';
  document.head.append(l);
}

function webglSupported() {
  try {
    const c = globalThis.document?.createElement('canvas');
    const gl = c?.getContext('webgl2') ?? c?.getContext('webgl');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch { return false; }
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function fmtHour(h) {
  const hr = Math.floor(h);
  const mn = Math.round((h - hr) * 60);
  return `${String(hr).padStart(2, '0')}:${String(mn).padStart(2, '0')}`;
}

function currentNzHour() {
  try {
    const parts = new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 13);
    const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 30);
    return clamp(h + m / 60, 6, 20.5);
  } catch {
    return 13.5;
  }
}

function synthesizeTerrainGrid(radius = 72, lat = -36.85) {
  const n = radius * 2 + 1;
  const data = new Float32Array(n * n);
  const slopeDir = lat < -40 ? 0.14 : 0.085;
  for (let j = 0; j < n; j++) {
    const z = j - radius;
    for (let i = 0; i < n; i++) {
      const x = i - radius;
      const ridge = -z * slopeDir + Math.sin(x * 0.048 + 0.3) * Math.cos(z * 0.044) * 2.1 + Math.sin((x - z) * 0.09) * 0.55;
      data[j * n + i] = ridge;
    }
  }
  return { n, cell: 1, data, baseElevM: 18.0, live: false, surveyTitle: 'Illustrative contour surface (LINZ LiDAR unavailable)' };
}

function sampleTerrainHeight(grid, x, z) {
  if (!grid?.data || !grid.n) return 0;
  const half = (grid.n - 1) / 2;
  const fx = x / (grid.cell || 1) + half;
  const fz = z / (grid.cell || 1) + half;
  const i = Math.floor(fx), j = Math.floor(fz);
  if (i < 0 || j < 0 || i >= grid.n - 1 || j >= grid.n - 1) return 0;
  const a = fx - i, b = fz - j;
  const k = j * grid.n + i;
  const h00 = grid.data[k], h10 = grid.data[k + 1], h01 = grid.data[k + grid.n], h11 = grid.data[k + grid.n + 1];
  if (!Number.isFinite(h00) || !Number.isFinite(h10) || !Number.isFinite(h01) || !Number.isFinite(h11)) return 0;
  return (h00 * (1 - a) + h10 * a) * (1 - b) + (h01 * (1 - a) + h11 * a) * b;
}

// ---- 3D Architectural Twin Renderer (Three.js r170, zero bare imports) --------------------------------------------

async function createTwinScene(canvas) {
  const THREE = await loadThree();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#180B18');
  scene.fog = new THREE.FogExp2('#180B18', 0.0042);

  const camera = new THREE.PerspectiveCamera(42, 16 / 10, 0.4, 650);

  // Lighting: soft plum-ivory hemisphere + real-time NZ solar directional light + subtle dusty-rose rim
  const hemi = new THREE.HemisphereLight('#FFF5EC', '#2D1A2B', 0.92);
  scene.add(hemi);

  const sunLight = new THREE.DirectionalLight('#FFEEDB', 2.15);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near = 10;
  sunLight.shadow.camera.far = 260;
  const sCam = 75;
  sunLight.shadow.camera.left = -sCam;
  sunLight.shadow.camera.right = sCam;
  sunLight.shadow.camera.top = sCam;
  sunLight.shadow.camera.bottom = -sCam;
  sunLight.shadow.bias = -0.0005;
  scene.add(sunLight);

  const rimLight = new THREE.DirectionalLight('#D9BACB', 0.42);
  rimLight.position.set(-55, 36, 48);
  scene.add(rimLight);

  // Scene layer groups
  const groups = {
    terrain: new THREE.Group(),
    contours: new THREE.Group(),
    parcel: new THREE.Group(),
    hirb: new THREE.Group(),
    buildings: new THREE.Group(),
    pavilion: new THREE.Group(),
    wind: new THREE.Group(),
    sun: new THREE.Group(),
    iot: new THREE.Group(),
    compass: new THREE.Group(),
  };
  Object.values(groups).forEach((g) => scene.add(g));

  // Architectural compass ring (N / E / S / W)
  function makeLabelSprite(text, color = '#D9BACB', bg = null, scaleW = 4.6) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 96;
    const g = c.getContext('2d');
    if (bg) {
      g.fillStyle = bg;
      g.beginPath();
      g.roundRect(14, 14, 228, 68, 34);
      g.fill();
      g.strokeStyle = 'rgba(217, 186, 203, 0.55)';
      g.lineWidth = 3;
      g.stroke();
    }
    g.font = '500 42px "IBM Plex Mono", monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = color;
    g.fillText(text, 128, 50);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sp = new THREE.Sprite(mat);
    sp.scale.set(scaleW, (scaleW * 96) / 256, 1);
    sp.renderOrder = 12;
    return sp;
  }

  function buildCompass(radius = 58) {
    clearGroup(groups.compass);
    const ringPts = [];
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      ringPts.push(new THREE.Vector3(Math.cos(a) * radius, 0.12, Math.sin(a) * radius));
    }
    const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPts);
    const ringMat = new THREE.LineBasicMaterial({ color: '#D9BACB', transparent: true, opacity: 0.24 });
    groups.compass.add(new THREE.Line(ringGeo, ringMat));

    const cards = [
      ['N', 0, -radius - 4, '#F9F6F2'],
      ['E', radius + 4, 0, '#D9BACB'],
      ['S', 0, radius + 4, '#D9BACB'],
      ['W', -radius - 4, 0, '#D9BACB'],
    ];
    for (const [lbl, x, z, col] of cards) {
      const sp = makeLabelSprite(lbl, col, lbl === 'N' ? 'rgba(33, 18, 31, 0.88)' : null, lbl === 'N' ? 5.2 : 4.2);
      sp.position.set(x, 1.5, z);
      groups.compass.add(sp);
    }
  }
  buildCompass(58);

  function clearGroup(grp) {
    while (grp.children.length) {
      const child = grp.children.pop();
      child.traverse?.((node) => {
        if (node.geometry) node.geometry.dispose();
        if (node.material) {
          const mats = Array.isArray(node.material) ? node.material : [node.material];
          for (const m of mats) {
            if (m.map) m.map.dispose();
            m.dispose();
          }
        }
      });
    }
  }

  // Terrain + 1 m Contour lines
  let currentTerrain = synthesizeTerrainGrid(72);

  function setTerrain(grid) {
    currentTerrain = grid;
    clearGroup(groups.terrain);
    clearGroup(groups.contours);

    const { n, cell = 1, data } = grid;
    const size = (n - 1) * cell;
    const segs = Math.min(n - 1, 128);
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    let minH = Infinity, maxH = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const y = sampleTerrainHeight(grid, x, z);
      pos.setY(i, y);
      if (y < minH) minH = y;
      if (y > maxH) maxH = y;
    }
    const span = Math.max(1, maxH - minH);
    const cLow = new THREE.Color('#251724');
    const cMid = new THREE.Color('#392836');
    const cHigh = new THREE.Color('#5A4452');
    const cTmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const t = clamp((pos.getY(i) - minH) / span, 0, 1);
      if (t < 0.5) cTmp.lerpColors(cLow, cMid, t * 2);
      else cTmp.lerpColors(cMid, cHigh, (t - 0.5) * 2);
      colors[i * 3] = cTmp.r;
      colors[i * 3 + 1] = cTmp.g;
      colors[i * 3 + 2] = cTmp.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.04,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    groups.terrain.add(mesh);

    // Subtle 10 m datum reference grid
    const gridHelper = new THREE.GridHelper(size, Math.round(size / 10), '#5B4050', '#342031');
    gridHelper.position.y = minH - 0.35;
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.22;
    groups.terrain.add(gridHelper);

    // 1 m & 5 m Topographic Contour Lines
    const levels = extractContourSegments(grid, 1.0, 5);
    const minorVerts = [], majorVerts = [];
    for (const lv of levels) {
      const target = lv.isMajor ? majorVerts : minorVerts;
      for (const [x1, z1, x2, z2] of lv.segments) {
        const y1 = sampleTerrainHeight(grid, x1, z1) + 0.06;
        const y2 = sampleTerrainHeight(grid, x2, z2) + 0.06;
        target.push(x1, y1, z1, x2, y2, z2);
      }
    }
    if (minorVerts.length) {
      const gMin = new THREE.BufferGeometry();
      gMin.setAttribute('position', new THREE.Float32BufferAttribute(minorVerts, 3));
      const mMin = new THREE.LineBasicMaterial({ color: '#CBBBC6', transparent: true, opacity: 0.28 });
      groups.contours.add(new THREE.LineSegments(gMin, mMin));
    }
    if (majorVerts.length) {
      const gMaj = new THREE.BufferGeometry();
      gMaj.setAttribute('position', new THREE.Float32BufferAttribute(majorVerts, 3));
      const mMaj = new THREE.LineBasicMaterial({ color: '#D9BACB', transparent: true, opacity: 0.72 });
      groups.contours.add(new THREE.LineSegments(gMaj, mMaj));
    }
  }

  // LINZ Parcel Boundary + Frosted 3D HIRB Daylight Plane Prism
  function setParcelAndHirb(parcel, rules, breachEdgeIndex = -1) {
    clearGroup(groups.parcel);
    clearGroup(groups.hirb);
    if (!parcel?.ring?.length) return;

    // Parcel boundary glowing ribbon draped onto terrain
    const ringPts = [];
    const subSteps = 6;
    for (let i = 0; i < parcel.ring.length; i++) {
      const [ax, az] = parcel.ring[i];
      const [bx, bz] = parcel.ring[(i + 1) % parcel.ring.length];
      for (let s = 0; s < subSteps; s++) {
        const t = s / subSteps;
        const x = ax + (bx - ax) * t;
        const z = az + (bz - az) * t;
        ringPts.push(new THREE.Vector3(x, sampleTerrainHeight(currentTerrain, x, z) + 0.12, z));
      }
    }
    ringPts.push(ringPts[0].clone());
    const pGeo = new THREE.BufferGeometry().setFromPoints(ringPts);
    const pMat = new THREE.LineBasicMaterial({ color: '#F9F6F2', transparent: true, opacity: 0.95 });
    groups.parcel.add(new THREE.Line(pGeo, pMat));

    // Subtle luminous ground highlight inside parcel
    const shape = new THREE.Shape();
    parcel.ring.forEach(([x, z], idx) => {
      if (idx === 0) shape.moveTo(x, -z);
      else shape.lineTo(x, -z);
    });
    shape.closePath();
    const fillGeo = new THREE.ShapeGeometry(shape);
    fillGeo.rotateX(-Math.PI / 2);
    const fp = fillGeo.attributes.position;
    for (let i = 0; i < fp.count; i++) {
      fp.setY(i, sampleTerrainHeight(currentTerrain, fp.getX(i), fp.getZ(i)) + 0.05);
    }
    fillGeo.computeVertexNormals();
    const fillMat = new THREE.MeshBasicMaterial({ color: '#D9BACB', transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false });
    groups.parcel.add(new THREE.Mesh(fillGeo, fillMat));

    // Build Frosted 3D HIRB Prism: vertical perimeter walls (0 -> baseHeightM) + receding daylight canopy
    const env = computeHirbEnvelope(parcel, rules, 0.9);
    if (!env) return;

    // 1) Perimeter base walls along each parcel edge (terrain -> terrain + baseHeightM)
    const wallVerts = [];
    const topEdgeVerts = [];
    for (let i = 0; i < parcel.ring.length; i++) {
      const [ax, az] = parcel.ring[i];
      const [bx, bz] = parcel.ring[(i + 1) % parcel.ring.length];
      const ga = sampleTerrainHeight(currentTerrain, ax, az);
      const gb = sampleTerrainHeight(currentTerrain, bx, bz);
      const ta = ga + rules.baseHeightM;
      const tb = gb + rules.baseHeightM;
      wallVerts.push(ax, ga, az, bx, gb, bz, bx, tb, bz);
      wallVerts.push(ax, ga, az, bx, tb, bz, ax, ta, az);
      topEdgeVerts.push(ax, ta, az, bx, tb, bz);
      // Vertical corner posts
      topEdgeVerts.push(ax, ga, az, ax, ta, az);
    }
    const wallGeo = new THREE.BufferGeometry();
    wallGeo.setAttribute('position', new THREE.Float32BufferAttribute(wallVerts, 3));
    wallGeo.computeVertexNormals();
    const wallMat = new THREE.MeshPhysicalMaterial({
      color: breachEdgeIndex >= 0 ? '#E8744F' : '#E8C9DC',
      transparent: true,
      opacity: 0.16,
      roughness: 0.35,
      metalness: 0.05,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    groups.hirb.add(new THREE.Mesh(wallGeo, wallMat));

    // 2) Frosted receding daylight canopy mesh on clipped parcel grid
    const roofVerts = [];
    const ridgeWire = [];
    const stride = env.nx + 1;
    const getPos = (i, j) => {
      const h = env.heights[j * stride + i];
      if (!Number.isFinite(h)) return null;
      const x = env.minX + i * env.dx;
      const z = env.minZ + j * env.dz;
      return [x, sampleTerrainHeight(currentTerrain, x, z) + h, z, h];
    };
    for (let j = 0; j < env.nz; j++) {
      for (let i = 0; i < env.nx; i++) {
        const p00 = getPos(i, j);
        const p10 = getPos(i + 1, j);
        const p11 = getPos(i + 1, j + 1);
        const p01 = getPos(i, j + 1);
        if (p00 && p10 && p11) roofVerts.push(p00[0], p00[1], p00[2], p10[0], p10[1], p10[2], p11[0], p11[1], p11[2]);
        if (p00 && p11 && p01) roofVerts.push(p00[0], p00[1], p00[2], p11[0], p11[1], p11[2], p01[0], p01[1], p01[2]);
        // Architectural wireframe contour along every 3rd grid line for crisp glass-prism legibility
        if (j % 3 === 0 && p00 && p10) ridgeWire.push(p00[0], p00[1] + 0.03, p00[2], p10[0], p10[1] + 0.03, p10[2]);
        if (i % 3 === 0 && p00 && p01) ridgeWire.push(p00[0], p00[1] + 0.03, p00[2], p01[0], p01[1] + 0.03, p01[2]);
      }
    }
    if (roofVerts.length) {
      const roofGeo = new THREE.BufferGeometry();
      roofGeo.setAttribute('position', new THREE.Float32BufferAttribute(roofVerts, 3));
      roofGeo.computeVertexNormals();
      const roofMat = new THREE.MeshPhysicalMaterial({
        color: breachEdgeIndex >= 0 ? '#F09474' : '#F9F6F2',
        emissive: breachEdgeIndex >= 0 ? '#6E2614' : '#3C2034',
        emissiveIntensity: 0.25,
        transparent: true,
        opacity: 0.22,
        roughness: 0.28,
        metalness: 0.08,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      groups.hirb.add(new THREE.Mesh(roofGeo, roofMat));
    }

    const edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute([...topEdgeVerts, ...ridgeWire], 3));
    const edgeMat = new THREE.LineBasicMaterial({
      color: breachEdgeIndex >= 0 ? '#FF9A7A' : '#E8C9DC',
      transparent: true,
      opacity: 0.56,
    });
    groups.hirb.add(new THREE.LineSegments(edgeGeo, edgeMat));

    // Highlight worst breaching boundary edge specifically if breaching
    if (breachEdgeIndex >= 0 && parcel.edges?.[breachEdgeIndex]) {
      const e = parcel.edges[breachEdgeIndex];
      const ga = sampleTerrainHeight(currentTerrain, e.a[0], e.a[1]);
      const gb = sampleTerrainHeight(currentTerrain, e.b[0], e.b[1]);
      const bGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(e.a[0], ga + 0.18, e.a[1]),
        new THREE.Vector3(e.b[0], gb + 0.18, e.b[1]),
        new THREE.Vector3(e.b[0], gb + rules.baseHeightM, e.b[1]),
        new THREE.Vector3(e.a[0], ga + rules.baseHeightM, e.a[1]),
        new THREE.Vector3(e.a[0], ga + 0.18, e.a[1]),
      ]);
      const bMat = new THREE.LineBasicMaterial({ color: '#FF6B4A', transparent: true, opacity: 0.98 });
      groups.hirb.add(new THREE.Line(bGeo, bMat));
    }
  }

  // LINZ Neighbour & Existing Building Footprints
  function setBuildings(buildings) {
    clearGroup(groups.buildings);
    if (!buildings?.length) return;
    const neighbourMat = new THREE.MeshStandardMaterial({ color: '#3E2E3B', roughness: 0.84, metalness: 0.06 });
    const onSiteMat = new THREE.MeshStandardMaterial({ color: '#644A59', roughness: 0.72, metalness: 0.08, transparent: true, opacity: 0.52 });
    const edgeMat = new THREE.LineBasicMaterial({ color: '#D9BACB', transparent: true, opacity: 0.24 });

    for (const b of buildings) {
      const shape = new THREE.Shape();
      b.ring.forEach(([x, z], idx) => {
        if (idx === 0) shape.moveTo(x, -z);
        else shape.lineTo(x, -z);
      });
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: b.heightM, bevelEnabled: false });
      geo.rotateX(-Math.PI / 2);
      const baseY = sampleTerrainHeight(currentTerrain, b.centroid[0], b.centroid[1]) - 0.4;
      const mesh = new THREE.Mesh(geo, b.onSite ? onSiteMat : neighbourMat);
      mesh.position.y = baseY;
      mesh.castShadow = !b.onSite;
      mesh.receiveShadow = true;
      groups.buildings.add(mesh);

      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 22), edgeMat);
      edges.position.y = baseY;
      groups.buildings.add(edges);
    }
  }

  // Proposed Architectural Pavilion Massing + Breach Highlight + IoT Sensor Pins
  const iotPinRefs = [];

  function setPavilion(massing, compliance, iot) {
    clearGroup(groups.pavilion);
    clearGroup(groups.iot);
    iotPinRefs.length = 0;
    if (!massing) return;

    const baseY = sampleTerrainHeight(currentTerrain, massing.cx, massing.cz);
    const pav = new THREE.Group();
    pav.position.set(massing.cx, baseY, massing.cz);
    pav.rotation.y = -((massing.rotDeg || 0) * Math.PI) / 180;

    const isBreach = compliance && !compliance.compliant;

    // Ground plinth / concrete datum slab
    const plinthGeo = new THREE.BoxGeometry(massing.width + 1.2, 0.45, massing.depth + 1.2);
    const plinthMat = new THREE.MeshStandardMaterial({ color: '#D6CFC7', roughness: 0.82, metalness: 0.04 });
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.position.y = 0.2;
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    pav.add(plinth);

    // Main architectural pavilion body (cedar-warm ivory timber or warm breach coral)
    const bodyH = Math.max(2.6, massing.height - 0.55);
    const bodyGeo = new THREE.BoxGeometry(massing.width, bodyH, massing.depth);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: isBreach ? '#E8744F' : '#E7DCD3',
      emissive: isBreach ? '#5C1B0D' : '#241421',
      emissiveIntensity: isBreach ? 0.38 : 0.08,
      roughness: 0.56,
      metalness: 0.06,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.42 + bodyH / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    pav.add(body);

    // Architectural bronze glazing ribbon wrap
    const glassGeo = new THREE.BoxGeometry(massing.width + 0.06, Math.min(2.1, bodyH * 0.48), massing.depth + 0.06);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: '#2B222A',
      emissive: '#FFE4C2',
      emissiveIntensity: 0.18,
      roughness: 0.14,
      metalness: 0.45,
      transparent: true,
      opacity: 0.78,
    });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.y = 0.42 + bodyH * 0.44;
    pav.add(glass);

    // Cantilevered dark standing-seam roof tray + solar PV array visual on northern roof face
    const roofGeo = new THREE.BoxGeometry(massing.width + 1.5, 0.26, massing.depth + 1.5);
    const roofMat = new THREE.MeshStandardMaterial({
      color: isBreach ? '#B03A24' : '#2C262B',
      roughness: 0.42,
      metalness: 0.48,
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = massing.height - 0.05;
    roof.castShadow = true;
    pav.add(roof);

    // Rooftop solar panel array strips
    const pvW = massing.width * 0.62, pvD = massing.depth * 0.42;
    const pvGeo = new THREE.BoxGeometry(pvW, 0.06, pvD);
    const pvMat = new THREE.MeshStandardMaterial({ color: '#1F2A38', roughness: 0.22, metalness: 0.72 });
    const pvMesh = new THREE.Mesh(pvGeo, pvMat);
    pvMesh.position.set(0, massing.height + 0.12, -massing.depth * 0.16);
    pav.add(pvMesh);

    // Crisp architectural wireframe outline
    const frameEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(bodyGeo),
      new THREE.LineBasicMaterial({ color: isBreach ? '#FFD2C2' : '#FFFDFB', transparent: true, opacity: 0.48 }),
    );
    frameEdges.position.copy(body.position);
    pav.add(frameEdges);

    groups.pavilion.add(pav);

    // Corner breach indicator beacons if any corner violates HIRB
    if (compliance?.cornerChecks) {
      for (const c of compliance.cornerChecks) {
        if (c.breachM > 0.01) {
          const pin = new THREE.Mesh(
            new THREE.SphereGeometry(0.42, 16, 12),
            new THREE.MeshBasicMaterial({ color: '#FF6B4A' }),
          );
          pin.position.set(c.x, baseY + massing.height + 0.35, c.z);
          groups.pavilion.add(pin);
        }
      }
    }

    // Floating IoT Sensor Pins above pavilion
    if (iot) {
      const pins = [
        { label: `${iot.indoorTempC}°C · ${iot.co2Ppm}ppm`, x: massing.cx, z: massing.cz, y: baseY + massing.height + 3.2, color: iot.source === 'simulated' ? '#D9BACB' : '#6CD4A0' },
        { label: `PV ${iot.rooftopSolarKw} kW`, x: massing.cx + massing.width * 0.35, z: massing.cz - massing.depth * 0.3, y: baseY + massing.height + 2.0, color: '#F2C97D' },
        { label: `Tank ${iot.tankPct}%`, x: massing.cx - massing.width * 0.42, z: massing.cz + massing.depth * 0.35, y: baseY + 2.6, color: '#8FC3D4' },
      ];
      for (const p of pins) {
        const stemGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(p.x, baseY + massing.height * 0.65, p.z),
          new THREE.Vector3(p.x, p.y - 0.55, p.z),
        ]);
        groups.iot.add(new THREE.Line(stemGeo, new THREE.LineBasicMaterial({ color: p.color, transparent: true, opacity: 0.45 })));
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), new THREE.MeshBasicMaterial({ color: p.color }));
        dot.position.set(p.x, p.y - 0.55, p.z);
        groups.iot.add(dot);
        const sp = makeLabelSprite(p.label, p.color, 'rgba(24, 11, 24, 0.86)', 6.8);
        sp.position.set(p.x, p.y + 0.35, p.z);
        groups.iot.add(sp);
        iotPinRefs.push({ sprite: sp, baseY: p.y + 0.35, phase: iotPinRefs.length * 1.7 });
      }
    }
  }

  // Animated 3D Wind Streamlines oriented & scaled by live wind vector
  let windState = computeWindVector(225, 18);
  const windStreamlines = [];

  function rebuildWindStreamlines(windVec) {
    windState = windVec || computeWindVector(225, 18);
    clearGroup(groups.wind);
    windStreamlines.length = 0;

    const count = 36;
    const speedMag = Math.max(0.8, windState.speedMs);
    const dirX = windState.speedMs > 0.05 ? windState.vx / windState.speedMs : 0.707;
    const dirZ = windState.speedMs > 0.05 ? windState.vz / windState.speedMs : -0.707;
    const perpX = -dirZ, perpZ = dirX;
    const segLen = clamp(6 + windState.kmh * 0.24, 6, 18);

    for (let i = 0; i < count; i++) {
      const lane = ((i / count) - 0.5) * 96 + (Math.sin(i * 4.3) * 3.2);
      const phase = ((i * 23.7) % 100) / 100;
      const altOffset = 3.2 + (i % 5) * 2.8;
      const ptsCount = 10;
      const positions = new Float32Array(ptsCount * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({
        color: i % 3 === 0 ? '#F9F6F2' : '#D9BACB',
        transparent: true,
        opacity: clamp(0.24 + (windState.kmh / 65) * 0.42, 0.22, 0.68),
      });
      const line = new THREE.Line(geo, mat);
      groups.wind.add(line);
      windStreamlines.push({ line, geo, positions, ptsCount, lane, phase, altOffset, segLen, dirX, dirZ, perpX, perpZ, speedMag });
    }
    updateWindStreamlines(0);
  }

  function updateWindStreamlines(sec) {
    const span = 104;
    for (const s of windStreamlines) {
      const flowSpeed = clamp(s.speedMag * 1.45, 2.5, 22);
      const travel = ((s.phase * span + sec * flowSpeed) % span) - span / 2;
      for (let k = 0; k < s.ptsCount; k++) {
        const frac = k / (s.ptsCount - 1);
        const along = travel - (1 - frac) * s.segLen;
        const wave = Math.sin(along * 0.09 + s.lane * 0.15 + sec * 1.4) * 0.85;
        const x = s.dirX * along + s.perpX * (s.lane + wave);
        const z = s.dirZ * along + s.perpZ * (s.lane + wave);
        const gy = sampleTerrainHeight(currentTerrain, x, z);
        const y = gy + s.altOffset + Math.sin(frac * Math.PI) * 0.7;
        s.positions[k * 3] = x;
        s.positions[k * 3 + 1] = y;
        s.positions[k * 3 + 2] = z;
      }
      s.geo.attributes.position.needsUpdate = true;
    }
  }

  // 3D Sun-Path Arc + Active Solar Orb
  function setSunArc(latDeg, hour) {
    clearGroup(groups.sun);
    const nowDay = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000) || 330;
    const arcPts = [];
    for (let h = 5.5; h <= 21.0; h += 0.35) {
      const sp = computeSolarPosition(latDeg, nowDay, h, 78);
      if (sp.y >= -2) arcPts.push(new THREE.Vector3(sp.x, Math.max(0.2, sp.y), sp.z));
    }
    if (arcPts.length >= 2) {
      const arcGeo = new THREE.BufferGeometry().setFromPoints(arcPts);
      const arcMat = new THREE.LineDashedMaterial({ color: '#F2C97D', dashSize: 2.2, gapSize: 1.4, transparent: true, opacity: 0.65 });
      const arcLine = new THREE.Line(arcGeo, arcMat);
      arcLine.computeLineDistances();
      groups.sun.add(arcLine);
    }
    const cur = computeSolarPosition(latDeg, nowDay, hour, 78);
    const sunY = Math.max(4, cur.y);
    sunLight.position.set(cur.x, sunY, cur.z);
    const daylight = clamp(cur.altitudeDeg / 45, 0.15, 1);
    sunLight.intensity = cur.isDay ? 0.9 + daylight * 1.65 : 0.35;
    sunLight.color.set(cur.altitudeDeg < 14 ? '#FFC894' : '#FFF4E2');

    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(2.4, 20, 16),
      new THREE.MeshBasicMaterial({ color: cur.isDay ? '#FFE3A8' : '#D9BACB' }),
    );
    orb.position.set(cur.x, Math.max(1.2, cur.y), cur.z);
    groups.sun.add(orb);
    return cur;
  }

  // Smooth Spherical Orbit + Pan + Zoom Controller (no bare 'three' OrbitControls dependency)
  const camTarget = new THREE.Vector3(0, 2, 0);
  const camGoal = { yaw: 0.68, pitch: 0.58, dist: 64, tx: 0, ty: 2, tz: 0 };
  const camCur = { ...camGoal };

  let dragMode = null, lastX = 0, lastY = 0;
  const activePointers = new Map();
  let pinchStartDist = 0, pinchStartCamDist = 64;

  const onPointerDown = (e) => {
    canvas.setPointerCapture?.(e.pointerId);
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePointers.size === 2) {
      const pts = [...activePointers.values()];
      pinchStartDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchStartCamDist = camGoal.dist;
      dragMode = 'pinch';
    } else {
      dragMode = e.button === 2 || e.shiftKey ? 'pan' : 'orbit';
      lastX = e.clientX;
      lastY = e.clientY;
    }
  };

  const onPointerMove = (e) => {
    if (!activePointers.has(e.pointerId)) return;
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (dragMode === 'pinch' && activePointers.size === 2) {
      const pts = [...activePointers.values()];
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (pinchStartDist > 8) camGoal.dist = clamp(pinchStartCamDist * (pinchStartDist / d), 16, 180);
      return;
    }
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    if (dragMode === 'orbit') {
      camGoal.yaw -= dx * 0.0068;
      camGoal.pitch = clamp(camGoal.pitch + dy * 0.0058, 0.12, 1.48);
    } else if (dragMode === 'pan') {
      const panScale = camGoal.dist * 0.0014;
      const rightX = Math.cos(camGoal.yaw), rightZ = -Math.sin(camGoal.yaw);
      const fwdX = -Math.sin(camGoal.yaw), fwdZ = -Math.cos(camGoal.yaw);
      camGoal.tx -= (rightX * dx - fwdX * dy) * panScale;
      camGoal.tz -= (rightZ * dx - fwdZ * dy) * panScale;
    }
  };

  const onPointerUp = (e) => {
    activePointers.delete(e.pointerId);
    if (activePointers.size === 0) dragMode = null;
  };

  const onWheel = (e) => {
    e.preventDefault();
    camGoal.dist = clamp(camGoal.dist * (1 + Math.sign(e.deltaY) * 0.09), 16, 180);
  };

  const onContextMenu = (e) => e.preventDefault();

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('contextmenu', onContextMenu);

  const resize = () => {
    const parent = canvas.parentElement;
    if (!parent) return;
    const w = Math.max(1, parent.clientWidth);
    const h = Math.max(1, parent.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();

  let ro = null;
  if (typeof ResizeObserver !== 'undefined' && canvas.parentElement) {
    ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement);
  }
  window.addEventListener('resize', resize);

  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let stopped = false;
  let raf = 0;
  let tPrev = performance.now();

  const tick = (now) => {
    if (stopped) return;
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - tPrev) / 1000);
    tPrev = now;
    const k = reduceMotion ? 1 : 1 - Math.exp(-dt * 6.5);
    camCur.yaw += (camGoal.yaw - camCur.yaw) * k;
    camCur.pitch += (camGoal.pitch - camCur.pitch) * k;
    camCur.dist += (camGoal.dist - camCur.dist) * k;
    camCur.tx += (camGoal.tx - camCur.tx) * k;
    camCur.ty += (camGoal.ty - camCur.ty) * k;
    camCur.tz += (camGoal.tz - camCur.tz) * k;

    const rHoriz = camCur.dist * Math.cos(camCur.pitch);
    camera.position.set(
      camCur.tx + Math.sin(camCur.yaw) * rHoriz,
      camCur.ty + Math.sin(camCur.pitch) * camCur.dist,
      camCur.tz + Math.cos(camCur.yaw) * rHoriz,
    );
    camTarget.set(camCur.tx, camCur.ty, camCur.tz);
    camera.lookAt(camTarget);

    if (!reduceMotion) {
      const sec = now * 0.001;
      if (groups.wind.visible) updateWindStreamlines(sec);
      if (groups.iot.visible) {
        for (const p of iotPinRefs) p.sprite.position.y = p.baseY + Math.sin(sec * 1.8 + p.phase) * 0.22;
      }
    }
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(tick);

  return {
    setTerrain,
    setParcelAndHirb,
    setBuildings,
    setPavilion,
    rebuildWindStreamlines,
    setSunArc,
    setLayerVisibility(layers) {
      groups.contours.visible = !!layers.contours;
      groups.hirb.visible = !!layers.hirb;
      groups.pavilion.visible = !!layers.pavilion;
      groups.wind.visible = !!layers.wind;
      groups.sun.visible = !!layers.sun;
      groups.buildings.visible = !!layers.buildings;
      groups.iot.visible = !!layers.iot;
    },
    frameParcel(parcel, shotId = 'iso') {
      const shot = CAMERA_SHOTS.find((s) => s.id === shotId) || CAMERA_SHOTS[0];
      const cx = parcel?.centroid?.[0] ?? 0;
      const cz = parcel?.centroid?.[1] ?? 0;
      const cy = sampleTerrainHeight(currentTerrain, cx, cz) + 2.5;
      const span = parcel ? Math.max(24, Math.hypot(parcel.bounds.width, parcel.bounds.depth)) : 36;
      camGoal.tx = cx;
      camGoal.ty = cy;
      camGoal.tz = cz;
      camGoal.yaw = shot.yaw;
      camGoal.pitch = shot.pitch;
      camGoal.dist = clamp(span * shot.distScale, 28, 125);
    },
    getTerrain() { return currentTerrain; },
    dispose() {
      stopped = true;
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('contextmenu', onContextMenu);
      Object.values(groups).forEach(clearGroup);
      renderer.dispose();
    },
  };
}

// ---- Main UI Mount & Live Feed Orchestrator -----------------------------------------------------------------------

export async function mountLiveEnvelope(el, ctx = {}, opts = {}) {
  ensureLiveEnvelopeCss();

  // Determine initial site from route params, active project, or Takapuna preset
  let initialSite = { ...NZ_SITE_PRESETS[0] };
  if (Array.isArray(opts.rest) && opts.rest.length) {
    const coordMatch = String(opts.rest[0]).match(/^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/);
    if (coordMatch) {
      const lat = Number(coordMatch[1]), lon = Number(coordMatch[2]);
      if (lat <= -34 && lat >= -47.5 && lon >= 166 && lon <= 179) {
        initialSite = { id: 'custom', short: 'Site', name: `${lat.toFixed(4)}, ${lon.toFixed(4)}`, lat, lon, place: resolvePlaceKey(lat, lon), note: 'Selected NZ coordinates' };
      }
    }
  } else if (ctx?.project?.site?.lat != null && ctx?.project?.site?.lon != null) {
    const lat = Number(ctx.project.site.lat), lon = Number(ctx.project.site.lon);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      const label = ctx.project.site.address?.suburb
        ? `${ctx.project.site.address.suburb}${ctx.project.site.address.town ? `, ${ctx.project.site.address.town}` : ''}`
        : (ctx.project.name || 'Project Site');
      initialSite = { id: 'project', short: 'Project', name: label, lat, lon, place: resolvePlaceKey(lat, lon), note: 'Loaded from project site coordinates' };
    }
  }

  const state = {
    site: initialSite,
    shot: 'iso',
    solarHour: round(currentNzHour(), 2),
    layers: { contours: true, hirb: true, pavilion: true, wind: true, sun: true, buildings: true, iot: true },
    rules: resolveHirbRules('Mixed Housing Suburban Zone'),
    massing: { cx: 0, cz: 0, width: 11.5, depth: 15.0, height: 6.4, rotDeg: 0 },
    parcel: buildIllustrativeParcel(20, 30),
    buildings: [],
    terrain: synthesizeTerrainGrid(72, initialSite.lat),
    siteFacts: null,
    climate: { weather: null, air: null, power: null, genmix: null },
    wind: computeWindVector(225, 18),
    solarEst: estimateRooftopSolar(172, 540, 28, true),
    iot: createSimulatedIotTelemetry({ outdoorTempC: 18.2, outdoorHumidityPct: 68, windKmh: 18, rooftopSolarKw: 3.1 }),
    iotConn: { mode: 'simulated', url: '', ws: null, timer: null, statusText: 'Simulated Studio IoT (connect your own HTTP JSON or WebSocket below)' },
    truth: { parcel: 'loading', lidar: 'loading', weather: 'loading', grid: 'loading' },
  };

  el.innerHTML = `
    <section class="le-root ${opts.mode === 'tab' ? 'is-tab' : 'is-route'}" aria-label="Live Site, HIRB Envelope and IoT Digital Twin">
      <div class="le-stage-wrap">
        <div class="le-canvas-host" data-le-canvas-host>
          <canvas class="le-canvas" data-le-canvas aria-label="3D architectural site, HIRB daylight envelope, terrain contours and wind flow twin"></canvas>
          <div class="le-scrim" aria-hidden="true"></div>
        </div>

        <header class="le-topbar">
          <div class="le-brand-block">
            <div class="le-eyebrow">
              <span class="le-eyebrow-word">assembl<span class="le-dot">.</span></span>
              <span>LIVE SITE · HIRB ENVELOPE · IoT TWIN</span>
            </div>
            <h1 class="le-title" data-le-site-title>${esc(state.site.name)}</h1>
            <div class="le-truth-row" data-le-truth-row></div>
          </div>

          <div class="le-search-bar">
            <div class="le-search-wrap">
              <input class="le-search-input" type="search" data-le-search autocomplete="off"
                placeholder="Search any NZ address (LINZ)…" aria-label="Search New Zealand street address" />
              <button class="le-search-clear" type="button" data-le-search-clear hidden aria-label="Clear search">×</button>
              <ul class="le-suggestions" data-le-suggestions hidden role="listbox"></ul>
            </div>
            <div class="le-presets" role="group" aria-label="Aotearoa site presets">
              ${NZ_SITE_PRESETS.map((p) => `<button type="button" class="le-pill is-compact" data-le-preset="${p.id}" aria-pressed="${p.id === state.site.id}">${esc(p.short)}</button>`).join('')}
            </div>
          </div>
        </header>

        <div class="le-hud-grid">
          <aside class="le-dock le-dock-left" aria-label="Envelope and massing controls">
            <div class="le-card">
              <div class="le-card-head">
                <h2 class="le-card-title">3D Twin Layers</h2>
                <span class="le-card-sub" data-le-lidar-note>1 m LINZ LiDAR</span>
              </div>
              <div class="le-toggle-grid">
                ${[
                  ['contours', '1 m Contours'],
                  ['hirb', 'HIRB Prism'],
                  ['pavilion', 'Pavilion'],
                  ['wind', 'Wind Flow'],
                  ['sun', 'Sun Arc'],
                  ['buildings', 'Neighbours'],
                  ['iot', 'IoT Pins'],
                ].map(([k, lbl]) => `<button type="button" class="le-pill is-compact" data-le-layer="${k}" aria-pressed="true">${lbl}</button>`).join('')}
              </div>
            </div>

            <div class="le-card">
              <div class="le-card-head">
                <h2 class="le-card-title">HIRB Daylight Envelope</h2>
                <span class="le-chip is-sim" data-le-hirb-zone>Indicative</span>
              </div>
              <div class="le-compliance" data-le-compliance>
                <div>
                  <div class="le-compliance-label" data-le-comp-label>Checking HIRB</div>
                  <div class="le-card-sub" data-le-comp-detail>Sampling parcel boundaries…</div>
                </div>
                <div class="le-compliance-val" data-le-comp-val>—</div>
              </div>
              <div class="le-toggle-grid" style="margin-bottom:10px">
                ${HIRB_PRESETS.map((hp) => `<button type="button" class="le-pill is-compact" data-le-hirb-preset="${hp.id}">${hp.label}</button>`).join('')}
              </div>
              <div class="le-slider-group">
                <div class="le-slider-row">
                  <label for="le-base-h">Boundary Base Height</label>
                  <output data-le-out="baseHeightM">${state.rules.baseHeightM.toFixed(1)} m</output>
                  <input id="le-base-h" type="range" min="2.0" max="8.0" step="0.5" value="${state.rules.baseHeightM}" data-le-rule="baseHeightM" />
                </div>
                <div class="le-slider-row">
                  <label for="le-angle">Recession Angle</label>
                  <output data-le-out="angleDeg">${state.rules.angleDeg}°</output>
                  <input id="le-angle" type="range" min="30" max="65" step="1" value="${state.rules.angleDeg}" data-le-rule="angleDeg" />
                </div>
                <div class="le-slider-row">
                  <label for="le-max-h">Max Envelope Height</label>
                  <output data-le-out="maxHeightM">${state.rules.maxHeightM.toFixed(1)} m</output>
                  <input id="le-max-h" type="range" min="6.0" max="18.0" step="0.5" value="${state.rules.maxHeightM}" data-le-rule="maxHeightM" />
                </div>
              </div>
            </div>

            <div class="le-card">
              <div class="le-card-head">
                <h2 class="le-card-title">Proposed Pavilion</h2>
                <span class="le-card-sub" data-le-massing-meta>—</span>
              </div>
              <div class="le-slider-group">
                <div class="le-slider-row">
                  <label for="le-mw">Width (E–W)</label>
                  <output data-le-out="width">${state.massing.width.toFixed(1)} m</output>
                  <input id="le-mw" type="range" min="6" max="22" step="0.5" value="${state.massing.width}" data-le-mass="width" />
                </div>
                <div class="le-slider-row">
                  <label for="le-md">Depth (N–S)</label>
                  <output data-le-out="depth">${state.massing.depth.toFixed(1)} m</output>
                  <input id="le-md" type="range" min="6" max="24" step="0.5" value="${state.massing.depth}" data-le-mass="depth" />
                </div>
                <div class="le-slider-row">
                  <label for="le-mh">Ridge Height</label>
                  <output data-le-out="height">${state.massing.height.toFixed(1)} m</output>
                  <input id="le-mh" type="range" min="3.2" max="14.0" step="0.2" value="${state.massing.height}" data-le-mass="height" />
                </div>
                <div class="le-slider-row">
                  <label for="le-mr">Orientation</label>
                  <output data-le-out="rotDeg">${state.massing.rotDeg}°</output>
                  <input id="le-mr" type="range" min="-90" max="90" step="5" value="${state.massing.rotDeg}" data-le-mass="rotDeg" />
                </div>
              </div>
            </div>
          </aside>

          <div class="le-status-pill" data-le-status hidden></div>

          <aside class="le-dock le-dock-right" aria-label="Live NZ data and indoor IoT telemetry">
            <div class="le-card">
              <div class="le-card-head">
                <h2 class="le-card-title">Site &amp; Planning</h2>
                <span class="le-chip is-live" data-le-site-badge><span class="le-chip-dot"></span>LIVE</span>
              </div>
              <div class="le-kv-grid" data-le-site-kv></div>
              <div class="le-flags" data-le-hazard-flags></div>
            </div>

            <div class="le-card">
              <div class="le-card-head">
                <h2 class="le-card-title">Climate, Solar &amp; NZ Grid</h2>
                <span class="le-chip is-live" data-le-grid-badge><span class="le-chip-dot"></span>LIVE</span>
              </div>
              <div class="le-kv-grid" data-le-climate-kv></div>
              <div class="le-genmix-bar" data-le-genmix-bar aria-label="NZ electricity generation mix"></div>
              <div class="le-genmix-legend" data-le-genmix-legend></div>
            </div>

            <div class="le-card">
              <div class="le-card-head">
                <h2 class="le-card-title">Indoor Studio IoT</h2>
                <span class="le-chip is-sim" data-le-iot-badge><span class="le-chip-dot"></span>SIMULATED</span>
              </div>
              <div class="le-kv-grid" data-le-iot-kv></div>
              <details class="le-iot-connect">
                <summary class="le-iot-summary">
                  <span>Connect Live IoT Endpoint</span>
                  <span aria-hidden="true">+</span>
                </summary>
                <form class="le-iot-form" data-le-iot-form>
                  <input class="le-iot-input" type="url" data-le-iot-url
                    placeholder="https://…/telemetry.json or wss://…/iot" aria-label="IoT JSON polling URL or WebSocket endpoint" />
                  <div class="le-iot-actions">
                    <button type="submit" class="le-pill is-compact is-active" data-le-iot-connect>Connect</button>
                    <button type="button" class="le-pill is-compact" data-le-iot-disconnect hidden>Disconnect</button>
                  </div>
                  <p class="le-iot-hint" data-le-iot-status>${esc(state.iotConn.statusText)}</p>
                  <p class="le-iot-hint">Accepts JSON keys: indoorTempC, humidityPct, co2Ppm, tankPct, rooftopSolarKw, studioLoadKw</p>
                </form>
              </details>
            </div>
          </aside>
        </div>

        <footer class="le-bottombar">
          <div class="le-cam-strip" role="group" aria-label="Camera views">
            ${CAMERA_SHOTS.map((s) => `<button type="button" class="le-pill is-compact" data-le-shot="${s.id}" aria-pressed="${s.id === state.shot}">${s.label}</button>`).join('')}
          </div>

          <div class="le-sun-strip">
            <label for="le-sun-range">NZ Sun</label>
            <input id="le-sun-range" type="range" min="6" max="20.5" step="0.25" value="${state.solarHour}" data-le-sun-slider />
            <output data-le-sun-out>${fmtHour(state.solarHour)}</output>
            <button type="button" class="le-pill is-compact" data-le-sun-now>Now</button>
          </div>

          <div class="le-attribution">
            LINZ CC BY 4.0 · Auckland Council Open Data · Open-Meteo · EMI · Indicative envelope study, not a consent assessment.
          </div>
        </footer>
      </div>
    </section>
  `;

  const root = el.querySelector('.le-root');
  const canvasHost = root.querySelector('[data-le-canvas-host]');
  const canvas = root.querySelector('[data-le-canvas]');
  const statusPill = root.querySelector('[data-le-status]');

  let disposed = false;
  let fetchAbort = null;
  let searchAbort = null;
  let searchTimer = null;
  let simTimer = null;
  let sceneApi = null;

  const setStatus = (msg) => {
    if (!statusPill) return;
    statusPill.textContent = msg || '';
    statusPill.hidden = !msg;
  };

  // Mount Three.js 3D Twin (graceful fallback if WebGL is unavailable)
  if (webglSupported()) {
    try {
      sceneApi = await createTwinScene(canvas);
      if (disposed) { sceneApi.dispose(); return () => {}; }
    } catch {
      sceneApi = null;
    }
  }
  if (!sceneApi && canvasHost) {
    canvasHost.innerHTML = `<div class="le-webgl-fallback"><div><p class="le-eyebrow">WEBGL UNAVAILABLE</p><p class="le-title">Live NZ Site, HIRB &amp; IoT Telemetry Active</p><p class="le-card-sub">All live LINZ, weather, grid and HIRB calculations remain active in the panels.</p></div></div>`;
  }

  // ---- Render UI readouts & sync 3D scene -------------------------------------------------------------------------

  function renderTruthChips() {
    const host = root.querySelector('[data-le-truth-row]');
    if (!host) return;
    const chip = (label, status) => {
      const cls = status === 'live' ? 'is-live' : status === 'sim' ? 'is-sim' : status === 'warn' ? 'is-warn' : '';
      return `<span class="le-chip ${cls}"><span class="le-chip-dot"></span>${esc(label)}</span>`;
    };
    const iotLabel = state.iot.source === 'simulated' ? 'Studio IoT · Simulated' : `${state.iot.sourceLabel} · Live`;
    host.innerHTML = [
      chip(`LINZ Parcel ${state.truth.parcel === 'live' ? '· Live' : state.truth.parcel === 'loading' ? '· …' : '· Illustrative'}`, state.truth.parcel === 'live' ? 'live' : 'sim'),
      chip(`1 m LiDAR ${state.truth.lidar === 'live' ? '· Live' : state.truth.lidar === 'loading' ? '· …' : '· Illustrative'}`, state.truth.lidar === 'live' ? 'live' : 'sim'),
      chip(`Weather & Grid ${state.truth.weather === 'live' ? '· Live' : '· …'}`, state.truth.weather === 'live' ? 'live' : 'sim'),
      chip(iotLabel, state.iot.source === 'simulated' ? 'sim' : 'live'),
    ].join('');
  }

  function renderComplianceAndPavilion() {
    const sampleFn = (x, z) => sampleTerrainHeight(state.terrain, x, z);
    const comp = evaluateMassingCompliance(state.massing, state.parcel, state.rules, sampleFn);

    const box = root.querySelector('[data-le-compliance]');
    const lbl = root.querySelector('[data-le-comp-label]');
    const det = root.querySelector('[data-le-comp-detail]');
    const val = root.querySelector('[data-le-comp-val]');
    const meta = root.querySelector('[data-le-massing-meta]');
    const zoneBadge = root.querySelector('[data-le-hirb-zone]');

    if (box && lbl && det && val) {
      box.classList.toggle('is-breach', !comp.compliant);
      lbl.textContent = comp.compliant ? 'HIRB Compliant' : 'HIRB Envelope Breach';
      det.textContent = comp.compliant
        ? `Coverage ${comp.siteCoveragePct}% · ${comp.storeys}L (${comp.gfaM2} m² GFA)`
        : `Breaches boundary plane #${comp.worstEdgeIndex + 1} · adjust height or footprint`;
      val.textContent = comp.compliant
        ? `+${Math.max(0, comp.minClearanceM).toFixed(2)} m clear`
        : `+${comp.maxBreachM.toFixed(2)} m over`;
    }
    if (meta) meta.textContent = `${comp.footprintM2} m² footprint · ${comp.siteCoveragePct}%`;
    if (zoneBadge) zoneBadge.textContent = `${state.rules.baseHeightM}m + ${state.rules.angleDeg}°`;

    // Recompute rooftop solar from current pavilion roof area
    const wv = state.climate.weather?.values;
    const sw = state.siteFacts?.weather?.values;
    state.solarEst = estimateRooftopSolar(
      state.massing.width * state.massing.depth,
      wv?.solarWm2 ?? 520,
      sw?.cloudPct ?? wv?.cloudPct ?? 30,
      sw?.isDay ?? wv?.isDay ?? true,
    );

    sceneApi?.setParcelAndHirb(state.parcel, state.rules, comp.compliant ? -1 : comp.worstEdgeIndex);
    sceneApi?.setPavilion(state.massing, comp, state.iot);
    return comp;
  }

  function renderSitePanel() {
    const kv = root.querySelector('[data-le-site-kv]');
    const flagsEl = root.querySelector('[data-le-hazard-flags]');
    const badge = root.querySelector('[data-le-site-badge]');
    const f = state.siteFacts || {};
    const parcelArea = f.parcel?.values?.calcAreaM2 ?? state.parcel?.areaM2 ?? null;
    const zoneVal = f.zone?.value || state.rules.zoneLabel;
    const overlayHits = f.overlays?.values?.hits || [];
    const lidarElev = state.terrain.live ? `${round(state.terrain.baseElevM, 1)} m NZVD16` : 'Illustrative';

    if (badge) {
      const isLive = state.truth.parcel === 'live';
      badge.className = `le-chip ${isLive ? 'is-live' : 'is-sim'}`;
      badge.innerHTML = `<span class="le-chip-dot"></span>${isLive ? 'LIVE' : 'ILLUSTRATIVE'}`;
    }

    if (kv) {
      kv.innerHTML = `
        <div class="le-kv">
          <span class="le-kv-k">LINZ Parcel</span>
          <span class="le-kv-v is-mono">${parcelArea ? `${Math.round(parcelArea).toLocaleString('en-NZ')} m²` : '—'}</span>
          <span class="le-kv-note">${esc(f.parcel?.values?.landDistrict || 'NZ Primary Parcel')}</span>
        </div>
        <div class="le-kv">
          <span class="le-kv-k">1 m LiDAR Datum</span>
          <span class="le-kv-v is-mono">${esc(lidarElev)}</span>
          <span class="le-kv-note">${state.buildings.length} LINZ buildings</span>
        </div>
        <div class="le-kv" style="grid-column: 1 / -1">
          <span class="le-kv-k">Planning Zone</span>
          <span class="le-kv-v">${esc(zoneVal)}</span>
          <span class="le-kv-note">${overlayHits.length ? `${overlayHits.length} AUP overlay hit${overlayHits.length > 1 ? 's' : ''}` : 'No mapped AUP overlays hit at point'}</span>
        </div>
      `;
    }

    if (flagsEl) {
      const pills = [];
      const addFlag = (label, hit) => pills.push(`<span class="le-flag ${hit ? 'is-hit' : 'is-clear'}">${hit ? '▲ ' : '✓ '}${esc(label)}</span>`);
      addFlag('Flood plain', !!f.floodPlain?.values?.insideMapped);
      addFlag('Overland flow', (f.overlandFlow?.values?.segmentsWithinReach || 0) > 0);
      addFlag('Coastal 1% AEP', !!f.coastalInundation?.values?.today?.inside || !!f.coastalInundation?.values?.withOneMetreSeaLevelRise?.inside);
      addFlag('Tsunami zone', !!f.tsunami?.values?.inside);
      if (f.liquefaction?.value) pills.push(`<span class="le-flag">${esc(`Liq: ${f.liquefaction.value}`)}</span>`);
      for (const h of overlayHits.slice(0, 3)) pills.push(`<span class="le-flag is-hit">${esc(h.overlay)}</span>`);
      flagsEl.innerHTML = pills.join('');
    }
  }

  function renderClimatePanel() {
    const kv = root.querySelector('[data-le-climate-kv]');
    const bar = root.querySelector('[data-le-genmix-bar]');
    const leg = root.querySelector('[data-le-genmix-legend]');
    const badge = root.querySelector('[data-le-grid-badge]');

    const sw = state.siteFacts?.weather?.values;
    const w = state.climate.weather?.values;
    const air = state.climate.air?.values;
    const pwr = state.climate.power?.values;
    const gm = state.climate.genmix?.values;

    const tempC = sw?.tempC ?? w?.tempC;
    const windKmh = sw?.windKmh ?? w?.windKmh ?? state.wind.kmh;
    const aqiText = air?.aqi != null ? `${air.aqi} (${air.band})` : '—';
    const spotCents = pwr?.avgCentsPerKWh;
    const spotNode = pwr?.node || state.site.place;
    const renewPct = gm?.renewablePct;

    if (badge) {
      const liveOk = state.truth.weather === 'live';
      badge.className = `le-chip ${liveOk ? 'is-live' : 'is-sim'}`;
      badge.innerHTML = `<span class="le-chip-dot"></span>${liveOk ? 'LIVE FEEDS' : 'LOADING'}`;
    }

    if (kv) {
      kv.innerHTML = `
        <div class="le-kv">
          <span class="le-kv-k">Outdoor Weather</span>
          <span class="le-kv-v is-mono">${tempC != null ? `${round(tempC, 1)}°C` : '—'}</span>
          <span class="le-kv-note">RH ${sw?.humidity ?? w?.humidity ?? '—'}% · AQI ${esc(aqiText)}</span>
        </div>
        <div class="le-kv">
          <span class="le-kv-k">Live Wind Vector</span>
          <span class="le-kv-v is-mono">${round(windKmh, 0) ?? '—'} km/h ${esc(state.wind.compass)}</span>
          <span class="le-kv-note">From ${state.wind.fromDeg}° · ${state.wind.speedMs} m/s</span>
        </div>
        <div class="le-kv">
          <span class="le-kv-k">NZ Grid Spot (EMI)</span>
          <span class="le-kv-v is-mono">${spotCents != null ? `${spotCents} c/kWh` : '—'}</span>
          <span class="le-kv-note">${esc(spotNode)}</span>
        </div>
        <div class="le-kv">
          <span class="le-kv-k">Rooftop PV Est.</span>
          <span class="le-kv-v is-mono">${state.solarEst.currentKw} kW</span>
          <span class="le-kv-note">${state.solarEst.arrayKwPeak} kWp · ~${state.solarEst.dailyKwhEst} kWh/d</span>
        </div>
      `;
    }

    if (bar && leg) {
      const shares = gm?.sharePct || { hydro: 58, geothermal: 19, wind: 11, gas: 8, solar: 2, other: 2 };
      const entries = Object.entries(shares).filter(([, pct]) => pct > 0).slice(0, 6);
      bar.innerHTML = entries
        .map(([fuel, pct]) => `<span class="le-genmix-seg" style="width:${pct}%;background:${GENMIX_COLORS[fuel] || '#917A85'}" title="${esc(fuel)}: ${pct}%"></span>`)
        .join('');
      leg.innerHTML = `<span>${renewPct != null ? `${renewPct}% renewable NZ grid` : 'NZ generation mix'}</span>`
        + entries.slice(0, 4).map(([f, pct]) => `<span>${esc(f)} ${pct}%</span>`).join('');
    }
  }

  function renderIotPanel() {
    const kv = root.querySelector('[data-le-iot-kv]');
    const badge = root.querySelector('[data-le-iot-badge]');
    const statusEl = root.querySelector('[data-le-iot-status]');
    const iot = state.iot;
    const isLive = iot.source !== 'simulated';

    if (badge) {
      badge.className = `le-chip ${isLive ? 'is-live' : 'is-sim'}`;
      badge.innerHTML = `<span class="le-chip-dot"></span>${isLive ? esc(iot.sourceLabel.toUpperCase()) : 'SIMULATED'}`;
    }
    if (statusEl) statusEl.textContent = state.iotConn.statusText;
    if (kv) {
      const signDelta = iot.deltaTempC >= 0 ? `+${iot.deltaTempC}` : `${iot.deltaTempC}`;
      const netSign = iot.netExportKw >= 0 ? `+${iot.netExportKw}` : `${iot.netExportKw}`;
      kv.innerHTML = `
        <div class="le-kv">
          <span class="le-kv-k">Indoor Thermal</span>
          <span class="le-kv-v is-mono">${iot.indoorTempC}°C · ${iot.humidityPct}%</span>
          <span class="le-kv-note">ΔT ${signDelta}°C vs outdoor</span>
        </div>
        <div class="le-kv">
          <span class="le-kv-k">IAQ &amp; Passive Vent</span>
          <span class="le-kv-v is-mono">${iot.co2Ppm} ppm</span>
          <span class="le-kv-note">${esc(iot.passiveVentMode)}</span>
        </div>
        <div class="le-kv">
          <span class="le-kv-k">Rainwater Tank</span>
          <span class="le-kv-v is-mono">${iot.tankPct}%</span>
          <span class="le-kv-note">${iot.tankLitres.toLocaleString('en-NZ')} L / 10,000 L</span>
        </div>
        <div class="le-kv">
          <span class="le-kv-k">PV vs Studio Load</span>
          <span class="le-kv-v is-mono">${netSign} kW net</span>
          <span class="le-kv-note">${iot.rooftopSolarKw} kW PV · ${iot.studioLoadKw} kW load</span>
        </div>
      `;
    }
  }

  function refreshSimulatedIot() {
    if (state.iotConn.mode !== 'simulated') return;
    const sw = state.siteFacts?.weather?.values;
    const w = state.climate.weather?.values;
    state.iot = createSimulatedIotTelemetry({
      outdoorTempC: sw?.tempC ?? w?.tempC ?? 18.4,
      outdoorHumidityPct: sw?.humidity ?? w?.humidity ?? 68,
      windKmh: state.wind.kmh,
      rainMm: sw?.rainMm ?? w?.rainMm ?? 0,
      rooftopSolarKw: state.solarEst.currentKw,
    });
    renderIotPanel();
    renderTruthChips();
  }

  // ---- Load All Live NZ Feeds + Browser-Direct 1 m LINZ LiDAR for a Site ------------------------------------------

  async function loadSite(site) {
    fetchAbort?.abort();
    fetchAbort = new AbortController();
    const { signal } = fetchAbort;

    state.site = { ...site, place: site.place || resolvePlaceKey(site.lat, site.lon) };
    state.truth = { parcel: 'loading', lidar: 'loading', weather: 'loading', grid: 'loading' };

    const titleEl = root.querySelector('[data-le-site-title]');
    if (titleEl) titleEl.textContent = state.site.name;
    root.querySelectorAll('[data-le-preset]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lePreset === state.site.id)));
    renderTruthChips();
    setStatus('Loading LINZ parcel, 1 m LiDAR, footprints, weather & NZ grid…');

    const { lat, lon, place } = state.site;

    // Fire all live sources in parallel: /api/live (site+footprint), /api/live (weather+air+power+genmix), and direct LINZ 1 m LiDAR
    const siteFootprintReq = fetch(`${FEED_BASE}?feeds=site,footprint&lat=${lat.toFixed(5)}&lon=${lon.toFixed(5)}&radius=120`, { signal })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);

    const climateGridReq = fetch(`${FEED_BASE}?feeds=weather,air,power,genmix&place=${encodeURIComponent(place)}`, { signal })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);

    const lidarReq = import(GROUND_URL)
      .then(({ readLayer, unpackHeights }) => readLayer('ground', { lat, lon, radius: 68, signal }).then((env) => ({ env, unpackHeights })))
      .catch(() => null);

    // Process climate & grid as soon as it arrives
    climateGridReq.then((res) => {
      if (disposed || signal.aborted || !res?.feeds) return;
      state.climate = {
        weather: res.feeds.weather?.error ? null : res.feeds.weather,
        air: res.feeds.air?.error ? null : res.feeds.air,
        power: res.feeds.power?.error ? null : res.feeds.power,
        genmix: res.feeds.genmix?.error ? null : res.feeds.genmix,
      };
      state.truth.weather = state.climate.weather ? 'live' : 'sim';
      state.truth.grid = state.climate.power || state.climate.genmix ? 'live' : 'sim';
      if (!state.siteFacts?.weather && state.climate.weather?.values) {
        state.wind = computeWindVector(225, state.climate.weather.values.windKmh ?? 16);
        sceneApi?.rebuildWindStreamlines(state.wind);
      }
      refreshSimulatedIot();
      renderClimatePanel();
      renderTruthChips();
    });

    // Process site parcel + zone + hazards + footprints
    const sfRes = await siteFootprintReq;
    if (disposed || signal.aborted) return;

    if (sfRes?.feeds) {
      const siteFeed = sfRes.feeds.site && !sfRes.feeds.site.error ? sfRes.feeds.site : null;
      const fpFeed = sfRes.feeds.footprint && !sfRes.feeds.footprint.error ? sfRes.feeds.footprint : null;
      state.siteFacts = siteFeed?.facts || null;

      const parcelGeom = state.siteFacts?.parcel?.values?.outline;
      const parsedParcel = normalizeParcelPolygon(parcelGeom, { lat, lon });
      if (parsedParcel) {
        state.parcel = parsedParcel;
        state.truth.parcel = 'live';
      } else {
        state.parcel = buildIllustrativeParcel(20, 30);
        state.truth.parcel = 'sim';
      }

      // Zone-aware HIRB rules
      if (state.siteFacts?.zone?.value) {
        state.rules = resolveHirbRules(state.siteFacts.zone.value);
      }

      // Centre pavilion nicely inside the real parcel with HIRB-respecting starter proportions
      state.massing.cx = state.parcel.centroid[0];
      state.massing.cz = state.parcel.centroid[1];
      state.massing.width = round(clamp(state.parcel.bounds.width * 0.42, 7.5, 13.5), 1);
      state.massing.depth = round(clamp(state.parcel.bounds.depth * 0.40, 8.5, 15.0), 1);
      state.massing.height = round(clamp(state.rules.maxHeightM - 2.2, 4.8, 6.8), 1);
      syncRuleAndMassingInputs();

      // Exact point wind direction & speed from site.weather
      const sw = state.siteFacts?.weather?.values;
      if (sw) {
        state.wind = computeWindVector(sw.windFromDeg ?? 225, sw.windKmh ?? 16);
        state.truth.weather = 'live';
        sceneApi?.rebuildWindStreamlines(state.wind);
      }

      // Building footprints
      state.buildings = normalizeBuildings(fpFeed?.values?.geojson, { lat, lon }, state.parcel.ring);
      sceneApi?.setBuildings(state.buildings);
      sceneApi?.setSunArc(lat, state.solarHour);
      renderSitePanel();
      renderClimatePanel();
      renderComplianceAndPavilion();
      sceneApi?.frameParcel(state.parcel, state.shot);
      renderTruthChips();
    }

    // Process 1 m LINZ LiDAR DEM straight from browser S3
    const lidarRes = await lidarReq;
    if (disposed || signal.aborted) return;

    const lidarNoteEl = root.querySelector('[data-le-lidar-note]');
    if (lidarRes?.env?.status === 'live' && lidarRes.env.values?.heights) {
      const unpacked = lidarRes.unpackHeights(lidarRes.env.values.heights);
      const centerH = Number.isFinite(lidarRes.env.value) ? lidarRes.env.value : (lidarRes.env.values.heights.stats?.mean ?? 0);
      const relData = new Float32Array(unpacked.data.length);
      for (let i = 0; i < unpacked.data.length; i++) {
        const v = unpacked.data[i];
        relData[i] = Number.isFinite(v) ? v - centerH : 0;
      }
      state.terrain = {
        n: unpacked.n,
        cell: unpacked.cell,
        data: relData,
        baseElevM: centerH,
        live: true,
        surveyTitle: lidarRes.env.values.survey?.title || 'LINZ 1 m LiDAR DEM',
      };
      state.truth.lidar = 'live';
      if (lidarNoteEl) lidarNoteEl.textContent = `1 m LiDAR · ${round(centerH, 1)} m NZVD16`;
    } else {
      state.terrain = synthesizeTerrainGrid(68, lat);
      state.truth.lidar = 'sim';
      if (lidarNoteEl) lidarNoteEl.textContent = 'Illustrative terrain';
    }

    sceneApi?.setTerrain(state.terrain);
    sceneApi?.setBuildings(state.buildings);
    renderSitePanel();
    renderComplianceAndPavilion();
    sceneApi?.rebuildWindStreamlines(state.wind);
    sceneApi?.frameParcel(state.parcel, state.shot);
    renderTruthChips();
    setStatus('');
  }

  function syncRuleAndMassingInputs() {
    for (const [key, fmt] of [
      ['baseHeightM', (v) => `${Number(v).toFixed(1)} m`],
      ['angleDeg', (v) => `${Math.round(v)}°`],
      ['maxHeightM', (v) => `${Number(v).toFixed(1)} m`],
    ]) {
      const inp = root.querySelector(`[data-le-rule="${key}"]`);
      const out = root.querySelector(`[data-le-out="${key}"]`);
      if (inp) inp.value = String(state.rules[key]);
      if (out) out.textContent = fmt(state.rules[key]);
    }
    for (const [key, fmt] of [
      ['width', (v) => `${Number(v).toFixed(1)} m`],
      ['depth', (v) => `${Number(v).toFixed(1)} m`],
      ['height', (v) => `${Number(v).toFixed(1)} m`],
      ['rotDeg', (v) => `${Math.round(v)}°`],
    ]) {
      const inp = root.querySelector(`[data-le-mass="${key}"]`);
      const out = root.querySelector(`[data-le-out="${key}"]`);
      if (inp) inp.value = String(state.massing[key]);
      if (out) out.textContent = fmt(state.massing[key]);
    }
  }

  // ---- Custom Live IoT Endpoint (HTTP JSON Polling or WebSocket) --------------------------------------------------

  function disconnectIot(msg = 'Simulated Studio IoT (connect your own HTTP JSON or WebSocket below)') {
    if (state.iotConn.ws) {
      try { state.iotConn.ws.close(); } catch { /* ignore */ }
      state.iotConn.ws = null;
    }
    if (state.iotConn.timer) {
      clearInterval(state.iotConn.timer);
      state.iotConn.timer = null;
    }
    state.iotConn.mode = 'simulated';
    state.iotConn.statusText = msg;
    const discBtn = root.querySelector('[data-le-iot-disconnect]');
    if (discBtn) discBtn.hidden = true;
    refreshSimulatedIot();
  }

  async function connectIotEndpoint(rawUrl) {
    const url = String(rawUrl || '').trim();
    if (!/^(https?|wss?):\/\//i.test(url)) {
      state.iotConn.statusText = 'Enter a valid http://, https://, ws:// or wss:// endpoint.';
      renderIotPanel();
      return;
    }
    disconnectIot('Connecting to live IoT endpoint…');
    state.iotConn.url = url;
    const discBtn = root.querySelector('[data-le-iot-disconnect]');
    if (discBtn) discBtn.hidden = false;

    if (/^wss?:\/\//i.test(url)) {
      state.iotConn.mode = 'ws';
      state.iotConn.statusText = `Connecting WebSocket (${url})…`;
      renderIotPanel();
      try {
        const ws = new WebSocket(url);
        state.iotConn.ws = ws;
        ws.addEventListener('open', () => {
          if (disposed) return;
          state.iotConn.statusText = `Connected live via WebSocket · awaiting frames`;
          renderIotPanel();
        });
        ws.addEventListener('message', (ev) => {
          if (disposed) return;
          try {
            const payload = JSON.parse(String(ev.data));
            state.iot = mergeIotTelemetry(state.iot, payload, { transport: 'ws' });
            state.iotConn.statusText = `Live WebSocket · updated ${new Date().toLocaleTimeString('en-NZ')}`;
            renderIotPanel();
            renderComplianceAndPavilion();
            renderTruthChips();
          } catch { /* ignore non-JSON frames */ }
        });
        ws.addEventListener('error', () => {
          if (!disposed) disconnectIot('WebSocket unreachable · reverted to Simulated Studio IoT.');
        });
        ws.addEventListener('close', () => {
          if (!disposed && state.iotConn.mode === 'ws') disconnectIot('WebSocket closed · reverted to Simulated Studio IoT.');
        });
      } catch {
        disconnectIot('WebSocket could not open · reverted to Simulated Studio IoT.');
      }
      return;
    }

    // HTTP JSON Polling
    state.iotConn.mode = 'http';
    const pollOnce = async () => {
      try {
        const r = await fetch(url, { headers: { accept: 'application/json' } });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = await r.json();
        if (disposed) return;
        state.iot = mergeIotTelemetry(state.iot, json, { transport: 'http' });
        state.iotConn.statusText = `Live JSON polling (5s) · updated ${new Date().toLocaleTimeString('en-NZ')}`;
        renderIotPanel();
        renderComplianceAndPavilion();
        renderTruthChips();
      } catch (err) {
        if (!disposed) disconnectIot(`Endpoint error (${err.message}) · reverted to Simulated Studio IoT.`);
      }
    };
    await pollOnce();
    if (!disposed && state.iotConn.mode === 'http') {
      state.iotConn.timer = setInterval(pollOnce, 5000);
    }
  }

  // ---- Wire Interactive Controls ----------------------------------------------------------------------------------

  const searchInput = root.querySelector('[data-le-search]');
  const searchClear = root.querySelector('[data-le-search-clear]');
  const suggestionsEl = root.querySelector('[data-le-suggestions]');

  const hideSuggestions = () => {
    if (suggestionsEl) { suggestionsEl.hidden = true; suggestionsEl.innerHTML = ''; }
  };

  searchInput?.addEventListener('input', () => {
    const q = searchInput.value.trim();
    if (searchClear) searchClear.hidden = !q;
    clearTimeout(searchTimer);
    if (q.length < 4) { hideSuggestions(); return; }
    searchTimer = setTimeout(async () => {
      searchAbort?.abort();
      searchAbort = new AbortController();
      try {
        const r = await fetch(`${FEED_BASE}?feeds=address&q=${encodeURIComponent(q)}`, { signal: searchAbort.signal });
        if (!r.ok) return;
        const j = await r.json();
        const matches = j?.feeds?.address?.values?.matches || [];
        if (!suggestionsEl || disposed) return;
        if (!matches.length) {
          suggestionsEl.innerHTML = `<li class="le-suggestion-sub" style="padding:8px 10px">No matching LINZ address found.</li>`;
          suggestionsEl.hidden = false;
          return;
        }
        suggestionsEl.innerHTML = matches.map((m, idx) => `
          <li>
            <button type="button" class="le-suggestion-btn" data-le-addr-idx="${idx}"
              data-lat="${m.lat}" data-lon="${m.lon}" data-name="${esc(m.address)}">
              <span>${esc(m.address)}</span>
              <span class="le-suggestion-sub">${esc([m.suburb, m.town, m.council].filter(Boolean).join(' · '))}</span>
            </button>
          </li>
        `).join('');
        suggestionsEl.hidden = false;
      } catch { /* aborted or offline */ }
    }, 280);
  });

  searchClear?.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    searchClear.hidden = true;
    hideSuggestions();
  });

  root.addEventListener('click', (e) => {
    const addrBtn = e.target.closest('[data-le-addr-idx]');
    if (addrBtn) {
      const lat = Number(addrBtn.dataset.lat), lon = Number(addrBtn.dataset.lon), name = addrBtn.dataset.name;
      if (searchInput) searchInput.value = name;
      hideSuggestions();
      loadSite({ id: 'search', short: 'Address', name, lat, lon, place: resolvePlaceKey(lat, lon) });
      return;
    }

    const presetBtn = e.target.closest('[data-le-preset]');
    if (presetBtn) {
      const p = NZ_SITE_PRESETS.find((x) => x.id === presetBtn.dataset.lePreset);
      if (p) {
        if (searchInput) searchInput.value = '';
        if (searchClear) searchClear.hidden = true;
        hideSuggestions();
        loadSite(p);
      }
      return;
    }

    const layerBtn = e.target.closest('[data-le-layer]');
    if (layerBtn) {
      const k = layerBtn.dataset.leLayer;
      state.layers[k] = !state.layers[k];
      layerBtn.setAttribute('aria-pressed', String(state.layers[k]));
      sceneApi?.setLayerVisibility(state.layers);
      return;
    }

    const hirbBtn = e.target.closest('[data-le-hirb-preset]');
    if (hirbBtn) {
      const hp = HIRB_PRESETS.find((x) => x.id === hirbBtn.dataset.leHirbPreset);
      if (hp) {
        state.rules = resolveHirbRules(state.rules.zoneLabel, hp);
        syncRuleAndMassingInputs();
        renderComplianceAndPavilion();
      }
      return;
    }

    const shotBtn = e.target.closest('[data-le-shot]');
    if (shotBtn) {
      state.shot = shotBtn.dataset.leShot;
      root.querySelectorAll('[data-le-shot]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.leShot === state.shot)));
      sceneApi?.frameParcel(state.parcel, state.shot);
      return;
    }

    if (e.target.closest('[data-le-sun-now]')) {
      state.solarHour = round(currentNzHour(), 2);
      const sl = root.querySelector('[data-le-sun-slider]');
      const out = root.querySelector('[data-le-sun-out]');
      if (sl) sl.value = String(state.solarHour);
      if (out) out.textContent = fmtHour(state.solarHour);
      sceneApi?.setSunArc(state.site.lat, state.solarHour);
      return;
    }

    if (e.target.closest('[data-le-iot-disconnect]')) {
      disconnectIot();
    }
  });

  root.addEventListener('input', (e) => {
    const ruleInp = e.target.closest('[data-le-rule]');
    if (ruleInp) {
      const key = ruleInp.dataset.leRule;
      state.rules = resolveHirbRules(state.rules.zoneLabel, { ...state.rules, [key]: Number(ruleInp.value) });
      syncRuleAndMassingInputs();
      renderComplianceAndPavilion();
      return;
    }

    const massInp = e.target.closest('[data-le-mass]');
    if (massInp) {
      const key = massInp.dataset.leMass;
      state.massing[key] = Number(massInp.value);
      syncRuleAndMassingInputs();
      renderComplianceAndPavilion();
      renderClimatePanel();
      return;
    }

    const sunInp = e.target.closest('[data-le-sun-slider]');
    if (sunInp) {
      state.solarHour = Number(sunInp.value);
      const out = root.querySelector('[data-le-sun-out]');
      if (out) out.textContent = fmtHour(state.solarHour);
      sceneApi?.setSunArc(state.site.lat, state.solarHour);
    }
  });

  const iotForm = root.querySelector('[data-le-iot-form]');
  iotForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const urlInput = root.querySelector('[data-le-iot-url]');
    connectIotEndpoint(urlInput?.value || '');
  });

  // Initial draw + live fetch + gentle 6s simulated IoT heartbeat (paused when live endpoint connected)
  sceneApi?.setTerrain(state.terrain);
  sceneApi?.setSunArc(state.site.lat, state.solarHour);
  sceneApi?.rebuildWindStreamlines(state.wind);
  renderSitePanel();
  renderClimatePanel();
  renderIotPanel();
  renderComplianceAndPavilion();
  sceneApi?.frameParcel(state.parcel, state.shot);
  renderTruthChips();

  loadSite(state.site);
  simTimer = setInterval(refreshSimulatedIot, 6000);

  return () => {
    disposed = true;
    fetchAbort?.abort();
    searchAbort?.abort();
    clearTimeout(searchTimer);
    clearInterval(simTimer);
    disconnectIot();
    sceneApi?.dispose();
  };
}

// ---- OS Registration (safe on Node import — zero DOM access at module evaluation) ---------------------------------

const ENVELOPE_ICON = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 17.5 12 22l9-4.5"/><path d="M3 13 12 17.5 21 13"/><path d="M12 2.5 3 7.5 12 12l9-4.5-9-5Z"/></svg>';

registerNav({ id: 'envelope', label: 'Live Twin', hash: '#/envelope', order: 2, icon: ENVELOPE_ICON });
registerRoute('envelope', {
  title: 'Live Site & Envelope Twin',
  render(el, ctx, rest) {
    return mountLiveEnvelope(el, ctx, { mode: 'route', rest });
  },
});
registerProjectTab({
  id: 'live-envelope',
  label: 'Live Site & IoT',
  order: 18,
  icon: ENVELOPE_ICON,
  render(el, ctx) {
    return mountLiveEnvelope(el, ctx, { mode: 'tab' });
  },
});
