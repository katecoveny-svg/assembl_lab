// Real-time Three.js Aotearoa Coastal Pavilion Stage on /architecture/
// Fearon Hay / Herbst / Patterson-calibre architectural 3D craft & tactile usability:
//   - 1024px procedural PBR textures (albedo + roughness + bump): oiled & charred Western Red Cedar shiplap,
//     slatted cedar/oak soffit, board-formed shuttered concrete, honed Waikato aggregate, veincut travertine slabs,
//     Kwila hardwood decking, Firth Black Sands pavers, Daltons black bark mulch & Waikato river pebbles
//   - Expressed dark-bronze 200UC steel H-columns with bolted baseplates, recessed shadow-gap soffit rebates,
//     slatted cedar brise-soleil screens & overhead skylight/pergola sun-louvres casting crisp diagonal sun-bars,
//     board-formed concrete fireplace hearth with flickering architectural fire-glow slot,
//     and infinity-edge dark Auckland basalt reflecting pool with real-time planar WebGLRenderTarget mirror reflection
//   - Curated .glb furniture, lighting, kitchen, terrace & native manu streamed from /plan-studio/library/glb/
//     with per-part PBR material assignment (wool bouclé, ash/oak/rimu, brushed brass, travertine, botanical foliage)
//   - Volumetric 3D Aotearoa coastal headland flora (BotanicalMeshBuilder V-keeled blades, branched Pōhutukawa,
//     multi-headed Tī kōuka, silver-backed Ponga, Nīkau, Carex testacea, Astelia Silver Spear & swaying Toetoe)
//   - True first-person collision-aware Walk mode (1.68 m human eye-level, WASD/Arrows, pointer-drag mouselook,
//     continuous floor elevation tracking from forecourt steps onto +0.30 m terrace/pavilion, reduced-motion safe)

import { registerRoute, registerNav } from './modules.js';
import { putHandoff, keepBrand } from './handoff.js';
import { webglOk, meshesOf } from './model-view.js';

const THREE_URL = new URL('../../assets/vendor/three/three.module.min.js', import.meta.url).href;
const DROP_URL = '/plan-studio/twins/drop/';

// Progressive enhancement for Popover in older browsers
if (typeof HTMLElement !== 'undefined' && !Object.hasOwn(HTMLElement.prototype, 'popover')) {
  import('https://unpkg.com/@oddbird/popover-polyfill@latest/dist/popover.min.js').catch(() => {});
}

export const STAGE_SPECS = {
  cladding: {
    cedar: { label: 'Oiled Western Red Cedar', swatch: '#A97146', hex: 0xc89268, tex: 'cedar', rough: 0.62, metal: 0.02, deltaNzd: 0, leadWks: 4, note: 'NZBC B2/E2 cavity shiplap · penetrating oil' },
    blackcedar: { label: 'Charred Vulcan Cedar', swatch: '#282423', hex: 0x3b3635, tex: 'charred', rough: 0.58, metal: 0.04, deltaNzd: 6400, leadWks: 4, note: 'NZBC B2/E2 Zone B–E · 316 stainless fixings' },
    chalk: { label: 'Honed Aggregate Concrete', swatch: '#CBC5BB', hex: 0xd8d2c8, tex: 'concrete', rough: 0.76, metal: 0.02, deltaNzd: 11500, leadWks: 6, note: 'Precast / insitu Waikato aggregate · H1 thermal mass' },
    colorsteel: { label: 'Marine Standing-Seam', swatch: '#373A3E', hex: 0x42464b, tex: 'seam', rough: 0.38, metal: 0.62, deltaNzd: -8200, leadWks: 5, note: 'Coastal Zone D/E standing-seam tray' },
  },
  joinery: {
    bronze: { label: 'Dark Bronze Anodised', hex: 0x382c24, rough: 0.26, metal: 0.82, deltaNzd: 18500, leadWks: 9, note: 'Thermally broken Low-E · H1 R0.54' },
    black: { label: 'Matt Black Thermal', hex: 0x17181a, rough: 0.32, metal: 0.72, deltaNzd: 0, leadWks: 6, note: 'Baseline thermally broken Low-E · H1 R0.50' },
    timber: { label: 'Clear Rimu / Accoya', hex: 0x8d5f3e, rough: 0.52, metal: 0.04, deltaNzd: 29400, leadWks: 10, note: 'Engineered timber sash · H1 R0.58' },
  },
  layout: {
    lounge: { short: 'Living', label: 'Coastal Living & Kitchen', deltaNzd: 22800, leadWks: 7 },
    banquet: { short: 'Dining', label: 'Long-Table Hospitality', deltaNzd: 14200, leadWks: 5 },
    hui: { short: 'Studio', label: 'Open Wānanga / Gallery', deltaNzd: 9600, leadWks: 4 },
  },
};

const SHOTS = [
  { id: 'arrival', label: 'Arrival', eye: [17.8, 2.88, 18.8], look: [-0.8, 1.98, 0.7] },
  { id: 'courtyard', label: 'Mirror Pool', eye: [-10.9, 1.82, 14.4], look: [1.1, 2.02, -0.4] },
  { id: 'interior', label: 'Interior', eye: [6.0, 1.98, 4.95], look: [-2.3, 1.56, -1.5] },
  { id: 'aerial', label: 'Site', eye: [27.8, 16.0, 26.8], look: [0, 1.45, 0.4] },
];

const WALK_EYE_HEIGHT = 1.68;

function ensureStageCss() {
  if (typeof document === 'undefined' || document.querySelector('link[data-immersive-stage-css], link[href*="immersive-stage.css"]')) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = new URL('../immersive-stage.css?v=3', import.meta.url).href;
  l.dataset.immersiveStageCss = '1';
  document.head.append(l);
}

const fmtNzd = (n) => {
  if (n === 0) return '$0 NZD (Baseline)';
  const sign = n > 0 ? '+' : '−';
  return `${sign}$${Math.abs(n).toLocaleString('en-NZ')} NZD`;
};

const fmtCompactNzd = (n) => {
  if (n === 0) return 'Baseline';
  const sign = n > 0 ? '+' : '−';
  return `${sign}$${(Math.abs(n) / 1000).toFixed(1).replace(/\.0$/, '')}k`;
};

export function calcStageTelemetry(state) {
  const c = STAGE_SPECS.cladding[state.cladding] ?? STAGE_SPECS.cladding.cedar;
  const j = STAGE_SPECS.joinery[state.joinery] ?? STAGE_SPECS.joinery.bronze;
  const l = STAGE_SPECS.layout[state.layout] ?? STAGE_SPECS.layout.lounge;
  const delta = c.deltaNzd + j.deltaNzd + l.deltaNzd;
  const maxLead = Math.max(c.leadWks, j.leadWks, l.leadWks);
  const baseLead = 6;
  const delayWks = Math.max(0, maxLead - baseLead);
  const driver = maxLead === j.leadWks ? j.label : maxLead === l.leadWks ? l.label : c.label;
  return {
    delta,
    deltaText: fmtNzd(delta),
    compactText: `${fmtCompactNzd(delta)} · ${delayWks === 0 ? '0w' : `+${delayWks}w`}`,
    maxLead,
    delayWks,
    delayText: delayWks === 0 ? 'On track · 0 days delay' : `+${delayWks} wk${delayWks > 1 ? 's' : ''} (+${delayWks * 5} work days)`,
    driver,
    notes: `${c.label} · ${j.label}`,
  };
}

// ---- Coastal Headland Landform, Floor Elevation & Walk Collisions ----------------------------------------
function terrainHeight(x, z) {
  const inPadX = Math.max(0, Math.abs(x) - 13.8) / 14;
  const inPadZ = Math.max(0, Math.abs(z - 2.6) - 12.6) / 14;
  const padMask = Math.min(1, Math.hypot(inPadX, inPadZ));
  const smooth = padMask * padMask * (3 - 2 * padMask);
  const ridgeBack = Math.max(0, -z - 8) * 0.165;
  const coastalFall = Math.max(0, z - 15) * -0.095;
  const undulation =
    Math.sin(x * 0.055 + 0.4) * Math.cos(z * 0.048 - 0.2) * 2.55 +
    Math.sin(x * 0.12 - z * 0.09) * 0.72;
  return (ridgeBack + coastalFall + undulation) * smooth - 0.18;
}

// Smooth floor elevation tracker for 1.68 m first-person walkthrough (forecourt -> floating steps -> +0.30 m pavilion & Kwila deck)
function floorElevation(x, z) {
  // Basalt stepping pavers across eastern end of reflecting pool
  if (x >= 2.05 && x <= 3.35 && z >= 4.2 && z <= 10.65) {
    if (z <= 4.8) return 0.3;
    if (z >= 10.2) return 0.02;
    return 0.24;
  }
  // Wide floating arrival steps from Firth Black Sands forecourt apron up onto Kwila terrace
  if (x >= 4.7 && x <= 9.3 && z >= 8.75 && z <= 11.45) {
    const t = Math.max(0, Math.min(1, (11.35 - z) / (11.35 - 8.85)));
    return -0.10 + t * 0.40;
  }
  // Interior travertine pavilion slab + cantilevered Kwila terrace deck (+0.30 m)
  if (x >= -8.25 && x <= 10.1 && z >= -5.05 && z <= 4.25) return 0.3;
  if (x >= 3.55 && x <= 10.1 && z >= 4.15 && z <= 8.95) return 0.3;
  // Forecourt Firth Black Sands arrival apron
  if (x >= 1.8 && x <= 10.2 && z >= 10.4 && z <= 13.2) return -0.10;
  return terrainHeight(x, z);
}

// 2D AABB colliders for smooth wall/pool sliding in Walk mode [minX, maxX, minZ, maxZ]
const WALK_COLLIDERS = [
  [-8.45, 8.7, -5.28, -4.72], // Rear north-west spine wall
  [-8.48, -7.94, -5.25, 6.26], // Left gallery wing outer wall
  [-8.45, -3.3, 5.76, 6.32], // Gallery courtyard brise-soleil return wall
  [8.22, 8.68, -5.15, -0.75], // Right recessed blade wall (south of open corner slider)
  [-4.35, -0.05, -2.72, -1.72], // Board-formed concrete fireplace hearth core & floating bench
  [2.64, 3.0, -5.0, -0.68], // Interior plaster gallery partition
  [3.25, 7.15, -2.85, -1.55], // Waterfall travertine kitchen island
  [-3.1, 0.95, 3.96, 4.24], // Closed left glazing bay (open threshold at x: 0.95 .. 3.45 & 5.95 .. 8.2)
  [3.45, 5.95, 3.96, 4.24], // Closed mid glazing panel
  [-8.3, 1.98, 4.28, 10.5], // Reflecting pool deep water basin (west of stepping pavers)
  [3.38, 3.68, 5.65, 10.5], // Pool eastern weir wall between pavers & deck
];

function resolveWalkCollision(x, z, r = 0.34) {
  let rx = Math.max(-24, Math.min(24, x));
  let rz = Math.max(-18, Math.min(24, z));
  for (let pass = 0; pass < 2; pass++) {
    for (const [x0, x1, z0, z1] of WALK_COLLIDERS) {
      const cx = Math.max(x0, Math.min(x1, rx));
      const cz = Math.max(z0, Math.min(z1, rz));
      const dx = rx - cx;
      const dz = rz - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 > 1e-6) {
          const d = Math.sqrt(d2);
          rx = cx + (dx / d) * r;
          rz = cz + (dz / d) * r;
        } else {
          // Inside box: push out along shallowest axis
          const dl = Math.abs(rx - x0), dr = Math.abs(x1 - rx);
          const db = Math.abs(rz - z0), df = Math.abs(z1 - rz);
          const m = Math.min(dl, dr, db, df);
          if (m === dl) rx = x0 - r;
          else if (m === dr) rx = x1 + r;
          else if (m === db) rz = z0 - r;
          else rz = z1 + r;
        }
      }
    }
  }
  return [rx, rz];
}

// ---- Deterministic PRNG & Procedural Architectural / NZ Hardscape PBR Textures ---------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeTex(THREE, canvas, rx, ry, isColor) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.anisotropy = 8;
  if (isColor) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

function buildCedarPbr(THREE, charred = false) {
  const S = 1024;
  const aC = document.createElement('canvas'), rC = document.createElement('canvas'), bC = document.createElement('canvas');
  aC.width = aC.height = rC.width = rC.height = bC.width = bC.height = S;
  const a = aC.getContext('2d'), r = rC.getContext('2d'), b = bC.getContext('2d');
  const boards = 16, bw = S / boards;
  const rand = mulberry32(charred ? 912 : 419);
  for (let i = 0; i < boards; i++) {
    const x = i * bw;
    const v = (rand() - 0.5) * 24;
    const cr = charred ? 40 + v * 0.32 : 158 + v;
    const cg = charred ? 37 + v * 0.32 : 110 + v * 0.78;
    const cb = charred ? 36 + v * 0.32 : 74 + v * 0.54;
    a.fillStyle = `rgb(${cr | 0},${cg | 0},${cb | 0})`;
    a.fillRect(x, 0, bw, S);
    const rv = charred ? 172 + (i % 4) * 10 : 148 + (i % 4) * 12;
    r.fillStyle = `rgb(${rv},${rv},${rv})`;
    r.fillRect(x, 0, bw, S);
    b.fillStyle = 'rgb(218,218,218)';
    b.fillRect(x, 0, bw, S);
    // Fine longitudinal timber fibres & cathedral grain hints
    for (let f = 0; f < 34; f++) {
      const fx = x + 4 + rand() * (bw - 8);
      a.fillStyle = charred ? 'rgba(12,10,10,0.34)' : f % 3 === 0 ? 'rgba(205,152,108,0.14)' : 'rgba(66,38,20,0.16)';
      a.fillRect(fx, 0, 1.3, S);
      b.fillStyle = 'rgba(148,148,148,0.32)';
      b.fillRect(fx, 0, 1.1, S);
    }
    // Crisp architectural shiplap shadow-gap rebate
    a.fillStyle = 'rgba(12,9,7,0.88)';
    a.fillRect(x, 0, 5, S);
    r.fillStyle = 'rgb(248,248,248)';
    r.fillRect(x, 0, 5, S);
    b.fillStyle = 'rgb(16,16,16)';
    b.fillRect(x, 0, 5, S);
    // Subtle arris highlight next to shadow gap
    a.fillStyle = charred ? 'rgba(110,105,100,0.18)' : 'rgba(225,178,136,0.22)';
    a.fillRect(x + 5, 0, 2, S);
  }
  return {
    map: makeTex(THREE, aC, 3.6, 2.0, true),
    roughnessMap: makeTex(THREE, rC, 3.6, 2.0, false),
    bumpMap: makeTex(THREE, bC, 3.6, 2.0, false),
  };
}

function buildSlattedSoffitPbr(THREE) {
  const S = 1024;
  const aC = document.createElement('canvas'), bC = document.createElement('canvas');
  aC.width = aC.height = bC.width = bC.height = S;
  const a = aC.getContext('2d'), b = bC.getContext('2d');
  const battens = 24, bw = S / battens;
  const rand = mulberry32(733);
  a.fillStyle = '#140f0c';
  a.fillRect(0, 0, S, S);
  b.fillStyle = 'rgb(18,18,18)';
  b.fillRect(0, 0, S, S);
  for (let i = 0; i < battens; i++) {
    const x = i * bw + 4;
    const w = bw - 6;
    const v = (rand() - 0.5) * 20;
    a.fillStyle = `rgb(${(184 + v) | 0},${(136 + v * 0.78) | 0},${(92 + v * 0.55) | 0})`;
    a.fillRect(x, 0, w, S);
    b.fillStyle = 'rgb(228,228,228)';
    b.fillRect(x, 0, w, S);
    for (let k = 0; k < 14; k++) {
      const gx = x + rand() * w;
      a.fillStyle = 'rgba(84,48,22,0.14)';
      a.fillRect(gx, 0, 1.2, S);
    }
  }
  return {
    map: makeTex(THREE, aC, 4.5, 3.0, true),
    bumpMap: makeTex(THREE, bC, 4.5, 3.0, false),
  };
}

function buildBoardFormedConcretePbr(THREE) {
  const S = 1024;
  const aC = document.createElement('canvas'), rC = document.createElement('canvas'), bC = document.createElement('canvas');
  aC.width = aC.height = rC.width = rC.height = bC.width = bC.height = S;
  const a = aC.getContext('2d'), r = rC.getContext('2d'), b = bC.getContext('2d');
  const rand = mulberry32(512);
  const rows = 10, rh = S / rows;
  a.fillStyle = '#9f998f';
  a.fillRect(0, 0, S, S);
  r.fillStyle = 'rgb(198,198,198)';
  r.fillRect(0, 0, S, S);
  b.fillStyle = 'rgb(142,142,142)';
  b.fillRect(0, 0, S, S);
  for (let row = 0; row < rows; row++) {
    const y = row * rh;
    const tone = (rand() - 0.5) * 18;
    a.fillStyle = `rgb(${(156 + tone) | 0},${(151 + tone) | 0},${(142 + tone) | 0})`;
    a.fillRect(0, y, S, rh);
    b.fillStyle = `rgb(${(148 + tone) | 0},${(148 + tone) | 0},${(148 + tone) | 0})`;
    b.fillRect(0, y, S, rh);
    // Horizontal rough-sawn timber shuttering grain transferred into cast concrete
    for (let g = 0; g < 38; g++) {
      const gy = y + 3 + rand() * (rh - 6);
      a.fillStyle = g % 2 ? 'rgba(80,76,70,0.14)' : 'rgba(210,205,196,0.14)';
      a.fillRect(0, gy, S, 1.4);
      b.fillStyle = g % 2 ? 'rgba(95,95,95,0.28)' : 'rgba(186,186,186,0.24)';
      b.fillRect(0, gy, S, 1.4);
    }
    // Cast board seam ridge
    a.fillStyle = 'rgba(56,53,49,0.52)';
    a.fillRect(0, y, S, 3);
    b.fillStyle = 'rgb(42,42,42)';
    b.fillRect(0, y, S, 3);
    // Vertical butt joint + architectural cone form-tie holes
    const jx = ((row * 347 + 180) % (S - 120)) + 60;
    a.fillStyle = 'rgba(66,62,57,0.38)';
    a.fillRect(jx, y, 2, rh);
    if (row % 3 === 1) {
      for (const tx of [S * 0.25, S * 0.75]) {
        a.fillStyle = 'rgba(54,50,46,0.62)';
        a.beginPath();
        a.arc(tx, y + rh * 0.5, 7, 0, Math.PI * 2);
        a.fill();
        b.fillStyle = 'rgb(24,24,24)';
        b.beginPath();
        b.arc(tx, y + rh * 0.5, 7, 0, Math.PI * 2);
        b.fill();
      }
    }
  }
  // Fine mineral aggregate air-void speckle
  for (let i = 0; i < 3600; i++) {
    const x = rand() * S, y = rand() * S, v = 108 + (rand() * 88) | 0;
    a.fillStyle = `rgba(${v},${v - 2},${v - 5},0.18)`;
    a.fillRect(x, y, 2, 2);
  }
  return {
    map: makeTex(THREE, aC, 1.6, 1.8, true),
    roughnessMap: makeTex(THREE, rC, 1.6, 1.8, false),
    bumpMap: makeTex(THREE, bC, 1.6, 1.8, false),
  };
}

function buildConcretePbr(THREE) {
  const S = 512;
  const aC = document.createElement('canvas'), rC = document.createElement('canvas'), bC = document.createElement('canvas');
  aC.width = aC.height = rC.width = rC.height = bC.width = bC.height = S;
  const a = aC.getContext('2d'), r = rC.getContext('2d'), b = bC.getContext('2d');
  a.fillStyle = '#c8c2b8';
  a.fillRect(0, 0, S, S);
  r.fillStyle = 'rgb(154,154,154)';
  r.fillRect(0, 0, S, S);
  b.fillStyle = 'rgb(140,140,140)';
  b.fillRect(0, 0, S, S);
  for (let i = 0; i < 2400; i++) {
    const x = (Math.sin(i * 78.233) * 0.5 + 0.5) * S;
    const y = (Math.cos(i * 45.164) * 0.5 + 0.5) * S;
    const rad = 0.8 + (i % 3);
    const v = 152 + (i % 52);
    a.fillStyle = `rgba(${v},${v - 4},${v - 9},0.22)`;
    a.beginPath();
    a.arc(x, y, rad, 0, Math.PI * 2);
    a.fill();
    b.fillStyle = i % 2 ? 'rgba(180,180,180,0.22)' : 'rgba(98,98,98,0.22)';
    b.fillRect(x, y, rad * 1.6, rad * 1.6);
  }
  a.fillStyle = 'rgba(90,84,78,0.24)';
  a.fillRect(0, S * 0.5, S, 2);
  a.fillRect(S * 0.5, 0, 2, S);
  return {
    map: makeTex(THREE, aC, 3, 3, true),
    roughnessMap: makeTex(THREE, rC, 3, 3, false),
    bumpMap: makeTex(THREE, bC, 3, 3, false),
  };
}

function buildStandingSeamPbr(THREE) {
  const S = 512;
  const aC = document.createElement('canvas'), bC = document.createElement('canvas');
  aC.width = aC.height = bC.width = bC.height = S;
  const a = aC.getContext('2d'), b = bC.getContext('2d');
  a.fillStyle = '#303338';
  a.fillRect(0, 0, S, S);
  b.fillStyle = 'rgb(128,128,128)';
  b.fillRect(0, 0, S, S);
  const trays = 12, tw = S / trays;
  for (let i = 0; i < trays; i++) {
    const x = i * tw;
    a.fillStyle = 'rgba(0,0,0,0.68)';
    a.fillRect(x, 0, 3, S);
    a.fillStyle = 'rgba(255,255,255,0.16)';
    a.fillRect(x + 3, 0, 2, S);
    b.fillStyle = 'rgb(245,245,245)';
    b.fillRect(x + 2, 0, 4, S);
    b.fillStyle = 'rgb(28,28,28)';
    b.fillRect(x, 0, 2, S);
  }
  return {
    map: makeTex(THREE, aC, 4, 2, true),
    bumpMap: makeTex(THREE, bC, 4, 2, false),
  };
}

function buildTravertinePbr(THREE) {
  const S = 1024;
  const aC = document.createElement('canvas'), bC = document.createElement('canvas');
  aC.width = aC.height = bC.width = bC.height = S;
  const a = aC.getContext('2d'), b = bC.getContext('2d');
  a.fillStyle = '#e4dbcd';
  a.fillRect(0, 0, S, S);
  b.fillStyle = 'rgb(154,154,154)';
  b.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y += 2) {
    const w = Math.sin(y * 0.032) * 0.52 + Math.sin(y * 0.095) * 0.28 + Math.cos(y * 0.21) * 0.14;
    const d = Math.round(w * 16);
    a.fillStyle = `rgba(${222 + d},${211 + d},${194 + d},0.56)`;
    a.fillRect(0, y, S, 2);
    b.fillStyle = `rgb(${152 + d},${152 + d},${152 + d})`;
    b.fillRect(0, y, S, 2);
  }
  // Crisp large-format 1200×600 honed travertine slab grout lines
  a.fillStyle = 'rgba(138,128,116,0.34)';
  b.fillStyle = 'rgb(88,88,88)';
  for (let r = 0; r < 4; r++) {
    const y = r * (S / 4);
    a.fillRect(0, y, S, 2);
    b.fillRect(0, y, S, 2);
    const offset = (r % 2) * (S / 4);
    for (let c = 0; c < 2; c++) {
      const x = (c * (S / 2) + offset) % S;
      a.fillRect(x, y, 2, S / 4);
      b.fillRect(x, y, 2, S / 4);
    }
  }
  return {
    map: makeTex(THREE, aC, 3.2, 2.2, true),
    bumpMap: makeTex(THREE, bC, 3.2, 2.2, false),
  };
}

// Kwila Hardwood Decking (140 mm architectural boards, ported from nz-planting-studio proceduralTextures.js)
function buildKwilaDeckPbr(THREE) {
  const S = 1024;
  const aC = document.createElement('canvas'), bC = document.createElement('canvas');
  aC.width = aC.height = bC.width = bC.height = S;
  const a = aC.getContext('2d'), b = bC.getContext('2d');
  const rand = mulberry32(606);
  a.fillStyle = '#180d08';
  a.fillRect(0, 0, S, S);
  b.fillStyle = 'rgb(16,16,16)';
  b.fillRect(0, 0, S, S);
  const boards = 12, bh = S / boards, gap = 6;
  for (let i = 0; i < boards; i++) {
    const y = i * bh + gap * 0.5;
    const h = bh - gap;
    const tone = (rand() - 0.5) * 24;
    a.fillStyle = `rgb(${Math.floor(118 + tone)},${Math.floor(66 + tone * 0.62)},${Math.floor(41 + tone * 0.42)})`;
    a.fillRect(0, y, S, h);
    b.fillStyle = 'rgb(218,218,218)';
    b.fillRect(0, y, S, h);
    for (let k = 0; k < 56; k++) {
      const gy = y + rand() * h;
      const alpha = 0.06 + rand() * 0.14;
      a.strokeStyle = rand() > 0.5 ? `rgba(48,22,10,${alpha})` : `rgba(170,108,68,${alpha})`;
      a.lineWidth = 1.0 + rand() * 1.4;
      a.beginPath();
      a.moveTo(0, gy);
      a.bezierCurveTo(S * 0.33, gy + (rand() - 0.5) * 4, S * 0.66, gy + (rand() - 0.5) * 4, S, gy);
      a.stroke();
    }
    a.fillStyle = 'rgba(212,152,110,0.18)';
    a.fillRect(0, y, S, 2);
  }
  return {
    map: makeTex(THREE, aC, 2.2, 2.8, true),
    bumpMap: makeTex(THREE, bC, 2.2, 2.8, false),
  };
}

// Firth Piazza 50 Concrete Pavers — Black Sands (400×200 running bond)
function buildFirthPaversPbr(THREE) {
  const S = 512;
  const aC = document.createElement('canvas'), bC = document.createElement('canvas');
  aC.width = aC.height = bC.width = bC.height = S;
  const a = aC.getContext('2d'), b = bC.getContext('2d');
  const rand = mulberry32(303);
  a.fillStyle = '#202225';
  a.fillRect(0, 0, S, S);
  b.fillStyle = 'rgb(26,26,26)';
  b.fillRect(0, 0, S, S);
  const cols = 4, rows = 8, pw = S / cols, ph = S / rows, gap = 4;
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (pw * 0.5);
    for (let c = -1; c <= cols; c++) {
      const x = c * pw + offset + gap * 0.5;
      const y = r * ph + gap * 0.5;
      const w = pw - gap, h = ph - gap;
      const base = 58 + Math.floor((rand() - 0.5) * 14);
      a.fillStyle = `rgb(${base},${base + 2},${base + 5})`;
      a.fillRect(x, y, w, h);
      b.fillStyle = 'rgb(212,212,212)';
      b.fillRect(x, y, w, h);
      a.strokeStyle = 'rgba(148,154,162,0.22)';
      a.lineWidth = 1.2;
      a.strokeRect(x + 1, y + 1, w - 2, h - 2);
      for (let k = 0; k < 42; k++) {
        const sx = x + 2 + rand() * (w - 4), sy = y + 2 + rand() * (h - 4);
        const v = base + Math.floor((rand() - 0.5) * 32);
        a.fillStyle = `rgba(${v},${v + 1},${v + 3},0.52)`;
        a.fillRect(sx, sy, 1.5, 1.5);
      }
    }
  }
  return {
    map: makeTex(THREE, aC, 3.2, 2.4, true),
    bumpMap: makeTex(THREE, bC, 3.2, 2.4, false),
  };
}

// Daltons Black Bark Mulch
function buildMulchPbr(THREE) {
  const S = 512;
  const aC = document.createElement('canvas'), bC = document.createElement('canvas');
  aC.width = aC.height = bC.width = bC.height = S;
  const a = aC.getContext('2d'), b = bC.getContext('2d');
  const rand = mulberry32(202);
  a.fillStyle = '#1b1512';
  a.fillRect(0, 0, S, S);
  b.fillStyle = 'rgb(80,80,80)';
  b.fillRect(0, 0, S, S);
  for (let i = 0; i < 1200; i++) {
    const x = rand() * S, y = rand() * S, w = 8 + rand() * 20, h = 4 + rand() * 8, ang = rand() * Math.PI;
    const tone = Math.floor(28 + rand() * 34);
    const warm = Math.floor(rand() * 14);
    a.save();
    a.translate(x, y);
    a.rotate(ang);
    a.fillStyle = 'rgba(8,5,4,0.6)';
    a.fillRect(-w * 0.5 + 1.5, -h * 0.5 + 1.5, w, h);
    a.fillStyle = `rgb(${tone + 12 + warm},${tone + 5 + Math.floor(warm * 0.5)},${tone})`;
    a.fillRect(-w * 0.5, -h * 0.5, w, h);
    a.restore();
    b.save();
    b.translate(x, y);
    b.rotate(ang);
    b.fillStyle = `rgb(${120 + (tone % 90)},${120 + (tone % 90)},${120 + (tone % 90)})`;
    b.fillRect(-w * 0.5, -h * 0.5, w, h);
    b.restore();
  }
  return {
    map: makeTex(THREE, aC, 4, 4, true),
    bumpMap: makeTex(THREE, bC, 4, 4, false),
  };
}

function buildBoucleBump(THREE) {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const rand = mulberry32(818);
  g.fillStyle = 'rgb(128,128,128)';
  g.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y += 4) {
    for (let x = 0; x < S; x += 4) {
      const v = 90 + ((rand() * 110) | 0);
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(x, y, 3, 3);
    }
  }
  return makeTex(THREE, c, 8, 8, false);
}

function buildHillsidePbr(THREE) {
  const S = 512;
  const aC = document.createElement('canvas'), bC = document.createElement('canvas');
  aC.width = aC.height = bC.width = bC.height = S;
  const a = aC.getContext('2d'), b = bC.getContext('2d');
  const rand = mulberry32(101);
  a.fillStyle = '#4f5a3e';
  a.fillRect(0, 0, S, S);
  b.fillStyle = 'rgb(128,128,128)';
  b.fillRect(0, 0, S, S);
  for (let i = 0; i < 4800; i++) {
    const x = rand() * S, y = rand() * S;
    const g = 74 + ((rand() * 44) | 0);
    a.fillStyle = i % 5 === 0 ? `rgba(${g + 20},${g + 12},${g - 20},0.3)` : `rgba(${g - 10},${g + 8},${g - 24},0.28)`;
    a.fillRect(x, y, 2.2, 5.5);
    b.fillStyle = i % 2 ? 'rgba(182,182,182,0.3)' : 'rgba(82,82,82,0.3)';
    b.fillRect(x, y, 2, 4.5);
  }
  return {
    map: makeTex(THREE, aC, 18, 18, true),
    bumpMap: makeTex(THREE, bC, 18, 18, false),
  };
}

function buildLightPoolTex(THREE) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(64, 64, 2, 64, 64, 62);
  r.addColorStop(0, 'rgba(255,238,205,1)');
  r.addColorStop(0.22, 'rgba(255,214,162,0.58)');
  r.addColorStop(0.55, 'rgba(255,198,136,0.18)');
  r.addColorStop(1, 'rgba(255,198,136,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Equirectangular painted Aotearoa sky with lit cumulus clouds & horizon sun corona
function buildEquirectSky(THREE, mood = 'golden') {
  const W = 1024, H = 512;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, H);
  const stops =
    mood === 'dusk'
      ? [[0, '#1b1626'], [0.28, '#46374b'], [0.45, '#b87f74'], [0.5, '#f2ba8b'], [0.54, '#5a535d'], [1, '#1d1e22']]
      : mood === 'day'
        ? [[0, '#326aa6'], [0.32, '#80b0db'], [0.47, '#dbeaf4'], [0.5, '#f2f6f9'], [0.54, '#9ea896'], [1, '#3b4634']]
        : [[0, '#49658c'], [0.3, '#9db0c4'], [0.44, '#ebd3be'], [0.5, '#fce5cd'], [0.53, '#b5a696'], [1, '#3a4033']];
  for (const [t, col] of stops) grad.addColorStop(t, col);
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);

  const sy = mood === 'day' ? 130 : mood === 'dusk' ? 248 : 208;
  const sg = g.createRadialGradient(W * 0.5, sy, 4, W * 0.5, sy, 230);
  sg.addColorStop(0, 'rgba(255,247,230,0.96)');
  sg.addColorStop(0.24, mood === 'dusk' ? 'rgba(255,172,118,0.54)' : 'rgba(255,232,198,0.46)');
  sg.addColorStop(1, 'rgba(255,205,160,0)');
  g.fillStyle = sg;
  g.fillRect(0, 0, W, H * 0.56);

  let seed = 19;
  const rnd = () => ((seed = (seed * 48271) % 2147483647) / 2147483647);
  const lit = mood === 'dusk' ? [246, 186, 152] : mood === 'golden' ? [255, 236, 214] : [255, 255, 255];
  const shade = mood === 'dusk' ? [88, 72, 92] : mood === 'golden' ? [178, 166, 174] : [192, 204, 220];
  for (let i = 0; i < 22; i++) {
    const cx = rnd() * W, cy = H * (0.25 + rnd() * 0.19);
    const sz = (16 + rnd() * 28) * (1.45 - (cy / H) * 1.5);
    for (let k = 0; k < 8; k++) {
      const px = cx + (rnd() - 0.5) * sz * 3.1, py = cy + (rnd() - 0.55) * sz * 0.85, pr = sz * (0.5 + rnd() * 0.68);
      for (const dx of [-W, 0, W]) {
        const sh = g.createRadialGradient(px + dx, py + pr * 0.24, 0, px + dx, py + pr * 0.24, pr);
        sh.addColorStop(0, `rgba(${shade.join(',')},0.52)`);
        sh.addColorStop(1, `rgba(${shade.join(',')},0)`);
        g.fillStyle = sh;
        g.beginPath();
        g.arc(px + dx, py + pr * 0.24, pr, 0, Math.PI * 2);
        g.fill();

        const lt = g.createRadialGradient(px + dx, py - pr * 0.18, 0, px + dx, py - pr * 0.18, pr * 0.85);
        lt.addColorStop(0, `rgba(${lit.join(',')},0.88)`);
        lt.addColorStop(1, `rgba(${lit.join(',')},0)`);
        g.fillStyle = lt;
        g.beginPath();
        g.arc(px + dx, py - pr * 0.18, pr * 0.85, 0, Math.PI * 2);
        g.fill();
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// ---- Volumetric 3D Aotearoa BotanicalMeshBuilder (ported from nz-planting-studio, zero bare 'three') -----
class BotanicalMeshBuilder {
  constructor(THREE) {
    this.THREE = THREE;
    this.positions = [];
    this.normals = [];
    this.colors = [];
    this.tipness = [];
    this.partType = [];
    this.indices = [];
  }

  addVertex(x, y, z, nx, ny, nz, color, tip, part) {
    const idx = this.positions.length / 3;
    this.positions.push(x, y, z);
    this.normals.push(nx, ny, nz);
    this.colors.push(color.r, color.g, color.b);
    this.tipness.push(tip);
    this.partType.push(part);
    return idx;
  }

  addTri(a, b, c) {
    this.indices.push(a, b, c);
  }

  // Curved, tapered, 3-vertex V-keeled botanical blade (flax, Astelia, sedge, Toetoe, Tī kōuka, Nīkau frond)
  addBlade({
    origin,
    yaw = 0,
    tilt = 0.45,
    arch = 0.65,
    length = 1.0,
    baseWidth = 0.08,
    keel = 0.015,
    segments = 4,
    baseColor,
    tipColor,
    part = 1.0,
    tipBase = 0.0,
    tipScale = 1.0,
  }) {
    const THREE = this.THREE;
    const orig = origin ?? new THREE.Vector3(0, 0, 0);
    const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
    const rings = [];
    const c = new THREE.Color();

    for (let s = 0; s <= segments; s++) {
      const t = s / segments;
      const pitch = tilt + arch * Math.pow(t, 1.35);
      const rDist = Math.sin(pitch) * length * t;
      const yDist = Math.cos(pitch * 0.85) * length * t - arch * 0.16 * length * t * t;
      const cx = orig.x + cosY * rDist;
      const cy = Math.max(0.01, orig.y + yDist);
      const cz = orig.z + sinY * rDist;

      const wFactor = s === segments ? 0.0 : Math.sin(Math.pow(t, 0.65) * Math.PI * 0.92 + 0.25);
      const hw = baseWidth * 0.5 * wFactor;
      const kv = keel * wFactor;
      const rx = -sinY, rz = cosY;

      c.copy(baseColor).lerp(tipColor, Math.pow(t, 0.85));
      const tipVal = tipBase + t * tipScale;

      if (s === segments) {
        rings.push([this.addVertex(cx, cy, cz, cosY * 0.4, 0.85, sinY * 0.4, c, tipVal, part)]);
      } else if (keel > 0.001) {
        const iL = this.addVertex(cx - rx * hw, cy + kv, cz - rz * hw, -rx * 0.4 + cosY * 0.2, 0.85, -rz * 0.4 + sinY * 0.2, c, tipVal, part);
        const iM = this.addVertex(cx, cy, cz, cosY * 0.3, 0.9, sinY * 0.3, c, tipVal, part);
        const iR = this.addVertex(cx + rx * hw, cy + kv, cz + rz * hw, rx * 0.4 + cosY * 0.2, 0.85, rz * 0.4 + sinY * 0.2, c, tipVal, part);
        rings.push([iL, iM, iR]);
      } else {
        const iL = this.addVertex(cx - rx * hw, cy, cz - rz * hw, cosY * 0.3, 0.9, sinY * 0.3, c, tipVal, part);
        const iR = this.addVertex(cx + rx * hw, cy, cz + rz * hw, cosY * 0.3, 0.9, sinY * 0.3, c, tipVal, part);
        rings.push([iL, iR]);
      }
    }

    for (let s = 0; s < segments; s++) {
      const r0 = rings[s], r1 = rings[s + 1];
      if (r1.length === 1) {
        if (r0.length === 3) {
          this.addTri(r0[0], r0[1], r1[0]);
          this.addTri(r0[1], r0[2], r1[0]);
        } else {
          this.addTri(r0[0], r0[1], r1[0]);
        }
      } else if (r0.length === 3) {
        this.addTri(r0[0], r0[1], r1[0]);
        this.addTri(r0[1], r1[1], r1[0]);
        this.addTri(r0[1], r0[2], r1[1]);
        this.addTri(r0[2], r1[2], r1[1]);
      } else {
        this.addTri(r0[0], r0[1], r1[0]);
        this.addTri(r0[1], r1[1], r1[0]);
      }
    }
  }

  addBranch({ points, rStart, rEnd, radialSegs = 5, color, part = 0.0, tipStart = 0.0, tipEnd = 0.35 }) {
    const THREE = this.THREE;
    const rings = [];
    for (let i = 0; i < points.length; i++) {
      const t = i / (points.length - 1);
      const p = points[i];
      const rad = rStart * (1 - t) + rEnd * t;
      const tip = tipStart + (tipEnd - tipStart) * t;
      const tangent = new THREE.Vector3();
      if (i < points.length - 1) tangent.subVectors(points[i + 1], p).normalize();
      else tangent.subVectors(p, points[i - 1]).normalize();
      const up = Math.abs(tangent.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
      const side = new THREE.Vector3().crossVectors(tangent, up).normalize();
      const binorm = new THREE.Vector3().crossVectors(tangent, side).normalize();
      const ring = [];
      for (let j = 0; j < radialSegs; j++) {
        const ang = (j / radialSegs) * Math.PI * 2;
        const nx = side.x * Math.cos(ang) + binorm.x * Math.sin(ang);
        const ny = side.y * Math.cos(ang) + binorm.y * Math.sin(ang);
        const nz = side.z * Math.cos(ang) + binorm.z * Math.sin(ang);
        ring.push(this.addVertex(p.x + nx * rad, p.y + ny * rad, p.z + nz * rad, nx, ny, nz, color, tip, part));
      }
      rings.push(ring);
    }
    for (let i = 0; i < rings.length - 1; i++) {
      for (let j = 0; j < radialSegs; j++) {
        const jn = (j + 1) % radialSegs;
        this.addTri(rings[i][j], rings[i][jn], rings[i + 1][j]);
        this.addTri(rings[i][jn], rings[i + 1][jn], rings[i + 1][j]);
      }
    }
  }

  addLeafSpray({ center, count = 8, leafLen = 0.14, leafWidth = 0.065, baseColor, tipColor, part = 1.0, tipVal = 0.7, rand, droop = 0.15 }) {
    const THREE = this.THREE;
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const yaw = (i / count) * Math.PI * 2 + (rand() - 0.5) * 0.6;
      const elev = (rand() - 0.3) * 1.1;
      const len = leafLen * (0.75 + rand() * 0.5);
      const wid = leafWidth * (0.75 + rand() * 0.4);
      const dir = new THREE.Vector3(Math.cos(yaw) * Math.cos(elev), Math.sin(elev), Math.sin(yaw) * Math.cos(elev)).normalize();
      const side = new THREE.Vector3(-Math.sin(yaw), 0, Math.cos(yaw)).normalize();
      const up = new THREE.Vector3().crossVectors(side, dir).normalize();
      const p0 = center.clone().addScaledVector(dir, len * 0.12);
      const pMid = p0.clone().addScaledVector(dir, len * 0.52).addScaledVector(up, len * 0.12);
      const pTip = p0.clone().addScaledVector(dir, len).addScaledVector(up, -len * droop);
      const pL = pMid.clone().addScaledVector(side, -wid * 0.5);
      const pR = pMid.clone().addScaledVector(side, wid * 0.5);
      const shade = 0.86 + rand() * 0.28;
      c.copy(baseColor).lerp(tipColor, rand()).multiplyScalar(shade);
      const i0 = this.addVertex(p0.x, p0.y, p0.z, up.x, up.y, up.z, baseColor, tipVal * 0.85, part);
      const iL = this.addVertex(pL.x, pL.y, pL.z, up.x, up.y, up.z, c, tipVal, part);
      const iR = this.addVertex(pR.x, pR.y, pR.z, up.x, up.y, up.z, c, tipVal, part);
      const iT = this.addVertex(pTip.x, pTip.y, pTip.z, dir.x, dir.y, dir.z, tipColor, Math.min(1.0, tipVal + 0.12), part);
      this.addTri(i0, iL, iT);
      this.addTri(i0, iT, iR);
    }
  }

  addFlowerHead({ center, radius = 0.08, petals = 12, color1, color2, tipVal = 0.95, rand, style = 'umbel' }) {
    const THREE = this.THREE;
    const c = new THREE.Color();
    if (style === 'spike' || style === 'plume') {
      const len = style === 'plume' ? radius * 4.4 : radius * 2.8;
      const count = style === 'plume' ? 22 : 14;
      for (let i = 0; i < count; i++) {
        const t = i / count;
        const a = i * 2.39996;
        const r = radius * (1 - t * 0.72) * (style === 'plume' ? 1.12 : 0.65);
        const yOff = t * len;
        const xOff = style === 'plume' ? t * t * len * 0.36 : 0;
        const px = center.x + xOff + Math.cos(a) * r;
        const py = center.y + yOff;
        const pz = center.z + Math.sin(a) * r;
        c.copy(color1).lerp(color2, t * 0.6 + rand() * 0.4);
        const fl = r * 1.45;
        const i0 = this.addVertex(center.x + xOff, py, center.z, 0, 1, 0, color1, tipVal, 2.0);
        const i1 = this.addVertex(px, py + fl * 0.5, pz, Math.cos(a), 0.7, Math.sin(a), c, tipVal, 2.0);
        const i2 = this.addVertex(px - Math.sin(a) * fl * 0.5, py + fl * 0.1, pz + Math.cos(a) * fl * 0.5, Math.cos(a), 0.5, Math.sin(a), color2, tipVal, 2.0);
        this.addTri(i0, i1, i2);
      }
      return;
    }
    for (let i = 0; i < petals; i++) {
      const phi = Math.acos(1 - 2 * ((i + 0.5) / petals));
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const dx = Math.sin(phi) * Math.cos(theta);
      const dy = Math.cos(phi);
      const dz = Math.sin(phi) * Math.sin(theta);
      const r = radius * (0.65 + rand() * 0.45);
      const pTip = new THREE.Vector3(center.x + dx * r, center.y + dy * r, center.z + dz * r);
      const s1 = new THREE.Vector3(-dz, 0.2, dx).normalize().multiplyScalar(radius * 0.38);
      const s2 = new THREE.Vector3().crossVectors(new THREE.Vector3(dx, dy, dz), s1).normalize().multiplyScalar(radius * 0.38);
      c.copy(color1).lerp(color2, rand());
      const i0 = this.addVertex(center.x + dx * r * 0.24, center.y + dy * r * 0.24, center.z + dz * r * 0.24, dx, dy, dz, color1, tipVal, 2.0);
      const i1 = this.addVertex(pTip.x + s1.x, pTip.y + s1.y, pTip.z + s1.z, dx, dy, dz, c, tipVal, 2.0);
      const i2 = this.addVertex(pTip.x - s1.x + s2.x, pTip.y - s1.y + s2.y, pTip.z - s1.z + s2.z, dx, dy, dz, color2, tipVal, 2.0);
      this.addTri(i0, i1, i2);
    }
  }

  build(bendStrength = 0.54) {
    const THREE = this.THREE;
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    geom.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3));
    geom.setAttribute('aTipness', new THREE.Float32BufferAttribute(this.tipness, 1));
    geom.setAttribute('aPartType', new THREE.Float32BufferAttribute(this.partType, 1));
    geom.setIndex(this.indices);
    geom.computeVertexNormals();
    geom.computeBoundingBox();
    const box = geom.boundingBox;
    const midY = (box.min.y + box.max.y) * 0.38;
    const pos = geom.attributes.position;
    const norm = geom.attributes.normal;
    const part = geom.attributes.aPartType;
    const v = new THREE.Vector3(), n = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      if (part.getX(i) < 0.5) continue;
      v.set(pos.getX(i), Math.max(0.05, pos.getY(i) - midY), pos.getZ(i)).normalize();
      n.set(norm.getX(i), norm.getY(i), norm.getZ(i));
      n.lerp(v, bendStrength).normalize();
      norm.setXYZ(i, n.x, n.y, n.z);
    }
    norm.needsUpdate = true;
    geom.computeBoundingSphere();
    return geom;
  }
}

const COASTAL_SPECIES = {
  pohutukawa: { id: 'pohutukawa', archetype: 'canopyTree', H: 5.4, W: 4.8, leaf: '#354e2f', tip: '#557046', flw1: '#cc1b28', flw2: '#f2434c', trunk: '#594e46' },
  tikouka: { id: 'tikouka', archetype: 'cabbageTree', H: 4.4, W: 1.85, leaf: '#547338', tip: '#89a65a', flw1: '#f4f0df', flw2: '#e4dac0', trunk: '#6e6254' },
  nikau: { id: 'nikau', archetype: 'nikauPalm', H: 4.3, W: 2.35, leaf: '#2d5c2b', tip: '#4e8744', flw1: '#d99bc4', flw2: '#c92e2e', trunk: '#5c7050' },
  ponga: { id: 'ponga', archetype: 'treeFern', H: 2.9, W: 2.45, leaf: '#35662a', tip: '#6a9b4c', flw1: '#d8e0d7', flw2: '#d8e0d7', trunk: '#423327' },
  harakeke: { id: 'harakeke', archetype: 'flaxTall', H: 1.85, W: 1.55, leaf: '#456632', tip: '#6e904b', flw1: '#b83f22', flw2: '#dc7328', trunk: '#3a3028' },
  platts_black: { id: 'platts_black', archetype: 'flaxArching', H: 0.92, W: 0.96, leaf: '#2c1e24', tip: '#5a343e', flw1: '#9c7d48', flw2: '#bfa46b', trunk: '#22171b' },
  silver_spear: { id: 'silver_spear', archetype: 'flaxBroad', H: 1.12, W: 1.25, leaf: '#899a93', tip: '#c4d2cb', flw1: '#e07a22', flw2: '#f2a13b', trunk: '#5c6661' },
  toetoe: { id: 'toetoe', archetype: 'tussockPlume', H: 1.18, W: 1.18, leaf: '#4f7036', tip: '#90aa58', flw1: '#f2e6c4', flw2: '#e2cf98', trunk: '#544a35' },
  carex_testacea: { id: 'carex_testacea', archetype: 'sedgeCascading', H: 0.52, W: 0.64, leaf: '#677135', tip: '#cc6f27', flw1: '#b88342', flw2: '#b88342', trunk: '#594225' },
  libertia: { id: 'libertia', archetype: 'irisFan', H: 0.56, W: 0.52, leaf: '#b06622', tip: '#df882a', flw1: '#ffffff', flw2: '#fff2cc', trunk: '#7a4515' },
  tororaro: { id: 'tororaro', archetype: 'divaricating', H: 1.25, W: 1.4, leaf: '#684e3f', tip: '#829a58', flw1: '#e8e5d8', flw2: '#e8e5d8', trunk: '#4e382e' },
};

function buildCoastalSpeciesGeometry(THREE, sp) {
  const b = new BotanicalMeshBuilder(THREE);
  const rand = mulberry32(sp.id.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
  const H = sp.H, W = sp.W;
  const colLeaf = new THREE.Color(sp.leaf);
  const colTip = new THREE.Color(sp.tip);
  const colFlw1 = new THREE.Color(sp.flw1);
  const colFlw2 = new THREE.Color(sp.flw2);
  const colTrunk = new THREE.Color(sp.trunk);

  switch (sp.archetype) {
    case 'flaxTall':
    case 'flaxArching':
    case 'flaxBroad':
    case 'irisFan': {
      const isBroad = sp.archetype === 'flaxBroad';
      const isIris = sp.archetype === 'irisFan';
      const isArching = sp.archetype === 'flaxArching';
      const bladeCount = isIris ? 24 : isBroad ? 22 : 26;
      for (let i = 0; i < bladeCount; i++) {
        const ring = i / bladeCount;
        const yaw = i * 2.39996 + (rand() - 0.5) * 0.25;
        const tilt = (isIris ? 0.14 : 0.18) + ring * (isArching ? 0.85 : isBroad ? 0.72 : 0.56);
        const arch = isArching ? 1.05 : isBroad ? 0.88 : isIris ? 0.42 : 0.62;
        const len = H * (0.72 + (1 - ring * 0.35) * 0.34) * (0.88 + rand() * 0.24);
        const wid = (isBroad ? 0.135 : isIris ? 0.044 : 0.09) * (H / 1.4);
        b.addBlade({
          origin: new THREE.Vector3(Math.cos(yaw) * W * 0.05, 0, Math.sin(yaw) * W * 0.05),
          yaw, tilt, arch, length: len, baseWidth: wid, keel: wid * 0.22, segments: 4,
          baseColor: colLeaf, tipColor: colTip, part: 1.0,
        });
      }
      if (sp.archetype === 'flaxTall' || isIris) {
        const stalks = isIris ? 5 : 3;
        for (let s = 0; s < stalks; s++) {
          const ang = (s / stalks) * Math.PI * 2 + rand();
          const sH = H * (isIris ? 0.94 : 1.32);
          const lean = W * 0.18;
          const pts = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(Math.cos(ang) * lean * 0.4, sH * 0.5, Math.sin(ang) * lean * 0.4),
            new THREE.Vector3(Math.cos(ang) * lean, sH, Math.sin(ang) * lean),
          ];
          b.addBranch({ points: pts, rStart: isIris ? 0.008 : 0.02, rEnd: isIris ? 0.005 : 0.01, radialSegs: 4, color: colTrunk, part: 2.0, tipStart: 0.2, tipEnd: 0.95 });
          b.addFlowerHead({ center: pts[2], radius: isIris ? 0.052 : 0.13, petals: isIris ? 7 : 12, color1: colFlw1, color2: colFlw2, tipVal: 0.96, rand, style: isIris ? 'umbel' : 'spike' });
        }
      }
      break;
    }

    case 'tussockPlume':
    case 'sedgeCascading': {
      const isCascading = sp.archetype === 'sedgeCascading';
      const count = isCascading ? 58 : 66;
      for (let i = 0; i < count; i++) {
        const ring = i / count;
        const yaw = i * 2.39996 + (rand() - 0.5) * 0.35;
        const tilt = 0.18 + ring * (isCascading ? 1.15 : 0.95);
        const arch = isCascading ? 1.35 : 1.05;
        const len = H * (0.78 + rand() * 0.35) * (isCascading ? 1.24 : 1.05);
        const wid = isCascading ? 0.018 : 0.025;
        b.addBlade({
          origin: new THREE.Vector3(Math.cos(yaw) * W * 0.07 * ring, 0, Math.sin(yaw) * W * 0.07 * ring),
          yaw, tilt, arch, length: len, baseWidth: wid, keel: 0, segments: 4,
          baseColor: colLeaf, tipColor: colTip, part: 1.0,
        });
      }
      if (sp.archetype === 'tussockPlume') {
        for (let p = 0; p < 7; p++) {
          const ang = (p / 7) * Math.PI * 2 + rand() * 0.5;
          const pH = H * (1.16 + rand() * 0.32);
          const pts = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(Math.cos(ang) * W * 0.15, pH * 0.65, Math.sin(ang) * W * 0.15),
            new THREE.Vector3(Math.cos(ang) * W * 0.35, pH, Math.sin(ang) * W * 0.35),
          ];
          b.addBranch({ points: pts, rStart: 0.008, rEnd: 0.004, radialSegs: 4, color: colTip, part: 2.0, tipStart: 0.1, tipEnd: 0.92 });
          b.addFlowerHead({ center: pts[2], radius: 0.1, petals: 16, color1: colFlw1, color2: colFlw2, tipVal: 1.0, rand, style: 'plume' });
        }
      }
      break;
    }

    case 'treeFern': {
      const trunkH = H * 0.72;
      const trunkPts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.06, trunkH * 0.5, -0.04), new THREE.Vector3(0.02, trunkH, 0.02)];
      b.addBranch({ points: trunkPts, rStart: 0.155, rEnd: 0.105, radialSegs: 7, color: colTrunk, part: 0.0, tipStart: 0, tipEnd: 0.24 });
      const crown = trunkPts[2];
      const frondCount = 14;
      const silverTint = new THREE.Color('#c8d4c6');
      for (let f = 0; f < frondCount; f++) {
        const yaw = (f / frondCount) * Math.PI * 2 + (rand() - 0.5) * 0.22;
        const frondLen = W * 0.58 * (0.85 + rand() * 0.25);
        const lift = 0.28 + (f % 2) * 0.26;
        const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
        const rx = -sinY, rz = cosY;
        const pairs = 10;
        for (let k = 1; k <= pairs; k++) {
          const t = k / pairs;
          const dist = t * frondLen;
          const yOff = Math.sin(t * Math.PI * 0.78) * frondLen * lift - t * t * frondLen * 0.22;
          const cx = crown.x + cosY * dist, cy = crown.y + yOff, cz = crown.z + sinY * dist;
          const pinnaLen = frondLen * 0.27 * Math.sin(t * Math.PI * 0.92 + 0.18);
          const col = colLeaf.clone().lerp(colTip, t * 0.75).lerp(silverTint, k % 3 === 0 ? 0.16 : 0.04);
          const tipVal = 0.35 + t * 0.65;
          for (const side of [-1, 1]) {
            const p0 = new THREE.Vector3(cx, cy, cz);
            const pTip = new THREE.Vector3(cx + rx * side * pinnaLen + cosY * pinnaLen * 0.28, cy - pinnaLen * 0.12, cz + rz * side * pinnaLen + sinY * pinnaLen * 0.28);
            const pFwd = new THREE.Vector3(cx + cosY * (frondLen / pairs) * 0.85, cy + 0.015, cz + sinY * (frondLen / pairs) * 0.85);
            const i0 = b.addVertex(p0.x, p0.y, p0.z, 0, 1, 0, colLeaf, tipVal * 0.9, 1.0);
            const i1 = b.addVertex(pTip.x, pTip.y, pTip.z, rx * side * 0.3, 0.9, rz * side * 0.3, col, tipVal, 1.0);
            const i2 = b.addVertex(pFwd.x, pFwd.y, pFwd.z, 0, 1, 0, colTip, tipVal, 1.0);
            b.addTri(i0, i1, i2);
          }
        }
      }
      break;
    }

    case 'nikauPalm': {
      const trunkH = H * 0.56;
      const trunkPts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(-0.04, trunkH * 0.5, 0.04), new THREE.Vector3(0, trunkH, 0)];
      b.addBranch({ points: trunkPts, rStart: 0.13, rEnd: 0.10, radialSegs: 7, color: colTrunk, part: 0.0, tipStart: 0, tipEnd: 0.2 });
      const shaftPts = [new THREE.Vector3(0, trunkH - 0.05, 0), new THREE.Vector3(0, trunkH + 0.26, 0), new THREE.Vector3(0, trunkH + 0.55, 0)];
      b.addBranch({ points: shaftPts, rStart: 0.145, rEnd: 0.095, radialSegs: 7, color: new THREE.Color('#3f6b33'), part: 0.0, tipStart: 0.2, tipEnd: 0.3 });
      const crown = shaftPts[2];
      for (let f = 0; f < 13; f++) {
        const yaw = (f / 13) * Math.PI * 2 + rand() * 0.24;
        const len = H * 0.56 * (0.85 + rand() * 0.24);
        b.addBlade({
          origin: crown, yaw, tilt: 0.22 + (f % 3) * 0.14, arch: 0.55, length: len, baseWidth: 0.28, keel: 0.05, segments: 5,
          baseColor: colLeaf, tipColor: colTip, part: 1.0, tipBase: 0.35, tipScale: 0.65,
        });
      }
      break;
    }

    case 'cabbageTree': {
      const forkH = H * 0.50;
      b.addBranch({
        points: [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.06, forkH * 0.52, -0.04), new THREE.Vector3(0, forkH, 0)],
        rStart: 0.15, rEnd: 0.10, radialSegs: 7, color: colTrunk, part: 0.0, tipStart: 0, tipEnd: 0.22,
      });
      const heads = 3;
      for (let h = 0; h < heads; h++) {
        const a = (h / heads) * Math.PI * 2 + 0.4;
        const limbTop = new THREE.Vector3(Math.cos(a) * W * 0.24, H * (0.78 + (h % 2) * 0.12), Math.sin(a) * W * 0.24);
        b.addBranch({ points: [new THREE.Vector3(0, forkH, 0), limbTop], rStart: 0.085, rEnd: 0.055, radialSegs: 6, color: colTrunk, part: 0.0, tipStart: 0.22, tipEnd: 0.4 });
        for (let l = 0; l < 32; l++) {
          const ly = l * 2.39996;
          const ring = l / 32;
          b.addBlade({
            origin: limbTop, yaw: ly, tilt: 0.2 + ring * 1.45, arch: 0.72, length: 0.68 + rand() * 0.25,
            baseWidth: 0.048, keel: 0.008, segments: 3, baseColor: colLeaf, tipColor: colTip, part: 1.0, tipBase: 0.45, tipScale: 0.55,
          });
        }
        b.addFlowerHead({
          center: limbTop.clone().add(new THREE.Vector3(Math.cos(a) * 0.15, 0.28, Math.sin(a) * 0.15)),
          radius: 0.14, petals: 14, color1: colFlw1, color2: colFlw2, tipVal: 0.95, rand, style: 'plume',
        });
      }
      break;
    }

    case 'canopyTree': {
      // Multi-stemmed gnarled coastal Pōhutukawa with spreading twisted limbs & crimson stamen clusters
      const trunkCount = 3;
      for (let t = 0; t < trunkCount; t++) {
        const a = (t / trunkCount) * Math.PI * 2 + rand() * 0.5;
        const lean = W * 0.26;
        const pMid = new THREE.Vector3(Math.cos(a + 0.25) * lean * 0.52, H * 0.34, Math.sin(a + 0.25) * lean * 0.52);
        const pFork = new THREE.Vector3(Math.cos(a) * lean, H * 0.60, Math.sin(a) * lean);
        b.addBranch({ points: [new THREE.Vector3(0, 0, 0), pMid, pFork], rStart: 0.175, rEnd: 0.085, radialSegs: 6, color: colTrunk, part: 0.0, tipStart: 0, tipEnd: 0.3 });
        const limbs = 5;
        for (let l = 0; l < limbs; l++) {
          const la = a + (l / limbs - 0.5) * 2.4 + (rand() - 0.5) * 0.4;
          const dist = W * (0.28 + rand() * 0.24);
          const pEnd = new THREE.Vector3(pFork.x + Math.cos(la) * dist, H * (0.74 + rand() * 0.24), pFork.z + Math.sin(la) * dist);
          b.addBranch({
            points: [pFork, pFork.clone().lerp(pEnd, 0.55).add(new THREE.Vector3(0, 0.16, 0)), pEnd],
            rStart: 0.052, rEnd: 0.018, radialSegs: 5, color: colTrunk, part: 0.0, tipStart: 0.3, tipEnd: 0.65,
          });
          for (let c = 0; c < 4; c++) {
            const cPos = pEnd.clone().add(new THREE.Vector3((rand() - 0.5) * W * 0.25, (rand() - 0.35) * H * 0.14, (rand() - 0.5) * W * 0.25));
            b.addLeafSpray({ center: cPos, count: 12, leafLen: 0.46, leafWidth: 0.23, baseColor: colLeaf, tipColor: colTip, part: 1.0, tipVal: 0.78, rand, droop: 0.15 });
            if (c < 3) {
              b.addFlowerHead({ center: cPos.clone().add(new THREE.Vector3(0, 0.15, 0)), radius: 0.23, petals: 14, color1: colFlw1, color2: colFlw2, tipVal: 0.94, rand, style: 'umbel' });
            }
          }
        }
      }
      break;
    }

    case 'divaricating':
    default: {
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2 + rand() * 0.3;
        const r = W * (0.25 + rand() * 0.25);
        const h = H * (0.55 + rand() * 0.45);
        const pts = [
          new THREE.Vector3(0, 0.02, 0),
          new THREE.Vector3(Math.cos(a + 0.3) * r * 0.45, h * 0.42, Math.sin(a + 0.3) * r * 0.45),
          new THREE.Vector3(Math.cos(a - 0.25) * r * 0.78, h * 0.76, Math.sin(a - 0.25) * r * 0.78),
          new THREE.Vector3(Math.cos(a) * r, h, Math.sin(a) * r),
        ];
        b.addBranch({ points: pts, rStart: 0.015, rEnd: 0.005, radialSegs: 4, color: colTrunk, part: 0.0, tipStart: 0, tipEnd: 0.6 });
        b.addLeafSpray({ center: pts[3], count: 10, leafLen: 0.18, leafWidth: 0.08, baseColor: colLeaf, tipColor: colTip, part: 1.0, tipVal: 0.75, rand, droop: 0.1 });
      }
      break;
    }
  }
  return b.build(0.54);
}

// ---- Architectural Structural Details: 200UC Steel H-Columns with Bolted Baseplates ----------------------
function createSteelHColumn(THREE, height, colMat, plateMat) {
  const g = new THREE.Group();
  const fw = 0.20, ft = 0.018, depth = 0.20, wt = 0.014;
  const f1 = new THREE.Mesh(new THREE.BoxGeometry(fw, height, ft), colMat);
  f1.position.set(0, height / 2, depth / 2 - ft / 2);
  const f2 = new THREE.Mesh(new THREE.BoxGeometry(fw, height, ft), colMat);
  f2.position.set(0, height / 2, -depth / 2 + ft / 2);
  const web = new THREE.Mesh(new THREE.BoxGeometry(wt, height, depth - ft * 2), colMat);
  web.position.set(0, height / 2, 0);
  // Machined architectural baseplate + 4 corner anchor bolts
  const basePlate = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.02, 0.28), plateMat);
  basePlate.position.set(0, 0.01, 0);
  const headPlate = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.018, 0.24), plateMat);
  headPlate.position.set(0, height - 0.009, 0);
  const boltGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.022, 6);
  for (const bx of [-0.105, 0.105]) {
    for (const bz of [-0.105, 0.105]) {
      const bolt = new THREE.Mesh(boltGeo, plateMat);
      bolt.position.set(bx, 0.026, bz);
      g.add(bolt);
    }
  }
  for (const m of [f1, f2, web, basePlate, headPlate]) {
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  }
  return g;
}

// ---- Curated GLB Semantic PBR Material Assignment (restores rich wood, bouclé, brass, stone & flora) -----
const GLB_PALETTES = {
  'kowhai-hero-liv-01': [
    { color: 0xb98d5f, rough: 0.48, metal: 0.02, wood: true }, // beech plinth
    { color: 0xeee7db, rough: 0.93, metal: 0.0, boucle: true }, // wool bouclé body
    { color: 0xe6ddd0, rough: 0.94, metal: 0.0, boucle: true }, // back cushions
  ],
  'kowhai-hero-liv-02': [
    { color: 0xc2986b, rough: 0.48, metal: 0.02, wood: true }, // beech frame
    { color: 0x262220, rough: 0.36, metal: 0.65 }, // dark steel detailing
    { color: 0xede5d7, rough: 0.92, metal: 0.0, boucle: true }, // linen cushions
  ],
  'curated-lounge-chair': [{ color: 0xd9cbb8, rough: 0.86, metal: 0.0, boucle: true }],
  'kowhai-hero-liv-03': [{ color: 0xc6a985, rough: 0.42, metal: 0.02, travertine: true }],
  'kowhai-hero-liv-04': [
    { color: 0xd6cab9, rough: 0.96, metal: 0.0, boucle: true },
    { color: 0xc7b9a4, rough: 0.95, metal: 0.0, boucle: true },
  ],
  'kowhai-hero-liv-05': [
    { color: 0xc5a15e, rough: 0.26, metal: 0.86 }, // brushed brass arc
    { color: 0x282320, rough: 0.38, metal: 0.55 }, // dark base detail
  ],
  'objects-sideboard': [{ color: 0x8f5936, rough: 0.44, metal: 0.02, wood: true }],
  'curated-speaker-ash': [
    { color: 0xc9b08e, rough: 0.48, metal: 0.02, wood: true },
    { color: 0x222020, rough: 0.52, metal: 0.28 },
    { color: 0x101012, rough: 0.42, metal: 0.45 },
  ],
  'kowhai-hero-din-01': [{ color: 0xcbb18d, rough: 0.44, metal: 0.02, wood: true }],
  'kowhai-hero-din-02': [{ color: 0xc7a780, rough: 0.58, metal: 0.02, wood: true }],
  'kowhai-hero-din-03': [
    { color: 0xcda472, rough: 0.54, metal: 0.02, wood: true },
    { color: 0x241e1b, rough: 0.38, metal: 0.65 },
    { color: 0xfff3dd, rough: 0.25, metal: 0.0, emissive: 0xffc882, emissiveIntensity: 1.8 },
  ],
  'kowhai-hero-din-04': [
    { color: 0xc6a05b, rough: 0.24, metal: 0.88 }, // brushed brass bar
    { color: 0x241e1b, rough: 0.36, metal: 0.72 }, // suspension rods
    { color: 0xfff3de, rough: 0.24, metal: 0.0, emissive: 0xffca84, emissiveIntensity: 2.1 }, // alabaster diffuser
  ],
  'kowhai-hero-kit-05': [
    { color: 0xbec2c6, rough: 0.22, metal: 0.88 }, // brushed steel espresso body
    { color: 0xe6dfd6, rough: 0.34, metal: 0.1 }, // ceramic cup accents
    { color: 0x222020, rough: 0.42, metal: 0.45 }, // portafilter & tray
  ],
  'kowhai-hero-kit-08': [
    { color: 0xc49c54, rough: 0.22, metal: 0.9 }, // brushed brass gooseneck
    { color: 0x24201d, rough: 0.32, metal: 0.78 },
    { color: 0xc49c54, rough: 0.22, metal: 0.9 },
  ],
  'kowhai-hero-kit-09': [{ color: 0xa67c52, rough: 0.48, metal: 0.04, wood: true }],
  'objects-woolshedbench': [{ color: 0xb98d5e, rough: 0.54, metal: 0.02, wood: true }],
  'objects-pendant': [{ color: 0x9b643c, rough: 0.42, metal: 0.05, wood: true }],
  'curated-sheer-curtain': [
    { color: 0x2a2320, rough: 0.34, metal: 0.78 }, // dark bronze track
    { color: 0xf7f2ea, rough: 0.92, metal: 0.0, opacity: 0.46, transparent: true, doubleSide: true }, // S-fold sheer
  ],
  'kowhai-hero-out-01': [{ color: 0xb68d65, rough: 0.64, metal: 0.02, wood: true }],
  'kowhai-hero-out-02': [
    { color: 0xc8c2b7, rough: 0.78, metal: 0.02 }, // honed concrete planter
    { color: 0x3b312a, rough: 0.85, metal: 0.28 }, // dark weathered steel / soil
  ],
  'kowhai-hero-nat-01': [
    { color: 0x57664a, rough: 0.88, metal: 0.0 },
    { color: 0x34612d, rough: 0.64, metal: 0.0, doubleSide: true },
    { color: 0x3f7034, rough: 0.62, metal: 0.0, doubleSide: true },
  ],
  'kowhai-hero-nat-02': [
    { color: 0x564b43, rough: 0.92, metal: 0.0 },
    { color: 0x3b5634, rough: 0.66, metal: 0.0, doubleSide: true },
    { color: 0xc8222e, rough: 0.58, metal: 0.0, doubleSide: true }, // crimson Pōhutukawa blooms
  ],
  'kowhai-hero-nat-03': [
    { color: 0x44352a, rough: 0.94, metal: 0.0 },
    { color: 0x3f6f31, rough: 0.64, metal: 0.0, doubleSide: true },
  ],
  'manu-tui': [
    { color: 0x15272d, rough: 0.32, metal: 0.36 }, // iridescent blue-green-black plumage
    { color: 0xf7f4ee, rough: 0.85, metal: 0.0 }, // crisp white throat tufts
  ],
};

function syncRangeSlider(input, textFormatter) {
  if (!input) return;
  input.style.setProperty('--attr-min', input.min || '0');
  input.style.setProperty('--attr-max', input.max || '100');
  input.style.setProperty('--control-value', input.value);
  if (textFormatter) input.setAttribute('aria-valuetext', textFormatter(Number(input.value)));
}

const fmtHour = (h) => {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};

let activeStop = null;

export async function mountImmersiveStage(host, ctx = {}, opts = { fullPage: false }) {
  if (!host || typeof document === 'undefined') return () => {};
  ensureStageCss();
  if (activeStop) {
    try { activeStop(); } catch { /* ignore */ }
    activeStop = null;
  }

  const state = {
    cladding: 'cedar',
    joinery: 'bronze',
    layout: 'lounge',
    sunHour: 17.4, // Golden hour raking diagonal cedar brise-soleil bars across travertine & mirror pool
    sectionPct: 0,
    lidar: false,
    walking: false,
    shot: 'arrival',
    fullscreen: !!opts.fullPage,
  };

  const can3d = webglOk();
  const tel0 = calcStageTelemetry(state);

  host.innerHTML = `
    <section class="arch-stage-bleed${opts.fullPage ? ' is-fullscreen' : ''}" aria-label="Interactive 3D architectural model">
      <div class="arch-stage-shell">
        <div class="arch-stage-canvas-wrap">
          ${can3d ? '<canvas class="arch-stage-canvas" aria-label="3D coastal pavilion — drag to orbit or look, scroll to zoom, toggle Walk for 1.68 m first-person walkthrough"></canvas>' : ''}
        </div>
        <div class="arch-stage-scrim"></div>

        <!-- Whisper-minimal top bar -->
        <div class="arch-stage-top">
          <div class="arch-stage-brand">
            <p class="arch-stage-eyebrow">Aotearoa 3D Studio</p>
            <h1 class="arch-stage-title">Walk the architecture.</h1>
          </div>
          <div class="arch-stage-actions">
            <label class="arch-pill" tabindex="0" title="Drop or choose a 2D Plan, Multi-Sheet PDF, IFC or GLB">
              <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.ifc,.glb,.gltf,.json" hidden data-stage-file />
              <span>+ Drop Plan / IFC / GLB</span>
            </label>
            <a class="arch-pill" href="/landscape/" title="Paint photorealistic 3D Aotearoa native planting beds on studio or real LINZ land">Native Landscape ↗</a>
            <a class="arch-pill is-primary" href="${DROP_URL}?from=ops" data-stage-open-studio>Open 3D Studio ↗</a>
            <button type="button" class="arch-pill arch-icon-pill" data-stage-fs aria-pressed="${opts.fullPage ? 'true' : 'false'}" title="Toggle fullscreen 3D">${opts.fullPage ? 'Exit' : '⛶'}</button>
          </div>
        </div>

        <div class="arch-walk-hint" aria-live="polite">1.68 m Walk · WASD / Arrows to move · Drag to look · Esc to orbit</div>

        <!-- Compact tactile bottom instrument bar -->
        <div class="arch-stage-bar-wrap">
          <div class="arch-stage-bar" role="toolbar" aria-label="3D architectural controls">
            <div class="arch-bar-cluster" role="group" aria-label="Camera views">
              ${SHOTS.map((s, i) => `<button type="button" class="arch-shot-btn" data-shot="${s.id}" aria-pressed="${i === 0 ? 'true' : 'false'}">${s.label}</button>`).join('')}
              <button type="button" class="arch-walk-btn" data-walk-btn aria-pressed="false" title="Toggle 1.68 m collision-aware first-person walkthrough (WASD / Arrows + drag to look)">Walk</button>
            </div>

            <span class="arch-bar-sep" aria-hidden="true"></span>

            <div class="arch-bar-cluster arch-swatch-group" role="group" aria-label="Exterior material palette">
              ${Object.entries(STAGE_SPECS.cladding)
                .map(([k, v]) => `<button type="button" class="arch-swatch-btn" data-cladding="${k}" style="background:${v.swatch}" aria-label="${v.label}" title="${v.label}" aria-pressed="${k === state.cladding ? 'true' : 'false'}"></button>`)
                .join('')}
            </div>

            <div class="arch-bar-cluster" role="group" aria-label="Interior programme">
              ${Object.entries(STAGE_SPECS.layout)
                .map(([k, v]) => `<button type="button" class="arch-mode-btn" data-layout="${k}" title="${v.label}" aria-pressed="${k === state.layout ? 'true' : 'false'}">${v.short}</button>`)
                .join('')}
            </div>

            <span class="arch-bar-sep" aria-hidden="true"></span>

            <label class="arch-slider-ctl" for="archSunSlider" title="Scrub New Zealand solar path (06:30 to 20:30)">
              <span data-sun-lbl>${fmtHour(state.sunHour)}</span>
              <input type="range" id="archSunSlider" min="6.5" max="20.5" step="0.1" value="${state.sunHour}" data-sun-slider />
            </label>

            <label class="arch-slider-ctl" for="archSecSlider" title="Slice live 3D architectural section plane">
              <span>Section</span>
              <input type="range" id="archSecSlider" min="0" max="100" step="1" value="0" data-sec-slider />
            </label>

            <button type="button" class="arch-mode-btn" data-lidar-btn aria-pressed="false" title="Toggle 1 m LINZ LiDAR elevation contours & parcel boundary">LiDAR</button>

            <button type="button" class="arch-delta-pill" popovertarget="archSpecPopover" data-delta-pill title="View live NZD cost, joinery & lead-time breakdown">${tel0.compactText}</button>
          </div>
        </div>

        <!-- On-demand specification & programme popover -->
        <div id="archSpecPopover" class="arch-spec-popover" popover>
          <div class="arch-pop-kicker">Illustrative NZ Spec &amp; Programme</div>
          <div class="arch-pop-grid">
            <div>
              <div class="arch-pop-val" data-pop-cost>${tel0.deltaText}</div>
              <div class="arch-pop-sub">Envelope &amp; fit-out delta</div>
            </div>
            <div>
              <div class="arch-pop-val" data-pop-delay>${tel0.delayText}</div>
              <div class="arch-pop-sub" data-pop-driver>Lead: ${tel0.maxLead} wks (${tel0.driver})</div>
            </div>
          </div>
          <div>
            <div class="arch-pop-kicker" style="margin-bottom:6px">Joinery &amp; Structural Columns</div>
            <div class="arch-pop-joinery" role="group" aria-label="Joinery finish">
              ${Object.entries(STAGE_SPECS.joinery)
                .map(([k, v]) => `<button type="button" class="arch-pop-chip" data-joinery="${k}" aria-pressed="${k === state.joinery ? 'true' : 'false'}">${v.label}</button>`)
                .join('')}
            </div>
          </div>
          <div class="arch-pop-sub" data-pop-note>${tel0.notes}</div>
        </div>
      </div>
    </section>`;

  const root = host.querySelector('.arch-stage-bleed');
  const sunSlider = root.querySelector('[data-sun-slider]');
  const secSlider = root.querySelector('[data-sec-slider]');
  syncRangeSlider(sunSlider, (v) => `Sun ${fmtHour(v)}`);
  syncRangeSlider(secSlider, (v) => (v === 0 ? 'Uncut' : `${v}% section cut`));

  const syncHud = () => {
    const t = calcStageTelemetry(state);
    const pill = root.querySelector('[data-delta-pill]');
    if (pill) pill.textContent = t.compactText;
    const pc = root.querySelector('[data-pop-cost]');
    const pd = root.querySelector('[data-pop-delay]');
    const pdrv = root.querySelector('[data-pop-driver]');
    const pn = root.querySelector('[data-pop-note]');
    if (pc) pc.textContent = t.deltaText;
    if (pd) pd.textContent = t.delayText;
    if (pdrv) pdrv.textContent = `Lead: ${t.maxLead} wks (${t.driver})`;
    if (pn) pn.textContent = t.notes;
  };

  // Drag-and-drop or file-pick straight into /plan-studio/twins/drop/
  const handoffFile = async (file) => {
    if (!file) return;
    const pill = root.querySelector('[data-delta-pill]');
    if (pill) pill.textContent = 'Opening Studio…';
    try {
      if (ctx?.practice?.name) await keepBrand(ctx.practice.name).catch(() => {});
      const id = await putHandoff(file, file.name);
      location.href = `${DROP_URL}?handoff=${encodeURIComponent(id)}&from=ops`;
    } catch {
      location.href = `${DROP_URL}?from=ops`;
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
  root.addEventListener('dragleave', (e) => {
    if (!root.contains(e.relatedTarget)) root.classList.remove('is-dragover');
  });
  root.addEventListener('drop', (e) => {
    e.preventDefault();
    root.classList.remove('is-dragover');
    const f = e.dataTransfer?.files?.[0];
    if (f) void handoffFile(f);
  });

  let onResize = () => {};
  root.querySelector('[data-stage-fs]')?.addEventListener('click', (e) => {
    if (opts.fullPage && ctx?.navigate) { ctx.navigate('#/'); return; }
    state.fullscreen = !state.fullscreen;
    root.classList.toggle('is-fullscreen', state.fullscreen);
    e.currentTarget.setAttribute('aria-pressed', String(state.fullscreen));
    e.currentTarget.textContent = state.fullscreen ? 'Exit' : '⛶';
    setTimeout(onResize, 30);
  });

  let stopped = false;
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
      renderer.toneMappingExposure = 1.02;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.localClippingEnabled = true;

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0xdccab9, 0.004);

      const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.18, 900);

      // Equirectangular skies & PMREM IBL
      const pmrem = new THREE.PMREMGenerator(renderer);
      pmrem.compileEquirectangularShader();
      const skies = {
        day: buildEquirectSky(THREE, 'day'),
        golden: buildEquirectSky(THREE, 'golden'),
        dusk: buildEquirectSky(THREE, 'dusk'),
      };
      const envs = {
        day: pmrem.fromEquirectangular(skies.day).texture,
        golden: pmrem.fromEquirectangular(skies.golden).texture,
        dusk: pmrem.fromEquirectangular(skies.dusk).texture,
      };
      scene.background = skies.golden;
      scene.environment = envs.golden;

      const sectionPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 20);

      // Lighting: crisp architectural sun shadows for brise-soleil bars + warm interior + dynamic hearth light
      const hemi = new THREE.HemisphereLight(0xfbe8d4, 0x45493a, 0.62);
      const sun = new THREE.DirectionalLight(0xffcf99, 3.7);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.left = -22;
      sun.shadow.camera.right = 22;
      sun.shadow.camera.top = 22;
      sun.shadow.camera.bottom = -22;
      sun.shadow.camera.near = 2;
      sun.shadow.camera.far = 125;
      sun.shadow.bias = -0.00025;
      sun.shadow.normalBias = 0.014;
      scene.add(hemi, sun, sun.target);

      const interiorLights = [];
      for (const [lx, ly, lz, intensity, dist] of [
        [-2.2, 3.0, 0.6, 13, 18],
        [4.2, 3.0, 0.5, 13, 18],
        [-6.4, 3.1, -3.5, 10, 14],
        [1.2, 0.65, 5.4, 4.5, 9], // subtle warm mirror-pool cove glow
      ]) {
        const pl = new THREE.PointLight(0xffc98c, intensity, dist, 1.5);
        pl.position.set(lx, ly, lz);
        pl.userData.baseInt = intensity;
        scene.add(pl);
        interiorLights.push(pl);
      }

      // Dynamic flickering hearth fire point light
      const fireLight = new THREE.PointLight(0xff7e30, 8.5, 10, 1.8);
      fireLight.position.set(-2.2, 0.96, -1.88);
      scene.add(fireLight);

      // Procedural PBR texture sets
      const texSets = {
        cedar: buildCedarPbr(THREE, false),
        charred: buildCedarPbr(THREE, true),
        soffit: buildSlattedSoffitPbr(THREE),
        boardConcrete: buildBoardFormedConcretePbr(THREE),
        concrete: buildConcretePbr(THREE),
        seam: buildStandingSeamPbr(THREE),
        travertine: buildTravertinePbr(THREE),
        kwila: buildKwilaDeckPbr(THREE),
        pavers: buildFirthPaversPbr(THREE),
        mulch: buildMulchPbr(THREE),
        hillside: buildHillsidePbr(THREE),
        boucleBump: buildBoucleBump(THREE),
      };

      // 1. Coastal Headland Terrain + 1 m LINZ Contour Shader + Distant Sea Horizon
      const tGeo = new THREE.PlaneGeometry(240, 240, 160, 160);
      tGeo.rotateX(-Math.PI / 2);
      const tPos = tGeo.attributes.position;
      for (let i = 0; i < tPos.count; i++) {
        tPos.setY(i, terrainHeight(tPos.getX(i), tPos.getZ(i)));
      }
      tGeo.computeVertexNormals();

      const lidarUniforms = { uLidar: { value: 0 }, uScan: { value: 0 } };
      const terrainMat = new THREE.MeshStandardMaterial({
        map: texSets.hillside.map,
        bumpMap: texSets.hillside.bumpMap,
        bumpScale: 0.28,
        roughness: 0.94,
        metalness: 0.0,
        envMapIntensity: 0.45,
      });
      terrainMat.onBeforeCompile = (sh) => {
        sh.uniforms.uLidar = lidarUniforms.uLidar;
        sh.uniforms.uScan = lidarUniforms.uScan;
        sh.vertexShader = `varying vec3 vWPos;\n` + sh.vertexShader.replace(
          '#include <worldpos_vertex>',
          `#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
        );
        sh.fragmentShader = `uniform float uLidar;\nuniform float uScan;\nvarying vec3 vWPos;\n` + sh.fragmentShader.replace(
          '#include <dithering_fragment>',
          `if (uLidar > 0.005) {
             float c1m = 1.0 - smoothstep(0.0, 0.042, abs(fract(vWPos.y + 0.5) - 0.5));
             float ring = exp(-pow((length(vWPos.xz) - uScan) * 0.35, 2.0)) * smoothstep(85.0, 18.0, length(vWPos.xz));
             vec3 lCol = vec3(0.96, 0.91, 0.88);
             gl_FragColor.rgb = mix(gl_FragColor.rgb, lCol, (c1m * 0.55 + ring * 0.38) * uLidar);
           }
           #include <dithering_fragment>`
        );
      };
      const terrain = new THREE.Mesh(tGeo, terrainMat);
      terrain.receiveShadow = true;
      scene.add(terrain);

      // Distant Waitematā / Coastal Sea Horizon
      const seaMat = new THREE.MeshPhysicalMaterial({
        color: 0x265064,
        roughness: 0.14,
        metalness: 0.08,
        reflectivity: 0.92,
        envMapIntensity: 1.35,
      });
      const sea = new THREE.Mesh(new THREE.CircleGeometry(460, 64).rotateX(-Math.PI / 2), seaMat);
      sea.position.set(0, -3.2, 112);
      scene.add(sea);

      // Legal parcel boundary ribbon (shown when LiDAR is active)
      const parcelGroup = new THREE.Group();
      parcelGroup.visible = false;
      const bPts = [[-19, 17], [19, 17], [19, -15], [-19, -15], [-19, 17]].map(
        ([bx, bz]) => new THREE.Vector3(bx, terrainHeight(bx, bz) + 0.18, bz)
      );
      parcelGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(bPts), new THREE.LineBasicMaterial({ color: 0xfffdfb, transparent: true, opacity: 0.88 })));
      scene.add(parcelGroup);

      // 2. Architectural Materials (clipped cleanly by sectionPlane)
      const clipOpts = { clippingPlanes: [sectionPlane], clipShadows: true };

      const claddingMat = new THREE.MeshStandardMaterial({
        color: STAGE_SPECS.cladding.cedar.hex,
        map: texSets.cedar.map,
        roughnessMap: texSets.cedar.roughnessMap,
        bumpMap: texSets.cedar.bumpMap,
        bumpScale: 0.04,
        roughness: 0.62,
        metalness: 0.02,
        envMapIntensity: 0.88,
        ...clipOpts,
      });

      const boardConcreteMat = new THREE.MeshStandardMaterial({
        color: 0xd0cac0,
        map: texSets.boardConcrete.map,
        roughnessMap: texSets.boardConcrete.roughnessMap,
        bumpMap: texSets.boardConcrete.bumpMap,
        bumpScale: 0.042,
        roughness: 0.84,
        envMapIntensity: 0.68,
        ...clipOpts,
      });

      const concreteMat = new THREE.MeshStandardMaterial({
        color: 0xd5cfc5,
        map: texSets.concrete.map,
        roughnessMap: texSets.concrete.roughnessMap,
        bumpMap: texSets.concrete.bumpMap,
        bumpScale: 0.026,
        roughness: 0.8,
        envMapIntensity: 0.72,
        ...clipOpts,
      });

      const travertineMat = new THREE.MeshStandardMaterial({
        color: 0xeae1d3,
        map: texSets.travertine.map,
        bumpMap: texSets.travertine.bumpMap,
        bumpScale: 0.022,
        roughness: 0.34,
        envMapIntensity: 1.05,
        ...clipOpts,
      });

      const soffitSlattedMat = new THREE.MeshStandardMaterial({
        color: 0xdcb488,
        map: texSets.soffit.map,
        bumpMap: texSets.soffit.bumpMap,
        bumpScale: 0.032,
        roughness: 0.54,
        envMapIntensity: 0.9,
        ...clipOpts,
      });

      const cedarBattenMat = new THREE.MeshStandardMaterial({
        color: 0xc28a5c,
        map: texSets.cedar.map,
        bumpMap: texSets.cedar.bumpMap,
        bumpScale: 0.022,
        roughness: 0.56,
        envMapIntensity: 0.85,
        ...clipOpts,
      });

      const kwilaMat = new THREE.MeshStandardMaterial({
        color: 0xd8a888,
        map: texSets.kwila.map,
        bumpMap: texSets.kwila.bumpMap,
        bumpScale: 0.03,
        roughness: 0.62,
        envMapIntensity: 0.78,
      });

      const firthPaverMat = new THREE.MeshStandardMaterial({
        color: 0x9fa3a8,
        map: texSets.pavers.map,
        bumpMap: texSets.pavers.bumpMap,
        bumpScale: 0.028,
        roughness: 0.84,
        envMapIntensity: 0.52,
      });

      const roofSeamMat = new THREE.MeshStandardMaterial({
        color: 0x26282c,
        map: texSets.seam.map,
        bumpMap: texSets.seam.bumpMap,
        bumpScale: 0.03,
        roughness: 0.36,
        metalness: 0.7,
        envMapIntensity: 1.28,
        ...clipOpts,
      });

      const joineryMat = new THREE.MeshStandardMaterial({
        color: STAGE_SPECS.joinery.bronze.hex,
        roughness: STAGE_SPECS.joinery.bronze.rough,
        metalness: STAGE_SPECS.joinery.bronze.metal,
        envMapIntensity: 1.48,
        ...clipOpts,
      });

      const darkSteelMat = new THREE.MeshStandardMaterial({
        color: 0x1d1917,
        roughness: 0.34,
        metalness: 0.82,
        envMapIntensity: 1.25,
        ...clipOpts,
      });

      const shadowGapMat = new THREE.MeshStandardMaterial({
        color: 0x121010,
        roughness: 0.92,
        metalness: 0.1,
        ...clipOpts,
      });

      const plasterMat = new THREE.MeshStandardMaterial({
        color: 0xf4efe8,
        roughness: 0.84,
        envMapIntensity: 0.6,
        ...clipOpts,
      });

      const basaltMat = new THREE.MeshStandardMaterial({
        color: 0x2f3133,
        map: texSets.concrete.map,
        bumpMap: texSets.concrete.bumpMap,
        bumpScale: 0.04,
        roughness: 0.78,
        envMapIntensity: 0.65,
      });

      const wetBasaltMat = new THREE.MeshStandardMaterial({
        color: 0x1c1e20,
        roughness: 0.24,
        metalness: 0.08,
        envMapIntensity: 1.35,
      });

      const cortenMat = new THREE.MeshStandardMaterial({
        color: 0x8b4426,
        roughness: 0.82,
        metalness: 0.26,
      });

      const mulchMat = new THREE.MeshStandardMaterial({
        map: texSets.mulch.map,
        bumpMap: texSets.mulch.bumpMap,
        bumpScale: 0.05,
        roughness: 0.96,
      });

      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xd4e2e4,
        transparent: true,
        opacity: 0.14,
        roughness: 0.025,
        metalness: 0.0,
        reflectivity: 0.96,
        envMapIntensity: 1.78,
        depthWrite: false,
        side: THREE.FrontSide,
        ...clipOpts,
      });

      // 3. Cantilevered Coastal Courtyard Pavilion
      const building = new THREE.Group();
      scene.add(building);

      // Recessed dark basalt sub-plinth (floating shadow reveal beneath concrete slab)
      const subPlinth = new THREE.Mesh(new THREE.BoxGeometry(19.6, 0.28, 12.2), basaltMat);
      subPlinth.position.set(0.5, -0.08, 0.2);
      subPlinth.receiveShadow = true;
      building.add(subPlinth);

      // Main cantilevered honed aggregate concrete structural slab
      const mainPlinth = new THREE.Mesh(new THREE.BoxGeometry(20.2, 0.24, 13.0), concreteMat);
      mainPlinth.position.set(0.6, 0.14, 0.6);
      mainPlinth.receiveShadow = true;
      mainPlinth.castShadow = true;
      building.add(mainPlinth);

      // Interior Honed Veincut Travertine Floor (top at y = +0.30 m)
      const intFloor = new THREE.Mesh(new THREE.BoxGeometry(16.7, 0.06, 9.2), travertineMat);
      intFloor.position.set(0.15, 0.27, -0.5);
      intFloor.receiveShadow = true;
      building.add(intFloor);

      // Flush dark-bronze architectural threshold slot drain between travertine & Kwila deck
      const slotDrain = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.062, 0.06), darkSteelMat);
      slotDrain.position.set(2.8, 0.27, 4.12);
      building.add(slotDrain);

      // Cantilevered Kwila Hardwood Outdoor Living Terrace Deck (flush at y = +0.30 m)
      const kwilaDeck = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.12, 4.8), kwilaMat);
      kwilaDeck.position.set(6.85, 0.24, 6.52);
      kwilaDeck.castShadow = kwilaDeck.receiveShadow = true;
      building.add(kwilaDeck);
      // Dark bronze steel cantilever deck fascia & sub-bearers
      const deckFascia = new THREE.Mesh(new THREE.BoxGeometry(6.54, 0.14, 4.84), darkSteelMat);
      deckFascia.position.set(6.85, 0.15, 6.52);
      deckFascia.castShadow = true;
      building.add(deckFascia);

      // Firth Black Sands Forecourt Arrival Apron
      const apron = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.08, 3.0), firthPaverMat);
      apron.position.set(6.0, -0.14, 11.75);
      apron.receiveShadow = true;
      building.add(apron);

      // 3 Wide Floating Concrete/Basalt Arrival Treads with Recessed Warm LED Step Nosing
      const ledStripMat = new THREE.MeshStandardMaterial({ color: 0xffe8c2, emissive: 0xffc070, emissiveIntensity: 2.8, roughness: 0.3 });
      for (let s = 0; s < 3; s++) {
        const sy = -0.02 + s * 0.13;
        const sz = 10.9 - s * 0.78;
        const tread = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.09, 0.84), concreteMat);
        tread.position.set(6.9, sy, sz);
        tread.castShadow = tread.receiveShadow = true;
        const riser = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.08, 0.54), basaltMat);
        riser.position.set(6.9, sy - 0.075, sz - 0.12);
        const led = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.015, 0.03), ledStripMat);
        led.position.set(6.9, sy - 0.048, sz + 0.34);
        building.add(tread, riser, led);
      }

      // Infinity-Edge Dark Auckland Basalt Reflecting Pool + True Planar WebGLRenderTarget Mirror Reflection
      const poolW = 11.6, poolD = 6.0, poolCX = -2.3, poolCZ = 7.35;
      const poolBasin = new THREE.Mesh(new THREE.BoxGeometry(poolW + 0.32, 0.38, poolD + 0.32), basaltMat);
      poolBasin.position.set(poolCX, 0.01, poolCZ);
      poolBasin.receiveShadow = true;
      building.add(poolBasin);

      // Wet knife-edge infinity weir coping lips (seaward & west edges)
      const weirSouth = new THREE.Mesh(new THREE.BoxGeometry(poolW + 0.36, 0.045, 0.18), wetBasaltMat);
      weirSouth.position.set(poolCX, 0.205, poolCZ + poolD * 0.5 + 0.1);
      const weirWest = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.045, poolD + 0.36), wetBasaltMat);
      weirWest.position.set(poolCX - poolW * 0.5 - 0.1, 0.205, poolCZ);
      const weirEast = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.045, poolD + 0.36), wetBasaltMat);
      weirEast.position.set(poolCX + poolW * 0.5 + 0.1, 0.205, poolCZ);
      // Warm underwater linear cove LED along pavilion threshold edge
      const poolCoveLed = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.02, 0.035), ledStripMat);
      poolCoveLed.position.set(-1.6, 0.16, poolCZ - poolD * 0.5 + 0.08);
      building.add(weirSouth, weirWest, weirEast, poolCoveLed);

      const waterUniforms = {
        uTime: { value: 0 },
        tMirror: { value: null },
        uTexMatrix: { value: new THREE.Matrix4() },
        uSunDir: { value: new THREE.Vector3(0.5, 0.4, 0.5) },
        uSunColor: { value: new THREE.Color(0xffcf99) },
      };
      const mirrorRT = new THREE.WebGLRenderTarget(1024, 1024, { samples: 4, type: THREE.HalfFloatType });
      waterUniforms.tMirror.value = mirrorRT.texture;
      const mirrorCam = new THREE.PerspectiveCamera();
      const reflPlane = new THREE.Plane();
      const reflNormal = new THREE.Vector3(0, 1, 0);
      const reflPos = new THREE.Vector3();
      const camPos = new THREE.Vector3();
      const rotMat = new THREE.Matrix4();
      const lookPos = new THREE.Vector3();
      const viewVec = new THREE.Vector3();
      const targetVec = new THREE.Vector3();
      const clipVec = new THREE.Vector4();
      const qVec = new THREE.Vector4();

      const waterMat = new THREE.ShaderMaterial({
        uniforms: waterUniforms,
        vertexShader: `
          uniform mat4 uTexMatrix;
          varying vec4 vMirrorUv;
          varying vec3 vWorldPos;
          void main() {
            vMirrorUv = uTexMatrix * vec4(position, 1.0);
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorldPos = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `,
        fragmentShader: `
          uniform sampler2D tMirror;
          uniform float uTime;
          uniform vec3 uSunDir;
          uniform vec3 uSunColor;
          varying vec4 vMirrorUv;
          varying vec3 vWorldPos;
          void main() {
            vec4 uvProj = vMirrorUv;
            float w1 = sin(vWorldPos.x * 3.4 + uTime * 1.35) * cos(vWorldPos.z * 3.9 - uTime * 1.05);
            float w2 = sin((vWorldPos.x * 0.85 - vWorldPos.z * 0.95) * 6.8 - uTime * 1.85) * 0.48;
            float w3 = cos((vWorldPos.x + vWorldPos.z * 1.2) * 11.2 + uTime * 2.3) * 0.22;
            vec2 rip = vec2(w1 + w2 + w3, w1 - w2 + w3 * 0.6);
            uvProj.xy += rip * 0.011 * uvProj.w;
            vec3 refl = texture2DProj(tMirror, uvProj).rgb;

            vec3 nrm = normalize(vec3(rip.x * 0.022, 1.0, rip.y * 0.022));
            vec3 viewDir = normalize(cameraPosition - vWorldPos);
            float ndv = clamp(dot(nrm, viewDir), 0.0, 1.0);
            float fresnel = mix(0.28, 0.95, pow(1.0 - ndv, 3.6));

            // Crisp solar specular shimmer across wind-rippled basalt mirror water
            vec3 hVec = normalize(normalize(uSunDir) + viewDir);
            float spec = pow(max(dot(nrm, hVec), 0.0), 180.0) * 1.35;

            vec3 deepBasalt = vec3(0.036, 0.058, 0.072);
            vec3 col = mix(deepBasalt, refl * 1.06, fresnel) + uSunColor * spec;
            gl_FragColor = vec4(col, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `,
      });
      const waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(poolW, poolD).rotateX(-Math.PI / 2), waterMat);
      waterMesh.position.set(poolCX, 0.20, poolCZ);
      waterMesh.onBeforeRender = (rndr, scn, cam) => {
        reflPos.setFromMatrixPosition(waterMesh.matrixWorld);
        camPos.setFromMatrixPosition(cam.matrixWorld);
        if (camPos.y <= reflPos.y + 0.02) return;
        viewVec.subVectors(reflPos, camPos).reflect(reflNormal).negate().add(reflPos);
        rotMat.extractRotation(cam.matrixWorld);
        lookPos.set(0, 0, -1).applyMatrix4(rotMat).add(camPos);
        targetVec.subVectors(reflPos, lookPos).reflect(reflNormal).negate().add(reflPos);

        mirrorCam.position.copy(viewVec);
        mirrorCam.up.set(0, 1, 0).applyMatrix4(rotMat).reflect(reflNormal);
        mirrorCam.lookAt(targetVec);
        mirrorCam.far = cam.far;
        mirrorCam.updateMatrixWorld();
        mirrorCam.projectionMatrix.copy(cam.projectionMatrix);

        waterUniforms.uTexMatrix.value
          .set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1)
          .multiply(mirrorCam.projectionMatrix)
          .multiply(mirrorCam.matrixWorldInverse)
          .multiply(waterMesh.matrixWorld);

        reflPlane.setFromNormalAndCoplanarPoint(reflNormal, reflPos).applyMatrix4(mirrorCam.matrixWorldInverse);
        clipVec.set(reflPlane.normal.x, reflPlane.normal.y, reflPlane.normal.z, reflPlane.constant);
        const pm = mirrorCam.projectionMatrix.elements;
        qVec.set((Math.sign(clipVec.x) + pm[8]) / pm[0], (Math.sign(clipVec.y) + pm[9]) / pm[5], -1.0, (1.0 + pm[10]) / pm[14]);
        clipVec.multiplyScalar(2.0 / clipVec.dot(qVec));
        pm[2] = clipVec.x;
        pm[6] = clipVec.y;
        pm[10] = clipVec.z + 1.0 - 0.003;
        pm[14] = clipVec.w;

        waterMesh.visible = false;
        const prevRT = rndr.getRenderTarget();
        const prevShadow = rndr.shadowMap.autoUpdate;
        rndr.shadowMap.autoUpdate = false;
        rndr.setRenderTarget(mirrorRT);
        rndr.state.buffers.depth.setMask(true);
        rndr.clear();
        rndr.render(scn, mirrorCam);
        rndr.shadowMap.autoUpdate = prevShadow;
        rndr.setRenderTarget(prevRT);
        waterMesh.visible = true;
      };
      building.add(waterMesh);

      // 5 Floating Honed Firth Black Sands / Basalt Stepping Monoliths crossing the Reflecting Pool to open slider!
      for (let st = 0; st < 5; st++) {
        const pz = 10.0 - st * 1.24;
        const pad = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.08, 0.86), firthPaverMat);
        pad.position.set(2.68, 0.235, pz);
        pad.castShadow = pad.receiveShadow = true;
        const stem = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.16, 0.62), wetBasaltMat);
        stem.position.set(2.68, 0.12, pz);
        building.add(pad, stem);
      }

      // Straightcurve Corten / Auckland Basalt Edged Daltons-Mulched Courtyard Planting Beds
      const addPlantingBed = (bx, bz, bw, bd, edging = 'corten') => {
        const y0 = Math.max(-0.18, terrainHeight(bx, bz));
        const soil = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.14, bd), mulchMat);
        soil.position.set(bx, y0 + 0.07, bz);
        soil.receiveShadow = true;
        const edgeMat = edging === 'corten' ? cortenMat : basaltMat;
        const eh = 0.18, et = 0.04;
        const eN = new THREE.Mesh(new THREE.BoxGeometry(bw + et * 2, eh, et), edgeMat);
        eN.position.set(bx, y0 + eh * 0.5, bz - bd * 0.5);
        const eS = eN.clone();
        eS.position.z = bz + bd * 0.5;
        const eW = new THREE.Mesh(new THREE.BoxGeometry(et, eh, bd), edgeMat);
        eW.position.set(bx - bw * 0.5, y0 + eh * 0.5, bz);
        const eE = eW.clone();
        eE.position.x = bx + bw * 0.5;
        for (const m of [eN, eS, eW, eE]) { m.castShadow = m.receiveShadow = true; building.add(m); }
        building.add(soil);
      };
      addPlantingBed(-10.1, 7.6, 3.2, 6.2, 'corten');
      addPlantingBed(11.3, 6.2, 2.8, 6.6, 'corten');
      addPlantingBed(-2.2, 11.4, 9.8, 1.8, 'basalt');

      // Primary Pavilion Architectural Massing (Swappable Cladding + Recessed Shadow-Gap Rebates)
      const wallH = 3.38;
      const baseY = 0.30;
      const roofY = baseY + wallH;

      const walls = [
        // Rear north-west spine wall
        { w: 16.8, h: wallH - 0.04, d: 0.30, x: 0.15, y: baseY + (wallH - 0.04) / 2, z: -5.0, mat: claddingMat },
        // Left sculptural cedar gallery wing
        { w: 0.34, h: wallH + 0.48, d: 11.2, x: -8.22, y: baseY + (wallH + 0.48) / 2, z: 0.45, mat: claddingMat },
        { w: 4.8, h: wallH + 0.48, d: 0.34, x: -5.82, y: baseY + (wallH + 0.48) / 2, z: 6.02, mat: claddingMat },
        // Right recessed blade wall (stops at z = -0.8 to open corner terrace!)
        { w: 0.32, h: wallH - 0.04, d: 4.2, x: 8.45, y: baseY + (wallH - 0.04) / 2, z: -2.9, mat: claddingMat },
        // Interior plaster gallery partition
        { w: 0.22, h: wallH - 0.14, d: 4.1, x: 2.82, y: baseY + (wallH - 0.14) / 2, z: -2.85, mat: plasterMat },
      ];
      for (const w of walls) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w.w, w.h, w.d), w.mat);
        m.position.set(w.x, w.y, w.z);
        m.castShadow = m.receiveShadow = true;
        building.add(m);
      }

      // Recessed 45 mm Dark Shadow-Gap Soffit Rebates along Wall Heads & Plaster Partition
      for (const [rx, ry, rz, rw, rd] of [
        [0.15, roofY - 0.02, -4.96, 16.7, 0.34],
        [8.45, roofY - 0.02, -2.9, 0.36, 4.2],
        [2.82, roofY - 0.07, -2.85, 0.18, 4.06],
      ]) {
        const reb = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.05, rd), shadowGapMat);
        reb.position.set(rx, ry, rz);
        building.add(reb);
      }

      // Sculptural Board-Formed In-Situ Concrete Fireplace Core + Cantilevered Hearth Bench + Flickering Fire Slot
      const hearthGroup = new THREE.Group();
      const chimneyBreast = new THREE.Mesh(new THREE.BoxGeometry(3.05, wallH + 0.72, 0.64), boardConcreteMat);
      chimneyBreast.position.set(-2.2, baseY + (wallH + 0.72) / 2, -2.25);
      chimneyBreast.castShadow = chimneyBreast.receiveShadow = true;
      hearthGroup.add(chimneyBreast);

      // Cantilevered floating hearth plinth bench
      const hearthBench = new THREE.Mesh(new THREE.BoxGeometry(4.25, 0.32, 0.90), boardConcreteMat);
      hearthBench.position.set(-2.2, baseY + 0.28, -2.14);
      hearthBench.castShadow = hearthBench.receiveShadow = true;
      hearthGroup.add(hearthBench);

      // Recessed blackened-steel firebox frame & architectural fire slot
      const fireSurround = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.56, 0.14), darkSteelMat);
      fireSurround.position.set(-2.2, baseY + 0.78, -1.94);
      const fireCavity = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.42, 0.16), shadowGapMat);
      fireCavity.position.set(-2.2, baseY + 0.78, -1.91);
      hearthGroup.add(fireSurround, fireCavity);

      // Charred kanuka logs + glowing ember bed
      const emberMat = new THREE.MeshStandardMaterial({ color: 0x2a1006, emissive: 0xff4c0a, emissiveIntensity: 3.4, roughness: 0.9, ...clipOpts });
      const emberBed = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.055, 0.18), emberMat);
      emberBed.position.set(-2.2, baseY + 0.60, -1.90);
      hearthGroup.add(emberBed);

      const charLogMat = new THREE.MeshStandardMaterial({ color: 0x1a1310, emissive: 0x8a2204, emissiveIntensity: 0.55, roughness: 0.95, ...clipOpts });
      for (let lg = 0; lg < 4; lg++) {
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 0.44, 8), charLogMat);
        log.position.set(-2.65 + lg * 0.30, baseY + 0.65, -1.89);
        log.rotation.set(0.18, 0.35 - lg * 0.22, Math.PI * 0.48 + (lg % 2 ? 0.12 : -0.1));
        hearthGroup.add(log);
      }

      // Procedural Animated Architectural Fire-Glow Slot Shader (layered warm flame ribbons)
      const fireUniforms = { uTime: { value: 0 } };
      const fireShaderMat = new THREE.ShaderMaterial({
        uniforms: fireUniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          varying vec2 vUv;
          float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float noise(vec2 p) {
            vec2 i = floor(p), f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
          }
          void main() {
            vec2 uv = vUv;
            float n = noise(vec2(uv.x * 7.5, uv.y * 3.8 - uTime * 3.4)) * 0.65
                    + noise(vec2(uv.x * 16.0, uv.y * 7.5 - uTime * 5.6)) * 0.35;
            float edgeX = smoothstep(0.0, 0.16, uv.x) * smoothstep(1.0, 0.84, uv.x);
            float flame = smoothstep(uv.y * 0.92, uv.y * 0.92 + 0.32, n + 0.28 * (1.0 - uv.y));
            float mask = flame * edgeX * smoothstep(1.0, 0.18, uv.y);
            vec3 core = vec3(1.0, 0.86, 0.45);
            vec3 mid = vec3(1.0, 0.44, 0.10);
            vec3 tip = vec3(0.85, 0.16, 0.03);
            vec3 col = mix(tip, mix(mid, core, smoothstep(0.55, 0.05, uv.y)), clamp(n + 0.25, 0.0, 1.0));
            gl_FragColor = vec4(col * 1.55, mask * 0.92);
          }
        `,
      });
      const flamePlane = new THREE.Mesh(new THREE.PlaneGeometry(1.32, 0.34), fireShaderMat);
      flamePlane.position.set(-2.2, baseY + 0.78, -1.84);
      hearthGroup.add(flamePlane);

      // Blackened steel chimney flue cap above roof
      const flueCap = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 0.42), darkSteelMat);
      flueCap.position.set(-2.2, roofY + 0.84, -2.25);
      flueCap.castShadow = true;
      hearthGroup.add(flueCap);
      building.add(hearthGroup);

      // Slatted Western Red Cedar Vertical Brise-Soleil Screen on Courtyard Wing (18 angled battens + bronze tie rods)
      const briseCount = 18;
      for (let i = 0; i < briseCount; i++) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.045, wallH + 0.44, 0.22), cedarBattenMat);
        fin.position.set(-8.02 + i * 0.26, baseY + (wallH + 0.44) / 2, 6.26);
        fin.rotation.y = 0.36; // angled to slice golden afternoon rays
        fin.castShadow = fin.receiveShadow = true;
        building.add(fin);
      }
      for (const ty of [baseY + 0.85, baseY + 1.95, baseY + 3.05]) {
        const rod = new THREE.Mesh(new THREE.BoxGeometry(4.65, 0.025, 0.025), joineryMat);
        rod.position.set(-5.8, ty, 6.26);
        building.add(rod);
      }

      // Expressed Dark-Bronze 200UC Structural Steel H-Columns with Bolted Baseplates
      for (const [cx, cz] of [
        [-3.05, 4.1],
        [2.6, 4.1],
        [8.25, 4.1],
        [8.25, -0.75],
        [-3.42, 6.02],
      ]) {
        const col = createSteelHColumn(THREE, wallH - 0.02, joineryMat, darkSteelMat);
        col.position.set(cx, baseY, cz);
        building.add(col);
      }

      // Floor-to-Ceiling Slim Bronze Glazing Sliders (with TWO wide open corner thresholds for indoor-outdoor flow!)
      const glassBays = [
        { w: 4.0, h: wallH - 0.08, x: -1.02, z: 4.1, ry: 0 }, // Fixed/closed bay left of main open slider
        { w: 2.5, h: wallH - 0.08, x: 4.7, z: 4.1, ry: 0 }, // Mid stacked sliding panel (open doorways at x: 1.0..3.45 & 5.95..8.2!)
      ];
      for (const gb of glassBays) {
        const pane = new THREE.Mesh(new THREE.PlaneGeometry(gb.w, gb.h), glassMat);
        pane.position.set(gb.x, baseY + gb.h / 2 + 0.04, gb.z);
        pane.rotation.y = gb.ry;
        building.add(pane);

        const frameTop = new THREE.Mesh(new THREE.BoxGeometry(gb.w, 0.055, 0.085), joineryMat);
        frameTop.position.set(gb.x, baseY + gb.h + 0.04, gb.z);
        frameTop.rotation.y = gb.ry;
        const frameBot = new THREE.Mesh(new THREE.BoxGeometry(gb.w, 0.042, 0.085), joineryMat);
        frameBot.position.set(gb.x, baseY + 0.021, gb.z);
        frameBot.rotation.y = gb.ry;
        const stileL = new THREE.Mesh(new THREE.BoxGeometry(0.055, gb.h, 0.085), joineryMat);
        stileL.position.set(gb.x - gb.w * 0.5, baseY + gb.h / 2 + 0.04, gb.z);
        const stileR = stileL.clone();
        stileR.position.x = gb.x + gb.w * 0.5;
        building.add(frameTop, frameBot, stileL, stileR);
      }
      // Continuous flush overhead sliding track beam across front colonnade & corner
      const headTrackFront = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.075, 0.14), joineryMat);
      headTrackFront.position.set(2.6, roofY - 0.04, 4.1);
      const headTrackEast = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.075, 4.95), joineryMat);
      headTrackEast.position.set(8.25, roofY - 0.04, 1.68);
      building.add(headTrackFront, headTrackEast);

      // Cantilevered Knife-Edge Standing-Seam Roof + Warm Slatted Cedar/Oak Soffit + Living Skylight Sun-Baffles!
      // Split roof soffit/cap around a glazed architectural skylight baffle slot (x: -2.8 .. 2.4, z: -1.1 .. 0.5)
      // AND a cantilevered cedar brise-soleil pergola eaves along the sunny north-east edge (z: 4.15 .. 6.2)!
      const addRoofSlab = (w, d, x, z) => {
        const sf = new THREE.Mesh(new THREE.BoxGeometry(w, 0.09, d), soffitSlattedMat);
        sf.position.set(x, roofY + 0.045, z);
        sf.castShadow = sf.receiveShadow = true;
        const cap = new THREE.Mesh(new THREE.BoxGeometry(w, 0.17, d), roofSeamMat);
        cap.position.set(x, roofY + 0.175, z);
        cap.castShadow = cap.receiveShadow = true;
        building.add(sf, cap);
      };
      // Back main roof band (behind skylight slot)
      addRoofSlab(20.6, 5.1, 0.6, -3.65);
      // Front main roof band (in front of skylight slot up to colonnade line z = 4.15)
      addRoofSlab(20.6, 3.65, 0.6, 2.325);
      // Left & right fills flanking skylight slot (z: -1.1 .. 0.5)
      addRoofSlab(6.9, 1.6, -6.25, -0.3);
      addRoofSlab(8.5, 1.6, 6.65, -0.3);

      // Perimeter knife-edge dark bronze fascia drip-edge flashing around main roof
      const fasciaN = new THREE.Mesh(new THREE.BoxGeometry(20.72, 0.25, 0.05), joineryMat);
      fasciaN.position.set(0.6, roofY + 0.14, -6.22);
      const fasciaE = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.25, 12.44), joineryMat);
      fasciaE.position.set(10.92, roofY + 0.14, -0.02);
      const fasciaS = new THREE.Mesh(new THREE.BoxGeometry(20.72, 0.25, 0.05), joineryMat);
      fasciaS.position.set(0.6, roofY + 0.14, 6.2);
      building.add(fasciaN, fasciaE, fasciaS);

      // Overhead Western Red Cedar Skylight Sun-Baffles (casts crisp diagonal sun-bars right across honed travertine interior!)
      for (let i = 0; i < 16; i++) {
        const baffle = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.22, 1.62), cedarBattenMat);
        baffle.position.set(-2.65 + i * 0.33, roofY + 0.12, -0.3);
        baffle.castShadow = true;
        building.add(baffle);
      }
      const skylightGlass = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.62).rotateX(-Math.PI / 2), glassMat);
      skylightGlass.position.set(-0.2, roofY + 0.26, -0.3);
      building.add(skylightGlass);

      // Cantilevered Slatted Western Red Cedar Sun-Louvre Pergola along Sunny Courtyard & Terrace Eaves (z: 4.18 .. 6.18)
      for (const ox of [-3.05, 0.0, 2.6, 5.4, 8.25, 10.88]) {
        const outrigger = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.22, 2.04), joineryMat);
        outrigger.position.set(ox, roofY + 0.12, 5.18);
        outrigger.castShadow = true;
        building.add(outrigger);
      }
      for (let i = 0; i < 13; i++) {
        const slat = new THREE.Mesh(new THREE.BoxGeometry(13.9, 0.13, 0.042), cedarBattenMat);
        slat.position.set(3.92, roofY + 0.12, 4.26 + i * 0.155);
        slat.rotation.x = 0.32; // angled to throw rhythmic crisp light bars across travertine & Kwila deck!
        slat.castShadow = true;
        building.add(slat);
      }

      // Sculptural Raised Clerestory Roof + Clerestory Ribbon Glazing over Left Gallery Wing
      const wingSoffit = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.08, 12.2), soffitSlattedMat);
      wingSoffit.position.set(-5.7, roofY + 0.47, 0.5);
      wingSoffit.castShadow = wingSoffit.receiveShadow = true;
      const wingRoof = new THREE.Mesh(new THREE.BoxGeometry(5.72, 0.2, 12.32), roofSeamMat);
      wingRoof.position.set(-5.7, roofY + 0.61, 0.5);
      wingRoof.castShadow = wingRoof.receiveShadow = true;
      const clerestoryGlass = new THREE.Mesh(new THREE.PlaneGeometry(11.6, 0.34), glassMat);
      clerestoryGlass.position.set(-2.95, roofY + 0.34, 0.45);
      clerestoryGlass.rotation.y = Math.PI / 2;
      building.add(wingSoffit, wingRoof, clerestoryGlass);

      // Warm Recessed LED Soffit Downlights + Subtle Additive Light Pools
      const poolTex = buildLightPoolTex(THREE);
      const lensMat = new THREE.MeshStandardMaterial({ color: 0xfff3dc, emissive: 0xffd296, emissiveIntensity: 4.5, ...clipOpts });
      const glowPoolMat = new THREE.MeshBasicMaterial({
        map: poolTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.68,
        side: THREE.DoubleSide,
        fog: false,
      });
      const wallWashMat = glowPoolMat.clone();
      wallWashMat.opacity = 0.22;

      for (let lx = -6.6; lx <= 8.2; lx += 2.2) {
        for (const lz of [3.75, -4.35]) {
          const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.014, 16), lensMat);
          lens.position.set(lx, roofY - 0.005, lz);
          building.add(lens);
          const halo = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 1.45).rotateX(Math.PI / 2), glowPoolMat);
          halo.position.set(lx, roofY - 0.012, lz);
          building.add(halo);
        }
      }
      for (const wz of [-3.2, -0.4, 2.4, 4.8]) {
        const wash = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.2), wallWashMat);
        wash.position.set(-8.03, roofY - 1.15, wz);
        wash.rotation.y = Math.PI / 2;
        building.add(wash);
      }

      // 4. Crafted Architectural Interiors (3 Live-Swappable Spatial Programmes + Streamed Curated .glb Assets)
      const fitGroups = {
        lounge: new THREE.Group(),
        banquet: new THREE.Group(),
        hui: new THREE.Group(),
      };
      const boucleMat = new THREE.MeshStandardMaterial({ color: 0xede6da, bumpMap: texSets.boucleBump, bumpScale: 0.01, roughness: 0.92, ...clipOpts });
      const oakFurnMat = new THREE.MeshStandardMaterial({ color: 0xc29364, map: texSets.cedar.map, roughness: 0.46, ...clipOpts });
      const rugMat = new THREE.MeshStandardMaterial({ color: 0xd8cfc2, bumpMap: texSets.boucleBump, bumpScale: 0.012, roughness: 0.96, ...clipOpts });
      const pendantMat = new THREE.MeshStandardMaterial({ color: 0xfff5e4, emissive: 0xffc680, emissiveIntensity: 2.2, roughness: 0.3, ...clipOpts });

      // Shared Sculptural Honed Veincut Travertine Waterfall Kitchen Island (rear-right bay)
      const island = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.92, 1.12), travertineMat);
      island.position.set(5.2, baseY + 0.46, -2.2);
      island.castShadow = island.receiveShadow = true;
      const islandToe = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.10, 0.88), darkSteelMat);
      islandToe.position.set(5.2, baseY + 0.05, -2.2);
      const sinkRecess = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.03, 0.44), darkSteelMat);
      sinkRecess.position.set(4.35, baseY + 0.915, -2.2);
      building.add(island, islandToe, sinkRecess);

      // Instant architectural placeholders (gracefully upgraded by curated .glb assets milliseconds after load)
      const rugPh = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.02, 3.6), rugMat);
      rugPh.position.set(-1.6, baseY + 0.01, 1.0);
      fitGroups.lounge.add(rugPh);
      const sofaPh = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.44, 0.96), boucleMat);
      sofaPh.position.set(-1.8, baseY + 0.22, 0.2);
      sofaPh.castShadow = sofaPh.receiveShadow = true;
      fitGroups.lounge.add(sofaPh);
      const diningTblPh = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.07, 1.04), oakFurnMat);
      diningTblPh.position.set(4.1, baseY + 0.74, 1.4);
      diningTblPh.castShadow = true;
      fitGroups.lounge.add(diningTblPh);

      // Programme B: Long-Table Hospitality (upgraded with GLB dining tables, chairs & pendants)
      for (const tx of [-1.8, 3.6]) {
        const longTbl = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.08, 1.1), oakFurnMat);
        longTbl.position.set(tx, baseY + 0.75, 1.15);
        longTbl.castShadow = true;
        fitGroups.banquet.add(longTbl);
      }

      // Programme C: Open Wānanga / Gallery Studio (upgraded with GLB woolshed benches & rimu pendants)
      const plinthArt = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.92, 1.35), travertineMat);
      plinthArt.position.set(-2.0, baseY + 0.46, 1.25);
      plinthArt.castShadow = plinthArt.receiveShadow = true;
      fitGroups.hui.add(plinthArt);

      for (const [k, g] of Object.entries(fitGroups)) {
        g.visible = k === state.layout;
        building.add(g);
      }

      // Stream Curated .glb Assets from /plan-studio/library/glb/ with Per-Part PBR Material Assignment
      const glbCache = new Map();
      const loadLibraryGlb = async (id, { scaleToHeight = null, clip = true } = {}) => {
        if (!glbCache.has(id)) {
          glbCache.set(
            id,
            fetch(`/plan-studio/library/glb/${id}.glb`)
              .then((r) => (r.ok ? r.arrayBuffer() : null))
              .then((buf) => (buf ? meshesOf('glb', new Uint8Array(buf)) : null))
              .catch(() => null)
          );
        }
        const parsed = await glbCache.get(id);
        if (!parsed || !parsed.parts?.length || stopped) return null;
        const grp = new THREE.Group();
        const palette = GLB_PALETTES[id] ?? null;
        parsed.parts.forEach((p, idx) => {
          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.BufferAttribute(p.positions, 3));
          geo.setIndex(new THREE.BufferAttribute(p.indices, 1));
          geo.computeVertexNormals();
          const [cr, cg, cb, ca] = p.color;
          const spec = palette ? palette[Math.min(idx, palette.length - 1)] : null;
          const col = spec?.color != null ? new THREE.Color(spec.color) : new THREE.Color(cr, cg, cb);
          const isTrans = spec?.transparent ?? ca < 0.98;
          const mat = new THREE.MeshStandardMaterial({
            color: col,
            roughness: spec?.rough ?? 0.62,
            metalness: spec?.metal ?? 0.04,
            envMapIntensity: (spec?.metal ?? 0) > 0.5 ? 1.4 : 0.9,
            bumpMap: spec?.boucle ? texSets.boucleBump : spec?.wood ? texSets.cedar.bumpMap : spec?.travertine ? texSets.travertine.bumpMap : null,
            bumpScale: spec?.boucle ? 0.009 : spec?.wood ? 0.012 : 0.01,
            emissive: spec?.emissive != null ? new THREE.Color(spec.emissive) : new THREE.Color(0x000000),
            emissiveIntensity: spec?.emissiveIntensity ?? 0,
            transparent: isTrans,
            opacity: spec?.opacity ?? Math.max(0.24, ca),
            depthWrite: !isTrans,
            side: spec?.doubleSide || isTrans ? THREE.DoubleSide : THREE.FrontSide,
            ...(clip ? clipOpts : {}),
          });
          const m = new THREE.Mesh(geo, mat);
          m.castShadow = !isTrans;
          m.receiveShadow = true;
          grp.add(m);
        });
        const bx = new THREE.Box3().setFromObject(grp);
        const sz = bx.getSize(new THREE.Vector3());
        const ctr = bx.getCenter(new THREE.Vector3());
        grp.children.forEach((ch) => ch.position.set(-ctr.x, -bx.min.y, -ctr.z));
        if (scaleToHeight && sz.y > 0.001) grp.scale.setScalar(scaleToHeight / sz.y);
        return grp;
      };

      // Wave 1: Stream interior furniture, kitchen, lighting, curtains & terrace GLBs immediately
      void (async () => {
        const [
          sofa, chair, loungeChair, coffee, rugGlb, lamp, sideboard, speaker,
          dinTbl, dinChair, hoopPendant, linLight,
          espresso, mixer, stool,
          woolshedBench, rimuPendant,
          curtain, outLounge, outPlanter,
        ] = await Promise.all([
          loadLibraryGlb('kowhai-hero-liv-01'),
          loadLibraryGlb('kowhai-hero-liv-02'),
          loadLibraryGlb('curated-lounge-chair'),
          loadLibraryGlb('kowhai-hero-liv-03'),
          loadLibraryGlb('kowhai-hero-liv-04'),
          loadLibraryGlb('kowhai-hero-liv-05'),
          loadLibraryGlb('objects-sideboard'),
          loadLibraryGlb('curated-speaker-ash'),
          loadLibraryGlb('kowhai-hero-din-01'),
          loadLibraryGlb('kowhai-hero-din-02'),
          loadLibraryGlb('kowhai-hero-din-03'),
          loadLibraryGlb('kowhai-hero-din-04'),
          loadLibraryGlb('kowhai-hero-kit-05'),
          loadLibraryGlb('kowhai-hero-kit-08'),
          loadLibraryGlb('kowhai-hero-kit-09'),
          loadLibraryGlb('objects-woolshedbench'),
          loadLibraryGlb('objects-pendant'),
          loadLibraryGlb('curated-sheer-curtain'),
          loadLibraryGlb('kowhai-hero-out-01'),
          loadLibraryGlb('kowhai-hero-out-02'),
        ]);
        if (stopped) return;

        // Kitchen Island Appliances & Counter Stools (shared across layouts)
        if (mixer) {
          mixer.position.set(4.35, baseY + 0.92, -2.42);
          building.add(mixer);
        }
        if (espresso) {
          espresso.position.set(6.25, baseY + 0.92, -2.35);
          espresso.rotation.y = -0.25;
          building.add(espresso);
        }
        if (stool) {
          for (let s = 0; s < 3; s++) {
            const st = stool.clone(true);
            st.position.set(4.1 + s * 0.95, baseY, -1.35);
            building.add(st);
          }
        }
        if (linLight) {
          const kitLin = linLight.clone(true);
          kitLin.position.set(5.2, baseY + 2.28, -2.2);
          building.add(kitLin);
        }
        if (sideboard) {
          sideboard.position.set(2.45, baseY, -2.85);
          sideboard.rotation.y = -Math.PI * 0.5;
          building.add(sideboard);
          if (speaker) {
            const sp1 = speaker.clone(true);
            sp1.position.set(2.45, baseY + 0.785, -3.45);
            sp1.rotation.y = -Math.PI * 0.5;
            const sp2 = speaker.clone(true);
            sp2.position.set(2.45, baseY + 0.785, -2.25);
            sp2.rotation.y = -Math.PI * 0.5;
            building.add(sp1, sp2);
          }
        }

        // Programme A: Coastal Living & Kitchen
        if (sofa && chair && coffee) {
          while (fitGroups.lounge.children.length) fitGroups.lounge.remove(fitGroups.lounge.children[0]);
          if (rugGlb) {
            rugGlb.position.set(-1.6, baseY + 0.005, 1.1);
            rugGlb.scale.set(1.55, 1, 1.55);
            fitGroups.lounge.add(rugGlb);
          }
          sofa.position.set(-1.85, baseY, 0.22);
          fitGroups.lounge.add(sofa);
          const ch1 = chair.clone(true);
          ch1.position.set(-3.45, baseY, 1.5);
          ch1.rotation.y = Math.PI * 0.42;
          const ch2 = (loungeChair ?? chair).clone(true);
          ch2.position.set(-0.08, baseY, 1.65);
          ch2.rotation.y = -Math.PI * 0.62;
          fitGroups.lounge.add(ch1, ch2);
          coffee.position.set(-1.75, baseY, 1.5);
          fitGroups.lounge.add(coffee);
          if (lamp) {
            lamp.position.set(-3.55, baseY, -0.18);
            lamp.rotation.y = 0.55;
            fitGroups.lounge.add(lamp);
          }
          if (dinTbl) {
            dinTbl.position.set(4.2, baseY, 1.45);
            fitGroups.lounge.add(dinTbl);
            if (dinChair) {
              for (let c = 0; c < 3; c++) {
                for (const side of [-1, 1]) {
                  const dc = dinChair.clone(true);
                  dc.position.set(3.4 + c * 0.78, baseY, 1.45 + side * 0.76);
                  dc.rotation.y = side === 1 ? Math.PI : 0;
                  fitGroups.lounge.add(dc);
                }
              }
            }
          }
          if (linLight) {
            const dinLin = linLight.clone(true);
            dinLin.position.set(4.2, baseY + 2.32, 1.45);
            fitGroups.lounge.add(dinLin);
          }
        }

        // Programme B: Long-Table Hospitality
        if (dinTbl && dinChair) {
          while (fitGroups.banquet.children.length) fitGroups.banquet.remove(fitGroups.banquet.children[0]);
          for (const tx of [-1.7, 3.8]) {
            const dt = dinTbl.clone(true);
            dt.position.set(tx, baseY, 1.15);
            dt.scale.set(1.3, 1, 1.05);
            fitGroups.banquet.add(dt);
            for (let c = 0; c < 4; c++) {
              for (const side of [-1, 1]) {
                const dc = dinChair.clone(true);
                dc.position.set(tx - 1.15 + c * 0.76, baseY, 1.15 + side * 0.78);
                dc.rotation.y = side === 1 ? Math.PI : 0;
                fitGroups.banquet.add(dc);
              }
            }
            if (hoopPendant) {
              const hp = hoopPendant.clone(true);
              hp.position.set(tx, baseY + 2.1, 1.15);
              fitGroups.banquet.add(hp);
            }
          }
        }

        // Programme C: Open Wānanga / Gallery Studio
        if (woolshedBench) {
          for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 2; c++) {
              const wb = woolshedBench.clone(true);
              wb.position.set(2.2 + c * 2.5, baseY, 0.2 + r * 1.15);
              fitGroups.hui.add(wb);
            }
          }
          if (rimuPendant) {
            for (const rx of [-2.0, 2.2, 4.7]) {
              const rp = rimuPendant.clone(true);
              rp.position.set(rx, baseY + 2.15, 1.25);
              fitGroups.hui.add(rp);
            }
          }
        }

        // Soft S-fold sheer curtains framing the sliding glass bays
        if (curtain) {
          const cLeft = curtain.clone(true);
          cLeft.position.set(-2.55, baseY, 3.92);
          cLeft.scale.set(0.82, (wallH - 0.14) / 2.39, 1);
          const cMid = curtain.clone(true);
          cMid.position.set(4.75, baseY, 3.92);
          cMid.scale.set(0.76, (wallH - 0.14) / 2.39, 1);
          building.add(cLeft, cMid);
        }

        // Slatted outdoor sofa & concrete planter trio on the Kwila terrace deck
        if (outLounge) {
          outLounge.position.set(6.95, baseY, 6.25);
          outLounge.rotation.y = -Math.PI * 0.35;
          building.add(outLounge);
        }
        if (outPlanter) {
          outPlanter.position.set(4.25, baseY, 7.6);
          building.add(outPlanter);
        }

        // Wave 2: Stream curated foreground botanical accents & native Tūī
        const [nikauGlb, pongaGlb, tuiGlb] = await Promise.all([
          loadLibraryGlb('kowhai-hero-nat-01', { scaleToHeight: 4.6, clip: false }),
          loadLibraryGlb('kowhai-hero-nat-03', { scaleToHeight: 2.25, clip: false }),
          loadLibraryGlb('manu-tui', { scaleToHeight: 0.24, clip: false }),
        ]);
        if (stopped) return;
        if (nikauGlb) {
          nikauGlb.position.set(-9.7, terrainHeight(-9.7, 6.8) - 0.08, 6.8);
          scene.add(nikauGlb);
        }
        if (pongaGlb) {
          pongaGlb.position.set(-9.6, terrainHeight(-9.6, 9.2) - 0.04, 9.2);
          scene.add(pongaGlb);
        }
        if (tuiGlb) {
          tuiGlb.position.set(-9.15, terrainHeight(-9.6, 9.2) + 2.02, 9.15);
          tuiGlb.rotation.y = 0.85;
          scene.add(tuiGlb);
        }
      })();

      // 5. True Volumetric 3D Aotearoa Coastal Headland Flora (BotanicalMeshBuilder + GPU Coastal Wind + Backlit SSS)
      const windUniforms = {
        uWindTime: { value: 0 },
        uSunDir: { value: new THREE.Vector3(0.5, 0.4, 0.5) },
        uSunColor: { value: new THREE.Color(0xffcf99) },
        uSunSss: { value: 0.68 },
      };

      const floraMat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.64,
        metalness: 0.0,
        side: THREE.DoubleSide,
        envMapIntensity: 0.72,
      });
      floraMat.onBeforeCompile = (sh) => {
        sh.uniforms.uWindTime = windUniforms.uWindTime;
        sh.uniforms.uSunDir = windUniforms.uSunDir;
        sh.uniforms.uSunColor = windUniforms.uSunColor;
        sh.uniforms.uSunSss = windUniforms.uSunSss;
        sh.vertexShader =
          `attribute float aTipness;\nattribute float aPartType;\nuniform float uWindTime;\nvarying float vTipness;\nvarying float vPartType;\nvarying vec3 vBotWorldPos;\n` +
          sh.vertexShader
            .replace(
              '#include <begin_vertex>',
              `#include <begin_vertex>
               vTipness = aTipness;
               vPartType = aPartType;
               vec3 instOrig = vec3(0.0);
               #ifdef USE_INSTANCING
                 instOrig = instanceMatrix[3].xyz;
               #endif
               vec3 wSeed = (modelMatrix * vec4(instOrig, 1.0)).xyz;
               if (aTipness > 0.01) {
                 float ph = wSeed.x * 0.43 + wSeed.z * 0.37 + position.x * 1.05 + position.z * 0.85;
                 float gust = 0.65 + 0.35 * sin(uWindTime * 0.46 + wSeed.x * 0.11 - wSeed.z * 0.09);
                 float w1 = sin(uWindTime * 1.68 + ph) * 0.075;
                 float w2 = cos(uWindTime * 2.95 + ph * 1.65) * 0.028;
                 float flex = pow(clamp(aTipness, 0.0, 1.0), 1.45) * gust;
                 transformed.x += (w1 + w2) * flex;
                 transformed.z += (w1 * 0.72 - w2 * 0.82) * flex;
                 transformed.y -= abs(w1) * 0.16 * flex;
               }`
            )
            .replace(
              '#include <project_vertex>',
              `#include <project_vertex>
               #ifdef USE_INSTANCING
                 vBotWorldPos = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
               #else
                 vBotWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
               #endif`
            );
        sh.fragmentShader =
          `uniform vec3 uSunDir;\nuniform vec3 uSunColor;\nuniform float uSunSss;\nvarying float vTipness;\nvarying float vPartType;\nvarying vec3 vBotWorldPos;\n` +
          sh.fragmentShader.replace(
            '#include <dithering_fragment>',
            `if (vPartType > 0.5) {
               vec3 toSun = normalize(uSunDir);
               vec3 viewD = normalize(cameraPosition - vBotWorldPos);
               float backLit = pow(clamp(dot(-viewD, toSun), 0.0, 1.0), 2.8);
               float sss = backLit * (0.20 + 0.46 * vTipness) * uSunSss;
               gl_FragColor.rgb += gl_FragColor.rgb * uSunColor * sss;
             }
             #include <dithering_fragment>`
          );
      };

      const botanicalGeos = {};
      for (const [k, sp] of Object.entries(COASTAL_SPECIES)) {
        botanicalGeos[k] = buildCoastalSpeciesGeometry(THREE, sp);
      }

      // Curated Piet-Oudolf-inspired coastal headland & architectural courtyard planting composition
      const PLANT_PLACEMENTS = {
        pohutukawa: [
          [-13.4, 9.8, 1.12, 0.4], // Overhanging reflecting pool west edge (crimson reflections!)
          [14.8, -6.5, 1.14, 2.1],
          [-15.6, -7.8, 1.08, 4.2],
          [16.2, 10.6, 0.96, 1.3],
          [-22.5, -13.5, 1.28, 3.1],
          [23.5, -14.0, 1.22, 0.8],
        ],
        tikouka: [
          [12.1, 8.6, 1.06, 0.6],
          [-12.2, -5.8, 0.96, 2.2],
          [13.4, -1.8, 0.92, 4.1],
          [-16.4, 3.8, 1.08, 1.4],
          [18.8, 4.5, 1.02, 3.5],
        ],
        nikau: [
          [-10.6, 3.4, 0.98, 0.9],
          [11.4, -4.6, 0.94, 2.8],
          [-11.8, -1.2, 1.04, 4.4],
          [12.2, 2.4, 0.88, 1.7],
        ],
        ponga: [
          [-10.4, 5.2, 0.92, 0.5],
          [-10.8, 1.2, 0.98, 2.1],
          [11.6, -2.4, 0.88, 3.9],
          [-12.6, 7.6, 0.95, 1.3],
        ],
        harakeke: [
          [-10.2, 10.2, 0.94, 0.4], [-11.8, 11.4, 0.88, 1.8], [11.2, 4.6, 0.92, 2.6],
          [11.8, 7.8, 0.86, 4.1], [10.8, 10.4, 0.88, 0.9], [-13.5, 5.4, 1.02, 3.3],
          [13.6, 1.2, 0.96, 5.0], [-14.2, -2.5, 1.05, 1.2], [6.2, -9.2, 1.08, 2.4],
          [-5.4, -9.6, 1.02, 3.8],
        ],
        platts_black: [
          [-9.4, 6.4, 0.95, 0.3], [-9.6, 7.8, 0.88, 1.7], [10.6, 5.4, 0.92, 2.9],
          [10.8, 7.2, 0.86, 4.2], [-6.6, 11.3, 0.88, 0.8], [-4.8, 11.4, 0.84, 2.2],
          [1.2, 11.3, 0.86, 3.5], [10.4, 8.8, 0.82, 5.1],
        ],
        silver_spear: [
          [-9.2, 8.8, 0.92, 0.6], [-8.8, 10.6, 0.88, 2.1], [-5.8, 11.3, 0.94, 3.8],
          [-1.4, 11.4, 0.92, 1.4], [0.4, 11.3, 0.86, 4.7], [10.6, 6.4, 0.92, 2.5],
          [10.5, 9.6, 0.88, 0.2], [9.8, 11.2, 0.82, 3.1],
        ],
        carex_testacea: [
          [-7.2, 11.1, 0.96, 0.4], [-6.1, 11.5, 0.92, 1.9], [-3.8, 11.2, 0.98, 3.2],
          [-2.6, 11.4, 0.94, 4.5], [-0.4, 11.2, 0.95, 1.1], [1.6, 11.5, 0.92, 2.7],
          [-9.2, 5.4, 0.96, 0.8], [-9.3, 7.1, 0.92, 2.3], [10.4, 4.6, 0.94, 3.9],
          [10.5, 8.1, 0.92, 5.2], [9.6, 10.2, 0.96, 1.6], [4.3, 10.8, 0.88, 3.0],
          [4.2, 9.6, 0.86, 4.4], [-10.8, 9.8, 1.0, 2.0],
        ],
        toetoe: [
          [-12.4, 12.6, 1.06, 0.5], [-14.2, 11.8, 1.12, 2.1], [-9.8, 13.4, 0.98, 3.7],
          [12.6, 11.4, 1.04, 1.2], [14.4, 9.2, 1.1, 2.8], [13.8, 6.4, 1.02, 4.4],
          [-15.5, 7.2, 1.15, 0.9], [16.5, 2.2, 1.08, 3.3], [-16.8, -1.8, 1.14, 5.1],
          [11.2, -8.8, 1.06, 1.9], [-8.5, -10.4, 1.12, 4.0], [1.8, -10.8, 1.04, 2.6],
          [-18.5, 13.8, 1.18, 0.3], [18.2, 13.5, 1.12, 3.9],
        ],
        libertia: [
          [-4.2, 11.5, 0.92, 0.7], [-3.1, 11.1, 0.88, 2.4], [-1.9, 11.5, 0.94, 4.1],
          [10.8, 6.0, 0.92, 1.5], [10.9, 7.6, 0.86, 3.2], [-9.8, 8.2, 0.90, 5.0],
        ],
        tororaro: [
          [-11.2, 11.0, 0.94, 0.6], [12.4, 4.2, 0.92, 2.2], [-13.2, 2.2, 1.02, 3.8],
          [12.8, 9.8, 0.96, 1.4], [-11.8, -4.2, 0.98, 4.9],
        ],
      };

      const dummy = new THREE.Object3D();
      const instancedFlora = [];
      for (const [spKey, list] of Object.entries(PLANT_PLACEMENTS)) {
        const geo = botanicalGeos[spKey];
        if (!geo || !list.length) continue;
        const im = new THREE.InstancedMesh(geo, floraMat, list.length);
        im.castShadow = true;
        im.receiveShadow = true;
        list.forEach(([px, pz, sc, ry], idx) => {
          const py = terrainHeight(px, pz) - 0.05;
          dummy.position.set(px, py, pz);
          dummy.rotation.set(0, ry, 0);
          dummy.scale.setScalar(sc);
          dummy.updateMatrix();
          im.setMatrixAt(idx, dummy.matrix);
        });
        im.instanceMatrix.needsUpdate = true;
        scene.add(im);
        instancedFlora.push(im);
      }

      // Camera, Orbit & True 1.68 m First-Person Walk Controller
      const camCur = { eye: new THREE.Vector3(...SHOTS[0].eye), look: new THREE.Vector3(...SHOTS[0].look) };
      const camGoal = { eye: new THREE.Vector3(...SHOTS[0].eye), look: new THREE.Vector3(...SHOTS[0].look) };
      const walkState = {
        x: 6.4,
        z: 7.4,
        y: floorElevation(6.4, 7.4) + WALK_EYE_HEIGHT,
        yaw: -0.78, // facing northwest across Kwila deck into open pavilion & hearth
        pitch: -0.04,
        bobPhase: 0,
        bobBlend: 0,
      };
      camera.position.copy(camCur.eye);
      camera.lookAt(camCur.look);

      const syncWalkLookGoal = () => {
        const cy = Math.cos(walkState.pitch);
        const dirX = Math.sin(walkState.yaw) * cy;
        const dirY = Math.sin(walkState.pitch);
        const dirZ = -Math.cos(walkState.yaw) * cy;
        camGoal.eye.set(walkState.x, walkState.y, walkState.z);
        camGoal.look.set(walkState.x + dirX * 4.0, walkState.y + dirY * 4.0, walkState.z + dirZ * 4.0);
      };

      const applySunHour = (hour) => {
        state.sunHour = hour;
        const u = (hour - 6) / 14.5;
        const az = (0.5 - u) * Math.PI * 1.12;
        const elev = Math.sin(Math.max(0, Math.min(1, u)) * Math.PI) * 58 - (hour > 19.1 ? (hour - 19.1) * 9 : 0);
        const elRad = (elev * Math.PI) / 180;
        sun.position.set(Math.sin(az) * Math.cos(elRad) * 72, Math.max(1.8, Math.sin(elRad) * 72), Math.cos(az) * Math.cos(elRad) * 52 + 12);

        const isDusk = hour >= 18.6 || hour <= 7.1;
        const isDay = hour >= 9.5 && hour <= 15.8;
        const moodKey = isDusk ? 'dusk' : isDay ? 'day' : 'golden';
        scene.background = skies[moodKey];
        scene.environment = envs[moodKey];

        if (isDusk) {
          sun.color.setHex(0xff9a64);
          sun.intensity = Math.max(0.4, 1.45 - Math.max(0, hour - 18.6) * 0.65);
          hemi.intensity = 0.36;
          scene.fog.color.setHex(0x3a3242);
          renderer.toneMappingExposure = 1.12;
          windUniforms.uSunSss.value = 0.42;
        } else if (isDay) {
          sun.color.setHex(0xfff4e0);
          sun.intensity = 4.25;
          hemi.intensity = 0.72;
          scene.fog.color.setHex(0xd6e5f0);
          renderer.toneMappingExposure = 0.95;
          windUniforms.uSunSss.value = 0.52;
        } else {
          sun.color.setHex(0xffcf99);
          sun.intensity = 3.65;
          hemi.intensity = 0.60;
          scene.fog.color.setHex(0xe0cebe);
          renderer.toneMappingExposure = 1.02;
          windUniforms.uSunSss.value = 0.78;
        }

        waterUniforms.uSunDir.value.copy(sun.position).normalize();
        waterUniforms.uSunColor.value.copy(sun.color);
        windUniforms.uSunDir.value.copy(sun.position).normalize();
        windUniforms.uSunColor.value.copy(sun.color);

        const roomFactor = isDusk ? 1.48 : isDay ? 0.25 : 0.82;
        for (const pl of interiorLights) pl.intensity = pl.userData.baseInt * roomFactor;
        glowPoolMat.opacity = isDusk ? 0.92 : isDay ? 0.2 : 0.68;
        wallWashMat.opacity = isDusk ? 0.36 : isDay ? 0.06 : 0.22;
      };
      applySunHour(state.sunHour);

      // Pointer Drag (Orbit in Orbit mode, Mouselook in Walk mode) + Zoom + Keyboard
      let dragging = false, px0 = 0, py0 = 0;
      const keysDown = new Set();

      canvas.addEventListener('pointerdown', (e) => {
        dragging = true;
        px0 = e.clientX;
        py0 = e.clientY;
        canvas.setPointerCapture(e.pointerId);
      });
      canvas.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const dx = (e.clientX - px0) * 0.0046;
        const dy = (e.clientY - py0) * 0.0038;
        px0 = e.clientX;
        py0 = e.clientY;
        if (state.walking) {
          walkState.yaw -= dx * 1.15;
          walkState.pitch = Math.max(-0.82, Math.min(0.82, walkState.pitch - dy * 1.05));
          syncWalkLookGoal();
        } else {
          const off = camGoal.eye.clone().sub(camGoal.look);
          const sph = new THREE.Spherical().setFromVector3(off);
          sph.theta -= dx;
          sph.phi = Math.max(0.14, Math.min(Math.PI * 0.48, sph.phi - dy));
          camGoal.eye.copy(camGoal.look).add(new THREE.Vector3().setFromSpherical(sph));
        }
      });
      const endDrag = () => { dragging = false; };
      canvas.addEventListener('pointerup', endDrag);
      canvas.addEventListener('pointercancel', endDrag);

      canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (state.walking) {
          // Gentle forward/back step on trackpad scroll while walking
          const dir = -Math.sign(e.deltaY) * 0.55;
          const nx = walkState.x + Math.sin(walkState.yaw) * dir;
          const nz = walkState.z - Math.cos(walkState.yaw) * dir;
          [walkState.x, walkState.z] = resolveWalkCollision(nx, nz);
          syncWalkLookGoal();
          return;
        }
        const off = camGoal.eye.clone().sub(camGoal.look);
        const len = Math.max(3.2, Math.min(72, off.length() * (1 + Math.sign(e.deltaY) * 0.08)));
        camGoal.eye.copy(camGoal.look).add(off.setLength(len));
      }, { passive: false });

      const onKeyDown = (e) => {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName ?? '')) return;
        const k = e.key.toLowerCase();
        if (k === 'escape' && state.walking) {
          sceneApi?.setWalk(false);
          return;
        }
        if (['w', 'a', 's', 'd', 'shift', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
          keysDown.add(k);
        }
      };
      const onKeyUp = (e) => keysDown.delete(e.key.toLowerCase());
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);

      onResize = () => {
        if (!canvas.parentElement) return;
        const w = Math.max(1, canvas.parentElement.clientWidth);
        const h = Math.max(1, canvas.parentElement.clientHeight);
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
        const sec = now * 0.001;

        if (state.walking) {
          let fwdIn = 0, rightIn = 0;
          if (keysDown.has('w') || keysDown.has('arrowup')) fwdIn += 1;
          if (keysDown.has('s') || keysDown.has('arrowdown')) fwdIn -= 1;
          if (keysDown.has('d') || keysDown.has('arrowright')) rightIn += 1;
          if (keysDown.has('a') || keysDown.has('arrowleft')) rightIn -= 1;
          const moving = fwdIn !== 0 || rightIn !== 0;
          if (moving) {
            const len = Math.hypot(fwdIn, rightIn);
            fwdIn /= len;
            rightIn /= len;
            const speed = keysDown.has('shift') ? 4.8 : 2.95;
            const sinY = Math.sin(walkState.yaw), cosY = Math.cos(walkState.yaw);
            const dx = (sinY * fwdIn + cosY * rightIn) * speed * dt;
            const dz = (-cosY * fwdIn + sinY * rightIn) * speed * dt;
            [walkState.x, walkState.z] = resolveWalkCollision(walkState.x + dx, walkState.z + dz);
            if (!reduceMotion) walkState.bobPhase += dt * (keysDown.has('shift') ? 10.5 : 7.8);
          }
          const targetEyeY = floorElevation(walkState.x, walkState.z) + WALK_EYE_HEIGHT;
          const elevK = reduceMotion ? 1 : 1 - Math.exp(-dt * 10);
          walkState.y += (targetEyeY - walkState.y) * elevK;
          walkState.bobBlend += ((moving && !reduceMotion ? 1 : 0) - walkState.bobBlend) * (1 - Math.exp(-dt * 9));
          syncWalkLookGoal();

          const bobY = Math.sin(walkState.bobPhase) * 0.022 * walkState.bobBlend;
          const bobSide = Math.cos(walkState.bobPhase * 0.5) * 0.01 * walkState.bobBlend;
          const k = reduceMotion ? 1 : 1 - Math.exp(-dt * 12);
          camCur.eye.lerp(camGoal.eye, k);
          camCur.look.lerp(camGoal.look, k);
          camera.position.set(
            camCur.eye.x + Math.cos(walkState.yaw) * bobSide,
            camCur.eye.y + bobY,
            camCur.eye.z + Math.sin(walkState.yaw) * bobSide
          );
          camera.lookAt(camCur.look.x, camCur.look.y + bobY * 0.65, camCur.look.z);
        } else {
          if (keysDown.size) {
            const fwd = camGoal.look.clone().sub(camGoal.eye).setY(0).normalize();
            const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
            const step = 8.5 * dt;
            if (keysDown.has('w') || keysDown.has('arrowup')) { camGoal.eye.addScaledVector(fwd, step); camGoal.look.addScaledVector(fwd, step); }
            if (keysDown.has('s') || keysDown.has('arrowdown')) { camGoal.eye.addScaledVector(fwd, -step); camGoal.look.addScaledVector(fwd, -step); }
            if (keysDown.has('d') || keysDown.has('arrowright')) { camGoal.eye.addScaledVector(right, step); camGoal.look.addScaledVector(right, step); }
            if (keysDown.has('a') || keysDown.has('arrowleft')) { camGoal.eye.addScaledVector(right, -step); camGoal.look.addScaledVector(right, -step); }
          }
          const k = reduceMotion ? 1 : 1 - Math.exp(-dt * 4.8);
          camCur.eye.lerp(camGoal.eye, k);
          camCur.look.lerp(camGoal.look, k);
          camera.position.copy(camCur.eye);
          camera.lookAt(camCur.look);
        }

        if (!reduceMotion) {
          waterUniforms.uTime.value = sec;
          windUniforms.uWindTime.value = sec;
          fireUniforms.uTime.value = sec;
          fireLight.intensity = 7.8 + Math.sin(sec * 7.3) * 1.1 + Math.sin(sec * 13.7) * 0.65;
          lidarUniforms.uScan.value = 12 + ((sec * 8.5) % 68);
        }
        lidarUniforms.uLidar.value += ((state.lidar ? 1 : 0) - lidarUniforms.uLidar.value) * 0.12;
        renderer.render(scene, camera);
      };
      raf = requestAnimationFrame(tick);

      sceneApi = {
        setWalk(on) {
          const next = !!on;
          state.walking = next;
          root.classList.toggle('is-walking', next);
          root.querySelector('[data-walk-btn]')?.setAttribute('aria-pressed', String(next));
          if (next) {
            // Start from current eye if already close to pavilion, otherwise start at Kwila arrival terrace looking in
            const curDist = Math.hypot(camCur.eye.x, camCur.eye.z);
            if (curDist < 13.5 && camCur.eye.y < 4.2) {
              [walkState.x, walkState.z] = resolveWalkCollision(camCur.eye.x, camCur.eye.z);
              const dir = camCur.look.clone().sub(camCur.eye).normalize();
              walkState.yaw = Math.atan2(dir.x, -dir.z);
              walkState.pitch = Math.max(-0.5, Math.min(0.5, Math.asin(Math.max(-0.9, Math.min(0.9, dir.y)))));
            } else {
              walkState.x = 6.35;
              walkState.z = 7.35;
              walkState.yaw = -0.82;
              walkState.pitch = -0.04;
            }
            walkState.y = floorElevation(walkState.x, walkState.z) + WALK_EYE_HEIGHT;
            syncWalkLookGoal();
            root.querySelectorAll('[data-shot]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
          } else {
            // Smoothly return orbit pivot ~4.5 m in front of eye
            const s = SHOTS.find((x) => x.id === state.shot) ?? SHOTS[0];
            root.querySelectorAll('[data-shot]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.shot === s.id)));
          }
        },
        goShot(id) {
          const s = SHOTS.find((x) => x.id === id) ?? SHOTS[0];
          state.shot = s.id;
          if (state.walking) sceneApi.setWalk(false);
          camGoal.eye.set(...s.eye);
          camGoal.look.set(...s.look);
          root.querySelectorAll('[data-shot]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.shot === s.id)));
        },
        setCladding(key) {
          const c = STAGE_SPECS.cladding[key];
          if (!c) return;
          state.cladding = key;
          const ts = texSets[c.tex] ?? texSets.cedar;
          claddingMat.color.setHex(c.hex);
          claddingMat.map = ts.map;
          claddingMat.roughnessMap = ts.roughnessMap ?? null;
          claddingMat.bumpMap = ts.bumpMap ?? null;
          claddingMat.roughness = c.rough;
          claddingMat.metalness = c.metal;
          claddingMat.needsUpdate = true;
          root.querySelectorAll('[data-cladding]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cladding === key)));
          syncHud();
        },
        setJoinery(key) {
          const j = STAGE_SPECS.joinery[key];
          if (!j) return;
          state.joinery = key;
          joineryMat.color.setHex(j.hex);
          joineryMat.roughness = j.rough;
          joineryMat.metalness = j.metal;
          joineryMat.needsUpdate = true;
          root.querySelectorAll('[data-joinery]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.joinery === key)));
          syncHud();
        },
        setLayout(key) {
          if (!STAGE_SPECS.layout[key]) return;
          state.layout = key;
          for (const [k, g] of Object.entries(fitGroups)) g.visible = k === key;
          root.querySelectorAll('[data-layout]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.layout === key)));
          syncHud();
        },
        setSun(hour) {
          applySunHour(hour);
        },
        setSection(pct) {
          state.sectionPct = pct;
          sectionPlane.constant = pct <= 0 ? 20 : 4.6 - (pct / 100) * 3.25;
        },
        setLidar(on) {
          state.lidar = on;
          parcelGroup.visible = on;
        },
        dispose() {
          cancelAnimationFrame(raf);
          window.removeEventListener('resize', onResize);
          window.removeEventListener('keydown', onKeyDown);
          window.removeEventListener('keyup', onKeyUp);
          for (const k of ['day', 'golden', 'dusk']) {
            skies[k].dispose();
            envs[k].dispose();
          }
          for (const g of Object.values(botanicalGeos)) g.dispose();
          for (const im of instancedFlora) im.dispose?.();
          mirrorRT.dispose();
          pmrem.dispose();
          renderer.dispose();
        },
      };
    } catch {
      /* graceful static fallback */
    }
  }

  // Wire tactile controls
  root.addEventListener('click', (e) => {
    const shotBtn = e.target.closest('[data-shot]');
    if (shotBtn) { sceneApi?.goShot(shotBtn.dataset.shot); return; }

    const walkBtn = e.target.closest('[data-walk-btn]');
    if (walkBtn) { sceneApi?.setWalk(!state.walking); return; }

    const cladBtn = e.target.closest('[data-cladding]');
    if (cladBtn) { sceneApi?.setCladding(cladBtn.dataset.cladding); return; }

    const joinBtn = e.target.closest('[data-joinery]');
    if (joinBtn) { sceneApi?.setJoinery(joinBtn.dataset.joinery); return; }

    const layBtn = e.target.closest('[data-layout]');
    if (layBtn) { sceneApi?.setLayout(layBtn.dataset.layout); sceneApi?.goShot('interior'); return; }

    const lidarBtn = e.target.closest('[data-lidar-btn]');
    if (lidarBtn) {
      state.lidar = !state.lidar;
      lidarBtn.setAttribute('aria-pressed', String(state.lidar));
      sceneApi?.setLidar(state.lidar);
    }
  });

  sunSlider?.addEventListener('input', () => {
    const v = Number(sunSlider.value);
    syncRangeSlider(sunSlider, (n) => `Sun ${fmtHour(n)}`);
    const lbl = root.querySelector('[data-sun-lbl]');
    if (lbl) lbl.textContent = fmtHour(v);
    sceneApi?.setSun(v);
  });

  secSlider?.addEventListener('input', () => {
    const v = Number(secSlider.value);
    syncRangeSlider(secSlider, (n) => (n === 0 ? 'Uncut' : `${n}% section cut`));
    sceneApi?.setSection(v);
    if (v > 18 && (state.shot !== 'aerial' || state.walking)) sceneApi?.goShot('aerial');
  });

  const cleanup = () => {
    stopped = true;
    sceneApi?.dispose();
    if (activeStop === cleanup) activeStop = null;
  };
  activeStop = cleanup;
  return cleanup;
}

const STUDIO_ICON = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.5 3 7.2v9.6l9 4.7 9-4.7V7.2L12 2.5Z"/><path d="M3 7.2 12 12l9-4.8M12 12v9.5"/></svg>';
registerNav({ id: 'studio', label: '3D Studio', hash: '#/studio', order: 1, icon: STUDIO_ICON });
registerRoute('studio', {
  title: '3D Studio',
  render(el, ctx) {
    return mountImmersiveStage(el, ctx, { fullPage: true });
  },
});
