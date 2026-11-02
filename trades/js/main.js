// assembl lab · trades twin. Wires the desk: sheets, the scale a person confirms, the measuring tools, the takeoff list, the
// rates sheet and totals, the agent desk and the agent-ready panel. State lives in this tab only; nothing is stored or sent.
import { PLANS, CONDITIONS, TRADES, GST, TOOLS, nominalMmPerPt, quantity, condition, price, round, toPt } from "./takeoff-core.js";
import { createViewer } from "./viewer.js";
import { initAgentDesk } from "./desk.js";

export const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
export const nzd = (v) => "$" + Number(v || 0).toLocaleString("en-NZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtQ = (q, unit) => unit === "EA" ? `${q} EA` : `${round(q, 2).toLocaleString("en-NZ")} ${unit}`;
const reduced = matchMedia("(prefers-reduced-motion: reduce)");

// ---------------------------------------------------------------- state
const S = {
  sheetKey: "A101", sheet: PLANS.sheets[0], uploads: {}, scales: {}, tool: "pan", cond: "carpet", draft: [], scalePts: [],
  measurements: [], rates: Object.fromEntries(CONDITIONS.map((c) => [c.id, { material: c.material, labour: c.labour }])), markup: 12, seq: 0, hl: null,
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
function setScale(mmPerPt, source) { S.scales[S.sheetKey] = { mmPerPt, confirmed: true, source, at: new Date().toISOString() }; S.scalePts = []; $("#scaleForm").hidden = true; setTool("pan"); emit(); }
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
function addMeasurement(m) { const sc = scaleOf(); const c = condition(m.conditionId); const qty = round(quantity(m.kind, m.kind === "area" ? m.pts : m.pts, sc.mmPerPt), 3); const rec = { id: "m" + (++S.seq), sheet: S.sheetKey, qty, unit: m.kind === "count" ? "EA" : m.kind === "length" ? "m" : "m²", priced: round(qty * ((c && c.factor) || 1), 2), ...m }; S.measurements.push(rec); emit(); return rec; }
$("#finish").onclick = $("#finish2").onclick = finish; $("#undo").onclick = $("#undo2").onclick = undo;
$("#clearSheet").onclick = () => { S.measurements = S.measurements.filter((m) => m.sheet !== S.sheetKey); S.draft = []; emit(); };
document.addEventListener("keydown", (e) => { if (e.target.matches("input,select,textarea")) return; if (e.key === "Escape") { S.draft = []; S.scalePts = []; $("#scaleForm").hidden = true; draw(); } else if ((e.key === "z" || e.key === "Z") && (e.metaKey || e.ctrlKey)) { e.preventDefault(); undo(); } });

function draw() {
  const items = [];
  for (const m of sheetMeasurements()) { const c = condition(m.conditionId); items.push({ kind: m.kind, pts: m.pts, colour: c ? c.colour : "#A9C9F2", label: `${m.name || (c ? c.name.split(" ").slice(0, 2).join(" ") : "")} · ${fmtQ(m.qty, m.unit)}`, hl: S.hl === m.id }); }
  if (S.draft.length) { const c = condition(S.cond), sc = scaleOf(); const q = sc ? quantity(S.tool, S.draft, sc.mmPerPt) : 0; items.push({ kind: S.tool, pts: S.draft, colour: c ? c.colour : "#A9C9F2", draft: true, label: S.draft.length >= (S.tool === "area" ? 3 : S.tool === "length" ? 2 : 1) ? fmtQ(round(q, 2), S.tool === "count" ? "EA" : S.tool === "length" ? "m" : "m²") : "" }); }
  if (S.scalePts.length) items.push({ kind: "scale", pts: S.scalePts, colour: "#240B21", label: S.scalePts.length === 2 ? "scale line" : "" });
  viewer.setItems(items);
  const bar = $("#draftBar"), n = S.draft.length; bar.hidden = !n; if (n) $("#draftInfo").textContent = `${condition(S.cond)?.name || ""} · ${n} point${n === 1 ? "" : "s"}`;
  $("#finish").disabled = !(S.draft.length >= (S.tool === "area" ? 3 : S.tool === "length" ? 2 : 1)) || S.tool === "pan" || S.tool === "scale";
}
function cursor([x, y]) { const sc = scaleOf(); $("#cursorInfo").textContent = sc ? `${Math.round(x * sc.mmPerPt)}, ${Math.round(y * sc.mmPerPt)} mm` : `${Math.round(x)}, ${Math.round(y)} pt`; }

// ---------------------------------------------------------------- takeoff list, rates, totals
function renderTakeoff() {
  const mine = sheetMeasurements(); $("#takeoffCount").textContent = mine.length;
  $("#takeoff").innerHTML = mine.length ? mine.map((m) => { const c = condition(m.conditionId); return `<li data-id="${m.id}" style="--c:${c ? c.colour : "#ccc"}" class="${S.hl === m.id ? "hl" : ""}"><i></i><span class="n">${esc(m.name || c?.name || m.conditionId)}<small>${esc(c?.trade || "")} · by ${m.by === "agent" ? "the agent" : "you"}${c && c.factor ? ` · ${fmtQ(m.priced, c.unit)}` : ""}</small></span><span class="qty">${fmtQ(m.qty, m.unit)}</span><button class="x" type="button" data-del="${m.id}" aria-label="Remove">×</button></li>`; }).join("") : `<li class="empty">Nothing measured yet on this sheet.</li>`;
}
$("#takeoff").addEventListener("click", (e) => { const d = e.target.closest("[data-del]"); if (d) { S.measurements = S.measurements.filter((m) => m.id !== d.dataset.del); emit(); return; } const li = e.target.closest("[data-id]"); if (li) { S.hl = S.hl === li.dataset.id ? null : li.dataset.id; const m = S.measurements.find((x) => x.id === li.dataset.id); if (m && S.hl) viewer.focusOn(m.pts); emit(); } });
function renderRates() {
  const used = new Set(S.measurements.map((m) => m.conditionId));
  $("#ratesTable tbody").innerHTML = CONDITIONS.map((c) => `<tr class="${used.has(c.id) ? "used" : ""}"><td>${esc(c.trade)}</td><td>${esc(c.name)}${c.factor ? `<small>drawn as ${c.measure} × ${c.factor} (${esc(c.factorNote)})</small>` : ""}</td><td>${c.unit}</td><td><input type="number" min="0" step="0.5" inputmode="decimal" data-rate="${c.id}" data-k="material" value="${S.rates[c.id].material}" aria-label="${esc(c.name)} material per ${c.unit}"></td><td><input type="number" min="0" step="0.5" inputmode="decimal" data-rate="${c.id}" data-k="labour" value="${S.rates[c.id].labour}" aria-label="${esc(c.name)} labour per ${c.unit}"></td></tr>`).join("");
}
$("#ratesTable").addEventListener("input", (e) => { const i = e.target; if (!i.dataset.rate) return; const v = parseFloat(i.value); if (v >= 0) { S.rates[i.dataset.rate][i.dataset.k] = v; renderTotals(); } });
$("#markup").addEventListener("input", (e) => { const v = parseFloat(e.target.value); if (v >= 0) { S.markup = v; renderTotals(); } });
export const lines = (ms = S.measurements) => ms.map((m) => ({ conditionId: m.conditionId, qty: m.qty }));
export const currentPrice = (ms) => price(lines(ms), S.rates, S.markup);
function renderTotals() {
  const p = currentPrice(), mx = Math.max(1, ...p.byTrade.map((t) => t.cost)), cols = ["#F6B48E", "#C7B4F0", "#A7DEC7", "#F3A5BE", "#F2DC7C", "#A9C9F2", "#F6B48E"];
  $("#tradeBars").innerHTML = p.byTrade.length ? p.byTrade.map((t, i) => `<div style="--c:${cols[TRADES.indexOf(t.trade) % cols.length]}"><span>${esc(t.trade)}</span><span class="t"><i style="width:${(t.cost / mx * 100).toFixed(1)}%"></i></span><b>${nzd(t.cost)}</b></div>`).join("") : `<p class="empty">Measure something, or ask the agent, and the trades fill in here.</p>`;
  $("#sums").innerHTML = `<dt>Cost (material + labour)</dt><dd>${nzd(p.cost)}</dd><dt>Markup ${p.markupPct}%</dt><dd>${nzd(p.markup)}</dd><dt>Subtotal excl. GST</dt><dd>${nzd(p.subtotal)}</dd><dt>GST 15%</dt><dd>${nzd(p.gst)}</dd><div class="big" style="display:contents"><dt>Total incl. GST</dt><dd>${nzd(p.total)}</dd></div>`;
  $$("#ratesTable tr").forEach((tr) => { const i = tr.querySelector("[data-rate]"); if (i) tr.classList.toggle("used", S.measurements.some((m) => m.conditionId === i.dataset.rate)); });
}
listeners.add(() => { draw(); renderTakeoff(); renderTotals(); renderScale(); });

// ---------------------------------------------------------------- zoom buttons
$("#zoomIn").onclick = viewer.zoomIn; $("#zoomOut").onclick = viewer.zoomOut; $("#zoomFit").onclick = viewer.fit;

// ---------------------------------------------------------------- agent-ready panel
$("#arTools").innerHTML = TOOLS.map((t) => `<li><code>${t.name}</code> <span>· ${esc(t.description.split(".")[0])}.</span></li>`).join("");
$("#arUrl").textContent = `POST ${location.origin.startsWith("http") ? location.origin : "https://assembl-lab.vercel.app"}/api/takeoff/`;
$("#arTry").onclick = async () => {
  const out = $("#arOut"), b = $("#arTry"); b.disabled = true; out.innerHTML = `<p class="ok">Calling…</p>`;
  const rpc = async (id, method, params) => { const r = await fetch("/api/takeoff/", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id, method, params }) }); return r.json(); };
  try {
    const t = await rpc(1, "tools/list"), f = await rpc(2, "tools/call", { name: "find_rooms", arguments: { sheet: "A101" } });
    const d = await rpc(3, "tools/call", { name: "draft_bid", arguments: { sheet: "A101", lines: [{ conditionId: "carpet", qty: 80.5 }, { conditionId: "floor-tiles", qty: 30.7 }], markupPct: S.markup } });
    out.innerHTML = `<p class="ok">tools/list → ${(t.result?.tools || []).map((x) => x.name).join(", ")}</p><p class="ok">find_rooms → ${esc(f.result?.content?.[0]?.text || JSON.stringify(f))}</p><p class="ok">draft_bid → ${esc(d.result?.content?.[0]?.text || JSON.stringify(d))}<br>_meta.assembl/bidHash ${esc(d.result?._meta?.["assembl/bidHash"] || "–")}</p><pre>${esc(JSON.stringify({ find_rooms: f.result?.structuredContent, draft_bid: d.result?.structuredContent }, null, 1).slice(0, 6000))}</pre>`;
  } catch (e) { out.innerHTML = `<p class="ok">The endpoint didn't answer from here (${esc(String(e.message || e))}). It runs on the lab's Vercel origin: https://assembl-lab.vercel.app/api/takeoff/</p>`; }
  b.disabled = false;
};

// ---------------------------------------------------------------- boot
renderSheets(); renderConds(); renderRates(); renderTotals(); renderScale(); setTool("pan");
openSheet("A101");
const store = { S, scaleOf, setScale, openSheet, addMeasurement, lines, currentPrice, emit, viewer, condition, nominalMmPerPt, toPt, price, GST,
  highlight(id) { S.hl = id; emit(); }, removeByAgent(ids) { S.measurements = S.measurements.filter((m) => !ids.includes(m.id)); emit(); }, subscribe: (f) => { listeners.add(f); return () => listeners.delete(f); } };
initAgentDesk(store);
window.__trades = store;
