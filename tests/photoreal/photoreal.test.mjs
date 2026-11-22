// The photoreal fly-through (plan-studio/twins/src/twin/photoreal): the camera path against the sample plan's walls and
// its speed, the light bake's determinism, the tessellation that carries per-vertex light, and the SDF mesher.
// Run with:  node --test tests/photoreal/*.test.mjs   (Node 22.18 or later strips the TypeScript types as it loads)
// The plan is the lab's own public example (hero.plan.json); no client's drawings.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FilmPath, planWalls, wallClash } from '../../plan-studio/twins/src/twin/photoreal/path.ts';
import { BVH } from '../../plan-studio/twins/src/twin/photoreal/bvh.ts';
import { MS, packBake, unpackBake, packRGB9E5, unpackRGB9E5, packOct, unpackOct } from '../../plan-studio/twins/src/twin/photoreal/bakeCore.ts';
import { bakeWithPool, inlinePool, tracerFrom, packScene, unpackScene } from '../../plan-studio/twins/src/twin/photoreal/bakeRun.ts';
import { buildSky, SKY_RATIO } from '../../plan-studio/twins/src/twin/photoreal/sky.ts';
import { tessellate } from '../../plan-studio/twins/src/twin/photoreal/tessellate.ts';
import { surfaceNets, vesselSDF } from '../../plan-studio/twins/src/twin/photoreal/sdf.ts';

const root = new URL('../../', import.meta.url);
const spec = JSON.parse(readFileSync(new URL('plan-studio/twins/src/twin/photoreal/flythrough.json', root), 'utf8'));
const hero = JSON.parse(readFileSync(new URL('plan-studio/twins/drop/hero.plan.json', root), 'utf8'));
const walls = planWalls(hero);

test('the plan gives the walls the path is checked against', () => {
  assert.ok(walls.length >= 14, `walls and partitions: ${walls.length}`);
  const bifold = walls.find((w) => w.id === 'S').open.find((o) => o.kind === 'door' && o.s1 - o.s0 > 3);
  assert.ok(bifold, 'the living room bi-fold doors are an opening in the east wall');
});

test('no keyframe stands in or against a wall', () => {
  for (const k of spec.keys) assert.deepEqual(wallClash(k.eye, walls, 0.25), [], `key "${k.label}" at ${k.eye}`);
});

test('the whole move stays clear of walls, and enters the house only through a door', () => {
  const p = new FilmPath(spec), n = p.frames();
  let crossings = 0, prevInside = null;
  for (let f = 0; f <= n * 4; f++) {
    const s = p.at((f / 4) / spec.fps);
    assert.deepEqual(wallClash(s.eye, walls, 0.2), [], `frame ${f / 4}: camera at ${s.eye.map((v) => v.toFixed(2))}`);
    const inside = s.eye[0] > 0 && s.eye[0] < 11.42 && s.eye[2] > 0 && s.eye[2] < 7.7 && s.eye[1] < 2.4;
    if (prevInside !== null && inside !== prevInside) crossings++;
    prevInside = inside;
  }
  assert.equal(crossings, 1, 'one way in, through the bi-fold doors');
  const end = p.at(spec.duration);
  assert.ok(end.eye[0] > 0.14 && end.eye[0] < 5.05 && end.eye[2] > 2.6 && end.eye[2] < 7.56, 'it ends inside the living and dining room');
});

test('speed is smooth: no jumps between frames, and the film is the length it says', () => {
  const p = new FilmPath(spec), n = p.frames();
  assert.equal(n, Math.round(spec.duration * spec.fps));
  const step = [];
  for (let f = 1; f <= n; f++) {
    const a = p.at((f - 1) / spec.fps).eye, b = p.at(f / spec.fps).eye;
    step.push(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]));
  }
  let worst = 0;
  for (let i = 1; i < step.length; i++) {
    const r = Math.abs(step[i] - step[i - 1]) / Math.max(1e-4, Math.max(step[i], step[i - 1]));
    worst = Math.max(worst, r);
  }
  assert.ok(worst < 0.12, `largest frame-to-frame change in speed ${(worst * 100).toFixed(1)}%`);
  const v = step.map((s) => s * spec.fps);
  assert.ok(Math.max(...v) < 6, `top speed ${Math.max(...v).toFixed(2)} m/s`);
  assert.ok(v[v.length - 1] < 1.2, 'it settles slowly at the end');
  // the look direction never swings faster than 60° a second
  let turn = 0;
  for (let f = 1; f <= n; f++) {
    const d = (s) => { const x = s.look[0] - s.eye[0], y = s.look[1] - s.eye[1], z = s.look[2] - s.eye[2], l = Math.hypot(x, y, z); return [x / l, y / l, z / l]; };
    const a = d(p.at((f - 1) / spec.fps)), b = d(p.at(f / spec.fps));
    turn = Math.max(turn, Math.acos(Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])) * spec.fps * 180 / Math.PI);
  }
  assert.ok(turn < 60, `fastest turn ${turn.toFixed(1)}°/s`);
});

// a small room with a window, lit by sky and sun: the same pipeline the house goes through
function room() {
  const tri = [], mat = [], tS = [], tSB = [], samples = [];
  const quad = (a, b, c, d, m, lit) => {
    for (const t of [[a, b, c], [a, c, d]]) {
      for (const v of t) tri.push(...v);
      mat.push(m);
      for (const v of t) {
        if (lit) { const id = samples.length / 6; const n = [0, 1, 0]; samples.push(v[0], v[1], v[2], ...n); tS.push(id); } else tS.push(-1);
        tSB.push(-1);
      }
    }
  };
  // floor (lit, finely split), walls and a roof with a hole for the light
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) quad([i, 0, j], [i, 0, j + 1], [i + 1, 0, j + 1], [i + 1, 0, j], 0, true);
  quad([0, 3, 0], [6, 3, 0], [6, 3, 2], [0, 3, 2], 1, false); quad([0, 3, 4], [6, 3, 4], [6, 3, 6], [0, 3, 6], 1, false);
  quad([0, 0, 0], [0, 3, 0], [0, 3, 6], [0, 0, 6], 1, false); quad([6, 0, 0], [6, 0, 6], [6, 3, 6], [6, 3, 0], 1, false);
  const ea = [], eb = [];
  for (let i = 0; i + 1 < samples.length / 6; i++) { ea.push(i); eb.push(i + 1); }
  const sun = { dir: [0.3, 0.9, 0.3], E: [4.4, 3.9, 3.2], radius: 0.014 };
  const l = Math.hypot(...sun.dir); sun.dir = sun.dir.map((x) => x / l);
  const sky = buildSky(sun.dir, sun.E, 32, 16);
  return {
    samples: new Float32Array(samples), ea: new Uint32Array(ea), eb: new Uint32Array(eb), tri: new Float32Array(tri), mat: new Uint16Array(mat),
    triSample: new Int32Array(tS), triSampleB: new Int32Array(tSB), mats: new Float32Array([0.5, 0.4, 0.3, 0, 0, 0.8, 0.8, 0.8, 0, 0]),
    sky: { w: sky.w, h: sky.h, data: sky.data }, sun, focus: [3, 0, 3], hash: 'room',
  };
}

// three tracers taking jobs in turn: the order work is done in differs from the single-tracer run
function threePool() {
  const T = [];
  return {
    size: 3,
    async init(w, d) { T[w] = tracerFrom(d); },
    async cache(w, c) { T[w].cache = c; },
    async job(w, j) { await new Promise((r) => setTimeout(r, (j.first * 7 + w * 3) % 5)); return T[w].job(j.samples, j.first, j.spp, j.mode); },
    close() {},
  };
}

test('the bake is deterministic: same scene, same light, however the work is split', async () => {
  const a = await bakeWithPool(room(), inlinePool(), { spp: 16, chunk: 7 });
  const b = await bakeWithPool(room(), threePool(), { spp: 16, chunk: 7 });
  assert.deepEqual(Array.from(a.E), Array.from(b.E));
  assert.deepEqual(Array.from(a.D), Array.from(b.D));
  // the scene file round trip gives the same input, and the packed file is byte-identical
  const I = room(), J = unpackScene(packScene(I));
  assert.deepEqual(Array.from(J.tri), Array.from(I.tri)); assert.equal(J.hash, 'room');
  const c = await bakeWithPool(J, inlinePool(), { spp: 16, chunk: 7 });
  assert.deepEqual(Array.from(c.E), Array.from(a.E));
  const f1 = new Uint8Array(packBake(a.E, a.D, { hash: 'room' })), f2 = new Uint8Array(packBake(c.E, c.D, { hash: 'room' }));
  assert.deepEqual(Array.from(f1), Array.from(f2));
});

test('the bake sees geometry: floor under the roof is darker than floor under the opening', async () => {
  const r = await bakeWithPool(room(), inlinePool(), { spp: 32, chunk: 64 });
  const I = room(), lum = (i) => 0.2126 * r.E[i * 3] + 0.7152 * r.E[i * 3 + 1] + 0.0722 * r.E[i * 3 + 2];
  let open = 0, nOpen = 0, shut = 0, nShut = 0;
  for (let i = 0; i < I.samples.length / 6; i++) { const z = I.samples[i * 6 + 2]; if (z > 2.5 && z < 3.5) { open += lum(i); nOpen++; } if (z < 0.5) { shut += lum(i); nShut++; } }
  assert.ok(open / nOpen > shut / nShut, `under the opening ${(open / nOpen).toFixed(3)} vs under the roof ${(shut / nShut).toFixed(3)}`);
  for (const v of r.E) assert.ok(Number.isFinite(v) && v >= 0);
});

test('the sky is calibrated against the sun', () => {
  const s = buildSky([0, 1, 0], [4, 4, 4]);
  assert.ok(Math.abs(s.horizontal - SKY_RATIO * 4) < 1e-6, `${s.horizontal}`);
});

test('the light file keeps light and direction to within its precision', () => {
  for (const v of [[0, 0, 0], [0.01, 0.2, 3], [4.4, 3.9, 3.1], [120, 40, 2]]) {
    const out = [0, 0, 0]; unpackRGB9E5(packRGB9E5(...v), out);
    for (let k = 0; k < 3; k++) assert.ok(Math.abs(out[k] - v[k]) <= Math.max(...v) / 256 + 1e-9, `${v} → ${out}`);
  }
  for (const d of [[0, 1, 0], [0, -1, 0], [0.6, 0, -0.8], [-0.3, -0.5, 0.81]]) {
    const l = Math.hypot(...d), u = d.map((x) => x / l), out = [0, 0, 0]; unpackOct(packOct(...u), out);
    assert.ok(u[0] * out[0] + u[1] * out[1] + u[2] * out[2] > 0.999, `${u} → ${out}`);
  }
  const E = new Float32Array([1, 2, 3, 0.5, 0.25, 0.125]), D = new Float32Array([0, 1, 0, 1, 0, 0]);
  const b = unpackBake(packBake(E, D, { hash: 'x' }));
  assert.equal(b.meta.hash, 'x'); assert.equal(b.meta.samples, 2);
});

test('tessellation splits long edges without T-junctions and keeps the area', () => {
  // a 13.5 m × 6 m floor as two triangles
  const P = new Float32Array([0, 0, 0, 13.5, 0, 0, 13.5, 0, 6, 0, 0, 6]);
  const t = tessellate({ position: { array: P, itemSize: 3 }, uv: { array: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), itemSize: 2 } }, [0, 2, 1, 0, 3, 2], 0.25);
  const p = t.attrs.position, I = t.index;
  let area = 0, longest = 0;
  const edges = new Map();
  for (let i = 0; i < I.length; i += 3) {
    const v = [I[i], I[i + 1], I[i + 2]].map((k) => [p[k * 3], p[k * 3 + 1], p[k * 3 + 2]]);
    const ux = v[1][0] - v[0][0], uz = v[1][2] - v[0][2], wx = v[2][0] - v[0][0], wz = v[2][2] - v[0][2];
    area += Math.abs(ux * wz - uz * wx) / 2;
    for (let e = 0; e < 3; e++) {
      const a = I[i + e], b = I[i + (e + 1) % 3];
      longest = Math.max(longest, Math.hypot(p[a * 3] - p[b * 3], p[a * 3 + 2] - p[b * 3 + 2]));
      const k = a < b ? `${a},${b}` : `${b},${a}`; edges.set(k, (edges.get(k) ?? 0) + 1);
    }
  }
  assert.ok(Math.abs(area - 81) < 1e-3, `area ${area}`);
  assert.ok(longest <= 0.25 + 1e-6, `longest edge ${longest}`);
  // conforming: every interior edge is shared by exactly two triangles, so there is no crack and no T-junction
  const once = [...edges.values()].filter((c) => c === 1).length, perimeter = 2 * (13.5 + 6);
  assert.ok(once * 0.25 >= perimeter - 1e-6 && once * 0.25 < perimeter * 1.5, `boundary edges ${once}`);
  assert.ok([...edges.values()].every((c) => c <= 2));
});

test('the sculpted vessel is a closed, outward-facing surface of about the right size', () => {
  const m = surfaceNets(vesselSDF(0.28), [-0.13, -0.02, -0.13], [0.13, 0.3, 0.13], 52);
  assert.ok(m.indices.length / 3 > 5000, `${m.indices.length / 3} triangles`);
  let ymin = 1, ymax = -1, rmax = 0;
  for (let i = 0; i < m.positions.length; i += 3) { ymin = Math.min(ymin, m.positions[i + 1]); ymax = Math.max(ymax, m.positions[i + 1]); rmax = Math.max(rmax, Math.hypot(m.positions[i], m.positions[i + 2])); }
  assert.ok(ymin < 0.01 && ymax > 0.25 && ymax < 0.29, `height ${ymin.toFixed(3)}–${ymax.toFixed(3)}`);
  assert.ok(rmax > 0.06 && rmax < 0.12, `widest radius ${rmax.toFixed(3)}`);
  // closed: no edge belongs to an odd number of triangles (a hole); where the wall is thinner than a grid cell an edge
  // can be shared by four, which is not a hole
  const edges = new Map();
  for (let i = 0; i < m.indices.length; i += 3) for (let e = 0; e < 3; e++) { const a = m.indices[i + e], b = m.indices[i + (e + 1) % 3], k = a < b ? `${a},${b}` : `${b},${a}`; edges.set(k, (edges.get(k) ?? 0) + 1); }
  const open = [...edges.values()].filter((c) => c % 2 === 1).length;
  assert.equal(open, 0, `${open} of ${edges.size} edges open`);
});

test('the BVH finds the nearest hit, and any hit for shadows', () => {
  const tri = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, -1, 1, 0, -1, 0, 1, -1]);
  const b = new BVH({ tri, mat: new Uint16Array([0, 1]) }), h = { t: 0, tri: 0, u: 0, v: 0 };
  assert.ok(b.intersect(0.2, 0.2, 2, 0, 0, -1, 100, h)); assert.ok(Math.abs(h.t - 2) < 1e-6); assert.equal(b.mat[h.tri], 0);
  assert.ok(!b.intersect(0.9, 0.9, 2, 0, 0, -1, 100, h));
  assert.ok(b.intersect(0.2, 0.2, 2, 0, 0, -1, 100, h, true));
  assert.equal(MS, 5);
});
