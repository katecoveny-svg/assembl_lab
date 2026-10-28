import { test, expect, chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const routes = ["sonic-loom", "time-sculpture"];
const root = "/instruments/";
const out = "../../output/playwright/";
test("actual same-window tab hiding, navigation and back navigation stop audio", async () => {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: false,
    ignoreDefaultArgs: [
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--disable-background-timer-throttling",
    ],
  });
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:4185",
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    const C = AudioContext;
    window.audio = [];
    window.AudioContext = class extends C {
      constructor() {
        super();
        audio.push(this);
      }
      close() {
        sessionStorage.setItem(
          "closed",
          String(Number(sessionStorage.getItem("closed") || 0) + 1),
        );
        return super.close();
      }
    };
  });
  await page.goto(root + "sonic-loom/");
  await page.getByRole("button", { name: "▶ Play rhythm" }).click();
  const session = await context.newCDPSession(page);
  const { targetInfo } = await session.send("Target.getTargetInfo");
  const other = await session.send("Target.createTarget", {
    url: "about:blank",
    browserContextId: targetInfo.browserContextId,
    newWindow: false,
    background: false,
  });
  await session.send("Target.activateTarget", { targetId: other.targetId });
  await page.waitForTimeout(500);
  if (!(await page.evaluate(() => document.hidden))) {
    await browser.close();
    test.skip(
      true,
      "Test browser keeps document.hidden=false after tab switch and native-window minimization; real visibility transition unavailable.",
    );
  }
  await expect
    .poll(() => page.evaluate(() => audio[0].state))
    .toBe("suspended");
  await session.send("Target.activateTarget", {
    targetId: targetInfo.targetId,
  });
  await page.bringToFront();
  expect(await page.evaluate(() => audio[0].state)).toBe("suspended");
  await page.getByRole("button", { name: "▶ Play rhythm" }).click();
  await page.getByRole("link", { name: "Time Sculpture", exact: true }).click();
  expect(await page.evaluate(() => sessionStorage.getItem("closed"))).toBe("1");
  await page.goBack();
  await expect(
    page.getByRole("button", { name: "▶ Play rhythm" }),
  ).toBeVisible();
  expect(await page.evaluate(() => audio.length)).toBe(0);
  await context.close();
  await browser.close();
});
test("keyboard pluck visibly deforms ribbons; rhythm and orbit change pixels", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(root + "sonic-loom/");
  const canvas = page.locator("canvas");
  await expect(
    page.getByRole("button", { name: "▶ Resume", exact: true }),
  ).toBeVisible();
  const initial = await canvas.screenshot();
  await canvas.focus();
  await page.keyboard.press("1");
  await page.getByRole("button", { name: "Ⅱ Pause", exact: true }).click();
  expect((await canvas.screenshot()).equals(initial)).toBe(false);
  await page.getByRole("button", { name: "▶ Play rhythm" }).click();
  await page.waitForTimeout(250);
  await page.getByRole("button", { name: "Ⅱ Pause", exact: true }).click();
  const rhythm = await canvas.screenshot();
  expect(rhythm.equals(initial)).toBe(false);
  await page.getByRole("button", { name: "Gesture: Pluck" }).click();
  await canvas.focus();
  await page.keyboard.press("ArrowLeft");
  expect((await canvas.screenshot()).equals(rhythm)).toBe(false);
  await page.screenshot({ path: out + "sonic-keyboard.png" });
  await page.getByRole("button", { name: "Gesture: Orbit" }).click();
  await page.getByRole("button", { name: "↺ Reset" }).click();
  const preDrag = await canvas.screenshot(),
    r = await canvas.boundingBox();
  await page.mouse.move(r.x + r.width * 0.5, r.y + r.height * 0.25);
  await page.mouse.down();
  await page.mouse.move(r.x + r.width * 0.5, r.y + r.height * 0.8, {
    steps: 20,
  });
  await page.mouse.up();
  await page.getByRole("button", { name: "Ⅱ Pause", exact: true }).click();
  expect((await canvas.screenshot()).equals(preDrag)).toBe(false);
  await page.screenshot({ path: out + "sonic-drag.png" });
});
test("Time orbit reveals volume from multiple angles and keyboard slice works", async ({
  page,
}) => {
  await page.goto(root + "time-sculpture/");
  const c = page.locator("canvas");
  const front = await c.screenshot();
  const r = await c.boundingBox();
  await page.mouse.move(r.x + r.width * 0.5, r.y + r.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(r.x + r.width * 0.75, r.y + r.height * 0.6, {
    steps: 12,
  });
  await page.mouse.up();
  await page.waitForTimeout(250);
  expect((await c.screenshot()).equals(front)).toBe(false);
  await page.screenshot({ path: out + "time-orbit.png" });
  const slider = page.getByRole("slider", { name: "Slice depth", exact: true });
  await slider.focus();
  await page.keyboard.press("Home");
  await expect(slider).toHaveValue("0.02");
  await page.screenshot({ path: out + "time-slice.png" });
  await page.getByRole("button", { name: "↶ Undo" }).click();
  await expect(slider).toHaveValue("1");
});
for (const route of routes)
  test(
    route + " mobile orientations, reduced motion and local export fallbacks",
    async ({ page }) => {
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "canShare", {
          configurable: true,
          value: () => false,
        });
      });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(root + route + "/");
      await expect(
        page.getByRole("button", { name: "▶ Resume", exact: true }),
      ).toBeVisible();
      await expect(page.locator("#share")).toBeHidden();
      const canvas = page.locator("canvas"),
        still = await canvas.screenshot();
      await page.waitForTimeout(150);
      expect((await canvas.screenshot()).equals(still)).toBe(true);
      for (const [name, size] of [
        ["portrait", { width: 390, height: 844 }],
        ["landscape", { width: 844, height: 390 }],
      ]) {
        await page.setViewportSize(size);
        await page.waitForTimeout(100);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await page.screenshot({
          path: out + route + "-" + name + ".png",
          fullPage: true,
        });
      }
      const d = page.waitForEvent("download");
      await page.locator("#save").click();
      expect((await d).suggestedFilename()).toBe(route + ".png");
      await page.evaluate(() => {
        window.print = () => {};
        Object.defineProperty(navigator, "canShare", { value: () => true });
        Object.defineProperty(navigator, "share", {
          configurable: true,
          value: () => Promise.reject(new DOMException("cancel", "AbortError")),
        });
        document.getElementById("share").hidden = false;
      });
      await page.locator("#share").click();
      await expect(page.locator("#status")).toContainText("cancelled");
      await page.evaluate(() =>
        Object.defineProperty(navigator, "share", {
          configurable: true,
          value: () => Promise.reject(Error("unsupported")),
        }),
      );
      await page.locator("#share").click();
      await expect(page.locator("#status")).toContainText("Save a PNG");
      await page.locator("#print").click();
      expect(
        await page.locator(".print-image").evaluate((i) => i.naturalWidth),
      ).toBeGreaterThan(0);
    },
  );
test("repeated routes and measured browser animation timing", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const report = {};
  for (let iteration = 0; iteration < 2; iteration++)
    for (const route of routes) {
      await page.goto(root + route + "/");
      await expect(page.locator("#loading")).toBeHidden();
      if (!iteration) {
        if (route === "sonic-loom")
          await page.locator("#controls button").first().click();
        else
          await page
            .getByRole("button", { name: "▶ Sweep through time" })
            .click();
        report[route] = await page.evaluate(
          () =>
            new Promise((resolve) => {
              const a = [];
              let previous = performance.now(),
                start = previous;
              function step(t) {
                a.push(t - previous);
                previous = t;
                if (t - start < 2500) requestAnimationFrame(step);
                else {
                  a.shift();
                  a.sort((x, y) => x - y);
                  resolve({
                    samples: a.length,
                    medianMs: a[Math.floor(a.length * 0.5)],
                    p95Ms: a[Math.floor(a.length * 0.95)],
                    meanMs: a.reduce((x, y) => x + y, 0) / a.length,
                    viewport: [innerWidth, innerHeight],
                    dpr: devicePixelRatio,
                  });
                }
              }
              requestAnimationFrame(step);
            }),
        );
      }
    }
  expect(errors).toEqual([]);
  await writeFile(
    out +
      "stage-two-frame-timing" +
      (process.env.STAGE_TWO_HEADED ? "-headed" : "") +
      ".json",
    JSON.stringify(report, null, 2),
  );
  console.log(report);
});

test("actual repeated route exit closes audio and back navigation rebuilds safely", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const C = AudioContext;
    window.audio = [];
    window.AudioContext = class extends C {
      constructor() {
        super();
        audio.push(this);
      }
      close() {
        sessionStorage.setItem(
          "closed",
          String(Number(sessionStorage.getItem("closed") || 0) + 1),
        );
        return super.close();
      }
    };
  });
  for (let i = 0; i < 3; i++) {
    await page.goto(root + "sonic-loom/");
    await page.getByRole("button", { name: "▶ Play rhythm" }).click();
    await page
      .getByRole("link", { name: "Time Sculpture", exact: true })
      .click();
    expect(
      await page.evaluate(() => Number(sessionStorage.getItem("closed"))),
    ).toBe(i + 1);
  }
  await page.goBack();
  await expect(
    page.getByRole("button", { name: "▶ Play rhythm" }),
  ).toBeVisible();
  expect(await page.evaluate(() => audio.length)).toBe(0);
});
