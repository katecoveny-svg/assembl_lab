import { test, expect } from "@playwright/test";
const routes = [
  ["reality-remix", "", ["Brush size"]],
  ["soft-matter", "", ["Spring"]],
  ["impossible-objects", "", ["Merge", "Carve", "Twist"]],
  ["reality-remix", "?mode=2d", ["Reach"]],
  ["soft-matter", "?mode=2d", ["Reach"]],
  ["impossible-objects", "?mode=2d", ["Reach"]],
];
for (const [route, query, names] of routes)
  test(`${route}${query}: all native range keys restore complete state`, async ({
    page,
  }) => {
    await page.goto(`/instruments/${route}/${query}`);
    await expect(page.locator("body")).toHaveAttribute("data-ready", "true");
    await page.locator("#freeze").click();
    for (const name of names)
      for (const key of [
        "Home",
        "End",
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "PageUp",
        "PageDown",
      ]) {
        const slider = page.getByRole("slider", { name, exact: true });
        const before = await slider.inputValue();
        const state = await page.evaluate(() =>
          JSON.stringify(window.__instrument.capture()),
        );
        await slider.focus();
        await page.keyboard.press(key);
        const changed = await slider.inputValue();
        if (changed === before) {
          await expect(page.locator("#undo")).toBeDisabled();
          continue;
        }
        await expect(page.locator("#undo")).toBeEnabled();
        await page.locator("#undo").click();
        await expect(slider).toHaveValue(before);
        expect(
          await page.evaluate(() =>
            JSON.stringify(window.__instrument.capture()),
          ),
        ).toBe(state);
        await expect(page.locator("#undo")).toBeDisabled();
      }
  });
test("spring undo crosses material preset and quality changes without losing the sculpture", async ({
  page,
}) => {
  await page.goto("/instruments/soft-matter/");
  await expect(page.locator("body")).toHaveAttribute("data-ready", "true");
  await page.locator("#freeze").click();
  const original = await page.evaluate(() =>
    JSON.stringify(window.__instrument.capture()),
  );
  await page.getByRole("button", { name: "Mint foam", exact: true }).click();
  await page.getByRole("slider", { name: "Spring", exact: true }).focus();
  await page.keyboard.press("End");
  await page.locator("#quality").selectOption("light");
  await page.locator("#undo").click();
  await expect(
    page.getByRole("slider", { name: "Spring", exact: true }),
  ).toHaveValue("9");
  await expect(
    page.getByRole("button", { name: "Mint foam", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.locator("#undo").click();
  await expect(
    page.getByRole("button", { name: "Rose jelly", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(
    await page.evaluate(() => JSON.stringify(window.__instrument.capture())),
  ).toBe(original);
});
test("one held key or pointer drag creates one undo step; boundary no-ops create none", async ({
  page,
}) => {
  await page.goto("/instruments/soft-matter/");
  await expect(page.locator("body")).toHaveAttribute("data-ready", "true");
  await page.locator("#freeze").click();
  const slider = page.getByRole("slider", { name: "Spring", exact: true });
  await slider.focus();
  await page.keyboard.down("ArrowRight");
  await page.keyboard.down("ArrowRight");
  await page.keyboard.down("ArrowRight");
  await page.keyboard.up("ArrowRight");
  await expect(slider).not.toHaveValue("5");
  await page.locator("#undo").click();
  await expect(slider).toHaveValue("5");
  await expect(page.locator("#undo")).toBeDisabled();
  await slider.scrollIntoViewIfNeeded();
  const box = await slider.boundingBox();
  await page.mouse.move(box.x + box.width * 0.65, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.85, box.y + box.height / 2, {
    steps: 5,
  });
  await page.mouse.up();
  await page.locator("#undo").click();
  await expect(slider).toHaveValue("5");
  await expect(page.locator("#undo")).toBeDisabled();
  await slider.focus();
  await page.keyboard.press("Home");
  await page.keyboard.press("Home");
  await page.locator("#undo").click();
  await expect(slider).toHaveValue("5");
  await expect(page.locator("#undo")).toBeDisabled();
});
