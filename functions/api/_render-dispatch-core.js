// Shared Cloudflare render dispatch core:
// Used by BOTH the Cloudflare Pages Function (functions/api/render-jobs.js) and the
// dedicated Cloudflare Workflow Worker (workers/render-dispatch/).
//
// Invariants enforced here:
//   1. Project membership check on EVERY job and asset operation (Supabase JWT + arch schema RLS).
//   2. Unique idempotency job_key per (project_id, revision_sha256, shot_id, variant, provider, mode).
//   3. Never auto-resubmit an uncertain or failed paid request: reconcile from saved provider_request_id first.
//   4. Provider keys stay server-side only; readiness API reports binding NAMES & boolean readiness, never values.
//   5. Default mode is mock / dry_run (US$0.00). Live paid dispatch requires explicit quote + confirm + approved_by.
//   6. Never hardcodes deprecated Veo preview IDs or silently switches provider.
//   7. Exact-model Track A export remains 100% available when AI generation is disabled.

import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SCHEMA, BUCKET } from '../../architecture/js/config.js';
import { evaluateTripleFrameDrift } from '../../architecture/js/agents/reviewer-rules.js';

export const DISPATCH_SCHEMA = 'assembl.render-dispatch.v1';
export const DEFAULT_GEMINI_IMAGE_MODELS = Object.freeze({
  fast: 'gemini-nano-banana-2.1',
  best: 'gemini-3-pro-image',
  finest: 'gemini-3-pro-image',
});
export const DEFAULT_GEMINI_VIDEO_MODEL = 'gemini-omni-1.2-flash';
export const GEMINI_VIDEO_LIMITS = Object.freeze({ min_s: 3, max_s: 10, max_ceiling_s: 15, fps: 24, resolutions: ['360p', '720p', '1080p'] });
export const GEMINI_IMAGE_USD = Object.freeze({ fast: 0.04, best: 0.15, finest: 0.26 });
export const GEMINI_VIDEO_USD_PER_S = Object.freeze({ '360p': 0.0232, '720p': 0.0695, '1080p': 0.1043 });
export const SHORT_LIVED_INPUT_TTL_S = 900; // 15 minutes max for approved provider input URLs
export const SHORT_LIVED_ASSET_TTL_S = 3600; // 1 hour for signed private project playback

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA256_RE = /^[a-f0-9]{64}$/i;
const PROVIDERS = new Set(['mock', 'gemini-image', 'gemini-omni', 'fal-video']);
const MODES = new Set(['mock', 'dry_run', 'live']);

export const geminiKeyOf = (env) => env?.GEMINI_API_KEY || env?.GOOGLE_API_KEY || '';
export const falKeyOf = (env) => env?.FAL_KEY || '';
export const falEndpointOf = (env) => String(env?.FAL_VIDEO_ENDPOINT || '').trim();
export const aiEnabledOf = (env) => String(env?.RENDER_AI_DISABLED || '').toLowerCase() !== 'true' && String(env?.RENDER_AI_DISABLED || '') !== '1';

/**
 * Inspect server-side bindings by NAME and boolean readiness ONLY. Never exposes secret values.
 */
export function bindingReadiness(env = {}) {
  const aiEnabled = aiEnabledOf(env);
  const hasGemini = !!geminiKeyOf(env);
  const hasFalKey = !!falKeyOf(env);
  const hasFalEndpoint = !!falEndpointOf(env);
  const falReady = aiEnabled && hasFalKey && hasFalEndpoint;
  const geminiReady = aiEnabled && hasGemini;
  const preferredVideoProvider = falReady ? 'fal-video' : geminiReady ? 'gemini-omni' : 'mock';

  return {
    type: 'assembl.render-dispatch.status',
    schema: DISPATCH_SCHEMA,
    ai_enabled: aiEnabled,
    exact_model_export_available: true,
    default_mode: 'mock',
    preferred_video_provider: preferredVideoProvider,
    bindings: {
      GEMINI_API_KEY: hasGemini,
      FAL_KEY: hasFalKey,
      FAL_VIDEO_ENDPOINT: hasFalEndpoint,
      RENDER_DISPATCH: !!env?.RENDER_DISPATCH?.fetch,
      RENDER_WORKFLOW: !!env?.RENDER_WORKFLOW?.create,
      RENDER_BUCKET: !!env?.RENDER_BUCKET?.put,
      ARCH_SHARE_SERVICE_KEY: !!env?.ARCH_SHARE_SERVICE_KEY,
      RENDER_WEBHOOK_SECRET: !!env?.RENDER_WEBHOOK_SECRET,
    },
    providers: {
      mock: {
        ready: true,
        kind: 'still+video',
        accepts_source_clip: true,
        price_usd: 0,
        note: 'Default dry-run / mock dispatch (US$0.00). Exercises full ledger, auth, and Films view pipeline without spending.',
      },
      'gemini-image': {
        ready: geminiReady,
        kind: 'still',
        models: {
          fast: env?.RENDER_GEMINI_FAST_MODEL || DEFAULT_GEMINI_IMAGE_MODELS.fast,
          best: env?.RENDER_GEMINI_BEST_MODEL || DEFAULT_GEMINI_IMAGE_MODELS.best,
          finest: env?.RENDER_GEMINI_FINEST_MODEL || DEFAULT_GEMINI_IMAGE_MODELS.finest,
        },
        estimates_usd: GEMINI_IMAGE_USD,
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/interactions',
      },
      'gemini-omni': {
        ready: geminiReady,
        kind: 'video',
        model: env?.FILM_GEMINI_MODEL || DEFAULT_GEMINI_VIDEO_MODEL,
        accepts_source_clip: true,
        limits: GEMINI_VIDEO_LIMITS,
        usd_per_second: GEMINI_VIDEO_USD_PER_S,
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/interactions',
        note: 'Google Gemini Developer API candidate (Omni 1.2 Flash). Veo 3.1 Preview was shut down 22 Oct 2026 and is never used.',
      },
      'fal-video': {
        ready: falReady,
        kind: 'video',
        accepts_source_clip: hasFalEndpoint,
        endpoint_configured: hasFalEndpoint,
        note: falReady
          ? 'Configured server-side fal 3D-to-video queue adapter (FAL_KEY + FAL_VIDEO_ENDPOINT bound).'
          : 'Not bound on this deployment (requires server-side FAL_KEY and verified video-to-video FAL_VIDEO_ENDPOINT).',
      },
    },
  };
}

/** Deterministic SHA-256 hex digest. */
export async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(String(text));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Unique idempotency key per (project_id, revision_sha256, shot_id, variant, provider, mode).
 */
export async function computeJobKey({ project_id, revision_sha256, shot_id, variant = 'default', provider = 'mock', mode = 'mock' }) {
  const parts = [
    String(project_id || '').trim().toLowerCase(),
    String(revision_sha256 || '').trim().toLowerCase(),
    String(shot_id || '').trim(),
    String(variant || 'default').trim().toLowerCase(),
    String(provider || 'mock').trim().toLowerCase(),
    String(mode || 'mock').trim().toLowerCase(),
  ];
  return sha256Hex(parts.join('|'));
}

/**
 * Build a transparent cost, provider and input quote before any dispatch.
 * Never silently switches provider if the caller explicitly selected one that is not ready.
 */
export function quoteRenderJob(env, body = {}) {
  const readiness = bindingReadiness(env);
  const mode = MODES.has(body.mode) ? body.mode : 'mock';
  const kind = body.kind === 'still' ? 'still' : 'video';
  let provider = body.provider;
  if (!provider) {
    provider = mode === 'mock' ? 'mock' : kind === 'still' ? 'gemini-image' : readiness.preferred_video_provider;
  }
  if (!PROVIDERS.has(provider)) return { error: 'bad_provider', message: `Unsupported provider "${provider}".` };
  if (mode === 'live' && !readiness.ai_enabled && provider !== 'mock') {
    return { error: 'ai_disabled', message: 'AI generation is disabled on this environment. Track A exact-model export remains available.' };
  }
  const pInfo = readiness.providers[provider];
  if (mode === 'live' && provider !== 'mock' && !pInfo?.ready) {
    return {
      error: 'provider_not_configured',
      provider,
      message: `Provider "${provider}" is not configured on this execution service. Refusing to silently switch providers.`,
    };
  }

  const seconds = Math.max(GEMINI_VIDEO_LIMITS.min_s, Math.min(GEMINI_VIDEO_LIMITS.max_ceiling_s, Math.round(Number(body.seconds) || 5)));
  const resolution = GEMINI_VIDEO_LIMITS.resolutions.includes(body.resolution) ? body.resolution : '720p';
  const quality = ['fast', 'best', 'finest'].includes(body.quality) ? body.quality : 'best';

  let estimated_usd = 0;
  let model = provider;
  let estimate_text = 'US$0.00 (dry run / mock)';
  if (mode === 'live' && provider === 'gemini-image') {
    model = pInfo.models[quality];
    estimated_usd = GEMINI_IMAGE_USD[quality] ?? 0.15;
    estimate_text = `About US$${estimated_usd.toFixed(2)} for 1 still (${model}, ${quality}).`;
  } else if (mode === 'live' && provider === 'gemini-omni') {
    model = pInfo.model;
    if (seconds > GEMINI_VIDEO_LIMITS.max_s && !env?.FILM_SEGMENT_MAX_S) {
      return { error: 'clip_too_long', max_s: GEMINI_VIDEO_LIMITS.max_s, message: `Clip length ${seconds}s exceeds configured ${GEMINI_VIDEO_LIMITS.max_s}s per-part limit.` };
    }
    estimated_usd = Math.round(seconds * (GEMINI_VIDEO_USD_PER_S[resolution] ?? 0.0695) * 100) / 100;
    estimate_text = `About US$${estimated_usd.toFixed(2)} for ${seconds}s at ${resolution} (${model}, 24 fps).`;
  } else if (mode === 'live' && provider === 'fal-video') {
    model = falEndpointOf(env);
    estimated_usd = Number(body.estimated_usd) > 0 ? Number(body.estimated_usd) : Math.round(seconds * 0.08 * 100) / 100;
    estimate_text = `Estimated US$${estimated_usd.toFixed(2)} for ${seconds}s via configured fal endpoint (${model}); verify live endpoint pricing before approving.`;
  }

  const inputManifest = {
    source_clip_sha256: body.source_clip_sha256 || null,
    reference_still_sha256s: Array.isArray(body.reference_still_sha256s) ? body.reference_still_sha256s.slice(0, 4) : [],
    camera_metadata_sha256: body.camera_metadata_sha256 || null,
    requires_source_clip: kind === 'video',
  };
  if (kind === 'video' && mode === 'live' && !inputManifest.source_clip_sha256) {
    return {
      error: 'source_clip_required',
      message: 'Track B video look studies must start from a Track A exact-model motion clip, not a text prompt alone.',
    };
  }

  return {
    type: 'assembl.render-dispatch.quote',
    provider,
    model,
    mode,
    kind,
    resolution,
    seconds: kind === 'video' ? seconds : null,
    quality: kind === 'still' ? quality : null,
    estimated_usd,
    estimate_text,
    needs_confirm: mode === 'live',
    binding_ready: !!pInfo?.ready,
    inputs: inputManifest,
    label: 'AI-generated look study — not checked geometry.',
  };
}

/**
 * Enforce project membership on EVERY job and asset operation via Supabase Auth JWT + arch schema RLS.
 * Supports an injected `verifyMembership` hook for offline unit tests.
 */
export async function verifyProjectMembership({ request, env, project_id, requireWrite = false, fetcher = fetch, verifyMembership = null } = {}) {
  if (!UUID_RE.test(String(project_id || ''))) {
    return { ok: false, status: 400, error: 'bad_project_id', message: 'A valid project UUID is required.' };
  }
  const auth = request.headers.get('authorization') || '';
  const m = auth.match(/^Bearer\s+([^\s]+)$/i);
  if (!m) {
    return { ok: false, status: 401, error: 'auth_required', message: 'Sign in to access project render jobs.' };
  }
  const token = m[1];

  if (typeof verifyMembership === 'function') {
    const res = await verifyMembership({ token, project_id, requireWrite });
    if (!res?.ok) return { ok: false, status: res?.status || 403, error: res?.error || 'project_access_denied', message: res?.message || 'Access to this project was refused.' };
    if (requireWrite && res.role === 'viewer') return { ok: false, status: 403, error: 'viewer_read_only', message: 'Viewers can view films and jobs, not dispatch renders.' };
    return { ok: true, project_id, practice_id: res.practice_id, role: res.role, user_id: res.user_id || null, token };
  }

  const base = env?.SUPABASE_URL || SUPABASE_URL;
  const pubKey = env?.SUPABASE_PUBLISHABLE_KEY || SUPABASE_PUBLISHABLE_KEY;
  const headers = { apikey: pubKey, authorization: `Bearer ${token}`, 'accept-profile': SCHEMA, accept: 'application/json' };
  try {
    // 1. Check project visibility through arch.project RLS (returns [] for non-members)
    const pr = await fetcher(`${base}/rest/v1/project?id=eq.${encodeURIComponent(project_id)}&select=id,practice_id,name`, { headers });
    if (pr.status === 401) return { ok: false, status: 401, error: 'signed_out', message: 'Your sign-in has expired. Sign in again.' };
    if (!pr.ok) return { ok: false, status: 502, error: 'auth_check_failed', message: 'Could not verify project membership.' };
    const rows = await pr.json();
    const project = Array.isArray(rows) ? rows[0] : null;
    if (!project?.practice_id) {
      return { ok: false, status: 403, error: 'project_access_denied', message: 'You do not have access to this project.' };
    }
    // 2. Check member role in that practice
    const rr = await fetcher(`${base}/rest/v1/rpc/member_role`, {
      method: 'POST',
      headers: { ...headers, 'content-profile': SCHEMA, 'content-type': 'application/json' },
      body: JSON.stringify({ p_practice: project.practice_id }),
    });
    const role = rr.ok ? await rr.json() : null;
    if (!role || !['owner', 'member', 'viewer'].includes(role)) {
      return { ok: false, status: 403, error: 'project_access_denied', message: 'Practice membership could not be confirmed.' };
    }
    if (requireWrite && role === 'viewer') {
      return { ok: false, status: 403, error: 'viewer_read_only', message: 'Viewers cannot approve or dispatch render jobs.' };
    }
    return { ok: true, project_id: project.id, practice_id: project.practice_id, role, token };
  } catch {
    return { ok: false, status: 502, error: 'auth_unavailable', message: 'Could not reach project membership service.' };
  }
}

/**
 * In-memory ledger adapter (used in tests and single-isolate mock previews) + Supabase PostgREST ledger adapter.
 */
export function createMemoryLedger() {
  const byId = new Map();
  const byKey = new Map();
  const assets = new Map();
  return {
    async findByKey(jobKey) {
      const id = byKey.get(jobKey);
      return id ? structuredClone(byId.get(id)) : null;
    },
    async getById(id, project_id) {
      const j = byId.get(id);
      if (!j || j.project_id !== project_id) return null;
      return structuredClone(j);
    },
    async listByProject(project_id) {
      return [...byId.values()].filter((j) => j.project_id === project_id).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).map((x) => structuredClone(x));
    },
    async insert(job) {
      if (byKey.has(job.job_key)) {
        const err = new Error('duplicate job_key');
        err.code = '23505';
        throw err;
      }
      const copy = structuredClone(job);
      byId.set(copy.id, copy);
      byKey.set(copy.job_key, copy.id);
      return structuredClone(copy);
    },
    async update(id, patch) {
      const cur = byId.get(id);
      if (!cur) return null;
      const next = { ...cur, ...patch, updated_at: new Date().toISOString() };
      byId.set(id, next);
      return structuredClone(next);
    },
    async storePrivateAsset({ practice_id, project_id, job_id, name, contentType, bytes, meta }) {
      const file_id = crypto.randomUUID();
      const path = `${practice_id}/${project_id}/${file_id}`;
      assets.set(path, { file_id, path, project_id, practice_id, job_id, name, contentType, size: bytes.byteLength, bytes, meta });
      return { file_id, path, slot: 'films' };
    },
    async getPrivateAsset(path, project_id) {
      const a = assets.get(path);
      if (!a || a.project_id !== project_id) return null;
      return a;
    },
  };
}

/**
 * Supabase PostgREST + private arch-files storage ledger adapter, scoped to the caller's verified JWT.
 */
export function createSupabaseLedger({ env, token, fetcher = fetch }) {
  const base = env?.SUPABASE_URL || SUPABASE_URL;
  const pubKey = env?.SUPABASE_PUBLISHABLE_KEY || SUPABASE_PUBLISHABLE_KEY;
  const headers = { apikey: pubKey, authorization: `Bearer ${token}`, 'accept-profile': SCHEMA, 'content-profile': SCHEMA, 'content-type': 'application/json', accept: 'application/json' };
  return {
    async findByKey(jobKey) {
      const r = await fetcher(`${base}/rest/v1/render_job?job_key=eq.${encodeURIComponent(jobKey)}&limit=1`, { headers });
      if (!r.ok) return null;
      const rows = await r.json();
      return rows?.[0] ?? null;
    },
    async getById(id, project_id) {
      const r = await fetcher(`${base}/rest/v1/render_job?id=eq.${encodeURIComponent(id)}&project_id=eq.${encodeURIComponent(project_id)}&limit=1`, { headers });
      if (!r.ok) return null;
      const rows = await r.json();
      return rows?.[0] ?? null;
    },
    async listByProject(project_id) {
      const r = await fetcher(`${base}/rest/v1/render_job?project_id=eq.${encodeURIComponent(project_id)}&order=created_at.desc&limit=50`, { headers });
      if (!r.ok) return [];
      const rows = await r.json();
      return Array.isArray(rows) ? rows : [];
    },
    async insert(job) {
      const r = await fetcher(`${base}/rest/v1/render_job`, { method: 'POST', headers: { ...headers, prefer: 'return=representation' }, body: JSON.stringify(job) });
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        const err = new Error(data?.message || 'insert_failed');
        err.code = data?.code || String(r.status);
        throw err;
      }
      return Array.isArray(data) ? data[0] : data;
    },
    async update(id, patch) {
      const r = await fetcher(`${base}/rest/v1/render_job?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { ...headers, prefer: 'return=representation' },
        body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
      });
      if (!r.ok) return null;
      const data = await r.json().catch(() => null);
      return Array.isArray(data) ? data[0] : data;
    },
    async signShortLivedUrl(path, expiresIn = SHORT_LIVED_INPUT_TTL_S) {
      const r = await fetcher(`${base}/storage/v1/object/sign/${BUCKET}/${path}`, {
        method: 'POST',
        headers: { apikey: pubKey, authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ expiresIn }),
      });
      if (!r.ok) return null;
      const j = await r.json().catch(() => null);
      return j?.signedURL ? `${base}/storage/v1${j.signedURL}` : null;
    },
    async storePrivateAsset({ practice_id, project_id, name, contentType, bytes, meta }) {
      const file_id = crypto.randomUUID();
      const path = `${practice_id}/${project_id}/${file_id}`;
      // Use R2 private bucket if configured, otherwise reuse existing private Supabase arch-files storage
      if (env?.RENDER_BUCKET?.put) {
        await env.RENDER_BUCKET.put(path, bytes, { httpMetadata: { contentType }, customMetadata: { project_id, practice_id, name } });
      } else {
        const up = await fetcher(`${base}/storage/v1/object/${BUCKET}/${path}`, {
          method: 'POST',
          headers: { apikey: pubKey, authorization: `Bearer ${token}`, 'content-type': contentType || 'video/mp4', 'x-upsert': 'false' },
          body: bytes,
        });
        if (!up.ok) throw new Error('private_storage_write_failed');
      }
      // Register in arch.file under owner_kind='source', slot='films' so it appears in the private project's Films view
      await fetcher(`${base}/rest/v1/file`, {
        method: 'POST',
        headers: { ...headers, prefer: 'return=minimal' },
        body: JSON.stringify({
          id: file_id,
          project_id,
          practice_id,
          owner_kind: 'source',
          owner_id: project_id,
          name,
          type: contentType || 'video/mp4',
          size: bytes.byteLength,
          extra: { source: { slot: 'films', version: 1, by: meta?.approved_by || 'Render dispatch', note: meta?.label || 'AI-generated look study — not checked geometry.' }, render_job: meta || {} },
        }),
      });
      return { file_id, path, slot: 'films' };
    },
  };
}

/**
 * Create a render job with strict idempotency & no-double-charge protection.
 * Returns { status: 202|200|402|409|400|503, body }.
 */
export async function createOrResumeJob({ ledger, membership, payload, env, startWorkflow = null }) {
  const revision_sha256 = String(payload?.revision_sha256 || '').trim().toLowerCase();
  const shot_id = String(payload?.shot_id || '').trim();
  const variant = String(payload?.variant || 'default').trim().toLowerCase();
  if (!SHA256_RE.test(revision_sha256)) return { status: 400, body: { error: 'bad_revision', message: 'A 64-character lowercase SHA-256 revision fingerprint is required.' } };
  if (!shot_id || shot_id.length > 80) return { status: 400, body: { error: 'bad_shot_id', message: 'A shot_id is required.' } };

  const quote = quoteRenderJob(env, payload);
  if (quote.error) {
    const code = quote.error === 'provider_not_configured' || quote.error === 'ai_disabled' ? 503 : 400;
    return { status: code, body: quote };
  }

  if (quote.mode === 'live') {
    if (payload.confirm !== true || !String(payload.approved_by || '').trim()) {
      return {
        status: 402,
        body: {
          error: 'confirm_spend',
          message: 'Live paid dispatch requires explicit confirm: true and approved_by after reviewing the quote.',
          quote,
        },
      };
    }
  }

  const job_key = await computeJobKey({
    project_id: membership.project_id,
    revision_sha256,
    shot_id,
    variant,
    provider: quote.provider,
    mode: quote.mode,
  });

  const existing = await ledger.findByKey(job_key);
  if (existing) {
    if (existing.status === 'completed') {
      return { status: 200, body: { type: 'assembl.render-dispatch.job', deduplicated: true, job: existing } };
    }
    if (existing.status === 'queued' || existing.status === 'running' || existing.status === 'validating') {
      return { status: 202, body: { type: 'assembl.render-dispatch.job', deduplicated: true, job_id: existing.id, job: existing } };
    }
    // CRITICAL NO-DOUBLE-CHARGE GUARD:
    // Never auto-resubmit an uncertain, submitting, or failed paid job without reconciling first!
    if (existing.mode === 'live' && ['submitting', 'uncertain', 'failed'].includes(existing.status)) {
      return {
        status: 409,
        body: {
          error: 'needs_reconcile',
          message: 'A paid job for this project/revision/shot/variant is uncertain or failed. Reconcile from its saved provider_request_id first — refusing automatic resubmission to prevent double charging.',
          job_id: existing.id,
          provider_request_id: existing.provider_request_id,
          job: existing,
        },
      };
    }
  }

  const now = new Date().toISOString();
  const job = {
    id: crypto.randomUUID(),
    project_id: membership.project_id,
    practice_id: membership.practice_id,
    job_key,
    revision_sha256,
    shot_id,
    variant,
    provider: quote.provider,
    model: quote.model,
    mode: quote.mode,
    status: 'queued',
    provider_request_id: null,
    workflow_instance_id: null,
    estimated_usd: quote.estimated_usd,
    approved_by: payload.approved_by ? String(payload.approved_by).trim().slice(0, 80) : null,
    approved_at: quote.mode === 'live' ? now : null,
    input_manifest: quote.inputs,
    drift_report: null,
    output_file_id: null,
    output_storage_path: null,
    error_code: null,
    error_message: null,
    attempts: 0,
    reconciled_at: null,
    created_at: now,
    updated_at: now,
  };

  let created;
  try {
    created = await ledger.insert(job);
  } catch (e) {
    if (e?.code === '23505') {
      const raced = await ledger.findByKey(job_key);
      return { status: 202, body: { type: 'assembl.render-dispatch.job', deduplicated: true, job_id: raced?.id, job: raced } };
    }
    throw e;
  }

  if (typeof startWorkflow === 'function') {
    const wf = await startWorkflow(created);
    if (wf?.id) created = (await ledger.update(created.id, { workflow_instance_id: wf.id })) || created;
  } else if (created.mode === 'mock' || created.mode === 'dry_run') {
    // Complete mock/dry-run deterministically through the exact same state transitions without any spend
    const mockReqId = `mock_${created.id.slice(0, 8)}`;
    created = await ledger.update(created.id, { status: 'running', provider_request_id: mockReqId, attempts: 1 });
    const drift = evaluateTripleFrameDrift({
      first: { verdict: 'holds', score: 0.94 },
      middle: { verdict: 'holds', score: 0.93 },
      last: { verdict: 'holds', score: 0.92 },
    });
    const fakeBytes = new TextEncoder().encode(`MOCK_LOOK_STUDY|${created.id}|${created.shot_id}|${created.variant}`);
    const stored = await ledger.storePrivateAsset({
      practice_id: created.practice_id,
      project_id: created.project_id,
      job_id: created.id,
      name: `${created.shot_id}-${created.variant}-mock-study.txt`,
      contentType: 'text/plain',
      bytes: fakeBytes,
      meta: { job_id: created.id, mode: created.mode, provider: created.provider, label: 'Dry-run mock study (US$0.00) — not checked geometry.' },
    });
    created = await ledger.update(created.id, {
      status: 'completed',
      drift_report: drift,
      output_file_id: stored.file_id,
      output_storage_path: stored.path,
    });
  }

  return {
    status: 202,
    body: {
      type: 'assembl.render-dispatch.job',
      job_id: created.id,
      job_key: created.job_key,
      status: created.status,
      provider: created.provider,
      mode: created.mode,
      estimated_usd: created.estimated_usd,
      job: created,
    },
  };
}

/**
 * Reconcile an uncertain, running, or failed job from its saved provider_request_id WITHOUT resubmitting.
 */
export async function reconcileJob({ ledger, job, env, pollProvider = null }) {
  if (!job) return { status: 404, body: { error: 'job_not_found' } };
  if (job.status === 'completed') return { status: 200, body: { type: 'assembl.render-dispatch.reconcile', action: 'already_completed', job } };

  const now = new Date().toISOString();
  if (job.provider_request_id && typeof pollProvider === 'function') {
    const res = await pollProvider({ provider: job.provider, provider_request_id: job.provider_request_id, env });
    if (res.status === 'running') {
      const updated = await ledger.update(job.id, { status: 'running', reconciled_at: now });
      return { status: 200, body: { type: 'assembl.render-dispatch.reconcile', action: 'resumed_polling', resubmitted: false, job: updated } };
    }
    if (res.status === 'completed') {
      const drift = res.frames ? evaluateTripleFrameDrift(res.frames) : null;
      if (drift && (drift.recommendation === 'reject_drift' || drift.recommendation === 'incomplete')) {
        const updated = await ledger.update(job.id, { status: 'rejected_drift', drift_report: drift, reconciled_at: now });
        return { status: 200, body: { type: 'assembl.render-dispatch.reconcile', action: 'rejected_drift', resubmitted: false, job: updated } };
      }
      let stored = null;
      if (res.bytes) {
        stored = await ledger.storePrivateAsset({
          practice_id: job.practice_id,
          project_id: job.project_id,
          job_id: job.id,
          name: res.name || `${job.shot_id}-${job.variant}-ai-study.mp4`,
          contentType: res.contentType || 'video/mp4',
          bytes: res.bytes,
          meta: { job_id: job.id, provider: job.provider, model: job.model, approved_by: job.approved_by, label: 'AI-generated look study — not checked geometry.' },
        });
      }
      const updated = await ledger.update(job.id, {
        status: 'completed',
        drift_report: drift,
        output_file_id: stored?.file_id ?? job.output_file_id,
        output_storage_path: stored?.path ?? job.output_storage_path,
        reconciled_at: now,
      });
      return { status: 200, body: { type: 'assembl.render-dispatch.reconcile', action: 'recovered_completed', resubmitted: false, job: updated } };
    }
    const updated = await ledger.update(job.id, { status: 'failed', error_code: res.error || 'provider_failed', error_message: res.message || 'Provider reported failure.', reconciled_at: now });
    return { status: 200, body: { type: 'assembl.render-dispatch.reconcile', action: 'confirmed_failed', resubmitted: false, job: updated } };
  }

  // No provider_request_id saved on an uncertain submission: mark reconciled_at, NEVER auto-resubmit.
  const updated = await ledger.update(job.id, { reconciled_at: now });
  return {
    status: 200,
    body: {
      type: 'assembl.render-dispatch.reconcile',
      action: job.provider_request_id ? 'has_provider_request_id' : 'no_provider_request_id',
      resubmitted: false,
      message: 'Reconciliation recorded without resubmitting a paid request. Inspect provider dashboard before creating a new shot key.',
      job: updated,
    },
  };
}

/**
 * Constant-time HMAC-SHA256 webhook signature verifier.
 */
export async function verifyWebhookSignature(rawBody, signatureHex, secret) {
  if (!secret || typeof signatureHex !== 'string' || !/^[a-f0-9]{64}$/i.test(signatureHex.trim())) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody)));
  const expected = [...sig].map((b) => b.toString(16).padStart(2, '0')).join('');
  const a = expected.toLowerCase(), b = signatureHex.trim().toLowerCase();
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
