import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { SPECIES_BY_ID } from '../catalog.mjs';

// ── TIER 1: REAL 3D .GLB HERO TREES (Meshopt-enabled, Box3 normalized, slope-grounded) ──
export const HERO_TREE_MODELS = {
  nikau: {
    url: './assets/models/nikau-hero-blender.glb',
    heightBoost: 1.04,
    swayAmp: 0.018,
    maxInstances: 32,
  },
  pohutukawa: {
    url: './assets/models/pohutukawa-hero.glb',
    heightBoost: 1.0,
    swayAmp: 0.012,
    maxInstances: 24,
  },
  manuka: {
    url: './assets/models/manuka-hero.glb',
    heightBoost: 1.02,
    swayAmp: 0.022,
    maxInstances: 40,
  },
  kowhai: {
    url: '/plan-studio/library/glb/manu-kowhai.glb',
    heightBoost: 1.0,
    swayAmp: 0.015,
    maxInstances: 24,
  },
};

// ── TIER 2: 25 AUTHENTIC AOTEAROA SPECIES -> 5 EDGE-DILATED 2x2 RGBA ATLASES ──
// Strictly ZERO lavender quadrant (atlas 3 col 0 row 1 is unused).
export const SPECIES_ATLAS_MAP = {
  // Atlas 0 — Structural Flax, Ferns & Silver Spear
  harakeke:       { atlas: 0, col: 0, row: 0, mode: 'clump', tint: '#ffffff', widthScale: 1.05, heightScale: 1.0 },
  ponga:          { atlas: 0, col: 1, row: 0, mode: 'ponga', tint: '#ffffff', widthScale: 1.08, heightScale: 1.0 },
  astelia:        { atlas: 0, col: 0, row: 1, mode: 'clump', tint: '#ffffff', widthScale: 1.08, heightScale: 1.0 },
  silver_spear:   { atlas: 0, col: 0, row: 1, mode: 'clump', tint: '#ffffff', widthScale: 1.08, heightScale: 1.0 },
  platts_black:   { atlas: 0, col: 1, row: 1, mode: 'clump', tint: '#ffffff', widthScale: 1.08, heightScale: 1.0 },

  // Atlas 1 — Native Tussocks, Sedges & Iris
  toetoe:         { atlas: 1, col: 0, row: 0, mode: 'clump', tint: '#ffffff', widthScale: 1.05, heightScale: 1.12 },
  chionochloa:    { atlas: 1, col: 1, row: 0, mode: 'clump', tint: '#ffffff', widthScale: 1.08, heightScale: 1.0 },
  red_tussock:    { atlas: 1, col: 1, row: 0, mode: 'clump', tint: '#ffffff', widthScale: 1.08, heightScale: 1.0 },
  carex_testacea: { atlas: 1, col: 0, row: 1, mode: 'clump', tint: '#ffffff', widthScale: 1.15, heightScale: 1.0 },
  libertia:       { atlas: 1, col: 1, row: 1, mode: 'clump', tint: '#ffffff', widthScale: 1.02, heightScale: 1.02 },
  carex_secta:    { atlas: 1, col: 0, row: 1, mode: 'clump', tint: '#92be70', widthScale: 1.16, heightScale: 1.08 },
  poa_cita:       { atlas: 1, col: 0, row: 1, mode: 'clump', tint: '#d9dfa8', widthScale: 1.08, heightScale: 1.05 },

  // Atlas 2 — Trees & Shrubs (Tier 1 GLBs supersede nikau/pohutukawa/manuka/kowhai once loaded)
  pohutukawa:     { atlas: 2, col: 0, row: 0, mode: 'tree',  tint: '#ffffff', widthScale: 1.02, heightScale: 1.0 },
  kowhai:         { atlas: 2, col: 1, row: 0, mode: 'tree',  tint: '#ffffff', widthScale: 1.02, heightScale: 1.0 },
  tikouka:        { atlas: 2, col: 0, row: 1, mode: 'tree',  tint: '#ffffff', widthScale: 1.15, heightScale: 1.0 },
  manuka:         { atlas: 2, col: 1, row: 1, mode: 'shrub', tint: '#ffffff', widthScale: 1.04, heightScale: 1.0 },
  titoki:         { atlas: 2, col: 0, row: 0, mode: 'tree',  tint: '#b8d4a0', widthScale: 1.02, heightScale: 1.0 },
  horoeka:        { atlas: 2, col: 0, row: 1, mode: 'tree',  tint: '#9c8b70', widthScale: 0.72, heightScale: 1.05 },
  tororaro:       { atlas: 2, col: 1, row: 1, mode: 'shrub', tint: '#a68b72', widthScale: 1.05, heightScale: 0.96 },

  // Atlas 3 — Coastal Perennials & Rock Daisies (avoid col:0, row:1)
  kopakopa:       { atlas: 3, col: 0, row: 0, mode: 'clump', tint: '#ffffff', widthScale: 1.08, heightScale: 1.04 },
  kawakawa:       { atlas: 3, col: 1, row: 0, mode: 'shrub', tint: '#84b86a', widthScale: 1.06, heightScale: 1.0 },
  pachystegia:    { atlas: 3, col: 1, row: 1, mode: 'clump', tint: '#f2ece2', widthScale: 1.08, heightScale: 0.98 },

  // Atlas 4 — Specialty NZ Flora
  rengarenga:     { atlas: 4, col: 0, row: 0, mode: 'clump', tint: '#ffffff', widthScale: 1.12, heightScale: 1.05 },
  koromiko:       { atlas: 4, col: 1, row: 0, mode: 'shrub', tint: '#ffffff', widthScale: 1.08, heightScale: 1.0 },
  kakabeak:       { atlas: 4, col: 0, row: 1, mode: 'shrub', tint: '#ffffff', widthScale: 1.06, heightScale: 1.0 },
  xeronema:       { atlas: 4, col: 0, row: 1, mode: 'clump', tint: '#ffdad2', widthScale: 0.96, heightScale: 1.0 },
  nikau:          { atlas: 4, col: 1, row: 1, mode: 'nikau', tint: '#ffffff', widthScale: 1.18, heightScale: 1.08 },
  panakenake:     { atlas: 4, col: 1, row: 0, mode: 'ground', tint: '#9cd17e', widthScale: 1.25, heightScale: 1.45 },
};

/**
 * Load all 5 edge-dilated 2x2 RGBA WebP botanical atlases into fixed 1024x1024 CanvasTextures
 * so WebGPU & WebGL2 never experience texture dimension mismatches while images stream.
 */
export function loadBotanicalAtlases(basePath = './assets') {
  const urls = [0, 1, 2, 3, 4].map((i) => `${basePath}/atlas-${i}.webp`);
  return urls.map((url) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = 8;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.clearRect(0, 0, 1024, 1024);
      ctx.drawImage(img, 0, 0, 1024, 1024);
      tex.needsUpdate = true;
    };
    img.src = url;
    return tex;
  });
}

function quadrantUVBounds(col, row) {
  const pad = 0.006;
  const uMin = col * 0.5 + pad;
  const uMax = (col + 1) * 0.5 - pad;
  const vMin = (1 - row) * 0.5 + pad;
  const vMax = (2 - row) * 0.5 - pad;
  return { uMin, uMax, vMin, vMax };
}

function buildCurvedStarGeometry(plant, spec) {
  const { uMin, uMax, vMin, vMax } = quadrantUVBounds(spec.col, spec.row);
  const baseW = (plant.matureSpread || plant.spreadM || 0.8) * (spec.widthScale || 1.0);
  const baseH = (plant.matureHeight || plant.heightM || 0.8) * (spec.heightScale || 1.0);

  const isNikau = spec.mode === 'nikau';
  const isTree = spec.mode === 'tree' || isNikau;
  const isGround = spec.mode === 'ground';
  const segX = 4;
  const segY = isNikau ? 5 : 4;

  const positions = [];
  const normals = [];
  const uvs = [];
  const tipness = [];
  const partType = [];
  const indices = [];

  const cardCount = isNikau ? 4 : 3;
  for (let c = 0; c < cardCount; c++) {
    const yaw = isNikau
      ? (c * Math.PI) / 4.0 + (c % 2 === 0 ? 0.02 : -0.02)
      : (c * Math.PI) / 3.0 + (c === 1 ? 0.04 : c === 2 ? -0.04 : 0.0);
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);

    const w = baseW * (isNikau ? (0.95 + (c % 2) * 0.07 + c * 0.015) : (0.96 + c * 0.04));
    const h = baseH * (isNikau ? (0.96 + ((c + 1) % 4) * 0.02) : (0.97 + ((c + 1) % 3) * 0.03));
    const bowDepth = w * (isNikau ? 0.16 : isTree ? 0.14 : isGround ? 0.22 : 0.18);
    const topLean = isTree ? 0.0 : (isGround ? h * 0.35 : h * 0.06);

    const baseVert = positions.length / 3;
    const centerY = h * 0.45;

    for (let iy = 0; iy <= segY; iy++) {
      const ty = iy / segY;
      for (let ix = 0; ix <= segX; ix++) {
        const tx = ix / segX;
        const sx = (tx - 0.5) * w;
        const edgeCurve = 1.0 - Math.pow((tx - 0.5) * 2.0, 2.0);
        const vertCurve = isNikau
          ? Math.max(0, Math.sin(Math.max(0, (ty - 0.28) / 0.72) * Math.PI * 0.92))
          : Math.sin(ty * Math.PI * 0.85);
        const bowSign = (c % 2 === 0) ? 1.0 : -1.0;
        const localZ = bowSign * (edgeCurve * vertCurve * bowDepth) + ty * topLean * bowSign;
        const localY = isGround ? ty * h * 0.72 + edgeCurve * h * 0.28 : ty * h;

        const wx = sx * cosY - localZ * sinY;
        const wz = sx * sinY + localZ * cosY;
        positions.push(wx, localY, wz);

        const nx = wx;
        const ny = (localY - centerY * 0.4) * 0.75 + h * 0.35;
        const nz = wz;
        const nLen = Math.hypot(nx, ny, nz) || 1.0;
        normals.push(nx / nLen, ny / nLen, nz / nLen);

        uvs.push(uMin + tx * (uMax - uMin), vMin + ty * (vMax - vMin));
        const edgeFlex = Math.abs(tx - 0.5) * 0.12 * ty;
        tipness.push(Math.min(1.0, ty + edgeFlex));
        partType.push(1.0);
      }
    }

    const stride = segX + 1;
    for (let iy = 0; iy < segY; iy++) {
      for (let ix = 0; ix < segX; ix++) {
        const a = baseVert + iy * stride + ix;
        const b = a + 1;
        const d = a + stride;
        const e = d + 1;
        indices.push(a, b, d, b, e, d);
      }
    }
  }

  // Soft canopy fullness dome for wide shrubs & groundcovers
  if (spec.mode === 'shrub' || spec.mode === 'ground' || plant.id === 'koromiko' || plant.id === 'kawakawa') {
    const baseVert = positions.length / 3;
    const crownW = baseW * 0.88;
    const crownY = isGround ? baseH * 0.45 : baseH * 0.58;
    const domeH = isGround ? baseH * 0.32 : baseH * 0.28;
    for (let iy = 0; iy <= segY; iy++) {
      const ty = iy / segY;
      for (let ix = 0; ix <= segX; ix++) {
        const tx = ix / segX;
        const lx = (tx - 0.5) * crownW;
        const lz = (ty - 0.5) * crownW;
        const r2 = Math.min(1.0, ((tx - 0.5) * 2) ** 2 + ((ty - 0.5) * 2) ** 2);
        const ly = crownY + (1.0 - r2 * 0.65) * domeH;

        positions.push(lx, ly, lz);
        const nx = lx * 0.6;
        const ny = Math.max(0.4, domeH * 2.2);
        const nz = lz * 0.6;
        const nLen = Math.hypot(nx, ny, nz) || 1.0;
        normals.push(nx / nLen, ny / nLen, nz / nLen);

        uvs.push(uMin + tx * (uMax - uMin), vMin + ty * (vMax - vMin));
        tipness.push(0.55 + (1.0 - r2 * 0.4) * 0.45);
        partType.push(1.0);
      }
    }
    const stride = segX + 1;
    for (let iy = 0; iy < segY; iy++) {
      for (let ix = 0; ix < segX; ix++) {
        const a = baseVert + iy * stride + ix;
        const b = a + 1;
        const d = a + stride;
        const e = d + 1;
        indices.push(a, d, b, b, d, e);
      }
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setAttribute('aTipness', new THREE.Float32BufferAttribute(tipness, 1));
  geom.setAttribute('aPartType', new THREE.Float32BufferAttribute(partType, 1));
  geom.setIndex(indices);
  return geom;
}

function buildPongaTreeFernGeometry(plant, spec) {
  const { uMin, uMax, vMin, vMax } = quadrantUVBounds(spec.col, spec.row);
  const totalH = plant.matureHeight || 2.9;
  const crownDiam = (plant.matureSpread || 2.4) * (spec.widthScale || 1.05);
  const trunkH = totalH * 0.78;

  const positions = [];
  const normals = [];
  const uvs = [];
  const tipness = [];
  const partType = [];
  const indices = [];

  const radSegs = 9;
  const hSegs = 6;
  for (let iy = 0; iy <= hSegs; iy++) {
    const ty = iy / hSegs;
    const y = ty * trunkH;
    const bendX = Math.sin(ty * Math.PI * 0.85) * 0.06;
    const bendZ = Math.cos(ty * Math.PI * 0.65) * 0.04;
    const rad = (0.14 * (1.0 - ty * 0.42)) + (ty < 0.2 ? (0.2 - ty) * 0.16 : 0.0);

    for (let ix = 0; ix <= radSegs; ix++) {
      const a = (ix / radSegs) * Math.PI * 2;
      const bump = 1.0 + Math.sin(a * 5.0 + ty * 14.0) * 0.07;
      const x = bendX + Math.cos(a) * rad * bump;
      const z = bendZ + Math.sin(a) * rad * bump;
      positions.push(x, y, z);
      normals.push(Math.cos(a), 0.12, Math.sin(a));
      uvs.push(ix / radSegs, ty);
      tipness.push(ty * 0.22);
      partType.push(0.0);
    }
  }
  const tStride = radSegs + 1;
  for (let iy = 0; iy < hSegs; iy++) {
    for (let ix = 0; ix < radSegs; ix++) {
      const a = iy * tStride + ix;
      const b = a + 1;
      const d = a + tStride;
      const e = d + 1;
      indices.push(a, b, d, b, e, d);
    }
  }

  const layers = [
    { yOff: trunkH - 0.08, scale: 1.04, dome: 0.42, rot: 0.0, tipBase: 0.45 },
    { yOff: trunkH + 0.14, scale: 0.84, dome: 0.34, rot: 0.52, tipBase: 0.55 },
  ];
  const seg = 6;
  const crownX = Math.sin(Math.PI * 0.85) * 0.06;
  const crownZ = Math.cos(Math.PI * 0.65) * 0.04;

  for (const lay of layers) {
    const baseVert = positions.length / 3;
    const cosR = Math.cos(lay.rot);
    const sinR = Math.sin(lay.rot);
    const size = crownDiam * lay.scale;

    for (let iy = 0; iy <= seg; iy++) {
      const ty = iy / seg;
      for (let ix = 0; ix <= seg; ix++) {
        const tx = ix / seg;
        const ux = (tx - 0.5) * 2.0;
        const uz = (ty - 0.5) * 2.0;
        const r = Math.min(1.2, Math.hypot(ux, uz));

        const lx = ux * size * 0.5;
        const lz = uz * size * 0.5;
        const wx = crownX + lx * cosR - lz * sinR;
        const wz = crownZ + lx * sinR + lz * cosR;
        const arch = Math.sin(Math.min(1.0, r) * Math.PI * 0.68) * lay.dome - (r * r) * lay.dome * 0.82;
        const wy = lay.yOff + arch;

        positions.push(wx, wy, wz);
        const nx = (wx - crownX) * 0.45;
        const ny = 1.0;
        const nz = (wz - crownZ) * 0.45;
        const nLen = Math.hypot(nx, ny, nz) || 1.0;
        normals.push(nx / nLen, ny / nLen, nz / nLen);

        uvs.push(uMin + tx * (uMax - uMin), vMin + ty * (vMax - vMin));
        tipness.push(Math.min(1.0, lay.tipBase + r * 0.52));
        partType.push(1.0);
      }
    }

    const stride = seg + 1;
    for (let iy = 0; iy < seg; iy++) {
      for (let ix = 0; ix < seg; ix++) {
        const a = baseVert + iy * stride + ix;
        const b = a + 1;
        const d = a + stride;
        const e = d + 1;
        indices.push(a, d, b, b, d, e);
      }
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setAttribute('aTipness', new THREE.Float32BufferAttribute(tipness, 1));
  geom.setAttribute('aPartType', new THREE.Float32BufferAttribute(partType, 1));
  geom.setIndex(indices);
  return geom;
}

function buildBoulderGeometry(plant) {
  const r = (plant.matureSpread || 0.76) * 0.45;
  const geo = new THREE.IcosahedronGeometry(r, 2);
  const pos = geo.attributes.position;
  const tipness = new Float32Array(pos.count);
  const partType = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const n = 1.0 + Math.sin(x * 4.5 + z * 3.8) * 0.14;
    pos.setXYZ(i, x * n * 1.15, (y + r * 0.55) * 0.62 * n, z * n * 0.95);
    tipness[i] = 0.0;
    partType[i] = 0.0; // Solid opaque rock
  }
  geo.setAttribute('aTipness', new THREE.BufferAttribute(tipness, 1));
  geo.setAttribute('aPartType', new THREE.BufferAttribute(partType, 1));
  geo.computeVertexNormals();
  return geo;
}

export function buildPhotorealPlantGeometry(plant) {
  if (plant.id === 'boulder' || plant.archetype === 'boulder') {
    return buildBoulderGeometry(plant);
  }
  const spec = SPECIES_ATLAS_MAP[plant.id] || SPECIES_ATLAS_MAP.harakeke;
  if (spec.mode === 'ponga') {
    return buildPongaTreeFernGeometry(plant, spec);
  }
  return buildCurvedStarGeometry(plant, spec);
}

/**
 * Evaluate the 5-stage growth curve of a species for any year (1..15) so Tier-1 3D GLB hero trees
 * grow in exact sync with Tier-2 TSL atlas plants!
 */
export function evaluateYearGrowthScale(plant, year = 4.0) {
  const g = plant?.growth || [0.28, 0.52, 0.76, 0.94, 1.0];
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  if (year <= 3) return lerp(g[0], g[1], clamp01((year - 1) / 2));
  if (year <= 5) return lerp(g[1], g[2], clamp01((year - 3) / 2));
  if (year <= 10) return lerp(g[2], g[3], clamp01((year - 5) / 5));
  return lerp(g[3], g[4] ?? 1.0, clamp01((year - 10) / 5));
}

/**
 * Tier-1 Hero 3D `.glb` Tree Manager:
 * Streams real 3D Blender/glTF meshes for Nīkau, Pōhutukawa, Mānuka, and Kōwhai,
 * normalizes each prototype via THREE.Box3 so `min.y === 0` and unit height = 1.0,
 * grounds every instance cleanly onto `terrainEngine.getHeight(x, z)`, and applies subtle idle breeze sway.
 */
export class HeroTreeManager {
  constructor(scene, terrainEngine, onModelReady = () => {}) {
    this.scene = scene;
    this.terrainEngine = terrainEngine;
    this.onModelReady = onModelReady;

    this.group = new THREE.Group();
    this.group.name = 'Hero3DTrees';
    this.scene.add(this.group);

    this.prototypes = new Map(); // speciesId -> normalized unit-height THREE.Group
    this.loading = new Set();
    this.failed = new Set();
    this.instances = []; // { pivot, speciesId, x, z, baseScale, rotY, phase, swayAmp }
    this._year = 4.0;
    this._loaderPromise = null;
  }

  async _getLoader() {
    if (!this._loaderPromise) {
      this._loaderPromise = (async () => {
        const loader = new GLTFLoader();
        try {
          await MeshoptDecoder.ready;
          loader.setMeshoptDecoder(MeshoptDecoder);
        } catch {
          // Meshopt unavailable — standard glTF still loads
        }
        return loader;
      })();
    }
    return this._loaderPromise;
  }

  isReady(speciesId) {
    return this.prototypes.has(speciesId);
  }

  ensureLoaded(speciesId) {
    const cfg = HERO_TREE_MODELS[speciesId];
    if (!cfg || this.prototypes.has(speciesId) || this.loading.has(speciesId) || this.failed.has(speciesId)) {
      return;
    }
    this.loading.add(speciesId);
    this._getLoader()
      .then((loader) =>
        new Promise((resolve, reject) => {
          loader.load(cfg.url, resolve, undefined, reject);
        })
      )
      .then((gltf) => {
        const raw = gltf.scene || gltf.scenes?.[0];
        if (!raw) throw new Error(`Empty GLB for ${speciesId}`);

        // Normalize prototype: center X/Z, sit min.y === 0, scale height to exactly 1.0 m
        raw.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(raw);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        const normScale = size.y > 0.01 ? 1.0 / size.y : 1.0;
        raw.scale.multiplyScalar(normScale);
        raw.position.set(-center.x * normScale, -box.min.y * normScale, -center.z * normScale);

        raw.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            for (const m of mats) {
              if (!m) continue;
              if (m.alphaTest > 0 || m.transparent) {
                m.alphaTest = Math.max(m.alphaTest || 0, 0.42);
                m.side = THREE.DoubleSide;
              }
              m.needsUpdate = true;
            }
          }
        });

        const wrapper = new THREE.Group();
        wrapper.add(raw);
        this.prototypes.set(speciesId, wrapper);
        this.loading.delete(speciesId);
        this.onModelReady(speciesId);
      })
      .catch((err) => {
        console.warn(`HeroTreeManager fallback to atlas for ${speciesId}:`, err?.message || err);
        this.loading.delete(speciesId);
        this.failed.add(speciesId);
      });
  }

  /** Preload all 4 flagship NZ 3D hero trees immediately at startup */
  preloadAll() {
    for (const spId of Object.keys(HERO_TREE_MODELS)) {
      this.ensureLoaded(spId);
    }
  }

  setYear(year) {
    this._year = year;
    for (const inst of this.instances) {
      const sp = SPECIES_BY_ID[inst.speciesId];
      const cfg = HERO_TREE_MODELS[inst.speciesId];
      if (!sp || !cfg) continue;
      const h = (sp.matureHeight || sp.heightM || 3.5) * evaluateYearGrowthScale(sp, this._year) * cfg.heightBoost * inst.baseScale;
      inst.pivot.scale.setScalar(Math.max(0.35, h));
    }
  }

  /**
   * Synchronize 3D `.glb` hero tree instances with the current `plants` array.
   * Returns a Set of plant IDs rendered as 3D hero meshes (so cutout InstancedMesh skips them).
   */
  syncFromPlants(plants, year = this._year) {
    this._year = year;
    while (this.group.children.length) {
      this.group.remove(this.group.children[0]);
    }
    this.instances = [];

    const renderedIds = new Set();
    const perSpeciesCounts = new Map();

    for (const p of plants) {
      const cfg = HERO_TREE_MODELS[p.speciesId];
      if (!cfg) continue;
      this.ensureLoaded(p.speciesId);

      const proto = this.prototypes.get(p.speciesId);
      if (!proto) continue; // Keep fast Tier-2 cutout visible while GLB streams

      const count = perSpeciesCounts.get(p.speciesId) || 0;
      if (count >= cfg.maxInstances) continue;
      perSpeciesCounts.set(p.speciesId, count + 1);

      const sp = SPECIES_BY_ID[p.speciesId];
      const h = (sp?.matureHeight || sp?.heightM || 3.5) * evaluateYearGrowthScale(sp, this._year) * cfg.heightBoost * (p.scale || 1.0);
      const gy = this.terrainEngine ? this.terrainEngine.getHeight(p.x, p.z) : 0;

      const pivot = new THREE.Group();
      pivot.position.set(p.x, gy - 0.03, p.z);
      pivot.rotation.set(0, p.rotY ?? p.rot ?? 0, 0);
      pivot.scale.setScalar(Math.max(0.35, h));
      pivot.add(proto.clone(true));
      this.group.add(pivot);

      this.instances.push({
        pivot,
        speciesId: p.speciesId,
        x: p.x,
        z: p.z,
        baseScale: p.scale || 1.0,
        rotY: p.rotY ?? p.rot ?? 0,
        phase: (p.phase ?? Math.random()) * Math.PI * 2,
        swayAmp: cfg.swayAmp,
      });
      renderedIds.add(p.id);
    }

    return renderedIds;
  }

  /** Subtle organic Aotearoa breeze sway on 3D hero tree pivots */
  updateWind(elapsedSec, windStrength = 0.85) {
    for (const inst of this.instances) {
      const w = inst.swayAmp * windStrength;
      inst.pivot.rotation.z = Math.sin(elapsedSec * 1.15 + inst.phase + inst.x * 0.25) * w;
      inst.pivot.rotation.x = Math.cos(elapsedSec * 0.88 + inst.phase * 1.3 + inst.z * 0.22) * w * 0.7;
    }
  }
}
