// Revision-bound specialist review pack: coordinates all five narrow specialist agents
//   1. Plan/BIM (dimensions, provenance, element IDs, scale check, conflicts)
//   2. Site (georeferencing, LINZ context, unverified facades/parcels)
//   3. Materials/Interiors (finishes, licence/scale checks, reversible fit-outs)
//   4. Camera (16:9 route, clearances, clean cuts, matched variant cuts)
//   5. Independent Reviewer (drawing & exact-model comparison, triple-frame drift, wordmark/cultural artwork gate)
// Stores structured findings against the revision SHA-256 in project.agents.revisions[sha].
// People approve changes and paid renders; agents never auto-approve.

import { createJob, runJob, approve, STATUS } from '../conductor.js';
import { reviewPlanBim } from './plan-bim-rules.js';
import { reviewCameraRoute } from './camera-rules.js';
import { reviewDeliverable } from './reviewer-rules.js';

export const REVISION_SCHEMA = 'assembl.specialist-review.v1';

export const SPECIALIST_STEPS = Object.freeze([
  { id: 'plan-bim', label: 'Plan / BIM specialist' },
  { id: 'site', label: 'Site context specialist' },
  { id: 'materials', label: 'Materials & interiors specialist' },
  { id: 'camera', label: 'Camera route specialist' },
  { id: 'reviewer', label: 'Independent reviewer' },
  { id: 'human-approve', label: 'Human approval gate', person: true },
]);

/** Narrow Site specialist wrapper over existing site-brief facts and LINZ context. */
export function reviewSiteContext({ revision_sha256 = '', site = null } = {}) {
  const findings = [];
  const limits = [];
  if (!site || site.lat == null || site.lng == null) {
    findings.push({ id: 'site-point-missing', severity: 'blocking', message: 'Site coordinates (NZTM / WGS84) are not set.' });
  }
  if (!site?.linz_terrain) limits.push('LINZ 1m LiDAR DEM/DSM terrain not yet verified on this revision.');
  if (!site?.linz_outlines) limits.push('LINZ NZ Building Outlines not yet registered on this revision.');
  if (site?.facades_verified !== true) limits.push('Existing campus/neighbour facades are reference-only or unverified; do not invent historic buildings.');
  if (site?.survey_verified !== true) limits.push('Placement is proposal-grade, not a licensed cadastral survey.');
  const hasBlocking = findings.some((f) => f.severity === 'blocking');
  return {
    agent: 'site',
    revision_sha256: String(revision_sha256),
    georeferenced: !!(site && site.lat != null && site.lng != null),
    linz_terrain: !!site?.linz_terrain,
    linz_outlines: !!site?.linz_outlines,
    status: hasBlocking ? 'blocked' : limits.length ? 'needs_review' : 'ready',
    findings,
    limits,
    auto_approved: false,
  };
}

/** Narrow Materials/Interiors specialist wrapper checking licence-cleared PBR maps and reversible fit-outs. */
export function reviewMaterialsInteriors({ revision_sha256 = '', textures = [], fitouts = [], presentation_reversible = true } = {}) {
  const findings = [];
  const limits = [];
  if (!presentation_reversible) {
    findings.push({ id: 'presentation-mutates-geometry', severity: 'blocking', message: 'Presentation detail must remain reversible and separate from geometry, measurement and clash calculations.' });
  }
  for (const t of textures) {
    if (!t.licence) findings.push({ id: `tex-licence-${t.id || 'x'}`, severity: 'blocking', message: `Texture "${t.id || 'unnamed'}" is missing a licence check.` });
    if (!(typeof t.scale_m === 'number' && t.scale_m > 0)) findings.push({ id: `tex-scale-${t.id || 'x'}`, severity: 'warning', message: `Texture "${t.id || 'unnamed'}" is missing physical metre scale.` });
  }
  if (!fitouts.length) limits.push('No reversible interior fit-out variant attached yet.');
  for (const f of fitouts) {
    if (f.reversible === false) findings.push({ id: `fitout-rev-${f.id}`, severity: 'blocking', message: `Fit-out "${f.id}" must be reversible and not alter the building.` });
  }
  const hasBlocking = findings.some((f) => f.severity === 'blocking');
  const hasWarning = findings.some((f) => f.severity === 'warning');
  return {
    agent: 'materials-interiors',
    revision_sha256: String(revision_sha256),
    texture_count: textures.length,
    fitouts: fitouts.map((f) => ({ id: f.id, label: f.label || f.id, capacity: f.capacity ?? null, reversible: f.reversible !== false })),
    status: hasBlocking ? 'blocked' : hasWarning ? 'needs_review' : 'ready',
    findings,
    limits,
    auto_approved: false,
  };
}

/**
 * Run all five narrow specialist agents through the existing Conductor and return a revision-bound record
 * paused at the human approval gate.
 */
export async function runSpecialistReview({
  project_id,
  revision_sha256,
  plan_bim = {},
  site = {},
  materials = {},
  camera = {},
  reviewer = {},
  now = () => new Date().toISOString(),
  onChange = () => {},
} = {}) {
  if (!revision_sha256) throw new Error('A specialist review needs a revision_sha256.');
  const job = createJob(
    { id: `rev_${String(revision_sha256).slice(0, 12)}_${Date.now().toString(36)}`, kind: 'specialist-review', project_id: project_id ?? null, steps: SPECIALIST_STEPS },
    now,
  );
  const reports = {};
  const handlers = {
    'plan-bim': async () => {
      reports['plan-bim'] = reviewPlanBim({ ...plan_bim, revision_sha256 });
      return { note: `${reports['plan-bim'].status} (${reports['plan-bim'].findings.length} finding(s))` };
    },
    site: async () => {
      reports.site = reviewSiteContext({ revision_sha256, site });
      return { note: `${reports.site.status} (${reports.site.limits.length} limit(s))` };
    },
    materials: async () => {
      reports.materials = reviewMaterialsInteriors({ revision_sha256, ...materials });
      return { note: `${reports.materials.status} (${reports.materials.fitouts.length} fit-out(s))` };
    },
    camera: async () => {
      reports.camera = reviewCameraRoute({ ...camera, revision_sha256 });
      return { note: `${reports.camera.status} (${reports.camera.verified_stops.length} stop(s))` };
    },
    reviewer: async () => {
      reports.reviewer = reviewDeliverable({ ...reviewer, revision_sha256 });
      return { note: `${reports.reviewer.verdict} (${reports.reviewer.blocking.length} blocking)` };
    },
    'human-approve': {
      approval: () => 'A person must review the specialist findings and explicitly approve changes or paid renders.',
      run: async () => ({ note: 'Approved by a person.' }),
    },
  };
  await runJob(job, handlers, { now, onChange });
  const blocking_count =
    (reports['plan-bim']?.findings?.filter((f) => f.severity === 'blocking').length ?? 0) +
    (reports.site?.findings?.filter((f) => f.severity === 'blocking').length ?? 0) +
    (reports.materials?.findings?.filter((f) => f.severity === 'blocking').length ?? 0) +
    (reports.camera?.findings?.filter((f) => f.severity === 'blocking').length ?? 0) +
    (reports.reviewer?.blocking?.length ?? 0);

  return {
    schema: REVISION_SCHEMA,
    project_id: project_id ?? null,
    revision_sha256: String(revision_sha256),
    created_at: now(),
    updated_at: now(),
    status: blocking_count > 0 ? 'blocked' : 'awaiting_human_approval',
    blocking_count,
    reports,
    job,
    approval: null,
  };
}

/**
 * Record human approval against a revision review pack. Refuses if blocking findings remain unless override_reason is supplied.
 */
export function approveRevisionReview(record, { by, note = '', override_reason = '' } = {}, now = () => new Date().toISOString()) {
  const who = String(by ?? '').trim();
  if (!who) throw new Error('Human approval must name the person.');
  if (record.blocking_count > 0 && !String(override_reason).trim()) {
    throw new Error(`Cannot approve while ${record.blocking_count} blocking finding(s) remain without an explicit override reason.`);
  }
  const job = structuredClone(record.job);
  const step = job.steps.find((s) => s.id === 'human-approve');
  if (step && step.status === STATUS.person) approve(job, 'human-approve', who, now);
  return {
    ...record,
    job,
    status: 'approved',
    updated_at: now(),
    approval: { by: who, at: now(), note: String(note).trim(), override_reason: String(override_reason).trim() || null },
  };
}

/**
 * Store a revision-bound specialist review pack onto a project's `agents` object without losing other revisions.
 */
export function storeRevisionReview(projectAgents, record) {
  const base = projectAgents && typeof projectAgents === 'object' ? { ...projectAgents } : {};
  const revisions = base.revisions && typeof base.revisions === 'object' ? { ...base.revisions } : {};
  revisions[record.revision_sha256] = record;
  return { ...base, latest_revision: record.revision_sha256, revisions };
}
