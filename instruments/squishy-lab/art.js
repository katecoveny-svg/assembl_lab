// Squishy Lab: design your own squishy, squeeze it, then stamp poses
// onto a sticker sheet you can download or print.
import { launch } from "../kit/studio.js";
import { makeBody, stepBodies, drawBody, inside, copyBody, centroid } from "../kit/jelly.js";

const STEP = 1 / 60;
const SHAPES = [["pebble", "Pebble"], ["cloud", "Cloud"], ["star", "Star"], ["heart", "Heart"], ["bun", "Bun"], ["flower", "Flower"]];
const PATTERNS = [["dots", "Dots"], ["stripes", "Stripes"], ["sprinkles", "Sprinkles"], ["checks", "Checks"], ["swirl", "Swirl"], ["hearts", "Hearts"], ["plain", "Plain"]];
const FACES = [["happy", "Happy"], ["wow", "Wow"], ["sleepy", "Sleepy"], ["none", "No face"]];
const DESIGNS = {
  berry: { shape: "cloud", pattern: "sprinkles", face: "happy", ci: 3 },
  mint: { shape: "pebble", pattern: "dots", face: "sleepy", ci: 2 },
  peach: { shape: "star", pattern: "stripes", face: "wow", ci: 0 },
  lemon: { shape: "bun", pattern: "hearts", face: "happy", ci: 4 },
};

const svgSkin = `<svg viewBox="0 0 76 76" aria-hidden="true"><path d="M14 40c0-16 12-26 24-26s24 10 24 26-12 22-24 22-24-6-24-22z" fill="#A7DEC7"/><g fill="#F8F4EF">${[22, 32, 42, 52].map((x) => `<circle cx="${x}" cy="40" r="3"/>`).join("")}</g><path d="M8 40h8M60 40h8" stroke="#492B3E" stroke-width="2"/></svg>`;
const svgPattern = `<svg viewBox="0 0 76 76" aria-hidden="true"><rect x="10" y="10" width="56" height="56" rx="10" fill="#C7B4F0"/><g stroke="#F8F4EF" stroke-width="5">${[14, 28, 42, 56].map((x) => `<path d="M${x} 66L${x + 16} 10"/>`).join("")}</g></svg>`;
const svgSheet = `<svg viewBox="0 0 76 76" aria-hidden="true"><rect x="8" y="8" width="60" height="60" rx="6" fill="#fff" stroke="#492B3E" stroke-width="1.4"/><circle cx="26" cy="28" r="10" fill="#F3A5BE" stroke="#fff" stroke-width="3"/><circle cx="50" cy="30" r="8" fill="#F2DC7C" stroke="#fff" stroke-width="3"/><circle cx="36" cy="52" r="10" fill="#A9C9F2" stroke="#fff" stroke-width="3"/></svg>`;

const cycle = (list, cur) => list[(list.findIndex((x) => x[0] === cur) + 1) % list.length];

const engine = {
  tools: [
    { id: "squeeze", label: "Squeeze", icon: "grab", cue: "Grab your squishy and pull" },
    { id: "poke", label: "Poke", icon: "squish", cue: "Press into it" },
    { id: "spin", label: "Spin", icon: "spin", cue: "Drag around it to spin" },
  ],
  actions: [
    { id: "shape", label: "Shape", icon: "blob", tip: "Next shape", run: (s) => engine.next("shape", SHAPES, s) },
    { id: "pattern", label: "Pattern", icon: "scatter", tip: "Next pattern", run: (s) => engine.next("pattern", PATTERNS, s) },
    { id: "face", label: "Face", icon: "heart", tip: "Next face", run: (s) => engine.next("face", FACES, s) },
    { id: "stamp", label: "Stamp", icon: "stamp", tip: "Stick a copy on your sheet", run: () => engine.stamp() },
  ],
  starts: [
    { id: "berry", label: "Berry cloud" },
    { id: "mint", label: "Sleepy mint" },
    { id: "peach", label: "Peach star" },
    { id: "lemon", label: "Lemon bun" },
    { id: "sheet", label: "Sticker sheet" },
  ],
  options: [
    { id: "shape", label: "Shape", value: "cloud", choices: SHAPES.map(([id, label]) => ({ id, label })) },
    { id: "pattern", label: "Pattern", value: "sprinkles", choices: PATTERNS.map(([id, label]) => ({ id, label })) },
    { id: "face", label: "Face", value: "happy", choices: FACES.map(([id, label]) => ({ id, label })) },
    { id: "paper", label: "Sheet", value: "dotty", choices: [{ id: "dotty", label: "Dotty" }, { id: "grid", label: "Grid" }, { id: "plain", label: "Plain" }] },
    { id: "style", label: "Look", value: "glossy", choices: [{ id: "glossy", label: "Glossy" }, { id: "sticker", label: "Sticker" }, { id: "flat", label: "Flat" }] },
  ],
  sliders: [
    { id: "size", label: "Squishy size", min: 50, max: 140, value: 100 },
    { id: "wobble", label: "Squish", min: 0, max: 100, value: 60 },
  ],
  how: [
    { title: "A squishy skin", text: "Your squishy's outline is a loop of 44 points held together by springs. Squeezing moves some points, and the springs share the pull with their neighbours.", svg: svgSkin },
    { title: "Patterns ride along", text: "The pattern is drawn inside the outline and turns with your squishy, so dots and stripes follow when it spins or squashes.", svg: svgPattern },
    { title: "Stamping", text: "Stamp copies the exact pose onto your sheet as a still sticker. The live one hops away so you can make the next pose.", svg: svgSheet },
  ],
  cueAt: [0.5, 0.66],
  colourEdits: true,
  dirty: true,

  mount(canvas, studio) {
    this.c = canvas;
    this.s = studio;
    this.g = canvas.getContext("2d");
    this.kept = [];
    this.acc = 0;
  },
  resize(w, h, dpr) {
    this.w = w; this.h = h; this.dpr = dpr;
    this.c.width = Math.round(w * dpr); this.c.height = Math.round(h * dpr);
    this.unit = Math.min(w, h) / 2;
    this.ax = w / Math.min(w, h); this.ay = h / Math.min(w, h);
    this.dirty = true;
  },
  get radius() { return 0.5 * (this.s.value("size") / 100); },
  make(x, y, ci = this.s.state.colour, r = this.radius) {
    const K = this.s.colours.length, o = this.s.state.opts;
    return makeBody({ x, y, r, shape: o.shape, pattern: o.pattern, face: o.face, ci, ci2: (ci + (o.pattern === "dots" || o.pattern === "stripes" ? 5 : 3)) % K, n: 44, seed: 2 });
  },
  build() {
    const start = this.s.state.start, st = this.s.state;
    const urlFirst = !this._built && this.s.params.get("o");
    this._built = true;
    this.kept = [];
    if (start === "sheet") {
      const r = this.s.random(9), K = this.s.colours.length;
      const saved = { ...st.opts };
      const cols = Math.max(2, Math.round(this.ax * 2)), rows = Math.max(3, Math.round(this.ay * 2));
      for (let a = 0; a < cols; a++) for (let b = 0; b < rows; b++) {
        if (r() < 0.25) continue;
        st.opts.shape = r.pick(SHAPES)[0]; st.opts.pattern = r.pick(PATTERNS)[0]; st.opts.face = r.pick(FACES.slice(0, 3))[0];
        const x = -this.ax + ((a + 0.5) / cols) * this.ax * 2 + r.range(-0.08, 0.08), y = -this.ay + ((b + 0.5) / rows) * this.ay * 2 * 0.86 + r.range(-0.08, 0.08);
        const body = this.make(x, y, r.int(0, K - 1), Math.min(this.ax / cols, this.ay / rows) * 0.7);
        rotate(body, r.range(-0.5, 0.5));
        const c = copyBody(body); c.style = r() < 0.5 ? "sticker" : "glossy";
        this.kept.push(c);
      }
      Object.assign(st.opts, saved);
      this.live = this.make(0, this.ay * 0.35, this.s.state.colour, this.radius * 0.7);
    } else {
      const d = DESIGNS[start] || DESIGNS.berry;
      if (!urlFirst) { st.opts.shape = d.shape; st.opts.pattern = d.pattern; st.opts.face = d.face; st.colour = d.ci; }
      this.live = this.make(0, -0.05);
    }
    this.dirty = true;
  },
  remake() {
    const b = this.live;
    centroid(b);
    const n = this.make(b.cx, b.cy, b.ci);
    rotate(n, b.theta);
    this.live = n;
    this.dirty = true;
  },
  next(id, list, s) {
    const [v, label] = cycle(list, s.state.opts[id]);
    s.state.opts[id] = v;
    this.option(id);
    s.syncUI();
    s.toast(label);
  },
  option(id) {
    if (id === "shape") this.remake();
    else if (id === "pattern") { this.live.pattern = this.s.opt("pattern"); this.live.ci2 = (this.live.ci + (this.live.pattern === "dots" || this.live.pattern === "stripes" ? 5 : 3)) % this.s.colours.length; }
    else if (id === "face") this.live.face = this.s.opt("face");
    this.dirty = true;
  },
  slider(id) { if (id === "size") this.remake(); this.dirty = true; },
  sig() { return [this.kept.length, this.live.shape, this.live.pattern, this.live.ci, this.live.cx.toFixed(2), this.live.cy.toFixed(2)].join('/'); },
  colourChanged() {
    const K = this.s.colours.length;
    this.live.ci = this.s.state.colour;
    this.live.ci2 = (this.live.ci + (this.live.pattern === "dots" || this.live.pattern === "stripes" ? 5 : 3)) % K;
    this.dirty = true;
  },
  recolour() { this.dirty = true; },
  stamp() {
    const c = copyBody(this.live);
    c.style = this.s.opt("style");
    this.kept.push(c);
    // hop to the emptiest spot so the next pose has room
    let best = null, bd = -1;
    for (let t = 0; t < 40; t++) {
      const x = (Math.random() * 2 - 1) * (this.ax - this.live.r), y = (Math.random() * 2 - 1) * (this.ay - this.live.r - 0.2);
      const d = Math.min(...this.kept.map((k) => Math.hypot(k.cx - x, k.cy - y)));
      if (d > bd) { bd = d; best = [x, y]; }
    }
    const dx = best[0] - this.live.cx, dy = best[1] - this.live.cy;
    for (let i = 0; i < this.live.n; i++) { this.live.p[i * 2] += dx; this.live.p[i * 2 + 1] += dy; this.live.q[i * 2] += dx; this.live.q[i * 2 + 1] += dy; }
    centroid(this.live);
    this.s.toast(this.kept.length === 1 ? "Stamped! Squish it again and stamp another" : `${this.kept.length} stickers`);
  },
  toUnits(px, py) { return [(px - this.w / 2) / this.unit, (py - this.h / 2) / this.unit]; },
  pointer(kind, px, py) {
    const [x, y] = this.toUnits(px, py), tool = this.s.state.tool, b = this.live;
    if (kind === "down") {
      this.down = true;
      if (tool === "squeeze") {
        const R = b.r * 0.9, idx = [], w = [], off = [];
        for (let i = 0; i < b.n; i++) {
          const d = Math.hypot(b.p[i * 2] - x, b.p[i * 2 + 1] - y);
          if (d < R) { idx.push(i); w.push(1 - d / R); off.push(b.p[i * 2] - x, b.p[i * 2 + 1] - y); }
        }
        if (!idx.length) {
          // grabbed outside: pull the nearest edge
          let bi = 0, bd = Infinity;
          for (let i = 0; i < b.n; i++) { const d = Math.hypot(b.p[i * 2] - x, b.p[i * 2 + 1] - y); if (d < bd) { bd = d; bi = i; } }
          for (const o of [-2, -1, 0, 1, 2]) { const i = (bi + o + b.n) % b.n; idx.push(i); w.push(1 - Math.abs(o) * 0.3); off.push(0, 0); }
        }
        this.grab = { body: b, idx, w, off, x, y };
      } else if (tool === "poke") this.poke = { x, y, r: b.r * 0.42 };
      else if (tool === "spin") { centroid(b); this.spinA = Math.atan2(y - b.cy, x - b.cx); }
    } else if (kind === "move" && this.down) {
      if (this.grab) { this.grab.x = x; this.grab.y = y; }
      if (this.poke) { this.poke.x = x; this.poke.y = y; }
      if (tool === "spin" && this.spinA != null) {
        const a = Math.atan2(y - b.cy, x - b.cx);
        let d = a - this.spinA;
        if (d > Math.PI) d -= Math.PI * 2;
        if (d < -Math.PI) d += Math.PI * 2;
        rotate(b, d);
        this.spinA = a;
      }
    } else if (kind === "up") { this.down = false; this.grab = this.poke = null; this.spinA = null; }
    this.dirty = true;
  },
  frame(dt) {
    this.acc = Math.min(this.acc + dt, STEP * 4);
    let stepped = false;
    const wob = this.s.value("wobble") / 100;
    while (this.acc >= STEP) {
      stepBodies([this.live], { dt: STEP, gravity: 0, stiff: 0.22 - 0.19 * wob, ax: this.ax, ay: this.ay, grab: this.grab, poke: this.poke });
      this.acc -= STEP;
      stepped = true;
    }
    const now = performance.now();
    if (!this.s.reducedMotion && Math.random() < 0.004) this.live.blink = now + 130;
    if (stepped || this.dirty) { this.draw(this.g, this.c.width, this.c.height); this.dirty = false; }
  },
  draw(g, W, H, still = false) {
    const U = Math.min(W, H) / 2, X = (x) => W / 2 + x * U, Y = (y) => H / 2 + y * U, bg = this.s.background, cols = this.s.colours;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = bg.colour;
    g.fillRect(0, 0, W, H);
    const paper = this.s.opt("paper"), step = 0.16 * U;
    if (paper === "dotty") {
      let n = 0;
      for (let y = (H / 2) % step; y < H; y += step) for (let x = (W / 2) % step; x < W; x += step) {
        g.globalAlpha = bg.dark ? 0.35 : 0.5;
        g.fillStyle = cols[n++ % cols.length];
        g.beginPath(); g.arc(x, y, 0.014 * U, 0, 6.283); g.fill();
      }
      g.globalAlpha = 1;
    } else if (paper === "grid") {
      g.strokeStyle = bg.dark ? "rgba(248,244,239,.12)" : "rgba(73,43,62,.1)";
      g.lineWidth = Math.max(1, U * 0.003);
      g.beginPath();
      for (let x = (W / 2) % step; x < W; x += step) { g.moveTo(x, 0); g.lineTo(x, H); }
      for (let y = (H / 2) % step; y < H; y += step) { g.moveTo(0, y); g.lineTo(W, y); }
      g.stroke();
    }
    for (const k of this.kept) drawBody(g, k, { cols, X, Y, U, style: k.style, dark: bg.dark });
    drawBody(g, this.live, { cols, X, Y, U, style: this.s.opt("style"), dark: bg.dark, now: still ? 0 : performance.now(), grabbed: !!this.grab });
  },
  render(w, h) {
    const out = document.createElement("canvas");
    out.width = w; out.height = h;
    this.draw(out.getContext("2d"), w, h, true);
    return out;
  },
  snapshot() { return { live: copyBody(this.live), kept: this.kept.map(copyBody) }; },
  restore(sn) {
    this.live = copyBody(sn.live);
    this.kept = sn.kept.map(copyBody);
    centroid(this.live);
    this.grab = this.poke = null;
    this.dirty = true;
  },
};

function rotate(b, a) {
  centroid(b);
  const c = Math.cos(a), s = Math.sin(a);
  for (const arr of [b.p, b.q]) for (let i = 0; i < b.n; i++) {
    const x = arr[i * 2] - b.cx, y = arr[i * 2 + 1] - b.cy;
    arr[i * 2] = b.cx + x * c - y * s;
    arr[i * 2 + 1] = b.cy + x * s + y * c;
  }
}

launch({
  title: "Squishy Lab",
  hook: "Design a squishy. Squeeze it. Stamp a sticker sheet.",
  engine,
  palette: 0,
  bg: 0,
  seed: 77,
  classic: "../squishy-lab-3d/",
  classicLabel: "Try the older 3D squishy factory (with 3D file export)",
});
