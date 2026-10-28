import { test, expect } from "@playwright/test";
const root = "/instruments/";
test("Sonic audio is gesture-gated, bounded, recoverable, synchronised and disposed", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.audio = [];
    const Base = window.AudioContext;
    window.AudioContext = class extends Base {
      constructor(...a) {
        super(...a);
        window.audio.push(this);
        window.starts = 0;
        window.active = 0;
        window.peak = 0;
      }
      createOscillator() {
        const o = super.createOscillator(),
          start = o.start.bind(o),
          stop = o.stop.bind(o);
        o.start = (...a) => {
          window.starts++;
          window.active++;
          window.peak = Math.max(window.peak, window.active);
          return start(...a);
        };
        o.addEventListener("ended", () => window.active--);
        return o;
      }
      createGain() {
        const g = super.createGain();
        if (!window.master) {
          window.master = g;
          const analyser = this.createAnalyser();
          g.connect(analyser);
          window.analyser = analyser;
        }
        return g;
      }
    };
  });
  await page.goto(root + "sonic-loom/");
  expect(await page.evaluate(() => audio.length)).toBe(0);
  await page.getByRole("button", { name: "▶ Play rhythm" }).click();
  await expect.poll(() => page.evaluate(() => audio[0].state)).toBe("running");
  await expect.poll(() => page.evaluate(() => starts)).toBeGreaterThan(2);
  expect(
    await page.evaluate(() => {
      const a = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(a);
      return a.some((x) => Math.abs(x) > 0.00001);
    }),
  ).toBe(true);
  await expect(page.locator("#metrics")).toContainText("BPM");
  await page.getByRole("button", { name: "Mute", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => master.gain.value))
    .toBeLessThan(0.001);
  await page.getByRole("button", { name: "Ⅱ Pause", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => audio[0].state))
    .toBe("suspended");
  await page.getByRole("button", { name: "▶ Play rhythm" }).click();
  await expect(
    page.getByRole("button", { name: "Ⅱ Pause", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => audio[0].suspend());
  await expect(page.locator("#status")).toContainText("interrupted");
  await page.getByRole("button", { name: "▶ Play rhythm" }).click();
  await expect.poll(() => page.evaluate(() => audio[0].state)).toBe("running");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect
    .poll(() => page.evaluate(() => audio[0].state))
    .toBe("suspended");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(await page.evaluate(() => audio[0].state)).toBe("suspended");
  await page.screenshot({ path: "../../output/playwright/sonic-final.png" });
  expect(await page.evaluate(() => peak)).toBeLessThanOrEqual(16);
  await page.evaluate(() =>
    window.dispatchEvent(new PageTransitionEvent("pagehide")),
  );
  await expect.poll(() => page.evaluate(() => audio[0].state)).toBe("closed");
});
test("audio rejection is recoverable without reload", async ({ page }) => {
  await page.addInitScript(() => {
    const r = AudioContext.prototype.resume;
    let first = true;
    AudioContext.prototype.resume = function () {
      if (first) {
        first = false;
        return Promise.reject(Error("test interruption"));
      }
      return r.call(this);
    };
  });
  await page.goto(root + "sonic-loom/");
  await page.getByRole("button", { name: "▶ Play rhythm" }).click();
  await expect(page.locator("#status")).toContainText("could not start");
  await page.getByRole("button", { name: "▶ Play rhythm" }).click();
  await expect(page.locator("#status")).toContainText("Playing");
});
test("Time renders 4 MiB 3D texture; slice, time, threshold, undo and PNG work", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.addInitScript(() => {
    window.volumes = [];
    const f = WebGL2RenderingContext.prototype.texSubImage3D;
    WebGL2RenderingContext.prototype.texSubImage3D = function (...a) {
      if (a[5] === 128)
        volumes.push({
          width: a[5],
          height: a[6],
          depth: a[7],
          bytes: a[10]?.byteLength,
        });
      return f.apply(this, a);
    };
  });
  await page.goto(root + "time-sculpture/");
  await expect(page.locator("#metrics")).toContainText("4.0 MiB");
  await expect
    .poll(() => page.evaluate(() => volumes.length))
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => volumes[0])).toEqual({
    width: 128,
    height: 128,
    depth: 64,
    bytes: 4194304,
  });
  const canvas = page.locator("canvas");
  const initial = await canvas.screenshot();
  await page
    .getByRole("slider", { name: "Slice depth", exact: true })
    .fill("0.2");
  await page.waitForTimeout(100);
  expect((await canvas.screenshot()).equals(initial)).toBe(false);
  const slice = await canvas.screenshot();
  await page.getByRole("slider", { name: "Time", exact: true }).fill("0.8");
  await page.waitForTimeout(100);
  expect((await canvas.screenshot()).equals(slice)).toBe(false);
  const time = await canvas.screenshot();
  await page
    .getByRole("slider", { name: "Background threshold", exact: true })
    .fill("0.7");
  await page.waitForTimeout(100);
  expect((await canvas.screenshot()).equals(time)).toBe(false);
  await page.getByRole("button", { name: "↺ Reset" }).click();
  await page.getByRole("button", { name: "Another motion" }).click();
  await page.getByRole("button", { name: "↶ Undo" }).click();
  expect(
    await page.getByRole("slider", { name: "Time", exact: true }).inputValue(),
  ).toBe("0.5");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "↓ Save image" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("time-sculpture.png");
  await file.saveAs("../../output/playwright/time-export.png");
  expect(errors).toEqual([]);
  await page.evaluate(() => {
    window.print = () => window.dispatchEvent(new Event("beforeprint"));
  });
  await page.getByRole("button", { name: "Print", exact: true }).click();
  await expect
    .poll(() => page.locator(".print-image").evaluate((i) => i.naturalWidth))
    .toBeGreaterThan(100);
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".print-image")).toBeVisible();
  await page.pdf({ path: "../../output/playwright/time-print.pdf" });
  await page.emulateMedia({ media: "screen" });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: "../../output/playwright/time-sculpture-final.png",
  });
});
test("Liquid is finite, responsive to stirring, and mobile layout fits", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(root + "liquid-playground/");
  await expect(page.locator("#metrics")).toContainText("640 PARTICLES");
  await page.getByRole("button", { name: "Ⅱ Pause", exact: true }).click();
  const before = await page.locator("canvas").screenshot();
  await page.getByRole("button", { name: "↟ Stir the liquid" }).click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Ⅱ Pause", exact: true }).click();
  expect((await page.locator("canvas").screenshot()).equals(before)).toBe(
    false,
  );
  await page.screenshot({ path: "../../output/playwright/liquid-final.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "../../output/playwright/liquid-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
