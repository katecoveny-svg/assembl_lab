// Sonic Loom: draw strings across a loom. A playhead sweeps across and
// plucks each string where it crosses; higher strings sing higher notes.
import { launch } from "../kit/studio.js";
import { hexToRgb } from "../kit/core.js";

const SCALES = {
  pentatonic: [0, 2, 4, 7, 9],
  major: [0, 2, 4, 5, 7, 9, 11],
  dreamy: [0, 2, 4, 6, 8, 10],
};
const svgHeight = `<svg viewBox="0 0 76 76" aria-hidden="true"><path d="M8 18h60" stroke="#F3A5BE" stroke-width="4"/><path d="M8 40h60" stroke="#C7B4F0" stroke-width="4"/><path d="M8 62h60" stroke="#A7DEC7" stroke-width="4"/><text x="58" y="13" font-size="8" font-family="monospace" fill="#492B3E">high</text><text x="58" y="74" font-size="8" font-family="monospace" fill="#492B3E">low</text></svg>`;
const svgHead = `<svg viewBox="0 0 76 76" aria-hidden="true"><path d="M6 30c20-14 44 14 64 0M6 52c20 10 44-12 64 2" fill="none" stroke="#A9C9F2" stroke-width="4"/><path d="M38 6v64" stroke="#492B3E" stroke-width="2" stroke-dasharray="3 3"/><circle cx="38" cy="30" r="5" fill="#F2DC7C"/><circle cx="38" cy="52" r="5" fill="#F2DC7C"/></svg>`;
const svgWave = `<svg viewBox="0 0 76 76" aria-hidden="true"><path d="M6 38c10-18 22-18 32 0s22 18 32 0" fill="none" stroke="#F6B48E" stroke-width="4"/><path d="M6 38c10-8 22-8 32 0s22 8 32 0" fill="none" stroke="#F6B48E" stroke-width="2" opacity=".5"/><path d="M6 38h64" stroke="#492B3E" stroke-width="1" stroke-dasharray="2 3"/></svg>`;

const engine = {
  tools: [
    { id: "string", label: "String", icon: "line", cue: "Draw a string · tap Sound to hear it" },
    { id: "pluck", label: "Pluck", icon: "pluck", cue: "Swipe across strings to pluck" },
    { id: "erase", label: "Erase", icon: "erase", cue: "Rub out a string" },
  ],
  actions: [
    { id: "sound", label: "Sound", icon: "play", tip: "Turn sound on or off", run: () => engine.toggleSound(), history: false },
    { id: "head", label: "Sweep", icon: "pause", tip: "Start or stop the playhead", run: () => engine.toggleHead(), history: false },
  ],
  starts: [
    { id: "weave", label: "Weave" },
    { id: "rain", label: "Rain" },
    { id: "rainbow", label: "Rainbow" },
    { id: "blank", label: "Empty loom" },
  ],
  surpriseStarts: ["weave", "rain", "rainbow"],
  options: [{ id: "scale", label: "Notes", value: "pentatonic", choices: [{ id: "pentatonic", label: "Pentatonic" }, { id: "major", label: "Major" }, { id: "dreamy", label: "Dreamy" }] }],
  sliders: [
    { id: "tempo", label: "Speed", min: 20, max: 100, value: 50 },
    { id: "width", label: "Thickness", min: 10, max: 100, value: 50 },
  ],
  how: [
    { title: "Height is pitch", text: "Where a string crosses the playhead decides its note: higher on the loom, higher the note. Notes come from a scale, so they always fit together.", svg: svgHeight },
    { title: "Beads are notes", text: "Every string gets a bead at each end and at each crest and dip. When the sweeping line reaches a bead, the browser makes a short plucked sound with Web Audio. No microphone, no recordings.", svg: svgHead },
    { title: "The wiggle is a picture", text: "Plucked strings wobble with a fading wave. It shows the idea of a vibrating string; it isn't a measurement of one.", svg: svgWave },
  ],
  cueAt: [0.5, 0.42],
  dirty: true,

  mount(canvas, studio) {
    this.c = canvas;
    this.s = studio;
    this.g = canvas.getContext("2d");
    this.strings = [];
    this.ripples = [];
    this.head = -1;
    this.headOn = false;
    this.t = 0;
  },
  resize(w, h, dpr) {
    this.w = w; this.h = h; this.dpr = dpr;
    this.c.width = Math.round(w * dpr); this.c.height = Math.round(h * dpr);
    this.unit = Math.min(w, h) / 2;
    this.ax = w / Math.min(w, h); this.ay = h / Math.min(w, h);
    this.dirty = true;
  },
  build() {
    const r = this.s.random(17), K = this.s.colours.length, ax = this.ax, ay = this.ay, start = this.s.state.start;
    this.strings = [];
    const add = (ci, fn, n = 60) => { const pts = []; for (let i = 0; i <= n; i++) { const [x, y] = fn(i / n); pts.push(x, y); } this.strings.push(this.mk(pts, ci)); };
    if (start === "weave") {
      const n = Math.round(6 + ay * 3), f = r.range(1.5, 3);
      for (let i = 0; i < n; i++) {
        const y0 = -ay * 0.8 + (i / (n - 1)) * ay * 1.6, a = r.range(0.04, 0.12), ph = r.range(0, 6.28);
        add(i % K, (t) => { const x = -ax + t * ax * 2; return [x, y0 + a * Math.sin(f * x + ph) + 0.04 * Math.sin(5 * x + i)]; });
      }
    } else if (start === "rain") {
      const n = Math.round(8 + ax * 4), slope = r.range(0.4, 0.9);
      for (let i = 0; i < n; i++) {
        const x0 = -ax * 1.2 + (i / n) * ax * 2.6, len = r.range(0.6, 1.4) * ay, y0 = r.range(-ay, ay * 0.2);
        add(i % K, (t) => [x0 + t * len * slope, y0 + t * len], 20);
      }
    } else if (start === "rainbow") {
      const n = K, cy = ay * 0.75;
      for (let i = 0; i < n; i++) {
        const rad = Math.min(ax * 0.95, ay * 1.3) - i * 0.12;
        add(i, (t) => { const a = Math.PI + t * Math.PI; return [Math.cos(a) * rad, cy + Math.sin(a) * rad]; });
      }
    }
    this.dirty = true;
  },
  mk(pts, ci) { return { pts, ci, amp: 0, hitAt: 0, mode: 2 + Math.floor(Math.random() * 3) }; },
  recolour() { this.dirty = true; },
  option() { this.dirty = true; },
  slider() { this.dirty = true; },
  // ---------- sound ----------
  toggleSound() {
    if (!this.ac) {
      try {
        this.ac = new (window.AudioContext || window.webkitAudioContext)();
        this.out = this.ac.createDynamicsCompressor();
        this.vol = this.ac.createGain();
        this.vol.gain.value = 0.5;
        this.vol.connect(this.out).connect(this.ac.destination);
      } catch { this.s.toast("Sound isn't available in this browser"); return; }
      this.soundOn = true;
    } else this.soundOn = !this.soundOn;
    if (this.soundOn) this.ac.resume?.();
    this.s.toast(this.soundOn ? "Sound on" : "Sound off");
    if (this.soundOn && !this.headOn) this.toggleHead();
  },
  toggleHead() { this.headOn = !this.headOn; this.s.toast(this.headOn ? "Playhead sweeping" : "Playhead stopped"); this.dirty = true; },
  note(y, ci) {
    if (!this.soundOn || !this.ac) return;
    const sc = SCALES[this.s.opt("scale")] || SCALES.pentatonic;
    const steps = sc.length * 3, idx = Math.max(0, Math.min(steps - 1, Math.round(((this.ay - y) / (2 * this.ay)) * (steps - 1))));
    const midi = 48 + 12 * Math.floor(idx / sc.length) + sc[idx % sc.length];
    const f = 440 * Math.pow(2, (midi - 69) / 12), t = this.ac.currentTime;
    const o = this.ac.createOscillator(), g = this.ac.createGain(), lp = this.ac.createBiquadFilter();
    o.type = ["triangle", "sine", "sawtooth", "triangle", "square", "sine"][ci % 6];
    o.frequency.value = f;
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(Math.min(8000, f * 8), t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(200, f * 1.5), t + 0.6);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.type === "square" || o.type === "sawtooth" ? 0.08 : 0.22, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    o.connect(lp).connect(g).connect(this.vol);
    o.start(t);
    o.stop(t + 1.25);
  },
  pluck(st, x, y) {
    st.amp = 0.045;
    st.hitAt = this.t;
    if (this.ripples.length < 40) this.ripples.push({ x, y, ci: st.ci, t: this.t });
    if ((this.notesThisFrame = (this.notesThisFrame || 0) + 1) <= 5) this.note(y, st.ci);
  },
  // ---------- interaction ----------
  toUnits(px, py) { return [(px - this.w / 2) / this.unit, (py - this.h / 2) / this.unit]; },
  pointer(kind, px, py) {
    const [x, y] = this.toUnits(px, py), tool = this.s.state.tool;
    if (kind === "down") {
      this.down = [x, y];
      if (tool === "string") { this.cur = this.mk([x, y], this.s.state.colour); this.strings.push(this.cur); }
      else if (tool === "erase") this.eraseAt(x, y);
      else this.swipe(x, y, x + 0.001, y + 0.001);
    } else if (kind === "move" && this.down) {
      if (tool === "string" && this.cur) {
        const p = this.cur.pts;
        if (Math.hypot(x - p[p.length - 2], y - p[p.length - 1]) > 0.015) p.push(x, y);
      } else if (tool === "erase") this.eraseAt(x, y);
      else this.swipe(this.down[0], this.down[1], x, y);
      this.down = [x, y];
    } else if (kind === "up") {
      if (this.cur && this.cur.pts.length < 6) this.strings.pop();
      this.cur = null;
      this.down = null;
    }
    this.dirty = true;
  },
  swipe(x0, y0, x1, y1) {
    for (const st of this.strings) {
      const p = st.pts;
      for (let i = 0; i + 3 < p.length; i += 2) {
        const hit = segX(x0, y0, x1, y1, p[i], p[i + 1], p[i + 2], p[i + 3]);
        if (hit) { this.pluck(st, hit[0], hit[1]); break; }
      }
    }
  },
  eraseAt(x, y) {
    for (let k = this.strings.length - 1; k >= 0; k--) {
      const p = this.strings[k].pts;
      for (let i = 0; i < p.length; i += 2) if (Math.hypot(p[i] - x, p[i + 1] - y) < 0.06) { this.strings.splice(k, 1); return; }
    }
  },
  frame(dt) {
    this.t += dt;
    this.notesThisFrame = 0;
    let busy = this.dirty;
    if (this.headOn) {
      const period = 9 - (this.s.value("tempo") / 100) * 6.5, prev = this.head;
      this.head += (dt / period) * 2 * this.ax;
      if (this.head > this.ax) this.head = -this.ax;
      else for (const st of this.strings) {
        for (const [px, py] of pegs(st)) if (px > prev && px <= this.head) this.pluck(st, px, py);
      }
      busy = true;
    }
    for (const st of this.strings) if (st.amp > 0.0005) { st.amp *= Math.exp(-dt * 2.2); busy = true; } else st.amp = 0;
    this.ripples = this.ripples.filter((r) => this.t - r.t < 1.2);
    if (this.ripples.length) busy = true;
    if (busy) { this.draw(this.g, this.c.width, this.c.height, false); this.dirty = false; }
  },
  draw(g, W, H, still) {
    const U = Math.min(W, H) / 2, X = (x) => W / 2 + x * U, Y = (y) => H / 2 + y * U, bg = this.s.background, cols = this.s.colours.map(hexToRgb);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = bg.colour;
    g.fillRect(0, 0, W, H);
    // the loom's warp threads
    g.strokeStyle = bg.dark ? "rgba(248,244,239,.08)" : "rgba(73,43,62,.08)";
    g.lineWidth = Math.max(1, U * 0.004);
    g.beginPath();
    const step = 0.07 * U;
    for (let x = (W / 2) % step; x < W; x += step) { g.moveTo(x, 0); g.lineTo(x, H); }
    g.stroke();
    const wd = U * 0.02 * (this.s.value("width") / 50);
    g.lineCap = "round"; g.lineJoin = "round";
    for (const st of this.strings) {
      const p = st.pts, n = p.length / 2, rgb = cols[st.ci % cols.length];
      let L = 0;
      const seg = [0];
      for (let i = 1; i < n; i++) { L += Math.hypot(p[i * 2] - p[i * 2 - 2], p[i * 2 + 1] - p[i * 2 - 1]); seg.push(L); }
      const amp = still ? 0 : st.amp, wob = Math.sin((this.t - st.hitAt) * 38);
      const pt = (i) => {
        if (!amp) return [X(p[i * 2]), Y(p[i * 2 + 1])];
        const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
        let nx = -(p[b * 2 + 1] - p[a * 2 + 1]), ny = p[b * 2] - p[a * 2];
        const nl = Math.hypot(nx, ny) || 1;
        const d = amp * wob * Math.sin((Math.PI * st.mode * seg[i]) / (L || 1));
        return [X(p[i * 2] + (nx / nl) * d), Y(p[i * 2 + 1] + (ny / nl) * d)];
      };
      g.beginPath();
      for (let i = 0; i < n; i++) { const [x, y] = pt(i); i ? g.lineTo(x, y) : g.moveTo(x, y); }
      const glow = amp > 0.002 ? Math.min(1, amp * 30) : 0;
      if (glow) { g.strokeStyle = `rgba(${rgb},${0.25 * glow})`; g.lineWidth = wd * 4; g.stroke(); }
      g.strokeStyle = `rgb(${rgb})`; g.lineWidth = wd; g.stroke();
      g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = wd * 0.28; g.stroke();
      if (st !== this.cur) for (const [bx, by] of pegs(st)) {
        g.beginPath(); g.arc(X(bx), Y(by), wd * 0.95, 0, 6.283);
        g.fillStyle = bg.dark ? "#F8F4EF" : "#FFFFFF"; g.fill();
        g.lineWidth = wd * 0.45; g.strokeStyle = `rgb(${rgb})`; g.stroke();
      }
    }
    if (!still) {
      for (const r of this.ripples) {
        const a = (this.t - r.t) / 1.2, rgb = cols[r.ci % cols.length];
        g.strokeStyle = `rgba(${rgb},${1 - a})`;
        g.lineWidth = Math.max(1.5, U * 0.008);
        g.beginPath(); g.arc(X(r.x), Y(r.y), U * (0.02 + a * 0.12), 0, 6.283); g.stroke();
      }
      if (this.headOn) {
        const hx = X(this.head);
        const grd = g.createLinearGradient(hx - U * 0.08, 0, hx, 0);
        grd.addColorStop(0, "rgba(255,255,255,0)");
        grd.addColorStop(1, bg.dark ? "rgba(248,244,239,.16)" : "rgba(73,43,62,.08)");
        g.fillStyle = grd;
        g.fillRect(hx - U * 0.08, 0, U * 0.08, H);
        g.fillStyle = bg.dark ? "rgba(248,244,239,.7)" : "rgba(73,43,62,.5)";
        g.fillRect(hx - 1, 0, 2, H);
      }
    }
  },
  render(w, h) {
    const out = document.createElement("canvas");
    out.width = w; out.height = h;
    this.draw(out.getContext("2d"), w, h, true);
    this.dirty = true;
    return out;
  },
  snapshot() { return this.strings.map((s) => ({ pts: s.pts.slice(), ci: s.ci })); },
  restore(sn) { this.strings = sn.map((s) => this.mk(s.pts.slice(), s.ci)); this.cur = null; this.dirty = true; },
  sig() { return this.strings.length + "/" + this.strings.reduce((a, s) => a + s.pts.length, 0); },
};

// Beads are the notes: both ends of a string, plus every crest and dip.
function pegs(st) {
  if (st.pegs && st.pegs.n === st.pts.length) return st.pegs;
  const p = st.pts, n = p.length / 2, out = [[p[0], p[1]]];
  let lastX = p[0];
  for (let i = 1; i < n - 1; i++) {
    const a = p[i * 2 + 1] - p[i * 2 - 1], b = p[i * 2 + 3] - p[i * 2 + 1];
    if (a * b < 0 && Math.abs(p[i * 2] - lastX) > 0.06) { out.push([p[i * 2], p[i * 2 + 1]]); lastX = p[i * 2]; }
  }
  if (n > 1) out.push([p[n * 2 - 2], p[n * 2 - 1]]);
  out.n = p.length;
  st.pegs = out;
  return out;
}

function segX(ax, ay, bx, by, cx, cy, dx, dy) {
  const d = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
  if (Math.abs(d) < 1e-9) return null;
  const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / d, u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [ax + t * (bx - ax), ay + t * (by - ay)] : null;
}

launch({
  title: "Sonic Loom",
  hook: "Weave colourful strings, then hear your picture play.",
  engine,
  palette: 0,
  bg: 1,
  seed: 909,
  classic: "../sonic-loom-3d/",
  classicLabel: "Try the older 3D ribbon instrument",
});
