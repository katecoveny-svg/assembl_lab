import * as THREE from 'three';
import {
  NZ_SPECIES,
  SPECIES_BY_ID,
  EDGING_STYLES,
  MULCH_STYLES,
  NZ_SURFACES,
  sampleClosedSpline,
  polygonAreaM2,
  polygonPerimeterM,
  pointInPolygon,
  distToPolygonEdge,
  pickSpeciesForSpot,
  generateBedPlanting,
  createBrushField,
  stampBrushField,
  extractBrushedLoops,
} from '../catalog.mjs';
import { ATLAS_SPECIES, loadBotanicalAtlases, buildAtlasPlantGeometry } from './botanicalAtlas.mjs';
import { createAtlasFoliageMaterial, createBoulderNodeMaterial } from './tslMaterials.mjs';

const MAX_PER_SPECIES = 900;

/** Watertight midpoint subdivision so mulch bed caps drape smoothly over contoured LINZ slopes */
function subdivideGeometry(geo, passes = 1) {
  let g = geo.clone();
  if (!g.index) {
    const cnt = g.attributes.position.count;
    const idx = new Uint32Array(cnt);
    for (let i = 0; i < cnt; i++) idx[i] = i;
    g.setIndex(new THREE.BufferAttribute(idx, 1));
  }
  for (let p = 0; p < passes; p++) {
    const posAttr = g.attributes.position;
    const uvAttr = g.attributes.uv;
    const oldIdx = g.index.array;
    const verts = [];
    const uvs = [];
    for (let i = 0; i < posAttr.count; i++) {
      verts.push(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
      if (uvAttr) uvs.push(uvAttr.getX(i), uvAttr.getY(i));
    }
    const midCache = new Map();
    const getMid = (a, b) => {
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      const hit = midCache.get(key);
      if (hit !== undefined) return hit;
      const id = verts.length / 3;
      verts.push(
        (verts[a * 3] + verts[b * 3]) * 0.5,
        (verts[a * 3 + 1] + verts[b * 3 + 1]) * 0.5,
        (verts[a * 3 + 2] + verts[b * 3 + 2]) * 0.5
      );
      if (uvAttr) uvs.push((uvs[a * 2] + uvs[b * 2]) * 0.5, (uvs[a * 2 + 1] + uvs[b * 2 + 1]) * 0.5);
      midCache.set(key, id);
      return id;
    };
    const nextIdx = [];
    for (let i = 0; i < oldIdx.length; i += 3) {
      const i0 = oldIdx[i], i1 = oldIdx[i + 1], i2 = oldIdx[i + 2];
      const m01 = getMid(i0, i1), m12 = getMid(i1, i2), m20 = getMid(i2, i0);
      nextIdx.push(i0, m01, m20, i1, m12, m01, i2, m20, m12, m01, m12, m20);
    }
    const nextGeo = new THREE.BufferGeometry();
    nextGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    if (uvAttr) nextGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    nextGeo.setIndex(nextIdx);
    g.dispose();
    g = nextGeo;
  }
  return g;
}

/** Build a draped 3D Corten / Macrocarpa / Basalt kerb along any closed 2D polygon `[x, z][]` */
function buildDrapedKerbGeometry(poly, groundAt, { width = 0.045, height = 0.145, skirtDrop = -0.14 } = {}) {
  const n = poly.length;
  let signedArea = 0;
  for (let i = 0; i < n; i++) {
    const [x1, z1] = poly[i], [x2, z2] = poly[(i + 1) % n];
    signedArea += x1 * z2 - x2 * z1;
  }
  const orient = signedArea >= 0 ? 1 : -1;
  const pos = [];
  const idx = [];
  for (let i = 0; i <= n; i++) {
    const pPrev = poly[(i - 1 + n) % n];
    const pCur = poly[i % n];
    const pNext = poly[(i + 1) % n];
    let tx = pNext[0] - pPrev[0], tz = pNext[1] - pPrev[1];
    const len = Math.hypot(tx, tz) || 1;
    tx /= len; tz /= len;
    const nx = tz * orient, nz = -tx * orient;
    const xIn = pCur[0] - nx * (width * 0.4), zIn = pCur[1] - nz * (width * 0.4);
    const xOut = pCur[0] + nx * (width * 0.6), zOut = pCur[1] + nz * (width * 0.6);
    const ghIn = groundAt(xIn, zIn);
    const ghOut = groundAt(xOut, zOut);
    pos.push(
      xIn, ghIn + skirtDrop, zIn,
      xIn, ghIn + height, zIn,
      xOut, ghOut + height, zOut,
      xOut, ghOut + skirtDrop, zOut
    );
  }
  for (let i = 0; i < n; i++) {
    const a = i * 4, b = (i + 1) * 4;
    idx.push(a + 0, a + 1, b + 1, a + 0, b + 1, b + 0);
    idx.push(a + 1, a + 2, b + 2, a + 1, b + 2, b + 1);
    idx.push(a + 2, a + 3, b + 3, a + 2, b + 3, b + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

export class PlantingEngine {
  constructor(scene, sharedUniforms, surfaceTextures, { terrainWidth = 36, terrainDepth = 36, splatRes = 512 } = {}) {
    this.scene = scene;
    this.sharedUniforms = sharedUniforms;
    this.surfaceTextures = surfaceTextures;
    this.terrainWidth = terrainWidth;
    this.terrainDepth = terrainDepth;
    this.splatRes = splatRes;
    this.groundHeightFn = () => 0;

    // ── 6-CHANNEL GPU SPLATMAP DATA TEXTURES ─────────────────────────────────
    const len = splatRes * splatRes * 4;
    this.splatDataA = new Uint8Array(len); // R=lawn/plan, G=mulch, B=pavers, A=pebbles
    this.splatDataB = new Uint8Array(len); // R=schist, G=kwila
    this.resetSplatmap(false);

    this.splatTexA = new THREE.DataTexture(this.splatDataA, splatRes, splatRes, THREE.RGBAFormat);
    this.splatTexA.magFilter = THREE.LinearFilter;
    this.splatTexA.minFilter = THREE.LinearFilter;
    this.splatTexA.needsUpdate = true;

    this.splatTexB = new THREE.DataTexture(this.splatDataB, splatRes, splatRes, THREE.RGBAFormat);
    this.splatTexB.magFilter = THREE.LinearFilter;
    this.splatTexB.minFilter = THREE.LinearFilter;
    this.splatTexB.needsUpdate = true;

    // ── FREEHAND 2D GARDEN BED BRUSH SCALAR FIELD ────────────────────────────
    this.brushField = createBrushField({ spanM: 48, res: 144 });

    // ── SCENE GROUPS ─────────────────────────────────────────────────────────
    this.plantsGroup = new THREE.Group();
    this.plantsGroup.name = 'nz_native_plants';
    this.bedsGroup = new THREE.Group();
    this.bedsGroup.name = 'nz_garden_beds';
    this.handleGroup = new THREE.Group();
    this.handleGroup.name = 'nz_bed_handles';
    this.uplightsGroup = new THREE.Group();
    this.scene.add(this.plantsGroup, this.bedsGroup, this.handleGroup, this.uplightsGroup);

    // ── PHOTOREALISTIC BOTANICAL ATLAS INSTANCED MESH POOLS (25 SPECIES) ─────
    this.atlases = loadBotanicalAtlases('./assets');
    this.speciesMeshes = new Map();
    this.plants = []; // { id, speciesId, x, z, rot, scale, phase, hue, bedId }
    this.nextPlantId = 1;

    // ── BEDS (Spline Islands + Freehand Brushed Site-Plan Gardens) ───────────
    this.splineBeds = [];
    this.brushedBeds = [];
    this.nextBedId = 1;
    this.cachedPolys = new Map();
    this.brushedEdging = 'corten';
    this.brushedMulch = 'bark';
    this.uplightsOn = false;
    this.uplightIntensity = 0.0;
    this.activeBedId = null;

    // ── UNDO / REDO HISTORY ──────────────────────────────────────────────────
    this.undoStack = [];
    this.redoStack = [];

    this._initSpeciesPools();
  }

  _initSpeciesPools() {
    this._dummy = new THREE.Object3D();
    for (const plant of NZ_SPECIES) {
      const geom = buildAtlasPlantGeometry(plant);

      const instVarArr = new Float32Array(MAX_PER_SPECIES * 4);
      const instVarAttr = new THREE.InstancedBufferAttribute(instVarArr, 4);
      geom.setAttribute('aInstVar', instVarAttr);

      const instRootArr = new Float32Array(MAX_PER_SPECIES * 3);
      const instRootAttr = new THREE.InstancedBufferAttribute(instRootArr, 3);
      geom.setAttribute('aInstRoot', instRootAttr);

      let mat;
      if (plant.tier === 'stone' || plant.archetype === 'boulder') {
        mat = createBoulderNodeMaterial();
      } else {
        const spec = ATLAS_SPECIES[plant.id] || ATLAS_SPECIES.harakeke;
        mat = createAtlasFoliageMaterial(plant, this.atlases[spec.atlas], this.sharedUniforms, spec.tint || '#ffffff');
      }

      const mesh = new THREE.InstancedMesh(geom, mat, MAX_PER_SPECIES);
      mesh.count = 0;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false; // Critical WebGPU rule for TSL vertex wind displacement
      this.plantsGroup.add(mesh);
      this.speciesMeshes.set(plant.id, { mesh, instVarAttr, instVarArr, instRootAttr, instRootArr, plant });
    }
  }

  setTerrainDimensions(widthM, depthM) {
    this.terrainWidth = widthM;
    this.terrainDepth = depthM;
    const neededSpan = Math.max(48, Math.ceil(Math.max(widthM, depthM) * 1.15));
    if (Math.abs(this.brushField.spanM - neededSpan) > 4) {
      this.brushField = createBrushField({ spanM: neededSpan, res: 152 });
    }
  }

  setGroundHeightFn(fn) {
    this.groundHeightFn = fn || (() => 0);
  }

  groundHeightAt(x, z) {
    return this.groundHeightFn(x, z);
  }

  getAllBeds() {
    return [...this.splineBeds, ...this.brushedBeds];
  }

  refreshBedPolys() {
    this.cachedPolys.clear();
    for (const b of this.splineBeds) this.cachedPolys.set(b.id, sampleClosedSpline(b.points, 12));
    for (const b of this.brushedBeds) this.cachedPolys.set(b.id, b.points);
  }

  plantSupportHeightAt(x, z) {
    const base = this.groundHeightAt(x, z);
    for (const b of this.getAllBeds()) {
      const poly = this.cachedPolys.get(b.id);
      if (poly && pointInPolygon(x, z, poly)) {
        const ed = distToPolygonEdge(x, z, poly);
        return base + (b.edging === 'natural' ? 0.02 : 0.05) + Math.min(0.085, ed * 0.05);
      }
    }
    return base;
  }

  findContainingBed(x, z) {
    for (const b of this.getAllBeds()) {
      const poly = this.cachedPolys.get(b.id);
      if (poly && pointInPolygon(x, z, poly)) return { bed: b, poly };
    }
    return null;
  }

  // ── 6-CHANNEL GPU SPLATMAP BRUSHING ────────────────────────────────────────
  resetSplatmap(upload = true) {
    const len = this.splatDataA.length;
    for (let i = 0; i < len; i += 4) {
      this.splatDataA[i] = 255;
      this.splatDataA[i + 1] = 0;
      this.splatDataA[i + 2] = 0;
      this.splatDataA[i + 3] = 0;
      this.splatDataB[i] = 0;
      this.splatDataB[i + 1] = 0;
      this.splatDataB[i + 2] = 0;
      this.splatDataB[i + 3] = 255;
    }
    if (upload && this.splatTexA) {
      this.splatTexA.needsUpdate = true;
      this.splatTexB.needsUpdate = true;
    }
  }

  paintSurfaceDisc(wx, wz, radius, channel, strength = 0.85, hardness = 0.62) {
    const S = this.splatRes;
    const halfW = this.terrainWidth * 0.5;
    const halfD = this.terrainDepth * 0.5;
    const uCenter = (wx + halfW) / this.terrainWidth;
    const vCenter = 1.0 - (wz + halfD) / this.terrainDepth;
    const rPxX = Math.max(1, Math.ceil((radius / this.terrainWidth) * S));
    const rPxY = Math.max(1, Math.ceil((radius / this.terrainDepth) * S));
    const cx = Math.floor(uCenter * S);
    const cy = Math.floor(vCenter * S);

    const minX = Math.max(0, cx - rPxX);
    const maxX = Math.min(S - 1, cx + rPxX);
    const minY = Math.max(0, cy - rPxY);
    const maxY = Math.min(S - 1, cy + rPxY);

    const dA = this.splatDataA;
    const dB = this.splatDataB;

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = (x - cx) / rPxX;
        const dy = (y - cy) / rPxY;
        const dist = Math.hypot(dx, dy);
        if (dist > 1.0) continue;
        const falloff = dist < hardness ? 1.0 : 1.0 - (dist - hardness) / Math.max(0.001, 1.0 - hardness);
        const alpha = Math.min(1.0, falloff * falloff * strength);
        const idx = (y * S + x) * 4;

        const w = [dA[idx], dA[idx + 1], dA[idx + 2], dA[idx + 3], dB[idx], dB[idx + 1]];
        for (let c = 0; c < 6; c++) {
          const target = c === channel ? 255 : 0;
          w[c] = Math.round(w[c] * (1 - alpha) + target * alpha);
        }
        dA[idx] = w[0];
        dA[idx + 1] = w[1];
        dA[idx + 2] = w[2];
        dA[idx + 3] = w[3];
        dB[idx] = w[4];
        dB[idx + 1] = w[5];
      }
    }
    this.splatTexA.needsUpdate = true;
    this.splatTexB.needsUpdate = true;
  }

  paintSurfacePolygon(poly, channel, feather = 0.2) {
    const norm = poly.map((p) => (Array.isArray(p) ? p : [p.x, p.z]));
    if (norm.length < 3) return;
    const S = this.splatRes;
    const halfW = this.terrainWidth * 0.5;
    const halfD = this.terrainDepth * 0.5;
    let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
    for (const [x, z] of norm) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
    const px0 = Math.max(0, Math.floor(((minX - feather + halfW) / this.terrainWidth) * S));
    const px1 = Math.min(S - 1, Math.ceil(((maxX + feather + halfW) / this.terrainWidth) * S));
    const py0 = Math.max(0, Math.floor((1.0 - (maxZ + feather + halfD) / this.terrainDepth) * S));
    const py1 = Math.min(S - 1, Math.ceil((1.0 - (minZ - feather + halfD) / this.terrainDepth) * S));

    const dA = this.splatDataA;
    const dB = this.splatDataB;
    for (let y = py0; y <= py1; y++) {
      const wz = (1.0 - y / S) * this.terrainDepth - halfD;
      for (let x = px0; x <= px1; x++) {
        const wx = (x / S) * this.terrainWidth - halfW;
        if (!pointInPolygon(wx, wz, norm)) continue;
        const idx = (y * S + x) * 4;
        dA[idx] = channel === 0 ? 255 : 0;
        dA[idx + 1] = channel === 1 ? 255 : 0;
        dA[idx + 2] = channel === 2 ? 255 : 0;
        dA[idx + 3] = channel === 3 ? 255 : 0;
        dB[idx] = channel === 4 ? 255 : 0;
        dB[idx + 1] = channel === 5 ? 255 : 0;
      }
    }
    this.splatTexA.needsUpdate = true;
    this.splatTexB.needsUpdate = true;
  }

  getSurfaceAreasM2() {
    const dA = this.splatDataA;
    const dB = this.splatDataB;
    const totals = [0, 0, 0, 0, 0, 0];
    let samples = 0;
    for (let i = 0; i < dA.length; i += 16) {
      const sum = Math.max(1, dA[i] + dA[i + 1] + dA[i + 2] + dA[i + 3] + dB[i] + dB[i + 1]);
      totals[0] += dA[i] / sum;
      totals[1] += dA[i + 1] / sum;
      totals[2] += dA[i + 2] / sum;
      totals[3] += dA[i + 3] / sum;
      totals[4] += dB[i] / sum;
      totals[5] += dB[i + 1] / sum;
      samples++;
    }
    const totalArea = this.terrainWidth * this.terrainDepth;
    const map = {};
    for (const s of NZ_SURFACES) {
      map[s.id] = (totals[s.channel] / Math.max(1, samples)) * totalArea;
    }
    return map;
  }

  // ── COLLISION & BRUSHING ───────────────────────────────────────────────────
  _hasCollision(x, z, radius, overlapFactor = 0.68) {
    for (let i = 0; i < this.plants.length; i++) {
      const p = this.plants[i];
      const spec = SPECIES_BY_ID[p.speciesId];
      const minDist = (radius + (spec?.radius ?? 0.45)) * overlapFactor;
      const dx = p.x - x;
      const dz = p.z - z;
      if (dx * dx + dz * dz < minDist * minDist) return true;
    }
    return false;
  }

  _addPlant(speciesId, x, z, bedId = null) {
    const sp = SPECIES_BY_ID[speciesId];
    if (!sp) return;
    this.plants.push({
      id: `p_${this.nextPlantId++}`,
      speciesId: sp.id,
      x: +x.toFixed(3),
      z: +z.toFixed(3),
      rot: +(Math.random() * Math.PI * 2).toFixed(3),
      scale: +(0.84 + Math.random() * 0.34).toFixed(3),
      phase: Math.random(),
      hue: (Math.random() - 0.5) * 2.0,
      bedId,
    });
  }

  paintSpeciesBrush(wx, wz, brushRadius, speciesId, densityMult = 1.0, autoMulch = true, avoidFn = null) {
    const spec = SPECIES_BY_ID[speciesId];
    if (!spec) return 0;
    if (autoMulch) {
      this.paintSurfaceDisc(wx, wz, brushRadius * 0.9, 1, 0.38, 0.5);
    }
    const area = Math.PI * brushRadius * brushRadius;
    const isSingleStamp = brushRadius <= 0.85;
    const targetCount = isSingleStamp
      ? 1
      : Math.max(1, Math.min(16, Math.round(area * spec.density * 0.32 * densityMult)));
    let placed = 0;

    for (let n = 0; n < targetCount; n++) {
      let bestX = 0, bestZ = 0, bestScore = -1;
      const tries = isSingleStamp ? 1 : 6;
      for (let k = 0; k < tries; k++) {
        const a = Math.random() * Math.PI * 2;
        const r = isSingleStamp ? 0 : Math.sqrt(Math.random()) * brushRadius;
        const cx = wx + Math.cos(a) * r;
        const cz = wz + Math.sin(a) * r;
        if (Math.abs(cx) > this.terrainWidth * 0.48 || Math.abs(cz) > this.terrainDepth * 0.48) continue;
        if (avoidFn && avoidFn(cx, cz)) continue;
        if (this._hasCollision(cx, cz, spec.radius, isSingleStamp ? 0.38 : 0.62)) continue;
        const score = Math.random() + (1 - r / Math.max(0.1, brushRadius)) * 0.3;
        if (score > bestScore) { bestScore = score; bestX = cx; bestZ = cz; }
      }
      if (bestScore >= 0) {
        const hit = this.findContainingBed(bestX, bestZ);
        this._addPlant(spec.id, bestX, bestZ, hit ? hit.bed.id : null);
        placed++;
      }
    }
    if (placed > 0) this.syncInstances();
    return placed;
  }

  paintCompositionBrush(wx, wz, brushRadius, composition, densityMult = 1.0, clumping = 0.72, autoMulch = true, avoidFn = null) {
    if (autoMulch) {
      this.paintSurfaceDisc(wx, wz, brushRadius * 0.96, 1, 0.52, 0.55);
    }
    const area = Math.PI * brushRadius * brushRadius;
    const attempts = Math.max(4, Math.min(26, Math.round(area * (composition.density || 3.4) * 0.38 * densityMult)));
    let placed = 0;

    for (let i = 0; i < attempts; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * brushRadius;
      const cx = wx + Math.cos(a) * r;
      const cz = wz + Math.sin(a) * r;
      if (Math.abs(cx) > this.terrainWidth * 0.48 || Math.abs(cz) > this.terrainDepth * 0.48) continue;
      if (avoidFn && avoidFn(cx, cz)) continue;

      const hit = this.findContainingBed(cx, cz);
      const edgeD = hit ? distToPolygonEdge(cx, cz, hit.poly) : 1.4;
      const spId = pickSpeciesForSpot(composition, edgeD, Math.random, cx, cz, clumping, 17);
      const spec = SPECIES_BY_ID[spId];
      if (!spec) continue;
      if (this._hasCollision(cx, cz, spec.radius, 0.64)) continue;

      this._addPlant(spec.id, cx, cz, hit ? hit.bed.id : null);
      placed++;
    }
    if (placed > 0) this.syncInstances();
    return placed;
  }

  /** Freehand Site-Plan / Land Garden Bed Brush: stamps scalar field -> smooth 3D Corten/mulch bed + stratified NZ plants! */
  applyGardenBedStroke(wx, wz, brushRadius, {
    composition,
    singleSpeciesId = null,
    densityMult = 1.0,
    clumping = 0.72,
    erase = false,
    avoidFn = null,
  }) {
    if (erase) {
      stampBrushField(this.brushField, wx, wz, brushRadius, -1);
      this.syncBrushedBedsFromField();
      this.erasePlantsInRadius(wx, wz, brushRadius);
      return;
    }

    stampBrushField(this.brushField, wx, wz, brushRadius, +1);
    const mulchChannel = MULCH_STYLES[this.brushedMulch]?.channel ?? 1;
    this.paintSurfaceDisc(wx, wz, brushRadius * 0.92, mulchChannel, 0.65, 0.6);
    this.syncBrushedBedsFromField();

    const attempts = Math.max(8, Math.round(brushRadius * 10 * densityMult));
    let added = 0;
    for (let i = 0; i < attempts; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = Math.sqrt(Math.random()) * brushRadius * 0.92;
      const px = wx + Math.cos(ang) * dist;
      const pz = wz + Math.sin(ang) * dist;
      if (avoidFn && avoidFn(px, pz)) continue;

      const hit = this.findContainingBed(px, pz);
      if (!hit) continue;
      const edgeD = distToPolygonEdge(px, pz, hit.poly);
      if (edgeD < 0.18) continue;

      const spId = singleSpeciesId || pickSpeciesForSpot(composition, edgeD, Math.random, px, pz, clumping, 29);
      const spec = SPECIES_BY_ID[spId];
      if (!spec) continue;
      if (spec.tier === 'canopy' && edgeD < 0.5) continue;
      if (this._hasCollision(px, pz, spec.radius, 0.64)) continue;

      this._addPlant(spec.id, px, pz, hit.bed.id);
      added++;
    }
    if (added > 0) this.syncInstances();
  }

  erasePlantsInRadius(wx, wz, brushRadius, alsoCarveBeds = false) {
    if (alsoCarveBeds) {
      stampBrushField(this.brushField, wx, wz, brushRadius, -1);
      this.syncBrushedBedsFromField();
    }
    const r2 = brushRadius * brushRadius;
    const before = this.plants.length;
    this.plants = this.plants.filter((p) => {
      const dx = p.x - wx, dz = p.z - wz;
      return dx * dx + dz * dz > r2;
    });
    const removed = before - this.plants.length;
    if (removed > 0) this.syncInstances();
    return removed;
  }

  // ── BED CREATION & REGENERATION ────────────────────────────────────────────
  createSplineBed(points, composition, {
    edging = 'corten',
    mulch = 'bark',
    densityMult = 1.0,
    clumping = 0.72,
    name = null,
    seed = null,
  } = {}) {
    const id = `bed-${this.nextBedId++}`;
    const normPts = points.map((p) => (Array.isArray(p) ? [p[0], p[1]] : [p.x, p.z]));
    const bed = {
      id,
      name: name || `${composition.title} Bed`,
      points: normPts,
      compositionId: composition.id,
      edging,
      mulch,
      densityMult,
      clumping,
      seed: seed ?? Math.floor(Math.random() * 10000),
      isRawPoly: false,
    };
    this.splineBeds.push(bed);
    this.activeBedId = id;

    const poly = sampleClosedSpline(normPts, 12);
    const mulchCh = MULCH_STYLES[mulch]?.channel ?? 1;
    this.paintSurfacePolygon(poly, mulchCh, 0.2);

    const fresh = generateBedPlanting({
      controlPoints: normPts,
      isRawPoly: false,
      compositionId: composition.id,
      seed: bed.seed,
      density: densityMult,
      clumping,
      bedId: id,
    });
    for (const fp of fresh) {
      this.plants.push({ ...fp, phase: Math.random(), hue: (Math.random() - 0.5) * 2.0 });
    }
    this.rebuildBeds3D();
    this.syncInstances();
    return bed;
  }

  syncBrushedBedsFromField() {
    const loops = extractBrushedLoops(this.brushField, 0.45);
    this.brushedBeds = loops.map((poly, i) => ({
      id: `brushed-${i + 1}`,
      name: `Brushed Garden ${i + 1}`,
      edging: this.brushedEdging,
      mulch: this.brushedMulch,
      points: poly,
      isRawPoly: true,
    }));
    if (this.brushedBeds.length && !this.getAllBeds().some((b) => b.id === this.activeBedId)) {
      this.activeBedId = this.brushedBeds[0].id;
    }
    this.rebuildBeds3D();
  }

  regenerateBed(bedId, composition, densityMult = 1.0, clumping = 0.72) {
    const target = this.getAllBeds().find((b) => b.id === bedId) || this.getAllBeds()[this.getAllBeds().length - 1];
    if (!target) return 0;
    target.compositionId = composition.id;
    target.seed = Math.floor(Math.random() * 100000);
    this.plants = this.plants.filter((p) => p.bedId !== target.id);

    const fresh = generateBedPlanting({
      controlPoints: target.points,
      isRawPoly: Boolean(target.isRawPoly),
      compositionId: composition.id,
      seed: target.seed,
      density: densityMult,
      clumping,
      bedId: target.id,
    });
    for (const fp of fresh) {
      this.plants.push({ ...fp, phase: Math.random(), hue: (Math.random() - 0.5) * 2.0 });
    }
    this.syncInstances();
    return fresh.length;
  }

  // ── 3D BED MESHES (MULCH CAP, DRAPED KERB, VERTEX HANDLES, UPLIGHTS) ───────
  rebuildBeds3D(sculptMode = false) {
    this.refreshBedPolys();
    for (const grp of [this.bedsGroup, this.handleGroup, this.uplightsGroup]) {
      while (grp.children.length) {
        const c = grp.children.pop();
        if (c.geometry) c.geometry.dispose();
        if (c.material) {
          if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose());
          else c.material.dispose();
        }
      }
    }

    const allBeds = this.getAllBeds();
    for (const bed of allBeds) {
      const poly = this.cachedPolys.get(bed.id);
      if (!poly || poly.length < 3) continue;

      // Mounded mulch cap draped over ground/hillside (essential on Site Plans & Photo Backdrops!)
      const shape = new THREE.Shape();
      shape.moveTo(poly[0][0], -poly[0][1]);
      for (let i = 1; i < poly.length; i++) shape.lineTo(poly[i][0], -poly[i][1]);
      shape.closePath();

      const rawCap = new THREE.ShapeGeometry(shape, 1);
      const capGeo = subdivideGeometry(rawCap, bed.isRawPoly ? 1 : 2);
      rawCap.dispose();

      const pos = capGeo.attributes.position;
      const uvs = capGeo.attributes.uv;
      const baseLift = bed.edging === 'natural' ? 0.018 : 0.048;
      for (let i = 0; i < pos.count; i++) {
        const wx = pos.getX(i);
        const wz = -pos.getY(i);
        const ed = distToPolygonEdge(wx, wz, poly);
        const mound = baseLift + Math.min(0.088, ed * 0.052);
        pos.setXYZ(i, wx, this.groundHeightAt(wx, wz) + mound, wz);
        if (uvs) uvs.setXY(i, wx * 0.38, wz * 0.38);
      }
      capGeo.computeVertexNormals();

      const mulchTex = bed.mulch === 'pebble'
        ? this.surfaceTextures.pebbles
        : bed.mulch === 'scoria'
          ? this.surfaceTextures.schist
          : this.surfaceTextures.mulch;

      const mulchMesh = new THREE.Mesh(
        capGeo,
        new THREE.MeshStandardMaterial({
          map: mulchTex,
          roughness: 0.94,
          metalness: 0.0,
        })
      );
      mulchMesh.receiveShadow = true;
      mulchMesh.userData = { bedId: bed.id };
      this.bedsGroup.add(mulchMesh);

      // Draped 3D Corten / Macrocarpa / Basalt edging kerb
      const edg = EDGING_STYLES[bed.edging] ?? EDGING_STYLES.corten;
      if (edg.height > 0.005) {
        const kerbGeo = buildDrapedKerbGeometry(poly, (x, z) => this.groundHeightAt(x, z), {
          width: edg.width,
          height: edg.height,
          skirtDrop: -0.14,
        });
        const kerbMesh = new THREE.Mesh(
          kerbGeo,
          new THREE.MeshStandardMaterial({
            color: edg.color,
            roughness: edg.rough,
            metalness: edg.metal,
          })
        );
        kerbMesh.castShadow = true;
        kerbMesh.receiveShadow = true;
        kerbMesh.userData = { bedId: bed.id, isKerb: true };
        this.bedsGroup.add(kerbMesh);
      }

      // Draggable architectural vertex handles for spline beds (ivory + dusty rose per DESIGN.md)
      if (!bed.isRawPoly) {
        const isSelected = bed.id === this.activeBedId;
        const hGeo = new THREE.CylinderGeometry(0.115, 0.115, 0.04, 18);
        const hMat = new THREE.MeshStandardMaterial({
          color: isSelected && sculptMode ? 0xe8b732 : 0xfffdfb,
          emissive: isSelected && sculptMode ? 0xe8b732 : 0xd9bacb,
          emissiveIntensity: 0.25,
          roughness: 0.3,
        });
        bed.points.forEach(([hx, hz], ptIdx) => {
          const hy = this.groundHeightAt(hx, hz) + Math.max(0.08, edg.height) + 0.03;
          const knob = new THREE.Mesh(hGeo.clone(), hMat.clone());
          knob.position.set(hx, hy, hz);
          knob.scale.setScalar(sculptMode ? 1.2 : 0.85);
          knob.userData = { isSplineHandle: true, bedId: bed.id, pointIndex: ptIdx };
          this.handleGroup.add(knob);
        });
        hGeo.dispose();
        hMat.dispose();
      }

      // Warm architectural bronze garden uplights (glow softly at Dusk / Studio)
      if (this.uplightsOn && this.uplightIntensity > 0.05 && poly.length >= 4) {
        let cx = 0, cz = 0;
        for (const [px, pz] of poly) { cx += px; cz += pz; }
        cx /= poly.length; cz /= poly.length;
        const pA = poly[0], pB = poly[Math.floor(poly.length / 2)];
        for (const [lx, lz] of [[cx * 0.6 + pA[0] * 0.4, cz * 0.6 + pA[1] * 0.4], [cx * 0.6 + pB[0] * 0.4, cz * 0.6 + pB[1] * 0.4]]) {
          const ly = this.plantSupportHeightAt(lx, lz);
          const pl = new THREE.PointLight(0xffcb85, this.uplightIntensity, 7.0, 1.5);
          pl.position.set(lx, ly + 0.35, lz);
          this.uplightsGroup.add(pl);
        }
      }
    }
  }

  // ── SYNC ALL INSTANCED MESHES TO GPU ───────────────────────────────────────
  syncInstances() {
    const counts = new Map();
    for (const plant of NZ_SPECIES) counts.set(plant.id, 0);

    const dummy = this._dummy;
    for (let i = 0; i < this.plants.length; i++) {
      const p = this.plants[i];
      const pool = this.speciesMeshes.get(p.speciesId);
      if (!pool) continue;
      const idx = counts.get(p.speciesId);
      if (idx >= MAX_PER_SPECIES) continue;

      const py = this.plantSupportHeightAt(p.x, p.z) - 0.025;
      dummy.position.set(p.x, py, p.z);
      dummy.rotation.set(0, p.rot || 0, 0);
      dummy.scale.setScalar(p.scale || 1);
      dummy.updateMatrix();
      pool.mesh.setMatrixAt(idx, dummy.matrix);

      const off4 = idx * 4;
      pool.instVarArr[off4] = p.x;
      pool.instVarArr[off4 + 1] = p.z;
      pool.instVarArr[off4 + 2] = p.phase ?? 0.5;
      pool.instVarArr[off4 + 3] = p.hue ?? 0.0;

      const off3 = idx * 3;
      pool.instRootArr[off3] = p.x;
      pool.instRootArr[off3 + 1] = py;
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

  // ── UNDO / REDO SNAPSHOTS ──────────────────────────────────────────────────
  _captureSnapshot() {
    return {
      plants: this.plants.map((p) => ({ ...p })),
      splineBeds: JSON.parse(JSON.stringify(this.splineBeds)),
      fieldCopy: new Float32Array(this.brushField.data),
      splatA: new Uint8Array(this.splatDataA),
      splatB: new Uint8Array(this.splatDataB),
    };
  }

  pushUndoState() {
    this.undoStack.push(this._captureSnapshot());
    if (this.undoStack.length > 25) this.undoStack.shift();
    this.redoStack.length = 0;
  }

  undo() {
    if (!this.undoStack.length) return false;
    this.redoStack.push(this._captureSnapshot());
    this._restoreSnapshot(this.undoStack.pop());
    return true;
  }

  redo() {
    if (!this.redoStack.length) return false;
    this.undoStack.push(this._captureSnapshot());
    this._restoreSnapshot(this.redoStack.pop());
    return true;
  }

  _restoreSnapshot(snap) {
    this.plants = snap.plants;
    this.splineBeds = snap.splineBeds;
    if (snap.fieldCopy && snap.fieldCopy.length === this.brushField.data.length) {
      this.brushField.data.set(snap.fieldCopy);
    }
    this.splatDataA.set(snap.splatA);
    this.splatDataB.set(snap.splatB);
    this.splatTexA.needsUpdate = true;
    this.splatTexB.needsUpdate = true;
    this.syncBrushedBedsFromField();
    this.syncInstances();
  }

  clearAll(keepSplat = false) {
    this.pushUndoState();
    this.plants = [];
    this.splineBeds = [];
    this.brushedBeds = [];
    this.brushField.data.fill(0);
    if (!keepSplat) this.resetSplatmap(true);
    this.rebuildBeds3D();
    this.syncInstances();
  }
}
