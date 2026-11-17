// Twin sharing on Cloudflare: not set up yet (it used Vercel Blob; it moves to Cloudflare R2 next).
// The twin pages ask this endpoint first and say plainly that sharing isn't available until then.
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
export async function onRequest({ request }) {
  if (request.method === 'GET') return json(new URL(request.url).searchParams.has('id') ? 404 : 200, new URL(request.url).searchParams.has('id') ? { error: 'not_found' } : { type: 'assembl.twin.share.status', configured: false, host: 'cloudflare' });
  return json(503, { error: 'not_configured' });
}
