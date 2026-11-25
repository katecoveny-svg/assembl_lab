import * as THREE from 'three';

export const NZ_GARDEN_PROPS = [
  {
    id: 'boulders',
    name: 'Otago Schist / Basalt Boulders',
    subtitle: 'Sculpted mossy volcanic boulder cluster',
    category: 'Stone',
    priceNZD: 280,
    swatch: '#575c55'
  },
  {
    id: 'water_bowl',
    name: 'Corten Steel Tūī Water Bowl',
    subtitle: 'Weathered Corten dish with mirror water',
    category: 'Water',
    priceNZD: 540,
    swatch: '#9a4a24'
  },
  {
    id: 'bollard_light',
    name: 'Warm Garden Bollard Light',
    subtitle: 'Architectural aluminium · Dusk PointLight',
    category: 'Lighting',
    priceNZD: 195,
    swatch: '#f5b041'
  },
  {
    id: 'raised_planter',
    name: 'Macrocarpa Veggie & Herb Planter',
    subtitle: 'Timber sleeper box · Daltons Mix & herbs',
    category: 'Timber',
    priceNZD: 420,
    swatch: '#8a6640'
  },
  {
    id: 'cedar_screen',
    name: 'Cedar Slatted Arch Screen',
    subtitle: 'Western Red Cedar battens on black steel',
    category: 'Screen',
    priceNZD: 690,
    swatch: '#a66238'
  },
  {
    id: 'stepping_rounds',
    name: 'Macrocarpa Stepping Rounds',
    subtitle: 'Organic chamfered timber discs (3-pack)',
    category: 'Path',
    priceNZD: 145,
    swatch: '#7c5c3e'
  }
];

export const PROP_MAP = Object.fromEntries(NZ_GARDEN_PROPS.map(p => [p.id, p]));

function seededRand(seed) {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createSculptedBoulder(radius, seed) {
  const rand = seededRand(seed);
  const geo = new THREE.IcosahedronGeometry(radius, 2);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const baseCol = new THREE.Color('#474a4d'); // Auckland basalt / Otago schist grey
  const warmCol = new THREE.Color('#68655c');
  const mossCol = new THREE.Color('#4a6136');
  const c = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const n1 = Math.sin(x * 3.7 + seed) * Math.cos(z * 3.2 - seed * 0.5) * 0.16;
    const n2 = Math.sin((x + y) * 6.5 + seed) * 0.07;
    const scale = 1.0 + n1 + n2;
    const nx = x * scale * (1.05 + (rand() - 0.5) * 0.04);
    const ny = y * scale * 0.68; // Naturally flattened settled stone
    const nz = z * scale * 0.94;
    pos.setXYZ(i, nx, ny, nz);

    const upFactor = Math.max(0, ny / (radius * 0.68));
    c.copy(baseCol).lerp(warmCol, Math.abs(n1) * 2.2);
    if (upFactor > 0.42) {
      c.lerp(mossCol, (upFactor - 0.42) * 0.95);
    }
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return geo;
}

function buildPropMesh(typeId, seed = 1) {
  const group = new THREE.Group();
  const bollardParts = [];

  if (typeId === 'boulders') {
    const rockMat = new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.88, metalness: 0.04, flatShading: true
    });
    const specs = [
      { r: 0.52, x: 0.0, y: 0.22, z: 0.0, ry: 0.4 },
      { r: 0.36, x: 0.52, y: 0.14, z: 0.24, ry: 1.8 },
      { r: 0.28, x: -0.38, y: 0.10, z: 0.34, ry: 3.1 },
      { r: 0.20, x: 0.18, y: 0.07, z: -0.40, ry: 5.0 }
    ];
    specs.forEach((s, idx) => {
      const m = new THREE.Mesh(createSculptedBoulder(s.r, seed * 17 + idx * 13), rockMat);
      m.position.set(s.x, s.y, s.z);
      m.rotation.y = s.ry;
      m.castShadow = true;
      m.receiveShadow = true;
      group.add(m);
    });
  } else if (typeId === 'water_bowl') {
    const cortenMat = new THREE.MeshStandardMaterial({
      color: 0x8f4320, roughness: 0.78, metalness: 0.32, side: THREE.DoubleSide
    });
    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0x26292c, roughness: 0.72, metalness: 0.45
    });
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x1b343e, roughness: 0.06, metalness: 0.82
    });

    // Dark recessed steel plinth
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.18, 24), plinthMat);
    plinth.position.y = 0.07;
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    group.add(plinth);

    // Lathe Corten dish profile
    const pts = [
      new THREE.Vector2(0.0, 0.14),
      new THREE.Vector2(0.34, 0.15),
      new THREE.Vector2(0.58, 0.28),
      new THREE.Vector2(0.68, 0.42),
      new THREE.Vector2(0.64, 0.44),
      new THREE.Vector2(0.54, 0.31),
      new THREE.Vector2(0.30, 0.20),
      new THREE.Vector2(0.0, 0.19)
    ];
    const bowl = new THREE.Mesh(new THREE.LatheGeometry(pts, 32), cortenMat);
    bowl.castShadow = true;
    bowl.receiveShadow = true;
    group.add(bowl);

    // Reflective water mirror surface
    const water = new THREE.Mesh(new THREE.CircleGeometry(0.61, 32), waterMat);
    water.rotation.x = -Math.PI * 0.5;
    water.position.y = 0.395;
    water.receiveShadow = true;
    group.add(water);
  } else if (typeId === 'bollard_light') {
    const postMat = new THREE.MeshStandardMaterial({
      color: 0x22262a, roughness: 0.42, metalness: 0.65
    });
    const lensMat = new THREE.MeshStandardMaterial({
      color: 0xffe4b5,
      emissive: new THREE.Color(0xffa940),
      emissiveIntensity: 0.9,
      roughness: 0.22,
      metalness: 0.05
    });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.05, 16), postMat);
    base.position.y = 0.025;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.062, 0.56, 16), postMat);
    shaft.position.y = 0.30;
    shaft.castShadow = true;
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.13, 16), lensMat);
    lens.position.y = 0.64;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.062, 0.05, 16), postMat);
    cap.position.y = 0.73;
    cap.castShadow = true;

    const ptLight = new THREE.PointLight(0xffb454, 0.6, 6.2, 1.8);
    ptLight.position.set(0, 0.68, 0);

    group.add(base, shaft, lens, cap, ptLight);
    bollardParts.push({ lensMat, ptLight });
  } else if (typeId === 'raised_planter') {
    const timberMat = new THREE.MeshStandardMaterial({ color: 0x85623d, roughness: 0.86, metalness: 0.02 });
    const soilMat = new THREE.MeshStandardMaterial({ color: 0x241d18, roughness: 0.96 });
    const herbDark = new THREE.MeshStandardMaterial({ color: 0x2f6327, roughness: 0.62 });
    const herbBright = new THREE.MeshStandardMaterial({ color: 0x55963c, roughness: 0.58 });

    // Layered Macrocarpa sleeper walls (1.8m x 0.95m x 0.52m)
    const W = 1.8, D = 0.95, H = 0.52, T = 0.10;
    const wallF = new THREE.Mesh(new THREE.BoxGeometry(W, H, T), timberMat);
    wallF.position.set(0, H * 0.5 - 0.04, D * 0.5 - T * 0.5);
    const wallB = new THREE.Mesh(new THREE.BoxGeometry(W, H, T), timberMat);
    wallB.position.set(0, H * 0.5 - 0.04, -D * 0.5 + T * 0.5);
    const wallL = new THREE.Mesh(new THREE.BoxGeometry(T, H, D - T * 2), timberMat);
    wallL.position.set(-W * 0.5 + T * 0.5, H * 0.5 - 0.04, 0);
    const wallR = new THREE.Mesh(new THREE.BoxGeometry(T, H, D - T * 2), timberMat);
    wallR.position.set(W * 0.5 - T * 0.5, H * 0.5 - 0.04, 0);
    for (const w of [wallF, wallB, wallL, wallR]) {
      w.castShadow = true;
      w.receiveShadow = true;
      group.add(w);
    }

    // Dark Daltons Garden Mix soil bed
    const soil = new THREE.Mesh(new THREE.BoxGeometry(W - T * 1.9, 0.38, D - T * 1.9), soilMat);
    soil.position.y = 0.22;
    soil.receiveShadow = true;
    group.add(soil);

    // Lush culinary herbs (rosemary, basil, parsley tufts)
    const rand = seededRand(seed * 31 + 7);
    for (let i = 0; i < 16; i++) {
      const hx = (rand() - 0.5) * (W - 0.36);
      const hz = (rand() - 0.5) * (D - 0.32);
      const r = 0.10 + rand() * 0.09;
      const tuft = new THREE.Mesh(
        new THREE.DodecahedronGeometry(r, 1),
        i % 2 === 0 ? herbBright : herbDark
      );
      tuft.scale.set(1.1, 0.85 + rand() * 0.5, 1.1);
      tuft.position.set(hx, 0.43 + r * 0.55, hz);
      tuft.castShadow = true;
      group.add(tuft);
    }
  } else if (typeId === 'cedar_screen') {
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x1e2226, roughness: 0.45, metalness: 0.7 });
    const cedarMat = new THREE.MeshStandardMaterial({ color: 0x9c5a32, roughness: 0.72, metalness: 0.04 });

    const W = 2.1, H = 1.9;
    // Black steel perimeter posts & rails
    const postGeo = new THREE.BoxGeometry(0.06, H + 0.12, 0.06);
    const pL = new THREE.Mesh(postGeo, steelMat);
    pL.position.set(-W * 0.5, H * 0.5 - 0.06, 0);
    const pR = new THREE.Mesh(postGeo, steelMat);
    pR.position.set(W * 0.5, H * 0.5 - 0.06, 0);
    const railTop = new THREE.Mesh(new THREE.BoxGeometry(W + 0.06, 0.05, 0.06), steelMat);
    railTop.position.set(0, H, 0);
    const railBot = new THREE.Mesh(new THREE.BoxGeometry(W + 0.06, 0.05, 0.06), steelMat);
    railBot.position.set(0, 0.08, 0);
    for (const m of [pL, pR, railTop, railBot]) {
      m.castShadow = true;
      m.receiveShadow = true;
      group.add(m);
    }

    // 18 vertical Western Red Cedar battens
    const battenCount = 18;
    const battenGeo = new THREE.BoxGeometry(0.055, H - 0.14, 0.028);
    for (let i = 0; i < battenCount; i++) {
      const t = (i + 0.5) / battenCount;
      const bx = -W * 0.46 + t * W * 0.92;
      const b = new THREE.Mesh(battenGeo, cedarMat);
      b.position.set(bx, H * 0.5 + 0.04, 0);
      b.castShadow = true;
      b.receiveShadow = true;
      group.add(b);
    }
  } else if (typeId === 'stepping_rounds') {
    const barkMat = new THREE.MeshStandardMaterial({ color: 0x5c432c, roughness: 0.92 });
    const topMat = new THREE.MeshStandardMaterial({ color: 0x9c7b56, roughness: 0.82 });
    const discs = [
      { x: 0.0, z: 0.0, r: 0.28 },
      { x: 0.56, z: 0.34, r: 0.25 },
      { x: -0.48, z: 0.44, r: 0.23 }
    ];
    for (const d of discs) {
      const m = new THREE.Mesh(
        new THREE.CylinderGeometry(d.r, d.r * 1.04, 0.08, 16),
        [barkMat, topMat, barkMat]
      );
      m.position.set(d.x, 0.025, d.z);
      m.castShadow = true;
      m.receiveShadow = true;
      group.add(m);
    }
  }

  return { group, bollardParts };
}

export class GardenPropsEngine {
  constructor(scene, terrainEngine) {
    this.scene = scene;
    this.terrainEngine = terrainEngine;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.props = []; // { id, typeId, x, z, rotY, seed }
    this.nextPropId = 1;
    this._meshes = new Map();
    this._bollards = [];
    this._duskFactor = 0.0;
  }

  addProp(typeId, x, z, rotY = null, seed = null) {
    if (!PROP_MAP[typeId]) return null;
    const item = {
      id: this.nextPropId++,
      typeId,
      x,
      z,
      rotY: rotY !== null ? rotY : Math.random() * Math.PI * 2,
      seed: seed !== null ? seed : this.nextPropId * 13
    };
    this.props.push(item);
    this._mountProp(item);
    return item;
  }

  _mountProp(item) {
    const { group, bollardParts } = buildPropMesh(item.typeId, item.seed);
    const ty = this.terrainEngine.getHeight(item.x, item.z);
    group.position.set(item.x, ty - 0.02, item.z);
    group.rotation.y = item.rotY;
    this.group.add(group);
    this._meshes.set(item.id, group);
    for (const bp of bollardParts) {
      this._bollards.push(bp);
    }
    this.updateDuskLighting(this._duskFactor);
  }

  erasePropsInRadius(wx, wz, radius) {
    const r2 = radius * radius;
    const before = this.props.length;
    this.props = this.props.filter(p => {
      const dx = p.x - wx, dz = p.z - wz;
      return dx * dx + dz * dz > r2;
    });
    if (this.props.length !== before) {
      this.rebuildAll();
      return before - this.props.length;
    }
    return 0;
  }

  regroundAll() {
    for (const item of this.props) {
      const mesh = this._meshes.get(item.id);
      if (mesh) {
        mesh.position.y = this.terrainEngine.getHeight(item.x, item.z) - 0.02;
      }
    }
  }

  rebuildAll() {
    while (this.group.children.length) {
      const c = this.group.children.pop();
      c.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach(m => m.dispose());
          else o.material.dispose();
        }
      });
    }
    this._meshes.clear();
    this._bollards = [];
    for (const item of this.props) {
      this._mountProp(item);
    }
  }

  // Smoothly ramp up warm bollard PointLights & emissive lenses as sun lowers toward evening/dusk
  updateDuskLighting(duskFactor) {
    this._duskFactor = Math.max(0, Math.min(1, duskFactor));
    const intensity = 0.25 + this._duskFactor * 4.8;
    const emissive = 0.45 + this._duskFactor * 2.6;
    for (const b of this._bollards) {
      b.ptLight.intensity = intensity;
      b.lensMat.emissiveIntensity = emissive;
    }
  }

  getSnapshot() {
    return this.props.map(p => ({ ...p }));
  }

  restoreSnapshot(list) {
    this.props = (list || []).map(p => ({ ...p }));
    this.rebuildAll();
  }

  clearAll() {
    this.props = [];
    this.rebuildAll();
  }

  getStats() {
    let propCost = 0;
    const counts = new Map();
    for (const p of this.props) {
      const spec = PROP_MAP[p.typeId];
      if (!spec) continue;
      propCost += spec.priceNZD;
      counts.set(p.typeId, (counts.get(p.typeId) || 0) + 1);
    }
    return { count: this.props.length, propCost, counts };
  }
}
