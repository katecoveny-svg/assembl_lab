// assembl capture · training page controller (UI only; the work is in train.js).
import { run, inspect, probeWebGPU } from "./train.js";

const $ = (id) => document.getElementById(id);
const nf = (v, d = 0) => new Intl.NumberFormat("en-NZ", { maximumFractionDigits: d, minimumFractionDigits: d }).format(v);
const mb = (b) => `${nf(b / 1e6, 1)} MB`;
const dur = (s) => (s < 90 ? `${nf(s)} s` : s < 5400 ? `${Math.floor(s / 60)} min ${nf(s % 60)} s` : `${nf(s / 3600, 1)} h`);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const q = new URLSearchParams(location.search);
if (q.get("theme")) document.documentElement.dataset.theme = q.get("theme");

let file = null, ds = null, probe = null, abort = null;

function setStep(step, status, line, frac) {
  const li = document.querySelector(`.tr-step[data-step="${step}"]`);
  if (!li) return;
  if (status) li.dataset.status = status;
  if (line != null) li.querySelector(".tr-step-line").textContent = line;
  if (frac != null) li.querySelector(".tr-bar > i").style.width = `${Math.max(0, Math.min(1, frac)) * 100}%`;
}
function showError(msg) { $("error").textContent = msg || ""; $("error").hidden = !msg; }
function numbers(rows) { const d = $("numbers"); d.hidden = !rows.length; d.innerHTML = rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join(""); }

(async function checkGPU() {
  probe = await probeWebGPU();
  const a = probe.adapter;
  if (probe.ok) {
    $("gpu-head").textContent = probe.software ? "WebGPU works here, but on a software (CPU) adapter: training will be very slow." : "Ready to train with WebGPU.";
    $("gpu-body").textContent = `${[a.vendor, a.architecture, a.description].filter(Boolean).join(" · ") || "GPU"} · subgroups yes · ${probe.storageBuffersPerStage} storage buffers per stage.`;
  } else {
    $("gpu-head").textContent = "This browser can't train here.";
    $("gpu-body").textContent = probe.reason + (a ? ` (${[a.vendor, a.architecture].filter(Boolean).join(" · ")})` : "");
    $("gpu").classList.remove("is-quiet");
  }
  updateRun();
})();

function updateRun() {
  $("run").disabled = !(file && probe?.ok);
  // a browser with WebGPU that can't train (e.g. Safari) may still solve poses for another computer
  const po = $("poses-only");
  po.hidden = !(probe?.webgpu && !probe?.ok && ds?.poses === "needed");
  po.disabled = !file;
}

async function load(f) {
  showError("");
  file = f;
  try {
    ds = await inspect(await f.arrayBuffer());
  } catch (e) { file = null; ds = null; showError(`That file isn't a capture this page can read: ${e.message}`); updateRun(); return; }
  const rows = [
    ["File", `${f.name} · ${mb(f.size)}`],
    ["Photos", nf(ds.images)],
    ["Poses", ds.poses === "included" ? `Included (${ds.poseSource === "webxr" ? "phone motion tracking, WebXR" : ds.poseSource})` : ds.poses === "colmap" ? "COLMAP model included" : "Needed: solved here before training"],
    ["Capture", [ds.presetLabel || ds.preset, ds.subject?.label].filter(Boolean).join(" · ") || "—"],
    ["Image size", ds.imageSize ? `${ds.imageSize[0]} × ${ds.imageSize[1]} px` : "—"],
  ];
  $("summary").innerHTML = rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("");
  $("summary").hidden = false;
  const object = ds.mode === "object";
  $("size-label").innerHTML = object ? 'Longest side <span class="ac-opt">cm · sets the real scale</span>' : 'Known length <span class="ac-opt">m · sets the real scale</span>';
  $("size").step = object ? "0.1" : "0.001";
  $("size").placeholder = object ? "e.g. 12" : "e.g. 4.395";
  $("size").value = ds.knownSizeM ? +(object ? ds.knownSizeM * 100 : ds.knownSizeM).toFixed(4) : "";
  $("budget").placeholder = object ? "3" : "8";
  setStep("read", "done", `${nf(ds.images)} photos, ${mb(ds.bytes)}.`);
  setStep("poses", ds.poses === "needed" ? "" : "skipped", ds.poses === "needed" ? "Will run: the capture has no poses." : "Not needed: poses are in the file.");
  updateRun();
}

$("file").addEventListener("change", (e) => e.target.files[0] && load(e.target.files[0]));
const drop = $("drop");
["dragenter", "dragover"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add("is-over"); }));
["dragleave", "drop"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove("is-over"); }));
drop.addEventListener("drop", (e) => { const f = e.dataTransfer.files[0]; if (f) load(f); });

const STAGE_LABEL = { preparing: "Preparing photos", features: "Finding features", matching: "Matching photo pairs", mapping: "Placing cameras" };

$("cancel").addEventListener("click", () => abort?.abort());
$("poses-only").addEventListener("click", async () => {
  showError(""); $("poses-only").disabled = true;
  try {
    const res = await run(await file.arrayBuffer(), { posesOnly: true, onStage: (s, info) => {
      if (s === "poses" && info.progress) setStep("poses", "running", `${STAGE_LABEL[info.progress.stage] || info.progress.stage}: ${nf(info.progress.done)} of ${nf(info.progress.total)}`, info.progress.total ? info.progress.done / info.progress.total : 0);
      if (s === "poses" && info.status === "done") setStep("poses", "done", `${nf(info.report.registered)} of ${nf(info.report.images)} photos placed · ${dur(info.report.timingsMs.total / 1000)}`);
    } });
    const name = file.name.replace(/\.zip$/i, "") + "-posed.zip";
    $("result").hidden = false;
    $("downloads").innerHTML = `<a class="ac-btn ac-btn-primary" download="${esc(name)}" href="${URL.createObjectURL(res.posedZip)}">${esc(name)}</a>`;
    setStep("train", "skipped", "Train this posed capture in Chrome or Edge on a Mac or PC.");
  } catch (e) { showError(e.message); setStep("poses", "failed", e.message); }
  finally { $("poses-only").disabled = false; }
});
$("run").addEventListener("click", async () => {
  showError("");
  $("run").disabled = true; $("cancel").hidden = false;
  abort = new AbortController();
  const object = ds.mode === "object";
  const sizeRaw = parseFloat($("size").value);
  const lengthM = Number.isFinite(sizeRaw) && sizeRaw > 0 ? (object ? sizeRaw / 100 : sizeRaw) : null;
  const budget = parseFloat($("budget").value);
  $("preview-wrap").hidden = false;
  const started = performance.now();
  let current = "read";
  try {
    const res = await run(await file.arrayBuffer(), {
      iterations: Number($("iters").value), maxResolution: Number($("res").value), lengthM, budgetMB: Number.isFinite(budget) ? budget : undefined,
      signal: abort.signal, preview: $("preview"),
      viewer: { el: $("viewer") },
      onStage: (s, info) => {
        current = s;
        if (s === "read" && info.status === "done") setStep("read", "done", `${nf(info.dataset.images)} photos, ${mb(info.dataset.bytes)}.`);
        if (s === "poses") {
          if (info.status === "running" && info.progress) {
            const p = info.progress;
            setStep("poses", "running", `${STAGE_LABEL[p.stage] || p.stage}: ${nf(p.done)} of ${nf(p.total)}`, p.total ? p.done / p.total : 0);
          } else if (info.status === "running") setStep("poses", "running", "Loading the pose solver…", 0);
          else if (info.status === "done") {
            const r = info.report;
            if (r.usedFor) { setStep("poses", "done", `Poses from the phone kept. Pose solver used for ${r.usedFor.replace(/^initial points only.*/, `starting points (${nf(r.points || 0)} points, cameras matched to ${nf((r.alignment?.rmsM || 0) * 100, 1)} cm)`)}`); return; }
            const dropped = r.rejectedByChecks?.length || 0;
            setStep("poses", "done", `${nf(r.registered)} of ${nf(r.images)} photos placed${dropped ? ` (${nf(dropped)} dropped: they disagreed with the phone's sensors)` : ""} · ${nf(r.points)} points · reprojection error ${nf(r.meanReprojErrorPx, 2)} px · ${dur(r.timingsMs.total / 1000)}`);
            if (r.registered < 0.8 * r.images) showError(`Only ${nf(r.registered)} of ${nf(r.images)} photos could be placed, so the 3D model will have gaps. Training continues; for a complete model, capture again more slowly with more overlap, or use the Mac fallback in the README.`);
          } else if (info.status === "skipped") setStep("poses", "skipped", info.reason);
        }
        if (s === "train" && info.status === "running" && info.staging) setStep("train", "running", `Copying photos into the browser's private storage: ${nf(info.staging.files)} files`, 0);
        if (s === "train" && info.status === "done") setStep("train", "done", `${nf(info.state.iter)} steps · ${nf(info.splats)} splats · ${dur(info.state.wallMs / 1000)}`);
        if (s === "prepare" && info.status === "running" && info.step) setStep("prepare", "running", `${info.step.step.replace(/_/g, " ")}…`);
        if (s === "prepare" && info.status === "done") {
          const st = Object.fromEntries(info.report.steps.map((x) => [x.step, x]));
          setStep("prepare", "done", `${nf(st.load.splats)} → ${nf(st.floaters?.kept ?? 0)} splats kept · ${st.compress_spz?.chosen ? `${nf(st.compress_spz.chosen[1])} shipped in ${mb(st.compress_spz.chosen[2])}` : "over budget"}`);
        }
        if (s === "view") setStep("view", info.status, info.status === "done" ? "Ready below." : "Loading…");
      },
      onProgress: (st) => {
        if (st.phase === "loading") { setStep("train", "running", "Loading photos into Brush…", 0); return; }
        const left = st.stepsPerSec > 0 ? (st.total - st.iter) / st.stepsPerSec : null;
        setStep("train", "running", `Step ${nf(st.iter)} of ${nf(st.total)} · ${nf(st.stepsPerSec, 1)} steps/s · ${nf(st.splats)} splats`, st.iter / st.total);
        const ev = st.evals[st.evals.length - 1];
        numbers([
          ["Elapsed", dur((performance.now() - started) / 1000)],
          ["Time left", left != null ? `${dur(left)} (Estimate)` : "—"],
          ["Photos", `${nf(st.trainViews)} train · ${nf(st.evalViews)} held out`],
          ["Held-out PSNR", ev ? `${nf(ev.psnr, 2)} dB at step ${nf(ev.iter)}` : "first check at step 1,000"],
          ["Held-out SSIM", ev ? nf(ev.ssim, 3) : "—"],
        ]);
      },
    });
    if (res.cancelled) { setStep("train", "failed", "Cancelled."); return; }
    $("result").hidden = false;
    const dl = (name, data, type) => `<a class="ac-btn" download="${esc(name)}" href="${URL.createObjectURL(new Blob([data], { type }))}">${esc(name)}</a>`;
    $("downloads").innerHTML = [
      dl(`${res.name}.spz`, res.spz, "application/octet-stream"),
      dl(`${res.name}.manifest.json`, JSON.stringify({ ...res.manifest, files: { ...res.manifest.files, spz: { ...res.manifest.files.spz, url: `${res.name}.spz` } } }, null, 2), "application/json"),
      dl(`${res.name}.raw.ply`, res.ply, "application/octet-stream"),
      dl(`${res.name}.report.json`, JSON.stringify({ poses: res.poses, training: res.training, prepare: res.prepareReport, timings: res.timings }, null, 2), "application/json"),
    ].join("");
    window.lastResult = res;
  } catch (e) {
    setStep(current, "failed", e.message);
    showError(e.message);
  } finally {
    $("cancel").hidden = true; updateRun();
  }
});

window.trainPage = { load, inspect };
