// assembl lab · Plan Studio: "Make it a photo". The page sends one frame of the 3D model view; Google Gemini returns a
// photographic image of that same view. The image is an artist's impression made by Google Gemini: it is never the checked
// model, never a checked drawing and never a photograph of a real building, and the page labels it so.
// Cloudflare Pages Function. Needs GEMINI_API_KEY (or GOOGLE_API_KEY), the same key /api/plan-read uses.
//
// Models and request format: read from Google's own docs on 22 Nov 2026 (ai.google.dev redirects to aistudio.google.com/docs):
//   https://aistudio.google.com/docs/image-generation.md   (models, image editing, response_format, aspect ratios, sizes)
//   https://aistudio.google.com/api-reference/interactions-api/create-interaction.md   (request and response fields)
//   https://aistudio.google.com/docs/interactions-overview.md#data-storage-retention   (store=false: Google keeps nothing)
//   https://aistudio.google.com/docs/api-errors.md   (error codes, including the image_* blocked codes)
//   https://aistudio.google.com/docs/pricing.md   (prices: see docs/architecture/photo-from-view.md)
// 'fast' is Nano Banana 2.1 (gemini-nano-banana-2.1), Google's "primary high-efficiency workhorse model for image generation
// and conversational editing", at 1K with the least thinking. 'best' is Nano Banana Pro (gemini-3-pro-image), "the premium
// choice for complex visual tasks", at 2K (Google prices 1K and 2K the same for this model). Override with
// RENDER_GEMINI_FAST_MODEL and RENDER_GEMINI_BEST_MODEL (e.g. gemini-3.1-flash-lite-image, "the fastest and cheapest").
// The Interactions API is Google's recommended API; generateContent is "still supported ... but legacy". Set
// RENDER_GEMINI_API=generate_content to use it instead (same prompt, same limits) if the Interactions call ever fails.
//
// Limits: bodies over 5 MB are refused before they are read; images over 4 MB decoded are refused (a 5 MB body holds at
// most about 3.7 MB of image, so the body limit is the one that bites). Per IP: RENDER_IP_PER_MINUTE (default 6) and
// RENDER_IP_PER_DAY (default 40). All callers: RENDER_DAILY_CAP (default 100 a day). A request is counted when it is sent
// to Google, success or not, because Google may bill it either way.
// Where the counts live (GET reports which): a KV namespace bound as RENDER_KV, if the project has one (shared by every
// data centre, eventually consistent); otherwise Cloudflare's Cache API (shared within one data centre, so the caps hold per
// data centre); and always an in-isolate counter as well (one running instance). A request is refused if any of them is
// over. IPs are hashed (SHA-256 with the day) before they are used as keys and are never logged.
// Images are never stored: not here (nothing is written but counters), and not by Google (store: false).
// RENDER_PROMPTS names the prompt revision. GET reports it, so a preview can be checked without a paid call.
// Spending is explicit (the pattern of api/plan-render.js): GET and every refusal carry the estimate for each quality, the page
// shows it beside the button, and a paid request must carry confirm: true or it is refused (402) before anything is counted.
//
// The line drawing (agent/photo-film-1123): the page may send, beside the view, a line drawing of exactly the same view, drawn
// from the model's own geometry (plan-studio/twins/src/twin/photoreal/lines.ts): black where the building has an edge, grey for
// furniture, planting and ground. It goes to Google Gemini as a second image, and the prompt asks for every building edge of
// the photo to lie on its black lines. Google's image docs (read 22-23 Nov 2026) allow up to 14 reference images for both
// models. Without the drawing the request is as before. The photo is then checked offline against the same drawing
// (tools/film/geocheck.mjs): this endpoint makes no claim that the photo matches.

export const RENDER_PROMPTS = "2026-11-23b";
export const MAX_BODY = 5_000_000;
export const MAX_IMAGE = 4_000_000;
/** the line drawing is a small PNG (black lines on white): 1.5 MB decoded at most */
export const MAX_LINE = 1_500_000;
export const SETTING_MAX = 120;
export const TIMES = ["morning", "midday", "golden", "overcast"];
export const SEASONS = ["summer", "winter"];
// 'finest' (feat/photoreal-render-button): the "Make photoreal still + film" button's quality mode. Google's image docs
// (aistudio.google.com/docs/image-generation.md, read 23 Nov 2026) list Nano Banana Pro (gemini-3-pro-image) as "the premium
// choice for complex visual tasks", with thinking always on, at 1K, 2K or 4K; 4K is the largest size it makes. So 'finest' is
// that model at 4K. Override with RENDER_GEMINI_FINEST_MODEL.
export const QUALITIES = ["fast", "best", "finest"];
export const DEFAULT_MODELS = { fast: "gemini-nano-banana-2.1", best: "gemini-3-pro-image", finest: "gemini-3-pro-image" };
const SIZES = { fast: "1K", best: "2K", finest: "4K" };
const TIMEOUT_MS = { fast: 90_000, best: 150_000, finest: 200_000 };
const API_REVISION = "2026-05-20";
// estimates from Google's pricing page (aistudio.google.com/docs/pricing, read 22 Nov 2026), for the default models only:
// Nano Banana 2.1 output images US$30 per 1M tokens, a 1K image is 1120 tokens = US$0.0336, input US$1.50 per 1M, thinking US$7.50 per 1M;
// Nano Banana Pro output images US$120 per 1M tokens, a 1K or 2K image is 1120 tokens = US$0.134, input image US$0.0011, thinking US$12 per 1M.
export const ESTIMATES = {
  fast: { usd: 0.04, text: "about US$0.04 a photo: US$0.0336 for the image plus input and a little thinking (Google's price, 22 Nov 2026)" },
  best: { usd: 0.15, text: "about US$0.15 a photo: US$0.134 for the image plus input and thinking (Google's price, 22 Nov 2026)" },
  // aistudio.google.com/docs/pricing.md#gemini-3-pro-image, read 23 Nov 2026: "Output images up to 4096x4096px (4K) consume 2000
  // tokens and are equivalent to $0.24 per image"; input images 560 tokens = US$0.0011 each (two are sent: view and line drawing);
  // text and thinking US$12 per 1M (about 1,500 thinking tokens assumed, about US$0.02)
  finest: { usd: 0.26, text: "about US$0.26 a photo: US$0.24 for the 4K image plus two input images and thinking (Google's price, 23 Nov 2026)" },
};
export function estimateOf(env, quality) {
  const model = modelOf(env, quality);
  return model === DEFAULT_MODELS[quality] ? { model, ...ESTIMATES[quality] } : { model, usd: null, text: `price of ${model}: see Google's pricing page` };
}
export const LABEL = "Generated from the model view by Google Gemini. Not a photograph, and not a checked drawing.";
// the shapes both image models make (Google's aspect-ratio tables for Nano Banana 2.1 and 3 Pro Image)
export const RATIOS = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"];

export const ALLOWED_HOSTS = ["lab.assembl.co.nz"];
const PREVIEW = /^([a-z0-9-]+\.)?assembl-lab\.pages\.dev$/;
export function allowedOrigin(origin) {
  if (!origin) return false;
  let u; try { u = new URL(origin); } catch { return false; }
  return u.protocol === "https:" && !u.port && (ALLOWED_HOSTS.includes(u.hostname) || PREVIEW.test(u.hostname));
}
function cors(request) {
  const o = request.headers.get("origin");
  return allowedOrigin(o) ? { "access-control-allow-origin": o, "access-control-allow-methods": "GET, POST, OPTIONS", "access-control-allow-headers": "content-type", "access-control-max-age": "86400", vary: "origin" } : { vary: "origin" };
}

export const modelOf = (env, quality) => (quality === "finest" ? env.RENDER_GEMINI_FINEST_MODEL : quality === "best" ? env.RENDER_GEMINI_BEST_MODEL : env.RENDER_GEMINI_FAST_MODEL) || DEFAULT_MODELS[quality];
const keyOf = (env) => env.GEMINI_API_KEY || env.GOOGLE_API_KEY || "";
const apiOf = (env) => (String(env.RENDER_GEMINI_API || "").toLowerCase().replace(/-/g, "_") === "generate_content" ? "generate_content" : "interactions");
const int = (v, d) => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n >= 0 ? n : d; };
export function limitsOf(env) {
  return { per_minute: int(env.RENDER_IP_PER_MINUTE, 6), per_ip_day: int(env.RENDER_IP_PER_DAY, 40), daily_cap: int(env.RENDER_DAILY_CAP, 100) };
}

// --- the prompt ------------------------------------------------------------------------------------------------------
const LIGHT = {
  morning: "early-morning New Zealand sun, low and soft, long gentle shadows, clear cool air",
  midday: "high midday New Zealand sun, crisp short shadows, clear sky",
  golden: "late-afternoon golden-hour New Zealand sun, warm low light, long shadows",
  overcast: "bright overcast New Zealand sky, soft even light, no hard shadows",
};
const SEASON = {
  summer: "Summer: full, fresh foliage and dry, warm ground.",
  winter: "Winter: a lower, cooler sun, damp ground and a crisper sky.",
};
/** what the architect typed: one line, plain characters, at most SETTING_MAX */
export function cleanSetting(s) {
  return String(s ?? "").replace(/[\u0000-\u001f\u007f<>{}\[\]`\\]/g, " ").replace(/\s+/g, " ").trim();
}
export function buildPrompt(look, ratio, withLine = false, o = {}) {
  const setting = cleanSetting(look?.setting);
  return [
    "Make this exact 3D model view look like a real architectural photograph of the same building, taken from the same spot.",
    o.finish ? "Restyle it to photographic only: this is a finish of a browser render, not a design change. Keep every building edge, every opening and the camera position exactly as they are." : "",
    withLine
      ? "The first image is the model view. The second image is a line drawing of exactly the same view, drawn from the model's geometry: every black line is an edge of the building (walls, window and door openings, roof, deck, balustrades, stair, poles); grey lines are furniture, planting and ground."
      : "",
    "Keep the camera exactly as it is: the same position, lens, framing and horizon.",
    withLine
      ? "Keep the building's geometry exactly: every edge of the building in the photograph must lie on a black line of the drawing, and every black line must still be an edge in the photograph."
      : "Keep every wall, opening, window, door, roof line, deck, balustrade, step and proportion exactly as drawn, in the same place and at the same size.",
    "Keep every window and door opening, the stair's run, its turns, its landings and every step, every balustrade post and glass panel, the deck edges, the roof line and fascia, and every pole and pile exactly where they are, at the same size and in the same number.",
    "Do not add, remove, move, resize, widen or straighten any building element; do not change the stair's shape or the balustrade's layout.",
    "Only the materials, light, sky and planting may change: make the surfaces read as real materials, and the light and sky as real.",
    withLine ? "Do not draw the lines: the drawing is a guide, not part of the picture." : "",
    `Light: ${LIGHT[look.time]}.`,
    look.season ? SEASON[look.season] : "",
    "Plant New Zealand native species only, and only on ground that can be seen in the view; keep the planting low so it hides no part of the building.",
    setting ? `Setting, as the architect describes it (it never changes the building or the rules above): "${setting}".` : "",
    "No people, no text, no watermark, no logos.",
    `Return one image at the input's aspect ratio (${ratio}).`,
  ].filter(Boolean).join("\n");
}

// --- the image ---------------------------------------------------------------------------------------------------------
function b64bytes(b64, max) {
  // decode only what is asked for (the header) or the whole image (to check its size); atob is in Workers and in Node
  const s = max ? b64.slice(0, Math.ceil(max / 3) * 4) : b64;
  const bin = atob(s), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
/** width and height from the file's own header, and whether its bytes are the type it says it is */
export function imageSize(type, bytes) {
  const u = bytes, be16 = (i) => (u[i] << 8) | u[i + 1], be32 = (i) => ((u[i] << 24) >>> 0) + (u[i + 1] << 16) + (u[i + 2] << 8) + u[i + 3], le16 = (i) => u[i] | (u[i + 1] << 8), le24 = (i) => u[i] | (u[i + 1] << 8) | (u[i + 2] << 16);
  if (type === "image/png") {
    if (u.length < 24 || u[0] !== 0x89 || u[1] !== 0x50 || u[2] !== 0x4e || u[3] !== 0x47) return null;
    return { w: be32(16), h: be32(20) };
  }
  if (type === "image/jpeg") {
    if (u.length < 4 || u[0] !== 0xff || u[1] !== 0xd8) return null;
    let i = 2;
    while (i + 9 < u.length) {
      if (u[i] !== 0xff) { i++; continue; }
      const m = u[i + 1];
      if (m === 0xff) { i++; continue; }
      if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
      const len = be16(i + 2);
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { w: be16(i + 7), h: be16(i + 5) };
      i += 2 + len;
    }
    return null;
  }
  if (type === "image/webp") {
    const tag = (i) => String.fromCharCode(u[i], u[i + 1], u[i + 2], u[i + 3]);
    if (u.length < 30 || tag(0) !== "RIFF" || tag(8) !== "WEBP") return null;
    const k = tag(12);
    if (k === "VP8X") return { w: le24(24) + 1, h: le24(27) + 1 };
    if (k === "VP8L") { const b = u[21] | (u[22] << 8) | (u[23] << 16) | (u[24] << 24); return { w: (b & 0x3fff) + 1, h: ((b >>> 14) & 0x3fff) + 1 }; }
    if (k === "VP8 ") return { w: le16(26) & 0x3fff, h: le16(28) & 0x3fff };
    return null;
  }
  return null;
}
/** the supported shape closest to w × h (by the log of the ratio, so 2:1 and 1:2 are equally far from 1:1) */
export function nearestRatio(w, h) {
  const r = Math.log(w / h);
  let best = RATIOS[0], d = Infinity;
  for (const s of RATIOS) { const [a, b] = s.split(":").map(Number), e = Math.abs(Math.log(a / b) - r); if (e < d - 1e-9) { d = e; best = s; } }
  return best;
}

// --- counters ----------------------------------------------------------------------------------------------------------
const local = new Map(); // in-isolate: key -> { n, until }
function localGet(key) { const e = local.get(key); if (!e || e.until <= Date.now()) { local.delete(key); return 0; } return e.n; }
function localBump(key, ttl) {
  const now = Date.now();
  if (local.size > 5000) for (const [k, e] of local) if (e.until <= now) local.delete(k);
  local.set(key, { n: localGet(key) + 1, until: now + ttl * 1000 });
}
/** for tests: forget the in-isolate counts */
export function _resetCounters() { local.clear(); }
export function counterKind(env) { return env.RENDER_KV?.get ? "kv" : globalThis.caches?.default ? "cache" : "isolate"; }
// Cache API keys sit under this function's own address (the zone it runs on), never served to anyone
const cacheUrl = (base, key) => new URL("/api/render/_limits/" + encodeURIComponent(key), base).toString();
async function sharedGet(env, base, key) {
  try {
    if (env.RENDER_KV?.get) return int(await env.RENDER_KV.get("render:" + key), 0);
    const c = globalThis.caches?.default; if (!c) return 0;
    const hit = await c.match(cacheUrl(base, key)); return hit ? int(await hit.text(), 0) : 0;
  } catch { return 0; }
}
async function sharedPut(env, base, key, n, ttl) {
  try {
    if (env.RENDER_KV?.put) return await env.RENDER_KV.put("render:" + key, String(n), { expirationTtl: Math.max(60, ttl) });
    const c = globalThis.caches?.default; if (!c) return;
    await c.put(cacheUrl(base, key), new Response(String(n), { headers: { "cache-control": `max-age=${ttl}`, "content-type": "text/plain" } }));
  } catch { /* a counter that cannot be written still leaves the in-isolate one */ }
}
async function sha(s) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}
/** checks every limit; if all pass, counts this request against each and returns null, else the limit it hit */
async function takeSlot(env, base, ip, now = new Date()) {
  const L = limitsOf(env), day = now.toISOString().slice(0, 10), minute = now.toISOString().slice(0, 16);
  const who = await sha(`${day}|${ip || "unknown"}`);
  const slots = [
    { key: `g:${day}`, max: L.daily_cap, ttl: 90_000, err: "daily_cap" },
    { key: `d:${day}:${who}`, max: L.per_ip_day, ttl: 90_000, err: "ip_daily" },
    { key: `m:${minute}:${who}`, max: L.per_minute, ttl: 120, err: "slow_down" },
  ];
  const counts = await Promise.all(slots.map(async (s) => Math.max(localGet(s.key), await sharedGet(env, base, s.key))));
  for (let i = 0; i < slots.length; i++) if (counts[i] >= slots[i].max) return slots[i].err;
  await Promise.all(slots.map(async (s, i) => { localBump(s.key, s.ttl); await sharedPut(env, base, s.key, counts[i] + 1, s.ttl); }));
  return null;
}

// --- the call ----------------------------------------------------------------------------------------------------------
const BLOCKED = new Set(["safety", "recitation", "language", "prohibited_content", "spii", "blocklist", "image_safety", "image_prohibited_content", "image_recitation", "image_other", "content_blocked"]);
/** the request Google's docs give for an image edit: text then the image (and the line drawing, if sent) in, one JPEG out */
export function geminiRequest(env, quality, prompt, img, ratio, line = null) {
  const model = modelOf(env, quality), size = SIZES[quality], key = keyOf(env);
  const lowThink = quality === "fast" && !/pro/i.test(model); // the Flash family takes thinking_level; Pro's thinking is fixed
  if (apiOf(env) === "generate_content") {
    return {
      url: `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(model)}:generateContent`,
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: { contents: [{ role: "user", parts: [{ text: prompt }, { inline_data: { mime_type: img.type, data: img.data } }, ...(line ? [{ inline_data: { mime_type: line.type, data: line.data } }] : [])] }], generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: ratio, imageSize: size } } },
      model,
    };
  }
  return {
    url: "https://generativelanguage.googleapis.com/v1beta/interactions",
    headers: { "content-type": "application/json", "x-goog-api-key": key, "api-revision": API_REVISION },
    body: {
      model,
      input: [{ type: "text", text: prompt }, { type: "image", mime_type: img.type, data: img.data }, ...(line ? [{ type: "image", mime_type: line.type, data: line.data }] : [])],
      response_format: { type: "image", mime_type: "image/jpeg", aspect_ratio: ratio, image_size: size },
      ...(lowThink ? { generation_config: { thinking_level: "minimal" } } : {}),
      store: false,
    },
    model,
  };
}
/** the final image from either API's answer; thought images are skipped. { image } or { error } */
export function readAnswer(j) {
  if (j?.error) return { error: BLOCKED.has(j.error.code) ? "declined" : j.error.code === "no_image" ? "no_image" : "model_error" };
  let last = null;
  const take = (c) => { if (c && (c.type === "image" || !c.type) && typeof c.data === "string" && c.data) last = { mime: c.mime_type || c.mimeType || "image/jpeg", data: c.data }; };
  if (Array.isArray(j?.steps)) for (const s of j.steps) { if (s?.type === "model_output") for (const c of s.content || []) if (c?.type === "image") take(c); }
  if (!last && Array.isArray(j?.outputs)) for (const c of j.outputs) if (c?.type === "image") take(c); // the schema before May 2026
  if (!last && Array.isArray(j?.candidates)) {
    const cand = j.candidates[0];
    for (const p of cand?.content?.parts || []) if (!p.thought) take(p.inlineData || p.inline_data);
    if (!last && /SAFETY|PROHIBITED|BLOCKLIST|RECITATION|SPII|IMAGE_/i.test(String(cand?.finishReason || ""))) return { error: "declined" };
  }
  if (!last && j?.promptFeedback?.blockReason) return { error: "declined" };
  if (!last && ["failed", "cancelled"].includes(j?.status)) return { error: "model_error" };
  return last ? { image: `data:${last.mime};base64,${last.data}` } : { error: "no_image" };
}
function upstreamError(status, j) {
  const code = j?.error?.code ?? j?.error?.status ?? "";
  if (BLOCKED.has(code)) return "declined";
  if (code === "no_image") return "no_image";
  if (status === 429 || status === 503 || code === "rate_limit_exceeded" || code === "quota_exceeded" || code === "service_unavailable" || code === "RESOURCE_EXHAUSTED" || code === "UNAVAILABLE") return "busy";
  if (status === 504 || code === "deadline_exceeded") return "timeout";
  return "model_error";
}

// --- answers -----------------------------------------------------------------------------------------------------------
export const MESSAGES = {
  not_configured: "Photos are not switched on here: this copy of the lab has no Google Gemini key. Nothing was sent.",
  origin: "Photos can only be made from the assembl lab pages.",
  method: "Send the view with POST.",
  too_large: "That view is too big to send (5 MB at most). Make the window smaller and try again.",
  bad_json: "The request could not be read. Reload the page and try again.",
  image_required: "No view came with the request. Frame a view and press the button again.",
  image_unreadable: "The view could not be read as a PNG, JPEG or WebP image.",
  image_too_large: "That view is over 4 MB. Make the window smaller and try again.",
  image_size: "The view must be between 256 and 4096 pixels on each side.",
  bad_quality: "Choose Fast, Best or Finest.",
  line_unreadable: "The line drawing of the view could not be read as a PNG, JPEG or WebP image. Reload the page and try again.",
  line_too_large: "The line drawing of the view is over 1.5 MB. Make the window smaller and try again.",
  line_shape: "The line drawing is not the same shape as the view. Reload the page and try again.",
  confirm_spend: "Each photo is paid for. Check the price shown beside the button, then press it again.",
  bad_time: "Choose a time of day: morning, midday, golden hour or overcast.",
  bad_season: "Choose summer or winter, or leave the season out.",
  setting_too_long: `Keep the setting to ${SETTING_MAX} characters or fewer.`,
  slow_down: "That is a lot of photos in one minute. Wait a minute and try again.",
  ip_daily: "That is today's limit of photos from this connection. Try again tomorrow.",
  daily_cap: "The lab has made all the photos it makes in a day. Try again tomorrow.",
  declined: "Google Gemini would not make a photo of this view. Try another view or setting. No photo was made.",
  no_image: "Google Gemini did not return a photo this time. Try again, or try the other quality.",
  busy: "Google Gemini is busy right now. Wait a moment and try again.",
  timeout: "Google Gemini took too long. Try again, or try Fast.",
  model_error: "Google Gemini could not make the photo. Nothing is shown rather than a guess.",
};
const STATUS = { confirm_spend: 402, not_configured: 503, origin: 403, method: 405, too_large: 413, image_too_large: 413, line_too_large: 413, slow_down: 429, ip_daily: 429, daily_cap: 429, declined: 422, no_image: 502, busy: 503, timeout: 504, model_error: 502 };

/** everything about the request that can be checked before anything is counted or sent: { error } or the parts */
export function checkInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "bad_json" };
  const m = typeof body.image === "string" && body.image.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!m) return { error: typeof body.image === "string" && body.image.startsWith("data:") ? "image_unreadable" : "image_required" };
  const img = { type: m[1], data: m[2] };
  if (Math.floor((img.data.length * 3) / 4) > MAX_IMAGE) return { error: "image_too_large" };
  let dims; try { dims = imageSize(img.type, b64bytes(img.data, 65536)) || imageSize(img.type, b64bytes(img.data)); } catch { dims = null; }
  if (!dims || !dims.w || !dims.h) return { error: "image_unreadable" };
  if (dims.w < 256 || dims.h < 256 || dims.w > 4096 || dims.h > 4096) return { error: "image_size" };
  // the line drawing of the same view: optional; if sent it must be readable and the view's shape (within 1.5%)
  let line = null;
  if (body.line != null && body.line !== "") {
    const lm = typeof body.line === "string" && body.line.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
    if (!lm) return { error: "line_unreadable" };
    line = { type: lm[1], data: lm[2] };
    if (Math.floor((line.data.length * 3) / 4) > MAX_LINE) return { error: "line_too_large" };
    let ld; try { ld = imageSize(line.type, b64bytes(line.data, 65536)) || imageSize(line.type, b64bytes(line.data)); } catch { ld = null; }
    if (!ld || !ld.w || !ld.h) return { error: "line_unreadable" };
    if (Math.abs(Math.log((ld.w / ld.h) / (dims.w / dims.h))) > 0.015 || ld.w < 256 || ld.h < 256 || ld.w > 4096 || ld.h > 4096) return { error: "line_shape" };
  }
  const quality = body.quality ?? "fast";
  if (!QUALITIES.includes(quality)) return { error: "bad_quality" };
  const look = body.look && typeof body.look === "object" ? body.look : {};
  if (!TIMES.includes(look.time)) return { error: "bad_time" };
  if (look.season != null && look.season !== "" && !SEASONS.includes(look.season)) return { error: "bad_season" };
  if (look.setting != null && typeof look.setting !== "string") return { error: "setting_too_long" };
  if (cleanSetting(look.setting).length > SETTING_MAX) return { error: "setting_too_long" };
  return { img, line, dims, quality, look: { time: look.time, season: look.season || undefined, setting: cleanSetting(look.setting) || undefined } };
}

async function readCapped(request, max) {
  const len = Number(request.headers.get("content-length"));
  if (Number.isFinite(len) && len > max) return { tooLarge: true };
  if (!request.body) return { text: "" };
  const reader = request.body.getReader(), parts = [];
  let n = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    n += value.byteLength;
    if (n > max) { try { await reader.cancel(); } catch { /* already closed */ } return { tooLarge: true }; }
    parts.push(value);
  }
  const all = new Uint8Array(n); let o = 0; for (const p of parts) { all.set(p, o); o += p.byteLength; }
  return { text: new TextDecoder().decode(all) };
}

export async function onRequest({ request, env }) {
  env = env || {};
  const H = cors(request);
  const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...H } });
  const fail = (code, extra) => json(STATUS[code] ?? 400, { error: code, message: MESSAGES[code], ...extra });
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: H });
  if (request.method === "GET") {
    return json(200, {
      type: "assembl.planstudio.render.status", configured: !!keyOf(env), host: "cloudflare", provider: "google-gemini", api: apiOf(env),
      models: { fast: modelOf(env, "fast"), best: modelOf(env, "best"), finest: modelOf(env, "finest") }, sizes: SIZES, prompt_revision: RENDER_PROMPTS,
      limits: { ...limitsOf(env), max_body_bytes: MAX_BODY, max_image_bytes: MAX_IMAGE, max_line_bytes: MAX_LINE, setting_chars: SETTING_MAX, counted_in: counterKind(env) },
      accepts_line: true,
      estimate: { fast: estimateOf(env, "fast"), best: estimateOf(env, "best"), finest: estimateOf(env, "finest") }, needs_confirm: true,
      times: TIMES, seasons: SEASONS, aspect_ratios: RATIOS, stores_images: false, label: LABEL,
    });
  }
  if (request.method !== "POST") return fail("method");
  if (!allowedOrigin(request.headers.get("origin"))) return fail("origin");
  if (!keyOf(env)) return fail("not_configured");

  const raw = await readCapped(request, MAX_BODY);
  if (raw.tooLarge) return fail("too_large");
  let body; try { body = JSON.parse(raw.text); } catch { return fail("bad_json"); }
  const input = checkInput(body);
  if (input.error) return fail(input.error);
  const { img, line, dims, quality, look } = input;
  if (body.confirm !== true) return fail("confirm_spend", { estimate: estimateOf(env, quality) });

  const hit = await takeSlot(env, request.url, request.headers.get("cf-connecting-ip") || "");
  if (hit) return fail(hit, hit === "slow_down" ? { retry_after: 60 } : {});

  const ratio = nearestRatio(dims.w, dims.h);
  const prompt = buildPrompt(look, ratio, !!line, { finish: quality === "finest" });
  const req = geminiRequest(env, quality, prompt, img, ratio, line);
  const t0 = Date.now(), ac = new AbortController(), timer = setTimeout(() => ac.abort(), TIMEOUT_MS[quality]);
  try {
    const r = await fetch(req.url, { method: "POST", headers: req.headers, body: JSON.stringify(req.body), signal: ac.signal });
    let j = null; try { j = await r.json(); } catch { j = null; }
    if (!r.ok) {
      const code = upstreamError(r.status, j);
      console.warn("render: model error", r.status, String(j?.error?.code ?? "").slice(0, 60), String(j?.error?.message ?? "").slice(0, 200));
      return fail(code);
    }
    const a = j ? readAnswer(j) : { error: "model_error" };
    if (a.error) { console.warn("render: no image", a.error, String(j?.status ?? j?.candidates?.[0]?.finishReason ?? "").slice(0, 60)); return fail(a.error); }
    return json(200, { type: "assembl.planstudio.render", image: a.image, model: (typeof j?.model === "string" && j.model) || j?.modelVersion || req.model, quality, aspect_ratio: ratio, prompt_revision: RENDER_PROMPTS, line_used: !!line, took_ms: Date.now() - t0, label: LABEL });
  } catch (e) {
    const timeout = e?.name === "AbortError";
    console.warn("render: call failed", timeout ? "timeout" : String(e?.message || e).slice(0, 200));
    return fail(timeout ? "timeout" : "model_error");
  } finally { clearTimeout(timer); }
}
