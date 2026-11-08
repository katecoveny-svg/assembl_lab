// assembl lab · Friday night on the Viaduct: the page. Builds the night (sim.js), drives the clock, the story, the agents' feed, the
// guest's phone, the proof and the text version, and hands the moment to the two point clouds (map.js, plan.js). Without WebGL the
// page is the same story over a still of the waterfront, with the callouts as a list; with reduced motion it opens as one complete
// still moment (8:20 pm) with every callout, and the clock only moves when you move it.
import { simulate, floorAt, momentAt, clock, AGENTS, MENU, DRINKS, T_END, LIMITS } from "./sim.js";

const $ = (id) => document.getElementById(id);
const root = document.documentElement, params = new URLSearchParams(location.search);
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const STILL = params.get("still");                       // tools only: render a still of the map or the plan
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const parseT = (v) => { if (v == null || v === "") return null; if (/^\d{1,2}:\d{2}$/.test(v)) { const [h, m] = v.split(":").map(Number); return Math.max(0, Math.min(T_END, (h < 12 ? h + 12 : h) * 60 + m - 1020)); } const n = +v; return isFinite(n) ? Math.max(0, Math.min(T_END, n)) : null; };
const SHORT = { book: "Bookings", walk: "Walk-ins", wait: "Waitlist", kitchen: "Kitchen", rain: "Weather", noshow: "No-show", close: "Close-out", proof: "Proof" };

// ------------------------------------------------------------------------------------------------ sunset (calculated)
// The NOAA solar equations for Auckland on the coming Friday (the Example Friday's real calendar twin), in New Zealand time.
const AKL = { lat: -36.8485, lon: 174.7633 };
function nextFriday() { const now = new Date(), nz = new Date(now.toLocaleString("en-US", { timeZone: "Pacific/Auckland" })); const d = new Date(nz); d.setDate(nz.getDate() + ((5 - nz.getDay() + 7) % 7)); return d; }
function sunsetFor(d) {
  const start = Date.UTC(d.getFullYear(), 0, 1), N = Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - start) / 864e5) + 1, g = (2 * Math.PI / 365) * (N - 1 + (19 - 12) / 24);
  const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const dec = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const lat = AKL.lat * Math.PI / 180, ha = Math.acos(Math.cos(90.833 * Math.PI / 180) / (Math.cos(lat) * Math.cos(dec)) - Math.tan(lat) * Math.tan(dec)) * 180 / Math.PI;
  const utcMin = 720 - 4 * (AKL.lon - ha) - eq, at = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) + utcMin * 60e3);
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "numeric", hourCycle: "h23", day: "numeric" }).formatToParts(at).map((p) => [p.type, p.value]));
  return { minutes: +parts.hour * 60 + +parts.minute, date: d };
}
const FRI = nextFriday(), SUN = sunsetFor(FRI), SUN_T = SUN.minutes - 1020;
const friLabel = FRI.toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long" });

// ------------------------------------------------------------------------------------------------ the night
const W0 = params.get("wrong");
const state = { wrong: !!W0 && W0 !== "0", set: new Set(W0 && W0 !== "1" && W0 !== "0" ? W0.split(",") : ["rain", "group", "kitchen"]), t: 0, playing: !reduce && params.get("paused") !== "1", speed: +(params.get("speed") || 2) };
let night, base;
function build() {
  const w = state.wrong ? state.set : new Set(), o = { rain: w.has("rain"), group: w.has("group"), kitchen: w.has("kitchen") };
  night = simulate(o); base = simulate({ ...o, agents: false }); night.sunset = SUN_T;
  night.featuredWait = night.parties.filter((p) => p.kind === "walkin" && !p.group && p.joinAt != null && p.seatedAt != null && p.quote?.mid >= 20).sort((a, b) => (b.size >= 3) - (a.size >= 3) || a.joinAt - b.joinAt)[0]
    || night.parties.find((p) => p.joinAt != null && p.seatedAt != null);
  const rel = night.parties.find((p) => p.noShow && p.released != null), tb = rel && night.tables.find((x) => x.id === rel.table);
  night.refillParty = rel && night.parties.find((p) => p.seatedAt != null && p.seatedAt >= rel.released && p.seatedAt < rel.released + 40 && (p.table === rel.table || tb?.seg.some((g) => g.party === p.id)));
  renderStatic(); lastKey = null;
}

// ------------------------------------------------------------------------------------------------ static parts (rebuilt with the night)
function statusOf(e) {
  const k = e.status.kind;
  if (k === "limits") return { text: "Within the limits staff set", ok: true };
  if (k === "approved") return { text: `Approved by the ${e.status.by} · ${clock(e.status.at)}`, ok: true };
  if (k === "recommend") return { text: "Recommendation · staff decide" };
  if (k === "observe") return { text: "Observed · flagged only" };
  if (k === "draft") return { text: e.closeout ? "Draft · nothing sent" : "Draft · waiting for staff" };
  return { text: k };
}
const evHTML = (e, cls = "") => { const s = statusOf(e); return `<li class="${cls}" data-t="${e.t}"><div class="meta"><time>${clock(e.t)}</time><b>${esc(AGENTS[e.agent].name)}</b><span class="auth">${esc(e.auth)}</span></div>${esc(e.text)}<span class="status${s.ok ? " ok" : ""}">${esc(s.text)}</span></li>`; };
const msgStatus = (m) => m.status === "limits" ? `Sent within limits staff set · ${clock(m.sentAt)}` : m.status === "approved" ? `Approved by the ${m.approvedBy} · sent ${clock(m.sentAt)}` : "Draft · not sent";
function renderStatic() {
  // the agents
  $("agent-grid").innerHTML = Object.entries(AGENTS).map(([k, a]) => `<li data-agent="${k}"><h3>${esc(a.name)}</h3><span class="auth">${esc(a.auth)}</span><p>${esc(a.limit)}</p><span class="count" data-count="${k}"></span></li>`).join("");
  // the chapter ticks
  $("ticks").innerHTML = night.chapters.map((c) => `<li><button type="button" data-t="${c.t}" aria-label="${esc(clock(c.t))}: ${esc(c.title)}">${esc(SHORT[c.id] || c.title)}</button></li>`).join("");
  $("ticks").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { setT(+b.dataset.t + (b.dataset.t === "0" ? 0 : 1.5)); }));
  // the text version: chapters, the agents' actions and the guests' messages, in order
  const items = [...night.chapters.map((c) => ({ t: c.t - 0.01, html: `<li class="ch" data-t="${c.t}"><time>${clock(c.t)}</time><div><strong>${esc(c.title)}</strong><br>${esc(c.line)}</div></li>` })),
    ...night.events.map((e) => ({ t: e.t, html: `<li data-t="${e.t}"><time>${clock(e.t)}</time><div><p class="ev-meta"><b>${esc(AGENTS[e.agent].name)} agent</b><span class="auth">${esc(e.auth)}</span><span>${esc(statusOf(e).text)}</span></p>${esc(e.text)}</div></li>` })),
    ...night.messages.filter((m) => m.status !== "draft" || m.kind === "followup").map((m) => ({ t: m.t + 0.001, html: `<li data-t="${m.t}"><time>${clock(m.t)}</time><div><p class="ev-meta"><b>Message to ${esc(m.guest)}</b><span>${esc(msgStatus(m))}</span></p>“${esc(m.text)}”</div></li>` }))].sort((a, b) => a.t - b.t);
  $("night-list").innerHTML = items.map((i) => i.html).join("");
  // proof
  const m = night.metrics, b = base.metrics;
  const mins = (a) => a.length ? a.join(" and ") + " min" : "";
  $("proof-grid").innerHTML = [
    ["Covers served", `${m.covers}<small>covers</small>`, `${m.parties} tables seated from bookings and walk-ins, ${clock(0)} to ${clock(330)} last orders.`, `Same night without the agents: ${b.covers} covers`],
    ["Quoted against actual wait", `${m.quoted}<small>min quoted</small> ${m.actual}<small>min waited</small>`, `Averages for the ${m.waitedN} walk-in parties who waited for a table. ${m.inRangeN} of ${m.waitedN} waited no longer than the top of their quoted range.`, `Without the agents: told about ${b.quoted} min, waited ${b.actual} min on average, standing at the door`],
    ["Walk-ins kept", `${m.kept}<small>of ${m.walkins}</small>`, `${m.straightIn} walked straight in; ${m.kept - m.straightIn} waited nearby and were seated. ${m.lost} chose not to wait or left the list${m.tooLate ? `; ${m.tooLate} came too late to seat honestly` : ""}.`, `Without the agents: ${b.kept} of ${b.walkins} kept`],
    ["No-shows refilled", `${m.refilled}<small>of ${m.noShows}</small>`, m.refilled ? `The table went to the next party on the waitlist${m.refillMin.length ? `, back in use ${mins(m.refillMin)} after release` : ""}. A check-in went at ten minutes late; the table was released at fifteen.` : `No party on the waitlist fitted the released table.`, `Without the agents: ${b.refilled} of ${b.noShows}, released at thirty minutes`],
    ["Staff interventions", `${m.approvals}<small>approvals</small>`, `The host and duty manager approved ${m.approvedMessages} guest message${m.approvedMessages === 1 ? "" : "s"}, ${m.comps} comp${m.comps === 1 ? "" : "s"} ($${m.compCost}) and ${m.replans} re-plan of the floor. ${m.withinLimits} messages went within the limits they set; ${m.drafts} follow-up${m.drafts === 1 ? " is" : "s are"} left as a draft.`, `Limits: ${LIMITS.text.toLowerCase()}`],
  ].map(([h, v, p, c]) => `<div class="metric"><h3>${h}</h3><p class="v">${v}</p><p>${esc(p)}</p><span class="cmp">${esc(c)} · Simulated</span></div>`).join("");
  $("night-lede").textContent = state.wrong ? `The same timeline as the map, as text. This is the night gone wrong: ${[...state.set].map((k) => ({ rain: "a rainstorm", group: "a big walk-in group", kitchen: "the kitchen behind" })[k]).join(", ")}.` : "The same timeline as the map, as text. It changes when you make the night go wrong.";
}

// ------------------------------------------------------------------------------------------------ the moment
let lastKey = null, lastChapter = null;
function render(force = false) {
  const t = state.t, key = Math.floor(t * 2) + (state.wrong ? "w" : "") + [...state.set].join("");
  if (!force && key === lastKey) return; lastKey = key;
  const mo = momentAt(night, t), floor = floorAt(night, t);
  $("clock").textContent = mo.clock; $("ph-time").textContent = mo.clock.replace(/ [ap]m$/, "");
  $("chapter-title").textContent = mo.chapter.title; $("chapter-line").textContent = mo.chapter.line;
  const scrub = $("scrub"); if (document.activeElement !== scrub || !scrubbing) scrub.value = Math.round(t); scrub.setAttribute("aria-valuetext", `${mo.clock}, ${mo.chapter.title}`);
  $("ticks").querySelectorAll("button").forEach((b) => { if (+b.dataset.t === mo.chapter.t) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current"); });
  // counts
  const covers = floor.reduce((a, f) => a + (f.party && !["held", "booked"].includes(f.state) && !(f.party.group && f.id !== 9) ? f.party.size : 0), 0);
  $("c-seated").textContent = covers;
  $("c-wait").textContent = mo.waiting.length;
  $("c-pass").textContent = mo.load ?? 0; $("c-ticket").textContent = mo.ticket ? `${Math.round(mo.ticket)} min avg` : "on the pass";
  $("c-wx").textContent = mo.rain > 0.68 ? "Storm" : mo.rain > 0.05 ? "Rain" : t < night.rain.flag ? "Dry" : t < night.rain.start - 12 ? "Rain due" : "Dry";
  $("c-deck").textContent = t >= night.deck.closeAt ? "deck shut" : "deck open";
  // the pass through the night so far
  const S = night.series, upto = Math.max(1, Math.min(S.length - 1, Math.floor(t))), maxL = Math.max(10, ...S.map((s) => s.load));
  const pts = S.slice(0, upto + 1).map((s, i) => `${(i / T_END * 300).toFixed(1)},${(34 - (s.load / maxL) * 30).toFixed(1)}`).join(" ");
  $("spark").innerHTML = `<polygon class="area" points="0,34 ${pts} ${(upto / T_END * 300).toFixed(1)},34"/><polyline points="${pts}"/><line x1="${(upto / T_END * 300).toFixed(1)}" x2="${(upto / T_END * 300).toFixed(1)}" y1="0" y2="36"/>`;
  // feed: the latest three agent actions
  const done = night.events.filter((e) => e.t <= t + 0.01), recent = done.slice(-3).reverse();
  const M = night.metrics, B = base.metrics;
  if (mo.chapter.id === "proof") $("feed").innerHTML = `<li class="fresh"><div class="meta"><b>Proof</b><span class="auth">Simulated</span></div><span class="pv">${M.covers}</span> covers served. Walk-ins quoted <span class="pv">${M.quoted}</span> min on average and waited <span class="pv">${M.actual}</span>; ${M.inRangeN} of ${M.waitedN} no longer than their range.<span class="status">Same night without the agents: told ${B.quoted} min, waited ${B.actual}</span></li><li class="fresh"><div class="meta"><b>Proof</b><span class="auth">Simulated</span></div><span class="pv">${M.kept}</span> of ${M.walkins} walk-ins kept, <span class="pv">${M.refilled}</span> of ${M.noShows} no-show${M.noShows === 1 ? "" : "s"} refilled, <span class="pv">${M.approvals}</span> staff approvals. <a href="#proof">The full proof</a><span class="status">Without the agents: ${B.kept} of ${B.walkins} kept, ${B.refilled} of ${B.noShows} refilled</span></li>`;
  else $("feed").innerHTML = recent.map((e, i) => evHTML(e, i === 0 && t - e.t < 6 ? "fresh" : "")).join("") || `<li><div class="meta"><time>${clock(0)}</time><b>Booking</b><span class="auth">act within limits</span></div>The book is open. Bookings made earlier in the week are already on the floor plan.<span class="status ok">Within the limits staff set</span></li>`;
  $("log").innerHTML = done.map((e) => evHTML(e)).join(""); $("log-n").textContent = `${done.length} so far`;
  document.querySelectorAll("[data-count]").forEach((el) => { const n = done.filter((e) => e.agent === el.dataset.count).length; el.textContent = `${n} action${n === 1 ? "" : "s"} so far tonight`; });
  document.querySelectorAll("#night-list li").forEach((li) => li.classList.toggle("future", +li.dataset.t > t + 0.01));
  // callouts' live lines
  const late = floor.filter((f) => f.state === "late").length;
  setLive("rest", `${covers} seated${late ? `, ${late} table${late === 1 ? "" : "s"} waiting long for mains` : ""} · ${t >= night.deck.closeAt ? "deck closed for the rain" : "deck open"}`);
  const wp = mo.waiting.reduce((a, p) => a + p.size, 0);
  setLive("wait", mo.waiting.length ? `${mo.waiting.length} part${mo.waiting.length === 1 ? "y" : "ies"} (${wp} people) waiting nearby, not in a queue` : "No one waiting. When it's full, guests wait here, not at the door");
  const recentW = night.parties.filter((p) => p.kind === "walkin" && p.arrive != null && p.arrive <= t && p.arrive > t - 30).length;
  setLive("wharf", recentW ? `${recentW} walk-in part${recentW === 1 ? "y" : "ies"} arrived in the last half hour, on real routes` : "Walk-ins come from Princes Wharf, Wynyard Quarter and the city");
  // the floor plan's summary (and the plan's own live text, for screen readers)
  const cnt = (s) => floor.filter((f) => f.state === s).length;
  $("plan-sum").textContent = `${cnt("seated") + cnt("waiting") + cnt("late") + cnt("eating")} of ${floor.filter((f) => f.state !== "closed").length} open tables in use · ${cnt("waiting") + cnt("late")} waiting for food${cnt("late") ? ` (${cnt("late")} late)` : ""} · ${cnt("clearing")} clearing · ${cnt("booked")} booked soon`;
  renderPhone(t, mo);
  // the stage's cards change size with the chapter (the proof cards are taller): place the callouts again, clear of them
  if (mo.chapter.id !== lastChapter) { const first = lastChapter == null; lastChapter = mo.chapter.id; if (!first) requestAnimationFrame(() => window.__viaduct.layoutLabels?.()); }
  window.__viaduct.moment = { t, clock: mo.clock, chapter: mo.chapter.id, covers, waiting: mo.waiting.length };
}
function setLive(k, text) { const el = document.querySelector(`[data-live="${k}"]`); if (el && el.textContent !== text) el.textContent = text; }

// ------------------------------------------------------------------------------------------------ the guest's phone
function featured(t, mo) {
  const id = mo.chapter.id, P = night.parties;
  const lastConfirm = night.messages.filter((m) => m.kind === "confirm" && m.t <= t).slice(-1)[0];
  const fw = night.featuredWait;
  if (id === "book" || id === "walk") return lastConfirm ? P[lastConfirm.party - 1] : null;
  if (id === "wait" || id === "kitchen") {
    const now = mo.waiting.filter((p) => !p.group);
    if (now.length) return now.find((p) => p.quote?.mid <= 60) || now[0];
    const seated = P.filter((p) => p.joinAt != null && p.seatedAt != null && p.seatedAt <= t).sort((a, b) => b.seatedAt - a.seatedAt)[0];
    return seated || (lastConfirm ? P[lastConfirm.party - 1] : null);
  }
  if (id === "rain") { const r = night.messages.find((m) => m.kind === "replan"); return r ? P[r.party - 1] : fw; }
  if (id === "noshow") return night.refillParty || P.find((p) => p.noShow);
  return P.find((p) => p.flagged) || fw;
}
function renderPhone(t, mo) {
  const p = featured(t, mo), scr = $("ph-screen");
  if (!p) { $("ph-who").textContent = "A guest's phone"; scr.innerHTML = `<div class="card"><h3>Bookings</h3>Confirmations go out as bookings come in, inside the limits staff set.</div>`; return; }
  $("ph-who").textContent = `${p.name} · ${p.size === 12 ? "group of 12" : "party of " + p.size}`;
  const mine = night.messages.filter((m) => m.party === p.id), sent = mine.filter((m) => m.sentAt != null && m.sentAt <= t), held = mine.filter((m) => m.t <= t && (m.sentAt == null || m.sentAt > t));
  const out = [];
  const waiting = p.joinAt != null && t >= p.joinAt && !(p.seatedAt != null && t >= p.seatedAt) && !(p.lostAt != null && t >= p.lostAt);
  if (waiting) {
    const pos = mo.waiting.indexOf(p), q = p.quote, dietOn = t >= p.dietAt, drinkOn = t >= p.drinksAt;
    out.push(`<div class="card"><h3>Your wait · honest quote</h3><div class="big">about ${q.mid} min</div><div class="sub">${q.lo} to ${q.hi} min · quoted ${clock(p.quotedAt)}${pos >= 0 ? ` · ${pos === 0 ? "next" : ordinal(pos + 1)} on the list` : ""}</div></div>`);
    const last = sent.slice(-1)[0]; if (last) out.push(`<div class="bubble">${esc(last.text)}<span class="status ok">${esc(msgStatus(last))}</span></div>`);
    out.push(`<div class="card"><h3>Anything the kitchen should know?</h3><div class="pills">${[["Gluten-free", "gluten"], ["Vegetarian", "vegetarian"], ["Nut allergy", "nut"], ["No, all good", "all good"]].map(([o, k]) => `<span class="${dietOn && p.diet.toLowerCase().includes(k) ? "on" : ""}">${o}</span>`).join("")}</div>${dietOn ? `<div class="sub">Sent to the kitchen: ${esc(p.diet)}</div>` : ""}</div>`);
    out.push(`<div class="card"><h3>Drinks for when you sit</h3><div class="pills">${DRINKS.slice(0, 4).map((d) => `<span class="${drinkOn && p.drinks.toLowerCase().includes(d.toLowerCase()) ? "on" : ""}">${esc(d)}</span>`).join("")}</div><div class="sub">${drinkOn ? `Pre-ordered: ${esc(p.drinks)}. Ready when you sit.` : "Or order at the table."}</div></div>`);
    out.push(`<div class="card"><h3>Menu preview</h3><ul>${MENU.slice(0, 3).map((d) => `<li><span>${esc(d.dish)}</span><span>$${d.price}</span></li>`).join("")}</ul></div>`);
  }
  else {
    if (p.kind === "booking") out.push(`<div class="card"><h3>Your booking</h3><div class="big">Friday ${clock(p.bookedFor)}</div><div class="sub">${p.size} people${p.movedInside ? " · moved inside for the rain" : ""}${p.noShow && p.released != null && t >= p.released ? " · released" : p.seatedAt != null && t >= p.seatedAt ? ` · arrived ${clock(p.arrive)}` : ""}</div></div>`);
    else if (p.quote) out.push(`<div class="card"><h3>Your wait · honest quote</h3><div class="big">${p.waited != null && p.seatedAt != null && t >= p.seatedAt ? `waited ${Math.round(p.waited)} min` : `about ${p.quote.mid} min`}</div><div class="sub">quoted ${p.quote.lo} to ${p.quote.hi} min at ${clock(p.quotedAt)}</div></div>`);
    for (const m of sent.slice(-3)) out.push(`<div class="bubble">${esc(m.text)}<span class="status ok">${esc(msgStatus(m))}</span></div>`);
  }
  if (p.seatedAt != null && t >= p.seatedAt) { const moved = typeof p.movedInside === "number" && t >= p.movedInside; out.push(`<p class="pending">Seated at table ${p.tables ? p.tables.join(", ") : p.firstTable ?? p.table}, ${clock(p.seatedAt)}${moved ? ` · moved inside to table ${p.table} for the rain, ${clock(p.movedInside)}` : ""}${p.leaveAt != null && t >= p.leaveAt ? ` · left ${clock(p.leaveAt)}` : ""}</p>`); }
  if (p.noShow && p.released != null && t >= p.released) out.push(`<p class="pending">No reply. Table released ${clock(p.released)}.</p>`);
  if (held.length) out.push(`<p class="pending">Not on the guest's phone yet: ${held.length} draft${held.length === 1 ? "" : "s"} ${held.some((m) => m.status === "draft") ? "left unsent for the duty manager" : "waiting for the host"}</p>`);
  if (!out.length) out.push(`<div class="card"><h3>${p.kind === "booking" ? "Booking" : "Walk-in"}</h3>${p.kind === "booking" ? `Friday ${clock(p.bookedFor)} for ${p.size}.` : `Arriving along the promenade.`}</div>`);
  scr.innerHTML = out.join("");
}
const ordinal = (n) => n + (n % 10 === 1 && n % 100 !== 11 ? "st" : n % 10 === 2 && n % 100 !== 12 ? "nd" : n % 10 === 3 && n % 100 !== 13 ? "rd" : "th");

// ------------------------------------------------------------------------------------------------ controls
let scrubbing = false;
function setT(t) { state.t = Math.max(0, Math.min(T_END, t)); render(true); redraw(); }
function setPlaying(v) {
  state.playing = v; const pp = $("pp"); pp.setAttribute("aria-pressed", String(!v)); pp.setAttribute("aria-label", v ? "Pause motion" : "Play motion");
  if (gl) { gl.map.engine.pause(!v && !reduce); gl.plan?.engine.pause(!v && !reduce); if (reduce) { if (v) { gl.map.engine.start(); gl.plan?.engine.start(); } else { gl.map.engine.stop(); gl.plan?.engine.stop(); redraw(); } } }
}
$("pp").addEventListener("click", () => { if (!state.playing && state.t >= T_END - 0.5) state.t = 0; setPlaying(!state.playing); });
const scrub = $("scrub");
scrub.addEventListener("input", () => { scrubbing = true; setT(+scrub.value); });
scrub.addEventListener("change", () => { scrubbing = false; });
document.querySelectorAll(".speed button").forEach((b) => { b.setAttribute("aria-checked", String(+b.dataset.speed === state.speed)); b.addEventListener("click", () => { state.speed = +b.dataset.speed; document.querySelectorAll(".speed button").forEach((x) => x.setAttribute("aria-checked", String(x === b))); }); });
const wrongBtn = $("wrong"), wrongSet = $("wrong-set");
function syncWrong() { wrongBtn.setAttribute("aria-pressed", String(state.wrong)); wrongSet.disabled = !state.wrong; wrongSet.querySelectorAll("input").forEach((i) => (i.checked = state.set.has(i.value))); }
wrongBtn.addEventListener("click", () => { state.wrong = !state.wrong; syncWrong(); build(); render(true); redraw(); });
wrongSet.addEventListener("change", (e) => { if (e.target.checked) state.set.add(e.target.value); else state.set.delete(e.target.value); if (!state.set.size) { state.wrong = false; state.set = new Set(["rain", "group", "kitchen"]); } syncWrong(); build(); render(true); redraw(); });
addEventListener("keydown", (e) => { if (e.target.matches("input, textarea")) return; if (e.key === " " && e.target === document.body) { e.preventDefault(); $("pp").click(); } });

// ------------------------------------------------------------------------------------------------ the clock
let lastNow = performance.now();
function tick(now) {
  requestAnimationFrame(tick); const dt = Math.min(0.25, (now - lastNow) / 1000); lastNow = now;
  if (state.playing && !scrubbing && ready) { state.t = Math.min(T_END, state.t + dt * state.speed); if (state.t >= T_END) setPlaying(false); }
  render();
}

// ------------------------------------------------------------------------------------------------ the point clouds
let gl = null, ready = false;
window.__viaduct = { get t() { return state.t; }, get night() { return night; }, get base() { return base; }, setT, play: () => setPlaying(true), pause: () => setPlaying(false), get playing() { return state.playing; }, get gl() { return !!gl; }, ready: false, sunset: SUN, mode: reduce ? "reduce" : "motion" };
function redraw() { if (!gl) return; if (reduce || !state.playing || gl.map.engine.paused) { gl.frame(performance.now()); gl.map.engine.render(); gl.plan?.engine.render(); } }

async function startGL() {
  let mapMod, planMod;
  try { [mapMod, planMod] = await Promise.all([import("./map.js"), import("./plan.js")]); } catch (e) { console.warn("Point cloud unavailable:", e.message); return false; }
  const phone = innerWidth < 720, canvas = $("map-canvas"), mapEl = $("map"), stage = $("stage");
  let map; try { map = mapMod.createMap(canvas, { reduce, phone, clear: STILL === "map" }); } catch (e) { console.warn("WebGL unavailable:", e.message); return false; }
  root.classList.add("pc-on");
  map.engine.resize();
  let data; try { data = await mapMod.loadViaduct(map.budget, map.nLights); } catch (e) { console.warn("Viaduct points:", e.message); root.classList.remove("pc-on"); map.engine.dispose(); return false; }
  const nightL = mapMod.attachNight(map, data, { reduce });
  const fit = mapMod.fitter(map.engine, data.form);
  const boxOf = () => { const cs = getComputedStyle(mapEl), px = (v) => parseFloat(cs.getPropertyValue(v)) || 0, w = mapEl.clientWidth, h = mapEl.clientHeight; return STILL ? { left: 0, top: 0, right: w, bottom: h, width: w, height: h } : { left: px("--fit-l"), top: px("--fit-t"), right: w - px("--fit-r"), bottom: h - px("--fit-b"), width: w - px("--fit-l") - px("--fit-r"), height: h - px("--fit-t") - px("--fit-b") }; };
  fit.useCore(['restaurant', 'viaduct', 'wharf', 'wynyard', 'skytower', 'wait'].map((k) => data.form.anchors[k]), 0.1);
  let place = fit.fit(boxOf(), canvas, 0.96);
  const liftAt = () => { const b = boxOf(); map.engine.setLift((b.left + b.width / 2) / mapEl.clientWidth, 1 - (b.top + b.height * 0.55) / mapEl.clientHeight); };
  liftAt(); map.engine.setSway(0.18);
  // the plan inset: same orientation as the map (the deck toward the harbour)
  let plan = null;
  if (STILL !== "map") try {
    const a = map.engine.project(data.plan(0, 0, 0), place), b = map.engine.project(data.plan(10, 0, 0), place);
    plan = planMod.createPlan($("plan-canvas"), { reduce, phone, flip: b.x < a.x ? -1 : 1 });
    plan.engine.resize(); plan.engine.setSway(0.12); plan.engine.setLift(0.5, 0.5);
    const pf = mapMod.fitter(plan.engine, plan.form, 0.06), pr = { left: 0, top: 0, width: plan.engine.renderer.domElement.clientWidth, height: plan.engine.renderer.domElement.clientHeight }; pr.right = pr.width; pr.bottom = pr.height;
    plan.place = pf.fit(pr, plan.engine.renderer.domElement, 0.92);
  } catch (e) { console.warn("Floor plan:", e.message); plan = null; }
  gl = { map, plan, data, nightL, frame: null }; window.__viaduct._gl = gl;
  // callouts: placed once beside their anchors (clear of the words, the phone, the plan and each other), then they follow the map
  const callouts = [...document.querySelectorAll(".callout")].map((el) => ({ el, key: el.dataset.anchor, primary: el.classList.contains("key") }));
  const svg = $("leaders");
  let layout = null, labelsOn = false;
  const anchorOf = (k) => data.form.anchors[k];
  const mapOffset = () => ({ x: mapEl.offsetLeft, y: mapEl.offsetTop });
  function layoutLabels() {
    const W = stage.clientWidth, H = stage.clientHeight, o = mapOffset(), mb = { left: o.x, top: o.y, right: o.x + mapEl.clientWidth, bottom: o.y + mapEl.clientHeight };
    const sr = stage.getBoundingClientRect(), rel = (r) => ({ left: r.left - sr.left, top: r.top - sr.top, right: r.right - sr.left, bottom: r.bottom - sr.top, width: r.width, height: r.height });
    const avoid = [...document.querySelectorAll(".intro h1, .intro .lede, .intro .chips, .intro .v2-eyebrow, .console > *, .phone .device, .plan, .feed")].map((e) => rel(e.getBoundingClientRect())).filter((r) => r.width && r.bottom > mb.top && r.top < mb.bottom);
    const narrow = W < 720, items = callouts.filter((c) => !narrow || c.key === "restaurant" || c.key === "wait" || c.key === "skytower");
    const pts = new Map(items.map((c) => { const p = map.engine.project(anchorOf(c.key)); return [c, { x: p.x + o.x, y: p.y + o.y }]; }));
    const hits = (r, a, pad = 8) => !(r.right + pad < a.left || r.left - pad > a.right || r.bottom + pad < a.top || r.top - pad > a.bottom);
    const CELL = 24, cols = Math.ceil(W / CELL), dens = new Float32Array(cols * Math.ceil(H / CELL) + cols);
    for (const s of fit.sample) { if (s[1] < 0.002) continue; const q = map.engine.project(s); const x = q.x + o.x, y = q.y + o.y; if (x >= 0 && y >= 0 && x < W && y < H) dens[Math.floor(y / CELL) * cols + Math.floor(x / CELL)]++; }
    const cover = (r) => { let c = 0; for (let y = Math.max(0, Math.floor(r.top / CELL)); y <= Math.min(Math.ceil(H / CELL) - 1, Math.floor(r.bottom / CELL)); y++) for (let x = Math.max(0, Math.floor(r.left / CELL)); x <= Math.min(cols - 1, Math.floor(r.right / CELL)); x++) c += dens[y * cols + x]; return c; };
    const crosses = (p, r, a) => { for (let k = 0; k <= 12; k++) { const t = k / 12, x = p.x + ((r.left + r.right) / 2 - p.x) * t, y = p.y + ((r.top + r.bottom) / 2 - p.y) * t; if (x > a.left && x < a.right && y > a.top && y < a.bottom) return true; } return false; };
    const placed = [], lines = []; layout = new Map();
    for (const c of items) {
      const p = pts.get(c); if (p.x < mb.left + 8 || p.x > mb.right - 8 || p.y < mb.top + 8 || p.y > mb.bottom - 8) continue;
      if (avoid.some((a) => hits({ left: p.x, right: p.x, top: p.y, bottom: p.y }, a, 2))) continue;
      const w = c.el.offsetWidth, h = c.el.offsetHeight; let best = null;
      for (const dx of [-w - 120, -w - 60, -w - 24, -w * 0.8, -w / 2, -w * 0.2, 24, 60, 120])
        for (const dy of [-h - 200, -h - 140, -h - 96, -h - 60, -h - 28, -h / 2, 28, 60, 100, 150]) {
          const r = { left: p.x + dx, top: p.y + dy, right: p.x + dx + w, bottom: p.y + dy + h };
          if (r.left < mb.left + 8 || r.top < mb.top + 8 || r.right > mb.right - 8 || r.bottom > mb.bottom - 8) continue;
          if (avoid.some((a) => hits(r, a)) || placed.some((a) => hits(r, a, 6))) continue;
          if (items.some((oc) => { const q = pts.get(oc); return hits(r, { left: q.x, right: q.x, top: q.y, bottom: q.y }, oc === c ? 12 : 8); })) continue;
          if (placed.some((a) => crosses(p, r, a)) || lines.some(([lp, lr]) => crosses(lp, lr, r))) continue;
          const gx = Math.max(r.left - p.x, 0, p.x - r.right), gy = Math.max(r.top - p.y, 0, p.y - r.bottom), dist = Math.hypot(gx, gy); if (dist > (c.primary ? 190 : 150)) continue;
          const score = cover(r) * (c.primary ? 0.6 : 1) + dist * 2.4;
          if (!best || score < best[0]) best = [score, dx, dy, r];
        }
      if (best) { placed.push(best[3]); lines.push([p, best[3]]); layout.set(c, [best[1], best[2]]); }
    }
    notesKey = null;
  }
  // anything left without a clear place beside its anchor is listed on the map (small screens), so every callout is always there
  let notesKey = null;
  function syncNotes() {
    const left = layout ? callouts.filter((c) => !layout.has(c)) : [], key = left.map((c) => c.el.textContent).join("|");
    if (key === notesKey) return; notesKey = key;
    $("map-notes").innerHTML = labelsOn ? left.map((c) => `<span><b>${esc(c.el.querySelector("strong").textContent)}</b>${c.primary ? ` · ${esc(c.el.querySelector("span").textContent)}` : ""}</span>`).join("") : "";
  }
  function drawLabels(now) {
    const show = labelsOn && layout && !map.engine.morphing(); const parts = []; const o = mapOffset();
    for (const c of callouts) {
      const off = show && layout.get(c); c.el.classList.toggle("on", !!off); if (!off) continue;
      const q = map.engine.project(anchorOf(c.key)), p = { x: q.x + o.x, y: q.y + o.y }, x = Math.round(p.x + off[0]), y = Math.round(p.y + off[1]);
      c.el.style.transform = `translate(${x}px, ${y}px)`;
      const r = { left: x, top: y, right: x + c.el.offsetWidth, bottom: y + c.el.offsetHeight };
      const bx = p.x < r.left ? r.left : p.x > r.right ? r.right : p.x, by = (r.top + r.bottom) / 2, elbow = Math.abs(p.y - by) > 6 && (p.x < r.left || p.x > r.right);
      const d = elbow ? `M${p.x.toFixed(1)},${p.y.toFixed(1)} L${p.x.toFixed(1)},${by.toFixed(1)} L${bx.toFixed(1)},${by.toFixed(1)}` : `M${p.x.toFixed(1)},${p.y.toFixed(1)} L${bx.toFixed(1)},${(p.y < r.top ? r.top : p.y > r.bottom ? r.bottom : by).toFixed(1)}`;
      parts.push(`<path d="${d}" class="${c.primary ? "key" : ""}"/><circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.5"/><circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="6" class="ring"/>`);
      if (c.key === "restaurant" || (c.key === "wait" && window.__viaduct.moment?.waiting)) { const k = reduce ? 0.5 : ((now / 2600) + (c.key === "wait" ? 0.5 : 0)) % 1; parts.push(`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${(7 + 16 * k).toFixed(1)}" class="pulse" style="opacity:${(0.75 * (1 - k)).toFixed(2)}"/>`); }
    }
    svg.innerHTML = parts.join(""); syncNotes();
  }
  // each frame: the night at this moment, on both clouds
  let shown = false, lastPlanT = -1;
  gl.frame = (now) => {
    nightL.update(night, state.t, now);
    if (plan && Math.abs(state.t - lastPlanT) > 0.2) { plan.update(floorAt(night, state.t)); lastPlanT = state.t; }
    if (!STILL) drawLabels(now);
  };
  map.engine.onFrame = (now) => {
    if (!shown) { shown = true; requestAnimationFrame(() => root.classList.add("pc-live")); setTimeout(() => root.classList.add("pc-ready"), reduce ? 0 : 3000); }
    gl.frame(now);
  };
  if (plan) plan.engine.onFrame = () => { if (!plan.shown) { plan.shown = true; requestAnimationFrame(() => root.classList.add("plan-live")); setTimeout(() => root.classList.add("plan-ready"), reduce ? 0 : 2600); } };
  // go: the waterfront assembles from a scatter, a reading scan passes over it, then the night's layers come up
  const goLayers = () => { nightL.show(1); plan?.show(1); labelsOn = true; layoutLabels(); ready = true; window.__viaduct.ready = true; };
  if (reduce || STILL) {
    map.engine.setForm(data.form, { ...place, immediate: true }); plan?.engine.setForm(plan.form, { ...plan.place, immediate: true });
    goLayers(); lastPlanT = -1; redraw(); requestAnimationFrame(() => { root.classList.add("pc-live", "pc-ready", "plan-live", "plan-ready"); redraw(); });
    if (!reduce && STILL) { map.engine.start(); }
  } else {
    map.engine.start(); map.engine.assembleFrom(data.form, { ...place, ms: 3200 });
    if (plan) { plan.engine.start(); setTimeout(() => plan.engine.assembleFrom(plan.form, { ...plan.place, ms: 2400 }), 900); }
    setTimeout(() => { const [y0, y1] = fit.scanRange(place); map.engine.scan(3200, y0, y1); }, 2900);
    setTimeout(goLayers, 3300);
  }
  // on resize: placed again at once; labels step aside and come back placed for the new screen
  let relayT;
  addEventListener("resize", () => { map.engine.resize(); place = fit.fit(boxOf(), canvas, 0.96); map.engine.setForm(data.form, { ...place, immediate: true }); liftAt();
    if (plan) { plan.engine.resize(); plan.engine.setForm(plan.form, { ...plan.place, immediate: true }); }
    layout = null; callouts.forEach((c) => c.el.classList.remove("on")); clearTimeout(relayT); relayT = setTimeout(() => { if (labelsOn) { layoutLabels(); redraw(); } }, 300); redraw(); });
  // only draw while the stage is on screen
  if (!reduce && !STILL) new IntersectionObserver(([e]) => { if (e.isIntersecting) { if (!map.engine.paused) map.engine.start(); plan?.engine.start(); } else { map.engine.stop(); plan?.engine.stop(); } }, { rootMargin: "80px" }).observe(stage);
  window.__viaduct.stillFrame = (t) => { state.t = t; lastPlanT = -1; gl.frame(performance.now()); map.engine.render(); plan?.engine.render(); return { map: canvas.toDataURL("image/png"), plan: plan ? plan.engine.renderer.domElement.toDataURL("image/png") : null, box: place.box }; };
  window.__viaduct.layoutLabels = () => { layoutLabels(); redraw(); };
  return true;
}

// ------------------------------------------------------------------------------------------------ public data: weather and holidays (context only)
function feeds(j) {
  const ok = (id) => j?.feeds?.[id] && !j.feeds[id].error ? j.feeds[id] : null, w = ok("weather"), c = ok("calendar");
  const chip = (e) => `<span class="truth" data-k="live">${e.truth === "Live" ? "Live" : "Latest published"}</span>`;
  if (w) { const v = w.values; $("feed-weather").innerHTML = `<span class="mono tag">Weather</span><span>${chip(w)} Auckland now ${Math.round(v.tempC)}°C, ${v.rainMm > 0 ? "raining" : "dry"}; rain chance today ${v.today?.rainChancePct ?? "–"}%. Shown as context only: the Example Friday's weather is simulated. Source: <a href="${esc(w.source.url)}" target="_blank" rel="noopener">${esc(w.source.name)}</a>.</span>`; }
  if (c) {
    const v = c.values, fri = FRI.toISOString().slice(0, 10), nx = v.nextPublicHoliday, isHol = (v.publicHoliday && v.date === fri) || (nx && nx.date === fri);
    $("feed-holiday").innerHTML = `<span class="mono tag">Holidays</span><span>${chip(c)} ${esc(friLabel)} ${isHol ? `is a public holiday (${esc((nx && nx.date === fri ? nx : v.publicHoliday).name)}), so a real night would run busier and pay holiday rates` : `is not a public holiday`}${nx && nx.date !== fri ? `; the next is ${esc(nx.name)} in ${nx.daysAway} days` : ""}. Source: <a href="${esc(c.source.url)}" target="_blank" rel="noopener">${esc(c.source.name)}</a>.</span>`;
  }
}
function feedsQuiet() {
  if (!$("feed-weather").querySelector(".truth")) $("feed-weather").innerHTML = `<span class="mono tag">Weather</span><span>The live weather feed didn't answer here, so nothing live is shown. The Example Friday's weather is simulated either way.</span>`;
  if (!$("feed-holiday").querySelector(".truth")) $("feed-holiday").innerHTML = `<span class="mono tag">Holidays</span><span>The public holidays feed didn't answer here. The Example Friday is treated as an ordinary Friday.</span>`;
}

// ------------------------------------------------------------------------------------------------ start
state.t = parseT(params.get("t")) ?? (reduce ? 200 : 0);
syncWrong(); build();
$("sun").textContent = `Sunset ${clock(SUN_T)} · calculated for Auckland`;
$("sun-long").textContent = `Sunset for Auckland on ${friLabel}: ${clock(SUN_T)}, from the NOAA solar equations. The waterfront's street lights come on around it.`;
setPlaying(state.playing && !STILL);
render(true);
if (STILL) root.classList.add("still-mode");
addEventListener("assembl:live", (e) => { try { feeds(e.detail); } catch (err) { console.warn("feeds", err); } });
if (window.__assemblLive) feeds(window.__assemblLive);
setTimeout(feedsQuiet, 9500);
requestAnimationFrame(tick);
startGL().then((ok) => {
  window.__viaduct.glReady = ok;
  if (!ok) { ready = true; window.__viaduct.ready = true; root.classList.add("no-gl"); }
});
