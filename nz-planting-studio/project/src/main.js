import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SkyMesh } from 'three/addons/objects/SkyMesh.js';

import {
  NZ_PLANTS, NZ_SURFACES, NZ_EDGINGS, NZ_COMPOSITIONS,
  NZ_MONTHS, NZ_SEASONS
} from './data/nzPlants.js';
import { createNZSurfaceTextures } from './textures/proceduralTextures.js';
import { createSharedUniforms, createTerrainNodeMaterial } from './shaders/tslMaterials.js';
import { TerrainEngine, NZ_TERRAIN_PRESETS } from './engine/terrainEngine.js';
import { PlantingEngine } from './engine/plantingEngine.js';
import { GardenPropsEngine, NZ_GARDEN_PROPS } from './engine/gardenProps.js';
import { NZWildlifeEngine } from './engine/nzWildlife.js';

const TERRAIN_SIZE = 34;

// ── APP STATE ─────────────────────────────────────────────────────────────────
const state = {
  tool: 'paint-mix', // 'paint-mix' | 'paint-plant' | 'draw-bed' | 'paint-surface' | 'place-prop' | 'erase' | 'orbit'
  tab: 'compositions', // 'compositions' | 'plants' | 'surfaces' | 'props'
  plantCat: 'all',
  selectedCompositionId: NZ_COMPOSITIONS[0].id,
  selectedPlantId: 'agapanthus',
  selectedSurfaceChannel: 1,
  selectedPropId: 'water_bowl',
  selectedEdgingId: 'corten',
  brushRadius: 2.2,
  densityMult: 1.0,
  clumping: 0.72,
  windOn: true,
  birdsOn: true,
  handlesVisible: true,
  isPlanView: false,
  playingSeason: false,
  sunHour: 14.5,
  drawPoints: []
};

async function init() {
  const container = document.getElementById('canvas-wrap');

  // ── WEBGPU RENDERER (Three.js r187 with automatic WebGL2 fallback) ──────────
  const renderer = new WebGPURenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  container.appendChild(renderer.domElement);

  await renderer.init();

  const isWebGPU = Boolean(renderer.backend && renderer.backend.isWebGPUBackend);
  const badge = document.getElementById('backend-badge');
  badge.textContent = isWebGPU ? 'WebGPU' : 'WebGL2 Fallback';

  // ── SCENE, CAMERA & ORBIT CONTROLS ──────────────────────────────────────────
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x1b2329, 0.010);

  const camera = new THREE.PerspectiveCamera(44, window.innerWidth / window.innerHeight, 0.1, 240);
  camera.position.set(11.8, 9.4, 12.6);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.target.set(0, 0.55, 0);
  controls.maxPolarAngle = Math.PI * 0.485;
  controls.minDistance = 2.5;
  controls.maxDistance = 38;
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.ROTATE
  };

  // ── PHYSICAL SKY (SkyMesh) & NZ SOUTHERN HEMISPHERE SOLAR LIGHTING ──────────
  const sharedUniforms = createSharedUniforms();
  const sky = new SkyMesh();
  sky.scale.setScalar(180);
  sky.turbidity.value = 3.2;
  sky.rayleigh.value = 1.65;
  sky.mieCoefficient.value = 0.0045;
  sky.mieDirectionalG.value = 0.82;
  scene.add(sky);

  const sunLight = new THREE.DirectionalLight(0xfff5e4, 3.1);
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

  const hemiLight = new THREE.HemisphereLight(0xb8d4f0, 0x3b352a, 0.95);
  scene.add(hemiLight);

  const fillLight = new THREE.DirectionalLight(0x9ec5e8, 0.45);
  fillLight.position.set(-10, 8, 12);
  scene.add(fillLight);

  // ── TERRAIN, PLANTING, PROPS & WILDLIFE ENGINES ─────────────────────────────
  const terrainEngine = new TerrainEngine(scene, TERRAIN_SIZE, 96);
  const engine = new PlantingEngine(scene, sharedUniforms, TERRAIN_SIZE, 512, terrainEngine);
  const propsEngine = new GardenPropsEngine(scene, terrainEngine);
  engine.setPropsEngine(propsEngine);
  const wildlife = new NZWildlifeEngine(scene, terrainEngine, engine);

  const surfaceTextures = createNZSurfaceTextures();
  const terrainMat = createTerrainNodeMaterial(
    engine.splatTexA, engine.splatTexB, surfaceTextures, TERRAIN_SIZE
  );
  const terrainMesh = new THREE.Mesh(terrainEngine.geometry, terrainMat);
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);

  // Seamless outer NZ landscape horizon skirt sitting cleanly beneath sloped site edges
  const skirtTex = surfaceTextures.lawn.clone();
  skirtTex.repeat.set(42, 42);
  skirtTex.needsUpdate = true;
  const skirtGeom = new THREE.PlaneGeometry(240, 240);
  skirtGeom.rotateX(-Math.PI * 0.5);
  const skirtMesh = new THREE.Mesh(
    skirtGeom,
    new THREE.MeshStandardMaterial({ map: skirtTex, roughness: 0.95, metalness: 0.0 })
  );
  skirtMesh.receiveShadow = true;
  scene.add(skirtMesh);

  // Terrain-conformed Kwila Deck Terrace & Firth Stepping Pavers
  const deckContext = createArchitecturalDeckContext(scene, surfaceTextures, terrainEngine);

  function updateSkirtElevation() {
    let minH = Infinity;
    for (let i = 0; i < terrainEngine.heights.length; i++) {
      if (terrainEngine.heights[i] < minH) minH = terrainEngine.heights[i];
    }
    skirtMesh.position.y = Math.min(-0.04, minH - 0.18);
  }

  function updateSlopeReadout() {
    document.getElementById('slope-readout').textContent =
      `Avg ${terrainEngine.avgSlopeDeg.toFixed(1)}° · Max ${terrainEngine.maxSlopeDeg.toFixed(1)}°`;
    document.getElementById('site-status').textContent = terrainEngine.siteLabel;
  }

  function updateNZSun(hour) {
    state.sunHour = hour;
    // Southern Hemisphere solar path adjusted by site latitude (Auckland -36.85°S to Otago -45.03°S)
    const latRad = Math.abs(terrainEngine.siteLat) * (Math.PI / 180);
    const maxElev = Math.max(0.55, Math.min(1.25, 1.48 - latRad * 0.58));
    const dayProgress = (hour - 6.0) / 14.5; // 0..1
    const elevation = Math.max(0.05, Math.sin(Math.max(0, Math.min(1, dayProgress)) * Math.PI) * maxElev);
    const azimuth = (dayProgress - 0.5) * Math.PI * 1.18; // East -> North -> West
    const sunDir = new THREE.Vector3(
      -Math.sin(azimuth) * Math.cos(elevation),
      Math.sin(elevation),
      -Math.cos(azimuth) * Math.cos(elevation)
    ).normalize();

    sky.sunPosition.value.copy(sunDir);
    sunLight.position.copy(sunDir).multiplyScalar(26);
    sharedUniforms.uSunDir.value.copy(sunDir);

    const golden = 1.0 - Math.min(1.0, elevation / 0.45);
    const dusk = 1.0 - Math.min(1.0, Math.max(0, (elevation - 0.06) / 0.28));
    sunLight.color.setRGB(1.0, 0.95 - golden * 0.24, 0.88 - golden * 0.46);
    sunLight.intensity = 0.85 + Math.sin(elevation) * 2.75;
    hemiLight.intensity = 0.26 + Math.sin(elevation) * 0.80;
    fillLight.intensity = 0.18 + Math.sin(elevation) * 0.34;
    scene.fog.color.setRGB(
      0.16 + (1 - golden) * 0.48,
      0.20 + (1 - golden) * 0.50,
      0.26 + (1 - golden) * 0.52
    );

    // Warm Garden Bollard Lights glow dynamically at dusk/evening!
    propsEngine.updateDuskLighting(dusk);

    const hh = Math.floor(hour);
    const mm = Math.round((hour - hh) * 60);
    document.getElementById('sun-time-lbl').textContent =
      `${String(hh).padStart(2, '0')}:${String(mm === 60 ? 0 : mm).padStart(2, '0')}`;
  }

  // Re-conform all plants, bed edging, handles, deck, pavers, props & solar path on terrain change!
  terrainEngine.onChange(() => {
    updateSkirtElevation();
    deckContext.conformToTerrain();
    engine.rebuildEdgingMeshes();
    engine.syncInstances();
    propsEngine.regroundAll();
    updateNZSun(state.sunHour);
    updateSlopeReadout();
  });

  // ── TERRAIN-CONFORMED 3D BRUSH CURSOR & POLYGON BED PREVIEW ─────────────────
  const CURSOR_SEGS = 48;
  const brushLinePositions = new Float32Array((CURSOR_SEGS + 1) * 3);
  const brushCursorGeom = new THREE.BufferGeometry();
  brushCursorGeom.setAttribute('position', new THREE.BufferAttribute(brushLinePositions, 3));
  const brushCursorMat = new THREE.LineBasicMaterial({ color: 0x6ee7b7 });
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
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    for (const p of state.drawPoints) {
      const m = new THREE.Mesh(dotGeom, dotMat);
      m.position.set(p.x, terrainEngine.getHeight(p.x, p.z) + 0.09, p.z);
      drawPreviewGroup.add(m);
    }

    if (pts.length >= 2) {
      const linePts = pts.map(p => new THREE.Vector3(p.x, terrainEngine.getHeight(p.x, p.z) + 0.09, p.z));
      if (state.drawPoints.length >= 3) linePts.push(linePts[0].clone());
      const lineGeom = new THREE.BufferGeometry().setFromPoints(linePts);
      const lineMat = new THREE.LineBasicMaterial({ color: 0x7dd3fc });
      drawPreviewGroup.add(new THREE.Line(lineGeom, lineMat));
    }
  }

  // ── POPULATE SHOWCASE NZ ARCHITECTURAL GARDEN + PRE-PLACED NZ PROPS ─────────
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
    pointer.y = 1 - ((clientY - rect.top) / rect.height) * 2;
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
      'paint-mix': 0x6ee7b7,
      'paint-plant': 0xf472b6,
      'paint-surface': 0xfbbf24,
      'place-prop': 0xf59e0b,
      'erase': 0xf87171,
      'draw-bed': 0x38bdf8,
      'orbit': 0xffffff
    };
    brushCursorMat.color.setHex(colors[state.tool] || 0x6ee7b7);
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
  window.addEventListener('pointercancel', () => { isPainting = false; });

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

  const siteStatusEl = document.getElementById('site-status');

  const geoFileInput = document.getElementById('file-geojson');
  document.getElementById('btn-import-geojson').addEventListener('click', () => geoFileInput.click());
  geoFileInput.addEventListener('change', async () => {
    const f = geoFileInput.files && geoFileInput.files[0];
    if (!f) return;
    try {
      const text = await f.text();
      const res = terrainEngine.importGeoJSON(text);
      siteStatusEl.textContent = `Preview: ${res.count} parcel(s) · ${res.crs} · not survey scale`;
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
      siteStatusEl.textContent = `Imported 3D preview: ${res.filename} · large models are scaled to fit`;
    } catch (err) {
      siteStatusEl.textContent = `GLB error: ${err.message}`;
    }
    glbFileInput.value = '';
  });

  // ── EDGING, TOOL DOCK & BOTTOM TABS ─────────────────────────────────────────
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
      for (const s of NZ_SURFACES) {
        const card = document.createElement('div');
        card.className = 'card' + (s.channel === state.selectedSurfaceChannel ? ' active' : '');
        card.innerHTML = `
          <div class="surface-preview" style="background:${s.swatch}"></div>
          <div class="card-title">${s.name}</div>
          <div class="card-sub">${s.spec}</div>
          <div class="card-meta"><span>${s.brand}</span><span>~$${s.pricePerM2}/m²</span></div>
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

  // Sun, Birds, Wind, Handles, Plan/3D, Undo/Redo, Clear, Inspector
  document.getElementById('sun-slider').addEventListener('input', (e) => updateNZSun(parseFloat(e.target.value)));

  document.getElementById('btn-birds').addEventListener('click', (e) => {
    state.birdsOn = !state.birdsOn;
    e.currentTarget.classList.toggle('active', state.birdsOn);
    wildlife.setEnabled(state.birdsOn);
  });

  document.getElementById('btn-wind').addEventListener('click', (e) => {
    state.windOn = !state.windOn;
    e.currentTarget.classList.toggle('active', state.windOn);
    sharedUniforms.uWindStrength.value = state.windOn ? 0.85 : 0.0;
  });

  document.getElementById('btn-handles').addEventListener('click', (e) => {
    state.handlesVisible = !state.handlesVisible;
    e.currentTarget.classList.toggle('active', state.handlesVisible);
    engine.handleGroup.visible = state.handlesVisible;
  });

  const inspectorPanel = document.getElementById('inspector-panel');
  const inspectorButton = document.getElementById('btn-inspector');
  function setInspector(open) {
    inspectorPanel.classList.toggle('hidden', !open);
    inspectorButton.classList.toggle('active', open);
    inspectorButton.setAttribute('aria-expanded', String(open));
  }
  setInspector(!matchMedia('(max-width: 600px)').matches);
  inspectorButton.addEventListener('click', () => setInspector(inspectorPanel.classList.contains('hidden')));

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
    state.isPlanView = true;
    document.getElementById('btn-plan').classList.add('active');
    document.getElementById('btn-3d').classList.remove('active');
    transitionCamera(new THREE.Vector3(0, 23.0, 0.25), new THREE.Vector3(0, 0, 0));
  });
  document.getElementById('btn-3d').addEventListener('click', () => {
    state.isPlanView = false;
    document.getElementById('btn-3d').classList.add('active');
    document.getElementById('btn-plan').classList.remove('active');
    transitionCamera(new THREE.Vector3(11.8, 9.4, 12.6), new THREE.Vector3(0, 0.55, 0));
  });

  document.getElementById('btn-undo').addEventListener('click', () => { if (engine.undo()) updateStatsUI(); });
  document.getElementById('btn-redo').addEventListener('click', () => { if (engine.redo()) updateStatsUI(); });
  document.getElementById('btn-clear').addEventListener('click', () => {
    engine.clearAll();
    terrainEngine.clearOverlays();
    updateStatsUI();
  });

  // Keyboard shortcuts (ignore while typing in inputs)
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

  function updateStatsUI() {
    const s = engine.getStats();
    document.getElementById('stat-area').textContent = `${s.landscapedArea.toFixed(1)} m²`;
    const propsPart = s.totalProps > 0 ? ` · ${s.totalProps} features` : '';
    document.getElementById('stat-plants').textContent = `${s.totalPlants} plants${propsPart}`;
    document.getElementById('stat-cost').textContent = `$${Math.round(s.totalCost).toLocaleString()} NZD`;
    document.getElementById('bom-total').textContent = `$${Math.round(s.totalCost).toLocaleString()}`;

    const bom = document.getElementById('bom-list');
    if (s.schedule.length === 0) {
      bom.innerHTML = '<div class="card-sub">Paint on the terrain or draw a bed to build your NZ plant schedule.</div>';
      return;
    }
    bom.innerHTML = s.schedule.map(row => `
      <div class="bom-item">
        <span class="bom-swatch" style="background:${row.plant.swatch}"></span>
        <div class="bom-info">
          <div class="bom-name">${row.plant.maori}</div>
          <div class="bom-sub">${row.plant.grade} · $${row.plant.priceNZD.toFixed(0)}</div>
        </div>
        <div class="bom-qty">${row.count}×</div>
      </div>
    `).join('');
  }

  renderCardsRail();
  updateCursorStyle();
  updateStatsUI();

  // Expose lightweight API for verification/testing
  window.__nzStudio = {
    terrainEngine,
    engine,
    propsEngine,
    wildlife,
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

  let frames = 0;
  let lastFpsTime = performance.now();
  let lastFrameTime = performance.now();

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

    wildlife.update(dt);
    controls.update();
    renderer.render(scene, camera);

    frames++;
    if (now - lastFpsTime >= 600) {
      const fps = Math.round((frames * 1000) / (now - lastFpsTime));
      document.getElementById('fps-badge').textContent = `${fps} fps`;
      frames = 0;
      lastFpsTime = now;
    }
  });
}

// ── TERRAIN-CONFORMED ARCHITECTURAL NZ TERRACE (Kwila Deck + Plinth + Firth Pavers)
function createArchitecturalDeckContext(scene, surfaceTextures, terrainEngine) {
  const deckGroup = new THREE.Group();

  // Kwila timber deck + deep basalt foundation plinth so it never floats on steep slopes
  const deckMat = new THREE.MeshStandardMaterial({
    map: surfaceTextures.kwila, roughness: 0.58, metalness: 0.04
  });
  const plinthMat = new THREE.MeshStandardMaterial({ color: 0x2a2d30, roughness: 0.88 });

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

  // Firth Piazza Black Sands floating stepping pavers conformed to sloped terrain
  const paverMat = new THREE.MeshStandardMaterial({
    map: surfaceTextures.pavers, roughness: 0.78, metalness: 0.02
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
    // Anchor deck flush to highest corner under its footprint, with deep foundation skirt below
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
      // Subtly tilt paver with slope while keeping natural walking feel
      p.mesh.rotation.x = Math.atan2(n.z, n.y) * 0.65;
      p.mesh.rotation.z = -Math.atan2(n.x, n.y) * 0.65;
    }
  }

  return { group: deckGroup, conformToTerrain };
}

// ── INITIAL SHOWCASE NZ PLANTING BED + PRE-PLACED NZ GARDEN PROPS ─────────────
function buildShowcaseNZGarden(engine, propsEngine) {
  for (let z = -5.4; z <= 4.0; z += 0.7) {
    const x = -4.6 + Math.sin((z + 5.4) * 0.32) * 1.9;
    engine.paintSurfaceDisc(x, z, 1.35, 3, 0.95, 0.55);
  }
  engine.paintSurfacePolygon([
    { x: -11.5, z: -10.0 }, { x: -1.5, z: -10.0 }, { x: -1.5, z: -5.4 }, { x: -11.5, z: -5.4 }
  ], 2, 0.15);

  const heroBedPts = [
    { x: -1.2, z: -4.2 },
    { x: 2.2, z: -4.8 },
    { x: 5.8, z: -3.6 },
    { x: 7.4, z: -0.6 },
    { x: 6.4, z: 3.1 },
    { x: 3.0, z: 4.8 },
    { x: -0.6, z: 4.2 },
    { x: -1.8, z: 1.4 },
    { x: -1.9, z: -1.6 }
  ];

  const showcaseMix = {
    id: 'coastal_native',
    name: 'Auckland Coastal & Summer Border',
    density: 5.2,
    species: [
      { id: 'pohutukawa', weight: 0.05, layer: 'canopy' },
      { id: 'tikouka', weight: 0.06, layer: 'canopy' },
      { id: 'harakeke', weight: 0.12, layer: 'structure' },
      { id: 'silver_spear', weight: 0.10, layer: 'structure' },
      { id: 'platts_black', weight: 0.09, layer: 'structure' },
      { id: 'toetoe', weight: 0.12, layer: 'matrix' },
      { id: 'carex_testacea', weight: 0.10, layer: 'matrix' },
      { id: 'libertia', weight: 0.09, layer: 'matrix' },
      { id: 'agapanthus', weight: 0.10, layer: 'flower' },
      { id: 'echinacea', weight: 0.09, layer: 'flower' },
      { id: 'lavender', weight: 0.08, layer: 'flower' }
    ]
  };
  engine.createBed(heroBedPts, showcaseMix, 'corten', 1.35, 0.72, 'Auckland Coastal Hero Bed');

  const fernBedPts = [
    { x: -9.8, z: -4.2 },
    { x: -6.2, z: -4.4 },
    { x: -5.4, z: -1.4 },
    { x: -6.5, z: 2.2 },
    { x: -9.6, z: 1.8 },
    { x: -10.6, z: -1.2 }
  ];
  engine.createBed(fernBedPts, NZ_COMPOSITIONS[1], 'macrocarpa', 1.25, 0.68, 'Native Fern Glade');

  // Pre-place architectural NZ Garden Features so the garden feels rich & lived-in on Frame 1!
  propsEngine.addProp('water_bowl', -0.9, 5.2, 0.0, 11);      // Corten Steel Tūī Water Bowl
  propsEngine.addProp('boulders', 5.2, 4.6, 0.6, 23);         // Mossy Basalt/Schist boulder cluster 1
  propsEngine.addProp('boulders', -5.6, 2.7, 2.1, 37);        // Mossy Basalt/Schist boulder cluster 2
  propsEngine.addProp('bollard_light', -2.1, -3.5, 0.0, 41);  // Warm Garden Bollard Light 1 along path
  propsEngine.addProp('bollard_light', -2.0, 2.2, 0.0, 53);   // Warm Garden Bollard Light 2 along path
}

init().catch(err => {
  console.error('Aotearoa Planting Studio init error:', err);
  document.getElementById('backend-badge').textContent = 'Init Error';
});
