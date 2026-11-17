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
- Rooms: the room name as written and the room's bounding box. Where a room's tag is blank or shows only "?" (an unplaced tag in the drawing software), name the room from what is drawn in it (bed: Bedroom; toilet, basin, shower: Bathroom; bench and hob: Kitchen; sofa: Living; table: Dining), give it a confidence of 0.5 or less, and say in notes that the names were inferred.
- Dimensions: every dimension string you can read with its two witness points.
Give each element a confidence from 0 to 1 that reflects how clearly it is drawn. Do not invent elements you cannot see; leave them out and say so in notes.`;

// The same reader for the rest of a drawing set: a site or area plan (decks, stairs, paths, landscape) and elevations
// (roof form, heights, ground). Each answers in image pixels like the floor plan; the browser scales and places them.
const pt = obj({ x: num, y: num });
const pts = { type: "array", items: pt };
const arr = (items) => ({ type: "array", items });
export const SITE_SCHEMA = obj({
  scale_text: { type: ["string", "null"] },
  north_deg: { type: ["number", "null"], description: "Rotation of the north point from straight up, degrees clockwise, or null" },
  building: obj({ points: { ...pts, description: "The outline of the house's walls (its footprint), corner points in order" } }),
  decks: arr(obj({ label: str, points: pts, confidence: num })),
  stairs: arr(obj({ points: pts, confidence: num })),
  paths: arr(obj({ kind: { type: "string", enum: ["path", "driveway", "steps"] }, points: { ...pts, description: "Centreline" }, width_px: num, confidence: num })),
  hard: arr(obj({ kind: { type: "string", enum: ["parking", "patio", "pad"] }, points: pts, confidence: num })),
  retaining: arr(obj({ points: { ...pts, description: "The wall's line" }, height_text: { type: ["string", "null"] }, confidence: num })),
  planting: arr(obj({ kind: { type: "string", enum: ["garden bed", "lawn", "native planting"] }, points: pts, confidence: num })),
  trees: arr(obj({ x: num, y: num, r_px: num, confidence: num })),
  boundary: pts,
  notes: str,
});
export const SITE_SYSTEM = `You read site plans and area plans for assembl Plan Studio, a New Zealand tool.
Return only what you can see on the drawing, in image pixel coordinates (origin top-left, x right, y down).
- building: the outline of the house walls (its footprint) as drawn, so the site can be lined up with the floor plan.
- decks: each deck, terrace or balcony outline (timber decks are usually drawn with board lines).
- stairs: each outside stair's outline. paths: centrelines of paths, driveways and outdoor steps with their width.
- hard: parking bays, patios and concrete pads. retaining: retaining walls as lines, with any height written.
- planting: garden beds, lawn and planting areas. trees: drawn trees with their canopy radius. boundary: the property boundary.
Leave out contours, hatching, dimensions and notes. Give each element a confidence from 0 to 1; do not invent anything you cannot see.`;
export const ELEV_SCHEMA = obj({
  views: arr(obj({
    label: str,
    roof: { type: "string", enum: ["gable", "skillion", "hip", "flat", "unclear"] },
    roof_seen: { type: "string", enum: ["slope", "band"], description: "slope: the roof's fall is seen as a sloped edge; band: the roof is seen face-on as a level band" },
    high_side: { type: "string", enum: ["left", "right", "none"] },
    roof_top_left: pt, roof_top_right: pt, eave_left: pt, eave_right: pt,
    ffl_y: { ...num, description: "y of the ground floor level line" },
    wall_left_x: num, wall_right_x: num,
    ground_left: pt, ground_right: pt,
    confidence: num,
  })),
  notes: str,
});
export const ELEV_SYSTEM = `You read building elevations for assembl Plan Studio, a New Zealand tool.
For each elevation view on the sheet, in image pixel coordinates (origin top-left, x right, y down):
- label: its title as written. roof: the roof form. roof_seen: "slope" if this view looks along the roof so its fall shows as a sloped top edge, "band" if the roof is seen face-on as a level band.
- high_side: which end of this view the roof is higher at (none for a symmetric gable or a band).
- roof_top_left / roof_top_right: the top edge of the roof above the left and right outside walls.
- eave_left / eave_right: where the underside of the roof meets the top of the left and right outside walls.
- ffl_y: the ground floor level. wall_left_x / wall_right_x: the outside faces of the building's end walls.
- ground_left / ground_right: the natural ground line at the left and right outside walls (below the floor if the house is on piles or poles).
Measure from the drawing; do not invent anything you cannot see. Give a confidence from 0 to 1.`;
const MODES = { plan: { schema: SCHEMA, system: () => SYSTEM, ask: "Read this floor plan." }, site: { schema: SITE_SCHEMA, system: () => SITE_SYSTEM, ask: "Read this site plan." }, elevation: { schema: ELEV_SCHEMA, system: () => ELEV_SYSTEM, ask: "Read these elevations." } };

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
  const mode = MODES[(req.body || {}).mode] || MODES.plan;
  used++;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "anthropic-beta": "server-side-fallback-2026-07-01" },
      body: JSON.stringify({
        model: MODEL, max_tokens: 16000, system: mode.system(), fallbacks: "default",
        output_config: { effort: "medium", format: { type: "json_schema", schema: mode.schema } },
        messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: m[1], data: m[3] } }, { type: "text", text: mode.ask }] }],
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
