// assembl capture · solve camera poses in the browser for captures that have none (iPhone, iPad, laptops).
//
// Solver: colmap-wasm 0.1.0 (BSD-3-Clause; COLMAP 4.2.1 SIFT, geometric verification, view-graph
// calibration and the GLOMAP global mapper compiled to WebAssembly; SIFT matching on WebGPU), vendored in
// train/vendor/colmap-wasm. Measured on the synthetic capture: see README "Pose accuracy".
//
// What the capture's motion-sensor priors are used for:
//   · choosing which image pairs to match (ring structure + azimuth from the phone's heading);
//   · levelling the solved world so +Y is up (gravity from the phone's tilt sensors);
//   · a sanity check: relative rotations from the solver vs from the gyro.
// Output: a Nerfstudio transforms.json (+ points3D.ply sparse points that Brush starts from).

import { capturePairs } from "./pairs.js";
import { m3, v3, mat3FromQuat, rotAngleDeg, nearestRotation, umeyama } from "../geom.js";
import { writePointsPly } from "../splat/ply.js";
import { rowsFromColumnMajor } from "../dataset.js";

const DEFAULT_VENDOR = new URL("../../train/vendor/colmap-wasm/dist/index.js", import.meta.url).href;

/** COLMAP world→camera (OpenCV axes, row-major R) → camera-to-world rotation (OpenGL axes) and centre. */
export function colmapToGL(R, t) {
  const Rt = m3.T(Array.from(R));
  const c = v3.scale(m3.vec(Rt, t), -1);
  return { R: m3.mul(Rt, [1, 0, 0, 0, -1, 0, 0, 0, -1]), c };
}

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };

function rotBetween(a, b) {
  a = v3.unit(a); b = v3.unit(b);
  const v = v3.cross(a, b), c = v3.dot(a, b);
  if (c < -0.999999) { const ax = v3.unit(Math.abs(a[0]) < 0.9 ? v3.cross(a, [1, 0, 0]) : v3.cross(a, [0, 1, 0])); const K = m3.skew(ax); const K2 = m3.mul(K, K); return m3.I().map((x, i) => x + 2 * K2[i]); }
  const K = m3.skew(v), K2 = m3.mul(K, K), f = 1 / (1 + c);
  return m3.I().map((x, i) => x + K[i] + K2[i] * f);
}

async function downscale(blob, maxSide) {
  const bmp = await createImageBitmap(blob);
  const W = bmp.width, H = bmp.height;
  const s = Math.min(1, maxSide / Math.max(W, H));
  if (s >= 1) { bmp.close?.(); return { blob, width: W, height: H, fullWidth: W, fullHeight: H }; }
  const w = Math.round(W * s), h = Math.round(H * s);
  const c = new OffscreenCanvas(w, h);
  c.getContext("2d").drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  return { blob: await c.convertToBlob({ type: "image/jpeg", quality: 0.92 }), width: w, height: h, fullWidth: W, fullHeight: H };
}

/**
 * capture: parsed capture.json; images: [{ name: "images/frame_00001.jpg", bytes: Uint8Array }]
 * opts: { vendorUrl, maxSide (default 1600), pairOptions (see pairs.js), onProgress({stage, done, total}), onLog(line), signal, workers, expectedDistanceM }
 * Returns { transforms, pointsPly, report }.
 */
export async function solvePoses(capture, images, opts = {}) {
  const t0 = performance.now();
  const { estimatePoses } = await import(opts.vendorUrl || DEFAULT_VENDOR);
  const byFile = new Map(images.map((im) => [im.name.replace(/^\.\//, ""), im]));
  const frames = (capture?.frames?.length ? capture.frames : images.map((im) => ({ file: im.name })))
    .filter((f) => byFile.has(f.file));
  if (frames.length < 3) throw new Error("Fewer than three photos: nothing to solve");

  // one SIMPLE_PINHOLE camera: every image must have the same size (the capture page enforces this)
  const sizes = new Map();
  const prepared = [];
  opts.onProgress?.({ stage: "preparing", done: 0, total: frames.length });
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    const src = new Blob([byFile.get(f.file).bytes], { type: "image/jpeg" });
    const d = await downscale(src, opts.maxSide || 1600);
    const bmpKey = `${d.width}x${d.height}`;
    sizes.set(bmpKey, (sizes.get(bmpKey) || 0) + 1);
    prepared.push({ f, ...d, name: f.file.split("/").pop() });
    if (i % 8 === 0) opts.onProgress?.({ stage: "preparing", done: i + 1, total: frames.length });
  }
  const mainSize = [...sizes.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const kept = prepared.filter((p) => `${p.width}x${p.height}` === mainSize);
  const dropped = prepared.length - kept.length;
  const [sw, sh] = mainSize.split("x").map(Number);
  const fullW = kept[0].fullWidth, fullH = kept[0].fullHeight;
  const scale = sw / fullW;

  const keptFrames = kept.map((k) => k.f);
  const pairs = capturePairs(keptFrames, opts.pairOptions);
  const log = [];
  const tSolve = performance.now();
  const res = await estimatePoses(kept.map((k) => ({ name: k.name, data: k.blob })), {
    pairs, seed: 0, workers: opts.workers, signal: opts.signal,
    onProgress: (p) => opts.onProgress?.(p),
    onLog: (l) => { log.push(l); opts.onLog?.(l); },
  });
  const raw = {
    camera: res.reconstruction.camera,
    images: res.reconstruction.images.map((im) => ({ name: im.name, registered: im.registered, R: im.R ? Array.from(im.R) : null, t: im.t })),
    points: res.reconstruction.points.map((p) => ({ xyz: p.xyz, color: Array.from(p.color), error: p.error, images: [...new Set(p.track.map((t) => t[0]))] })),
    frames: keptFrames, fullW, fullH, scale, pairs: pairs.length, images0: frames.length, solvedAt: [sw, sh], droppedOtherSize: dropped,
    timings: { ...res.timings, total: Math.round(performance.now() - t0), solve: Math.round(performance.now() - tSolve) }, log,
  };
  return { ...finishPoses(raw, capture, opts), raw };
}

/**
 * Initial points for a capture that already has poses (WebXR): move the solver's sparse points into the
 * given poses' frame with the similarity that best maps the solver's camera centres onto the given ones
 * (robust: refit on cameras within 5 % of the ring radius). Returns { points (Float32Array xyz), colors,
 * cameras, inliers, rmsM } or null when too few cameras match.
 */
export function pointsForGivenPoses(given, solved, pointsXYZ) {
  const byFile = new Map(given.frames.map((f) => [f.file_path.replace(/^\.\//, ""), [f.transform_matrix[0][3], f.transform_matrix[1][3], f.transform_matrix[2][3]]]));
  const pairs = solved.frames.map((f) => ({ s: [f.transform_matrix[0][3], f.transform_matrix[1][3], f.transform_matrix[2][3]], g: byFile.get(f.file_path) })).filter((p) => p.g);
  if (pairs.length < 4) return null;
  const mid = [0, 1, 2].map((k) => median(pairs.map((p) => p.g[k])));
  const radius = median(pairs.map((p) => v3.norm(v3.sub(p.g, mid))));
  let use = pairs, fit = null;
  for (let it = 0; it < 4; it++) {
    fit = umeyama(use.map((p) => p.s), use.map((p) => p.g));
    const err = (p) => v3.norm(v3.sub(v3.add(v3.scale(m3.vec(fit.R, p.s), fit.s), fit.t), p.g));
    const next = pairs.filter((p) => err(p) < 0.05 * radius);
    if (next.length < 4 || next.length === use.length) break;
    use = next;
  }
  const res = use.map((p) => v3.norm(v3.sub(v3.add(v3.scale(m3.vec(fit.R, p.s), fit.s), fit.t), p.g)));
  const n = pointsXYZ.length / 3, out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) out.set(v3.add(v3.scale(m3.vec(fit.R, [pointsXYZ[i * 3], pointsXYZ[i * 3 + 1], pointsXYZ[i * 3 + 2]]), fit.s), fit.t), i * 3);
  return { points: out, cameras: pairs.length, inliers: use.length, rmsM: Math.sqrt(res.reduce((a, b) => a + b * b, 0) / res.length), scale: fit.s };
}

/**
 * Turn colmap-wasm's reconstruction into a Nerfstudio dataset. Pure (no DOM), so it can be re-run offline.
 * Uses the phone's attitude priors to reject mis-registered photos: one global rotation W maps the prior
 * world onto the solver's world (heading offset and all); a photo whose solved rotation disagrees with
 * W·prior by more than max(10°, 6 × median) was placed wrongly and is dropped. Far-off camera centres
 * (over 3 × the median distance from the middle) are dropped too.
 */
export function finishPoses(raw, capture, opts = {}) {
  const cam = raw.camera;
  let reg = [];
  raw.images.forEach((im, i) => { if (im.registered) reg.push({ i, frame: raw.frames[i], ...colmapToGL(im.R, im.t) }); });
  const registered = reg.length;
  if (reg.length < 3) throw Object.assign(new Error(`The pose solver placed only ${reg.length} of ${raw.frames.length} photos. Try the Mac fallback (README) or capture again with more overlap.`), { log: raw.log });
  const rejected = [];

  // ---- gyro consensus check ------------------------------------------------------------------------
  let gyro = null;
  const withPrior = reg.filter((r) => r.frame.attitude?.q);
  if (withPrior.length >= 3) {
    const cand = withPrior.map((r) => m3.mul(r.R, m3.T(mat3FromQuat(r.frame.attitude.q)))); // W_i = R_solved · R_priorᵀ
    let best = 0, bestCount = -1;
    cand.forEach((W, a) => { const c = cand.reduce((n, V) => n + (rotAngleDeg(W, V) < 10 ? 1 : 0), 0); if (c > bestCount) { bestCount = c; best = a; } });
    let W = cand[best];
    for (let it = 0; it < 2; it++) {
      const sum = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      cand.forEach((V) => { if (rotAngleDeg(W, V) < 12) V.forEach((v, k) => (sum[k] += v)); });
      W = nearestRotation(sum);
    }
    const err = withPrior.map((r) => rotAngleDeg(r.R, m3.mul(W, mat3FromQuat(r.frame.attitude.q))));
    const med = median(err);
    const thr = Math.max(opts.gyroRejectDeg ?? 10, 6 * med);
    const bad = new Set(withPrior.filter((_, k) => err[k] > thr).map((r) => r.i));
    gyro = { medianDeg: +med.toFixed(3), maxDeg: +Math.max(...err).toFixed(3), thresholdDeg: +thr.toFixed(2), rejected: bad.size, checked: withPrior.length };
    reg = reg.filter((r) => { if (bad.has(r.i)) { rejected.push({ file: r.frame.file, why: "rotation disagrees with the phone's sensors" }); return false; } return true; });
  }
  // ---- far-off centres ------------------------------------------------------------------------------
  {
    const mid = [0, 1, 2].map((k) => median(reg.map((r) => r.c[k])));
    const d = reg.map((r) => v3.norm(v3.sub(r.c, mid)));
    const md = median(d);
    reg = reg.filter((r, k) => { if (d[k] > 3 * md) { rejected.push({ file: r.frame.file, why: "camera position far from the others" }); return false; } return true; });
  }
  if (reg.length < 3) throw new Error("Too few photos left after the consistency checks.");
  const keptIdx = new Set(reg.map((r) => r.i));

  // ---- level the world with gravity -------------------------------------------------------------
  // prior: the phone's "down" in each camera; solved: rotate it into the solver's world, average.
  const downs = [];
  for (const r of reg) if (r.frame.gravityCam) downs.push(v3.unit(m3.vec(r.R, r.frame.gravityCam)));
  let down, upSource;
  const camUp = v3.unit(reg.reduce((s, r) => v3.add(s, m3.vec(r.R, [0, 1, 0])), [0, 0, 0])); // phones are held upright
  if (downs.length >= 3) {
    down = v3.unit(downs.reduce((s, d) => v3.add(s, d), [0, 0, 0]));
    upSource = "motion sensors (gravity)";
    const agree = Math.acos(Math.max(-1, Math.min(1, -v3.dot(down, camUp)))) * 180 / Math.PI;
    if (agree > 45) { down = v3.scale(camUp, -1); upSource = `camera up-vectors (sensor gravity disagreed by ${agree.toFixed(0)}°)`; }
  } else { down = v3.scale(camUp, -1); upSource = "camera up-vectors (no motion sensors)"; }
  const Rl = rotBetween(down, [0, -1, 0]);

  // ---- scale and centre: monocular poses have no scale; set a plausible one for training ----------
  const C = reg.map((r) => m3.vec(Rl, r.c));
  const ringMid = [median(C.map((c) => c[0])), 0, median(C.map((c) => c[2]))];
  const ringR = median(C.map((c) => Math.hypot(c[0] - ringMid[0], c[2] - ringMid[2])));
  const pts = raw.points.filter((p) => p.error < 2.5 && p.images.every((i) => keptIdx.has(i)))
    .filter((p) => { const q = m3.vec(Rl, p.xyz); return Math.hypot(q[0] - ringMid[0], q[2] - ringMid[2]) < 6 * ringR; });
  const P = pts.map((p) => m3.vec(Rl, p.xyz));
  const centre = P.length ? [median(P.map((p) => p[0])), median(P.map((p) => p[1])), median(P.map((p) => p[2]))] : ringMid;
  const camDist = median(C.map((c) => Math.hypot(c[0] - centre[0], c[2] - centre[2])));
  const expected = opts.expectedDistanceM ?? (capture?.mode === "object" ? 0.35 : 3.2);
  const s = expected / (camDist || 1);
  const xf = (p) => v3.scale(v3.sub(p, [centre[0], 0, centre[2]]), s);

  // ---- relative rotations of consecutive photos vs the gyro (after rejection) ------------------------
  const relErr = [];
  for (let k = 1; k < reg.length; k++) {
    const a = reg[k - 1], b = reg[k];
    if (b.i !== a.i + 1 || !a.frame.attitude || !b.frame.attitude) continue;
    const Ra = mat3FromQuat(a.frame.attitude.q), Rb = mat3FromQuat(b.frame.attitude.q);
    relErr.push(rotAngleDeg(m3.mul(m3.T(Ra), Rb), m3.mul(m3.T(a.R), b.R)));
  }

  // ---- outputs ------------------------------------------------------------------------------------
  const f = cam.focal / raw.scale;
  const cx = cam.cx / raw.scale, cy = cam.cy / raw.scale;
  const { fullW, fullH } = raw;
  const outFrames = reg.map((r) => {
    const R = m3.mul(Rl, r.R), c = xf(m3.vec(Rl, r.c));
    const m = [R[0], R[3], R[6], 0, R[1], R[4], R[7], 0, R[2], R[5], R[8], 0, c[0], c[1], c[2], 1];
    return { file_path: r.frame.file, transform_matrix: rowsFromColumnMajor(m), fl_x: +f.toFixed(3), fl_y: +f.toFixed(3), cx: +cx.toFixed(3), cy: +cy.toFixed(3), w: fullW, h: fullH };
  });
  const xyz = new Float32Array(pts.length * 3), rgb = new Uint8Array(pts.length * 3);
  pts.forEach((p, i) => { const q = xf(m3.vec(Rl, p.xyz)); xyz.set(q, i * 3); rgb.set(p.color, i * 3); });
  const transforms = { fl_x: +f.toFixed(3), fl_y: +f.toFixed(3), cx: +cx.toFixed(3), cy: +cy.toFixed(3), w: fullW, h: fullH,
    ply_file_path: "points3D.ply", applied: "assembl capture pose solver (colmap-wasm 0.1.0, GLOMAP), checked against the phone's sensors, levelled with gravity, scale normalised", frames: outFrames };
  const report = {
    solver: "colmap-wasm 0.1.0 (COLMAP 4.2.1 SIFT + GLOMAP global mapper, WebAssembly; SIFT matching on WebGPU)",
    images: raw.images0, solvedAt: `${raw.solvedAt[0]} × ${raw.solvedAt[1]} px`, droppedOtherSize: raw.droppedOtherSize,
    pairs: raw.pairs, registeredBySolver: registered, rejectedByChecks: rejected, registered: reg.length,
    unregistered: raw.frames.filter((_, i) => !raw.images[i].registered).map((fr) => fr.file),
    focalPx: +f.toFixed(2), hfovDeg: +(2 * Math.atan(fullW / 2 / f) * 180 / Math.PI).toFixed(2),
    hfovHintDeg: capture?.camera?.hfovHintDeg ?? null,
    points: pts.length, meanReprojErrorPx: +(raw.points.reduce((a, p) => a + p.error, 0) / Math.max(1, raw.points.length)).toFixed(3),
    up: upSource, scale: { factor: +s.toFixed(5), basis: `median camera distance set to ${expected} m (Estimate; prepare step rescales to the known size)` },
    gyroCheck: gyro,
    gyroRelativeDeg: relErr.length ? { median: +median(relErr).toFixed(3), max: +Math.max(...relErr).toFixed(3), pairs: relErr.length } : null,
    timingsMs: raw.timings,
    logTail: raw.log.slice(-12),
  };
  return { transforms, pointsPly: writePointsPly(xyz, rgb), points: { xyz, rgb }, report };
}
