import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  NZ_SPECIES,
  SPECIES_BY_ID,
  NZ_COMPOSITIONS,
  NZ_SURFACES,
  NZ_EDGINGS,
  EDGING_STYLES,
  noise2D,
  sampleClosedSpline,
  polygonAreaM2,
  polygonPerimeterM,
  pointInPolygon,
  distToPolygonEdge,
  defaultKidneyBedPoints,
  generateBedPlanting,
  buildPlantingSchedule,
  exportPlantingCSV,
  exportPlantingPlanSVG,
  createBrushField,
  stampBrushField,
  extractBrushedLoops,
  computeEcologyMetrics,
} from '../../landscape/catalog.mjs';

test('NZ botanical catalog has 25 genuine Aotearoa entries, 8 compositions, 6 NZ supplier hardscapes, zero lavender/violet', () => {
  assert.ok(NZ_SPECIES.length >= 24, `Expected >=24 authentic Aotearoa entries, got ${NZ_SPECIES.length}`);
  assert.equal(SPECIES_BY_ID.lavender, undefined, 'Exotic lavender must be swapped for authentic NZ species');
  assert.ok(SPECIES_BY_ID.pachystegia, 'Marlborough Rock Daisy (pachystegia) is included');
  assert.ok(SPECIES_BY_ID.pohutukawa, 'Pōhutukawa is included');
  assert.ok(SPECIES_BY_ID.kopakopa, 'Kopakopa (Chatham Island Forget-Me-Not) is included');
  assert.ok(SPECIES_BY_ID.ti_kouka === SPECIES_BY_ID.tikouka, 'Backwards-compatible ti_kouka alias works');

  const bannedViolet = /#(c7b4f0|d7b3f0|6a50be|9d7bb8|b18fd6|8b5ce6|a87aff|7d4ce0)/i;
  for (const sp of NZ_SPECIES) {
    assert.equal(sp.bloomMonths.length, 12, `${sp.id} must define 12 monthly bloom weights`);
    assert.equal(sp.growth.length, 5, `${sp.id} must define 5-stage growth curve`);
    for (const hex of [sp.swatch, sp.foliageColor, sp.foliageTipColor, sp.winterColor, sp.flowerColor, sp.flowerColor2]) {
      assert.ok(!bannedViolet.test(hex), `${sp.id} color ${hex} must avoid DESIGN.md banned violet/lavender`);
    }
    assert.equal(SPECIES_BY_ID[sp.id], sp);
  }

  assert.ok(NZ_COMPOSITIONS.length >= 6);
  for (const c of NZ_COMPOSITIONS) {
    assert.ok(c.swatches.length >= 5);
    const totalWeight = c.mix.reduce((s, m) => s + m.weight, 0);
    assert.ok(Math.abs(totalWeight - 1) < 0.02, `${c.id} weights sum to ~1 (${totalWeight})`);
    for (const entry of c.mix) {
      assert.ok(SPECIES_BY_ID[entry.id], `${c.id} references unknown species ${entry.id}`);
    }
  }

  assert.equal(NZ_SURFACES.length, 11, '11 NZ supplier hardscape channels (lawn..kwila)');
  assert.ok(NZ_SURFACES.some((s) => /Daltons/i.test(s.brand)));
  assert.ok(NZ_SURFACES.some((s) => /Firth/i.test(s.brand)));
  assert.ok(NZ_SURFACES.some((s) => /Schist/i.test(s.name)));
  assert.ok(NZ_EDGINGS.length >= 4);
  assert.ok(EDGING_STYLES.corten && EDGING_STYLES.macrocarpa);

  // Smooth Piet Oudolf 2D drift noise stays bounded in [0, 1]
  for (let i = 0; i < 20; i++) {
    const v = noise2D(i * 0.73, i * -1.19);
    assert.ok(v >= 0 && v <= 1, `noise2D out of range: ${v}`);
  }
});

test('Closed Catmull-Rom spline bed geometry computes realistic area, perimeter, containment, and edge distance', () => {
  const pts = defaultKidneyBedPoints();
  const poly = sampleClosedSpline(pts, 12);
  assert.equal(poly.length, pts.length * 12);

  const area = polygonAreaM2(poly);
  const perim = polygonPerimeterM(poly);
  assert.ok(area > 30 && area < 50, `Expected organic studio bed ~38 m², got ${area}`);
  assert.ok(perim > 22 && perim < 34, `Expected perimeter ~27 m, got ${perim}`);

  assert.equal(pointInPolygon(0, 0, poly), true);
  assert.equal(pointInPolygon(20, 20, poly), false);
  assert.ok(distToPolygonEdge(0, 0, poly) > 1.4, 'Bed centre should be >1.4 m from kerb');
});

test('Ecological + Oudolf drift bed generator places layered NZ natives and exports CSV + L101 A3 SVG plan', () => {
  const beds = [{ id: 'bed-1', name: 'Island Bed 1', edging: 'corten', mulch: 'bark', points: defaultKidneyBedPoints() }];
  const plants = generateBedPlanting({
    controlPoints: beds[0].points,
    compositionId: 'pollinator_meadow',
    seed: 108,
    density: 1.1,
    clumping: 0.72,
    bedId: 'bed-1',
  });

  assert.ok(plants.length >= 60, `Expected lush planting (>= 60 plants), got ${plants.length}`);

  const poly = sampleClosedSpline(beds[0].points, 12);
  const coreTrees = plants.filter((p) => SPECIES_BY_ID[p.speciesId]?.tier === 'canopy');
  for (const t of coreTrees) {
    assert.ok(distToPolygonEdge(t.x, t.z, poly) >= 0.45, `Canopy tree ${t.speciesId} should not sit on outer kerb`);
  }

  const sched = buildPlantingSchedule(beds, plants, { pavers: 18.5, pebbles: 12.0 });
  assert.equal(sched.totalPlants, plants.length);
  assert.ok(sched.totalNzd > 2500);
  assert.ok(sched.rows.length >= 4);
  assert.equal(sched.surfaceRows.length, 2, 'Painted Firth Pavers & Waikato Pebble appear in supplier schedule');

  const csv = exportPlantingCSV(sched, 'Waiheke Coastal Courtyard');
  assert.match(csv, /Te Reo \/ Common Name,Botanical Name,Supplier \/ Nursery/);
  assert.match(csv, /Firth Piazza 50 Black Sands/);
  assert.match(csv, /Waiheke Coastal Courtyard/);

  const svg = exportPlantingPlanSVG({ beds, plants, schedule: sched, siteLabel: 'Waiheke Coastal Courtyard' });
  assert.match(svg, /<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 1190 842"/);
  assert.match(svg, /L101 · AOTEAROA NATIVE PLANTING PLAN/);
  assert.match(svg, /assembl\./);
});

test('Freehand Site-Plan Garden Bed Brush extracts smooth closed polygons and calculates Kaitiakitanga ecology metrics', () => {
  const field = createBrushField({ spanM: 40, res: 120 });
  for (let x = -6; x <= 4; x += 0.6) stampBrushField(field, x, 3.5, 1.6, 1);
  for (let z = 3.5; z >= -2.5; z -= 0.6) stampBrushField(field, 4, z, 1.6, 1);

  const loops = extractBrushedLoops(field);
  assert.equal(loops.length, 1, 'Continuous L-stroke fuses into 1 smooth organic garden bed polygon');
  const area = polygonAreaM2(loops[0]);
  assert.ok(area > 28 && area < 95, `Expected brushed garden bed area ~45-70 m², got ${area}`);

  stampBrushField(field, 1.0, 3.5, 2.2, -1);
  const afterErase = extractBrushedLoops(field);
  const areaAfter = afterErase.reduce((s, l) => s + polygonAreaM2(l), 0);
  assert.ok(areaAfter < area, 'Erasing reduces brushed garden bed area');

  const brushedBed = { id: 'brushed-1', name: 'Brushed Site Border', edging: 'corten', mulch: 'bark', points: loops[0], isRawPoly: true };
  const eco = computeEcologyMetrics([brushedBed], [
    { speciesId: 'pohutukawa' },
    { speciesId: 'kowhai' },
    { speciesId: 'harakeke' },
    { speciesId: 'ti_kouka' },
    { speciesId: 'boulder' },
    { speciesId: 'carex_secta' },
  ]);
  assert.ok(eco.tuiAttractionPct >= 30);
  assert.ok(eco.kereruAttractionPct >= 16);
  assert.ok(eco.skinkHabitatPct >= 10);
  assert.ok(eco.stormwaterLitresHr > 500);
});

test('Landscape UI files respect DESIGN.md palette & zero private client names', () => {
  const html = readFileSync(new URL('../../landscape/index.html', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../../landscape/style.css', import.meta.url), 'utf8');
  const combined = html + '\n' + css;
  assert.match(html, /assembl<span class="dot">\.<\/span>/);
  assert.ok(!/#(c7b4f0|d7b3f0|6a50be)/i.test(combined), 'No banned violet hex in landscape HTML/CSS');
  assert.ok(!/(weteriana|wesley|whaihanga|whaiao|ryuki)/i.test(combined), 'No private client names in landscape HTML/CSS');
});
