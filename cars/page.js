// assembl lab · Agent-ready cars: the page. Every demo runs the real tools: POST /api/mcp/ when it answers, otherwise the same
// functions in /cars/tools.js (copied from api/_cars at build time) with the live feeds this page already holds.
import { callTool, TOOLS, toJsonLd, fuelLabel, money, fmtDate, quickChecks, slotsFor, REGIONS, regionFromText, DEALER, registerFor } from "/cars/tools.js";
import { registerLine } from "/cars/register.js";

const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const mqReduce = matchMedia("(prefers-reduced-motion: reduce)"), mqNarrow = matchMedia("(max-width: 900px)"), mqDark = matchMedia("(prefers-color-scheme: dark)");
const isDark = () => { const t = document.documentElement.dataset.theme; return t ? t === "dark" : mqDark.matches; };
const reduced = () => mqReduce.matches, narrow = () => mqNarrow.matches;
const chip = (t, label) => `<span class="chip" data-truth="${esc(t)}">${esc(label || t)}</span>`;
const MCP_URL = "/api/mcp/", PV = "2026-07-28";

// ---------------------------------------------------------------- data
const feed = await fetch("/cars/feed.json", { headers: { accept: "application/json" } }).then((r) => r.json());
const stock = feed, cars = feed.cars, hero = cars.find((c) => c.featured) || cars[13];
const live = { fuel: null, tariffs: null, power: null };
const qsdepFromEnv = (e) => e && e.values && e.values.locations ? { surveyDate: e.asOf, retrieved: e.values.retrieved, url: e.source && e.source.url, national: e.values.national, locations: e.values.locations } : null;
const ctx = () => ({ fuel: live.fuel || undefined, qsdep: qsdepFromEnv(live.tariffs) || undefined });

// ---------------------------------------------------------------- the MCP client (with the local fallback)
let rpcSeq = 0, endpointOk = null;
async function mcp(name, args) {
  const t0 = performance.now();
  if (endpointOk !== false) {
    try {
      const c = new AbortController(), timer = setTimeout(() => c.abort(), 10000);
      const r = await fetch(MCP_URL, { method: "POST", signal: c.signal, headers: { "content-type": "application/json", accept: "application/json, text/event-stream", "mcp-protocol-version": PV, "mcp-method": "tools/call", "mcp-name": name },
        body: JSON.stringify({ jsonrpc: "2.0", id: ++rpcSeq, method: "tools/call", params: { name, arguments: args, _meta: { "io.modelcontextprotocol/protocolVersion": PV, "io.modelcontextprotocol/clientInfo": { name: "assembl-lab-cars-page", version: "1" } } } }) });
      clearTimeout(timer);
      const j = await r.json();
      if (j.error) throw new Error(j.error.message);
      endpointOk = true;
      return { via: "MCP", ms: Math.round(performance.now() - t0), result: withView(j.result.structuredContent, j.result._meta, j.result.content[0].text), isError: j.result.isError, text: j.result.content[0].text };
    } catch (e) { endpointOk = false; }
  }
  // offline: car_check asks NZTA's open register from the browser (it answers quietly "not looked up" if that fails too)
  const c = name === "car_check" ? { ...ctx(), register: await registerFor(stock, args) } : ctx();
  const r = callTool(name, args, { stock, ctx: c });
  return { via: "local", ms: Math.round(performance.now() - t0), result: withView(r.structuredContent, r.meta, r.text), isError: r.isError, text: r.text };
}
// the page draws the full figures (each cost line's source, the slider rates) that the tool puts in _meta for views
function withView(sc, meta, text) { if (!sc) return { error: text }; const v = meta && meta["assembl/view"]; return v ? { ...sc, ...v } : sc; }
const viaLabel = (r) => (r.via === "MCP" ? `MCP · ${r.ms} ms` : "tools in this page (endpoint not reachable)");

// ---------------------------------------------------------------- the story: pins on the car
const monthLong = (ymd) => new Date(ymd + "T12:00:00Z").toLocaleDateString("en-NZ", { month: "long", year: "numeric", timeZone: "UTC" });
const wof = hero.cin["wof.expiry"].value, lic = hero.cin["licence.expiry"].value, qc = quickChecks(hero);
const runNow = () => { const r = callTool("running_cost", { car_id: hero.id, km_per_week: 200, region: DEALER.sites[hero.site].region }, { stock, ctx: ctx() }); return withView(r.structuredContent, r.meta, r.text); };
let RC = runNow();
const energy = () => RC.lines.find((l) => l.key === "energy");
const PINS = [
  { id: "dash", beat: 1, k: "Odometer", v: () => `${hero.odometerKm.toLocaleString("en-NZ")} km`, s: () => (hero.cin["odometer.mayBeInaccurate"].value ? "May be inaccurate" : "Not flagged as inaccurate"), t: () => "Simulated", ld: "odo" },
  { id: "labels", beat: 2, k: "WOF · Licence", v: () => `${fmtDate(wof).replace(/^\d+ /, "")} · ${fmtDate(lic).replace(/^\d+ /, "")}`, s: () => `${qc.wof.monthsLeft} and ${qc.licence.monthsLeft} months left`, t: () => "Simulated", ld: "wof" },
  { id: "sticker", beat: 3, k: "Cash price", v: () => money(hero.priceNzd), s: () => "Incl. GST, registration, licensing", t: () => "Simulated", ld: "price" },
  { id: "tag", beat: 4, k: "Money owing", v: () => (hero.cin["securityInterest.registered"].value === "no" ? "None stated" : "Registered"), s: () => "Stated, not searched: PPSR", t: () => "Simulated", ld: "owing" },
  { id: "door", beat: 5, k: "Safety", v: () => "★★★★★".slice(0, hero.safety.stars), s: () => "RightCar-style stars", t: () => "Simulated", ld: "safety" },
  { id: "filler", beat: 6, k: "Running cost", v: () => `${money(energy().weekly, 2)} a week`, s: () => `Petrol, 200 km · ${energy().period || ""}`, t: () => energy().truth, ld: "run" },
  { id: "flag", beat: 7, k: "Import", v: () => `${hero.cin["import.countryLastRegistered"].value}, ${hero.cin["import.yearFirstRegisteredOverseas"].value}`, s: () => `NZ ${hero.cin["registration.yearFirstRegisteredNz"].value} · not damaged`, t: () => "Simulated", ld: "import" },
];
const stageEl = $("#stage"), pinsEl = $("#pins"), marksEl = $("#marks"), leadersEl = $("#leaders"), recordEl = $("#record"), canvas = $("#car3d"), poster = $("#poster");
$("#cap-title").textContent = hero.title;
function drawPins() {
  pinsEl.innerHTML = PINS.map((p, i) => `<li class="pin" data-id="${p.id}" data-n="${i + 1}"><span class="pin-k"><span><b>${i + 1}</b> ${esc(p.k)}</span></span><span class="pin-v">${esc(p.v())}</span><span class="pin-s">${esc(p.s())} ${chip(p.t())}</span></li>`).join("");
  marksEl.innerHTML = PINS.map((p, i) => `<span class="mark" data-id="${p.id}">${i + 1}</span>`).join("");
  leadersEl.innerHTML = PINS.map((p) => `<line data-id="${p.id}" x1="0" y1="0" x2="0" y2="0" stroke-dasharray="600" stroke-dashoffset="600"/><circle data-id="${p.id}" r="3.5" cx="-20" cy="-20" opacity="0"/>`).join("");
}
drawPins();
function fillBeats() {
  const e = energy(), f = (k) => $(`[data-fill="${k}"]`);
  f("odo").textContent = `${hero.odometerKm.toLocaleString("en-NZ")} km, read off the dashboard.`;
  f("wof").textContent = `WOF to ${monthLong(wof)}, licence to ${monthLong(lic)}.`;
  f("price").textContent = `${money(hero.priceNzd)}, drive-away.`;
  f("run").textContent = `About ${money(Math.round(e.weekly))} a week in petrol at 200 km.`;
  f("run-note").innerHTML = `From MBIE's pump price for the ${esc(e.period || "latest week")} ${chip(e.truth)}, not a guess. Diesels, EVs and plug-in hybrids add road user charges at NZTA's rates.`;
}
fillBeats();

// stage: three.js when it can, a still when it can't
let stage = null, posterMode = false, beat = 0, collapsed = false;
const POSTER_ANCHORS = null; // filled in below from /cars/poster-anchors.json when the still is in use
let posterAnchors = null;
try {
  if (new URLSearchParams(location.search).has("poster")) throw new Error("poster requested");
  const mod = await import("/cars/stage3d.js");
  // desktop: leave a label column each side once fields are pinned; the opening beat frames the car closer. Narrow: the car alone.
  stage = await mod.createStage(canvas, hero, { reduced: reduced(), dark: isDark(), onFrame: () => layout(), narrow,
    fit: (w, h) => (narrow() ? 1.12 : Math.max(1.25, Math.min(2.2, (0.9 * w) / Math.max(260, w - 400)))), introFit: (w, h) => (narrow() ? 1.12 : Math.max(1.2, Math.min(1.6, 880 / w))) });
  mqDark.addEventListener("change", () => stage.setTheme(isDark()));
} catch (e) {
  posterMode = true; canvas.hidden = true; poster.hidden = false; poster.src = poster.dataset.src;
  try { posterAnchors = await fetch("/cars/poster-anchors.json").then((r) => r.json()); } catch (err) { posterAnchors = POSTER_ANCHORS; }
}
function anchors() {
  if (stage) return stage.anchors();
  if (!posterAnchors) return [];
  const r = poster.getBoundingClientRect(), iw = posterAnchors.width, ih = posterAnchors.height, s = Math.min(r.width / iw, r.height / ih), ox = (r.width - iw * s) / 2, oy = (r.height - ih * s) / 2;
  return posterAnchors.anchors.map((a) => ({ id: a.id, x: ox + a.x * s, y: oy + a.y * s, visible: true }));
}
const SIDE = { dash: "R", labels: "R", sticker: "R", tag: "R", door: "L", filler: "L", flag: "L" };
function layout() {
  const A = Object.fromEntries(anchors().map((a) => [a.id, a])), carBox = $("#stage-car").getBoundingClientRect(), W = carBox.width, H = carBox.height, wide = !narrow();
  const on = PINS.filter((p) => p.beat <= beat && beat < 8);
  for (const p of PINS) {
    const a = A[p.id], isOn = on.includes(p), m = marksEl.querySelector(`[data-id="${p.id}"]`), li = pinsEl.querySelector(`[data-id="${p.id}"]`);
    if (!a) continue;
    m.style.left = a.x + "px"; m.style.top = a.y + "px"; m.classList.toggle("on", isOn && !wide); m.classList.toggle("away", !a.visible);
    li.classList.toggle("away", isOn && !a.visible);
  }
  if (!wide) { leadersEl.querySelectorAll("line,circle").forEach((x) => x.setAttribute("opacity", 0)); return; }
  // desktop: labels beside the car, kept apart, with a leader line to the part
  for (const side of ["L", "R"]) {
    const list = on.filter((p) => SIDE[p.id] === side).map((p) => ({ p, a: A[p.id], li: pinsEl.querySelector(`[data-id="${p.id}"]`) })).filter((x) => x.a).sort((x, y) => x.a.y - y.a.y);
    let y = 70;
    for (const it of list) { const h = it.li.offsetHeight || 74; it.y = Math.max(y, Math.min(H - h - 96, it.a.y - h / 2)); y = it.y + h + 10; it.h = h; }
    for (let i = list.length - 1, lim = H - 96; i >= 0; i--) { const it = list[i]; if (it.y + it.h > lim) it.y = lim - it.h; lim = it.y - 10; }
    for (const it of list) {
      const w = it.li.offsetWidth || 176, x = side === "L" ? 10 : W - w - 10;
      it.li.style.left = x + "px"; it.li.style.top = it.y + "px";
      const line = leadersEl.querySelector(`line[data-id="${it.p.id}"]`), dot = leadersEl.querySelector(`circle[data-id="${it.p.id}"]`);
      const lx = side === "L" ? x + w : x, ly = it.y + Math.min(26, it.h / 2);
      line.setAttribute("x1", lx); line.setAttribute("y1", ly); line.setAttribute("x2", it.a.x); line.setAttribute("y2", it.a.y);
      line.setAttribute("stroke-dashoffset", 0); line.setAttribute("opacity", it.a.visible ? 1 : 0); dot.setAttribute("cx", it.a.x); dot.setAttribute("cy", it.a.y); dot.setAttribute("opacity", it.a.visible ? 1 : 0.25);
    }
  }
  for (const p of PINS) if (!on.includes(p)) { const line = leadersEl.querySelector(`line[data-id="${p.id}"]`); line.setAttribute("stroke-dashoffset", 600); line.setAttribute("opacity", 0); leadersEl.querySelector(`circle[data-id="${p.id}"]`).setAttribute("opacity", 0); }
}

// the record the agent receives: an excerpt of the real JSON-LD, with the pinned lines marked
const LD = (() => { try { return JSON.parse($(`#ld-${hero.id}`).textContent); } catch (e) { return toJsonLd(hero); } })();
function recordHTML() {
  const ap = (id) => LD.additionalProperty.find((x) => x.propertyID === id);
  const props = [["cin:wof.expiry", "wof"], ["cin:licence.expiry", "wof"], ["cin:securityInterest.registered", "owing"], ["cin:import.yearFirstRegisteredOverseas", "import"], ["cin:import.countryLastRegistered", "import"], ["cin:import.damaged", ""], ["safetyRating", "safety"]];
  const q = (s) => `<span class="str">${esc(JSON.stringify(s))}</span>`, k = (s) => `<span class="key">${esc(JSON.stringify(s))}</span>`, n = (x) => `<span class="num">${x}</span>`;
  const val = (x) => (typeof x === "number" ? n(x) : q(x));
  const L = [];
  const line = (html, mark = "") => L.push(`<span class="ln"${mark ? ` data-ld="${mark}"` : ""}>${html}</span>`);
  line("{");
  for (const key of ["@context", "@type", "@id", "name", "vehicleIdentificationNumber", "vehicleModelDate", "fuelType"]) line(`  ${k(key)}: ${val(LD[key])},`);
  line(`  ${k("mileageFromOdometer")}: {`); line(`    ${k("@type")}: ${q("QuantitativeValue")},`); line(`    ${k("value")}: ${n(LD.mileageFromOdometer.value)}, ${k("unitCode")}: ${q("KMT")}`, "odo"); line("  },");
  line(`  ${k("fuelEfficiency")}: { ${k("value")}: ${n(LD.fuelEfficiency.value)}, ${k("unitText")}: ${q(LD.fuelEfficiency.unitText)} },`, "run");
  line(`  ${k("offers")}: {`); line(`    ${k("@type")}: ${q("Offer")},`); line(`    ${k("price")}: ${n(LD.offers.price)}, ${k("priceCurrency")}: ${q("NZD")},`, "price"); line(`    ${k("availability")}: ${q(LD.offers.availability)}`); line("  },");
  line(`  ${k("additionalProperty")}: [`);
  props.forEach(([id, mark]) => { const p = ap(id); if (p) line(`    { ${k("propertyID")}: ${q(p.propertyID)}, ${k("value")}: ${val(p.value)} },`, mark); });
  line(`    <span class="com">// + ${LD.additionalProperty.length - props.length} more notice fields: copy for the full record</span>`);
  line("  ]"); line("}");
  return L.join("");
}
$("#ld-code").innerHTML = recordHTML();
$("#rec-id").textContent = hero.id;
$("#rec-note").textContent = `Excerpt of ${hero.id}'s JSON-LD (${(JSON.stringify(LD).length / 1024).toFixed(1)} KB in full). Simulated listing; the same record is in this page's source and in /cars/feed.json.`;

function setBeat(b, { fromScroll = false } = {}) {
  b = Math.max(0, Math.min(8, b));
  if (b === beat && fromScroll) return Promise.resolve();
  beat = b;
  $$(".beat").forEach((el) => el.classList.toggle("now", +el.dataset.beat === b));
  const turn = stage ? stage.setBeat(b) : Promise.resolve();
  for (const p of PINS) {
    const li = pinsEl.querySelector(`[data-id="${p.id}"]`), on = p.beat <= b;
    li.classList.toggle("on", on && b < 8); li.classList.toggle("now", p.beat === b); li.setAttribute("aria-hidden", String(!(on && b < 8))); li.style.setProperty("--fx", (SIDE[p.id] === "L" ? -36 : 36) + "px"); li.style.setProperty("--fy", "0px");
    if (b < 8) { li.classList.remove("fly"); li.style.transform = ""; }
  }
  collapse(b === 8);
  layout();
  return turn;
}
function collapse(yes) {
  if (yes === collapsed) return;
  collapsed = yes; stageEl.classList.toggle("collapsed", yes);
  if (yes) {
    recordEl.hidden = false; void recordEl.offsetWidth; recordEl.classList.add("on");
    const base = stageEl.getBoundingClientRect();
    for (const p of PINS) {
      const li = pinsEl.querySelector(`[data-id="${p.id}"]`), tgt = $(`#ld-code [data-ld="${p.ld}"]`);
      $$("#ld-code .ln").forEach((x) => x.classList.toggle("hit", !!x.dataset.ld));
      if (!tgt || narrow() || reduced()) { li.classList.remove("on"); continue; }
      const a = li.getBoundingClientRect(), t = tgt.getBoundingClientRect();
      li.classList.add("on", "fly"); li.style.transform = `translate3d(${t.left - a.left + 40}px, ${t.top - a.top - 10}px, 0) scale(.72)`; li.style.opacity = "0";
    }
    leadersEl.querySelectorAll("line,circle").forEach((x) => x.setAttribute("opacity", 0));
    void base;
  } else {
    recordEl.classList.remove("on"); setTimeout(() => { if (!collapsed) recordEl.hidden = true; }, reduced() ? 0 : 500);
    $$(".pin", pinsEl).forEach((li) => { li.style.opacity = ""; li.style.transform = ""; li.classList.remove("fly"); });
    $$("#ld-code .ln").forEach((x) => x.classList.remove("hit"));
  }
}
// which beat is the reader on? (the last one whose top has passed a line on the screen)
const beatEls = $$(".beat");
let playing = null, ticking = false;
function onScroll() {
  if (ticking || playing) return; ticking = true;
  requestAnimationFrame(() => { ticking = false; const line = innerHeight * (narrow() ? 0.8 : 0.56); let b = 0; for (const el of beatEls) if (el.getBoundingClientRect().top < line) b = +el.dataset.beat; setBeat(b, { fromScroll: true }); });
}
addEventListener("scroll", onScroll, { passive: true });
const scrollToBeat = (b) => { const el = beatEls[b], top = scrollY + el.getBoundingClientRect().top - innerHeight * (narrow() ? 0.5 : 0.3); scrollTo({ top, behavior: reduced() ? "auto" : "smooth" }); };
$("#play").addEventListener("click", async () => {
  if (playing) return;
  const stop = () => { if (playing) playing.stopped = true; };
  playing = { stopped: false };
  ["wheel", "touchstart", "keydown"].forEach((ev) => addEventListener(ev, stop, { once: true, passive: true }));
  if (reduced()) { setBeat(7); scrollToBeat(7); playing = null; return; }
  for (let b = 1; b <= 8 && !playing.stopped; b++) {
    scrollToBeat(b);
    await setBeat(b);
    await new Promise((r) => setTimeout(r, 700)); // the pin's own entrance (0.6 s) finishing before the next field arrives
  }
  playing = null; onScroll();
});
$("#copy-ld").addEventListener("click", (e) => copy(JSON.stringify(LD, null, 2), e.currentTarget));
new ResizeObserver(() => { if (stage) stage.resize(); layout(); }).observe(stageEl);
mqNarrow.addEventListener("change", () => { if (stage) { stage.resize(); stage.setBeat(beat); } layout(); });
if (posterMode) poster.addEventListener("load", layout);
setBeat(0); onScroll();

async function copy(text, btn) {
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {
    const t = document.createElement("textarea"); t.value = text; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0"; document.body.appendChild(t); t.select();
    try { ok = document.execCommand("copy"); } catch (err) { ok = false; } t.remove();
  }
  if (btn) { const was = btn.textContent; btn.textContent = ok ? "Copied" : "Select and copy"; setTimeout(() => (btn.textContent = was), 1600); }
}

// ---------------------------------------------------------------- two ways to see the same car
$("#human-img").src = `/cars/img/${hero.id}-4x3.webp`; // the car's own studio render: the stand-in for a listing photo
$("#human-img").alt = `${hero.title} in ${hero.colour.toLowerCase()}, a studio render standing in for a listing photo (Simulated)`;
$("#human-site").textContent = DEALER.sites[hero.site].name;
$("#human-title").textContent = hero.title;
$("#human-head").textContent = hero.headline;
$("#human-price").textContent = money(hero.priceNzd);
$("#human-meta").textContent = `${hero.odometerKm.toLocaleString("en-NZ")} km · ${hero.fuelLabel} · ${hero.drivetrain} · ${hero.colour}`;
$("#human-hl").innerHTML = hero.highlights.map((h) => `<li>${esc(h)}</li>`).join("");
function agentChecks() {
  const sl = slotsFor(hero), sat = sl.filter((s) => s.day === "Saturday");
  const rows = [
    ["pass", "Notice", `${qc.cinFields.present} of ${qc.cinFields.total} fields`, "Every field a dealer must show, keyed", "Simulated"],
    ["pass", "Cash price", `${money(hero.priceNzd)} NZD`, "Includes GST, registration and licensing", "Simulated"],
    [qc.wof.ok ? "pass" : "fail", "WOF", fmtDate(wof), `${qc.wof.monthsLeft} months left`, "Simulated"],
    [qc.licence.ok ? "pass" : "fail", "Licence", fmtDate(lic), `${qc.licence.monthsLeft} months left`, "Simulated"],
    ["pass", "Odometer", `${hero.odometerKm.toLocaleString("en-NZ")} km`, `About ${qc.odometer.kmPerYear.toLocaleString("en-NZ")} km a year; not flagged`, "Simulated"],
    ["open", "Money owing", "none stated", "A PPSR search is still to run before paying", "Simulated"],
    ["pass", "Import", `${hero.cin["import.countryLastRegistered"].value} ${hero.cin["import.yearFirstRegisteredOverseas"].value} → NZ ${hero.cin["registration.yearFirstRegisteredNz"].value}`, "Not imported damaged. Radio needs a band expander", "Simulated"],
    ["pass", "Running cost", `${money(RC.totalWeekly, 2)} a week`, `At 200 km: ${RC.lines.map((l) => l.label.toLowerCase()).join(", ")}`, energy().truth],
    ["open", "Economy", `${hero.economy.value} ${hero.economy.unit}`, "Typical for the model; RightCar has this car's figure", "Estimate"],
    ["pass", "Test drive", `${sl.length} free slots this week`, sat.length ? `Saturday: ${sat.map((s) => s.label.split(", ")[1]).join(", ")}` : "None free on Saturday", "Simulated"],
  ];
  $("#agent-checks").innerHTML = rows.map(([st, k, v, n, t]) => `<li class="${st}"><span class="st" aria-label="${st === "pass" ? "checked" : st === "open" ? "still to check" : "failed"}"></span><span><span class="ck">${esc(k)}</span><span class="cv">${esc(v)}</span><span class="cn">${esc(n)}</span></span>${chip(t)}</li>`).join("");
  $("#agent-foot").textContent = `get_car · car_check · running_cost, computed from /cars/feed.json · fuel ${energy().statusLabel || energy().period || ""} · nothing was looked up about a real car`;
}
agentChecks();
const seeChecks = (now) => { $("#agent-view").dataset.seen = "1"; const lis = $$("#agent-checks li"); if (now || reduced()) return lis.forEach((li) => li.classList.add("seen")); lis.forEach((li, i) => setTimeout(() => li.classList.add("seen"), 140 * i)); };
new IntersectionObserver((es, io) => { if (es.some((e) => e.isIntersecting)) { seeChecks(); io.disconnect(); } }, { threshold: 0, rootMargin: "0px 0px -25% 0px" }).observe($("#agent-checks"));

// ---------------------------------------------------------------- live feeds (/feeds.js fires assembl:live)
function onLive(j) {
  if (!j || !j.feeds) return;
  const ok = (id) => (j.feeds[id] && !j.feeds[id].error ? j.feeds[id] : null);
  live.fuel = ok("fuel") || live.fuel; live.tariffs = ok("tariffs") || live.tariffs; live.power = ok("power") || live.power;
  if (live.fuel && window.assemblFeeds) live.fuel = { ...live.fuel, status: window.assemblFeeds.status(live.fuel) === "fallback" ? "snapshot" : window.assemblFeeds.status(live.fuel), statusLabel: window.assemblFeeds.statusLabel(live.fuel) };
  RC = runNow(); fillBeats(); drawPinsKeep(); agentChecks(); if ($("#agent-view").dataset.seen) seeChecks(true);
}
function drawPinsKeep() { const b = beat; drawPins(); beat = -1; setBeat(b); }
addEventListener("assembl:live", (e) => onLive(e.detail));
if (window.__assemblLive) onLive(window.__assemblLive);

// ---------------------------------------------------------------- the simulated conversation
const tx = $("#transcript");
const add = (html, cls) => { const d = document.createElement("div"); d.className = cls + " appear"; d.innerHTML = html; tx.appendChild(d); return d; };
const bot = (html) => add(`<p>${html}</p>`, "msg bot");
const compact = (o) => JSON.stringify(o).replace(/"(\w+)":/g, "$1: ").replace(/,(?=\w)/g, ", ");
const evidence = (name, args, res, r, write) => add(`<span><b>→ ${esc(name)}</b></span><span class="args">${esc(compact(args))}</span><span class="res">${esc(res)} · ${esc(viaLabel(r))}</span>`, "ev" + (write ? " write" : ""));
const nzDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland" }).format(new Date());
const addDays = (ymd, n) => { const d = new Date(ymd + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
$("#run-chat").addEventListener("click", runChat);
async function runChat() {
  const btn = $("#run-chat"); btn.disabled = true; btn.textContent = "Running";
  $$(".transcript > :not(.buyer)").forEach((x) => x.remove());
  const a1 = { budget_max: 35000, body: "suv", fuel: "hybrid", region: "Waikato", must_have: ["no money owing"], test_drive_day: "saturday", limit: 3 };
  const r1 = await mcp("search_cars", a1), s = r1.result;
  evidence("search_cars", a1, `${s.matched} of ${s.total} match`, r1);
  const mini = add(s.results.map((c, i) => `<article class="${i === 0 ? "top" : ""}"><img src="/cars/img/${esc(c.id)}-4x3.webp" alt="Studio render of the ${esc(c.title)} (Simulated)" width="1200" height="900" loading="lazy"><h4>${esc(c.title)}</h4><p>${money(c.priceNzd)} · ${c.odometerKm.toLocaleString("en-NZ")} km</p><p class="why">${esc(c.why.slice(-2).join(" · "))}</p></article>`).join(""), "mini");
  void mini;
  const top = s.results[0], owing = s.excluded["money owing stated"] || 0;
  bot(`${s.matched} fit. The closest match is the <b>${esc(top.title)}</b> at the Hamilton site, ${money(35000 - top.priceNzd)} under your budget.${owing ? ` I left out ${owing} hybrid SUV${owing > 1 ? "s" : ""} in budget because money is owing on ${owing > 1 ? "them" : "it"}.` : ""}`);
  const r2 = await mcp("get_car", { car_id: top.id, test_drive_day: "saturday" }), g = r2.result;
  evidence("get_car", { car_id: top.id, test_drive_day: "saturday" }, `${g.checks.cinFields.present}/${g.checks.cinFields.total} notice fields · ${g.testDriveSlots.length} Saturday slots`, r2);
  const r3 = await mcp("running_cost", { car_id: top.id, km_per_week: 200, region: "Waikato" }), rc = r3.result;
  evidence("running_cost", { car_id: top.id, km_per_week: 200, region: "Waikato" }, `${money(rc.totalWeekly, 2)}/wk`, r3);
  const fuelLine = rc.lines.find((l) => l.key === "energy");
  bot(`Its notice is complete: WOF to ${fmtDate(g.checks.wof.expiry)}, licence to ${fmtDate(g.checks.licence.expiry)}, and no money owing stated. I'd still search the PPSR on the day you pay. At 200 km a week it costs about <b>${money(rc.totalWeekly, 2)}</b> a week to run, using MBIE's fuel price for the ${esc(fuelLine.period || "latest week")}.`);
  const sats = g.testDriveSlots.filter((x) => x.day === "Saturday"), today = nzDate();
  const maxHold = addDays(today, 3), satDate = sats[0] ? sats[0].date : maxHold, holdUntil = satDate < maxHold ? satDate : maxHold;
  let pick = sats.find((x) => /T10:/.test(x.start)) || sats[0];
  if (!pick) { bot("There's no free test-drive slot on Saturday. Want me to look at other days?"); done(); return; }
  const card = add(`<h4>Shall I ask ${esc(DEALER.sites.hamilton.name)}?</h4><ul><li>Test drive: <b id="pick-l">${esc(pick.label)}</b></li><li>Hold the car until ${esc(fmtDate(holdUntil))}${holdUntil < satDate ? " (holds run 3 days at most)" : ""}</li></ul>
    <p class="fine">A person at the dealer has to confirm both. Nothing is booked or held until they do.</p>
    <div class="slots" role="group" aria-label="Saturday times">${sats.map((x) => `<button type="button" data-slot="${esc(x.start)}" aria-pressed="${x === pick}">${esc(x.label.split(", ")[1])}</button>`).join("")}</div>
    <div class="row"><button class="btn primary" type="button" data-act="yes">Ask the dealer</button><button class="btn quiet" type="button" data-act="no">Not now</button></div>`, "approve");
  card.querySelector(".slots").addEventListener("click", (e) => { const b = e.target.closest("[data-slot]"); if (!b) return; pick = sats.find((x) => x.start === b.dataset.slot); card.querySelectorAll("[data-slot]").forEach((x) => x.setAttribute("aria-pressed", x === b)); $("#pick-l").textContent = pick.label; });
  card.querySelector('[data-act="no"]').addEventListener("click", () => { card.querySelectorAll("button").forEach((b) => (b.disabled = true)); bot("No problem. I haven't asked the dealer for anything."); done(); });
  card.querySelector('[data-act="yes"]').addEventListener("click", async () => {
    card.querySelectorAll("button").forEach((b) => (b.disabled = true));
    const a4 = { car_id: top.id, slot: pick.start }, r4 = await mcp("book_test_drive", a4);
    evidence("book_test_drive", a4, r4.isError ? "not requested" : "requested (Simulated)", r4, true);
    const a5 = { car_id: top.id, hold_until: holdUntil }, r5 = await mcp("hold_car", a5);
    evidence("hold_car", a5, r5.isError ? "not requested" : "requested (Simulated)", r5, true);
    if (r4.isError || r5.isError) bot(esc((r4.isError ? r4.text : r5.text) || "The dealer's system didn't accept that."));
    else bot(`Both requests are with ${esc(r4.result.site)}: a test drive at <b>${esc(pick.label)}</b> and a hold until <b>${esc(fmtDate(r5.result.holdUntil))}</b>. Nothing is booked or held until a person there confirms. ${chip("Simulated")} This is a demo: nothing was sent anywhere.`);
    done();
  });
  function done() { btn.disabled = false; btn.textContent = "Run it again"; }
}

// ---------------------------------------------------------------- is this car a good buy?
const regionSel = $("#f-region");
regionSel.innerHTML = REGIONS.map((r) => `<option value="${esc(r.name)}"${r.name === "Auckland" ? " selected" : ""}>${esc(r.name)}</option>`).join("");
$("#gb-car").innerHTML = cars.map((c) => `<option value="${c.id}"${c.id === hero.id ? " selected" : ""}>${c.id} · ${esc(c.title)} · ${money(c.priceNzd)}</option>`).join("");
const mode = () => $('input[name="mode"]:checked').value;
$$('input[name="mode"]').forEach((r) => r.addEventListener("change", () => { $("#gb-demo").hidden = mode() !== "demo"; $("#gb-listing").hidden = mode() !== "listing"; }));
$("#f-kmw").addEventListener("input", () => { $("#kmw-out").textContent = $("#f-kmw").value; rerunCost(); });
const MAKES = ["Toyota", "Mazda", "Suzuki", "Honda", "Nissan", "Kia", "Hyundai", "Mitsubishi", "Ford", "Tesla", "BYD", "MG", "Subaru", "Volkswagen", "VW", "Holden", "Audi", "BMW", "Mercedes-Benz", "Mercedes", "Lexus", "Skoda", "Jeep", "Peugeot", "Polestar", "Isuzu", "Volvo", "Mini", "Land Rover", "GWM", "Haval", "LDV", "Chery", "Renault", "Jaguar", "Porsche", "Cupra", "Ssangyong", "Daihatsu"];
$("#gb-read").addEventListener("click", () => {
  const t = $("#gb-paste").value, got = [];
  const set = (id, v, label) => { if (v == null || v === "") return; $(id).value = v; got.push(label); };
  const yr = t.match(/\b(19[89]\d|20[0-3]\d)\b/); if (yr) set("#f-year", yr[1], "year");
  const kmM = t.match(/(\d[\d,. ]*)\s*(k)?\s*(?:km|kms|kilomet)/i); if (kmM) { let v = parseFloat(kmM[1].replace(/[, ]/g, "")); if (kmM[2] || v < 1000) v *= 1000; set("#f-km", Math.round(v), "km"); }
  const pr = t.match(/\$\s?(\d[\d,]*(?:\.\d+)?)\s*(k)?/i); if (pr) { let v = parseFloat(pr[1].replace(/,/g, "")); if (pr[2]) v *= 1000; set("#f-price", Math.round(v), "price"); }
  const mk = MAKES.find((m) => new RegExp(`\\b${m}\\b`, "i").test(t));
  if (mk) { set("#f-make", mk, "make"); const after = t.slice(t.search(new RegExp(`\\b${mk}\\b`, "i")) + mk.length).split(/[,.;\n(|]/)[0].replace(/\b(19|20)\d\d\b|\bhybrid\b|\belectric\b|\bdiesel\b|\bpetrol\b/gi, "").trim(); if (after) set("#f-model", after.split(/\s+/).slice(0, 3).join(" "), "model"); }
  const fu = /plug-?in|phev/i.test(t) ? "plug-in hybrid" : /hybrid/i.test(t) ? "hybrid" : /\belectric\b|\bev\b|kwh/i.test(t) ? "electric" : /diesel/i.test(t) ? "diesel" : /petrol/i.test(t) ? "petrol" : null; if (fu) set("#f-fuel", fu, "fuel");
  const rg = regionFromText(t); if (rg) set("#f-region", rg.name, "region");
  const my = (re) => { const m = t.match(re); if (!m) return null; let [, mo, y] = m; if (isNaN(+mo)) { mo = String(["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(mo.slice(0, 3).toLowerCase()) + 1); } y = y.length === 2 ? "20" + y : y; return +mo >= 1 && +mo <= 12 ? `${y}-${String(mo).padStart(2, "0")}` : null; };
  const w = my(/wof[^0-9a-z]{0,6}(?:to|until|till|exp\w*)?\s*(\d{1,2}|[a-z]{3,9})[\/\- ](\d{2,4})/i); if (w) set("#f-wof", w, "WOF");
  const l = my(/(?:rego|licen[cs]e)[^0-9a-z]{0,6}(?:to|until|till|exp\w*)?\s*(\d{1,2}|[a-z]{3,9})[\/\- ](\d{2,4})/i); if (l) set("#f-lic", l, "licence");
  if (/no money owing|unencumbered|no finance owing/i.test(t)) set("#f-owing", "no", "money owing"); else if (/money owing|finance owing|security interest/i.test(t)) set("#f-owing", "yes", "money owing");
  if (/nz new|new zealand new/i.test(t)) set("#f-import", "no", "NZ-new"); else if (/import|jdm|ex[- ]japan|ex[- ]uk/i.test(t)) set("#f-import", "yes", "import");
  if (/private sale|private seller/i.test(t)) set("#f-seller", "private", "seller"); else if (/\bdealer\b|motors|\bltd\b|trade-?in/i.test(t)) set("#f-seller", "dealer", "seller");
  $("#gb-readout").textContent = got.length ? `Read ${got.join(", ")}. Check the fields, then press Check.` : "Couldn't read any facts from that. Type them in below.";
});
function gbArgs() {
  const kmw = +$("#f-kmw").value;
  if (mode() === "demo") return { car_id: $("#gb-car").value, km_per_week: kmw };
  const v = (id) => $(id).value.trim(), num = (id) => { const x = parseFloat(v(id).replace(/[^\d.]/g, "")); return isFinite(x) ? x : undefined; };
  const a = { make: v("#f-make") || undefined, model: v("#f-model") || undefined, year: num("#f-year") && Math.round(num("#f-year")), odometer_km: num("#f-km") && Math.round(num("#f-km")), price_nzd: num("#f-price"),
    fuel: v("#f-fuel"), seller: v("#f-seller"), region: v("#f-region"), wof_expiry: v("#f-wof") || undefined, licence_expiry: v("#f-lic") || undefined, money_owing: v("#f-owing"), imported: v("#f-import"),
    source: "typed by the buyer", km_per_week: kmw };
  return Object.fromEntries(Object.entries(a).filter(([, x]) => x !== undefined && x !== ""));
}
let lastCheck = null;
$("#gb-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("#gb-run"), args = gbArgs(); btn.disabled = true; $("#gb-ev").textContent = "car_check running…";
  const r = await mcp("car_check", args); btn.disabled = false;
  $("#gb-ev").textContent = `car_check · ${viaLabel(r)}`;
  if (r.isError) { $("#gb-out").innerHTML = `<p class="res-sum">${esc((r.result && r.result.error) || r.text)}</p>`; return; }
  lastCheck = { args, result: r.result }; renderCheck(r.result, r); sendCardResult(r.result);
});
function waterfall(rc) {
  const max = rc.totalWeekly || 1; let acc = 0;
  const rows = rc.lines.map((l) => { const x = (acc / max) * 100, w = Math.max(0.8, (l.weekly / max) * 100); acc += l.weekly;
    return `<div class="wfr"><span class="wfl">${esc(l.label)}</span><span class="wft"><i class="bar" style="left:${x.toFixed(2)}%;width:${w.toFixed(2)}%" data-truth="${esc(l.truth)}"></i></span><span class="wfv">${money(l.weekly, 2)}</span></div>`; }).join("");
  return `<div class="wfh" role="img" aria-label="Weekly running cost ${money(rc.totalWeekly, 2)}: ${rc.lines.map((l) => `${l.label} ${money(l.weekly, 2)}`).join(", ")}">${rows}<div class="wfr total"><span class="wfl">A week, all in</span><span class="wft"><i class="bar" style="left:0;width:100%"></i></span><span class="wfv">${money(rc.totalWeekly, 2)}</span></div></div>`;
}
const costLines = (rc) => `<ul class="lines">${rc.lines.map((l) => `<li><span>${esc(l.label)}</span>${chip(l.truth)}${l.period ? `<span class="mono said">${esc(l.period)}${l.statusLabel ? " · " + esc(l.statusLabel) : ""}</span>` : ""}<span class="b">${esc(l.basis)}${l.source ? ` · <a href="${esc(l.source.url)}">${esc(l.source.name)}</a>` : ""}</span></li>`).join("")}</ul><p class="said">Not included: ${esc(rc.notIncluded.join(", "))}.</p>`;
const carImg = (res, kind) => { const id = lastCheck && lastCheck.args.car_id;
  return id ? `<img src="/cars/img/${esc(id)}-4x3.webp" alt="Studio render of ${esc(res.car.name)} (Simulated)" width="1200" height="900">`
    : `<img src="/cars/img/body-${esc(kind)}-4x3.webp" alt="Studio render of a ${esc(kind)} body style, not this car" width="640" height="480">`; };
function renderCheck(res, r) {
  const rc = res.runningCost, kind = res.car.render && res.car.render.kind && res.car.render.kind !== "unknown" ? res.car.render.kind : "hatch", paint = (res.car.render && res.car.render.paint) || "#C8CBCB";
  const pw = live.power && (rc.fuel === "electric" || rc.fuel === "plug-in hybrid") ? `<p class="said">Context: wholesale power at ${esc(live.power.values.node)} averaged ${esc(live.power.values.avgCentsPerKWh)} c/kWh on ${esc(live.power.values.date)} ${chip("Live")} what retailers pay, before lines and GST; not your bill.</p>` : "";
  $("#gb-out").innerHTML = `<div class="res">
    <div class="res-head"><div><p class="said">car_check · ${esc(viaLabel(r))}</p><h3>${esc(res.car.name)}</h3></div>${chip(res.car.truth)}</div>
    <div class="res-car">${carImg(res, kind)}<div><p class="res-sum">${esc(res.summary)}</p><p class="said">${esc(res.statement)}</p></div></div>
    ${res.register ? `<p class="said">${esc(registerLine(res.register))} ${chip("Source", "NZTA register")} <a href="${esc(res.register.source.url)}">Source: NZ Transport Agency Waka Kotahi, Motor Vehicle Register</a> (CC BY 4.0)</p>` : ""}
    <h4>Running cost · <span id="rc-km">${rc.kmPerWeek}</span> km a week · ${esc(rc.place)}</h4><div id="rc-box">${waterfall(rc)}${costLines(rc)}</div>${pw}
    ${res.redFlags.length ? `<h4>Red flags and questions</h4><ul class="flags">${res.redFlags.map((f) => `<li><span class="dot ${esc(f.level)}" aria-label="${esc(f.level)}"></span><span><b>${esc(f.title)}</b><small>${esc(f.why)}</small></span></li>`).join("")}</ul>` : ""}
    <h4>Before you pay</h4><ul class="todo">${res.checks.map((c) => `<li><input type="checkbox" aria-label="Done: ${esc(c.title)}"><span><b>${esc(c.title)}</b><small>${esc(c.how)}${c.link ? ` <a href="${esc(c.link.url)}">${esc(c.link.name)}</a>` : ""}</small></span></li>`).join("")}</ul>
    <h4>Notice fields · ${res.notice.present} of ${res.notice.total} given</h4>${res.notice.missing.length ? `<p class="said" style="margin-bottom:8px">${esc(res.notice.note)}</p><div class="missing">${res.notice.missing.map((m) => `<span>${esc(m.label)}</span>`).join("")}</div>` : `<p>All ${res.notice.total} fields are on the notice.</p>`}
    <h4>Is the price fair?</h4><ol class="qs">${res.fairPrice.questions.map((q) => `<li>${esc(q)}</li>`).join("")}</ol><p class="said">${esc(res.fairPrice.note)}</p>
  </div>`;
}
let costTimer = 0;
function rerunCost() {
  if (!lastCheck) return; clearTimeout(costTimer);
  costTimer = setTimeout(() => {
    const a = lastCheck.args, kmw = +$("#f-kmw").value;
    const args = a.car_id ? { car_id: a.car_id, km_per_week: kmw } : Object.fromEntries(Object.entries({ make: a.make, model: a.model, year: a.year, fuel: a.fuel && a.fuel !== "unknown" ? a.fuel : undefined, km_per_week: kmw, region: a.region }).filter(([, x]) => x !== undefined));
    const out = callTool("running_cost", args, { stock, ctx: ctx() }), rc = withView(out.structuredContent, out.meta, out.text).runningCost;
    if (!rc || rc.error || !$("#rc-box")) return;
    $("#rc-km").textContent = rc.kmPerWeek; $("#rc-box").innerHTML = waterfall(rc) + costLines(rc);
    $("#gb-ev").textContent = "running_cost · recomputed in this page with the same tool and the feeds it already has";
  }, 120);
}
let autoRan = false;
new IntersectionObserver((es, io) => { if (!autoRan && es.some((e) => e.isIntersecting)) { autoRan = true; io.disconnect(); $("#gb-form").requestSubmit(); } }, { threshold: 0.2 }).observe($("#check"));

// ---------------------------------------------------------------- the stock grid
const FILTERS = { body: "all", fuel: "all", site: "all" };
const fuelGroup = (f) => (f === "plug-in hybrid" ? "hybrid" : f);
const OPTS = { body: [["all", "All"], ["hatch", "Hatch"], ["sedan", "Sedan"], ["suv", "SUV"], ["ute", "Ute"], ["van", "Van"]], fuel: [["all", "Any fuel"], ["petrol", "Petrol"], ["hybrid", "Hybrid"], ["electric", "Electric"], ["diesel", "Diesel"]], site: [["all", "All sites"], ["auckland", "Auckland"], ["hamilton", "Hamilton"], ["tauranga", "Tauranga"]] };
const matches = (c, f = FILTERS) => (f.body === "all" || c.body === f.body) && (f.fuel === "all" || fuelGroup(c.fuel) === f.fuel) && (f.site === "all" || c.site === f.site);
function drawFilters() {
  for (const [key, el] of [["body", "#f-body"], ["fuel", "#f-fuels"], ["site", "#f-site"]]) {
    $(el).innerHTML = OPTS[key].map(([v, l]) => { const n = cars.filter((c) => matches(c, { ...FILTERS, [key]: v })).length; return `<button type="button" data-k="${key}" data-v="${v}" aria-pressed="${FILTERS[key] === v}">${esc(l)} <span class="mono">${n}</span></button>`; }).join("");
  }
}
const agentDl = (c) => { const v = (k) => c.cin[k].value; return `<dl>
  <dt>id</dt><dd>${c.id}</dd><dt>price.cash</dt><dd>${v("price.cash")} NZD</dd><dt>odometer.km</dt><dd>${v("odometer.km")}${v("odometer.mayBeInaccurate") ? " · may be inaccurate" : ""}</dd>
  <dt>wof.expiry</dt><dd>${v("wof.expiry")}</dd><dt>licence.expiry</dt><dd>${v("licence.expiry")}</dd><dt>money owing</dt><dd>${v("securityInterest.registered") === "no" ? "none stated" : v("securityInterest.registered")}</dd>
  <dt>import</dt><dd>${c.imported ? `${v("import.countryLastRegistered")} ${v("import.yearFirstRegisteredOverseas")} · damaged: ${v("import.damaged")}` : "NZ-new"}</dd><dt>fuel.type</dt><dd>${esc(v("fuel.type"))} · RUC ${v("ruc.applies")}</dd>
  <dt>economy</dt><dd>${c.economy.value} ${c.economy.unit} ${chip("Estimate")}</dd><dt>safety</dt><dd>${c.safety.stars} stars ${chip("Simulated")}</dd><dt>notice</dt><dd>${CINCOUNT(c)} of 26 fields ${chip("Simulated")}</dd></dl>
  <details><summary>JSON-LD in this page</summary><pre data-ld-for="${c.id}"></pre></details>`; };
const CINCOUNT = (c) => Object.values(c.cin).filter((f) => f.value !== undefined).length;
function drawCards() {
  const list = cars.filter((c) => matches(c));
  $("#cards").innerHTML = list.map((c) => `<li class="car" id="car-${c.id}">
    <div class="thumb"><img src="/cars/img/${c.id}-4x3.webp" alt="Studio render of the ${esc(c.title)} in ${esc(c.colour.toLowerCase())} (Simulated)" width="1200" height="900" loading="lazy" decoding="async"></div>
    <p class="site"><span>${esc(DEALER.sites[c.site].region)} · ${c.id}</span>${c.hold.status !== "available" ? `<span class="held">On hold</span>` : chip("Simulated")}</p>
    <h3>${esc(c.title)}</h3>
    <div class="person"><p class="price">${money(c.priceNzd)}</p><p class="meta">${c.odometerKm.toLocaleString("en-NZ")} km · ${esc(c.fuelLabel)} · ${esc(c.colour)}</p></div>
    <div class="agentv">${agentDl(c)}</div>
    <div class="flip"><button class="btn tiny" type="button" data-flip="${c.id}" aria-pressed="false">View as an agent</button><button class="btn tiny" type="button" data-check="${c.id}">Is it a good buy?</button></div></li>`).join("");
  $("#stock-count").textContent = `${list.length} of ${cars.length} cars · ${list.filter((c) => c.hold.status !== "available").length} on hold · all Simulated`;
  if (allView === "agent") $$("#cards .car").forEach((el) => flip(el, true));
}
let allView = "person";
function flip(card, on) { card.classList.toggle("as-agent", on); const b = card.querySelector("[data-flip]"); b.setAttribute("aria-pressed", on); b.textContent = on ? "View as a person" : "View as an agent";
  const pre = card.querySelector("pre[data-ld-for]"); if (on && pre && !pre.textContent) { const s = document.getElementById("ld-" + pre.dataset.ldFor); pre.textContent = s ? JSON.stringify(JSON.parse(s.textContent), null, 2) : JSON.stringify(toJsonLd(cars.find((c) => c.id === pre.dataset.ldFor)), null, 2); } }
$("#stock-tools").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.k) { FILTERS[b.dataset.k] = b.dataset.v; drawFilters(); drawCards(); }
  if (b.dataset.all) { allView = b.dataset.all; $$(".view-all button").forEach((x) => x.setAttribute("aria-pressed", x === b)); $$("#cards .car").forEach((el) => flip(el, allView === "agent")); }
});
$("#cards").addEventListener("click", (e) => {
  const f = e.target.closest("[data-flip]"); if (f) { const card = f.closest(".car"); flip(card, !card.classList.contains("as-agent")); return; }
  const c = e.target.closest("[data-check]"); if (c) { $('input[name="mode"][value="demo"]').checked = true; $('input[name="mode"][value="demo"]').dispatchEvent(new Event("change")); $("#gb-car").value = c.dataset.check; autoRan = true;
    $("#check").scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" }); $("#gb-form").requestSubmit(); }
});
drawFilters(); drawCards();

// ---------------------------------------------------------------- connect
$("#tool-list").innerHTML = TOOLS.map((t) => `<li><b>${t.name}</b> · ${esc(t.title)} ${t.annotations.readOnlyHint ? "" : chip("Simulated", "asks first")}</li>`).join("");
$("#copy-url").addEventListener("click", (e) => copy($("#mcp-url").textContent, e.currentTarget));
(async () => { // is the endpoint answering from here? (a ping, nothing more)
  const st = $("#mcp-status"), t0 = performance.now();
  try {
    const r = await fetch(MCP_URL, { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream", "mcp-protocol-version": PV, "mcp-method": "ping" }, body: JSON.stringify({ jsonrpc: "2.0", id: "ping", method: "ping", params: { _meta: { "io.modelcontextprotocol/protocolVersion": PV } } }) });
    const j = await r.json(); if (!j.result) throw new Error();
    st.textContent = `Answering · ${Math.round(performance.now() - t0)} ms`; st.dataset.truth = "Live";
  } catch (e) { st.textContent = "Not reachable from this page"; st.dataset.truth = "Estimate"; }
})();
// the card preview: this page plays an MCP Apps host and hands the view a real car_check result
const frame = $("#card-frame"); let frameReady = false, pendingCard = null;
function sendCardResult(result) { pendingCard = result; if (frameReady) frame.contentWindow.postMessage({ jsonrpc: "2.0", method: "ui/notifications/tool-result", params: { content: [{ type: "text", text: result.summary }], structuredContent: result } }, "*"); }
addEventListener("message", (e) => {
  if (e.source !== frame.contentWindow) return; const m = e.data; if (!m || m.jsonrpc !== "2.0") return;
  const dark = getComputedStyle(document.documentElement).colorScheme === "dark";
  if (m.method === "ui/initialize") frame.contentWindow.postMessage({ jsonrpc: "2.0", id: m.id, result: { protocolVersion: "2026-01-26", hostInfo: { name: "assembl-lab-preview", version: "1" }, hostCapabilities: { openLinks: {} }, hostContext: { theme: dark ? "dark" : "light", displayMode: "inline", locale: "en-NZ", timeZone: "Pacific/Auckland", platform: "web" } } }, "*");
  else if (m.method === "ui/notifications/initialized") { frameReady = true; if (pendingCard) sendCardResult(pendingCard); else mcp("car_check", { car_id: hero.id, km_per_week: 200 }).then((r) => sendCardResult(r.result)); }
  else if (m.method === "ui/notifications/size-changed" && m.params && m.params.height) frame.style.height = Math.min(1600, Math.max(320, Math.ceil(m.params.height))) + "px";
  else if (m.method === "ui/open-link" && m.params && /^https:\/\//.test(m.params.url)) { window.open(m.params.url, "_blank", "noopener"); frame.contentWindow.postMessage({ jsonrpc: "2.0", id: m.id, result: {} }, "*"); }
  else if (m.id != null && m.method) frame.contentWindow.postMessage({ jsonrpc: "2.0", id: m.id, result: {} }, "*");
});
new IntersectionObserver((es, io) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); frame.src = "/cars/card.html"; } }, { rootMargin: "400px" }).observe(frame);
window.__carsPage = { setBeat, layout, get beat() { return beat; }, get stage() { return stage; }, posterMode: () => posterMode, mcp };
