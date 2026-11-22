// assembl.co.nz · the guide: a short spoken tour of the page, and a live agent (Claude, through the assembl lab) that
// answers questions and moves the page for you by scrolling to a section.
// 22 Nov 2026: the same script, API and panel as before, with the tour, the set answers and the section map rewritten
// for the agency home ("Marketing for the agentic era."). This page has no picture to turn over, so turn_picture
// scrolls to the work and says so.
// The agent and the voice run on lab.assembl.co.nz; this page sends only the conversation. Nothing is sent, booked or
// published. If the agent can't be reached, the guide says so and gives set answers instead.
const API = "https://lab.assembl.co.nz";
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const small = () => innerWidth <= 600;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const panel = $("#ask"), fab = $("#ask-fab"), log = $("#ask-log"), input = $("#ask-in"), status = $("#ask-status"), voiceBtn = $("#ask-voice"), voiceL = $("#ask-voice-l");
let live = null, eleven = false, voiceOn = true, busy = false, history = [];

// ------------------------------------------------------------------------------------------- open, close, the button
const showFab = () => fab.classList.toggle("show", scrollY > innerHeight * 0.6 || !panel.hidden);
addEventListener("scroll", showFab, { passive: true }); showFab();
function open(opts = {}) {
  panel.hidden = false; fab.setAttribute("aria-expanded", "true"); if (live === null || !eleven) check();
  if (!log.children.length && !opts.quiet) say("Kia ora. I can take you round the page in under a minute, or answer questions about what assembl does. What would you like?", { speak: false });
  if (!small() && !opts.quiet) input.focus({ preventScroll: true });
}
function close() { stopTour(); stopVoice(); panel.hidden = true; fab.setAttribute("aria-expanded", "false"); showFab(); }
fab.addEventListener("click", () => (panel.hidden ? open() : close()));
$("#ask-close").addEventListener("click", close);
addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) close(); });

// ------------------------------------------------------------------------------------------- status, by name only
async function check() {
  try { const r = await fetch(`${API}/api/home-agent`); const j = await r.json(); live = !!j.configured; } catch { live = false; }
  try { const r = await fetch(`${API}/api/home-voice`); const j = await r.json(); eleven = !!j.configured; } catch { eleven = false; }
  label();
}
function label() {
  status.textContent = live ? "Live · Claude · moves this page only" : live === false ? "Offline here · set answers, not a live agent" : "Checking the connection…";
  voiceL.textContent = !voiceOn ? "Replies are text only" : eleven ? "New Zealand voice by ElevenLabs" : browserVoice() ? "Your browser's voice" : "No voice in this browser";
}
voiceBtn.addEventListener("click", () => { voiceOn = !voiceOn; voiceBtn.setAttribute("aria-pressed", String(voiceOn)); voiceBtn.textContent = voiceOn ? "Voice on" : "Voice off"; if (!voiceOn) stopVoice(); label(); });
check();

// ------------------------------------------------------------------------------------------- voice out
// one audio element, unlocked by a tap: phones only play sound that starts inside a tap, and the voice arrives a moment later
const player = new Audio(); player.preload = "auto"; let audioUrl = "", unlocked = false;
const SILENT = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";
function unlock() {
  if (unlocked) return; unlocked = true;
  try { player.src = SILENT; const p = player.play(); if (p?.then) p.then(() => player.pause()).catch(() => { unlocked = false; }); } catch { unlocked = false; }
  if ("speechSynthesis" in window) { try { speechSynthesis.speak(new SpeechSynthesisUtterance("")); } catch {} }
}
for (const t of [panel, fab, ...$$("[data-tour]")]) { t.addEventListener("pointerdown", unlock, true); t.addEventListener("keydown", unlock, true); }
function browserVoice() {
  const vs = window.speechSynthesis?.getVoices?.() || [];
  return vs.find((v) => /en[-_]NZ/i.test(v.lang)) || vs.find((v) => /en[-_]AU/i.test(v.lang)) || vs.find((v) => /en[-_]GB/i.test(v.lang)) || vs.find((v) => /^en/i.test(v.lang)) || null;
}
window.speechSynthesis?.addEventListener?.("voiceschanged", label);
function stopVoice() { player.onended = null; player.pause(); if (audioUrl) { URL.revokeObjectURL(audioUrl); audioUrl = ""; } window.speechSynthesis?.cancel(); }
// speak a line; resolves when it has finished (or after a sensible time if there's no voice)
function speak(text, still = () => true) {
  return new Promise((resolve) => {
    let over = false; const done = () => { if (!over) { over = true; resolve(); } };
    const clean = String(text).replace(/[*_#`>]/g, "").replace(/\s+/g, " ").trim().slice(0, 680);
    const quiet = () => setTimeout(done, Math.max(2400, clean.length * 60));
    if (!voiceOn) return quiet();
    (async () => {
      if (eleven) {
        try {
          const r = await fetch(`${API}/api/home-voice`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: clean }) });
          if (r.ok) {
            const blob = await r.blob(); if (!still()) return done();
            stopVoice(); audioUrl = URL.createObjectURL(blob); player.src = audioUrl; player.onended = () => { player.onended = null; done(); };
            await player.play(); setTimeout(done, clean.length * 120 + 6000); return;
          }
          if (r.status === 503) { eleven = false; label(); }
        } catch { /* the browser's voice instead */ }
      }
      const v = browserVoice();
      if (v) { const u = new SpeechSynthesisUtterance(clean); u.voice = v; u.lang = v.lang; u.onend = done; u.onerror = done; speechSynthesis.cancel(); speechSynthesis.speak(u); setTimeout(done, clean.length * 95 + 5000); return; }
      quiet();
    })().catch(quiet);
  });
}

// ------------------------------------------------------------------------------------------- the conversation
function say(text, { speak: talk = true, note = false } = {}) {
  const el = document.createElement("div"); el.className = note ? "msg note" : "msg it"; el.textContent = text;
  log.append(el); log.scrollTop = Math.max(0, el.offsetTop - 10);
  if (talk && !note) speak(text);
  return el;
}
function you(text) { const el = document.createElement("div"); el.className = "msg you"; el.textContent = text; log.append(el); log.scrollTop = log.scrollHeight; }
function step(text) {
  const el = document.createElement("div"); el.className = "gstep run"; el.innerHTML = `<i aria-hidden="true"></i><span>${esc(text)}</span>`;
  el.done = (t) => { el.className = "gstep done"; if (t) el.querySelector("span").textContent = t; };
  log.append(el); log.scrollTop = log.scrollHeight; return el;
}

// what the agent (or the set answers) can do on the page
const SECTIONS = { top: "#top", what: "#what", work: "#work", homes: "#work", how: "#how", who: "#who", start: "#start" };
const NAMES = { top: "the top", what: "what we do", work: "the work", homes: "the work", how: "how we work", who: "who it is for", start: "how to start" };
async function goTo(section) {
  const el = $(SECTIONS[section] || "#top"); if (!el) return "That section isn't on the page.";
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  await wait(reduce ? 150 : 950); return `Scrolled to ${NAMES[section] || section}.`;
}
async function turn(section) {
  // the agent may still ask to turn a picture over; this page has none, so it shows the work and says so plainly
  await goTo(SECTIONS[section] ? section : "work");
  return "Scrolled to the work. This page has no picture to turn over; the links there open the real pieces.";
}
async function runTool(name, input = {}) {
  if (name === "go_to") return goTo(input.section);
  if (name === "turn_picture") return turn(input.section);
  return "That isn't something this page can do.";
}

const TRY = ["What do you do?", "Show me the work", "Can you get us found by assistants?", "How do we start?"];
$("#ask-try").innerHTML = `<button type="button" class="tour-chip" data-tour>Take the tour, with voice</button>` + TRY.map((t) => `<button type="button">${esc(t)}</button>`).join("");
$("#ask-try").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b || busy) return; if (b.hasAttribute("data-tour")) tour(); else send(b.textContent); });
$("#ask-form").addEventListener("submit", (e) => { e.preventDefault(); const t = input.value.trim(); if (t && !busy) send(t); });

function trimmed() {
  let h = history.slice(-24);
  while (h.length && !(h[0].role === "user" && h[0].content.some((b) => b.type === "text"))) h = h.slice(1);
  return h;
}
async function send(text) {
  stopTour(); stopVoice(); busy = true; input.value = ""; panel.classList.add("asked"); you(text);
  const mark = history.length; history.push({ role: "user", content: [{ type: "text", text }] });
  const w = step(live === false ? "Finding a set answer" : "Thinking");
  try {
    if (live === false) throw new Error("offline");
    for (let turnNo = 0; turnNo < 5; turnNo++) {
      const r = await fetch(`${API}/api/home-agent`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: trimmed() }) });
      if (!r.ok) throw new Error(String(r.status));
      const j = await r.json(), content = (j.content || []).filter((b) => ["text", "tool_use", "thinking", "redacted_thinking"].includes(b.type));
      if (!content.length) throw new Error("empty");
      history.push({ role: "assistant", content });
      const uses = content.filter((b) => b.type === "tool_use"), words = content.filter((b) => b.type === "text").map((b) => b.text).join(" ").trim();
      if (!uses.length) { w.remove(); say(words || "Sorry, I lost my words there. Could you ask that again?"); break; }
      const results = [];
      for (const u of uses) { const s = step("Moving the page"); results.push({ type: "tool_result", tool_use_id: u.id, content: await runTool(u.name, u.input) }); s.done(); }
      history.push({ role: "user", content: results });
    }
  } catch {
    history.length = mark; w.remove();
    if (live !== false) { live = false; label(); }
    await scripted(text);
  }
  busy = false;
}

// set answers, used only when the live agent can't be reached (labelled as such in the header)
async function scripted(text) {
  const t = text.toLowerCase();
  if (/price|cost|how much|budget|quote/.test(t)) return say("It depends on the work. After a short conversation we send a written proposal with the scope, price and timing. The button at the end of the page opens an email to us.");
  if (/chatgpt|claude|assistant|google|found|seo|search|rank/.test(t)) { await goTo("what"); return say("Getting found is the first of the three things we do: by assistants and by search, when people ask for what you do. No one can promise a ranking, but we can make your business easy to find and easy to quote."); }
  if (/3d|render|house|model|plan|drawing|architect|twin|work|show|demo|film|bird/.test(t)) { await goTo("work"); return say("Here's work you can open now: a house built from its plans, the birds of Aotearoa, and our fly-throughs."); }
  if (/approve|agent|human|person|how do you work|process/.test(t)) { await goTo("how"); return say("Agents prepare, and a person approves every step. Nothing goes out without a yes."); }
  if (/contact|email|talk|start|hire|work with/.test(t)) { await goTo("start"); return say("Start here: the Start a conversation button opens an email to us. Send a line about your business and what you'd like to do."); }
  if (/who|kate|about|where|based/.test(t)) return say("assembl is a full-service marketing and advertising agency in Tāmaki Makaurau Auckland, founded by Kate Hudson. Marketing for the agentic era, for every kind of New Zealand business.");
  if (/what|do you|services|help/.test(t)) { await goTo("what"); return say("Three things. We help you get found, by assistants and by search. We create campaigns. And we show what's possible, with working demos, films and 3D twins."); }
  return say("I can't reach the live guide just now, so these are set answers. Try the tour, or ask about getting found, campaigns, our work or how to start.");
}

// ------------------------------------------------------------------------------------------- the tour
const TOUR = [
  { to: "top", line: "Kia ora, welcome to assembl. We're a full-service marketing and advertising agency in Tāmaki Makaurau Auckland: marketing for the agentic era. I'll walk you through in under a minute." },
  { to: "what", line: "Here's what we do. We help you get found, by assistants and by search. We create campaigns. And we show what's possible, with working demos, films and 3D twins." },
  { to: "work", line: "This is work you can open now: a house built from its plans, the birds of Aotearoa, and our fly-throughs." },
  { to: "how", line: "How we work. Agents prepare, and a person approves every step. Nothing goes out without a yes." },
  { to: "who", line: "It's for every kind of New Zealand business, from small local teams to larger brands." },
  { to: "start", line: "That's the page. Ask me anything, or tap Start a conversation to email us." },
];
let tourId = 0, touring = false;
const pin = () => { if (small()) panel.classList.add("low"); };
async function tour() {
  if (touring) return; touring = true; const id = ++tourId; unlock(); stopVoice();
  open({ quiet: true }); panel.classList.add("asked", "touring"); pin();
  const still = () => id === tourId;
  for (const s of TOUR) {
    if (!still()) break;
    say(s.line, { speak: false });
    const moved = goTo(s.to);
    await Promise.all([speak(s.line, still), moved]);
    if (!still()) break; await wait(500);
  }
  if (still()) { touring = false; panel.classList.remove("touring", "low"); if (!small()) input.focus({ preventScroll: true }); }
}
function stopTour() { if (!touring) return; touring = false; tourId++; stopVoice(); panel.classList.remove("touring", "low"); }
$("#ask-stop").addEventListener("click", stopTour);
$$("[data-tour]").forEach((b) => { if (!b.closest("#ask-try")) b.addEventListener("click", tour); });
