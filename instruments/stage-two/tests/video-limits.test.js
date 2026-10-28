import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateVideoMetadata,
  extractVideoVolume,
} from "../src/video-volume.js";
test("video metadata bounds permit portrait/landscape and reject oversized/unbounded sources", () => {
  for (const [width, height] of [
    [1920, 1080],
    [1080, 1920],
    [160, 90],
  ])
    assert.doesNotThrow(() =>
      validateVideoMetadata({ width, height, duration: 12 }),
    );
  for (const m of [
    { width: 1921, height: 1080, duration: 1 },
    { width: 1920, height: 1920, duration: 1 },
    { width: 160, height: 90, duration: 12.01 },
    { width: 160, height: 90, duration: Infinity },
    { width: 0, height: 0, duration: 1 },
  ])
    assert.throws(() => validateVideoMetadata(m));
});

test("file size and non-video type are rejected before allocating DOM or object URLs", async () => {
  const options = { signal: new AbortController().signal };
  for (const file of [
    { size: 0, type: "video/webm" },
    { size: 40 * 1024 * 1024 + 1, type: "video/webm" },
    { size: 100, type: "text/plain" },
  ])
    await assert.rejects(extractVideoVolume(file, options));
});
