import * as THREE from 'three/webgpu';
import { createPohutukawaClusterTexture, createPongaFrondTexture } from './pbrTextures';

export type TerrainHeightFn = (x: number, z: number) => number;
export type FootprintExcludeFn = (x: number, z: number) => boolean;

export interface SwayNode {
  node: THREE.Object3D;
  phase: number;
  amp: number;
}

function createArchedBladeGeometry(
  width: number,
  length: number,
  archDrop: number,
  taperTip = true,
  segsY = 7
): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(width, length, 2, segsY);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const rawY = pos.getY(i);
    const t = Math.max(0, (rawY + length * 0.5) / length);
    const widthScale = taperTip ? Math.sin(Math.min(1, t * 0.85 + 0.15) * Math.PI * 0.92) : 1.0;
    const zCurve = Math.pow(t, 1.85) * archDrop;
    const yLen = t * length * (1 - 0.18 * t * t);
    const vCrease = Math.abs(x) * 0.12;
    pos.setXYZ(i, x * widthScale, yLen, zCurve + vCrease);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Grounded, botanically detailed Aotearoa / NZ native flora.
 * Every root/trunk/clump is embedded -0.28m into the contoured terrain so nothing ever floats
 * on steep slopes, and all positions respect the active building/deck/stair exclusion footprint.
 */
export function buildNzNativeLandscape(
  getHeight: TerrainHeightFn,
  densityMultiplier: number,
  isExcluded?: FootprintExcludeFn,
  remap?: (x: number, z: number) => [number, number],
  big = 1
): { group: THREE.Group; swayNodes: SwayNode[] } {
  const group = new THREE.Group();
  group.name = 'NZ_Native_Landscaping';
  const swayNodes: SwayNode[] = [];

  const canPlace = (x: number, z: number) => !(isExcluded && isExcluded(x, z));

  const barkMat = new THREE.MeshStandardMaterial({ color: 0x443932, roughness: 0.94, metalness: 0.0 });
  const pongaTrunkMat = new THREE.MeshStandardMaterial({ color: 0x362b24, roughness: 0.96 });
  const basaltMat = new THREE.MeshStandardMaterial({ color: 0x454644, roughness: 0.88, metalness: 0.05 });

  const pohutTex = createPohutukawaClusterTexture();
  const pohutLeafMat = new THREE.MeshStandardMaterial({
    map: pohutTex,
    alphaTest: 0.38,
    roughness: 0.72,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });

  const pongaTex = createPongaFrondTexture();
  const pongaFrondMat = new THREE.MeshStandardMaterial({
    map: pongaTex,
    alphaTest: 0.35,
    roughness: 0.68,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });

  const tiBladeMat = new THREE.MeshStandardMaterial({
    color: 0x526e3f,
    roughness: 0.56,
    side: THREE.DoubleSide,
  });
  const flaxBladeMat = new THREE.MeshStandardMaterial({
    color: 0x425e37,
    roughness: 0.52,
    side: THREE.DoubleSide,
  });
  const pukioBladeMat = new THREE.MeshStandardMaterial({
    color: 0x8d804c,
    roughness: 0.78,
    side: THREE.DoubleSide,
  });

  const pongaFrondGeo = createArchedBladeGeometry(0.95, 2.2, 0.95, false, 8);
  const tiBladeGeo = createArchedBladeGeometry(0.085, 1.35, 0.55, true, 6);
  const flaxBladeGeo = createArchedBladeGeometry(0.11, 1.45, 0.42, true, 6);
  const pukioBladeGeo = createArchedBladeGeometry(0.032, 0.92, 0.52, true, 6);

  function addPohutukawa(x: number, z: number, scale = 1.0) {
    if (remap) [x, z] = remap(x, z);
    if (!canPlace(x, z)) return;
    const y = getHeight(x, z) - 0.32;
    const tree = new THREE.Group();
    tree.position.set(x, y, z);

    const canopy = new THREE.Group();
    const boughs: [number, number, number, number][] = [
      [-1.4, 3.2, 0.6, 0.14],
      [1.5, 3.4, -0.5, 0.14],
      [0.2, 3.8, 1.1, 0.12],
      [-0.6, 3.5, -1.2, 0.13],
      [0.8, 3.1, 0.9, 0.11],
    ];

    boughs.forEach(([bx, by, bz, r], idx) => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3((idx - 2) * 0.08, 0, (idx % 2) * 0.08),
        new THREE.Vector3(bx * 0.35, by * 0.48, bz * 0.35),
        new THREE.Vector3(bx * 0.78, by * 0.82, bz * 0.78),
        new THREE.Vector3(bx, by, bz),
      ]);
      const limb = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, r, 7, false), barkMat);
      limb.castShadow = true;
      limb.receiveShadow = true;
      tree.add(limb);

      for (let c = 0; c < 6; c++) {
        const cardSize = 1.65 + (c % 3) * 0.35;
        const card = new THREE.Mesh(new THREE.PlaneGeometry(cardSize, cardSize), pohutLeafMat);
        const angle = (c / 6) * Math.PI * 2 + idx * 0.8;
        card.position.set(
          bx + Math.cos(angle) * 0.65,
          by + 0.15 + (c % 2) * 0.38,
          bz + Math.sin(angle) * 0.65
        );
        card.rotation.set(((c % 3) - 1) * 0.45, angle + 0.5, ((c % 2) - 0.5) * 0.35);
        card.castShadow = true;
        card.receiveShadow = true;
        canopy.add(card);
      }
    });

    tree.add(canopy);
    tree.scale.setScalar(scale * big);
    group.add(tree);
    swayNodes.push({ node: canopy, phase: x * 0.6 + z * 0.4, amp: 0.022 });
  }

  function addTiKouka(x: number, z: number, height = 4.2) {
    if (remap) [x, z] = remap(x, z);
    if (!canPlace(x, z)) return;
    const y = getHeight(x, z) - 0.28;
    const tree = new THREE.Group();
    tree.position.set(x, y, z);

    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.08, height * 0.5, 0.05),
      new THREE.Vector3(-0.04, height, -0.02),
    ]);
    const trunk = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.11, 8, false), barkMat);
    trunk.castShadow = true;
    tree.add(trunk);

    const forkCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.02, height * 0.68, 0.02),
      new THREE.Vector3(0.32, height * 0.82, 0.18),
      new THREE.Vector3(0.55, height * 0.94, 0.28),
    ]);
    const fork = new THREE.Mesh(new THREE.TubeGeometry(forkCurve, 6, 0.075, 7, false), barkMat);
    fork.castShadow = true;
    tree.add(fork);

    const crownGroup = new THREE.Group();
    const tips = [
      new THREE.Vector3(-0.04, height, -0.02),
      new THREE.Vector3(0.55, height * 0.94, 0.28),
    ];

    tips.forEach((tip, ti) => {
      const count = ti === 0 ? 32 : 22;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + ti * 0.7;
        const ring = i % 3;
        const blade = new THREE.Mesh(tiBladeGeo, tiBladeMat);
        blade.position.copy(tip);
        blade.rotation.set(0.32 + ring * 0.38, a, 0, 'YXZ');
        blade.scale.setScalar(ti === 0 ? 1.0 : 0.82);
        blade.castShadow = true;
        crownGroup.add(blade);
      }
    });

    tree.add(crownGroup);
    group.add(tree);
    swayNodes.push({ node: crownGroup, phase: x + z * 0.5, amp: 0.038 });
  }

  function addPongaFern(x: number, z: number, scale = 1.0) {
    if (remap) [x, z] = remap(x, z);
    if (!canPlace(x, z)) return;
    const y = getHeight(x, z) - 0.28;
    const fern = new THREE.Group();
    fern.position.set(x, y, z);

    const trunkH = 1.45 * scale;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.14, trunkH, 9), pongaTrunkMat);
    trunk.position.y = trunkH * 0.5;
    trunk.castShadow = true;
    fern.add(trunk);

    const fronds = new THREE.Group();
    fronds.position.y = trunkH;
    const count = 14;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + (i % 2) * 0.22;
      const tier = i % 2;
      const frond = new THREE.Mesh(pongaFrondGeo, pongaFrondMat);
      frond.rotation.set(0.58 + tier * 0.34, a, 0, 'YXZ');
      frond.scale.setScalar(scale * (tier === 0 ? 1.05 : 0.82));
      frond.castShadow = true;
      fronds.add(frond);
    }

    fern.add(fronds);
    group.add(fern);
    swayNodes.push({ node: fronds, phase: x * 1.1 + z, amp: 0.045 });
  }

  function addFlaxOrPukio(x: number, z: number, isPukio = false, scale = 1.0) {
    if (remap) [x, z] = remap(x, z);
    if (!canPlace(x, z)) return;
    const y = getHeight(x, z) - 0.24;
    const clump = new THREE.Group();
    clump.position.set(x, y, z);

    const count = isPukio ? 28 : 18;
    const geo = isPukio ? pukioBladeGeo : flaxBladeGeo;
    const mat = isPukio ? pukioBladeMat : flaxBladeMat;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + (i % 3) * 0.14;
      const blade = new THREE.Mesh(geo, mat);
      blade.rotation.set(0.18 + (i % 4) * 0.24, a, 0, 'YXZ');
      blade.scale.setScalar(scale * (0.78 + (i % 3) * 0.14));
      blade.castShadow = true;
      clump.add(blade);
    }

    group.add(clump);
    swayNodes.push({ node: clump, phase: z * 0.85, amp: 0.042 });
  }

  function addBoulder(x: number, z: number, r = 0.6) {
    if (remap) [x, z] = remap(x, z);
    if (!canPlace(x, z)) return;
    const y = getHeight(x, z) - 0.18;
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 2), basaltMat);
    mesh.position.set(x, y + r * 0.2, z);
    mesh.scale.set(1.3, 0.58, 1.05);
    mesh.rotation.set(x * 0.3, z * 0.6, 0.15);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  // Hero Aotearoa coastal bush perimeter (guaranteed outside building/deck/stair footprints)
  addPohutukawa(-16.2, -1.8, 1.25);
  addPohutukawa(-13.6, -9.2, 1.06);
  addPohutukawa(-2.6, -10.8, 0.98);
  addPohutukawa(14.6, -9.4, 1.08);
  addPohutukawa(-12.8, 11.4, 1.02);
  addPohutukawa(13.8, 11.8, 0.96);

  addTiKouka(16.2, 2.2, 4.5);
  addTiKouka(17.8, 0.4, 3.7);
  addTiKouka(15.2, -5.6, 4.0);
  addTiKouka(-13.4, 7.6, 4.1);

  const fernSpots: [number, number, number][] = [
    [-11.4, 5.4, 1.08],
    [-10.2, 10.8, 1.12],
    [-4.2, 11.4, 1.05],
    [2.6, 11.6, 1.14],
    [11.6, 6.2, 1.05],
    [15.8, 4.6, 1.12],
    [-12.2, -6.2, 1.0],
    [11.4, -7.2, 1.02],
  ];
  fernSpots.forEach(([x, z, s]) => addPongaFern(x, z, s));

  const flaxSpots: [number, number, boolean, number][] = [
    [-15.2, 2.8, false, 1.05],
    [-11.8, 8.8, true, 1.0],
    [-7.8, 11.2, false, 0.98],
    [-1.4, 11.8, true, 1.1],
    [5.8, 11.4, false, 1.05],
    [11.2, 9.8, true, 1.0],
    [14.8, 4.8, false, 1.08],
    [17.2, 3.6, true, 0.95],
    [-15.6, -5.4, false, 1.12],
    [12.2, -6.8, true, 1.0],
  ];
  const activeCount = Math.max(6, Math.min(flaxSpots.length, Math.round(flaxSpots.length * densityMultiplier)));
  for (let i = 0; i < activeCount; i++) {
    const [x, z, isPukio, s] = flaxSpots[i];
    addFlaxOrPukio(x, z, isPukio, s);
  }

  [
    [-15.8, 1.8, 0.72],
    [-9.6, 10.6, 0.58],
    [1.8, 11.5, 0.65],
    [16.6, 4.9, 0.62],
  ].forEach(([x, z, r]) => addBoulder(x, z, r));

  return { group, swayNodes };
}
