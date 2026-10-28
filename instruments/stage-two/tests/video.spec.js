import { test, expect } from "@playwright/test";
const route = "/instruments/time-sculpture/",
  fixture = "../../output/playwright/original-motion.webm";
async function track(page) {
  await page.addInitScript(() => {
    window.urls = { created: 0, revoked: 0 };
    const create = URL.createObjectURL,
      revoke = URL.revokeObjectURL;
    URL.createObjectURL = function (...a) {
      urls.created++;
      return create.apply(this, a);
    };
    URL.revokeObjectURL = function (...a) {
      urls.revoked++;
      sessionStorage.setItem("revoked", String(urls.revoked));
      return revoke.apply(this, a);
    };
    window.uploads = [];
    const upload = WebGL2RenderingContext.prototype.texSubImage3D;
    WebGL2RenderingContext.prototype.texSubImage3D = function (...a) {
      if (a[5] === 128 && a[10]?.byteLength === 4194304) {
        const d = a[10];
        let topAlpha = 0,
          bottomAlpha = 0,
          middleAlpha = 0;
        for (let x = 0; x < 128; x++) {
          topAlpha += d[x * 4 + 3];
          bottomAlpha += d[(127 * 128 + x) * 4 + 3];
          middleAlpha += d[(64 * 128 + x) * 4 + 3];
        }
        const hash = (frame) => {
          let h = 0;
          for (let i = 0; i < 65536; i += 137)
            h = (h * 31 + d[frame * 65536 + i]) >>> 0;
          return h;
        };
        uploads.push({
          frame0Hash: hash(0),
          frame32Hash: hash(32),
          bytes: d.byteLength,
          topAlpha,
          bottomAlpha,
          middleAlpha,
        });
      }
      return upload.apply(this, a);
    };
  });
}
test("local video imports 64 aspect-preserved frames, replaces resources, and restores demo", async ({
  page,
}) => {
  await track(page);
  const external = [];
  page.on("request", (r) => {
    if (
      /^https?:/.test(r.url()) &&
      !r.url().startsWith("http://127.0.0.1:4185")
    )
      external.push(r.url());
  });
  await page.goto(route);
  const before = await page.locator("canvas").screenshot();
  await page.getByLabel("Choose a local video").setInputFiles(fixture);
  await expect(page.locator("#status")).toContainText("Local clip ready", {
    timeout: 20000,
  });
  await expect
    .poll(() => page.evaluate(() => urls.created === urls.revoked))
    .toBe(true);
  await expect
    .poll(() => page.evaluate(() => uploads.length))
    .toBeGreaterThan(1);
  const upload = await page.evaluate(() => uploads.at(-1));
  expect(upload.bytes).toBe(4194304);
  expect(upload.frame0Hash).not.toBe(upload.frame32Hash);
  expect(upload.topAlpha).toBe(0);
  expect(upload.bottomAlpha).toBe(0);
  expect(upload.middleAlpha).toBeGreaterThan(0);
  expect((await page.locator("canvas").screenshot()).equals(before)).toBe(
    false,
  );
  await page.screenshot({
    path: "../../output/playwright/time-local-video.png",
    fullPage: true,
  });
  await page.getByLabel("Choose a local video").setInputFiles(fixture);
  await expect(page.locator("#status")).toContainText("Local clip ready", {
    timeout: 20000,
  });
  expect(await page.evaluate(() => urls.created)).toBe(2);
  expect(await page.evaluate(() => urls.revoked)).toBe(2);
  await page.getByRole("button", { name: "Use generated demo" }).click();
  await expect(page.locator("#status")).toContainText("demo restored");
  expect(external).toEqual([]);
});
test("cancel, codec failure, metadata limits and interrupted decode keep the previous sculpture", async ({
  page,
}) => {
  await track(page);
  await page.goto(route);
  await page.getByLabel("Choose a local video").setInputFiles(fixture);
  await page
    .getByRole("button", { name: "Cancel import", exact: true })
    .click();
  await expect(page.locator("#status")).toContainText("cancelled");
  await expect
    .poll(() => page.evaluate(() => urls.created === urls.revoked))
    .toBe(true);
  await page.getByLabel("Choose a local video").setInputFiles({
    name: "unsupported.webm",
    mimeType: "video/webm",
    buffer: Buffer.from("Not a video codec"),
  });
  await expect(page.locator("#status")).toContainText("could not be decoded");
  await page
    .getByLabel("Choose a local video")
    .setInputFiles("../../output/playwright/too-long.webm");
  await expect(page.locator("#status")).toContainText("no longer than 12");
  await page
    .getByLabel("Choose a local video")
    .setInputFiles("../../output/playwright/too-wide.webm");
  await expect(page.locator("#status")).toContainText("1920 pixels");
  await page.evaluate(() => {
    const create = document.createElement.bind(document);
    document.createElement = function (name, ...args) {
      const el = create(name, ...args);
      if (name === "video")
        el.addEventListener(
          "seeked",
          () => el.dispatchEvent(new Event("error")),
          { once: true },
        );
      return el;
    };
  });
  await page.getByLabel("Choose a local video").setInputFiles(fixture);
  await expect(page.locator("#status")).toContainText("could not be decoded");
  await expect
    .poll(() => page.evaluate(() => urls.created === urls.revoked))
    .toBe(true);
  await expect(page.locator("#loading")).toBeHidden();
});
test("route exit during extraction releases the local URL", async ({
  page,
}) => {
  await track(page);
  await page.goto(route);
  await page.getByLabel("Choose a local video").setInputFiles(fixture);
  await page.getByRole("link", { name: "Sonic Loom", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => Number(sessionStorage.getItem("revoked"))))
    .toBe(1);
});
for (const reduced of [true, false])
  test(`explicit Sweep resumes ${reduced ? "reduced-motion initial state" : "manually paused state"}`, async ({
    page,
  }) => {
    await page.emulateMedia({
      reducedMotion: reduced ? "reduce" : "no-preference",
    });
    await page.goto(route);
    if (!reduced)
      await page.getByRole("button", { name: "Ⅱ Pause", exact: true }).click();
    const canvas = page.locator("canvas"),
      before = await canvas.screenshot();
    await page.getByRole("button", { name: "▶ Sweep through time" }).click();
    await expect(
      page.getByRole("button", { name: "Ⅱ Pause", exact: true }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.getByRole("slider", { name: "Time", exact: true }).inputValue(),
      )
      .not.toBe("0.5");
    expect((await canvas.screenshot()).equals(before)).toBe(false);
    await expect(
      page.getByRole("slider", { name: "Slice depth", exact: true }),
    ).toHaveValue("0.18");
  });

test("reset and hidden-state cancellation revoke pending imports without a stale install", async ({
  page,
}) => {
  await track(page);
  await page.goto(route);
  await page.getByLabel("Choose a local video").setInputFiles(fixture);
  await page.getByRole("button", { name: "↺ Reset" }).click();
  await expect(page.locator("#status")).toContainText("demo restored");
  await expect
    .poll(() => page.evaluate(() => urls.created === urls.revoked))
    .toBe(true);
  await page.getByLabel("Choose a local video").setInputFiles(fixture);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator("#status")).toContainText("Import stopped");
  await expect
    .poll(() => page.evaluate(() => urls.created === urls.revoked))
    .toBe(true);
});
