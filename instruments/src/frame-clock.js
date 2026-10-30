// Simulation time is bounded; performance time must never be clamped.
export function createFrameClock(startTime = 0) {
  let last = startTime;
  let frames = 0;
  let elapsed = 0;
  let fps = 0;
  return {
    tick(time) {
      const wallSeconds = Math.max(0, (time - last) / 1000);
      last = time;
      frames++;
      elapsed += wallSeconds;
      if (elapsed >= 1 - Number.EPSILON * 10) {
        fps = Math.round(frames / elapsed);
        frames = 0;
        elapsed = 0;
      }
      return { simulationSeconds: Math.min(wallSeconds, 0.034), fps };
    },
    reset(time) {
      last = time;
      frames = 0;
      elapsed = 0;
      fps = 0;
    },
    fps: () => fps,
  };
}
