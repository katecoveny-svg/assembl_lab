import { SplatScanEngine } from "./splatEngine.js";
import { WowAtmosphereEngine } from "./wowAtmosphere.js";
import { ArchitectureEngine, ARCH_PRESETS, CLADDING_FINISHES } from './architectureEngine.js';
import { PoolEngine, NZ_POOL_PRESETS, POOL_FINISHES, FENCE_TYPES } from './poolEngine.js';
import { ComplianceEngine } from './complianceEngine.js';
import { PLANT_MAP } from '../catalog.mjs';
import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SkyMesh } from 'three/addons/objects/SkyMesh.js';

import {
  NZ_PLANTS, NZ_SURFACES, NZ_EDGINGS, NZ_COMPOSITIONS,
  NZ_MONTHS, NZ_SEASONS
} from '../catalog.mjs';
import { createNZSurfaceTextures, drawSampleSitePlanToCanvas, buildSampleBackyardPhotoDataUrl } from './proceduralTextures.mjs';
import { createSharedUniforms, createTerrainNodeMaterial } from './tslMaterials.mjs';
import { TerrainEngine, NZ_TERRAIN_PRESETS } from './terrainEngine.js';
import { PlantingEngine } from './plantingEngine.mjs';
import { GardenPropsEngine, NZ_GARDEN_PROPS } from './gardenProps.js';
import { PhotoMatchEngine } from './photoMatchEngine.js';
import { computeClientQuote, exportClientQuoteHTML } from './quoteEngine.js';

const TERRAIN_SIZE = 34;
const LINZ_KEY_STORAGE = 'nz_studio_linz_api_key';

// ── APP STATE ─────────────────────────────────────────────────────────────────
const state = {
  activeStage: 'house', // 'site' | 'house' | 'pool' | 'garden'
  panelOpen: window.innerWidth >= 720,
  tool: 'paint-mix', // 'paint-mix' | 'paint-plant' | 'draw-bed' | 'paint-surface' | 'place-prop' | 'erase' | 'orbit'
  tab: 'compositions', // 'compositions' | 'plants' | 'surfaces' | 'props'
  plantCat: 'all',
  surfaceCat: 'all',
  selectedCompositionId: NZ_COMPOSITIONS[0].id,
  selectedPlantId: 'nikau',
  selectedSurfaceChannel: 4, // Crushed Greywacke Chip (14mm)
  selectedPropId: 'water_bowl',
  selectedEdgingId: 'corten',
  brushRadius: 2.2,
  densityMult: 1.0,
  clumping: 0.72,
  windOn: true,
  handlesVisible: true,
  viewMode: '3d', // 'plan' | '3d' | 'photo'
  includeLabour: false,
  playingSeason: false,
  sunHour: 14.5,
  drawPoints: []
};

async function init() {
  const container = document.getElementById('canvas-wrap');

  // ── WEBGPU RENDERER (Three.js r187 with bright ACESFilmic exposure 1.26)
  const renderer = new WebGPURenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0xdce8f2, 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.26;
  container.appendChild(renderer.domElement);

  await renderer.init();

  const isWebGPU = Boolean(renderer.backend && renderer.backend.isWebGPUBackend);
  const badge = document.getElementById('backend-badge');
  badge.textContent = isWebGPU ? 'WebGPU' : 'WebGL2';

  // ── SCENE, CAMERA & ORBIT CONTROLS ──────────────────────────────────────────
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xdce8f2, 0.0065);

  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 240);
  camera.position.set(11.8, 8.2, 11.8);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.target.set(0.2, 0.8, -1.8);
  controls.maxPolarAngle = Math.PI * 0.485;
  controls.minDistance = 2.0;
  controls.maxDistance = 38;
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.ROTATE
  };

  // ── BRIGHT SUN-DRENCHED AOTEAROA COASTAL DAYLIGHT (SkyMesh + Solar Rig) ─────
  const sharedUniforms = createSharedUniforms();
  const sky = new SkyMesh();
  sky.scale.setScalar(180);
  sky.turbidity.value = 1.8;
  sky.rayleigh.value = 1.15;
  sky.mieCoefficient.value = 0.003;
  sky.mieDirectionalG.value = 0.78;
  scene.add(sky);

  const sunLight = new THREE.DirectionalLight(0xfffaf0, 3.6);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 65;
  sunLight.shadow.camera.left = -18;
  sunLight.shadow.camera.right = 18;
  sunLight.shadow.camera.top = 18;
  sunLight.shadow.camera.bottom = -18;
  sunLight.shadow.bias = -0.0004;
  sunLight.shadow.normalBias = 0.025;
  scene.add(sunLight);

  const hemiLight = new THREE.HemisphereLight(0xdff0ff, 0x9c927d, 1.55);
  scene.add(hemiLight);

  const fillLight = new THREE.DirectionalLight(0xdbeafe, 0.75);
  fillLight.position.set(-10, 9, 12);
  scene.add(fillLight);

  // ── TERRAIN, PLANTING & GARDEN PROPS ENGINES ────────────────────────────────
  const terrainEngine = new TerrainEngine(scene, TERRAIN_SIZE, 96);
  const engine = new PlantingEngine(scene, sharedUniforms, TERRAIN_SIZE, 512, terrainEngine);
  const propsEngine = new GardenPropsEngine(scene, terrainEngine);
  engine.setPropsEngine(propsEngine);

  const surfaceTextures = createNZSurfaceTextures();
  const terrainMat = createTerrainNodeMaterial(
    engine.splatTexA,
    engine.splatTexB,
    engine.splatTexC,
    surfaceTextures,
    TERRAIN_SIZE,
    sharedUniforms
  );
  const terrainMesh = new THREE.Mesh(terrainEngine.geometry, terrainMat);
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);

  // Seamless outer NZ landscape horizon skirt
  const skirtTex = surfaceTextures.lawn.clone();
  skirtTex.repeat.set(42, 42);
  skirtTex.needsUpdate = true;
  const skirtGeom = new THREE.PlaneGeometry(240, 240);
  skirtGeom.rotateX(-Math.PI * 0.5);
  const skirtMesh = new THREE.Mesh(
    skirtGeom,
    new THREE.MeshStandardMaterial({ map: skirtTex, roughness: 0.94, metalness: 0.0 })
  );
  skirtMesh.receiveShadow = true;
  scene.add(skirtMesh);

  // Terrain-conformed stepping pavers context (hide legacy deck box since ArchitectureEngine renders pavilion deck)
  const deckContext = createArchitecturalDeckContext(scene, surfaceTextures, terrainEngine);
  deckContext.group.children.slice(0, 3).forEach(c => { c.visible = false; });

  const archEngine = new ArchitectureEngine(scene, terrainEngine, surfaceTextures);
  const poolEngine = new PoolEngine(scene, terrainEngine, sharedUniforms);
  const complianceEngine = new ComplianceEngine(scene, terrainEngine, 30);
  poolEngine.updateConfig({
    presetId: 'plunge',
    x: 5.8,
    z: -7.8,
    finishId: 'aqua_quartzon',
    fenceType: 'frameless_glass'
  });

  // ── 4-STAGE DESIGN LOOP NAVIGATION ──────────────────────────────────────────
  const stagePanel = document.getElementById('inspector-panel');
  function syncStageUI() {
    stagePanel.classList.toggle('hidden', !state.panelOpen);
    document.querySelectorAll('.stage-pill').forEach(btn => {
      btn.classList.toggle('active', state.panelOpen && btn.dataset.stage === state.activeStage);
    });
    document.querySelectorAll('.stage-pane').forEach(pane => {
      pane.classList.toggle('active', pane.dataset.pane === state.activeStage);
    });
  }

  function setStage(stageId, forceOpen = true) {
    if (!forceOpen && state.panelOpen && state.activeStage === stageId) {
      state.panelOpen = false;
    } else {
      state.activeStage = stageId;
      state.panelOpen = true;
    }
    syncStageUI();
  }

  document.querySelectorAll('.stage-pill').forEach(btn => {
    btn.addEventListener('click', () => setStage(btn.dataset.stage, false));
  });

  document.getElementById('btn-quote-pill').addEventListener('click', () => {
    setStage('garden', true);
  });

  syncStageUI();

  // ── SITE PHOTO-MATCH & HORIZON/LINZ ALIGNMENT AGENT ─────────────────────────
  const backdropEl = document.getElementById('photo-backdrop');
  const photoMatch = new PhotoMatchEngine({
    renderer,
    scene,
    camera,
    controls,
    sharedUniforms,
    terrainEngine,
    sky,
    skirtMesh,
    deckContext,
    backdropEl,
    onStateChange: syncPhotoMatchUI
  });

  function syncPhotoMatchUI(pmState) {
    document.getElementById('btn-photo-match').classList.toggle('active', pmState.active);
    if (pmState.active) {
      state.viewMode = 'photo';
      document.getElementById('btn-plan').classList.remove('active');
      document.getElementById('btn-3d').classList.remove('active');
    } else if (state.viewMode === 'photo') {
      state.viewMode = '3d';
      document.getElementById('btn-3d').classList.add('active');
    }

    const badgeEl = document.getElementById('photo-status-badge');
    if (pmState.active && pmState.hasPhoto) {
      badgeEl.textContent = `Horizon ${Math.round(pmState.detectedHorizonRatio * 100)}%`;
    } else if (pmState.active) {
      badgeEl.textContent = 'Photo Active';
    } else {
      badgeEl.textContent = '3D Sky';
    }

    document.getElementById('photo-eye-height').value = pmState.eyeHeight.toFixed(2);
    document.getElementById('lbl-eye-height').textContent = `${pmState.eyeHeight.toFixed(2)} m`;
    document.getElementById('photo-horizon-pitch').value = pmState.horizonPitchDeg.toFixed(1);
    document.getElementById('lbl-horizon-pitch').textContent = `${pmState.horizonPitchDeg.toFixed(1)}°`;
    document.getElementById('photo-lens-fov').value = Math.round(pmState.lensFov);
    document.getElementById('lbl-lens-fov').textContent = `${Math.round(pmState.lensFov)}°`;
    document.getElementById('photo-parcel-bearing').value = Math.round(pmState.parcelBearingDeg);
    document.getElementById('lbl-parcel-bearing').textContent = `${Math.round(pmState.parcelBearingDeg)}°`;
  }

  function updateSkirtElevation() {
    let minH = Infinity;
    for (let i = 0; i < terrainEngine.heights.length; i++) {
      if (terrainEngine.heights[i] < minH) minH = terrainEngine.heights[i];
    }
    skirtMesh.position.y = Math.min(-0.04, minH - 0.18);
  }

  function updateSlopeReadout() {
    document.getElementById('slope-readout').textContent =
      `Avg ${terrainEngine.avgSlopeDeg.toFixed(1)}°`;
    document.getElementById('site-status').textContent = terrainEngine.siteLabel;
  }

  function updateNZSun(hour) {
    state.sunHour = hour;
    const latRad = Math.abs(terrainEngine.siteLat) * (Math.PI / 180);
    const maxElev = Math.max(0.58, Math.min(1.26, 1.48 - latRad * 0.58));
    const dayProgress = (hour - 6.0) / 14.5;
    const elevation = Math.max(0.06, Math.sin(Math.max(0, Math.min(1, dayProgress)) * Math.PI) * maxElev);
    const azimuth = (dayProgress - 0.5) * Math.PI * 1.18;
    const sunDir = new THREE.Vector3(
      -Math.sin(azimuth) * Math.cos(elevation),
      Math.sin(elevation),
      -Math.cos(azimuth) * Math.cos(elevation)
    ).normalize();

    sky.sunPosition.value.copy(sunDir);
    sunLight.position.copy(sunDir).multiplyScalar(26);
    sharedUniforms.uSunDir.value.copy(sunDir);

    const sinE = Math.sin(elevation);
    const golden = 1.0 - Math.min(1.0, elevation / 0.42);
    const dusk = 1.0 - Math.min(1.0, Math.max(0, (elevation - 0.06) / 0.26));

    // Bright sunlit Auckland / Waiheke summer afternoon lighting
    sunLight.color.setRGB(1.0, 0.98 - golden * 0.18, 0.94 - golden * 0.36);
    sunLight.intensity = 1.15 + sinE * 2.65;
    hemiLight.intensity = 0.65 + sinE * 0.98;
    fillLight.intensity = 0.32 + sinE * 0.48;

    if (scene.fog) {
      // Crisp bright coastal sky horizon (#dce8f2 in daylight, warm apricot at sunset)
      const dayR = 0.863, dayG = 0.910, dayB = 0.949;
      const goldR = 0.84, goldG = 0.72, goldB = 0.66;
      const gMix = golden * 0.55;
      scene.fog.color.setRGB(
        dayR * (1 - gMix) + goldR * gMix,
        dayG * (1 - gMix) + goldG * gMix,
        dayB * (1 - gMix) + goldB * gMix
      );
    }

    propsEngine.updateDuskLighting(dusk);
    poolEngine.updateDuskLighting(hour);

    const hh = Math.floor(hour);
    const mm = Math.round((hour - hh) * 60);
    document.getElementById('sun-time-lbl').textContent =
      `${String(hh).padStart(2, '0')}:${String(mm === 60 ? 0 : mm).padStart(2, '0')}`;
  }

  terrainEngine.onChange(() => {
    updateSkirtElevation();
    deckContext.conformToTerrain();
    archEngine.reprojectToTerrain();
    poolEngine.rebuild();
    complianceEngine.rebuildHIRB();
    engine.rebuildEdgingMeshes();
    engine.syncInstances();
    propsEngine.regroundAll();
    updateNZSun(state.sunHour);
    updateSlopeReadout();
    updateStatsUI();
  });

  // ── TERRAIN-CONFORMED 3D BRUSH CURSOR & POLYGON BED PREVIEW ─────────────────
  const CURSOR_SEGS = 48;
  const brushLinePositions = new Float32Array((CURSOR_SEGS + 1) * 3);
  const brushCursorGeom = new THREE.BufferGeometry();
  brushCursorGeom.setAttribute('position', new THREE.BufferAttribute(brushLinePositions, 3));
  const brushCursorMat = new THREE.LineBasicMaterial({ color: 0x240b21 });
  const brushCursor = new THREE.Line(brushCursorGeom, brushCursorMat);
  brushCursor.visible = false;
  brushCursor.frustumCulled = false;
  scene.add(brushCursor);

  function updateTerrainBrushCursor(cx, cz, radius) {
    const pos = brushCursorGeom.attributes.position;
    for (let i = 0; i <= CURSOR_SEGS; i++) {
      const a = (i / CURSOR_SEGS) * Math.PI * 2;
      const wx = cx + Math.cos(a) * radius;
      const wz = cz + Math.sin(a) * radius;
      const wy = terrainEngine.getHeight(wx, wz) + 0.06;
      pos.setXYZ(i, wx, wy, wz);
    }
    pos.needsUpdate = true;
  }

  const drawPreviewGroup = new THREE.Group();
  scene.add(drawPreviewGroup);

  function rebuildDrawPreview(hoverPt = null) {
    while (drawPreviewGroup.children.length) {
      const c = drawPreviewGroup.children.pop();
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    }
    const pts = [...state.drawPoints];
    if (hoverPt) pts.push(hoverPt);
    if (pts.length === 0) return;

    const dotGeom = new THREE.SphereGeometry(0.11, 12, 10);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x240b21 });
    for (const p of state.drawPoints) {
      const m = new THREE.Mesh(dotGeom, dotMat);
      m.position.set(p.x, terrainEngine.getHeight(p.x, p.z) + 0.09, p.z);
      drawPreviewGroup.add(m);
    }

    if (pts.length >= 2) {
      const linePts = pts.map(p => new THREE.Vector3(p.x, terrainEngine.getHeight(p.x, p.z) + 0.09, p.z));
      if (state.drawPoints.length >= 3) linePts.push(linePts[0].clone());
      const lineGeom = new THREE.BufferGeometry().setFromPoints(linePts);
      const lineMat = new THREE.LineBasicMaterial({ color: 0xd9bacb });
      drawPreviewGroup.add(new THREE.Line(lineGeom, lineMat));
    }
  }

  // ── POPULATE SHOWCASE NZ ARCHITECTURAL GARDEN (ZERO F9 CLASHES AT STARTUP) ──
  updateSkirtElevation();
  deckContext.conformToTerrain();
  buildShowcaseNZGarden(engine, propsEngine);
  updateNZSun(state.sunHour);
  updateSlopeReadout();

  // ── RAYCASTING & INTERACTIVE PAINTING / PROP PLACEMENT ──────────────────────
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let isPainting = false;
  let lastPaintPos = new THREE.Vector3(999, 0, 999);

  function raycastTerrain(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.height) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(terrainMesh, false);
    return hits.length > 0 ? hits[0].point : null;
  }

  function applyBrushAt(pt) {
    if (state.tool === 'paint-mix') {
      const comp = NZ_COMPOSITIONS.find(c => c.id === state.selectedCompositionId) || NZ_COMPOSITIONS[0];
      engine.paintCompositionBrush(pt.x, pt.z, state.brushRadius, comp, state.densityMult, state.clumping);
    } else if (state.tool === 'paint-plant') {
      engine.paintSpeciesBrush(pt.x, pt.z, state.brushRadius, state.selectedPlantId, state.densityMult, true);
    } else if (state.tool === 'paint-surface') {
      engine.paintSurfaceDisc(pt.x, pt.z, state.brushRadius, state.selectedSurfaceChannel, 0.88, 0.6);
    } else if (state.tool === 'erase') {
      engine.erasePlantsInRadius(pt.x, pt.z, state.brushRadius);
    }
    updateStatsUI();
  }

  function updateCursorStyle() {
    const isOrbit = state.tool === 'orbit';
    controls.mouseButtons.LEFT = isOrbit ? THREE.MOUSE.ROTATE : null;
    renderer.domElement.style.cursor = isOrbit ? 'grab' : 'crosshair';
    const colors = {
      'paint-mix': 0x240b21,
      'paint-plant': 0x916a70,
      'paint-surface': 0xb47b32,
      'place-prop': 0x654a4e,
      'erase': 0x9b2c2c,
      'draw-bed': 0x240b21,
      'orbit': 0xffffff
    };
    brushCursorMat.color.setHex(colors[state.tool] || 0x240b21);
    document.getElementById('draw-hint').classList.toggle('hidden', state.tool !== 'draw-bed');
  }

  renderer.domElement.addEventListener('pointermove', (e) => {
    const pt = raycastTerrain(e.clientX, e.clientY);
    if (!pt || state.tool === 'orbit') {
      brushCursor.visible = false;
      return;
    }
    brushCursor.visible = true;
    const cursorR = state.tool === 'draw-bed' ? 0.35 : state.tool === 'place-prop' ? 0.65 : state.brushRadius;
    updateTerrainBrushCursor(pt.x, pt.z, cursorR);

    if (state.tool === 'draw-bed' && state.drawPoints.length > 0) {
      rebuildDrawPreview(pt);
    }
    if (isPainting && state.tool !== 'place-prop') {
      const step = state.tool === 'paint-surface' ? state.brushRadius * 0.22 : state.brushRadius * 0.42;
      if (pt.distanceTo(lastPaintPos) >= step) {
        applyBrushAt(pt);
        lastPaintPos.copy(pt);
      }
    }
  });

  renderer.domElement.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || state.tool === 'orbit') return;
    const pt = raycastTerrain(e.clientX, e.clientY);
    if (!pt) return;

    if (state.tool === 'draw-bed') {
      state.drawPoints.push({ x: pt.x, z: pt.z });
      rebuildDrawPreview(pt);
      return;
    }

    if (state.tool === 'place-prop') {
      engine.pushUndoState();
      propsEngine.addProp(state.selectedPropId, pt.x, pt.z);
      updateStatsUI();
      return;
    }

    engine.pushUndoState();
    isPainting = true;
    lastPaintPos.copy(pt);
    applyBrushAt(pt);
  });

  window.addEventListener('pointerup', () => { isPainting = false; });

  renderer.domElement.addEventListener('dblclick', () => {
    if (state.tool === 'draw-bed' && state.drawPoints.length >= 3) {
      finishDrawingBed();
    }
  });

  function finishDrawingBed() {
    if (state.drawPoints.length < 3) return;
    engine.pushUndoState();
    const comp = NZ_COMPOSITIONS.find(c => c.id === state.selectedCompositionId) || NZ_COMPOSITIONS[0];
    engine.createBed(state.drawPoints, comp, state.selectedEdgingId, state.densityMult, state.clumping);
    state.drawPoints = [];
    rebuildDrawPreview(null);
    updateStatsUI();
  }

  // ── SITE PHOTO-MATCH CONTROLS & VIEWPORT DRAG-AND-DROP ──────────────────────
  const photoFileInput = document.getElementById('file-site-photo');
  const dropOverlay = document.getElementById('photo-drop-overlay');
  const siteStatusEl = document.getElementById('site-status');

  document.getElementById('btn-load-photo').addEventListener('click', () => photoFileInput.click());
  photoFileInput.addEventListener('change', async () => {
    const f = photoFileInput.files && photoFileInput.files[0];
    if (!f) return;
    try {
      const res = await photoMatch.loadPhotoFile(f);
      siteStatusEl.textContent = `Photo Match: ${res.name} (Horizon ${Math.round(res.horizonRatio * 100)}%)`;
    } catch (err) {
      siteStatusEl.textContent = `Photo error: ${err.message}`;
    }
    photoFileInput.value = '';
  });

  document.getElementById('btn-auto-horizon').addEventListener('click', () => {
    const res = photoMatch.autoAlignHorizon();
    siteStatusEl.textContent = `Horizon aligned (${Math.round(res.horizonRatio * 100)}%, Pitch ${res.horizonPitchDeg.toFixed(1)}°, FOV ${res.lensFov}°)`;
  });

  document.getElementById('btn-clear-photo').addEventListener('click', () => {
    photoMatch.clearPhoto();
    siteStatusEl.textContent = terrainEngine.siteLabel;
  });

  let dragDepth = 0;
  window.addEventListener('dragenter', (e) => {
    if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) {
      e.preventDefault();
      dragDepth++;
      dropOverlay.classList.remove('hidden');
    }
  });
  window.addEventListener('dragover', (e) => { e.preventDefault(); });
  window.addEventListener('dragleave', () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) dropOverlay.classList.add('hidden');
  });
  window.addEventListener('drop', async (e) => {
    e.preventDefault();
    dragDepth = 0;
    dropOverlay.classList.add('hidden');
    const files = e.dataTransfer && e.dataTransfer.files;
    if (!files || files.length === 0) return;
    const f = files[0];
    if (/image\/(jpeg|png|webp)/i.test(f.type) || /\.(jpe?g|png|webp)$/i.test(f.name)) {
      try {
        const res = await photoMatch.loadPhotoFile(f);
        siteStatusEl.textContent = `Photo Match: ${res.name} (Horizon ${Math.round(res.horizonRatio * 100)}%)`;
      } catch (err) {
        siteStatusEl.textContent = `Photo drop error: ${err.message}`;
      }
    }
  });

  // ── TERRAIN PRESET, NZ ADDRESS + LINZ WFS & FILE IMPORTERS ──────────────────
  const presetSelect = document.getElementById('terrain-preset');
  for (const preset of NZ_TERRAIN_PRESETS) {
    const opt = document.createElement('option');
    opt.value = preset.id;
    opt.textContent = preset.name;
    presetSelect.appendChild(opt);
  }
  presetSelect.value = terrainEngine.currentPresetId;
  presetSelect.addEventListener('change', () => {
    terrainEngine.applyPreset(presetSelect.value, true);
  });

  const linzKeyInput = document.getElementById('linz-api-key');
  try {
    const savedKey = localStorage.getItem(LINZ_KEY_STORAGE);
    if (savedKey) linzKeyInput.value = savedKey;
  } catch { /* ignore storage errors */ }
  linzKeyInput.addEventListener('input', () => {
    try { localStorage.setItem(LINZ_KEY_STORAGE, linzKeyInput.value.trim()); } catch { /* ignore */ }
  });

  const addressInput = document.getElementById('nz-address');
  const loadAddrBtn = document.getElementById('btn-load-address');

  async function handleLoadAddress() {
    const q = addressInput.value.trim();
    if (!q) {
      siteStatusEl.textContent = 'Enter an NZ address to fetch elevation…';
      return;
    }
    loadAddrBtn.disabled = true;
    loadAddrBtn.textContent = '…';
    try {
      const res = await terrainEngine.loadNZAddress(q, linzKeyInput.value.trim(), (msg) => {
        siteStatusEl.textContent = msg;
      });
      siteStatusEl.textContent = res.summary;
    } catch (err) {
      siteStatusEl.textContent = `Error: ${err.message}`;
    } finally {
      loadAddrBtn.disabled = false;
      loadAddrBtn.textContent = 'Load';
    }
  }
  loadAddrBtn.addEventListener('click', handleLoadAddress);
  addressInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLoadAddress();
  });

  const geoFileInput = document.getElementById('file-geojson');
  document.getElementById('btn-import-geojson').addEventListener('click', () => geoFileInput.click());
  geoFileInput.addEventListener('change', async () => {
    const f = geoFileInput.files && geoFileInput.files[0];
    if (!f) return;
    try {
      const text = await f.text();
      const res = terrainEngine.importGeoJSON(text);
      siteStatusEl.textContent = `Loaded ${res.count} LINZ parcel(s) · ${res.crs}`;
    } catch (err) {
      siteStatusEl.textContent = `GeoJSON error: ${err.message}`;
    }
    geoFileInput.value = '';
  });

  const glbFileInput = document.getElementById('file-glb');
  document.getElementById('btn-import-glb').addEventListener('click', () => glbFileInput.click());
  glbFileInput.addEventListener('change', async () => {
    const f = glbFileInput.files && glbFileInput.files[0];
    if (!f) return;
    try {
      const buf = await f.arrayBuffer();
      const res = await terrainEngine.importGLBArrayBuffer(buf, f.name, 0, 0);
      siteStatusEl.textContent = `Imported 3D model: ${res.filename}`;
    } catch (err) {
      siteStatusEl.textContent = `GLB error: ${err.message}`;
    }
    glbFileInput.value = '';
  });

  // ── EDGING, TOOL MODES & BOTTOM TABS ────────────────────────────────────────
  const edgingSelect = document.getElementById('edging-select');
  for (const ed of NZ_EDGINGS) {
    const opt = document.createElement('option');
    opt.value = ed.id;
    opt.textContent = ed.pricePerM > 0 ? `${ed.name} (~$${ed.pricePerM}/m)` : ed.name;
    edgingSelect.appendChild(opt);
  }
  edgingSelect.addEventListener('change', () => {
    state.selectedEdgingId = edgingSelect.value;
    if (engine.beds.length > 0) {
      engine.setBedEdging(engine.beds[engine.beds.length - 1].id, state.selectedEdgingId);
      updateStatsUI();
    }
  });

  function setTool(toolId) {
    state.tool = toolId;
    if (toolId !== 'draw-bed') { state.drawPoints = []; rebuildDrawPreview(null); }
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.toggle('active', b.dataset.tool === toolId));
    if (toolId === 'paint-mix' || toolId === 'draw-bed') setTab('compositions');
    if (toolId === 'paint-plant') setTab('plants');
    if (toolId === 'paint-surface') setTab('surfaces');
    if (toolId === 'place-prop') setTab('props');
    updateCursorStyle();
  }
  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => setTool(btn.dataset.tool));
  });

  function setTab(tabId) {
    state.tab = tabId;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
    document.getElementById('plant-cat-row').classList.toggle('hidden', tabId !== 'plants');
    document.getElementById('surface-cat-row').classList.toggle('hidden', tabId !== 'surfaces');
    renderCardsRail();
  }
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setTab(btn.dataset.tab);
      if (btn.dataset.tab === 'compositions' && state.tool !== 'draw-bed') setTool('paint-mix');
      if (btn.dataset.tab === 'plants') setTool('paint-plant');
      if (btn.dataset.tab === 'surfaces') setTool('paint-surface');
      if (btn.dataset.tab === 'props') setTool('place-prop');
    });
  });

  document.querySelectorAll('.cat-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      state.plantCat = btn.dataset.cat;
      document.querySelectorAll('.cat-pill').forEach(b => b.classList.toggle('active', b === btn));
      renderCardsRail();
    });
  });

  document.querySelectorAll('.surf-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      state.surfaceCat = btn.dataset.surfcat;
      document.querySelectorAll('.surf-pill').forEach(b => b.classList.toggle('active', b === btn));
      renderCardsRail();
    });
  });

  function renderCardsRail() {
    const rail = document.getElementById('cards-rail');
    rail.innerHTML = '';

    if (state.tab === 'compositions') {
      for (const comp of NZ_COMPOSITIONS) {
        const card = document.createElement('div');
        card.className = 'card' + (comp.id === state.selectedCompositionId ? ' active' : '');
        card.innerHTML = `
          <div class="palette-bar">${comp.palette.map(c => `<span style="background:${c}"></span>`).join('')}</div>
          <div class="card-title">${comp.name}</div>
          <div class="card-sub">${comp.subtitle}</div>
          <div class="card-meta"><span>${comp.soil}</span><span>${comp.density}/m²</span></div>
        `;
        card.addEventListener('click', () => {
          state.selectedCompositionId = comp.id;
          renderCardsRail();
        });
        rail.appendChild(card);
      }
    } else if (state.tab === 'plants') {
      const list = state.plantCat === 'all'
        ? NZ_PLANTS
        : NZ_PLANTS.filter(p => p.category === state.plantCat);
      for (const p of list) {
        const card = document.createElement('div');
        card.className = 'card' + (p.id === state.selectedPlantId ? ' active' : '');
        const bloomStr = p.bloomStart < 12.5
          ? `${NZ_MONTHS[Math.floor(p.bloomStart) % 12]}–${NZ_MONTHS[Math.floor(p.bloomEnd) % 12]}`
          : 'Evergreen';
        card.innerHTML = `
          <div class="plant-swatch-row">
            <span class="plant-dot" style="background:${p.swatch}"></span>
            <span class="card-title">${p.maori}</span>
          </div>
          <div class="card-sub"><em>${p.botanical}</em></div>
          <div class="card-meta"><span>${bloomStr}</span><span>$${p.priceNZD.toFixed(0)}</span></div>
        `;
        card.addEventListener('click', () => {
          state.selectedPlantId = p.id;
          setTool('paint-plant');
          renderCardsRail();
        });
        rail.appendChild(card);
      }
    } else if (state.tab === 'surfaces') {
      const list = state.surfaceCat === 'all'
        ? NZ_SURFACES
        : NZ_SURFACES.filter(s => s.category === state.surfaceCat);
      for (const s of list) {
        const card = document.createElement('div');
        card.className = 'card' + (s.channel === state.selectedSurfaceChannel ? ' active' : '');
        const priceTag = s.depth > 0 ? `$${s.pricePerM3}/m³` : `$${s.pricePerM2}/m²`;
        card.innerHTML = `
          <div class="surface-preview" style="background:${s.swatch}"></div>
          <div class="card-title">${s.name}</div>
          <div class="card-sub">${s.spec}</div>
          <div class="card-meta"><span>${s.brand}</span><span>${priceTag}</span></div>
        `;
        card.addEventListener('click', () => {
          state.selectedSurfaceChannel = s.channel;
          setTool('paint-surface');
          renderCardsRail();
        });
        rail.appendChild(card);
      }
    } else {
      for (const pr of NZ_GARDEN_PROPS) {
        const card = document.createElement('div');
        card.className = 'card' + (pr.id === state.selectedPropId ? ' active' : '');
        card.innerHTML = `
          <div class="plant-swatch-row">
            <span class="plant-dot" style="background:${pr.swatch}"></span>
            <span class="card-title">${pr.name}</span>
          </div>
          <div class="card-sub">${pr.subtitle}</div>
          <div class="card-meta"><span>${pr.category}</span><span>$${pr.priceNZD}</span></div>
        `;
        card.addEventListener('click', () => {
          state.selectedPropId = pr.id;
          setTool('place-prop');
          renderCardsRail();
        });
        rail.appendChild(card);
      }
    }
  }

  // Inspector sliders
  const bindSlider = (id, lblId, fmt, fn) => {
    const el = document.getElementById(id);
    const lbl = document.getElementById(lblId);
    el.addEventListener('input', () => {
      const v = parseFloat(el.value);
      lbl.textContent = fmt(v);
      fn(v);
    });
  };
  bindSlider('brush-size', 'lbl-brush', v => `${v.toFixed(1)} m`, v => { state.brushRadius = v; });
  bindSlider('density-mult', 'lbl-density', v => `${v.toFixed(1)}×`, v => { state.densityMult = v; });
  bindSlider('clump-slider', 'lbl-clump', v => `${Math.round(v * 100)}%`, v => { state.clumping = v; });

  bindSlider('photo-eye-height', 'lbl-eye-height', v => `${v.toFixed(2)} m`, v => photoMatch.setEyeHeight(v));
  bindSlider('photo-horizon-pitch', 'lbl-horizon-pitch', v => `${v.toFixed(1)}°`, v => photoMatch.setHorizonPitch(v));
  bindSlider('photo-lens-fov', 'lbl-lens-fov', v => `${Math.round(v)}°`, v => photoMatch.setLensFov(v));
  bindSlider('photo-parcel-bearing', 'lbl-parcel-bearing', v => `${Math.round(v)}°`, v => photoMatch.setParcelBearing(v));

  document.getElementById('btn-regenerate').addEventListener('click', () => {
    if (engine.beds.length === 0) return;
    engine.pushUndoState();
    const comp = NZ_COMPOSITIONS.find(c => c.id === state.selectedCompositionId) || NZ_COMPOSITIONS[0];
    engine.regenerateBed(engine.beds[engine.beds.length - 1].id, comp, true);
    updateStatsUI();
  });
  document.getElementById('btn-reshuffle').addEventListener('click', () => {
    if (engine.beds.length === 0) return;
    engine.pushUndoState();
    const lastBed = engine.beds[engine.beds.length - 1];
    const comp = NZ_COMPOSITIONS.find(c => c.id === lastBed.compositionId) || NZ_COMPOSITIONS[0];
    engine.regenerateBed(lastBed.id, comp, true);
    updateStatsUI();
  });

  // Labour toggle & Export Client Quote
  const labourChk = document.getElementById('chk-include-labour');
  labourChk.addEventListener('change', () => {
    state.includeLabour = labourChk.checked;
    updateStatsUI();
  });

  document.getElementById('btn-export-quote').addEventListener('click', () => {
    const poolQ = poolEngine.getQuantities();
    const q = computeClientQuote(engine, propsEngine, { includeLabour: state.includeLabour, poolQuantities: poolQ });
    updateStatsUI();
    const yrBtn = document.querySelector('.yr-btn.active');
    exportClientQuoteHTML(q, {
      siteLabel: terrainEngine.siteLabel,
      slopeLabel: document.getElementById('slope-readout').textContent,
      seasonLabel: document.getElementById('season-label').textContent,
      yearLabel: yrBtn ? `Yr ${yrBtn.dataset.year}` : 'Yr 4'
    });
  });

  // Seasonal timeline
  const seasonSlider = document.getElementById('season-slider');
  const seasonLabel = document.getElementById('season-label');
  function updateSeason(val) {
    const m = ((val % 12) + 12) % 12;
    sharedUniforms.uMonth.value = m;
    const idx = Math.floor(m);
    const frac = m - idx;
    const prefix = frac < 0.33 ? 'Early' : frac < 0.67 ? 'Mid' : 'Late';
    seasonLabel.textContent = `${prefix}-${NZ_MONTHS[idx]} · ${NZ_SEASONS[idx]}`;
  }
  seasonSlider.addEventListener('input', () => updateSeason(parseFloat(seasonSlider.value)));
  updateSeason(parseFloat(seasonSlider.value));

  const playBtn = document.getElementById('btn-play-season');
  playBtn.addEventListener('click', () => {
    state.playingSeason = !state.playingSeason;
    playBtn.classList.toggle('playing', state.playingSeason);
    playBtn.textContent = state.playingSeason ? '❚❚' : '▶';
  });

  // Multi-year projection
  document.querySelectorAll('.yr-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.yr-btn').forEach(b => b.classList.toggle('active', b === btn));
      sharedUniforms.uYear.value = parseFloat(btn.dataset.year);
    });
  });

  // Sun, Plan/3D/PhotoMatch, Undo/Redo
  document.getElementById('sun-slider').addEventListener('input', (e) => updateNZSun(parseFloat(e.target.value)));

  let camAnim = null;
  function transitionCamera(toPos, toTarget) {
    camAnim = {
      startPos: camera.position.clone(),
      startTarget: controls.target.clone(),
      endPos: toPos.clone(),
      endTarget: toTarget.clone(),
      t: 0
    };
  }
  document.getElementById('btn-plan').addEventListener('click', () => {
    if (photoMatch.active) photoMatch.setActive(false);
    state.viewMode = 'plan';
    document.getElementById('btn-plan').classList.add('active');
    document.getElementById('btn-3d').classList.remove('active');
    document.getElementById('btn-photo-match').classList.remove('active');
    transitionCamera(new THREE.Vector3(0, 23.0, 0.25), new THREE.Vector3(0, 0, -2.0));
  });
  document.getElementById('btn-3d').addEventListener('click', () => {
    if (photoMatch.active) photoMatch.setActive(false);
    state.viewMode = '3d';
    document.getElementById('btn-3d').classList.add('active');
    document.getElementById('btn-plan').classList.remove('active');
    document.getElementById('btn-photo-match').classList.remove('active');
    transitionCamera(new THREE.Vector3(11.8, 8.2, 11.8), new THREE.Vector3(0.2, 0.8, -1.8));
  });
  document.getElementById('btn-photo-match').addEventListener('click', () => {
    camAnim = null;
    if (photoMatch.active) {
      photoMatch.setActive(false);
      document.getElementById('btn-3d').classList.add('active');
    } else {
      photoMatch.setActive(true);
    }
  });

  document.getElementById('btn-undo').addEventListener('click', () => { if (engine.undo()) updateStatsUI(); });
  document.getElementById('btn-redo').addEventListener('click', () => { if (engine.redo()) updateStatsUI(); });

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
    if (e.key === '1') setTool('paint-mix');
    if (e.key === '2') setTool('paint-plant');
    if (e.key === '3') setTool('draw-bed');
    if (e.key === '4') setTool('paint-surface');
    if (e.key === '5') setTool('place-prop');
    if (e.key === '6') setTool('erase');
    if (e.key === '7') setTool('orbit');
    if (e.key === 'Enter' && state.tool === 'draw-bed') finishDrawingBed();
    if (e.key === 'Escape' && state.tool === 'draw-bed') { state.drawPoints = []; rebuildDrawPreview(null); }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey ? engine.redo() : engine.undo()) updateStatsUI();
    }
    if (e.key === '[') {
      state.brushRadius = Math.max(0.6, state.brushRadius - 0.3);
      document.getElementById('brush-size').value = state.brushRadius;
      document.getElementById('lbl-brush').textContent = `${state.brushRadius.toFixed(1)} m`;
    }
    if (e.key === ']') {
      state.brushRadius = Math.min(5.5, state.brushRadius + 0.3);
      document.getElementById('brush-size').value = state.brushRadius;
      document.getElementById('lbl-brush').textContent = `${state.brushRadius.toFixed(1)} m`;
    }
  });

  function fmtMoney(v) {
    return `$${Math.round(v).toLocaleString('en-NZ')}`;
  }

  function fmtCompactMoney(v) {
    if (v >= 1000) return `$${(v / 1000).toFixed(1)}k incl. GST`;
    return `$${Math.round(v)} incl. GST`;
  }

  function updateStatsUI() {
    const poolQ = poolEngine.getQuantities();
    const q = computeClientQuote(engine, propsEngine, { includeLabour: state.includeLabour, poolQuantities: poolQ });
    const f9 = poolEngine.checkF9Compliance(engine.plants, PLANT_MAP, propsEngine.props);
    const f9El = document.getElementById('f9-badge');
    const poolLbl = document.getElementById('pool-metrics-lbl');
    const consentChip = document.getElementById('pool-consent-chip');
    if (f9El && poolLbl) {
      if (!f9.active) {
        f9El.textContent = 'NONE';
        f9El.className = 'mono-chip subtle';
        if (consentChip) {
          consentChip.textContent = 'NO POOL';
          consentChip.className = 'mono-chip subtle';
        }
        poolLbl.textContent = 'Select an NZ pool preset above';
      } else {
        f9El.textContent = f9.clashes > 0 ? `F9 CLASH (${f9.clashes})` : 'F9 PASS ✓';
        f9El.className = 'mono-chip ' + (f9.clashes > 0 ? 'warn' : 'pass');
        const consentTxt = f9.over35kL ? 'Shell + Fence Consent (>35kL)' : 'Fence Consent Only (≤35kL)';
        if (consentChip) {
          consentChip.textContent = f9.over35kL ? '>35KL SHELL + FENCE' : '≤35KL FENCE ONLY';
          consentChip.className = 'mono-chip ' + (f9.over35kL ? 'warn' : 'pass');
        }
        poolLbl.textContent = `${f9.volumeL.toLocaleString()} L · Cut ${poolQ.excavationM3} m³ · ${consentTxt}`;
      }
    }

    const archM = archEngine.getMetrics();
    const hardPavingM2 = (q.pavingItems || []).reduce((a, b) => a + b.areaM2, 0);
    const comp = complianceEngine.evaluate({
      parcelAreaM2: 900,
      roofAreaM2: archM.roofAreaM2,
      poolFootprintM2: poolQ.footprintM2,
      hardPavingM2
    });
    const impPctEl = document.getElementById('lbl-imp-pct');
    const impBarEl = document.getElementById('imp-bar');
    const impBadgeEl = document.getElementById('imp-badge');
    const nzsEl = document.getElementById('nzs3604-badge');
    if (impPctEl) impPctEl.textContent = `${comp.imperviousPct.toFixed(1)}% (${Math.round(comp.imperviousM2)} m²)`;
    if (impBarEl) {
      impBarEl.style.width = `${Math.min(100, comp.imperviousPct)}%`;
      impBarEl.classList.toggle('over', !comp.compliant);
    }
    if (impBadgeEl) {
      impBadgeEl.textContent = comp.compliant ? 'AUP OK ✓' : 'OVER 60% ⚠';
      impBadgeEl.className = 'mono-chip ' + (comp.compliant ? 'pass' : 'warn');
    }
    if (nzsEl) nzsEl.textContent = archM.nzs3604;

    document.getElementById('top-quote-val').textContent = fmtCompactMoney(q.grandTotalInclGst);
    document.getElementById('bom-total').textContent = `${fmtMoney(q.grandTotalInclGst)}`;

    // Quote breakdown summary
    const summaryEl = document.getElementById('quote-summary');
    summaryEl.innerHTML = `
      <div class="q-row"><span>Plants (${q.totalPlants})</span><strong>${fmtMoney(q.plantsSubtotal)}</strong></div>
      <div class="q-row"><span>Bulk Bark &amp; Chip (${q.bulkItems.reduce((a, b) => a + b.volumeM3, 0).toFixed(1)} m³)</span><strong>${fmtMoney(q.bulkSubtotal)}</strong></div>
      <div class="q-row"><span>Paving &amp; Edging</span><strong>${fmtMoney(q.pavingAndEdgingSubtotal)}</strong></div>
      ${q.poolSubtotal > 0 ? `<div class="q-row"><span>NZ Pool, F9 &amp; Consent</span><strong>${fmtMoney(q.poolSubtotal)}</strong></div>` : ''}
      ${q.featuresSubtotal > 0 ? `<div class="q-row"><span>NZ Features (${q.totalProps})</span><strong>${fmtMoney(q.featuresSubtotal)}</strong></div>` : ''}
      ${q.includeLabour ? `<div class="q-row"><span>Install Labour (${q.labourHours}h)</span><strong>${fmtMoney(q.labourSubtotal)}</strong></div>` : ''}
      <div class="q-row q-gst"><span>15% NZ GST</span><span>${fmtMoney(q.gstAmount)}</span></div>
      <div class="q-row q-grand"><span>Total incl. GST</span><span>${fmtMoney(q.grandTotalInclGst)}</span></div>
    `;

    // Itemized BOM list
    const bom = document.getElementById('bom-list');
    if (q.plantItems.length === 0 && q.bulkItems.length === 0 && q.pavingItems.length === 0) {
      bom.innerHTML = '<div class="meta-note">Paint supplies or plants on the terrain to build your NZ Client Quote.</div>';
      return;
    }

    const supplyHtml = q.bulkItems.map(r => `
      <div class="bom-item">
        <span class="bom-swatch" style="background:${r.surface.swatch}"></span>
        <div class="bom-info">
          <div class="bom-name">${r.surface.name}</div>
          <div class="bom-sub">${r.areaM2.toFixed(1)} m² · ${r.volumeM3.toFixed(2)} m³</div>
        </div>
        <div class="bom-qty">${fmtMoney(r.cost)}</div>
      </div>
    `).join('');

    const pavingHtml = q.pavingItems.map(r => `
      <div class="bom-item">
        <span class="bom-swatch" style="background:${r.surface.swatch}"></span>
        <div class="bom-info">
          <div class="bom-name">${r.surface.name}</div>
          <div class="bom-sub">${r.areaM2.toFixed(1)} m² @ $${r.surface.pricePerM2}/m²</div>
        </div>
        <div class="bom-qty">${fmtMoney(r.cost)}</div>
      </div>
    `).join('');

    const plantHtml = q.plantItems.map(row => `
      <div class="bom-item">
        <span class="bom-swatch" style="background:${row.plant.swatch}"></span>
        <div class="bom-info">
          <div class="bom-name">${row.plant.maori}</div>
          <div class="bom-sub">${row.plant.grade} · $${row.plant.priceNZD.toFixed(0)}</div>
        </div>
        <div class="bom-qty">${row.count}×</div>
      </div>
    `).join('');

    bom.innerHTML = supplyHtml + pavingHtml + plantHtml;
  }

  // ── ARCHITECTURE, HIRB & POOL CONTROLS ──────────────────────────────────────
  const archSel = document.getElementById('arch-preset');
  ARCH_PRESETS.forEach(p => { const o = document.createElement('option'); o.value = p.id; o.textContent = p.name; archSel.appendChild(o); });
  archSel.value = archEngine.presetId;
  archSel.addEventListener('change', () => { archEngine.buildPreset(archSel.value); updateStatsUI(); });

  const cladSel = document.getElementById('cladding-select');
  Object.entries(CLADDING_FINISHES).forEach(([k, v]) => { const o = document.createElement('option'); o.value = k; o.textContent = v.name; cladSel.appendChild(o); });
  cladSel.addEventListener('change', () => archEngine.setCladding(cladSel.value));

  const planInput = document.getElementById('plan-file-input');
  document.getElementById('btn-import-plan').addEventListener('click', () => planInput.click());
  planInput.addEventListener('change', () => {
    const file = planInput.files && planInput.files[0];
    if (!file) return;
    if (file.name.toLowerCase().endsWith('.dxf')) {
      const r = new FileReader();
      r.onload = () => { try { archEngine.importDXFFloorPlan(String(r.result), file.name); archSel.value = 'none'; updateStatsUI(); } catch (err) { alert(err.message); } };
      r.readAsText(file);
    } else {
      const r = new FileReader();
      r.onload = () => archEngine.importPlanImage(String(r.result), file.name);
      r.readAsDataURL(file);
    }
    planInput.value = '';
  });

  const toggleHIRB = () => {
    const next = !complianceEngine.hirbGroup.visible;
    complianceEngine.setHIRBVisible(next);
    document.getElementById('btn-hirb').classList.toggle('active', next);
  };
  document.getElementById('btn-hirb').addEventListener('click', toggleHIRB);
  document.getElementById('btn-toggle-hirb').addEventListener('click', toggleHIRB);

  const poolSel = document.getElementById('pool-preset');
  NZ_POOL_PRESETS.forEach(p => { const o = document.createElement('option'); o.value = p.id; o.textContent = p.name; poolSel.appendChild(o); });
  poolSel.value = poolEngine.config.presetId;
  poolSel.addEventListener('change', () => { poolEngine.updateConfig({ presetId: poolSel.value }); updateStatsUI(); });

  const finSel = document.getElementById('pool-finish');
  Object.entries(POOL_FINISHES).forEach(([k, v]) => { const o = document.createElement('option'); o.value = k; o.textContent = v.name; finSel.appendChild(o); });
  finSel.value = poolEngine.config.finishId;
  finSel.addEventListener('change', () => { poolEngine.updateConfig({ finishId: finSel.value }); updateStatsUI(); });

  const fenSel = document.getElementById('pool-fence');
  Object.entries(FENCE_TYPES).forEach(([k, v]) => { const o = document.createElement('option'); o.value = k; o.textContent = v.name; fenSel.appendChild(o); });
  fenSel.value = poolEngine.config.fenceType;
  fenSel.addEventListener('change', () => { poolEngine.updateConfig({ fenceType: fenSel.value }); updateStatsUI(); });

  const poolX = document.getElementById('pool-x');
  const poolZ = document.getElementById('pool-z');
  const poolPosLbl = document.getElementById('lbl-pool-pos');
  const onPoolMove = () => {
    const x = parseFloat(poolX.value), z = parseFloat(poolZ.value);
    poolPosLbl.textContent = `${x.toFixed(1)}, ${z.toFixed(1)} m`;
    poolEngine.updateConfig({ x, z });
    updateStatsUI();
  };
  poolX.addEventListener('input', onPoolMove);
  poolZ.addEventListener('input', onPoolMove);

  document.getElementById('chk-f9-zone').addEventListener('change', (e) => poolEngine.updateConfig({ showF9Zone: e.target.checked }));
  document.getElementById('chk-heat-pump').addEventListener('change', (e) => { poolEngine.updateConfig({ heatPump: e.target.checked }); updateStatsUI(); });

  renderCardsRail();
  updateCursorStyle();
  updateStatsUI();

  // Expose lightweight API for verification/testing
  window.__nzStudio = {
    terrainEngine,
    engine,
    propsEngine,
    archEngine,
    poolEngine,
    complianceEngine,
    photoMatch,
    camera,
    controls,
    getQuote: () => computeClientQuote(engine, propsEngine, { includeLabour: state.includeLabour, poolQuantities: poolEngine.getQuantities() }),
    updateStatsUI,
    setStage,
    setCamera: (px, py, pz, tx, ty, tz) => {
      camAnim = null;
      camera.position.set(px, py, pz);
      controls.target.set(tx, ty, tz);
      const _nowSec = performance.now() * 0.001;
    const _dtWow = Math.max(0.001, Math.min(0.05, _nowSec - _lastWowTime));
    _lastWowTime = _nowSec;
    engine.updateHeroTrees(_nowSec, state.windOn ? 0.85 : 0.0);
    wowAtmosphere.update(_dtWow, _nowSec, photoMatch.active);
    controls.update();
    },
    setPreset: (id) => { presetSelect.value = id; terrainEngine.applyPreset(id, true); },
    placeProp: (typeId, x, z) => { engine.pushUndoState(); propsEngine.addProp(typeId, x, z); updateStatsUI(); },
    setSunHour: (h) => { document.getElementById('sun-slider').value = h; updateNZSun(h); },
    setTab,
    setTool
  };

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  let lastFrameTime = performance.now();

  
  // URL modes (?embed=os, ?mode=siteplan, ?mode=photo, ?lat=&lon=) + OS postMessage bridge
  const params = new URLSearchParams(window.location.search);
  if (params.get("embed") === "os") {
    document.body.classList.add("is-os-embed");
  }
  const initMode = params.get("mode");
  if (initMode === "siteplan" || initMode === "plan") {
    sharedUniforms.uPlanMix.value = 1.0;
    document.getElementById("view-plan-btn")?.click();
  } else if (initMode === "photo") {
    photoMatch.loadPhotoDataURL(buildSampleBackyardPhotoDataUrl(), "NZ Coastal Backyard Sample").catch(() => {});
  }
  const qLat = parseFloat(params.get("lat"));
  const qLon = parseFloat(params.get("lon"));
  if (Number.isFinite(qLat) && Number.isFinite(qLon)) {
    terrainEngine.loadKeylessNZSite(params.get("project") || "Project Site", { lat: qLat, lon: qLon, label: params.get("project") || "Project Site" }).catch(() => {});
  }
  window.addEventListener("message", (ev) => {
    const d = ev?.data;
    if (!d || typeof d !== "object") return;
    if (d.type === "assembl:set-view") {
      if (d.mode === "siteplan" || d.mode === "plan") {
        sharedUniforms.uPlanMix.value = 1.0;
        document.getElementById("view-plan-btn")?.click();
      } else if (d.mode === "photo") {
        if (!photoMatch.hasPhoto) {
          photoMatch.loadPhotoDataURL(buildSampleBackyardPhotoDataUrl(), "NZ Coastal Backyard Sample").catch(() => {});
        } else {
          photoMatch.setActive(true);
        }
      } else {
        sharedUniforms.uPlanMix.value = 0.0;
        photoMatch.setActive(false);
        document.getElementById("view-3d-btn")?.click();
      }
    }
  });
  const splatEngine = new SplatScanEngine(scene, terrainEngine);
  document.getElementById("splat-file-input")?.addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const res = await splatEngine.loadFile(f);
      const st = document.getElementById("linz-status");
      if (st) st.textContent = `3DGS Scan loaded: ${res.name} (${res.count.toLocaleString()} splats)`;
    } catch (err) {
      const st = document.getElementById("linz-status");
      if (st) st.textContent = err?.message || "Could not load splat file.";
    }
  });
  document.getElementById("btn-demo-splat")?.addEventListener("click", () => {
    const res = splatEngine.loadDemoScan();
    const st = document.getElementById("linz-status");
    if (st) st.textContent = `Loaded ${res.name}`;
  });
  const wowAtmosphere = new WowAtmosphereEngine({
    scene, renderer, terrainEngine, sunLight, hemiLight, sky, sharedUniforms, canvasEl: renderer.domElement
  });
  let _lastWowTime = performance.now() * 0.001;
  document.querySelectorAll("[data-mood]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-mood]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const m = btn.dataset.mood || "daylight";
      wowAtmosphere.setMood(m, (hr) => {
        state.sunHour = hr;
        const sunInput = document.getElementById("sun-slider");
        if (sunInput) sunInput.value = String(hr);
        if (typeof updateSun === "function") updateSun();
      });
    });
  });
  const tuiBtn = document.getElementById("btn-fly-tui");
  const flyTui = () => {
    wowAtmosphere.triggerFlight();
    if (tuiBtn) { tuiBtn.classList.add("active"); setTimeout(() => tuiBtn.classList.remove("active"), 7800); }
  };
  tuiBtn?.addEventListener("click", flyTui);
  window.addEventListener("keydown", (ev) => {
    if (ev.key.toLowerCase() === "f" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
      flyTui();
    }
  });
  if (params.get("mood")) {
    const m = params.get("mood");
    document.querySelector(`[data-mood="${m}"]`)?.click();
  }
  window.__assemblStudio = { wowAtmosphere,  scene, camera, controls, terrainEngine, engine, archEngine, poolEngine, complianceEngine, photoMatch, sharedUniforms };

  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
    lastFrameTime = now;

    if (state.playingSeason) {
      const nextM = (sharedUniforms.uMonth.value + dt * 1.15) % 12;
      seasonSlider.value = nextM.toFixed(2);
      updateSeason(nextM);
    }

    if (camAnim) {
      camAnim.t = Math.min(1, camAnim.t + dt * 2.6);
      const ease = 1 - Math.pow(1 - camAnim.t, 3);
      camera.position.lerpVectors(camAnim.startPos, camAnim.endPos, ease);
      controls.target.lerpVectors(camAnim.startTarget, camAnim.endTarget, ease);
      if (camAnim.t >= 1) camAnim = null;
    }

    controls.update();
    renderer.render(scene, camera);
  });
}

// ── TERRAIN-CONFORMED ARCHITECTURAL NZ TERRACE (Stepping Pavers) ──────────────
function createArchitecturalDeckContext(scene, surfaceTextures, terrainEngine) {
  const deckGroup = new THREE.Group();

  const deckMat = new THREE.MeshStandardMaterial({
    map: surfaceTextures.kwila, roughness: 0.58, metalness: 0.04
  });
  const plinthMat = new THREE.MeshStandardMaterial({ color: 0x26292c, roughness: 0.88 });

  const deckMesh = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.16, 3.6), deckMat);
  deckMesh.receiveShadow = true;
  deckMesh.castShadow = true;
  deckGroup.add(deckMesh);

  const plinthMesh = new THREE.Mesh(new THREE.BoxGeometry(9.35, 3.2, 3.45), plinthMat);
  plinthMesh.receiveShadow = true;
  plinthMesh.castShadow = true;
  deckGroup.add(plinthMesh);

  const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(9.6, 1.8, 0.24), plinthMat);
  wallMesh.castShadow = true;
  wallMesh.receiveShadow = true;
  deckGroup.add(wallMesh);

  const paverMat = new THREE.MeshStandardMaterial({
    map: surfaceTextures.pavers, roughness: 0.76, metalness: 0.02
  });
  const stepPositions = [
    [-4.8, -5.2], [-4.5, -4.1], [-4.1, -3.0], [-3.6, -1.9],
    [-3.1, -0.8], [-2.7, 0.3], [-2.5, 1.4], [-2.6, 2.5], [-3.0, 3.6]
  ];
  const paverGeo = new THREE.BoxGeometry(0.85, 0.08, 0.48);
  const pavers = [];
  for (let i = 0; i < stepPositions.length; i++) {
    const [sx, sz] = stepPositions[i];
    const m = new THREE.Mesh(paverGeo, paverMat);
    m.rotation.y = Math.sin(i * 0.4) * 0.12;
    m.receiveShadow = true;
    m.castShadow = true;
    deckGroup.add(m);
    pavers.push({ mesh: m, x: sx, z: sz });
  }
  scene.add(deckGroup);

  function conformToTerrain() {
    const corners = [
      [-11.2, -9.6], [-1.8, -9.6], [-11.2, -6.0], [-1.8, -6.0], [-6.5, -7.8]
    ];
    let maxY = -Infinity;
    for (const [cx, cz] of corners) {
      maxY = Math.max(maxY, terrainEngine.getHeight(cx, cz));
    }
    const deckY = maxY + 0.10;
    deckMesh.position.set(-6.5, deckY, -7.8);
    plinthMesh.position.set(-6.5, deckY - 1.66, -7.8);
    wallMesh.position.set(-6.5, deckY + 0.85, -9.65);

    const n = new THREE.Vector3();
    for (const p of pavers) {
      const py = terrainEngine.getHeight(p.x, p.z);
      terrainEngine.getNormal(p.x, p.z, n);
      p.mesh.position.set(p.x, py + 0.015, p.z);
      p.mesh.rotation.x = Math.atan2(n.z, n.y) * 0.65;
      p.mesh.rotation.z = -Math.atan2(n.x, n.y) * 0.65;
    }
  }

  return { group: deckGroup, conformToTerrain };
}

// ── INITIAL SHOWCASE NZ PLANTING BED (Cleanly outside Pool 1.2m F9 NCZ!) ──────
function buildShowcaseNZGarden(engine, propsEngine) {
  // Winding Crushed Greywacke Chip (14mm) garden path (Channel 4)
  for (let z = -5.4; z <= 4.4; z += 0.65) {
    const x = -4.6 + Math.sin((z + 5.4) * 0.32) * 1.9;
    engine.paintSurfaceDisc(x, z, 1.45, 4, 0.96, 0.58);
  }
  // Firth Piazza 50 Pavers terrace apron beneath the Kwila deck (Channel 8)
  engine.paintSurfacePolygon([
    { x: -11.5, z: -10.0 }, { x: -1.5, z: -10.0 }, { x: -1.5, z: -5.4 }, { x: -11.5, z: -5.4 }
  ], 8, 0.15);

  // Decorative Waikato River Pebbles surround around water feature (Channel 6)
  engine.paintSurfaceDisc(-0.9, 5.4, 1.65, 6, 0.92, 0.55);

  // North edge sits cleanly south of z = -3.8 so pool at (5.8, -7.8) has ZERO F9 clashes on startup!
  const heroBedPts = [
    { x: -1.4, z: -3.6 },
    { x: 2.3, z: -3.7 },
    { x: 6.1, z: -3.3 },
    { x: 7.7, z: -0.5 },
    { x: 6.7, z: 3.3 },
    { x: 3.1, z: 5.0 },
    { x: -0.8, z: 4.4 },
    { x: -2.0, z: 1.5 },
    { x: -2.1, z: -1.6 }
  ];

  const showcaseMix = {
    id: 'coastal_native',
    name: 'Auckland Coastal & Summer Border',
    density: 4.6,
    species: [
      { id: 'pohutukawa', weight: 0.03, layer: 'canopy' },
      { id: 'nikau', weight: 0.04, layer: 'canopy' },
      { id: 'tikouka', weight: 0.04, layer: 'canopy' },
      { id: 'harakeke', weight: 0.10, layer: 'structure' },
      { id: 'silver_spear', weight: 0.09, layer: 'structure' },
      { id: 'platts_black', weight: 0.08, layer: 'structure' },
      { id: 'toetoe', weight: 0.10, layer: 'matrix' },
      { id: 'red_tussock', weight: 0.08, layer: 'matrix' },
      { id: 'carex_testacea', weight: 0.11, layer: 'matrix' },
      { id: 'libertia', weight: 0.08, layer: 'matrix' },
      { id: 'agapanthus', weight: 0.10, layer: 'flower' },
      { id: 'echinacea', weight: 0.08, layer: 'flower' },
      { id: 'lavender', weight: 0.07, layer: 'flower' }
    ]
  };
  engine.createBed(heroBedPts, showcaseMix, 'corten', 1.45, 0.72, 'Auckland Coastal Hero Bed');

  const fernBedPts = [
    { x: -9.8, z: -4.2 },
    { x: -6.2, z: -4.4 },
    { x: -5.4, z: -1.4 },
    { x: -6.5, z: 2.2 },
    { x: -9.6, z: 1.8 },
    { x: -10.6, z: -1.2 }
  ];
  engine.createBed(fernBedPts, NZ_COMPOSITIONS[1], 'macrocarpa', 1.35, 0.68, 'Native Fern Glade');

  // Anchor hero Nīkau Palm specimens framing the sunlit pavilion & pool
  engine._addPlant('nikau', 0.6, -2.1, 1);
  engine._addPlant('nikau', 4.4, -1.7, 1);
  engine._addPlant('nikau', -7.2, -2.6, 2);
  engine.syncInstances();

  // Pre-place architectural NZ Garden Features
  propsEngine.addProp('water_bowl', -0.9, 5.4, 0.0, 11);
  propsEngine.addProp('boulders', 5.5, 4.8, 0.6, 23);
  propsEngine.addProp('boulders', -5.6, 2.7, 2.1, 37);
  propsEngine.addProp('bollard_light', -2.1, -3.5, 0.0, 41);
  propsEngine.addProp('bollard_light', -2.0, 2.2, 0.0, 53);
}

init().catch(err => {
  console.error('assembl. Studio init error:', err);
  const b = document.getElementById('backend-badge');
  if (b) b.textContent = 'Init Error';
});
