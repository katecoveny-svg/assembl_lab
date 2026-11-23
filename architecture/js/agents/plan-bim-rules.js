// Plan / BIM specialist agent (narrow role): checks IFC source-of-truth provenance, element IDs, metres, orientation,
// PDF measured/traced/assumed states, sheet references, scale calibration checks, and flags conflicting dimensions
// instead of guessing. Accepts Revit-exported IFC; explicitly refuses native .rvt parsing.
// Pure functions, no DOM or network, deterministic and testable on their own.

export const PLAN_BIM_VERSION = 'plan-bim-rules 2026-11-24a';
export const PROVENANCE_STATES = Object.freeze(['measured', 'traced', 'assumed']);
export const DEFAULT_DIM_TOLERANCE_MM = 50;
export const DEFAULT_SCALE_TOLERANCE_PCT = 1.5;

const SHA256_RE = /^[a-f0-9]{64}$/i;
const num = (v) => typeof v === 'number' && Number.isFinite(v);

/**
 * Check an intake file's format and authority.
 * IFC is the geometry source of truth when supplied; Revit-exported IFC is accepted; native .rvt is never claimed parsed.
 */
export function classifyIntakeSource({ name = '', bytes = 0, sha256 = '', hasIfc = false } = {}) {
  const lower = String(name).toLowerCase();
  const ext = lower.match(/\.([a-z0-9]+)$/)?.[1] ?? '';
  if (ext === 'rvt') {
    return {
      accepted: false,
      kind: 'rvt',
      authority: 'unsupported',
      reason: 'Native .rvt files are not parsed here. Export IFC2x3 or IFC4 from Revit (metres, retaining GlobalIds) and upload the IFC.',
    };
  }
  if (ext === 'ifc') {
    return {
      accepted: true,
      kind: 'ifc',
      authority: 'source_of_truth',
      fingerprint_valid: SHA256_RE.test(String(sha256)),
      reason: 'IFC is the geometry source of truth (element IDs, metres, orientation and revision fingerprint kept).',
    };
  }
  if (ext === 'glb' || ext === 'gltf') {
    return {
      accepted: true,
      kind: ext,
      authority: hasIfc ? 'derived_browser_copy' : 'mesh_copy',
      fingerprint_valid: SHA256_RE.test(String(sha256)),
      reason: hasIfc
        ? 'Browser GLB paired with source IFC: source IFC remains geometry authority.'
        : 'Mesh-only GLB without paired IFC: retain hash and verify element GUIDs and metre scale before measurements.',
    };
  }
  if (ext === 'pdf') {
    return {
      accepted: true,
      kind: 'pdf',
      authority: hasIfc ? 'reference_drawing' : 'editable_plan_extract',
      fingerprint_valid: SHA256_RE.test(String(sha256)),
      reason: hasIfc
        ? 'PDF drawing set paired with IFC: IFC owns 3D geometry; PDFs provide sheet references, capacities and notes.'
        : 'PDF drawing intake: produces editable walls, openings and levels with sheet references, scale check and explicit measured/traced/assumed states.',
    };
  }
  return {
    accepted: false,
    kind: ext || 'unknown',
    authority: 'unsupported',
    reason: `Unsupported geometry/plan intake format (.${ext || 'unknown'}). Upload IFC, GLB or PDF.`,
  };
}

/**
 * Normalize a single element's provenance state to one of 'measured' | 'traced' | 'assumed'.
 */
export function provenanceStateOf(ev) {
  if (!ev) return 'assumed';
  if (PROVENANCE_STATES.includes(ev.state)) return ev.state;
  const src = String(ev.src ?? ev.source ?? '').toLowerCase();
  if (src === 'drawing' || src === 'written' || src === 'ifc' || src === 'measured') return 'measured';
  if (src === 'traced' || src === 'scaled' || src === 'ai' || src === 'text' || src === 'user') return 'traced';
  return 'assumed';
}

/**
 * Verify drawing scale by comparing a calibrated/measured reference span against a printed dimension string.
 */
export function checkScale({ printed_scale = null, expected_mm = null, measured_mm = null, tolerance_pct = DEFAULT_SCALE_TOLERANCE_PCT } = {}) {
  if (!num(printed_scale) || printed_scale <= 0) {
    return { printed_scale: null, calibrated_scale: null, delta_pct: null, status: 'uncalibrated', note: 'No printed scale confirmed on sheet; calibrate two known points before measuring.' };
  }
  if (!num(expected_mm) || expected_mm <= 0 || !num(measured_mm) || measured_mm <= 0) {
    return { printed_scale, calibrated_scale: null, delta_pct: null, status: 'unverified', note: `Printed scale 1:${printed_scale} read from sheet; check against one written dimension.` };
  }
  const ratio = measured_mm / expected_mm;
  const delta_pct = Math.round(Math.abs(ratio - 1) * 1000) / 10;
  const calibrated_scale = Math.round((printed_scale / ratio) * 10) / 10;
  const ok = delta_pct <= tolerance_pct;
  return {
    printed_scale,
    calibrated_scale,
    delta_pct,
    status: ok ? 'verified' : 'mismatch',
    note: ok
      ? `Scale 1:${printed_scale} verified within ${delta_pct}% against written ${Math.round(expected_mm)} mm dimension.`
      : `Scale conflict: measured ${Math.round(measured_mm)} mm vs written ${Math.round(expected_mm)} mm (${delta_pct}% off; effective 1:${calibrated_scale}). Confirm scale before trusting dimensions.`,
  };
}

/**
 * Detect conflicting dimensions between printed dimension strings and measured elements (walls, openings, levels),
 * or between duplicate/cross-sheet dimensions for the same element. Never silently overwrites or guesses.
 */
export function detectDimensionConflicts({
  walls = [],
  openings = [],
  levels = [],
  printed_dimensions = [],
  tolerance_mm = DEFAULT_DIM_TOLERANCE_MM,
  sheet_ref = '',
} = {}) {
  const conflicts = [];
  const wallById = new Map(walls.map((w) => [w.id, w]));
  const openingById = new Map(openings.map((o) => [o.id, o]));
  const levelById = new Map(levels.map((l) => [l.id, l]));

  const wallLen = (w) => (w?.a && w?.b ? Math.round(Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1])) : null);

  for (const d of printed_dimensions) {
    if (!d || !num(d.printed_mm) || d.printed_mm <= 0) continue;
    const sheet = d.sheet_ref || sheet_ref || 'unspecified sheet';
    let measured = num(d.measured_mm) ? Math.round(d.measured_mm) : null;
    if (measured == null && d.element_id) {
      if (wallById.has(d.element_id)) measured = wallLen(wallById.get(d.element_id));
      else if (openingById.has(d.element_id)) measured = Math.round(openingById.get(d.element_id).w);
      else if (levelById.has(d.element_id)) measured = Math.round(levelById.get(d.element_id).z);
    }
    if (measured == null) continue;
    const delta_mm = Math.round(measured - d.printed_mm);
    if (Math.abs(delta_mm) > tolerance_mm) {
      conflicts.push({
        id: `conflict_${conflicts.length + 1}`,
        severity: Math.abs(delta_mm) > tolerance_mm * 3 ? 'blocking' : 'warning',
        element_id: d.element_id || null,
        element_kind: d.element_kind || (wallById.has(d.element_id) ? 'wall' : openingById.has(d.element_id) ? 'opening' : levelById.has(d.element_id) ? 'level' : 'dimension'),
        sheet_ref: sheet,
        printed_mm: Math.round(d.printed_mm),
        measured_mm: measured,
        delta_mm,
        label: d.label || d.text || `${d.printed_mm} mm`,
        action: 'Confirm which dimension governs; geometry was not silently altered.',
      });
    }
  }

  // Cross-sheet duplicates on the same element_id with disagreeing printed_mm
  const byEl = new Map();
  for (const d of printed_dimensions) {
    if (!d?.element_id || !num(d.printed_mm)) continue;
    if (!byEl.has(d.element_id)) byEl.set(d.element_id, []);
    byEl.get(d.element_id).push(d);
  }
  for (const [elId, list] of byEl) {
    if (list.length < 2) continue;
    const vals = list.map((x) => Math.round(x.printed_mm));
    const spread = Math.max(...vals) - Math.min(...vals);
    if (spread > tolerance_mm) {
      conflicts.push({
        id: `conflict_xsheet_${conflicts.length + 1}`,
        severity: 'blocking',
        element_id: elId,
        element_kind: 'cross_sheet',
        sheet_ref: [...new Set(list.map((x) => x.sheet_ref || sheet_ref || 'unspecified'))].join(' vs '),
        printed_mm: vals[0],
        measured_mm: vals[vals.length - 1],
        delta_mm: spread,
        label: `Cross-sheet disagreement on ${elId} (${vals.join(' mm vs ')} mm)`,
        action: 'Resolve sheet discrepancy with the architect before locking geometry.',
      });
    }
  }

  return conflicts;
}

/**
 * Attach explicit provenance states, sheet references, scale check, and conflict list to a PDF-extracted plan model.
 */
export function annotatePlanProvenance(model, { sheet_ref = '', scale_check = null, printed_dimensions = [], tolerance_mm = DEFAULT_DIM_TOLERANCE_MM } = {}) {
  const walls = (model?.walls ?? []).map((w) => ({
    ...w,
    state: provenanceStateOf(w.ev),
    sheet_ref: w.sheet_ref || sheet_ref || '',
  }));
  const openings = (model?.openings ?? []).map((o) => ({
    ...o,
    state: provenanceStateOf(o.ev),
    height_state: o.ev?.height_state || 'assumed',
    sheet_ref: o.sheet_ref || sheet_ref || '',
  }));
  const levels = (model?.levels ?? []).map((l) => ({
    ...l,
    state: l.state || (l.ev ? provenanceStateOf(l.ev) : l.z === 0 ? 'assumed' : 'measured'),
    sheet_ref: l.sheet_ref || sheet_ref || '',
  }));
  const conflicts = detectDimensionConflicts({ walls, openings, levels, printed_dimensions, tolerance_mm, sheet_ref });
  const counts = { measured: 0, traced: 0, assumed: 0 };
  for (const item of [...walls, ...openings, ...levels]) counts[item.state] = (counts[item.state] || 0) + 1;
  return {
    ...model,
    walls,
    openings,
    levels,
    provenance: {
      sheet_ref: sheet_ref || '',
      scale_check: scale_check || checkScale({}),
      counts,
      conflicts,
    },
  };
}

/**
 * Plan/BIM specialist review run: inspects IFC + PDF provenance, units, element IDs, scale checks and dimension conflicts.
 */
export function reviewPlanBim({
  revision_sha256 = '',
  ifc = null,
  pdf_model = null,
  printed_dimensions = [],
  scale_check = null,
  sheets = [],
} = {}) {
  const findings = [];
  const limits = [];
  const hasIfc = !!ifc;

  if (ifc) {
    if (!SHA256_RE.test(String(ifc.sha256 || revision_sha256))) {
      findings.push({ id: 'ifc-hash', severity: 'blocking', message: 'IFC source revision is missing a valid SHA-256 fingerprint.' });
    }
    const unit = String(ifc.length_unit || '').toLowerCase();
    if (unit && unit !== 'metre' && unit !== 'metres' && unit !== 'm') {
      findings.push({ id: 'ifc-units', severity: 'blocking', message: `IFC length unit is "${ifc.length_unit}", not metres; verify unit conversion before measurement.` });
    }
    if (!num(ifc.element_count) || ifc.element_count <= 0) {
      findings.push({ id: 'ifc-elements', severity: 'warning', message: 'IFC element count was not recorded.' });
    }
    if (ifc.has_global_ids === false) {
      findings.push({ id: 'ifc-guids', severity: 'blocking', message: 'Element GlobalIds were stripped from the IFC/GLB derivative; keep revision-specific IDs.' });
    }
    if (!ifc.orientation_verified) {
      limits.push('IFC true-north / site orientation is not yet survey-confirmed.');
    }
  } else if (!pdf_model) {
    findings.push({ id: 'no-source', severity: 'blocking', message: 'No IFC model or calibrated PDF plan has been attached to this revision.' });
  }

  let conflicts = [];
  if (pdf_model) {
    const sc = scale_check || pdf_model.provenance?.scale_check || checkScale({});
    if (sc.status === 'mismatch') {
      findings.push({ id: 'pdf-scale-mismatch', severity: 'blocking', message: sc.note });
    } else if (sc.status !== 'verified') {
      findings.push({ id: 'pdf-scale-unverified', severity: 'warning', message: sc.note });
    }
    conflicts = detectDimensionConflicts({
      walls: pdf_model.walls ?? [],
      openings: pdf_model.openings ?? [],
      levels: pdf_model.levels ?? [],
      printed_dimensions,
      sheet_ref: pdf_model.provenance?.sheet_ref || '',
    });
    for (const c of conflicts) {
      findings.push({
        id: c.id,
        severity: c.severity,
        element_id: c.element_id,
        sheet_ref: c.sheet_ref,
        message: `Dimension conflict (${c.sheet_ref}): printed ${c.printed_mm} mm vs measured ${c.measured_mm} mm (Δ ${c.delta_mm} mm). ${c.action}`,
      });
    }
    if (hasIfc) {
      limits.push('IFC is held as geometry source of truth; PDF measurements are cross-check/reference only.');
    }
  }

  if (sheets.length) {
    const unrev = sheets.filter((s) => !s.number);
    if (unrev.length) findings.push({ id: 'sheet-numbers', severity: 'warning', message: `${unrev.length} sheet(s) lack a confirmed sheet number.` });
  }

  const hasBlocking = findings.some((f) => f.severity === 'blocking');
  const hasWarning = findings.some((f) => f.severity === 'warning');
  return {
    agent: 'plan-bim',
    version: PLAN_BIM_VERSION,
    revision_sha256: String(revision_sha256 || ifc?.sha256 || ''),
    geometry_authority: hasIfc ? 'ifc' : pdf_model ? 'pdf_editable' : 'none',
    status: hasBlocking ? 'blocked' : hasWarning ? 'needs_review' : 'ready',
    findings,
    conflicts,
    limits,
    auto_approved: false,
  };
}
