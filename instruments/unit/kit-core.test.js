import test from "node:test";
import assert from "node:assert/strict";
import { rng, encodeState, decodeState, bytesToB64url, b64urlToBytes, contain, exportSize, shade, PALETTES, BACKGROUNDS, A4 } from "../kit/core.js";

test("same seed gives the same random sequence", () => {
  const a = rng(4207), b = rng(4207), c = rng(4208);
  const sa = Array.from({ length: 5 }, a), sb = Array.from({ length: 5 }, b), sc = Array.from({ length: 5 }, c);
  assert.deepEqual(sa, sb);
  assert.notDeepEqual(sa, sc);
  assert.ok(sa.every((v) => v >= 0 && v < 1));
});

test("share link settings round-trip and never carry names or titles", () => {
  const sliders = [{ id: "brush", min: 10, max: 100, value: 45 }];
  const starts = [{ id: "bloom" }, { id: "waves" }];
  const tools = [{ id: "push" }, { id: "paint" }];
  const state = { seed: 777, palette: 4, bg: 1, start: "waves", tool: "paint", values: { brush: 62 }, data: "AQID" };
  const q = encodeState(state, sliders);
  assert.ok(!/title|name/i.test(q));
  const back = decodeState(q, { seed: 1, palette: 0, bg: 0, start: "bloom", tool: "push", values: { brush: 45 } }, sliders, starts, tools);
  assert.equal(back.seed, 777);
  assert.equal(back.palette, 4);
  assert.equal(back.bg, 1);
  assert.equal(back.start, "waves");
  assert.equal(back.tool, "paint");
  assert.equal(back.values.brush, 62);
  assert.equal(back.data, "AQID");
});

test("bad link values are ignored or clamped", () => {
  const sliders = [{ id: "brush", min: 10, max: 100, value: 45 }];
  const back = decodeState("s=-4&p=nope&k=evil&v=brush:900,other:3&d=<script>", { seed: 9, palette: 0, bg: 0, start: "bloom", values: { brush: 45 } }, sliders, [{ id: "bloom" }]);
  assert.equal(back.seed, 9);
  assert.equal(back.palette, 0);
  assert.equal(back.start, "bloom");
  assert.equal(back.values.brush, 100);
  assert.equal(back.values.other, undefined);
  assert.equal(back.data, undefined);
});

test("block data survives base64url", () => {
  const bytes = Uint8Array.from([0, 1, 127, 128, 200, 255, 62, 63]);
  const s = bytesToB64url(bytes);
  assert.match(s, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(Array.from(b64urlToBytes(s)), Array.from(bytes));
});

test("exports keep the picture's shape", () => {
  const e = exportSize(375, 812, 2);
  assert.deepEqual(e, { w: 750, h: 1624 });
  const big = exportSize(3000, 2000, 2, 4096);
  assert.equal(big.w, 4096);
  assert.ok(Math.abs(big.w / big.h - 1.5) < 0.01);
  const fit = contain(375, 812, 2180, 2838);
  assert.ok(fit.w <= 2180 && fit.h <= 2838);
  assert.ok(Math.abs(fit.w / fit.h - 375 / 812) < 0.01);
  assert.deepEqual(A4, { w: 2480, h: 3508, dpi: 300 });
});

test("palettes include the assembl pastel cubes and valid colours", () => {
  assert.deepEqual(PALETTES[0].colours, ["#F6B48E", "#C7B4F0", "#A7DEC7", "#F3A5BE", "#F2DC7C", "#A9C9F2"]);
  for (const p of PALETTES) for (const c of p.colours) assert.match(c, /^#[0-9A-F]{6}$/i);
  assert.equal(BACKGROUNDS[0].colour, "#F8F4EF");
  assert.equal(shade("#000000", 1), "#ffffff");
});
