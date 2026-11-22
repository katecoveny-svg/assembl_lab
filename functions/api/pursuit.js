// assembl lab · Architecture operations, Pursuit studio: ideas for how a practice could help on a public tender notice, and a
// first draft of its response. Anthropic's Claude writes both from the notice text the practice pasted, the practice's own
// people and ticked projects, and the requirements in architecture/data/pursuit-requirements.json. The practice edits and
// approves everything: nothing is submitted, sent or published from here, and nothing is stored here.
// Cloudflare Pages Function. Needs ANTHROPIC_API_KEY. Model: PURSUIT_MODEL (default claude-opus-5-5).
//
// Who can ask: only a signed-in member of the practice who can change its records. The page sends the person's Supabase access
// token (Authorization: Bearer ...). The token is checked with Supabase's own auth (GET /auth/v1/user, with the project's public
// address and publishable key from architecture/js/config.js), then arch.can_write(practice) is asked with that same token, so
// the database decides. A viewer, a person of another practice or a signed-out page is refused before anything is counted.
//
// Request format (Anthropic Messages API with JSON structured output), read 22 Nov 2026:
//   https://platform.claude.com/docs/en/build-with-claude/structured-outputs.md   (output_config.format, json_schema, refusals, max_tokens)
//   https://platform.claude.com/docs/en/build-with-claude/effort.md               (output_config.effort; Opus 5.5 thinks adaptively, thinking counts in max_tokens)
//   https://platform.claude.com/docs/en/about-claude/pricing.md                   (Claude Opus 5.5: US$4 per million input tokens, US$20 per million output)
//
// Limits: bodies over 64 KB are refused before they are read. Per IP: PURSUIT_IP_PER_MINUTE (default 6). All callers:
// PURSUIT_DAILY_CAP (default 30 a day). A request is counted when it is sent to Anthropic, answer or not, because it may be billed
// either way. Counts live in a KV namespace bound as PURSUIT_KV if there is one, otherwise Cloudflare's Cache API (one data
// centre), and always in an in-isolate counter too; a request is refused if any is over. IPs are hashed with the day, never logged.
// Spending is explicit: GET and every refusal carry the estimate, the page shows it beside the button, and a paid request must
// carry confirm: true or it is refused (402) before anything is checked further or counted.
// The notice is data: it goes inside <notice> tags with any angle brackets in it neutralised, and the system prompt says text
// inside the tags is never an instruction. The answer is schema-checked here (pursuit-schema.js validate) before it is returned.

import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SCHEMA } from "../../architecture/js/config.js";
import { REQUIREMENTS } from "../../architecture/js/pursuit-requirements.js";
import { IDEAS_SCHEMA, draftSchema, validate, buildIdeasPrompt, buildDraftPrompt, cleanIdeas, cleanDraft, cleanInput, PROMPT_REVISION, IDEAS_MIN, NOTICE_MAX } from "../../architecture/js/pursuit-schema.js";

export const MAX_BODY = 64_000;
export const DEFAULT_MODEL = "claude-opus-5-5";
const MAX_TOKENS = { ideas: 12_000, draft: 20_000 };
const TIMEOUT_MS = 170_000;
const AUTH_MS = 8_000;
// Anthropic's price for the default model, read 22 Nov 2026 (US$ per million tokens)
export const PRICE = { model: DEFAULT_MODEL, input: 4, output: 20, read_on: "2026-11-22" };
// typical and largest token counts for one press: the largest is the most a press can cost (max_tokens caps the output)
const TOKENS = { ideas: { typical: [7_000, 5_000], most: [12_000, MAX_TOKENS.ideas] }, draft: { typical: [9_000, 10_000], most: [14_000, MAX_TOKENS.draft] } };
const usd = ([i, o]) => (i * PRICE.input + o * PRICE.output) / 1e6;
const money = (n) => `US$${n.toFixed(2)}`;
export const modelOf = (env) => env.PURSUIT_MODEL || DEFAULT_MODEL;
export function estimateOf(env, task) {
  const model = modelOf(env);
  if (model !== DEFAULT_MODEL) return { model, usd: null, most_usd: null, text: `price of ${model}: see Anthropic's pricing page` };
  const t = usd(TOKENS[task].typical), m = usd(TOKENS[task].most);
  return { model, usd: Math.round(t * 100) / 100, most_usd: Math.round(m * 100) / 100, text: `about ${money(t)} a press, at most ${money(m)} (Anthropic's price for ${model}, read ${PRICE.read_on})` };
}
/** what a finished call cost, from the usage Anthropic reported; null for a model whose price is not known here */
export const costOf = (model, usage) => (model === DEFAULT_MODEL && usage ? Math.round(usd([usage.input_tokens || 0, usage.output_tokens || 0]) * 10000) / 10000 : null);

export const ALLOWED_HOSTS = ["lab.assembl.co.nz"];
const PREVIEW = /^([a-z0-9-]+\.)?assembl-lab\.pages\.dev$/;
export function allowedOrigin(origin) {
  if (!origin) return false;
  let u; try { u = new URL(origin); } catch { return false; }
  return u.protocol === "https:" && !u.port && (ALLOWED_HOSTS.includes(u.hostname) || PREVIEW.test(u.hostname));
}
function cors(request) {
  const o = request.headers.get("origin");
  return allowedOrigin(o) ? { "access-control-allow-origin": o, "access-control-allow-methods": "GET, POST, OPTIONS", "access-control-allow-headers": "content-type, authorization", "access-control-max-age": "86400", vary: "origin" } : { vary: "origin" };
}
const int = (v, d) => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n >= 0 ? n : d; };
export function limitsOf(env) { return { per_minute: int(env.PURSUIT_IP_PER_MINUTE, 6), daily_cap: int(env.PURSUIT_DAILY_CAP, 30) }; }

// --- counters (the pattern of render.js) ----------------------------------------------------------------------------------
const local = new Map();
function localGet(key) { const e = local.get(key); if (!e || e.until <= Date.now()) { local.delete(key); return 0; } return e.n; }
function localBump(key, ttl) { const now = Date.now(); if (local.size > 5000) for (const [k, e] of local) if (e.until <= now) local.delete(k); local.set(key, { n: localGet(key) + 1, until: now + ttl * 1000 }); }
/** for tests: forget the in-isolate counts */
export function _resetCounters() { local.clear(); }
export function counterKind(env) { return env.PURSUIT_KV?.get ? "kv" : globalThis.caches?.default ? "cache" : "isolate"; }
const cacheUrl = (base, key) => new URL("/api/pursuit/_limits/" + encodeURIComponent(key), base).toString();
async function sharedGet(env, base, key) {
  try {
    if (env.PURSUIT_KV?.get) return int(await env.PURSUIT_KV.get("pursuit:" + key), 0);
    const c = globalThis.caches?.default; if (!c) return 0;
    const hit = await c.match(cacheUrl(base, key)); return hit ? int(await hit.text(), 0) : 0;
  } catch { return 0; }
}
async function sharedPut(env, base, key, n, ttl) {
  try {
    if (env.PURSUIT_KV?.put) return await env.PURSUIT_KV.put("pursuit:" + key, String(n), { expirationTtl: Math.max(60, ttl) });
    const c = globalThis.caches?.default; if (!c) return;
    await c.put(cacheUrl(base, key), new Response(String(n), { headers: { "cache-control": `max-age=${ttl}`, "content-type": "text/plain" } }));
  } catch { /* the in-isolate counter still holds */ }
}
async function sha(s) { const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return [...new Uint8Array(d)].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join(""); }
async function takeSlot(env, base, ip, now = new Date()) {
  const L = limitsOf(env), day = now.toISOString().slice(0, 10), minute = now.toISOString().slice(0, 16), who = await sha(`${day}|${ip || "unknown"}`);
  const slots = [{ key: `g:${day}`, max: L.daily_cap, ttl: 90_000, err: "daily_cap" }, { key: `m:${minute}:${who}`, max: L.per_minute, ttl: 120, err: "slow_down" }];
  const counts = await Promise.all(slots.map(async (s) => Math.max(localGet(s.key), await sharedGet(env, base, s.key))));
  for (let i = 0; i < slots.length; i++) if (counts[i] >= slots[i].max) return slots[i].err;
  await Promise.all(slots.map(async (s, i) => { localBump(s.key, s.ttl); await sharedPut(env, base, s.key, counts[i] + 1, s.ttl); }));
  return null;
}

// --- who is asking ------------------------------------------------------------------------------------------------------
async function timed(url, init) {
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), AUTH_MS);
  try { return await fetch(url, { ...init, signal: ac.signal }); } finally { clearTimeout(t); }
}
/** { user } for a live Supabase access token, else { error }. The token is never logged or kept. */
export async function userOf(token) {
  let r;
  try { r = await timed(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_PUBLISHABLE_KEY, authorization: `Bearer ${token}`, accept: "application/json" } }); }
  catch { return { error: "auth_unavailable" }; }
  if (r.status === 401 || r.status === 403) return { error: "signed_out" };
  if (!r.ok) return { error: "auth_unavailable" };
  let u = null; try { u = await r.json(); } catch { u = null; }
  return u && typeof u.id === "string" && u.id ? { user: { id: u.id } } : { error: "signed_out" };
}
/** asks the database, as the person, whether they can change this practice's records: { ok } or { error } */
export async function writerOf(token, practiceId) {
  let r;
  try {
    r = await timed(`${SUPABASE_URL}/rest/v1/rpc/can_write`, { method: "POST", headers: { apikey: SUPABASE_PUBLISHABLE_KEY, authorization: `Bearer ${token}`, "content-type": "application/json", "content-profile": SCHEMA, accept: "application/json" }, body: JSON.stringify({ p_practice: practiceId }) });
  } catch { return { error: "auth_unavailable" }; }
  if (r.status === 401) return { error: "signed_out" };
  if (!r.ok) return { error: "auth_unavailable" };
  let v = null; try { v = await r.json(); } catch { v = null; }
  return { ok: v === true };
}

// --- the call -----------------------------------------------------------------------------------------------------------
/** the Messages API request for one task: JSON out in the task's schema */
export function anthropicRequest(env, input) {
  const ids = REQUIREMENTS.items.map((r) => r.id);
  const reqs = REQUIREMENTS.items.filter((r) => input.requirements.includes(r.id));
  const prompt = input.task === "ideas" ? buildIdeasPrompt({ ...input, requirements: reqs }) : buildDraftPrompt({ ...input, requirements: reqs });
  const schema = input.task === "ideas" ? IDEAS_SCHEMA : draftSchema(ids);
  return {
    url: "https://api.anthropic.com/v1/messages",
    headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: { model: modelOf(env), max_tokens: MAX_TOKENS[input.task], system: prompt.system, output_config: { effort: "medium", format: { type: "json_schema", schema } }, messages: [{ role: "user", content: prompt.user }] },
    schema, ids,
  };
}
/** the answer's JSON, schema-checked and cleaned: { answer } or { error } */
export function readAnswer(task, j, req, noticeText) {
  if (j?.stop_reason === "refusal") return { error: "declined" };
  if (j?.stop_reason === "max_tokens") return { error: "too_long" };
  const text = (Array.isArray(j?.content) ? j.content : []).filter((b) => b?.type === "text").map((b) => b.text).join("");
  let v; try { v = JSON.parse(text); } catch { return { error: "model_error" }; }
  const bad = validate(v, req.schema);
  if (bad) { console.warn("pursuit: answer did not fit the schema", bad.slice(0, 200)); return { error: "model_error" }; }
  if (task === "ideas") {
    const answer = cleanIdeas(v, noticeText);
    return answer.ideas.length >= IDEAS_MIN ? { answer } : { error: "thin" };
  }
  return { answer: cleanDraft(v, req.ids) };
}
/** whole days from today to the closing day (negative once it has passed), or null */
export function closesIn(day, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day || "")) return null;
  const [y, m, d] = day.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) / 864e5);
}

// --- answers ------------------------------------------------------------------------------------------------------------
export const MESSAGES = {
  not_configured: "Ideas and drafts are not switched on here: this copy of the lab has no Anthropic key. Nothing was sent.",
  origin: "Ideas and drafts can only be asked for from the assembl lab pages.",
  method: "Send the request with POST.",
  too_large: "That is too much to send (64 KB at most). Shorten the notice text and try again.",
  bad_json: "The request could not be read. Reload the page and try again.",
  bad_task: "Ask for ideas or for a draft.",
  no_practice: "Sign in and choose your practice first.",
  no_notice: "The enquiry needs a title before anything can be asked.",
  notice_too_long: `Keep the notice text to ${NOTICE_MAX.toLocaleString("en-NZ")} characters or fewer.`,
  no_token: "Sign in with your practice to ask. Nothing was sent.",
  signed_out: "Your sign-in has expired. Sign in again. Nothing was sent.",
  not_writer: "Only people who can change this practice's records can ask. Viewers can read what others have asked for. Nothing was sent.",
  auth_unavailable: "The sign-in could not be checked just now. Try again in a minute. Nothing was sent.",
  confirm_spend: "Each press is paid for. Check the price shown beside the button, then press it again.",
  slow_down: "That is a lot of asks in one minute. Wait a minute and try again.",
  daily_cap: "The lab has answered all it answers in a day. Try again tomorrow.",
  declined: "Claude would not answer this one. Nothing is shown rather than a guess.",
  too_long: "The answer ran out of room. Try again, or shorten the notice text.",
  thin: "The answer had fewer than four ideas. Nothing is shown rather than a thin answer. Try again.",
  busy: "Anthropic is busy right now. Wait a moment and try again.",
  timeout: "Claude took too long. Try again in a minute.",
  model_error: "Claude's answer could not be read. Nothing is shown rather than a guess.",
};
const STATUS = { not_configured: 503, origin: 403, method: 405, too_large: 413, no_token: 401, signed_out: 401, not_writer: 403, auth_unavailable: 503, confirm_spend: 402, slow_down: 429, daily_cap: 429, declined: 422, too_long: 502, thin: 502, busy: 503, timeout: 504, model_error: 502 };

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
const bearer = (request) => { const m = /^Bearer\s+([A-Za-z0-9._~+/-]{20,4096}=*)$/.exec(request.headers.get("authorization") || ""); return m ? m[1] : ""; };

export async function onRequest({ request, env }) {
  env = env || {};
  const H = cors(request);
  const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...H } });
  const estimates = { ideas: estimateOf(env, "ideas"), draft: estimateOf(env, "draft") };
  const fail = (code, extra) => json(STATUS[code] ?? 400, { error: code, message: MESSAGES[code], estimate: estimates, ...extra });
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: H });
  if (request.method === "GET") {
    return json(200, {
      type: "assembl.architecture.pursuit.status", configured: !!env.ANTHROPIC_API_KEY, host: "cloudflare", provider: "anthropic", model: modelOf(env),
      prompt_revision: PROMPT_REVISION, requirements_version: REQUIREMENTS.version, tasks: ["ideas", "draft"],
      limits: { ...limitsOf(env), max_body_bytes: MAX_BODY, notice_chars: NOTICE_MAX, counted_in: counterKind(env) },
      estimate: estimates, price: PRICE, needs_confirm: true, needs_sign_in: "a member of the practice who can change its records", stores: false,
    });
  }
  if (request.method !== "POST") return fail("method");
  if (!allowedOrigin(request.headers.get("origin"))) return fail("origin");
  if (!env.ANTHROPIC_API_KEY) return fail("not_configured");
  const raw = await readCapped(request, MAX_BODY);
  if (raw.tooLarge) return fail("too_large");
  let body; try { body = JSON.parse(raw.text); } catch { return fail("bad_json"); }
  const input = cleanInput(body, { knownRequirements: REQUIREMENTS.items.map((r) => r.id) });
  if (input.error) return fail(input.error);
  const token = bearer(request);
  if (!token) return fail("no_token");
  if (body.confirm !== true) return fail("confirm_spend");

  const who = await userOf(token);
  if (who.error) return fail(who.error);
  const can = await writerOf(token, input.practice_id);
  if (can.error) return fail(can.error);
  if (!can.ok) return fail("not_writer");

  const hit = await takeSlot(env, request.url, request.headers.get("cf-connecting-ip") || "");
  if (hit) return fail(hit, hit === "slow_down" ? { retry_after: 60 } : {});

  const req = anthropicRequest(env, input);
  const t0 = Date.now(), ac = new AbortController(), timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(req.url, { method: "POST", headers: req.headers, body: JSON.stringify(req.body), signal: ac.signal });
    let j = null; try { j = await r.json(); } catch { j = null; }
    if (!r.ok) {
      console.warn("pursuit: model error", r.status, String(j?.error?.type ?? "").slice(0, 60));
      return fail(r.status === 429 || r.status === 529 || r.status === 503 ? "busy" : "model_error");
    }
    const a = readAnswer(input.task, j, req, input.notice.text);
    if (a.error) return fail(a.error);
    const usage = j?.usage ? { input_tokens: int(j.usage.input_tokens, 0), output_tokens: int(j.usage.output_tokens, 0) } : null;
    const model = (typeof j?.model === "string" && j.model) || req.body.model;
    return json(200, {
      type: "assembl.architecture.pursuit", task: input.task, model, prompt_revision: PROMPT_REVISION, requirements_version: REQUIREMENTS.version,
      usage, cost_usd: costOf(req.body.model, usage), took_ms: Date.now() - t0, closes_in_days: closesIn(input.notice.closes), stored: false,
      label: "Draft written by Claude for the practice to check, edit and approve. Not submitted.", answer: a.answer,
    });
  } catch (e) {
    const timeout = e?.name === "AbortError";
    console.warn("pursuit: call failed", timeout ? "timeout" : String(e?.message || e).slice(0, 200));
    return fail(timeout ? "timeout" : "model_error");
  } finally { clearTimeout(timer); }
}
