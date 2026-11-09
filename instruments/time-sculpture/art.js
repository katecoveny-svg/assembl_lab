// Time Sculpture: every stroke you draw is remembered with its timing,
// then replayed as echoes that turn and shrink, building a sculpture of time.
import { enhance } from "../play-space/workspace.js";
import { launch } from "../kit/studio.js";
import { hexToRgb } from "../kit/core.js";

const svgRecord = `<svg viewBox="0 0 76 76" aria-hidden="true"><path d="M10 54C22 20 40 60 66 22" fill="none" stroke="#C7B4F0" stroke-width="5" stroke-linecap="round"/>${[[10, 54], [22, 34], [34, 44], [46, 46], [58, 30], [66, 22]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="3" fill="#492B3E"/><text x="${x - 2}" y="${y + 13}" font-size="7" font-family="monospace" fill="#492B3E">${i}</text>`).join("")}</svg>`;
const svgEcho = `<svg viewBox="0 0 76 76" aria-hidden="true">${[0, 1, 2, 3].map((i) => `<path d="M38 38m-${26 - i * 6} 0a${26 - i * 6} ${26 - i * 6} 0 0 1 ${(26 - i * 6) * 2} 0" fill="none" stroke="${["#F6B48E", "#F3A5BE", "#C7B4F0", "#A9C9F2"][i]}" stroke-width="4" stroke-linecap="round" transform="rotate(${i * 25} 38 38)"/>`).join("")}</svg>`;
const svgMirror = `<svg viewBox="0 0 76 76" aria-hidden="true"><g stroke="#492B3E" stroke-dasharray="2 3"><path d="M38 6v64M6 38h64M15 15l46 46M61 15L15 61"/></g><path d="M44 30c6-6 14-4 16 2" fill="none" stroke="#A7DEC7" stroke-width="4" stroke-linecap="round"/><path d="M32 46c-6 6-14 4-16-2" fill="none" stroke="#A7DEC7" stroke-width="4" stroke-linecap="round"/></svg>`;

const engine = {
  tools: [
    { id: "ribbon", label: "Ribbon", icon: "paint", cue: "Draw a stroke and watch it echo" },
    { id: "glow", label: "Glow", icon: "bolt", cue: "Draw glowing light trails" },
    { id: "dots", label: "Beads", icon: "scatter", cue: "Draw a trail of beads" },
    { id: "erase", label: "Erase", icon: "erase", cue: "Rub out a stroke" },
  ],
  actions: [
    { id: "replay", label: "Replay", icon: "play", tip: "Watch your sculpture grow again", run: () => engine.replay(), history: false },
    { id: "spin", label: "Turn", icon: "spin", tip: "Turn everything a little", run: () => engine.turnAll() },
  ],
  starts: [
    { id: "bloom", label: "Time bloom" },
    { id: "tunnel", label: "Tunnel" },
    { id: "comet", label: "Comets" },
    { id: "blank", label: "Empty canvas" },
  ],
  surpriseStarts: ["bloom", "tunnel", "comet"],
  options: [
    { id: "mirror", label: "Mirrors", value: "6", choices: ["1", "2", "4", "6", "8"].map((id) => ({ id, label: id === "1" ? "None" : `${id}-way` })) },
  ],
  sliders: [
    { id: "echoes", label: "Echoes", min: 0, max: 12, value: 6 },
    { id: "turn", label: "Twist", min: -60, max: 60, value: 18 },
    { id: "shrink", label: "Shrink", min: 0, max: 40, value: 12 },
    { id: "width", label: "Thickness", min: 10, max: 100, value: 45 },
  ],
  how: [
    { title: "Your stroke is remembered", text: "While you draw, the studio keeps a list of points and the time each one happened. That list is your stroke.", svg: svgRecord },
    { title: "Echoes are replays", text: "Each echo redraws the same list a moment later, turned by the Twist angle and shrunk a little toward the middle.", svg: svgEcho },
    { title: "Mirrors", text: "Mirrors copy every stroke around the centre, like a kaleidoscope. Six-way mirrors make snowflake shapes.", svg: svgMirror },
  ],
  cueAt: [0.5, 0.4],
  dirty: true,

  mount(canvas, studio) {
    this.c = canvas;
    this.s = studio;
    this.g = canvas.getContext("2d");
    this.strokes = [];
    this.clock = 0;
  },
  resize(w, h, dpr) {
    this.w = w; this.h = h; this.dpr = dpr;
    this.c.width = Math.round(w * dpr); this.c.height = Math.round(h * dpr);
    this.unit = Math.min(w, h) / 2;
    this.ax = w / Math.min(w, h); this.ay = h / Math.min(w, h);
    this.dirty = true;
  },
  settings() {
    const v = this.s.state.values;
    return { echoes: v.echoes, turn: (v.turn * Math.PI) / 180, shrink: v.shrink / 100, width: v.width / 100, mirror: +this.s.opt("mirror") };
  },
  newStroke(kind, ci) { return { kind, ci, pts: [], born: this.clock }; },
  build() {
    const r = this.s.random(21), start = this.s.state.start, K = this.s.colours.length;
    this.strokes = [];
    this.clock = 0;
    const urlFirst = !this._built && this.s.params.has("v");
    this._built = true;
    const preset = (vals, mirror) => { if (urlFirst) return; Object.assign(this.s.state.values, vals); this.s.state.opts.mirror = mirror; };
    const add = (kind, ci, fn, n, dur) => {
      const st = this.newStroke(kind, ci);
      for (let i = 0; i <= n; i++) { const t = i / n; const [x, y] = fn(t); st.pts.push(x, y, t * dur); }
      st.born = -10;
      this.strokes.push(st);
    };
    if (start === "bloom") {
      preset({ echoes: 6, turn: 18, shrink: 12 }, "6");
      const petals = r.int(2, 4);
      for (let k = 0; k < petals; k++) {
        const a0 = r.range(0, 6.28), len = r.range(0.45, 0.85), bend = r.range(-1.2, 1.2);
        add(k % 2 ? "glow" : "ribbon", (k * 2) % K, (t) => { const rr = 0.12 + t * len, a = a0 + bend * t * t; return [Math.cos(a) * rr, Math.sin(a) * rr]; }, 40, 0.8);
      }
      add("dots", 4 % K, (t) => [Math.cos(t * 6.28) * 0.08, Math.sin(t * 6.28) * 0.08], 18, 0.6);
    } else if (start === "tunnel") {
      preset({ echoes: 10, turn: 17, shrink: 14 }, "2");
      for (let k = 0; k < 2; k++) {
        const rr = 0.85 - k * 0.12, ph = r.range(0, 6.28);
        add(k ? "glow" : "ribbon", k * 3 % K, (t) => [Math.cos(ph + t * 2.2) * rr, Math.sin(ph + t * 2.2) * rr * 1.05], 50, 0.9);
      }
    } else if (start === "comet") {
      preset({ echoes: 8, turn: 12, shrink: 8 }, "1");
      for (let k = 0; k < 4; k++) {
        const x0 = r.range(-0.9, 0.9) * this.ax, y0 = r.range(-0.9, 0.9) * this.ay, a = r.range(0, 6.28), L = r.range(0.4, 0.9), wv = r.range(0.04, 0.12);
        add(r.pick(["glow", "dots", "ribbon"]), k % K, (t) => [x0 + Math.cos(a) * L * t - Math.sin(a) * Math.sin(t * 12) * wv, y0 + Math.sin(a) * L * t + Math.cos(a) * Math.sin(t * 12) * wv], 46, 0.9);
      }
    }
    this.dirty = true;
  },
  recolour() { this.dirty = true; },
  option() { this.dirty = true; },
  slider() { this.dirty = true; },
  replay() { const base = this.clock; for (const st of this.strokes) st.born = base; this.s.toast("Replaying"); },
  turnAll() {
    const a = 0.35, c = Math.cos(a), s = Math.sin(a);
    for (const st of this.strokes) for (let i = 0; i < st.pts.length; i += 3) { const x = st.pts[i], y = st.pts[i + 1]; st.pts[i] = x * c - y * s; st.pts[i + 1] = x * s + y * c; }
  },
  toUnits(px, py) { return [(px - this.w / 2) / this.unit, (py - this.h / 2) / this.unit]; },
  pointer(kind, px, py) {
    const [x, y] = this.toUnits(px, py), tool = this.s.state.tool;
    if (kind === "down") {
      this.down = true;
      if (tool === "erase") { this.eraseAt(x, y); return; }
      this.cur = this.newStroke(tool, this.s.state.colour);
      this.cur.t0 = this.clock;
      this.cur.pts.push(x, y, 0);
      this.strokes.push(this.cur);
    } else if (kind === "move" && this.down) {
      if (tool === "erase") { this.eraseAt(x, y); return; }
      const p = this.cur?.pts;
      if (!p) return;
      const lx = p[p.length - 3], ly = p[p.length - 2];
      if (Math.hypot(x - lx, y - ly) > 0.012) p.push(x, y, Math.max(p[p.length - 1] + 0.004, this.clock - this.cur.t0));
    } else if (kind === "up") {
      this.down = false;
      if (this.cur && this.cur.pts.length < 6) { const p = this.cur.pts; p.push(p[0] + 0.01, p[1] + 0.01, 0.05); }
      this.cur = null;
    }
    this.dirty = true;
  },
  eraseAt(x, y) {
    for (let k = this.strokes.length - 1; k >= 0; k--) {
      const st = this.strokes[k];
      for (const [px, py] of this.copies()) for (let i = 0; i < st.pts.length; i += 3) {
        const q = this.place(st, px, py, st.pts[i], st.pts[i + 1], 0);
        if (Math.hypot(q[0] - x, q[1] - y) < 0.06) { this.strokes.splice(k, 1); return; }
      }
    }
  },
  copies() {
    const out = [], M = +this.s.opt("mirror");
    for (let m = 0; m < M; m++) { const a = (m / M) * Math.PI * 2; out.push([Math.cos(a), Math.sin(a)]); }
    return out;
  },
  place(st, c, s, x, y, e) {
    const set = this.set || this.settings();
    const k = Math.pow(1 - set.shrink, e), a = set.turn * e, ca = Math.cos(a), sa = Math.sin(a);
    const x1 = (x * ca - y * sa) * k, y1 = (x * sa + y * ca) * k;
    return [x1 * c - y1 * s, x1 * s + y1 * c];
  },
  frame(dt) {
    this.clock += dt;
    const live = this.down || this.strokes.some((st) => this.clock - st.born < this.duration(st) + 0.1);
    if (live || this.dirty) { this.draw(this.g, this.c.width, this.c.height, this.clock); this.dirty = false; }
  },
  duration(st) { const last = st.pts[st.pts.length - 1] || 0; return last + this.s.value("echoes") * 0.22 + 0.2; },
  draw(g, W, H, clock = Infinity) {
    const U = Math.min(W, H) / 2, bg = this.s.background, cols = this.s.colours.map(hexToRgb);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = "source-over";
    g.fillStyle = bg.colour;
    g.fillRect(0, 0, W, H);
    g.lineCap = "round";
    g.lineJoin = "round";
    const reduced = this.s.reducedMotion, set = (this.set = this.settings());
    for (const st of this.strokes) {
      const age = this.down && st === this.cur ? Infinity : reduced ? Infinity : clock - st.born;
      const col = cols[st.ci % cols.length], col2 = cols[(st.ci + 1) % cols.length];
      for (let e = set.echoes; e >= 0; e--) {
        const shown = age - e * 0.22;
        if (shown <= 0 && st !== this.cur) continue;
        const fade = 1 - (e / (set.echoes + 1)) * 0.75;
        const mix = e / Math.max(1, set.echoes);
        const rgb = col.map((v, i) => Math.round(v + (col2[i] - v) * mix));
        for (const [c, s] of this.copies()) {
          g.beginPath();
          let started = false;
          for (let i = 0; i < st.pts.length; i += 3) {
            if (st !== this.cur && st.pts[i + 2] > shown) break;
            const [x, y] = this.place(st, c, s, st.pts[i], st.pts[i + 1], e);
            const X = W / 2 + x * U, Y = H / 2 + y * U;
            if (st.kind === "dots") {
              if ((i / 3) % 3 === 0) { g.moveTo(X + 1, Y); g.arc(X, Y, U * 0.018 * set.width * 1.8 * Math.pow(1 - set.shrink, e), 0, 6.283); }
            } else if (!started) { g.moveTo(X, Y); started = true; } else g.lineTo(X, Y);
          }
          const w = U * 0.03 * set.width * Math.pow(1 - set.shrink, e);
          if (st.kind === "dots") { g.fillStyle = `rgba(${rgb},${fade})`; g.fill(); }
          else if (st.kind === "glow") {
            g.globalCompositeOperation = bg.dark ? "lighter" : "source-over";
            g.strokeStyle = `rgba(${rgb},${0.18 * fade})`; g.lineWidth = w * 3.2; g.stroke();
            g.strokeStyle = `rgba(${rgb},${0.9 * fade})`; g.lineWidth = w * 0.7; g.stroke();
            g.strokeStyle = `rgba(255,255,255,${0.7 * fade})`; g.lineWidth = w * 0.22; g.stroke();
            g.globalCompositeOperation = "source-over";
          } else {
            g.strokeStyle = `rgba(${rgb},${fade})`; g.lineWidth = w; g.stroke();
            g.strokeStyle = `rgba(255,255,255,${0.35 * fade})`; g.lineWidth = w * 0.25; g.stroke();
          }
        }
      }
    }
  },
  render(w, h) {
    const out = document.createElement("canvas");
    out.width = w; out.height = h;
    const cur = this.cur; this.cur = null;
    this.draw(out.getContext("2d"), w, h, Infinity);
    this.cur = cur;
    return out;
  },
  snapshot() { return this.strokes.map((s) => ({ ...s, pts: s.pts.slice() })); },
  restore(sn) { this.strokes = sn.map((s) => ({ ...s, pts: s.pts.slice(), born: -10 })); this.cur = null; this.dirty = true; },
  sig() { return this.strokes.length + "/" + this.strokes.reduce((a, s) => a + s.pts.length, 0); },
};

launch({
  title: "Time Sculpture",
  hook: "Draw once. Watch time echo it into a sculpture.",
  engine,
  palette: 6,
  bg: 1,
  seed: 606,
  classic: "../time-sculpture-3d/",
  classicLabel: "Try the older 3D time-volume lab (with video import)",
}).then(enhance);
