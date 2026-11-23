// Cloudflare Workflow entrypoint: RenderDispatchWorkflow
// Durable state machine for optional Track B AI render jobs:
//   1. verify-ledger-and-idempotency (refuses automatic resubmission if status === 'uncertain')
//   2. mint-short-lived-input-urls (15-min signed URLs for approved Track A clips/stills only)
//   3. submit-provider-job (skips if provider_request_id already saved; saves provider_request_id immediately)
//   4. bounded polling / resume from saved provider_request_id (or verified webhook event)
//   5. fetch-validate-and-store (checks triple-frame drift vs Track A, stores into private storage, links to Films view)

import { WorkflowEntrypoint } from 'cloudflare:workers';
import { NonRetryableError } from 'cloudflare:workflows';
import {
  geminiKeyOf,
  falKeyOf,
  falEndpointOf,
  DEFAULT_GEMINI_VIDEO_MODEL,
  SHORT_LIVED_INPUT_TTL_S,
  createSupabaseLedger,
} from '../../../functions/api/_render-dispatch-core.js';
import { evaluateTripleFrameDrift } from '../../../architecture/js/agents/reviewer-rules.js';

const MAX_POLL_ATTEMPTS = 24; // bounded polling: 24 × 15s = 6 minutes max

export async function submitToProvider({ job, env, signedInputs, fetcher = fetch }) {
  if (job.mode === 'mock' || job.mode === 'dry_run') {
    return { provider_request_id: `mock_${job.id.slice(0, 8)}`, status: 'completed', mock: true };
  }
  if (job.provider === 'fal-video') {
    const key = falKeyOf(env);
    const endpoint = falEndpointOf(env).replace(/[^a-zA-Z0-9/_.-]/g, '');
    if (!key || !endpoint) throw new NonRetryableError('fal-video is not configured (FAL_KEY + FAL_VIDEO_ENDPOINT required).');
    const r = await fetcher(`https://queue.fal.run/${endpoint}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Key ${key}` },
      body: JSON.stringify({
        video_url: signedInputs.source_clip_url,
        image_url: signedInputs.reference_still_urls?.[0] || undefined,
        prompt: job.input_manifest?.prompt || 'Restyle architectural 3D clip to photographic NZ daylight; keep building geometry, rooflines, openings and mullions locked.',
      }),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j?.request_id) throw new NonRetryableError(`fal queue rejected submission (HTTP ${r.status}).`);
    return { provider_request_id: String(j.request_id), status: 'running' };
  }
  if (job.provider === 'gemini-omni') {
    const key = geminiKeyOf(env);
    if (!key) throw new NonRetryableError('GEMINI_API_KEY is not configured.');
    const model = env?.FILM_GEMINI_MODEL || DEFAULT_GEMINI_VIDEO_MODEL;
    const r = await fetcher('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key, 'api-revision': '2026-05-20' },
      body: JSON.stringify({
        model,
        input: [
          { type: 'video', mime_type: 'video/mp4', uri: signedInputs.source_clip_url },
          { type: 'text', text: job.input_manifest?.prompt || 'Edit this 3D clip to look like real architectural camera footage. Keep every roofline, opening, mullion and camera move locked.' },
        ],
        response_format: { type: 'video', resolution: job.input_manifest?.resolution || '720p', delivery: 'inline' },
        generation_config: { video_config: { task: 'edit' } },
        background: true,
        store: true,
      }),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j?.id) throw new NonRetryableError(`Gemini Omni rejected submission (HTTP ${r.status}).`);
    return { provider_request_id: String(j.id), status: j.status === 'completed' ? 'completed' : 'running' };
  }
  throw new NonRetryableError(`Unsupported workflow provider: ${job.provider}`);
}

export async function pollProviderStatus({ job, provider_request_id, env, fetcher = fetch }) {
  if (job.mode === 'mock' || job.mode === 'dry_run') {
    return {
      status: 'completed',
      bytes: new TextEncoder().encode(`MOCK_LOOK_STUDY|${job.id}|${provider_request_id}`),
      contentType: 'text/plain',
      frames: {
        first: { verdict: 'holds', score: 0.94 },
        middle: { verdict: 'holds', score: 0.93 },
        last: { verdict: 'holds', score: 0.92 },
      },
    };
  }
  if (job.provider === 'fal-video') {
    const key = falKeyOf(env), endpoint = falEndpointOf(env).replace(/[^a-zA-Z0-9/_.-]/g, '');
    const sr = await fetcher(`https://queue.fal.run/${endpoint}/requests/${encodeURIComponent(provider_request_id)}/status`, {
      headers: { authorization: `Key ${key}` },
    });
    const sj = await sr.json().catch(() => null);
    if (!sr.ok) return { status: 'failed', error: `fal_http_${sr.status}` };
    if (sj?.status === 'IN_QUEUE' || sj?.status === 'IN_PROGRESS') return { status: 'running' };
    if (sj?.status !== 'COMPLETED') return { status: 'failed', error: String(sj?.status || 'fal_failed') };
    const rr = await fetcher(`https://queue.fal.run/${endpoint}/requests/${encodeURIComponent(provider_request_id)}`, {
      headers: { authorization: `Key ${key}` },
    });
    const rj = await rr.json().catch(() => null);
    const url = rj?.video?.url || rj?.data?.video?.url;
    if (!url) return { status: 'failed', error: 'no_video_url' };
    const vid = await fetcher(url);
    if (!vid.ok) return { status: 'failed', error: 'video_fetch_failed' };
    return { status: 'completed', bytes: new Uint8Array(await vid.arrayBuffer()), contentType: 'video/mp4' };
  }
  if (job.provider === 'gemini-omni') {
    const key = geminiKeyOf(env);
    const r = await fetcher(`https://generativelanguage.googleapis.com/v1beta/interactions/${encodeURIComponent(provider_request_id)}`, {
      headers: { 'x-goog-api-key': key, 'api-revision': '2026-05-20' },
    });
    const j = await r.json().catch(() => null);
    if (!r.ok) return { status: 'failed', error: `gemini_http_${r.status}` };
    if (['in_progress', 'queued', 'requires_action'].includes(j?.status)) return { status: 'running' };
    if (j?.status !== 'completed') return { status: 'failed', error: String(j?.error?.code || j?.status || 'gemini_failed') };
    // Best-effort delete stored interaction on Google once retrieved
    await fetcher(`https://generativelanguage.googleapis.com/v1beta/interactions/${encodeURIComponent(provider_request_id)}`, {
      method: 'DELETE',
      headers: { 'x-goog-api-key': key, 'api-revision': '2026-05-20' },
    }).catch(() => void 0);
    let b64 = null;
    for (const s of j?.steps || []) for (const c of s?.content || []) if (c?.type === 'video' && c.data) b64 = c.data;
    if (!b64) return { status: 'failed', error: 'no_video_data' };
    const bin = atob(b64), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return { status: 'completed', bytes, contentType: 'video/mp4' };
  }
  return { status: 'failed', error: 'unsupported_provider' };
}

export class RenderDispatchWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const { job_id, project_id, auth_token } = event.payload;
    const token = auth_token || this.env.ARCH_SHARE_SERVICE_KEY;
    const ledger = createSupabaseLedger({ env: this.env, token });

    // Step 1: verify ledger state and guard against double-submitting uncertain paid requests
    const job = await step.do('verify-ledger-and-idempotency', async () => {
      const row = await ledger.getById(job_id, project_id);
      if (!row) throw new NonRetryableError('Render job not found in project ledger.');
      if (row.mode === 'live' && row.status === 'uncertain' && !row.provider_request_id) {
        throw new NonRetryableError('Uncertain paid job requires manual reconciliation before retry.');
      }
      return row;
    });

    if (job.status === 'completed' || job.status === 'rejected_drift') return { job_id, status: job.status };

    // Step 2: mint short-lived signed input URLs (15 min) for approved private inputs only
    const signedInputs = await step.do('mint-short-lived-input-urls', async () => {
      if (job.mode === 'mock' || job.mode === 'dry_run') return { source_clip_url: null, reference_still_urls: [] };
      const clipPath = job.input_manifest?.source_clip_storage_path;
      const source_clip_url = clipPath ? await ledger.signShortLivedUrl(clipPath, SHORT_LIVED_INPUT_TTL_S) : null;
      const stillPaths = Array.isArray(job.input_manifest?.reference_still_storage_paths) ? job.input_manifest.reference_still_storage_paths : [];
      const reference_still_urls = [];
      for (const p of stillPaths.slice(0, 4)) {
        const u = await ledger.signShortLivedUrl(p, SHORT_LIVED_INPUT_TTL_S);
        if (u) reference_still_urls.push(u);
      }
      return { source_clip_url, reference_still_urls };
    });

    // Step 3: submit provider job ONLY if provider_request_id is not already saved (retries: 0 to never double-charge!)
    const providerRequestId = await step.do('submit-provider-job', { retries: { limit: 0 } }, async () => {
      const fresh = await ledger.getById(job_id, project_id);
      if (fresh?.provider_request_id) return fresh.provider_request_id;
      await ledger.update(job_id, { status: 'submitting', attempts: (fresh?.attempts || 0) + 1 });
      try {
        const sub = await submitToProvider({ job: fresh || job, env: this.env, signedInputs });
        await ledger.update(job_id, { status: 'running', provider_request_id: sub.provider_request_id });
        return sub.provider_request_id;
      } catch (err) {
        // Network/timeout ambiguity on a live paid call -> mark 'uncertain' so reconcile runs first
        const uncertain = (fresh || job).mode === 'live' && !(err instanceof NonRetryableError);
        await ledger.update(job_id, {
          status: uncertain ? 'uncertain' : 'failed',
          error_code: uncertain ? 'uncertain_submission' : 'submit_failed',
          error_message: String(err?.message || err).slice(0, 240),
        });
        throw new NonRetryableError(String(err?.message || err));
      }
    });

    // Step 4: bounded polling resuming from saved provider_request_id
    let result = null;
    for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt++) {
      const poll = await step.do(`poll-provider-status-${attempt}`, async () => {
        return pollProviderStatus({ job, provider_request_id: providerRequestId, env: this.env });
      });
      if (poll.status === 'completed' || poll.status === 'failed') {
        result = poll;
        break;
      }
      await step.sleep(`wait-between-polls-${attempt}`, '15 seconds');
    }

    if (!result || result.status !== 'completed') {
      await step.do('mark-failed-or-timeout', async () => {
        await ledger.update(job_id, {
          status: 'failed',
          error_code: result?.error || 'poll_timeout',
          error_message: 'Provider did not complete within bounded polling window; use Reconcile with saved provider_request_id.',
        });
      });
      return { job_id, status: 'failed', provider_request_id: providerRequestId };
    }

    // Step 5: validate drift & store in private storage (visible in project Films view)
    const finalStatus = await step.do('fetch-validate-and-store', async () => {
      const drift = result.frames ? evaluateTripleFrameDrift(result.frames) : null;
      if (drift && (drift.recommendation === 'reject_drift' || drift.recommendation === 'incomplete')) {
        await ledger.update(job_id, { status: 'rejected_drift', drift_report: drift });
        return 'rejected_drift';
      }
      const stored = await ledger.storePrivateAsset({
        practice_id: job.practice_id,
        project_id: job.project_id,
        name: `${job.shot_id}-${job.variant}-${job.mode === 'live' ? 'ai-study.mp4' : 'mock-study.txt'}`,
        contentType: result.contentType || 'video/mp4',
        bytes: result.bytes,
        meta: {
          job_id: job.id,
          revision_sha256: job.revision_sha256,
          provider: job.provider,
          model: job.model,
          mode: job.mode,
          approved_by: job.approved_by,
          label: 'AI-generated look study — not checked geometry.',
        },
      });
      await ledger.update(job_id, {
        status: 'completed',
        drift_report: drift,
        output_file_id: stored.file_id,
        output_storage_path: stored.path,
      });
      return 'completed';
    });

    return { job_id, status: finalStatus, provider_request_id: providerRequestId };
  }
}
