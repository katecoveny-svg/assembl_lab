import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

export const ARCH_PRESETS = [
  {
    id: 'coastal_pavilion',
    name: 'NZ Coastal Pavilion',
    subtitle: 'Board-formed concrete + 3D cedar battens & open glazing',
    footprintM2: 148,
    roofAreaM2: 172,
    nzs3604: 'Climate Zone 1 · Exposure C · High Wind'
  },
  {
    id: 'aotearoa_gable',
    name: 'Aotearoa Wide-Gable Pavilion',
    subtitle: 'NZ Coastal Wide-Gable · Architectural glazing',
    footprintM2: 265,
    roofAreaM2: 310,
    nzs3604: 'Climate Zone 1 · Exposure C · Very High Wind'
  },
  {
    id: 'courtyard_home',
    name: 'Courtyard Home',
    subtitle: 'L-shape indoor-outdoor pool courtyard',
    footprintM2: 162,
    roofAreaM2: 185,
    nzs3604: 'Climate Zone 1 · Exposure B · Medium Wind'
  },
  {
    id: 'none',
    name: 'None',
    subtitle: 'Pure landscape / Photo Match mode',
    footprintM2: 0,
    roofAreaM2: 0,
    nzs3604: 'Site-only mode'
  }
];

export const CLADDING_FINISHES = {
  dark_cedar: { name: 'Dark Stained Vertical Cedar', color: '#3b332d', roughness: 0.78, metalness: 0.04 },
  concrete:   { name: 'Board-Formed Concrete',       color: '#bab7b0', roughness: 0.84, metalness: 0.02 },
  weatherboard: { name: 'White NZ Weatherboard',     color: '#f2efe9', roughness: 0.70, metalness: 0.02 },
  colorsteel: { name: 'Black Colorsteel Seam',       color: '#262b30', roughness: 0.42, metalness: 0.35 }
};

function makeArchitecturalTexture(type) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');

  if (type === 'concrete') {
    ctx.fillStyle = '#bcb9b2';
    ctx.fillRect(0, 0, 512, 512);
    // Light architectural board-formed shuttering lines
    const boards = 16;
    const bh = 512 / boards;
    for (let i = 0; i < boards; i++) {
      const shade = 186 + Math.floor(Math.sin(i * 2.1) * 11);
      ctx.fillStyle = `rgb(${shade},${shade - 2},${shade - 6})`;
      ctx.fillRect(0, i * bh, 512, bh - 1.5);
      ctx.fillStyle = 'rgba(72,70,65,0.34)';
      ctx.fillRect(0, i * bh + bh - 1.5, 512, 1.5);
    }
    for (let i = 0; i < 1800; i++) {
      const x = Math.random() * 512, y = Math.random() * 512;
      const v = 158 + Math.floor(Math.random() * 56);
      ctx.fillStyle = `rgba(${v},${v},${v - 4},0.16)`;
      ctx.fillRect(x, y, 2, 2);
    }
  } else if (type === 'cedar') {
    ctx.fillStyle = '#332a24';
    ctx.fillRect(0, 0, 512, 512);
    // Vertical cedar backing with subtle grain
    const slats = 32;
    const sw = 512 / slats;
    for (let i = 0; i < slats; i++) {
      const v = 54 + Math.floor((Math.sin(i * 3.7) * 0.5 + 0.5) * 20);
      ctx.fillStyle = `rgb(${v + 12},${v + 4},${v - 2})`;
      ctx.fillRect(i * sw + 1, 0, sw - 2, 512);
      ctx.fillStyle = 'rgba(18,14,12,0.58)';
      ctx.fillRect(i * sw, 0, 1.5, 512);
    }
  } else if (type === 'oak_floor') {
    ctx.fillStyle = '#c89e6c';
    ctx.fillRect(0, 0, 512, 512);
    const planks = 12;
    const ph = 512 / planks;
    for (let i = 0; i < planks; i++) {
      const v = Math.floor((Math.sin(i * 4.3) * 0.5 + 0.5) * 24);
      ctx.fillStyle = `rgb(${194 + v},${150 + Math.floor(v * 0.75)},${102 + Math.floor(v * 0.5)})`;
      ctx.fillRect(0, i * ph + 1, 512, ph - 2);
      ctx.fillStyle = 'rgba(90,62,36,0.28)';
      ctx.fillRect(0, i * ph, 512, 1.5);
    }
  } else if (type === 'cultural_glass') {
    // Glazed gable facade with subtle Ngaru / cultural wave frit pattern
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#5a8ab0');
    grad.addColorStop(0.55, '#7da2be');
    grad.addColorStop(1, '#e6b27d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = 'rgba(28,32,36,0.72)';
    ctx.lineWidth = 4;
    for (let x = 0; x <= 512; x += 48) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(248,252,255,0.48)';
    ctx.lineWidth = 3;
    for (let row = 0; row < 4; row++) {
      const cy = 140 + row * 85;
      ctx.beginPath();
      for (let x = 0; x <= 512; x += 8) {
        const y = cy + Math.sin(x * 0.04 + row) * 26;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

export class ArchitectureEngine {
  constructor(scene, terrainEngine, surfaceTextures) {
    this.scene = scene;
    this.terrainEngine = terrainEngine;
    this.surfaceTextures = surfaceTextures;

    this.group = new THREE.Group();
    this.planUnderlayGroup = new THREE.Group();
    this.dxfGroup = new THREE.Group();
    this.scene.add(this.group);
    this.scene.add(this.planUnderlayGroup);
    this.scene.add(this.dxfGroup);

    this.presetId = 'coastal_pavilion';
    this.claddingId = 'dark_cedar';
    this.customFootprintM2 = 0;
    this.customPlanName = '';

    this.texConcrete = makeArchitecturalTexture('concrete');
    this.texCedar = makeArchitecturalTexture('cedar');
    this.texOakFloor = makeArchitecturalTexture('oak_floor');
    this.texCulturalGlass = makeArchitecturalTexture('cultural_glass');

    this.interiorGroup = new THREE.Group();
    this.scene.add(this.interiorGroup);
    this._interiorLoaded = false;
    this._loaderPromise = null;
    this.buildPreset(this.presetId);
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

  _groundY(x, z) {
    return this.terrainEngine ? this.terrainEngine.getHeight(x, z) : 0;
  }

  setVisible(vis) {
    this.group.visible = vis;
    this.dxfGroup.visible = vis;
    this.planUnderlayGroup.visible = vis;
    if (this.interiorGroup) this.interiorGroup.visible = vis && this.presetId === 'coastal_pavilion';
  }

  setCladding(claddingId) {
    this.claddingId = claddingId;
    this.buildPreset(this.presetId);
  }

  buildPreset(presetId) {
    this.presetId = presetId;
    this._clearGroup(this.group);
    if (presetId === 'none') return;

    const cladSpec = CLADDING_FINISHES[this.claddingId] || CLADDING_FINISHES.dark_cedar;
    const cladMat = new THREE.MeshStandardMaterial({
      color: cladSpec.color,
      map: this.claddingId === 'dark_cedar' ? this.texCedar : (this.claddingId === 'concrete' ? this.texConcrete : null),
      roughness: cladSpec.roughness,
      metalness: cladSpec.metalness
    });
    const concreteMat = new THREE.MeshStandardMaterial({
      map: this.texConcrete, roughness: 0.82, metalness: 0.02
    });
    const fasciaMat = new THREE.MeshStandardMaterial({
      color: '#202327', roughness: 0.44, metalness: 0.38
    });
    const soffitMat = new THREE.MeshStandardMaterial({
      color: '#f4f1ea', roughness: 0.82, metalness: 0.02
    });
    const plasterMat = new THREE.MeshStandardMaterial({
      color: '#f8f5ef', roughness: 0.86, metalness: 0.01
    });
    const oakFloorMat = new THREE.MeshStandardMaterial({
      map: this.texOakFloor, roughness: 0.48, metalness: 0.04
    });
    const battenMat = new THREE.MeshStandardMaterial({
      color: this.claddingId === 'weatherboard' ? '#edeae2' : (this.claddingId === 'concrete' ? '#adaaa2' : '#4a382c'),
      roughness: 0.74, metalness: 0.03
    });
    const mullionMat = new THREE.MeshStandardMaterial({
      color: '#1b1d20', roughness: 0.36, metalness: 0.55
    });
    const lowIronGlassMat = new THREE.MeshStandardMaterial({
      color: '#d4edf7',
      roughness: 0.06,
      metalness: 0.15,
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide
    });
    const balustradeGlassMat = new THREE.MeshStandardMaterial({
      color: '#d6eef8',
      roughness: 0.06,
      metalness: 0.14,
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide
    });
    const spigotMat = new THREE.MeshStandardMaterial({
      color: '#cfd6dc', roughness: 0.22, metalness: 0.85
    });
    const downlightMat = new THREE.MeshStandardMaterial({
      color: '#fff4dc',
      emissive: new THREE.Color('#ffdfaa'),
      emissiveIntensity: 1.8,
      roughness: 0.2
    });
    const deckMat = new THREE.MeshStandardMaterial({
      map: this.surfaceTextures?.kwila || null,
      color: '#b0a394', // Sunlit weathered silvered hardwood deck
      roughness: 0.68, metalness: 0.02
    });

    if (presetId === 'coastal_pavilion') {
      // Photorealistic NZ Coastal Pavilion — open-plan glazed living, 3D cedar battens, concrete chimney & silvered deck
      const baseX = -5.5, baseZ = -10.2;
      const gy = this._groundY(baseX, baseZ);

      // Foundation skirt extending 2.6m down so it never floats on sloped hills
      const foundMat = new THREE.MeshStandardMaterial({ color: '#3b3e42', roughness: 0.9 });
      const foundation = new THREE.Mesh(new THREE.BoxGeometry(15.2, 2.8, 5.4), foundMat);
      foundation.position.set(baseX, gy - 1.32, baseZ);
      foundation.receiveShadow = true;
      this.group.add(foundation);

      // ── 1. LEFT BEDROOM WING WITH REAL 3D VERTICAL CEDAR BATTENS ──
      const wingW = 5.8, wingH = 3.0, wingD = 4.4;
      const wingX = baseX - 4.4, wingZ = baseZ - 0.3;
      const leftWing = new THREE.Mesh(new THREE.BoxGeometry(wingW, wingH, wingD), cladMat);
      leftWing.position.set(wingX, gy + 1.55, wingZ);
      leftWing.castShadow = true; leftWing.receiveShadow = true;
      this.group.add(leftWing);

      // Real 3D vertical cedar timber fins along front & west facades (catching real sunlight & micro-shadows)
      const battenGeo = new THREE.BoxGeometry(0.055, wingH - 0.14, 0.065);
      const frontBattenCount = 26;
      for (let i = 0; i < frontBattenCount; i++) {
        const bx = wingX - wingW * 0.48 + (i / (frontBattenCount - 1)) * (wingW * 0.96);
        const fin = new THREE.Mesh(battenGeo, battenMat);
        fin.position.set(bx, gy + 1.55, wingZ + wingD * 0.5 + 0.03);
        fin.castShadow = true; fin.receiveShadow = true;
        this.group.add(fin);
      }
      // Subtle architectural bedroom slot window on front of cedar wing
      const bedGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 2.15), lowIronGlassMat);
      bedGlass.position.set(wingX - 1.1, gy + 1.55, wingZ + wingD * 0.5 + 0.075);
      this.group.add(bedGlass);
      const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(1.65, 2.25, 0.08), mullionMat);
      bedFrame.position.set(wingX - 1.1, gy + 1.55, wingZ + wingD * 0.5 + 0.03);
      this.group.add(bedFrame);

      // ── 2. LIGHT BOARD-FORMED CONCRETE CHIMNEY WITH SHADOW-LINE REVEAL & BLACK STEEL FLUE ──
      const chimX = baseX - 0.5, chimZ = baseZ + 0.1;
      const chimneyBase = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.32, 3.6), concreteMat);
      chimneyBase.position.set(chimX, gy + 1.71, chimZ);
      chimneyBase.castShadow = true; chimneyBase.receiveShadow = true;
      this.group.add(chimneyBase);

      // Crisp recessed dark shadow-line reveal between base and upper chimney stack
      const reveal = new THREE.Mesh(new THREE.BoxGeometry(2.52, 0.12, 1.32), fasciaMat);
      reveal.position.set(chimX, gy + 3.42, baseZ - 0.2);
      this.group.add(reveal);

      const chimneyTop = new THREE.Mesh(new THREE.BoxGeometry(2.64, 1.55, 1.44), concreteMat);
      chimneyTop.position.set(chimX, gy + 4.24, baseZ - 0.2);
      chimneyTop.castShadow = true; chimneyTop.receiveShadow = true;
      this.group.add(chimneyTop);

      // Black steel fireplace flue + architectural rain cap
      const flue = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.98, 16), fasciaMat);
      flue.position.set(chimX, gy + 5.38, baseZ - 0.2);
      flue.castShadow = true;
      this.group.add(flue);
      const flueCap = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.05, 16), fasciaMat);
      flueCap.position.set(chimX, gy + 5.88, baseZ - 0.2);
      this.group.add(flueCap);

      // ── 3. OPEN-PLAN GLAZED LIVING ROOM PAVILION (RECESSED INTERIOR + HONEY-OAK FLOOR + WHITE PLASTER + MULLIONS) ──
      const livX = baseX + 3.8, livZ = baseZ - 0.1;
      const livW = 7.2, livH = 3.1, livD = 4.8;
      const wallT = 0.24;

      // Exterior back wall & right end wall
      const backWallExt = new THREE.Mesh(new THREE.BoxGeometry(livW, livH, wallT), cladMat);
      backWallExt.position.set(livX, gy + 1.60, livZ - livD * 0.5 + wallT * 0.5);
      backWallExt.castShadow = true; backWallExt.receiveShadow = true;
      this.group.add(backWallExt);

      const rightWallExt = new THREE.Mesh(new THREE.BoxGeometry(wallT, livH, livD), cladMat);
      rightWallExt.position.set(livX + livW * 0.5 - wallT * 0.5, gy + 1.60, livZ);
      rightWallExt.castShadow = true; rightWallExt.receiveShadow = true;
      this.group.add(rightWallExt);

      // Crisp white plaster interior back wall, left chimney interior wall & ceiling soffit
      const backPlaster = new THREE.Mesh(new THREE.PlaneGeometry(livW - 0.5, livH - 0.2), plasterMat);
      backPlaster.position.set(livX, gy + 1.60, livZ - livD * 0.5 + wallT + 0.02);
      backPlaster.receiveShadow = true;
      this.group.add(backPlaster);

      const rightPlaster = new THREE.Mesh(new THREE.PlaneGeometry(livD - 0.3, livH - 0.2), plasterMat);
      rightPlaster.rotation.y = -Math.PI * 0.5;
      rightPlaster.position.set(livX + livW * 0.5 - wallT - 0.02, gy + 1.60, livZ);
      this.group.add(rightPlaster);

      const ceilingPlaster = new THREE.Mesh(new THREE.PlaneGeometry(livW - 0.3, livD - 0.2), soffitMat);
      ceilingPlaster.rotation.x = Math.PI * 0.5;
      ceilingPlaster.position.set(livX, gy + 3.04, livZ);
      this.group.add(ceilingPlaster);

      // Warm honey-oak floorboards inside the open living room
      const oakFloor = new THREE.Mesh(new THREE.BoxGeometry(livW - 0.25, 0.16, livD - 0.15), oakFloorMat);
      oakFloor.position.set(livX, gy + 0.12, livZ);
      oakFloor.receiveShadow = true;
      this.group.add(oakFloor);

      // Minimal architectural living furniture silhouettes (linen sofa + warm oak dining table)
      const sofaMat = new THREE.MeshStandardMaterial({ color: '#e6dfd5', roughness: 0.9 });
      const sofaBase = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.42, 0.95), sofaMat);
      sofaBase.position.set(livX - 1.1, gy + 0.42, livZ - 0.65);
      sofaBase.castShadow = true; sofaBase.receiveShadow = true;
      this.group.add(sofaBase);
      const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.48, 0.22), sofaMat);
      sofaBack.position.set(livX - 1.1, gy + 0.72, livZ - 1.02);
      this.group.add(sofaBack);

      const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.07, 0.92), oakFloorMat);
      tableTop.position.set(livX + 1.65, gy + 0.92, livZ - 0.25);
      tableTop.castShadow = true;
      this.group.add(tableTop);

      // Glowing warm interior lighting (recessed ceiling pucks + warm interior PointLight)
      const interiorLight = new THREE.PointLight(0xffe4bc, 2.8, 10.5, 1.4);
      interiorLight.position.set(livX, gy + 2.65, livZ + 0.1);
      this.group.add(interiorLight);

      const puckGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.02, 12);
      for (const lx of [-2.1, 0, 2.1]) {
        const puck = new THREE.Mesh(puckGeo, downlightMat);
        puck.position.set(livX + lx, gy + 3.02, livZ - 0.35);
        this.group.add(puck);
      }

      // Full-height front low-iron reflective glass sliders + slim matte-black mullions every 1.45m
      const sliderW = 5.75;
      const sliderH = 2.84;
      const sliderZ = livZ + livD * 0.5 - 0.08;
      const frontGlass = new THREE.Mesh(new THREE.PlaneGeometry(sliderW, sliderH), lowIronGlassMat);
      frontGlass.position.set(livX + 0.42, gy + 1.62, sliderZ);
      this.group.add(frontGlass);

      // Top & bottom matte-black slider tracks
      const trackGeo = new THREE.BoxGeometry(sliderW + 0.1, 0.07, 0.11);
      const topTrack = new THREE.Mesh(trackGeo, mullionMat);
      topTrack.position.set(livX + 0.42, gy + 3.04, sliderZ);
      this.group.add(topTrack);
      const botTrack = new THREE.Mesh(trackGeo, mullionMat);
      botTrack.position.set(livX + 0.42, gy + 0.21, sliderZ);
      this.group.add(botTrack);

      // Slim vertical matte-black aluminium mullions every 1.45m
      const mullionGeo = new THREE.BoxGeometry(0.055, sliderH + 0.06, 0.09);
      const startMx = (livX + 0.42) - sliderW * 0.5;
      for (let mx = startMx; mx <= (livX + 0.42) + sliderW * 0.5 + 0.05; mx += 1.45) {
        const m = new THREE.Mesh(mullionGeo, mullionMat);
        m.position.set(Math.min(mx, (livX + 0.42) + sliderW * 0.5), gy + 1.62, sliderZ);
        m.castShadow = true;
        this.group.add(m);
      }
      // Closing end mullion
      const endM = new THREE.Mesh(mullionGeo, mullionMat);
      endM.position.set((livX + 0.42) + sliderW * 0.5, gy + 1.62, sliderZ);
      this.group.add(endM);

      // ── 4. ARCHITECTURAL CANTILEVERED ROOF OVERHANG + BRIGHT WHITE SOFFIT + WARM EAVES DOWNLIGHTS ──
      const roofW = 11.8, roofD = 6.4;
      const roofX = baseX + 2.0, roofZ = baseZ + 0.45;
      const roofFascia = new THREE.Mesh(new THREE.BoxGeometry(roofW, 0.34, roofD), fasciaMat);
      roofFascia.position.set(roofX, gy + 3.36, roofZ);
      roofFascia.castShadow = true; roofFascia.receiveShadow = true;
      this.group.add(roofFascia);

      // Bright off-white recessed soffit underside
      const roofSoffit = new THREE.Mesh(new THREE.BoxGeometry(roofW - 0.24, 0.05, roofD - 0.24), soffitMat);
      roofSoffit.position.set(roofX, gy + 3.17, roofZ);
      this.group.add(roofSoffit);

      // Warm recessed eaves downlights along the front overhang
      for (let i = 0; i < 6; i++) {
        const ex = roofX - roofW * 0.42 + (i / 5) * (roofW * 0.84);
        const dl = new THREE.Mesh(puckGeo, downlightMat);
        dl.position.set(ex, gy + 3.14, roofZ + roofD * 0.5 - 0.55);
        this.group.add(dl);
      }

      const leftRoof = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.28, 4.9), fasciaMat);
      leftRoof.position.set(wingX, gy + 3.18, wingZ + 0.05);
      leftRoof.castShadow = true;
      this.group.add(leftRoof);
      const leftSoffit = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.04, 4.7), soffitMat);
      leftSoffit.position.set(wingX, gy + 3.03, wingZ + 0.05);
      this.group.add(leftSoffit);

      // ── 5. WEATHERED SILVERED HARDWOOD DECK + RECESSED STEP TREAD + FRAMELESS GLASS BALUSTRADE ──
      const deckW = 9.8, deckD = 3.2;
      const deckX = baseX + 2.6, deckZ = baseZ + 3.6;
      const deck = new THREE.Mesh(new THREE.BoxGeometry(deckW, 0.22, deckD), deckMat);
      deck.position.set(deckX, gy + 0.14, deckZ);
      deck.castShadow = true; deck.receiveShadow = true;
      this.group.add(deck);

      // Recessed floating step tread along the front edge of the deck
      const stepTread = new THREE.Mesh(new THREE.BoxGeometry(deckW - 0.4, 0.11, 0.52), deckMat);
      stepTread.position.set(deckX, gy + 0.01, deckZ + deckD * 0.5 + 0.24);
      stepTread.castShadow = true; stepTread.receiveShadow = true;
      this.group.add(stepTread);

      // Subtle frameless glass balustrade along the pool-facing right edge of the deck
      const balX = deckX + deckW * 0.5 - 0.08;
      const balGlass = new THREE.Mesh(new THREE.BoxGeometry(0.016, 1.05, deckD - 0.2), balustradeGlassMat);
      balGlass.position.set(balX, gy + 0.78, deckZ);
      this.group.add(balGlass);
      for (const sz of [-1.1, 0.0, 1.1]) {
        const sp = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.05), spigotMat);
        sp.position.set(balX, gy + 0.30, deckZ + sz);
        this.group.add(sp);
      }

    } else if (presetId === 'aotearoa_gable') {
      // Sculptural wide-gable Aotearoa Wide-Gable Pavilion pavilion
      const baseX = -1.5, baseZ = -10.8;
      const gy = this._groundY(baseX, baseZ);

      const w = 18.0, ridgeH = 5.4, eaveH = 1.6, depth = 9.5;
      const shape = new THREE.Shape();
      shape.moveTo(-w * 0.5, 0);
      shape.lineTo(w * 0.5, 0);
      shape.lineTo(w * 0.5, eaveH);
      shape.lineTo(0, ridgeH);
      shape.lineTo(-w * 0.5, eaveH);
      shape.closePath();

      const bodyGeom = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
      bodyGeom.translate(0, 0, -depth * 0.5);
      const body = new THREE.Mesh(bodyGeom, cladMat);
      body.position.set(baseX, gy, baseZ);
      body.castShadow = true; body.receiveShadow = true;
      this.group.add(body);

      const roofShape = new THREE.Shape();
      roofShape.moveTo(-w * 0.54, eaveH - 0.15);
      roofShape.lineTo(0, ridgeH + 0.35);
      roofShape.lineTo(w * 0.54, eaveH - 0.15);
      roofShape.lineTo(w * 0.54, eaveH + 0.22);
      roofShape.lineTo(0, ridgeH + 0.72);
      roofShape.lineTo(-w * 0.54, eaveH + 0.22);
      roofShape.closePath();
      const roofGeom = new THREE.ExtrudeGeometry(roofShape, { depth: depth + 1.4, bevelEnabled: false });
      roofGeom.translate(0, 0, -(depth + 1.4) * 0.5);
      const roofMesh = new THREE.Mesh(roofGeom, fasciaMat);
      roofMesh.position.set(baseX, gy, baseZ);
      roofMesh.castShadow = true;
      this.group.add(roofMesh);

      const facadeMat = new THREE.MeshStandardMaterial({
        map: this.texCulturalGlass,
        roughness: 0.16, metalness: 0.22,
        emissive: new THREE.Color('#6b4d2e'), emissiveIntensity: 0.22
      });
      const facadeGeom = new THREE.ShapeGeometry(shape);
      const facade = new THREE.Mesh(facadeGeom, facadeMat);
      facade.position.set(baseX, gy + 0.02, baseZ + depth * 0.5 + 0.04);
      this.group.add(facade);

      const plinth = new THREE.Mesh(new THREE.BoxGeometry(w, 2.6, depth), new THREE.MeshStandardMaterial({ color: '#3b3e42', roughness: 0.9 }));
      plinth.position.set(baseX, gy - 1.3, baseZ);
      this.group.add(plinth);

    } else if (presetId === 'courtyard_home') {
      const baseX = -6.0, baseZ = -9.5;
      const gy = this._groundY(baseX, baseZ);

      const wingA = new THREE.Mesh(new THREE.BoxGeometry(12.5, 3.1, 4.6), cladMat);
      wingA.position.set(baseX + 2.0, gy + 1.55, baseZ);
      wingA.castShadow = true; wingA.receiveShadow = true;
      this.group.add(wingA);

      const wingB = new THREE.Mesh(new THREE.BoxGeometry(4.6, 3.1, 8.8), cladMat);
      wingB.position.set(baseX - 2.0, gy + 1.55, baseZ + 4.4);
      wingB.castShadow = true; wingB.receiveShadow = true;
      this.group.add(wingB);

      const roofA = new THREE.Mesh(new THREE.BoxGeometry(13.2, 0.32, 5.2), fasciaMat);
      roofA.position.set(baseX + 2.0, gy + 3.24, baseZ + 0.1);
      roofA.castShadow = true;
      this.group.add(roofA);

      const roofB = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.32, 9.4), fasciaMat);
      roofB.position.set(baseX - 2.0, gy + 3.24, baseZ + 4.4);
      roofB.castShadow = true;
      this.group.add(roofB);

      const glassA = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 2.5), lowIronGlassMat);
      glassA.position.set(baseX + 3.2, gy + 1.4, baseZ + 2.34);
      this.group.add(glassA);

      const deck = new THREE.Mesh(new THREE.BoxGeometry(8.0, 0.2, 3.0), deckMat);
      deck.position.set(baseX + 3.2, gy + 0.1, baseZ + 3.7);
      deck.receiveShadow = true;
      this.group.add(deck);
    }
  }

  // Parse a 2D .DXF floor plan (LINE & LWPOLYLINE entities) into crisp 3D extruded walls!
  importDXFFloorPlan(dxfText, filename = 'floor-plan.dxf') {
    this._clearGroup(this.dxfGroup);
    const lines = dxfText.split(/\r?\n/).map(s => s.trim());
    const segments = [];

    for (let i = 0; i < lines.length - 1; i++) {
      if (lines[i] === '0' && lines[i + 1] === 'LINE') {
        let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
        let j = i + 2;
        while (j < lines.length - 1 && lines[j] !== '0') {
          const code = lines[j], val = parseFloat(lines[j + 1]);
          if (code === '10') x1 = val;
          else if (code === '20') y1 = val;
          else if (code === '11') x2 = val;
          else if (code === '21') y2 = val;
          j += 2;
        }
        if (Math.hypot(x2 - x1, y2 - y1) > 1e-3) segments.push([x1, y1, x2, y2]);
      } else if (lines[i] === '0' && lines[i + 1] === 'LWPOLYLINE') {
        const pts = [];
        let closed = false;
        let curX = null;
        let j = i + 2;
        while (j < lines.length - 1 && lines[j] !== '0') {
          const code = lines[j], val = parseFloat(lines[j + 1]);
          if (code === '70' && (Math.round(val) & 1)) closed = true;
          else if (code === '10') curX = val;
          else if (code === '20' && curX !== null) { pts.push([curX, val]); curX = null; }
          j += 2;
        }
        for (let k = 0; k < pts.length - 1; k++) {
          segments.push([pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1]]);
        }
        if (closed && pts.length > 2) {
          segments.push([pts[pts.length - 1][0], pts[pts.length - 1][1], pts[0][0], pts[0][1]]);
        }
      }
    }

    if (segments.length === 0) throw new Error('No LINE or LWPOLYLINE walls found in DXF');

    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (const [x1, y1, x2, y2] of segments) {
      minX = Math.min(minX, x1, x2); maxX = Math.max(maxX, x1, x2);
      minY = Math.min(minY, y1, y2); maxY = Math.max(maxY, y1, y2);
    }
    const rawSpan = Math.max(maxX - minX, maxY - minY, 1);
    const unitScale = rawSpan > 180 ? 0.001 : 1.0;
    const fitScale = (rawSpan * unitScale > 26) ? (22 / (rawSpan * unitScale)) : 1.0;
    const s = unitScale * fitScale;
    const cx = (minX + maxX) * 0.5;
    const cy = (minY + maxY) * 0.5;

    const wallMat = new THREE.MeshStandardMaterial({
      color: '#e5e3dc', roughness: 0.78, metalness: 0.04, transparent: true, opacity: 0.88
    });
    const linePts = [];
    const maxWalls = Math.min(segments.length, 450);

    for (let i = 0; i < maxWalls; i++) {
      const [x1, y1, x2, y2] = segments[i];
      const ax = (x1 - cx) * s, az = -(y1 - cy) * s - 6.0;
      const bx = (x2 - cx) * s, bz = -(y2 - cy) * s - 6.0;
      const len = Math.hypot(bx - ax, bz - az);
      if (len < 0.25 || len > 32) continue;

      const mx = (ax + bx) * 0.5, mz = (az + bz) * 0.5;
      const gy = this._groundY(mx, mz);
      linePts.push(new THREE.Vector3(ax, gy + 0.06, az), new THREE.Vector3(bx, gy + 0.06, bz));

      const wall = new THREE.Mesh(new THREE.BoxGeometry(len, 2.7, 0.14), wallMat);
      wall.position.set(mx, gy + 1.35, mz);
      wall.rotation.y = -Math.atan2(bz - az, bx - ax);
      wall.castShadow = true; wall.receiveShadow = true;
      this.dxfGroup.add(wall);
    }

    if (linePts.length > 0) {
      const lGeom = new THREE.BufferGeometry().setFromPoints(linePts);
      this.dxfGroup.add(new THREE.LineSegments(lGeom, new THREE.LineBasicMaterial({ color: 0x38bdf8 })));
    }

    this.customFootprintM2 = Math.min(600, (maxX - minX) * s * (maxY - minY) * s * 0.65);
    this.customPlanName = filename;
    this.buildPreset('none');
    return { wallCount: maxWalls, footprintM2: this.customFootprintM2 };
  }

  importPlanImage(dataUrl, filename = 'floor-plan.png', widthM = 20) {
    this._clearGroup(this.planUnderlayGroup);
    const img = new Image();
    img.onload = () => {
      const aspect = img.height / Math.max(1, img.width);
      const tex = new THREE.Texture(img);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      const geom = new THREE.PlaneGeometry(widthM, widthM * aspect);
      geom.rotateX(-Math.PI * 0.5);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.78, depthWrite: false });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(0, this._groundY(0, -4) + 0.06, -4);
      this.planUnderlayGroup.add(mesh);
    };
    img.src = dataUrl;
    this.customPlanName = filename;
  }

  reprojectToTerrain() {
    this.buildPreset(this.presetId);
  }

  getMetrics() {
    const p = ARCH_PRESETS.find(x => x.id === this.presetId) || ARCH_PRESETS[0];
    return {
      preset: p,
      footprintM2: this.presetId === 'none' ? this.customFootprintM2 : p.footprintM2,
      roofAreaM2: this.presetId === 'none' ? this.customFootprintM2 : p.roofAreaM2,
      nzs3604: p.nzs3604
    };
  }

  async _ensureInteriorGLBs(cx, gy, cz) {
    if (!this.interiorGroup) return;
    this.interiorGroup.visible = this.presetId === 'coastal_pavilion';
    if (!this.interiorGroup.visible) return;
    this.interiorGroup.position.set(cx, gy + 0.14, cz);
    if (this._interiorLoaded) return;
    this._interiorLoaded = true;
    try {
      if (!this._loaderPromise) {
        this._loaderPromise = (async () => {
          const loader = new GLTFLoader();
          try { await MeshoptDecoder.ready; loader.setMeshoptDecoder(MeshoptDecoder); } catch {}
          return loader;
        })();
      }
      const loader = await this._loaderPromise;
      const items = [
        { url: "/plan-studio/library/glb/kowhai-hero-liv-01.glb", x: -1.1, z: -0.6, h: 0.84, ry: 0.0 },
        { url: "/plan-studio/library/glb/curated-lounge-chair.glb", x: 1.5, z: -0.1, h: 0.78, ry: -0.65 },
        { url: "/plan-studio/library/glb/kowhai-hero-din-01.glb", x: 3.1, z: -0.8, h: 0.76, ry: 0.0 },
        { url: "/plan-studio/library/glb/curated-sheer-curtain.glb", x: -3.2, z: 1.85, h: 2.75, ry: 0.0 }
      ];
      for (const it of items) {
        loader.load(it.url, (gltf) => {
          const obj = gltf.scene || gltf.scenes?.[0];
          if (!obj) return;
          obj.updateMatrixWorld(true);
          const box = new THREE.Box3().setFromObject(obj);
          const sz = new THREE.Vector3(); const ctr = new THREE.Vector3();
          box.getSize(sz); box.getCenter(ctr);
          const s = sz.y > 0.01 ? it.h / sz.y : 1.0;
          obj.scale.multiplyScalar(s);
          obj.position.set(it.x - ctr.x * s, -box.min.y * s, it.z - ctr.z * s);
          obj.rotation.y = it.ry;
          obj.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
          this.interiorGroup.add(obj);
        }, undefined, () => {});
      }
    } catch {}
  }
}
