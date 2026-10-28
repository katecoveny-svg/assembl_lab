import { test, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
test("smooth 3D fluid surface, pour, stir, reset and timed rendering", async ({
  page,
}) => {
  const errors = [],
    warnings = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
    if (m.type() === "warning") warnings.push(m.text());
  });
  await page.goto("/instruments/liquid-playground/");
  await expect(page.locator("#metrics")).toContainText("TRIANGLES");
  await page.getByRole("button", { name: "Ⅱ Pause", exact: true }).click();
  const initial = await page.locator("canvas").screenshot();
  await page.screenshot({
    path: "../../output/playwright/liquid-surface-default.png",
  });
  await page.getByRole("button", { name: "View: Smooth liquid" }).click();
  const particles = await page.locator("canvas").screenshot();
  expect(particles.equals(initial)).toBe(false);
  await page.getByRole("button", { name: "View: Particles" }).click();
  await page.getByRole("button", { name: "Pour a ribbon" }).click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Ⅱ Pause", exact: true }).click();
  expect((await page.locator("canvas").screenshot()).equals(initial)).toBe(
    false,
  );
  await page.screenshot({
    path: "../../output/playwright/liquid-surface-pour.png",
  });
  await page.getByRole("button", { name: "↟ Stir the liquid" }).click();
  await page.waitForTimeout(450);
  await page.getByRole("button", { name: "Ⅱ Pause", exact: true }).click();
  await page.screenshot({
    path: "../../output/playwright/liquid-surface-stir.png",
  });
  await page.getByRole("button", { name: "↺ Reset" }).click();
  await page.getByRole("button", { name: "▶ Resume", exact: true }).click();
  const report = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const a = [];
        let previous = performance.now(),
          start = previous;
        function step(t) {
          a.push(t - previous);
          previous = t;
          if (t - start < 4000) requestAnimationFrame(step);
          else {
            a.shift();
            a.sort((x, y) => x - y);
            const gl = document.querySelector("canvas").getContext("webgl2"),
              ext = gl.getExtension("WEBGL_debug_renderer_info");
            resolve({
              samples: a.length,
              medianMs: a[Math.floor(a.length * 0.5)],
              p95Ms: a[Math.floor(a.length * 0.95)],
              meanMs: a.reduce((x, y) => x + y, 0) / a.length,
              metrics: document.getElementById("metrics").textContent,
              renderer: ext
                ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
                : "unavailable",
              viewport: [innerWidth, innerHeight],
              dpr: devicePixelRatio,
            });
          }
        }
        requestAnimationFrame(step);
      }),
  );
  report.warnings = warnings;
  console.log(report);
  await writeFile(
    "../../output/playwright/liquid-frame-timing" +
      (process.env.STAGE_TWO_HEADED ? "-headed" : "") +
      ".json",
    JSON.stringify(report, null, 2),
  );
  await page.getByRole("button", { name: "Ⅱ Pause", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "../../output/playwright/liquid-surface-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
