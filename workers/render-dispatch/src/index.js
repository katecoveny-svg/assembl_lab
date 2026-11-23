// Cloudflare Worker HTTP router for assembl-render-dispatch.
// Enforces project membership on EVERY job and asset operation and starts RenderDispatchWorkflow instances.

import { handleRenderJobs } from '../../../functions/api/render-jobs.js';
import { verifyProjectMembership, createSupabaseLedger, SHORT_LIVED_ASSET_TTL_S } from '../../../functions/api/_render-dispatch-core.js';
import { RenderDispatchWorkflow, pollProviderStatus } from './workflow.js';

export { RenderDispatchWorkflow };

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' },
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Private asset download/playback endpoint: enforces project membership before minting short-lived URL or streaming R2 object.
    if (request.method === 'GET' && url.pathname.endsWith('/asset')) {
      const project_id = url.searchParams.get('project_id') || '';
      const job_id = url.searchParams.get('job_id') || '';
      const member = await verifyProjectMembership({ request, env, project_id, requireWrite: false });
      if (!member.ok) return json(member.status, { error: member.error, message: member.message });
      const ledger = createSupabaseLedger({ env, token: member.token });
      const job = await ledger.getById(job_id, member.project_id);
      if (!job || !job.output_storage_path) return json(404, { error: 'asset_not_found' });
      if (env?.RENDER_BUCKET?.get) {
        const obj = await env.RENDER_BUCKET.get(job.output_storage_path);
        if (!obj) return json(404, { error: 'asset_not_found' });
        return new Response(obj.body, {
          headers: { 'content-type': obj.httpMetadata?.contentType || 'video/mp4', 'cache-control': 'private, no-store' },
        });
      }
      const signedUrl = await ledger.signShortLivedUrl(job.output_storage_path, SHORT_LIVED_ASSET_TTL_S);
      if (!signedUrl) return json(404, { error: 'asset_not_signed' });
      return json(200, { type: 'assembl.render-dispatch.asset', job_id: job.id, url: signedUrl, expires_in: SHORT_LIVED_ASSET_TTL_S });
    }

    const startWorkflow = env?.RENDER_WORKFLOW?.create
      ? async (job) => {
          const authHeader = request.headers.get('authorization') || '';
          const auth_token = authHeader.replace(/^Bearer\s+/i, '').trim() || null;
          return env.RENDER_WORKFLOW.create({
            id: job.id,
            params: { job_id: job.id, project_id: job.project_id, auth_token },
          });
        }
      : null;

    return handleRenderJobs({
      request,
      env,
      startWorkflow,
      pollProvider: ({ provider, provider_request_id }) =>
        pollProviderStatus({ job: { provider, mode: 'live' }, provider_request_id, env }),
    });
  },
};
