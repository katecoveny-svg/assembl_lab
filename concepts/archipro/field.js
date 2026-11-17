// The assembly field: one fixed three.js layer behind the page, made of square tiles. Wherever the page opens a window
// ([data-scene]), the tiles assemble into that window's picture as it scrolls into view and lift apart as it leaves.
// Pictures: the two homes (a render), the live A101 plan from chapter 03 (redrawn whenever the model changes), the 16A
// twin still and the café render. Tiles answer the pointer. No idle motion: it moves only when you scroll or point.
import * as THREE from "three";

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const canvas = document.getElementById("field");
const windows = [...document.querySelectorAll("[data-scene]")];
const SRC = { homes: "./media/two-homes-render.webp", twin: "./media/16a-still.webp", house: "./media/nz-house.webp" };
const FOCUS = { homes: [0, 0.04], twin: [0, 0], house: [0, 0.02], drawing: [-0.06, 0] };   // nudge the crop toward the subject
const MIST = { homes: 1, twin: 1, house: 1, drawing: 1 };                         // how far each picture goes to muted rose

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
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthTest: false,
    vertexShader: /* glsl */ `
      attribute vec2 aCell; attribute vec4 aSeed;
      uniform vec2 uRes; uniform float uTile, uScatter, uIntro, uFlip; uniform vec3 uPointer;
      varying vec2 vUv; varying float vFace, vAlpha, vGlint, vNear;
      mat3 rot(vec3 a, float t) { float c = cos(t), s = sin(t), k = 1.0 - c;
        return mat3(c + a.x*a.x*k, a.y*a.x*k + a.z*s, a.z*a.x*k - a.y*s, a.x*a.y*k - a.z*s, c + a.y*a.y*k, a.z*a.y*k + a.x*s, a.x*a.z*k + a.y*s, a.y*a.z*k - a.x*s, c + a.z*a.z*k); }
      void main() {
        vec2 centre = (aCell + 0.5) * uTile, cuv = centre / uRes;
        float order = mix(cuv.x * 0.6 + (1.0 - cuv.y) * 0.4, aSeed.x, 0.5);                // a diagonal sweep, broken up
        float s = clamp((uScatter - (1.0 - order) * 0.55) / 0.45, 0.0, 1.0); s = s * s * (3.0 - 2.0 * s);
        float i = clamp((uIntro - order * 0.6) / 0.4, 0.0, 1.0); i = 1.0 - pow(1.0 - i, 3.0);
        float f = clamp((uFlip - order * 0.55) / 0.45, 0.0, 1.0); f = sin(f * 3.14159265);  // a picture change: tiles turn edge-on and back
        vec2 pd = centre - uPointer.xy; float near = exp(-dot(pd, pd) / (uPointer.z * uPointer.z));
        float away = max(s, 1.0 - i);
        vec3 axis = normalize(vec3(aSeed.y - 0.5, aSeed.z - 0.5, 0.0) + 1e-4);
        float ang = away * (1.2 + aSeed.w * 1.6) + f * 1.52 + near * 0.55 * (aSeed.w - 0.5);
        vec3 p = rot(axis, ang) * vec3(position.x * uTile, -position.y * uTile, 0.0) * mix(1.0, 0.86, max(away, f));
        vec3 drift = (aSeed.xyz - 0.5) * vec3(uRes.x * 0.5, uRes.y * 0.5, 0.0) + vec3(0.0, -uRes.y * 0.2, 300.0 + aSeed.w * 700.0);
        vec3 w = vec3(centre, 0.0) + p + vec3(0.0, 0.0, near * 46.0 + f * 80.0) + drift * away;
        float k = 1.0 / max(0.2, 1.0 - w.z / 1500.0);
        vec2 sc = (w.xy - uRes * 0.5) * k + uRes * 0.5;
        gl_Position = vec4(sc.x / uRes.x * 2.0 - 1.0, 1.0 - sc.y / uRes.y * 2.0, 0.0, 1.0);
        vUv = (aCell + vec2(uv.x, 1.0 - uv.y)) * uTile / uRes;
        vec3 n = rot(axis, ang) * vec3(0.0, 0.0, 1.0);
        vFace = abs(n.z); vGlint = pow(max(0.0, dot(n, normalize(vec3(-0.4, -0.5, 0.75)))), 24.0) * min(1.0, ang);
        vAlpha = (1.0 - s * s) * i; vNear = near;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uTex; uniform vec4 uCover; uniform float uMist;
      varying vec2 vUv; varying float vFace, vAlpha, vGlint, vNear;
      void main() {
        vec2 u = (vUv - 0.5) * uCover.xy + 0.5 + uCover.zw;
        vec3 c = texture2D(uTex, vec2(u.x, 1.0 - u.y)).rgb;
        // three shades only: dusty plum, muted rose and bone; the pointer (or a finger) brings the true colour back
        float m = uMist * (1.0 - smoothstep(0.2, 0.8, vNear)), l = smoothstep(0.0, 0.92, dot(c, vec3(0.299, 0.587, 0.114)));
        vec3 plum = vec3(0.396, 0.290, 0.306), rose = vec3(0.890, 0.816, 0.824), bone = vec3(1.0, 0.992, 0.984);
        vec3 tri = l < 0.5 ? mix(plum, rose, smoothstep(0.0, 1.0, l * 2.0)) : mix(rose, bone, smoothstep(0.0, 1.0, (l - 0.5) * 2.0));
        c = mix(c, tri, m);
        c *= 0.42 + 0.58 * vFace;
        c += vGlint * vec3(1.0, 0.992, 0.984) * 0.4 + pow(1.0 - vFace, 5.0) * vec3(0.890, 0.816, 0.824) * 0.16;
        gl_FragColor = vec4(c, vAlpha);
      }`,
  });
  let mesh = null;
  function grid() {
    const W = innerWidth, H = canvas.clientHeight || innerHeight, tile = Math.max(14, Math.round(Math.min(W, 1800) / (W < 700 ? 26 : 84)));
    const cols = Math.ceil(W / tile), rows = Math.ceil(H / tile), n = cols * rows;
    renderer.setSize(W, H, false); U.uRes.value.set(W, H); U.uTile.value = tile;
    if (mesh) { scene.remove(mesh); mesh.geometry.dispose(); }
    const g = new THREE.InstancedBufferGeometry(); g.copy(new THREE.PlaneGeometry(1, 1)); g.instanceCount = n;
    const cell = new Float32Array(n * 2), seed = new Float32Array(n * 4);
    let r = 7; const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
    for (let k = 0; k < n; k++) { cell[k * 2] = k % cols; cell[k * 2 + 1] = Math.floor(k / cols); for (let j = 0; j < 4; j++) seed[k * 4 + j] = rnd(); }
    g.setAttribute("aCell", new THREE.InstancedBufferAttribute(cell, 2)); g.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seed, 4));
    mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; scene.add(mesh);
    cover(); kick();
  }

  // ---------------------------------------------------------------------------------------------- pictures
  const tex = {}, aspect = {};
  const loader = new THREE.TextureLoader();
  const prep = (t) => { t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t; };
  for (const [id, src] of Object.entries(SRC)) loader.load(src, (t) => { tex[id] = prep(t); aspect[id] = t.image.width / t.image.height; if (current === id) use(id); });
  // the drawing: the live A101 sheet from chapter 03, rasterised on bone paper
  let drawingSvg = "", tDraw = 0;
  document.addEventListener("ap:sheets", (e) => { if (e.detail?.A101 && e.detail.A101 !== drawingSvg) { drawingSvg = e.detail.A101; clearTimeout(tDraw); tDraw = setTimeout(rasterise, 500); } });
  if (window.__sheets?.A101) { drawingSvg = window.__sheets.A101; tDraw = setTimeout(rasterise, 300); }
  async function rasterise() {
    const url = URL.createObjectURL(new Blob([drawingSvg], { type: "image/svg+xml" })), img = new Image();
    img.src = url; try { await img.decode(); } catch { URL.revokeObjectURL(url); return; }
    const c = document.createElement("canvas"); c.width = 2970; c.height = 2100; const g = c.getContext("2d");
    g.fillStyle = "#FFFDFB"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
    const t = prep(new THREE.CanvasTexture(c)); tex.drawing?.dispose(); tex.drawing = t; aspect.drawing = c.width / c.height;
    if (current === "drawing") use("drawing"); else kick();
  }
  function cover() {
    const id = current, a = aspect[id] || 16 / 9, W = U.uRes.value.x, H = U.uRes.value.y, s = Math.max(W / a, H) ;
    const dw = a * s, dh = s, f = FOCUS[id] || [0, 0];
    U.uCover.value.set(W / dw, H / dh, f[0] * (1 - W / dw), f[1] * (1 - H / dh));
  }
  let current = windows[0]?.dataset.scene || "homes", flipT = 0;
  function use(id) { if (!tex[id]) return; U.uTex.value = tex[id]; U.uMist.value = MIST[id] ?? 0.5; cover(); kick(); }
  function change(id) {
    if (id === current) return;
    current = id;
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
  const point = (e) => { U.uPointer.value.x = e.clientX; U.uPointer.value.y = e.clientY; U.uPointer.value.z = e.pointerType === "touch" ? 120 : 150; kick(); };
  addEventListener("pointermove", point, { passive: true }); addEventListener("pointerdown", point, { passive: true });
  addEventListener("pointerup", (e) => { if (e.pointerType === "touch") setTimeout(() => { U.uPointer.value.x = -9999; kick(); }, 900); }, { passive: true });
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
    if (visible) renderer.render(scene, camera);
    const moving = Math.abs(target - U.uScatter.value) > 0.002 || U.uIntro.value < 1 || flipT;
    if (moving && visible) requestAnimationFrame(frame); else running = false;
  }
  addEventListener("resize", () => { clearTimeout(grid.t); grid.t = setTimeout(grid, 150); });
  grid(); measure(); U.uScatter.value = reduce ? target : 1; kick();
  window.__field = { change, get current() { return current; } };
}
