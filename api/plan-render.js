// assembl lab · Plan Studio: AI-enhanced stills and hero clips, always driven by the true model.
// The browser sends a render of the real model (a still, its depth pass, or a short guide clip recorded along a path through it);
// the AI may restyle light and materials, never redesign. Every result is labelled "AI-enhanced visualisation" and the page burns
// that label into the file. Free first: stills and flythroughs come from the browser and Blender; this is the occasional paid extra.
// Spending money is explicit: the page shows the estimate and a paid request must carry `confirm: true`.
// Needs FAL_KEY. FAL_ENDPOINTS (comma list of ids) narrows the allow-list below; PLANRENDER_DAILY_CAP (default 60 jobs/day).
// Endpoint ids, input fields and prices move often: they were gathered in Nov 2026 from fal.ai and third-party listings, and each
// must be confirmed on its fal.ai model page before a client job relies on it.
export const DEFAULT_ENDPOINTS = {
  "still-edit": { id: "fal-ai/nano-banana/edit", kind: "image", name: "Photoreal still", est: "about US$0.04–0.15 per image", per: "image" },
  "still-depth": { id: "fal-ai/flux-control-lora-depth", kind: "image", name: "Depth-locked still", est: "about US$0.04 per megapixel", per: "image" },
  // Wan VACE (depth): our flythrough of the real model is the guide video; the model keeps its depth (walls, roof, openings stay put)
  // and restyles the surfaces and light. Roughly 5 s per clip. The best choice when the geometry must not drift.
  "clip-depth": { id: "fal-ai/wan-vace-14b/depth", kind: "video", name: "Hero clip, geometry-locked (Wan VACE depth)", est: "about US$0.20–0.40 per clip (≈5 s at US$0.04–0.08/s)", per: "clip",
    guide: { seconds: 5, w: 1280, h: 720 }, note: "Follows the depth of the guide clip recorded from the model." },
  // Hailuo 02 (standard, image-to-video): one still of the model, animated. Cheaper per second, but it invents the camera move and
  // can drift the geometry, so the label says "illustrative motion".
  "clip-still": { id: "fal-ai/minimax/hailuo-02/standard/image-to-video", kind: "video", name: "Hero clip from a still (Hailuo 02)", est: "about US$0.27 per 6 s clip (≈US$0.045/s)", per: "clip",
    note: "Animates one still; the motion is invented and the geometry can drift. Illustrative only." },
  "clip": { id: "fal-ai/kling-video/v2.6/pro/image-to-video", kind: "video", name: "Premium clip from a still (Kling 2.6 Pro)", est: "about US$0.35 per 5 s clip (≈US$0.07/s, silent)", per: "clip" },
  "upscale": { id: "fal-ai/seedvr/upscale/image", kind: "image", name: "Upscale", est: "about US$0.0025 per megapixel", per: "image" },
};
const REST = process.env.FAL_REST_URL || "https://rest.alpha.fal.ai";            // fal storage (signed uploads); confirm against fal's client
const UPLOAD_TYPES = ["video/mp4", "video/webm", "image/png", "image/jpeg"], UPLOAD_MAX = 60_000_000;
let day = "", used = 0, uploads = 0;
const allowed = () => {
  if (!process.env.FAL_ENDPOINTS) return DEFAULT_ENDPOINTS;
  const ids = process.env.FAL_ENDPOINTS.split(",").map((s) => s.trim()).filter(Boolean);
  return Object.fromEntries(Object.entries(DEFAULT_ENDPOINTS).filter(([, v]) => ids.includes(v.id)));
};
const roll = () => { const today = new Date().toISOString().slice(0, 10); if (today !== day) { day = today; used = 0; uploads = 0; } };
const cap = () => +(process.env.PLANRENDER_DAILY_CAP || 60);

// what each preset accepts from the page: only these fields are forwarded, so the page cannot reach other fal parameters
export function shapeInput(preset, raw = {}) {
  const str = (v, n = 4000) => (typeof v === "string" ? v.slice(0, n) : undefined), url = (v) => (typeof v === "string" && /^(https:\/\/|data:image\/)/.test(v) ? v : undefined);
  const prompt = str(raw.prompt);
  if (preset === "clip-depth") return { prompt, video_url: typeof raw.video_url === "string" && raw.video_url.startsWith("https://") ? raw.video_url : undefined, ...(url(raw.ref_image_url) ? { ref_image_urls: [url(raw.ref_image_url)] } : {}), negative_prompt: str(raw.negative_prompt, 1000) };
  if (preset === "clip-still") return { prompt, image_url: url(raw.image_url), duration: raw.duration === "10" ? "10" : "6", prompt_optimizer: false };
  if (preset === "clip") return { prompt, image_url: url(raw.image_url), duration: raw.duration === "10" ? "10" : "5" };
  if (preset === "still-depth") return { prompt, control_lora_image_url: url(raw.control_lora_image_url), image_size: raw.image_size };
  if (preset === "still-edit") return { prompt, image_urls: (raw.image_urls || []).map(url).filter(Boolean).slice(0, 4) };
  if (preset === "upscale") return { image_url: url(raw.image_url) };
  return null;
}
const required = { "clip-depth": ["prompt", "video_url"], "clip-still": ["prompt", "image_url"], clip: ["prompt", "image_url"], "still-depth": ["prompt", "control_lora_image_url"], "still-edit": ["prompt", "image_urls"], upscale: ["image_url"] };

export default async function handler(req, res) {
  const E = allowed();
  if (req.method === "GET" && !req.query?.job) return res.status(200).json({ type: "assembl.planstudio.render.status", configured: !!process.env.FAL_KEY, provider: "fal.ai", endpoints: E,
    label: "AI-enhanced visualisation", note: "Prices are estimates gathered in Nov 2026; confirm on fal.ai. Stills and flythroughs from the browser and Blender are free." });
  if (!process.env.FAL_KEY) return res.status(503).json({ error: "not_configured", hint: "Add FAL_KEY to the project's environment to enable AI enhance." });
  const auth = { authorization: `Key ${process.env.FAL_KEY}`, "content-type": "application/json" };
  if (req.method === "GET") {     // poll: ?job=<preset>:<request_id>
    const [preset, id] = String(req.query.job).split(":"), ep = E[preset]; if (!ep || !/^[\w-]+$/.test(id || "")) return res.status(400).json({ error: "bad_job" });
    const s = await fetch(`https://queue.fal.run/${ep.id}/requests/${id}/status`, { headers: auth }).then((r) => r.json()).catch(() => null);
    if (!s) return res.status(502).json({ error: "upstream" });
    if (s.status !== "COMPLETED") return res.status(200).json({ status: s.status, queue_position: s.queue_position ?? null });
    const out = await fetch(`https://queue.fal.run/${ep.id}/requests/${id}`, { headers: auth }).then((r) => r.json()).catch(() => null);
    const url = out?.images?.[0]?.url || out?.image?.url || out?.video?.url || null;
    return res.status(200).json({ status: "COMPLETED", url, kind: ep.kind, label: "AI-enhanced visualisation" });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  roll();
  // a signed upload for a guide clip (too large for this function's body limit): the browser PUTs the file straight to fal storage
  if (req.body?.upload) {
    const { content_type: ct, size } = req.body.upload;
    if (!UPLOAD_TYPES.includes(ct) || !(size > 0 && size <= UPLOAD_MAX)) return res.status(400).json({ error: "bad_upload", types: UPLOAD_TYPES, max: UPLOAD_MAX });
    if (uploads >= cap() * 2) return res.status(429).json({ error: "daily_cap" });
    uploads++;
    const ext = ct.split("/")[1].replace("jpeg", "jpg"), r = await fetch(`${REST}/storage/upload/initiate?storage_type=fal-cdn-v3`, { method: "POST", headers: auth, body: JSON.stringify({ content_type: ct, file_name: `planstudio-guide-${Date.now()}.${ext}` }) }).catch(() => null);
    if (!r || !r.ok) return res.status(502).json({ error: "upstream", status: r?.status });
    const j = await r.json(); if (!j.upload_url || !j.file_url) return res.status(502).json({ error: "upstream_shape" });
    return res.status(200).json({ upload_url: j.upload_url, file_url: j.file_url });
  }
  const { preset, input, confirm } = req.body || {}, ep = E[preset];
  if (!ep) return res.status(400).json({ error: "unknown_preset", presets: Object.keys(E) });
  if (confirm !== true) return res.status(402).json({ error: "confirm_spend", estimate: ep.est });
  if (used >= cap()) return res.status(429).json({ error: "daily_cap" });
  if (!input || typeof input !== "object" || JSON.stringify(input).length > 4_000_000) return res.status(400).json({ error: "bad_input" });
  const body = shapeInput(preset, input), missing = (required[preset] || []).filter((k) => !body?.[k] || (Array.isArray(body[k]) && !body[k].length));
  if (missing.length) return res.status(400).json({ error: "missing_fields", missing });
  for (const k of Object.keys(body)) if (body[k] === undefined) delete body[k];
  used++;
  const r = await fetch(`https://queue.fal.run/${ep.id}`, { method: "POST", headers: auth, body: JSON.stringify(body) }).catch(() => null);
  if (!r || !r.ok) return res.status(502).json({ error: "upstream", status: r?.status });
  const j = await r.json();
  return res.status(202).json({ job: `${preset}:${j.request_id}`, estimate: ep.est, label: "AI-enhanced visualisation" });
}
