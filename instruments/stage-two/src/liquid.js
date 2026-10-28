import { Fluid } from "./fluid-solver.js";
export function liquid({
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
}) {
  $("intro").textContent =
    "A pocketful of liquid. Stir it, lift it, let it settle.";
  $("note").textContent = "Experimental 3D particle fluid · 640 particles";
  $("medium").textContent = "3D DENSITY CONSTRAINTS / PARTICLE VIEW";
  $("hint").textContent =
    "Drag to orbit · press Stir, or switch gesture to stir";
  $("explanation").textContent =
    "This small original position-based fluid solver predicts particle motion, finds neighbours in a 3D spatial grid and projects excessive density through three constraint iterations. Gravity, boundaries and damping then update velocity. The particles occupy real x, y and z coordinates. This is an experimental low-resolution particle view, not a continuous water surface or a production fluid solver. It runs on the CPU with Three.js WebGL2 rendering; it does not execute Splash or require WebGPU. There is no 2D texture pretending to be a volume.";
  let fluid = new Fluid(),
    gravity = 5,
    accumulator = 0,
    mode = "orbit",
    dragging = false;
  const mesh = new T.InstancedMesh(
    new T.SphereGeometry(0.065, 10, 7),
    new T.MeshStandardMaterial({
      color: 0x67bbb6,
      roughness: 0.19,
      metalness: 0.25,
    }),
    fluid.n,
  );
  mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
  scene.add(mesh);
  const floor = new T.Mesh(
    new T.PlaneGeometry(2.85, 2.25),
    new T.MeshStandardMaterial({ color: 0xd4d5dd, roughness: 0.8 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.48;
  scene.add(floor);
  const box = new T.LineSegments(
    new T.EdgesGeometry(new T.BoxGeometry(2.85, 2.95, 2.25)),
    new T.LineBasicMaterial({
      color: 0xa7a5bb,
      transparent: true,
      opacity: 0.55,
    }),
  );
  scene.add(box);
  const matrix = new T.Matrix4(),
    colour = new T.Color();
  function draw() {
    for (let i = 0; i < fluid.n; i++) {
      const k = i * 3;
      matrix.makeTranslation(fluid.p[k], fluid.p[k + 1], fluid.p[k + 2]);
      mesh.setMatrixAt(i, matrix);
      colour.setHSL(
        0.46 + (0.12 * (fluid.p[k + 1] + 1.4)) / 2.8,
        0.42,
        0.48 + (0.12 * (fluid.p[k + 2] + 1.05)) / 2.1,
      );
      mesh.setColorAt(i, colour);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }
  draw();
  button("↟ Stir the liquid", () => {
    snapshot();
    fluid.stir(0, 0, 1.4);
  });
  const gesture = button("Gesture: Orbit", () => {
    mode = mode === "orbit" ? "stir" : "orbit";
    orbit.enabled = mode === "orbit";
    gesture.textContent = "Gesture: " + (mode === "orbit" ? "Orbit" : "Stir");
  });
  const gravityUI = range("Gravity", 0, 9, 0.1, gravity, (v) => (gravity = v));
  const pointer = new T.Vector2(),
    ray = new T.Raycaster(),
    plane = new T.Plane(new T.Vector3(0, 1, 0), 0),
    hit = new T.Vector3();
  let lastStir = 0;
  function stir(e) {
    if (performance.now() - lastStir < 40) return;
    lastStir = performance.now();
    const r = canvas.getBoundingClientRect();
    pointer.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      (-(e.clientY - r.top) / r.height) * 2 + 1,
    );
    ray.setFromCamera(pointer, camera);
    if (ray.ray.intersectPlane(plane, hit)) fluid.stir(hit.x, hit.z, 0.5);
  }
  on(canvas, "pointerdown", (e) => {
    if (mode !== "stir") return;
    snapshot();
    dragging = true;
    canvas.setPointerCapture(e.pointerId);
    stir(e);
  });
  on(canvas, "pointermove", (e) => {
    if (dragging) stir(e);
  });
  on(canvas, "pointerup", () => (dragging = false));
  on(canvas, "pointercancel", () => (dragging = false));
  return {
    getState: () => ({ gravity, ...fluid.snapshot() }),
    setState(s) {
      gravity = s.gravity;
      gravityUI(gravity);
      fluid.restore(s);
      draw();
    },
    reset() {
      fluid = new Fluid();
      gravity = 5;
      gravityUI(gravity);
      accumulator = 0;
      draw();
    },
    update(dt) {
      const start = performance.now();
      accumulator = Math.min(accumulator + dt, 0.05);
      let steps = 0;
      while (accumulator >= 1 / 60 && steps < 2) {
        fluid.step(1 / 60, gravity);
        accumulator -= 1 / 60;
        steps++;
      }
      draw();
      $("metrics").textContent =
        `640 PARTICLES · ${(performance.now() - start).toFixed(1)} ms CPU`;
    },
    dispose() {
      fluid = null;
    },
  };
}
