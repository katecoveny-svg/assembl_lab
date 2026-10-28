/*
 * assembl · splat-car viewer · v1.0.0
 *
 * Gaussian-splat 3D walkthrough for new-car listings.
 *   import { mount } from "./viewer.js";
 *   const v = await mount(el, { manifest: "car.manifest.json", spec: "car.spec.json" });
 *
 * Or, once loaded as a module, window.splatCar.mount(el, opts).
 *
 * Rendering: three.js + Spark (World Labs). Both are loaded with dynamic
 * import() through bare specifiers, so the host page needs an import map:
 *   "three", "three/addons/", "@sparkjsdev/spark"
 * (see viewer/index.html). Hosts that bundle their own copies can pass
 * opts.deps = { THREE, OrbitControls, Spark } instead. The fallback (poster +
 * photos) needs neither, so it still works when WebGL2 or the CDN is missing.
 */

const VERSION = "1.0.0";
const TRUTH = ["Established", "Source-based inference", "Proposed assembl concept",
  "Commercial hypothesis", "Requires validation", "Simulated"];
const NARROW_PX = 760;
const nf = (v, d = 0) => new Intl.NumberFormat("en-NZ", { maximumFractionDigits: d, minimumFractionDigits: d }).format(v);

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const ICON = {
  tour: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="3" cy="12.5" r="1.6"/><circle cx="13" cy="3.5" r="1.6"/><path d="M4.4 11.6C8 10 5 6.5 8.5 5.2c1.2-.5 2.3-.9 3.1-1.2"/></svg>',
  inside: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M3 14V3.5L9 2v12"/><path d="M9 4h4v10H3"/><circle cx="7.3" cy="8.6" r=".6" fill="currentColor"/></svg>',
  measure: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="1.5" y="5.5" width="13" height="5" rx="1"/><path d="M4.5 5.5v2M7 5.5v3M9.5 5.5v2M12 5.5v3"/></svg>',
  reset: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M2.5 8a5.5 5.5 0 1 0 1.7-4"/><path d="M2.5 2.5v3h3"/></svg>',
  prev: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M10 3 5 8l5 5"/></svg>',
  next: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m6 3 5 5-5 5"/></svg>',
  pause: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><rect x="4" y="3" width="2.6" height="10" rx=".6"/><rect x="9.4" y="3" width="2.6" height="10" rx=".6"/></svg>',
  play: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M5 3.2v9.6L12.5 8z"/></svg>',
};

function prefersReducedMotion() {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
}

function hasWebGL2() {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2");
    if (!gl) return false;
    const lose = gl.getExtension("WEBGL_lose_context");
    if (lose) lose.loseContext();
    return true;
  } catch { return false; }
}

async function loadJSON(src, base) {
  if (!src) return [null, base];
  if (typeof src === "object") return [src, base];
  const url = new URL(src, base || document.baseURI).href;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Could not load ${url} (HTTP ${r.status})`);
  return [await r.json(), url];
}

async function fetchWithProgress(url, onProgress, signal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status} loading the 3D capture`);
  const enc = res.headers.get("content-encoding");
  const total = enc && enc !== "identity" ? 0 : Number(res.headers.get("content-length")) || 0;
  if (!res.body || !res.body.getReader) {
    const buf = new Uint8Array(await res.arrayBuffer());
    onProgress(buf.length, buf.length);
    return buf;
  }
  const reader = res.body.getReader();
  const chunks = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    onProgress(loaded, total);
  }
  const out = new Uint8Array(loaded);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  onProgress(loaded, total || loaded);
  return out;
}

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const fmtMB = (b) => `${nf(b / 1e6, 1)} MB`;

/* ------------------------------------------------------------------------ */

class SplatCarViewer {
  constructor(el, opts) {
    if (!el) throw new Error("splatCar.mount: no element");
    this.el = el;
    this.opts = { theme: "auto", autoRotate: false, interiorPreview: false, debug: false,
      forceFallback: false, prefer: ["sog", "spz"], dwellMs: 6500,
      ...Object.fromEntries(Object.entries(opts).filter(([, v]) => v !== undefined)) };
    this.state = "init";
    this.mode = "exterior"; // exterior | tour | interior | measure
    this.stats = { fps: 0, frames: 0, splats: 0, loadedBytes: 0, totalBytes: 0, loadMs: 0, renderer: "", fallbackReason: null };
    this.active = null;
    this.reduced = prefersReducedMotion();
    this._listeners = [];
    this._tween = null;
    this._raf = null;
    this.events = [];
  }

  emit(type, detail = {}) {
    this.events.push({ type, t: Math.round(performance.now()), ...detail });
    if (typeof this.opts.onEvent === "function") { try { this.opts.onEvent(type, detail); } catch { /* host error */ } }
  }

  on(target, ev, fn, o) { target.addEventListener(ev, fn, o); this._listeners.push(() => target.removeEventListener(ev, fn, o)); }

  async init() {
    const params = new URLSearchParams(location.search);
    const [manifest, manifestUrl] = await loadJSON(this.opts.manifest, document.baseURI);
    const [spec] = await loadJSON(this.opts.spec, document.baseURI);
    this.manifest = manifest || {};
    this.spec = spec || { fields: {}, hotspots: [], groups: [], sources: [] };
    this.base = manifestUrl || document.baseURI;
    this.sources = Object.fromEntries((this.spec.sources || []).map((s) => [s.id, s]));
    if (this.opts.interiorPreview === undefined || this.opts.interiorPreview === false) {
      this.opts.interiorPreview = params.get("interiorPreview") === "1";
    }
    this.buildDom();
    this.applyTheme();

    let reason = null;
    const forced = this.opts.forceFallback || params.get("fallback");
    if (forced) reason = forced === "lowmem" ? "lowmem" : "webgl";
    else if (!hasWebGL2()) reason = "webgl";
    else if (navigator.deviceMemory && navigator.deviceMemory < 2 && !this.opts.ignoreLowMemory) reason = "lowmem";

    if (reason) { this.showFallback(reason); return this; }
    try {
      await this.start3D();
    } catch (err) {
      console.warn("[splatCar] 3D view unavailable:", err);
      this.teardown3D();
      this.showFallback("error", err);
    }
    return this;
  }

  resolve(path) { return path ? new URL(path, this.base).href : null; }

  /* ------------------------------------------------------------- DOM ---- */
  buildDom() {
    const v = this.spec.vehicle || {};
    const cap = this.spec.capture || {};
    const title = this.opts.title || [v.make, v.model, v.variant].filter(Boolean).join(" ") || "3D walkthrough";
    const sub = this.opts.subtitle || v.bodyStyle || "";
    const interior = this.manifest.interior || {};
    const insideAvailable = interior.available || this.opts.interiorPreview;
    this.el.innerHTML = "";
    const root = document.createElement("section");
    root.className = "sc-root";
    root.setAttribute("aria-label", `${title}, 3D walkthrough`);
    if (this.opts.theme && this.opts.theme !== "auto") root.dataset.theme = this.opts.theme;
    if (this.opts.capture) root.classList.add("is-capture");
    const id = `sc${Math.random().toString(36).slice(2, 8)}`;
    this.uid = id;
    root.innerHTML = `
      <header class="sc-head">
        <div>
          <h2 class="sc-title">${esc(title)}</h2>
          <p class="sc-sub">${esc(sub)}</p>
        </div>
        <div class="sc-head-meta">
          ${cap.note ? `<span class="sc-chip is-quiet" title="${esc(cap.note)}">Sample capture · body style only</span>` : ""}
          ${this.manifest.scale?.basis || this.manifest.scale?.metric ? '<span class="sc-chip is-quiet sc-units">Metres · real scale</span>' : '<span class="sc-chip is-quiet sc-units">Scale not checked</span>'}
        </div>
      </header>
      <div class="sc-stage" tabindex="0" role="region" aria-roledescription="3D viewer"
           aria-label="3D view of ${esc(title)}" aria-describedby="${id}-help">
        <p id="${id}-help" class="sc-visually-hidden">Drag or use the arrow keys to orbit. Plus and minus zoom.
          Tab moves between spec points. Escape leaves the cabin, the tour or the measuring tool.</p>
        <div class="sc-overlay" aria-hidden="false">
          <svg class="sc-lines" aria-hidden="true"></svg>
          <div class="sc-pins"></div>
          <div class="sc-labels" aria-hidden="true"></div>
          <div class="sc-marks" aria-hidden="true"></div>
          <div class="sc-card" hidden role="dialog" aria-modal="false" aria-labelledby="${id}-card-h"></div>
        </div>
        <div class="sc-status" aria-live="polite"></div>
        <div class="sc-tourbar" hidden>
          <span class="sc-tour-step"></span>
          <span class="sc-tour-title"></span>
          <button type="button" class="sc-btn is-small" data-act="tour-prev" aria-label="Previous stop">${ICON.prev}</button>
          <button type="button" class="sc-btn is-small" data-act="tour-pause" aria-label="Pause tour">${ICON.pause}</button>
          <button type="button" class="sc-btn is-small" data-act="tour-next" aria-label="Next stop">${ICON.next}</button>
          <button type="button" class="sc-btn is-small" data-act="tour-end">End tour</button>
          <div class="sc-tour-progress" aria-hidden="true"><span></span></div>
        </div>
        <div class="sc-sheet" hidden role="dialog" aria-modal="false" aria-labelledby="${id}-sheet-h"></div>
        <div class="sc-loading">
          <div class="sc-loading-box">
            ${this.posterUrl() ? `<img class="sc-loading-poster" alt="" src="${esc(this.posterUrl())}">` : ""}
            <div class="sc-kicker">Loading 3D capture</div>
            <div class="sc-progress is-unknown" role="progressbar" aria-label="3D capture download" aria-valuemin="0" aria-valuemax="100"><span></span></div>
            <div class="sc-loading-line"><span class="sc-loading-phase">Connecting</span><span class="sc-loading-bytes"></span></div>
          </div>
        </div>
        <div class="sc-fallback" hidden></div>
        ${this.opts.debug ? '<div class="sc-debug"></div>' : ""}
      </div>
      <div class="sc-tools" role="toolbar" aria-label="3D tools">
        <button type="button" class="sc-btn is-primary" data-act="tour">${ICON.tour}<span>Guided tour</span></button>
        <button type="button" class="sc-btn" data-act="inside" ${insideAvailable ? "" : 'disabled aria-describedby="' + id + '-inside-why"'}>
          ${ICON.inside}<span>Step inside<span class="sc-btn-sub">${insideAvailable ? (interior.available ? "Cabin capture" : "Preview · cabin not captured") : "Interior capture needed"}</span></span>
        </button>
        <span id="${id}-inside-why" class="sc-visually-hidden">${esc(interior.reason || "This capture has no interior pass.")}</span>
        <button type="button" class="sc-btn" data-act="measure" aria-pressed="false">${ICON.measure}<span>Measure</span></button>
        <span class="sc-tools-spacer"></span>
        <button type="button" class="sc-btn" data-act="reset">${ICON.reset}<span>Reset view</span></button>
      </div>
      <aside class="sc-panel" aria-label="Specifications"></aside>
    `;
    this.el.appendChild(root);
    this.root = root;
    const q = (s) => root.querySelector(s);
    this.$ = {
      stage: q(".sc-stage"), overlay: q(".sc-overlay"), lines: q(".sc-lines"), pins: q(".sc-pins"),
      labels: q(".sc-labels"), marks: q(".sc-marks"), card: q(".sc-card"), status: q(".sc-status"),
      tourbar: q(".sc-tourbar"), sheet: q(".sc-sheet"), loading: q(".sc-loading"), fallback: q(".sc-fallback"),
      panel: q(".sc-panel"), tools: q(".sc-tools"), debug: q(".sc-debug"),
      progress: q(".sc-progress"), phase: q(".sc-loading-phase"), bytes: q(".sc-loading-bytes"),
    };
    this.renderPanel();
    this.buildHotspots();

    this.on(root, "click", (e) => {
      const b = e.target.closest("[data-act]");
      if (!b || b.disabled) return;
      this.action(b.dataset.act, b);
    });
    this.on(this.$.stage, "keydown", (e) => this.onKey(e));
    this.on(root, "keydown", (e) => { if (e.key === "Escape") this.onEscape(e); });

    const ro = new ResizeObserver(() => this.onResize());
    ro.observe(root);
    this._ro = ro;
    this.onResize();
  }

  posterUrl() {
    const p = this.opts.poster || this.manifest.files?.poster?.url;
    return p ? this.resolve(p) : null;
  }

  frames() {
    const f = this.opts.frames || (this.manifest.files?.frames || []).map((x) => x.url || x);
    return f.map((u) => this.resolve(u));
  }

  applyTheme() {
    const mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
    const set = () => { this.onThemeChange(); };
    if (mq && mq.addEventListener) this.on(mq, "change", set);
  }

  isDark() {
    const t = this.root.dataset.theme;
    if (t === "dark") return true;
    if (t === "light") return false;
    return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  }

  cssVar(name) { return getComputedStyle(this.root).getPropertyValue(name).trim(); }

  setTheme(theme) {
    if (theme === "auto") delete this.root.dataset.theme; else this.root.dataset.theme = theme;
    this.onThemeChange();
  }

  onThemeChange() {
    if (!this.THREE || !this.scene) return;
    this.scene.background = new this.THREE.Color(this.cssVar("--sc-stage") || "#FFFDFB");
    if (this.shadow) this.updateShadowTexture();
    this.markDirty(3);
  }

  /* ---------------------------------------------------------- spec ---- */
  fieldValue(key) {
    const f = (this.spec.fields || {})[key];
    if (!f) return null;
    let value = f.value;
    let note = f.note || "";
    if (f.fromManifest) {
      const v = f.fromManifest.split(".").reduce((o, k) => (o ? o[k] : undefined), this.manifest);
      if (typeof v === "number") {
        value = f.unit === "mm" ? Math.round(v * 1000) : v;
        const specKey = f.fromManifest.endsWith("heightM") ? "height" : f.fromManifest.endsWith("widthM") ? "width" : null;
        const ref = specKey && this.spec.fields[specKey];
        if (ref && typeof ref.value === "number") {
          const d = ((value - ref.value) / ref.value) * 100;
          note = `${note ? note + " " : ""}Published: ${nf(ref.value)} ${ref.unit} (${d >= 0 ? "+" : "−"}${nf(Math.abs(d), 1)}%).`;
        }
      } else value = "Not measured";
    }
    return { ...f, key, value, note };
  }

  fmtValue(f) {
    if (f.value === null || f.value === undefined) return "—";
    if (typeof f.value === "number") {
      const d = Number.isInteger(f.value) ? 0 : 1;
      return `${esc(nf(f.value, d))}${f.unit ? `<span class="sc-unit">${esc(f.unit)}</span>` : ""}`;
    }
    return `${esc(f.value)}${f.unit ? `<span class="sc-unit">${esc(f.unit)}</span>` : ""}`;
  }

  fieldHtml(key) {
    const f = this.fieldValue(key);
    if (!f) return "";
    const src = this.sources[f.source];
    const truth = TRUTH.includes(f.truth) ? f.truth : "Requires validation";
    const srcUrl = src?.url ? (/^https?:/.test(src.url) ? src.url : this.resolve(src.url)) : null;
    return `<li class="sc-field">
      <span class="sc-field-label">${esc(f.label)}</span>
      <span class="sc-field-value">${this.fmtValue(f)}</span>
      <span class="sc-field-meta">
        <span class="sc-chip" data-truth="${esc(truth)}">${esc(truth)}</span>
        ${srcUrl ? `<a class="sc-src" href="${esc(srcUrl)}" target="_blank" rel="noopener" title="${esc(src.title)} — ${esc(src.publisher || "")}">Source · ${esc(src.short || src.publisher || "link")}</a>` : ""}
      </span>
      ${f.note ? `<p class="sc-field-note">${esc(f.note)}</p>` : ""}
    </li>`;
  }

  renderPanel() {
    const s = this.spec;
    const groups = s.groups?.length ? s.groups : [{ id: "all", label: "Specification", fields: Object.keys(s.fields || {}) }];
    const v = s.vehicle || {};
    const cap = s.capture || {};
    this.$.panel.innerHTML = `
      <div class="sc-kicker">Specification</div>
      <h2>${esc([v.model, v.variant].filter(Boolean).join(" ") || "Vehicle")}</h2>
      <p class="sc-panel-intro">${esc(v.specEdition || "")}${v.priceFrom ? ` · From $${esc(nf(v.priceFrom.value))} ${esc(v.priceFrom.unit || "")}` : ""}</p>
      ${groups.map((g) => `<section class="sc-group"><h3 class="sc-kicker">${esc(g.label)}</h3>
        <ul class="sc-fields">${g.fields.map((k) => this.fieldHtml(k)).join("")}</ul></section>`).join("")}
      ${cap.note ? `<p class="sc-attrib">${esc(cap.note)} ${cap.attribution ? esc(cap.attribution) : ""}</p>` : ""}
    `;
  }

  hotspotSummary(h) {
    if (h.summary) return h.summary;
    const f = this.fieldValue(h.fields?.[0]);
    if (!f) return h.title || "";
    const val = typeof f.value === "number" ? nf(f.value, Number.isInteger(f.value) ? 0 : 1) : String(f.value);
    const unit = f.unit ? ` ${f.unit.split(" @")[0]}` : "";
    const s = `${val}${unit}`;
    return s.length > 34 ? s.slice(0, 32) + "…" : s;
  }

  buildHotspots() {
    const anchors = this.manifest.anchors || {};
    this.hotspots = (this.spec.hotspots || []).map((h, i) => {
      const a = h.position ? { position: h.position, normal: h.normal || [0, 1, 0] } : anchors[h.anchor];
      return { ...h, index: i, anchor3: a ? a.position : null, normal3: a ? a.normal : [0, 1, 0], visible: false, sx: 0, sy: 0 };
    }).filter((h) => h.anchor3);
    this.$.pins.innerHTML = this.hotspots.map((h) => `
      <button type="button" class="sc-pin is-hidden" data-hotspot="${esc(h.id)}" aria-pressed="false"
        aria-label="${esc(h.label)}: ${esc(this.hotspotSummary(h))}"></button>`).join("");
    this.$.labels.innerHTML = this.hotspots.map((h) => `
      <div class="sc-label is-hidden" data-hotspot="${esc(h.id)}">
        <span class="sc-tag">${esc(h.label)}</span><span class="sc-label-value">${esc(this.hotspotSummary(h))}</span>
      </div>`).join("");
    this.$.lines.innerHTML = this.hotspots.map((h) => `<line class="sc-leader" data-hotspot="${esc(h.id)}" x1="0" y1="0" x2="0" y2="0" visibility="hidden"/>`).join("")
      + '<line class="sc-measure-line" x1="0" y1="0" x2="0" y2="0" visibility="hidden"/>';
    this.pinEls = new Map([...this.$.pins.querySelectorAll(".sc-pin")].map((e) => [e.dataset.hotspot, e]));
    this.labelEls = new Map([...this.$.labels.querySelectorAll(".sc-label")].map((e) => [e.dataset.hotspot, e]));
    this.lineEls = new Map([...this.$.lines.querySelectorAll(".sc-leader")].map((e) => [e.dataset.hotspot, e]));
    this.measureLine = this.$.lines.querySelector(".sc-measure-line");
    for (const [id, el] of this.pinEls) {
      this.on(el, "click", (e) => { e.stopPropagation(); this.activate(id, { fly: true, source: "click" }); });
      this.on(el, "focus", () => {
        const h = this.hotspots.find((x) => x.id === id);
        this.activate(id, { fly: !h.visible, source: "focus" });
      });
    }
    for (const [id, el] of this.labelEls) this.on(el, "click", (e) => { e.stopPropagation(); this.activate(id, { fly: true, source: "label" }); });
  }

  cardHtml(h, where) {
    return `<button type="button" class="sc-close" data-act="close-card" aria-label="Close">×</button>
      <div class="sc-kicker">${esc(h.label)}</div>
      <h3 id="${this.uid}-${where}-h">${esc(h.title || h.label)}</h3>
      <ul class="sc-fields">${(h.fields || []).map((k) => this.fieldHtml(k)).join("")}</ul>`;
  }

  activate(id, { fly = false, source = "" } = {}) {
    const h = this.hotspots.find((x) => x.id === id);
    if (!h) return;
    this.active = id;
    for (const [hid, el] of this.pinEls) el.setAttribute("aria-pressed", String(hid === id));
    for (const [hid, el] of this.labelEls) el.classList.toggle("is-active", hid === id);
    if (this.narrow) {
      this.$.sheet.innerHTML = `<div class="sc-sheet-grip" aria-hidden="true"></div>${this.cardHtml(h, "sheet")}`;
      this.$.sheet.hidden = false;
      this.$.card.hidden = true;
      this.shiftView(this.$.sheet.offsetHeight);
    } else {
      this.$.card.innerHTML = this.cardHtml(h, "card");
      this.$.card.hidden = false;
      this.$.sheet.hidden = true;
      this._cardSize = null;
    }
    this._overlayDirty = true;
    this.announce(`${h.label}. ${h.title || ""}`);
    this.emit("hotspot", { id, source });
    if (fly && this.camera && this.mode !== "interior") {
      const stop = (this.manifest.tour || []).find((s) => s.hotspot === id);
      if (stop) this.flyTo(this.adaptPose(this.poseFrom(stop.camera)));
    }
  }

  deactivate() {
    this.active = null;
    for (const el of this.pinEls.values()) el.setAttribute("aria-pressed", "false");
    for (const el of this.labelEls.values()) el.classList.remove("is-active");
    this.$.card.hidden = true;
    this.$.sheet.hidden = true;
    this.shiftView(0);
    this._overlayDirty = true;
  }

  /* keep the car visible above the bottom sheet: shift the projection up by half
     the sheet's height (overlay projection uses the same matrix, so pins follow) */
  shiftView(sheetPx) {
    if (!this.camera || !this.size) return;
    const dy = Math.round(Math.min(sheetPx, this.size.h * 0.6) * 0.5);
    if (dy > 0) this.camera.setViewOffset(this.size.w, this.size.h, 0, dy, this.size.w, this.size.h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
    this.markDirty(3);
  }

  announce(msg) {
    if (!this._live) {
      this._live = document.createElement("div");
      this._live.className = "sc-visually-hidden";
      this._live.setAttribute("aria-live", "polite");
      this.root.appendChild(this._live);
    }
    this._live.textContent = msg;
  }

  setStatus(html) { this.$.status.innerHTML = html || ""; }

  /* ------------------------------------------------------- actions ---- */
  action(act, btn) {
    switch (act) {
      case "tour": return this.mode === "tour" ? this.endTour() : this.startTour();
      case "tour-next": return this.tourGo(this.tourIndex + 1);
      case "tour-prev": return this.tourGo(this.tourIndex - 1);
      case "tour-pause": return this.toggleTourPause();
      case "tour-end": return this.endTour();
      case "inside": return this.mode === "interior" ? this.exitInterior() : this.enterInterior();
      case "measure": return this.mode === "measure" ? this.endMeasure() : this.startMeasure();
      case "reset": return this.resetView();
      case "close-card": return this.deactivate();
      case "fb-prev": return this.showFrame(this.frameIndex - 1);
      case "fb-next": return this.showFrame(this.frameIndex + 1);
      case "fb-dot": return this.showFrame(Number(btn.dataset.i));
      case "fb-try3d": return this.retry3D();
      default: return undefined;
    }
  }

  onEscape(e) {
    if (this.mode === "interior") { this.exitInterior(); e.preventDefault(); return; }
    if (this.mode === "tour") { this.endTour(); e.preventDefault(); return; }
    if (this.mode === "measure") { this.endMeasure(); e.preventDefault(); return; }
    if (this.active) { this.deactivate(); e.preventDefault(); }
  }

  onKey(e) {
    if (!this.camera || e.target !== this.$.stage) return;
    const T = this.THREE;
    const k = e.key;
    if (this.mode === "interior") {
      const step = 0.08;
      if (k === "ArrowLeft") this.look(step, 0); else if (k === "ArrowRight") this.look(-step, 0);
      else if (k === "ArrowUp") this.look(0, step); else if (k === "ArrowDown") this.look(0, -step);
      else return;
      e.preventDefault();
      return;
    }
    const c = this.controls;
    const off = this.camera.position.clone().sub(c.target);
    const sph = new T.Spherical().setFromVector3(off);
    let used = true;
    if (k === "ArrowLeft") sph.theta -= 0.1;
    else if (k === "ArrowRight") sph.theta += 0.1;
    else if (k === "ArrowUp") sph.phi -= 0.07;
    else if (k === "ArrowDown") sph.phi += 0.07;
    else if (k === "+" || k === "=") sph.radius *= 0.9;
    else if (k === "-" || k === "_") sph.radius *= 1.1;
    else used = false;
    if (!used) return;
    e.preventDefault();
    this.stopTween();
    if (this.mode === "tour") this.pauseTour(true);
    sph.phi = clamp(sph.phi, c.minPolarAngle, c.maxPolarAngle);
    sph.radius = clamp(sph.radius, c.minDistance, c.maxDistance);
    this.camera.position.copy(c.target).add(new T.Vector3().setFromSpherical(sph));
    this.camera.lookAt(c.target);
    this.markDirty(3);
    this.emit("key", { key: k });
  }

  onResize() {
    const w = this.root.clientWidth;
    const narrow = w < NARROW_PX;
    if (narrow !== this.narrow) {
      this.narrow = narrow;
      this.root.classList.toggle("is-narrow", narrow);
      if (this.active) this.activate(this.active, { source: "relayout" });
    }
    if (narrow) {
      // a car is wide: a stage about as tall as it is wide frames it best on a phone
      const h = Math.round(clamp(w * 0.92, 300, (window.innerHeight || 800) * 0.64));
      this.root.style.setProperty("--sc-stage-h", `${h}px`);
    } else this.root.style.removeProperty("--sc-stage-h");
    if (this.renderer) {
      const s = this.$.stage;
      const W = Math.max(1, s.clientWidth), H = Math.max(1, s.clientHeight);
      this.renderer.setSize(W, H, false);
      this.camera.aspect = W / H;
      this.camera.updateProjectionMatrix();
      this.size = { w: W, h: H };
      if (this.startPoseRaw) this.startPose = this.fitPose(this.startPoseRaw);
      if (this.narrow && !this.$.sheet.hidden) this.shiftView(this.$.sheet.offsetHeight);
      this.markDirty(3);
    }
  }

  /* ------------------------------------------------------------ 3D ---- */
  async importDeps() {
    if (this.opts.deps?.THREE && this.opts.deps?.Spark && this.opts.deps?.OrbitControls) return this.opts.deps;
    const [THREE, orbit, Spark] = await Promise.all([
      import("three"),
      import("three/addons/controls/OrbitControls.js"),
      import("@sparkjsdev/spark"),
    ]);
    return { THREE, OrbitControls: orbit.OrbitControls, Spark };
  }

  pickSplat() {
    if (this.opts.splatUrl) return new URL(this.opts.splatUrl, document.baseURI).href;
    const files = this.manifest.files || {};
    for (const fmt of this.opts.prefer) if (files[fmt]?.url) return this.resolve(files[fmt].url);
    throw new Error("No splat file in manifest");
  }

  async start3D() {
    const t0 = performance.now();
    this.state = "loading";
    this.$.phase.textContent = "Loading libraries";
    const { THREE, OrbitControls, Spark } = await this.importDeps();
    this.THREE = THREE;
    this.Spark = Spark;

    const canvas = document.createElement("canvas");
    canvas.className = "sc-canvas";
    this.$.stage.prepend(canvas);
    this.canvas = canvas;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
    const mobile = (Spark.isMobile && Spark.isMobile()) || matchMedia("(pointer: coarse)").matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
    this.renderer = renderer;
    const gl = renderer.getContext();
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    this.stats.renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    this.stats.softwareGL = /swiftshader|llvmpipe|software/i.test(this.stats.renderer);

    const scene = new THREE.Scene();
    this.scene = scene;
    scene.background = new THREE.Color(this.cssVar("--sc-stage") || "#FFFDFB");
    const m = this.manifest;
    const fov = m.camera?.start?.fovDeg || 40;
    const camera = new THREE.PerspectiveCamera(fov, 1, 0.03, 200);
    this.camera = camera;
    // render on demand: Spark tells us when a sort / LoD update needs a new frame
    const spark = new Spark.SparkRenderer({ renderer, onDirty: () => this.markDirty(2) });
    scene.add(spark);
    this.spark = spark;

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.rotateSpeed = 0.7;
    controls.zoomSpeed = 0.8;
    const orb = m.camera?.orbit || {};
    controls.minDistance = orb.minDistance ?? 2.5;
    controls.maxDistance = orb.maxDistance ?? 14;
    controls.minPolarAngle = THREE.MathUtils.degToRad(orb.minPolarDeg ?? 20);
    controls.maxPolarAngle = THREE.MathUtils.degToRad(orb.maxPolarDeg ?? 86);
    controls.autoRotate = !!this.opts.autoRotate && !this.reduced;
    controls.autoRotateSpeed = 0.6;
    this.controls = controls;
    this.on(controls, "start", () => { this.stopTween(); if (this.mode === "tour") this.pauseTour(true); this.emit("orbit-start"); });
    this.on(controls, "change", () => this.markDirty(3));

    this.onResize();
    this.startPoseRaw = this.poseFrom(m.camera?.start || { position: [5, 1.6, 4], target: [0, 0.5, 0] });
    this.startPose = this.fitPose(this.startPoseRaw);
    this.applyPose(this.startPose);

    // contact shadow
    this.addShadow();

    // download with real progress
    const url = this.pickSplat();
    this.splatUrl = url;
    this.$.phase.textContent = "Downloading";
    let bytes = await fetchWithProgress(url, (loaded, total) => this.onProgress(loaded, total));
    this.$.phase.textContent = "Decoding splats";
    let name = url.split("/").pop().split("?")[0];
    // assembl twin copy: claude.ai artifacts only serve web file types, so the capture ships as base64 text (<name>.b64.txt)
    if (/\.b64\.txt$/i.test(name)) {
      const bin = atob(new TextDecoder().decode(bytes).replace(/\s+/g, "")), out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      bytes = out; name = name.replace(/\.b64\.txt$/i, "");
    }
    this.$.bytes.textContent = fmtMB(bytes.length);
    this.$.progress.classList.remove("is-unknown");
    const mesh = new Spark.SplatMesh({ fileBytes: bytes, fileName: name });
    scene.add(mesh);
    await mesh.initialized;
    this.mesh = mesh;
    { const T = this.THREE, [px, py, pz, pw, ph] = [1.95, 0.45, 0, 0.56, 0.15]; const plate = new T.Mesh(new T.BoxGeometry(.035, ph, pw), new T.MeshBasicMaterial({ color: 0xbdb8b0 })); plate.position.set(px, py, pz); scene.add(plate); }   // assembl: number plate blanked
    this.stats.splats = mesh.packedSplats?.numSplats ?? mesh.numSplats ?? 0;
    this.stats.loadMs = Math.round(performance.now() - t0);
    this.stats.fileBytes = bytes.length;
    this.stats.file = name;

    this.bindPointer();
    this.state = "ready";
    this.$.loading.hidden = true;
    this.emit("ready", { splats: this.stats.splats, bytes: bytes.length, loadMs: this.stats.loadMs });
    this.announce("3D view ready.");
    this.loop();
    this.watchVisibility();
    if (!this.reduced && !this.opts.capture) this.revealSweep();
  }

  onProgress(loaded, total) {
    this.stats.loadedBytes = loaded;
    this.stats.totalBytes = total;
    const p = this.$.progress;
    if (total) {
      const pct = clamp((loaded / total) * 100, 0, 100);
      p.classList.remove("is-unknown");
      p.firstElementChild.style.width = `${pct.toFixed(1)}%`;
      p.setAttribute("aria-valuenow", pct.toFixed(0));
      this.$.bytes.textContent = `${fmtMB(loaded)} of ${fmtMB(total)}`;
    } else {
      p.classList.add("is-unknown");
      this.$.bytes.textContent = `${fmtMB(loaded)} received`;
    }
  }

  addShadow() {
    const T = this.THREE;
    const b = this.manifest.bounds || { size: [4, 1.3, 1.8], centre: [0, 0.6, 0] };
    const [L, , W] = b.size;
    const geo = new T.PlaneGeometry(L * 1.22, W * 1.45);
    geo.rotateX(-Math.PI / 2);
    this.shadowCanvas = document.createElement("canvas");
    this.shadowCanvas.width = 256; this.shadowCanvas.height = 128;
    const tex = new T.CanvasTexture(this.shadowCanvas);
    tex.colorSpace = T.SRGBColorSpace;
    const mat = new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    const mesh = new T.Mesh(geo, mat);
    mesh.position.set(b.centre[0], 0.002, b.centre[2]);
    mesh.renderOrder = -1;
    this.scene.add(mesh);
    this.shadow = mesh;
    this.shadowTex = tex;
    this.updateShadowTexture();
  }

  updateShadowTexture() {
    const c = this.shadowCanvas;
    const ctx = c.getContext("2d");
    const rgb = this.cssVar("--sc-shadow") || "36, 11, 33";
    const a = Number(this.cssVar("--sc-shadow-alpha") || 0.3);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.save();
    ctx.translate(c.width / 2, c.height / 2);
    ctx.scale(c.width / 2, c.height / 2);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, `rgba(${rgb}, ${a})`);
    g.addColorStop(0.55, `rgba(${rgb}, ${a * 0.75})`);
    g.addColorStop(0.8, `rgba(${rgb}, ${a * 0.25})`);
    g.addColorStop(1, `rgba(${rgb}, 0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    this.shadowTex.needsUpdate = true;
  }

  poseFrom(c) {
    const T = this.THREE;
    return { position: new T.Vector3(...c.position), target: new T.Vector3(...c.target), fov: c.fovDeg || this.manifest.camera?.start?.fovDeg || 40 };
  }

  /* distance along the pose direction at which the whole car fits `fill` of the
     frame for the current aspect ratio (binary search on projected box corners) */
  fitDistance(pose, aspect, fill = 0.8) {
    const T = this.THREE;
    const b = this.manifest.bounds;
    if (!b) return pose.position.distanceTo(pose.target);
    const corners = [];
    for (const x of [b.min[0], b.max[0]]) for (const y of [b.min[1], b.max[1]]) for (const z of [b.min[2], b.max[2]]) corners.push(new T.Vector3(x, y, z));
    const dir = pose.position.clone().sub(pose.target).normalize();
    const cam = new T.PerspectiveCamera(pose.fov, aspect, 0.01, 500);
    let lo = 0.5, hi = 60;
    for (let i = 0; i < 40; i++) {
      const d = (lo + hi) / 2;
      cam.position.copy(pose.target).addScaledVector(dir, d);
      cam.lookAt(pose.target);
      cam.updateMatrixWorld(); cam.updateProjectionMatrix();
      let ok = true;
      for (const c of corners) {
        const v = c.clone().project(cam);
        if (v.z > 1 || v.z < -1 || Math.abs(v.x) > fill || Math.abs(v.y) > fill) { ok = false; break; }
      }
      if (ok) hi = d; else lo = d;
    }
    return hi;
  }

  fitPose(pose) {
    const aspect = this.camera.aspect || 1.6;
    const d = this.fitDistance(pose, aspect, this.narrow ? 0.86 : 0.8);
    const dir = pose.position.clone().sub(pose.target).normalize();
    return { ...pose, position: pose.target.clone().addScaledVector(dir, d) };
  }

  /* manifest poses are framed for 16:10; portrait / narrow stages need more distance */
  adaptPose(pose) {
    if (!this.manifest.bounds) return pose;
    const aspect = this.camera.aspect || 1.6;
    if (aspect >= 1.55) return pose;
    const ref = this.fitDistance(this.startPoseRaw || pose, 1.6, 0.8);
    const now = this.fitDistance(this.startPoseRaw || pose, aspect, 0.86);
    const k = Math.max(1, now / ref);
    const dir = pose.position.clone().sub(pose.target);
    return { ...pose, position: pose.target.clone().addScaledVector(dir, k) };
  }

  /* keep the orbit camera out of the bodywork */
  keepOutside() {
    const b = this.manifest.bounds;
    if (!b || this.mode === "interior" || this._tween) return;
    const p = this.camera.position;
    const m = 0.35;
    const lo = [b.min[0] - m, -1, b.min[2] - m], hi = [b.max[0] + m, b.max[1] + m, b.max[2] + m];
    if (p.x > lo[0] && p.x < hi[0] && p.y < hi[1] && p.z > lo[2] && p.z < hi[2]) {
      const pushes = [[0, lo[0] - p.x], [0, hi[0] - p.x], [1, hi[1] - p.y], [2, lo[2] - p.z], [2, hi[2] - p.z]];
      pushes.sort((a, c) => Math.abs(a[1]) - Math.abs(c[1]));
      const [ax, d] = pushes[0];
      if (ax === 0) p.x += d; else if (ax === 1) p.y += d; else p.z += d;
    }
  }

  applyPose(p) {
    this.camera.position.copy(p.position);
    this.controls.target.copy(p.target);
    if (p.fov && Math.abs(this.camera.fov - p.fov) > 0.01) { this.camera.fov = p.fov; this.camera.updateProjectionMatrix(); }
    this.camera.lookAt(p.target);
    this.controls.update();
  }

  currentPose() {
    return { position: this.camera.position.clone(), target: this.controls.target.clone(), fov: this.camera.fov };
  }

  stopTween() { if (this._tween) { const t = this._tween; this._tween = null; t.reject?.("stopped"); } }

  /* fly around the car (spherical interpolation about a pivot), never through it */
  flyTo(to, { duration, path = "orbit" } = {}) {
    const T = this.THREE;
    this.stopTween();
    const from = this.currentPose();
    if (this.reduced || duration === 0) { this.applyPose(to); this.emit("arrive", { jumped: true }); return Promise.resolve(); }
    const pivot = new T.Vector3(this.manifest.bounds?.centre?.[0] || 0, 0.45, this.manifest.bounds?.centre?.[2] || 0);
    const s0 = new T.Spherical().setFromVector3(from.position.clone().sub(pivot));
    const s1 = new T.Spherical().setFromVector3(to.position.clone().sub(pivot));
    let dTheta = s1.theta - s0.theta;
    while (dTheta > Math.PI) dTheta -= 2 * Math.PI;
    while (dTheta < -Math.PI) dTheta += 2 * Math.PI;
    const span = Math.abs(dTheta) + Math.abs(s1.phi - s0.phi) + Math.abs(Math.log(s1.radius / s0.radius));
    const ms = duration ?? clamp(700 + span * 650, 700, 2400);
    this.controls.enabled = false;
    return new Promise((resolve, reject) => {
      const start = performance.now();
      this._tween = {
        reject,
        step: (now) => {
          const t = clamp((now - start) / ms, 0, 1);
          const e = easeInOut(t);
          let pos;
          if (path === "linear") pos = from.position.clone().lerp(to.position, e);
          else {
            const s = new T.Spherical(s0.radius * Math.pow(s1.radius / s0.radius, e), s0.phi + (s1.phi - s0.phi) * e, s0.theta + dTheta * e);
            pos = pivot.clone().add(new T.Vector3().setFromSpherical(s));
          }
          const tgt = from.target.clone().lerp(to.target, e);
          this.camera.position.copy(pos);
          this.controls.target.copy(tgt);
          const fov = from.fov + (to.fov - from.fov) * e;
          if (Math.abs(this.camera.fov - fov) > 0.01) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
          this.camera.lookAt(tgt);
          if (t >= 1) {
            this._tween = null;
            if (this.mode !== "interior") { this.controls.enabled = true; this.controls.update(); }
            this.emit("arrive", { jumped: false, ms: Math.round(ms) });
            resolve();
          }
        },
      };
    }).catch((r) => { if (this.mode !== "interior") this.controls.enabled = true; if (r !== "stopped") throw r; });
  }

  revealSweep() {
    // one short sweep on first load: shows the capture is 3D, then stops (no idle spin)
    const T = this.THREE;
    const p = this.startPose;
    const off = p.position.clone().sub(p.target);
    const s = new T.Spherical().setFromVector3(off);
    s.theta -= 0.42;
    const from = { position: p.target.clone().add(new T.Vector3().setFromSpherical(s)), target: p.target.clone(), fov: p.fov };
    this.applyPose(from);
    this.flyTo(p, { duration: 2200 });
  }

  resetView() {
    if (this.mode === "interior") return this.exitInterior();
    if (this.mode === "tour") this.endTour();
    this.deactivate();
    return this.flyTo(this.startPose);
  }

  bindPointer() {
    const c = this.canvas;
    let down = null;
    this.on(c, "pointerdown", (e) => {
      down = { x: e.clientX, y: e.clientY, t: performance.now() };
      if (this.mode === "interior") { this._look = { x: e.clientX, y: e.clientY }; c.setPointerCapture(e.pointerId); }
    });
    this.on(c, "pointermove", (e) => {
      if (this.mode === "interior" && this._look) {
        const dx = e.clientX - this._look.x, dy = e.clientY - this._look.y;
        this._look = { x: e.clientX, y: e.clientY };
        this.look(dx * 0.004, dy * 0.004);
      }
    });
    this.on(c, "pointerup", (e) => {
      this._look = null;
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      const quick = performance.now() - down.t < 600;
      down = null;
      if (moved < 6 && quick) this.onTap(e);
    });
  }

  onTap(e) {
    if (this.mode === "measure") return this.measureTap(e);
    if (this.active && !this.narrow) this.deactivate();
    return undefined;
  }

  raycast(e) {
    const T = this.THREE;
    const r = this.canvas.getBoundingClientRect();
    const ndc = new T.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const rc = new T.Raycaster();
    rc.setFromCamera(ndc, this.camera);
    rc.near = 0.05; rc.far = 100;
    const hits = rc.intersectObject(this.mesh, false);
    return hits.length ? hits[0].point.clone() : null;
  }

  /* ------------------------------------------------------- measure ---- */
  startMeasure() {
    if (this.mode === "tour") this.endTour();
    if (this.mode === "interior") return;
    this.deactivate();
    this.mode = "measure";
    this.root.classList.add("is-measuring");
    this.measurePts = [];
    this.root.querySelector('[data-act="measure"]').setAttribute("aria-pressed", "true");
    this.setStatus('<span class="sc-chip">Measure</span><span>Tap two points on the car</span>');
    this.renderMarks();
    this.emit("measure-start");
  }

  endMeasure() {
    this.mode = "exterior";
    this.root.classList.remove("is-measuring");
    this.measurePts = [];
    this.root.querySelector('[data-act="measure"]').setAttribute("aria-pressed", "false");
    this.setStatus("");
    this.renderMarks();
    this.emit("measure-end");
  }

  measureTap(e) {
    const t0 = performance.now();
    const p = this.raycast(e);
    const ms = Math.round(performance.now() - t0);
    if (!p) {
      this.setStatus('<span class="sc-chip">Measure</span><span>No surface there. Tap on the car.</span>');
      this.emit("measure-miss", { ms });
      return;
    }
    if (this.measurePts.length >= 2) this.measurePts = [];
    this.measurePts.push(p);
    if (this.measurePts.length === 2) {
      const d = this.measurePts[0].distanceTo(this.measurePts[1]);
      this.measureDist = d;
      this.setStatus(`<span class="sc-chip">Measure</span><span class="sc-mono">${nf(d, 3)} m</span><span>Tap again to start over</span>`);
      this.announce(`Distance ${nf(d, 2)} metres`);
      this.emit("measure", { metres: Number(d.toFixed(4)), ms });
    } else {
      this.setStatus('<span class="sc-chip">Measure</span><span>Now tap the second point</span>');
      this.emit("measure-point", { point: p.toArray().map((x) => Number(x.toFixed(4))), ms });
    }
    this.renderMarks();
  }

  measureAt(a, b) {
    // programmatic: a, b are [x,y,z] in metres (used by tests and the Listing studio)
    const T = this.THREE;
    this.measurePts = [new T.Vector3(...a), new T.Vector3(...b)];
    this.measureDist = this.measurePts[0].distanceTo(this.measurePts[1]);
    this.renderMarks();
    return this.measureDist;
  }

  renderMarks() {
    this._overlayDirty = true;
    const pts = this.mode === "measure" ? (this.measurePts || []) : [];
    this.$.marks.innerHTML = pts.map(() => '<span class="sc-mark"></span>').join("")
      + (pts.length === 2 ? `<span class="sc-measure-readout">${nf(this.measureDist, 3)} m</span>` : "");
    this.measureLine.setAttribute("visibility", pts.length === 2 ? "visible" : "hidden");
  }

  /* ---------------------------------------------------------- tour ---- */
  startTour() {
    const stops = this.manifest.tour || [];
    if (!stops.length || !this.camera) return;
    if (this.mode === "measure") this.endMeasure();
    if (this.mode === "interior") return;
    this.mode = "tour";
    this.tourPaused = false;
    this.$.tourbar.hidden = false;
    this.root.querySelector('[data-act="tour"] span').textContent = "End tour";
    this.emit("tour-start", { stops: stops.length });
    this.tourGo(0);
  }

  tourGo(i) {
    const stops = this.manifest.tour || [];
    if (this.mode !== "tour") return;
    if (i >= stops.length) { this.endTour(); return; }
    i = clamp(i, 0, stops.length - 1);
    this.tourIndex = i;
    const stop = stops[i];
    clearTimeout(this._dwell);
    this.$.tourbar.querySelector(".sc-tour-step").textContent = `${String(i + 1).padStart(2, "0")} / ${String(stops.length).padStart(2, "0")}`;
    this.$.tourbar.querySelector(".sc-tour-title").textContent = stop.title;
    this.setProgress(0, 0);
    this.activate(stop.hotspot, { source: "tour" });
    this.emit("tour-stop", { index: i, id: stop.id });
    this.flyTo(this.adaptPose(this.poseFrom(stop.camera))).then(() => {
      if (this.mode === "tour" && this.tourIndex === i && !this.tourPaused) this.scheduleNext();
    });
  }

  scheduleNext() {
    clearTimeout(this._dwell);
    const ms = this.opts.dwellMs;
    this._dwellStart = performance.now();
    this.setProgress(0, ms);
    this._dwell = setTimeout(() => { if (this.mode === "tour" && !this.tourPaused) this.tourGo(this.tourIndex + 1); }, ms);
  }

  setProgress(from, ms) {
    const bar = this.$.tourbar.querySelector(".sc-tour-progress > span");
    bar.style.transition = "none";
    bar.style.width = "0%";
    if (ms && !this.reduced) {
      void bar.offsetWidth;
      bar.style.transition = `width ${ms}ms linear`;
      bar.style.width = "100%";
    }
  }

  pauseTour(p) {
    if (this.mode !== "tour") return;
    this.tourPaused = p;
    const b = this.$.tourbar.querySelector('[data-act="tour-pause"]');
    b.innerHTML = p ? ICON.play : ICON.pause;
    b.setAttribute("aria-label", p ? "Resume tour" : "Pause tour");
    if (p) { clearTimeout(this._dwell); this.setProgress(0, 0); } else this.scheduleNext();
  }

  toggleTourPause() { this.pauseTour(!this.tourPaused); }

  endTour() {
    clearTimeout(this._dwell);
    if (this.mode === "tour") this.mode = "exterior";
    this.$.tourbar.hidden = true;
    const s = this.root.querySelector('[data-act="tour"] span');
    if (s) s.textContent = "Guided tour";
    this.emit("tour-end");
  }

  /* ------------------------------------------------------ interior ---- */
  async enterInterior() {
    const it = this.manifest.interior || {};
    if (!(it.available || this.opts.interiorPreview) || !this.camera) return;
    if (this.mode === "tour") this.endTour();
    if (this.mode === "measure") this.endMeasure();
    this.deactivate();
    const T = this.THREE;
    this.exteriorPose = this.currentPose();
    const e = it.entry;
    const door = { position: new T.Vector3(...e.door), target: new T.Vector3(...e.eye), fov: this.camera.fov };
    const eye = { position: new T.Vector3(...e.eye), target: new T.Vector3(...e.lookAt), fov: e.fovDeg || 70 };
    this.mode = "interior";
    this.controls.enabled = false;
    this.setStatus(`<span class="sc-chip">${it.available ? "Inside" : "Preview · cabin not captured"}</span><span>Drag to look around · Esc to step out</span>`);
    const btn = this.root.querySelector('[data-act="inside"] > span');
    if (btn) btn.firstChild.textContent = "Step out";
    for (const el of this.pinEls.values()) el.classList.add("is-hidden");
    this.emit("interior-enter", { preview: !it.available });
    if (it.splatUrl && !this.interiorMesh) this.loadInterior(it.splatUrl);
    await this.flyTo(door, { path: "orbit" });
    if (this.mode !== "interior") return;
    await this.flyTo(eye, { path: "linear", duration: this.reduced ? 0 : 1300 });
    this.lookState = { yaw: 0, pitch: 0, base: eye };
    if (this.interiorMesh) this.swapToInterior(true);
    this.emit("interior-seated");
  }

  async loadInterior(url) {
    try {
      const bytes = await fetchWithProgress(this.resolve(url), () => {});
      const mesh = new this.Spark.SplatMesh({ fileBytes: bytes, fileName: url.split("/").pop() });
      const al = this.manifest.interior?.align || {};
      if (al.offset) mesh.position.set(...al.offset);
      mesh.rotation.y = this.THREE.MathUtils.degToRad(al.yawDeg || 0);
      mesh.visible = false;
      this.scene.add(mesh);
      await mesh.initialized;
      this.interiorMesh = mesh;
      if (this.lookState) this.swapToInterior(true);
    } catch (err) {
      console.warn("[splatCar] interior load failed", err);
      this.setStatus('<span class="sc-chip">Interior file failed to load</span>');
    }
  }

  swapToInterior(inside) {
    if (!this.interiorMesh) return;
    this.interiorMesh.visible = inside;
    this.mesh.visible = !inside;
    if (this.shadow) this.shadow.visible = !inside;
    this.markDirty(4);
  }

  look(dYaw, dPitch) {
    if (this.mode !== "interior" || !this.lookState) return;
    const T = this.THREE;
    const s = this.lookState;
    s.yaw += dYaw;
    s.pitch = clamp(s.pitch + dPitch, -0.9, 0.7);
    const base = s.base;
    const fwd = base.target.clone().sub(base.position).normalize();
    const q = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), s.yaw);
    const right = new T.Vector3().crossVectors(fwd, new T.Vector3(0, 1, 0)).normalize().applyQuaternion(q);
    const dir = fwd.clone().applyQuaternion(q).applyAxisAngle(right, s.pitch);
    const tgt = base.position.clone().add(dir);
    this.controls.target.copy(tgt);
    this.camera.lookAt(tgt);
    this.markDirty(3);
  }

  async exitInterior() {
    if (this.mode !== "interior") return;
    const it = this.manifest.interior;
    const T = this.THREE;
    const door = { position: new T.Vector3(...it.entry.door), target: new T.Vector3(...it.entry.eye), fov: this.startPose.fov };
    this.swapToInterior(false);
    await this.flyTo(door, { path: "linear", duration: this.reduced ? 0 : 900 });
    this.mode = "exterior";
    this.lookState = null;
    this.setStatus("");
    const btn = this.root.querySelector('[data-act="inside"] > span');
    if (btn) btn.firstChild.textContent = "Step inside";
    await this.flyTo(this.exteriorPose || this.startPose);
    this.controls.enabled = true;
    this.emit("interior-exit");
  }

  /* ------------------------------------------------------- overlay ---- */
  project(v3) {
    const T = this.THREE;
    const v = v3 instanceof T.Vector3 ? v3.clone() : new T.Vector3(...v3);
    v.project(this.camera);
    return { x: (v.x * 0.5 + 0.5) * this.size.w, y: (-v.y * 0.5 + 0.5) * this.size.h, z: v.z };
  }

  updateOverlay() {
    if (!this.size) return;
    const T = this.THREE;
    const cam = this.camera.position;
    const W = this.size.w, H = this.size.h;
    const showPins = this.mode !== "interior" && !this.opts.capture;
    const centre = this.project(this.manifest.bounds?.centre || [0, 0.6, 0]);
    // screen-space box of the car, so labels sit outside the bodywork
    let bx0 = Infinity, bx1 = -Infinity;
    const bb = this.manifest.bounds;
    if (bb) {
      for (const x of [bb.min[0], bb.max[0]]) for (const y of [bb.min[1], bb.max[1]]) for (const z of [bb.min[2], bb.max[2]]) {
        const q = this.project([x, y, z]);
        if (q.z < 1) { bx0 = Math.min(bx0, q.x); bx1 = Math.max(bx1, q.x); }
      }
    }
    if (!isFinite(bx0)) { bx0 = centre.x - 100; bx1 = centre.x + 100; }
    this._carBox = { x0: bx0, x1: bx1 };
    const vis = [];
    for (const h of this.hotspots) {
      const p = new T.Vector3(...h.anchor3);
      const n = new T.Vector3(...h.normal3);
      const toCam = cam.clone().sub(p).normalize();
      const s = this.project(p);
      const facing = n.dot(toCam) > -0.08;
      h.visible = showPins && facing && s.z < 1 && s.x > 8 && s.x < W - 8 && s.y > 8 && s.y < H - 8;
      h.sx = s.x; h.sy = s.y;
      const pin = this.pinEls.get(h.id);
      pin.classList.toggle("is-hidden", !h.visible && !(showPins && h.id === this.active && s.z < 1));
      pin.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px)`;
      if (h.visible) vis.push(h);
    }
    // labels (wide layouts): left/right of the car, stacked without overlap
    const wide = !this.narrow && showPins;
    const LH = 44, GAP = 6, top = 52, bottom = H - (this.$.tourbar.hidden ? 16 : 72);
    const sides = { left: [], right: [] };
    for (const h of vis) (h.sx < centre.x ? sides.left : sides.right).push(h);
    const placed = new Map();
    for (const [side, arr] of Object.entries(sides)) {
      arr.sort((a, b) => a.sy - b.sy);
      let y = top;
      for (const h of arr) {
        const want = clamp(h.sy - LH / 2, top, bottom - LH);
        y = Math.max(want, y);
        placed.set(h.id, { side, y });
        y += LH + GAP;
      }
      // pull back up if we ran off the bottom
      let over = y - GAP - bottom;
      if (over > 0) for (let i = arr.length - 1; i >= 0 && over > 0; i--) {
        const pl = placed.get(arr[i].id);
        const ny = Math.max(top, pl.y - over);
        pl.y = ny;
      }
    }
    for (const h of this.hotspots) {
      const lab = this.labelEls.get(h.id);
      const line = this.lineEls.get(h.id);
      const pl = placed.get(h.id);
      const isActive = h.id === this.active;
      const cardOpen = !this.$.card.hidden;
      if (!wide || !pl || (isActive && cardOpen) || (cardOpen && !isActive)) {
        lab.classList.add("is-hidden");
        if (!(isActive && wide && cardOpen && h.visible)) line.setAttribute("visibility", "hidden");
        if (!isActive || !wide || !cardOpen) continue;
      }
      if (!isActive || this.$.card.hidden) {
        const lw = lab._w || (lab._w = lab.offsetWidth || 120);
        let x = pl.side === "right" ? Math.max(h.sx + 28, bx1 + 16) : Math.min(h.sx - 28 - lw, bx0 - 16 - lw);
        x = clamp(x, 8, W - lw - 8);
        lab.classList.remove("is-hidden");
        lab.style.transform = `translate(${x.toFixed(1)}px, ${pl.y.toFixed(1)}px)`;
        const ax = pl.side === "right" ? x : x + lw;
        const ay = pl.y + LH / 2;
        line.setAttribute("x1", h.sx.toFixed(1)); line.setAttribute("y1", h.sy.toFixed(1));
        line.setAttribute("x2", ax.toFixed(1)); line.setAttribute("y2", ay.toFixed(1));
        line.setAttribute("visibility", "visible");
        line.classList.toggle("is-active", isActive);
      }
    }
    // active card (wide only)
    const card = this.$.card;
    if (!card.hidden && this.active) {
      const h = this.hotspots.find((x) => x.id === this.active);
      const cw = card.offsetWidth || 300, ch = Math.min(card.offsetHeight || 260, H - 24);
      const freeL = bx0 - 14, freeR = W - bx1 - 14;
      const right = freeR >= cw + 16 ? true : freeL >= cw + 16 ? false : freeR >= freeL;
      let x = right ? Math.max(h.sx + 40, bx1 + 16) : Math.min(h.sx - 40 - cw, bx0 - 16 - cw);
      x = clamp(x, 14, W - cw - 14);
      let y = clamp(h.sy - ch * 0.4, 14, H - ch - (this.$.tourbar.hidden ? 14 : 70));
      card.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      const line = this.lineEls.get(h.id);
      if (showPins && (h.visible || h.sx)) {
        const ax = right ? x : x + cw;
        const ay = clamp(h.sy, y + 16, y + ch - 16);
        line.setAttribute("x1", h.sx.toFixed(1)); line.setAttribute("y1", h.sy.toFixed(1));
        line.setAttribute("x2", ax.toFixed(1)); line.setAttribute("y2", ay.toFixed(1));
        line.setAttribute("visibility", h.visible ? "visible" : "hidden");
        line.classList.add("is-active");
      }
    }
    // measure marks
    if (this.mode === "measure" && this.measurePts?.length) {
      const marks = this.$.marks.querySelectorAll(".sc-mark");
      const sp = this.measurePts.map((p) => this.project(p));
      sp.forEach((s, i) => { if (marks[i]) marks[i].style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px)`; });
      if (sp.length === 2) {
        this.measureLine.setAttribute("x1", sp[0].x); this.measureLine.setAttribute("y1", sp[0].y);
        this.measureLine.setAttribute("x2", sp[1].x); this.measureLine.setAttribute("y2", sp[1].y);
        const ro = this.$.marks.querySelector(".sc-measure-readout");
        if (ro) ro.style.transform = `translate(${((sp[0].x + sp[1].x) / 2).toFixed(1)}px, ${((sp[0].y + sp[1].y) / 2).toFixed(1)}px) translate(-50%, -140%)`;
      }
    }
    this.stats.hotspotsVisible = vis.length;
    this.stats.labelsShown = wide ? placed.size : 0;
  }

  /* ---------------------------------------------------------- loop ---- */
  markDirty(n = 3) { this._dirty = Math.max(this._dirty || 0, n); }

  /* Frames are drawn only while something changes (camera, tween, sort, resize).
     A still car costs nothing, which matters on phones and when the viewer sits
     in a tab of a bigger app. opts.continuous restores a constant loop. */
  loop() {
    let winStart = performance.now(), winFrames = 0;
    this.markDirty(6);
    const tick = (now) => {
      if (this._tween) { this._tween.step(now); this.markDirty(3); }
      else if (this.mode !== "interior") { if (this.controls.update()) this.markDirty(3); this.keepOutside(); }
      if (this._dirty > 0 || this.opts.continuous) {
        const r0 = performance.now();
        this.renderer.render(this.scene, this.camera);
        this.stats.renderMs = Math.round(performance.now() - r0);
        this._dirty = Math.max(0, (this._dirty || 0) - 1);
        this.stats.frames++;
        winFrames++;
        this.updateOverlay();
      } else if (this._overlayDirty) {
        this.updateOverlay();
      }
      this._overlayDirty = false;
      if (now - winStart >= 1000) {
        if (winFrames > 1) this.stats.fps = Math.round((winFrames * 1000 / (now - winStart)) * 10) / 10;
        this.stats.idle = winFrames === 0;
        winFrames = 0; winStart = now;
        if (this.$.debug) this.$.debug.textContent = `${this.stats.idle ? "idle" : this.stats.fps + " fps"} · ${nf(this.stats.splats)} splats${this.stats.softwareGL ? " · software GL" : ""}`;
      }
    };
    this._tick = tick;
    this.renderer.setAnimationLoop(tick);
    this.running = true;
  }

  watchVisibility() {
    const setRun = (run) => {
      if (!this.renderer) return;
      if (run && !this.running) { this.renderer.setAnimationLoop(this._tick); this.running = true; }
      if (!run && this.running) { this.renderer.setAnimationLoop(null); this.running = false; }
    };
    this.on(document, "visibilitychange", () => setRun(!document.hidden && this._onscreen !== false));
    if ("IntersectionObserver" in window) {
      this._io = new IntersectionObserver((ents) => {
        this._onscreen = ents[0].isIntersecting;
        setRun(this._onscreen && !document.hidden);
      });
      this._io.observe(this.$.stage);
    }
  }

  /* pause/resume the render loop (screenshots under software GL, host tabs) */
  pause() {
    if (this.renderer && this.running) { this.renderer.setAnimationLoop(null); this.running = false; }
    if (this.renderer) { this.markDirty(1); this._tick(performance.now()); }
  }

  resume() { if (this.renderer && !this.running) { this.renderer.setAnimationLoop(this._tick); this.running = true; } }

  /* capture helpers (poster/frames rendering, tests) */
  async renderPose(c) {
    this.stopTween();
    this.applyPose(this.poseFrom(c));
    this.renderer.render(this.scene, this.camera);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    this.renderer.render(this.scene, this.camera);
  }

  /* ------------------------------------------------------ fallback ---- */
  showFallback(reason, err) {
    this.state = "fallback";
    this.stats.fallbackReason = reason;
    this.root.classList.add("is-fallback");
    this.$.loading.hidden = true;
    const frames = [this.posterUrl(), ...this.frames()].filter(Boolean);
    this.fbFrames = [...new Set(frames)];
    const msg = {
      webgl: "This browser cannot show the 3D capture (WebGL2 is off or unsupported). Here are photos from the same capture.",
      lowmem: "This device is low on memory, so we are showing photos from the 3D capture instead.",
      error: "The 3D capture did not load. Here are photos from the same capture.",
    }[reason] || "Showing photos from the 3D capture.";
    const fb = this.$.fallback;
    fb.hidden = false;
    fb.innerHTML = `
      <figure class="sc-fallback-figure">
        ${this.fbFrames.length ? `<img alt="" src="${esc(this.fbFrames[0])}">` : '<p class="sc-fallback-msg">No photos supplied for this listing.</p>'}
      </figure>
      <div class="sc-fallback-bar">
        <p class="sc-fallback-msg" role="status">${esc(msg)}${err && reason === "error" ? ` <span class="sc-mono">(${esc(String(err.message || err).slice(0, 90))})</span>` : ""}</p>
        ${this.fbFrames.length > 1 ? `
          <button type="button" class="sc-btn is-small" data-act="fb-prev" aria-label="Previous photo">${ICON.prev}</button>
          <span class="sc-dots">${this.fbFrames.map((_, i) => `<button type="button" class="sc-dot" data-act="fb-dot" data-i="${i}" aria-label="Photo ${i + 1} of ${this.fbFrames.length}" ${i === 0 ? 'aria-current="true"' : ""}></button>`).join("")}</span>
          <button type="button" class="sc-btn is-small" data-act="fb-next" aria-label="Next photo">${ICON.next}</button>` : ""}
        ${reason === "lowmem" ? '<button type="button" class="sc-btn is-small" data-act="fb-try3d">Try 3D anyway</button>' : ""}
      </div>`;
    this.frameIndex = 0;
    this.showFrame(0);
    for (const b of this.$.tools.querySelectorAll("[data-act]")) {
      if (b.dataset.act !== "reset") { b.disabled = true; }
    }
    this.$.tools.querySelector('[data-act="reset"]').disabled = true;
    // swipe
    let sx = null;
    const fig = fb.querySelector(".sc-fallback-figure");
    this.on(fig, "pointerdown", (e) => { sx = e.clientX; });
    this.on(fig, "pointerup", (e) => { if (sx !== null && Math.abs(e.clientX - sx) > 40) this.showFrame(this.frameIndex + (e.clientX < sx ? 1 : -1)); sx = null; });
    this.emit("fallback", { reason, frames: this.fbFrames.length });
  }

  showFrame(i) {
    if (!this.fbFrames?.length) return;
    const n = this.fbFrames.length;
    this.frameIndex = ((i % n) + n) % n;
    const img = this.$.fallback.querySelector(".sc-fallback-figure img");
    if (img) {
      img.src = this.fbFrames[this.frameIndex];
      const v = this.spec.vehicle || {};
      img.alt = `${[v.make, v.model, v.variant].filter(Boolean).join(" ")}, view ${this.frameIndex + 1} of ${n} from the 3D capture`;
    }
    this.$.fallback.querySelectorAll(".sc-dot").forEach((d, k) => d.setAttribute("aria-current", String(k === this.frameIndex)));
  }

  async retry3D() {
    this.root.classList.remove("is-fallback");
    this.$.fallback.hidden = true;
    this.$.loading.hidden = false;
    for (const b of this.$.tools.querySelectorAll("[data-act]")) b.disabled = false;
    const it = this.manifest.interior || {};
    const inside = this.root.querySelector('[data-act="inside"]');
    if (inside && !(it.available || this.opts.interiorPreview)) inside.disabled = true;
    this.opts.ignoreLowMemory = true;
    try { await this.start3D(); } catch (err) { this.teardown3D(); this.showFallback("error", err); }
  }

  teardown3D() {
    try { this.renderer?.setAnimationLoop(null); } catch { /* ignore */ }
    try { this.renderer?.dispose(); } catch { /* ignore */ }
    this.canvas?.remove();
    this.renderer = null; this.camera = null; this.scene = null; this.mesh = null;
  }

  destroy() {
    this.endTour();
    this.teardown3D();
    this._ro?.disconnect();
    this._io?.disconnect();
    for (const off of this._listeners) off();
    this.el.innerHTML = "";
  }

  getStats() { return { ...this.stats, state: this.state, mode: this.mode, active: this.active, tourIndex: this.tourIndex ?? null, narrow: !!this.narrow }; }
}

export async function mount(el, opts = {}) {
  const v = new SplatCarViewer(typeof el === "string" ? document.querySelector(el) : el, opts);
  (window.__splatCar = window.__splatCar || []).push(v);
  await v.init();
  return v;
}

export const splatCar = { mount, version: VERSION };
export default splatCar;
if (typeof window !== "undefined" && !window.splatCar) window.splatCar = splatCar;
