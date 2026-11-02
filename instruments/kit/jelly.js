// Soft jelly bodies for Soft Matter and Squishy Lab.
// Each body is a ring of points. Springs keep the skin even, and "shape
// matching" pulls the ring back toward its remembered shape, so it wobbles.
// A simple real-time model of soft stuff, not a measurement of any material.
import { shade } from "./core.js";

const TAU = Math.PI * 2;

export const SHAPES = {
  blob: (t, r) => 1 + 0.06 * Math.sin(3 * t + r) + 0.04 * Math.sin(5 * t + 2 * r),
  pebble: (t) => 1 / Math.sqrt((Math.cos(t) / 1.18) ** 2 + (Math.sin(t) / 0.86) ** 2),
  star: (t) => 0.62 + 0.38 * Math.pow(Math.abs(Math.cos((5 * (t + Math.PI / 2)) / 2)), 1.6),
  cloud: (t) => 0.86 + 0.14 * Math.abs(Math.cos(3 * t)) + (Math.sin(t) > 0 ? -0.08 * Math.sin(t) : 0),
  flower: (t) => 0.68 + 0.32 * Math.abs(Math.cos(2.5 * t)),
  bun: (t) => 1 / Math.pow(Math.pow(Math.abs(Math.cos(t)), 3.2) + Math.pow(Math.abs(Math.sin(t) * 1.12), 3.2), 1 / 3.2),
  heart: null,
};

export function outline(shape, n, seed = 0) {
  const pts = [];
  if (shape === "heart") {
    for (let i = 0; i < n; i++) {
      const t = (i / n) * TAU;
      const x = 16 * Math.sin(t) ** 3, y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      pts.push(x / 16, (y + 2) / 16);
    }
  } else {
    const f = SHAPES[shape] || SHAPES.blob;
    for (let i = 0; i < n; i++) {
      const t = (i / n) * TAU - Math.PI / 2, r = f(t, seed);
      pts.push(Math.cos(t) * r, Math.sin(t) * r);
    }
  }
  // centre on the centroid
  let cx = 0, cy = 0;
  for (let i = 0; i < n; i++) { cx += pts[i * 2]; cy += pts[i * 2 + 1]; }
  cx /= n; cy /= n;
  for (let i = 0; i < n; i++) { pts[i * 2] -= cx; pts[i * 2 + 1] -= cy; }
  return pts;
}

export function polyArea(p, n) {
  let a = 0;
  for (let i = 0, j = n - 1; i < n; j = i++) a += p[j * 2] * p[i * 2 + 1] - p[i * 2] * p[j * 2 + 1];
  return a / 2;
}

export function makeBody({ x, y, r, shape = "blob", n = 28, ci = 0, ci2 = 2, pattern = "plain", face = "none", seed = 0 }) {
  const unit = outline(shape, n, seed);
  const rest = Float32Array.from(unit, (v) => v * r);
  const p = new Float32Array(n * 2), q = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) { p[i * 2] = q[i * 2] = x + rest[i * 2]; p[i * 2 + 1] = q[i * 2 + 1] = y + rest[i * 2 + 1]; }
  const len = new Float32Array(n);
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; len[i] = Math.hypot(rest[j * 2] - rest[i * 2], rest[j * 2 + 1] - rest[i * 2 + 1]); }
  return { p, q, rest, len, n, r, shape, ci, ci2, pattern, face, theta: 0, k: 1, area: polyArea(rest, n), cx: x, cy: y, blink: 0, id: Math.random() };
}

export function centroid(b) {
  let x = 0, y = 0;
  for (let i = 0; i < b.n; i++) { x += b.p[i * 2]; y += b.p[i * 2 + 1]; }
  b.cx = x / b.n; b.cy = y / b.n;
}

export function inside(b, x, y) {
  let ins = false;
  const p = b.p;
  for (let i = 0, j = b.n - 1; i < b.n; j = i++) {
    const xi = p[i * 2], yi = p[i * 2 + 1], xj = p[j * 2], yj = p[j * 2 + 1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}

function bbox(b) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < b.n; i++) {
    const x = b.p[i * 2], y = b.p[i * 2 + 1];
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  b.box = [x0, y0, x1, y1];
}

/** One fixed time step for a list of bodies. */
export function stepBodies(bodies, { dt, gravity, stiff, ax, ay, grab, poke, floor = true }) {
  const damp = gravity ? 0.995 : 0.97;
  for (const b of bodies) {
    const p = b.p, q = b.q;
    for (let i = 0; i < b.n * 2; i += 2) {
      const vx = (p[i] - q[i]) * damp, vy = (p[i + 1] - q[i + 1]) * damp;
      q[i] = p[i]; q[i + 1] = p[i + 1];
      p[i] += vx; p[i + 1] += vy + gravity * dt * dt;
    }
  }
  for (let it = 0; it < 4; it++) {
    for (const b of bodies) {
      centroid(b);
      const p = b.p, r = b.rest;
      let sn = 0, cs = 0;
      for (let i = 0; i < b.n; i++) {
        const qx = p[i * 2] - b.cx, qy = p[i * 2 + 1] - b.cy, rx = r[i * 2], ry = r[i * 2 + 1];
        sn += rx * qy - ry * qx; cs += rx * qx + ry * qy;
      }
      const th = Math.atan2(sn, cs), c = Math.cos(th), s = Math.sin(th);
      b.theta = th;
      for (let i = 0; i < b.n; i++) {
        const gx = b.cx + c * r[i * 2] - s * r[i * 2 + 1], gy = b.cy + s * r[i * 2] + c * r[i * 2 + 1];
        p[i * 2] += (gx - p[i * 2]) * stiff; p[i * 2 + 1] += (gy - p[i * 2 + 1]) * stiff;
      }
      for (let i = 0; i < b.n; i++) {
        const j = (i + 1) % b.n, dx = p[j * 2] - p[i * 2], dy = p[j * 2 + 1] - p[i * 2 + 1], d = Math.hypot(dx, dy) || 1e-6;
        const k = ((d - b.len[i]) / d) * 0.25;
        p[i * 2] += dx * k; p[i * 2 + 1] += dy * k; p[j * 2] -= dx * k; p[j * 2 + 1] -= dy * k;
      }
    }
    if (grab) {
      const p = grab.body.p;
      grab.idx.forEach((i, n) => {
        const w = grab.w[n] * 0.55;
        p[i * 2] += (grab.x + grab.off[n * 2] - p[i * 2]) * w;
        p[i * 2 + 1] += (grab.y + grab.off[n * 2 + 1] - p[i * 2 + 1]) * w;
      });
    }
    if (poke) {
      for (const b of bodies) for (let i = 0; i < b.n; i++) {
        const dx = b.p[i * 2] - poke.x, dy = b.p[i * 2 + 1] - poke.y, d = Math.hypot(dx, dy);
        if (d < poke.r && d > 1e-5) { const k = ((poke.r - d) / d) * 0.5; b.p[i * 2] += dx * k; b.p[i * 2 + 1] += dy * k; }
      }
    }
    collide(bodies);
    for (const b of bodies) {
      const p = b.p, q = b.q, m = 0.01;
      for (let i = 0; i < b.n; i++) {
        let x = p[i * 2], y = p[i * 2 + 1];
        if (x < -ax + m) { x = -ax + m; q[i * 2] = x; }
        if (x > ax - m) { x = ax - m; q[i * 2] = x; }
        if (y < -ay + m) { y = -ay + m; q[i * 2 + 1] = y; }
        if (floor && y > ay - m) { y = ay - m; q[i * 2] += (x - q[i * 2]) * 0.35; q[i * 2 + 1] = y; }
        p[i * 2] = x; p[i * 2 + 1] = y;
      }
    }
  }
  for (const b of bodies) { centroid(b); b.k = Math.max(0.2, polyArea(b.p, b.n) / b.area); }
}

function collide(bodies) {
  for (const b of bodies) bbox(b);
  for (let a = 0; a < bodies.length; a++) for (let c = a + 1; c < bodies.length; c++) {
    const A = bodies[a], B = bodies[c];
    if (A.box[2] < B.box[0] || B.box[2] < A.box[0] || A.box[3] < B.box[1] || B.box[3] < A.box[1]) continue;
    push(A, B); push(B, A);
  }
}
function push(A, B) {
  const p = A.p, bp = B.p;
  for (let i = 0; i < A.n; i++) {
    const x = p[i * 2], y = p[i * 2 + 1];
    if (x < B.box[0] || x > B.box[2] || y < B.box[1] || y > B.box[3] || !inside(B, x, y)) continue;
    let best = Infinity, bx = 0, by = 0, bj = 0, bt = 0;
    for (let j = 0; j < B.n; j++) {
      const k = (j + 1) % B.n, x0 = bp[j * 2], y0 = bp[j * 2 + 1], ex = bp[k * 2] - x0, ey = bp[k * 2 + 1] - y0;
      const t = Math.max(0, Math.min(1, ((x - x0) * ex + (y - y0) * ey) / (ex * ex + ey * ey || 1e-9)));
      const cx = x0 + ex * t, cy = y0 + ey * t, d = (cx - x) ** 2 + (cy - y) ** 2;
      if (d < best) { best = d; bx = cx; by = cy; bj = j; bt = t; }
    }
    const dx = bx - x, dy = by - y;
    p[i * 2] += dx * 0.55; p[i * 2 + 1] += dy * 0.55;
    const k = (bj + 1) % B.n;
    bp[bj * 2] -= dx * 0.45 * (1 - bt); bp[bj * 2 + 1] -= dy * 0.45 * (1 - bt);
    bp[k * 2] -= dx * 0.45 * bt; bp[k * 2 + 1] -= dy * 0.45 * bt;
  }
}

// ---------- drawing ----------
export function tracePath(g, p, n, X, Y) {
  g.beginPath();
  const mx = (i) => (X(p[i * 2]) + X(p[((i + 1) % n) * 2])) / 2;
  const my = (i) => (Y(p[i * 2 + 1]) + Y(p[((i + 1) % n) * 2 + 1])) / 2;
  g.moveTo(mx(n - 1), my(n - 1));
  for (let i = 0; i < n; i++) g.quadraticCurveTo(X(p[i * 2]), Y(p[i * 2 + 1]), mx(i), my(i));
  g.closePath();
}

export function drawBody(g, b, { cols, X, Y, U, style = "glossy", dark = false, now = 0, grabbed = false }) {
  const col = cols[b.ci % cols.length], pc = cols[b.ci2 % cols.length];
  const r = b.r * U, cx = X(b.cx), cy = Y(b.cy), th = b.theta, k = b.k;
  const path = () => tracePath(g, b.p, b.n, X, Y);
  g.save();
  if (style !== "flat") {
    g.save();
    g.translate(0, r * 0.12);
    path();
    g.fillStyle = dark ? "rgba(0,0,0,.35)" : "rgba(36,11,33,.13)";
    g.filter = "none";
    g.fill();
    g.restore();
  }
  if (style === "sticker") {
    path();
    g.lineJoin = "round";
    g.lineWidth = Math.max(4, r * 0.16);
    g.strokeStyle = "#FFFFFF";
    g.stroke();
  }
  path();
  if (style === "glossy") {
    const ox = Math.cos(th) * -0.3 - Math.sin(th) * -0.38, oy = Math.sin(th) * -0.3 + Math.cos(th) * -0.38;
    const grd = g.createRadialGradient(cx + ox * r, cy + oy * r, r * 0.05, cx, cy, r * 1.35);
    grd.addColorStop(0, shade(col, 0.42));
    grd.addColorStop(0.45, col);
    grd.addColorStop(1, shade(col, -0.18));
    g.fillStyle = grd;
  } else g.fillStyle = col;
  g.fill();
  if (b.pattern && b.pattern !== "plain") {
    g.save();
    path();
    g.clip();
    g.translate(cx, cy);
    g.rotate(th);
    const sc = Math.sqrt(k);
    g.scale(r * sc, r * sc);
    drawPattern(g, b.pattern, pc, cols, b.id);
    g.restore();
    if (style === "glossy") {
      path();
      const grd = g.createRadialGradient(cx, cy, r * 0.4, cx, cy, r * 1.3);
      grd.addColorStop(0, "rgba(255,255,255,0)");
      grd.addColorStop(1, "rgba(36,11,33,.16)");
      g.fillStyle = grd;
      g.fill();
    }
  }
  if (style === "flat") {
    path();
    g.lineWidth = Math.max(1.5, r * 0.05);
    g.strokeStyle = shade(col, -0.35);
    g.stroke();
  }
  if (style === "glossy") {
    g.save();
    g.translate(cx, cy);
    g.rotate(th);
    g.beginPath();
    g.ellipse(-0.36 * r, -0.46 * r * Math.min(1, k), 0.24 * r, 0.11 * r, -0.55, 0, TAU);
    g.fillStyle = "rgba(255,255,255,.62)";
    g.fill();
    g.beginPath();
    g.arc(-0.08 * r, -0.62 * r * Math.min(1, k), 0.04 * r, 0, TAU);
    g.fill();
    g.restore();
  }
  if (b.face && b.face !== "none") drawFace(g, b, cx, cy, r, th, k, now, grabbed);
  g.restore();
}

function drawPattern(g, kind, pc, cols, id) {
  g.fillStyle = pc;
  g.strokeStyle = pc;
  if (kind === "dots") {
    for (let y = -1.6; y <= 1.6; y += 0.34) for (let x = -1.6; x <= 1.6; x += 0.34) {
      g.beginPath();
      g.arc(x + (Math.round(y / 0.34) % 2 ? 0.17 : 0), y, 0.075, 0, TAU);
      g.fill();
    }
  } else if (kind === "stripes") {
    g.globalAlpha = 0.85;
    for (let x = -3; x < 3; x += 0.36) { g.beginPath(); g.moveTo(x, -2); g.lineTo(x + 0.16, -2); g.lineTo(x + 1.16, 2); g.lineTo(x + 1, 2); g.closePath(); g.fill(); }
  } else if (kind === "checks") {
    g.globalAlpha = 0.55;
    for (let y = -2; y < 2; y += 0.3) for (let x = -2; x < 2; x += 0.3) if ((Math.round(x / 0.3) + Math.round(y / 0.3)) % 2 === 0) g.fillRect(x, y, 0.3, 0.3);
  } else if (kind === "sprinkles") {
    let s = Math.floor((id || 0.5) * 1e6) || 7;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    g.lineCap = "round";
    g.lineWidth = 0.07;
    for (let i = 0; i < 46; i++) {
      const x = r() * 3 - 1.5, y = r() * 3 - 1.5, a = r() * TAU;
      g.strokeStyle = cols[Math.floor(r() * cols.length)];
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 0.16, y + Math.sin(a) * 0.16); g.stroke();
    }
  } else if (kind === "swirl") {
    g.lineWidth = 0.13;
    g.lineCap = "round";
    g.globalAlpha = 0.8;
    g.beginPath();
    for (let t = 0; t < 26; t += 0.08) { const rr = 0.05 + t * 0.06; const x = Math.cos(t) * rr, y = Math.sin(t) * rr; t ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
  } else if (kind === "hearts") {
    for (let y = -1.6; y <= 1.6; y += 0.5) for (let x = -1.6; x <= 1.6; x += 0.5) {
      const ox = x + (Math.round(y / 0.5) % 2 ? 0.25 : 0);
      g.beginPath();
      g.moveTo(ox, y + 0.09);
      g.bezierCurveTo(ox - 0.16, y - 0.04, ox - 0.07, y - 0.15, ox, y - 0.05);
      g.bezierCurveTo(ox + 0.07, y - 0.15, ox + 0.16, y - 0.04, ox, y + 0.09);
      g.fill();
    }
  }
  g.globalAlpha = 1;
}

function drawFace(g, b, cx, cy, r, th, k, now, grabbed) {
  g.save();
  g.translate(cx, cy);
  g.rotate(th);
  const squash = Math.max(0.25, Math.min(1, k * 1.05));
  const blink = now && b.blink > now ? 0.12 : 1;
  const ink = "#240B21";
  g.fillStyle = ink;
  const ey = -0.08 * r, ex = 0.3 * r, er = 0.085 * r;
  const face = b.face;
  for (const s of [-1, 1]) {
    g.beginPath();
    if (face === "sleepy") {
      g.lineWidth = Math.max(1.5, r * 0.045); g.strokeStyle = ink; g.lineCap = "round";
      g.arc(s * ex, ey, er, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    } else {
      g.ellipse(s * ex, ey, er, er * squash * blink * (grabbed || face === "wow" ? 1.25 : 1), 0, 0, TAU);
      g.fill();
      if (blink === 1) { g.beginPath(); g.fillStyle = "#FFFFFF"; g.arc(s * ex + er * 0.35, ey - er * 0.35 * squash, er * 0.32, 0, TAU); g.fill(); g.fillStyle = ink; }
    }
  }
  g.lineWidth = Math.max(1.5, r * 0.045); g.strokeStyle = ink; g.lineCap = "round";
  g.beginPath();
  if (grabbed || face === "wow") { g.ellipse(0, 0.16 * r, 0.07 * r, 0.09 * r * squash, 0, 0, TAU); g.fill(); }
  else { g.arc(0, 0.08 * r, 0.13 * r, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke(); }
  // cheeks
  g.fillStyle = "rgba(243,165,190,.55)";
  for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * 0.46 * r, 0.1 * r, 0.09 * r, 0.05 * r, 0, 0, TAU); g.fill(); }
  g.restore();
}

export function copyBody(b) {
  return { ...b, p: b.p.slice(), q: b.q.slice(), rest: b.rest.slice(), len: b.len.slice() };
}
