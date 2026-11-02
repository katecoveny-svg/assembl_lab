// Soft Matter: stamp wobbly jelly shapes, squish, stretch and pop them,
// then keep the ones you like and carry on painting.
import { launch } from "../kit/studio.js";
import { makeBody, stepBodies, drawBody, inside, copyBody, centroid } from "../kit/jelly.js";

const svgRing = `<svg viewBox="0 0 76 76" aria-hidden="true"><g fill="#C7B4F0" stroke="#492B3E" stroke-width="1.4">${Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * 6.283; return `<circle cx="${38 + Math.cos(a) * 24}" cy="${38 + Math.sin(a) * 24}" r="3.6"/>`; }).join("")}</g><circle cx="38" cy="38" r="24" fill="none" stroke="#492B3E" stroke-dasharray="2 4"/></svg>`;
const svgMemory = `<svg viewBox="0 0 76 76" aria-hidden="true"><path d="M20 30c4-12 30-14 36 0s-4 30-18 30S16 42 20 30z" fill="#F3A5BE"/><path d="M26 22c8-6 24-6 30 4" fill="none" stroke="#492B3E" stroke-dasharray="3 3" stroke-width="1.6"/><path d="M50 18l6 8-9 2" fill="none" stroke="#492B3E" stroke-width="1.6"/></svg>`;
const svgKeep = `<svg viewBox="0 0 76 76" aria-hidden="true"><rect x="10" y="14" width="40" height="48" rx="6" fill="#F8F4EF" stroke="#492B3E" stroke-width="1.4"/><circle cx="30" cy="34" r="10" fill="#A7DEC7"/><rect x="26" y="20" width="40" height="48" rx="6" fill="none" stroke="#492B3E" stroke-width="1.4" stroke-dasharray="3 3"/><circle cx="50" cy="44" r="10" fill="#F6B48E"/></svg>`;

const SHAPE_TOOLS = ["blob", "star", "heart", "cloud", "flower"];
const STEP = 1 / 60;

const engine = {
  tools: [
    { id: "blob", label: "Blob", icon: "blob", cue: "Tap to drop a jelly" },
    { id: "star", label: "Star", icon: "star", cue: "Tap or drag to drop stars" },
    { id: "heart", label: "Heart", icon: "heart", cue: "Tap or drag to drop hearts" },
    { id: "cloud", label: "Cloud", icon: "cloud", cue: "Tap or drag to drop clouds" },
    { id: "flower", label: "Flower", icon: "flower", cue: "Tap or drag to drop flowers" },
    { id: "grab", label: "Stretch", icon: "grab", cue: "Grab a jelly and pull" },
    { id: "poke", label: "Squish", icon: "squish", cue: "Press and drag to squish" },
    { id: "pop", label: "Pop", icon: "pop", cue: "Tap a jelly to pop it" },
  ],
  actions: [
    { id: "keep", label: "Keep", icon: "keep", tip: "Freeze these into your picture and keep playing on top", run: () => engine.keep() },
    { id: "shake", label: "Shake", icon: "bolt", tip: "Give everything a wobble", run: () => engine.shake() },
  ],
  starts: [
    { id: "party", label: "Jelly party" },
    { id: "pile", label: "Big pile" },
    { id: "rainbow", label: "Rainbow row" },
    { id: "one", label: "One big jelly" },
  ],
  options: [
    { id: "gravity", label: "Gravity", value: "float", choices: [{ id: "float", label: "Float" }, { id: "drop", label: "Drop" }] },
    { id: "style", label: "Look", value: "glossy", choices: [{ id: "glossy", label: "Glossy" }, { id: "sticker", label: "Sticker" }, { id: "flat", label: "Flat" }] },
    { id: "faces", label: "Faces", value: "on", choices: [{ id: "on", label: "Faces on" }, { id: "off", label: "No faces" }] },
  ],
  sliders: [
    { id: "size", label: "Jelly size", min: 30, max: 180, value: 100 },
    { id: "wobble", label: "Wobble", min: 0, max: 100, value: 55 },
  ],
  how: [
    { title: "A ring of points", text: "Each jelly is a loop of about 28 points. Springs between neighbours keep its skin even, like beads on elastic.", svg: svgRing },
    { title: "It remembers its shape", text: "Every frame the jelly works out the shape it should be and pulls each point part of the way back. Less pull means more wobble. It's a simple model of soft stuff, not real jelly.", svg: svgMemory },
    { title: "Keep and carry on", text: "Keep freezes the jellies into your picture as a still layer. New jellies bounce over the top, so you can build up a whole scene.", svg: svgKeep },
  ],
  cueAt: [0.5, 0.5],
  dirty: true,

  mount(canvas, studio) {
    this.c = canvas;
    this.s = studio;
    this.g = canvas.getContext("2d");
    this.bodies = [];
    this.kept = [];
    this.bits = [];
    this.acc = 0;
    this.colourEdits = false;
  },
  resize(w, h, dpr) {
    this.w = w; this.h = h; this.dpr = dpr;
    this.c.width = Math.round(w * dpr); this.c.height = Math.round(h * dpr);
    this.unit = Math.min(w, h) / 2;
    this.ax = w / Math.min(w, h); this.ay = h / Math.min(w, h);
    this.dirty = true;
  },
  get radius() { return 0.17 * (this.s.value("size") / 100); },
  get faces() { return this.s.opt("faces") === "on" ? "happy" : "none"; },
  newBody(x, y, shape, ci, r = this.radius, seed = Math.random() * 6) {
    const K = this.s.colours.length;
    return makeBody({ x, y, r, shape, ci, ci2: (ci + 3) % K, face: this.faces, seed, n: r > 0.3 ? 40 : 28 });
  },

  build() {
    const r = this.s.random(3), K = this.s.colours.length, ax = this.ax, ay = this.ay, start = this.s.state.start;
    this.bodies = [];
    this.kept = [];
    this.bits = [];
    const shapes = ["blob", "star", "heart", "cloud", "flower"];
    const urlFirst = !this._built && this.s.params.get("o");
    this._built = true;
    const setG = (v) => { if (!urlFirst) this.s.state.opts.gravity = v; };
    if (start === "pile") {
      setG("drop");
      const n = Math.round(10 + 6 * ax * ay / 2);
      for (let i = 0; i < n; i++) this.bodies.push(this.newBody(r.range(-ax * 0.75, ax * 0.75), ay - 0.3 - i * 0.22, r.pick(shapes), i % K, this.radius * r.range(0.75, 1.25), r() * 6));
      for (let i = 0; i < 260; i++) this.step();
    } else if (start === "rainbow") {
      setG("float");
      const n = K, span = Math.min(ax * 1.6, 2.2);
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1) - 0.5, ang = Math.PI + (i / (n - 1)) * Math.PI;
        this.bodies.push(this.newBody(Math.cos(ang) * span * 0.45, 0.1 + Math.sin(ang) * span * 0.32 + Math.abs(t) * 0.05, shapes[i % shapes.length], i, this.radius * 1.05, i));
      }
    } else if (start === "one") {
      setG("float");
      this.bodies.push(this.newBody(0, -0.05, "blob", r.int(0, K - 1), Math.min(0.62, 0.42 * (this.s.value("size") / 100)), 1));
    } else {
      setG("float");
      const n = Math.round(7 + 4 * ax * ay), placed = [];
      for (let i = 0, tries = 0; i < n && tries < 400; tries++) {
        const rad = this.radius * r.range(0.7, 1.35), x = r.range(-ax + rad, ax - rad), y = r.range(-ay + rad + 0.15, ay - rad - 0.35);
        if (placed.some(([px, py, pr]) => Math.hypot(px - x, py - y) < pr + rad + 0.04)) continue;
        placed.push([x, y, rad]);
        this.bodies.push(this.newBody(x, y, r.pick(shapes), Math.floor(r() * K), rad, r() * 6));
        i++;
      }
    }
    this.dirty = true;
  },
  recolour() { this.dirty = true; },
  option(id) {
    if (id === "faces") for (const b of [...this.bodies, ...this.kept]) b.face = this.faces;
    this.dirty = true;
  },
  slider() { this.dirty = true; },
  sig() { return this.bodies.length + '/' + this.kept.length + '/' + this.bodies.map((b) => b.cx.toFixed(2) + ',' + b.cy.toFixed(2)).join(';'); },

  toUnits(px, py) { return [(px - this.w / 2) / this.unit, (py - this.h / 2) / this.unit]; },
  at(x, y) {
    for (let i = this.bodies.length - 1; i >= 0; i--) if (inside(this.bodies[i], x, y)) return this.bodies[i];
    let best = null, bd = 0.12;
    for (const b of this.bodies) { const d = Math.hypot(b.cx - x, b.cy - y) - b.r; if (d < bd) { bd = d; best = b; } }
    return best;
  },
  drop(x, y, shape) {
    const b = this.newBody(x, y, shape, this.s.state.colour);
    this.bodies.push(b);
    if (this.bodies.length > 26) {
      this.kept.push(this.freeze(this.bodies.shift()));
      if (!this.warned) { this.warned = true; this.s.toast("Older jellies are kept as part of your picture"); }
    }
    this.lastDrop = [x, y];
  },
  freeze(b) { const c = copyBody(b); c.style = this.s.opt("style"); return c; },
  pointer(kind, px, py) {
    const [x, y] = this.toUnits(px, py), tool = this.s.state.tool;
    if (kind === "down") {
      this.down = true;
      if (SHAPE_TOOLS.includes(tool)) this.drop(x, y, tool);
      else if (tool === "grab") {
        const b = this.at(x, y);
        if (b) {
          const R = b.r * 0.95, idx = [], w = [], off = [];
          for (let i = 0; i < b.n; i++) {
            const d = Math.hypot(b.p[i * 2] - x, b.p[i * 2 + 1] - y);
            if (d < R) { idx.push(i); w.push(1 - d / R); off.push(b.p[i * 2] - x, b.p[i * 2 + 1] - y); }
          }
          if (!idx.length) { let bi = 0, bd = Infinity; for (let i = 0; i < b.n; i++) { const d = Math.hypot(b.p[i * 2] - x, b.p[i * 2 + 1] - y); if (d < bd) { bd = d; bi = i; } } idx.push(bi); w.push(1); off.push(0, 0); }
          this.grab = { body: b, idx, w, off, x, y };
        }
      } else if (tool === "poke") this.poke = { x, y, r: this.radius * 0.8 };
      else if (tool === "pop") this.pop(x, y);
    } else if (kind === "move" && this.down) {
      if (SHAPE_TOOLS.includes(tool) && this.lastDrop && Math.hypot(x - this.lastDrop[0], y - this.lastDrop[1]) > this.radius * 2.1) this.drop(x, y, tool);
      if (this.grab) { this.grab.x = x; this.grab.y = y; }
      if (this.poke) { this.poke.x = x; this.poke.y = y; }
      if (tool === "pop") this.pop(x, y);
    } else if (kind === "up") {
      this.down = false; this.grab = null; this.poke = null; this.lastDrop = null;
    }
    this.dirty = true;
  },
  pop(x, y) {
    const b = this.bodies.find((q) => inside(q, x, y));
    if (!b) return;
    this.bodies.splice(this.bodies.indexOf(b), 1);
    if (this.s.reducedMotion) return;
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * 6.283, sp = 0.6 + Math.random() * 1.2;
      this.bits.push({ x: b.cx, y: b.cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, ci: b.ci, r: b.r * 0.12 });
    }
  },
  keep() {
    if (!this.bodies.length) { this.s.toast("Drop some jellies first"); return; }
    this.kept.push(...this.bodies.map((b) => this.freeze(b)));
    this.bodies = [];
    this.s.toast("Kept! Drop new jellies on top");
  },
  shake() {
    for (const b of this.bodies) {
      const kx = (Math.random() - 0.5) * 0.06, ky = (Math.random() - 0.5) * 0.06 - (this.s.opt("gravity") === "drop" ? 0.05 : 0);
      for (let i = 0; i < b.n; i++) { b.q[i * 2] -= kx + (Math.random() - 0.5) * 0.02; b.q[i * 2 + 1] -= ky + (Math.random() - 0.5) * 0.02; }
    }
  },
  step() {
    const wob = this.s.value("wobble") / 100;
    stepBodies(this.bodies, { dt: STEP, gravity: this.s.opt("gravity") === "drop" ? 3.2 : 0, stiff: 0.26 - 0.23 * wob, ax: this.ax, ay: this.ay, grab: this.grab, poke: this.poke });
  },
  frame(dt) {
    this.acc = Math.min(this.acc + dt, STEP * 4);
    let stepped = false;
    while (this.acc >= STEP) { this.step(); this.acc -= STEP; stepped = true; }
    const now = performance.now();
    if (!this.s.reducedMotion && this.faces !== "none") for (const b of this.bodies) if (Math.random() < 0.003) b.blink = now + 130;
    for (const p of this.bits) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 2 * dt; p.life -= dt * 1.6; }
    this.bits = this.bits.filter((p) => p.life > 0);
    if (stepped || this.dirty || this.bits.length) { this.draw(this.g, this.c.width, this.c.height); this.dirty = false; }
  },
  draw(g, W, H, opts = {}) {
    const U = Math.min(W, H) / 2, X = (x) => W / 2 + x * U, Y = (y) => H / 2 + y * U, bg = this.s.background, cols = this.s.colours;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = bg.colour;
    g.fillRect(0, 0, W, H);
    const now = opts.still ? 0 : performance.now();
    for (const b of this.kept) drawBody(g, b, { cols, X, Y, U, style: b.style, dark: bg.dark });
    const style = this.s.opt("style");
    for (const b of this.bodies) drawBody(g, b, { cols, X, Y, U, style, dark: bg.dark, now, grabbed: this.grab?.body === b });
    for (const p of this.bits) { g.globalAlpha = Math.max(0, p.life); g.fillStyle = cols[p.ci % cols.length]; g.beginPath(); g.arc(X(p.x), Y(p.y), p.r * U, 0, 6.283); g.fill(); }
    g.globalAlpha = 1;
  },
  render(w, h) {
    const out = document.createElement("canvas");
    out.width = w; out.height = h;
    this.draw(out.getContext("2d"), w, h, { still: true });
    return out;
  },
  snapshot() { return { bodies: this.bodies.map(copyBody), kept: this.kept.map(copyBody) }; },
  restore(sn) {
    this.bodies = sn.bodies.map(copyBody);
    this.kept = sn.kept.map(copyBody);
    for (const b of this.bodies) centroid(b);
    this.grab = this.poke = null;
    this.dirty = true;
  },
};

launch({
  title: "Soft Matter",
  hook: "Drop, squish and stretch wobbly jelly art.",
  engine,
  palette: 0,
  bg: 0,
  seed: 1208,
  classic: "../soft-matter-3d/",
  classicLabel: "Try the older 3D soft-body lab",
});
