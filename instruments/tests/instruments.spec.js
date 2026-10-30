import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
const routes = ["reality-remix", "soft-matter", "impossible-objects"];
async function ready(page, route) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`/instruments/${route}/`);
  await expect(page.locator("body")).toHaveAttribute("data-ready", "true", {
    timeout: 45000,
  });
  return errors;
}
async function drag(page, dx = 100, dy = -70) {
  await page.locator("canvas").scrollIntoViewIfNeeded();
  const r = await page.locator("canvas").boundingBox();
  await page.mouse.move(r.x + r.width * 0.54, r.y + r.height * 0.46);
  await page.mouse.down();
  for (let i = 1; i <= 15; i++) {
    await page.mouse.move(
      r.x + r.width * 0.54 + (dx * i) / 15,
      r.y + r.height * 0.46 + (dy * i) / 15,
    );
    await page.waitForTimeout(20);
  }
  await page.waitForTimeout(150);
  await page.mouse.up();
}

for (const route of routes)
  test(`${route}: loads, plays and saves`, async ({ page }, info) => {
    const errors = await ready(page, route);
    const backend = await page.evaluate(() => window.__instrument.backend);
    console.log(route, info.project.name, backend);
    await expect
      .poll(
        async () =>
          await page.locator("canvas").evaluate((c) => {
            const t = document.createElement("canvas");
            t.width = c.width;
            t.height = c.height;
            const ctx = t.getContext("2d");
            ctx.drawImage(c, 0, 0);
            const d = ctx.getImageData(
              c.width * 0.3,
              c.height * 0.2,
              c.width * 0.4,
              c.height * 0.5,
            ).data;
            let n = 0;
            for (let i = 0; i < d.length; i += 4)
              if (d[i] > d[i + 1] * 1.06 || d[i + 1] > d[i] * 1.06) n++;
            return n;
          }),
        { timeout: 15000 },
      )
      .toBeGreaterThan(1000);
    if (backend === "canvas2d-study") {
      await drag(page);
      await expect(page.locator("#undo")).toBeEnabled();
    } else if (route === "reality-remix") {
      await drag(page);
      expect(
        (await page.evaluate(() => window.__instrument.stats())).displacement,
      ).toBeGreaterThan(0.1);
      await page.locator("#undo").click();
      expect(
        (await page.evaluate(() => window.__instrument.stats())).displacement,
      ).toBeLessThan(0.001);
      await page
        .getByRole("button", { name: "◌ Dissolve", exact: true })
        .click();
      const opacity = (await page.evaluate(() => window.__instrument.stats()))
        .opacity;
      await drag(page);
      expect(
        (await page.evaluate(() => window.__instrument.stats())).opacity,
      ).toBeLessThan(opacity);
      await page.getByRole("button", { name: "↟ Reassemble" }).click();
      await expect
        .poll(
          async () =>
            (await page.evaluate(() => window.__instrument.stats())).opacity,
          { timeout: 10000 },
        )
        .toBeGreaterThan(opacity - 0.1);
    } else if (route === "soft-matter") {
      await drag(page, 80, -100);
      expect(
        (await page.evaluate(() => window.__instrument.stats())).displacement,
      ).toBeGreaterThan(0.01);
      expect(
        (await page.evaluate(() => window.__instrument.stats())).finite,
      ).toBe(true);
      await page.locator("#reset").click();
      expect(
        (await page.evaluate(() => window.__instrument.stats())).finite,
      ).toBe(true);
    } else {
      const before = await page.evaluate(() => window.__instrument.stats());
      await page.getByRole("slider", { name: "Twist", exact: true }).fill("90");
      await expect
        .poll(async () =>
          (
            await page.evaluate(() => window.__instrument.stats())
          ).dimensions.join(","),
        )
        .not.toBe(before.dimensions.join(","));
      const download = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "↓ Export art mesh · GLB" })
        .click();
      const file = await download;
      await file.saveAs(`output/playwright/${info.project.name}-object.glb`);
      const buffer = await readFile(await file.path());
      expect(buffer.toString("utf8", 0, 4)).toBe("glTF");
      expect(buffer.readUInt32LE(4)).toBe(2);
      expect(buffer.readUInt32LE(8)).toBe(buffer.length);
      const json = JSON.parse(
        buffer.toString("utf8", 20, 20 + buffer.readUInt32LE(12)),
      );
      expect(json.meshes.length).toBeGreaterThan(0);
      expect([
        json.nodes[0].matrix[0],
        json.nodes[0].matrix[5],
        json.nodes[0].matrix[10],
      ]).toEqual([0.03, 0.03, 0.03]);
    }
    const download = page.waitForEvent("download");
    await page.locator("#save").click();
    const file = await download;
    expect(file.suggestedFilename()).toContain(".png");
    const buffer = await readFile(await file.path());
    expect(buffer.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(buffer.length).toBeGreaterThan(10000);
    await page.screenshot({
      path: `output/playwright/${info.project.name}-${route}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    console.log(
      "STATS",
      await page.evaluate(() => window.__instrument.stats()),
    );
    expect(errors).toEqual([]);
  });
test("honest 2D fallback and download share fallback", async ({
  page,
}, info) => {
  await page.goto("/instruments/reality-remix/?mode=2d");
  await expect(page.locator("body")).toHaveAttribute("data-ready", "true");
  await expect(page.locator("#medium")).toContainText("2D STUDY");
  await drag(page);
  await expect(page.locator("#undo")).toBeEnabled();
  await page.locator("#undo").click();
  await page.evaluate(() =>
    Object.defineProperty(navigator, "canShare", {
      value: () => false,
      configurable: true,
    }),
  );
  const dl = page.waitForEvent("download");
  await page.locator("#share").click();
  expect((await dl).suggestedFilename()).toBe("reality-remix.png");
  await page.screenshot({
    path: `output/playwright/${info.project.name}-fallback.png`,
    fullPage: true,
  });
});
test("vortex, presets, freeze and print still", async ({
  page,
  browserName,
}, info) => {
  await ready(page, "reality-remix");
  await page.getByRole("button", { name: "⟳ Vortex", exact: true }).click();
  await drag(page);
  expect(
    (await page.evaluate(() => window.__instrument.stats())).displacement,
  ).toBeGreaterThan(0.1);
  await page.locator("#freeze").click();
  await page.getByRole("button", { name: "↟ Reassemble" }).click();
  const before = (await page.evaluate(() => window.__instrument.stats()))
    .displacement;
  await page.waitForTimeout(350);
  expect(
    (await page.evaluate(() => window.__instrument.stats())).displacement,
  ).toBeCloseTo(before, 5);
  await page.locator("#freeze").click();
  await expect
    .poll(
      async () =>
        (await page.evaluate(() => window.__instrument.stats())).displacement,
      { timeout: 10000 },
    )
    .toBeLessThan(0.1);
  await page.getByRole("button", { name: "Silk knot", exact: true }).click();
  await expect(page.locator("#undo")).toBeDisabled();
  await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
  await expect(page.locator(".print-image")).toHaveAttribute(
    "src",
    /^data:image\/png/,
  );
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("aside")).not.toBeVisible();
  await expect(page.locator(".print-image")).toBeVisible();
  await page.screenshot({
    path: `output/playwright/${info.project.name}-print.png`,
    fullPage: true,
  });
  if (browserName === "chromium")
    await page.pdf({
      path: `output/playwright/${info.project.name}-print.pdf`,
      printBackground: true,
    });
});
test("touch drag and two-finger orbit", async ({ page, browserName }, info) => {
  test.skip(
    info.project.name !== "mobile-chromium",
    "CDP touch input is tested in mobile Chromium",
  );
  await ready(page, "soft-matter");
  await page.locator("canvas").scrollIntoViewIfNeeded();
  const r = await page.locator("canvas").boundingBox(),
    x = r.x + r.width * 0.54,
    y = r.y + r.height * 0.48;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  for (let i = 1; i <= 15; i++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x + i * 3, y: y - i * 4 }],
    });
    await page.waitForTimeout(25);
  }
  await page.waitForTimeout(100);
  expect(
    (await page.evaluate(() => window.__instrument.stats())).displacement,
  ).toBeGreaterThan(0.1);
  await page.screenshot({
    path: "output/playwright/mobile-touch-stretch.png",
    fullPage: true,
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  expect((await page.evaluate(() => window.__instrument.stats())).finite).toBe(
    true,
  );
  await page.getByRole("button", { name: "◎ Orbit", exact: true }).click();
  await page.locator("canvas").scrollIntoViewIfNeeded();
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: 140, y: 400 },
      { x: 230, y: 400 },
    ],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      { x: 120, y: 400 },
      { x: 250, y: 400 },
    ],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
});
test("geometry undo and blocked WASM fallback", async ({ page }) => {
  await ready(page, "impossible-objects");
  const before = await page.evaluate(() => window.__instrument.capture());
  await page.getByRole("slider", { name: "Twist", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await page.locator("#undo").click();
  expect(await page.evaluate(() => window.__instrument.capture())).toEqual(
    before,
  );
  await page.route("**/manifold.wasm", (r) => r.abort());
  await page.reload();
  await expect(page.locator("body")).toHaveAttribute("data-failed", "true");
  await page.getByRole("link", { name: "Open the lighter 2D study" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-ready", "true");
  expect(await page.evaluate(() => window.__instrument.backend)).toBe(
    "canvas2d-study",
  );
});
