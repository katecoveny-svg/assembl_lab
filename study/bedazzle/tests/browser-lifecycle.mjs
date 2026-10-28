// Playwright CLI: run-code --filename study/bedazzle/tests/browser-lifecycle.mjs
async function lifecycle(page) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    window.__buffers = new Set();
    const p = WebGL2RenderingContext.prototype,
      create = p.createBuffer,
      remove = p.deleteBuffer;
    p.createBuffer = function (...args) {
      const b = create.apply(this, args);
      window.__buffers.add(b);
      return b;
    };
    p.deleteBuffer = function (b) {
      window.__buffers.delete(b);
      return remove.call(this, b);
    };
  });
  // Test-only inspection hook; no diagnostics are exposed by the shipped module.
  await page.route("**/bedazzle/studio.js", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body:
        (await response.text()) +
        `
      window.__inspect=()=>({width:renderer.domElement.width,height:renderer.domElement.height,dpr:renderer.getPixelRatio(),aspect:camera.aspect,memory:{...renderer.info.memory},buffers:window.__buffers.size});
      window.__disposedInstances=0;
      const originalDispose=THREE.InstancedMesh.prototype.dispose;
      THREE.InstancedMesh.prototype.dispose=function(){window.__disposedInstances++;return originalDispose.call(this);};
    `,
    });
  });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.reload();
  await page.locator("#view canvas").waitFor();
  await page.locator("summary").click();
  const exports = await page.evaluate(() => {
    const original = HTMLCanvasElement.prototype.toBlob;
    window.__encodes = [];
    HTMLCanvasElement.prototype.toBlob = function (callback, ...args) {
      window.__encodes.push({ canvas: this, callback, args });
    };
    Object.defineProperty(navigator, "canShare", {
      value: () => false,
      configurable: true,
    });
    const before = window.__inspect();
    document.querySelector("#aspect").value = "portrait";
    document.querySelector("#export").click();
    const first = window.__inspect();
    document.querySelector("#aspect").value = "landscape";
    document.querySelector("#share").click();
    const second = window.__inspect();
    document.querySelector("#aspect").value = "square";
    document.querySelector("#print").click();
    const third = window.__inspect();
    window.__finishEncodes = () => {
      HTMLCanvasElement.prototype.toBlob = original;
      const jobs = window.__encodes;
      // Finish out of order, including a failed encoding.
      original.call(jobs[2].canvas, jobs[2].callback, ...jobs[2].args);
      jobs[0].callback(null);
      original.call(jobs[1].canvas, jobs[1].callback, ...jobs[1].args);
    };
    return { before, first, second, third, pending: window.__encodes.length };
  });
  if (exports.pending !== 3) throw Error("Expected three overlapping encodes");
  for (const key of ["first", "second", "third"])
    for (const field of ["width", "height", "dpr", "aspect"])
      if (exports[key][field] !== exports.before[field])
        throw Error(`Live ${field} changed while ${key} encoding pending`);
  await page.setViewportSize({ width: 980, height: 850 });
  await page.waitForFunction(
    () =>
      Math.abs(
        window.__inspect().aspect -
          document.querySelector("#view").getBoundingClientRect().width /
            document.querySelector("#view").getBoundingClientRect().height,
      ) < 1e-8,
  );
  const resized = await page.evaluate(() => window.__inspect());
  const downloaded = page.waitForEvent("download");
  await page.evaluate(() => window.__finishEncodes());
  const file = await downloaded;
  await file.saveAs("/tmp/bedazzle-overlapping-export.png");
  await page.locator("dialog img").waitFor();
  await page.getByRole("button", { name: "Close print preview" }).click();
  const after = await page.evaluate(() => window.__inspect());
  for (const field of ["width", "height", "dpr", "aspect"])
    if (resized[field] !== after[field])
      throw Error(`Late encoding corrupted ${field}`);
  // A standalone failed encoding must report the error and preserve the live view.
  await page.evaluate(() => {
    const original = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (cb) {
      HTMLCanvasElement.prototype.toBlob = original;
      setTimeout(() => cb(null), 0);
    };
    document.querySelector("#export").click();
  });
  await page.waitForFunction(
    () =>
      document.querySelector("#status").textContent === "Image export failed.",
  );
  const failed = await page.evaluate(() => window.__inspect());
  for (const field of ["width", "height", "dpr", "aspect"])
    if (failed[field] !== after[field])
      throw Error(`Failed encoding corrupted ${field}`);
  const stone = {
    x: 0,
    y: 0,
    size: 0.16,
    shape: "marquise",
    color: "#cf9aff",
    finish: "crystal",
  };
  await page
    .locator("#load")
    .setInputFiles({
      name: "overlap.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          version: 1,
          mode: "board",
          stones: [stone, { ...stone, y: 0.44 }],
        }),
      ),
    });
  await page.waitForFunction(() =>
    document.querySelector("#status").textContent.includes("overlapping"),
  );
  const rejected = await page.locator("#status").innerText();
  const project = {
    name: "valid.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        version: 1,
        mode: "brush",
        stones: [stone, { ...stone, y: 0.5 }],
      }),
    ),
  };
  async function load() {
    await page.locator("#load").setInputFiles(project);
    await page.waitForFunction(
      () =>
        document.querySelector("#load").value === "" &&
        document
          .querySelector("#status")
          .textContent.includes("Project loaded"),
    );
  }
  await load();
  const baseline = await page.evaluate(() => window.__inspect());
  for (let i = 0; i < 20; i++) {
    await page.locator("#reset").click();
    await page.locator("#undo").click();
    await page.locator("#redo").click();
    await load();
  }
  const final = await page.evaluate(() => ({
    ...window.__inspect(),
    disposedInstances: window.__disposedInstances,
  }));
  if (
    final.buffers > baseline.buffers ||
    JSON.stringify(final.memory) !== JSON.stringify(baseline.memory)
  )
    throw Error(JSON.stringify({ baseline, final }));
  if (final.disposedInstances < 80)
    throw Error("Instance disposal hooks were not called");
  if (errors.length) throw Error(JSON.stringify(errors));
  await page.unroute("**/bedazzle/studio.js");
  return {
    pendingExports: exports.pending,
    liveBefore: exports.before,
    liveAfterResize: after,
    failedEncoding: "reported without state corruption",
    overlap: rejected,
    baseline,
    final,
    pageErrors: errors,
  };
}
