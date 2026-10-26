// assembl capture · dataset writer.
//
// A capture is one ZIP:
//   capture.json        assembl metadata: schema "assembl.capture/1", preset, mode, device, per-frame sensor priors
//   transforms.json     Nerfstudio format (camera-to-world, OpenGL axes, pinhole intrinsics per frame).
//                       Present only when poses exist (WebXR on Android, or after the desktop pose solver).
//   images/frame_00001.jpg …
//   points3D.ply        optional sparse points (written by the pose solver; Brush starts from them)
//
// Conventions (the same as Nerfstudio and Brush):
//   transform_matrix    4×4 camera-to-world, row-major nested arrays, camera looks down -Z, +Y up, +X right.
//   fl_x, fl_y, cx, cy  pixels, origin at the top-left of the image, x right, y down.
//   world               gravity-aligned where the source allows: +Y up (WebXR "local" space is gravity-aligned).

import { ZipWriter } from "./zip.js";

export const SCHEMA = "assembl.capture/1";
export const VERSION = "0.1.0";

/**
 * Pinhole intrinsics (pixels, top-left origin) from a WebGL-style projection matrix (column-major
 * Float32Array(16), as XRView.projectionMatrix) for an image of width × height that the view covers.
 *
 *   x_ndc = P0·x/(-z) + P4·y/(-z) − P8,   y_ndc = P5·y/(-z) − P9          (camera looks down −Z)
 *   u = (x_ndc + 1)/2 · W,                 v = (1 − y_ndc)/2 · H            (v grows downwards)
 *   ⇒ fx = P0·W/2,  fy = P5·H/2,  cx = (1 − P8)·W/2,  cy = (1 + P9)·H/2,  skew = P4·W/2
 *
 * WebXR Raw Camera Access guarantees the camera image is aligned with its XRView, so the view's
 * projection matrix describes the camera image (Requires validation on each phone model).
 */
export function intrinsicsFromProjection(P, width, height) {
  const fx = (P[0] * width) / 2;
  const fy = (P[5] * height) / 2;
  const cx = ((1 - P[8]) * width) / 2;
  const cy = ((1 + P[9]) * height) / 2;
  const skew = (P[4] * width) / 2;
  return { fl_x: fx, fl_y: fy, cx, cy, w: width, h: height, skew };
}

/** Inverse of the above, for tests and for drawing overlays (near/far only affect depth). */
export function projectionFromIntrinsics({ fl_x, fl_y, cx, cy, w, h }, near = 0.05, far = 100) {
  const P = new Float32Array(16);
  P[0] = (2 * fl_x) / w;
  P[5] = (2 * fl_y) / h;
  P[8] = 1 - (2 * cx) / w;
  P[9] = (2 * cy) / h - 1;
  P[10] = -(far + near) / (far - near);
  P[11] = -1;
  P[14] = (-2 * far * near) / (far - near);
  return P;
}

export const fovToFocal = (fovRad, px) => px / 2 / Math.tan(fovRad / 2);
export const focalToFov = (f, px) => 2 * Math.atan(px / 2 / f);

/** Column-major 4×4 (WebGL / XRRigidTransform.matrix) → row-major nested arrays (Nerfstudio). */
export function rowsFromColumnMajor(m) {
  const r = [];
  for (let i = 0; i < 4; i++) r.push([m[i], m[4 + i], m[8 + i], m[12 + i]].map((v) => +(+v).toFixed(7)));
  return r;
}

export function columnMajorFromRows(rows) {
  const m = new Float64Array(16);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) m[j * 4 + i] = rows[i][j];
  return m;
}

const pad = (n, w = 5) => String(n).padStart(w, "0");

/**
 * Collects frames and writes the dataset ZIP.
 *
 *   const ds = new DatasetBuilder({ preset, mode, subject, device, poseSource });
 *   ds.addFrame({ jpeg, width, height, c2w, projection, attitude, ... });
 *   const blob = ds.toZip().toBlob();
 */
export class DatasetBuilder {
  constructor(meta = {}) {
    this.meta = {
      preset: "generic",
      mode: "walkaround",          // walkaround | object
      objectMotion: "camera-moves", // camera-moves | object-turns
      subject: {},
      device: {},
      poseSource: "none",          // webxr | solved | synthetic | none
      ...meta,
    };
    this.frames = [];
    this.createdAt = new Date();
  }

  /**
   * frame: {
   *   jpeg: Uint8Array, width, height,          (or jpegBlob: Blob + crc: CRC-32 of its bytes, see zip.js)
   *   c2w?: Float32Array(16) column-major camera-to-world (OpenGL axes)  — WebXR view.transform.matrix
   *   projection?: Float32Array(16)                                          — WebXR view.projectionMatrix
   *   intrinsics?: { fl_x, fl_y, cx, cy }                                    — if known some other way
   *   t?: ms, ring?, azimuthDeg?, elevationDeg?, sharpness?,
   *   attitude?: { q: [x,y,z,w], space }, gravityCam?: [x,y,z], rotationRate?: [α,β,γ] deg/s
   * }
   */
  addFrame(f) {
    const index = this.frames.length + 1;
    const file = `images/frame_${pad(index)}.jpg`;
    let intr = f.intrinsics ? { ...f.intrinsics, w: f.width, h: f.height } : null;
    if (!intr && f.projection) intr = intrinsicsFromProjection(f.projection, f.width, f.height);
    this.frames.push({ ...f, index, file, intrinsics: intr });
    return index;
  }

  get hasPoses() { return this.frames.length > 0 && this.frames.every((f) => f.c2w); }
  get byteLength() { return this.frames.reduce((s, f) => s + (f.jpeg?.length || f.jpegBlob?.size || 0), 0); }

  /** Nerfstudio transforms.json, or null when any frame lacks a pose. */
  transforms() {
    if (!this.hasPoses) return null;
    const first = this.frames[0];
    const top = first.intrinsics || {};
    const out = {
      fl_x: round(top.fl_x), fl_y: round(top.fl_y), cx: round(top.cx), cy: round(top.cy),
      w: first.width, h: first.height,
      frames: this.frames.map((f) => {
        const k = f.intrinsics || top;
        const fr = { file_path: f.file, transform_matrix: rowsFromColumnMajor(f.c2w) };
        // per-frame intrinsics: phone cameras refocus and WebXR crops can change between frames
        Object.assign(fr, { fl_x: round(k.fl_x), fl_y: round(k.fl_y), cx: round(k.cx), cy: round(k.cy), w: f.width, h: f.height });
        return fr;
      }),
    };
    if (this.meta.pointsFile) out.ply_file_path = this.meta.pointsFile;
    return out;
  }

  captureJson() {
    const m = this.meta;
    return {
      schema: SCHEMA,
      generator: `assembl capture ${VERSION}`,
      createdAt: this.createdAt.toISOString(),
      preset: m.preset,
      presetLabel: m.presetLabel || null,
      mode: m.mode,
      objectMotion: m.objectMotion,
      prepareMode: m.prepareMode || (m.mode === "object" ? "object" : "exterior"),
      subject: m.subject,
      device: m.device,
      poseSource: m.poseSource,
      poses: this.hasPoses ? "included" : "needed",
      posesNote: this.hasPoses ? null :
        "No camera poses in this capture. The desktop training page solves them from the images, using the motion-sensor rotations below as priors.",
      camera: {
        width: this.frames[0]?.width ?? null,
        height: this.frames[0]?.height ?? null,
        intrinsicsSource: this.frames[0]?.intrinsics ? (this.frames[0].projection ? "webxr-projection" : (m.intrinsicsSource || "given")) : "unknown",
        hfovHintDeg: m.hfovHintDeg ?? null,
        hfovHintSource: m.hfovHintSource ?? null,
      },
      coverage: m.coverage || null,
      frames: this.frames.map((f) => ({
        file: f.file,
        t: f.t != null ? Math.round(f.t) : null,
        ring: f.ring ?? null,
        azimuthDeg: f.azimuthDeg != null ? round(f.azimuthDeg, 2) : null,
        elevationDeg: f.elevationDeg != null ? round(f.elevationDeg, 2) : null,
        sharpness: f.sharpness != null ? round(f.sharpness, 2) : null,
        width: f.width, height: f.height,
        attitude: f.attitude ? { q: f.attitude.q.map((v) => round(v, 7)), space: f.attitude.space || "camera-gl-to-world-yup", source: f.attitude.source || null } : null,
        gravityCam: f.gravityCam ? f.gravityCam.map((v) => round(v, 5)) : null,
        rotationRate: f.rotationRate ? f.rotationRate.map((v) => round(v, 3)) : null,
      })),
      notes: m.notes || [],
    };
  }

  /** Returns a ZipWriter; call .toBlob() in a browser or .toUint8Array() in Node. */
  toZip(extra = {}) {
    const zip = new ZipWriter();
    zip.add("capture.json", JSON.stringify(this.captureJson(), null, 1));
    const tr = this.transforms();
    if (tr) zip.add("transforms.json", JSON.stringify(tr, null, 1));
    for (const [name, data] of Object.entries(extra)) zip.add(name, data);
    for (const f of this.frames) zip.add(f.file, f.jpegBlob ? { blob: f.jpegBlob, crc: f.crc, size: f.jpegBlob.size } : f.jpeg);
    return zip;
  }
}

function round(v, d = 4) { return v == null || Number.isNaN(v) ? null : +(+v).toFixed(d); }
