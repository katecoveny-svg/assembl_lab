/* Slime Mould: an agent model inspired by Physarum polycephalum (after Jeff Jones, 2010).
 * Tens of thousands of agents each sense the trail just ahead (left, centre, right), turn towards the strongest,
 * step forward and leave a little more trail. The trail spreads and fades. Your strokes lay food that keeps
 * releasing scent, so the network grows between your marks. A simplified model, not a biology experiment. */
import {createGPU, rng, hex, PALETTES, PAPER, NIGHT} from './gpu.js';

const HEAD = `#version 300 es
precision highp float; in vec2 uv; out vec4 o;`;
const MOVE = `${HEAD} uniform sampler2D agents, trail; uniform vec2 texel; uniform float SA, RA, SO, speed, time;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)) + time * 17.31) * 43758.5453); }
float sense(vec2 p, float a){ return texture(trail, fract(p + vec2(cos(a), sin(a)) * SO * texel)).r; }
void main(){
  vec4 a = texture(agents, uv); float ang = a.z, r = hash(uv * 913.7);
  float F = sense(a.xy, ang), FL = sense(a.xy, ang + SA), FR = sense(a.xy, ang - SA);
  if (F > FL && F > FR) {} else if (F < FL && F < FR) ang += (r - .5) * 2. * RA;
  else if (FL > FR) ang += RA * (.6 + .4 * r); else if (FR > FL) ang -= RA * (.6 + .4 * r);
  vec2 p = fract(a.xy + vec2(cos(ang), sin(ang)) * speed * texel);
  o = vec4(p, ang, 1); }`;
const DEPOSIT_V = `#version 300 es
uniform sampler2D agents; uniform int cols;
void main(){ vec4 a = texelFetch(agents, ivec2(gl_VertexID % cols, gl_VertexID / cols), 0); gl_Position = vec4(a.xy * 2. - 1., 0, 1); gl_PointSize = 1.; }`;
const DEPOSIT_F = `#version 300 es
precision highp float; uniform float amount; out vec4 o; void main(){ o = vec4(amount, 0, 0, 1); }`;
const DIFFUSE = `${HEAD} uniform sampler2D trail, food; uniform vec2 texel; uniform float decay;
void main(){ float s = 0.; for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) s += texture(trail, fract(uv + vec2(x, y) * texel)).r;
  o = vec4(min(s / 9. * decay + texture(food, uv).r * .06, 40.), 0, 0, 1); }`;
const FOOD = `${HEAD} uniform sampler2D src; uniform vec2 point; uniform float radius, aspect;
void main(){ vec2 d = uv - point; d.x *= aspect; o = vec4(min(texture(src, uv).r + exp(-dot(d, d) / radius) * .9, 3.), 0, 0, 1); }`;
const DISPLAY = `${HEAD} uniform sampler2D trail, food; uniform vec2 scale; uniform vec3 paper, ink0, ink1, ink2, ink3; uniform float dark;
void main(){
  vec2 q = .5 + (uv - .5) * scale;
  float t = texture(trail, q).r, v = 1. - exp(-t * .32), f = smoothstep(.15, 1.2, texture(food, q).r);
  vec3 c;
  if (dark > .5) { c = paper + ink1 * v * .9 + ink0 * pow(v, 3.) * .9 + vec3(1) * pow(v, 8.) * .5; }
  else { c = mix(paper, ink1, smoothstep(.02, .35, v)); c = mix(c, ink2, smoothstep(.3, .85, v)); c = mix(c, ink0, smoothstep(.8, 1., v) * .7); }
  c = mix(c, ink3, f * .85);
  o = vec4(c, 1); }`;

export function createSlime(canvas) {
  const g = createGPU(canvas), {gl} = g;
  const P = {move: g.program(MOVE), deposit: g.program(DEPOSIT_F, DEPOSIT_V), diffuse: g.program(DIFFUSE), food: g.program(FOOD), display: g.program(DISPLAY)};
  const cols = g.mobile ? 256 : 384, rows = g.mobile ? 160 : 256, count = cols * rows;
  let world = null, aspect = 1, last = 0, clock = 0, settings = {}, lastFood = null;
  function food(x, y, radius) { g.run(P.food, {src: world.food.read, point: [x, y], radius, aspect}, world.food.write); world.food.swap(); }
  function seed(seedValue) {
    aspect = canvas.width / canvas.height || 1;
    const base = g.mobile ? 300 : 420, w = aspect >= 1 ? Math.round(base * aspect) : base, h = aspect >= 1 ? base : Math.round(base / aspect);
    if (world) g.free(Object.values(world));
    world = {agents: g.double(cols, rows, 'rgba32', false), trail: g.double(w, h, 'r'), food: g.double(w, h, 'r')};
    const rand = rng(seedValue), data = new Float32Array(count * 4);
    // Scattered at random, facing every way: the network has to organise itself from nothing.
    for (let i = 0; i < count; i++) { data[i * 4] = rand(); data[i * 4 + 1] = rand(); data[i * 4 + 2] = rand() * Math.PI * 2; data[i * 4 + 3] = 1; }
    for (const t of [world.agents.read, world.agents.write]) { gl.bindTexture(gl.TEXTURE_2D, t.tex); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, cols, rows, gl.RGBA, gl.FLOAT, data); }
    // A few seeded food sources: watch the network find the shortest connections between them.
    for (let i = 0, n = 5 + Math.floor(rand() * 3); i < n; i++) { const a = i / n * Math.PI * 2 + rand(), r = .15 + rand() * .25; food(.5 + Math.cos(a) * r / aspect, .5 + Math.sin(a) * r, .00012); }
  }
  function params() {
    const e = settings.energy ?? .55;
    return {SA: .32 + e * .7, RA: .25 + e * .55, SO: 18 - e * 9, speed: 1.2 + e * .5, decay: .9 - e * .06};
  }
  function step() {
    const p = params(); clock += .016;
    g.run(P.move, {agents: world.agents.read, trail: world.trail.read, texel: world.trail.read.texel, SA: p.SA, RA: p.RA, SO: p.SO, speed: p.speed, time: clock % 100}, world.agents.write); world.agents.swap();
    // Deposit: one point per agent, added into the trail.
    gl.useProgram(P.deposit.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, world.agents.read.tex);
    gl.uniform1i(P.deposit.loc('agents'), 0); gl.uniform1i(P.deposit.loc('cols'), cols); gl.uniform1f(P.deposit.loc('amount'), g.mobile ? .45 : .3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, world.trail.read.fb); gl.viewport(0, 0, world.trail.read.w, world.trail.read.h);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.drawArrays(gl.POINTS, 0, count); gl.disable(gl.BLEND);
    g.run(P.diffuse, {trail: world.trail.read, food: world.food.read, texel: world.trail.read.texel, decay: p.decay}, world.trail.write); world.trail.swap();
  }
  return {
    renderer: 'webgl2',
    resize(w, h, dpr) { g.resize(w, h, dpr); if (!world) this.reset(settings.seed, settings); },
    reset(seedValue, s = settings) { settings = s; last = 0; clock = 0; lastFood = null; seed(seedValue); for (let i = 0; i < 90; i++) step(); },
    render(time, s) {
      settings = s; if (!world) seed(s.seed);
      if (time < last) last = time;
      const dt = Math.min(time - last, .1); last = time;
      if (dt > 0) for (let i = 0, n = Math.max(1, Math.round(dt * 60)); i < n; i++) step();
      const [i0, i1, i2, i3] = PALETTES[s.tone || 0].inks.map(hex);
      g.run(P.display, {trail: world.trail.read, food: world.food.read, scale: g.cover(aspect), paper: hex(s.dark ? NIGHT : PAPER), ink0: s.dark ? [1, .93, .86] : i2, ink1: i1, ink2: i0, ink3: i3, dark: s.dark ? 1 : 0}, null);
    },
    interact(x, y, dx = 0, dy = 0) {
      if (!world) return;
      const [sx, sy] = g.toSim(x, y, aspect), from = (dx || dy) && lastFood ? lastFood : [sx, sy];
      const n = Math.max(1, Math.ceil(Math.hypot((sx - from[0]) * aspect, sy - from[1]) / .012));
      for (let i = 1; i <= n; i++) { const t = i / n; food(from[0] + (sx - from[0]) * t, from[1] + (sy - from[1]) * t, .00005); }
      lastFood = [sx, sy];
    },
    dispose() { g.dispose(); },
  };
}
