// Reversible architectural presentation detail layer (entry realism pass):
// Adds real edge depth, window/door reveals (115 mm), slender charcoal-bronze surrounds (38 mm face, lifted above
// pure black so joinery detail never crushes), and vertical cladding / roof-seam depth ribs as SEPARATE meshes.
//
// Strict invariant: NEVER mutates source IFC/GLB geometry, and tags every mesh with
// `presentationOnly: true` and `excludeFromClash: true` so geometry, measurement and clash calculations ignore it.

import * as THREE from 'three/webgpu';

export interface PresentationElementInput {
  el: THREE.Object3D;
  cls: string;
  meshes: { mesh: THREE.Mesh; finish: string }[];
}

export interface PresentationDetailResult {
  group: THREE.Group;
  stats: { reveals: number; claddingRibs: number; triangles: number; skippedForPhone: boolean };
  setVisible(on: boolean): void;
  dispose(): void;
}

const PRESENTATION_USERDATA = Object.freeze({
  kind: 'context',
  source: 'proposed',
  presentationOnly: true,
  excludeFromClash: true,
  excludeFromMeasurement: true,
});

/** Tag a presentation mesh/group so measurement, geometry export and clash calculators skip it. */
export function isPresentationOnly(o: THREE.Object3D | null | undefined): boolean {
  let cur: THREE.Object3D | null | undefined = o;
  while (cur) {
    if (cur.userData?.presentationOnly === true || cur.userData?.excludeFromClash === true) return true;
    cur = cur.parent;
  }
  return false;
}

/**
 * Build separate reversible presentation meshes (reveals, frames, cladding depth ribs) from measured source meshes.
 * On phones / low-tier devices, heavy cladding rib instancing is skipped automatically to preserve frame rate.
 */
export function buildPresentationDetail(
  sourceRoot: THREE.Object3D,
  elements: PresentationElementInput[],
  { phone = false, lowTier = false, maxRibs = 420 }: { phone?: boolean; lowTier?: boolean; maxRibs?: number } = {},
): PresentationDetailResult {
  const group = new THREE.Group();
  group.name = 'dress_presentation_detail';
  group.userData = {
    ...PRESENTATION_USERDATA,
    name: 'Edge depth, frames & reveals (presentation only)',
    note: 'Reversible presentation meshes (115 mm reveals, slender non-crushed dark frames, cladding depth ribs). Kept separate from source geometry, measurements and clash checks.',
  };

  sourceRoot.updateMatrixWorld(true);
  const invRoot = new THREE.Matrix4().copy(sourceRoot.matrixWorld).invert();

  // Lifted charcoal-bronze joinery albedo (#2b2d31 instead of #000) so edges catch sky specular instead of crushing black.
  const revealMat = new THREE.MeshPhysicalMaterial({
    name: 'presentation_reveal_frame',
    color: new THREE.Color(0x2b2d31),
    roughness: 0.36,
    metalness: 0.42,
    clearcoat: 0.14,
    clearcoatRoughness: 0.32,
    envMapIntensity: 1.15,
  });
  const ribMat = new THREE.MeshStandardMaterial({
    name: 'presentation_cladding_rib',
    color: new THREE.Color(0x3a3531),
    roughness: 0.62,
    metalness: 0.12,
    envMapIntensity: 0.95,
  });

  const barGeo = new THREE.BoxGeometry(1, 1, 1);
  const v = new THREE.Vector3();
  const revealBoxes: THREE.Matrix4[] = [];
  const ribBoxes: THREE.Matrix4[] = [];
  const skipRibs = phone || lowTier;

  for (const item of elements) {
    const isOpening = item.cls === 'IfcWindow' || item.cls === 'IfcDoor' || item.cls === 'IfcCurtainWall' || item.cls === 'IfcPlate';
    const hasGlassOrDoor = item.meshes.some((m) => m.finish === 'glass' || m.finish === 'door');
    if (isOpening && hasGlassOrDoor) {
      const pts: [number, number, number][] = [];
      for (const m of item.meshes) {
        if (m.finish !== 'glass' && m.finish !== 'door') continue;
        const pos = m.mesh.geometry.getAttribute('position');
        if (!pos) continue;
        const step = Math.max(1, Math.floor(pos.count / 240));
        for (let i = 0; i < pos.count; i += step) {
          v.fromBufferAttribute(pos, i).applyMatrix4(m.mesh.matrixWorld);
          pts.push([v.x, v.y, v.z]);
        }
      }
      if (pts.length >= 4) {
        let cx = 0, cz = 0, y0 = Infinity, y1 = -Infinity;
        for (const q of pts) { cx += q[0]; cz += q[2]; y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
        cx /= pts.length; cz /= pts.length;
        let sxx = 0, szz = 0, sxz = 0;
        for (const q of pts) { const dx = q[0] - cx, dz = q[2] - cz; sxx += dx * dx; szz += dz * dz; sxz += dx * dz; }
        const ang = 0.5 * Math.atan2(2 * sxz, sxx - szz), ux = Math.cos(ang), uz = Math.sin(ang);
        let a0 = Infinity, a1 = -Infinity, t0 = Infinity, t1 = -Infinity;
        for (const q of pts) {
          const dx = q[0] - cx, dz = q[2] - cz, a = dx * ux + dz * uz, t = -dx * uz + dz * ux;
          a0 = Math.min(a0, a); a1 = Math.max(a1, a); t0 = Math.min(t0, t); t1 = Math.max(t1, t);
        }
        const W = a1 - a0, H = y1 - y0;
        if (W >= 0.3 && H >= 0.3 && W <= 12 && H <= 8) {
          // 115 mm physical reveal depth & 38 mm slender surround (per entry-realism standard)
          const face = 0.038, revealDepth = Math.max(0.115, t1 - t0 + 0.075);
          const mid = (a0 + a1) / 2, tm = (t0 + t1) / 2;
          const centre = new THREE.Vector3(cx + ux * mid - uz * tm, 0, cz + uz * mid + ux * tm);
          const baseM = new THREE.Matrix4().multiplyMatrices(
            invRoot,
            new THREE.Matrix4().compose(centre, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -ang), new THREE.Vector3(1, 1, 1)),
          );
          const addBar = (bw: number, bh: number, along: number, up: number) => {
            const loc = new THREE.Matrix4().compose(new THREE.Vector3(along, up, 0), new THREE.Quaternion(), new THREE.Vector3(bw, bh, revealDepth));
            revealBoxes.push(new THREE.Matrix4().multiplyMatrices(baseM, loc));
          };
          addBar(W + face * 2, face, 0, y1 + face * 0.5);
          if (item.cls !== 'IfcDoor') addBar(W + face * 2, face * 1.35, 0, y0 - face * 0.68);
          addBar(face, H + face, -W * 0.5 - face * 0.5, (y0 + y1) * 0.5);
          addBar(face, H + face, W * 0.5 + face * 0.5, (y0 + y1) * 0.5);
        }
      }
    }

    // Subtle vertical cladding batten / folded-profile depth ribs on vertical timberCladding faces (desktop only)
    if (!skipRibs && ribBoxes.length < maxRibs) {
      for (const m of item.meshes) {
        if (m.finish !== 'timberCladding' || ribBoxes.length >= maxRibs) continue;
        const g = m.mesh.geometry;
        if (!g.boundingBox) g.computeBoundingBox();
        const b = g.boundingBox!.clone().applyMatrix4(m.mesh.matrixWorld);
        const sx = b.max.x - b.min.x, sy = b.max.y - b.min.y, sz = b.max.z - b.min.z;
        if (sy < 1.2 || Math.max(sx, sz) < 1.2 || Math.min(sx, sz) > 0.6) continue;
        const alongX = sx >= sz;
        const span = alongX ? sx : sz, pitch = 0.24;
        const count = Math.min(Math.floor(span / pitch) - 1, maxRibs - ribBoxes.length);
        for (let k = 1; k <= count; k++) {
          const offset = k * pitch;
          const px = alongX ? b.min.x + offset : (b.min.x + b.max.x) * 0.5;
          const pz = alongX ? (b.min.z + b.max.z) * 0.5 : b.min.z + offset;
          const worldM = new THREE.Matrix4().compose(
            new THREE.Vector3(px, (b.min.y + b.max.y) * 0.5, pz),
            new THREE.Quaternion(),
            new THREE.Vector3(alongX ? 0.022 : sz + 0.028, sy - 0.04, alongX ? sx > 0 ? sz + 0.028 : 0.028 : 0.022),
          );
          ribBoxes.push(new THREE.Matrix4().multiplyMatrices(invRoot, worldM));
        }
      }
    }
  }

  let triangles = 0;
  if (revealBoxes.length) {
    const inst = new THREE.InstancedMesh(barGeo, revealMat, revealBoxes.length);
    revealBoxes.forEach((m, i) => inst.setMatrixAt(i, m));
    inst.instanceMatrix.needsUpdate = true;
    inst.castShadow = !lowTier;
    inst.receiveShadow = true;
    inst.name = 'presentation_reveals';
    inst.userData = { ...PRESENTATION_USERDATA, name: 'Window & door reveals (115 mm, presentation only)' };
    group.add(inst);
    triangles += revealBoxes.length * 12;
  }
  if (ribBoxes.length) {
    const inst = new THREE.InstancedMesh(barGeo, ribMat, ribBoxes.length);
    ribBoxes.forEach((m, i) => inst.setMatrixAt(i, m));
    inst.instanceMatrix.needsUpdate = true;
    inst.castShadow = true;
    inst.receiveShadow = true;
    inst.name = 'presentation_cladding_ribs';
    inst.userData = { ...PRESENTATION_USERDATA, name: 'Cladding seam depth ribs (presentation only)' };
    group.add(inst);
    triangles += ribBoxes.length * 12;
  }

  return {
    group,
    stats: { reveals: revealBoxes.length, claddingRibs: ribBoxes.length, triangles, skippedForPhone: skipRibs },
    setVisible(on: boolean) {
      group.visible = on;
    },
    dispose() {
      barGeo.dispose();
      revealMat.dispose();
      ribMat.dispose();
      group.removeFromParent();
    },
  };
}
