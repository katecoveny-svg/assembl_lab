// assembl lab · trades twin. Pure takeoff logic shared by the desk in the browser and the stateless endpoint (api/takeoff.js):
// unit conversion, polygon geometry, the condition library's pricing, and the four tools (find_rooms, measure, price, draft_bid).
// No DOM, no network, no state. Everything it returns is labelled Simulated.
import { PLANS, CONDITIONS, TRADES, GST, MM_PER_PT } from "./plans-data.js";

export { PLANS, CONDITIONS, TRADES, GST, MM_PER_PT };
export const VERSION = "0.1.0";
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

// ---------------------------------------------------------------- the four tools
export const TOOLS = [
  { name: "find_rooms", title: "Find the rooms on a sheet", description: "Lists the rooms (or deck zones) the sheet shows, each with its outline in paper points, its finish and its area at the sheet's nominal scale. Simulated: the two demo sheets only.",
    inputSchema: { type: "object", properties: { sheet: { type: "string", enum: ["A101", "A201"], description: "Sheet id" } }, required: ["sheet"] } },
  { name: "measure", title: "Measure an element", description: "Measures one named element on a sheet (a room's area, a wall's or joist's length, a count of doors or posts) under a scale in mm per paper point, and tags it with a condition. Omit scale to use the sheet's nominal scale.",
    inputSchema: { type: "object", properties: { sheet: { type: "string", enum: ["A101", "A201"] }, element: { type: "string", description: "Element id from find_rooms or from the sheet's element list (e.g. living, walls-3, doors, posts)" }, condition: { type: "string", description: "Condition id from the library; defaults from the element" }, mmPerPt: { type: "number", description: "Confirmed scale, mm of real world per paper point" } }, required: ["sheet", "element"] } },
  { name: "price", title: "Price the lines", description: "Prices measured lines from the rates given (material and labour per unit, NZD), with markup on cost and 15% GST shown separately. Indicative only, never a quote.",
    inputSchema: { type: "object", properties: { lines: { type: "array", items: { type: "object", properties: { conditionId: { type: "string" }, qty: { type: "number" } }, required: ["conditionId", "qty"] } }, rates: { type: "object", description: "Overrides per condition id: { material, labour }" }, markupPct: { type: "number", default: 12 } }, required: ["lines"] } },
  { name: "draft_bid", title: "Draft the bid", description: "Assembles a bid record for a person to approve: scope, priced lines by trade, inclusions, exclusions, and the authority level 'act with approval'. Drafting sends nothing; a named person approves before any bid leaves.",
    inputSchema: { type: "object", properties: { sheet: { type: "string" }, scope: { type: "string" }, lines: { type: "array", items: { type: "object" } }, rates: { type: "object" }, markupPct: { type: "number" }, customer: { type: "string" } }, required: ["sheet", "lines"] } },
];

export function callTool(name, args = {}) {
  const sheet = sheetById(args.sheet);
  switch (name) {
    case "find_rooms": {
      if (!sheet) return fail(`Unknown sheet: ${args.sheet}. Demo sheets: A101, A201.`);
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
    case "price": {
      if (!Array.isArray(args.lines)) return fail("price needs lines: [{ conditionId, qty }]");
      const p = price(args.lines, args.rates || {}, typeof args.markupPct === "number" ? args.markupPct : 12);
      return { text: `${p.lines.length} lines · cost $${p.cost.toLocaleString("en-NZ")} + ${p.markupPct}% markup = $${p.subtotal.toLocaleString("en-NZ")} · GST $${p.gst.toLocaleString("en-NZ")} · $${p.total.toLocaleString("en-NZ")} incl. GST. Indicative only, not a quote. Simulated rates.`, structuredContent: p };
    }
    case "draft_bid": {
      if (!sheet) return fail(`Unknown sheet: ${args.sheet}`);
      if (!Array.isArray(args.lines)) return fail("draft_bid needs lines");
      const bid = draftBid({ sheet, lines: args.lines, rates: args.rates, markupPct: args.markupPct, scope: args.scope, customer: args.customer });
      return { text: `Bid ${bid.ref} drafted for ${bid.customer}: ${bid.scope}, $${bid.pricing.total.toLocaleString("en-NZ")} incl. GST, ${bid.pricing.lines.length} lines. Status draft: it waits for a named person to approve. Simulated.`, structuredContent: bid };
    }
    default: return fail(`Unknown tool: ${name}`);
  }
}
const fail = (msg, data) => ({ text: msg, structuredContent: { truth: "Simulated", error: msg, ...(data || {}) }, isError: true });

export function draftBid({ sheet, lines, rates, markupPct = 12, scope, customer, seq = 1, now }) {
  const pricing = price(lines, rates || {}, markupPct);
  const trades = pricing.byTrade.map((t) => t.trade);
  return { schema: "assembl.takeoff-bid/1", truth: "Simulated", label: "Indicative only · not a quote", status: "draft", ref: `BID-${sheet.id}-${String(seq).padStart(3, "0")}`,
    project: PLANS.project.name, customer: customer || PLANS.project.client, builder: PLANS.project.builder, sheet: sheet.id, sheetTitle: sheet.title,
    scope: scope || `${trades.join(", ")} per sheet ${sheet.id}`, pricing,
    inclusions: ["Materials and labour as listed", "Site clean and waste removal for these trades", "GST at 15% shown separately"],
    exclusions: ["Consent fees and engineering", "Anything not drawn on the sheet", "Variations after approval, priced separately"],
    authority: "act with approval", requiresApproval: true, validDays: 30, ...(now ? { draftedAt: now } : {}) };
}

// canonical JSON for hashing (sorted keys, no undefined), the same in browser and node
export const canon = (v) => v === null || typeof v !== "object" ? JSON.stringify(v) : Array.isArray(v) ? `[${v.map(canon).join(",")}]` : `{${Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(",")}}`;
