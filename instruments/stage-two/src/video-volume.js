export const VIDEO_LIMITS = Object.freeze({
  bytes: 40 * 1024 * 1024,
  seconds: 12,
  maxDimension: 1920,
  pixels: 1920 * 1080,
  side: 128,
  frames: 64,
});
export function validateVideoMetadata({ duration, width, height }) {
  if (
    !Number.isFinite(duration) ||
    duration <= 0 ||
    duration > VIDEO_LIMITS.seconds
  )
    throw Error("Choose a finite clip no longer than 12 seconds.");
  if (
    !width ||
    !height ||
    Math.max(width, height) > VIDEO_LIMITS.maxDimension ||
    width * height > VIDEO_LIMITS.pixels
  )
    throw Error(
      "Choose a clip up to 1920 pixels on its longest side and 1920 × 1080 pixels in total.",
    );
}
const aborted = () => new DOMException("Import cancelled", "AbortError");
function waitMedia(video, event, signal, action, timeout = 8000) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(aborted());
      return;
    }
    let timer;
    const clean = () => {
      clearTimeout(timer);
      video.removeEventListener(event, done);
      video.removeEventListener("error", error);
      signal.removeEventListener("abort", cancel);
    };
    const done = () => {
        clean();
        resolve();
      },
      error = () => {
        clean();
        reject(
          Error(
            "This clip could not be decoded. Try a different browser-supported video file.",
          ),
        );
      },
      cancel = () => {
        clean();
        reject(aborted());
      };
    video.addEventListener(event, done, { once: true });
    video.addEventListener("error", error, { once: true });
    signal.addEventListener("abort", cancel, { once: true });
    timer = setTimeout(() => {
      clean();
      reject(Error("Video decoding timed out. Try a shorter or smaller clip."));
    }, timeout);
    try {
      action();
    } catch (e) {
      clean();
      reject(e);
    }
  });
}
export async function extractVideoVolume(
  file,
  { signal, onProgress = () => {} },
) {
  if (!file.size || file.size > VIDEO_LIMITS.bytes)
    throw Error("Choose a non-empty video file up to 40 MiB.");
  if (file.type && !file.type.startsWith("video/"))
    throw Error("Choose a video file.");
  const video = document.createElement("video");
  video.preload = "metadata";
  video.muted = true;
  video.playsInline = true;
  const url = URL.createObjectURL(file),
    canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const started = performance.now();
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    video.pause();
    video.removeAttribute("src");
    video.load();
    video.remove();
    canvas.width = canvas.height = 1;
    URL.revokeObjectURL(url);
  };
  // Revoke synchronously on abort: a pagehide may not run async finally callbacks.
  signal.addEventListener("abort", cleanup, { once: true });
  try {
    onProgress(0, "Reading clip…");
    await waitMedia(video, "loadedmetadata", signal, () => {
      video.src = url;
      video.load();
    });
    const metadata = {
      duration: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
    };
    validateVideoMetadata(metadata);
    const data = new Uint8Array(128 * 128 * 64 * 4),
      scale = Math.min(128 / metadata.width, 128 / metadata.height),
      width = metadata.width * scale,
      height = metadata.height * scale,
      x = (128 - width) / 2,
      y = (128 - height) / 2;
    for (let frame = 0; frame < 64; frame++) {
      if (signal.aborted) throw aborted();
      if (performance.now() - started > 60000)
        throw Error(
          "Import exceeded its one-minute limit. Try a smaller clip.",
        );
      const time = Math.min(
        metadata.duration - 0.001,
        (metadata.duration * (frame + 0.5)) / 64,
      );
      await waitMedia(
        video,
        "seeked",
        signal,
        () => (video.currentTime = Math.max(0.000001, time)),
        Math.max(1, Math.min(8000, 60000 - (performance.now() - started))),
      );
      if (video.readyState < 2)
        throw Error(
          "A video frame was interrupted. Your previous sculpture is still available; try importing again.",
        );
      ctx.clearRect(0, 0, 128, 128);
      ctx.drawImage(video, x, y, width, height);
      const pixels = ctx.getImageData(0, 0, 128, 128).data;
      for (let row = 0; row < 128; row++)
        for (let col = 0; col < 128; col++) {
          const src = (row * 128 + col) * 4,
            dest = (frame * 128 * 128 + (127 - row) * 128 + col) * 4;
          data[dest] = pixels[src];
          data[dest + 1] = pixels[src + 1];
          data[dest + 2] = pixels[src + 2];
          data[dest + 3] = Math.round(
            (pixels[src + 3] *
              Math.max(pixels[src], pixels[src + 1], pixels[src + 2])) /
              255,
          );
        }
      onProgress(frame + 1, `Extracting frame ${frame + 1} of 64…`);
      // Yield each frame so cancellation, navigation and input remain responsive.
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    if (signal.aborted) throw aborted();
    return { data, ...metadata };
  } finally {
    signal.removeEventListener("abort", cleanup);
    cleanup();
  }
}
