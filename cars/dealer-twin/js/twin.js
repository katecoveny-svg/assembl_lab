// The twin: eight departments as live tiles, one panel of key numbers for the chosen department, and the 3D maquette as the stage
// (three.js r128 and the twin's own scene, loaded only when asked for). Everything here reads the one simulated day in core.js.
import { CFG, D, $, $$, esc, fmt, money, pct, chip, sim, onFrame, ambient, loadScript, isVisible, reducedMQ, narrowMQ, pauseBtn, clamp } from "./core.js";

const VIEWS = [
  ["site", "Whole site"], ["machine", "Well-oiled machine"], ["showroom", "Showroom"], ["used", "Used yard and recon"],
  ["workshop", "Workshop"], ["parts", "Parts"], ["marketing", "Marketing and BDC"], ["fi", "F&I"]];
const ONE = {
  site: "Every department's month in one model. Simulated.",
  machine: "Leads, deals, jobs and trade-ins moving between departments, minute by minute.",
  showroom: "Who's on the floor, who's buying, and what the stock costs to hold.",
  used: "Trade-ins appraised, reconditioned, photographed and back on the front line.",
  workshop: "Every hoist and every job, and the health-check video each customer approves from their phone.",
  parts: "A pick for every job. When a part isn't on the shelf, the wait desk takes over.",
  marketing: "Many enquiries arrive when the showroom is closed. Fast answers turn them into appointments.",
  fi: "Finance and insurance, office by office, deal by deal." };
const prov = (p) => { p = p || { t: "sim" }; return p.t === "data" ? ["data", "Your data"] : p.t === "mix" ? ["data", "Your data + benchmark"] : p.t === "bench" ? ["est", "Benchmark"] : p.t === "est" ? ["est", "Estimated"] : ["sim", "Simulated"]; };
const pchip = (p) => { const [t, l] = prov(p); return chip(t, l); };

export function initTwin() {
  const S = sim.S, tiles = $("#tiles"), panel = $("#panel"), stage = $("#stage"), poster = $("#poster");
  let view = "site", tw = null, three = null;
  const C = { ...D.COSTS0 }, MK = { ...D.MKT0 };

  // ---------------------------------------------------------------- clock controls
  const tc = $("#tClock"), sp = $("#simPause");
  $$("[data-speed]").forEach((b) => b.onclick = () => { sim.speed = +b.dataset.speed; $$("[data-speed]").forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false")); });
  pauseBtn(sp, !sim.playing, "the simulated day"); sp.onclick = () => { sim.playing = !sim.playing; pauseBtn(sp, !sim.playing, "the simulated day"); };

  // ---------------------------------------------------------------- tiles
  tiles.innerHTML = VIEWS.map(([k, n]) => `<button class="tile" type="button" data-v="${k}" aria-pressed="${k === view}">${(CFG.tileImg || {})[k] ? `<img class="ti" src="${esc(CFG.tileImg[k])}" alt="" loading="lazy" decoding="async">` : ""}<span class="tn">${esc(n)}<i class="ts" data-ts="${k}"></i></span><svg viewBox="0 0 200 44" preserveAspectRatio="none" aria-hidden="true" data-viz="${k}"></svg><span class="tv"><b data-tv="${k}">–</b><span data-tl="${k}"></span></span></button>`).join("");
  tiles.onclick = (e) => { const b = e.target.closest("[data-v]"); if (b) select(b.dataset.v, true); };
  const tv = (k) => tiles.querySelector(`[data-tv="${k}"]`), tl = (k) => tiles.querySelector(`[data-tl="${k}"]`), vz = (k) => tiles.querySelector(`[data-viz="${k}"]`);
  const ink = "var(--deep)", faint = "var(--line2)", rose = "var(--rose)";

  // live numbers ease from the old value to the new one, and a tile that changes gives a small pulse and states its mood
  const tsel = (k) => tiles.querySelector(`[data-v="${k}"]`);
  function setTv(k, v) {
    const el = tv(k); if (!el) return; const html = String(v), txt = html.replace(/<[^>]+>/g, ""); if (el.dataset.html === html) return;
    const prev = el.dataset.n != null ? +el.dataset.n : null, m = /^(\$?)([\d,]+)(?![\d.]*[km])/.exec(txt), next = m ? +m[2].replace(/,/g, "") : null;
    el.dataset.html = html; if (next != null) el.dataset.n = next;
    const tile = tsel(k); if (tile && prev != null) { tile.classList.remove("bump"); void tile.offsetWidth; tile.classList.add("bump"); }
    if (prev == null || next == null || prev === next || reducedMQ.matches || Math.abs(next - prev) > 5000) { el.innerHTML = html; return; }
    const t0 = performance.now(), d = 650, f = (now) => { const k2 = Math.min(1, (now - t0) / d), e = 1 - Math.pow(1 - k2, 3), cur = Math.round(prev + (next - prev) * e);
      if (el.dataset.html !== html) return; el.innerHTML = html.replace(m[2], cur.toLocaleString("en-NZ")); if (k2 < 1) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  }
  const mood = (k, s) => { const el = tiles.querySelector(`[data-ts="${k}"]`); if (el && el.textContent !== s) { el.textContent = s; el.dataset.s = s; } };
  function tileViz(L) {
    const F = sim.F, g = F.pl.gross, parts = [g.new, g.used, g.fi, g.service, g.parts], tot = parts.reduce((a, b) => a + b, 0) || 1;
    // whole site: the month's gross, department by department, then what's left after costs
    let x = 0; vz("site").innerHTML = parts.map((v) => { const w = v / tot * 150, r = `<rect x="${x.toFixed(1)}" y="${(30 - v / tot * 60).toFixed(1)}" width="${Math.max(1, w - 3).toFixed(1)}" height="${(v / tot * 60 + 6).toFixed(1)}" rx="1.5" fill="${ink}"/>`; x += w; return r; }).join("")
      + `<rect x="160" y="${(36 - clamp(F.pl.net / tot) * 120).toFixed(1)}" width="40" height="${(clamp(F.pl.net / tot) * 120 + 8).toFixed(1)}" rx="1.5" fill="${rose}"/>`;
    setTv("site", money(F.pl.net)); tl("site").textContent = /data|mix/.test((sim.P.net || {}).t || "") ? "net profit, a month · your data" : "net profit, a month";
    setTv("machine", fmt(sim.ev.deals.filter((x) => x.v.end <= L.t).length + L.s.done + L.usedSold)); tl("machine").textContent = "deals, jobs and sales done today";
    const pp = Math.min(24, L.people); vz("showroom").innerHTML = Array.from({ length: 24 }, (_, i) => `<circle cx="${8 + (i % 12) * 16.4}" cy="${i < 12 ? 13 : 31}" r="5.2" fill="${i < pp ? ink : faint}"/>`).join("");
    setTv("showroom", L.people); tl("showroom").textContent = "people on the floors now";
    vz("used").innerHTML = L.reconBays.map((p, i) => `<rect x="0" y="${2 + i * 14}" width="200" height="9" rx="4.5" fill="${faint}"/><rect x="0" y="${2 + i * 14}" width="${(p * 200).toFixed(1)}" height="9" rx="4.5" fill="${ink}"/>`).join("");
    setTv("used", `${L.recon}<small>/3</small>`); tl("used").textContent = `recon bays working · ${L.appr} appraised`;
    const nb = S.bays, cw = 200 / nb; vz("workshop").innerHTML = L.bays.map((on, i) => `<rect x="${(i * cw + 1).toFixed(1)}" y="4" width="${(cw - 2.5).toFixed(1)}" height="36" rx="2" fill="${on ? ink : faint}"/>`).join("");
    setTv("workshop", `${L.s.inShop}<small>/${nb}</small>`); tl("workshop").textContent = `hoists working · ${L.s.queue} waiting`;
    const fill = Math.round(F.partsFill * 20); vz("parts").innerHTML = Array.from({ length: 20 }, (_, i) => `<rect x="${(i % 10) * 20 + 1}" y="${i < 10 ? 3 : 24}" width="17" height="17" rx="2" fill="${i < fill ? ink : "var(--est)"}" opacity="${i < fill ? 1 : .55}"/>`).join("");
    setTv("parts", fmt(L.picks)); tl("parts").textContent = `picks today · ${pct(F.partsFill)} off the shelf`;
    const LH = F.leadHour || D.LEADHOUR, mx = Math.max(...LH), h = Math.floor(L.t / 60);
    vz("marketing").innerHTML = `<rect x="${8.5 / 24 * 200}" y="0" width="${9 / 24 * 200}" height="44" fill="var(--tint)"/>` + LH.map((v, i) => `<rect x="${(i * 200 / 24 + 1).toFixed(1)}" y="${(42 - v / mx * 38).toFixed(1)}" width="${(200 / 24 - 2.4).toFixed(1)}" height="${(v / mx * 38).toFixed(1)}" rx="1" fill="${i === h ? rose : ink}" opacity="${i <= h ? 1 : .3}"/>`).join("");
    setTv("marketing", L.leadsT); tl("marketing").textContent = `leads today · ${L.waitL} waiting`;
    vz("fi").innerHTML = L.offices.map((on, i) => `<rect x="${i * 51 + 1}" y="4" width="47" height="36" rx="3" fill="${on ? ink : faint}"/>`).join("");
    setTv("fi", `${L.inFi}<small>/4</small>`); tl("fi").textContent = `offices in use · ${L.delivered} handed over`;
    const busy = L.s.inShop / nb;
    mood("site", "This month"); mood("machine", sim.playing ? "Running" : "Paused"); mood("showroom", L.people >= 10 ? "Busy" : L.people >= 4 ? "Steady" : "Quiet");
    mood("used", L.recon ? "Reconditioning" : "Waiting"); mood("workshop", busy > .85 ? "Full" : busy > .5 ? "Busy" : "Filling up");
    mood("parts", "Picking"); mood("marketing", L.waitL ? `${L.waitL} to answer` : "All answered"); mood("fi", L.inFi >= 3 ? "Full" : L.inFi ? "In use" : "Free");
  }
  // the well-oiled machine tile: work moving around the loop (ambient; stops with the page's pause)
  const loopDots = 7; let loopT = 0, mvOn = true; isVisible(tiles, (v) => mvOn = v);
  onFrame((dt) => { if (!mvOn) return; if (!ambient.paused) loopT += dt * .12 * (sim.playing ? sim.speed / 12 : 0); const el = vz("machine"); if (!el) return;
    el.innerHTML = `<ellipse cx="100" cy="22" rx="92" ry="16" fill="none" stroke="${faint}" stroke-width="1.5"/>` + Array.from({ length: loopDots }, (_, i) => { const a = (loopT + i / loopDots) * Math.PI * 2; return `<circle cx="${(100 + 92 * Math.cos(a)).toFixed(1)}" cy="${(22 + 16 * Math.sin(a)).toFixed(1)}" r="${i % 3 ? 3.4 : 4.6}" fill="${i % 3 ? ink : rose}"/>`; }).join(""); });

  // ---------------------------------------------------------------- the panel
  const kpi = (k, label, p, extra = "") => `<div class="kpi"><b data-k="${k}">–</b><span>${label}</span>${p ? pchip(p) : ""}${extra}</div>`;
  const lever = (id, label, min, max, step, val, show) => `<div class="lever"><label for="lv-${id}">${label} <b id="lvv-${id}">${show(val)}</b></label><input id="lv-${id}" type="range" min="${min}" max="${max}" step="${step}" value="${val}"></div>`;
  const ev = (title, html) => `<details class="ev"><summary>${title}</summary><div class="evb">${html}</div></details>`;
  const SRC = { deloitte: "Deloitte NZ Dealership Benchmarks 2026 (top 30% of 200+ NZ dealers)" };
  function panelHTML(v) {
    const F = sim.F, P = sim.P, name = VIEWS.find((x) => x[0] === v)[1];
    let k = "", viz = "", more = "";
    if (v === "site") {
      k = kpi("net", "net profit, a month", P.net) + kpi("gross", "gross profit, a month", P.pl) + kpi("abs", "of costs covered by service and parts", P.absorption) + kpi("costs", "fuel at handover, demonstrators and FBT, a year", { t: "est" });
      viz = `<div class="bars" data-wf role="img" aria-label="The month's gross profit by department, then costs, then net profit"></div>`;
      const pl = F.pl, g = pl.gross;
      more = ev("The month, line by line", `<table><thead><tr><th>Line</th><th class="n">A month</th></tr></thead><tbody>${[["New cars gross", g.new], ["Used cars gross", g.used], ["F&I gross", g.fi], ["Service gross", g.service], ["Parts gross", g.parts], ["Gross profit", pl.total], ["Selling costs", -pl.sellExp], ["Overheads", -pl.fixed], ["Net profit", pl.net]].map(([n, x]) => `<tr><td>${n}</td><td class="n">${money(x)}</td></tr>`).join("")}</tbody></table>
        <p>Department ratios, gross per unit, F&I income, service and parts margins and overheads follow ${SRC.deloitte}. Volumes come from the simulated day. Net margin: ${pct(pl.netPct, 1)} of sales (benchmark ${D.BENCH.netPct[0]}–${D.BENCH.netPct[1]}%).</p>`)
        + ev("Running costs: fuel, demonstrators and FBT", `<ul><li>Fuel at handover: full tank for new cars (a charge for EVs), a set $30 for used, at MBIE weekly pump prices.</li><li>${C.demos} demonstrators, ${fmt(C.demoKm)} km a year, ${pct(C.privateDays)} of days available privately.</li>
          <li>FBT on cost price at 20% a year, single rate 63.93% (IRD, from 1 April 2026). A Bill introduced 10 September 2026 would change the rates from 1 April 2027; it is not law.</li><li>Demonstrators are trading stock and not depreciated, so tax book value equals cost here: our reading, to check with a tax adviser. Not tax advice.</li></ul>`);
    } else if (v === "machine") {
      k = kpi("ml", "leads today", { t: "sim" }) + kpi("md", "deals today", { t: "sim" }) + kpi("mj", "workshop jobs today", { t: "sim" }) + kpi("mr", "cars into recon today", { t: "sim" });
      viz = `<div class="bars" data-flows></div>`;
      more = ev("How the day is simulated", `<p>Each minute the model moves leads, showroom visits, deals, F&I, handovers, appraisals, recon and workshop jobs. Lead timing follows a published hour-of-day curve; response odds follow US response-time studies (Estimated). The same day drives the 3D model, the tiles and the hero numbers.</p>`);
    } else if (v === "showroom") {
      const st = D.stock(S);
      k = kpi("sp", "people on the floors now", { t: "sim" }) + kpi("sa", "deals agreed today", { t: "sim" }) + kpi("fpd", "floor plan interest a day", { t: "est" }) + kpi("aged", "new cars over 90 days", { t: "est" });
      viz = `<div class="bars" data-funnel></div>`;
      more = ev("Try a lever: stock and floor plan", `<div class="levers">${lever("stock", "New cars in stock", 100, 900, 10, S.stock, (x) => fmt(x))}${lever("days", "Average days to sell", 20, 120, 1, S.days, (x) => x)}${lever("apr", "Floor plan rate", 3, 10, .05, (S.apr * 100).toFixed(2), (x) => (+x).toFixed(2) + "%")}</div><p>Interest only, on the average transaction price. Rate is a proxy from an ASX-listed dealer's December 2025 report (Estimated).</p>`)
        + ev("How the showroom is counted", `<p>Five anonymous ways to count visitors: door counters, overhead 3D sensors, Wi-Fi presence, camera analytics with no images kept, and salespeople's logged walk-ins. Costs are estimates; all sit under the NZ Privacy Act 2020. Funnel shares (${pct(D.FUNNEL.close)} of visiting groups buy, ${D.FUNNEL.party} people a group, ${pct(D.FUNNEL.logged)} logged, ${pct(D.FUNNEL.td)} test drive) are estimates until door counters are fitted.</p>`)
        + ev(CFG.dealer.marqueWord === "marque" ? "Marques on each floor" : "Ranges on each floor", `<ul>${D.SITES.filter((s) => s.fn.includes("Sales")).map((s) => `<li><b>${esc(s.n)}</b>: ${esc(s.m.join(", "))}</li>`).join("")}</ul>${CFG.dealer.sitesNote || ""}`);
    } else if (v === "used") {
      k = kpi("ua", "trade-ins appraised today", { t: "sim" }) + kpi("ur", "in a recon bay now", { t: "sim" }) + kpi("ud", "days, door to front line", P.reconDays) + kpi("ul", "of appraisals bought", P.lookToBook);
      viz = `<div class="bars" data-pipe></div>`;
      more = ev("Used car assumptions", `<p>Used to new ratio ${fmt(D.BASE.usedRatio, 2)} and used gross per unit follow ${SRC.deloitte}. Recon time (${fmt(F.reconDays, 1)} days) and the appraisal-to-buy rate are estimates until the DMS stock stage is connected.</p>`);
    } else if (v === "workshop") {
      k = kpi("wh", "hoists working", { t: "sim" }) + kpi("wl", "labour sold today", { t: "sim" }) + kpi("whc", "health checks sent today", { t: "sim" }) + kpi("wq", "cars waiting for a bay", { t: "sim" });
      viz = `<div data-hc></div>`;
      more = ev("Try a lever: the workshop", `<div class="levers">${lever("techs", "Technicians", Math.max(6, S.bays - 8), S.bays + 3, 1, S.techs, (x) => x)}${lever("ros", "Jobs booked a day", Math.round(S.ros * .6), Math.round(S.ros * 1.4), 1, S.ros, (x) => x)}${lever("hc", "Jobs with a video health check", 0, 1, .05, S.hc, (x) => pct(+x))}</div><p>${S.bays} hoists, $${S.rate} an hour labour rate (Estimated). Approved health-check work adds labour (Estimated).</p>`)
        + ev("How health checks work", `<p>The technician films each item on the hoist and marks it urgent, recommended or fine. The customer gets a link, watches it and approves items from their phone; approved work goes on the repair order. Item prices, acceptance and timing are estimates. No customer names, plates or VINs anywhere. ${CFG.dealer.hcNote || ""}</p>`);
    } else if (v === "parts") {
      k = kpi("pp", "picks today", { t: "sim" }) + kpi("pf", "of lines off the shelf first time", P.partsFill) + kpi("pg", "parts gross, a month", P.partsGross) + kpi("pt", "stock turns a year", P.partsTurn);
      viz = `<a class="btn ghost" href="#parts">See the parts wait desk</a>`;
      more = ev("Parts assumptions", `<p>Parts margin ${pct(D.BENCH.partsGp[0])}–${pct(D.BENCH.partsGp[1])} and turns ${D.BENCH.partsTurns[0]}–${D.BENCH.partsTurns[1]} a year are ${SRC.deloitte} ranges. First-time fill and obsolete stock are estimates until a parts export is connected.</p>`);
    } else if (v === "marketing") {
      const Lh = D.leads(S);
      k = kpi("ml2", "leads today", { t: "sim" }) + kpi("mf", "answered within five minutes", { t: "sim" }) + kpi("ma", "appointments a day", { t: "est" }) + kpi("mah", "of leads arrive after hours", P.afterHours);
      viz = `<svg class="viz" viewBox="0 0 320 96" data-hours role="img" aria-label="Enquiries by hour of day, with showroom hours shaded"></svg>`;
      more = ev("Try a lever: a remote team, 7am to 10pm", `<div class="levers">${lever("bdc", "People answering", 0, 3, 1, S.bdc, (x) => +x ? x : "none")}</div><p>With someone answering within about three minutes from 7am to 10pm, more enquiries become appointments (response odds after published US studies, Estimate; appointment to sale 40%).</p>`)
        + ev("Spend and leads by channel", `<table><thead><tr><th>Channel</th><th class="n">Spend a month</th><th class="n">Leads</th><th class="n">Cost a lead</th></tr></thead><tbody>${F.byCh.filter((c) => c.spend || c.leads).map((c) => `<tr><td>${esc(c.n)}</td><td class="n">${money(c.spend)}</td><td class="n">${fmt(c.leads)}</td><td class="n">${c.cpl ? "$" + fmt(c.cpl) : "–"}</td></tr>`).join("")}</tbody></table><p>Channel shares of spend and leads are estimates until a spend export and AutoPlay leads are connected.</p>`);
    } else if (v === "fi") {
      k = kpi("fn", "customers with a business manager", { t: "sim" }) + kpi("fd", "handed over today", { t: "sim" }) + kpi("fp", "of deals financed", P.fiPen) + kpi("fg", "F&I gross, a month", P.fiGross);
      viz = `<svg class="viz" viewBox="0 0 320 70" data-offices role="img" aria-label="Four F&I offices"></svg>`;
      more = ev("F&I benchmarks", `<p>Finance penetration ${pct(D.BENCH.finPenNew[0])}–${pct(D.BENCH.finPenNew[1])} new and ${pct(D.BENCH.finPenUsed[0])}–${pct(D.BENCH.finPenUsed[1])} used, and income per unit, follow ${SRC.deloitte}. Products per deal (${fmt(F.fiPpd, 1)}) is an estimate.</p>`);
    }
    return `<div style="display:grid;gap:10px"><h3>${esc(name)}</h3><p class="one">${esc(ONE[v])}</p></div><div class="kpis">${k}</div>${viz}<div>${more}</div>`;
  }
  function bindLevers() {
    const on = (id, fn, show) => { const el = $("#lv-" + id); if (!el) return; el.oninput = () => { $("#lvv-" + id).textContent = show(el.value); fn(+el.value); }; };
    const rerunDay = () => { const t = sim.d.t; sim.newDay(); while (sim.d.t < t) D.step(S, sim.d); };
    on("stock", (x) => { S.stock = x; sim.recompute(); }, (x) => fmt(+x)); on("days", (x) => { S.days = x; sim.recompute(); }, (x) => x); on("apr", (x) => { S.apr = x / 100; sim.recompute(); }, (x) => (+x).toFixed(2) + "%");
    on("techs", (x) => { S.techs = x; sim.recompute(); rerunDay(); }, (x) => x); on("ros", (x) => { S.ros = x; sim.recompute(); rerunDay(); }, (x) => x); on("hc", (x) => { S.hc = x; sim.recompute(); }, (x) => pct(+x));
    on("bdc", (x) => { S.bdc = x; sim.recompute(); }, (x) => +x ? x : "none");
  }
  const set = (k, html) => { const el = panel.querySelector(`[data-k="${k}"]`); if (el && el.innerHTML !== html) el.innerHTML = html; };
  function panelLive(L) {
    const F = sim.F, v = view;
    if (v === "site") { set("net", money(F.pl.net)); set("gross", money(F.pl.total)); set("abs", pct(F.pl.absorption)); set("costs", money(D.costs(S, F, C).total));
      const w = panel.querySelector("[data-wf]"); if (w) { const pl = F.pl, g = pl.gross, top = pl.total, X = (x) => (clamp(x / top) * 100).toFixed(2) + "%"; let run = 0;
        const row = (n, l, wd, val, cls = "", c = "var(--deep)") => `<div class="b ${cls}"><span>${n}</span><span class="t wf"><i style="left:${l};width:${wd};background:${c}"></i></span><b>${val}</b></div>`;
        w.innerHTML = [["New cars", g.new], ["Used cars", g.used], ["F&amp;I", g.fi], ["Service", g.service], ["Parts", g.parts]].map(([n, x]) => { const r = row(n, X(run), X(x), money(x), "", "var(--ink)"); run += x; return r; }).join("")
          + row("Gross", "0%", "100%", money(pl.total), "tot") + row("Costs", X(Math.max(0, pl.net)), X(pl.sellExp + pl.fixed), "−" + money(pl.sellExp + pl.fixed), "", "var(--rose)") + row("Net profit", "0%", X(Math.max(0, pl.net)), money(pl.net), "tot"); } }
    else if (v === "machine") { set("ml", fmt(sim.ev.leads.length)); set("md", fmt(sim.ev.deals.length)); set("mj", fmt(sim.d.jobs.length)); set("mr", fmt(sim.ev.recon.length));
      const el = panel.querySelector("[data-flows]"); if (el) { const e = sim.ev, appts = e.leads.filter((l) => l.appt).length, hc = sim.hcToday(), rows = [["Leads", e.leads.filter((l) => l.t <= L.t).length, e.leads.length], ["Appointments", e.leads.filter((l) => l.appt && l.t <= L.t).length, e.leads.length], ["Deals", L.agreed, e.leads.length], ["Handovers", L.delivered, e.leads.length], ["Workshop jobs", L.s.done + L.s.inShop, sim.d.jobs.length], ["Health checks", hc.length, sim.d.jobs.length], ["Approved", hc.filter((x) => x.stage === "authorised").length, sim.d.jobs.length]];
        el.innerHTML = rows.map(([n, x, of]) => `<div class="b"><span>${n}</span><span class="t"><i style="width:${(clamp(x / Math.max(1, of)) * 100).toFixed(1)}%"></i></span><b>${fmt(x)}</b></div>`).join(""); } }
    else if (v === "showroom") { const st = D.stock(S); set("sp", L.people); set("sa", L.agreed); set("fpd", money(st.perDay)); set("aged", fmt(st.agedUnits));
      const el = panel.querySelector("[data-funnel]"); if (el && !el.dataset.done) { el.dataset.done = 1; const rows = [["Visiting groups", F.ffGroups], ["Logged by sales", F.ffLogged], ["Test drives", F.ffTd], ["Deals", F.ffDeals]];
        el.innerHTML = `<span class="label">A month on the floors</span>` + rows.map(([n, x]) => `<div class="b"><span>${n}</span><span class="t"><i style="width:${(x / rows[0][1] * 100).toFixed(1)}%"></i></span><b>${fmt(x)}</b></div>`).join(""); } }
    else if (v === "used") { set("ua", L.appr); set("ur", `${L.recon}<small>/3</small>`); set("ud", fmt(F.reconDays, 1)); set("ul", pct(F.lookToBook));
      const el = panel.querySelector("[data-pipe]"); if (el) { const e = sim.ev, rows = [["Appraised", L.appr, e.appraisals.length], ["Bought", e.appraisals.filter((a) => a.buy && a.end <= L.t).length, e.appraisals.length], ["Through recon", e.recon.filter((r) => r.t1 <= L.t).length, e.appraisals.length], ["Sold off the line", L.usedSold, e.appraisals.length]];
        el.innerHTML = `<span class="label">Today</span>` + rows.map(([n, x, of]) => `<div class="b"><span>${n}</span><span class="t"><i style="width:${(clamp(x / Math.max(1, of)) * 100).toFixed(1)}%"></i></span><b>${fmt(x)}</b></div>`).join(""); } }
    else if (v === "workshop") { const hc = sim.hcToday(); set("wh", `${L.s.inShop}<small>/${S.bays}</small>`); set("wl", money(L.s.labour)); set("whc", fmt(hc.filter((x) => x.stage !== "filming").length)); set("wq", L.s.queue);
      const el = panel.querySelector("[data-hc]"); if (el) { const st = { filming: 0, sent: 0, viewed: 0, authorised: 0, declined: 0, all_ok: 0 }; hc.forEach((x) => st[x.stage] = (st[x.stage] || 0) + 1); const tot = Math.max(1, hc.length);
        const cols = [["filming", "Filming", "var(--rose)"], ["sent", "Sent", "#C9AEB5"], ["viewed", "Viewed", "var(--ink)"], ["authorised", "Approved", "var(--src)"], ["declined", "Declined", "var(--est)"], ["all_ok", "All fine", "var(--line2)"]];
        el.innerHTML = `<span class="label">Today's health checks, by where they are</span><div class="split" style="margin-top:10px;height:14px">${cols.map(([k, , c]) => st[k] ? `<i style="flex:${st[k]};background:${c}"></i>` : "").join("")}</div><div class="legend">${cols.filter(([k]) => st[k]).map(([k, n, c]) => `<span><i style="background:${c}"></i>${n} ${st[k]}</span>`).join("")}</div>`; } }
    else if (v === "parts") { set("pp", fmt(L.picks)); set("pf", pct(F.partsFill)); set("pg", money(F.partsGross)); set("pt", fmt(F.partsTurn, 1)); }
    else if (v === "marketing") { const Lh = D.leads(S); set("ml2", L.leadsT); set("mf", L.leadsT ? pct(L.fast / L.leadsT) : "–"); set("ma", fmt(Lh.appts, 1)); set("mah", pct(F.afterHours));
      const el = panel.querySelector("[data-hours]"); if (el) { const LH = F.leadHour || D.LEADHOUR, mx = Math.max(...LH), h = Math.floor(L.t / 60), bw = 300 / 24;
        el.innerHTML = `<rect x="${10 + 8.5 * bw}" y="0" width="${9 * bw}" height="78" fill="var(--tint)"/><text x="${10 + 8.5 * bw + 4}" y="12">showroom open</text>` + LH.map((v2, i) => `<rect x="${(10 + i * bw + 1).toFixed(1)}" y="${(78 - v2 / mx * 60).toFixed(1)}" width="${(bw - 2.5).toFixed(1)}" height="${(v2 / mx * 60).toFixed(1)}" rx="1.5" fill="${i === h ? "var(--rose)" : "var(--deep)"}" opacity="${i <= h ? 1 : .32}"/>`).join("") + `<text x="10" y="92">midnight</text><text x="${10 + 12 * bw}" y="92" text-anchor="middle">noon</text><text x="310" y="92" text-anchor="end">11pm</text>`; } }
    else if (v === "fi") { set("fn", `${L.inFi}<small>/4</small>`); set("fd", L.delivered); set("fp", pct(F.fiPen)); set("fg", money(F.fiGross));
      const el = panel.querySelector("[data-offices]"); if (el) el.innerHTML = L.offices.map((on, i) => `<rect x="${i * 80 + 2}" y="6" width="74" height="46" rx="4" fill="${on ? "var(--deep)" : "var(--line2)"}"/><text x="${i * 80 + 39}" y="66" text-anchor="middle">office ${i + 1}</text>`).join(""); }
  }
  function select(v, user) {
    view = v; $$("[data-v]", tiles).forEach((b) => b.setAttribute("aria-pressed", b.dataset.v === v ? "true" : "false"));
    panel.innerHTML = panelHTML(v); bindLevers(); panelLive(sim.live());
    if (tw) tw.setView(v); else if (CFG.posters && CFG.posters[v]) { poster.src = CFG.posters[v]; }
    // the stage and panel sit under the tiles: bring them into view when they're off screen
    if (user) { const r = $("#stagewrap").getBoundingClientRect(); if (r.top > innerHeight * .55 || r.bottom < 80) $("#stagewrap").scrollIntoView({ behavior: reducedMQ.matches ? "auto" : "smooth", block: "start" }); }
  }
  const tick = (L) => { tc.textContent = `${sim.dayName()} ${sim.clock()}`; tileViz(L); panelLive(L); };
  sim.on(tick); tick(sim.live());
  sim.onData(() => { select(view); });
  select("site");

  // ---------------------------------------------------------------- the live 3D stage (three r128 + the twin's own maquette scene)
  const go = $("#go3d");
  async function start3d() {
    if (three) return three; go.disabled = true; go.innerHTML = `Loading the 3D model…`;
    three = (async () => {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js");
      await Promise.all(["https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js", "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/environments/RoomEnvironment.js"].map(loadScript));
      await loadScript("engine/cars.js?v=" + CFG.v); await loadScript("engine/scene.js?v=" + CFG.v);
      const cv = document.createElement("canvas"); cv.className = "gl"; cv.setAttribute("aria-label", "Live 3D model of the dealership: drag to orbit, scroll or pinch to zoom");
      const tags = document.createElement("div"); stage.prepend(tags); stage.prepend(cv); stage.classList.add("live");
      window.__minH = narrowMQ.matches ? 360 : 440;
      tw = window.createTwinScene({ canvas: cv, box: stage, tags, lite: narrowMQ.matches });
      const site = D.SITES.find((s) => s.fn.includes("Sales") && s.k === S.site) || D.SITES.find((s) => s.fn.includes("Sales"));
      tw.useCarModels({}, () => {}); tw.resize(); tw.applyTheme(false); tw.setSite(site, sim.F); tw.setView(view, true); var siteRef = site;
      addEventListener("resize", () => tw.resize());
      let vis = true, slow = 0; isVisible(stage, (v) => vis = v);
      let pt = 9, text = null;
      onFrame((dt) => { if (!vis) return; pt += dt; if (pt > .3) { pt = 0; text = tagText(); tw.drawBoard({ d: sim.d, ev: sim.ev, S }); }
        const t0 = performance.now(); tw.frame({ d: sim.d, ev: sim.ev, S, F: sim.F, flowRates: flowRates() }, dt, sim.realT, text);
        if (!/[?&]hq\b/.test(location.search) && performance.now() - t0 > 60) { if (++slow > 20 && tw.dpr > .6) { tw.setDpr(Math.max(.6, tw.dpr * .75)); slow = 0; } } else slow = Math.max(0, slow - 1); });
      poster.style.opacity = "0"; setTimeout(() => poster.remove(), 500); go.remove(); window.__twin = { tw, select };
      if (CFG.sitesUrl) sitePicker(siteRef);
      return tw;
    })().catch((e) => { go.disabled = false; go.textContent = "The 3D model couldn't load here. Try again"; three = null; console.warn(e); });
    return three;
  }
  go.onclick = start3d;
  // private build: the 3D model can stand on a real site's footprints (LINZ outlines, parcels and roads; which building does what is an Estimate)
  async function sitePicker(salesSite) {
    let pack; try { pack = await (await fetch(CFG.sitesUrl)).json(); } catch (e) { return; }
    const real = D.SITES.filter((s) => pack.sites[s.k] && pack.sites[s.k].place && pack.places[pack.sites[s.k].place]);
    const box = document.createElement("div"); box.className = "sitepick";
    box.innerHTML = `<label class="sr" for="sitePick">Site</label><select id="sitePick"><option value="generic">Generic campus, every department</option>${real.map((s) => `<option value="${esc(s.k)}">${esc(s.n)}, real footprints</option>`).join("")}</select><span class="chip solid" id="siteTruth" hidden>Footprints · LINZ · CC BY</span>`;
    stage.appendChild(box);
    const cap = document.createElement("p"); cap.className = "fine"; cap.id = "siteCap"; cap.hidden = true; cap.style.marginTop = "8px";
    cap.textContent = (pack.attribution || []).join(" ") + " Which building does what, heights and interiors are estimates.";
    stage.after(cap);
    box.querySelector("select").onchange = (e) => { const k = e.target.value, s = D.SITES.find((x) => x.k === k), info = pack.sites[k];
      if (!s || !info) { tw.setLayout("generic"); tw.setSite(salesSite, sim.F); }
      else { const roles = Object.fromEntries(Object.entries(info.roles || {}).map(([id, r]) => [id, { role: r.role, why: r.why, truth: "Estimated" }]));
        if (s.fn.includes("Sales")) tw.setSite(s, sim.F); tw.setLayout(k, pack.places[info.place], roles, { fnCode: info.fnCode, elsewhere: info.elsewhere }); }
      tw.setView(view, true); const on = !!(s && info); $("#siteTruth").hidden = !on; cap.hidden = !on; };
  }
  // on a big screen the model starts when it scrolls into view; on a phone it waits to be asked
  if (!narrowMQ.matches && !reducedMQ.matches && (navigator.hardwareConcurrency || 4) >= 4) { const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); start3d(); } }, { rootMargin: "200px" }); io.observe(stage); }
  function flowRates() { const e = sim.ev, d = sim.d, n = (x) => x / 4; return { leads: n(e.leads.length), appts: n(e.leads.filter((l) => l.appt).length * 3), deals: n(e.deals.length), hand: n(e.deals.length), out: n(e.deals.length), trade: n(e.appraisals.length), recon: n(e.recon.length), photo: n(e.recon.length), yard: n(e.recon.length), usedsale: n(e.usedSales.length), ros: n(d.jobs.length / 2), bays: n(d.jobs.length / 2), parts: n(d.jobs.length / 2), equity: 1.5, hc: n(d.jobs.length * S.hc / 2) }; }
  function tagText() { const L = sim.live(), s = L.s, hc = sim.hcToday();
    return { showroom: `<b>Showroom</b><br><span class="m">${L.inRoom} groups in</span>`, fi: `<b>F&amp;I</b> ${L.inFi}/4`, deliv: `<b>Delivery bay</b><br><span class="m">${L.delivered} handed over</span>`,
      mkt: `<b>Marketing and BDC</b><br><span class="m">${L.leadsT} leads · ${L.waitL} waiting</span>`, work: `<b>Workshop</b> ${s.inShop}/${S.bays}`, fore: `<b>Forecourt</b> ${s.queue}<br><span class="m">waiting for a bay</span>`,
      parts: `<b>Parts</b><br><span class="m">${L.picks} picks today</span>`, apr: `<b>Appraisal</b><br><span class="m">${L.appr} today</span>`, recon: `<b>Recon</b> ${L.recon}/3`, photo: `<b>Photo booth</b>`, yard: `<b>Used front line</b><br><span class="m">${L.usedSold} sold today</span>`,
      hc: `<b>Health checks</b> ${hc.filter((x) => x.stage !== "filming").length} sent`, flow: {} }; }
}
