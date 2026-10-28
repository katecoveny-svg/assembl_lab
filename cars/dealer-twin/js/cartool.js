// Plain words become the structured arguments an assistant would send to search_cars (used by the agent desk), and "Check any car"
// calls car_check, which reads NZTA's open register live.
import { CFG, $, esc, fmt, dollars, mcp, chip } from "./core.js";

const REGIONS = ["Northland", "Auckland", "Waikato", "Bay of Plenty", "Gisborne", "Hawke's Bay", "Taranaki", "Manawatū-Whanganui", "Wellington", "Tasman", "Nelson", "Marlborough", "West Coast", "Canterbury", "Otago", "Southland"];
const TOWNS = { tauranga: "Bay of Plenty", rotorua: "Bay of Plenty", "mount maunganui": "Bay of Plenty", whangarei: "Northland", "whangārei": "Northland", napier: "Hawke's Bay", hastings: "Hawke's Bay",
  "new plymouth": "Taranaki", "palmerston north": "Manawatū-Whanganui", whanganui: "Manawatū-Whanganui", christchurch: "Canterbury", dunedin: "Otago", queenstown: "Otago", invercargill: "Southland", "manawatu": "Manawatū-Whanganui", "hawkes bay": "Hawke's Bay" };
const MAKES = ["toyota", "mazda", "kia", "hyundai", "suzuki", "honda", "nissan", "mitsubishi", "ford", "tesla", "byd", "mg", "subaru", "isuzu", "volkswagen", "vw", "holden", "jeep", "ldv", "renault", "fiat", "skoda", "audi", "bmw", "mercedes", "lexus", "polestar", "peugeot", "volvo", "gwm", "haval"];
const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

// ---------------------------------------------------------------- words in, arguments out (the same fields search_cars takes)
export function parseAsk(q, models = [], extraMakes = []) {
  let s = " " + q.toLowerCase().replace(/(\d),(\d{3})/g, "$1$2").replace(/[–—]/g, "-") + " ";
  s = s.replace(/(\d+(?:\.\d+)?)\s*k\s*(km|kms|kilomet\w*)/g, (m, n) => `${Math.round(parseFloat(n) * 1000)} km`).replace(/\$\s*(\d+(?:\.\d+)?)\s*k\b/g, (m, n) => `$${Math.round(parseFloat(n) * 1000)}`)
    .replace(/(\d+(?:\.\d+)?)\s*(k|grand)\b(?!\s*km)/g, (m, n) => `$${Math.round(parseFloat(n) * 1000)}`);
  const a = {}; let m;
  if ((m = s.match(/between\s*\$?(\d+)\s*(?:and|-|to)\s*\$?(\d+)(?!\s*(?:km|kg|seat))/))) { a.budget_min = +m[1]; a.budget_max = +m[2]; s = s.replace(m[0], " "); }
  const re = /(\$)?(\d+(?:\.\d+)?)\s*(km|kms|kilomet\w*|kg|seats?|seater|l\/100)?/g; let x;
  while ((x = re.exec(s))) {
    const n = parseFloat(x[2]), unit = x[3] || "", before = s.slice(Math.max(0, x.index - 24), x.index);
    if (/^k|^kilo/.test(unit)) { if (unit === "kg") a.towing_kg_min = Math.min(3500, Math.round(n)); else a.max_km = Math.round(n); continue; }
    if (/^seat/.test(unit)) { a.seats_min = Math.min(9, Math.max(2, Math.round(n))); continue; }
    if (unit === "l/100") continue;
    if (!x[1] && n >= 1990 && n <= 2030 && Number.isInteger(n)) { a.min_year = n; continue; }
    if (x[1] || n >= 1000) { if (/(over|above|more than|at least|from|min)\s*\$?\s*$/.test(before)) a.budget_min = Math.round(n); else if (a.budget_max == null) a.budget_max = Math.round(n); }
  }
  if (/seven|7\s*-?\s*seat/.test(s)) a.seats_min = 7; if (/\beight seat/.test(s)) a.seats_min = 8;
  if (/\b(suv|4x4|crossover)\b/.test(s)) a.body = "suv"; else if (/\bhatch(back)?\b/.test(s)) a.body = "hatch"; else if (/\b(sedan|saloon)\b/.test(s)) a.body = "sedan";
  else if (/\b(ute|pick-?up|double cab|twin cab)\b/.test(s)) a.body = "ute"; else if (/\b(van|people mover|minivan)\b/.test(s)) a.body = "van";
  if (/plug-?in|phev/.test(s)) a.fuel = "plug-in hybrid"; else if (/\bhybrid\b/.test(s)) a.fuel = "hybrid"; else if (/\b(ev|evs|electric|bev)\b/.test(s)) a.fuel = "electric"; else if (/\bdiesel\b/.test(s)) a.fuel = "diesel"; else if (/\bpetrol\b/.test(s)) a.fuel = "petrol";
  const must = []; if (/\b(awd|4wd|all.wheel|four.wheel)\b/.test(s)) must.push("awd or 4wd"); if (/no money owing|nothing owing/.test(s)) must.push("no money owing"); if (/\bnz.new\b/.test(s)) must.push("nz new"); if (/\b(5|five).star/.test(s)) must.push("5 star safety");
  if (must.length) a.must_have = must;
  if (a.towing_kg_min == null && /\btow(s|ing)?\b/.test(s)) a.towing_kg_min = /boat|caravan/.test(s) ? 2000 : 1000;
  for (const r of REGIONS) if (s.includes(" " + r.toLowerCase().replace(/ū/g, "u")) || s.includes(" " + r.toLowerCase())) { a.region = r; break; }
  if (!a.region) for (const [t, r] of Object.entries(TOWNS)) if (s.includes(" " + t + " ") || s.includes(" " + t + ",")) { a.region = r; break; }
  if (/cheap|lowest price|best price/.test(s)) a.sort = "price"; else if (/newest|latest/.test(s)) a.sort = "newest"; else if (/low(est)? (km|kms|mileage|kilomet)/.test(s)) a.sort = "lowest km";
  const day = DAYS.find((d) => s.includes(d)) || (/weekend/.test(s) ? "saturday" : null); if (day) a.test_drive_day = day;
  const words = []; const mk = [...extraMakes, ...MAKES].find((k) => new RegExp(`\\b${k}\\b`).test(s)); if (mk) words.push(mk === "vw" ? "volkswagen" : mk);
  const md = models.find((k) => k.length > 1 && new RegExp(`\\b${k.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`).test(s)); if (md) words.push(md);
  if (words.length) a.query = words.join(" ").slice(0, 60);
  return a;
}
const argLabel = (k, v) => k === "budget_max" ? `up to ${dollars(v)}` : k === "budget_min" ? `from ${dollars(v)}` : k === "max_km" ? `under ${fmt(v)} km` : k === "min_year" ? `${v} or newer` : k === "seats_min" ? `${v}+ seats` : k === "towing_kg_min" ? `tows ${fmt(v)} kg` : Array.isArray(v) ? v.join(", ") : String(v);

export async function initCheck() {
  // ---------------------------------------------------------------- the register check
  const reg = $("#reg"), rf = $("#regForm");
  rf.onsubmit = (e) => { e.preventDefault(); const f = new FormData(rf); runCheck({ make: f.get("make").trim(), model: f.get("model").trim(), year: +f.get("year") }); };
  let ct = 0;
  async function runCheck(args, label) {
    const my = ++ct; reg.setAttribute("aria-busy", "true");
    reg.innerHTML = `<div class="ph">Calling car_check for ${esc(label || `${args.year} ${args.make} ${args.model}`)}…</div>`;
    try { const r = await mcp("car_check", { km_per_week: 200, ...args }); if (my !== ct) return; drawCheck(r); }
    catch (e) { if (my !== ct) return; reg.innerHTML = `<div class="ph">${esc(e.message)} The register itself may be slow; try again.</div>`; }
    finally { reg.removeAttribute("aria-busy"); }
  }
  function drawCheck(r) {
    const sc = r.sc || {}, g = sc.register || {}, n = sc.notice || {}, rc = sc.runningCost || {}, flags = sc.redFlags || [], name = (sc.car && sc.car.name) || g.name || "This car";
    const ring = (a, b) => { const k = b ? a / b : 0, C = 2 * Math.PI * 26; return `<svg class="ring" viewBox="0 0 64 64" role="img" aria-label="${a} of ${b} notice facts given"><circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="7"/><circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-dasharray="${(C * k).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 32 32)" style="color:var(--on-deep)"/></svg>`; };
    let top;
    if (g.found) {
      const nz = g.nzNewPct || 0, im = g.usedImportPct || 0, other = Math.max(0, 100 - nz - im);
      top = `<div class="big"><b>${fmt(g.total)}</b><span>${esc(g.name)}s on the NZ register</span></div>
        <div><div class="split" role="img" aria-label="${fmt(nz, 1)}% NZ-new, ${fmt(im, 1)}% used imports"><i style="flex:${nz};background:var(--on-deep)"></i><i style="flex:${im};background:#C79AA8"></i>${other > .5 ? `<i style="flex:${other};background:rgba(255,255,255,.2)"></i>` : ""}</div>
        <div class="legend"><span><i style="background:var(--on-deep)"></i>NZ-new ${fmt(nz, 1)}%</span><span><i style="background:#C79AA8"></i>Used import ${fmt(im, 1)}%</span></div></div>
        <div class="regk"><div><b>${g.fuel ? fmt(g.fuel.pct, 0) + "%" : "–"}</b><span>${esc(g.fuel ? g.fuel.value : "")}</span></div><div><b>${g.engineCc ? fmt(g.engineCc.cc) : "–"}<small style="font-size:.5em"> cc</small></b><span>typical engine</span></div>
          <div><b>${g.ratedEconomy ? fmt(g.ratedEconomy.lPer100km, 1) : "–"}</b><span>L/100 km, rated</span></div><div><b>${rc.totalWeekly != null ? dollars(rc.totalWeekly) : "–"}</b><span>a week to run${rc.compare ? `, ${dollars(rc.compare.totalWeekly)} for ${esc(rc.compare.label.replace(/^A typical /, "a typical "))}` : ""}</span></div></div>
        <div class="row">${chip("src", `Source · NZTA Motor Vehicle Register · ${g.period || ""}`, "wrap")}</div>`;
    } else {
      top = `<div class="big"><b>${g.status === "live" ? "0" : "–"}</b><span>${g.status === "live" ? `No ${esc(name)} found on the register under that name. Check the spelling of the model.` : "The register didn't answer this time."}</span></div>`;
    }
    const stops = flags.filter((f) => f.level === "stop"), asks = flags.filter((f) => f.level !== "stop");
    reg.innerHTML = `${top}
      <div style="display:grid;grid-template-columns:auto 1fr;gap:16px;align-items:center">${ring(n.present || 0, n.total || 0)}<div><b style="color:var(--on-deep);font-weight:500;font-size:17px">${n.present ?? "–"} of ${n.total ?? "–"} notice facts given</b><div class="fine" style="color:var(--on-deep-3)">${esc(sc.summary || "")}</div></div></div>
      ${flags.length ? `<div class="flags">${[...stops, ...asks].slice(0, 4).map((f) => `<span class="${f.level === "stop" ? "stop" : ""}">${esc(f.title)}</span>`).join("")}${flags.length > 4 ? `<span>+${flags.length - 4} more</span>` : ""}</div>` : ""}
      <p class="fine" style="color:var(--on-deep-3)">car_check · ${r.ms} ms · ${esc(name)}</p>
      <details class="ev"><summary>Checks to run before paying, and sources</summary><div class="evb"><p>${esc(sc.statement || "")}</p>
        <ul>${(sc.checks || []).map((c) => `<li><b style="color:var(--on-deep);font-weight:500">${esc(c.title)}</b>: ${esc(c.how)}${c.link ? ` <a href="${esc(c.link.url)}" target="_blank" rel="noopener">${esc(c.link.name)}</a>` : ""}</li>`).join("")}</ul>
        ${sc.fairPrice ? `<p>${esc(sc.fairPrice.note)}</p>` : ""}
        <ul>${[...(sc.sources || []), ...(sc.credits || [])].map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>${s.licence ? ` · ${esc(s.licence)}` : ""}</li>`).join("")}${g.source ? `<li><a href="${esc(g.source.url)}" target="_blank" rel="noopener">${esc(g.source.name)}</a> · ${esc(g.source.licence || "")}</li>` : ""}</ul></div></details>`;
  }

  // the section opens with an answer, not an empty form: one live check of a common car
  const d = CFG.check && CFG.check.default; if (d) { rf.make.value = d.make; rf.model.value = d.model; rf.year.value = d.year; runCheck({ make: d.make, model: d.model, year: d.year }); }
}
