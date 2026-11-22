// Two pieces made for the photoreal look, both built in code and both proposed (not from the drawings):
//  - a wool throw draped over the sofa's arm: a height map of folds laid along a path over the arm, with thickness
//    and a folded-back end, in place of the plainer throw the fit-out puts there;
//  - a sculpted stoneware vessel on the coffee table: a signed-distance shape (lobed, twisting, hollow, rolled lip)
//    turned into a mesh with surface nets.
// They are found and placed from the furniture already in the model; if it is not there they are skipped.
import * as THREE from 'three/webgpu';
import type { App } from '../app';
import { surfaceNets, vesselSDF } from './sdf.ts';

const added: THREE.Object3D[] = [];
const hidden: THREE.Object3D[] = [];

function boxOf(o: THREE.Object3D) { return new THREE.Box3().setFromObject(o); }

/** the throw: a cloth strip over an arm, as a height field on a path. `support(s)` gives the cloth's path (x, y). */
function throwGeometry(path: [number, number][], z0: number, z1: number, seed = 7): THREE.BufferGeometry {
  // resample the path by length
  const L: number[] = [0];
  for (let i = 1; i < path.length; i++) L.push(L[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
  const total = L[L.length - 1];
  const at = (s: number): [number, number, number, number] => {
    let i = 1; while (i < L.length - 1 && L[i] < s) i++;
    const t = (s - L[i - 1]) / (L[i] - L[i - 1] || 1), a = path[i - 1], b = path[i];
    const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
    const tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1;
    return [x, y, -ty / tl, tx / tl]; // point and its outward normal (left of the path direction)
  };
  // smooth the normals along the path a little
  const NS = 160, NT = 96, W = z1 - z0;
  let r = seed >>> 0; const rnd = () => ((r = (Math.imul(r, 1664525) + 1013904223) >>> 0) / 4294967296);
  const folds = Array.from({ length: 7 }, () => ({ z: z0 + rnd() * W, w: 0.012 + rnd() * 0.03, a: 0.006 + rnd() * 0.014, s0: rnd() * total, len: 0.25 + rnd() * 0.5 }));
  const thick = 0.006;
  const pos: number[] = [], nrm: number[] = [], uv: number[] = [], idx: number[] = [];
  const height = (s: number, z: number) => {
    let h = 0;
    for (const f of folds) {
      const along = Math.exp(-(((s - f.s0) / f.len) ** 2));
      h += f.a * along * Math.exp(-(((z - f.z) / f.w) ** 2));
    }
    // soft waves across where the cloth hangs, and a slight slump in the middle of the seat
    h += 0.004 * Math.sin(z * 41 + s * 7) * Math.min(1, s / total * 2) + 0.003 * Math.sin(z * 97 + s * 31);
    // the edges roll a touch
    const e = Math.min(z - z0, z1 - z) / 0.02;
    if (e < 1) h -= 0.006 * (1 - e) * (1 - e);
    return h;
  };
  for (const side of [0, 1]) {
    const base = pos.length / 3;
    for (let i = 0; i <= NS; i++) {
      const s = (i / NS) * total, [x, y, nx, ny] = at(s);
      for (let j = 0; j <= NT; j++) {
        const z = z0 + (j / NT) * W;
        const h = height(s, z) + (side ? 0 : thick);
        pos.push(x + nx * h, y + ny * h, z);
        uv.push(s, z - z0);
        nrm.push(0, 0, 0);
      }
    }
    for (let i = 0; i < NS; i++) for (let j = 0; j < NT; j++) {
      const a = base + i * (NT + 1) + j, b = a + NT + 1;
      if (side === 0) idx.push(a, a + 1, b, b, a + 1, b + 1); else idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  // close the two long edges and the two ends with thin strips
  const ring = (i0: number, j0: number, di: number, dj: number, n: number) => {
    for (let k = 0; k < n; k++) {
      const top0 = (i0 + di * k) * (NT + 1) + (j0 + dj * k), top1 = (i0 + di * (k + 1)) * (NT + 1) + (j0 + dj * (k + 1));
      const off = (NS + 1) * (NT + 1);
      idx.push(top0, top1, top0 + off, top1, top1 + off, top0 + off);
    }
  };
  ring(0, 0, 1, 0, NS); ring(0, NT, 1, 0, NS); ring(0, 0, 0, 1, NT); ring(NS, 0, 0, 1, NT);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function addProps(app: App) {
  const model = app.built.layers.find((l) => l.id === 'model')?.object;
  if (!model) return { props: 0 };
  let throwM: THREE.Material | null = null, glazeM: THREE.Material | null = null;
  const throws: THREE.Mesh[] = [];
  let sofa: THREE.Box3 | null = null, table: THREE.Box3 | null = null;
  const living = new THREE.Box3(new THREE.Vector3(0, -1, 2.5), new THREE.Vector3(5.2, 3, 7.7));
  model.updateMatrixWorld(true);
  model.traverse((o) => {
    const m = (o as THREE.Mesh).isMesh ? ((o as THREE.Mesh).material as THREE.Material) : null;
    if (!m || Array.isArray(m)) return;
    const b = boxOf(o);
    if (!living.containsPoint(b.getCenter(new THREE.Vector3()))) return;
    if (m.name === 'wool_throw_rust') { throws.push(o as THREE.Mesh); throwM = m; }
    if (m.name === 'boucle_wool_ivory' && b.max.x - b.min.x > 3) sofa = (sofa ?? b.clone()).union(b);
    if (m.name === 'veincut_travertine' && b.max.y > 0.3 && b.max.x - b.min.x > 0.7) table = b.clone();
    if (/stoneware_sand_glaze/.test(m.name)) glazeM = m;
  });
  const group = new THREE.Group(); group.name = 'photoreal_props';
  let n = 0;
  if (throwM && sofa) {
    const S = sofa as THREE.Box3;
    // right-hand arm: the throw starts on the seat, rises over the arm and hangs outside it
    const seatY = S.min.y + 0.38, armX0 = S.max.x - 0.23, armX1 = S.max.x, armY = S.min.y + 0.55;
    const path: [number, number][] = [
      [armX0 - 0.42, seatY + 0.01], [armX0 - 0.2, seatY + 0.015], [armX0 - 0.05, seatY + 0.05], [armX0 + 0.005, armY - 0.03],
      [armX0 + 0.05, armY + 0.012], [(armX0 + armX1) / 2, armY + 0.02], [armX1 - 0.04, armY + 0.012], [armX1 + 0.01, armY - 0.04],
      [armX1 + 0.03, armY - 0.14], [armX1 + 0.035, armY - 0.3],
    ];
    const g = throwGeometry(path, S.min.z + 0.42, S.min.z + 0.98);
    const mesh = new THREE.Mesh(g, throwM);
    mesh.name = 'photoreal_throw'; mesh.castShadow = mesh.receiveShadow = true;
    mesh.userData = { source: 'proposed', note: 'throw: folds from a height map, built in code', element: { type: 'furnishing', name: 'Wool throw' } };
    group.add(mesh); n++;
    for (const t of throws) { if (t.visible) { t.visible = false; hidden.push(t); } }
  }
  if (table) {
    const T = table as THREE.Box3;
    const m = surfaceNets(vesselSDF(0.28), [-0.13, -0.02, -0.13], [0.13, 0.3, 0.13], 64);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(m.positions, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(m.normals, 3));
    const uv = new Float32Array((m.positions.length / 3) * 2);
    for (let i = 0; i < uv.length / 2; i++) { uv[i * 2] = Math.atan2(m.positions[i * 3 + 2], m.positions[i * 3]) * 0.1; uv[i * 2 + 1] = m.positions[i * 3 + 1]; }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(new THREE.BufferAttribute(m.indices, 1));
    const mat = glazeM ?? new THREE.MeshStandardMaterial({ color: 0xcfc4b2, roughness: 0.6 });
    const v = new THREE.Mesh(g, mat);
    v.name = 'photoreal_vessel'; v.castShadow = v.receiveShadow = true;
    v.position.set(T.min.x + 0.2, T.max.y, T.min.z + 0.22);
    v.rotation.y = 0.6;
    v.userData = { source: 'proposed', note: 'vessel: sculpted as a signed-distance shape, meshed with surface nets', element: { type: 'decor', name: 'Stoneware vessel' } };
    group.add(v); n++;
  }
  if (n) { model.add(group); added.push(group); group.updateMatrixWorld(true); }
  return { props: n, vesselTris: 0 };
}

export function removeProps(_app: App) {
  for (const o of added.splice(0)) { o.parent?.remove(o); o.traverse((x) => (x as THREE.Mesh).geometry?.dispose?.()); }
  for (const o of hidden.splice(0)) o.visible = true;
}
