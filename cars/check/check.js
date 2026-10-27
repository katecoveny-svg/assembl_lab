// /cars/check/: the car check, assembled on a maquette of the buyer's car, then shown the way a chat app shows it.
// The page plays an MCP Apps host for one view: it calls car_check on the endpoint, reads the card resource and renders the card
// in a sandboxed iframe with the CSP the resource declares; the card's sliders call running_cost through this page. If the
// endpoint can't be reached (a static preview), the same tools run in the page. Nothing typed is kept: no storage, no cookies.
// Motion: when the check runs, the car turns to each part as its fact lands (the odometer at once, the rest when the result is
// in). With prefers-reduced-motion it shows the end state. Without WebGL, a studio render of the body type stands in.
const MCP = "/api/mcp/", CARD = "ui://cars/car-check.v2.html";
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const chip = (t, label) => (t ? `<span class="chip" data-truth="${esc(t)}">${esc(label || t)}</span>` : "");
const money = (n, d = 0) => (n == null || !isFinite(n) ? "–" : "$" + Number(n).toLocaleString("en-NZ", { minimumFractionDigits: d, maximumFractionDigits: d }));
const num = (n) => Number(n).toLocaleString("en-NZ");
const pct = (x) => (x >= 99.5 && x < 100 ? Number(x).toFixed(1) : String(Math.round(x))) + "%"; // 99.6 stays 99.6, never "100%"
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const mon = (ym) => (ym ? MONTHS[+ym.slice(5, 7) - 1] + " " + ym.slice(0, 4) : "");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mqReduce = matchMedia("(prefers-reduced-motion: reduce)"), mqNarrow = matchMedia("(max-width: 900px)"), mqDark = matchMedia("(prefers-color-scheme: dark)");
const reduced = () => mqReduce.matches, narrow = () => mqNarrow.matches;
const isDark = () => { const t = document.documentElement.dataset.theme; return t ? t === "dark" : mqDark.matches; };

// ---------- the car's look: body (a fact the check can use) and paint (the picture only) ---------------------------------
const PAINTS = [ // common NZ colours, as satin maquette paint (the swatch is the colour as it reads on paper)
  { id: "white", name: "White", hex: "#ECE9E4", sw: "#F1EFEB" }, { id: "silver", name: "Silver", hex: "#BFC2C5", sw: "#C4C7CA" }, { id: "grey", name: "Grey", hex: "#6E7175", sw: "#76797D" },
  { id: "black", name: "Black", hex: "#2E2D31", sw: "#29282C" }, { id: "blue", name: "Blue", hex: "#34507A", sw: "#2F4D74" }, { id: "red", name: "Red", hex: "#9A3431", sw: "#9A2E2C" },
];
const BODY_WORD = { hatch: "hatchback", sedan: "sedan", suv: "SUV", ute: "ute", van: "van" };
// the register's BODY_TYPE → the kit's five classes (an SUV is usually a "station wagon" on the register)
const regKind = (g) => { const v = String((g && g.body && g.body.value) || "").toLowerCase();
  return /hatch/.test(v) ? "hatch" : /saloon|sedan/.test(v) ? "sedan" : /utility|pick ?up|cab and chassis/.test(v) ? "ute" : /van|bus/.test(v) ? "van" : /wagon|sports utility|suv/.test(v) ? "suv" : null; };
let kind = "hatch", kindFrom = "example", paint = "blue";
$("#paint-pick").innerHTML = PAINTS.map((p) => `<label title="${p.name}"><input type="radio" name="paint" value="${p.id}"${p.id === paint ? " checked" : ""} aria-label="${p.name}"><span style="--p:${p.sw}"></span></label>`).join("");
const paintHex = () => PAINTS.find((p) => p.id === paint).hex;

// ---------- the form ---------------------------------------------------------------------------------------------------
const v = (id) => $(id).value.trim(), nv = (id) => { const x = parseFloat(v(id).replace(/[^\d.]/g, "")); return isFinite(x) ? x : undefined; };
function args() {
  const a = { make: v("#make") || undefined, model: v("#model") || undefined, year: nv("#year") && Math.round(nv("#year")), odometer_km: nv("#km") != null ? Math.round(nv("#km")) : undefined, price_nzd: nv("#price"),
    fuel: v("#fuel"), region: v("#region"), imported: v("#imported"), money_owing: v("#owing"), wof_expiry: v("#wof") || undefined, licence_expiry: v("#lic") || undefined,
    body: kindFrom === "you" ? kind : undefined, source: "typed by the buyer", km_per_week: 200 };
  return Object.fromEntries(Object.entries(a).filter(([, x]) => x !== undefined && x !== ""));
}
const decalFacts = () => ({ km: nv("#km") ?? null, price: nv("#price") ?? null, wof: v("#wof") || null, licence: v("#lic") || null, owing: v("#owing") });
// the question as a buyer would type it: "Is a 2016 Aqua with 98k for $11.5k in Auckland a good buy?"
function question(a = args()) {
  const k = (n) => (n >= 1000 ? (Math.round(n / 100) / 10).toString().replace(/\.0$/, "") + "k" : String(n));
  const what = [a.year, a.model || a.make].filter(Boolean).join(" ") || "this car";
  return `Is a ${what}${a.odometer_km != null ? ` with ${k(a.odometer_km)}` : ""}${a.price_nzd != null ? ` for $${a.price_nzd >= 1000 ? k(a.price_nzd) : a.price_nzd}` : ""}${a.region ? ` in ${a.region}` : ""} a good buy?`;
}
const SEL = (id) => { const s = $(id); return s.options[s.selectedIndex].text; };
function moreSummary() { const w = v("#wof"), l = v("#lic");
  $("#more-sum").textContent = [SEL("#fuel"), SEL("#imported"), w ? "WOF " + mon(w) : null, l ? "licence " + mon(l) : null, "money owing: " + SEL("#owing").toLowerCase()].filter(Boolean).join(" · "); }
moreSummary();
// a new make or model makes the hidden fuel and import answers stale: unless the buyer set them, they go back to "Not sure"
const touched = new Set();
["#fuel", "#imported", "#wof", "#lic", "#owing"].forEach((id) => $(id).addEventListener("change", () => touched.add(id)));
["#make", "#model"].forEach((id) => $(id).addEventListener("input", () => { ["#fuel", "#imported"].forEach((s) => { if (!touched.has(s)) $(s).value = "unknown"; }); if (kindFrom === "register") kindFrom = "example"; }));
$("#f").addEventListener("input", () => { moreSummary(); $("#bubble").textContent = question(); if (stage) stage.setFacts(decalFacts()); if (result) markStale(true); });

// ---------- MCP: the endpoint first, the same tools in this page if it can't be reached -----------------------------------
let seq = 0, endpoint = null, frame = null, last = null, hostTools = false, cardCache = null;
async function rpc(method, params) {
  const c = new AbortController(), t = setTimeout(() => c.abort(), 25000);
  try {
    const r = await fetch(MCP, { method: "POST", signal: c.signal, headers: { "content-type": "application/json", accept: "application/json, text/event-stream" }, body: JSON.stringify({ jsonrpc: "2.0", id: ++seq, method, params }) });
    const j = await r.json(); if (j.error) throw new Error(j.error.message); return j.result;
  } finally { clearTimeout(t); }
}
async function callTool(name, a) {
  if (endpoint !== false) { try { const r = await rpc("tools/call", { name, arguments: a }); endpoint = true; return r; } catch (e) { endpoint = false; } }
  const T = await import("/cars/tools.js"), stock = await fetch("/cars/feed.json").then((r) => r.json());
  const ctx = name === "car_check" ? { register: await T.registerFor(stock, a) } : {};
  const r = T.callTool(name, a, { stock, ctx });
  return { content: [{ type: "text", text: r.text }], ...(r.structuredContent ? { structuredContent: r.structuredContent } : {}), isError: r.isError, ...(r.meta ? { _meta: r.meta } : {}) };
}
async function cardHtml() {
  if (cardCache) return cardCache;
  if (endpoint !== false) { try { const r = await rpc("resources/read", { uri: CARD }); const c = r.contents[0]; return (cardCache = withCsp(c.text, c._meta && c._meta.ui && c._meta.ui.csp)); } catch (e) { /* fall through */ } }
  return (cardCache = withCsp(await fetch("/cars/card.html").then((r) => r.text()), { resourceDomains: ["https://assembl-lab.vercel.app"] }));
}
// the CSP a host builds from _meta.ui.csp (MCP Apps spec): the card may load images from the declared origin and nothing else
function withCsp(html, csp = {}) {
  const res = (csp.resourceDomains || []).join(" "), con = (csp.connectDomains || []).join(" ");
  const policy = `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: ${res}; font-src ${res || "'none'"}; media-src data: ${res}; connect-src ${con || "'none'"}; frame-src 'none'; base-uri 'none'; form-action 'none'`;
  return html.replace(/<head>/i, `<head><meta http-equiv="Content-Security-Policy" content="${policy}">`);
}
const post = (m) => frame && frame.contentWindow && frame.contentWindow.postMessage(m, "*");
function showCard(a, res, html, ms) {
  last = { args: a, result: res }; hostTools = !!endpoint;
  $("#ms").textContent = `car_check · ${ms} ms · ${endpoint ? "assembl endpoint" : "tools in this page"}`;
  $("#txt").textContent = (res.content || []).map((c) => c.text).join("\n"); $("#det").hidden = false;
  $("#bubble").textContent = question(a);
  const keepH = frame ? frame.style.height : "";
  frame = document.createElement("iframe"); frame.title = "Car check card, as an assistant shows it"; frame.setAttribute("sandbox", "allow-scripts allow-popups allow-popups-to-escape-sandbox");
  if (keepH) frame.style.height = keepH;
  frame.srcdoc = html; $("#slot").replaceChildren(frame);
}
addEventListener("message", async (e) => {
  if (!frame || e.source !== frame.contentWindow) return; const m = e.data; if (!m || m.jsonrpc !== "2.0") return;
  const reply = (result) => post({ jsonrpc: "2.0", id: m.id, result }), fail = (message) => post({ jsonrpc: "2.0", id: m.id, error: { code: -32000, message } });
  switch (m.method) {
    case "ui/initialize": return reply({ protocolVersion: "2026-01-26", hostInfo: { name: "assembl-lab-check-page", version: "2" }, hostCapabilities: { openLinks: {}, ...(hostTools ? { serverTools: {} } : {}) },
      hostContext: { theme: isDark() ? "dark" : "light", displayMode: "inline", availableDisplayModes: ["inline"], locale: "en-NZ", timeZone: "Pacific/Auckland", platform: "web" } });
    case "ui/notifications/initialized": post({ jsonrpc: "2.0", method: "ui/notifications/tool-input", params: { arguments: last.args } }); post({ jsonrpc: "2.0", method: "ui/notifications/tool-result", params: last.result }); return;
    case "ui/notifications/size-changed": if (m.params && m.params.height) frame.style.height = Math.min(4000, Math.max(300, Math.ceil(m.params.height) + 8)) + "px"; return;
    case "ui/open-link": if (m.params && /^https:\/\//.test(m.params.url)) { window.open(m.params.url, "_blank", "noopener"); return reply({}); } return fail("Only https links open");
    case "tools/call": if (!m.params || m.params.name !== "running_cost") return fail("This page only lets the card call running_cost");
      try { return reply(await callTool("running_cost", m.params.arguments || {})); } catch (err) { return fail(String(err.message || err)); }
    case "ui/request-display-mode": return reply({ mode: "inline" });
    default: if (m.id != null && m.method) reply({});
  }
});

// ---------- the stage: three.js when it can, a studio render when it can't ------------------------------------------------
const stageEl = $("#stage"), carEl = $("#car"), canvas = $("#c3d"), posterEl = $("#poster"), pinsEl = $("#pins"), marksEl = $("#marks"), leadersEl = $("#leaders");
let stage = null, poster = false;
const fit = (w) => (narrow() ? 0.98 : Math.max(0.95, Math.min(1.25, (0.55 * w) / Math.max(300, w - 340)))); // the car alone: big on the paper
// while a check is on the stage (desktop), the camera pulls back so a pin column fits each side of the car
const ROOM = () => (narrow() || poster ? 1 : 1.75);
async function initStage() {
  try {
    if (new URLSearchParams(location.search).has("poster")) throw new Error("poster requested");
    const { createCheckStage } = await import("/cars/check/stage.js");
    stage = await createCheckStage(canvas, { kind, paint: paintHex(), facts: decalFacts(), reduced: reduced(), dark: isDark(), onFrame: () => layout(), fit });
    canvas.classList.add("ready");
  } catch (e) {
    poster = true; stageEl.classList.add("poster"); canvas.hidden = true; posterEl.hidden = false; $("#paint-set").hidden = true; $("#cap").textContent = "Render · body style, not this car"; setPoster();
  }
}
function setPoster() { if (!poster) return; posterEl.src = `/cars/img/body-${kind}-4x3.webp`; posterEl.alt = `Studio render of a ${BODY_WORD[kind]} body style, not this car`; }
function setKind(k, from) {
  if (!(k in BODY_WORD)) return; kind = k; if (from) kindFrom = from;
  $$("#body-pick input").forEach((i) => { i.checked = i.value === k; });
  if (stage) stage.setKind(k); setPoster(); layout();
}
$("#body-pick").addEventListener("change", (e) => { setKind(e.target.value, "you"); bodyNote(); if (result) markStale(true); });
$("#paint-pick").addEventListener("change", (e) => { paint = e.target.value; if (stage) stage.setPaint(paintHex()); });
mqDark.addEventListener("change", () => { if (stage) stage.setTheme(isDark()); post({ jsonrpc: "2.0", method: "ui/notifications/host-context-changed", params: { theme: isDark() ? "dark" : "light" } }); });

// ---------- the pins: one per part, filled from what's typed and what the check returns ----------------------------------
let result = null, view = null; // structuredContent and _meta["assembl/view"] of the last check
const flags = () => (result && result.redFlags) || [], flag = (re) => flags().find((f) => re.test(f.title));
const thisYear = new Date().getFullYear();
const PINS = [
  { id: "dash", side: "R", k: "Odometer", fill(a) {
      const km = a.odometer_km, f = flag(/odometer|use for its age|low km/i);
      return { v: km != null ? num(km) + " km" : "Not given", t: "Your data", level: f ? (f.level === "ask" ? "ask" : "watch") : km != null ? "ok" : "ask",
        s: f ? f.title : km == null ? "A dealer must state the distance travelled" : !a.year ? "Add the year to compare it with its age" : result ? `About ${num(Math.round(km / Math.max(0.5, thisYear - a.year + 0.5) / 100) * 100)} km a year: usual for its age` : "As typed" }; } },
  { id: "screen", side: "R", k: "WOF · licence", fill(a) {
      const w = a.wof_expiry, l = a.licence_expiry, bad = flags().filter((f) => /WOF|Licence/.test(f.title) && f.level !== "ask");
      return { v: [w ? "WOF to " + mon(w.slice(0, 7)) : "WOF not shown", l ? "licence to " + mon(l.slice(0, 7)) : "licence not shown"].join(" · "), t: "Your data",
        level: bad.some((f) => f.level === "stop") ? "stop" : bad.length ? "watch" : w && l ? "ok" : "ask",
        s: bad.length ? bad.map((f) => f.title).join(". ") : w && l ? "No WOF or licence flag" : "Ask, or check the plate on NZTA's free check" }; } },
  { id: "tag", side: "R", k: "Money owing", fill(a) {
      const o = a.money_owing;
      return o === "yes" ? { v: "Registered on the PPSR", s: "Get it cleared, in writing, before you pay", t: "Your data", level: "stop" }
        : o === "no" ? { v: "None, says the seller", s: "Still search the PPSR on the day you pay", t: "Your data", level: "ok" }
        : { v: "Unknown", s: "Run a PPSR search before paying: it takes minutes", t: "Your data", level: "ask" }; } },
  { id: "roof", side: "L", k: "NZ register", fill() {
      const g = result && result.register;
      if (!g || g.found === null) return { v: "Not looked up this time", s: g && g.reason ? g.reason.replace(/\s*\(.*?\)/, "") : "NZTA's register didn't answer", level: "ask" };
      if (!g.found) return { v: "Not on the register under that name", s: "Check the make and model spelling", t: "Source", level: "ask" };
      const how = g.usedImportPct >= 50 ? `${pct(g.usedImportPct)} used imports${g.previousCountry ? `, mostly from ${g.previousCountry.value}` : ""}` : `${pct(g.nzNewPct)} NZ-new`;
      return { v: `${num(g.total)} on the NZ register`, s: `${how} · ${g.period || "NZTA open data"}`, t: "Source", level: g.total < 30 ? "watch" : "ok" }; } },
  { id: "filler", side: "L", k: "Fuel and economy", fill(a) {
      const g = result && result.register, rc = (view && view.runningCost) || (result && result.runningCost) || {}, given = a.fuel && a.fuel !== "unknown" ? a.fuel : null;
      const fuel = given || rc.fuel || (g && g.fuel && g.fuel.value), regFuel = g && g.found && g.fuel ? g.fuel.value : null;
      const name = { petrol: "Petrol", diesel: "Diesel", hybrid: "Hybrid", "plug-in hybrid": "Plug-in hybrid", electric: "Electric" }[fuel] || "Fuel not given";
      // the register's rated figure is for the model as a whole: shown here only when most of them run on this car's fuel
      const rated = g && g.found && g.ratedEconomy && fuel !== "electric" && regFuel === fuel ? `${Number(g.ratedEconomy.lPer100km).toFixed(1)} L/100 km rated` : null, eco = rc.economy;
      const energy = (rc.lines || []).find((l) => l.key === "energy");
      const mismatch = flag(/Fuel doesn't match/);
      return { v: name + (rated ? " · " + rated : ""), t: rated ? "Source" : given ? "Your data" : regFuel === fuel ? "Source" : "Estimate", level: mismatch ? "ask" : "ok",
        s: mismatch ? mismatch.title : eco && energy ? `Costed at ${eco.value} ${eco.unit.replace("L/100km", "L/100 km").replace("kWh/100km", "kWh/100 km")}: ${money(energy.weekly, 2)} a week in ${fuel === "electric" ? "power" : fuel === "diesel" ? "diesel" : "petrol"}` : "", st: eco ? eco.truth : null }; } },
];
const ORDER = ["dash", "screen", "tag", "roof", "filler"];
pinsEl.innerHTML = PINS.map((p, i) => `<li class="pin" data-id="${p.id}" aria-hidden="true"><span class="pin-k"><b>${i + 1}</b>${esc(p.id === "filler" && v("#fuel") === "electric" ? "Charge port" : p.k)}<i aria-hidden="true"></i></span><span class="pin-v"></span><span class="pin-s"></span></li>`).join("");
marksEl.innerHTML = PINS.map((p, i) => `<span class="mk" data-id="${p.id}">${i + 1}</span>`).join("");
leadersEl.innerHTML = PINS.map((p) => `<line data-id="${p.id}" x1="0" y1="0" x2="0" y2="0"/><circle class="ping" data-id="${p.id}" cx="-40" cy="-40" r="4"/><circle class="end" data-id="${p.id}" r="3.5" cx="-40" cy="-40" opacity="0"/>`).join("");
const pinEl = (id) => pinsEl.querySelector(`[data-id="${id}"]`);
let landed = new Set(), lastArgs = null;
function fillPin(id) {
  const p = PINS.find((x) => x.id === id), d = p.fill(lastArgs || args()), li = pinEl(id);
  li.dataset.level = d.level || "";
  li.querySelector(".pin-k").childNodes[1].textContent = p.id === "filler" && (lastArgs || args()).fuel === "electric" ? "Charge port" : p.k;
  li.querySelector(".pin-v").innerHTML = esc(d.v) + " " + chip(d.t);
  li.querySelector(".pin-s").innerHTML = esc(d.s || "") + (d.st && d.st !== d.t ? " " + chip(d.st) : "");
}
function land(id) {
  fillPin(id); landed.add(id); const li = pinEl(id); li.style.setProperty("--fx", (PINS.find((p) => p.id === id).side === "L" ? -24 : 24) + "px");
  li.classList.add("on"); li.setAttribute("aria-hidden", "false"); marksEl.querySelector(`[data-id="${id}"]`).classList.add("on");
  layout(true);
  const ping = leadersEl.querySelector(`circle.ping[data-id="${id}"]`); ping.classList.remove("go"); void ping.getBBox(); if (!reduced()) ping.classList.add("go");
}
function clearPins() {
  landed = new Set(); $$(".pin", pinsEl).forEach((li) => { li.classList.remove("on"); li.setAttribute("aria-hidden", "true"); });
  $$(".mk", marksEl).forEach((m) => m.classList.remove("on")); $$("line", leadersEl).forEach((l) => l.classList.remove("on")); $$("circle.end", leadersEl).forEach((c) => c.setAttribute("opacity", 0));
}
// desktop: each landed pin beside the car on its side, kept apart, with a leader line to its part; narrow: numbered marks only
function layout() {
  const box = carEl.getBoundingClientRect(), W = box.width, H = box.height, wide = !narrow() && !poster;
  const A = Object.fromEntries((stage ? stage.anchors() : []).map((a) => [a.id, a]));
  for (const p of PINS) { const a = A[p.id], m = marksEl.querySelector(`[data-id="${p.id}"]`), li = pinEl(p.id);
    if (!a) { m.classList.remove("on"); continue; }
    m.style.left = a.x + "px"; m.style.top = a.y + "px"; m.classList.toggle("on", landed.has(p.id) && !wide); m.classList.toggle("away", !a.visible); li.classList.toggle("away", landed.has(p.id) && !a.visible && wide); }
  if (!wide) return;
  for (const side of ["L", "R"]) {
    const list = PINS.filter((p) => p.side === side && landed.has(p.id) && A[p.id]).map((p) => ({ p, a: A[p.id], li: pinEl(p.id) })).sort((x, y) => x.a.y - y.a.y);
    let y = 34; for (const it of list) { it.h = it.li.offsetHeight || 80; it.y = Math.max(y, Math.min(H - it.h - 30, it.a.y - it.h / 2)); y = it.y + it.h + 10; }
    for (let i = list.length - 1, lim = H - 30; i >= 0; i--) { const it = list[i]; if (it.y + it.h > lim) it.y = lim - it.h; lim = it.y - 10; }
    for (const it of list) {
      const w = it.li.offsetWidth || 178, x = side === "L" ? 0 : W - w; it.li.style.left = x + "px"; it.li.style.top = it.y + "px";
      const line = leadersEl.querySelector(`line[data-id="${it.p.id}"]`), dot = leadersEl.querySelector(`circle.end[data-id="${it.p.id}"]`), ping = leadersEl.querySelector(`circle.ping[data-id="${it.p.id}"]`);
      const lx = side === "L" ? x + w : x, ly = it.y + Math.min(24, it.h / 2);
      line.setAttribute("x1", lx); line.setAttribute("y1", ly); line.setAttribute("x2", it.a.x); line.setAttribute("y2", it.a.y); line.classList.add("on"); line.setAttribute("opacity", it.a.visible ? 1 : 0.25);
      dot.setAttribute("cx", it.a.x); dot.setAttribute("cy", it.a.y); dot.setAttribute("opacity", it.a.visible ? 1 : 0.3); ping.setAttribute("cx", it.a.x); ping.setAttribute("cy", it.a.y);
    }
  }
}
new ResizeObserver(() => { if (stage) stage.resize(); layout(); }).observe(carEl);
mqNarrow.addEventListener("change", () => { if (stage) { stage.jump(stage.yaw, landed.size ? ROOM() : 1); stage.resize(); } layout(); });

// ---------- status, body note, verdict ---------------------------------------------------------------------------------
const statusEl = $("#status");
const status = (text, state = "") => { $("#status-t").textContent = text; statusEl.dataset.state = state; };
function bodyNote() {
  const g = result && result.register, rk = regKind(g), el = $("#bodynote");
  if (!rk) { el.innerHTML = kindFrom === "you" ? `Body as you chose: ${esc(BODY_WORD[kind])} ${chip("Your data")}` : ""; return; }
  const reg = esc(g.body.value.toLowerCase()) + (g.body.pct != null ? ` (${pct(g.body.pct)} of them)` : ""), an = (w) => (/^(SUV|[aeio])/i.test(w) ? "an " : "a ") + w; // a ute, an SUV
  el.innerHTML = rk === kind ? `Body on NZTA's register: ${reg}${g.body.value.toLowerCase().includes(BODY_WORD[kind].toLowerCase()) ? "" : `, drawn as ${an(BODY_WORD[kind])}`} ${chip("Source")}`
    : `Body as you chose: ${esc(BODY_WORD[kind])} ${chip("Your data")} · on NZTA's register: ${reg} ${chip("Source")}`;
}
function verdict(show) {
  $("#v-idle").hidden = show; const d = $("#v-done"); d.hidden = !show; d.classList.remove("on");
  if (!show) return;
  const r = result, fl = r.redFlags || [], stops = fl.filter((f) => f.level === "stop").length, asks = fl.filter((f) => f.level === "ask").length, rc = r.runningCost || {};
  $("#v-name").innerHTML = esc(r.car.name) + " " + chip(r.car.truth);
  $("#v-head").textContent = (r.summary || "").split(/[;,.]/)[0] + ".";
  const items = [
    ...(stops ? [{ b: String(stops), s: stops === 1 ? "thing to resolve first" : "things to resolve first", t: "Your data", level: "stop" }] : []),
    { b: String(asks), s: asks === 1 ? "question to ask" : "questions to ask", t: "Your data" },
    { b: String((r.checks || []).length), s: "checks before paying", t: "Source" },
    { b: money(rc.totalWeekly, 2), s: `a week to run, at ${rc.kmPerWeek || 200} km`, t: "Estimate" },
  ];
  $("#tally").innerHTML = items.map((x, i) => `<li style="--i:${i}"${x.level ? ` data-level="${x.level}"` : ""}><b>${esc(x.b)}</b><span>${esc(x.s)} ${chip(x.t)}</span></li>`).join("");
  void d.offsetWidth; d.classList.add("on");
}
function markStale(yes) { stageEl.classList.toggle("stale", yes); if (yes) status("Facts changed: press Check this car again"); }

// ---------- the check: the motion follows the work -------------------------------------------------------------------------
let runId = 0, playing = null, lastMs = 0;
const btn = $("#go");
async function check() {
  const id = ++runId, a = args(), t0 = performance.now();
  lastArgs = a; markStale(false); clearPins(); verdict(false); $("#v-idle").innerHTML = "Checking. The verdict assembles here once every fact has landed.";
  btn.disabled = true; btn.textContent = "Checking…";
  if (narrow()) stageEl.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
  const pending = Promise.all([callTool("car_check", a), cardHtml()]);
  pending.catch(() => {});
  status("Reading what you typed");
  const instant = reduced() || !stage;
  // 1. the odometer is the buyer's own figure: it lands while the endpoint works
  if (!instant) { await stage.turn("dash", ROOM()); if (id !== runId) return; land("dash"); }
  let settled = false; pending.then(() => { settled = true; }, () => { settled = true; });
  if (!settled) status(`Asking NZTA's register about ${[a.year, a.make, a.model].filter(Boolean).join(" ")}s`);
  let res, html;
  try { [res, html] = await pending; } catch (err) { if (id !== runId) return; return failed(err); }
  if (id !== runId) return;
  if (res.isError || !res.structuredContent) return failed(new Error((res.content || []).map((c) => c.text).join(" ") || "no result"));
  const ms = (lastMs = Math.round(performance.now() - t0));
  result = res.structuredContent; view = (res._meta && res._meta["assembl/view"]) || null;
  showCard(a, res, html, ms); cardShown = true;
  status(`Result in ${ms < 1000 ? ms + " ms" : (ms / 1000).toFixed(1) + " s"} from ${endpoint ? "assembl's endpoint" : "the tools in this page"}`);
  // 2. the rest, part by part; the register's body type reshapes the car when the buyer hasn't chosen one
  const rk = regKind(result.register), reshape = () => { if (rk && kindFrom !== "you" && rk !== kind) setKind(rk, "register"); else if (rk && kindFrom !== "you") kindFrom = "register"; bodyNote(); };
  btn.disabled = false; btn.textContent = "Show it all now"; playing = id;
  if (instant) { reshape(); ORDER.forEach(land); if (stage) stage.jump("done", ROOM()); layout(); return finish(id, ms); }
  fillPin("dash");
  for (const b of ORDER.slice(1)) {
    await stage.turn(b); if (id !== runId) return;
    if (b === "roof") reshape();
    land(b); await sleep(260); if (id !== runId) return;
  }
  await stage.turn("done"); if (id !== runId) return; layout();
  finish(id, ms);
}
function finish(id, ms) {
  if (id !== runId) return; playing = null;
  ORDER.forEach((p) => { if (!landed.has(p)) land(p); });
  verdict(true); btn.disabled = false; btn.textContent = "Check this car";
  const g = result.register;
  status(`Checked in ${ms < 1000 ? ms + " ms" : (ms / 1000).toFixed(1) + " s"} · ${endpoint ? "assembl endpoint" : "tools in this page"}${g && g.period ? " · " + g.period : ""}`, "done");
}
// "Show it all now": skip the turns, keep the result
function skip() {
  const id = ++runId, rk = regKind(result.register); // a new run id stops the sequence where it is
  if (rk && kindFrom !== "you" && rk !== kind) setKind(rk, "register"); else if (rk && kindFrom !== "you") kindFrom = "register"; bodyNote();
  if (stage) stage.jump("done", ROOM()); finish(id, lastMs); layout();
}
function failed(err) {
  btn.disabled = false; btn.textContent = "Check this car"; playing = null; clearPins(); if (stage) stage.turn("idle", 1);
  status("The check didn't run. Try again.", "error");
  $("#v-idle").hidden = false; $("#v-idle").textContent = `The check didn't run: ${String(err.message || err).replace(/[<&]/g, "").slice(0, 160)}. Try again in a moment.`;
}
$("#f").addEventListener("submit", (e) => { e.preventDefault(); if (playing && result) return skip(); check(); });

// the chat card for the example, filled in quietly when the reader gets near it (if they haven't pressed Check yet)
let cardShown = false;
const io = new IntersectionObserver(async (ents) => {
  if (!ents.some((x) => x.isIntersecting) || cardShown) return; io.disconnect(); cardShown = true;
  const a = args(), t0 = performance.now();
  try { const [res, html] = await Promise.all([callTool("car_check", a), cardHtml()]); if (last) return; showCard(a, res, html, Math.round(performance.now() - t0)); }
  catch (err) { if (!last) $("#slot").innerHTML = `<p class="wait">The card didn't load: ${String(err.message || err).replace(/[<&]/g, "")}. Press Check this car to try again.</p>`; cardShown = false; }
}, { rootMargin: "300px 0px" });
io.observe($("#chat"));

$("#cp").addEventListener("click", async (e) => { try { await navigator.clipboard.writeText($("#u").textContent); e.target.textContent = "Copied"; } catch (err) { e.target.textContent = "Select and copy"; } });

// start: the 3D car fades in when three.js is in; without WebGL, a studio render of the body type
$("#bubble").textContent = question();
await initStage();
layout();
window.__check = { get stage() { return stage; }, get result() { return result; }, get poster() { return poster; }, layout, skip, get landed() { return [...landed]; } };
