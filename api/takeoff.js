// assembl lab · trades twin: the takeoff MCP endpoint. Stateless Model Context Protocol server over Streamable HTTP, the same
// conventions as /api/mcp.js (the cars endpoint): POST one JSON-RPC 2.0 message (a batch array is accepted), JSON responses,
// no SSE stream, no sessions, no auth, CORS open, no dependencies. GET / DELETE answer 405; OPTIONS is the CORS preflight.
// Tools: find_rooms, measure, consent_check, code_checks, defect_register, price, quote, variation, draft_bid: all pure functions
// over the two Simulated demo sheets (trades/js/plans-data.js) and the Illustrative NZ reference data (trades/js/nz-code.js);
// draft_bid and variation return drafts that a named person approves on the desk: nothing here sends, stores or quotes anything.
// Resources: the plan data, the condition library, the NZ reference data and the two sheet PDFs' URLs.
import { createHash } from "node:crypto";
import { TOOLS, callTool, PLANS, CONDITIONS, GST, VERSION, canon, CLAUSES, H1_SCHEDULE, H1_ZONES, CONSENT_QUESTIONS, CODE_CHECKS, DEFECTS, TRADE_RATES, WASTE_PCT, NZ_TRUTH, NZ_REF_DATE } from "../trades/js/takeoff-core.js";

export const MODERN = ["2026-07-28"];
export const LEGACY = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
export const SUPPORTED = [...MODERN, ...LEGACY];
const PV = "io.modelcontextprotocol/protocolVersion";
const SITE_URL = "https://assembl-lab.vercel.app";
const SERVER_INFO = { name: "assembl-takeoff-twin", title: "Plan takeoff (assembl lab demo)", version: VERSION, websiteUrl: `${SITE_URL}/trades/` };
export const INSTRUCTIONS = "An assembl lab demonstration: Lot 12 Kōwhai Rise, its two sheets (A101 floor plan, A201 deck and pergola) and every rate are Simulated and fictional, so never present a figure as a real price. " +
  "A person confirms the scale before a measurement counts; find_rooms and measure default to the sheet's nominal scale and say so. " +
  "price, quote and draft_bid are indicative only, never a quote; draft_bid and variation return drafts that a named person at the builder approves before anything leaves. " +
  "consent_check, code_checks and defect_register are Illustrative readings of public MBIE guidance, not a compliance determination: the council and a licensed practitioner decide. Units are metric; GST is 15% and shown separately on the whole.";
const CAPS = { tools: { listChanged: false }, resources: { subscribe: false, listChanged: false }, prompts: { listChanged: false } };
const CORS = {
  "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, GET, OPTIONS, DELETE",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, MCP-Protocol-Version, Mcp-Session-Id, Mcp-Method, Mcp-Name, Last-Event-ID",
  "Access-Control-Expose-Headers": "MCP-Protocol-Version", "Access-Control-Max-Age": "86400",
};
const RESOURCES = [
  { uri: "takeoff://plans", name: "plans", title: "The two demo sheets as data (Simulated)", description: "Rooms, walls, doors, windows, framing: real millimetres with the paper origin and scale of each sheet.", mimeType: "application/json" },
  { uri: "takeoff://conditions", name: "conditions", title: "Condition library (NZ, metric, fictional rates)", description: "Each condition's trade, what is drawn, the priced unit and factor, and indicative material and labour rates.", mimeType: "application/json" },
  { uri: "takeoff://nz-code", name: "nz-code", title: "NZ reference data (Illustrative)", description: "Building Code clauses with links, the H1 insulation schedule by climate zone, Schedule 1 consent questions, the defect register, and illustrative trade rates and waste percentages.", mimeType: "application/json" },
  { uri: "takeoff://sheets", name: "sheets", title: "Sheet PDFs", description: "URLs of the two one-page A3 PDFs the desk renders with pdf.js.", mimeType: "application/json" },
];

const ok = (id, result) => ({ jsonrpc: "2.0", id, result });
const err = (id, code, message, data) => ({ jsonrpc: "2.0", id: id === undefined ? null : id, error: { code, message, ...(data !== undefined ? { data } : {}) } });
class RpcError extends Error { constructor(code, message, data, http) { super(message); this.code = code; this.data = data; this.http = http; } }

function readResource(uri) {
  if (uri === "takeoff://plans") return { uri, mimeType: "application/json", text: JSON.stringify(PLANS) };
  if (uri === "takeoff://conditions") return { uri, mimeType: "application/json", text: JSON.stringify({ truth: "Simulated", label: "Indicative only · not a quote", gst: GST, conditions: CONDITIONS }) };
  if (uri === "takeoff://nz-code") return { uri, mimeType: "application/json", text: JSON.stringify({ truth: NZ_TRUTH, asAt: NZ_REF_DATE, clauses: CLAUSES, h1: { zones: H1_ZONES, schedule: H1_SCHEDULE }, consentQuestions: CONSENT_QUESTIONS, codeChecks: CODE_CHECKS, defects: DEFECTS, tradeRates: TRADE_RATES, wastePct: WASTE_PCT }) };
  if (uri === "takeoff://sheets") return { uri, mimeType: "application/json", text: JSON.stringify({ truth: "Simulated", sheets: PLANS.sheets.map((s) => ({ id: s.id, title: s.title, nominalScale: `1:${s.scale}`, paper: s.paper, url: `${SITE_URL}/trades/${s.file}` })) }) };
  throw new RpcError(-32002, "Resource not found", { uri });
}

async function dispatch(msg, modern, now) {
  const p = msg.params || {};
  const meta = modern ? { _meta: { "io.modelcontextprotocol/serverInfo": { name: SERVER_INFO.name, version: VERSION } } } : {};
  const list = modern ? { resultType: "complete", ttlMs: 3600000, cacheScope: "public" } : {};
  const done = modern ? { resultType: "complete" } : {};
  switch (msg.method) {
    case "initialize": {
      if (typeof p.protocolVersion !== "string") throw new RpcError(-32602, "Invalid params: initialize needs params.protocolVersion");
      const v = LEGACY.includes(p.protocolVersion) ? p.protocolVersion : LEGACY[0];
      return { protocolVersion: v, capabilities: CAPS, serverInfo: SERVER_INFO, instructions: INSTRUCTIONS };
    }
    case "server/discover":
      return { resultType: "complete", supportedVersions: MODERN, capabilities: CAPS, instructions: INSTRUCTIONS, ttlMs: 3600000, cacheScope: "public", _meta: { "io.modelcontextprotocol/serverInfo": SERVER_INFO } };
    case "ping": return { ...done, ...meta };
    case "tools/list": return { tools: TOOLS, ...list, ...meta };
    case "tools/call": {
      if (typeof p.name !== "string") throw new RpcError(-32602, "Invalid params: tools/call needs params.name");
      if (p.arguments != null && (typeof p.arguments !== "object" || Array.isArray(p.arguments))) throw new RpcError(-32602, "Invalid params: params.arguments must be an object");
      if (!TOOLS.find((t) => t.name === p.name)) throw new RpcError(-32602, `Unknown tool: ${p.name}`, { tools: TOOLS.map((t) => t.name) });
      const r = callTool(p.name, p.arguments || {});
      const extra = {};
      if ((p.name === "draft_bid" || p.name === "variation") && !r.isError) { // the draft's hash rides in _meta, so an approver can check what they approved
        r.structuredContent.draftedAt = now.toISOString();
        extra._meta = { "assembl/bidHash": createHash("sha256").update(canon(r.structuredContent)).digest("hex"), "assembl/authority": "act with approval" };
      }
      return { content: [{ type: "text", text: r.text }], structuredContent: r.structuredContent, isError: !!r.isError, ...extra, ...done, ...meta };
    }
    case "resources/list": return { resources: RESOURCES, ...list, ...meta };
    case "resources/templates/list": return { resourceTemplates: [], ...list, ...meta };
    case "resources/read": {
      if (typeof p.uri !== "string") throw new RpcError(-32602, "Invalid params: resources/read needs params.uri");
      return { contents: [readResource(p.uri)], ...done, ...meta };
    }
    case "prompts/list": return { prompts: [], ...list, ...meta };
    case "logging/setLevel": return { ...done, ...meta };
    default: throw new RpcError(-32601, `Method not found: ${msg.method}`, undefined, modern ? 404 : 200);
  }
}

// Transport-free core: { method, headers, body } → { status, headers, body }. Used by the Vercel handler and the tests.
export async function handleTakeoff({ method = "POST", headers = {}, body } = {}, now = new Date()) {
  const H = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), Array.isArray(v) ? v[0] : v]));
  const json = (status, obj, extra = {}) => ({ status, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extra }, body: obj === null ? "" : JSON.stringify(obj) });
  if (method === "OPTIONS") return { status: 204, headers: { ...CORS }, body: "" };
  if (method !== "POST") return json(405, { error: "Method not allowed", hint: `This is an MCP endpoint (Streamable HTTP, JSON responses, no SSE stream and no sessions). POST JSON-RPC 2.0 here. How to connect: ${SITE_URL}/trades/#agent-ready` }, { Allow: "POST, OPTIONS" });
  let msg = body;
  if (typeof msg === "string" || (msg && typeof msg === "object" && typeof msg.byteLength === "number" && !Array.isArray(msg))) {
    try { msg = JSON.parse(typeof msg === "string" ? msg : new TextDecoder().decode(msg)); } catch (e) { return json(400, err(null, -32700, "Parse error: the body isn't JSON")); }
  }
  if (msg == null || msg === "") return json(400, err(null, -32600, "Invalid Request: empty body"));
  const hdrVer = H["mcp-protocol-version"];
  if (Array.isArray(msg)) {
    if (!msg.length) return json(400, err(null, -32600, "Invalid Request: empty batch"));
    const out = [];
    for (const m of msg) { const r = await one(m, hdrVer, H, now); if (r.body) out.push(r.obj); }
    return out.length ? json(200, out) : { status: 202, headers: { ...CORS }, body: "" };
  }
  const r = await one(msg, hdrVer, H, now);
  return r.body ? json(r.status, r.obj, r.version ? { "MCP-Protocol-Version": r.version } : {}) : { status: 202, headers: { ...CORS }, body: "" };
}

async function one(msg, hdrVer, H, now) {
  const reply = (status, obj, version) => ({ status, obj, body: true, version });
  if (!msg || typeof msg !== "object" || msg.jsonrpc !== "2.0") return reply(400, err(msg && msg.id, -32600, "Invalid Request: expected a JSON-RPC 2.0 object"));
  if (msg.method === undefined && ("result" in msg || "error" in msg)) return { status: 202, body: false };
  if (typeof msg.method !== "string") return reply(400, err(msg.id, -32600, "Invalid Request: method must be a string"));
  if (msg.params !== undefined && (typeof msg.params !== "object" || msg.params === null || Array.isArray(msg.params))) return reply(400, err(msg.id, -32602, "Invalid params: params must be an object"));
  const metaVer = msg.params && msg.params._meta && msg.params._meta[PV];
  const modern = msg.method !== "initialize" && (metaVer !== undefined || MODERN.includes(hdrVer));
  if (modern) {
    if (!metaVer) return reply(400, err(msg.id, -32020, `HeaderMismatch: MCP-Protocol-Version is ${hdrVer} but params._meta["${PV}"] is missing`));
    if (hdrVer && hdrVer !== metaVer) return reply(400, err(msg.id, -32020, `HeaderMismatch: MCP-Protocol-Version header (${hdrVer}) doesn't match params._meta["${PV}"] (${metaVer})`));
    if (H["mcp-method"] && H["mcp-method"] !== msg.method) return reply(400, err(msg.id, -32020, `HeaderMismatch: Mcp-Method header (${H["mcp-method"]}) doesn't match the body (${msg.method})`));
    if (!MODERN.includes(metaVer)) return reply(400, { jsonrpc: "2.0", id: msg.id ?? null, error: { code: -32022, message: "Unsupported protocol version", data: { supported: SUPPORTED, requested: metaVer } } });
  } else if (hdrVer && !SUPPORTED.includes(hdrVer)) {
    return reply(400, err(msg.id, -32600, `Unsupported MCP-Protocol-Version header: ${hdrVer}. Supported: ${SUPPORTED.join(", ")}`));
  }
  if (msg.id === undefined) return { status: 202, body: false }; // notifications: accepted, no body
  try {
    const result = await dispatch(msg, modern, now);
    return reply(200, ok(msg.id, result), msg.method === "initialize" ? result.protocolVersion : modern ? metaVer : undefined);
  } catch (e) {
    if (e instanceof RpcError) return reply(e.http || 200, err(msg.id, e.code, e.message, e.data));
    return reply(500, err(msg.id, -32603, "Internal error: " + String(e?.message || e).slice(0, 160)));
  }
}

// Vercel Node function (same shape as /api/mcp.js).
export default async function handler(req, res) {
  let body;
  try { body = req.body; } catch (e) { body = "\u0000not json"; }
  if (body === undefined && req.method === "POST" && typeof req.on === "function") {
    body = await new Promise((resolve) => { const chunks = []; req.on("data", (c) => chunks.push(c)); req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8"))); req.on("error", () => resolve("")); });
  }
  const out = await handleTakeoff({ method: req.method, headers: req.headers || {}, body });
  for (const [k, v] of Object.entries(out.headers)) res.setHeader(k, v);
  res.statusCode = out.status;
  res.end(out.body);
}
