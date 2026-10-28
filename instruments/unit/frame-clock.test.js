import test from "node:test";
import assert from "node:assert/strict";
import { createFrameClock } from "../src/frame-clock.js";
for (const rate of [5, 10, 15, 60]) {
  test(`${rate} real frames per second stays ${rate} FPS despite simulation cap`, () => {
    const clock = createFrameClock(0);
    for (let i = 1; i <= rate * 3; i++) {
      const frame = clock.tick((i * 1000) / rate);
      assert.ok(frame.simulationSeconds <= 0.034);
      if (rate < 29) assert.equal(frame.simulationSeconds, 0.034);
    }
    assert.equal(clock.fps(), rate);
  });
}
test("long active stall counts in FPS but not in simulation catch-up", () => {
  const clock = createFrameClock(0);
  const frame = clock.tick(2000);
  assert.equal(frame.simulationSeconds, 0.034);
  assert.equal(clock.fps(), 1); // rounded 0.5 FPS; never the old ~29 FPS.
});
test("hidden-tab time is excluded by resetting the measurement on visibility change", () => {
  const clock = createFrameClock(0);
  clock.tick(100);
  clock.reset(10000);
  for (let i = 1; i <= 10; i++) clock.tick(10000 + i * 100);
  assert.equal(clock.fps(), 10);
});
