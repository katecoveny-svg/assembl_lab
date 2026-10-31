// The dealer agent desk. The viewer plays a buyer whose AI assistant works the dealer's MCP endpoint (search_cars, get_car, car_check,
// running_cost, then hold_car or book_test_drive), then switches seats and plays the salesperson who approves or declines. Each decision
// becomes a record in one shared format (assembl.dealer-record/1), hashed with SHA-256 in the browser and chained into a ledger that every
// desk (sales, finance, service) reads. Everything is Simulated: nothing is held, booked, sent or stored outside this tab.
import { CFG, $, $$, esc, fmt, dollars, chip, json, jsonHTML, reducedMQ, narrowMQ, download, ICON } from "./core.js";
import { parseAsk } from "./cartool.js";

const PREF = ["price.cash", "cash_price", "price.includes", "securityInterest.registered", "security_interest", "odometer.km", "odometer", "wof.expiry", "wof_expiry", "licence.expiry", "licence_expiry",
  "supplier.traderRegistrationNumber", "trader_reg", "import.damaged", "imported_damaged", "ruc.outstanding", "ruc_outstanding", "re_registered"];
const READS = {
  finance: [["price.cash", "cash_price"], ["price.includes"], ["securityInterest.registered", "security_interest"], ["ruc.outstanding", "ruc_outstanding"]],
  service: [["wof.expiry", "wof_expiry"], ["licence.expiry", "licence_expiry"], ["odometer.km", "odometer"]] };
const STEPS = [["search_cars", "Search"], ["get_car", "Notice"], ["car_check", "Check"], ["request", "Request"], ["approval", "Approval"], ["receipt", "Receipt"]];
const TCH = { Simulated: "sim", Source: "src", Estimate: "est", Estimated: "est", Missing: "warn", "Latest published": "src", "Your data": "data" };
const tchip = (t) => `<span class="tt" data-tt="${TCH[t] || "sim"}">${esc(t)}</span>`;
const nowIso = () => new Date().toISOString();
const clock = (iso) => new Date(iso).toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit" });
const short = (h) => h ? `${h.slice(0, 6)}…${h.slice(-4)}` : "–";

// ---------------------------------------------------------------- SHA-256 over a canonical JSON form (sorted keys), WebCrypto with a small fallback
const canon = (v) => v === null || typeof v !== "object" ? JSON.stringify(v) : Array.isArray(v) ? `[${v.map(canon).join(",")}]` : `{${Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(",")}}`;
async function sha256(text) {
  const data = new TextEncoder().encode(text);
  if (crypto && crypto.subtle) { const h = await crypto.subtle.digest("SHA-256", data); return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join(""); }
  const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  let H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const l = data.length, n = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(n); m.set(data); m[l] = 0x80; const dv = new DataView(m.buffer); dv.setUint32(n - 4, l * 8); dv.setUint32(n - 8, Math.floor(l / 2 ** 29));
  const r = (x, k) => (x >>> k) | (x << (32 - k)), w = new Uint32Array(64);
  for (let i = 0; i < n; i += 64) { for (let t = 0; t < 16; t++) w[t] = dv.getUint32(i + t * 4); for (let t = 16; t < 64; t++) w[t] = (r(w[t - 15], 7) ^ r(w[t - 15], 18) ^ (w[t - 15] >>> 3)) + w[t - 16] + (r(w[t - 2], 17) ^ r(w[t - 2], 19) ^ (w[t - 2] >>> 10)) + w[t - 7] | 0;
    let [a, b, c, d, e, f, g, h] = H; for (let t = 0; t < 64; t++) { const t1 = h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[t] + w[t] | 0, t2 = (r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c)) | 0; h = g; g = f; f = e; e = d + t1 | 0; d = c; c = b; b = a; a = t1 + t2 | 0; }
    H = H.map((x, k) => x + [a, b, c, d, e, f, g, h][k] | 0); }
  return H.map((x) => (x >>> 0).toString(16).padStart(8, "0")).join("");
}

export async function initDesk() {
  const D = CFG.desk, desk = $("#desk"), feed = $("#deskFeed"), queueEl = $("#deskQueue"), ledgerEl = $("#deskLedger"), track = $("#deskTrack");
  const stock = await json(CFG.stockUrl).catch(() => ({ cars: [] })), cars = stock.cars || [], byId = Object.fromEntries(cars.map((c) => [c.id, c]));
  const labels = { ...(stock.noticeLabels || {}) };
  let local = null;
  if (D.endpoint === "local") { const { createLocalEndpoint } = await import("./desk-local.js"); const reg = await json(D.registerUrl).catch(() => ({})); local = createLocalEndpoint(stock, reg, CFG.dealer.name, D.stockNote, D.listingTruth); }
  const st = { seat: "buyer", stepMode: !reducedMQ.matches ? false : true, busy: false, queue: [], ledger: [], last: null, seq: 0, rec: 0, stage: null, gate: null };

  // ---------------------------------------------------------------- the endpoint: remote JSON-RPC over HTTP, or the in-page one
  async function rpc(name, args) {
    const body = { jsonrpc: "2.0", id: ++st.seq, method: "tools/call", params: { name, arguments: args } }, t0 = performance.now();
    let res;
    if (local) res = await local(body);
    else { const c = new AbortController(), timer = setTimeout(() => c.abort(), 30000);
      try { const r = await fetch(CFG.api, { method: "POST", signal: c.signal, headers: { "content-type": "application/json", accept: "application/json, text/event-stream" }, body: JSON.stringify(body) });
        const ct = r.headers.get("content-type") || ""; if (!r.ok) throw new Error(`The endpoint answered ${r.status}.`);
        res = ct.includes("event-stream") ? JSON.parse((await r.text()).split("\n").filter((l) => l.startsWith("data:")).pop().slice(5)) : await r.json();
      } catch (e) { throw new Error(e.name === "AbortError" ? "The endpoint took too long to answer." : e.message); } finally { clearTimeout(timer); } }
    const out = { name, args, request: body, response: res, ms: Math.round(performance.now() - t0), sc: res.result && res.result.structuredContent, meta: res.result && res.result._meta, text: res.result && res.result.content && res.result.content[0] && res.result.content[0].text };
    if (res.error) throw Object.assign(new Error(res.error.message || "The tool returned an error."), { call: out });
    return out;
  }

  // ---------------------------------------------------------------- the stage: the car in the request, large
  const working = (on) => { st.busy = on; desk.classList.toggle("is-working", on); };

  // ---------------------------------------------------------------- seats
  function seat(s, scroll) { st.seat = s; desk.dataset.seat = s; $$("#deskSeat button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.seat === s ? "true" : "false"));
    $("#deskRole").textContent = s === "buyer" ? D.roleBuyer : D.roleDealer;
    if (scroll && narrowMQ.matches) $(s === "buyer" ? "#deskBuyer" : "#deskDealer").scrollIntoView({ behavior: reducedMQ.matches ? "auto" : "smooth", block: "start" }); }
  $$("#deskSeat button").forEach((b) => b.onclick = () => seat(b.dataset.seat, true));
  seat("buyer");

  // ---------------------------------------------------------------- the step tracker under the stage
  track.innerHTML = STEPS.map(([k, l], i) => `<li data-k="${k}"><i>${i + 1}</i><span>${l}</span></li>`).join("");
  const mark = (k, state) => { const li = track.querySelector(`[data-k="${k}"]`); if (li) li.dataset.state = state; };
  const resetTrack = () => $$("li", track).forEach((li) => delete li.dataset.state);

  // ---------------------------------------------------------------- the buyer's feed
  const scroller = $("#deskFeedWrap");
  const toEnd = () => { scroller.scrollTop = scroller.scrollHeight; };
  function say(who, html) { const el = document.createElement("div"); el.className = `msg ${who}`; el.innerHTML = `<span class="who">${who === "buyer" ? "You" : who === "dealer" ? esc(CFG.dealer.short) : "Assistant"}</span><p>${html}</p>`; feed.appendChild(el); toEnd(); return el; }
  function inspector(call) {
    return `<details class="insp"><summary>JSON-RPC · ${local ? "in-page endpoint" : esc(CFG.api)}</summary><div class="insp-b"><span class="label">Request</span><pre>${jsonHTML(call.request)}</pre><span class="label">Response</span><pre>${jsonHTML(call.response)}</pre></div></details>`; }
  function card(tool, args) {
    const el = document.createElement("article"); el.className = "tcard calling"; el.dataset.tool = tool;
    el.innerHTML = `<header><b>${esc(tool)}</b><span class="tmeta">calling</span></header><div class="targs">${Object.entries(args).map(([k, v]) => `<code>${esc(k)}: ${esc(Array.isArray(v) ? v.join(", ") : v)}</code>`).join("")}</div><div class="tres"></div>`;
    feed.appendChild(el); toEnd(); return el; }
  // step mode: before each call the viewer sees what the assistant wants to call, and runs it
  function gate(tool, args) {
    if (!st.stepMode) return Promise.resolve();
    return new Promise((res) => { const el = document.createElement("div"); el.className = "gate-next";
      el.innerHTML = `<span class="label">Next, the assistant calls</span><code>${esc(tool)}(${esc(JSON.stringify(args))})</code><div class="row"><button class="btn sm" type="button" data-go>Next step</button><button class="btn ghost sm" type="button" data-all>Run the rest</button></div>`;
      feed.appendChild(el); toEnd(); el.querySelector("[data-go]").focus();
      el.querySelector("[data-go]").onclick = () => { el.remove(); res(); }; el.querySelector("[data-all]").onclick = () => { st.stepMode = false; $("#deskStep").checked = false; el.remove(); res(); }; });
  }
  async function step(tool, args, k) {
    await gate(tool, args); mark(k || tool, "on"); const el = card(tool, args); working(true);
    try { const r = await rpc(tool, args); el.classList.remove("calling"); el.querySelector(".tmeta").innerHTML = `${local ? "in-page" : "MCP"} · ${r.ms} ms`; el.querySelector(".tres").innerHTML = view(tool, r); el.insertAdjacentHTML("beforeend", inspector(r)); mark(k || tool, "done"); toEnd(); return r; }
    catch (e) { el.classList.remove("calling"); el.classList.add("err"); el.querySelector(".tmeta").textContent = "failed"; el.querySelector(".tres").innerHTML = `<p class="terr">${esc(e.message)}</p>${e.call ? inspector(e.call) : ""}`; mark(k || tool, "err"); throw e; }
    finally { working(false); }
  }

  // ---------------------------------------------------------------- what each tool's answer looks like
  const imgOf = (id, fallback) => (byId[id] && byId[id].img && (byId[id].img.sq || byId[id].img.card)) || fallback || "";
  function noticeRows(sc, all) {
    const m = sc.notice || {}, tr = sc.noticeTruth || {}, lb = { ...labels, ...(sc.noticeLabels || {}) }, base = sc.truth || "Simulated";
    let keys = Object.keys(m); if (!all) { const pref = PREF.filter((k) => k in m); keys = [...new Set([...pref, ...keys])].slice(0, 8); }
    return keys.map((k) => { const v = m[k], t = tr[k] || base; return `<div class="nf"><span>${esc(lb[k] || k.replace(/[._]/g, " "))}</span><b>${v == null ? "not shown" : esc(typeof v === "boolean" ? (v ? "yes" : "no") : /price|cash/.test(k) && typeof v === "number" ? dollars(v) : /odometer/.test(k) && typeof v === "number" ? fmt(v) + " km" : v)}</b>${tchip(v == null && !tr[k] ? "Missing" : t)}</div>`; }).join(""); }
  function view(tool, r) {
    const sc = r.sc || {};
    if (tool === "search_cars") { const list = sc.results || [];
      return `<p class="tsum">${sc.matched} of ${sc.total} cars match${sc.closeMatches ? `, ${sc.closeMatches} close` : ""} ${tchip(sc.truth || "Simulated")}</p><div class="tcars">${list.slice(0, 4).map((c, i) => `<figure class="${i === 0 ? "pick" : ""}"><img src="${esc(imgOf(c.id, c.image && c.image.url))}" alt="" loading="lazy"><figcaption><b>${dollars(c.priceNzd)}</b><span>${esc(c.title)}</span></figcaption></figure>`).join("")}</div>`; }
    if (tool === "get_car") { const c = sc.car || {}, k = sc.checks || {}, n = k.cinFields || {};
      return `<div class="tcar"><img src="${esc(imgOf(c.id, sc.images && sc.images[0] && sc.images[0].url))}" alt=""><div><b>${esc(c.title)}</b><span>${dollars(c.priceNzd)} · ${fmt(c.odometerKm)} km · ${esc(c.region || "")}</span></div></div>
        <span class="label">Consumer Information Notice, as data · ${n.present ?? "–"} of ${n.total ?? "–"} fields</span><div class="nfs">${noticeRows(sc)}</div>
        <details class="more"><summary>All ${Object.keys(sc.notice || {}).length} notice fields</summary><div class="nfs">${noticeRows(sc, true)}</div></details>
        ${sc.testDriveSlots && sc.testDriveSlots.length ? `<div class="slots">${sc.testDriveSlots.map((s) => `<span>${esc(s.label)}</span>`).join("")}${tchip("Simulated")}</div>` : ""}`; }
    if (tool === "car_check") { const g = sc.register || {}, n = sc.notice || {}, flags = sc.redFlags || [];
      return `<div class="tkpis"><div><b>${g.found ? fmt(g.total) : "–"}</b><span>${g.found ? `${esc(g.name)}s on the NZ register` : "not in the register data"}</span>${g.found ? tchip("Source") : ""}</div><div><b>${n.present ?? "–"}<small>/${n.total ?? "–"}</small></b><span>notice facts given</span>${tchip("Simulated")}</div><div><b>${flags.length}</b><span>question${flags.length === 1 ? "" : "s"} to ask</span></div></div>
        ${g.found ? `<p class="tsrc">${esc(g.source ? g.source.name : "NZTA Motor Vehicle Register")} · ${esc(g.period || "")} · ${g.status === "snapshot" ? "stored snapshot" : "live"}</p>` : ""}`; }
    if (tool === "running_cost") { const lines = sc.lines || [], mx = Math.max(...lines.map((l) => l.weekly), 1);
      return `<p class="tsum"><b class="big">${dollars(sc.totalWeekly)}</b> a week at ${fmt(sc.kmPerWeek)} km</p><div class="bars">${lines.map((l) => `<div class="b"><span>${esc(l.label)}</span><span class="t"><i style="width:${(l.weekly / mx * 100).toFixed(1)}%"></i></span><b>${dollars(l.weekly)}</b></div>`).join("")}</div><p class="tsrc">${[...new Set(lines.map((l) => l.truth))].map(tchip).join(" ")}</p>`; }
    if (tool === "hold_car" || tool === "book_test_drive") {
      return `<div class="treq"><span class="pill-auth">Act with approval</span><p><b>${esc(tool === "hold_car" ? `Hold until ${sc.holdUntil}` : `Test drive, ${sc.slot && sc.slot.label}`)}</b> · ${esc(sc.car && sc.car.title)}</p><p class="tsrc">${esc(sc.nextStep || "")} ${tchip("Simulated")}</p><p class="tsrc">Request ${esc((r.meta && r.meta["assembl/requestRef"]) || "–")} · ${esc(sc.sideEffects || "")}</p></div>`; }
    return `<pre>${jsonHTML(sc)}</pre>`;
  }

  // ---------------------------------------------------------------- a run: the buyer's request, worked through the tools
  let runId = 0;
  async function run(sc) {
    if (st.busy && st.lock) return; const my = ++runId; st.lock = true;
    feed.innerHTML = ""; resetTrack(); seat("buyer");
    say("buyer", esc(sc.text));
    try {
      const args = { ...(sc.args || parseAsk(sc.text, [], [])) }; args.limit = 4; if (sc.day) args.test_drive_day = sc.day;
      const s = await step("search_cars", args); if (my !== runId) return;
      const top = s.sc && s.sc.results && s.sc.results[0];
      if (!top) { say("assistant", "Nothing in this stock matches all of that. Try loosening the budget or the body type."); return; }
      say("assistant", `The best match is the <b>${esc(top.title)}</b> at ${dollars(top.priceNzd)}. I'll read its notice before anything else.`);
      const g = await step("get_car", { car_id: top.id, ...(sc.day ? { test_drive_day: sc.day } : {}) }, "get_car"); if (my !== runId) return;
      showCar(g.sc);
      const chk = await step("car_check", { car_id: top.id }, "car_check"); if (my !== runId) return;
      if (sc.cost) await step("running_cost", { car_id: top.id, km_per_week: 200 }, "car_check");
      // consent: binding steps need the buyer's yes before the assistant asks the dealer
      let intent = sc.intent;
      if (!intent) intent = await ask(`Shall I ask ${esc(CFG.dealer.short)} to hold it, or book a test drive?`, [["hold", "Hold it for two days"], ["drive", "Book a test drive"], ["none", "Not now"]]);
      else say("assistant", `You asked me to ${intent === "hold" ? "have it held" : "book a test drive"}. The dealer has to approve that, so I'm sending a request, not a booking.`);
      if (intent === "none" || my !== runId) { say("assistant", "No request sent. The notice and checks are above."); return; }
      let req;
      if (intent === "drive") { const slot = (g.sc.testDriveSlots || [])[0]; if (!slot) { say("assistant", "There's no free test-drive time in the next week, so I'll ask the dealer to hold it for you instead."); intent = "hold"; req = await step("hold_car", { car_id: top.id }, "request"); }
        else req = await step("book_test_drive", { car_id: top.id, slot: slot.start }, "request"); }
      else req = await step("hold_car", { car_id: top.id }, "request");
      if (my !== runId) return;
      enqueue({ kind: intent === "drive" ? "test_drive" : "hold", call: req, car: g.sc.car, notice: g.sc, check: chk.sc });
      mark("approval", "on");
      const hand = say("assistant", `Sent to ${esc(CFG.dealer.short)}. Nothing is booked until a person there approves it.`);
      hand.insertAdjacentHTML("beforeend", `<button class="btn sm" type="button" data-switch>Now decide as the salesperson</button>`);
      hand.querySelector("[data-switch]").onclick = () => { seat("dealer", true); const b = queueEl.querySelector("[data-approve]"); if (b) b.focus(); };
    } catch (e) { if (my === runId) say("assistant", `${esc(e.message)} Try the request again.`); }
    finally { if (my === runId) st.lock = false; }
  }
  function ask(q, opts) { return new Promise((res) => { const el = say("assistant", q); const row = document.createElement("div"); row.className = "row"; row.innerHTML = opts.map(([k, l]) => `<button class="btn ${k === "none" ? "ghost " : ""}sm" type="button" data-k="${k}">${esc(l)}</button>`).join(""); el.appendChild(row);
    row.onclick = (e) => { const b = e.target.closest("[data-k]"); if (!b) return; row.remove(); say("buyer", esc(b.textContent)); res(b.dataset.k); }; }); }
  function showCar(sc) { const c = sc.car || {}, el = $("#deskCar"); el.hidden = false;
    el.innerHTML = `<img src="${esc(imgOf(c.id, sc.images && sc.images[0] && sc.images[0].url))}" alt=""><div><span class="label">The car in this request</span><b>${esc(c.title)}</b><span>${dollars(c.priceNzd)}${c.odometerKm == null ? "" : ` · ${fmt(c.odometerKm)} km`}</span></div>${chip("sim", stock.truthLabel || "Simulated")}`;
    const big = $("#deskCarImg"), car = byId[c.id]; big.src = (car && car.img && (car.img.room || car.img.card)) || imgOf(c.id, sc.images && sc.images[0] && sc.images[0].url); big.alt = c.title || ""; big.hidden = false; $("#deskEmpty").hidden = true; }

  // ---------------------------------------------------------------- the dealer's approval queue
  function enqueue(item) {
    item.id = `Q${++st.rec}`; item.requestedAt = nowIso(); st.queue.unshift(item); drawQueue(); $("#deskQueueN").textContent = st.queue.length;
    const tab = $('#deskSeat [data-seat="dealer"]'); tab.classList.add("ping"); setTimeout(() => tab.classList.remove("ping"), 1600);
  }
  function drawQueue() {
    if (!st.queue.length) { queueEl.innerHTML = `<p class="empty">Nothing to decide yet. Pick a scenario as the buyer's assistant and its request lands here.</p>`; return; }
    queueEl.innerHTML = st.queue.map((q) => { const sc = q.call.sc || {}, n = (q.notice.checks || {}).cinFields || {}, slotFree = q.kind !== "test_drive" || !!sc.slot;
      return `<article class="qcard" data-q="${q.id}"><header><span class="pill-auth">${q.kind === "hold" ? "Hold" : "Test drive"}</span><span class="tmeta">${clock(q.requestedAt)} · ${esc((q.call.meta && q.call.meta["assembl/requestRef"]) || q.id)}</span></header>
        <div class="tcar"><img src="${esc(imgOf(q.car.id))}" alt=""><div><b>${esc(q.car.title)}</b><span>${q.kind === "hold" ? `Hold until ${esc(sc.holdUntil)}` : esc(sc.slot ? sc.slot.label : "")} · from the buyer's assistant</span></div></div>
        <ul class="qchecks"><li class="ok">Car shows as available</li><li class="${n.present === n.total ? "ok" : "warn"}">Notice: ${n.present} of ${n.total} fields</li><li class="${slotFree ? "ok" : "warn"}">${q.kind === "hold" ? "No deposit taken, two days" : "Slot free in the diary"}</li><li class="ok">No personal details shared</li></ul>
        <label class="appr">Approving as<input value="${esc(D.approver)}" data-by></label>
        <div class="row"><button class="btn" type="button" data-approve>Approve</button><button class="btn ghost" type="button" data-decline>Decline</button></div></article>`; }).join("");
  }
  queueEl.onclick = (e) => { const b = e.target.closest("[data-approve],[data-decline]"); if (!b) return; const card = b.closest("[data-q]"), q = st.queue.find((x) => x.id === card.dataset.q); if (!q) return;
    decide(q, b.hasAttribute("data-approve") ? "approved" : "declined", card.querySelector("[data-by]").value.trim() || D.approver); };

  // ---------------------------------------------------------------- the record, its hash, the ledger
  async function decide(q, outcome, by) {
    st.queue = st.queue.filter((x) => x !== q); drawQueue(); $("#deskQueueN").textContent = st.queue.length;
    const sc = q.call.sc || {}, n = q.notice, fields = Object.fromEntries(Object.entries(n.notice || {}).map(([k, v]) => [k, { value: v, truth: (n.noticeTruth || {})[k] || n.truth || "Simulated" }]));
    const rec = { schema: "assembl.dealer-record/1", truth: "Simulated", seq: st.ledger.length + 1, kind: q.kind,
      dealer: { name: CFG.dealer.name, site: sc.site || null },
      car: { id: q.car.id, title: q.car.title, year: q.car.year, priceNzd: q.car.priceNzd, odometerKm: q.car.odometerKm },
      notice: { present: ((n.checks || {}).cinFields || {}).present ?? null, total: ((n.checks || {}).cinFields || {}).total ?? null, fields },
      check: { register: q.check && q.check.register && q.check.register.found ? { name: q.check.register.name, total: q.check.register.total, period: q.check.register.period, truth: "Source" } : null, questions: (q.check && q.check.redFlags || []).length },
      request: { tool: q.call.name, arguments: q.call.args, ref: (q.call.meta && q.call.meta["assembl/requestRef"]) || null, endpoint: local ? "in-page endpoint (simulated)" : CFG.api, authority: sc.authority || "act with approval", ...(q.kind === "hold" ? { holdUntil: sc.holdUntil } : { slot: sc.slot }) },
      decision: { outcome, by, desk: "sales", role: "salesperson (simulated)" },
      timestamps: { requested: q.requestedAt, decided: nowIso() },
      readers: ["sales", "finance", "service"], prev: st.last ? st.last.hash : null };
    const hash = await sha256(canon(rec)), entry = { rec, hash };
    st.ledger.unshift(entry); st.last = entry; drawLedger(entry.hash); drawDesks(entry); mark("approval", "done"); mark("receipt", "done");
    say("dealer", outcome === "approved" ? `${q.kind === "hold" ? "Held" : "Booked"}: ${esc(q.car.title)}${q.kind === "hold" ? ` until ${esc(sc.holdUntil)}` : `, ${esc(sc.slot && sc.slot.label)}`}. Approved by ${esc(by)}. Receipt ${short(hash)}.` : `Declined by ${esc(by)}. The assistant will offer the buyer another option. Receipt ${short(hash)}.`);
  }
  function receipt(e, open) {
    const r = e.rec, ok = r.decision.outcome === "approved";
    return `<article class="rcpt${open ? " fresh" : ""}" data-h="${e.hash}"><header><span class="pill-auth ${ok ? "ok" : "no"}">${ok ? "Approved" : "Declined"}</span><b>${r.kind === "hold" ? "Hold" : "Test drive"} · ${esc(r.car.title)}</b>${chip("sim")}</header>
      <dl><div><dt>Record</dt><dd>${esc(r.schema)} · #${r.seq}</dd></div><div><dt>Approver</dt><dd>${esc(r.decision.by)}</dd></div><div><dt>Requested</dt><dd>${clock(r.timestamps.requested)}</dd></div><div><dt>Decided</dt><dd>${clock(r.timestamps.decided)}</dd></div>
        <div class="w"><dt>SHA-256</dt><dd class="hash">${e.hash}</dd></div><div class="w"><dt>Previous</dt><dd class="hash">${r.prev || "none, first record"}</dd></div></dl>
      <div class="row"><button class="btn ghost sm" type="button" data-verify>Check it hasn't changed</button><button class="btn ghost sm" type="button" data-json>See the full record</button><button class="btn ghost sm" type="button" data-dl>Download</button><span class="vres" aria-live="polite"></span></div></article>`;
  }
  function drawLedger(fresh) { $("#deskLedgerN").textContent = st.ledger.length;
    ledgerEl.innerHTML = st.ledger.length ? st.ledger.map((e) => receipt(e, e.hash === fresh)).join("") : `<p class="empty">No receipts yet. Approve or decline a request and its receipt appears here, linked to the one before it.</p>`; }
  ledgerEl.onclick = async (ev) => { const b = ev.target.closest("button"); if (!b) return; const el = b.closest("[data-h]"), e = st.ledger.find((x) => x.hash === el.dataset.h); if (!e) return;
    if (b.hasAttribute("data-verify")) { const h = await sha256(canon(e.rec)); el.querySelector(".vres").textContent = h === e.hash ? "✓ matches, recomputed in this browser" : "✗ does not match"; }
    if (b.hasAttribute("data-json")) { const p = el.querySelector("pre"); if (p) p.remove(); else el.insertAdjacentHTML("beforeend", `<pre>${jsonHTML({ ...e.rec, hash: e.hash })}</pre>`); }
    if (b.hasAttribute("data-dl")) download(new Blob([JSON.stringify({ ...e.rec, hash: e.hash }, null, 2)], { type: "application/json" }), `dealer-record-${e.rec.seq}-${e.hash.slice(0, 8)}.json`); };

  // ---------------------------------------------------------------- every desk speaks the same record
  const fieldVal = (rec, keys) => { for (const k of keys) if (rec.notice.fields[k]) return [k, rec.notice.fields[k]]; return [keys[0], null]; };
  function drawDesks(e) {
    const r = e && e.rec, lb = labels;
    const row = (k, f) => `<li><span>${esc(lb[k] || k.replace(/[._]/g, " "))}</span><b>${f ? esc(f.value == null ? "not shown" : /price|cash/.test(k) && typeof f.value === "number" ? dollars(f.value) : /odometer/.test(k) && typeof f.value === "number" ? fmt(f.value) + " km" : f.value) : "–"}</b></li>`;
    const head = r ? `<p class="dh"><code>#${r.seq} · ${short(e.hash)}</code></p>` : `<p class="dh empty">Waiting for the first record</p>`;
    $("#deskDesks").innerHTML = `
      <article class="dk on"><header><b>Sales desk</b>${chip("sim")}</header>${head}<ul>${r ? `<li><span>Writes</span><b>${r.kind === "hold" ? "hold" : "test drive"}, ${esc(r.decision.outcome)}</b></li><li><span>Car</span><b>${esc(r.car.title)}</b></li><li><span>Approver</span><b>${esc(r.decision.by)}</b></li>` : "<li><span>Writes</span><b>holds and test drives</b></li>"}</ul></article>
      <article class="dk${r ? " on" : ""}"><header><b>Finance desk</b>${chip("prop", "Proposed")}</header>${head}<ul>${READS.finance.map((ks) => r ? row(...fieldVal(r, ks)) : `<li><span>${esc(lb[ks[0]] || ks[0])}</span><b>–</b></li>`).join("")}</ul></article>
      <article class="dk${r ? " on" : ""}"><header><b>Service desk</b>${chip("prop", "Proposed")}</header>${head}<ul>${READS.service.map((ks) => r ? row(...fieldVal(r, ks)) : `<li><span>${esc(lb[ks[0]] || ks[0])}</span><b>–</b></li>`).join("")}</ul></article>`;
  }
  drawQueue(); drawLedger(); drawDesks(null);

  // ---------------------------------------------------------------- scenarios and the buyer's own words
  $("#deskScen").innerHTML = D.scenarios.map((s, i) => `<button type="button" data-i="${i}">${esc(s.label)}</button>`).join("");
  $("#deskScen").onclick = (e) => { const b = e.target.closest("[data-i]"); if (!b) return; st.stepMode = $("#deskStep").checked; const s = D.scenarios[+b.dataset.i]; $("#deskIn").value = s.text; run(s); };
  $("#deskForm").onsubmit = (e) => { e.preventDefault(); const t = $("#deskIn").value.trim() || D.scenarios[0].text; st.stepMode = $("#deskStep").checked; const sc = D.scenarios.find((s) => s.text === t);
    run(sc || { text: t, args: parseAsk(t, cars.map((c) => c.model.toLowerCase()), [...new Set(cars.map((c) => c.make.toLowerCase()))]), intent: /hold/i.test(t) ? "hold" : /test.?drive|drive it/i.test(t) ? "drive" : null, day: (t.match(/monday|tuesday|wednesday|thursday|friday|saturday/i) || [])[0]?.toLowerCase() }); };
  $("#deskStep").checked = reducedMQ.matches;

  // the desk opens working: the first scenario runs once, up to the dealer's approval, so the first view already shows the whole loop
  const first = D.scenarios[0]; $("#deskIn").value = first.text;
  const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { io.disconnect(); st.stepMode = false; run(first); } }, { threshold: .15 }); io.observe(desk);
  window.__desk = { st, run, decide: (o = "approved") => st.queue[0] && decide(st.queue[0], o, D.approver), sha256, canon };
}
