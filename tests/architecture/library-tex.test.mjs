// The library's surfaces and sculpture are made in code (plan-studio/twins/src/twin/library/ptex.ts and sdf.ts): the
// same seed gives the same bytes, every texture tiles without a seam, and a sculpted form comes out as a closed mesh.
// Run with:  node --test tests/architecture/library-tex.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../../plan-studio/twins/src/twin/library/ptex.ts';
import * as S from '../../plan-studio/twins/src/twin/library/sdf.ts';

const KINDS = {
  weave: () => P.weave({ n: 128 }), twill: () => P.weave({ n: 128, pattern: 'twill' }), cord: () => P.weave({ n: 128, pattern: 'cord', threads: 12 }),
  knit: () => P.knit({ n: 128 }), boucle: () => P.boucle({ n: 128, loops: 400 }), pile: () => P.pile({ n: 128 }), grain: () => P.grain({ n: 128 }),
  stone: () => P.stone({ n: 128 }), marble: () => P.stone({ n: 128, kind: 'marble' }), plaster: () => P.plaster({ n: 128, strokes: 20 }),
  brushed: () => P.brushed({ n: 128, scratches: 10 }), glaze: () => P.glaze({ n: 128 }), bark: () => P.bark({ n: 128 }), leaf: () => P.leafRibs({ n: 128 }),
};

test('every texture is seeded and deterministic: the same call gives the same bytes', () => {
  for (const [name, make] of Object.entries(KINDS)) {
    const a = P.pack(make()), b = P.pack(make());
    assert.deepEqual(Buffer.from(a.normal), Buffer.from(b.normal), `${name}: normals`);
    assert.deepEqual(Buffer.from(a.rough), Buffer.from(b.rough), `${name}: roughness`);
  }
  assert.notDeepEqual(Buffer.from(P.pack(P.weave({ n: 64, seed: 1 })).normal), Buffer.from(P.pack(P.weave({ n: 64, seed: 2 })).normal), 'another seed, another cloth');
});

test('every texture tiles: the step across the wrap is no bigger than a step inside the tile', () => {
  for (const [name, make] of Object.entries(KINDS)) {
    const f = make(), n = f.n;
    let seamU = 0, seamV = 0, inner = 0, k = 0;
    for (let y = 0; y < n; y++) seamU += Math.abs(f.h[y * n] - f.h[y * n + n - 1]);
    for (let x = 0; x < n; x++) seamV += Math.abs(f.h[x] - f.h[(n - 1) * n + x]);
    for (let y = 0; y < n; y++) for (let x = 1; x < n; x++) { inner += Math.abs(f.h[y * n + x] - f.h[y * n + x - 1]) + Math.abs(f.h[x * n + y] - f.h[(x - 1) * n + y]); k += 2; }
    const step = inner / k;
    assert.ok(seamU / n <= step * 2.5 + 1e-6, `${name}: across u ${(seamU / n).toFixed(4)} vs ${step.toFixed(4)}`);
    assert.ok(seamV / n <= step * 2.5 + 1e-6, `${name}: across v ${(seamV / n).toFixed(4)} vs ${step.toFixed(4)}`);
  }
});

test('the maps are valid: unit normals facing out of the surface, roughness in range', () => {
  const p = P.pack(P.knit({ n: 64 }));
  for (let i = 0; i < p.normal.length; i += 4) {
    const x = p.normal[i] / 127.5 - 1, y = p.normal[i + 1] / 127.5 - 1, z = p.normal[i + 2] / 127.5 - 1;
    assert.ok(Math.abs(Math.hypot(x, y, z) - 1) < 0.03 && z > 0);
  }
  for (let i = 1; i < p.rough.length; i += 4) assert.ok(p.rough[i] >= 0 && p.rough[i] <= 255);
  const c = P.meanColour(P.tint(P.weave({ n: 64 }), 0xd9cfc0));
  assert.ok(c[0] > c[2], 'a warm linen stays warm');
});

test('marching cubes: a table worked out for all 256 corner patterns, and sculpted forms come out closed and the right size', () => {
  assert.equal(S.TRI_TABLE.length, 256);
  assert.equal(S.TRI_TABLE[0].length + S.TRI_TABLE[255].length, 0);
  assert.ok(S.TRI_TABLE.every((t) => t.length % 3 === 0 && t.length <= 15));
  const vol = (m) => { let v = 0; const p = m.positions; for (let t = 0; t < m.indices.length; t += 3) { const a = m.indices[t] * 3, b = m.indices[t + 1] * 3, c = m.indices[t + 2] * 3; v += (p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) - p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c]) + p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c])) / 6; } return v; };
  const sphere = S.mesh(S.sphere(0.1), [-0.12, -0.12, -0.12], [0.12, 0.12, 0.12], 0.008);
  assert.equal(S.openEdges(sphere), 0, 'closed');
  assert.ok(Math.abs(vol(sphere) / ((4 / 3) * Math.PI * 0.001) - 1) < 0.02, 'within 2 % of the true volume');
  const pierced = S.mesh(S.smoothSubtract(0.02, S.ellipsoid([0.15, 0.2, 0.1]), S.capsule([0, 0.02, -0.2], [0, 0.02, 0.2], 0.05)), [-0.2, -0.25, -0.15], [0.2, 0.25, 0.15], 0.008);
  assert.equal(S.openEdges(pierced), 0, 'a form with a tunnel through it is closed too');
  const twisted = S.mesh(S.twist(6, S.stretch([1, 1, 0.5], S.torus(0.12, 0.04))), [-0.2, -0.1, -0.2], [0.2, 0.1, 0.2], 0.008);
  assert.equal(S.openEdges(twisted), 0);
});
