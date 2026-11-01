// assembl lab · Allen, the study tutor. A multi-turn agent for the study machines.
// It sees the machine the student is on (step, readouts, controls, challenges) and can act on it through
// client-side tools: the browser runs set_control / go_to_step / press_button / suggest_machine and sends the
// result back, so every change happens on the student's screen where they can see it. Students can paste a
// past exam question (text or a photo) and work through it.
// Needs ANTHROPIC_API_KEY. Optional shared caps: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN.
// TUTOR_MODEL (default claude-sonnet-5-5), TUTOR_DAILY_CAP (whole site, default 3000 turns/day),
// TUTOR_PER_VISITOR (default 40 student turns/day; tool round trips are not counted).
const MODEL = process.env.TUTOR_MODEL || "claude-sonnet-5-5";
const caps = () => ({daily: +(process.env.TUTOR_DAILY_CAP || 3000), visitor: +(process.env.TUTOR_PER_VISITOR || 40)});
const MAX_MESSAGES = 30, MAX_IMAGE_BYTES = 1_600_000, MAX_IMAGES = 2, MAX_CONTEXT = 12_000, MAX_TEXT = 6_000;

export const TOOLS = [
  { name: "set_control", description: "Move one of the machine's controls so the student can see the effect. Use the control ids and ranges from the machine context. Returns the new readouts. Always tell the student what you changed and why.",
    input_schema: { type: "object", properties: { id: { type: "string", description: "Control id from the machine context" }, value: { description: "New value: a number for a range, an option value for a select, true/false for a toggle" } }, required: ["id", "value"] } },
  { name: "go_to_step", description: "Switch the machine to one of its steps (topics), by step key from the machine context.",
    input_schema: { type: "object", properties: { step: { type: "string" } }, required: ["step"] } },
  { name: "press_button", description: "Press one of the machine's buttons (for example Play 100 or Reset) by control id. Returns the new readouts.",
    input_schema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
  { name: "suggest_machine", description: "Offer the student a link to another study machine that fits their question, by machine id from the catalogue.",
    input_schema: { type: "object", properties: { id: { type: "string" }, why: { type: "string", description: "One short sentence" } }, required: ["id", "why"] } },
];

export const SYSTEM = `You are Allen, the study buddy on "assembly", the interactive study machines made by assembl in Aotearoa New Zealand. You are a long-haired dachshund named after the Allen key every kitset needs, but you talk like a calm, sharp tutor; at most one light dog touch in a conversation.
Students are Years 7–13 (NCEA Levels 1–3). Write in plain New Zealand English with correct macrons. Be warm, direct and brief: usually under 150 words; up to 350 when working through a full exam question.

How you help
- Teach, don't just tell. Find out what they think, then give the smallest useful next hint. Show worked reasoning step by step when they are stuck or ask for it.
- Use the machine. When a control would show the idea, move it with set_control (or switch step, or press a button), then say exactly what you changed and what to look at. Never change things silently. One or two changes per turn.
- "Test yourself" challenges are for the student: give hints, but only set the answer yourself if they have tried and ask to see it.
- If another machine fits better, use suggest_machine.

Past exam questions
When a student pastes or photographs an exam question:
1. Say what it is asking, and the topic or standard if it is clear from the question (never guess a standard number).
2. Break it into its parts.
3. For each part, connect it to this machine and demonstrate with a control where one fits.
4. Ask the student to try an answer before you give one. When they answer, give feedback in the language of Achieved, Merit and Excellence (identify or describe; explain how or why; discuss or justify with linked ideas), and say this is guidance, not official NZQA marking.
5. Give a model answer if they ask or after they have tried, keeping each step of reasoning visible.
If you can't read a photo clearly, say so and ask them to type the hard part.

Honesty and safety
- Say what the machine simplifies when it matters (the machine's "truth" line says how). Never invent NZQA rules, marking schedules, past paper content, dates or statistics. Say when you are not sure.
- Stay on study. Politely decline anything unsafe or unrelated. Never ask for personal information; if someone shares it, don't repeat it.
- If a student seems distressed, be kind and point them to a trusted adult or Need to Talk: free call or text 1737.

Formatting: short paragraphs, numbered steps for working, **bold** only for the key idea. Write maths in plain text (×, ÷, ², √, fractions like 3/4); no LaTeX.`;

async function redis(cmd) {
  const clean = v => (v || "").trim().replace(/^["']|["']$/g, "").replace(/\\n$/, "").trim();
  const u = clean(process.env.UPSTASH_REDIS_REST_URL), t = clean(process.env.UPSTASH_REDIS_REST_TOKEN);
  if (!/^https:\/\//.test(u) || !t) return null;
  try { const r = await fetch(u, { method: "POST", headers: { authorization: `Bearer ${t}`, "content-type": "application/json" }, body: JSON.stringify(cmd) }); return r.ok ? (await r.json()).result : null; } catch { return null; }
}
const mem = new Map();
async function count(key, ttl) {
  const v = await redis(["INCR", key]); if (v !== null) { if (v === 1) await redis(["EXPIRE", key, ttl]); return v; }
  const n = (mem.get(key) || 0) + 1; mem.set(key, n); return n;
}

// Only well-formed text, image, tool_use and tool_result blocks get through, within size limits.
export function cleanMessages(input) {
  if (!Array.isArray(input) || !input.length) return null;
  const msgs = input.slice(-MAX_MESSAGES); let images = 0;
  const out = [];
  for (const m of msgs) {
    if (!m || (m.role !== "user" && m.role !== "assistant")) return null;
    const blocks = typeof m.content === "string" ? [{ type: "text", text: m.content }] : Array.isArray(m.content) ? m.content : null;
    if (!blocks) return null;
    const clean = [];
    for (const b of blocks) {
      if (b?.type === "text" && typeof b.text === "string") { const text = b.text.slice(0, MAX_TEXT); if (text.trim()) clean.push({ type: "text", text }); }
      else if (b?.type === "image" && m.role === "user" && b.source?.type === "base64" && /^image\/(png|jpeg|webp|gif)$/.test(b.source.media_type) && typeof b.source.data === "string") {
        if (++images > MAX_IMAGES || b.source.data.length * .75 > MAX_IMAGE_BYTES) return null;
        clean.push({ type: "image", source: { type: "base64", media_type: b.source.media_type, data: b.source.data } });
      }
      else if (b?.type === "tool_use" && m.role === "assistant" && TOOLS.some(t => t.name === b.name) && typeof b.id === "string") clean.push({ type: "tool_use", id: b.id, name: b.name, input: b.input && typeof b.input === "object" ? b.input : {} });
      else if (b?.type === "tool_result" && m.role === "user" && typeof b.tool_use_id === "string") clean.push({ type: "tool_result", tool_use_id: b.tool_use_id, content: String(typeof b.content === "string" ? b.content : JSON.stringify(b.content ?? "")).slice(0, 4000), ...(b.is_error ? { is_error: true } : {}) });
    }
    if (clean.length) out.push({ role: m.role, content: clean });
  }
  // The conversation must start with the student and alternate.
  while (out.length && out[0].role !== "user") out.shift();
  for (let i = 1; i < out.length; i++) if (out[i].role === out[i - 1].role) return null;
  return out.length && out[out.length - 1].role === "user" ? out : null;
}
const isToolReturn = m => m.content.every(b => b.type === "tool_result");

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(501).json({ error: "not_configured" });
  const body = req.body || {}, messages = cleanMessages(body.messages);
  if (!messages) return res.status(400).json({ error: "bad_request" });
  const context = JSON.stringify(body.context || {}).slice(0, MAX_CONTEXT);
  const last = messages[messages.length - 1];
  if (!isToolReturn(last)) { // a new student turn: count it
    const day = new Date().toISOString().slice(0, 10), ip = (req.headers["x-forwarded-for"] || "").toString().split(",")[0].trim() || "anon";
    const cap = caps();
    if (await count(`tutor:all:${day}`, 90000) > cap.daily) return res.status(429).json({ error: "daily_cap" });
    const used = await count(`tutor:ip:${ip}:${day}`, 90000);
    if (used > cap.visitor) return res.status(429).json({ error: "visitor_cap" });
    res.setHeader("x-tutor-left", String(Math.max(0, cap.visitor - used)));
  }
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: 1200, tools: TOOLS,
        system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }, { type: "text", text: `The student is on this page right now (live machine state, JSON):\n${context}` }],
        messages }) });
    if (!r.ok) { console.warn("tutor: model error", r.status, (await r.text()).slice(0, 300)); return res.status(502).json({ error: "model_error" }); }
    const j = await r.json();
    const content = (j.content || []).filter(b => b.type === "text" || b.type === "tool_use").map(b => b.type === "text" ? { type: "text", text: b.text } : { type: "tool_use", id: b.id, name: b.name, input: b.input });
    return res.status(200).json({ type: "assembl.tutor", content, stop_reason: j.stop_reason });
  } catch (e) { console.warn("tutor: failed", e?.message); return res.status(502).json({ error: "tutor_failed" }); }
}
