// assembl Plan Studio · the page. One project model; every view is derived from it and refreshed on each edit.
import { demoProject, snapshot, diffModels, revLetter, polyArea, ROOM_USES, OPENING_KINDS, isDoor } from "./model.js";
import { runChecks, summarise, DISCLAIMER, RULESET } from "./code.js";
import { sheetSet } from "./drawings.js";
import { MATERIALS, byCategory, CATEGORY_LABEL } from "./materials.js";
import { toIFC, toDXF, toJSON } from "./exports.js";
import { readPdfPage, findScale, toReal, modelFromDrawing } from "./read.js";
import { buildDeck } from "./present.js";

const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const evTone = (ev) => (!ev ? "lo" : ev.src === "ai" || ev.conf < 0.6 ? "lo" : ev.conf < 0.8 ? "mid" : "hi");
const SRC = { drawing: "Measured from the drawing's linework", text: "Read from the drawing's text", ai: "Inferred by AI from an image", user: "Set by a person", demo: "Fictional demo" };

let P = demoProject(), results = runChecks(P), sheets = [], stage = null, selected = null, read = null;
const state = { tab: "plans", sheet: "A101", el: "openings", shape: "reel", path: "approach", ai: null, aiPreset: null };

// ------------------------------------------------------------------------------------------------ tabs
function show(tab) {
  state.tab = tab;
  for (const b of $$(".steps button")) b.setAttribute("aria-selected", b.dataset.tab === tab);
  for (const p of $$(".panel")) p.hidden = p.dataset.panel !== tab;
  if ((tab === "model" || tab === "visuals") && !stage) boot3d();
  if (stage) { stage.resize(); stage.render(); }
  if (tab === "drawings") drawSheets();
}
$$(".steps button").forEach((b) => b.addEventListener("click", () => show(b.dataset.tab)));

// ------------------------------------------------------------------------------------------------ the model changed: refresh everything
let t3d = 0;
function changed(opts = {}) {
  results = runChecks(P);
  renderCode(); renderTables(); renderInspector(); renderRevs();
  $("#projName").textContent = P.meta.name; $("#truthChip").textContent = P.meta.status || "";
  if (state.tab === "drawings") drawSheets(); else sheets = [];
  if (stage && opts.geometry !== false) { clearTimeout(t3d); t3d = setTimeout(() => { stage.rebuild(P); stage.render(); }, 120); }
}

// ------------------------------------------------------------------------------------------------ code check
function renderCode() {
  const s = summarise(results), tally = (el) => { el.innerHTML = `<span class="fail">${s.fail} fail</span><span class="info">${s.info} need info</span><span class="pass">${s.pass} pass</span><span class="out">${s.out} out of scope</span>`; };
  tally($("#codeTally")); tally($("#sideTally")); $("#codeBadge").textContent = s.fail || "";
  $("#codeDisclaimer").textContent = `${DISCLAIMER} Ruleset ${RULESET.version}, researched ${RULESET.checked}.`;
  const label = { pass: "Pass", fail: "Fail", info: "Needs info", out: "Out of scope" };
  $("#codeList").innerHTML = results.map((r) => `<li data-check="${esc(r.id)}"><span class="pill ${r.status}">${label[r.status]}</span><span class="cl">${esc(r.clause)}</span><div><b>${esc(r.title)}</b><div class="m">${esc(r.measured)} · limit ${esc(r.limit)}</div>${r.why ? `<div class="src">${esc(r.why)}</div>` : ""}<div class="src">${esc(r.doc)}${r.edition ? " · " + esc(r.edition) : ""}${r.verified === false ? ' · <span class="unv">figure to confirm against the current MBIE document</span>' : ""}</div></div></li>`).join("");
}
$("#codeList").addEventListener("click", (e) => { const li = e.target.closest("li[data-check]"); if (!li) return; const r = results.find((x) => x.id === li.dataset.check); selected = { kind: "check", r }; renderInspector(); });

// ------------------------------------------------------------------------------------------------ element tables (editable)
function renderTables() {
  const T = $("#elTable"), k = state.el;
  const evc = (e) => `<span class="ev ${evTone(e.ev)}" title="${esc(SRC[e.ev?.src] || "")} · ${Math.round((e.ev?.conf ?? 0) * 100)}%"></span>`;
  if (k === "openings") T.innerHTML = `<tr><th></th><th>ID</th><th>Type</th><th>Wall</th><th>Width</th><th>Height</th><th>Sill</th><th>Openable</th><th>Note</th></tr>` + P.openings.map((o) => `<tr data-id="${o.id}" class="${selected?.id === o.id ? "sel" : ""}"><td>${evc(o)}</td><td class="mono">${o.id}</td><td><select data-f="kind">${OPENING_KINDS.map((x) => `<option ${x === o.kind ? "selected" : ""}>${x}</option>`).join("")}</select></td><td class="mono">${o.wall}</td><td><input type="number" step="10" data-f="w" value="${o.w}"></td><td><input type="number" step="10" data-f="h" value="${o.h}"></td><td><input type="number" step="10" data-f="sill" value="${o.sill}"></td><td><input type="number" step="0.01" min="0" max="1" data-f="openable" value="${o.openable ?? 0}"></td><td>${esc(o.note || "")}</td></tr>`).join("");
  if (k === "walls") T.innerHTML = `<tr><th></th><th>ID</th><th>Kind</th><th>Length</th><th>Thickness</th><th>Height</th><th>Material</th></tr>` + P.walls.map((w) => `<tr data-id="${w.id}" class="${selected?.id === w.id ? "sel" : ""}"><td>${evc(w)}</td><td class="mono">${w.id}</td><td>${w.kind}</td><td class="mono">${Math.round(Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]))}</td><td><input type="number" step="10" data-f="t" value="${w.t}"></td><td><input type="number" step="50" data-f="h" value="${w.h}"></td><td><select data-f="mat">${Object.entries(MATERIALS).filter(([, m]) => ["cladding", "glazing", "lining"].includes(m.cat)).map(([id, m]) => `<option value="${id}" ${id === w.mat ? "selected" : ""}>${esc(m.name)}</option>`).join("")}</select></td></tr>`).join("");
  if (k === "rooms") T.innerHTML = `<tr><th></th><th>ID</th><th>Name</th><th>Use</th><th>Area</th><th>Occupants</th></tr>` + P.rooms.map((r) => `<tr data-id="${r.id}" class="${selected?.id === r.id ? "sel" : ""}"><td>${evc(r)}</td><td class="mono">${r.id}</td><td><input type="text" data-f="name" value="${esc(r.name)}" style="width:130px"></td><td><select data-f="use">${ROOM_USES.map((x) => `<option ${x === r.use ? "selected" : ""}>${x}</option>`).join("")}</select></td><td class="mono">${(polyArea(r.poly) / 1e6).toFixed(1)} m²</td><td><input type="number" step="1" data-f="occupants" value="${r.occupants ?? ""}"></td></tr>`).join("");
}
$("#elTabs").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; state.el = b.dataset.el; $$("#elTabs button").forEach((x) => x.classList.toggle("on", x === b)); renderTables(); });
$("#elTable").addEventListener("click", (e) => { const tr = e.target.closest("tr[data-id]"); if (!tr || e.target.matches("input,select")) return; const list = P[state.el], el = list.find((x) => x.id === tr.dataset.id); selected = { kind: state.el, id: el.id }; renderTables(); renderInspector(); });
$("#elTable").addEventListener("change", (e) => {
  const tr = e.target.closest("tr[data-id]"), f = e.target.dataset.f; if (!tr || !f) return;
  const el = P[state.el].find((x) => x.id === tr.dataset.id); let v = e.target.value;
  if (e.target.type === "number") v = v === "" ? undefined : +v;
  el[f] = v; el.ev = { src: "user", conf: 1, note: `Edited by a person: ${f}` };
  selected = { kind: state.el, id: el.id }; changed();
});

// ------------------------------------------------------------------------------------------------ inspector: evidence for the selection
function renderInspector() {
  const box = $("#inspect");
  if (!selected) return;
  if (selected.kind === "check") { const r = selected.r; box.innerHTML = `<p><b>${esc(r.title)}</b></p><p class="mono hint">${esc(r.clause)} · ${esc(r.doc)}</p><div class="inspect-ev">Measured <b>${esc(r.measured)}</b><br>Limit <b>${esc(r.limit)}</b><br>${r.verified === false ? "This figure is still to be confirmed against the current MBIE document, so it cannot pass." : "Figure confirmed in research (Nov 2026)."}</div><p class="hint">Elements: ${esc((r.elements || []).join(", ") || "—")}</p>`; return; }
  const el = (P[selected.kind] || []).find((x) => x.id === selected.id); if (!el) return;
  const ev = el.ev || {};
  box.innerHTML = `<p><b>${esc(el.name || el.note || el.id)}</b> <span class="mono hint">${esc(el.id)}</span></p><div class="inspect-ev"><span class="ev ${evTone(ev)}"></span><b>${esc(SRC[ev.src] || ev.src || "unknown")}</b> · ${Math.round((ev.conf ?? 0) * 100)}% confidence<br>${esc(ev.note || "")}</div>`
    + `<p class="hint">Checks that use it: ${results.filter((r) => (r.elements || []).includes(el.id)).map((r) => `<span class="pill ${r.status}" style="display:inline-block;margin:2px">${esc(r.clause)}</span>`).join("") || "none"}</p>`;
}

// ------------------------------------------------------------------------------------------------ revisions
function renderRevs() {
  const L = P.revisions || []; $("#revLabel").textContent = L.length ? L[L.length - 1].rev : "draft";
  $("#revList").innerHTML = L.length ? L.slice().reverse().map((r) => `<li><b>${r.rev}</b> ${r.date}<br><span class="hint">${esc(r.desc)}</span></li>`).join("") : '<li class="hint">None issued</li>';
}
$("#btnRevision").addEventListener("click", () => {
  const L = P.revisions || (P.revisions = []), prev = L.length ? L[L.length - 1].model : null, now = snapshot(P), df = diffModels(prev, now);
  if (prev && !df.changed.length) { alert("Nothing has changed since the last revision."); return; }
  const desc = prev ? df.summary.join("; ") : "First issue";
  L.push({ rev: revLetter(L.length), date: new Date().toISOString().slice(0, 10), desc, model: now });
  changed({ geometry: false }); if (state.tab !== "drawings") show("drawings");
});

// ------------------------------------------------------------------------------------------------ drawings
function drawSheets() {
  sheets = sheetSet(P, results);
  $("#sheetTabs").innerHTML = sheets.map((s) => `<button data-sheet="${s.id}" class="${s.id === state.sheet ? "on" : ""}">${s.id} ${esc(s.title)}</button>`).join("");
  $("#sheetHost").innerHTML = (sheets.find((s) => s.id === state.sheet) || sheets[0]).svg;
}
$("#sheetTabs").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; state.sheet = b.dataset.sheet; drawSheets(); });
const save = (blob, name) => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
const fname = (ext) => `${P.meta.number}-${(P.revisions?.length ? P.revisions[P.revisions.length - 1].rev : "draft")}.${ext}`;
$("#btnSvg").addEventListener("click", () => { const s = sheets.find((x) => x.id === state.sheet); save(new Blob([s.svg], { type: "image/svg+xml" }), `${P.meta.number}-${s.id}.svg`); });
$("#btnDxf").addEventListener("click", () => save(new Blob([toDXF(P)], { type: "application/dxf" }), fname("dxf")));
$("#btnPdf").addEventListener("click", () => {
  const set = sheetSet(P, results), w = window.open("", "_blank"); if (!w) return alert("Allow pop-ups to print the set.");
  w.document.write(`<!doctype html><title>${esc(P.meta.number)} drawing set</title><style>@page{size:420mm 297mm;margin:0}body{margin:0}svg{display:block;width:420mm;height:297mm;page-break-after:always}</style>${set.map((s) => s.svg).join("")}<script>onload=()=>setTimeout(()=>print(),300)<\/script>`); w.document.close();
});

// ------------------------------------------------------------------------------------------------ 3D
async function boot3d() {
  const S = await import("./scene.js"); const { OrbitControls } = await import("three/addons/controls/OrbitControls.js");
  stage = S.createStage($("#stage3d"), P); stage.S = S; stage.resize(); stage.view("aerial");
  const ctl = new OrbitControls(stage.camera, stage.renderer.domElement); ctl.target.copy(stage.target); ctl.maxPolarAngle = Math.PI * 0.495; stage.ctl = ctl;
  // render on demand: a frame when the view, the light or the model changes (cheap on phones, quiet on battery)
  ctl.addEventListener("change", () => { if (!stage.recording) stage.render(); });
  const sync = () => { ctl.target.copy(stage.target); ctl.update(); stage.render(); }; stage.sync = sync; sync();
  addEventListener("resize", () => { stage.resize(); stage.render(); });
}
$("#views").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b || !stage) return; $$("#views button").forEach((x) => x.classList.toggle("on", x === b)); const cut = b.dataset.view === "plan"; stage.setCutaway(cut); stage.view(b.dataset.view); stage.sync(); });
$("#lights").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b || !stage) return; $$("#lights button").forEach((x) => x.classList.toggle("on", x === b)); stage.light(b.dataset.light); stage.render(); });

function renderMaterials() {
  const ext = P.walls.filter((w) => w.kind === "ext" && w.mat !== "glass-curtain"), cur = ext[0]?.mat;
  const pick = (cat, value, key) => `<label>${CATEGORY_LABEL[cat]}<select data-mat="${key}">${byCategory(cat).filter((m) => !m.reserved).map((m) => `<option value="${m.id}" ${m.id === value ? "selected" : ""}>${esc(m.name)}</option>`).join("")}</select><span class="mono" style="font-size:11px">${esc(MATERIALS[value]?.maker || "")}${MATERIALS[value]?.data ? " · " + Object.entries(MATERIALS[value].data).map(([k, v]) => `${k} ${v}`).join(" · ") : ""}</span></label>`;
  $("#matPick").innerHTML = pick("cladding", cur, "cladding") + pick("roof", P.roof.mat, "roof");
}
$("#matPick").addEventListener("change", (e) => { const k = e.target.dataset.mat, v = e.target.value; if (k === "cladding") P.walls.filter((w) => w.kind === "ext" && w.mat !== "glass-curtain").forEach((w) => (w.mat = v)); if (k === "roof") P.roof.mat = v; renderMaterials(); changed(); });

// ------------------------------------------------------------------------------------------------ visuals
const STILLS = [["Reel / Story", 1080, 1920, "social"], ["Feed 4:5", 1080, 1350, "social"], ["Square", 1080, 1080, "social"], ["LinkedIn / YouTube 16:9", 1920, 1080, "social"], ["Client 4K", 3840, 2160, "client"], ["Print 6000 px", 6000, 3375, "print"]];
$("#stillPresets").innerHTML = STILLS.map(([n, w, h, k], i) => `<button class="btn ghost" data-still="${i}" type="button">${n}<small>${w} × ${h} · ${k}</small></button>`).join("");
const provLabel = () => `Visualisation of model ${P.meta.number} rev ${(P.revisions?.length ? P.revisions[P.revisions.length - 1].rev : "draft")} · assembl Plan Studio`;
function addOutput(blob, name, kind = "img", note = "") {
  const url = URL.createObjectURL(blob), fig = document.createElement("figure");
  fig.innerHTML = `${kind === "video" ? `<video src="${url}" controls playsinline></video>` : `<img src="${url}" alt="${esc(name)}">`}<figcaption><span class="mono">${esc(name)}${note ? " · " + esc(note) : ""}</span><a href="${url}" download="${esc(name)}">Save</a></figcaption>`;
  $("#outputs").prepend(fig);
}
$("#stillPresets").addEventListener("click", async (e) => {
  const b = e.target.closest("button[data-still]"); if (!b) return; if (!stage) await boot3d();
  const [n, w, h] = STILLS[+b.dataset.still]; b.disabled = true;
  const blob = await stage.S.still(stage, w, h, provLabel()); b.disabled = false;
  addOutput(blob, `${P.meta.number}-${w}x${h}.png`, "img", n);
});
$("#flyShape").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; state.shape = b.dataset.shape; $$("#flyShape button").forEach((x) => x.classList.toggle("on", x === b)); });
$("#flyPath").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; state.path = b.dataset.path; $$("#flyPath button").forEach((x) => x.classList.toggle("on", x === b)); });
$("#btnFly").addEventListener("click", async () => {
  if (!stage) await boot3d(); const [w, h] = state.shape === "reel" ? [1080, 1920] : [1920, 1080], b = $("#btnFly"); b.disabled = true; stage.recording = true;
  const blob = await stage.S.recordFlythrough(stage, { w, h, seconds: 12, kind: state.path, label: provLabel(), onProgress: (t) => ($("#flyProg").textContent = `${Math.round(t * 100)}%`) });
  stage.recording = false; b.disabled = false; $("#flyProg").textContent = ""; stage.view("aerial"); stage.sync();
  addOutput(blob, `${P.meta.number}-${state.path}-${w}x${h}.${blob.type.includes("mp4") ? "mp4" : "webm"}`, "video", state.shape === "reel" ? "Reels, Shorts, TikTok" : "YouTube, LinkedIn, client");
});
async function aiStatus() {
  try {
    const s = await fetch("/api/plan-render").then((r) => r.json()); state.ai = s;
    if (!s.configured) { $("#aiStatus").textContent = "Not connected yet. When FAL_KEY is added to the project, this restyles a view of the true model through fal.ai: you see the price and confirm before anything is spent."; return; }
    $("#aiStatus").textContent = "Connected to fal.ai."; $("#aiBox").hidden = false;
    $("#aiPreset").innerHTML = Object.entries(s.endpoints).filter(([, v]) => v.kind === "image").map(([k], i) => `<button data-p="${k}" class="${i ? "" : "on"}">${k === "still-edit" ? "Photoreal still" : k === "still-depth" ? "Depth-locked still" : k}</button>`).join("");
    state.aiPreset = Object.keys(s.endpoints).find((k) => s.endpoints[k].kind === "image"); $("#aiEst").textContent = s.endpoints[state.aiPreset]?.est || "";
  } catch { $("#aiStatus").textContent = "AI enhance is unavailable from here (the page needs the lab's /api)."; }
}
$("#aiPreset").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; state.aiPreset = b.dataset.p; $$("#aiPreset button").forEach((x) => x.classList.toggle("on", x === b)); $("#aiEst").textContent = state.ai.endpoints[state.aiPreset].est; });
$("#aiConfirm").addEventListener("change", (e) => ($("#btnAi").disabled = !e.target.checked));
$("#btnAi").addEventListener("click", async () => {
  if (!stage) await boot3d(); const b = $("#btnAi"); b.disabled = true;
  const beauty = await stage.S.still(stage, 1280, 800, ""), img = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(beauty); });
  const depth = stage.S.depthPass(stage, 1280, 800), mats = [...new Set(P.walls.map((w) => MATERIALS[w.mat]?.name).filter(Boolean))].join(", ");
  const prompt = `Photoreal architectural photograph of this exact building. Keep every wall, opening, roof line and proportion exactly as shown; do not add or remove elements. Materials: ${mats}; roof ${MATERIALS[P.roof.mat]?.name}. New Zealand light, natural landscaping, no text, no logos.`;
  const input = state.aiPreset === "still-depth" ? { prompt, control_lora_image_url: depth, image_size: { width: 1280, height: 800 } } : { prompt, image_urls: [img] };
  const r = await fetch("/api/plan-render", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ preset: state.aiPreset, input, confirm: true }) }).then((x) => x.json()).catch(() => null);
  if (!r?.job) { alert("The request did not start: " + (r?.error || "network")); b.disabled = false; return; }
  for (let i = 0; i < 90; i++) {
    await new Promise((x) => setTimeout(x, 2000));
    const s = await fetch(`/api/plan-render?job=${encodeURIComponent(r.job)}`).then((x) => x.json()).catch(() => null);
    if (s?.status === "COMPLETED" && s.url) {
      const im = await fetch(s.url).then((x) => x.blob()); const bmp = await createImageBitmap(im), c = document.createElement("canvas"); c.width = bmp.width; c.height = bmp.height;
      const g = c.getContext("2d"); g.drawImage(bmp, 0, 0); stage.S.burnLabel(g, c.width, c.height, "AI-enhanced visualisation · " + provLabel());
      addOutput(await new Promise((x) => c.toBlob(x, "image/png")), `${P.meta.number}-ai.png`, "img", "AI-enhanced"); break;
    }
  }
  b.disabled = false;
});

// ------------------------------------------------------------------------------------------------ present & export
$("#btnDeck").addEventListener("click", async () => {
  if (!stage) await boot3d();
  const shots = [];
  for (const [v, l] of [["street", "day"], ["aerial", "golden"], ["interior", "day"], ["street", "dusk"]]) { stage.setCutaway(false); stage.view(v); stage.light(l); shots.push(URL.createObjectURL(await stage.S.still(stage, 1920, 1080, provLabel()))); }
  stage.light("day"); stage.view("aerial"); stage.sync();
  const w = window.open("", "_blank"); if (!w) return alert("Allow pop-ups to open the presentation.");
  w.document.write(buildDeck(P, results, sheetSet(P, results), shots)); w.document.close();
});
$$(".files button").forEach((b) => b.addEventListener("click", async () => {
  const x = b.dataset.x;
  if (x === "ifc") return save(new Blob([toIFC(P)], { type: "application/x-step" }), fname("ifc"));
  if (x === "dxf") return save(new Blob([toDXF(P)], { type: "application/dxf" }), fname("dxf"));
  if (x === "json") return save(new Blob([toJSON(P)], { type: "application/json" }), fname("json"));
  if (!stage) await boot3d();
  if (x === "glb") { const { GLTFExporter } = await import("three/addons/exporters/GLTFExporter.js"); const buf = await new GLTFExporter().parseAsync(stage.model, { binary: true }); return save(new Blob([buf], { type: "model/gltf-binary" }), fname("glb")); }
  if (x === "usdz") { const { USDZExporter } = await import("three/addons/exporters/USDZExporter.js"); const buf = await new USDZExporter().parseAsync(stage.model); return save(new Blob([buf], { type: "model/vnd.usdz+zip" }), fname("usdz")); }
  if (x === "blend") { const { GLTFExporter } = await import("three/addons/exporters/GLTFExporter.js"); const buf = await new GLTFExporter().parseAsync(stage.model, { binary: true }); save(new Blob([buf], { type: "model/gltf-binary" }), fname("glb")); save(new Blob([toJSON(P)], { type: "application/json" }), fname("json")); alert("Saved the model (GLB) and project (JSON). assembl renders hero stills from these in Blender with tools/plan-studio/render_blender.py."); }
}));

// ------------------------------------------------------------------------------------------------ 1 · reading a plan
const drop = $("#drop");
["dragenter", "dragover"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add("over"); }));
["dragleave", "drop"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
drop.addEventListener("drop", (e) => { const f = e.dataTransfer.files[0]; if (f) openFile(f); });
$("#file").addEventListener("change", (e) => { const f = e.target.files[0]; if (f) openFile(f); });
$("#btnDemo").addEventListener("click", () => { P = demoProject(); selected = null; renderMaterials(); changed(); show("model"); });

async function openFile(f) {
  $("#readCard").hidden = false; $("#scaleBox").textContent = "Reading…"; $("#readStats").innerHTML = "";
  if (f.type === "application/pdf") {
    const pdfjsLib = await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
    const data = new Uint8Array(await f.arrayBuffer()), raw = await readPdfPage(pdfjsLib, data.slice(0));
    const sc = findScale(raw.items);
    read = { raw, scale: sc?.scale || 100, name: f.name.replace(/\.pdf$/i, "") };
    $("#scaleBox").innerHTML = `${sc ? esc(sc.note) : "No scale printed on the sheet."}<div class="row"><label>Scale 1: <input type="number" id="scaleIn" value="${read.scale}" style="width:80px"></label><button class="btn ghost sm" id="btnRescale" type="button">Re-read at this scale</button></div>`;
    $("#btnRescale").addEventListener("click", () => { read.scale = +$("#scaleIn").value || 100; doRead(); });
    // draw the page so the person can see what was found on it
    const doc = await pdfjsLib.getDocument({ data }).promise, page = await doc.getPage(1), vp = page.getViewport({ scale: 2 }), cv = $("#pdfCanvas");
    cv.width = vp.width; cv.height = vp.height; await page.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise; read.vp = { w: raw.pageW, h: raw.pageH };
    $("#sheetView").hidden = false; $("#readLegend").hidden = false;
    doRead();
  } else {
    $("#scaleBox").textContent = "An image has no linework, so it is read by AI and every element is marked as inferred.";
    const img = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(f); });
    const r = await fetch("/api/plan-read", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ image: img }) }).then((x) => x.json()).catch(() => null);
    if (!r?.plan) { $("#readStats").innerHTML = `<p class="hint">AI reading is not available right now (${esc(r?.error || "network")}). Export the drawing to PDF from the CAD tool for an exact read.</p>`; return; }
    read = { ai: r.plan, name: f.name }; $("#readStats").innerHTML = `<div><b>${r.plan.walls.length}</b><span>walls (inferred)</span></div><div><b>${r.plan.openings.length}</b><span>openings (inferred)</span></div><div><b>${r.plan.rooms.length}</b><span>rooms (inferred)</span></div><p class="hint" style="grid-column:1/-1">${esc(r.plan.notes)} Set the scale from a known dimension before using this.</p>`;
  }
}
function doRead() {
  const real = toReal(read.raw, read.scale); read.model = modelFromDrawing(real, { name: read.name, number: "PS-" + read.name.slice(0, 12).toUpperCase().replace(/[^A-Z0-9]+/g, "-") });
  const M = read.model, hi = (L) => L.filter((e) => e.ev.conf >= 0.8).length;
  $("#readStats").innerHTML = `<div><b>${M.walls.length}</b><span>walls · ${hi(M.walls)} high confidence</span></div><div><b>${M.openings.length}</b><span>openings · ${hi(M.openings)} high</span></div><div><b>${M.rooms.length}</b><span>rooms from labels</span></div><p class="hint" style="grid-column:1/-1">Walls from ${esc(M.stats.walls)}. Heights, sills and the roof are assumptions until you set them from the elevations.</p>`;
  // overlay: model → pdf points → overlay svg (viewBox in pdf points, y down)
  const k = (25.4 / 72) * read.scale;   // real mm per pdf point; the model's origin was moved to the building's south-west corner (M.origin)
  const svg = $("#readOverlay"); svg.setAttribute("viewBox", `0 0 ${read.vp.w} ${read.vp.h}`); svg.setAttribute("preserveAspectRatio", "none");
  const o = M.origin || [0, 0], X = (p) => ((p[0] + o[0]) / k), Y = (p) => read.vp.h - ((p[1] + o[1]) / k);
  const col = (ev) => ({ hi: "#2f6b46", mid: "#c79a2c", lo: "#B0213A" }[evTone(ev)]);
  svg.innerHTML = M.walls.map((w) => `<line x1="${X(w.a)}" y1="${Y(w.a)}" x2="${X(w.b)}" y2="${Y(w.b)}" stroke="${col(w.ev)}" stroke-width="${Math.max(1.5, w.t / k)}" stroke-opacity=".55"/>`).join("")
    + M.rooms.map((r) => `<polygon points="${r.poly.map((p) => `${X(p)},${Y(p)}`).join(" ")}" fill="${col(r.ev)}" fill-opacity=".08" stroke="${col(r.ev)}" stroke-dasharray="4 3" stroke-width="1"/>`).join("");
}
$("#btnUseRead").addEventListener("click", () => {
  if (!read?.model) { alert(read?.ai ? "Set the scale on a known dimension first (coming next for images). Export the drawing as a PDF for an exact read." : "Open a plan first."); return; }
  P = read.model; P.meta.status = "Imported · check every element"; selected = null; renderMaterials(); changed(); show("model");
});

// ------------------------------------------------------------------------------------------------ start
renderMaterials(); changed({ geometry: false }); aiStatus();
