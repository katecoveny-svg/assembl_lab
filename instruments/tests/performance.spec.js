import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
for (const route of [
  "reality-remix/",
  "reality-remix/?mode=light",
  "reality-remix/?mode=full",
  "soft-matter/",
  "impossible-objects/",
]) {
  test(`wall-clock measurement ${route}`, async ({ page }, info) => {
    await page.goto(`/instruments/${route}`);
    await expect(page.locator("body")).toHaveAttribute("data-ready", "true");
    await page.waitForTimeout(2000);
    const measurement = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const start = performance.now();
          let frames = 0,
            lastSample = start;
          const displayed = [];
          function sample() {
            frames++;
            const now = performance.now();
            if (now - lastSample >= 1000) {
              displayed.push(window.__instrument.stats().fps);
              lastSample = now;
            }
            if (now - start >= 5000)
              resolve({
                frames,
                wallMilliseconds: now - start,
                measuredFPS: Math.round((frames * 10000) / (now - start)) / 10,
                displayedFPS: displayed,
                backend: window.__instrument.backend,
                stats: window.__instrument.stats(),
              });
            else requestAnimationFrame(sample);
          }
          requestAnimationFrame(sample);
        }),
    );
    console.log(info.project.name, route, JSON.stringify(measurement));
    expect(measurement.frames).toBeGreaterThan(0);
    const label = route.startsWith("reality-remix")
      ? `reality-remix-${route.includes("full") ? "full" : route.includes("light") ? "light" : "auto"}`
      : route.replace("/", "");
    const key = `${info.project.name}-${label}`;
    await mkdir("output/performance", { recursive: true });
    await writeFile(
      `output/performance/${key}.json`,
      JSON.stringify(measurement, null, 2) + "\n",
    );
  });
}
