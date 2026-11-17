// 03 · The drawing set. assembl Plan Studio, running on this page: one model of a fictional house drives the 3D, four A3
// working-drawing sheets, the advisory NZ Building Code pre-check and the IFC and DXF files. The products in the
// specification (chapter 02) become materials on the model, so their names land on the elevations and in the IFC.
// The page's agent drives it through window.__studio; every change is reversible and stays on this page.
import { houseProject, DEFAULTS, PITCH, LIMITS } from "./house.js";
import { runChecks, summarise, DISCLAIMER } from "/plan-studio/js/code.js";
import { sheetSet } from "/plan-studio/js/drawings.js";
import { toIFC, toDXF, toJSON } from "/plan-studio/js/exports.js";
import { MATERIALS } from "/plan-studio/js/materials.js";
import { polyArea } from "/plan-studio/js/model.js";
import { PRODUCTS, byId, CATS } from "./data.js";

const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const root = $("#drawings");

// ---------------------------------------------------------------------------------------------- catalogue → materials
// Each sample product becomes a Plan Studio material, so the drawings and the IFC name it. Colours are approximate.
const PCAT = { cladding: "cladding", roof: "roof", joinery: "glazing", decking: "deck" };
for (const p of PRODUCTS) {
  if (!PCAT[p.cat]) continue;
  const metal = p.tags.includes("metal") || p.tags.includes("steel");
  const pattern = p.cat === "roof" ? "seam" : p.cat === "decking" ? "boards-h" : p.cat === "cladding" ? (metal ? "rib-v" : p.tags.includes("painted") ? "boards-h" : "boards-v") : undefined;
  MATERIALS["ap-" + p.id] = { name: `${p.name}, ${p.supplier} (sample)`, cat: PCAT[p.cat], maker: `${p.supplier}: an invented sample supplier`, hex: p.swatch[0], approx: true,
    pattern, rough: metal ? 0.42 : 0.72, metal: metal ? 0.25 : 0, note: p.line };
}
const ELEMENTS = ["cladding", "roof", "joinery", "decking"];

// ---------------------------------------------------------------------------------------------- state
const levers = { ...DEFAULTS };
const picks = { cladding: "mf-cedar-black", roof: "os-corr-black-marine", joinery: "hj-tb-black", decking: "mf-hw-silver" };
let P = null, results = [], sheets = [], sheetId = "A101", stage = null, cloud = null;

function build() {
  const H = houseProject(levers), m = (c) => (picks[c] && MATERIALS["ap-" + picks[c]] ? "ap-" + picks[c] : null);
  if (m("cladding")) H.walls.filter((w) => w.kind === "ext").forEach((w) => (w.mat = m("cladding")));
  if (m("roof")) H.roof.mat = m("roof");
  if (m("joinery")) H.openings.filter((o) => o.kind === "window").forEach((o) => (o.mat = m("joinery")));
  if (m("decking")) H.decks.forEach((d) => (d.mat = m("decking")));
  return H;
}
const area = (H) => H.rooms.reduce((a, r) => a + polyArea(r.poly), 0) / 1e6;
const deckArea = (H) => (H.decks || []).reduce((a, d) => a + polyArea(d.poly), 0) / 1e6;
const STATUS = { pass: "Clears the pre-check", fail: "To resolve", info: "Needs a figure", out: "Out of scope" };

// ---------------------------------------------------------------------------------------------- the brief (levers)
const m1 = (mm) => (mm / 1000).toFixed(1);
function leversUI() {
  const range = (key, label, step = 300) => `<label class="lever"><span class="mono">${label}</span><output data-out="${key}">${m1(levers[key])} m</output>
    <input type="range" data-lever="${key}" min="${LIMITS[key][0]}" max="${LIMITS[key][1]}" step="${step}" value="${levers[key]}"></label>`;
  const opts = (cat) => PRODUCTS.filter((p) => p.cat === cat).map((p) => `<option value="${p.id}" ${picks[cat] === p.id ? "selected" : ""}>${esc(p.name)}</option>`).join("");
  $("#ds-levers").innerHTML = `
    <p class="mono label">The brief</p>
    ${range("livingWidth", "Living wing width")}
    ${range("deckDepth", "Deck depth")}
    ${range("kitchenWindow", "Kitchen window")}
    <fieldset class="lever"><legend class="mono">Roof pitch</legend><div class="pills" id="ds-pitch">${Object.keys(PITCH).map((k) => `<button class="pill" data-pitch="${k}" aria-pressed="${levers.pitch === k}">${k[0].toUpperCase() + k.slice(1)}</button>`).join("")}</div></fieldset>
    <p class="mono label spec-l">From the specification</p>
    ${ELEMENTS.map((c) => `<label class="pick"><span class="mono">${CATS[c].label}</span><select data-pick="${c}">${opts(c)}</select></label>`).join("")}`;
}
root.addEventListener("input", (e) => {
  const k = e.target.dataset?.lever; if (!k) return;
  levers[k] = +e.target.value; $(`[data-out="${k}"]`).textContent = `${m1(levers[k])} m`; changed();
});
root.addEventListener("change", (e) => {
  const c = e.target.dataset?.pick; if (!c) return;
  picks[c] = e.target.value; window.__page?.setSpec?.(c, picks[c], { quiet: true }); changed();
});
root.addEventListener("click", (e) => {
  const b = e.target.closest("[data-pitch]"); if (!b) return;
  levers.pitch = b.dataset.pitch; $$("#ds-pitch [data-pitch]").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); changed();
});
// the specification chapter tells us when its schedule changes
document.addEventListener("ap:spec", (e) => {
  let moved = false;
  for (const c of ELEMENTS) if (e.detail[c] && e.detail[c] !== picks[c]) { picks[c] = e.detail[c]; moved = true; }
  if (moved) { for (const c of ELEMENTS) { const s = $(`[data-pick="${c}"]`); if (s) s.value = picks[c]; } changed(); }
});

// ---------------------------------------------------------------------------------------------- figures, checks, sheets
function figures() {
  const s = summarise(results), n = results.length;
  $("#ds-figs").innerHTML = [
    [area(P).toFixed(0), "m²", "Floor area, measured off the model"],
    [deckArea(P).toFixed(0), "m²", "North deck"],
    [String(sheets.length || 4).padStart(2, "0"), "", "A3 sheets, drawn from the model"],
    [`${s.pass}/${n}`, "", "Pre-checks cleared"],
    [String(s.fail), "", s.fail === 1 ? "Item to resolve" : "Items to resolve"],
  ].map(([v, u, l], i) => `<li class="${i === 4 && s.fail ? "hot" : ""}"><b>${v}<small>${u}</small></b><span>${l}</span></li>`).join("");
}
function checks() {
  const order = { fail: 0, info: 1, pass: 2, out: 3 };
  const rs = [...results].sort((a, b) => order[a.status] - order[b.status]);
  $("#ds-code").innerHTML = `<p class="mono label">NZ Building Code pre-check · ${results.length} items</p>
    <ol class="checks">${rs.map((r) => `<li class="ck ${r.status}"><span class="mono cl">${esc(r.clause)}</span><b>${esc(r.title)}</b>
      <span class="ms">${esc(r.measured || "")}${r.limit ? ` <i>against ${esc(r.limit)}</i>` : ""}</span><span class="mono st">${STATUS[r.status]}</span></li>`).join("")}</ol>
    <p class="small disc">${esc(DISCLAIMER)}</p>`;
}
function drawSheet(animate) {
  sheets = sheetSet(P, results);
  $("#ds-tabs").innerHTML = sheets.map((s) => `<button role="tab" aria-selected="${s.id === sheetId}" data-sheet="${s.id}"><span class="mono">${s.id}</span> ${esc(s.title)}</button>`).join("");
  const host = $("#ds-sheet"), s = sheets.find((x) => x.id === sheetId) || sheets[0];
  host.innerHTML = s.svg; host.setAttribute("aria-label", `${s.id} ${s.title}`);
  window.__sheets = Object.fromEntries(sheets.map((x) => [x.id, x.svg]));
  document.dispatchEvent(new CustomEvent("ap:sheets", { detail: window.__sheets }));
  if (animate && !reduce) {
    const els = $$("path, line, polyline, polygon, rect, circle", host), n = els.length;
    host.classList.remove("ink"); void host.offsetWidth;
    els.forEach((el, i) => { el.setAttribute("pathLength", "1"); el.style.setProperty("--d", `${((i / n) * 1.1).toFixed(3)}s`); });
    host.classList.add("ink");
  }
}
$("#ds-tabs").addEventListener("click", (e) => { const b = e.target.closest("[data-sheet]"); if (b) showSheet(b.dataset.sheet); });
function showSheet(id) { if (!sheets.some((s) => s.id === id)) return false; sheetId = id; drawSheet(true); return true; }

// ---------------------------------------------------------------------------------------------- print and files
const save = (text, type, name) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
function printSet() {
  const set = sheetSet(P, results), f = document.createElement("iframe");
  f.setAttribute("aria-hidden", "true"); f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  f.srcdoc = `<!doctype html><html lang="en-NZ"><title>${esc(P.meta.number)} drawing set</title><style>@page{size:420mm 297mm;margin:0}html,body{margin:0;background:#fff}svg{display:block;width:420mm;height:297mm;break-after:page;page-break-after:always}</style>${set.map((s) => s.svg).join("")}</html>`;
  f.onload = () => setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch { /* print blocked */ } setTimeout(() => f.remove(), 60000); }, 250);
  document.body.append(f);
  return set.length;
}
$("#ds-print").addEventListener("click", printSet);
$("#ds-ifc").addEventListener("click", () => save(toIFC(P), "application/x-step", `${P.meta.number}-sample.ifc`));
$("#ds-dxf").addEventListener("click", () => save(toDXF(P), "application/dxf", `${P.meta.number}-sample.dxf`));
$("#ds-svg").addEventListener("click", () => { const s = sheets.find((x) => x.id === sheetId); save(s.svg, "image/svg+xml", `${P.meta.number}-${s.id}.svg`); });
$("#ds-json").addEventListener("click", () => save(toJSON(P), "application/json", `${P.meta.number}-model.json`));

// ---------------------------------------------------------------------------------------------- 3D: the solid stage and the point cloud
const glassWeight = (m) => (m.material?.transparent && m.material.opacity < 1 ? 0.18 : m.name === "SLAB" ? 0.5 : 1);
let look = "collage", userMoved = false, baseOff = null;
// the collage: the live model as white planes and fine edges, set into a pale, misty landscape (the sky and hills of the
// two-homes render, desaturated). Rebuilt over the model after every change.
let mistTex = null, collageOn = false;
const WHITE = {}, saved = new Map();
async function mist(THREE) {
  if (mistTex) return mistTex;
  const img = new Image(); img.src = "./media/two-homes-render.webp"; await img.decode();
  const c = document.createElement("canvas"); c.width = 1600; c.height = 900; const g = c.getContext("2d");
  g.drawImage(img, 0, 0, img.width, img.height * 0.6, 0, 0, c.width, c.height);
  const d = g.getImageData(0, 0, c.width, c.height), px = d.data;
  for (let i = 0; i < px.length; i += 4) {
    const l = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255, t = Math.min(1, Math.max(0, (l + 0.05) / 1.0));
    const r = 107 + (246 - 107) * t, gg = 97 + (242 - 97) * t, b = 102 + (239 - 102) * t;   // plum-grey to bone
    px[i] = r * 0.7 + px[i] * 0.3 * 0.55 + 255 * 0.3 * 0.45; px[i + 1] = gg * 0.7 + px[i + 1] * 0.3 * 0.55 + 255 * 0.3 * 0.45; px[i + 2] = b * 0.7 + px[i + 2] * 0.3 * 0.55 + 255 * 0.3 * 0.45;
  }
  g.putImageData(d, 0, 0);
  mistTex = new THREE.CanvasTexture(c); mistTex.colorSpace = THREE.SRGBColorSpace; return mistTex;
}
function collage(on) {
  const T = stage.THREE, scene = stage.scene;
  if (!WHITE.wall) {
    WHITE.wall = new T.MeshStandardMaterial({ color: "#FFFFFF", emissive: "#EFEAE6", emissiveIntensity: 0.42, roughness: 1, metalness: 0 });
    WHITE.glass = new T.MeshStandardMaterial({ color: "#E9EEF0", roughness: 0.1, transparent: true, opacity: 0.16, depthWrite: false });
    WHITE.edge = new T.LineBasicMaterial({ color: "#2E1028", transparent: true, opacity: 0.55 });
    WHITE.ground = new T.MeshStandardMaterial({ color: "#E4DFD8", roughness: 1 });
  }
  const ground = scene.children.filter((o) => o.isMesh && (o.geometry?.type === "CircleGeometry" || o.geometry?.type === "PlaneGeometry"));
  if (on) {
    for (const o of ground) { if (!saved.has(o)) saved.set(o, o.material); o.material = WHITE.ground; }
    stage.model?.traverse((o) => {
      if (!o.isMesh || o.userData.collage) return;
      if (!saved.has(o)) saved.set(o, o.material);
      o.material = o.material?.transparent ? WHITE.glass : WHITE.wall;
      if (!o.material.transparent && o.geometry) { const e = new T.LineSegments(new T.EdgesGeometry(o.geometry, 28), WHITE.edge); e.userData.collage = true; o.add(e); }
    });
    if (mistTex) scene.background = mistTex;
    scene.fog = new T.Fog("#EEE9E6", 70, 240);
  } else {
    for (const [o, m] of saved) o.material = m; saved.clear();
    const kill = []; stage.model?.traverse((o) => { if (o.userData.collage) kill.push(o); }); kill.forEach((o) => { o.parent.remove(o); o.geometry.dispose(); });
    scene.fog = null; stage.light("golden");
  }
  collageOn = on;
}
async function boot3d() {
  const S = await import("/plan-studio/js/scene.js"), { OrbitControls } = await import("three/addons/controls/OrbitControls.js");
  stage = S.createStage($("#ds-solid"), P, { lighting: "golden" }); stage.S = S; stage.resize(); stage.view("aerial");
  try { await mist(stage.THREE); } catch { /* collage falls back to the plain sky */ }
  const ctl = new OrbitControls(stage.camera, stage.renderer.domElement); ctl.target.copy(stage.target); ctl.maxPolarAngle = Math.PI * 0.48; ctl.enableZoom = false; stage.ctl = ctl;
  ctl.addEventListener("change", () => stage.render());
  ctl.addEventListener("start", () => (userMoved = true));
  baseOff = stage.camera.position.clone().sub(ctl.target); ctl.update(); stage.render();
  addEventListener("resize", () => { stage.resize(); stage.render(); cloud?.resize?.(); });
  try { await bootCloud(); } catch (e) { console.warn("Point cloud unavailable:", e.message); $('[data-look="cloud"]').hidden = true; setLook(look === "cloud" ? "collage" : look); }
  orbit();
}
async function bootCloud() {
  const { createEngine, objectForm } = await import("/lab/pc/engine.js");
  cloud = createEngine($("#ds-cloud"), { budget: innerWidth < 760 ? 70000 : 200000, sway: false, reduceMotion: reduce }); cloud.setLift(0.5, 0.48);
  const sizeBase = 2.6 * Math.sqrt(300000 / cloud.N);
  cloud.onFrame = () => {
    const c = stage.camera, e = cloud.camera; e.position.copy(c.position); e.quaternion.copy(c.quaternion); e.fov = c.fov; e.near = 0.1; e.far = 4000; e.updateProjectionMatrix();
    const d = c.position.distanceTo(stage.ctl.target); cloud.uniforms.uNear.value = d * 0.6; cloud.uniforms.uFar.value = d * 1.9;
    cloud.uniforms.uSize.value = sizeBase * Math.min(1.25, Math.max(0.75, cloud.renderer.domElement.clientHeight / 900)) * (d / 3.4);
  };
  const form = () => objectForm(stage.S.buildModel(P, { furniture: true, cutaway: look === "plan" }), cloud.N, { weight: glassWeight, edgeShare: 0.36, groundShare: 0.08 });
  cloud.rebuild = (first) => {
    const f = form(); let top = 0; for (let i = 0; i < f.n; i++) top = Math.max(top, f.pos[i * 3 + 1]);
    if (first) cloud.assembleFrom(f, { offset: [0, 0, 0], scale: 1, ms: 3200 }); else cloud.setForm(f, { offset: [0, 0, 0], scale: 1, ms: 1400 });
    setTimeout(() => cloud.scan(2600, -0.2, top + 0.4), first ? 2800 : 1200);
  };
  setLook(look);
  new IntersectionObserver(([x]) => { if ((look === "cloud" || look === "plan") && x.isIntersecting) cloud.start(); else cloud.stop(); }).observe($("#ds-cloud"));
}
let cloudShown = false;
function setLook(next) {
  look = next;
  $$("#ds-look button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.look === look)));
  if (!stage) return;
  const plan = look === "plan";
  if (collageOn) collage(false);
  stage.setCutaway(plan); stage.view(plan ? "plan" : look === "collage" ? "rear" : "aerial");
  if (look === "collage") {
    stage.light("day"); collage(true);
    const t = stage.target, c = stage.camera.position; c.sub(t).multiplyScalar(0.62).add(t); c.y += 1.6; stage.camera.lookAt(t);
  }
  $(".ds-stage").dataset.look = look; stage.ctl.target.copy(stage.target); baseOff = stage.camera.position.clone().sub(stage.ctl.target); userMoved = plan; stage.ctl.enableRotate = !plan; stage.ctl.update();
  const pts = look === "cloud" || look === "plan";
  $("#ds-cloud").hidden = !pts;
  if (cloud) { if (!pts) cloud.stop(); else { cloud.start(); cloud.rebuild(!cloudShown); cloudShown = true; } }
  stage.render(); orbit();
}
$("#ds-look").addEventListener("click", (e) => { const b = e.target.closest("[data-look]"); if (b) setLook(b.dataset.look); });
// scroll turns the house a little, until you take the camera yourself
function orbit() {
  if (!stage || userMoved || !baseOff || reduce) return;
  const r = $(".ds-stage").getBoundingClientRect(), p = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight + r.height)));
  const a = (p - 0.5) * 0.9, off = baseOff.clone().applyAxisAngle(new stage.THREE.Vector3(0, 1, 0), a);
  stage.camera.position.copy(stage.ctl.target).add(off); stage.camera.lookAt(stage.ctl.target); stage.render();
}
addEventListener("scroll", () => requestAnimationFrame(orbit), { passive: true });
new IntersectionObserver(([x]) => { if (x.isIntersecting && !stage) boot3d(); }, { rootMargin: "400px" }).observe($(".ds-stage"));

// ---------------------------------------------------------------------------------------------- one change, everything follows
let tSheet = 0, tCloud = 0;
function changed() {
  P = build(); results = runChecks(P);
  figures(); checks();
  clearTimeout(tSheet); tSheet = setTimeout(() => drawSheet(false), 120);
  if (stage) { if (collageOn) { collage(false); stage.rebuild(P); stage.light("day"); collage(true); } else stage.rebuild(P); stage.render(); }
  if (cloud && cloudShown && (look === "cloud" || look === "plan")) { clearTimeout(tCloud); tCloud = setTimeout(() => cloud.rebuild(false), 420); }
  document.dispatchEvent(new CustomEvent("ap:model", { detail: summary() }));
}

// ---------------------------------------------------------------------------------------------- for the agent
function summary() {
  const s = summarise(results);
  return {
    house: { living_wing_width_m: +m1(levers.livingWidth), deck_depth_m: +m1(levers.deckDepth), kitchen_window_width_m: +m1(levers.kitchenWindow), roof_pitch: levers.pitch,
      floor_area_m2: +area(P).toFixed(1), deck_area_m2: +deckArea(P).toFixed(1), bedrooms: 3 },
    products: Object.fromEntries(ELEMENTS.map((c) => [c, { id: picks[c], name: byId[picks[c]]?.name, supplier: byId[picks[c]]?.supplier + " (sample)" }])),
    precheck: { ...s, to_resolve: results.filter((r) => r.status === "fail").map((r) => ({ clause: r.clause, title: r.title, measured: r.measured, needs: r.limit })),
      needs_a_figure: results.filter((r) => r.status === "info").map((r) => r.title) },
    sheets: sheets.map((x) => `${x.id} ${x.title}`), showing: sheetId,
  };
}
const go = () => root.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
window.__studio = {
  set(o = {}) {
    for (const k of ["livingWidth", "deckDepth", "kitchenWindow"]) if (o[k] != null) levers[k] = Math.min(LIMITS[k][1], Math.max(LIMITS[k][0], Math.round(+o[k])));
    if (o.pitch && PITCH[o.pitch]) levers.pitch = o.pitch;
    for (const c of ELEMENTS) if (o[c] && byId[o[c]]?.cat === c) { picks[c] = o[c]; window.__page?.setSpec?.(c, o[c], { quiet: true }); }
    leversUI(); changed(); return summary();
  },
  summary, showSheet: (id) => { const ok = showSheet(id); go(); return ok; }, print: () => printSet(), look: (l) => { if (["collage", "cloud", "solid", "plan"].includes(l)) setLook(l); go(); }, go,
};

leversUI(); changed(); drawSheet(false);
new IntersectionObserver(([x], o) => { if (x.isIntersecting) { drawSheet(true); o.disconnect(); } }, { threshold: 0.25 }).observe($("#ds-sheet"));
