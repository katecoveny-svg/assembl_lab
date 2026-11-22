// The camera-path maths (plan-studio/twins/src/twin/camPath.ts): following a drawn line on a sketch, laying the sketch on the
// ground by two matched points, and the even, smooth curve the fly-through follows. Invented pictures, drawn here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { traceStroke, strokeColour, simplify, align2, spline, eyeAt, pathRecord, DEFAULT_EYE, PATH_SCHEMA } from '../../plan-studio/twins/src/twin/camPath.ts';

/** a white sheet with a black rectangle (the site) and a coloured polyline drawn `w` pixels wide */
function sheet(W, H, line, colour = [220, 30, 30], w = 4, gaps = 0) {
  const d = new Uint8ClampedArray(W * H * 4).fill(255);
  const dot = (x, y, c) => { for (let dy = -w / 2; dy <= w / 2; dy++) for (let dx = -w / 2; dx <= w / 2; dx++) { const X = Math.round(x + dx), Y = Math.round(y + dy); if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const k = (Y * W + X) * 4; d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; } };
  for (let x = 20; x < W - 20; x++) { dot(x, 20, [0, 0, 0]); dot(x, H - 20, [0, 0, 0]); }
  for (let y = 20; y < H - 20; y++) { dot(20, y, [0, 0, 0]); dot(W - 20, y, [0, 0, 0]); }
  let run = 0;
  for (let i = 0; i + 1 < line.length; i++) {
    const [ax, ay] = line[i], [bx, by] = line[i + 1], L = Math.hypot(bx - ax, by - ay);
    for (let t = 0; t <= L; t += 0.5) { run += 0.5; if (gaps && Math.floor(run / gaps) % 2) continue; dot(ax + ((bx - ax) * t) / L, ay + ((by - ay) * t) / L, colour); }
  }
  return { width: W, height: H, data: d };
}
const near = (p, q, tol) => Math.hypot(p[0] - q[0], p[1] - q[1]) <= tol;
const onLine = (p, line, tol) => line.some((a, i) => { if (i + 1 >= line.length) return false; const b = line[i + 1], L2 = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / L2)); return Math.hypot(p[0] - a[0] - t * (b[0] - a[0]), p[1] - a[1] - t * (b[1] - a[1])) <= tol; });

test('a red L drawn on a site plan comes back as three points, end to end, ignoring the black boundary', () => {
  const L = [[60, 300], [60, 80], [340, 80]], img = sheet(400, 360, L);
  const hue = strokeColour(img).hue; assert.ok(hue < 20 || hue > 340, `the pen is red (${hue}°)`);
  const t = traceStroke(img);
  assert.ok(t.pts.length >= 3 && t.pts.length <= 5, `${t.pts.length} points`);
  const ends = [t.pts[0], t.pts[t.pts.length - 1]];
  assert.ok(ends.some((e) => near(e, L[0], 8)) && ends.some((e) => near(e, L[2], 8)), `ends ${JSON.stringify(ends)}`);
  assert.ok(t.pts.some((p) => near(p, L[1], 8)), 'the corner is kept');
  for (const p of t.pts) assert.ok(onLine(p, L, 4), `on the drawn line: ${p}`);
  assert.equal(t.pieces, 1);
  assert.match(t.colour, /^#[0-9a-f]{6}$/);
});

test('a dashed blue curve is joined across its gaps and followed in order', () => {
  const C = Array.from({ length: 40 }, (_, i) => { const a = (i / 39) * Math.PI; return [200 - 130 * Math.cos(a), 300 - 200 * Math.sin(a)]; });
  const t = traceStroke(sheet(400, 360, C, [30, 60, 220], 4, 12));
  assert.ok(t.pieces > 3, `a dashed line is in pieces (${t.pieces})`);
  for (const p of t.pts) assert.ok(onLine(p, C, 5), `on the curve: ${p}`);
  const ends = [t.pts[0], t.pts[t.pts.length - 1]];
  assert.ok(ends.some((e) => near(e, C[0], 14)) && ends.some((e) => near(e, C[39], 14)), `ends ${JSON.stringify(ends)}`);
  // in order: along this half circle x only ever moves one way
  const xs = t.pts.map((p) => p[0]), dir = Math.sign(xs[xs.length - 1] - xs[0]);
  for (let i = 1; i < xs.length; i++) assert.ok((xs[i] - xs[i - 1]) * dir >= -4, `ordered along the line at ${i}: ${xs[i - 1]} → ${xs[i]}`);
});

test('a sketch with no coloured line says so and proposes nothing', () => {
  const t = traceStroke(sheet(200, 200, []));
  assert.deepEqual(t.pts, []); assert.match(t.why, /no coloured line/);
});

test('simplify keeps the corners and drops points on a straight run', () => {
  const pts = [[0, 0], [1, 0.01], [2, 0], [3, 0], [3, 1], [3, 2.02], [3, 3]];
  assert.deepEqual(simplify(pts, 0.1), [[0, 0], [3, 0], [3, 3]]);
});

test('two matched points: the sketch is moved, turned and scaled, never mirrored, and the other points follow', () => {
  // sketch pixels to ground metres: 0.05 m a pixel, turned 30°, moved to (12, -4)
  const s = 0.05, th = Math.PI / 6, T = ([x, y]) => [12 + s * (x * Math.cos(th) - y * Math.sin(th)), -4 + s * (x * Math.sin(th) + y * Math.cos(th))];
  const a1 = [100, 120], a2 = [640, 410], al = align2(a1, a2, T(a1), T(a2));
  assert.ok(Math.abs(al.scale - s) < 1e-12); assert.ok(Math.abs(al.turnDeg - 30) < 1e-9);
  for (const p of [[0, 0], [800, 0], [333, 777]]) { const q = al.apply(p), r = T(p); assert.ok(near(q, r, 1e-9)); assert.ok(near(al.invert(q), p, 1e-7)); }
  assert.throws(() => align2([1, 1], [1, 1], [0, 0], [5, 5]), /same point/);
});

test('the spline passes through every point, is sampled evenly, and its length is right on a straight line', () => {
  const sp = spline([[0, 0], [10, 0], [20, 0]], 0.5);
  assert.ok(Math.abs(sp.length - 20) < 1e-6, `length ${sp.length}`);
  const gaps = sp.pts.slice(1).map((p, i) => Math.hypot(p[0] - sp.pts[i][0], p[1] - sp.pts[i][1]));
  assert.ok(Math.max(...gaps) - Math.min(...gaps) < 1e-6, 'even steps');
  const bend = spline([[0, 0], [10, 0], [10, 10], [0, 10]], 0.25);
  for (const n of [[0, 0], [10, 0], [10, 10], [0, 10]]) assert.ok(bend.pts.some((p) => near(p, n, 0.13)), `passes through ${n}`);
  // centripetal: no loop or overshoot past the corner more than a little
  assert.ok(bend.pts.every((p) => p[0] < 11.5 && p[0] > -1.5 && p[1] > -1.5 && p[1] < 11.5));
  const steps = bend.pts.slice(1).map((p, i) => Math.hypot(p[0] - bend.pts[i][0], p[1] - bend.pts[i][1]));
  assert.ok(Math.max(...steps) / Math.min(...steps) < 1.05, 'even along the curve too');
  assert.throws(() => spline([[0, 0]]), /two points/);
});

test('the eye follows the ground at the eye height and looks ahead along the path, past the end too', () => {
  const sp = spline([[0, 0], [30, 0]], 0.5), ground = (x) => x * 0.1;
  const a = eyeAt(sp, 10, ground, 1.6, 6);
  assert.ok(Math.abs(a.eye[1] - (1 + 1.6)) < 1e-6); assert.ok(Math.abs(a.look[0] - 16) < 1e-6);
  const end = eyeAt(sp, 29, ground, 1.6, 6);
  assert.ok(end.look[0] > 30, 'looks on beyond the end, not back');
});

test('the record: model-frame points, a proposal until a person confirms, the eye height labelled', () => {
  const nodes = [[1, 2], [4, 6]];
  const prop = pathRecord({ nodes, tracedBy: 'tool', tracedHow: 'traced by assembl from the #dc1e1e line', frame: 'test frame', sketchFileId: 'f1' });
  assert.equal(prop.schema, PATH_SCHEMA);
  assert.deepEqual(prop.pts, [[1, 2, DEFAULT_EYE], [4, 6, DEFAULT_EYE]]);
  assert.equal(prop.height.source, 'assumed'); assert.equal(prop.confirmed_by, null); assert.equal(prop.confirmed_at, null);
  assert.equal(prop.length_m, 5); assert.equal(prop.traced_by, 'tool'); assert.match(prop.traced_how, /#dc1e1e/); assert.equal(prop.pts_site, null);
  const ok = pathRecord({ nodes, h: 1.7, tracedBy: 'person', confirmedBy: ' KH ', at: '2026-11-23T01:00:00Z', frame: 'f', toSite: (x, z) => [-z, x] });
  assert.equal(ok.confirmed_by, 'KH'); assert.equal(ok.confirmed_at, '2026-11-23T01:00:00Z'); assert.equal(ok.height.source, 'set by hand');
  assert.deepEqual(ok.pts_site, [[-2, 1, 1.7], [-6, 4, 1.7]]);
  assert.throws(() => pathRecord({ nodes: [[0, 0]], tracedBy: 'person', frame: 'f' }), /two points/);
});
