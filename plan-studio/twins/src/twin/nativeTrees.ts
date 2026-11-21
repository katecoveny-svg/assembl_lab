// Native bush built in code, the way the lab's birds have their kōwhai and mānuka sprigs: real
// branching wood and real leaf blades with their own colours, no smooth lumps and no leaf pictures.
// Kānuka (slender leaning stems, a high fine crown, white with flower in December), pōhutukawa
// (several spreading trunks, a broad dark dome, crimson in December) and ponga beneath.
// One tree is modelled per variant and drawn many times, sized to each tree top in the survey.
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createArchedBladeGeometry } from './nzNativeFlora';
import { createPongaFrondTexture } from './pbrTextures';

type Tree = [number, number, number, number, string];
const UP = new THREE.Vector3(0, 1, 0);
const rng32 = (a: number) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

/** a tapering limb along a curve, with bark colour per vertex */
function limb(curve: THREE.Curve<THREE.Vector3>, r0: number, r1: number, col: THREE.Color, segs: number, radial: number, rnd: () => number) {
  const fr = curve.computeFrenetFrames(segs, false), pos: number[] = [], nor: number[] = [], c: number[] = [], idx: number[] = [], p = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const u = i / segs, r = r0 + (r1 - r0) * u;
    curve.getPointAt(u, p);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      n.copy(fr.normals[i]).multiplyScalar(Math.cos(a)).addScaledVector(fr.binormals[i], Math.sin(a));
      pos.push(p.x + n.x * r, p.y + n.y * r, p.z + n.z * r); nor.push(n.x, n.y, n.z);
      const k = 0.82 + 0.3 * rnd() + 0.12 * Math.cos(a * 3 + u * 9);
      c.push(col.r * k, col.g * k, col.b * k);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) { const a = i * (radial + 1) + j, b = a + radial + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); g.setIndex(idx);
  return g;
}

/** one leaf blade along +Z, face up +Y, cupped and arched; drawn double-sided */
function blade(len: number, half: number, col: THREE.Color, tip: THREE.Color, arch: number, cup: number, S = 2) {
  const pos: number[] = [], c: number[] = [], idx: number[] = [];
  for (let i = 0; i <= S; i++) {
    const u = i / S, w = S === 1 ? half * (i === 0 ? 0.55 : 0.8) : half * Math.pow(Math.max(0, Math.sin(Math.min(1, u * 0.9 + 0.1) * Math.PI)), 0.7), y = arch * len * (Math.sin(u * Math.PI) * 0.5 - u * u * 0.6), k = new THREE.Color().lerpColors(col, tip, u);
    for (const v of [-1, 0, 1]) { pos.push(v * w, y + cup * Math.abs(v) * w, u * len); const m = v === 0 ? 1.12 : 0.94; c.push(k.r * m, k.g * m, k.b * m); }
  }
  for (let i = 0; i < S; i++) for (let j = 0; j < 2; j++) { const a = i * 3 + j, b = a + 3; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
/** turn a +Z-built part to run along `dir` and move it to `at` */
function put(g: THREE.BufferGeometry, at: THREE.Vector3, dir: THREE.Vector3, roll: number, s = 1) {
  const z = dir.clone().normalize(), x = new THREE.Vector3().crossVectors(UP, z); if (x.lengthSq() < 1e-6) x.set(1, 0, 0); x.normalize();
  const m = new THREE.Matrix4().makeBasis(x, new THREE.Vector3().crossVectors(z, x), z).multiply(new THREE.Matrix4().makeRotationZ(roll)).scale(new THREE.Vector3(s, s, s)).setPosition(at);
  return g.applyMatrix4(m);
}
const C = (r: number, g: number, b: number) => new THREE.Color(r, g, b);

type Kind = 'kanuka' | 'pohutukawa';
interface Kit { wood: THREE.BufferGeometry; leaves: THREE.BufferGeometry; flowers: THREE.BufferGeometry | null; H: number; R: number }

/** a spray: the leafy end of a twig, built along +Z */
function spray(kind: Kind, rnd: () => number, big: number, blades: number, flower: boolean, S = 2): { leaves: THREE.BufferGeometry[]; flowers: THREE.BufferGeometry[] } {
  const leaves: THREE.BufferGeometry[] = [], flowers: THREE.BufferGeometry[] = [];
  if (kind === 'kanuka') {
    // fine, soft, grey-green: many narrow blades set along the twig, each standing in for a leafy twiglet
    const L = 0.62 * big;
    for (let i = 0; i < blades; i++) {
      const t = (i + 0.4) / blades, a = i * 2.4 + rnd() * 0.8, out = 0.55 + rnd() * 0.5;
      const d = new THREE.Vector3(Math.cos(a) * Math.sin(out), Math.sin(a) * Math.sin(out), Math.cos(out));
      const tone = 0.85 + rnd() * 0.35, white = flower && rnd() < 0.45;
      const col = white ? C(0.82, 0.84, 0.76) : C(0.24 * tone, 0.36 * tone, 0.2 * tone), tip = white ? C(0.97, 0.97, 0.92) : C(0.4 * tone, 0.52 * tone, 0.3 * tone);
      leaves.push(put(blade((0.3 + rnd() * 0.16) * big, 0.05 * big, col, tip, 0.25, 0.3, S), new THREE.Vector3(0, 0, t * L), d, rnd() * 6.28));
    }
  } else {
    // a rosette of oval leaves, dark and leathery, with a crimson brush of stamens at its heart in flower
    for (let i = 0; i < blades; i++) {
      const a = (i / blades) * 6.283 + rnd() * 0.5, out = 0.75 + rnd() * 0.45;
      const d = new THREE.Vector3(Math.cos(a) * Math.sin(out), Math.sin(a) * Math.sin(out), Math.cos(out));
      const tone = 0.8 + rnd() * 0.4;
      leaves.push(put(blade((0.3 + rnd() * 0.1) * big, 0.085 * big, C(0.1 * tone, 0.2 * tone, 0.09 * tone), C(0.2 * tone, 0.32 * tone, 0.15 * tone), 0.2, 0.22, S), new THREE.Vector3(0, 0, 0.05 * big), d, rnd() * 0.6 - 0.3));
    }
    if (flower) for (let i = 0; i < 6; i++) {
      const a = (i / 6) * 6.283, out = 0.25 + rnd() * 0.75, d = new THREE.Vector3(Math.cos(a) * Math.sin(out), Math.sin(a) * Math.sin(out), Math.cos(out));
      flowers.push(put(blade(0.13 * big, 0.016 * big, C(0.5, 0.02, 0.05), C(0.9, 0.1, 0.12), 0, 0, 1), new THREE.Vector3(0, 0, 0.1 * big), d, rnd() * 6.28));
    }
  }
  return { leaves, flowers };
}

/** one whole tree: wood and foliage as two geometries, base at the origin */
function kit(kind: Kind, seed: number, level: 0 | 1 | 2): Kit {
  // 0: near, full detail; 1: near on a phone; 2: distant
  const light = level === 2;
  const rnd = rng32(seed * 7919 + (kind === 'kanuka' ? 11 : 97));
  const wood: THREE.BufferGeometry[] = [], leaves: THREE.BufferGeometry[] = [], flowers: THREE.BufferGeometry[] = [];
  const bark = kind === 'kanuka' ? C(0.27, 0.22, 0.18) : C(0.17, 0.15, 0.13);
  const depthMax = light ? 2 : 3, big = light ? 3.9 : level === 1 ? 1.9 : 1.2, blades = light ? 3 : level === 1 ? 5 : kind === 'kanuka' ? 10 : 8, S = level === 0 ? 2 : 1;
  const tips: THREE.Vector3[] = [];
  const perp = (d: THREE.Vector3) => { const a = Math.abs(d.y) < 0.9 ? UP : new THREE.Vector3(1, 0, 0), x = new THREE.Vector3().crossVectors(d, a).normalize(), y = new THREE.Vector3().crossVectors(d, x), t = rnd() * 6.283; return x.multiplyScalar(Math.cos(t)).addScaledVector(y, Math.sin(t)); };
  const grow = (from: THREE.Vector3, dir: THREE.Vector3, len: number, r: number, depth: number) => {
    const bend = perp(dir).multiplyScalar(len * (kind === 'kanuka' ? 0.1 : 0.2)), to = from.clone().addScaledVector(dir, len), mid = from.clone().addScaledVector(dir, len * 0.5).add(bend);
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to), r1 = r * 0.55;
    if (!(light && depth === 0)) wood.push(limb(curve, r, r1, bark, depth >= depthMax ? 5 : 3, depth >= depthMax - 1 ? 7 : 5, rnd));
    const end = curve.getTangentAt(1);
    if (depth === 0) {
      tips.push(to);
      // foliage along the outer part of the twig and at its end
      const n = light ? 2 : level === 1 ? 3 : 5;
      for (let i = 0; i < n; i++) {
        const u = Math.min(1, 0.25 + (0.75 * (i + 1)) / n), p = curve.getPointAt(u), d = i === n - 1 ? end.clone() : end.clone().addScaledVector(perp(end), 0.8).normalize();
        if (kind === 'pohutukawa') d.lerp(UP, 0.35).normalize();
        const s = spray(kind, rnd, big, blades, kind === 'kanuka' ? rnd() < 0.22 : rnd() < 0.3 && d.y > 0.25, S);
        const roll = rnd() * 6.283;
        for (const g of s.leaves) leaves.push(put(g, p, d, roll)); for (const g of s.flowers) flowers.push(put(g, p, d, roll));
      }
      return;
    }
    const kids = rnd() < 0.5 ? 2 : 3;
    for (let k = 0; k < kids; k++) {
      const spread = kind === 'kanuka' ? 0.5 + rnd() * 0.3 : 0.75 + rnd() * 0.35, lift = kind === 'kanuka' ? 0.5 : 0.22;
      const d = end.clone().addScaledVector(perp(end), spread).lerp(UP, lift).normalize();
      grow(to, d, len * (0.66 + rnd() * 0.16), r1 * (0.8 + rnd() * 0.1), depth - 1);
      // leafy side shoots along the upper limbs, so the crown is a mass of leaf with wood glimpsed through it
      if (depth === 1 && level === 0) { const p = curve.getPointAt(0.55 + rnd() * 0.35), sd = end.clone().addScaledVector(perp(end), 1.1).lerp(UP, 0.3).normalize(), sp = spray(kind, rnd, big * 1.15, blades, false, S), roll = rnd() * 6.283; for (const lg of sp.leaves) leaves.push(put(lg, p, sd, roll)); }
    }
  };
  if (kind === 'kanuka') {
    const stems = 1 + (rnd() < 0.55 ? 1 : 0) + (rnd() < 0.2 ? 1 : 0);
    for (let s = 0; s < stems; s++) { const lean = 0.1 + rnd() * 0.2, a = rnd() * 6.283; grow(new THREE.Vector3(Math.cos(a) * 0.12 * s, -0.3, Math.sin(a) * 0.12 * s), new THREE.Vector3(Math.cos(a) * lean, 1, Math.sin(a) * lean).normalize(), 5.2 + rnd() * 1.2, 0.11 - s * 0.015, depthMax); }
  } else {
    const trunks = 3 + (rnd() < 0.5 ? 1 : 0);
    for (let s = 0; s < trunks; s++) { const a = (s / trunks) * 6.283 + rnd() * 0.6, lean = 0.55 + rnd() * 0.35; grow(new THREE.Vector3(Math.cos(a) * 0.25, -0.3, Math.sin(a) * 0.25), new THREE.Vector3(Math.cos(a) * lean, 1, Math.sin(a) * lean).normalize(), 2.6 + rnd() * 0.8, 0.22, depthMax); }
  }
  let H = 0, R = 0; for (const t of tips) { H = Math.max(H, t.y); R = Math.max(R, Math.hypot(t.x, t.z)); }
  return { wood: mergeGeometries(wood)!, leaves: mergeGeometries(leaves)!, flowers: flowers.length ? mergeGeometries(flowers)! : null, H: H + 0.4 * big, R: R + 0.35 * big };
}

/**
 * The bush from a survey's tree tops: [x, z, height, crown radius, colour from the aerial photo].
 * Broad, lower crowns are drawn as pōhutukawa and the rest as kānuka. The survey does not say which is which.
 */
export function nativeBush(trees: Tree[], groundAt: (x: number, z: number) => number, centre: [number, number]): THREE.Group {
  const g = new THREE.Group(); g.name = 'bush_from_survey';
  const lite = matchMedia('(max-width: 760px)').matches;
  const NEAR = lite ? 26 : 32;
  const woodM = new THREE.MeshStandardMaterial({ name: 'bark', vertexColors: true, roughness: 0.95 });
  const leafM = new THREE.MeshStandardMaterial({ name: 'native_foliage', vertexColors: true, roughness: 0.62, side: THREE.DoubleSide, envMapIntensity: 0.6 });
  const flowerM = new THREE.MeshStandardMaterial({ name: 'pohutukawa_flower', vertexColors: true, roughness: 0.7, side: THREE.DoubleSide, emissive: 0x3a0206, emissiveIntensity: 0.25 });
  const rnd = (i: number) => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  const kindOf = (t: Tree): Kind => (t[3] >= 3.6 && t[2] <= 15 ? 'pohutukawa' : 'kanuka');
  const groups = new Map<string, { k: Kit; list: Tree[]; near: boolean }>();
  trees.forEach((t, i) => {
    const near = Math.hypot(t[0] - centre[0], t[1] - centre[1]) < NEAR, kind = kindOf(t), v = Math.floor(rnd(i + 0.5) * 3), key = `${kind}/${v}/${near ? 'n' : 'f'}`;
    let e = groups.get(key); if (!e) groups.set(key, (e = { k: kit(kind, v + 1, !near ? 2 : lite ? 1 : 0), list: [], near }));
    e.list.push(t);
  });
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  for (const { k, list, near } of groups.values()) {
    const wood = new THREE.InstancedMesh(k.wood, woodM, list.length), leaves = new THREE.InstancedMesh(k.leaves, leafM, list.length), fl = k.flowers ? new THREE.InstancedMesh(k.flowers, flowerM, list.length) : null;
    list.forEach(([x, z, h, r, hex], i) => {
      const s = x * 7.3 + z * 3.1, gy = groundAt(x, z);
      q.setFromAxisAngle(UP, rnd(s) * 6.283);
      const sy = Math.max(2.5, h) / k.H, sr = Math.max(sy * 0.75, Math.min(sy * 1.5, (r * 1.2) / k.R));
      m.compose(new THREE.Vector3(x, gy, z), q, new THREE.Vector3(sr, sy, sr));
      wood.setMatrixAt(i, m); leaves.setMatrixAt(i, m); fl?.setMatrixAt(i, m);
      // each tree keeps the hue the aerial photo gives it, lifted out of the photo's own shade
      c.set(`#${hex}`); const l = Math.max(0.05, (c.r + c.g + c.b) / 3), k2 = (0.95 + rnd(s + 3) * 0.5) / (l * 2.6);
      const dim = near ? 1 : 0.72; // distant foliage sits under haze already
      leaves.setColorAt(i, new THREE.Color(Math.min(1.4, 0.45 + c.r * k2 * 0.6) * dim, Math.min(1.4, 0.48 + c.g * k2 * 0.62) * dim, Math.min(1.2, 0.38 + c.b * k2 * 0.5) * dim));
    });
    for (const o of [wood, leaves, fl]) { if (!o) continue; o.instanceMatrix.needsUpdate = true; o.frustumCulled = false; o.castShadow = near; o.receiveShadow = true; g.add(o); }
    if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
  }
  // ponga beneath the canopy near the building, clear of open ground
  {
    const parts: THREE.BufferGeometry[] = [], frond = createArchedBladeGeometry(0.95, 2.2, 0.95, false, 8), e = new THREE.Euler(), mm = new THREE.Matrix4();
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + (i % 2) * 0.22, tier = i % 2, s = tier === 0 ? 1.05 : 0.82; parts.push(frond.clone().applyMatrix4(mm.compose(new THREE.Vector3(0, 1, 0), new THREE.Quaternion().setFromEuler(e.set(0.58 + tier * 0.34, a, 0, 'YXZ')), new THREE.Vector3(s, s, s)))); }
    const fm = new THREE.MeshStandardMaterial({ name: 'ponga_frond', map: createPongaFrondTexture(), alphaTest: 0.35, roughness: 0.68, side: THREE.DoubleSide, color: 0xe2f0cc });
    const tm = new THREE.MeshStandardMaterial({ name: 'ponga_trunk', color: 0x3a2e26, roughness: 0.96 });
    const nearT = trees.filter(([x, z]) => Math.hypot(x - centre[0], z - centre[1]) < NEAR), spots: [number, number, number, number][] = [];
    nearT.forEach(([x, z, h], i) => {
      if (h < 5 || rnd(i * 3.7) < 0.3) return;
      const a = rnd(i * 5.1) * 6.283, d = 1.6 + rnd(i * 2.3) * 1.6, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      if (Math.min(...nearT.map(([tx, tz]) => Math.hypot(tx - px, tz - pz))) < 4.5) spots.push([px, pz, 1.6 + rnd(i * 9.9) * 2.6, 0.95 + rnd(i * 4.4) * 0.5]);
    });
    if (spots.length) {
      const heads = new THREE.InstancedMesh(mergeGeometries(parts)!, fm, spots.length), stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.09, 0.14, 1, 8).translate(0, 0.5, 0), tm, spots.length);
      spots.forEach(([x, z, th, sc], i) => { const gy = groundAt(x, z) - 0.2; q.setFromAxisAngle(UP, rnd(i * 6.1) * 6.283); m.compose(new THREE.Vector3(x, gy + th - sc, z), q, new THREE.Vector3(sc, sc, sc)); heads.setMatrixAt(i, m); m.compose(new THREE.Vector3(x, gy, z), q, new THREE.Vector3(1, th, 1)); stems.setMatrixAt(i, m); });
      heads.castShadow = stems.castShadow = true; heads.receiveShadow = true; heads.frustumCulled = stems.frustumCulled = false; heads.name = 'ponga_fronds'; stems.name = 'ponga_trunks';
      g.add(heads, stems);
    }
  }
  g.userData = { kind: 'planting', name: 'Bush', source: 'survey', note: 'One tree per tree top in the LiDAR canopy: position, height and spread from the survey, hue from the aerial photo. Species are not identified by the survey. The trees are modelled in code as kānuka and pōhutukawa in December flower with ponga beneath, which is typical of regenerating coastal bush here, and are proposed.' };
  return g;
}
