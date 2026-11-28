import * as THREE from 'three';
import { NZ_PLANTS, PLANT_MAP, NZ_EDGINGS } from '../catalog.mjs';
import { HeroTreeManager } from './botanicalAtlas.mjs';
import { buildSpeciesGeometry as buildPlantGeometry } from './botanicalBuilders.mjs';
import { createFoliageNodeMaterial } from './tslMaterials.mjs';

const MAX_PER_SPECIES = 900;

function hash2(ix, iz) {
  const n = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}
function noise2D(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz);
  const b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1);
  const d = hash2(ix + 1, iz + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

export function pointInPolygon(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, zi = poly[i].z;
    const xj = poly[j].x, zj = poly[j].z;
    const intersect = ((zi > z) !== (zj > z)) &&
      (x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function polygonArea(poly) {
  let area = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    area += (poly[j].x + poly[i].x) * (poly[j].z - poly[i].z);
  }
  return Math.abs(area * 0.5);
}

export function polygonPerimeter(poly) {
  let p = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    p += Math.hypot(b.x - a.x, b.z - a.z);
  }
  return p;
}

export class PlantingEngine {
  constructor(scene, sharedUniforms, terrainSize = 34, splatRes = 512, terrainEngine = null) {
    this.scene = scene;
    this.sharedUniforms = sharedUniforms;
    this.terrainSize = terrainSize;
    this.splatRes = splatRes;
    this.terrainEngine = terrainEngine;
    this.propsEngine = null;

    // ── SPLATMAP DATA TEXTURES (11 NZ Surfaces across 3 RGBA textures) ────────
    const len = splatRes * splatRes * 4;
    this.splatDataA = new Uint8Array(len); // R=0 lawn, G=1 mulch, B=2 pine_bark, A=3 woodchip
    this.splatDataB = new Uint8Array(len); // R=4 greywacke, G=5 limestone, B=6 pebbles, A=7 black_stones
    this.splatDataC = new Uint8Array(len); // R=8 pavers, G=9 schist, B=10 kwila, A=255
    for (let i = 0; i < len; i += 4) {
      this.splatDataA[i] = 255;
      this.splatDataA[i + 1] = 0;
      this.splatDataA[i + 2] = 0;
      this.splatDataA[i + 3] = 0;
      this.splatDataB[i] = 0;
      this.splatDataB[i + 1] = 0;
      this.splatDataB[i + 2] = 0;
      this.splatDataB[i + 3] = 0;
      this.splatDataC[i] = 0;
      this.splatDataC[i + 1] = 0;
      this.splatDataC[i + 2] = 0;
      this.splatDataC[i + 3] = 255;
    }

    this.splatTexA = new THREE.DataTexture(this.splatDataA, splatRes, splatRes, THREE.RGBAFormat);
    this.splatTexA.magFilter = THREE.LinearFilter;
    this.splatTexA.minFilter = THREE.LinearFilter;
    this.splatTexA.needsUpdate = true;

    this.splatTexB = new THREE.DataTexture(this.splatDataB, splatRes, splatRes, THREE.RGBAFormat);
    this.splatTexB.magFilter = THREE.LinearFilter;
    this.splatTexB.minFilter = THREE.LinearFilter;
    this.splatTexB.needsUpdate = true;

    this.splatTexC = new THREE.DataTexture(this.splatDataC, splatRes, splatRes, THREE.RGBAFormat);
    this.splatTexC.magFilter = THREE.LinearFilter;
    this.splatTexC.minFilter = THREE.LinearFilter;
    this.splatTexC.needsUpdate = true;

    // ── INSTANCED PHOTOGRAPHIC PLANT POOLS (23 species -> 5 WebP atlases) ─────
    this.atlases = [];
    this.speciesMeshes = new Map();
    this.plants = [];
    this.nextPlantId = 1;

    // ── PLANTING BEDS & EDGING ────────────────────────────────────────────────
    this.beds = [];
    this.nextBedId = 1;
    this.edgingGroup = new THREE.Group();
    this.handleGroup = new THREE.Group();
    this.scene.add(this.edgingGroup);
    this.scene.add(this.handleGroup);

    // ── UNDO / REDO HISTORY ───────────────────────────────────────────────────
    this.undoStack = [];
    this.redoStack = [];

    this._initSpeciesPools();
    this.heroTrees = new HeroTreeManager(scene, terrainEngine, () => this.syncInstances());
    this.heroTrees.preloadAll();
  }

  setPropsEngine(propsEngine) {
    this.propsEngine = propsEngine;
  }

  _groundY(x, z) {
    return this.terrainEngine ? this.terrainEngine.getHeight(x, z) : 0.0;
  }

  _initSpeciesPools() {
    this._dummy = new THREE.Object3D();
    for (const plant of NZ_PLANTS) {
      const geom = buildPlantGeometry(plant);

      const instVarArr = new Float32Array(MAX_PER_SPECIES * 4);
      const instVarAttr = new THREE.InstancedBufferAttribute(instVarArr, 4);
      geom.setAttribute('aInstVar', instVarAttr);

      // Per-instance 3D ground root (x, terrainY - 0.03, z) for zero floating plants on slopes!
      const instRootArr = new Float32Array(MAX_PER_SPECIES * 3);
      const instRootAttr = new THREE.InstancedBufferAttribute(instRootArr, 3);
      geom.setAttribute('aInstRoot', instRootAttr);

      const mat = createFoliageNodeMaterial(plant, this.sharedUniforms);
      const mesh = new THREE.InstancedMesh(geom, mat, MAX_PER_SPECIES);
      mesh.count = 0;
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      this.speciesMeshes.set(plant.id, { mesh, instVarAttr, instVarArr, instRootAttr, instRootArr });
    }
  }

  // ── TERRAIN SPLATMAP BRUSH PAINTING ─────────────────────────────────────────
  paintSurfaceDisc(wx, wz, radius, channel, strength = 0.85, hardness = 0.65) {
    const S = this.splatRes;
    const half = this.terrainSize * 0.5;
    const uCenter = (wx + half) / this.terrainSize;
    const vCenter = 1.0 - (wz + half) / this.terrainSize;
    const rPx = Math.ceil((radius / this.terrainSize) * S);
    const cx = Math.floor(uCenter * S);
    const cy = Math.floor(vCenter * S);

    const minX = Math.max(0, cx - rPx);
    const maxX = Math.min(S - 1, cx + rPx);
    const minY = Math.max(0, cy - rPx);
    const maxY = Math.min(S - 1, cy + rPx);

    const dA = this.splatDataA;
    const dB = this.splatDataB;
    const dC = this.splatDataC;

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dist = Math.hypot(x - cx, y - cy) / Math.max(1, rPx);
        if (dist > 1.0) continue;
        const falloff = dist < hardness ? 1.0 : 1.0 - (dist - hardness) / Math.max(0.001, 1.0 - hardness);
        const alpha = Math.min(1.0, falloff * falloff * strength);
        const idx = (y * S + x) * 4;

        const w = [
          dA[idx], dA[idx + 1], dA[idx + 2], dA[idx + 3],
          dB[idx], dB[idx + 1], dB[idx + 2], dB[idx + 3],
          dC[idx], dC[idx + 1], dC[idx + 2]
        ];
        for (let c = 0; c < 11; c++) {
          const target = c === channel ? 255 : 0;
          w[c] = Math.round(w[c] * (1 - alpha) + target * alpha);
        }
        dA[idx] = w[0];
        dA[idx + 1] = w[1];
        dA[idx + 2] = w[2];
        dA[idx + 3] = w[3];
        dB[idx] = w[4];
        dB[idx + 1] = w[5];
        dB[idx + 2] = w[6];
        dB[idx + 3] = w[7];
        dC[idx] = w[8];
        dC[idx + 1] = w[9];
        dC[idx + 2] = w[10];
      }
    }
    this.splatTexA.needsUpdate = true;
    this.splatTexB.needsUpdate = true;
    this.splatTexC.needsUpdate = true;
  }

  paintSurfacePolygon(poly, channel, feather = 0.25) {
    const S = this.splatRes;
    const half = this.terrainSize * 0.5;
    let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
    for (const p of poly) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    }
    const px0 = Math.max(0, Math.floor(((minX - feather + half) / this.terrainSize) * S));
    const px1 = Math.min(S - 1, Math.ceil(((maxX + feather + half) / this.terrainSize) * S));
    const py0 = Math.max(0, Math.floor((1.0 - (maxZ + feather + half) / this.terrainSize) * S));
    const py1 = Math.min(S - 1, Math.ceil((1.0 - (minZ - feather + half) / this.terrainSize) * S));

    const dA = this.splatDataA;
    const dB = this.splatDataB;
    const dC = this.splatDataC;
    for (let y = py0; y <= py1; y++) {
      const wz = (1.0 - y / S) * this.terrainSize - half;
      for (let x = px0; x <= px1; x++) {
        const wx = (x / S) * this.terrainSize - half;
        if (!pointInPolygon(wx, wz, poly)) continue;
        const idx = (y * S + x) * 4;
        dA[idx] = channel === 0 ? 255 : 0;
        dA[idx + 1] = channel === 1 ? 255 : 0;
        dA[idx + 2] = channel === 2 ? 255 : 0;
        dA[idx + 3] = channel === 3 ? 255 : 0;
        dB[idx] = channel === 4 ? 255 : 0;
        dB[idx + 1] = channel === 5 ? 255 : 0;
        dB[idx + 2] = channel === 6 ? 255 : 0;
        dB[idx + 3] = channel === 7 ? 255 : 0;
        dC[idx] = channel === 8 ? 255 : 0;
        dC[idx + 1] = channel === 9 ? 255 : 0;
        dC[idx + 2] = channel === 10 ? 255 : 0;
      }
    }
    this.splatTexA.needsUpdate = true;
    this.splatTexB.needsUpdate = true;
    this.splatTexC.needsUpdate = true;
  }

  _hasCollision(x, z, radius, overlapFactor = 0.64) {
    for (let i = 0; i < this.plants.length; i++) {
      const p = this.plants[i];
      const spec = PLANT_MAP[p.speciesId];
      const minDist = (radius + spec.radius) * overlapFactor;
      const dx = p.x - x;
      const dz = p.z - z;
      if (dx * dx + dz * dz < minDist * minDist) return true;
    }
    return false;
  }

  paintSpeciesBrush(wx, wz, brushRadius, speciesId, densityMult = 1.0, autoMulch = true) {
    const spec = PLANT_MAP[speciesId];
    if (!spec) return 0;
    if (autoMulch) {
      this.paintSurfaceDisc(wx, wz, brushRadius * 0.92, 1, 0.42, 0.5);
    }

    const area = Math.PI * brushRadius * brushRadius;
    const targetCount = Math.max(1, Math.min(18, Math.round(area * spec.density * 0.34 * densityMult)));
    let placed = 0;

    for (let n = 0; n < targetCount; n++) {
      let bestX = 0, bestZ = 0, bestScore = -1;
      for (let k = 0; k < 6; k++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * brushRadius;
        const cx = wx + Math.cos(a) * r;
        const cz = wz + Math.sin(a) * r;
        if (Math.abs(cx) > this.terrainSize * 0.46 || Math.abs(cz) > this.terrainSize * 0.46) continue;
        if (this._hasCollision(cx, cz, spec.radius, 0.58)) continue;
        const score = Math.random() + (1 - r / Math.max(0.1, brushRadius)) * 0.3;
        if (score > bestScore) { bestScore = score; bestX = cx; bestZ = cz; }
      }
      if (bestScore >= 0) {
        this._addPlant(speciesId, bestX, bestZ, null);
        placed++;
      }
    }
    if (placed > 0) this.syncInstances();
    return placed;
  }

  paintCompositionBrush(wx, wz, brushRadius, composition, densityMult = 1.0, clumping = 0.65) {
    this.paintSurfaceDisc(wx, wz, brushRadius * 0.98, 1, 0.55, 0.55);
    const area = Math.PI * brushRadius * brushRadius;
    const attempts = Math.max(3, Math.min(32, Math.round(area * composition.density * 0.38 * densityMult)));
    let placed = 0;

    for (let i = 0; i < attempts; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * brushRadius;
      const cx = wx + Math.cos(a) * r;
      const cz = wz + Math.sin(a) * r;
      if (Math.abs(cx) > this.terrainSize * 0.46 || Math.abs(cz) > this.terrainSize * 0.46) continue;

      const spId = this._pickDriftSpecies(cx, cz, composition, clumping, 17);
      const spec = PLANT_MAP[spId];
      if (!spec) continue;
      if (this._hasCollision(cx, cz, spec.radius, 0.58)) continue;

      this._addPlant(spId, cx, cz, null);
      placed++;
    }
    if (placed > 0) this.syncInstances();
    return placed;
  }

  erasePlantsInRadius(wx, wz, brushRadius) {
    const r2 = brushRadius * brushRadius;
    const before = this.plants.length;
    this.plants = this.plants.filter(p => {
      const dx = p.x - wx, dz = p.z - wz;
      return dx * dx + dz * dz > r2;
    });
    const removed = before - this.plants.length;
    if (removed > 0) this.syncInstances();
    if (this.propsEngine) this.propsEngine.erasePropsInRadius(wx, wz, brushRadius);
    return removed;
  }

  _pickDriftSpecies(x, z, composition, clumping, seed = 1) {
    const list = composition.species;
    if (clumping < 0.08) {
      let r = Math.random(), acc = 0;
      for (const s of list) { acc += s.weight; if (r <= acc) return s.id; }
      return list[list.length - 1].id;
    }
    const freq = 0.30 + (1 - clumping) * 0.42;
    let bestId = list[0].id;
    let bestVal = -1e9;
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      const ox = (i * 19.3 + seed * 7.1);
      const oz = (i * 31.7 + seed * 11.3);
      const n = noise2D(x * freq + ox, z * freq + oz);
      const val = Math.log(Math.max(0.01, s.weight)) * 0.45 + n * (0.95 + clumping * 0.9) + Math.random() * (0.42 - clumping * 0.28);
      if (val > bestVal) { bestVal = val; bestId = s.id; }
    }
    return bestId;
  }

  createBed(points, composition, edgingId = 'corten', densityMult = 1.0, clumping = 0.72, name = null) {
    const id = this.nextBedId++;
    const area = polygonArea(points);
    const perimeter = polygonPerimeter(points);
    const bed = {
      id,
      name: name || `${composition.name} Bed ${id}`,
      points: points.map(p => ({ x: p.x, z: p.z })),
      compositionId: composition.id,
      edgingId,
      densityMult,
      clumping,
      seed: Math.floor(Math.random() * 1000),
      area,
      perimeter
    };
    this.beds.push(bed);
    this.paintSurfacePolygon(bed.points, 1, 0.22);
    this._populateBed(bed, composition);
    this.rebuildEdgingMeshes();
    this.syncInstances();
    return bed;
  }

  regenerateBed(bedId, composition, newSeed = true) {
    const bed = this.beds.find(b => b.id === bedId);
    if (!bed) return;
    bed.compositionId = composition.id;
    if (newSeed) bed.seed = Math.floor(Math.random() * 10000);
    this.plants = this.plants.filter(p => p.bedId !== bedId);
    this._populateBed(bed, composition);
    this.syncInstances();
  }

  setBedEdging(bedId, edgingId) {
    const bed = this.beds.find(b => b.id === bedId);
    if (!bed) return;
    bed.edgingId = edgingId;
    this.rebuildEdgingMeshes();
  }

  _populateBed(bed, composition) {
    let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
    for (const p of bed.points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    }

    const targetPlants = Math.min(480, Math.max(16, Math.round(bed.area * composition.density * bed.densityMult)));
    const maxAttempts = targetPlants * 12;
    let placed = 0;

    const cxMean = (minX + maxX) * 0.5;
    const czMean = (minZ + maxZ) * 0.5;

    // 1. Place canopy & structural anchors slightly toward bed interior
    const anchors = composition.species.filter(s => s.layer === 'canopy' || s.layer === 'structure');
    const anchorTarget = Math.max(3, Math.round(targetPlants * 0.16));
    for (let a = 0; a < anchorTarget * 10 && placed < anchorTarget; a++) {
      const rx = minX + Math.random() * (maxX - minX);
      const rz = minZ + Math.random() * (maxZ - minZ);
      const x = rx * 0.80 + cxMean * 0.20;
      const z = rz * 0.80 + czMean * 0.20;
      if (!pointInPolygon(x, z, bed.points)) continue;
      const chosen = anchors[Math.floor(Math.random() * anchors.length)];
      if (!chosen) continue;
      const spec = PLANT_MAP[chosen.id];
      if (this._hasCollision(x, z, spec.radius, 0.68)) continue;
      this._addPlant(spec.id, x, z, bed.id);
      placed++;
    }

    // 2. Lush Piet Oudolf drifts of matrix grasses, perennials, and flowers
    for (let i = 0; i < maxAttempts && placed < targetPlants; i++) {
      const x = minX + Math.random() * (maxX - minX);
      const z = minZ + Math.random() * (maxZ - minZ);
      if (!pointInPolygon(x, z, bed.points)) continue;
      const spId = this._pickDriftSpecies(x, z, composition, bed.clumping, bed.seed);
      const spec = PLANT_MAP[spId];
      if (!spec) continue;
      // Tighter lush overlap for small grasses/flowers so the bed reads richly tapestry-woven
      const overlap = spec.category === 'trees' ? 0.82 : (spec.radius < 0.42 ? 0.44 : 0.54);
      if (this._hasCollision(x, z, spec.radius, overlap)) continue;
      this._addPlant(spId, x, z, bed.id);
      placed++;
    }
  }

  _addPlant(speciesId, x, z, bedId) {
    this.plants.push({
      id: this.nextPlantId++,
      speciesId,
      x,
      z,
      rotY: Math.random() * Math.PI * 2,
      scale: 0.84 + Math.random() * 0.34,
      phase: Math.random(),
      hue: (Math.random() - 0.5) * 2.0,
      bedId
    });
  }

  // ── TERRAIN-CONFORMED 3D BED EDGING & VERTEX HANDLES ────────────────────────
  rebuildEdgingMeshes() {
    while (this.edgingGroup.children.length) {
      const c = this.edgingGroup.children.pop();
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    }
    while (this.handleGroup.children.length) {
      const c = this.handleGroup.children.pop();
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    }

    const handleGeom = new THREE.SphereGeometry(0.085, 12, 10);
    const handleMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, emissive: 0x38bdf8, emissiveIntensity: 0.35, roughness: 0.3
    });

    for (const bed of this.beds) {
      const edgeSpec = NZ_EDGINGS.find(e => e.id === bed.edgingId) || NZ_EDGINGS[0];
      const pts = bed.points;
      if (pts.length < 3) continue;

      const vec3Pts = pts.map(p => new THREE.Vector3(p.x, 0, p.z));
      const curve = new THREE.CatmullRomCurve3(vec3Pts, true, 'centripetal', 0.5);
      const samples = curve.getPoints(pts.length * 10);

      if (edgeSpec.height > 0.001) {
        const positions = [];
        const indices = [];
        const h = edgeSpec.height;
        const hw = edgeSpec.width * 0.5;
        const n = samples.length;

        for (let i = 0; i <= n; i++) {
          const curr = samples[i % n];
          const prev = samples[(i - 1 + n) % n];
          const next = samples[(i + 1) % n];
          const tx = next.x - prev.x;
          const tz = next.z - prev.z;
          const len = Math.hypot(tx, tz) || 1;
          const nx = -tz / len;
          const nz = tx / len;

          const ix = curr.x - nx * hw;
          const iz = curr.z - nz * hw;
          const ox = curr.x + nx * hw;
          const oz = curr.z + nz * hw;
          const yIn = this._groundY(ix, iz);
          const yOut = this._groundY(ox, oz);

          // Skirt extends -0.09m below terrain so edging never floats on steep hillsides
          positions.push(
            ix, yIn - 0.09, iz,
            ix, yIn + h, iz,
            ox, yOut + h, oz,
            ox, yOut - 0.09, oz
          );
        }

        for (let i = 0; i < n; i++) {
          const b0 = i * 4;
          const b1 = (i + 1) * 4;
          indices.push(b0, b1, b0 + 1, b1, b1 + 1, b0 + 1);
          indices.push(b0 + 1, b1 + 1, b0 + 2, b1 + 1, b1 + 2, b0 + 2);
          indices.push(b0 + 2, b1 + 2, b0 + 3, b1 + 2, b1 + 3, b0 + 3);
        }

        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geom.setIndex(indices);
        geom.computeVertexNormals();

        const mat = new THREE.MeshStandardMaterial({
          color: edgeSpec.color,
          roughness: edgeSpec.roughness,
          metalness: edgeSpec.metalness
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = false;
        this.edgingGroup.add(mesh);
      }

      for (const p of pts) {
        const dot = new THREE.Mesh(handleGeom, handleMat.clone());
        dot.position.set(p.x, this._groundY(p.x, p.z) + edgeSpec.height + 0.05, p.z);
        this.handleGroup.add(dot);
      }
    }
  }

  // ── SYNC ALL INSTANCED MESHES TO GPU WITH 3D TERRAIN ROOTS (aInstRoot) ──────
  syncInstances() {
    const counts = new Map();
    for (const plant of NZ_PLANTS) counts.set(plant.id, 0);

    const dummy = this._dummy;
    for (let i = 0; i < this.plants.length; i++) {
      const p = this.plants[i];
      const pool = this.speciesMeshes.get(p.speciesId);
      if (!pool) continue;
      const idx = counts.get(p.speciesId);
      if (idx >= MAX_PER_SPECIES) continue;

      const rootY = this._groundY(p.x, p.z) - 0.03;
      dummy.position.set(p.x, rootY, p.z);
      dummy.rotation.set(0, p.rotY, 0);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      pool.mesh.setMatrixAt(idx, dummy.matrix);

      const off4 = idx * 4;
      pool.instVarArr[off4] = p.x;
      pool.instVarArr[off4 + 1] = p.z;
      pool.instVarArr[off4 + 2] = p.phase;
      pool.instVarArr[off4 + 3] = p.hue;

      const off3 = idx * 3;
      pool.instRootArr[off3] = p.x;
      pool.instRootArr[off3 + 1] = rootY;
      pool.instRootArr[off3 + 2] = p.z;

      counts.set(p.speciesId, idx + 1);
    }

    for (const [spId, pool] of this.speciesMeshes.entries()) {
      const c = counts.get(spId) || 0;
      pool.mesh.count = c;
      pool.mesh.instanceMatrix.needsUpdate = true;
      pool.instVarAttr.needsUpdate = true;
      pool.instRootAttr.needsUpdate = true;
    }
  }

  // ── UNDO / REDO SNAPSHOTS (Plants + Beds + Splatmap + Garden Props) ─────────
  _captureSnapshot() {
    return {
      plants: this.plants.map(p => ({ ...p })),
      beds: this.beds.map(b => ({ ...b, points: b.points.map(pt => ({ ...pt })) })),
      splatA: new Uint8Array(this.splatDataA),
      splatB: new Uint8Array(this.splatDataB),
      splatC: new Uint8Array(this.splatDataC),
      props: this.propsEngine ? this.propsEngine.getSnapshot() : []
    };
  }

  pushUndoState() {
    this.undoStack.push(this._captureSnapshot());
    if (this.undoStack.length > 25) this.undoStack.shift();
    this.redoStack.length = 0;
  }

  undo() {
    if (this.undoStack.length === 0) return false;
    this.redoStack.push(this._captureSnapshot());
    const snap = this.undoStack.pop();
    this._restoreSnapshot(snap);
    return true;
  }

  redo() {
    if (this.redoStack.length === 0) return false;
    this.undoStack.push(this._captureSnapshot());
    const snap = this.redoStack.pop();
    this._restoreSnapshot(snap);
    return true;
  }

  _restoreSnapshot(snap) {
    this.plants = snap.plants;
    this.beds = snap.beds;
    this.splatDataA.set(snap.splatA);
    this.splatDataB.set(snap.splatB);
    if (snap.splatC) this.splatDataC.set(snap.splatC);
    this.splatTexA.needsUpdate = true;
    this.splatTexB.needsUpdate = true;
    this.splatTexC.needsUpdate = true;
    if (this.propsEngine && snap.props) {
      this.propsEngine.restoreSnapshot(snap.props);
    }
    this.rebuildEdgingMeshes();
    this.syncInstances();
  }

  clearAll() {
    this.pushUndoState();
    this.plants = [];
    this.beds = [];
    if (this.propsEngine) this.propsEngine.clearAll();
    const len = this.splatDataA.length;
    for (let i = 0; i < len; i += 4) {
      this.splatDataA[i] = 255;
      this.splatDataA[i + 1] = 0;
      this.splatDataA[i + 2] = 0;
      this.splatDataA[i + 3] = 0;
      this.splatDataB[i] = 0;
      this.splatDataB[i + 1] = 0;
      this.splatDataB[i + 2] = 0;
      this.splatDataB[i + 3] = 0;
      this.splatDataC[i] = 0;
      this.splatDataC[i + 1] = 0;
      this.splatDataC[i + 2] = 0;
      this.splatDataC[i + 3] = 255;
    }
    this.splatTexA.needsUpdate = true;
    this.splatTexB.needsUpdate = true;
    this.splatTexC.needsUpdate = true;
    this.rebuildEdgingMeshes();
    this.syncInstances();
  }

  getStats() {
    const bySpecies = new Map();
    let totalCost = 0;
    for (const p of this.plants) {
      if (heroIds.has(p.id)) continue;
      const spec = PLANT_MAP[p.speciesId];
      if (!spec) continue;
      bySpecies.set(p.speciesId, (bySpecies.get(p.speciesId) || 0) + 1);
      totalCost += spec.priceNZD;
    }
    let bedArea = 0;
    let edgingCost = 0;
    for (const b of this.beds) {
      bedArea += b.area;
      const e = NZ_EDGINGS.find(x => x.id === b.edgingId);
      if (e) edgingCost += b.perimeter * e.pricePerM;
    }
    const propStats = this.propsEngine ? this.propsEngine.getStats() : { count: 0, propCost: 0 };

    let mulchPx = 0;
    const dA = this.splatDataA;
    for (let i = 0; i < dA.length; i += 16) {
      if (dA[i] < 180) mulchPx++;
    }
    const pxRatio = mulchPx / (dA.length / 16);
    const landscapedArea = Math.max(bedArea, pxRatio * this.terrainSize * this.terrainSize);

    const schedule = [...bySpecies.entries()]
      .map(([id, count]) => ({ plant: PLANT_MAP[id], count, subtotal: count * PLANT_MAP[id].priceNZD }))
      .sort((a, b) => b.count - a.count);

    return {
      totalPlants: this.plants.length,
      totalProps: propStats.count,
      speciesCount: bySpecies.size,
      landscapedArea,
      plantCost: totalCost,
      edgingCost,
      propCost: propStats.propCost,
      totalCost: totalCost + edgingCost + propStats.propCost,
      schedule
    };
  }

  setHeroYear(year) {
    if (this.heroTrees) this.heroTrees.setYear(year);
  }
  updateHeroTrees(elapsedSec, windStrength = 0.85) {
    if (this.heroTrees && typeof this.heroTrees.updateWind === "function") {
      this.heroTrees.updateWind(elapsedSec, windStrength);
    }
  }
}
