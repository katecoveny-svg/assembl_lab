// Unit tests for the Aotearoa NZ Architectural Studio Suite:
//   - Multi-sheet PDF classification, Cultural Narrative extraction & Bilingual Te Reo Māori script generation
//   - 9-category NZ Architectural Specifier, Live Cost ($ NZD) & Critical-Path Programme Delay engine + URL codec
//   - Working Plans & Drawings Agent (A101–L101 A3 SVG set incl. L101 landscape, CAD DXF export, universal NZBC pre-check)
//   - /architecture/ Three.js stage live telemetry & Earlier Works addon registration

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifySheetPage,
  extractPdfSetNarrative,
  buildBilingualNarrationScript,
  GOVERNANCE_NOTE,
} from '../../plan-studio/twins/src/twin/culturalNarrative.ts';
import {
  SPEC_CATEGORIES,
  calculateSpecImpact,
  defaultSpecSelections,
  encodeSpecSelections,
  decodeSpecSelections,
  exportSpecCSV,
  exportSpecHTML,
} from '../../plan-studio/twins/src/twin/nzSpecifier.ts';
import {
  buildUniversalNzbcPrecheck,
  generateWorkingDrawingSet,
  exportWorkingSetDXF,
  exportWorkingSetPrintableHTML,
} from '../../plan-studio/twins/src/twin/workingDrawings.ts';
import { calcStageTelemetry } from '../../architecture/js/immersive-stage.js';
import { ADDONS } from '../../architecture/js/modules.js';

test('multi-sheet PDF intake classifies sheets, extracts cultural motifs with page citations, and keeps governance notes', () => {
  const samplePages = [
    { page: 1, items: ['COVER SHEET', 'DRAWING LIST', '95% DRAFT RESOURCE CONSENT', 'KŌWHAI ARCHITECTURE LTD'] },
    { page: 10, items: ['P0-116', 'PROPOSED SITE PLAN', '1:500 @ A3', 'Harbour Chapel', 'Waitematā Harbour'] },
    { page: 11, items: ['P1-117', 'GROUND FLOOR PLAN - BANQUET SEATING', '1:100', 'Total Seating: 420'] },
    { page: 12, items: ['P1-118', 'GROUND FLOOR PLAN - AUDITORIUM SEATING', '1:100', 'Auditorium Chairs: 312', 'Accessible Seats: 4'] },
    {
      page: 19,
      items: [
        'CULTURAL DESIGN NARRATIVE',
        'Inspired by the flowing tributaries of Ōira and Whangapouri Streams toward Te Moananui-a-Kiwa, the threshold welcomes whānau with manaakitanga.',
        'Four interwoven motifs — Kōmiromiro, Ngaru, Mangōpare, and Aramoana — guide the glazed façade screens and structural portals.',
      ],
    },
    { page: 21, items: ['P1-120', 'EXTERIOR RENDERS', 'Perspective View'] },
  ];

  const cBanquet = classifySheetPage(11, samplePages[2].items);
  assert.equal(cBanquet.code, 'P1-117');
  assert.equal(cBanquet.kind, 'plan');
  assert.deepEqual(cBanquet.layoutVariant, { mode: 'banquet', seats: 420 });

  const cAud = classifySheetPage(12, samplePages[3].items);
  assert.equal(cAud.code, 'P1-118');
  assert.deepEqual(cAud.layoutVariant, { mode: 'conference', seats: 316 });

  const { narrative, sheets } = extractPdfSetNarrative(samplePages, 'Sample Civic Hub.pdf');
  assert.equal(sheets.length, 6);
  assert.equal(narrative.practiceName, 'KŌWHAI ARCHITECTURE Ltd');
  assert.equal(narrative.stageStatus, '95% DRAFT RESOURCE CONSENT');
  assert.equal(narrative.source, 'pdf-extracted');
  assert.equal(narrative.governanceNote, GOVERNANCE_NOTE);

  const motifTerms = narrative.motifs.map((m) => m.term);
  for (const expected of ['Kōmiromiro', 'Ngaru', 'Mangōpare', 'Aramoana', 'Manaakitanga']) {
    assert.ok(motifTerms.includes(expected), `expected motif ${expected} in ${motifTerms.join(', ')}`);
  }
  assert.equal(narrative.motifs.find((m) => m.term === 'Kōmiromiro')?.sourcePage, 19);
  assert.deepEqual(narrative.renderPages, [21]);
  assert.equal(narrative.layoutVariants.length, 2);

  const script = buildBilingualNarrationScript({
    narrative,
    claddingLabel: 'Western Red Cedar Shiplap, Natural Oil',
    joineryLabel: 'Dark Bronze Anodised, Low-E Double Glazed',
    landscapingLabel: 'Tāmaki Bush & Ponga Sanctuary',
    layoutMode: 'banquet',
  });
  assert.match(script, /Tēnā koutou, nau mai, haere mai/);
  assert.match(script, /Kōmiromiro, Ngaru, Mangōpare, Aramoana/);
  assert.match(script, /Mauri ora ki te whānau/);
});

test('NZ architectural specifier calculates live NZD cost delta, critical-path programme delay, and round-trips URL tokens', () => {
  assert.equal(SPEC_CATEGORIES.length, 9, 'all 9 NZ architectural & landscape categories are present');

  const base = defaultSpecSelections();
  const baseImpact = calculateSpecImpact(base, { floorAreaM2: 450, baselineFloatWeeks: 6 });
  assert.equal(baseImpact.netDeltaNzd, 0, 'baseline specification has zero cost variation');
  assert.equal(baseImpact.netDelayWeeks, 0, 'all baseline items sit within 6-week float');
  assert.equal(baseImpact.netDelayWorkingDays, 0);

  // Upgrade to Engineered Native/Accoya Timber Joinery (11 wks) + Standing-Seam Marine Tray Roof (7 wks)
  const upgraded = {
    ...base,
    roof: 'tray-black-marine',
    joinery: 'timber-clear',
    fittings: 'brushed-brass-pvd',
    landscaping: 'ponga-nikau-bush',
  };
  const upImpact = calculateSpecImpact(upgraded, { floorAreaM2: 450, baselineFloatWeeks: 6 });
  assert.ok(upImpact.netDeltaNzd > 25000, `expected positive variation, got ${upImpact.netDeltaNzd}`);
  assert.equal(upImpact.maxLeadWeeks, 11);
  assert.equal(upImpact.netDelayWeeks, 5, '11-week joinery vs 6-week float = +5 weeks critical-path delay');
  assert.equal(upImpact.netDelayWorkingDays, 25);
  assert.equal(upImpact.criticalPathDrivers[0].categoryTitle, 'Window & Door Joinery');

  // Compact URL codec round-trip for ?client=1&spec=...
  const token = encodeSpecSelections(upgraded);
  const decoded = decodeSpecSelections(token);
  assert.deepEqual(decoded, upgraded);

  const csv = exportSpecCSV(upImpact, 'Civic Hub', 'Sample Architects Ltd');
  assert.match(csv, /Window & Door Joinery/);
  assert.match(csv, /\+5 wks \(\+25 work days\)/);

  const html = exportSpecHTML(upImpact, 'Civic Hub', 'Sample Architects Ltd');
  assert.match(html, /Client Specification &amp; Live Variation Schedule/);
  assert.match(html, /NZBC/);
});

test('Working Plans & Drawings agent emits 5 A3 SVG sheets (A101–L101 incl. landscape), cited NZBC pre-checks, and CAD DXF', () => {
  const { narrative } = extractPdfSetNarrative(
    [{ page: 1, items: ['CULTURAL NARRATIVE', 'Kōmiromiro and Ngaru guide the entry screen and soffit rhythm across the site.'] }],
    'Sample Pavilion',
  );
  const specSummary = calculateSpecImpact({ cladding: 'cedar-black', joinery: 'alu-bronze-anodised' }, { floorAreaM2: 380, baselineFloatWeeks: 6 });
  const input = {
    projectTitle: 'Sample Pavilion',
    practiceName: 'Sample Studio Ltd',
    drawingSource: 'Measured GLB 3D Geometry',
    widthM: 28.4,
    depthM: 16.2,
    wallHeightM: 4.2,
    ridgeHeightM: 6.8,
    glazingRatio: 0.36,
    linzNote: 'Site: LINZ 1 m LiDAR & aerial photo',
    rooms: [
      { name: 'Foyer & Arrival', x: 0.5, z: 0.5, w: 8.5, d: 15.2 },
      { name: 'Main Hui / Banquet Hall', x: 9.2, z: 0.5, w: 18.7, d: 15.2 },
    ],
    specSummary,
    narrative,
  };

  const checks = buildUniversalNzbcPrecheck(input);
  assert.equal(checks.length, 8);
  assert.ok(checks.some((c) => c.clause.includes('NZBC E2/AS1')));
  assert.ok(checks.some((c) => c.clause.includes('NZBC H1/AS1') && c.status === 'review'), '36% WWR flags H1 VM1 modelling check');

  const sheets = generateWorkingDrawingSet(input);
  assert.deepEqual(sheets.map((s) => s.id), ['A101', 'A201', 'A301', 'A401', 'L101']);
  for (const sh of sheets) {
    assert.match(sh.svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 1190 842"/);
    assert.match(sh.svg, /Sample Studio Ltd/);
    assert.doesNotMatch(sh.svg, /#C7B4F0|#D7B3F0|#6A50BE/i, `${sh.id} has no banned violet`);
  }
  assert.match(sheets[1].svg, /Cedar Vertical Shiplap, Carbon Black Stain/);
  assert.match(sheets[3].svg, /Kōmiromiro/);

  // L101 synthesised from landscaping spec + footprint when no brushed garden exists
  const l101 = sheets[4];
  assert.equal(l101.scale, '1:100');
  assert.match(l101.svg, />L101</);
  assert.match(l101.svg, /LANDSCAPE, ECO-SOURCING &amp; PERMEABLE SURFACES PLAN \(PROPOSED FROM SPEC\)/);
  assert.match(l101.svg, /data-layer="L-PERM-ZONE"/);
  assert.match(l101.svg, /data-layer="L-BED-EDGE"/);
  assert.match(l101.svg, /data-layer="L-PLNT-CANP"/);
  assert.match(l101.svg, /PERMEABLE \d+%/);
  assert.match(l101.svg, /IMPERVIOUS \d+%/);
  assert.match(l101.svg, /NZBC E1\/AS1/);
  assert.match(l101.svg, /NZBC E1\/VM1/);
  assert.match(l101.svg, /ROHE ECO-SOURCING SCHEDULE/);
  assert.match(l101.svg, /Metrosideros excelsa/, 'baseline coastal palette schedules Pōhutukawa botanically');
  assert.match(l101.svg, /stroke-dasharray="4 3"/, '2 m root-protection halos are dashed');
  assert.match(l101.svg, /<polygon points="0,-15 6,8 0,4 -6,8"/, 'north arrow present');

  const dxf = exportWorkingSetDXF(input);
  assert.match(dxf, /A-WALL-EXTR/);
  assert.match(dxf, /A-ROOM-OTLN/);
  assert.match(dxf, /Main Hui \/ Banquet Hall/);
  assert.match(dxf, /\n8\nL-BED-EDGE\n/);
  assert.match(dxf, /\n8\nL-PLNT-CANP\n/);
  assert.match(dxf, /\n8\nL-PERM-ZONE\n/);
  assert.match(dxf, /0\nCIRCLE\n8\nL-PLNT-CANP/);
  assert.doesNotMatch(dxf, /[^\x00-\x7F]/, 'DXF stays 7-bit ASCII');

  // Brushed garden state: explicit beds/plants, council %, root clash + shade flags
  const brushed = generateWorkingDrawingSet({
    ...input,
    landscapePlan: {
      roheLabel: 'Tāmaki Makaurau Ecological District',
      permeablePct: 34,
      detentionLitres: 1000,
      beds: [
        { x: -2, z: 18, r: 1.6, kind: 'Corten' },
        { x: 30, z: 4, r: 2.0, kind: 'Macrocarpa sleeper' },
        { x: 12, z: 19, r: 1.2, kind: 'Pebble swale' },
        { x: 20, z: 19, r: 2.2, kind: 'Paver' },
      ],
      plants: [
        { sp: 'Nīkau', x: 29.4, z: 8, s: 3 },
        { sp: 'Kōwhai', x: -4, z: 20, s: 5, sunOk: false },
        { sp: 'Harakeke', x: 6, z: 18.5, s: 1.8 },
      ],
    },
  });
  const lb = brushed[4].svg;
  assert.match(lb, /\(BRUSHED GARDEN STATE\)/);
  assert.match(lb, /PERMEABLE 34%/);
  assert.match(lb, /IMPERVIOUS 66%/);
  assert.match(lb, /Tāmaki Makaurau Ecological District/);
  assert.match(lb, /Rhopalostylis sapida/);
  assert.match(lb, /Sophora microphylla/);
  assert.match(lb, /⚠RPZ/, 'Nīkau 1 m from the footprint flags a root-protection clash');
  assert.match(lb, /1 clash with footprint/);
  assert.match(lb, /1 plant\(s\) in shade/);
  assert.match(lb, /◧ REVIEW/, '34% permeable fails the 40% district-plan rule');
  const bdxf = exportWorkingSetDXF({ ...input, landscapePlan: { beds: [{ x: 1, z: 18, r: 1.5, kind: 'corten' }], plants: [{ sp: 'Tōtara', x: -3, z: 3, s: 7 }] } });
  assert.match(bdxf, /B1 CORTEN/);
  assert.match(bdxf, /P1 Totara \(Podocarpus totara\)/);
  assert.match(bdxf, /0\nCIRCLE\n8\nL-BED-EDGE\n10\n1000\.0\n20\n18000\.0/);

  const printable = exportWorkingSetPrintableHTML(sheets, 'Sample Pavilion');
  assert.match(printable, /@page \{ size: A3 landscape/);
  assert.match(printable, /5-Sheet A3 Architectural Working Drawing Set \(A101–L101\)/);
});

test('/architecture/ 3D stage telemetry and Earlier Works addon are wired cleanly', async () => {
  const t = calcStageTelemetry({ cladding: 'blackcedar', joinery: 'timber', layout: 'lounge' });
  assert.equal(t.delta, 6400 + 29400 + 22800);
  assert.equal(t.maxLead, 10);
  assert.equal(t.delayWks, 4);
  assert.match(t.delayText, /\+4 wks \(\+20 work days\)/);

  assert.ok(ADDONS.includes('./immersive-stage.js'), 'immersive-stage.js is registered in ADDONS');
  assert.ok(ADDONS.includes('./earlier-works.js'), 'earlier-works.js is registered in ADDONS');
  await import('../../architecture/js/earlier-works.js');
});
