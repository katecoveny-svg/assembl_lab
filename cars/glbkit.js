// The hero car as a real model: loads a Blender-built GLB (assets/models/vehicles/<model>.glb: glTF Y-up, metres, nose +x, the
// driver's side of a right-hand-drive car +z, origin at ground centre, rig nodes VEHICLE_ROOT / STEER_* / HUB_* / WHEEL_*, one
// PAINT material) and gives the stage the same interface as a kit3d maquette, measured off the model itself by ray casts:
//   const K = await loadGlbKit(THREE, car.render, kit)
//   K.group                                    the model, ready to add to the car group
//   K.topAt(x, z) .sideAt(x, y, side) .windscreen(t, z)   a point on the bodywork / windscreen glass and its outward normal: { p, n }
//   K.windscreenHalf(t)                        how far the windscreen glass reaches either side of the centre at t (0 cowl → 1 roof)
//   K.T { wf, wb, wr, cowl, bonnetF, roofR, bot, belt }   wheel centres from the hub nodes; the other stations measured on the model
//   K.L .W .H .shadowTex .paint                size, a contact shadow for an (L + 0.7) × (W + 0.7) plane, the paint colour
// Throws when the file can't be loaded or isn't a vehicle; the stage then keeps the maquette.
export async function loadGlbKit(THREE, render, kit) {
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const gltf = await new GLTFLoader().loadAsync(render.glb);
  const group = gltf.scene, root = group.getObjectByName("VEHICLE_ROOT");
  if (!root) throw new Error("the model has no VEHICLE_ROOT");
  const node = (n) => { const o = root.getObjectByName(n); if (!o) throw new Error("the model has no " + n); return o; };
  const meshes = (o, keep = () => true) => { const out = []; o.traverse((m) => { if (m.isMesh && keep(m)) out.push(m); }); return out; };
  const body = meshes(node("BODY")), detail = node("BODY_DETAIL"), glass = meshes(detail, (m) => m.material && m.material.name === "GLASS");
  if (!body.length || !glass.length) throw new Error("the model has no body or no glass");

  // finish: the listing's paint on the one PAINT material; shadows from the solid parts only
  const P = render.glbPaint || {}, paint = new THREE.Color(P.hex || render.paint);
  group.traverse((m) => {
    if (!m.isMesh) return;
    const mats = Array.isArray(m.material) ? m.material : [m.material], name = mats[0] && mats[0].name;
    m.castShadow = !/^(GLASS|LENS|FRIT|GAP|SEAL)$/.test(name); m.receiveShadow = /^(TYRE|RIM|RIM_INNER|BRAKE|CALIPER|ARCH|UNDER)$/.test(name);
    for (const mt of mats) {
      if (mt.name === "PAINT") { mt.color.copy(paint); if (P.metalness != null) mt.metalness = P.metalness; if (P.roughness != null) mt.roughness = P.roughness; mt.envMapIntensity = 1.0; }
      else if (mt.name === "GLASS") { mt.roughness = 0.14; mt.envMapIntensity = 0.85; }
      else if (mt.name === "LIGHTBAR" || mt.name === "TAIL_LINE") mt.emissiveIntensity = 0.6;
    }
  });
  group.updateMatrixWorld(true);

  // ---- probes (car space: the model stands at the origin, unrotated, while they run) ---------------------------------------
  const V = (x, y, z) => new THREE.Vector3(x, y, z), DOWN = V(0, -1, 0), rc = new THREE.Raycaster();
  const cast = (targets, o, d) => {
    rc.set(o, d); rc.far = 10;
    const h = rc.intersectObjects(targets, false)[0]; if (!h) return null;
    const n = h.face.normal.clone().transformDirection(h.object.matrixWorld); if (n.dot(d) > 0) n.negate();
    return { p: h.point.clone(), n, obj: h.object };
  };
  const box = new THREE.Box3(); body.forEach((m) => box.expandByObject(m));
  const L = box.max.x - box.min.x, W = box.max.z - box.min.z, H = box.max.y, xF = box.max.x, xR = box.min.x;
  const hub = (n) => node(n).getWorldPosition(V(0, 0, 0)), fl = hub("STEER_FL"), rl = hub("HUB_RL"), wr = fl.y;
  const topAt = (x, z) => { const h = cast(body, V(x, H + 2, z), DOWN); if (!h) return { p: V(x, H, z), n: V(0, 1, 0) }; if (h.n.y < 0) h.n.negate(); return { p: h.p, n: h.n }; };
  const sideAt = (x, y, side = 1) => { const d = V(0, 0, -side), h = cast(body, V(x, y, side * (W + 2)), d); if (!h) return { p: V(x, y, side * W / 2), n: V(0, 0, side) }; return { p: h.p, n: h.n }; };
  // the windscreen: glass seen from above whose normal leans forward; the rear window leans back
  const isScreen = (h, front) => h && (front ? h.n.x > 0.25 : h.n.x < -0.25) && h.n.y > 0.2;
  const ranges = new Map();
  function glassRange(z, front = true) {
    const key = (front ? "f" : "r") + z.toFixed(3); if (ranges.has(key)) return ranges.get(key);
    let a = null, b = null;
    for (let x = front ? 0 : xR; x <= (front ? xF : 0); x += 0.015) { const h = cast(glass, V(x, H + 2, z), DOWN); if (isScreen(h, front)) { if (a === null) a = h.p.x; b = h.p.x; } }
    const r = a === null ? null : [a, b]; ranges.set(key, r); return r;
  }
  const centre = glassRange(0, true), back = glassRange(0, false);
  if (!centre) throw new Error("no windscreen glass found");
  const wsX = (t, r) => r[1] - 0.035 + (r[0] + 0.03 - (r[1] - 0.035)) * t; // t = 0 at the cowl (the screen's low, front edge) → 1 at the roof
  function windscreen(t, z) {
    const r = glassRange(Math.round(z * 200) / 200) || centre, x = wsX(t, r);
    const h = cast(glass, V(x, H + 2, z), DOWN) || cast(body, V(x, H + 2, z), DOWN);
    return h ? { p: h.p, n: h.n.y < 0 ? h.n.negate() : h.n } : topAt(x, z);
  }
  function windscreenHalf(t) {
    const x = wsX(t, centre); let z = 0;
    while (z < W / 2 && isScreen(cast(glass, V(x, H + 2, z + 0.01), DOWN), true)) z += 0.01;
    return z;
  }
  // stations: the bonnet's front edge (where the top turns up out of the nose), the roof's rear end (top of the rear glass), the
  // belt at the doors (where the side glass starts), the sill
  let bonnetF = xF - 0.15;
  for (let x = xF - 0.01; x > centre[1]; x -= 0.01) { if (topAt(x, 0).n.y > 0.9) { bonnetF = x; break; } }
  const roofR = back ? back[1] : xR + 0.6, xm = (fl.x + rl.x) / 2;
  let belt = H * 0.66;
  for (let y = 0.6; y < H; y += 0.01) { const h = cast([...body, ...glass], V(xm, y, W + 2), V(0, 0, -1)); if (h && glass.includes(h.obj)) { belt = y - 0.01; break; } }
  const T = { wf: fl.x, wb: rl.x, wr, cowl: centre[1], roofF: centre[0], bonnetF, roofR, bot: box.min.y, belt };
  const shadowTex = kit && kit.shadowFor ? kit.shadowFor({ L, W, wf: fl.x, wb: rl.x, tw: 0.225 }) : null;
  return { group, topAt, sideAt, windscreen, windscreenHalf, T, L, W, H, shadowTex, paint, stations: root.userData.stations_gltf_m || null };
}
