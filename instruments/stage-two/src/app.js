import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { liquid } from "./liquid.js";
import { sonic } from "./sonic.js";
import { timeSculpture } from "./time.js";
const $ = (id) => document.getElementById(id),
  canvas = $("canvas"),
  stage = $("stage");
const abort = new AbortController(),
  on = (el, event, fn) =>
    el.addEventListener(event, fn, { signal: abort.signal });
const status = (text) => ($("status").textContent = text);
let renderer,
  art,
  disposed = false,
  paused = matchMedia("(prefers-reduced-motion: reduce)").matches,
  raf,
  last = 0;
const history = [];
function snapshot() {
  if (!art) return;
  history.push(art.getState());
  if (history.length > 30) history.shift();
  $("undo").disabled = false;
}
function range(name, min, max, step, value, change) {
  const label = document.createElement("label");
  label.className = "control";
  label.textContent = name;
  const out = document.createElement("output");
  out.textContent = value;
  label.append(out);
  const input = document.createElement("input");
  Object.assign(input, { type: "range", min, max, step, value });
  input.setAttribute("aria-label", name);
  label.append(input);
  $("controls").append(label);
  on(input, "pointerdown", snapshot);
  on(input, "keydown", (e) => {
    if (
      e.key.startsWith("Arrow") ||
      ["Home", "End", "PageUp", "PageDown"].includes(e.key)
    )
      snapshot();
  });
  on(input, "input", () => {
    out.textContent = input.value;
    change(+input.value);
  });
  return (v) => {
    input.value = v;
    out.textContent = v;
  };
}
function button(name, fn) {
  const b = document.createElement("button");
  b.textContent = name;
  $("controls").append(b);
  on(b, "click", fn);
  return b;
}
try {
  renderer = new T.WebGLRenderer({
    canvas,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor("#eeece5");
  renderer.outputColorSpace = T.SRGBColorSpace;
  const scene = new T.Scene(),
    camera = new T.PerspectiveCamera(40, 1, 0.1, 60);
  camera.position.set(4, 2.5, 6);
  const orbit = new OrbitControls(camera, canvas);
  orbit.enableDamping = true;
  orbit.minDistance = 3;
  orbit.maxDistance = 12;
  orbit.enablePan = false;
  scene.add(new T.HemisphereLight(0xffffff, 0x77749b, 2.8));
  const light = new T.DirectionalLight(0xffffff, 3);
  light.position.set(3, 5, 4);
  scene.add(light);
  const api = {
    T,
    $,
    canvas,
    scene,
    camera,
    orbit,
    on,
    status,
    range,
    button,
    snapshot,
    renderer,
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    resumeAnimation() {
      paused = false;
      $("freeze").textContent = "Ⅱ Pause";
      $("freeze").setAttribute("aria-pressed", "false");
    },
  };
  art =
    document.body.dataset.instrument === "sonic-loom"
      ? sonic(api)
      : document.body.dataset.instrument === "liquid-playground"
        ? liquid(api)
        : timeSculpture(api);
  art.update(0, 0);
  let dirty = true;
  orbit.addEventListener("change", () => (dirty = true));
  on(document, "input", () => (dirty = true));
  on(document, "click", () => (dirty = true));
  on(document, "keydown", () => (dirty = true));
  const resize = new ResizeObserver(() => {
    const r = stage.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    dirty = true;
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
  });
  resize.observe(stage);
  function frame(now) {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (document.hidden) return;
    if (!paused) art.update(dt, now / 1000);
    orbit.update();
    if (dirty || (!paused && (art.isAnimating?.() ?? true))) {
      renderer.render(scene, camera);
      dirty = false;
    }
  }
  raf = requestAnimationFrame(frame);
  on($("undo"), "click", () => {
    const s = history.pop();
    if (s) {
      art.setState(s);
      art.update(0, last / 1000);
    }
    $("undo").disabled = !history.length;
  });
  on($("reset"), "click", () => {
    snapshot();
    art.reset();
    art.update(0, last / 1000);
    orbit.reset();
  });
  const pause = () => {
    paused = true;
    art.pause?.();
    $("freeze").textContent = "▶ Resume";
    $("freeze").setAttribute("aria-pressed", "true");
  };
  on($("freeze"), "click", () => {
    if (paused) {
      paused = false;
      $("freeze").textContent = "Ⅱ Pause";
      $("freeze").setAttribute("aria-pressed", "false");
    } else pause();
  });
  on(document, "visibilitychange", () => {
    if (document.hidden) pause();
  });
  on(matchMedia("(prefers-reduced-motion: reduce)"), "change", (e) => {
    if (e.matches) pause();
  });
  on(canvas, "keydown", (e) => {
    if (!orbit.enabled) return;
    const rotations = { ArrowLeft: 0.12, ArrowRight: -0.12 };
    if (e.key in rotations) {
      e.preventDefault();
      camera.position.applyAxisAngle(new T.Vector3(0, 1, 0), rotations[e.key]);
    }
    if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      camera.position.multiplyScalar(0.93);
    }
    if (e.key === "-") {
      e.preventDefault();
      camera.position.multiplyScalar(1.07);
    }
    camera.position.clampLength(orbit.minDistance, orbit.maxDistance);
    orbit.update();
  });
  async function blob() {
    renderer.render(scene, camera);
    return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  }
  function download(b) {
    const u = URL.createObjectURL(b),
      a = document.createElement("a");
    a.href = u;
    a.download = document.body.dataset.instrument + ".png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 1000);
  }
  on($("save"), "click", async () => {
    const b = await blob();
    if (b) {
      download(b);
      status("PNG saved locally.");
    }
  });
  const probe = new File([""], "art.png", { type: "image/png" });
  $("share").hidden = !navigator.canShare?.({ files: [probe] });
  on($("share"), "click", async () => {
    try {
      const b = await blob();
      await navigator.share({
        files: [new File([b], "assembl-art.png", { type: "image/png" })],
      });
    } catch (e) {
      status(
        e.name === "AbortError"
          ? "Sharing cancelled."
          : "Sharing unavailable. Save a PNG instead.",
      );
    }
  });
  const printImage = document.createElement("img");
  printImage.className = "print-image";
  printImage.alt = "Your artwork for printing";
  stage.append(printImage);
  const preparePrint = () => {
    renderer.render(scene, camera);
    printImage.src = canvas.toDataURL("image/png");
  };
  on(window, "beforeprint", preparePrint);
  on($("print"), "click", async () => {
    preparePrint();
    await printImage.decode();
    window.print();
  });
  on(canvas, "webglcontextlost", (e) => {
    e.preventDefault();
    pause();
    status("Graphics interrupted. Reload this page to rebuild your artwork.");
  });
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) location.reload();
  });
  on(window, "pagehide", () => {
    disposed = true;
    cancelAnimationFrame(raf);
    resize.disconnect();
    art.dispose();
    orbit.dispose();
    scene.traverse((o) => {
      o.geometry?.dispose();
      if (o.material) {
        for (const m of [o.material].flat()) m.dispose();
      }
    });
    renderer.dispose();
    abort.abort();
  });
  $("loading").hidden = true;
  $("freeze").textContent = paused ? "▶ Resume" : "Ⅱ Pause";
  $("freeze").setAttribute("aria-pressed", String(paused));
  if (paused)
    status(
      "Motion is paused for your reduced-motion preference. Resume when ready.",
    );
} catch (e) {
  $("loading").textContent =
    "This instrument needs WebGL2. Try a current browser with hardware graphics enabled.";
  status(e.message);
  renderer?.dispose();
}
