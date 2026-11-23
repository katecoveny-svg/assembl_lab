// assembl lab · architecture agents: the one place two specialist agents ask a model for judgement.
//   mode "interior": the interior design agent (roster agent 8). Rules have already laid each room out; the model is given the
//                    brief and each room's name, use, area and allowed layouts, and answers a style brief, finishes and which
//                    allowed layout suits a room. Positions, sizes and counts never come from here (interior-rules.js takes only
//                    the allowed choices from the answer).
//   mode "look":     the 3D look expert's optional critique: the browser twin's standard views (up to three stills), and the
//                    architect's own render when there is one (last), scored 1 to 5 on a few aspects with short notes. It is a
//                    model's opinion beside the measured checks; it never approves the look.
// The provider chain is plan-read.js's own: OpenAI (gpt-6.2-astra) → Gemini → Anthropic, each tried in turn until one answers with
// output that passes the schema. Keys stay in Cloudflare (OPENAI_API_KEY, GEMINI_API_KEY or GOOGLE_API_KEY, ANTHROPIC_API_KEY);
// PLANREAD_PROVIDERS and the PLANREAD_*_MODEL settings apply here too. AGENT_JUDGE_DAILY_CAP: requests a day per running instance
// (default 200). Images pass through to the model and are dropped; nothing is stored.
// The schemas below are the same as architecture/js/agents/interior-rules.js JUDGE_SCHEMA and look-rules.js CRITIQUE_SCHEMA:
// tests/architecture/agent-judge.test.mjs checks they agree.
import { chain, validate, toGeminiSchema } from "./plan-read.js";

export const INTERIOR_PROMPTS = "interior-judge 2026-11-23a";
export const LOOK_PROMPTS = "look-critique 2026-11-23a";
const S = { type: "string" }, N = { type: "number" };
const o = (properties) => ({ type: "object", additionalProperties: false, properties, required: Object.keys(properties) });
export const INTERIOR_SCHEMA = o({
  style_brief: { type: "string", description: "Two or three plain sentences: the feel of the fit-out, in New Zealand English" },
  finishes: { type: "array", items: o({ role: S, finish: S }) },
  rooms: { type: "array", items: o({ name: S, layout: S, why: S }) },
  notes: S,
});
export const INTERIOR_SYSTEM = `You help assembl's interior design agent, a New Zealand architecture tool. Rules have already laid each room out; you only give judgement.
- style_brief: two or three short sentences on the feel of the fit-out for this project, from the brief and the rooms. Plain New Zealand English, no hype, no brand names.
- finishes: for each role listed with finishes, pick one finish id from its list, or leave the role out.
- rooms: for each room that has more than one layout, pick one of its layouts and say why in one short sentence. Use only the layout names given.
Never give a size, a position, a count or a code or compliance view. Leave anything you are unsure of out and say so in notes.`;
export const LOOK_SCHEMA = o({
  scores: o({ materials: N, light: N, composition: N, realism: N, match: { type: ["number", "null"] } }),
  notes: { type: "array", items: S },
  summary: S,
});
export const LOOK_SYSTEM = `You review still frames of a browser 3D model of a building for assembl, a New Zealand architecture tool, before a person reviews the look.
Score each aspect from 1 (poor) to 5 (convincing): materials (surfaces read as real materials, not plastic or flat grey), light (sun, shade and shadow read naturally), composition (the building reads clearly in the frame), realism (could pass for a photograph at a glance).
match: when the architect's own render is given (it is the last image), score how closely the browser frames match its look from 1 to 5; when no render is given, null.
notes: up to five short, concrete fixes, each naming what to change. summary: one sentence. Plain New Zealand English.
Never approve the look, never give a compliance view, and never invent a dimension.`;

const MAX_IMAGE = 3_000_000, MAX_INPUT = 40_000, TIMEOUT_MS = 60_000;
let day = "", used = 0;
const NAMES = { openai: "OPENAI_API_KEY", anthropic: "ANTHROPIC_API_KEY" };
const keyOf = (env, name) => name === "gemini" ? (env.GEMINI_API_KEY || env.GOOGLE_API_KEY) : env[NAMES[name]];
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

/** the request a provider is sent: text and any images (data URLs), structured output in the mode's schema */
export function requestFor(name, model, key, mode, text, images) {
  if (name === "anthropic") return {
    url: "https://api.anthropic.com/v1/messages",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: { model, max_tokens: 4000, system: mode.system, output_config: { effort: "medium", format: { type: "json_schema", schema: mode.schema } },
      messages: [{ role: "user", content: [...images.map((i) => ({ type: "image", source: { type: "base64", media_type: i.type, data: i.data } })), { type: "text", text }] }] },
  };
  if (name === "openai") return {
    url: "https://api.openai.com/v1/chat/completions",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: { model, max_completion_tokens: 4000, response_format: { type: "json_schema", json_schema: { name: mode.name, strict: true, schema: mode.schema } },
      messages: [{ role: "system", content: mode.system }, { role: "user", content: [{ type: "text", text }, ...images.map((i) => ({ type: "image_url", image_url: { url: `data:${i.type};base64,${i.data}` } }))] }] },
  };
  return {
    url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: { systemInstruction: { parts: [{ text: mode.system }] }, contents: [{ role: "user", parts: [...images.map((i) => ({ inline_data: { mime_type: i.type, data: i.data } })), { text }] }],
      generationConfig: { responseMimeType: "application/json", responseSchema: toGeminiSchema(mode.schema), maxOutputTokens: 4000 } },
  };
}
/** the text of a provider's answer, or the reason there is none */
export function answerOf(name, j) {
  if (name === "anthropic") { if (j.stop_reason === "refusal") return { reason: "declined" }; if (j.stop_reason === "max_tokens") return { reason: "too_much" }; return { text: (j.content || []).filter((b) => b.type === "text").map((b) => b.text).join(""), model: j.model }; }
  if (name === "openai") { const c = j.choices?.[0]; if (c?.message?.refusal) return { reason: "declined" }; if (c?.finish_reason === "length") return { reason: "too_much" }; return { text: c?.message?.content || "", model: j.model }; }
  const c = j.candidates?.[0]; if (!c) return { reason: "empty" }; if (c.finishReason === "MAX_TOKENS") return { reason: "too_much" };
  return { text: (c.content?.parts || []).map((p) => p.text || "").join(""), model: j.modelVersion };
}

const MODES = {
  interior: { name: "interior_judgement", schema: INTERIOR_SCHEMA, system: INTERIOR_SYSTEM, prompts: INTERIOR_PROMPTS },
  look: { name: "look_critique", schema: LOOK_SCHEMA, system: LOOK_SYSTEM, prompts: LOOK_PROMPTS },
};
const dataUrl = (s) => { const m = typeof s === "string" && s.match(/^data:(image\/(png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/); return m ? { type: m[1], data: m[3] } : null; };

/** the text and images for a request body, or the error to send back */
export function readBody(body) {
  const mode = MODES[body?.mode];
  if (!mode) return { error: "mode_required", hint: 'mode is "interior" or "look"' };
  if (body.mode === "interior") {
    const input = body.input;
    if (!input || typeof input !== "object" || !Array.isArray(input.rooms)) return { error: "input_required", hint: "{ brief, rooms: [{ name, use, area_m2, layouts, now }], finishes }" };
    const text = JSON.stringify({ brief: String(input.brief ?? "").slice(0, 800), rooms: input.rooms.slice(0, 200), finishes: Array.isArray(input.finishes) ? input.finishes.slice(0, 40) : [] });
    if (text.length > MAX_INPUT) return { error: "input_too_large" };
    return { mode, text: `The project, as JSON:\n${text}`, images: [] };
  }
  const shots = (Array.isArray(body.images) ? body.images : []).slice(0, 3).map(dataUrl);
  if (!shots.length || shots.some((x) => !x)) return { error: "images_required", hint: "one to three data:image/jpeg;base64 stills" };
  const render = body.render ? dataUrl(body.render) : null;
  if (body.render && !render) return { error: "render_not_an_image" };
  const images = render ? [...shots, render] : shots;
  if (images.some((i) => i.data.length * 0.75 > MAX_IMAGE)) return { error: "image_too_large" };
  const views = (Array.isArray(body.views) ? body.views : []).slice(0, 3).map((v) => String(v).slice(0, 40));
  return { mode, text: `${shots.length} browser frame${shots.length === 1 ? "" : "s"}${views.length ? ` (${views.join(", ")})` : ""}${render ? ", then the architect's own render" : ", no render given"}. Review the look.`, images };
}

export async function onRequest({ request, env }) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  const providers = chain(env), active = providers.filter((p) => p.configured);
  if (request.method === "GET") return json(200, { type: "assembl.agent-judge.status", configured: active.length > 0, providers, prompts: { interior: INTERIOR_PROMPTS, look: LOOK_PROMPTS } });
  if (request.method !== "POST") return json(405, { error: "method_not_allowed" });
  if (!active.length) return json(503, { error: "not_configured" });
  let body; try { body = await request.json(); } catch { body = {}; }
  const got = readBody(body);
  if (got.error) return json(400, got);
  const today = new Date().toISOString().slice(0, 10); if (today !== day) { day = today; used = 0; }
  if (used >= +(env.AGENT_JUDGE_DAILY_CAP || 200)) return json(429, { error: "daily_cap" });
  used++;
  const tried = [];
  for (const p of active) {
    const rq = requestFor(p.name, p.model, keyOf(env, p.name), got.mode, got.text, got.images);
    const ac = new AbortController(), timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
    try {
      const r = await fetch(rq.url, { method: "POST", headers: rq.headers, body: JSON.stringify(rq.body), signal: ac.signal });
      if (!r.ok) { console.warn(`agent-judge: ${p.name} model error`, r.status); tried.push(`${p.name}: http ${r.status}`); continue; }
      const a = answerOf(p.name, await r.json());
      if (!a.text) { tried.push(`${p.name}: ${a.reason || "empty"}`); continue; }
      let answer; try { answer = JSON.parse(a.text); } catch { tried.push(`${p.name}: not JSON`); continue; }
      const bad = validate(answer, got.mode.schema);
      if (bad) { tried.push(`${p.name}: ${bad.slice(0, 120)}`); continue; }
      return json(200, { type: "assembl.agent-judge", mode: body.mode, provider: p.name, model: a.model || p.model, prompts: got.mode.prompts, src: "model judgement", answer, tried });
    } catch (e) { tried.push(`${p.name}: ${e?.name === "AbortError" ? "timeout" : "error"}`); }
    finally { clearTimeout(timer); }
  }
  return json(502, { error: "model_error", tried });
}
