// The hero: one studio maquette of the car on paper (/cars/kit3d.js, lit by /cars/look3d.js), carrying the parts each notice
// field describes. Renders only when something changes (a beat turns the car, the stage resizes, the theme flips): there is no
// idle loop and no decorative motion.
// createStage(canvas, car, { reduced, dark, bare, fit, introFit, narrow, onFrame })   fit(W, H): framing while labels need room;
//   introFit(W, H): the closer framing for the opening beat, before any label is on the stage
//   → { ready, setBeat(i) → Promise, anchors() → [{ id, x, y, visible }], snapshot(opts) → dataURL, resize(), setTheme(dark) }
import * as THREE from "three";
import { buildCarKit } from "./kit3d.js";
import { studio, carMaterials, maquettePaint } from "./look3d.js";

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
const Z = new THREE.Vector3(0, 0, 1), UP = new THREE.Vector3(0, 1, 0);
const facing = (n) => new THREE.Quaternion().setFromUnitVectors(Z, n.clone().normalize());

export async function createStage(canvas, car, opts = {}) {
  const reduced = !!opts.reduced;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(24, 1, 0.1, 100);
  const look = await studio(THREE, renderer, scene, { dark: !!opts.dark });

  const kit = buildCarKit(THREE), kind = car.render.kind in kit.TYPES ? car.render.kind : "suv", K = kit[kind], T = K.T;
  const contactMat = new THREE.MeshBasicMaterial({ map: K.shadowTex, transparent: true, depthWrite: false, opacity: 0.5, color: 0x240b21 });
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(K.L + 0.7, K.W + 0.7), contactMat); contact.rotation.x = -Math.PI / 2; contact.position.y = 0.003; scene.add(contact);
  const MAT = carMaterials(THREE, maquettePaint(THREE, car.render.paint)), std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: new THREE.Color(c), ...o });
  const carG = new THREE.Group(); scene.add(carG);
  for (const p of ["body", "glass", "tyres", "rims", "heads", "tails", "trim", "mirrors"]) { const m = new THREE.Mesh(K[p], MAT[p === "mirrors" ? "body" : p]); m.castShadow = p !== "glass" && p !== "mirrors"; m.receiveShadow = !["body", "glass", "heads", "tails", "mirrors"].includes(p); carG.add(m); }

  // ---- the parts the notice talks about -----------------------------------------------------------------------------
  // opts.bare skips them (and the pins' anchors) for a clean studio render of the car alone: src/cars/_build/render-cars.mjs
  const ANCH = opts.bare ? {} : await noticeParts();
  async function noticeParts() {
  if (document.fonts && document.fonts.ready) { try { await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]); } catch (e) { /* draw with fallbacks */ } }
  const decal = (tex, w, h, at, off, o = {}) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.55, ...o }));
    m.position.copy(at.p).addScaledVector(at.n, off); m.quaternion.copy(facing(at.n)); carG.add(m); return m; };
  const km = car.odometerKm.toLocaleString("en-NZ"), fmtYM = (d) => d.slice(5, 7) + "·" + d.slice(2, 4), half = K.windscreenHalf(0.12);
  // odometer: the instrument display, low on the driver's side of the windscreen (+z)
  const odoAt = K.windscreen(0.09, Math.min(0.4, half - 0.2));
  decal(canvasTex(256, 72, (x, w, h) => { rr(x, 2, 2, w - 4, h - 4, 14); x.fillStyle = "#1E1A1D"; x.fill(); x.fillStyle = "#F5E9D8"; x.font = `500 30px ${MONO}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(km + " km", w / 2, h / 2 + 1); }),
    0.30, 0.085, odoAt, 0.004, { emissive: new THREE.Color("#F5E9D8"), emissiveIntensity: 0.35 });
  // WOF and licence labels, passenger-side corner of the windscreen
  const label = (top, big, small, bg) => canvasTex(128, 128, (x, w, h) => { rr(x, 4, 4, w - 8, h - 8, 10); x.fillStyle = bg; x.fill(); x.strokeStyle = "#240B2155"; x.lineWidth = 3; x.stroke();
    x.fillStyle = "#240B21"; x.textAlign = "center"; x.font = `600 20px ${MONO}`; x.fillText(top, w / 2, 34); x.font = `700 40px ${SANS}`; x.fillText(big, w / 2, 80); x.font = `500 16px ${MONO}`; x.fillText(small, w / 2, 108); });
  const wofT = car.cin["wof.expiry"].value, licT = car.cin["licence.expiry"].value, zW = -(half - 0.1), zL = zW + 0.13;
  decal(label("WOF", fmtYM(wofT), "EXPIRES", "#F5F1F2"), 0.1, 0.1, K.windscreen(0.13, zW), 0.004);
  decal(label("LICENCE", fmtYM(licT), "EXPIRES", "#E9DDE1"), 0.1, 0.1, K.windscreen(0.13, zL), 0.004);
  // the dealer's price sticker
  const stickerAt = K.windscreen(0.27, -0.1);
  decal(canvasTex(320, 190, (x, w, h) => { rr(x, 3, 3, w - 6, h - 6, 12); x.fillStyle = "#FFFDFB"; x.fill(); x.strokeStyle = "#240B2140"; x.lineWidth = 3; x.stroke();
    x.fillStyle = "#916A70"; x.font = `500 17px ${MONO}`; x.fillText("CASH PRICE", 22, 40); x.fillStyle = "#240B21"; x.font = `600 62px ${SANS}`; x.fillText("$" + car.priceNzd.toLocaleString("en-NZ"), 20, 108);
    x.fillStyle = "#654A4E"; x.font = `500 16px ${MONO}`; x.fillText("INCL. GST + ON-ROAD", 22, 142); x.fillStyle = "#916A70"; x.fillText("SIMULATED", 22, 168); }),
    0.34, 0.2, stickerAt, 0.005);
  // the key, lying on the bonnet, with a paper tag that says whether money is owing (a lien)
  const bon = K.topAt(T.cowl + (T.bonnetF - T.cowl) * 0.5, 0.18), keyG = new THREE.Group();
  keyG.position.copy(bon.p).addScaledVector(bon.n, 0.016); keyG.quaternion.setFromUnitVectors(UP, bon.n); carG.add(keyG);
  const fob = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.028, 0.055), std("#262123", { roughness: 0.45, metalness: 0.2 })); fob.castShadow = true; keyG.add(fob);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 8, 24), std("#C3C6CA", { metalness: 0.8, roughness: 0.25 })); ring.rotation.x = Math.PI / 2; ring.position.set(0.075, 0, 0); keyG.add(ring);
  const si = car.cin["securityInterest.registered"].value;
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.11), new THREE.MeshStandardMaterial({ map: canvasTex(256, 140, (x, w, h) => {
    rr(x, 3, 3, w - 6, h - 6, 10); x.fillStyle = "#F7EFE6"; x.fill(); x.strokeStyle = "#916A70"; x.lineWidth = 3; x.stroke(); x.beginPath(); x.arc(28, h / 2, 9, 0, 7); x.fillStyle = "#916A70"; x.fill();
    x.fillStyle = "#240B21"; x.font = `600 22px ${MONO}`; x.fillText("MONEY OWING", 52, 56); x.font = `600 34px ${SANS}`; x.fillText(si === "no" ? "None stated" : si === "yes" ? "Registered" : "Unknown", 52, 100); }), transparent: true, roughness: 0.8, side: THREE.DoubleSide }));
  tag.rotation.x = -Math.PI / 2; tag.position.set(0.2, -0.008, 0.05); tag.rotation.z = -0.25; keyG.add(tag);
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.12, 6), std("#A0726F")); string.rotation.z = Math.PI / 2; string.rotation.y = 0.5; string.position.set(0.12, -0.005, 0.03); keyG.add(string);
  // safety stars on the driver's door
  const doorAt = K.sideAt((T.wf + T.wb) / 2 + 0.15, T.bot + (T.belt - T.bot) * 0.55, 1);
  decal(canvasTex(300, 70, (x, w, h) => { rr(x, 2, 2, w - 4, h - 4, 33); x.fillStyle = "#FFFDFBE6"; x.fill();
    for (let i = 0; i < 5; i++) { const cx = 38 + i * 56, cy = h / 2, R = 20, r = 8.5; x.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, q = k % 2 ? r : R; x.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q); } x.closePath(); x.fillStyle = i < car.safety.stars ? "#240B21" : "#240B2130"; x.fill(); } }),
    0.5, 0.117, doorAt, 0.006);
  // fuel filler flap, driver's-side rear quarter, above the back of the rear wheel
  const fillAt = K.sideAt(T.wb - T.wr * 0.75, T.belt - 0.13, 1);
  const flapMat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(MAT.body.color).multiplyScalar(0.9), roughness: 0.36, clearcoat: 0.6 });
  const flap = new THREE.Mesh(new THREE.CircleGeometry(0.07, 32), flapMat); flap.position.copy(fillAt.p).addScaledVector(fillAt.n, 0.003); flap.quaternion.copy(facing(fillAt.n)); carG.add(flap);
  const rim = new THREE.Mesh(new THREE.RingGeometry(0.07, 0.077, 32), std("#240B21", { roughness: 0.6, transparent: true, opacity: 0.5 })); rim.position.copy(fillAt.p).addScaledVector(fillAt.n, 0.004); rim.quaternion.copy(facing(fillAt.n)); carG.add(rim);
  // the import origin: a small flag on the roof, towards the back
  const imp = car.cin["import.countryLastRegistered"].value, roofAt = K.topAt(T.roofR + 0.14, 0.45), flagBase = roofAt.p.clone();
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.42, 8), std("#3D3638", { metalness: 0.6, roughness: 0.4 })); mast.position.copy(flagBase).add(new THREE.Vector3(0, 0.21, 0)); mast.castShadow = true; carG.add(mast);
  const flagM = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.19), new THREE.MeshStandardMaterial({ map: canvasTex(240, 152, (x, w, h) => { x.fillStyle = "#FFFDFB"; x.fillRect(0, 0, w, h); x.fillStyle = "#916A70"; x.fillRect(0, 0, 10, h);
    x.fillStyle = "#240B21"; x.font = `600 46px ${SANS}`; x.fillText(imp ? ({ Japan: "JP", "United Kingdom": "GB", Australia: "AU", Singapore: "SG", "United States": "US" }[imp] || imp.slice(0, 2).toUpperCase()) : "NZ", 30, 70); x.font = `500 24px ${MONO}`; x.fillStyle = "#654A4E"; x.fillText(imp ? "FIRST REG " + car.cin["import.yearFirstRegisteredOverseas"].value : "NZ-NEW", 30, 118); }), side: THREE.DoubleSide, roughness: 0.7 }));
  flagM.rotation.y = 0.7; flagM.position.copy(flagBase).add(new THREE.Vector3(-0.155 * Math.cos(0.7), 0.33, 0.155 * Math.sin(0.7))); flagM.castShadow = true; carG.add(flagM);

  // anchor points (car space) + outward normals, for the pins
  const out = (at, d) => at.p.clone().addScaledVector(at.n, d); keyG.updateMatrixWorld(true);
  return {
    dash: [out(odoAt, 0.05), odoAt.n], labels: [out(K.windscreen(0.13, (zW + zL) / 2), 0.06), K.windscreen(0.13, zW).n], sticker: [out(stickerAt, 0.06), stickerAt.n],
    tag: [keyG.localToWorld(new THREE.Vector3(0.2, 0, 0.05)), bon.n], door: [out(doorAt, 0.01), doorAt.n],
    filler: [out(fillAt, 0.01), fillAt.n], flag: [flagM.position.clone(), new THREE.Vector3(0, 1, 0)],
  };
  }

  // ---- camera, size, render on demand -------------------------------------------------------------------------------
  let W = 1, H = 1, yaw = YAW[0], shift = 0, fit = 1, beatNow = 0, tween = null;
  const fitFor = (b) => (b === 0 && opts.introFit ? opts.introFit(W, H) : opts.fit ? opts.fit(W, H) : 1);
  const target = new THREE.Vector3(0, 0.62, 0);
  function place() {
    const aspect = W / H, vf = THREE.MathUtils.degToRad(camera.fov), hf = 2 * Math.atan(Math.tan(vf / 2) * aspect), R = 2.75 * fit;
    const d = Math.max(R / Math.tan(vf / 2) * 0.62, R / Math.tan(hf / 2)), el = THREE.MathUtils.degToRad(15), az = THREE.MathUtils.degToRad(45);
    camera.aspect = aspect; camera.position.set(Math.cos(el) * Math.cos(az) * d, target.y + Math.sin(el) * d, Math.cos(el) * Math.sin(az) * d); camera.lookAt(target);
    if (shift) camera.setViewOffset(W, H, shift * W, 0, W, H); else camera.clearViewOffset(); camera.updateProjectionMatrix();
  }
  function render() { carG.rotation.y = yaw; contact.rotation.z = yaw; place(); renderer.render(scene, camera); if (opts.onFrame) opts.onFrame(); }
  function resize() { const r = canvas.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height); if (!tween) fit = fitFor(beatNow); renderer.setSize(W, H, false); place(); render(); }
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  function setBeat(i) {
    const k = Math.max(0, Math.min(YAW.length - 1, i)), to = YAW[k], sTo = opts.narrow && opts.narrow() ? 0 : SHIFT[k], fTo = fitFor(k); beatNow = k;
    if (tween) { tween.cancel(); tween = null; }
    if (reduced || (Math.abs(to - yaw) < 0.002 && Math.abs(sTo - shift) < 0.002 && Math.abs(fTo - fit) < 0.002)) { yaw = to; shift = sTo; fit = fTo; render(); return Promise.resolve(); }
    const from = yaw, sFrom = shift, fFrom = fit, t0 = performance.now(), dur = 650 + Math.min(900, Math.max(Math.abs(to - from) * 520, Math.abs(sTo - sFrom) * 2400, Math.abs(fTo - fFrom) * 700));
    return new Promise((resolve) => {
      let raf = 0, live = true; tween = { cancel() { live = false; cancelAnimationFrame(raf); resolve(); } };
      const step = (now) => { if (!live) return; const t = Math.min(1, (now - t0) / dur), e = ease(t); yaw = from + (to - from) * e; shift = sFrom + (sTo - sFrom) * e; fit = fFrom + (fTo - fFrom) * e; render(); if (t < 1) raf = requestAnimationFrame(step); else { tween = null; resolve(); } };
      raf = requestAnimationFrame(step);
    });
  }
  const v = new THREE.Vector3(), nW = new THREE.Vector3(), toCam = new THREE.Vector3();
  function anchors() {
    carG.updateMatrixWorld(true);
    return Object.entries(ANCH).map(([id, [p, n]]) => {
      v.copy(p).applyMatrix4(carG.matrixWorld); nW.copy(n).applyQuaternion(carG.quaternion).normalize(); toCam.copy(camera.position).sub(v).normalize();
      const facingCam = nW.dot(toCam); v.project(camera);
      return { id, x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H, visible: facingCam > -0.05 && v.z < 1, facing: facingCam };
    });
  }
  // on a dark page the plum shadow would vanish: a near-black one instead
  function setTheme(dark) { look.setDark(dark); contactMat.color.set(dark ? 0x000000 : 0x240b21); contactMat.opacity = dark ? 0.72 : 0.5; render(); }
  // a still for the "human listing": same car, a calmer three-quarter angle, rendered once into an image
  function snapshot({ width = 900, height = 600, yaw: y = 0.32, fit: f = 0.86, withAnchors = false } = {}) {
    const keep = { W, H, yaw, fit, shift }; W = width; H = height; fit = f; yaw = y; shift = 0;
    renderer.setSize(width, height, false); place(); carG.rotation.y = yaw; contact.rotation.z = yaw; renderer.render(scene, camera);
    const url = canvas.toDataURL("image/png"), baked = withAnchors ? anchors() : null;
    if (withAnchors) { ({ W, H, yaw, fit, shift } = keep); renderer.setSize(W, H, false); place(); render(); return { url, anchors: baked, width, height }; }
    ({ W, H, yaw, fit, shift } = keep); renderer.setSize(W, H, false); place(); render(); return url;
  }
  if (opts.dark) { contactMat.color.set(0x000000); contactMat.opacity = 0.72; }
  resize();
  return { setBeat, anchors, resize, render, snapshot, setTheme, get yaw() { return yaw; }, renderer };
}
