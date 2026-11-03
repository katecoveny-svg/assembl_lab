// The stock spotlight in 3D: the selected listing's GENERIC body (assets/models/vehicles/<body>.glb, Blender-scripted, unbranded)
// in the listing's paint, on a chalk stage. Only the selected car's GLB is ever fetched, and only after a car is opened.
// The contract is checked before anything is shown; a wrong contract, a missing node or a failed load leaves the offline still.
// It turns slowly while motion is on, turns by hand when dragged, and renders on demand (nothing draws while still or off screen).
// It owns no listing data: stock.js says which body and which paint.
import { createVehicleRig, checkContract, paintForColour } from "/assets/models/vehicles/vehicles-rig-controller.mjs";

const BASE = "/assets/models/vehicles/";
let contractP = null;
export const loadContract = () => (contractP ||= fetch(BASE + "vehicles-rig-contract.json").then((r) => { if (!r.ok) throw new Error("contract " + r.status); return r.json(); }).then((c) => checkContract(c)));

export function webglOK() {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; }
}

export async function mountVehicle(canvas, o = {}) {
  const [THREE, { GLTFLoader }, { RoomEnvironment }, contract] = await Promise.all([import("three"), import("three/addons/loaders/GLTFLoader.js"),
    import("three/addons/environments/RoomEnvironment.js"), loadContract()]);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: !!o.capture });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, matchMedia("(pointer: coarse)").matches ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(24, 1, .1, 100);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  const key = new THREE.DirectionalLight(0xffffff, 1.2); key.position.set(4, 6, 3); scene.add(key);
  // soft contact shadow: a radial gradient under the car (no real-time shadow maps; honest and cheap)
  const g = document.createElement("canvas"); g.width = g.height = 128; const cx = g.getContext("2d");
  const grad = cx.createRadialGradient(64, 64, 4, 64, 64, 64); grad.addColorStop(0, "rgba(36,11,33,.42)"); grad.addColorStop(1, "rgba(36,11,33,0)");
  cx.fillStyle = grad; cx.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(g), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = .002; scene.add(shadow);
  const loader = new GLTFLoader(), cache = new Map();
  let car = null, rig = null, body = null, paint = null, yaw = 0, t = 0, paused = !!o.paused, vis = true, raf = 0, last = 0, dirty = 2, drag = null, dims = null, token = 0;

  async function setCar(b, colourOrPaint) {
    checkContract(contract, b);
    const p = contract.paints[colourOrPaint] ? colourOrPaint : paintForColour(contract, colourOrPaint);
    if (b === body && rig) { rig.setPaint(p); paint = p; dirty = 3; kick(); return rig; }
    const my = ++token;
    if (!cache.has(b)) cache.set(b, loader.loadAsync(BASE + contract.vehicles[b].file));
    const gltf = await cache.get(b);
    if (my !== token) return null;                       // a newer pick won
    const root = gltf.scene.getObjectByName("VEHICLE_ROOT") ? gltf.scene : null;
    if (!root) throw new Error("vehicle model has no VEHICLE_ROOT");
    const r = createVehicleRig(root, contract);
    if (car) scene.remove(car);
    car = root; rig = r; body = b; dims = contract.vehicles[b].dimensions_m;
    rig.setPaint(p); paint = p; rig.setYaw(yaw);
    scene.add(car);
    shadow.scale.set(dims.length * 1.25, dims.width * 1.5, 1);
    fit(); dirty = 3; kick();
    return rig;
  }
  let W = 2, H = 2;
  function fit() { const r = canvas.getBoundingClientRect(); W = Math.max(2, r.width); H = Math.max(2, r.height); renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); place(); dirty = 3; kick(); }
  // a front three-quarter view; one camera distance for every body (the longest), so a ute stays bigger than a hatch
  function place() {
    // about 6.4 m of floor across the frame: the 5.33 m ute nearly fills it, the 4.05 m hatch reads smaller, as it is
    const d = 3.2 / (Math.tan((camera.fov * Math.PI) / 360) * Math.max(camera.aspect, .9)), a = -.62;
    camera.position.set(Math.cos(a) * d, d * .2, -Math.sin(a) * d);   // +X nose, +Z right side: the front-right three-quarter, as in the stills
    camera.lookAt(0, (dims ? dims.height : 1.5) * .42, 0);
  }
  addEventListener("resize", fit);
  const io = new IntersectionObserver((es) => { vis = es.some((e) => e.isIntersecting); if (vis) kick(); }); io.observe(canvas);
  canvas.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: yaw }; canvas.setPointerCapture(e.pointerId); kick(); });
  canvas.addEventListener("pointermove", (e) => { if (!drag) return; yaw = drag.y + (e.clientX - drag.x) * .008; if (rig) rig.setYaw(yaw); dirty = 2; kick(); });
  const end = () => { drag = null; }; canvas.addEventListener("pointerup", end); canvas.addEventListener("pointercancel", end);
  function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function frame(now) {
    raf = 0; const dt = Math.min(.05, (now - last) / 1000); last = now; if (!vis) return;
    if (!paused && !drag && rig) { yaw += dt * .22; rig.setYaw(yaw); dirty = Math.max(dirty, 1); }
    if (dirty > 0) { place(); renderer.render(scene, camera); dirty--; }
    if ((!paused && rig) || dirty > 0 || drag) kick();
  }
  return {
    setCar, fit,
    pause(p) { paused = p; kick(); },
    resetView() { yaw = 0; if (rig) rig.reset(); dirty = 3; kick(); },
    get state() { return { body, paint, yaw, paused }; },
    get rig() { return rig; },
    render() { place(); renderer.render(scene, camera); },
    dispose() { io.disconnect(); removeEventListener("resize", fit); renderer.dispose(); },
  };
}
