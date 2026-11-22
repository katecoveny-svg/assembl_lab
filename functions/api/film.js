// assembl lab · Plan Studio: "Make it a film". A tool (or, later, the page) sends one geometry-pass clip of the twin's
// fly-through (a few seconds of the model in its normal look, frame for frame on the model's own geometry), and Google Gemini's
// video editing returns the same clip as camera footage. Long films are cut into parts within Google's limit by the caller
// (planSegments below; tools/film/gemini-film.mjs), each part guided by the last frame of the one before, then joined. The
// film is an artist's impression made by Google Gemini: never the checked model, never a checked drawing, never a photograph
// of a real building, and every frame carries the label.
// Cloudflare Pages Function. Needs GEMINI_API_KEY (or GOOGLE_API_KEY), the key /api/render and /api/plan-read use.
//
// Read from Google's own docs on 23 Nov 2026 (ai.google.dev redirects to aistudio.google.com/docs):
//   https://ai.google.dev/gemini-api/docs/video  → aistudio.google.com/docs/video.md (Veo 3.1 Preview shut down 22 Oct 2026;
//       video generation and editing is Gemini Omni Flash)
//   https://aistudio.google.com/docs/omni.md            (model, editing your own videos, response_format, limits, URI delivery)
//   https://aistudio.google.com/docs/models/gemini-omni-flash.md   (24 FPS output; 1.2: input video up to 15 s for editing;
//       1.1: up to 10 s; 1.1 routes to 1.2 on 3 Dec 2026)
//   https://aistudio.google.com/docs/pricing.md#gemini-omni-1.2-flash   (US$12 per 1M video output tokens; 5,792 tokens a
//       second of 720p = about US$0.07 a second; 360p 1,931 tokens/s; 1080p 8,688 tokens/s)
//   https://aistudio.google.com/docs/background-execution.md   (background: true → an id to poll; needs store: true)
//   https://aistudio.google.com/docs/interactions-overview.md  (store: true keeps interactions 55 days unless deleted)
//   https://aistudio.google.com/api-reference/interactions-api/create-interaction.md  (VideoResponseFormat: aspect_ratio
//       16:9 | 9:16, duration "Ns", resolution 360p | 720p | 1080p | 4k, delivery inline | uri; video_config.task)
//   https://aistudio.google.com/docs/file-input-methods.md     (inline data: 100 MB a request)
// The default model is gemini-omni-1.2-flash; FILM_GEMINI_MODEL overrides it. Parts are at most 10 s by default (the stricter
// 1.1 limit, and the 10 s Runway's resale lists); FILM_SEGMENT_MAX_S raises it to 15 for 1.2.
//
// Modes: "background" (default; FILM_GEMINI_MODE or the request's mode) asks Google to run the edit in the background and
// answers 202 with a signed handle; GET /api/film?handle=… polls Google and answers "running" until Google says the
// interaction is completed with a video, then returns it and deletes the interaction at Google. Google's background docs list
// standard Gemini models and agents, not Omni by name: if Google refuses a background request, use mode "wait" (Google's
// recommended synchronous call for Omni: background false, store false), which holds the request open until the video is ready.
// Nothing here says a film is finished until Google's answer carries status "completed" and a video.
//
// Limits: bodies over 24 MB are refused before they are read; clips over 16 MB decoded, longer than the part limit, shorter
// than 3 s, or not 16:9 or 9:16 are refused; stills over 4 MB are refused. Per IP: FILM_IP_PER_MINUTE (default 2) and
// FILM_IP_PER_DAY (default 8); all callers: FILM_DAILY_CAP (default 20 a day); polls: FILM_POLLS_PER_MINUTE (default 30).
// A part is counted when it is sent to Google, success or not. Counts live where /api/render's do (RENDER_KV or FILM_KV,
// else the Cache API, and always the running instance). IPs are hashed with the day and never logged.
// Spending is explicit: GET and every refusal carry the estimate, and a paid request must carry confirm: true or it is refused
// (402) before anything is counted. FILM_PROMPTS names the prompt revision.

import { imageSize, allowedOrigin, LABEL, TIMES, SEASONS } from "./render.js";

export const FILM_PROMPTS = "2026-11-23b";
export const DEFAULT_MODEL = "gemini-omni-1.2-flash";
export const MAX_BODY = 24_000_000;
export const MAX_VIDEO = 16_000_000;
export const MAX_STILL = 4_000_000;
export const MIN_SECONDS = 3;
export const PART_MAX = 10;
export const PART_MAX_CEILING = 15;
export const RESOLUTIONS = ["360p", "720p", "1080p"];
export const MODES = ["background", "wait"];
export { LABEL };
const API_REVISION = "2026-05-20";
const HANDLE_TTL_MS = 24 * 3600_000;
const TIMEOUT_MS = { background: 60_000, wait: 330_000, poll: 60_000 };
// Google's price for gemini-omni-1.2-flash (pricing page, 23 Nov 2026): US$12 per 1M video output tokens; tokens a second by size
const TOKENS_PER_SECOND = { "360p": 1931, "720p": 5792, "1080p": 8688 };
const USD_PER_TOKEN = 12 / 1e6;
export function estimateOf(env, seconds, resolution = "720p") {
  const model = modelOf(env);
  if (model !== DEFAULT_MODEL) return { model, usd: null, text: `price of ${model}: see Google's pricing page` };
  const usd = Math.round(seconds * TOKENS_PER_SECOND[resolution] * USD_PER_TOKEN * 100) / 100;
  return { model, usd, per_second: Math.round(TOKENS_PER_SECOND[resolution] * USD_PER_TOKEN * 10000) / 10000, text: `about US$${usd.toFixed(2)} for ${seconds} s at ${resolution} (US$12 per 1M video tokens, ${TOKENS_PER_SECOND[resolution]} tokens a second; Google's price, 23 Nov 2026), plus a little for the input` };
}

export const modelOf = (env) => env.FILM_GEMINI_MODEL || DEFAULT_MODEL;
const keyOf = (env) => env.GEMINI_API_KEY || env.GOOGLE_API_KEY || "";
const int = (v, d) => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n >= 0 ? n : d; };
export const partMaxOf = (env) => Math.min(PART_MAX_CEILING, Math.max(MIN_SECONDS, int(env.FILM_SEGMENT_MAX_S, PART_MAX)));
export const modeOf = (env, asked) => (MODES.includes(asked) ? asked : MODES.includes(env.FILM_GEMINI_MODE) ? env.FILM_GEMINI_MODE : "background");
export const taskOf = (env) => (env.FILM_GEMINI_TASK === undefined ? "edit" : String(env.FILM_GEMINI_TASK));
export function limitsOf(env) {
  return { per_minute: int(env.FILM_IP_PER_MINUTE, 2), per_ip_day: int(env.FILM_IP_PER_DAY, 8), daily_cap: int(env.FILM_DAILY_CAP, 20), polls_per_minute: int(env.FILM_POLLS_PER_MINUTE, 30) };
}
function cors(request) {
  const o = request.headers.get("origin");
  return allowedOrigin(o) ? { "access-control-allow-origin": o, "access-control-allow-methods": "GET, POST, OPTIONS", "access-control-allow-headers": "content-type", "access-control-max-age": "86400", vary: "origin" } : { vary: "origin" };
}

// --- parts of a long film ----------------------------------------------------------------------------------------------
/**
 * Cut a film of `frames` frames at `fps` into parts of whole seconds, each at least 3 s and at most `max` s, as even as they
 * go (16 s at a 10 s limit → 8 s + 8 s). A last part that cannot be whole seconds keeps its frames and asks Google for the
 * next whole second (the joiner trims it back). Each part after the first is guided by the last frame of the one before.
 */
export function planSegments(frames, fps, max = PART_MAX) {
  const total = frames / fps;
  if (!(frames > 0) || !(fps > 0)) throw new Error("frames and fps must be positive");
  if (total < MIN_SECONDS - 1e-9) throw new Error(`a film shorter than ${MIN_SECONDS} s cannot be sent`);
  const n = Math.ceil(total / max - 1e-9), whole = Math.floor(total + 1e-9), base = Math.floor(whole / n), extra = whole - base * n;
  const parts = [];
  let from = 0;
  for (let k = 0; k < n; k++) {
    const s = base + (k < extra ? 1 : 0);
    const to = k === n - 1 ? frames : from + Math.round(s * fps);
    const seconds = (to - from) / fps;
    parts.push({ index: k, from, to, frames: to - from, seconds, ask: Math.min(max, Math.max(MIN_SECONDS, Math.ceil(seconds - 1e-9))), guided: k > 0 });
    from = to;
  }
  if (parts.some((p) => p.seconds < MIN_SECONDS - 1e-9 || p.ask > max)) throw new Error("the film cannot be cut into parts within the limits");
  return parts;
}

// --- the prompt ------------------------------------------------------------------------------------------------------
const LIGHT = {
  morning: "early-morning New Zealand sun, low and soft, long gentle shadows, clear cool air",
  midday: "high midday New Zealand sun, crisp short shadows, clear sky",
  golden: "late-afternoon golden-hour New Zealand sun, warm low light, long shadows",
  overcast: "bright overcast New Zealand sky, soft even light, no hard shadows",
};
const SEASON = { summer: "Summer: full, fresh foliage and dry, warm ground.", winter: "Winter: a lower, cooler sun, damp ground and a crisper sky." };
export function buildFilmPrompt(look = {}, o = {}) {
  return [
    "Edit this video: make it look like real camera footage of the same building, as built, filmed along exactly the same camera path.",
    "Keep the camera motion exactly as it is: the same path, speed, lens, framing and horizon in every frame. A slow, steady camera: no shake, no zoom, no speed changes. One continuous shot, no cuts.",
    "Keep the building's geometry exactly: every wall, every window and door opening, every glazing panel and mullion, every stair, step, balustrade, deck edge, roof line and fascia, and every pole and pile stay exactly where they are in every frame, at the same size and in the same number. Doors that open in the video open the same way.",
    "Do not add, remove, move, resize, widen or straighten any building element. Add no buildings, structures, roofs or signs that the video does not show; keep every neighbouring building as it is.",
    "Only the materials, light, sky and planting may change: make the surfaces read as real materials, and the light and sky as real.",
    o.still ? "The reference image shows the look to match (materials, light and planting); the building's geometry comes from the video, not from the image." : "",
    o.guide ? "The guide image is the last frame of the previous part of this film: make this part continue from it seamlessly, in the same look and light." : "",
    look.time ? `Light: ${LIGHT[look.time]}.` : "",
    look.season ? SEASON[look.season] : "",
    "Plant New Zealand native species only, and only on ground the video shows; keep the planting low so it hides no part of the building. Planting and trees move slightly in a light wind; nothing else moves.",
    "No people, no text, no captions, no watermark, no logos.",
    "Sound: quiet natural ambience only (light wind and native birdsong); no music, no voices.",
    "Keep everything else the same.",
  ].filter(Boolean).join("\n");
}

// --- the clip ------------------------------------------------------------------------------------------------------------
function b64bytes(b64, max) {
  const s = max ? b64.slice(0, Math.ceil(max / 3) * 4) : b64;
  const bin = atob(s), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
/**
 * What an MP4 says about itself: its length (moov/mvhd), and the width and height of its video track (moov/trak/tkhd of the
 * track whose handler is "vide"). Reads boxes only; nothing is decoded. null if it is not an MP4 with a movie header.
 */
export function mp4Info(u) {
  const be32 = (i) => ((u[i] << 24) >>> 0) + (u[i + 1] << 16) + (u[i + 2] << 8) + u[i + 3];
  const be64 = (i) => be32(i) * 4294967296 + be32(i + 4);
  const tag = (i) => String.fromCharCode(u[i], u[i + 1], u[i + 2], u[i + 3]);
  const boxes = (start, end) => {
    const out = [];
    for (let i = start; i + 8 <= end;) {
      let size = be32(i), head = 8;
      if (size === 1) { if (i + 16 > end) break; size = be64(i + 8); head = 16; } else if (size === 0) size = end - i;
      if (size < head || i + size > end) break;
      out.push({ type: tag(i + 4), start: i + head, end: i + size });
      i += size;
    }
    return out;
  };
  const top = boxes(0, u.length);
  if (!top.length || top[0].type !== "ftyp") return null;
  const moov = top.find((b) => b.type === "moov");
  if (!moov) return null;
  const kids = boxes(moov.start, moov.end), mvhd = kids.find((b) => b.type === "mvhd");
  if (!mvhd) return null;
  const v = u[mvhd.start], timescale = v === 1 ? be32(mvhd.start + 20) : be32(mvhd.start + 12), duration = v === 1 ? be64(mvhd.start + 24) : be32(mvhd.start + 16);
  let w = 0, h = 0;
  for (const t of kids.filter((b) => b.type === "trak")) {
    const tk = boxes(t.start, t.end), tkhd = tk.find((b) => b.type === "tkhd"), mdia = tk.find((b) => b.type === "mdia");
    const hdlr = mdia && boxes(mdia.start, mdia.end).find((b) => b.type === "hdlr");
    if (!tkhd || !hdlr || tag(hdlr.start + 8) !== "vide") continue;
    const tv = u[tkhd.start], o = tkhd.start + (tv === 1 ? 88 : 76);
    w = be32(o) / 65536; h = be32(o + 4) / 65536;
    break;
  }
  if (!timescale) return null;
  return { seconds: duration / timescale, w: Math.round(w), h: Math.round(h) };
}
/** the shape Google makes closest to w × h, if within 2% (16:9 or 9:16); else null */
export function aspectOf(w, h) {
  if (!w || !h) return null;
  const r = Math.log(w / h);
  if (Math.abs(r - Math.log(16 / 9)) < 0.02) return "16:9";
  if (Math.abs(r - Math.log(9 / 16)) < 0.02) return "9:16";
  return null;
}

// --- counters (the shape of /api/render's, under their own keys) -----------------------------------------------------------
const local = new Map();
function localGet(key) { const e = local.get(key); if (!e || e.until <= Date.now()) { local.delete(key); return 0; } return e.n; }
function localBump(key, ttl) {
  const now = Date.now();
  if (local.size > 5000) for (const [k, e] of local) if (e.until <= now) local.delete(k);
  local.set(key, { n: localGet(key) + 1, until: now + ttl * 1000 });
}
/** for tests: forget the in-isolate counts */
export function _resetCounters() { local.clear(); }
const kvOf = (env) => (env.FILM_KV?.get ? env.FILM_KV : env.RENDER_KV?.get ? env.RENDER_KV : null);
export function counterKind(env) { return kvOf(env) ? "kv" : globalThis.caches?.default ? "cache" : "isolate"; }
const cacheUrl = (base, key) => new URL("/api/film/_limits/" + encodeURIComponent(key), base).toString();
async function sharedGet(env, base, key) {
  try {
    const kv = kvOf(env); if (kv) return int(await kv.get("film:" + key), 0);
    const c = globalThis.caches?.default; if (!c) return 0;
    const hit = await c.match(cacheUrl(base, key)); return hit ? int(await hit.text(), 0) : 0;
  } catch { return 0; }
}
async function sharedPut(env, base, key, n, ttl) {
  try {
    const kv = kvOf(env); if (kv) return await kv.put("film:" + key, String(n), { expirationTtl: Math.max(60, ttl) });
    const c = globalThis.caches?.default; if (!c) return;
    await c.put(cacheUrl(base, key), new Response(String(n), { headers: { "cache-control": `max-age=${ttl}`, "content-type": "text/plain" } }));
  } catch { /* the in-isolate count still holds */ }
}
async function sha(s) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function takeSlot(env, base, ip, slotsFor, now = new Date()) {
  const day = now.toISOString().slice(0, 10), minute = now.toISOString().slice(0, 16), who = await sha(`${day}|${ip || "unknown"}`);
  const slots = slotsFor(limitsOf(env), day, minute, who);
  const counts = await Promise.all(slots.map(async (s) => Math.max(localGet(s.key), await sharedGet(env, base, s.key))));
  for (let i = 0; i < slots.length; i++) if (counts[i] >= slots[i].max) return slots[i].err;
  await Promise.all(slots.map(async (s, i) => { localBump(s.key, s.ttl); await sharedPut(env, base, s.key, counts[i] + 1, s.ttl); }));
  return null;
}
const sendSlots = (L, day, minute, who) => [
  { key: `g:${day}`, max: L.daily_cap, ttl: 90_000, err: "daily_cap" },
  { key: `d:${day}:${who}`, max: L.per_ip_day, ttl: 90_000, err: "ip_daily" },
  { key: `m:${minute}:${who}`, max: L.per_minute, ttl: 120, err: "slow_down" },
];
const pollSlots = (L, day, minute, who) => [{ key: `p:${minute}:${who}`, max: L.polls_per_minute, ttl: 120, err: "poll_slow_down" }];

// --- the handle a background job is polled by: Google's id, signed so only jobs this endpoint started are polled -----------
const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s) => { const t = s.replace(/-/g, "+").replace(/_/g, "/"); return b64bytes(t + "=".repeat((4 - (t.length % 4)) % 4)); };
async function hmacKey(env) {
  const secret = env.FILM_HANDLE_SECRET || `assembl-film-handle|${keyOf(env)}`;
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
export async function makeHandle(env, job) {
  const body = new TextEncoder().encode(JSON.stringify(job));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(env), body));
  return `${b64url(body)}.${b64url(sig)}`;
}
export async function readHandle(env, handle, now = Date.now()) {
  if (typeof handle !== "string" || handle.length > 2000 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(handle)) return null;
  const [b, s] = handle.split(".");
  let body, sig; try { body = fromB64url(b); sig = fromB64url(s); } catch { return null; }
  if (!(await crypto.subtle.verify("HMAC", await hmacKey(env), sig, body))) return null;
  let job; try { job = JSON.parse(new TextDecoder().decode(body)); } catch { return null; }
  if (!job || typeof job.id !== "string" || !/^[A-Za-z0-9_.:-]{1,200}$/.test(job.id) || !(now - job.t < HANDLE_TTL_MS)) return null;
  return job;
}

// --- the call ------------------------------------------------------------------------------------------------------------
const BLOCKED = new Set(["safety", "recitation", "language", "prohibited_content", "spii", "blocklist", "image_safety", "image_prohibited_content", "video_safety", "video_prohibited_content", "content_blocked"]);
const headersOf = (env) => ({ "content-type": "application/json", "x-goog-api-key": keyOf(env), "api-revision": API_REVISION });
/** the request Google's docs give for editing your own video: the clip (and stills) and the instruction in, one MP4 out */
export function geminiFilmRequest(env, { video, still, guide, prompt, seconds, aspect, resolution, mode }) {
  const model = modelOf(env), task = taskOf(env);
  const input = [{ type: "video", mime_type: "video/mp4", data: video }];
  if (still) input.push({ type: "image", mime_type: still.type, data: still.data });
  if (guide) input.push({ type: "image", mime_type: guide.type, data: guide.data });
  input.push({ type: "text", text: prompt });
  return {
    url: "https://generativelanguage.googleapis.com/v1beta/interactions",
    headers: headersOf(env),
    body: {
      model, input,
      response_format: { type: "video", aspect_ratio: aspect, resolution, duration: `${seconds}s`, delivery: "inline" },
      ...(task ? { generation_config: { video_config: { task } } } : {}),
      // background needs store: true (Google keeps it until deleted; this endpoint deletes it once fetched); wait keeps nothing
      ...(mode === "background" ? { background: true, store: true } : { background: false, store: false }),
    },
    model,
  };
}
/** the final video in an interaction; thought steps are skipped. { video, mime } | { running } | { error } */
export function readFilm(j) {
  if (j?.error) return { error: BLOCKED.has(j.error.code) ? "declined" : "model_error" };
  if (j?.status === "in_progress" || j?.status === "requires_action" || j?.status === "queued") return { running: true };
  if (j?.status === "failed" || j?.status === "cancelled") return { error: BLOCKED.has(j?.error?.code) ? "declined" : "model_error" };
  let last = null;
  if (Array.isArray(j?.steps)) for (const s of j.steps) if (s?.type === "model_output") for (const c of s.content || []) if (c?.type === "video" && typeof c.data === "string" && c.data) last = { mime: c.mime_type || "video/mp4", data: c.data };
  if (!last && Array.isArray(j?.outputs)) for (const c of j.outputs) if (c?.type === "video" && typeof c.data === "string" && c.data) last = { mime: c.mime_type || "video/mp4", data: c.data };
  if (last && (j.status === undefined || j.status === "completed")) return { video: `data:${last.mime};base64,${last.data}` };
  if (j?.status === "completed") return { error: "no_video" };
  return { error: "no_video" };
}
/** Google answers an error as { error: {...} } or, for a bad request, as an array [{ error: {...} }]; either way, the error */
export function errorOf(j) {
  const e = Array.isArray(j) ? j[0]?.error : j?.error;
  return e && typeof e === "object" ? e : null;
}
function upstreamError(status, j) {
  const e = errorOf(j), codes = [e?.code, e?.status].filter((c) => typeof c === "string" && c);
  const is = (...names) => codes.some((c) => names.includes(c));
  if (codes.some((c) => BLOCKED.has(c))) return "declined";
  if (status === 429 || status === 503 || is("rate_limit_exceeded", "quota_exceeded", "RESOURCE_EXHAUSTED", "UNAVAILABLE")) return "busy";
  if (status === 504 || is("deadline_exceeded", "DEADLINE_EXCEEDED")) return "timeout";
  if (status === 400 || is("invalid_argument", "INVALID_ARGUMENT")) return "refused";
  if (status === 404) return "gone";
  return "model_error";
}
/** what Google said, for the caller (never the request, never a key): its status, its code and the start of its message */
export function upstreamOf(status, j) {
  const e = errorOf(j);
  const clip = (v, n) => (typeof v === "string" || typeof v === "number" ? String(v).replace(/AIza[\w-]{10,}/g, "[key]").slice(0, n) : undefined);
  return { http: status, code: clip(e?.code, 60), status: clip(e?.status, 60), message: clip(e?.message, 300) };
}

// --- answers -------------------------------------------------------------------------------------------------------------
export const MESSAGES = {
  not_configured: "Films are not switched on here: this copy of the lab has no Google Gemini key. Nothing was sent.",
  origin: "Films can only be made from the assembl lab pages and tools.",
  method: "Send the clip with POST, or poll a film with GET and its handle.",
  too_large: "That request is too big to send (24 MB at most).",
  bad_json: "The request could not be read.",
  video_required: "No clip came with the request. Send an MP4 of the model view.",
  video_unreadable: "The clip could not be read as an MP4 with a movie header.",
  video_too_large: "That clip is over 16 MB. Send a shorter part or a lower bit rate.",
  video_too_long: "That clip is longer than one part may be. Cut the film into parts first (planSegments).",
  video_too_short: `That clip is shorter than ${MIN_SECONDS} s, the shortest Google Gemini makes.`,
  video_shape: "The clip must be 16:9 or 9:16, the shapes Google Gemini makes.",
  still_unreadable: "A still could not be read as a PNG, JPEG or WebP image.",
  still_too_large: "A still is over 4 MB.",
  bad_resolution: "Choose 360p, 720p or 1080p.",
  bad_mode: "Choose background or wait.",
  bad_time: "Choose a time of day: morning, midday, golden hour or overcast, or leave it out.",
  bad_season: "Choose summer or winter, or leave the season out.",
  confirm_spend: "Each part of a film is paid for. Check the price, then send it again with confirm: true.",
  slow_down: "That is a lot of film parts in one minute. Wait a minute and try again.",
  ip_daily: "That is today's limit of film parts from this connection. Try again tomorrow.",
  daily_cap: "The lab has made all the film parts it makes in a day. Try again tomorrow.",
  poll_slow_down: "Asking very often. Wait a few seconds between polls.",
  bad_handle: "That film handle is not one this lab made, or it is more than a day old.",
  declined: "Google Gemini would not make this film. No film was made.",
  no_video: "Google Gemini finished without a film this time. Try again.",
  busy: "Google Gemini is busy right now. Wait a moment and try again.",
  timeout: "Google Gemini took too long. Try again, or use background mode.",
  refused: "Google Gemini refused the request as sent (for example, background mode for this model). Nothing was made; try mode wait.",
  gone: "Google no longer has this film (fetched already, or older than its keeping time).",
  model_error: "Google Gemini could not make the film. Nothing is shown rather than a guess.",
};
// Never 502 or 504 for Google's failures: on the lab's own domain Cloudflare swaps any 502 or 504 answer for its own plain-text
// "error code: 502" page, which hid every reason (23 Nov 2026). The reason is in the JSON: error, message and upstream.
const STATUS = { confirm_spend: 402, not_configured: 503, origin: 403, method: 405, too_large: 413, video_too_large: 413, still_too_large: 413, slow_down: 429, ip_daily: 429, daily_cap: 429, poll_slow_down: 429, bad_handle: 404, declined: 422, no_video: 424, busy: 429, timeout: 424, refused: 424, gone: 410, model_error: 424 };

function stillOf(v) {
  if (v == null || v === "") return { value: null };
  const m = typeof v === "string" && v.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!m) return { error: "still_unreadable" };
  const img = { type: m[1], data: m[2] };
  if (Math.floor((img.data.length * 3) / 4) > MAX_STILL) return { error: "still_too_large" };
  let d; try { d = imageSize(img.type, b64bytes(img.data, 65536)) || imageSize(img.type, b64bytes(img.data)); } catch { d = null; }
  if (!d || !d.w || !d.h) return { error: "still_unreadable" };
  return { value: img };
}
/** everything about a request that can be checked before anything is counted or sent: { error } or the parts */
export function checkFilmInput(body, env = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "bad_json" };
  const m = typeof body.video === "string" && body.video.match(/^data:video\/mp4;base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!m) return { error: typeof body.video === "string" && body.video.startsWith("data:") ? "video_unreadable" : "video_required" };
  const video = m[1];
  if (Math.floor((video.length * 3) / 4) > MAX_VIDEO) return { error: "video_too_large" };
  // a fast-start MP4 keeps its movie header at the front: read the first 2 MB, and the whole file only if it is not there
  let info; try { info = mp4Info(b64bytes(video, 2_000_000)) || mp4Info(b64bytes(video)); } catch { info = null; }
  if (!info) return { error: "video_unreadable" };
  const max = partMaxOf(env);
  if (info.seconds > max + 0.05) return { error: "video_too_long", max };
  if (info.seconds < MIN_SECONDS - 0.05) return { error: "video_too_short" };
  const aspect = aspectOf(info.w, info.h);
  if (!aspect) return { error: "video_shape" };
  const still = stillOf(body.still); if (still.error) return { error: still.error };
  const guide = stillOf(body.guide); if (guide.error) return { error: guide.error };
  const resolution = body.resolution ?? "720p";
  if (!RESOLUTIONS.includes(resolution)) return { error: "bad_resolution" };
  if (body.mode != null && !MODES.includes(body.mode)) return { error: "bad_mode" };
  const look = body.look && typeof body.look === "object" ? body.look : {};
  if (look.time != null && look.time !== "" && !TIMES.includes(look.time)) return { error: "bad_time" };
  if (look.season != null && look.season !== "" && !SEASONS.includes(look.season)) return { error: "bad_season" };
  const seconds = Math.min(max, Math.max(MIN_SECONDS, Math.ceil(info.seconds - 0.05)));
  return { video, info, seconds, aspect, still: still.value, guide: guide.value, resolution, mode: modeOf(env, body.mode), look: { time: look.time || undefined, season: look.season || undefined } };
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
    if (n > max) { try { await reader.cancel(); } catch { /* closed */ } return { tooLarge: true }; }
    parts.push(value);
  }
  const all = new Uint8Array(n); let o = 0; for (const p of parts) { all.set(p, o); o += p.byteLength; }
  return { text: new TextDecoder().decode(all) };
}

async function google(url, init, ms) {
  const ac = new AbortController(), timer = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(url, { ...init, signal: ac.signal });
    let j = null; try { j = await r.json(); } catch { j = null; }
    return { r, j };
  } finally { clearTimeout(timer); }
}
/** best effort: Google keeps a stored interaction 55 days unless it is deleted */
async function forget(env, id) {
  try { await fetch(`https://generativelanguage.googleapis.com/v1beta/interactions/${encodeURIComponent(id)}`, { method: "DELETE", headers: headersOf(env) }); } catch { /* best effort */ }
}

export async function onRequest({ request, env }) {
  env = env || {};
  const H = cors(request);
  const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...H } });
  const fail = (code, extra) => json(STATUS[code] ?? 400, { error: code, message: MESSAGES[code], label: LABEL, ...extra });
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: H });
  const url = new URL(request.url), origin = request.headers.get("origin");
  const ip = request.headers.get("cf-connecting-ip") || "";

  if (request.method === "GET" && url.searchParams.has("handle")) {
    // poll a background film: same-origin pages send no Origin on GET; any other Origin is refused
    if (origin && !allowedOrigin(origin)) return fail("origin");
    if (!keyOf(env)) return fail("not_configured");
    const job = await readHandle(env, url.searchParams.get("handle"));
    if (!job) return fail("bad_handle");
    const hit = await takeSlot(env, request.url, ip, pollSlots);
    if (hit) return fail(hit, { retry_after: 10 });
    try {
      const { r, j } = await google(`https://generativelanguage.googleapis.com/v1beta/interactions/${encodeURIComponent(job.id)}`, { method: "GET", headers: headersOf(env) }, TIMEOUT_MS.poll);
      if (!r.ok) { console.warn("film: poll error", r.status, JSON.stringify(upstreamOf(r.status, j))); return fail(upstreamError(r.status, j), { upstream: upstreamOf(r.status, j) }); }
      const a = readFilm(j);
      if (a.running) return json(200, { type: "assembl.planstudio.film.job", status: "running", waited_s: Math.round((Date.now() - job.t) / 1000), part: job.p ?? null, label: LABEL, prompt_revision: FILM_PROMPTS });
      await forget(env, job.id);
      if (a.error) { console.warn("film: no video", a.error, String(j?.status ?? "").slice(0, 40)); return fail(a.error); }
      return json(200, { type: "assembl.planstudio.film", status: "completed", video: a.video, model: (typeof j?.model === "string" && j.model) || job.m, seconds: job.s, part: job.p ?? null, took_ms: Date.now() - job.t, prompt_revision: FILM_PROMPTS, label: LABEL });
    } catch (e) {
      const timeout = e?.name === "AbortError";
      console.warn("film: poll failed", timeout ? "timeout" : String(e?.message || e).slice(0, 200));
      return fail(timeout ? "timeout" : "model_error");
    }
  }
  if (request.method === "GET") {
    return json(200, {
      type: "assembl.planstudio.film.status", configured: !!keyOf(env), host: "cloudflare", provider: "google-gemini", api: "interactions",
      model: modelOf(env), task: taskOf(env) || null, mode: modeOf(env), modes: MODES, prompt_revision: FILM_PROMPTS,
      part_max_s: partMaxOf(env), part_min_s: MIN_SECONDS, fps: 24, aspect_ratios: ["16:9", "9:16"], resolutions: RESOLUTIONS,
      limits: { ...limitsOf(env), max_body_bytes: MAX_BODY, max_video_bytes: MAX_VIDEO, max_still_bytes: MAX_STILL, counted_in: counterKind(env) },
      estimate: { per_part_10s_720p: estimateOf(env, 10, "720p"), per_second: Object.fromEntries(RESOLUTIONS.map((r) => [r, estimateOf(env, 1, r).per_second ?? null])) },
      needs_confirm: true, stores_films: false, label: LABEL,
    });
  }
  if (request.method !== "POST") return fail("method");
  if (!allowedOrigin(origin)) return fail("origin");
  if (!keyOf(env)) return fail("not_configured");

  const raw = await readCapped(request, MAX_BODY);
  if (raw.tooLarge) return fail("too_large");
  let body; try { body = JSON.parse(raw.text); } catch { return fail("bad_json"); }
  const input = checkFilmInput(body, env);
  if (input.error) return fail(input.error, input.max ? { part_max_s: input.max } : {});
  const estimate = estimateOf(env, input.seconds, input.resolution);
  // dry run (free): every step up to the call to Google, nothing counted or sent; says how far it got, to find a failing step
  if (body.dry === true) {
    const steps = ["input"];
    try {
      const prompt = buildFilmPrompt(input.look, { still: !!input.still, guide: !!input.guide }); steps.push("prompt");
      const req = geminiFilmRequest(env, { ...input, prompt }); steps.push("request");
      const size = JSON.stringify(req.body).length; steps.push("body");
      const handle = await makeHandle(env, { id: "dry", m: req.model, s: input.seconds, p: null, t: Date.now() }); steps.push("handle");
      return json(200, { type: "assembl.planstudio.film.dry", ok: true, steps, model: req.model, body_chars: size, handle_chars: handle.length, mode: input.mode });
    } catch (e) { return json(200, { type: "assembl.planstudio.film.dry", ok: false, steps, failed_after: steps[steps.length - 1], error: String(e?.message || e).slice(0, 200) }); }
  }
  if (body.confirm !== true) return fail("confirm_spend", { estimate });

  const hit = await takeSlot(env, request.url, ip, sendSlots);
  if (hit) return fail(hit, hit === "slow_down" ? { retry_after: 60 } : {});

  const prompt = buildFilmPrompt(input.look, { still: !!input.still, guide: !!input.guide });
  const req = geminiFilmRequest(env, { ...input, prompt });
  const t0 = Date.now(), part = Number.isInteger(body.part) && body.part >= 0 && body.part < 100 ? body.part : null;
  try {
    const { r, j } = await google(req.url, { method: "POST", headers: req.headers, body: JSON.stringify(req.body) }, TIMEOUT_MS[input.mode]);
    if (!r.ok) {
      const code = upstreamError(r.status, j);
      console.warn("film: model error", r.status, JSON.stringify(upstreamOf(r.status, j)));
      return fail(code, { mode: input.mode, upstream: upstreamOf(r.status, j) });
    }
    const a = readFilm(j);
    if (a.running) {
      if (typeof j?.id !== "string") return fail("model_error");
      const handle = await makeHandle(env, { id: j.id, m: req.model, s: input.seconds, p: part, t: t0 });
      return json(202, { type: "assembl.planstudio.film.job", status: "running", handle, poll: `/api/film?handle=${handle}`, poll_every_s: 10, model: req.model, seconds: input.seconds, part, estimate, prompt_revision: FILM_PROMPTS, label: LABEL });
    }
    if (input.mode === "background" && typeof j?.id === "string") await forget(env, j.id);
    if (a.error) { console.warn("film: no video", a.error, String(j?.status ?? "").slice(0, 40)); return fail(a.error); }
    return json(200, { type: "assembl.planstudio.film", status: "completed", video: a.video, model: (typeof j?.model === "string" && j.model) || req.model, seconds: input.seconds, part, aspect_ratio: input.aspect, resolution: input.resolution, took_ms: Date.now() - t0, estimate, prompt_revision: FILM_PROMPTS, label: LABEL });
  } catch (e) {
    const timeout = e?.name === "AbortError";
    console.warn("film: call failed", timeout ? "timeout" : String(e?.message || e).slice(0, 200));
    return fail(timeout ? "timeout" : "model_error");
  }
}
