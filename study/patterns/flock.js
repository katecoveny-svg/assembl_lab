/* Flocking, with the rules showing: Craig Reynolds' boids (1987).
 * Every bird steers by three local rules only: separation (don't crowd), alignment (match your neighbours' heading)
 * and cohesion (move towards their centre). One focus bird shows its neighbourhood and the three steering arrows.
 * Fixed time steps and no hidden coefficient drift, so a comparison between two settings is fair.
 * A model of the idea, not a measurement of real starlings. */
import {rng, PALETTES} from './gpu.js';

const WORLD_H = 800;
export const RULES = [['sep', 'Separation', '#E8606A'], ['ali', 'Alignment', '#8E6FD1'], ['coh', 'Cohesion', '#3F9C86']];

// One boid's steering from its neighbours. Pure, so it can be tested without a canvas.
export function steer(b, neighbours, w, {maxSpeed = 150, maxForce = 260, vision = 90} = {}) {
  const out = {sep: [0, 0], ali: [0, 0], coh: [0, 0]};
  if (!neighbours.length) return out;
  let sx = 0, sy = 0, ax = 0, ay = 0, cx = 0, cy = 0, close = 0;
  for (const o of neighbours) {
    const dx = b.x - o.x, dy = b.y - o.y, d2 = dx * dx + dy * dy || 1e-3;
    if (d2 < (vision * .5) ** 2) { sx += dx / d2; sy += dy / d2; close++; }
    ax += o.vx; ay += o.vy; cx += o.x; cy += o.y;
  }
  const n = neighbours.length;
  const toward = (x, y, weight) => { const m = Math.hypot(x, y); if (!m || !weight) return [0, 0]; let fx = x / m * maxSpeed - b.vx, fy = y / m * maxSpeed - b.vy; const f = Math.hypot(fx, fy); if (f > maxForce) { fx *= maxForce / f; fy *= maxForce / f; } return [fx * weight, fy * weight]; };
  if (close) out.sep = toward(sx, sy, w.sep * 1.5);
  out.ali = toward(ax / n, ay / n, w.ali);
  out.coh = toward(cx / n - b.x, cy / n - b.y, w.coh);
  return out;
}

export function createFlock(canvas) {
  const ctx = canvas.getContext('2d'), mobile = matchMedia('(pointer: coarse)').matches, count = mobile ? 180 : 320;
  let boids = [], W = 1200, dpr = 1, last = 0, settings = {}, focus = 0, hawk = null, hawkAt = -10, now = 0, forces = null;
  const weights = () => ({sep: settings.sep ?? 1, ali: settings.ali ?? 1, coh: settings.coh ?? 1});
  const vision = () => 50 + (settings.energy ?? .55) * 110;
  // The world keeps its size; the canvas shows it like object-fit: cover (so exports do not reshuffle the flock).
  function view() { const cw = canvas.width / dpr, ch = canvas.height / dpr, s = Math.max(cw / W, ch / WORLD_H); return {s, ox: (cw - W * s) / 2, oy: (ch - WORLD_H * s) / 2}; }
  function seed(value) {
    const r = rng(value); W = Math.round(WORLD_H * Math.max(.5, Math.min(2.4, canvas.width / canvas.height || 1.5)));
    boids = Array.from({length: count}, () => { const a = r() * Math.PI * 2; return {x: r() * W, y: r() * WORLD_H, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90}; });
    focus = 0; forces = null;
  }
  function step(dt) {
    const v = vision(), w = weights(), cell = v, cols = Math.ceil(W / cell), grid = new Map();
    boids.forEach((b, i) => { const k = Math.floor(b.x / cell) + Math.floor(b.y / cell) * cols; (grid.get(k) || grid.set(k, []).get(k)).push(i); });
    const hawkLive = hawk && now - hawkAt < 1.4;
    const next = boids.map((b, i) => {
      const gx = Math.floor(b.x / cell), gy = Math.floor(b.y / cell), near = [];
      for (let y = gy - 1; y <= gy + 1; y++) for (let x = gx - 1; x <= gx + 1; x++) for (const j of grid.get(((x + cols) % cols) + ((y + Math.ceil(WORLD_H / cell)) % Math.ceil(WORLD_H / cell)) * cols) || []) {
        if (j === i) continue; const o = boids[j]; let dx = o.x - b.x, dy = o.y - b.y;
        if (dx > W / 2) dx -= W; if (dx < -W / 2) dx += W; if (dy > WORLD_H / 2) dy -= WORLD_H; if (dy < -WORLD_H / 2) dy += WORLD_H;
        if (dx * dx + dy * dy < v * v) near.push({x: b.x + dx, y: b.y + dy, vx: o.vx, vy: o.vy});
      }
      const f = steer(b, near, w, {vision: v});
      let ax = f.sep[0] + f.ali[0] + f.coh[0], ay = f.sep[1] + f.ali[1] + f.coh[1];
      if (hawkLive) { const dx = b.x - hawk[0], dy = b.y - hawk[1], d = Math.hypot(dx, dy); if (d < 150) { ax += dx / d * 900 * (1 - d / 150); ay += dy / d * 900 * (1 - d / 150); } }
      if (i === focus) forces = {...f, near, sum: [ax, ay]};
      let vx = b.vx + ax * dt, vy = b.vy + ay * dt; const s = Math.hypot(vx, vy), lim = clampSpeed(s);
      vx *= lim / (s || 1); vy *= lim / (s || 1);
      return {x: (b.x + vx * dt + W) % W, y: (b.y + vy * dt + WORLD_H) % WORLD_H, vx, vy};
    });
    boids = next;
  }
  const clampSpeed = s => Math.max(60, Math.min(170, s));
  function arrow(x, y, fx, fy, colour, width = 2.4, scale = .32) {
    const ex = x + fx * scale, ey = y + fy * scale, a = Math.atan2(fy, fx), len = Math.hypot(fx, fy) * scale; if (len < 3) return;
    ctx.strokeStyle = ctx.fillStyle = colour; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - Math.cos(a - .45) * 9, ey - Math.sin(a - .45) * 9); ctx.lineTo(ex - Math.cos(a + .45) * 9, ey - Math.sin(a + .45) * 9); ctx.fill();
  }
  function draw() {
    const dark = !!settings.dark, {s, ox, oy} = view(), ink = PALETTES[settings.tone || 0].inks;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = dark ? '#17112A' : '#FBF7F1'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save(); ctx.translate(ox, oy); ctx.scale(s, s);
    const body = dark ? '#E9E1F5' : '#3A2A45';
    for (let i = 0; i < boids.length; i++) {
      const b = boids[i], a = Math.atan2(b.vy, b.vx); ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(a);
      ctx.fillStyle = i === focus ? ink[0] : body; ctx.globalAlpha = i === focus ? 1 : .78; const k = i === focus ? 1.8 : 1;
      ctx.beginPath(); ctx.moveTo(9 * k, 0); ctx.lineTo(-6 * k, 4.5 * k); ctx.lineTo(-3 * k, 0); ctx.lineTo(-6 * k, -4.5 * k); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    ctx.globalAlpha = 1;
    const b = boids[focus];
    if (b && forces) {
      ctx.setLineDash([4, 6]); ctx.strokeStyle = dark ? '#ffffff55' : '#240B2140'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(b.x, b.y, vision(), 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = dark ? '#ffffff30' : '#240B2122'; ctx.lineWidth = 1; for (const o of forces.near) { ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(o.x, o.y); ctx.stroke(); }
      RULES.forEach(([key, , colour]) => arrow(b.x, b.y, forces[key][0], forces[key][1], colour));
      arrow(b.x, b.y, forces.sum[0], forces.sum[1], dark ? '#ffffff' : '#240B21', 3.2);
    }
    if (hawk && now - hawkAt < 1.4) { ctx.strokeStyle = ink[3]; ctx.globalAlpha = 1 - (now - hawkAt) / 1.4; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hawk[0], hawk[1], 150, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
    ctx.restore();
    // Legend: what each arrow on the focus bird means, with its current weight.
    const w = weights(), x0 = 26, y0 = 74;
    ctx.font = '600 12px "Instrument Sans", system-ui, sans-serif'; ctx.textBaseline = 'middle';
    ctx.fillStyle = dark ? '#ffffffd0' : '#FFFDFBe6'; ctx.beginPath(); ctx.roundRect(x0 - 8, y0 - 14, 200, 104, 14); ctx.fill();
    RULES.forEach(([key, label, colour], i) => { ctx.fillStyle = colour; ctx.fillRect(x0, y0 + i * 22 - 2, 18, 4); ctx.fillStyle = '#240B21'; ctx.fillText(`${label} × ${w[key].toFixed(1)}`, x0 + 26, y0 + i * 22); });
    ctx.fillStyle = '#240B21'; ctx.fillRect(x0, y0 + 66 - 2, 18, 4); ctx.fillText('Total steering', x0 + 26, y0 + 66);
  }
  function toWorld(x, y) { const {s, ox, oy} = view(), cw = canvas.width / dpr, ch = canvas.height / dpr; return [(x * cw - ox) / s, (y * ch - oy) / s]; }
  return {
    renderer: 'canvas2d',
    resize(w, h, d = 1) { dpr = Math.min(d, 2); canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); if (!boids.length) seed(settings.seed); },
    reset(value, s = settings) { settings = s; last = 0; hawk = null; seed(value); for (let i = 0; i < 90; i++) step(1 / 60); },
    render(time, s) {
      settings = s; now = time; if (!boids.length) seed(s.seed);
      if (time < last) last = time;
      let dt = Math.min(time - last, .1); last = time;
      while (dt > 1e-4) { const h = Math.min(dt, 1 / 60); step(h); dt -= h; }
      draw();
    },
    interact(x, y, dx = 0, dy = 0) {
      const [wx, wy] = toWorld(x, y);
      if (!dx && !dy) { let best = -1, bd = 40 * 40; boids.forEach((b, i) => { const d = (b.x - wx) ** 2 + (b.y - wy) ** 2; if (d < bd) { bd = d; best = i; } }); if (best >= 0) { focus = best; return; } }
      hawk = [wx, wy]; hawkAt = now;
    },
    dispose() {},
  };
}
