import * as THREE from 'three';
import { MeshPhysicalNodeMaterial, MeshStandardNodeMaterial } from 'three/webgpu';
import {
  Fn, uniform, time, vec2, vec3, float, sin, cos, mix,
  clamp, smoothstep, pow, dot, normalize, mx_noise_float,
  positionWorld, cameraPosition, uv
} from 'three/tsl';

// Verified 2026 NZ Pool Presets (Compass/Narellan Fibreglass & Frontier/Mayfair Concrete)
export const NZ_POOL_PRESETS = [
  {
    id: 'none',
    name: 'No Pool',
    length: 0, width: 0, depthShallow: 0, depthDeep: 0,
    type: 'none', baseCostNZD: 0, infinity: false
  },
  {
    id: 'plunge',
    name: 'NZ Plunge Pool (4.5 × 2.5m)',
    length: 4.5, width: 2.5, depthShallow: 1.2, depthDeep: 1.5,
    type: 'fibreglass', baseCostNZD: 68000, infinity: false
  },
  {
    id: 'family_fibreglass',
    name: 'Compass / Narellan Family (7.5 × 3.7m)',
    length: 7.5, width: 3.7, depthShallow: 1.15, depthDeep: 1.75,
    type: 'fibreglass', baseCostNZD: 94000, infinity: false
  },
  {
    id: 'concrete_arch',
    name: 'Architectural Concrete (8.5 × 4.0m)',
    length: 8.5, width: 4.0, depthShallow: 1.2, depthDeep: 1.85,
    type: 'concrete', baseCostNZD: 138000, infinity: false
  },
  {
    id: 'waiheke_infinity',
    name: 'Waiheke Infinity Edge (10.0 × 4.0m)',
    length: 10.0, width: 4.0, depthShallow: 1.2, depthDeep: 1.9,
    type: 'infinity', baseCostNZD: 192000, infinity: true
  }
];

export const POOL_FINISHES = {
  aqua_quartzon: {
    name: 'Aqua Quartzon Plaster',
    shellColor: '#b4ecf4',
    waterShallow: '#38e2f2',
    waterDeep: '#0984b0',
    upgradeCost: 6500
  },
  basalt_mirror: {
    name: 'Dark Basalt Charcoal Mirror',
    shellColor: '#2c343a',
    waterShallow: '#255c69',
    waterDeep: '#0d2934',
    upgradeCost: 8500
  },
  pacific_mosaic: {
    name: 'Pacific Glass Mosaic Tile',
    shellColor: '#48b2d0',
    waterShallow: '#48d6ee',
    waterDeep: '#0a5e94',
    upgradeCost: 22000
  }
};

export const FENCE_TYPES = {
  frameless_glass: { name: '12mm Frameless Glass + Spigots', ratePerM: 460, gateCost: 1850 },
  aluminium_slat:  { name: 'Black Aluminium Pool Fence',     ratePerM: 255, gateCost: 620 }
};

export class PoolEngine {
  constructor(scene, terrainEngine, sharedUniforms) {
    this.scene = scene;
    this.terrainEngine = terrainEngine;
    this.sharedUniforms = sharedUniforms;

    this.group = new THREE.Group();
    this.nczGroup = new THREE.Group();
    this.clashGroup = new THREE.Group();
    this.scene.add(this.group);
    this.scene.add(this.nczGroup);
    this.scene.add(this.clashGroup);

    this.config = {
      presetId: 'plunge',
      x: 5.8,
      z: -7.8,
      rotY: 0,
      finishId: 'aqua_quartzon',
      fenceType: 'frameless_glass',
      heatPump: true,
      showF9Zone: true
    };

    this.ledLights = [];
    this.clashCount = 0;
    this.uPoolLedIntensity = uniform(0.0);
  }

  _clearGroup(g) {
    while (g.children.length) {
      const c = g.children.pop();
      if (c.isLight) continue;
      if (c.geometry) c.geometry.dispose();
      if (c.material) {
        if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
        else c.material.dispose();
      }
    }
  }

  setVisible(vis) {
    this.group.visible = vis;
    this.nczGroup.visible = vis && this.config.showF9Zone;
    this.clashGroup.visible = vis;
  }

  updateConfig(patch) {
    Object.assign(this.config, patch);
    this.rebuild();
  }

  updateDuskLighting(hour) {
    const dusk = Math.max(0, Math.min(1, (hour - 17.5) / 2.0));
    this.uPoolLedIntensity.value = dusk;
    for (const l of this.ledLights) {
      l.intensity = dusk * 4.5;
    }
  }

  rebuild() {
    this._clearGroup(this.group);
    this._clearGroup(this.nczGroup);
    this._clearGroup(this.clashGroup);
    this.ledLights = [];

    const preset = NZ_POOL_PRESETS.find(p => p.id === this.config.presetId);
    if (!preset || preset.id === 'none') return;

    const finish = POOL_FINISHES[this.config.finishId] || POOL_FINISHES.aqua_quartzon;
    const L = preset.length;
    const W = preset.width;
    const cx = this.config.x;
    const cz = this.config.z;

    // Sample terrain elevation across pool corners so pool deck sits cleanly at upper contour
    const corners = [
      [cx - L * 0.5, cz - W * 0.5], [cx + L * 0.5, cz - W * 0.5],
      [cx - L * 0.5, cz + W * 0.5], [cx + L * 0.5, cz + W * 0.5]
    ];
    let maxH = -1e9, minH = 1e9;
    for (const [px, pz] of corners) {
      const h = this.terrainEngine ? this.terrainEngine.getHeight(px, pz) : 0;
      if (h > maxH) maxH = h;
      if (h < minH) minH = h;
    }
    const deckY = maxH + 0.14;
    const dropWallH = Math.max(1.8, (deckY - minH) + 1.4);

    const root = new THREE.Group();
    root.position.set(cx, deckY, cz);
    root.rotation.y = this.config.rotY;
    this.group.add(root);

    // 1. Structural Concrete Retaining Shell & Apron Surround (never floats on sloped hills!)
    const concreteMat = new THREE.MeshStandardMaterial({ color: '#787671', roughness: 0.84, metalness: 0.03 });
    const apronW = W + 2.4;
    const apronL = L + 2.4;
    const shell = new THREE.Mesh(new THREE.BoxGeometry(apronL, dropWallH, apronW), concreteMat);
    shell.position.set(0, -dropWallH * 0.5 - 0.06, 0);
    shell.castShadow = true;
    shell.receiveShadow = true;
    root.add(shell);

    // 2. Clean Mitered Honed Stone Coping Rim around Pool Perimeter
    const copingMat = new THREE.MeshStandardMaterial({ color: '#d4cfc7', roughness: 0.62, metalness: 0.04 });
    const copingLipMat = new THREE.MeshStandardMaterial({ color: '#e3ded6', roughness: 0.54, metalness: 0.03 });
    const rim = 1.2;
    const copingPieces = [
      [apronL, 0.08, rim, 0, 0.0, -(W * 0.5 + rim * 0.5)],
      [apronL, 0.08, rim, 0, 0.0, (W * 0.5 + rim * 0.5)],
      [rim, 0.08, W, -(L * 0.5 + rim * 0.5), 0.0, 0],
      [rim, 0.08, W, (L * 0.5 + rim * 0.5), 0.0, 0]
    ];
    for (const [bw, bh, bd, bx, by, bz] of copingPieces) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), copingMat);
      m.position.set(bx, by, bz);
      m.receiveShadow = true;
      m.castShadow = true;
      root.add(m);
    }
    // Crisp mitered inner bullnose stone lip framing the water edge
    const lipW = 0.24;
    const lipPieces = [
      [L + lipW * 2, 0.095, lipW, 0, 0.015, -(W * 0.5 + lipW * 0.45)],
      [L + lipW * 2, 0.095, lipW, 0, 0.015, (W * 0.5 + lipW * 0.45)],
      [lipW, 0.095, W, -(L * 0.5 + lipW * 0.45), 0.015, 0],
      [lipW, 0.095, W, (L * 0.5 + lipW * 0.45), 0.015, 0]
    ];
    for (const [bw, bh, bd, bx, by, bz] of lipPieces) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), copingLipMat);
      m.position.set(bx, by, bz);
      m.receiveShadow = true;
      root.add(m);
    }

    // 3. Submerged Interior Floor with Sparkling Animated TSL Underwater Caustics
    const uShellCol = uniform(new THREE.Color(finish.shellColor));
    const uShallow = uniform(new THREE.Color(finish.waterShallow));
    const uDeep = uniform(new THREE.Color(finish.waterDeep));

    const floorMat = new MeshStandardNodeMaterial({ roughness: 0.36, metalness: 0.04 });
    floorMat.colorNode = Fn(() => {
      const st = uv();
      const depthMix = smoothstep(float(0.0), float(1.0), st.x);
      const basePool = mix(uShallow, uDeep, depthMix).mul(0.58).add(uShellCol.mul(0.42));
      // Dual-octave scrolling sunlit TSL underwater caustics
      const p1 = st.mul(vec2(L * 1.5, W * 1.5)).add(vec2(time.mul(0.38), time.mul(0.24)));
      const p2 = st.mul(vec2(L * 2.2, W * 2.2)).sub(vec2(time.mul(0.30), time.mul(-0.33)));
      const c1 = mx_noise_float(p1).abs();
      const c2 = mx_noise_float(p2).abs();
      const caustic = pow(clamp(float(1.0).sub(c1.add(c2).mul(0.84)), 0.0, 1.0), float(2.8));
      return basePool.add(vec3(0.58, 0.94, 1.0).mul(caustic.mul(0.75)));
    })();
    floorMat.emissiveNode = Fn(() => {
      return uShallow.mul(float(0.14).add(this.uPoolLedIntensity.mul(0.55)));
    })();

    const basinFloor = new THREE.Mesh(new THREE.PlaneGeometry(L, W, 16, 12), floorMat);
    basinFloor.rotation.x = -Math.PI * 0.5;
    basinFloor.position.set(0, -0.05, 0);
    basinFloor.receiveShadow = true;
    root.add(basinFloor);

    // Submerged entry steps at shallow end with crisp white safety-edge nosing
    const stepMat = new THREE.MeshStandardMaterial({ color: finish.shellColor, roughness: 0.42 });
    const safetyEdgeMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35 });
    for (let s = 0; s < 3; s++) {
      const sx = -L * 0.5 + 0.24 + s * 0.36;
      const sy = -0.008 - s * 0.015;
      const step = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.055, W * 0.68), stepMat);
      step.position.set(sx, sy, 0);
      root.add(step);
      const nosing = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.06, W * 0.68), safetyEdgeMat);
      nosing.position.set(sx + 0.18, sy + 0.004, 0);
      root.add(nosing);
    }

    // 4. Sparkling Sunlit TSL Water Surface (luminous turquoise-aqua + Fresnel sky reflection + ripples)
    const waterMat = new MeshPhysicalNodeMaterial({
      roughness: 0.05,
      metalness: 0.06,
      transparent: true,
      opacity: 0.62
    });
    waterMat.colorNode = Fn(() => {
      const st = uv();
      const wave = sin(st.x.mul(L * 4.5).add(time.mul(2.2)))
        .mul(cos(st.y.mul(W * 4.5).sub(time.mul(1.8)))).mul(0.10);
      const sparkle = pow(clamp(wave.mul(5.5).add(0.45), 0.0, 1.0), float(4.0)).mul(0.28);
      const col = mix(uShallow, uDeep, smoothstep(float(0.0), float(1.0), st.x));
      const viewDir = normalize(cameraPosition.sub(positionWorld));
      const fresnel = pow(clamp(float(1.0).sub(dot(viewDir, vec3(0, 1, 0))), 0.0, 1.0), float(3.2));
      const skyRefl = vec3(0.84, 0.94, 1.0);
      return mix(col.add(wave).add(sparkle), skyRefl, fresnel.mul(0.54));
    })();
    waterMat.emissiveNode = Fn(() => {
      return uShallow.mul(float(0.08).add(this.uPoolLedIntensity.mul(0.35)));
    })();

    const waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(L - 0.04, W - 0.04, 24, 16), waterMat);
    waterMesh.rotation.x = -Math.PI * 0.5;
    waterMesh.position.set(0, 0.028, 0);
    root.add(waterMesh);

    // Infinity-edge wet weir lip & catch trough on +Z downhill edge
    if (preset.infinity) {
      const weir = new THREE.Mesh(new THREE.BoxGeometry(L + 0.2, 0.32, 0.28), copingMat);
      weir.position.set(0, -0.14, W * 0.5 + 0.25);
      root.add(weir);
      const sheet = new THREE.Mesh(new THREE.PlaneGeometry(L, 0.45), waterMat);
      sheet.position.set(0, -0.18, W * 0.5 + 0.14);
      root.add(sheet);
    }

    // Underwater dusk LED PointLights
    for (const lx of [-L * 0.28, L * 0.28]) {
      const led = new THREE.PointLight(0x5eead4, 0, 8, 1.6);
      led.position.set(lx, 0.22, 0);
      root.add(led);
      this.ledLights.push(led);
    }

    // 5. NZBC Clause F9 Mandatory 1.2m Pool Barrier (Frameless Glass or Black Aluminium)
    const fL = apronL - 0.16;
    const fW = apronW - 0.16;
    const fH = 1.22; // NZBC F9/AS1 >= 1200mm
    const isGlass = this.config.fenceType === 'frameless_glass';

    const fenceMat = isGlass
      ? new THREE.MeshStandardMaterial({
          color: '#d4f0fa', roughness: 0.06, metalness: 0.16, transparent: true, opacity: 0.24, side: THREE.DoubleSide
        })
      : new THREE.MeshStandardMaterial({
          color: '#1b1e21', roughness: 0.55, metalness: 0.55
        });
    const spigotMat = new THREE.MeshStandardMaterial({ color: '#d0d7dd', roughness: 0.22, metalness: 0.85 });

    const fenceSides = [
      { len: fL, px: 0, pz: -fW * 0.5, ry: 0 },
      { len: fL, px: 0, pz: fW * 0.5, ry: 0 },
      { len: fW, px: -fL * 0.5, pz: 0, ry: Math.PI * 0.5 },
      { len: fW, px: fL * 0.5, pz: 0, ry: Math.PI * 0.5 }
    ];

    for (const side of fenceSides) {
      if (isGlass) {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(side.len, fH, 0.015), fenceMat);
        panel.position.set(side.px, fH * 0.5 + 0.04, side.pz);
        panel.rotation.y = side.ry;
        root.add(panel);
        const spigots = Math.max(2, Math.floor(side.len / 1.2));
        for (let i = 0; i <= spigots; i++) {
          const offset = -side.len * 0.45 + (i / spigots) * side.len * 0.9;
          const sp = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.06), spigotMat);
          sp.position.set(
            side.px + Math.cos(side.ry) * offset,
            0.10,
            side.pz - Math.sin(side.ry) * offset
          );
          root.add(sp);
        }
      } else {
        const topRail = new THREE.Mesh(new THREE.BoxGeometry(side.len, 0.04, 0.04), fenceMat);
        topRail.position.set(side.px, fH, side.pz);
        topRail.rotation.y = side.ry;
        root.add(topRail);
        const botRail = new THREE.Mesh(new THREE.BoxGeometry(side.len, 0.04, 0.04), fenceMat);
        botRail.position.set(side.px, 0.14, side.pz);
        botRail.rotation.y = side.ry;
        root.add(botRail);
        const pickets = Math.floor(side.len / 0.18);
        for (let i = 0; i <= pickets; i++) {
          const offset = -side.len * 0.5 + (i / pickets) * side.len;
          const pk = new THREE.Mesh(new THREE.BoxGeometry(0.02, fH, 0.02), fenceMat);
          pk.position.set(side.px + Math.cos(side.ry) * offset, fH * 0.5 + 0.04, side.pz - Math.sin(side.ry) * offset);
          root.add(pk);
        }
      }
    }

    // 6. Toggleable NZBC F9/AS1 1200mm Exterior Non-Climbable Zone (NCZ) Envelope
    const nczOuterL = fL + 2.4;
    const nczOuterW = fW + 2.4;
    const nczShape = new THREE.Shape();
    nczShape.moveTo(-nczOuterL * 0.5, -nczOuterW * 0.5);
    nczShape.lineTo(nczOuterL * 0.5, -nczOuterW * 0.5);
    nczShape.lineTo(nczOuterL * 0.5, nczOuterW * 0.5);
    nczShape.lineTo(-nczOuterL * 0.5, nczOuterW * 0.5);
    nczShape.closePath();

    const hole = new THREE.Path();
    hole.moveTo(-fL * 0.5, -fW * 0.5);
    hole.lineTo(fL * 0.5, -fW * 0.5);
    hole.lineTo(fL * 0.5, fW * 0.5);
    hole.lineTo(-fL * 0.5, fW * 0.5);
    hole.closePath();
    nczShape.holes.push(hole);

    const nczGeom = new THREE.ShapeGeometry(nczShape);
    nczGeom.rotateX(-Math.PI * 0.5);
    const nczMat = new THREE.MeshBasicMaterial({
      color: 0xd97706, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false
    });
    const nczMesh = new THREE.Mesh(nczGeom, nczMat);
    nczMesh.position.set(cx, deckY + 0.09, cz);
    nczMesh.rotation.y = this.config.rotY;
    this.nczGroup.add(nczMesh);
    this.nczGroup.visible = this.config.showF9Zone;
  }

  // Real-time NZBC Clause F9 1200mm Exterior NCZ Clash Detection against plants & garden props!
  checkF9Compliance(plants = [], plantMap = {}, props = []) {
    this._clearGroup(this.clashGroup);
    const preset = NZ_POOL_PRESETS.find(p => p.id === this.config.presetId);
    if (!preset || preset.id === 'none') {
      this.clashCount = 0;
      return { active: false, clashes: 0, over35kL: false, volumeL: 0 };
    }

    const fHalfL = (preset.length + 2.24) * 0.5;
    const fHalfW = (preset.width + 2.24) * 0.5;
    const nczPad = 1.2; // NZBC F9/AS1 1200mm exterior clear arc!
    const cosR = Math.cos(-this.config.rotY);
    const sinR = Math.sin(-this.config.rotY);

    const clashRingGeom = new THREE.RingGeometry(0.32, 0.45, 24);
    clashRingGeom.rotateX(-Math.PI * 0.5);
    const clashMat = new THREE.MeshBasicMaterial({
      color: 0xef4444, side: THREE.DoubleSide, transparent: true, opacity: 0.9, depthWrite: false
    });

    let clashes = 0;
    const testPoint = (wx, wz) => {
      const dx = wx - this.config.x;
      const dz = wz - this.config.z;
      const lx = dx * cosR - dz * sinR;
      const lz = dx * sinR + dz * cosR;
      const insideFence = Math.abs(lx) < fHalfL && Math.abs(lz) < fHalfW;
      const insideNCZ = Math.abs(lx) < (fHalfL + nczPad) && Math.abs(lz) < (fHalfW + nczPad);
      if (!insideFence && insideNCZ) {
        clashes++;
        const gy = this.terrainEngine ? this.terrainEngine.getHeight(wx, wz) : 0;
        const ring = new THREE.Mesh(clashRingGeom, clashMat);
        ring.position.set(wx, gy + 0.12, wz);
        this.clashGroup.add(ring);
      }
    };

    for (const p of plants) {
      const spec = plantMap[p.speciesId];
      if (!spec || spec.matureHeight < 0.45) continue;
      testPoint(p.x, p.z);
    }
    for (const pr of props) {
      if (pr.typeId === 'boulders' || pr.typeId === 'planter' || pr.typeId === 'screen') {
        testPoint(pr.x, pr.z);
      }
    }

    this.clashCount = clashes;
    const q = this.getQuantities();
    return {
      active: true,
      clashes,
      over35kL: q.volumeL > 35000,
      volumeL: q.volumeL
    };
  }

  getQuantities() {
    const preset = NZ_POOL_PRESETS.find(p => p.id === this.config.presetId);
    if (!preset || preset.id === 'none') {
      return {
        active: false, footprintM2: 0, waterAreaM2: 0, volumeL: 0,
        excavationM3: 0, copingLm: 0, fenceLm: 0, glassPanels: 0, spigots: 0,
        shellCost: 0, finishCost: 0, fenceCost: 0, heatPumpCost: 0, consentCost: 0, totalExGst: 0
      };
    }
    const finish = POOL_FINISHES[this.config.finishId] || POOL_FINISHES.aqua_quartzon;
    const fence = FENCE_TYPES[this.config.fenceType] || FENCE_TYPES.frameless_glass;
    const avgDepth = (preset.depthShallow + preset.depthDeep) * 0.5;
    const waterAreaM2 = preset.length * preset.width;
    const footprintM2 = (preset.length + 2.4) * (preset.width + 2.4);
    const volumeL = Math.round(waterAreaM2 * avgDepth * 1000);
    const excavationM3 = Math.round(waterAreaM2 * (avgDepth + 0.35) * 1.15);
    const copingLm = 2 * (preset.length + preset.width);
    const fenceLm = 2 * ((preset.length + 2.24) + (preset.width + 2.24));
    const glassPanels = Math.ceil(fenceLm / 1.2);
    const spigots = glassPanels * 2;

    const shellCost = preset.baseCostNZD;
    const finishCost = preset.type === 'concrete' || preset.type === 'infinity' ? finish.upgradeCost : 0;
    const fenceCost = Math.round(fenceLm * fence.ratePerM + fence.gateCost);
    const heatPumpCost = this.config.heatPump ? 7500 : 0;
    const consentCost = volumeL > 35000 ? 4800 : 3200;
    const totalExGst = shellCost + finishCost + fenceCost + heatPumpCost + consentCost;

    return {
      active: true,
      presetName: preset.name,
      finishName: finish.name,
      fenceName: fence.name,
      footprintM2,
      waterAreaM2,
      volumeL,
      excavationM3,
      copingLm,
      fenceLm,
      glassPanels,
      spigots,
      shellCost,
      finishCost,
      fenceCost,
      heatPumpCost,
      consentCost,
      totalExGst
    };
  }
}
