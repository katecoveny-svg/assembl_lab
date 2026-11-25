// Real-time interactive Three.js Aotearoa Architectural World Stage on /architecture/
// Renders an editorial, cutting-edge 3D NZ architectural precinct at the top of /architecture/ (and at #/studio):
//   - Contoured LINZ-style 1 m LiDAR coastal/ridge terrain with 1 m elevation lines + GPU survey point cloud
//   - Contemporary NZ timber & bronze-glazed civic/wharenui pavilion with exposed glulam portals, slatted cedar soffit,
//     Fresnel glazing, laser-cut Kōmiromiro/Ngaru cultural screens, and regenerated heritage brick context wing
//   - Live-morphing interior layouts (Banquet 180 · Auditorium/Hui 240 · Architectural Lounge)
//   - Live NZ cladding, joinery & lighting switcher with instant Cost ($ NZD) & Programme Lead-Time (+weeks) telemetry
//   - BIM / NZBC X-Ray mode (E2, B2, H1, F4 callouts + structural grid)
//   - Fluent Te Reo Māori + NZ English voice narration via /api/archipro-voice (ElevenLabs v4 Tāne, browser fallback)
//   - Drag-and-drop 2D Plan / Large PDF / IFC / GLB straight into the full WebGPU 3D Twin & Multi-Agent Studio

import { registerRoute, registerNav } from './modules.js';
import { putHandoff, keepBrand } from './handoff.js';
import { webglOk } from './model-view.js';

const THREE_URL = new URL('../../assets/vendor/three/three.module.min.js', import.meta.url).href;
const DROP_URL = '/plan-studio/twins/drop/';

// Illustrative NZ specification options shown on the live 3D stage (transparently labelled)
const STAGE_SPECS = {
  cladding: {
    cedar: { label: 'Oiled Western Red Cedar', hex: 0xa86f45, rough: 0.68, metal: 0.04, deltaNzd: 0, leadWks: 4, note: 'NZBC B2/E2 Zone B–D · penetrating oil' },
    blackcedar: { label: 'Black-Stained Cedar Shiplap', hex: 0x262120, rough: 0.64, metal: 0.06, deltaNzd: 6400, leadWks: 4, note: 'NZBC B2/E2 Zone B–E · stainless fixings' },
    colorsteel: { label: 'Charcoal Marine Ribbed Steel', hex: 0x35373b, rough: 0.42, metal: 0.55, deltaNzd: -8200, leadWks: 5, note: 'Marine trapezoidal rib · coastal Zone D/E' },
    chalk: { label: 'Warm Chalk Architectural Plaster', hex: 0xeae4dc, rough: 0.84, metal: 0.0, deltaNzd: 11500, leadWks: 6, note: 'Cavity plaster system · mineral silicate' },
  },
  joinery: {
    bronze: { label: 'Dark Bronze Anodised Low-E', hex: 0x3d3027, rough: 0.32, metal: 0.72, deltaNzd: 18500, leadWks: 9, note: 'Thermally broken aluminium · H1 R0.52' },
    black: { label: 'Matt Black Thermal Aluminium', hex: 0x18181a, rough: 0.38, metal: 0.58, deltaNzd: 0, leadWks: 6, note: 'Baseline thermally broken Low-E · H1 R0.50' },
    timber: { label: 'Clear Rimu / Engineered Timber', hex: 0x8d5b3c, rough: 0.56, metal: 0.05, deltaNzd: 29400, leadWks: 10, note: 'Warm timber sash joinery · H1 R0.58' },
  },
  layout: {
    banquet: { label: 'Banquet Hall (180–420 seats)', deltaNzd: 14200, leadWks: 5, note: 'Round linen banquet tables + warm pendants' },
    hui: { label: 'Auditorium / Hui (240–316 seats)', deltaNzd: 9600, leadWks: 4, note: 'Acoustic timber chairs + D1 accessible bays' },
    lounge: { label: 'Pavilion Lounge & Hospitality', deltaNzd: 22800, leadWks: 7, note: 'NZ wool bouclé sofas, oak tables & kitchen island' },
  },
  mood: {
    golden: { label: 'Golden Hour 18:45', sunEl: 13, sunAz: -52, skyTop: 0x241328, skyBot: 0xd98a5f, sunCol: 0xffb978, sunInt: 3.4, ambInt: 0.55, glow: 0.85 },
    noon: { label: 'Solar Noon 12:30', sunEl: 58, sunAz: 18, skyTop: 0x2a4563, skyBot: 0xc9d7df, sunCol: 0xfff6e8, sunInt: 3.8, ambInt: 0.85, glow: 0.3 },
    twilight: { label: 'Matariki Dusk 20:30', sunEl: -3, sunAz: -76, skyTop: 0x110815, skyBot: 0x4b2840, sunCol: 0x9b6b8e, sunInt: 0.45, ambInt: 0.28, glow: 1.85 },
  },
};

const BEATS = [
  { id: 'forecourt', label: '01 · Forecourt', eye: [25, 4.6, 31], look: [0, 3.2, -1], say: 'Kia ora, nau mai ki te whare hoahoa o Aotearoa. From live LINZ one-metre LiDAR contours and heritage brick context, we approach the circular forecourt and bronze-glazed wharenui hub.' },
  { id: 'foyer', label: '02 · Cultural Screen', eye: [6.5, 2.35, 16.2], look: [0, 3.1, 1.5], say: 'Along the glazed threshold, laser-cut Kōmiromiro and Ngaru screens filter the western sun while framing warm oiled cedar soffits and exposed glulam portals.' },
  { id: 'hall', label: '03 · Interior Fit-Out', eye: [0.4, 2.5, 8.6], look: [0, 2.2, -5.5], say: 'Inside the main hall, architects and clients walk through together, switching live between banquet, auditorium hui, and lounge fit-outs with instant New Zealand dollar cost and lead-time feedback.' },
  { id: 'aerial', label: '04 · LiDAR & Context', eye: [-34, 24, 38], look: [2, 1.5, -2], say: 'Every project sits on real New Zealand ground, combining LINZ LiDAR elevation, surrounding building outlines, native ponga and tī kōuka planting, and cited Building Code pre-checks.' },
];

function ensureStageCss() {
  if (typeof document === 'undefined' || document.querySelector('link[data-immersive-stage-css]')) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = new URL('../immersive-stage.css?v=1', import.meta.url).href;
  l.dataset.immersiveStageCss = '1';
  document.head.append(l);
}

const fmtNzd = (n) => {
  if (n === 0) return '$0 NZD (Baseline)';
  const sign = n > 0 ? '+' : '−';
  return `${sign}$${Math.abs(n).toLocaleString('en-NZ')} NZD`;
};

function terrainHeight(x, z) {
  const r = Math.hypot(x * 0.92, (z - 3) * 0.88);
  // Flat engineered pad under building + circular forecourt, gentle coastal ridge beyond
  const pad = Math.min(1, Math.max(0, (r - 18) / 14));
  const ridge = (Math.sin(x * 0.048 + 0.5) * Math.cos(z * 0.042 - 0.3) * 3.4 +
    Math.sin(x * 0.11 - z * 0.08) * 1.15 -
    Math.max(0, (z - 16) * 0.06));
  return ridge * pad * pad;
}

export function calcStageTelemetry(state) {
  const c = STAGE_SPECS.cladding[state.cladding] ?? STAGE_SPECS.cladding.cedar;
  const j = STAGE_SPECS.joinery[state.joinery] ?? STAGE_SPECS.joinery.bronze;
  const l = STAGE_SPECS.layout[state.layout] ?? STAGE_SPECS.layout.banquet;
  const delta = c.deltaNzd + j.deltaNzd + l.deltaNzd;
  const maxLead = Math.max(c.leadWks, j.leadWks, l.leadWks);
  const baseLead = 6;
  const delayWks = Math.max(0, maxLead - baseLead);
  const driver = maxLead === j.leadWks ? j.label : maxLead === l.leadWks ? l.label : c.label;
  return {
    delta,
    deltaText: fmtNzd(delta),
    maxLead,
    delayWks,
    delayText: delayWks === 0 ? 'On track · 0 days delay' : `+${delayWks} wk${delayWks > 1 ? 's' : ''} (+${delayWks * 5} work days)`,
    driver,
    notes: `${c.note} · ${j.note}`,
  };
}

let activeStop = null;

export async function mountImmersiveStage(host, ctx = {}, opts = { fullPage: false }) {
  if (!host || typeof document === 'undefined') return () => {};
  ensureStageCss();
  if (activeStop) { try { activeStop(); } catch { /* previous stage cleaned */ } activeStop = null; }

  const state = {
    cladding: 'cedar',
    joinery: 'bronze',
    layout: 'banquet',
    mood: 'golden',
    xray: false,
    beat: 'forecourt',
    narrating: false,
    fullscreen: !!opts.fullPage,
  };

  const can3d = webglOk();
  const tel0 = calcStageTelemetry(state);

  host.innerHTML = `
    <section class="arch-stage-bleed${opts.fullPage ? ' is-fullscreen' : ''}" aria-label="Interactive 3D New Zealand architectural showcase">
      <div class="arch-stage-shell">
        <div class="arch-stage-canvas-wrap">
          ${can3d ? '<canvas class="arch-stage-canvas" aria-label="Interactive 3D Aotearoa architectural twin — drag to orbit, scroll to zoom"></canvas>' : ''}
        </div>
        <div class="arch-stage-scrim"></div>

        <div class="arch-stage-overlay">
          <div class="arch-stage-copy">
            <p class="arch-stage-eyebrow"><span class="arch-stage-dot" aria-hidden="true"></span>AOTEAROA 3D ARCHITECTURAL ENGINE · THREE.JS LIVE</p>
            <h1 class="arch-stage-title">Architecture you can <em>walk inside</em> before it is built.</h1>
            <p class="arch-stage-lede">Ingest 2D plans, multi-sheet PDFs, IFCs and GLBs onto live LINZ LiDAR &amp; aerial ground — with cultural narrative, NZ Building Code checks, live client fit-out cost &amp; delay tracking, working drawings, photoreal fly-throughs and fluent te reo Māori narration.</p>
            <div class="arch-stage-ctas">
              <a class="arch-pill is-primary" href="${DROP_URL}?from=ops" data-stage-open-studio>Open Full WebGPU 3D Studio →</a>
              <button type="button" class="arch-pill" data-stage-voice aria-pressed="false">▶ Te Reo &amp; NZ Tour (Tāne)</button>
              <button type="button" class="arch-pill" data-stage-xray aria-pressed="false">LiDAR &amp; NZBC X-Ray</button>
              <button type="button" class="arch-pill" data-stage-fs aria-pressed="${opts.fullPage ? 'true' : 'false'}">${opts.fullPage ? 'Exit Fullscreen' : 'Expand 3D'}</button>
            </div>
            <label class="arch-stage-drop" tabindex="0">
              <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.ifc,.glb,.gltf,.json" hidden data-stage-file />
              <span class="arch-stage-drop-txt"><strong>Drop 2D Plan, Large PDF Set, IFC or GLB</strong> directly onto this 3D stage to build a twin with all 5 specialist agents.</span>
              <span class="arch-pill">Choose file</span>
            </label>
            <div class="arch-stage-truths">
              <span class="arch-chip">● Live Three.js PBR + LiDAR Contours</span>
              <span class="arch-chip">○ Illustrative NZ Spec &amp; Cost Demo</span>
              <span class="arch-chip">■ Agents prepare · People approve</span>
            </div>
          </div>

          <aside class="arch-stage-telemetry" aria-live="polite">
            <div class="arch-hud-card">
              <div class="arch-hud-kicker"><span>LIVE CLIENT SPECIFIER IMPACT</span><span data-hud-lead>Lead: ${tel0.maxLead} wks</span></div>
              <div class="arch-hud-metrics">
                <div>
                  <div class="arch-hud-val" data-hud-cost>${tel0.deltaText}</div>
                  <div class="arch-hud-sub">Variation vs baseline (excl. GST)</div>
                </div>
                <div>
                  <div class="arch-hud-val is-up" data-hud-delay>${tel0.delayText}</div>
                  <div class="arch-hud-sub" data-hud-driver>Critical path: ${tel0.driver}</div>
                </div>
              </div>
              <div class="arch-hud-note" data-hud-note>${tel0.notes}</div>
            </div>
          </aside>
        </div>

        <div class="arch-stage-dock">
          <div class="arch-dock-bar">
            <div class="arch-dock-group" role="group" aria-label="Camera views">
              <span class="arch-dock-label">Camera</span>
              ${BEATS.map((b, i) => `<button type="button" class="arch-mini-btn" data-beat="${b.id}" aria-pressed="${i === 0 ? 'true' : 'false'}">${b.label}</button>`).join('')}
            </div>

            <div class="arch-dock-group" role="group" aria-label="Live New Zealand architectural specifications">
              <span class="arch-dock-label">NZ Spec</span>
              <select class="arch-mini-select" aria-label="Exterior cladding" data-spec="cladding">
                ${Object.entries(STAGE_SPECS.cladding).map(([k, v]) => `<option value="${k}"${k === state.cladding ? ' selected' : ''}>Cladding: ${v.label}</option>`).join('')}
              </select>
              <select class="arch-mini-select" aria-label="Window and door joinery" data-spec="joinery">
                ${Object.entries(STAGE_SPECS.joinery).map(([k, v]) => `<option value="${k}"${k === state.joinery ? ' selected' : ''}>Joinery: ${v.label}</option>`).join('')}
              </select>
              <select class="arch-mini-select" aria-label="Interior fit-out layout" data-spec="layout">
                ${Object.entries(STAGE_SPECS.layout).map(([k, v]) => `<option value="${k}"${k === state.layout ? ' selected' : ''}>Fit-Out: ${v.label}</option>`).join('')}
              </select>
              <select class="arch-mini-select" aria-label="Aotearoa sun and lighting mood" data-spec="mood">
                ${Object.entries(STAGE_SPECS.mood).map(([k, v]) => `<option value="${k}"${k === state.mood ? ' selected' : ''}>Light: ${v.label}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="arch-stage-status">
            <span data-stage-msg>Drag to orbit 360° · Scroll to dolly · Use WASD / Arrows to walk · Drop any PDF, JPEG, IFC or GLB to launch your project</span>
            <span>Cultural motif screen: Kōmiromiro &amp; Ngaru (illustrative concept)</span>
          </div>
        </div>
      </div>
    </section>`;

  const root = host.querySelector('.arch-stage-bleed');
  const setMsg = (txt) => { const el = root?.querySelector('[data-stage-msg]'); if (el) el.textContent = txt; };

  const syncHud = () => {
    const t = calcStageTelemetry(state);
    const costEl = root.querySelector('[data-hud-cost]');
    const delayEl = root.querySelector('[data-hud-delay]');
    const leadEl = root.querySelector('[data-hud-lead]');
    const driverEl = root.querySelector('[data-hud-driver]');
    const noteEl = root.querySelector('[data-hud-note]');
    if (costEl) {
      costEl.textContent = t.deltaText;
      costEl.className = `arch-hud-val${t.delta > 0 ? ' is-up' : t.delta < 0 ? ' is-save' : ''}`;
    }
    if (delayEl) {
      delayEl.textContent = t.delayText;
      delayEl.className = `arch-hud-val${t.delayWks > 0 ? ' is-up' : ' is-save'}`;
    }
    if (leadEl) leadEl.textContent = `Lead: ${t.maxLead} wks`;
    if (driverEl) driverEl.textContent = `Critical path: ${t.driver}`;
    if (noteEl) noteEl.textContent = t.notes;
  };

  // File handoff straight into /plan-studio/twins/drop/
  const handoffFile = async (file) => {
    if (!file) return;
    setMsg(`Preparing ${file.name} for the 3D Twin Studio…`);
    try {
      if (ctx?.practice?.name) await keepBrand(ctx.practice.name).catch(() => {});
      const id = await putHandoff(file, file.name);
      location.href = `${DROP_URL}?handoff=${encodeURIComponent(id)}&from=ops`;
    } catch (err) {
      setMsg(`Could not pass file directly (${err?.message ?? 'storage full'}) — opening 3D Studio…`);
      setTimeout(() => { location.href = `${DROP_URL}?from=ops`; }, 700);
    }
  };

  root.querySelector('[data-stage-open-studio]')?.addEventListener('click', () => {
    if (ctx?.practice?.name) void keepBrand(ctx.practice.name).catch(() => {});
  });

  root.querySelector('[data-stage-file]')?.addEventListener('change', (e) => {
    const f = e.target.files?.[0];
    if (f) void handoffFile(f);
  });

  for (const ev of ['dragenter', 'dragover']) {
    root.addEventListener(ev, (e) => { e.preventDefault(); root.classList.add('is-dragover'); });
  }
  root.addEventListener('dragleave', () => root.classList.remove('is-dragover'));
  root.addEventListener('drop', (e) => {
    e.preventDefault();
    root.classList.remove('is-dragover');
    const f = e.dataTransfer?.files?.[0];
    if (f) void handoffFile(f);
  });

  // Fullscreen toggle
  let onResize = () => {};
  root.querySelector('[data-stage-fs]')?.addEventListener('click', (e) => {
    if (opts.fullPage && ctx?.navigate) { ctx.navigate('#/'); return; }
    state.fullscreen = !state.fullscreen;
    root.classList.toggle('is-fullscreen', state.fullscreen);
    e.currentTarget.setAttribute('aria-pressed', String(state.fullscreen));
    e.currentTarget.textContent = state.fullscreen ? 'Exit Fullscreen' : 'Expand 3D';
    setTimeout(onResize, 30);
  });

  let stopped = false;
  let audioEl = null;
  const stopVoice = () => {
    state.narrating = false;
    if (audioEl) { try { audioEl.pause(); audioEl.src = ''; } catch { /* ignore */ } audioEl = null; }
    try { globalThis.speechSynthesis?.cancel?.(); } catch { /* ignore */ }
    const btn = root?.querySelector('[data-stage-voice]');
    if (btn) { btn.setAttribute('aria-pressed', 'false'); btn.textContent = '▶ Te Reo & NZ Tour (Tāne)'; }
  };

  // ---- Build Three.js Scene ---------------------------------------------------------------------------------
  let sceneApi = null;
  if (can3d) {
    try {
      const THREE = await import(THREE_URL);
      if (stopped) return () => {};
      const canvas = root.querySelector('canvas');
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x211321, 0.0068);

      const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.25, 420);

      // Environment reflection map for realistic Fresnel glass & anodised bronze
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envScene = new THREE.Scene();
      const envSky = new THREE.Mesh(
        new THREE.SphereGeometry(40, 24, 16),
        new THREE.MeshBasicMaterial({ color: 0x9e7d8c, side: THREE.BackSide })
      );
      const envSun = new THREE.Mesh(
        new THREE.SphereGeometry(4, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xffd7a8 })
      );
      envSun.position.set(-18, 14, 16);
      envScene.add(envSky, envSun);
      const envRT = pmrem.fromScene(envScene, 0.04);
      scene.environment = envRT.texture;

      // Sky gradient dome
      const skyUniforms = {
        uTop: { value: new THREE.Color(STAGE_SPECS.mood.golden.skyTop) },
        uBot: { value: new THREE.Color(STAGE_SPECS.mood.golden.skyBot) },
      };
      const skyDome = new THREE.Mesh(
        new THREE.SphereGeometry(220, 32, 20),
        new THREE.ShaderMaterial({
          side: THREE.BackSide,
          depthWrite: false,
          uniforms: skyUniforms,
          vertexShader: `varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
          fragmentShader: `uniform vec3 uTop; uniform vec3 uBot; varying vec3 vPos;
            void main(){
              float h = clamp((normalize(vPos).y + 0.08) * 1.35, 0.0, 1.0);
              vec3 col = mix(uBot, uTop, pow(h, 0.72));
              gl_FragColor = vec4(col, 1.0);
            }`,
        })
      );
      scene.add(skyDome);

      // Lighting
      const hemi = new THREE.HemisphereLight(0xf6d8c6, 0x2a1d26, 0.55);
      const sun = new THREE.DirectionalLight(0xffb978, 3.4);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.left = -38;
      sun.shadow.camera.right = 38;
      sun.shadow.camera.top = 38;
      sun.shadow.camera.bottom = -38;
      sun.shadow.camera.near = 2;
      sun.shadow.camera.far = 140;
      sun.shadow.bias = -0.0005;
      scene.add(hemi, sun, sun.target);

      const hallGlow = new THREE.PointLight(0xffc98b, 18, 28, 1.5);
      hallGlow.position.set(0, 3.8, -1.5);
      const foyerGlow = new THREE.PointLight(0xffd4a3, 14, 20, 1.6);
      foyerGlow.position.set(0, 3.4, 8.2);
      scene.add(hallGlow, foyerGlow);

      // 1. Contoured LINZ 1 m LiDAR Terrain + Custom Contour Shader
      const tGeo = new THREE.PlaneGeometry(170, 170, 150, 150);
      tGeo.rotateX(-Math.PI / 2);
      const tPos = tGeo.attributes.position;
      for (let i = 0; i < tPos.count; i++) {
        tPos.setY(i, terrainHeight(tPos.getX(i), tPos.getZ(i)));
      }
      tGeo.computeVertexNormals();

      const lidarUniforms = { uScan: { value: 0 }, uXray: { value: 0 } };
      const terrainMat = new THREE.MeshStandardMaterial({ color: 0x3b4236, roughness: 0.94, metalness: 0.02 });
      terrainMat.onBeforeCompile = (sh) => {
        sh.uniforms.uScan = lidarUniforms.uScan;
        sh.uniforms.uXray = lidarUniforms.uXray;
        sh.vertexShader = `varying vec3 vWPos;\n` + sh.vertexShader.replace(
          '#include <worldpos_vertex>',
          `#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
        );
        sh.fragmentShader = `uniform float uScan;\nuniform float uXray;\nvarying vec3 vWPos;\n` + sh.fragmentShader.replace(
          '#include <dithering_fragment>',
          `float contour = abs(fract(vWPos.y + 0.5) - 0.5);
           float line1m = 1.0 - smoothstep(0.0, 0.045, contour);
           float dist = length(vWPos.xz);
           float ring = exp(-pow((dist - uScan) * 0.42, 2.0)) * smoothstep(75.0, 16.0, dist);
           vec3 cCol = mix(vec3(0.85, 0.73, 0.80), vec3(0.96, 0.84, 0.72), uXray);
           gl_FragColor.rgb = mix(gl_FragColor.rgb, cCol, line1m * (0.18 + 0.52 * uXray) + ring * (0.28 + 0.4 * uXray));
           #include <dithering_fragment>`
        );
      };
      const terrain = new THREE.Mesh(tGeo, terrainMat);
      terrain.receiveShadow = true;
      scene.add(terrain);

      // 2. LiDAR Aerial Point-Cloud Survey Particles around ridge & canopy
      const ptsCount = 2200;
      const ptsPos = new Float32Array(ptsCount * 3);
      const ptsCol = new Float32Array(ptsCount * 3);
      for (let i = 0; i < ptsCount; i++) {
        const a = (i * 2.39996) % (Math.PI * 2);
        const r = 20 + ((i * 17.3) % 58);
        const px = Math.cos(a) * r, pz = Math.sin(a) * r - 2;
        const py = terrainHeight(px, pz) + (((i * 7) % 10) < 3 ? 1.8 + ((i * 3.1) % 5.5) : 0.08);
        ptsPos[i * 3] = px; ptsPos[i * 3 + 1] = py; ptsPos[i * 3 + 2] = pz;
        const warm = 0.68 + ((i % 9) / 25);
        ptsCol[i * 3] = 0.88 * warm; ptsCol[i * 3 + 1] = 0.76 * warm; ptsCol[i * 3 + 2] = 0.82 * warm;
      }
      const pcGeo = new THREE.BufferGeometry();
      pcGeo.setAttribute('position', new THREE.BufferAttribute(ptsPos, 3));
      pcGeo.setAttribute('color', new THREE.BufferAttribute(ptsCol, 3));
      const pcMat = new THREE.PointsMaterial({ size: 0.22, vertexColors: true, transparent: true, opacity: 0.48, depthWrite: false });
      const pointCloud = new THREE.Points(pcGeo, pcMat);
      scene.add(pointCloud);

      // 3. Circular Paved Forecourt & Approach Path
      const forecourtMat = new THREE.MeshStandardMaterial({ color: 0xc9bfb2, roughness: 0.86, metalness: 0.02 });
      const forecourt = new THREE.Mesh(new THREE.CylinderGeometry(13.5, 13.8, 0.12, 56), forecourtMat);
      forecourt.position.set(2, 0.04, 18.5);
      forecourt.receiveShadow = true;
      const pathWalk = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.1, 16), forecourtMat);
      pathWalk.position.set(12, 0.03, 24);
      pathWalk.rotation.y = -0.52;
      pathWalk.receiveShadow = true;
      scene.add(forecourt, pathWalk);

      // 4. Main Contemporary Aotearoa Wharenui / Civic Hub Building
      const hub = new THREE.Group();
      scene.add(hub);

      const claddingMat = new THREE.MeshStandardMaterial({ color: STAGE_SPECS.cladding.cedar.hex, roughness: 0.68, metalness: 0.04 });
      const joineryMat = new THREE.MeshStandardMaterial({ color: STAGE_SPECS.joinery.bronze.hex, roughness: 0.32, metalness: 0.72 });
      const soffitMat = new THREE.MeshStandardMaterial({ color: 0xb5794b, roughness: 0.62, metalness: 0.05 });
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x242528, roughness: 0.44, metalness: 0.58 });
      const floorMat = new THREE.MeshStandardMaterial({ color: 0x9b958d, roughness: 0.38, metalness: 0.06 });
      const plasterMat = new THREE.MeshStandardMaterial({ color: 0xf1ece4, roughness: 0.82 });
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xd8c8be,
        transparent: true,
        opacity: 0.28,
        roughness: 0.06,
        metalness: 0.08,
        reflectivity: 0.95,
        clearcoat: 1.0,
        clearcoatRoughness: 0.08,
        envMapIntensity: 2.1,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      const W = 22, D = 26, wallH = 4.2, ridgeH = 8.4;

      // Floor slab + plinth
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(W + 1.2, 0.36, D + 1.6), floorMat);
      plinth.position.set(0, 0.18, -1);
      plinth.receiveShadow = true;
      plinth.castShadow = true;
      hub.add(plinth);

      // Side & rear walls in swappable NZ cladding
      const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.32, wallH, D), claddingMat);
      sideL.position.set(-W / 2, wallH / 2 + 0.36, -1);
      const sideR = new THREE.Mesh(new THREE.BoxGeometry(0.32, wallH, D), claddingMat);
      sideR.position.set(W / 2, wallH / 2 + 0.36, -1);
      const rearW = new THREE.Mesh(new THREE.BoxGeometry(W, wallH + 1.4, 0.35), claddingMat);
      rearW.position.set(0, (wallH + 1.4) / 2 + 0.36, -1 - D / 2);
      for (const m of [sideL, sideR, rearW]) { m.castShadow = true; m.receiveShadow = true; hub.add(m); }

      // Sweeping Gable Roof + Warm Slatted Timber Soffit with deep 3.4 m front canopy overhang
      const roofLen = D + 5.2;
      const slopeLen = Math.hypot(W / 2 + 1.3, ridgeH - wallH);
      const pitch = Math.atan2(ridgeH - wallH, W / 2 + 1.3);
      for (const s of [-1, 1]) {
        const wing = new THREE.Group();
        const rTop = new THREE.Mesh(new THREE.BoxGeometry(slopeLen, 0.16, roofLen), roofMat);
        rTop.position.y = 0.09;
        rTop.castShadow = true;
        rTop.receiveShadow = true;
        const rSof = new THREE.Mesh(new THREE.BoxGeometry(slopeLen - 0.08, 0.08, roofLen - 0.1), soffitMat);
        rSof.position.y = -0.03;
        wing.add(rTop, rSof);
        // Standing seam ribs
        for (let rz = -roofLen / 2 + 0.6; rz < roofLen / 2; rz += 1.2) {
          const rib = new THREE.Mesh(new THREE.BoxGeometry(slopeLen, 0.05, 0.04), roofMat);
          rib.position.set(0, 0.19, rz);
          wing.add(rib);
        }
        wing.rotation.z = -s * pitch;
        wing.position.set(s * (W / 2 + 1.3) * 0.5, wallH + 0.36 + (ridgeH - wallH) * 0.5, -0.3);
        hub.add(wing);
      }

      // Exposed Glulam Portal Frames inside & at entry
      for (let pz = -12; pz <= 12; pz += 4) {
        for (const s of [-1, 1]) {
          const col = new THREE.Mesh(new THREE.BoxGeometry(0.24, wallH, 0.42), soffitMat);
          col.position.set(s * (W / 2 - 0.35), wallH / 2 + 0.36, pz);
          col.castShadow = true;
          hub.add(col);
          const rafter = new THREE.Mesh(new THREE.BoxGeometry(slopeLen * 0.92, 0.34, 0.24), soffitMat);
          rafter.rotation.z = -s * pitch;
          rafter.position.set(s * (W / 2) * 0.48, wallH + 0.18 + (ridgeH - wallH) * 0.48, pz);
          hub.add(rafter);
        }
      }

      // Full-height Glazed Gable Curtainwall + Joinery Mullions + Kōmiromiro/Ngaru Cultural Screens
      const frontZ = 12.0;
      const gableShape = new THREE.Shape();
      gableShape.moveTo(-W / 2, 0);
      gableShape.lineTo(W / 2, 0);
      gableShape.lineTo(W / 2, wallH);
      gableShape.lineTo(0, ridgeH - 0.15);
      gableShape.lineTo(-W / 2, wallH);
      gableShape.closePath();
      const glassPane = new THREE.Mesh(new THREE.ShapeGeometry(gableShape), glassMat);
      glassPane.position.set(0, 0.36, frontZ);
      hub.add(glassPane);

      // Curtainwall mullions + bronze entry portal + Kōmiromiro/Ngaru laser-cut fin rhythm
      for (let mx = -W / 2; mx <= W / 2 + 0.01; mx += 1.833) {
        const topY = ridgeH - 0.15 - (Math.abs(mx) / (W / 2)) * (ridgeH - 0.15 - wallH);
        const mul = new THREE.Mesh(new THREE.BoxGeometry(0.09, topY, 0.18), joineryMat);
        mul.position.set(mx, 0.36 + topY / 2, frontZ + 0.03);
        mul.castShadow = true;
        hub.add(mul);

        // Decorative Kōmiromiro wave fins on outer bays
        if (Math.abs(mx) > 2.8 && Math.abs(mx) < W / 2 - 0.5) {
          const finH = topY * 0.72;
          const fin = new THREE.Mesh(new THREE.BoxGeometry(0.34, finH, 0.04), soffitMat);
          fin.position.set(mx + 0.45, 0.36 + finH * 0.55, frontZ + 0.14);
          fin.rotation.y = Math.sin(mx * 0.6) * 0.38;
          hub.add(fin);
        }
      }
      // Transom + entry canopy lintel
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.26, 0.9), joineryMat);
      lintel.position.set(0, 3.15, frontZ + 0.35);
      hub.add(lintel);

      // Interior Feature Gallery Wall, Mezzanine & Acoustic Batten Wall
      const galleryWall = new THREE.Mesh(new THREE.BoxGeometry(6.8, 3.6, 0.24), plasterMat);
      galleryWall.position.set(-5.8, 2.16, 4.8);
      const mezzSlab = new THREE.Mesh(new THREE.BoxGeometry(W - 0.8, 0.28, 6.5), plasterMat);
      mezzSlab.position.set(0, 3.85, -9.8);
      const mezzGlass = new THREE.Mesh(new THREE.BoxGeometry(W - 1.2, 1.05, 0.06), glassMat);
      mezzGlass.position.set(0, 4.5, -6.6);
      hub.add(galleryWall, mezzSlab, mezzGlass);

      // 5. Three Live-Morphing Interior Fit-Out Groups (Banquet, Hui/Auditorium, Lounge)
      const fitGroups = {
        banquet: new THREE.Group(),
        hui: new THREE.Group(),
        lounge: new THREE.Group(),
      };
      const linenMat = new THREE.MeshStandardMaterial({ color: 0xeae3d7, roughness: 0.85 });
      const oakMat = new THREE.MeshStandardMaterial({ color: 0xc59b6d, roughness: 0.55 });
      const seatMat = new THREE.MeshStandardMaterial({ color: 0x5c3d46, roughness: 0.78 });
      const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff0d6, emissive: 0xffbe73, emissiveIntensity: 1.6, roughness: 0.4 });

      // Banquet tables + chairs + warm pendants
      for (let row = 0; row < 4; row++) {
        for (let col = -2; col <= 2; col++) {
          const tx = col * 3.4, tz = 3.2 - row * 3.6;
          const tbl = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.96, 0.76, 20), linenMat);
          tbl.position.set(tx, 0.74, tz);
          tbl.castShadow = true;
          fitGroups.banquet.add(tbl);
          for (let c = 0; c < 8; c++) {
            const ca = (c / 8) * Math.PI * 2;
            const ch = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.78, 0.42), oakMat);
            ch.position.set(tx + Math.cos(ca) * 1.32, 0.75, tz + Math.sin(ca) * 1.32);
            ch.rotation.y = -ca;
            fitGroups.banquet.add(ch);
          }
          if ((row + col) % 2 === 0) {
            const pend = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 0.28, 16), lampMat);
            pend.position.set(tx, 4.6, tz);
            fitGroups.banquet.add(pend);
          }
        }
      }

      // Auditorium / Hui rows + stage dais
      const stageDais = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.42, 3.4), oakMat);
      stageDais.position.set(0, 0.57, -9.2);
      fitGroups.hui.add(stageDais);
      for (let r = 0; r < 8; r++) {
        for (let c = -6; c <= 6; c++) {
          if (c === 0) continue; // central aisle
          const seat = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.82, 0.52), seatMat);
          seat.position.set(c * 0.92 + (c > 0 ? 0.5 : -0.5), 0.77, 4.4 - r * 1.35);
          fitGroups.hui.add(seat);
        }
      }

      // Lounge & Hospitality island + bouclé sofas
      const island = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.92, 1.15), plasterMat);
      island.position.set(4.6, 0.82, -1.5);
      fitGroups.lounge.add(island);
      for (const [sx, sz, rot] of [[-3.8, 1.5, 0], [-3.8, -2.4, Math.PI], [-6.8, -0.45, Math.PI / 2], [3.6, 3.2, -0.4]]) {
        const sofa = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.76, 0.98), linenMat);
        sofa.position.set(sx, 0.74, sz);
        sofa.rotation.y = rot;
        fitGroups.lounge.add(sofa);
      }
      const coffee = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.38, 24), oakMat);
      coffee.position.set(-3.8, 0.55, -0.45);
      fitGroups.lounge.add(coffee);

      for (const [k, g] of Object.entries(fitGroups)) {
        g.visible = k === state.layout;
        hub.add(g);
      }

      // 6. Regenerated Heritage Red-Brick Context Wing (Campus / Urban Context)
      const chapel = new THREE.Group();
      const brickMat = new THREE.MeshStandardMaterial({ color: 0x9c5543, roughness: 0.86 });
      const slateMat = new THREE.MeshStandardMaterial({ color: 0xd8d2c9, roughness: 0.72 });
      const chBody = new THREE.Mesh(new THREE.BoxGeometry(9.2, 5.4, 17.5), brickMat);
      chBody.position.y = 2.7;
      chBody.castShadow = true;
      chBody.receiveShadow = true;
      const chRoofL = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.18, 18.1), slateMat);
      chRoofL.position.set(-2.35, 6.9, 0); chRoofL.rotation.z = 0.62;
      const chRoofR = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.18, 18.1), slateMat);
      chRoofR.position.set(2.35, 6.9, 0); chRoofR.rotation.z = -0.62;
      chapel.add(chBody, chRoofL, chRoofR);
      chapel.position.set(20.5, terrainHeight(20.5, 13.5), 13.5);
      chapel.rotation.y = -0.22;
      scene.add(chapel);

      // 7. Procedural NZ Native Flora (Tī kōuka, Harakeke, Ponga) + Dusk Uplights
      const swayNodes = [];
      const leafMat = new THREE.MeshStandardMaterial({ color: 0x5d7047, roughness: 0.72, side: THREE.DoubleSide });
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4b3c31, roughness: 0.92 });
      const plantSpots = [[-13.5, 15.5, 1.15], [-10.2, 19.2, 0.9], [11.8, 14.5, 1.05], [15.4, 21.8, 1.25], [-15.8, 6.2, 1.3], [14.6, 3.8, 1.0]];
      for (const [px, pz, sc] of plantSpots) {
        const pg = new THREE.Group();
        const py = terrainHeight(px, pz);
        pg.position.set(px, py, pz);
        // Tī kōuka stems + leaf heads
        for (const [ox, oz, h] of [[0, 0, 3.4 * sc], [0.28, 0.2, 2.7 * sc]]) {
          const st = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, h, 7), trunkMat);
          st.position.set(ox, h / 2, oz);
          st.castShadow = true;
          pg.add(st);
          const crown = new THREE.Group();
          crown.position.set(ox, h, oz);
          for (let b = 0; b < 14; b++) {
            const bl = new THREE.Mesh(new THREE.ConeGeometry(0.11, 1.25 * sc, 4), leafMat);
            const ba = (b / 14) * Math.PI * 2;
            bl.rotation.z = 0.55 + (b % 3) * 0.24;
            bl.rotation.y = ba;
            bl.position.set(Math.cos(ba) * 0.28, 0.2, Math.sin(ba) * 0.28);
            crown.add(bl);
          }
          pg.add(crown);
          swayNodes.push({ node: crown, phase: px * 0.7 + pz });
        }
        // Harakeke flax fan at base
        const flax = new THREE.Group();
        for (let f = 0; f < 11; f++) {
          const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.45 * sc, 0.02), leafMat);
          blade.position.y = 0.65 * sc;
          const wrap = new THREE.Group();
          wrap.rotation.y = (f / 11) * Math.PI * 2;
          wrap.rotation.z = 0.28 + (f % 3) * 0.16;
          wrap.add(blade);
          flax.add(wrap);
        }
        flax.position.set(0.8, 0, 0.6);
        pg.add(flax);
        swayNodes.push({ node: flax, phase: pz * 0.9 });
        scene.add(pg);
      }

      // 8. BIM / NZBC X-Ray Structural Grid & Wireframe Overlay
      const xrayGroup = new THREE.Group();
      xrayGroup.visible = false;
      const gridMat = new THREE.LineBasicMaterial({ color: 0xe8c9dc, transparent: true, opacity: 0.75 });
      for (let gx = -12; gx <= 12; gx += 6) {
        const pts = [new THREE.Vector3(gx, 0.42, -16), new THREE.Vector3(gx, 0.42, 16)];
        xrayGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
      }
      for (let gz = -14; gz <= 14; gz += 7) {
        const pts = [new THREE.Vector3(-14, 0.42, gz), new THREE.Vector3(14, 0.42, gz)];
        xrayGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
      }
      hub.traverse((o) => {
        if (o.isMesh && o.geometry) {
          const edges = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 24), new THREE.LineBasicMaterial({ color: 0xf6f1ed, transparent: true, opacity: 0.68 }));
          edges.position.copy(o.position);
          edges.rotation.copy(o.rotation);
          edges.scale.copy(o.scale);
          xrayGroup.add(edges);
        }
      });
      scene.add(xrayGroup);

      // Camera Orbit + Smooth Flight State
      const camCur = { eye: new THREE.Vector3(...BEATS[0].eye), look: new THREE.Vector3(...BEATS[0].look) };
      const camGoal = { eye: new THREE.Vector3(...BEATS[0].eye), look: new THREE.Vector3(...BEATS[0].look) };
      camera.position.copy(camCur.eye);
      camera.lookAt(camCur.look);

      const applyMood = (key) => {
        const m = STAGE_SPECS.mood[key] ?? STAGE_SPECS.mood.golden;
        skyUniforms.uTop.value.setHex(m.skyTop);
        skyUniforms.uBot.value.setHex(m.skyBot);
        scene.fog.color.setHex(m.skyTop);
        const el = (m.sunEl * Math.PI) / 180, az = (m.sunAz * Math.PI) / 180;
        sun.position.set(Math.sin(az) * Math.cos(el) * 65, Math.max(2, Math.sin(el) * 65), Math.cos(az) * Math.cos(el) * 65);
        sun.color.setHex(m.sunCol);
        sun.intensity = m.sunInt;
        hemi.intensity = m.ambInt;
        hallGlow.intensity = 20 * m.glow;
        foyerGlow.intensity = 15 * m.glow;
      };
      applyMood(state.mood);

      // Pointer orbit + wheel zoom + WASD walk
      let dragging = false, px0 = 0, py0 = 0;
      const keysDown = new Set();
      canvas.addEventListener('pointerdown', (e) => { dragging = true; px0 = e.clientX; py0 = e.clientY; canvas.setPointerCapture(e.pointerId); });
      canvas.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const dx = (e.clientX - px0) * 0.0055, dy = (e.clientY - py0) * 0.0045;
        px0 = e.clientX; py0 = e.clientY;
        const off = camGoal.eye.clone().sub(camGoal.look);
        const sph = new THREE.Spherical().setFromVector3(off);
        sph.theta -= dx;
        sph.phi = Math.max(0.14, Math.min(Math.PI * 0.47, sph.phi - dy));
        camGoal.eye.copy(camGoal.look).add(new THREE.Vector3().setFromSpherical(sph));
      });
      const endDrag = () => { dragging = false; };
      canvas.addEventListener('pointerup', endDrag);
      canvas.addEventListener('pointercancel', endDrag);
      canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const off = camGoal.eye.clone().sub(camGoal.look);
        const len = Math.max(4, Math.min(85, off.length() * (1 + Math.sign(e.deltaY) * 0.08)));
        camGoal.eye.copy(camGoal.look).add(off.setLength(len));
      }, { passive: false });

      const onKeyDown = (e) => {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName ?? '')) return;
        const k = e.key.toLowerCase();
        if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) keysDown.add(k);
      };
      const onKeyUp = (e) => keysDown.delete(e.key.toLowerCase());
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);

      onResize = () => {
        if (!canvas.parentElement) return;
        const w = Math.max(1, canvas.parentElement.clientWidth), h = Math.max(1, canvas.parentElement.clientHeight);
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      onResize();
      window.addEventListener('resize', onResize);

      const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
      let raf = 0, tPrev = performance.now();
      const tick = (now) => {
        if (stopped) return;
        raf = requestAnimationFrame(tick);
        const dt = Math.min(0.05, (now - tPrev) / 1000);
        tPrev = now;

        // WASD walk step
        if (keysDown.size) {
          const fwd = camGoal.look.clone().sub(camGoal.eye).setY(0).normalize();
          const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
          const step = 11 * dt;
          if (keysDown.has('w') || keysDown.has('arrowup')) { camGoal.eye.addScaledVector(fwd, step); camGoal.look.addScaledVector(fwd, step); }
          if (keysDown.has('s') || keysDown.has('arrowdown')) { camGoal.eye.addScaledVector(fwd, -step); camGoal.look.addScaledVector(fwd, -step); }
          if (keysDown.has('d') || keysDown.has('arrowright')) { camGoal.eye.addScaledVector(right, step); camGoal.look.addScaledVector(right, step); }
          if (keysDown.has('a') || keysDown.has('arrowleft')) { camGoal.eye.addScaledVector(right, -step); camGoal.look.addScaledVector(right, -step); }
        }

        const k = reduceMotion ? 1 : 1 - Math.exp(-dt * 4.5);
        camCur.eye.lerp(camGoal.eye, k);
        camCur.look.lerp(camGoal.look, k);
        camera.position.copy(camCur.eye);
        camera.lookAt(camCur.look);

        if (!reduceMotion) {
          const sec = now * 0.001;
          lidarUniforms.uScan.value = 14 + ((sec * 9.5) % 62);
          for (const sw of swayNodes) {
            sw.node.rotation.z = Math.sin(sec * 1.05 + sw.phase) * 0.035;
            sw.node.rotation.x = Math.cos(sec * 0.82 + sw.phase) * 0.025;
          }
        }
        lidarUniforms.uXray.value += ((state.xray ? 1 : 0) - lidarUniforms.uXray.value) * 0.12;
        renderer.render(scene, camera);
      };
      raf = requestAnimationFrame(tick);

      sceneApi = {
        goBeat(id) {
          const b = BEATS.find((x) => x.id === id) ?? BEATS[0];
          state.beat = b.id;
          camGoal.eye.set(...b.eye);
          camGoal.look.set(...b.look);
          root.querySelectorAll('[data-beat]').forEach((btn) => btn.setAttribute('aria-pressed', String(btn.dataset.beat === b.id)));
          return b;
        },
        setCladding(key) {
          const c = STAGE_SPECS.cladding[key]; if (!c) return;
          state.cladding = key;
          claddingMat.color.setHex(c.hex); claddingMat.roughness = c.rough; claddingMat.metalness = c.metal;
          syncHud();
        },
        setJoinery(key) {
          const j = STAGE_SPECS.joinery[key]; if (!j) return;
          state.joinery = key;
          joineryMat.color.setHex(j.hex); joineryMat.roughness = j.rough; joineryMat.metalness = j.metal;
          syncHud();
        },
        setLayout(key) {
          if (! STAGE_SPECS.layout[key]) return;
          state.layout = key;
          for (const [k, g] of Object.entries(fitGroups)) g.visible = k === key;
          syncHud();
        },
        setMood(key) {
          if (!STAGE_SPECS.mood[key]) return;
          state.mood = key;
          applyMood(key);
        },
        setXray(on) {
          state.xray = on;
          xrayGroup.visible = on;
          claddingMat.transparent = on;
          claddingMat.opacity = on ? 0.28 : 1;
          roofMat.transparent = on;
          roofMat.opacity = on ? 0.25 : 1;
          pointCloud.material.opacity = on ? 0.88 : 0.48;
          claddingMat.needsUpdate = roofMat.needsUpdate = true;
        },
        dispose() {
          cancelAnimationFrame(raf);
          window.removeEventListener('resize', onResize);
          window.removeEventListener('keydown', onKeyDown);
          window.removeEventListener('keyup', onKeyUp);
          envRT.dispose();
          pmrem.dispose();
          renderer.dispose();
        },
      };
    } catch (err) {
      setMsg(`3D stage fallback (${err?.message ?? 'WebGL unavailable'}) — click Open Full WebGPU 3D Studio above.`);
    }
  }

  // Wire UI buttons to live 3D scene
  root.addEventListener('click', (e) => {
    const beatBtn = e.target.closest('[data-beat]');
    if (beatBtn && sceneApi) {
      const b = sceneApi.goBeat(beatBtn.dataset.beat);
      setMsg(`${b.label} — ${b.say.slice(0, 118)}…`);
    }
  });

  root.addEventListener('change', (e) => {
    const sel = e.target.closest('[data-spec]');
    if (!sel) return;
    const kind = sel.dataset.spec, val = sel.value;
    if (kind === 'cladding') { state.cladding = val; sceneApi?.setCladding(val); }
    if (kind === 'joinery') { state.joinery = val; sceneApi?.setJoinery(val); }
    if (kind === 'layout') { state.layout = val; sceneApi?.setLayout(val); sceneApi?.goBeat('hall'); }
    if (kind === 'mood') { state.mood = val; sceneApi?.setMood(val); }
    syncHud();
  });

  root.querySelector('[data-stage-xray]')?.addEventListener('click', (e) => {
    state.xray = !state.xray;
    e.currentTarget.setAttribute('aria-pressed', String(state.xray));
    sceneApi?.setXray(state.xray);
    setMsg(state.xray ? 'LiDAR 1 m Contours + NZBC Structural Envelope X-Ray active (Clauses B2, E2, H1, F4).' : 'Photorealistic PBR timber, bronze glazing & native flora view.');
  });

  // Fluent Te Reo Māori + NZ English guided tour narration
  root.querySelector('[data-stage-voice]')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    if (state.narrating) { stopVoice(); setMsg('Narration stopped.'); return; }
    state.narrating = true;
    btn.setAttribute('aria-pressed', 'true');
    btn.textContent = '■ Stop Tāne Narration';

    for (const b of BEATS) {
      if (!state.narrating || stopped) break;
      sceneApi?.goBeat(b.id);
      setMsg(`Tāne speaking: “${b.say}”`);
      let played = false;
      try {
        const r = await fetch('/api/archipro-voice', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text: b.say, model: 'eleven_v4' }),
        });
        if (r.ok && (r.headers.get('content-type') || '').includes('audio')) {
          const blob = await r.blob();
          if (!state.narrating || stopped) break;
          const url = URL.createObjectURL(blob);
          audioEl = new Audio(url);
          await new Promise((res) => {
            audioEl.onended = () => { URL.revokeObjectURL(url); res(); };
            audioEl.onerror = () => { URL.revokeObjectURL(url); res(); };
            audioEl.play().catch(() => res());
          });
          played = true;
        }
      } catch { /* fallback to Web Speech */ }

      if (!played && state.narrating && !stopped) {
        await new Promise((res) => {
          if (typeof speechSynthesis !== 'undefined') {
            const u = new SpeechSynthesisUtterance(b.say);
            u.lang = 'en-NZ';
            u.rate = 0.98;
            u.onend = () => res();
            u.onerror = () => res();
            speechSynthesis.speak(u);
          } else {
            setTimeout(res, 4200);
          }
        });
      }
    }
    if (!stopped) stopVoice();
  });

  const cleanup = () => {
    stopped = true;
    stopVoice();
    sceneApi?.dispose();
    if (activeStop === cleanup) activeStop = null;
  };
  activeStop = cleanup;
  return cleanup;
}

// Register #/studio full-viewport 3D route and top navigation link in /architecture/
const STUDIO_ICON = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.5 3 7.2v9.6l9 4.7 9-4.7V7.2L12 2.5Z"/><path d="M3 7.2 12 12l9-4.8M12 12v9.5"/></svg>';
registerNav({ id: 'studio', label: '3D Studio', hash: '#/studio', order: 1, icon: STUDIO_ICON });
registerRoute('studio', {
  title: '3D Studio',
  render(el, ctx) {
    return mountImmersiveStage(el, ctx, { fullPage: true });
  },
});
