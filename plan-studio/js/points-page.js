// assembl Plan Studio · the point-cloud page. Builds the cloud from a project model (the demo hall, the project the studio
// handed over in this browser tab, or a project JSON opened here) and drives it: colour modes, assembling, the scan sweep,
// exploding, the plan cut, 4K stills and recorded orbit clips. Nothing leaves the browser.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { demoProject } from "./model.js";
import { runChecks, summarise } from "./code.js";
import { burnLabel } from "./scene.js";
import { buildCloud, cloudPoints } from "./points.js";
import { createPipeline } from "/lab/pc/engine.js";

const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
let P = null;
try { const handed = sessionStorage.getItem("planstudio.project"); if (handed) P = JSON.parse(handed); } catch { /* storage blocked or bad JSON: use the demo */ }
if (!valid(P)) P = demoProject();
function valid(p) { return !!(p && Array.isArray(p.walls) && Array.isArray(p.rooms) && Array.isArray(p.openings) && p.meta); }

// ------------------------------------------------------------------------------------------------ stage
const canvas = $("#cloud"), renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const pipe = createPipeline(renderer);                // the assembl point-cloud light: additive accumulation, bloom, plum ground
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(36, 1, 0.1, 600);
const controls = new OrbitControls(camera, canvas); controls.enableDamping = true; controls.dampingFactor = 0.08; controls.autoRotateSpeed = 0.6; controls.maxPolarAngle = Math.PI * 0.49;
let cloud = null, pts = null, U = null, N = matchMedia("(max-width: 640px)").matches ? 500000 : 1500000;
const anims = new Set();      // running tweens; the loop renders while any run (or the controls are moving)

// on wide screens the panel sits over the left of the stage: shift the picture so the building centres in the free space
function offset(w, h) { const pw = $("#panel").offsetWidth; if (w > 900 && pw) camera.setViewOffset(w, h, -(pw + 24) / 2, 0, w, h); else camera.clearViewOffset(); }
function size() {
  const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; offset(w, h); camera.updateProjectionMatrix();
  const gl = renderer.getContext(); pipe.resize(gl.drawingBufferWidth, gl.drawingBufferHeight, w / h); pipe.setLift(w > 900 ? 0.6 : 0.5, 0.5);
  if (U) U.uPR.value = gl.drawingBufferHeight / 900;
}
function frame() {
  if (U) { U.uSize.value = 22 * Math.sqrt(1500000 / N); const d = camera.position.distanceTo(controls.target), L = Math.max(cloud.size[0], cloud.size[2]); U.uFog.value.set(d - L * 0.05, d + L * 2.2); }
  pipe.render(scene, camera);
}
let looping = false;
function kick() { if (looping) return; looping = true; requestAnimationFrame(loop); }
function loop(now) {
  for (const a of [...anims]) { const t = Math.min(1, (now - a.t0) / a.ms); a.set(a.ease ? a.ease(t) : t); if (t >= 1) { anims.delete(a); a.done?.(); } }
  const moving = controls.update(); frame();
  if (anims.size || moving || controls.autoRotate) requestAnimationFrame(loop); else looping = false;
}
const smooth = (t) => t * t * (3 - 2 * t);
function tween(ms, set, done, ease = smooth) { anims.add({ t0: performance.now(), ms, set, done, ease }); kick(); }
controls.addEventListener("change", kick); addEventListener("resize", () => { size(); kick(); });
document.addEventListener("visibilitychange", () => { if (!document.hidden) kick(); });

// ------------------------------------------------------------------------------------------------ build
const rev = () => (P.revisions?.length ? P.revisions[P.revisions.length - 1].rev : "draft");
const label = () => `Point cloud sampled from model ${P.meta.number || "—"} rev ${rev()} · not a scan · assembl Plan Studio`;
async function build(first = false) {
  $("#loading").hidden = false; $("#loading").textContent = `Sampling ${N.toLocaleString("en-NZ")} points from the model…`;
  await new Promise((r) => setTimeout(r, 30));                       // let the message paint before the heavy work
  if (pts) { scene.remove(pts); pts.geometry.dispose(); pts.material.dispose(); }
  cloud = buildCloud(P, { total: N }); ({ points: pts, uniforms: U } = cloudPoints(cloud)); scene.add(pts);
  $("#pname").textContent = P.meta.name || "Untitled project";
  $("#ptruth").textContent = `Sampled from model ${P.meta.number || "—"} rev ${rev()} · not a scan`;
  $("#pcount").textContent = `${cloud.count.toLocaleString("en-NZ")} points`;
  U.uMode.value = mode; U.uExplode.value = exploded ? 1 : 0; setCut();
  if (first) frameView();
  size(); $("#loading").hidden = true;
  if (first && !reduce) { U.uAssemble.value = 0; tween(5200, (t) => (U.uAssemble.value = t), null, (t) => t); } else kick();
  legend();
}
function frameView() {
  const [cx, , cz] = cloud.centre, [w, h, d] = cloud.size, L = Math.max(w, d) * 1.18;   // a little wider than the walls: decks and eaves
  controls.target.set(cx, h * 0.32, cz); camera.position.set(cx + L * 1.05, h + L * 0.62, cz + L * 1.15); controls.update();
}

// ------------------------------------------------------------------------------------------------ controls
let mode = 0, exploded = false;      // 0 scan, 1 material, 2 code check, 3 evidence
const results = runChecks(P);
function legend() {
  const dot = (c, t) => `<span><i style="background:${c}"></i>${t}</span>`, el = $("#legend");
  if (mode === 0) el.innerHTML = "Scan light: every point carries the light on its surface, from plum in shadow to ivory in the sun, and every edge of the model is drawn brighter.";
  else if (mode === 1) el.innerHTML = "True material colours, shaded by a fixed sun. Screen colours are approximate.";
  else if (mode === 2) { const s = summarise(runChecks(P)); el.innerHTML = dot("#F4BEDA", `Fails (${s.fail}): brightest, pulsing`) + dot("#FCCEBC", `Needs info (${s.info})`) + dot("#D4A8C6", `Passes (${s.pass})`) + dot("#5E3A58", "Not checked") + `<span>Rooms, walls and openings named by each NZBC pre-check result. Advisory, not a consent decision.</span>`; }
  else { const demo = [...P.walls, ...P.openings].every((e) => e.ev?.src === "demo"); el.innerHTML = dot("#D4A8C6", "High confidence") + dot("#FCCEBC", "Medium") + dot("#F4BEDA", "Low: check it (pulsing)") + dot("#5E3A58", "No evidence record") + (demo ? "<span>Demo data: every element here is marked demo, confidence 1. An imported plan shows what was measured and what was inferred.</span>" : "<span>How sure the reader was of each element, from its evidence record.</span>"); }
}
$("#mode").addEventListener("click", (e) => { const b = e.target.closest("button[data-mode]"); if (!b) return; mode = +b.dataset.mode; $$("#mode button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); U.uMode.value = mode; legend(); kick(); });
$("#btnAssemble").addEventListener("click", () => { if (reduce) return; U.uAssemble.value = 0; tween(4200, (t) => (U.uAssemble.value = t), null, (t) => t); });
$("#btnSweep").addEventListener("click", () => { const h = cloud.size[1]; tween(reduce ? 1 : 3600, (t) => (U.uSweep.value = -0.6 + t * (h + 1.2)), () => { U.uSweep.value = -100; kick(); }, (t) => t); });
$("#btnExplode").addEventListener("click", (e) => { exploded = !exploded; e.currentTarget.setAttribute("aria-pressed", String(exploded)); const from = U.uExplode.value, to = exploded ? 1 : 0; tween(reduce ? 1 : 1300, (t) => (U.uExplode.value = from + (to - from) * t)); });
$("#btnOrbit").addEventListener("click", (e) => { controls.autoRotate = !controls.autoRotate; e.currentTarget.setAttribute("aria-pressed", String(controls.autoRotate)); kick(); });
function setCut() { const v = +$("#cut").value, h = cloud.size[1]; U.uCutY.value = v >= 100 ? 100 : 0.25 + (h - 0.25) * (v / 100); $("#cutVal").textContent = v >= 100 ? "off" : `${(U.uCutY.value).toFixed(2)} m`; }
$("#cut").addEventListener("input", () => { setCut(); kick(); });
$("#density").addEventListener("click", async (e) => { const b = e.target.closest("button[data-n]"); if (!b || +b.dataset.n === N) return; N = +b.dataset.n; $$("#density button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); await build(); });
$("#file").addEventListener("change", async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try { const p = JSON.parse(await f.text()); if (!valid(p)) throw new Error("not a Plan Studio project"); P = p; await build(true); }
  catch (err) { alert("That file could not be opened: " + err.message); }
});

// ------------------------------------------------------------------------------------------------ save: a 4K still, an orbit clip
function out(blob, name, kind) {
  const url = URL.createObjectURL(blob), a = document.createElement("a"); a.href = url; a.download = name; a.textContent = `Save ${name}`;
  $("#outs").prepend(a); if (kind === "img") window.open(url, "_blank", "noopener");
}
function atSize(w, h, fn) {      // render at an exact size, keeping the look (point sizes follow the frame height)
  const old = new THREE.Vector2(); renderer.getSize(old); const pr = renderer.getPixelRatio(), aspect = camera.aspect;
  renderer.setPixelRatio(1); renderer.setSize(w, h, false); pipe.resize(w, h, w / h); pipe.setLift(0.5, 0.5); camera.aspect = w / h; camera.clearViewOffset(); camera.updateProjectionMatrix(); U.uPR.value = h / 900;
  const r = fn(); renderer.setPixelRatio(pr); renderer.setSize(old.x, old.y, false); camera.aspect = aspect; camera.updateProjectionMatrix(); size(); return r;
}
async function stillAt(w, h) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d");
  atSize(w, h, () => { g.fillStyle = "#240B21"; g.fillRect(0, 0, w, h); frame(); g.drawImage(renderer.domElement, 0, 0); });
  burnLabel(g, w, h, label()); kick();
  out(await new Promise((r) => c.toBlob(r, "image/png")), `${P.meta.number || "project"}-point-cloud-${w}x${h}.png`, "img");
}
$("#btnStill").addEventListener("click", () => stillAt(3840, 2160));
document.querySelectorAll("[data-still]").forEach((b) => b.addEventListener("click", () => stillAt(+b.dataset.w, +b.dataset.h)));   // 4:5 and square, for socials
async function orbitClip(w, h) {
  const btns = [$("#btnReel"), $("#btnWide"), $("#btnStill")]; btns.forEach((b) => (b.disabled = true));
  const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d");
  const type = ["video/mp4;codecs=avc1", "video/webm;codecs=vp9", "video/webm"].find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || "video/webm";
  const rec = new MediaRecorder(c.captureStream(30), { mimeType: type, videoBitsPerSecond: w * h * 6 }), chunks = []; rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const [cx, , cz] = cloud.centre, [W, H, D] = cloud.size, Lm = Math.max(W, D), R = Lm * (h > w ? 1.9 : 1.45), seconds = 10, t0 = performance.now();
  const keep = { pos: camera.position.clone(), tgt: controls.target.clone(), auto: controls.autoRotate, fov: camera.fov }; controls.autoRotate = false;
  camera.fov = h > w ? 52 : 36;
  if (!reduce) U.uAssemble.value = 0;
  rec.start();
  for (let t = 0; t < 1;) {
    t = Math.min(1, (performance.now() - t0) / (seconds * 1000)); const a = 0.6 + t * Math.PI * 1.4;
    if (!reduce) U.uAssemble.value = Math.min(1, t * 2.2);
    U.uSweep.value = t > 0.5 && t < 0.85 ? -0.6 + ((t - 0.5) / 0.35) * (H + 1.2) : -100;
    camera.position.set(cx + Math.cos(a) * R, H * 0.9 + Lm * 0.35 * (1 - t * 0.4), cz + Math.sin(a) * R); camera.lookAt(cx, H * 0.3, cz);
    atSize(w, h, () => { g.fillStyle = "#240B21"; g.fillRect(0, 0, w, h); frame(); g.drawImage(renderer.domElement, 0, 0); });
    burnLabel(g, w, h, label()); $("#saveProg").textContent = `Recording ${Math.round(t * 100)}%`;
    await new Promise((r) => setTimeout(r, 12));
  }
  rec.stop(); await new Promise((r) => (rec.onstop = r));
  camera.position.copy(keep.pos); controls.target.copy(keep.tgt); controls.autoRotate = keep.auto; camera.fov = keep.fov; camera.updateProjectionMatrix(); U.uAssemble.value = 1; U.uSweep.value = -100;
  $("#saveProg").textContent = ""; btns.forEach((b) => (b.disabled = false)); kick();
  out(new Blob(chunks, { type: type.split(";")[0] }), `${P.meta.number || "project"}-point-cloud-${w}x${h}.${type.includes("mp4") ? "mp4" : "webm"}`, "video");
}
$("#btnReel").addEventListener("click", () => orbitClip(1080, 1920));
$("#btnWide").addEventListener("click", () => orbitClip(1920, 1080));

window.__planStudioCloud = { get uniforms() { return U; }, kick: () => kick() };   // for tests and the console
build(true).catch((e) => { $("#loading").textContent = "The point cloud could not be built: " + e.message; console.error(e); });
