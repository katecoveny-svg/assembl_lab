// Two pieces for the photoreal look, both built in code and both proposed (not from the drawings), found and placed
// from the furniture already in the model (skipped if it is not there):
//  - the asset library's folded throw (library/pieces.ts throwBlanket: three layers with height-field wrinkles, a
//    chunky knit texture) on the end seat of the sofa, in place of the plainer throw the fit-out puts over the arm;
//  - a sculpted stoneware vessel on the coffee table: a signed-distance shape (vessel.ts) meshed by the library's
//    marching cubes, in the library's crackled glaze.
import * as THREE from 'three/webgpu';
import type { App } from '../app';
import { throwBlanket } from '../library/pieces.ts';
import { fromSdf } from '../library/geo.ts';
import { glazeMat } from '../library/mats.ts';
import { mesh as sdfMesh } from '../library/sdf.ts';
import { vesselSDF, VESSEL_BOX } from './vessel.ts';

const added: THREE.Object3D[] = [];
const hidden: THREE.Object3D[] = [];

export function addProps(app: App) {
  const model = app.built.layers.find((l) => l.id === 'model')?.object;
  if (!model) return { props: 0 };
  const throws: THREE.Mesh[] = [];
  let sofa: THREE.Box3 | null = null, table: THREE.Box3 | null = null;
  const living = new THREE.Box3(new THREE.Vector3(0, -1, 2.5), new THREE.Vector3(5.2, 3, 7.7));
  model.updateMatrixWorld(true);
  model.traverse((o) => {
    const m = (o as THREE.Mesh).isMesh ? ((o as THREE.Mesh).material as THREE.Material) : null;
    if (!m || Array.isArray(m)) return;
    const b = new THREE.Box3().setFromObject(o);
    if (!living.containsPoint(b.getCenter(new THREE.Vector3()))) return;
    if (m.name === 'wool_throw_rust') throws.push(o as THREE.Mesh);
    if (m.name === 'boucle_wool_ivory' && b.max.x - b.min.x > 3) sofa = (sofa ?? b.clone()).union(b);
    if (m.name === 'veincut_travertine' && b.max.y > 0.3 && b.max.x - b.min.x > 0.7) table = b.clone();
  });
  const group = new THREE.Group(); group.name = 'photoreal_props';
  let n = 0, tris = 0;
  if (sofa) {
    const S = sofa as THREE.Box3;
    const t = throwBlanket({ colour: 0x9c5a40 });
    // on the right-hand seat cushion, by the arm, square to it and well back from the front edge; set a few millimetres
    // into the crowned cushion, so it rests on it rather than hovering at the edges
    t.position.set(S.max.x - 0.5, S.min.y + 0.36, S.min.z + 0.56);
    t.rotation.y = Math.PI / 2 + 0.06;
    t.traverse((o) => { o.castShadow = o.receiveShadow = true; });
    t.userData = { ...t.userData, source: 'proposed', note: 'folded throw from the asset library, built in code' };
    group.add(t); n++;
    for (const x of throws) if (x.visible) { x.visible = false; hidden.push(x); }
  }
  if (table) {
    const T = table as THREE.Box3;
    const m = sdfMesh(vesselSDF(0.28), VESSEL_BOX.min, VESSEL_BOX.max, 0.004);
    const v = new THREE.Mesh(fromSdf(m), glazeMat(0xc9bba3, { crackle: 0.7, gloss: 0.5 }));
    v.name = 'photoreal_vessel'; v.castShadow = v.receiveShadow = true;
    v.position.set(T.min.x + 0.2, T.max.y, T.min.z + 0.22);
    v.rotation.y = 0.6;
    v.userData = { source: 'proposed', note: 'vessel: sculpted as a signed-distance shape, meshed by marching cubes', element: { type: 'decor', name: 'Stoneware vessel' } };
    tris += m.indices.length / 3;
    group.add(v); n++;
  }
  if (n) { model.add(group); added.push(group); group.updateMatrixWorld(true); }
  return { props: n, vesselTris: tris };
}

export function removeProps(_app: App) {
  for (const o of added.splice(0)) { o.parent?.remove(o); o.traverse((x) => { if ((x as THREE.Mesh).name === 'photoreal_vessel') (x as THREE.Mesh).geometry.dispose(); }); }
  for (const o of hidden.splice(0)) o.visible = true;
}
