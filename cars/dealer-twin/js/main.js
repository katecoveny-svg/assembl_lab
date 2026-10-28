// Entry: the showroom hero starts at once; every other section loads its module when it comes near the viewport.
import { $, onNear } from "./core.js";
import { initShow } from "./showroom.js";

initShow();
const lazy = [["#stock", () => import("./stock.js").then((m) => m.initStock())], ["#intro", () => import("./hero.js").then((m) => m.initHero())],
  ["#twin", () => import("./twin.js").then((m) => m.initTwin())], ["#desk", () => import("./desk.js").then((m) => m.initDesk())],
  ["#check", () => import("./cartool.js").then((m) => m.initCheck())], ["#studio", () => import("./studio.js").then((m) => m.initStudio())],
  ["#market", () => import("./market.js").then((m) => m.initMarket())], ["#parts", () => import("./parts.js").then((m) => m.initParts())],
  ["#connect", () => import("./connect.js").then((m) => m.initConnect())]];
// the branch moment plays its loop only while it's on screen (and never with reduced motion or a paused page)
const bv = document.getElementById("branchV");
if (bv && window.TWIN_CFG.branch) import("./core.js").then(({ ambient, reducedMQ }) => {
  window.TWIN_CFG.branch.sources.forEach(([s, ty]) => { const e = document.createElement("source"); e.src = s; e.type = ty; bv.appendChild(e); });
  let vis = false; const sync = () => { if (vis && !ambient.paused && !reducedMQ.matches) { bv.preload = "auto"; bv.play().catch(() => {}); } else bv.pause(); };
  new IntersectionObserver((es) => { vis = es[0].isIntersecting; sync(); }, { threshold: .25 }).observe(bv); ambient.on(sync); });
lazy.forEach(([sel, go]) => { const el = $(sel); if (el) onNear(el, () => go().catch((e) => console.error(sel, e)), "900px 0px"); });
// scroll reveals: anything marked data-rv rises into place once, as it enters (reduced motion: already in place, see the CSS)
const rv = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); rv.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
const watch = () => document.querySelectorAll("[data-rv]:not(.in)").forEach((el) => rv.observe(el));
watch(); new MutationObserver(() => watch()).observe(document.body, { childList: true, subtree: true });
// the section in view is marked in the bar; over the dark stages (the showroom, the desk) the bar turns dark too
const links = [...document.querySelectorAll(".nav a")], bar = $("#bar");
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) links.forEach((a) => a.setAttribute("aria-current", a.getAttribute("href") === "#" + e.target.id ? "true" : "false")); }), { rootMargin: "-45% 0px -50% 0px" });
["show", "stock", "intro", "twin", "desk", "check", "studio", "market", "parts", "connect", "method"].forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
const dark = new Set();
bar.classList.add("dark");   // the page opens on the dark showroom
const dio = new IntersectionObserver((es) => { es.forEach((e) => (e.isIntersecting ? dark.add(e.target) : dark.delete(e.target))); bar.classList.toggle("dark", dark.size > 0); }, { rootMargin: "-2px 0px -97% 0px" });
["#show", "#intro", "#desk"].forEach((s) => { const el = $(s); if (el) dio.observe(el); });
