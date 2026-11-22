// Front page hero: a rendering of the two timber homes shows first (it is a picture, labelled so). After first paint, and
// only if the visitor allows motion, three.js loads and the same homes are built live from their plan model: floors,
// then walls rising, then the roof landing, then a slow orbit. Off screen or in a hidden tab it stops drawing.
const stage = document.getElementById("stage");
const canvas = document.getElementById("house3d");
const chip = document.getElementById("stage-chip");
const pauseBtn = document.getElementById("stage-pause");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const saveData = navigator.connection?.saveData === true;
window.__hero = { state: "poster" };

function start() {
  if (!stage || !canvas || reduce || saveData) { window.__hero.state = reduce ? "reduced-motion" : "poster"; return; }
  // wait for the stage to be near the screen, then load three.js after the page has painted
  const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); boot(); } }, { rootMargin: "200px" });
  io.observe(stage);
}

async function boot() {
  performance.mark("hero-three-start"); window.__hero.state = "loading";
  let THREE, buildHouse, RoomEnvironment, plan;
  try {
    [THREE, { buildHouse }, { RoomEnvironment }, plan] = await Promise.all([
      import("three"), import("./house.js?v=20261123a"),
      import("/assets/vendor/three/addons/environments/RoomEnvironment.js"),
      fetch("/plan-studio/twins/services/plan16a.json").then((r) => { if (!r.ok) throw new Error("plan " + r.status); return r.json(); }),
    ]);
  } catch (e) { window.__hero.state = "poster (load failed)"; console.warn("hero: staying on the rendering", e); return; }

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" }); }
  catch { window.__hero.state = "poster (no WebGL)"; return; }
  const phone = Math.min(innerWidth, innerHeight) < 600;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, phone ? 1.25 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping; renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.55;
  scene.add(new THREE.HemisphereLight("#fff6ec", "#5d6845", 0.55));
  const sun = new THREE.DirectionalLight("#fff0da", 3.0);
  const sp = plan.site.sun || [-16, 15, -18], c = plan.site.centre || [0, -3];
  sun.position.set(c[0] + sp[0], sp[1], c[1] + sp[2]); sun.target.position.set(c[0], 0, c[1]);
  sun.castShadow = true; sun.shadow.mapSize.set(phone ? 1024 : 2048, phone ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 80 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 4;
  scene.add(sun, sun.target);

  const house = buildHouse(plan); scene.add(house);
  const P = house.userData.parts;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 200);
  const target = new THREE.Vector3(c[0] + 0.5, 1.6, c[1] - 0.5);
  // the hero still's own view direction, from the plan's camera list
  const hero = plan.cameras?.stills?.hero, eye0 = new THREE.Vector3(...(hero?.eye || [-11.5, 4.35, -27.5]));
  let az = Math.atan2(eye0.x - target.x, eye0.z - target.z);
  const elev = 0.24;
  let radius = 34;

  function size() {
    const r = stage.getBoundingClientRect(), w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false); camera.aspect = w / h;
    // fit a ~15 m radius around both homes, wider when the stage is narrow
    const vf = THREE.MathUtils.degToRad(camera.fov) / 2, hf = Math.atan(Math.tan(vf) * camera.aspect);
    radius = 13 / Math.tan(Math.min(vf, hf)) * (camera.aspect < 1.4 ? 0.8 : 0.7);
    camera.updateProjectionMatrix(); draw();
  }
  function place() {
    camera.position.set(target.x + Math.sin(az) * Math.cos(elev) * radius, target.y + Math.sin(elev) * radius, target.z + Math.cos(az) * Math.cos(elev) * radius);
    camera.lookAt(target);
  }

  // assembly: floors and decks rise, walls grow up from the floor, roofs land, then planting
  const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
  const DUR = 5200;
  function assemble(t) {
    const k = t / DUR;
    P.base.forEach((g, i) => { const e = ease((k - i * 0.06) / 0.22); g.scale.y = Math.max(0.001, e); g.visible = e > 0; });
    P.walls.forEach((g, i) => { const e = ease((k - 0.16 - i * 0.08) / 0.34); g.scale.y = Math.max(0.001, e); g.visible = e > 0; });
    P.roofs.forEach((g, i) => { const e = ease((k - 0.52 - i * 0.08) / 0.24); g.userData.y0 ??= g.position.y; g.position.y = g.userData.y0 + (1 - e) * 4.5; g.visible = e > 0; });
    P.plants.forEach((g, i) => { const e = ease((k - 0.7 - (i % 7) * 0.025) / 0.2); g.scale.setScalar(Math.max(0.001, e)); g.visible = e > 0; });
    return k >= 1.05;
  }

  let t0 = null, last = 0, running = false, paused = false, onScreen = true, built = false, raf = 0;
  function draw() { place(); renderer.render(scene, camera); }
  function frame(now) {
    raf = 0; if (!running) return;
    if (t0 === null) { t0 = now; last = now; }
    const dt = Math.min(64, now - last); last = now;
    if (!built) built = assemble(now - t0);
    if (!paused) az += dt * 0.00006;
    draw();
    if (!built || !paused) raf = requestAnimationFrame(frame); else running = false;
  }
  function run() { if (running || !onScreen || document.hidden) return; if (built && paused) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

  assemble(0); size(); addEventListener("resize", size);
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; onScreen ? run() : stop(); }).observe(stage);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : run()));
  pauseBtn.hidden = false;
  pauseBtn.addEventListener("click", () => {
    paused = !paused; pauseBtn.setAttribute("aria-pressed", String(paused)); pauseBtn.textContent = paused ? "Play" : "Pause";
    if (!paused) { last = performance.now(); run(); }
  });

  // show the live model: the rendering fades out under it, the label changes with it
  draw(); performance.mark("hero-three-ready");
  stage.classList.add("live"); chip.textContent = "Live 3D from the plan · not a scan";
  // seek(ms): hold the assembly at a moment (for checking stills); run() carries on from there
  const seek = (ms) => { stop(); t0 = performance.now() - ms; built = assemble(ms); draw(); };
  window.__hero = { state: "live", get running() { return running; }, get built() { return built; }, get onScreen() { return onScreen; }, seek };
  run();
}

if (document.readyState === "complete") requestAnimationFrame(() => setTimeout(start, 50));
else addEventListener("load", () => requestAnimationFrame(() => setTimeout(start, 50)), { once: true });
