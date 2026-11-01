// The agent desk, scripted. A visitor picks one of three enquiries; the agent's work assembles step by step (intent, stock search,
// notice, checks, recommendation, request), each step naming the tool it called, the record it got back and its authority level;
// a named (fictional) person at the dealer approves or changes the hold or test drive; a receipt and the customer's confirmation
// follow. Every record was recorded from the lab's MCP endpoint and is replayed here, so the demo is deterministic and needs no
// model call. Everything is Simulated: fictional stock, fictional staff, nothing held, booked, sent or stored.
import { $, $$, esc, fmt, dollars, jsonHTML, reducedMQ, narrowMQ } from "./core.js";

const DATA = window.AGENT_DESK;
const CUBES = ["#F6B48E", "#C7B4F0", "#A7DEC7", "#F3A5BE", "#F2DC7C", "#A9C9F2"];
const LEVELS = DATA.authority;
const AUTH = { observe: 0, draft: 1, recommend: 2, "act with approval": 3 };
const nowIso = () => new Date().toISOString();
const clock = (iso) => new Date(iso).toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit" });
const dayAt = (iso) => new Date(iso).toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short" });
const canon = (v) => v === null || typeof v !== "object" ? JSON.stringify(v) : Array.isArray(v) ? `[${v.map(canon).join(",")}]` : `{${Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(",")}}`;
async function sha256(text) { const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)); return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join(""); }
const wait = (ms) => new Promise((r) => setTimeout(r, reducedMQ.matches ? 0 : ms));
const tchip = (t) => `<span class="ad-t" data-t="${/source|published/i.test(t) ? "src" : /estimate/i.test(t) ? "est" : "sim"}">${esc(t)}</span>`;
const badge = (level) => `<span class="ad-auth" data-l="${AUTH[level] ?? 0}" title="Authority level ${(AUTH[level] ?? 0) + 1} of 6">${esc(level)}</span>`;
const cube = (i) => { const c = CUBES[i % CUBES.length]; return `<i class="ad-cube" style="--c:${c}"><b></b><b></b><b></b></i>`; };
const call = (tool, args) => `<code class="ad-call"><span class="fn">${esc(tool)}</span>(${esc(JSON.stringify(args))})</code>`;
const carImg = (c) => `<img src="${esc((c.image && c.image.url) || `img/cars/${c.id}-1x1.webp`)}" alt="" loading="lazy" decoding="async">`;

// ---------------------------------------------------------------- what each record looks like on the desk
function viewSearch(s) {
  const r = s.result;
  return `<p class="ad-sum">${r.matched} of ${r.total} cars match${r.closeMatches ? `, ${r.closeMatches} close` : ""} ${tchip(r.truth)}</p>
    <div class="ad-cars">${r.results.map((c) => `<figure data-id="${c.id}">${carImg(c)}<figcaption><b>${dollars(c.priceNzd)}</b><span>${esc(c.title)}</span><small>${fmt(c.odometerKm)} km · ${esc(c.region)}</small></figcaption></figure>`).join("")}</div>`;
}
function viewNotice(s) {
  const r = s.result, c = r.car, k = r.checks, n = r.notice;
  const row = (label, v, t) => `<div><span>${esc(label)}</span><b>${esc(v)}</b>${t ? tchip(t) : ""}</div>`;
  return `<div class="ad-car">${carImg({ id: c.id })}<div><b>${esc(c.title)}</b><span>${dollars(c.priceNzd)} · ${fmt(c.odometerKm)} km · ${esc(c.colour || "")} · ${esc(c.site)}</span></div></div>
    <p class="ad-sum">Consumer Information Notice as data: <b>${k.cinFields.present} of ${k.cinFields.total}</b> fields given ${tchip(k.cinFields.truth)}</p>
    <div class="ad-rows">${row("Cash price", dollars(n["price.cash"]))}${row("Includes", n["price.includes"])}${row("Money owing", n["securityInterest.registered"] === "yes" ? "yes, registered" : "none stated", "Simulated")}${row("WOF expiry", `${n["wof.expiry"]} · ${k.wof.monthsLeft} months`)}${row("Licence expiry", `${n["licence.expiry"]} · ${k.licence.monthsLeft} months`)}${row("Odometer", `${fmt(n["odometer.km"])} km · ${fmt(k.odometer.kmPerYear)} a year`)}</div>
    ${r.testDriveSlots && r.testDriveSlots.length ? `<p class="ad-sum">Free test-drive times: ${r.testDriveSlots.map((x) => `<span class="ad-slot">${esc(x.label)}</span>`).join("")}</p>` : ""}`;
}
function viewCheck(s) {
  const r = s.result, g = r.register, flags = r.redFlags;
  return `<div class="ad-kpis"><div><b>${g.found ? fmt(g.total) : "–"}</b><span>${esc(g.name)}s on the NZ register</span>${tchip(g.truth)}</div><div><b>${r.notice.present}<small>/${r.notice.total}</small></b><span>notice facts given</span>${tchip("Simulated")}</div><div><b>${flags.length}</b><span>${flags.length === 1 ? "thing" : "things"} to raise</span></div></div>
    ${flags.length ? `<ul class="ad-flags">${flags.map((f) => `<li data-l="${esc(f.level)}"><b>${esc(f.title)}</b><span>${esc(f.why)}</span></li>`).join("")}</ul>` : `<p class="ad-sum">${esc(r.summary)}</p>`}
    <p class="ad-src">${esc(g.source.name)} · ${esc(g.period)} · ${g.status === "live" ? "read live" : "snapshot"} · ${esc(g.source.licence)}</p>`;
}
function viewCost(s) {
  const r = s.result, mx = Math.max(...r.lines.map((l) => l.weekly));
  return `<p class="ad-sum"><b class="big">${dollars(r.totalWeekly)}</b> a week at ${fmt(r.kmPerWeek)} km · ${esc(r.compare.label)} ${dollars(r.compare.totalWeekly)}</p>
    <div class="ad-bars">${r.lines.map((l, i) => `<div><span>${esc(l.label)}</span><span class="t"><i style="width:${(l.weekly / mx * 100).toFixed(1)}%;background:${CUBES[(i + 2) % 6]}"></i></span><b>${dollars(l.weekly)}</b>${tchip(l.truth)}</div>`).join("")}</div>
    <p class="ad-src">${esc(r.place)} · not included: ${r.notIncluded.join(", ")}</p>`;
}
function viewRequest(s) {
  const r = s.result;
  return `<p class="ad-sum"><b>${esc(s.tool === "hold_car" ? `Hold until ${dayAt(r.holdUntil + "T12:00:00+13:00")}` : `Test drive ${r.slot.label}`)}</b> · ${esc(r.car.title)}</p>
    <p class="ad-src">${esc(r.status)} · request ${esc(s.meta["assembl/requestRef"])}</p><p class="ad-src">${esc(r.sideEffects)}</p>`;
}
const inspector = (s) => `<details class="ad-insp"><summary>The call and the record · JSON-RPC</summary><div><span class="ad-lab">Request</span><pre>${jsonHTML({ jsonrpc: "2.0", method: "tools/call", params: { name: s.tool, arguments: s.args } })}</pre><span class="ad-lab">Record</span><pre>${jsonHTML({ structuredContent: s.result, ...(s.meta ? { _meta: s.meta } : {}) })}</pre></div></details>`;

// ---------------------------------------------------------------- the plan: the enquiry becomes a list of steps
function plan(sc) {
  const picked = sc.steps.find((s) => s.tool === "get_car").result.car;
  const steps = [{ k: "intent", title: "Reads the enquiry", auth: "observe", who: "agent", body: `<p class="ad-sum">What it understood ${tchip("Simulated")}</p><div class="ad-rows">${Object.entries(sc.interpreted).map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join("")}</div>`, note: "No tool yet. Nothing is sent." }];
  for (const s of sc.steps) {
    const t = { search_cars: ["Searches the stock", viewSearch], get_car: ["Reads the notice", viewNotice], car_check: ["Runs the checks", viewCheck], running_cost: ["Costs it to run", viewCost] }[s.tool];
    steps.push({ k: s.tool, title: t[0], auth: "observe", who: "agent", tool: s.tool, args: s.args, body: t[1](s) + inspector(s) });
  }
  steps.push({ k: "recommend", title: "Recommends, and asks the buyer", auth: "recommend", who: "agent", body: `<div class="ad-car pick">${carImg({ id: picked.id })}<div><span class="ad-lab">The pick</span><b>${esc(picked.title)}</b><span>${dollars(picked.priceNzd)} · ${esc(picked.site)}</span></div></div><div class="ad-msg agent"><span>Assistant, to the buyer</span><p>${esc(sc.recommend.reply)}</p></div><div class="ad-msg buyer"><span>Buyer</span><p>${esc(sc.recommend.consent)}</p></div>`, note: "A recommendation only. The buyer's yes comes before anything binding." });
  const rq = sc.request;
  steps.push({ k: "request", title: rq.tool === "hold_car" ? "Asks the dealer to hold it" : "Asks the dealer for the test drive", auth: "act with approval", who: "agent", tool: rq.tool, args: rq.args, body: viewRequest(rq) + inspector(rq), note: "A request, not a booking. It waits for a person at the dealer." });
  return steps;
}

export function initAgentDesk() {
  const root = $("#agentdesk"); if (!root) return;
  const enq = $("#adEnq"), work = $("#adWork"), shelf = $("#adShelf"), queue = $("#adQueue"), out = $("#adOut"), who = $("#adWho");
  const st = { run: 0, sc: null, item: null, receipts: [], prev: null };
  // authority ladder
  $("#adLadder").innerHTML = LEVELS.map((l, i) => `<li data-l="${i}"><i></i>${esc(l)}</li>`).join("");
  const ladder = (level) => $$("#adLadder li").forEach((li) => li.classList.toggle("on", +li.dataset.l === (AUTH[level] ?? -1)));

  // ---------------------------------------------------------------- left: the enquiries
  enq.innerHTML = DATA.scenarios.map((s, i) => `<button type="button" class="ad-enq" data-i="${i}" aria-pressed="false"><span class="ad-lab">${esc(s.channel)}</span><p>${esc(s.ask)}</p><small>${esc(s.label)}</small></button>`).join("");
  enq.onclick = (e) => { const b = e.target.closest("[data-i]"); if (!b) return; run(DATA.scenarios[+b.dataset.i]); };

  const status = (lab, line) => { $("#adArrived").innerHTML = `<span class="ad-lab">${lab}</span><p>${line}</p>`; };
  const stat = (line) => { const p = $("#adArrived p"); if (p) p.textContent = line; };

  // ---------------------------------------------------------------- centre: the steps assembling, a cube landing per step
  async function run(sc) {
    const my = ++st.run; st.sc = sc; st.item = null;
    $$(".ad-enq", enq).forEach((b) => b.setAttribute("aria-pressed", DATA.scenarios[+b.dataset.i] === sc ? "true" : "false"));
    root.dataset.state = "working";
    const arrived = nowIso();
    status(`Arrived ${clock(arrived)} · ${esc(sc.channel)}`, "With the agent: searching, reading, checking.");
    const steps = plan(sc);
    shelf.innerHTML = steps.map(() => `<span class="ad-slot-c"></span>`).join("");
    work.innerHTML = ""; queue.innerHTML = `<p class="ad-empty">The agent is working. When it asks for a hold or a test drive, the request lands here for ${esc(sc.approver.name)}.</p>`; out.innerHTML = "";
    who.innerHTML = `<b>${esc(sc.approver.name)}</b><span>${esc(sc.approver.role)} · ${esc(sc.approver.site)}</span><span class="ad-t" data-t="sim">Fictional staff member</span>`;
    for (let i = 0; i < steps.length; i++) {
      if (my !== st.run) return;
      const s = steps[i], el = document.createElement("li"); el.className = "ad-step"; el.dataset.k = s.k; el.style.setProperty("--c", CUBES[i % 6]);
      el.innerHTML = `<header>${cube(i)}<div><span class="ad-lab">Step ${i + 1}${s.tool ? ` · <code>${esc(s.tool)}</code>` : ""}</span><h3>${esc(s.title)}</h3></div>${badge(s.auth)}</header>${s.tool ? call(s.tool, s.args) : ""}<div class="ad-body">${s.body}</div>${s.note ? `<p class="ad-note">${esc(s.note)}</p>` : ""}`;
      work.appendChild(el); ladder(s.auth);
      requestAnimationFrame(() => { el.classList.add("in"); const slot = shelf.children[i]; if (slot) { slot.innerHTML = cube(i); slot.classList.add("in"); } });
      if (!narrowMQ.matches && i > 0 && work.scrollHeight > work.clientHeight) work.scrollTo({ top: work.scrollHeight, behavior: reducedMQ.matches ? "auto" : "smooth" });   // the list only, never the page
      await wait(i === 0 ? 350 : s.k === "recommend" ? 900 : 700);
    }
    if (my !== st.run) return;
    enqueue(sc, arrived);
  }

  // ---------------------------------------------------------------- right: the approval queue
  function enqueue(sc, arrived) {
    const rq = sc.request, ref = rq.meta["assembl/requestRef"];
    st.item = { sc, ref, requestedAt: nowIso(), arrived };
    root.dataset.state = "waiting"; stat(`Waiting for ${sc.approver.name} at the dealer.`);
    queue.innerHTML = `<article class="ad-q in"><header>${badge("act with approval")}<span class="ad-lab">${esc(ref)} · ${clock(st.item.requestedAt)}</span></header>
      <h3>${esc(sc.queue.title)}</h3><p>${esc(sc.queue.sub)}</p>
      <ul class="ad-qchecks"><li>Car shows as available</li><li>${sc.steps.find((s) => s.tool === "get_car").result.checks.cinFields.present} of 26 notice facts given</li><li>${rq.tool === "hold_car" ? "No deposit taken" : "Slot free in the diary"}</li><li>No buyer contact details shared</li></ul>
      <div class="ad-row"><button class="btn" type="button" data-approve>Approve</button><button class="btn ghost" type="button" data-change>${esc(sc.change.label)}</button></div>
      <p class="ad-note">Approving as ${esc(sc.approver.name)}. Nothing is held, booked, sent or stored: this is a simulation.</p></article>`;
    if (narrowMQ.matches) { const last = work.lastElementChild; if (last) last.insertAdjacentHTML("beforeend", `<a class="btn sm ad-jump" href="#adQueue">Now decide as ${esc(sc.approver.name)}</a>`); }
    queue.onclick = (e) => { const b = e.target.closest("[data-approve],[data-change]"); if (!b || !st.item) return; decide(b.hasAttribute("data-approve") ? "approved" : "changed"); };
  }

  // ---------------------------------------------------------------- the receipt, the customer's confirmation
  async function decide(outcome) {
    const it = st.item; if (!it) return; st.item = null; const sc = it.sc, rq = sc.request, ch = sc.change, decided = nowIso();
    const rec = { schema: "assembl.dealer-record/1", truth: "Simulated", seq: st.receipts.length + 1, kind: rq.tool === "hold_car" ? "hold" : "test_drive",
      dealer: { name: "Harbour Lane Motors (demo)", site: rq.result.site }, car: { id: rq.result.car.id, title: rq.result.car.title },
      request: { tool: rq.tool, arguments: rq.args, ref: it.ref, endpoint: DATA.endpoint, authority: "act with approval", ...(rq.tool === "hold_car" ? { holdUntil: rq.result.holdUntil } : { slot: rq.result.slot }) },
      decision: { outcome, by: sc.approver.name, role: sc.approver.role, desk: "sales", ...(outcome === "changed" ? { change: ch.note, ...(ch.holdUntil ? { holdUntil: ch.holdUntil } : {}), ...(ch.slot ? { slot: ch.slot } : {}) } : {}) },
      timestamps: { enquiry: it.arrived, requested: it.requestedAt, decided }, readers: ["sales", "finance", "service"], prev: st.prev };
    const hash = await sha256(canon(rec)); st.prev = hash; st.receipts.unshift({ rec, hash });
    root.dataset.state = "done"; stat(`Decided by ${sc.approver.name} at ${clock(decided)}. Receipt written, buyer told.`);
    queue.innerHTML = `<p class="ad-empty">Decided. The receipt and the buyer's confirmation are below${narrowMQ.matches ? "" : ", right"}.</p>`;
    out.innerHTML = `<article class="ad-rcpt in"><header><span class="ad-auth ok">${outcome === "approved" ? "Approved" : "Approved with a change"}</span><span class="ad-t" data-t="sim">Simulated</span></header>
      <h3>${esc(outcome === "approved" ? sc.queue.title : ch.title)}</h3>
      <dl><div><dt>Request</dt><dd>${esc(it.ref)}</dd></div><div><dt>Approved by</dt><dd>${esc(sc.approver.name)}, ${esc(sc.approver.role)}</dd></div><div><dt>When</dt><dd>${clock(decided)}, ${dayAt(decided)}</dd></div><div><dt>Authority</dt><dd>act with approval · level 4 of 6</dd></div>
        <div><dt>Enquiry to decision</dt><dd>${Math.max(1, Math.round((new Date(decided) - new Date(it.arrived)) / 1000))} s</dd></div><div><dt>Record</dt><dd>${esc(rec.schema)} · #${rec.seq}</dd></div>
        <div class="w"><dt>SHA-256, computed in this browser</dt><dd class="hash">${hash}</dd></div>${rec.prev ? `<div class="w"><dt>Previous receipt</dt><dd class="hash">${rec.prev}</dd></div>` : ""}</dl>
      <div class="ad-row"><button class="btn ghost sm" type="button" data-json>See the full record</button><button class="btn ghost sm" type="button" data-again>Run another enquiry</button></div></article>
      <div class="ad-msg dealer in"><span>To the buyer, from ${esc(sc.approver.name.split(" ")[0])} via their assistant</span><p>${esc(outcome === "approved" ? sc.customer : ch.customer)}</p><small>Simulated: not sent to anyone.</small></div>`;
    out.querySelector("[data-json]").onclick = (e) => { const p = out.querySelector("pre"); if (p) p.remove(); else e.target.closest("article").insertAdjacentHTML("beforeend", `<pre class="ad-pre">${jsonHTML({ ...rec, hash })}</pre>`); };
    out.querySelector("[data-again]").onclick = () => { root.dataset.state = "idle"; enq.scrollIntoView({ behavior: reducedMQ.matches ? "auto" : "smooth", block: "start" }); $(".ad-enq", enq).focus(); };
    if (narrowMQ.matches) out.scrollIntoView({ behavior: reducedMQ.matches ? "auto" : "smooth", block: "start" });
  }

  // first view: the first enquiry runs itself once the desk is in view, so nothing sits empty
  const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { io.disconnect(); if (!st.sc) run(DATA.scenarios[0]); } }, { threshold: .12 }); io.observe(root);
  window.__agentdesk = { run: (i = 0) => run(DATA.scenarios[i]), decide, st };
}
