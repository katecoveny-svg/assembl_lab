// The car check's hero: one maquette car on paper (/cars/kit3d.js), in the buyer's body type and paint, carrying the parts a
// check talks about: the odometer on the dash, the WOF and licence labels and the asking-price sticker on the windscreen, the key
// on the bonnet with a money-owing tag, and the filler flap (or charge port). The register's facts are about the model, so their
// pin sits on the roof. The labels on the car redraw as the buyer types (they're Your data); the pins are the page's job.
// Lighting and camera follow /cars/stage3d.js. It renders only when something changes (a turn, a fact, a resize): no idle loop.
// createCheckStage(canvas, opts) → { setKind, setPaint, setFacts, setTheme, turn(beat, room) → Promise, jump(beat, room), anchors(), resize() }
// `room` (1 = the car alone) pulls the camera back so the pins have space beside the car while a check is on the stage.
import * as THREE from "three";
import { buildCarKit } from "/cars/kit3d.js";

// where the car turns for each part (radians about y; the camera sits off the front-right quarter, so +yaw shows the driver's side)
export const BEATS = { idle: 0.2, dash: -0.3, screen: -0.46, tag: -0.6, roof: 0.62, filler: 1.12, done: 0.3 };

const MONO = '"IBM Plex Mono", ui-monospace, monospace', SANS = '"Instrument Sans", system-ui, sans-serif';
const rr = (x, a, b, w, h, r) => { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); };
const monthTag = (ym) => (ym ? ym.slice(5, 7) + "·" + ym.slice(2, 4) : "?");

export async function createCheckStage(canvas, opts = {}) {
  const reduced = !!opts.reduced;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(24, 1, 0.1, 100);
  try { const { RoomEnvironment } = await import("three/addons/environments/RoomEnvironment.js"); const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.8; pm.dispose(); } catch (e) { /* reflections are optional */ }
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcdbfc5, 0.85));
  const sun = new THREE.DirectionalLight(0xfff6ee, 2.4); sun.position.set(3.5, 7.5, 4.5); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 20 }); sun.shadow.radius = 6; sun.shadow.bias = -0.0005; scene.add(sun);
  const groundMat = new THREE.ShadowMaterial({ opacity: 0.13, color: 0x240b21 }), ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  const kit = buildCarKit(THREE), std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: new THREE.Color(c), ...o });
  const contactMat = new THREE.MeshBasicMaterial({ map: kit.shadowTex, transparent: true, depthWrite: false, opacity: 0.42, color: 0x240b21 });
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), contactMat); contact.rotation.x = -Math.PI / 2; contact.position.y = 0.004; scene.add(contact);
  const MAT = {
    body: new THREE.MeshPhysicalMaterial({ color: new THREE.Color(opts.paint || "#8D9094"), roughness: 0.42, metalness: 0.1, clearcoat: 0.6, clearcoatRoughness: 0.3, envMapIntensity: 0.4 }),
    glass: new THREE.MeshPhysicalMaterial({ color: new THREE.Color("#2B2530"), roughness: 0.06, metalness: 0.25, transparent: true, opacity: 0.74, envMapIntensity: 1.3, side: THREE.DoubleSide }),
    tyres: std("#2A2628", { roughness: 0.92 }), rims: std("#C3C6CA", { roughness: 0.3, metalness: 0.75 }), trim: std("#3D3638", { roughness: 0.75 }),
    heads: std("#F4F1E8", { emissive: new THREE.Color("#FFF6E2"), emissiveIntensity: 0.25, roughness: 0.3 }), tails: std("#B5453E", { emissive: new THREE.Color("#B4443F"), emissiveIntensity: 0.15, roughness: 0.4 }),
  };
  const carG = new THREE.Group(); scene.add(carG);
  const mesh = {};
  for (const p of Object.keys(MAT)) { const m = new THREE.Mesh(undefined, MAT[p]); m.castShadow = p !== "glass"; m.receiveShadow = true; if (p === "glass") m.renderOrder = 2; mesh[p] = m; carG.add(m); }

  // ---- the labels on the car: one canvas each, redrawn in place when a fact changes -----------------------------------------
  if (document.fonts && document.fonts.ready) { try { await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]); } catch (e) { /* fallbacks */ } }
  const tex = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return { c, x: c.getContext("2d"), t, w, h }; };
  const TX = { odo: tex(256, 72), wof: tex(128, 128), lic: tex(128, 128), price: tex(320, 190), tag: tex(256, 140) };
  let facts = { km: null, wof: null, licence: null, price: null, owing: "unknown", ...(opts.facts || {}) };
  function draw() {
    const f = facts, d = (k, fn) => { const T = TX[k]; T.x.clearRect(0, 0, T.w, T.h); fn(T.x, T.w, T.h); T.t.needsUpdate = true; };
    d("odo", (x, w, h) => { rr(x, 2, 2, w - 4, h - 4, 14); x.fillStyle = "#1E1A1D"; x.fill(); x.fillStyle = "#F5E9D8"; x.font = `500 30px ${MONO}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText((f.km != null ? Number(f.km).toLocaleString("en-NZ") : "–") + " km", w / 2, h / 2 + 1); });
    const label = (k, top, ym, bg) => d(k, (x, w, h) => { rr(x, 4, 4, w - 8, h - 8, 10); x.fillStyle = bg; x.fill(); x.strokeStyle = "#240B2155"; x.lineWidth = 3; x.stroke();
      x.fillStyle = "#240B21"; x.textAlign = "center"; x.font = `600 ${top.length > 4 ? 18 : 20}px ${MONO}`; x.fillText(top, w / 2, 34); x.font = `700 40px ${SANS}`; x.fillText(monthTag(ym), w / 2, 80);
      x.font = `500 15px ${MONO}`; x.fillText(ym ? "EXPIRES" : "NOT SHOWN", w / 2, 108); });
    label("wof", "WOF", f.wof, "#F5F1F2"); label("lic", "LICENCE", f.licence, "#E9DDE1");
    d("price", (x, w, h) => { rr(x, 3, 3, w - 6, h - 6, 12); x.fillStyle = "#FFFDFB"; x.fill(); x.strokeStyle = "#240B2140"; x.lineWidth = 3; x.stroke();
      x.fillStyle = "#916A70"; x.font = `500 17px ${MONO}`; x.fillText("ASKING", 22, 40); x.fillStyle = "#240B21"; x.font = `600 ${f.price != null && f.price >= 100000 ? 50 : 60}px ${SANS}`;
      x.fillText(f.price != null ? "$" + Math.round(f.price).toLocaleString("en-NZ") : "$ ?", 20, 108); x.fillStyle = "#654A4E"; x.font = `500 16px ${MONO}`; x.fillText(f.price != null ? "AS TYPED" : "NOT GIVEN", 22, 150); });
    d("tag", (x, w, h) => { rr(x, 3, 3, w - 6, h - 6, 10); x.fillStyle = "#F7EFE6"; x.fill(); x.strokeStyle = "#916A70"; x.lineWidth = 3; x.stroke(); x.beginPath(); x.arc(28, h / 2, 9, 0, 7); x.fillStyle = "#916A70"; x.fill();
      x.fillStyle = "#240B21"; x.font = `600 22px ${MONO}`; x.fillText("MONEY OWING", 52, 56); x.font = `600 34px ${SANS}`; x.fillText(f.owing === "no" ? "None stated" : f.owing === "yes" ? "Registered" : "Not sure", 52, 100); });
  }
  draw();

  // ---- the parts, placed for the body type in hand (rebuilt when it changes; the label canvases are kept) -----------------
  let K = null, T = null, deco = null, ANCH = {}, flapMat = null;
  function build(kind) {
    K = kit[kind in kit.TYPES ? kind : "hatch"]; T = K.T;
    for (const p of Object.keys(MAT)) mesh[p].geometry = K[p];
    contact.geometry.dispose(); contact.geometry = new THREE.PlaneGeometry(K.L + 0.7, K.W + 0.7);
    if (deco) { deco.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material !== flapMat) o.material.dispose(); }); carG.remove(deco); }
    deco = new THREE.Group(); carG.add(deco);
    const [g0, g1] = T.glass, y0 = T.belt + 0.012, y1 = T.roof - 0.03, dx = g1 - g0, dy = y1 - y0, len = Math.hypot(dx, dy);
    const wsN = new THREE.Vector3(dy / len, -dx / len, 0); // windscreen outward normal (forward and up)
    const onScreen = (t, z, off) => K.map(g0 + dx * t, y0 + dy * t, z).add(wsN.clone().multiplyScalar(off));
    const wsQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), wsN.clone().normalize());
    const decal = (T2, w, h, pos, quat, o = {}) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: T2.t, transparent: true, roughness: 0.6, ...o })); m.position.copy(pos); m.quaternion.copy(quat); deco.add(m); return m; };
    // odometer: the instrument display, seen through the windscreen on the driver's side (+z)
    decal(TX.odo, 0.30, 0.085, onScreen(0.09, 0.40, 0.03), wsQuat, { emissive: new THREE.Color("#F5E9D8"), emissiveIntensity: 0.35, emissiveMap: TX.odo.t }).renderOrder = 1;
    // WOF and licence labels, passenger-side corner of the windscreen; the asking price on a sticker beside them
    decal(TX.wof, 0.1, 0.1, onScreen(0.12, -0.6, 0.074), wsQuat); decal(TX.lic, 0.1, 0.1, onScreen(0.12, -0.47, 0.074), wsQuat);
    decal(TX.price, 0.34, 0.2, onScreen(0.24, -0.08, 0.075), wsQuat);
    // the key on the bonnet, with a paper tag that says whether money is owing (a security interest on the PPSR)
    const bx = T.top[3][0] + (T.top[2][0] - T.top[3][0]) * 0.38, by = T.top[3][1] + (T.top[2][1] - T.top[3][1]) * 0.38, bonnet = K.map(bx, by, 0);
    const slope = Math.atan2(T.top[2][1] - T.top[3][1], (T.top[2][0] - T.top[3][0]) * (K.map(1, 0, 0).x - K.map(0, 0, 0).x));
    const keyG = new THREE.Group(); keyG.position.set(bonnet.x, bonnet.y + 0.055, 0.18); keyG.rotation.z = slope; deco.add(keyG);
    const fob = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.028, 0.055), std("#262123", { roughness: 0.45, metalness: 0.2 })); fob.castShadow = true; keyG.add(fob);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 8, 24), std("#C3C6CA", { metalness: 0.8, roughness: 0.25 })); ring.rotation.x = Math.PI / 2; ring.position.set(0.075, 0, 0); keyG.add(ring);
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.11), new THREE.MeshStandardMaterial({ map: TX.tag.t, transparent: true, roughness: 0.8, side: THREE.DoubleSide }));
    tag.rotation.x = -Math.PI / 2; tag.position.set(0.2, -0.008, 0.05); tag.rotation.z = -0.25; keyG.add(tag);
    const string = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.12, 6), std("#A0726F")); string.rotation.z = Math.PI / 2; string.rotation.y = 0.5; string.position.set(0.12, -0.005, 0.03); keyG.add(string);
    // the filler flap (or charge port), driver's-side rear quarter
    const doorZ = T.W / 2 + 0.012, fx = T.wb - (T.wr + 0.08) - 0.12, filler = K.map(fx, T.belt - 0.16, doorZ - 0.004);
    if (!flapMat) flapMat = new THREE.MeshPhysicalMaterial({ color: MAT.body.color.clone().multiplyScalar(0.86), roughness: 0.4, clearcoat: 0.6 });
    const flap = new THREE.Mesh(new THREE.CircleGeometry(0.075, 32), flapMat); flap.position.copy(filler); deco.add(flap);
    const rim = new THREE.Mesh(new THREE.RingGeometry(0.075, 0.084, 32), std("#240B21", { roughness: 0.6, transparent: true, opacity: 0.45 })); rim.position.copy(filler).add(new THREE.Vector3(0, 0, 0.001)); deco.add(rim);
    // the roof, for the facts about every car of this model on the register
    const roof = K.map((T.glass[1] + T.glass[2]) / 2, T.roof, 0);
    ANCH = {
      dash: [onScreen(0.09, 0.40, 0.07), wsN], screen: [onScreen(0.12, -0.54, 0.075), wsN], tag: [new THREE.Vector3(keyG.position.x + 0.2, keyG.position.y, 0.23), new THREE.Vector3(0, 1, 0)],
      filler: [filler.clone().add(new THREE.Vector3(0, 0, 0.01)), new THREE.Vector3(0, 0, 1)], roof: [roof.add(new THREE.Vector3(0, 0.01, 0)), new THREE.Vector3(0, 1, 0)],
    };
  }

  // ---- camera, size, render on demand ------------------------------------------------------------------------------------
  let W = 1, H = 1, yaw = BEATS.idle, fit = 1, room = 1, tween = null, kind = opts.kind || "hatch";
  const target = new THREE.Vector3();
  function place() {
    const aspect = W / H, vf = THREE.MathUtils.degToRad(camera.fov), hf = 2 * Math.atan(Math.tan(vf / 2) * aspect), R = 0.6 * K.L * fit * room;
    const d = Math.max(R / Math.tan(vf / 2) * 0.62, R / Math.tan(hf / 2)), el = THREE.MathUtils.degToRad(15), az = THREE.MathUtils.degToRad(45);
    target.set(0, K.H * 0.42, 0);
    camera.aspect = aspect; camera.position.set(Math.cos(el) * Math.cos(az) * d, target.y + Math.sin(el) * d, Math.cos(el) * Math.sin(az) * d); camera.lookAt(target); camera.updateProjectionMatrix();
  }
  function render() { carG.rotation.y = yaw; contact.rotation.z = yaw; place(); renderer.render(scene, camera); if (opts.onFrame) opts.onFrame(); }
  function resize() { const r = canvas.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height); fit = opts.fit ? opts.fit(W, H) : 1; renderer.setSize(W, H, false); render(); }
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  function turn(beat, roomTo = room) {
    const to = BEATS[beat] != null ? BEATS[beat] : beat;
    if (tween) { tween.cancel(); tween = null; }
    if (reduced || (Math.abs(to - yaw) < 0.002 && Math.abs(roomTo - room) < 0.002)) { yaw = to; room = roomTo; render(); return Promise.resolve(); }
    const from = yaw, rFrom = room, t0 = performance.now(), dur = Math.min(1050, 460 + Math.max(Math.abs(to - from) * 380, Math.abs(roomTo - rFrom) * 1400));
    return new Promise((resolve) => {
      let raf = 0, live = true; tween = { cancel() { live = false; cancelAnimationFrame(raf); resolve(); } };
      const step = (now) => { if (!live) return; const t = Math.min(1, (now - t0) / dur), k = ease(t); yaw = from + (to - from) * k; room = rFrom + (roomTo - rFrom) * k; render();
        if (t < 1) raf = requestAnimationFrame(step); else { tween = null; resolve(); } };
      raf = requestAnimationFrame(step);
    });
  }
  const jump = (beat, roomTo = room) => { if (tween) { tween.cancel(); tween = null; } yaw = BEATS[beat] != null ? BEATS[beat] : beat; room = roomTo; render(); };
  const v = new THREE.Vector3(), nW = new THREE.Vector3(), toCam = new THREE.Vector3();
  function anchors() {
    carG.updateMatrixWorld(true);
    return Object.entries(ANCH).map(([id, [p, n]]) => {
      v.copy(p).applyMatrix4(carG.matrixWorld); nW.copy(n).applyQuaternion(carG.quaternion).normalize(); toCam.copy(camera.position).sub(v).normalize();
      const facing = nW.dot(toCam); v.project(camera);
      return { id, x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H, visible: facing > -0.05 && v.z < 1, facing };
    });
  }
  function setKind(k) { if (!(k in kit.TYPES)) return; kind = k; build(k); render(); }
  function setPaint(hex) { MAT.body.color.set(hex); flapMat.color.copy(MAT.body.color).multiplyScalar(0.86); render(); }
  function setFacts(f) { facts = { ...facts, ...f }; draw(); render(); }
  // on a dark page the plum shadow would vanish: a near-black one instead
  function setTheme(dark) { contactMat.color.set(dark ? 0x000000 : 0x240b21); contactMat.opacity = dark ? 0.6 : 0.42; groundMat.color.set(dark ? 0x000000 : 0x240b21); groundMat.opacity = dark ? 0.32 : 0.13; render(); }
  build(kind); if (opts.dark) setTheme(true); resize();
  return { setKind, setPaint, setFacts, setTheme, turn, jump, anchors, resize, render, get kind() { return kind; }, get yaw() { return yaw; } };
}
