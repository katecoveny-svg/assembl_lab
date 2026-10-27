// assembl capture · guided phone capture for Gaussian-splat training. Runs entirely on the device:
// nothing is uploaded; the capture is saved as one ZIP only when the person taps Save.
//
//   import { start } from "./src/capture.js";
//   const cap = await start(document.querySelector("#capture"), { preset: "walkaround" });
//   cap.on("saved", ({ blob, name, summary }) => …);
//
// Two sources:
//   · WebXR (Android Chrome + ARCore): the phone's own motion tracking gives every photo's pose and the
//     camera intrinsics, so the ZIP includes a Nerfstudio transforms.json and trains straight away.
//   · Camera + motion sensors (iPhone, iPad, other browsers): sharp photos plus each photo's rotation from
//     the gyro/compass. The ZIP is marked "poses needed"; the training page solves poses on the computer.

import { resolvePreset, BASE_PRESETS } from "./presets.js";
import { KeyframeSelector } from "./keyframes.js";
import { CoverageRing } from "./coverage-ring.js";
import { DatasetBuilder, VERSION } from "./dataset.js";
import { CameraSource, requestMotionPermission } from "./sources/camera.js";
import { XRCameraSource, xrSupport } from "./sources/webxr.js";
import { rotAngleDeg, mat3FromQuat } from "./geom.js";

export { VERSION };
export const presets = BASE_PRESETS;

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const nf = (v, d = 0) => new Intl.NumberFormat("en-NZ", { maximumFractionDigits: d, minimumFractionDigits: d }).format(v);
const mb = (b) => `${nf(b / 1e6, 1)} MB`;

/** What this device can do, in plain words. */
export async function detectDevice() {
  const ua = navigator.userAgent;
  const iOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const android = /Android/.test(ua);
  const touch = navigator.maxTouchPoints > 0 || matchMedia("(pointer: coarse)").matches;
  const xr = await xrSupport();
  const camera = !!navigator.mediaDevices?.getUserMedia;
  const motion = typeof DeviceOrientationEvent !== "undefined";
  let route, headline, detail;
  if (xr.ar && android) {
    route = "webxr";
    headline = "This phone can record its own motion tracking.";
    detail = "Android Chrome with Google Play Services for AR shares the camera's position with this page (WebXR). Each photo is saved with its pose, so the capture trains straight away on a computer.";
  } else if (iOS) {
    route = "camera";
    headline = "On iPhone and iPad, browsers can't use the phone's motion tracking.";
    detail = "Safari and other iPhone browsers have no WebXR AR, so a web page can't read where the camera is (ARKit). This page records sharp photos and the phone's tilt and turn sensors instead. The training page on a Mac or PC then works out where each photo was taken, in the browser, before training.";
  } else if (touch && camera) {
    route = "camera";
    headline = "This browser can use the camera and motion sensors, but not motion tracking.";
    detail = android ? "WebXR AR isn't available here (it needs Chrome with Google Play Services for AR). Photos and sensor rotations are recorded; poses are solved on the computer." : "Photos and sensor rotations are recorded; poses are solved on the computer.";
  } else {
    route = camera ? "camera" : "none";
    headline = camera ? "This looks like a computer." : "This browser can't open a camera.";
    detail = camera ? "Use a phone for walk-arounds. A laptop camera can capture an object you turn by hand (the least reliable mode)." : "Open this page on a phone over HTTPS.";
  }
  return { iOS, android, touch, xr, camera, motion, route, headline, detail, secure: window.isSecureContext };
}

/** Is this page inside another one, and does that page let it use the camera? (null: the browser can't say) */
function framing() {
  let framed = false; try { framed = window.top !== window.self; } catch { framed = true; }
  let camera = null; try { const fp = document.permissionsPolicy || document.featurePolicy; if (fp?.allowsFeature) camera = fp.allowsFeature("camera"); } catch { /* unknown */ }
  return { framed, camera };
}

// A small drawing for each kind of capture: walking round something large, circling an object on a table, turning an object
// in front of a still camera. Line art in currentColor, so it follows the theme.
function modeArt(p) {
  const phone = (x, y, r = 0) => `<g transform="translate(${x} ${y}) rotate(${r})"><rect x="-4" y="-6.5" width="8" height="13" rx="2" class="ac-art-solid"/><circle cx="0" cy="4" r=".9" class="ac-art-bg"/></g>`;
  if (p.objectMotion === "object-turns") return `<svg viewBox="0 0 72 52" class="ac-art">
    <ellipse cx="44" cy="40" rx="20" ry="5.5" class="ac-art-soft"/><path d="M36 39 c0-9 3-15 8-15 s8 6 8 15" class="ac-art-line"/>
    <path d="M27 31 a18 7 0 0 0 34 0" class="ac-art-dash"/><path d="m59 27.5 2.4 3.6-4.2 1" class="ac-art-line"/>
    <rect x="4" y="18" width="12" height="9" rx="2" class="ac-art-line"/><circle cx="10" cy="22.5" r="2" class="ac-art-line"/><path d="M10 27v14M5 41h10" class="ac-art-line"/></svg>`;
  if (p.mode === "object") return `<svg viewBox="0 0 72 52" class="ac-art">
    <path d="M6 41h60" class="ac-art-line"/><ellipse cx="36" cy="35" rx="23" ry="7.5" class="ac-art-dash"/>
    <path d="M30 37 c-1-6 2-10 6-10 s7 4 6 10z" class="ac-art-solid"/>${phone(57, 26, 18)}<path d="m15 31-3 3 4 1" class="ac-art-line"/></svg>`;
  return `<svg viewBox="0 0 72 52" class="ac-art">
    <ellipse cx="36" cy="27" rx="31" ry="20" class="ac-art-dash"/><rect x="18" y="19" width="36" height="16" rx="7" class="ac-art-solid"/>
    <rect x="24" y="22" width="16" height="10" rx="3" class="ac-art-bg"/>${phone(63, 37, 35)}<path d="m8 21-2.5 4 4.5.5" class="ac-art-line"/></svg>`;
}

// The plan, drawn side-on: where the phone is for each ring (low, middle, high) and which way it looks, round the subject
function planDiagram(p) {
  const turns = p.objectMotion === "object-turns", small = p.mode === "object", W = 340, H = 168, gy = 140;
  const subj = turns ? { x: 222, w: 52, h: 46 } : small ? { x: 222, w: 46, h: 34 } : { x: 220, w: 150, h: 64 };
  const sx0 = subj.x - subj.w / 2, sy0 = gy - subj.h - (small || turns ? 26 : 0), cx = subj.x, cy = sy0 + subj.h / 2;
  const level = { low: gy - 22, middle: gy - 62, high: gy - 112 };
  const parts = [];
  parts.push(`<path d="M10 ${gy}H${W - 10}" class="ac-art-line"/>`);
  if (small || turns) parts.push(`<path d="M${cx - 64} ${gy - 26}h128M${cx - 54} ${gy - 26}v26M${cx + 54} ${gy - 26}v26" class="ac-art-line"/>`); // the table
  parts.push(`<ellipse cx="${cx}" cy="${(small || turns) ? gy - 27 : gy - 1}" rx="${subj.w / 2 + (turns ? 12 : 44)}" ry="${turns ? 4 : 9}" class="ac-art-dash"/>`);
  if (turns) parts.push(`<path d="M${cx - 30} ${gy - 34} a30 8 0 0 0 60 0" class="ac-art-line"/><path d="m${cx + 27} ${gy - 39} 3 5-5 1" class="ac-art-line"/>`);
  parts.push(small || turns ? `<path d="M${sx0} ${gy - 26} c0-${subj.h * 0.9} ${subj.w * 0.18}-${subj.h} ${subj.w / 2}-${subj.h} s${subj.w / 2} ${subj.h * 0.1} ${subj.w / 2} ${subj.h}z" class="ac-art-solid"/>`
    : `<rect x="${sx0}" y="${sy0}" width="${subj.w}" height="${subj.h}" rx="22" class="ac-art-solid"/><rect x="${sx0 + 34}" y="${sy0 + 9}" width="${subj.w * 0.42}" height="${subj.h * 0.34}" rx="8" class="ac-art-bg"/>`);
  p.rings.forEach((r, i) => {
    const pitch = r.pitch ? (r.pitch[0] + r.pitch[1]) / 2 : turns && i ? -24 : -6, a = (pitch * Math.PI) / 180;
    // a large subject: the phone at knee, chest or overhead height, looking along its tilt; a small one: the phone set back along
    // its line of sight to the object, so each ring's tilt is what puts the object in view
    let x, y;
    if (small && !turns) { x = cx - 104 * Math.cos(a); y = cy + 104 * Math.sin(a); }
    else { y = turns ? (i === 0 ? gy - 62 : gy - 100) : level[r.id] ?? level.middle; x = turns ? 40 : 46 + i * 6; }
    const tx = small && !turns ? cx - 10 * Math.cos(a) : Math.min(x + 150 * Math.cos(a), cx - 6), ty = small && !turns ? cy + 10 * Math.sin(a) : y + (tx - x) * Math.tan(-a);
    parts.push(`<path d="M${(x + 8 * Math.cos(a)).toFixed(1)} ${(y - 8 * Math.sin(a)).toFixed(1)}L${tx.toFixed(1)} ${ty.toFixed(1)}" class="ac-art-sight"/>`);
    parts.push(`<g transform="translate(${x} ${y}) rotate(${(-pitch).toFixed(1)})"><rect x="-3.5" y="-9" width="7" height="18" rx="2" class="ac-art-solid"/></g>`);
    parts.push(`<g class="ac-art-num"><circle cx="${x - 20}" cy="${y}" r="9"/><text x="${x - 20}" y="${y + 3.6}" text-anchor="middle">${i + 1}</text></g>`);
  });
  return `<svg viewBox="0 0 ${W} ${H}" class="ac-plan-svg" role="img" aria-label="Where to hold the phone for each ring">${parts.join("")}</svg>`;
}

class Emitter {
  constructor() { this.l = {}; }
  on(t, f) { (this.l[t] ||= []).push(f); return () => this.off(t, f); }
  off(t, f) { this.l[t] = (this.l[t] || []).filter((x) => x !== f); }
  emit(t, d) { (this.l[t] || []).forEach((f) => { try { f(d); } catch (e) { console.warn(e); } }); }
}

export async function start(el, opts = {}) {
  if (typeof el === "string") el = document.querySelector(el);
  if (!el) throw new Error("capture.start: no element");
  const ctl = new CaptureController(el, opts);
  await ctl.init();
  return ctl;
}

class CaptureController extends Emitter {
  constructor(el, opts) {
    super();
    this.el = el;
    this.opts = { preset: "walkaround", presets: {}, subject: {}, choosePreset: true, ...opts };
    this.state = "setup";
  }

  async init() {
    this.device = await detectDevice();
    this.presetId = this.opts.mode && !this.opts.preset ? this.opts.mode : this.opts.preset;
    this.preset = resolvePreset(this.presetId, this.opts.presets);
    this.render();
  }

  get presetList() {
    const all = { ...BASE_PRESETS, ...this.opts.presets };
    const ids = this.opts.presetIds || Object.keys(all).filter((k) => !all[k].hidden);
    return ids.map((id) => resolvePreset(id, this.opts.presets));
  }

  render() {
    const d = this.device, p = this.preset, s = this.opts.subject || {};
    const sf = p.sizeField;
    const sizeVal = s[sf.key] != null ? +(s[sf.key] / (sf.factor || 1)).toFixed(4) : "";
    const fr = framing();
    this.el.classList.add("ac");
    this.el.innerHTML = `
      <section class="ac-setup" aria-labelledby="ac-title">
        <header class="ac-head">
          <p class="ac-kicker">assembl capture</p>
          <h1 id="ac-title" class="ac-title">${esc(this.opts.title || "Make a 3D capture")}</h1>
          <p class="ac-lead">${esc(this.opts.lead || "A guided walk round with your phone. The photos stay on this device until you save them.")}</p>
        </header>
        <div class="ac-slot"></div>
        ${this.opts.choosePreset ? `<fieldset class="ac-presets"><legend class="ac-label">What are you capturing?</legend>
          ${this.presetList.map((x) => `<label class="ac-preset"><input type="radio" name="ac-preset" value="${esc(x.id)}" ${x.id === p.id ? "checked" : ""}>
            <span class="ac-preset-art" aria-hidden="true">${modeArt(x)}</span><span class="ac-preset-name">${esc(x.label)}</span><span class="ac-preset-eg">${esc(x.example || "")}</span></label>`).join("")}
        </fieldset>` : ""}
        <div class="ac-plan">
          <p class="ac-label">The plan</p>
          <figure class="ac-diagram">${planDiagram(p)}<figcaption class="ac-visually-hidden">${esc(p.rings.map((r, i) => `${i + 1}: ${r.label}`).join("; "))}</figcaption></figure>
          <ol class="ac-rings">${p.rings.map((r) => `<li><strong>${esc(r.label)}.</strong> ${esc(r.hint)}</li>`).join("")}</ol>
          ${p.distance?.hint ? `<p class="ac-note">${esc(p.distance.hint)}</p>` : ""}
          <ul class="ac-tips">${(p.tips || []).map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
          ${p.caution ? `<p class="ac-caution">${esc(p.caution)}</p>` : ""}
        </div>
        <div class="ac-subject">
          <label class="ac-field"><span class="ac-label">Name <span class="ac-opt">optional</span></span>
            <input class="ac-input" name="label" type="text" autocomplete="off" maxlength="80" value="${esc(s.label || "")}" placeholder="${esc(p.subjectNoun === "object" ? "e.g. Basalt sample" : "e.g. Blue hatchback")}"></label>
          <label class="ac-field"><span class="ac-label">${esc(sf.label)} <span class="ac-opt">${esc(sf.unit)} · optional, sets the real scale</span></span>
            <input class="ac-input" name="size" type="number" inputmode="decimal" min="0" step="${sf.step || 0.01}" value="${sizeVal}" placeholder="${esc(sf.placeholder || "")}"></label>
        </div>
        <div class="ac-device ${d.route === "webxr" ? "is-good" : ""}" role="note">
          <p class="ac-label">This device</p>
          <p class="ac-device-head">${esc(d.headline)}</p>
          <p class="ac-device-body">${esc(d.detail)}</p>
          <ul class="ac-facts">
            <li><span>Poses</span> ${d.route === "webxr" ? "recorded live (WebXR)" : "solved later on the computer"}</li>
            <li><span>Camera</span> ${d.camera ? (fr.camera === false ? "blocked by the page around this one" : "available") : "not available"}${d.secure ? "" : " · needs HTTPS"}</li>
            <li><span>Motion sensors</span> ${d.motion ? (d.iOS ? "asked for when you start" : "available") : "not available"}</li>
          </ul>
        </div>
        <div class="ac-actions">
          ${fr.framed && fr.camera === false
            ? `<a class="ac-btn ac-btn-primary" href="${esc(location.href)}" target="_blank" rel="noopener">Open capture on its own page ↗</a>
               <p class="ac-framed">This page is shown inside another page that doesn't allow the camera. Open it on its own to start.</p>`
            : `<button class="ac-btn ac-btn-primary" type="button" data-act="start" ${d.camera ? "" : "disabled"}>Start capture</button>
               ${fr.framed ? `<p class="ac-framed">Shown inside another page? If the camera doesn't start, <a href="${esc(location.href)}" target="_blank" rel="noopener">open capture on its own page ↗</a>.</p>` : ""}`}
          <p class="ac-privacy">Nothing is uploaded. Photos are kept in this browser until you save the capture as a file.</p>
          <p class="ac-error" role="alert" hidden></p>
        </div>
      </section>
      <section class="ac-stage" hidden aria-label="Capturing">
        <video class="ac-video" playsinline muted></video>
        <div class="ac-hud">
          <div class="ac-hud-top">
            <span class="ac-chip ac-ringname"></span>
            <span class="ac-chip ac-count">0 photos</span>
          </div>
          <p class="ac-prompt" aria-live="polite"></p>
          <div class="ac-hud-bottom">
            <div class="ac-ringbox"></div>
            <div class="ac-hud-buttons">
              <button class="ac-btn ac-btn-ghost" type="button" data-act="cancel">Cancel</button>
              <button class="ac-btn" type="button" data-act="next">Next ring</button>
              <button class="ac-btn ac-btn-primary" type="button" data-act="finish">Finish</button>
            </div>
          </div>
        </div>
      </section>
      <section class="ac-review" hidden aria-labelledby="ac-review-title">
        <header class="ac-head"><p class="ac-kicker">assembl capture</p><h2 id="ac-review-title" class="ac-title">Capture ready to save</h2></header>
        <dl class="ac-summary"></dl>
        <div class="ac-thumbs" aria-label="Photos in this capture"></div>
        <div class="ac-actions">
          <button class="ac-btn ac-btn-primary" type="button" data-act="save">Save capture (.zip)</button>
          <button class="ac-btn" type="button" data-act="share" hidden>Share…</button>
          <button class="ac-btn ac-btn-ghost" type="button" data-act="again">Start again</button>
        </div>
        <p class="ac-next"></p>
        <p class="ac-privacy">Nothing has left this device. Saving writes one file to this phone; Share hands it to an app you choose (for example AirDrop to a Mac).</p>
      </section>`;
    if (this.opts.afterHead instanceof Element) this.el.querySelector(".ac-slot").appendChild(this.opts.afterHead); // a host's own block, under the title
    this.$ = (q) => this.el.querySelector(q);
    this.el.querySelectorAll("input[name=ac-preset]").forEach((r) => r.addEventListener("change", () => {
      this.preset = resolvePreset(r.value, this.opts.presets); this.presetId = r.value;
      const keep = { label: this.$("input[name=label]").value };
      this.opts.subject = { ...this.opts.subject, ...keep }; this.render();
    }));
    this.el.addEventListener("click", (e) => {
      const b = e.target.closest("[data-act]");
      if (!b || !this.el.contains(b)) return;
      ({ start: () => this.begin(), cancel: () => this.cancel(), next: () => this.nextRing(), finish: () => this.finish(),
        save: () => this.save(), share: () => this.share(), again: () => this.reset() })[b.dataset.act]?.();
    });
    this.setState("setup");
  }

  setState(s) {
    this.state = s;
    this.el.dataset.state = s;
    this.$(".ac-setup").hidden = s !== "setup";
    this.$(".ac-stage").hidden = s !== "capturing";
    this.$(".ac-review").hidden = s !== "review";
    this.emit("state", s);
  }

  showError(msg) { const e = this.$(".ac-error"); e.textContent = msg; e.hidden = !msg; }

  readSubject() {
    const p = this.preset, sf = p.sizeField;
    const label = this.$("input[name=label]")?.value.trim() || this.opts.subject?.label || null;
    const raw = parseFloat(this.$("input[name=size]")?.value);
    const subject = { ...this.opts.subject, label };
    if (Number.isFinite(raw) && raw > 0) subject[sf.key] = +(raw * (sf.factor || 1)).toFixed(5);
    return subject;
  }

  /** Tap handler: permissions must be requested here, inside the gesture (iOS). */
  async begin() {
    this.showError("");
    const p = this.preset;
    this.subject = this.readSubject();
    const useXR = this.device.route === "webxr" && p.objectMotion === "camera-moves" && this.opts.source !== "camera";
    this.selector = new KeyframeSelector({ ...p, maxFrames: this.opts.maxFrames || p.maxFrames });
    this.bytes = 0;
    this.thumbs = [];
    this.pending = 0;
    this.notes = [];
    try {
      if (useXR) {
        try { await this.startXR(); }
        catch (e) {
          this.notes.push(`WebXR session failed (${e.message}); fell back to camera and motion sensors.`);
          await this.startCamera();
        }
      } else await this.startCamera();
    } catch (e) {
      this.showError(e.name === "NotAllowedError" ? "Camera access was refused. Allow the camera for this site in the browser settings, then try again." : `Couldn't start the camera: ${e.message}`);
      this.setState("setup");
      return;
    }
    try { this.wake = await navigator.wakeLock?.request("screen"); } catch { /* optional */ }
    this.updateHud({ prompt: p.rings[0].hint });
  }

  newBuilder(poseSource) {
    const p = this.preset;
    this.builder = new DatasetBuilder({
      preset: this.presetId, presetLabel: p.label, mode: p.mode, objectMotion: p.objectMotion, prepareMode: p.prepareMode,
      subject: this.subject, poseSource, hfovHintDeg: poseSource === "webxr" ? null : 65,
      hfovHintSource: poseSource === "webxr" ? null : "Estimate: typical phone 1× camera (26 mm-equivalent); the pose solver estimates the real focal length",
    });
  }

  async startCamera() {
    const perm = await requestMotionPermission();
    this.permissions = perm;
    this.source = new CameraSource();
    this.setState("capturing");
    await this.source.start(this.$(".ac-video"), { facingMode: this.preset.objectMotion === "object-turns" && !this.device.touch ? "user" : "environment" });
    this.newBuilder("none");
    if (!String(perm.orientation).startsWith("granted")) this.notes.push(`Motion sensors: ${perm.orientation}. Coverage is estimated from time and image change.`);
    this.ring = new CoverageRing(this.$(".ac-ringbox"), this.preset.rings);
    const tick = async () => {
      if (this.state !== "capturing" || this.source?.kind !== "camera") return;
      const a = this.source.analyse();
      if (a) this.onAnalysis(a, null);
      this.timer = setTimeout(tick, 100);
    };
    tick();
  }

  async startXR() {
    this.source = new XRCameraSource();
    const overlay = this.$(".ac-stage");
    this.setState("capturing");
    this.$(".ac-video").hidden = true;
    this.newBuilder("webxr");
    this.ring = new CoverageRing(this.$(".ac-ringbox"), this.preset.rings);
    let prev = null;
    this.source.onEnd = () => { if (this.state === "capturing") this.finish(); };
    await this.source.start(overlay, (info, api) => {
      if (!info.record) { this.updateHud({ prompt: "Looking for the floor: move the phone slowly from side to side.", level: "warn" }); return; }
      if (prev) {
        const dt = (info.t - prev.t) / 1000;
        if (dt > 0) info.rotRateDeg = rotAngleDeg(mat3FromQuat(prev.q), mat3FromQuat(info.record.attitude.q)) / dt;
      }
      prev = { t: info.t, q: info.record.attitude.q };
      if (info.sharpness == null) return;
      this.onAnalysis(info, api);
    }, { typicalCentreM: (this.preset.distance?.typicalM || 2) * 1.5 });
  }

  onAnalysis(a, xrApi) {
    const sel = this.selector, p = this.preset;
    // with sensor permission, wait (up to 1.5 s) for the first reading so every photo carries its rotation
    if (this.source?.kind === "camera" && !this.source.hasAttitude && String(this.permissions?.orientation).startsWith("granted")) {
      this._sensorWait ??= a.t;
      if (a.t - this._sensorWait < 1500) { this.updateHud({ prompt: "Waiting for the motion sensors…" }); return; }
    }
    const dec = sel.consider({ t: a.t, azimuthDeg: a.azimuthDeg, pitchDeg: a.pitchDeg, rotRateDeg: a.rotRateDeg, sharpness: a.sharpness,
      gray: a.gray, distanceM: a.distanceM ?? null, sizeMismatch: a.sizeMismatch });
    const azimuth = p.objectMotion === "object-turns" ? null : a.azimuthDeg;
    if (dec.take && this.pending < 3) {
      const meta = { t: a.t, ring: sel.ring, azimuthDeg: a.azimuthDeg, elevationDeg: a.pitchDeg, sharpness: a.sharpness,
        attitude: a.attitude || a.record?.attitude || null, gravityCam: a.gravityCam || a.record?.gravityCam || null,
        rotationRate: a.rotRateDeg != null ? [a.rotRateDeg] : null };
      this.pending++;
      const job = xrApi
        ? XRCameraSource.encode(xrApi.grab()).then((j) => ({ ...j, c2w: a.record.c2w, projection: a.record.projection }))
        : this.source.grab();
      job.then((j) => {
        this.builder.addFrame({ jpegBlob: j.blob, crc: j.crc, width: j.width, height: j.height, c2w: j.c2w, projection: j.projection, ...meta });
        this.bytes += j.blob.size;
        if (this.thumbs.length < 24 && this.builder.frames.length % 3 === 1) this.thumbs.push(URL.createObjectURL(j.blob));
        this.emit("frame", { index: this.builder.frames.length, ring: meta.ring, bytes: this.bytes });
      }).catch((e) => this.notes.push(`A photo failed to save: ${e.message}`)).finally(() => { this.pending--; this.updateHud({}); });
    }
    this.updateHud({ prompt: dec.prompt, level: dec.level, azimuth, took: dec.take });
  }

  updateHud({ prompt, level = "ok", azimuth, took } = {}) {
    if (this.state !== "capturing") return;
    const p = this.preset, sel = this.selector, r = p.rings[sel.ring];
    this.$(".ac-ringname").textContent = `${r.label} · ring ${sel.ring + 1} of ${p.rings.length}`;
    const n = this.builder?.frames.length || 0;
    this.$(".ac-count").textContent = `${n} photo${n === 1 ? "" : "s"} · ${mb(this.bytes || 0)}`;
    const pr = this.$(".ac-prompt");
    if (prompt !== undefined) {
      const text = prompt || (took ? "Good. Keep going slowly." : this._lastOk || r.hint);
      if (!prompt && took) this._lastOk = "Good. Keep going slowly.";
      pr.textContent = text;
      pr.dataset.level = prompt ? level : "ok";
    }
    if (this.ring) this.ring.update({ cover: sel.cover, current: sel.ring, azimuthDeg: azimuth ?? null, estimated: p.objectMotion === "object-turns" || this.builder?.meta.poseSource === "none" });
    const next = this.$("[data-act=next]");
    next.hidden = sel.ring >= p.rings.length - 1;
  }

  nextRing() {
    const sel = this.selector, p = this.preset;
    if (sel.ring >= p.rings.length - 1) return;
    sel.setRing(sel.ring + 1);
    this._lastOk = null;
    this.updateHud({ prompt: p.rings[sel.ring].hint });
  }

  async stopSource() {
    clearTimeout(this.timer);
    try { await this.source?.stop(); } catch { /* ended */ }
    try { await this.wake?.release(); } catch { /* none */ }
    this.wake = null;
  }

  async cancel() {
    if (this.builder?.frames.length && !confirm(`Discard ${this.builder.frames.length} photos?`)) return;
    await this.stopSource();
    this.reset();
  }

  async finish() {
    if (this.state !== "capturing") return;
    const info = this.source?.deviceInfo?.() || {};
    await this.stopSource();
    while (this.pending > 0) await new Promise((r) => setTimeout(r, 50));
    const sel = this.selector, b = this.builder;
    b.meta.device = { ...info, permissions: this.permissions || null };
    b.meta.coverage = sel.summary();
    b.meta.notes = this.notes;
    this.setState("review");
    const sum = sel.summary();
    const hasPoses = b.hasPoses;
    const rows = [
      ["Photos", `${b.frames.length} (${sum.perRing.map((n, i) => `${this.preset.rings[i].label.toLowerCase()} ${n}`).join(", ")})`],
      ["Coverage", sum.coverage.map((c, i) => `${this.preset.rings[i].label.toLowerCase()} ${nf(c * 100)}%`).join(" · ") + (this.preset.objectMotion === "object-turns" || !this.source?.hasAttitude && !hasPoses ? " (estimated)" : "")],
      ["Poses", hasPoses ? "Included: recorded by the phone's motion tracking (WebXR)" : "Needed: the training page solves them from the photos"],
      ["Camera", b.frames[0] ? `${b.frames[0].width} × ${b.frames[0].height} px` : "—"],
      ["Size", mb(this.bytes)],
    ];
    if (this.subject[this.preset.sizeField.key]) rows.push([this.preset.sizeField.label, `${nf(this.subject[this.preset.sizeField.key] / (this.preset.sizeField.factor || 1), 3)} ${this.preset.sizeField.unit}`]);
    this.$(".ac-summary").innerHTML = rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("") +
      (this.notes.length ? `<div class="ac-notes"><dt>Notes</dt><dd>${this.notes.map(esc).join("<br>")}</dd></div>` : "");
    this.$(".ac-thumbs").innerHTML = this.thumbs.map((u) => `<img src="${u}" alt="" loading="lazy">`).join("");
    this.$(".ac-next").textContent = b.frames.length < 20
      ? "That's fewer than 20 photos: training needs more overlap. Start again and walk the rings more slowly."
      : "Next: on a Mac or PC with Chrome or Edge, open the assembl capture training page and load this file.";
    const canShare = !!navigator.canShare && navigator.canShare({ files: [new File([new Uint8Array(1)], "t.zip", { type: "application/zip" })] });
    this.$("[data-act=share]").hidden = !canShare;
    this.emit("finished", { frames: b.frames.length, summary: sum });
  }

  fileName() {
    const d = new Date(), z = (n) => String(n).padStart(2, "0");
    const slug = (this.subject?.label || this.presetId).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "capture";
    return `${slug}-${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}.zip`;
  }

  toBlob() { return this.builder.toZip().toBlob(); }

  save() {
    const blob = this.toBlob(), name = this.fileName();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    this.emit("saved", { blob, name, summary: this.selector.summary() });
    this.opts.onSave?.(blob, name);
  }

  async share() {
    const blob = this.toBlob(), name = this.fileName();
    try { await navigator.share({ files: [new File([blob], name, { type: "application/zip" })], title: name }); this.emit("shared", { name }); }
    catch (e) { if (e.name !== "AbortError") this.showError(`Share failed: ${e.message}`); }
  }

  reset() {
    this.thumbs?.forEach((u) => URL.revokeObjectURL(u));
    this.builder = null; this.selector = null; this.source = null; this.ring = null;
    this.render();
  }

  /** For hosts and tests: the dataset as built so far. */
  getDataset() { return this.builder; }
  async stop() { await this.stopSource(); }
}

export const capture = { start, presets: BASE_PRESETS, detectDevice, version: VERSION };
export default capture;
