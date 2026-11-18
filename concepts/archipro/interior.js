// A room, furnished by the studio guide. A rendered New Zealand living room is laid out in square tiles, printed in the
// three shades. As you scroll, the guide on the phone beside it works through a request ("furnish this room from the
// sample catalogue") one product at a time, and the squares over each product turn over to show it in true colour,
// tagged with what it is and who supplies it. Point at the room to turn squares yourself. The phone's conversation is a
// scripted demonstration, labelled as one; "Ask the live guide" opens the real one. Nothing moves on its own.
import * as THREE from "three";
import { byId } from "./data.js";

const sec = document.getElementById("room-sec"), canvas = document.getElementById("room");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const SRC = "./media/room-a.webp";                                   // a render, not a photograph
const cat = (id, fallback) => ({ name: byId[id]?.name || fallback, sup: `${byId[id]?.supplier || "Sample supplier"} · sample product` });
// each product: its place in the picture (percent boxes), what the guide says while it works, and its tag
const STEPS = [
  { boxes: [[14, 0, 69, 63]], doing: "Searching the sample catalogue: black window joinery", ...cat("hj-tb-black", "Thermally broken aluminium, matt black"), at: [41, 30] },
  { boxes: [[0, 86, 100, 100], [62, 60, 100, 100]], doing: "Placing the floor: polished concrete", ...cat("gw-concrete", "Ground and polished concrete"), at: [82, 80] },
  { boxes: [[2, 52, 52, 86]], doing: "Placing a linen sofa", name: "Modular sofa, oatmeal linen", sup: "Sample product", at: [24, 64] },
  { boxes: [[8, 72, 84, 100], [39, 66, 64, 91]], doing: "Placing an oak coffee table and a rug", name: "Round oak coffee table, wool and jute rug", sup: "Sample products", at: [51, 74] },
  { boxes: [[73, 57, 97, 96]], doing: "Placing an oak lounge chair", name: "Oak lounge chair, woven cord seat", sup: "Sample product", at: [85, 70] },
  { boxes: [[69, 49, 94, 68]], doing: "Placing the dining table and chairs", name: "Oak dining table and six cord-seat chairs", sup: "Sample products", at: [81, 57] },
  { boxes: [[45, 0, 58, 20], [75, 10, 90, 37]], doing: "Hanging the pendants", name: "White dome pendants", sup: "Sample products", at: [52, 12] },
];

if (sec && canvas) {
  let r; try { r = new THREE.WebGLRenderer({ canvas, antialias: true }); } catch { r = null; }
  if (!r) sec.classList.add("no-room"); else start(r);
}

function start(renderer) {
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setClearColor("#E3D0D2", 1);
  const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const blank = new THREE.DataTexture(new Uint8Array([227, 208, 210, 255]), 1, 1); blank.needsUpdate = true;
  const U = { uRes: { value: new THREE.Vector2(1, 1) }, uTile: { value: 24 }, uTex: { value: blank }, uCover: { value: new THREE.Vector4(1, 1, 0, 0) }, uIntro: { value: reduce ? 1 : 0 } };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthTest: false, side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      attribute vec2 aCell; attribute float aSeed, aFlip;
      uniform vec2 uRes; uniform float uTile, uIntro;
      varying vec2 vUv; varying float vBack, vFace, vAlpha;
      void main() {
        vec2 centre = (aCell + 0.5) * uTile, cuv = centre / uRes;
        float order = mix(cuv.x * 0.6 + cuv.y * 0.4, aSeed, 0.45);
        float i = clamp((uIntro - order * 0.6) / 0.4, 0.0, 1.0); i = 1.0 - pow(1.0 - i, 3.0);
        float t = smoothstep(0.0, 1.0, aFlip), turn = t * 3.14159265 + (1.0 - i) * (1.1 + aSeed * 1.4);
        float c = cos(turn), s = sin(turn);
        vec3 p = vec3(position.x * uTile * c, -position.y * uTile, -position.x * uTile * s) * mix(0.82, 1.0, i);
        vec3 w = vec3(centre, 0.0) + p + vec3(0.0, (1.0 - i) * 40.0, sin(t * 3.14159265) * 30.0);
        float k = 1.0 / max(0.2, 1.0 - w.z / 1400.0);
        vec2 sc = (w.xy - uRes * 0.5) * k + uRes * 0.5;
        gl_Position = vec4(sc.x / uRes.x * 2.0 - 1.0, 1.0 - sc.y / uRes.y * 2.0, 0.0, 1.0);
        vBack = step(0.5, t);
        vUv = (aCell + vec2(mix(uv.x, 1.0 - uv.x, vBack), 1.0 - uv.y)) * uTile / uRes;
        vFace = abs(c); vAlpha = i;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uTex; uniform vec4 uCover;
      varying vec2 vUv; varying float vBack, vFace, vAlpha;
      void main() {
        vec2 u = (vUv - 0.5) * uCover.xy + 0.5 + uCover.zw;
        vec3 c = texture2D(uTex, vec2(u.x, 1.0 - u.y)).rgb;
        float l = smoothstep(0.0, 0.92, dot(c, vec3(0.299, 0.587, 0.114))); l = 0.32 + 0.68 * l;
        vec3 plum = vec3(0.396, 0.290, 0.306), rose = vec3(0.890, 0.816, 0.824), bone = vec3(1.0, 0.992, 0.984);
        vec3 tri = l < 0.5 ? mix(plum, rose, smoothstep(0.0, 1.0, l * 2.0)) : mix(rose, bone, smoothstep(0.0, 1.0, (l - 0.5) * 2.0));
        c = mix(tri, c, vBack);                                  // front: three shades; back: the room in true colour
        c *= 0.62 + 0.38 * vFace;
        gl_FragColor = vec4(c, vAlpha);
      }`,
  });
  let mesh = null, cols = 1, rows = 1, n = 0, flip = new Float32Array(0), want = new Float32Array(0), delay = new Float32Array(0), attr = null;
  function grid() {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); U.uRes.value.set(w, h);
    const tile = Math.max(16, Math.round(w / (w < 600 ? 18 : 42))); U.uTile.value = tile;
    cols = Math.ceil(w / tile); rows = Math.ceil(h / tile); n = cols * rows;
    if (mesh) { scene.remove(mesh); mesh.geometry.dispose(); }
    const g = new THREE.InstancedBufferGeometry(); g.copy(new THREE.PlaneGeometry(1, 1)); g.instanceCount = n;
    const cell = new Float32Array(n * 2), seed = new Float32Array(n); let s = 9; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let k = 0; k < n; k++) { cell[k * 2] = k % cols; cell[k * 2 + 1] = Math.floor(k / cols); seed[k] = rnd(); }
    flip = new Float32Array(n); want = new Float32Array(n); delay = new Float32Array(n).map(() => rnd() * 0.25);
    g.setAttribute("aCell", new THREE.InstancedBufferAttribute(cell, 2)); g.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seed, 1));
    attr = new THREE.InstancedBufferAttribute(flip, 1); attr.setUsage(THREE.DynamicDrawUsage); g.setAttribute("aFlip", attr);
    mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; scene.add(mesh);
    fit(); placeTags(); kick();
  }
  // cover the stage with the picture
  let aspect = 16 / 9;
  function fit() { const W = U.uRes.value.x, H = U.uRes.value.y, s = Math.max(W / aspect, H); U.uCover.value.set(W / (aspect * s), H / s, 0, 0); }
  // picture percent → stage pixels, through the same cover fit
  function toStage(px, py) {
    const W = U.uRes.value.x, H = U.uRes.value.y, c = U.uCover.value;
    return [((px / 100 - 0.5 - c.z) / c.x + 0.5) * W, ((py / 100 - 0.5 - c.w) / c.y + 0.5) * H];
  }
  new THREE.TextureLoader().load(SRC, (t) => { t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 8; U.uTex.value = t; aspect = t.image.width / t.image.height; fit(); placeTags(); step = -2; kick(); });

  // ------------------------------------------------------------------------------------------------ the guide on the phone, and the tags
  const log = document.getElementById("room-log"), tags = document.getElementById("room-tags"), phone = document.getElementById("room-phone");
  const cardN = document.getElementById("room-n"), cardNm = document.getElementById("room-nm"), cardSup = document.getElementById("room-sup"), card = document.getElementById("room-card");
  tags.innerHTML = STEPS.map((s, i) => `<span class="rt"><i></i><b>${String(i + 1).padStart(2, "0")}</b><em>${s.name}</em></span>`).join("");
  const tagEls = [...tags.children];
  log.innerHTML = `<div class="msg you">Furnish this room from the sample catalogue: black joinery, polished concrete, warm oak and linen.</div>` +
    STEPS.map((s, i) => `<div class="gstep" data-i="${i}" hidden><i aria-hidden="true"></i><span>${s.doing}</span></div>`).join("") +
    `<div class="msg it end" hidden>Seven products placed and tagged. I can swap any of them, or add them all to the specification.</div>`;
  const stepEls = [...log.querySelectorAll(".gstep")], endEl = log.querySelector(".end");
  function placeTags() { STEPS.forEach((s, k) => { const [x, y] = toStage(s.at[0], s.at[1]); tagEls[k].style.transform = `translate(${x}px, ${y}px)`; }); }

  // ------------------------------------------------------------------------------------------------ scroll: how far the guide has got
  let step = -2, revealed = false;
  function progress() { const r = sec.getBoundingClientRect(); return Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight))); }
  function setStep(k) {
    if (k === step) return; step = k;
    // which squares should be turned: every product up to this step, the newest waiting by distance from its middle
    want.fill(0); const tile = U.uTile.value, now = performance.now();
    for (let j = 0; j <= k && j < STEPS.length; j++) for (const [x0, y0, x1, y1] of STEPS[j].boxes) {
      const [ax, ay] = toStage(x0, y0), [bx, by] = toStage(x1, y1), mx = (ax + bx) / 2, my = (ay + by) / 2;
      for (let r = Math.max(0, Math.floor(ay / tile)); r < Math.min(rows, Math.ceil(by / tile)); r++) for (let c = Math.max(0, Math.floor(ax / tile)); c < Math.min(cols, Math.ceil(bx / tile)); c++) {
        const i = r * cols + c; if (want[i]) continue;
        const d = Math.hypot((c + 0.5) * tile - mx, (r + 0.5) * tile - my) / 900; want[i] = now + (j === k ? (d + delay[i]) * 1000 : 0) + 1;
      }
    }
    // the last step done, the rest of the room turns over too, in a sweep from the window
    if (k === STEPS.length - 1) for (let i = 0; i < n; i++) if (!want[i]) { const c = i % cols, r = (i / cols) | 0; want[i] = now + 1400 + ((c / cols) * 0.5 + (r / rows) * 0.3 + delay[i]) * 1000; }
    stepEls.forEach((el, j) => { el.className = "gstep" + (j < k ? " done" : j === k ? " run" : ""); el.hidden = j > k; });
    if (k >= 0 && k < STEPS.length) setTimeout(() => { if (step === k) stepEls[k].className = "gstep done"; }, 900);
    endEl.hidden = k < STEPS.length - 1;
    tagEls.forEach((el, j) => { el.classList.toggle("on", j <= k); el.classList.toggle("cur", j === k); });
    const s = STEPS[Math.max(0, Math.min(k, STEPS.length - 1))];
    card.classList.toggle("on", k >= 0); cardN.textContent = String(Math.max(0, k) + 1).padStart(2, "0"); cardNm.textContent = s.name; cardSup.textContent = s.sup;
    log.scrollTop = log.scrollHeight; kick();
  }
  // the phone's screen assembles from squares as it arrives, like everything else on the page
  function assemblePhone() {
    if (reduce || !phone) return;
    const g = document.createElement("div"); g.className = "guide-sq"; g.setAttribute("aria-hidden", "true");
    const cols = 6, rows = Math.max(10, Math.round(cols * phone.clientHeight / Math.max(1, phone.clientWidth))); let html = "";
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) html += `<i style="--d:${((c / cols) * 0.3 + (r / rows) * 0.45 + Math.random() * 0.18 + 0.2).toFixed(2)}s"></i>`;
    g.innerHTML = html; phone.append(g); setTimeout(() => g.remove(), 2200);
  }
  // the pointer turns squares too, the same as everywhere else on the page
  let px = -9999, py = -9999;
  canvas.addEventListener("pointermove", (e) => { const b = canvas.getBoundingClientRect(); px = e.clientX - b.left; py = e.clientY - b.top; kick(); }, { passive: true });
  canvas.addEventListener("pointerleave", () => { px = py = -9999; kick(); });

  let running = false, last = performance.now(), t0 = 0;
  function kick() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } }
  function frame(now) {
    running = false; const r = sec.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight || !n) return;
    if (!revealed && r.top < innerHeight * 0.6) { revealed = true; t0 = now; phone?.classList.add("in"); assemblePhone(); }
    if (revealed && !reduce) U.uIntro.value = Math.min(1, (now - t0) / 1600);
    const t = reduce ? 1 : progress(), k = t < 0.06 ? -1 : Math.min(STEPS.length - 1, Math.floor((t - 0.06) / (0.84 / STEPS.length)));
    setStep(reduce ? STEPS.length - 1 : k);
    const dt = Math.min(0.05, (now - last) / 1000); last = now; const tile = U.uTile.value, R2 = (tile * 2.6) ** 2; let busy = false;
    for (let i = 0; i < n; i++) {
      const c = i % cols, rr = (i / cols) | 0, dx = (c + 0.5) * tile - px, dy = (rr + 0.5) * tile - py;
      const on = (want[i] && now >= want[i]) || dx * dx + dy * dy < R2 ? 1 : 0;
      if (want[i] && now < want[i]) busy = true;
      if (flip[i] !== on) { flip[i] = reduce ? on : on > flip[i] ? Math.min(1, flip[i] + dt * 3.2) : Math.max(0, flip[i] - dt * 3.2); busy = true; }
    }
    if (attr) attr.needsUpdate = true;
    renderer.render(scene, camera);
    if (busy || U.uIntro.value < 1) kick();
  }
  addEventListener("scroll", kick, { passive: true });
  addEventListener("resize", () => { clearTimeout(grid.t); grid.t = setTimeout(() => { grid(); step = -2; kick(); }, 150); });
  document.getElementById("room-ask")?.addEventListener("click", () => document.querySelector("[data-guide-open]")?.click());
  grid();
  window.__room = { get step() { return step; }, steps: STEPS.length, kick };
}
