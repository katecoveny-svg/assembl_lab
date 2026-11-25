import * as THREE from 'three';

// Deterministic PRNG so every species geometry is consistent & crisp
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class BotanicalMeshBuilder {
  constructor() {
    this.positions = [];
    this.normals = [];
    this.colors = [];
    this.tipness = [];
    this.partType = [];
    this.indices = [];
  }

  addVertex(x, y, z, nx, ny, nz, color, tip, part) {
    const idx = this.positions.length / 3;
    this.positions.push(x, y, z);
    this.normals.push(nx, ny, nz);
    this.colors.push(color.r, color.g, color.b);
    this.tipness.push(tip);
    this.partType.push(part);
    return idx;
  }

  addTri(a, b, c) {
    this.indices.push(a, b, c);
  }

  // Curved, tapered, V-keeled botanical blade with optional bronze-burgundy midrib
  addBlade({
    origin = new THREE.Vector3(0, 0, 0),
    yaw = 0,
    tilt = 0.45,
    arch = 0.65,
    length = 1.0,
    baseWidth = 0.08,
    keel = 0.015,
    segments = 4,
    baseColor,
    tipColor,
    midribColor = null,
    part = 1.0,
    tipBase = 0.0,
    tipScale = 1.0
  }) {
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const rings = [];
    const cEdge = new THREE.Color();
    const cMid = new THREE.Color();
    const darkBase = baseColor.clone().multiplyScalar(0.76);

    for (let s = 0; s <= segments; s++) {
      const t = s / segments;
      const pitch = tilt + arch * Math.pow(t, 1.35);
      const rDist = Math.sin(pitch) * length * t;
      const yDist = Math.cos(pitch * 0.85) * length * t - arch * 0.16 * length * t * t;
      const cx = origin.x + cosY * rDist;
      const cy = Math.max(0.008, origin.y + yDist);
      const cz = origin.z + sinY * rDist;

      const wFactor = s === segments ? 0.0 : Math.sin(Math.pow(t, 0.65) * Math.PI * 0.92 + 0.25);
      const hw = baseWidth * 0.5 * wFactor;
      const kv = keel * wFactor;

      const rx = -sinY;
      const rz = cosY;

      // Deeper shaded crown base transitioning to rich sun-kissed tip
      cEdge.copy(darkBase).lerp(baseColor, Math.min(1, t * 2.1)).lerp(tipColor, Math.pow(t, 0.92));
      if (midribColor) {
        cMid.copy(midribColor).lerp(cEdge, Math.pow(t, 1.25) * 0.65);
      } else {
        cMid.copy(cEdge).multiplyScalar(0.92);
      }
      const tipVal = tipBase + t * tipScale;

      if (s === segments) {
        const idx = this.addVertex(cx, cy, cz, cosY * 0.4, 0.85, sinY * 0.4, cEdge, tipVal, part);
        rings.push([idx]);
      } else if (keel > 0.001) {
        const iL = this.addVertex(cx - rx * hw, cy + kv, cz - rz * hw, -rx * 0.4 + cosY * 0.2, 0.85, -rz * 0.4 + sinY * 0.2, cEdge, tipVal, part);
        const iM = this.addVertex(cx, cy, cz, cosY * 0.3, 0.92, sinY * 0.3, cMid, tipVal, part);
        const iR = this.addVertex(cx + rx * hw, cy + kv, cz + rz * hw, rx * 0.4 + cosY * 0.2, 0.85, rz * 0.4 + sinY * 0.2, cEdge, tipVal, part);
        rings.push([iL, iM, iR]);
      } else {
        const iL = this.addVertex(cx - rx * hw, cy, cz - rz * hw, cosY * 0.3, 0.9, sinY * 0.3, cEdge, tipVal, part);
        const iR = this.addVertex(cx + rx * hw, cy, cz + rz * hw, cosY * 0.3, 0.9, sinY * 0.3, cEdge, tipVal, part);
        rings.push([iL, iR]);
      }
    }

    for (let s = 0; s < segments; s++) {
      const r0 = rings[s];
      const r1 = rings[s + 1];
      if (r1.length === 1) {
        if (r0.length === 3) {
          this.addTri(r0[0], r0[1], r1[0]);
          this.addTri(r0[1], r0[2], r1[0]);
        } else {
          this.addTri(r0[0], r0[1], r1[0]);
        }
      } else if (r0.length === 3) {
        this.addTri(r0[0], r0[1], r1[0]);
        this.addTri(r0[1], r1[1], r1[0]);
        this.addTri(r0[1], r0[2], r1[1]);
        this.addTri(r0[2], r1[2], r1[1]);
      } else {
        this.addTri(r0[0], r0[1], r1[0]);
        this.addTri(r0[1], r1[1], r1[0]);
      }
    }
  }

  // Tapered organic curved stem or trunk tube
  addBranch({
    points,
    rStart,
    rEnd,
    radialSegs = 5,
    color,
    part = 0.0,
    tipStart = 0.0,
    tipEnd = 0.35
  }) {
    const rings = [];
    const c = new THREE.Color();
    for (let i = 0; i < points.length; i++) {
      const t = i / (points.length - 1);
      const p = points[i];
      const rad = rStart * (1 - t) + rEnd * t;
      const tip = tipStart + (tipEnd - tipStart) * t;
      const tangent = new THREE.Vector3();
      if (i < points.length - 1) tangent.subVectors(points[i + 1], p).normalize();
      else tangent.subVectors(p, points[i - 1]).normalize();

      const up = Math.abs(tangent.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
      const side = new THREE.Vector3().crossVectors(tangent, up).normalize();
      const binorm = new THREE.Vector3().crossVectors(tangent, side).normalize();

      // Subtle darker bark near root collar
      c.copy(color).multiplyScalar(0.84 + t * 0.2);

      const ring = [];
      for (let j = 0; j < radialSegs; j++) {
        const ang = (j / radialSegs) * Math.PI * 2;
        const nx = side.x * Math.cos(ang) + binorm.x * Math.sin(ang);
        const ny = side.y * Math.cos(ang) + binorm.y * Math.sin(ang);
        const nz = side.z * Math.cos(ang) + binorm.z * Math.sin(ang);
        ring.push(this.addVertex(
          p.x + nx * rad, p.y + ny * rad, p.z + nz * rad,
          nx, ny, nz, c, tip, part
        ));
      }
      rings.push(ring);
    }

    for (let i = 0; i < rings.length - 1; i++) {
      for (let j = 0; j < radialSegs; j++) {
        const jn = (j + 1) % radialSegs;
        this.addTri(rings[i][j], rings[i][jn], rings[i + 1][j]);
        this.addTri(rings[i][jn], rings[i + 1][jn], rings[i + 1][j]);
      }
    }
  }

  // Curved diamond leaf / petal cluster with richer crown-to-tip chlorophyll gradient
  addLeafSpray({
    center,
    count = 10,
    leafLen = 0.14,
    leafWidth = 0.065,
    baseColor,
    tipColor,
    part = 1.0,
    tipVal = 0.7,
    rand,
    droop = 0.15
  }) {
    const cMid = new THREE.Color();
    const cTip = new THREE.Color();
    const cBase = baseColor.clone().multiplyScalar(0.78);

    for (let i = 0; i < count; i++) {
      const yaw = (i / count) * Math.PI * 2 + (rand() - 0.5) * 0.6;
      const elev = (rand() - 0.3) * 1.1;
      const len = leafLen * (0.75 + rand() * 0.5);
      const wid = leafWidth * (0.75 + rand() * 0.4);

      const dir = new THREE.Vector3(
        Math.cos(yaw) * Math.cos(elev),
        Math.sin(elev),
        Math.sin(yaw) * Math.cos(elev)
      ).normalize();
      const side = new THREE.Vector3(-Math.sin(yaw), 0, Math.cos(yaw)).normalize();
      const up = new THREE.Vector3().crossVectors(side, dir).normalize();

      const p0 = center.clone().addScaledVector(dir, len * 0.10);
      const pMid = p0.clone().addScaledVector(dir, len * 0.52).addScaledVector(up, len * 0.12);
      const pTip = p0.clone().addScaledVector(dir, len).addScaledVector(up, -len * droop);
      const pL = pMid.clone().addScaledVector(side, -wid * 0.5);
      const pR = pMid.clone().addScaledVector(side, wid * 0.5);

      const shade = 0.84 + rand() * 0.30;
      cMid.copy(baseColor).lerp(tipColor, 0.38 + rand() * 0.35).multiplyScalar(shade);
      cTip.copy(tipColor).multiplyScalar(0.95 + rand() * 0.15);

      const i0 = this.addVertex(p0.x, p0.y, p0.z, up.x, up.y, up.z, cBase, tipVal * 0.82, part);
      const iL = this.addVertex(pL.x, pL.y, pL.z, up.x, up.y, up.z, cMid, tipVal, part);
      const iR = this.addVertex(pR.x, pR.y, pR.z, up.x, up.y, up.z, cMid, tipVal, part);
      const iT = this.addVertex(pTip.x, pTip.y, pTip.z, dir.x, dir.y, dir.z, cTip, Math.min(1.0, tipVal + 0.14), part);

      this.addTri(i0, iL, iT);
      this.addTri(i0, iT, iR);
    }
  }

  // Upgraded volumetric multi-layered flower heads: 'umbel' | 'daisy' | 'spike' | 'plume' | 'starburst' | 'bell' | 'claw'
  addFlowerHead({
    center,
    radius = 0.08,
    petals = 14,
    color1,
    color2,
    tipVal = 0.95,
    rand,
    style = 'umbel'
  }) {
    const c = new THREE.Color();

    if (style === 'daisy') {
      // Echinacea: raised spiky copper-orange cone + two layered rings of drooping ray petals
      const coneCol = new THREE.Color('#8c3c12');
      const coneTop = new THREE.Color('#c7621a');
      const apex = this.addVertex(center.x, center.y + radius * 0.52, center.z, 0, 1, 0, coneTop, tipVal, 2.0);
      const ring = [];
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ring.push(this.addVertex(
          center.x + Math.cos(a) * radius * 0.36,
          center.y,
          center.z + Math.sin(a) * radius * 0.36,
          Math.cos(a), 0.5, Math.sin(a), coneCol, tipVal, 2.0
        ));
      }
      for (let i = 0; i < 8; i++) this.addTri(apex, ring[i], ring[(i + 1) % 8]);

      const totalPetals = Math.max(14, petals);
      for (let i = 0; i < totalPetals; i++) {
        const layer = i % 2;
        const a = (i / totalPetals) * Math.PI * 2 + (rand() - 0.5) * 0.14;
        const cx = Math.cos(a), cz = Math.sin(a);
        const rx = -cz, rz = cx;
        const pw = radius * (layer === 0 ? 0.22 : 0.18);
        const pl = radius * (layer === 0 ? 1.18 : 0.92) * (0.9 + rand() * 0.22);
        const droopY = layer === 0 ? -radius * 0.42 : -radius * 0.18;
        c.copy(color1).lerp(color2, 0.35 + rand() * 0.55);
        const i0 = this.addVertex(center.x + cx * radius * 0.28, center.y + (layer ? 0.01 : 0), center.z + cz * radius * 0.28, 0, 1, 0, color1, tipVal, 2.0);
        const iL = this.addVertex(center.x + cx * pl * 0.62 - rx * pw, center.y + droopY * 0.35, center.z + cz * pl * 0.62 - rz * pw, cx * 0.3, 0.9, cz * 0.3, c, tipVal, 2.0);
        const iR = this.addVertex(center.x + cx * pl * 0.62 + rx * pw, center.y + droopY * 0.35, center.z + cz * pl * 0.62 + rz * pw, cx * 0.3, 0.9, cz * 0.3, c, tipVal, 2.0);
        const iT = this.addVertex(center.x + cx * pl, center.y + droopY, center.z + cz * pl, cx * 0.5, 0.7, cz * 0.5, color2, tipVal, 2.0);
        this.addTri(i0, iL, iT);
        this.addTri(i0, iT, iR);
      }
      return;
    }

    if (style === 'claw') {
      // Kākābeak: pendulous curved scarlet beak-shaped flower raceme
      const count = Math.max(8, petals);
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + (rand() - 0.5) * 0.35;
        const cx = Math.cos(a), cz = Math.sin(a);
        const rx = -cz, rz = cx;
        const len = radius * (1.25 + rand() * 0.35);
        const wid = radius * 0.34;
        const yOff = -(i / count) * radius * 0.85;
        c.copy(color1).lerp(color2, rand() * 0.75);
        const p0 = new THREE.Vector3(center.x + cx * radius * 0.15, center.y + yOff, center.z + cz * radius * 0.15);
        const pMid = new THREE.Vector3(center.x + cx * len * 0.6, center.y + yOff - len * 0.25, center.z + cz * len * 0.6);
        const pTip = new THREE.Vector3(center.x + cx * len * 0.92, center.y + yOff - len * 0.78, center.z + cz * len * 0.92);

        const i0 = this.addVertex(p0.x, p0.y, p0.z, cx, 0.4, cz, color1, tipVal, 2.0);
        const iL = this.addVertex(pMid.x - rx * wid, pMid.y, pMid.z - rz * wid, cx, 0.2, cz, c, tipVal, 2.0);
        const iR = this.addVertex(pMid.x + rx * wid, pMid.y, pMid.z + rz * wid, cx, 0.2, cz, c, tipVal, 2.0);
        const iT = this.addVertex(pTip.x, pTip.y, pTip.z, cx, -0.5, cz, color2, tipVal, 2.0);
        this.addTri(i0, iL, iT);
        this.addTri(i0, iT, iR);
      }
      return;
    }

    if (style === 'bell') {
      // Kōwhai: hanging golden bell racemes
      const count = Math.max(12, petals);
      for (let i = 0; i < count; i++) {
        const a = i * 2.39996;
        const r = radius * (0.25 + rand() * 0.65);
        const drop = -radius * (0.3 + rand() * 0.9);
        const bx = center.x + Math.cos(a) * r;
        const by = center.y + drop;
        const bz = center.z + Math.sin(a) * r;
        const bl = radius * 0.48;
        const bw = radius * 0.26;
        c.copy(color1).lerp(color2, rand() * 0.8);
        const iTop = this.addVertex(bx, by + bl * 0.4, bz, 0, 1, 0, color1, tipVal, 2.0);
        const iA = this.addVertex(bx + bw, by - bl, bz, 0.6, -0.4, 0, c, tipVal, 2.0);
        const iB = this.addVertex(bx - bw * 0.6, by - bl, bz + bw * 0.8, -0.4, -0.4, 0.6, color2, tipVal, 2.0);
        const iC = this.addVertex(bx - bw * 0.6, by - bl, bz - bw * 0.8, -0.4, -0.4, -0.6, c, tipVal, 2.0);
        this.addTri(iTop, iA, iB);
        this.addTri(iTop, iB, iC);
        this.addTri(iTop, iC, iA);
      }
      return;
    }

    if (style === 'starburst') {
      // Pōhutukawa: dense multi-layered crimson stamen pom-pom starburst
      const count = Math.max(22, petals);
      for (let i = 0; i < count; i++) {
        const phi = Math.acos(1 - 1.35 * ((i + 0.5) / count)); // Upper dome bias
        const theta = Math.PI * (1 + Math.sqrt(5)) * i;
        const dx = Math.sin(phi) * Math.cos(theta);
        const dy = Math.cos(phi);
        const dz = Math.sin(phi) * Math.sin(theta);
        const r = radius * (0.72 + rand() * 0.42);
        const pTip = new THREE.Vector3(center.x + dx * r, center.y + dy * r, center.z + dz * r);
        const s1 = new THREE.Vector3(-dz, 0.2, dx).normalize().multiplyScalar(radius * 0.24);
        c.copy(color1).lerp(color2, 0.35 + rand() * 0.65);

        const i0 = this.addVertex(center.x + dx * r * 0.15, center.y + dy * r * 0.15, center.z + dz * r * 0.15, dx, dy, dz, color1, tipVal, 2.0);
        const i1 = this.addVertex(pTip.x + s1.x, pTip.y + s1.y, pTip.z + s1.z, dx, dy, dz, c, tipVal, 2.0);
        const i2 = this.addVertex(pTip.x - s1.x, pTip.y - s1.y, pTip.z - s1.z, dx, dy, dz, color2, tipVal, 2.0);
        this.addTri(i0, i1, i2);
      }
      return;
    }

    if (style === 'spike' || style === 'plume') {
      const isPlume = style === 'plume';
      const len = isPlume ? radius * 4.8 : radius * 3.1;
      const count = isPlume ? 34 : 20;
      const archYaw = rand() * Math.PI * 2;
      const ax = Math.cos(archYaw), az = Math.sin(archYaw);

      for (let i = 0; i < count; i++) {
        const t = i / count;
        const a = i * 2.39996;
        // Soft tapered feathery silhouette for Toetoe plumes, tighter whorls for Lavender
        const env = isPlume ? Math.sin(Math.pow(t, 0.72) * Math.PI) * 1.25 : (1 - t * 0.62) * 0.72;
        const r = radius * Math.max(0.18, env);
        const yOff = t * len - (isPlume ? t * t * len * 0.28 : 0);
        const bend = isPlume ? t * t * len * 0.42 : 0;
        const cx = center.x + ax * bend;
        const cz = center.z + az * bend;
        const px = cx + Math.cos(a) * r;
        const py = center.y + yOff;
        const pz = cz + Math.sin(a) * r;

        c.copy(color1).lerp(color2, t * 0.55 + rand() * 0.45);
        const fl = r * (isPlume ? 1.65 : 1.35);
        const i0 = this.addVertex(cx, py, cz, 0, 1, 0, color1, tipVal, 2.0);
        const i1 = this.addVertex(px, py + fl * 0.45, pz, Math.cos(a), 0.7, Math.sin(a), c, tipVal, 2.0);
        const i2 = this.addVertex(px - Math.sin(a) * fl * 0.52, py + fl * 0.08, pz + Math.cos(a) * fl * 0.52, Math.cos(a), 0.5, Math.sin(a), color2, tipVal, 2.0);
        this.addTri(i0, i1, i2);
      }
      return;
    }

    // Default: fuller multi-layered spherical umbel / mophead cluster (Agapanthus, Hydrangea)
    for (let i = 0; i < petals; i++) {
      const phi = Math.acos(1 - 2 * ((i + 0.5) / petals));
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const dx = Math.sin(phi) * Math.cos(theta);
      const dy = Math.cos(phi);
      const dz = Math.sin(phi) * Math.sin(theta);
      const r = radius * (0.68 + rand() * 0.42);
      const pMid = new THREE.Vector3(center.x + dx * r * 0.65, center.y + dy * r * 0.65, center.z + dz * r * 0.65);
      const pTip = new THREE.Vector3(center.x + dx * r, center.y + dy * r, center.z + dz * r);
      const s1 = new THREE.Vector3(-dz, 0.2, dx).normalize().multiplyScalar(radius * 0.34);
      const s2 = new THREE.Vector3().crossVectors(new THREE.Vector3(dx, dy, dz), s1).normalize().multiplyScalar(radius * 0.34);
      c.copy(color1).lerp(color2, rand());

      // Two crossed petal diamonds per floret for lush multi-layered floral volume
      const i0 = this.addVertex(center.x + dx * r * 0.22, center.y + dy * r * 0.22, center.z + dz * r * 0.22, dx, dy, dz, color1, tipVal, 2.0);
      const i1 = this.addVertex(pMid.x + s1.x, pMid.y + s1.y, pMid.z + s1.z, dx, dy, dz, c, tipVal, 2.0);
      const i2 = this.addVertex(pMid.x - s1.x, pMid.y - s1.y, pMid.z - s1.z, dx, dy, dz, c, tipVal, 2.0);
      const i3 = this.addVertex(pTip.x + s2.x * 0.45, pTip.y + s2.y * 0.45, pTip.z + s2.z * 0.45, dx, dy, dz, color2, tipVal, 2.0);
      this.addTri(i0, i1, i3);
      this.addTri(i0, i3, i2);
    }
  }

  // Finalize BufferGeometry with bent spherical normals for lush sunlit volume
  build(bendStrength = 0.50) {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    geom.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3));
    geom.setAttribute('aTipness', new THREE.Float32BufferAttribute(this.tipness, 1));
    geom.setAttribute('aPartType', new THREE.Float32BufferAttribute(this.partType, 1));
    geom.setIndex(this.indices);
    geom.computeVertexNormals();

    geom.computeBoundingBox();
    const box = geom.boundingBox;
    const midY = (box.min.y + box.max.y) * 0.38;
    const pos = geom.attributes.position;
    const norm = geom.attributes.normal;
    const part = geom.attributes.aPartType;
    const v = new THREE.Vector3();
    const n = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      if (part.getX(i) < 0.5) continue;
      v.set(pos.getX(i), Math.max(0.05, pos.getY(i) - midY), pos.getZ(i)).normalize();
      n.set(norm.getX(i), norm.getY(i), norm.getZ(i));
      n.lerp(v, bendStrength).normalize();
      norm.setXYZ(i, n.x, n.y, n.z);
    }
    norm.needsUpdate = true;
    geom.computeBoundingSphere();
    return geom;
  }
}

export function buildSpeciesGeometry(plant) {
  const b = new BotanicalMeshBuilder();
  const rand = mulberry32(plant.id.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
  const H = plant.matureHeight;
  const W = plant.matureSpread;
  const colLeaf = new THREE.Color(plant.foliageColor);
  const colTip = new THREE.Color(plant.foliageTipColor);
  const colMidrib = plant.midribColor ? new THREE.Color(plant.midribColor) : null;
  const colFlw1 = new THREE.Color(plant.flowerColor);
  const colFlw2 = new THREE.Color(plant.flowerColor2);
  const colTrunk = new THREE.Color(plant.trunkColor);

  switch (plant.archetype) {
    case 'flaxTall':
    case 'flaxArching':
    case 'flaxBroad':
    case 'irisFan': {
      const isBroad = plant.archetype === 'flaxBroad';
      const isIris = plant.archetype === 'irisFan';
      const isArching = plant.archetype === 'flaxArching';
      const bladeCount = isIris ? 28 : isBroad ? 24 : 32;
      for (let i = 0; i < bladeCount; i++) {
        const ring = i / bladeCount;
        const yaw = i * 2.39996 + (rand() - 0.5) * 0.25;
        const tilt = (isIris ? 0.12 : 0.16) + ring * (isArching ? 0.86 : isBroad ? 0.72 : 0.56);
        const arch = isArching ? 1.08 : isBroad ? 0.88 : isIris ? 0.42 : 0.64;
        const len = H * (0.72 + (1 - ring * 0.35) * 0.35) * (0.88 + rand() * 0.24);
        const wid = (isBroad ? 0.135 : isIris ? 0.044 : 0.092) * (H / 1.4);
        b.addBlade({
          origin: new THREE.Vector3(Math.cos(yaw) * W * 0.05, 0, Math.sin(yaw) * W * 0.05),
          yaw, tilt, arch, length: len, baseWidth: wid,
          keel: wid * 0.24, segments: 5, baseColor: colLeaf, tipColor: colTip,
          midribColor: colMidrib, part: 1.0
        });
      }
      if (plant.archetype === 'flaxTall' || isIris) {
        const stalks = isIris ? 7 : 3;
        for (let s = 0; s < stalks; s++) {
          const ang = (s / stalks) * Math.PI * 2 + rand();
          const sH = H * (isIris ? 0.96 : 1.38);
          const lean = W * 0.18;
          const pts = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(Math.cos(ang) * lean * 0.4, sH * 0.5, Math.sin(ang) * lean * 0.4),
            new THREE.Vector3(Math.cos(ang) * lean, sH, Math.sin(ang) * lean)
          ];
          b.addBranch({ points: pts, rStart: isIris ? 0.008 : 0.022, rEnd: isIris ? 0.005 : 0.01, radialSegs: 4, color: colTrunk, part: 2.0, tipStart: 0.2, tipEnd: 0.95 });
          b.addFlowerHead({
            center: pts[2],
            radius: isIris ? 0.058 : 0.15,
            petals: isIris ? 9 : 16,
            color1: colFlw1, color2: colFlw2, tipVal: 0.96, rand,
            style: isIris ? 'umbel' : 'spike'
          });
        }
      }
      break;
    }

    case 'tussockPlume':
    case 'tussockFine':
    case 'sedgeCascading': {
      const isCascading = plant.archetype === 'sedgeCascading';
      const count = isCascading ? 68 : 78;
      for (let i = 0; i < count; i++) {
        const ring = i / count;
        const yaw = i * 2.39996 + (rand() - 0.5) * 0.35;
        const tilt = 0.18 + ring * (isCascading ? 1.15 : 0.95);
        const arch = isCascading ? 1.35 : 1.05;
        const len = H * (0.78 + rand() * 0.35) * (isCascading ? 1.25 : 1.05);
        const wid = isCascading ? 0.018 : 0.024;
        b.addBlade({
          origin: new THREE.Vector3(Math.cos(yaw) * W * 0.07 * ring, 0, Math.sin(yaw) * W * 0.07 * ring),
          yaw, tilt, arch, length: len, baseWidth: wid, keel: 0, segments: 4,
          baseColor: colLeaf, tipColor: colTip, part: 1.0
        });
      }
      if (plant.archetype === 'tussockPlume') {
        for (let p = 0; p < 9; p++) {
          const ang = (p / 9) * Math.PI * 2 + rand() * 0.45;
          const pH = H * (1.18 + rand() * 0.34);
          const pts = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(Math.cos(ang) * W * 0.16, pH * 0.65, Math.sin(ang) * W * 0.16),
            new THREE.Vector3(Math.cos(ang) * W * 0.36, pH, Math.sin(ang) * W * 0.36)
          ];
          b.addBranch({ points: pts, rStart: 0.008, rEnd: 0.004, radialSegs: 4, color: colTip, part: 2.0, tipStart: 0.1, tipEnd: 0.9 });
          b.addFlowerHead({ center: pts[2], radius: 0.105, petals: 24, color1: colFlw1, color2: colFlw2, tipVal: 1.0, rand, style: 'plume' });
        }
      }
      break;
    }

    case 'treeFern': {
      // Fibrous Ponga trunk
      const trunkH = H * 0.72;
      const trunkPts = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.06, trunkH * 0.5, -0.04),
        new THREE.Vector3(0.02, trunkH, 0.02)
      ];
      b.addBranch({ points: trunkPts, rStart: 0.16, rEnd: 0.11, radialSegs: 7, color: colTrunk, part: 0.0, tipStart: 0, tipEnd: 0.25 });
      const crown = trunkPts[2];
      const silverUnder = new THREE.Color(plant.flowerColor || '#e8efe9');
      const frondCount = 15;

      for (let f = 0; f < frondCount; f++) {
        const yaw = (f / frondCount) * Math.PI * 2 + (rand() - 0.5) * 0.20;
        const frondLen = W * 0.60 * (0.86 + rand() * 0.24);
        const lift = 0.28 + (f % 2) * 0.26;
        const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
        const rx = -sinY, rz = cosY;

        // Curved rachis spine
        const rachisPts = [];
        for (let r = 0; r <= 5; r++) {
          const t = r / 5;
          const dist = t * frondLen;
          const yOff = Math.sin(t * Math.PI * 0.78) * frondLen * lift - t * t * frondLen * 0.22;
          rachisPts.push(new THREE.Vector3(crown.x + cosY * dist, crown.y + yOff, crown.z + sinY * dist));
        }
        b.addBranch({ points: rachisPts, rStart: 0.018, rEnd: 0.004, radialSegs: 4, color: colTrunk, part: 1.0, tipStart: 0.25, tipEnd: 0.95 });

        // 12 pairs of bipinnate pinnae leaflets with emerald top & authentic velvety silvery-white underside!
        const pairs = 12;
        for (let k = 1; k <= pairs; k++) {
          const t = k / pairs;
          const dist = t * frondLen;
          const yOff = Math.sin(t * Math.PI * 0.78) * frondLen * lift - t * t * frondLen * 0.22;
          const cx = crown.x + cosY * dist;
          const cy = crown.y + yOff;
          const cz = crown.z + sinY * dist;
          const pinnaLen = frondLen * 0.27 * Math.sin(t * Math.PI * 0.92 + 0.18);
          const colTop = colLeaf.clone().lerp(colTip, t * 0.82);
          const tipVal = 0.35 + t * 0.65;

          for (const side of [-1, 1]) {
            const p0 = new THREE.Vector3(cx, cy, cz);
            const pTip = new THREE.Vector3(
              cx + rx * side * pinnaLen + cosY * pinnaLen * 0.28,
              cy - pinnaLen * 0.12,
              cz + rz * side * pinnaLen + sinY * pinnaLen * 0.28
            );
            const pFwd = new THREE.Vector3(cx + cosY * (frondLen / pairs) * 0.88, cy + 0.015, cz + sinY * (frondLen / pairs) * 0.88);

            // Top rich green surface
            const i0 = b.addVertex(p0.x, p0.y + 0.004, p0.z, 0, 1, 0, colLeaf, tipVal * 0.9, 1.0);
            const i1 = b.addVertex(pTip.x, pTip.y + 0.004, pTip.z, rx * side * 0.3, 0.92, rz * side * 0.3, colTop, tipVal, 1.0);
            const i2 = b.addVertex(pFwd.x, pFwd.y + 0.004, pFwd.z, 0, 1, 0, colTip, tipVal, 1.0);
            b.addTri(i0, i1, i2);

            // Silvery-white Ponga underside (slightly offset below, downward normal)
            const u0 = b.addVertex(p0.x, p0.y - 0.004, p0.z, 0, -1, 0, silverUnder, tipVal * 0.9, 1.0);
            const u1 = b.addVertex(pTip.x, pTip.y - 0.004, pTip.z, rx * side * 0.2, -0.95, rz * side * 0.2, silverUnder, tipVal, 1.0);
            const u2 = b.addVertex(pFwd.x, pFwd.y - 0.004, pFwd.z, 0, -1, 0, silverUnder, tipVal, 1.0);
            b.addTri(u0, u2, u1);
          }
        }
      }
      break;
    }

    case 'nikauPalm': {
      const trunkH = H * 0.56;
      const trunkPts = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(-0.04, trunkH * 0.5, 0.04),
        new THREE.Vector3(0, trunkH, 0)
      ];
      b.addBranch({ points: trunkPts, rStart: 0.13, rEnd: 0.10, radialSegs: 7, color: colTrunk, part: 0.0, tipStart: 0, tipEnd: 0.2 });
      const shaftPts = [
        new THREE.Vector3(0, trunkH - 0.05, 0),
        new THREE.Vector3(0, trunkH + 0.26, 0),
        new THREE.Vector3(0, trunkH + 0.55, 0)
      ];
      b.addBranch({ points: shaftPts, rStart: 0.145, rEnd: 0.095, radialSegs: 7, color: new THREE.Color('#35662a'), part: 0.0, tipStart: 0.2, tipEnd: 0.3 });
      const crown = shaftPts[2];
      for (let f = 0; f < 14; f++) {
        const yaw = (f / 14) * Math.PI * 2 + rand() * 0.22;
        const len = H * 0.56 * (0.85 + rand() * 0.25);
        b.addBlade({
          origin: crown, yaw, tilt: 0.22 + (f % 3) * 0.14, arch: 0.55,
          length: len, baseWidth: 0.28, keel: 0.05, segments: 5,
          baseColor: colLeaf, tipColor: colTip, part: 1.0, tipBase: 0.35, tipScale: 0.65
        });
      }
      break;
    }

    case 'cabbageTree': {
      const forkH = H * 0.52;
      b.addBranch({
        points: [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.05, forkH * 0.5, -0.03), new THREE.Vector3(0, forkH, 0)],
        rStart: 0.15, rEnd: 0.10, radialSegs: 7, color: colTrunk, part: 0.0, tipStart: 0, tipEnd: 0.22
      });
      const heads = 3;
      for (let h = 0; h < heads; h++) {
        const a = (h / heads) * Math.PI * 2 + 0.4;
        const limbTop = new THREE.Vector3(Math.cos(a) * W * 0.24, H * (0.78 + (h % 2) * 0.12), Math.sin(a) * W * 0.24);
        b.addBranch({
          points: [new THREE.Vector3(0, forkH, 0), limbTop],
          rStart: 0.085, rEnd: 0.055, radialSegs: 6, color: colTrunk, part: 0.0, tipStart: 0.22, tipEnd: 0.4
        });
        for (let l = 0; l < 36; l++) {
          const ly = l * 2.39996;
          const ring = l / 36;
          b.addBlade({
            origin: limbTop, yaw: ly, tilt: 0.2 + ring * 1.45, arch: 0.72,
            length: 0.70 + rand() * 0.25, baseWidth: 0.048, keel: 0.008, segments: 3,
            baseColor: colLeaf, tipColor: colTip, part: 1.0, tipBase: 0.45, tipScale: 0.55
          });
        }
        b.addFlowerHead({
          center: limbTop.clone().add(new THREE.Vector3(Math.cos(a) * 0.15, 0.28, Math.sin(a) * 0.15)),
          radius: 0.15, petals: 18, color1: colFlw1, color2: colFlw2, tipVal: 0.95, rand, style: 'plume'
        });
      }
      break;
    }

    case 'canopyTree':
    case 'kowhaiTree': {
      const isKowhai = plant.archetype === 'kowhaiTree';
      const trunkCount = isKowhai ? 2 : 3;
      for (let t = 0; t < trunkCount; t++) {
        const a = (t / trunkCount) * Math.PI * 2 + rand() * 0.5;
        const lean = W * (isKowhai ? 0.16 : 0.24);
        const pMid = new THREE.Vector3(Math.cos(a) * lean * 0.5, H * 0.34, Math.sin(a) * lean * 0.5);
        const pFork = new THREE.Vector3(Math.cos(a) * lean, H * 0.62, Math.sin(a) * lean);
        b.addBranch({
          points: [new THREE.Vector3(0, 0, 0), pMid, pFork],
          rStart: isKowhai ? 0.11 : 0.16, rEnd: isKowhai ? 0.055 : 0.08,
          radialSegs: 6, color: colTrunk, part: 0.0, tipStart: 0, tipEnd: 0.3
        });

        const limbs = isKowhai ? 4 : 5;
        for (let l = 0; l < limbs; l++) {
          const la = a + (l / limbs - 0.5) * 2.4 + (rand() - 0.5) * 0.4;
          const dist = W * (0.28 + rand() * 0.22);
          const pEnd = new THREE.Vector3(
            pFork.x + Math.cos(la) * dist,
            H * (0.76 + rand() * 0.24),
            pFork.z + Math.sin(la) * dist
          );
          b.addBranch({
            points: [pFork, pFork.clone().lerp(pEnd, 0.55).add(new THREE.Vector3(0, 0.15, 0)), pEnd],
            rStart: 0.05, rEnd: 0.018, radialSegs: 5, color: colTrunk, part: 0.0, tipStart: 0.3, tipEnd: 0.65
          });
          for (let c = 0; c < 4; c++) {
            const cPos = pEnd.clone().add(new THREE.Vector3(
              (rand() - 0.5) * W * 0.24,
              (rand() - 0.35) * H * 0.14,
              (rand() - 0.5) * W * 0.24
            ));
            b.addLeafSpray({
              center: cPos, count: 14,
              leafLen: isKowhai ? 0.36 : 0.45,
              leafWidth: isKowhai ? 0.14 : 0.23,
              baseColor: colLeaf, tipColor: colTip, part: 1.0, tipVal: 0.78, rand, droop: isKowhai ? 0.36 : 0.15
            });
            if (c < 3) {
              b.addFlowerHead({
                center: cPos.clone().add(new THREE.Vector3(0, isKowhai ? -0.10 : 0.16, 0)),
                radius: isKowhai ? 0.22 : 0.25,
                petals: isKowhai ? 14 : 24,
                color1: colFlw1, color2: colFlw2, tipVal: 0.94, rand,
                style: isKowhai ? 'bell' : 'starburst'
              });
            }
          }
        }
      }
      break;
    }

    case 'divaricating': {
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2 + rand() * 0.3;
        const r = W * (0.25 + rand() * 0.25);
        const h = H * (0.55 + rand() * 0.45);
        const pts = [
          new THREE.Vector3(0, 0.02, 0),
          new THREE.Vector3(Math.cos(a + 0.3) * r * 0.45, h * 0.42, Math.sin(a + 0.3) * r * 0.45),
          new THREE.Vector3(Math.cos(a - 0.25) * r * 0.78, h * 0.76, Math.sin(a - 0.25) * r * 0.78),
          new THREE.Vector3(Math.cos(a) * r, h, Math.sin(a) * r)
        ];
        b.addBranch({ points: pts, rStart: 0.015, rEnd: 0.005, radialSegs: 4, color: colTrunk, part: 0.0, tipStart: 0, tipEnd: 0.6 });
        b.addLeafSpray({
          center: pts[3], count: 11, leafLen: 0.18, leafWidth: 0.08,
          baseColor: colLeaf, tipColor: colTip, part: 1.0, tipVal: 0.75, rand, droop: 0.1
        });
      }
      break;
    }

    case 'floweringShrub':
    case 'manukaShrub':
    case 'kakabeak':
    case 'hydrangea': {
      const isHydr = plant.archetype === 'hydrangea';
      const isManuka = plant.archetype === 'manukaShrub';
      const isKaka = plant.archetype === 'kakabeak';
      const stems = isHydr ? 14 : 18;
      for (let i = 0; i < stems; i++) {
        const a = (i / stems) * Math.PI * 2 + (rand() - 0.5) * 0.35;
        const ring = 0.35 + (i % 3) * 0.28;
        const r = W * 0.46 * ring;
        const h = H * (0.62 + (1 - ring * 0.35) * 0.38) * (0.85 + rand() * 0.25);
        const tip = new THREE.Vector3(Math.cos(a) * r, h, Math.sin(a) * r);
        b.addBranch({
          points: [new THREE.Vector3(0, 0, 0), tip.clone().multiplyScalar(0.55), tip],
          rStart: 0.018, rEnd: 0.007, radialSegs: 4, color: colTrunk, part: 0.0, tipStart: 0, tipEnd: 0.45
        });
        b.addLeafSpray({
          center: tip.clone().multiplyScalar(0.88),
          count: isHydr ? 9 : 12,
          leafLen: isHydr ? 0.26 : isManuka ? 0.16 : 0.22,
          leafWidth: isHydr ? 0.16 : isManuka ? 0.065 : 0.10,
          baseColor: colLeaf, tipColor: colTip, part: 1.0, tipVal: 0.72, rand, droop: isKaka ? 0.35 : 0.15
        });
        b.addFlowerHead({
          center: tip.clone().add(new THREE.Vector3(0, isKaka ? -0.04 : 0.06, 0)),
          radius: isHydr ? 0.18 : isKaka ? 0.14 : 0.09,
          petals: isHydr ? 26 : isKaka ? 10 : 14,
          color1: colFlw1, color2: colFlw2, tipVal: 0.94, rand,
          style: isKaka ? 'claw' : plant.archetype === 'floweringShrub' ? 'spike' : 'umbel'
        });
      }
      break;
    }

    case 'lilyClump':
    case 'agapanthus':
    case 'lavender':
    case 'coneflower': {
      const isLav = plant.archetype === 'lavender';
      const isCone = plant.archetype === 'coneflower';
      const isAga = plant.archetype === 'agapanthus';
      const leafCount = isLav ? 38 : 28;
      for (let i = 0; i < leafCount; i++) {
        const ring = i / leafCount;
        const yaw = i * 2.39996 + (rand() - 0.5) * 0.3;
        b.addBlade({
          origin: new THREE.Vector3(Math.cos(yaw) * W * 0.08 * ring, 0, Math.sin(yaw) * W * 0.08 * ring),
          yaw,
          tilt: 0.25 + ring * 0.85,
          arch: isLav ? 0.45 : 0.95,
          length: H * (isLav ? 0.56 : 0.62) * (0.8 + rand() * 0.35),
          baseWidth: isLav ? 0.032 : isCone ? 0.065 : 0.082,
          keel: isLav ? 0 : 0.014,
          segments: 4, baseColor: colLeaf, tipColor: colTip, part: 1.0
        });
      }
      const scapes = isLav ? 18 : isCone ? 10 : 7;
      for (let s = 0; s < scapes; s++) {
        const a = (s / scapes) * Math.PI * 2 + rand() * 0.5;
        const r = W * (0.12 + rand() * 0.28);
        const sh = H * (0.78 + rand() * 0.28);
        const top = new THREE.Vector3(Math.cos(a) * r, sh, Math.sin(a) * r);
        b.addBranch({
          points: [new THREE.Vector3(0, 0, 0), new THREE.Vector3(Math.cos(a) * r * 0.5, sh * 0.55, Math.sin(a) * r * 0.5), top],
          rStart: 0.008, rEnd: 0.005, radialSegs: 4, color: colLeaf, part: 2.0, tipStart: 0.1, tipEnd: 0.92
        });
        b.addFlowerHead({
          center: top,
          radius: isAga ? 0.11 : isCone ? 0.082 : isLav ? 0.044 : 0.08,
          petals: isAga ? 24 : isCone ? 16 : 18,
          color1: colFlw1, color2: colFlw2, tipVal: 0.98, rand,
          style: isCone ? 'daisy' : isLav ? 'spike' : isAga ? 'umbel' : 'plume'
        });
      }
      break;
    }

    case 'groundcover':
    default: {
      for (let i = 0; i < 18; i++) {
        const a = i * 2.39996;
        const r = Math.sqrt(i / 18) * W * 0.48;
        const cPos = new THREE.Vector3(Math.cos(a) * r, 0.025 + rand() * 0.02, Math.sin(a) * r);
        b.addLeafSpray({
          center: cPos, count: 7, leafLen: 0.11, leafWidth: 0.065,
          baseColor: colLeaf, tipColor: colTip, part: 1.0, tipVal: 0.35, rand, droop: 0.05
        });
        if (i % 2 === 0) {
          b.addFlowerHead({
            center: cPos.clone().add(new THREE.Vector3(0, 0.035, 0)),
            radius: 0.03, petals: 8, color1: colFlw1, color2: colFlw2, tipVal: 0.5, rand, style: 'umbel'
          });
        }
      }
      break;
    }
  }

  return b.build(0.52);
}
