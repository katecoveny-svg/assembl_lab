// assembl lab · Sea state: two boats, built entirely in code (no model files). Hulls are lofted from cross-sections: keel,
// chine and sheer at each station, with rocker at the bow and a flat transom. Local axes: x to starboard, y up, bow toward −z,
// the waterline near y = 0. Each boat carries its physics: mass, the points its buoyancy is sampled at, thrust and drag.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const M = (hex, o = {}) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.45, metalness: 0, ...o });
export const MAT = {
  hull: M("#f1eeea", { roughness: 0.32 }), antifoul: M("#4a2238", { roughness: 0.75 }), stripe: M("#654A4E", { roughness: 0.4 }), plum: M("#240B21", { roughness: 0.45 }),
  deck: M("#bfb7b2", { roughness: 0.85 }), white: M("#f6f3f0", { roughness: 0.4 }), glass: M("#1b1520", { roughness: 0.06, metalness: 0.3, envMapIntensity: 1.6 }),
  engine: M("#1d1a20", { roughness: 0.35, metalness: 0.2 }), steel: M("#d2d6da", { roughness: 0.22, metalness: 0.95 }), rubber: M("#2a2629", { roughness: 0.9 }),
  red: M("#c8293f", { emissive: "#5a0c18" }), green: M("#1f9e5a", { emissive: "#06301a" }),
};

// ------------------------------------------------------------------------------------------------ the hull
function hull({ L, B, D, F, deadrise, entry = 0.62 }) {
  const n = 44, tanD = Math.tan((deadrise * Math.PI) / 180);
  const hb = (u) => (u < entry ? (B / 2) * (0.9 + 0.1 * Math.sin((u / entry) * Math.PI * 0.5)) : (B / 2) * Math.sqrt(Math.max(0, 1 - ((u - entry) / (1 - entry)) ** 2)));
  const kd = (u) => D * (u < 0.66 ? 1 : 1 - Math.pow((u - 0.66) / 0.34, 1.7) * 0.92);
  const sh = (u) => F * (1 + 0.28 * u * u);
  const z = (u) => (0.5 - u) * L;
  const sec = []; for (let i = 0; i <= n; i++) {
    const u = i / n, b = Math.max(hb(u), 0.002), k = kd(u), cx = b * 0.9, cy = Math.min(-k + cx * tanD, sh(u) - 0.05);
    sec.push({ z: z(u), keel: [0, -k], chine: [cx, cy], sheer: [b, sh(u)] });
  }
  const strip = (get, side) => {           // a lofted panel between two curves along the length, one side
    const pos = [], idx = [];
    sec.forEach((s) => { const [a, b] = get(s); pos.push(a[0] * side, a[1], s.z, b[0] * side, b[1], s.z); });
    for (let i = 0; i < n; i++) { const a = i * 2; if (side > 0) idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); else idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  };
  const bottom = mergeGeometries([strip((s) => [s.keel, s.chine], 1), strip((s) => [s.keel, s.chine], -1)]);
  const sides = mergeGeometries([strip((s) => [s.chine, s.sheer], 1), strip((s) => [s.chine, s.sheer], -1)]);
  // the deck: sheer to sheer
  const dpos = [], didx = []; sec.forEach((s) => dpos.push(-s.sheer[0], s.sheer[1], s.z, s.sheer[0], s.sheer[1], s.z));
  for (let i = 0; i < n; i++) { const a = i * 2; didx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const deck = new THREE.BufferGeometry(); deck.setAttribute("position", new THREE.Float32BufferAttribute(dpos, 3)); deck.setIndex(didx); deck.computeVertexNormals();
  // the transom: a flat plate across the stern section
  const s0 = sec[0], tr = new THREE.BufferGeometry(), tp = [];
  const ring = [[-s0.sheer[0], s0.sheer[1]], [-s0.chine[0], s0.chine[1]], [0, s0.keel[1]], [s0.chine[0], s0.chine[1]], [s0.sheer[0], s0.sheer[1]]];
  for (let i = 0; i < ring.length - 1; i++) tp.push(0, (s0.sheer[1] + s0.keel[1]) / 2, s0.z, ring[i + 1][0], ring[i + 1][1], s0.z, ring[i][0], ring[i][1], s0.z);
  tr.setAttribute("position", new THREE.Float32BufferAttribute(tp, 3)); tr.computeVertexNormals();
  // a stripe just under the sheer, standing off the topside a few millimetres
  const band = (y0, y1) => strip((s) => { const t0 = (y0 - s.chine[1]) / Math.max(s.sheer[1] - s.chine[1], 1e-3), t1 = (y1 - s.chine[1]) / Math.max(s.sheer[1] - s.chine[1], 1e-3), lerp = (t) => [(s.chine[0] + (s.sheer[0] - s.chine[0]) * t) * 1.004 + 0.004, s.chine[1] + (s.sheer[1] - s.chine[1]) * t]; return [lerp(Math.max(0, t0)), lerp(Math.min(1, t1))]; }, 1);
  const bandL = (y0, y1) => strip((s) => { const t0 = (y0 - s.chine[1]) / Math.max(s.sheer[1] - s.chine[1], 1e-3), t1 = (y1 - s.chine[1]) / Math.max(s.sheer[1] - s.chine[1], 1e-3), lerp = (t) => [(s.chine[0] + (s.sheer[0] - s.chine[0]) * t) * 1.004 + 0.004, s.chine[1] + (s.sheer[1] - s.chine[1]) * t]; return [lerp(Math.max(0, t0)), lerp(Math.min(1, t1))]; }, -1);
  return { bottom, sides, deck, transom: tr, band, bandL, sec, hb, kd, sh, z };
}

function tube(points, r, mat) { const c = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))); return new THREE.Mesh(new THREE.TubeGeometry(c, Math.max(8, points.length * 6), r, 6, false), mat); }
function box(w, h, d, mat, x, y, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; }
// a cabin from a side profile (z, y pairs), extruded across its width
function cabin(profile, width, mat) {
  const s = new THREE.Shape(profile.map(([z, y]) => new THREE.Vector2(z, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth: width, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2 });
  g.rotateY(Math.PI / 2); g.translate(-width / 2, 0, 0); return new THREE.Mesh(g, mat);
}
function rails(H, uFrom, uTo, height, mat, group) {
  for (const side of [1, -1]) {
    const pts = []; for (let u = uFrom; u <= uTo + 1e-6; u += 0.05) pts.push([H.hb(u) * side * 0.96, H.sh(u) + height, H.z(u)]);
    group.add(tube(pts, 0.022, mat));
    for (let u = uFrom; u <= uTo + 1e-6; u += 0.1) group.add(tube([[H.hb(u) * side * 0.96, H.sh(u), H.z(u)], [H.hb(u) * side * 0.96, H.sh(u) + height, H.z(u)]], 0.016, mat));
  }
}
function buoyancyPoints(H, nL, nW, y) {
  const pts = []; for (let i = 0; i < nL; i++) { const u = 0.05 + (0.82 * i) / (nL - 1); for (let j = 0; j < nW; j++) { const f = nW === 1 ? 0 : (j / (nW - 1)) * 2 - 1; pts.push({ p: new THREE.Vector3(H.hb(u) * 0.78 * f, y, H.z(u)), w: Math.max(0.15, H.hb(u) / (H.hb(0.3))) }); } }
  const sw = pts.reduce((s, q) => s + q.w, 0); pts.forEach((q) => (q.w /= sw)); return pts;
}

// ------------------------------------------------------------------------------------------------ the water taxi
export function waterTaxi() {
  const g = new THREE.Group(); g.name = "WATER_TAXI";
  const H = hull({ L: 10.5, B: 3.2, D: 0.55, F: 0.95, deadrise: 21 });
  g.add(new THREE.Mesh(H.bottom, MAT.antifoul), new THREE.Mesh(H.sides, MAT.hull), new THREE.Mesh(H.deck, MAT.deck), new THREE.Mesh(H.transom, MAT.hull));
  g.add(new THREE.Mesh(H.band(0.55, 0.78), MAT.stripe), new THREE.Mesh(H.bandL(0.55, 0.78), MAT.stripe));
  const dy = H.sh(0.45);
  // cabin: raked windscreen, glazed sides, a roof that overhangs
  const c = cabin([[H.z(0.3), 0], [H.z(0.3), 1.5], [H.z(0.66), 1.5], [H.z(0.76), 0.75], [H.z(0.76), 0]], 2.25, MAT.white); c.position.y = dy; g.add(c);
  const win = cabin([[H.z(0.33), 0.82], [H.z(0.33), 1.32], [H.z(0.655), 1.32], [H.z(0.735), 0.85], [H.z(0.735), 0.82]], 2.36, MAT.glass); win.position.y = dy; g.add(win);
  g.add(box(2.45, 0.08, H.z(0.27) - H.z(0.68), MAT.white, 0, dy + 1.56, (H.z(0.27) + H.z(0.68)) / 2));
  g.add(box(0.06, 0.6, 0.06, MAT.steel, 0, dy + 1.9, H.z(0.4)), box(0.5, 0.05, 0.05, MAT.steel, 0, dy + 2.15, H.z(0.4)));
  // twin outboards on the transom
  for (const x of [-0.55, 0.55]) {
    const cowl = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.45, 6, 12), MAT.engine); cowl.scale.set(1, 1, 1.35); cowl.position.set(x, H.sh(0) + 0.35, H.z(0) + 0.38); g.add(cowl);
    g.add(box(0.16, 1.1, 0.3, MAT.engine, x, H.sh(0) - 0.45, H.z(0) + 0.32), box(0.5, 0.06, 0.4, MAT.plum, x, H.sh(0) + 0.66, H.z(0) + 0.4));
  }
  rails(H, 0.72, 0.98, 0.62, MAT.steel, g);
  g.add(box(0.1, 0.1, 0.1, MAT.red, -H.hb(0.6), H.sh(0.6) + 0.12, H.z(0.6)), box(0.1, 0.1, 0.1, MAT.green, H.hb(0.6), H.sh(0.6) + 0.12, H.z(0.6)));
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { group: g, name: "Water taxi", lengthM: 10.5,
    phys: { mass: 6200, dims: [3.2, 1.6, 10.5], points: buoyancyPoints(H, 7, 3, -0.38), smax: 0.9, thrust: 26000, vmax: 17.5, planing: 0.62, lat: 9000, yaw: 2.4, sternZ: H.z(0) + 0.3, seat: new THREE.Vector3(0.6, 0.9, H.z(0.45)), bow: new THREE.Vector3(0, 0.1, H.z(0.94)), beam: 3.2, cog: -0.05 } };
}

// ------------------------------------------------------------------------------------------------ the harbour ferry
export function ferry() {
  const g = new THREE.Group(); g.name = "HARBOUR_FERRY";
  const H = hull({ L: 16, B: 5.2, D: 1.25, F: 1.55, deadrise: 11, entry: 0.58 });
  g.add(new THREE.Mesh(H.bottom, MAT.antifoul), new THREE.Mesh(H.sides, MAT.hull), new THREE.Mesh(H.deck, MAT.deck), new THREE.Mesh(H.transom, MAT.hull));
  g.add(new THREE.Mesh(H.band(0.9, 1.35), MAT.plum), new THREE.Mesh(H.bandL(0.9, 1.35), MAT.plum));
  const dy = H.sh(0.4);
  // main saloon with a band of windows, then the wheelhouse and an open upper deck
  const sal = cabin([[H.z(0.1), 0], [H.z(0.1), 2.2], [H.z(0.7), 2.2], [H.z(0.76), 1.2], [H.z(0.76), 0]], 4.4, MAT.white); sal.position.y = dy; g.add(sal);
  const sw = cabin([[H.z(0.12), 0.95], [H.z(0.12), 1.85], [H.z(0.69), 1.85], [H.z(0.745), 1.25], [H.z(0.745), 0.95]], 4.52, MAT.glass); sw.position.y = dy; g.add(sw);
  g.add(box(4.7, 0.1, H.z(0.08) - H.z(0.72), MAT.white, 0, dy + 2.27, (H.z(0.08) + H.z(0.72)) / 2));
  const wh = cabin([[H.z(0.42), 0], [H.z(0.42), 1.6], [H.z(0.62), 1.6], [H.z(0.67), 0.7], [H.z(0.67), 0]], 2.8, MAT.white); wh.position.y = dy + 2.32; g.add(wh);
  const whw = cabin([[H.z(0.44), 0.75], [H.z(0.44), 1.35], [H.z(0.615), 1.35], [H.z(0.655), 0.8], [H.z(0.655), 0.75]], 2.92, MAT.glass); whw.position.y = dy + 2.32; g.add(whw);
  g.add(box(3.0, 0.08, H.z(0.4) - H.z(0.64), MAT.plum, 0, dy + 3.98, (H.z(0.4) + H.z(0.64)) / 2));
  for (const side of [1, -1]) { const pts = []; for (let u = 0.1; u <= 0.7; u += 0.1) pts.push([side * 2.25, dy + 3.2, H.z(u)]); g.add(tube(pts, 0.03, MAT.steel)); for (let u = 0.1; u <= 0.71; u += 0.1) g.add(tube([[side * 2.25, dy + 2.32, H.z(u)], [side * 2.25, dy + 3.2, H.z(u)]], 0.02, MAT.steel)); }
  rails(H, 0.76, 0.97, 0.95, MAT.steel, g);
  g.add(box(0.06, 1.0, 0.06, MAT.steel, 0, dy + 4.5, H.z(0.55)));
  g.add(box(0.14, 0.14, 0.14, MAT.red, -2.4, dy + 2.45, H.z(0.6)), box(0.14, 0.14, 0.14, MAT.green, 2.4, dy + 2.45, H.z(0.6)));
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { group: g, name: "Harbour ferry", lengthM: 16,
    phys: { mass: 30000, dims: [5.2, 3, 16], points: buoyancyPoints(H, 8, 3, -0.9), smax: 2.2, thrust: 34000, vmax: 6.2, planing: 0, lat: 60000, yaw: 1.3, sternZ: H.z(0) + 0.4, seat: new THREE.Vector3(1.2, 1.5, H.z(0.4)), bow: new THREE.Vector3(0, 0.3, H.z(0.95)), beam: 5.2, cog: 0.4 } };
}

// a lateral mark (IALA region A: port red can, starboard green cone), bobbing on the sea
export function buoy(port) {
  const g = new THREE.Group(), m = port ? MAT.red : MAT.green;
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 1.0, 18), m)); g.children[0].position.y = 0.2;
  const top = port ? new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.5, 14), m) : new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.55, 14), m); top.position.y = 1.15; g.add(top);
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8), MAT.engine)); g.children[2].position.y = 0.8; return g;
}
