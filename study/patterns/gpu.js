/* Small WebGL2 toolkit shared by the living-systems worlds (fluid, turing, slime).
 * Full-screen passes over float textures, ping-pong buffers and a cover mapping that
 * keeps the simulation grid fixed when the canvas changes size (on export, for example). */
export const rng = seed => { let a = (Number(seed) || 42) >>> 0; return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
export const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);

const VERT = `#version 300 es
in vec2 p; out vec2 uv; void main(){ uv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;

export function createGPU(canvas) {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, preserveDrawingBuffer: true });
  if (!gl) throw Error('This world needs WebGL2, which this browser has turned off.');
  if (!gl.getExtension('EXT_color_buffer_float')) throw Error('This world needs floating-point rendering, which this device does not offer.');
  const linearFloat = Boolean(gl.getExtension('OES_texture_float_linear'));
  const quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const owned = { programs: [], textures: [], framebuffers: [], shaders: [] };

  function compile(type, source) { const s = gl.createShader(type); gl.shaderSource(s, source); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s)); owned.shaders.push(s); return s; }
  function program(fragment, vertex = VERT) {
    const p = gl.createProgram(); gl.attachShader(p, compile(gl.VERTEX_SHADER, vertex)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fragment));
    gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(p));
    owned.programs.push(p); const locations = new Map();
    return { p, loc: name => { if (!locations.has(name)) locations.set(name, gl.getUniformLocation(p, name)); return locations.get(name); } };
  }
  const FORMATS = { r: [gl.R16F, gl.RED], rg: [gl.RG16F, gl.RG], rgba: [gl.RGBA16F, gl.RGBA], rg32: [gl.RG32F, gl.RG], rgba32: [gl.RGBA32F, gl.RGBA] };
  function target(w, h, format = 'rgba', linear = true) {
    const [internal, layout] = FORMATS[format], filter = linear && (!format.endsWith('32') || linearFloat) ? gl.LINEAR : gl.NEAREST;
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, layout, gl.FLOAT, null);
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    owned.textures.push(tex); owned.framebuffers.push(fb);
    return { tex, fb, w, h, texel: [1 / w, 1 / h] };
  }
  function double(w, h, format, linear) { const a = target(w, h, format, linear), b = target(w, h, format, linear); return { get read() { return this._r; }, get write() { return this._w; }, _r: a, _w: b, swap() { [this._r, this._w] = [this._w, this._r]; } }; }
  function free(...targets) { for (const t of targets.flat()) { if (!t) continue; for (const x of t._r ? [t._r, t._w] : [t]) { gl.deleteTexture(x.tex); gl.deleteFramebuffer(x.fb); } } }
  // Run a full-screen pass. Uniform values: number, [n,n], [n,n,n], [n,n,n,n], or a target (bound as a sampler).
  function run(prog, uniforms, out, blend = false) {
    gl.useProgram(prog.p); gl.bindVertexArray(vao); let unit = 0;
    for (const [name, v] of Object.entries(uniforms)) {
      const l = prog.loc(name); if (l === null) continue;
      if (v && v.tex) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, v.tex); gl.uniform1i(l, unit++); }
      else if (typeof v === 'number') gl.uniform1f(l, v);
      else if (v.length === 2) gl.uniform2fv(l, v); else if (v.length === 3) gl.uniform3fv(l, v); else if (v.length === 4) gl.uniform4fv(l, v);
    }
    if (out) { gl.bindFramebuffer(gl.FRAMEBUFFER, out.fb); gl.viewport(0, 0, out.w, out.h); } else { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height); }
    if (blend) { gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); } else gl.disable(gl.BLEND);
    gl.drawArrays(gl.TRIANGLES, 0, 3); gl.disable(gl.BLEND);
  }
  // The simulation grid fills the canvas like CSS object-fit: cover, whatever the canvas shape.
  function cover(simAspect) { const a = canvas.width / canvas.height; return a > simAspect ? [1, simAspect / a] : [a / simAspect, 1]; }
  function toSim(x, y, simAspect) { const [sx, sy] = cover(simAspect); return [.5 + (x - .5) * sx, .5 + (.5 - y) * sy]; }
  function resize(w, h, dpr = 1, cap = 1.5) { canvas.width = Math.max(1, Math.round(w * Math.min(dpr, cap))); canvas.height = Math.max(1, Math.round(h * Math.min(dpr, cap))); }
  function dispose() {
    owned.programs.forEach(p => gl.deleteProgram(p)); owned.shaders.forEach(s => gl.deleteShader(s));
    owned.textures.forEach(t => gl.deleteTexture(t)); owned.framebuffers.forEach(f => gl.deleteFramebuffer(f));
    gl.deleteBuffer(quad); gl.deleteVertexArray(vao); gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
  return { gl, program, target, double, free, run, cover, toSim, resize, dispose, mobile: matchMedia('(pointer: coarse)').matches };
}

// Shared display helpers: the paper ground, the four pigment sets the dock swatches choose between.
export const PALETTES = [
  { name: 'coral', inks: ['#E8606A', '#F2A07B', '#3B3F7A', '#9C8BD6'] },
  { name: 'lilac', inks: ['#8E6FD1', '#C7A4F0', '#2E2A63', '#E98FB4'] },
  { name: 'mint', inks: ['#3F9C86', '#9FD8C2', '#24425A', '#F0B38A'] },
  { name: 'navy', inks: ['#232A63', '#4B6CC8', '#9DB7F0', '#E8606A'] },
];
export const PAPER = '#FBF7F1', NIGHT = '#17112A';
