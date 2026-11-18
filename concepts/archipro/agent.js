// The studio guide: a live agent (Claude Fable 5.2 through /api/archipro-agent) that answers questions and drives this
// page with the same controls a person has: search the sample catalogue, specify, change the house, show and print the
// drawing set, show products on the 16A twin. Replies are spoken through /api/archipro-voice (ElevenLabs, a New Zealand
// voice) when that's configured, otherwise by the browser's own voice, and the label says which. Without the agent key
// the guide falls back to a few scripted replies and says so. It never sends, publishes or buys anything.
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const panel = $("#guide"), log = $("#guide-log"), form = $("#guide-form"), input = $("#guide-in"), fab = $("#guide-fab");
const status = $("#guide-status"), voiceBtn = $("#guide-voice"), voiceL = $("#guide-voice-l"), mic = $("#guide-mic");
const small = () => matchMedia("(max-width: 600px)").matches;

let live = null, route = "primary", modelName = "Claude Fable 5.2", busy = false, voiceOn = true, eleven = false;
const history = [];
const TRY = ["Fix the kitchen ventilation, then show me the schedule", "Make the living wing 11 metres and print the plans", "Which cladding suits a sea-spray site?",
  "Put black joinery and cedar on the real house at sunset", "Why Kate for AI Special Projects?", "What would you do in the first ninety days?"];

// ---------------------------------------------------------------------------------------------- open and close
panel.classList.add("phone");
// the floating guide waits until you're past the landing screen, so it never sits on top of it
const roomSec = document.getElementById("room-sec");
const showFab = () => { const r = roomSec?.getBoundingClientRect(), inRoom = r && r.top < innerHeight * 0.5 && r.bottom > innerHeight * 0.5; fab.classList.toggle("show", scrollY > innerHeight * 0.85 && !inRoom); };
addEventListener("scroll", showFab, { passive: true }); showFab();
// the phone's screen assembles from squares, in a broken diagonal, each time it opens
function assemble() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  panel.querySelector(".guide-sq")?.remove();
  const g = document.createElement("div"); g.className = "guide-sq"; g.setAttribute("aria-hidden", "true");
  const cols = 6, rows = Math.max(10, Math.round(cols * panel.clientHeight / Math.max(1, panel.clientWidth)));
  let html = ""; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const d = (c / cols) * 0.35 + (r / rows) * 0.45 + Math.random() * 0.18; html += `<i style="--d:${(d * 0.9).toFixed(2)}s"></i>`; }
  g.innerHTML = html; panel.append(g); setTimeout(() => g.remove(), 1800);
}
// on a phone, size the guide to the part of the screen you can actually see (Safari's toolbars and the keyboard
// cover the bottom of the layout viewport), so the box you type in is never hidden
const vv = window.visualViewport;
function fitPanel() {
  if (panel.hidden || innerWidth > 600 || !vv) { panel.style.height = panel.style.top = panel.style.bottom = ""; return; }
  panel.style.top = `${Math.round(vv.offsetTop + 10)}px`; panel.style.bottom = "auto"; panel.style.height = `${Math.round(Math.min(780, vv.height - 20))}px`;
}
vv?.addEventListener("resize", fitPanel); vv?.addEventListener("scroll", fitPanel); addEventListener("orientationchange", () => setTimeout(fitPanel, 300));
function open() { panel.hidden = false; fab.setAttribute("aria-expanded", "true"); if (!eleven || !live) check(); fitPanel(); assemble(); if (innerWidth > 600) input.focus({ preventScroll: true }); if (!log.children.length) hello(); }
function close() { panel.hidden = true; fab.setAttribute("aria-expanded", "false"); stopVoice(); fab.focus({ preventScroll: true }); }
$$("[data-guide-open]").forEach((b) => b.addEventListener("click", open));
$("#guide-close").addEventListener("click", close);
addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) close(); });
$("#guide-try").innerHTML = TRY.map((t) => `<button type="button">${esc(t)}</button>`).join("");
$("#guide-try").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b && !busy) send(b.textContent); });
function hello() {
  say("Kia ora. I can walk you through the six ideas, or just do things on the page: find products, write the spec, change the house and redraw the set, print it, or put products on the real 16A homes. What would you like to see?", { speak: false });
}

// ---------------------------------------------------------------------------------------------- status labels, by name only
async function check() {
  try { const r = await fetch("/api/archipro-agent"); const j = await r.json(); live = !!j.configured; modelName = /fable-5-2/.test(j.model) ? "Claude Fable 5.2" : j.model; }
  catch { live = false; }
  try { const r = await fetch("/api/archipro-voice"); const j = await r.json(); eleven = !!j.configured; } catch { eleven = false; }
  label();
}
function label() {
  status.textContent = live ? `Live · ${modelName} · acts on this page only` : "Offline here · scripted replies, not AI · acts on this page only";
  const bv = browserVoice();
  voiceL.textContent = !voiceOn ? "Replies are text only" : eleven ? "New Zealand voice by ElevenLabs" : bv ? `Browser voice: ${bv.name}${/NZ/i.test(bv.lang) ? "" : " (not a New Zealand voice)"}` : "No voice in this browser";
}
voiceBtn.addEventListener("click", () => { voiceOn = !voiceOn; voiceBtn.setAttribute("aria-pressed", String(voiceOn)); voiceBtn.textContent = voiceOn ? "Voice on" : "Voice off"; if (!voiceOn) stopVoice(); label(); });
check();

// ---------------------------------------------------------------------------------------------- the conversation
function say(text, { did = [], speak = true, note = false } = {}) {
  const el = document.createElement("div"); el.className = note ? "msg note" : "msg it";
  el.innerHTML = esc(text).replace(/\n{2,}/g, "<br><br>").replace(/\n/g, "<br>") + (did.length ? `<div class="did">${did.map((d) => `<span>${esc(d)}</span>`).join("")}</div>` : "");
  log.append(el); log.scrollTop = log.scrollHeight;
  if (speak && !note) voice(text);
  return el;
}
function you(text) { const el = document.createElement("div"); el.className = "msg you"; el.textContent = text; log.append(el); log.scrollTop = log.scrollHeight; }
function waiting() { return step("Reading the page and thinking"); }
// one line per thing the agent does: an open square while it runs, filled when it's done
function step(text) {
  const el = document.createElement("div"); el.className = "gstep run"; el.innerHTML = `<i aria-hidden="true"></i><span>${esc(text)}</span>`;
  el.done = (t) => { el.className = "gstep done"; if (t) el.querySelector("span").textContent = t; };
  el.textContent2 = (t) => { el.querySelector("span").textContent = t; };
  log.append(el); log.scrollTop = log.scrollHeight; return el;
}
const DOING = { search_catalogue: (a) => `Searching the sample catalogue: “${a.query || ""}”`, add_to_specification: () => "Adding it to the specification", change_house: () => "Changing the house and redrawing the set",
  show_drawing: (a) => `Opening sheet ${a.sheet || ""}`, print_drawing_set: () => "Preparing the A3 set to print", show_on_home: () => "Putting the products on the 16A twin", go_to: (a) => `Going to ${a.chapter || "the page"}` };

form.addEventListener("submit", (e) => { e.preventDefault(); const t = input.value.trim(); if (t && !busy) send(t); });
async function send(text) {
  busy = true; input.value = ""; panel.classList.add("asked"); you(text); stopVoice();
  let w = waiting();
  try {
    if (live === null) await check();
    if (!live) { const r = scripted(text); w.remove(); say(r.text, { did: r.did }); return; }
    history.push({ role: "user", content: [{ type: "text", text }] });
    const did = [];
    for (let round = 0; round < 7; round++) {
      const res = await fetch("/api/archipro-agent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: history, state: snapshot(), route }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        history.pop();
        if (j.error === "not_configured") { live = false; label(); const r = scripted(text); w.remove(); say(r.text, { did: r.did }); return; }
        w.remove(); say(j.error === "daily_cap" || j.error === "busy" ? "The guide has had a lot of questions today and needs a breather. Everything on the page still works by hand." : j.error === "conversation_too_long" ? "This conversation has got long. Close the guide and open it again to start fresh." : "I couldn't reach the model just then. Try again in a moment; the page itself still works.", { speak: false });
        return;
      }
      if (j.route === "fallback" && route !== "fallback") { route = "fallback"; modelName = j.model; label(); }
      history.push({ role: "assistant", content: j.content });
      const uses = j.content.filter((b) => b.type === "tool_use");
      if (j.stop_reason !== "tool_use" || !uses.length) {
        const text = j.content.filter((b) => b.type === "text").map((b) => b.text).join("\n\n").trim();
        w.done("Answered"); say(text || (did.length ? "Done." : "I'm not sure how to help with that here."), { did });
        return;
      }
      const results = [];
      w.done("Planned the next step");
      for (const u of uses) {
        let out, err = false; const st = step((DOING[u.name] || (() => u.name))(u.input || {}));
        try { const r = await run(u.name, u.input || {}); out = r.result; if (r.did) did.push(r.did); st.done(r.did); }
        catch (e) { out = { error: String(e?.message || e) }; err = true; st.done("Couldn't do that step"); }
        results.push({ type: "tool_result", tool_use_id: u.id, content: JSON.stringify(out).slice(0, 7500), ...(err ? { is_error: true } : {}) });
      }
      history.push({ role: "user", content: results });
      w = step("Checking the result");
    }
    w.remove(); say("That took more steps than I'm allowed in one go. Here's where it got to; ask me to carry on.", { did });
  } finally { busy = false; }
}

// ---------------------------------------------------------------------------------------------- what the page looks like right now
function snapshot() {
  const ids = ["catalogue", "specify", "drawings", "home", "join", "team", "studio", "plan"];
  let here = "top"; for (const id of ids) { const r = document.getElementById(id)?.getBoundingClientRect(); if (r && r.top < innerHeight * 0.5 && r.bottom > 0) here = id; }
  return { viewing: here, specification: window.__page?.spec?.() || {}, drawing_set: window.__studio?.summary?.() || null };
}

// ---------------------------------------------------------------------------------------------- tools: the same controls a person has
const m = (v) => (v == null ? undefined : Math.round(+v * 1000));
const low = () => { if (small()) panel.classList.add("low"); };
async function run(name, a) {
  const P = window.__page, S = window.__studio;
  if (name === "search_catalogue") { low(); const r = P.ask(a.query); return { result: r, did: `Searched the sample catalogue: “${a.query}”` }; }
  if (name === "add_to_specification") {
    const cat = P.catOf(a.product_id);
    low(); const r = P.setSpec(cat, a.product_id, { zone: a.exposure_zone }); if (!r) throw new Error("unknown product");
    return { result: r, did: `Put ${r.added} in the specification` };
  }
  if (name === "change_house") {
    const o = { livingWidth: m(a.living_wing_width_m), deckDepth: m(a.deck_depth_m), kitchenWindow: m(a.kitchen_window_width_m), pitch: a.roof_pitch, cladding: a.cladding_id, roof: a.roof_id, joinery: a.joinery_id, decking: a.decking_id };
    low(); S.go(); const r = S.set(o);
    const bits = [a.living_wing_width_m && `living wing ${(+a.living_wing_width_m).toFixed(1)} m`, a.deck_depth_m && `deck ${(+a.deck_depth_m).toFixed(1)} m`, a.kitchen_window_width_m && `kitchen window ${(+a.kitchen_window_width_m).toFixed(1)} m`, a.roof_pitch && `${a.roof_pitch} roof`].filter(Boolean);
    return { result: r, did: `Changed the house${bits.length ? ": " + bits.join(", ") : ""} and redrew the set` };
  }
  if (name === "show_drawing") { low(); if (a.view) S.look(a.view); const ok = S.showSheet(a.sheet); return { result: { shown: ok ? a.sheet : null, ...S.summary() }, did: `Showed sheet ${a.sheet}` }; }
  if (name === "print_drawing_set") { const n = S.print(); return { result: { opened_print_dialog: true, sheets: n, size: "A3 landscape" }, did: "Opened the print dialog for the A3 set" }; }
  if (name === "show_on_home") {
    low(); const picks = {}; for (const c of ["cladding", "roof", "joinery", "decking"]) if (a[c + "_id"]) picks[c] = a[c + "_id"];
    const r = P.home({ picks, month: a.month, hour: a.hour }); return { result: r, did: "Showed the products on the 16A twin" };
  }
  if (name === "go_to") { low(); const map = { top: "main", why: "why", studio: "studio", plan: "plan" }; P.go(map[a.chapter] || a.chapter); return { result: { now_showing: a.chapter }, did: `Went to ${a.chapter}` }; }
  throw new Error(`No tool called ${name}`);
}

// ---------------------------------------------------------------------------------------------- the scripted fallback (no AI)
function scripted(t) {
  const q = t.toLowerCase(), S = window.__studio, P = window.__page, pre = "Scripted reply (the live guide isn't switched on for this preview). ";
  if (/why kate|special projects|the role|hire|ninety|90 days/.test(q)) { P.go("plan"); return { text: `${pre}Kate made this page as a working sample for the Director, AI Special Projects role. Every idea on it runs. She'd start with one idea and an agreed baseline, ship it to a small group, then widen only on the evidence, with named people approving each step. Her architecture studio already works this way, with 33 specialist agents and a human reviewer for each.`, did: ["Went to the first ninety days"] }; }
  if (/print/.test(q)) { const n = S.print(); return { text: `${pre}I've opened the print dialog with all ${n} sheets at A3 landscape.`, did: ["Opened the print dialog"] }; }
  if (/kitchen|ventilat/.test(q)) { S.go(); const r = S.set({ kitchenWindow: 3600 }); S.showSheet("A901"); return { text: `${pre}I widened the kitchen window to 3.6 metres. ${r.precheck.fail ? `${r.precheck.fail} item still to resolve.` : "Nothing is left to resolve in the pre-check."} The schedule is on sheet A901.`, did: ["Changed the house: kitchen window 3.6 m", "Showed sheet A901"] }; }
  const w = q.match(/(\d+(?:\.\d+)?)\s*(?:m\b|metres?|meters?)/);
  if (w && /living|wide|wider|width/.test(q)) { S.go(); const r = S.set({ livingWidth: +w[1] * 1000 }); return { text: `${pre}The living wing is now ${r.house.living_wing_width_m} metres; floor area ${r.house.floor_area_m2} square metres, and every sheet has redrawn.`, did: [`Changed the house: living wing ${w[1]} m`] }; }
  const sheet = /elevation/.test(q) ? "A201" : /section/.test(q) ? "A301" : /schedule|pre-?check|code/.test(q) ? "A901" : /plan|drawing/.test(q) ? "A101" : null;
  if (sheet) { S.showSheet(sheet); return { text: `${pre}Here's sheet ${sheet}.`, did: [`Showed sheet ${sheet}`] }; }
  if (/clad|roof|joinery|window|deck|product|black|cedar|steel|coastal|sea/.test(q)) { const r = P.ask(t); return { text: `${pre}${r.found.length ? `The best fits in the sample catalogue: ${r.found.map((f) => f.name).join("; ")}.` : "Nothing in the sample catalogue fits all of that."}`, did: [`Searched the sample catalogue`] }; }
  return { text: `${pre}I can print the set, fix the kitchen ventilation, widen the living wing (say, “make the living wing 11 metres”), show a sheet, or search the catalogue. With the live guide on, you can ask me anything about the ideas.`, did: [] };
}

// ---------------------------------------------------------------------------------------------- voice out
// one audio element for the ElevenLabs voice, unlocked by the first tap or key in the guide: phones (Safari above all)
// only let a page play sound that starts inside a tap, and the voice arrives a moment after the tap
const player = new Audio(); player.preload = "auto"; let audioUrl = "", unlocked = false;
const SILENT = "data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYwLjE2LjEwMAAAAAAAAAAAAAAA//NwwAAAAAAAAAAAAEluZm8AAAAPAAAACAAAA/oAR0dHR0dHR0dHR0dHYmJiYmJiYmJiYmJifHx8fHx8fHx8fHx8fJaWlpaWlpaWlpaWlrGxsbGxsbGxsbGxsbHLy8vLy8vLy8vLy8vl5eXl5eXl5eXl5eXl////////////////AAAAAExhdmM2MC4zMQAAAAAAAAAAAAAAACQC1AAAAAAAAAP6yysejgAAAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NCxKMAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NAxKQAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80LEowAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80DEpAAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsSjAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==";
function unlock() {
  if (unlocked) return; unlocked = true;
  try { player.src = SILENT; const p = player.play(); if (p && p.then) p.then(() => player.pause()).catch(() => { unlocked = false; }); } catch { unlocked = false; }
  if ("speechSynthesis" in window) { try { speechSynthesis.speak(new SpeechSynthesisUtterance("")); } catch {} }
}
for (const t of [panel, fab, ...document.querySelectorAll("[data-guide-open], #room-ask")]) { t.addEventListener("pointerdown", unlock, true); t.addEventListener("keydown", unlock, true); }
function browserVoice() {
  const vs = speechSynthesis?.getVoices?.() || [];
  return vs.find((v) => /en[-_]NZ/i.test(v.lang)) || vs.find((v) => /en[-_]AU/i.test(v.lang)) || vs.find((v) => /en[-_]GB/i.test(v.lang)) || vs.find((v) => /^en/i.test(v.lang)) || null;
}
if ("speechSynthesis" in window) speechSynthesis.addEventListener?.("voiceschanged", label);
function stopVoice() { player.pause(); if (audioUrl) { URL.revokeObjectURL(audioUrl); audioUrl = ""; } if ("speechSynthesis" in window) speechSynthesis.cancel(); }
async function voice(text) {
  if (!voiceOn) return;
  const clean = text.replace(/[*_#`>]/g, "").replace(/\s+/g, " ").trim().slice(0, 680);
  if (eleven) {
    try {
      const r = await fetch("/api/archipro-voice", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: clean }) });
      if (r.ok) { const blob = await r.blob(); stopVoice(); audioUrl = URL.createObjectURL(blob); player.src = audioUrl; await player.play(); return; }
      if (r.status === 503) { eleven = false; label(); }
    } catch { /* fall through to the browser voice */ }
  }
  if (!("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(clean), v = browserVoice(); if (v) { u.voice = v; u.lang = v.lang; } else u.lang = "en-NZ";
  u.rate = 1.02; speechSynthesis.cancel(); speechSynthesis.speak(u);
}

// ---------------------------------------------------------------------------------------------- voice in (where the browser supports it)
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SR) {
  mic.hidden = false; let rec = null;
  mic.addEventListener("click", () => {
    if (rec) { rec.stop(); return; }
    stopVoice(); rec = new SR(); rec.lang = "en-NZ"; rec.interimResults = true; rec.maxAlternatives = 1;
    mic.setAttribute("aria-pressed", "true"); input.placeholder = "Listening…";
    rec.onresult = (e) => { const r = e.results[e.results.length - 1]; input.value = r[0].transcript; if (r.isFinal && input.value.trim() && !busy) { const t = input.value.trim(); rec.stop(); send(t); } };
    rec.onend = rec.onerror = () => { mic.setAttribute("aria-pressed", "false"); input.placeholder = "Ask, or tell it what to change"; rec = null; };
    rec.start();
  });
}
panel.addEventListener("pointerdown", () => panel.classList.remove("low"));
