// The five ideas, each running in the browser on sample data. Nothing here sends, publishes or charges anything:
// every outbound step stops at an approval, and approving it only records the decision on this page.
import { PRODUCTS, byId, CATS, CLAUSES, ZONES, SYNONYMS, ASK_EXAMPLES, PRACTICE, QUEUE, FACTS } from "./data.js";
import { record, pretty } from "./records.js";
import { ROSTER, RULES, RULES_NOTE, STUDIO_TOTAL } from "./studio.js";

const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const sw = (p) => `--a:${p.swatch[0]};--b:${p.swatch[1]}`;
const stagger = (els, gap = 220) => els.forEach((el, i) => (reduce ? el.classList.add("on") : setTimeout(() => el.classList.add("on"), i * gap)));

// ---------------------------------------------------------------------------------------------- the approval gate
// The page holds at every outbound step: a named person, what will happen, what won't. Resolves true or false.
function gate({ kicker = "Needs your approval", title, body, yes = "Approve", no = "Not now" }) {
  const g = $("#gate"), last = document.activeElement;
  $("#gate-k").textContent = kicker; $("#gate-h").textContent = title; $("#gate-body").innerHTML = body;
  $("#gate-yes").textContent = yes; $("#gate-no").textContent = no;
  g.hidden = false; $("#gate-no").focus();
  return new Promise((res) => {
    const done = (v) => { g.hidden = true; g.removeEventListener("keydown", key); $("#gate-yes").onclick = $("#gate-no").onclick = null; last?.focus?.(); res(v); };
    const key = (e) => {
      if (e.key === "Escape") done(false);
      if (e.key === "Tab") { const f = [$("#gate-no"), $("#gate-yes")]; if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[1].focus(); } else if (!e.shiftKey && document.activeElement === f[1]) { e.preventDefault(); f[0].focus(); } }
    };
    g.addEventListener("keydown", key);
    $("#gate-yes").onclick = () => done(true); $("#gate-no").onclick = () => done(false);
  });
}

// ---------------------------------------------------------------------------------------------- facts
$("#facts").innerHTML = FACTS.map((f) => `<li><b>${esc(f.n)}</b><span>${esc(f.what)}</span><a href="${f.url}" target="_blank" rel="noopener">${esc(f.src)} ↗</a></li>`).join("");

// ---------------------------------------------------------------------------------------------- chapter nav
const navLinks = $$(".chapters a"), chapterIds = ["catalogue", "specify", "home", "join", "team"];
let navTick = 0;
const navHere = () => { navTick = 0; const y = innerHeight * 0.45; let cur = null; for (const id of chapterIds) { const t = document.getElementById(id).getBoundingClientRect(); if (t.top < y && t.bottom > 0) cur = id; } navLinks.forEach((a) => a.classList.toggle("here", a.hash === "#" + cur)); };
addEventListener("scroll", () => { if (!navTick) navTick = requestAnimationFrame(navHere); }, { passive: true }); navHere();

// ---------------------------------------------------------------------------------------------- 01 the catalogue
// Reads a question into filters, searches the sample feed, and answers with citations that point home.
const WORDNUM = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12 };
function parse(q) {
  const t = q.toLowerCase(), f = {};
  for (const [re, add] of SYNONYMS) if (re.test(t)) Object.assign(f, add);
  if (/sea ?spray|surf|beachfront/.test(t)) f.zone = "E";
  const m = t.match(/(?:under|less than|within|in under)\s+(\d+|\w+)\s+weeks?/);
  if (m) f.lead = +(m[1]) || WORDNUM[m[1]] || undefined;
  f.words = t.split(/[^a-zāēīōū]+/).filter((w) => w.length > 2);
  return f;
}
function search(f) {
  const pool = PRODUCTS.filter((p) => !f.cat || p.cat === f.cat), kept = [], out = [];
  for (const p of pool) {
    const why = [], no = [];
    let s = 0;
    if (f.zone) { if (p.zones.includes(f.zone)) { s += 3; why.push(`suits ${ZONES[f.zone].split(",")[0]}`); } else if (p.zones.length) no.push(`not for ${ZONES[f.zone].split(",")[0]}`); }
    if (f.upkeep) { if (p.upkeep === f.upkeep) { s += 2; why.push(`${p.upkeep.toLowerCase()} upkeep`); } else s -= 1; }
    if (f.tb) { if (p.tb) { s += 2; why.push("thermally broken"); } else if (p.tb === false) no.push("not thermally broken"); }
    if (f.lead) { if (p.lead <= f.lead) { s += 1; why.push(`${p.lead}-week lead time`); } else no.push(`${p.lead}-week lead time`); }
    for (const w of f.words) if (p.tags.some((tg) => tg.startsWith(w) || w.startsWith(tg))) { s += 1.2; }
    (no.length ? out : kept).push({ p, s, why, no });
  }
  kept.sort((a, b) => b.s - a.s);
  return { kept: kept.slice(0, 3), out, total: pool.length };
}
function callText(f, q) {
  const args = { ...(f.cat && { category: f.cat }), ...(f.zone && { exposure_zone: f.zone }), ...(f.upkeep && { upkeep: f.upkeep }), ...(f.tb && { thermally_broken: true }), ...(f.lead && { max_lead_weeks: f.lead }), text: q };
  return `archipro.search_products(${JSON.stringify(args, null, 2)})`;
}
let shown = null;
function showRecord(p, mode = $(".seg [aria-selected=true]").dataset.seen) {
  shown = p; const el = $("#record");
  if (mode === "record") { el.classList.remove("page"); el.innerHTML = pretty(record(p)); }
  else {
    el.classList.add("page");
    el.innerHTML = `<span class="c">&lt;!-- what an assistant gets from a product page today --&gt;</span>
&lt;div class="pdp-hero js-gallery" data-v="7"&gt;<span class="blur">&lt;img srcset="…/w_400 400w, …/w_1200 1200w" alt=""&gt;</span>
  &lt;h1&gt;<span class="s">${esc(p.name)}</span>&lt;/h1&gt;
  <span class="blur">&lt;div class="rating"&gt;&lt;svg&gt;…&lt;/svg&gt;&lt;/div&gt;</span>
  &lt;p class="by"&gt;<span class="s">${esc(p.supplier)}</span>&lt;/p&gt;
  <span class="blur">&lt;button class="btn-save"&gt;Save&lt;/button&gt; &lt;button&gt;Share&lt;/button&gt;</span>
  &lt;div class="desc"&gt;<span class="blur">${esc(p.line)} Contact us for more information about colours, sizes and availability.</span>&lt;/div&gt;
<span class="blur">  &lt;script&gt;window.__STATE__={"u":"…","ab":"b","t":[…]}&lt;/script&gt;</span>
&lt;/div&gt;

<span class="c">exposure zone?   not stated
upkeep?          not stated
lead time?       not stated
licence?         none: the assistant has to guess
link home?       whatever it decides to keep</span>`;
  }
}
$$(".seg button").forEach((b) => b.addEventListener("click", () => {
  $$(".seg button").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
  showRecord(shown || byId["mf-cedar-black"], b.dataset.seen);
}));
function ask(q) {
  q = q.trim(); if (q.length < 3) return;
  const f = parse(q), r = search(f), tr = $("#trace");
  const ex = r.out.length ? ` · ${r.out.length} excluded: ${r.out.map((o) => `${o.p.name.split(",")[0]} (${o.no[0]})`).slice(0, 2).join("; ")}` : "";
  const kept = r.kept;
  const answer = kept.length
    ? `<p>${kept.length === 1 ? "One product" : `${["", "", "Two", "Three"][kept.length]} products`} on ArchiPro fit${f.zone ? ` a ${ZONES[f.zone].split(", ")[1].replace(")", "")} site (NZS 3604 Zone ${f.zone})` : ""}${f.upkeep ? " with low upkeep" : ""}:</p>
       <ul>${kept.map((k, i) => `<li><b>${esc(k.p.name)}</b>, ${esc(k.p.supplier)}. ${esc(k.p.upkeepNote)}${k.p.note ? " " + esc(k.p.note) : ""}<span class="cite" title="In the live feed this opens the product's page on ArchiPro">on ArchiPro [${i + 1}]</span></li>`).join("")}</ul>
       <p>Each links to its ArchiPro page, where you can enquire with the supplier.${f.zone ? " Your designer confirms the exposure zone for the exact site." : ""}</p>`
    : `<p>Nothing in the sample catalogue fits all of that. Try fewer conditions, or another element.</p>`;
  tr.innerHTML = `<p class="q">“${esc(q)}”</p>
    <div class="step"><p class="mono k">1 · The assistant calls the feed</p><pre class="call">${esc(callText(f, q))}</pre></div>
    <div class="step"><p class="mono k">2 · ArchiPro returns records</p><div class="recs">${kept.map((k) => `<button class="rec" data-id="${k.p.id}" aria-pressed="false"><span class="sw" style="${sw(k.p)}"></span><span>${esc(k.p.name)}<small>${esc(k.p.supplier)} · ${k.why.join(", ") || "matches the words"}</small></span></button>`).join("") || '<p class="meta">No records kept</p>'}</div><p class="meta">${kept.length} of ${r.total} kept${esc(ex)} · licence archipro-feed 0.1, proposed</p></div>
    <div class="step"><p class="mono k">3 · The answer, citing ArchiPro</p><div class="answer">${answer}</div></div>`;
  stagger($$(".step", tr));
  $$(".rec", tr).forEach((b) => b.addEventListener("click", () => { $$(".rec", tr).forEach((x) => x.setAttribute("aria-pressed", String(x === b))); showRecord(byId[b.dataset.id]); }));
  if (kept[0]) { showRecord(kept[0].p); $(".rec", tr)?.setAttribute("aria-pressed", "true"); }
}
$("#asks").innerHTML = ASK_EXAMPLES.map((q) => `<button class="pill">${esc(q)}</button>`).join("");
$$("#asks .pill").forEach((b) => b.addEventListener("click", () => { $("#ask").value = b.textContent; ask(b.textContent); }));
$("#askform").addEventListener("submit", (e) => { e.preventDefault(); ask($("#ask").value); });
ask(ASK_EXAMPLES[0]); $("#ask").value = ASK_EXAMPLES[0];

// ---------------------------------------------------------------------------------------------- 02 specify
const brief = { cat: "cladding", zone: "D", pri: new Set(["upkeep"]) };
const PRI = { upkeep: "Low upkeep", lead: "Short lead time", thermal: "Thermal (H1)", budget: "Budget" };
const pillSet = (key, opts, multi) => {
  const box = $(`[data-brief="${key}"]`);
  box.innerHTML = Object.entries(opts).map(([v, l]) => `<button class="pill" data-v="${v}" aria-pressed="${multi ? brief[key].has(v) : brief[key] === v}">${esc(l)}</button>`).join("");
  $$("button", box).forEach((b) => b.addEventListener("click", () => {
    if (multi) { brief[key].has(b.dataset.v) ? brief[key].delete(b.dataset.v) : brief[key].add(b.dataset.v); b.setAttribute("aria-pressed", String(brief[key].has(b.dataset.v))); }
    else { brief[key] = b.dataset.v; $$("button", box).forEach((x) => x.setAttribute("aria-pressed", String(x === b))); }
    compare();
  }));
};
pillSet("cat", { cladding: "Cladding", roof: "Roofing", joinery: "Joinery", decking: "Decking" });
pillSet("zone", { B: "B · low", C: "C · medium", D: "D · coastal", E: "E · sea spray" });
pillSet("pri", PRI, true);
const spec = new Map(); // cat → product id
const BAND = { $: 1, $$: 2, $$$: 3 }, UP = { Low: 0, Medium: 1, High: 2 };
function compare() {
  const ps = PRODUCTS.filter((p) => p.cat === brief.cat).map((p) => {
    const fits = p.zones.includes(brief.zone);
    let s = fits ? 10 : 0;
    if (brief.pri.has("upkeep")) s -= UP[p.upkeep] * 2;
    if (brief.pri.has("lead")) s -= p.lead * 0.4;
    if (brief.pri.has("thermal") && p.tb !== undefined) s += p.tb ? 3 : -3;
    if (brief.pri.has("budget")) s -= BAND[p.band] * 1.2;
    return { p, s, fits };
  }).sort((a, b) => b.s - a.s);
  const best = ps[0]?.fits ? ps[0].p.id : null;
  const row = (label, f) => `<tr><th scope="row">${label}</th>${ps.map((x) => `<td>${f(x)}</td>`).join("")}</tr>`;
  $("#compare").innerHTML = `<table class="cmp"><thead><tr><th scope="col"><span class="sr">Attribute</span></th>${ps.map((x) => `<th scope="col"><div class="prod"><span class="sw" style="${sw(x.p)};--grain:${x.p.cat === "cladding" || x.p.cat === "decking" ? .6 : .25}"></span><b>${esc(x.p.name)}</b><small>${esc(x.p.supplier)} · sample</small>${x.p.id === best ? '<span class="fit good">Best fit for this brief</span>' : ""}</div></th>`).join("")}</tr></thead><tbody>
    ${row("Zone " + brief.zone, (x) => x.fits ? `<span class="fit good">Suits</span>` : `<span class="fit no">Not for Zone ${brief.zone}</span>`)}
    ${row("Upkeep", (x) => `<span class="${brief.pri.has("upkeep") && x.p.upkeep === "Low" ? "best" : ""}">${x.p.upkeep}</span><br><small>${esc(x.p.upkeepNote)}</small>`)}
    ${row("Durability", (x) => `${x.p.life}, maker's statement`)}
    ${row("Lead time", (x) => `<span class="${brief.pri.has("lead") && x.p.lead <= 4 ? "best" : ""}">${x.p.lead} weeks</span>`)}
    ${row("Price band", (x) => `<span class="${brief.pri.has("budget") && x.p.band === "$" ? "best" : ""}">${x.p.band}</span>`)}
    ${brief.cat === "joinery" ? row("Thermal", (x) => x.p.tb ? `<span class="fit good">Thermally broken</span>` : `<span class="fit check">Check H1 calc</span>`) : ""}
    ${row("For the designer", (x) => x.p.clauses.map((c) => CLAUSES[c]).join("<br>") + (x.p.note ? `<br><small>${esc(x.p.note)}</small>` : ""))}
  </tbody><tfoot><tr><td></td>${ps.map((x) => `<td><button class="btn${spec.get(x.p.cat) === x.p.id ? " primary" : ""}" data-add="${x.p.id}" ${x.fits ? "" : "disabled"}>${spec.get(x.p.cat) === x.p.id ? "In the spec" : "Add to spec"}</button></td>`).join("")}</tr></tfoot></table>`;
  $$("[data-add]").forEach((b) => b.addEventListener("click", () => { const p = byId[b.dataset.add]; spec.set(p.cat, p.id); schedule(); compare(); }));
}
const ORDER = ["cladding", "roof", "joinery", "decking"];
function specLine(p) {
  const zone = brief.zone, extra = [];
  if (p.note) extra.push(p.note);
  return `${p.name}, by ${p.supplier}. ${p.line} Site exposure: Zone ${zone} (NZS 3604), designer to confirm. Durability: ${p.life} maker's statement, check against ${CLAUSES.B2}.${p.clauses.includes("H1") ? ` Window performance to the ${CLAUSES.H1} calculation.` : ""}${extra.length ? " " + extra.join(" ") : ""}`;
}
function schedule() {
  const ids = ORDER.map((c) => spec.get(c)).filter(Boolean);
  $("#schedule").innerHTML = ids.length ? ids.map((id) => { const p = byId[id]; return `<li><span><b>${CATS[p.cat].label}</b>${esc(specLine(p))}</span><button class="x" aria-label="Remove ${esc(p.name)}" data-rm="${p.cat}">×</button></li>`; }).join("") : '<li class="empty">Add a product to start the schedule.</li>';
  $$("[data-rm]").forEach((b) => b.addEventListener("click", () => { spec.delete(b.dataset.rm); schedule(); compare(); }));
  $("#csv").disabled = $("#samples").disabled = !ids.length;
  // the code register, from the studio: what the designer must review, never a pass
  const clauses = [...new Set(ids.flatMap((id) => byId[id].clauses))];
  const rules = RULES.filter((r) => ["nz.consent", "nz.restricted_design", ...(clauses.includes("H1") ? ["nz.h1"] : []), "nz.planning"].includes(r.id));
  $("#code").innerHTML = ids.length ? `<p class="mono label">For the designer to review</p>
    ${clauses.map((c) => `<div class="rule"><b>${CLAUSES[c]}</b><span class="mono">Unassessed · the designer decides</span></div>`).join("")}
    ${rules.map((r) => `<div class="rule"><b>${esc(r.title)}</b><span>${esc(r.authority)} · reviewer: ${esc(r.reviewer)}</span><span class="mono">${esc(r.status)} · source checked ${esc(r.checked)}</span></div>`).join("")}
    <p class="small">From the studio's code register. It prepares the review; it can't say anything complies.</p>` : "";
}
$("#csv").addEventListener("click", () => {
  const rows = [["Element", "Product", "Supplier (sample)", "Specification line", "Code to review"], ...ORDER.map((c) => spec.get(c)).filter(Boolean).map((id) => { const p = byId[id]; return [CATS[p.cat].label, p.name, p.supplier, specLine(p), p.clauses.map((c) => CLAUSES[c]).join("; ")]; })];
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "specification-draft-sample.csv"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
});
$("#samples").addEventListener("click", async () => {
  const ps = ORDER.map((c) => spec.get(c)).filter(Boolean).map((id) => byId[id]);
  const ok = await gate({ title: `Send ${ps.length} sample request${ps.length > 1 ? "s" : ""} through ArchiPro?`,
    body: `<ul>${ps.map((p) => `<li>${esc(p.supplier)}: ${esc(p.name)}</li>`).join("")}</ul><p>Each supplier sees the element, the region and the exposure zone. Your contact details go to a supplier only when you accept their reply.</p>`,
    yes: "Approve the requests" });
  const b = $("#samples"); b.textContent = ok ? "Requests approved" : "Request samples"; b.disabled = ok;
  if (ok) $("#code").insertAdjacentHTML("afterbegin", `<p class="small"><span class="chip sample">Simulated</span> Approved by you at ${new Date().toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit" })}. Nothing was sent: this is a concept.</p>`);
});
spec.set("cladding", "mf-cedar-black");
compare(); schedule();

// ---------------------------------------------------------------------------------------------- 03 home, on the real twin
// The twin's finishes schedule travels in its URL (?fin=, plan-studio/twins/src/twin/finishes.ts); its sun is set by date
// and time for the site's latitude. Same origin, so this page can drive both.
const SURF_ORDER = ["cladding", "roof", "joinery", "decking", "floor", "walls", "cabinetry", "bench", "splashback", "metal", "bathTile", "fabric"];
const REST = { floor: "rimu", walls: "bright-white", cabinetry: "slate", bench: "stone", splashback: "white-large", metal: "chrome", bathTile: "white", fabric: "grey-linen" }; // 16A as lived
const picks = { cladding: "mf-cedar-black", roof: "os-corr-black-marine", joinery: "hj-tb-black", decking: "mf-hw-silver" };
const finOf = () => SURF_ORDER.map((k) => (picks[k] ? byId[picks[k]].fin : REST[k])).join(".");
const SITE_ZONE = "D";
const CAM = "-15.2,64.97,-10.31,16.55,50.81,4.5"; // the two timber homes from the north-west, a little above (twin world coordinates) // the board's sample brief: a coastal site
function board() {
  $("#picks").innerHTML = `<p class="small" style="margin:0">Sample brief: a coastal site, NZS 3604 Zone ${SITE_ZONE}.</p>` + ORDER.map((cat) => {
    const opts = PRODUCTS.filter((p) => p.cat === cat), cur = byId[picks[cat]];
    const warn = cur.zones.length && !cur.zones.includes(SITE_ZONE) ? `<span class="warn"><br>${esc(cur.note || `Not rated for Zone ${SITE_ZONE}`)}</span>` : "";
    return `<div class="surface"><p class="mono label">${CATS[cat].label}</p><div class="row">${opts.map((p) => `<button class="swb" style="${sw(p)}" aria-pressed="${p.id === cur.id}" data-pick="${cat}:${p.id}" aria-label="${esc(p.name)}" title="${esc(p.name)}"></button>`).join("")}</div><p class="picked">${esc(cur.name)}<small>${esc(cur.supplier)} · sample${warn}</small></p></div>`;
  }).join("");
  $$("[data-pick]").forEach((b) => b.addEventListener("click", () => { const [c, id] = b.dataset.pick.split(":"); picks[c] = id; board(); rebuild(); }));
}
let frame = null, sunState = { md: "12-21", h: 15 };
function chrome(doc) {
  if (!doc || doc.getElementById("ap-embed")) return;
  const st = doc.createElement("style"); st.id = "ap-embed";
  st.textContent = `#al-nav,#panel,#panelToggle,#kicker,#title,#chips,#renderer,#status,#inspect,#tip,#labels,header,.card{display:none!important}
    html,body{background:#21121F!important;overflow:hidden!important}#c{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important}#north{opacity:.7}`;
  doc.head.append(st);
  setTimeout(() => doc.defaultView?.dispatchEvent(new Event("resize")), 50);
}
function setSun() {
  const doc = frame?.contentDocument, d = doc?.getElementById("sundate"), t = doc?.getElementById("suntime");
  if (!d || !t) return;
  d.value = `${new Date().getFullYear()}-${sunState.md}`; t.value = String(sunState.h); t.dispatchEvent(new Event("input"));
}
function openTwin() {
  const box = $("#twin"); box.classList.add("busy");
  if (!frame) { frame = document.createElement("iframe"); frame.title = "The live 16A twin, two timber homes, generated by Plan to 4D"; frame.setAttribute("allow", "fullscreen"); box.prepend(frame); }
  frame.style.visibility = "hidden";
  frame.onload = () => {
    const doc = frame.contentDocument; chrome(doc);
    // the twin builds after load; show it once its canvas has drawn
    let n = 0; const ready = () => { const ok = doc?.getElementById("suntimeout")?.textContent && doc.querySelector("#exports button"); if (ok || n++ > 240) { chrome(doc); setSun(); frame.style.visibility = "visible"; $("#twin-still").hidden = true; box.classList.remove("busy"); $("#sun").hidden = false; } else setTimeout(ready, 250); };
    ready();
  };
  frame.src = `/plan-studio/twins/16a/?fin=${finOf()}&cam=${CAM}`;
}
function rebuild() { if (frame) { $("#twin-still").hidden = false; openTwin(); } }
$("#twin-load").addEventListener("click", openTwin);
const SEASONS = { "12-21": "Midsummer", "03-20": "Autumn equinox", "06-21": "Midwinter" };
$("#season").innerHTML = Object.entries(SEASONS).map(([md, l]) => `<button class="pill" data-md="${md}" aria-pressed="${md === sunState.md}">${l}</button>`).join("");
$$("#season .pill").forEach((b) => b.addEventListener("click", () => { sunState.md = b.dataset.md; $$("#season .pill").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); setSun(); }));
$("#hour").addEventListener("input", (e) => { sunState.h = +e.target.value; const h = Math.floor(sunState.h); $("#hour-out").textContent = `${String(h).padStart(2, "0")}:${sunState.h % 1 ? "30" : "00"}`; setSun(); });
$("#ask-pro").addEventListener("click", async () => {
  const ok = await gate({ title: "Share this shortlist with up to three architects?", kicker: "You decide what's shared",
    body: `<p>ArchiPro matches architects who work in your region and on homes like this.</p><ul><li>Shared: the four products, the region and the exposure zone.</li><li>Not shared: your address, your drawings or your contact details, until you accept a reply.</li></ul>`, yes: "Share the shortlist" });
  $("#board-note").innerHTML = ok ? `<span class="chip sample">Simulated</span> Shortlist shared at ${new Date().toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit" })}. Nothing left this page.` : "Not shared. Your shortlist stays with you.";
});
board();

// ---------------------------------------------------------------------------------------------- 04 join
// A simulated run of the profile agent on an invented practice. Each step shows its source; publishing waits for the owner.
const P = PRACTICE, tagN = new Set(P.projects.flatMap((p) => p.tags)).size, withPeople = P.projects.filter((p) => p.people);
const thumb = (pr, i) => { const t = pr.tags.map((id) => byId[id]); const a = ["#BFD0D8", "#D9CFC0", "#C8D3CC", "#E0D2C8", "#C9CFD9", "#D6CBBF"][i % 6]; return `<div class="thumb" style="--a:${a};--b:#8C9A7E;--c:${t[1]?.swatch[0] || "#333"};--d:${t[0].swatch[0]}"><span>${esc(pr.title)}</span></div>`; };
$("#site").innerHTML = `<div class="bar"><i></i><i></i><i></i><span class="url">https://${P.site}</span></div><div class="body"><p class="mono label">The practice's own website · sample</p><h3>${esc(P.name)}</h3><p>${esc(P.about)}</p><div class="thumbs">${P.projects.map(thumb).join("")}</div><p class="mono" style="color:var(--mulberry)">${P.pages} pages · ${P.images} images</p></div>`;
const STEPS = [
  { t: `Read ${P.site}, and only that site`, ev: `${P.pages} pages · ${P.images} images · named by the practice` },
  { t: "Draft the profile", ev: "From /about and /services · wording marked draft" },
  { t: `Match ${P.projects.length} projects`, ev: `${P.images} images grouped by project`, flag: `${withPeople.length} projects show people: confirm you have their consent before these go live` },
  { t: `Tag ${tagN} products from the catalogue`, ev: "Suppliers are told only after you publish" },
  { t: "Suggest a plan", ev: `${P.projects.length} projects, residential focus · ArchiPro sets the plans and prices` },
];
function joinIdle() {
  $("#profile").innerHTML = `<p class="mono label">Profile agent · simulated run</p><form class="askform" id="joinform"><label class="sr" for="joinurl">Your website</label><input id="joinurl" value="${P.site}" readonly><button class="btn primary">Build my profile</button></form><ol class="steps-l" id="jsteps">${STEPS.map((s) => `<li><span class="st"></span><span><b>${esc(s.t)}</b></span></li>`).join("")}<li><span class="st"></span><span><b>Publish and start the trial</b><span class="ev">Needs the practice owner</span></span></li></ol>`;
  $("#joinform").addEventListener("submit", (e) => { e.preventDefault(); runJoin(); });
}
function card(stage) {
  return `<div class="card-p"><p class="mono label">Draft profile · ${stage}</p><h3>${esc(P.name)}</h3><p>${esc(P.about)}</p><div class="row">${P.services.map((s) => `<span class="t">${esc(s)}</span>`).join("")}<span class="t">${P.city}</span></div>
    <div class="projs">${P.projects.map((pr, i) => `<div>${thumb(pr, i)}${esc(pr.place)} · ${pr.tags.length} products${pr.people ? " · <b>held: people</b>" : ""}</div>`).join("")}</div>
    <div class="plan"><p>Suggested: the practice plan, billed yearly.<br><small>Plan names and prices are ArchiPro's to set; this is a sample.</small></p><span class="state" id="pstate">Draft · not published</span></div></div>`;
}
async function runJoin() {
  const lis = $$("#jsteps li"), btn = $("#joinform button"); btn.disabled = true;
  const thumbs = $$("#site .thumb");
  for (let i = 0; i < STEPS.length; i++) {
    lis[i].className = "run";
    if (i === 0) thumbs.forEach((t, k) => setTimeout(() => t.classList.add("read"), reduce ? 0 : k * 90));
    await new Promise((r) => setTimeout(r, reduce ? 0 : 420));
    lis[i].className = "done"; const s = STEPS[i];
    lis[i].lastElementChild.insertAdjacentHTML("beforeend", `<span class="ev">${esc(s.ev)}</span>${s.flag ? `<span class="ev flag">${esc(s.flag)}</span>` : ""}`);
    if (i === 1) $("#profile").insertAdjacentHTML("beforeend", `<div id="pcard">${card("assembling")}</div>`);
    if (i === 3) $("#pcard").innerHTML = card("ready for review");
  }
  thumbs.forEach((t) => t.classList.remove("read"));
  const last = lis[STEPS.length]; last.className = "hold";
  last.lastElementChild.insertAdjacentHTML("beforeend", `<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" id="publish">Review and publish</button><button class="btn" id="redo">Start again</button></div>`);
  $("#redo").addEventListener("click", joinIdle);
  $("#publish").addEventListener("click", async () => {
    const ok = await gate({ title: `Publish ${P.name} and start the trial?`, kicker: "Needs the practice owner",
      body: `<ul><li>Goes live: the profile, ${P.projects.length - withPeople.length} projects and their product tags.</li><li>Held back: ${withPeople.length} projects that show people, until you confirm consent.</li><li>Then: the tagged suppliers are told their products appear in your work.</li></ul><p>You can edit or unpublish any of it later.</p>`, yes: "Publish and start" });
    const ps = $("#pstate");
    if (ok) { last.className = "done"; ps.textContent = "Live · trial started (simulated)"; ps.style.color = "#2F6B4F";
      last.lastElementChild.innerHTML = `<b>Published and trial started</b><span class="ev">Evidence: source pages · draft v1 · owner's approval at ${new Date().toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit" })} · simulated</span>`; }
    else ps.textContent = "Kept as a draft · nothing published";
  });
}
joinIdle();

// ---------------------------------------------------------------------------------------------- 05 team
const CITIES = [["Auckland", "Pacific/Auckland"], ["Sydney", "Australia/Sydney"], ["Los Angeles", "America/Los_Angeles"]];
const localParts = (tz) => { const f = new Intl.DateTimeFormat("en-NZ", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: false, weekday: "short" }).formatToParts(new Date()); const g = (t) => f.find((x) => x.type === t)?.value; return { h: +g("hour") % 24, m: g("minute"), wd: g("weekday") }; };
function clocks() {
  $("#clocks").innerHTML = CITIES.map(([c, tz]) => { const { h, m, wd } = localParts(tz), open = h >= 8 && h < 18 && !/Sat|Sun/.test(wd);
    return `<div class="clock"><span class="mono">${c}</span><b>${String(h).padStart(2, "0")}:${m}</b><span class="when">${wd} · ${open ? "Team in, approving" : "After hours: agents preparing"}</span></div>`; }).join("");
}
clocks(); setInterval(clocks, 20000);
const logEl = $("#log");
const log = (q, what) => { const { h, m } = localParts(q.tz); logEl.insertAdjacentHTML("afterbegin", `<li>${String(h).padStart(2, "0")}:${m} ${q.market} · ${esc(q.agent)} · ${esc(what)} · ${esc(q.owner)}</li>`); $("#log-n").textContent = logEl.children.length; };
$("#queue").innerHTML = QUEUE.map((q) => `<article class="qc" id="${q.id}"><div class="head"><span class="mono who">${q.agent} agent · ${q.market}</span><span class="mono state">Waiting for approval</span></div><h3>${esc(q.title)}</h3><p>${esc(q.why)}</p><div class="draft" data-draft>${esc(q.draft)}</div><div class="acts"><button class="btn primary" data-act="ok">Approve</button><button class="btn" data-act="edit">Edit</button><button class="btn" data-act="no">Decline</button><span class="owner">${esc(q.owner)}</span></div></article>`).join("");
QUEUE.forEach((q) => {
  const el = $("#" + q.id), st = $(".state", el), dr = $("[data-draft]", el);
  $("[data-act=ok]", el).addEventListener("click", async () => {
    el.classList.add("held");
    const ok = await gate({ title: `Approve as ${q.owner}?`, kicker: `${q.agent} agent · ${q.market}`,
      body: `<p><b>The draft</b><br>${esc(dr.textContent)}</p><p><b>What happens</b><br>${esc(q.done)}</p><p class="small">Evidence kept: ${q.evidence.map(esc).join(" · ")}</p>`, yes: "Approve" });
    el.classList.remove("held");
    if (!ok) return;
    el.classList.add("done"); st.textContent = "Approved · simulated"; dr.contentEditable = "false";
    $(".acts", el).innerHTML = `<span class="small">${esc(q.done)}</span><span class="owner">${esc(q.owner)}</span>`; log(q, "approved");
  });
  $("[data-act=edit]", el).addEventListener("click", (e) => {
    const on = dr.contentEditable !== "true"; dr.contentEditable = String(on); e.target.textContent = on ? "Save edit" : "Edit";
    if (on) dr.focus(); else { st.textContent = "Edited · waiting for approval"; log(q, "edited the draft"); }
  });
  $("[data-act=no]", el).addEventListener("click", () => { el.classList.add("declined"); st.textContent = "Declined · nothing sent"; $(".acts", el).innerHTML = `<span class="small">Declined. The agent records why and doesn't retry.</span><span class="owner">${esc(q.owner)}</span>`; log(q, "declined"); });
});

// ---------------------------------------------------------------------------------------------- the studio, as proof
$("#roster").innerHTML = ROSTER.map((r) => `<article class="sp"><span class="mono">Specialist · ${STUDIO_TOTAL} in the studio</span><b>${esc(r.name)}</b><p>${esc(r.does)}</p><p class="lim"><b>Reviewed by</b> ${esc(r.reviewer)}.<br>${esc(r.limit)}</p></article>`).join("");
$("#rules").innerHTML = `<p class="mono label">The studio's code register</p><p class="small" style="margin:0 0 10px">${esc(RULES_NOTE)}.</p><ol>${RULES.map((r) => `<li><a href="${r.url}" target="_blank" rel="noopener">${esc(r.title)} ↗</a><small>${esc(r.authority)} · ${esc(r.reviewer)}</small><span class="mono">${esc(r.status)}</span></li>`).join("")}</ol>`;
$("#runs").innerHTML = [
  ["65.2 s", "a 48-frame fly-through rendered on the GPU, branded and delivered, on a laptop", "Measured local run · not a cloud benchmark"],
  ["1.87 M", "triangles rendered headless in Blender Cycles on Metal, without reducing the scene", "Measured local run"],
  ["NZ$29.15", "the most a full plan reading could cost: quoted, then held for approval. Nothing was spent", "Approval before spend"],
  ["94", "automated tests passing on the plan-reading service", "Studio checkpoint, Nov 2026"],
].map(([b, s, m]) => `<li><b>${b}</b><span>${s}</span><small>${m}</small></li>`).join("");
