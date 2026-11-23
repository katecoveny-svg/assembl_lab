// The 3D look expert's rules: the reviewer for the browser twin, run before a person's look gate. Plain script with no imports and
// no browser. Kept twice, byte for byte: architecture/js/agents/look-rules.js (the ops page) and
// plan-studio/twins/src/twin/agents/look-rules.js (the 3D page's build); tests/architecture/look-expert.test.mjs checks they match.
//
// The 3D page measures the scene (agents/lookExpert.ts: nothing floating or buried, glass and frames, shadows, the planting's
// clear band, grey default materials left, frame time at the phone tier, the standard views drawn); scoreLook() turns those
// measures into a short scored checklist. An optional critique by a model (through /api/agent-judge, mode "look") is shown
// beside it, marked as a model's opinion. The reviewer never approves: its report always waits for a person at the look gate.

export const LOOK_VERSION = 'look-rules 2026-11-23a';
export const REPORT_TYPE = 'assembl.look-review.v1';
export const RESULTS = ['pass', 'check', 'fail', 'not measured'];
/** the standard views, by name: where the camera stands, from the model's own bounds */
export const VIEWS = ['three-quarter', 'entry', 'aerial'];

/** thresholds. All assumed: what the look should reach before a person looks, not a standard */
export const LIMITS = Object.freeze({
  rest: { m: 0.03, src: 'assumed', what: 'a part more than this above or below what holds it up is floating or buried' },
  band: { m: 1.8, src: 'assumed', what: 'planting kept this far off the building (the model-dress clear band)' },
  casters: { ratio: 0.5, src: 'assumed', what: 'at least this share of the solid parts cast a shadow' },
  phoneMs: { ms: 33, warn: 50, src: 'assumed', what: 'median frame time at the phone tier: 30 frames a second, 20 at worst' },
});

const ok = (v) => typeof v === 'number' && Number.isFinite(v);
const names = (l, n = 4) => (Array.isArray(l) && l.length ? `: ${l.slice(0, n).join(', ')}${l.length > n ? ` and ${l.length - n} more` : ''}` : '');
const item = (id, label, result, value, want, src) => ({ id, label, result, value, want, src });

/**
 * measures (all optional; a missing measure is "not measured", never a pass):
 *   floating: [names], buried: [names]              parts resting wrong, by more than LIMITS.rest
 *   windows, glassless: [names], frameless: [names]  glazed elements; those with no glass; with no frame (drawn or modelled)
 *   shadowMap: bool, shadowLights: n, casters: n, solids: n
 *   plants: n, inBand: [names]                       planting pieces; those inside the clear band
 *   greyDefaults: [names]                            meshes still on a plain default material
 *   frameMs: { median, tier, where }                  measured frame time at the phone tier
 *   views: { [name]: { ok: bool } }                  the standard views drawn and not blank
 */
export function scoreLook(m = {}, critique = null) {
  const L = LIMITS, out = [];
  // resting
  if (Array.isArray(m.floating) && Array.isArray(m.buried)) {
    const n = m.floating.length + m.buried.length;
    out.push(item('rest', 'Nothing floating or buried', n ? 'fail' : 'pass', n ? `${m.floating.length} floating${names(m.floating)}; ${m.buried.length} buried${names(m.buried)}` : 'every part rests on what holds it up', `within ${L.rest.m * 1000} mm`, 'measured in this view'));
  } else out.push(item('rest', 'Nothing floating or buried', 'not measured', '', `within ${L.rest.m * 1000} mm`, ''));
  // glass and frames
  if (ok(m.windows) && Array.isArray(m.glassless) && Array.isArray(m.frameless)) {
    if (!m.windows) out.push(item('glass', 'Glass in every window and glazed door', 'not measured', 'the model has no windows or glazed doors', 'glass', 'counted in the model'));
    else {
      out.push(item('glass', 'Glass in every window and glazed door', m.glassless.length ? 'fail' : 'pass', m.glassless.length ? `${m.glassless.length} of ${m.windows} with no glass${names(m.glassless)}` : `all ${m.windows} have glass`, 'glass', 'counted in the model'));
      out.push(item('frames', 'A frame round the glass', m.frameless.length ? (m.frameless.length / m.windows <= 0.1 ? 'check' : 'fail') : 'pass', m.frameless.length ? `${m.frameless.length} of ${m.windows} with no frame${names(m.frameless)}` : `all ${m.windows} framed`, 'a frame, modelled or drawn', 'counted in the model'));
    }
  } else out.push(item('glass', 'Glass in every window and glazed door', 'not measured', '', 'glass', ''));
  // shadows
  if (typeof m.shadowMap === 'boolean' && ok(m.shadowLights) && ok(m.casters) && ok(m.solids)) {
    const share = m.solids ? m.casters / m.solids : 0, good = m.shadowMap && m.shadowLights > 0 && share >= L.casters.ratio;
    out.push(item('shadows', 'Shadows on', good ? 'pass' : m.shadowMap && m.shadowLights > 0 ? 'check' : 'fail', `${m.shadowMap ? 'shadow map on' : 'shadow map off'}, ${m.shadowLights} light${m.shadowLights === 1 ? '' : 's'} casting, ${Math.round(share * 100)} % of solid parts cast`, `a casting sun, ${L.casters.ratio * 100} % of parts or more`, 'read from the renderer'));
  } else out.push(item('shadows', 'Shadows on', 'not measured', '', '', ''));
  // planting band
  if (ok(m.plants) && Array.isArray(m.inBand)) {
    out.push(item('planting', 'Planting clear of the building', !m.plants ? 'not measured' : m.inBand.length ? 'fail' : 'pass', !m.plants ? 'no planting in the scene' : m.inBand.length ? `${m.inBand.length} of ${m.plants} inside the band${names(m.inBand)}` : `all ${m.plants} outside the band`, `${L.band.m} m clear band`, 'measured in this view'));
  } else out.push(item('planting', 'Planting clear of the building', 'not measured', '', `${L.band.m} m clear band`, ''));
  // materials
  if (Array.isArray(m.greyDefaults)) out.push(item('materials', 'No grey default materials left', m.greyDefaults.length ? (m.greyDefaults.length <= 3 ? 'check' : 'fail') : 'pass', m.greyDefaults.length ? `${m.greyDefaults.length} part${m.greyDefaults.length === 1 ? '' : 's'}${names(m.greyDefaults)}` : 'every part has its own material', 'none', 'read from the scene'));
  else out.push(item('materials', 'No grey default materials left', 'not measured', '', 'none', ''));
  // frame time
  if (m.frameMs && ok(m.frameMs.median)) {
    const v = m.frameMs.median;
    out.push(item('frametime', 'Frame time on a phone', v <= L.phoneMs.ms ? 'pass' : v <= L.phoneMs.warn ? 'check' : 'fail', `${Math.round(v)} ms median at the ${m.frameMs.tier ?? 'phone'} tier`, `${L.phoneMs.ms} ms or less`, m.frameMs.where || 'measured in this browser, not on a phone'));
  } else out.push(item('frametime', 'Frame time on a phone', 'not measured', '', `${L.phoneMs.ms} ms or less`, ''));
  // views
  if (m.views && typeof m.views === 'object') {
    const bad = VIEWS.filter((v) => !m.views[v]?.ok);
    out.push(item('views', 'Standard views drawn', bad.length ? 'fail' : 'pass', bad.length ? `not drawn: ${bad.join(', ')}` : VIEWS.join(', '), 'three-quarter, entry, aerial', 'rendered in this browser'));
  } else out.push(item('views', 'Standard views drawn', 'not measured', '', '', ''));

  const counted = out.filter((i) => i.result !== 'not measured');
  const pts = counted.reduce((s, i) => s + (i.result === 'pass' ? 1 : i.result === 'check' ? 0.5 : 0), 0);
  return {
    type: REPORT_TYPE, v: 1, versions: { rules: LOOK_VERSION, prompt: critique?.prompts ?? null },
    items: out, score: counted.length ? Math.round((100 * pts) / counted.length) : null, measured: counted.length, of: out.length,
    critique: critique ? cleanCritique(critique) : null,
    status: 'for a person',
    says: 'The look expert checks the browser twin before a person looks. It never approves: the look gate is a person’s.',
  };
}

// ---- the optional critique by a model -------------------------------------------------------------------------------------------
export const CRITIQUE_PROMPTS = 'look-critique 2026-11-23a';
const S = { type: 'string' }, N = { type: 'number' };
const o = (properties) => ({ type: 'object', additionalProperties: false, properties, required: Object.keys(properties) });
export const ASPECTS = ['materials', 'light', 'composition', 'realism', 'match'];
export const CRITIQUE_SCHEMA = o({
  scores: o({ materials: N, light: N, composition: N, realism: N, match: { type: ['number', 'null'] } }),
  notes: { type: 'array', items: S },
  summary: S,
});
export const CRITIQUE_SYSTEM = `You review still frames of a browser 3D model of a building for assembl, a New Zealand architecture tool, before a person reviews the look.
Score each aspect from 1 (poor) to 5 (convincing): materials (surfaces read as real materials, not plastic or flat grey), light (sun, shade and shadow read naturally), composition (the building reads clearly in the frame), realism (could pass for a photograph at a glance).
match: when the architect's own render is given (it is the last image), score how closely the browser frames match its look from 1 to 5; when no render is given, null.
notes: up to five short, concrete fixes, each naming what to change. summary: one sentence. Plain New Zealand English.
Never approve the look, never give a compliance view, and never invent a dimension.`;

/** keep only what the critique schema allows: scores clamped to 1-5, at most five short notes */
export function cleanCritique(c) {
  const s = c?.scores ?? {}, clamp = (v) => (ok(v) ? Math.max(1, Math.min(5, Math.round(v * 10) / 10)) : null);
  const scores = Object.fromEntries(ASPECTS.map((k) => [k, clamp(s[k])]));
  return {
    scores, notes: (Array.isArray(c?.notes) ? c.notes : []).map((n) => String(n).replace(/\s+/g, ' ').trim().slice(0, 200)).filter(Boolean).slice(0, 5),
    summary: String(c?.summary ?? '').replace(/\s+/g, ' ').trim().slice(0, 240), provider: c?.provider ?? null, model: c?.model ?? null, src: 'model opinion',
  };
}

/** the problems with a report, as sentences; an empty list means it may be kept or shown */
export function validateReport(r) {
  const e = [];
  if (!r || r.type !== REPORT_TYPE || r.v !== 1) return ['not a look review'];
  if (r.status !== 'for a person') e.push('a look review is always for a person: the reviewer never approves');
  if (!Array.isArray(r.items) || !r.items.length) e.push('no items');
  for (const i of r.items ?? []) if (!RESULTS.includes(i.result)) e.push(`${i.id}: result "${i.result}"`);
  if (r.score != null && !(ok(r.score) && r.score >= 0 && r.score <= 100)) e.push('score out of range');
  if (r.critique) for (const k of ASPECTS) { const v = r.critique.scores?.[k]; if (v != null && !(ok(v) && v >= 1 && v <= 5)) e.push(`critique ${k} out of range`); }
  return e;
}
