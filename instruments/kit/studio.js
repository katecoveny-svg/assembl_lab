// assembl lab art studio shell: tool tray, colours, seed, undo/redo,
// high-resolution PNG, A4 print poster, share, link and short video.
// Nothing leaves the device unless the maker chooses Share.
import { PALETTES, BACKGROUNDS, rng, randomSeed, encodeState, decodeState, exportSize, contain, A4, niceDate, clamp } from "./core.js";
import { icon } from "./icons.js";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const el = (tag, attrs = {}, html = "") => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    n.setAttribute(k, v === true ? "" : v);
  }
  if (html) n.innerHTML = html;
  return n;
};
const PRIVACY = "Made on this device. Nothing is uploaded, there are no accounts and nothing about you is kept.";
const HISTORY = 40;

export class Studio {
  constructor(cfg) {
    this.cfg = cfg;
    this.engine = cfg.engine;
    const e = this.engine;
    this.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.params = new URLSearchParams(location.search);
    this.thumb = this.params.has("thumb");
    this.force2d = this.params.get("mode") === "2d";
    this.gl2 = !this.force2d && (() => {
      try { return !!document.createElement("canvas").getContext("webgl2"); } catch { return false; }
    })();
    const defaults = {
      seed: cfg.seed || 2026,
      palette: cfg.palette ?? 0,
      colour: 0,
      bg: cfg.bg ?? 0,
      start: e.starts?.[0]?.id || "",
      tool: e.tools?.[0]?.id || "",
      values: Object.fromEntries((e.sliders || []).map((s) => [s.id, s.value])),
      opts: Object.fromEntries((e.options || []).map((o) => [o.id, o.value])),
      data: "",
    };
    this.state = decodeState(location.search, defaults, e.sliders, e.starts, e.tools);
    const o = this.params.get("o") || "";
    for (const pair of o.split(",")) {
      const [id, val] = pair.split(":");
      const def = (e.options || []).find((x) => x.id === id);
      if (def && def.choices.some((c) => c.id === val)) this.state.opts[id] = val;
    }
    this.undoStack = [];
    this.redoStack = [];
    this.touched = false;
    this.paused = false;
  }

  // ---------- helpers engines use ----------
  get palette() { return PALETTES[this.state.palette]; }
  get colours() { return this.palette.colours; }
  get colour() { return this.colours[this.state.colour % this.colours.length]; }
  get background() { return BACKGROUNDS[this.state.bg]; }
  value(id) { return this.state.values[id]; }
  opt(id) { return this.state.opts[id]; }
  random(salt = 0) { return rng((this.state.seed * 2654435761 + salt) >>> 0); }
  status(msg) { if (this.statusEl) { this.statusEl.textContent = msg; } }
  toast(msg) {
    const t = this.toastEl;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(this._toast);
    this._toast = setTimeout(() => t.classList.remove("show"), 2600);
  }

  // ---------- undo / redo ----------
  snap() {
    return { art: this.engine.snapshot(), state: JSON.parse(JSON.stringify(this.state)) };
  }
  commit() {
    this.undoStack.push(this.snap());
    if (this.undoStack.length > HISTORY) this.undoStack.shift();
    this.redoStack.length = 0;
    this.syncHistory();
  }
  apply(entry) {
    const prevPalette = this.state.palette, prevBg = this.state.bg;
    this.state = entry.state;
    this.engine.restore(entry.art);
    if (prevPalette !== this.state.palette || prevBg !== this.state.bg) this.engine.recolour?.();
    this.syncUI();
    this.dirty();
  }
  undo() {
    if (!this.undoStack.length) return;
    this.redoStack.push(this.snap());
    this.apply(this.undoStack.pop());
    this.syncHistory();
    this.status("Undone");
  }
  redo() {
    if (!this.redoStack.length) return;
    this.undoStack.push(this.snap());
    this.apply(this.redoStack.pop());
    this.syncHistory();
    this.status("Redone");
  }
  syncHistory() {
    this.undoBtn.disabled = !this.undoStack.length;
    this.redoBtn.disabled = !this.redoStack.length;
  }
  dirty() { this.engine.dirty = true; }

  // ---------- build ----------
  async start() {
    document.documentElement.classList.toggle("kit-thumb", this.thumb);
    document.documentElement.classList.toggle("kit-reduced", this.reducedMotion);
    this.buildDom();
    this.applyBackground();
    try {
      await this.engine.mount(this.canvas, this);
    } catch (err) {
      console.warn(err);
      this.status("This browser could not start the artwork.");
      return;
    }
    this.resize();
    if (this.state.data && this.engine.decode) {
      try { this.engine.decode(this.state.data); } catch { this.engine.build(); }
    } else this.engine.build();
    this.syncUI();
    this.syncHistory();
    addEventListener("resize", () => this.resize());
    addEventListener("beforeprint", () => this.preparePrint());
    document.addEventListener("visibilitychange", () => { this.last = performance.now(); });
    this.last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      if (!document.hidden && !this.paused) this.engine.frame(dt, now / 1000);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    document.documentElement.classList.add("kit-ready");
    window.__studio = this;
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, this.engine.maxDpr || 2);
    this.cssW = Math.max(1, Math.round(r.width));
    this.cssH = Math.max(1, Math.round(r.height));
    this.engine.resize(this.cssW, this.cssH, dpr);
    this.dirty();
  }

  applyBackground() {
    const bg = this.background;
    document.documentElement.style.setProperty("--art-bg", bg.colour);
    document.documentElement.classList.toggle("kit-dark", bg.dark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", bg.colour);
  }

  buildDom() {
    const e = this.engine, c = this.cfg;
    const root = el("main", { class: "kit", id: "kit" });
    this.canvas = el("canvas", { class: "kit-canvas", id: "art", tabindex: "0", role: "img", "aria-label": `${c.title}: your artwork. Use the tools below, or arrow keys and Space.` });
    root.append(this.canvas);

    const top = el("header", { class: "kit-top" }, `
      <div class="kit-title"><a class="kit-brand" href="/discover/#create" aria-label="Back to assembl lab">assembl lab</a><h1>${esc(c.title)}</h1><p>${esc(c.hook)}</p></div>
      <div class="kit-top-actions">
        <button class="kit-round" id="kit-undo" aria-label="Undo" title="Undo">${icon("undo")}</button>
        <button class="kit-round" id="kit-redo" aria-label="Redo" title="Redo">${icon("redo")}</button>
        <button class="kit-save" id="kit-save-open">${icon("save", 20)}<span>Save</span></button>
      </div>`);
    root.append(top);

    const cue = el("div", { class: "kit-cue", "aria-hidden": "true" }, `<span class="kit-ring"></span><p></p>`);
    root.append(cue);
    this.cueEl = cue;

    const tray = el("section", { class: "kit-tray", "aria-label": "Art tools" });
    const tools = el("div", { class: "kit-tools", role: "toolbar", "aria-label": "Tools" });
    for (const t of e.tools || []) {
      tools.append(el("button", { class: "kit-tool", "data-tool": t.id, "aria-pressed": "false", title: t.tip || t.label }, `${icon(t.icon)}<span>${esc(t.label)}</span>`));
    }
    if (e.actions?.length) tools.append(el("span", { class: "kit-divider", "aria-hidden": "true" }));
    for (const a of e.actions || []) {
      tools.append(el("button", { class: "kit-tool kit-action", "data-action": a.id, title: a.tip || a.label }, `${icon(a.icon)}<span>${esc(a.label)}</span>`));
    }
    tools.append(el("button", { class: "kit-tool kit-more", id: "kit-more-open", "aria-haspopup": "dialog" }, `${icon("more")}<span>More</span>`));
    const colours = el("div", { class: "kit-colours" });
    colours.append(el("div", { class: "kit-swatches", role: "group", "aria-label": "Colour" }));
    colours.append(el("button", { class: "kit-chip", id: "kit-palette-open", "aria-haspopup": "dialog", title: "Choose colours" }, `${icon("palette", 20)}<span id="kit-palette-name"></span>`));
    colours.append(el("button", { class: "kit-chip kit-surprise", id: "kit-surprise", title: "A fresh random picture" }, `${icon("dice", 20)}<span>Surprise</span>`));
    tray.append(tools, colours);
    root.append(tray);

    // More sheet
    const more = el("dialog", { class: "kit-sheet", id: "kit-more", "aria-labelledby": "kit-more-title" });
    more.innerHTML = `
      <div class="kit-sheet-head"><h2 id="kit-more-title">Make it yours</h2><button class="kit-round" data-close aria-label="Close">${icon("close")}</button></div>
      ${e.starts?.length ? `<p class="kit-label">Start from</p><div class="kit-starts" role="group" aria-label="Starting pictures">${e.starts.map((s) => `<button data-start="${s.id}" aria-pressed="false">${esc(s.label)}</button>`).join("")}</div>` : ""}
      ${(e.options || []).map((o) => `<p class="kit-label">${esc(o.label)}</p><div class="kit-seg" role="group" aria-label="${esc(o.label)}" data-opt="${o.id}">${o.choices.map((ch) => `<button data-choice="${ch.id}" aria-pressed="false">${esc(ch.label)}</button>`).join("")}</div>`).join("")}
      ${(e.sliders || []).map((s) => `<label class="kit-slider"><span>${esc(s.label)}</span><input type="range" data-slider="${s.id}" min="${s.min}" max="${s.max}" step="${s.step || 1}"></label>`).join("")}
      <p class="kit-label">Background</p>
      <div class="kit-seg" role="group" aria-label="Background">${BACKGROUNDS.map((b, i) => `<button data-bg="${i}" aria-pressed="false"><i style="background:${b.colour}"></i>${b.name}</button>`).join("")}</div>
      <div class="kit-seed"><label><span class="kit-label">Seed number</span><input id="kit-seed" type="number" min="1" max="999999" inputmode="numeric"></label><button id="kit-seed-go">${icon("rebuild", 18)}Make it</button></div>
      <p class="kit-small">The same seed and settings always make the same starting picture.</p>
      <div class="kit-row"><button id="kit-reset">${icon("reset", 18)}Start again</button><button id="kit-pause" aria-pressed="false">${icon("pause", 18)}Pause</button></div>
      <details class="kit-how"><summary>${icon("info", 18)}How did that happen?</summary><div class="kit-how-cards">${(e.how || []).map((h) => `<figure>${h.svg || ""}<figcaption><b>${esc(h.title)}</b>${esc(h.text)}</figcaption></figure>`).join("")}</div></details>
      ${c.classic ? `<p class="kit-small"><a href="${c.classic}">${esc(c.classicLabel || "Open the older 3D version")}</a></p>` : ""}
      <p class="kit-privacy">${PRIVACY}</p>`;
    root.append(more);

    // Palette sheet
    const pal = el("dialog", { class: "kit-sheet kit-sheet-small", id: "kit-palettes", "aria-labelledby": "kit-pal-title" });
    pal.innerHTML = `<div class="kit-sheet-head"><h2 id="kit-pal-title">Colours</h2><button class="kit-round" data-close aria-label="Close">${icon("close")}</button></div>
      <div class="kit-palettes">${PALETTES.map((p, i) => `<button data-palette="${i}" aria-pressed="false"><span class="kit-strip">${p.colours.map((c) => `<i style="background:${c}"></i>`).join("")}</span>${p.name}</button>`).join("")}</div>`;
    root.append(pal);

    // Save sheet
    const save = el("dialog", { class: "kit-sheet", id: "kit-save", "aria-labelledby": "kit-save-title" });
    save.innerHTML = `
      <div class="kit-sheet-head"><h2 id="kit-save-title">Keep your art</h2><button class="kit-round" data-close aria-label="Close">${icon("close")}</button></div>
      <div class="kit-save-grid">
        <figure class="kit-preview"><img id="kit-preview" alt="Preview of your artwork"></figure>
        <div>
          <label class="kit-field"><span>Name your artwork</span><input id="kit-art-title" maxlength="48" placeholder="My ${esc(c.title)}" autocomplete="off"></label>
          <label class="kit-field"><span>Your first name <em>(optional)</em></span><input id="kit-art-name" maxlength="24" placeholder="Only printed on your page" autocomplete="off"></label>
          <div class="kit-save-actions">
            <button id="kit-download">${icon("save", 20)}Download picture</button>
            <button id="kit-share">${icon("share", 20)}Share</button>
            <button id="kit-print">${icon("print", 20)}Print my art</button>
            <button id="kit-a4">${icon("save", 20)}A4 poster file</button>
            <button id="kit-link">${icon("link", 20)}Copy remix link</button>
            <button id="kit-video" hidden>${icon("video", 20)}Record 5 s video</button>
          </div>
          <input id="kit-link-field" class="kit-link-field" readonly hidden aria-label="Remix link">
          <p class="kit-small" id="kit-save-status" role="status"></p>
          <p class="kit-small">Picture: ${c.exportNote || "twice your screen size"}. A4 poster: 2480 × 3508 px (300 dpi). The remix link holds the seed and settings, not your picture, so a friend starts where you started.</p>
          <p class="kit-privacy">${PRIVACY} Your title and name stay on this page.</p>
        </div>
      </div>`;
    root.append(save);

    this.statusEl = el("p", { class: "kit-status", role: "status", "aria-live": "polite" });
    this.toastEl = el("div", { class: "kit-toast", "aria-hidden": "true" });
    root.append(this.statusEl, this.toastEl);

    const print = el("section", { class: "kit-print", id: "kit-print", "aria-hidden": "true" }, `
      <div class="kit-print-art"><canvas id="kit-print-canvas"></canvas></div>
      <h2 id="kit-print-title"></h2><p id="kit-print-by"></p>
      <footer><span id="kit-print-date"></span><span>made with assembl lab · ${esc(c.title)}</span></footer>`);
    document.body.append(root, print);
    this.wire();
  }

  wire() {
    const $ = (s) => document.querySelector(s);
    const e = this.engine;
    this.undoBtn = $("#kit-undo");
    this.redoBtn = $("#kit-redo");
    this.undoBtn.onclick = () => this.undo();
    this.redoBtn.onclick = () => this.redo();
    document.querySelectorAll("[data-tool]").forEach((b) => (b.onclick = () => { this.state.tool = b.dataset.tool; this.syncUI(); this.showCue(true); }));
    document.querySelectorAll("[data-action]").forEach((b) => (b.onclick = () => {
      const a = e.actions.find((x) => x.id === b.dataset.action);
      if (a.history !== false) this.commit();
      a.run(this);
      this.dirty();
    }));
    const sheets = ["#kit-more", "#kit-palettes", "#kit-save"].map((s) => $(s));
    sheets.forEach((d) => {
      d.querySelector("[data-close]").onclick = () => d.close();
      d.addEventListener("click", (ev) => { if (ev.target === d) d.close(); });
    });
    $("#kit-more-open").onclick = () => { this.syncUI(); $("#kit-more").showModal(); };
    $("#kit-palette-open").onclick = () => { this.syncUI(); $("#kit-palettes").showModal(); };
    $("#kit-save-open").onclick = () => this.openSave();
    $("#kit-surprise").onclick = () => this.surprise();
    document.querySelectorAll("[data-palette]").forEach((b) => (b.onclick = () => {
      this.commit();
      this.state.palette = +b.dataset.palette;
      this.engine.recolour ? this.engine.recolour() : this.engine.build();
      this.syncUI(); this.dirty();
      $("#kit-palettes").close();
      this.toast(this.palette.name);
    }));
    document.querySelectorAll("[data-bg]").forEach((b) => (b.onclick = () => {
      this.commit();
      this.state.bg = +b.dataset.bg;
      this.applyBackground();
      this.engine.recolour?.();
      this.syncUI(); this.dirty();
    }));
    document.querySelectorAll("[data-start]").forEach((b) => (b.onclick = () => {
      this.commit();
      this.state.start = b.dataset.start;
      this.state.data = "";
      this.engine.build();
      this.syncUI(); this.dirty();
      $("#kit-more").close();
    }));
    document.querySelectorAll("[data-opt]").forEach((g) => g.querySelectorAll("[data-choice]").forEach((b) => (b.onclick = () => {
      this.commit();
      this.state.opts[g.dataset.opt] = b.dataset.choice;
      this.engine.option?.(g.dataset.opt, b.dataset.choice);
      this.syncUI(); this.dirty();
    })));
    document.querySelectorAll("[data-slider]").forEach((inp) => {
      let committed = false;
      inp.addEventListener("pointerdown", () => { committed = false; });
      inp.addEventListener("input", () => {
        if (!committed) { this.commit(); committed = true; }
        this.state.values[inp.dataset.slider] = +inp.value;
        this.engine.slider?.(inp.dataset.slider, +inp.value);
        this.dirty();
      });
      inp.addEventListener("change", () => { committed = false; });
    });
    $("#kit-seed-go").onclick = () => {
      const v = clamp(parseInt($("#kit-seed").value, 10) || 1, 1, 999999);
      this.commit();
      this.state.seed = v;
      this.state.data = "";
      this.engine.build();
      this.syncUI(); this.dirty();
      this.toast(`Seed ${v}`);
    };
    $("#kit-reset").onclick = () => {
      this.commit();
      this.state.data = "";
      this.engine.build();
      this.dirty();
      $("#kit-more").close();
      this.toast("Fresh start · Undo brings it back");
    };
    $("#kit-pause").onclick = () => {
      this.paused = !this.paused;
      $("#kit-pause").setAttribute("aria-pressed", String(this.paused));
      $("#kit-pause").lastChild.textContent = this.paused ? "Play" : "Pause";
    };
    // save sheet
    $("#kit-download").onclick = () => this.downloadPicture();
    $("#kit-a4").onclick = () => this.downloadPoster();
    $("#kit-print").onclick = () => { this.preparePrint(); window.print(); };
    $("#kit-share").onclick = () => this.share();
    $("#kit-link").onclick = () => this.copyLink();
    if (typeof MediaRecorder !== "undefined" && this.canvas.captureStream) {
      $("#kit-video").hidden = false;
      $("#kit-video").onclick = () => this.record();
    }
    this.bindPointer();
    addEventListener("keydown", (ev) => {
      if (ev.target.closest("input, textarea, dialog[open]")) return;
      const k = ev.key.toLowerCase();
      if ((ev.ctrlKey || ev.metaKey) && k === "z") { ev.preventDefault(); ev.shiftKey ? this.redo() : this.undo(); }
      else if ((ev.ctrlKey || ev.metaKey) && k === "y") { ev.preventDefault(); this.redo(); }
    });
  }

  syncUI() {
    const s = this.state;
    document.querySelectorAll("[data-tool]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tool === s.tool)));
    document.querySelectorAll("[data-palette]").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.palette === s.palette)));
    document.querySelectorAll("[data-bg]").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.bg === s.bg)));
    document.querySelectorAll("[data-start]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.start === s.start)));
    document.querySelectorAll("[data-opt]").forEach((g) => g.querySelectorAll("[data-choice]").forEach((b) => b.setAttribute("aria-pressed", String(s.opts[g.dataset.opt] === b.dataset.choice))));
    document.querySelectorAll("[data-slider]").forEach((i) => (i.value = s.values[i.dataset.slider]));
    const seed = document.querySelector("#kit-seed");
    if (seed) seed.value = s.seed;
    document.querySelector("#kit-palette-name").textContent = this.palette.name;
    const sw = document.querySelector(".kit-swatches");
    sw.innerHTML = this.colours.map((c, i) => `<button class="kit-swatch" style="--c:${c}" data-colour="${i}" aria-label="Colour ${i + 1}" aria-pressed="${i === s.colour}"></button>`).join("");
    sw.querySelectorAll("[data-colour]").forEach((b) => (b.onclick = () => { this.state.colour = +b.dataset.colour; this.syncUI(); this.engine.colourChanged?.(); }));
    this.applyBackground();
  }

  surprise() {
    this.commit();
    const r = rng(randomSeed());
    const e = this.engine;
    this.state.seed = randomSeed();
    this.state.palette = Math.floor(r() * PALETTES.length);
    this.state.bg = r() < 0.6 ? 0 : Math.floor(r() * BACKGROUNDS.length);
    this.state.colour = Math.floor(r() * 6);
    if (e.starts?.length) this.state.start = (e.surpriseStarts || e.starts.map((x) => x.id))[Math.floor(r() * (e.surpriseStarts || e.starts).length)];
    for (const s of e.sliders || []) if (s.surprise !== false) this.state.values[s.id] = Math.round((s.min + (s.max - s.min) * (0.25 + 0.5 * r())) / (s.step || 1)) * (s.step || 1);
    this.state.data = "";
    this.applyBackground();
    e.build();
    this.syncUI();
    this.dirty();
    this.toast(`${this.palette.name} · seed ${this.state.seed}`);
  }

  // ---------- pointer + keyboard ----------
  bindPointer() {
    const c = this.canvas;
    let active = null;
    const pos = (ev) => {
      const r = c.getBoundingClientRect();
      return [ev.clientX - r.left, ev.clientY - r.top];
    };
    c.addEventListener("pointerdown", (ev) => {
      if (active !== null) return;
      active = ev.pointerId;
      c.setPointerCapture?.(ev.pointerId);
      this.firstTouch();
      if (this.engine.edits !== false) this.commit();
      const [x, y] = pos(ev);
      this.engine.pointer("down", x, y, ev);
      this.dirty();
    });
    c.addEventListener("pointermove", (ev) => {
      const [x, y] = pos(ev);
      if (ev.pointerId !== active) { if (ev.pointerType === "mouse") this.engine.pointer("hover", x, y, ev); return; }
      const evs = ev.getCoalescedEvents?.() || [ev];
      for (const ce of evs) { const [cx, cy] = pos(ce); this.engine.pointer("move", cx, cy, ce); }
      this.dirty();
    });
    const up = (ev) => {
      if (ev.pointerId !== active) return;
      active = null;
      const [x, y] = pos(ev);
      this.engine.pointer("up", x, y, ev);
      this.dirty();
    };
    c.addEventListener("pointerup", up);
    c.addEventListener("pointercancel", up);
    c.addEventListener("pointerleave", (ev) => { if (ev.pointerType === "mouse" && active === null) this.engine.pointer("leave", 0, 0, ev); });
    // keyboard: arrows move a cursor and make a short stroke; Space/Enter taps.
    let kx = null, ky = null;
    c.addEventListener("keydown", (ev) => {
      const step = Math.max(this.cssW, this.cssH) * 0.03;
      const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[ev.key];
      if (kx === null) { kx = this.cssW / 2; ky = this.cssH / 2; }
      if (d) {
        ev.preventDefault();
        this.firstTouch();
        this.commit();
        this.engine.pointer("down", kx, ky, { keyboard: true });
        kx = clamp(kx + d[0], 0, this.cssW); ky = clamp(ky + d[1], 0, this.cssH);
        for (let i = 1; i <= 4; i++) this.engine.pointer("move", kx - d[0] * (1 - i / 4), ky - d[1] * (1 - i / 4), { keyboard: true });
        this.engine.pointer("up", kx, ky, { keyboard: true });
        this.dirty();
      } else if (ev.key === " " || ev.key === "Enter") {
        ev.preventDefault();
        this.firstTouch();
        this.commit();
        this.engine.pointer("down", kx, ky, { keyboard: true });
        this.engine.pointer("up", kx, ky, { keyboard: true });
        this.dirty();
      }
    });
  }

  showCue(fromTool) {
    const e = this.engine;
    const tool = (e.tools || []).find((t) => t.id === this.state.tool);
    const cue = this.cueEl;
    if (this.thumb) return;
    if (fromTool && this.touched) {
      this.toast(tool?.cue || tool?.label || "");
      return;
    }
    const [fx, fy] = e.cueAt || [0.5, 0.45];
    cue.style.left = `${fx * 100}%`;
    cue.style.top = `${fy * 100}%`;
    cue.querySelector("p").textContent = tool?.cue || "Touch the picture";
    cue.classList.add("show");
  }
  firstTouch() {
    if (this.touched) return;
    this.touched = true;
    this.cueEl.classList.remove("show");
  }

  // ---------- exports ----------
  artTitle() { return document.querySelector("#kit-art-title").value.trim() || `My ${this.cfg.title}`; }
  artName() { return document.querySelector("#kit-art-name").value.trim(); }
  fileName(suffix) {
    const t = this.artTitle().toLowerCase().replace(/[^a-z0-9āēīōū]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "artwork";
    return `${t}-${suffix}.png`;
  }
  renderArt(w, h) {
    const out = this.engine.render(w, h);
    return out;
  }
  picture() {
    const { w, h } = exportSize(this.cssW, this.cssH, 2, this.engine.maxExport || 4096);
    return this.renderArt(w, h);
  }
  async poster() {
    await document.fonts?.load?.("600 80px 'Instrument Sans'").catch(() => {});
    const c = document.createElement("canvas");
    c.width = A4.w; c.height = A4.h;
    const g = c.getContext("2d");
    g.fillStyle = "#F8F4EF"; g.fillRect(0, 0, A4.w, A4.h);
    const m = 150, boxW = A4.w - m * 2, boxH = A4.h - m * 2 - 520;
    const fit = contain(this.cssW, this.cssH, boxW, boxH);
    const art = this.renderArt(fit.w, fit.h);
    g.save();
    g.shadowColor = "rgba(36,11,33,.18)"; g.shadowBlur = 40; g.shadowOffsetY = 12;
    g.fillStyle = this.background.colour;
    g.fillRect(m + fit.x, m + fit.y, fit.w, fit.h);
    g.restore();
    g.drawImage(art, m + fit.x, m + fit.y, fit.w, fit.h);
    const ty = m + boxH + 170;
    g.fillStyle = "#240B21";
    g.font = "600 112px 'Instrument Sans', system-ui, sans-serif";
    g.textBaseline = "alphabetic";
    g.fillText(this.artTitle().slice(0, 48), m, ty, boxW);
    const by = this.artName();
    g.fillStyle = "#654A4E";
    g.font = "400 64px 'Instrument Sans', system-ui, sans-serif";
    if (by) g.fillText(`by ${by}`, m, ty + 100, boxW);
    g.font = "400 40px 'IBM Plex Mono', ui-monospace, monospace";
    g.fillStyle = "#916A70";
    g.fillText(niceDate(), m, A4.h - m + 20);
    g.textAlign = "right";
    g.fillText(`made with assembl lab · ${this.cfg.title}`, A4.w - m, A4.h - m + 20);
    return c;
  }
  toBlob(canvas) {
    return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("PNG failed"))), "image/png"));
  }
  download(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  saveStatus(msg) { document.querySelector("#kit-save-status").textContent = msg; }
  async openSave() {
    const d = document.querySelector("#kit-save");
    d.showModal();
    this.saveStatus("");
    const k = Math.min(1, 900 / Math.max(this.cssW, this.cssH));
    const prev = this.renderArt(Math.round(this.cssW * k), Math.round(this.cssH * k));
    const img = document.querySelector("#kit-preview");
    img.src = prev.toDataURL("image/png");
    img.style.background = this.background.colour;
  }
  async downloadPicture() {
    this.saveStatus("Making your picture…");
    const c = this.picture();
    this.download(await this.toBlob(c), this.fileName(`${c.width}x${c.height}`));
    this.saveStatus(`Saved a ${c.width} × ${c.height} PNG.`);
  }
  async downloadPoster() {
    this.saveStatus("Making your A4 poster…");
    const c = await this.poster();
    this.download(await this.toBlob(c), this.fileName("a4-poster"));
    this.saveStatus("Saved an A4 poster PNG (2480 × 3508, 300 dpi).");
  }
  async share() {
    const c = this.picture();
    const blob = await this.toBlob(c);
    const file = new File([blob], this.fileName("art"), { type: "image/png" });
    const data = { files: [file], title: this.artTitle(), text: `${this.artTitle()} · made with assembl lab` };
    if (navigator.canShare?.(data) && navigator.share) {
      try {
        await navigator.share(data);
        this.saveStatus("Shared. Nothing was uploaded by assembl lab.");
      } catch (err) {
        this.saveStatus(err?.name === "AbortError" ? "Share cancelled." : "Sharing did not work here, so we downloaded it instead.");
        if (err?.name !== "AbortError") this.download(blob, file.name);
      }
    } else {
      this.download(blob, file.name);
      this.saveStatus("This browser can't share files, so we downloaded it. Share it from your photos or files.");
    }
  }
  shareUrl() {
    const st = { ...this.state, data: this.engine.encode?.() || "" };
    let q = encodeState(st, this.engine.sliders || []);
    const o = (this.engine.options || []).map((x) => `${x.id}:${this.state.opts[x.id]}`).join(",");
    if (o) q += `&o=${encodeURIComponent(o)}`.replace(/%3A/g, ":").replace(/%2C/g, ",");
    return `${location.origin}${location.pathname}?${q}`;
  }
  async copyLink() {
    const url = this.shareUrl();
    const f = document.querySelector("#kit-link-field");
    f.value = url;
    f.hidden = false;
    try {
      await navigator.clipboard.writeText(url);
      this.saveStatus(this.engine.encode?.() ? "Link copied. It rebuilds this picture so a friend can remix it." : "Link copied. It holds your seed and settings, so a friend starts from the same picture.");
    } catch {
      f.select();
      this.saveStatus("Copy the link above.");
    }
  }
  preparePrint() {
    const pc = document.querySelector("#kit-print-canvas");
    const fit = contain(this.cssW, this.cssH, 1600, 1900);
    const art = this.renderArt(fit.w, fit.h);
    pc.width = fit.w; pc.height = fit.h;
    const g = pc.getContext("2d");
    g.fillStyle = this.background.colour;
    g.fillRect(0, 0, fit.w, fit.h);
    g.drawImage(art, 0, 0);
    document.querySelector("#kit-print-title").textContent = this.artTitle();
    const by = this.artName();
    document.querySelector("#kit-print-by").textContent = by ? `by ${by}` : "";
    document.querySelector("#kit-print-date").textContent = niceDate();
    const mm = contain(fit.w, fit.h, 182, 196);
    pc.style.width = `${mm.w}mm`;
    pc.style.height = `${mm.h}mm`;
  }
  async record() {
    const btn = document.querySelector("#kit-video");
    const types = ["video/mp4;codecs=avc1", "video/webm;codecs=vp9", "video/webm"];
    const type = types.find((t) => MediaRecorder.isTypeSupported?.(t)) || "";
    let rec;
    try {
      const stream = this.canvas.captureStream(30);
      rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    } catch {
      this.saveStatus("Video recording isn't available in this browser.");
      return;
    }
    const chunks = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: rec.mimeType || "video/webm" });
      const ext = (rec.mimeType || "").includes("mp4") ? "mp4" : "webm";
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = this.fileName("video").replace(/\.png$/, `.${ext}`);
      a.click();
      btn.disabled = false;
      this.saveStatus(`Saved a 5-second ${ext.toUpperCase()} at screen size.`);
    };
    document.querySelector("#kit-save").close();
    this.toast("Recording 5 seconds · keep playing!");
    btn.disabled = true;
    this.engine.recording = true;
    rec.start();
    setTimeout(() => { rec.stop(); this.engine.recording = false; }, 5000);
  }
}

export async function launch(cfg) {
  const s = new Studio(cfg);
  await s.start();
  setTimeout(() => s.showCue(false), s.thumb ? 0 : 600);
  return s;
}
