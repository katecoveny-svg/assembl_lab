// assembl lab · twin sharing: stills, fly-throughs and dropped plans saved from the assembl twin, each with a short share page.
// Uploads go from the browser straight to Vercel Blob with a client token issued here, so large videos never pass through this
// function. Only the owner can save (TWIN_OWNER_KEY); anyone with a link can view. Needs a Blob store connected to the project
// (BLOB_READ_WRITE_TOKEN) and TWIN_OWNER_KEY. Nothing else is stored: no accounts, no analytics.
import { timingSafeEqual } from "node:crypto";
import { handleUpload } from "@vercel/blob/client";
import { head, put } from "@vercel/blob";

const TYPES = ["image/png", "image/jpeg", "video/webm", "video/mp4", "application/json"];
const ID = /^[a-f0-9]{12}$/;
const configured = () => !!process.env.BLOB_READ_WRITE_TOKEN && !!process.env.TWIN_OWNER_KEY;
function keyOk(k) {
  const want = process.env.TWIN_OWNER_KEY || "";
  if (typeof k !== "string" || !want || k.length !== want.length) return false;
  return timingSafeEqual(Buffer.from(k), Buffer.from(want));
}
const blobUrl = (u) => typeof u === "string" && /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/twin-shares\/[a-f0-9]{12}(-plan)?\.(png|jpg|webm|mp4|json)$/.test(u);
const cors = (res) => {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-headers", "content-type");
  res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
};

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method === "GET") {
    const id = req.query?.id;
    if (!id) return res.status(200).json({ type: "assembl.twin.share.status", configured: configured() });
    if (!ID.test(String(id))) return res.status(400).json({ error: "bad_id" });
    if (!configured()) return res.status(503).json({ error: "not_configured" });
    try {
      const h = await head(`twin-shares/${id}.json`);
      const m = await fetch(h.url).then((r) => r.json());
      res.setHeader("cache-control", "public, max-age=60");
      return res.status(200).json(m);
    } catch {
      return res.status(404).json({ error: "not_found" });
    }
  }
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  if (!configured()) return res.status(503).json({ error: "not_configured", hint: "Connect a Blob store and set TWIN_OWNER_KEY on the project." });
  if (req.query?.op === "manifest") {
    const b = req.body || {};
    if (!keyOk(b.key)) return res.status(401).json({ error: "unauthorised" });
    const kind = ["still", "video", "scene"].includes(b.kind) ? b.kind : null;
    if (!kind || !ID.test(String(b.id))) return res.status(400).json({ error: "bad_request" });
    if ((b.fileUrl && !blobUrl(b.fileUrl)) || (b.planUrl && !blobUrl(b.planUrl))) return res.status(400).json({ error: "bad_url" });
    const page = typeof b.page === "string" && /^\/plan-studio\/twins\/[a-z0-9-]+\/?$/.test(b.page) ? b.page : "/plan-studio/twins/drop/";
    const m = {
      schema: "assembl.twin.share.v1", id: b.id, kind,
      title: String(b.title || "assembl twin").slice(0, 140), project: String(b.project || "").slice(0, 60),
      fileUrl: b.fileUrl || "", planUrl: b.planUrl || "", query: String(b.query || "").slice(0, 600).replace(/[^\w=&.,%-]/g, ""), page,
      created: new Date().toISOString(),
      label: "Rendered in the assembl twin (three.js). A proposed design, not a photograph.",
    };
    await put(`twin-shares/${b.id}.json`, JSON.stringify(m), { access: "public", addRandomSuffix: false, allowOverwrite: false, contentType: "application/json" });
    return res.status(200).json({ ok: true, id: b.id });
  }
  try {
    const out = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        let p = {};
        try { p = JSON.parse(clientPayload || "{}"); } catch { /* checked below */ }
        if (!keyOk(p.key)) throw new Error("unauthorised");
        if (!/^twin-shares\/[a-f0-9]{12}(-plan)?\.(png|jpg|webm|mp4|json)$/.test(pathname)) throw new Error("bad_path");
        return { allowedContentTypes: TYPES, maximumSizeInBytes: 300_000_000, addRandomSuffix: false, allowOverwrite: false, tokenPayload: JSON.stringify({ id: p.id }) };
      },
    });
    return res.status(200).json(out);
  } catch (e) {
    return res.status(e?.message === "unauthorised" ? 401 : 400).json({ error: e?.message || "upload_failed" });
  }
}
