// assembl capture · camera + motion-sensor source (iPhone, iPad, Android without ARCore, laptops).
//
// Browsers on iPhone and iPad cannot share the phone's own motion tracking (ARKit) with a web page:
// Safari has no WebXR AR. What a page *can* read is the camera (getUserMedia) and the motion sensors
// (DeviceOrientation / DeviceMotion, after the person allows it). Those give each photo's rotation
// (tilt and turn), not its position, so poses are solved later on the computer from the photos, with
// these rotations as priors.

import { cameraRotationFromDeviceOrientation, gravityInCamera, quatFromMat3, m3 } from "../geom.js";
import { toGray, sharpness } from "../keyframes.js";
import { crc32 } from "../zip.js";

const wrap = (a) => ((a % 360) + 360) % 360;

/** Ask for motion-sensor access. iOS 13+ needs this inside a tap handler; elsewhere it is a no-op. */
export async function requestMotionPermission() {
  const out = { orientation: "unsupported", motion: "unsupported" };
  try {
    if (typeof DeviceOrientationEvent !== "undefined") {
      out.orientation = typeof DeviceOrientationEvent.requestPermission === "function" ? await DeviceOrientationEvent.requestPermission() : "granted";
    }
  } catch (e) { out.orientation = `denied (${e.message || e})`; }
  try {
    if (typeof DeviceMotionEvent !== "undefined") {
      out.motion = typeof DeviceMotionEvent.requestPermission === "function" ? await DeviceMotionEvent.requestPermission() : "granted";
    }
  } catch (e) { out.motion = `denied (${e.message || e})`; }
  return out;
}

function screenAngle() {
  if (screen.orientation && typeof screen.orientation.angle === "number") return screen.orientation.angle;
  if (typeof window.orientation === "number") return (window.orientation + 360) % 360;
  return 0;
}

export class CameraSource {
  constructor() {
    this.kind = "camera";
    this.att = null;         // latest {alpha, beta, gamma}
    this.rate = null;        // deg/s magnitude
    this.sensorEvents = 0;
    this.heading0 = null;
    this.size0 = null;
    this._onOri = (e) => { if (e.alpha == null && e.beta == null) return; this.att = { alpha: e.alpha || 0, beta: e.beta || 0, gamma: e.gamma || 0, compass: e.webkitCompassHeading ?? null }; this.sensorEvents++; };
    this._onMot = (e) => { const r = e.rotationRate; if (r && (r.alpha != null || r.beta != null)) this.rate = Math.hypot(r.alpha || 0, r.beta || 0, r.gamma || 0); };
  }

  /** video: a <video> element (shown to the person). */
  async start(video, { width = 1920, height = 1440, facingMode = "environment" } = {}) {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser can't open the camera (no getUserMedia). It needs HTTPS and a recent browser.");
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: facingMode }, width: { ideal: width }, height: { ideal: height }, frameRate: { ideal: 30 } },
    });
    video.muted = true; video.playsInline = true; video.setAttribute("playsinline", "");
    video.srcObject = this.stream;
    await video.play();
    if (!video.videoWidth) await new Promise((r) => video.addEventListener("loadedmetadata", r, { once: true }));
    this.video = video;
    const track = this.stream.getVideoTracks()[0];
    this.track = track;
    this.settings = track.getSettings ? track.getSettings() : {};
    window.addEventListener("deviceorientation", this._onOri);
    window.addEventListener("devicemotion", this._onMot);
    this.small = document.createElement("canvas");
    this.full = document.createElement("canvas");
    return this.settings;
  }

  get hasAttitude() { return !!this.att; }

  /** Analyse the current frame (small copy) and read the sensors. */
  analyse(t = performance.now()) {
    const v = this.video;
    const W = v.videoWidth, H = v.videoHeight;
    if (!W || !H) return null;
    if (!this.size0) this.size0 = [W, H];
    const aw = 320, ah = Math.max(1, Math.round((aw * H) / W));
    const c = this.small;
    if (c.width !== aw || c.height !== ah) { c.width = aw; c.height = ah; }
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(v, 0, 0, aw, ah);
    const gray = toGray(ctx.getImageData(0, 0, aw, ah).data, aw, ah);
    const out = { t, width: W, height: H, gray, sharpness: sharpness(gray, aw, ah), rotRateDeg: this.rate,
      sizeMismatch: this.size0 && (this.size0[0] !== W || this.size0[1] !== H), azimuthDeg: null, pitchDeg: null, attitude: null, gravityCam: null };
    if (this.att) {
      const R = cameraRotationFromDeviceOrientation(this.att.alpha, this.att.beta, this.att.gamma, screenAngle());
      const fwd = m3.vec(R, [0, 0, -1]);
      const heading = (Math.atan2(fwd[0], -fwd[2]) * 180) / Math.PI;
      if (this.heading0 == null) this.heading0 = heading;
      // the camera faces the subject, so its heading tracks the walker's position round it
      out.azimuthDeg = wrap(heading - this.heading0);
      out.pitchDeg = (Math.asin(Math.max(-1, Math.min(1, fwd[1]))) * 180) / Math.PI;
      out.attitude = { q: quatFromMat3(R), space: "camera-gl-to-world-yup", source: "deviceorientation" };
      out.gravityCam = gravityInCamera(R);
      out.screenAngle = screenAngle();
    }
    return out;
  }

  /** Full-resolution JPEG of the current frame: { blob, crc, width, height }. */
  async grab(quality = 0.9) {
    const v = this.video, c = this.full;
    if (c.width !== v.videoWidth || c.height !== v.videoHeight) { c.width = v.videoWidth; c.height = v.videoHeight; }
    c.getContext("2d").drawImage(v, 0, 0);
    const blob = await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("JPEG encode failed"))), "image/jpeg", quality));
    const crc = crc32(new Uint8Array(await blob.arrayBuffer()));
    return { blob, crc, width: c.width, height: c.height };
  }

  deviceInfo() {
    return { userAgent: navigator.userAgent, platform: navigator.userAgentData?.platform || navigator.platform || null,
      track: this.settings ? { width: this.settings.width, height: this.settings.height, frameRate: this.settings.frameRate, facingMode: this.settings.facingMode || null, zoom: this.settings.zoom ?? null } : null,
      sensors: { orientationEvents: this.sensorEvents, compass: this.att?.compass != null } };
  }

  stop() {
    window.removeEventListener("deviceorientation", this._onOri);
    window.removeEventListener("devicemotion", this._onMot);
    this.stream?.getTracks().forEach((t) => t.stop());
    if (this.video) this.video.srcObject = null;
  }
}
