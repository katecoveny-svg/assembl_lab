import { $, choices, range, history } from "./app.js";
export async function start(kind) {
  $("#intro").textContent =
    "A lighter, two-dimensional colour study. Drag to reshape it.";
  $("#note").textContent =
    "This browser is using the 2D study. Gaussian rendering, soft-body physics and solid mesh export require the 3D version.";
  $("#medium").textContent = "2D STUDY / CANVAS FALLBACK";
  $("#hint").textContent = "Drag to stretch the drawing";
  $("#explanation").textContent =
    "This is an interactive 2D drawing fallback, not Gaussian splatting, soft-body physics or solid geometry. Save and share produce PNG stills. Try the 3D version on a WebGL2 and WebAssembly capable browser.";
  const canvas = $("#canvas"),
    ctx = canvas.getContext("2d");
  let points = [],
    down = false,
    mode = "pull",
    frozen = false;
  const resize = () => {
    const r = canvas.parentElement.getBoundingClientRect();
    canvas.width = r.width * Math.min(devicePixelRatio, 1.5);
    canvas.height = r.height * Math.min(devicePixelRatio, 1.5);
    draw();
  };
  function init() {
    points = Array.from({ length: 400 }, (_, i) => {
      const a = (i / 400) * Math.PI * 2;
      return {
        x: 0.5 + Math.cos(a) * (0.22 + 0.035 * Math.sin(a * 5)),
        y: 0.5 + Math.sin(a) * (0.22 + 0.035 * Math.sin(a * 5)),
      };
    });
    draw();
  }
  function draw() {
    const w = canvas.width,
      h = canvas.height;
    ctx.fillStyle = "#e9e6ee";
    ctx.fillRect(0, 0, w, h);
    const g = ctx.createLinearGradient(w * 0.3, h * 0.2, w * 0.7, h * 0.8);
    g.addColorStop(0, "#aca0df");
    g.addColorStop(0.55, "#ec7e96");
    g.addColorStop(1, "#f7e7a6");
    ctx.beginPath();
    points.forEach((p, i) =>
      i ? ctx.lineTo(p.x * w, p.y * h) : ctx.moveTo(p.x * w, p.y * h),
    );
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "#ffffff99";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.5, w * 0.09, h * 0.09, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#e9e6ee";
    ctx.fill();
  }
  const h = history(
    () => structuredClone(points),
    (p) => {
      points = p;
      draw();
    },
  );
  h.install();
  choices(
    "Try a gesture",
    [
      ["pull", "Pull"],
      ["push", "Push"],
    ],
    mode,
    (v) => (mode = v),
  );
  let radius = 0.2;
  range("Reach", 0.1, 0.4, radius, 0.01, (v) => (radius = v));
  const link = document.createElement("a");
  link.href = "?mode=light";
  link.textContent = "Try the 3D version →";
  $("#controls").append(link);
  let last;
  canvas.onpointerdown = (e) => {
    if (frozen) return;
    h.push();
    down = true;
    canvas.setPointerCapture(e.pointerId);
    last = {
      x: e.offsetX / canvas.clientWidth,
      y: e.offsetY / canvas.clientHeight,
    };
  };
  canvas.onpointermove = (e) => {
    if (!down || frozen) return;
    const p = {
      x: e.offsetX / canvas.clientWidth,
      y: e.offsetY / canvas.clientHeight,
    };
    points.forEach((q) => {
      const d = Math.hypot(q.x - last.x, q.y - last.y),
        v = Math.max(0, 1 - d / radius);
      q.x += (p.x - last.x) * v * (mode === "push" ? -1 : 1);
      q.y += (p.y - last.y) * v * (mode === "push" ? -1 : 1);
    });
    last = p;
    draw();
  };
  canvas.onpointerup = canvas.onpointercancel = () => (down = false);
  new ResizeObserver(resize).observe(canvas.parentElement);
  init();
  resize();
  return {
    backend: "canvas2d-study",
    reset() {
      h.push();
      init();
    },
    freeze(v) {
      frozen = v;
    },
    render: draw,
    stats: () => ({ points: points.length }),
    capture: () => points,
  };
}
