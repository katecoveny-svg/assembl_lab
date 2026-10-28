import { test, expect } from "@playwright/test";
for (const action of ["Ⅱ Pause", "↺ Reset"])
  test(`pending audio resume cannot override ${action}; deliberate retry works`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const Base = AudioContext;
      window.audio = [];
      window.AudioContext = class extends Base {
        constructor() {
          super();
          audio.push(this);
        }
      };
      const resume = Base.prototype.resume;
      let first = true;
      Base.prototype.resume = function () {
        if (first) {
          first = false;
          return new Promise(
            (resolve, reject) =>
              (window.finishResume = () =>
                resume.call(this).then(resolve, reject)),
          );
        }
        return resume.call(this);
      };
    });
    await page.goto("/instruments/sonic-loom/");
    await page.getByRole("button", { name: "▶ Play rhythm" }).click();
    await expect
      .poll(() => page.evaluate(() => typeof finishResume))
      .toBe("function");
    await page.getByRole("button", { name: action, exact: true }).click();
    await page.evaluate(() => finishResume());
    await expect
      .poll(() => page.evaluate(() => audio[0].state))
      .toBe("suspended");
    await expect(
      page.getByRole("button", { name: "▶ Play rhythm" }),
    ).toBeVisible();
    if (action === "Ⅱ Pause")
      await expect(
        page.getByRole("button", { name: "▶ Resume", exact: true }),
      ).toBeVisible();
    await page.getByRole("button", { name: "▶ Play rhythm" }).click();
    await expect
      .poll(() => page.evaluate(() => audio[0].state))
      .toBe("running");
    await expect(
      page.getByRole("button", { name: "Ⅱ Stop rhythm" }),
    ).toBeVisible();
  });
