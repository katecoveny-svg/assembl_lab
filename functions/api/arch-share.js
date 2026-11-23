// GET /api/arch-share?t=<token>  The client page of a shared project (architecture/share/): what it may show, with short-lived
// links to the files. Read-only. Nothing is written.
//
// Off by default, and safe when not set up:
//   - it needs ARCH_SHARE_SERVICE_KEY (the Supabase service key, kept in Cloudflare only; never in the site or the repo) and the
//     migration supabase/migrations/20261123200000_arch_project_share.sql. Without either it answers 503 not_configured.
//   - the database answers only for a token whose link an owner turned on (arch.shared_project). Any other token, a turned-off
//     link or a malformed one gets the same 404, so a guess learns nothing.
//   - what is shown is picked by the same rules the workspace uses (architecture/js/share-rules.js): stills, films, drawings
//     (PDF) and the model. Never site files, photos, money, tasks, people, the site point or the address.
//   - file links are signed for one hour; file names in them are ids only.
import { SUPABASE_URL, SCHEMA, BUCKET } from "../../architecture/js/config.js";
import { clientParts, TOKEN } from "../../architecture/js/share-rules.js";
import { logoFor } from "../../architecture/js/artwork-kit.js";

const json = (status, body, extra = {}) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", "x-robots-tag": "noindex", ...extra } });
export const SIGN_SECONDS = 3600;

/** the look's name from the practice record ("sketch", or { theme: "sketch" } as some records keep it) */
export const lookOf = (t) => (typeof t === "string" ? t : typeof t?.theme === "string" ? t.theme : typeof t?.key === "string" ? t.key : "");

export async function onRequestGet({ request, env }) {
  const q = new URL(request.url).searchParams;
  // ?status: whether client links can open at all (the workspace says plainly when only the server key is missing)
  if (q.has("status")) return json(200, { type: "assembl.arch.share.status", configured: !!env?.ARCH_SHARE_SERVICE_KEY });
  const token = q.get("t") ?? "";
  if (!TOKEN.test(token)) return json(404, { error: "not_shared" });
  const key = env?.ARCH_SHARE_SERVICE_KEY;
  if (!key) return json(503, { error: "not_configured" });
  const base = env?.SUPABASE_URL || SUPABASE_URL, head = { apikey: key, authorization: `Bearer ${key}` };
  let data;
  try {
    const r = await fetch(`${base}/rest/v1/rpc/shared_project`, { method: "POST", headers: { ...head, "content-type": "application/json", "content-profile": SCHEMA, accept: "application/json" }, body: JSON.stringify({ p_token: token }) });
    if (r.status === 404) return json(503, { error: "not_configured" }); // the function is not there: the migration is not applied
    if (!r.ok) return json(502, { error: "unavailable" });
    data = await r.json();
  } catch { return json(502, { error: "unavailable" }); }
  if (!data || !data.project) return json(404, { error: "not_shared" });
  const view = clientParts({ project: data.project, files: data.files ?? [], documents: data.documents ?? [], practice: data.practice });
  const notes = [...view.stills, ...view.films, ...view.drawings].map((i) => i.latest).concat(view.model ? [view.model.note] : []);
  const theme = lookOf(data.practice?.theme), logo = logoFor(data.practice?.artwork, theme === "sketch" ? "sketch" : "assembl");
  const logoPath = typeof logo?.path === "string" && logo.path.startsWith(`${String(logo.path).split("/")[0]}/artwork/`) ? logo.path : "";
  const paths = [...new Set(notes.map((n) => n.path).concat(logoPath ? [logoPath] : []).filter(Boolean))];
  const signed = new Map();
  if (paths.length) {
    try {
      const r = await fetch(`${base}/storage/v1/object/sign/${BUCKET}`, { method: "POST", headers: { ...head, "content-type": "application/json" }, body: JSON.stringify({ expiresIn: SIGN_SECONDS, paths }) });
      if (r.ok) for (const s of await r.json()) if (s?.path && s?.signedURL) signed.set(s.path, `${base}/storage/v1${s.signedURL}`);
    } catch { /* the page shows the items without pictures */ }
  }
  const out = (n) => ({ id: String(n.id ?? ""), name: n.name, type: n.type ?? "", size: Number(n.size) || 0, kept_at: n.kept_at ?? "", url: signed.get(n.path) ?? "" });
  const item = (i) => ({ title: i.title, kind: i.kind, media: i.media, versions: i.count, file: out(i.latest) });
  return json(200, {
    type: "assembl.arch.share.v1",
    name: view.name,
    practice: data.practice ? { name: String(data.practice.name ?? ""), theme, logo: logoPath ? (signed.get(logoPath) ?? "") : "" } : null,
    stills: view.stills.map(item), films: view.films.map(item), drawings: view.drawings.map(item),
    model: view.model ? out(view.model.note) : null,
    expires_in: SIGN_SECONDS,
  });
}

export async function onRequest({ request }) {
  if (request.method !== "GET") return json(405, { error: "read_only" }, { allow: "GET" });
  return json(404, { error: "not_shared" });
}
