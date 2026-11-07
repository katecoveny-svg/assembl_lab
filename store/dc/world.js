// The 3D world: the building, the SimReady equipment, and a sync() that draws the model's state every frame.
// Equipment, pallets, cartons, totes, racking, conveyor, forklifts, order pickers, pallet jacks, dock gates, label
// printer, carts and safety kit are NVIDIA SimReady models (CC BY 4.0, web copies from codepawl/simready-glb,
// simplified for the browser). The shell, trucks, wrappers and people are simple models made for this page.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as L from './layout.js';

const BASE = '/assets/models/simready/';
export const ASSET_FILES = { // bytes, for the progress bar
  rack: 247028, pallet: 69648, forklift: 959684, orderpicker: 859120, palletjack: 215596, conveyor: 287584,
  dockgate: 68180, railguard: 13788, machineguard: 33428, cart: 135640, printer: 96552, extinguisher: 117424,
  firstaid: 63988, tote: 14328, carton: 18268,
};
export const TEX_FILES = ['floor_albedo', 'floor_orm', 'floor_normal', 'carton_albedo', 'carton_normal', 'carton_orm', 'panel_albedo', 'panel_orm', 'panel_normal'];

const C = { // world colours: realistic materials, not brand colours (the brand lives in the overlays)
  wall: 0xd7d3cc, plinth: 0x8f8a84, steel: 0x56616b, roof: 0x9a9690, door: 0xb9bec3, rubber: 0x1c1c1e,
  vest: 0xd8cf3c, vest2: 0xe07a2a, trouser: 0x2b2f36, shirt: 0x3b4149, yard: 0x3b3a39, truck: 0xd9d6cf,
};

// ── helpers ──────────────────────────────────────────────────────────────────────────────────────────────────────
function std(o) { return new THREE.MeshStandardMaterial(o); }
function box(w, h, d, mat, x = 0, y = 0, z = 0, parent) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; if (parent) parent.add(m); return m; }

// Merge a group's meshes into one mesh per material (fewer draw calls). deep=false takes only direct children.
function bake(group, { deep = true, cast = false, receive = true, skip = null } = {}) {
  group.updateMatrixWorld(true);
  const inv = group.matrixWorld.clone().invert(), buckets = new Map(), gone = [];
  const visit = o => {
    if (o !== group && skip && skip(o)) return;
    if (o.isMesh && !o.isInstancedMesh && o !== group) {
      const g = o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
      if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);
      if (!buckets.has(o.material)) buckets.set(o.material, []); buckets.get(o.material).push(g); gone.push(o);
    }
    if (deep || o === group) for (const c of [...o.children]) visit(c);
  };
  visit(group);
  for (const o of gone) o.parent.remove(o);
  for (const [mat, list] of buckets) { const m = new THREE.Mesh(mergeGeometries(list), mat); m.castShadow = cast; m.receiveShadow = receive; group.add(m); }
  return group;
}
// A shadow-only stand-in: every mesh under src merged into one position-only geometry on layer 1, which only the
// sun's shadow camera renders. A SimReady forklift then casts its shadow in one draw instead of thirty-six.
const SHADOW_LAYER = 1, shadowMat = new THREE.MeshBasicMaterial();
function shadowProxy(src) {
  src.updateMatrixWorld(true); const inv = src.matrixWorld.clone().invert(), list = [], v = new THREE.Vector3();
  src.traverse(o => {
    if (!o.isMesh) return; const a = o.geometry.attributes.position, M = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    const pos = new Float32Array(a.count * 3); for (let i = 0; i < a.count; i++) { v.fromBufferAttribute(a, i).applyMatrix4(M); pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex(o.geometry.index ? Array.from(o.geometry.index.array) : [...Array(a.count).keys()]); list.push(g);
  });
  if (!list.length) return null;
  const m = new THREE.Mesh(mergeGeometries(list), shadowMat); m.castShadow = true; m.receiveShadow = false; m.layers.set(SHADOW_LAYER); m.frustumCulled = false;
  return m;
}
export { SHADOW_LAYER };

// An instanced copy of a GLB: one InstancedMesh per primitive, each carrying its local transform.
class Instanced {
  constructor(src, cap, { cast = true, receive = true } = {}) {
    this.parts = []; this.cap = cap; this.n = 0;
    src.updateMatrixWorld(true);
    src.traverse(o => {
      if (!o.isMesh) return;
      const im = new THREE.InstancedMesh(o.geometry, o.material, cap);
      im.castShadow = cast; im.receiveShadow = receive; im.frustumCulled = false; im.count = 0;
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.parts.push({ im, local: o.matrixWorld.clone() });
    });
    this.m = new THREE.Matrix4();
  }
  addTo(parent) { for (const p of this.parts) parent.add(p.im); return this; }
  set(i, mat) { for (const p of this.parts) { this.m.multiplyMatrices(mat, p.local); p.im.setMatrixAt(i, this.m); } }
  commit(n) { this.n = n; for (const p of this.parts) { p.im.count = n; p.im.instanceMatrix.needsUpdate = true; } }
  set visible(v) { for (const p of this.parts) p.im.visible = v; }
}

// Cartons: a unit box whose UVs follow its real size, so the SimReady carton texture tiles as a stack of cartons
// however tall the load is, in one draw call for every load in the building.
function cartonMaterial(tex) {
  const m = std({ map: tex.carton_albedo, normalMap: tex.carton_normal, roughnessMap: tex.carton_orm, aoMap: null, roughness: 1, metalness: 0, color: 0xffffff });
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>
      #ifdef USE_INSTANCING
        vec3 sc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
      #else
        vec3 sc = vec3(1.0);
      #endif
      vec3 pp = position * sc; vec2 suv;
      if (abs(normal.x) > 0.5) suv = vec2(pp.z, pp.y); else if (abs(normal.z) > 0.5) suv = vec2(pp.x, pp.y); else suv = vec2(pp.x, pp.z);
      suv = suv / vec2(0.82, 0.38);
      #ifdef USE_MAP
        vMapUv = suv;
      #endif
      #ifdef USE_NORMALMAP
        vNormalMapUv = suv;
      #endif
      #ifdef USE_ROUGHNESSMAP
        vRoughnessMapUv = suv;
      #endif`);
  };
  return m;
}

// A plain person: a figure in hi-vis, enough to read as a worker at DC scale. Not a likeness of anyone.
// Body, legs and arms are each one vertex-coloured mesh, so a person costs five draws.
const SKIN = [0xc79f86, 0x9c6f55, 0xe0bfa6, 0x6e4c3a, 0xb98a6b];
const personMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.02 });
function tinted(geo, color, m) { const g = geo.clone(); if (m) g.applyMatrix4(m); const c = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k); return g; }
const M4 = (x, y, z, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sx, sy, sz));
const PG = { torso: new THREE.CapsuleGeometry(0.17, 0.36, 4, 10), ring: new THREE.CylinderGeometry(0.192, 0.192, 0.05, 14, 1, true), head: new THREE.SphereGeometry(0.105, 14, 10),
  hair: new THREE.SphereGeometry(0.11, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), hips: new THREE.CapsuleGeometry(0.15, 0.08, 4, 10), leg: new THREE.CapsuleGeometry(0.068, 0.72, 3, 8),
  arm: new THREE.CapsuleGeometry(0.05, 0.52, 3, 8), boot: new THREE.BoxGeometry(0.11, 0.08, 0.24), hand: new THREE.SphereGeometry(0.045, 8, 6) };
function makePerson(i, vest = C.vest) {
  const g = new THREE.Group(); g.name = 'person';
  const skin = SKIN[i % SKIN.length];
  const body = new THREE.Mesh(mergeGeometries([
    tinted(PG.torso, vest, M4(0, 1.2, 0, 1.12, 1, 0.72)), tinted(PG.ring, 0xd9d9d9, M4(0, 1.08, 0, 1.12, 1, 0.72)),
    tinted(PG.head, skin, M4(0, 1.62, 0)), tinted(PG.hair, 0x241c18, M4(0, 1.635, 0)), tinted(PG.hips, C.trouser, M4(0, 0.92, 0, 1.15, 1, 0.75)),
  ]), personMat);
  body.castShadow = true; g.add(body);
  const legGeo = mergeGeometries([tinted(PG.leg, C.trouser, M4(0, -0.428, 0)), tinted(PG.boot, 0x1a1a1a, M4(0, -0.86, 0.04))]);
  const armGeo = mergeGeometries([tinted(PG.arm, C.shirt, M4(0, -0.31, 0)), tinted(PG.hand, skin, M4(0, -0.62, 0))]);
  const limb = (geo, x, y) => { const pivot = new THREE.Group(); pivot.position.set(x, y, 0); const m = new THREE.Mesh(geo, personMat); pivot.add(m); g.add(pivot); return pivot; };
  const legL = limb(legGeo, -0.09, 0.9), legR = limb(legGeo, 0.09, 0.9), armL = limb(armGeo, -0.235, 1.43), armR = limb(armGeo, 0.235, 1.43);
  g.userData = { legL, legR, armL, armR, phase: Math.random() * 6 };
  return g;
}
function animatePerson(p, moving, dt, speed = 1.2, pose = 'walk') {
  const u = p.userData;
  if (pose === 'seated') { u.legL.rotation.x = u.legR.rotation.x = -1.45; u.armL.rotation.x = u.armR.rotation.x = -0.9; return; }
  if (pose === 'push') { u.armL.rotation.x = u.armR.rotation.x = -1.05; }
  if (moving) u.phase += dt * speed * 5.2;
  const s = moving ? Math.sin(u.phase) : 0;
  u.legL.rotation.x = s * 0.55; u.legR.rotation.x = -s * 0.55;
  if (pose === 'walk') { u.armL.rotation.x = -s * 0.45; u.armR.rotation.x = s * 0.45; }
  if (pose === 'work') { const w = Math.sin(performance.now() / 380 + u.phase) * 0.35; u.armL.rotation.x = -0.9 + w; u.armR.rotation.x = -0.75 - w; }
  if (pose === 'carry') { u.armL.rotation.x = u.armR.rotation.x = -0.95; }
}

// ── the world ────────────────────────────────────────────────────────────────────────────────────────────────────
export class World {
  constructor(scene, assets, tex, sim, quality) {
    this.scene = scene; this.A = assets; this.tex = tex; this.sim = sim; this.q = quality;
    this.root = new THREE.Group(); scene.add(this.root);
    this.walls = []; this.roof = new THREE.Group(); this.tmp = new THREE.Matrix4(); this.q4 = new THREE.Quaternion(); this.v3 = new THREE.Vector3(); this.s3 = new THREE.Vector3(1, 1, 1);
    this.buildShell(); this.buildMarkings(); this.buildRacks(); this.buildDocks(); this.buildTrucks(); this.buildLine(); this.buildProps();
    this.buildPools(); this.buildAgents();
  }

  // ── building shell ─────────────────────────────────────────────────────────────────────────────────────────────
  buildShell() {
    const H = L.HALL, W = H.x1 - H.x0, D = H.z1 - H.z0, t = this.tex;
    const rep = (tx, x, y) => { const c = tx.clone(); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(x, y); c.needsUpdate = true; return c; };
    // slab and floor: SimReady concrete textures, tiled every 6 m
    const floorMat = std({ map: rep(t.floor_albedo, W / 6, D / 6), roughnessMap: rep(t.floor_orm, W / 9, D / 9), normalMap: rep(t.floor_normal, W / 6, D / 6),
      normalScale: new THREE.Vector2(0.35, 0.35), color: 0xf2efea, roughness: 1.0, metalness: 0 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat); floor.rotation.x = -Math.PI / 2; floor.position.set((H.x0 + H.x1) / 2, 0, (H.z0 + H.z1) / 2); floor.receiveShadow = true; this.root.add(floor);
    const slabMat = std({ color: 0x8c8781, roughness: 0.95, map: rep(t.floor_albedo, 12, 1) });
    box(W + 0.6, 1.2, D + 0.6, slabMat, floor.position.x, -0.605, floor.position.z, this.root).receiveShadow = true;
    // yard
    const yard = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), std({ color: C.yard, roughness: 0.96 })); yard.rotation.x = -Math.PI / 2; yard.position.set(30, -1.21, 0); yard.receiveShadow = true; this.root.add(yard);
    const court = new THREE.Mesh(new THREE.PlaneGeometry(40, D + 10), std({ color: 0x323130, roughness: 0.9 })); court.rotation.x = -Math.PI / 2; court.position.set(H.x1 + 20, -1.2, 0); court.receiveShadow = true; this.root.add(court);
    // walls: insulated panels above a concrete upstand. Each wall is its own group so the camera can see in.
    const panel = std({ map: rep(t.panel_albedo, 1, 1), normalMap: t.panel_normal, roughnessMap: t.panel_orm, color: C.wall, roughness: 0.8, metalness: 0.15 });
    const ribs = this.ribTexture(); const panelMat = panel.clone(); panelMat.normalMap = ribs; panelMat.normalScale = new THREE.Vector2(0.8, 0.8);
    const plinth = std({ color: C.plinth, roughness: 0.95, map: rep(t.floor_albedo, 6, 1) });
    const wall = (name, len, along, pos, normal, openings = []) => {
      const g = new THREE.Group(); g.name = name; g.userData.normal = normal; this.root.add(g);
      const upper = new THREE.Group(); g.add(upper); g.userData.upper = upper;
      // segments between openings
      const cuts = [[-len / 2, len / 2]];
      const segs = []; let a = -len / 2; for (const o of openings.sort((p, q) => p.c - q.c)) { segs.push([a, o.c - o.w / 2]); a = o.c + o.w / 2; } segs.push([a, len / 2]);
      const mk = (u0, u1, y0, y1, mat, grp) => {
        const l = u1 - u0; if (l <= 0.01) return; const geo = new THREE.BoxGeometry(along === 'x' ? l : 0.16, y1 - y0, along === 'x' ? 0.16 : l);
        const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * l / 1.0, uv.getY(i) * (y1 - y0) / 1.0);
        const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; m.castShadow = false;
        const c = (u0 + u1) / 2; m.position.set(along === 'x' ? pos.x + c : pos.x, (y0 + y1) / 2, along === 'x' ? pos.z : pos.z + c); grp.add(m);
      };
      for (const [u0, u1] of segs) { mk(u0, u1, 0, 1.2, plinth, g); mk(u0, u1, 1.2, H.h, panelMat, upper); }
      for (const o of openings) mk(o.c - o.w / 2, o.c + o.w / 2, o.h, H.h, panelMat, upper);
      this.walls.push(g); return g;
    };
    const bakeWalls = () => { for (const g of this.walls) { bake(g, { deep: false }); bake(g.userData.upper, { deep: false }); } 
    };
    wall('north', W, 'x', { x: (H.x0 + H.x1) / 2, z: H.z0 }, { x: 0, z: -1 });
    wall('south', W, 'x', { x: (H.x0 + H.x1) / 2, z: H.z1 }, { x: 0, z: 1 });
    wall('west', D, 'z', { x: H.x0, z: (H.z0 + H.z1) / 2 }, { x: -1, z: 0 });
    const doors = [...L.INBOUND_DOORS, ...L.ROUTES].map(d => ({ c: d.z - (H.z0 + H.z1) / 2, w: L.DOOR.w, h: L.DOOR.h }));
    this.eastWall = wall('east', D, 'z', { x: H.x1, z: (H.z0 + H.z1) / 2 }, { x: 1, z: 0 }, doors);
    // portal frames: columns every 8 m along the long walls, rafters under the roof
    const steel = std({ color: C.steel, roughness: 0.55, metalness: 0.55 });
    const colGeo = new THREE.BoxGeometry(0.36, H.h, 0.5);
    for (let x = H.x0 + 4; x < H.x1; x += 8) for (const z of [H.z0 + 0.35, H.z1 - 0.35]) {
      const m = new THREE.Mesh(colGeo, steel); m.position.set(x, H.h / 2, z); m.castShadow = m.receiveShadow = true;
      (z < 0 ? this.walls[0] : this.walls[1]).userData.upper.add(m);
      const raf = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, D), steel); raf.position.set(x, H.h + 0.05, (H.z0 + H.z1) / 2);
      if (z < 0) this.roof.add(raf);
    }
    bakeWalls();
    // roof: underside with purlins and two skylight strips, plus high-bay LED fittings (bloom only on these)
    const roofMat = std({ color: C.roof, roughness: 0.9, metalness: 0.2, side: THREE.DoubleSide });
    const roof = new THREE.Mesh(new THREE.PlaneGeometry(W, D), roofMat); roof.rotation.x = Math.PI / 2; roof.position.set(floor.position.x, H.h + 0.45, floor.position.z); this.roof.add(roof);
    const purlin = new THREE.InstancedMesh(new THREE.BoxGeometry(W, 0.18, 0.1), steel, Math.floor(D / 1.8)); let k = 0;
    for (let z = H.z0 + 1; z < H.z1; z += 1.8) { this.tmp.makeTranslation(floor.position.x, H.h + 0.3, z); purlin.setMatrixAt(k++, this.tmp); } purlin.count = k; this.roof.add(purlin);
    const sky = std({ color: 0xffffff, emissive: 0xf4f1ea, emissiveIntensity: 3.2, roughness: 1 });
    for (const z of [-8, 8]) { const s = new THREE.Mesh(new THREE.PlaneGeometry(W - 8, 1.4), sky); s.rotation.x = Math.PI / 2; s.position.set(floor.position.x, H.h + 0.43, z); this.roof.add(s); }
    const housing = std({ color: 0x9aa0a6, roughness: 0.4, metalness: 0.7 });
    const lens = std({ color: 0xffffff, emissive: 0xfff6e8, emissiveIntensity: 9, roughness: 0.3 });
    const nL = 11 * 6, hb = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.28, 0.36, 0.32, 18), housing, nL), hl = new THREE.InstancedMesh(new THREE.CircleGeometry(0.31, 18), lens, nL);
    const cable = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.008, 0.008, 1.4, 4), housing, nL);
    let n = 0; const rot = new THREE.Matrix4().makeRotationX(Math.PI / 2);
    for (let i = 0; i < 11; i++) for (let j = 0; j < 6; j++) {
      const x = H.x0 + 4 + i * 6.4, z = H.z0 + 4 + j * 6.4, y = 9.4;
      this.tmp.makeTranslation(x, y, z); hb.setMatrixAt(n, this.tmp);
      this.tmp.makeTranslation(x, y + 0.86, z); cable.setMatrixAt(n, this.tmp);
      this.tmp.makeTranslation(x, y - 0.165, z).multiply(rot); hl.setMatrixAt(n, this.tmp); n++;
    }
    this.roof.add(hb, hl, cable); bake(this.roof, { deep: false }); this.root.add(this.roof);
  }
  ribTexture() { // vertical ribs of an insulated wall panel, as a small normal map
    const c = document.createElement('canvas'); c.width = 64; c.height = 4; const g = c.getContext('2d');
    for (let x = 0; x < 64; x++) { const s = Math.sin(x / 64 * Math.PI * 2 * 4); const r = 128 + s * 60; g.fillStyle = `rgb(${r|0},128,255)`; g.fillRect(x, 0, 1, 4); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 1); return t;
  }

  // ── floor markings: walkways, lanes, door hatching, zone names ─────────────────────────────────────────────────
  buildMarkings() {
    const H = L.HALL, W = H.x1 - H.x0, D = H.z1 - H.z0, PX = this.q.tier === 'low' ? 28 : 48;
    const c = document.createElement('canvas'); c.width = W * PX; c.height = D * PX; const g = c.getContext('2d');
    const X = x => (x - H.x0) * PX, Z = z => (z - H.z0) * PX;
    const line = (x0, z0, x1, z1, w, col) => { g.strokeStyle = col; g.lineWidth = w * PX; g.beginPath(); g.moveTo(X(x0), Z(z0)); g.lineTo(X(x1), Z(z1)); g.stroke(); };
    const rect = (x0, z0, x1, z1, w, col) => { g.strokeStyle = col; g.lineWidth = w * PX; g.strokeRect(X(x0), Z(z0), (x1 - x0) * PX, (z1 - z0) * PX); };
    const hatch = (x0, z0, x1, z1, col) => { g.save(); g.beginPath(); g.rect(X(x0), Z(z0), (x1 - x0) * PX, (z1 - z0) * PX); g.clip(); g.strokeStyle = col; g.lineWidth = 0.12 * PX; for (let s = -40; s < 40; s += 0.6) { g.beginPath(); g.moveTo(X(x0 + s), Z(z0)); g.lineTo(X(x0 + s + (z1 - z0)), Z(z1)); g.stroke(); } g.restore(); rect(x0, z0, x1, z1, 0.1, col); };
    const text = (s, x, z, size, col, rot = 0) => { g.save(); g.translate(X(x), Z(z)); g.rotate(rot); g.fillStyle = col; g.font = `600 ${size * PX}px "Instrument Sans", system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, 0, 0); g.restore(); };
    const Y = 'rgba(226,182,40,0.92)', Wt = 'rgba(240,238,232,0.85)', G = 'rgba(46,140,96,0.85)';
    // pedestrian walkway along the south wall and across to the amenities door
    line(H.x0 + 0.5, H.z1 - 1.0, H.x1 - 0.5, H.z1 - 1.0, 0.1, Y); line(H.x0 + 0.5, H.z1 - 2.4, 13.5, H.z1 - 2.4, 0.1, Y);
    // rack aisle ends
    for (const a of L.AISLES.slice(0, 3)) { line(L.AISLE_ENTRY_X + 0.3, a - 1.55, L.AISLE_ENTRY_X + 0.3, a + 1.55, 0.12, Y); }
    // racking footprint edge lines
    for (const r of L.ROWS) rect(L.RACK.x0, r.z - L.RACK.depth / 2, L.RACK.x0 + L.RACK.bays * L.RACK.bayW, r.z + L.RACK.depth / 2, 0.06, Y);
    // dispatch and inbound lanes
    const lanes = [...L.INBOUND_DOORS.map(d => ({ z: d.z, name: `IN ${d.id}` })), ...L.ROUTES.map(r => ({ z: r.z, name: `${r.door} ${r.name.toUpperCase()}` }))];
    for (const ln of lanes) {
      const x1 = L.LANE.x1 + 0.6, x0 = L.LANE.x1 - 5 * L.LANE.pitch - 0.65;
      rect(x0, ln.z - 1.3, x1, ln.z + 1.3, 0.08, Wt); line(x0, ln.z, x1, ln.z, 0.04, Wt);
      for (let i = 1; i < 6; i++) { const x = L.LANE.x1 + 0.65 - i * L.LANE.pitch; line(x, ln.z - 1.3, x, ln.z + 1.3, 0.03, Wt); }
      text(ln.name, x0 - 1.6, ln.z, 0.55, Wt, -Math.PI / 2);
      hatch(L.DOOR_X - 2.6, ln.z - 1.55, L.DOOR_X - 0.1, ln.z + 1.55, Y); // dock leveller apron
    }
    // wrap stations and the tote line
    for (const w of L.WRAPPERS) { g.strokeStyle = Y; g.lineWidth = 0.08 * PX; g.beginPath(); g.arc(X(w.x), Z(w.z), 1.45 * PX, 0, Math.PI * 2); g.stroke(); }
    rect(-1.5, 10.2, 3.6 + 2.6, 16.6, 0.07, Wt); text('WRAP QUEUE', 1.0, 9.6, 0.5, Wt);
    rect(L.TOTE_LINE.x0 - 0.3, L.TOTE_LINE.z - 0.8, L.TOTE_LINE.x1 + 0.3, L.TOTE_LINE.z + 0.8, 0.06, Y);
    rect(L.TOTE_PALLET.x - 0.9, L.TOTE_PALLET.z - 0.9, L.TOTE_PALLET.x + 0.9, L.TOTE_PALLET.z + 0.9, 0.07, Wt);
    // block stack, chargers, receiving
    rect(L.BLOCK.x0 - 0.6, L.BLOCK.z0 - 0.8, L.BLOCK.x0 + L.BLOCK.cols * L.BLOCK.dx, L.BLOCK.z0 + L.BLOCK.rows * L.BLOCK.dz - 0.4, 0.07, Wt);
    for (let i = 0; i < 3; i++) { const p = L.CHARGE(i); rect(p.x - 0.9, p.z - 2.0, p.x + 0.9, p.z + 1.6, 0.06, G); }
    rect(L.RECEIVE_DESK.x - 1.0, L.RECEIVE_DESK.z - 1.0, L.RECEIVE_DESK.x + 1.8, L.RECEIVE_DESK.z + 1.4, 0.06, Wt);
    // zebra crossing from the walkway to the wrap area
    for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(240,238,232,0.8)'; g.fillRect(X(14.2 + i * 0.6), Z(H.z1 - 2.4), 0.32 * PX, -3.0 * PX); }
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
    const mat = std({ map: tx, transparent: true, roughness: 0.55, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(W, D), mat); m.rotation.x = -Math.PI / 2; m.position.set((H.x0 + H.x1) / 2, 0.006, (H.z0 + H.z1) / 2); m.receiveShadow = true; m.renderOrder = 1;
    this.root.add(m);
  }

  // ── racking ────────────────────────────────────────────────────────────────────────────────────────────────────
  buildRacks() {
    const n = L.ROWS.length * L.RACK.bays * 2; const rk = new Instanced(this.A.rack, n).addTo(this.root);
    let i = 0;
    for (const r of L.ROWS) for (let b = 0; b < L.RACK.bays; b++) for (let tier = 0; tier < 2; tier++) {
      this.tmp.makeTranslation(L.bayX(b), tier * L.RACK.tierH, r.z); rk.set(i++, this.tmp);
    }
    rk.commit(i);
    // end-of-row barriers and upright guards (SimReady rail_guard_a09, machineGuard_a01)
    const rg = new Instanced(this.A.railguard, L.ROWS.length).addTo(this.root), mg = new Instanced(this.A.machineguard, L.ROWS.length * 2).addTo(this.root);
    const rotY = a => new THREE.Matrix4().makeRotationY(a);
    let j = 0, k = 0; const endX = L.RACK.x0 + L.RACK.bays * L.RACK.bayW;
    L.ROWS.forEach((r, ri) => {
      this.tmp.makeTranslation(endX + 0.35, 0, r.z).multiply(rotY(Math.PI / 2)); rg.set(j++, this.tmp);
      this.tmp.makeTranslation(endX - 0.1, 0, r.z + r.face * 0.95).multiply(rotY(r.face > 0 ? 0 : Math.PI)); mg.set(k++, this.tmp);
    });
    rg.commit(j); mg.commit(k);
  }

  // ── dock doors, levellers, shelters, safety gates ──────────────────────────────────────────────────────────────
  buildDocks() {
    const X = L.DOOR_X; this.docks = [];
    const doorMat = std({ color: C.door, roughness: 0.55, metalness: 0.35, normalMap: this.ribTextureH(), normalScale: new THREE.Vector2(0.9, 0.9) });
    const frame = std({ color: 0xd9a92e, roughness: 0.5, metalness: 0.2 }), rubber = std({ color: C.rubber, roughness: 0.92 }), plate = std({ color: 0x6b6f73, roughness: 0.42, metalness: 0.85 }), coil = std({ color: 0x8e9397, roughness: 0.5, metalness: 0.5 });
    const all = [...L.INBOUND_DOORS.map(d => ({ id: d.id, z: d.z, kind: 'in', idx: L.INBOUND_DOORS.indexOf(d) })), ...L.ROUTES.map((r, i) => ({ id: r.door, z: r.z, kind: 'out', idx: i }))];
    const outS = new THREE.Group(), inS = new THREE.Group(); this.root.add(outS); this.eastWall.userData.upper.add(inS);
    for (const d of all) {
      const g = new THREE.Group(); g.position.set(X, 0, d.z); this.root.add(g);           // moving parts, outside
      const inner = new THREE.Group(); this.eastWall.userData.upper.add(inner); inner.position.set(X, 0, d.z); // moving parts, inside
      const so = new THREE.Group(); so.position.set(X, 0, d.z); outS.add(so);             // static parts, merged below
      const si = new THREE.Group(); si.position.set(X, 0, d.z); inS.add(si);
      // roller door: a ribbed curtain that rolls up into its box above the opening
      const curtain = box(0.06, L.DOOR.h, L.DOOR.w, doorMat, -0.12, L.DOOR.h, 0, inner); curtain.castShadow = false;
      curtain.geometry.translate(0, -L.DOOR.h / 2, 0); // pivot on the top edge, so scaling y rolls it up
      box(0.5, 0.5, L.DOOR.w + 0.4, coil, -0.3, L.DOOR.h + 0.3, 0, si);
      box(0.12, L.DOOR.h, 0.14, frame, -0.12, L.DOOR.h / 2, -L.DOOR.w / 2 - 0.05, si); box(0.12, L.DOOR.h, 0.14, frame, -0.12, L.DOOR.h / 2, L.DOOR.w / 2 + 0.05, si);
      // outside: shelter pads and bumpers; inside: the leveller plate
      box(0.45, 3.5, 0.35, rubber, 0.3, 1.75, -L.DOOR.w / 2 - 0.2, so); box(0.45, 3.5, 0.35, rubber, 0.3, 1.75, L.DOOR.w / 2 + 0.2, so); box(0.45, 0.5, L.DOOR.w + 0.75, rubber, 0.3, 3.45, 0, so);
      box(0.2, 0.35, 0.3, rubber, 0.12, -0.25, -0.9, so); box(0.2, 0.35, 0.3, rubber, 0.12, -0.25, 0.9, so);
      box(2.4, 0.04, 2.1, plate, -1.2, 0.012, 0, so);
      const lip = box(0.5, 0.03, 2.0, plate, 0.25, 0.0, 0, g); lip.castShadow = false;
      // SimReady safety dock gate, swung across the opening when the door is shut
      const gate = this.A.dockgate.clone(); gate.position.set(-0.75, 0, -1.55); gate.traverse(o => { if (o.isMesh) o.castShadow = false; }); g.add(gate);
      this.docks.push({ ...d, g, curtain, lip, gate });
    }
    bake(outS, { cast: false }); bake(inS, { cast: false });
  }
  ribTextureH() {
    const c = document.createElement('canvas'); c.width = 4; c.height = 64; const g = c.getContext('2d');
    for (let y = 0; y < 64; y++) { const s = Math.sin(y / 64 * Math.PI * 2); const v = 128 + s * 70; g.fillStyle = `rgb(128,${v|0},255)`; g.fillRect(0, y, 4, 1); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 6); return t;
  }

  // ── trucks: plain rigid trucks, no livery ──────────────────────────────────────────────────────────────────────
  buildTrucks() {
    this.trucks = [];
    const T = L.TRAILER;
    const body = std({ color: C.truck, roughness: 0.5, metalness: 0.2, normalMap: this.ribTexture(), normalScale: new THREE.Vector2(0.5, 0.5), side: THREE.DoubleSide });
    const ply = std({ color: 0x8a6d4c, roughness: 0.85 });
    const chassis = std({ color: 0x232527, roughness: 0.6, metalness: 0.5 }), tyre = std({ color: 0x161616, roughness: 0.9 });
    const glass = std({ color: 0x1d2a33, roughness: 0.08, metalness: 0.8 });
    const cabs = [0xe9e6df, 0x7d8388, 0x3f4549, 0xe9e6df, 0x9aa1a5, 0x2f3437];
    const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.32, 20); wheelGeo.rotateX(Math.PI / 2);
    const mk = (z, i) => {
      const g = new THREE.Group(); g.position.set(T.x0, 0, z); this.root.add(g);
      const L0 = T.len, Wd = T.w, Ht = T.h;
      // box body open at the dock end (x = 0)
      box(L0, 0.08, Wd, ply, L0 / 2, -0.04, 0, g);
      box(L0, Ht, 0.05, body, L0 / 2, Ht / 2, -Wd / 2, g); box(L0, Ht, 0.05, body, L0 / 2, Ht / 2, Wd / 2, g);
      box(L0, 0.06, Wd, body, L0 / 2, Ht, 0, g); box(0.06, Ht, Wd, body, L0, Ht / 2, 0, g);
      box(L0 + 1.0, 0.3, 1.0, chassis, L0 / 2 + 0.6, -0.35, 0, g);
      // cab
      const cab = new THREE.Group(); cab.position.set(L0 + 0.25, 0, 0); g.add(cab);
      const cm = std({ color: cabs[i % cabs.length], roughness: 0.4, metalness: 0.3 });
      box(2.1, 2.3, 2.42, cm, 1.05, 0.55, 0, cab); box(0.05, 0.9, 2.1, glass, 2.11, 1.2, 0, cab); box(0.6, 0.6, 2.3, chassis, 2.15, -0.45, 0, cab);
      for (const wx of [1.5, 2.6, L0 + 1.55]) for (const sd of [-1, 1]) { const w = new THREE.Mesh(wheelGeo, tyre); w.position.set(wx, -0.7, sd * 1.02); g.add(w); }
      return bake(g, { cast: true });
    };
    this.sim.inTrucks.forEach((tr, i) => this.trucks.push({ tr, g: mk(tr.z, i + 3) }));
    this.sim.outTrucks.forEach((tr, i) => this.trucks.push({ tr, g: mk(tr.z, i) }));
  }

  // ── tote conveyor, wrappers, stations ──────────────────────────────────────────────────────────────────────────
  buildLine() {
    const T = L.TOTE_LINE, nseg = Math.round((T.x1 - T.x0) / T.seg);
    const cv = new Instanced(this.A.conveyor, nseg).addTo(this.root);
    const r = new THREE.Matrix4().makeRotationY(Math.PI / 2);
    for (let i = 0; i < nseg; i++) { this.tmp.makeTranslation(T.x0 + i * T.seg, 0, T.z + 0.5).multiply(r); cv.set(i, this.tmp); }
    cv.commit(nseg);
    // turntable wrappers (made for this page; SimReady has no stretch wrapper)
    this.wraps = [];
    const steel = std({ color: 0x3f474f, roughness: 0.5, metalness: 0.6 }), light = std({ color: 0xc9cdd1, roughness: 0.45, metalness: 0.3 }), accent = std({ color: 0xd9a92e, roughness: 0.5 });
    const film = std({ color: 0xffffff, roughness: 0.15, metalness: 0, transparent: true, opacity: 0.55 });
    L.WRAPPERS.forEach((w, i) => {
      const g = new THREE.Group(); g.position.set(w.x, 0, w.z); this.root.add(g);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.2, 0.08, 40), steel); base.position.y = 0.04; base.castShadow = base.receiveShadow = true; g.add(base);
      const table = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.05, 40), light); table.position.y = 0.105; table.receiveShadow = true; g.add(table);
      const s = L.WRAP_MAST(i);
      const mast = box(0.26, 2.7, 0.26, light, 0, 1.35, s * 1.65, g); box(0.7, 0.12, 0.6, steel, 0, 0.06, s * 1.65, g);
      const panel = box(0.4, 0.6, 0.18, light, 0.55, 1.25, s * 1.72, g); box(0.25, 0.04, 0.02, accent, 0.55, 1.4, s * 1.62, g);
      const carriage = new THREE.Group(); carriage.position.set(0, 0.5, s * 1.45); g.add(carriage);
      box(0.42, 0.36, 0.28, steel, 0, 0, 0, carriage);
      const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.5, 14), film); roll.position.set(0, 0, -s * 0.2); carriage.add(roll);
      bake(g, { deep: false, cast: true, skip: o => o === table });
      this.wraps.push({ g, table, carriage });
    });
    // label station and receiving desk: SimReady computer carts and barcode printers
    const place = (src, x, z, yaw = 0, y = 0) => { const o = src.clone(); o.position.set(x, y, z); o.rotation.y = yaw; o.traverse(m => { if (m.isMesh) m.castShadow = false; }); this.root.add(o); return o; };
    place(this.A.cart, 11.2, 13.4, -Math.PI / 2); place(this.A.printer, 11.2, 13.4, -Math.PI / 2, 0.95);
    place(this.A.cart, L.RECEIVE_DESK.x, L.RECEIVE_DESK.z, Math.PI); place(this.A.printer, L.RECEIVE_DESK.x, L.RECEIVE_DESK.z, Math.PI, 0.95);
    place(this.A.cart, L.TOTE_BUILD.x - 1.4, L.TOTE_BUILD.z - 1.2, Math.PI / 2);
  }

  buildProps() {
    const place = (src, x, z, yaw = 0, y = 0) => { const o = src.clone(); o.position.set(x, y, z); o.rotation.y = yaw; o.traverse(m => { if (m.isMesh) { m.castShadow = false; m.receiveShadow = true; } }); this.root.add(o); return o; };
    const spots = [[-35.2, -6, Math.PI / 2], [-35.2, 9, Math.PI / 2], [35.2, -13, -Math.PI / 2], [35.2, 7, -Math.PI / 2], [0, -19.3, 0], [-20, 19.3, Math.PI], [24, 19.3, Math.PI]];
    const ex = new Instanced(this.A.extinguisher, spots.length, { cast: false }).addTo(this.root);
    spots.forEach(([x, z, a], i) => { this.tmp.makeTranslation(x, 0, z).multiply(new THREE.Matrix4().makeRotationY(a)); ex.set(i, this.tmp); }); ex.commit(spots.length);
    place(this.A.firstaid, 12.6, 19.82, Math.PI, 1.45); place(this.A.firstaid, -35.85, 2, Math.PI / 2, 1.45);
    // chargers: plain wall-mounted units
    const ch = std({ color: 0x3a4148, roughness: 0.5, metalness: 0.4 }), chl = std({ color: 0x2e8c60, emissive: 0x2e8c60, emissiveIntensity: 5 });
    const chg = new THREE.Group(); this.root.add(chg);
    for (let i = 0; i < 3; i++) { const p = L.CHARGE(i); box(0.6, 1.0, 0.3, ch, p.x, 1.1, L.HALL.z1 - 0.3, chg); box(0.12, 0.05, 0.02, chl, p.x, 1.45, L.HALL.z1 - 0.46, chg); }
    bake(chg);
    // stack of empty pallets for the pickers
    this.emptyStack = { x: L.EMPTY_STACK.x, z: L.EMPTY_STACK.z, n: 7 };
  }

  // ── pools: pallets, loads, film, totes ─────────────────────────────────────────────────────────────────────────
  buildPools() {
    const cap = 1100;
    this.pallets = new Instanced(this.A.pallet, cap).addTo(this.root);
    const unit = new THREE.BoxGeometry(1, 1, 1); unit.translate(0, 0.5, 0);
    this.loads = new THREE.InstancedMesh(unit, cartonMaterial(this.tex), cap); this.loads.castShadow = this.loads.receiveShadow = true; this.loads.frustumCulled = false; this.loads.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.root.add(this.loads);
    const filmMat = std({ color: 0xf4f6f8, roughness: 0.1, metalness: 0.0, transparent: true, opacity: 0.16, depthWrite: false, envMapIntensity: 1.8 });
    this.film = new THREE.InstancedMesh(unit, filmMat, cap); this.film.frustumCulled = false; this.film.renderOrder = 2; this.film.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.root.add(this.film);
    this.labels = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.21, 0.15), std({ color: 0xffffff, roughness: 0.6 }), cap); this.labels.frustumCulled = false; this.labels.castShadow = false; this.root.add(this.labels);
    this.totes = new Instanced(this.A.tote, 220).addTo(this.root);
    this.cartonsLoose = new Instanced(this.A.carton, 40).addTo(this.root);
    // the block stack never changes: drinks on pallets, two high (not simulated)
    this.block = []; const B = L.BLOCK, r = this.sim.rng;
    for (let i = 0; i < B.cols; i++) for (let j = 0; j < B.rows; j++) { const h = 0.95 + ((i * 7 + j * 3) % 4) * 0.05; for (let k = 0; k < (((i + j) % 5) ? 2 : 1); k++) this.block.push({ x: B.x0 + i * B.dx, z: B.z0 + j * B.dz, y: k * (h + L.PALLET.h + 0.02), h, yaw: 0 }); }
  }

  // ── agents: SimReady vehicles plus people ──────────────────────────────────────────────────────────────────────
  buildAgents() {
    this.views = [];
    let pi = 0;
    for (const a of this.sim.agents) {
      const v = { a, g: new THREE.Group(), yaw: a.pose.yaw, person: null, vehicle: null, carriage: null, mast: null };
      this.root.add(v.g);
      if (a.kind === 'forklift' || a.kind === 'orderPicker') {
        v.vehicle = (a.kind === 'forklift' ? this.A.forklift : this.A.orderpicker).clone(); v.g.add(v.vehicle);
        v.carriage = v.vehicle.getObjectByName('carriage'); v.mast = v.vehicle.getObjectByName('mast2');
        v.carriage0 = v.carriage ? v.carriage.position.y : 0; v.mast0 = v.mast ? v.mast.position.y : 0;
        v.vehicle.traverse(o => { if (o.isMesh) o.castShadow = false; });
        for (const part of [v.vehicle.getObjectByName('body'), v.mast, v.carriage]) { if (!part) continue; const px = shadowProxy(part); if (px) part.add(px); }
        v.person = makePerson(pi++, C.vest2); v.g.add(v.person);
        if (a.kind === 'forklift') { v.person.position.set(0, 0.17, -0.22); v.person.scale.setScalar(0.96); v.pose = 'seated'; }
        else { v.person.position.set(0, 0.2, 0.55); v.pose = 'stand'; (v.carriage || v.vehicle).add(v.person); v.person.position.set(0, 0.22, 0.6); }
        // amber beacon on the overhead guard (real light, so it is allowed to bloom)
        const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), std({ color: 0xffb340, emissive: 0xff9a1f, emissiveIntensity: 0 }));
        beacon.position.set(0.32, a.kind === 'forklift' ? 2.2 : 2.95, a.kind === 'forklift' ? -0.5 : -0.3); v.g.add(beacon); v.beacon = beacon;
      } else {
        v.person = makePerson(pi++, a.kind === 'receiver' || a.kind === 'labeller' ? C.vest2 : C.vest); v.g.add(v.person);
        if (a.kind === 'picker') { v.vehicle = this.A.palletjack.clone(); v.g.add(v.vehicle); v.vehicle.traverse(o => { if (o.isMesh) o.castShadow = false; }); const px = shadowProxy(v.vehicle); if (px) v.vehicle.add(px); v.person.position.set(0, 0, -0.62); v.pose = 'push'; }
        else v.pose = 'walk';
      }
      v.g.traverse(o => { if (o.isMesh) o.receiveShadow = true; });
      this.views.push(v);
    }
  }

  // ── per frame ──────────────────────────────────────────────────────────────────────────────────────────────────
  palletWorld(p, out) { // where a pallet is now: x, y, z and heading (its 1.21 m side runs along the heading)
    const w = p.where; if (!w) return false;
    if (w.t === 'rack') { const c = this.sim.cols[w.col]; out.x = c.x; out.z = c.z; out.y = L.RACK.decks[w.level]; out.yaw = 0; return true; }
    if (w.t === 'lane') { const z = w.side === 'out' ? L.ROUTES[w.lane].z : L.INBOUND_DOORS[w.lane].z; const q = L.lanePos(z, w.i); out.x = q.x; out.z = q.z; out.y = 0; out.yaw = Math.PI / 2; return true; }
    if (w.t === 'trailer') { const tr = w.side === 'out' ? this.sim.outTrucks[w.truck] : this.sim.inTrucks[w.truck]; if (tr.state === 'away') return false; const q = L.trailerPos(tr.z, w.i); out.x = q.x + tr.offset; out.z = q.z; out.y = 0; out.yaw = Math.PI / 2; return true; }
    if (w.t === 'wrap') { const wr = this.sim.wrappers[w.w]; out.x = wr.x; out.z = wr.z; out.y = 0.13; out.yaw = Math.PI / 2 + wr.angle; return true; }
    if (w.t === 'tote') { out.x = L.TOTE_PALLET.x; out.z = L.TOTE_PALLET.z; out.y = 0; out.yaw = 0; return true; }
    if (w.t === 'carried') {
      const v = this.views[w.by], a = v.a, off = a.kind === 'forklift' ? 1.95 : a.kind === 'orderPicker' ? 1.35 : 0.86;
      out.x = v.g.position.x + Math.sin(v.yaw) * off; out.z = v.g.position.z + Math.cos(v.yaw) * off;
      out.y = a.kind === 'picker' ? 0.05 : a.pose.lift; out.yaw = v.yaw; return true;
    }
    return false;
  }

  sync(dt, cam) {
    const S = this.sim, P = {}, m = this.tmp, q = this.q4, s = this.s3, v3 = this.v3, up = new THREE.Vector3(0, 1, 0);
    // agents
    for (const v of this.views) {
      const a = v.a, pose = a.pose;
      v.g.position.set(pose.x, 0, pose.z);
      let d = pose.yaw - v.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
      const rate = (a.kind === 'forklift' || a.kind === 'orderPicker') ? 3.2 : 7; v.yaw += Math.sign(d) * Math.min(Math.abs(d), rate * dt);
      v.g.rotation.y = v.yaw;
      if (v.carriage) v.carriage.position.y = v.carriage0 + (pose.lift || 0);
      if (v.mast) v.mast.position.y = v.mast0 + (pose.lift || 0) * 0.5;
      if (v.beacon) v.beacon.material.emissiveIntensity = pose.moving || (a.job !== 'idle' && a.job !== 'park' && a.job !== 'wait') ? (Math.sin(performance.now() / 160) > 0 ? 7 : 0.4) : 0;
      if (v.person) {
        let pose2 = v.pose;
        if (a.kind === 'picker') pose2 = 'push';
        if (!pose.moving && (pose.tag === 'pick' || pose.tag === 'scan' || pose.tag === 'label' || pose.tag === 'tote' || pose.tag === 'stack' || pose.tag === 'place' || pose.tag === 'empty')) pose2 = 'work';
        if (a.kind === 'totePicker' && a.tote && pose.moving) pose2 = 'carry';
        if (pose2 !== 'stand') animatePerson(v.person, pose.moving, dt * (this.speed || 1), 1.2, pose2);
      }
    }
    // pallets, loads, film, labels, totes
    let n = 0, nf = 0, nl = 0, nt = 0;
    const put = (x, y, z, yaw, cartons, wrapped, labelled, kind, totes, filmFrac = 1) => {
      q.setFromAxisAngle(up, yaw + Math.PI / 2); s.set(1, 1, 1); v3.set(x, y, z); m.compose(v3, q, s); this.pallets.set(n, m);
      // loads: 1.0 x h x 1.15, the long side along the heading
      if (kind === 'tote') {
        for (let k = 0; k < totes && nt < 220; k++) {
          const layer = Math.floor(k / 6), c = k % 6, ix = c % 2, iz = Math.floor(c / 2);
          const lx = (ix - 0.5) * 0.62, lz = (iz - 1) * 0.41; // tote 0.61 x 0.41, long side across the heading
          const ca = Math.cos(yaw), sa = Math.sin(yaw);
          v3.set(x + lx * ca + lz * sa, y + L.PALLET.h + layer * 0.172, z - lx * sa + lz * ca);
          q.setFromAxisAngle(up, yaw); m.compose(v3, q, s.set(1, 1, 1)); this.totes.set(nt++, m);
        }
      } else if (cartons > 0) {
        const h = Math.max(0.08, (cartons / L.CARTONS_PER_LAYER) * L.LAYER_H);
        q.setFromAxisAngle(up, yaw); v3.set(x, y + L.PALLET.h, z); s.set(0.98, h, 1.14); m.compose(v3, q, s); this.loads.setMatrixAt(n, m);
        if (wrapped || filmFrac < 1) { s.set(1.02, h * filmFrac + 0.03, 1.18); v3.set(x, y + L.PALLET.h - 0.02, z); m.compose(v3, q, s); this.film.setMatrixAt(nf++, m); }
        if (labelled) { const ca = Math.cos(yaw), sa = Math.sin(yaw); v3.set(x + sa * 0.6, y + L.PALLET.h + h * 0.6, z + ca * 0.6); q.setFromAxisAngle(up, yaw); m.compose(v3, q, s.set(1, 1, 1)); this.labels.setMatrixAt(nl++, m); }
      }
      if (kind !== 'tote' && !(cartons > 0)) { s.set(0, 0, 0); m.compose(v3, q, s); this.loads.setMatrixAt(n, m); }
      if (kind === 'tote') { s.set(0, 0, 0); m.compose(v3, q, s); this.loads.setMatrixAt(n, m); }
      n++;
    };
    for (const p of S.pallets.values()) {
      if (!this.palletWorld(p, P)) continue;
      let frac = 1;
      if (p.where.t === 'wrap') { const wr = S.wrappers[p.where.w]; if (wr.state === 'wrapping') frac = wr.prog; }
      put(P.x, P.y, P.z, P.yaw, p.cartons, p.wrapped, p.labelled && p.kind !== 'tote', p.kind, p.totes, p.where.t === 'wrap' && !p.wrapped ? frac : 1);
      if (n >= this.pallets.cap - 60) break;
    }
    for (const b of this.block) put(b.x, b.y, b.z, b.yaw, (b.h / L.LAYER_H) * L.CARTONS_PER_LAYER, true, false, 'stock', 0);
    for (let k = 0; k < this.emptyStack.n; k++) put(this.emptyStack.x, k * 0.15, this.emptyStack.z, 0, 0, false, false, 'empty', 0);
    // totes on the conveyor and in pickers' hands
    for (const t of S.totes) { v3.set(t.x, L.TOTE_LINE.top, L.TOTE_LINE.z); q.setFromAxisAngle(up, 0); m.compose(v3, q, s.set(1, 1, 1)); if (nt < 220) this.totes.set(nt++, m); }
    for (const v of this.views) if (v.a.kind === 'totePicker' && v.a.tote) { v3.set(v.g.position.x + Math.sin(v.yaw) * 0.42, 0.92, v.g.position.z + Math.cos(v.yaw) * 0.42); q.setFromAxisAngle(up, v.yaw + Math.PI / 2); m.compose(v3, q, s.set(1, 1, 1)); if (nt < 220) this.totes.set(nt++, m); }
    this.pallets.commit(n); this.loads.count = n; this.loads.instanceMatrix.needsUpdate = true;
    this.film.count = nf; this.film.instanceMatrix.needsUpdate = true; this.labels.count = nl; this.labels.instanceMatrix.needsUpdate = true;
    this.totes.commit(nt);
    // wrappers
    S.wrappers.forEach((w, i) => {
      const view = this.wraps[i]; view.table.rotation.y = w.angle;
      const h = w.pallet ? (S.pallets.get(w.pallet).cartons / L.CARTONS_PER_LAYER) * L.LAYER_H : 0.6;
      const tt = w.state === 'wrapping' ? w.prog : 0; const up01 = tt < 0.5 ? tt * 2 : 2 - tt * 2;
      view.carriage.position.y = 0.45 + up01 * (h + 0.1);
    });
    // trucks and doors
    for (const t of this.trucks) { t.g.visible = t.tr.state !== 'away'; t.g.position.x = L.TRAILER.x0 + t.tr.offset; }
    for (const d of this.docks) {
      const tr = d.kind === 'in' ? S.inTrucks[d.idx] : S.outTrucks[d.idx];
      const open = tr.door01 ?? 0; d.curtain.scale.y = Math.max(0.02, 1 - open);
      d.lip.visible = open > 0.95 && tr.offset < 0.05;
      // the gate spans the opening (+z) when shut and swings back into the hall (-x) once the door is up
      d.gate.rotation.y = -Math.PI / 2 - (open > 0.5 ? Math.PI / 2 * Math.min(1, (open - 0.5) * 2) : 0);
    }
    // see-through walls and roof: hide the parts between the camera and the floor
    const H = L.HALL;
    for (const w of this.walls) {
      const nrm = w.userData.normal; let outside = false;
      if (nrm.z < 0) outside = cam.z < H.z0; else if (nrm.z > 0) outside = cam.z > H.z1; else if (nrm.x < 0) outside = cam.x < H.x0; else outside = cam.x > H.x1;
      w.userData.upper.visible = !outside;
    }
    this.roof.visible = cam.y < H.h - 0.2 && cam.x > H.x0 && cam.x < H.x1 && cam.z > H.z0 && cam.z < H.z1;
  }
}
