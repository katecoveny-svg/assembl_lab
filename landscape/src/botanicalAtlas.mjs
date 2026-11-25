import * as THREE from 'three';

// Photorealistic 2×2 WebP Botanical Atlas mapping (extracted from Aotearoa Planting Studio v3).
// 5 × 1024×1024 atlases stored in ./assets/atlas-0.webp .. ./assets/atlas-4.webp.
// Strictly zero exotic lavender quadrant (atlas 3 col 0 row 1 is intentionally unused).
export const ATLAS_SPECIES = {
  // Atlas 0: Harakeke, Ponga, Silver Spear (Astelia), Platt's Black
  harakeke:       { atlas: 0, col: 0, row: 0, mode: 'clump', tint: '#ffffff', widthScale: 1.05, heightScale: 1.00 },
  ponga:          { atlas: 0, col: 1, row: 0, mode: 'ponga', tint: '#ffffff', widthScale: 1.08, heightScale: 1.00 },
  astelia:        { atlas: 0, col: 0, row: 1, mode: 'clump', tint: '#ffffff', widthScale: 1.08, heightScale: 1.00 },
  platts_black:   { atlas: 0, col: 1, row: 1, mode: 'clump', tint: '#ffffff', widthScale: 1.08, heightScale: 1.00 },

  // Atlas 1: Toetoe, Red Tussock (Chionochloa), Orange Sedge (Carex), Libertia
  toetoe:         { atlas: 1, col: 0, row: 0, mode: 'clump', tint: '#ffffff', widthScale: 1.05, heightScale: 1.12 },
  chionochloa:    { atlas: 1, col: 1, row: 0, mode: 'clump', tint: '#ffffff', widthScale: 1.08, heightScale: 1.00 },
  carex_testacea: { atlas: 1, col: 0, row: 1, mode: 'clump', tint: '#ffffff', widthScale: 1.15, heightScale: 1.00 },
  libertia:       { atlas: 1, col: 1, row: 1, mode: 'clump', tint: '#ffffff', widthScale: 1.02, heightScale: 1.02 },
  carex_secta:    { atlas: 1, col: 0, row: 1, mode: 'clump', tint: '#84b862', widthScale: 1.18, heightScale: 1.10 },
  poa_cita:       { atlas: 1, col: 0, row: 1, mode: 'clump', tint: '#d9dfa8', widthScale: 1.08, heightScale: 1.05 },
  xeronema:       { atlas: 1, col: 1, row: 1, mode: 'clump', tint: '#d9584a', widthScale: 1.08, heightScale: 1.06 },

  // Atlas 2: Pōhutukawa, Kōwhai, Tī Kōuka, Mānuka
  pohutukawa:     { atlas: 2, col: 0, row: 0, mode: 'tree',  tint: '#ffffff', widthScale: 1.02, heightScale: 1.00 },
  kowhai:         { atlas: 2, col: 1, row: 0, mode: 'tree',  tint: '#ffffff', widthScale: 1.02, heightScale: 1.00 },
  tikouka:        { atlas: 2, col: 0, row: 1, mode: 'tree',  tint: '#ffffff', widthScale: 1.15, heightScale: 1.00 },
  manuka:         { atlas: 2, col: 1, row: 1, mode: 'shrub', tint: '#ffffff', widthScale: 1.04, heightScale: 1.00 },
  titoki:         { atlas: 2, col: 0, row: 0, mode: 'tree',  tint: '#8dc27a', widthScale: 0.98, heightScale: 0.98 },
  horoeka:        { atlas: 2, col: 0, row: 1, mode: 'tree',  tint: '#857758', widthScale: 0.72, heightScale: 1.08 },
  tororaro:       { atlas: 2, col: 1, row: 1, mode: 'shrub', tint: '#a68b72', widthScale: 1.05, heightScale: 0.96 },

  // Atlas 3: Kopakopa (coastal blue umbel), Kawakawa (broad-leaf shrub), Pachystegia (white rock daisy)
  kopakopa:       { atlas: 3, col: 0, row: 0, mode: 'clump', tint: '#d4e8ff', widthScale: 1.08, heightScale: 1.06 },
  kawakawa:       { atlas: 3, col: 1, row: 0, mode: 'shrub', tint: '#76b562', widthScale: 1.06, heightScale: 1.00 },
  pachystegia:    { atlas: 3, col: 1, row: 1, mode: 'clump', tint: '#f7f4e8', widthScale: 1.08, heightScale: 1.02 },

  // Atlas 4: Rengarenga, Koromiko, Kākābeak, Nīkau, Pānakenake
  rengarenga:     { atlas: 4, col: 0, row: 0, mode: 'clump', tint: '#ffffff', widthScale: 1.12, heightScale: 1.05 },
  koromiko:       { atlas: 4, col: 1, row: 0, mode: 'shrub', tint: '#ffffff', widthScale: 1.08, heightScale: 1.00 },
  kakabeak:       { atlas: 4, col: 0, row: 1, mode: 'shrub', tint: '#ffffff', widthScale: 1.06, heightScale: 1.00 },
  nikau:          { atlas: 4, col: 1, row: 1, mode: 'tree',  tint: '#ffffff', widthScale: 1.05, heightScale: 1.00 },
  panakenake:     { atlas: 4, col: 1, row: 0, mode: 'ground', tint: '#9cd17e', widthScale: 1.25, heightScale: 1.45 },
};

/**
 * Load all 5 1024×1024 WebP botanical atlases into WebGPU-ready CanvasTextures.
 * Each texture is immediately valid (1024×1024 canvas) and updates seamlessly on image load.
 */
export function loadBotanicalAtlases(basePath = './assets') {
  return [0, 1, 2, 3, 4].map((idx) => {
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
    img.src = `${basePath}/atlas-${idx}.webp`;
    return tex;
  });
}

/** v3 UV quadrant slicer with 0.5% bleed margin */
export function BA(col, row) {
  const uMin = col * 0.5 + 0.005;
  const uMax = (col + 1) * 0.5 - 0.005;
  const vMin = (1 - row) * 0.5 + 0.005;
  const vMax = (2 - row) * 0.5 - 0.005;
  return { uMin, uMax, vMin, vMax };
}

/** v3 curved 3-plane + optional dome-cap botanical geometry (`mL`) */
export function buildCurvedAtlasGeometry(plant, spec) {
  const { uMin, uMax, vMin, vMax } = BA(spec.col, spec.row);
  const spread = (plant.matureSpread || plant.spreadM || 1.0) * (spec.widthScale || 1.0);
  const height = (plant.matureHeight || plant.heightM || 1.0) * (spec.heightScale || 1.0);
  const isTree = spec.mode === 'tree';
  const isGround = spec.mode === 'ground';
  const segX = 4;
  const segY = 4;

  const positions = [];
  const normals = [];
  const uvs = [];
  const tipness = [];
  const partType = [];
  const indices = [];

  const planes = 3;
  for (let p = 0; p < planes; p++) {
    const yaw = (p * Math.PI) / 3 + (p === 1 ? 0.04 : p === 2 ? -0.04 : 0);
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const pw = spread * (0.96 + p * 0.04);
    const ph = height * (0.97 + ((p + 1) % 3) * 0.03);
    const curveAmp = pw * (isTree ? 0.14 : isGround ? 0.22 : 0.18);
    const leanAmp = isTree ? 0 : isGround ? ph * 0.35 : ph * 0.06;
    const baseIdx = positions.length / 3;
    const midY = ph * 0.45;

    for (let iy = 0; iy <= segY; iy++) {
      const v = iy / segY;
      for (let ix = 0; ix <= segX; ix++) {
        const u = ix / segX;
        const lx = (u - 0.5) * pw;
        const arch = 1 - Math.pow((u - 0.5) * 2, 2);
        const hCurve = Math.sin(v * Math.PI * 0.85);
        const sign = p % 2 === 0 ? 1 : -1;
        const lz = sign * (arch * hCurve * curveAmp) + v * leanAmp * sign;
        const ly = isGround ? v * ph * 0.72 + arch * ph * 0.28 : v * ph;

        const wx = lx * cosY - lz * sinY;
        const wz = lx * sinY + lz * cosY;
        positions.push(wx, ly, wz);

        // Volumetric spherical outward crown normals (eliminates flat crossed-card seams)
        const nx = wx;
        const ny = (ly - midY * 0.4) * 0.75 + ph * 0.35;
        const nz = wz;
        const nLen = Math.hypot(nx, ny, nz) || 1;
        normals.push(nx / nLen, ny / nLen, nz / nLen);

        uvs.push(uMin + u * (uMax - uMin), vMin + v * (vMax - vMin));
        const edgeTip = Math.abs(u - 0.5) * 0.12 * v;
        tipness.push(Math.min(1, v + edgeTip));
        partType.push(1.0);
      }
    }

    const rowStride = segX + 1;
    for (let iy = 0; iy < segY; iy++) {
      for (let ix = 0; ix < segX; ix++) {
        const a = baseIdx + iy * rowStride + ix;
        const b = a + 1;
        const c = a + rowStride;
        const d = c + 1;
        indices.push(a, b, c, b, d, c);
      }
    }
  }

  // Curved horizontal dome cap for shrubs & groundcovers so 2D Plan & high-angle views look solid and lush
  if (spec.mode === 'shrub' || spec.mode === 'ground' || plant.id === 'kawakawa' || plant.id === 'koromiko') {
    const baseIdx = positions.length / 3;
    const capW = spread * 0.88;
    const capBaseY = isGround ? height * 0.45 : height * 0.58;
    const capLift = isGround ? height * 0.32 : height * 0.28;
    for (let iy = 0; iy <= segY; iy++) {
      const v = iy / segY;
      for (let ix = 0; ix <= segX; ix++) {
        const u = ix / segX;
        const lx = (u - 0.5) * capW;
        const lz = (v - 0.5) * capW;
        const r2 = Math.min(1, Math.pow((u - 0.5) * 2, 2) + Math.pow((v - 0.5) * 2, 2));
        const ly = capBaseY + (1 - r2 * 0.65) * capLift;
        positions.push(lx, ly, lz);

        const nx = lx * 0.6;
        const ny = Math.max(0.4, capLift * 2.2);
        const nz = lz * 0.6;
        const nLen = Math.hypot(nx, ny, nz) || 1;
        normals.push(nx / nLen, ny / nLen, nz / nLen);

        uvs.push(uMin + u * (uMax - uMin), vMin + v * (vMax - vMin));
        tipness.push(0.55 + (1 - r2 * 0.4) * 0.45);
        partType.push(1.0);
      }
    }
    const rowStride = segX + 1;
    for (let iy = 0; iy < segY; iy++) {
      for (let ix = 0; ix < segX; ix++) {
        const a = baseIdx + iy * rowStride + ix;
        const b = a + 1;
        const c = a + rowStride;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
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
  geom.computeBoundingSphere();
  return geom;
}

/** v3 sculpted fibrous Ponga trunk + double domed frond canopy (`gL`) */
export function buildPongaAtlasGeometry(plant, spec) {
  const { uMin, uMax, vMin, vMax } = BA(spec.col, spec.row);
  const height = plant.matureHeight || plant.heightM || 2.9;
  const spread = (plant.matureSpread || plant.spreadM || 2.4) * (spec.widthScale || 1.05);
  const trunkH = height * 0.76;

  const positions = [];
  const normals = [];
  const uvs = [];
  const tipness = [];
  const partType = [];
  const indices = [];

  const radSegs = 9;
  const hSegs = 6;
  const baseIdx = 0;
  for (let iy = 0; iy <= hSegs; iy++) {
    const t = iy / hSegs;
    const cy = t * trunkH;
    const cx = Math.sin(t * Math.PI * 0.85) * 0.06;
    const cz = Math.cos(t * Math.PI * 0.65) * 0.04;
    const rad = 0.14 * (1 - t * 0.42) + (t < 0.2 ? (0.2 - t) * 0.16 : 0);
    for (let ix = 0; ix <= radSegs; ix++) {
      const ang = (ix / radSegs) * Math.PI * 2;
      const flute = 1 + Math.sin(ang * 5 + t * 14) * 0.07;
      positions.push(cx + Math.cos(ang) * rad * flute, cy, cz + Math.sin(ang) * rad * flute);
      normals.push(Math.cos(ang), 0.12, Math.sin(ang));
      uvs.push(ix / radSegs, t);
      tipness.push(t * 0.22);
      partType.push(0.0); // Trunk bark in TSL shader!
    }
  }
  const stride = radSegs + 1;
  for (let iy = 0; iy < hSegs; iy++) {
    for (let ix = 0; ix < radSegs; ix++) {
      const a = baseIdx + iy * stride + ix;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }

  const crowns = [
    { yOff: trunkH - 0.08, scale: 1.04, dome: 0.42, rot: 0, tipBase: 0.45 },
    { yOff: trunkH + 0.14, scale: 0.84, dome: 0.34, rot: 0.52, tipBase: 0.55 },
  ];
  const grid = 6;
  const topX = Math.sin(Math.PI * 0.85) * 0.06;
  const topZ = Math.cos(Math.PI * 0.65) * 0.04;

  for (const cr of crowns) {
    const startIdx = positions.length / 3;
    const cosR = Math.cos(cr.rot);
    const sinR = Math.sin(cr.rot);
    const crownW = spread * cr.scale;

    for (let iy = 0; iy <= grid; iy++) {
      const v = iy / grid;
      for (let ix = 0; ix <= grid; ix++) {
        const u = ix / grid;
        const du = (u - 0.5) * 2;
        const dv = (v - 0.5) * 2;
        const dist = Math.min(1.2, Math.hypot(du, dv));
        const px = du * crownW * 0.5;
        const pz = dv * crownW * 0.5;
        const wx = topX + px * cosR - pz * sinR;
        const wz = topZ + px * sinR + pz * cosR;
        const wy = cr.yOff + Math.sin(Math.min(1, dist) * Math.PI * 0.68) * cr.dome - dist * dist * cr.dome * 0.82;
        positions.push(wx, wy, wz);

        const nx = (wx - topX) * 0.45;
        const ny = 1.0;
        const nz = (wz - topZ) * 0.45;
        const nLen = Math.hypot(nx, ny, nz) || 1;
        normals.push(nx / nLen, ny / nLen, nz / nLen);

        uvs.push(uMin + u * (uMax - uMin), vMin + v * (vMax - vMin));
        tipness.push(Math.min(1, cr.tipBase + dist * 0.52));
        partType.push(1.0);
      }
    }
    const cStride = grid + 1;
    for (let iy = 0; iy < grid; iy++) {
      for (let ix = 0; ix < grid; ix++) {
        const a = startIdx + iy * cStride + ix;
        const b = a + 1;
        const c = a + cStride;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
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
  geom.computeBoundingSphere();
  return geom;
}

/** Faceted 3D NZ Volcanic Basalt / Mossy Kōhatu Feature Stone */
export function buildBoulderGeometry() {
  const rock = new THREE.DodecahedronGeometry(0.42, 1);
  const rp = rock.attributes.position;
  const tipness = new Float32Array(rp.count);
  const partType = new Float32Array(rp.count);
  const colors = new Float32Array(rp.count * 3);
  const baseCol = new THREE.Color('#575A55');
  const mossCol = new THREE.Color('#6D7C52');
  const c = new THREE.Color();

  for (let i = 0; i < rp.count; i++) {
    const vx = rp.getX(i), vy = rp.getY(i), vz = rp.getZ(i);
    const n = 1 + 0.16 * Math.sin(vx * 7.2 + vz * 5.1) * Math.cos(vy * 6.4);
    const fx = vx * n * 1.24;
    const fy = Math.max(-0.04, vy * n * 0.64 + 0.18);
    const fz = vz * n * 1.06;
    rp.setXYZ(i, fx, fy, fz);
    const moss = fy > 0.26 ? Math.min(0.48, (fy - 0.22) * 1.7) : 0;
    c.copy(baseCol).lerp(mossCol, moss);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
    tipness[i] = 0.0;
    partType[i] = 0.0;
  }
  rock.computeVertexNormals();
  rock.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  rock.setAttribute('aTipness', new THREE.BufferAttribute(tipness, 1));
  rock.setAttribute('aPartType', new THREE.BufferAttribute(partType, 1));
  rock.computeBoundingSphere();
  return rock;
}

export function buildAtlasPlantGeometry(plant) {
  if (plant.tier === 'stone' || plant.archetype === 'boulder') {
    return buildBoulderGeometry();
  }
  const spec = ATLAS_SPECIES[plant.id] || ATLAS_SPECIES.harakeke;
  if (spec.mode === 'ponga') return buildPongaAtlasGeometry(plant, spec);
  return buildCurvedAtlasGeometry(plant, spec);
}
