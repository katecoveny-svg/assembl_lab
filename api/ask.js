// assembl lab · "Ask about this": a short, capped explainer for each page.
// Needs ANTHROPIC_API_KEY. Optional hard caps across instances: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN.
// DAILY_CAP (whole site, default 300 questions/day) and PER_VISITOR (default 2 questions/day/page).
const MODEL = process.env.ASK_MODEL || "claude-haiku-5-5";
const DAILY_CAP = +(process.env.DAILY_CAP || 300), PER_VISITOR = +(process.env.PER_VISITOR || 2);
const PAGES = {
  home: "the Kiwi home energy twin: a simulated NZ house heating through a winter's night, with insulation, heat pump, hot water, solar and battery options and paybacks. Uses live Auckland weather and the wholesale power price where shown.",
  kitchen: "the kitchen machine: a food planner for NZ households (kids' weeks, trips away) priced with Stats NZ food price figures, producing a shopping list.",
  food: "Food Flow Aotearoa: where NZ household food goes, food waste costs, food rescue and hardship grants. Simulated with public figures.",
  everyday: "Every Day Counts: NZ school attendance, why kids miss school, and healthy sleep, screen time and movement guidelines.",
  ed: "the emergency department twin: a simulated NZ city ED minute by minute (triage, cubicles, patients waiting for a ward bed) and what-ifs. It is not medical advice; in an emergency call 111; Healthline is 0800 611 116.",
  office: "the Auckland office twin: a simulated 3-floor office's energy use with hybrid work, plus staff commuting fuel.",
  dairy: "the dairy plant twin: a generic, simulated NZ milk-powder plant through the season (evaporators, spray dryer, boilers, power price, farmgate link), not any real company.",
  study: "assembly study machines by assembl: interactive visual study tools for NZ secondary students (forces with downhill bikes, waves with vinyl, probability with a claw machine, density and light with fishing, AI, English, maps, economics, reading).",
  store: "the supermarket twin: a simulated suburban NZ supermarket through the day (checkout queues, markdowns, food rescue at close, chiller doors), not any real retailer.",
  cafe: "the café and restaurant twin: a fictional NZ café by day and restaurant by night (queues, espresso machine, kitchen pass, roster, food waste, weekly P&L) with proposed changes; figures are simulated except where labelled with Stats NZ or other sources.",
  tourism: "the Aotearoa tourism flow simulator: a 3D map of NZ visitor flows by region and month built on Stats NZ international travel and MBIE accommodation and spend data, with simulated what-ifs and frozen forecasts.",
  stay: "the accommodation twin: a fictional NZ boutique lodge, motel and holiday park simulated booking by booking (check-in queue, housekeeping, OTA commission, direct bookings) benchmarked against MBIE accommodation occupancy for the chosen region.",
  cars: "Agent-ready cars: how an AI assistant reads a used-car listing in New Zealand (the Consumer Information Notice as data, a car check, an MCP endpoint for ChatGPT and Claude, and a phone tool for 3D captures). The dealer, Harbour Lane Motors, is fictional and every car on it is Simulated; the check works on any car the buyer describes and stores nothing. Not legal or financial advice: point people to NZTA, the PPSR and Consumer Protection.",
  lab: "assembl lab: free public-good simulations by assembl, a NZ startup.",
};
const SYSTEM = page => `You are the explainer on an assembl lab page about ${PAGES[page] || PAGES.lab}
Answer the visitor's question in at most 120 words, in plain New Zealand English with correct macrons, warm and direct, for a curious member of the public or a secondary student.
Explain how the simulation works and what the ideas mean. Be honest: say what is simulated versus real, never invent statistics, and say you're not sure when you aren't. For homework, explain the idea and show a worked example rather than just giving an answer.
Stay on this page's topic; politely decline anything unrelated, unsafe or personal. Never ask for personal information. No medical, financial or legal advice beyond general information and pointing to the right NZ service.`;
async function redis(cmd) {
  const clean = v => (v || "").trim().replace(/^["']|["']$/g, "").replace(/\\n$/, "").trim();
  const u = clean(process.env.UPSTASH_REDIS_REST_URL), t = clean(process.env.UPSTASH_REDIS_REST_TOKEN);
  if (!/^https:\/\//.test(u) || !t) { console.warn("ask: shared counter off, using per-instance limits"); return null; }
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
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(501).json({ error: "not_configured" });
  const { page = "lab", question = "" } = req.body || {};
  const q = String(question).trim().slice(0, 300);
  if (q.length < 3 || !PAGES[page]) return res.status(400).json({ error: "bad_request" });
  const day = new Date().toISOString().slice(0, 10);
  const ip = (req.headers["x-forwarded-for"] || "").toString().split(",")[0].trim() || "anon";
  if (await count(`ask:all:${day}`, 90000) > DAILY_CAP) return res.status(429).json({ error: "daily_cap" });
  if (await count(`ask:ip:${ip}:${page}:${day}`, 90000) > PER_VISITOR) return res.status(429).json({ error: "visitor_cap" });
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: 350, system: SYSTEM(page), messages: [{ role: "user", content: q }] }) });
    if (!r.ok) return res.status(502).json({ error: "model_error" });
    const j = await r.json();
    return res.status(200).json({ type: "assembl.ask", answer: (j.content || []).map(b => b.text || "").join("").trim() });
  } catch { return res.status(502).json({ error: "ask_failed" }); }
}
