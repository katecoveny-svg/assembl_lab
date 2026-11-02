// Liquid Playground: pour, stir and marble coloured liquid, then keep it.
import { launch } from "../kit/studio.js";
import { hexToRgb } from "../kit/core.js";
import { createFluid, addParticle, removeParticle, stepFluid } from "./fluid.js";

const STEP = 1 / 60;
const svgCrowd = `<svg viewBox="0 0 76 76" aria-hidden="true"><g fill="#A9C9F2">${[[20, 30], [30, 26], [26, 38], [38, 34], [34, 46], [46, 40], [44, 28], [54, 34]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5"/>`).join("")}</g><circle cx="38" cy="34" r="16" fill="none" stroke="#492B3E" stroke-dasharray="2 3"/><path d="M12 60h52" stroke="#492B3E" stroke-width="1.4"/></svg>`;
const svgBlob = `<svg viewBox="0 0 76 76" aria-hidden="true"><g fill="#F3A5BE" opacity=".45">${[[26, 34], [34, 30], [42, 36], [32, 42], [48, 42]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9"/>`).join("")}</g><path d="M18 36c2-12 26-14 36 0 4 8-4 14-14 14s-24-4-22-14z" fill="none" stroke="#492B3E" stroke-width="1.6"/></svg>`;
const svgMarble = `<svg viewBox="0 0 76 76" aria-hidden="true"><path d="M8 20c20-8 40 8 60 0v14c-20 8-40-8-60 0z" fill="#C7B4F0"/><path d="M8 34c20-8 40 8 60 0v14c-20 8-40-8-60 0z" fill="#F6B48E"/><path d="M8 48c20-8 40 8 60 0v14c-20 8-40-8-60 0z" fill="#A7DEC7"/></svg>`;

const engine = {
  tools: [
    { id: "pour", label: "Pour", icon: "pour", cue: "Hold to pour colour" },
    { id: "stir", label: "Stir", icon: "swirl", cue: "Hold to stir" },
    { id: "push", label: "Push", icon: "push", cue: "Drag to push the liquid" },
    { id: "sponge", label: "Sponge", icon: "erase", cue: "Rub to soak it up" },
  ],
  actions: [
    { id: "keep", label: "Keep", icon: "keep", tip: "Set this liquid into your picture and pour more on top", run: () => engine.keep() },
    { id: "shake", label: "Shake", icon: "bolt", tip: "Slosh it about", run: () => engine.shake() },
  ],
  starts: [
    { id: "drops", label: "Floating drops" },
    { id: "marble", label: "Marble stripes" },
    { id: "pool", label: "Colour pool" },
    { id: "blank", label: "Empty" },
  ],
  surpriseStarts: ["drops", "marble", "pool"],
  options: [
    { id: "gravity", label: "Gravity", value: "float", choices: [{ id: "float", label: "Float" }, { id: "down", label: "Down" }, { id: "up", label: "Up" }] },
    { id: "look", label: "Look", value: "glossy", choices: [{ id: "glossy", label: "Glossy" }, { id: "flat", label: "Flat" }] },
  ],
  sliders: [{ id: "brush", label: "Brush size", min: 20, max: 100, value: 50 }],
  how: [
    { title: "Crowded drops push apart", text: "The liquid is about a thousand tiny drops. Each one counts its neighbours. Too crowded and they push apart; too spread out and they pull together. That makes it slosh and bead up.", svg: svgCrowd },
    { title: "Drawing a smooth surface", text: "Each drop is painted as a soft glow, and anywhere the glow is strong enough becomes liquid. That's why drops merge into one smooth puddle.", svg: svgBlob },
    { title: "Marbling, not mixing", text: "Colours stay with their drops, so stirring makes marbled swirls rather than one muddy colour. It's a playful model (Clavet et al. 2005), not a real fluid simulation.", svg: svgMarble },
  ],
  cueAt: [0.5, 0.42],
  dirty: true,

  mount(canvas, studio) {
    this.c = canvas;
    this.s = studio;
    this.g = canvas.getContext("2d");
    this.max = Math.min(innerWidth, innerHeight) < 600 ? 950 : 1400;
    this.f = createFluid({ max: this.max, h: 0.055 });
    this.kept = [];
    this.acc = 0;
    this.field = document.createElement("canvas");
    this.fg = this.field.getContext("2d", { willReadFrequently: true });
  },
  resize(w, h, dpr) {
    this.w = w; this.h = h; this.dpr = dpr;
    this.c.width = Math.round(w * dpr); this.c.height = Math.round(h * dpr);
    this.unit = Math.min(w, h) / 2;
    this.ax = w / Math.min(w, h); this.ay = h / Math.min(w, h);
    this.keptCache = null;
    this.dirty = true;
  },
  floorY() {
    const t = document.querySelector(".kit-tray")?.getBoundingClientRect();
    if (!t || this.s.opt("gravity") !== "down") return this.ay;
    return Math.min(this.ay, (t.top - 6 - this.h / 2) / this.unit);
  },
  build() {
    const r = this.s.random(13), K = this.s.colours.length, ax = this.ax, ay = this.ay, start = this.s.state.start;
    const urlFirst = !this._built && this.s.params.get("o");
    this._built = true;
    const setG = (v) => { if (!urlFirst) this.s.state.opts.gravity = v; };
    this.f.n = 0;
    this.kept = [];
    this.keptCache = null;
    const sp = 0.026;
    const blob = (cx, cy, rad, ci) => { for (let y = -rad; y <= rad; y += sp) for (let x = -rad; x <= rad; x += sp) if (x * x + y * y <= rad * rad) addParticle(this.f, cx + x + r.range(-0.003, 0.003), cy + y, ci); };
    if (start === "drops") {
      setG("float");
      const n = r.int(6, 9);
      for (let i = 0; i < n; i++) blob(r.range(-ax * 0.7, ax * 0.7), r.range(-ay * 0.65, ay * 0.55), r.range(0.1, 0.2), i % K);
    } else if (start === "marble") {
      setG("float");
      const sm = 0.024, bands = Math.min(K, 4), half = ax * 0.55, total = (this.max * 0.82 * sm * sm) / (2 * half), hgt = total / bands, top = -total / 2 - 0.1;
      for (let b = 0; b < bands; b++) for (let y = 0; y < hgt; y += sm) for (let x = -half; x <= half; x += sm) {
        if (this.f.n >= this.max * 0.9) break;
        addParticle(this.f, x, top + b * hgt + y + Math.sin(x * 4 + b * 1.3) * 0.03, (b * 2) % K);
      }
    } else if (start === "pool") {
      setG("down");
      const fl = this.floorY();
      for (let y = 0; y < 0.42; y += sp) for (let x = -ax * 0.95; x <= ax * 0.95; x += sp) {
        if (this.f.n >= this.max * 0.85) break;
        addParticle(this.f, x, fl - 0.02 - y, Math.floor(((x + ax) / (2 * ax)) * K * 0.999));
      }
    }
    this.dirty = true;
  },
  recolour() { this.keptCache = null; this.dirty = true; },
  option(id) { if (id === "look") this.keptCache = null; this.dirty = true; },
  slider() {},
  toUnits(px, py) { return [(px - this.w / 2) / this.unit, (py - this.h / 2) / this.unit]; },
  get R() { return 0.06 + (this.s.value("brush") / 100) * 0.22; },
  pointer(kind, px, py) {
    const [x, y] = this.toUnits(px, py);
    if (kind === "down") { this.down = true; this.pt = [x, y]; this.vel = [0, 0]; }
    else if (kind === "move" && this.down) { this.vel = [(x - this.pt[0]) * 30, (y - this.pt[1]) * 30]; this.pt = [x, y]; }
    else if (kind === "up") { this.down = false; this.pt = null; }
    this.dirty = true;
  },
  keep() {
    const f = this.f;
    if (!f.n) { this.s.toast("Pour some colour first"); return; }
    for (let i = 0; i < f.n; i++) this.kept.push(f.x[i], f.y[i], f.ci[i]);
    f.n = 0;
    this.keptCache = null;
    this.s.toast("Kept! Pour more on top");
  },
  shake() { const f = this.f; for (let i = 0; i < f.n; i++) { f.vx[i] += (Math.random() - 0.5) * 2.4; f.vy[i] += (Math.random() - 0.5) * 2.4 - 0.6; } },
  frame(dt) {
    this.acc = Math.min(this.acc + dt, STEP * 3);
    const f = this.f, tool = this.s.state.tool;
    let stepped = false;
    while (this.acc >= STEP) {
      let stir = null;
      if (this.down && this.pt) {
        const [x, y] = this.pt, R = this.R;
        if (tool === "pour") {
          const n = Math.max(1, Math.round(R * 22));
          for (let k = 0; k < n; k++) { const a = Math.random() * 6.283, d = Math.sqrt(Math.random()) * R * 0.45; if (!addParticle(f, x + Math.cos(a) * d, y + Math.sin(a) * d, this.s.state.colour, this.vel[0] * 0.5, this.vel[1] * 0.5 + 0.3)) { if (!this.fullWarned) { this.fullWarned = true; this.s.toast("Full! Tap Keep to set it and pour more"); } break; } }
        } else if (tool === "stir") stir = { kind: "swirl", x, y, r: R * 1.4 };
        else if (tool === "push") stir = { kind: "push", x, y, r: R * 1.2, vx: this.vel[0], vy: this.vel[1] };
        else if (tool === "sponge") for (let i = f.n - 1; i >= 0; i--) if (Math.hypot(f.x[i] - x, f.y[i] - y) < R * 0.8) removeParticle(f, i);
        this.vel[0] *= 0.8; this.vel[1] *= 0.8;
      }
      const gv = this.s.opt("gravity"), fl = this.floorY();
      stepFluid(f, { dt: STEP, gx: 0, gy: gv === "down" ? 2.4 : gv === "up" ? -2.4 : 0, ax: this.ax, ay: this.ay, stir });
      if (gv === "down") for (let i = 0; i < f.n; i++) if (f.y[i] > fl) { f.y[i] = fl; f.vy[i] = Math.min(0, f.vy[i]); }
      this.acc -= STEP;
      stepped = true;
    }
    let moving = this.down, sp = 0, cnt = 0;
    for (let i = 0; i < f.n; i += 5) { sp += Math.abs(f.vx[i]) + Math.abs(f.vy[i]); cnt++; }
    if (cnt && sp / cnt > 0.025) moving = true;
    if ((stepped && moving) || this.dirty) { this.draw(this.g, this.c.width, this.c.height); this.dirty = false; }
  },
  // Paint each drop as a soft glow at low resolution, keep strong glow as liquid.
  surface(xs, ys, cs, n, W, H, scale) {
    const fw = Math.max(1, Math.ceil(W / scale)), fh = Math.max(1, Math.ceil(H / scale));
    const fc = document.createElement("canvas");
    fc.width = fw; fc.height = fh;
    const g = fc.getContext("2d", { willReadFrequently: true });
    const U = Math.min(fw, fh) / 2, rad = 0.038 * U;
    const sprites = this.sprites(rad);
    for (let i = 0; i < n; i++) {
      const X = fw / 2 + xs(i) * U, Y = fh / 2 + ys(i) * U;
      g.drawImage(sprites[cs(i) % sprites.length], X - rad * 2, Y - rad * 2);
    }
    const img = g.getImageData(0, 0, fw, fh), d = img.data;
    for (let p = 3; p < d.length; p += 4) {
      const a = d[p];
      d[p] = a < 78 ? 0 : a > 146 ? 255 : ((a - 78) / 68) * 255;
    }
    g.putImageData(img, 0, 0);
    return fc;
  },
  sprites(rad) {
    const key = this.s.state.palette + ":" + Math.round(rad * 10);
    if (this._spr?.key === key) return this._spr.list;
    const list = this.s.colours.map((hex) => {
      const c = document.createElement("canvas"), s = Math.ceil(rad * 4);
      c.width = c.height = s;
      const g = c.getContext("2d"), [r, gg, b] = hexToRgb(hex);
      const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      grd.addColorStop(0, `rgba(${r},${gg},${b},0.75)`);
      grd.addColorStop(0.5, `rgba(${r},${gg},${b},0.42)`);
      grd.addColorStop(1, `rgba(${r},${gg},${b},0)`);
      g.fillStyle = grd;
      g.fillRect(0, 0, s, s);
      return c;
    });
    this._spr = { key, list };
    return list;
  },
  paintLiquid(g, layer, W, H, dark) {
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = "low";
    g.drawImage(layer, 0, 0, W, H);
    if (this.s.opt("look") !== "glossy") return;
    const band = (dy) => {
      const c = document.createElement("canvas");
      c.width = layer.width; c.height = layer.height;
      const b = c.getContext("2d");
      b.drawImage(layer, 0, 0);
      b.globalCompositeOperation = "destination-out";
      b.drawImage(layer, 0, dy);
      return c;
    };
    g.save();
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = dark ? 0.45 : 0.6;
    g.drawImage(band(1.5), 0, 0, W, H);
    g.globalCompositeOperation = "multiply";
    g.globalAlpha = 0.35;
    g.drawImage(band(-1.5), 0, 0, W, H);
    g.restore();
  },
  draw(g, W, H, exportScale) {
    const bg = this.s.background, f = this.f;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
    g.fillStyle = bg.colour;
    g.fillRect(0, 0, W, H);
    const scale = exportScale || Math.max(2, 2 * this.dpr);
    const kn = this.kept.length / 3;
    if (kn) {
      if (exportScale || !this.keptCache || this.keptCache.W !== W) {
        const layer = this.surface((i) => this.kept[i * 3], (i) => this.kept[i * 3 + 1], (i) => this.kept[i * 3 + 2], kn, W, H, scale);
        const cache = document.createElement("canvas");
        cache.width = W; cache.height = H;
        this.paintLiquid(cache.getContext("2d"), layer, W, H, bg.dark);
        if (exportScale) g.drawImage(cache, 0, 0);
        else this.keptCache = Object.assign(cache, { W });
      }
      if (!exportScale) g.drawImage(this.keptCache, 0, 0);
    }
    if (f.n) {
      const layer = this.surface((i) => f.x[i], (i) => f.y[i], (i) => f.ci[i], f.n, W, H, scale);
      this.paintLiquid(g, layer, W, H, bg.dark);
    }
  },
  render(w, h) {
    const out = document.createElement("canvas");
    out.width = w; out.height = h;
    this.draw(out.getContext("2d"), w, h, Math.max(2, Math.ceil(Math.max(w, h) / 1400)));
    return out;
  },
  snapshot() { const f = this.f, n = f.n; return { n, x: f.x.slice(0, n), y: f.y.slice(0, n), ci: f.ci.slice(0, n), kept: this.kept.slice() }; },
  restore(sn) {
    const f = this.f;
    f.n = sn.n; f.x.set(sn.x); f.y.set(sn.y); f.ci.set(sn.ci); f.vx.fill(0); f.vy.fill(0);
    this.kept = sn.kept.slice();
    this.keptCache = null;
    this.dirty = true;
  },
  sig() { return this.f.n + "/" + this.kept.length; },
};

launch({
  title: "Liquid Playground",
  hook: "Pour, stir and marble colour. Keep the swirl you love.",
  engine,
  palette: 0,
  bg: 1,
  seed: 512,
  classic: "../liquid-playground-3d/",
  classicLabel: "Try the older experimental 3D liquid",
});
