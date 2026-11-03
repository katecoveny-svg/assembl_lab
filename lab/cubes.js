// The Lab hero's cube field: scattered parts assemble into one small world, once, as the page opens.
// After that the block only moves when you do: scrolling turns it, the pointer leans it. Raw WebGL2, no
// dependencies, about 5 KB. story.js loads it after first paint and never for reduced motion; the static
// SVG still in the page is the same block, so failing here changes nothing a visitor needs.
const TONES = ['#F3A5BE', '#C7B4F0', '#A7DEC7', '#F6B48E', '#A9C9F2', '#F2DC7C'];

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = t => t * t * t * (t * (t * 6 - 15) + 10);
const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
function qAxis(ax, ang) { const l = Math.hypot(...ax) || 1, s = Math.sin(ang / 2); return [ax[0] / l * s, ax[1] / l * s, ax[2] / l * s, Math.cos(ang / 2)]; }
function nlerp(a, b, t) { const d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3], s = d < 0 ? -1 : 1; const r = a.map((v, i) => v + (b[i] * s - v) * t); const l = Math.hypot(...r) || 1; return r.map(v => v / l); }
function persp(fovy, asp, n, f) { const k = 1 / Math.tan(fovy / 2), nf = 1 / (n - f); return new Float32Array([k / asp, 0, 0, 0, 0, k, 0, 0, 0, 0, (f + n) * nf, -1, 0, 0, 2 * f * n * nf, 0]); }
function lookAt(e, c) {
  let z = [e[0] - c[0], e[1] - c[1], e[2] - c[2]]; let l = Math.hypot(...z); z = z.map(v => v / l);
  let x = [z[2], 0, -z[0]]; l = Math.hypot(...x) || 1; x = x.map(v => v / l);
  const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
  return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -(x[0] * e[0] + x[1] * e[1] + x[2] * e[2]), -(y[0] * e[0] + y[1] * e[1] + y[2] * e[2]), -(z[0] * e[0] + z[1] * e[1] + z[2] * e[2]), 1]);
}
function rotYX(yaw, pitch) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  // R = Rx(pitch) * Ry(yaw), column-major
  return new Float32Array([cy, sp * sy, -cp * sy, 0, 0, cp, sp, 0, sy, -sp * cy, cp * cy, 0, 0, 0, 0, 1]);
}

/** A rounded cube: a subdivided box pushed onto a rounded shell, so the edges catch light. */
function roundedBox(r, m) {
  const co = [];
  for (let k = 0; k <= m; k++) co.push(-(1 - r) - r * Math.cos(k / m * Math.PI / 2));
  for (let k = m; k >= 0; k--) co.push((1 - r) + r * Math.cos(k / m * Math.PI / 2));
  const n = co.length, pos = [], nor = [], idx = [];
  for (const [ax, sg] of [[0, 1], [0, -1], [1, 1], [1, -1], [2, 1], [2, -1]]) {
    const u = (ax + 1) % 3, v = (ax + 2) % 3, base = pos.length / 3;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const p = [0, 0, 0]; p[ax] = sg; p[u] = co[i] * sg; p[v] = co[j];
      const inner = p.map(c => clamp(c, -(1 - r), 1 - r));
      const d = p.map((c, k) => c - inner[k]); const l = Math.hypot(...d) || 1;
      pos.push(...inner.map((c, k) => c + d[k] / l * r)); nor.push(...d.map(c => c / l));
    }
    for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) { const a = base + j * n + i, b = a + 1, c = a + n, e = c + 1; idx.push(a, b, e, a, e, c); }
  }
  return { pos: new Float32Array(pos), nor: new Float32Array(nor), idx: new Uint16Array(idx) };
}

const VS = `#version 300 es
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNor;
layout(location=2) in vec3 iOff; layout(location=3) in float iScale; layout(location=4) in vec4 iQ; layout(location=5) in vec3 iCol;
uniform mat4 uP, uV, uW; out vec3 vN; out vec3 vCol; out vec3 vW;
vec3 qrot(vec4 q, vec3 v){ return v + 2.0*cross(q.xyz, cross(q.xyz, v) + q.w*v); }
void main(){ vec3 p = qrot(iQ, aPos*iScale) + iOff; vec4 w = uW*vec4(p,1.0); vW = w.xyz; vN = mat3(uW)*qrot(iQ, aNor); vCol = iCol; gl_Position = uP*uV*w; }`;
const FS = `#version 300 es
precision mediump float; in vec3 vN; in vec3 vCol; in vec3 vW; uniform vec3 uEye; out vec4 o;
void main(){ vec3 n = normalize(vN); vec3 L = normalize(vec3(-.5,.9,.6)); float d = max(dot(n,L),0.0);
  float fill = max(dot(n, normalize(vec3(.7,-.2,.5))),0.0);
  vec3 V = normalize(uEye - vW); float rim = pow(1.0 - max(dot(n,V),0.0), 3.0);
  vec3 c = vCol*(.42 + .62*d) + vec3(.95,.62,.74)*fill*.10 + vec3(1.0,.85,.92)*rim*.28;
  float h = pow(max(dot(reflect(-L,n),V),0.0), 28.0)*.22; o = vec4(c + h, 1.0); }`;

export function mount(host) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  host.append(canvas);
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: true, premultipliedAlpha: true });
  if (!gl) { canvas.remove(); return; }
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
  const prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.remove(); return; }
  gl.useProgram(prog);

  // the block: a 3×3 ground floor, four on the first floor, one on top (the same block as the still SVG)
  const target = [];
  for (let z = 0; z < 3; z++) for (let x = 0; x < 3; x++) target.push([x - 1, -.9, z - 1]);
  [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([x, z]) => target.push([x - 1, .1, z - 1]));
  target.push([-1, 1.1, -1]);
  const N = target.length, rand = rng(1903);
  const cubes = target.map((t, i) => {
    const a = rand() * Math.PI * 2, rad = 2.6 + rand() * 1.6;
    return {
      t, from: [Math.cos(a) * rad, (rand() - .5) * 3.4, Math.sin(a) * rad * .8],
      q0: qAxis([rand() - .5, rand() - .5, rand() - .5], rand() * 3), q1: [0, 0, 0, 1],
      col: hex(TONES[(Math.round(t[0] + 1) * 2 + Math.round(t[2] + 1) * 3 + Math.round(t[1] + .9) * 5) % 6]),
      delay: i * 70 + rand() * 120,
    };
  });

  const geo = roundedBox(.2, 4);
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  const buf = (data, loc, size, target = gl.ARRAY_BUFFER) => { const b = gl.createBuffer(); gl.bindBuffer(target, b); gl.bufferData(target, data, gl.STATIC_DRAW); if (loc != null) { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0); } return b; };
  buf(geo.pos, 0, 3); buf(geo.nor, 1, 3); buf(geo.idx, null, 0, gl.ELEMENT_ARRAY_BUFFER);
  const inst = new Float32Array(N * 11);
  const ib = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, ib); gl.bufferData(gl.ARRAY_BUFFER, inst.byteLength, gl.DYNAMIC_DRAW);
  [[2, 3, 0], [3, 1, 3], [4, 4, 4], [5, 3, 8]].forEach(([loc, size, off]) => { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 44, off * 4); gl.vertexAttribDivisor(loc, 1); });
  const U = n => gl.getUniformLocation(prog, n);
  const uP = U('uP'), uV = U('uV'), uW = U('uW'), uEye = U('uEye');
  const eye = [5.6, 4.4, 6.4];
  gl.uniformMatrix4fv(uV, false, lookAt(eye, [0, -.15, 0])); gl.uniform3fv(uEye, eye);
  gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.clearColor(0, 0, 0, 0);

  let w = 0, h = 0;
  function size() {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    w = Math.max(1, Math.round(r.width * dpr)); h = Math.max(1, Math.round(r.height * dpr));
    canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h);
    gl.uniformMatrix4fv(uP, false, persp(.62, w / h, .1, 50)); want();
  }

  const t0 = performance.now(), DUR = 1500;
  let yaw = 0, pitch = 0, tyaw = 0, tpitch = 0, raf = 0, visible = true, done = false;
  function frame(now) {
    raf = 0;
    let moving = false;
    for (let i = 0; i < N; i++) {
      const c = cubes[i], k = ease(clamp((now - t0 - c.delay) / DUR));
      if (k < 1) moving = true;
      const lift = Math.sin(k * Math.PI) * .5;
      const p = c.from.map((f, j) => f + (c.t[j] - f) * k + (j === 1 ? lift : 0));
      const q = nlerp(c.q0, c.q1, k);
      inst.set([p[0], p[1], p[2], .47, q[0], q[1], q[2], q[3], c.col[0], c.col[1], c.col[2]], i * 11);
    }
    yaw += (tyaw - yaw) * .12; pitch += (tpitch - pitch) * .12;
    if (Math.abs(tyaw - yaw) > 1e-4 || Math.abs(tpitch - pitch) > 1e-4) moving = true;
    gl.bindBuffer(gl.ARRAY_BUFFER, ib); gl.bufferSubData(gl.ARRAY_BUFFER, 0, inst);
    gl.uniformMatrix4fv(uW, false, rotYX(yaw, pitch));
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawElementsInstanced(gl.TRIANGLES, geo.idx.length, gl.UNSIGNED_SHORT, 0, N);
    if (!done) { done = true; host.dataset.gl = 'on'; }
    if (moving) want();
  }
  function want() { if (!raf && visible) raf = requestAnimationFrame(frame); }

  // scrolling turns the block; the pointer leans it a little (fine pointers only)
  const onScroll = () => { tyaw = Math.min(scrollY, 1600) * .0016; want(); };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    host.closest('.hero')?.addEventListener('pointermove', e => {
      const r = host.getBoundingClientRect();
      tpitch = clamp((e.clientY - (r.top + r.height / 2)) / r.height, -.5, .5) * .18;
      tyaw = Math.min(scrollY, 1600) * .0016 + clamp((e.clientX - (r.left + r.width / 2)) / r.width, -.5, .5) * .35;
      want();
    }, { passive: true });
  }
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) want(); }).observe(host);
  new ResizeObserver(size).observe(canvas);
  canvas.addEventListener('webglcontextlost', () => { canvas.remove(); delete host.dataset.gl; });
  size();
}
