// assembl lab · the picker's walk, as a small point-cloud floor plan. Illustrative: a generic supermarket interior drawn in code,
// not this store's layout. Drawn on a 2D canvas with the point-cloud standard's tone ramp and additive light (a few thousand
// points, so no second WebGL context). The picker's trail lights up as the pick goes; the empty shelf is a hollow ring.
import { TONES, rng } from "/lab/pc/engine.js";

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const RAMP = TONES.map(hex);
const tone = (l) => { const x = Math.min(0.9999, Math.max(0, l)) * 5, i = Math.floor(x), f = x - i, a = RAMP[i], b = RAMP[i + 1]; return a.map((v, k) => Math.round(v + (b[k] - v) * f)); };

// the plan in a 1 × 0.6 box: walls, produce bins, six aisles, chillers on the back wall, meat on the right, checkouts at the front
const SHELVES = [];
for (let i = 0; i < 6; i++) SHELVES.push([0.33 + i * 0.09, 0.17, 0.035, 0.27]);                 // aisles
const BINS = [[0.06, 0.14, 0.07, 0.06], [0.15, 0.14, 0.07, 0.06], [0.06, 0.25, 0.07, 0.06], [0.15, 0.25, 0.07, 0.06], [0.06, 0.36, 0.07, 0.06], [0.15, 0.36, 0.07, 0.06]];
const CHILL = [0.3, 0.045, 0.6, 0.035], MEAT = [0.925, 0.12, 0.03, 0.3], BAKERY = [0.05, 0.46, 0.17, 0.04];
const TILLS = [0, 1, 2, 3, 4].map((i) => [0.36 + i * 0.1, 0.52, 0.05, 0.025]);
// the pick path: from the online pick station (front right), produce, bakery, chiller, meat, dry goods, and back
const PATH = [[0.9, 0.56], [0.27, 0.56], [0.27, 0.11], [0.03, 0.11], [0.03, 0.44], [0.25, 0.44], [0.25, 0.11], [0.31, 0.11], [0.5, 0.11], [0.7, 0.11], [0.89, 0.11], [0.89, 0.46], [0.83, 0.46], [0.83, 0.15], [0.74, 0.15], [0.74, 0.46], [0.9, 0.46], [0.9, 0.56]];
// where each item is picked, as a fraction of the path (the butter shelf sits on the back wall's chiller)
const ITEMS = [["bananas", 0.12], ["apples", 0.16], ["kiwifruit", 0.2], ["carrots", 0.24], ["potatoes", 0.27], ["tomatoes", 0.3], ["broccoli", 0.33], ["bread", 0.38], ["milk2l", 0.47], ["butter", 0.52], ["cheese", 0.56], ["eggs", 0.6], ["beefMince", 0.7]];

export function createFloor(canvas) {
  const g = canvas.getContext("2d"), r = rng(41), pts = [];
  const rect = ([x, y, w, h], n, L) => { for (let k = 0; k < n; k++) { const e = r() < 0.7, t = r(); let px, py; if (e) { const side = Math.floor(r() * 4); px = side < 2 ? x + t * w : side === 2 ? x : x + w; py = side < 2 ? (side ? y + h : y) : y + t * h; } else { px = x + r() * w; py = y + r() * h; } pts.push([px + (r() - 0.5) * 0.003, py + (r() - 0.5) * 0.003, (e ? L : L * 0.55) + r() * 0.08]); } };
  rect([0.01, 0.02, 0.98, 0.58], 1400, 0.5);                       // walls
  SHELVES.forEach((s) => rect(s, 420, 0.46)); BINS.forEach((s) => rect(s, 120, 0.42)); rect(CHILL, 520, 0.56); rect(MEAT, 260, 0.48); rect(BAKERY, 200, 0.44); TILLS.forEach((s) => rect(s, 70, 0.36));
  for (let k = 0; k < 900; k++) pts.push([0.02 + r() * 0.96, 0.03 + r() * 0.56, 0.08 + r() * 0.06]);   // the floor, faint
  // the path, resampled by length
  const seg = []; let L = 0; for (let i = 0; i + 1 < PATH.length; i++) { const a = PATH[i], b = PATH[i + 1], d = Math.hypot(b[0] - a[0], b[1] - a[1]); seg.push([a, b, L, d]); L += d; }
  const at = (f) => { const s = f * L; const q = seg.find((x) => s <= x[2] + x[3]) || seg[seg.length - 1]; const u = Math.min(1, (s - q[2]) / q[3]); return [q[0][0] + (q[1][0] - q[0][0]) * u, q[0][1] + (q[1][1] - q[0][1]) * u]; };
  const trail = []; for (let k = 0; k < 900; k++) { const f = k / 899, p = at(f); trail.push([p[0] + (r() - 0.5) * 0.006, p[1] + (r() - 0.5) * 0.006, f]); }
  let W = 0, H = 0, PR = 1;
  function size() { PR = Math.min(2, devicePixelRatio || 1); const w = canvas.clientWidth, h = canvas.clientHeight; if (w !== W || h !== H) { W = w; H = h; canvas.width = Math.round(w * PR); canvas.height = Math.round(h * PR); } }
  // progress 0–1 along the pick; outKey: the item whose shelf is empty (or null); time for the shimmer
  function draw(progress, { outKey = null, time = 0 } = {}) {
    size(); if (!W) return; const s = Math.min(W / 1, H / 0.6) * PR, ox = (W * PR - s) / 2, oy = (H * PR - 0.6 * s) / 2, X = (x) => ox + x * s, Y = (y) => oy + y * s;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height); g.globalCompositeOperation = "lighter";
    const dot = 1.5 * PR;
    for (const [x, y, l] of pts) { const [cr, cg, cb] = tone(l); g.fillStyle = `rgba(${cr},${cg},${cb},.8)`; g.fillRect(X(x) - dot / 2, Y(y) - dot / 2, dot, dot); }
    for (const [x, y, f] of trail) { const done = f <= progress, l = done ? 0.86 + 0.1 * Math.sin(time * 2 + f * 40) : 0.3; if (!done && progress >= 1) continue; const [cr, cg, cb] = tone(l); g.fillStyle = `rgba(${cr},${cg},${cb},${done ? 0.95 : 0.35})`; const d = done ? dot * 1.4 : dot; g.fillRect(X(x) - d / 2, Y(y) - d / 2, d, d); }
    g.globalCompositeOperation = "source-over";
    for (const [key, f] of ITEMS) {
      const p = at(f), got = progress >= f, x = X(p[0]), y = Y(p[1]);
      if (key === outKey && got) { g.strokeStyle = "#F4BEDA"; g.lineWidth = 1.4 * PR; g.beginPath(); g.arc(x, y, 5.5 * PR, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(x - 3 * PR, y - 3 * PR); g.lineTo(x + 3 * PR, y + 3 * PR); g.moveTo(x + 3 * PR, y - 3 * PR); g.lineTo(x - 3 * PR, y + 3 * PR); g.stroke(); }
      else { g.fillStyle = got ? "#F9F6F2" : "rgba(217,186,203,.45)"; g.beginPath(); g.arc(x, y, (got ? 2.6 : 2) * PR, 0, Math.PI * 2); g.fill(); }
    }
    if (progress > 0 && progress < 1) { const p = at(progress), x = X(p[0]), y = Y(p[1]), gr = g.createRadialGradient(x, y, 0, x, y, 12 * PR); gr.addColorStop(0, "rgba(249,246,242,.95)"); gr.addColorStop(0.35, "rgba(244,190,218,.5)"); gr.addColorStop(1, "rgba(244,190,218,0)"); g.fillStyle = gr; g.beginPath(); g.arc(x, y, 12 * PR, 0, Math.PI * 2); g.fill(); }
  }
  return { draw, items: ITEMS.map((i) => i[0]), found: (progress, outKey) => ITEMS.filter(([k, f]) => progress >= f && k !== outKey).length };
}
