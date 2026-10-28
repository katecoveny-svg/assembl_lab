import { test, expect } from "@playwright/test";
async function ready(page, route = "reality-remix", query = "") {
  await page.goto(`/instruments/${route}/${query}`);
  await expect(page.locator("body")).toHaveAttribute("data-ready", "true");
}
test("Auto conservatively selects 2400 splats even on a wide screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await ready(page);
  await expect(page.locator("#quality")).toHaveValue("auto");
  expect((await page.evaluate(() => window.__instrument.stats())).splats).toBe(
    2400,
  );
  await ready(page, "reality-remix", "?mode=full");
  expect((await page.evaluate(() => window.__instrument.stats())).splats).toBe(
    5600,
  );
  await expect(page.locator("#quality")).toHaveValue("full");
});
test("quality changes preserve the complete edited sculpture, freeze and undo", async ({
  page,
}) => {
  await ready(page);
  await page.locator("canvas").scrollIntoViewIfNeeded();
  const r = await page.locator("canvas").boundingBox();
  await page.mouse.move(r.x + r.width * 0.54, r.y + r.height * 0.46);
  await page.mouse.down();
  await page.mouse.move(r.x + r.width * 0.54 + 70, r.y + r.height * 0.46 - 60, {
    steps: 15,
  });
  await page.mouse.up();
  expect(
    (await page.evaluate(() => window.__instrument.stats())).displacement,
  ).toBeGreaterThan(0.1);
  await page.locator("#freeze").click();
  await page.evaluate(() => {
    window.qualityMarker = 123;
    window.beforeQuality = JSON.stringify(window.__instrument.capture());
  });
  for (const [mode, count] of [
    ["full", 5600],
    ["light", 2400],
    ["auto", 2400],
  ]) {
    await page.locator("#quality").selectOption(mode);
    expect(await page.evaluate(() => window.qualityMarker)).toBe(123);
    expect(
      await page.evaluate(
        () =>
          JSON.stringify(window.__instrument.capture()) ===
          window.beforeQuality,
      ),
    ).toBe(true);
    expect(
      (await page.evaluate(() => window.__instrument.stats())).splats,
    ).toBe(count);
    await expect(page.locator("#freeze")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.locator("#undo")).toBeEnabled();
    await expect
      .poll(async () =>
        page.locator("canvas").evaluate((canvas) => {
          const copy = document.createElement("canvas");
          copy.width = canvas.width;
          copy.height = canvas.height;
          const ctx = copy.getContext("2d");
          ctx.drawImage(canvas, 0, 0);
          const pixels = ctx.getImageData(
            canvas.width * 0.3,
            canvas.height * 0.2,
            canvas.width * 0.4,
            canvas.height * 0.5,
          ).data;
          let colored = 0;
          for (let i = 0; i < pixels.length; i += 4)
            if (pixels[i] > pixels[i + 1] * 1.06) colored++;
          return colored;
        }),
      )
      .toBeGreaterThan(1000);
  }
  await page.locator("#undo").click();
  expect(
    (await page.evaluate(() => window.__instrument.stats())).displacement,
  ).toBeLessThan(0.001);
});
for (const route of ["soft-matter", "impossible-objects"])
  test(`${route} quality changes do not reload or reset`, async ({ page }) => {
    await ready(page, route);
    if (route === "soft-matter")
      await page
        .getByRole("button", { name: "✦ Give it a wobble", exact: true })
        .click();
    else
      await page
        .getByRole("button", { name: "Moon stone", exact: true })
        .click();
    await page.locator("#freeze").click();
    await page.evaluate(() => {
      window.qualityMarker = 456;
      window.beforeQuality = JSON.stringify(window.__instrument.capture());
    });
    await page.locator("#quality").selectOption("light");
    expect(await page.evaluate(() => window.qualityMarker)).toBe(456);
    expect(
      await page.evaluate(
        () =>
          JSON.stringify(window.__instrument.capture()) ===
          window.beforeQuality,
      ),
    ).toBe(true);
    await expect(page.locator("#undo")).toBeEnabled();
    await expect(page.locator("#freeze")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
test("native beforeprint flushes pending solid geometry synchronously", async ({
  page,
}) => {
  await ready(page, "impossible-objects");
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  const before = await page.locator("#geometry-info").innerText();
  await page.getByRole("slider", { name: "Carve", exact: true }).focus();
  await page.keyboard.press("End");
  await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
  await expect(page.locator("#geometry-info")).not.toHaveText(before);
  await expect(page.locator(".print-image")).toHaveAttribute(
    "src",
    /^data:image\/png/,
  );
  const flushed = await page.evaluate(() => window.__instrument.stats());
  await page.clock.runFor(100);
  expect(
    (await page.evaluate(() => window.__instrument.stats())).dimensions,
  ).toEqual(flushed.dimensions);
});
