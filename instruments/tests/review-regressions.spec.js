import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
async function ready(page) {
  await page.goto("/instruments/impossible-objects/");
  await expect(page.locator("body")).toHaveAttribute("data-ready", "true");
}
for (const key of ["Home", "End"])
  test(`${key} slider edit is undoable`, async ({ page }) => {
    await ready(page);
    const slider = page.getByRole("slider", { name: "Twist", exact: true });
    const initial = await slider.inputValue();
    await slider.focus();
    await page.keyboard.press(key);
    await expect(slider).not.toHaveValue(initial);
    await expect(page.locator("#undo")).toBeEnabled();
    await page.locator("#undo").click();
    await expect(slider).toHaveValue(initial);
  });
test("immediate GLB export flushes a pending slider edit", async ({ page }) => {
  await ready(page);
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  const before = await page.locator("#geometry-info").innerText();
  const slider = page.getByRole("slider", { name: "Carve", exact: true });
  await slider.focus();
  await page.keyboard.press("End");
  await expect(slider).toHaveValue("0.8");
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "↓ Export art mesh · GLB" }).click();
  const file = await dl;
  const buffer = await readFile(await file.path());
  const json = JSON.parse(
    buffer.toString("utf8", 20, 20 + buffer.readUInt32LE(12)),
  );
  await page.clock.runFor(100);
  const expected = await page.evaluate(() => window.__instrument.stats());
  await expect(page.locator("#geometry-info")).not.toHaveText(before);
  expect(json.nodes[0].extras.dimensionsMillimetres).toEqual(
    expected.dimensions,
  );
  const positionAccessor =
    json.accessors[json.meshes[0].primitives[0].attributes.POSITION];
  expect(positionAccessor.count).toBeGreaterThan(0);
  const indexAccessor = json.accessors[json.meshes[0].primitives[0].indices];
  expect(indexAccessor.count / 3).toBe(expected.triangles);
});
test("preset highlight follows Undo and Reset", async ({ page }) => {
  await ready(page);
  const arch = page.getByRole("button", { name: "Pebble arch", exact: true }),
    moon = page.getByRole("button", { name: "Moon stone", exact: true });
  await moon.click();
  await expect(moon).toHaveAttribute("aria-pressed", "true");
  await page.locator("#undo").click();
  await expect(arch).toHaveAttribute("aria-pressed", "true");
  await expect(moon).toHaveAttribute("aria-pressed", "false");
  await moon.click();
  await page.locator("#reset").click();
  await expect(arch).toHaveAttribute("aria-pressed", "true");
  await expect(moon).toHaveAttribute("aria-pressed", "false");
});
