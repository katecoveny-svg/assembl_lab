// assembl lab · trades twin. Pure takeoff logic shared by the desk in the browser and the stateless endpoint (api/takeoff.js):
// unit conversion, polygon geometry, the condition library's pricing, NZ quote maths (waste, labour hours, P&G, margin,
// provisional sums, GST on the whole), the Building Code checks and defect register, and the ten tools (find_rooms, measure,
// consent_check, code_checks, defect_register, price, quote, variation, payment_claim, draft_bid). No DOM, no network, no state.
// Everything it returns is labelled Simulated or Illustrative.
import { PLANS, CONDITIONS, TRADES, GST, MM_PER_PT } from "./plans-data.js";
import { NZ_TRUTH, NZ_REF_DATE, CLAUSES, SCHEDULE1_LINK, H1_SCHEDULE, H1_ZONES, CONSENT_QUESTIONS, CODE_CHECKS, DEFECTS, TRADE_RATES, WASTE_PCT, EXCLUSIONS, QUOTE_TERMS, VARIATIONS, COUNCILS, NATIONAL_EXEMPT_GUIDE, councilForZone, NZ_HOLIDAYS, CCA } from "./nz-code.js";

export { PLANS, CONDITIONS, TRADES, GST, MM_PER_PT, NZ_TRUTH, NZ_REF_DATE, CLAUSES, SCHEDULE1_LINK, H1_SCHEDULE, H1_ZONES, CONSENT_QUESTIONS, CODE_CHECKS, DEFECTS, TRADE_RATES, WASTE_PCT, EXCLUSIONS, QUOTE_TERMS, VARIATIONS, COUNCILS, NATIONAL_EXEMPT_GUIDE, councilForZone, NZ_HOLIDAYS, CCA };
export const VERSION = "0.3.0";
export const LEGAL_TRUTH = "Illustrative · not legal advice";
export const PT_PER_MM = 1 / MM_PER_PT;

// ---------------------------------------------------------------- geometry (PDF points, or any consistent unit)
export const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
export const isMulti = (pts) => Array.isArray(pts[0]) && Array.isArray(pts[0][0]);   // several runs, e.g. 14 joists as one line
export const flat = (pts) => (isMulti(pts) ? pts.flat() : pts);
export const polylineLength = (pts) => isMulti(pts) ? pts.reduce((s, run) => s + polylineLength(run), 0) : pts.reduce((s, p, i) => (i ? s + dist(pts[i - 1], p) : 0), 0);
export const polygonArea = (pts) => Math.abs(pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
export const centroid = (pts) => { const P = flat(pts); return P.reduce((c, p) => [c[0] + p[0] / P.length, c[1] + p[1] / P.length], [0, 0]); };

// real mm on a sheet → paper points (what pdf.js reports at viewport scale 1), y down
export const sheetById = (id) => PLANS.sheets.find((s) => s.id === id);
export const toPt = (sheet, [x, y]) => [(sheet.origin.x + x / sheet.scale) * PT_PER_MM, (sheet.origin.y + y / sheet.scale) * PT_PER_MM];
export const polyToPt = (sheet, poly) => poly.map((p) => toPt(sheet, p));
// the sheet's nominal scale as mm of real world per paper point (what a title block implies; a person still confirms it)
export const nominalMmPerPt = (sheet) => sheet.scale * MM_PER_PT;

// quantity of a drawn measurement under a confirmed scale (mm per point)
export function quantity(kind, pts, mmPerPt) {
  if (kind === "count") return flat(pts).length;
  if (kind === "length") return (polylineLength(pts) * mmPerPt) / 1000;             // m
  if (kind === "area") return (polygonArea(pts) * mmPerPt * mmPerPt) / 1e6;        // m²
  return 0;
}
export const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
export const condition = (id) => CONDITIONS.find((c) => c.id === id);

// ---------------------------------------------------------------- pricing
// lines: [{ conditionId, qty (drawn units) }]; rates: { [conditionId]: { material, labour } } overrides; markupPct on cost.
export function price(lines, rates = {}, markupPct = 12) {
  const out = [];
  for (const l of lines) {
    const c = condition(l.conditionId); if (!c) continue;
    const r = { material: c.material, labour: c.labour, ...(rates[c.id] || {}) };
    const priced = round(l.qty * (c.factor || 1), 2);
    const material = round(priced * r.material), labour = round(priced * r.labour);
    out.push({ conditionId: c.id, name: c.name, trade: c.trade, drawn: round(l.qty, 2), drawnUnit: c.measure === "count" ? "EA" : c.measure === "length" ? "m" : "m²", qty: priced, unit: c.unit, rate: { material: r.material, labour: r.labour }, material, labour, cost: material + labour });
  }
  const byTrade = TRADES.map((t) => ({ trade: t, cost: round(out.filter((l) => l.trade === t).reduce((s, l) => s + l.cost, 0)) })).filter((t) => t.cost > 0);
  const cost = round(out.reduce((s, l) => s + l.cost, 0));
  const markup = round(cost * markupPct / 100), subtotal = round(cost + markup), gst = round(subtotal * GST), total = round(subtotal + gst);
  return { truth: "Simulated", label: "Indicative only · not a quote", lines: out, byTrade, cost, markupPct, markup, subtotal, gst, gstRate: GST, total, currency: "NZD" };
}

// NZ quote maths, a superset of price(): materials carry waste by trade, labour becomes hours at the trade's hourly rate,
// preliminaries and general (P&G) sit on cost, margin sits on cost + P&G, provisional sums are listed on their own, and GST
// at 15% is charged on the whole. Every figure is Simulated; the shape stays compatible with price() (cost, markup, subtotal…).
export const DEFAULT_QUOTE = { pgPct: 8, marginPct: 12 };
export function quote({ lines, rates = {}, marginPct = DEFAULT_QUOTE.marginPct, markupPct, pgPct = DEFAULT_QUOTE.pgPct, wastePct = {}, tradeRates = {}, provisionalSums = [] } = {}) {
  if (typeof markupPct === "number" && typeof marginPct !== "number") marginPct = markupPct;
  const out = [], W = { ...WASTE_PCT, ...(typeof wastePct === "number" ? Object.fromEntries(TRADES.map((t) => [t, wastePct])) : wastePct) }, TR = { ...TRADE_RATES, ...tradeRates };
  for (const l of lines || []) {
    const c = condition(l.conditionId); if (!c) continue;
    const r = { material: c.material, labour: c.labour, ...(rates[c.id] || {}) };
    const priced = round(l.qty * (c.factor || 1), 2), waste = W[c.trade] ?? 0;
    const material = round(priced * r.material), wasteCost = round(material * waste / 100), labour = round(priced * r.labour), hours = round(labour / (TR[c.trade] || 75), 1);
    out.push({ conditionId: c.id, name: c.name, trade: c.trade, drawn: round(l.qty, 2), drawnUnit: c.measure === "count" ? "EA" : c.measure === "length" ? "m" : "m²", qty: priced, unit: c.unit, rate: { material: r.material, labour: r.labour }, material, wastePct: waste, waste: wasteCost, labour, hours, hourlyRate: TR[c.trade], cost: round(material + wasteCost + labour) });
  }
  const byTrade = TRADES.map((t) => { const L = out.filter((l) => l.trade === t); const sum = (k) => round(L.reduce((s, l) => s + l[k], 0)); return { trade: t, material: sum("material"), waste: sum("waste"), labour: sum("labour"), hours: round(sum("hours"), 1), hourlyRate: TR[t], cost: sum("cost") }; }).filter((t) => t.cost > 0);
  const material = round(out.reduce((s, l) => s + l.material, 0)), waste = round(out.reduce((s, l) => s + l.waste, 0)), labour = round(out.reduce((s, l) => s + l.labour, 0)), hours = round(out.reduce((s, l) => s + l.hours, 0), 1);
  const cost = round(material + waste + labour), pg = round(cost * pgPct / 100), margin = round((cost + pg) * marginPct / 100);
  const ps = (provisionalSums || []).filter((p) => p && p.amount > 0).map((p) => ({ id: p.id, title: p.title, amount: round(p.amount) })), provisional = round(ps.reduce((s, p) => s + p.amount, 0));
  const subtotal = round(cost + pg + margin + provisional), gst = round(subtotal * GST), total = round(subtotal + gst);
  return { truth: "Simulated", label: "Indicative only · not a quote", lines: out, byTrade, material, waste, labour, hours, cost, pgPct, pg, marginPct, margin, markupPct: marginPct, markup: margin, provisionalSums: ps, provisional, subtotal, gst, gstRate: GST, total, currency: "NZD", validDays: 30 };
}

// ---------------------------------------------------------------- Building Code checks, consent questions and defects for a set of lines
const roomOf = (sheet, el) => sheet && sheet.rooms.find((r) => r.id === el);
export function codeChecks(lines, sheetId) {
  const seen = new Set(), out = [];
  for (const l of lines || []) {
    const c = condition(l.conditionId); if (!c) continue;
    for (const k of CODE_CHECKS[c.id] || []) { const key = c.id + "|" + k.clause; if (seen.has(key)) continue; seen.add(key); const cl = CLAUSES[k.clause]; out.push({ conditionId: c.id, condition: c.name, trade: c.trade, clause: cl.id, clauseName: cl.name, standard: cl.std, check: k.check, link: cl.link }); }
  }
  const byClause = Object.keys(CLAUSES).map((id) => ({ clause: id, name: CLAUSES[id].name, link: CLAUSES[id].link, checks: out.filter((o) => o.clause === id) })).filter((g) => g.checks.length);
  return { truth: NZ_TRUTH, asAt: NZ_REF_DATE, sheet: sheetId || null, checks: out, byClause, h1: { zones: H1_ZONES, schedule: H1_SCHEDULE, note: "Minimum construction R-values, housing, schedule method, as the lab read H1/AS1 5th edition. Confirm the current amendment." }, source: "https://www.building.govt.nz/building-code-compliance/" };
}
export function consentCheck(sheetId, lines) {
  const sheet = sheetById(sheetId), ids = new Set((lines || []).map((l) => l.conditionId));
  const relevant = CONSENT_QUESTIONS.filter((q) => sheetId === "A201" ? ["deck-height", "pergola", "structure", "like-for-like"].includes(q.id) : !["deck-height", "pergola"].includes(q.id));
  const answers = relevant.map((q) => { let a = "ask the client"; if (q.id === "deck-height") a = sheet ? "yes · drawn 0.6 m above ground (demo)" : "ask"; if (q.id === "pergola") a = "yes · open frame on the drawing"; if (q.id === "plumbing") a = ids.has("fixture") ? "fixtures are drawn · confirm if any is new or moved" : "no fixture drawn"; if (q.id === "wet-area") a = ids.has("floor-tiles") || ids.has("vinyl") ? "wet-area floors are in scope · confirm the membrane" : "no wet area in scope"; if (q.id === "structure") a = ids.has("gib-wall") || ids.has("int-door") ? "walls are in scope · ask for the bracing schedule" : "nothing structural drawn"; if (q.id === "like-for-like") a = "ask the client what is replaced and what is new"; return { ...q, answer: a }; });
  const likelyConsent = answers.some((a) => /consent likely/.test(a.likely) && !/^no /.test(a.answer) && !/nothing/.test(a.answer));
  return { truth: NZ_TRUTH, sheet: sheetId, questions: answers, verdict: likelyConsent ? "A building consent is likely for part of this work. Confirm with the council before pricing it as exempt." : "Most of this work looks exempt under Schedule 1, if the answers hold. Confirm with the council; keep records of the work.", schedule1: SCHEDULE1_LINK };
}
export function defectRegister(lines, sheetId) {
  const sheet = sheetById(sheetId), conds = new Set(), rooms = new Set(), els = new Set();
  for (const l of lines || []) { conds.add(l.conditionId); if (l.element) { els.add(l.element); if (roomOf(sheet, l.element)) rooms.add(l.element); } }
  const hits = DEFECTS.filter((d) => { const w = d.when; const byCond = (w.conditions || []).some((c) => conds.has(c)); const byEl = (w.elements || []).some((e) => els.has(e)); if (w.rooms && w.conditions) return byCond && (!rooms.size || w.rooms.some((r) => rooms.has(r)) || byEl); return byCond || byEl; });
  const order = { high: 0, medium: 1, low: 2 };
  const register = hits.sort((a, b) => order[a.severity] - order[b.severity]).map((d) => ({ id: d.id, title: d.title, where: d.where, severity: d.severity, clause: d.clause, clauseName: CLAUSES[d.clause].name, link: CLAUSES[d.clause].link, photoCheck: d.photo, why: d.why, provisionalSum: d.ps, proposed: d.severity !== "low" && d.ps > 0 }));
  return { truth: NZ_TRUTH, sheet: sheetId, count: register.length, register, note: "The agent proposes; a named person decides which become provisional sums in the quote. Provisional sums are fictional allowances." };
}

// ---------------------------------------------------------------- Construction Contracts Act 2002: working days and payment claims
const isoDay = (d) => d.toISOString().slice(0, 10);
export function addWorkingDays(startIso, n, region = "Auckland") {
  const off = new Set([...NZ_HOLIDAYS.national, ...(NZ_HOLIDAYS.anniversary[region] || [])]);
  let d = new Date(startIso.slice(0, 10) + "T00:00:00Z"), left = n, outside = false;
  while (left > 0) {
    d = new Date(d.getTime() + 864e5); const k = isoDay(d), md = k.slice(5), wd = d.getUTCDay();
    if (k < NZ_HOLIDAYS.range[0] || k > NZ_HOLIDAYS.range[1]) outside = true;
    if (wd === 0 || wd === 6 || off.has(k) || md >= "12-24" || md <= "01-05") continue;   // s 5 working day, for ss 18 and 22
    left -= 1;
  }
  return { date: isoDay(d), holidaysKnown: !outside };
}
// A progress payment claim against an approved quote. Amounts excl. GST unless named incl.
export function paymentClaim({ quoteRef, customer = PLANS.project.client, builder = PLANS.project.builder, project = PLANS.project.name, contractValue, variationsValue = 0, claimNo = 1,
  periodFrom, periodTo, percentComplete, previouslyClaimed = 0, retentionPct = 0, residentialOccupier = true, served, region = "Auckland", contractDueDays, contractScheduleDays, now } = {}) {
  if (!(contractValue > 0)) return { error: "payment_claim needs contractValue (the approved quote, excl. GST)" };
  if (!(percentComplete >= 0 && percentComplete <= 100)) return { error: "percentComplete must be between 0 and 100" };
  const servedOn = (served || (now || new Date().toISOString())).slice(0, 10);
  const total = round(contractValue + variationsValue), toDate = round(total * percentComplete / 100), thisClaim = round(toDate - previouslyClaimed);
  if (thisClaim < 0) return { error: `Work to date (${toDate}) is less than already claimed (${previouslyClaimed}); a negative claim is a credit, not a payment claim` };
  const retention = round(thisClaim * (retentionPct || 0) / 100), net = round(thisClaim - retention), gst = round(net * GST), claimed = round(net + gst);
  const due = contractDueDays ? addWorkingDays(servedOn, contractDueDays, region) : addWorkingDays(servedOn, 20, region);
  const schedule = contractScheduleDays ? addWorkingDays(servedOn, contractScheduleDays, region) : addWorkingDays(servedOn, 20, region);
  const ref = `${quoteRef || "Q"}-PC${String(claimNo).padStart(2, "0")}`;
  const checklist = CCA.s20.map((c) => ({ ...c, met: true, how: { "s 20(2)(a)": "This claim is a written document", "s 20(2)(b)": `Names the contract: ${quoteRef || "the approved quote"}, ${project}`, "s 20(2)(c)": `Work: ${percentComplete}% of the contract works; period ${periodFrom || "–"} to ${periodTo || servedOn}`, "s 20(2)(d)": `Claimed ${claimed.toLocaleString("en-NZ")} incl. GST, due ${due.date}`, "s 20(2)(e)": "Calculation shown line by line below", "s 20(2)(f)": "States: this is a payment claim made under the Construction Contracts Act 2002", "s 20(3)(a)": "Response outline attached (the s 21 and s 22 summary)", "s 20(3)(b)": "Consequences attached (the s 22 and s 23 summary)", "s 20(4)": "Illustrative wording only: use the prescribed form from the Construction Contracts Regulations 2003 for a real claim" }[c.ref], ...(c.ref === "s 20(4)" ? { met: "check" } : {}) }));
  const retentionNote = !retention ? "No retention deducted." : residentialOccupier
    ? "The client is a residential occupier, so this is not a commercial construction contract and the retention trust rules (subpart 2A, s 18B(1)) do not apply to this retention. They do apply to retentions you hold on your subcontractors."
    : "Commercial construction contract: the retention is trust money for the payee from the moment the contract allows it to be withheld (s 18C), kept in a bank account or covered by a complying instrument (ss 18D–18FB), and reported at least every 3 months (s 18FD).";
  return { schema: "assembl.payment-claim/1", truth: "Simulated", label: LEGAL_TRUTH, ref, claimNo, quoteRef: quoteRef || null, project, customer, builder, residentialOccupier, region,
    period: { from: periodFrom || null, to: periodTo || servedOn }, served: servedOn,
    calc: { contractValue: round(contractValue), variationsValue: round(variationsValue), total, percentComplete, valueToDate: toDate, previouslyClaimed: round(previouslyClaimed), thisClaim, retentionPct: retentionPct || 0, retention, net, gst, claimed },
    dueDate: due.date, scheduleBy: schedule.date, holidaysKnown: due.holidaysKnown && schedule.holidaysKnown,
    basis: { due: contractDueDays ? `contract: ${contractDueDays} working days` : "s 18 default: 20 working days after service", schedule: contractScheduleDays ? `contract: ${contractScheduleDays} working days` : "s 22(b)(ii) default: 20 working days after service" },
    statement: "This is a payment claim made under the Construction Contracts Act 2002.",
    checklist, timing: CCA.timing, retentionNote, retentionRules: CCA.retention, law: [CCA.act, CCA.amendment2023],
    status: "draft", authority: "act with approval", requiresApproval: true, ...(now ? { draftedAt: now } : {}) };
}

// ---------------------------------------------------------------- room names off a drawing's text layer
// items: pdf.js text items flattened to { str, x, y, w, h } in page points (y down). Joins runs on one line, then matches a
// room-name lexicon and dimension strings ("4.5 × 3.5" in metres, "3600 x 4200" in mm). Pure, so an MCP client can send its
// own extracted text to find_rooms as `labels`.
const ROOM_RE = /^(?:(?:master |main |guest )?bed(?:room)?\s*\d*|living(?:\s*[·&\/-]?\s*dining)?|lounge|family(?: room)?|dining|kitchen(?:\s*[·&\/-]?\s*dining)?|scullery|butler'?s? pantry|pantry|bath(?:room)?|ensuite|en-suite|wc|toilet|powder(?: room)?|laundry|linen|entry|foyer|hall(?:way)?|study|office|garage|carport|deck|pergola|patio|porch|veranda[h]?|rumpus|media(?: room)?|w\.?i\.?r\.?|walk-in robe|robe|store|storage|utility|mud ?room|sun ?room|conservatory|stair(?:s|well)?|landing|games(?: room)?|workshop|shed)(?:\s*\d+)?$/i;
const DIM_RE = /(\d+(?:[.,]\d+)?)\s*[x×X]\s*(\d+(?:[.,]\d+)?)/;
export function labelsFromTextItems(items) {
  const its = (items || []).filter((t) => t && typeof t.str === "string" && t.str.trim()).map((t) => ({ str: t.str, x: +t.x || 0, y: +t.y || 0, w: +t.w || t.str.length * (+t.h || 8) * 0.5, h: +t.h || 8 })).sort((a, b) => a.y - b.y || a.x - b.x);
  const lines = [];
  for (const t of its) {
    const L = lines.find((l) => Math.abs(l.y - t.y) < Math.max(1.5, t.h * 0.35) && t.x - (l.x + l.w) < t.h * 0.9 && t.x - (l.x + l.w) > -t.h * 0.5);
    if (L) { L.text += (t.x - (L.x + L.w) > t.h * 0.15 ? " " : "") + t.str; L.w = t.x + t.w - L.x; L.h = Math.max(L.h, t.h); }
    else lines.push({ text: t.str, x: t.x, y: t.y, w: t.w, h: t.h });
  }
  return lines.map((l) => ({ text: l.text.replace(/\s+/g, " ").trim(), x: round(l.x + l.w / 2, 1), y: round(l.y, 1), w: round(l.w, 1), h: round(l.h, 1) })).filter((l) => l.text);
}
export function roomsFromLabels(labels) {
  const rooms = [], dims = [];
  for (const l of labels || []) {
    const t = String(l.text || "").trim(), d = DIM_RE.exec(t);
    if (d) { let a = parseFloat(d[1].replace(",", ".")), b = parseFloat(d[2].replace(",", ".")); const unit = a > 100 || b > 100 ? "mm" : "m"; if (unit === "mm") { a /= 1000; b /= 1000; } dims.push({ text: t, x: +l.x, y: +l.y, a: round(a, 3), b: round(b, 3), unit, finish: (/·\s*([a-z ]+)$/i.exec(t) || [])[1]?.trim() || null, used: false }); continue; }
    const name = t.replace(/[.:]+$/, ""); if (name.length <= 28 && ROOM_RE.test(name)) rooms.push({ name: /^(wc|w\.?i\.?r\.?)$/i.test(name) ? name.toUpperCase() : name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(), raw: t, x: +l.x, y: +l.y });
  }
  for (const r of rooms) {   // nearest dimension, preferring one just below the label
    let best = null, bd = Infinity;
    for (const d of dims) { if (d.used) continue; const dy = d.y - r.y, dist = Math.hypot(d.x - r.x, dy) + (dy < 0 ? 40 : 0); if (dist < 80 && dist < bd) { bd = dist; best = d; } }
    if (best) { best.used = true; r.dims = { a: best.a, b: best.b, unit: best.unit, text: best.text }; r.areaM2 = round(best.a * best.b, 2); if (best.finish) r.finish = best.finish; }
  }
  return { rooms, unmatchedDimensions: dims.filter((d) => !d.used).map(({ used, ...d }) => d) };
}

// ---------------------------------------------------------------- the sample sheets' takeoff, from the plan data (what the tools serve)
function elementsOf(sheet) {
  const E = [];
  for (const r of sheet.rooms) E.push({ id: r.id, name: r.name, kind: "area", finish: r.finish, pts: polyToPt(sheet, r.poly) });
  const lineSet = (key, name, cond) => { const L = sheet[key] || []; if (L.length) E.push({ id: key, name: `${name} (${L.length} run${L.length === 1 ? "" : "s"})`, kind: "length", conditionId: cond, pts: L.map((l) => polyToPt(sheet, l)) }); };
  const pointSet = (key, name, cond) => { if (sheet[key] && sheet[key].length) E.push({ id: key, name, kind: "count", conditionId: cond, pts: polyToPt(sheet, sheet[key]) }); };
  if (sheet.walls) { E.push({ id: "ext-wall", name: "External wall", kind: "length", conditionId: "gib-wall", pts: polyToPt(sheet, [...sheet.rooms[0].poly.slice(0, 1), [sheet.extent.w, 0], [sheet.extent.w, sheet.extent.h], [0, sheet.extent.h], [0, 0]]) }); lineSet("walls", "Internal walls", "gib-wall"); }
  pointSet("doors", "Internal doors", "int-door"); pointSet("windows", "Windows", "window");
  if (sheet.fixtures) E.push({ id: "fixtures", name: "Sanitary fixtures", kind: "count", conditionId: "fixture", pts: polyToPt(sheet, sheet.fixtures.map((f) => f.at)) });
  lineSet("joists", "Deck joists", "deck-joist"); lineSet("bearers", "Bearers", "bearer"); lineSet("beams", "Pergola beams", "beam"); lineSet("rafters", "Pergola rafters", "rafter"); lineSet("handrail", "Handrail", "handrail");
  pointSet("posts", "Deck posts", "post"); pointSet("pergolaPosts", "Pergola posts", "post");
  return E;
}
// walls-3, joists-7 …: one run of a grouped element, for clients that want a single member
function legacyElement(sheet, id) { const m = /^([a-z]+)-(\d+)$/.exec(id || ""); if (!m || !Array.isArray(sheet[m[1]])) return null; const run = sheet[m[1]][+m[2] - 1]; if (!run) return null; const g = elementsOf(sheet).find((e) => e.id === m[1]); return g ? { id, name: `${g.name.replace(/ \(.*\)$/, "")} ${m[2]}`, kind: "length", conditionId: g.conditionId, pts: polyToPt(sheet, run) } : null; }
export const elements = (sheetId) => { const s = sheetById(sheetId); return s ? elementsOf(s) : []; };

const finishCondition = { carpet: "carpet", tiles: "floor-tiles", vinyl: "vinyl", decking: "decking", pergola: null };

// ---------------------------------------------------------------- the ten tools
const SHEET = { type: "string", enum: ["A101", "A201"], description: "Sheet id" };
const LINES = { type: "array", description: "Measured lines", items: { type: "object", properties: { conditionId: { type: "string" }, qty: { type: "number", description: "Drawn quantity in the condition's drawn unit" }, element: { type: "string" } }, required: ["conditionId", "qty"] } };
export const TOOLS = [
  { name: "find_rooms", title: "Find the rooms on a sheet", description: "Lists the rooms (or deck zones) the sheet shows, each with its outline in paper points, its finish and its area at the sheet's nominal scale. Or, given labels read off any drawing's text layer, matches room names and written dimensions (e.g. 3600 x 4200). Simulated.",
    inputSchema: { type: "object", properties: { sheet: { type: "string", description: "A101 or A201 for the demo geometry; any id with labels" }, labels: { type: "array", description: "Text read off a drawing: [{ text, x, y }] lines, or raw pdf.js-style items [{ str, x, y, w, h }] in page points, y down", items: { type: "object" } } } } },
  { name: "measure", title: "Measure an element", description: "Measures one named element on a sheet (a room's area, a wall's or joist's length, a count of doors or posts) under a scale in mm per paper point, and tags it with a condition. Omit scale to use the sheet's nominal scale.",
    inputSchema: { type: "object", properties: { sheet: SHEET, element: { type: "string", description: "Element id from find_rooms or from the sheet's element list (e.g. living, walls-3, doors, posts)" }, condition: { type: "string", description: "Condition id from the library; defaults from the element" }, mmPerPt: { type: "number", description: "Confirmed scale, mm of real world per paper point" } }, required: ["sheet", "element"] } },
  { name: "consent_check", title: "Does this need a building consent?", description: "Asks the Schedule 1 (Building Act 2004) questions for the work in scope and gives a likely answer per question, with the MBIE page to read. Illustrative: the council decides, never this tool.",
    inputSchema: { type: "object", properties: { sheet: SHEET, lines: LINES }, required: ["sheet"] } },
  { name: "code_checks", title: "NZ Building Code checks", description: "For each measured condition, the Building Code clauses to check (B1, B2, D1, E2, E3, F4, G4, G9, G12, G13, H1) with a one-line what-to-check and a building.govt.nz link, plus the H1 insulation schedule by climate zone. Illustrative, not a compliance determination.",
    inputSchema: { type: "object", properties: { sheet: SHEET, lines: LINES }, required: ["lines"] } },
  { name: "defect_register", title: "Common defects and risks", description: "Proposes the common NZ defects for the element types in scope (weathertightness at junctions, deck barriers, wet-area membranes, insulation gaps, cladding clearances…), each with a severity, a photo-check prompt and a fictional provisional sum. A person chooses which go into the quote.",
    inputSchema: { type: "object", properties: { sheet: SHEET, lines: LINES }, required: ["lines"] } },
  { name: "price", title: "Price the lines (simple)", description: "Prices measured lines from the rates given (material and labour per unit, NZD), with markup on cost and 15% GST shown separately. Indicative only, never a quote. See quote for the full NZ maths.",
    inputSchema: { type: "object", properties: { lines: LINES, rates: { type: "object", description: "Overrides per condition id: { material, labour }" }, markupPct: { type: "number", default: 12 } }, required: ["lines"] } },
  { name: "quote", title: "NZ quote maths", description: "Full quote maths: m²/lm/ea quantities, materials with waste % by trade, labour as hours at the trade's hourly rate, preliminaries and general (P&G), margin, provisional sums listed on their own, 15% GST on the whole, validity 30 days. Every rate is the builder's own or an illustrative default; nothing here is a quote.",
    inputSchema: { type: "object", properties: { lines: LINES, rates: { type: "object" }, marginPct: { type: "number", default: 12 }, pgPct: { type: "number", default: 8 }, wastePct: { type: "object", description: "Per trade, %" }, tradeRates: { type: "object", description: "Per trade, NZD per hour ex GST" }, provisionalSums: { type: "array", items: { type: "object", properties: { id: { type: "string" }, title: { type: "string" }, amount: { type: "number" } } } } }, required: ["lines"] } },
  { name: "variation", title: "Price a variation", description: "Re-measures the elements a change adds or removes, re-runs the quote and returns the delta against the approved quote, as a variation record that waits for a person to approve. Simulated.",
    inputSchema: { type: "object", properties: { sheet: SHEET, quoteRef: { type: "string" }, add: { type: "array", items: { type: "object", properties: { element: { type: "string" }, condition: { type: "string" } } } }, remove: { type: "array", items: { type: "string" }, description: "Condition ids to drop" }, baseLines: LINES, mmPerPt: { type: "number" }, rates: { type: "object" }, marginPct: { type: "number" }, pgPct: { type: "number" }, provisionalSums: { type: "array", items: { type: "object" } } }, required: ["sheet", "add"] } },
  { name: "payment_claim", title: "Draft a progress payment claim (CCA 2002)", description: "Builds a progress payment claim against an approved quote: value of work to date, less previous claims and retention, plus GST, with the due date and payment-schedule deadline in working days (s 18, s 22), the s 20 requirements as a checklist, and the retention money rules as they apply (subpart 2A applies to commercial contracts only). Illustrative, not legal advice; a person approves before it is served.",
    inputSchema: { type: "object", properties: { quoteRef: { type: "string" }, contractValue: { type: "number", description: "Approved quote, NZD excl. GST" }, variationsValue: { type: "number", description: "Approved variations, excl. GST" }, claimNo: { type: "integer", default: 1 }, periodFrom: { type: "string", format: "date" }, periodTo: { type: "string", format: "date" }, percentComplete: { type: "number", minimum: 0, maximum: 100 }, previouslyClaimed: { type: "number", description: "Excl. GST" }, retentionPct: { type: "number", default: 0 }, residentialOccupier: { type: "boolean", default: true }, served: { type: "string", format: "date" }, region: { type: "string", enum: ["Auckland", "Wellington", "Canterbury"], description: "For the anniversary day in working days" }, contractDueDays: { type: "integer" }, contractScheduleDays: { type: "integer" } }, required: ["contractValue", "percentComplete"] } },
  { name: "draft_bid", title: "Draft the quote", description: "Assembles a quote record for a person to approve: scope, priced lines by trade with hours, waste, P&G, margin, provisional sums, GST, inclusions, exclusions, terms and the authority level 'act with approval'. Drafting sends nothing; a named person approves before any quote leaves.",
    inputSchema: { type: "object", properties: { sheet: { type: "string" }, scope: { type: "string" }, lines: LINES, rates: { type: "object" }, marginPct: { type: "number" }, markupPct: { type: "number" }, pgPct: { type: "number" }, provisionalSums: { type: "array", items: { type: "object" } }, customer: { type: "string" } }, required: ["sheet", "lines"] } },
];

export function callTool(name, args = {}) {
  const sheet = sheetById(args.sheet);
  switch (name) {
    case "find_rooms": {
      if (Array.isArray(args.labels)) {   // rooms read off a drawing's text layer (any PDF), not the demo geometry
        const lab = args.labels.length && "str" in (args.labels[0] || {}) ? labelsFromTextItems(args.labels) : args.labels;
        const r = roomsFromLabels(lab), known = sheet ? sheet.rooms : [];
        const rooms = r.rooms.map((x, i) => { const k = known.find((s) => s.name.toLowerCase().replace(/[^a-z0-9]/g, "") === x.name.toLowerCase().replace(/[^a-z0-9]/g, "")); return { id: k ? k.id : `label-${i + 1}`, name: x.name, source: "text layer", atPt: [x.x, x.y], ...(x.dims ? { dims: x.dims, areaM2: x.areaM2 } : {}), ...(x.finish ? { finish: x.finish, conditionId: finishCondition[x.finish] || null } : {}), ...(k ? { matchesSheetRoom: k.id } : {}) }; });
        const area = round(rooms.reduce((s, x) => s + (x.areaM2 || 0), 0), 1);
        return { text: rooms.length ? `${rooms.length} room labels read off the drawing${rooms.some((x) => x.areaM2) ? `, ${rooms.filter((x) => x.areaM2).length} with dimensions (${area} m² by the written sizes)` : ""}. Names and sizes are as written on the drawing; a person checks them. Simulated.` : "No room names found in the text given. If the drawing is scanned there is no text layer: mark rooms by hand.",
          structuredContent: { truth: "Simulated", source: "text layer", sheet: sheet ? sheet.id : args.sheet || null, labelsRead: lab.length, rooms, unmatchedDimensions: r.unmatchedDimensions, note: "Areas come from the dimension strings written on the drawing, not from measured geometry." } };
      }
      if (!sheet) return fail(`Unknown sheet: ${args.sheet}. Demo sheets: A101, A201, or pass labels read off any drawing.`);
      const mm = nominalMmPerPt(sheet);
      const rooms = sheet.rooms.map((r) => { const pts = polyToPt(sheet, r.poly); return { id: r.id, name: r.name, finish: r.finish, conditionId: finishCondition[r.finish] || null, areaM2: round(quantity("area", pts, mm)), perimeterM: round(quantity("length", [...pts, pts[0]], mm)), outlinePt: pts.map((p) => p.map((v) => round(v, 1))) }; });
      return { text: `${rooms.length} ${sheet.id === "A201" ? "zones" : "rooms"} on ${sheet.id} (${sheet.title}), ${round(rooms.reduce((s, r) => s + r.areaM2, 0), 1)} m² at the sheet's nominal 1:${sheet.scale}. Simulated plan.`,
        structuredContent: { truth: "Simulated", sheet: sheet.id, title: sheet.title, nominalScale: `1:${sheet.scale}`, mmPerPt: round(mm, 4), scaleStatus: "nominal · a person confirms the scale before measuring", rooms, otherElements: elementsOf(sheet).filter((e) => e.kind !== "area").map((e) => ({ id: e.id, name: e.name, kind: e.kind, conditionId: e.conditionId, runs: isMulti(e.pts) ? e.pts.length : 1, count: e.kind === "count" ? e.pts.length : undefined })) } };
    }
    case "measure": {
      if (!sheet) return fail(`Unknown sheet: ${args.sheet}`);
      const el = elementsOf(sheet).find((e) => e.id === args.element) || legacyElement(sheet, args.element);
      if (!el) return fail(`Unknown element ${args.element} on ${sheet.id}`, { elements: elementsOf(sheet).map((e) => e.id) });
      const mm = typeof args.mmPerPt === "number" && args.mmPerPt > 0 ? args.mmPerPt : nominalMmPerPt(sheet);
      const condId = args.condition || el.conditionId || finishCondition[el.finish] || null, c = condition(condId);
      const kind = el.kind === "area" && c && c.measure === "length" ? "length" : el.kind;          // a room tagged with skirting measures its perimeter
      const pts = kind === "length" && el.kind === "area" ? [...el.pts, el.pts[0]] : el.pts;
      const qty = round(quantity(kind, pts, mm));
      const unit = kind === "count" ? "EA" : kind === "length" ? "m" : "m²";
      return { text: `${el.name}: ${qty} ${unit}${c ? ` · ${c.name}${c.factor ? ` → ${round(qty * c.factor)} ${c.unit}` : ""}` : ""} · scale ${args.mmPerPt ? "confirmed" : "nominal"}. Simulated.`,
        structuredContent: { truth: "Simulated", sheet: sheet.id, element: el.id, name: el.name, kind, qty, unit, conditionId: condId, condition: c ? c.name : null, pricedQty: c ? round(qty * (c.factor || 1)) : qty, pricedUnit: c ? c.unit : unit, mmPerPt: round(mm, 4), scaleStatus: args.mmPerPt ? "confirmed by a person" : "nominal", points: isMulti(pts) ? pts.map((run) => run.map((p) => p.map((v) => round(v, 1)))) : pts.map((p) => p.map((v) => round(v, 1))) } };
    }
    case "consent_check": {
      if (!sheet) return fail(`Unknown sheet: ${args.sheet}`);
      const r = consentCheck(sheet.id, args.lines || []);
      return { text: `${r.verdict} ${r.questions.length} questions. ${NZ_TRUTH}.`, structuredContent: r };
    }
    case "code_checks": {
      if (!Array.isArray(args.lines)) return fail("code_checks needs lines: [{ conditionId, qty }]");
      const r = codeChecks(args.lines, args.sheet);
      return { text: `${r.checks.length} checks across ${r.byClause.map((g) => g.clause).join(", ") || "no clauses"} for ${new Set(args.lines.map((l) => l.conditionId)).size} conditions. ${NZ_TRUTH}.`, structuredContent: r };
    }
    case "defect_register": {
      if (!Array.isArray(args.lines)) return fail("defect_register needs lines");
      const r = defectRegister(args.lines, args.sheet);
      return { text: `${r.count} common defects to check (${r.register.filter((d) => d.severity === "high").length} high). The agent proposes ${r.register.filter((d) => d.proposed).length} as provisional sums; a person decides. ${NZ_TRUTH}.`, structuredContent: r };
    }
    case "quote": {
      if (!Array.isArray(args.lines)) return fail("quote needs lines: [{ conditionId, qty }]");
      const q = quote(args);
      return { text: `${q.lines.length} lines · ${q.hours} labour hours · cost $${q.cost.toLocaleString("en-NZ")} (incl. $${q.waste.toLocaleString("en-NZ")} waste) + P&G ${q.pgPct}% + margin ${q.marginPct}%${q.provisional ? ` + provisional sums $${q.provisional.toLocaleString("en-NZ")}` : ""} = $${q.subtotal.toLocaleString("en-NZ")} excl. GST · GST $${q.gst.toLocaleString("en-NZ")} · $${q.total.toLocaleString("en-NZ")} incl. GST · valid 30 days. Indicative only, not a quote. Simulated.`, structuredContent: q };
    }
    case "variation": {
      if (!sheet) return fail(`Unknown sheet: ${args.sheet}`);
      if (!Array.isArray(args.add)) return fail("variation needs add: [{ element, condition }]");
      const v = variation({ ...args, sheet });
      if (v.error) return fail(v.error);
      return { text: `Variation ${v.ref}: ${v.added.length} line${v.added.length === 1 ? "" : "s"} added, ${v.removed.length} removed · ${v.delta.total >= 0 ? "+" : "−"}$${Math.abs(v.delta.total).toLocaleString("en-NZ")} incl. GST on ${v.quoteRef || "the quote"}. Waits for a named person. Simulated.`, structuredContent: v };
    }
    case "payment_claim": {
      const c = paymentClaim(args);
      if (c.error) return fail(c.error);
      return { text: `Payment claim ${c.ref}: ${c.calc.percentComplete}% complete, this claim $${c.calc.thisClaim.toLocaleString("en-NZ")} less retention $${c.calc.retention.toLocaleString("en-NZ")}, plus GST $${c.calc.gst.toLocaleString("en-NZ")} = $${c.calc.claimed.toLocaleString("en-NZ")} incl. GST. Due ${c.dueDate}; payment schedule by ${c.scheduleBy}. ${LEGAL_TRUTH}. Simulated; a person approves before it is served.`, structuredContent: c };
    }
    case "price": {
      if (!Array.isArray(args.lines)) return fail("price needs lines: [{ conditionId, qty }]");
      const p = price(args.lines, args.rates || {}, typeof args.markupPct === "number" ? args.markupPct : 12);
      return { text: `${p.lines.length} lines · cost $${p.cost.toLocaleString("en-NZ")} + ${p.markupPct}% markup = $${p.subtotal.toLocaleString("en-NZ")} · GST $${p.gst.toLocaleString("en-NZ")} · $${p.total.toLocaleString("en-NZ")} incl. GST. Indicative only, not a quote. Simulated rates.`, structuredContent: p };
    }
    case "draft_bid": {
      if (!sheet) return fail(`Unknown sheet: ${args.sheet}`);
      if (!Array.isArray(args.lines)) return fail("draft_bid needs lines");
      const bid = draftBid({ sheet, lines: args.lines, rates: args.rates, marginPct: args.marginPct ?? args.markupPct, pgPct: args.pgPct, provisionalSums: args.provisionalSums, scope: args.scope, customer: args.customer });
      return { text: `Quote ${bid.ref} drafted for ${bid.customer}: ${bid.scope}, $${bid.pricing.total.toLocaleString("en-NZ")} incl. GST, ${bid.pricing.lines.length} lines, ${bid.pricing.hours} h. Status draft: it waits for a named person to approve. Simulated.`, structuredContent: bid };
    }
    default: return fail(`Unknown tool: ${name}`);
  }
}
const fail = (msg, data) => ({ text: msg, structuredContent: { truth: "Simulated", error: msg, ...(data || {}) }, isError: true });

export function draftBid({ sheet, lines, rates, marginPct, markupPct, pgPct, provisionalSums, scope, customer, seq = 1, now, wastePct, tradeRates }) {
  const pricing = quote({ lines, rates: rates || {}, marginPct: typeof marginPct === "number" ? marginPct : typeof markupPct === "number" ? markupPct : DEFAULT_QUOTE.marginPct, pgPct, provisionalSums, wastePct, tradeRates });
  const trades = pricing.byTrade.map((t) => t.trade);
  return { schema: "assembl.takeoff-quote/1", truth: "Simulated", label: "Indicative only · not a quote", status: "draft", ref: `Q-${sheet.id}-${String(seq).padStart(3, "0")}`,
    project: PLANS.project.name, customer: customer || PLANS.project.client, builder: PLANS.project.builder, sheet: sheet.id, sheetTitle: sheet.title,
    scope: scope || `${trades.join(", ")} per sheet ${sheet.id}`, pricing,
    inclusions: ["Materials and labour as listed, with waste and P&G", "Site clean and waste removal for these trades", "Provisional sums as listed, charged at cost with the record", "GST at 15% shown separately"],
    exclusions: EXCLUSIONS, terms: QUOTE_TERMS,
    authority: "act with approval", requiresApproval: true, validDays: 30, ...(now ? { draftedAt: now } : {}) };
}

// a variation: measure what the change adds, drop what it removes, re-quote, and report the delta against the approved quote
export function variation({ sheet, quoteRef, add = [], remove = [], baseLines = [], mmPerPt, rates, marginPct, pgPct, provisionalSums, seq = 1, now, wastePct, tradeRates }) {
  if (!sheet) return { error: "variation needs a sheet" };
  const mm = typeof mmPerPt === "number" && mmPerPt > 0 ? mmPerPt : nominalMmPerPt(sheet);
  const added = [];
  for (const a of add) { const r = callTool("measure", { sheet: sheet.id, element: a.element, condition: a.condition, mmPerPt: mm }); if (r.isError) return { error: r.text }; const m = r.structuredContent; added.push({ element: m.element, name: m.name, conditionId: m.conditionId, qty: m.qty, unit: m.unit, points: m.points, kind: m.kind }); }
  const kept = baseLines.filter((l) => !remove.includes(l.conditionId)), removed = baseLines.filter((l) => remove.includes(l.conditionId));
  const opts = { rates: rates || {}, marginPct, pgPct, provisionalSums, wastePct, tradeRates };
  const before = quote({ lines: baseLines, ...opts }), after = quote({ lines: [...kept, ...added.map((a) => ({ conditionId: a.conditionId, qty: a.qty, element: a.element }))], ...opts });
  const d = (k) => round(after[k] - before[k]);
  return { schema: "assembl.takeoff-variation/1", truth: "Simulated", ref: `${quoteRef || "Q-" + sheet.id}-V${String(seq).padStart(2, "0")}`, quoteRef: quoteRef || null, sheet: sheet.id, added, removed: removed.map((l) => l.conditionId), lines: after.lines, mmPerPt: round(mm, 4),
    delta: { cost: d("cost"), hours: round(after.hours - before.hours, 1), pg: d("pg"), margin: d("margin"), subtotal: d("subtotal"), gst: d("gst"), total: d("total") }, before: { subtotal: before.subtotal, total: before.total }, after: { subtotal: after.subtotal, total: after.total },
    status: "draft", authority: "act with approval", requiresApproval: true, ...(now ? { draftedAt: now } : {}) };
}

// canonical JSON for hashing (sorted keys, no undefined), the same in browser and node
export const canon = (v) => v === null || typeof v !== "object" ? JSON.stringify(v) : Array.isArray(v) ? `[${v.map(canon).join(",")}]` : `{${Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(",")}}`;
