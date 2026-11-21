import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// A generic compact SUV, modelled in code at real size (4.42 m long, 1.84 m wide, 1.62 m high). It is there for scale
// in a car bay and is not part of any design. No make or model is intended and it carries no badge or plate text.
//
// How it is made: the body is one lofted skin. Along the length, a handful of smooth curves give the roof line, the
// shoulder line, the underside and the plan width; at each station those set an eleven-point cross-section from the
// centre of the floor, out under the sill, up the side, in over the glass and across the roof. The wheel arches are the
// sill line lifted over each wheel, so the skin itself forms the wheel wells. Glass, lamps, the dark lower cladding and
// the door gaps are thin patches cut from the same skin and floated a few millimetres off it, so they follow every curve.
//
// Frame: x along the car (front at -x), y up from the ground, z across. Origin on the ground under the middle.

const L = 4.42, WB = 2.66, XF = 0.9, XR = XF + WB, RW = 0.35, RA = 0.405;
const SEG = 10, SUB = 4;

function curve1(pts: [number, number][]) {
  const c = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], 0)), false, 'centripetal').getPoints(260);
  return (x: number) => {
    if (x <= c[0].x) return c[0].y;
    if (x >= c[c.length - 1].x) return c[c.length - 1].y;
    let i = 1; while (c[i].x < x) i++;
    const a = c[i - 1], b = c[i];
    return a.y + (b.y - a.y) * ((x - a.x) / (b.x - a.x || 1));
  };
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const sstep = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

const top = curve1([[0, 0.7], [0.06, 0.8], [0.35, 0.9], [0.9, 0.97], [1.28, 1.01], [1.62, 1.28], [1.98, 1.52], [2.35, 1.6], [3.0, 1.62], [3.65, 1.585], [3.96, 1.51], [4.2, 1.2], [4.33, 1.0], [4.42, 0.9]]);
const belt = curve1([[0, 0.66], [0.3, 0.84], [1.0, 0.94], [1.3, 0.98], [2.4, 1.01], [3.5, 1.055], [4.1, 1.065], [4.33, 0.955], [4.42, 0.86]]);
const under = curve1([[0, 0.34], [0.25, 0.25], [0.6, 0.21], [3.9, 0.22], [4.2, 0.27], [4.42, 0.36]]);
const halfW = curve1([[0, 0.62], [0.05, 0.745], [0.2, 0.845], [0.6, 0.905], [1.4, 0.92], [3.2, 0.92], [3.9, 0.905], [4.25, 0.85], [4.38, 0.76], [4.42, 0.64]]);
const arch = (x: number) => { let z = 0; for (const c of [XF, XR]) { const d = Math.abs(x - c); if (d < RA) z = Math.max(z, RW + Math.sqrt(RA * RA - d * d)); } return z; };

// the cross-section at x, as a curve from the floor centre (u = 0) round to the roof centre (u = SEG)
const rings = new Map<number, THREE.CatmullRomCurve3>();
function ring(x: number) {
  const key = Math.round(x * 2000);
  let r = rings.get(key);
  if (r) return r;
  const w = halfW(x), zu = under(x), zs = Math.max(zu, arch(x)), zt = top(x), zb = Math.min(belt(x), zt - 0.03);
  const g = sstep(0.05, 0.42, zt - zb), wr = lerp(w * 0.9, 0.615, g);
  const P = (a: number, h: number) => new THREE.Vector3(0, h, a);
  r = new THREE.CatmullRomCurve3([
    P(0, zu), P(w - 0.37, zu), P(w - 0.34, zs), P(w - 0.05, zs), P(w, zs + 0.07), P(w + 0.004, lerp(zs, zb, 0.52)),
    P(w - 0.022, zb - 0.03), P(w - 0.055 - 0.03 * g, zb + 0.012), P(wr + 0.02, zt - 0.006 - 0.07 * g), P(wr * 0.6, zt - 0.002 - 0.012 * g), P(0, zt),
  ], false, 'centripetal');
  rings.set(key, r);
  return r;
}
// a point on the skin, in the car's frame; side is +1 or -1
function S(x: number, u: number, side = 1, out = new THREE.Vector3()) {
  ring(x).getPoint(Math.min(1, Math.max(0, u / SEG)), out);
  out.x = x - L / 2; out.z *= side;
  return out;
}
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
function N(x: number, u: number, side = 1, out = new THREE.Vector3()) {
  const e = 0.004, x0 = Math.max(0, x - e), x1 = Math.min(L, x + e), u0 = Math.max(0, u - 0.02), u1 = Math.min(SEG, u + 0.02);
  S(x1, u, 1, _a).sub(S(x0, u, 1, _b)); S(x, u1, 1, _c).sub(S(x, u0, 1, _b));
  out.crossVectors(_a, _c).normalize(); out.z *= side;
  return out;
}

function stations() {
  const xs = new Set<number>();
  const add = (x: number) => xs.add(Math.round(Math.min(L, Math.max(0, x)) * 1000) / 1000);
  for (let x = 0; x <= L + 1e-6; x += 0.05) add(x);
  for (const x of [0.02, 0.035, 0.075, 0.125, 0.16, L - 0.02, L - 0.035, L - 0.075, L - 0.125]) add(x);
  for (const c of [XF, XR]) { for (let d = -RA; d <= RA + 1e-6; d += 0.0225) add(c + d); add(c - RA - 0.003); add(c - RA + 0.003); add(c + RA - 0.003); add(c + RA + 0.003); }
  return [...xs].sort((a, b) => a - b);
}

function skin() {
  const xs = stations(), nj = SEG * SUB + 1, pos: number[] = [], idx: number[] = [], v = new THREE.Vector3();
  for (const side of [1, -1]) {
    const base = pos.length / 3;
    for (const x of xs) for (let j = 0; j < nj; j++) { S(x, j / SUB, side, v); pos.push(v.x, v.y, v.z); }
    for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < nj - 1; j++) {
      const a = base + i * nj + j, b = a + nj, c = b + 1, d = a + 1;
      if (side > 0) idx.push(a, b, d, b, c, d); else idx.push(a, d, b, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  // the two halves meet on the centre line: stand those normals upright so no crease shows down the roof and bonnet
  const n = g.getAttribute('normal') as THREE.BufferAttribute;
  for (let k = 0; k < n.count; k++) { const j = k % nj; if (j === 0 || j === nj - 1) { v.set(n.getX(k), n.getY(k), 0).normalize(); n.setXYZ(k, v.x, v.y, v.z); } }
  // flat faces close the nose and the tail
  const caps: THREE.BufferGeometry[] = [];
  for (const [x, dir] of [[0, -1], [L, 1]] as [number, number][]) {
    const p: number[] = [], ci: number[] = [], mid = (under(x) + top(x)) / 2;
    p.push(x - L / 2, mid, 0);
    const pts: THREE.Vector3[] = [];
    for (let j = 0; j < nj; j++) pts.push(S(x, j / SUB, 1, new THREE.Vector3()));
    for (let j = nj - 2; j > 0; j--) pts.push(S(x, j / SUB, -1, new THREE.Vector3()));
    pts.forEach((q) => p.push(q.x, q.y, q.z));
    for (let k = 0; k < pts.length; k++) { const a = 1 + k, b = 1 + ((k + 1) % pts.length); if (dir < 0) ci.push(0, a, b); else ci.push(0, b, a); }
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); cg.setIndex(ci); cg.computeVertexNormals(); caps.push(cg);
  }
  return mergeGeometries([g, ...caps])!;
}

type Edge = number | ((u: number) => number);
// a piece of the skin between two stations and two ring positions, on both sides, floated `off` metres outward
function patch(x0: Edge, x1: Edge, u0: number, u1: number, off: number, nx = 14, nu = 8, xs?: number[]) {
  const pos: number[] = [], idx: number[] = [], p = new THREE.Vector3(), n = new THREE.Vector3();
  const fx = (e: Edge, u: number) => (typeof e === 'number' ? e : e(u));
  if (xs) nx = xs.length - 1;   // a long patch can sit on the skin's own stations, so it follows the wheel arches exactly
  for (const side of [1, -1]) {
    const base = pos.length / 3;
    for (let i = 0; i <= nx; i++) for (let j = 0; j <= nu; j++) {
      const u = lerp(u0, u1, j / nu), x = xs ? xs[i] : lerp(fx(x0, u), fx(x1, u), i / nx);
      S(x, u, side, p); N(x, u, side, n); pos.push(p.x + n.x * off, p.y + n.y * off, p.z + n.z * off);
    }
    for (let i = 0; i < nx; i++) for (let j = 0; j < nu; j++) {
      const a = base + i * (nu + 1) + j, b = a + nu + 1, c = b + 1, d = a + 1;
      if (side > 0) idx.push(a, b, d, b, c, d); else idx.push(a, d, b, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

function wheel(alloyOut: THREE.BufferGeometry[], tyreOut: THREE.BufferGeometry[], darkOut: THREE.BufferGeometry[], x: number, z: number, side: number) {
  const place = (g: THREE.BufferGeometry) => { if (side < 0) g.rotateY(Math.PI); g.translate(x - L / 2, RW, z); return g.index ? g.toNonIndexed() : g; };
  // tyre: a turned section with a square shoulder and a slightly crowned tread; the wheel's axle lies along z
  const tp = [[0.236, -0.1], [0.262, -0.113], [0.318, -0.114], [0.341, -0.098], [0.35, -0.062], [0.35, 0.062], [0.341, 0.098], [0.318, 0.114], [0.262, 0.113], [0.236, 0.1]].map((q) => new THREE.Vector2(q[0], q[1]));
  tyreOut.push(place(new THREE.LatheGeometry(tp, 44).rotateX(Math.PI / 2)));
  // rim: barrel, lip, five pairs of spokes dished in from the lip to the hub, and a plain centre cap
  const rp = [[0.236, -0.1], [0.224, -0.092], [0.214, -0.02], [0.214, 0.07], [0.228, 0.094], [0.24, 0.1]].map((q) => new THREE.Vector2(q[0], q[1]));
  alloyOut.push(place(new THREE.LatheGeometry(rp, 44).rotateX(Math.PI / 2)));
  for (let k = 0; k < 5; k++) for (const tw of [-0.115, 0.115]) {
    const sp = new THREE.BoxGeometry(0.03, 0.178, 0.022);
    sp.translate(0, 0.135, 0); sp.rotateX(-0.2); sp.translate(0, 0, 0.083);
    sp.rotateZ((k * Math.PI * 2) / 5 + tw);
    alloyOut.push(place(sp));
  }
  alloyOut.push(place(new THREE.CylinderGeometry(0.062, 0.07, 0.03, 28).rotateX(Math.PI / 2).translate(0, 0, 0.066)));
  darkOut.push(place(new THREE.CylinderGeometry(0.165, 0.165, 0.018, 36).rotateX(Math.PI / 2).translate(0, 0, 0.012)));   // brake disc
  darkOut.push(place(new THREE.CylinderGeometry(0.21, 0.21, 0.01, 36).rotateX(Math.PI / 2).translate(0, 0, -0.03)));      // the dark back of the wheel
}

export function buildCar(colour = 0x9da3a4) {
  const g = new THREE.Group();
  g.name = 'car_for_scale';
  const paint = new THREE.MeshPhysicalMaterial({ color: colour, metalness: 0.55, roughness: 0.42, clearcoat: 1, clearcoatRoughness: 0.05 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x10171a, metalness: 0.4, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a1b1c, roughness: 0.72, metalness: 0.1 });
  const gap = new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.9 });
  const tyre = new THREE.MeshStandardMaterial({ color: 0x131313, roughness: 0.94 });
  const alloy = new THREE.MeshStandardMaterial({ color: 0xb4b8bb, roughness: 0.28, metalness: 0.92 });
  const lamp = new THREE.MeshPhysicalMaterial({ color: 0xeef0ee, roughness: 0.12, metalness: 0.3, clearcoat: 1, emissive: 0x2a2924 });
  const tail = new THREE.MeshPhysicalMaterial({ color: 0x8a1212, roughness: 0.2, clearcoat: 1, emissive: 0x180202 });
  const mesh = (parts: THREE.BufferGeometry[], m: THREE.Material, name: string) => {
    const o = new THREE.Mesh(mergeGeometries(parts.map((p) => { const q = p.index ? p.toNonIndexed() : p; q.deleteAttribute('uv'); return q; }))!, m);
    o.name = name; o.castShadow = o.receiveShadow = true; g.add(o); return o;
  };

  mesh([skin()], paint, 'car_body');

  // glass: windscreen, rear screen, three side lights a side; the screens are one sheet each across the car
  const U0 = 7.1, U1 = 7.88, rake = (a: number, b: number) => (u: number) => lerp(a, b, (u - U0) / (U1 - U0));
  const gl: THREE.BufferGeometry[] = [
    patch(1.34, 1.985, 8.14, 10, 0.004, 12, 9), patch(3.995, 4.235, 8.14, 10, 0.004, 8, 9),
    patch(rake(1.5, 1.99), 2.345, U0, U1, 0.004, 12, 6), patch(2.445, 3.345, U0, U1, 0.004, 10, 6), patch(3.445, rake(4.03, 3.9), U0, U1, 0.004, 8, 6),
  ];
  mesh(gl, glass, 'car_glass');

  // dark parts: lower cladding and arch surrounds, wheel wells, the pillars between the side lights, door gaps, grille
  const dk: THREE.BufferGeometry[] = [
    patch(0, L, 1.02, 4.3, 0.005, 0, 12, stations().filter((x) => x >= 0.012 && x <= L - 0.012)),
    patch(2.345, 2.445, U0 - 0.02, U1 + 0.02, 0.0035, 2, 6), patch(3.345, 3.445, U0 - 0.02, U1 + 0.02, 0.0035, 2, 6),
  ];
  const gp: THREE.BufferGeometry[] = [];
  for (const x of [1.335, 2.395, 3.3]) gp.push(patch(x - 0.004, x + 0.004, 4.32, 7.05, 0.0025, 1, 22));
  gp.push(patch(0.3, 1.27, 6.82, 6.9, 0.0025, 20, 1));                       // bonnet edge
  gp.push(patch(1.262, 1.272, 6.9, 10, 0.0025, 1, 16));                       // back of the bonnet, under the screen
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, r = 0) => { const b = new THREE.BoxGeometry(w, h, d); if (r) b.rotateZ(r); return b.translate(x - L / 2, y, z); };
  dk.push(box(0.03, 0.14, 0.6, 0.0, 0.57, 0), box(0.03, 0.09, 0.92, 0.0, 0.415, 0));                        // grille and lower intake
  dk.push(box(0.03, 0.11, 1.04, L, 0.46, 0));                                                                // rear lower trim
  mesh(dk, dark, 'car_trim');
  mesh(gp, gap, 'car_gaps');

  // lamps wrap the corners, cut from the skin like the glass
  mesh([patch(0.006, 0.3, 5.42, 6.3, 0.005, 12, 5), box(0.02, 0.05, 0.27, -0.004, 0.6, 0.455), box(0.02, 0.05, 0.27, -0.004, 0.6, -0.455)], lamp, 'car_headlamps');
  mesh([patch(L - 0.3, L - 0.006, 5.75, 6.62, 0.005, 12, 5), box(0.02, 0.035, 1.16, L + 0.004, 0.8, 0)], tail, 'car_taillamps');
  // a blank plate front and back: no text
  mesh([box(0.012, 0.11, 0.46, -0.016, 0.44, 0), box(0.012, 0.11, 0.46, L + 0.016, 0.62, 0)], new THREE.MeshStandardMaterial({ color: 0xe9e7df, roughness: 0.5 }), 'car_plates');

  // mirrors, door handles, roof rails
  const bits: THREE.BufferGeometry[] = [], bright: THREE.BufferGeometry[] = [], p = new THREE.Vector3(), n = new THREE.Vector3();
  for (const side of [1, -1]) {
    S(1.5, 6.96, side, p); N(1.5, 6.4, side, n);
    const cup = new THREE.SphereGeometry(1, 20, 14).scale(0.1, 0.07, 0.055); cup.translate(p.x + 0.04, p.y + 0.055, p.z + n.z * 0.115); bits.push(cup);
    const arm = new THREE.BoxGeometry(0.06, 0.02, 0.1); arm.translate(p.x + 0.03, p.y + 0.02, p.z + n.z * 0.05); bits.push(arm);
    for (const x of [2.2, 3.2]) { S(x, 6.5, side, p); N(x, 6.5, side, n); bright.push(new THREE.BoxGeometry(0.17, 0.024, 0.022).translate(p.x, p.y, p.z + n.z * 0.012)); }
    const rail: THREE.Vector3[] = [];
    for (let x = 2.2; x <= 3.86; x += 0.1) { S(x, 8.12, side, p); N(x, 8.12, side, n); rail.push(new THREE.Vector3(p.x, p.y + 0.03, p.z)); }
    bits.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rail), 24, 0.013, 8, false));
    for (const x of [2.22, 3.84]) { S(x, 8.12, side, p); bits.push(new THREE.BoxGeometry(0.06, 0.03, 0.022).translate(p.x, p.y + 0.014, p.z)); }
  }
  mesh(bits, dark, 'car_fittings');

  const al: THREE.BufferGeometry[] = [], ty: THREE.BufferGeometry[] = [], wd: THREE.BufferGeometry[] = [];
  for (const x of [XF, XR]) for (const side of [1, -1]) wheel(al, ty, wd, x, side * (halfW(x) - 0.14), side);
  mesh(ty, tyre, 'car_tyres'); mesh([...al, ...bright], alloy, 'car_alloys'); mesh(wd, gap, 'car_wheel_backs');

  g.userData = { kind: 'car', name: 'Car, for scale', source: 'assumed', note: `a generic ${L} m car to read the car bay against; modelled in code, no make or model intended, and not part of the design` };
  g.traverse((o) => { o.userData.kind ??= 'car'; o.userData.name ??= 'Car, for scale'; o.userData.source ??= 'assumed'; });
  return g;
}
