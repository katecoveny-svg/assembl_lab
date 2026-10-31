/* Living Ink: a real incompressible-fluid solver on the GPU.
 * Stable fluids (semi-Lagrangian advection, Jacobi pressure projection) with vorticity confinement,
 * after Jos Stam (1999) and Pavel Dobryakov's WebGL fluid. Dye is stored as light absorbance,
 * so overlapping inks mix the way pigments do (Beer–Lambert), not the way screen colours add.
 * The grid is coarse and the boundaries are simplified: a playful real simulation, not lab-grade CFD. */
import {createGPU, rng, hex, PALETTES, PAPER, NIGHT} from './gpu.js';

const HEAD = `#version 300 es
precision highp float; in vec2 uv; out vec4 o;`;
const ADVECT = `${HEAD} uniform sampler2D vel, src; uniform vec2 texel; uniform float dt, diss;
void main(){ vec2 back = uv - dt * texture(vel, uv).xy * texel; o = texture(src, back) / (1. + diss * dt); }`;
const DIVERGENCE = `${HEAD} uniform sampler2D vel; uniform vec2 texel;
void main(){
  vec2 C = texture(vel, uv).xy;
  float L = texture(vel, uv - vec2(texel.x, 0)).x, R = texture(vel, uv + vec2(texel.x, 0)).x;
  float B = texture(vel, uv - vec2(0, texel.y)).y, T = texture(vel, uv + vec2(0, texel.y)).y;
  if (uv.x - texel.x < 0.) L = -C.x; if (uv.x + texel.x > 1.) R = -C.x;
  if (uv.y - texel.y < 0.) B = -C.y; if (uv.y + texel.y > 1.) T = -C.y;
  o = vec4(.5 * (R - L + T - B), 0, 0, 1); }`;
const CURL = `${HEAD} uniform sampler2D vel; uniform vec2 texel;
void main(){
  float L = texture(vel, uv - vec2(texel.x, 0)).y, R = texture(vel, uv + vec2(texel.x, 0)).y;
  float B = texture(vel, uv - vec2(0, texel.y)).x, T = texture(vel, uv + vec2(0, texel.y)).x;
  o = vec4(.5 * (R - L - T + B), 0, 0, 1); }`;
const VORTICITY = `${HEAD} uniform sampler2D vel, curl; uniform vec2 texel; uniform float strength, dt;
void main(){
  float L = texture(curl, uv - vec2(texel.x, 0)).x, R = texture(curl, uv + vec2(texel.x, 0)).x;
  float B = texture(curl, uv - vec2(0, texel.y)).x, T = texture(curl, uv + vec2(0, texel.y)).x, C = texture(curl, uv).x;
  vec2 f = .5 * vec2(abs(T) - abs(B), abs(R) - abs(L)); f /= length(f) + 1e-4; f *= strength * C; f.y *= -1.;
  vec2 v = texture(vel, uv).xy + f * dt; o = vec4(clamp(v, -1000., 1000.), 0, 1); }`;
const PRESSURE = `${HEAD} uniform sampler2D pressure, divergence; uniform vec2 texel;
void main(){
  float L = texture(pressure, uv - vec2(texel.x, 0)).x, R = texture(pressure, uv + vec2(texel.x, 0)).x;
  float B = texture(pressure, uv - vec2(0, texel.y)).x, T = texture(pressure, uv + vec2(0, texel.y)).x;
  o = vec4((L + R + B + T - texture(divergence, uv).x) * .25, 0, 0, 1); }`;
const GRADIENT = `${HEAD} uniform sampler2D pressure, vel; uniform vec2 texel;
void main(){
  float L = texture(pressure, uv - vec2(texel.x, 0)).x, R = texture(pressure, uv + vec2(texel.x, 0)).x;
  float B = texture(pressure, uv - vec2(0, texel.y)).x, T = texture(pressure, uv + vec2(0, texel.y)).x;
  o = vec4(texture(vel, uv).xy - vec2(R - L, T - B), 0, 1); }`;
const SCALE = `${HEAD} uniform sampler2D src; uniform float k; void main(){ o = texture(src, uv) * k; }`;
const SPLAT = `${HEAD} uniform sampler2D src; uniform vec2 point; uniform vec4 value; uniform float radius, aspect;
void main(){ vec2 d = uv - point; d.x *= aspect; o = texture(src, uv) + value * exp(-dot(d, d) / radius); }`;
// Ink on paper: absorbance in rgb, density in alpha. Light comes from the upper left; dense ink catches a soft sheen.
const DISPLAY = `${HEAD} uniform sampler2D dye; uniform vec2 scale, texel; uniform vec3 paper; uniform float dark;
void main(){
  vec2 q = .5 + (uv - .5) * scale;
  vec4 d = max(texture(dye, q), 0.);
  float dl = dot(texture(dye, q - vec2(texel.x, 0)).rgb, vec3(.33)), dr = dot(texture(dye, q + vec2(texel.x, 0)).rgb, vec3(.33));
  float db = dot(texture(dye, q - vec2(0, texel.y)).rgb, vec3(.33)), dt = dot(texture(dye, q + vec2(0, texel.y)).rgb, vec3(.33));
  vec3 n = normalize(vec3(dl - dr, db - dt, .35));
  float shade = .9 + .1 * dot(n, normalize(vec3(-.5, .6, .7)));
  float sheen = pow(max(dot(reflect(-normalize(vec3(-.5, .6, .9)), n), vec3(0, 0, 1)), 0.), 24.) * smoothstep(.15, 1.2, d.a);
  vec3 ink = exp(-d.rgb / max(d.a, 1e-3));
  vec3 c = dark > .5 ? mix(paper, pow(ink, vec3(.7)) * 1.15 + .04, 1. - exp(-d.a * 3.2)) : paper * exp(-d.rgb * .8);
  c = c * shade + sheen * .22;
  float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - .5;
  o = vec4(c + grain * .018, 1); }`;

export function createFluid(canvas) {
  const g = createGPU(canvas), {gl} = g;
  const P = {advect: g.program(ADVECT), divergence: g.program(DIVERGENCE), curl: g.program(CURL), vorticity: g.program(VORTICITY), pressure: g.program(PRESSURE), gradient: g.program(GRADIENT), scale: g.program(SCALE), splat: g.program(SPLAT), display: g.program(DISPLAY)};
  let sim = null, aspect = 1, last = 0, quiet = 0, inkIndex = 0, settings = {}, rand = rng(42);
  function allocate() {
    if (sim) g.free(Object.values(sim));
    aspect = canvas.width / canvas.height || 1;
    const size = (base, a) => a >= 1 ? [Math.round(base * a), base] : [base, Math.round(base / a)];
    const [sw, sh] = size(g.mobile ? 96 : 144, aspect), [dw, dh] = size(g.mobile ? 360 : 640, aspect);
    sim = {vel: g.double(sw, sh, 'rg'), dye: g.double(dw, dh, 'rgba'), pressure: g.double(sw, sh, 'r'), divergence: g.target(sw, sh, 'r'), curl: g.target(sw, sh, 'r')};
  }
  const inks = () => PALETTES[settings.tone || 0].inks.map(hex);
  function splat(x, y, vx, vy, ink, amount = .9, radius = .0022) {
    const r = radius * Math.max(1, aspect);
    g.run(P.splat, {src: sim.vel.read, point: [x, y], value: [vx, vy, 0, 0], radius: r, aspect}, sim.vel.write); sim.vel.swap();
    if (!ink) return;
    // Balance the inks: each one absorbs the same total light per drop, so dark inks start as tints and deepen as they pool.
    const A = ink.map(c => -Math.log(Math.max(c, .03))), mean = (A[0] + A[1] + A[2]) / 3 || 1, absorb = A.map(a => a / mean * .62 * amount);
    g.run(P.splat, {src: sim.dye.read, point: [x, y], value: [...absorb, amount], radius: r * 1.15, aspect}, sim.dye.write); sim.dye.swap();
  }
  function breath() { // a gentle unprompted pour, so the ink keeps living while you watch
    const k = inks(), a = rand() * Math.PI * 2, x = .2 + rand() * .6, y = .2 + rand() * .6, f = 260 + rand() * 260;
    splat(x, y, Math.cos(a) * f, Math.sin(a) * f, k[Math.floor(rand() * k.length)], .45, .0025);
  }
  function step(dt) {
    const t = sim.vel.read.texel, e = settings.energy ?? .55;
    g.run(P.curl, {vel: sim.vel.read, texel: t}, sim.curl);
    g.run(P.vorticity, {vel: sim.vel.read, curl: sim.curl, texel: t, strength: 8 + e * 42, dt}, sim.vel.write); sim.vel.swap();
    g.run(P.divergence, {vel: sim.vel.read, texel: t}, sim.divergence);
    g.run(P.scale, {src: sim.pressure.read, k: .8}, sim.pressure.write); sim.pressure.swap();
    for (let i = 0; i < 22; i++) { g.run(P.pressure, {pressure: sim.pressure.read, divergence: sim.divergence, texel: t}, sim.pressure.write); sim.pressure.swap(); }
    g.run(P.gradient, {pressure: sim.pressure.read, vel: sim.vel.read, texel: t}, sim.vel.write); sim.vel.swap();
    g.run(P.advect, {vel: sim.vel.read, src: sim.vel.read, texel: t, dt, diss: .22}, sim.vel.write); sim.vel.swap();
    g.run(P.advect, {vel: sim.vel.read, src: sim.dye.read, texel: t, dt, diss: .045}, sim.dye.write); sim.dye.swap();
  }
  return {
    renderer: 'webgl2',
    resize(w, h, dpr) { g.resize(w, h, dpr); if (!sim) { allocate(); this.reset(settings.seed, settings); } },
    reset(seed, s = settings) {
      settings = s; rand = rng(seed); last = 0; quiet = 0; inkIndex = 0; allocate();
      const k = inks();
      for (let i = 0; i < 5; i++) { const a = rand() * Math.PI * 2, f = 380 + rand() * 520; splat(.22 + rand() * .56, .22 + rand() * .56, Math.cos(a) * f, Math.sin(a) * f, k[i % k.length], .6, .0035); }
      for (let i = 0; i < 18; i++) step(1 / 30);
    },
    render(time, s) {
      settings = s; if (!sim) allocate();
      if (time < last) last = time;
      let dt = Math.min(time - last, .1); last = time;
      if (dt > 0) { quiet += dt; if (quiet > 3.5) { breath(); quiet = 0; } while (dt > 1e-4) { const h = Math.min(dt, 1 / 30); step(h); dt -= h; } }
      const paper = hex(s.dark ? NIGHT : PAPER), dye = sim.dye.read;
      g.run(P.display, {dye, scale: g.cover(aspect), texel: dye.texel, paper, dark: s.dark ? 1 : 0}, null);
    },
    interact(x, y, dx = 0, dy = 0) {
      if (!sim) return; quiet = 0;
      const [sx, sy] = g.toSim(x, y, aspect), [cx, cy] = g.cover(aspect), k = inks();
      if (!dx && !dy) { inkIndex = (inkIndex + 1) % k.length; splat(sx, sy, 0, 0, k[inkIndex], .8, .003); return; }
      splat(sx, sy, dx * cx * 5200, -dy * cy * 5200, k[inkIndex], .32);
    },
    // Sound in, ink out: loudness sets how hard a jet pours from the foot of the canvas, pitch picks the ink.
    // The level and pitch are computed in the browser from the microphone; no audio is stored or sent.
    sound(level, pitch) {
      if (!sim || level < .04) return; quiet = 0;
      const k = inks(), sweep = Math.sin(last * .7) * .28, x = .5 + sweep, f = 900 * Math.min(1, level * 2.2);
      splat(x, .04, -sweep * f * .6, f, k[Math.min(k.length - 1, Math.floor(pitch * k.length))], .18 + level * .5, .0016 + level * .0025);
    },
    dispose() { g.dispose(); },
  };
}
