import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
test.beforeEach(async ({ page }) => {
  await page.goto("/instruments/squishy-lab/");
  await page.waitForFunction(() => window.__squishy);
});
test("transparent PNG has clear corners and visible sculpture, share fallback downloads", async ({
  page,
}) => {
  await page.locator("#pause").click();
  const original = await page.evaluate(() => __squishy.capture());
  await page.locator("#open-export").click();
  await page.locator("#transparent").check();
  let waiting = page.waitForEvent("download");
  await page.locator("#save-image").click();
  const bytes = await fs.readFile(await (await waiting).path());
  const pixels = await page.evaluate(async (base64) => {
    const img = await createImageBitmap(
      await (await fetch("data:image/png;base64," + base64)).blob(),
    );
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);
    return {
      corner: Array.from(ctx.getImageData(0, 0, 1, 1).data),
      center: Array.from(
        ctx.getImageData(c.width / 2, c.height / 2, 1, 1).data,
      ),
    };
  }, bytes.toString("base64"));
  expect(pixels.corner[3]).toBe(0);
  expect(pixels.center[3]).toBe(255);
  expect(await page.evaluate(() => __squishy.capture())).toEqual(original);
  await page.evaluate(() =>
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: () => false,
    }),
  );
  waiting = page.waitForEvent("download");
  await page.locator("#share-image").click();
  expect((await waiting).suggestedFilename()).toBe("squishy-lab-square.png");
  await expect(page.locator("#export-status")).toContainText(
    "Sharing is not available",
  );
});
test("native share capability receives correctly typed file without posting", async ({
  page,
}) => {
  await page.evaluate(() => {
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: () => true,
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async ({ files }) =>
        (window.shared = files.map((f) => ({
          type: f.type,
          name: f.name,
          size: f.size,
        }))),
    });
  });
  await page.locator("#open-export").click();
  await page.locator("#format").selectOption("jpeg");
  await page.locator("#share-image").click();
  await expect(page.locator("#export-status")).toContainText("Shared using");
  expect(await page.evaluate(() => window.shared[0].type)).toBe("image/jpeg");
});
test("all original forms and finishes stay finite, capture visual and steady frame evidence", async ({
  page,
}, info) => {
  const measurements = [];
  for (const shape of ["cloud", "pebble", "star", "halo"]) {
    await page.locator("[data-shape=" + shape + "]").click();
    await page.locator("#make-shape").click();
    await page.locator("#wobble").click();
    await page.waitForTimeout(1200);
    expect((await page.evaluate(() => __squishy.stats())).finite).toBe(true);
  }
  await page.locator('[data-recipe="Mint ripple"]').click();
  await page.locator("[data-tab=look]").click();
  await page.waitForTimeout(2000);
  for (let i = 0; i < 5; i++) {
    await page.waitForTimeout(1000);
    measurements.push(await page.evaluate(() => __squishy.stats()));
  }
  await page.screenshot({
    path: `squishy-lab/output/${info.project.name}-mint.png`,
    fullPage: true,
  });
  await fs.writeFile(
    `squishy-lab/output/${info.project.name}-performance.json`,
    JSON.stringify(measurements, null, 2),
  );
});
test("mobile touch sculpt and explicit page-scroll mode both work", async ({
  page,
  context,
}, info) => {
  test.skip(
    info.project.name !== "mobile-chromium",
    "Chromium CDP touch emulation only",
  );
  await page.locator("[data-mode=stretch]").click();
  await page.locator("#stage").scrollIntoViewIfNeeded();
  let r = await page.locator("#canvas").boundingBox();
  const session = await context.newCDPSession(page);
  const touch = async (type, x, y) =>
    session.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: type === "touchEnd" ? [] : [{ x, y }],
    });
  await touch("touchStart", r.x + r.width * 0.52, r.y + r.height * 0.43);
  for (let i = 1; i <= 10; i++)
    await touch(
      "touchMove",
      r.x + r.width * (0.52 + i * 0.012),
      r.y + r.height * (0.43 - i * 0.012),
    );
  await page.waitForTimeout(300);
  expect(
    (await page.evaluate(() => __squishy.stats())).displacement,
  ).toBeGreaterThan(0.1);
  await touch("touchEnd");
  await page.locator("[data-mode=scroll]").click();
  await page.locator("#stage").scrollIntoViewIfNeeded();
  r = await page.locator("#canvas").boundingBox();
  const before = await page.evaluate(() => scrollY);
  await touch("touchStart", r.x + r.width / 2, r.y + r.height * 0.75);
  for (let i = 1; i <= 10; i++)
    await touch(
      "touchMove",
      r.x + r.width / 2,
      r.y + r.height * (0.75 - i * 0.045),
    );
  await touch("touchEnd");
  await expect
    .poll(() => page.evaluate(() => scrollY))
    .toBeGreaterThan(before + 50);
});

test("unsupported WebGL offers an honest lighter study and oversized JSON is rejected", async ({
  page,
}) => {
  await page.locator("#pause").click();
  const before = await page.evaluate(() => __squishy.project());
  await page
    .locator("#project-file")
    .setInputFiles({
      name: "oversized.json",
      mimeType: "application/json",
      buffer: Buffer.alloc(262145, 32),
    });
  await expect(page.locator("#status")).toContainText("256 KB");
  expect(await page.evaluate(() => __squishy.project())).toEqual(before);
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type === "webgl2" ? null : get.call(this, type, ...args);
    };
  });
  await page.reload();
  await expect(page.locator("#loading")).toContainText("could not start");
  await expect(page.locator("#loading a")).toHaveAttribute(
    "href",
    "../soft-matter/?mode=2d",
  );
});
