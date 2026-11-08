// assembl lab · Supermarket order to doorstep. The page's sim: the journey (journey.js) played on a point-cloud map of real Auckland
// streets (baked by tools/pointcloud/bake-delivery.mjs, drawn with the shared engine lab/pc/engine.js), with the van, the route and
// six fictional households as point clouds on top, DOM callouts tied to them by leader lines, and the stage panel on the left.
// Without WebGL the page keeps a still of the same map, its callouts as a list, and the journey in words; the panel still steps.
// Reduced motion: no autoplay, nothing moves, every callout shown; each stage opens on its key moment.
import * as THREE from "three";
import { createEngine, makeForm, GLSL_TONES, ADDITIVE_PREMULTIPLIED, rng } from "/lab/pc/engine.js";
import * as J from "/delivery/journey.js";
import { createFloor } from "/delivery/floor.js";

const root = document.documentElement, $ = (id) => document.getElementById(id);
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const STILL = new URLSearchParams(location.search).has("still");
const BASE = "/assets/models/delivery/delivery-points";
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const money = (v) => "$" + v.toFixed(2);

// ------------------------------------------------------------------------------------------------ state
let header = null, P = null, t = 0, playing = !reduce && !STILL, speed = 1, wrong = true, rain = false, weather = null;
let choices = {}, autoChosen = {}, waiting = null, waitMs = 0, steppedTo = null;
const prices = { ...J.SNAPSHOT.items }; let priceInfo = null, panelKey = "", lastStage = -1;
const AUTO_MS = 10000;                                   // how long a decision waits for the viewer before the run takes the default

function rebuild() { P = J.plan({ wrong, rain, choices, legEndsM: header?.route?.legEndsM || J.FALLBACK.legEndsM }); t = Math.min(t, P.total); }
// the moment each stage opens on when you step to it: the decision itself, the van mid-leg, the redraft after traffic
function keyT(k) {
  const s0 = P.stageT[k], s1 = k < 7 ? P.stageT[k + 1] : P.total, hold = P.holds.find((h) => h.t >= s0 && h.t <= s1 && !choices[h.key]);
  if (hold) return hold.t;
  if (k === 0) return 2;
  if (k === 1) return s0 + (s1 - s0) * 0.62;
  if (k === 4) return s0 + Math.min(2.4, (P.beats.find((b) => b.stage === 4 && b.m1 > b.m0)?.dur || 3) * 0.8);   // the route fanned out, the van on its first leg
  if (k === 5) { const tr = P.beats.find((b) => b.traffic); return tr ? tr.t0 + 2.2 : s0 + (s1 - s0) * 0.55; }
  if (k === 6) { const d = P.stops[J.FOCUS]; return d.holdBeat ? d.holdBeat.t0 + 1.4 : s0 + (s1 - s0) * 0.5; }
  if (k === 7) return P.total;
  return s1 - 0.01;
}
function goStage(k) {
  k = Math.max(0, Math.min(7, k));
  // stepping past a decision no one made: the run takes the default, and says so
  for (const h of P.holds) if (h.t < P.stageT[k] && !choices[h.key]) { choices[h.key] = J.DEFAULTS[h.key]; autoChosen[h.key] = "stepped"; }
  rebuild(); t = keyT(k); waiting = null; waitMs = 0; steppedTo = k; update(true);
}
function choose(key, value, how = "you") { choices[key] = value; autoChosen[key] = how; waiting = null; waitMs = 0; rebuild(); renderBasket(); update(true); }
function setPlaying(v) {
  playing = v; const b = $("play"); b.setAttribute("aria-pressed", String(!v)); b.setAttribute("aria-label", v ? "Pause motion" : "Play motion");
  // pausing mid-assembly lands the map at once (a paused tween would never finish, and its labels would never come)
  if (engine) { if (!v && mapReady && engine.morphing()) engine.setForm(form, { ...placement, immediate: true }); engine.pause(!v); if (!v && mapReady) { labelsOn = true; layoutDirty = true; paintKey = ""; } }
  if (v && t >= P.total) { t = 0; }
}

// ------------------------------------------------------------------------------------------------ the loop
let last = performance.now();
function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (playing && P) {
    if (waiting) { waitMs += dt * 1000; if (waitMs > AUTO_MS) choose(waiting, J.DEFAULTS[waiting], "auto"); }
    else {
      const ds = dt * speed, h = P.holds.find((x) => !choices[x.key] && t <= x.t + 1e-6 && t + ds >= x.t);
      if (h) { t = h.t; waiting = h.key; waitMs = 0; }
      else { t = Math.min(P.total, t + ds); if (t >= P.total) setPlaying(false); }
      steppedTo = null;
    }
  }
  update(false);
}
function update(force) {
  if (!P) return;
  const S = J.stateAt(P, t);
  if (!waiting) { const h = P.holds.find((x) => !choices[x.key] && Math.abs(t - x.t) < 1e-6); if (h) waiting = h.key; }
  $("pn-clock").textContent = `Example Tuesday · ${J.clock(S.clock)}`;
  renderPanel(S, force); renderSteps(S); renderCallouts(S); renderInset(S, performance.now() / 1000);
  if (S.stage !== lastStage) { lastStage = S.stage; layoutDirty = true; }
  if (engine && mapReady) { updateOverlay(S); const k = `${t}|${layoutDirty}|${labelsOn}|${canvas.clientWidth}x${canvas.clientHeight}`; if (!playing && (force || k !== paintKey)) { paintKey = k; paint(performance.now()); } }
}

// ------------------------------------------------------------------------------------------------ the panel
function renderPanel(S, force) {
  const s = S.stage, msgs = P.msgs.filter((m) => m.stage === s && m.t <= t + 1e-6);
  const key = [s, msgs.length, waiting, playing, JSON.stringify(choices), wrong, priceInfo?.period, weather?.wet].join("|");
  const wt = document.querySelector("#pn-decide .decide-wait"); if (wt && playing && waiting) wt.textContent = `Waiting for your choice. In ${Math.max(0, Math.ceil((AUTO_MS - waitMs) / 1000))} s this run takes the first option.`;
  if (!force && key === panelKey) return; panelKey = key;
  const copy = J.stageCopy(P, s, prices), ag = J.STAGES[s].agent && J.AGENTS[J.STAGES[s].agent];
  $("pn-n").textContent = `Stage ${s + 1} of 8`;
  $("pn-title").textContent = copy.title; $("pn-what").textContent = copy.what;
  const agent = $("pn-agent"); agent.hidden = !ag;
  if (ag) agent.innerHTML = `<span class="agent-name">${esc(ag.name)}</span><span class="auth" data-auth="${esc(ag.auth)}">${esc(ag.auth)}</span><span class="agent-does">${esc(ag.does)}</span>`;
  const draftState = () => "Draft · waiting for a person's yes";      // nothing on this page is ever sent
  $("pn-msgs").innerHTML = msgs.map((m) => `<li class="msg" data-kind="${m.kind}"><span class="msg-to">To ${esc(m.to.replace("Household", "household"))} · from the ${esc(J.AGENTS[m.agent].name)}</span><p>${esc(m.text)}</p><span class="msg-state">${draftState(m)}</span></li>`).join("");
  // the stage's extra line: the weather and the run's approval, or the proof
  const dec = $("pn-decide"), proof = $("pn-proof");
  dec.hidden = true; proof.hidden = true; dec.innerHTML = "";
  if (copy.decide === "swap") renderDecide(dec, "swap", "You are the customer at household D. Butter is out: choose a swap.", [["A", "Approve swap A", "same price"], ["B", "Approve swap B", "+$1.10"], ["none", "No swap", ""]],
    (v) => v === "none" ? "No swap: butter left off and not charged." : `Swap ${v} approved: ${J.SWAPS[v].label.toLowerCase()}. It was a draft until that yes.`);
  if (copy.decide === "missed") renderDecide(dec, "missed", "You are the customer at household D. Nobody was home: what now?", [["rebook", "Rebook 7:00–8:00 pm", "tonight"], ["safe", "Leave in a safe place", ""]],
    (v) => v === "rebook" ? "Rebooked for 7:00–8:00 pm tonight. The order stays cold on the van and comes on the evening run." : "Left in the safe place you named, with the chilled items in an insulated bag.");
  if (s === 3 || s === 4) {
    const w = weather ? `<span class="truth" data-k="live">Live weather</span> Auckland ${Math.round(weather.temp)}°C, ${weather.wet ? "raining: the van runs 10% slower" : "dry: the van runs at its usual speed"}` : `<span class="truth">Simulated</span> The weather feed isn't reachable here, so the van runs at its usual simulated speed (${J.clock(15 * 60 + 45)} departure, about 26 km/h through the suburbs).`;
    dec.hidden = false; dec.innerHTML = `<p class="decide-k">${w}</p>${s === 3 ? `<p class="decide-done">Run proposed: six drops, ${(P.legEndsM.at(-1) / 1000).toFixed(1)} km, back about ${J.clock(P.back)}.<span class="mono">Dispatcher approved the run · simulated</span></p>` : ""}`;
  }
  if (s === 7) {
    const pr = P.proof; proof.hidden = false;
    proof.innerHTML = [[`${pr.inWindow} of ${pr.stops}`, "delivered in their window"], [pr.swaps ? `${pr.swaps.accepted} of ${pr.swaps.offered}` : "None", pr.swaps ? "substitutions accepted" : "substitutions needed"],
      [pr.missed ? `${pr.missed.recovered} of ${pr.missed.missed}` : "None", pr.missed ? "missed delivery recovered" : "missed deliveries"], [`${pr.effortMin} min`, "of customer effort saved"]]
      .map(([b, l]) => `<div><b>${b}</b><span>${l}</span></div>`).join("") + `<p class="chip-row" style="grid-column:1/-1;margin:0"><span class="truth">Simulated</span><span class="truth" data-k="ill">${pr.sent} sent · ${pr.drafts} drafts</span></p>`;
  }
}
function renderDecide(el, key, prompt, opts, doneText) {
  el.hidden = false;
  if (choices[key]) {
    const how = autoChosen[key] === "you" ? "Your reply · simulated" : autoChosen[key] === "stepped" ? "You stepped past, so this run assumes it · simulated" : "No reply in time, so this run assumes it · simulated";
    el.innerHTML = `<p class="decide-done">${esc(doneText(choices[key]))}<span class="mono">${how}</span></p>`; return;
  }
  const secs = Math.max(0, Math.ceil((AUTO_MS - waitMs) / 1000));
  el.innerHTML = `<p class="decide-k"><b>${esc(prompt)}</b></p><div class="choices" role="group" aria-label="Your choice, as the customer">${opts.map(([v, l, n]) => `<button type="button" class="choice" data-key="${key}" data-v="${v}">${esc(l)}${n ? `<small>${esc(n)}</small>` : ""}</button>`).join("")}</div>` +
    `<p class="decide-wait">${playing && waiting === key ? `Waiting for your choice. In ${secs} s this run takes the first option.` : "The run waits here for your choice."}</p>`;
}
$("pn-decide").addEventListener("click", (e) => { const b = e.target.closest(".choice"); if (b) choose(b.dataset.key, b.dataset.v, "you"); });

function renderSteps(S) {
  document.querySelectorAll("#steps button").forEach((b) => { const k = +b.dataset.stage; b.classList.toggle("done", k < S.stage); if (k === S.stage) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current"); });
}

// ------------------------------------------------------------------------------------------------ callouts (DOM), their text
const CO = [...document.querySelectorAll("#callouts .co")].map((el) => ({ el, key: el.dataset.anchor, line: el.querySelector("[data-line]"), text: "" }));
const coOf = (k) => CO.find((c) => c.key === k);
function setLine(c, txt, st) { if (c.text !== txt) { c.line.textContent = txt; c.text = txt; } if (st != null && c.el.dataset.st !== st) { c.el.dataset.st = st; layoutDirty = true; } }
function renderCallouts(S) {
  const s = S.stage, floor = floorApi ? floorApi.found(S.pick, P.wrong ? "butter" : null) : Math.round(S.pick * 12);
  const storeLine = s === 0 ? "Order in · 13 items for household D" : s === 1 ? `Picking · ${floor} of 13 found` : s === 2 ? (P.wrong ? (choices.swap ? `Swap approved · ${J.SWAPS[choices.swap].short}` : "Butter out · swap drafted") : "All 13 found")
    : s === 3 ? "Packing · six orders, three temperature zones" : S.back ? `Van back about ${J.clock(P.back)}` : `Van out · ${S.done} of 6 delivered`;
  setLine(coOf("store"), storeLine);
  const at = S.homes.find((h) => h.st === "door" || h.st === "missed");
  const vanLine = s < 3 ? "At the store" : s === 3 ? "Loading, last drop first" : S.back ? "Back at the store" : S.traffic ? `Traffic · about 12 min behind` : at ? `At household ${at.id}` : S.next ? `${S.done} of 6 delivered · next ${S.next.id} about ${J.clock(S.next.arrive + 2)}` : `${S.done} of 6 delivered`;
  setLine(coOf("van"), vanLine);
  for (const h of S.homes) { const st = h.st === "pending" && S.next && S.next.id === h.id ? "next" : h.st; setLine(coOf(h.id), h.line, st); }
}

// ------------------------------------------------------------------------------------------------ the inset: the picker's walk
const insetEl = $("inset"); let floorApi = null;
try { floorApi = createFloor($("floor")); } catch (e) { /* no 2D canvas: the inset stays text */ }
function renderInset(S, time) {
  const show = S.stage >= 1 && S.stage <= 2;
  if (insetEl.hidden === show) { insetEl.hidden = !show; layoutDirty = true; }
  if (!show) return;
  const out = P.wrong ? "butter" : null, found = floorApi ? floorApi.found(S.pick, out) : 0;
  $("inset-line").textContent = S.pick >= 1 ? (out ? "12 of 13 found · butter shelf empty" : "13 of 13 found") : `Picking: ${found} of 13 found`;
  floorApi?.draw(S.pick, { outKey: out, time: reduce ? 0 : time });
}

// ------------------------------------------------------------------------------------------------ the basket, the proof, the words
function renderBasket() {
  const swap = P?.wrong ? choices.swap : null, rows = [];
  for (const b of J.BASKET) {
    const p = prices[b.key] ?? J.SNAPSHOT.items[b.key], qty = b.per === "kg" ? `${b.qty} kg` : String(b.qty), unit = b.per === "kg" ? `${money(p)}/kg` : money(p);
    rows.push(`<tr class="${b.out && P?.wrong ? "out" : ""}"><td>${esc(b.name)}</td><td>${qty}</td><td>${unit}</td><td>${b.out && P?.wrong && swap === "none" ? "–" : money(p * b.qty)}</td></tr>`);
    if (b.out && P?.wrong && swap && swap !== "none") rows.push(`<tr class="swap"><td>↳ ${esc(J.SWAPS[swap].label)} (approved swap)</td><td>1</td><td>simulated</td><td>${J.SWAPS[swap].delta ? "+" + money(J.SWAPS[swap].delta) : "+$0.00"}</td></tr>`);
  }
  $("bk-body").innerHTML = rows.join(""); $("bk-total").textContent = money(J.basketTotal(prices, P?.wrong ? swap || "A" : "A"));
}
function renderProof() {
  const pr = P.proof, D = P.stops[J.FOCUS], ch = P.choices;
  const cells = [
    ["Orders delivered in their window", `${pr.inWindow} of ${pr.stops}`, P.wrong ? (ch.missed === "rebook" ? `One rebooked by the customer to ${J.span(D.window)} and delivered at ${J.clock(D.done)} on the evening run.` : "One left in a safe place the customer chose, inside the window.") : "No hold-ups and no misses."],
    ["Substitutions accepted", pr.swaps ? `${pr.swaps.accepted} of ${pr.swaps.offered}` : "None needed", pr.swaps ? (ch.swap === "none" ? "The customer said no swap; butter left off and not charged." : `Butter swapped for ${J.SWAPS[ch.swap].label.toLowerCase()} after the customer said yes.`) : "Everything was on the shelf."],
    ["Missed delivery recovered", pr.missed ? `${pr.missed.recovered} of ${pr.missed.missed}` : "None missed", pr.missed ? `Nobody home at D. The customer chose to ${ch.missed === "rebook" ? "rebook" : "use a safe place"}.` : "Someone was home at every door."],
    ["Customer effort saved", `${pr.effortMin} min`, "Across the six households, from the assumptions below."],
    ["Messages sent by assembl", String(pr.sent), `${pr.drafts} drafts written. Each waits for a person's yes.`],
  ];
  $("proof-grid").innerHTML = cells.map(([dt, b, s]) => `<div><dt>${dt}</dt><dd><b>${b}</b><span>${esc(s)}</span></dd></div>`).join("");
  $("assume").innerHTML = pr.effort.map((e) => `<li>${esc(e.what)}: ${e.min} min × ${e.n}${e.n > 1 ? " households" : ""}</li>`).join("");
}
function renderWords() {
  const st = P.stops, D = st[J.FOCUS], ch = P.choices, eta = (s) => J.clock(s.arrive + 2), km = (P.legEndsM.at(-1) / 1000).toFixed(1);
  const items = [
    `<strong>Order placed, 10:42 am.</strong> The Example customer at household D orders 13 items for Tuesday, ${J.span(D.firstWindow || D.window)}. The Intent agent (observe) reads the order and flags butter as low. Draft to D: order confirmed.`,
    `<strong>Picking, 2:05 pm.</strong> A picker walks the aisles of an illustrative store. The Picking agent (observe) follows: ${P.wrong ? "12 of 13 found, the butter shelf is empty" : "13 of 13 found"}.`,
    P.wrong ? `<strong>Out of stock, 2:31 pm.</strong> The Substitution agent (recommend) suggests another 500 g butter at the same price, or two 250 g blocks for $1.10 more. Draft to D asking which. ${ch.swap === "none" ? "The customer says no swap." : `The customer approves ${J.SWAPS[ch.swap].label.toLowerCase()}.`}` : `<strong>Nothing out of stock, 2:31 pm.</strong> Every item was on the shelf; no swap to suggest.`,
    `<strong>Packed and loaded, 2:40 pm.</strong> Six orders in chilled, frozen and ambient crates, loaded last drop first. The Route agent (act with approval) plans ${km} km and six drops; the dispatcher approves.`,
    `<strong>On the road, 3:45 pm.</strong> The van leaves. The Wait agent (draft) drafts ETAs for A (${eta(st[0])}) and B (${eta(st[1])}).`,
    P.wrong ? `<strong>Windows kept.</strong> A and B delivered in their windows. Traffic adds 12 minutes on the way to C; the Wait agent redrafts C (${eta(st[2])}) and D (${eta(D)}), both still inside their windows.` : `<strong>Windows kept.</strong> A and B delivered in their windows. The Wait agent drafts C (${eta(st[2])}) and D (${eta(D)}).`,
    P.wrong ? `<strong>Nobody home, ${J.clock(D.arrive)}.</strong> No answer at D. The Resolution agent (recommend) drafts two options: rebook for 7:00–8:00 pm, or a safe place. ${ch.missed === "rebook" ? "The customer rebooks." : "The customer names a safe place."} E (${eta(st[4])}) and F (${eta(st[5])}) get their groceries in their windows. The van is back at ${J.clock(P.back)}${ch.missed === "rebook" ? `; D's order arrives at ${J.clock(D.done)} on the evening run` : ""}.` : `<strong>Everyone home.</strong> D (${eta(D)}), E (${eta(st[4])}) and F (${eta(st[5])}) get their groceries in their windows. The van is back at ${J.clock(P.back)}.`,
    `<strong>Proof.</strong> ${P.proof.inWindow} of 6 in their window, ${P.proof.swaps ? `${P.proof.swaps.accepted} of 1 swap accepted` : "no swaps needed"}, ${P.proof.missed ? "1 of 1 missed delivery recovered" : "no missed deliveries"}, about ${P.proof.effortMin} minutes of customer effort saved, 0 messages sent by assembl. All simulated.`,
  ];
  $("words").innerHTML = items.map((x) => `<li>${x}</li>`).join("");
}
let wordsKey = "";
function renderBelow() { if (!P) return; const k = JSON.stringify([choices, wrong, rain]); if (k === wordsKey) return; wordsKey = k; renderProof(); renderWords(); renderBasket(); }

// ------------------------------------------------------------------------------------------------ controls
$("play").addEventListener("click", () => setPlaying(!playing));
$("prev").addEventListener("click", () => goStage(J.stateAt(P, t).stage - 1));
$("next").addEventListener("click", () => goStage(J.stateAt(P, t).stage + 1));
$("speed").addEventListener("change", (e) => { speed = +e.target.value; });
$("wrong").addEventListener("click", () => { const s = J.stateAt(P, t).stage; wrong = !wrong; $("wrong").setAttribute("aria-pressed", String(wrong)); choices = {}; autoChosen = {}; waiting = null; rebuild(); t = keyT(s); renderBelow(); update(true); });
$("restart").addEventListener("click", () => { choices = {}; autoChosen = {}; waiting = null; rebuild(); t = 0; steppedTo = null; renderBelow(); setPlaying(!reduce); update(true); });
document.querySelectorAll("#steps button").forEach((b) => b.addEventListener("click", () => goStage(+b.dataset.stage)));
setInterval(renderBelow, 400);

// ------------------------------------------------------------------------------------------------ public data: prices and weather
function onFeeds(j) {
  const fp = j?.feeds?.foodprices;
  if (fp && !fp.error && fp.values?.items) {
    let n = 0; for (const [k, v] of Object.entries(fp.values.items)) if (k in prices && Number.isFinite(v?.price)) { prices[k] = v.price; n++; }
    if (n) {
      priceInfo = { period: fp.period, url: fp.source?.url };
      $("price-chip").textContent = `Stats NZ prices · Latest published`;
      $("price-src").innerHTML = `<span class="truth" data-k="live">Latest published</span> Stats NZ average retail prices, ${esc(fp.period)}, for ${n} of the 13 items${fp.source?.url ? ` (<a href="${esc(fp.source.url)}" target="_blank" rel="noopener">source</a>)` : ""}. Any item Stats NZ didn't publish keeps the September 2026 figure.`;
      renderBasket(); panelKey = "";
    }
  }
  const w = j?.feeds?.weather;
  if (w && !w.error && w.values) {
    weather = { wet: (w.values.rainMm || 0) > 0.1, temp: w.values.tempC };
    if (weather.wet !== rain) { rain = weather.wet; rebuild(); wordsKey = ""; }
    panelKey = "";
  }
}
addEventListener("assembl:live", (e) => onFeeds(e.detail));

// ------------------------------------------------------------------------------------------------ the map (WebGL)
const canvas = $("map"), box = $("stage-box"), svg = document.querySelector(".leaders");
let engine = null, mapReady = false, form = null, placement = null, overlay = null, layoutDirty = true, labelsOn = false, pxPerUnit = 400;
try { engine = createEngine(canvas, { reduceMotion: reduce || STILL, clear: true, ...(STILL ? { budget: 300000 } : {}) }); } catch (e) { console.warn("Point cloud unavailable:", e.message); root.classList.add("dl-nogl"); }

async function loadHeader() { try { const r = await fetch(BASE + ".json"); if (r.ok) header = await r.json(); } catch (e) { /* the plan falls back to the built-in route lengths */ } }
async function loadForm(n) {
  const h = header, want = Math.min(n, h.count), bytes = want * h.stride;
  const r = await fetch(BASE + ".bin", { headers: want < h.count ? { Range: `bytes=0-${bytes - 1}` } : {} });
  if (!r.ok) throw new Error("delivery points " + r.status);
  const buf = await r.arrayBuffer(), got = Math.min(want, Math.floor(buf.byteLength / h.stride)), v = new DataView(buf), f = makeForm(got);
  const [x0, x1] = h.bounds.x, [y0, y1] = h.bounds.y, [z0, z1] = h.bounds.z, q = 1 / 65535;
  for (let i = 0; i < got; i++) {
    const o = i * h.stride;
    f.pos[i * 3] = x0 + (x1 - x0) * v.getUint16(o, true) * q; f.pos[i * 3 + 1] = y0 + (y1 - y0) * v.getUint16(o + 2, true) * q; f.pos[i * 3 + 2] = z0 + (z1 - z0) * v.getUint16(o + 4, true) * q;
    f.light[i] = v.getUint8(o + 6) / 255 * 0.84; f.kind[i] = v.getUint8(o + 7);
  }
  return f;
}

const TILT = 0.92, FILL = 0.92;                        // the map seen from about 53° up; the projected map fills 92% of the box (as the still)
const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3();
function worldAt(sx, sy) { const w = canvas.clientWidth, h = canvas.clientHeight; engine.camera.updateMatrixWorld(); ray.setFromCamera(new THREE.Vector2((sx / w) * 2 - 1, -(sy / h) * 2 + 1), engine.camera); ray.ray.intersectPlane(plane, hit); return [hit.x, hit.y, 0]; }
let sample = [];
function bboxOf(pl) { const xs = [], ys = []; for (const p of sample) { const q = engine.project(p, pl); xs.push(q.x); ys.push(q.y); } xs.sort((a, b) => a - b); ys.sort((a, b) => a - b); const at = (v, k) => v[Math.floor(k * (v.length - 1))]; return { x0: at(xs, 0.002), x1: at(xs, 0.998), y0: at(ys, 0.002), y1: at(ys, 0.998) }; }
function fit() {
  const w = canvas.clientWidth, h = canvas.clientHeight, cx = w / 2, cy = h / 2;
  let offset = worldAt(cx, cy), scale = Math.abs(worldAt(w, cy)[0] - worldAt(0, cy)[0]) / 2.1;
  for (let pass = 0; pass < 4; pass++) {
    // on a phone the map runs past the sides a little (its edges fade out anyway), so the streets are big enough to read
    const fx = !STILL && w < 600 ? 1.16 : FILL;
    let b = bboxOf({ offset, scale, tilt: TILT }); scale *= Math.min((w * fx) / (b.x1 - b.x0), (h * FILL) / (b.y1 - b.y0)); b = bboxOf({ offset, scale, tilt: TILT });
    const a = worldAt((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2), c = worldAt(cx, cy); offset = [offset[0] + c[0] - a[0], offset[1] + c[1] - a[1], 0];
  }
  const b = bboxOf({ offset, scale, tilt: TILT }); pxPerUnit = (b.x1 - b.x0) / 2.1;
  return { offset, scale, tilt: TILT, aspect: (b.x1 - b.x0) / (b.y1 - b.y0) };
}

// the overlay: the route, the van and the households as points, drawn through the engine's own light pipeline with its pose
const OV_VERT = /* glsl */ `
${GLSL_TONES}
attribute vec3 aBase; attribute float aType, aM, aF, aIdx, aSeed, aL;
uniform float uTime, uSway, uTilt, uScale, uSize, uPR, uShow, uReveal, uDone, uDelayOn, uDelay0, uDelay1, uVanShow, uShape, uRouteOn;
uniform vec3 uOff, uVan; uniform vec2 uVanDir; uniform float uHS[6];
varying vec3 vCol; varying float vA;
float h1(float n) { return fract(sin(n) * 43758.5453123); }
vec3 pose(vec3 q) { float c = cos(uSway), s = sin(uSway); q = vec3(c * q.x + s * q.z, q.y, -s * q.x + c * q.z); float ct = cos(uTilt), st = sin(uTilt); return vec3(q.x, ct * q.y - st * q.z, st * q.y + ct * q.z); }
void main() {
  vec3 p; float L = aL, a = 1.0, sz = 1.0;
  if (aType < 0.5) {                                   // the route: each leg grows from its start (it fans out), travelled part bright
    p = aBase; float vis = step(aF, uReveal) * uRouteOn, done = step(aM, uDone);
    L = mix(0.62, 1.0, done) * aL; a = vis * mix(0.7, 1.0, done); sz = mix(1.5, 2.3, done);
    if (uDelayOn > 0.5 && aM > uDelay0 && aM < uDelay1) { L = 0.72 + 0.26 * sin(uTime * 4.0 - aM * 0.02); a = vis; sz = 1.5; }
  } else if (aType < 1.5) {                            // the van: its shape turned to the road's heading
    vec3 q = position * uShape; vec2 d = uVanDir; p = vec3(q.x * d.x - q.z * d.y, q.y, q.x * d.y + q.z * d.x) + uVan; a = uVanShow; sz = 1.25;
  } else {                                             // a household: a small house and a ring, lit by its status
    float st = 0.0; int k = int(aIdx + 0.5);
    for (int j = 0; j < 6; j++) if (j == k) st = uHS[j];
    p = aBase + position * uShape;
    float pulse = 0.5 + 0.5 * sin(uTime * 3.0 + aIdx);
    float f = st < 0.5 ? 0.0 : st < 1.5 ? 0.55 : st < 2.5 ? 0.75 + 0.25 * pulse : st < 3.5 ? 1.05 : st < 4.5 ? 0.45 + 0.4 * step(0.5, fract(uTime * 1.6)) : 0.8;
    L = aL * f; a = step(0.5, st); sz = 1.15;
  }
  vec4 mv = modelViewMatrix * vec4(pose(p * uScale) + uOff, 1.0); gl_Position = projectionMatrix * mv;
  L = clamp(L, 0.0, 1.0);
  vCol = pcLook(L, uTime * 0.025 + p.x * 0.55 + p.z * 0.35 + aSeed * 0.15); vA = a * uShow;
  gl_PointSize = uSize * uPR * sz * (0.8 + 0.4 * h1(aSeed * 13.7)) / max(-mv.z, 0.05);
}`;
const OV_FRAG = /* glsl */ `varying vec3 vCol; varying float vA; void main() { float a = (1.0 - smoothstep(0.28, 0.5, length(gl_PointCoord - 0.5))) * vA; if (a < 0.01) discard; gl_FragColor = vec4(vCol * a, a); }`;

let routePts = null, routeM = null;
function buildOverlay() {
  const r = rng(77), U = engine.uniforms, S = 1 / header.metresPerUnit;
  routePts = header.route.points; routeM = header.route.metres;
  const P3 = [], base = [], type = [], aM = [], aF = [], idx = [], seed = [], light = [];
  const push = (pos, b, ty, m, f, i, l) => { P3.push(...pos); base.push(...b); type.push(ty); aM.push(m); aF.push(f); idx.push(i); seed.push(r()); light.push(l); };
  // the route, densified every ~3 m with a little width; each point knows its leg and how far along its leg it is
  const ends = [0, ...header.route.legEndsM];
  for (let i = 0; i + 1 < routePts.length; i++) {
    const a = routePts[i], b = routePts[i + 1], m0 = routeM[i], m1 = routeM[i + 1], n = Math.max(1, Math.ceil((m1 - m0) / 1.6)), dx = b[0] - a[0], dz = b[2] - a[2], L = Math.hypot(dx, dz) || 1;
    for (let k = 0; k < n; k++) {
      const u = k / n, m = m0 + (m1 - m0) * u, leg = Math.max(0, ends.findIndex((e, j) => j > 0 && m <= e) - 1), f = (m - ends[leg]) / Math.max(1, ends[leg + 1] - ends[leg]), off = (r() - 0.5) * 16 * S;
      push([0, 0, 0], [a[0] + dx * u - (dz / L) * off, a[1] + (b[1] - a[1]) * u + 0.0006, a[2] + dz * u + (dx / L) * off], 0, m, f, leg, 0.85 + 0.15 * r());
    }
  }
  // the van: a box body and a cab, in units of its own length (scaled by uShape), edges dense
  const boxPts = (cx, cy, cz, sx, sy, sz, n, Lb) => { for (let k = 0; k < n; k++) { const e = r() < 0.6; let x = r() - 0.5, y = r() - 0.5, z = r() - 0.5; if (e) { const ax = Math.floor(r() * 3); const s1 = r() < 0.5 ? -0.5 : 0.5, s2 = r() < 0.5 ? -0.5 : 0.5; if (ax === 0) { y = s1; z = s2; } else if (ax === 1) { x = s1; z = s2; } else { x = s1; y = s2; } } else { const f = Math.floor(r() * 3), s = r() < 0.5 ? -0.5 : 0.5; if (f === 0) x = s; else if (f === 1) y = s; else z = s; } push([cx + x * sx, cy + y * sy + sy / 2, cz + z * sz], [0, 0, 0], 1, 0, 0, 0, e ? Lb : Lb * 0.7); } };
  boxPts(-0.12, 0, 0, 0.7, 0.42, 0.42, 900, 0.95); boxPts(0.36, 0, 0, 0.26, 0.3, 0.4, 400, 1.0);
  // households: a house outline (walls and a pitched roof) over a ring on the street
  header.households.forEach((hh, i) => {
    const b = hh.anchor.slice(); b[1] -= 3 * header.verticalExaggeration * S;
    for (let k = 0; k < 460; k++) {
      const pick = r(); let x, y, z, l;
      if (pick < 0.3) { const th = r() * Math.PI * 2; x = Math.cos(th) * 0.75; z = Math.sin(th) * 0.75; y = 0.02; l = 0.7; }
      else if (pick < 0.72) { const e = Math.floor(r() * 4), u = r() - 0.5; const s = e < 2 ? (e ? 0.3 : -0.3) : 0; x = e < 2 ? s : u * 0.6; z = e < 2 ? u * 0.6 : (e === 2 ? 0.3 : -0.3); y = r() < 0.5 ? r() * 0.45 : r() < 0.5 ? 0.45 : 0; l = 0.85; }
      else { const u = r() - 0.5, side = r() < 0.5 ? -1 : 1, v = r(); x = side * 0.3 * (1 - v); z = u * 0.6; y = 0.45 + v * 0.32; l = 0.95; }
      push([x, y, z], b, 2, 0, 0, i, l);
    }
  });
  const g = new THREE.BufferGeometry(), F = (arr, n) => new THREE.BufferAttribute(new Float32Array(arr), n);
  g.setAttribute("position", F(P3, 3)); g.setAttribute("aBase", F(base, 3)); g.setAttribute("aType", F(type, 1)); g.setAttribute("aM", F(aM, 1)); g.setAttribute("aF", F(aF, 1)); g.setAttribute("aIdx", F(idx, 1)); g.setAttribute("aSeed", F(seed, 1)); g.setAttribute("aL", F(light, 1));
  const u = { uTime: U.uTime, uSway: U.uSway, uTilt: U.uTiltB, uScale: U.uScaleB, uOff: U.uOffB, uSize: U.uSize, uPR: U.uPR,
    uShow: { value: 0 }, uReveal: { value: 0 }, uDone: { value: 0 }, uDelayOn: { value: 0 }, uDelay0: { value: 0 }, uDelay1: { value: 0 }, uVanShow: { value: 0 }, uShape: { value: 0.04 }, uRouteOn: { value: 0 },
    uVan: { value: new THREE.Vector3() }, uVanDir: { value: new THREE.Vector2(1, 0) }, uHS: { value: [0, 0, 0, 0, 0, 0] } };
  const mat = new THREE.ShaderMaterial({ uniforms: u, vertexShader: OV_VERT, fragmentShader: OV_FRAG, ...ADDITIVE_PREMULTIPLIED });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; engine.group.add(pts);
  return { pts, u };
}
// where along the route the van is (map units), and its heading
function routeAt(m) {
  let lo = 0, hi = routeM.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (routeM[mid] <= m) lo = mid; else hi = mid - 1; }
  const i = Math.min(lo, routeM.length - 2), a = routePts[i], b = routePts[i + 1], u = Math.max(0, Math.min(1, (m - routeM[i]) / Math.max(1, routeM[i + 1] - routeM[i])));
  let dx = b[0] - a[0], dz = b[2] - a[2]; const L = Math.hypot(dx, dz) || 1;
  return { p: [a[0] + dx * u, a[1] + (b[1] - a[1]) * u, a[2] + dz * u], d: [dx / L, dz / L] };
}
let showT0 = 0, vanDir = [1, 0], paintKey = "", shown = false;
// one frame by hand (when the motion is paused or reduced, the engine's own loop is idle)
function paint(now) { firstFrame(); drawOverlay(now); engine.render(); }
function firstFrame() { if (shown) return; shown = true; requestAnimationFrame(() => root.classList.add("dl-live")); setTimeout(() => root.classList.add("dl-ready"), reduce || STILL ? 0 : 2900); }
const ST_CODE = { packed: 1, pending: 1, next: 2, door: 2, delivered: 3, missed: 4, rebooked: 5 };
function updateOverlay(S) {
  if (!overlay) return; const u = overlay.u, now = performance.now();
  u.uShow.value = STILL || reduce ? 1 : Math.min(1, Math.max(0, (now - showT0) / 900));
  const onRoad = t >= P.routeT0;
  u.uRouteOn.value = onRoad || reduce || STILL ? 1 : 0;
  u.uReveal.value = reduce || STILL ? 1 : Math.min(1, Math.max(0, (t - P.routeT0) / 2.2)) * 1.0001;
  u.uDone.value = onRoad && !STILL ? S.vanM : -1;
  const tr = P.beats.find((b) => b.traffic); u.uDelayOn.value = tr && t >= tr.t0 && t < tr.t1 ? 1 : 0; if (tr) { u.uDelay0.value = tr.m0 - 120; u.uDelay1.value = tr.m1 + 120; }
  const at = routeAt(S.vanM); u.uVan.value.set(at.p[0], at.p[1] + 0.0008, at.p[2]);
  if (Math.abs(at.d[0]) + Math.abs(at.d[1]) > 0) { vanDir = [vanDir[0] + (at.d[0] - vanDir[0]) * 0.25, vanDir[1] + (at.d[1] - vanDir[1]) * 0.25]; const l = Math.hypot(...vanDir) || 1; u.uVanDir.value.set(vanDir[0] / l, vanDir[1] / l); }
  u.uVanShow.value = S.stage >= 3 || STILL || reduce ? 1 : 0.0;
  const st = S.homes.map((h) => (h.st === "pending" && S.next?.id === h.id ? 2 : ST_CODE[h.st] || 1));
  u.uHS.value = STILL ? [1, 1, 1, 1, 1, 1] : st;
  u.uShape.value = Math.max(0.036, 16 / pxPerUnit);     // the van and houses stay a readable size on screen (drawn larger than life)
}

// ------------------------------------------------------------------------------------------------ callouts on the map: placement and leader lines
const anchorOf = (key) => {
  if (!header) return null;
  if (key === "store") return header.store.anchor;
  if (key === "van") { const S = J.stateAt(P, t); if (S.stage < 3 && !reduce && !STILL) return null; const a = routeAt(S.vanM); return [a.p[0], a.p[1] + overlay.u.uShape.value * 0.5, a.p[2]]; }
  const h = header.households.find((x) => x.id === key); return h ? [h.anchor[0], h.anchor[1] + overlay.u.uShape.value * 0.6, h.anchor[2]] : null;
};
let layout = new Map(), lastVanLayout = 0, lastKeys = "";
function visibleKeys() {
  const S = J.stateAt(P, t), keys = ["store"];
  if (S.stage >= 3 || reduce) keys.push("van");
  if (S.stage >= 4 || reduce) keys.push(...J.IDS);
  return keys;
}
function layoutCallouts() {
  const W = canvas.clientWidth, H = canvas.clientHeight, S = J.stateAt(P, t), narrow = W < 700, tiny = W < 520;
  const bRect = box.getBoundingClientRect();
  const avoid = [insetEl.hidden ? null : insetEl, document.querySelector(".askb")].filter(Boolean).map((e) => { const r = e.getBoundingClientRect(); return { left: r.left - bRect.left, top: r.top - bRect.top, right: r.right - bRect.left, bottom: r.bottom - bRect.top }; }).filter((r) => r.right > r.left);
  const keys = visibleKeys(), active = new Set(["store", "van", J.IDS[J.FOCUS]]);
  for (const h of S.homes) if (h.st === "door" || h.st === "missed" || (S.next && S.next.id === h.id)) active.add(h.id);
  const RANK = (k) => (k === "van" ? 0 : k === "store" ? 1 : active.has(k) ? 2 : 3);
  const items = CO.filter((c) => keys.includes(c.key)).sort((a, b) => RANK(a.key) - RANK(b.key));
  CO.forEach((c) => { const home = J.IDS.includes(c.key); c.el.classList.toggle("compact", home && (narrow || !active.has(c.key)) || (narrow && c.key === "van")); c.el.classList.toggle("tiny", home && tiny && !active.has(c.key)); });
  const pts = new Map(items.map((c) => { const a = anchorOf(c.key); return [c, a ? engine.project(a) : null]; }));
  const placed = [], lines = [], hits = (r, a, pad = 6) => !(r.right + pad < a.left || r.left - pad > a.right || r.bottom + pad < a.top || r.top - pad > a.bottom);
  const crosses = (p, r, a) => { for (let k = 1; k < 12; k++) { const u = k / 12, x = p.x + ((r.left + r.right) / 2 - p.x) * u, y = p.y + ((r.top + r.bottom) / 2 - p.y) * u; if (x > a.left && x < a.right && y > a.top && y < a.bottom) return true; } return false; };
  layout = new Map();
  for (const c of items) {
    const p = pts.get(c); if (!p || p.x < 4 || p.y < 4 || p.x > W - 4 || p.y > H - 4) continue;
    const w = c.el.offsetWidth, h = c.el.offsetHeight; let best = null;
    for (const dx of [-w - 90, -w - 44, -w - 22, -w / 2, 22, 44, 90]) for (const dy of [-h - 120, -h - 70, -h - 44, -h - 24, -h / 2, 24, 44, 70, 120]) {
      const r = { left: p.x + dx, top: p.y + dy, right: p.x + dx + w, bottom: p.y + dy + h };
      if (r.left < 6 || r.top < 6 || r.right > W - 6 || r.bottom > H - 6) continue;
      let pen = 0;
      if (avoid.some((a) => hits(r, a))) pen += 5000;
      if (placed.some((a) => hits(r, a))) pen += 9000;
      for (const o of items) { const q = pts.get(o); if (q && hits(r, { left: q.x, right: q.x, top: q.y, bottom: q.y }, o === c ? 10 : 8)) pen += o === c ? 4000 : 1500; }
      if (placed.some((a) => crosses(p, r, a)) || lines.some(([lp, lr]) => crosses(lp, lr, r))) pen += 400;
      const gx = Math.max(r.left - p.x, 0, p.x - r.right), gy = Math.max(r.top - p.y, 0, p.y - r.bottom), score = pen + Math.abs(Math.hypot(gx, gy) - 34) * 2 + (dy > 0 ? 6 : 0);   // a leader line about 34 px long: clear of its anchor, close enough to read as one
      if (!best || score < best[0]) best = [score, dx, dy, r];
    }
    if (best && best[0] < 4000) { placed.push(best[3]); lines.push([p, best[3]]); layout.set(c, [best[1], best[2]]); }
  }
  layoutDirty = false;
}
function leader(p, r, fresh) {
  const bx = p.x < r.left ? r.left : p.x > r.right ? r.right : p.x, by = (r.top + r.bottom) / 2, elbow = Math.abs(p.y - by) > 6 && (p.x < r.left || p.x > r.right);
  const d = elbow ? `M${p.x},${p.y} L${p.x},${by} L${bx},${by}` : `M${p.x},${p.y} L${bx},${p.y < r.top ? r.top : p.y > r.bottom ? r.bottom : by}`;
  return `<path d="${d}" class="${fresh ? "new" : ""}"/><circle cx="${p.x}" cy="${p.y}" r="2.5"/><circle cx="${p.x}" cy="${p.y}" r="6" class="ring"/>`;
}
function drawOverlay(now) {
  if (STILL || !labelsOn || engine.morphing()) { CO.forEach((c) => c.el.classList.remove("on")); svg.replaceChildren(); return; }
  const vk = visibleKeys().join(","); if (vk !== lastKeys) { lastKeys = vk; layoutDirty = true; }
  if (layoutDirty) layoutCallouts();
  // the van moves: re-place everyone now and then so its label keeps clear of the others and stays close
  if (now - lastVanLayout > 700 && layout.size) { lastVanLayout = now; const v = [...layout.keys()].find((c) => c.key === "van"); if (v) { const p = engine.project(anchorOf("van")), o = layout.get(v), r = { left: p.x + o[0], top: p.y + o[1], right: p.x + o[0] + v.el.offsetWidth, bottom: p.y + o[1] + v.el.offsetHeight }; const far = Math.hypot(Math.max(r.left - p.x, 0, p.x - r.right), Math.max(r.top - p.y, 0, p.y - r.bottom)) > 120; const W = canvas.clientWidth, H = canvas.clientHeight; if (far || r.left < 0 || r.top < 0 || r.right > W || r.bottom > H || [...layout.entries()].some(([c, oo]) => { if (c === v) return false; const q = engine.project(anchorOf(c.key)); const rr = { left: q.x + oo[0], top: q.y + oo[1], right: q.x + oo[0] + c.el.offsetWidth, bottom: q.y + oo[1] + c.el.offsetHeight }; return !(r.right < rr.left || r.left > rr.right || r.bottom < rr.top || r.top > rr.bottom) || (p.x > rr.left && p.x < rr.right && p.y > rr.top && p.y < rr.bottom); })) layoutCallouts(); } }
  const parts = [], S = J.stateAt(P, t);
  for (const c of CO) {
    const off = layout.get(c); c.el.classList.toggle("on", !!off); if (!off) continue;
    const p = engine.project(anchorOf(c.key)), x = Math.round(p.x + off[0]), y = Math.round(p.y + off[1]);
    c.el.style.transform = `translate(${x}px, ${y}px)`;
    parts.push(leader(p, { left: x, top: y, right: x + c.el.offsetWidth, bottom: y + c.el.offsetHeight }, c.key === "van" || c.el.dataset.st === "door" || c.el.dataset.st === "missed"));
    const pulse = (c.key === "store" && S.stage >= 1 && S.stage <= 3) || (c.key === "van" && S.stage >= 4 && !S.back) || c.el.dataset.st === "door" || c.el.dataset.st === "missed" || c.el.dataset.st === "next";
    if (pulse) { const k = reduce ? 0.5 : ((now / 2400) + CO.indexOf(c) * 0.17) % 1; parts.push(`<circle cx="${p.x}" cy="${p.y}" r="${(6 + 16 * k).toFixed(1)}" class="pulse" style="opacity:${(0.75 * (1 - k)).toFixed(2)}"/>`); }
  }
  // the inset is tied to the store by its own leader line
  if (!insetEl.hidden) { const p = engine.project(header.store.anchor), bR = box.getBoundingClientRect(), r = insetEl.getBoundingClientRect(); parts.push(leader(p, { left: r.left - bR.left, top: r.top - bR.top, right: r.right - bR.left, bottom: r.bottom - bR.top }, false)); }
  svg.innerHTML = parts.join("");
}

async function startMap() {
  root.classList.add("dl-on"); engine.resize();
  if (!header) await loadHeader(); if (!header) throw new Error("no map header");
  form = await loadForm(engine.N);
  for (let i = 0; i < form.n; i += Math.max(1, Math.floor(form.n / 5000))) sample.push([form.pos[i * 3], form.pos[i * 3 + 1], form.pos[i * 3 + 2]]);
  placement = fit(); engine.setLift(0.5, 0.5); engine.setSway(STILL ? 0 : 0.18);
  engine.assembleFrom(form, { offset: placement.offset, scale: placement.scale, tilt: placement.tilt, ms: 3000 });
  overlay = buildOverlay(); mapReady = true; showT0 = performance.now() + (reduce ? 0 : 2400);
  engine.onFrame = (now) => { firstFrame(); drawOverlay(now); };
  setTimeout(() => { labelsOn = true; layoutDirty = true; if (!reduce && !STILL) engine.scan(3000, -0.3, 0.5); if (!playing) paint(performance.now()); }, reduce || STILL ? 0 : 3100);
  engine.start(); engine.pause(!playing); if (!playing) paint(performance.now());
  if (STILL) { updateOverlay(J.stateAt(P, t)); setTimeout(() => { paint(performance.now()); window.stillAspect = placement.aspect; window.stillReady = true; }, 400); }
  let rt;
  addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { engine.resize(); placement = fit(); engine.setForm(form, { ...placement, immediate: true }); layoutDirty = true; if (!playing) { updateOverlay(J.stateAt(P, t)); drawOverlay(performance.now()); engine.render(); } }, 150); });
  new IntersectionObserver(([e]) => { if (e.isIntersecting) engine.start(); else engine.stop(); }).observe(box);
}

// ------------------------------------------------------------------------------------------------ go
(async () => {
  if (STILL) root.classList.add("dl-still");
  await loadHeader(); rebuild(); renderBelow();
  if (reduce) t = keyT(0);
  if (window.__assemblLive) onFeeds(window.__assemblLive);
  setPlaying(playing); update(true); requestAnimationFrame(tick);
  if (engine) startMap().catch((e) => { console.warn("Map:", e.message); root.classList.remove("dl-on", "dl-live", "dl-ready"); root.classList.add("dl-nogl"); try { engine.dispose(); } catch (_) { /* gone */ } engine = null; });
})();
// for the page check (delivery/check-delivery.cjs): read-only views of the run
window.__delivery = { get stage() { return P ? J.stateAt(P, t).stage : -1; }, get t() { return t; }, get waiting() { return waiting; }, get map() { return mapReady; }, goStage: (k) => goStage(k), choose: (k, v) => choose(k, v, "you") };
