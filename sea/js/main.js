// assembl lab · Sea state: the page. One simulation (the sea, the boat's physics, the wake), drawn two ways: the assembl point
// cloud (default) or photoreal. Conditions are set by the person, never a forecast; the page says so.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { seaState, packUniforms, heightAt, normalAt, MAXW, WATERS } from "./waves.js";
import { createOcean, createSky, TIMES, WATER_COLOUR, sunVector } from "./ocean.js";
import { waterTaxi, ferry, buoy } from "./boats.js";
import { createBody, advance, settle, comfort } from "./physics.js";
import { createSeaPoints, bakeToPoints, modelPoints, createWake, createSpray, createBackdrop } from "./cloud.js";

const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches, small = matchMedia("(max-width: 720px)").matches || (navigator.hardwareConcurrency || 8) <= 4;
const KN = 1.943844;

// ------------------------------------------------------------------------------------------------ state (shareable in the URL)
const PRESETS = {
  calm: { label: "Calm morning", windKn: 4, windFrom: 200, swell: 0.25, swellFrom: 45, chop: 0.4, whitecaps: 0.2, time: "dawn", water: "harbour" },
  breeze: { label: "Sea breeze", windKn: 14, windFrom: 30, swell: 0.5, swellFrom: 45, chop: 0.55, whitecaps: 0.55, time: "day", water: "gulf" },
  sw: { label: "Southwesterly", windKn: 24, windFrom: 230, swell: 0.8, swellFrom: 45, chop: 0.72, whitecaps: 0.85, time: "day", water: "gulf" },
  golden: { label: "Golden hour", windKn: 8, windFrom: 260, swell: 0.6, swellFrom: 45, chop: 0.5, whitecaps: 0.35, time: "golden", water: "gulf" },
  swell: { label: "Ocean swell", windKn: 18, windFrom: 200, swell: 2.2, swellFrom: 60, chop: 0.6, whitecaps: 0.6, time: "day", water: "ocean" },
  dusk: { label: "Dusk", windKn: 6, windFrom: 250, swell: 0.4, swellFrom: 45, chop: 0.45, whitecaps: 0.25, time: "dusk", water: "harbour" },
};
const S = { ...PRESETS.breeze, boat: "taxi", view: "cloud", cam: "chase", auto: true };
try { const h = new URLSearchParams(location.hash.slice(1)); for (const [k, v] of h) if (k in S) S[k] = ["windKn", "windFrom", "swell", "swellFrom", "chop", "whitecaps"].includes(k) ? +v : k === "auto" ? v === "1" : v; } catch { /* a bad hash: defaults */ }
if (!TIMES[S.time]) S.time = "day"; if (!WATERS[S.water]) S.water = "gulf"; if (!["taxi", "ferry"].includes(S.boat)) S.boat = "taxi"; if (!["cloud", "photo"].includes(S.view)) S.view = "cloud";

// ------------------------------------------------------------------------------------------------ renderer and scenes
const canvas = $("#sea"), renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 2)); renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50, 1, 0.1, 12000);
const cloud = new THREE.Group(), photo = new THREE.Group(); scene.add(cloud, photo);
const controls = new OrbitControls(camera, canvas); controls.enabled = false; controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.495;

// the shared wave uniforms (one set of arrays for every material that rides the sea)
const uWA = Array.from({ length: MAXW }, () => new THREE.Vector4()), uWB = Array.from({ length: MAXW }, () => new THREE.Vector4());
let sea = seaState(S);

// photoreal: sky, ocean, sun, mesh boats
const sky = createSky(), ocean = createOcean({ detail: small ? 0 : 1 }); ocean.uniforms.uWA.value = uWA; ocean.uniforms.uWB.value = uWB;
const sun = new THREE.DirectionalLight(0xffffff, 2), hemi = new THREE.HemisphereLight(0xbcd8ee, 0x0a3a45, 0.6);
photo.add(sky, ocean.mesh, sun, hemi);
const pmrem = new THREE.PMREMGenerator(renderer), skyScene = new THREE.Scene(), skyForEnv = createSky(); skyScene.add(skyForEnv);
// point cloud: the plum backdrop and the sea as points
const backdrop = createBackdrop(), seaPts = createSeaPoints(small ? 65000 : 230000); seaPts.uniforms.uWA.value = uWA; seaPts.uniforms.uWB.value = uWB;
cloud.add(backdrop, seaPts.points);
// wake and spray belong to both views
const wake = createWake(small ? 9000 : 24000), spray = createSpray(small ? 400 : 900); wake.uniforms.uWA.value = uWA; wake.uniforms.uWB.value = uWB;
scene.add(wake.points, spray.points);

// boats: each has a mesh (photoreal) and a baked point cloud, under one pose that the physics drives
const BOATS = { taxi: waterTaxi(), ferry: ferry() };
for (const b of Object.values(BOATS)) {
  b.pose = new THREE.Group(); b.pose.add(b.group); scene.add(b.pose);
  b.cloud = modelPoints(bakeToPoints(b.group, small ? { surface: 11000, edges: 6000 } : { surface: 30000, edges: 15000 }), { size: 1, fade: 600 });
  b.pose.add(b.cloud.points); b.pose.visible = false;
}
// islands on the horizon and lateral marks in the channel (for scale and speed)
const islands = [[-900, -2100, 380, 160], [1500, -2600, 520, 120], [2600, -900, 300, 90]].map(([x, z, r, h], i) => {
  const g = new THREE.SphereGeometry(1, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), p = g.attributes.position;
  for (let k = 0; k < p.count; k++) { const vx = p.getX(k), vy = p.getY(k), vz = p.getZ(k), n = 1 + 0.12 * Math.sin(vx * 7 + i) * Math.cos(vz * 5 - i) + 0.06 * Math.sin(vx * 17 + vz * 13); p.setXYZ(k, vx * r * n, Math.pow(vy, 1.35) * h * n, vz * r * 0.7 * n); }
  g.computeVertexNormals(); const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: "#2f3b2c", roughness: 0.95, flatShading: true })); m.position.set(x, -2, z); photo.add(m);
  // baked in world space (the mesh's own transform is applied while sampling), so the points sit at the origin
  const pc = modelPoints(bakeToPoints(m, { surface: small ? 2500 : 7000, edges: 0, seed: 9 + i }), { size: 3.2, fade: 9000 }); cloud.add(pc.points); m.userData.pc = pc; return m;
});
const buoys = []; for (let i = 0; i < 8; i++) { const port = i % 2 === 0, g = buoy(port), x = (port ? -1 : 1) * 60 + (Math.random() - 0.5) * 10, z = -120 - Math.floor(i / 2) * 140;
  photo.add(g); const pc = modelPoints(bakeToPoints(g, { surface: small ? 300 : 700, edges: small ? 150 : 350, seed: 20 + i }), { size: 1.2, fade: 600 }); cloud.add(pc.points); buoys.push({ g, pc, x, z }); }

const composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.65, 0.55, 0.12); composer.addPass(bloom); composer.addPass(new OutputPass());
const allLook = () => [seaPts.uniforms, wake.uniforms, spray.uniforms, ...Object.values(BOATS).map((b) => b.cloud.uniforms), ...islands.map((m) => m.userData.pc.uniforms), ...buoys.map((b) => b.pc.uniforms)];

// ------------------------------------------------------------------------------------------------ apply conditions, time and view
let boat = null, body = null, t = 0;
function applySea() {
  sea = seaState(S); packUniforms(sea.waves, uWA, uWB);
  const wc = S.whitecaps * THREE.MathUtils.smoothstep(S.windKn, 6, 20);
  ocean.uniforms.uWhitecaps.value = wc; ocean.uniforms.uHs.value = Math.max(sea.hs, 0.05); seaPts.uniforms.uWhitecaps.value = wc; seaPts.uniforms.uHs.value = Math.max(sea.hs, 0.05);
  const wcol = WATER_COLOUR[S.water]; ocean.uniforms.uDeep.value.set(wcol.deep); ocean.uniforms.uScatter.value.set(wcol.scatter);
  hud();
}
function applyTime() {
  const T = TIMES[S.time], sd = sunVector(T);
  for (const u of [sky.material.uniforms, ocean.uniforms, skyForEnv.material.uniforms]) { u.uSunDir.value.copy(sd); u.uSunCol.value.set(T.sun).multiplyScalar(T.sunI * 0.6); u.uZenith.value.set(T.zenith); u.uHorizon.value.set(T.horizon); u.uCloud.value = T.cloud; }
  sun.color.set(T.sun); sun.intensity = Math.max(0, T.sunI * Math.sin((Math.max(T.elev, 0) * Math.PI) / 180) * 1.6 + (T.elev > 0 ? 0.4 : 0)); sun.position.copy(sd).multiplyScalar(100);
  hemi.color.set(T.zenith); hemi.groundColor.set(WATER_COLOUR[S.water].deep); hemi.intensity = T.elev > 0 ? 0.7 : 0.45;
  renderer.toneMappingExposure = T.exp;
  scene.environment = pmrem.fromScene(skyScene, 0, 1, 6000).texture;
  // point cloud: time of day is a tone shift only, and the key light follows the sun (kept high enough to model the waves)
  const tone = { dawn: 0.86, day: 1.0, golden: 0.94, dusk: 0.74 }[S.time];
  for (const u of allLook()) u.uTone.value = tone;
  const key = sd.clone(); key.y = Math.max(key.y, 0.55); seaPts.uniforms.uKey.value.copy(key.normalize());
}
function applyView() {
  const pc = S.view === "cloud";
  cloud.visible = pc; photo.visible = !pc;
  for (const b of Object.values(BOATS)) { b.group.visible = !pc; b.cloud.points.visible = pc; }
  wake.uniforms.uPhoto.value = pc ? 0 : 1; spray.uniforms.uPhoto.value = pc ? 0 : 1;
  renderer.toneMapping = pc ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
  bloom.strength = pc ? 0.7 : 0.12; bloom.threshold = pc ? 0.1 : 0.85;
  $("#truthView").textContent = pc ? "Point cloud" : "Photoreal";
}
function useBoat(id) {
  const keep = body ? { pos: body.pos.clone(), q: body.q.clone() } : null;
  if (boat) boat.pose.visible = false;
  boat = BOATS[id]; boat.pose.visible = true; body = createBody(boat.phys);
  if (keep) { body.pos.copy(keep.pos); body.q.copy(keep.q); }
  settle(body, sea.waves, t);
  const ph = boat.phys; seaPts.uniforms.uBoatHalf.value.set((ph.beam / 2) * 0.92, ph.dims[1] * 0.45, (ph.dims[2] / 2) * 0.93);
}

// ------------------------------------------------------------------------------------------------ controls: keyboard, touch, autopilot
const keys = new Set();
addEventListener("keydown", (e) => {
  if (e.target.closest("input, select, textarea")) return; const k = e.key.toLowerCase(); keys.add(k);
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
  if (["w", "s", "a", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k) && S.auto) setAuto(false);
  if (k === " ") setAuto(!S.auto);
  const cams = { 1: "chase", 2: "aerial", 3: "side", 4: "bow", 5: "free" }; if (cams[k]) setCam(cams[k]);
});
addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
let touchSteer = 0;
for (const [id, v] of [["#steerL", -1], ["#steerR", 1]]) {
  const el = $(id), on = (e) => { e.preventDefault(); touchSteer = v; if (S.auto) setAuto(false); }, off = () => (touchSteer = 0);
  el.addEventListener("pointerdown", on); el.addEventListener("pointerup", off); el.addEventListener("pointerleave", off); el.addEventListener("pointercancel", off);
}
$("#throttle").addEventListener("input", (e) => { if (S.auto) setAuto(false); body.throttle = +e.target.value / 100; });
function setAuto(on) { S.auto = on; $("#btnAuto").setAttribute("aria-pressed", String(on)); $("#btnAuto").textContent = on ? "Autopilot on" : "Autopilot off"; share(); }
function drive(dt) {
  if (S.auto) {
    // a slow figure of eight around the marks, heading home if it strays far
    const away = Math.hypot(body.pos.x, body.pos.z + 300), fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(body.q);
    let st = 0.32 * Math.sin(t * 0.07) + 0.12 * Math.sin(t * 0.19);
    if (away > 420) { const toHome = new THREE.Vector3(-body.pos.x, 0, -300 - body.pos.z).normalize(), cross = fwd.x * toHome.z - fwd.z * toHome.x; st = THREE.MathUtils.clamp(cross * 2, -0.6, 0.6); }
    body.steer += (st - body.steer) * Math.min(1, dt * 1.5); body.throttle += ((boat === BOATS.taxi ? 0.62 : 0.85) - body.throttle) * Math.min(1, dt);
    $("#throttle").value = Math.round(body.throttle * 100);
  } else {
    if (keys.has("w") || keys.has("arrowup")) body.throttle = Math.min(1, body.throttle + dt * 0.5);
    if (keys.has("s") || keys.has("arrowdown")) body.throttle = Math.max(-0.3, body.throttle - dt * 0.6);
    const want = (keys.has("a") || keys.has("arrowleft") ? -1 : 0) + (keys.has("d") || keys.has("arrowright") ? 1 : 0) + touchSteer;
    body.steer += (THREE.MathUtils.clamp(want, -1, 1) * 0.75 - body.steer) * Math.min(1, dt * 3);
    $("#throttle").value = Math.round(Math.max(0, body.throttle) * 100);
  }
}

// ------------------------------------------------------------------------------------------------ cameras
function setCam(c) { S.cam = c; controls.enabled = c === "free"; $$("#cam button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.cam === c))); share(); }
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
function cameraFollow(dt, snap = false) {
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(body.q).setY(0).normalize(), side = new THREE.Vector3(-fwd.z, 0, fwd.x), L = boat.lengthM, p = body.pos;
  let want, look;
  if (S.cam === "chase") { want = p.clone().addScaledVector(fwd, -L * 1.9).add(new THREE.Vector3(0, L * 0.55, 0)); look = p.clone().addScaledVector(fwd, L * 0.8).add(new THREE.Vector3(0, 1, 0)); }
  else if (S.cam === "aerial") { want = p.clone().addScaledVector(fwd, -L * 2.2).add(new THREE.Vector3(0, L * 5.5, 0)); look = p.clone().addScaledVector(fwd, L * 1.2); }
  else if (S.cam === "side") { want = p.clone().addScaledVector(side, L * 1.8).addScaledVector(fwd, L * 0.3).add(new THREE.Vector3(0, 1.6, 0)); want.y = Math.max(want.y, heightAt(sea.waves, want.x, want.z, t) + 1.2); look = p.clone().add(new THREE.Vector3(0, 0.8, 0)); }
  else if (S.cam === "bow") { const b = boat.phys.bow.clone().add(new THREE.Vector3(0.0, boat === BOATS.taxi ? 1.7 : 2.4, 1.0)).applyQuaternion(body.q).add(p); camera.position.copy(b); camera.lookAt(b.clone().add(new THREE.Vector3(0, 0, -30).applyQuaternion(body.q))); return; }
  else { controls.target.lerp(p, 0.2); controls.update(); return; }
  const k = snap ? 1 : 1 - Math.exp(-dt * 2.6); camPos.lerp(want, k); camLook.lerp(look, k); if (snap) { camPos.copy(want); camLook.copy(look); }
  camera.position.copy(camPos); camera.lookAt(camLook);
}

// ------------------------------------------------------------------------------------------------ HUD
const compass = (deg) => ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round((((deg % 360) + 360) % 360) / 45) % 8];
function hud() {
  if (!body) return;
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(body.q), hdg = ((Math.atan2(fwd.x, -fwd.z) * 180) / Math.PI + 360) % 360, rms = Math.sqrt(body.ride);
  $("#hudSpeed").textContent = Math.max(0, body.speed * KN).toFixed(0); $("#hudHdg").textContent = `${Math.round(hdg).toString().padStart(3, "0")}° ${compass(hdg)}`;
  $("#hudSea").textContent = `Sea state ${sea.douglas.n} · ${sea.douglas.name} · Hs ${sea.hs.toFixed(1)} m · Tp ${sea.tp.toFixed(1)} s`;
  $("#hudRide").textContent = `Ride ${rms.toFixed(2)} m/s² · ${comfort(rms)}`;
  $("#hudWater").textContent = `${sea.water} · wind ${S.windKn} kn from ${compass(S.windFrom)}`;
}

// ------------------------------------------------------------------------------------------------ the panel
function bindRange(id, key, fmt) { const el = $(id), out = $(id + "Val"); el.value = key === "chop" || key === "whitecaps" ? Math.round(S[key] * 100) : S[key]; const show = () => (out.textContent = fmt(S[key])); show();
  el.addEventListener("input", () => { S[key] = key === "chop" || key === "whitecaps" ? +el.value / 100 : +el.value; show(); applySea(); share(); }); }
bindRange("#wind", "windKn", (v) => `${v} kn`); bindRange("#windFrom", "windFrom", (v) => `${v}° ${compass(v)}`); bindRange("#swell", "swell", (v) => `${(+v).toFixed(1)} m`);
bindRange("#chop", "chop", (v) => `${Math.round(v * 100)}%`); bindRange("#whitecaps", "whitecaps", (v) => `${Math.round(v * 100)}%`);
function seg(id, key, after) { const el = $(id); el.addEventListener("click", (e) => { const b = e.target.closest("button[data-v]"); if (!b) return; S[key] = b.dataset.v; mark(id, key); after(); share(); }); mark(id, key); }
function mark(id, key) { $$(id + " button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === S[key]))); }
seg("#time", "time", applyTime); seg("#water", "water", () => { applySea(); applyTime(); }); seg("#boat", "boat", () => useBoat(S.boat)); seg("#view", "view", applyView);
$("#presets").innerHTML = Object.entries(PRESETS).map(([k, p]) => `<button type="button" data-p="${k}">${p.label}</button>`).join("");
$("#presets").addEventListener("click", (e) => { const b = e.target.closest("button[data-p]"); if (!b) return; Object.assign(S, PRESETS[b.dataset.p]);
  for (const [id, key] of [["#wind", "windKn"], ["#windFrom", "windFrom"], ["#swell", "swell"], ["#chop", "chop"], ["#whitecaps", "whitecaps"]]) { $(id).value = key === "chop" || key === "whitecaps" ? Math.round(S[key] * 100) : S[key]; $(id).dispatchEvent(new Event("input")); }
  mark("#time", "time"); mark("#water", "water"); applySea(); applyTime(); share(); });
$("#cam").addEventListener("click", (e) => { const b = e.target.closest("button[data-cam]"); if (b) setCam(b.dataset.cam); });
$("#btnAuto").addEventListener("click", () => setAuto(!S.auto));
$("#btnLink").addEventListener("click", async () => { share(); try { await navigator.clipboard.writeText(location.href); $("#btnLink").textContent = "Link copied"; } catch { $("#btnLink").textContent = "Copy the address bar"; } setTimeout(() => ($("#btnLink").textContent = "Copy link"), 1800); });
let paused = reduce;
$("#btnPause").addEventListener("click", () => { paused = !paused; $("#btnPause").setAttribute("aria-pressed", String(paused)); $("#btnPause").setAttribute("aria-label", paused ? "Play motion" : "Pause motion"); });
$("#btnPanel").addEventListener("click", () => { const p = $("#panel"), open = p.dataset.open !== "true"; p.dataset.open = String(open); $("#btnPanel").setAttribute("aria-expanded", String(open)); });
function share() { const h = new URLSearchParams(); for (const k of ["windKn", "windFrom", "swell", "swellFrom", "chop", "whitecaps", "time", "water", "boat", "view", "cam"]) h.set(k, typeof S[k] === "number" ? +(+S[k]).toFixed(2) : S[k]); h.set("auto", S.auto ? "1" : "0"); history.replaceState(null, "", "#" + h.toString()); }

// ------------------------------------------------------------------------------------------------ the loop
function size() { const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight; renderer.setSize(w, h, false); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); const pr = renderer.getContext().drawingBufferHeight / 900; for (const u of allLook()) u.uPR.value = pr; }
addEventListener("resize", size);
let last = performance.now(), assemble = reduce ? 1 : 0, scanT = 2;
const fwd = new THREE.Vector3(), side = new THREE.Vector3(), stern = new THREE.Vector3(), bowL = new THREE.Vector3(), bowR = new THREE.Vector3();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!paused && !document.hidden) {
    t += dt; drive(dt); advance(body, sea.waves, t, dt);
    assemble = Math.min(1, assemble + dt / 2.8);
    // boat pose, buoys
    boat.pose.position.copy(body.pos); boat.pose.quaternion.copy(body.q); boat.pose.updateMatrixWorld();
    for (const b of buoys) { const y = heightAt(sea.waves, b.x, b.z, t), n = normalAt(sea.waves, b.x, b.z, t); b.g.position.set(b.x, y - 0.25, b.z); b.g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...n)); b.pc.points.position.copy(b.g.position); b.pc.points.quaternion.copy(b.g.quaternion); }
    // wake and spray from the stern and the bow shoulders
    fwd.set(0, 0, -1).applyQuaternion(body.q); side.set(1, 0, 0).applyQuaternion(body.q);
    stern.set(0, 0, boat.phys.sternZ).applyQuaternion(body.q).add(body.pos);
    wake.update(stern, fwd.clone().setY(0).normalize(), side.clone().setY(0).normalize(), body.speed, boat.phys.beam, t, dt);
    const bz = boat.phys.bow.z * 0.75, bw = boat.phys.beam * 0.42;
    bowL.set(-bw, 0.1, bz).applyQuaternion(body.q).add(body.pos); bowR.set(bw, 0.1, bz).applyQuaternion(body.q).add(body.pos);
    bowL.sx = side.x; bowL.sz = side.z; bowR.sx = side.x; bowR.sz = side.z;
    spray.update(bowL, bowR, fwd, body.vel, body.speed, Math.max(0, -body.seatA / 30 - 0.4), dt);
    // the reading scan: every nine seconds a ring of light sweeps out from the boat
    scanT += dt; const scanR = scanT < 4.5 ? scanT * 32 : -100; if (scanT > 9) scanT = 0;
    seaPts.uniforms.uScanC.value.set(body.pos.x, body.pos.z); seaPts.uniforms.uScanR.value = scanR;
    for (const b of Object.values(BOATS)) { b.cloud.uniforms.uScanC.value.set(body.pos.x, body.pos.z); b.cloud.uniforms.uScanR.value = scanR; }
  }
  cameraFollow(dt);
  // time and camera into every material
  for (const u of allLook()) { u.uTime.value = t; u.uAssemble.value = assemble; if (u.uCam) u.uCam.value.copy(camera.position); }
  ocean.uniforms.uTime.value = t; sky.material.uniforms.uTime.value = t; seaPts.points.follow(camera); ocean.mesh.follow(camera);
  sky.position.copy(camera.position);
  seaPts.uniforms.uBoatInv.value.copy(boat.pose.matrixWorld).invert();
  if (Math.floor(now / 250) !== Math.floor((now - dt * 1000) / 250)) hud();
  composer.render();
  requestAnimationFrame(frame);
}

// ------------------------------------------------------------------------------------------------ start
packUniforms(sea.waves, uWA, uWB); applySea(); applyTime(); applyView(); useBoat(S.boat);
mark("#cam", "cam"); setCam(S.cam); setAuto(S.auto); body.throttle = 0.4;
if (reduce) { $("#btnPause").setAttribute("aria-pressed", "true"); $("#btnPause").setAttribute("aria-label", "Play motion"); }
size(); cameraFollow(0, true); hud(); $("#loading").hidden = true;
window.__sea = { S, get body() { return body; }, get sea() { return sea; }, setAssemble: (v) => (assemble = v), setTime: (v) => (t = v), pause: (p) => (paused = p) };   // for tests and the console
requestAnimationFrame(frame);
