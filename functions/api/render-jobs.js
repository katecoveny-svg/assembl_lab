// Cloudflare Pages Function: /api/render-jobs
// Project-scoped persistent render dispatch bridge on the existing Pages project.
//   GET  /api/render-jobs?status=1                       binding readiness by name only + provider limits/pricing (no secrets)
//   GET  /api/render-jobs?project_id=<uuid>              list jobs for a project (membership required)
//   GET  /api/render-jobs?project_id=<uuid>&id=<uuid>    inspect one job (membership required)
//   POST /api/render-jobs { action:'quote', ... }        quote cost, provider, model, inputs (membership required)
//   POST /api/render-jobs { action:'create', ... }       create job -> 202 + job_id (delegates to Workflow Worker if bound)
//   POST /api/render-jobs { action:'reconcile', ... }    reconcile uncertain/failed/running job without double-charging
//   POST /api/render-jobs { action:'webhook', ... }      verified HMAC webhook receiver

import { allowedOrigin } from './render.js';
import {
  bindingReadiness,
  quoteRenderJob,
  verifyProjectMembership,
  createSupabaseLedger,
  createMemoryLedger,
  createOrResumeJob,
  reconcileJob,
  verifyWebhookSignature,
} from './_render-dispatch-core.js';

const fallbackLedger = createMemoryLedger();

function cors(request) {
  const o = request.headers.get('origin');
  return allowedOrigin(o)
    ? { 'access-control-allow-origin': o, 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type, authorization, x-assembl-signature', 'access-control-max-age': '86400', vary: 'origin' }
    : { vary: 'origin' };
}

function json(status, body, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-robots-tag': 'noindex', ...extra },
  });
}

export async function handleRenderJobs({ request, env = {}, ledger = null, verifyMembership = null, pollProvider = null, startWorkflow = null } = {}) {
  const H = cors(request);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: H });

  const url = new URL(request.url);
  if (request.method === 'GET' && url.searchParams.has('status')) {
    return json(200, bindingReadiness(env), H);
  }

  // If the dedicated Cloudflare Workflow Worker is bound via Service Binding, forward authenticated requests directly to it.
  if (env?.RENDER_DISPATCH?.fetch && !ledger && !verifyMembership) {
    const proxied = await env.RENDER_DISPATCH.fetch(request);
    const headers = new Headers(proxied.headers);
    for (const [k, v] of Object.entries(H)) headers.set(k, v);
    return new Response(proxied.body, { status: proxied.status, headers });
  }

  if (request.method === 'GET') {
    const project_id = url.searchParams.get('project_id') || '';
    const member = await verifyProjectMembership({ request, env, project_id, requireWrite: false, verifyMembership });
    if (!member.ok) return json(member.status, { error: member.error, message: member.message }, H);
    const store = ledger || (env?.USE_MEMORY_LEDGER ? fallbackLedger : createSupabaseLedger({ env, token: member.token }));
    const id = url.searchParams.get('id');
    if (id) {
      const job = await store.getById(id, member.project_id);
      if (!job) return json(404, { error: 'job_not_found', message: 'No render job with that ID in this project.' }, H);
      return json(200, { type: 'assembl.render-dispatch.job', job }, H);
    }
    const jobs = await store.listByProject(member.project_id);
    return json(200, { type: 'assembl.render-dispatch.list', project_id: member.project_id, jobs }, H);
  }

  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' }, H);

  const rawText = await request.text().catch(() => '');
  let body;
  try { body = JSON.parse(rawText); } catch { return json(400, { error: 'bad_json', message: 'Request body must be valid JSON.' }, H); }
  const action = String(body?.action || 'create');

  if (action === 'webhook') {
    const sig = request.headers.get('x-assembl-signature') || '';
    const ok = await verifyWebhookSignature(rawText, sig, env?.RENDER_WEBHOOK_SECRET || '');
    if (!ok) return json(401, { error: 'bad_signature', message: 'Webhook signature verification failed.' }, H);
    return json(202, { type: 'assembl.render-dispatch.webhook', accepted: true, provider_request_id: body?.provider_request_id || null }, H);
  }

  const project_id = String(body?.project_id || '');
  const requireWrite = action === 'create' || action === 'reconcile';
  const member = await verifyProjectMembership({ request, env, project_id, requireWrite, verifyMembership });
  if (!member.ok) return json(member.status, { error: member.error, message: member.message }, H);

  if (action === 'quote') {
    const q = quoteRenderJob(env, body);
    return json(q.error ? (q.error === 'provider_not_configured' || q.error === 'ai_disabled' ? 503 : 400) : 200, q, H);
  }

  const store = ledger || (env?.USE_MEMORY_LEDGER ? fallbackLedger : createSupabaseLedger({ env, token: member.token }));

  if (action === 'reconcile') {
    const job = await store.getById(String(body?.job_id || ''), member.project_id);
    const out = await reconcileJob({ ledger: store, job, env, pollProvider });
    return json(out.status, out.body, H);
  }

  if (action === 'create') {
    const out = await createOrResumeJob({ ledger: store, membership: member, payload: body, env, startWorkflow });
    return json(out.status, out.body, H);
  }

  return json(400, { error: 'bad_action', message: 'Action must be quote, create, reconcile or webhook.' }, H);
}

export async function onRequest(context) {
  return handleRenderJobs(context);
}
