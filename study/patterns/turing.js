/* Turing Garden: the Gray–Scott reaction–diffusion model on the GPU.
 * Two virtual chemicals spread at different rates; B feeds on A (A + 2B → 3B) while A is topped up and B is removed.
 * Alan Turing (1952) proposed that reactions like this could lay down spots and stripes in living tissue.
 * This is that mathematical model with hand-picked feed and kill rates, not a model of any particular animal. */
import {createGPU, rng, hex, PALETTES, PAPER, NIGHT} from './gpu.js';

const HEAD = `#version 300 es
precision highp float; in vec2 uv; out vec4 o;`;
// One explicit Euler step with a 9-point Laplacian on a wrapped (toroidal) grid.
const STEP = `${HEAD} uniform sampler2D s; uniform vec2 texel; uniform float F, K, drift;
vec2 at(vec2 d){ return texture(s, fract(uv + d * texel)).xy; }
void main(){
  vec2 c = at(vec2(0));
  vec2 lap = .2 * (at(vec2(1, 0)) + at(vec2(-1, 0)) + at(vec2(0, 1)) + at(vec2(0, -1)))
           + .05 * (at(vec2(1, 1)) + at(vec2(-1, 1)) + at(vec2(1, -1)) + at(vec2(-1, -1))) - c;
  float k = K + drift * (uv.y - .5) * .004 + drift * sin(uv.x * 6.2832) * .0015;
  float r = c.x * c.y * c.y;
  vec2 n = c + vec2(lap.x - r + F * (1. - c.x), .5 * lap.y + r - (k + F) * c.y);
  o = vec4(clamp(n, 0., 1.), 0, 1); }`;
const PAINT = `${HEAD} uniform sampler2D s; uniform vec2 point; uniform float radius, aspect;
void main(){ vec2 d = uv - point; d.x *= aspect; vec2 c = texture(s, uv).xy;
  float m = smoothstep(radius, radius * .55, length(d)); o = vec4(mix(c, vec2(.45, .9), m), 0, 1); }`;
// Glossy enamel: B concentration becomes height, lit from the upper left.
const DISPLAY = `${HEAD} uniform sampler2D s; uniform vec2 scale, size; uniform vec3 paper, ink0, ink1, ink2; uniform float dark;
float B(vec2 q){ vec2 p = q * size - .5, f = fract(p); ivec2 i = ivec2(floor(p)), m = ivec2(size) - 1;
  float a = texelFetch(s, clamp(i, ivec2(0), m), 0).y, b = texelFetch(s, clamp(i + ivec2(1, 0), ivec2(0), m), 0).y;
  float c = texelFetch(s, clamp(i + ivec2(0, 1), ivec2(0), m), 0).y, d = texelFetch(s, clamp(i + ivec2(1), ivec2(0), m), 0).y;
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y); }
void main(){
  vec2 q = .5 + (uv - .5) * scale, e = 1. / size;
  float v = B(q), h = smoothstep(.08, .38, v);
  vec3 n = normalize(vec3(B(q - vec2(e.x, 0)) - B(q + vec2(e.x, 0)), B(q - vec2(0, e.y)) - B(q + vec2(0, e.y)), .09));
  vec3 L = normalize(vec3(-.5, .6, .65));
  float diffuse = .78 + .22 * max(dot(n, L), 0.), spec = pow(max(dot(reflect(-L, n), vec3(0, 0, 1)), 0.), 36.);
  vec3 c = mix(paper, ink1, smoothstep(.04, .16, v));
  c = mix(c, ink0, smoothstep(.16, .34, v));
  c = mix(c, ink2, smoothstep(.36, .5, v) * .55);
  c = c * mix(1., diffuse, h) + spec * h * (dark > .5 ? .25 : .35);
  float rim = smoothstep(.02, .0, abs(v - .11)) * .25; c = mix(c, ink2, rim);
  o = vec4(c, 1); }`;

// Feed and kill rates from Robert Munafo's map of Gray–Scott regimes; Pattern slides between them.
const REGIMES = [[.0367, .0649, 'dividing cells'], [.0545, .062, 'coral growth'], [.029, .057, 'maze'], [.039, .058, 'fingerprint'], [.078, .061, 'worms']];
export function regime(energy) {
  const t = Math.max(0, Math.min(1, energy)) * (REGIMES.length - 1), i = Math.min(REGIMES.length - 2, Math.floor(t)), f = t - i;
  return {F: REGIMES[i][0] + (REGIMES[i + 1][0] - REGIMES[i][0]) * f, K: REGIMES[i][1] + (REGIMES[i + 1][1] - REGIMES[i][1]) * f, name: REGIMES[Math.round(t)][2]};
}

export function createTuring(canvas) {
  const g = createGPU(canvas), {gl} = g;
  const P = {step: g.program(STEP), paint: g.program(PAINT), display: g.program(DISPLAY)};
  let grid = null, aspect = 1, last = 0, settings = {}, seededWord = null, lastPaint = null;
  function seed(seedValue, word) {
    aspect = canvas.width / canvas.height || 1;
    const base = g.mobile ? 210 : 300, w = aspect >= 1 ? Math.round(base * aspect) : base, h = aspect >= 1 ? base : Math.round(base / aspect);
    if (grid) g.free(grid);
    grid = g.double(w, h, 'rg32', false);
    const data = new Float32Array(w * h * 2), rand = rng(seedValue);
    for (let i = 0; i < w * h; i++) data[i * 2] = 1;
    const blob = (cx, cy, r) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { if (x * x + y * y > r * r) continue; const px = (cx + x + w) % w, py = (cy + y + h) % h, i = (py * w + px) * 2; data[i] = .5; data[i + 1] = .25 + rand() * .1; } };
    // Your word is the seed: its letters are where chemical B starts.
    const text = (word || '').trim().toUpperCase();
    if (text) {
      const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
      x.fillStyle = '#000'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
      let size = h * .42; x.font = `700 ${size}px "Instrument Sans", system-ui, sans-serif`;
      while (x.measureText(text).width > w * .82 && size > 8) { size *= .92; x.font = `700 ${size}px "Instrument Sans", system-ui, sans-serif`; }
      x.fillText(text, w / 2, h / 2);
      const px = x.getImageData(0, 0, w, h).data;
      for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) { if (px[(y * w + xx) * 4] > 128 && rand() > .35) { const i = ((h - 1 - y) * w + xx) * 2; data[i] = .5; data[i + 1] = .25; } }
    }
    for (let i = 0; i < 6; i++) blob(Math.floor(rand() * w), Math.floor(rand() * h), 3 + Math.floor(rand() * 5));
    for (const t of [grid.read, grid.write]) { gl.bindTexture(gl.TEXTURE_2D, t.tex); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, w, h, gl.RG, gl.FLOAT, data); }
    seededWord = word;
  }
  function steps(n) {
    const {F, K} = regime(settings.energy ?? .55), texel = grid.read.texel;
    for (let i = 0; i < n; i++) { g.run(P.step, {s: grid.read, texel, F, K, drift: 1}, grid.write); grid.swap(); }
  }
  return {
    renderer: 'webgl2',
    resize(w, h, dpr) { g.resize(w, h, dpr); if (!grid) this.reset(settings.seed, settings); },
    reset(seedValue, s = settings) { settings = s; last = 0; seed(seedValue, s.word); steps(240); },
    render(time, s) {
      settings = s; if (!grid) seed(s.seed, s.word);
      if (s.word !== seededWord) { seed(s.seed, s.word); steps(160); }
      if (time < last) last = time;
      const dt = Math.min(time - last, .1); last = time;
      if (dt > 0) steps(Math.max(1, Math.round(dt * (g.mobile ? 330 : 540))));
      const [i0, i1, i2] = PALETTES[s.tone || 0].inks.map(hex);
      g.run(P.display, {s: grid.read, scale: g.cover(aspect), size: [grid.read.w, grid.read.h], paper: hex(s.dark ? NIGHT : PAPER), ink0: i0, ink1: i1, ink2: s.dark ? i1.map(v => Math.min(1, v * 1.25)) : i2, dark: s.dark ? 1 : 0}, null);
    },
    interact(x, y, dx = 0, dy = 0) {
      if (!grid) return;
      const [sx, sy] = g.toSim(x, y, aspect), r = (g.mobile ? 7 : 6) / grid.read.h;
      // Fill the gap between pointer samples so a fast stroke stays continuous.
      const from = (dx || dy) && lastPaint ? lastPaint : [sx, sy], n = Math.max(1, Math.ceil(Math.hypot((sx - from[0]) * aspect, sy - from[1]) / (r * .5)));
      for (let i = 1; i <= n; i++) { const t = i / n; g.run(P.paint, {s: grid.read, point: [from[0] + (sx - from[0]) * t, from[1] + (sy - from[1]) * t], radius: r, aspect}, grid.write); grid.swap(); }
      lastPaint = [sx, sy];
    },
    describe: () => regime(settings.energy ?? .55).name,
    dispose() { g.dispose(); },
  };
}
