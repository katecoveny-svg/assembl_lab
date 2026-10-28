import { createFrameClock } from "./frame-clock.js";
import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { $, light } from "./app.js";
export { T };
export function studio({ antialias = true } = {}) {
  const canvas = $("#canvas");
  const renderer = new T.WebGLRenderer({
    canvas,
    antialias: antialias && !light,
    preserveDrawingBuffer: true,
    alpha: false,
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, light ? 1.25 : 1.75));
  renderer.setClearColor(0xe9e6ee);
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  const scene = new T.Scene(),
    camera = new T.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(3, 2.2, 6.5);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0.1, 0);
  controls.enableDamping = true;
  controls.minDistance = 3.7;
  controls.maxDistance = 11;
  controls.maxPolarAngle = Math.PI * 0.85;
  const pmrem = new T.PMREMGenerator(renderer),
    room = new RoomEnvironment();
  const env = pmrem.fromScene(room, 0.04);
  scene.environment = env.texture;
  room.dispose();
  pmrem.dispose();
  scene.add(new T.HemisphereLight(0xffffff, 0x72657d, 1));
  const sun = new T.DirectionalLight(0xfff4e1, 2);
  sun.position.set(3, 6, 4);
  scene.add(sun);
  const base = new T.Mesh(
    new T.CylinderGeometry(2.35, 2.35, 0.09, 80),
    new T.MeshStandardMaterial({ color: 0xf7f3ec, roughness: 0.65 }),
  );
  base.position.y = -1.48;
  scene.add(base);
  const ring = new T.Mesh(
    new T.TorusGeometry(2.38, 0.008, 6, 100),
    new T.MeshBasicMaterial({ color: 0xaaa0bb }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -1.42;
  scene.add(ring);
  const resize = () => {
    const box = canvas.parentElement.getBoundingClientRect();
    renderer.setSize(box.width, box.height, false);
    camera.aspect = box.width / box.height;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(canvas.parentElement);
  resize();
  const ray = new T.Raycaster();
  const pointer = new T.Vector2();
  const point = (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      (-(e.clientY - r.top) / r.height) * 2 + 1,
    );
    ray.setFromCamera(pointer, camera);
    const plane = new T.Plane().setFromNormalAndCoplanarPoint(
      camera.getWorldDirection(new T.Vector3()),
      new T.Vector3(),
    );
    return ray.ray.intersectPlane(plane, new T.Vector3());
  };
  let frozen = false,
    visible = true;
  const clock = createFrameClock(performance.now());
  function loop(t) {
    if (visible) {
      const { simulationSeconds } = clock.tick(t);
      if (!frozen) api.update?.(simulationSeconds, t / 1000);
      controls.update();
      renderer.render(scene, camera);
    }
    requestAnimationFrame(loop);
  }
  const api = {
    renderer,
    scene,
    camera,
    controls,
    canvas,
    point,
    ray,
    freeze(v) {
      frozen = v;
    },
    visible(v) {
      visible = v;
      clock.reset(performance.now());
    },
    render() {
      renderer.render(scene, camera);
    },
    fps: () => clock.fps(),
  };
  requestAnimationFrame(loop);
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    $("#loading").hidden = false;
    $("#loading").innerHTML =
      'The graphics context was lost.<br><a href="?mode=light">Restart in lighter mode</a> · <a href="?mode=2d">2D study</a>';
  });
  canvas.addEventListener("keydown", (e) => {
    if (e.key.startsWith("Arrow")) {
      e.preventDefault();
      const d = e.key === "ArrowLeft" ? -0.1 : e.key === "ArrowRight" ? 0.1 : 0;
      camera.position.applyAxisAngle(new T.Vector3(0, 1, 0), d);
      camera.position.y +=
        e.key === "ArrowUp" ? 0.2 : e.key === "ArrowDown" ? -0.2 : 0;
      controls.update();
    }
  });
  return api;
}
export function drag(studio, handlers) {
  let active = null;
  studio.canvas.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || handlers.orbit()) return;
    active = e.pointerId;
    studio.controls.enabled = false;
    studio.canvas.setPointerCapture(e.pointerId);
    handlers.start(studio.point(e), e);
  });
  studio.canvas.addEventListener("pointermove", (e) => {
    if (e.pointerId === active) handlers.move(studio.point(e), e);
  });
  const end = (e) => {
    if (e.pointerId === active) {
      handlers.end?.();
      active = null;
      studio.controls.enabled = true;
    }
  };
  studio.canvas.addEventListener("pointerup", end);
  studio.canvas.addEventListener("pointercancel", end);
  studio.canvas.addEventListener("lostpointercapture", end);
}
