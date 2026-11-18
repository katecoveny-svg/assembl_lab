// assembl lab · the guide on assembl.co.nz: a live agent on Claude Fable 5.2 that answers questions about assembl and
// moves the home page for the reader (scrolls to a section, turns a picture over to the real thing). The home page is a
// separate static site, so this endpoint answers only the assembl.co.nz origins (CORS). Replies are short because they
// are read aloud. Nothing is sent, booked or published. Conversations are not stored.
// Cloudflare Pages Function. Uses the ANTHROPIC_API_KEY secret. Optional: HOME_AGENT_MODEL (default claude-fable-5-2),
// HOME_AGENT_FALLBACK (default claude-opus-5-5), HOME_AGENT_DAILY_CAP (per running instance, default 400 a day).
const MAX_BODY = 80_000, MAX_MESSAGES = 30;
const ALLOW = new Set(["assembl.co.nz", "www.assembl.co.nz", "assembl-home.pages.dev"]);
let day = "", used = 0;
function cors(request) {
  const o = request.headers.get("origin"); let host = ""; try { host = new URL(o).host; } catch {}
  return ALLOW.has(host) ? { "access-control-allow-origin": o, "access-control-allow-methods": "GET, POST, OPTIONS", "access-control-allow-headers": "content-type", "access-control-max-age": "86400", vary: "origin" } : {};
}
const json = (request, status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...cors(request) } });

export const TOOLS = [
  { name: "go_to", description: "Scroll the home page to a section: top (the landing screen), what (what assembl does), work (a section drawing that turns over to a picture of a house), homes (two homes, rendered), start (how to start a project).",
    input_schema: { type: "object", properties: { section: { type: "string", enum: ["top", "what", "work", "homes", "start"] } }, required: ["section"] } },
  { name: "turn_picture", description: "On the work or homes section, turn the whole picture over, square by square: on the work section, from the line drawing to the picture of a house underneath; on homes, from three shades to full colour. Scrolls there first.",
    input_schema: { type: "object", properties: { section: { type: "string", enum: ["work", "homes"] }, show_real: { type: "boolean", description: "true shows the picture underneath or full colour; false turns it back" } }, required: ["section", "show_real"] } },
];
const TOOL_NAMES = new Set(TOOLS.map((t) => t.name));

export const SYSTEM = `You are the guide on assembl.co.nz, the website of assembl, a New Zealand agency in Tāmaki Makaurau Auckland founded by Kate Hudson. The site's own words: "Marketing for the AI age. A full-service New Zealand agency." Your replies are read aloud in a New Zealand voice.

How to answer
- Spoken and short: one to three sentences of plain New Zealand English, with macrons where they belong. No markdown, lists or emoji.
- Do the thing. When someone wants to see something, use a tool to show it, then say a sentence about it. Never say tool names aloud.
- Be warm and direct. Invite a conversation with Kate when it fits, using the "Start a conversation" button at the end of the page.

What assembl does, as the site says it
- Brand and websites: strategy, identity and websites built around your business.
- Get found: in ChatGPT and Google, when people look nearby. No one can promise a ranking.
- Campaigns: ads, social, film and voice that sound like here.
- 3D and renders: places seen before they're built.
- Sectors on the site: property, hospitality, retail, schools and automotive.

What is on the page
- The landing screen: a picture of a house in the bush in three shades; pointing at it turns squares over to full colour.
- What we do: the four services above, over a line drawing of a gabled pavilion.
- Work: "From a 2D plan to a model you can explore." A section drawing of a house; turning it over shows a picture of a house in the bush underneath, in colour. Never say the drawing and the picture are the same building.
- Two homes, rendered: a render, not a photograph.
- Start: "Your next project. Start here." and a Start a conversation button that opens an email.

Never invent clients, results, prices, timelines, awards or partnerships. If asked about price or timing, say it depends on the project and suggest a conversation. If you don't know, say so.`;

function clean(messages) {
  if (!Array.isArray(messages) || !messages.length || messages.length > MAX_MESSAGES) return null;
  const out = [];
  for (const m of messages) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || !Array.isArray(m.content)) return null;
    const keep = [];
    for (const b of m.content) {
      if (b?.type === "text" && typeof b.text === "string" && b.text.trim()) keep.push({ type: "text", text: m.role === "user" ? b.text.slice(0, 800) : b.text });
      else if (m.role === "user" && b?.type === "tool_result" && typeof b.tool_use_id === "string") keep.push({ type: "tool_result", tool_use_id: b.tool_use_id, content: String(b.content ?? "").slice(0, 2000) });
      else if (m.role === "assistant" && b?.type === "tool_use" && TOOL_NAMES.has(b.name) && typeof b.id === "string") keep.push({ type: "tool_use", id: b.id, name: b.name, input: b.input && typeof b.input === "object" ? b.input : {} });
      else if (m.role === "assistant" && b?.type === "thinking" && typeof b.signature === "string") keep.push({ type: "thinking", thinking: String(b.thinking ?? ""), signature: b.signature });
      else if (m.role === "assistant" && b?.type === "redacted_thinking" && typeof b.data === "string") keep.push({ type: "redacted_thinking", data: b.data });
    }
    if (!keep.length) return null;
    out.push({ role: m.role, content: keep });
  }
  return out[0].role === "user" ? out : null;
}

const ask = (env, model, messages) => fetch("https://api.anthropic.com/v1/messages", {
  method: "POST", headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
  body: JSON.stringify({ model, max_tokens: 1500, tools: TOOLS, output_config: { effort: "low" }, system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }], messages }),
});

export async function onRequest({ request, env }) {
  const MODEL = env.HOME_AGENT_MODEL || "claude-fable-5-2", FALLBACK = env.HOME_AGENT_FALLBACK || "claude-opus-5-5";
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(request) });
  if (request.method === "GET") return json(request, 200, { type: "assembl.home.agent.status", configured: !!env.ANTHROPIC_API_KEY, model: MODEL });
  if (request.method !== "POST") return json(request, 405, { error: "method" });
  const o = request.headers.get("origin"); let host = ""; try { host = new URL(o).host; } catch {}
  if (o && !ALLOW.has(host) && host !== new URL(request.url).host) return json(request, 403, { error: "origin" });
  if (!env.ANTHROPIC_API_KEY) return json(request, 503, { error: "not_configured" });
  const today = new Date().toISOString().slice(0, 10); if (today !== day) { day = today; used = 0; }
  if (used >= +(env.HOME_AGENT_DAILY_CAP || 400)) return json(request, 429, { error: "daily_cap" });
  const raw = await request.text(); if (raw.length > MAX_BODY) return json(request, 413, { error: "conversation_too_long" });
  let body; try { body = JSON.parse(raw); } catch { return json(request, 400, { error: "bad_json" }); }
  const messages = clean(body?.messages); if (!messages) return json(request, 400, { error: "bad_messages" });
  used++;
  try {
    let model = MODEL, r = await ask(env, model, messages);
    if (!r.ok && (r.status === 404 || r.status === 400)) { const t = await r.text(); if (/model/i.test(t)) { model = FALLBACK; r = await ask(env, model, messages); } else return json(request, 502, { error: "model_error" }); }
    if (!r.ok) return json(request, r.status === 429 ? 429 : 502, { error: r.status === 429 ? "busy" : "model_error" });
    const j = await r.json();
    return json(request, 200, { type: "assembl.home.agent", model: j.model || model, stop_reason: j.stop_reason, content: j.content || [] });
  } catch (e) { console.warn("home-agent: failed", e?.message); return json(request, 502, { error: "upstream" }); }
}
