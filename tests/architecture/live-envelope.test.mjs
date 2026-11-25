import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  NZ_SITE_PRESETS,
  resolvePlaceKey,
  resolveHirbRules,
  normalizeParcelPolygon,
  buildIllustrativeParcel,
  normalizeBuildings,
  hirbMaxHeightAt,
  computeHirbEnvelope,
  evaluateMassingCompliance,
  extractContourSegments,
  computeWindVector,
  computeSolarPosition,
  estimateRooftopSolar,
  createSimulatedIotTelemetry,
  mergeIotTelemetry,
} from '../../architecture/js/live-envelope.js';
import { getRoute, navItems, projectTabs } from '../../architecture/js/modules.js';

test('live-envelope registers nav, route, and project tab cleanly without DOM', () => {
  const nav = navItems().find((n) => n.id === 'envelope');
  assert.ok(nav, 'envelope top nav registered');
  assert.equal(nav.hash, '#/envelope');

  const route = getRoute('envelope');
  assert.ok(route, 'envelope route registered');
  assert.equal(typeof route.render, 'function');

  const tab = projectTabs().find((t) => t.id === 'live-envelope');
  assert.ok(tab, 'live-envelope project tab registered');
  assert.equal(tab.order, 18);
  assert.equal(typeof tab.render, 'function');
});

test('brand and technical compliance: zero bare three imports, zero banned violet, zero private names', () => {
  const js = readFileSync(new URL('../../architecture/js/live-envelope.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../../architecture/live-envelope.css', import.meta.url), 'utf8');
  const combined = `${js}\n${css}`;

  assert.doesNotMatch(js, /from\s+['"]three['"]/, 'must not use bare three import');
  assert.doesNotMatch(js, /OrbitControls\.js/, 'must not import OrbitControls addon with bare three import');
  assert.doesNotMatch(combined, /#(?:C7B4F0|D7B3F0|6A50BE)/i, 'must not contain banned violet/lavender');
  assert.doesNotMatch(combined, /\b(?:weteriana|wesley|whaihanga|whaiao|ryuki)\b/i, 'must not contain private client names');
  assert.ok(NZ_SITE_PRESETS.length >= 4, 'provides public NZ site presets');
});

test('resolvePlaceKey maps NZ coordinates to nearest regional EMI grid hub', () => {
  assert.equal(resolvePlaceKey(-36.79, 174.78), 'auckland');
  assert.equal(resolvePlaceKey(-37.78, 175.28), 'hamilton');
  assert.equal(resolvePlaceKey(-41.29, 174.79), 'wellington');
  assert.equal(resolvePlaceKey(-43.57, 172.76), 'christchurch');
});

test('resolveHirbRules derives zone-aware NZ HIRB parameters and respects overrides', () => {
  const sh = resolveHirbRules('Residential - Single House Zone');
  assert.equal(sh.baseHeightM, 2.5);
  assert.equal(sh.angleDeg, 45);
  assert.equal(sh.maxHeightM, 8.0);

  const mhu = resolveHirbRules('Residential - Mixed Housing Urban Zone');
  assert.equal(mhu.baseHeightM, 3.0);
  assert.equal(mhu.maxHeightM, 11.0);

  const thab = resolveHirbRules('Residential - Terrace Housing and Apartment Buildings Zone');
  assert.equal(thab.baseHeightM, 8.0);
  assert.equal(thab.angleDeg, 60);
  assert.equal(thab.maxHeightM, 16.0);

  const mdrs = resolveHirbRules('Mixed Housing Suburban', { baseHeightM: 4, angleDeg: 60, maxHeightM: 11, mdrs: true });
  assert.equal(mdrs.baseHeightM, 4);
  assert.equal(mdrs.angleDeg, 60);
  assert.equal(mdrs.mdrs, true);
});

test('HIRB envelope math computes exact recession height, volume, compliance, and breach', () => {
  // Exact 20 m x 20 m square parcel centred on (0, 0)
  const parcel = {
    ring: [[-10, -10], [10, -10], [10, 10], [-10, 10]],
    edges: [
      { a: [-10, -10], b: [10, -10] },
      { a: [10, -10], b: [10, 10] },
      { a: [10, 10], b: [-10, 10] },
      { a: [-10, 10], b: [-10, -10] },
    ],
    centroid: [0, 0],
    areaM2: 400,
    bounds: { minX: -10, maxX: 10, minZ: -10, maxZ: 10, width: 20, depth: 20 },
  };
  const rules = resolveHirbRules('Single House Zone'); // 2.5 m + 45 deg, capped at 8.0 m

  // 2 m inside any edge: 2.5 + 2 * tan(45) = 4.5 m
  const edgeCheck = hirbMaxHeightAt(-8, 0, parcel.ring, rules);
  assert.equal(edgeCheck.inside, true);
  assert.ok(Math.abs(edgeCheck.permittedM - 4.5) < 1e-6);

  // At centre (10 m from edges): 2.5 + 10 = 12.5 -> capped at 8.0 m
  const centreCheck = hirbMaxHeightAt(0, 0, parcel.ring, rules);
  assert.equal(centreCheck.permittedM, 8.0);

  // Outside parcel
  const outCheck = hirbMaxHeightAt(15, 0, parcel.ring, rules);
  assert.equal(outCheck.inside, false);
  assert.equal(outCheck.permittedM, 0);

  // Full envelope grid
  const env = computeHirbEnvelope(parcel, rules, 1.0);
  assert.equal(env.maxPeakM, 8.0);
  assert.ok(env.envelopeVolumeM3 > 2000 && env.envelopeVolumeM3 < 3200);

  // Compliant pavilion (10m x 10m -> corners 5m from boundary -> permitted 7.5m; height 6.5m)
  const ok = evaluateMassingCompliance({ cx: 0, cz: 0, width: 10, depth: 10, height: 6.5, rotDeg: 0 }, parcel, rules);
  assert.equal(ok.compliant, true);
  assert.equal(ok.maxBreachM, 0);
  assert.ok(Math.abs(ok.minClearanceM - 1.0) < 0.05);
  assert.equal(ok.siteCoveragePct, 25);

  // Breaching pavilion (14m x 14m -> corners 3m from boundary -> permitted 5.5m; height 7.5m -> 2.0m breach)
  const breach = evaluateMassingCompliance({ cx: 0, cz: 0, width: 14, depth: 14, height: 7.5, rotDeg: 0 }, parcel, rules);
  assert.equal(breach.compliant, false);
  assert.ok(Math.abs(breach.maxBreachM - 2.0) < 0.05);
});

test('normalizeParcelPolygon and normalizeBuildings project WGS84 GeoJSON to local NZTM2000 metres', () => {
  const origin = { lat: -36.7878, lon: 174.7770 };
  const parcelGeo = {
    type: 'Polygon',
    coordinates: [[
      [174.77688, -36.78768],
      [174.77712, -36.78768],
      [174.77712, -36.78792],
      [174.77688, -36.78792],
      [174.77688, -36.78768],
    ]],
  };
  const parcel = normalizeParcelPolygon(parcelGeo, origin);
  assert.ok(parcel);
  assert.equal(parcel.ring.length, 4);
  assert.ok(parcel.areaM2 > 450 && parcel.areaM2 < 700, `expected ~570 m², got ${parcel.areaM2}`);
  assert.ok(parcel.bounds.width > 18 && parcel.bounds.width < 25);

  const fpCollection = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        id: 101,
        properties: { building_id: 101 },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [174.77695, -36.78775],
            [174.77705, -36.78775],
            [174.77705, -36.78785],
            [174.77695, -36.78785],
            [174.77695, -36.78775],
          ]],
        },
      },
      {
        type: 'Feature',
        id: 102,
        properties: { building_id: 102 },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [174.77740, -36.78775],
            [174.77755, -36.78775],
            [174.77755, -36.78788],
            [174.77740, -36.78788],
            [174.77740, -36.78775],
          ]],
        },
      },
    ],
  };
  const buildings = normalizeBuildings(fpCollection, origin, parcel.ring);
  assert.equal(buildings.length, 2);
  assert.equal(buildings[0].onSite, true);
  assert.equal(buildings[1].onSite, false);

  const fallback = buildIllustrativeParcel(20, 30);
  assert.equal(fallback.illustrative, true);
  assert.ok(fallback.areaM2 > 550);
});

test('extractContourSegments extracts 1 m minor and 5 m major contours via marching squares', () => {
  // Simple tilted plane rising from z=-5 (elev=10m) to z=+5 (elev=0m)
  const n = 11;
  const data = new Float32Array(n * n);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      data[j * n + i] = 10 - j;
    }
  }
  const contours = extractContourSegments({ n, cell: 1, data }, 1.0, 5);
  assert.ok(contours.length >= 9, `expected >= 9 contour levels, got ${contours.length}`);
  const lvl5 = contours.find((c) => c.level === 5);
  assert.ok(lvl5, 'includes 5 m major index contour');
  assert.equal(lvl5.isMajor, true);
  assert.ok(lvl5.segments.length >= 10);
  const lvl3 = contours.find((c) => c.level === 3);
  assert.ok(lvl3 && !lvl3.isMajor);
});

test('computeWindVector and computeSolarPosition match NZ architectural XZ coordinate conventions', () => {
  // Northerly (from 0 deg) blows toward South (+Z)
  const northWind = computeWindVector(0, 36); // 10 m/s
  assert.equal(northWind.compass, 'N');
  assert.equal(northWind.speedMs, 10);
  assert.ok(Math.abs(northWind.vx) < 0.01);
  assert.ok(Math.abs(northWind.vz - 10) < 0.01);

  // Westerly (from 270 deg) blows toward East (+X)
  const westWind = computeWindVector(270, 18); // 5 m/s
  assert.equal(westWind.compass, 'W');
  assert.ok(Math.abs(westWind.vx - 5) < 0.01);
  assert.ok(Math.abs(westWind.vz) < 0.01);

  // Auckland summer solar noon -> high sun in the North (z < 0, y > 0)
  const noonSun = computeSolarPosition(-36.85, 355, 12.5, 100);
  assert.equal(noonSun.isDay, true);
  assert.ok(noonSun.altitudeDeg > 60, `expected high summer altitude, got ${noonSun.altitudeDeg}`);
  assert.ok(noonSun.z < 0, 'NZ solar noon sun lies in the North (-Z)');

  // Rooftop solar estimate
  const pv = estimateRooftopSolar(160, 720, 15, true);
  assert.ok(pv.arrayKwPeak > 10);
  assert.ok(pv.currentKw > 5);
  const pvNight = estimateRooftopSolar(160, 0, 10, false);
  assert.equal(pvNight.currentKw, 0);
});

test('IoT telemetry separates simulated baseline from live HTTP/WS merges', () => {
  const sim = createSimulatedIotTelemetry({ outdoorTempC: 16.0, outdoorHumidityPct: 72, windKmh: 22, rooftopSolarKw: 4.0 }, 1_700_000_000_000);
  assert.equal(sim.source, 'simulated');
  assert.deepEqual(sim.liveFields, []);
  assert.ok(sim.indoorTempC >= 17.5 && sim.indoorTempC <= 25.5);
  assert.equal(sim.deltaTempC, Number((sim.indoorTempC - 16.0).toFixed(1)));

  // Merge live WebSocket payload with mixed alias keys
  const merged = mergeIotTelemetry(sim, {
    data: {
      indoor_temp: 22.4,
      rh: 48,
      co2_ppm: 512,
      rainwater_pct: 88,
      pv_kw: 5.4,
      load_kw: 1.9,
    },
  }, { transport: 'ws' });

  assert.equal(merged.source, 'live-ws');
  assert.equal(merged.indoorTempC, 22.4);
  assert.equal(merged.humidityPct, 48);
  assert.equal(merged.co2Ppm, 512);
  assert.equal(merged.tankPct, 88);
  assert.equal(merged.tankLitres, 8800);
  assert.equal(merged.rooftopSolarKw, 5.4);
  assert.equal(merged.studioLoadKw, 1.9);
  assert.equal(merged.netExportKw, 3.5);
  assert.equal(merged.deltaTempC, 6.4);
  assert.equal(merged.liveFields.length, 6);

  // Invalid / out-of-range values are rejected without corrupting baseline
  const ignored = mergeIotTelemetry(sim, { tempC: 999, co2: -50 }, { transport: 'http' });
  assert.equal(ignored.source, 'simulated');
  assert.equal(ignored.indoorTempC, sim.indoorTempC);
});
