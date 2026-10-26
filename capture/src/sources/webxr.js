// assembl capture · WebXR source (Android Chrome with Google Play Services for AR / ARCore).
//
// An "immersive-ar" session with the "camera-access" feature (WebXR Raw Camera Access) gives, every
// frame: the camera image (as a WebGL texture, valid only inside the frame callback), the camera's pose
// from the phone's own motion tracking (XRView.transform, gravity-aligned "local" space, metres) and its
// projection matrix (→ intrinsics). That is what Scaniverse-style apps use for poses.

import { intrinsicsFromProjection } from "../dataset.js";
import { poseFromColumnMajor, m3, quatFromMat3, gravityInCamera } from "../geom.js";
import { toGray, sharpness } from "../keyframes.js";
import { crc32 } from "../zip.js";

/** Can this browser run an AR session at all? (Camera access is only known once a session starts.) */
export async function xrSupport() {
  if (!("xr" in navigator)) return { ar: false, reason: "No WebXR in this browser." };
  try {
    const ok = await navigator.xr.isSessionSupported("immersive-ar");
    return ok ? { ar: true, reason: null } : { ar: false, reason: "This browser has WebXR but no AR sessions (needs Android Chrome with Google Play Services for AR)." };
  } catch (e) { return { ar: false, reason: `WebXR check failed: ${e.message}` }; }
}

/**
 * Pure: everything the dataset needs from one XRView. `view` needs .transform.matrix (column-major
 * camera-to-world, OpenGL axes) and .projectionMatrix; width/height are the camera image size.
 */
export function xrFrameRecord(view, width, height) {
  const c2w = Float32Array.from(view.transform.matrix);
  const projection = Float32Array.from(view.projectionMatrix);
  const intr = intrinsicsFromProjection(projection, width, height);
  const { R, t } = poseFromColumnMajor(c2w);
  const fwd = m3.vec(R, [0, 0, -1]);
  return {
    c2w, projection, intrinsics: intr, position: t,
    pitchDeg: (Math.asin(Math.max(-1, Math.min(1, fwd[1]))) * 180) / Math.PI,
    headingDeg: (((Math.atan2(fwd[0], -fwd[2]) * 180) / Math.PI) + 360) % 360,
    forward: fwd,
    attitude: { q: quatFromMat3(R), space: "camera-gl-to-world-yup", source: "webxr" },
    gravityCam: gravityInCamera(R),
  };
}

/**
 * Least-squares point closest to all horizontal viewing rays (the subject's centre on the ground plane):
 * each camera looks at the subject, so their forward rays meet there. rays: [{ p: [x,y,z], d: [x,y,z] }].
 * Returns [x, z] or null while the rays are too parallel.
 */
export function subjectCentre(rays) {
  let a = 0, b = 0, c = 0, rx = 0, rz = 0, spreadMin = Infinity, spreadMax = -Infinity;
  for (const { p, d } of rays) {
    const n = Math.hypot(d[0], d[2]);
    if (n < 0.2) continue; // looking straight down/up: no horizontal information
    const dx = d[0] / n, dz = d[2] / n;
    const ang = Math.atan2(dz, dx);
    spreadMin = Math.min(spreadMin, ang); spreadMax = Math.max(spreadMax, ang);
    // (I − d dᵀ)
    const m00 = 1 - dx * dx, m01 = -dx * dz, m11 = 1 - dz * dz;
    a += m00; b += m01; c += m11;
    rx += m00 * p[0] + m01 * p[2]; rz += m01 * p[0] + m11 * p[2];
  }
  const det = a * c - b * b;
  if (!(spreadMax - spreadMin > 0.4) || Math.abs(det) < 1e-6) return null;
  return [(c * rx - b * rz) / det, (a * rz - b * rx) / det];
}

const VS = `#version 300 es
in vec2 p; out vec2 uv; void main(){ uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;
const FS = `#version 300 es
precision mediump float; in vec2 uv; uniform sampler2D cam; out vec4 o; void main(){ o = texture(cam, uv); }`;

export class XRCameraSource {
  constructor() { this.kind = "webxr"; this.rays = []; this.centre = null; }

  /**
   * Must be called from a tap handler. overlay: element shown over the camera (dom-overlay).
   * onFrame(info, api): called every XR frame with { t, record, analysis? }; api.grab() reads the full camera image.
   */
  async start(overlay, onFrame, { analyseEveryMs = 100, typicalCentreM = 3 } = {}) {
    const session = await navigator.xr.requestSession("immersive-ar", {
      requiredFeatures: ["camera-access", "local"],
      optionalFeatures: ["dom-overlay"],
      domOverlay: overlay ? { root: overlay } : undefined,
    });
    this.session = session;
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2", { xrCompatible: true, preserveDrawingBuffer: false });
    this.gl = gl;
    await session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl) });
    this.binding = new XRWebGLBinding(session, gl);
    this.space = await session.requestReferenceSpace("local");
    this._initGL();
    this.typicalCentreM = typicalCentreM;
    let lastAnalyse = 0;
    const loop = (t, frame) => {
      if (!this.session) return;
      session.requestAnimationFrame(loop);
      const layer = session.renderState.baseLayer;
      gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      const pose = frame.getViewerPose(this.space);
      const view = pose?.views?.[0];
      if (!view || !view.camera) { onFrame({ t, tracking: false, emulated: pose?.emulatedPosition }, null); return; }
      const cam = view.camera;
      const tex = this.binding.getCameraImage(cam);
      const record = xrFrameRecord(view, cam.width, cam.height);
      this._updateCentre(record);
      const info = { t, tracking: !pose.emulatedPosition, record, width: cam.width, height: cam.height };
      if (this.centre) {
        const dx = record.position[0] - this.centre[0], dz = record.position[2] - this.centre[1];
        info.azimuthDeg = (((Math.atan2(dz, dx) * 180) / Math.PI) + 360) % 360;
        info.distanceM = Math.hypot(dx, dz);
      } else info.azimuthDeg = record.headingDeg;
      info.pitchDeg = record.pitchDeg;
      if (t - lastAnalyse >= analyseEveryMs) {
        lastAnalyse = t;
        const aw = 320, ah = Math.max(1, Math.round((aw * cam.height) / cam.width));
        const px = this._readTexture(tex, aw, ah);
        info.gray = toGray(px, aw, ah);
        info.sharpness = sharpness(info.gray, aw, ah);
      }
      // the camera texture is only valid inside this callback, so a keyframe is read here, encoded later
      const api = { grab: () => ({ pixels: this._readTexture(tex, cam.width, cam.height), width: cam.width, height: cam.height }) };
      onFrame(info, api);
      gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);
    };
    session.requestAnimationFrame(loop);
    session.addEventListener("end", () => { this.session = null; this.onEnd?.(); });
    return session;
  }

  _updateCentre(rec) {
    const last = this.rays[this.rays.length - 1];
    if (!last || Math.hypot(rec.position[0] - last.p[0], rec.position[2] - last.p[2]) > 0.15) {
      this.rays.push({ p: rec.position, d: rec.forward });
      if (this.rays.length > 400) this.rays.shift();
      this.centre = subjectCentre(this.rays);
    }
  }

  _initGL() {
    const gl = this.gl;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    this.prog = prog;
    this.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    this.fbo = gl.createFramebuffer();
    this.fboTex = gl.createTexture();
    this.fboSize = [0, 0];
  }

  /** Draw the camera texture into an offscreen target of w×h and read it back as RGBA, top row first. */
  _readTexture(tex, w, h) {
    const gl = this.gl;
    if (this.fboSize[0] !== w || this.fboSize[1] !== h) {
      gl.bindTexture(gl.TEXTURE_2D, this.fboTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.fboTex, 0);
      this.fboSize = [w, h];
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, w, h);
    gl.useProgram(this.prog);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(gl.getUniformLocation(this.prog, "cam"), 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    const loc = gl.getAttribLocation(this.prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    const px = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    // GL rows run bottom-up
    const row = w * 4, out = new Uint8ClampedArray(px.length);
    for (let y = 0; y < h; y++) out.set(px.subarray((h - 1 - y) * row, (h - y) * row), y * row);
    return out;
  }

  /** RGBA pixels → JPEG { blob, crc } (outside the XR frame callback). */
  static async encode({ pixels, width, height }, quality = 0.9) {
    const c = new OffscreenCanvas(width, height);
    c.getContext("2d").putImageData(new ImageData(pixels, width, height), 0, 0);
    const blob = await c.convertToBlob({ type: "image/jpeg", quality });
    return { blob, crc: crc32(new Uint8Array(await blob.arrayBuffer())), width, height };
  }

  deviceInfo() { return { userAgent: navigator.userAgent, platform: navigator.userAgentData?.platform || navigator.platform || null, xr: { referenceSpace: "local", features: ["camera-access", "local", "dom-overlay"] } }; }

  async stop() { const s = this.session; this.session = null; try { await s?.end(); } catch { /* already ended */ } }
}
