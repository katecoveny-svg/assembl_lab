// Entry: the showroom hero starts at once; every other section loads its module when it comes near the viewport.
import { $, onNear, sim, ambient, reducedMQ } from "./core.js";
import { initShow } from "./showroom.js";

initShow();
const lazy = [["#stock", () => import("./stock.js").then((m) => m.initStock())], ["#twin", () => import("./twin.js").then((m) => m.initTwin())],
  ["#market", () => import("./market.js").then((m) => m.initMarket())], ["#parts", () => import("./parts.js").then((m) => m.initParts())],
  ["#connect", () => import("./connect.js").then((m) => m.initConnect())]];
lazy.forEach(([sel, go]) => { const el = $(sel); if (el) onNear(el, () => go().catch((e) => console.error(sel, e)), "900px 0px"); });

// "Watch a day run": to the simulator, running at 20×
const watch = $("#watchDay");
if (watch) watch.addEventListener("click", () => { sim.playing = true; sim.speed = 20; const sp = document.getElementById("simPause"); if (sp) sp.setAttribute("aria-pressed", "false"); });

// the simulator's band: its loop plays only while on screen (never with reduced motion or a paused page)
const sv = $("#simV");
if (sv && window.TWIN_CFG.simLoop) {
  window.TWIN_CFG.simLoop.forEach(([s, ty]) => { const e = document.createElement("source"); e.src = s; e.type = ty; sv.appendChild(e); });
  let vis = false; const sync = () => { if (vis && !ambient.paused && !reducedMQ.matches) { sv.preload = "auto"; sv.play().catch(() => {}); } else sv.pause(); };
  new IntersectionObserver((es) => { vis = es[0].isIntersecting; sync(); }, { threshold: .2 }).observe(sv); ambient.on(sync);
}

// the agent desk: explained first; the working desk opens on request
const open = $("#deskOpen"), desk = $("#desk");
if (open && desk) open.addEventListener("click", () => {
  const on = desk.hidden; desk.hidden = !on; open.setAttribute("aria-expanded", String(on));
  if (on) { import("./desk.js").then((m) => { if (!desk.dataset.ready) { desk.dataset.ready = "1"; m.initDesk(); } }).catch((e) => console.error("#desk", e)); desk.scrollIntoView({ behavior: reducedMQ.matches ? "auto" : "smooth", block: "start" }); }
});

// scroll reveals: anything marked data-rv rises into place once, as it enters (reduced motion: already in place, see the CSS)
const rv = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); rv.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
const watchRv = () => document.querySelectorAll("[data-rv]:not(.in)").forEach((el) => rv.observe(el));
watchRv(); new MutationObserver(() => watchRv()).observe(document.body, { childList: true, subtree: true });
// the section in view is marked in the bar; over the dark sections the bar turns dark too
const links = [...document.querySelectorAll(".nav a")], bar = $("#bar");
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) links.forEach((a) => a.setAttribute("aria-current", a.getAttribute("href") === "#" + e.target.id ? "true" : "false")); }), { rootMargin: "-45% 0px -50% 0px" });
["show", "sim", "agents", "stock", "parts", "market", "connect", "method"].forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
const dark = new Set();
bar.classList.add("dark");   // the page opens on the dark showroom
const dio = new IntersectionObserver((es) => { es.forEach((e) => (e.isIntersecting ? dark.add(e.target) : dark.delete(e.target))); bar.classList.toggle("dark", dark.size > 0); }, { rootMargin: "-2px 0px -97% 0px" });
["#show", "#simBand", "#agents", "#desk", "#connect"].forEach((s) => { const el = $(s); if (el) dio.observe(el); });

// the four steps: each lights as it reaches the reading line, and the line between them fills to match (reduced motion: all lit)
const steps = $("#steps4");
if (steps) {
  const lis = [...steps.children];
  const paint = () => {
    if (reducedMQ.matches) { lis.forEach((li) => li.classList.add("on")); steps.style.setProperty("--p", "1"); return; }
    const vh = innerHeight, tops = lis.map((li) => li.getBoundingClientRect().top), row = Math.abs(tops[1] - tops[0]) < 4;
    const clamp = (x) => Math.max(0, Math.min(1, x));
    // side by side: the line fills as the row climbs the screen; stacked: it follows the reading line down the list
    const t = row ? clamp((vh * .88 - tops[0]) / (vh * .5)) : clamp((vh * .72 - tops[0]) / Math.max(1, tops[tops.length - 1] - tops[0]));
    const lit = row ? (i) => tops[0] < vh * .88 && t >= i / (lis.length - 1) - .02 : (i) => tops[i] < vh * .72;
    lis.forEach((li, i) => li.classList.toggle("on", lit(i)));
    steps.style.setProperty("--p", t.toFixed(3));
  };
  let queued = false, near = false;
  const onScroll = () => { if (near && !queued) { queued = true; requestAnimationFrame(() => { queued = false; paint(); }); } };
  new IntersectionObserver((es) => { near = es[0].isIntersecting; if (near) paint(); }, { rootMargin: "50% 0px 50% 0px" }).observe(steps);
  addEventListener("scroll", onScroll, { passive: true }); addEventListener("resize", onScroll); reducedMQ.addEventListener?.("change", paint);
  paint();
}
