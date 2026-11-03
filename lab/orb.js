// The Lab hero's DO glass orb, the same orb as the live assembl.co.nz home (Kate, 3 Nov 2026: the Lab should
// match the plum home, one glowing orb instead of the pastel cubes). Ported from the company site's
// components/site/home-directions/wow/orb.ts: the D's dot enlarged, pearl glass with the D's lilac above and
// rose below, a see-through plum core, two slow lights inside, a pearl highlight at the top-left, a thin
// bright rim and a soft bloom.
//
// Raw WebGL2, no dependencies: one quad on one canvas, the sphere shaded analytically in the fragment shader
// (no geometry, no post-processing). story.js loads it after first paint and never for reduced motion; the
// still orb in the page (.orb-still, the company site's .as-orb) is the first paint and what reduced motion,
// no JS and no WebGL keep, so failing here changes nothing a visitor needs.
//
// Motion only says that work is happening: at rest it breathes slowly (about 6.5 s), drifts a few pixels and
// its inner lights turn. As the page opens, and while a hero action is under the pointer or keyboard focus,
// the inner light quickens and brightens, then settles. It stops drawing when off screen or in a hidden tab.

const VS = `#version 300 es
layout(location=0) in vec2 aCorner;
uniform vec2 uCenter; uniform float uHalf; uniform vec2 uView;
out vec2 vP;
void main(){
  vP = aCorner;
  vec2 px = uCenter + vec2(aCorner.x, -aCorner.y) * uHalf;
  gl_Position = vec4(px.x / uView.x * 2.0 - 1.0, 1.0 - px.y / uView.y * 2.0, 0.0, 1.0);
}`;

// Same shader as the company site's orb. Premultiplied alpha.
const FS = `#version 300 es
precision highp float;
in vec2 vP;
uniform float uK; uniform float uTime; uniform float uWork; uniform float uAlpha; uniform float uRpx;
uniform vec3 uLilac; uniform vec3 uRose; uniform vec3 uPearl; uniform vec3 uSpine;
out vec4 o;
void main(){
  vec2 p = vP * uK;
  float d = length(p);
  float halo = exp(-max(d - 1.0, 0.0) * 2.5) * (1.0 - smoothstep(uK * 0.7, uK, d));
  vec3 haloCol = mix(uRose, uLilac, clamp(0.5 + p.y * 0.3, 0.0, 1.0));
  float ha = halo * (0.2 + 0.2 * uWork);
  vec4 bloom = vec4(haloCol * ha, ha);
  float inside = 1.0 - smoothstep(1.0 - 1.6 / uRpx, 1.0, d);
  if (inside <= 0.0) { o = bloom * uAlpha; return; }
  float z = sqrt(max(1.0 - d * d, 0.0));
  vec3 n = vec3(p, z);
  float F = pow(1.0 - z, 2.0);
  vec3 body = mix(uLilac, uRose, smoothstep(-0.55, 0.55, -p.y + p.x * 0.2));
  float sp = uTime * (0.14 + 0.5 * uWork);
  vec2 c1 = 0.42 * vec2(cos(sp), sin(sp * 0.8));
  vec2 c2 = 0.38 * vec2(cos(sp * 0.7 + 2.6), sin(sp + 2.1));
  float g1 = exp(-dot(p - c1, p - c1) * 3.2), g2 = exp(-dot(p - c2, p - c2) * 3.6);
  vec3 inner = mix(mix(uRose, uLilac, g2 / max(g1 + g2, 1e-3)), uPearl, 0.12);
  vec3 col = mix(uSpine, body, 0.4 + 0.58 * F);
  col = mix(col, inner, clamp((g1 + g2) * (0.2 + 0.32 * uWork), 0.0, 0.75));
  float cau = pow(max(dot(p / max(d, 1e-3), normalize(vec2(0.45, -0.85))), 0.0), 3.0) * smoothstep(0.35, 0.92, d);
  col += mix(uRose, uPearl, 0.45) * cau * 0.6;
  col = mix(col, mix(body, uPearl, 0.55), smoothstep(0.9, 0.99, d) * 0.6);
  vec3 H = normalize(normalize(vec3(-0.5, 0.62, 0.75)) + vec3(0.0, 0.0, 1.0));
  float nh = max(dot(n, H), 0.0);
  col += uPearl * (smoothstep(0.5, 1.0, pow(nh, 200.0)) * 1.2 + pow(nh, 30.0) * 0.4 + pow(nh, 6.0) * 0.06);
  float a = inside * (0.86 + 0.14 * F);
  o = (vec4(clamp(col, 0.0, 1.0) * a, a) + bloom * (1.0 - a)) * uAlpha;
}`;

// The DO mark's colours (story.css: --do-lilac, --do-rose, --do-pearl, --do-spine; same as the company site).
const LILAC = [0xD7, 0xB3, 0xF0], ROSE = [0xE5, 0x9A, 0xA2], PEARL = [0xFF, 0xF3, 0xF6], SPINE = [0x4A, 0x17, 0x35];
// Quad half size in sphere radii: room for the bloom. The canvas is 1.5× the host (story.css), so the bloom
// fades out before the canvas edge.
const K = 2.3;
// Sphere radius as a share of the host's width (the still orb is the same size: inset 19%).
const R = 0.31;

const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);

export function mount(host) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl2', { alpha: true, antialias: false, premultipliedAlpha: true, depth: false, stencil: false, powerPreference: 'low-power' });
  if (!gl) return;
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o) || 'shader'); return o; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  host.append(canvas);

  const mobile = matchMedia('(max-width: 760px)').matches;
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(prog, n);
  const u = { center: U('uCenter'), half: U('uHalf'), view: U('uView'), k: U('uK'), time: U('uTime'), work: U('uWork'), alpha: U('uAlpha'), rpx: U('uRpx') };
  gl.useProgram(prog);
  const rgb = c => [c[0] / 255, c[1] / 255, c[2] / 255];
  gl.uniform3f(U('uLilac'), ...rgb(LILAC)); gl.uniform3f(U('uRose'), ...rgb(ROSE)); gl.uniform3f(U('uPearl'), ...rgb(PEARL)); gl.uniform3f(U('uSpine'), ...rgb(SPINE));
  gl.uniform1f(u.k, K);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  let dpr = Math.min(mobile ? 1.25 : 1.5, window.devicePixelRatio || 1);
  let W = 1, Hh = 1, hostW = 1, raf = 0, onScreen = true, frames = 0, ready = false;
  const deltas = [];
  const resize = () => {
    W = canvas.clientWidth || 1; Hh = canvas.clientHeight || 1; hostW = host.clientWidth || W / 1.5;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(Hh * dpr);
    wake();
  };
  const ro = new ResizeObserver(resize); ro.observe(canvas);

  // Work: the page opening (a few quick pulses, as on the company site), then a hero action under the
  // pointer or keyboard focus.
  const t0 = performance.now();
  let last = t0, hoverOn = 0, hoverK = 0;
  for (const a of document.querySelectorAll('.hero .actions .btn')) {
    a.addEventListener('pointerenter', () => { hoverOn = 1; wake(); });
    a.addEventListener('pointerleave', () => { hoverOn = 0; wake(); });
    a.addEventListener('focus', () => { hoverOn = 1; wake(); });
    a.addEventListener('blur', () => { hoverOn = 0; wake(); });
  }

  function frame(now) {
    raf = 0;
    if (!onScreen || document.hidden) return;
    const delta = now - last, dt = Math.min(0.05, Math.max(0.001, delta / 1000));
    last = now;
    const t = (now - t0) / 1000;
    hoverK += (hoverOn - hoverK) * (1 - Math.exp(-dt * 4));
    const opening = Math.max(...[0.4, 1.45, 2.55, 3.95].map((c, i) => Math.exp(-(((t - c) / 0.38) ** 2)) * (i === 3 ? 1 : 0.6)));
    const work = clamp(Math.max(opening, hoverK * 0.85));
    // Breathing (about 6.5 s) and a slow drift of a few pixels: alive, not busy.
    const breathe = 1 + 0.06 * Math.sin((t * Math.PI * 2) / 6.5) + 0.08 * work;
    const drift = (mobile ? 7 : 14) * Math.min(1, hostW / 440);
    const x = W / 2 + Math.sin(t * 0.23) * drift, y = Hh / 2 + Math.cos(t * 0.19) * drift;
    const r = hostW * R * breathe;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(u.center, x * dpr, y * dpr);
    gl.uniform1f(u.half, r * K * dpr);
    gl.uniform2f(u.view, canvas.width, canvas.height);
    gl.uniform1f(u.rpx, r * dpr);
    gl.uniform1f(u.time, t);
    gl.uniform1f(u.work, work);
    gl.uniform1f(u.alpha, 1);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (!ready) { ready = true; host.dataset.gl = 'on'; }
    // Governor: a device that can't hold ~22 fps gets a lower resolution, then the still orb.
    frames++;
    if (frames > 24 && frames <= 110) {
      deltas.push(delta);
      if (deltas.length >= 60) {
        const median = [...deltas].sort((a, b) => a - b)[30]; deltas.length = 0;
        if (median > 45) {
          if (dpr > 1) { dpr = 1; resize(); frames = 25; }
          else { stop(); return; }
        }
      }
    }
    raf = requestAnimationFrame(frame);
  }
  function wake() { if (!raf && onScreen && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function stop() {
    if (raf) cancelAnimationFrame(raf); raf = 0;
    delete host.dataset.gl; io.disconnect(); ro.disconnect();
    setTimeout(() => canvas.remove(), 800);
  }
  const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; wake(); });
  io.observe(host);
  document.addEventListener('visibilitychange', wake);
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); stop(); });
  resize();
}
