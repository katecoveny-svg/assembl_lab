// A room, assembled as you scroll: a quiet New Zealand living, dining and kitchen space, built in three.js, that fills
// with sample products one at a time: the oak floor, black joinery, a stone benchtop, then the furniture, lighting and
// planting. Each product drops into place and is tagged with what it is and who supplies it. The furniture and planting
// are Kate's Kōwhai Studio procedural assets (kowhai.js); the building products are this page's sample catalogue.
// Nothing moves on its own: the room changes only when you scroll or point. Under reduced motion it is simply complete.
import * as THREE from "three";
import { buildAsset, buildStudioEnvTexture, generatePBRMaps, createCalibratedMaterial, applyPhysicalUVScale } from "./kowhai.js";
import { byId } from "./data.js";

const sec = document.getElementById("room-sec"), canvas = document.getElementById("room");
const card = { n: document.getElementById("room-n"), nm: document.getElementById("room-nm"), sup: document.getElementById("room-sup"), el: document.getElementById("room-card") };
const tagsEl = document.getElementById("room-tags");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const small = Math.min(innerWidth, innerHeight) < 700 || (navigator.hardwareConcurrency || 8) <= 4;

// what goes into the room, in order. Building products come from the sample catalogue; the rest are Kōwhai assets.
const cat = (id) => ({ name: byId[id]?.name || id, sup: `${byId[id]?.supplier || "Sample supplier"} · sample product` });
const STEPS = [
  { key: "floor", ...cat("lr-oak-natural") },
  { key: "joinery", ...cat("hj-tb-black") },
  { key: "bench", ...cat("ql-stone") },
  { key: "sofa", name: "Three-seat sofa, chalk bouclé on beech", sup: "Kōwhai Studio asset · sample product" },
  { key: "lounge", name: "Armchair, oak coffee tables and a wool rug", sup: "Kōwhai Studio assets · sample products" },
  { key: "dining", name: "Ash dining table and four bentwood chairs", sup: "Kōwhai Studio assets · sample products" },
  { key: "light", name: "Hoop-pine pendant and an arced floor lamp", sup: "Kōwhai Studio assets · sample products" },
  { key: "finish", name: "Kitchen mixer, counter stools and a ponga fern", sup: "Kōwhai Studio assets · sample products" },
];

if (sec && canvas) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" }); } catch { renderer = null; }
  if (!renderer) sec.classList.add("no-room");
  else start(renderer);
}

function start(renderer) {
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(); scene.background = new THREE.Color("#EEE7E1");
  scene.environment = buildStudioEnvTexture(renderer); scene.environmentIntensity = 0.55;
  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 80);

  // ------------------------------------------------------------------------------------------------ light
  scene.add(new THREE.HemisphereLight(0xfff6ea, 0xd2c2b2, 0.55));
  const sun = new THREE.DirectionalLight(0xfff0dc, 3.2);            // late sun through the glazing, so the window lands on the floor
  sun.position.set(-4.5, 5.2, -9); sun.target.position.set(0.4, 0, 0.8); scene.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 26 });
  const glow = new THREE.PointLight(0xffc98a, 0, 6, 1.6); glow.position.set(2.4, 2.1, 0.9); scene.add(glow);

  // ------------------------------------------------------------------------------------------------ the shell
  const W = 8, D = 10, H = 3, X0 = -W / 2, Z0 = -3, ZC = Z0 + D / 2;   // the room runs forward past the camera, so a tall phone screen never sees its edge
  const plaster = new THREE.MeshStandardMaterial({ color: 0xf4efe9, roughness: 0.92 });
  const box = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; scene.add(m); return m; };
  const winL = -3.3, winR = 0.9, winH = 2.72;                         // floor-to-ceiling glazing across most of the back wall
  box(winL - X0, H, 0.2, plaster, (X0 + winL) / 2, H / 2, Z0 - 0.1);
  box(W / 2 - winR, H, 0.2, plaster, (winR + W / 2) / 2, H / 2, Z0 - 0.1);
  box(winR - winL, H - winH, 0.2, plaster, (winL + winR) / 2, winH + (H - winH) / 2, Z0 - 0.1);
  box(0.2, H, D, plaster, X0 - 0.1, H / 2, ZC); box(0.2, H, D, plaster, W / 2 + 0.1, H / 2, ZC);
  const ceil = box(W, 0.1, D, plaster, 0, H + 0.05, ZC); ceil.castShadow = true;
  // the floor: plain screed until the oak goes down
  const screed = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ color: 0xe7e0d8, roughness: 0.95 }));
  screed.rotation.x = -Math.PI / 2; screed.position.z = ZC; screed.receiveShadow = true; scene.add(screed);
  // outside: a lawn, a sky and the bush beyond the glass
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), new THREE.MeshStandardMaterial({ color: 0x8c9a72, roughness: 1 }));
  lawn.rotation.x = -Math.PI / 2; lawn.position.set(0, -0.02, Z0 - 10); lawn.receiveShadow = true; scene.add(lawn);
  const skyC = document.createElement("canvas"); skyC.width = 8; skyC.height = 256; const sg = skyC.getContext("2d");
  const grad = sg.createLinearGradient(0, 0, 0, 256); grad.addColorStop(0, "#b9c6cf"); grad.addColorStop(0.55, "#e9ddd1"); grad.addColorStop(1, "#f6e6d4");
  sg.fillStyle = grad; sg.fillRect(0, 0, 8, 256); const skyT = new THREE.CanvasTexture(skyC); skyT.colorSpace = THREE.SRGBColorSpace;
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(60, 22), new THREE.MeshBasicMaterial({ map: skyT, fog: false })); sky.position.set(0, 9, Z0 - 18); scene.add(sky);
  const viewC = document.createElement("canvas"); viewC.width = 2048; viewC.height = 512; const vg = viewC.getContext("2d");
  { let sd = 5; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    const ridge = (base, amp, col, step) => { vg.fillStyle = col; vg.beginPath(); vg.moveTo(0, 512); let y = base; for (let x = 0; x <= 2048; x += step) { y = base + Math.sin(x / 260 + base) * amp + (r() - 0.5) * amp * 0.6; vg.lineTo(x, y); } vg.lineTo(2048, 512); vg.fill(); };
    ridge(250, 26, "#b9c2b6", 24); ridge(300, 22, "#93a08c", 18);
    vg.fillStyle = "#5f6f55"; for (let x = 0; x < 2048; x += 9) { const hgt = 40 + r() * 70; vg.beginPath(); vg.ellipse(x, 380 - hgt * 0.4, 18 + r() * 22, hgt * 0.6, 0, 0, Math.PI * 2); vg.fill(); }
    vg.fillStyle = "#56664c"; vg.fillRect(0, 380, 2048, 132); }
  const viewT = new THREE.CanvasTexture(viewC); viewT.colorSpace = THREE.SRGBColorSpace;
  const view = new THREE.Mesh(new THREE.PlaneGeometry(60, 15), new THREE.MeshBasicMaterial({ map: viewT, transparent: true, fog: false })); view.position.set(0, 4.3, Z0 - 16); scene.add(view);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(winR - winL, winH), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.08 }));
  glass.position.set((winL + winR) / 2, winH / 2, Z0 - 0.06); scene.add(glass);

  // ------------------------------------------------------------------------------------------------ materials for the building products
  const matFrom = (type, hex, accent, tile) => { const maps = generatePBRMaps(type, hex, accent, 512); return createCalibratedMaterial(type, { tileMeters: tile }, maps); };
  const S = byId;
  const oakSw = S["lr-oak-natural"]?.swatch || ["#CFAE80", "#9B7650"], stoneSw = S["ql-stone"]?.swatch || ["#EFEBE4", "#D9D3C9"];

  // engineered oak boards, 180 mm wide in random lengths, each a slightly different tone with fine grain: drawn once
  function planks(sw) {
    const c = document.createElement("canvas"), N = 2048, M = 3.6; c.width = c.height = N; const g = c.getContext("2d");
    const px = N / M, bw = 0.18 * px, hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)), a = hex(sw[0]), b = hex(sw[1]);
    let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let x = 0; x < N; x += bw) {
      let y = -rnd() * 1.6 * px;
      while (y < N) {
        const len = (0.9 + rnd() * 1.4) * px, k = 0.15 + rnd() * 0.5, col = a.map((v, i) => Math.round(v + (b[i] - v) * k * 0.6));
        g.fillStyle = `rgb(${col})`; g.fillRect(x, y, bw, len);
        for (let i = 0; i < 70; i++) { const gx = x + rnd() * bw, t = 0.04 + rnd() * 0.08; g.fillStyle = `rgba(${b.map((v) => Math.round(v * 0.82))},${t})`; g.fillRect(gx, y, 0.6 + rnd() * 1.4, len); }
        g.fillStyle = "rgba(60,40,25,.28)"; g.fillRect(x, y, bw, 2); y += len;
      }
      g.fillStyle = "rgba(60,40,25,.32)"; g.fillRect(x, 0, 2, N);
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(W / M, D / M); t.anisotropy = 8;
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.58, metalness: 0 });
  }
  const uv = (geo, tile) => { applyPhysicalUVScale(geo, tile); return geo; };

  // ------------------------------------------------------------------------------------------------ the pieces, grouped by step
  const groups = STEPS.map(() => new THREE.Group());
  groups.forEach((g) => { g.visible = false; scene.add(g); });
  const meta = groups.map(() => ({ base: [], mats: [], anchor: new THREE.Vector3(), built: false }));
  const place = (g, obj, x, z, ry = 0, y = 0) => { obj.position.set(x, y, z); obj.rotation.y = ry; g.add(obj); return obj; };

  const builders = [
    (g) => {                                                         // 0 floor: engineered oak, natural matt
      const f = new THREE.Mesh(new THREE.PlaneGeometry(W, D), planks(oakSw)); f.rotation.x = -Math.PI / 2; f.position.set(0, 0.004, ZC); f.receiveShadow = true; g.add(f);
      return new THREE.Vector3(-0.6, 0, 1.6);
    },
    (g) => {                                                         // 1 joinery: thermally broken aluminium, matt black
      const blk = new THREE.MeshStandardMaterial({ color: 0x18181a, roughness: 0.42, metalness: 0.55 });
      const bar = (w, h, d, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), blk); m.position.set(x, y, Z0 - 0.05); m.castShadow = true; g.add(m); };
      const n = 4, step = (winR - winL) / n;
      for (let i = 0; i <= n; i++) bar(0.06, winH, 0.12, winL + i * step, winH / 2);
      bar(winR - winL, 0.07, 0.12, (winL + winR) / 2, winH - 0.035); bar(winR - winL, 0.05, 0.14, (winL + winR) / 2, 0.025);
      return new THREE.Vector3(-1.2, 2.2, Z0);
    },
    (g) => {                                                         // 2 the island, with an engineered stone benchtop
      const timber = new THREE.MeshStandardMaterial({ color: 0xd8c7b1, roughness: 0.62 });   // pale oak cabinetry, matt
      const body = new THREE.Mesh(uv(new THREE.BoxGeometry(2.6, 0.86, 0.9), 0.7), timber); body.position.set(2.45, 0.43, -1.65); body.castShadow = body.receiveShadow = true; g.add(body);
      const kick = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 0.8), new THREE.MeshStandardMaterial({ color: 0x2a2624, roughness: 0.8 })); kick.position.set(2.45, 0.05, -1.65); g.add(kick);
      const topGeo = new THREE.BoxGeometry(2.72, 0.04, 1.0); applyPhysicalUVScale(topGeo, 0.9);
      const top = new THREE.Mesh(topGeo, matFrom("stone", stoneSw[0], stoneSw[1], 0.9)); top.position.set(2.45, 0.88, -1.65); top.castShadow = top.receiveShadow = true; g.add(top);
      // the back wall of the kitchen: tall timber joinery
      const tall = new THREE.Mesh(uv(new THREE.BoxGeometry(3.0, 2.4, 0.62), 0.7), timber); tall.position.set(2.45, 1.2, Z0 + 0.31); tall.castShadow = tall.receiveShadow = true; g.add(tall);
      const gap = new THREE.MeshStandardMaterial({ color: 0x3a2f28, roughness: 0.9 });
      for (let i = 1; i < 5; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.008, 2.36, 0.01), gap); l.position.set(0.95 + i * 0.6, 1.2, Z0 + 0.625); g.add(l); }
      for (let i = 1; i < 4; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.82, 0.01), gap); l.position.set(1.15 + i * 0.65, 0.45, -1.195); g.add(l); }
      return new THREE.Vector3(2.45, 0.92, -1.65);
    },
    (g) => { place(g, buildAsset("HERO-LIV-01", 1), -3.35, 0.55, Math.PI / 2); return new THREE.Vector3(-3.35, 0.8, 0.55); },
    (g) => {
      place(g, buildAsset("HERO-LIV-04", 1), -1.75, 0.55, Math.PI / 2);
      place(g, buildAsset("HERO-LIV-03", 1), -1.85, 0.55, Math.PI / 2);
      place(g, buildAsset("HERO-LIV-02", 0), -0.25, 0.85, -Math.PI / 2 - 0.35);
      return new THREE.Vector3(-1.4, 0.6, 0.6);
    },
    (g) => {
      place(g, buildAsset("HERO-DIN-01", 0), 2.45, 1.05, Math.PI / 2);
      const ch = (x, z, ry) => place(g, buildAsset("HERO-DIN-02", 1), x, z, ry);
      ch(1.85, 0.45, Math.PI / 2); ch(1.85, 1.65, Math.PI / 2); ch(3.05, 0.45, -Math.PI / 2); ch(3.05, 1.65, -Math.PI / 2);
      return new THREE.Vector3(2.45, 0.9, 1.05);
    },
    (g) => {
      const p = buildAsset("HERO-DIN-03", 1); const bb = new THREE.Box3().setFromObject(p); place(g, p, 2.45, 1.05, 0, H - bb.max.y);
      place(g, buildAsset("HERO-LIV-05", 0), -3.35, -0.95, Math.PI * 0.75);
      return new THREE.Vector3(2.45, 2.3, 1.05);
    },
    (g) => {
      place(g, buildAsset("HERO-KIT-08", 0), 2.45, -1.95, 0, 0.9);
      place(g, buildAsset("HERO-KIT-09", 1), 1.95, -0.95, Math.PI); place(g, buildAsset("HERO-KIT-09", 1), 2.95, -0.95, Math.PI);
      if (!small) place(g, buildAsset("HERO-NAT-03", 0), -3.45, -2.35, 0.4);
      return new THREE.Vector3(2.45, 1.2, -1.4);
    },
  ];
  // the bush outside the glass, built last and only on bigger screens
  const outside = () => { if (small) return; try { const n = buildAsset("HERO-NAT-01", 0); n.position.set(-2.1, 0, Z0 - 4.2); n.scale.setScalar(1.6); scene.add(n); const t = buildAsset("HERO-NAT-02", 0); t.position.set(0.4, 0, Z0 - 6.5); t.scale.setScalar(1.8); scene.add(t); } catch (e) { console.warn(e); } };

  // build one step at a time, off the main path, once the room is near the screen
  let builtUpTo = -1;
  function buildNext() {
    const k = builtUpTo + 1; if (k >= builders.length) { outside(); kick(); return; }
    try {
      const a = builders[k](groups[k]); meta[k].anchor.copy(a); meta[k].built = true;
      groups[k].traverse((o) => { if (o.isMesh || o.isInstancedMesh) { o.castShadow = true; o.receiveShadow = true; const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach((m) => { if (m && !meta[k].mats.includes(m)) meta[k].mats.push(m); }); } });
    } catch (e) { console.warn("room step", k, e); meta[k].built = true; }
    builtUpTo = k; kick();
    (window.requestIdleCallback || ((f) => setTimeout(f, 30)))(buildNext);
  }
  new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting) && builtUpTo < 0) buildNext(); }, { rootMargin: "120% 0px" }).observe(sec);

  // ------------------------------------------------------------------------------------------------ tags: a dot and a label per placed step
  tagsEl.innerHTML = STEPS.map((s, i) => `<span class="rt" data-i="${i}"><i></i><b>${String(i + 1).padStart(2, "0")}</b><em>${s.name}</em></span>`).join("");
  const tagEls = [...tagsEl.children];

  // ------------------------------------------------------------------------------------------------ scroll: which step, how far
  const ease = (x) => 1 - Math.pow(1 - x, 3), back = (x) => { const c = 1.4; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  let t = reduce ? 1 : 0, shown = -1, px = 0, py = 0;
  function progress() { const r = sec.getBoundingClientRect(); return Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight))); }
  function apply() {
    const span = 0.84 / STEPS.length; let current = -1;
    groups.forEach((g, k) => {
      const p = reduce ? 1 : Math.min(1, Math.max(0, (t - 0.05 - k * span) / (span * 0.8)));
      if (p > 0) current = k;
      g.visible = p > 0 && meta[k].built;
      const drop = k === 0 ? 0 : (1 - back(p)) * (k === 6 ? -0.9 : 0.9);  // the pendant comes down from the ceiling; everything else drops in
      g.position.y = drop;
      const op = k === 0 ? ease(p) : Math.min(1, p * 2.2);
      for (const m of meta[k].mats) { const want = op < 1; if (m.transparent !== want) { m.transparent = want; m.needsUpdate = true; } m.opacity = op; }
      tagEls[k]?.classList.toggle("on", p >= 0.95);
    });
    tagEls.forEach((el, k) => el.classList.toggle("cur", k === current));
    glow.intensity = Math.min(1, Math.max(0, (t - 0.05 - 6 * (0.84 / STEPS.length)) / 0.06)) * 6;
    if (current !== shown) {
      shown = current; const s = STEPS[Math.max(0, current)];
      card.el.classList.toggle("on", current >= 0);
      card.n.textContent = String(Math.max(0, current) + 1).padStart(2, "0"); card.nm.textContent = s.name; card.sup.textContent = s.sup;
    }
  }
  function placeTags() {
    const w = canvas.clientWidth, h = canvas.clientHeight, v = new THREE.Vector3();
    tagEls.forEach((el, k) => { v.copy(meta[k].anchor).project(camera); el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px)`; });
  }

  // ------------------------------------------------------------------------------------------------ camera, sized to the screen
  function frame() {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    const tall = w / h < 1; camera.fov = tall ? 66 : 44; camera.updateProjectionMatrix();
  }
  function aim() {
    const tall = camera.aspect < 1, push = ease(t) * 0.7;
    camera.position.set(0.1 + px * 0.25, 1.6 + py * 0.12, (tall ? 6.6 : 6.6) - push);
    camera.lookAt(tall ? 0.2 : 0, tall ? 0.72 : 1.0, -0.6);
  }
  let running = false;
  function kick() { if (!running) { running = true; requestAnimationFrame(draw); } }
  function draw() {
    running = false;
    const r = sec.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
    if (!reduce) t = progress();
    apply(); aim(); renderer.render(scene, camera); placeTags();
  }
  addEventListener("scroll", kick, { passive: true });
  addEventListener("resize", () => { frame(); kick(); });
  canvas.parentElement.addEventListener("pointermove", (e) => { const b = canvas.getBoundingClientRect(); px = (e.clientX - b.left) / b.width - 0.5; py = (e.clientY - b.top) / b.height - 0.5; kick(); }, { passive: true });
  frame(); kick();
  window.__room = { get t() { return t; }, steps: STEPS.length, kick };
}
