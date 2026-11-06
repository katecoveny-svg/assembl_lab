// assembl lab · Plan Studio: read a raster plan (a scan, a photo, a screenshot) with a vision model.
// Vector PDFs never come here: the browser measures their linework exactly. A raster image has no linework, so a model reads it
// and every element it returns is marked src "ai" with its own confidence. Coordinates are image pixels; the person sets the
// scale on the page (two points on a known dimension) before anything is measured.
// Needs ANTHROPIC_API_KEY. PLANREAD_MODEL (default claude-opus-5-5), PLANREAD_DAILY_CAP (whole site, default 300 reads/day).
// Images are not stored: they pass through to the model and are dropped.
const MODEL = process.env.PLANREAD_MODEL || "claude-opus-5-5";
const MAX_BYTES = 4_500_000;
let day = "", used = 0;

const num = { type: "number" }, str = { type: "string" };
const obj = (properties) => ({ type: "object", additionalProperties: false, properties, required: Object.keys(properties) });
export const SCHEMA = obj({
  scale_text: { type: ["string", "null"], description: "A drawing scale printed on the sheet, e.g. '1:100', or null" },
  north_deg: { type: ["number", "null"], description: "Rotation of the north point from straight up, degrees clockwise, or null" },
  walls: { type: "array", items: obj({ x1: num, y1: num, x2: num, y2: num, thickness_px: num, external: { type: "boolean" }, confidence: num }) },
  openings: { type: "array", items: obj({ kind: { type: "string", enum: ["door", "door-double", "window", "glazing", "opening"] }, x1: num, y1: num, x2: num, y2: num, confidence: num }) },
  rooms: { type: "array", items: obj({ name: str, x: num, y: num, w: num, h: num, confidence: num }) },
  dimensions: { type: "array", items: obj({ text: str, x1: num, y1: num, x2: num, y2: num }) },
  notes: str,
});

export const SYSTEM = `You read architectural floor plans for assembl Plan Studio, a New Zealand tool.
Return only what you can see on the drawing, in image pixel coordinates (origin top-left, x right, y down).
- Walls: centrelines from end to end, merged across door and window openings; thickness_px across the wall; external true for the building envelope.
- Openings: the two ends of each door, window, glazed wall or doorless opening along its wall.
- Rooms: the room name as written and the room's bounding box.
- Dimensions: every dimension string you can read with its two witness points.
Give each element a confidence from 0 to 1 that reflects how clearly it is drawn. Do not invent elements you cannot see; leave them out and say so in notes.`;

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method === "GET") return res.status(200).json({ type: "assembl.planstudio.read.status", configured: !!process.env.ANTHROPIC_API_KEY, model: MODEL });
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: "not_configured" });
  const today = new Date().toISOString().slice(0, 10); if (today !== day) { day = today; used = 0; }
  if (used >= +(process.env.PLANREAD_DAILY_CAP || 300)) return res.status(429).json({ error: "daily_cap" });
  const { image } = req.body || {}, m = typeof image === "string" && image.match(/^data:(image\/(png|jpeg|webp|gif));base64,(.+)$/);
  if (!m) return res.status(400).json({ error: "image_required", hint: "data:image/png;base64,… (vector PDFs are read in the browser)" });
  if (m[3].length * 0.75 > MAX_BYTES) return res.status(413).json({ error: "image_too_large" });
  used++;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "anthropic-beta": "server-side-fallback-2026-07-01" },
      body: JSON.stringify({
        model: MODEL, max_tokens: 16000, system: SYSTEM, fallbacks: "default",
        output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
        messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: m[1], data: m[3] } }, { type: "text", text: "Read this floor plan." }] }],
      }),
    });
    if (!r.ok) { console.warn("plan-read: model error", r.status, (await r.text()).slice(0, 300)); return res.status(502).json({ error: "model_error" }); }
    const j = await r.json();
    if (j.stop_reason === "refusal") return res.status(422).json({ error: "declined" });
    if (j.stop_reason === "max_tokens") return res.status(422).json({ error: "too_much_on_one_sheet", hint: "Crop to one plan and try again" });
    const text = (j.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
    let plan; try { plan = JSON.parse(text); } catch { return res.status(502).json({ error: "unreadable_output" }); }
    return res.status(200).json({ type: "assembl.planstudio.read", model: j.model, src: "ai", plan });
  } catch (e) { console.warn("plan-read: failed", e?.message); return res.status(502).json({ error: "upstream" }); }
}
