// assembl capture · train a capture on this computer, in the browser, with nothing uploaded.
//
//   import { run, inspect } from "./train.js";
//   const result = await run(zipFile, { iterations: 7000, preview: canvas, onStage, onProgress,
//                                       viewer: { el: document.querySelector("#viewer") } });
//
// Steps: read the ZIP → (solve poses if the capture has none) → train with Brush (WebGPU) → read the
// Gaussians back → prepare (port of prepare_splat.py: level, scale, crop, clean, SPZ to budget, manifest)
// → open the result in the splat-car viewer, imported from splat-viewer/viewer/viewer.js (not copied).

import { readZip, commonRoot } from "../src/zip.js";
import { writePly } from "../src/splat/ply.js";
import { prepareSplat, subjectFromCameras } from "../src/splat/prepare.js";
import { BrushRunner, probeWebGPU } from "./brush-runner.js";

export { probeWebGPU };
export const DEFAULT_VIEWER = new URL("../../splat-viewer/viewer/viewer.js", import.meta.url).href;
export const DEFAULT_CAR_SPEC = new URL("../../splat-viewer/specs/sample-simulated.json", import.meta.url).href;

async function toFiles(input) {
  if (input?.files && Array.isArray(input.files)) return input.files;
  const entries = await readZip(input);
  const root = commonRoot(entries);
  const files = [];
  for (const e of entries) files.push({ name: e.name.slice(root.length), bytes: await e.bytes() });
  return files;
}

/** Read a capture ZIP (or { files }) and describe it without training. */
export async function inspect(input) {
  const files = await toFiles(input);
  const get = (n) => files.find((f) => f.name === n);
  const json = (f) => (f ? JSON.parse(new TextDecoder().decode(f.bytes)) : null);
  const capture = json(get("capture.json"));
  const transforms = json(get("transforms.json"));
  const colmap = files.some((f) => /(^|\/)sparse\/0\/(cameras|images)\.(bin|txt)$/.test(f.name));
  const images = files.filter((f) => /\.(jpe?g|png|webp)$/i.test(f.name) && !/(^|\/)masks?\//.test(f.name));
  const poses = transforms ? "included" : colmap ? "colmap" : "needed";
  const mode = capture?.prepareMode || (capture?.mode === "object" ? "object" : "exterior");
  const subject = capture?.subject || {};
  return {
    files, capture, transforms, images: images.length, bytes: files.reduce((s, f) => s + f.bytes.length, 0), poses,
    poseSource: transforms ? capture?.poseSource || "transforms.json" : colmap ? "COLMAP sparse model" : "none",
    mode, preset: capture?.preset || null, presetLabel: capture?.presetLabel || null, subject,
    knownSizeM: subject.knownLengthM ?? subject.knownSizeM ?? null,
    imageSize: capture?.camera?.width ? [capture.camera.width, capture.camera.height] : transforms?.w ? [transforms.w, transforms.h] : null,
  };
}

/**
 * opts: {
 *   iterations (7000), maxResolution (1280), shDegree (3), evalSplitEvery (8), maxSplats,
 *   lengthM          known length / size in metres (overrides the capture's), prepareMode, budgetMB,
 *   preview          canvas for the live preview,  onStage(stage, info), onProgress(trainState), onLog(line), signal,
 *   poseOptions      passed to solvePoses (maxSide, pairOptions, workers),
 *   viewer           { el, module = DEFAULT_VIEWER, spec } to open the result in the splat-car viewer,
 *   brush            an existing BrushRunner (reuse the GPU device between runs)
 *   posesOnly        solve poses and return { posedZip } without training (needs only core WebGPU)
 *   initPoints       false: don't solve for starting points when the capture has poses but no points (WebXR)
 * }
 */
export async function run(input, opts = {}) {
  const stage = (s, info = {}) => opts.onStage?.(s, info);
  const t0 = performance.now();
  const timings = {};
  const mark = (k, t) => { timings[k] = Math.round(performance.now() - t); };

  stage("read", { status: "running" });
  let t = performance.now();
  const ds = await inspect(input);
  const files = ds.files;
  mark("read", t);
  stage("read", { status: "done", dataset: ds });
  if (ds.images < 3) throw new Error("This capture has fewer than three photos.");

  const probe = opts.brush?.probe || (await probeWebGPU());
  if (!probe.ok && !opts.posesOnly) throw Object.assign(new Error(probe.reason), { probe, stage: "webgpu" });
  if (opts.posesOnly && !probe.webgpu) throw Object.assign(new Error(probe.reason), { probe, stage: "webgpu" });

  // 1 · poses ----------------------------------------------------------------------------------------
  let poseReport = null;
  if (ds.poses === "needed") {
    stage("poses", { status: "running" });
    t = performance.now();
    const { solvePoses } = await import("../src/sfm/solve.js");
    const images = files.filter((f) => f.name.startsWith("images/"));
    const solved = await solvePoses(ds.capture, images, { ...(opts.poseOptions || {}), signal: opts.signal,
      onProgress: (p) => stage("poses", { status: "running", progress: p }), onLog: opts.onLog });
    files.push({ name: "transforms.json", bytes: new TextEncoder().encode(JSON.stringify(solved.transforms)) });
    files.push({ name: "points3D.ply", bytes: solved.pointsPly });
    poseReport = solved.report;
    ds.solvedTransforms = solved.transforms;
    mark("poses", t);
    stage("poses", { status: "done", report: poseReport });
  } else if (ds.poses === "included" && !files.some((f) => f.name === (ds.transforms.ply_file_path || "points3D.ply")) && opts.initPoints !== false && ds.images >= 8) {
    // poses but no points (WebXR): Brush would start from random points. Solve anyway for the sparse points,
    // move them into the phone's metric frame, and keep the phone's poses.
    stage("poses", { status: "running", note: "Poses are in the file; finding starting points for training" });
    t = performance.now();
    try {
      const { solvePoses, pointsForGivenPoses } = await import("../src/sfm/solve.js");
      const images = files.filter((f) => f.name.startsWith("images/"));
      const solved = await solvePoses(ds.capture, images, { ...(opts.poseOptions || {}), signal: opts.signal,
        onProgress: (p) => stage("poses", { status: "running", progress: p }), onLog: opts.onLog });
      const moved = pointsForGivenPoses(ds.transforms, solved.transforms, solved.points.xyz);
      if (moved && moved.inliers >= Math.max(4, 0.5 * moved.cameras)) {
        const { writePointsPly } = await import("../src/splat/ply.js");
        files.push({ name: "points3D.ply", bytes: writePointsPly(moved.points, solved.points.rgb) });
        const tr = { ...ds.transforms, ply_file_path: "points3D.ply" };
        const i = files.findIndex((f) => f.name === "transforms.json");
        files[i] = { name: "transforms.json", bytes: new TextEncoder().encode(JSON.stringify(tr)) };
        poseReport = { ...solved.report, usedFor: "initial points only (the phone's poses were kept)", alignment: { cameras: moved.cameras, inliers: moved.inliers, rmsM: +moved.rmsM.toFixed(4) } };
      } else poseReport = { ...solved.report, usedFor: "nothing: the solver's cameras did not match the phone's poses; training starts from random points" };
    } catch (e) { poseReport = { error: e.message, usedFor: "nothing: training starts from random points" }; }
    mark("poses", t);
    stage("poses", { status: "done", report: poseReport });
  } else stage("poses", { status: "skipped", reason: ds.poses === "included" ? `Poses included (${ds.poseSource})` : "COLMAP model included" });

  if (opts.posesOnly) {
    // a posed capture to train on another computer (e.g. when this browser can solve but not train)
    const { ZipWriter } = await import("../src/zip.js");
    const zw = new ZipWriter();
    for (const f of files) {
      if (f.name === "capture.json" && ds.capture) zw.add(f.name, JSON.stringify({ ...ds.capture, poseSource: poseReport ? "solved" : ds.capture.poseSource, poses: "included", poseSolver: poseReport }, null, 1));
      else zw.add(f.name, f.bytes);
    }
    return { posesOnly: true, dataset: { ...ds, files: undefined }, poses: poseReport, posedZip: zw.toBlob(), timings: { ...timings, total: Math.round(performance.now() - t0) } };
  }

  // 2 · train ----------------------------------------------------------------------------------------
  stage("train", { status: "running" });
  t = performance.now();
  const brush = opts.brush || (await BrushRunner.create({ probe }));
  // capture.json is metadata for us, not a dataset file for Brush
  const brushFiles = files.filter((f) => f.name !== "capture.json");
  const runH = await brush.train(brushFiles, {
    iterations: opts.iterations ?? 7000, maxResolution: opts.maxResolution ?? 1280, shDegree: opts.shDegree ?? 3,
    evalSplitEvery: opts.evalSplitEvery ?? 8, evalEvery: opts.evalEvery ?? 1000, maxSplats: opts.maxSplats,
    preview: opts.preview, signal: opts.signal, onProgress: opts.onProgress,
    onStage: (s, info) => stage("train", { status: "running", staging: info }),
  });
  if (opts.preview && runH.preview) {
    const tr = ds.transforms || ds.solvedTransforms;
    if (tr?.frames?.length) {
      const C = tr.frames.map((f) => [f.transform_matrix[0][3], f.transform_matrix[1][3], f.transform_matrix[2][3]]);
      const c = [0, 1, 2].map((k) => C.reduce((s, p) => s + p[k], 0) / C.length);
      const r = C.reduce((s, p) => s + Math.hypot(p[0] - c[0], p[2] - c[2]), 0) / C.length;
      runH.preview.frame([c[0], c[1] * 0.4, c[2]], r * 1.25);
    }
  }
  const state = await runH.done;
  if (state.cancelled) { stage("train", { status: "cancelled" }); return { cancelled: true, dataset: ds, poses: poseReport, training: state }; }
  const splats = await runH.readSplats();
  const ply = writePly(splats);
  mark("train", t);
  stage("train", { status: "done", state, splats: splats.n });

  // 3 · prepare --------------------------------------------------------------------------------------
  stage("prepare", { status: "running" });
  t = performance.now();
  const lengthM = opts.lengthM ?? ds.knownSizeM ?? null;
  const name = (ds.subject.label || ds.preset || "capture").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "capture";
  const camFrames = (ds.transforms || ds.solvedTransforms)?.frames;
  const pmode = opts.prepareMode || ds.mode;
  const subj = camFrames?.length ? subjectFromCameras(camFrames, pmode) : {};   // where every camera is looking
  const prepared = await prepareSplat(splats, {
    name, mode: pmode, lengthM, budgetMB: opts.budgetMB, seed: subj.seed || undefined, subjectRadius: subj.subjectRadius,
    metric: ds.capture?.poseSource === "webxr",               // WebXR poses are in metres already
    up: ds.capture?.poseSource === "webxr" || poseReport ? "+y" : "auto", // both are gravity-aligned
    onStep: (st) => stage("prepare", { status: "running", step: st }),
  });
  mark("prepare", t);
  stage("prepare", { status: "done", report: prepared.report });

  // 4 · result + viewer ------------------------------------------------------------------------------
  const spzBlob = new Blob([prepared.spz], { type: "application/octet-stream" });
  const spzUrl = `${URL.createObjectURL(spzBlob)}#${name}.spz`;
  const manifest = structuredClone(prepared.manifest);
  manifest.files.spz.url = spzUrl;
  manifest.capture = { poses: ds.poses === "needed" ? "solved in the browser" : ds.poseSource, images: ds.images, training: { iterations: state.iter, seconds: Math.round(state.wallMs / 1000), evals: state.evals } };
  const result = {
    dataset: { ...ds, files: undefined }, poses: poseReport, training: state, config: runH.config,
    ply, spz: prepared.spz, manifest, prepareReport: prepared.report, qa: prepared.qa, name, timings: { ...timings, total: Math.round(performance.now() - t0) },
    urls: { spz: spzUrl },
  };
  if (opts.viewer?.el) {
    stage("view", { status: "running" });
    const { mount } = await import(opts.viewer.module || DEFAULT_VIEWER);
    const spec = opts.viewer.spec || (ds.mode === "exterior" ? DEFAULT_CAR_SPEC : objectSpec(ds));
    result.viewer = await mount(opts.viewer.el, { manifest, spec, splatUrl: spzUrl, theme: opts.viewer.theme || "auto", onEvent: opts.viewer.onEvent });
    stage("view", { status: "done" });
  }
  return result;
}

/** A minimal spec for an object (no car fields): the viewer shows the 3D model and its measured size. */
export function objectSpec(ds) {
  return {
    vehicle: { make: "", model: ds.subject?.label || "Captured object", variant: "", bodyStyle: "3D capture" },
    capture: { note: "Captured with assembl capture and trained in the browser.", attribution: null },
    groups: [], fields: {}, hotspots: [], sources: [],
  };
}

export const train = { run, inspect, probe: probeWebGPU };
export default train;
