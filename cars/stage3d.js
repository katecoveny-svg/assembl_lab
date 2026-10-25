// The hero: one stylised car on paper, with the real parts each notice field describes. Renders only when something changes
// (a beat turns the car, the stage resizes): there is no idle loop and no decorative motion.
// createStage(canvas, car, { reduced }) → { ready, setBeat(i) → Promise, anchors() → [{ id, x, y, visible }], snapshot(opts) → dataURL, resize() }
import * as THREE from "three";
import { buildCarKit } from "./kit3d.js";

// where the car turns for each beat (radians about y; the camera sits off the front-right quarter, so +yaw shows the driver's side and rear)
export const YAW = [0.18, -0.30, -0.42, -0.36, -0.52, 0.62, 1.18, 2.15, 0.30];
// and where it slides within the stage (fraction of the width) to make room for the labels: front fields label on the right, rear ones on the left
export const SHIFT = [0, 0.02, 0.02, 0.02, 0.02, -0.02, -0.02, -0.02, 0];

function canvasTex(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d"); draw(x, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const rr = (x, a, b, w, h, r) => { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); };
const MONO = '"IBM Plex Mono", ui-monospace, monospace', SANS = '"Instrument Sans", system-ui, sans-serif';

export async function createStage(canvas, car, opts = {}) {
  const reduced = !!opts.reduced;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(24, 1, 0.1, 100);
  try { const { RoomEnvironment } = await import("three/addons/environments/RoomEnvironment.js"); const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.8; pm.dispose(); } catch (e) { /* reflections are optional */ }
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcdbfc5, 0.85));
  const sun = new THREE.DirectionalLight(0xfff6ee, 2.4); sun.position.set(3.5, 7.5, 4.5); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 20 }); sun.shadow.radius = 6; sun.shadow.bias = -0.0005; scene.add(sun);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.13, color: 0x240b21 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  const kit = buildCarKit(THREE), kind = car.render.kind in kit.TYPES ? car.render.kind : "suv", K = kit[kind], T = K.T;
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(K.L + 0.7, K.W + 0.7), new THREE.MeshBasicMaterial({ map: kit.shadowTex, transparent: true, depthWrite: false, opacity: 0.42, color: 0x240b21 }));
  contact.rotation.x = -Math.PI / 2; contact.position.y = 0.004; scene.add(contact);
  const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: new THREE.Color(c), ...o });
  const MAT = {
    body: new THREE.MeshPhysicalMaterial({ color: new THREE.Color(car.render.paint), roughness: 0.42, metalness: 0.1, clearcoat: 0.6, clearcoatRoughness: 0.3, envMapIntensity: 0.4 }),
    glass: new THREE.MeshPhysicalMaterial({ color: new THREE.Color("#2B2530"), roughness: 0.06, metalness: 0.25, transparent: true, opacity: 0.74, envMapIntensity: 1.3, side: THREE.DoubleSide }),
    tyres: std("#2A2628", { roughness: 0.92 }), rims: std("#C3C6CA", { roughness: 0.3, metalness: 0.75 }), trim: std("#3D3638", { roughness: 0.75 }),
    heads: std("#F4F1E8", { emissive: new THREE.Color("#FFF6E2"), emissiveIntensity: 0.25, roughness: 0.3 }), tails: std("#B5453E", { emissive: new THREE.Color("#B4443F"), emissiveIntensity: 0.15, roughness: 0.4 }),
  };
  const carG = new THREE.Group(); scene.add(carG);
  for (const p of ["body", "glass", "tyres", "rims", "heads", "tails", "trim"]) { const m = new THREE.Mesh(K[p], MAT[p]); m.castShadow = p !== "glass"; m.receiveShadow = true; if (p === "glass") m.renderOrder = 2; carG.add(m); }

  // ---- the parts the notice talks about -----------------------------------------------------------------------------
  // opts.bare skips them (and the pins' anchors) for a clean studio render of the car alone: src/cars/_build/render-cars.mjs
  const ANCH = opts.bare ? {} : await noticeParts();
  async function noticeParts() {
  if (document.fonts && document.fonts.ready) { try { await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]); } catch (e) { /* draw with fallbacks */ } }
  const [g0, g1] = T.glass, y0 = T.belt + 0.012, y1 = T.roof - 0.03, dx = g1 - g0, dy = y1 - y0, len = Math.hypot(dx, dy);
  const wsN = new THREE.Vector3(dy / len, -dx / len, 0); // windscreen outward normal (forward and up)
  const onScreen = (t, z, off) => K.map(g0 + dx * t, y0 + dy * t, z).add(wsN.clone().multiplyScalar(off));
  const wsQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), wsN.clone().normalize());
  const decal = (tex, w, h, pos, quat, o = {}) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.6, ...o })); m.position.copy(pos); m.quaternion.copy(quat); carG.add(m); return m; };
  const km = car.odometerKm.toLocaleString("en-NZ"), fmtYM = (d) => d.slice(5, 7) + "·" + d.slice(2, 4);
  // odometer: the instrument display, seen through the windscreen on the driver's side (+z)
  decal(canvasTex(256, 72, (x, w, h) => { rr(x, 2, 2, w - 4, h - 4, 14); x.fillStyle = "#1E1A1D"; x.fill(); x.fillStyle = "#F5E9D8"; x.font = `500 30px ${MONO}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(km + " km", w / 2, h / 2 + 1); }),
    0.30, 0.085, onScreen(0.09, 0.40, 0.03), wsQuat, { emissive: new THREE.Color("#F5E9D8"), emissiveIntensity: 0.35, depthWrite: true }).renderOrder = 1;
  // WOF and licence labels, passenger-side corner of the windscreen
  const label = (top, big, small, bg) => canvasTex(128, 128, (x, w, h) => { rr(x, 4, 4, w - 8, h - 8, 10); x.fillStyle = bg; x.fill(); x.strokeStyle = "#240B2155"; x.lineWidth = 3; x.stroke();
    x.fillStyle = "#240B21"; x.textAlign = "center"; x.font = `600 20px ${MONO}`; x.fillText(top, w / 2, 34); x.font = `700 40px ${SANS}`; x.fillText(big, w / 2, 80); x.font = `500 16px ${MONO}`; x.fillText(small, w / 2, 108); });
  const wofT = car.cin["wof.expiry"].value, licT = car.cin["licence.expiry"].value;
  decal(label("WOF", fmtYM(wofT), "EXPIRES", "#F5F1F2"), 0.1, 0.1, onScreen(0.12, -0.6, 0.074), wsQuat);
  decal(label("LICENCE", fmtYM(licT), "EXPIRES", "#E9DDE1"), 0.1, 0.1, onScreen(0.12, -0.47, 0.074), wsQuat);
  // the dealer's price sticker
  decal(canvasTex(320, 190, (x, w, h) => { rr(x, 3, 3, w - 6, h - 6, 12); x.fillStyle = "#FFFDFB"; x.fill(); x.strokeStyle = "#240B2140"; x.lineWidth = 3; x.stroke();
    x.fillStyle = "#916A70"; x.font = `500 17px ${MONO}`; x.fillText("CASH PRICE", 22, 40); x.fillStyle = "#240B21"; x.font = `600 62px ${SANS}`; x.fillText("$" + car.priceNzd.toLocaleString("en-NZ"), 20, 108);
    x.fillStyle = "#654A4E"; x.font = `500 16px ${MONO}`; x.fillText("INCL. GST + ON-ROAD", 22, 142); x.fillStyle = "#916A70"; x.fillText("SIMULATED", 22, 168); }),
    0.34, 0.2, onScreen(0.24, -0.1, 0.075), wsQuat);
  // the key, lying on the bonnet, with a paper tag that says whether money is owing (a lien)
  const bx = T.top[3][0] + (T.top[2][0] - T.top[3][0]) * 0.38, by = T.top[3][1] + (T.top[2][1] - T.top[3][1]) * 0.38, bonnet = K.map(bx, by, 0);
  const slope = Math.atan2(T.top[2][1] - T.top[3][1], (T.top[2][0] - T.top[3][0]) * (K.map(1, 0, 0).x - K.map(0, 0, 0).x));
  const keyG = new THREE.Group(); keyG.position.set(bonnet.x, bonnet.y + 0.055, 0.18); keyG.rotation.z = slope; carG.add(keyG);
  const fob = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.028, 0.055), std("#262123", { roughness: 0.45, metalness: 0.2 })); fob.castShadow = true; keyG.add(fob);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 8, 24), std("#C3C6CA", { metalness: 0.8, roughness: 0.25 })); ring.rotation.x = Math.PI / 2; ring.position.set(0.075, 0, 0); keyG.add(ring);
  const si = car.cin["securityInterest.registered"].value;
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.11), new THREE.MeshStandardMaterial({ map: canvasTex(256, 140, (x, w, h) => {
    rr(x, 3, 3, w - 6, h - 6, 10); x.fillStyle = "#F7EFE6"; x.fill(); x.strokeStyle = "#916A70"; x.lineWidth = 3; x.stroke(); x.beginPath(); x.arc(28, h / 2, 9, 0, 7); x.fillStyle = "#916A70"; x.fill();
    x.fillStyle = "#240B21"; x.font = `600 22px ${MONO}`; x.fillText("MONEY OWING", 52, 56); x.font = `600 34px ${SANS}`; x.fillText(si === "no" ? "None stated" : si === "yes" ? "Registered" : "Unknown", 52, 100); }), transparent: true, roughness: 0.8, side: THREE.DoubleSide }));
  tag.rotation.x = -Math.PI / 2; tag.position.set(0.2, -0.008, 0.05); tag.rotation.z = -0.25; keyG.add(tag);
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.12, 6), std("#A0726F")); string.rotation.z = Math.PI / 2; string.rotation.y = 0.5; string.position.set(0.12, -0.005, 0.03); keyG.add(string);
  // safety stars on the driver's door
  const doorZ = T.W / 2 + 0.012, door = K.map((T.wf + T.wb) / 2 + 0.15, T.bot + (T.belt - T.bot) * 0.55, doorZ);
  decal(canvasTex(300, 70, (x, w, h) => { rr(x, 2, 2, w - 4, h - 4, 33); x.fillStyle = "#FFFDFBE6"; x.fill();
    for (let i = 0; i < 5; i++) { const cx = 38 + i * 56, cy = h / 2, R = 20, r = 8.5; x.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, q = k % 2 ? r : R; x.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q); } x.closePath(); x.fillStyle = i < car.safety.stars ? "#240B21" : "#240B2130"; x.fill(); } }),
    0.5, 0.117, door, new THREE.Quaternion());
  // fuel filler flap, driver's-side rear quarter
  const fx = T.wb - (T.wr + 0.08) - 0.12, filler = K.map(fx, T.belt - 0.16, doorZ - 0.004);
  const flap = new THREE.Mesh(new THREE.CircleGeometry(0.075, 32), new THREE.MeshPhysicalMaterial({ color: new THREE.Color(car.render.paint).multiplyScalar(0.86), roughness: 0.4, clearcoat: 0.6 })); flap.position.copy(filler); carG.add(flap);
  const rim = new THREE.Mesh(new THREE.RingGeometry(0.075, 0.084, 32), std("#240B21", { roughness: 0.6, transparent: true, opacity: 0.45 })); rim.position.copy(filler).add(new THREE.Vector3(0, 0, 0.001)); carG.add(rim);
  // the import origin: a small flag on the tailgate
  const imp = car.cin["import.countryLastRegistered"].value, flagBase = K.map(T.glass[3] + 0.06, T.roof - 0.06, 0.52);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.42, 8), std("#3D3638", { metalness: 0.6, roughness: 0.4 })); mast.position.copy(flagBase).add(new THREE.Vector3(0, 0.21, 0)); mast.castShadow = true; carG.add(mast);
  const flagM = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.19), new THREE.MeshStandardMaterial({ map: canvasTex(240, 152, (x, w, h) => { x.fillStyle = "#FFFDFB"; x.fillRect(0, 0, w, h); x.fillStyle = "#916A70"; x.fillRect(0, 0, 10, h);
    x.fillStyle = "#240B21"; x.font = `600 46px ${SANS}`; x.fillText(imp ? ({ Japan: "JP", "United Kingdom": "GB", Australia: "AU", Singapore: "SG", "United States": "US" }[imp] || imp.slice(0, 2).toUpperCase()) : "NZ", 30, 70); x.font = `500 24px ${MONO}`; x.fillStyle = "#654A4E"; x.fillText(imp ? "FIRST REG " + car.cin["import.yearFirstRegisteredOverseas"].value : "NZ-NEW", 30, 118); }), side: THREE.DoubleSide, roughness: 0.7 }));
  flagM.rotation.y = 0.7; flagM.position.copy(flagBase).add(new THREE.Vector3(-0.155 * Math.cos(0.7), 0.33, 0.155 * Math.sin(0.7))); flagM.castShadow = true; carG.add(flagM);

  // anchor points (car space) + outward normals, for the pins
  return {
    dash: [onScreen(0.09, 0.40, 0.07), wsN], labels: [onScreen(0.12, -0.54, 0.075), wsN], sticker: [onScreen(0.24, -0.1, 0.076), wsN],
    tag: [new THREE.Vector3(keyG.position.x + 0.2, keyG.position.y, 0.23), new THREE.Vector3(0, 1, 0)], door: [door.clone().add(new THREE.Vector3(0, 0, 0.01)), new THREE.Vector3(0, 0, 1)],
    filler: [filler.clone().add(new THREE.Vector3(0, 0, 0.01)), new THREE.Vector3(0, 0, 1)], flag: [flagM.position.clone(), new THREE.Vector3(0, 1, 0)],
  };
  }

  // ---- camera, size, render on demand -------------------------------------------------------------------------------
  let W = 1, H = 1, yaw = YAW[0], shift = 0, fit = 1, tween = null;
  const target = new THREE.Vector3(0, 0.62, 0);
  function place() {
    const aspect = W / H, vf = THREE.MathUtils.degToRad(camera.fov), hf = 2 * Math.atan(Math.tan(vf / 2) * aspect), R = 2.75 * fit;
    const d = Math.max(R / Math.tan(vf / 2) * 0.62, R / Math.tan(hf / 2)), el = THREE.MathUtils.degToRad(15), az = THREE.MathUtils.degToRad(45);
    camera.aspect = aspect; camera.position.set(Math.cos(el) * Math.cos(az) * d, target.y + Math.sin(el) * d, Math.cos(el) * Math.sin(az) * d); camera.lookAt(target);
    if (shift) camera.setViewOffset(W, H, shift * W, 0, W, H); else camera.clearViewOffset(); camera.updateProjectionMatrix();
  }
  function render() { carG.rotation.y = yaw; contact.rotation.z = yaw; place(); renderer.render(scene, camera); if (opts.onFrame) opts.onFrame(); }
  function resize() { const r = canvas.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height); fit = opts.fit ? opts.fit(W, H) : 1; renderer.setSize(W, H, false); place(); render(); }
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  function setBeat(i) {
    const k = Math.max(0, Math.min(YAW.length - 1, i)), to = YAW[k], sTo = opts.narrow && opts.narrow() ? 0 : SHIFT[k];
    if (tween) { tween.cancel(); tween = null; }
    if (reduced || (Math.abs(to - yaw) < 0.002 && Math.abs(sTo - shift) < 0.002)) { yaw = to; shift = sTo; render(); return Promise.resolve(); }
    const from = yaw, sFrom = shift, t0 = performance.now(), dur = 650 + Math.min(900, Math.max(Math.abs(to - from) * 520, Math.abs(sTo - sFrom) * 2400));
    return new Promise((resolve) => {
      let raf = 0, live = true; tween = { cancel() { live = false; cancelAnimationFrame(raf); resolve(); } };
      const step = (now) => { if (!live) return; const t = Math.min(1, (now - t0) / dur); yaw = from + (to - from) * ease(t); shift = sFrom + (sTo - sFrom) * ease(t); render(); if (t < 1) raf = requestAnimationFrame(step); else { tween = null; resolve(); } };
      raf = requestAnimationFrame(step);
    });
  }
  const v = new THREE.Vector3(), nW = new THREE.Vector3(), toCam = new THREE.Vector3();
  function anchors() {
    carG.updateMatrixWorld(true);
    return Object.entries(ANCH).map(([id, [p, n]]) => {
      v.copy(p).applyMatrix4(carG.matrixWorld); nW.copy(n).applyQuaternion(carG.quaternion).normalize(); toCam.copy(camera.position).sub(v).normalize();
      const facing = nW.dot(toCam); v.project(camera);
      return { id, x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H, visible: facing > -0.05 && v.z < 1, facing };
    });
  }
  // a still for the "human listing": same car, a calmer three-quarter angle, rendered once into an image
  function snapshot({ width = 900, height = 600, yaw: y = 0.32, fit: f = 0.86, withAnchors = false } = {}) {
    const keep = { W, H, yaw, fit, shift }; W = width; H = height; fit = f; yaw = y; shift = 0;
    renderer.setSize(width, height, false); place(); carG.rotation.y = yaw; contact.rotation.z = yaw; renderer.render(scene, camera);
    const url = canvas.toDataURL("image/png"), baked = withAnchors ? anchors() : null;
    if (withAnchors) { ({ W, H, yaw, fit, shift } = keep); renderer.setSize(W, H, false); place(); render(); return { url, anchors: baked, width, height }; }
    ({ W, H, yaw, fit, shift } = keep); renderer.setSize(W, H, false); place(); render(); return url;
  }
  resize();
  return { setBeat, anchors, resize, render, snapshot, get yaw() { return yaw; }, renderer };
}
