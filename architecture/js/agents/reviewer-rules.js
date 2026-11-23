// Independent Reviewer specialist agent (narrow role): compares rendered Track A and optional Track B AI outputs
// against drawings and the exact model. Checks first, middle and last frames for drift in rooflines, openings,
// mullions, furniture and planting; verifies AI footage labelling, approved wordmark usage, and rejects inferred
// cultural artwork as unapproved. Emits structured findings against the revision and NEVER auto-approves.

export const REVIEWER_VERSION = 'reviewer-rules 2026-11-24a';
export const DRIFT_CATEGORIES = Object.freeze(['rooflines', 'openings', 'mullions', 'furniture', 'planting']);
export const MIN_HOLD_SCORE = 0.52;
export const REQUIRED_AI_LABEL_RE = /ai|generated|artist.{0,8}impression|look study/i;

const num = (v) => typeof v === 'number' && Number.isFinite(v);

/**
 * Evaluate a Track B AI clip's first, middle and last frame checks against Track A.
 * Each frame check may carry { verdict: 'holds'|'drifts'|'not checked', score: number, parts?: Record<string, number> }.
 * Returns a recommendation: 'accept_study' | 'trim_clip' | 'reject_drift' | 'incomplete'.
 */
export function evaluateTripleFrameDrift({ first = null, middle = null, last = null, threshold = MIN_HOLD_SCORE } = {}) {
  const frames = { first, middle, last };
  const missing = Object.entries(frames).filter(([, f]) => !f || f.verdict === 'not checked').map(([k]) => k);
  if (missing.length) {
    return {
      recommendation: 'incomplete',
      drifted_frames: [],
      drifted_categories: [],
      missing_frames: missing,
      reason: `Missing Track A comparison on ${missing.join(', ')} frame(s). Compare first, middle and last frames before accepting.`,
    };
  }

  const drifted_frames = [];
  const drifted_categories = new Set();

  for (const [slot, check] of Object.entries(frames)) {
    const scoreFail = num(check.score) && check.score < threshold;
    const verdictFail = check.verdict === 'drifts';
    if (verdictFail || scoreFail) drifted_frames.push(slot);
    if (check.parts && typeof check.parts === 'object') {
      for (const cat of DRIFT_CATEGORIES) {
        const v = check.parts[cat];
        if (v === 'drifts' || (num(v) && v < threshold)) drifted_categories.add(cat);
      }
    }
  }

  const cats = [...drifted_categories];
  if (!drifted_frames.length && !cats.length) {
    return {
      recommendation: 'accept_study',
      drifted_frames: [],
      drifted_categories: [],
      missing_frames: [],
      reason: 'First, middle and last frames hold Track A geometry within threshold. Still requires human review.',
    };
  }

  // If ONLY the tail (last frame) or ONLY the head (first frame) drifts while middle holds and structural categories hold,
  // recommend trimming; if middle drifts or structural categories (rooflines/openings/mullions) drift, reject and keep Track A.
  const structuralDrift = cats.some((c) => c === 'rooflines' || c === 'openings' || c === 'mullions');
  if (drifted_frames.length === 1 && drifted_frames[0] !== 'middle' && !structuralDrift) {
    return {
      recommendation: 'trim_clip',
      drifted_frames,
      drifted_categories: cats,
      missing_frames: [],
      reason: `Drift detected on ${drifted_frames[0]} frame only (${cats.join(', ') || 'edge score'}). Trim that end or fall back to Track A.`,
    };
  }

  return {
    recommendation: 'reject_drift',
    drifted_frames,
    drifted_categories: cats,
    missing_frames: [],
    reason: `Geometry drift on ${drifted_frames.join(', ') || 'key parts'}${cats.length ? ` (${cats.join(', ')})` : ''}. Reject AI clip and use Track A exact-model footage.`,
  };
}

/**
 * Independent Reviewer run against a specific model revision.
 */
export function reviewDeliverable({
  revision_sha256 = '',
  track_a = null,
  track_b = null,
  wordmark = null,
  cultural_artwork = null,
  drawing_checks = [],
} = {}) {
  const blocking = [];
  const advisory = [];

  if (!revision_sha256) {
    blocking.push({ id: 'missing-revision', message: 'Deliverable review must bind to a specific revision SHA-256.' });
  }
  if (!track_a || !track_a.playable) {
    blocking.push({ id: 'track-a-missing', message: 'Track A exact-model playable master film is missing.' });
  } else {
    if (!track_a.camera_metadata) advisory.push({ id: 'track-a-meta', message: 'Track A camera metadata sidecar was not attached.' });
    if (!track_a.paired_frames || track_a.paired_frames.length < 3) {
      advisory.push({ id: 'track-a-frames', message: 'Attach paired first, middle and last source frames from Track A.' });
    }
  }

  let drift = null;
  if (track_b) {
    if (!track_b.source_track_a_sha256) {
      blocking.push({ id: 'track-b-no-source', message: 'Track B AI study must start from a Track A motion clip and reference stills, not a text prompt alone.' });
    }
    if (!track_b.label || !REQUIRED_AI_LABEL_RE.test(String(track_b.label))) {
      blocking.push({ id: 'track-b-unlabelled', message: 'Track B AI footage must be explicitly labelled as AI-generated look study throughout.' });
    }
    drift = evaluateTripleFrameDrift(track_b.frames || {});
    if (drift.recommendation === 'reject_drift' || drift.recommendation === 'incomplete') {
      blocking.push({ id: 'track-b-drift', message: drift.reason, drift });
    } else if (drift.recommendation === 'trim_clip') {
      advisory.push({ id: 'track-b-trim', message: drift.reason, drift });
    }
  }

  if (wordmark && wordmark.approved === false) {
    blocking.push({ id: 'wordmark-unapproved', message: `Wordmark "${wordmark.name || 'unknown'}" is not marked approved. Use the approved practice wordmark.` });
  }
  if (cultural_artwork && cultural_artwork.inferred === true && cultural_artwork.approved !== true) {
    blocking.push({
      id: 'cultural-artwork-unapproved',
      message: 'Inferred or AI-generated cultural artwork is present without recorded approval. Remove or hide until expressly approved by the design team and rights-holder.',
    });
  }

  for (const dc of drawing_checks) {
    if (dc?.status === 'fail') blocking.push({ id: dc.id || 'drawing-mismatch', message: dc.message || 'Output disagrees with reference drawings.' });
    else if (dc?.status === 'warn') advisory.push({ id: dc.id || 'drawing-note', message: dc.message || 'Check against reference drawings.' });
  }

  return {
    agent: 'reviewer',
    version: REVIEWER_VERSION,
    revision_sha256: String(revision_sha256),
    status: blocking.length ? 'rejected' : advisory.length ? 'needs_human_review' : 'ready_for_human_gate',
    verdict: blocking.length ? 'hold_and_fix' : 'ready_for_human_approval',
    drift,
    blocking,
    advisory,
    auto_approved: false,
  };
}
