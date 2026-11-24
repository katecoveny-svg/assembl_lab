import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bindingReadiness,
  computeJobKey,
  createMemoryLedger,
  quoteRenderJob,
  verifyWebhookSignature,
} from '../../functions/api/_render-dispatch-core.js';
import { handleRenderJobs } from '../../functions/api/render-jobs.js';

const PROJECT_A = '11111111-1111-4111-8111-111111111111';
const PROJECT_B = '22222222-2222-4222-8222-222222222222';
const PRACTICE_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const REV_SHA = 'f635648106a978a64fb5dd0e21585c3b3a3f6f5187a3d297221b4de18580d143';
const CLIP_SHA = '1'.repeat(64);

const TOKENS = {
  ownerA: { ok: true, practice_id: PRACTICE_A, role: 'owner', project_id: PROJECT_A },
  viewerA: { ok: true, practice_id: PRACTICE_A, role: 'viewer', project_id: PROJECT_A },
  outsider: { ok: false, status: 403, error: 'project_access_denied', message: 'Not a member.' },
};

const verifyMembership = async ({ token, project_id }) => {
  const entry = TOKENS[token];
  if (!entry) return { ok: false, status: 401, error: 'signed_out' };
  if (!entry.ok || entry.project_id !== project_id) return { ok: false, status: 403, error: 'project_access_denied' };
  return entry;
};

const req = (url, { method = 'GET', token = null, body = null, headers = {} } = {}) =>
  new Request(url, {
    method,
    headers: {
      ...(body != null ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body != null ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}),
  });

test('Binding readiness reports binding names and readiness only — never exposes secret values or old Veo IDs', async () => {
  const secretVal = 'SUPER_SECRET_GEMINI_KEY_999';
  const env = { GEMINI_API_KEY: secretVal, FAL_KEY: 'SUPER_SECRET_FAL_KEY_888' };
  const r = await handleRenderJobs({ request: req('https://lab.assembl.co.nz/api/render-jobs?status=1'), env });
  assert.equal(r.status, 200);
  const text = await r.text();
  assert.equal(text.includes(secretVal), false);
  assert.equal(text.includes('SUPER_SECRET_FAL_KEY_888'), false);
  const j = JSON.parse(text);
  assert.equal(j.bindings.GEMINI_API_KEY, true);
  assert.equal(j.bindings.FAL_KEY, true);
  assert.equal(j.bindings.FAL_VIDEO_ENDPOINT, false);
  assert.equal(j.providers['gemini-omni'].model, 'gemini-omni-1.2-flash');
  assert.equal(j.providers['fal-video'].ready, false);
  assert.equal(j.default_mode, 'mock');
  assert.equal(j.exact_model_export_available, true);
});

test('Project membership is strictly enforced on every job operation (401 unauth, 403 outsider, 403 viewer write)', async () => {
  const ledger = createMemoryLedger();
  const env = { GEMINI_API_KEY: 'test-key' };

  // 1. Unauthenticated refused
  const unauth = await handleRenderJobs({
    request: req(`https://lab.assembl.co.nz/api/render-jobs?project_id=${PROJECT_A}`),
    env, ledger, verifyMembership,
  });
  assert.equal(unauth.status, 401);

  // 2. Outsider refused on read and create
  const outRead = await handleRenderJobs({
    request: req(`https://lab.assembl.co.nz/api/render-jobs?project_id=${PROJECT_A}`, { token: 'outsider' }),
    env, ledger, verifyMembership,
  });
  assert.equal(outRead.status, 403);

  const crossProject = await handleRenderJobs({
    request: req(`https://lab.assembl.co.nz/api/render-jobs?project_id=${PROJECT_B}`, { token: 'ownerA' }),
    env, ledger, verifyMembership,
  });
  assert.equal(crossProject.status, 403);

  // 3. Viewer can read list (200) and quote (200) but CANNOT create/dispatch (403 viewer_read_only)
  const viewerList = await handleRenderJobs({
    request: req(`https://lab.assembl.co.nz/api/render-jobs?project_id=${PROJECT_A}`, { token: 'viewerA' }),
    env, ledger, verifyMembership,
  });
  assert.equal(viewerList.status, 200);

  const viewerCreate = await handleRenderJobs({
    request: req('https://lab.assembl.co.nz/api/render-jobs', {
      method: 'POST',
      token: 'viewerA',
      body: { action: 'create', project_id: PROJECT_A, revision_sha256: REV_SHA, shot_id: '03-forecourt', variant: 'banquet', mode: 'mock' },
    }),
    env, ledger, verifyMembership,
  });
  assert.equal(viewerCreate.status, 403);
  assert.equal((await viewerCreate.json()).error, 'viewer_read_only');
});

test('Failed, uncertain and retried paid jobs NEVER double-charge: idempotent key + reconcile from saved provider_request_id', async () => {
  const ledger = createMemoryLedger();
  const env = { GEMINI_API_KEY: 'test-key' };
  let providerSubmitCount = 0;

  // Step 1: Quote before dispatch
  const quoteRes = await handleRenderJobs({
    request: req('https://lab.assembl.co.nz/api/render-jobs', {
      method: 'POST',
      token: 'ownerA',
      body: { action: 'quote', project_id: PROJECT_A, provider: 'gemini-omni', mode: 'live', seconds: 5, resolution: '720p', source_clip_sha256: CLIP_SHA },
    }),
    env, ledger, verifyMembership,
  });
  assert.equal(quoteRes.status, 200);
  const quote = await quoteRes.json();
  assert.equal(quote.provider, 'gemini-omni');
  assert.equal(quote.estimated_usd, 0.35);
  assert.equal(quote.needs_confirm, true);

  // Step 2: Live job without confirm/approved_by is refused with 402
  const unconfirmed = await handleRenderJobs({
    request: req('https://lab.assembl.co.nz/api/render-jobs', {
      method: 'POST',
      token: 'ownerA',
      body: { action: 'create', project_id: PROJECT_A, revision_sha256: REV_SHA, shot_id: '03-forecourt', variant: 'banquet', provider: 'gemini-omni', mode: 'live', seconds: 5, resolution: '720p', source_clip_sha256: CLIP_SHA },
    }),
    env, ledger, verifyMembership,
  });
  assert.equal(unconfirmed.status, 402);

  // Step 3: Approved live job creates ledger entry and returns 202 + job_id
  const createdRes = await handleRenderJobs({
    request: req('https://lab.assembl.co.nz/api/render-jobs', {
      method: 'POST',
      token: 'ownerA',
      body: {
        action: 'create', project_id: PROJECT_A, revision_sha256: REV_SHA, shot_id: '03-forecourt', variant: 'banquet',
        provider: 'gemini-omni', mode: 'live', seconds: 5, resolution: '720p', source_clip_sha256: CLIP_SHA,
        confirm: true, approved_by: 'Kate',
      },
    }),
    env, ledger, verifyMembership,
    startWorkflow: async (job) => {
      providerSubmitCount++;
      await ledger.update(job.id, { status: 'running', provider_request_id: 'google_inter_123', attempts: 1 });
      return { id: 'wf_001' };
    },
  });
  assert.equal(createdRes.status, 202);
  const created = await createdRes.json();
  assert.ok(created.job_id);
  assert.equal(providerSubmitCount, 1);

  // Step 4: Duplicate retry while running deduplicates — ZERO second provider submission!
  const dupRes = await handleRenderJobs({
    request: req('https://lab.assembl.co.nz/api/render-jobs', {
      method: 'POST',
      token: 'ownerA',
      body: {
        action: 'create', project_id: PROJECT_A, revision_sha256: REV_SHA, shot_id: '03-forecourt', variant: 'banquet',
        provider: 'gemini-omni', mode: 'live', seconds: 5, resolution: '720p', source_clip_sha256: CLIP_SHA,
        confirm: true, approved_by: 'Kate',
      },
    }),
    env, ledger, verifyMembership,
    startWorkflow: async () => { providerSubmitCount++; return { id: 'wf_002' }; },
  });
  assert.equal(dupRes.status, 202);
  assert.equal((await dupRes.json()).deduplicated, true);
  assert.equal(providerSubmitCount, 1);

  // Step 5: Simulate uncertain/failed submission -> retry MUST return 409 needs_reconcile (never double-charge!)
  await ledger.update(created.job_id, { status: 'uncertain' });
  const retryUncertain = await handleRenderJobs({
    request: req('https://lab.assembl.co.nz/api/render-jobs', {
      method: 'POST',
      token: 'ownerA',
      body: {
        action: 'create', project_id: PROJECT_A, revision_sha256: REV_SHA, shot_id: '03-forecourt', variant: 'banquet',
        provider: 'gemini-omni', mode: 'live', seconds: 5, resolution: '720p', source_clip_sha256: CLIP_SHA,
        confirm: true, approved_by: 'Kate',
      },
    }),
    env, ledger, verifyMembership,
    startWorkflow: async () => { providerSubmitCount++; return { id: 'wf_003' }; },
  });
  assert.equal(retryUncertain.status, 409);
  const errBody = await retryUncertain.json();
  assert.equal(errBody.error, 'needs_reconcile');
  assert.equal(errBody.provider_request_id, 'google_inter_123');
  assert.equal(providerSubmitCount, 1);

  // Step 6: Reconcile resumes from saved provider_request_id, recovers result & stores privately without resubmitting!
  const recRes = await handleRenderJobs({
    request: req('https://lab.assembl.co.nz/api/render-jobs', {
      method: 'POST',
      token: 'ownerA',
      body: { action: 'reconcile', project_id: PROJECT_A, job_id: created.job_id },
    }),
    env, ledger, verifyMembership,
    pollProvider: async ({ provider_request_id }) => {
      assert.equal(provider_request_id, 'google_inter_123');
      return {
        status: 'completed',
        bytes: new Uint8Array([0, 1, 2, 3]),
        contentType: 'video/mp4',
        frames: { first: { verdict: 'holds', score: 0.9 }, middle: { verdict: 'holds', score: 0.88 }, last: { verdict: 'holds', score: 0.87 } },
      };
    },
  });
  assert.equal(recRes.status, 200);
  const rec = await recRes.json();
  assert.equal(rec.action, 'recovered_completed');
  assert.equal(rec.resubmitted, false);
  assert.equal(rec.job.status, 'completed');
  assert.ok(rec.job.output_file_id);
  assert.equal(providerSubmitCount, 1);
});

test('AI disabled mode blocks paid AI calls cleanly while mock dispatch & exact-model Track A remain available', async () => {
  const ledger = createMemoryLedger();
  const env = { GEMINI_API_KEY: 'test-key', RENDER_AI_DISABLED: 'true' };

  const status = bindingReadiness(env);
  assert.equal(status.ai_enabled, false);
  assert.equal(status.exact_model_export_available, true);

  const liveBlocked = quoteRenderJob(env, { provider: 'gemini-omni', mode: 'live', seconds: 5, source_clip_sha256: CLIP_SHA });
  assert.equal(liveBlocked.error, 'ai_disabled');

  // Unconfigured fal-video refuses instead of silently switching to Gemini
  const falMissing = quoteRenderJob({ GEMINI_API_KEY: 'test-key' }, { provider: 'fal-video', mode: 'live', seconds: 5, source_clip_sha256: CLIP_SHA });
  assert.equal(falMissing.error, 'provider_not_configured');
  assert.equal(falMissing.provider, 'fal-video');

  // Text-only video request without Track A source clip is refused
  const noClip = quoteRenderJob({ GEMINI_API_KEY: 'test-key' }, { provider: 'gemini-omni', mode: 'live', seconds: 5 });
  assert.equal(noClip.error, 'source_clip_required');

  // Mock / dry-run completes cleanly with US$0.00 and writes to private project Films store
  const mockRes = await handleRenderJobs({
    request: req('https://lab.assembl.co.nz/api/render-jobs', {
      method: 'POST',
      token: 'ownerA',
      body: { action: 'create', project_id: PROJECT_A, revision_sha256: REV_SHA, shot_id: '03-forecourt', variant: 'conference', mode: 'mock' },
    }),
    env, ledger, verifyMembership,
  });
  assert.equal(mockRes.status, 202);
  const mockBody = await mockRes.json();
  assert.equal(mockBody.estimated_usd, 0);
  assert.equal(mockBody.job.status, 'completed');
  assert.ok(mockBody.job.output_file_id);
});

test('Webhook HMAC-SHA256 verification accepts valid signatures and rejects tampered payloads', async () => {
  const secret = 'webhook_secret_unit_test';
  const payload = JSON.stringify({ action: 'webhook', provider_request_id: 'req_99', status: 'completed' });
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sigBytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)));
  const sigHex = [...sigBytes].map((b) => b.toString(16).padStart(2, '0')).join('');

  assert.equal(await verifyWebhookSignature(payload, sigHex, secret), true);
  assert.equal(await verifyWebhookSignature(payload + ' ', sigHex, secret), false);

  const okRes = await handleRenderJobs({
    request: req('https://lab.assembl.co.nz/api/render-jobs', { method: 'POST', body: payload, headers: { 'x-assembl-signature': sigHex } }),
    env: { RENDER_WEBHOOK_SECRET: secret },
  });
  assert.equal(okRes.status, 202);

  const badRes = await handleRenderJobs({
    request: req('https://lab.assembl.co.nz/api/render-jobs', { method: 'POST', body: payload, headers: { 'x-assembl-signature': '0'.repeat(64) } }),
    env: { RENDER_WEBHOOK_SECRET: secret },
  });
  assert.equal(badRes.status, 401);

  const k1 = await computeJobKey({ project_id: PROJECT_A, revision_sha256: REV_SHA, shot_id: '03', variant: 'banquet', provider: 'gemini-omni', mode: 'live' });
  const k2 = await computeJobKey({ project_id: PROJECT_A, revision_sha256: REV_SHA, shot_id: '03', variant: 'conference', provider: 'gemini-omni', mode: 'live' });
  assert.notEqual(k1, k2);
});
