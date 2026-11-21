// assembl lab · Plan Studio: read a raster plan (a scan, a photo, a screenshot) with a vision model.
// Vector PDFs never come here: the browser measures their linework exactly. A raster image has no linework, so a model reads it
// and every element it returns is marked src "ai" with its own confidence. Coordinates are image pixels; the person sets the
// scale on the page (two points on a known dimension) before anything is measured.
// Cloudflare Pages Function. Providers are tried in order until one returns valid output: any of OPENAI_API_KEY, GEMINI_API_KEY
// (or GOOGLE_API_KEY) or ANTHROPIC_API_KEY is enough on its own. PLANREAD_PROVIDERS (e.g. "openai,gemini,anthropic") sets the order.
// Models: PLANREAD_OPENAI_MODEL, PLANREAD_GEMINI_MODEL, PLANREAD_MODEL (Anthropic, default claude-opus-5-5).
// PLANREAD_DAILY_CAP (per running instance, default 300 reads/day; counts requests, not provider attempts).
// Images are not stored: they pass through to the model and are dropped.
// Status: connected-unverified. Request formats follow the providers' docs and pass offline tests; no live call has been made.

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

const TIMEOUT_MS = 60_000;
const NAMES = ["openai", "gemini", "anthropic"];
const DEFAULT_MODELS = { openai: "gpt-6.2-astra", gemini: "gemini-3.6-flash", anthropic: "claude-opus-5-5" };
const keyOf = (env, name) => name === "openai" ? env.OPENAI_API_KEY : name === "gemini" ? (env.GEMINI_API_KEY || env.GOOGLE_API_KEY) : env.ANTHROPIC_API_KEY;
const modelOf = (env, name) => (name === "openai" ? env.PLANREAD_OPENAI_MODEL : name === "gemini" ? env.PLANREAD_GEMINI_MODEL : env.PLANREAD_MODEL) || DEFAULT_MODELS[name];
// Chain in order: PLANREAD_PROVIDERS if set (unknown names ignored, duplicates dropped, unlisted providers not used), else all three.
export function chain(env) {
  const raw = String(env.PLANREAD_PROVIDERS || "").split(",").map((x) => x.trim().toLowerCase()).filter((x) => NAMES.includes(x));
  const order = raw.length ? [...new Set(raw)] : NAMES;
  return order.map((name) => ({ name, configured: !!keyOf(env, name), model: modelOf(env, name) }));
}

// Hand-written validator for the schema subset used above: type (string or array), enum, properties, required, items.
export function validate(v, s, path = "$") {
  const types = Array.isArray(s.type) ? s.type : [s.type];
  const ok = types.some((t) => t === "null" ? v === null : t === "string" ? typeof v === "string" : t === "number" ? typeof v === "number" && Number.isFinite(v) : t === "boolean" ? typeof v === "boolean" : t === "array" ? Array.isArray(v) : t === "object" ? v !== null && typeof v === "object" && !Array.isArray(v) : false);
  if (!ok) return `${path}: wrong type`;
  if (s.enum && !s.enum.includes(v)) return `${path}: not in enum`;
  if (Array.isArray(v) && s.items) { for (let i = 0; i < v.length; i++) { const e = validate(v[i], s.items, `${path}[${i}]`); if (e) return e; } }
  if (v && typeof v === "object" && !Array.isArray(v) && s.properties) {
    for (const k of s.required || []) if (!(k in v)) return `${path}.${k}: missing`;
    for (const k of Object.keys(s.properties)) if (k in v) { const e = validate(v[k], s.properties[k], `${path}.${k}`); if (e) return e; }
  }
  return null;
}

// Gemini's schema is an OpenAPI subset: upper-case types, nullable flag, no additionalProperties.
export function toGeminiSchema(s) {
  const types = Array.isArray(s.type) ? s.type : [s.type];
  const t = types.find((x) => x !== "null"), out = { type: t.toUpperCase() };
  if (types.includes("null")) out.nullable = true;
  if (s.description) out.description = s.description;
  if (s.enum) out.enum = s.enum;
  if (s.properties) { out.properties = Object.fromEntries(Object.entries(s.properties).map(([k, v]) => [k, toGeminiSchema(v)])); out.required = s.required; }
  if (s.items) out.items = toGeminiSchema(s.items);
  return out;
}

// One provider call. Returns { ok:true, model, text } or { ok:false, reason }. Never throws; never logs headers or keys.
async function call(name, env, mode, img) {
  const key = keyOf(env, name), model = modelOf(env, name);
  let url, headers, payload;
  if (name === "anthropic") {
    // https://docs.anthropic.com/en/api/messages (unchanged from the original request)
    url = "https://api.anthropic.com/v1/messages";
    headers = { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-beta": "server-side-fallback-2026-07-01" };
    payload = {
      model, max_tokens: 16000, system: mode.system(), fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema: mode.schema } },
      messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: img.type, data: img.data } }, { type: "text", text: mode.ask }] }],
    };
  } else if (name === "openai") {
    // https://developers.openai.com/api/docs/guides/structured-outputs (response_format json_schema, strict) and /guides/images-vision (image_url data URL)
    url = "https://api.openai.com/v1/chat/completions";
    headers = { "content-type": "application/json", authorization: `Bearer ${key}` };
    payload = {
      model, max_completion_tokens: 16000,
      response_format: { type: "json_schema", json_schema: { name: "plan_read", strict: true, schema: mode.schema } },
      messages: [{ role: "system", content: mode.system() }, { role: "user", content: [{ type: "text", text: mode.ask }, { type: "image_url", image_url: { url: `data:${img.type};base64,${img.data}` } }] }],
    };
  } else {
    // https://ai.google.dev/api/generate-content (generateContent, inline_data, generationConfig responseMimeType + responseSchema)
    url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    headers = { "content-type": "application/json", "x-goog-api-key": key };
    payload = {
      systemInstruction: { parts: [{ text: mode.system() }] },
      contents: [{ role: "user", parts: [{ inline_data: { mime_type: img.type, data: img.data } }, { text: mode.ask }] }],
      generationConfig: { responseMimeType: "application/json", responseSchema: toGeminiSchema(mode.schema), maxOutputTokens: 16000 },
    };
  }
  const ac = new AbortController(), timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload), signal: ac.signal });
    if (!r.ok) { console.warn(`plan-read: ${name} model error`, r.status, (await r.text()).slice(0, 300)); return { ok: false, reason: "http" }; }
    const j = await r.json();
    let text = "";
    if (name === "anthropic") {
      if (j.stop_reason === "refusal") return { ok: false, reason: "declined" };
      if (j.stop_reason === "max_tokens") return { ok: false, reason: "too_much" };
      text = (j.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
    } else if (name === "openai") {
      const c = j.choices?.[0];
      if (c?.message?.refusal) return { ok: false, reason: "declined" };
      if (c?.finish_reason === "length") return { ok: false, reason: "too_much" };
      text = c?.message?.content || "";
    } else {
      const c = j.candidates?.[0];
      if (!c) return { ok: false, reason: j.promptFeedback?.blockReason ? "declined" : "empty" };
      if (c.finishReason === "MAX_TOKENS") return { ok: false, reason: "too_much" };
      text = (c.content?.parts || []).map((p) => p.text || "").join("");
    }
    return { ok: true, model: (name === "anthropic" ? j.model : name === "openai" ? j.model : j.modelVersion) || model, text };
  } catch (e) { console.warn(`plan-read: ${name} failed`, e?.name === "AbortError" ? "timeout" : String(e?.message || e).slice(0, 300)); return { ok: false, reason: "error" }; }
  finally { clearTimeout(timer); }
}

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function onRequest({ request, env }) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  const providers = chain(env), active = providers.filter((p) => p.configured);
  if (request.method === "GET") return json(200, { type: "assembl.planstudio.read.status", configured: active.length > 0, model: (active[0] || providers[0]).model, host: "cloudflare", providers });
  if (request.method !== "POST") return json(405, { error: "method_not_allowed" });
  if (!active.length) return json(503, { error: "not_configured" });
  const today = new Date().toISOString().slice(0, 10); if (today !== day) { day = today; used = 0; }
  if (used >= +(env.PLANREAD_DAILY_CAP || 300)) return json(429, { error: "daily_cap" });
  let body; try { body = await request.json(); } catch { body = {}; }
  const image = body?.image, m = typeof image === "string" && image.match(/^data:(image\/(png|jpeg|webp|gif));base64,(.+)$/);
  if (!m) return json(400, { error: "image_required", hint: "data:image/png;base64,… (vector PDFs are read in the browser)" });
  if (m[3].length * 0.75 > MAX_BYTES) return json(413, { error: "image_too_large" });
  const mode = MODES[body?.mode] || MODES.plan, img = { type: m[1], data: m[3] };
  used++;
  let tooMuch = false, declined = false;
  for (const p of active) {
    const r = await call(p.name, env, mode, img);
    if (r.ok) {
      let plan; try { plan = JSON.parse(r.text); } catch { console.warn(`plan-read: ${p.name} output not JSON`); continue; }
      const bad = validate(plan, mode.schema);
      if (bad) { console.warn(`plan-read: ${p.name} output failed validation`, bad.slice(0, 300)); continue; }
      return json(200, { type: "assembl.planstudio.read", mode: body?.mode || "plan", model: r.model, provider: p.name, src: "ai", plan });
    }
    if (r.reason === "too_much") tooMuch = true; else if (r.reason === "declined") declined = true;
  }
  if (tooMuch) return json(422, { error: "too_much_on_one_sheet", hint: "Crop to one plan and try again" });
  if (declined) return json(422, { error: "declined" });
  return json(502, { error: "model_error" });
}
