// A small 3D view of a kept model, inside its card. Loaded only when a model is drawn, never with the page.
//   IFC: read by web-ifc 0.0.79 (architecture/vendor/web-ifc/), in this browser. GLB: read here (glTF 2.0 binary, plain,
//   quantized or meshopt-compressed; the meshopt decoder is the one with the lab's three.js).
//   Drawn with the lab's own copy of three.js r170 (/assets/vendor/three/), WebGL.
//
//   webglOk()                         false when this browser cannot draw 3D (the card then shows its numbers only)
//   meshesOf(kind, bytes, opts)       -> { parts: [{ positions, indices, color: [r,g,b,a] }], triangles, cut }
//   mountView(host, { meshes, spin }) -> { stop(), still(width, height) }   a live view; stop() releases it entirely
//   thumbnail(kind, bytes)            -> a small still (a data: URL), or null when it cannot be drawn here
//
// Nothing is sent anywhere. The web-ifc reader is kept for the next model once loaded; each model is closed after reading.

const THREE_URL = new URL('../../assets/vendor/three/three.module.min.js', import.meta.url).href;
const IFC_URL = new URL('../vendor/web-ifc/web-ifc-api.mjs', import.meta.url).href;
const WASM_URL = new URL('../vendor/web-ifc/web-ifc.wasm', import.meta.url).href;
/** past this many triangles the rest of a model is left out of the preview (the 3D page shows all of it) */
export const MAX_TRIANGLES = 2_500_000;

export function webglOk() {
  try {
    const c = globalThis.document?.createElement('canvas');
    const gl = c?.getContext('webgl2') ?? c?.getContext('webgl');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch { return false; }
}

let three = null, ifcApi = null;
const loadThree = async () => (three ??= await import(THREE_URL));
async function loadIfc() {
  if (ifcApi) return ifcApi;
  const { IfcAPI } = await import(IFC_URL);
  const api = new IfcAPI();
  await api.Init(() => WASM_URL, true); // one thread: no worker pool, no shared memory needed
  ifcApi = api;
  return api;
}

// ---- triangles ---------------------------------------------------------------------------------------------------------
/** collect triangles by colour, so a whole model draws in a handful of calls */
function collector(max) {
  const groups = new Map();
  let triangles = 0, cut = false;
  return {
    add(positions, indices, color) {
      if (cut) return;
      if (triangles + indices.length / 3 > max) { cut = true; return; }
      triangles += indices.length / 3;
      const key = color.map((v) => Math.round(v * 255)).join(',');
      const g = groups.get(key) ?? { color, pos: [], idx: [], verts: 0 };
      g.pos.push(positions);
      g.idx.push(g.verts ? indices.map((i) => i + g.verts) : indices);
      g.verts += positions.length / 3;
      groups.set(key, g);
    },
    done() {
      const join = (list, T) => { const out = new T(list.reduce((n, a) => n + a.length, 0)); let at = 0; for (const a of list) { out.set(a, at); at += a.length; } return out; };
      return { parts: [...groups.values()].map((g) => ({ positions: join(g.pos, Float32Array), indices: join(g.idx, Uint32Array), color: g.color })), triangles, cut };
    },
  };
}

async function ifcMeshes(bytes, max) {
  const api = await loadIfc();
  const model = api.OpenModel(bytes, { COORDINATE_TO_ORIGIN: true });
  const c = collector(max);
  try {
    if (model < 0) throw new Error('web-ifc could not open that file.');
    api.StreamAllMeshes(model, (mesh) => {
      const geoms = mesh.geometries;
      for (let i = 0; i < geoms.size(); i++) {
        const pg = geoms.get(i), geo = api.GetGeometry(model, pg.geometryExpressID);
        try {
          const v = api.GetVertexArray(geo.GetVertexData(), geo.GetVertexDataSize());
          const idx = api.GetIndexArray(geo.GetIndexData(), geo.GetIndexDataSize());
          const m = pg.flatTransformation, pos = new Float32Array(v.length / 2);
          for (let k = 0, j = 0; k < v.length; k += 6, j += 3) { // x y z nx ny nz, placed by the element's matrix
            const x = v[k], y = v[k + 1], z = v[k + 2];
            pos[j] = m[0] * x + m[4] * y + m[8] * z + m[12];
            pos[j + 1] = m[1] * x + m[5] * y + m[9] * z + m[13];
            pos[j + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];
          }
          c.add(pos, new Uint32Array(idx), [pg.color.x, pg.color.y, pg.color.z, pg.color.w]);
        } finally { geo.delete(); }
      }
    });
  } finally { if (model >= 0) api.CloseModel(model); }
  return c.done();
}

/** a glTF 2.0 binary: its meshes, placed by the node tree. Quantized (KHR_mesh_quantization) and meshopt-compressed
 * (EXT_meshopt_compression, as a browser copy is: docs/architecture/browser-copy.md) meshes are read when `decoder` (the
 * meshopt decoder, loaded by meshesOf) is given; Draco is not read. */
export function glbMeshes(bytes, max = MAX_TRIANGLES, decoder = null) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error('That is not a GLB file.');
  let at = 12, json = null, bin = null;
  while (at + 8 <= b.length) {
    const len = dv.getUint32(at, true), type = dv.getUint32(at + 4, true), body = b.subarray(at + 8, at + 8 + len);
    if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(body)); else if (type === 0x004e4942) bin = body;
    at += 8 + len;
  }
  if (!json) throw new Error('That GLB has no description inside it.');
  const used = json.extensionsUsed ?? [];
  if (used.some((e) => /draco/i.test(e))) throw new Error('That GLB is compressed, so it is not drawn here. The 3D page opens it.');
  if (used.includes('EXT_meshopt_compression') && !decoder) throw Object.assign(new Error('That GLB is compressed, so it is not drawn here. The 3D page opens it.'), { code: 'meshopt' });
  const c = collector(max);
  const decoded = new Map(); // bufferView index -> its bytes, decompressed
  const viewBytes = (i) => {
    const bv = json.bufferViews[i], mo = bv.extensions?.EXT_meshopt_compression;
    if (!mo) return { data: bin, at: bv.byteOffset ?? 0, stride: bv.byteStride };
    if (!decoded.has(i)) {
      if (mo.buffer !== 0) throw new Error('That GLB keeps its compressed data outside the file, so it is not drawn here.');
      const out = new Uint8Array(mo.count * mo.byteStride);
      decoder.decodeGltfBuffer(out, mo.count, mo.byteStride, bin.subarray(mo.byteOffset ?? 0, (mo.byteOffset ?? 0) + mo.byteLength), mo.mode, mo.filter ?? 'NONE');
      decoded.set(i, out);
    }
    return { data: decoded.get(i), at: 0, stride: mo.byteStride };
  };
  const NORM = { 5120: 127, 5121: 255, 5122: 32767, 5123: 65535 };
  const view = (accIndex, asFloat = false) => {
    const acc = json.accessors[accIndex], comps = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[acc.type], ct = acc.componentType;
    const size = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }[ct], src = viewBytes(acc.bufferView), stride = src.stride || comps * size;
    const base = src.at + (acc.byteOffset ?? 0), out = new (asFloat || ct === 5126 ? Float32Array : Uint32Array)(acc.count * comps);
    const d = new DataView(src.data.buffer, src.data.byteOffset, src.data.byteLength), norm = acc.normalized ? NORM[ct] : 0;
    for (let i = 0; i < acc.count; i++) for (let k = 0; k < comps; k++) {
      const o = base + i * stride + k * size;
      const v = ct === 5126 ? d.getFloat32(o, true) : ct === 5120 ? d.getInt8(o) : ct === 5121 ? d.getUint8(o) : ct === 5122 ? d.getInt16(o, true) : ct === 5123 ? d.getUint16(o, true) : d.getUint32(o, true);
      out[i * comps + k] = norm ? Math.max(v / norm, -1) : v;
    }
    return out;
  };
  const mul = (a, m) => { const o = new Array(16); for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[k * 4 + r] = a[r] * m[k * 4] + a[4 + r] * m[k * 4 + 1] + a[8 + r] * m[k * 4 + 2] + a[12 + r] * m[k * 4 + 3]; return o; };
  const trs = (n) => {
    if (n.matrix) return n.matrix;
    const [x, y, z, w] = n.rotation ?? [0, 0, 0, 1], [sx, sy, sz] = n.scale ?? [1, 1, 1], [tx, ty, tz] = n.translation ?? [0, 0, 0];
    return [(1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0, 2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0, 2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0, tx, ty, tz, 1];
  };
  const walk = (i, parent) => {
    const n = json.nodes[i], m = mul(parent, trs(n));
    if (n.mesh != null) for (const p of json.meshes[n.mesh].primitives) {
      if ((p.mode ?? 4) !== 4 || p.attributes?.POSITION == null) continue;
      const raw = view(p.attributes.POSITION, true), pos = new Float32Array(raw.length);
      for (let k = 0; k < raw.length; k += 3) { const x = raw[k], y = raw[k + 1], z = raw[k + 2]; pos[k] = m[0] * x + m[4] * y + m[8] * z + m[12]; pos[k + 1] = m[1] * x + m[5] * y + m[9] * z + m[13]; pos[k + 2] = m[2] * x + m[6] * y + m[10] * z + m[14]; }
      const idx = p.indices != null ? Uint32Array.from(view(p.indices)) : Uint32Array.from({ length: pos.length / 3 }, (_, k) => k);
      const f = json.materials?.[p.material]?.pbrMetallicRoughness?.baseColorFactor ?? [0.8, 0.8, 0.8, 1];
      c.add(pos, idx, f);
    }
    for (const k of n.children ?? []) walk(k, m);
  };
  const scene = json.scenes?.[json.scene ?? 0];
  for (const i of scene?.nodes ?? json.nodes?.map((_, k) => k) ?? []) walk(i, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  return c.done();
}

const MESHOPT_URL = new URL('../../assets/vendor/three/addons/libs/meshopt_decoder.module.js', import.meta.url).href;
let meshopt = null;
/** the meshopt decoder that ships with the lab's three.js, loaded the first time a compressed GLB is drawn */
export async function meshoptDecoder() {
  if (!meshopt) { const { MeshoptDecoder } = await import(MESHOPT_URL); await MeshoptDecoder.ready; meshopt = MeshoptDecoder; }
  return meshopt;
}
export async function meshesOf(kind, bytes, { max = MAX_TRIANGLES } = {}) {
  if (kind === 'glb') {
    try { return glbMeshes(bytes, max); } catch (e) { if (e?.code !== 'meshopt') throw e; }
    return glbMeshes(bytes, max, await meshoptDecoder());
  }
  return ifcMeshes(bytes, max);
}

// ---- drawing ------------------------------------------------------------------------------------------------------------
const cssColour = (el, name, fallback) => { const v = getComputedStyle(el).getPropertyValue(name).trim(); return v || fallback; };

async function scene(meshes, inkFrom) {
  const T = await loadThree();
  const s = new T.Scene();
  const paper = cssColour(inkFrom, '--paper', '#FFFDFB'), line = cssColour(inkFrom, '--plum', '#654A4E');
  s.background = new T.Color(paper);
  const group = new T.Group(), owned = [];
  for (const p of meshes.parts) {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(p.positions, 3));
    g.setIndex(new T.BufferAttribute(p.indices, 1));
    g.computeVertexNormals();
    const [r, gg, b, a] = p.color;
    const m = new T.MeshLambertMaterial({ color: new T.Color(r, gg, b), transparent: a < 0.99, opacity: Math.max(0.25, a), side: T.DoubleSide, depthWrite: a >= 0.99 });
    owned.push(g, m);
    group.add(new T.Mesh(g, m));
  }
  s.add(group);
  const box = new T.Box3().setFromObject(group), size = box.getSize(new T.Vector3()), centre = box.getCenter(new T.Vector3());
  const radius = Math.max(size.length() / 2, 0.5);
  // a faint grid under the model, in the page's own line colour
  const grid = new T.GridHelper(Math.ceil(radius * 3), 12, new T.Color(line), new T.Color(line));
  grid.material.transparent = true; grid.material.opacity = 0.16; grid.position.set(centre.x, box.min.y - 0.01, centre.z);
  owned.push(grid.geometry, grid.material);
  s.add(grid);
  s.add(new T.HemisphereLight(0xffffff, 0x9a8f90, 2.2));
  const sun = new T.DirectionalLight(0xffffff, 1.6); sun.position.set(radius * 2, radius * 3, radius * 1.5); s.add(sun);
  return { T, s, centre, radius, owned };
}

/** a live view in host: it turns once, then on drag. stop() releases the 3D context and everything it holds. */
export async function mountView(host, { meshes, spin = true } = {}) {
  const { T, s, centre, radius, owned } = await scene(meshes, host);
  const canvas = document.createElement('canvas');
  canvas.className = 'mv-canvas';
  canvas.setAttribute('aria-label', 'The model in 3D. Drag to turn it.');
  host.append(canvas);
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
  const cam = new T.PerspectiveCamera(32, 1, radius / 100, radius * 40);
  let az = Math.PI * 0.28, el = 0.42, dist = radius / Math.sin((32 * Math.PI) / 360) * 0.96, frame = 0, dragging = null, alive = true;
  const place = () => { cam.position.set(centre.x + dist * Math.cos(el) * Math.sin(az), centre.y + dist * Math.sin(el), centre.z + dist * Math.cos(el) * Math.cos(az)); cam.lookAt(centre); };
  const draw = () => { if (!alive) return; place(); renderer.render(s, cam); };
  const size = () => { const w = host.clientWidth || 320, h = host.clientHeight || 200; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); draw(); };
  const ro = new ResizeObserver(size); ro.observe(host);
  size();
  // one slow turn to show it is 3D, unless the person asks for less motion
  const still = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !spin;
  let turned = 0;
  const tick = () => { if (!alive || dragging) return; az += 0.012; turned += 0.012; draw(); if (turned < Math.PI * 2) frame = requestAnimationFrame(tick); };
  if (!still) frame = requestAnimationFrame(tick);
  const down = (e) => { cancelAnimationFrame(frame); dragging = { x: e.clientX, y: e.clientY, az, el }; canvas.setPointerCapture?.(e.pointerId); };
  const move = (e) => { if (!dragging) return; az = dragging.az - (e.clientX - dragging.x) * 0.01; el = Math.min(1.45, Math.max(-0.2, dragging.el + (e.clientY - dragging.y) * 0.008)); draw(); };
  const up = () => { dragging = null; };
  canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  return {
    still(w = 480, h = 300) { renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); draw(); const url = dataUrl(canvas); size(); return url; },
    stop() {
      if (!alive) return;
      alive = false; cancelAnimationFrame(frame); ro.disconnect();
      for (const o of owned) o.dispose?.();
      renderer.dispose(); renderer.forceContextLoss?.(); canvas.remove();
    },
  };
}
const dataUrl = (canvas) => { const w = canvas.toDataURL('image/webp', 0.8); return w.startsWith('data:image/webp') ? w : canvas.toDataURL('image/jpeg', 0.82); };

/** a still for the card, drawn off-screen and released at once; null when it cannot be drawn here */
export async function thumbnail(kind, bytes, { width = 640, height = 400 } = {}) {
  if (!webglOk()) return null;
  const meshes = await meshesOf(kind, bytes);
  if (!meshes.parts.length) return null;
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${width}px;height:${height}px`;
  document.body.append(host);
  try { const v = await mountView(host, { meshes, spin: false }); const url = v.still(width, height); v.stop(); return url; }
  finally { host.remove(); }
}
