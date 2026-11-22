// assembl lab · live and latest public data on Cloudflare Pages. Same URL and same JSON as the old Vercel function (api/live.js):
//   GET /api/live/?feeds=weather,power&place=auckland   (v2)      GET /api/live/?place=auckland   (v1, used by /live.js)
//   GET /api/live/?feeds=site&lat=-36.80&lon=175.08                (facts about one point of land, for Plan Studio)
// The feeds themselves live in api/_feeds/ and are shared with the Node entry; see api/_feeds/handle.js for the JSON shapes.
// Key-less public sources only. Each upstream call has an 8 s timeout, and a feed that fails comes back as { id, error }
// without failing the others. Answers are cached with s-maxage from the shortest feed cadence, and also in the Workers cache
// when it is there, so repeated asks do not go back to the publishers. An answer with a failed feed says "no-store" and is
// never put in the cache: the next ask goes to the publisher again instead of being handed the same failure.
import { handleLive, CORS } from "../../api/_feeds/handle.js";

export async function onRequest(context) {
  const { request } = context; // Pages passes { request, env, waitUntil, ... }; every feed works key-less. Only the one optional key below is handed on.
  const method = request.method.toUpperCase();
  if (method === "OPTIONS") return new Response(null, { status: 204, headers: { ...CORS, "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS", "Access-Control-Allow-Headers": "content-type, accept", "Access-Control-Max-Age": "86400" } });
  if (method !== "GET" && method !== "HEAD") return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: { ...CORS, Allow: "GET, HEAD, OPTIONS", "Content-Type": "application/json; charset=utf-8" } });

  const url = new URL(request.url);
  const cache = globalThis.caches?.default; // Cloudflare's per-data-centre cache; absent in Node and in tests
  const key = new Request(url.toString(), { method: "GET" });
  if (cache) { try { const hit = await cache.match(key); if (hit) return method === "HEAD" ? new Response(null, hit) : hit; } catch (e) { /* no cache: go to the sources */ } }

  let out;
  // DIGITALNZ_API_KEY (optional): switches on the Gazette signals (api/_feeds/signals-gazette.js). No other setting is passed to the feeds.
  const env = context.env?.DIGITALNZ_API_KEY ? { DIGITALNZ_API_KEY: context.env.DIGITALNZ_API_KEY } : undefined;
  try { out = await handleLive(url.searchParams, env); }
  catch (e) { out = { status: 500, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }, body: { error: "live_failed", message: String(e?.message || e).slice(0, 200) } }; }
  const res = new Response(method === "HEAD" ? null : JSON.stringify(out.body), { status: out.status, headers: out.headers });
  const storable = out.status === 200 && !/no-store/i.test(out.headers?.["Cache-Control"] ?? "");
  if (storable && cache) { // keep a copy for the next ask; waitUntil lets the write finish after this answer is sent
    const put = cache.put(key, new Response(JSON.stringify(out.body), { status: 200, headers: out.headers })).catch(() => {});
    if (typeof context.waitUntil === "function") context.waitUntil(put);
  }
  return res;
}
