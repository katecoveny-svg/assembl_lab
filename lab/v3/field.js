// The assembly field (from assembl.co.nz): one fixed three.js layer behind the lab page, made of square tiles. Wherever the page opens a window
// ([data-scene]), the tiles assemble into that window's picture as it scrolls into view and lift apart as it leaves.
// Point at a picture and the squares under the pointer turn over, cleanly, to show the real thing on their backs: the
// photograph in true colour, or the house under the drawing. A button turns the whole picture over. No idle motion.
import * as THREE from "three";

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const canvas = document.getElementById("field");
const windows = [...document.querySelectorAll("[data-scene]")];
// the lab's pictures: each world as it really runs (captured from the live pages), shown in the three shades until you
// point at it; Plan Studio's floor plan has its 3D model underneath
const V = "?v=20261123b";   // pictures are versioned so a browser never mixes an old picture with a new page
const IMG = (n) => `/lab/v3/img/${n}.webp${V}`;
// the lab's two worlds: the 16A floor plan drawn from its plan model, with the three.js model built from it underneath;
// Manu's birds as they render on their own pages; assembl's own house sketches to close; and, to open, the plan drop
// example house in its clearing, captured from the live twin
const SRC = { house: IMG("house"), birds: IMG("birds"), plan16a: IMG("plan16a"), model16a: IMG("model16a"), tui: IMG("tui"), sketches: IMG("sketches") };
const UNDER = { plan16a: "model16a" };              // the plan, with the model built from it underneath
// focus: where the crop sits when a window is narrower than the picture (phones): -0.5 left edge, 0 centre, 0.5 right edge
const FOCUS = { house: [0.2, 0], birds: [0.16, 0], plan16a: [0.3, 0], model16a: [0.1, 0], tui: [0.2, 0], sketches: [0.3, 0] };
const MIST = { house: 1, birds: 1, plan16a: 1, tui: 1, sketches: 0.6 };
const LIFT = {};
// pictures that do not turn over under the pointer (a photo-real model reads as broken when patches of it change colour)
const NOHOVER = new Set(["tui"]);

function fallback() {
  document.documentElement.classList.add("no-field");
  for (const w of windows) if (SRC[w.dataset.scene]) w.style.backgroundImage = `url(${SRC[w.dataset.scene]})`;
}

let ok = !!canvas;
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" }); } catch { ok = false; }

if (!ok) fallback();
else {
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor("#E3D0D2", 1);
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;   // pictures pass straight through: no tone shift
  const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const blank = new THREE.DataTexture(new Uint8Array([227, 208, 210, 255]), 1, 1); blank.needsUpdate = true;
  const U = {
    uRes: { value: new THREE.Vector2(1, 1) }, uTile: { value: 24 }, uTex: { value: blank }, uCover: { value: new THREE.Vector4(1, 1, 0, 0) },
    uScatter: { value: 1 }, uIntro: { value: reduce ? 1 : 0 }, uPointer: { value: new THREE.Vector3(-9999, -9999, 150) }, uFlip: { value: 0 }, uMist: { value: 0.9 },
    uLift: { value: 0 }, uUnder: { value: blank }, uCoverU: { value: new THREE.Vector4(1, 1, 0, 0) }, uHasUnder: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthTest: false, side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      attribute vec2 aCell; attribute vec4 aSeed; attribute float aFlip;
      uniform vec2 uRes; uniform float uTile, uScatter, uIntro, uFlip;
      varying vec2 vUv; varying float vFace, vAlpha, vGlint, vBack;
      mat3 rot(vec3 a, float t) { float c = cos(t), s = sin(t), k = 1.0 - c;
        return mat3(c + a.x*a.x*k, a.y*a.x*k + a.z*s, a.z*a.x*k - a.y*s, a.x*a.y*k - a.z*s, c + a.y*a.y*k, a.z*a.y*k + a.x*s, a.x*a.z*k + a.y*s, a.y*a.z*k - a.x*s, c + a.z*a.z*k); }
      void main() {
        vec2 centre = (aCell + 0.5) * uTile, cuv = centre / uRes;
        float order = mix(cuv.x * 0.6 + (1.0 - cuv.y) * 0.4, aSeed.x, 0.5);                // a diagonal sweep, broken up
        float s = clamp((uScatter - (1.0 - order) * 0.55) / 0.45, 0.0, 1.0); s = s * s * (3.0 - 2.0 * s);
        float i = clamp((uIntro - order * 0.6) / 0.4, 0.0, 1.0); i = 1.0 - pow(1.0 - i, 3.0);
        float f = clamp((uFlip - order * 0.55) / 0.45, 0.0, 1.0); f = sin(f * 3.14159265);  // a picture change: tiles turn edge-on and back
        float t = smoothstep(0.0, 1.0, aFlip), turn = t * 3.14159265;                     // this square turning over, like a card
        float away = max(s, 1.0 - i);
        vec3 axis = normalize(vec3(aSeed.y - 0.5, aSeed.z - 0.5, 0.0) + 1e-4);
        float ang = away * (1.2 + aSeed.w * 1.6) + f * 1.52;
        float cy = cos(turn), sy = sin(turn); mat3 ry = mat3(cy, 0.0, -sy, 0.0, 1.0, 0.0, sy, 0.0, cy);
        mat3 R = rot(axis, ang) * ry;
        vec3 p = R * vec3(position.x * uTile, -position.y * uTile, 0.0) * mix(1.0, 0.86, max(away, f));
        vec3 drift = (aSeed.xyz - 0.5) * vec3(uRes.x * 0.5, uRes.y * 0.5, 0.0) + vec3(0.0, -uRes.y * 0.2, 300.0 + aSeed.w * 700.0);
        vec3 w = vec3(centre, 0.0) + p + vec3(0.0, 0.0, sin(turn) * 40.0 + f * 80.0) + drift * away;
        float k = 1.0 / max(0.2, 1.0 - w.z / 1500.0);
        vec2 sc = (w.xy - uRes * 0.5) * k + uRes * 0.5;
        gl_Position = vec4(sc.x / uRes.x * 2.0 - 1.0, 1.0 - sc.y / uRes.y * 2.0, 0.0, 1.0);
        vBack = step(0.5, t);
        vec2 lu = vec2(mix(uv.x, 1.0 - uv.x, vBack), 1.0 - uv.y);                         // the back face reads the right way round
        vUv = (aCell + lu) * uTile / uRes;
        vec3 n = R * vec3(0.0, 0.0, 1.0);
        vFace = abs(n.z); vGlint = pow(max(0.0, dot(n, normalize(vec3(-0.4, -0.5, 0.75)))), 24.0) * min(1.0, ang + sin(turn));
        vAlpha = (1.0 - s * s) * i;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uTex, uUnder; uniform vec4 uCover, uCoverU; uniform float uMist, uHasUnder, uLift;
      varying vec2 vUv; varying float vFace, vAlpha, vGlint, vBack;
      void main() {
        vec2 u = (vUv - 0.5) * uCover.xy + 0.5 + uCover.zw;
        vec3 c = texture2D(uTex, vec2(u.x, 1.0 - u.y)).rgb, front;
        // the front of every square is in three shades only: dusty plum, muted rose and bone
        float l = smoothstep(0.0, 0.92, dot(c, vec3(0.299, 0.587, 0.114))); l = uLift + (1.0 - uLift) * l;
        vec3 plum = vec3(0.396, 0.290, 0.306), rose = vec3(0.890, 0.816, 0.824), bone = vec3(1.0, 0.992, 0.984);
        vec3 tri = l < 0.5 ? mix(plum, rose, smoothstep(0.0, 1.0, l * 2.0)) : mix(rose, bone, smoothstep(0.0, 1.0, (l - 0.5) * 2.0));
        front = mix(c, tri, uMist);
        // the back is the real thing: the photograph under the drawing, or this picture in true colour
        vec3 back = c;
        if (uHasUnder > 0.5) { vec2 w = (vUv - 0.5) * uCoverU.xy + 0.5 + uCoverU.zw; back = texture2D(uUnder, vec2(w.x, 1.0 - w.y)).rgb; }
        c = mix(front, back, vBack);
        c *= mix(1.0, 0.6 + 0.4 * vFace, step(0.001, 1.0 - vFace));
        c += vGlint * vec3(1.0, 0.992, 0.984) * 0.25;
        gl_FragColor = vec4(c, vAlpha);
      }`,
  });
  let mesh = null, flipV = new Float32Array(0), order = new Float32Array(0), flipAttr = null, gridCols = 1, gridN = 0;
  // which squares are turned over: the ones under the pointer, plus the whole picture once its button is pressed (a wave)
  let allOn = false, waveT0 = 0;
  function flips(dt, now) {
    if (!gridN) return false;
    const tile = U.uTile.value, px = U.uPointer.value.x, py = U.uPointer.value.y, R = U.uPointer.value.z, R2 = R * R;
    const wave = waveT0 ? (now - waveT0) / 900 : -1, step = dt * 3.4; let busy = false;
    for (let k = 0; k < gridN; k++) {
      const cx = (k % gridCols + 0.5) * tile - px, cy = (Math.floor(k / gridCols) + 0.5) * tile - py;
      const passed = wave >= order[k], all = waveT0 ? (allOn ? passed : !passed) : false;
      const want = ((!NOHOVER.has(current) && cx * cx + cy * cy < R2) || all) ? 1 : 0, v = flipV[k];
      if (v !== want) { flipV[k] = want > v ? Math.min(1, v + step) : Math.max(0, v - step); busy = true; }
    }
    if (wave > 0 && wave < 1.2) busy = true; else if (wave >= 1.2 && !allOn) waveT0 = 0;
    if (busy) flipAttr.needsUpdate = true;
    return busy;
  }
  function flipAll(on = !allOn) { allOn = on; waveT0 = performance.now(); kick(); return allOn; }
  function grid() {
    const W = innerWidth, H = canvas.clientHeight || innerHeight, tile = Math.max(22, Math.round(Math.min(W, 1800) / (W < 700 ? 14 : 44)));
    const cols = Math.ceil(W / tile), rows = Math.ceil(H / tile), n = cols * rows;
    renderer.setSize(W, H, false); U.uRes.value.set(W, H); U.uTile.value = tile;
    if (mesh) { scene.remove(mesh); mesh.geometry.dispose(); }
    const g = new THREE.InstancedBufferGeometry(); g.copy(new THREE.PlaneGeometry(1, 1)); g.instanceCount = n;
    const cell = new Float32Array(n * 2), seed = new Float32Array(n * 4);
    let r = 7; const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
    for (let k = 0; k < n; k++) { cell[k * 2] = k % cols; cell[k * 2 + 1] = Math.floor(k / cols); for (let j = 0; j < 4; j++) seed[k * 4 + j] = rnd(); }
    g.setAttribute("aCell", new THREE.InstancedBufferAttribute(cell, 2)); g.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seed, 4));
    flipV = new Float32Array(n); order = new Float32Array(n); gridCols = cols; gridN = n;
    for (let k = 0; k < n; k++) { const x = (k % cols + 0.5) / cols, y = (Math.floor(k / cols) + 0.5) / rows; order[k] = (x * 0.6 + (1 - y) * 0.4) * 0.8 + seed[k * 4] * 0.2; }
    flipAttr = new THREE.InstancedBufferAttribute(flipV, 1); flipAttr.setUsage(THREE.DynamicDrawUsage); g.setAttribute("aFlip", flipAttr);
    mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; scene.add(mesh);
    cover(); kick();
  }

  // ---------------------------------------------------------------------------------------------- pictures
  const tex = {}, aspect = {};
  const loader = new THREE.TextureLoader();
  const prep = (t) => { t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t; };
  for (const [id, src] of Object.entries(SRC)) loader.load(src, (t) => { tex[id] = prep(t); aspect[id] = t.image.width / t.image.height; if (current === id || UNDER[current] === id) use(current); });
  // the drawing: the live A101 sheet from chapter 03, rasterised on bone paper
  let drawingSvg = "", tDraw = 0;
  document.addEventListener("ap:sheets", (e) => { if (e.detail?.A101 && e.detail.A101 !== drawingSvg) { drawingSvg = e.detail.A101; clearTimeout(tDraw); tDraw = setTimeout(rasterise, 500); } });

  async function rasterise() {
    const url = URL.createObjectURL(new Blob([drawingSvg], { type: "image/svg+xml" })), img = new Image();
    img.src = url; try { await img.decode(); } catch { URL.revokeObjectURL(url); return; }
    const c = document.createElement("canvas"); c.width = 2970; c.height = 2100; const g = c.getContext("2d");
    g.fillStyle = "#FFFDFB"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
    const t = prep(new THREE.CanvasTexture(c)); tex.drawing?.dispose(); tex.drawing = t; aspect.drawing = c.width / c.height;
    if (current === "drawing") use("drawing"); else kick();
  }
  function fit(id, v) {
    const a = aspect[id] || 16 / 9, W = U.uRes.value.x, H = U.uRes.value.y, s = Math.max(W / a, H);
    const dw = a * s, dh = s, f = FOCUS[id] || [0, 0];
    v.set(W / dw, H / dh, f[0] * (1 - W / dw), f[1] * (1 - H / dh));
  }
  function cover() { fit(current, U.uCover.value); const u = UNDER[current]; if (u) fit(u, U.uCoverU.value); }
  let current = windows[0]?.dataset.scene || "homes", flipT = 0;
  function use(id) {
    if (!tex[id]) return; U.uTex.value = tex[id]; U.uMist.value = MIST[id] ?? 0.5; U.uLift.value = LIFT[id] ?? 0;
    const u = UNDER[id]; U.uHasUnder.value = u && tex[u] ? 1 : 0; if (u && tex[u]) U.uUnder.value = tex[u];
    cover(); kick();
  }
  function change(id) {
    if (id === current) return;
    current = id; allOn = false; waveT0 = 0; flipV.fill(0); if (flipAttr) flipAttr.needsUpdate = true;
    document.dispatchEvent(new CustomEvent("field:flip", { detail: false }));
    // if the field is mostly assembled, turn the tiles over to the new picture; otherwise swap while they are apart
    // if the field is mostly assembled, turn the tiles over to the new picture; otherwise swap while they are apart
    if (U.uScatter.value < 0.6 && !reduce) { flipT = performance.now(); setTimeout(() => use(id), 380); } else use(id);
  }

  // ---------------------------------------------------------------------------------------------- scroll and pointer
  let target = 1;
  function measure() {
    const H = innerHeight; let best = null, bestVis = 0;
    for (const w of windows) {
      const r = w.getBoundingClientRect(), vis = Math.max(0, Math.min(r.bottom, H) - Math.max(r.top, 0)) / Math.min(H, r.height);
      if (vis > bestVis) { bestVis = vis; best = w; }
    }
    if (best) change(best.dataset.scene);
    target = reduce ? (bestVis > 0 ? 0 : 1) : 1 - Math.min(1, Math.max(0, (bestVis - 0.12) / 0.7));
    return bestVis;
  }
  addEventListener("scroll", () => { measure(); kick(); }, { passive: true });
  const point = (e) => { U.uPointer.value.x = e.clientX; U.uPointer.value.y = e.clientY; U.uPointer.value.z = (e.pointerType === "touch" ? 2.4 : 3.3) * U.uTile.value; kick(); };
  addEventListener("pointermove", point, { passive: true }); addEventListener("pointerdown", point, { passive: true });
  addEventListener("pointerup", (e) => { if (e.pointerType === "touch") setTimeout(() => { U.uPointer.value.x = -9999; kick(); }, 900); }, { passive: true });
  // a finger dragging across a picture scrubs the squares too (a scroll gesture cancels pointer events)
  addEventListener("touchmove", (e) => { const t = e.touches[0]; if (!t) return; U.uPointer.value.x = t.clientX; U.uPointer.value.y = t.clientY; U.uPointer.value.z = 2.4 * U.uTile.value; kick(); }, { passive: true });
  addEventListener("touchend", () => setTimeout(() => { U.uPointer.value.x = -9999; kick(); }, 700), { passive: true });
  document.addEventListener("pointerleave", () => { U.uPointer.value.x = -9999; kick(); });

  // ---------------------------------------------------------------------------------------------- frames, only while something moves
  let running = false, t0 = performance.now(), last = 0;
  function kick() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } }
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const visible = measure() > 0;
    U.uScatter.value += (target - U.uScatter.value) * (1 - Math.exp(-dt * 7));
    if (!reduce) U.uIntro.value = Math.min(1, (now - t0) / 2600);
    U.uFlip.value = flipT ? Math.min(1, (now - flipT) / 900) : 0; if (U.uFlip.value >= 1) flipT = 0;
    const turning = flips(dt, now);
    if (visible) renderer.render(scene, camera);
    const moving = Math.abs(target - U.uScatter.value) > 0.002 || U.uIntro.value < 1 || flipT || turning;
    if (moving && visible) requestAnimationFrame(frame); else running = false;
  }
  addEventListener("resize", () => { clearTimeout(grid.t); grid.t = setTimeout(grid, 150); });
  grid(); measure(); U.uScatter.value = reduce ? target : 1; kick();
  window.__field = { change, flipAll, get current() { return current; }, get turned() { return allOn; } };
}
