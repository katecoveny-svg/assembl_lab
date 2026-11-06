// The AI render route: presets, spend confirmation, field allow-list, signed guide uploads. fal.ai is mocked: nothing is spent.
import test from "node:test";
import assert from "node:assert/strict";
import handler, { DEFAULT_ENDPOINTS, shapeInput } from "../../api/plan-render.js";

const call = async (method, { body, query } = {}) => {
  let code = 0, json = null; const res = { status: (c) => ((code = c), res), json: (j) => ((json = j), res) };
  await handler({ method, body, query: query || {} }, res); return { code, json };
};

test("hero clip presets are offered with their estimates, and stay unconfigured without a key", async () => {
  delete process.env.FAL_KEY;
  const { code, json } = await call("GET");
  assert.equal(code, 200); assert.equal(json.configured, false);
  assert.equal(json.endpoints["clip-depth"].id, "fal-ai/wan-vace-14b/depth");
  assert.equal(json.endpoints["clip-still"].id, "fal-ai/minimax/hailuo-02/standard/image-to-video");
  for (const e of Object.values(DEFAULT_ENDPOINTS)) assert.ok(e.est && e.name);
  assert.equal((await call("POST", { body: { preset: "clip-still", input: {}, confirm: true } })).code, 503);
});

test("spending needs confirm, required fields, and only allow-listed fields reach fal", async () => {
  process.env.FAL_KEY = "test"; const sent = [];
  globalThis.fetch = async (url, opt = {}) => { sent.push({ url, body: opt.body && JSON.parse(opt.body) });
    if (url.includes("/storage/upload/initiate")) return { ok: true, json: async () => ({ upload_url: "https://upload.example/x", file_url: "https://v3.fal.media/files/guide.mp4" }) };
    return { ok: true, json: async () => ({ request_id: "abc123" }) }; };
  assert.equal((await call("POST", { body: { preset: "clip-depth", input: { prompt: "p" } } })).code, 402);
  const miss = await call("POST", { body: { preset: "clip-depth", input: { prompt: "p" }, confirm: true } });
  assert.equal(miss.code, 400); assert.deepEqual(miss.json.missing, ["video_url"]);
  const up = await call("POST", { body: { upload: { content_type: "video/mp4", size: 3_000_000 } } });
  assert.equal(up.json.file_url, "https://v3.fal.media/files/guide.mp4");
  assert.equal((await call("POST", { body: { upload: { content_type: "text/html", size: 10 } } })).code, 400);
  const ok = await call("POST", { body: { preset: "clip-depth", input: { prompt: "p", video_url: up.json.file_url, num_inference_steps: 999, enable_safety_checker: false }, confirm: true } });
  assert.equal(ok.code, 202); assert.equal(ok.json.job, "clip-depth:abc123");
  const last = sent.at(-1); assert.match(last.url, /queue\.fal\.run\/fal-ai\/wan-vace-14b\/depth$/);
  assert.deepEqual(Object.keys(last.body).sort(), ["prompt", "video_url"]);
  const still = shapeInput("clip-still", { prompt: "p", image_url: "javascript:alert(1)", duration: "99" });
  assert.equal(still.image_url, undefined); assert.equal(still.duration, "6"); assert.equal(still.prompt_optimizer, false);
  delete process.env.FAL_KEY;
});
