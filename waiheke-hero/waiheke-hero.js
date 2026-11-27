import * as THREE from '/assets/vendor/three/three.module.min.js';
import { OrbitControls } from '/assets/vendor/three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from '/assets/vendor/three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from '/assets/vendor/three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '/assets/vendor/three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from '/assets/vendor/three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from '/assets/vendor/three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '/assets/vendor/three/addons/postprocessing/OutputPass.js';

function makeRng(seed = 1337) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ── ADAPTIVE PIXEL BUDGET (3840×2160 desktop 4K / 1.8M px touch) ─────────────
function computeAdaptiveDPR(w, h) {
  const isTouch = matchMedia('(pointer: coarse)').matches;
  const maxPixels = isTouch ? 1800000 : 3840 * 2160;
  const maxDpr = Math.min(window.devicePixelRatio || 1, isTouch ? 1.75 : 2.0);
  const targetDpr = Math.sqrt(maxPixels / Math.max(1, w * h));
  return Math.max(1.0, Math.min(maxDpr, targetDpr));
}

// ── PROCEDURAL 256×128 Float32Array HDR IBL ──────────────────────────────────
function buildProceduralHDRIBL(renderer, mood = 'twilight') {
  const W = 256, H = 128;
  const data = new Float32Array(W * H * 4);
  const palettes = {
    twilight: {
      zenith: [0.14, 0.09, 0.17], horizon: [1.38, 0.78, 0.60], ground: [0.12, 0.08, 0.07],
      keyCol: [3.1, 1.65, 0.98], keyDir: new THREE.Vector3(0.32, 0.16, -0.93).normalize(),
      apertureCol: [2.4, 1.42, 0.68]
    },
    golden: {
      zenith: [0.32, 0.52, 0.84], horizon: [1.92, 1.22, 0.74], ground: [0.22, 0.16, 0.12],
      keyCol: [4.6, 2.95, 1.62], keyDir: new THREE.Vector3(0.56, 0.32, 0.76).normalize(),
      apertureCol: [1.35, 0.90, 0.46]
    },
    day: {
      zenith: [0.44, 0.78, 1.28], horizon: [1.58, 1.66, 1.74], ground: [0.30, 0.27, 0.22],
      keyCol: [5.0, 4.7, 4.2], keyDir: new THREE.Vector3(0.45, 0.72, 0.53).normalize(),
      apertureCol: [0.90, 0.84, 0.74]
    }
  };
  const p = palettes[mood] || palettes.twilight;
  const dir = new THREE.Vector3();

  for (let y = 0; y < H; y++) {
    const v = 1.0 - (y + 0.5) / H;
    const phi = (1.0 - v) * Math.PI;
    const sinP = Math.sin(phi), cosP = Math.cos(phi);
    for (let x = 0; x < W; x++) {
      const u = (x + 0.5) / W;
      const theta = u * Math.PI * 2;
      dir.set(sinP * Math.cos(theta), cosP, sinP * Math.sin(theta));
      let r, g, b;
      if (dir.y >= 0) {
        const t = Math.pow(dir.y, 0.52);
        r = p.horizon[0] * (1 - t) + p.zenith[0] * t;
        g = p.horizon[1] * (1 - t) + p.zenith[1] * t;
        b = p.horizon[2] * (1 - t) + p.zenith[2] * t;
      } else {
        const t = Math.min(1, -dir.y * 2.2);
        r = p.horizon[0] * 0.42 * (1 - t) + p.ground[0] * t;
        g = p.horizon[1] * 0.42 * (1 - t) + p.ground[1] * t;
        b = p.horizon[2] * 0.42 * (1 - t) + p.ground[2] * t;
      }
      const sunDot = Math.max(0, dir.dot(p.keyDir));
      const lobe = Math.pow(sunDot, 24) * 0.90 + Math.pow(sunDot, 3) * 0.14;
      r += p.keyCol[0] * lobe; g += p.keyCol[1] * lobe; b += p.keyCol[2] * lobe;
      const ap = Math.max(0, dir.z) * Math.max(0, 1 - Math.abs(dir.y) * 2.4);
      const mullion = (Math.sin(theta * 14) > -0.78) ? 1.0 : 0.24;
      r += p.apertureCol[0] * ap * ap * 0.44 * mullion;
      g += p.apertureCol[1] * ap * ap * 0.44 * mullion;
      b += p.apertureCol[2] * ap * ap * 0.44 * mullion;
      const idx = (y * W + x) * 4;
      data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 1.0;
    }
  }
  const hdrTex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.FloatType);
  hdrTex.mapping = THREE.EquirectangularReflectionMapping;
  hdrTex.colorSpace = THREE.LinearSRGBColorSpace;
  hdrTex.needsUpdate = true;
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envRT = pmrem.fromEquirectangular(hdrTex);
  hdrTex.dispose();
  pmrem.dispose();
  return envRT;
}

// ── RAZOR-SHARP ARCHITECTURAL LOW-IRON GLASS (5 Coatings + textureLod 0.0) ───
const GLASS_COATINGS = {
  clear:  { name: 'Clear',  color: '#f4f9fb', atten: '#eef6fa', attenDist: 16.0 },
  rose:   { name: 'Rose',   color: '#f2dfe7', atten: '#d9bacb', attenDist: 6.5 },
  copper: { name: 'Copper', color: '#f2e0d2', atten: '#c78c62', attenDist: 5.8 },
  plum:   { name: 'Plum',   color: '#dfd4de', atten: '#654a4e', attenDist: 6.0 },
  blue:   { name: 'Blue',   color: '#d8ebf6', atten: '#7eaec9', attenDist: 7.0 }
};

function createSharpArchitecturalGlass(coatingKey = 'clear') {
  const c = GLASS_COATINGS[coatingKey] || GLASS_COATINGS.clear;
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(c.color),
    transmission: 1.0,
    ior: 1.52,
    roughness: 0.012,
    thickness: 0.012,
    metalness: 0.0,
    specularIntensity: 1.0,
    attenuationColor: new THREE.Color(c.atten),
    attenuationDistance: c.attenDist,
    envMapIntensity: 1.25,
    side: THREE.DoubleSide
  });
  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <transmission_pars_fragment>',
      THREE.ShaderChunk.transmission_pars_fragment.replace(
        /textureBicubic\s*\(\s*transmissionSamplerMap\s*,\s*uv\s*,\s*[^)]+\)/g,
        'textureLod( transmissionSamplerMap, uv, 0.0 )'
      )
    );
  };
  mat.customProgramCacheKey = () => 'assembl-sharp-glass-lod0-v2';
  return mat;
}

// ── 28-WAVE TILEABLE NORMAL MAP + 3-OCTAVE SCHLICK FRESNEL POOL WATER ────────
function build28WaveWaterNormals(size = 256) {
  const d = new Uint8Array(size * size * 4), H = new Float32Array(size * size), TAU = Math.PI * 2;
  const rng = makeRng(3031), waves = [];
  for (let i = 0; i < 28; i++) waves.push([1 + Math.floor(rng() * 9), Math.floor(rng() * 9) - 4, rng() * TAU, 1 / (1 + i * 0.35)]);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let h = 0; for (const [a, b, ph, amp] of waves) h += amp * Math.sin(TAU * (a * x + b * y) / size + ph);
    H[y * size + x] = h;
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const hx = H[y * size + (x + 1) % size] - H[y * size + (x - 1 + size) % size];
    const hy = H[((y + 1) % size) * size + x] - H[((y - 1 + size) % size) * size + x];
    const v = new THREE.Vector3(-hx * 0.38, -hy * 0.38, 1).normalize(), i = (y * size + x) * 4;
    d[i] = (v.x * 0.5 + 0.5) * 255; d[i + 1] = (v.y * 0.5 + 0.5) * 255; d[i + 2] = (v.z * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  const tex = new THREE.DataTexture(d, size, size);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.needsUpdate = true;
  return tex;
}

function createSchlickWaterMaterial(waterNormTex) {
  return new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uTime: { value: 0 }, uNorm: { value: waterNormTex },
      uSunDir: { value: new THREE.Vector3(0.32, 0.16, -0.93).normalize() },
      uSunCol: { value: new THREE.Color('#f6ba92') }, uSkyCol: { value: new THREE.Color('#9c7a88') },
      uDeepCol: { value: new THREE.Color('#0d2b36') }, uShallowCol: { value: new THREE.Color('#27727e') },
      uLedGlow: { value: 0.55 }
    },
    vertexShader: `varying vec3 vWorld; varying vec2 vUv; void main(){ vUv=uv; vec4 wp=modelMatrix*vec4(position,1.0); vWorld=wp.xyz; gl_Position=projectionMatrix*viewMatrix*wp; }`,
    fragmentShader: `
      varying vec3 vWorld; varying vec2 vUv;
      uniform float uTime, uLedGlow; uniform sampler2D uNorm;
      uniform vec3 uSunDir, uSunCol, uSkyCol, uDeepCol, uShallowCol;
      mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
      void main(){
        vec2 p = vWorld.xz;
        vec2 uv1 = rot(0.42)*(p*0.34) + vec2(uTime*0.032, uTime*0.020);
        vec2 uv2 = rot(-0.78)*(p*0.64) + vec2(-uTime*0.045, uTime*0.028);
        vec2 uv3 = rot(1.15)*(p*1.22) + vec2(uTime*0.022, -uTime*0.038);
        vec3 n1=texture2D(uNorm,uv1).xyz*2.0-1.0, n2=texture2D(uNorm,uv2).xyz*2.0-1.0, n3=texture2D(uNorm,uv3).xyz*2.0-1.0;
        vec3 n = normalize(vec3((n1.x+n2.x*0.6+n3.x*0.35)*0.40, 1.0, (n1.y+n2.y*0.6+n3.y*0.35)*0.40));
        vec3 V = normalize(cameraPosition - vWorld);
        float fresnel = 0.020 + 0.98 * pow(1.0 - clamp(dot(n, V), 0.0, 1.0), 5.0);
        float spec = pow(max(0.0, dot(reflect(-V, n), normalize(uSunDir))), 160.0);
        // Subtle animated underwater caustic shimmer
        float caust = pow(clamp(0.5 + 0.5 * (n1.x * n2.y - n1.y * n3.x) * 2.2, 0.0, 1.0), 3.0);
        vec3 baseWater = mix(uShallowCol, uDeepCol, clamp(vUv.x * 0.65 + 0.18, 0.0, 1.0));
        baseWater += vec3(0.18, 0.48, 0.54) * caust * (0.28 + uLedGlow * 0.45);
        vec3 col = mix(baseWater, uSkyCol, clamp(fresnel * 1.12, 0.0, 0.90));
        gl_FragColor = vec4(col + uSunCol * spec * 1.75, 0.93);
      }`
  });
}

// ── SOBEL NORMAL + ROUGHNESS MAP DERIVATION FROM HIGH-RES CANVAS ─────────────
function makeNormalAndRoughFromCanvas(srcCanvas, strength = 2.4, roughMin = 0.45, roughMax = 0.88) {
  const w = srcCanvas.width, h = srcCanvas.height;
  const src = srcCanvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  const nC = document.createElement('canvas'); nC.width = w; nC.height = h;
  const rC = document.createElement('canvas'); rC.width = w; rC.height = h;
  const nCtx = nC.getContext('2d'), rCtx = rC.getContext('2d');
  const nOut = nCtx.createImageData(w, h), rOut = rCtx.createImageData(w, h);
  const lum = (x, y) => {
    const i = (((y + h) % h) * w + ((x + w) % w)) * 4;
    return (src[i] * 0.299 + src[i + 1] * 0.587 + src[i + 2] * 0.114) / 255;
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const l = lum(x, y);
    const dx = (lum(x + 1, y) - lum(x - 1, y)) * strength;
    const dy = (lum(x, y + 1) - lum(x, y - 1)) * strength;
    const inv = 1 / Math.hypot(dx, dy, 1);
    const i = (y * w + x) * 4;
    nOut.data[i] = Math.round((-dx * inv * 0.5 + 0.5) * 255);
    nOut.data[i + 1] = Math.round((-dy * inv * 0.5 + 0.5) * 255);
    nOut.data[i + 2] = Math.round((inv * 0.5 + 0.5) * 255);
    nOut.data[i + 3] = 255;
    // Darker pores/grooves are rougher; raised grain is smoother
    const rv = Math.round((roughMax - l * (roughMax - roughMin)) * 255);
    rOut.data[i] = rOut.data[i + 1] = rOut.data[i + 2] = Math.max(0, Math.min(255, rv));
    rOut.data[i + 3] = 255;
  }
  nCtx.putImageData(nOut, 0, 0);
  rCtx.putImageData(rOut, 0, 0);
  const normalMap = new THREE.CanvasTexture(nC);
  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping; normalMap.anisotropy = 8;
  const roughnessMap = new THREE.CanvasTexture(rC);
  roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping; roughnessMap.anisotropy = 8;
  return { normalMap, roughnessMap };
}

// ── ELITE ARCHITECTURAL PBR TEXTURES (Real Photographic + 1024px PBR Maps) ───
function buildEliteArchTextures(maxAniso = 8) {
  const rng = makeRng(4201);
  const loader = new THREE.TextureLoader();

  const loadPhotoTex = (url, repX = 1, repY = 1) => {
    const t = loader.load(url);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repX, repY);
    t.anisotropy = maxAniso;
    return t;
  };

  // Real photographic textures from study-assets
  const photoCedarMap = loadPhotoTex('/nz-planting-studio/study-assets/cedar.webp', 2, 1);
  const photoCharredMap = loadPhotoTex('/nz-planting-studio/study-assets/charred.webp', 2, 1);
  const photoDeckMap = loadPhotoTex('/nz-planting-studio/study-assets/deck.webp', 3, 2);
  const photoPlasterMap = loadPhotoTex('/nz-planting-studio/study-assets/plastered_wall_04.webp', 3, 2);
  const photoGravelMap = loadPhotoTex('/nz-planting-studio/study-assets/sandy_gravel.webp', 5, 5);

  // 1. 1024×1024 Architectural Board-Formed Concrete (formwork seams + wood-grain transfer + tie-rod holes)
  const cConc = document.createElement('canvas'); cConc.width = cConc.height = 1024;
  const ctxC = cConc.getContext('2d'); ctxC.fillStyle = '#aba39a'; ctxC.fillRect(0, 0, 1024, 1024);
  const boards = 16, bh = 1024 / boards;
  for (let i = 0; i < boards; i++) {
    const v = 164 + Math.floor((rng() - 0.5) * 20);
    ctxC.fillStyle = `rgb(${v + 4},${v},${v - 5})`;
    ctxC.fillRect(0, i * bh, 1024, bh - 2);
    // Subtle wood-grain impression transferred from timber shuttering
    for (let g = 0; g < 18; g++) {
      const gy = i * bh + rng() * (bh - 4);
      ctxC.fillStyle = `rgba(${v - 16},${v - 18},${v - 20},0.16)`;
      ctxC.fillRect(0, gy, 1024, 1.2 + rng() * 1.4);
    }
    // Crisp dark formwork seam
    ctxC.fillStyle = 'rgba(42,36,32,0.44)'; ctxC.fillRect(0, i * bh + bh - 2, 1024, 2);
    // Recessed tie-rod cone holes (25mm architectural grid)
    if (i % 4 === 1) {
      for (const hx of [192, 512, 832]) {
        const grad = ctxC.createRadialGradient(hx, i * bh + bh * 0.5, 1, hx, i * bh + bh * 0.5, 9);
        grad.addColorStop(0, 'rgba(34,30,27,0.72)');
        grad.addColorStop(0.6, 'rgba(68,62,56,0.38)');
        grad.addColorStop(1, 'rgba(164,158,150,0)');
        ctxC.fillStyle = grad; ctxC.beginPath(); ctxC.arc(hx, i * bh + bh * 0.5, 9, 0, Math.PI * 2); ctxC.fill();
      }
    }
  }
  for (let i = 0; i < 9500; i++) {
    const g = 132 + Math.floor(rng() * 68);
    ctxC.fillStyle = `rgba(${g},${g - 3},${g - 7},0.14)`;
    ctxC.fillRect(rng() * 1024, rng() * 1024, 2, 2);
  }
  const concreteMap = new THREE.CanvasTexture(cConc);
  concreteMap.colorSpace = THREE.SRGBColorSpace; concreteMap.wrapS = concreteMap.wrapT = THREE.RepeatWrapping; concreteMap.anisotropy = maxAniso;
  const concretePBR = makeNormalAndRoughFromCanvas(cConc, 2.2, 0.72, 0.94);

  // 2. Honed Warm Travertine (sedimentary veining + fine mineral pores for kitchen island & plinths)
  const cTrav = document.createElement('canvas'); cTrav.width = cTrav.height = 512;
  const ctxT = cTrav.getContext('2d'); ctxT.fillStyle = '#ddd4c5'; ctxT.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 2) {
    const wave = Math.sin(y * 0.045) * 10 + Math.cos(y * 0.11) * 5;
    const v = 212 + Math.floor(wave + (rng() - 0.5) * 14);
    ctxT.fillStyle = `rgb(${v + 4},${v - 2},${v - 13})`;
    ctxT.fillRect(0, y, 512, 2);
  }
  for (let i = 0; i < 480; i++) {
    ctxT.fillStyle = `rgba(148,136,120,${0.12 + rng() * 0.16})`;
    ctxT.fillRect(rng() * 512, rng() * 512, 8 + rng() * 28, 1.5 + rng() * 1.5);
  }
  const travertineMap = new THREE.CanvasTexture(cTrav);
  travertineMap.colorSpace = THREE.SRGBColorSpace; travertineMap.wrapS = travertineMap.wrapT = THREE.RepeatWrapping; travertineMap.anisotropy = maxAniso;
  const travertinePBR = makeNormalAndRoughFromCanvas(cTrav, 1.6, 0.28, 0.56);

  // 3. Wide-Plank European Oak Flooring (staggered joints + cathedral grain)
  const cOak = document.createElement('canvas'); cOak.width = cOak.height = 512;
  const ctxO = cOak.getContext('2d'); ctxO.fillStyle = '#c89e6d'; ctxO.fillRect(0, 0, 512, 512);
  const planks = 10, ph = 512 / planks;
  for (let i = 0; i < planks; i++) {
    const v = Math.floor((rng() - 0.5) * 22);
    ctxO.fillStyle = `rgb(${198 + v},${154 + Math.floor(v * 0.72)},${104 + Math.floor(v * 0.5)})`;
    ctxO.fillRect(0, i * ph + 1, 512, ph - 2);
    for (let s = 0; s < 10; s++) {
      ctxO.fillStyle = `rgba(120,82,46,${0.08 + rng() * 0.08})`;
      ctxO.fillRect(0, i * ph + rng() * ph, 512, 1.5);
    }
    ctxO.fillStyle = 'rgba(72,46,24,0.34)'; ctxO.fillRect(0, i * ph, 512, 1.6);
    const jx = ((i * 193) % 420) + 45;
    ctxO.fillRect(jx, i * ph, 1.5, ph);
  }
  const oakMap = new THREE.CanvasTexture(cOak);
  oakMap.colorSpace = THREE.SRGBColorSpace; oakMap.wrapS = oakMap.wrapT = THREE.RepeatWrapping; oakMap.repeat.set(3.5, 2.2); oakMap.anisotropy = maxAniso;
  const oakPBR = makeNormalAndRoughFromCanvas(cOak, 1.8, 0.34, 0.58);

  // 4. Framed Gallery NZ Coastal Abstract Artwork Canvas (deep plum, warm ivory, coastal sage & gold)
  const makeGalleryArt = (seedA, palette) => {
    const r2 = makeRng(seedA);
    const c = document.createElement('canvas'); c.width = 512; c.height = 384;
    const x = c.getContext('2d');
    x.fillStyle = palette[0]; x.fillRect(0, 0, 512, 384);
    for (let k = 0; k < 14; k++) {
      const gx = r2() * 512, gy = r2() * 384, rad = 80 + r2() * 190;
      const g = x.createRadialGradient(gx, gy, 10, gx, gy, rad);
      g.addColorStop(0, palette[1 + (k % (palette.length - 1))]);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(0, 0, 512, 384);
    }
    // Crisp horizon brushstroke
    x.fillStyle = palette[palette.length - 1];
    x.fillRect(28, 224, 456, 3);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  };
  const art1 = makeGalleryArt(9101, ['#ede6dc', 'rgba(58,72,56,0.72)', 'rgba(176,128,96,0.58)', 'rgba(36,24,33,0.48)', 'rgba(217,186,203,0.55)']);
  const art2 = makeGalleryArt(9202, ['#e8dfd3', 'rgba(42,58,64,0.70)', 'rgba(196,154,110,0.52)', 'rgba(98,74,78,0.50)', 'rgba(246,241,237,0.65)']);

  // 5. Rich Organic Daltons Bark Mulch & Coastal Volcanic Earth (Garden Studio Inspired)
  const cMulch = document.createElement('canvas'); cMulch.width = cMulch.height = 512;
  const ctxM = cMulch.getContext('2d'); ctxM.fillStyle = '#3c2e24'; ctxM.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 14000; i++) {
    const shade = 38 + Math.floor(rng() * 54);
    ctxM.fillStyle = `rgba(${shade + 14},${shade + 2},${shade - 8},0.55)`;
    ctxM.save();
    ctxM.translate(rng() * 512, rng() * 512);
    ctxM.rotate(rng() * Math.PI);
    ctxM.fillRect(-4, -1.5, 4 + rng() * 9, 1.5 + rng() * 2.5);
    ctxM.restore();
  }
  const mulchMap = new THREE.CanvasTexture(cMulch);
  mulchMap.colorSpace = THREE.SRGBColorSpace; mulchMap.wrapS = mulchMap.wrapT = THREE.RepeatWrapping; mulchMap.repeat.set(11, 11); mulchMap.anisotropy = maxAniso;
  const mulchPBR = makeNormalAndRoughFromCanvas(cMulch, 2.8, 0.84, 0.98);

  return {
    concreteMap, concreteNorm: concretePBR.normalMap, concreteRough: concretePBR.roughnessMap,
    travertineMap, travertineNorm: travertinePBR.normalMap, travertineRough: travertinePBR.roughnessMap,
    oakMap, oakNorm: oakPBR.normalMap, oakRough: oakPBR.roughnessMap,
    photoCedarMap, photoCharredMap, photoDeckMap, photoPlasterMap, photoGravelMap,
    mulchMap, mulchNorm: mulchPBR.normalMap, mulchRough: mulchPBR.roughnessMap,
    art1, art2,
    waterNorm: build28WaveWaterNormals(256)
  };
}

// ── TERRACED COASTAL HILLSIDE ELEVATION ──────────────────────────────────────
function hillsideHeight(x, z) {
  return -2.25
    + Math.max(0, (-x - 1.2) * 0.22)
    + Math.max(0, (-z - 3.5) * 0.14)
    + Math.min(0, (z - 2.0) * -0.17)
    + (Math.sin(x * 0.21 + 0.4) * 0.30 + Math.cos(z * 0.25 - 0.5) * 0.26) * 0.48;
}

// ── NON-PROCEDURAL PHOTOGRAPHIC NZ BOTANICAL STUDIO ATLAS LANDSCAPING ────────
// Uses the 5 studio-lit photographic RGBA WebP atlases from assembl. Garden Studio v9.2
// (20 real NZ native species, 20px RGB edge dilation, zero procedural cones/spheres!)
const PHOTO_SPECIES = {
  harakeke:       { atlas: 0, col: 0, row: 0, w: 1.55, h: 1.48, cards: 4, arch: 0.12 },
  ponga:          { atlas: 0, col: 1, row: 0, w: 2.35, h: 2.75, cards: 4, arch: 0.10 },
  silver_spear:   { atlas: 0, col: 0, row: 1, w: 1.25, h: 1.05, cards: 4, arch: 0.10 },
  platts_black:   { atlas: 0, col: 1, row: 1, w: 0.95, h: 0.58, cards: 3, arch: 0.08 },
  toetoe:         { atlas: 1, col: 0, row: 0, w: 1.85, h: 2.15, cards: 4, arch: 0.14 },
  red_tussock:    { atlas: 1, col: 1, row: 0, w: 1.15, h: 0.92, cards: 4, arch: 0.10 },
  carex_testacea: { atlas: 1, col: 0, row: 1, w: 0.98, h: 0.68, cards: 3, arch: 0.08 },
  libertia:       { atlas: 1, col: 1, row: 1, w: 0.85, h: 0.72, cards: 3, arch: 0.08 },
  pohutukawa:     { atlas: 2, col: 0, row: 0, w: 6.40, h: 6.20, cards: 5, arch: 0.16 },
  kowhai:         { atlas: 2, col: 1, row: 0, w: 4.80, h: 5.20, cards: 4, arch: 0.14 },
  tikouka:        { atlas: 2, col: 0, row: 1, w: 2.85, h: 4.10, cards: 4, arch: 0.12 },
  manuka:         { atlas: 2, col: 1, row: 1, w: 2.40, h: 2.35, cards: 4, arch: 0.12 },
  agapanthus:     { atlas: 3, col: 0, row: 0, w: 1.15, h: 1.05, cards: 3, arch: 0.08 },
  rengarenga:     { atlas: 4, col: 0, row: 0, w: 0.92, h: 0.78, cards: 3, arch: 0.08 },
  koromiko:       { atlas: 4, col: 1, row: 0, w: 1.35, h: 1.15, cards: 4, arch: 0.10 },
  nikau:          { atlas: 4, col: 1, row: 1, w: 3.45, h: 4.85, cards: 5, arch: 0.14 }
};

function createPhotographicClusterGeo(spec) {
  // Builds an intersecting, gently curved 3D photographic botanical cluster with dome-wrapped normals
  const u0 = spec.col * 0.5 + 0.008;
  const u1 = (spec.col + 1) * 0.5 - 0.008;
  // WebGL flipY=true: row 0 is top half (v: 0.5..1.0), row 1 is bottom half (v: 0.0..0.5)
  const v0 = (1 - spec.row) * 0.5 + 0.008;
  const v1 = (2 - spec.row) * 0.5 - 0.008;

  const pos = [], norm = [], uvs = [], idx = [];
  const segX = 2, segY = 3;
  const cards = spec.cards || 4;

  for (let c = 0; c < cards; c++) {
    const angle = (c / cards) * Math.PI + (c % 2 === 0 ? 0.0 : 0.22);
    const tilt = (c % 2 === 0 ? 1 : -1) * 0.08;
    const ca = Math.cos(angle), sa = Math.sin(angle);
    const vStart = pos.length / 3;

    for (let iy = 0; iy <= segY; iy++) {
      const ty = iy / segY;
      const y = ty * spec.h;
      const bowZ = Math.sin(ty * Math.PI) * spec.w * spec.arch;
      for (let ix = 0; ix <= segX; ix++) {
        const tx = ix / segX;
        const lx = (tx - 0.5) * spec.w;
        const cupZ = (0.25 - (tx - 0.5) * (tx - 0.5)) * spec.w * 0.14;
        const lz = bowZ + cupZ + ty * tilt * spec.w;

        const wx = lx * ca - lz * sa;
        const wz = lx * sa + lz * ca;
        pos.push(wx, y, wz);

        // Smooth dome-wrapped normals so sunlight wraps naturally across the whole plant crown
        const nx = wx * 0.65, ny = 0.55 + ty * 0.65, nz = wz * 0.65;
        const nl = Math.hypot(nx, ny, nz) || 1;
        norm.push(nx / nl, ny / nl, nz / nl);

        uvs.push(u0 + tx * (u1 - u0), v0 + ty * (v1 - v0));
      }
    }

    const rowStride = segX + 1;
    for (let iy = 0; iy < segY; iy++) {
      for (let ix = 0; ix < segX; ix++) {
        const a = vStart + iy * rowStride + ix;
        const b = a + 1;
        const d = a + rowStride;
        const e = d + 1;
        idx.push(a, b, d, b, e, d);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  return geo;
}

function buildPhotographicNZGarden(scene, tex, maxAniso = 8) {
  const loader = new THREE.TextureLoader();
  const atlasTextures = [];
  const atlasUniforms = { uTime: { value: 0 }, uSunDir: { value: new THREE.Vector3(0.32, 0.16, -0.93).normalize() } };
  const plantMaterials = [];

  for (let i = 0; i < 5; i++) {
    const t = loader.load(`/waiheke-hero/assets/botanical_atlas_${i}.webp`);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = maxAniso;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    atlasTextures.push(t);

    const mat = new THREE.MeshStandardMaterial({
      map: t,
      alphaTest: 0.44,
      side: THREE.DoubleSide,
      roughness: 0.84,
      metalness: 0.0,
      envMapIntensity: 0.22
    });
    // Subtle Waiheke coastal breeze sway + grazing-angle fade + warm backlit SSS
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uWindTime = atlasUniforms.uTime;
      shader.uniforms.uSunDir = atlasUniforms.uSunDir;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `
          #include <common>
          uniform float uWindTime;
          varying float vLeafH;
        `)
        .replace('#include <begin_vertex>', `
          #include <begin_vertex>
          vLeafH = clamp(position.y / 3.2, 0.0, 1.0);
          vec4 wp0 = modelMatrix * vec4(transformed, 1.0);
          float flex = clamp(position.y * 0.22, 0.0, 1.0);
          float sway = sin(uWindTime * 1.45 + wp0.x * 0.42 + wp0.z * 0.35) * 0.085 * flex * flex;
          transformed.x += sway;
          transformed.z += cos(uWindTime * 1.15 + wp0.z * 0.5) * 0.045 * flex * flex;
        `);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `
          #include <common>
          varying float vLeafH;
          uniform vec3 uSunDir;
        `)
        .replace('#include <color_fragment>', `
          #include <color_fragment>
          // Base AO grounding so stems nestle naturally into dark bark mulch
          diffuseColor.rgb *= mix(0.54, 1.04, smoothstep(0.0, 0.35, vLeafH));
        `);
    };
    mat.customProgramCacheKey = () => `assembl-photo-botanical-v2-${i}`;
    plantMaterials.push(mat);
  }

  const gardenGroup = new THREE.Group();
  const speciesGeos = {};
  const rng = makeRng(8842);

  const placePhotoPlant = (speciesKey, x, z, scale = 1.0, rotY = null) => {
    const spec = PHOTO_SPECIES[speciesKey];
    if (!spec) return;
    if (!speciesGeos[speciesKey]) speciesGeos[speciesKey] = createPhotographicClusterGeo(spec);
    const mesh = new THREE.Mesh(speciesGeos[speciesKey], plantMaterials[spec.atlas]);
    const y = hillsideHeight(x, z);
    mesh.position.set(x, y - 0.06, z);
    mesh.rotation.y = rotY !== null ? rotY : rng() * Math.PI * 2;
    const s = scale * (0.92 + rng() * 0.18);
    mesh.scale.set(s, s * (0.95 + rng() * 0.12), s);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    gardenGroup.add(mesh);
  };

  // ── 1. ARCHITECTURAL TERRACED CORTEN RETAINING WALLS & STEPPING PATH ───────
  const cortenMat = new THREE.MeshStandardMaterial({ color: '#7a3f26', roughness: 0.78, metalness: 0.28, normalMap: tex.mulchNorm, normalScale: new THREE.Vector2(0.35, 0.35) });
  const basaltMat = new THREE.MeshStandardMaterial({ color: '#3b3d40', roughness: 0.66, metalness: 0.06, normalMap: tex.concreteNorm, normalScale: new THREE.Vector2(0.55, 0.55) });
  const paverMat = new THREE.MeshStandardMaterial({ map: tex.concreteMap, normalMap: tex.concreteNorm, normalScale: new THREE.Vector2(0.65, 0.65), color: '#b8b1a8', roughness: 0.74 });
  const gravelMat = new THREE.MeshStandardMaterial({ map: tex.photoGravelMap, roughness: 0.90, color: '#9c958d' });

  // Curved Corten steel terraced planting bed rim across the sunlit foreground slope
  const rimPts = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const x = -11.5 + t * 22.8;
    const z = 5.1 + Math.sin(t * Math.PI * 1.35) * 1.45;
    rimPts.push(new THREE.Vector3(x, hillsideHeight(x, z) + 0.14, z));
  }
  const rimCurve = new THREE.CatmullRomCurve3(rimPts);
  const rimTube = new THREE.Mesh(new THREE.TubeGeometry(rimCurve, 48, 0.06, 6, false), cortenMat);
  rimTube.scale.set(1, 2.4, 1);
  rimTube.castShadow = true; rimTube.receiveShadow = true;
  gardenGroup.add(rimTube);

  // Crushed NZ greywacke gravel & cantilevered concrete stepping pavers leading up to the lower entry
  const pathPts = [
    [-2.4, 9.8], [-1.9, 8.6], [-1.3, 7.4], [-0.6, 6.2], [0.2, 5.1], [1.1, 4.1], [2.0, 3.2]
  ];
  for (let i = 0; i < pathPts.length; i++) {
    const [px, pz] = pathPts[i];
    const py = hillsideHeight(px, pz);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.15, 0.06, 12), gravelMat);
    pad.position.set(px, py + 0.01, pz); pad.receiveShadow = true;
    gardenGroup.add(pad);
    const tread = new THREE.Mesh(new RoundedBoxGeometry(1.32, 0.11, 0.62, 2, 0.02), paverMat);
    tread.position.set(px, py + 0.06, pz);
    tread.rotation.y = -0.35 + i * 0.05;
    tread.castShadow = true; tread.receiveShadow = true;
    gardenGroup.add(tread);
    const ledStrip = new THREE.Mesh(new THREE.BoxGeometry(1.10, 0.022, 0.03), new THREE.MeshStandardMaterial({ color: '#fff3d6', emissive: new THREE.Color('#ffbe66'), emissiveIntensity: 2.6, roughness: 0.24 }));
    ledStrip.position.set(px, py + 0.018, pz + 0.27);
    ledStrip.rotation.y = -0.35 + i * 0.05;
    gardenGroup.add(ledStrip);
  }

  // Sculpted weathered Waikato basalt boulders anchoring the terraced beds
  const boulderSpots = [
    [-8.6, 4.4, 0.68], [-8.0, 4.9, 0.42], [-3.8, 5.1, 0.56],
    [1.6, 5.4, 0.48], [8.8, 5.2, 0.64], [9.4, 4.6, 0.44]
  ];
  for (const [bx, bz, bs] of boulderSpots) {
    const geo = new THREE.DodecahedronGeometry(bs, 2);
    const bp = geo.attributes.position;
    for (let k = 0; k < bp.count; k++) {
      const vx = bp.getX(k), vy = bp.getY(k), vz = bp.getZ(k);
      const n = 0.84 + 0.24 * Math.sin(vx * 5.2 + bz) * Math.cos(vz * 4.7 + bx);
      bp.setXYZ(k, vx * 1.25 * n, vy * 0.68 * n, vz * 1.1 * n);
    }
    geo.computeVertexNormals();
    const rock = new THREE.Mesh(geo, basaltMat);
    rock.position.set(bx, hillsideHeight(bx, bz) + bs * 0.22, bz);
    rock.castShadow = true; rock.receiveShadow = true;
    gardenGroup.add(rock);
  }

  // ── 2. ARCHITECTURAL WARM BRASS GARDEN BOLLARD LIGHTS ──────────────────────
  const brassMat = new THREE.MeshStandardMaterial({ color: '#8e6d44', roughness: 0.34, metalness: 0.86 });
  const bollardGlowMat = new THREE.MeshStandardMaterial({ color: '#fff3d6', emissive: new THREE.Color('#ffbe66'), emissiveIntensity: 3.4, roughness: 0.2 });
  const bollardLights = [];
  for (const [lx, lz] of [[-2.9, 8.2], [-1.5, 5.8], [0.6, 4.5], [7.8, 5.6], [-6.8, 4.2]]) {
    const ly = hillsideHeight(lx, lz);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.68, 12), brassMat);
    post.position.set(lx, ly + 0.34, lz); post.castShadow = true; gardenGroup.add(post);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.09, 12), bollardGlowMat);
    lens.position.set(lx, ly + 0.58, lz); gardenGroup.add(lens);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.046, 0.04, 12), brassMat);
    cap.position.set(lx, ly + 0.66, lz); gardenGroup.add(cap);
    const pt = new THREE.PointLight(0xffb862, 2.4, 5.5, 1.8);
    pt.position.set(lx, ly + 0.60, lz); gardenGroup.add(pt);
    bollardLights.push({ light: pt, base: 2.4 });
  }

  // ── 3. LAYERED PHOTOGRAPHIC NZ NATIVE PLANTING DRIFTS ──────────────────────
  // Hero Canopy Framing (Pōhutukawa, Kōwhai, Nīkau Palms, Ponga, Tī Kōuka)
  const canopySpecs = [
    ['pohutukawa', -13.2,  1.8, 1.18], ['pohutukawa',  13.4,  1.4, 1.24],
    ['pohutukawa', -10.8, -5.8, 1.05], ['pohutukawa',  11.6, -5.2, 1.10],
    ['kowhai',      -5.4, -9.2, 1.08], ['kowhai',       5.8, -9.0, 1.04],
    ['pohutukawa',   0.4, -10.4, 1.15],
    ['nikau',      -10.6,  3.6, 1.08], ['nikau',       10.6,  3.2, 1.02],
    ['nikau',       -9.4, -2.6, 0.96], ['nikau',       11.4, -1.2, 0.94],
    ['ponga',       -9.8,  2.2, 0.95], ['ponga',       -7.8,  2.8, 0.88],
    ['ponga',        9.6,  2.0, 0.92], ['tikouka',     -9.2,  5.6, 0.96],
    ['tikouka',      9.8,  5.4, 0.92], ['manuka',     -11.8,  4.8, 1.05],
    ['manuka',      11.8,  4.4, 1.02]
  ];
  for (const [sp, x, z, sc] of canopySpecs) placePhotoPlant(sp, x, z, sc);

  // Mid-Layer Structural Drifts (Harakeke, Toetoe, Silver Spear Astelia, Koromiko)
  const midSpecs = [
    ['harakeke', -7.8, 4.1, 1.05], ['harakeke', -5.4, 4.3, 0.98], ['harakeke', -3.2, 4.1, 0.92],
    ['harakeke',  0.8, 3.8, 0.96], ['harakeke',  8.4, 4.2, 1.04], ['harakeke', 10.2, 4.8, 0.94],
    ['toetoe',   -9.6, 4.6, 0.96], ['toetoe',    9.4, 3.9, 1.00], ['toetoe',   -6.6, 5.4, 0.88],
    ['silver_spear', -6.8, 3.7, 1.08], ['silver_spear', -4.2, 4.6, 1.02], ['silver_spear', -1.8, 4.2, 0.96],
    ['silver_spear',  1.4, 4.5, 1.04], ['silver_spear',  8.2, 5.1, 1.06],
    ['koromiko', -8.4, 5.4, 0.95], ['koromiko',  2.2, 5.2, 0.92], ['koromiko', 10.6, 5.6, 0.98]
  ];
  for (const [sp, x, z, sc] of midSpecs) placePhotoPlant(sp, x, z, sc);

  // Foreground Matrix & Coastal Groundcover (Rengarenga, Red Tussock, Carex, Libertia, Agapanthus, Platt's Black)
  const matrixSpecies = ['rengarenga', 'red_tussock', 'carex_testacea', 'libertia', 'agapanthus', 'platts_black'];
  for (let i = 0; i < 64; i++) {
    const t = i / 63;
    const x = -11.4 + t * 22.8 + (rng() - 0.5) * 1.4;
    const z = 3.6 + rng() * 3.8;
    // Keep stepping-stone path and reflecting pool clear
    if (x > 2.2 && x < 8.2 && z < 5.6) continue;
    if (Math.hypot(x - (-0.8 + (z - 6.5) * -0.45), z - 6.5) < 1.25 && z > 4.2) continue;
    const sp = matrixSpecies[Math.floor(rng() * matrixSpecies.length)];
    placePhotoPlant(sp, x, z, 0.82 + rng() * 0.36);
  }

  scene.add(gardenGroup);
  return { gardenGroup, atlasUniforms, bollardLights, bollardGlowMat };
}

// ── ATMOSPHERIC WAIHEKE SKY & LAYERED HORIZON RIDGES ─────────────────────────
function createWaihekeSky() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      uTime: { value: 0 }, uZenith: { value: new THREE.Color('#271c29') }, uMid: { value: new THREE.Color('#8e6a77') },
      uHorizon: { value: new THREE.Color('#ebb691') }, uCloudDark: { value: new THREE.Color('#47323f') }, uCloudLit: { value: new THREE.Color('#f7cca9') },
      uSunDir: { value: new THREE.Vector3(0.32, 0.12, -0.94).normalize() }
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `
      varying vec3 vDir; uniform float uTime; uniform vec3 uZenith, uMid, uHorizon, uCloudDark, uCloudLit, uSunDir;
      float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123); }
      float noise(vec2 p){ vec2 i=floor(p),f=fract(p); vec2 u=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y); }
      float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p=p*2.04+vec2(13.1,7.7); a*=0.5; } return v; }
      void main(){
        vec3 d=normalize(vDir); float h=clamp(d.y,0.0,1.0);
        vec3 sky=mix(mix(uHorizon,uMid,smoothstep(0.0,0.26,h)),uZenith,smoothstep(0.22,0.78,h));
        float sunAmt=max(0.0,dot(d,uSunDir)); sky+=uCloudLit*pow(sunAmt,6.0)*0.30;
        if(d.y>0.01){
          vec2 cuv=d.xz/(d.y+0.26)*0.90+vec2(uTime*0.004,-uTime*0.0018);
          float c1=fbm(cuv), c2=fbm(cuv*2.1+vec2(4.2,-3.1));
          float cloud=smoothstep(0.42,0.80,c1*0.72+c2*0.28);
          float hf=smoothstep(0.01,0.14,d.y)*(1.0-smoothstep(0.55,0.92,d.y));
          sky=mix(sky,mix(uCloudDark,uCloudLit,smoothstep(0.32,0.76,c2+sunAmt*0.35)),cloud*hf*0.72);
        }
        gl_FragColor=vec4(sky,1.0);
      }`
  });
  return { mesh: new THREE.Mesh(new THREE.SphereGeometry(220, 48, 28), mat), mat };
}

function buildDistantWaihekeRidges() {
  const group = new THREE.Group(), ridgeMats = [];
  for (const L of [{ dist: 56, h: 12, color: '#39323a', seed: 1.1 }, { dist: 90, h: 20, color: '#534452', seed: 2.7 }, { dist: 132, h: 28, color: '#705868', seed: 4.3 }]) {
    const segs = 96, pos = [], idx = [];
    for (let i = 0; i <= segs; i++) {
      const a = -Math.PI * 0.85 + (i / segs) * Math.PI * 1.7, x = Math.sin(a) * L.dist, z = -Math.cos(a) * L.dist;
      const ridgeH = L.h * 0.48 + Math.sin(a * 4.0 + L.seed) * L.h * 0.24 + Math.cos(a * 9.0 - L.seed * 1.4) * L.h * 0.13;
      pos.push(x, -16, z, x, ridgeH, z);
    }
    for (let i = 0; i < segs; i++) { const b = i * 2; idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const mat = new THREE.MeshBasicMaterial({ color: L.color, fog: true }); ridgeMats.push(mat); group.add(new THREE.Mesh(geo, mat));
  }
  const rng = makeRng(709), dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.24, 8, 8), new THREE.MeshBasicMaterial({ color: '#ffbb66' }), 20), dummy = new THREE.Object3D();
  for (let i = 0; i < 20; i++) {
    const a = -0.35 + rng() * 0.95, dist = 44 + rng() * 36;
    dummy.position.set(Math.sin(a) * dist, 1.4 + rng() * 3.8, -Math.cos(a) * dist); dummy.scale.setScalar(0.6 + rng() * 1.1); dummy.updateMatrix(); dots.setMatrixAt(i, dummy.matrix);
  }
  group.add(dots);
  return { group, dots, ridgeMats };
}

// ── ELITE DESIGNER WAIHEKE ARCHITECTURAL PAVILION & CURATED INTERIORS ────────
function buildEliteWaihekeHouse(tex, glassMat, waterMat) {
  const house = new THREE.Group(), interiorLights = [], emissiveMats = [];

  // Elite Calibrated Architectural PBR Materials
  const concreteMat = new THREE.MeshPhysicalMaterial({
    map: tex.concreteMap, normalMap: tex.concreteNorm, normalScale: new THREE.Vector2(0.85, 0.85),
    roughnessMap: tex.concreteRough, roughness: 0.86, metalness: 0.02, clearcoat: 0.04, color: '#c6beb6'
  });
  const concreteDarkMat = new THREE.MeshPhysicalMaterial({
    map: tex.concreteMap, normalMap: tex.concreteNorm, normalScale: new THREE.Vector2(0.95, 0.95),
    roughnessMap: tex.concreteRough, roughness: 0.90, metalness: 0.02, color: '#9c928a'
  });
  const cedarMat = new THREE.MeshPhysicalMaterial({
    map: tex.photoCedarMap, roughness: 0.68, metalness: 0.02, clearcoat: 0.22, clearcoatRoughness: 0.44, color: '#56433a'
  });
  const charredMat = new THREE.MeshPhysicalMaterial({
    map: tex.photoCharredMap, roughness: 0.74, metalness: 0.04, clearcoat: 0.16, clearcoatRoughness: 0.48, color: '#2b2422'
  });
  const deckMat = new THREE.MeshStandardMaterial({
    map: tex.photoDeckMap, roughness: 0.64, metalness: 0.03, color: '#b8a28b'
  });
  const mullionMat = new THREE.MeshStandardMaterial({ color: '#171618', roughness: 0.30, metalness: 0.72, envMapIntensity: 1.25 });
  const brassMat = new THREE.MeshStandardMaterial({ color: '#b48d57', roughness: 0.26, metalness: 0.92, envMapIntensity: 1.35 });
  const roofMat = new THREE.MeshStandardMaterial({ color: '#28292e', roughness: 0.40, metalness: 0.56 });
  const plasterMat = new THREE.MeshStandardMaterial({ map: tex.photoPlasterMap, color: '#f4eadc', roughness: 0.88, metalness: 0.01 });
  const oakMat = new THREE.MeshPhysicalMaterial({
    map: tex.oakMap, normalMap: tex.oakNorm, normalScale: new THREE.Vector2(0.45, 0.45),
    roughnessMap: tex.oakRough, roughness: 0.42, clearcoat: 0.18, clearcoatRoughness: 0.34, color: '#e6c296'
  });
  const travertineMat = new THREE.MeshPhysicalMaterial({
    map: tex.travertineMap, normalMap: tex.travertineNorm, normalScale: new THREE.Vector2(0.55, 0.55),
    roughnessMap: tex.travertineRough, roughness: 0.38, clearcoat: 0.12, clearcoatRoughness: 0.36, color: '#e5ddd0'
  });
  const boucleMat = new THREE.MeshPhysicalMaterial({
    color: '#efe7dc', roughness: 0.92, sheen: 0.72, sheenRoughness: 0.56, sheenColor: new THREE.Color('#f7efe5')
  });
  const camelLeatherMat = new THREE.MeshPhysicalMaterial({
    color: '#a36c47', roughness: 0.48, clearcoat: 0.12, clearcoatRoughness: 0.45
  });
  const darkWalnutMat = new THREE.MeshStandardMaterial({ color: '#33251e', roughness: 0.46, metalness: 0.04 });
  const smokedOakMat = new THREE.MeshStandardMaterial({ color: '#5c4230', roughness: 0.52 });
  const curtainMat = new THREE.MeshPhysicalMaterial({
    color: '#f5efe6', roughness: 0.92, sheen: 0.52, sheenRoughness: 0.60, transparent: true, opacity: 0.76, side: THREE.DoubleSide
  });

  const makeLampMat = (hex = '#ffcf88', intensity = 3.4) => {
    const m = new THREE.MeshStandardMaterial({ color: '#fff5e4', emissive: new THREE.Color(hex), emissiveIntensity: intensity, roughness: 0.22 });
    emissiveMats.push({ mat: m, base: intensity });
    return m;
  };
  const lampMat = makeLampMat('#ffc878', 3.6);
  const coveLedMat = makeLampMat('#ffd392', 2.6);
  const alabasterMat = makeLampMat('#ffe2b4', 2.2);

  const addBox = (w, h, d, x, y, z, mat, cast = true, recv = true) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = recv; house.add(m); return m;
  };
  const addRBox = (w, h, d, r, x, y, z, mat, cast = true, recv = true) => {
    const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat);
    m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = recv; house.add(m); return m;
  };

  // Sculpted LatheGeometry helper for designer pendants, pedestals & vessels
  const addLathe = (pts2d, segs, x, y, z, mat) => {
    const pts = pts2d.map(([px, py]) => new THREE.Vector2(px, py));
    const m = new THREE.Mesh(new THREE.LatheGeometry(pts, segs), mat);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; house.add(m); return m;
  };

  // Pleated sheer linen curtain helper
  const addSheerCurtain = (w, h, x, y, z) => {
    const geo = new THREE.PlaneGeometry(w, h, 22, 6);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const px = p.getX(i), py = p.getY(i);
      const flare = 1.0 + Math.max(0, -py / h) * 0.14;
      p.setZ(i, Math.sin(px * 26.0) * 0.045 * flare);
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, curtainMat);
    m.position.set(x, y, z); house.add(m); return m;
  };

  // ── 1. LOWER ANCHOR PLINTH, STAIRWELL SLOT, CANTILEVERED DECK & POOL ───────
  addBox(6.8, 3.6, 5.4, -4.6, -1.8, -0.3, concreteDarkMat);
  addBox(5.4, 3.4, 5.2, 5.2, -1.7, -0.2, concreteMat);
  addBox(4.6, 2.9, 0.24, 5.2, -1.65, 2.32, charredMat);
  // Real 3D vertical cedar battens framing the glowing stairwell
  for (let i = 0; i < 18; i++) {
    const bx = 3.1 + i * 0.24;
    if (bx > 3.62 && bx < 4.58) continue;
    addBox(0.048, 2.86, 0.065, bx, -1.65, 2.47, cedarMat, true, false);
  }
  // Glowing architectural vertical stairwell window
  addBox(0.84, 2.76, 0.08, 4.1, -1.65, 2.36, makeLampMat('#ffbe66', 2.8), false, false);
  const stairGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.94, 2.86), glassMat);
  stairGlass.position.set(4.1, -1.65, 2.44); house.add(stairGlass);

  // Cantilevered Kwila sun terrace + infinity reflecting plunge pool with honed basalt coping
  addRBox(5.6, 0.44, 2.85, 0.03, 5.2, -2.55, 4.15, concreteDarkMat);
  addRBox(5.68, 0.08, 0.24, 0.015, 5.2, -2.30, 5.48, travertineMat);
  addRBox(5.68, 0.08, 0.24, 0.015, 5.2, -2.30, 2.82, travertineMat);
  addRBox(0.24, 0.08, 2.44, 0.015, 2.48, -2.30, 4.15, travertineMat);
  addRBox(0.24, 0.08, 2.44, 0.015, 7.92, -2.30, 4.15, travertineMat);
  const poolWater = new THREE.Mesh(new THREE.PlaneGeometry(5.15, 2.35), waterMat);
  poolWater.rotation.x = -Math.PI * 0.5; poolWater.position.set(5.2, -2.31, 4.15); house.add(poolWater);

  // Extended Kwila sun deck beside the pool with 2 sculpted teak & bouclé architectural sun loungers
  addRBox(4.8, 0.14, 2.8, 0.02, 0.2, -2.42, 3.85, deckMat);
  for (const lx of [-1.05, 0.35]) {
    addRBox(0.76, 0.16, 1.98, 0.03, lx, -2.26, 3.85, smokedOakMat);
    addRBox(0.70, 0.10, 1.32, 0.04, lx, -2.14, 4.12, boucleMat);
    const backCush = addRBox(0.70, 0.10, 0.66, 0.04, lx, -1.96, 3.24, boucleMat);
    backCush.rotation.x = 0.56;
  }
  // Sculpted weathering Corten coastal fire-bowl with warm amber ember glow
  const cortenFireMat = new THREE.MeshStandardMaterial({ color: '#6e3a24', roughness: 0.74, metalness: 0.34 });
  addLathe([[0.18, 0], [0.22, 0.06], [0.48, 0.24], [0.54, 0.34], [0.46, 0.34], [0.16, 0.12]], 24, 1.58, -2.34, 4.55, cortenFireMat);
  const emberBed = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.28, 0.06, 18), makeLampMat('#ff8c38', 3.2));
  emberBed.position.set(1.58, -2.12, 4.55); house.add(emberBed);
  const fireLight = new THREE.PointLight(0xff9442, 4.6, 8.5, 1.6);
  fireLight.position.set(1.58, -1.82, 4.55); house.add(fireLight);
  interiorLights.push({ light: fireLight, base: 4.6 });

  const underLight = new THREE.PointLight(0xffb463, 7.2, 12, 1.5);
  underLight.position.set(0.5, -0.42, 0.9); house.add(underLight);
  interiorLights.push({ light: underLight, base: 7.2 });

  // ── 2. MAIN CANTILEVERED LIVING PAVILION (Board-Formed Concrete + Shadow Reveals) ─
  const mainY = 0.0, mainW = 18.6, mainH = 3.28, mainD = 5.85;
  addRBox(mainW + 0.58, 0.44, mainD + 0.38, 0.02, 0.2, mainY + 0.16, 0.0, concreteMat);
  addRBox(mainW + 0.58, 0.38, mainD + 0.38, 0.02, 0.2, mainY + mainH + 0.19, 0.0, concreteMat);
  // Crisp bronze parapet drip flashing along upper fascia edge
  addBox(mainW + 0.62, 0.045, 0.05, 0.2, mainY + mainH + 0.39, mainD * 0.5 + 0.19, brassMat, false, false);
  addRBox(0.44, mainH + 0.42, mainD + 0.34, 0.02, -9.06, mainY + mainH * 0.5 + 0.16, 0.0, concreteMat);
  addRBox(0.44, mainH + 0.42, mainD + 0.34, 0.02, 9.46, mainY + mainH * 0.5 + 0.16, 0.0, concreteMat);

  // Frameless 12 mm low-iron architectural glass balustrade + brushed stainless spigots on upper cantilevered terrace
  const spigotMat = new THREE.MeshStandardMaterial({ color: '#d5dce2', roughness: 0.20, metalness: 0.90 });
  const upperBalGlass = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 1.08), glassMat);
  upperBalGlass.position.set(4.5, mainY + mainH + 0.92, mainD * 0.5 + 0.04); house.add(upperBalGlass);
  for (let sx = 0.0; sx <= 9.2; sx += 1.52) {
    addRBox(0.06, 0.20, 0.07, 0.01, sx, mainY + mainH + 0.44, mainD * 0.5 + 0.04, spigotMat, false, false);
  }

  // Standing-seam Colorsteel roof + recessed skylight curb
  addBox(11.6, 0.14, mainD + 0.42, 3.9, mainY + mainH + 0.44, 0.0, roofMat);
  for (let sx = -1.6; sx <= 9.5; sx += 0.46) addBox(0.036, 0.065, mainD + 0.38, sx, mainY + mainH + 0.53, 0.0, roofMat, false, false);
  addBox(2.9, 0.10, 1.15, 0.4, mainY + mainH + 0.54, 0.3, mullionMat, false, false);

  // Interior wide-plank European oak floor, Venetian plaster walls & recessed LED cove strip
  addBox(mainW - 0.38, 0.08, mainD - 0.28, 0.2, mainY + 0.40, 0.0, oakMat, false, true);
  addBox(mainW - 0.38, mainH, 0.22, 0.2, mainY + 0.4 + mainH * 0.5, -mainD * 0.5 + 0.18, plasterMat, true, true);
  addBox(0.18, mainH, 3.4, -2.0, mainY + 0.4 + mainH * 0.5, -1.0, plasterMat);
  addBox(0.18, mainH, 4.3, 5.4, mainY + 0.4 + mainH * 0.5, -0.55, plasterMat);
  addBox(mainW - 0.38, 0.06, mainD - 0.28, 0.2, mainY + mainH, 0.0, plasterMat, false, false);
  // Continuous warm 2700K architectural linear LED ceiling cove
  addBox(mainW - 1.2, 0.035, 0.06, 0.2, mainY + mainH - 0.03, -mainD * 0.5 + 0.36, coveLedMat, false, false);

  // ── 3. DESIGNER ARCHITECTURAL INTERIORS (Sculpted Furniture, Travertine & Brass) ─
  // A. Honed Travertine Waterfall Kitchen Island + Fluted Walnut + Brass Tap + 3 Sculpted Stools
  addRBox(2.58, 0.90, 0.94, 0.02, -6.9, mainY + 0.89, 0.36, darkWalnutMat);
  addRBox(2.68, 0.075, 1.04, 0.015, -6.9, mainY + 1.36, 0.36, travertineMat);
  addRBox(0.075, 0.94, 1.04, 0.015, -8.20, mainY + 0.91, 0.36, travertineMat);
  addRBox(0.075, 0.94, 1.04, 0.015, -5.60, mainY + 0.91, 0.36, travertineMat);
  // Under-counter warm LED toe-kick strip
  addBox(2.35, 0.025, 0.04, -6.9, mainY + 0.47, 0.84, coveLedMat, false, false);
  // Brushed brass architectural mixer tap
  addBox(0.03, 0.34, 0.03, -6.65, mainY + 1.56, 0.22, brassMat, false, false);
  addBox(0.03, 0.03, 0.18, -6.65, mainY + 1.72, 0.31, brassMat, false, false);
  // Rear matte charcoal kitchen joinery wall with recessed glowing oak niche
  addBox(2.9, 2.55, 0.62, -7.1, mainY + 1.70, -2.36, darkWalnutMat);
  addBox(1.85, 0.72, 0.14, -7.1, mainY + 1.65, -2.06, oakMat, false, false);
  addBox(1.80, 0.03, 0.04, -7.1, mainY + 1.98, -2.02, coveLedMat, false, false);
  // 3 Sculpted curved-seat bouclé & walnut counter stools
  for (const sx of [-7.62, -6.90, -6.18]) {
    addLathe([[0.04, 0], [0.16, 0.02], [0.035, 0.05], [0.03, 0.62], [0.18, 0.64]], 14, sx, mainY + 0.44, 1.15, darkWalnutMat);
    addRBox(0.40, 0.09, 0.38, 0.04, sx, mainY + 1.10, 1.15, boucleMat);
    addRBox(0.38, 0.18, 0.08, 0.035, sx, mainY + 1.22, 1.32, boucleMat);
  }

  // B. Sculpted Modular Bouclé Living Lounge + Travertine Nesting Tables + Framed Gallery Art
  addRBox(4.35, 0.03, 3.25, 0.015, -3.5, mainY + 0.455, 0.22, boucleMat, false, true);
  // Multi-module curved-edge bouclé L-sofa with bolsters
  addRBox(2.75, 0.14, 1.04, 0.03, -3.65, mainY + 0.54, -0.84, smokedOakMat);
  for (const cx of [-4.52, -3.65, -2.78]) {
    addRBox(0.84, 0.28, 0.96, 0.09, cx, mainY + 0.72, -0.80, boucleMat);
    addRBox(0.82, 0.44, 0.26, 0.09, cx, mainY + 1.04, -1.18, boucleMat);
  }
  // Chaise return + camel leather accent lounge chair
  addRBox(0.96, 0.28, 1.15, 0.09, -4.60, mainY + 0.72, 0.18, boucleMat);
  addRBox(0.88, 0.26, 0.86, 0.09, -2.25, mainY + 0.71, 0.42, camelLeatherMat);
  addRBox(0.86, 0.42, 0.22, 0.08, -2.25, mainY + 0.98, 0.74, camelLeatherMat);
  // Fluted travertine pedestal coffee table + sculptural ceramic vessel
  addLathe([[0.22, 0], [0.22, 0.32], [0.54, 0.34], [0.54, 0.39], [0, 0.39]], 24, -3.68, mainY + 0.46, 0.34, travertineMat);
  addLathe([[0.15, 0], [0.15, 0.40], [0.34, 0.42], [0.34, 0.46], [0, 0.46]], 20, -2.92, mainY + 0.46, 0.54, smokedOakMat);
  addLathe([[0.06, 0], [0.11, 0.12], [0.09, 0.24], [0.05, 0.30], [0.07, 0.33]], 16, -3.72, mainY + 0.85, 0.30, plasterMat);
  // Mitered oak-framed gallery-scale NZ abstract art canvases
  const addFramedArt = (w, h, x, y, z, artTex) => {
    addRBox(w + 0.10, h + 0.10, 0.055, 0.01, x, y, z, smokedOakMat, false, false);
    const canvasMesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: artTex, roughness: 0.62 }));
    canvasMesh.position.set(x, y, z + 0.032); house.add(canvasMesh);
  };
  addFramedArt(1.52, 1.16, -4.52, mainY + 2.08, -2.55, tex.art1);
  addFramedArt(1.40, 1.16, -2.62, mainY + 2.08, -2.55, tex.art2);

  // C. Architectural Reading Nook + Brass Arc Floor Lamp
  addRBox(0.96, 0.30, 0.94, 0.10, -0.35, mainY + 0.68, 0.56, boucleMat);
  addRBox(0.94, 0.48, 0.24, 0.09, -0.35, mainY + 1.02, 0.14, boucleMat);
  addBox(0.028, 1.48, 0.028, -1.25, mainY + 1.18, 0.44, brassMat, false, false);
  addLathe([[0.02, 0], [0.16, 0.02], [0.22, 0.24], [0.16, 0.30], [0, 0.30]], 20, -1.25, mainY + 1.78, 0.44, alabasterMat);

  // D. Designer Dining Pavilion (Chamfered Oak Table + Fluted Travertine Legs + 3 Spun-Brass Pendants)
  addRBox(2.65, 0.085, 1.12, 0.025, 3.35, mainY + 1.16, 0.22, oakMat);
  addLathe([[0.22, 0], [0.18, 0.36], [0.22, 0.72]], 18, 2.45, mainY + 0.44, 0.22, travertineMat);
  addLathe([[0.22, 0], [0.18, 0.36], [0.22, 0.72]], 18, 4.25, mainY + 0.44, 0.22, travertineMat);
  // 6 Wishbone-inspired dining chairs
  for (const cx of [2.55, 3.35, 4.15]) {
    for (const side of [-1, 1]) {
      const cz = 0.22 + side * 0.74;
      addRBox(0.46, 0.06, 0.44, 0.02, cx, mainY + 0.86, cz, boucleMat);
      addRBox(0.46, 0.34, 0.06, 0.025, cx, mainY + 1.06, cz + side * 0.20, smokedOakMat);
      addBox(0.035, 0.42, 0.035, cx - 0.18, mainY + 0.64, cz - 0.16, smokedOakMat);
      addBox(0.035, 0.42, 0.035, cx + 0.18, mainY + 0.64, cz + 0.16, smokedOakMat);
    }
  }
  // 3 Sculpted Spun-Brass & Alabaster Linear Dining Pendants
  for (const px of [2.55, 3.35, 4.15]) {
    addBox(0.012, 1.05, 0.012, px, mainY + 2.75, 0.22, brassMat, false, false);
    addLathe([[0.24, 0], [0.20, 0.08], [0.06, 0.18], [0.03, 0.22]], 22, px, mainY + 2.12, 0.22, brassMat);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 12), lampMat);
    bulb.position.set(px, mainY + 2.13, 0.22); house.add(bulb);
  }

  // E. Ground-Floor Master Suite + Alabaster Globe Bedside Lamps + Sheer Linen Curtains
  addRBox(2.20, 0.40, 2.28, 0.08, 7.65, mainY + 0.64, -0.35, boucleMat);
  addRBox(2.34, 0.72, 0.20, 0.07, 7.65, mainY + 1.14, -1.46, camelLeatherMat);
  addRBox(0.56, 0.44, 0.46, 0.03, 6.22, mainY + 0.66, -1.16, smokedOakMat);
  addRBox(0.56, 0.44, 0.46, 0.03, 8.98, mainY + 0.66, -1.16, smokedOakMat);
  for (const bx of [6.22, 8.98]) {
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 14), alabasterMat);
    globe.position.set(bx, mainY + 1.02, -1.16); house.add(globe);
  }
  // Sheer pleated linen drapes framing the glazed bays
  addSheerCurtain(1.15, mainH - 0.18, -8.35, mainY + 0.4 + mainH * 0.5, mainD * 0.5 - 0.34);
  addSheerCurtain(1.15, mainH - 0.18,  8.75, mainY + 0.4 + mainH * 0.5, mainD * 0.5 - 0.34);
  addSheerCurtain(0.95, mainH - 0.18,  5.05, mainY + 0.4 + mainH * 0.5, mainD * 0.5 - 0.34);

  // Recessed 2700K ceiling downlights & warm architectural interior wash
  for (const lx of [-6.9, -3.5, 0.0, 3.35, 7.6]) {
    const puck = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.03, 14), coveLedMat);
    puck.position.set(lx, mainY + mainH - 0.04, 0.35); house.add(puck);
    const pt = new THREE.PointLight(0xffbd6b, 15.0, 12.0, 1.5);
    pt.position.set(lx, mainY + mainH - 0.52, 0.48); house.add(pt);
    interiorLights.push({ light: pt, base: 15.0 });
  }

  // Full-height low-iron architectural glass sliders + slim matte-black thermally-broken mullions
  const frontZ = mainD * 0.5 - 0.06;
  const frontGlass = new THREE.Mesh(new THREE.PlaneGeometry(mainW - 0.3, mainH - 0.05), glassMat);
  frontGlass.position.set(0.2, mainY + 0.4 + mainH * 0.5, frontZ); house.add(frontGlass);
  addBox(mainW - 0.1, 0.085, 0.14, 0.2, mainY + 0.42, frontZ, mullionMat);
  addBox(mainW - 0.1, 0.085, 0.14, 0.2, mainY + mainH + 0.02, frontZ, mullionMat);
  for (const mx of [-8.82, -6.2, -3.85, -1.45, -1.15, 1.45, 1.75, 4.45, 5.45, 7.25, 9.22]) {
    addBox(0.072, mainH + 0.06, 0.16, mx, mainY + 0.4 + mainH * 0.5, frontZ, mullionMat);
  }
  addBox(0.38, mainH + 0.06, 0.36, 1.6, mainY + 0.4 + mainH * 0.5, frontZ - 0.06, charredMat);
  addBox(0.46, mainH + 0.06, 0.36, 5.42, mainY + 0.4 + mainH * 0.5, frontZ - 0.06, charredMat);

  // ── 4. UPPER CANTILEVERED MASTER SUITE (Dark Cedar Battens + Glazed Corners) ─
  const upY = mainY + mainH + 0.38, upX = -5.0, upW = 8.85, upH = 3.08, upD = 5.45;
  addRBox(upW + 0.44, 0.36, upD + 0.38, 0.02, upX, upY + upH + 0.16, 0.0, concreteMat);
  addBox(upW + 0.48, 0.04, 0.05, upX, upY + upH + 0.35, upD * 0.5 + 0.19, brassMat, false, false);
  addRBox(0.44, upH + 0.42, upD + 0.32, 0.02, upX - upW * 0.5 - 0.02, upY + upH * 0.5, 0.0, concreteMat);
  addRBox(0.44, upH + 0.42, upD + 0.32, 0.02, upX + upW * 0.5 + 0.02, upY + upH * 0.5, 0.0, concreteMat);
  addBox(upW, upH, 0.24, upX, upY + upH * 0.5, -upD * 0.5 + 0.14, plasterMat);
  addBox(0.24, upH, upD, upX + upW * 0.5 - 0.05, upY + upH * 0.5, 0.0, charredMat);
  addBox(upW - 0.2, 0.08, upD - 0.2, upX, upY + 0.04, 0.0, oakMat, false, true);
  addBox(upW - 0.8, 0.03, 0.05, upX, upY + upH - 0.04, -upD * 0.5 + 0.34, coveLedMat, false, false);

  // Sculptural central dark cedar batten screen
  addBox(3.15, upH, 0.32, upX - 0.15, upY + upH * 0.5, upD * 0.5 - 0.08, charredMat);
  for (let i = 0; i < 15; i++) {
    addBox(0.048, upH - 0.06, 0.065, upX - 1.66 + i * 0.215, upY + upH * 0.5, upD * 0.5 + 0.09, cedarMat, true, false);
  }
  // Upper bedroom suites + glowing dressing mirror + sheer curtains
  addRBox(1.92, 0.44, 2.04, 0.08, upX - 3.1, upY + 0.27, -0.35, boucleMat);
  addRBox(1.96, 0.62, 0.18, 0.06, upX - 3.1, upY + 0.72, -1.32, camelLeatherMat);
  addRBox(1.60, 0.42, 1.88, 0.08, upX + 3.25, upY + 0.26, -0.35, boucleMat);
  addBox(0.95, 2.35, 0.10, upX + 2.15, upY + 1.24, -1.42, makeLampMat('#ffcb7e', 1.5), false, false);
  addSheerCurtain(1.0, upH - 0.18, upX - 3.85, upY + upH * 0.5, upD * 0.5 - 0.30);

  const upFrontZ = upD * 0.5 - 0.06;
  const upGlass = new THREE.Mesh(new THREE.PlaneGeometry(upW - 0.3, upH - 0.06), glassMat);
  upGlass.position.set(upX, upY + upH * 0.5, upFrontZ); house.add(upGlass);
  for (const ux of [upX - 4.2, upX - 2.95, upX - 1.72, upX + 1.45, upX + 2.85, upX + 4.2]) {
    addBox(0.072, upH, 0.14, ux, upY + upH * 0.5, upFrontZ, mullionMat);
  }
  for (const ux of [upX - 3.0, upX + 2.75]) {
    const pt = new THREE.PointLight(0xffb862, 14.0, 10.0, 1.5);
    pt.position.set(ux, upY + upH - 0.52, 0.42); house.add(pt);
    interiorLights.push({ light: pt, base: 14.0 });
  }

  return { house, interiorLights, emissiveMats };
}

// ── MAIN SCENE BOOTSTRAP (Direct Homepage Mount or Standalone) ───────────────
export function mountWaihekeHero(hostEl = null) {
  let canvas = hostEl ? hostEl.querySelector('canvas') : document.getElementById('stage');
  let uiRoot = document;
  if (hostEl) {
    hostEl.innerHTML = '';
    hostEl.style.position = 'absolute';
    hostEl.style.inset = '0';
    hostEl.style.pointerEvents = 'auto';
    canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;cursor:grab;touch-action:none;';
    hostEl.appendChild(canvas);

    const hudWrap = document.createElement('div');
    hudWrap.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:4;font-family:"Instrument Sans",system-ui,sans-serif;';
    hudWrap.innerHTML = `
      <div style="position:absolute;top:18px;left:18px;display:inline-flex;align-items:center;gap:8px;padding:7px 13px;background:rgba(255,253,251,0.92);color:#240B21;font:500 12.5px/1.2 'Instrument Sans',system-ui,sans-serif;backdrop-filter:blur(10px);box-shadow:0 6px 22px rgba(18,9,16,0.22);">
        <span style="width:7px;height:7px;border-radius:50%;background:#D9BACB;display:inline-block;"></span>Architectural film / Waiheke · 3D
      </div>
      <div style="position:absolute;left:18px;right:18px;bottom:18px;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;">
        <button data-wh="replay" type="button" style="pointer-events:auto;padding:9px 14px;border:1px solid rgba(36,11,33,0.14);background:rgba(255,253,251,0.92);color:#240B21;font:500 13px/1.1 'Instrument Sans',system-ui,sans-serif;cursor:pointer;backdrop-filter:blur(10px);">Replay fly-through &#9655;</button>
        <div style="pointer-events:auto;display:inline-flex;gap:2px;padding:3px;background:rgba(255,253,251,0.9);border:1px solid rgba(36,11,33,0.14);backdrop-filter:blur(10px);">
          <button class="mood-btn" data-mood="twilight" aria-pressed="true" type="button" style="border:0;padding:6px 10px;font:500 11.5px/1 'IBM Plex Mono',monospace;cursor:pointer;background:#240B21;color:#FFFDFB;">Twilight</button>
          <button class="mood-btn" data-mood="golden" aria-pressed="false" type="button" style="border:0;padding:6px 10px;font:500 11.5px/1 'IBM Plex Mono',monospace;cursor:pointer;background:transparent;color:#654A4E;">Golden</button>
          <button class="mood-btn" data-mood="day" aria-pressed="false" type="button" style="border:0;padding:6px 10px;font:500 11.5px/1 'IBM Plex Mono',monospace;cursor:pointer;background:transparent;color:#654A4E;">Daylight</button>
          <button data-wh="glass" type="button" style="border:0;padding:6px 10px;font:500 11.5px/1 'IBM Plex Mono',monospace;cursor:pointer;background:transparent;color:#654A4E;">Glass: Clear</button>
          <button data-wh="still" type="button" title="Save PNG still" style="border:0;padding:6px 9px;font:500 12px/1 monospace;cursor:pointer;background:transparent;color:#240B21;">&#128247;</button>
        </div>
      </div>`;
    hostEl.appendChild(hudWrap);
    uiRoot = hudWrap;
  }
  if (!canvas) return null;

  const getSize = () => hostEl ? { w: Math.max(1, hostEl.clientWidth), h: Math.max(1, hostEl.clientHeight) } : { w: window.innerWidth, h: window.innerHeight };
  const sz0 = getSize();

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(computeAdaptiveDPR(sz0.w, sz0.h));
  renderer.setSize(sz0.w, sz0.h, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x523f4d, 0.0080);

  const camera = new THREE.PerspectiveCamera(35, sz0.w / sz0.h, 0.2, 400);
  const heroTarget = new THREE.Vector3(0.4, 1.95, 0.0), heroPos = new THREE.Vector3(-0.6, 2.35, 25.2);
  camera.position.copy(heroPos);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.06; controls.target.copy(heroTarget);
  controls.minDistance = 8.5; controls.maxDistance = 46; controls.maxPolarAngle = Math.PI * 0.495; controls.minPolarAngle = Math.PI * 0.14;

  // Post-Processing: RenderPass + GTAO Contact Shadows (desktop) + Selective HDR Bloom + AgX Output
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  let gtaoPass = null;
  const isTouch = matchMedia('(pointer: coarse)').matches;
  if (!isTouch) {
    try {
      gtaoPass = new GTAOPass(scene, camera, sz0.w, sz0.h);
      gtaoPass.output = GTAOPass.OUTPUT.Default;
      gtaoPass.updateGtaoMaterial({ radius: 0.48, distanceExponent: 1.8, thickness: 1.2, samples: 12 });
      gtaoPass.blendIntensity = 0.62;
      composer.addPass(gtaoPass);
    } catch (e) {
      gtaoPass = null;
    }
  }
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(sz0.w, sz0.h), 0.22, 0.58, 0.92);
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  const hemiLight = new THREE.HemisphereLight(0xd9a8b8, 0x3b2824, 0.72); scene.add(hemiLight);
  const sunLight = new THREE.DirectionalLight(0xf6ba92, 1.65); sunLight.position.set(16, 11, -24); sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048); sunLight.shadow.camera.near = 2; sunLight.shadow.camera.far = 80;
  sunLight.shadow.camera.left = -22; sunLight.shadow.camera.right = 22; sunLight.shadow.camera.top = 18; sunLight.shadow.camera.bottom = -14;
  sunLight.shadow.bias = -0.0004; sunLight.shadow.normalBias = 0.02;
  scene.add(sunLight);
  const frontFill = new THREE.DirectionalLight(0xc8a4b8, 0.50); frontFill.position.set(-10, 8, 22); scene.add(frontFill);

  const tex = buildEliteArchTextures(maxAniso);
  const sky = createWaihekeSky(); scene.add(sky.mesh);
  const ridges = buildDistantWaihekeRidges(); scene.add(ridges.group);

  // Rich coastal organic mulch & volcanic earth hillside (no bare flat terracotta!)
  const hillGeo = new THREE.PlaneGeometry(88, 70, 72, 56); hillGeo.rotateX(-Math.PI * 0.5);
  const hp = hillGeo.attributes.position;
  for (let i = 0; i < hp.count; i++) hp.setY(i, hillsideHeight(hp.getX(i), hp.getZ(i)));
  hillGeo.computeVertexNormals();
  const hillMesh = new THREE.Mesh(hillGeo, new THREE.MeshStandardMaterial({
    map: tex.mulchMap, normalMap: tex.mulchNorm, normalScale: new THREE.Vector2(1.1, 1.1),
    roughnessMap: tex.mulchRough, color: '#6b5544', roughness: 0.94
  }));
  hillMesh.receiveShadow = true; scene.add(hillMesh);

  const glassMat = createSharpArchitecturalGlass('clear');
  const waterMat = createSchlickWaterMaterial(tex.waterNorm);
  const { house, interiorLights, emissiveMats } = buildEliteWaihekeHouse(tex, glassMat, waterMat);
  scene.add(house);

  // Non-procedural photographic NZ botanical landscaping inspired by assembl. Garden Studio v9.2
  const { atlasUniforms, bollardLights, bollardGlowMat } = buildPhotographicNZGarden(scene, tex, maxAniso);

  const envCache = {};
  const MOODS = {
    twilight: { zenith: '#271c29', mid: '#8e6a77', horizon: '#ebb691', cloudDark: '#47323f', cloudLit: '#f7cca9', fog: 0x523f4d, fogDensity: 0.0078, exposure: 1.08, envInt: 0.58, sunCol: 0xf6ba92, sunInt: 1.55, sunPos: [16, 10, -24], hemiSky: 0xd9a8b8, hemiGnd: 0x3b2824, hemiInt: 0.68, frontInt: 0.48, interiorMult: 1.0, bloom: 0.22, dotsVis: true, ridges: ['#39323a', '#534452', '#705868'], waterSky: '#9c7a88', ledGlow: 0.65 },
    golden:   { zenith: '#3a5678', mid: '#c48d7a', horizon: '#ffd29d', cloudDark: '#7b5c58', cloudLit: '#ffe1b8', fog: 0x9b7e76, fogDensity: 0.0058, exposure: 1.12, envInt: 0.78, sunCol: 0xffcf94, sunInt: 2.60, sunPos: [24, 14, 18], hemiSky: 0xffe4c8, hemiGnd: 0x5a4438, hemiInt: 0.82, frontInt: 0.42, interiorMult: 0.56, bloom: 0.14, dotsVis: false, ridges: ['#494a44', '#6b645e', '#94837c'], waterSky: '#d9a88c', ledGlow: 0.30 },
    day:      { zenith: '#487db0', mid: '#9ec4df', horizon: '#e4eef5', cloudDark: '#b8c8d4', cloudLit: '#ffffff', fog: 0xcbdbe6, fogDensity: 0.0044, exposure: 1.14, envInt: 0.86, sunCol: 0xfff8ec, sunInt: 2.90, sunPos: [18, 28, 22], hemiSky: 0xdff0ff, hemiGnd: 0x6b6052, hemiInt: 0.92, frontInt: 0.45, interiorMult: 0.24, bloom: 0.06, dotsVis: false, ridges: ['#586b5c', '#7c8f88', '#a3b5b5'], waterSky: '#a8cbe2', ledGlow: 0.10 }
  };
  function getEnvRT(key) {
    if (!envCache[key]) envCache[key] = buildProceduralHDRIBL(renderer, key);
    return envCache[key];
  }
  let activeMoodKey = 'twilight', moodTrans = null;
  const _cA = new THREE.Color(), _cB = new THREE.Color(), _vS = new THREE.Vector3();
  function applyMoodState(a, b, k) {
    const L = (x, y) => x + (y - x) * k;
    const LC = (t, c1, c2) => { _cA.set(c1); _cB.set(c2); t.copy(_cA).lerp(_cB, k); };
    LC(sky.mat.uniforms.uZenith.value, a.zenith, b.zenith);
    LC(sky.mat.uniforms.uMid.value, a.mid, b.mid);
    LC(sky.mat.uniforms.uHorizon.value, a.horizon, b.horizon);
    LC(sky.mat.uniforms.uCloudDark.value, a.cloudDark, b.cloudDark);
    LC(sky.mat.uniforms.uCloudLit.value, a.cloudLit, b.cloudLit);
    LC(scene.fog.color, a.fog, b.fog);
    scene.fog.density = L(a.fogDensity, b.fogDensity);
    renderer.toneMappingExposure = L(a.exposure, b.exposure);
    scene.environmentIntensity = L(a.envInt, b.envInt);
    LC(sunLight.color, a.sunCol, b.sunCol);
    sunLight.intensity = L(a.sunInt, b.sunInt);
    sunLight.position.set(L(a.sunPos[0], b.sunPos[0]), L(a.sunPos[1], b.sunPos[1]), L(a.sunPos[2], b.sunPos[2]));
    LC(hemiLight.color, a.hemiSky, b.hemiSky);
    LC(hemiLight.groundColor, a.hemiGnd, b.hemiGnd);
    hemiLight.intensity = L(a.hemiInt, b.hemiInt);
    frontFill.intensity = L(a.frontInt, b.frontInt);
    bloomPass.strength = L(a.bloom, b.bloom);
    ridges.dots.visible = k < 0.5 ? a.dotsVis : b.dotsVis;
    ridges.ridgeMats.forEach((rm, i) => LC(rm.color, a.ridges[i], b.ridges[i]));
    _vS.copy(sunLight.position).normalize();
    waterMat.uniforms.uSunDir.value.copy(_vS);
    LC(waterMat.uniforms.uSunCol.value, a.sunCol, b.sunCol);
    LC(waterMat.uniforms.uSkyCol.value, a.waterSky, b.waterSky);
    waterMat.uniforms.uLedGlow.value = L(a.ledGlow, b.ledGlow);
    atlasUniforms.uSunDir.value.copy(_vS);
    const intMult = L(a.interiorMult, b.interiorMult);
    interiorLights.forEach(({ light, base }) => { light.intensity = base * intMult; });
    bollardLights.forEach(({ light, base }) => { light.intensity = base * intMult; });
    bollardGlowMat.emissiveIntensity = 3.4 * Math.max(0.22, intMult);
    emissiveMats.forEach(({ mat, base }) => { mat.emissiveIntensity = base * Math.max(0.22, intMult); });
  }
  function applyMood(key, instant = false) {
    const target = MOODS[key] || MOODS.twilight;
    const prev = MOODS[activeMoodKey] || MOODS.twilight;
    activeMoodKey = key;
    scene.environment = getEnvRT(key).texture;
    uiRoot.querySelectorAll('.mood-btn[data-mood]').forEach(b => {
      const on = b.dataset.mood === key; b.setAttribute('aria-pressed', String(on));
      if (hostEl) { b.style.background = on ? '#240B21' : 'transparent'; b.style.color = on ? '#FFFDFB' : '#654A4E'; }
    });
    if (instant || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      moodTrans = null; applyMoodState(target, target, 1.0);
    } else {
      moodTrans = { from: prev, to: target, t: 0, dur: 1.15 };
    }
  }
  applyMood('twilight', true);
  uiRoot.querySelectorAll('.mood-btn[data-mood]').forEach(btn => btn.addEventListener('click', () => applyMood(btn.dataset.mood, false)));

  const coatingKeys = Object.keys(GLASS_COATINGS); let coatingIdx = 0;
  const glassBtn = uiRoot.querySelector('[data-wh="glass"]') || document.getElementById('btn-glass');
  if (glassBtn) glassBtn.addEventListener('click', () => {
    coatingIdx = (coatingIdx + 1) % coatingKeys.length;
    const spec = GLASS_COATINGS[coatingKeys[coatingIdx]];
    glassMat.color.set(spec.color); glassMat.attenuationColor.set(spec.atten); glassMat.attenuationDistance = spec.attenDist;
    glassBtn.textContent = `Glass: ${spec.name}`;
  });

  const flyCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(-15.5, 1.4, 21.0), new THREE.Vector3(-7.2, 2.2, 23.5), new THREE.Vector3(6.8, 3.0, 22.8), heroPos.clone()]);
  const targetCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(-4.2, 2.6, 0.0), new THREE.Vector3(-1.5, 2.1, 0.0), new THREE.Vector3(3.2, 1.8, 0.0), heroTarget.clone()]);
  let flyT = 1.0; const flyDuration = 13.5, reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const startFlyThrough = () => { if (reducedMotion) { camera.position.copy(heroPos); controls.target.copy(heroTarget); controls.update(); return; } flyT = 0.0; };
  (uiRoot.querySelector('[data-wh="replay"]') || document.getElementById('btn-replay'))?.addEventListener('click', startFlyThrough);
  canvas.addEventListener('pointerdown', () => { flyT = 1.0; }); canvas.addEventListener('wheel', () => { flyT = 1.0; }, { passive: true });
  (uiRoot.querySelector('[data-wh="still"]') || document.getElementById('btn-still'))?.addEventListener('click', () => {
    composer.render(); const a = document.createElement('a'); a.download = `assembl-waiheke-3d-${new Date().toISOString().slice(0, 10)}.png`; a.href = canvas.toDataURL('image/png'); a.click();
  });

  const onResize = () => {
    const s = getSize(); camera.aspect = s.w / s.h; camera.updateProjectionMatrix();
    renderer.setPixelRatio(computeAdaptiveDPR(s.w, s.h)); renderer.setSize(s.w, s.h, false);
    composer.setSize(s.w, s.h);
    if (gtaoPass) gtaoPass.setSize(s.w, s.h);
  };
  window.addEventListener('resize', onResize);

  let raf = 0, alive = true, last = performance.now();
  function animate(now) {
    if (!alive) return;
    raf = requestAnimationFrame(animate);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    sky.mat.uniforms.uTime.value += dt;
    waterMat.uniforms.uTime.value += dt;
    atlasUniforms.uTime.value += dt;
    if (moodTrans) {
      moodTrans.t = Math.min(1.0, moodTrans.t + dt / moodTrans.dur);
      const k = moodTrans.t < 0.5 ? 4 * moodTrans.t * moodTrans.t * moodTrans.t : 1 - Math.pow(-2 * moodTrans.t + 2, 3) / 2;
      applyMoodState(moodTrans.from, moodTrans.to, k);
      if (moodTrans.t >= 1.0) moodTrans = null;
    }
    if (flyT < 1.0) {
      flyT = Math.min(1.0, flyT + dt / flyDuration);
      const ease = flyT < 0.5 ? 2 * flyT * flyT : 1 - Math.pow(-2 * flyT + 2, 2) / 2;
      camera.position.copy(flyCurve.getPoint(ease)); controls.target.copy(targetCurve.getPoint(ease));
    }
    controls.update(); composer.render();
  }
  raf = requestAnimationFrame(animate);

  const api = {
    applyMood, startFlyThrough,
    dispose: () => { alive = false; cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); controls.dispose(); Object.values(envCache).forEach(rt => rt?.dispose()); renderer.dispose(); if (hostEl) hostEl.innerHTML = ''; }
  };
  window.__waihekeHero = api;
  return api;
}

if (document.getElementById('stage')) mountWaihekeHero(null);
