// The site as it is now: the existing buildings round a model, drawn as plain blocks (the rules are in contextRules.ts).
import * as THREE from 'three/webgpu';
import { ASSUMED_HEIGHT, heightFromTops, OUTLINE_CREDIT, type Outline, type Tops } from './contextRules';
export { outlinesUrl, parseOutlines, toSceneRings, OUTLINE_CREDIT } from './contextRules';

/** the plain blocks: one extruded outline each, standing on the ground at its lowest corner */
export function contextGroup(items: { o: Outline; ring: number[][] }[], T: Tops | null, yAt: (x: number, z: number) => number, asOf = '') {
  const g = new THREE.Group(); g.name = 'context_buildings';
  const wall = new THREE.MeshStandardMaterial({ name: 'context_render', color: 0xdcd6cc, roughness: 0.92, metalness: 0 });
  const roof = new THREE.MeshStandardMaterial({ name: 'context_roof', color: 0x8c8a86, roughness: 0.8, metalness: 0.05 });
  let measured = 0;
  for (const { o, ring } of items) {
    if (ring.length < 4) continue;
    const hT = heightFromTops(ring, T), h = hT ?? ASSUMED_HEIGHT;
    if (hT != null) measured++;
    const base = Math.min(...ring.map(([x, z]) => yAt(x, z)));
    const shape = new THREE.Shape(ring.map(([x, z]) => new THREE.Vector2(x, -z)));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: h + 0.3, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);   // shape (x, -z) in the xy plane, extruded up y
    const m = new THREE.Mesh(geo, [roof, wall]);
    m.position.y = base - 0.3; m.castShadow = true; m.receiveShadow = true;
    m.userData = { kind: 'context', name: o.name ? `Existing: ${o.name}` : `Existing building${o.use ? ` (${o.use})` : ''}`, source: hT != null ? 'from the survey' : 'assumed',
      note: `Outline from ${OUTLINE_CREDIT}${asOf ? ` (as of ${asOf})` : ''} Height ${hT != null ? `${hT} m: LINZ 1 m LiDAR surface less ground inside the outline (80th percentile)` : `${ASSUMED_HEIGHT} m, assumed: the LiDAR square shown does not reach it`}. Modelled plainly: no roof form or windows.` };
    g.add(m);
  }
  g.userData = { kind: 'context', name: 'Existing buildings', source: 'from the survey', note: `${items.length} existing buildings from LINZ outlines; ${measured} with heights from LiDAR, the rest assumed at ${ASSUMED_HEIGHT} m.` };
  return { group: g, measured, total: items.length };
}
