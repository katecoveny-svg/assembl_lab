// assembl lab · Plan Studio: AI-enhanced stills and clips through fal.ai, always driven by the true model.
// The browser sends a render of the real model (and its depth pass); the model may restyle light and materials, never redesign.
// Every result comes back labelled "AI-enhanced visualisation" and the page burns that label into the file.
// Spending money is explicit: the page shows the estimate and the request must carry `confirm: true`.
// Needs FAL_KEY. FAL_ENDPOINTS (comma list) overrides the allow-list below; PLANRENDER_DAILY_CAP (default 60 jobs/day).
// Endpoint ids and prices move often: confirm each one on its fal.ai model page before relying on it.
export const DEFAULT_ENDPOINTS = {
  "still-edit": { id: "fal-ai/nano-banana/edit", kind: "image", est: "about US$0.04–0.15 per image" },
  "still-depth": { id: "fal-ai/flux-control-lora-depth", kind: "image", est: "about US$0.04 per megapixel" },
  "clip": { id: "fal-ai/kling-video/v2.6/pro/image-to-video", kind: "video", est: "about US$0.07 per second (silent)" },
  "upscale": { id: "fal-ai/seedvr/upscale/image", kind: "image", est: "about US$0.0025 per megapixel" },
};
let day = "", used = 0;
const allowed = () => {
  if (!process.env.FAL_ENDPOINTS) return DEFAULT_ENDPOINTS;
  const ids = process.env.FAL_ENDPOINTS.split(",").map((s) => s.trim()).filter(Boolean);
  return Object.fromEntries(Object.entries(DEFAULT_ENDPOINTS).filter(([, v]) => ids.includes(v.id)));
};

export default async function handler(req, res) {
  const E = allowed();
  if (req.method === "GET" && !req.query?.job) return res.status(200).json({ type: "assembl.planstudio.render.status", configured: !!process.env.FAL_KEY, endpoints: E,
    label: "AI-enhanced visualisation", note: "Prices are estimates gathered in Nov 2026; confirm on fal.ai." });
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
  const { preset, input, confirm } = req.body || {}, ep = E[preset];
  if (!ep) return res.status(400).json({ error: "unknown_preset", presets: Object.keys(E) });
  if (confirm !== true) return res.status(402).json({ error: "confirm_spend", estimate: ep.est });
  const today = new Date().toISOString().slice(0, 10); if (today !== day) { day = today; used = 0; }
  if (used >= +(process.env.PLANRENDER_DAILY_CAP || 60)) return res.status(429).json({ error: "daily_cap" });
  if (!input || typeof input !== "object" || JSON.stringify(input).length > 9_000_000) return res.status(400).json({ error: "bad_input" });
  used++;
  const r = await fetch(`https://queue.fal.run/${ep.id}`, { method: "POST", headers: auth, body: JSON.stringify(input) }).catch(() => null);
  if (!r || !r.ok) return res.status(502).json({ error: "upstream", status: r?.status });
  const j = await r.json();
  return res.status(202).json({ job: `${preset}:${j.request_id}`, estimate: ep.est, label: "AI-enhanced visualisation" });
}
