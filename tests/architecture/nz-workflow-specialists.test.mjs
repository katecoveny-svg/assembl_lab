import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  classifyIntakeSource,
  checkScale,
  detectDimensionConflicts,
  annotatePlanProvenance,
  reviewPlanBim,
} from '../../architecture/js/agents/plan-bim-rules.js';
import { reviewCameraRoute, buildCameraMetadata } from '../../architecture/js/agents/camera-rules.js';
import { evaluateTripleFrameDrift, reviewDeliverable } from '../../architecture/js/agents/reviewer-rules.js';
import {
  runSpecialistReview,
  approveRevisionReview,
  storeRevisionReview,
} from '../../architecture/js/agents/revision-review.js';
import { modelFromDrawing, toReal } from '../../plan-studio/js/read.js';

const REV_SHA = 'a'.repeat(64);

test('Plan/BIM intake: IFC is source of truth; native .rvt is rejected with IFC export guidance', () => {
  const rvt = classifyIntakeSource({ name: 'Hub_Model2.rvt' });
  assert.equal(rvt.accepted, false);
  assert.match(rvt.reason, /Export IFC/i);

  const ifc = classifyIntakeSource({ name: 'Hub_Model2.ifc', sha256: REV_SHA });
  assert.equal(ifc.accepted, true);
  assert.equal(ifc.authority, 'source_of_truth');
  assert.equal(ifc.fingerprint_valid, true);

  const pdfWithIfc = classifyIntakeSource({ name: 'P1-117.pdf', hasIfc: true, sha256: REV_SHA });
  assert.equal(pdfWithIfc.authority, 'reference_drawing');
});

test('Plan/BIM intake: PDF emits measured/traced/assumed states, scale check, and flags conflicting dimensions', () => {
  const scBad = checkScale({ printed_scale: 100, expected_mm: 10000, measured_mm: 10500 });
  assert.equal(scBad.status, 'mismatch');
  assert.equal(scBad.delta_pct, 5);

  const scOk = checkScale({ printed_scale: 100, expected_mm: 10000, measured_mm: 10040 });
  assert.equal(scOk.status, 'verified');

  const walls = [{ id: 'W1', a: [0, 0], b: [6000, 0], t: 200, ev: { src: 'drawing' } }];
  const openings = [{ id: 'D1', wall: 'W1', at: 3000, w: 920, ev: { src: 'drawing' } }];
  const levels = [{ id: 'L0', name: 'Ground', z: 0 }];
  const annotated = annotatePlanProvenance(
    { walls, openings, levels },
    {
      sheet_ref: 'P1-117',
      scale_check: scOk,
      printed_dimensions: [
        { element_id: 'W1', printed_mm: 6400, sheet_ref: 'P1-117' },
        { element_id: 'D1', printed_mm: 920, sheet_ref: 'P1-117' },
        { element_id: 'D1', printed_mm: 1200, sheet_ref: 'P1-118' },
      ],
    },
  );
  assert.equal(annotated.walls[0].state, 'measured');
  assert.equal(annotated.walls[0].sheet_ref, 'P1-117');
  assert.equal(annotated.levels[0].state, 'assumed');
  assert.equal(annotated.provenance.conflicts.length, 3);
  assert.equal(annotated.provenance.conflicts[0].delta_mm, -400);
  assert.ok(annotated.provenance.conflicts.some((c) => c.element_kind === 'cross_sheet'));

  // Verify modelFromDrawing in plan-studio/js/read.js carries provenance & conflicts
  const demoRaw = JSON.parse(readFileSync(new URL('../../plan-studio/tests/fixtures/demo-plan.raw.json', import.meta.url), 'utf8'));
  const m = modelFromDrawing(toReal(demoRaw, 100), {
    sheet_ref: 'A101',
    printed_dimensions: [{ element_id: 'W1', printed_mm: 99999, sheet_ref: 'A101' }],
  });
  assert.ok(m.walls.every((w) => ['measured', 'traced', 'assumed'].includes(w.state)));
  assert.equal(m.provenance.sheet_ref, 'A101');
  assert.equal(m.provenance.conflicts.length, 1);

  const bimReport = reviewPlanBim({ revision_sha256: REV_SHA, pdf_model: annotated, printed_dimensions: [{ element_id: 'W1', printed_mm: 6400, sheet_ref: 'P1-117' }], scale_check: scBad });
  assert.equal(bimReport.status, 'blocked');
  assert.equal(bimReport.auto_approved, false);
});

test('Camera specialist: enforces 16:9, clean cuts on unverified openings, and matched Banquet/Conference variants', () => {
  const baseStops = [
    { id: '03', label: 'Forecourt', position: [42, 4.74, -8], target: [2.5, 4.65, 3.8], nearest_solid_below_m: 1.61, nearest_solid_forward_m: 12.0, transition: 'cut' },
    { id: '04', label: 'Entry void', position: [-5.08, 2.6, 15.47], target: [-4.17, 3.15, 7.12], nearest_solid_below_m: 1.6, nearest_solid_forward_m: 9.02, crosses_opening: true, swept_path_verified: false, transition: 'cut' },
    { id: '09', label: 'Upstairs placeholder', position: [-40, 2.6, 4], target: [-23.8, 6.2, 2.5], placeholder: true, transition: 'cut' },
  ];

  // Unverified opening crossing without clean cut must block
  const badCut = reviewCameraRoute({
    revision_sha256: REV_SHA,
    stops: [{ ...baseStops[1], transition: 'continuous' }],
  });
  assert.equal(badCut.status, 'blocked');

  // Matched Banquet (420) and Conference (312+4) cuts pass
  const matched = reviewCameraRoute({
    revision_sha256: REV_SHA,
    width: 1280,
    height: 720,
    fps: 24,
    fov: 42,
    stops: baseStops,
    variants: [
      { id: 'banquet-420', fov: 42, sun_hour: 16.5, exposure: 0.62, duration_s: 39, building_sha256: REV_SHA, stops: baseStops },
      { id: 'conference-312-plus-4', fov: 42, sun_hour: 16.5, exposure: 0.62, duration_s: 39, building_sha256: REV_SHA, stops: baseStops },
    ],
  });
  assert.equal(matched.status, 'ready');
  assert.equal(matched.clean_cuts.length, 1);

  // Mismatched lens or building hash across variants blocks
  const mismatched = reviewCameraRoute({
    revision_sha256: REV_SHA,
    stops: baseStops,
    variants: [
      { id: 'banquet-420', fov: 42, sun_hour: 16.5, exposure: 0.62, duration_s: 39, building_sha256: REV_SHA, stops: baseStops },
      { id: 'conference-312-plus-4', fov: 35, sun_hour: 16.5, exposure: 0.62, duration_s: 39, building_sha256: 'b'.repeat(64), stops: baseStops },
    ],
  });
  assert.equal(mismatched.status, 'blocked');

  const meta = buildCameraMetadata({ project: 'Te Weteriana', revision_sha256: REV_SHA, variant: 'banquet-420', duration_s: 6, frames: [{ frame: 0 }] });
  assert.equal(meta.track, 'A-exact-model');
  assert.equal(meta.resolution.aspect, '16:9');
});

test('Independent Reviewer: checks first/middle/last drift, AI label, approved wordmark & rejects unapproved cultural artwork', () => {
  const holds = evaluateTripleFrameDrift({
    first: { verdict: 'holds', score: 0.85, parts: { rooflines: 0.9, openings: 0.88, mullions: 0.84, furniture: 0.8, planting: 0.78 } },
    middle: { verdict: 'holds', score: 0.82, parts: { rooflines: 0.86, openings: 0.85, mullions: 0.81, furniture: 0.79, planting: 0.77 } },
    last: { verdict: 'holds', score: 0.8, parts: { rooflines: 0.85, openings: 0.84, mullions: 0.8, furniture: 0.78, planting: 0.76 } },
  });
  assert.equal(holds.recommendation, 'accept_study');

  const tailPlantingDrift = evaluateTripleFrameDrift({
    first: { verdict: 'holds', score: 0.85 },
    middle: { verdict: 'holds', score: 0.82 },
    last: { verdict: 'drifts', score: 0.44, parts: { planting: 0.4 } },
  });
  assert.equal(tailPlantingDrift.recommendation, 'trim_clip');

  const rooflineDrift = evaluateTripleFrameDrift({
    first: { verdict: 'holds', score: 0.85 },
    middle: { verdict: 'drifts', score: 0.35, parts: { rooflines: 0.3, mullions: 0.32 } },
    last: { verdict: 'holds', score: 0.8 },
  });
  assert.equal(rooflineDrift.recommendation, 'reject_drift');

  const rejected = reviewDeliverable({
    revision_sha256: REV_SHA,
    track_a: { playable: true, camera_metadata: true, paired_frames: ['first', 'middle', 'last'] },
    track_b: {
      source_track_a_sha256: REV_SHA,
      label: 'Nice render',
      frames: { first: { verdict: 'holds', score: 0.8 }, middle: { verdict: 'drifts', score: 0.3, parts: { openings: 0.3 } }, last: { verdict: 'holds', score: 0.8 } },
    },
    wordmark: { name: 'Whaiao', approved: true },
    cultural_artwork: { inferred: true, approved: false },
  });
  assert.equal(rejected.status, 'rejected');
  assert.equal(rejected.auto_approved, false);
  assert.ok(rejected.blocking.some((b) => b.id === 'track-b-unlabelled'));
  assert.ok(rejected.blocking.some((b) => b.id === 'track-b-drift'));
  assert.ok(rejected.blocking.some((b) => b.id === 'cultural-artwork-unapproved'));
});

test('5-specialist revision orchestrator stores structured findings by revision SHA and requires human approval', async () => {
  const review = await runSpecialistReview({
    project_id: '11111111-1111-4111-8111-111111111111',
    revision_sha256: REV_SHA,
    plan_bim: { ifc: { sha256: REV_SHA, length_unit: 'metre', element_count: 1440, has_global_ids: true, orientation_verified: true } },
    site: { lat: -37.163, lng: 174.904, linz_terrain: true, linz_outlines: true, facades_verified: false, survey_verified: false },
    materials: {
      presentation_reversible: true,
      textures: [{ id: 'red_brick_03', licence: 'CC0', scale_m: 1.0 }],
      fitouts: [
        { id: 'banquet', label: 'Banquet (420)', capacity: 420, reversible: true },
        { id: 'conference', label: 'Conference (312 + 4 accessible)', capacity: 316, reversible: true },
      ],
    },
    camera: {
      width: 1280, height: 720, fps: 24, fov: 42,
      stops: [{ id: '03', label: 'Forecourt', position: [42, 4.7, -8], target: [2.5, 4.6, 3.8], transition: 'cut' }],
    },
    reviewer: {
      track_a: { playable: true, camera_metadata: true, paired_frames: ['first', 'middle', 'last'] },
      wordmark: { name: 'Whaiao', approved: true },
    },
  });

  assert.equal(review.status, 'awaiting_human_approval');
  assert.equal(review.blocking_count, 0);
  assert.deepEqual(Object.keys(review.reports).sort(), ['camera', 'materials', 'plan-bim', 'reviewer', 'site']);

  const stored = storeRevisionReview({}, review);
  assert.equal(stored.latest_revision, REV_SHA);
  assert.ok(stored.revisions[REV_SHA]);

  assert.throws(() => approveRevisionReview(review, { by: '' }), /name the person/i);
  const approved = approveRevisionReview(review, { by: 'Kate', note: 'Approved for preview' });
  assert.equal(approved.status, 'approved');
  assert.equal(approved.approval.by, 'Kate');
});

test('Reversible presentation detail layer is strictly excluded from IFC geometry export', () => {
  const ifcSrc = readFileSync(new URL('../../plan-studio/twins/src/twin/ifc.ts', import.meta.url), 'utf8');
  const presSrc = readFileSync(new URL('../../plan-studio/twins/src/twin/presentationDetail.ts', import.meta.url), 'utf8');
  assert.match(ifcSrc, /isPresentationOnly\(m\)/);
  assert.match(presSrc, /presentationOnly:\s*true/);
  assert.match(presSrc, /excludeFromClash:\s*true/);
});

test('inferIfcClassFromName resolves class-batched GLB node names without false positives', async () => {
  const { inferIfcClassFromName, classify } = await import('../../plan-studio/twins/src/twin/dressRules.ts');
  assert.equal(inferIfcClassFromName('IfcPlate'), 'IfcPlate');
  assert.equal(inferIfcClassFromName('IfcWallStandardCase_01'), 'IfcWallStandardCase');
  assert.equal(inferIfcClassFromName('mesh/IfcMember.002'), 'IfcMember');
  assert.equal(inferIfcClassFromName('IfcRoof'), 'IfcRoof');
  assert.equal(inferIfcClassFromName('world'), '');
  assert.equal(inferIfcClassFromName('IfcMadeUpThing'), '');
  assert.equal(classify({ cls: inferIfcClassFromName('IfcPlate'), name: 'IfcPlate', material: 'IfcPlate' }).finish, 'glass');
  assert.equal(classify({ cls: inferIfcClassFromName('IfcMember'), name: 'IfcMember', material: 'IfcMember' }).finish, 'mullion');
  assert.equal(classify({ cls: inferIfcClassFromName('IfcRoof'), name: 'IfcRoof', material: 'IfcRoof' }).finish, 'roof');
});
