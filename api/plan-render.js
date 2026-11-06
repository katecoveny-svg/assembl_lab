// assembl lab · Plan Studio: AI-enhanced stills and hero clips, always driven by the true model.
// The browser sends a render of the real model (a still, its depth pass, or a short guide clip recorded along a path through it);
// the AI may restyle light and materials, never redesign. Every result is labelled "AI-enhanced visualisation" and the page burns
// that label into the file. Free first: stills and flythroughs come from the browser and Blender; this is the occasional paid extra.
// Spending money is explicit: the page shows the estimate and a paid request must carry `confirm: true`.
// Needs FAL_KEY. FAL_ENDPOINTS (comma list of ids) narrows the allow-list below; PLANRENDER_DAILY_CAP (default 60 jobs/day).
// Endpoint ids and input fields were checked against fal's own OpenAPI schemas on 6 Nov 2026; prices are fal's published rates where
// fal publishes one (marked otherwise). Both move: re-check the model page before a client job relies on them.
export const DEFAULT_ENDPOINTS = {
  "still-edit": { id: "fal-ai/nano-banana/edit", kind: "image", name: "Photoreal still", est: "US$0.04 per image (fal, Nov 2026)", per: "image" },
  "still-depth": { id: "fal-ai/flux-control-lora-depth", kind: "image", name: "Depth-locked still", est: "about US$0.04 per megapixel (price not confirmed on fal)", per: "image" },
  // FLUX 3 Max keyframes-to-video (fal's codename "alligator"): up to ten exact stills of the model pinned to frames along the camera
  // path; the AI only fills the motion between views it cannot change. The best choice for a hero clip.
  "clip-keyframes": { id: "blackforestlabs/flux-3-max/keyframes-to-video", kind: "video", name: "Hero clip, keyframe-locked (FLUX 3 Max)", per: "clip",
    est: "US$0.17 per second at 720p: about US$1.36 for 8 s (fal list price; 75% off until 7 Nov 2026)", keyframes: { n: 4, seconds: 8, w: 1280, h: 720 },
    note: "Four exact stills of the model, rendered along the camera path, are pinned to the clip; the AI fills only the motion between them." },
  "clip-keyframes-draft": { id: "blackforestlabs/flux-3/keyframes-to-video/draft", kind: "video", name: "Draft of the keyframe clip (FLUX 3)", per: "clip",
    est: "US$0.06 per second: about US$0.48 for 8 s (fal)", keyframes: { n: 4, seconds: 8, w: 1280, h: 720 },
    note: "A quick, cheap preview of the same keyframes, to check the move before paying for the full clip." },
  // Wan VACE (depth): our flythrough of the real model is the guide video; fal estimates its depth (preprocess) and the clip follows it.
  "clip-depth": { id: "fal-ai/wan-vace-14b/depth", kind: "video", name: "Hero clip, depth-guided (Wan VACE)", est: "about US$0.20–0.40 per 5 s clip (price not confirmed on fal)", per: "clip",
    guide: { seconds: 5, w: 1280, h: 720 }, note: "Follows the depth of a guide clip recorded through the model." },
  // Hailuo 02 (standard, image-to-video): one still of the model, animated. The motion is invented, so the label says so.
  "clip-still": { id: "fal-ai/minimax/hailuo-02/standard/image-to-video", kind: "video", name: "Clip from a still (Hailuo 02)", est: "US$0.27 per 6 s clip at 768P (fal)", per: "clip",
    note: "Animates one still; the motion is invented and the geometry can drift. Illustrative only." },
  "clip": { id: "fal-ai/kling-video/v2.6/pro/image-to-video", kind: "video", name: "Premium clip from a still (Kling 2.6 Pro)", est: "US$0.35 per 5 s clip without audio (fal)", per: "clip",
    note: "Animates one still; the motion is invented. Illustrative only." },
  "upscale": { id: "fal-ai/seedvr/upscale/image", kind: "image", name: "Upscale", est: "price not confirmed on fal", per: "image" },
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
  const prompt = str(raw.prompt), pick = (v, list, d) => (list.includes(v) ? v : d);
  if (preset === "clip-keyframes" || preset === "clip-keyframes-draft") {
    const duration = Math.max(5, Math.min(20, Math.round(+raw.duration || 8))), last = duration * 24, seen = new Set();
    const keyframes = (Array.isArray(raw.keyframes) ? raw.keyframes : []).map((k) => ({ image_url: url(k?.image_url), frame_index: Math.round(+k?.frame_index) }))
      .filter((k) => k.image_url && Number.isFinite(k.frame_index) && k.frame_index >= 0 && k.frame_index <= last && !seen.has(k.frame_index) && seen.add(k.frame_index)).slice(0, 10);
    const base = { prompt, keyframes, duration, aspect_ratio: pick(raw.aspect_ratio, ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "2:1"], "16:9"), generate_audio: false };
    return preset === "clip-keyframes" ? { ...base, resolution: pick(raw.resolution, ["720p", "1080p"], "720p"), reasoning_level: "high" } : base;
  }
  if (preset === "clip-depth") return { prompt, video_url: typeof raw.video_url === "string" && raw.video_url.startsWith("https://") ? raw.video_url : undefined, preprocess: true, resolution: "720p",
    ...(url(raw.ref_image_url) ? { ref_image_urls: [url(raw.ref_image_url)] } : {}), negative_prompt: str(raw.negative_prompt, 1000) };
  if (preset === "clip-still") return { prompt, image_url: url(raw.image_url), end_image_url: url(raw.end_image_url), duration: raw.duration === "10" ? "10" : "6", resolution: "768P", prompt_optimizer: false };
  if (preset === "clip") return { prompt, start_image_url: url(raw.start_image_url || raw.image_url), end_image_url: url(raw.end_image_url), duration: raw.duration === "10" ? "10" : "5", generate_audio: false };
  if (preset === "still-depth") return { prompt, control_lora_image_url: url(raw.control_lora_image_url), image_size: raw.image_size, preprocess_depth: true };
  if (preset === "still-edit") return { prompt, image_urls: (raw.image_urls || []).map(url).filter(Boolean).slice(0, 4) };
  if (preset === "upscale") return { image_url: url(raw.image_url) };
  return null;
}
const required = { "clip-keyframes": ["prompt", "keyframes"], "clip-keyframes-draft": ["prompt", "keyframes"], "clip-depth": ["prompt", "video_url"], "clip-still": ["prompt", "image_url"], clip: ["prompt", "start_image_url"], "still-depth": ["prompt", "control_lora_image_url"], "still-edit": ["prompt", "image_urls"], upscale: ["image_url"] };

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
