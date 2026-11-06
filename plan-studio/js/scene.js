// assembl Plan Studio · the 3D model, built deterministically from the project model (no AI in the geometry).
// three.js r170 from /assets/vendor. Model mm → metres; model +x east → three +x, model +y north → three −z, model z → three +y.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { MATERIALS, textureCanvas } from "./materials.js";
import { openingSpan, polyBox, isDoor, wallFacing, roofZ } from "./model.js";

const M = (v) => v / 1000;
const V3 = (x, y, z = 0) => new THREE.Vector3(M(x), M(z), -M(y));     // plan (x, y) at height z
const plan = (v) => [v.x * 1000, -v.z * 1000];                          // back from three.js to plan mm

const matCache = new Map();
export function material(id, opts = {}) {
  const key = id + JSON.stringify(opts); if (matCache.has(key)) return matCache.get(key);
  const m = MATERIALS[id] || { hex: "#cccccc", rough: 0.7 };
  let mat;
  if (m.glass) mat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(opts.frame ? m.hex : "#8aa0a8"), metalness: 0, roughness: 0.04, transparent: true, opacity: opts.frame ? 1 : 0.32, envMapIntensity: 1.4, clearcoat: 1, clearcoatRoughness: 0.02, depthWrite: !!opts.frame });
  else {
    mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(m.hex), roughness: m.rough ?? 0.7, metalness: m.metal ?? 0 });
    const c = textureCanvas(id, 256);
    if (c) { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; mat.map = t; mat.color.set("#ffffff"); }
  }
  mat.name = id; matCache.set(key, mat); return mat;
}

// a box between two plan points, with world-scale UVs so board and seam textures read at their true size (1 texture = 1.12 m)
function wallBox(a, d, s0, s1, t, z0, z1, mat, off = 0) {
  const L = M(s1 - s0), H = M(z1 - z0), T = M(t), g = new THREE.BoxGeometry(L, H, T);
  const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv, uStart = M(s0), vStart = M(z0);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i));
    const u = nx > 0.5 ? z : x, v = ny > 0.5 ? z : y;
    uv.setXY(i, (u + L / 2 + uStart) / 1.12, (v + H / 2 + vStart) / 1.12);
  }
  const mesh = new THREE.Mesh(g, mat);
  const mid = (s0 + s1) / 2, n = [-d[1], d[0]];
  mesh.position.copy(V3(a[0] + d[0] * mid + n[0] * off, a[1] + d[1] * mid + n[1] * off, (z0 + z1) / 2));
  mesh.rotation.y = Math.atan2(d[1], d[0]);
  mesh.castShadow = mesh.receiveShadow = true; return mesh;
}

export function buildModel(P, opts = {}) {
  const root = new THREE.Group(); root.name = "PLAN_STUDIO_MODEL";
  const R = P.roof || {}, bx = polyBox(P.rooms.flatMap((r) => r.poly)), eaves = R.eaves || 3000, ridge = R.ridgeH || eaves, oh = R.overhang || 0;
  // slab
  const st = P.slab?.t || 150, slabG = new THREE.BoxGeometry(M(bx.x1 - bx.x0 + 400), M(st), M(bx.y1 - bx.y0 + 400));
  const slab = new THREE.Mesh(slabG, material(P.slab?.mat || "slab-concrete")); slab.position.copy(V3((bx.x0 + bx.x1) / 2, (bx.y0 + bx.y1) / 2, -st / 2 + 2)); slab.receiveShadow = true; slab.name = "SLAB"; root.add(slab);
  // walls, cut around their openings
  const walls = new THREE.Group(); walls.name = "WALLS"; root.add(walls);
  const fills = new THREE.Group(); fills.name = "OPENINGS"; root.add(fills);
  const frame = material("window-thermal", { frame: true }), glass = material("glass-curtain"), door = material("door-timber");
  for (const w of P.walls) {
    const L = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]), d = [(w.b[0] - w.a[0]) / L, (w.b[1] - w.a[1]) / L];
    const ext = w.kind === "ext", e = ext ? w.t / 2 : 0, curtain = w.mat === "glass-curtain";
    const h = ext ? Math.min(roofZ(P, ...w.a), roofZ(P, ...w.b)) : w.h;          // external walls run up to the roof; above that, an infill
    const wm = material(curtain ? "window-thermal" : (ext ? w.mat : "lining-plasterboard"), curtain ? { frame: true } : {});
    const ops = P.openings.filter((o) => o.wall === w.id).sort((a, b) => a.at - b.at);
    let s = -e;
    const g = new THREE.Group(); g.name = "WALL_" + w.id; g.userData = { kind: "wall", id: w.id }; walls.add(g);
    for (const o of ops) {
      const o0 = o.at - o.w / 2, o1 = o.at + o.w / 2;
      if (o0 > s) g.add(wallBox(w.a, d, s, o0, w.t, 0, h, wm));
      if (o.sill > 0) g.add(wallBox(w.a, d, o0, o1, w.t, 0, o.sill, wm));
      if (o.sill + o.h < h) g.add(wallBox(w.a, d, o0, o1, w.t, o.sill + o.h, h, wm));
      s = Math.max(s, o1);
      // what fills the opening
      const fg = new THREE.Group(); fg.name = "OPENING_" + o.id; fg.userData = { kind: "opening", id: o.id }; fills.add(fg);
      if (o.kind === "window" || o.kind === "glazing" || o.mat === "door-glazed") {
        fg.add(wallBox(w.a, d, o0, o1, 24, o.sill, o.sill + o.h, glass));
        const mull = o.kind === "glazing" ? 1200 : o.w > 1600 ? o.w / 2 : o.w;
        for (let m = o0; m <= o1 + 1; m += mull) fg.add(wallBox(w.a, d, Math.min(m, o1) - 25, Math.min(m, o1) + 25, 70, o.sill, o.sill + o.h, frame));
        for (const z of [o.sill, o.sill + o.h, ...(o.kind === "glazing" ? [o.sill + 2100] : [])]) fg.add(wallBox(w.a, d, o0, o1, 70, z - 25, z + 25, frame));
      } else if (isDoor(o) && o.kind !== "opening") fg.add(wallBox(w.a, d, o0 + 10, o1 - 10, 45, 0, o.h, door, -w.t / 2 + 30));
    }
    if (L + e > s) g.add(wallBox(w.a, d, s, L + e, w.t, 0, h, wm));
    // infill between the wall top and the roof line (gable ends, the high side of a monopitch, its raking side walls)
    if (ext) {
      const prof = [];
      for (let k = 0; k <= 48; k++) { const sAt = -e + ((L + 2 * e) * k) / 48, p = [w.a[0] + d[0] * sAt, w.a[1] + d[1] * sAt]; prof.push([sAt, roofZ(P, p[0], p[1]) - 60]); }
      if (prof.some(([, z]) => z > h + 30)) {
        const shape = new THREE.Shape(); shape.moveTo(M(prof[0][0]), M(h));
        for (const [sAt, z] of prof) shape.lineTo(M(sAt), M(Math.max(h, z)));
        shape.lineTo(M(prof[prof.length - 1][0]), M(h)); shape.lineTo(M(prof[0][0]), M(h));
        const geo = new THREE.ExtrudeGeometry(shape, { depth: M(w.t), bevelEnabled: false });
        const pos = geo.attributes.position, uv = geo.attributes.uv; for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / 1.12, pos.getY(i) / 1.12);
        const inf = new THREE.Mesh(geo, curtain ? glass : wm); inf.castShadow = true;
        // local x along the wall, local z across it; place at the wall start, turned to the wall direction
        const holder = new THREE.Group(); holder.position.copy(V3(w.a[0], w.a[1], 0)); holder.rotation.y = Math.atan2(d[1], d[0]);
        inf.position.set(0, 0, -M(w.t) / 2); holder.add(inf); g.add(holder);
        if (curtain) for (let m = 1200; m < L; m += 1200) {           // mullions up into the infill
          const p = [w.a[0] + d[0] * m, w.a[1] + d[1] * m], top = roofZ(P, p[0], p[1]) - 150; if (top <= h + 50) continue;
          g.add(wallBox([p[0] - d[0] * 25, p[1] - d[1] * 25], d, 0, 50, 70, h, top, frame));
        }
      }
    }
  }
  // roof: a gable, or a single slope, with overhang and fascia thickness
  if (!opts.cutaway) {
    const roofMat = material(R.mat || "roof-standing-seam"), th = 250;
    const alongY = R.type === "mono" ? (R.low === "w" || R.low === "e") : R.ridge === "y";        // the roof's extrusion runs along plan y
    const span = alongY ? [bx.x0 - oh, bx.x1 + oh] : [bx.y0 - oh, bx.y1 + oh], len = alongY ? [bx.y0 - oh, bx.y1 + oh] : [bx.x0 - oh, bx.x1 + oh];
    const mid = (span[0] + span[1]) / 2, half = (span[1] - span[0]) / 2;
    const sh = new THREE.Shape();
    if (R.type === "gable") { const slope = (ridge - eaves) / (half - oh), dropOh = oh * slope; sh.moveTo(M(-half), M(eaves - dropOh)); sh.lineTo(0, M(ridge)); sh.lineTo(M(half), M(eaves - dropOh)); sh.lineTo(M(half), M(eaves - dropOh + th)); sh.lineTo(0, M(ridge + th)); sh.lineTo(M(-half), M(eaves - dropOh + th)); }
    else if (R.type === "mono") {
      const slope = (ridge - eaves) / (2 * (half - oh)), lowFirst = R.low === "w" || R.low === "s";
      const zA = lowFirst ? eaves - oh * slope : ridge + oh * slope, zB = lowFirst ? ridge + oh * slope : eaves - oh * slope;
      sh.moveTo(M(-half), M(zA)); sh.lineTo(M(half), M(zB)); sh.lineTo(M(half), M(zB + th)); sh.lineTo(M(-half), M(zA + th));
    }
    else { sh.moveTo(M(-half), M(eaves)); sh.lineTo(M(half), M(eaves)); sh.lineTo(M(half), M(eaves + th)); sh.lineTo(M(-half), M(eaves + th)); }
    const geo = new THREE.ExtrudeGeometry(sh, { depth: M(len[1] - len[0]), bevelEnabled: false });
    // world-scale UVs for the seams: u across the slope, v along the ridge
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getZ(i) / 1.12 * 2, pos.getX(i) / 1.12);
    const roof = new THREE.Mesh(geo, roofMat); roof.castShadow = roof.receiveShadow = true; roof.name = "ROOF";
    if (alongY) roof.position.set(M(mid), 0, -M(len[1]));        // shape across x, extruded along +z from the north end
    else { roof.rotation.y = Math.PI / 2; roof.position.set(M(len[0]), 0, -M(mid)); }
    root.add(roof);
  }
  // decks (with barriers where they stand high) and the piles under a raised floor
  const fag = P.site?.floorAboveGround || 0, deckMat = material("deck-timber"), post = new THREE.CylinderGeometry(0.09, 0.09, 1, 10), postMat = material("timber-pile");
  const piles = (poly) => { if (fag < 300) return; const b = polyBox(poly); for (let x = b.x0 + 300; x <= b.x1; x += 1800) for (let y = b.y0 + 300; y <= b.y1; y += 1800) { const m = new THREE.Mesh(post, postMat); m.scale.y = M(fag); m.position.copy(V3(x, y, -fag / 2 - 150)); m.castShadow = true; root.add(m); } };
  piles(bx ? [[bx.x0, bx.y0], [bx.x1, bx.y1]] : []);
  for (const dk of P.decks || []) {
    const sh = new THREE.Shape(dk.poly.map(([x, y]) => new THREE.Vector2(M(x), M(y))));
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.19, bevelEnabled: false }); geo.rotateX(-Math.PI / 2); geo.translate(0, -0.2, 0);
    const pos = geo.attributes.position, uv = geo.attributes.uv; for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / 1.12, pos.getZ(i) / 1.12);
    const m = new THREE.Mesh(geo, deckMat); m.receiveShadow = m.castShadow = true; m.name = "DECK_" + dk.id; m.userData = { kind: "deck", id: dk.id }; root.add(m);
    piles(dk.poly);
    if (dk.barrier) for (let i = 0; i < dk.poly.length; i++) {       // glass balustrade on the open edges (not along the house)
      const a = dk.poly[i], b2 = dk.poly[(i + 1) % dk.poly.length], midp = [(a[0] + b2[0]) / 2, (a[1] + b2[1]) / 2];
      if (midp[0] > bx.x0 - 60 && midp[0] < bx.x1 + 60 && midp[1] > bx.y0 - 60 && midp[1] < bx.y1 + 60) continue;
      if ((dk.open || []).includes(i)) continue;
      const Lg = Math.hypot(b2[0] - a[0], b2[1] - a[1]); if (Lg < 200) continue; const dd = [(b2[0] - a[0]) / Lg, (b2[1] - a[1]) / Lg];
      root.add(wallBox(a, dd, 0, Lg, 15, 0, dk.barrier, glass)); root.add(wallBox(a, dd, 0, Lg, 50, dk.barrier - 40, dk.barrier, frame));
    }
  }
  // furniture: banquet tables in an assembly room, so a render reads at the right scale
  if (opts.furniture !== false) {
    const tab = new THREE.CylinderGeometry(0.9, 0.9, 0.04, 32), leg = new THREE.CylinderGeometry(0.06, 0.06, 0.72, 12), linen = new THREE.MeshStandardMaterial({ color: "#f3efe8", roughness: 0.9 });
    for (const r of P.rooms.filter((x) => x.use === "assembly")) {
      const b = polyBox(r.poly), n = Math.min(r.occupants ? Math.ceil(r.occupants / 10) : 0, 60); let k = 0;
      for (let x = b.x0 + 2200; x < b.x1 - 1800 && k < n; x += 2600) for (let y = b.y0 + 2200; y < b.y1 - 3200 && k < n; y += 2600, k++) {
        const t = new THREE.Mesh(tab, linen); t.position.copy(V3(x, y, 740)); t.castShadow = t.receiveShadow = true; root.add(t);
        const l = new THREE.Mesh(leg, linen); l.position.copy(V3(x, y, 370)); root.add(l);
      }
    }
  }
  return root;
}

// ------------------------------------------------------------------------------------------------ the stage: renderer, light, cameras
export const LIGHTING = {
  day: { sun: [0.9, 1.3, 0.55], sunCol: "#fff4e6", sunI: 3.2, hemiSky: "#cfe0ef", hemiGround: "#8b8a7e", hemiI: 1.0, sky: ["#a9c4dd", "#e9eef2"], exposure: 1.0, glow: 0 },
  golden: { sun: [1.2, 0.35, 0.4], sunCol: "#ffc58c", sunI: 3.6, hemiSky: "#f2c9a8", hemiGround: "#6d5a4e", hemiI: 0.8, sky: ["#f0b48a", "#f6e2cf"], exposure: 1.05, glow: 0.25 },
  dusk: { sun: [-1, 0.25, 0.6], sunCol: "#ff9e7a", sunI: 0.8, hemiSky: "#3b3557", hemiGround: "#1b1820", hemiI: 0.55, sky: ["#1f1b33", "#5a4a6b"], exposure: 1.1, glow: 1 },
};

export function createStage(canvas, P, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.AgXToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(), pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.55;
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 600);
  const hemi = new THREE.HemisphereLight("#fff", "#888", 1), sun = new THREE.DirectionalLight("#fff", 3);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = sc.bottom = -30; sc.right = sc.top = 30; sc.near = 1; sc.far = 140; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  scene.add(hemi, sun, sun.target);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(220, 64), new THREE.MeshStandardMaterial({ color: "#7c8a6a", roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.002; ground.receiveShadow = true; scene.add(ground);
  const pave = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ color: "#b9b2a8", roughness: 0.95 })); pave.rotation.x = -Math.PI / 2; pave.receiveShadow = true; scene.add(pave);
  const interior = new THREE.PointLight("#ffd9a8", 0, 40, 1.6); scene.add(interior);
  let model = null, mode = opts.lighting || "day", cutaway = false;
  const bx = () => polyBox(P.rooms.flatMap((r) => r.poly));
  function rebuild(next = P) {
    P = next; if (model) { scene.remove(model); model.traverse((o) => o.geometry?.dispose()); }
    model = buildModel(P, { cutaway }); scene.add(model);
    const b = bx(), c = V3((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, 0);
    // a paved forecourt on the entry side (the face with the main door)
    const entry = P.openings.find((o) => /entry/i.test(o.note || "")) || P.openings.find(isDoor), sp = entry && openingSpan(P, entry);
    if (sp) { const f = wallFacing(P, sp.w).out; pave.scale.set(14, 1, 1); pave.scale.set(f[0] ? 12 : 16, f[0] ? 16 : 12, 1); pave.position.copy(V3(sp.mid[0] + f[0] * 6500, sp.mid[1] + f[1] * 6500, 0)).setY(0.003); }
    const fag = M(P.site?.floorAboveGround || 0); ground.position.y = -fag - 0.002; pave.position.y = -fag + 0.003;
    interior.position.copy(c).setY(M((P.roof?.eaves || 3000) - 400));
    sun.target.position.copy(c); target.copy(c).setY(1.6);
    light(mode);
  }
  const target = new THREE.Vector3();
  function light(m) {
    mode = m; const L = LIGHTING[m];
    hemi.color.set(L.hemiSky); hemi.groundColor.set(L.hemiGround); hemi.intensity = L.hemiI;
    sun.color.set(L.sunCol); sun.intensity = L.sunI; sun.position.copy(target).add(new THREE.Vector3(...L.sun).normalize().multiplyScalar(60));
    renderer.toneMappingExposure = L.exposure; interior.intensity = L.glow * 120;
    const c = document.createElement("canvas"); c.width = 2; c.height = 256; const g = c.getContext("2d"), gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, L.sky[0]); gr.addColorStop(1, L.sky[1]); g.fillStyle = gr; g.fillRect(0, 0, 2, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; scene.background = t;
    // glazing glows from inside at dusk
    model?.traverse((o) => { if (o.isMesh && o.material?.transparent) { o.material.emissive = new THREE.Color(L.glow ? "#ffcf94" : "#000"); o.material.emissiveIntensity = L.glow * 0.6; } });
  }
  // camera presets, in plan terms
  const VIEWS = {
    aerial: () => { const b = bx(); return { pos: V3(b.x1 + 16000, b.y1 + 14000, 15000), look: V3((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, 2500), fov: 30 }; },
    street: () => { const b = bx(), e = P.openings.find((o) => /entry/i.test(o.note || "")), s = e && openingSpan(P, e), f = s ? wallFacing(P, s.w).out : [0, 1]; const m = s ? s.mid : [(b.x0 + b.x1) / 2, b.y1];
      return { pos: V3(m[0] + f[0] * 26000 - f[1] * 9000, m[1] + f[1] * 26000 + f[0] * 9000, 1650), look: V3((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, 3300), fov: 34 }; },
    interior: () => { const r = P.rooms.find((x) => x.use === "assembly") || P.rooms[0], b = polyBox(r.poly); return { pos: V3(b.x1 - 1500, b.y0 + 1800, 1600), look: V3(b.x0 + 3000, b.y1 - 2000, 2600), fov: 58 }; },
    // the opposite side and two corners: with street and interior, the client view set (one look, consistent cameras)
    rear: () => { const b = bx(), c = [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2], v = VIEWS.street(), p = plan(v.pos);
      return { pos: V3(2 * c[0] - p[0], 2 * c[1] - p[1], 1650), look: V3(c[0], c[1], 3300), fov: 34 }; },
    cornerA: () => { const b = bx(), c = [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2], r = Math.max(b.x1 - b.x0, b.y1 - b.y0); return { pos: V3(b.x1 + r * 0.9, b.y1 + r * 0.9, r * 0.35 + 2000), look: V3(c[0], c[1], 2500), fov: 32 }; },
    cornerB: () => { const b = bx(), c = [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2], r = Math.max(b.x1 - b.x0, b.y1 - b.y0); return { pos: V3(b.x0 - r * 0.9, b.y0 - r * 0.9, r * 0.35 + 2000), look: V3(c[0], c[1], 2500), fov: 32 }; },
    plan: () => { const b = bx(); return { pos: V3((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2 - 1, 48000), look: V3((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, 0), fov: 28 }; },
  };
  function view(name) { const v = VIEWS[name](); camera.position.copy(v.pos); camera.fov = v.fov; camera.lookAt(v.look); target.copy(v.look); camera.updateProjectionMatrix(); return v; }
  function setCutaway(on) { cutaway = on; rebuild(P); }
  function resize() { const w = canvas.clientWidth || 800, h = canvas.clientHeight || 500; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  function render() { renderer.render(scene, camera); }
  rebuild(P);
  return { THREE, renderer, scene, camera, target, rebuild, light, view, VIEWS, resize, render, setCutaway, get model() { return model; }, get mode() { return mode; }, get P() { return P; } };
}

// render the current view at an exact size (stills for socials, clients, print), with the provenance label burned in
export async function still(stage, w, h, label) {
  const { renderer, camera } = stage, size = new THREE.Vector2(); renderer.getSize(size);
  const ratio = renderer.getPixelRatio(), aspect = camera.aspect, fov = camera.fov;
  // keep what the person framed: hold the horizontal field of view when the frame turns portrait
  const hfov = 2 * Math.atan(Math.tan((fov * Math.PI) / 360) * aspect), na = w / h;
  if (na < aspect) camera.fov = Math.min(100, (2 * Math.atan(Math.tan(hfov / 2) / na) * 180) / Math.PI);
  renderer.setPixelRatio(1); renderer.setSize(w, h, false); camera.aspect = na; camera.updateProjectionMatrix(); stage.render();
  const out = document.createElement("canvas"); out.width = w; out.height = h; const g = out.getContext("2d"); g.drawImage(renderer.domElement, 0, 0, w, h);
  if (label) burnLabel(g, w, h, label);
  renderer.setPixelRatio(ratio); renderer.setSize(size.x, size.y, false); camera.aspect = aspect; camera.fov = fov; camera.updateProjectionMatrix(); stage.render();
  return new Promise((res) => out.toBlob(res, "image/png"));
}
export function burnLabel(g, w, h, label) {
  const s = Math.max(12, Math.round(Math.min(w, h) / 55)); g.font = `500 ${s}px "IBM Plex Mono", ui-monospace, monospace`;
  const pad = s * 0.6, tw = g.measureText(label).width; g.fillStyle = "rgba(36,11,33,.72)"; g.fillRect(pad, h - pad - s * 1.7, tw + pad * 2, s * 1.7);
  g.fillStyle = "#FFFDFB"; g.fillText(label, pad * 2, h - pad - s * 0.5);
}

// a flythrough along a camera path, recorded in the browser (WebM in Chrome/Firefox, MP4 in Safari)
export function flyPath(stage, kind = "approach") {
  const P = stage.P, b = polyBox(P.rooms.flatMap((r) => r.poly)), c = [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
  const e = P.openings.find((o) => /entry/i.test(o.note || "")), s = e && openingSpan(P, e), f = s ? wallFacing(P, s.w).out : [0, 1], m = s ? s.mid : [c[0], b.y1];
  if (kind === "orbit") {
    const R = Math.max(b.x1 - b.x0, b.y1 - b.y0) * 1.25, pts = [];
    for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI * 1.25 + 0.4; pts.push(V3(c[0] + Math.cos(a) * R, c[1] + Math.sin(a) * R, 7000 - i * 300)); }
    return { pos: new THREE.CatmullRomCurve3(pts), look: () => V3(c[0], c[1], 2500) };
  }
  // approach: from the street to the entry, through it, into the main room
  const hall = P.rooms.find((x) => x.use === "assembly") || P.rooms[0], hb = polyBox(hall.poly);
  const pts = [V3(m[0] + f[0] * 30000 + f[1] * 8000, m[1] + f[1] * 30000 - f[0] * 8000, 2400), V3(m[0] + f[0] * 14000, m[1] + f[1] * 14000, 1800), V3(m[0] + f[0] * 3500, m[1] + f[1] * 3500, 1650), V3(m[0] - f[0] * 2500, m[1] - f[1] * 2500, 1650), V3((hb.x0 + hb.x1) / 2 + 2000, (hb.y0 + hb.y1) / 2 + 1500, 1700)];
  const looks = [V3(c[0], c[1], 3000), V3(m[0], m[1], 2200), V3(m[0] - f[0] * 4000, m[1] - f[1] * 4000, 1800), V3((hb.x0 + hb.x1) / 2, (hb.y0 + hb.y1) / 2, 2000), V3(hb.x0 + 2000, hb.y0 + 3000, 2200)];
  return { pos: new THREE.CatmullRomCurve3(pts), look: (t) => { const k = Math.min(looks.length - 2, Math.floor(t * (looks.length - 1))), u = t * (looks.length - 1) - k; return looks[k].clone().lerp(looks[k + 1], u * u * (3 - 2 * u)); } };
}

export async function recordFlythrough(stage, { w = 1080, h = 1920, seconds = 12, fps = 30, kind = "approach", label = "", onProgress } = {}) {
  const { renderer, camera } = stage, size = new THREE.Vector2(); renderer.getSize(size); const ratio = renderer.getPixelRatio(), aspect = camera.aspect, fov = camera.fov;
  renderer.setPixelRatio(1); renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = h > w ? 58 : 42; camera.updateProjectionMatrix();
  const comp = document.createElement("canvas"); comp.width = w; comp.height = h; const g = comp.getContext("2d");
  const stream = comp.captureStream(fps), types = ["video/mp4;codecs=avc1", "video/webm;codecs=vp9", "video/webm"];
  const type = types.find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || "video/webm";
  const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: w * h * 4 }), chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  // the camera follows the clock, so the clip lasts exactly `seconds`: a slow device drops frames rather than playing in slow motion
  const path = flyPath(stage, kind), dur = seconds * 1000; rec.start(); const t0 = performance.now();
  for (let i = 0, t = 0; t < 1; i++) {
    t = Math.min(1, (performance.now() - t0) / dur); const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    camera.position.copy(path.pos.getPoint(e)); camera.lookAt(path.look(e)); stage.render();
    g.drawImage(renderer.domElement, 0, 0, w, h); if (label) burnLabel(g, w, h, label);
    // always yield a little: the browser stamps a captured frame only when the main thread is free
    onProgress?.(t); const due = t0 + ((i + 1) * 1000) / fps; await new Promise((r) => setTimeout(r, Math.max(12, due - performance.now())));
  }
  rec.stop(); await new Promise((r) => (rec.onstop = r));
  renderer.setPixelRatio(ratio); renderer.setSize(size.x, size.y, false); camera.aspect = aspect; camera.fov = fov; camera.updateProjectionMatrix();
  return new Blob(chunks, { type: type.split(";")[0] });
}

// a depth pass of the current view: the structure an AI image or video model must follow (it may restyle, not redesign)
export function depthPass(stage, w = 1024, h = 640) {
  const { renderer, scene, camera } = stage, size = new THREE.Vector2(); renderer.getSize(size); const ratio = renderer.getPixelRatio(), aspect = camera.aspect;
  const near = camera.near, far = camera.far; camera.near = 1; camera.far = 120;
  const bg = scene.background; scene.background = new THREE.Color("#000"); scene.overrideMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.BasicDepthPacking });
  renderer.setPixelRatio(1); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.render(scene, camera);
  const out = document.createElement("canvas"); out.width = w; out.height = h; out.getContext("2d").drawImage(renderer.domElement, 0, 0);
  scene.overrideMaterial = null; scene.background = bg; camera.near = near; camera.far = far;
  renderer.setPixelRatio(ratio); renderer.setSize(size.x, size.y, false); camera.aspect = aspect; camera.updateProjectionMatrix(); stage.render();
  return out.toDataURL("image/png");
}
