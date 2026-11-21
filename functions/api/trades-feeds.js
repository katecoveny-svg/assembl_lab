// assembl lab · trades twin "Latest published" chips on Cloudflare Pages. Same URL and JSON as api/trades-feeds.js (the Vercel entry):
//   GET /api/trades-feeds/  →  { type:"assembl.trades-feeds", version:1, fetchedAt, feeds:{ determinations, consents }, fallback }
// The fetching and parsing is tradesFeeds() in api/trades-feeds.js, shared with the Node entry. Two key-less public sources.
import { tradesFeeds } from "../../api/trades-feeds.js";

const CORS = { "Access-Control-Allow-Origin": "*", "X-Content-Type-Options": "nosniff" };

export async function onRequest({ request }) {
  const method = request.method.toUpperCase();
  if (method === "OPTIONS") return new Response(null, { status: 204, headers: { ...CORS, "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS" } });
  if (method !== "GET" && method !== "HEAD") return new Response(null, { status: 405, headers: { ...CORS, Allow: "GET, HEAD, OPTIONS" } });
  const out = await tradesFeeds();
  const ok = !out.feeds.determinations.error && !out.feeds.consents.error;
  const headers = { ...CORS, "Cache-Control": ok ? "public, s-maxage=21600, stale-while-revalidate=86400" : "public, s-maxage=900, stale-while-revalidate=3600", "Content-Type": "application/json; charset=utf-8" };
  return new Response(method === "HEAD" ? null : JSON.stringify(out), { status: 200, headers });
}
