// The hero: a real Gaussian-splat capture of a car (CC BY, credited on the page) standing in a showroom we build in three.js, in
// the "Chrome Dreams" language: dark polished concrete, stone and glass walls, lilac cove lines, champagne hairlines, soft reflections.
// When the capture arrives it is first built from small interlocking bricks (off-white, charcoal, terracotta, beige), voxelised from
// the capture's own points, which then resolve into the capture itself: the "assembly" motif, motion that shows work happening.
// The camera drifts slowly around the capture's best side; drag turns it by hand. Rendered on demand; pause() stops the drift.
export async function mountHero(host, o = {}) {
  const { url, onProgress, shift = .2, angle = .62, range = .22, sign = ["", ""], capture = false } = o;
  const [THREE, Spark, PP] = await Promise.all([import("three"), import("@sparkjsdev/spark"), o.bloom !== true ? null : Promise.all([
    import("three/addons/postprocessing/EffectComposer.js"), import("three/addons/postprocessing/RenderPass.js"),
    import("three/addons/postprocessing/UnrealBloomPass.js"), import("three/addons/postprocessing/OutputPass.js")]).catch(() => null)]);
  const C = (h) => new THREE.Color(h);
  const canvas = document.createElement("canvas"); canvas.className = "hero-cv"; canvas.setAttribute("aria-hidden", "true"); host.prepend(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance", preserveDrawingBuffer: capture });
  const coarse = matchMedia("(pointer: coarse)").matches;
  renderer.setPixelRatio(o.dpr || Math.min(devicePixelRatio || 1, coarse ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, .05, 120);
  const INK = 0x131316; scene.background = C(INK); scene.fog = new THREE.Fog(INK, 18, 40);
  let dirty = 3, paused = !!o.paused, vis = true, raf = 0, last = performance.now(), drag = null, t = 0, yaw = 0, phase = "room", ph0 = 0;
  let frame = () => { raf = 0; };
  const kick = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  const spark = new Spark.SparkRenderer({ renderer, onDirty: () => { dirty = Math.max(dirty, 2); kick(); } }); scene.add(spark);

  // ---------------------------------------------------------------------------------------------- materials
  const tex = (w, h, draw) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const concrete = tex(512, 512, (x, w, h) => { x.fillStyle = "#3a393d"; x.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { const r = Math.random() * 26 + 2, a = Math.random() * .05; x.fillStyle = `rgba(${Math.random() < .5 ? "255,255,255" : "0,0,0"},${a})`; x.beginPath(); x.arc(Math.random() * w, Math.random() * h, r, 0, 7); x.fill(); } });
  concrete.wrapS = concrete.wrapT = THREE.RepeatWrapping; concrete.repeat.set(7, 7);
  // warm stone: a vertical wash (lighter where the cove light lands at the top), with a faint mottle
  function stoneTex(v) { return tex(128, 512, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, v ? "#d3c6bd" : "#dccfc4"); g.addColorStop(.18, v ? "#c4b7aa" : "#cdbfb1"); g.addColorStop(1, v ? "#a2968a" : "#ab9f92"); x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) { x.fillStyle = `rgba(${Math.random() < .5 ? "255,250,240" : "40,30,25"},${Math.random() * .035})`; x.beginPath(); x.arc(Math.random() * w, Math.random() * h, Math.random() * 14 + 2, 0, 7); x.fill(); } }); }
  const glow = (hex, k = 3.2) => new THREE.MeshBasicMaterial({ color: C(hex).multiplyScalar(k), toneMapped: false, fog: false });
  const LILAC = "#B9A6EA", CHAMP = "#CDB591";
  const M = {
    floor: new THREE.MeshStandardMaterial({ map: concrete, color: C("#8d8a90"), roughness: .3, metalness: 0, envMapIntensity: 1.1 }),
    stone: new THREE.MeshStandardMaterial({ map: stoneTex(0), roughness: .8, envMapIntensity: .55 }),
    stone2: new THREE.MeshStandardMaterial({ map: stoneTex(1), roughness: .84, envMapIntensity: .5 }),
    plinth: new THREE.MeshStandardMaterial({ color: C("#d8d2c8"), roughness: .5, envMapIntensity: .8 }),
    col: new THREE.MeshStandardMaterial({ color: C("#9e9890"), roughness: .9 }),
    glass: new THREE.MeshPhysicalMaterial({ color: C("#16161c"), roughness: .06, metalness: 0, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 1.6, transparent: true, opacity: .92 }),
    champ: new THREE.MeshStandardMaterial({ color: C(CHAMP), roughness: .26, metalness: 1, envMapIntensity: 1.4 }),
    ceil: new THREE.MeshStandardMaterial({ color: C("#1b1b20"), roughness: .9 }),
    lilac: glow(LILAC, 3.6), warm: glow("#FFF1E0", .9),
  };
  // reflections: a dark room of soft boxes and lilac strips, so concrete, glass and champagne carry long, quiet highlights
  { const env = new THREE.Scene(); env.background = C("#0d0d10");
    const box = (w, h, p, r, m) => { const b = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); b.position.set(...p); b.rotation.set(...r); env.add(b); };
    const soft = new THREE.MeshBasicMaterial({ color: C("#fff6ec").multiplyScalar(.95), side: THREE.DoubleSide }), lil = new THREE.MeshBasicMaterial({ color: C(LILAC).multiplyScalar(.9), side: THREE.DoubleSide });
    box(16, 2.4, [0, 9, 0], [Math.PI / 2, 0, 0], soft); box(.3, 20, [-9, 6, 0], [Math.PI / 2, 0, 0], lil); box(20, .3, [0, 6, -9], [0, 0, 0], lil); box(3, 6, [10, 3, 4], [0, -Math.PI / 2, 0], soft);
    const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(env, .02).texture; pm.dispose(); }
  scene.add(new THREE.HemisphereLight(0xdcd4ec, 0x141418, .55));
  const key = new THREE.SpotLight(0xfff2e4, 45, 30, .55, .85, 1.6); key.position.set(2.5, 9, 3.5); key.target.position.set(0, 0, 0); scene.add(key, key.target);
  const fillL = new THREE.PointLight(0xb9a6ea, 12, 18, 1.8); fillL.position.set(-7, 5.5, -6); scene.add(fillL);

  // ---------------------------------------------------------------------------------------------- the room
  // a lit line gets a soft halo around it (no bloom pass: cheaper on phones, and no blow-outs on the paint)
  const haloMat = new THREE.MeshBasicMaterial({ color: C(LILAC), transparent: true, opacity: .16, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const add = (geo, mat, p, r = [0, 0, 0]) => { const m = new THREE.Mesh(geo, mat); m.position.set(...p); m.rotation.set(...r); scene.add(m);
    if (mat === M.lilac && geo.parameters && geo.parameters.width !== undefined) { const { width: w, height: h, depth: d } = geo.parameters, k = (v) => v < .2 ? v + .22 : v;
      for (const s of []) { const hm = new THREE.Mesh(new THREE.BoxGeometry(w < .2 ? .22 * s : w, h < .2 ? .14 * s : h, d < .2 ? .22 * s : d), haloMat); hm.position.copy(m.position); hm.rotation.copy(m.rotation); scene.add(hm); } }
    return m; };
  add(new THREE.PlaneGeometry(80, 80), M.floor, [0, -.14, 0], [-Math.PI / 2, 0, 0]);
  add(new THREE.PlaneGeometry(80, 80), M.ceil, [0, 7.2, 0], [Math.PI / 2, 0, 0]);
  // wall A (x = -10): stone panels with shadow gaps, a stone sign panel lit from below
  for (let z = -12; z < 10; z += 3) add(new THREE.BoxGeometry(.3, 7.2, 2.94), z % 6 === 0 ? M.stone : M.stone2, [-10.15, 3.46, z + 1.5]);
  add(new THREE.BoxGeometry(.06, .025, 22), M.lilac, [-9.97, .02, -1]);           // the cove at the wall's foot
  add(new THREE.BoxGeometry(.06, .025, 22), M.lilac, [-9.97, 7.1, -1]);           // and under the ceiling
  // wall B (z = -9): a glass curtain in champagne frames
  add(new THREE.BoxGeometry(22, 7.2, .08), M.glass, [-1, 3.46, -9.1]);
  for (let x = -10; x <= 12; x += 2.4) add(new THREE.BoxGeometry(.045, 7.2, .1), M.champ, [x, 3.46, -9.02]);
  for (const y of [.12, 3.2, 7.05]) add(new THREE.BoxGeometry(22, .04, .1), M.champ, [-1, y, -9.02]);
  add(new THREE.BoxGeometry(19.8, .025, .06), M.lilac, [-.1, 7.1, -8.95]);
  add(new THREE.BoxGeometry(19.8, .025, .06), M.lilac, [-.1, .02, -8.95]);
  // columns, and ceiling coves running across the room
  for (const [x, z] of [[-9.3, 5.2], [6.5, -8.4]]) { add(new THREE.BoxGeometry(.9, 7.2, .9), M.col, [x, 3.46, z]); add(new THREE.BoxGeometry(.92, .02, .92), M.champ, [x, 2.2, z]); }
  for (const z of [-4.6, .4, 5.4]) add(new THREE.BoxGeometry(19.6, .03, .05), M.lilac, [0, 7.16, z]);
  add(new THREE.BoxGeometry(20, .02, 1.2), M.warm, [0, 7.17, -1.5]);
  // the sign: dark stone, champagne lettering in plain type, a lilac line beneath
  if (sign[0]) {   // the sign: champagne type set into a stone panel of the wall itself, fitted so the whole phrase always shows
    const sg = tex(1600, 560, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#d9ccc0"); g.addColorStop(1, "#bcae9f"); x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.textAlign = "center"; let f = 230; x.font = `400 ${f}px 'Instrument Serif', Georgia, serif`; while (x.measureText(sign[0]).width > w * .86 && f > 40) { f -= 6; x.font = `400 ${f}px 'Instrument Serif', Georgia, serif`; }
      x.fillStyle = "rgba(60,48,38,.35)"; x.fillText(sign[0], w / 2 + 2, 300 + 3); x.fillStyle = "#a88c5e"; x.fillText(sign[0], w / 2, 300);
      if (sign[1]) { x.font = "500 40px 'IBM Plex Mono', monospace"; x.fillStyle = "rgba(120,96,64,.85)"; x.fillText(sign[1].toUpperCase().split("").join(String.fromCharCode(8202)), w / 2, 420); } });
    add(new THREE.PlaneGeometry(6.4, 2.24), new THREE.MeshStandardMaterial({ map: sg, roughness: .7, envMapIntensity: .5, polygonOffset: true, polygonOffsetFactor: -2 }), [-9.96, 3.3, -4.8], [0, Math.PI / 2, 0]);
  }
  // the plinth: honed stone, a champagne hairline at its edge, a lilac ring of light at its foot
  add(new THREE.CylinderGeometry(3.1, 3.12, .14, 128), M.plinth, [0, -.07, 0]);
  add(new THREE.TorusGeometry(3.105, .006, 6, 220), M.champ, [0, 0, 0], [Math.PI / 2, 0, 0]);
  add(new THREE.TorusGeometry(3.2, .012, 6, 220), M.lilac, [0, -.13, 0], [Math.PI / 2, 0, 0]);
  // light pooling on the floor below the coves (the soft part of the reflection)
  const pool = tex(256, 64, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "rgba(185,166,234,.55)"); g.addColorStop(1, "rgba(185,166,234,0)"); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  const poolMat = new THREE.MeshBasicMaterial({ map: pool, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  add(new THREE.PlaneGeometry(22, 1.6), poolMat, [-9.2, -.135, -1], [-Math.PI / 2, 0, Math.PI / 2]);
  add(new THREE.PlaneGeometry(22, 1.6), poolMat, [-1, -.135, -8.2], [-Math.PI / 2, 0, 0]);
  const ringPool = tex(256, 256, (x, w, h) => { const g = x.createRadialGradient(128, 128, 96, 128, 128, 128); g.addColorStop(0, "rgba(185,166,234,0)"); g.addColorStop(.86, "rgba(185,166,234,.62)"); g.addColorStop(1, "rgba(185,166,234,0)"); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  add(new THREE.PlaneGeometry(7.6, 7.6), new THREE.MeshBasicMaterial({ map: ringPool, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }), [0, -.135, 0], [-Math.PI / 2, 0, 0]);
  // the car's own contact shadow on the plinth
  const sh = tex(256, 128, (x, w, h) => { const g = x.createRadialGradient(128, 64, 6, 128, 64, 128); g.addColorStop(0, "rgba(8,8,10,.75)"); g.addColorStop(1, "rgba(8,8,10,0)"); x.setTransform(1, 0, 0, .5, 0, 32); x.fillStyle = g; x.fillRect(0, 0, w, 256); });
  add(new THREE.PlaneGeometry(5.6, 2.9), new THREE.MeshBasicMaterial({ map: sh, transparent: true, depthWrite: false }), [0, .003, 0], [-Math.PI / 2, 0, 0]);

  // ---------------------------------------------------------------------------------------------- camera, bloom
  let W = 2, H = 2, composer = null, bloom = null;
  if (PP && !coarse) { const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = PP;
    composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera)); bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .8, .45, 1.05); composer.addPass(bloom); composer.addPass(new OutputPass()); }
  function fit() { const r = host.getBoundingClientRect(); W = Math.max(2, r.width); H = Math.max(2, r.height); renderer.setSize(W, H, false); composer && composer.setSize(W, H);
    camera.aspect = W / H; camera.fov = W / H < 1 ? 40 : 29; camera.updateProjectionMatrix(); place(); dirty = 3; }
  function place() { const narrow = W / H < 1, d = (narrow ? 12.4 : 10.6) * (o.glb ? 1.28 : 1) * (W < 560 ? .74 : 1), a = angle + Math.sin(t * .085) * range + yaw, h = (narrow ? 2.6 : 2.0) + Math.sin(t * .12) * .16;
    camera.position.set(Math.cos(a) * d, h, Math.sin(a) * d); camera.lookAt(0, narrow ? .9 : .62, 0);
    const sx = narrow ? 0 : shift; if (sx) camera.setViewOffset(W, H, -W * sx, 0, W, H); else camera.clearViewOffset(); }
  addEventListener("resize", fit); fit();
  const draw = () => (composer ? composer.render() : renderer.render(scene, camera));
  draw();

  // ---------------------------------------------------------------------------------------------- or a mesh car (glb), on a turntable
  if (o.glb) {
    const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
    const g = await new GLTFLoader().loadAsync(o.glb), root = g.scene, box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3());
    const k = (o.glbLength || 4.9) / Math.max(size.x, size.z); root.scale.setScalar(k);
    if (size.z > size.x) root.rotation.y = (o.glbYaw ?? Math.PI / 2);   // long axis to +x, the room's "forward"
    const b2 = new THREE.Box3().setFromObject(root), c2 = b2.getCenter(new THREE.Vector3()); root.position.set(-c2.x, -b2.min.y, -c2.z);
    // the paint: the baked texture keeps the glass, lamps and wheels where they are; over it, champagne-silver paint with a clearcoat,
    // lit by a bright studio environment of its own (the dark room alone makes metal read as black), and smooth normals with a 40° crease
    const { toCreasedNormals } = await import("three/addons/utils/BufferGeometryUtils.js");
    const { RoomEnvironment } = await import("three/addons/environments/RoomEnvironment.js");
    const pm2 = new THREE.PMREMGenerator(renderer), studioEnv = pm2.fromScene(new RoomEnvironment(), .04).texture; pm2.dispose();
    root.traverse((m) => { if (!m.isMesh) return;
      let g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry; g = toCreasedNormals(g, 40 * Math.PI / 180);
      const nn = g.attributes.normal.array; for (let i = 0; i < nn.length; i += 3) { const l = Math.hypot(nn[i], nn[i + 1], nn[i + 2]); if (!(l > 1e-6)) { nn[i] = 0; nn[i + 1] = 1; nn[i + 2] = 0; } }
      m.geometry = g; const map = m.material.map; if (map) { map.anisotropy = 8; map.colorSpace = THREE.SRGBColorSpace; }
      m.material = new THREE.MeshPhysicalMaterial({ map, color: C(o.paint || "#f3eadb"), metalness: .55, roughness: .3, clearcoat: 1, clearcoatRoughness: .08, envMap: studioEnv, envMapIntensity: .85 }); });
    const rim = new THREE.DirectionalLight(0xe6dcff, .9); rim.position.set(-6, 4, -5); scene.add(rim);
    const keyF = new THREE.DirectionalLight(0xfff4e8, .8); keyF.position.set(6, 9, 3); scene.add(keyF);
    const turn = new THREE.Group(); turn.add(root); scene.add(turn);
    // the soft reflection: the car mirrored under a plinth top that lets a little of it through
    const mir = root.clone(); mir.scale.y *= -1; mir.position.y = b2.min.y * 0 + (root.position.y * -1); const mirG = new THREE.Group(); mirG.add(mir); mirG.position.y = -.004; scene.add(mirG);
    mir.traverse((m) => { if (m.isMesh) { const y = m.material.clone(); y.transparent = true; y.opacity = .9; m.material = y; } });
    const top = add(new THREE.CircleGeometry(3.1, 128), new THREE.MeshStandardMaterial({ color: C("#d8d2c8"), roughness: .22, envMapIntensity: .9, transparent: true, opacity: .8 }), [0, .001, 0], [-Math.PI / 2, 0, 0]);
    let spin = 0; const prevPlace = place;
    const tick = (dt) => { spin += dt * .16; turn.rotation.y = spin; mirG.rotation.y = spin; };
    return finishLoop(tick);
  }
  // ---------------------------------------------------------------------------------------------- the capture
  const res = await fetch(url); if (!res.ok) throw new Error(`capture ${res.status}`);
  const total = +res.headers.get("content-length") || 0, reader = res.body.getReader(), parts = []; let got = 0;
  for (;;) { const { done, value } = await reader.read(); if (done) break; parts.push(value); got += value.length; onProgress && onProgress(got, total); }
  const bytes = new Uint8Array(got); let off = 0; for (const p of parts) { bytes.set(p, off); off += p.length; }
  const car = new Spark.SplatMesh({ fileBytes: bytes, fileName: url.split("/").pop() }); await car.initialized; scene.add(car);
  // the capture's number plate, blanked in stone (as the studio blurs plates in photos)
  if (o.plate) { const [px, py, pz, pw, phh] = o.plate; add(new THREE.BoxGeometry(.035, phh, pw), new THREE.MeshStandardMaterial({ color: C("#c9c4bc"), roughness: .55 }), [px, py, pz]); }

  // ---------------------------------------------------------------------------------------------- the bricks
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let bricks = null, B = null;
  if (!reduce && o.assemble !== false) {
    const cell = .1, cells = new Map();
    car.forEachSplat((i, c, s, q, op, col) => { if (op < .35 || c.y < .04) return; const k = `${Math.round(c.x / cell)},${Math.round(c.y / cell)},${Math.round(c.z / cell)}`;
      const e = cells.get(k); const l = .3 * col.r + .59 * col.g + .11 * col.b; if (e) { e[0]++; e[1] += l; } else cells.set(k, [1, l]); });
    let list = [...cells.entries()].filter(([, v]) => v[0] >= 3);
    const cap = coarse ? 5000 : 9000; if (list.length > cap) list = list.filter(() => Math.random() < cap / list.length);
    const PAL = { off: C("#EFEAE1"), char: C("#3A3836"), terra: C("#B4593A"), beige: C("#D9C7AA") };
    const geo = new THREE.BoxGeometry(cell * .9, cell * .9, cell * .9);
    bricks = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: .62, envMapIntensity: .6 }), list.length);
    B = list.map(([k, v], i) => { const [x, y, z] = k.split(",").map((n) => +n * cell), l = v[1] / v[0];
      bricks.setColorAt(i, l < .22 ? PAL.char : l > .62 ? PAL.off : Math.random() < .22 ? PAL.terra : PAL.beige);
      return { x, y, z, sx: x + (Math.random() - .5) * 2.4, sy: y + 2.6 + Math.random() * 3, sz: z + (Math.random() - .5) * 2.4, d: (y / 1.35) * 1.15 + Math.random() * .45 }; });
    scene.add(bricks); car.opacity = 0; phase = "build"; ph0 = performance.now(); window.__bricks = { n: list.length };
  } else phase = "done";
  const m4 = new THREE.Matrix4(), q0 = new THREE.Quaternion(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3();
  const outC = (k) => 1 - Math.pow(1 - k, 3);
  function bricksAt(sec) {   // build: each brick drops into its place, bottom up; resolve: they shrink away top down as the capture fades in
    const T1 = 2.35;
    if (sec < T1) { B.forEach((b, i) => { const k = Math.min(1, Math.max(0, (sec - b.d) / .7)), e = outC(k), sc = k <= 0 ? 0 : 1;
        v3.set(b.sx + (b.x - b.sx) * e, b.sy + (b.y - b.sy) * e, b.sz + (b.z - b.sz) * e); s3.setScalar(sc); bricks.setMatrixAt(i, m4.compose(v3, q0, s3)); }); }
    else { const r = (sec - T1) / 1.1; car.opacity = Math.min(1, r * 1.4);
      B.forEach((b, i) => { const k = Math.min(1, Math.max(0, (r - (1 - b.y / 1.35) * .45) / .55)); v3.set(b.x, b.y, b.z); s3.setScalar(1 - outC(k)); bricks.setMatrixAt(i, m4.compose(v3, q0, s3)); });
      if (r >= 1) { scene.remove(bricks); bricks.geometry.dispose(); bricks = null; car.opacity = 1; phase = "done"; o.onPhase && o.onPhase("done"); } }
    if (bricks) bricks.instanceMatrix.needsUpdate = true;
  }
  if (bricks) { bricksAt(0); if (bricks.instanceColor) bricks.instanceColor.needsUpdate = true; o.onPhase && o.onPhase("build"); }

  return finishLoop(null, car);
  function finishLoop(tick, car) {
  new IntersectionObserver((es) => { vis = es.some((e) => e.isIntersecting); if (vis) kick(); }).observe(host);
  canvas.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: yaw }; canvas.setPointerCapture(e.pointerId); kick(); });
  canvas.addEventListener("pointermove", (e) => { if (!drag) return; yaw = drag.y - (e.clientX - drag.x) * .005; place(); dirty = 2; kick(); });
  const end = () => { drag = null; }; canvas.addEventListener("pointerup", end); canvas.addEventListener("pointercancel", end);
  frame = function (now) { raf = 0; const dt = Math.min(.05, (now - last) / 1000); last = now; if (!vis) return;
    if (!paused) { t += dt; tick && tick(dt); place(); dirty = Math.max(dirty, 1); }
    if (phase === "build") { bricksAt((now - ph0) / 1000); dirty = Math.max(dirty, 1); }
    if (dirty > 0) { draw(); dirty--; }
    if (!paused || dirty > 0 || drag || phase === "build") kick(); }
  kick();
  return {
    pause(p) { paused = p; kick(); }, setTime(x) { t = x; place(); dirty = 3; kick(); }, render() { place(); draw(); },
    finish() { if (bricks) { scene.remove(bricks); bricks = null; } if (car) car.opacity = 1; phase = "done"; dirty = 3; kick(); }, canvas,
  };
  }
}
