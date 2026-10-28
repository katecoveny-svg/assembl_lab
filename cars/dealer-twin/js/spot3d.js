// The stock spotlight in 3D: the lab's studio car kit (a car of this size and shape, no badges and no brand cues) on a dark stage,
// lit by the lab's studio look. It turns slowly while motion is on, turns by hand when dragged, and repaints on request.
// Rendered on demand: nothing draws while it's still and off screen.
import { buildCarKit } from "./vendor/kit3d.js";
import { studio, carMaterials, maquettePaint } from "./vendor/look3d.js";

export async function mountSpot(canvas, o = {}) {
  const THREE = await import("three");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance", preserveDrawingBuffer: !!o.capture });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, matchMedia("(pointer: coarse)").matches ? 1.5 : 2));
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(26, 1, .1, 100);
  const look = await studio(THREE, renderer, scene, { dark: true });
  renderer.toneMappingExposure = 1.08;
  // a back light on the roofline, so the car separates from the dark stage
  const back = new THREE.DirectionalLight(0xffeef6, 1.4); back.position.set(-5, 4, -6); scene.add(back);
  const kit = buildCarKit(THREE), M = carMaterials(THREE, "#8D9094"), car = new THREE.Group(); scene.add(car);
  const contactMat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: .7, color: 0x000000 });
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), contactMat); contact.rotation.x = -Math.PI / 2; contact.position.y = .003; scene.add(contact);
  let kind = null, yaw = 0, t = 0, paused = !!o.paused, vis = false, raf = 0, last = 0, dirty = 2, drag = null, K = null;
  function setCar(k, paint) {
    k = k in kit.TYPES ? k : k === "wagon" ? "suv" : "suv";
    if (k !== kind) {
      kind = k; K = kit[k]; car.clear();
      for (const p of ["body", "glass", "tyres", "rims", "heads", "tails", "trim", "mirrors"]) { const m = new THREE.Mesh(K[p], M[p === "mirrors" ? "body" : p]); m.castShadow = p !== "glass" && p !== "mirrors"; car.add(m); }
      contactMat.map = K.shadowTex; contactMat.needsUpdate = true; contact.scale.set(K.L + .7, K.W + .7, 1);
      fit();
    }
    if (paint) setPaint(paint);
    dirty = 3; kick();
  }
  function setPaint(hex) { M.setPaint(maquettePaint(THREE, hex)); dirty = 3; kick(); }
  let W = 2, H = 2;
  function fit() { const r = canvas.getBoundingClientRect(); W = Math.max(2, r.width); H = Math.max(2, r.height); renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); place(); dirty = 3; }
  // a front three-quarter view that drifts a little either side; the distance frames the car's length with a margin
  function place() { if (!K) return; const L = K.L, d = Math.max(L * 2.25, (L * .62) / Math.tan((camera.fov * Math.PI) / 360) / Math.min(1, camera.aspect * .9)),
      a = .72 + Math.sin(t * .16) * .32 + yaw;
    camera.position.set(Math.cos(a) * d, d * .36, Math.sin(a) * d); camera.lookAt(0, K.H * .42, 0); }
  addEventListener("resize", fit);
  new IntersectionObserver((es) => { vis = es.some((e) => e.isIntersecting); if (vis) kick(); }).observe(canvas);
  canvas.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: yaw }; canvas.setPointerCapture(e.pointerId); kick(); });
  canvas.addEventListener("pointermove", (e) => { if (!drag) return; yaw = drag.y - (e.clientX - drag.x) * .008; place(); dirty = 2; kick(); });
  const end = () => { drag = null; }; canvas.addEventListener("pointerup", end); canvas.addEventListener("pointercancel", end);
  function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function frame(now) { raf = 0; const dt = Math.min(.05, (now - last) / 1000); last = now; if (!vis) return;
    if (!paused && !drag) { t += dt; place(); dirty = Math.max(dirty, 1); }
    if (dirty > 0) { renderer.render(scene, camera); dirty--; }
    if (!paused || dirty > 0 || drag) kick(); }
  setCar(o.kind || "suv", o.paint);
  return { setCar, setPaint, pause(p) { paused = p; kick(); }, render() { place(); renderer.render(scene, camera); }, fit };
}
