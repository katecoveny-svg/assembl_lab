// Run with the installed Playwright CLI run-code, passing its existing page.
async function boundaryWalk(page) {
  const errors = [];
  const onError = (error) => errors.push(error.message);
  page.on("pageerror", onError);
  try {
    await page.reload();
    await page.locator("#reset").click();
    await page.locator("#view").focus();
    // Actual browser keyboard input reproduces the reported Right → Up sequence.
    for (let i = 0; i < 20; i++) await page.keyboard.press("ArrowRight");
    for (let i = 0; i < 20; i++) await page.keyboard.press("ArrowUp");
    await page.keyboard.press("Enter");
    const reproduction = await page.locator("#count").innerText();
    if (!reproduction.startsWith("1 /"))
      throw Error("Reported corner sequence did not place");
    const cases = await page.evaluate(() => {
      const $ = (id) => document.getElementById(id),
        failures = [];
      let total = 0;
      const key = (key) =>
        $("view").dispatchEvent(
          new KeyboardEvent("keydown", {
            key,
            bubbles: true,
            cancelable: true,
          }),
        );
      for (const mode of ["brush", "board"])
        for (const size of ["0.11", "0.16", "0.23"])
          for (const shape of ["round", "square", "marquise"]) {
            document.querySelector(`[data-mode="${mode}"]`).click();
            $("size").value = size;
            $("shape").value = shape;
            for (const [horizontal, vertical] of [
              ["ArrowRight", "ArrowUp"],
              ["ArrowLeft", "ArrowUp"],
              ["ArrowLeft", "ArrowDown"],
              ["ArrowRight", "ArrowDown"],
            ]) {
              $("reset").click();
              for (let i = 0; i < 25; i++) key(horizontal);
              for (let i = 0; i < 25; i++) key(vertical);
              key("Enter");
              total++;
              if (!$("count").textContent.startsWith("1 /"))
                failures.push({
                  mode,
                  size,
                  shape,
                  horizontal,
                  vertical,
                  count: $("count").textContent,
                  status: $("status").textContent,
                });
            }
          }
      // Carry a far board cursor into the brush, enlarge its footprint, then Enter without an arrow.
      document.querySelector('[data-mode="board"]').click();
      $("size").value = "0.11";
      $("shape").value = "round";
      for (let i = 0; i < 25; i++) {
        key("ArrowRight");
        key("ArrowUp");
      }
      document.querySelector('[data-mode="brush"]').click();
      $("size").value = "0.23";
      $("shape").value = "marquise";
      key("Enter");
      if (!$("count").textContent.startsWith("1 /"))
        failures.push({ transition: true });
      return { total, failures };
    });
    if (errors.length || cases.failures.length)
      throw Error(JSON.stringify({ errors, ...cases }));
    return { reproduction, ...cases, pageErrors: errors };
  } finally {
    page.off("pageerror", onError);
  }
}
