// The agent desk, scripted. A builder picks one of three asks; the agent's work assembles step by step (read the ask, check the
// scale, find rooms, measure, ask the consent question, list the Building Code checks, propose the defects, run the quote maths,
// draft the quote), each step naming the tool it called and the record it got back. The tools are the same pure functions the
// endpoint serves (takeoff-core.js), run here in the browser, so the demo is deterministic and needs no model call.
// A named (fictional) person decides three times: the scale, which defects become provisional sums, and the quote itself
// (send, change, withdraw). After a quote is sent, a variation runs the same way. Every decision is a SHA-256 receipt chained
// to the one before. Nothing is sent, stored or quoted: everything is Simulated; the code checks are Illustrative.
import { callTool, draftBid, variation, paymentClaim, canon, condition, round, VARIATIONS, NZ_TRUTH, LEGAL_TRUTH, DEFECTS } from "./takeoff-core.js";
import { $, $$, esc, nzd, nzd0 } from "./main.js";

const CUBES = ["#F6B48E", "#C7B4F0", "#A7DEC7", "#F3A5BE", "#F2DC7C", "#A9C9F2"];
const AUTH = { observe: 0, draft: 1, recommend: 2, "act with approval": 3 };
const reduced = matchMedia("(prefers-reduced-motion: reduce)"), narrow = matchMedia("(max-width: 860px)");
const wait = (ms) => new Promise((r) => setTimeout(r, reduced.matches ? 0 : ms));
const nowIso = () => new Date().toISOString();
const clock = (iso) => new Date(iso).toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit" });
const dayAt = (iso) => new Date(iso).toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
async function sha256(text) { const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)); return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join(""); }
const badge = (l, extra = "") => `<span class="auth ${extra}" data-l="${AUTH[l] ?? 0}">${esc(l)}</span>`;
const call = (tool, args) => `<code class="call"><span class="fn">${esc(tool)}</span>(${esc(JSON.stringify(args))})</code>`;
const insp = (tool, args, rec, label = "The call and the record · JSON-RPC") => `<details><summary>${esc(label)}</summary><pre>${esc(JSON.stringify({ request: { jsonrpc: "2.0", method: "tools/call", params: { name: tool, arguments: args } }, record: rec }, null, 1).slice(0, 9000))}</pre></details>`;
const kv = (rows) => `<div class="kv">${rows.map(([k, v]) => `<span>${esc(k)}</span><b>${esc(v)}</b>`).join("")}</div>`;
const ILL = `<span class="auth">Illustrative</span>`;

const ASKS = [
  { id: "floor", channel: "Estimator · 7:40 am", ask: "Take off the floor on A101 and quote it", label: "find_rooms → measure → consent → code checks → defects → quote → draft", sheet: "A101", scope: "Floor finishes, ground floor",
    approver: { name: "Hemi Walker", role: "Estimator", site: "Harbourside Builders (demo)" }, pick: (fr) => fr.rooms.filter((r) => r.conditionId).map((r) => ({ element: r.id, condition: r.conditionId })) },
  { id: "deck", channel: "Site manager · text", ask: "Price the deck and pergola from my rates", label: "find_rooms → measure → consent (Schedule 1) → F4 and E2 checks → quote → draft", sheet: "A201", scope: "Deck and pergola: framing, decking, posts and barrier",
    approver: { name: "Priya Nair", role: "Site manager", site: "Harbourside Builders (demo)" },
    pick: (fr) => [{ element: "deck", condition: "decking" }, ...fr.otherElements.filter((e) => e.conditionId).map((e) => ({ element: e.id, condition: e.conditionId }))] },
  { id: "bid", channel: "Director · end of day", ask: "Quote everything measured on this sheet", label: "reads the takeoff → consent → checks → defects → quote → draft", sheet: null, scope: "Everything measured on the sheet",
    approver: { name: "Tama Reihana", role: "Director", site: "Harbourside Builders (demo)" },
    pick: (fr) => [...fr.rooms.filter((r) => r.conditionId).map((r) => ({ element: r.id, condition: r.conditionId })), ...fr.otherElements.filter((e) => e.conditionId).map((e) => ({ element: e.id, condition: e.conditionId }))] },
];

export function initAgentDesk(store) {
  const { S } = store;
  const root = $("#agentdesk"), work = $("#adWork"), queue = $("#adQueue"), out = $("#adOut"), outCard = $("#adOutCard"), who = $("#adWho"), asks = $("#asks"), chain = $("#adChain"), varPanel = $("#varPanel");
  const st = { run: 0, item: null, receipts: [], prev: null, agentIds: [], bids: 0, vars: 0, sent: null };
  asks.innerHTML = ASKS.map((a, i) => `<button type="button" class="ask" data-i="${i}" aria-pressed="false"><span class="lab">${esc(a.channel)}</span><p>${esc(a.ask)}</p><small>${esc(a.label)}</small></button>`).join("");
  asks.onclick = (e) => { const b = e.target.closest("[data-i]"); if (b) run(ASKS[+b.dataset.i]); };
  const status = (lab, line) => { $("#adStatus").innerHTML = `<span class="lab">${esc(lab)}</span><p>${esc(line)}</p>`; };
  const desk = (state) => { root.dataset.state = state; $("#desk").dataset.state = state; };

  function step(i, s) {
    const el = document.createElement("li"); el.className = "step"; el.dataset.k = s.k;
    el.innerHTML = `<header><i class="cube" style="--c:${CUBES[i % 6]}"></i><div><span class="lab">Step ${i + 1}${s.tool ? ` · ${esc(s.tool)}` : ""}</span><h3>${esc(s.title)}</h3></div>${badge(s.auth)}</header>${s.tool ? call(s.tool, s.args) : ""}<div class="rec">${s.body || ""}</div>${s.note ? `<p class="note">${esc(s.note)}</p>` : ""}`;
    work.appendChild(el); requestAnimationFrame(() => el.classList.add("landed"));
    if (!narrow.matches && work.scrollHeight > work.clientHeight) work.scrollTo({ top: work.scrollHeight, behavior: reduced.matches ? "auto" : "smooth" });
    return el;
  }
  const alive = (my) => my === st.run;
  const thumbHtml = (id) => { const ph = S.photos[id]; return ph ? `<span class="thumbrow"><img class="thumb" src="${ph.thumb}" alt="Site photo"><span class="hash">SHA-256 ${ph.sha256}</span></span>` : ""; };
  const photoRecs = () => Object.values(S.photos).map((p) => ({ defectId: p.defectId, defect: DEFECTS.find((d) => d.id === p.defectId)?.title || p.defectId, sha256: p.sha256, bytes: p.bytes, type: p.type, takenAt: p.takenAt, by: p.by, mini: p.mini }));
  const sev = (d) => `<span data-sev="${d.severity}">${esc(d.title.split(" ").slice(0, 4).join(" "))} · ${d.severity}</span>`;

  // ---------------------------------------------------------------- the run: steps assembling, cubes landing on the plan
  async function run(a) {
    const my = ++st.run; st.item = null;
    $$(".ask", asks).forEach((b) => b.setAttribute("aria-pressed", String(ASKS[+b.dataset.i] === a)));
    const sheetKey = a.sheet || (S.sheet ? S.sheetKey : "A101");
    if (sheetKey !== S.sheetKey) await store.openSheet(sheetKey);
    if (!alive(my)) return;
    const sheet = S.sheet, asked = nowIso();
    desk("working"); work.innerHTML = ""; out.innerHTML = ""; outCard.hidden = true;
    queue.innerHTML = `<p class="empty">The agent is working. When it needs a decision, it lands here for ${esc(a.approver.name)}.</p>`;
    who.innerHTML = `${esc(a.approver.name)} · ${esc(a.approver.role)} · fictional`;
    status(`Asked ${clock(asked)} · ${a.channel}`, "With the agent: reading, measuring, checking, pricing.");
    store.diary("Ask received", `${a.ask} · ${a.channel}`, "#F6B48E");
    let i = 0;
    const existing = a.id === "bid" ? S.measurements.filter((m) => m.sheet === sheetKey) : [];
    step(i++, { k: "intent", title: "Reads the ask", auth: "observe", body: `<p class="sum">What it understood <span class="auth">Simulated</span></p>` + kv([["sheet", `${sheet.id} · ${sheet.title}`], ["scope", a.scope], ["output", "a draft quote for a person to approve"], ["rates", "the builder's sheet below, as edited"], ["checks", "consent question, Building Code clauses, defect register"], ...(a.id === "bid" ? [["takeoff", existing.length ? `${existing.length} lines already measured` : "nothing measured yet, so it takes the sheet off first"]] : [])]), note: "No tool yet. Nothing is sent." });
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
        const rec = r.structuredContent, m = store.addMeasurement({ kind: rec.kind, conditionId: rec.conditionId, pts: rec.points, by: "agent", name: rec.name, element: rec.element });
        st.agentIds.push(m.id); lines.push(m);
        list.insertAdjacentHTML("beforeend", `<span class="fresh">${esc(rec.name)} · ${rec.qty} ${rec.unit}</span>`);
        await wait(140);
      }
      el.querySelector(".rec").insertAdjacentHTML("beforeend", `<details><summary>The ${calls.length} calls and records · JSON-RPC</summary><pre>${esc(JSON.stringify(calls, null, 1).slice(0, 12000))}</pre></details>`);
      store.diary("Measured by the agent", `${lines.length} lines on ${sheet.id} under a scale confirmed by ${a.approver.name}`, "#A7DEC7");
      await wait(300); if (!alive(my)) return;
    }
    const L = store.lines(lines);

    // the consent question, the Building Code checks, the defects
    const ccArgs = { sheet: sheet.id, lines: L.map((l) => ({ conditionId: l.conditionId, qty: round(l.qty, 2), element: l.element })) }, cc = callTool("consent_check", ccArgs).structuredContent;
    step(i++, { k: "consent", title: "Asks: does this need a building consent?", auth: "observe", tool: "consent_check", args: ccArgs, body: `<p class="sum">${esc(cc.verdict)} ${ILL}</p>` + kv(cc.questions.map((q) => [q.q.replace(/\?$/, ""), q.answer])) + insp("consent_check", ccArgs, cc), note: `${NZ_TRUTH}. Schedule 1 of the Building Act 2004; the council decides. The full questions are in Checks below.` });
    await wait(450); if (!alive(my)) return;
    const code = callTool("code_checks", ccArgs).structuredContent;
    step(i++, { k: "code", title: "Lists the Building Code clauses to check", auth: "observe", tool: "code_checks", args: ccArgs, body: `<p class="sum">${code.checks.length} checks across ${code.byClause.length} clauses ${ILL}</p><div class="rooms">${code.byClause.map((g) => `<span>${g.clause} ${esc(g.name)} · ${g.checks.length}</span>`).join("")}</div>` + insp("code_checks", ccArgs, code), note: "One line per check, with MBIE's page, in Checks below. H1 R-values by climate zone sit there too." });
    await wait(450); if (!alive(my)) return;
    const dr = callTool("defect_register", ccArgs).structuredContent;
    const proposed = dr.register.filter((d) => d.proposed);
    step(i++, { k: "defects", title: `Proposes ${dr.count} defects to check, ${proposed.length} as provisional sums`, auth: "recommend", tool: "defect_register", args: ccArgs, body: `<p class="sum">Worst first; each has a photo to take on site ${ILL}</p><div class="rooms">${dr.register.map(sev).join("")}</div>` + insp("defect_register", ccArgs, dr), note: `The agent proposes. ${a.approver.name} decides which become provisional sums, in the approval card.` });
    store.diary("Photo checks requested", dr.register.map((d) => d.photoCheck.split(":")[0].split(".")[0]).slice(0, 3).join(" · ") + (dr.count > 3 ? ` · +${dr.count - 3}` : ""), "#F3A5BE");
    await wait(300); if (!alive(my)) return;

    // gate 1: a person picks the provisional sums
    status(`Waiting for ${a.approver.name}`, "Which risks become provisional sums in the quote?");
    desk("waiting");
    queue.innerHTML = `<article class="q"><header>${badge("recommend")}<span>provisional sums · ${clock(nowIso())}</span></header>
      <h3>Hold which risks as provisional sums?</h3><p class="hint">The agent ticked the high and medium ones with a sum. Untick anything the site visit rules out. Low-severity items stay as checks.</p>
      <ul class="picks">${dr.register.filter((d) => d.provisionalSum > 0).map((d) => `<li><label><input type="checkbox" data-pick="${d.id}" ${d.proposed ? "checked" : ""}><span>${esc(d.title)}<small>${esc(d.clause)} ${esc(d.clauseName)} · ${d.severity}</small></span><b>${nzd0(d.provisionalSum)}</b></label><div class="ph"><label class="photo-in"><input type="file" accept="image/*" capture="environment" data-photo="${d.id}" aria-label="Add a site photo for ${esc(d.title)}">Add site photo</label><span data-thumb="${d.id}">${thumbHtml(d.id)}</span></div></li>`).join("")}</ul>
      <p class="hint">Photos stay in this browser: downscaled, hashed with SHA-256, and the hash goes on the receipt. Nothing is uploaded.</p>
      <div class="row"><button class="btn" type="button" data-ps>Confirm as ${esc(a.approver.name.split(" ")[0])}</button><span class="hint">Illustrative allowances, charged at cost with the record.</span></div>
      <p class="note">Deciding as ${esc(a.approver.name)}, ${esc(a.approver.role)}. Nothing is sent or stored: this is a simulation.</p></article>`;
    queue.scrollIntoView({ behavior: reduced.matches ? "auto" : "smooth", block: narrow.matches ? "start" : "nearest" });
    queue.onchange = async (e) => { const inp = e.target.closest("[data-photo]"); if (!inp || !inp.files[0]) return; const slot = queue.querySelector(`[data-thumb="${inp.dataset.photo}"]`); slot.innerHTML = `<span class="hint">Hashing…</span>`; try { await store.addPhoto(inp.dataset.photo, inp.files[0], a.approver.name); slot.innerHTML = thumbHtml(inp.dataset.photo); } catch (err) { slot.innerHTML = `<span class="hint">${esc(err.message || err)}</span>`; } inp.value = ""; };
    await new Promise((resolve) => { queue.querySelector("[data-ps]").onclick = () => { store.setPS($$("[data-pick]:checked", queue).map((x) => x.dataset.pick), a.approver.name); resolve(); }; const un = store.subscribe(() => { if (my !== st.run) { un(); resolve(); } }); });
    if (!alive(my)) return;
    desk("working"); queue.innerHTML = `<p class="empty">Provisional sums decided. The agent prices.</p>`;
    status(`Asked ${clock(asked)} · ${a.channel}`, "Provisional sums decided. The agent runs the quote maths.");
    await wait(250); if (!alive(my)) return;

    // the quote maths, then the draft
    const qo = store.quoteOpts(), qargs = { lines: ccArgs.lines, rates: "the builder's sheet", marginPct: qo.marginPct, pgPct: qo.pgPct, wastePct: qo.wastePct, tradeRates: qo.tradeRates, provisionalSums: qo.provisionalSums };
    const q = store.currentQuote(lines);
    step(i++, { k: "quote", title: "Runs the NZ quote maths", auth: "observe", tool: "quote", args: qargs, body: `<p class="sum">${nzd(q.total)} incl. GST <span class="auth">Indicative only · not a quote</span></p>` + kv([...q.byTrade.map((t) => [`${t.trade} · ${t.hours} h at $${t.hourlyRate}/h`, nzd(t.cost)]), ["materials incl. waste", nzd(q.material + q.waste)], ["labour", `${nzd(q.labour)} · ${q.hours} h`], [`P&G ${q.pgPct}%`, nzd(q.pg)], [`margin ${q.marginPct}%`, nzd(q.margin)], ...(q.provisional ? [[`provisional sums · ${q.provisionalSums.length}`, nzd(q.provisional)]] : []), ["subtotal excl. GST", nzd(q.subtotal)], ["GST 15%", nzd(q.gst)]]) + insp("quote", qargs, q), note: "The agent proposes no rate. Edit the quote maths below and ask again." });
    await wait(500); if (!alive(my)) return;
    const bid = draftBid({ sheet, lines: L, ...qo, scope: a.scope, seq: ++st.bids, now: nowIso() });
    const bargs = { sheet: sheet.id, scope: a.scope, lines: ccArgs.lines, marginPct: qo.marginPct, pgPct: qo.pgPct, provisionalSums: qo.provisionalSums };
    step(i++, { k: "draft_bid", title: "Drafts the quote, and asks a person", auth: "act with approval", tool: "draft_bid", args: bargs, body: `<p class="sum">${esc(bid.ref)} · ${esc(bid.customer)}</p>` + kv([["scope", bid.scope], ["total incl. GST", nzd(bid.pricing.total)], ["valid", `${bid.validDays} days`], ["exclusions", `${bid.exclusions.length} listed`], ["status", "draft, waiting for approval"]]) + insp("draft_bid", bargs, bid), note: `A draft, not a quote. It waits for ${a.approver.name}.` });
    await wait(300); if (!alive(my)) return;
    enqueue(a, bid, asked, sheet, lines);
  }

  // ---------------------------------------------------------------- approval: a named person sends it or asks for a change
  function enqueue(a, bid, asked, sheet, lines, changed) {
    st.item = { a, bid, asked, sheet, lines, requestedAt: nowIso(), changed };
    desk("waiting"); status(`Waiting for ${a.approver.name}`, "The draft quote is in the approval queue.");
    queue.innerHTML = `<article class="q"><header>${badge("act with approval")}<span>${esc(bid.ref)} · ${clock(st.item.requestedAt)}</span></header>
      <h3>Send the quote for ${esc(bid.scope.toLowerCase())}?</h3><p class="hint">${esc(bid.customer)} · ${nzd(bid.pricing.total)} incl. GST · ${bid.pricing.lines.length} lines · ${bid.pricing.hours} h · margin ${bid.pricing.marginPct}% · P&amp;G ${bid.pricing.pgPct}%${bid.pricing.provisional ? ` · ${bid.pricing.provisionalSums.length} provisional sums` : ""}</p>
      <ul><li>Scale confirmed by a person</li><li>Every line drawn on ${esc(sheet.id)}</li><li>Consent question asked; ${bid.pricing.provisionalSums.length ? "provisional sums chosen by a person" : "no provisional sums held"}</li><li>Rates from the builder's sheet, nothing proposed</li><li>GST shown separately · valid 30 days · indicative only</li></ul>
      <div class="row"><button class="btn" type="button" data-approve>Send the quote</button><button class="btn ghost" type="button" data-change ${changed ? "disabled" : ""}>${changed ? "Changed once" : "Change: margin to 8%"}</button></div>
      <p class="note">Deciding as ${esc(a.approver.name)}, ${esc(a.approver.role)}. Nothing is sent or stored: this is a simulation.</p></article>`;
    queue.scrollIntoView({ behavior: reduced.matches ? "auto" : "smooth", block: narrow.matches ? "start" : "nearest" });
    queue.onclick = (e) => { const b = e.target.closest("[data-approve],[data-change]"); if (!b || !st.item) return; if (b.hasAttribute("data-approve")) decide("approved"); else change(); };
  }
  async function change() {
    const it = st.item; st.item = null; const my = st.run;
    const prevMargin = S.markup; S.markup = 8; $("#markup").value = 8; store.emit();
    status(`Change from ${it.a.approver.name}`, "Margin to 8%. The agent re-prices and re-drafts.");
    queue.innerHTML = `<p class="empty">Sent back to the agent: margin ${prevMargin}% → 8%.</p>`;
    store.diary("Change requested", `${it.a.approver.name}: margin ${prevMargin}% → 8% on ${it.bid.ref}`, "#F2DC7C");
    const n = work.children.length, q = store.currentQuote(it.lines);
    step(n, { k: "quote", title: "Re-runs the quote maths at 8% margin", auth: "observe", tool: "quote", args: { lines: store.lines(it.lines).length + " lines", marginPct: 8 }, body: `<p class="sum">${nzd(q.total)} incl. GST</p>` + kv([["was", nzd(it.bid.pricing.total)], ["margin 8%", nzd(q.margin)], ["GST 15%", nzd(q.gst)]]), note: `Changed by ${it.a.approver.name}; the rates themselves did not move.` });
    await wait(500); if (my !== st.run) return;
    const bid = draftBid({ sheet: it.sheet, lines: store.lines(it.lines), ...store.quoteOpts(), scope: it.a.scope, seq: ++st.bids, now: nowIso() });
    step(n + 1, { k: "draft_bid", title: "Re-drafts the quote", auth: "act with approval", tool: "draft_bid", args: { sheet: it.sheet.id, scope: it.a.scope, marginPct: 8 }, body: `<p class="sum">${esc(bid.ref)} · ${nzd(bid.pricing.total)} incl. GST</p>` + insp("draft_bid", { sheet: it.sheet.id, marginPct: 8 }, bid), note: `Supersedes ${it.bid.ref}. Waits for ${it.a.approver.name} again.` });
    await wait(300); if (my !== st.run) return;
    enqueue(it.a, bid, it.asked, it.sheet, it.lines, { from: it.bid.ref, note: `margin ${prevMargin}% → 8%` });
  }

  // ---------------------------------------------------------------- receipts: hashed, chained, listed
  async function receipt(rec) {
    rec = { schema: "assembl.takeoff-receipt/1", truth: "Simulated", seq: st.receipts.length + 1, ...rec, prev: st.prev };
    const hash = await sha256(canon(rec)); st.prev = hash; st.receipts.unshift({ rec, hash });
    const colour = { quote: "#A7DEC7", withdrawal: "#F3A5BE", variation: "#F6B48E", "payment-claim": "#A9C9F2" }[rec.kind] || "#C7B4F0";
    chain.insertAdjacentHTML("beforeend", `<li style="--c:${colour}"><span><b>#${rec.seq} · ${esc(rec.kind)} · ${esc(rec.claim?.ref || rec.variation?.ref || rec.bid?.ref || "")} · ${esc(rec.decision.outcome)} by ${esc(rec.decision.by)}</b><span class="hash">${hash}</span></span></li>`);
    return { rec, hash };
  }
  const fullJson = (e, payload) => { const art = e.target.closest("article"), pre = art.querySelector("pre.full"); if (pre) pre.remove(); else art.insertAdjacentHTML("beforeend", `<pre class="full">${esc(JSON.stringify(payload, null, 1))}</pre>`); };

  // ---------------------------------------------------------------- the decision, the receipt, the client-ready quote
  async function decide(outcome) {
    const it = st.item; if (!it) return; st.item = null; const { a, bid } = it, decided = nowIso();
    const bidHash = await sha256(canon(bid));
    const { rec, hash } = await receipt({ kind: "quote",
      bid: { ref: bid.ref, sheet: bid.sheet, scope: bid.scope, customer: bid.customer, lines: bid.pricing.lines.length, hours: bid.pricing.hours, provisionalSums: bid.pricing.provisionalSums.length, totalInclGst: bid.pricing.total, validDays: bid.validDays, sha256: bidHash },
      ...(photoRecs().length ? { photos: photoRecs() } : {}),
      decision: { outcome, by: a.approver.name, role: a.approver.role, desk: "estimating", authority: "act with approval", ...(it.changed ? { change: it.changed } : {}) },
      timestamps: { asked: it.asked, drafted: bid.draftedAt, requested: it.requestedAt, decided }, readers: ["estimating", "site", "accounts", "client"] });
    st.sent = { a, bid, bidHash, receipt: hash, lines: it.lines, sheet: it.sheet, decided };
    desk("done"); status(`Sent by ${a.approver.name} at ${clock(decided)}`, "Receipt written; the client-ready quote is below. Print it, raise a variation, or withdraw it.");
    queue.innerHTML = `<p class="empty">Decided. The receipt and the quote are below.</p>`;
    store.diary("Quote sent", `${bid.ref} · ${nzd(bid.pricing.total)} incl. GST · approved by ${a.approver.name}`, "#A7DEC7");
    const p = bid.pricing;
    outCard.hidden = false;
    out.innerHTML = `<article class="rcpt" data-ref="${esc(bid.ref)}"><header>${badge("act with approval", "ok")}<span class="auth">Simulated</span>${it.changed ? `<span class="auth">with a change: ${esc(it.changed.note)}</span>` : ""}</header>
      <h3>Quote ${esc(bid.ref)} sent</h3>
      <dl><div><dt>Reference</dt><dd>${esc(bid.ref)}</dd></div><div><dt>Approved by</dt><dd>${esc(a.approver.name)}, ${esc(a.approver.role)}</dd></div><div><dt>When</dt><dd>${clock(decided)}, ${dayAt(decided)}</dd></div><div><dt>Authority</dt><dd>act with approval · level 4 of 6</dd></div>
        <div><dt>Ask to decision</dt><dd>${Math.max(1, Math.round((new Date(decided) - new Date(it.asked)) / 1000))} s</dd></div><div><dt>Record</dt><dd>${esc(rec.schema)} · #${rec.seq}</dd></div>
        <div class="w"><dt>SHA-256 of the quote record, computed in this browser</dt><dd class="hash">${bidHash}</dd></div><div class="w"><dt>Receipt hash</dt><dd class="hash">${hash}</dd></div>${rec.prev ? `<div class="w"><dt>Previous receipt</dt><dd class="hash">${rec.prev}</dd></div>` : ""}${rec.photos ? `<div class="w"><dt>Site photos on this receipt · hashed in this browser, not uploaded</dt><dd>${rec.photos.map((ph) => `<span class="thumbrow"><img class="thumb" src="${ph.mini}" alt="Site photo: ${esc(ph.defect)}"><span><small>${esc(ph.defect)}</small><br><span class="hash">${ph.sha256}</span></span></span>`).join("")}</dd></div>` : ""}</dl>
      <div class="row"><button class="btn sm" type="button" data-print>Print / save as PDF</button><button class="btn ghost sm" type="button" data-var>Raise a variation</button><button class="btn ghost sm" type="button" data-claim>Payment claim</button><button class="btn ghost sm" type="button" data-json>Full record</button><button class="btn ghost sm" type="button" data-withdraw>Withdraw</button><button class="btn ghost sm" type="button" data-again>Another ask</button></div></article>
      ${quoteDoc(bid, a, decided)}`;
    out.querySelector("[data-json]").onclick = (e) => fullJson(e, { receipt: { ...rec, hash }, quote: bid });
    out.querySelector("[data-again]").onclick = () => { desk("idle"); asks.scrollIntoView({ behavior: reduced.matches ? "auto" : "smooth", block: "start" }); };
    out.querySelector("[data-withdraw]").onclick = () => withdraw(a, bid, bidHash);
    out.querySelector("[data-print]").onclick = () => store.printQuote($("#bidDoc"), { builder: bid.builder, ref: bid.ref, date: dayAt(decided), schema: bid.schema, hash: bidHash, receipt: hash });
    out.querySelector("[data-var]").onclick = () => raiseVariation();
    out.querySelector("[data-claim]").onclick = () => { $("#claimCard").scrollIntoView({ behavior: reduced.matches ? "auto" : "smooth", block: "start" }); $("#claimPanel [data-draft]")?.focus({ preventScroll: true }); };
    st.claims = []; renderClaimPanel();
    renderVarPanel();
    if (narrow.matches) outCard.scrollIntoView({ behavior: reduced.matches ? "auto" : "smooth", block: "start" });
  }
  function quoteDoc(bid, a, decided, variations = []) {
    const p = bid.pricing;
    return `<article class="bid" id="bidDoc"><div class="bidhead"><div class="to"><span>To ${esc(bid.customer)}</span><span>From ${esc(bid.builder)} · ${esc(bid.project)}</span><span>Sheet ${esc(bid.sheet)} · ${esc(bid.sheetTitle)}</span></div><div class="ref">${esc(bid.ref)}<br>${dayAt(decided)}<br>valid ${bid.validDays} days</div></div>
        <h3>${esc(bid.scope)}</h3>
        <table>${p.byTrade.map((t) => `<tr><td>${esc(t.trade)} · ${t.hours} h<br><small class="mono">${p.lines.filter((l) => l.trade === t.trade).map((l) => `${esc(l.name)} ${l.qty} ${l.unit}`).join(" · ")}</small></td><td>${nzd(t.cost)}</td></tr>`).join("")}
          <tr class="sub"><td>Materials ${nzd(p.material)} · waste ${nzd(p.waste)} · labour ${nzd(p.labour)} (${p.hours} h)</td><td>${nzd(p.cost)}</td></tr>
          <tr><td>Preliminaries and general ${p.pgPct}%</td><td>${nzd(p.pg)}</td></tr><tr><td>Margin ${p.marginPct}%</td><td>${nzd(p.margin)}</td></tr>
          ${p.provisionalSums.map((s) => { const ph = S.photos[s.id]; return `<tr class="psrow"><td>${ph ? `<img src="${ph.mini}" alt="Site photo">` : ""}Provisional sum · ${esc(s.title)}${ph ? `<br><small class="mono">site photo SHA-256 ${ph.sha256}</small>` : ""}</td><td>${nzd(s.amount)}</td></tr>`; }).join("")}
          ${variations.map((v) => `<tr><td>Variation ${esc(v.ref)} · ${esc(v.title)} · approved ${dayAt(v.at)}</td><td>${v.delta.subtotal >= 0 ? "+" : "−"}${nzd(Math.abs(v.delta.subtotal))}</td></tr>`).join("")}
          <tr><td>Subtotal excl. GST</td><td>${nzd(p.subtotal + variations.reduce((s, v) => s + v.delta.subtotal, 0))}</td></tr><tr><td>GST 15%</td><td>${nzd(p.gst + variations.reduce((s, v) => s + v.delta.gst, 0))}</td></tr><tr class="t"><td>Total incl. GST</td><td>${nzd(p.total + variations.reduce((s, v) => s + v.delta.total, 0))}</td></tr></table>
        <ul>${bid.inclusions.map((x) => `<li>Includes: ${esc(x)}</li>`).join("")}${bid.exclusions.map((x) => `<li>Excludes: ${esc(x)}</li>`).join("")}${bid.terms.map((x) => `<li>Terms: ${esc(x)}</li>`).join("")}</ul>
        <p class="sign"><b>Indicative only · not a quote</b> · ${esc(a.approver.name)}, ${esc(a.approver.role)}, ${esc(bid.builder)}</p>
        <p class="ad-msg">Simulated: fictional customer, builder and rates. Code checks illustrative. Not sent to anyone.</p></article>`;
  }
  async function withdraw(a, bid, bidHash) {
    const decided = nowIso();
    const { hash } = await receipt({ kind: "withdrawal", bid: { ref: bid.ref, sha256: bidHash }, decision: { outcome: "withdrawn", by: a.approver.name, role: a.approver.role, authority: "act with approval", reverts: bid.ref }, timestamps: { decided } });
    const doc = $("#bidDoc"); if (doc) doc.remove(); $$(".rcpt[data-v]", out).forEach((x) => x.remove());
    const r = out.querySelector(".rcpt"); r.dataset.w = "1";
    r.querySelector("h3").textContent = `Quote ${bid.ref} withdrawn`;
    r.querySelector("dl").insertAdjacentHTML("beforeend", `<div><dt>Withdrawn by</dt><dd>${esc(a.approver.name)}</dd></div><div><dt>When</dt><dd>${clock(decided)}, ${dayAt(decided)}</dd></div><div class="w"><dt>Withdrawal receipt hash</dt><dd class="hash">${hash}</dd></div>`);
    ["[data-withdraw]", "[data-print]", "[data-var]"].forEach((s) => r.querySelector(s)?.remove()); const j = r.querySelector("[data-json]"); j.onclick = (e) => fullJson(e, { receipts: st.receipts.map((x) => ({ ...x.rec, hash: x.hash })) });
    st.sent = null; renderVarPanel(); renderClaimPanel();
    store.diary("Quote withdrawn", `${bid.ref} · by ${a.approver.name}`, "#F3A5BE");
    desk("idle"); status(`Withdrawn by ${a.approver.name} at ${clock(decided)}`, "The quote is back to a draft on the desk; the receipt chain keeps every decision. Nothing was ever sent.");
    queue.innerHTML = `<p class="empty">Withdrawn. The measurements stay on the plan; ask again when the rates or the takeoff change.</p>`;
  }

  // ---------------------------------------------------------------- a variation: the client changes the job after the quote went
  function renderVarPanel() {
    if (!st.sent) { varPanel.innerHTML = `<p class="empty">Approve a quote on the desk first. Then raise the variation from the receipt, or here.</p>`; return; }
    const v = VARIATIONS[st.sent.sheet.id];
    varPanel.innerHTML = `<div class="v"><p><b>${esc(v.title)}</b></p><p class="hint">${esc(v.who)}. ${esc(v.note)}</p>` + kv([["against", st.sent.bid.ref], ["adds", v.add.map((x) => `${x.element} · ${x.condition}`).join(", ")], ["approver", `${st.sent.a.approver.name}, ${st.sent.a.approver.role}`], ["authority", "act with approval"]]) + `<div class="row"><button class="btn sm" type="button" data-raise ${st.varBusy ? "disabled" : ""}>Raise the variation</button></div></div>`;
    varPanel.querySelector("[data-raise]").onclick = () => raiseVariation();
  }
  async function raiseVariation() {
    const s = st.sent; if (!s || st.varBusy) return; st.varBusy = true; renderVarPanel();
    const my = st.run, v = VARIATIONS[s.sheet.id], at = nowIso();
    desk("working"); status(`Variation · ${clock(at)}`, `${v.who.split(",")[0]} asks for a change. The agent re-measures and re-prices.`);
    store.diary("Variation requested", `${v.title} · ${v.who}`, "#F6B48E");
    outCard.scrollIntoView({ behavior: reduced.matches ? "auto" : "smooth", block: narrow.matches ? "start" : "nearest" });
    const n = work.children.length;
    step(n, { k: "var-intent", title: "Reads the variation", auth: "observe", body: `<p class="sum">${esc(v.title)}</p>` + kv([["from", v.who], ["against", s.bid.ref], ["adds", v.add.map((x) => `${x.element} · ${x.condition}`).join(", ")]]), note: "A change after approval is priced on its own and approved on its own. The original quote stands until then." });
    await wait(400); if (my !== st.run) { st.varBusy = false; return; }
    const sc = store.scaleOf(s.sheet.id), qo = store.quoteOpts();
    const vargs = { sheet: s.sheet.id, quoteRef: s.bid.ref, add: v.add, baseLines: store.lines(s.lines).map((l) => ({ conditionId: l.conditionId, qty: round(l.qty, 2), element: l.element })), mmPerPt: round(sc.mmPerPt, 4), marginPct: qo.marginPct, pgPct: qo.pgPct };
    const vr = variation({ sheet: s.sheet, quoteRef: s.bid.ref, add: v.add, baseLines: store.lines(s.lines), mmPerPt: sc.mmPerPt, ...qo, seq: ++st.vars, now: nowIso() });
    if (vr.error) { st.varBusy = false; return; }
    const d = vr.delta, sign = (x) => (x >= 0 ? "+" : "−") + nzd(Math.abs(x));
    step(n + 1, { k: "variation", title: "Re-measures, re-prices, and asks a person", auth: "act with approval", tool: "variation", args: vargs, body: `<p class="sum">${esc(vr.ref)} · ${sign(d.total)} incl. GST</p><div class="rooms">${vr.added.map((m) => `<span class="fresh">${esc(m.name)} · ${m.qty} ${m.unit}</span>`).join("")}</div>` + kv([["cost", sign(d.cost)], ["hours", `${d.hours >= 0 ? "+" : "−"}${Math.abs(d.hours)} h`], [`P&G ${qo.pgPct}% + margin ${qo.marginPct}%`, sign(d.pg + d.margin)], ["GST 15%", sign(d.gst)], ["quote after", nzd(vr.after.total)]]) + insp("variation", vargs, vr), note: `${s.sheet.id === "A201" ? "The barrier check (F4) is flagged again: a raised deck means a bigger fall. " : ""}Waits for ${s.a.approver.name}.` });
    await wait(300); if (my !== st.run) { st.varBusy = false; return; }
    desk("waiting"); status(`Waiting for ${s.a.approver.name}`, `Variation ${vr.ref} is in the approval queue.`);
    queue.innerHTML = `<article class="q"><header>${badge("act with approval")}<span>${esc(vr.ref)} · ${clock(nowIso())}</span></header>
      <h3>Approve the variation: ${esc(v.title.toLowerCase())}?</h3><p class="hint">${sign(d.total)} incl. GST on ${esc(s.bid.ref)} · ${vr.added.length} line${vr.added.length === 1 ? "" : "s"} added · quote becomes ${nzd(vr.after.total)}</p>
      <ul><li>Measured under the scale confirmed by a person</li><li>Same rates, waste, P&amp;G and margin as the quote</li><li>The client's instruction is recorded in the site diary</li></ul>
      <div class="row"><button class="btn" type="button" data-vok>Approve the variation</button><button class="btn ghost" type="button" data-vno>Decline</button></div>
      <p class="note">Deciding as ${esc(s.a.approver.name)}, ${esc(s.a.approver.role)}. Nothing is sent or stored: this is a simulation.</p></article>`;
    queue.scrollIntoView({ behavior: reduced.matches ? "auto" : "smooth", block: narrow.matches ? "start" : "nearest" });
    queue.onclick = async (e) => {
      const b = e.target.closest("[data-vok],[data-vno]"); if (!b) return; queue.onclick = null;
      const ok = b.hasAttribute("data-vok"), decided = nowIso(), vHash = await sha256(canon(vr));
      const { rec, hash } = await receipt({ kind: "variation", bid: { ref: s.bid.ref, sha256: s.bidHash }, variation: { ref: vr.ref, title: v.title, requestedBy: v.who, added: vr.added.length, deltaInclGst: d.total, sha256: vHash },
        decision: { outcome: ok ? "approved" : "declined", by: s.a.approver.name, role: s.a.approver.role, authority: "act with approval" }, timestamps: { requested: at, drafted: vr.draftedAt, decided } });
      if (ok) { for (const m of vr.added) { const added = store.addMeasurement({ kind: m.kind, conditionId: m.conditionId, pts: m.points, by: "agent", name: m.name, element: m.element }); st.agentIds.push(added.id); s.lines.push(added); } s.variations = [...(s.variations || []), { ref: vr.ref, title: v.title, delta: d, at: decided }]; }
      store.diary(ok ? "Variation approved" : "Variation declined", `${vr.ref} · ${sign(d.total)} incl. GST · by ${s.a.approver.name}`, ok ? "#A7DEC7" : "#F3A5BE");
      out.querySelector(".rcpt").insertAdjacentHTML("afterend", `<article class="rcpt" data-v="1"><header>${badge("act with approval", ok ? "ok" : "")}<span class="auth">Simulated</span></header><h3>Variation ${esc(vr.ref)} ${ok ? "approved" : "declined"}</h3>
        <dl><div><dt>Change</dt><dd>${esc(v.title)}</dd></div><div><dt>Asked by</dt><dd>${esc(v.who)}</dd></div><div><dt>Decided by</dt><dd>${esc(s.a.approver.name)}, ${esc(s.a.approver.role)} · ${clock(decided)}</dd></div><div><dt>Effect</dt><dd>${ok ? `${sign(d.total)} incl. GST · quote now ${nzd(vr.after.total)}` : "none · the quote stands"}</dd></div>
        <div class="w"><dt>SHA-256 of the variation record</dt><dd class="hash">${vHash}</dd></div><div class="w"><dt>Receipt hash · chained to ${esc(rec.prev ? rec.prev.slice(0, 12) + "…" : "none")}</dt><dd class="hash">${hash}</dd></div></dl>
        <div class="row"><button class="btn ghost sm" type="button" data-vjson>Full record</button></div></article>`);
      out.querySelector("[data-vjson]").onclick = (e) => fullJson(e, { receipt: { ...rec, hash }, variation: vr });
      if (ok) { const doc = $("#bidDoc"); if (doc) doc.outerHTML = quoteDoc(s.bid, s.a, s.decided, s.variations); }
      queue.innerHTML = `<p class="empty">Decided. The variation receipt is chained to the quote's.</p>`;
      desk("done"); status(`Variation ${ok ? "approved" : "declined"} by ${s.a.approver.name} at ${clock(decided)}`, ok ? "The quote carries the variation; the receipt chain carries both decisions." : "The quote stands; the decline is on the chain too.");
      st.varBusy = false; renderVarPanel();
    };
  }

  // ---------------------------------------------------------------- payment claims under the Construction Contracts Act 2002
  const claimPanel = $("#claimPanel"); st.claims = [];
  const dayIso = (iso) => iso.slice(0, 10);
  const addDays = (iso, n) => new Date(new Date(iso.slice(0, 10) + "T00:00:00Z").getTime() + n * 864e5).toISOString().slice(0, 10);
  function renderClaimPanel(doc = "") {
    const s = st.sent;
    if (!s) { claimPanel.innerHTML = `<p class="empty">Approve a quote on the desk first. Then build a progress payment claim against it here.</p>`; return; }
    const last = st.claims[st.claims.length - 1], n = st.claims.length + 1, today = dayIso(nowIso());
    const pct = last ? Math.min(100, last.calc.percentComplete + 30) : 40;
    claimPanel.innerHTML = `<form class="claim-form" data-claimform>
      <p class="hint">Against ${esc(s.bid.ref)} · ${esc(s.bid.customer)} · approved ${nzd(s.bid.pricing.subtotal)} excl. GST${(s.variations || []).length ? ` + ${s.variations.length} variation${s.variations.length === 1 ? "" : "s"}` : ""}</p>
      <div class="two"><label>Claim number<input type="number" name="claimNo" value="${n}" min="1" readonly></label><label>Served on<input type="date" name="served" value="${today}"></label></div>
      <div class="two"><label>Period from<input type="date" name="from" value="${last ? addDays(last.period.to, 1) : dayIso(s.decided)}"></label><label>Period to<input type="date" name="to" value="${today}"></label></div>
      <label>Work complete to date: <b data-pctout>${pct}%</b><input type="range" name="pct" min="${last ? last.calc.percentComplete : 0}" max="100" step="5" value="${pct}"></label>
      <div class="two"><label>Retention %<input type="number" name="ret" value="5" min="0" max="10" step="0.5" inputmode="decimal"></label><label>Region (anniversary day)<input type="text" name="region" value="${esc(store.councilRegion())}" readonly></label></div>
      <label class="chk"><input type="checkbox" name="res" checked><span>The client is a residential occupier (they live, or will live, in the house). This changes how retentions are treated.</span></label>
      <div class="row"><button class="btn sm" type="submit" data-draft ${st.claimBusy ? "disabled" : ""}>Draft claim ${n}</button><span class="hint">${LEGAL_TRUTH}</span></div></form>${doc}`;
    const f = claimPanel.querySelector("[data-claimform]");
    f.pct.oninput = () => { f.querySelector("[data-pctout]").textContent = f.pct.value + "%"; };
    f.onsubmit = (e) => { e.preventDefault(); draftClaim({ served: f.served.value, from: f.from.value, to: f.to.value, pct: +f.pct.value, ret: +f.ret.value || 0, res: f.res.checked }); };
  }
  function claimDoc(c, s, hashes) {
    const k = c.calc, sign = c.status === "approved" ? `Served by ${esc(s.a.approver.name)}, ${esc(s.a.approver.role)}, ${esc(c.builder)}` : "Draft, waiting for approval";
    return `<article class="claimdoc" id="claimDoc"><div class="bidhead"><div class="to"><span>To ${esc(c.customer)}</span><span>From ${esc(c.builder)} · ${esc(c.project)}</span><span>Contract ${esc(c.quoteRef)} · claim ${c.claimNo} · period ${esc(c.period.from || "–")} to ${esc(c.period.to)}</span></div><div class="ref">${esc(c.ref)}<br>served ${esc(c.served)}</div></div>
      <h4>Progress payment claim ${c.claimNo}</h4><p class="stmt">${esc(c.statement)}</p>
      <table><tr><td>Contract value (approved quote, excl. GST)</td><td>${nzd(k.contractValue)}</td></tr>${k.variationsValue ? `<tr><td>Approved variations</td><td>${nzd(k.variationsValue)}</td></tr>` : ""}<tr><td>Work complete to date: ${k.percentComplete}% of ${nzd(k.total)}</td><td>${nzd(k.valueToDate)}</td></tr>
        <tr><td>Less previously claimed</td><td>−${nzd(k.previouslyClaimed)}</td></tr><tr><td>This claim</td><td>${nzd(k.thisClaim)}</td></tr><tr><td>Less retention ${k.retentionPct}%</td><td>−${nzd(k.retention)}</td></tr><tr><td>Net excl. GST</td><td>${nzd(k.net)}</td></tr><tr><td>GST 15%</td><td>${nzd(k.gst)}</td></tr><tr class="t"><td>Claimed amount incl. GST</td><td>${nzd(k.claimed)}</td></tr></table>
      <p><b>Due for payment ${esc(c.dueDate)}</b> (${esc(c.basis.due)}). A payment schedule, if the client disputes any of it, is due by <b>${esc(c.scheduleBy)}</b> (${esc(c.basis.schedule)}).${c.holidaysKnown ? "" : " Working days outside 2026–27 count weekends and the Christmas break only."}</p>
      <p class="law"><b>How to respond (s 21, s 22).</b> ${c.timing.map((t) => `${esc(t.ref)}: ${esc(t.text)}`).join(" ")}</p>
      <p class="law"><b>Retentions.</b> ${esc(c.retentionNote)}</p>
      <details><summary class="hint">Section 20 checklist</summary><ul class="checklist">${c.checklist.map((x) => `<li data-m="${x.met}"><code>${esc(x.ref)}</code><span>${esc(x.text)}<small>${esc(x.how)}</small></span></li>`).join("")}</ul></details>
      <details><summary class="hint">Retention money rules after the 2023 amendments</summary><ul class="checklist">${c.retentionRules.map((x) => `<li data-m="check"><code>${esc(x.ref)}</code><span>${esc(x.text)}</span></li>`).join("")}</ul></details>
      <p class="law">${c.law.map((l) => `<a class="link" href="${l.url}" target="_blank" rel="noopener">${esc(l.title)}</a>`).join(" · ")} · legislation.govt.nz</p>
      <p class="sign">${sign}</p><p class="ad-msg">${esc(c.label)} · Simulated: fictional builder, client and contract. Not served on anyone.</p>${hashes ? `<p class="hash">Claim record SHA-256 ${hashes.doc} · receipt ${hashes.receipt}</p>` : ""}</article>`;
  }
  async function draftClaim(o) {
    const s = st.sent; if (!s || st.claimBusy) return; st.claimBusy = true;
    const my = st.run, prev = st.claims.reduce((t, c) => t + c.calc.thisClaim, 0), vars = (s.variations || []).reduce((t, v) => t + v.delta.subtotal, 0);
    const args = { quoteRef: s.bid.ref, contractValue: s.bid.pricing.subtotal, variationsValue: round(vars), claimNo: st.claims.length + 1, periodFrom: o.from, periodTo: o.to, percentComplete: o.pct, previouslyClaimed: round(prev), retentionPct: o.ret, residentialOccupier: o.res, served: o.served, region: store.councilRegion() };
    const c = paymentClaim({ ...args, customer: s.bid.customer, builder: s.bid.builder, project: s.bid.project, now: nowIso() });
    if (c.error) { st.claimBusy = false; renderClaimPanel(`<p class="warn">${esc(c.error)}</p>`); return; }
    desk("working"); status(`Payment claim ${c.claimNo}`, "The agent drafts the claim against the approved quote.");
    const n = work.children.length;
    step(n, { k: "payment_claim", title: `Drafts progress payment claim ${c.claimNo}, and asks a person`, auth: "act with approval", tool: "payment_claim", args, body: `<p class="sum">${esc(c.ref)} · ${nzd(c.calc.claimed)} incl. GST <span class="auth">${esc(LEGAL_TRUTH)}</span></p>` + kv([["work to date", `${c.calc.percentComplete}% · ${nzd(c.calc.valueToDate)}`], ["this claim", nzd(c.calc.thisClaim)], [`retention ${c.calc.retentionPct}%`, nzd(c.calc.retention)], ["GST 15%", nzd(c.calc.gst)], ["due", `${c.dueDate} · ${c.basis.due}`], ["schedule by", c.scheduleBy], ["s 20 checklist", `${c.checklist.filter((x) => x.met === true).length} of ${c.checklist.length} met, 1 to check`]]) + insp("payment_claim", args, c), note: c.retention && c.residentialOccupier ? "Residential occupier: the retention trust rules (s 18B) don't apply to this retention. They do to what you hold on your subbies." : `Waits for ${s.a.approver.name}.` });
    renderClaimPanel(claimDoc(c, s));
    await wait(300); if (my !== st.run) { st.claimBusy = false; return; }
    desk("waiting"); status(`Waiting for ${s.a.approver.name}`, `Payment claim ${c.claimNo} is in the approval queue.`);
    queue.innerHTML = `<article class="q"><header>${badge("act with approval")}<span>${esc(c.ref)} · ${clock(nowIso())}</span></header>
      <h3>Serve payment claim ${c.claimNo} on ${esc(c.customer)}?</h3><p class="hint">${nzd(c.calc.claimed)} incl. GST · ${c.calc.percentComplete}% complete · due ${esc(c.dueDate)} · schedule by ${esc(c.scheduleBy)}</p>
      <ul><li>States it is made under the Construction Contracts Act 2002 (s 20(2)(f))</li><li>Response outline and consequences attached (s 20(3))</li><li>Calculation shown; retention ${c.calc.retentionPct}%</li><li>${esc(LEGAL_TRUTH)}: use the prescribed form for a real claim (s 20(4))</li></ul>
      <div class="row"><button class="btn" type="button" data-cok>Serve the claim</button><button class="btn ghost" type="button" data-cno>Not yet</button></div>
      <p class="note">Deciding as ${esc(s.a.approver.name)}, ${esc(s.a.approver.role)}. Nothing is served or stored: this is a simulation.</p></article>`;
    queue.scrollIntoView({ behavior: reduced.matches ? "auto" : "smooth", block: narrow.matches ? "start" : "nearest" });
    queue.onclick = async (e) => {
      const b = e.target.closest("[data-cok],[data-cno]"); if (!b) return; queue.onclick = null;
      const ok = b.hasAttribute("data-cok"), decided = nowIso(), docHash = await sha256(canon(c));
      const { hash } = await receipt({ kind: "payment-claim", bid: { ref: s.bid.ref, sha256: s.bidHash }, claim: { ref: c.ref, claimNo: c.claimNo, claimedInclGst: c.calc.claimed, retention: c.calc.retention, due: c.dueDate, scheduleBy: c.scheduleBy, sha256: docHash },
        decision: { outcome: ok ? "served" : "held", by: s.a.approver.name, role: s.a.approver.role, authority: "act with approval" }, timestamps: { drafted: c.draftedAt, decided } });
      if (ok) { c.status = "approved"; st.claims.push(c); }
      store.diary(ok ? "Payment claim served" : "Payment claim held", `${c.ref} · ${nzd(c.calc.claimed)} incl. GST · due ${c.dueDate} · by ${s.a.approver.name}`, ok ? "#A7DEC7" : "#F2DC7C");
      queue.innerHTML = `<p class="empty">${ok ? "Served. The claim receipt is chained to the quote's." : "Held. Nothing was served; the decision is on the chain."}</p>`;
      desk("done"); status(`Payment claim ${c.claimNo} ${ok ? "served" : "held"} by ${s.a.approver.name} at ${clock(decided)}`, ok ? `Due ${c.dueDate}. If no payment schedule by ${c.scheduleBy}, the full amount is payable (s 22).` : "Draft kept on the desk only.");
      st.claimBusy = false;
      renderClaimPanel(ok ? claimDoc(c, s, { doc: docHash, receipt: hash }) + `<div class="row"><button class="btn sm" type="button" data-cprint>Print / save as PDF</button></div>` : "");
      const pb = claimPanel.querySelector("[data-cprint]"); if (pb) pb.onclick = () => store.printQuote($("#claimDoc"), { builder: c.builder, ref: c.ref, date: c.served, schema: c.schema, hash: docHash, receipt: hash, tag: `${LEGAL_TRUTH} · Simulated` });
    };
  }

  window.__agentdesk = { run: (i = 0) => run(ASKS[i]), decide, change, raiseVariation, draftClaim, st, ASKS };
}
