// Aotearoa Native 3D Landscape & Site-Plan Painter — Three.js r187 WebGPU + TSL
// Fuses:
//   1. WebGPURenderer (automatic WebGL2 fallback), SkyMesh NZ Southern Hemisphere solar slider (06:30–20:30),
//      5 × 1024px WebP Photorealistic Botanical Atlases, TSL 3-layer wind + SSS + smooth J–D bloom + Yr 1/4/7/12 growth
//   2. Site Plan + Freehand Garden Bed Brush mode (2048px 1:100 sample plan, multi-page PDF.js / image upload,
//      2-Point Scale calibration, marching-squares brushed Corten/Macrocarpa beds + 6-channel NZ surface splatmap)
//   3. Upload-to-Photo Backdrop mode (?mode=photo) with transparent shadow-catcher ground + Horizon/Tilt/Scale controls
//   4. Real NZ Land mode (1 m LINZ LiDAR DEM+DSM, LINZ Primary Parcel boundary ribbon, AUP zone/overlays/hazards, extruded buildings)
//   5. Curated 3D Native Manu (Tūī, Kererū, Pīwakawaka), Kaitiakitanga Ecology & NZBC E1 meter,
//      OS Embed mode (?embed=os&project=&lat=&lon=), and L101 A3 SVG / CSV / 3D .glb exports!

import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SkyMesh } from 'three/addons/objects/SkyMesh.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

import {
  NZ_MONTHS,
  NZ_SEASONS,
  NZ_SPECIES,
  SPECIES_BY_ID,
  NZ_SURFACES,
  EDGING_STYLES,
  NZ_EDGINGS,
  MULCH_STYLES,
  NZ_COMPOSITIONS,
  stampBrushField,
  buildPlantingSchedule,
  exportPlantingCSV,
  exportPlantingPlanSVG,
  computeEcologyMetrics,
  polygonPerimeterM,
} from '../catalog.mjs';
import { createNZSurfaceTextures, drawSampleSitePlanToCanvas } from './proceduralTextures.mjs';
import { createSharedUniforms, createTerrainNodeMaterial } from './tslMaterials.mjs';
import { PlantingEngine } from './plantingEngine.mjs';
import { buildSampleBackyardPhotoDataUrl } from './photoBackdrop.mjs';
import { readLayer, unpackHeights, heightAt } from '../../roof-solar/linz/ground.js';
import { toNZTM } from '../../roof-solar/linz/nztm.js';
import { outlinesUrl, parseOutlines, askAddress } from '../../roof-solar/site.mjs';

// ── ROHE AUTO-SELECTION FROM NZ LATITUDE/LONGITUDE ───────────────────────────
function inferRoheFromCoords(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return { label: 'Tāmaki Makaurau Coastal', compId: 'coastal_native' };
  if (lat > -37.4) return { label: 'Tāmaki Makaurau Coastal', compId: 'coastal_native' };
  if (lat > -39.2) return { label: 'Waikato & Bay of Plenty Riparian', compId: 'pollinator_meadow' };
  if (lat > -41.7) return { label: 'Te Whanganui-a-Tara Wind-Zone', compId: 'coastal_headland' };
  if (lat > -44.2 && lon > 171.2) return { label: 'Waitaha / Canterbury Plains', compId: 'arch_subtropical' };
  return { label: 'Central Otago Schist & Alpine', compId: 'alpine_tussock' };
}

function wireDialogLightDismiss(dlg) {
  if (!dlg) return;
  dlg.addEventListener('close', () => { dlg.returnValue = ''; });
  if ('closedBy' in HTMLDialogElement.prototype) return;
  let downOut = false;
  const isOut = (e) => {
    const r = dlg.getBoundingClientRect();
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  };
  dlg.addEventListener('pointerdown', (e) => { downOut = isOut(e); });
  dlg.addEventListener('pointerup', (e) => { if (downOut && isOut(e)) dlg.close(); });
}

function syncSliderFill(input) {
  if (!input) return;
  const min = Number(input.min) || 0;
  const max = Number(input.max) || 100;
  const val = Number(input.value) || 0;
  const pct = ((val - min) / Math.max(1e-6, max - min)) * 100;
  input.style.setProperty('--fill', `${Math.max(0, Math.min(100, pct)).toFixed(1)}%`);
}

async function init() {
  const urlParams = new URLSearchParams(window.location.search);
  const isOsEmbed = urlParams.get('embed') === 'os';
  const embedProject = urlParams.get('project') || '';
  const embedLat = urlParams.has('lat') ? Number(urlParams.get('lat')) : NaN;
  const embedLon = urlParams.has('lon') ? Number(urlParams.get('lon')) : NaN;
  const urlMode = urlParams.get('mode');

  if (isOsEmbed) {
    document.body.classList.add('is-os-embed');
  }

  const canvas = document.getElementById('gl');
  const srStatus = document.getElementById('srStatus');
  const hudChip = document.getElementById('hudChip');
  const photoBackdropImg = document.getElementById('photoBackdrop');

  const announce = (msg) => {
    if (srStatus) srStatus.textContent = msg;
    if (hudChip) hudChip.textContent = msg;
  };

  // ── WEBGPU RENDERER (Three.js r187 with automatic WebGL2 fallback & alpha for Photo Backdrop) ─
  const renderer = new WebGPURenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  await renderer.init();

  const isWebGPU = Boolean(renderer.backend && renderer.backend.isWebGPUBackend);
  const backendBadge = document.getElementById('backendBadge');
  if (backendBadge) backendBadge.textContent = isWebGPU ? 'WebGPU' : 'WebGL2';

  // ── SCENE, CAMERA & ORBIT CONTROLS ─────────────────────────────────────────
  const scene = new THREE.Scene();
  const baseFog = new THREE.FogExp2(0x8899a4, 0.0085);
  scene.fog = baseFog;

  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.15, 320);
  camera.position.set(11.8, 9.0, 12.6);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.target.set(0, 0.6, 0);
  controls.maxPolarAngle = Math.PI * 0.488;
  controls.minDistance = 2.4;
  controls.maxDistance = 120;
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.ROTATE,
  };

  // ── PHYSICAL SKY (SkyMesh) & NZ SOUTHERN HEMISPHERE SOLAR LIGHTING ─────────
  const sharedUniforms = createSharedUniforms();
  const sky = new SkyMesh();
  sky.scale.setScalar(220);
  sky.turbidity.value = 3.2;
  sky.rayleigh.value = 1.65;
  sky.mieCoefficient.value = 0.0045;
  sky.mieDirectionalG.value = 0.82;
  scene.add(sky);

  const sunLight = new THREE.DirectionalLight(0xfff5e4, 3.15);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 90;
  sunLight.shadow.camera.left = -24;
  sunLight.shadow.camera.right = 24;
  sunLight.shadow.camera.top = 24;
  sunLight.shadow.camera.bottom = -24;
  sunLight.shadow.bias = -0.0004;
  sunLight.shadow.normalBias = 0.024;
  scene.add(sunLight);

  const hemiLight = new THREE.HemisphereLight(0xb8d4f0, 0x3b352a, 0.95);
  scene.add(hemiLight);

  const fillLight = new THREE.DirectionalLight(0x9ec5e8, 0.48);
  fillLight.position.set(-10, 8, 12);
  scene.add(fillLight);

  // ── APP STATE ──────────────────────────────────────────────────────────────
  const state = {
    groundMode: 'studio', // 'studio' | 'siteplan' | 'photo' | 'linz'
    tool: 'paint-mix',    // 'garden_brush' | 'paint-mix' | 'paint-plant' | 'draw-bed' | 'sculpt' | 'paint-surface' | 'erase' | 'measure' | 'orbit'
    tab: 'compositions',  // 'compositions' | 'plants' | 'surfaces'
    plantCat: 'all',
    selectedCompositionId: NZ_COMPOSITIONS[0].id,
    selectedPlantId: 'kowhai',
    selectedSurfaceChannel: 1, // Daltons Black Bark Mulch
    selectedEdgingId: 'corten',
    selectedMulchId: 'bark',
    brushRadius: 2.0,
    densityMult: 1.05,
    clumping: 0.72,
    sunHour: 14.5,
    windOn: true,
    handlesVisible: true,
    uplightsOn: true,
    manuOn: true,
    isPlanView: false,
    playingSeason: false,
    showSampleMassing: true,
    siteLabel: embedProject || 'Tāmaki Makaurau Coastal Studio',
    rohe: 'Tāmaki Makaurau Coastal',
    siteFactsSummary: null,
    drawPoints: [],
    planMeta: { widthM: 28, depthM: 20, aspect: 20 / 28, isSample: true, label: 'Proposed Coastal Site Plan · 1:100' },
    twoPtCalib: null,
    photoSettings: { horizonPct: 50, tiltDeg: 14, scaleMult: 1.0, loadedUrl: null },
  };

  // ── SHARED PROCEDURAL TEXTURES & FIXED 2048×2048 SITE PLAN CANVAS TEXTURE ──
  const surfaceTextures = createNZSurfaceTextures();
  const planCanvas = document.createElement('canvas');
  planCanvas.width = 2048;
  planCanvas.height = 2048;
  drawSampleSitePlanToCanvas(planCanvas);
  const planTex = new THREE.CanvasTexture(planCanvas);
  planTex.colorSpace = THREE.SRGBColorSpace;
  planTex.anisotropy = 8;
  planTex.needsUpdate = true;

  // ── PLANTING ENGINE & UNIFIED TSL TERRAIN MESH ─────────────────────────────
  const STUDIO_SIZE = 34;
  const engine = new PlantingEngine(scene, sharedUniforms, surfaceTextures, {
    terrainWidth: STUDIO_SIZE,
    terrainDepth: STUDIO_SIZE,
    splatRes: 512,
  });

  const { mat: terrainMat, uPlanMix, uContourMix } = createTerrainNodeMaterial(
    engine.splatTexA,
    engine.splatTexB,
    surfaceTextures,
    planTex
  );

  const terrainMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(STUDIO_SIZE, STUDIO_SIZE, 64, 64).rotateX(-Math.PI * 0.5),
    terrainMat
  );
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);

  // Seamless outer NZ landscape horizon skirt (shown in Studio & LINZ modes)
  const skirtTex = surfaceTextures.lawn.clone();
  skirtTex.repeat.set(42, 42);
  skirtTex.needsUpdate = true;
  const skirtMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(240, 240).rotateX(-Math.PI * 0.5),
    new THREE.MeshStandardMaterial({ map: skirtTex, roughness: 0.94, metalness: 0.0 })
  );
  skirtMesh.position.y = -0.04;
  skirtMesh.receiveShadow = true;
  scene.add(skirtMesh);

  // Dark studio board surround beneath 2D Site Plan sheet
  const boardMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(260, 260).rotateX(-Math.PI * 0.5),
    new THREE.MeshStandardMaterial({ color: 0x19131b, roughness: 0.94 })
  );
  boardMesh.position.y = -0.05;
  boardMesh.visible = false;
  scene.add(boardMesh);

  // Transparent shadow-catcher ground plane for Photo Backdrop mode (?mode=photo)
  const photoShadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI * 0.5),
    new THREE.ShadowMaterial({ opacity: 0.36 })
  );
  photoShadowPlane.receiveShadow = true;
  photoShadowPlane.visible = false;
  scene.add(photoShadowPlane);

  // Context groups (Studio Kwila Terrace, Sample Site Plan 3D Massing, LINZ Buildings & Parcel Ribbon)
  const studioContextGroup = new THREE.Group();
  const sampleMassingGroup = new THREE.Group();
  const linzContextGroup = new THREE.Group();
  const manuGroup = new THREE.Group();
  const helpersGroup = new THREE.Group();
  scene.add(studioContextGroup, sampleMassingGroup, linzContextGroup, manuGroup, helpersGroup);

  function buildStudioDeckContext() {
    const deckMat = new THREE.MeshStandardMaterial({ map: surfaceTextures.kwila, roughness: 0.58, metalness: 0.04 });
    const deckMesh = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.16, 3.6), deckMat);
    deckMesh.position.set(-6.5, 0.08, -7.8);
    deckMesh.receiveShadow = true;
    deckMesh.castShadow = true;
    studioContextGroup.add(deckMesh);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x2a2429, roughness: 0.85 });
    const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(9.6, 1.85, 0.24), wallMat);
    wallMesh.position.set(-6.5, 0.92, -9.65);
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    studioContextGroup.add(wallMesh);

    const paverMat = new THREE.MeshStandardMaterial({ map: surfaceTextures.pavers, roughness: 0.78, metalness: 0.02 });
    const stepPositions = [
      [-4.8, -5.2], [-4.5, -4.1], [-4.1, -3.0], [-3.6, -1.9],
      [-3.1, -0.8], [-2.7, 0.3], [-2.5, 1.4], [-2.6, 2.5], [-3.0, 3.6],
    ];
    const paverGeo = new THREE.BoxGeometry(0.85, 0.055, 0.48);
    for (let i = 0; i < stepPositions.length; i++) {
      const [sx, sz] = stepPositions[i];
      const m = new THREE.Mesh(paverGeo, paverMat);
      m.position.set(sx, 0.028, sz);
      m.rotation.y = Math.sin(i * 0.4) * 0.12;
      m.receiveShadow = true;
      m.castShadow = true;
      studioContextGroup.add(m);
    }
  }
  buildStudioDeckContext();

  function buildSamplePlan3DMassing() {
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xf4efe8, roughness: 0.78, transparent: true, opacity: 0.92 });
    const roofTrimMat = new THREE.MeshStandardMaterial({ color: 0x2c2628, roughness: 0.42, metalness: 0.45 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xcbe0e4, transparent: true, opacity: 0.28, roughness: 0.05 });
    const deckMat = new THREE.MeshStandardMaterial({ map: surfaceTextures.kwila, roughness: 0.64 });

    const house = new THREE.Mesh(new THREE.BoxGeometry(11.0, 3.1, 5.0), wallMat);
    house.position.set(-2.0, 1.55, -3.7);
    house.castShadow = true;
    house.receiveShadow = true;
    sampleMassingGroup.add(house);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(11.9, 0.22, 5.9), roofTrimMat);
    roof.position.set(-2.0, 3.2, -3.7);
    roof.castShadow = true;
    sampleMassingGroup.add(roof);

    const glazing = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 2.5), glassMat);
    glazing.position.set(0.1, 1.45, -1.18);
    sampleMassingGroup.add(glazing);

    const deck = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.28, 4.2), deckMat);
    deck.position.set(3.5, 0.14, -0.7);
    deck.castShadow = true;
    deck.receiveShadow = true;
    sampleMassingGroup.add(deck);
    sampleMassingGroup.visible = false;
  }
  buildSamplePlan3DMassing();

  function rebuildTerrainGeometry(widthM, depthM, segsX, segsZ, heightFn = null) {
    if (terrainMesh.geometry) terrainMesh.geometry.dispose();
    const geom = new THREE.PlaneGeometry(widthM, depthM, segsX, segsZ);
    geom.rotateX(-Math.PI * 0.5);
    if (heightFn) {
      const pos = geom.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        pos.setY(i, heightFn(pos.getX(i), pos.getZ(i)));
      }
      geom.computeVertexNormals();
    }
    terrainMesh.geometry = geom;
    engine.setTerrainDimensions(widthM, depthM);
    engine.setGroundHeightFn(heightFn || (() => 0));
  }

  // ── SOLAR LIGHTING & SKY CONTROLLER ────────────────────────────────────────
  function updateNZSun(hour, moodOverride = null) {
    state.sunHour = hour;
    const dayProgress = Math.max(0.01, Math.min(0.99, (hour - 6.0) / 14.5));
    const elevation = Math.max(0.07, Math.sin(dayProgress * Math.PI) * 1.12);
    const azimuth = (dayProgress - 0.5) * Math.PI * 1.18;
    const sunDir = new THREE.Vector3(
      -Math.sin(azimuth) * Math.cos(elevation),
      Math.sin(elevation),
      -Math.cos(azimuth) * Math.cos(elevation)
    ).normalize();

    sky.sunPosition.value.copy(sunDir);
    sunLight.position.copy(sunDir).multiplyScalar(32);
    sharedUniforms.uSunDir.value.copy(sunDir);

    const golden = 1.0 - Math.min(1.0, elevation / 0.45);
    const isDusk = hour >= 19.6 || hour <= 6.8 || moodOverride === 'dusk';

    sunLight.color.setRGB(1.0, 0.95 - golden * 0.24, 0.88 - golden * 0.44);
    sunLight.intensity = isDusk ? 1.15 : 2.1 + Math.sin(elevation) * 1.65;
    hemiLight.intensity = isDusk ? 0.45 : 0.58 + Math.sin(elevation) * 0.52;

    if (state.groundMode !== 'photo') {
      baseFog.color.setRGB(
        0.38 + (1 - golden) * 0.28,
        0.42 + (1 - golden) * 0.29,
        0.48 + (1 - golden) * 0.30
      );
      scene.fog = baseFog;
    }

    const wantUplight = isDusk ? 3.8 : golden > 0.55 ? 1.6 : 0.0;
    if (Math.abs(engine.uplightIntensity - wantUplight) > 0.35) {
      engine.uplightIntensity = wantUplight;
      engine.rebuildBeds3D(state.tool === 'sculpt');
    }

    const hh = Math.floor(hour);
    const mm = Math.round((hour - hh) * 60);
    const lbl = document.getElementById('sunTimeOut');
    if (lbl) lbl.textContent = `${String(hh).padStart(2, '0')}:${String(mm === 60 ? 0 : mm).padStart(2, '0')}`;
  }

  // ── CURATED 3D NATIVE MANU (Tūī, Kererū, Pīwakawaka from /plan-studio/library/glb/) ─
  const manuPrototypes = new Map();
  const animatedManu = [];

  async function loadCuratedManu() {
    try {
      await MeshoptDecoder.ready;
      const loader = new GLTFLoader();
      loader.setMeshoptDecoder(MeshoptDecoder);
      const specs = [
        ['tui', '/plan-studio/library/glb/manu-tui.glb', 1.45],
        ['kereru', '/plan-studio/library/glb/manu-kereru.glb', 1.65],
        ['piwakawaka', '/plan-studio/library/glb/manu-piwakawaka.glb', 1.25],
      ];
      await Promise.all(
        specs.map(async ([key, url, scaleMult]) => {
          const gltf = await loader.loadAsync(url);
          const root = gltf.scene;
          const box = new THREE.Box3().setFromObject(root);
          const sz = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(sz.x, sz.y, sz.z, 0.001);
          root.scale.setScalar((0.24 * scaleMult) / maxDim);
          root.traverse((o) => {
            if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
          });
          manuPrototypes.set(key, root);
        })
      );
      syncManu3D();
    } catch {
      /* optional 3D native bird enhancement */
    }
  }
  void loadCuratedManu();

  function syncManu3D() {
    while (manuGroup.children.length) manuGroup.remove(manuGroup.children[0]);
    animatedManu.length = 0;
    if (!state.manuOn || !manuPrototypes.size) return;

    const yr = sharedUniforms.uYear.value;
    const perches = engine.plants.filter((p) =>
      ['pohutukawa', 'kowhai', 'tikouka', 'harakeke', 'ponga', 'manuka', 'titoki', 'nikau'].includes(p.speciesId)
    );
    const maxBirds = Math.min(7, perches.length);
    for (let i = 0; i < maxBirds; i++) {
      const host = perches[(i * 5) % perches.length];
      const sp = SPECIES_BY_ID[host.speciesId];
      if (!sp) continue;
      const birdKey = (host.speciesId === 'tikouka' || host.speciesId === 'nikau' || host.speciesId === 'titoki')
        ? 'kereru'
        : (host.speciesId === 'ponga' || host.speciesId === 'manuka')
          ? 'piwakawaka'
          : 'tui';
      const proto = manuPrototypes.get(birdKey) ?? [...manuPrototypes.values()][0];
      if (!proto) continue;

      const bird = proto.clone(true);
      const yrFrac = Math.min(1, 0.35 + (yr / 12) * 0.65);
      const perchH = sp.matureHeight * (host.scale || 1) * yrFrac * 0.72;
      const baseY = engine.plantSupportHeightAt(host.x, host.z) + perchH;
      bird.position.set(host.x + 0.22, baseY, host.z + 0.14);
      bird.rotation.y = (i * 2.1) % (Math.PI * 2);
      manuGroup.add(bird);
      animatedManu.push({ node: bird, baseY, phase: i * 1.7 });
    }
  }

  // ── 3D BRUSH RING CURSOR, DRAW-BED PREVIEW & MEASURE LINE ──────────────────
  const RING_SEG = 56;
  const ringPositions = new Float32Array((RING_SEG + 1) * 3);
  const ringGeo = new THREE.BufferGeometry();
  ringGeo.setAttribute('position', new THREE.BufferAttribute(ringPositions, 3));
  const ringMat = new THREE.LineBasicMaterial({ color: 0xf9f6f2, transparent: true, opacity: 0.92 });
  const brushRing = new THREE.Line(ringGeo, ringMat);
  brushRing.visible = false;

  const centerDot = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xf9f6f2 })
  );
  centerDot.visible = false;

  const measurePositions = new Float32Array(6);
  const measureGeo = new THREE.BufferGeometry();
  measureGeo.setAttribute('position', new THREE.BufferAttribute(measurePositions, 3));
  const measureLine = new THREE.Line(measureGeo, new THREE.LineBasicMaterial({ color: 0xe8b732 }));
  measureLine.visible = false;

  const drawPreviewGroup = new THREE.Group();
  helpersGroup.add(brushRing, centerDot, measureLine, drawPreviewGroup);

  function updateBrushRing(wx, wz) {
    const show = ['garden_brush', 'paint-mix', 'paint-plant', 'paint-surface', 'erase', 'draw-bed'].includes(state.tool);
    brushRing.visible = show;
    centerDot.visible = show || state.tool === 'measure' || Boolean(state.twoPtCalib);
    if (!show && state.tool !== 'measure' && !state.twoPtCalib) return;

    centerDot.position.set(wx, engine.plantSupportHeightAt(wx, wz) + 0.08, wz);
    const colMap = {
      garden_brush: 0xb5df9e,
      'paint-mix': 0xf9f6f2,
      'paint-plant': 0xd9bacb,
      'paint-surface': 0xe8b732,
      'draw-bed': 0xe8b732,
      erase: 0xe68888,
    };
    ringMat.color.setHex(colMap[state.tool] || 0xf9f6f2);

    const rad = state.tool === 'draw-bed' ? 0.36 : state.brushRadius;
    for (let i = 0; i <= RING_SEG; i++) {
      const a = (i / RING_SEG) * Math.PI * 2;
      const rx = wx + Math.cos(a) * rad;
      const rz = wz + Math.sin(a) * rad;
      ringPositions[i * 3] = rx;
      ringPositions[i * 3 + 1] = engine.plantSupportHeightAt(rx, rz) + 0.06;
      ringPositions[i * 3 + 2] = rz;
    }
    ringGeo.attributes.position.needsUpdate = true;
    ringGeo.computeBoundingSphere();
  }

  function rebuildDrawPreview(hoverPt = null) {
    while (drawPreviewGroup.children.length) {
      const c = drawPreviewGroup.children.pop();
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    }
    const pts = [...state.drawPoints];
    if (hoverPt) pts.push(hoverPt);
    if (!pts.length) return;

    const dotGeom = new THREE.SphereGeometry(0.11, 12, 10);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xe8b732 });
    for (const p of state.drawPoints) {
      const m = new THREE.Mesh(dotGeom, dotMat);
      m.position.set(p.x, engine.groundHeightAt(p.x, p.z) + 0.1, p.z);
      drawPreviewGroup.add(m);
    }
    if (pts.length >= 2) {
      const linePts = pts.map((p) => new THREE.Vector3(p.x, engine.groundHeightAt(p.x, p.z) + 0.1, p.z));
      if (state.drawPoints.length >= 3) linePts.push(linePts[0].clone());
      drawPreviewGroup.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(linePts),
        new THREE.LineBasicMaterial({ color: 0xf9f6f2 })
      ));
    }
  }

  function finishDrawingBed() {
    if (state.drawPoints.length < 3) return;
    engine.pushUndoState();
    const comp = NZ_COMPOSITIONS.find((c) => c.id === state.selectedCompositionId) || NZ_COMPOSITIONS[0];
    engine.createSplineBed(state.drawPoints, comp, {
      edging: state.selectedEdgingId,
      mulch: state.selectedMulchId,
      densityMult: state.densityMult,
      clumping: state.clumping,
    });
    state.drawPoints = [];
    rebuildDrawPreview(null);
    syncManu3D();
    updateInspectorAndStats();
    announce('Created sculpted NZ native bed — drag vertices or brush extra species anytime.');
  }

  // ── POPULATE SHOWCASE STUDIO GARDEN ────────────────────────────────────────
  function buildShowcaseStudioGarden() {
    engine.clearAll(false);
    engine.undoStack.length = 0;
    engine.redoStack.length = 0;

    // Waikato river pebble path under Firth stepping pavers
    for (let z = -5.4; z <= 4.0; z += 0.7) {
      const x = -4.6 + Math.sin((z + 5.4) * 0.32) * 1.9;
      engine.paintSurfaceDisc(x, z, 1.35, 3, 0.95, 0.55);
    }
    // Firth Piazza courtyard terrace around the Kwila deck
    engine.paintSurfacePolygon([
      [-11.5, -10.0], [-1.5, -10.0], [-1.5, -5.4], [-11.5, -5.4],
    ], 2, 0.15);

    // Organic hero coastal island bed (Straightcurve Corten 150 mm + Daltons Black Bark Mulch)
    const heroBedPts = [
      [-1.2, -4.2], [2.2, -4.8], [5.8, -3.6], [7.4, -0.6],
      [6.4, 3.1], [3.0, 4.8], [-0.6, 4.2], [-1.8, 1.4], [-1.9, -1.6],
    ];
    engine.createSplineBed(heroBedPts, NZ_COMPOSITIONS[0], {
      edging: 'corten',
      mulch: 'bark',
      densityMult: 1.22,
      clumping: 0.72,
      name: 'Tāmaki Coastal Hero Bed',
      seed: 108,
    });

    // Sheltered Nīkau & Ponga bush glade beside the Kwila deck (Macrocarpa Sleepers)
    const fernBedPts = [
      [-9.8, -4.2], [-6.2, -4.4], [-5.4, -1.4],
      [-6.5, 2.2], [-9.6, 1.8], [-10.6, -1.2],
    ];
    engine.createSplineBed(fernBedPts, NZ_COMPOSITIONS[2], {
      edging: 'macrocarpa',
      mulch: 'bark',
      densityMult: 1.15,
      clumping: 0.68,
      name: 'Nīkau & Ponga Fern Glade',
      seed: 204,
    });
    engine.activeBedId = engine.splineBeds[0].id;
    syncManu3D();
  }

  // ── GROUND MODE SWITCHING (Studio | Site Plan + Brush | Photo Backdrop | LINZ) ─
  const sitePlanStrip = document.getElementById('sitePlanStrip');
  const photoStrip = document.getElementById('photoStrip');
  const pdfPageSelect = document.getElementById('pdfPageSelect');
  let activePdfDoc = null;

  function setGroundModeUI(mode) {
    state.groundMode = mode;
    document.getElementById('modeStudioBtn')?.setAttribute('aria-pressed', String(mode === 'studio'));
    document.getElementById('modeSitePlanBtn')?.setAttribute('aria-pressed', String(mode === 'siteplan'));
    document.getElementById('modePhotoBtn')?.setAttribute('aria-pressed', String(mode === 'photo'));
    document.getElementById('modeLinzBtn')?.setAttribute('aria-pressed', String(mode === 'linz'));

    sitePlanStrip.hidden = mode !== 'siteplan';
    photoStrip.hidden = mode !== 'photo';
    document.body.classList.toggle('has-substrip', mode === 'siteplan' || mode === 'photo');

    photoBackdropImg.hidden = mode !== 'photo';
    sky.visible = mode !== 'photo';
    terrainMesh.visible = mode !== 'photo';
    photoShadowPlane.visible = mode === 'photo';
    skirtMesh.visible = mode === 'studio' || mode === 'linz';
    boardMesh.visible = mode === 'siteplan';
    studioContextGroup.visible = mode === 'studio';
    sampleMassingGroup.visible = mode === 'siteplan' && state.planMeta.isSample && state.showSampleMassing;
    linzContextGroup.visible = mode === 'linz';

    uPlanMix.value = mode === 'siteplan' ? 1.0 : 0.0;
    uContourMix.value = mode === 'linz' ? 1.0 : 0.0;

    if (mode === 'photo') {
      scene.fog = null;
      scene.background = null;
      renderer.setClearColor(0x000000, 0);
    } else {
      scene.fog = baseFog;
      renderer.setClearColor(0x150e16, 1);
    }
  }

  function enterStudioMode() {
    setGroundModeUI('studio');
    state.siteLabel = embedProject || 'Tāmaki Makaurau Coastal Studio';
    state.siteFactsSummary = null;
    rebuildTerrainGeometry(STUDIO_SIZE, STUDIO_SIZE, 64, 64, null);
    buildShowcaseStudioGarden();
    setTool('paint-mix');
    updateNZSun(14.5);
    transitionCamera(new THREE.Vector3(11.8, 9.0, 12.6), new THREE.Vector3(0, 0.6, 0));
    updateInspectorAndStats();
    announce('Studio Garden · WebGPU botanical atlas active — paint mixes, surfaces, or scrub J–D seasons!');
  }

  function mountSitePlan({ widthM, aspect, label, isSample = false, resetBeds = false }) {
    const depthM = widthM * aspect;
    state.planMeta = { widthM, depthM, aspect, isSample, label };
    const wInput = document.getElementById('planWidthInput');
    if (wInput) wInput.value = String(Math.round(widthM * 10) / 10);
    const massBtn = document.getElementById('planMassingBtn');
    if (massBtn) massBtn.hidden = !isSample;

    rebuildTerrainGeometry(widthM, depthM, 48, 48, null);
    setGroundModeUI('siteplan');
    state.siteLabel = label;
    state.siteFactsSummary = null;
    if (resetBeds) {
      engine.clearAll(false);
    } else {
      engine.resetSplatmap(true);
    }

    setTool('garden_brush');
    updateNZSun(13.5);
    transitionCamera(
      new THREE.Vector3(1.4, Math.max(13.5, widthM * 0.56), Math.max(12.2, depthM * 0.68)),
      new THREE.Vector3(0.8, 0.25, 1.2)
    );
    updateInspectorAndStats();
  }

  function enterSampleSitePlanMode() {
    const sample = drawSampleSitePlanToCanvas(planCanvas);
    planTex.needsUpdate = true;
    mountSitePlan({
      widthM: sample.widthM,
      aspect: sample.aspect,
      label: 'Proposed Coastal Site Plan · 1:100',
      isSample: true,
      resetBeds: true,
    });
    // Pre-brush a starter curved border bed along the Kwila deck & sunny lawn so it looks immediately alive!
    const comp = NZ_COMPOSITIONS.find((c) => c.id === state.selectedCompositionId) || NZ_COMPOSITIONS[0];
    for (let x = -0.4; x <= 8.2; x += 0.6) {
      const z = 3.2 + Math.sin(x * 0.45) * 0.85;
      stampBrushField(engine.brushField, x, z, 1.55, +1);
      engine.paintSurfaceDisc(x, z, 1.45, 1, 0.65, 0.6);
    }
    engine.syncBrushedBedsFromField();
    if (engine.brushedBeds[0]) {
      engine.regenerateBed(engine.brushedBeds[0].id, comp, 1.15, state.clumping);
    }
    syncManu3D();
    updateInspectorAndStats();
    announce('Site Plan + Brush · Drag directly across the 2D site plan to brush 3D Corten beds & NZ natives!');
  }

  function enterPhotoBackdropMode(photoDataUrl = null, label = 'Backyard Photo Backdrop') {
    if (photoDataUrl) {
      state.photoSettings.loadedUrl = photoDataUrl;
    } else if (!state.photoSettings.loadedUrl) {
      state.photoSettings.loadedUrl = buildSampleBackyardPhotoDataUrl();
    }
    photoBackdropImg.src = state.photoSettings.loadedUrl;
    rebuildTerrainGeometry(44, 44, 16, 16, null);
    setGroundModeUI('photo');
    state.siteLabel = label;
    state.siteFactsSummary = null;
    engine.clearAll(false);

    // Pre-brush a curved native border in the mid-foreground of the backyard photo
    const comp = NZ_COMPOSITIONS.find((c) => c.id === state.selectedCompositionId) || NZ_COMPOSITIONS[0];
    for (let x = -4.2; x <= 4.4; x += 0.65) {
      const z = -1.6 + Math.sin(x * 0.42) * 0.9;
      stampBrushField(engine.brushField, x, z, 1.45, +1);
    }
    engine.syncBrushedBedsFromField();
    if (engine.brushedBeds[0]) {
      engine.regenerateBed(engine.brushedBeds[0].id, comp, 1.15, state.clumping);
    }
    syncManu3D();
    applyPhotoCameraCalibration();
    setTool('garden_brush');
    updateNZSun(15.2);
    updateInspectorAndStats();
    announce('Photo Backdrop active — upload your own backyard photo or drag Garden Bed Brush (G) directly onto the lawn!');
  }

  function applyPhotoCameraCalibration() {
    const { horizonPct, tiltDeg, scaleMult } = state.photoSettings;
    photoBackdropImg.style.objectPosition = `50% ${horizonPct}%`;
    photoBackdropImg.style.transform = `scale(${scaleMult.toFixed(2)})`;
    const dist = 13.5 / Math.max(0.45, scaleMult);
    const rad = (tiltDeg * Math.PI) / 180;
    camera.position.set(0, Math.max(1.2, Math.sin(rad) * dist), Math.cos(rad) * dist);
    controls.target.set(0, 0.55, -1.2);
    controls.update();
  }

  // ── UPLOAD SITE PLAN (MULTI-PAGE PDF / PNG / JPG / WEBP) & PHOTO BACKDROP ──
  async function handleUploadedPlanFile(file) {
    if (!file) return;
    if (state.groundMode === 'photo' && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => enterPhotoBackdropMode(String(reader.result), `${file.name} (Photo)`);
      reader.readAsDataURL(file);
      return;
    }

    const isPdf = /\.pdf$/i.test(file.name) || file.type === 'application/pdf';
    if (isPdf) {
      announce(`Rendering PDF site plan ${file.name}…`);
      try {
        const pdfjs = await import(/* @vite-ignore */ '/architecture/vendor/pdfjs/pdf.min.mjs');
        pdfjs.GlobalWorkerOptions.workerSrc = '/architecture/vendor/pdfjs/pdf.worker.min.mjs';
        const bytes = new Uint8Array(await file.arrayBuffer());
        activePdfDoc = await pdfjs.getDocument({ data: bytes, isEvalSupported: false, verbosity: 0 }).promise;
        if (activePdfDoc.numPages > 1) {
          pdfPageSelect.hidden = false;
          pdfPageSelect.innerHTML = Array.from({ length: activePdfDoc.numPages }, (_, i) =>
            `<option value="${i + 1}">Sheet p.${i + 1}/${activePdfDoc.numPages}</option>`
          ).join('');
        } else {
          pdfPageSelect.hidden = true;
        }
        await renderPdfSitePlanPage(1, file.name);
      } catch (err) {
        announce(`Could not render PDF: ${err?.message || err}`);
      }
      return;
    }

    activePdfDoc = null;
    pdfPageSelect.hidden = true;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const tctx = planCanvas.getContext('2d');
        tctx.fillStyle = '#ffffff';
        tctx.fillRect(0, 0, planCanvas.width, planCanvas.height);
        tctx.drawImage(img, 0, 0, planCanvas.width, planCanvas.height);
        planTex.needsUpdate = true;
        const widthM = Math.max(4, Number(document.getElementById('planWidthInput')?.value) || 28);
        mountSitePlan({
          widthM,
          aspect: img.naturalHeight / Math.max(1, img.naturalWidth),
          label: `${file.name} (Site Plan)`,
          isSample: false,
          resetBeds: true,
        });
        syncManu3D();
        announce(`Loaded ${file.name} — drag Garden Bed Brush (G) across the drawing or calibrate with 2-Pt Scale!`);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  async function renderPdfSitePlanPage(pageNum, titleBase = 'Site Plan PDF') {
    if (!activePdfDoc) return;
    const pg = await activePdfDoc.getPage(pageNum);
    const v1 = pg.getViewport({ scale: 1 });
    const scale = Math.min(3.5, 2048 / Math.max(v1.width, v1.height));
    const vp = pg.getViewport({ scale });
    const tmp = document.createElement('canvas');
    tmp.width = Math.ceil(vp.width);
    tmp.height = Math.ceil(vp.height);
    const tg = tmp.getContext('2d');
    tg.fillStyle = '#ffffff';
    tg.fillRect(0, 0, tmp.width, tmp.height);
    await pg.render({ canvasContext: tg, viewport: vp }).promise;
    pg.cleanup();

    const tctx = planCanvas.getContext('2d');
    tctx.clearRect(0, 0, planCanvas.width, planCanvas.height);
    tctx.drawImage(tmp, 0, 0, planCanvas.width, planCanvas.height);
    planTex.needsUpdate = true;

    const widthM = Math.max(4, Number(document.getElementById('planWidthInput')?.value) || 32);
    mountSitePlan({
      widthM,
      aspect: tmp.height / Math.max(1, tmp.width),
      label: `${titleBase} · p.${pageNum}`,
      isSample: false,
      resetBeds: true,
    });
    syncManu3D();
    announce(`Rendered ${titleBase} (p.${pageNum}) — drag Garden Bed Brush (G) or calibrate with 2-Pt Scale.`);
  }

  // ── REAL NEW ZEALAND LAND: LINZ 1 m LiDAR + PRIMARY PARCEL RIBBON + AUP + BUILDINGS ─
  const siteModal = document.getElementById('siteModal');
  wireDialogLightDismiss(siteModal);
  const siteModalMsg = document.getElementById('siteModalMsg');

  function clearLinzContext() {
    while (linzContextGroup.children.length) {
      const c = linzContextGroup.children.pop();
      if (c.geometry) c.geometry.dispose();
      if (c.material) {
        if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose());
        else c.material.dispose();
      }
    }
  }

  function addDrapedParcelRibbon(outlineGeoJson, e0, n0, groundFn) {
    if (!outlineGeoJson) return;
    const rings = [];
    if (outlineGeoJson.type === 'Polygon' && Array.isArray(outlineGeoJson.coordinates?.[0])) {
      rings.push(outlineGeoJson.coordinates[0]);
    } else if (outlineGeoJson.type === 'MultiPolygon' && Array.isArray(outlineGeoJson.coordinates)) {
      for (const poly of outlineGeoJson.coordinates) {
        if (Array.isArray(poly?.[0])) rings.push(poly[0]);
      }
    }

    const ribbonMat = new THREE.MeshBasicMaterial({
      color: 0xd9bacb,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    const lineMat = new THREE.LineBasicMaterial({ color: 0xf9f6f2 });

    for (const ring of rings) {
      if (ring.length < 4) continue;
      const pts = ring.map(([pLon, pLat]) => {
        const { e, n } = toNZTM(pLat, pLon);
        return [e - e0, -(n - n0)];
      });
      // Build subtle vertical parcel boundary ribbon (0.28 m high) draped onto LiDAR contours
      const pos = [];
      const idx = [];
      const linePts = [];
      for (let i = 0; i < pts.length; i++) {
        const [x, z] = pts[i];
        const y = groundFn(x, z);
        pos.push(x, y + 0.02, z, x, y + 0.30, z);
        linePts.push(new THREE.Vector3(x, y + 0.31, z));
      }
      for (let i = 0; i < pts.length - 1; i++) {
        const a = i * 2, b = (i + 1) * 2;
        idx.push(a, a + 1, b + 1, a, b + 1, b);
      }
      const rGeo = new THREE.BufferGeometry();
      rGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      rGeo.setIndex(idx);
      linzContextGroup.add(new THREE.Mesh(rGeo, ribbonMat.clone()));
      linzContextGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(linePts), lineMat.clone()));
    }
  }

  async function loadRealNzLand(lat, lon, label) {
    if (siteModalMsg) siteModalMsg.textContent = `Streaming Toitū Te Whenua LINZ 1 m LiDAR, Primary Parcel & buildings for ${label}…`;
    announce(`Loading LINZ 1 m LiDAR & parcel for ${label}…`);
    try {
      const radiusM = 40;
      const [groundRes, surfaceRes, siteApiRes, outlinesJson] = await Promise.all([
        readLayer('ground', { lat, lon, radius: radiusM }).catch(() => null),
        readLayer('surface', { lat, lon, radius: radiusM }).catch(() => null),
        fetch(`/api/live/?feeds=site,footprint&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
        fetch(outlinesUrl(lat, lon, 75)).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);

      clearLinzContext();
      const { e: e0, n: n0 } = toNZTM(lat, lon);
      let dem = null, dsm = null, baseElev = 0;
      let groundFn;

      if (groundRes?.status === 'live' && groundRes.values?.heights) {
        dem = unpackHeights(groundRes.values.heights);
        if (surfaceRes?.status === 'live' && surfaceRes.values?.heights) dsm = unpackHeights(surfaceRes.values.heights);
        const cH = heightAt(dem, e0, n0);
        baseElev = Number.isFinite(cH) ? cH : groundRes.value || 0;
        groundFn = (wx, wz) => {
          const h = heightAt(dem, e0 + wx, n0 - wz);
          return Number.isFinite(h) ? h - baseElev : 0;
        };
      } else {
        groundFn = (wx, wz) => Math.sin(wx * 0.06) * 0.85 - wz * 0.04;
      }

      rebuildTerrainGeometry(80, 80, 80, 80, groundFn);
      engine.resetSplatmap(true);

      // Parse LINZ Primary Parcel & AUP Planning facts from /api/live/?feeds=site
      const siteFacts = siteApiRes?.feeds?.site?.facts || null;
      const parcelFact = siteFacts?.parcel;
      const zoneFact = siteFacts?.zone;
      const overlaysFact = siteFacts?.overlays;
      const floodFact = siteFacts?.floodPlain;
      if (parcelFact?.values?.outline) {
        addDrapedParcelRibbon(parcelFact.values.outline, e0, n0, groundFn);
      }

      const roheInfo = inferRoheFromCoords(lat, lon);
      state.rohe = roheInfo.label;
      state.selectedCompositionId = roheInfo.compId;
      state.siteFactsSummary = {
        rohe: roheInfo.label,
        parcelM2: parcelFact?.values?.calcAreaM2 || null,
        zone: zoneFact?.value || null,
        overlayCount: typeof overlaysFact?.value === 'number' ? overlaysFact.value : null,
        floodNote: floodFact?.values?.insideMapped ? 'Mapped 1% AEP Flood Plain' : null,
        lidarLive: Boolean(dem),
      };

      // Extrude LINZ NZ Building Outlines onto the LiDAR slope
      const buildings = outlinesJson ? parseOutlines(outlinesJson) : [];
      const wallMat = new THREE.MeshStandardMaterial({ color: 0xebe5dc, roughness: 0.84 });
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x45474b, roughness: 0.52, metalness: 0.35 });
      let bestSpot = { x: 0, z: 5.5 }, closestD = Infinity;

      for (const b of buildings) {
        const ring = b.rings?.[0];
        if (!ring || ring.length < 4) continue;
        let cx = 0, cz = 0;
        const pts2d = ring.slice(0, -1).map(([be, bn]) => {
          const wx = be - e0, wz = -(bn - n0);
          cx += wx; cz += wz;
          return [wx, wz];
        });
        cx /= pts2d.length; cz /= pts2d.length;
        if (Math.hypot(cx, cz) > 39) continue;

        const gy = groundFn(cx, cz);
        let wallH = 4.6;
        if (dsm && dem) {
          const surfY = heightAt(dsm, e0 + cx, n0 - cz);
          const demY = heightAt(dem, e0 + cx, n0 - cz);
          if (Number.isFinite(surfY) && Number.isFinite(demY) && surfY - demY > 2.4) {
            wallH = Math.min(13.5, surfY - demY);
          }
        }

        const bShape = new THREE.Shape();
        bShape.moveTo(pts2d[0][0], -pts2d[0][1]);
        for (let i = 1; i < pts2d.length; i++) bShape.lineTo(pts2d[i][0], -pts2d[i][1]);
        bShape.closePath();

        const extGeo = new THREE.ExtrudeGeometry(bShape, { depth: wallH + 1.4, bevelEnabled: false });
        extGeo.rotateX(-Math.PI * 0.5);
        extGeo.translate(0, gy - 1.4, 0);
        const bMesh = new THREE.Mesh(extGeo, [roofMat, wallMat]);
        bMesh.castShadow = true;
        bMesh.receiveShadow = true;
        linzContextGroup.add(bMesh);

        const dCenter = Math.hypot(cx, cz);
        if (dCenter < closestD) {
          closestD = dCenter;
          bestSpot = { x: Math.max(-14, Math.min(14, cx + 8.0)), z: Math.max(-14, Math.min(14, cz + 6.8)) };
        }
      }

      setGroundModeUI('linz');
      state.siteLabel = label;
      updateNZSun(14.0);
      engine.rebuildBeds3D(state.tool === 'sculpt');
      engine.syncInstances();
      syncManu3D();
      setTool('garden_brush');
      renderCardsRail();
      updateInspectorAndStats();

      const focusY = groundFn(bestSpot.x, bestSpot.z);
      transitionCamera(
        new THREE.Vector3(bestSpot.x + 11.5, focusY + 10.5, bestSpot.z + 15.0),
        new THREE.Vector3(bestSpot.x, focusY + 0.8, bestSpot.z)
      );

      if (siteModal?.open) siteModal.close();
      if (siteModalMsg) siteModalMsg.textContent = '';
      announce(`${label} · LINZ 1 m LiDAR${state.siteFactsSummary.parcelM2 ? ` · ${state.siteFactsSummary.parcelM2} m² parcel` : ''} — drag Garden Bed Brush (G) onto the slope!`);
    } catch (err) {
      if (siteModalMsg) siteModalMsg.textContent = `Could not load site: ${err?.message || err}`;
      announce(`Could not load LINZ site: ${err?.message || err}`);
    }
  }

  // ── RAYCASTING & POINTER INTERACTIONS ──────────────────────────────────────
  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();
  const fallbackPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const fallbackVec = new THREE.Vector3();

  function raycastGround(ev) {
    const rect = canvas.getBoundingClientRect();
    pointerNdc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    pointerNdc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointerNdc, camera);
    const target = state.groundMode === 'photo' ? photoShadowPlane : terrainMesh;
    const hits = raycaster.intersectObject(target, false);
    if (hits.length) return hits[0].point;
    if (raycaster.ray.intersectPlane(fallbackPlane, fallbackVec)) return fallbackVec.clone();
    return null;
  }

  function raycastHandle(ev) {
    if (!engine.handleGroup.visible || !engine.handleGroup.children.length) return null;
    const rect = canvas.getBoundingClientRect();
    pointerNdc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    pointerNdc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointerNdc, camera);
    const hits = raycaster.intersectObjects(engine.handleGroup.children, false);
    return hits.length ? hits[0].object.userData : null;
  }

  function avoidSampleHouse(x, z) {
    return (
      state.groundMode === 'siteplan' &&
      state.planMeta.isSample &&
      state.showSampleMassing &&
      x > -7.7 && x < 3.7 && z > -6.4 && z < -1.0
    );
  }

  function applyActiveBrush(pt, altErase = false) {
    const comp = NZ_COMPOSITIONS.find((c) => c.id === state.selectedCompositionId) || NZ_COMPOSITIONS[0];
    if (state.tool === 'garden_brush') {
      engine.applyGardenBedStroke(pt.x, pt.z, state.brushRadius, {
        composition: comp,
        singleSpeciesId: state.tab === 'plants' ? state.selectedPlantId : null,
        densityMult: state.densityMult,
        clumping: state.clumping,
        erase: altErase,
        avoidFn: avoidSampleHouse,
      });
    } else if (state.tool === 'paint-mix') {
      engine.paintCompositionBrush(
        pt.x, pt.z, state.brushRadius, comp, state.densityMult, state.clumping,
        state.groundMode !== 'photo', avoidSampleHouse
      );
    } else if (state.tool === 'paint-plant') {
      engine.paintSpeciesBrush(
        pt.x, pt.z, state.brushRadius, state.selectedPlantId, state.densityMult,
        state.groundMode !== 'photo', avoidSampleHouse
      );
    } else if (state.tool === 'paint-surface') {
      engine.paintSurfaceDisc(pt.x, pt.z, state.brushRadius, state.selectedSurfaceChannel, 0.88, 0.6);
    } else if (state.tool === 'erase') {
      engine.erasePlantsInRadius(pt.x, pt.z, state.brushRadius, true);
    }
    syncManu3D();
    updateInspectorAndStats();
  }

  let activeStroke = null;
  let lastPaintPos = new THREE.Vector3(999, 0, 999);
  let lastStrokeMs = 0;

  canvas.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0 || state.tool === 'orbit') return;

    // 2-Point Site Plan Scale calibration
    if (state.twoPtCalib) {
      const pt = raycastGround(ev);
      if (!pt) return;
      if (state.twoPtCalib.step === 1) {
        state.twoPtCalib.p1 = pt.clone();
        state.twoPtCalib.step = 2;
        measureLine.visible = true;
        measurePositions.set([pt.x, 0.08, pt.z, pt.x, 0.08, pt.z]);
        measureGeo.attributes.position.needsUpdate = true;
        announce('Point 1 set — click the second end of the known boundary or wall dimension.');
        return;
      }
      const distCur = Math.hypot(pt.x - state.twoPtCalib.p1.x, pt.z - state.twoPtCalib.p1.z);
      measureLine.visible = false;
      document.getElementById('twoPtScaleBtn')?.setAttribute('aria-pressed', 'false');
      state.twoPtCalib = null;
      if (distCur > 0.05) {
        const ans = window.prompt('Enter real-world length between those two points (metres):', distCur.toFixed(1));
        const realM = Number(ans);
        if (Number.isFinite(realM) && realM > 0.2) {
          const factor = realM / distCur;
          const newWidthM = Math.max(4, Math.min(350, state.planMeta.widthM * factor));
          mountSitePlan({ ...state.planMeta, widthM: newWidthM, resetBeds: false });
          announce(`Calibrated site plan width to ${newWidthM.toFixed(1)} m (1:1 metres).`);
        }
      }
      return;
    }

    // Spline bed vertex handle drag (always grab-ready when handles are visible!)
    const handleHit = raycastHandle(ev);
    if (handleHit?.isSplineHandle) {
      engine.pushUndoState();
      engine.activeBedId = handleHit.bedId;
      controls.enabled = false;
      canvas.setPointerCapture(ev.pointerId);
      activeStroke = { kind: 'handle', bedId: handleHit.bedId, pointIndex: handleHit.pointIndex };
      return;
    }

    const pt = raycastGround(ev);
    if (!pt) return;

    if (state.tool === 'draw-bed') {
      state.drawPoints.push({ x: pt.x, z: pt.z });
      rebuildDrawPreview(pt);
      return;
    }

    if (state.tool === 'measure') {
      controls.enabled = false;
      canvas.setPointerCapture(ev.pointerId);
      measureLine.visible = true;
      activeStroke = { kind: 'measure', start: pt.clone() };
      measurePositions.set([pt.x, pt.y + 0.08, pt.z, pt.x, pt.y + 0.08, pt.z]);
      measureGeo.attributes.position.needsUpdate = true;
      return;
    }

    if (state.tool === 'sculpt') return;

    engine.pushUndoState();
    controls.enabled = false;
    canvas.setPointerCapture(ev.pointerId);
    activeStroke = { kind: 'brush', erase: ev.altKey };
    lastPaintPos.copy(pt);
    lastStrokeMs = performance.now();
    applyActiveBrush(pt, ev.altKey);
  });

  canvas.addEventListener('pointermove', (ev) => {
    const pt = raycastGround(ev);
    if (pt) {
      updateBrushRing(pt.x, pt.z);
      if (state.tool === 'draw-bed' && state.drawPoints.length > 0) rebuildDrawPreview(pt);
      if (state.twoPtCalib?.step === 2 && state.twoPtCalib.p1) {
        const s = state.twoPtCalib.p1;
        measurePositions.set([s.x, 0.08, s.z, pt.x, 0.08, pt.z]);
        measureGeo.attributes.position.needsUpdate = true;
      }
    }
    if (!activeStroke || !pt) return;

    if (activeStroke.kind === 'handle') {
      const bed = engine.splineBeds.find((b) => b.id === activeStroke.bedId);
      if (!bed) return;
      bed.points[activeStroke.pointIndex] = [+pt.x.toFixed(2), +pt.z.toFixed(2)];
      engine.rebuildBeds3D(state.tool === 'sculpt');
      engine.syncInstances();
      syncManu3D();
      updateInspectorAndStats();
      return;
    }

    if (activeStroke.kind === 'measure') {
      const s = activeStroke.start;
      measurePositions.set([s.x, s.y + 0.08, s.z, pt.x, pt.y + 0.08, pt.z]);
      measureGeo.attributes.position.needsUpdate = true;
      const horiz = Math.hypot(pt.x - s.x, pt.z - s.z);
      const dy = pt.y - s.y;
      const slopePct = horiz > 0.05 ? Math.abs((dy / horiz) * 100) : 0;
      const ratio = Math.abs(dy) > 0.02 ? `1:${(horiz / Math.abs(dy)).toFixed(1)}` : 'Level';
      if (hudChip) {
        hudChip.textContent = `Measured: ${horiz.toFixed(2)} m · Δz ${dy >= 0 ? '+' : ''}${dy.toFixed(2)} m · Grade ${slopePct.toFixed(1)}% (${ratio})`;
      }
      return;
    }

    const now = performance.now();
    if (now - lastStrokeMs < 38) return;
    const step = state.tool === 'paint-surface' ? state.brushRadius * 0.22 : state.brushRadius * 0.34;
    if (pt.distanceTo(lastPaintPos) >= step) {
      lastStrokeMs = now;
      lastPaintPos.copy(pt);
      applyActiveBrush(pt, activeStroke.erase || ev.altKey);
    }
  });

  const endStroke = () => {
    if (activeStroke) {
      activeStroke = null;
      controls.enabled = true;
    }
  };
  canvas.addEventListener('pointerup', endStroke);
  canvas.addEventListener('pointercancel', endStroke);

  canvas.addEventListener('dblclick', () => {
    if (state.tool === 'draw-bed' && state.drawPoints.length >= 3) {
      finishDrawingBed();
    }
  });

  // Drag-and-drop any PDF site plan or image / backyard photo right onto the canvas!
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    if (f && (/\.pdf$/i.test(f.name) || f.type.startsWith('image/'))) {
      void handleUploadedPlanFile(f);
    }
  });

  // ── UI TOOLS, TABS & PALETTE RAIL ──────────────────────────────────────────
  function setTool(toolId) {
    state.tool = toolId;
    if (toolId !== 'draw-bed') {
      state.drawPoints = [];
      rebuildDrawPreview(null);
    }
    const isOrbit = toolId === 'orbit';
    controls.mouseButtons.LEFT = isOrbit ? THREE.MOUSE.ROTATE : null;
    canvas.classList.toggle('is-orbit', isOrbit);
    canvas.classList.toggle('is-sculpt', toolId === 'sculpt');
    measureLine.visible = false;
    if (!['garden_brush', 'paint-mix', 'paint-plant', 'paint-surface', 'erase', 'draw-bed'].includes(toolId)) {
      brushRing.visible = false;
    }
    document.querySelectorAll('[data-tool]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.tool === toolId));
    });
    document.getElementById('drawHint')?.classList.toggle('hidden', toolId !== 'draw-bed');

    if (toolId === 'paint-mix' || toolId === 'draw-bed') setTab('compositions');
    if (toolId === 'paint-plant') setTab('plants');
    if (toolId === 'paint-surface') setTab('surfaces');
    engine.rebuildBeds3D(toolId === 'sculpt');
  }

  function setTab(tabId) {
    state.tab = tabId;
    document.querySelectorAll('[data-tab]').forEach((t) => {
      const on = t.dataset.tab === tabId;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    document.getElementById('plantCatRow')?.classList.toggle('hidden', tabId !== 'plants');
    renderCardsRail();
  }

  function renderCardsRail() {
    const rail = document.getElementById('paletteRail');
    if (!rail) return;

    if (state.tab === 'compositions') {
      rail.innerHTML = NZ_COMPOSITIONS.map((c) => {
        const on = c.id === state.selectedCompositionId;
        return `
          <button type="button" class="ls-card" data-comp="${c.id}" aria-pressed="${on}">
            <div class="ls-spectrum" aria-hidden="true">
              ${c.swatches.map((hex) => `<span style="background:${hex}"></span>`).join('')}
            </div>
            <div class="ls-card-title">${c.title}</div>
            <div class="ls-card-sub">${c.subtitle}</div>
            <div class="ls-card-meta">
              <span>${c.mix.length} natives · ${c.density}/m²</span>
              ${on ? '<span class="ls-fill-chip" data-fill-comp="1">↻ Fill Bed</span>' : '<span>Select</span>'}
            </div>
          </button>`;
      }).join('');

      rail.querySelectorAll('[data-comp]').forEach((card) => {
        card.addEventListener('click', (e) => {
          const cid = card.dataset.comp;
          const clickedFill = Boolean(e.target.closest('[data-fill-comp]'));
          state.selectedCompositionId = cid;
          if (!['garden_brush', 'paint-mix', 'draw-bed'].includes(state.tool)) {
            setTool(state.groundMode === 'studio' ? 'paint-mix' : 'garden_brush');
          }
          const comp = NZ_COMPOSITIONS.find((x) => x.id === cid);
          if (clickedFill && comp) {
            engine.pushUndoState();
            const beds = engine.getAllBeds();
            for (const b of beds) engine.regenerateBed(b.id, comp, state.densityMult, state.clumping);
            syncManu3D();
            updateInspectorAndStats();
            announce(`Filled ${beds.length} bed(s) with ${comp.title}.`);
          }
          renderCardsRail();
        });
      });
    } else if (state.tab === 'plants') {
      const list = state.plantCat === 'all'
        ? NZ_SPECIES
        : NZ_SPECIES.filter((p) => p.category === state.plantCat);
      rail.innerHTML = list.map((p) => {
        const on = p.id === state.selectedPlantId;
        const bloomStr = p.bloomStart < 12.2
          ? `${NZ_MONTHS[Math.floor(p.bloomStart) % 12]}–${NZ_MONTHS[Math.floor(p.bloomEnd) % 12]}`
          : p.tier === 'stone' ? 'Habitat Stone' : 'Evergreen';
        return `
          <button type="button" class="ls-card" data-sp="${p.id}" aria-pressed="${on}">
            <div class="ls-spectrum" aria-hidden="true">
              <span style="background:${p.swatch};flex:3"></span>
              <span style="background:${p.foliageColor};flex:2"></span>
              <span style="background:${p.flowerColor};flex:2"></span>
            </div>
            <div class="ls-card-title">${p.maori}</div>
            <div class="ls-card-sub"><em>${p.botanical}</em> · ${p.nursery}</div>
            <div class="ls-card-meta">
              <span>${bloomStr}</span>
              <span>${p.grade} · $${p.rateNzd}</span>
            </div>
          </button>`;
      }).join('');

      rail.querySelectorAll('[data-sp]').forEach((card) => {
        card.addEventListener('click', () => {
          state.selectedPlantId = card.dataset.sp;
          if (state.tool !== 'garden_brush' && state.tool !== 'paint-plant') setTool('paint-plant');
          renderCardsRail();
        });
      });
    } else {
      rail.innerHTML = NZ_SURFACES.map((s) => {
        const on = s.channel === state.selectedSurfaceChannel;
        return `
          <button type="button" class="ls-card" data-surf="${s.channel}" aria-pressed="${on}">
            <div class="ls-surface-bar" style="background:${s.swatch}"></div>
            <div class="ls-card-title">${s.name}</div>
            <div class="ls-card-sub">${s.spec}</div>
            <div class="ls-card-meta">
              <span>${s.brand}</span>
              <span>~$${s.pricePerM2}/m²</span>
            </div>
          </button>`;
      }).join('');

      rail.querySelectorAll('[data-surf]').forEach((card) => {
        card.addEventListener('click', () => {
          state.selectedSurfaceChannel = Number(card.dataset.surf);
          setTool('paint-surface');
          renderCardsRail();
        });
      });
    }
  }

  // ── INSPECTOR, SCHEDULE, ECOLOGY & OS POSTMESSAGE BRIDGE ───────────────────
  const bedSelect = document.getElementById('bedSelect');
  const edgingSelect = document.getElementById('edgingSelect');
  const mulchSelect = document.getElementById('mulchSelect');

  if (edgingSelect) {
    edgingSelect.innerHTML = NZ_EDGINGS.map((e) =>
      `<option value="${e.id}">${e.label}${e.ratePerM ? ` (~$${e.ratePerM}/m)` : ''}</option>`
    ).join('');
  }
  if (mulchSelect) {
    mulchSelect.innerHTML = Object.values(MULCH_STYLES).map((m) =>
      `<option value="${m.id}">${m.label}</option>`
    ).join('');
  }

  function updateInspectorAndStats() {
    const allBeds = engine.getAllBeds();
    const activeBed = allBeds.find((b) => b.id === engine.activeBedId) || allBeds[0];
    if (bedSelect) {
      bedSelect.innerHTML = allBeds.length
        ? allBeds.map((b) => `<option value="${b.id}"${b.id === activeBed?.id ? ' selected' : ''}>${b.name}</option>`).join('')
        : '<option value="">Open Site Canvas</option>';
    }
    if (activeBed) {
      if (edgingSelect) edgingSelect.value = activeBed.edging;
      if (mulchSelect) mulchSelect.value = activeBed.mulch;
    }

    const surfaceAreas = state.groundMode === 'photo' ? null : engine.getSurfaceAreasM2();
    const sched = buildPlantingSchedule(allBeds, engine.plants, surfaceAreas);
    const eco = computeEcologyMetrics(allBeds, engine.plants);
    const totalPerim = allBeds.reduce((s, b) => s + polygonPerimeterM(engine.cachedPolys.get(b.id) ?? b.points), 0);

    document.getElementById('statArea').textContent = `${sched.totalAreaM2.toFixed(1)} m²`;
    document.getElementById('statPerim').textContent = `${totalPerim.toFixed(1)} m`;
    document.getElementById('statPlants').textContent = String(sched.totalPlants);
    document.getElementById('schedDensity').textContent = `${sched.densityPerM2} / m²`;
    document.getElementById('statTotalNzd').textContent = `$${sched.totalNzd.toLocaleString('en-NZ')} NZD`;

    const pillArea = document.getElementById('dockStatArea');
    const pillPlants = document.getElementById('dockStatPlants');
    const pillCost = document.getElementById('dockStatCost');
    if (pillArea) pillArea.textContent = `${sched.totalAreaM2.toFixed(1)} m²`;
    if (pillPlants) pillPlants.textContent = `${sched.totalPlants} plants`;
    if (pillCost) pillCost.textContent = `$${sched.totalNzd.toLocaleString('en-NZ')} NZD`;

    document.getElementById('ecoTui').textContent = `${eco.tuiAttractionPct}%`;
    document.getElementById('ecoTuiBar').style.width = `${eco.tuiAttractionPct}%`;
    const kCombo = Math.min(100, Math.round(eco.kereruAttractionPct * 0.6 + eco.skinkHabitatPct * 0.4));
    document.getElementById('ecoKereru').textContent = `${kCombo}%`;
    document.getElementById('ecoKereruBar').style.width = `${kCombo}%`;
    document.getElementById('ecoStorm').textContent = `${eco.stormwaterLitresHr.toLocaleString('en-NZ')} L/hr`;

    // Live LINZ Parcel / AUP Site Facts Card (shown when Real NZ Land is loaded)
    const factsCard = document.getElementById('siteFactsCard');
    if (factsCard) {
      if (state.siteFactsSummary) {
        const f = state.siteFactsSummary;
        factsCard.hidden = false;
        factsCard.innerHTML = `
          <div class="ls-eco-row"><span>Rohe</span><strong>${f.rohe}</strong></div>
          ${f.parcelM2 ? `<div class="ls-eco-row"><span>LINZ Primary Parcel</span><strong>${f.parcelM2.toLocaleString('en-NZ')} m²</strong></div>` : ''}
          ${f.zone ? `<div class="ls-eco-row"><span>AUP Base Zone</span><strong>${f.zone}</strong></div>` : ''}
          ${f.overlayCount != null ? `<div class="ls-eco-row"><span>AUP Overlays</span><strong>${f.overlayCount} hit(s)</strong></div>` : ''}
          ${f.floodNote ? `<div class="ls-eco-row"><span>Hazard Note</span><strong>${f.floodNote}</strong></div>` : ''}
        `;
      } else {
        factsCard.hidden = true;
      }
    }

    const listEl = document.getElementById('schedList');
    if (listEl) {
      if (!sched.rows.length && !(sched.surfaceRows && sched.surfaceRows.length)) {
        listEl.innerHTML = '<li style="font-size:12px;color:#654a4e;padding:8px 2px">Drag Garden Bed Brush (G) or Paint Mix (B) to populate your NZ supplier schedule.</li>';
      } else {
        const plantHtml = sched.rows.map((r) => `
          <li class="ls-sched-item">
            <span class="ls-dot" style="background:${r.swatch}"></span>
            <div>
              <span class="ls-sp-name">${r.maori}</span>
              <span class="ls-sp-bot">${r.botanical} · ${r.grade} · ${r.nursery}</span>
            </div>
            <div class="ls-sp-qty">${r.qty}×<br/><span style="color:#654a4e">$${r.subtotalNzd.toLocaleString('en-NZ')}</span></div>
          </li>`).join('');
        const surfHtml = (sched.surfaceRows || []).map((sr) => `
          <li class="ls-sched-item">
            <span class="ls-dot" style="background:${sr.swatch}"></span>
            <div>
              <span class="ls-sp-name">${sr.name}</span>
              <span class="ls-sp-bot">${sr.brand} · $${sr.rateNzd}/m²</span>
            </div>
            <div class="ls-sp-qty">${sr.areaM2} m²<br/><span style="color:#654a4e">$${sr.subtotalNzd.toLocaleString('en-NZ')}</span></div>
          </li>`).join('');
        listEl.innerHTML = plantHtml + surfHtml;
      }
    }

    document.getElementById('undoBtn')?.setAttribute('aria-disabled', String(engine.undoStack.length === 0));
    document.getElementById('redoBtn')?.setAttribute('aria-disabled', String(engine.redoStack.length === 0));

    // OS Embed postMessage telemetry bridge
    if (isOsEmbed && window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'assembl:planting-stats',
        project: embedProject || state.siteLabel,
        rohe: state.rohe,
        bedCount: sched.bedCount,
        totalAreaM2: sched.totalAreaM2,
        totalPlants: sched.totalPlants,
        totalNzd: sched.totalNzd,
        ecology: eco,
      }, '*');
    }
  }

  // ── CAMERA TRANSITIONS ─────────────────────────────────────────────────────
  let camAnim = null;
  const saved3DCam = { pos: new THREE.Vector3(11.8, 9.0, 12.6), target: new THREE.Vector3(0, 0.6, 0) };
  function transitionCamera(toPos, toTarget) {
    camAnim = {
      startPos: camera.position.clone(),
      startTarget: controls.target.clone(),
      endPos: toPos.clone(),
      endTarget: toTarget.clone(),
      t: 0,
    };
  }

  // ── BIND ALL UI CONTROLS ───────────────────────────────────────────────────
  document.querySelectorAll('[data-tool]').forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool)));
  document.querySelectorAll('[data-tab]').forEach((t) => {
    t.addEventListener('click', () => {
      setTab(t.dataset.tab);
      if (t.dataset.tab === 'compositions' && !['garden_brush', 'draw-bed'].includes(state.tool)) setTool('paint-mix');
      if (t.dataset.tab === 'plants' && state.tool !== 'garden_brush') setTool('paint-plant');
      if (t.dataset.tab === 'surfaces') setTool('paint-surface');
    });
  });
  document.querySelectorAll('.ls-cat-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.plantCat = btn.dataset.cat;
      document.querySelectorAll('.ls-cat-pill').forEach((x) => x.classList.toggle('is-active', x === btn));
      renderCardsRail();
    });
  });

  // Ground modes
  document.getElementById('modeStudioBtn')?.addEventListener('click', enterStudioMode);
  document.getElementById('modeSitePlanBtn')?.addEventListener('click', enterSampleSitePlanMode);
  document.getElementById('modePhotoBtn')?.addEventListener('click', () => enterPhotoBackdropMode());
  document.getElementById('modeLinzBtn')?.addEventListener('click', () => siteModal?.showModal());

  // Solar time slider (06:30–20:30)
  const sunSlider = document.getElementById('sunSlider');
  if (sunSlider) {
    syncSliderFill(sunSlider);
    sunSlider.addEventListener('input', () => {
      syncSliderFill(sunSlider);
      updateNZSun(parseFloat(sunSlider.value));
    });
  }

  // Smooth Seasonal Timeline (J–D) + Play animation
  const seasonSlider = document.getElementById('seasonSlider');
  const seasonOut = document.getElementById('seasonOut');
  function updateSeason(val) {
    const m = ((val % 12) + 12) % 12;
    sharedUniforms.uMonth.value = m;
    const idx = Math.floor(m);
    const frac = m - idx;
    const prefix = frac < 0.33 ? 'Early' : frac < 0.67 ? 'Mid' : 'Late';
    if (seasonOut) seasonOut.textContent = `${prefix}-${NZ_MONTHS[idx]} · ${NZ_SEASONS[idx].split(' · ')[0]}`;
    if (seasonSlider) syncSliderFill(seasonSlider);
  }
  if (seasonSlider) {
    seasonSlider.addEventListener('input', () => updateSeason(parseFloat(seasonSlider.value)));
    updateSeason(parseFloat(seasonSlider.value));
  }

  const btnPlaySeason = document.getElementById('btnPlaySeason');
  btnPlaySeason?.addEventListener('click', () => {
    state.playingSeason = !state.playingSeason;
    btnPlaySeason.setAttribute('aria-pressed', String(state.playingSeason));
    btnPlaySeason.textContent = state.playingSeason ? '❚❚' : '▶';
  });

  // Multi-Year Maturity Projection (Yr 1 / 4 / 7 / 12)
  document.querySelectorAll('.ls-yr-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ls-yr-btn').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      sharedUniforms.uYear.value = parseFloat(btn.dataset.year);
      syncManu3D();
    });
  });

  // 2D Plan / 3D toggle
  document.getElementById('topViewBtn')?.addEventListener('click', (e) => {
    state.isPlanView = !state.isPlanView;
    e.currentTarget.setAttribute('aria-pressed', String(state.isPlanView));
    if (state.isPlanView) {
      saved3DCam.pos.copy(camera.position);
      saved3DCam.target.copy(controls.target);
      transitionCamera(new THREE.Vector3(controls.target.x, 24.0, controls.target.z + 0.15), controls.target.clone());
    } else {
      transitionCamera(saved3DCam.pos, saved3DCam.target);
    }
  });

  // Inspector drawer toggle
  const inspectorPane = document.getElementById('inspectorPane');
  const inspectorToggleBtn = document.getElementById('inspectorToggleBtn');
  const setInspectorOpen = (open) => {
    inspectorPane.hidden = !open;
    document.body.classList.toggle('has-inspector', open);
    inspectorToggleBtn?.setAttribute('aria-pressed', String(open));
  };
  inspectorToggleBtn?.addEventListener('click', () => setInspectorOpen(inspectorPane.hidden));
  document.getElementById('inspCloseBtn')?.addEventListener('click', () => setInspectorOpen(false));
  if (window.innerWidth < 960) setInspectorOpen(false);

  // Brush Radius / Density / Oudolf Clumping sliders
  const bindSlider = (id, outId, fmt, fn) => {
    const el = document.getElementById(id);
    const out = document.getElementById(outId);
    if (!el) return;
    syncSliderFill(el);
    el.addEventListener('input', () => {
      const v = parseFloat(el.value);
      syncSliderFill(el);
      if (out) out.textContent = fmt(v);
      fn(v);
    });
  };
  bindSlider('brushRange', 'brushOut', (v) => `${v.toFixed(1)} m`, (v) => { state.brushRadius = v; });
  bindSlider('densityRange', 'densityOut', (v) => `${v.toFixed(1)}×`, (v) => { state.densityMult = v; });
  bindSlider('clumpRange', 'clumpOut', (v) => `${Math.round(v * 100)}%`, (v) => { state.clumping = v; });

  // Active Bed / Edging / Mulch / Toggles
  bedSelect?.addEventListener('change', () => {
    engine.activeBedId = bedSelect.value;
    engine.rebuildBeds3D(state.tool === 'sculpt');
    updateInspectorAndStats();
  });
  edgingSelect?.addEventListener('change', () => {
    state.selectedEdgingId = edgingSelect.value;
    engine.brushedEdging = edgingSelect.value;
    for (const b of engine.brushedBeds) b.edging = edgingSelect.value;
    const sb = engine.splineBeds.find((x) => x.id === engine.activeBedId);
    if (sb) sb.edging = edgingSelect.value;
    engine.rebuildBeds3D(state.tool === 'sculpt');
    updateInspectorAndStats();
  });
  mulchSelect?.addEventListener('change', () => {
    state.selectedMulchId = mulchSelect.value;
    engine.brushedMulch = mulchSelect.value;
    for (const b of engine.brushedBeds) b.mulch = mulchSelect.value;
    const sb = engine.splineBeds.find((x) => x.id === engine.activeBedId);
    if (sb) sb.mulch = mulchSelect.value;
    engine.rebuildBeds3D(state.tool === 'sculpt');
    updateInspectorAndStats();
  });

  document.getElementById('windToggle')?.addEventListener('change', (e) => {
    state.windOn = e.currentTarget.checked;
    sharedUniforms.uWindStrength.value = state.windOn ? 0.85 : 0.0;
  });
  document.getElementById('handlesToggle')?.addEventListener('change', (e) => {
    state.handlesVisible = e.currentTarget.checked;
    engine.handleGroup.visible = state.handlesVisible;
  });
  document.getElementById('uplightsToggle')?.addEventListener('change', (e) => {
    state.uplightsOn = e.currentTarget.checked;
    engine.uplightsOn = state.uplightsOn;
    engine.rebuildBeds3D(state.tool === 'sculpt');
  });
  document.getElementById('manuToggle')?.addEventListener('change', (e) => {
    state.manuOn = e.currentTarget.checked;
    syncManu3D();
  });

  document.getElementById('regenBedBtn')?.addEventListener('click', () => {
    if (!engine.getAllBeds().length) return;
    engine.pushUndoState();
    const comp = NZ_COMPOSITIONS.find((c) => c.id === state.selectedCompositionId) || NZ_COMPOSITIONS[0];
    engine.regenerateBed(engine.activeBedId, comp, state.densityMult, state.clumping);
    syncManu3D();
    updateInspectorAndStats();
  });
  document.getElementById('reshuffleBtn')?.addEventListener('click', () => {
    const beds = engine.getAllBeds();
    if (!beds.length) return;
    engine.pushUndoState();
    const active = beds.find((b) => b.id === engine.activeBedId) || beds[0];
    const comp = NZ_COMPOSITIONS.find((c) => c.id === active.compositionId) || NZ_COMPOSITIONS[0];
    engine.regenerateBed(active.id, comp, state.densityMult, state.clumping);
    syncManu3D();
    updateInspectorAndStats();
  });
  document.getElementById('clearBedBtn')?.addEventListener('click', () => {
    engine.clearAll(false);
    syncManu3D();
    updateInspectorAndStats();
    announce('Cleared canvas — use Garden Bed Brush (G), Draw Bed (D), or Paint Mix (B).');
  });

  const addNewSplineBed = () => {
    engine.pushUndoState();
    const idx = engine.splineBeds.length + 1;
    const ox = ((idx % 3) - 1) * 4.5;
    const oz = (idx % 2 === 0 ? -1 : 1) * 4.6;
    const pts = [
      [-2.4 + ox, 1.1 + oz], [0.0 + ox, 1.6 + oz], [2.5 + ox, 1.0 + oz],
      [2.2 + ox, -1.1 + oz], [-0.1 + ox, -1.4 + oz], [-2.5 + ox, -0.8 + oz],
    ];
    const comp = NZ_COMPOSITIONS.find((c) => c.id === state.selectedCompositionId) || NZ_COMPOSITIONS[0];
    engine.createSplineBed(pts, comp, {
      edging: state.selectedEdgingId,
      mulch: state.selectedMulchId,
      densityMult: state.densityMult,
      clumping: state.clumping,
    });
    syncManu3D();
    updateInspectorAndStats();
  };
  document.getElementById('addBedBtn')?.addEventListener('click', addNewSplineBed);
  document.getElementById('inspAddBedBtn')?.addEventListener('click', addNewSplineBed);

  document.getElementById('undoBtn')?.addEventListener('click', () => {
    if (engine.undo()) { syncManu3D(); updateInspectorAndStats(); }
  });
  document.getElementById('redoBtn')?.addEventListener('click', () => {
    if (engine.redo()) { syncManu3D(); updateInspectorAndStats(); }
  });

  // Site Plan Strip controls
  document.getElementById('planFileInput')?.addEventListener('change', (e) => {
    const f = e.currentTarget.files?.[0];
    if (f) void handleUploadedPlanFile(f);
  });
  pdfPageSelect?.addEventListener('change', () => {
    void renderPdfSitePlanPage(Number(pdfPageSelect.value) || 1, state.siteLabel.split(' · ')[0]);
  });
  document.getElementById('planWidthInput')?.addEventListener('change', (e) => {
    const w = Math.max(4, Math.min(350, Number(e.currentTarget.value) || 28));
    mountSitePlan({ ...state.planMeta, widthM: w, resetBeds: false });
  });
  document.getElementById('twoPtScaleBtn')?.addEventListener('click', (e) => {
    state.twoPtCalib = state.twoPtCalib ? null : { step: 1, p1: null };
    e.currentTarget.setAttribute('aria-pressed', String(Boolean(state.twoPtCalib)));
    if (state.twoPtCalib) announce('2-Point Scale: click the start of any known dimension on the plan.');
  });
  document.getElementById('planMassingBtn')?.addEventListener('click', (e) => {
    state.showSampleMassing = !state.showSampleMassing;
    e.currentTarget.setAttribute('aria-pressed', String(state.showSampleMassing));
    sampleMassingGroup.visible = state.groundMode === 'siteplan' && state.planMeta.isSample && state.showSampleMassing;
  });
  document.getElementById('samplePlanBtn')?.addEventListener('click', enterSampleSitePlanMode);

  // Photo Backdrop Strip controls
  document.getElementById('photoFileInput')?.addEventListener('change', (e) => {
    const f = e.currentTarget.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => enterPhotoBackdropMode(String(reader.result), `${f.name} (Photo)`);
    reader.readAsDataURL(f);
  });
  bindSlider('photoHorizonRange', 'photoHorizonOut', (v) => `${Math.round(v)}%`, (v) => {
    state.photoSettings.horizonPct = v;
    applyPhotoCameraCalibration();
  });
  bindSlider('photoTiltRange', 'photoTiltOut', (v) => `${Math.round(v)}°`, (v) => {
    state.photoSettings.tiltDeg = v;
    applyPhotoCameraCalibration();
  });
  bindSlider('photoScaleRange', 'photoScaleOut', (v) => `${v.toFixed(2)}×`, (v) => {
    state.photoSettings.scaleMult = v;
    applyPhotoCameraCalibration();
  });
  document.getElementById('samplePhotoBtn')?.addEventListener('click', () => {
    enterPhotoBackdropMode(buildSampleBackyardPhotoDataUrl(), 'Coastal Backyard Sample Photo');
  });

  // LINZ Address Search & Benchmark Presets
  const addrInput = document.getElementById('addrInput');
  const addrResults = document.getElementById('addrResults');
  let addrTimer = 0;
  let addrAbort = null;
  addrInput?.addEventListener('input', () => {
    clearTimeout(addrTimer);
    const q = addrInput.value.trim();
    if (q.length < 4) { if (addrResults) addrResults.innerHTML = ''; return; }
    addrTimer = window.setTimeout(async () => {
      addrAbort?.abort();
      addrAbort = new AbortController();
      try {
        const { matches } = await askAddress(q, addrAbort.signal);
        if (!addrResults) return;
        addrResults.innerHTML = matches.map((m) =>
          `<li><button type="button" class="ls-addr-btn" data-lat="${m.lat}" data-lon="${m.lon}" data-label="${m.address.replace(/"/g, '&quot;')}"><strong>${m.address}</strong>${m.suburb || m.town ? ` · <span style="color:#654a4e">${[m.suburb, m.town].filter(Boolean).join(', ')}</span>` : ''}</button></li>`
        ).join('');
        addrResults.querySelectorAll('[data-lat]').forEach((b) => {
          b.addEventListener('click', () => void loadRealNzLand(Number(b.dataset.lat), Number(b.dataset.lon), b.dataset.label));
        });
      } catch (err) {
        if (err?.name !== 'AbortError' && siteModalMsg) {
          siteModalMsg.textContent = err.message || 'Address search unavailable — choose a benchmark NZ site below.';
        }
      }
    }, 240);
  });
  siteModal?.querySelectorAll('[data-preset-lat]').forEach((btn) => {
    btn.addEventListener('click', () => void loadRealNzLand(
      Number(btn.dataset.presetLat),
      Number(btn.dataset.presetLon),
      btn.dataset.presetName
    ));
  });

  // Exports: L101 A3 Vector SVG, CSV Schedule, 3D .glb
  function triggerDownload(filename, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  document.getElementById('exportSvgBtn')?.addEventListener('click', () => {
    const beds = engine.getAllBeds();
    const sched = buildPlantingSchedule(beds, engine.plants, state.groundMode === 'photo' ? null : engine.getSurfaceAreasM2());
    const svg = exportPlantingPlanSVG({ beds, plants: engine.plants, schedule: sched, siteLabel: state.siteLabel });
    triggerDownload('L101-nz-native-planting-plan.svg', new Blob([svg], { type: 'image/svg+xml' }));
    announce('Downloaded scaled A3 L101 vector planting plan SVG.');
  });

  document.getElementById('exportCsvBtn')?.addEventListener('click', () => {
    const sched = buildPlantingSchedule(engine.getAllBeds(), engine.plants, state.groundMode === 'photo' ? null : engine.getSurfaceAreasM2());
    const csv = exportPlantingCSV(sched, state.siteLabel);
    triggerDownload('nz-native-nursery-schedule.csv', new Blob([csv], { type: 'text/csv' }));
    announce('Downloaded NZ nursery & supplier CSV schedule.');
  });

  document.getElementById('exportGlbBtn')?.addEventListener('click', () => {
    announce('Exporting 3D .glb landscape model…');
    const exportRoot = new THREE.Group();
    exportRoot.add(engine.bedsGroup.clone(true));
    // Convert active WebGPU NodeMaterial instanced species into clean standard-material meshes for universal GLB export
    const m4 = new THREE.Matrix4();
    for (const [, pool] of engine.speciesMeshes.entries()) {
      if (pool.mesh.count <= 0) continue;
      const stdMat = new THREE.MeshStandardMaterial({
        color: pool.plant.foliageHex || 0x4f6e39,
        roughness: 0.7,
        side: THREE.DoubleSide,
      });
      const inst = new THREE.InstancedMesh(pool.mesh.geometry.clone(), stdMat, pool.mesh.count);
      for (let i = 0; i < pool.mesh.count; i++) {
        pool.mesh.getMatrixAt(i, m4);
        inst.setMatrixAt(i, m4);
      }
      inst.name = pool.plant.id;
      exportRoot.add(inst);
    }
    new GLTFExporter().parse(
      exportRoot,
      (res) => {
        const blob = res instanceof ArrayBuffer
          ? new Blob([res], { type: 'model/gltf-binary' })
          : new Blob([JSON.stringify(res)], { type: 'model/gltf+json' });
        triggerDownload('nz-native-landscape-3d.glb', blob);
        announce('Downloaded 3D .glb landscape model.');
      },
      () => announce('3D .glb export failed.'),
      { binary: true }
    );
  });

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName ?? '')) return;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey ? engine.redo() : engine.undo()) { syncManu3D(); updateInspectorAndStats(); }
      return;
    }
    const k = e.key.toLowerCase();
    if (k === 'g' || k === '1') setTool('garden_brush');
    else if (k === 'b' || k === '2') setTool('paint-mix');
    else if (k === 'p' || k === '3') setTool('paint-plant');
    else if (k === 'd' || k === '4') setTool('draw-bed');
    else if (k === 'v' || k === '5') setTool('sculpt');
    else if (k === 's' || k === '6') setTool('paint-surface');
    else if (k === 'e' || k === '7') setTool('erase');
    else if (k === 'm' || k === '8') setTool('measure');
    else if (k === 'o' || k === '9') setTool('orbit');
    else if (e.key === 'Enter' && state.tool === 'draw-bed') finishDrawingBed();
    else if (e.key === 'Escape' && state.tool === 'draw-bed') { state.drawPoints = []; rebuildDrawPreview(null); }
    else if (e.key === '[') {
      state.brushRadius = Math.max(0.6, +(state.brushRadius - 0.3).toFixed(1));
      const r = document.getElementById('brushRange');
      if (r) { r.value = String(state.brushRadius); syncSliderFill(r); }
      const o = document.getElementById('brushOut');
      if (o) o.textContent = `${state.brushRadius.toFixed(1)} m`;
    } else if (e.key === ']') {
      state.brushRadius = Math.min(5.5, +(state.brushRadius + 0.3).toFixed(1));
      const r = document.getElementById('brushRange');
      if (r) { r.value = String(state.brushRadius); syncSliderFill(r); }
      const o = document.getElementById('brushOut');
      if (o) o.textContent = `${state.brushRadius.toFixed(1)} m`;
    }
  });

  // ── INITIAL BOOT ROUTE (?mode=siteplan | ?mode=photo | ?embed=os&lat=&lon= | default Studio) ─
  renderCardsRail();
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    state.windOn = false;
    sharedUniforms.uWindStrength.value = 0.0;
  }

  if (urlMode === 'siteplan') {
    enterSampleSitePlanMode();
  } else if (urlMode === 'photo') {
    enterPhotoBackdropMode();
  } else if (Number.isFinite(embedLat) && Number.isFinite(embedLon) && embedLat <= -34 && embedLat >= -47.5) {
    enterStudioMode();
    void loadRealNzLand(embedLat, embedLon, embedProject || 'Project Site');
  } else {
    enterStudioMode();
  }

  // ── RESIZE & ANIMATION LOOP ────────────────────────────────────────────────
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  });

  let frames = 0;
  let lastFpsTime = performance.now();
  let lastFrameTime = performance.now();
  const fpsBadge = document.getElementById('fpsBadge');

  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
    lastFrameTime = now;

    if (state.playingSeason) {
      const nextM = (sharedUniforms.uMonth.value + dt * 1.15) % 12;
      if (seasonSlider) seasonSlider.value = nextM.toFixed(2);
      updateSeason(nextM);
    }

    if (camAnim) {
      camAnim.t = Math.min(1, camAnim.t + dt * 2.6);
      const ease = 1 - Math.pow(1 - camAnim.t, 3);
      camera.position.lerpVectors(camAnim.startPos, camAnim.endPos, ease);
      controls.target.lerpVectors(camAnim.startTarget, camAnim.endTarget, ease);
      if (camAnim.t >= 1) camAnim = null;
    }

    if (!prefersReducedMotion && animatedManu.length) {
      const sec = now * 0.001;
      for (const m of animatedManu) {
        m.node.position.y = m.baseY + Math.sin(sec * 2.3 + m.phase) * 0.025;
        m.node.rotation.z = Math.sin(sec * 1.6 + m.phase) * 0.035;
      }
    }

    controls.update();
    renderer.render(scene, camera);

    frames++;
    if (now - lastFpsTime >= 600) {
      const fps = Math.round((frames * 1000) / (now - lastFpsTime));
      if (fpsBadge) fpsBadge.textContent = `${fps} fps`;
      frames = 0;
      lastFpsTime = now;
    }
  });
}

init().catch((err) => {
  console.error('Aotearoa Landscape Studio init error:', err);
  const badge = document.getElementById('backendBadge');
  if (badge) badge.textContent = 'Init Error';
});
