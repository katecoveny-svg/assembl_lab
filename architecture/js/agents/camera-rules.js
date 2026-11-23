// Camera specialist agent (narrow role): prepares repeatable 16:9 camera routes, checks sampled clearances,
// enforces clean editorial cuts where paths through doors/openings are unverified, validates placeholder endings
// (e.g. looking up towards an upper level awaiting revised geometry), and confirms matched multi-variant cuts
// (e.g. Banquet 420 vs Conference 312 + 4 accessible) keep identical camera, lens, lighting and pace.

export const CAMERA_RULES_VERSION = 'camera-rules 2026-11-24a';
export const TARGET_ASPECT = 16 / 9;
export const MIN_EYE_CLEARANCE_BELOW_M = 1.2;
export const MIN_FORWARD_CLEARANCE_M = 1.0;

const num = (v) => typeof v === 'number' && Number.isFinite(v);
const v3 = (p) => Array.isArray(p) && p.length === 3 && p.every(num);
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/**
 * Evaluate each camera stop / beat for clearances, clean-cut requirements through unverified openings,
 * and placeholder upper-level endings.
 */
export function reviewCameraRoute({
  revision_sha256 = '',
  width = 1280,
  height = 720,
  fps = 24,
  fov = 42,
  stops = [],
  variants = [],
} = {}) {
  const findings = [];
  const limits = [];
  const verified_stops = [];
  const clean_cuts = [];

  if (!num(width) || !num(height) || Math.abs(width / height - TARGET_ASPECT) > 0.02) {
    findings.push({ id: 'aspect-ratio', severity: 'blocking', message: `Output size ${width}×${height} is not 16:9.` });
  }
  if (!stops.length) {
    findings.push({ id: 'no-stops', severity: 'blocking', message: 'No camera stops or beats defined for this route.' });
  }

  for (let i = 0; i < stops.length; i++) {
    const s = stops[i];
    const id = String(s.id ?? `stop_${i + 1}`);
    const label = String(s.label ?? id);
    if (!v3(s.position) || !v3(s.target)) {
      findings.push({ id: `stop-${id}-coords`, severity: 'blocking', stop_id: id, message: `Stop ${label} is missing valid 3D position or target coordinates.` });
      continue;
    }
    const below = s.nearest_solid_below_m;
    const fwd = s.nearest_solid_forward_m;
    const swept = s.swept_path_verified === true;

    if (num(below) && below < MIN_EYE_CLEARANCE_BELOW_M) {
      findings.push({ id: `stop-${id}-below`, severity: 'warning', stop_id: id, message: `Stop ${label} eye clearance above floor is ${below.toFixed(2)} m (< ${MIN_EYE_CLEARANCE_BELOW_M} m).` });
    }
    if (num(fwd) && fwd < MIN_FORWARD_CLEARANCE_M) {
      findings.push({ id: `stop-${id}-fwd`, severity: 'blocking', stop_id: id, message: `Stop ${label} forward clearance is ${fwd.toFixed(2)} m (< ${MIN_FORWARD_CLEARANCE_M} m).` });
    }
    if (s.crosses_opening && !swept) {
      if (s.transition !== 'cut') {
        findings.push({
          id: `stop-${id}-opening-cut`,
          severity: 'blocking',
          stop_id: id,
          message: `Stop ${label} crosses an unverified door/opening without swept-path clearance: use a clean editorial cut instead of traversing through it.`,
        });
      } else {
        clean_cuts.push({ stop_id: id, label, reason: 'Unverified opening crossing kept as clean editorial cut.' });
      }
    }
    if (s.placeholder === true) {
      limits.push(`Beat ${label} is a labelled placeholder awaiting revised upper-level geometry.`);
    }
    if (!swept) {
      limits.push(`Stop ${label}: sampled ray check only (not a full swept-volume clearance proof).`);
    }
    verified_stops.push({
      id,
      label,
      transition: s.transition || (swept ? 'continuous' : 'cut'),
      nearest_solid_below_m: num(below) ? below : null,
      nearest_solid_forward_m: num(fwd) ? fwd : null,
      swept_path_verified: swept,
      placeholder: s.placeholder === true,
    });
  }

  // Matched multi-variant check (e.g. Banquet 420 vs Conference 312 + 4 accessible):
  // camera, lens, lighting and pace MUST match; only fit-out changes.
  if (variants.length >= 2) {
    const base = variants[0];
    for (let k = 1; k < variants.length; k++) {
      const v = variants[k];
      if (v.fov !== base.fov) {
        findings.push({ id: `variant-${v.id}-fov`, severity: 'blocking', message: `Variant "${v.id}" FOV (${v.fov}°) does not match "${base.id}" (${base.fov}°).` });
      }
      if (v.sun_hour !== base.sun_hour || v.exposure !== base.exposure) {
        findings.push({ id: `variant-${v.id}-light`, severity: 'blocking', message: `Variant "${v.id}" lighting does not match "${base.id}". Keep lighting identical across fit-out cuts.` });
      }
      if (Math.abs((v.duration_s ?? 0) - (base.duration_s ?? 0)) > 0.05) {
        findings.push({ id: `variant-${v.id}-pace`, severity: 'blocking', message: `Variant "${v.id}" duration (${v.duration_s}s) differs from "${base.id}" (${base.duration_s}s).` });
      }
      if (Array.isArray(base.stops) && Array.isArray(v.stops)) {
        if (base.stops.length !== v.stops.length) {
          findings.push({ id: `variant-${v.id}-stop-count`, severity: 'blocking', message: `Variant "${v.id}" has ${v.stops.length} stops vs ${base.stops.length} in "${base.id}".` });
        } else {
          for (let j = 0; j < base.stops.length; j++) {
            const a = base.stops[j], b = v.stops[j];
            if (v3(a.position) && v3(b.position) && dist(a.position, b.position) > 0.005) {
              findings.push({ id: `variant-${v.id}-pos-${j}`, severity: 'blocking', message: `Variant "${v.id}" stop ${j + 1} camera position differs from "${base.id}".` });
            }
            if (v3(a.target) && v3(b.target) && dist(a.target, b.target) > 0.005) {
              findings.push({ id: `variant-${v.id}-tgt-${j}`, severity: 'blocking', message: `Variant "${v.id}" stop ${j + 1} target differs from "${base.id}".` });
            }
          }
        }
      }
      if (v.building_sha256 && base.building_sha256 && v.building_sha256 !== base.building_sha256) {
        findings.push({ id: `variant-${v.id}-building`, severity: 'blocking', message: `Variant "${v.id}" building geometry hash differs from "${base.id}". Change fit-out only, never the building.` });
      }
    }
  }

  const hasBlocking = findings.some((f) => f.severity === 'blocking');
  const hasWarning = findings.some((f) => f.severity === 'warning');
  return {
    agent: 'camera',
    version: CAMERA_RULES_VERSION,
    revision_sha256: String(revision_sha256),
    format: { width, height, fps, fov, aspect: '16:9' },
    status: hasBlocking ? 'blocked' : hasWarning ? 'needs_review' : 'ready',
    findings,
    verified_stops,
    clean_cuts,
    variants_checked: variants.map((v) => v.id),
    limits: [...new Set(limits)],
    auto_approved: false,
  };
}

/**
 * Build deterministic camera-metadata JSON sidecar for a Track A exact-model film export.
 */
export function buildCameraMetadata({
  project = '',
  revision_sha256 = '',
  variant = 'default',
  width = 1280,
  height = 720,
  fps = 24,
  fov = 42,
  duration_s = 0,
  sun_hour = null,
  frames = [],
  stops = [],
  clean_cuts = [],
} = {}) {
  return {
    schema: 'assembl.camera-metadata.v1',
    track: 'A-exact-model',
    project: String(project),
    revision_sha256: String(revision_sha256),
    variant: String(variant),
    generated_at: new Date().toISOString(),
    resolution: { width, height, aspect: '16:9' },
    fps,
    fov,
    duration_s: Math.round(duration_s * 1000) / 1000,
    sun_hour,
    stops,
    clean_cuts,
    frame_count: frames.length,
    frames,
  };
}
