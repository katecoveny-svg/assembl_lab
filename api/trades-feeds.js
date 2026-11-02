// assembl lab · trades twin: "Latest published" chips. Two public, key-less sources, fetched server-side and cached at the edge.
//
// GET /api/trades-feeds/  →  { type:"assembl.trades-feeds", version:1, fetchedAt, feeds:{ determinations, consents } }
//   determinations: MBIE building determinations, read from Building CodeHub (codehub.building.govt.nz/resources/YYYYNNN),
//     MBIE's own open copy. www.building.govt.nz sits behind a bot challenge, so we do not scrape it. We walk forward from the
//     newest id we know (trades/js/feeds-fallback.js) until two ids in a row are missing, then read the newest three pages:
//     number, title, "Valid from" date, the one-paragraph description and the link.
//   consents: Stats NZ "Building consents issued: <Month YYYY>" information release. We try this month and step back until a
//     release page exists, then read its key facts: new dwellings that month, the annual total and change, and the year-ended
//     counts for Auckland, Wellington and Canterbury, plus the next release line.
// Each feed is either { truth:"Live", fetchedAt, ... } or { error } — the page then shows the committed last-known values,
// labelled with their date. Nothing is invented: if a figure is not on the source page, it is not in the answer.
import { FEEDS_FALLBACK } from "../trades/js/feeds-fallback.js";

const UA = "assembl-lab/1.0 (+https://assembl-lab.vercel.app/trades/; public data chips)";
const CODEHUB = "https://codehub.building.govt.nz/resources/";
const STATS = "https://www.stats.govt.nz/information-releases/";
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

const decode = (s) => String(s || "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;|&rsquo;|&#8217;/g, "’").replace(/&#124;/g, "|").replace(/&nbsp;/g, " ").replace(/&ndash;/g, "–").replace(/&mdash;/g, "—");
const text = (html) => decode(String(html || "").replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const num = (s) => Number(String(s).replace(/,/g, ""));

async function get(url, ms = 7000) {
  const r = await fetch(url, { headers: { "user-agent": UA, accept: "text/html" }, redirect: "follow", signal: AbortSignal.timeout(ms) });
  return { status: r.status, body: r.status === 200 ? await r.text() : "" };
}

// ---------------------------------------------------------------- MBIE determinations (CodeHub)
export function parseDetermination(html, id) {
  const title = decode((/<title>([\s\S]*?)<\/title>/i.exec(html) || [])[1] || "").replace(/\s*\|\s*Building CodeHub\s*$/i, "").trim();
  const m = /^(\d{4}\/\d{3}):\s*(.+)$/.exec(title);
  const dd = (re) => { const x = re.exec(html); return x ? text(x[1]).replace(/,\s*$/, "") : null; };
  const type = dd(/<dt>\s*Information type\s*<\/dt>\s*<dd>([\s\S]*?)<\/dd>/i);
  if (!m || (type && !/determination/i.test(type))) return null;
  const valid = dd(/<dt>\s*Valid from\s*<\/dt>\s*<dd>([\s\S]*?)<\/dd>/i);
  const d = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(valid || "");
  const body = text((/<h6>\s*Description\s*<\/h6>([\s\S]*?)<\/div>/i.exec(html) || [])[1] || "");
  const [about, decided] = body.split(/\s*Decision\s+/);
  const outcome = /\b(confirm|reverse|modif|revers)\w*/i.exec(decided || "");
  return { id, number: m[1], title: m[2].trim(), date: d ? `${d[3]}-${d[2].padStart(2, "0")}-${d[1].padStart(2, "0")}` : null,
    description: about ? about.slice(0, 320) : null, decision: decided ? decided.slice(0, 240) : null, outcome: outcome ? outcome[0].toLowerCase().replace(/^revers\w*/, "reversed").replace(/^confirm\w*/, "confirmed").replace(/^modif\w*/, "modified") : null, link: CODEHUB + id };
}
export async function fetchDeterminations({ known = FEEDS_FALLBACK.determinations.lastId, now = new Date(), max = 14 } = {}) {
  const year = Number(new Date(now.getTime() + 13 * 3600e3).toISOString().slice(0, 4)); // NZ year, near enough for a rollover check
  let start = Number(known);
  if (Math.floor(start / 1000) < year) { const r = await get(CODEHUB + `${year}001`); if (r.status === 200) start = year * 1000 + 1; }
  const found = new Map(); let misses = 0, n = start;
  { const r = await get(CODEHUB + n); if (r.status === 200) found.set(n, r.body); }
  for (let i = 0; i < max && misses < 2; i++) { n += 1; const r = await get(CODEHUB + n); if (r.status === 200) { found.set(n, r.body); misses = 0; } else if (r.status === 404) misses += 1; else throw new Error(`CodeHub answered ${r.status} for ${n}`); }
  const top = Math.max(...found.keys(), start);
  const items = [];
  for (let id = top; id > top - 6 && items.length < 3; id--) {
    let html = found.get(id); if (!html) { const r = await get(CODEHUB + id); if (r.status !== 200) continue; html = r.body; }
    const d = parseDetermination(html, String(id)); if (d) items.push(d);
  }
  if (!items.length) throw new Error("no determinations parsed from CodeHub");
  return { id: "determinations", label: "MBIE building determinations", truth: "Live", fetchedAt: new Date().toISOString(), lastId: String(top), items,
    source: { name: "MBIE · Building CodeHub", url: "https://codehub.building.govt.nz/", listing: "https://www.building.govt.nz/resolving-problems/resolution-options/determinations/determinations-issued/" } };
}

// ---------------------------------------------------------------- Stats NZ building consents issued
export function parseConsents(html, slug) {
  const flat = decode(html);
  const blocks = []; const re = /"Content":"((?:[^"\\]|\\.)*)"/g; let m;
  while ((m = re.exec(flat))) { try { blocks.push(text(JSON.parse(`"${m[1]}"`))); } catch (e) { /* skip */ } }
  const all = blocks.join(" ");
  const title = text((/<title>([\s\S]*?)<\/title>/i.exec(html) || [])[1] || "").replace(/\s*\|\s*Stats NZ\s*$/, "");
  const month = (/Building consents issued:\s*([A-Z][a-z]+ \d{4})/.exec(title) || [])[1];
  const headline = text((/<meta name="description" content="([^"]+)"/i.exec(html) || [])[1] || "");
  const monthly = /In ([A-Z][a-z]+ \d{4}), there were ([\d,]+) new dwellings consented/.exec(all);
  const annual = /In the year ended ([A-Z][a-z]+ \d{4}), the actual number of new dwellings consented was ([\d,]+), (up|down) ([\d.]+) percent/.exec(all);
  const region = (name) => { const r = new RegExp(`([\\d,]+) in ${name} \\((up|down) ([\\d.]+) percent\\)`).exec(all); return r ? { region: name, dwellings: num(r[1]), change: `${r[2]} ${r[3]}%` } : null; };
  const next = (/(Building consents issued: [A-Z][a-z]+ \d{4}\s*will be released on [^.]+)\./.exec(all) || [])[1];
  if (!month || !(monthly || annual)) return null;
  return { month, headline: headline || null, monthlyDwellings: monthly ? num(monthly[2]) : null,
    annual: annual ? { yearEnded: annual[1], dwellings: num(annual[2]), change: `${annual[3]} ${annual[4]}%` } : null,
    regions: ["Auckland", "Wellington", "Canterbury"].map(region).filter(Boolean), regionBasis: "new dwellings consented, year ended, versus the year before",
    nextRelease: next ? next.replace(/\s+/g, " ") : null, link: STATS + slug + "/" };
}
export async function fetchConsents({ now = new Date(), back = 4 } = {}) {
  const d = new Date(now.getTime() + 13 * 3600e3);
  for (let i = 0; i <= back; i++) {
    const y = d.getUTCFullYear(), mo = d.getUTCMonth() - i, dt = new Date(Date.UTC(y, mo, 1));
    const slug = `building-consents-issued-${MONTHS[dt.getUTCMonth()]}-${dt.getUTCFullYear()}`;
    const r = await get(STATS + slug + "/");
    if (r.status === 404) continue;
    if (r.status !== 200) throw new Error(`Stats NZ answered ${r.status}`);
    const c = parseConsents(r.body, slug); if (!c) throw new Error(`couldn't read the key facts on ${slug}`);
    return { id: "consents", label: "Stats NZ building consents issued", truth: "Live", fetchedAt: new Date().toISOString(), ...c, source: { name: "Stats NZ", url: STATS + slug + "/" } };
  }
  throw new Error("no Stats NZ building consents release found in the last few months");
}

export async function tradesFeeds(now = new Date()) {
  const [a, b] = await Promise.allSettled([fetchDeterminations({ now }), fetchConsents({ now })]);
  const fail = (id, r) => ({ id, error: String(r.reason?.message || r.reason).slice(0, 200) });
  return { type: "assembl.trades-feeds", version: 1, fetchedAt: new Date().toISOString(),
    feeds: { determinations: a.status === "fulfilled" ? a.value : fail("determinations", a), consents: b.status === "fulfilled" ? b.value : fail("consents", b) },
    fallback: { asAt: FEEDS_FALLBACK.asAt, note: "Last known values committed with the page; used by the page when a feed fails." } };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*"); res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET" && req.method !== "HEAD") { res.statusCode = 405; res.setHeader("Allow", "GET, HEAD"); return res.end(); }
  const out = await tradesFeeds();
  const ok = !out.feeds.determinations.error && !out.feeds.consents.error;
  res.setHeader("Cache-Control", ok ? "public, s-maxage=21600, stale-while-revalidate=86400" : "public, s-maxage=900, stale-while-revalidate=3600");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.statusCode = 200; res.end(JSON.stringify(out));
}
