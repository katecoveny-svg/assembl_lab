// The film opens the living room's bi-fold doors (drawn closed in the model) as the camera comes along the deck, so it
// passes through an open doorway rather than through glass and the meeting stile. The leaves fold to the two jambs:
// every joinery and glass vertex between the jambs is drawn along u towards the nearer jamb, leaving each stack about
// 15% of its half's width, as folded bi-fold leaves stand. Moving only along u keeps the head and the sill track
// straight (their vertices slide along them) while the leaves, stiles and glass close up at the jambs. Their baked light travels
// with them. Opening, model frame (x = u, z = v): from the plan, "Living bi-fold doors" in the east wall at v = 7.7,
// u 0.87–4.47, head 2.08.
import * as THREE from 'three/webgpu';

export interface Opening { u0: number; u1: number; v: number; head: number }
interface Part { mesh: THREE.Mesh; world: Float32Array; inv: THREE.Matrix4; pos: THREE.BufferAttribute; side: number }

export class Bifold {
  parts: Part[] = [];
  o: Opening;
  constructor(model: THREE.Object3D, o: Opening) {
    this.o = o;
    const box = new THREE.Box3(new THREE.Vector3(o.u0 - 0.05, -0.05, o.v - 0.2), new THREE.Vector3(o.u1 + 0.05, o.head + 0.1, o.v + 0.2));
    model.updateMatrixWorld(true);
    const v = new THREE.Vector3();
    model.traverse((x) => {
      const m = x as THREE.Mesh;
      if (!m.isMesh || m.isInstancedMesh || !m.visible) return;
      const mat = m.material as THREE.Material;
      if (!mat || Array.isArray(mat) || !/alumin|glass|joinery|door|frame/i.test(`${mat.name} ${m.name}`)) return;
      const bb = new THREE.Box3().setFromObject(m);
      // only the opening's own joinery and glass (not the deck balustrade that runs past it)
      if (!box.containsBox(bb)) return;
      // a leaf folds to the jamb on its own side (decided by the leaf as a whole, so a meeting stile never splits);
      // the outer frame, which spans the opening, is moved vertex by vertex (only its head and sill slide)
      const span = (bb.max.x - bb.min.x) / (o.u1 - o.u0), cx = (bb.min.x + bb.max.x) / 2;
      const side = span > 0.8 ? 0 : cx < (o.u0 + o.u1) / 2 ? -1 : 1;
      // its own copy of the geometry (glass and frames may share theirs with other openings)
      m.geometry = m.geometry.clone();
      const p = m.geometry.attributes.position as THREE.BufferAttribute, w = new Float32Array(p.count * 3);
      let inside = 0;
      for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld); w[i * 3] = v.x; w[i * 3 + 1] = v.y; w[i * 3 + 2] = v.z; if (this.moves(v.x, v.y, v.z)) inside++; }
      if (inside) this.parts.push({ mesh: m, world: w, inv: m.matrixWorld.clone().invert(), pos: p, side });
    });
  }
  private moves(x: number, y: number, z: number) {
    const o = this.o;
    return x > o.u0 + 0.07 && x < o.u1 - 0.07 && y > -0.1 && y < o.head + 0.1 && Math.abs(z - o.v) < 0.18;
  }
  /** k: 0 closed (as drawn), 1 folded open */
  set(k: number) {
    const o = this.o, mid = (o.u0 + o.u1) / 2, v = new THREE.Vector3();
    for (const P of this.parts) {
      const w = P.world;
      for (let i = 0; i < P.pos.count; i++) {
        let x = w[i * 3]; const y = w[i * 3 + 1], z = w[i * 3 + 2];
        if (this.moves(x, y, z)) { const left = P.side ? P.side < 0 : x < mid, j = left ? o.u0 + 0.07 : o.u1 - 0.07; x = x + (j + (x - j) * 0.15 - x) * k; }
        v.set(x, y, z).applyMatrix4(P.inv);
        P.pos.setXYZ(i, v.x, v.y, v.z);
      }
      P.pos.needsUpdate = true;
      P.mesh.geometry.computeBoundingSphere();
    }
  }
}
