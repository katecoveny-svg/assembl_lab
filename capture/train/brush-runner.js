// assembl capture · drive Brush (Apache-2.0, compiled to WebAssembly from source, commit 1388f74c) from JS.
//
//   const brush = await BrushRunner.create({ vendor: "./vendor/brush/" });
//   const run = await brush.train(files, { iterations: 7000, onProgress, preview: canvas });
//   const splats = await run.readSplats();       // CPU copy of the trained Gaussians (ply.js Splats)
//
// The dataset never leaves the device: files are written to the browser's origin-private file system
// (OPFS) and Brush reads them from there through its directory-handle loader (stock brush-js, unmodified).

import { splatsFromBrushBuffers } from "../src/splat/ply.js";

/** Brush 1388f74c's forward projection kernel binds 12 storage buffers (measured: SwiftShader's limit of 10 fails). */
export const MIN_STORAGE_BUFFERS = 12;

/** WebGPU features Brush needs. It uses subgroup operations in its sort and scan kernels unconditionally. */
export async function probeWebGPU() {
  const out = { webgpu: !!navigator.gpu, adapter: null, subgroups: false, reason: null };
  if (!navigator.gpu) { out.reason = "This browser has no WebGPU (navigator.gpu is missing)."; return out; }
  let adapter = null;
  try { adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" }); } catch (e) { out.reason = `WebGPU adapter request failed: ${e.message}`; return out; }
  if (!adapter) { out.reason = "WebGPU is present but no GPU adapter is available (blocklisted driver, or WebGPU switched off)."; return out; }
  const info = adapter.info || {};
  out.adapter = { vendor: info.vendor || "", architecture: info.architecture || "", description: info.description || "", fallback: !!adapter.isFallbackAdapter };
  out.subgroups = adapter.features.has("subgroups");
  out.storageBuffersPerStage = adapter.limits.maxStorageBuffersPerShaderStage;
  if (!out.subgroups) out.reason = "This browser's WebGPU has no subgroup operations, which Brush's training kernels need. Safari does not offer them yet; use Chrome or Edge on a Mac or PC.";
  else if (out.storageBuffersPerStage < MIN_STORAGE_BUFFERS) out.reason = `This GPU, in this browser, allows ${out.storageBuffersPerStage} storage buffers per shader stage; Brush's training kernels need ${MIN_STORAGE_BUFFERS}. Try Chrome or Edge on another computer, or update the graphics driver.`;
  out.ok = out.subgroups && out.storageBuffersPerStage >= MIN_STORAGE_BUFFERS;
  out.software = /swiftshader|llvmpipe|software/i.test(`${info.vendor} ${info.architecture} ${info.description}`) || !!adapter.isFallbackAdapter;
  out._adapter = adapter;
  return out;
}

async function opfsDir(name) {
  if (!navigator.storage?.getDirectory) throw new Error("This browser has no origin-private file system (OPFS), which training uses to hold the photos locally.");
  const root = await navigator.storage.getDirectory();
  const base = await root.getDirectoryHandle("assembl-capture", { create: true });
  try { await base.removeEntry(name, { recursive: true }); } catch { /* not there */ }
  return base.getDirectoryHandle(name, { create: true });
}

async function writeFile(dir, path, bytes) {
  const parts = path.split("/").filter(Boolean);
  let d = dir;
  for (const p of parts.slice(0, -1)) d = await d.getDirectoryHandle(p, { create: true });
  const fh = await d.getFileHandle(parts[parts.length - 1], { create: true });
  const w = await fh.createWritable();
  await w.write(bytes);
  await w.close();
}

/** Remove old runs from OPFS (each run copies the photos there). */
export async function clearLocalRuns() {
  try { const root = await navigator.storage.getDirectory(); await root.removeEntry("assembl-capture", { recursive: true }); } catch { /* none */ }
}

export class BrushRunner {
  static async create(opts = {}) {
    const { vendor = new URL("./vendor/brush/", import.meta.url).href, probe = null } = opts;
    const p = probe || (await probeWebGPU());
    if (!p.webgpu || !p._adapter) throw Object.assign(new Error(p.reason || "WebGPU unavailable"), { probe: p });
    if (!p.ok && !opts?.force) throw Object.assign(new Error(p.reason), { probe: p });
    const adapter = p._adapter;
    // Brush asks for the adapter's maximum limits and subgroups; share one device so the trained buffers
    // can be drawn and read back without copies across devices.
    const features = [...adapter.features].filter((f) => f !== "mappable-primary-buffers");
    const requiredLimits = {};
    for (const k in adapter.limits) { const v = adapter.limits[k]; if (typeof v === "number") requiredLimits[k] = v; }
    const device = await adapter.requestDevice({ requiredFeatures: features, requiredLimits });
    const t0 = performance.now();
    const mod = await import(new URL("brush_js.js", vendor).href);
    await mod.default({ module_or_path: new URL("brush_js_bg.wasm", vendor).href });
    const app = new mod.BrushApp();
    app.initExisting(adapter, device, device.queue);
    const r = new BrushRunner();
    Object.assign(r, { mod, app, device, adapter, probe: p, loadMs: performance.now() - t0 });
    // Fail fast instead of hanging: a WebGPU validation error or a Rust panic (a wasm "unreachable" trap)
    // leaves Brush's training stream unresolved, so race every batch against these.
    let fail;
    r.failure = new Promise((_, rej) => { fail = rej; });
    r.failure.catch(() => {});
    r._fail = (msg) => { if (!r.failed) { r.failed = msg; fail(new Error(msg)); } };
    device.addEventListener("uncapturederror", (e) => r._fail(`WebGPU error during training: ${e.error?.message?.split("\n")[0] || e.error}`));
    device.lost.then((info) => { r.lost = info; r._fail(`The GPU device was lost (${info.reason || "unknown"}): ${info.message || ""}`); });
    window.addEventListener("error", (e) => { if (/unreachable|RuntimeError/.test(String(e.message))) r._fail(`Brush stopped with an internal error (${e.message}).`); });
    return r;
  }

  /**
   * files: [{ name: "images/frame_00001.jpg", bytes: Uint8Array }, …] including transforms.json (or COLMAP sparse/).
   * opts: { iterations, maxResolution, shDegree, evalSplitEvery, evalEvery, maxSplats, seed, onProgress, onMessage, preview: canvas, signal }
   */
  async train(files, opts = {}) {
    const runId = `run-${Date.now().toString(36)}`;
    const dir = await opfsDir(runId);
    let written = 0;
    for (const f of files) { await writeFile(dir, f.name, f.bytes); written += f.bytes.length; opts.onStage?.("staging", { files: files.length, bytes: written }); }
    const K = this.mod.BrushMessageKind;
    const it = {
      iterations: opts.iterations ?? 7000, maxResolution: opts.maxResolution ?? 1280, shDegree: opts.shDegree ?? 3,
      evalSplitEvery: opts.evalSplitEvery ?? 8, evalEvery: opts.evalEvery ?? 1000, maxSplats: opts.maxSplats ?? 1500000, seed: opts.seed ?? 42,
    };
    let configUsed = null;
    const training = this.app.startTrainingFromDirectory(dir, async (initial) => {
      configUsed = {
        ...initial,
        "total-train-iters": it.iterations,
        "max-resolution": it.maxResolution,
        "sh-degree": it.shDegree,
        "eval-every": it.evalEvery,
        "eval-split-every": it.evalSplitEvery || null,
        "max-splats": it.maxSplats,
        "seed": it.seed,
        // The 3D (mip) filter keeps a per-splat scale floor outside the buffers brush-js exposes; with it on,
        // a read-back would not match what Brush rendered. Off = plain 3DGS splats, as Spark draws them.
        "min-scale-factor": 0,
        ...(opts.configOverrides || {}),
      };
      return configUsed;
    });
    const state = { runId, iter: 0, total: it.iterations, splats: 0, shDegree: 0, trainViews: 0, evalViews: 0, evals: [], warnings: [], started: performance.now(),
      elapsedMs: 0, stepsPerSec: 0, done: false, phase: "loading" };
    const samples = [];
    const runner = this;
    const preview = opts.preview ? new SplatPreview(this.device, opts.preview) : null;

    const handle = {
      state, training, preview,
      get config() { return configUsed; },
      async readSplats() { return runner.readSplats(training); },
      cancel() { state.cancelled = true; },
    };
    handle.done = (async () => {
      let lastPreview = 0;
      while (!state.cancelled) {
        if (opts.signal?.aborted) { state.cancelled = true; break; }
        const msgs = await Promise.race([training.trainSteps(opts.batch ?? 10), runner.failure]);
        if (!msgs.length) break;
        for (const m of msgs) {
          switch (m.kind) {
            case K.DatasetLoaded: state.trainViews = m.trainViews ?? 0; state.evalViews = m.evalViews ?? 0; break;
            case K.SplatsUpdated: if (m.numSplats != null) state.splats = m.numSplats; if (m.shDegree != null) state.shDegree = m.shDegree; break;
            case K.DoneLoading: state.phase = "training"; break;
            case K.TrainStep:
              state.phase = "training";
              if (m.iter != null) state.iter = m.iter;
              if (m.elapsedMs != null) state.elapsedMs = m.elapsedMs;
              samples.push([state.iter, performance.now()]);
              if (samples.length > 40) samples.shift();
              if (samples.length > 1) {
                const [i0, t0] = samples[0], [i1, t1] = samples[samples.length - 1];
                state.stepsPerSec = t1 > t0 ? ((i1 - i0) * 1000) / (t1 - t0) : 0;
              }
              break;
            case K.RefineStep: if (m.numSplats != null) state.splats = m.numSplats; break;
            case K.EvalResult: state.evals.push({ iter: m.iter, psnr: m.psnr, ssim: m.ssim, wallSeconds: (performance.now() - state.started) / 1000 }); break;
            case K.Warning: state.warnings.push(m.text); break;
            case K.DoneTraining: state.done = true; break;
            default: break;
          }
          opts.onMessage?.(m, state);
          m.free?.();
        }
        state.wallMs = performance.now() - state.started;
        opts.onProgress?.(state);
        if (preview && performance.now() - lastPreview > (opts.previewEveryMs ?? 400)) {
          lastPreview = performance.now();
          const s = training.currentSplats();
          if (s) { preview.bind(s); s.free?.(); }
          preview.draw();
        }
        if (state.done) break;
      }
      state.phase = state.cancelled ? "cancelled" : "done";
      state.wallMs = performance.now() - state.started;
      opts.onProgress?.(state);
      return state;
    })();
    return handle;
  }

  /** Copy Brush's live GPU buffers to the CPU and build a Splats object (PLY-ready). */
  async readSplats(training) {
    const s = training.currentSplats();
    if (!s) throw new Error("No splats yet");
    const n = s.numSplats, deg = s.shDegree;
    const b = s.buffers();
    if (!b) throw new Error("Brush is not on the WebGPU backend");
    const C = (deg + 1) * (deg + 1);
    const sizes = { transforms: n * 10 * 4, shCoeffs: n * C * 3 * 4, rawOpacities: n * 4 };
    const enc = this.device.createCommandEncoder();
    const staging = {};
    for (const [k, size] of Object.entries(sizes)) {
      staging[k] = this.device.createBuffer({ size: Math.ceil(size / 4) * 4, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
      enc.copyBufferToBuffer(b[k], 0, staging[k], 0, staging[k].size);
    }
    this.device.queue.submit([enc.finish()]);
    const arrays = {};
    for (const [k, buf] of Object.entries(staging)) {
      await buf.mapAsync(GPUMapMode.READ);
      arrays[k] = new Float32Array(buf.getMappedRange().slice(0));
      buf.unmap(); buf.destroy();
    }
    s.free?.();
    return splatsFromBrushBuffers(arrays.transforms, arrays.shCoeffs, arrays.rawOpacities, n, deg);
  }
}

/* ----------------------------------------------------------------------------------------------
 * Live preview: Brush's own GPU buffers drawn as unsorted Gaussian sprites (colour from the SH DC
 * term, size from the largest scale, opacity from the trained logit). Labelled on screen as a preview:
 * the final render is the splat-car viewer (Spark), which sorts and uses the full spherical harmonics.
 * -------------------------------------------------------------------------------------------- */
const PREVIEW_WGSL = /* wgsl */ `
struct U { viewProj: mat4x4f, view: mat4x4f, focal: vec2f, viewport: vec2f, count: u32, shStride: u32, pad0: u32, pad1: u32 };
@group(0) @binding(0) var<uniform> u: U;
@group(0) @binding(1) var<storage, read> tr: array<f32>;
@group(0) @binding(2) var<storage, read> sh: array<f32>;
@group(0) @binding(3) var<storage, read> op: array<f32>;
struct V { @builtin(position) pos: vec4f, @location(0) uv: vec2f, @location(1) col: vec4f };
@vertex fn vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> V {
  var o: V;
  let b = ii * 10u;
  let p = vec3f(tr[b], tr[b + 1u], tr[b + 2u]);
  let s = exp(max(tr[b + 7u], max(tr[b + 8u], tr[b + 9u])));
  let clip = u.viewProj * vec4f(p, 1.0);
  let vz = (u.view * vec4f(p, 1.0)).z;
  let corner = vec2f(f32(vi & 1u), f32((vi >> 1u) & 1u)) * 2.0 - 1.0;
  let radiusPx = clamp(2.0 * s * u.focal.y / max(-vz, 1e-3), 0.75, 48.0);
  o.pos = clip + vec4f(corner * radiusPx / u.viewport * 2.0 * clip.w, 0.0, 0.0);
  if (clip.w <= 0.0) { o.pos = vec4f(2.0, 2.0, 2.0, 1.0); }
  let c = ii * u.shStride;
  let rgb = clamp(vec3f(sh[c], sh[c + 1u], sh[c + 2u]) * 0.2820948 + 0.5, vec3f(0.0), vec3f(1.0));
  o.col = vec4f(rgb, 1.0 / (1.0 + exp(-op[ii])));
  o.uv = corner;
  return o;
}
@fragment fn fs(v: V) -> @location(0) vec4f {
  let a = v.col.a * exp(-2.0 * dot(v.uv, v.uv));
  if (a < 0.01) { discard; }
  return vec4f(v.col.rgb * a, a);
}`;

export class SplatPreview {
  constructor(device, canvas) {
    this.device = device; this.canvas = canvas;
    this.ctx = canvas.getContext("webgpu");
    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.ctx.configure({ device, format: this.format, alphaMode: "premultiplied" });
    const module = device.createShaderModule({ code: PREVIEW_WGSL });
    this.pipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: { module, entryPoint: "vs" },
      fragment: { module, entryPoint: "fs", targets: [{ format: this.format, blend: { color: { srcFactor: "one", dstFactor: "one-minus-src-alpha" }, alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha" } } }] },
      primitive: { topology: "triangle-strip" },
    });
    this.uniform = device.createBuffer({ size: 160, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.orbit = { yaw: 0.6, pitch: 0.35, radius: 6, target: [0, 0.6, 0], fovY: 45 * Math.PI / 180 };
    this.background = [1, 0.992, 0.984];
    this.count = 0;
    this._bindPointer();
  }

  /** Point the camera at a scene: centre + radius (e.g. from the dataset's cameras). */
  frame(target, radius) { this.orbit.target = target; this.orbit.radius = radius; }

  bind(splats) {
    const b = splats.buffers();
    if (!b) return;
    const n = splats.numSplats, deg = splats.shDegree;
    this.count = n;
    this.shStride = (deg + 1) * (deg + 1) * 3;
    this.bindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: this.uniform } }, { binding: 1, resource: { buffer: b.transforms } },
        { binding: 2, resource: { buffer: b.shCoeffs } }, { binding: 3, resource: { buffer: b.rawOpacities } }],
    });
  }

  draw() {
    const c = this.canvas, dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(c.clientWidth * dpr)), h = Math.max(1, Math.round(c.clientHeight * dpr));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const { yaw, pitch, radius, target, fovY } = this.orbit;
    const eye = [target[0] + radius * Math.cos(pitch) * Math.sin(yaw), target[1] + radius * Math.sin(pitch), target[2] + radius * Math.cos(pitch) * Math.cos(yaw)];
    const view = lookAt(eye, target), proj = perspective(fovY, w / h, 0.02, 200), vp = mul4(proj, view);
    const f = (h / 2) / Math.tan(fovY / 2);
    const data = new ArrayBuffer(160), fv = new Float32Array(data), uv = new Uint32Array(data);
    fv.set(vp, 0); fv.set(view, 16); fv[32] = f; fv[33] = f; fv[34] = w; fv[35] = h; uv[36] = this.count; uv[37] = this.shStride || 3;
    this.device.queue.writeBuffer(this.uniform, 0, data);
    const enc = this.device.createCommandEncoder();
    const pass = enc.beginRenderPass({ colorAttachments: [{ view: this.ctx.getCurrentTexture().createView(), loadOp: "clear", storeOp: "store",
      clearValue: { r: this.background[0], g: this.background[1], b: this.background[2], a: 1 } }] });
    if (this.bindGroup && this.count) { pass.setPipeline(this.pipeline); pass.setBindGroup(0, this.bindGroup); pass.draw(4, this.count); }
    pass.end();
    this.device.queue.submit([enc.finish()]);
  }

  _bindPointer() {
    let drag = null;
    const c = this.canvas;
    c.addEventListener("pointerdown", (e) => { drag = [e.clientX, e.clientY]; c.setPointerCapture(e.pointerId); });
    c.addEventListener("pointerup", () => { drag = null; });
    c.addEventListener("pointermove", (e) => {
      if (!drag) return;
      this.orbit.yaw -= (e.clientX - drag[0]) * 0.006;
      this.orbit.pitch = Math.max(-1.2, Math.min(1.45, this.orbit.pitch + (e.clientY - drag[1]) * 0.006));
      drag = [e.clientX, e.clientY];
      this.draw();
    });
    c.addEventListener("wheel", (e) => { e.preventDefault(); this.orbit.radius *= 1 + e.deltaY * 0.001; this.draw(); }, { passive: false });
  }
}

function perspective(fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
  // WebGPU clip space: z in [0, 1]
  return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, far * nf, -1, 0, 0, far * near * nf, 0];
}
function lookAt(eye, t) {
  const z = norm([eye[0] - t[0], eye[1] - t[1], eye[2] - t[2]]), x = norm(cross([0, 1, 0], z)), y = cross(z, x);
  return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1];
}
function mul4(a, b) { const o = new Array(16).fill(0); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]; return o; }
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const n = Math.hypot(...a) || 1; return [a[0] / n, a[1] / n, a[2] / n]; };
