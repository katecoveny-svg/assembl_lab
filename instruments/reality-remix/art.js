// Reality Remix: a picture made of thousands of soft colour splats.
// Push, swirl, scatter, mend, paint and tint them. WebGL2 with a Canvas 2D fallback.
import { launch } from "../kit/studio.js";
import { hexToRgb } from "../kit/core.js";

const MAX = 14000;
const svgSplats = `<svg viewBox="0 0 76 76" aria-hidden="true"><defs><radialGradient id="rg1"><stop offset="0" stop-color="#F3A5BE"/><stop offset="1" stop-color="#F3A5BE" stop-opacity="0"/></radialGradient><radialGradient id="rg2"><stop offset="0" stop-color="#C7B4F0"/><stop offset="1" stop-color="#C7B4F0" stop-opacity="0"/></radialGradient><radialGradient id="rg3"><stop offset="0" stop-color="#A7DEC7"/><stop offset="1" stop-color="#A7DEC7" stop-opacity="0"/></radialGradient></defs><ellipse cx="30" cy="34" rx="22" ry="10" transform="rotate(-25 30 34)" fill="url(#rg1)"/><ellipse cx="46" cy="40" rx="20" ry="9" transform="rotate(35 46 40)" fill="url(#rg2)"/><ellipse cx="38" cy="52" rx="18" ry="8" fill="url(#rg3)"/></svg>`;
const svgHome = `<svg viewBox="0 0 76 76" aria-hidden="true"><circle cx="20" cy="54" r="7" fill="#C7B4F0"/><circle cx="56" cy="22" r="7" fill="none" stroke="#492B3E" stroke-dasharray="3 3"/><path d="M26 48 Q40 20 49 25" fill="none" stroke="#492B3E" stroke-width="2" marker-end="url(#ah)"/><defs><marker id="ah" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8z" fill="#492B3E"/></marker></defs></svg>`;
const svgSeed = `<svg viewBox="0 0 76 76" aria-hidden="true"><rect x="8" y="24" width="26" height="26" rx="6" fill="#F2DC7C"/><circle cx="15" cy="31" r="2.5" fill="#492B3E"/><circle cx="27" cy="43" r="2.5" fill="#492B3E"/><circle cx="21" cy="37" r="2.5" fill="#492B3E"/><path d="M38 37h8" stroke="#492B3E" stroke-width="2"/><rect x="50" y="22" width="20" height="30" rx="3" fill="#A9C9F2"/><circle cx="60" cy="34" r="6" fill="#F3A5BE"/></svg>`;

const engine = {
  tools: [
    { id: "push", label: "Push", icon: "push", cue: "Drag to push the colour" },
    { id: "swirl", label: "Swirl", icon: "swirl", cue: "Hold and move to swirl" },
    { id: "scatter", label: "Scatter", icon: "scatter", cue: "Hold to scatter splats" },
    { id: "mend", label: "Mend", icon: "gather", cue: "Brush to put pieces back" },
    { id: "paint", label: "Paint", icon: "paint", cue: "Draw new colour splats" },
    { id: "tint", label: "Tint", icon: "recolour", cue: "Brush to change colours" },
  ],
  actions: [
    { id: "rebuild", label: "Rebuild", icon: "rebuild", tip: "Everything flows back home", run: () => engine.rebuild() },
    { id: "shake", label: "Shake", icon: "bolt", tip: "Shake every splat loose", run: () => engine.shake() },
  ],
  starts: [
    { id: "bloom", label: "Bloom" },
    { id: "waves", label: "Waves" },
    { id: "unfurl", label: "Unfurl" },
    { id: "galaxy", label: "Galaxy" },
    { id: "flow", label: "Flow field" },
  ],
  sliders: [
    { id: "brush", label: "Brush size", min: 10, max: 100, value: 45 },
    { id: "size", label: "Splat size", min: 30, max: 220, value: 100 },
    { id: "settle", label: "Spring back", min: 0, max: 100, value: 0, surprise: false },
  ],
  options: [{ id: "motion", label: "Movement", value: "shimmer", choices: [{ id: "shimmer", label: "Shimmer" }, { id: "still", label: "Still" }] }],
  how: [
    { title: "It's all splats", text: "Your picture is thousands of soft ovals of colour. Each one fades out from its middle (a 2D Gaussian), so overlapping splats blend like wet paint.", svg: svgSplats },
    { title: "Every splat remembers home", text: "Mend and Rebuild pull splats back to where the seed first put them. Spring back makes them drift home by themselves. It's a drawing rule, not real physics.", svg: svgHome },
    { title: "Same seed, same picture", text: "The seed number feeds a random-number recipe. Same seed and settings make the same starting picture, fitted to your screen. That's what a remix link shares.", svg: svgSeed },
  ],
  cueAt: [0.5, 0.42],
  maxDpr: 1.5,
  dirty: true,
  n: 0,
  base: 0,

  async mount(canvas, studio) {
    this.c = canvas;
    this.s = studio;
    this.max = studio.gl2 ? MAX : 6000;
    this.baseCount = studio.gl2 ? (Math.min(innerWidth, innerHeight) < 600 ? 6000 : 7600) : 2800;
    const f = () => new Float32Array(this.max);
    Object.assign(this, { hx: f(), hy: f(), ha: f(), x: f(), y: f(), vx: f(), vy: f(), a: f(), sx: f(), sy: f(), al: f(), jit: f(), ci: new Uint8Array(this.max) });
    this.inst = new Float32Array(this.max * 9);
    if (studio.gl2) this.initGL();
    else this.g2 = canvas.getContext("2d");
    if (studio.reducedMotion && !studio.params.get("o")) studio.state.opts.motion = "still";
    this.pointerAt = null;
  },

  initGL() {
    const gl = (this.gl = this.c.getContext("webgl2", { antialias: false, premultipliedAlpha: true, alpha: false }));
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const vs = `#version 300 es
      layout(location=0) in vec2 corner;
      layout(location=1) in vec4 pa;
      layout(location=2) in vec4 sc;
      layout(location=3) in float al;
      uniform vec2 uScale; uniform float uSize, uTime, uShimmer;
      out vec2 vUv; out vec4 vCol;
      void main(){
        float ph = float(gl_InstanceID) * 0.618;
        vec2 p = pa.xy + uShimmer * 0.007 * vec2(sin(uTime * 0.9 + ph * 7.0), cos(uTime * 0.7 + ph * 5.0));
        float c = cos(pa.z), s = sin(pa.z);
        vec2 q = corner * vec2(pa.w, sc.x) * uSize * 2.6;
        vec2 w = p + vec2(c * q.x - s * q.y, s * q.x + c * q.y);
        gl_Position = vec4(w.x * uScale.x, -w.y * uScale.y, 0.0, 1.0);
        vUv = corner * 2.6; vCol = vec4(sc.yzw, al);
      }`;
    const fs = `#version 300 es
      precision mediump float;
      in vec2 vUv; in vec4 vCol; out vec4 o;
      void main(){
        float g = exp(-0.5 * dot(vUv, vUv));
        if (g < 0.035) discard;
        float a = vCol.a * g;
        vec3 col = vCol.rgb * (0.92 + 0.16 * g);
        o = vec4(col * a, a);
      }`;
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    this.prog = p;
    this.u = Object.fromEntries(["uScale", "uSize", "uTime", "uShimmer"].map((n) => [n, gl.getUniformLocation(p, n)]));
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.ibuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.ibuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.inst.byteLength, gl.DYNAMIC_DRAW);
    const stride = 36;
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, stride, 0); gl.vertexAttribDivisor(1, 1);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, stride, 16); gl.vertexAttribDivisor(2, 1);
    gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, stride, 32); gl.vertexAttribDivisor(3, 1);
    gl.bindVertexArray(null);
    this.maxEdge = Math.min(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE), gl.getParameter(gl.MAX_VIEWPORT_DIMS)[0], 4096);
    this.maxExport = this.maxEdge;
    this.c.addEventListener("webglcontextlost", (e) => e.preventDefault());
    this.c.addEventListener("webglcontextrestored", () => { this.initGL(); this.dirty = true; });
  },

  resize(w, h, dpr) {
    this.w = w; this.h = h; this.dpr = dpr;
    this.c.width = Math.round(w * dpr);
    this.c.height = Math.round(h * dpr);
    this.unit = Math.min(w, h) / 2;
    this.ax = w / Math.min(w, h);
    this.ay = h / Math.min(w, h);
    this.dirty = true;
  },

  // ---------- scenes ----------
  add(x, y, ang, sx, sy, ci, alpha = 0.78, jit = 0) {
    if (this.n >= this.max) return;
    const i = this.n++;
    this.hx[i] = this.x[i] = x;
    this.hy[i] = this.y[i] = y;
    this.ha[i] = this.a[i] = ang;
    this.vx[i] = this.vy[i] = 0;
    this.sx[i] = sx; this.sy[i] = sy; this.ci[i] = ci; this.al[i] = alpha; this.jit[i] = jit;
  },
  build() {
    const r = this.s.random(11), N = this.baseCount, ax = this.ax, ay = this.ay;
    this.n = 0;
    const K = this.s.colours.length;
    const scene = this.s.state.start;
    const j = () => r.range(-0.14, 0.14);
    if (scene === "bloom") {
      // soft field behind, then petals, then a seeded heart
      const P = r.int(5, 9), rot = r.range(0, Math.PI * 2), R = Math.min(ax, ay) * 0.92, cy = -0.12 * ay;
      const c0 = r.int(0, K - 1);
      for (let i = 0; i < N * 0.07; i++) {
        this.add(r.range(-ax, ax), r.range(-ay, ay), r.range(0, 6.28), 0.011, 0.011, (c0 + 2 + (i % 3)) % K, r.range(0.35, 0.8), j());
      }
      const layers = r.int(2, 3);
      for (let i = 0; i < N * 0.66; i++) {
        const L = i % layers, p = Math.floor(r() * P), t = Math.sqrt(r());
        const off = (L * Math.PI) / P;
        const across = r.gauss() * 0.42 * Math.sin(Math.PI * Math.min(1, t * 1.05));
        const th = rot + off + (p * Math.PI * 2) / P + across * (0.9 / P) * 3;
        const rad = t * R * (1 - L * 0.24);
        this.add(Math.cos(th) * rad, cy + Math.sin(th) * rad, th + r.gauss() * 0.12, 0.05 + 0.03 * t, 0.013, (c0 + L + (t > 0.72 ? 1 : 0)) % K, 0.8, j());
      }
      // seed head: golden-angle spiral, like a sunflower
      const M = Math.floor(N * 0.1), cR = R * 0.2;
      for (let k = 0; k < M; k++) {
        const t = Math.sqrt(k / M) * cR, th = k * 2.39996323;
        this.add(Math.cos(th) * t, cy + Math.sin(th) * t, th, 0.013, 0.011, (c0 + 4 + (k % 2)) % K, 0.95, (k % 3) * 0.06 - 0.06);
      }
    } else if (scene === "waves") {
      const L = r.int(6, 9), f = r.range(1.2, 2.4), sunX = r.range(-0.5, 0.5) * ax, sunY = -ay * r.range(0.45, 0.65);
      for (let i = 0; i < N * 0.12; i++) {
        const t = Math.sqrt(r()) * 0.42, th = r.range(0, 6.28);
        this.add(sunX + Math.cos(th) * t, sunY + Math.sin(th) * t, th, 0.04, 0.02, 4 % K, 0.75, j());
      }
      const curve = (l, x) => -ay * 0.28 + (l / L) * ay * 1.35 + 0.12 * Math.sin(f * x + l * 1.7) + 0.05 * Math.sin(2.7 * f * x - l);
      for (let i = 0; i < N * 0.88; i++) {
        const l = Math.floor(r() * L), x = r.range(-ax - 0.1, ax + 0.1), d = r() * (ay * 1.5 / L + 0.15);
        const y = curve(l, x) + d;
        const slope = (curve(l, x + 0.01) - curve(l, x)) / 0.01;
        this.add(x, y, Math.atan(slope) + r.gauss() * 0.06, 0.07, 0.016, l % K, 0.8, j() * (1 - d));
      }
    } else if (scene === "unfurl") {
      const S = r.int(3, 6), spirals = [];
      for (let k = 0; k < S; k++) spirals.push({ x: r.range(-0.8, 0.8) * ax, y: r.range(-0.75, 0.75) * ay, s: r.range(0.35, 0.75), d: r() < 0.5 ? 1 : -1, c: k % K, ph: r.range(0, 6.28) });
      for (let i = 0; i < N * 0.15; i++) this.add(r.range(-ax, ax), r.range(-ay, ay), r.range(0, 6.28), 0.016, 0.016, Math.floor(r() * K), 0.55, j());
      for (let i = 0; i < N * 0.85; i++) {
        const sp = spirals[i % S], t = Math.pow(r(), 0.7);
        const th = sp.ph + sp.d * t * 9.5, rad = sp.s * Math.exp(-t * 2.6);
        const width = 0.07 * (1 - t * 0.75) * sp.s * 2;
        const nx = Math.cos(th), ny = Math.sin(th), w = r.gauss() * width;
        this.add(sp.x + nx * (rad + w), sp.y + ny * (rad + w), th + (sp.d * Math.PI) / 2, 0.045, 0.016, (sp.c + (t > 0.55 ? 1 : 0)) % K, 0.82, j());
      }
    } else if (scene === "galaxy") {
      const arms = r.int(2, 4), twist = r.range(2.2, 3.4), R = Math.max(ax, ay) * 0.95;
      for (let i = 0; i < N * 0.18; i++) this.add(r.range(-ax, ax), r.range(-ay, ay), 0, 0.009, 0.009, 5 % K, r.range(0.4, 0.95), 0.1);
      for (let i = 0; i < N * 0.82; i++) {
        const t = Math.pow(r(), 0.8), arm = i % arms;
        const th = (arm * Math.PI * 2) / arms + t * twist * Math.PI + r.gauss() * 0.22 * (1 - t * 0.5);
        const rad = t * R;
        this.add(Math.cos(th) * rad, Math.sin(th) * rad * 0.82, th + Math.PI / 2 + r.gauss() * 0.2, 0.05 * (0.5 + t), 0.016, Math.min(K - 1, Math.floor(t * K * 0.999)), 0.75, j());
      }
    } else {
      // flow field: particles traced through a seeded wavy field
      const fx = r.range(0.8, 1.8), fy = r.range(0.8, 1.8), ph = r.range(0, 9), traces = 220, steps = Math.floor(N / traces);
      for (let k = 0; k < traces; k++) {
        let x = r.range(-ax, ax), y = r.range(-ay, ay);
        const ci = Math.floor((k / traces) * K * 1.999) % K;
        for (let s = 0; s < steps; s++) {
          const ang = Math.sin(x * fx + ph) * 1.6 + Math.cos(y * fy - ph * 0.5) * 1.6 + Math.sin((x + y) * 0.7);
          x += Math.cos(ang) * 0.022; y += Math.sin(ang) * 0.022;
          if (x < -ax - 0.1 || x > ax + 0.1 || y < -ay - 0.1 || y > ay + 0.1) { x = r.range(-ax, ax); y = r.range(-ay, ay); }
          this.add(x, y, ang, 0.04, 0.014, ci, 0.7, j());
        }
      }
    }
    this.base = this.n;
    this.rebuildT = 0;
    this.recolour();
  },
  recolour() {
    const cols = this.s.colours.map(hexToRgb);
    this.rgb = new Float32Array(this.max * 3);
    for (let i = 0; i < this.n; i++) this.setRgb(i, cols);
    this.bg = hexToRgb(this.s.background.colour).map((v) => v / 255);
    this.sprites = null;
    this.dirty = true;
  },
  setRgb(i, cols = this.s.colours.map(hexToRgb)) {
    const c = cols[this.ci[i] % cols.length], k = this.jit[i];
    for (let q = 0; q < 3; q++) {
      const v = c[q] / 255;
      this.rgb[i * 3 + q] = k >= 0 ? v + (1 - v) * k : v * (1 + k);
    }
  },

  // ---------- interaction ----------
  toUnits(px, py) { return [(px - this.w / 2) / this.unit, (py - this.h / 2) / this.unit]; },
  get R() { return 0.06 + (this.s.value("brush") / 100) * 0.55; },
  pointer(kind, px, py) {
    const [x, y] = this.toUnits(px, py);
    if (kind === "down") { this.pointerAt = [x, y]; this.last = [x, y]; this.down = true; if (this.s.state.tool === "paint") this.spray(x, y, 0, 0, 6); }
    else if (kind === "move" && this.down) {
      const dx = x - this.last[0], dy = y - this.last[1];
      this.stroke(x, y, dx, dy);
      this.last = [x, y]; this.pointerAt = [x, y];
    } else if (kind === "up") { this.down = false; this.pointerAt = null; }
  },
  stroke(x, y, dx, dy) {
    const tool = this.s.state.tool, R = this.R, R2 = R * R;
    if (tool === "paint") {
      const d = Math.hypot(dx, dy);
      this.spray(x, y, dx, dy, Math.max(1, Math.round(d / 0.012)));
      return;
    }
    if (tool === "push") {
      const dir = Math.atan2(dy, dx);
      for (let i = 0; i < this.n; i++) {
        const ex = this.x[i] - x, ey = this.y[i] - y, d2 = ex * ex + ey * ey;
        if (d2 > R2) continue;
        const w = Math.exp(-d2 / (0.35 * R2));
        this.x[i] += dx * w; this.y[i] += dy * w;
        this.vx[i] += dx * w * 6; this.vy[i] += dy * w * 6;
        this.a[i] += angDiff(this.a[i], dir) * w * 0.25;
      }
    } else if (tool === "tint") {
      const c = this.s.state.colour, cols = this.s.colours.map(hexToRgb);
      for (let i = 0; i < this.n; i++) {
        const ex = this.x[i] - x, ey = this.y[i] - y;
        if (ex * ex + ey * ey < R2 * 0.6 && this.ci[i] !== c) { this.ci[i] = c; this.setRgb(i, cols); }
      }
    }
  },
  spray(x, y, dx, dy, count) {
    const r = Math.random, dir = Math.atan2(dy, dx), c = this.s.state.colour, R = this.R, cols = this.s.colours.map(hexToRgb);
    for (let k = 0; k < count; k++) {
      if (this.n >= this.max) { this.s.status("The canvas is full of splats. Try Mend or Undo."); return; }
      const t = k / count, g1 = gauss(), g2 = gauss();
      const px = x - dx * t + g1 * R * 0.28, py = y - dy * t + g2 * R * 0.28;
      this.add(px, py, (dx || dy ? dir : r() * 6.28) + gauss() * 0.3, 0.05, 0.017, c, 0.85, (r() - 0.5) * 0.25);
      this.setRgb(this.n - 1, cols);
    }
  },
  rebuild() { this.rebuildT = 1.6; this.s.toast("Rebuilding"); },
  shake() {
    for (let i = 0; i < this.n; i++) { this.vx[i] += gauss() * 0.9; this.vy[i] += gauss() * 0.9; }
    this.rebuildT = 0;
  },

  // ---------- simulation ----------
  frame(dt, t) {
    const tool = this.s.state.tool, n = this.n;
    let moving = false;
    if (this.down && this.pointerAt && (tool === "swirl" || tool === "scatter" || tool === "mend")) {
      const [px, py] = this.pointerAt, R2 = this.R * this.R;
      for (let i = 0; i < n; i++) {
        const ex = this.x[i] - px, ey = this.y[i] - py, d2 = ex * ex + ey * ey;
        if (d2 > R2) continue;
        const w = Math.exp(-d2 / (0.4 * R2));
        if (tool === "swirl") {
          const om = 3.2 * w * dt, c = Math.cos(om), s = Math.sin(om);
          this.x[i] = px + ex * c - ey * s; this.y[i] = py + ex * s + ey * c; this.a[i] += om;
        } else if (tool === "scatter") {
          const d = Math.sqrt(d2) + 1e-4;
          this.vx[i] += (ex / d) * w * 1.6 * dt + gauss() * 0.4 * w * dt;
          this.vy[i] += (ey / d) * w * 1.6 * dt + gauss() * 0.4 * w * dt;
        } else {
          const k = Math.min(1, w * 5 * dt);
          this.x[i] += (this.hx[i] - this.x[i]) * k; this.y[i] += (this.hy[i] - this.y[i]) * k;
          this.a[i] += angDiff(this.a[i], this.ha[i]) * k;
          this.vx[i] *= 0.8; this.vy[i] *= 0.8;
        }
      }
      moving = true;
    }
    const settle = this.s.value("settle") / 100, damp = Math.exp(-3.2 * dt);
    let pull = settle * 1.2 * dt;
    if (this.rebuildT > 0) { this.rebuildT -= dt; pull = Math.max(pull, Math.min(1, 3.5 * dt)); }
    let energy = 0;
    for (let i = 0; i < n; i++) {
      const vx = this.vx[i], vy = this.vy[i];
      if (vx || vy) {
        this.x[i] += vx * dt; this.y[i] += vy * dt;
        this.vx[i] = vx * damp; this.vy[i] = vy * damp;
        const e = vx * vx + vy * vy;
        energy += e;
        if (e < 1e-8) this.vx[i] = this.vy[i] = 0;
      }
      if (pull > 0) {
        this.x[i] += (this.hx[i] - this.x[i]) * pull; this.y[i] += (this.hy[i] - this.y[i]) * pull;
        this.a[i] += angDiff(this.a[i], this.ha[i]) * pull;
      }
    }
    if (energy > 0 || pull > 0) moving = true;
    const shimmer = this.gl && this.s.opt("motion") === "shimmer" && !this.s.reducedMotion;
    if (moving || shimmer || this.dirty) {
      this.draw(t, shimmer ? 1 : 0);
      this.dirty = false;
    }
  },

  // ---------- drawing ----------
  pack() {
    const I = this.inst, sz = this.s.value("size") / 100;
    for (let i = 0; i < this.n; i++) {
      const o = i * 9;
      I[o] = this.x[i]; I[o + 1] = this.y[i]; I[o + 2] = this.a[i]; I[o + 3] = this.sx[i];
      I[o + 4] = this.sy[i]; I[o + 5] = this.rgb[i * 3]; I[o + 6] = this.rgb[i * 3 + 1]; I[o + 7] = this.rgb[i * 3 + 2];
      I[o + 8] = this.al[i];
    }
    return sz;
  },
  draw(t = 0, shimmer = 0) {
    if (this.gl) this.drawGL(this.c.width, this.c.height, t, shimmer);
    else this.draw2D(this.g2, this.c.width, this.c.height);
  },
  drawGL(W, H, t, shimmer) {
    const gl = this.gl, sz = this.pack(), m = Math.min(W, H);
    gl.viewport(0, 0, W, H);
    gl.clearColor(this.bg[0], this.bg[1], this.bg[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(this.prog);
    gl.uniform2f(this.u.uScale, m / W, m / H);
    gl.uniform1f(this.u.uSize, sz);
    gl.uniform1f(this.u.uTime, t);
    gl.uniform1f(this.u.uShimmer, shimmer);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.ibuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.inst, 0, this.n * 9);
    gl.bindVertexArray(this.vao);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.n);
    gl.bindVertexArray(null);
  },
  makeSprites() {
    this.sprites = this.s.colours.map((hex) => {
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      const g = c.getContext("2d"), grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      const [r, gg, b] = hexToRgb(hex);
      for (let s = 0; s <= 6; s++) {
        const d = (s / 6) * 3;
        grd.addColorStop(s / 6, `rgba(${r},${gg},${b},${Math.exp(-0.5 * d * d).toFixed(3)})`);
      }
      g.fillStyle = grd;
      g.fillRect(0, 0, 64, 64);
      return c;
    });
  },
  draw2D(g, W, H) {
    if (!this.sprites) this.makeSprites();
    const sz = this.s.value("size") / 100, m = Math.min(W, H) / 2;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.fillStyle = this.s.background.colour;
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < this.n; i++) {
      const c = Math.cos(this.a[i]), s = Math.sin(this.a[i]), kx = this.sx[i] * sz * m, ky = this.sy[i] * sz * m;
      g.setTransform(c * kx, s * kx, -s * ky, c * ky, W / 2 + this.x[i] * m, H / 2 + this.y[i] * m);
      g.globalAlpha = this.al[i];
      g.drawImage(this.sprites[this.ci[i] % this.sprites.length], -3, -3, 6, 6);
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
  },
  render(w, h) {
    const out = document.createElement("canvas");
    out.width = w; out.height = h;
    if (this.gl) {
      const k = Math.min(1, this.maxEdge / Math.max(w, h));
      const W = Math.round(w * k), H = Math.round(h * k);
      this.c.width = W; this.c.height = H;
      this.drawGL(W, H, 0, 0);
      out.getContext("2d").drawImage(this.c, 0, 0, w, h);
      this.c.width = Math.round(this.w * this.dpr);
      this.c.height = Math.round(this.h * this.dpr);
      this.draw(0, 0);
    } else {
      this.draw2D(out.getContext("2d"), w, h);
    }
    this.dirty = true;
    return out;
  },

  // ---------- history ----------
  snapshot() {
    const n = this.n;
    return { n, x: this.x.slice(0, n), y: this.y.slice(0, n), a: this.a.slice(0, n), ci: this.ci.slice(0, n), hx: this.hx.slice(0, n), hy: this.hy.slice(0, n), ha: this.ha.slice(0, n), sx: this.sx.slice(0, n), sy: this.sy.slice(0, n), al: this.al.slice(0, n), jit: this.jit.slice(0, n) };
  },
  restore(sn) {
    this.n = sn.n;
    for (const k of ["x", "y", "a", "ci", "hx", "hy", "ha", "sx", "sy", "al", "jit"]) this[k].set(sn[k]);
    this.vx.fill(0); this.vy.fill(0);
    this.rebuildT = 0;
    this.recolour();
  },
};

function gauss() {
  let u = 0, v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function angDiff(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

launch({
  title: "Reality Remix",
  hook: "Pull a picture apart. Put it back your way.",
  engine,
  palette: 0,
  bg: 1,
  seed: 4207,
  classic: "../reality-remix-3d/",
  classicLabel: "Try the older 3D splat sculpture",
});
