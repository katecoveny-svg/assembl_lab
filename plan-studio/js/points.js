// assembl Plan Studio · the model as a point cloud. Every point is sampled from the true model's surfaces (walls, openings, roof,
// slab, decks, furniture, room floors), so the cloud is exactly as accurate as the model it came from. It is NOT a scan: the page
// and every still and clip say "sampled from model <number> rev <rev>".
// Points are placed on the CPU once (area-weighted over every triangle, plus crisp points along every hard edge); all motion
// (assembling, the scan sweep, exploding, the plan cut) runs in the vertex shader, so a million and more points stay smooth.
import * as THREE from "three";
import { buildModel } from "./scene.js";
import { MATERIALS } from "./materials.js";
import { polyBox, pointInPoly, footprint } from "./model.js";
import { runChecks } from "./code.js";

const M = (v) => v / 1000;
export const GROUP = { ground: 0, floor: 1, wall: 2, glass: 3, frame: 4, roof: 5, deck: 6, furniture: 7 };
// how densely each kind of surface is sampled, relative to a plain wall (glass is sparse so it reads as glass)
const WEIGHT = { [GROUP.floor]: 0.55, [GROUP.wall]: 1, [GROUP.glass]: 0.16, [GROUP.frame]: 2.2, [GROUP.roof]: 0.9, [GROUP.deck]: 1.1, [GROUP.furniture]: 2.6 };
const STATUS = { pass: 1, info: 2, fail: 3 };

function rng(seed = 1) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// what a mesh is, which element it belongs to, and its true material colour
function classify(mesh) {
  let tag = null; for (let o = mesh; o; o = o.parent) if (o.userData && o.userData.kind) { tag = o.userData; break; }
  const mat = mesh.material, id = mat?.name || "", m = MATERIALS[id];
  let group = GROUP.furniture;
  if (mesh.name === "SLAB") group = GROUP.floor;
  else if (mesh.name === "ROOF") group = GROUP.roof;
  else if (tag?.kind === "deck" || id === "timber-pile" || id === "deck-timber") group = GROUP.deck;
  else if (m?.glass && mat.transparent && mat.opacity < 1) group = GROUP.glass;
  else if (id === "window-thermal" || id.startsWith("door-")) group = GROUP.frame;
  else if (tag?.kind === "wall" || m) group = GROUP.wall;
  const hex = group === GROUP.glass ? "#a9c0c8" : m ? m.hex : "#" + (mat?.color?.getHexString?.() || "eeeeee");
  return { group, element: tag?.id || null, color: new THREE.Color(hex) };
}

// build the cloud. `total` is the point budget; the result is plain typed arrays plus what the shader needs to know.
export function buildCloud(P, { total = 1200000, seed = 7 } = {}) {
  const rand = rng(seed), model = buildModel(P, { furniture: true }); model.updateMatrixWorld(true);
  // the code pre-check and the evidence, per element (walls, openings, rooms): the cloud can be coloured by either
  const worst = new Map(), conf = new Map();
  for (const r of runChecks(P)) { const s = STATUS[r.status]; if (!s) continue; for (const e of r.elements || []) worst.set(e, Math.max(worst.get(e) || 0, s)); }
  for (const e of [...P.walls, ...P.openings, ...P.rooms]) if (e.ev) conf.set(e.id, e.ev.conf ?? 1);
  // 1) every triangle and every hard edge, in world space, with its weight
  const tris = [], edges = []; let triW = 0, edgeW = 0;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), ab = new THREE.Vector3(), ac = new THREE.Vector3(), n = new THREE.Vector3();
  model.traverse((mesh) => {
    if (!mesh.isMesh) return; const info = classify(mesh), g = mesh.geometry, pos = g.attributes.position, idx = g.index, W = WEIGHT[info.group] ?? 1;
    const count = idx ? idx.count : pos.count;
    for (let i = 0; i < count; i += 3) {
      const i0 = idx ? idx.getX(i) : i, i1 = idx ? idx.getX(i + 1) : i + 1, i2 = idx ? idx.getX(i + 2) : i + 2;
      a.fromBufferAttribute(pos, i0).applyMatrix4(mesh.matrixWorld); b.fromBufferAttribute(pos, i1).applyMatrix4(mesh.matrixWorld); c.fromBufferAttribute(pos, i2).applyMatrix4(mesh.matrixWorld);
      ab.subVectors(b, a); ac.subVectors(c, a); n.crossVectors(ab, ac); const area = n.length() / 2; if (area < 1e-7) continue; n.normalize();
      tris.push({ a: a.toArray(), b: b.toArray(), c: c.toArray(), n: n.toArray(), info, w: area * W }); triW += area * W;
    }
    if (info.group !== GROUP.glass) {
      const eg = new THREE.EdgesGeometry(g, 28), ep = eg.attributes.position;
      for (let i = 0; i < ep.count; i += 2) {
        a.fromBufferAttribute(ep, i).applyMatrix4(mesh.matrixWorld); b.fromBufferAttribute(ep, i + 1).applyMatrix4(mesh.matrixWorld);
        const L = a.distanceTo(b); if (L < 1e-4) continue; edges.push({ a: a.toArray(), b: b.toArray(), info, w: L }); edgeW += L;
      }
      eg.dispose();
    }
  });
  // room floors: sampled inside each room's polygon so the code check can light up a room (ventilation, accessible WC, escape)
  const floors = P.rooms.map((r) => { const bx = polyBox(r.poly); return { r, bx, area: ((bx.x1 - bx.x0) * (bx.y1 - bx.y0)) / 1e6 }; });
  const floorW = floors.reduce((s, f) => s + f.area * WEIGHT[GROUP.floor], 0);
  // 2) the budget: surfaces 74%, edges 12%, room floors 6%, ground scan rings 8%
  const nTri = Math.round(total * 0.74), nEdge = Math.round(total * 0.12), nFloor = Math.round(total * 0.06), nGround = total - nTri - nEdge - nFloor;
  const posA = new Float32Array(total * 3), colA = new Uint8Array(total * 3), auxA = new Float32Array(total * 4);
  let k = 0;
  const put = (x, y, z, col, lum, group, element, edge = 0) => {
    if (k >= total) return; const j = k * 3, q = k * 4, v = Math.max(0, Math.min(1, lum * (0.94 + rand() * 0.12)));
    posA[j] = x; posA[j + 1] = y; posA[j + 2] = z;
    colA[j] = Math.min(255, col.r * v * 255); colA[j + 1] = Math.min(255, col.g * v * 255); colA[j + 2] = Math.min(255, col.b * v * 255);
    auxA[q] = rand() * 1000; auxA[q + 1] = group + (edge ? 0.25 : 0); auxA[q + 2] = element != null && conf.has(element) ? conf.get(element) : -1; auxA[q + 3] = element != null ? worst.get(element) || 0 : 0;
    k++;
  };
  const sun = new THREE.Vector3(0.45, 0.8, 0.4).normalize(), shade = (nn) => 0.58 + 0.42 * Math.max(0, nn[0] * sun.x + nn[1] * sun.y + nn[2] * sun.z) + (nn[1] < -0.5 ? -0.12 : 0);
  // surfaces, area-weighted (expected count per triangle, the fraction resolved at random so totals stay honest)
  const perW = nTri / triW;
  for (const t of tris) {
    const e = t.w * perW; let m = Math.floor(e); if (rand() < e - m) m++;
    const lum = shade(t.n);
    for (let s = 0; s < m; s++) {
      let u = rand(), v = rand(); if (u + v > 1) { u = 1 - u; v = 1 - v; }
      put(t.a[0] + (t.b[0] - t.a[0]) * u + (t.c[0] - t.a[0]) * v, t.a[1] + (t.b[1] - t.a[1]) * u + (t.c[1] - t.a[1]) * v, t.a[2] + (t.b[2] - t.a[2]) * u + (t.c[2] - t.a[2]) * v, t.info.color, lum, t.info.group, t.info.element);
    }
  }
  // hard edges: a little brighter, so the building reads as crisp linework inside the cloud
  const perL = nEdge / Math.max(edgeW, 1e-6);
  for (const e of edges) {
    const ex = e.w * perL; let m = Math.floor(ex); if (rand() < ex - m) m++;
    for (let s = 0; s < m; s++) { const u = rand(), j = 0.004; put(e.a[0] + (e.b[0] - e.a[0]) * u + (rand() - 0.5) * j, e.a[1] + (e.b[1] - e.a[1]) * u + (rand() - 0.5) * j, e.a[2] + (e.b[2] - e.a[2]) * u + (rand() - 0.5) * j, e.info.color, 1.12, e.info.group, e.info.element, 1); }
  }
  // room floors, just above the slab
  const perF = nFloor / Math.max(floorW, 1e-6), floorCol = new THREE.Color(MATERIALS[P.slab?.mat || "slab-concrete"]?.hex || "#a8a29d");
  for (const f of floors) {
    const want = Math.round(f.area * WEIGHT[GROUP.floor] * perF);
    for (let s = 0, tries = 0; s < want && tries < want * 3; tries++) {
      const x = f.bx.x0 + rand() * (f.bx.x1 - f.bx.x0), y = f.bx.y0 + rand() * (f.bx.y1 - f.bx.y0); if (!pointInPoly([x, y], f.r.poly)) continue;
      put(M(x), 0.006, -M(y), floorCol, 0.86, GROUP.floor, f.r.id); s++;
    }
  }
  // the ground, as a terrestrial scanner sees it: rings around a scanner standing in front of the entry, sparser with distance,
  // fading into the plum, and nothing under the building (a scanner cannot see under a slab)
  const fp = footprint(P), cx = M((fp.x0 + fp.x1) / 2), cz = -M((fp.y0 + fp.y1) / 2), depth = M(fp.y1 - fp.y0), width = M(fp.x1 - fp.x0);
  const gy = -M(P.site?.floorAboveGround || 0) - 0.16, sx = cx + width * 0.15, sz = cz + depth * 0.95, R = Math.max(width, depth) * 2.4;
  const ringCol = new THREE.Color("#b49aac"), bg = new THREE.Color("#240B21"), inside = (x, z) => x > M(fp.x0) - 0.3 && x < M(fp.x1) + 0.3 && -z > fp.y0 / 1000 - 0.3 && -z < fp.y1 / 1000 + 0.3;
  const rings = []; for (let r = 0.9; r < R; r += 0.08 + r * 0.03) rings.push(r);
  const ringLen = rings.reduce((s, r) => s + r, 0), perRing = nGround / ringLen;
  for (const r of rings) {
    const m = Math.round(r * perRing), fade = Math.min(1, Math.pow(r / R, 0.8)), col = ringCol.clone().lerp(bg, fade * 0.88);
    for (let s = 0; s < m; s++) {
      const th = rand() * Math.PI * 2, rr = r + (rand() - 0.5) * 0.025, x = sx + Math.cos(th) * rr, z = sz + Math.sin(th) * rr;
      if (inside(x, z)) continue; put(x, gy + (rand() - 0.5) * 0.01, z, col, 1, GROUP.ground, null);
    }
  }
  const height = Math.max(...tris.map((t) => Math.max(t.a[1], t.b[1], t.c[1])));
  return { count: k, position: posA.subarray(0, k * 3), color: colA.subarray(0, k * 3), aux: auxA.subarray(0, k * 4), centre: [cx, 0, cz], size: [width, height, depth], scanner: [sx, gy, sz] };
}

const VERT = /* glsl */ `
attribute vec4 aux;                 // seed, group (+0.25 on an edge), evidence confidence (-1 none), worst code-check status (0 none, 1 pass, 2 info, 3 fail)
uniform float uAssemble, uSweep, uExplode, uCutY, uSize, uPR, uMode, uHeight, uTime;
uniform vec2 uFog;                  // distance fade: points further from the camera sink toward the plum
uniform vec3 uCentre;
varying vec3 vCol; varying float vVis;
float h1(float n) { return fract(sin(n) * 43758.5453123); }
vec3 h3(float n) { return vec3(h1(n), h1(n + 1.7), h1(n + 3.3)) * 2.0 - 1.0; }
vec3 ramp(float t) { vec3 a = vec3(0.36, 0.15, 0.33), b = vec3(0.57, 0.42, 0.44), c = vec3(1.0, 0.99, 0.98); return t < 0.5 ? mix(a, b, t * 2.0) : mix(b, c, t * 2.0 - 1.0); }
void main() {
  float seed = aux.x, g = floor(aux.y + 0.01), edge = step(0.2, fract(aux.y)); vec3 p = position;
  // explode: the roof lifts, walls and openings step out from the centre, furniture rises
  vec3 off = vec3(0.0); vec2 d = p.xz - uCentre.xz; float dl = max(length(d), 1e-3);
  if (g > 4.5 && g < 5.5) off.y = 3.4; else if (g > 1.5 && g < 4.5) off.xz = d / dl * (g > 2.5 ? 2.8 : 1.8); else if (g > 6.5) off.y = 1.4; else if (g > 0.5 && g < 1.5) off.y = -0.4;
  p += off * uExplode;
  // assemble: the ground first, then the floor, the walls, the openings and the roof, each rising from scattered points
  float order = g < 0.5 ? 0.0 : g / 8.0;
  float delay = order * 0.55 + clamp(position.y / max(uHeight, 1.0), 0.0, 1.0) * 0.22 + h1(seed) * 0.2;
  float t = clamp((uAssemble * 1.4 - delay) / 0.38, 0.0, 1.0); t = t * t * (3.0 - 2.0 * t);
  vec3 from = p + h3(seed) * vec3(5.5, 2.0, 5.5) + vec3(0.0, 5.0, 0.0);
  p = mix(from, p, t);
  // colour by mode: 0 scan, 1 material, 2 code check, 3 evidence
  // material: lifted toward paper, the way a scan reads on a dark ground (dark roofing and cladding stay legible)
  vec3 col = g < 0.5 ? color : 1.0 - (1.0 - color) * 0.66;
  float flag = 0.0;
  if (uMode < 0.5) { if (g > 0.5) { float hh = clamp(position.y / max(uHeight, 1.0), 0.0, 1.0); col = ramp(0.18 + hh * 0.82) * (edge > 0.5 ? 1.25 : 0.92); flag = edge * 0.4; } }
  else if (uMode > 1.5 && uMode < 2.5) {
    float s = aux.w; vec3 grey = vec3(dot(color, vec3(0.3, 0.55, 0.15))) * 0.45 + 0.16;
    col = s > 2.5 ? vec3(1.0, 0.3, 0.4) : s > 1.5 ? vec3(1.0, 0.78, 0.32) : s > 0.5 ? vec3(0.42, 0.86, 0.6) : (g < 0.5 ? color : grey);
    flag = s > 0.5 ? 1.0 : 0.0;
  } else if (uMode > 2.5) {
    float c = aux.z; vec3 grey = vec3(dot(color, vec3(0.3, 0.55, 0.15))) * 0.45 + 0.16;
    col = c < 0.0 ? (g < 0.5 ? color : grey) : c >= 0.85 ? vec3(0.42, 0.86, 0.6) : c >= 0.6 ? vec3(1.0, 0.78, 0.32) : vec3(1.0, 0.3, 0.4);
  }
  // the scan sweep: a band of light rising through the model
  float band = exp(-pow((position.y - uSweep) / 0.14, 2.0));
  col = mix(col, vec3(1.0, 0.86, 0.91), band * 0.85);
  vCol = col;
  // the plan cut hides everything above a height (the ground always stays)
  vVis = (g > 0.5 && position.y > uCutY) ? 0.0 : 1.0;
  vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
  vCol = mix(vCol, vec3(0.14, 0.043, 0.13), smoothstep(uFog.x, uFog.y, -mv.z) * 0.5);
  float sz = uSize * uPR * (0.65 + 0.7 * h1(seed + 9.0)) * (1.0 + band * 0.8) * (g < 0.5 ? 0.8 : 1.0) * (1.0 + flag * 0.35);
  gl_PointSize = vVis * max(t, 0.05) * sz / max(-mv.z, 0.1);
}`;
const FRAG = /* glsl */ `
varying vec3 vCol; varying float vVis;
void main() {
  if (vVis < 0.5) discard;
  vec2 c = gl_PointCoord - 0.5; float r = dot(c, c); if (r > 0.25) discard;
  gl_FragColor = vec4(vCol * (1.0 - r * 0.6), 1.0);   // colours are already sRGB: no output conversion
}`;

// a THREE.Points ready to add to a scene, with the uniforms the page drives
export function cloudPoints(cloud) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(cloud.position, 3));
  g.setAttribute("color", new THREE.BufferAttribute(cloud.color, 3, true));
  g.setAttribute("aux", new THREE.BufferAttribute(cloud.aux, 4));
  const uniforms = { uAssemble: { value: 1 }, uSweep: { value: -100 }, uExplode: { value: 0 }, uCutY: { value: 100 }, uSize: { value: 22 }, uPR: { value: 1 }, uMode: { value: 0 },
    uHeight: { value: cloud.size[1] }, uTime: { value: 0 }, uFog: { value: new THREE.Vector2(20, 80) }, uCentre: { value: new THREE.Vector3(...cloud.centre) } };
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, vertexColors: true });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.name = "PLAN_STUDIO_POINT_CLOUD";
  return { points: pts, uniforms };
}
