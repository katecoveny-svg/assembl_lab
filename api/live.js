// assembl lab · live and latest public data. Key-less public sources only, cached at the edge.
// This is the Vercel (Node) entry. The lab now runs on Cloudflare Pages, where the same answer is served by
// functions/api/live.js. Both call handleLive() in api/_feeds/handle.js, which documents the URL and the JSON shapes.
import { handleLive } from "./_feeds/handle.js";

export default async function handler(req, res) {
  const out = await handleLive(new URL(req.url || "/", "http://localhost").searchParams);
  for (const [k, v] of Object.entries(out.headers)) res.setHeader(k, v);
  return res.status(out.status).json(out.body);
}
