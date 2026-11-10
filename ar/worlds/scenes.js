// assembl AR worlds: each world as a three.js group in real metres, built from the same code and models as its page.
// The places (dairy plant, ED, grocery DC) use their pages' own World classes and sim.js models, so in AR the tankers
// queue and the patients wait for the same reasons as on the page. The objects use their Blender GLBs and rig adapters.
//
// buildWorld(id, { renderer, onProgress }) → {
//   root       Group, real metres, footprint centred on x = z = 0, ground at y = 0
//   size       Vector3, the footprint and height in real metres
//   tick(dt, cam)  advance the model (dt in seconds; cam is the viewer in root-local metres, for see-through walls)
//   tags       [{ text, sub, pos: Vector3 (root-local), learn }]; tick() keeps sub current
//   status()   a short live line ("09:42 · October · Simulated") or ''
//   enter      { x, z, yaw }: where "Step inside" puts the doorway, facing yaw (radians, 0 = looking along -z)
//   anim       { duration, nodes, at(t) }: a short loop of a few moving parts, for the files baked offline
//   pieces()   the parts that build themselves when the world is placed
// }
import * as THREE from 'three';
const ADD = '/assets/vendor/three/addons/';

let loaderP = null;
function gltfLoader() {
  return (loaderP ||= Promise.all([import(ADD + 'loaders/GLTFLoader.js'), import(ADD + 'libs/meshopt_decoder.module.js')])
    .then(([{ GLTFLoader }, { MeshoptDecoder }]) => { const l = new GLTFLoader(); l.setMeshoptDecoder(MeshoptDecoder); return l; }));
}
async function loadGLB(url, onProgress, bytes = 0) {
  const l = await gltfLoader();
  return l.loadAsync(url, e => onProgress && onProgress(e.loaded, e.total || bytes, 1));
}
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;
// the standing spot for "Step inside": stand at (x, z), looking towards (tx, tz); world metres before centring
const face = (x, z, tx, tz, off) => ({ x: x + off.x, z: z + off.z, yaw: Math.atan2(-(tx - x), -(tz - z)) });
const smooth = t => t * t * (3 - 2 * t);
const seg = (t, a, b) => smooth(Math.min(1, Math.max(0, (t - a) / (b - a))));

// Drop the twins' shadow-only stand-ins (layer 1, drawn only by the sun's shadow camera on the page). In WebXR, three.js
// enables layer 1 on the first eye's camera, so they would show up as white shapes.
function stripShadowProxies(root) {
  const gone = [];
  root.traverse(o => { if (o.layers && o.layers.mask === 2) gone.push(o); });
  for (const o of gone) o.parent && o.parent.remove(o);
}
// glass that refracts makes three.js render the scene twice; plain see-through glass reads the same in AR
function calmGlass(root) {
  root.traverse(o => { if (!o.isMesh) return; for (const m of [].concat(o.material)) if (m && m.transmission > 0) { m.transmission = 0; m.transparent = true; m.opacity = Math.min(m.opacity ?? 1, 0.35); m.depthWrite = false; } });
}
// centre a group's footprint on the origin, on the ground
function centreOn(root, inner, box) {
  const b = box || new THREE.Box3().setFromObject(inner, true);
  const c = b.getCenter(new THREE.Vector3());
  inner.position.x -= c.x; inner.position.z -= c.z; inner.position.y -= b.min.y;
  root.add(inner);
  return b.getSize(new THREE.Vector3());
}
// The twins lay a huge ground plane (600 to 900 m) for the horizon on their pages. On a table that would be metres
// across, so every flat part that runs past the site is cut back to the site plus a margin.
function trimGround(inner, site, margin) {
  inner.updateMatrixWorld(true);
  const lim = site.clone().expandByVector(new THREE.Vector3(margin, 0, margin)), inv = new THREE.Matrix4(), b = new THREE.Box3();
  const innerInv = inner.matrixWorld.clone().invert();
  inner.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh) return;
    o.geometry.computeBoundingBox(); b.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld).applyMatrix4(innerInv);
    if (b.max.y - b.min.y > 0.6) return;
    if (b.min.x >= lim.min.x && b.max.x <= lim.max.x && b.min.z >= lim.min.z && b.max.z <= lim.max.z) return;
    const x0 = Math.max(b.min.x, lim.min.x), x1 = Math.min(b.max.x, lim.max.x), z0 = Math.max(b.min.z, lim.min.z), z1 = Math.min(b.max.z, lim.max.z);
    if (x1 <= x0 || z1 <= z0) { o.visible = false; return; }
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, b.max.y, (z0 + z1) / 2);
    // into the mesh's own space: inverse of (its world matrix relative to inner)
    inv.multiplyMatrices(innerInv, o.matrixWorld).invert(); g.applyMatrix4(inv);
    o.geometry = g;
  });
}
const meshesOf = o => { const l = []; o.traverse(m => { if (m.isMesh) l.push(m); }); return l; };

// ════════════════════════════════════════════════════════════════════════════════════════════ objects

async function f1({ onProgress }) {
  const g = await loadGLB('/assets/models/windtunnel/windtunnel.glb', onProgress, 1056068);
  const car = g.scene.getObjectByName('CAR');
  calmGlass(car);
  const root = new THREE.Group(), inner = new THREE.Group();
  car.removeFromParent(); car.position.set(0, 0, 0);
  inner.add(car); inner.rotation.y = -Math.PI / 2 + 0.55;   // nose towards the viewer, turned a little
  inner.updateMatrixWorld(true);
  const size = centreOn(root, inner);
  const N = n => car.getObjectByName(n);
  const flap = N('REAR_WING_FLAP'), fl = N('WHEEL_FL'), fr = N('WHEEL_FR');
  const rest = [flap, fl, fr].map(o => o && o.quaternion.clone());
  const at = t => {
    const D = 8, u = (t % D) / D, q = new THREE.Quaternion();
    if (flap) flap.quaternion.copy(rest[0]).multiply(q.setFromAxisAngle(v3(0, 0, 1), -0.42 * (seg(u, 0.12, 0.24) - seg(u, 0.5, 0.62))));
    const steer = 0.32 * Math.sin(u * TAU);
    if (fl) fl.quaternion.copy(rest[1]).multiply(q.setFromAxisAngle(v3(0, 1, 0), steer));
    if (fr) fr.quaternion.copy(rest[2]).multiply(q.setFromAxisAngle(v3(0, 1, 0), steer));
  };
  let t = 0;
  const P = n => { const o = N(n); if (!o) return v3(0, 1, 0); const b = new THREE.Box3().setFromObject(o, true); const c = b.getCenter(new THREE.Vector3()); c.y = b.max.y + 0.08; return root.worldToLocal(o.parent.localToWorld(o.parent.worldToLocal(c))); };
  root.updateMatrixWorld(true);
  const tags = [
    { text: 'Rear wing', sub: 'Downforce and drag', pos: P('REAR_WING_MAIN'), learn: 'Tilting the rear wing pushes the car down onto the road for grip in corners, and costs drag on the straights. The flap opens to cut drag. Drag grows with the square of speed: F = ½ρv²C_dA.' },
    { text: 'Front wing', sub: 'First to meet the air', pos: P('FRONT_WING_MAIN'), learn: 'The front wing turns the air before it reaches the wheels and floor. It adds downforce at the front so the car steers into a corner.' },
    { text: 'Halo', sub: 'Protects the driver', pos: P('HALO'), learn: 'The titanium halo over the cockpit protects the driver’s head from loose wheels and debris.' },
    { text: 'Sidepods', sub: 'Cooling', pos: P('SIDEPOD_L'), learn: 'Air goes into the sidepods to cool the engine. Their shape sends the rest of the air cleanly past the rear wheels.' }
  ];
  return { root, size, tags, tick(dt) { t += dt; at(t); }, status: () => '', anim: { duration: 8, nodes: [flap, fl, fr].filter(Boolean), at },
    pieces: () => meshesOf(car), enter: null };
}

async function claw({ onProgress }) {
  const g = await loadGLB('/assets/models/claw/claw-atelier.glb', onProgress, 3174148);
  const { createClawRig } = await import('/assets/models/claw/claw-rig-controller.mjs');
  const model = g.scene; calmGlass(model);
  const root = new THREE.Group(), inner = new THREE.Group();
  inner.add(model);
  const size = centreOn(root, inner);
  const rig = createClawRig(model, THREE);
  const N = n => model.getObjectByName(n);
  // one grab: from the chute to the prize pile, drop, close, lift, back over the chute, open
  const at = t => {
    const D = 9, u = (t % D) / D;
    const go = seg(u, 0.04, 0.3), back = seg(u, 0.62, 0.86);
    const x = -0.32 + (0.125 + 0.32) * go - (0.125 + 0.32) * back, depth = -0.27 + (-0.035 + 0.27) * go - (-0.035 + 0.27) * back;
    const drop = 0.23 * (seg(u, 0.32, 0.42) - seg(u, 0.5, 0.6));
    const open = 1 - seg(u, 0.43, 0.48) + seg(u, 0.88, 0.92);
    const hold = u > 0.45 && u < 0.9;
    rig.setPose({ x, depth, drop, open, holdPrize: true, joystickX: 0.15 * Math.sin(u * TAU * 2) * (u < 0.3 ? 1 : 0), button: u > 0.3 && u < 0.33 ? 1 : 0 });
    const cap = N('HELD_CAPSULE'); if (cap) cap.scale.setScalar(hold ? 1 : 0.0001);
  };
  at(0);
  let t = 0;
  root.updateMatrixWorld(true);
  const top = size.y;
  const at3 = (n, dy, fb) => { const o = N(n); if (!o) return fb; const p = o.getWorldPosition(new THREE.Vector3()); root.worldToLocal(p); p.y += dy; return p; };
  const tags = [
    { text: 'Claw', sub: 'Three fingers', pos: () => at3('CLAW_HOIST', 0.12, v3(0, top * 0.78, 0)), learn: 'The claw drops on a cable, closes three fingers and lifts. How tightly it grips decides whether the prize stays on the way to the chute.' },
    { text: 'Prize chute', sub: 'Drop it here', pos: at3('CHUTE_TARGET', 0.05, v3(-0.32, top * 0.45, 0.3)), learn: 'The claw carries the prize back over the chute and opens. On the study page you work out the chance of a win from many tries.' },
    { text: 'Joystick', sub: 'You steer the gantry', pos: at3('JOYSTICK_PIVOT', 0.16, v3(0.25, top * 0.5, 0.55)), learn: 'The joystick moves the gantry left, right, forward and back. The button starts the drop.' }
  ];
  const moving = ['GANTRY_X', 'GANTRY_Y', 'CLAW_HOIST', 'HOIST_CABLE', 'HOIST_CORD', 'ACTUATOR_SLIDER', 'HELD_CAPSULE', 'JOYSTICK_PIVOT', 'DROP_BUTTON',
    ...[0, 1, 2].flatMap(k => [`FINGER_${k}_SHOULDER`, `FINGER_${k}_LINKAGE`])].map(N).filter(Boolean);
  return { root, size, tags, tick(dt) { t += dt; at(t); }, status: () => '', anim: { duration: 9, nodes: moving, at }, pieces: () => meshesOf(model), enter: null };
}

async function heart({ onProgress }) {
  const g = await loadGLB('/study/m/heart/assets/heart_pump_lab.glb', onProgress, 839304);
  const { createHeartRig } = await import('/study/m/heart/heart-rig.js');
  const model = g.scene; calmGlass(model);
  const rig = createHeartRig(model);
  rig.setCutaway(true); rig.setArrows(true);
  const root = new THREE.Group(), inner = new THREE.Group();
  inner.add(model);
  rig.applyPhase(0.25);
  const size = centreOn(root, inner);
  root.updateMatrixWorld(true);
  // the model's own label anchors, with the study page's wording
  const LEARN = {
    Labels_RA: ['Right atrium', 'Blood back from the body', 'Receives lower-oxygen blood from the body through the venae cavae.'],
    Labels_RV: ['Right ventricle', 'Pumps to the lungs', 'Sends blood through the pulmonary valve to the lungs.'],
    Labels_LA: ['Left atrium', 'Blood back from the lungs', 'Receives higher-oxygen blood from the lungs through four pulmonary veins.'],
    Labels_LV: ['Left ventricle', 'Pumps to the body', 'Sends blood through the aortic valve and aorta to the body. Its muscle wall is the thickest.'],
    Labels_Aorta: ['Aorta', 'Out to the body', 'Carries higher-oxygen blood from the left ventricle towards the body.'],
    Labels_Mitral: ['Mitral valve', 'Two leaflets', 'Between the left atrium and left ventricle. Opens while the ventricle fills.']
  };
  const tags = [];
  for (const l of rig.labels) {
    const d = LEARN[l.name]; if (!d) continue;
    const p = l.node.getWorldPosition(new THREE.Vector3()); root.worldToLocal(p);
    tags.push({ text: d[0], sub: d[1], pos: p, learn: d[2] + ' The two pumps work in series.' });
  }
  const moving = [];
  model.traverse(o => { if (/^Hinge_|^Chamber_|^Chord_/.test(o.name)) moving.push(o); });
  const beat = 60 / 64;   // a calm 64 beats a minute
  const at = t => rig.applyPhase((t % beat) / beat);
  let t = 0;
  return { root, size, tags, tick(dt) { t += dt; at(t); }, status: () => '', anim: { duration: beat * 4, nodes: moving, at }, pieces: () => meshesOf(model), enter: null };
}

async function earth({ onProgress }) {
  const g = await loadGLB('/assets/models/earthspace/earthspace.glb', onProgress, 2673840);
  const s = g.scene;
  const sys = s.getObjectByName('EARTH_SYSTEM'), moon = s.getObjectByName('MOON'), spin = s.getObjectByName('EARTH_SPIN');
  const clouds = s.getObjectByName('CLOUDS');
  const root = new THREE.Group(), inner = new THREE.Group();
  // just the Earth and the Moon; the Moon goes round on its own pivot
  sys.removeFromParent(); sys.position.set(0, 0, 0); inner.add(sys);
  sys.updateMatrixWorld(true);
  const globe = s.getObjectByName('EARTH') || sys;
  const er = new THREE.Box3().setFromObject(globe, true).getSize(new THREE.Vector3()).y / 2;   // the Earth's own radius (the axis sticks out)
  const pivot = new THREE.Group(); pivot.name = 'MOON_ORBIT'; inner.add(pivot);
  if (moon) {
    moon.removeFromParent(); moon.updateMatrixWorld(true);
    const mb = new THREE.Box3().setFromObject(moon, true), mc = mb.getCenter(new THREE.Vector3());
    // re-centre the Moon's mesh on its own origin so it can sit on the orbit
    moon.geometry = moon.geometry.clone(); moon.geometry.translate(-mc.x, -mc.y, -mc.z); moon.position.set(er * 2.1, 0, 0);
    pivot.add(moon);
  }
  // stand the globe on an invisible base: lift so the bottom of the Earth is a little above the ground
  inner.position.y = er * 1.15;
  root.add(inner);
  const span = 2 * (er * 2.1 + 0.3 * er), size = new THREE.Vector3(span, er * 2.45, span);
  const at = t => {
    const D = 24, u = (t % D) / D;
    if (spin) spin.rotation.y = u * TAU;
    if (clouds && clouds.parent !== spin) clouds.rotation.y = u * TAU * 1.0;
    pivot.rotation.y = -u * TAU; pivot.rotation.z = 0.09;
  };
  at(0);
  let t = 0;
  root.updateMatrixWorld(true);
  const nz = s.getObjectByName('NZ_PIN_HEAD');
  const tags = [
    { text: 'Aotearoa', sub: 'The pin is on Wellington', pos: nz ? () => { const p = nz.getWorldPosition(new THREE.Vector3()); return root.worldToLocal(p).add(v3(0, er * 0.12, 0)); } : v3(0, er * 2.2, 0), learn: 'The Earth turns once a day, so New Zealand moves from night into day. The tilt of the axis gives the seasons.' },
    { text: 'The Moon', sub: 'Goes round about every 27 days', pos: () => { const p = moon ? moon.getWorldPosition(new THREE.Vector3()) : v3(); return root.worldToLocal(p).add(v3(0, er * 0.45, 0)); }, learn: 'The Moon goes round the Earth about every 27 days. Here it is far closer than it really is: at true scale it would be about 30 Earths away.' },
    { text: 'The axis', sub: 'Tilted 23.4°', pos: v3(0, inner.position.y + er * 1.25, 0), learn: 'The Earth’s axis is tilted 23.4°. In December the south leans towards the Sun, which is why it is summer here.' }
  ];
  return { root, size, tags, tick(dt) { t += dt; at(t); }, status: () => '', anim: { duration: 24, nodes: [spin, pivot, clouds].filter(Boolean), at },
    pieces: () => meshesOf(inner), enter: null };
}

// ════════════════════════════════════════════════════════════════════════════════════════════ places (the twins)

// the twins' loader, with the SimReady GLBs (meshopt) and textures
async function twinAssets(files, tex, ctx) {
  const kit = await import('/assets/twin/3/kit.js');
  const r = ctx.renderer || { capabilities: { getMaxAnisotropy: () => 4 } };
  return { kit, ...(await kit.loadModels({ files, tex, renderer: r, onProgress: ctx.onProgress })) };
}
// a ping-pong move for the baked files: there and back again, so the loop has no jump
function pingPong(node, from, to, yaw, D, hold = 0.18) {
  return t => {
    const u = (t % D) / D, f = u < 0.5 ? seg(u, hold / 2, 0.5 - hold / 2) : 1 - seg(u, 0.5 + hold / 2, 1 - hold / 2);
    node.visible = true; node.position.lerpVectors(from, to, f); node.rotation.y = yaw;
  };
}

async function dairy(ctx) {
  const [{ World, FILES, TEX }, { Sim, ASSUME }, L] = await Promise.all([import('/dairy/plant/world.js'), import('/dairy/plant/sim.js'), import('/dairy/plant/layout.js')]);
  const { kit, assets, tex } = await twinAssets(FILES, TEX, ctx);
  const sim = new Sim({ month: 4, bays: 4, forklifts: 2 });
  while (sim.t < 4.4 * 3600) sim.step(0.5);       // 09:24 in October: the morning milk is arriving
  const inner = new THREE.Group(), world = new World(inner, assets, tex, sim);
  const far = v3(40, 120, 160);
  world.sync(0.016, far, 1);
  stripShadowProxies(inner);
  const root = new THREE.Group();
  const site = new THREE.Box3(v3(-96, 0, -58), v3(104, 46, 64));
  trimGround(inner, site, ctx.mode === 'inside' ? 60 : 4);
  const steam = () => { if (world.steamMat) world.steamMat.uniforms.uScale.value = innerHeight * 0.9 * (ctx.scale || 1); };
  const size = centreOn(root, inner, site);
  const off = inner.position.clone();
  const W = (x, y, z) => v3(x, y, z).add(off);
  const tagDefs = [
    { text: 'Tanker bays', pos: [-62, 8.5, 0], learn: 'Tankers take the first free bay. The driver connects a hose, and nothing is pumped until a sample of the milk passes its test.' },
    { text: 'Silos', pos: [-28, 21, -14], learn: 'Six stainless silos hold the raw milk. They smooth the gap between milk arriving in waves and the dryer drawing it steadily.' },
    { text: 'Dryer tower', pos: [17, 45, -18], learn: 'The evaporator takes out most of the water, then the spray dryer turns the concentrate into powder, up to 30 tonnes an hour in this model.' },
    { text: 'Bagging', pos: [48, 5.2, -18], learn: 'Two baggers fill 25 kg sacks. Belts carry them to palletisers that stack forty to a pallet.' },
    { text: 'Containers', pos: [83, 4.6, 2], learn: 'Forklifts load older, released pallets into 20 ft containers, 22 tonnes each, at the dock.' }
  ];
  const tags = tagDefs.map(d => ({ text: d.text, sub: '', pos: W(...d.pos), learn: d.learn }));
  const state = { speed: 20, acc: 0, cam: v3() };
  const pct = x => Math.round(x * 100) + '%';
  function live() {
    const m = sim.metrics();
    tags[0].sub = m.queue ? `${m.baysBusy} of ${m.baysOpen} busy · ${m.queue} waiting` : `${m.baysBusy} of ${m.baysOpen} busy`;
    tags[1].sub = `${pct(m.silo)} full`;
    tags[2].sub = m.rate > 0 ? `${m.rate.toFixed(1)} t an hour` : 'Stopped';
    tags[3].sub = `${m.onBelts} bags on the belts`;
    tags[4].sub = `${m.boxes} sealed today`;
    return m;
  }
  let m = live(), lt = 0;
  // the baked loop: a tanker backs into bay 2 and pulls out again; a forklift shuttles in the store
  const tv = world.tankerViews.find(v => v.id != null) || world.tankerViews[0];
  const fk = world.views.find(v => v.a.kind === 'forklift');
  const animNodes = [], animFns = [];
  if (tv) { const p0 = tv.truck.position.clone(), yaw = tv.truck.rotation.y, d = v3(Math.sin(yaw), 0, Math.cos(yaw));
    const t0 = tv.trailer.position.clone(), ty = tv.trailer.rotation.y;
    animNodes.push(tv.truck, tv.trailer);
    animFns.push(pingPong(tv.truck, p0.clone().addScaledVector(d, 16), p0, yaw, 12), pingPong(tv.trailer, t0.clone().addScaledVector(d, 16), t0, ty, 12)); }
  if (fk) { const p0 = fk.g.position.clone(), yaw = fk.g.rotation.y, d = v3(Math.sin(yaw), 0, Math.cos(yaw));
    animNodes.push(fk.g); animFns.push(pingPong(fk.g, p0, p0.clone().addScaledVector(d, 9), yaw, 12, 0.3)); }
  return {
    root, size, tags, world, sim,
    tick(dt, cam) {
      state.acc += dt * state.speed; let n = 0;
      while (state.acc > 0.5 && n < 200) { sim.step(0.5); state.acc -= 0.5; n++; }
      if (n >= 200) state.acc = 0;
      world.sync(dt, cam ? state.cam.copy(cam).sub(off) : far, state.speed); steam();
      lt += dt; if (lt > 0.5) { lt = 0; m = live(); }
    },
    status: () => `${m.clock} · ${m.month} · Simulated`, rescale: steam,
    enter: face(-46, 22, -62, 2, off),
    anim: { duration: 12, nodes: animNodes, at: t => animFns.forEach(f => f(t)) },
    pieces: () => inner.children[0].children
  };
}

async function ed(ctx) {
  const [{ World, FILES, TEX }, { ED }, L] = await Promise.all([import('/ed/floor/world.js'), import('/ed/sim.js'), import('/ed/floor/layout.js')]);
  const { assets, tex } = await twinAssets(FILES, TEX, ctx);
  const S = { ...ED.BASE }, st = ED.newState(S, 7);
  st.t = 5 * 1440; while (st.t < 7 * 1440 + 600) ED.step(S, st);   // Monday 10:00 after two days' warm-up, as on the page
  const inner = new THREE.Group(), world = new World(inner, assets, tex);
  const far = v3(24, 60, 80);
  for (let i = 0; i < 40; i++) world.sync(st, S, 0.1, far);
  stripShadowProxies(inner);
  const root = new THREE.Group();
  const site = new THREE.Box3(v3(-44, 0, -30), v3(68, 12, 34));
  trimGround(inner, site, ctx.mode === 'inside' ? 50 : 3);
  const size = centreOn(root, inner, site);
  const off = inner.position.clone(), W = (x, y, z) => v3(x, y, z).add(off);
  const tags = [
    { text: 'Waiting room', sub: '', pos: W(-27, 2.6, 13), learn: 'Walk-ins take a seat until triage. The most urgent are seen first, so the longest waits fall on the least urgent.' },
    { text: 'Triage', sub: 'Two nurses', pos: W(-9.6, 2.4, 14), learn: 'Two triage nurses sort everyone by urgency, in two to six minutes each.' },
    { text: 'Cubicles', sub: '', pos: W(6, 2.8, -10), learn: 'An amber light over a cubicle means its patient is ready for a ward but has no bed, so the cubicle can’t take the next person.' },
    { text: 'Resus', sub: '4 bays', pos: W(30, 2.6, -14), learn: 'Four resus bays with surgical lights, monitors and a crash cart. The most urgent patients go straight in.' },
    { text: 'Ambulance bay', sub: '', pos: W(48, 5.4, 10), learn: 'One ambulance is drawn for each patient not yet handed over. When the department is full, they queue down the drive.' }
  ];
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const clock = () => { const mm = st.t % 1440; return `${String(Math.floor(mm / 60)).padStart(2, '0')}:${String(mm % 60).padStart(2, '0')}`; };
  function live() {
    const s = ED.stats(st), inZ = w => st.pts.filter(p => p.where === w).length;
    tags[0].sub = `${st.pts.filter(p => p.state === 'wait' && !p.amb).length} waiting`;
    tags[2].sub = `${inZ('cub')} of ${S.cubicles} · ${s.board} waiting for a ward bed`;
    tags[3].sub = `${inZ('resus')} of 4 in use`;
    tags[4].sub = `${world.inAmb || 0} not yet handed over`;
  }
  live();
  const state = { speed: 6, acc: 0, cam: v3() }; let lt = 0;
  // the baked loop: an ambulance backs in under the canopy and pulls away
  const amb = world.ambs[world.ambs.length - 1];
  const animNodes = [], animFns = [];
  if (amb) { const to = v3(L.HALL.x1 + 6, 0, 9), from = to.clone().add(v3(14, 0, 0)); animNodes.push(amb); animFns.push(pingPong(amb, from, to, Math.PI, 12, 0.3)); }
  return {
    root, size, tags, world,
    tick(dt, cam) {
      state.acc += dt * state.speed; let n = 0; while (state.acc >= 1 && n < 60) { ED.step(S, st); state.acc -= 1; n++; }
      world.sync(st, S, Math.max(dt, 0.016), cam ? state.cam.copy(cam).sub(off) : far);
      lt += dt; if (lt > 0.5) { lt = 0; live(); }
    },
    status: () => `${DAYS[ED.dayOf(st.t) % 7]} ${clock()} · Simulated`,
    enter: face(-2, 9, 8, -10, off),
    anim: { duration: 12, nodes: animNodes, at: t => animFns.forEach(f => f(t)) },
    pieces: () => inner.children[0].children
  };
}

async function dc(ctx) {
  const [{ World, ASSET_FILES, TEX_FILES }, { Sim }] = await Promise.all([import('/store/dc/world.js'), import('/store/dc/sim.js')]);
  const files = Object.fromEntries(Object.entries(ASSET_FILES).map(([k, b]) => [k, { url: `/assets/models/simready/${k}.glb`, bytes: b }]));
  const texs = Object.fromEntries(TEX_FILES.map(k => [k, `/assets/models/simready/tex/${k}.webp`]));
  const { assets, tex } = await twinAssets(files, texs, ctx);
  const sim = new Sim(11);
  while (sim.t < 1500) sim.step(0.1);   // 25 minutes into the shift: aisles busy, trucks at the doors
  const inner = new THREE.Group(), world = new World(inner, assets, tex, sim, { tier: 'low' });
  const far = v3(75, 45, 42);
  world.speed = 1; world.sync(0.016, far);
  stripShadowProxies(inner);
  const root = new THREE.Group();
  const site = new THREE.Box3(v3(-44, 0, -30), v3(56, 12, 30));
  trimGround(inner, site, ctx.mode === 'inside' ? 50 : 3);
  const size = centreOn(root, inner, site);
  const off = inner.position.clone(), W = (x, y, z) => v3(x, y, z).add(off);
  const tags = [
    { text: 'Inbound', sub: 'Doors 1–2', pos: W(27, 3.4, -13), learn: 'Supplier trucks back onto doors 1 and 2. A forklift unloads each pallet, and the receiver checks it before it can be stored.' },
    { text: 'Racking', sub: '', pos: W(-20, 7.0, -7.4), learn: 'Order pickers lift checked pallets into reserve, up to 5.4 m high, and let a full pallet down to the pick face when it runs low.' },
    { text: 'Pick aisles', sub: '', pos: W(-14, 2.8, -4.3), learn: 'Pickers build store pallets with hand pallet jacks, carton by carton. Their walking sets the pace of the whole building.' },
    { text: 'Wrap and label', sub: '', pos: W(8, 3.5, 13.4), learn: 'Finished pallets queue for two turntable wrappers, then get a printed label before going to their store’s lane.' },
    { text: 'Dispatch', sub: 'Doors 3–6', pos: W(26, 3.2, 7), learn: 'Each store has a lane in front of its door. The truck leaves for the stores when it is full.' }
  ];
  let m = sim.metrics(), lt = 0;
  const live = () => { m = sim.metrics(); tags[1].sub = `Reserve ${Math.round(m.reserve * 100)}% full`; tags[2].sub = `${m.cartonsPerHour} cartons an hour`; tags[3].sub = `${m.queue} waiting`; };
  live();
  const state = { speed: 4, acc: 0, cam: v3() };
  const fk = world.views.find(v => v.a.kind === 'forklift'), op = world.views.find(v => v.a.kind === 'orderPicker');
  const animNodes = [], animFns = [];
  for (const [v, dist] of [[fk, 8], [op, 6]]) { if (!v) continue; const p0 = v.g.position.clone(), yaw = v.g.rotation.y, d = v3(Math.sin(yaw), 0, Math.cos(yaw)); animNodes.push(v.g); animFns.push(pingPong(v.g, p0, p0.clone().addScaledVector(d, dist), yaw, 10, 0.3)); }
  return {
    root, size, tags, world, sim,
    tick(dt, cam) {
      state.acc += dt * state.speed; let n = 0; while (state.acc > 0.1 && n < 80) { sim.step(0.1); state.acc -= 0.1; n++; } if (n >= 80) state.acc = 0;
      world.speed = state.speed; world.sync(dt, cam ? state.cam.copy(cam).sub(off) : far);
      lt += dt; if (lt > 0.5) { lt = 0; live(); }
    },
    status: () => `${m.clock} · Simulated`,
    enter: face(-3.5, -7.98, -30, -7.98, off),
    anim: { duration: 10, nodes: animNodes, at: t => animFns.forEach(f => f(t)) },
    pieces: () => inner.children[0].children
  };
}

async function cafe(ctx) {
  const g = await loadGLB('/assets/models/cafe/cafe-venue.glb', ctx.onProgress, 5668424);
  const [{ createCafeRig }, kit] = await Promise.all([import('/assets/models/cafe/cafe-rig-controller.mjs'), import('/assets/twin/3/kit.js')]);
  const venue = g.scene; calmGlass(venue);
  const rig = createCafeRig(venue, THREE);
  // A clearly illustrative stocked architectural view, not the live café simulation.
  rig.setVisualState({ mode: 'cafe', queue: 0, lamps: .2, drinksQueued: 0, umbrellas: [1,1,1,1], cabinet: { scone: 8, toastie: 8, salad: 8, brownie: 8, muffin: 8 } });
  const inner = new THREE.Group(); inner.add(venue);
  venue.updateMatrixWorld(true);
  const wp = n => { const o = venue.getObjectByName(n); if (!o) return null; const b = new THREE.Box3().setFromObject(o, true); if (b.isEmpty()) return o.getWorldPosition(new THREE.Vector3()); return b.getCenter(new THREE.Vector3()); };
  // plain figures (never a likeness): two staff behind the counter, a short queue and a few people at tables
  const people = [], staff = [];
  const outfit = (vest, trouser = 0x343842) => ({ vest, band: vest, shirt: vest, trouser });
  const add = (i, o, x, z, yaw, pose) => { const p = kit.makePerson(i, o); p.position.set(x, 0.15, z); p.rotation.y = yaw; kit.animatePerson(p, false, 0, 1, pose); p.visible = ctx.activity === true; inner.add(p); people.push(p); return p; };
  const esp = wp('ESPRESSO_MAIN') || v3(4.5, 1, -1.5), pass = wp('PASS') || v3(3, 1, -4);
  staff.push(add(1, outfit(0x2f2a2e, 0x2b2730), esp.x, esp.z - 0.75, 0, 'work'));
  staff.push(add(4, outfit(0xe9e6e1, 0x3a3a3f), pass.x, pass.z - 0.8, 0, 'work'));
  const Q = [0, 1, 2].map(i => venue.getObjectByName('QUEUE_SPOT_0' + i)).filter(Boolean).map(o => o.getWorldPosition(new THREE.Vector3()));
  const walker = Q.length ? add(7, outfit(0x6b7f8c), Q[0].x, Q[0].z, Math.PI, 'stand') : null;
  Q.slice(1).forEach((q, i) => add(8 + i, outfit([0x8c6f5a, 0x5f6b55][i % 2]), q.x, q.z, Math.PI, 'stand'));
  for (const [tb, i] of [['TABLE_05_CHAIR_0', 11], ['TABLE_07_CHAIR_1', 12], ['TABLE_01_CHAIR_0', 13]]) {
    const c = venue.getObjectByName(tb); const t = venue.getObjectByName(tb.slice(0, 8)); if (!c || !t) continue;
    const cp = c.getWorldPosition(new THREE.Vector3()), tp = t.getWorldPosition(new THREE.Vector3());
    const p = add(i, outfit([0x7a5d6e, 0x4f6a73, 0x8a7a5c][i % 3]), cp.x, cp.z, Math.atan2(tp.x - cp.x, tp.z - cp.z), 'seated'); p.position.y = -0.24;
  }
  const root = new THREE.Group();
  const size = centreOn(root, inner);
  root.updateMatrixWorld(true);
  const off = inner.position.clone();
  const L = (n, dy, text, sub, learn) => { const p = wp(n); return p ? { text, sub, pos: root.worldToLocal(p.clone().add(v3(0, dy, 0))), learn } : null; };
  root.updateMatrixWorld(true);
  const tags = [
    L('ESPRESSO_MAIN', 0.9, 'Espresso machine', 'Two groups', 'The barista pulls two shots at a time. On the café page, how many orders arrive in a rush decides how long the queue gets.'),
    L('PASS', 0.9, 'Kitchen pass', 'Tickets and plates', 'The kitchen puts finished plates on the pass, with the ticket, for the floor staff to take out.'),
    L('QUEUE_SPOT_00', 2.0, 'The queue', 'Order at the counter', 'People queue to order and pay. Each one adds a coffee for the barista and maybe a plate for the kitchen.'),
    L('CAB_SCONE', 0.6, 'Cabinet', 'Food made earlier', 'Cabinet food is made before opening, so it sells fast at busy times. What is left at close is waste.')
  ].filter(Boolean);
  // the baked loop and the live motion: the staff work, the front of the queue steps up to the counter and back
  const animNodes = [], animFns = [];
  for (const s of (ctx.activity ? staff : [])) { const u = s.userData; animNodes.push(u.armL, u.armR); }
  animFns.push(t => { for (const s of staff) { const u = s.userData, w = Math.sin(t / 0.38 + u.phase) * 0.35; u.armL.rotation.x = -0.9 + w; u.armR.rotation.x = -0.75 - w; } });
  if (ctx.activity && walker && Q[0]) {
    const from = walker.position.clone(), to = from.clone().add(v3(-0.9, 0, 0)); const u = walker.userData;
    animNodes.push(walker, u.legL, u.legR);
    animFns.push(t => { const D = 8, k = (t % D) / D, f = k < 0.5 ? seg(k, 0.1, 0.4) : 1 - seg(k, 0.6, 0.9); walker.position.lerpVectors(from, to, f);
      const moving = (k > 0.1 && k < 0.4) || (k > 0.6 && k < 0.9), s = moving ? Math.sin(t * 7) : 0; u.legL.rotation.x = s * 0.5; u.legR.rotation.x = -s * 0.5; walker.rotation.y = -Math.PI / 2 + (k < 0.5 ? 0 : Math.PI); });
  }
  const at = t => animFns.forEach(f => f(t));
  let t = 0;
  return {
    root, size, tags, tick(dt) { t += dt; at(t); }, status: () => ctx.activity ? 'Illustrative activity figures' : 'Architectural view · illustrative stocked cabinet',
    enter: face(5.2, 5.2, 2, -2, off),
    anim: { duration: ctx.activity ? 8 : 0, nodes: animNodes, at },
    pieces: () => inner.children.flatMap(c => c === venue ? venue.children : [c])
  };
}

const BUILDERS = { f1, claw, heart, earth, dairy, ed, dc, cafe };
export async function buildWorld(id, ctx = {}) {
  const b = BUILDERS[id];
  if (!b) throw new Error('No world called ' + id);
  const w = await b(ctx);
  w.id = id;
  w.root.name = 'world_' + id;
  w.root.updateMatrixWorld(true);
  return w;
}
export const tagPos = t => (typeof t.pos === 'function' ? t.pos() : t.pos);
