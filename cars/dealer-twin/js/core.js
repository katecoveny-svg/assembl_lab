// Shared runtime: config, formatting, the ambient-motion switch, lazy loading, the simulated day and the MCP client.
export const CFG = window.TWIN_CFG;
export const D = window.DEALER;
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const fmt = (n, d = 0) => n == null || !isFinite(n) ? "–" : Number(n).toLocaleString("en-NZ", { maximumFractionDigits: d, minimumFractionDigits: d });
export const money = (n) => { if (n == null || !isFinite(n)) return "–"; const a = Math.abs(n), s = n < 0 ? "−" : ""; return a >= 1e6 ? s + "$" + fmt(a / 1e6, a >= 1e7 ? 1 : 2) + "m" : a >= 1e4 ? s + "$" + fmt(a / 1000, 0) + "k" : s + "$" + fmt(a); };
export const dollars = (n) => n == null || !isFinite(n) ? "–" : "$" + fmt(Math.round(n));
export const pct = (x, d = 0) => x == null || !isFinite(x) ? "–" : fmt(x * 100, d) + "%";
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const ease = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const TRUTH = { sim: "Simulated", est: "Estimate", src: "Source", data: "Your data", prop: "Proposed" };
export const chip = (t, label, cls = "") => `<span class="chip ${cls}"${t && t !== "sim" ? ` data-t="${t}"` : ""}>${esc(label || TRUTH[t] || t)}</span>`;
export const reducedMQ = matchMedia("(prefers-reduced-motion: reduce)");
export const narrowMQ = matchMedia("(max-width: 760px)");

// ---------------------------------------------------------------- ambient motion: one switch for every decorative loop (the film, tile dots,
// the parts journey). Off by default when the visitor prefers reduced motion. The simulated clock has its own pause.
export const ambient = {
  paused: reducedMQ.matches, subs: new Set(),
  set(p) { this.paused = p; this.subs.forEach((f) => f(p)); },
  on(f) { this.subs.add(f); f(this.paused); return () => this.subs.delete(f); },
};

// ---------------------------------------------------------------- one animation loop for everything that draws
const loops = new Set(); let last = performance.now();
export function onFrame(f) { loops.add(f); return () => loops.delete(f); }
function tick(now) { const dt = Math.min(0.1, (now - last) / 1000); last = now; if (!document.hidden) loops.forEach((f) => { try { f(dt, now); } catch (e) { console.error(e); loops.delete(f); } }); requestAnimationFrame(tick); }
requestAnimationFrame(tick);

// ---------------------------------------------------------------- lazy loading
export function onNear(el, cb, margin = "600px 0px") {
  if (!el) return; let done = false; const go = () => { if (!done) { done = true; cb(); } };
  if (!("IntersectionObserver" in window)) return go();
  const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); go(); } }, { rootMargin: margin }); io.observe(el);
}
export function isVisible(el, cb) { let on = false; if (!("IntersectionObserver" in window)) { cb(true); return () => true; }
  new IntersectionObserver((es) => { on = es.some((e) => e.isIntersecting); cb(on); }).observe(el); return () => on; }
const scripts = {};
export function loadScript(src) { return scripts[src] || (scripts[src] = new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.async = false; s.onload = res; s.onerror = () => rej(new Error("Could not load " + src)); document.head.appendChild(s); })); }
export function loadCSS(href) { if (document.querySelector(`link[href="${href}"]`)) return; const l = document.createElement("link"); l.rel = "stylesheet"; l.href = href; document.head.appendChild(l); }
export const json = (u) => fetch(u, { headers: { accept: "application/json" } }).then((r) => { if (!r.ok) throw new Error(u + " " + r.status); return r.json(); });
export function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.decoding = "async"; i.onload = () => res(i); i.onerror = () => rej(new Error("image " + src)); i.src = src; }); }

// ---------------------------------------------------------------- the simulated day (the same engine as the 3D twin), shared by every section
export const sim = (() => {
  const S = { ...D.BASE }; let day = 0, d = D.newDay(S, 3), G = D.group(S), ev = D.commerceDay(S, G.F, 1), acc = 0, data = {};
  const subs = new Set(), dataSubs = new Set();
  const o = {
    S, speed: 20, playing: true, realT: 0,
    get d() { return d; }, get ev() { return ev; }, get F() { return G.F; }, get P() { return G.P; }, get G() { return G; }, get day() { return day; }, get data() { return data; },
    on(f) { subs.add(f); return () => subs.delete(f); }, onData(f) { dataSubs.add(f); return () => dataSubs.delete(f); },
    recompute() { G = Object.keys(data).length ? D.fromData(data, S) : D.group(S); dataSubs.forEach((f) => f()); },
    setData(table, t) { data[table] = t; this.recompute(); }, clearData() { data = {}; this.recompute(); },
    newDay() { d = D.newDay(S, day + 3); ev = D.commerceDay(S, G.F, day + 1); },
    step(n) { for (let i = 0; i < n; i++) { D.step(S, d); if (d.t > D.CLOSE + 60) { day++; o.newDay(); for (let k = 0; k < 40; k++) D.step(S, d); } } },
    clock() { const m = Math.floor(d.t), h = Math.floor(m / 60), mm = m % 60; return `${((h + 11) % 12) + 1}:${String(mm).padStart(2, "0")} ${h >= 12 ? "pm" : "am"}`; },
    dayName() { return ["Tuesday", "Wednesday", "Thursday", "Friday", "Monday"][day % 5]; },
    hcToday() { const t = d.t, out = []; d.jobs.forEach((j) => { const h = D.healthCheck(j, S); if (!h) return; const stage = D.hcStage(h, t); if (!stage || stage === "hoist") return; out.push({ j, h, stage }); }); return out; },
    live() { const t = d.t, s = D.dayStats(S, d), leadsT = ev.leads.filter((l) => l.t <= t), inV = ev.visits.filter((v) => v.t <= t && t < v.end);
      return { t, s, leadsT: leadsT.length, waitL: leadsT.filter((l) => l.ans > t).length, fast: leadsT.filter((l) => l.resp <= 5).length, inRoom: inV.length, people: inV.reduce((a, v) => a + v.people, 0),
        inFi: ev.deals.filter((x) => x.fi0 <= t && t < x.fi1).length, delivered: ev.deals.filter((x) => x.hand1 <= t).length, agreed: ev.deals.filter((x) => x.v.end <= t).length,
        recon: ev.recon.filter((r) => r.t0 <= t && t < r.t1).length, appr: ev.appraisals.filter((a) => a.t <= t).length, picks: d.jobs.filter((j) => j.start != null && j.start <= t).length,
        usedSold: ev.usedSales.filter((u) => u.t <= t).length, visitsToday: ev.visits.filter((v) => v.t <= t).reduce((a, v) => a + v.people, 0),
        reconBays: [0, 1, 2].map((b) => { const r = ev.recon.find((x) => x.bay === b && x.t0 <= t && t < x.t1); return r ? (t - r.t0) / (r.t1 - r.t0) : 0; }),
        bays: Array.from({ length: S.bays }, (_, b) => d.jobs.some((j) => j.state === "work" && j.bay === b)), offices: [0, 1, 2, 3].map((k) => ev.deals.some((x) => x.office === k && x.fi0 <= t && t < x.fi1)) }; },
  };
  o.step(42); // open the day at 8:02 on a Tuesday
  let pt = 0;
  onFrame((dt) => { if (o.playing) { acc += dt * o.speed; const n = Math.floor(acc); if (n) { acc -= n; o.step(n); } o.realT += dt; } pt += dt; if (pt > .25) { pt = 0; const L = o.live(); subs.forEach((f) => f(L)); } });
  return o;
})();
window.__dealer = { S: sim.S, get day() { return sim.d; } }; // read by the full parts desk (private build) when it follows the twin's clock

// ---------------------------------------------------------------- MCP client: JSON-RPC over HTTP, one call per tool use
let seq = 0;
export async function mcp(name, args, timeoutMs = 25000) {
  const c = new AbortController(), timer = setTimeout(() => c.abort(), timeoutMs), t0 = performance.now();
  try {
    const r = await fetch(CFG.api, { method: "POST", signal: c.signal, headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: ++seq, method: "tools/call", params: { name, arguments: args } }) });
    if (!r.ok) throw new Error(`The car tool answered ${r.status}.`);
    let j; const ct = r.headers.get("content-type") || "";
    if (ct.includes("event-stream")) { const txt = await r.text(); const line = txt.split("\n").filter((l) => l.startsWith("data:")).pop(); j = JSON.parse(line.slice(5)); } else j = await r.json();
    if (j.error) throw new Error(j.error.message || "The car tool returned an error.");
    return { ms: Math.round(performance.now() - t0), sc: j.result.structuredContent, text: j.result.content && j.result.content[0] && j.result.content[0].text, isError: j.result.isError, request: { name, arguments: args } };
  } catch (e) { if (e.name === "AbortError") throw new Error("The car tool took too long to answer."); throw e; } finally { clearTimeout(timer); }
}

// ---------------------------------------------------------------- JSON for the "how an assistant sees it" views
export function jsonHTML(v) {
  return esc(JSON.stringify(v, null, 2)).replace(/(&quot;[^&]*?&quot;)(\s*:)?|\b(-?\d+(?:\.\d+)?)\b|\b(true|false|null)\b/g, (m, s, colon, n, b) => s ? (colon ? `<span class="k">${s}</span>${colon}` : `<span class="s">${s}</span>`) : n ? `<span class="n">${n}</span>` : `<span class="n">${b}</span>`);
}
export const ICON = {
  pause: '<svg class="ico" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><rect x="4" y="3" width="2.6" height="10" rx=".6"/><rect x="9.4" y="3" width="2.6" height="10" rx=".6"/></svg>',
  play: '<svg class="ico" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M5 3.2v9.6c0 .5.5.8.9.5l7.2-4.8a.6.6 0 0 0 0-1L5.9 2.7c-.4-.3-.9 0-.9.5z"/></svg>',
};
export function pauseBtn(btn, paused, what) { btn.setAttribute("aria-pressed", paused ? "true" : "false"); btn.setAttribute("aria-label", (paused ? "Play " : "Pause ") + what); btn.innerHTML = paused ? ICON.play : ICON.pause; }
export function download(blob, name) { const u = URL.createObjectURL(blob), a = document.createElement("a"); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); }
