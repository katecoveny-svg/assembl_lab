import * as THREE from 'three';

/**
 * Build an anatomically proportioned, articulated New Zealand Tūī
 * (Prosthemadera novaeseelandiae): sleek honeyeater body, iridescent dark-emerald/sapphire
 * plumage, slender decurved beak, iconic double white throat tufts (poi),
 * articulated swept wings with layered primaries, and notched tail.
 */
function createArticulatedTui() {
  const root = new THREE.Group();
  root.name = 'ManuTui';

  const plumageMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f2729,
    roughness: 0.26,
    metalness: 0.18,
    clearcoat: 0.72,
    clearcoatRoughness: 0.22,
    iridescence: 1.0,
    iridescenceIOR: 1.48,
    iridescenceThicknessRange: [220, 560],
  });
  const mantleMat = new THREE.MeshPhysicalMaterial({
    color: 0x261d20,
    roughness: 0.34,
    metalness: 0.12,
    iridescence: 0.65,
    iridescenceIOR: 1.38,
  });
  const whiteTuftMat = new THREE.MeshStandardMaterial({
    color: 0xf9f8f4,
    roughness: 0.65,
    metalness: 0.0,
  });
  const beakMat = new THREE.MeshStandardMaterial({ color: 0x161414, roughness: 0.32, metalness: 0.15 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.08, metalness: 0.2 });

  // Streamlined teardrop torso via LatheGeometry (aligned along +Z forward)
  const bodyPts = [
    new THREE.Vector2(0.004, -0.14),
    new THREE.Vector2(0.032, -0.09),
    new THREE.Vector2(0.056, -0.02),
    new THREE.Vector2(0.062, 0.045),
    new THREE.Vector2(0.048, 0.105),
    new THREE.Vector2(0.024, 0.145),
    new THREE.Vector2(0.004, 0.16),
  ];
  const bodyGeo = new THREE.LatheGeometry(bodyPts, 18);
  bodyGeo.rotateX(Math.PI * 0.5);
  bodyGeo.scale(0.88, 0.96, 1.0);
  const body = new THREE.Mesh(bodyGeo, plumageMat);
  body.castShadow = true;
  root.add(body);

  // Warm bronze-brown back mantle
  const mantle = new THREE.Mesh(new THREE.SphereGeometry(0.052, 14, 12), mantleMat);
  mantle.scale.set(0.86, 0.52, 1.35);
  mantle.position.set(0, 0.032, -0.01);
  root.add(mantle);

  // Distinct slender neck & rounded head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.036, 16, 14), plumageMat);
  head.scale.set(0.92, 0.96, 1.12);
  head.position.set(0, 0.062, 0.132);
  head.castShadow = true;
  root.add(head);

  // Slender decurved honeyeater beak (2 tapered segments)
  const beakBase = new THREE.Mesh(new THREE.ConeGeometry(0.010, 0.036, 8), beakMat);
  beakBase.rotation.x = Math.PI * 0.54;
  beakBase.position.set(0, 0.058, 0.178);
  root.add(beakBase);
  const beakTip = new THREE.Mesh(new THREE.ConeGeometry(0.005, 0.028, 7), beakMat);
  beakTip.rotation.x = Math.PI * 0.64;
  beakTip.position.set(0, 0.049, 0.203);
  root.add(beakTip);

  // Glossy dark eyes
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.0065, 8, 8), eyeMat);
    eye.position.set(s * 0.027, 0.070, 0.148);
    root.add(eye);
  }

  // Iconic double white curled throat tufts (poi) + lacy white neck filaments
  for (const s of [-1, 1]) {
    const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 10), whiteTuftMat);
    tuft.scale.set(0.92, 1.15, 0.88);
    tuft.position.set(s * 0.013, 0.022, 0.142);
    root.add(tuft);
  }
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.033, 0.0045, 6, 16, Math.PI * 1.15), whiteTuftMat);
  collar.rotation.x = Math.PI * 0.42;
  collar.rotation.z = Math.PI * 0.92;
  collar.position.set(0, 0.048, 0.112);
  root.add(collar);

  // Articulated sculpted wings (inner covert + swept primary feather blade + white shoulder bar)
  const makeWing = (side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.044, 0.024, 0.032);

    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0.045);
    wingShape.quadraticCurveTo(side * 0.11, 0.058, side * 0.23, 0.012);
    wingShape.quadraticCurveTo(side * 0.25, -0.022, side * 0.19, -0.056);
    wingShape.quadraticCurveTo(side * 0.09, -0.072, 0, -0.048);
    wingShape.closePath();

    const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
      depth: 0.008,
      bevelEnabled: true,
      bevelThickness: 0.003,
      bevelSize: 0.003,
      bevelSegments: 2,
    });
    wingGeo.rotateX(Math.PI * 0.5);
    const wingMesh = new THREE.Mesh(wingGeo, plumageMat);
    wingMesh.castShadow = true;
    pivot.add(wingMesh);

    // Subtle white wing-bar covert flash
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.005, 0.014), whiteTuftMat);
    bar.position.set(side * 0.055, 0.004, -0.005);
    pivot.add(bar);

    return pivot;
  };
  const leftWing = makeWing(-1);
  const rightWing = makeWing(1);
  root.add(leftWing, rightWing);

  // Long notched tail (5 layered rectrices)
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, -0.006, -0.125);
  for (let i = -2; i <= 2; i++) {
    const fGeo = new THREE.BoxGeometry(0.020, 0.004, 0.165);
    const f = new THREE.Mesh(fGeo, plumageMat);
    f.position.set(i * 0.011, 0, -0.075);
    f.rotation.y = i * 0.065;
    tailPivot.add(f);
  }
  root.add(tailPivot);

  return { root, leftWing, rightWing, tailPivot, scale: 1.15 };
}

/**
 * Build an anatomically proportioned New Zealand Kererū (Hemiphaga novaeseelandiae):
 * regal plump chest, iridescent emerald-bronze head/neck/wings, crisp snow-white waistcoat,
 * coral-red beak, broad rounded wings, and long banded tail.
 */
function createArticulatedKereru() {
  const root = new THREE.Group();
  root.name = 'ManuKereru';

  const emeraldMat = new THREE.MeshPhysicalMaterial({
    color: 0x1b4d38,
    roughness: 0.28,
    metalness: 0.16,
    clearcoat: 0.65,
    iridescence: 0.92,
    iridescenceIOR: 1.44,
    iridescenceThicknessRange: [260, 520],
  });
  const whiteBreastMat = new THREE.MeshStandardMaterial({ color: 0xfbfaf6, roughness: 0.62 });
  const coralMat = new THREE.MeshStandardMaterial({ color: 0xd94436, roughness: 0.36 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x8b1e24, roughness: 0.15 });

  // Plump upper breast + emerald back
  const upperBody = new THREE.Mesh(new THREE.SphereGeometry(0.092, 18, 14), emeraldMat);
  upperBody.scale.set(0.92, 0.94, 1.38);
  upperBody.castShadow = true;
  root.add(upperBody);

  // Iconic crisp white waistcoat underside
  const waistcoat = new THREE.Mesh(new THREE.SphereGeometry(0.088, 16, 12), whiteBreastMat);
  waistcoat.scale.set(0.89, 0.80, 1.24);
  waistcoat.position.set(0, -0.024, 0.008);
  root.add(waistcoat);

  // Small pigeon head & sturdy neck
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.044, 14, 12), emeraldMat);
  head.position.set(0, 0.082, 0.135);
  root.add(head);

  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.013, 0.038, 8), coralMat);
  beak.rotation.x = Math.PI * 0.54;
  beak.position.set(0, 0.078, 0.184);
  root.add(beak);

  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 8), eyeMat);
    eye.position.set(s * 0.032, 0.089, 0.152);
    root.add(eye);
  }

  // Broad rounded pigeon wings
  const makeWing = (side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.072, 0.028, 0.02);
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.068);
    shape.quadraticCurveTo(side * 0.16, 0.082, side * 0.30, 0.015);
    shape.quadraticCurveTo(side * 0.31, -0.045, side * 0.20, -0.088);
    shape.quadraticCurveTo(side * 0.09, -0.095, 0, -0.068);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.011, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2 });
    geo.rotateX(Math.PI * 0.5);
    const mesh = new THREE.Mesh(geo, emeraldMat);
    mesh.castShadow = true;
    pivot.add(mesh);
    return pivot;
  };
  const leftWing = makeWing(-1);
  const rightWing = makeWing(1);
  root.add(leftWing, rightWing);

  // Long broad tail
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, -0.008, -0.12);
  for (let i = -2; i <= 2; i++) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.005, 0.21), emeraldMat);
    f.position.set(i * 0.015, 0, -0.095);
    f.rotation.y = i * 0.07;
    tailPivot.add(f);
  }
  root.add(tailPivot);

  return { root, leftWing, rightWing, tailPivot, scale: 1.25 };
}

/**
 * Build an anatomically proportioned New Zealand Pīwakawaka (Rhipidura fuliginosa / Fantail):
 * tiny warm-cinnamon body, charcoal head with white eyebrow stripe, and signature wide
 * pleated black-and-white fan tail (9 radiating feathers).
 */
function createArticulatedPiwakawaka() {
  const root = new THREE.Group();
  root.name = 'ManuPiwakawaka';

  const cinnamonMat = new THREE.MeshStandardMaterial({ color: 0xb97a49, roughness: 0.58 });
  const charcoalMat = new THREE.MeshStandardMaterial({ color: 0x262426, roughness: 0.48 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xfbfaf7, roughness: 0.55 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.036, 14, 12), cinnamonMat);
  body.scale.set(0.92, 0.94, 1.18);
  body.castShadow = true;
  root.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 10), charcoalMat);
  head.position.set(0, 0.032, 0.044);
  root.add(head);

  // Crisp white eyebrow stripes & throat band
  for (const s of [-1, 1]) {
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.005, 0.022), whiteMat);
    brow.position.set(s * 0.020, 0.042, 0.052);
    root.add(brow);
  }
  const throat = new THREE.Mesh(new THREE.SphereGeometry(0.020, 10, 8), whiteMat);
  throat.position.set(0, 0.016, 0.048);
  root.add(throat);

  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.005, 0.018, 6), charcoalMat);
  beak.rotation.x = Math.PI * 0.5;
  beak.position.set(0, 0.030, 0.075);
  root.add(beak);

  const makeWing = (side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.028, 0.012, 0.008);
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.024);
    shape.quadraticCurveTo(side * 0.07, 0.030, side * 0.115, 0.004);
    shape.quadraticCurveTo(side * 0.10, -0.026, 0, -0.028);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.004, bevelEnabled: false });
    geo.rotateX(Math.PI * 0.5);
    pivot.add(new THREE.Mesh(geo, charcoalMat));
    return pivot;
  };
  const leftWing = makeWing(-1);
  const rightWing = makeWing(1);
  root.add(leftWing, rightWing);

  // Signature wide pleated black-and-white fan tail (9 individual feathers)
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0.006, -0.036);
  tailPivot.rotation.x = 0.42; // Cocked upward like a real fantail!
  for (let i = -4; i <= 4; i++) {
    const mat = Math.abs(i) <= 1 ? charcoalMat : whiteMat;
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.013, 0.0025, 0.125), mat);
    const angle = i * 0.165;
    f.position.set(Math.sin(angle) * 0.062, 0, -Math.cos(angle) * 0.062);
    f.rotation.y = -angle;
    tailPivot.add(f);
  }
  root.add(tailPivot);

  return { root, leftWing, rightWing, tailPivot, scale: 1.25 };
}

/**
 * WowAtmosphereEngine — Articulated NZ Manu (Tūī, Kererū, Pīwakawaka) with
 * realistic wingbeats & Press-F flight, volumetric golden-hour sun motes,
 * Hauraki coastal water horizon, and Day / Golden Hour / Arch Ink & Wash moods.
 */
export class WowAtmosphereEngine {
  constructor({ scene, renderer, terrainEngine, sunLight, hemiLight, sky, sharedUniforms, canvasEl }) {
    this.scene = scene;
    this.renderer = renderer;
    this.terrainEngine = terrainEngine;
    this.sunLight = sunLight;
    this.hemiLight = hemiLight;
    this.sky = sky;
    this.sharedUniforms = sharedUniforms;
    this.canvasEl = canvasEl;

    this.group = new THREE.Group();
    this.group.name = 'WowAtmosphere';
    this.scene.add(this.group);

    this.mood = 'daylight';
    this._motes = null;
    this._moteBase = null;
    this._moteMat = null;
    this._waterRing = null;

    this._buildSunMotes();
    this._buildCoastalWaterHorizon();
    this._buildManuFlock();
  }

  _buildManuFlock() {
    const groundY = (x, z) => (this.terrainEngine ? this.terrainEngine.getHeight(x, z) : 0);

    // 1. Tūī — perched near hero coastal bed, soars over house & pool on [F]
    const tui = createArticulatedTui();
    const tuiPerch = new THREE.Vector3(-4.4, groundY(-4.4, 1.2) + 2.4, 1.2);
    tui.root.scale.setScalar(tui.scale);
    tui.root.position.copy(tuiPerch);
    this.group.add(tui.root);

    // 2. Kererū — perched near rear bush glade, glides majestically across pavilion on [F]
    const kereru = createArticulatedKereru();
    const kereruPerch = new THREE.Vector3(-7.6, groundY(-7.6, -2.8) + 3.1, -2.8);
    kereru.root.scale.setScalar(kereru.scale);
    kereru.root.position.copy(kereruPerch);
    this.group.add(kereru.root);

    // 3. Pīwakawaka — constantly flits & fans its tail above the sunlit flax/sedge border!
    const fantail = createArticulatedPiwakawaka();
    const fantailCenter = new THREE.Vector3(1.6, groundY(1.6, 2.6) + 1.35, 2.6);
    fantail.root.scale.setScalar(fantail.scale);
    fantail.root.position.copy(fantailCenter);
    this.group.add(fantail.root);

    this.flock = [
      {
        id: 'tui',
        ...tui,
        perch: tuiPerch,
        flightT: -1,
        duration: 7.4,
        flapHz: 24,
        curve: new THREE.CatmullRomCurve3([
          tuiPerch.clone(),
          new THREE.Vector3(-0.8, 4.9, 3.6),
          new THREE.Vector3(5.8, 5.2, -1.6),
          new THREE.Vector3(6.6, 3.8, -7.6),
          new THREE.Vector3(-1.2, 5.6, -10.2),
          new THREE.Vector3(-7.2, 4.4, -3.8),
          tuiPerch.clone(),
        ], false, 'catmullrom', 0.5),
      },
      {
        id: 'kereru',
        ...kereru,
        perch: kereruPerch,
        flightT: -1,
        duration: 9.2,
        flapHz: 14,
        curve: new THREE.CatmullRomCurve3([
          kereruPerch.clone(),
          new THREE.Vector3(-4.2, 5.8, -6.5),
          new THREE.Vector3(3.4, 6.4, -8.8),
          new THREE.Vector3(7.4, 5.1, -2.2),
          new THREE.Vector3(2.2, 4.6, 3.8),
          new THREE.Vector3(-5.8, 4.8, 1.4),
          kereruPerch.clone(),
        ], false, 'catmullrom', 0.5),
      },
      {
        id: 'piwakawaka',
        ...fantail,
        perch: fantailCenter,
        flightT: 0, // Always lively darting around the planting bed!
        alwaysFlit: true,
        flapHz: 34,
      },
    ];
  }

  _makeGlowTexture() {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    g.addColorStop(0, 'rgba(255, 248, 224, 1.0)');
    g.addColorStop(0.35, 'rgba(255, 228, 176, 0.55)');
    g.addColorStop(1, 'rgba(255, 215, 150, 0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  _buildSunMotes() {
    const count = 180;
    const pos = new Float32Array(count * 3);
    const base = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 28;
      const y = 0.6 + Math.random() * 5.2;
      const z = (Math.random() - 0.5) * 26;
      pos[i * 3] = base[i * 3] = x;
      pos[i * 3 + 1] = base[i * 3 + 1] = y;
      pos[i * 3 + 2] = base[i * 3 + 2] = z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this._moteBase = base;
    this._moteMat = new THREE.PointsMaterial({
      map: this._makeGlowTexture(),
      size: 0.16,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: 0xfff5d6,
    });
    this._motes = new THREE.Points(geo, this._moteMat);
    this._motes.frustumCulled = false;
    this.group.add(this._motes);
  }

  _buildCoastalWaterHorizon() {
    const ringGeo = new THREE.RingGeometry(24, 145, 72, 1);
    ringGeo.rotateX(-Math.PI * 0.5);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x6ba0b8,
      roughness: 0.18,
      metalness: 0.42,
      transparent: true,
      opacity: 0.52,
    });
    this._waterRing = new THREE.Mesh(ringGeo, ringMat);
    this._waterRing.position.y = -2.8;
    this.group.add(this._waterRing);
  }

  triggerFlight() {
    for (const b of this.flock) {
      if (!b.alwaysFlit) {
        b.flightT = 0.0001;
      }
    }
    return true;
  }

  setMood(mood, setSunHourFn = null) {
    this.mood = mood || 'daylight';
    if (this.mood === 'golden') {
      if (typeof setSunHourFn === 'function') setSunHourFn(18.15);
      if (this.renderer) this.renderer.toneMappingExposure = 1.18;
      if (this.sunLight) this.sunLight.color.setHex(0xffc98b);
      if (this.hemiLight) {
        this.hemiLight.color.setHex(0xffdfba);
        this.hemiLight.groundColor.setHex(0x6e544a);
      }
      if (this.scene.fog) this.scene.fog.color.setHex(0xe8cbb4);
      if (this._moteMat) {
        this._moteMat.opacity = 0.78;
        this._moteMat.size = 0.22;
        this._moteMat.color.setHex(0xffd78a);
      }
      if (this._waterRing) {
        this._waterRing.material.color.setHex(0xc98d68);
        this._waterRing.material.opacity = 0.62;
      }
      if (this.sharedUniforms?.uContourMix) this.sharedUniforms.uContourMix.value = 0.0;
      if (this.canvasEl) this.canvasEl.style.filter = 'contrast(1.04) saturate(1.08)';
    } else if (this.mood === 'ink') {
      if (typeof setSunHourFn === 'function') setSunHourFn(11.5);
      if (this.renderer) this.renderer.toneMappingExposure = 1.32;
      if (this.sunLight) this.sunLight.color.setHex(0xfffdf8);
      if (this.hemiLight) {
        this.hemiLight.color.setHex(0xf4efe8);
        this.hemiLight.groundColor.setHex(0xb8aea6);
      }
      if (this.scene.fog) this.scene.fog.color.setHex(0xf3ede6);
      if (this._moteMat) this._moteMat.opacity = 0.08;
      if (this._waterRing) this._waterRing.material.opacity = 0.22;
      if (this.sharedUniforms?.uContourMix) this.sharedUniforms.uContourMix.value = 0.85;
      if (this.canvasEl) this.canvasEl.style.filter = 'grayscale(0.76) sepia(0.22) contrast(1.16) brightness(1.04)';
    } else {
      if (typeof setSunHourFn === 'function') setSunHourFn(14.5);
      if (this.renderer) this.renderer.toneMappingExposure = 1.24;
      if (this.sunLight) this.sunLight.color.setHex(0xfffaf0);
      if (this.hemiLight) {
        this.hemiLight.color.setHex(0xdff0ff);
        this.hemiLight.groundColor.setHex(0x9c927d);
      }
      if (this.scene.fog) this.scene.fog.color.setHex(0xdce8f2);
      if (this._moteMat) {
        this._moteMat.opacity = 0.34;
        this._moteMat.size = 0.16;
        this._moteMat.color.setHex(0xfff5d6);
      }
      if (this._waterRing) {
        this._waterRing.material.color.setHex(0x6ba0b8);
        this._waterRing.material.opacity = 0.52;
      }
      if (this.sharedUniforms?.uContourMix) this.sharedUniforms.uContourMix.value = 0.0;
      if (this.canvasEl) this.canvasEl.style.filter = '';
    }
  }

  update(dt, elapsed, isPhotoMode = false) {
    this.group.visible = !isPhotoMode;
    if (isPhotoMode) return;

    // 1. Drift sunlit pollen/dust motes
    if (this._motes && this._moteBase) {
      const attr = this._motes.geometry.attributes.position;
      const arr = attr.array;
      const b = this._moteBase;
      const n = arr.length / 3;
      for (let i = 0; i < n; i++) {
        const phase = i * 0.73;
        arr[i * 3] = b[i * 3] + Math.sin(elapsed * 0.35 + phase) * 0.65;
        arr[i * 3 + 1] = b[i * 3 + 1] + Math.sin(elapsed * 0.52 + phase * 1.3) * 0.28;
        arr[i * 3 + 2] = b[i * 3 + 2] + Math.cos(elapsed * 0.29 + phase * 0.9) * 0.65;
      }
      attr.needsUpdate = true;
    }

    // 2. Animate articulated NZ Manu (Tūī, Kererū, Pīwakawaka)
    for (const b of this.flock) {
      if (b.alwaysFlit) {
        // Pīwakawaka figure-8 lively foraging darting over the garden bed
        const t = elapsed * 0.85;
        const x = b.perch.x + Math.sin(t) * 2.6;
        const z = b.perch.z + Math.sin(t * 2.0) * 1.35;
        const y = b.perch.y + Math.sin(t * 3.1) * 0.32;
        const nx = b.perch.x + Math.sin(t + 0.08) * 2.6;
        const nz = b.perch.z + Math.sin((t + 0.08) * 2.0) * 1.35;
        b.root.position.set(x, y, z);
        b.root.lookAt(nx, y, nz);
        const flap = Math.sin(elapsed * b.flapHz) * 0.78;
        b.leftWing.rotation.z = flap;
        b.rightWing.rotation.z = -flap;
        b.tailPivot.rotation.x = 0.42 + Math.sin(elapsed * 6.5) * 0.16;
        b.tailPivot.rotation.y = Math.sin(elapsed * 4.2) * 0.22;
      } else if (b.flightT >= 0) {
        b.flightT += Math.min(dt, 0.05) / b.duration;
        if (b.flightT >= 1.0) {
          b.flightT = -1;
          b.root.position.copy(b.perch);
          b.root.rotation.set(0, 0.45, 0);
          b.leftWing.rotation.z = -1.05;  // Folded cleanly against flanks
          b.rightWing.rotation.z = 1.05;
        } else {
          const u = b.flightT;
          const eased = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
          const pos = b.curve.getPointAt(eased);
          const nextPos = b.curve.getPointAt(Math.min(1, eased + 0.015));
          const glideCycle = Math.sin(elapsed * 3.2) > -0.35 ? 1.0 : 0.15;
          const flap = Math.sin(elapsed * b.flapHz) * 0.72 * glideCycle;
          b.root.position.set(pos.x, pos.y + Math.sin(elapsed * b.flapHz) * 0.03, pos.z);
          b.root.lookAt(nextPos.x, nextPos.y, nextPos.z);
          b.root.rotateZ(Math.sin(u * Math.PI * 2) * 0.28);
          b.leftWing.rotation.z = flap;
          b.rightWing.rotation.z = -flap;
          b.tailPivot.rotation.x = -0.08 + (1 - Math.sin(u * Math.PI)) * 0.25;
        }
      } else {
        // Perched idle breathing, folded wings, alert head turns
        b.root.position.y = b.perch.y + Math.sin(elapsed * 2.2) * 0.015;
        b.root.rotation.y = 0.45 + Math.sin(elapsed * 0.75 + (b.id === 'kereru' ? 1.4 : 0)) * 0.34;
        b.leftWing.rotation.z = -1.08;
        b.rightWing.rotation.z = 1.08;
        b.tailPivot.rotation.x = -0.18 + Math.sin(elapsed * 1.9) * 0.05;
      }
    }
  }
}
