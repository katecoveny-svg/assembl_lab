import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
test.beforeEach(async ({ page }) => {
  await page.goto("/instruments/squishy-lab/");
  await page.waitForFunction(() => window.__squishy);
});
test("live factory, explicit shape, undo and quality preserve state", async ({
  page,
}, info) => {
  expect((await page.evaluate(() => __squishy.stats())).particles).toBeLessThan(
    200,
  );
  await page.locator("#pause").click();
  const initial = await page.evaluate(() => __squishy.capture());
  await page.locator("[data-shape=halo]").click();
  expect((await page.evaluate(() => __squishy.capture())).design.shape).toBe(
    "cloud",
  );
  await page.locator("#make-shape").click();
  expect((await page.evaluate(() => __squishy.capture())).design.shape).toBe(
    "halo",
  );
  await page.locator("#undo").click();
  expect((await page.evaluate(() => __squishy.capture())).pose).toEqual(
    initial.pose,
  );
  await page.locator("[data-tab=feel]").click();
  for (const id of ["spring", "squish", "rebound"]) {
    const old = await page.locator("#" + id).inputValue();
    await page.locator("#" + id).press("End");
    await page.locator("#undo").click();
    await expect(page.locator("#" + id)).toHaveValue(old);
  }
  const before = await page.evaluate(() => __squishy.capture());
  await page.locator("#quality").selectOption("full");
  expect(await page.evaluate(() => __squishy.capture())).toEqual(before);
  await page.locator("#quality").selectOption("light");
  await page.screenshot({
    path: `squishy-lab/output/${info.project.name}-factory.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("real dragging deforms particles and release rebounds", async ({
  page,
}) => {
  await page.locator("[data-mode=stretch]").click();
  const r = await page.locator("#canvas").boundingBox();
  await page.mouse.move(r.x + r.width * 0.52, r.y + r.height * 0.43);
  await page.mouse.down();
  await page.mouse.move(r.x + r.width * 0.67, r.y + r.height * 0.27, {
    steps: 12,
  });
  await page.waitForTimeout(300);
  const held = await page.evaluate(() => __squishy.stats());
  await page.mouse.up();
  expect(held.displacement).toBeGreaterThan(0.1);
  await page.waitForTimeout(1800);
  const released = await page.evaluate(() => __squishy.stats());
  expect(released.finite).toBe(true);
  expect(released.displacement).toBeLessThan(held.displacement);
});
test("project round trip and rejection leave artwork intact", async ({
  page,
}) => {
  await page.locator("#pause").click();
  const project = await page.evaluate(() => __squishy.project());
  await page.locator('[data-recipe="Moon pillow"]').click();
  await page.locator("#project-file").setInputFiles({
    name: "art.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await expect(page.locator("#status")).toContainText("loaded paused");
  expect(await page.evaluate(() => __squishy.project())).toEqual(project);
  const bad = { ...project, unexpected: "no" };
  await page.locator("#project-file").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(bad)),
  });
  await expect(page.locator("#status")).toContainText("Could not load");
  expect(await page.evaluate(() => __squishy.project())).toEqual(project);
});
test("PNG JPEG aspect exports and current GLB have verified formats", async ({
  page,
}, info) => {
  await page.locator("#pause").click();
  await page.locator("#open-export").click();
  for (const format of ["png", "jpeg"])
    for (const aspect of ["square", "portrait", "landscape"]) {
      await page.locator("#format").selectOption(format);
      await page.locator("#aspect").selectOption(aspect);
      const dl = page.waitForEvent("download");
      await page.locator("#save-image").click();
      const file = await dl;
      const bytes = await fs.readFile(await file.path());
      const data = await page.evaluate(
        async ({ base64, mime }) => {
          const blob = await (
            await fetch("data:" + mime + ";base64," + base64)
          ).blob();
          const image = await createImageBitmap(blob);
          return { w: image.width, h: image.height };
        },
        {
          base64: bytes.toString("base64"),
          mime: format === "png" ? "image/png" : "image/jpeg",
        },
      );
      expect(data).toEqual(
        {
          square: { w: 1080, h: 1080 },
          portrait: { w: 1080, h: 1350 },
          landscape: { w: 1600, h: 900 },
        }[aspect],
      );
      expect(bytes.subarray(0, 2).toString("hex")).toBe(
        format === "png" ? "8950" : "ffd8",
      );
    }
  const dl = page.waitForEvent("download");
  await page.locator("#save-glb").click();
  const bytes = await fs.readFile(await (await dl).path());
  expect(bytes.toString("ascii", 0, 4)).toBe("glTF");
  expect(bytes.readUInt32LE(4)).toBe(2);
  expect(bytes.readUInt32LE(8)).toBe(bytes.length);
});

test("held keyboard edits group into one undo and GLB contains exact current vertices", async ({
  page,
}) => {
  await page.locator("#wobble").click();
  await page.waitForTimeout(100);
  await page.locator("#pause").click();
  await page.locator("[data-tab=look]").click();
  const initial = await page.locator("#mix").inputValue();
  const n = await page.evaluate(() => __squishy.history());
  await page.locator("#mix").focus();
  await page.keyboard.down("ArrowRight");
  await page.keyboard.down("ArrowRight");
  await page.keyboard.down("ArrowRight");
  await page.keyboard.up("ArrowRight");
  expect(await page.evaluate(() => __squishy.history())).toBe(n + 1);
  await page.locator("#undo").click();
  expect(await page.locator("#mix").inputValue()).toBe(initial);
  const positions = await page.evaluate(() => __squishy.meshPositions());
  await page.locator("#open-export").click();
  const wait = page.waitForEvent("download");
  await page.locator("#save-glb").click();
  const bytes = await fs.readFile(await (await wait).path());
  const len = bytes.readUInt32LE(12),
    json = JSON.parse(bytes.toString("utf8", 20, 20 + len));
  const acc = json.accessors[json.meshes[0].primitives[0].attributes.POSITION],
    view = json.bufferViews[acc.bufferView],
    offset = 20 + len + 8 + (view.byteOffset || 0) + (acc.byteOffset || 0);
  const actual = Array.from({ length: acc.count * 3 }, (_, i) =>
    bytes.readFloatLE(offset + i * 4),
  );
  expect(actual).toEqual(positions);
  expect([
    json.nodes[0].matrix[0],
    json.nodes[0].matrix[5],
    json.nodes[0].matrix[10],
  ]).toEqual([0.03, 0.03, 0.03]);
});

test("reset is undoable and colour-pattern-finish edits keep the sculpture", async ({
  page,
}) => {
  await page.locator("#wobble").click();
  await page.waitForTimeout(100);
  await page.locator("#pause").click();
  const before = await page.evaluate(() => __squishy.capture());
  await page.locator("#reset").click();
  expect((await page.evaluate(() => __squishy.capture())).pose).not.toEqual(
    before.pose,
  );
  await page.locator("#undo").click();
  expect(await page.evaluate(() => __squishy.capture())).toEqual(before);
  await page.locator("[data-tab=look]").click();
  await page.locator("[data-pattern=swirl]").click();
  await page.locator("[data-finish=matte]").click();
  await page.locator("#color-a").fill("#7744cc");
  expect((await page.evaluate(() => __squishy.capture())).pose).toEqual(
    before.pose,
  );
  expect((await page.evaluate(() => __squishy.capture())).design.colorA).toBe(
    "#7744cc",
  );
});
