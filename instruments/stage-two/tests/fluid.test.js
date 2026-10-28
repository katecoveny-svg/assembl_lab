import { test } from "node:test";
import assert from "node:assert/strict";
import { Fluid } from "../src/fluid-solver.js";
test("3D density constraints resist compression and remain finite after stirring", () => {
  const f = new Fluid();
  for (let k = 0; k < f.p.length; k++) f.p[k] *= 0.7;
  const compression = () => {
    f.hash();
    let sum = 0;
    for (let i = 0; i < f.n; i++) {
      let rho = 0;
      f.each(i, (_, r) => (rho += f.kernel(r)));
      sum += Math.max(0, rho / f.rest - 1);
    }
    return sum / f.n;
  };
  const before = compression();
  for (let i = 0; i < 8; i++) f.step(1 / 60, 0);
  const after = compression();
  assert.ok(after < before * 0.5, `${before} -> ${after}`);
  const saved = f.snapshot();
  f.stir(0, 0);
  assert.ok(f.v.some((v, i) => v !== saved.v[i]));
  f.restore(saved);
  assert.deepEqual(Array.from(f.p), saved.p);
  const start = performance.now();
  for (let i = 0; i < 240; i++) {
    if (i === 100) f.stir(0, 0, 1.4);
    f.step(1 / 60);
    assert.ok(f.p.every(Number.isFinite));
    for (let k = 0; k < f.p.length; k += 3) {
      assert.ok(Math.abs(f.p[k]) <= 1.351);
      assert.ok(Math.abs(f.p[k + 1]) <= 1.401);
      assert.ok(Math.abs(f.p[k + 2]) <= 1.051);
    }
  }
  console.log(
    JSON.stringify({
      compressionBefore: before,
      compressionAfter: after,
      meanStepMs: (performance.now() - start) / 240,
      particles: f.n,
    }),
  );
});
