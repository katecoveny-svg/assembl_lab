// The agent desk, scripted. A builder picks one of three asks; the agent's work assembles step by step (read the ask, check the
// scale, find rooms, measure, price, draft), each step naming the tool it called and the record it got back. The tools are the
// same pure functions the endpoint serves (takeoff-core.js), run here in the browser, so the demo is deterministic and needs no
// model call. A named (fictional) person confirms the scale and approves "Send the bid" or asks for a change; a receipt with a
// SHA-256 of the bid record follows, and the bid can be withdrawn. Nothing is sent, stored or quoted: everything is Simulated.
import { callTool, draftBid, canon, condition, round } from "./takeoff-core.js";
import { $, $$, esc, nzd } from "./main.js";

const CUBES = ["#F6B48E", "#C7B4F0", "#A7DEC7", "#F3A5BE", "#F2DC7C", "#A9C9F2"];
const AUTH = { observe: 0, draft: 1, recommend: 2, "act with approval": 3 };
const reduced = matchMedia("(prefers-reduced-motion: reduce)"), narrow = matchMedia("(max-width: 860px)");
const wait = (ms) => new Promise((r) => setTimeout(r, reduced.matches ? 0 : ms));
const nowIso = () => new Date().toISOString();
const clock = (iso) => new Date(iso).toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit" });
const dayAt = (iso) => new Date(iso).toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short" });
async function sha256(text) { const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)); return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join(""); }
const badge = (l, extra = "") => `<span class="auth ${extra}" data-l="${AUTH[l] ?? 0}">${esc(l)}</span>`;
const call = (tool, args) => `<code class="call"><span class="fn">${esc(tool)}</span>(${esc(JSON.stringify(args))})</code>`;
const insp = (tool, args, rec) => `<details><summary>The call and the record · JSON-RPC</summary><pre>${esc(JSON.stringify({ request: { jsonrpc: "2.0", method: "tools/call", params: { name: tool, arguments: args } }, record: rec }, null, 1).slice(0, 9000))}</pre></details>`;
const kv = (rows) => `<div class="kv">${rows.map(([k, v]) => `<span>${esc(k)}</span><b>${esc(v)}</b>`).join("")}</div>`;

const ASKS = [
  { id: "floor", channel: "Estimator · 7:40 am", ask: "Take off the floor on A101, room by room", label: "find_rooms → measure → price → draft_bid", sheet: "A101", scope: "Floor finishes, ground floor",
    approver: { name: "Hemi Walker", role: "Estimator", site: "Harbourside Builders (demo)" }, pick: (fr) => fr.rooms.filter((r) => r.conditionId).map((r) => ({ element: r.id, condition: r.conditionId })) },
  { id: "deck", channel: "Site manager · text", ask: "Price the deck from my rates", label: "find_rooms → measure → price (your rates) → draft_bid", sheet: "A201", scope: "Deck and pergola: framing, decking, posts and handrail",
    approver: { name: "Priya Nair", role: "Site manager", site: "Harbourside Builders (demo)" },
    pick: (fr) => [{ element: "deck", condition: "decking" }, ...fr.otherElements.filter((e) => e.conditionId).map((e) => ({ element: e.id, condition: e.conditionId }))] },
  { id: "bid", channel: "Director · end of day", ask: "Draft the bid", label: "reads the takeoff → price → draft_bid", sheet: null, scope: "Everything measured on the sheet",
    approver: { name: "Tama Reihana", role: "Director", site: "Harbourside Builders (demo)" },
    pick: (fr) => [...fr.rooms.filter((r) => r.conditionId).map((r) => ({ element: r.id, condition: r.conditionId })), ...fr.otherElements.filter((e) => e.conditionId).map((e) => ({ element: e.id, condition: e.conditionId }))] },
];

export function initAgentDesk(store) {
  const { S } = store;
  const root = $("#agentdesk"), work = $("#adWork"), queue = $("#adQueue"), out = $("#adOut"), outCard = $("#adOutCard"), who = $("#adWho"), asks = $("#asks");
  const st = { run: 0, item: null, receipts: [], prev: null, agentIds: [], bids: 0 };
  asks.innerHTML = ASKS.map((a, i) => `<button type="button" class="ask" data-i="${i}" aria-pressed="false"><span class="lab">${esc(a.channel)}</span><p>${esc(a.ask)}</p><small>${esc(a.label)}</small></button>`).join("");
  asks.onclick = (e) => { const b = e.target.closest("[data-i]"); if (b) run(ASKS[+b.dataset.i]); };
  const status = (lab, line) => { $("#adStatus").innerHTML = `<span class="lab">${esc(lab)}</span><p>${esc(line)}</p>`; };

  function step(i, s) {
    const el = document.createElement("li"); el.className = "step"; el.dataset.k = s.k;
    el.innerHTML = `<header><i class="cube" style="--c:${CUBES[i % 6]}"></i><div><span class="lab">Step ${i + 1}${s.tool ? ` · ${esc(s.tool)}` : ""}</span><h3>${esc(s.title)}</h3></div>${badge(s.auth)}</header>${s.tool ? call(s.tool, s.args) : ""}<div class="rec">${s.body || ""}</div>${s.note ? `<p class="note">${esc(s.note)}</p>` : ""}`;
    work.appendChild(el); requestAnimationFrame(() => el.classList.add("landed"));
    if (!narrow.matches && work.scrollHeight > work.clientHeight) work.scrollTo({ top: work.scrollHeight, behavior: reduced.matches ? "auto" : "smooth" });
    return el;
  }
  const alive = (my) => my === st.run;

  // ---------------------------------------------------------------- the run: steps assembling, cubes landing on the plan
  async function run(a) {
    const my = ++st.run; st.item = null;
    $$(".ask", asks).forEach((b) => b.setAttribute("aria-pressed", String(ASKS[+b.dataset.i] === a)));
    const sheetKey = a.sheet || (S.sheet ? S.sheetKey : "A101");
    if (sheetKey !== S.sheetKey) await store.openSheet(sheetKey);
    if (!alive(my)) return;
    const sheet = S.sheet, asked = nowIso();
    root.dataset.state = "working"; work.innerHTML = ""; out.innerHTML = ""; outCard.hidden = true;
    queue.innerHTML = `<p class="empty">The agent is working. When it drafts a bid, it lands here for ${esc(a.approver.name)}.</p>`;
    who.innerHTML = `${esc(a.approver.name)} · ${esc(a.approver.role)} · fictional`;
    status(`Asked ${clock(asked)} · ${a.channel}`, "With the agent: reading, measuring, pricing.");
    let i = 0;
    const existing = a.id === "bid" ? S.measurements.filter((m) => m.sheet === sheetKey) : [];
    step(i++, { k: "intent", title: "Reads the ask", auth: "observe", body: `<p class="sum">What it understood <span class="auth">Simulated</span></p>` + kv([["sheet", `${sheet.id} · ${sheet.title}`], ["scope", a.scope], ["output", "a draft bid for a person to approve"], ["rates", "the builder's sheet below, as edited"], ...(a.id === "bid" ? [["takeoff", existing.length ? `${existing.length} lines already measured` : "nothing measured yet, so it takes the sheet off first"]] : [])]), note: "No tool yet. Nothing is sent." });
    await wait(350); if (!alive(my)) return;

    // the scale: confirmed by a person, or proposed from the title block and waited on
    let sc = store.scaleOf(sheetKey);
    if (sc) step(i++, { k: "scale", title: "Checks the scale", auth: "observe", body: kv([["status", "confirmed by a person"], ["mm per point", round(sc.mmPerPt, 3)], ["source", sc.source]]) });
    else {
      const nominal = store.nominalMmPerPt(sheet);
      const el = step(i++, { k: "scale", title: "Proposes a scale, and waits", auth: "recommend", body: kv([["title block", `1:${sheet.scale} at ${sheet.paper}`], ["proposed", `${round(nominal, 3)} mm per point`], ["status", "unconfirmed"]]) + `<div class="row"><button class="btn sm" type="button" data-confirm>Confirm scale as ${esc(a.approver.name.split(" ")[0])}</button><span class="hint">or pick two points on the left</span></div>`, note: "A measurement counts only after a person confirms the scale. The agent cannot do this step." });
      status("Waiting for the scale", `${a.approver.name} confirms the title block's scale, or picks two points.`);
      await new Promise((resolve) => { let un; const done = () => { if (un) un(); resolve(); }; el.querySelector("[data-confirm]").onclick = () => { store.setScale(nominal, `title block, confirmed by ${a.approver.name}`); done(); }; un = store.subscribe(() => { if (store.scaleOf(sheetKey) || my !== st.run) done(); }); });
      if (!alive(my)) return; sc = store.scaleOf(sheetKey);
      el.querySelector(".rec").innerHTML = kv([["title block", `1:${sheet.scale} at ${sheet.paper}`], ["confirmed", `${round(sc.mmPerPt, 3)} mm per point`], ["source", sc.source]]); el.querySelector(".note").textContent = "Confirmed by a person. Measurements count from here.";
      status(`Asked ${clock(asked)} · ${a.channel}`, "Scale confirmed. The agent measures.");
      await wait(300); if (!alive(my)) return;
    }

    // find rooms, then measure each pick with the same tool the endpoint serves
    let lines;
    if (existing.length) {
      step(i++, { k: "takeoff", title: "Reads the takeoff on the sheet", auth: "observe", body: `<p class="sum">${existing.length} lines, measured on this desk</p><div class="rooms">${existing.map((m) => `<span>${esc(m.name || condition(m.conditionId)?.name)} · ${m.qty} ${m.unit}</span>`).join("")}</div>`, note: "Uses what is drawn, by the person or the agent. Nothing re-measured." });
      lines = existing;
      await wait(400); if (!alive(my)) return;
    } else {
      const fr = callTool("find_rooms", { sheet: sheet.id });
      step(i++, { k: "find_rooms", title: `Finds the ${sheet.id === "A201" ? "zones" : "rooms"}`, auth: "observe", tool: "find_rooms", args: { sheet: sheet.id }, body: `<p class="sum">${esc(fr.text)}</p><div class="rooms">${fr.structuredContent.rooms.map((r) => `<span>${esc(r.name)} · ${r.areaM2} m²</span>`).join("")}</div>` + insp("find_rooms", { sheet: sheet.id }, fr.structuredContent) });
      await wait(500); if (!alive(my)) return;
      const picks = a.pick(fr.structuredContent), calls = [];
      const el = step(i++, { k: "measure", title: `Measures ${picks.length} elements`, auth: "observe", tool: "measure", args: { sheet: sheet.id, element: "…", condition: "…", mmPerPt: round(sc.mmPerPt, 4) }, body: `<div class="rooms" data-list></div>`, note: "Each call is one line on the plan and in the takeoff on the left. Undo any of them there." });
      const list = el.querySelector("[data-list]"); lines = [];
      for (const p of picks) {
        if (!alive(my)) return;
        const args = { sheet: sheet.id, element: p.element, condition: p.condition, mmPerPt: round(sc.mmPerPt, 4) }, r = callTool("measure", args); calls.push({ args, record: r.structuredContent });
        if (r.isError) continue;
        const rec = r.structuredContent, m = store.addMeasurement({ kind: rec.kind, conditionId: rec.conditionId, pts: rec.points, by: "agent", name: rec.name });
        st.agentIds.push(m.id); lines.push(m);
        list.insertAdjacentHTML("beforeend", `<span>${esc(rec.name)} · ${rec.qty} ${rec.unit}</span>`);
        await wait(140);
      }
      el.querySelector(".rec").insertAdjacentHTML("beforeend", `<details><summary>The ${calls.length} calls and records · JSON-RPC</summary><pre>${esc(JSON.stringify(calls, null, 1).slice(0, 12000))}</pre></details>`);
      await wait(300); if (!alive(my)) return;
    }

    // price from the builder's rates, then draft
    const pr = store.currentPrice(lines), pargs = { lines: store.lines(lines).map((l) => ({ ...l, qty: round(l.qty, 2) })), rates: "the builder's sheet", markupPct: S.markup };
    step(i++, { k: "price", title: "Prices it from the rates sheet", auth: "observe", tool: "price", args: pargs, body: `<p class="sum">${nzd(pr.total)} incl. GST <span class="auth">Indicative only · not a quote</span></p>` + kv([...pr.byTrade.map((t) => [t.trade, nzd(t.cost)]), ["markup " + pr.markupPct + "%", nzd(pr.markup)], ["GST 15%", nzd(pr.gst)]]) + insp("price", pargs, pr), note: "The agent proposes no rate. Edit the sheet below and ask again." });
    await wait(500); if (!alive(my)) return;
    const bid = draftBid({ sheet, lines: store.lines(lines), rates: S.rates, markupPct: S.markup, scope: a.scope, seq: ++st.bids, now: nowIso() });
    const bargs = { sheet: sheet.id, scope: a.scope, lines: pargs.lines, markupPct: S.markup };
    step(i++, { k: "draft_bid", title: "Drafts the bid, and asks a person", auth: "act with approval", tool: "draft_bid", args: bargs, body: `<p class="sum">${esc(bid.ref)} · ${esc(bid.customer)}</p>` + kv([["scope", bid.scope], ["total incl. GST", nzd(bid.pricing.total)], ["valid", `${bid.validDays} days`], ["status", "draft, waiting for approval"]]) + insp("draft_bid", bargs, bid), note: `A draft, not a bid. It waits for ${a.approver.name}.` });
    await wait(300); if (!alive(my)) return;
    enqueue(a, bid, asked, sheet, lines);
  }

  // ---------------------------------------------------------------- approval: a named person sends it or asks for a change
  function enqueue(a, bid, asked, sheet, lines, changed) {
    st.item = { a, bid, asked, sheet, lines, requestedAt: nowIso(), changed };
    root.dataset.state = "waiting"; status(`Waiting for ${a.approver.name}`, "The draft bid is in the approval queue.");
    queue.innerHTML = `<article class="q"><header>${badge("act with approval")}<span>${esc(bid.ref)} · ${clock(st.item.requestedAt)}</span></header>
      <h3>Send the bid for ${esc(bid.scope.toLowerCase())}?</h3><p class="hint">${esc(bid.customer)} · ${nzd(bid.pricing.total)} incl. GST · ${bid.pricing.lines.length} lines · markup ${bid.pricing.markupPct}%</p>
      <ul><li>Scale confirmed by a person</li><li>Every line drawn on ${esc(sheet.id)}</li><li>Rates from the builder's sheet, nothing proposed</li><li>GST shown separately · indicative only</li></ul>
      <div class="row"><button class="btn" type="button" data-approve>Send the bid</button><button class="btn ghost" type="button" data-change ${changed ? "disabled" : ""}>${changed ? "Changed once" : "Change: markup to 8%"}</button></div>
      <p class="note">Deciding as ${esc(a.approver.name)}, ${esc(a.approver.role)}. Nothing is sent or stored: this is a simulation.</p></article>`;
    queue.scrollIntoView({ behavior: reduced.matches ? "auto" : "smooth", block: narrow.matches ? "start" : "nearest" });
    queue.onclick = (e) => { const b = e.target.closest("[data-approve],[data-change]"); if (!b || !st.item) return; if (b.hasAttribute("data-approve")) decide("approved"); else change(); };
  }
  async function change() {
    const it = st.item; st.item = null; const my = st.run;
    const prevMarkup = S.markup; S.markup = 8; $("#markup").value = 8; store.emit();
    status(`Change from ${it.a.approver.name}`, "Markup to 8%. The agent re-prices and re-drafts.");
    queue.innerHTML = `<p class="empty">Sent back to the agent: markup ${prevMarkup}% → 8%.</p>`;
    const n = work.children.length, pr = store.currentPrice(it.lines);
    step(n, { k: "price", title: "Re-prices at 8% markup", auth: "observe", tool: "price", args: { lines: store.lines(it.lines).length + " lines", markupPct: 8 }, body: `<p class="sum">${nzd(pr.total)} incl. GST</p>` + kv([["was", nzd(it.bid.pricing.total)], ["markup 8%", nzd(pr.markup)], ["GST 15%", nzd(pr.gst)]]), note: `Changed by ${it.a.approver.name}; the rates themselves did not move.` });
    await wait(500); if (my !== st.run) return;
    const bid = draftBid({ sheet: it.sheet, lines: store.lines(it.lines), rates: S.rates, markupPct: 8, scope: it.a.scope, seq: ++st.bids, now: nowIso() });
    step(n + 1, { k: "draft_bid", title: "Re-drafts the bid", auth: "act with approval", tool: "draft_bid", args: { sheet: it.sheet.id, scope: it.a.scope, markupPct: 8 }, body: `<p class="sum">${esc(bid.ref)} · ${nzd(bid.pricing.total)} incl. GST</p>` + insp("draft_bid", { sheet: it.sheet.id, markupPct: 8 }, bid), note: `Supersedes ${it.bid.ref}. Waits for ${it.a.approver.name} again.` });
    await wait(300); if (my !== st.run) return;
    enqueue(it.a, bid, it.asked, it.sheet, it.lines, { from: it.bid.ref, note: `markup ${prevMarkup}% → 8%` });
  }

  // ---------------------------------------------------------------- the receipt, the customer-facing bid, and withdrawal
  async function decide(outcome) {
    const it = st.item; if (!it) return; st.item = null; const { a, bid } = it, decided = nowIso();
    const bidHash = await sha256(canon(bid));
    const rec = { schema: "assembl.takeoff-receipt/1", truth: "Simulated", seq: st.receipts.length + 1, kind: "bid",
      bid: { ref: bid.ref, sheet: bid.sheet, scope: bid.scope, customer: bid.customer, lines: bid.pricing.lines.length, totalInclGst: bid.pricing.total, sha256: bidHash },
      decision: { outcome, by: a.approver.name, role: a.approver.role, desk: "estimating", authority: "act with approval", ...(it.changed ? { change: it.changed } : {}) },
      timestamps: { asked: it.asked, drafted: bid.draftedAt, requested: it.requestedAt, decided }, readers: ["estimating", "site", "accounts"], prev: st.prev };
    const hash = await sha256(canon(rec)); st.prev = hash; st.receipts.unshift({ rec, hash });
    root.dataset.state = "done"; status(`Sent by ${a.approver.name} at ${clock(decided)}`, "Receipt written; the customer-facing bid is below. It can be withdrawn.");
    queue.innerHTML = `<p class="empty">Decided. The receipt and the bid are below.</p>`;
    const p = bid.pricing;
    outCard.hidden = false;
    out.innerHTML = `<article class="rcpt" data-ref="${esc(bid.ref)}"><header>${badge("act with approval", "ok")}<span class="auth">Simulated</span>${it.changed ? `<span class="auth">with a change: ${esc(it.changed.note)}</span>` : ""}</header>
      <h3>Bid ${esc(bid.ref)} sent</h3>
      <dl><div><dt>Reference</dt><dd>${esc(bid.ref)}</dd></div><div><dt>Approved by</dt><dd>${esc(a.approver.name)}, ${esc(a.approver.role)}</dd></div><div><dt>When</dt><dd>${clock(decided)}, ${dayAt(decided)}</dd></div><div><dt>Authority</dt><dd>act with approval · level 4 of 6</dd></div>
        <div><dt>Ask to decision</dt><dd>${Math.max(1, Math.round((new Date(decided) - new Date(it.asked)) / 1000))} s</dd></div><div><dt>Record</dt><dd>${esc(rec.schema)} · #${rec.seq}</dd></div>
        <div class="w"><dt>SHA-256 of the bid record, computed in this browser</dt><dd class="hash">${bidHash}</dd></div><div class="w"><dt>Receipt hash</dt><dd class="hash">${hash}</dd></div>${rec.prev ? `<div class="w"><dt>Previous receipt</dt><dd class="hash">${rec.prev}</dd></div>` : ""}</dl>
      <div class="row"><button class="btn ghost sm" type="button" data-json>See the full record</button><button class="btn ghost sm" type="button" data-withdraw>Withdraw bid</button><button class="btn ghost sm" type="button" data-again>Another ask</button></div></article>
      <article class="bid" id="bidDoc"><div class="to"><span>To ${esc(bid.customer)}</span><span>From ${esc(bid.builder)} · ${esc(bid.project)}</span><span>Sheet ${esc(bid.sheet)} · ${esc(bid.sheetTitle)} · ${dayAt(decided)}</span></div>
        <h3>${esc(bid.scope)}</h3>
        <table>${p.byTrade.map((t) => `<tr><td>${esc(t.trade)}<br><small class="mono">${p.lines.filter((l) => l.trade === t.trade).map((l) => `${esc(l.name)} ${l.qty} ${l.unit}`).join(" · ")}</small></td><td>${nzd(t.cost)}</td></tr>`).join("")}
          <tr><td>Markup ${p.markupPct}%</td><td>${nzd(p.markup)}</td></tr><tr><td>Subtotal excl. GST</td><td>${nzd(p.subtotal)}</td></tr><tr><td>GST 15%</td><td>${nzd(p.gst)}</td></tr><tr class="t"><td>Total incl. GST</td><td>${nzd(p.total)}</td></tr></table>
        <ul>${bid.inclusions.map((x) => `<li>Includes: ${esc(x)}</li>`).join("")}${bid.exclusions.map((x) => `<li>Excludes: ${esc(x)}</li>`).join("")}</ul>
        <p class="sign">Valid ${bid.validDays} days · <b>Indicative only · not a quote</b> · ${esc(a.approver.name)}, ${esc(a.approver.role)}</p>
        <p class="ad-msg">Simulated: fictional customer, builder and rates. Not sent to anyone.</p></article>`;
    out.querySelector("[data-json]").onclick = (e) => { const pre = out.querySelector("pre.full"); if (pre) pre.remove(); else e.target.closest("article").insertAdjacentHTML("beforeend", `<pre class="full">${esc(JSON.stringify({ receipt: { ...rec, hash }, bid }, null, 1))}</pre>`); };
    out.querySelector("[data-again]").onclick = () => { root.dataset.state = "idle"; asks.scrollIntoView({ behavior: reduced.matches ? "auto" : "smooth", block: "start" }); };
    out.querySelector("[data-withdraw]").onclick = () => withdraw(a, bid, bidHash);
    if (narrow.matches) outCard.scrollIntoView({ behavior: reduced.matches ? "auto" : "smooth", block: "start" });
  }
  async function withdraw(a, bid, bidHash) {
    const decided = nowIso();
    const rec = { schema: "assembl.takeoff-receipt/1", truth: "Simulated", seq: st.receipts.length + 1, kind: "withdrawal", bid: { ref: bid.ref, sha256: bidHash },
      decision: { outcome: "withdrawn", by: a.approver.name, role: a.approver.role, authority: "act with approval", reverts: bid.ref }, timestamps: { decided }, prev: st.prev };
    const hash = await sha256(canon(rec)); st.prev = hash; st.receipts.unshift({ rec, hash });
    const doc = $("#bidDoc"); if (doc) doc.remove();
    const r = out.querySelector(".rcpt"); r.dataset.w = "1";
    r.querySelector("h3").textContent = `Bid ${bid.ref} withdrawn`;
    r.querySelector("dl").insertAdjacentHTML("beforeend", `<div><dt>Withdrawn by</dt><dd>${esc(a.approver.name)}</dd></div><div><dt>When</dt><dd>${clock(decided)}, ${dayAt(decided)}</dd></div><div class="w"><dt>Withdrawal receipt hash</dt><dd class="hash">${hash}</dd></div>`);
    r.querySelector("[data-withdraw]").remove(); const j = r.querySelector("[data-json]"); j.onclick = (e) => { const pre = out.querySelector("pre.full"); if (pre) pre.remove(); else e.target.closest("article").insertAdjacentHTML("beforeend", `<pre class="full">${esc(JSON.stringify({ receipts: st.receipts.map((x) => ({ ...x.rec, hash: x.hash })) }, null, 1))}</pre>`); };
    root.dataset.state = "idle"; status(`Withdrawn by ${a.approver.name} at ${clock(decided)}`, "The bid is back to a draft on the desk; the receipt chain keeps both decisions. Nothing was ever sent.");
    queue.innerHTML = `<p class="empty">Withdrawn. The measurements stay on the plan; ask again when the rates or the takeoff change.</p>`;
  }

  window.__agentdesk = { run: (i = 0) => run(ASKS[i]), decide, change, st, ASKS };
}
