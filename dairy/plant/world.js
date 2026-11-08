// The 3D plant: the buildings, the NVIDIA SimReady equipment and a sync() that draws the model's state every frame.
// SimReady (CC BY 4.0, web copies from codepawl/simready-glb, simplified for the browser): the forklifts, pallets,
// racking, belt conveyors, roller outfeeds, label printers, stainless IBC, QA bench, rail guards and safety kit.
// Made for this page (SimReady has none of them): the silos, evaporator, dryer tower, tankers, container trucks,
// palletisers, wrapper, buildings and people. Materials are realistic; the brand lives in the overlays.
import { THREE, std, box, cyl, bake, shadowProxy, Instanced, Repeat, ribTexture, label, makePerson, animatePerson, OUTFIT } from '../../assets/twin/3/kit.js';
import * as L from './layout.js';
import { BAGS_PER_PALLET } from './sim.js';

const S = '/assets/models/simready/';
export const FILES = { // bytes, for the progress bar
  forklift: { url: S + 'forklift.glb', bytes: 959684 }, pallet: { url: S + 'pallet.glb', bytes: 69648 }, rack: { url: S + 'rack.glb', bytes: 247028 },
  conveyor: { url: S + 'conveyor.glb', bytes: 287584 }, printer: { url: S + 'printer.glb', bytes: 96552 }, railguard: { url: S + 'railguard.glb', bytes: 13788 },
  extinguisher: { url: S + 'extinguisher.glb', bytes: 117424 }, firstaid: { url: S + 'firstaid.glb', bytes: 63988 }, machineguard: { url: S + 'machineguard.glb', bytes: 33428 },
  belt: { url: S + 'dairy/beltconveyor.glb', bytes: 541684 }, ibc: { url: S + 'dairy/ibc.glb', bytes: 209128 }, bench: { url: S + 'dairy/bench.glb', bytes: 54900 },
};
export const TEX = Object.fromEntries(['floor_albedo', 'floor_orm', 'floor_normal', 'panel_albedo', 'panel_orm', 'panel_normal'].map(k => [k, `${S}tex/${k}.webp`]));

const C = { yard: 0x3a3938, grass: 0x262525, kerb: 0x8f8a84, clad: 0xe6e4df, cladDark: 0x9aa0a4, steel: 0x56616b, stainless: 0xc8ccd0, truckCab: [0xe9e6df, 0x2f5f8a, 0xe9e6df, 0x9aa1a5, 0x3f4549], container: [0xb5462f, 0x2c5c87, 0x6b7f3a, 0x8b6a3e, 0x4a4f55] };
const up = new THREE.Vector3(0, 1, 0);
// UVs in metres from each face's position, so a texture or a ribbed normal map repeats at its real size on any box
function metreUV(g, sx = 1, sy = 1) {
  const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)); let u, v;
    if (ay > 0.5) { u = p.getX(i); v = p.getZ(i); } else if (ax > 0.5) { u = p.getZ(i); v = p.getY(i); } else { u = p.getX(i); v = p.getY(i); }
    uv[i * 2] = u / sx; uv[i * 2 + 1] = v / sy; }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g;
}
function mbox(w, h, d, mat, x, y, z, parent, sx = 1, sy = 1) { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); metreUV(g, sx, sy); const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; if (parent) parent.add(m); return m; }
// a paper sack stack: bag faces printed on a small canvas, tiled by the load's real size (one box a pallet, one draw for all)
function bagTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#e9e2d2'; g.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 2; i++) { const x = i * 128; g.fillStyle = '#efe9dc'; g.fillRect(x + 4, 6, 120, 116); g.fillStyle = '#3d6c8f'; g.fillRect(x + 4, 52, 120, 16); g.fillStyle = '#d8cfbc'; g.fillRect(x + 4, 6, 120, 4); g.fillRect(x + 4, 118, 120, 4); g.strokeStyle = 'rgba(80,70,55,.35)'; g.lineWidth = 3; g.strokeRect(x + 3, 4, 122, 120); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function stackMaterial(tex) {
  const m = std({ map: tex, roughness: 0.92, metalness: 0, color: 0xffffff });
  m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>
    #ifdef USE_INSTANCING
      vec3 sc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
    #else
      vec3 sc = vec3(1.0);
    #endif
    vec3 pp = (position + vec3(0.0, 0.5, 0.0)) * sc; vec2 suv;
    if (abs(normal.x) > 0.5) suv = vec2(pp.z, pp.y); else if (abs(normal.z) > 0.5) suv = vec2(pp.x, pp.y); else suv = vec2(pp.x, pp.z);
    suv = suv / vec2(${(L.BAG.w * 2).toFixed(2)}, ${L.BAG.h.toFixed(3)});
    #ifdef USE_MAP
      vMapUv = suv;
    #endif`); };
  return m;
}

export class World {
  constructor(scene, assets, tex, sim) {
    this.scene = scene; this.A = assets; this.tex = tex; this.sim = sim;
    this.root = new THREE.Group(); scene.add(this.root); this.walls = [];
    this.tmp = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.v = new THREE.Vector3(); this.s = new THREE.Vector3(1, 1, 1);
    this.M = {
      stainless: std({ color: C.stainless, metalness: 0.92, roughness: 0.3 }), steel: std({ color: C.steel, roughness: 0.55, metalness: 0.55 }),
      clad: std({ color: C.clad, roughness: 0.62, metalness: 0.2, normalMap: ribTexture(4), normalScale: new THREE.Vector2(0.7, 0.7) }),
      cladDark: std({ color: C.cladDark, roughness: 0.6, metalness: 0.3, normalMap: ribTexture(4), normalScale: new THREE.Vector2(0.6, 0.6) }),
      glass: std({ color: 0x9fb6c0, roughness: 0.08, metalness: 0.6, transparent: true, opacity: 0.32, depthWrite: false }),
      roofSheet: std({ color: 0xdfe6e8, roughness: 0.3, metalness: 0.1, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }),
      concrete: std({ color: 0x9a958e, roughness: 0.95 }), yellow: std({ color: 0xd9b62e, roughness: 0.6 }), dark: std({ color: 0x2a2d30, roughness: 0.6, metalness: 0.4 }),
      tyre: std({ color: 0x161616, roughness: 0.9 }), tinted: std({ color: 0x1d2a33, roughness: 0.08, metalness: 0.8 }),
      lamp: std({ color: 0xffffff, emissive: 0xfff3dc, emissiveIntensity: 6, roughness: 0.3 }),
      gauge: std({ color: 0x1b1d1f, emissive: 0xffd9a6, emissiveIntensity: 2.2, roughness: 0.4 }),
    };
    // fewer draw calls: merge each moving group of the SimReady forklift, and the one-off props, by material
    for (const n of ['body', 'mast2', 'carriage']) { const g = assets.forklift.getObjectByName(n); if (g) bake(g, { cast: true }); }
    for (const k of ['printer', 'ibc', 'extinguisher', 'firstaid', 'bench']) bake(assets[k], { cast: true });
    this.buildGround(); this.buildBays(); this.buildSilos(); this.buildProcess(); this.buildHall(); this.buildLines(); this.buildStore(); this.buildDock(); this.buildPools(); this.buildAgents();
  }

  // ── ground, roads, kerbs, lamp posts ───────────────────────────────────────────────────────────────────────────
  buildGround() {
    const t = this.tex, rep = (tx, x, y) => { const c = tx.clone(); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(x, y); c.needsUpdate = true; return c; };
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), std({ color: C.grass, roughness: 1 })); grass.rotation.x = -Math.PI / 2; grass.position.y = -0.06; grass.receiveShadow = true; this.root.add(grass);
    const yardMat = std({ color: C.yard, roughness: 0.94, map: rep(t.floor_albedo, 30, 20), normalMap: rep(t.floor_normal, 30, 20), normalScale: new THREE.Vector2(0.4, 0.4) });
    const pad = (x0, x1, z0, z1, y = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), yardMat); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.receiveShadow = true; this.root.add(m); return m; };
    pad(-96, 112, -48, 46, 0.0); pad(-96, -84, -150, 160, 0.005); pad(84, 125, -10, 40, 0.005);
    // painted lines: bay lanes, queue stalls, hold lines, walkways (one instanced strip)
    const paint = std({ color: 0xe9e5da, roughness: 0.8 }), lines = new Repeat(new THREE.PlaneGeometry(1, 1), paint, 120, { cast: false }); lines.im.rotation.x = 0; this.root.add(lines.im);
    let n = 0; const strip = (x, z, w, d) => { this.q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2); this.v.set(x, 0.02, z); this.s.set(w, d, 1); this.tmp.compose(this.v, this.q, this.s); lines.set(n++, this.tmp); };
    for (const x of [-77, -71, -65, -59, -53, -47]) strip(x, 0, 0.15, 28);
    for (let k = 0; k <= 5; k++) strip(-77 + 6 * k, 38, 0.15, 22);
    strip(-62, 27, 30, 0.3);   // hold line in front of the bays
    for (let z = -140; z < 150; z += 9) strip(-90, z, 0.15, 4);
    for (let x = 86; x < 125; x += 9) strip(x, 15, 4, 0.15);
    lines.commit(n); this.s.set(1, 1, 1);
    // lamp posts round the yard (their heads are real lights, so they may bloom)
    const posts = [[-84, 30], [-84, -20], [-44, 40], [-4, 40], [36, 40], [86, -6], [86, 30], [-44, -40], [40, -40]];
    const pole = new Repeat(new THREE.CylinderGeometry(0.1, 0.14, 9, 8), this.M.steel, posts.length), head = new Repeat(new THREE.BoxGeometry(0.9, 0.18, 0.4), this.M.lamp, posts.length, { cast: false });
    posts.forEach(([x, z], i) => { this.tmp.makeTranslation(x, 4.5, z); pole.set(i, this.tmp); this.tmp.makeTranslation(x + 0.4, 9, z); head.set(i, this.tmp); });
    pole.commit(posts.length); head.commit(posts.length); this.root.add(pole.im, head.im);
  }

  // ── tanker bays: a canopy of translucent sheeting on steel portals, a hose post at every bay ───────────────────
  buildBays() {
    const g = new THREE.Group(), K = L.BAYS.canopy, M = this.M; this.root.add(g);
    for (const x of [-77, -71, -65, -59, -53, -47]) for (const z of [-13.6, 0, 13.6]) box(0.36, K.h, 0.36, M.steel, x, K.h / 2, z, g);
    for (const x of [-77, -71, -65, -59, -53, -47]) box(0.3, 0.6, K.z1 - K.z0, M.steel, x, K.h, 0, g);
    for (let z = K.z0 + 1; z < K.z1; z += 3) box(K.x1 - K.x0, 0.14, 0.1, M.steel, (K.x0 + K.x1) / 2, K.h + 0.37, z, g);
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(K.x1 - K.x0, K.z1 - K.z0), M.roofSheet); sheet.rotation.x = -Math.PI / 2; sheet.position.set((K.x0 + K.x1) / 2, K.h + 0.46, 0); g.add(sheet);
    // hose posts and the milk line along the bays to the silo farm
    L.BAYS.x.forEach((x, i) => { const h = L.HOSE(i); box(0.5, 1.4, 0.5, M.stainless, h.x + 0.55, 0.7, h.z + 0.4, g); cyl(0.07, 5.4, M.stainless, h.x + 0.55, 0, h.z + 0.4, g, 10);
      const sign = label(`Bay ${i + 1}`, { w: 1.6, h: 0.6, color: '#1d1a1c', bg: '#f2efe8', size: 46 }); sign.position.set(x, 5.6, 14.6); g.add(sign); });
    const pipe = (pts, r = 0.16) => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.02), 64, r, 10, false), M.stainless); m.castShadow = true; g.add(m); };
    pipe([[-76, 5.4, -0.8], [-47, 5.4, -0.8], [-41, 5.4, -0.8], [-40, 6.5, -6], [-38, 6.5, -14.5]], 0.18);
    pipe([[-76, 5.0, -1.3], [-47, 5.0, -1.3], [-42, 5.0, -1.3], [-41, 6.0, -7], [-39.5, 6.0, -20]], 0.12);
    // QA lab: a small block with a window band and a stainless bench
    const lab = new THREE.Group(), Q = L.QA_LAB; this.root.add(lab);
    mbox(Q.w, 3.4, Q.d, M.clad, Q.x, 1.7, Q.z, lab); mbox(Q.w + 0.4, 0.25, Q.d + 0.4, M.cladDark, Q.x, 3.5, Q.z, lab);
    box(Q.w - 1.5, 1.0, 0.05, M.tinted, Q.x + 0.4, 1.9, Q.z - Q.d / 2 - 0.03, lab); box(1.0, 2.2, 0.06, M.dark, Q.door.x, 1.1, Q.z - Q.d / 2 - 0.04, lab);
    const sg = label('Milk testing', { w: 3, h: 0.6, color: '#1d1a1c', bg: '#f2efe8', size: 44 }); sg.position.set(Q.x + 1.2, 3.0, Q.z - Q.d / 2 - 0.05); sg.rotation.y = Math.PI; lab.add(sg);
    bake(g, { cast: true }); bake(lab, { cast: true });
  }

  // ── raw milk silos: stainless, on skirts, with a lit level gauge each ──────────────────────────────────────────
  buildSilos() {
    const g = new THREE.Group(), M = this.M; this.root.add(g); this.gauges = [];
    const prof = r => { const p = [new THREE.Vector2(0, 0), new THREE.Vector2(r * 0.4, 0), new THREE.Vector2(r, 1.6)]; const top = 16; p.push(new THREE.Vector2(r, top)); for (let i = 1; i <= 6; i++) { const a = i / 6 * Math.PI / 2; p.push(new THREE.Vector2(Math.cos(a) * r, top + Math.sin(a) * 1.4)); } return p; };
    const shell = new THREE.LatheGeometry(prof(3.0), 40);
    for (const s of L.SILOS) {
      const m = new THREE.Mesh(shell, M.stainless); m.position.set(s.x, s.base, s.z); m.castShadow = m.receiveShadow = true; g.add(m);
      cyl(2.2, s.base, M.concrete, s.x, 0, s.z, g, 24);
      // a caged ladder up the side, a walkway ring on top
      box(0.5, s.h + 1.6, 0.06, M.steel, s.x + 3.1, s.base + (s.h + 1.6) / 2, s.z, g);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(3.15, 0.05, 6, 40), M.steel); ring.rotation.x = Math.PI / 2; ring.position.set(s.x, s.base + s.h + 1.6, s.z); g.add(ring);
      const gauge = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1, 0.05), M.gauge); gauge.position.set(s.x, s.base + 1.6, s.z + 3.04); gauge.geometry.translate(0, 0.5, 0); this.root.add(gauge); this.gauges.push(gauge);
      const track = new THREE.Mesh(new THREE.BoxGeometry(0.24, s.h - 1.6, 0.03), M.dark); track.position.set(s.x, s.base + 1.6 + (s.h - 1.6) / 2, s.z + 3.02); g.add(track);
    }
    // a pipe bridge from the silos to the evaporator hall
    for (let x = -38; x <= -12; x += 6.5) { box(0.3, 7.5, 0.3, M.steel, x, 3.75, -14.5, g); }
    box(28, 0.4, 1.6, M.steel, -25, 7.6, -14.5, g);
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 40, 12), M.stainless); pipe.rotation.z = Math.PI / 2; pipe.position.set(-20, 8.0, -14.2); g.add(pipe);
    const p2 = pipe.clone(); p2.position.z = -14.9; p2.scale.set(0.7, 1, 0.7); g.add(p2);
    bake(g, { cast: true });
  }

  // ── evaporator hall (glazed so you can see the falling-film columns), dryer tower, baghouse, stack, boilers ────
  buildProcess() {
    const M = this.M, g = new THREE.Group(); this.root.add(g);
    const E = L.EVAP, ew = E.x1 - E.x0, ed = E.z1 - E.z0, ex = (E.x0 + E.x1) / 2, ez = (E.z0 + E.z1) / 2;
    mbox(ew, E.h, 0.3, M.clad, ex, E.h / 2, E.z0, g); mbox(0.3, E.h, ed, M.clad, E.x0, E.h / 2, ez, g); mbox(0.3, E.h, ed, M.clad, E.x1, E.h / 2, ez, g);
    mbox(ew + 0.6, 0.5, ed + 0.6, M.cladDark, ex, E.h + 0.25, ez, g);
    box(ew, E.h - 3, 0.06, M.glass, ex, 1.5 + (E.h - 3) / 2, E.z1, g); for (let x = E.x0; x <= E.x1; x += ew / 4) box(0.18, E.h, 0.3, M.steel, x, E.h / 2, E.z1, g);
    mbox(ew, 3, 0.3, M.clad, ex, 1.5, E.z1, g);
    // three falling-film calandrias with their separators, and a steam pipe up the back
    for (let i = 0; i < 3; i++) { const x = E.x0 + 2.5 + i * 4.3; cyl(0.95, 16.5, M.stainless, x, 1.5, ez - 2.2, g, 24); cyl(1.4, 5.5, M.stainless, x + 1.6, 1.2, ez + 3.2, g, 24);
      const top = new THREE.Mesh(new THREE.SphereGeometry(0.95, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.stainless); top.position.set(x, 18, ez - 2.2); g.add(top); box(0.4, 0.4, 5.4, M.stainless, x + 0.8, 14.8, ez + 0.5, g); }
    box(ew - 0.6, 0.12, ed * 0.45, M.steel, ex, 7, E.z0 + ed * 0.25, g);   // a mezzanine at the back
    // the dryer tower: clad above an open ground floor where the fluid bed and the chamber's cone sit
    const T = L.TOWER, tw = T.x1 - T.x0, td = T.z1 - T.z0, tx = (T.x0 + T.x1) / 2, tz = (T.z0 + T.z1) / 2;
    for (const [x, z] of [[T.x0, T.z0], [T.x1, T.z0], [T.x0, T.z1], [T.x1, T.z1], [tx, T.z1], [tx, T.z0]]) box(0.8, 9, 0.8, M.steel, x, 4.5, z, g);
    mbox(tw, T.h - 9, td, M.clad, tx, 9 + (T.h - 9) / 2, tz, g); mbox(tw + 0.6, 0.6, td + 0.6, M.cladDark, tx, T.h + 0.3, tz, g);
    mbox(tw - 6, 4, td - 6, M.cladDark, tx, T.h + 2.6, tz, g);   // plant room on the roof
    for (let y = 14; y < T.h - 2; y += 6.5) box(tw - 2, 1.0, 0.06, M.tinted, tx, y, T.z1 + 0.02, g);   // window bands
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 0.9, 7, 32, 1, true), M.stainless); cone.position.set(tx, 5.6, tz); cone.material.side = THREE.DoubleSide; g.add(cone);
    box(13, 2.0, 3.2, M.stainless, tx, 1.0, T.z1 - 3.2, g);   // vibrating fluid bed
    const sign = label('Dryer 1', { w: 7, h: 1.6, color: '#2d2a2c', size: 80 }); sign.position.set(tx, T.h - 4, T.z1 + 0.06); g.add(sign);
    // baghouse on legs, ducts, and the exhaust stack
    const B = L.BAGHOUSE, bx = (B.x0 + B.x1) / 2, bz = (B.z0 + B.z1) / 2;
    mbox(B.x1 - B.x0, B.h, B.z1 - B.z0, M.cladDark, bx, B.y0 + B.h / 2, bz, g);
    for (const z of [B.z0 + 0.5, B.z1 - 0.5]) for (const x of [B.x0 + 0.4, B.x1 - 0.4]) box(0.3, B.y0, 0.3, M.steel, x, B.y0 / 2, z, g);
    for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(1.0, 2.6, 16), M.stainless); c.rotation.x = Math.PI; c.position.set(bx, B.y0 - 1.3, B.z0 + 1.7 + i * 3.2); g.add(c); }
    const duct = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 6, 16), M.stainless); duct.rotation.z = Math.PI / 2; duct.position.set(T.x1 + 0.5, 30, bz); g.add(duct);
    cyl(L.STACK.r, L.STACK.h, M.cladDark, L.STACK.x, 0, L.STACK.z, g, 24, L.STACK.r * 0.85);
    // the powder line from the tower to the bins in the packing hall
    const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, L.HALL.x0 + 4 - T.x1, 12), M.stainless); pl.rotation.z = Math.PI / 2; pl.position.set((T.x1 + L.HALL.x0 + 4) / 2, 13.2, -18); g.add(pl);
    for (let x = T.x1 + 3; x < L.HALL.x0; x += 3) box(0.24, 13, 0.24, M.steel, x, 6.5, -18, g);
    bake(g, { cast: true });
    // steam from the stack while the dryer runs (soft sprites, normal blending: water vapour, not a glow)
    const n = 90, pg = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), seed = new Float32Array(n);
    for (let i = 0; i < n; i++) seed[i] = i / n;
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); pg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    const c = document.createElement('canvas'); c.width = c.height = 64; const cg = c.getContext('2d'), gr = cg.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); cg.fillStyle = gr; cg.fillRect(0, 0, 64, 64);
    this.steamMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uT: { value: 0 }, uRate: { value: 1 }, uTex: { value: new THREE.CanvasTexture(c) }, uScale: { value: 400 } },
      vertexShader: `attribute float aSeed; uniform float uT, uRate, uScale; varying float vA;
        void main(){ float k = fract(aSeed + uT * 0.035); vec3 p = vec3(${L.STACK.x.toFixed(1)} + k * 9.0 + sin(aSeed * 40.0) * k * 2.5, ${(L.STACK.h + 0.5).toFixed(1)} + k * 16.0, ${L.STACK.z.toFixed(1)} + cos(aSeed * 31.0) * k * 3.0);
          vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = (2.0 + k * 9.0) * uScale / -mv.z; vA = uRate * (1.0 - k) * smoothstep(0.0, 0.08, k) * 0.5; }`,
      fragmentShader: `uniform sampler2D uTex; varying float vA; void main(){ vec4 t = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(vec3(0.93), t.a * vA); }` });
    this.steam = new THREE.Points(pg, this.steamMat); this.steam.frustumCulled = false; this.root.add(this.steam);
  }

  // ── packing hall: insulated panels on a concrete upstand; the walls between the camera and the floor fade away ─
  buildHall() {
    const H = L.HALL, W = H.x1 - H.x0, D = H.z1 - H.z0, t = this.tex, M = this.M;
    const rep = (tx, x, y) => { const c = tx.clone(); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(x, y); c.needsUpdate = true; return c; };
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), std({ map: rep(t.floor_albedo, W / 6, D / 6), roughnessMap: rep(t.floor_orm, W / 9, D / 9), normalMap: rep(t.floor_normal, W / 6, D / 6), normalScale: new THREE.Vector2(0.35, 0.35), color: 0xf4f2ee, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set((H.x0 + H.x1) / 2, 0.012, (H.z0 + H.z1) / 2); floor.receiveShadow = true; this.root.add(floor);
    // walkway paint inside the hall
    const walk = std({ color: 0xd9c23e, roughness: 0.7 }); const wk = new THREE.Group(); this.root.add(wk);
    for (const [x, z, w, d] of [[L.EAST_X - 1.6, -10, 0.12, 40], [L.EAST_X + 1.6, -10, 0.12, 40], [55, -9.2 + 0.1, 36, 0.12], [55, 1.6, 36, 0.12]]) box(w, 0.01, d, walk, x, 0.02, z, wk);
    bake(wk, { receive: true });
    const panel = std({ map: rep(t.panel_albedo, 1, 1), normalMap: ribTexture(4), roughnessMap: t.panel_orm, color: 0xd7d3cc, roughness: 0.8, metalness: 0.15, normalScale: new THREE.Vector2(0.8, 0.8) });
    const plinth = std({ color: C.kerb, roughness: 0.95 });
    const wall = (name, len, along, pos, normal, openings = []) => {
      const g = new THREE.Group(); g.name = name; g.userData.normal = normal; this.root.add(g); const upper = new THREE.Group(); g.add(upper); g.userData.upper = upper;
      const segs = []; let a = -len / 2; for (const o of [...openings].sort((p, q) => p.c - q.c)) { segs.push([a, o.c - o.w / 2]); a = o.c + o.w / 2; } segs.push([a, len / 2]);
      const mk = (u0, u1, y0, y1, mat, grp) => { const l = u1 - u0; if (l <= 0.01) return; const c = (u0 + u1) / 2; mbox(along === 'x' ? l : 0.16, y1 - y0, along === 'x' ? 0.16 : l, mat, along === 'x' ? pos.x + c : pos.x, (y0 + y1) / 2, along === 'x' ? pos.z : pos.z + c, grp); };
      for (const [u0, u1] of segs) { mk(u0, u1, 0, 1.2, plinth, g); mk(u0, u1, 1.2, H.h, panel, upper); }
      for (const o of openings) mk(o.c - o.w / 2, o.c + o.w / 2, o.h, H.h, panel, upper);
      bake(g, { deep: false }); bake(upper, { deep: false }); this.walls.push(g); return g;
    };
    wall('north', W, 'x', { x: (H.x0 + H.x1) / 2, z: H.z0 }, { x: 0, z: -1 });
    wall('south', W, 'x', { x: (H.x0 + H.x1) / 2, z: H.z1 }, { x: 0, z: 1 }, [{ c: L.EAST_X - (H.x0 + H.x1) / 2 + 2, w: 4, h: 4 }]);
    wall('west', D, 'z', { x: H.x0, z: (H.z0 + H.z1) / 2 }, { x: -1, z: 0 });
    wall('east', D, 'z', { x: H.x1, z: (H.z0 + H.z1) / 2 }, { x: 1, z: 0 }, L.DOORS.map(d => ({ c: d.z - (H.z0 + H.z1) / 2, w: L.DOOR.w, h: L.DOOR.h })));
    // portal frames, with high-bay lights under each rafter (no roof sheets: the hall is shown cut open)
    const fr = new THREE.Group(); this.root.add(fr);
    for (let x = H.x0 + 4; x < H.x1; x += 8) { for (const z of [H.z0 + 0.35, H.z1 - 0.35]) box(0.36, H.h, 0.5, M.steel, x, H.h / 2, z, fr); box(0.3, 0.7, D, M.steel, x, H.h + 0.05, (H.z0 + H.z1) / 2, fr);
      for (let z = H.z0 + 6; z < H.z1 - 3; z += 9) { box(0.6, 0.25, 0.6, M.steel, x, H.h - 1.4, z, fr); const ln = new THREE.Mesh(new THREE.CircleGeometry(0.28, 16), M.lamp); ln.rotation.x = Math.PI / 2; ln.position.set(x, H.h - 1.53, z); fr.add(ln); } }
    bake(fr, { deep: false });
    this.hallFrames = fr;
  }

  // ── bagging lines: bins, baggers, SimReady belt conveyors, a check-weigher, gantry palletisers, outfeeds ────────
  buildLines() {
    const M = this.M, g = new THREE.Group(); this.root.add(g);
    // the SimReady belt section, measured so four sections run end to end along x
    const belt = this.A.belt; const bb = new THREE.Box3().setFromObject(belt), sz = bb.getSize(new THREE.Vector3()), long = Math.max(sz.x, sz.z), alongZ = sz.z >= sz.x;
    this.beltTop = bb.max.y;
    const nb = new Instanced(belt, 8).addTo(this.root), rot = new THREE.Matrix4().makeRotationY(alongZ ? Math.PI / 2 : 0);
    const cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2; let k = 0;
    L.LINES.forEach(ln => { const nsec = 4, step = (L.BELT.x1 - L.BELT.x0) / nsec, s = step / long;
      for (let i = 0; i < nsec; i++) { this.tmp.makeTranslation(L.BELT.x0 + step * (i + 0.5), 0, ln.z).multiply(rot).multiply(new THREE.Matrix4().makeScale(alongZ ? 1 : s, 1, alongZ ? s : 1)).multiply(new THREE.Matrix4().makeTranslation(-cx, 0, -cz)); nb.set(k++, this.tmp); } });
    nb.commit(k);
    // roller outfeeds (the DC's SimReady roller conveyor), two sections per pallet place
    const conv = this.A.conveyor, cb = new THREE.Box3().setFromObject(conv), csz = cb.getSize(new THREE.Vector3()), cAlongZ = csz.z >= csz.x;
    this.rollTop = cb.max.y; const rc = new Instanced(conv, 12).addTo(this.root), rr = new THREE.Matrix4().makeRotationY(cAlongZ ? Math.PI / 2 : 0); let j = 0;
    L.LINES.forEach((ln, li) => { for (let i = 0; i < 4; i++) { this.tmp.makeTranslation(57.6 + i * 1.6, 0, ln.z).multiply(rr).multiply(new THREE.Matrix4().makeScale(cAlongZ ? 1.3 : 0.8, 1, cAlongZ ? 0.8 : 1.3)).multiply(new THREE.Matrix4().makeTranslation(-(cb.min.x + cb.max.x) / 2, 0, -(cb.min.z + cb.max.z) / 2)); rc.set(j++, this.tmp); } });
    rc.commit(j);
    L.BINS.forEach((b, i) => {
      cyl(1.8, 5.4, M.stainless, b.x, 5.2, b.z, g, 28); const cn = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 0.35, 2.2, 28), M.stainless); cn.position.set(b.x, 4.1, b.z); g.add(cn);
      for (const [dx, dz] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) box(0.18, 5.2, 0.18, M.steel, b.x + dx, 2.6, b.z + dz, g);
      box(3.4, 0.12, 3.4, M.steel, b.x, 5.15, b.z, g);
      // the bagger: a framed filling station with a spout, and a reel of empty sacks
      const z = L.LINES[i].z, x = L.BAGGER_X;
      for (const [dx, dz] of [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]]) box(0.12, 3.2, 0.12, M.steel, x + dx, 1.6, z + dz, g);
      box(2.4, 0.5, 2.4, M.cladDark, x, 3.3, z, g); cyl(0.22, 1.2, M.stainless, x, 2.1, z, g, 12); box(1.2, 0.9, 0.9, M.clad, x - 0.6, 0.45, z - 1.6, g);
      // check-weigher and metal detector over the belt
      box(1.4, 0.18, 1.3, M.stainless, 47, this.beltTop + 0.55, z, g); for (const dz of [-0.62, 0.62]) box(1.4, 0.75, 0.08, M.stainless, 47, this.beltTop + 0.15, z + dz, g);
      box(0.6, 0.4, 0.3, M.dark, 47.4, this.beltTop + 0.95, z - 0.62, g);
    });
    // stainless IBC (cleaning chemical) and a QA bench by the lines (SimReady)
    const ibc = this.A.ibc.clone(); ibc.position.set(35.6, 0, -6.2); this.root.add(ibc);
    const bench = this.A.bench.clone(); bench.position.set(36.2, 0, -28.4); this.root.add(bench);
    // gantry palletisers: four posts, a beam that travels, and a gripper head (made for this page)
    this.pal = L.LINES.map((ln, i) => {
      const x = L.PALLETISER_X, z = ln.z, pg = new THREE.Group(); this.root.add(pg);
      for (const [dx, dz] of [[-2.4, -1.8], [2.4, -1.8], [-2.4, 1.8], [2.4, 1.8]]) box(0.2, 4.2, 0.2, M.steel, x + dx, 2.1, z + dz, pg);
      for (const dz of [-1.8, 1.8]) box(5.0, 0.24, 0.2, M.yellow, x, 4.2, z + dz, pg);
      bake(pg, { cast: true });
      const beam = new THREE.Group(); beam.position.set(x, 4.0, z); this.root.add(beam); box(0.3, 0.24, 3.8, M.yellow, 0, 0, 0, beam);
      const head = new THREE.Group(); beam.add(head); box(0.75, 0.3, 0.55, M.dark, 0, -0.6, 0, head); box(0.06, 1.2, 0.06, M.steel, 0, -0.1, 0, head);
      // light curtain posts around the cell (SimReady machine guards)
      return { beam, head, x, z };
    });
    const mg = new Instanced(this.A.machineguard, 4).addTo(this.root); let m = 0;
    L.LINES.forEach(ln => { for (const dz of [-2.3, 2.3]) { this.tmp.makeTranslation(L.PALLETISER_X + 2.9, 0, ln.z + dz); mg.set(m++, this.tmp); } }); mg.commit(m);
    // the turntable wrapper and its label printer (SimReady)
    const W = L.WRAPPER, wg = new THREE.Group(); this.root.add(wg);
    const film = std({ color: 0xffffff, roughness: 0.15, metalness: 0, transparent: true, opacity: 0.55 });
    box(0.35, 3.2, 0.35, M.steel, W.x, 1.6, W.z - 1.9, wg); box(2.6, 0.12, 2.6, M.steel, W.x, 0.06, W.z, wg);
    bake(wg, { cast: true });
    const table = new THREE.Group(); table.position.set(W.x, 0.13, W.z); this.root.add(table); cyl(1.2, 0.1, M.dark, 0, 0, 0, table, 32);
    const car = new THREE.Group(); car.position.set(W.x, 0.6, W.z - 1.6); this.root.add(car); box(0.4, 0.5, 0.4, M.yellow, 0, 0, 0, car); cyl(0.08, 0.5, film, 0, -0.25, 0.25, car, 12);
    this.wrap = { table, car };
    const pr = this.A.printer.clone(); pr.position.set(W.x + 1.8, 0, W.z + 1.8); this.root.add(pr);
    bake(g, { cast: true });
  }

  // ── finished goods store: SimReady racking, back to back, two high ─────────────────────────────────────────────
  buildStore() {
    const n = L.ROWS.length * L.RACK.bays * 2, rk = new Instanced(this.A.rack, n).addTo(this.root); let i = 0;
    for (const r of L.ROWS) for (let b = 0; b < L.RACK.bays; b++) for (let tier = 0; tier < 2; tier++) { this.tmp.makeTranslation(L.bayX(b), tier * L.RACK.tierH, r.z); rk.set(i++, this.tmp); }
    rk.commit(i);
    const rg = new Instanced(this.A.railguard, 4).addTo(this.root); let j = 0; const endX = L.RACK.x0 + L.RACK.bays * L.RACK.bayW;
    for (const r of L.ROWS) { this.tmp.makeTranslation(endX + 0.35, 0, r.z).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2)); rg.set(j++, this.tmp); }
    rg.commit(j);
    const ex = this.A.extinguisher.clone(); ex.position.set(L.HALL.x1 - 0.5, 0, 10.4); this.root.add(ex);
    const fa = this.A.firstaid.clone(); fa.position.set(L.HALL.x0 + 0.25, 1.4, 4); fa.rotation.y = Math.PI / 2; this.root.add(fa);
    // chargers for the forklifts
    for (let k = 0; k < 3; k++) { const c = L.CHARGE(k); box(0.6, 1.4, 0.4, this.M.cladDark, c.x, 0.7, c.z + 1.6, this.root); }
  }

  // ── container dock: levellers, and a truck with a 20 ft box for each door ──────────────────────────────────────
  buildDock() {
    const M = this.M, T = L.BOX; this.trucks = [];
    const wheel = new THREE.CylinderGeometry(0.5, 0.5, 0.32, 20); wheel.rotateX(Math.PI / 2);
    L.DOORS.forEach((d, i) => {
      box(2.2, 0.08, 2.8, M.steel, L.HALL.x1 + 0.2, 0.04, d.z, this.root);
      const g = new THREE.Group(); g.position.set(T.x0, 0, d.z); this.root.add(g);
      const boxMat = std({ color: C.container[i % C.container.length], roughness: 0.55, metalness: 0.35, normalMap: ribTexture(10), normalScale: new THREE.Vector2(0.9, 0.9), side: THREE.DoubleSide });
      // the container, open at the dock end, on a skeletal trailer
      box(T.len, 0.08, T.w, std({ color: 0x6d5a45, roughness: 0.85 }), T.len / 2, -0.04, 0, g);
      box(T.len, T.h, 0.05, boxMat, T.len / 2, T.h / 2, -T.w / 2, g); box(T.len, T.h, 0.05, boxMat, T.len / 2, T.h / 2, T.w / 2, g); box(T.len, 0.06, T.w, boxMat, T.len / 2, T.h, 0, g); box(0.06, T.h, T.w, boxMat, T.len, T.h / 2, 0, g);
      for (const sd of [-1, 1]) box(0.05, T.h, T.w / 2, boxMat, -0.02, T.h / 2, sd * T.w * 0.75 + sd * 0.05, g);   // doors swung open
      box(T.len + 4.2, 0.3, 1.0, M.dark, T.len / 2 + 1.8, -0.4, 0, g);
      const cab = new THREE.Group(); cab.position.set(T.len + 1.2, 0, 0); g.add(cab);
      const cm = std({ color: C.truckCab[(i + 1) % C.truckCab.length], roughness: 0.4, metalness: 0.3 });
      box(2.4, 2.4, 2.45, cm, 1.6, 0.75, 0, cab); box(0.05, 0.9, 2.1, M.tinted, 2.82, 1.45, 0, cab);
      for (const wx of [0.4, 1.4, T.len + 2.0, T.len + 3.2]) for (const sd of [-1, 1]) { const w = new THREE.Mesh(wheel, M.tyre); w.position.set(wx, -0.7, sd * 1.05); g.add(w); }
      this.trucks.push(bake(g, { cast: true }));
    });
  }

  // ── pools of repeated things ───────────────────────────────────────────────────────────────────────────────────
  buildPools() {
    this.pallets = new Instanced(this.A.pallet, 320).addTo(this.root);
    this.loads = new Repeat(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), stackMaterial(bagTexture()), 320).addTo(this.root);
    this.film = new Repeat(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), std({ color: 0xffffff, roughness: 0.12, metalness: 0, transparent: true, opacity: 0.32, depthWrite: false }), 320, { cast: false }).addTo(this.root);
    this.labels = new Repeat(new THREE.BoxGeometry(0.02, 0.16, 0.22), std({ color: 0xffffff, roughness: 0.6 }), 320, { cast: false }).addTo(this.root);
    const bag = new THREE.BoxGeometry(L.BAG.d, L.BAG.h, L.BAG.w, 2, 1, 2); const p = bag.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (Math.abs(y) > 0.01) { p.setX(i, p.getX(i) * 0.92); p.setZ(i, p.getZ(i) * 0.94); } } bag.computeVertexNormals(); bag.translate(0, L.BAG.h / 2, 0);
    this.bags = new Repeat(bag, std({ color: 0xece5d5, roughness: 0.9 }), 80).addTo(this.root);
  }

  // ── vehicles and people ────────────────────────────────────────────────────────────────────────────────────────
  buildTanker(i) {
    const M = this.M, cabMat = std({ color: C.truckCab[i % C.truckCab.length], roughness: 0.4, metalness: 0.3 });
    const wheel = new THREE.CylinderGeometry(0.52, 0.52, 0.34, 18); wheel.rotateZ(Math.PI / 2);
    const tank = (len, r) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 28), M.stainless); m.rotation.x = Math.PI / 2; m.castShadow = true; return m; };
    // truck: cab at the front (+z in its own frame), a stainless barrel behind; trailer: a longer barrel on its axles
    const truck = new THREE.Group(), cab = new THREE.Group(); truck.add(cab);
    box(2.45, 2.5, 2.2, cabMat, 0, 1.75, 3.6, cab); box(2.1, 0.9, 0.05, M.tinted, 0, 2.3, 4.72, cab); box(2.45, 0.35, 2.3, M.dark, 0, 0.55, 3.6, cab);
    const t1 = tank(6.0, 1.15); t1.position.set(0, 2.05, -0.6); truck.add(t1); box(1.0, 0.25, 8.6, M.dark, 0, 0.75, 0.2, truck);
    box(0.5, 0.5, 0.6, M.stainless, 0.9, 1.0, -2.6, truck);   // pump box
    for (const z of [3.6, -1.6, -3.0]) for (const sd of [-1, 1]) { const w = new THREE.Mesh(wheel, M.tyre); w.position.set(sd * 1.05, 0.52, z); truck.add(w); }
    const trailer = new THREE.Group(), t2 = tank(7.4, 1.2); t2.position.set(0, 2.05, 0); trailer.add(t2); box(1.0, 0.25, 7.6, M.dark, 0, 0.75, 0, trailer); box(0.12, 0.12, 3.0, M.dark, 0, 0.75, 4.8, trailer);
    for (const z of [2.4, 1.1, -1.8, -3.1]) for (const sd of [-1, 1]) { const w = new THREE.Mesh(wheel, M.tyre); w.position.set(sd * 1.05, 0.52, z); trailer.add(w); }
    bake(truck, { cast: true }); bake(trailer, { cast: true }); this.root.add(truck, trailer);
    return { truck, trailer, id: null, yaw: Math.PI, tyaw: Math.PI };
  }
  buildAgents() {
    this.tankerViews = []; for (let i = 0; i < 16; i++) { const v = this.buildTanker(i); v.truck.visible = v.trailer.visible = false; this.tankerViews.push(v); }
    this.drivers = []; for (let i = 0; i < 6; i++) { const p = makePerson(i + 3, OUTFIT.hivisOrange); p.visible = false; this.root.add(p); this.drivers.push(p); }
    this.views = [];
    let pi = 0;
    for (const a of this.sim.agents) {
      const v = { a, g: new THREE.Group(), yaw: a.pose.yaw };
      this.root.add(v.g);
      if (a.kind === 'forklift') {
        v.vehicle = this.A.forklift.clone(); v.g.add(v.vehicle); v.carriage = v.vehicle.getObjectByName('carriage'); v.mast = v.vehicle.getObjectByName('mast2');
        v.carriage0 = v.carriage ? v.carriage.position.y : 0; v.mast0 = v.mast ? v.mast.position.y : 0;
        v.vehicle.traverse(o => { if (o.isMesh) o.castShadow = false; });
        for (const part of [v.vehicle.getObjectByName('body'), v.mast, v.carriage]) { if (!part) continue; const px = shadowProxy(part); if (px) part.add(px); }
        v.person = makePerson(pi++, OUTFIT.hivis); v.person.position.set(0, 0.17, -0.22); v.person.scale.setScalar(0.96); v.g.add(v.person); v.pose = 'seated';
        const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), std({ color: 0xffb340, emissive: 0xff9a1f, emissiveIntensity: 0 })); beacon.position.set(0.32, 2.2, -0.5); v.g.add(beacon); v.beacon = beacon;
      } else {
        v.person = makePerson(pi++, a.kind === 'sampler' ? OUTFIT.whites : OUTFIT.whites); v.g.add(v.person); v.pose = a.kind === 'lineop' ? 'work' : 'walk';
      }
      this.views.push(v);
    }
  }

  // ── per frame ──────────────────────────────────────────────────────────────────────────────────────────────────
  palletAt(p, out) {
    const S = this.sim, w = p.where; if (!w) return false;
    out.yaw = Math.PI / 2; out.y = 0;
    if (w.t === 'line') { out.x = L.PALLETISER_X; out.z = L.LINES[w.line].z; out.y = this.rollTop * 0.55; return true; }
    if (w.t === 'out') { const q = L.OUTFEED(w.line, w.k), f = Math.min(1, (S.t - w.since) / 6), from = w.k === 0 ? { x: L.PALLETISER_X, z: q.z } : L.OUTFEED(w.line, 0); out.x = from.x + (q.x - from.x) * f; out.z = q.z; out.y = this.rollTop; return true; }
    if (w.t === 'wrap') { const f = Math.min(1, (S.t - w.since) / 8), from = L.OUTFEED(w.from, 1); out.x = from.x + (L.WRAPPER.x - from.x) * f; out.z = from.z + (L.WRAPPER.z - from.z) * f; out.y = 0.18; out.yaw = Math.PI / 2 + S.wrapper.angle; return true; }
    if (w.t === 'pd') { const q = L.PD[w.i]; out.x = q.x; out.z = q.z; return true; }
    if (w.t === 'rack') { const s = L.SLOTS[w.slot]; out.x = s.x; out.z = s.z; out.y = s.y; out.yaw = 0; return true; }
    if (w.t === 'box') { const tr = S.trucks[w.truck]; if (tr.state === 'away') return false; const q = L.boxPos(w.truck, Math.floor(w.k / 2)); out.x = q.x + tr.offset; out.z = q.z; out.y = (w.k % 2) * 1.22; return true; }
    if (w.t === 'carried') { const v = this.views[w.by]; out.x = v.g.position.x + Math.sin(v.yaw) * 1.95; out.z = v.g.position.z + Math.cos(v.yaw) * 1.95; out.y = v.a.pose.lift; out.yaw = v.yaw; return true; }
    return false;
  }
  sync(dt, cam, speed = 1) {
    const S = this.sim, m = this.tmp, q = this.q, s = this.s, v3 = this.v, P = {};
    // tankers: the truck follows its path; the trailer follows the same path 10 m behind
    const live = new Map(S.tankers.filter(k => k.path && !(k.loc && k.loc.t === 'off')).map(k => [k.id, k]));
    for (const v of this.tankerViews) if (v.id != null && !live.has(v.id)) { v.id = null; v.truck.visible = v.trailer.visible = false; }
    for (const k of live.values()) {
      let v = this.tankerViews.find(x => x.id === k.id); if (!v) { v = this.tankerViews.find(x => x.id == null); if (!v) continue; v.id = k.id; v.yaw = k.pose.yaw; v.tyaw = k.pose.yaw; }
      v.truck.visible = v.trailer.visible = true; v.truck.position.set(k.pose.x, 0, k.pose.z);
      let d = k.pose.yaw - v.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); v.yaw += Math.sign(d) * Math.min(Math.abs(d), 1.6 * dt * speed + 0.02); v.truck.rotation.y = v.yaw;
      const b = k.path.back(k.pose.s ?? 0, L.TANKER.gap, {}); v.trailer.position.set(b.x, 0, b.z);
      let d2 = b.yaw - v.tyaw; d2 = Math.atan2(Math.sin(d2), Math.cos(d2)); v.tyaw += Math.sign(d2) * Math.min(Math.abs(d2), 1.2 * dt * speed + 0.02); v.trailer.rotation.y = v.tyaw;
    }
    // drivers walking between the cab and the hose
    let di = 0;
    for (const k of S.tankers) { if (!k.drv || di >= this.drivers.length) continue; const p = this.drivers[di++], pt = k.drv.path.sample(S.t - k.drv.t0, {});
      p.visible = true; p.position.set(pt.x, 0, pt.z); p.rotation.y = pt.moving ? pt.yaw : -Math.PI / 2; animatePerson(p, pt.moving, dt * speed, 1.2, pt.moving ? 'walk' : 'work'); }
    for (; di < this.drivers.length; di++) this.drivers[di].visible = false;
    // silo gauges (filled lowest silo first), dryer steam
    const lit = S.silo.L / S.silo.cap * L.SILOS.length;
    this.gauges.forEach((g, i) => { const f = Math.max(0.001, Math.min(1, lit - i)); g.scale.y = f * (L.SILOS[i].h - 1.6); });
    this.steamMat.uniforms.uT.value += dt * Math.max(0.3, Math.min(speed, 6)); this.steamMat.uniforms.uRate.value += ((S.dryer.rate / 30) - this.steamMat.uniforms.uRate.value) * Math.min(1, dt * 0.8);
    this.steamMat.uniforms.uScale.value = innerHeight * 0.9;
    // forklifts and people
    for (const v of this.views) {
      const a = v.a, pose = a.pose; v.g.position.set(pose.x, 0, pose.z);
      let d = pose.yaw - v.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); v.yaw += Math.sign(d) * Math.min(Math.abs(d), (a.kind === 'forklift' ? 3.2 : 7) * dt * Math.max(1, speed * 0.5)); v.g.rotation.y = v.yaw;
      if (v.carriage) v.carriage.position.y = v.carriage0 + (pose.lift || 0);
      if (v.mast) v.mast.position.y = v.mast0 + (pose.lift || 0) * 0.5;
      if (v.beacon) v.beacon.material.emissiveIntensity = a.active && (pose.moving || (a.job !== 'idle' && a.job !== 'park')) ? (Math.sin(performance.now() / 160) > 0 ? 7 : 0.4) : 0;
      if (a.kind !== 'forklift') { const busy = !pose.moving && (pose.tag === 'sample' || pose.tag === 'check' || pose.tag === 'work'); animatePerson(v.person, pose.moving, dt * speed, 1.2, busy ? 'work' : pose.moving ? 'walk' : 'stand'); }
      else animatePerson(v.person, false, dt, 1, 'seated');
    }
    // pallets and their loads, film, labels
    let n = 0, nf = 0, nl = 0;
    const put = (x, y, z, yaw, bags, wrapped, labelled, frac = 1) => {
      if (n >= this.pallets.cap) return;
      q.setFromAxisAngle(up, yaw + Math.PI / 2); v3.set(x, y, z); m.compose(v3, q, s.set(1, 1, 1)); this.pallets.set(n, m);
      const layers = Math.ceil(bags / L.LAYER), h = Math.max(0.001, layers * L.BAG.h);
      q.setFromAxisAngle(up, yaw); v3.set(x, y + L.PALLET.h, z); s.set(bags ? 1.18 : 0, h, bags ? 1.0 : 0); m.compose(v3, q, s); this.loads.set(n, m);
      if (bags && (wrapped || frac < 1)) { s.set(1.22, h * frac + 0.03, 1.04); v3.set(x, y + L.PALLET.h - 0.02, z); m.compose(v3, q, s); this.film.set(nf++, m); }
      if (labelled) { const ca = Math.cos(yaw), sa = Math.sin(yaw); v3.set(x + sa * 0.61, y + L.PALLET.h + h * 0.6, z + ca * 0.61); m.compose(v3, q, s.set(1, 1, 1)); this.labels.set(nl++, m); }
      n++;
    };
    for (const p of S.pallets.values()) { if (!this.palletAt(p, P)) continue;
      const frac = p.where.t === 'wrap' && S.wrapper.state === 'wrap' ? S.wrapper.prog : 1; put(P.x, P.y, P.z, P.yaw, p.bags, p.wrapped, p.labelled, frac); }
    this.pallets.commit(n); this.loads.commit(n); this.film.commit(nf); this.labels.commit(nl);
    // bags on the belts, and the one in the palletiser's gripper
    let nb = 0; const top = this.beltTop;
    for (const l of S.lines) { const z = L.LINES[l.i].z;
      for (const b of l.bags) { v3.set(L.BELT.x0 + b, top, z); q.setFromAxisAngle(up, 0); m.compose(v3, q, s.set(1, 1, 1)); this.bags.set(nb++, m); }
      const pv = this.pal[l.i]; const busy = l.busy > 0 ? 1 - l.busy / 4.5 : 0;
      // the gripper picks at the belt end, travels over the pallet and lowers the bag onto its place in the layer pattern
      const k = l.pal ? l.pal.bags % L.LAYER : 0, slotZ = (k - 2) * 0.43, endX = L.BELT.x1 - L.PALLETISER_X;
      const tx = busy < 0.5 ? endX * (1 - busy * 2) + 0 : 0, tz = busy < 0.5 ? slotZ * busy * 2 : slotZ;
      pv.beam.position.x = L.PALLETISER_X + (busy ? tx : endX); pv.head.position.z = busy ? tz : 0;
      if (busy > 0 && busy < 0.92) { v3.set(pv.beam.position.x, 4.0 - 0.75 - L.BAG.h - (busy > 0.5 ? (busy - 0.5) * 2 * 1.4 : 0), z + pv.head.position.z); m.compose(v3, q, s.set(1, 1, 1)); this.bags.set(nb++, m); }
    }
    this.bags.commit(nb);
    // wrapper turntable and film carriage
    this.wrap.table.rotation.y = S.wrapper.angle; const wp = S.wrapper.state === 'wrap' ? S.wrapper.prog : 0, up01 = wp < 0.5 ? wp * 2 : 2 - wp * 2;
    this.wrap.car.position.y = 0.6 + up01 * 1.2;
    // container trucks
    S.trucks.forEach((tr, i) => { const g = this.trucks[i]; g.visible = tr.state !== 'away'; g.position.x = L.BOX.x0 + tr.offset; });
    // see-through walls: hide the upper wall between the camera and the floor
    const H = L.HALL;
    for (const w of this.walls) { const nrm = w.userData.normal; let outside;
      if (nrm.z < 0) outside = cam.z < H.z0; else if (nrm.z > 0) outside = cam.z > H.z1; else if (nrm.x < 0) outside = cam.x < H.x0; else outside = cam.x > H.x1;
      w.userData.upper.visible = !outside; }
  }
}
