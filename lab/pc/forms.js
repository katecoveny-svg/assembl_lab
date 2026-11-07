// assembl lab · point-cloud forms for the lab home journey: the flat mark A (its three strokes and the dot, as tubes of points),
// a calm field for the doors, and the Plan Studio demo hall sampled from the studio's own model code (so it always matches it).
import * as THREE from "three";
import { makeForm, normalise, objectForm, rng, KIND, lightFor } from "./engine.js";

// --- the mark A: the same geometry as site-v2's MARK_A (200 × 200 viewBox, 14-unit strokes, a rose dot)
const cubic = (p0, p1, p2, p3) => (t) => { const u = 1 - t; return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]; };
const line = (a, b) => (t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const STROKES = [
  cubic([66, 82], [72, 56], [132, 52], [132, 84]),
  line([132, 76], [132, 160]),
  cubic([132, 112], [132, 90], [64, 90], [64, 128]),
  cubic([64, 128], [64, 166], [132, 166], [132, 136]),
];
export function markForm(n = 120000, { seed = 4 } = {}) {
  const r = rng(seed), f = makeForm(n), R = 7, key = new THREE.Vector3(-0.45, 0.8, 0.55).normalize();
  const len = STROKES.map((c) => { let L = 0, p = c(0); for (let i = 1; i <= 64; i++) { const q = c(i / 64); L += Math.hypot(q[0] - p[0], q[1] - p[1]); p = q; } return L; });
  const tot = len.reduce((s, x) => s + x, 0), dotShare = 0.07, nn = new THREE.Vector3();
  const to3 = (x, y, z) => [(x - 100) / 100, (200 - y) / 100 - 0.25, z / 100];
  let k = 0;
  const put = (p, L, kind) => { f.pos.set(p, k * 3); f.light[k] = L; f.kind[k] = kind; k++; };
  const nTube = Math.round(n * (1 - dotShare));
  for (let i = 0; i < nTube; i++) {
    let u = r() * tot, s = 0; while (s < STROKES.length - 1 && u > len[s]) { u -= len[s]; s++; }
    const c = STROKES[s], t = Math.min(1, u / len[s]), p = c(t), q = c(Math.min(1, t + 0.01)), q0 = c(Math.max(0, t - 0.01));
    let tx = q[0] - q0[0], ty = q[1] - q0[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    const th = r() * Math.PI * 2, nx = -ty, ny = tx, cx = Math.cos(th), sz = Math.sin(th);
    const rim = Math.pow(Math.abs(cx), 6);                              // the outline as seen from the front: the rim reads as linework
    nn.set(nx * cx, -ny * cx, sz).normalize();
    put(to3(p[0] + nx * R * cx, p[1] + ny * R * cx, R * sz), Math.min(1, 0.2 + 0.55 * Math.pow(Math.abs(nn.dot(key)), 0.8) + 0.45 * rim + (sz > 0.6 ? 0.12 : 0)), rim > 0.6 ? KIND.edge : KIND.surface);
  }
  // the dot: a small sphere, the brightest thing in the mark (it picks up the iridescence)
  while (k < n) { const th = r() * Math.PI * 2, ph = Math.acos(2 * r() - 1), rr = 10 * (0.85 + 0.15 * r()); put(to3(160 + Math.sin(ph) * Math.cos(th) * rr, 160 + Math.cos(ph) * rr, Math.sin(ph) * Math.sin(th) * rr), 0.78 + 0.22 * r(), KIND.highlight); }
  f.anchors = { top: to3(100, 58, 0), stem: to3(132, 150, 0), bowl: to3(64, 128, 0), dot: to3(160, 160, 0) };
  return f;
}

// --- a calm field: a wide sheet of points over long, low swells (between chapters, behind the doors)
export function fieldForm(n = 120000, { seed = 6 } = {}) {
  const r = rng(seed), f = makeForm(n);
  for (let i = 0; i < n; i++) {
    const x = (r() - 0.5) * 3.4, z = (r() - 0.5) * 1.8 - 0.2, y = 0.05 * Math.sin(x * 2.1 + z * 1.3) + 0.03 * Math.sin(x * 4.7 - z * 3.1) + 0.015 * Math.sin(x * 9.3 + z * 7.7);
    const slope = 0.05 * 2.1 * Math.cos(x * 2.1 + z * 1.3) + 0.03 * 4.7 * Math.cos(x * 4.7 - z * 3.1), crest = (y + 0.1) / 0.2;
    f.pos.set([x, y, z], i * 3); f.light[i] = Math.min(1, 0.14 + 0.32 * crest + Math.max(0, -slope) * 0.9) * (1 - Math.min(1, Math.abs(x) / 1.9) * 0.6); f.kind[i] = KIND.ground;
  }
  return f;
}

// --- the Plan Studio demo hall, from the studio's own modules (fictional building; the anchors are real parts of it)
export async function hallForm(n = 300000) {
  const [{ buildModel }, { demoProject, polyBox }] = await Promise.all([import("/plan-studio/js/scene.js"), import("/plan-studio/js/model.js")]);
  const P = demoProject(), model = buildModel(P, { furniture: true });
  const glass = (m) => (m.material?.name === "glass-curtain" && m.material.transparent ? 0.18 : m.name === "SLAB" ? 0.5 : 1);
  const f = objectForm(model, n, { weight: glass, edgeShare: 0.36, groundShare: 0.08 });
  // anchors (plan mm → three metres: x east, −z north): the gable's ridge, the entry, the accessible WC, the hall floor
  const R = P.roof, bx = polyBox(P.rooms.flatMap((q) => q.poly)), mid = [(bx.x0 + bx.x1) / 2, (bx.y0 + bx.y1) / 2], m = (v) => v / 1000;
  const entry = P.openings.find((o) => /entry/i.test(o.note || "")) || P.openings[0], ew = P.walls.find((w) => w.id === entry.wall);
  const L = Math.hypot(ew.b[0] - ew.a[0], ew.b[1] - ew.a[1]), ex = ew.a[0] + ((ew.b[0] - ew.a[0]) * entry.at) / L, ey = ew.a[1] + ((ew.b[1] - ew.a[1]) * entry.at) / L;
  const wc = P.rooms.find((q) => q.use === "wc-accessible"), wb = wc ? polyBox(wc.poly) : bx;
  const hall = P.rooms.find((q) => q.use === "assembly") || P.rooms[0], hb = polyBox(hall.poly);
  f.anchors = {
    ridge: R.ridge === "y" ? [m(mid[0]), m(R.ridgeH), -m(bx.y0 + (bx.y1 - bx.y0) * 0.2)] : [m(bx.x0 + (bx.x1 - bx.x0) * 0.25), m(R.ridgeH), -m(mid[1])],
    entry: [m(ex), m(entry.h || 2100) * 0.9, -m(ey)],
    wc: [m((wb.x0 + wb.x1) / 2), 0.05, -m((wb.y0 + wb.y1) / 2)],
    hall: [m((hb.x0 + hb.x1) / 2), 0.05, -m((hb.y0 + hb.y1) / 2)],
  };
  return normalise(f, 1.55);
}
