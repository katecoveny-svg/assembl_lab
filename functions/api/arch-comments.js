// /api/arch-comments  Comments from the client page of a shared project (architecture/share/), by share token.
//   GET  ?t=<token>                          the comments the client may see: those marked for the client, not hidden; of client
//                                            comments, only those written under this link
//   POST { t, name, body, file_id?, pin? }   one new comment from the client, with a name and nothing else (no account, no email)
//
// The same safety as /api/arch-share: it needs ARCH_SHARE_SERVICE_KEY (Cloudflare only) and the migration
// supabase/migrations/20261123220000_arch_comments.sql; without either it answers 503 not_configured.
//   - the token is the only way in. A wrong, old or turned-off link gets the same 404 whether it is read or written, so
//     turning the client link off stops comments at once, and a new link (a new token) does not open the old client comments.
//   - plain text only, 2,000 characters at most, names 60: cleaned here and again by the database. Nothing is ever rendered as
//     a link or as markup (comments-rules.js).
//   - a comment may name a file only if that file is one the client page shows (a still, film, drawing or the model), and a
//     pin only on a still. A client cannot reach site files, photos or anything else.
//   - rate limited by link and by address: 8 in 10 minutes for one address, 40 an hour for one link, counted in the database
//     (arch.comment_hit holds a hash of the address, never the address) with the same numbers checked here first.
//   - a write from another site's page is refused (Origin must be this site's), and the body is read only up to 8 KB.
import { SUPABASE_URL, SCHEMA } from "../../architecture/js/config.js";
import { clientParts, TOKEN } from "../../architecture/js/share-rules.js";
import { cleanBody, cleanName, pinOf, rateDecision, RATE } from "../../architecture/js/comments-rules.js";

const json = (status, body, extra = {}) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", "x-robots-tag": "noindex", ...extra } });
export const BODY_LIMIT = 8 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// the first line of the rate limit, in this server instance (the database holds the one that counts across instances)
const hits = [];
const keep = Math.max(RATE.ip.seconds, RATE.token.seconds) * 1000;
export const _forget = () => { hits.length = 0; };

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const rpc = async (base, key, name, args) => {
  const r = await fetch(`${base}/rest/v1/rpc/${name}`, { method: "POST", headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json", "content-profile": SCHEMA, accept: "application/json" }, body: JSON.stringify(args) });
  let data = null;
  try { data = await r.json(); } catch { /* an empty answer */ }
  return { status: r.status, ok: r.ok, data };
};
const setup = (env) => ({ key: env?.ARCH_SHARE_SERVICE_KEY, base: env?.SUPABASE_URL || SUPABASE_URL });

export async function onRequestGet({ request, env }) {
  const token = new URL(request.url).searchParams.get("t") ?? "";
  if (!TOKEN.test(token)) return json(404, { error: "not_shared" });
  const { key, base } = setup(env);
  if (!key) return json(503, { error: "not_configured" });
  let r;
  try { r = await rpc(base, key, "client_comments", { p_token: token }); } catch { return json(502, { error: "unavailable" }); }
  if (r.status === 404 && r.data?.code === "PGRST202") return json(503, { error: "not_configured" }); // the migration is not applied
  if (!r.ok) return json(502, { error: "unavailable" });
  if (!r.data || !Array.isArray(r.data.comments)) return json(404, { error: "not_shared" });
  const pick = (c) => ({ id: c.id, file_id: c.file_id ?? null, pin: c.pin_x != null && c.pin_y != null ? { x: Number(c.pin_x), y: Number(c.pin_y) } : null, pin_no: c.pin_no ?? null, from: c.from === "client" ? "client" : "practice", by: String(c.by ?? ""), body: String(c.body ?? ""), at: c.at ?? "" });
  return json(200, { type: "assembl.arch.comments.v1", comments: r.data.comments.map(pick) });
}

export async function onRequestPost({ request, env }) {
  const url = new URL(request.url), origin = request.headers.get("origin");
  if (origin && origin !== url.origin) return json(403, { error: "other_site" });
  const text = await request.text().catch(() => "");
  if (text.length > BODY_LIMIT) return json(413, { error: "too_big" });
  let d;
  try { d = JSON.parse(text); } catch { return json(400, { error: "bad_comment" }); }
  if (!d || typeof d !== "object" || Array.isArray(d)) return json(400, { error: "bad_comment" });
  const token = typeof d.t === "string" ? d.t : "";
  if (!TOKEN.test(token)) return json(404, { error: "not_shared" });
  const { key, base } = setup(env);
  if (!key) return json(503, { error: "not_configured" });
  const body = cleanBody(d.body), name = cleanName(d.name);
  if (!body.ok || !name.ok) return json(400, { error: "bad_comment", why: !name.ok ? name.why : body.why });
  const pin = d.pin == null ? null : pinOf(d.pin?.x, d.pin?.y);
  if (d.pin != null && !pin) return json(400, { error: "bad_comment", why: "That point is not on the picture." });
  const fileId = d.file_id == null ? null : String(d.file_id);
  if (fileId !== null && !UUID.test(fileId)) return json(400, { error: "bad_comment", why: "That file is not on this page." });
  if (pin && !fileId) return json(400, { error: "bad_comment", why: "A pin needs a picture." });

  // what the client page shows decides what a comment may name
  let shared;
  try { shared = await rpc(base, key, "shared_project", { p_token: token }); } catch { return json(502, { error: "unavailable" }); }
  if (shared.status === 404 && shared.data?.code === "PGRST202") return json(503, { error: "not_configured" });
  if (!shared.ok) return json(502, { error: "unavailable" });
  if (!shared.data?.project) return json(404, { error: "not_shared" });
  if (fileId) {
    const view = clientParts({ project: shared.data.project, files: shared.data.files ?? [], documents: shared.data.documents ?? [], practice: shared.data.practice });
    const shown = [...view.stills, ...view.films, ...view.drawings].flatMap((i) => i.versions.map((v) => ({ id: String(v.id).toLowerCase(), still: i.media === "image" })));
    if (view.model) for (const n of [view.model.note, view.model.of]) if (n?.id) shown.push({ id: String(n.id).toLowerCase(), still: false });
    const at = shown.find((s) => s.id === fileId.toLowerCase());
    if (!at) return json(400, { error: "bad_comment", why: "That file is not on this page." });
    if (pin && !at.still) return json(400, { error: "bad_comment", why: "A pin goes on a picture." });
  }

  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  while (hits.length && hits[0].at < now - keep) hits.shift();
  const rate = rateDecision(hits, { token, ip, now });
  if (!rate.ok) return json(429, { error: "rate_limited", retry: rate.retry }, { "retry-after": String(rate.retry) });

  const salt = env?.ARCH_COMMENT_SALT || "assembl-arch-comments";
  const ipHash = (await sha256Hex(`${salt}:${ip}`)).slice(0, 32);
  let r;
  try { r = await rpc(base, key, "client_comment_add", { p_token: token, p_ip_hash: ipHash, p_name: name.text, p_body: body.text, p_file: fileId, p_pin_x: pin?.x ?? null, p_pin_y: pin?.y ?? null }); } catch { return json(502, { error: "unavailable" }); }
  if (r.status === 404 && r.data?.code === "PGRST202") return json(503, { error: "not_configured" });
  if (!r.ok) {
    const why = String(r.data?.message ?? "");
    if (why.includes("not_shared")) return json(404, { error: "not_shared" });
    if (why.includes("rate_limited")) return json(429, { error: "rate_limited", retry: 60 }, { "retry-after": "60" });
    if (why.includes("bad_comment") || r.data?.code === "23514" || r.data?.code === "22023") return json(400, { error: "bad_comment" });
    return json(502, { error: "unavailable" });
  }
  hits.push({ token, ip, at: now });
  const c = r.data ?? {};
  return json(201, { type: "assembl.arch.comment.v1", comment: { id: c.id, file_id: c.file_id ?? null, pin: c.pin_x != null && c.pin_y != null ? { x: Number(c.pin_x), y: Number(c.pin_y) } : null, pin_no: c.pin_no ?? null, from: "client", by: String(c.by ?? name.text), body: String(c.body ?? body.text), at: c.at ?? new Date(now).toISOString() } });
}

export async function onRequest({ request }) {
  return json(405, { error: "method_not_allowed" }, { allow: "GET, POST" });
}
