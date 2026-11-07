// assembl lab · read a power bill or a fridge photo once, return typed numbers, keep nothing.
// Needs ANTHROPIC_API_KEY set in the Vercel project (never in code). Without it, returns 501 and pages fall back to manual entry.
// Spend caps, the same pattern as ask.js and tutor.js: READ_DAILY_CAP (whole site, default 200 reads/day) and READ_PER_VISITOR
// (default 10 reads/day/visitor), shared across instances when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set,
// per instance otherwise. The per-instance burst limit below still applies on top.
import fs from "node:fs"; import path from "node:path";
const MODEL = process.env.READ_MODEL || "claude-sonnet-5-5";
const MAX_BYTES = 6 * 1024 * 1024;
const MAX_DATA_URL = Math.ceil(MAX_BYTES / 3) * 4 + 64; // base64 of MAX_BYTES plus the "data:image/...;base64," prefix
const DAILY_CAP = +(process.env.READ_DAILY_CAP || 200), PER_VISITOR = +(process.env.READ_PER_VISITOR || 10);
const hits = new Map(); // best-effort per-instance rate limit
function limited(ip) { const now = Date.now(), w = 10 * 60e3; const a = (hits.get(ip) || []).filter(t => now - t < w); a.push(now); hits.set(ip, a); return a.length > 12; }
async function redis(cmd) {
  const clean = v => (v || "").trim().replace(/^["']|["']$/g, "").replace(/\\n$/, "").trim();
  const u = clean(process.env.UPSTASH_REDIS_REST_URL), t = clean(process.env.UPSTASH_REDIS_REST_TOKEN);
  if (!/^https:\/\//.test(u) || !t) { console.warn("read: shared counter off, using per-instance limits"); return null; }
  try {
    const r = await fetch(u, { method: "POST", headers: { authorization: `Bearer ${t}`, "content-type": "application/json" }, body: JSON.stringify(cmd) });
    return r.ok ? (await r.json()).result : null;
  } catch { return null; }
}
const mem = new Map();
async function count(key, ttl) {
  const v = await redis(["INCR", key]); if (v !== null) { if (v === 1) await redis(["EXPIRE", key, ttl]); return v; }
  const n = (mem.get(key) || 0) + 1; mem.set(key, n); return n;
}
function contract(kind) {
  const f = path.join(process.cwd(), "contracts", kind === "bill" ? "bill.json" : "fridge.json");
  try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; }
}
const FALLBACK = {
  bill: { prompt: "This is a photo of a New Zealand household electricity bill. Extract ONLY usage and pricing numbers as JSON. Never include names, addresses, account numbers, ICP numbers, emails, phone numbers or payment details. Use null when a value is not shown.",
    schema: { retailer: "string|null", plan: "string|null", periodStart: "YYYY-MM-DD|null", periodEnd: "YYYY-MM-DD|null", days: "number|null", totalKWh: "number|null", dailyChargeDollars: "number|null", lowUser: "boolean|null", rates: [{ label: "string", centsPerKWh: "number", kWh: "number|null" }], totalDueInclGST: "number|null", solarExportKWh: "number|null", buybackCents: "number|null", confidence: "0-1" } },
  fridge: { prompt: "This is a photo of the inside of a fridge or pantry in New Zealand. List the food items you can see as JSON. Do not describe people or anything that is not food.",
    schema: { items: [{ name: "string", qty: "string", category: "fruit|veg|dairy|meat|seafood|bakery|pantry|frozen|drinks|other", useBy: "today|this week|fine", confidence: "0-1" }] } },
};
function scrub(o, bad) { if (Array.isArray(o)) return o.map(x => scrub(x, bad)); if (o && typeof o === "object") { const r = {}; for (const [k, v] of Object.entries(o)) if (!bad.has(k.toLowerCase())) r[k] = scrub(v, bad); return r; } return o; }
function keep(o, schema) { const props = schema && schema.properties; if (!props || !o || typeof o !== "object") return o; const r = {}; for (const k of Object.keys(props)) if (k in o) r[k] = o[k]; return r; }
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(501).json({ error: "not_configured" });
  const ip = (req.headers["x-forwarded-for"] || "").toString().split(",")[0].trim() || "anon";
  if (limited(ip)) return res.status(429).json({ error: "rate_limited" });
  const { kind, image } = req.body || {};
  if (!["bill", "fridge"].includes(kind) || typeof image !== "string") return res.status(400).json({ error: "bad_request" });
  if (image.length > MAX_DATA_URL) return res.status(413).json({ error: "too_large" });
  const m = image.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!m) return res.status(400).json({ error: "bad_image" });
  if (m[2].length * 0.75 > MAX_BYTES) return res.status(413).json({ error: "too_large" });
  const day = new Date().toISOString().slice(0, 10);
  if (await count(`read:all:${day}`, 90000) > DAILY_CAP) return res.status(429).json({ error: "daily_cap" });
  if (await count(`read:ip:${ip}:${day}`, 90000) > PER_VISITOR) return res.status(429).json({ error: "visitor_cap" });
  const c = contract(kind) || FALLBACK[kind];
  const schema = c.output_schema || c.schema;
  const text = `${c.prompt}\n\nReturn only JSON matching this schema:\n${JSON.stringify(schema)}`;
  try {
    const ac = new AbortController(); const timer = setTimeout(() => ac.abort(), 25000);
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", signal: ac.signal,
      headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: 1500, messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: m[1], data: m[2] } }, { type: "text", text } ] }] }),
    });
    clearTimeout(timer);
    if (!r.ok) return res.status(502).json({ error: "model_error", status: r.status });
    const j = await r.json();
    const out = (j.content || []).map(b => b.text || "").join("");
    const s = out.indexOf("{"), e = out.lastIndexOf("}");
    let data = JSON.parse(out.slice(s, e + 1));
    const bad = new Set((c.forbidden_keys || []).map(k => k.toLowerCase()));
    data = keep(scrub(data, bad), schema);
    return res.status(200).json(data);
  } catch (e) { return res.status(502).json({ error: "read_failed" }); }
}
