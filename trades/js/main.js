// assembl lab · trades twin. Wires the desk: sheets, the scale a person confirms, the measuring tools, the takeoff list, the
// checks (consent, Building Code, defects), the quote maths and totals, the site diary, the agent desk and the agent-ready
// panel. State lives in this tab only; nothing is stored or sent.
import { PLANS, CONDITIONS, TRADES, GST, TOOLS, nominalMmPerPt, quantity, condition, price, quote, codeChecks, consentCheck, defectRegister, round, toPt, TRADE_RATES, WASTE_PCT, H1_SCHEDULE, H1_ZONES, DEFAULT_QUOTE, DEFECTS } from "./takeoff-core.js";
import { createViewer } from "./viewer.js";
import { initAgentDesk } from "./desk.js";

export const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
export const nzd = (v) => "$" + Number(v || 0).toLocaleString("en-NZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const nzd0 = (v) => "$" + Math.round(Number(v || 0)).toLocaleString("en-NZ");
const fmtQ = (q, unit) => unit === "EA" ? `${q} EA` : `${round(q, 2).toLocaleString("en-NZ")} ${unit}`;
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const clock = (iso) => new Date(iso).toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit" });

// ---------------------------------------------------------------- state
const S = {
  sheetKey: "A101", sheet: PLANS.sheets[0], uploads: {}, scales: {}, tool: "pan", cond: "carpet", draft: [], scalePts: [],
  measurements: [], rates: Object.fromEntries(CONDITIONS.map((c) => [c.id, { material: c.material, labour: c.labour }])), markup: DEFAULT_QUOTE.marginPct, pgPct: DEFAULT_QUOTE.pgPct,
  tradeRates: { ...TRADE_RATES }, waste: { ...WASTE_PCT }, ps: new Set(), zone: 1, diary: [], seq: 0, hl: null, fresh: null,
};
const listeners = new Set();
const emit = () => listeners.forEach((f) => f());
const scaleOf = (key = S.sheetKey) => S.scales[key] || null;
const sheetMeasurements = () => S.measurements.filter((m) => m.sheet === S.sheetKey);

const viewer = createViewer({ viewer: $("#viewer"), stage: $("#stage"), canvas: $("#pdfCanvas"), overlay: $("#overlay"), msg: $("#viewerMsg"), onTap: tap, onFinish: finish, onCursor: cursor, onView: () => {} });

// ---------------------------------------------------------------- sheets
async function openSheet(key) {
  S.sheetKey = key; S.sheet = PLANS.sheets.find((s) => s.id === key) || null; S.draft = []; S.scalePts = []; S.hl = null; $("#scaleForm").hidden = true;
  $$("#sheets button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.key === key)));
  const up = S.uploads[key];
  $("#planTitle").textContent = S.sheet ? `${S.sheet.id} · ${S.sheet.title}` : up ? up.name : "Sheet";
  $("#planSub").textContent = S.sheet ? `${S.sheet.subtitle} · nominal 1:${S.sheet.scale} at ${S.sheet.paper}` : "your PDF, page 1";
  $("#scaleNominal").hidden = !S.sheet;
  try { const r = await viewer.load(S.sheet ? S.sheet.file : up.data.slice(0), S.sheet ? S.sheet.id : up.name); $("#planSub").textContent += ` · ${Math.round(r.W)}×${Math.round(r.H)} pt${r.pages > 1 ? ` · page 1 of ${r.pages}` : ""}`; }
  catch (e) { /* the viewer already says so */ }
  emit();
}
function renderSheets() {
  const keys = [...PLANS.sheets.map((s) => ({ key: s.id, label: `${s.id} ${s.title}` })), ...Object.values(S.uploads).map((u) => ({ key: u.key, label: u.name }))];
  $("#sheets").innerHTML = keys.map((k) => `<button type="button" data-key="${esc(k.key)}" aria-pressed="${String(k.key === S.sheetKey)}">${esc(k.label)}</button>`).join("");
}
$("#sheets").addEventListener("click", (e) => { const b = e.target.closest("[data-key]"); if (b && b.dataset.key !== S.sheetKey) openSheet(b.dataset.key); });
$("#upload").addEventListener("change", async (e) => {
  const f = e.target.files[0]; if (!f) return;
  if (f.size > 40e6) { viewer.say("That PDF is over 40 MB; try a smaller one."); return; }
  const key = "upload-" + (Object.keys(S.uploads).length + 1);
  S.uploads[key] = { key, name: f.name.replace(/\.pdf$/i, "").slice(0, 40), data: await f.arrayBuffer() };
  renderSheets(); openSheet(key); e.target.value = "";
});

// ---------------------------------------------------------------- scale: two points and a real distance, confirmed by a person
function setScale(mmPerPt, source) { S.scales[S.sheetKey] = { mmPerPt, confirmed: true, source, at: new Date().toISOString() }; S.scalePts = []; $("#scaleForm").hidden = true; setTool("pan"); diary("Scale confirmed", `${S.sheetKey} · ${round(mmPerPt, 3)} mm per point · ${source}`, "#F2DC7C"); emit(); }
function renderScale() {
  const sc = scaleOf(), el = $("#scaleStatus");
  if (sc) { el.dataset.ok = "1"; el.innerHTML = `<b>Confirmed</b><span>${round(sc.mmPerPt, 3)} mm per point · ${esc(sc.source)}</span>`; }
  else { delete el.dataset.ok; el.innerHTML = `<b>Not confirmed</b><span>${S.sheet ? `The title block says 1:${S.sheet.scale}, which is ${round(nominalMmPerPt(S.sheet), 3)} mm per point. A person confirms before measurements count.` : "Pick two points a known distance apart."}</span>`; }
  $("#scalePick").setAttribute("aria-pressed", String(S.tool === "scale"));
}
$("#scalePick").addEventListener("click", () => { setTool(S.tool === "scale" ? "pan" : "scale"); S.scalePts = []; $("#scaleForm").hidden = true; draw(); });
$("#scaleNominal").addEventListener("click", () => S.sheet && setScale(nominalMmPerPt(S.sheet), `title block, 1:${S.sheet.scale}`));
$("#scaleCancel").addEventListener("click", () => { S.scalePts = []; $("#scaleForm").hidden = true; setTool("pan"); draw(); });
$("#scaleForm").addEventListener("submit", (e) => {
  e.preventDefault(); const v = parseFloat($("#scaleValue").value), unit = $("#scaleUnit").value; if (!(v > 0) || S.scalePts.length < 2) return;
  const mm = unit === "m" ? v * 1000 : v, d = Math.hypot(S.scalePts[1][0] - S.scalePts[0][0], S.scalePts[1][1] - S.scalePts[0][1]); if (d < 1) return;
  setScale(mm / d, `two points, ${v} ${unit}`);
});
$("#scaleValue").addEventListener("input", previewScale); $("#scaleUnit").addEventListener("change", previewScale);
function previewScale() { const v = parseFloat($("#scaleValue").value), unit = $("#scaleUnit").value, p = $("#scalePreview"); if (!(v > 0) || S.scalePts.length < 2) { p.textContent = ""; return; } const d = Math.hypot(S.scalePts[1][0] - S.scalePts[0][0], S.scalePts[1][1] - S.scalePts[0][1]); const mmPerPt = (unit === "m" ? v * 1000 : v) / d; p.textContent = `${round(d, 1)} pt on the page → ${round(mmPerPt, 3)} mm per point · about 1:${Math.round(mmPerPt / 0.3528)}`; }

// ---------------------------------------------------------------- tools and drafting
function setTool(t) {
  S.tool = t; viewer.setTool(t); $$("#toolSeg button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tool === t)));
  if (t !== "scale") S.scalePts = [];
  if (t !== "pan" && t !== "scale") { const c = condition(S.cond); if (!c || c.measure !== t) { const first = CONDITIONS.find((x) => x.measure === t); if (first) S.cond = first.id; } }
  renderConds(); renderScale(); $("#toolHint").textContent = { pan: "Drag to pan, scroll or pinch to zoom. Pick a tool to measure.", scale: "Tap two points a known distance apart (a dimension line is ideal), then enter the real distance.", count: "Tap each item. Finish saves the count as one line.", length: "Tap along the run. Finish saves the length.", area: "Tap the corners. Finish closes the shape." }[t];
  draw();
}
$("#toolSeg").addEventListener("click", (e) => { const b = e.target.closest("[data-tool]"); if (b) { S.draft = []; setTool(b.dataset.tool); } });
$("#cond").addEventListener("change", (e) => { S.cond = e.target.value; const c = condition(S.cond); if (c && S.tool !== "pan" && S.tool !== "scale" && c.measure !== S.tool) { S.draft = []; setTool(c.measure); } draw(); });
function renderConds() {
  const kind = S.tool === "pan" || S.tool === "scale" ? null : S.tool;
  const list = CONDITIONS.filter((c) => !kind || c.measure === kind);
  $("#cond").innerHTML = TRADES.map((t) => { const cs = list.filter((c) => c.trade === t); return cs.length ? `<optgroup label="${t}">${cs.map((c) => `<option value="${c.id}" ${c.id === S.cond ? "selected" : ""}>${esc(c.name)} · ${c.unit}</option>`).join("")}</optgroup>` : ""; }).join("");
  if (!list.find((c) => c.id === S.cond) && list[0]) { S.cond = list[0].id; $("#cond").value = S.cond; }
}
function tap(p) {
  if (S.tool === "scale") { S.scalePts.push(p); if (S.scalePts.length > 2) S.scalePts = [p]; if (S.scalePts.length === 2) { $("#scaleForm").hidden = false; $("#scaleValue").focus(); previewScale(); } draw(); return; }
  if (!scaleOf()) { viewer.say("Confirm the scale first (left: Scale)."); setTimeout(() => viewer.say(null), 1800); $("#scaleCard").scrollIntoView({ behavior: reduced.matches ? "auto" : "smooth", block: "nearest" }); return; }
  S.draft.push(p); draw();
}
function finish() {
  const k = S.tool, need = k === "count" ? 1 : k === "length" ? 2 : 3;
  if (k === "pan" || k === "scale" || S.draft.length < need) return;
  addMeasurement({ kind: k, conditionId: S.cond, pts: S.draft.slice(), by: "person" }); S.draft = []; draw();
}
function undo() {
  if (S.scalePts.length) { S.scalePts.pop(); $("#scaleForm").hidden = true; draw(); return; }
  if (S.draft.length) { S.draft.pop(); draw(); return; }
  const mine = sheetMeasurements(); if (!mine.length) return;
  const last = mine[mine.length - 1]; S.measurements = S.measurements.filter((m) => m !== last); emit();
}
function addMeasurement(m) { const sc = scaleOf(); const c = condition(m.conditionId); const qty = round(quantity(m.kind, m.pts, sc.mmPerPt), 3); const rec = { id: "m" + (++S.seq), sheet: S.sheetKey, qty, unit: m.kind === "count" ? "EA" : m.kind === "length" ? "m" : "m²", priced: round(qty * ((c && c.factor) || 1), 2), ...m }; S.measurements.push(rec); S.fresh = rec.id; emit(); setTimeout(() => { if (S.fresh === rec.id) S.fresh = null; }, 700); return rec; }
$("#finish").onclick = $("#finish2").onclick = finish; $("#undo").onclick = $("#undo2").onclick = undo;
$("#clearSheet").onclick = () => { S.measurements = S.measurements.filter((m) => m.sheet !== S.sheetKey); S.draft = []; emit(); };
document.addEventListener("keydown", (e) => { if (e.target.matches("input,select,textarea")) return; if (e.key === "Escape") { S.draft = []; S.scalePts = []; $("#scaleForm").hidden = true; draw(); } else if ((e.key === "z" || e.key === "Z") && (e.metaKey || e.ctrlKey)) { e.preventDefault(); undo(); } });

function draw() {
  const items = [];
  for (const m of sheetMeasurements()) { const c = condition(m.conditionId); items.push({ kind: m.kind, pts: m.pts, colour: c ? c.colour : "#A9C9F2", label: `${m.name || (c ? c.name.split(" ").slice(0, 2).join(" ") : "")} · ${fmtQ(m.qty, m.unit)}`, hl: S.hl === m.id, fresh: S.fresh === m.id }); }
  if (S.draft.length) { const c = condition(S.cond), sc = scaleOf(); const q = sc ? quantity(S.tool, S.draft, sc.mmPerPt) : 0; items.push({ kind: S.tool, pts: S.draft, colour: c ? c.colour : "#A9C9F2", draft: true, label: S.draft.length >= (S.tool === "area" ? 3 : S.tool === "length" ? 2 : 1) ? fmtQ(round(q, 2), S.tool === "count" ? "EA" : S.tool === "length" ? "m" : "m²") : "" }); }
  if (S.scalePts.length) items.push({ kind: "scale", pts: S.scalePts, colour: "#240B21", label: S.scalePts.length === 2 ? "scale line" : "" });
  viewer.setItems(items);
  const bar = $("#draftBar"), n = S.draft.length; bar.hidden = !n; if (n) $("#draftInfo").textContent = `${condition(S.cond)?.name || ""} · ${n} point${n === 1 ? "" : "s"}`;
  $("#finish").disabled = !(S.draft.length >= (S.tool === "area" ? 3 : S.tool === "length" ? 2 : 1)) || S.tool === "pan" || S.tool === "scale";
}
function cursor([x, y]) { const sc = scaleOf(); $("#cursorInfo").textContent = sc ? `${Math.round(x * sc.mmPerPt)}, ${Math.round(y * sc.mmPerPt)} mm` : `${Math.round(x)}, ${Math.round(y)} pt`; }

// ---------------------------------------------------------------- takeoff list, rates, quote maths
function renderTakeoff() {
  const mine = sheetMeasurements(); $("#takeoffCount").textContent = mine.length;
  $("#takeoff").innerHTML = mine.length ? mine.map((m) => { const c = condition(m.conditionId); return `<li data-id="${m.id}" style="--c:${c ? c.colour : "#ccc"}" class="${S.hl === m.id ? "hl" : ""} ${S.fresh === m.id ? "fresh" : ""}"><i></i><span class="n">${esc(m.name || c?.name || m.conditionId)}<small>${esc(c?.trade || "")} · by ${m.by === "agent" ? "the agent" : "you"}${c && c.factor ? ` · ${fmtQ(m.priced, c.unit)}` : ""}</small></span><span class="qty">${fmtQ(m.qty, m.unit)}</span><button class="x" type="button" data-del="${m.id}" aria-label="Remove">×</button></li>`; }).join("") : `<li class="empty">Nothing measured yet on this sheet.</li>`;
}
$("#takeoff").addEventListener("click", (e) => { const d = e.target.closest("[data-del]"); if (d) { S.measurements = S.measurements.filter((m) => m.id !== d.dataset.del); emit(); return; } const li = e.target.closest("[data-id]"); if (li) { S.hl = S.hl === li.dataset.id ? null : li.dataset.id; const m = S.measurements.find((x) => x.id === li.dataset.id); if (m && S.hl) viewer.focusOn(m.pts); emit(); } });
function renderRates() {
  const used = new Set(S.measurements.map((m) => m.conditionId));
  $("#ratesTable tbody").innerHTML = CONDITIONS.map((c) => `<tr class="${used.has(c.id) ? "used" : ""}"><td>${esc(c.trade)}</td><td>${esc(c.name)}${c.factor ? `<small>drawn as ${c.measure} × ${c.factor} (${esc(c.factorNote)})</small>` : ""}</td><td>${c.unit}</td><td><input type="number" min="0" step="0.5" inputmode="decimal" data-rate="${c.id}" data-k="material" value="${S.rates[c.id].material}" aria-label="${esc(c.name)} material per ${c.unit}"></td><td><input type="number" min="0" step="0.5" inputmode="decimal" data-rate="${c.id}" data-k="labour" value="${S.rates[c.id].labour}" aria-label="${esc(c.name)} labour per ${c.unit}"></td></tr>`).join("");
  $("#tradeTable tbody").innerHTML = TRADES.map((t) => `<tr data-trade="${t}"><td>${t}</td><td><input type="number" min="0" step="1" inputmode="decimal" data-tr="${t}" value="${S.tradeRates[t]}" aria-label="${t} hourly rate"></td><td><input type="number" min="0" max="50" step="0.5" inputmode="decimal" data-waste="${t}" value="${S.waste[t]}" aria-label="${t} waste percent"></td><td class="hrs">–</td></tr>`).join("");
}
$("#ratesTable").addEventListener("input", (e) => { const i = e.target; if (!i.dataset.rate) return; const v = parseFloat(i.value); if (v >= 0) { S.rates[i.dataset.rate][i.dataset.k] = v; renderTotals(); } });
$("#tradeTable").addEventListener("input", (e) => { const i = e.target, v = parseFloat(i.value); if (!(v >= 0)) return; if (i.dataset.tr) S.tradeRates[i.dataset.tr] = v; else if (i.dataset.waste) S.waste[i.dataset.waste] = v; renderTotals(); });
$("#markup").addEventListener("input", (e) => { const v = parseFloat(e.target.value); if (v >= 0) { S.markup = v; renderTotals(); } });
$("#pg").addEventListener("input", (e) => { const v = parseFloat(e.target.value); if (v >= 0) { S.pgPct = v; renderTotals(); } });
export const lines = (ms = S.measurements) => ms.map((m) => ({ conditionId: m.conditionId, qty: m.qty, element: m.element || m.name || undefined }));
const psList = () => DEFECTS.filter((d) => S.ps.has(d.id)).map((d) => ({ id: d.id, title: d.title, amount: d.ps }));
export const quoteOpts = () => ({ rates: S.rates, marginPct: S.markup, pgPct: S.pgPct, wastePct: S.waste, tradeRates: S.tradeRates, provisionalSums: psList() });
export const currentPrice = (ms) => price(lines(ms), S.rates, S.markup);
export const currentQuote = (ms) => quote({ lines: lines(ms), ...quoteOpts() });
function renderTotals() {
  const q = currentQuote(), mx = Math.max(1, ...q.byTrade.map((t) => t.cost)), cols = ["#F6B48E", "#C7B4F0", "#A7DEC7", "#F3A5BE", "#F2DC7C", "#A9C9F2", "#F6B48E"];
  $("#tradeBars").innerHTML = q.byTrade.length ? q.byTrade.map((t) => `<div style="--c:${cols[TRADES.indexOf(t.trade) % cols.length]}"><span>${esc(t.trade)}</span><span class="t"><i style="width:${(t.cost / mx * 100).toFixed(1)}%"></i></span><b>${nzd0(t.cost)}<small>${t.hours} h · ${t.wastePct ?? S.waste[t.trade]}% waste</small></b></div>`).join("") : `<p class="empty">Measure something, or ask the agent, and the trades fill in here.</p>`;
  const row = (dt, dd, cls = "") => `<div class="${cls}" style="display:contents"><dt>${dt}</dt><dd>${dd}</dd></div>`;
  $("#sums").innerHTML = row("Materials", nzd(q.material)) + row(`Waste <small>by trade</small>`, nzd(q.waste), "sub") + row(`Labour <small>${q.hours} h at trade rates</small>`, nzd(q.labour)) + row("Cost", nzd(q.cost)) + row(`P&amp;G ${q.pgPct}%`, nzd(q.pg)) + row(`Margin ${q.marginPct}%`, nzd(q.margin)) + (q.provisionalSums.length ? row(`Provisional sums <small>${q.provisionalSums.length} held</small>`, nzd(q.provisional)) : "") + row("Subtotal excl. GST", nzd(q.subtotal)) + row("GST 15%", nzd(q.gst)) + row("Total incl. GST", nzd(q.total), "big");
  $$("#ratesTable tr").forEach((tr) => { const i = tr.querySelector("[data-rate]"); if (i) tr.classList.toggle("used", S.measurements.some((m) => m.conditionId === i.dataset.rate)); });
  $$("#tradeTable tr[data-trade]").forEach((tr) => { const t = q.byTrade.find((x) => x.trade === tr.dataset.trade); tr.querySelector(".hrs").textContent = t ? `${t.hours} h` : "–"; tr.classList.toggle("used", !!t); });
}

// ---------------------------------------------------------------- checks: consent, Building Code, defects (live from the takeoff)
const SEV_TONE = { high: "pink", medium: "butter", low: "mint" };
function renderChecks() {
  const L = lines(sheetMeasurements()), sheetId = S.sheet ? S.sheet.id : null;
  const cc = consentCheck(sheetId || "A101", L);
  $("#consentPanel").innerHTML = cc.questions.map((q) => `<div class="qn"><b>${esc(q.q)}</b><span class="ex">${esc(q.exemption)}</span><span class="ans"><span class="pill" data-tone="${/consent likely/.test(q.likely) ? (/^(no |nothing)/.test(q.answer) ? "mint" : "pink") : /^ask/.test(q.answer) ? "butter" : "mint"}">${esc(q.likely)}</span>${esc(q.answer)}</span></div>`).join("") + `<p class="verdict">${esc(cc.verdict)}</p>`;
  const code = codeChecks(L, sheetId); $("#codeCount").textContent = code.checks.length ? `${code.checks.length} checks` : "";
  $("#codePanel").innerHTML = code.byClause.length ? code.byClause.map((g) => `<section class="cl"><header><b>${g.clause}</b><span>${esc(g.name)}</span><a class="link std" href="${g.link}" target="_blank" rel="noopener">building.govt.nz</a></header><ul>${g.checks.map((k) => `<li>${esc(k.check)}<small>${esc(k.condition)} · ${esc(k.standard)}</small></li>`).join("")}</ul></section>`).join("") : `<p class="empty">Measure something and the clauses to check appear here, one line each, with MBIE's page.</p>`;
  const dr = defectRegister(L, sheetId); $("#defectCount").textContent = dr.count ? `${dr.count} · ${dr.register.filter((d) => d.severity === "high").length} high` : "";
  for (const id of [...S.ps]) if (!dr.register.find((d) => d.id === id)) S.ps.delete(id);
  $("#defectPanel").innerHTML = dr.count ? dr.register.map((d) => `<div class="defect"><input type="checkbox" data-ps="${d.id}" ${S.ps.has(d.id) ? "checked" : ""} ${d.provisionalSum ? "" : "disabled"} aria-label="Hold ${esc(d.title)} as a provisional sum"><span><span class="t">${esc(d.title)}<span class="sev" data-s="${d.severity}">${d.severity}</span><span class="pill" data-tone="${SEV_TONE[d.severity]}">${d.clause}</span></span><span class="where">${esc(d.where)} · ${esc(d.why)}</span><span class="photo">${esc(d.photoCheck)}</span><span class="ps">${d.provisionalSum ? `Provisional sum ${nzd0(d.provisionalSum)} ex GST${S.ps.has(d.id) ? " · held in the quote" : ""}` : "No sum: a check, not a cost"}<a class="link" href="${d.link}" target="_blank" rel="noopener">${d.clause} ${esc(d.clauseName)}</a></span></span></div>`).join("") : `<p class="empty">Measure something and the defects to look for appear here, worst first.</p>`;
}
$("#defectPanel").addEventListener("change", (e) => { const i = e.target.closest("[data-ps]"); if (!i) return; if (i.checked) S.ps.add(i.dataset.ps); else S.ps.delete(i.dataset.ps); const d = DEFECTS.find((x) => x.id === i.dataset.ps); diary(i.checked ? "Provisional sum held" : "Provisional sum released", `${d.title} · ${nzd0(d.ps)} · by you`, "#F3A5BE"); emit(); });
function setPS(ids, by) { S.ps = new Set(ids); const held = DEFECTS.filter((d) => S.ps.has(d.id)); diary("Provisional sums decided", `${held.length} held (${nzd0(held.reduce((s, d) => s + d.ps, 0))}) · by ${by}`, "#F3A5BE"); emit(); }
$("#h1zone").innerHTML = H1_ZONES.map((z) => `<option value="${z.zone}">Zone ${z.zone} · ${esc(z.where)}</option>`).join("");
$("#h1zone").addEventListener("change", (e) => { S.zone = +e.target.value; renderH1(); });
function renderH1() { $("#h1Table").innerHTML = `<thead><tr><th>Element</th><th>Minimum R (zone ${S.zone})</th></tr></thead><tbody>${H1_SCHEDULE.map((r) => `<tr><td>${esc(r.element)}</td><td>R${r.r[S.zone - 1].toFixed(r.r[S.zone - 1] < 1 ? 2 : 1)}</td></tr>`).join("")}</tbody>`; }

// ---------------------------------------------------------------- site diary (a stub: in this tab only)
export function diary(what, detail, colour = "#C7B4F0") {
  S.diary.unshift({ at: new Date().toISOString(), what, detail, colour });
  $("#diaryCount").textContent = `${S.diary.length} entr${S.diary.length === 1 ? "y" : "ies"} · this tab only`;
  $("#diary").innerHTML = S.diary.slice(0, 40).map((d) => `<li><time datetime="${d.at}">${clock(d.at)}</time><span><b><i class="cube" style="--c:${d.colour};width:10px;height:10px;margin-right:6px"></i>${esc(d.what)}</b><small>${esc(d.detail)}</small></span></li>`).join("");
}

// ---------------------------------------------------------------- print: the client-ready quote only
function printQuote(bidEl, meta) {
  const area = $("#printArea"); area.innerHTML = `<div class="phead"><b>${esc(meta.builder)}</b><span>${esc(meta.ref)}<br>${esc(meta.date)}<br>Simulated · indicative only · not a quote</span></div>` + bidEl.outerHTML + `<p class="pfoot">Record ${esc(meta.schema)} · SHA-256 of the quote record ${esc(meta.hash)}${meta.receipt ? ` · receipt ${esc(meta.receipt)}` : ""} · computed in the browser, not stored · assembl lab trades twin, a simulation with a fictional builder, client and rates.</p>`;
  area.querySelector(".bid")?.removeAttribute("id");
  const done = () => { area.innerHTML = ""; window.removeEventListener("afterprint", done); };
  window.addEventListener("afterprint", done); window.print(); setTimeout(done, 60000);
}

listeners.add(() => { draw(); renderTakeoff(); renderTotals(); renderScale(); renderChecks(); });

// ---------------------------------------------------------------- zoom buttons
$("#zoomIn").onclick = viewer.zoomIn; $("#zoomOut").onclick = viewer.zoomOut; $("#zoomFit").onclick = viewer.fit;

// ---------------------------------------------------------------- agent-ready panel
$("#arTools").innerHTML = TOOLS.map((t) => `<li><code>${t.name}</code> <span>${esc(t.description.split(". ")[0].replace(/\.$/, ""))}.</span></li>`).join("");
$("#arUrl").textContent = `POST ${location.origin.startsWith("http") ? location.origin : "https://assembl-lab.vercel.app"}/api/takeoff/`;
$("#arTry").onclick = async () => {
  const out = $("#arOut"), b = $("#arTry"); b.disabled = true; out.innerHTML = `<p class="ok">Calling…</p>`;
  const rpc = async (id, method, params) => { const r = await fetch("/api/takeoff/", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id, method, params }) }); return r.json(); };
  const L = [{ conditionId: "carpet", qty: 80.5 }, { conditionId: "floor-tiles", qty: 30.7, element: "bath" }, { conditionId: "window", qty: 11 }];
  try {
    const t = await rpc(1, "tools/list"), f = await rpc(2, "tools/call", { name: "find_rooms", arguments: { sheet: "A101" } });
    const c = await rpc(3, "tools/call", { name: "code_checks", arguments: { sheet: "A101", lines: L } });
    const q = await rpc(4, "tools/call", { name: "quote", arguments: { lines: L, marginPct: S.markup, pgPct: S.pgPct } });
    out.innerHTML = `<p class="ok">tools/list → ${(t.result?.tools || []).map((x) => x.name).join(", ")}</p><p class="ok">find_rooms → ${esc(f.result?.content?.[0]?.text || JSON.stringify(f))}</p><p class="ok">code_checks → ${esc(c.result?.content?.[0]?.text || JSON.stringify(c))}</p><p class="ok">quote → ${esc(q.result?.content?.[0]?.text || JSON.stringify(q))}</p><pre>${esc(JSON.stringify({ code_checks: c.result?.structuredContent?.byClause?.map((g) => ({ clause: g.clause, name: g.name, checks: g.checks.map((k) => k.check) })), quote: q.result?.structuredContent && { hours: q.result.structuredContent.hours, cost: q.result.structuredContent.cost, pg: q.result.structuredContent.pg, margin: q.result.structuredContent.margin, gst: q.result.structuredContent.gst, total: q.result.structuredContent.total } }, null, 1).slice(0, 6000))}</pre>`;
  } catch (e) { out.innerHTML = `<p class="ok">The endpoint didn't answer from here (${esc(String(e.message || e))}). It runs on the lab's Vercel origin: https://assembl-lab.vercel.app/api/takeoff/</p>`; }
  b.disabled = false;
};

// ---------------------------------------------------------------- boot
renderSheets(); renderConds(); renderRates(); renderTotals(); renderScale(); renderH1(); renderChecks(); setTool("pan");
openSheet("A101");
const store = { S, scaleOf, setScale, openSheet, addMeasurement, lines, currentPrice, currentQuote, quoteOpts, psList, setPS, diary, printQuote, emit, viewer, condition, nominalMmPerPt, toPt, price, quote, GST,
  highlight(id) { S.hl = id; emit(); }, removeByAgent(ids) { S.measurements = S.measurements.filter((m) => !ids.includes(m.id)); emit(); }, subscribe: (f) => { listeners.add(f); return () => listeners.delete(f); } };
initAgentDesk(store);
window.__trades = store;
