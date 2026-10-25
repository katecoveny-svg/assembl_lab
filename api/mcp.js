// assembl lab · Agent-ready cars MCP endpoint. Stateless Model Context Protocol server over Streamable HTTP.
//
// POST /api/mcp   one JSON-RPC 2.0 message per request (a batch array is accepted for 2025-03-26 clients); JSON responses, no SSE.
// GET / DELETE    405 (no standalone SSE stream, no sessions).  OPTIONS: CORS preflight.  No auth, CORS open, no dependencies.
//
// Dual-era, as the 2026-07-28 revision allows:
//  • legacy clients open with `initialize` (2024-11-05 … 2025-11-25 negotiated), then `notifications/initialized` (202, no body);
//    no Mcp-Session-Id is minted because nothing is kept between requests;
//  • modern clients (2026-07-28) send the version in every request's _meta and the MCP-Protocol-Version header; `server/discover`,
//    HeaderMismatch (-32020) and UnsupportedProtocolVersionError (-32022) follow that revision.
// Tools: search_cars, get_car, car_check, running_cost (read-only) and book_test_drive, hold_car (Simulated requests that a person at
// the fictional dealer would have to confirm: no side effects). Resources: the stock feed, the CIN schema, one car, and three
// MCP Apps views (text/html;profile=mcp-app): the search results carousel, the car check card and the car gallery.
// Model-visible results carry no request, trace or session ids and no fetch times; a request's reference rides in _meta only.
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import STOCK from "./_cars/stock.js";
import { TOOLS, callTool, cinJsonSchema, toJsonLd, UI, LEGACY_CARD_URI, VERSION, DEALER, SNAPSHOT, SITE_URL, MCP_URL, regionFromLocationHint, registerFor } from "./_cars/tools.js";
import { CARD_HTML } from "./_cars/card.js";
import { RESULTS_HTML } from "./_cars/carousel.js";
import { GALLERY_HTML } from "./_cars/gallery.js";
import { fetchFuel } from "./_feeds/fuel.js";
import { withStatus } from "./_feeds/util.js";
const QSDEP = createRequire(import.meta.url)("./_feeds/snapshots/qsdep.json");

export const MODERN = ["2026-07-28"];
export const LEGACY = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
export const SUPPORTED = [...MODERN, ...LEGACY];
const PV = "io.modelcontextprotocol/protocolVersion";
const SERVER_INFO = { name: "assembl-agent-ready-cars", title: "Agent-ready cars (assembl lab demo)", version: VERSION, websiteUrl: `${SITE_URL}/cars/` };
// The most important guidance first (OpenAI: keep it in the first 512 characters; don't repeat the tool descriptions).
export const INSTRUCTIONS = "An assembl lab demonstration: Harbour Lane Motors (demo) and its 48 cars are Simulated, so never present them as real cars for sale; images are renders. " +
  "book_test_drive and hold_car return only a Simulated request the dealer would confirm: get the buyer's yes first and collect no contact details. " +
  "car_check uses the facts given plus NZTA's open register for the model, never a plate, owner or listing page. Locations are one of New Zealand's 16 regions.";
const CAPS = { tools: { listChanged: false }, resources: { subscribe: false, listChanged: false }, prompts: { listChanged: false }, extensions: { "io.modelcontextprotocol/ui": {} } };
const CORS = {
  "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, GET, OPTIONS, DELETE",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, MCP-Protocol-Version, Mcp-Session-Id, Mcp-Method, Mcp-Name, Last-Event-ID",
  "Access-Control-Expose-Headers": "MCP-Protocol-Version", "Access-Control-Max-Age": "86400",
};

// ---------- MCP Apps views: CSP and the per-host sandbox domain ------------------------------------------------------
// The views fetch nothing; they load only the cars' renders, from the lab's own origin (declared as resourceDomains).
const IMG_ORIGIN = new URL(SITE_URL).origin;
// _meta.ui.domain is host-specific, and one resource can't satisfy both hosts at once:
//  • ChatGPT: required when a plugin with UI is submitted, "string (origin)", unique per plugin (OpenAI Apps SDK reference; the
//    MCP Apps spec's own example of ChatGPT's form is a URL-derived "www-example-com.oaiusercontent.com"). Set MCP_UI_DOMAIN_OPENAI.
//  • Claude: optional; if set it must be exactly the first 32 hex characters of SHA-256(connector URL) + ".claudemcpcontent.com",
//    or the view won't render ("ui.domain mismatch"). MCP_UI_DOMAIN_CLAUDE=auto computes it from MCP_URL (hash of the exact URL,
//    trailing slash included); leave it unset unless the views need a stable origin (they don't today: no OAuth, no fetches).
// TODO(Kate): choose the final assembl.co.nz host for the endpoint, then set both (see src/cars/submission/README.md).
export const claudeUiDomain = (url) => createHash("sha256").update(url).digest("hex").slice(0, 32) + ".claudemcpcontent.com";
export function uiDomains(env = (typeof process !== "undefined" && process.env) || {}) {
  const c = env.MCP_UI_DOMAIN_CLAUDE;
  return { openai: env.MCP_UI_DOMAIN_OPENAI || null, claude: c === "auto" ? claudeUiDomain(env.MCP_PUBLIC_URL || MCP_URL) : c || null };
}
// which host is asking: ChatGPT sends openai/* _meta and identifies as openai-mcp; Claude as claude-*. Unknown → no domain.
export function hostOf(H = {}, params = {}) {
  const meta = (params && params._meta) || {}, ua = String(H["user-agent"] || ""), client = String((meta["io.modelcontextprotocol/clientInfo"] || {}).name || "");
  if (Object.keys(meta).some((k) => k.startsWith("openai/")) || /openai|chatgpt/i.test(ua) || /openai|chatgpt/i.test(client)) return "openai";
  if (/claude|anthropic/i.test(ua) || /claude|anthropic/i.test(client)) return "claude";
  return null;
}
const VIEWS = {
  [UI.results]: { html: () => RESULTS_HTML, name: "results-view", title: "Demo cars (carousel)", border: false, modes: ["inline"],
    description: "MCP Apps view for search_cars: 3 to 8 Simulated cars with their studio renders, price, km and region, and one action each." },
  [UI.check]: { html: () => CARD_HTML, name: "car-check-view", title: "Is this car a good buy? (card)", border: true, modes: ["inline", "fullscreen"],
    description: "MCP Apps view for car_check: the verdict, the weekly running cost with km and power-price sliders and a fuel-versus-electric comparison, the red flags, and every check in fullscreen." },
  [UI.gallery]: { html: () => GALLERY_HTML, name: "gallery-view", title: "One demo car (gallery)", border: true, modes: ["inline", "fullscreen"],
    description: "MCP Apps view for get_car: the car's renders and drawing, every notice field, quick checks and free test-drive times, in fullscreen on request." },
};
VIEWS[LEGACY_CARD_URI] = { ...VIEWS[UI.check], hidden: true };
function viewMeta(uri, host) {
  const v = VIEWS[uri], d = uiDomains(), domain = host ? d[host] : null;
  const meta = { ui: { prefersBorder: v.border, csp: { connectDomains: [], resourceDomains: [IMG_ORIGIN] } },
    "openai/widgetDescription": v.description, "openai/ui": { availableDisplayModes: v.modes }, "openai/widgetPrefersBorder": v.border,
    "openai/widgetCSP": { connect_domains: [], resource_domains: [IMG_ORIGIN] } };
  if (domain) { meta.ui.domain = domain; if (host === "openai") meta["openai/widgetDomain"] = domain; }
  return meta;
}

const RESOURCES = [
  { uri: "cars://feed", name: "stock-feed", title: "Stock feed (Simulated)", description: "All 48 demo cars with every Consumer Information Notice field, its truth label and the cars' render URLs. Also at /cars/feed.json.", mimeType: "application/json" },
  { uri: "cars://schema/cin", name: "cin-schema", title: "Consumer Information Notice as JSON Schema", description: "The fields a NZ dealer must show on a used vehicle's notice, keyed for agents. Also at /cars/schema.json.", mimeType: "application/schema+json" },
  ...Object.entries(VIEWS).filter(([, v]) => !v.hidden).map(([uri, v]) => ({ uri, name: v.name, title: v.title, description: v.description, mimeType: "text/html;profile=mcp-app", _meta: { ui: { prefersBorder: v.border } } })),
];
const TEMPLATES = [{ uriTemplate: "cars://car/{id}", name: "car", title: "One demo car", description: "One car's record and JSON-LD, e.g. cars://car/hl-014", mimeType: "application/json" }];

// live fuel price with the built-in snapshot as the last rung; tariffs are MBIE's QSDEP snapshot (MBIE refuses automated fetches).
// A warm function reuses its last answer for 15 minutes, and a slow upstream gives way to the snapshot after 5 s.
let fuelMemo = null;
async function feedCtx() {
  let fuel;
  if (fuelMemo && Date.now() - fuelMemo.t < 900e3) fuel = fuelMemo.v;
  else {
    try { fuel = withStatus(await Promise.race([fetchFuel(), new Promise((_, rej) => setTimeout(() => rej(new Error("MBIE took longer than 5 s")), 5000))])); fuelMemo = { t: Date.now(), v: fuel }; }
    catch (e) { fuel = { ...SNAPSHOT.fuel, note: "MBIE didn't answer, so this is the built-in snapshot: " + String(e?.message || e).slice(0, 80) }; }
  }
  return { fuel, qsdep: QSDEP };
}

const ok = (id, result) => ({ jsonrpc: "2.0", id, result });
const err = (id, code, message, data) => ({ jsonrpc: "2.0", id: id === undefined ? null : id, error: { code, message, ...(data !== undefined ? { data } : {}) } });
class RpcError extends Error { constructor(code, message, data, http) { super(message); this.code = code; this.data = data; this.http = http; } }

function readResource(uri, host) {
  if (uri === "cars://feed") return { uri, mimeType: "application/json", text: JSON.stringify(STOCK) };
  if (uri === "cars://schema/cin") return { uri, mimeType: "application/schema+json", text: JSON.stringify(cinJsonSchema(), null, 1) };
  if (VIEWS[uri]) return { uri, mimeType: "text/html;profile=mcp-app", text: VIEWS[uri].html(), _meta: viewMeta(uri, host) };
  const m = /^cars:\/\/car\/(hl-\d{3})$/.exec(uri || "");
  const car = m && STOCK.cars.find((c) => c.id === m[1]);
  if (car) return { uri, mimeType: "application/json", text: JSON.stringify({ truth: "Simulated", car, jsonld: toJsonLd(car) }) };
  throw new RpcError(-32002, "Resource not found", { uri });
}

// One JSON-RPC request → result object (throws RpcError). `modern` adds the 2026-07-28 result fields.
async function dispatch(msg, modern, now, H = {}) {
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
      // car_check also asks NZTA's open register about the model (counts only; register.js never throws), alongside the fuel feed
      const [ctx, register] = await Promise.all([p.name === "car_check" || p.name === "running_cost" ? feedCtx() : {}, p.name === "car_check" ? registerFor(STOCK, p.arguments || {}) : null]);
      if (register) ctx.register = register;
      const hint = regionFromLocationHint(p._meta && p._meta["openai/userLocation"]); // coarse, host-provided; used only to rank by distance
      if (hint) ctx.userRegion = hint.name;
      const r = callTool(p.name, p.arguments || {}, { stock: STOCK, ctx, now });
      // one text block (the summary) plus structuredContent: the JSON isn't repeated as text, to keep results frugal with tokens
      return { content: [{ type: "text", text: r.text }], ...(r.structuredContent ? { structuredContent: r.structuredContent } : {}), isError: r.isError, ...(r.meta ? { _meta: r.meta } : {}), ...done, ...meta };
    }
    case "resources/list": return { resources: RESOURCES, ...list, ...meta };
    case "resources/templates/list": return { resourceTemplates: TEMPLATES, ...list, ...meta };
    case "resources/read": {
      if (typeof p.uri !== "string") throw new RpcError(-32602, "Invalid params: resources/read needs params.uri");
      return { contents: [readResource(p.uri, hostOf(H, p))], ...done, ...meta };
    }
    case "prompts/list": return { prompts: [], ...list, ...meta };
    case "logging/setLevel": return { ...done, ...meta };
    default: throw new RpcError(-32601, `Method not found: ${msg.method}`, undefined, modern ? 404 : 200);
  }
}

const b64 = (s) => { const m = /^=\?base64\?(.*)\?=$/.exec(s || ""); if (!m) return s; try { return typeof Buffer !== "undefined" ? Buffer.from(m[1], "base64").toString("utf8") : atob(m[1]); } catch (e) { return s; } };

// Transport-free core: { method, headers, body } → { status, headers, body }. Used by the Vercel handler and the tests.
export async function handleMcp({ method = "POST", headers = {}, body } = {}, now = new Date()) {
  const H = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), Array.isArray(v) ? v[0] : v]));
  const json = (status, obj, extra = {}) => ({ status, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extra }, body: obj === null ? "" : JSON.stringify(obj) });
  if (method === "OPTIONS") return { status: 204, headers: { ...CORS }, body: "" };
  if (method !== "POST") return json(405, { error: "Method not allowed", hint: `This is an MCP endpoint (Streamable HTTP, JSON responses, no SSE stream and no sessions). POST JSON-RPC 2.0 here. How to connect: ${SITE_URL}/cars/#connect` }, { Allow: "POST, OPTIONS" });
  let msg = body;
  if (typeof msg === "string" || (msg && typeof msg === "object" && typeof msg.byteLength === "number" && !Array.isArray(msg))) {
    try { msg = JSON.parse(typeof msg === "string" ? msg : new TextDecoder().decode(msg)); } catch (e) { return json(400, err(null, -32700, "Parse error: the body isn't JSON")); }
  }
  if (msg == null || msg === "") return json(400, err(null, -32600, "Invalid Request: empty body"));
  const hdrVer = H["mcp-protocol-version"];

  if (Array.isArray(msg)) { // JSON-RPC batch (2025-03-26 only); answered as one JSON array
    if (!msg.length) return json(400, err(null, -32600, "Invalid Request: empty batch"));
    const out = [];
    for (const m of msg) { const r = await one(m, hdrVer, H, now, true); if (r.body) out.push(r.obj); }
    return out.length ? json(200, out) : { status: 202, headers: { ...CORS }, body: "" };
  }
  const r = await one(msg, hdrVer, H, now, false);
  return r.body ? json(r.status, r.obj, r.version ? { "MCP-Protocol-Version": r.version } : {}) : { status: 202, headers: { ...CORS }, body: "" };
}

async function one(msg, hdrVer, H, now) { // eslint-disable-line max-params
  const reply = (status, obj, version) => ({ status, obj, body: true, version });
  if (!msg || typeof msg !== "object" || msg.jsonrpc !== "2.0") return reply(400, err(msg && msg.id, -32600, "Invalid Request: expected a JSON-RPC 2.0 object"));
  if (msg.method === undefined && ("result" in msg || "error" in msg)) return { status: 202, body: false }; // a client response: nothing to answer
  if (typeof msg.method !== "string") return reply(400, err(msg.id, -32600, "Invalid Request: method must be a string"));
  if (msg.params !== undefined && (typeof msg.params !== "object" || msg.params === null || Array.isArray(msg.params))) return reply(400, err(msg.id, -32602, "Invalid params: params must be an object"));
  const isNote = msg.id === undefined;
  const metaVer = msg.params && msg.params._meta && msg.params._meta[PV];
  const modern = msg.method !== "initialize" && (metaVer !== undefined || MODERN.includes(hdrVer));

  if (modern) {
    if (!metaVer) return reply(400, err(msg.id, -32020, `HeaderMismatch: MCP-Protocol-Version is ${hdrVer} but params._meta["${PV}"] is missing`));
    if (hdrVer && hdrVer !== metaVer) return reply(400, err(msg.id, -32020, `HeaderMismatch: MCP-Protocol-Version header (${hdrVer}) doesn't match params._meta["${PV}"] (${metaVer})`));
    if (H["mcp-method"] && H["mcp-method"] !== msg.method) return reply(400, err(msg.id, -32020, `HeaderMismatch: Mcp-Method header (${H["mcp-method"]}) doesn't match the body (${msg.method})`));
    const nameIn = msg.params && (msg.params.name ?? msg.params.uri);
    if (H["mcp-name"] && nameIn !== undefined && b64(H["mcp-name"]) !== nameIn) return reply(400, err(msg.id, -32020, `HeaderMismatch: Mcp-Name header doesn't match params.name or params.uri`));
    if (!MODERN.includes(metaVer)) return reply(400, { jsonrpc: "2.0", id: msg.id ?? null, error: { code: -32022, message: "Unsupported protocol version", data: { supported: SUPPORTED, requested: metaVer } } });
  } else if (hdrVer && !SUPPORTED.includes(hdrVer)) {
    return reply(400, err(msg.id, -32600, `Unsupported MCP-Protocol-Version header: ${hdrVer}. Supported: ${SUPPORTED.join(", ")}`));
  }
  if (isNote) return { status: 202, body: false }; // notifications/initialized, notifications/cancelled, …: accepted, no body
  try {
    const result = await dispatch(msg, modern, now, H);
    return reply(200, ok(msg.id, result), msg.method === "initialize" ? result.protocolVersion : modern ? metaVer : undefined);
  } catch (e) {
    if (e instanceof RpcError) return reply(e.http || 200, err(msg.id, e.code, e.message, e.data));
    return reply(500, err(msg.id, -32603, "Internal error: " + String(e?.message || e).slice(0, 160)));
  }
}

// Vercel Node function (same shape as /api/live.js).
export default async function handler(req, res) {
  let body;
  try { body = req.body; } catch (e) { body = "\u0000not json"; } // Vercel's lazy body parser throws on malformed JSON: answer -32700 ourselves
  if (body === undefined && req.method === "POST" && typeof req.on === "function") {
    body = await new Promise((resolve) => { const chunks = []; req.on("data", (c) => chunks.push(c)); req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8"))); req.on("error", () => resolve("")); });
  }
  const out = await handleMcp({ method: req.method, headers: req.headers || {}, body });
  for (const [k, v] of Object.entries(out.headers)) res.setHeader(k, v);
  res.statusCode = out.status;
  res.end(out.body);
}
