// Impossible Objects: build with isometric blocks, then switch the drawing
// order to make shapes that can't exist (Penrose triangle, impossible frame).
import { enhance } from "../play-space/workspace.js";
import { launch } from "../kit/studio.js";
import { shade, bytesToB64url, b64urlToBytes } from "../kit/core.js";

const C = Math.cos(Math.PI / 6);
const key = (c) => `${c.i},${c.j},${c.k}`;
const ease = (t) => 1 - Math.pow(1 - t, 3);

const svgOrder = `<svg viewBox="0 0 76 76" aria-hidden="true"><path d="M14 30l14-8 14 8-14 8z" fill="#F6B48E"/><path d="M14 30v16l14 8V38z" fill="#E09A74"/><path d="M42 30v16l-14 8V38z" fill="#C98263"/><path d="M34 36l14-8 14 8-14 8z" fill="#C7B4F0"/><path d="M34 36v16l14 8V44z" fill="#AE98DE"/><path d="M62 36v16l-14 8V44z" fill="#937CC4"/><text x="18" y="70" font-size="10" font-family="monospace" fill="#492B3E">1</text><text x="52" y="72" font-size="10" font-family="monospace" fill="#492B3E">2</text></svg>`;
const svgTri = `<svg viewBox="0 0 76 76" aria-hidden="true"><path d="M38 8L70 64H6z" fill="none" stroke="#C7B4F0" stroke-width="10" stroke-linejoin="round"/><path d="M38 8L70 64" stroke="#A7DEC7" stroke-width="10" stroke-linecap="round"/><path d="M6 64H52" stroke="#F3A5BE" stroke-width="10" stroke-linecap="round"/></svg>`;
const svgIso = `<svg viewBox="0 0 76 76" aria-hidden="true"><g stroke="#492B3E" stroke-width="1.6" fill="none"><path d="M38 14v20M38 34l17 10M38 34L21 44"/></g><text x="34" y="12" font-size="9" font-family="monospace" fill="#492B3E">up</text><text x="54" y="54" font-size="9" font-family="monospace" fill="#492B3E">i</text><text x="16" y="54" font-size="9" font-family="monospace" fill="#492B3E">j</text><path d="M30 60h16l4 6H26z" fill="#A9C9F2"/></svg>`;

const engine = {
  tools: [
    { id: "cube", label: "Block", icon: "cube", cue: "Tap to stack a block" },
    { id: "line", label: "Bar", icon: "line", cue: "Drag to build a bar" },
    { id: "paint", label: "Paint", icon: "paint", cue: "Tap blocks to colour them" },
    { id: "erase", label: "Erase", icon: "erase", cue: "Tap blocks to remove them" },
  ],
  actions: [
    { id: "turn", label: "Turn", icon: "spin", tip: "Turn the whole build a quarter turn", run: () => engine.turn() },
    { id: "fit", label: "Fit", icon: "gather", tip: "Centre everything on screen", run: () => engine.fit(), history: false },
  ],
  starts: [
    { id: "penrose", label: "Penrose triangle" },
    { id: "frame", label: "Impossible frame" },
    { id: "city", label: "Block city" },
    { id: "ziggurat", label: "Steps" },
    { id: "blank", label: "One block" },
  ],
  surpriseStarts: ["penrose", "frame", "city", "ziggurat"],
  options: [
    { id: "depth", label: "Drawing order", value: "trick", choices: [{ id: "real", label: "Depth sorted" }, { id: "trick", label: "Impossible" }] },
    { id: "style", label: "Style", value: "soft", choices: [{ id: "soft", label: "Soft" }, { id: "outline", label: "Outlined" }, { id: "colouring", label: "Colouring-in" }] },
  ],
  sliders: [{ id: "zoom", label: "Block size", min: 40, max: 160, value: 100 }],
  how: [
    { title: "Order makes the trick", text: "Depth sorted draws far blocks first. In Impossible it draws in the order you placed them, so a later block always sits on top, even if it should be behind.", svg: svgOrder },
    { title: "Why the triangle works", text: "Three bars go along three directions. On a flat page the end lands exactly on the start, so the corner looks both in front and behind. A real one only works from one exact viewpoint.", svg: svgTri },
    { title: "Isometric drawing", text: "Every block is drawn with the same three angles, with no vanishing point. That's why far blocks look the same size as near ones, and why the eye can be fooled.", svg: svgIso },
  ],
  cueAt: [0.5, 0.2],
  dirty: true,

  mount(canvas, studio) {
    this.c = canvas;
    this.s = studio;
    this.g = canvas.getContext("2d");
    this.cubes = [];
    this.ox = 0; this.oy = 0;
    this.ghost = null;
    this.preview = [];
  },
  resize(w, h, dpr) {
    this.w = w; this.h = h; this.dpr = dpr;
    this.c.width = Math.round(w * dpr);
    this.c.height = Math.round(h * dpr);
    this.dirty = true;
  },
  get size() { return Math.min(this.w, this.h) * (this.fitK || 0.072) * (this.s.value("zoom") / 100); },
  get cy() { return this.h * 0.47; },

  // ---------- starts ----------
  build() {
    const r = this.s.random(5), K = this.s.colours.length, start = this.s.state.start;
    const cubes = [];
    const add = (i, j, k, ci) => cubes.push({ i, j, k, ci: ((ci % K) + K) % K });
    const c0 = r.int(0, K - 1);
    let depth = "real";
    if (start === "penrose") {
      const n = r.int(4, 6);
      for (let t = 0; t < n; t++) add(t, 0, 0, c0);
      for (let t = 0; t < n; t++) add(n, 0, t, c0 + 1);
      for (let t = 0; t < n; t++) add(n, t, n, c0 + 2);
      add(0, 0, 0, c0); // drawn last: the corner that makes it impossible
      depth = "trick";
    } else if (start === "frame") {
      const n = r.int(4, 5), pts = new Set();
      const edge = (a, b, ci) => {
        const steps = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2]));
        for (let t = 0; t <= steps; t++) {
          const p = a.map((v, q) => v + Math.sign(b[q] - a[q]) * t);
          if (!pts.has(p.join())) { pts.add(p.join()); add(p[0], p[1], p[2], ci); }
        }
      };
      const v = (x, y, z) => [x * n, y * n, z * n];
      [[0, 0, 0, 1, 0, 0], [0, 0, 0, 0, 1, 0], [1, 0, 0, 1, 1, 0], [0, 1, 0, 1, 1, 0], [0, 0, 0, 0, 0, 1], [1, 0, 0, 1, 0, 1], [0, 1, 0, 0, 1, 1], [1, 1, 0, 1, 1, 1], [0, 0, 1, 1, 0, 1], [0, 0, 1, 0, 1, 1], [1, 0, 1, 1, 1, 1], [0, 1, 1, 1, 1, 1]].forEach((e, q) => edge(v(e[0], e[1], e[2]), v(e[3], e[4], e[5]), c0 + (q % 3)));
      cubes.sort((a, b) => a.i + a.j + a.k - (b.i + b.j + b.k));
      // redraw the back vertical post last so it crosses in front
      for (let t = 1; t < n; t++) add(0, 0, t, c0 + 1);
      depth = "trick";
    } else if (start === "city") {
      const N = r.int(5, 7);
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        if (r() < 0.22) continue;
        const h = Math.max(1, Math.round(r.range(0.5, 1) * (1 + 4 * Math.exp(-((i - N / 2) ** 2 + (j - N / 2) ** 2) / 6)) + r.range(-0.6, 0.6)));
        const ci = r.int(0, K - 1);
        for (let k = 0; k < h; k++) add(i, j, k, k === h - 1 && r() < 0.4 ? ci + 1 : ci);
      }
      cubes.sort((a, b) => a.i + a.j + a.k - (b.i + b.j + b.k));
    } else if (start === "ziggurat") {
      const N = r.int(4, 6);
      for (let k = 0; k < N; k++) for (let i = k; i < 2 * N - 1 - k; i++) for (let j = k; j < 2 * N - 1 - k; j++) if (i === k || j === k || i === 2 * N - 2 - k || j === 2 * N - 2 - k || k === N - 1) add(i, j, k, c0 + k);
      cubes.sort((a, b) => a.i + a.j + a.k - (b.i + b.j + b.k));
    } else {
      add(0, 0, 0, c0);
    }
    this.cubes = cubes.map((c) => ({ ...c, born: -1 }));
    if (!this.s.params.get("o") || this._built) this.s.state.opts.depth = depth;
    this._built = true;
    this.fit();
    this.dirty = true;
  },
  fit() {
    if (!this.cubes.length) { this.ox = this.oy = 0; this.fitK = 0.072; this.dirty = true; return; }
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const c of this.cubes) {
      const x = (c.i - c.j) * C, y = (c.i + c.j) * 0.5 - c.k;
      x0 = Math.min(x0, x - C); x1 = Math.max(x1, x + C);
      y0 = Math.min(y0, y - 1); y1 = Math.max(y1, y + 1);
    }
    this.ox = -(x0 + x1) / 2;
    this.oy = -(y0 + y1) / 2;
    const m = Math.min(this.w, this.h);
    const k = Math.min((this.w * 0.78) / (x1 - x0), (this.h * 0.56) / (y1 - y0)) / m;
    this.fitK = Math.max(0.035, Math.min(0.13, k));
    this.dirty = true;
  },
  turn() {
    let maxI = 0;
    for (const c of this.cubes) maxI = Math.max(maxI, c.i);
    this.cubes = this.cubes.map((c) => ({ ...c, i: c.j, j: maxI - c.i, born: -1 }));
    this.fit();
  },
  recolour() { this.dirty = true; },
  option() { this.dirty = true; },
  slider() { this.dirty = true; },

  // ---------- geometry ----------
  proj(a, b, z, s, cx, cy) { return [cx + ((a - b) * C + this.ox) * s, cy + ((a + b) * 0.5 - z + this.oy) * s]; },
  faces(c, s, cx, cy) {
    const P = (a, b, z) => this.proj(a, b, z, s, cx, cy);
    const { i, j, k } = c;
    return {
      top: [P(i, j, k + 1), P(i + 1, j, k + 1), P(i + 1, j + 1, k + 1), P(i, j + 1, k + 1)],
      right: [P(i + 1, j, k + 1), P(i + 1, j + 1, k + 1), P(i + 1, j + 1, k), P(i + 1, j, k)],
      left: [P(i, j + 1, k + 1), P(i + 1, j + 1, k + 1), P(i + 1, j + 1, k), P(i, j + 1, k)],
    };
  },
  ordered() {
    if (this.s.opt("depth") === "trick") return this.cubes;
    return this.cubes.map((c, n) => [c, n]).sort((a, b) => a[0].i + a[0].j + a[0].k - (b[0].i + b[0].j + b[0].k) || a[1] - b[1]).map((x) => x[0]);
  },
  hit(px, py) {
    const s = this.size, cx = this.w / 2, cy = this.cy, list = this.ordered();
    for (let n = list.length - 1; n >= 0; n--) {
      const f = this.faces(list[n], s, cx, cy);
      for (const face of ["top", "right", "left"]) if (inside(px, py, f[face])) return { cube: list[n], face };
    }
    return null;
  },
  onPlane(px, py, z) {
    const s = this.size;
    const X = (px - this.w / 2 - this.ox * s) / (s * C), Y = (py - this.cy - this.oy * s + z * s) / (s * 0.5);
    return { i: Math.floor((X + Y) / 2), j: Math.floor((Y - X) / 2), k: z };
  },
  target(px, py) {
    const h = this.hit(px, py);
    if (!h) return this.onPlane(px, py, 0);
    const { i, j, k } = h.cube;
    return h.face === "top" ? { i, j, k: k + 1 } : h.face === "right" ? { i: i + 1, j, k } : { i, j: j + 1, k };
  },
  occupied() { return new Set(this.cubes.map(key)); },
  place(t) {
    if (t.k < 0 || t.k > 40 || this.cubes.length > 1200) return false;
    if (this.occupied().has(key(t))) return false;
    this.cubes.push({ i: t.i, j: t.j, k: t.k, ci: this.s.state.colour, born: this.s.reducedMotion ? -1 : performance.now() });
    return true;
  },

  // ---------- interaction ----------
  pointer(kind, px, py) {
    const tool = this.s.state.tool;
    if (kind === "hover") { this.ghost = tool === "cube" || tool === "line" ? this.target(px, py) : null; this.hover = this.hit(px, py)?.cube || null; this.dirty = true; return; }
    if (kind === "leave") { this.ghost = null; this.hover = null; this.dirty = true; return; }
    if (kind === "down") {
      this.down = [px, py];
      this.dragLevel = null;
      if (tool === "cube") { const t = this.target(px, py); this.place(t); this.dragLevel = t.k; this.lastKey = key(t); }
      else if (tool === "line") { this.lineStart = this.target(px, py); this.preview = [this.lineStart]; }
      else this.touch(px, py, tool);
    } else if (kind === "move" && this.down) {
      if (tool === "cube") {
        const t = this.onPlane(px, py, this.dragLevel ?? 0);
        if (key(t) !== this.lastKey) { this.place(t); this.lastKey = key(t); }
      } else if (tool === "line") this.preview = this.lineCells(px, py);
      else this.touch(px, py, tool);
    } else if (kind === "up") {
      if (tool === "line" && this.preview.length) {
        const occ = this.occupied();
        for (const t of this.preview) if (!occ.has(key(t)) && t.k >= 0) { this.place(t); occ.add(key(t)); }
      }
      this.preview = [];
      this.down = null;
    }
    this.dirty = true;
  },
  lineCells(px, py) {
    const a = this.lineStart, s = this.size, dx = (px - this.down[0]) / s, dy = (py - this.down[1]) / s;
    const axes = [[1, 0, 0, C, 0.5], [-1, 0, 0, -C, -0.5], [0, 1, 0, -C, 0.5], [0, -1, 0, C, -0.5], [0, 0, 1, 0, -1], [0, 0, -1, 0, 1]];
    let best = axes[0], bd = -Infinity;
    for (const ax of axes) { const d = dx * ax[3] + dy * ax[4]; if (d > bd) { bd = d; best = ax; } }
    const n = Math.min(24, Math.max(0, Math.round(bd)));
    const out = [];
    for (let t = 0; t <= n; t++) out.push({ i: a.i + best[0] * t, j: a.j + best[1] * t, k: a.k + best[2] * t });
    return out;
  },
  touch(px, py, tool) {
    const h = this.hit(px, py);
    if (!h) return;
    if (tool === "paint") h.cube.ci = this.s.state.colour;
    else if (tool === "erase") this.cubes.splice(this.cubes.indexOf(h.cube), 1);
  },

  // ---------- drawing ----------
  frame() {
    const now = performance.now();
    const anim = this.cubes.some((c) => c.born > 0 && now - c.born < 320);
    if (anim || this.dirty) { this.draw(this.g, this.c.width, this.c.height, this.dpr); this.dirty = anim; }
  },
  draw(g, W, H, scale) {
    const s = this.size, cx = this.w / 2, cy = this.cy, cols = this.s.colours, bg = this.s.background, style = this.s.opt("style");
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = bg.colour;
    g.fillRect(0, 0, W, H);
    g.setTransform(scale, 0, 0, scale, 0, 0);
    // floor dots
    g.fillStyle = bg.dark ? "rgba(248,244,239,.16)" : "rgba(73,43,62,.16)";
    const span = Math.ceil(Math.max(this.w, this.h) / (s * 0.5)) + 4;
    const o = this.onPlane(cx, cy, 0);
    for (let a = -span; a <= span; a++) for (let b = -span; b <= span; b++) {
      const i = o.i + a, j = o.j + b;
      if (Math.abs(a - b) > span || Math.abs(a + b) > span * 1.2) continue;
      const [x, y] = this.proj(i, j, 0, s, cx, cy);
      if (x < -5 || y < -5 || x > this.w + 5 || y > this.h + 5) continue;
      g.fillRect(x - 0.9, y - 0.9, 1.8, 1.8);
    }
    // contact shadows for floor blocks
    g.fillStyle = bg.dark ? "rgba(0,0,0,.32)" : "rgba(36,11,33,.09)";
    for (const c of this.cubes) {
      if (c.k !== 0) continue;
      const p = [[c.i + 0.25, c.j + 0.25], [c.i + 1.35, c.j + 0.25], [c.i + 1.35, c.j + 1.35], [c.i + 0.25, c.j + 1.35]].map(([a, b]) => this.proj(a, b, 0, s, cx, cy));
      poly(g, p); g.fill();
    }
    const now = performance.now();
    const ink = bg.dark ? "rgba(248,244,239,.85)" : "#492B3E";
    const drawCube = (c, alpha = 1, ghost = false) => {
      let lift = 0;
      if (c.born > 0) { const t = Math.min(1, (now - c.born) / 320); lift = (1 - ease(t)) * 1.4; alpha *= 0.4 + 0.6 * t; }
      const f = this.faces({ i: c.i, j: c.j, k: c.k + lift }, s, cx, cy);
      const base = cols[c.ci % cols.length];
      g.globalAlpha = alpha;
      if (style === "colouring") {
        g.fillStyle = "#FFFFFF";
        for (const k of ["left", "right", "top"]) { poly(g, f[k]); g.fill(); }
        g.strokeStyle = "#240B21"; g.lineWidth = Math.max(1.2, s * 0.06); g.lineJoin = "round";
        for (const k of ["left", "right", "top"]) { poly(g, f[k]); g.stroke(); }
      } else {
        const tones = { top: shade(base, 0.32), left: base, right: shade(base, -0.2) };
        for (const k of ["left", "right", "top"]) {
          poly(g, f[k]);
          g.fillStyle = tones[k]; g.fill();
          g.strokeStyle = tones[k]; g.lineWidth = 0.8; g.stroke();
        }
        if (style === "outline" || ghost) {
          g.strokeStyle = ink; g.lineWidth = Math.max(1, s * 0.045); g.lineJoin = "round";
          for (const k of ["left", "right", "top"]) { poly(g, f[k]); g.stroke(); }
        }
      }
      g.globalAlpha = 1;
    };
    for (const c of this.ordered()) drawCube(c);
    if (this.hover && (this.s.state.tool === "paint" || this.s.state.tool === "erase")) {
      const f = this.faces(this.hover, s, cx, cy);
      g.strokeStyle = ink; g.lineWidth = 2; g.setLineDash([4, 3]);
      for (const k of ["left", "right", "top"]) { poly(g, f[k]); g.stroke(); }
      g.setLineDash([]);
    }
    for (const t of this.preview) drawCube({ ...t, ci: this.s.state.colour, born: -1 }, 0.55, true);
    if (this.ghost && !this.down) drawCube({ ...this.ghost, ci: this.s.state.colour, born: -1 }, 0.4, true);
  },
  render(w, h) {
    const out = document.createElement("canvas");
    out.width = w; out.height = h;
    const ghost = this.ghost, hover = this.hover;
    this.ghost = this.hover = null;
    this.draw(out.getContext("2d"), w, h, w / this.w);
    this.ghost = ghost; this.hover = hover;
    return out;
  },

  // ---------- history + links ----------
  snapshot() { return { cubes: this.cubes.map(({ i, j, k, ci }) => ({ i, j, k, ci, born: -1 })), ox: this.ox, oy: this.oy, fitK: this.fitK }; },
  restore(sn) { this.cubes = sn.cubes.map((c) => ({ ...c })); this.ox = sn.ox; this.oy = sn.oy; this.fitK = sn.fitK; this.dirty = true; },
  encode() {
    if (this.cubes.length > 500 || this.cubes.some((c) => Math.abs(c.i) > 120 || Math.abs(c.j) > 120 || c.k > 120)) return "";
    const b = new Uint8Array(this.cubes.length * 4);
    this.cubes.forEach((c, n) => { b[n * 4] = c.i + 128; b[n * 4 + 1] = c.j + 128; b[n * 4 + 2] = c.k + 128; b[n * 4 + 3] = c.ci; });
    return bytesToB64url(b);
  },
  decode(str) {
    const b = b64urlToBytes(str);
    const cubes = [];
    for (let n = 0; n + 3 < b.length; n += 4) cubes.push({ i: b[n] - 128, j: b[n + 1] - 128, k: b[n + 2] - 128, ci: b[n + 3] % 6, born: -1 });
    this.cubes = cubes;
    this._built = true;
    this.fit();
  },
};

function poly(g, pts) {
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let n = 1; n < pts.length; n++) g.lineTo(pts[n][0], pts[n][1]);
  g.closePath();
}
function inside(x, y, pts) {
  let ins = false;
  for (let a = 0, b = pts.length - 1; a < pts.length; b = a++) {
    const [xa, ya] = pts[a], [xb, yb] = pts[b];
    if (ya > y !== yb > y && x < ((xb - xa) * (y - ya)) / (yb - ya) + xa) ins = !ins;
  }
  return ins;
}

launch({
  title: "Impossible Objects",
  hook: "Build with blocks. Then build what can't exist.",
  engine,
  palette: 6,
  bg: 2,
  seed: 31,
  classic: "../impossible-objects-3d/",
  classicLabel: "Try the older 3D solid-shape lab (with 3D file export)",
}).then(enhance);
