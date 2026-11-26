import * as THREE from '/assets/vendor/three/three.module.min.js';
import { OrbitControls } from '/assets/vendor/three/addons/controls/OrbitControls.js';
import { EffectComposer } from '/assets/vendor/three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '/assets/vendor/three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '/assets/vendor/three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '/assets/vendor/three/addons/postprocessing/OutputPass.js';

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // 137.507764° phyllotaxis

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

// ── PROCEDURAL 256×128 Float32Array HDR IBL (te-weteriana-walkthrough pattern) ─
function buildProceduralHDRIBL(renderer, mood = 'twilight') {
  const W = 256, H = 128;
  const data = new Float32Array(W * H * 4);
  const palettes = {
    twilight: {
      zenith: [0.16, 0.10, 0.18], horizon: [1.35, 0.78, 0.62], ground: [0.14, 0.09, 0.08],
      keyCol: [2.8, 1.55, 0.95], keyDir: new THREE.Vector3(0.32, 0.18, -0.93).normalize(),
      apertureCol: [2.2, 1.35, 0.65]
    },
    golden: {
      zenith: [0.35, 0.54, 0.85], horizon: [1.85, 1.18, 0.72], ground: [0.24, 0.17, 0.13],
      keyCol: [4.2, 2.75, 1.55], keyDir: new THREE.Vector3(0.55, 0.34, 0.76).normalize(),
      apertureCol: [1.3, 0.88, 0.45]
    },
    day: {
      zenith: [0.46, 0.78, 1.25], horizon: [1.55, 1.62, 1.70], ground: [0.32, 0.29, 0.24],
      keyCol: [4.8, 4.5, 4.1], keyDir: new THREE.Vector3(0.45, 0.72, 0.53).normalize(),
      apertureCol: [0.85, 0.78, 0.68]
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
        const t = Math.pow(dir.y, 0.55);
        r = p.horizon[0] * (1 - t) + p.zenith[0] * t;
        g = p.horizon[1] * (1 - t) + p.zenith[1] * t;
        b = p.horizon[2] * (1 - t) + p.zenith[2] * t;
      } else {
        const t = Math.min(1, -dir.y * 2.2);
        r = p.horizon[0] * 0.45 * (1 - t) + p.ground[0] * t;
        g = p.horizon[1] * 0.45 * (1 - t) + p.ground[1] * t;
        b = p.horizon[2] * 0.45 * (1 - t) + p.ground[2] * t;
      }
      const sunDot = Math.max(0, dir.dot(p.keyDir));
      const lobe = Math.pow(sunDot, 22) * 0.85 + Math.pow(sunDot, 3) * 0.14;
      r += p.keyCol[0] * lobe; g += p.keyCol[1] * lobe; b += p.keyCol[2] * lobe;
      const ap = Math.max(0, dir.z) * Math.max(0, 1 - Math.abs(dir.y) * 2.4);
      const mullion = (Math.sin(theta * 14) > -0.78) ? 1.0 : 0.25;
      r += p.apertureCol[0] * ap * ap * 0.42 * mullion;
      g += p.apertureCol[1] * ap * ap * 0.42 * mullion;
      b += p.apertureCol[2] * ap * ap * 0.42 * mullion;
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

// ── RAZOR-SHARP ARCHITECTURAL GLASS (5 Coatings + textureLod 0.0 Patch) ──────
const GLASS_COATINGS = {
  clear:  { name: 'Clear',  color: '#f4f8fa', atten: '#eef6fa', attenDist: 14.0 },
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
    thickness: 0.010,
    metalness: 0.0,
    attenuationColor: new THREE.Color(c.atten),
    attenuationDistance: c.attenDist,
    envMapIntensity: 1.15,
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
  mat.customProgramCacheKey = () => 'assembl-sharp-glass-lod0';
  return mat;
}

// ── 28-WAVE TILEABLE NORMAL MAP + 3-OCTAVE SCHLICK FRESNEL WATER ─────────────
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
      uSunDir: { value: new THREE.Vector3(0.32, 0.18, -0.93).normalize() },
      uSunCol: { value: new THREE.Color('#f6ba92') }, uSkyCol: { value: new THREE.Color('#9c7a88') },
      uDeepCol: { value: new THREE.Color('#132c36') }, uShallowCol: { value: new THREE.Color('#2d6b76') }
    },
    vertexShader: `varying vec3 vWorld; varying vec2 vUv; void main(){ vUv=uv; vec4 wp=modelMatrix*vec4(position,1.0); vWorld=wp.xyz; gl_Position=projectionMatrix*viewMatrix*wp; }`,
    fragmentShader: `
      varying vec3 vWorld; varying vec2 vUv;
      uniform float uTime; uniform sampler2D uNorm;
      uniform vec3 uSunDir, uSunCol, uSkyCol, uDeepCol, uShallowCol;
      mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
      void main(){
        vec2 p = vWorld.xz;
        vec2 uv1 = rot(0.42)*(p*0.327) + vec2(uTime*0.035, uTime*0.022);
        vec2 uv2 = rot(-0.78)*(p*0.616) + vec2(-uTime*0.048, uTime*0.031);
        vec2 uv3 = rot(1.15)*(p*1.181) + vec2(uTime*0.024, -uTime*0.042);
        vec3 n1=texture2D(uNorm,uv1).xyz*2.0-1.0, n2=texture2D(uNorm,uv2).xyz*2.0-1.0, n3=texture2D(uNorm,uv3).xyz*2.0-1.0;
        vec3 n = normalize(vec3((n1.x+n2.x*0.6+n3.x*0.35)*0.42, 1.0, (n1.y+n2.y*0.6+n3.y*0.35)*0.42));
        vec3 V = normalize(cameraPosition - vWorld);
        float fresnel = 0.020 + 0.98 * pow(1.0 - clamp(dot(n, V), 0.0, 1.0), 5.0);
        float spec = pow(max(0.0, dot(reflect(-V, n), normalize(uSunDir))), 140.0);
        vec3 col = mix(mix(uShallowCol, uDeepCol, clamp(vUv.x*0.7+0.2, 0.0, 1.0)), uSkyCol, clamp(fresnel*1.15, 0.0, 0.92));
        gl_FragColor = vec4(col + uSunCol * spec * 1.65, 0.92);
      }`
  });
}

function makeNormalFromCanvas(srcCanvas, strength = 2.2) {
  const w = srcCanvas.width, h = srcCanvas.height;
  const src = srcCanvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  const outC = document.createElement('canvas'); outC.width = w; outC.height = h;
  const octx = outC.getContext('2d'), out = octx.createImageData(w, h);
  const lum = (x, y) => { const i = (((y + h) % h) * w + ((x + w) % w)) * 4; return (src[i] * 0.299 + src[i + 1] * 0.587 + src[i + 2] * 0.114) / 255; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (lum(x + 1, y) - lum(x - 1, y)) * strength, dy = (lum(x, y + 1) - lum(x, y - 1)) * strength;
    const inv = 1 / Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
    out.data[i] = Math.round((-dx * inv * 0.5 + 0.5) * 255); out.data[i + 1] = Math.round((-dy * inv * 0.5 + 0.5) * 255);
    out.data[i + 2] = Math.round((inv * 0.5 + 0.5) * 255); out.data[i + 3] = 255;
  }
  octx.putImageData(out, 0, 0);
  const tex = new THREE.CanvasTexture(outC); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = 4; return tex;
}

function buildArchTextures() {
  const rng = makeRng(4201);
  const cConc = document.createElement('canvas'); cConc.width = cConc.height = 512;
  const ctxC = cConc.getContext('2d'); ctxC.fillStyle = '#aba29b'; ctxC.fillRect(0, 0, 512, 512);
  const boards = 14, bh = 512 / boards;
  for (let i = 0; i < boards; i++) {
    const v = 166 + Math.floor((rng() - 0.5) * 24);
    ctxC.fillStyle = `rgb(${v + 4},${v - 2},${v - 8})`; ctxC.fillRect(0, i * bh, 512, bh - 1.5);
    ctxC.fillStyle = 'rgba(46,38,34,0.34)'; ctxC.fillRect(0, i * bh + bh - 1.5, 512, 1.5);
    if (i % 3 === 1) for (const hx of [128, 384]) { ctxC.fillStyle = 'rgba(38,32,28,0.52)'; ctxC.beginPath(); ctxC.arc(hx, i * bh + bh * 0.5, 4.5, 0, Math.PI * 2); ctxC.fill(); }
  }
  for (let i = 0; i < 4200; i++) { const g = 130 + Math.floor(rng() * 72); ctxC.fillStyle = `rgba(${g},${g - 4},${g - 8},0.16)`; ctxC.fillRect(rng() * 512, rng() * 512, 2, 2); }
  const concreteMap = new THREE.CanvasTexture(cConc); concreteMap.colorSpace = THREE.SRGBColorSpace; concreteMap.wrapS = concreteMap.wrapT = THREE.RepeatWrapping; concreteMap.anisotropy = 8;
  const concreteNorm = makeNormalFromCanvas(cConc, 2.4);

  const cCed = document.createElement('canvas'); cCed.width = cCed.height = 512;
  const ctxW = cCed.getContext('2d'); ctxW.fillStyle = '#241c19'; ctxW.fillRect(0, 0, 512, 512);
  const slats = 26, sw = 512 / slats;
  for (let i = 0; i < slats; i++) {
    const v = 34 + Math.floor(rng() * 18);
    ctxW.fillStyle = `rgb(${v + 12},${v + 4},${v})`; ctxW.fillRect(i * sw + 1.5, 0, sw - 3, 512);
    ctxW.fillStyle = 'rgba(8,5,5,0.75)'; ctxW.fillRect(i * sw, 0, 2, 512);
  }
  const cedarMap = new THREE.CanvasTexture(cCed); cedarMap.colorSpace = THREE.SRGBColorSpace; cedarMap.wrapS = cedarMap.wrapT = THREE.RepeatWrapping; cedarMap.anisotropy = 8;
  const cedarNorm = makeNormalFromCanvas(cCed, 2.8);

  const cOak = document.createElement('canvas'); cOak.width = cOak.height = 512;
  const ctxO = cOak.getContext('2d'); ctxO.fillStyle = '#c89b6a'; ctxO.fillRect(0, 0, 512, 512);
  const planks = 12, ph = 512 / planks;
  for (let i = 0; i < planks; i++) {
    const v = Math.floor((rng() - 0.5) * 26);
    ctxO.fillStyle = `rgb(${198 + v},${150 + Math.floor(v * 0.7)},${98 + Math.floor(v * 0.5)})`; ctxO.fillRect(0, i * ph + 1, 512, ph - 2);
    ctxO.fillStyle = 'rgba(86,56,30,0.3)'; ctxO.fillRect(0, i * ph, 512, 1.5);
  }
  const oakMap = new THREE.CanvasTexture(cOak); oakMap.colorSpace = THREE.SRGBColorSpace; oakMap.wrapS = oakMap.wrapT = THREE.RepeatWrapping; oakMap.repeat.set(3, 2);

  const cLeaf = document.createElement('canvas'); cLeaf.width = cLeaf.height = 512;
  const ctxL = cLeaf.getContext('2d'); ctxL.clearRect(0, 0, 512, 512);
  ctxL.strokeStyle = '#332820'; ctxL.lineCap = 'round'; ctxL.lineWidth = 5;
  ctxL.beginPath(); ctxL.moveTo(256, 470); ctxL.quadraticCurveTo(252, 300, 260, 88); ctxL.stroke();
  const leafPalette = ['#2d3b27', '#38482f', '#24311f', '#425236', '#303f2b', '#4b5a3c'];
  for (let i = 0; i < 290; i++) {
    const t = (i + 3) / 294, cy = 448 - t * 380, spread = (0.28 + 0.72 * Math.sin(t * Math.PI) ** 0.6) * 208, side = i % 2 === 0 ? 1 : -1;
    const lx = 256 + side * spread * (0.12 + 0.88 * rng()), ly = cy + (rng() - 0.5) * 34;
    const len = 11 + rng() * 17, wid = len * (0.36 + rng() * 0.22);
    ctxL.save(); ctxL.translate(lx, ly); ctxL.rotate(side * (-0.7 + rng() * 1.4));
    ctxL.fillStyle = leafPalette[Math.floor(rng() * leafPalette.length)];
    ctxL.beginPath(); ctxL.moveTo(0, -len); ctxL.bezierCurveTo(wid, -len * 0.45, wid, len * 0.4, 0, len); ctxL.bezierCurveTo(-wid, len * 0.4, -wid, -len * 0.45, 0, -len); ctxL.fill(); ctxL.restore();
  }
  const leafSprayTex = new THREE.CanvasTexture(cLeaf); leafSprayTex.colorSpace = THREE.SRGBColorSpace; leafSprayTex.anisotropy = 4;

  const cSoil = document.createElement('canvas'); cSoil.width = cSoil.height = 512;
  const ctxS = cSoil.getContext('2d'); ctxS.fillStyle = '#5a3a2d'; ctxS.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 12000; i++) {
    ctxS.fillStyle = `rgba(${68 + Math.floor(rng() * 52)},${42 + Math.floor(rng() * 34)},${32 + Math.floor(rng() * 24)},0.42)`;
    ctxS.fillRect(rng() * 512, rng() * 512, 2 + rng() * 4, 2 + rng() * 3);
  }
  const soilMap = new THREE.CanvasTexture(cSoil); soilMap.colorSpace = THREE.SRGBColorSpace; soilMap.wrapS = soilMap.wrapT = THREE.RepeatWrapping; soilMap.repeat.set(9, 9);
  const soilNorm = makeNormalFromCanvas(cSoil, 2.5);
  return { concreteMap, concreteNorm, cedarMap, cedarNorm, oakMap, leafSprayTex, soilMap, soilNorm, waterNorm: build28WaveWaterNormals(256) };
}

function hillsideHeight(x, z) {
  return -2.25 + Math.max(0, (-x - 1.2) * 0.23) + Math.max(0, (-z - 3.5) * 0.14) + Math.min(0, (z - 2.0) * -0.18) + (Math.sin(x * 0.22 + 0.4) * 0.32 + Math.cos(z * 0.26 - 0.5) * 0.28) * 0.55;
}

// ── BESPOKE GOLDEN-ANGLE PHYLLOTAXIS 3D NZ NATIVE SPECIES (ALL 5 ICONS) ──────
function makeCurvedBladeGeometry(length, baseWidth, archDrop, segs = 7) {
  const pos = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, w = baseWidth * (1 - t * t) * Math.sin(Math.min(1, t * 4.5) * Math.PI * 0.5 + 0.25);
    const y = Math.sin(t * Math.PI * 0.62) * length - archDrop * t * t, z = t * length * 0.65 + archDrop * t * 0.35;
    pos.push(-w, y, z, 0, y + w * 0.18, z, w, y, z);
  }
  for (let i = 0; i < segs; i++) { const b = i * 3; idx.push(b, b + 1, b + 3, b + 1, b + 4, b + 3, b + 1, b + 2, b + 4, b + 2, b + 5, b + 4); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals(); return geo;
}

function buildNikauPalm(scale = 1.0) {
  const g = new THREE.Group(), trunkH = 3.2 * scale;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.11 * scale, 0.15 * scale, trunkH, 12), new THREE.MeshStandardMaterial({ color: '#6b655c', roughness: 0.92 }));
  trunk.position.y = trunkH * 0.5; trunk.castShadow = true; g.add(trunk);
  const ringMat = new THREE.MeshStandardMaterial({ color: '#4c4740', roughness: 0.95 });
  for (let r = 0.35; r < trunkH - 0.15; r += 0.24 * scale) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.125 * scale, 0.014 * scale, 6, 12), ringMat);
    ring.rotation.x = Math.PI * 0.5; ring.position.y = r; g.add(ring);
  }
  const shaft = new THREE.Mesh(new THREE.SphereGeometry(0.19 * scale, 12, 10), new THREE.MeshStandardMaterial({ color: '#4d6636', roughness: 0.45 }));
  shaft.scale.set(1, 2.3, 1); shaft.position.y = trunkH + 0.34 * scale; g.add(shaft);
  const coralMat = new THREE.MeshStandardMaterial({ color: '#d97a7e', roughness: 0.55 });
  for (let b = 0; b < 7; b++) {
    const a = (b / 7) * Math.PI * 2;
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.055 * scale, 7, 7), coralMat);
    bead.position.set(Math.cos(a) * 0.19 * scale, trunkH - 0.04 * scale, Math.sin(a) * 0.19 * scale); g.add(bead);
  }
  const rachisGeo = makeCurvedBladeGeometry(2.1 * scale, 0.24 * scale, 0.45 * scale, 7);
  const frondMat = new THREE.MeshStandardMaterial({ color: '#39542b', roughness: 0.58, side: THREE.DoubleSide });
  for (let f = 0; f < 13; f++) {
    const frond = new THREE.Mesh(rachisGeo, frondMat);
    frond.position.y = trunkH + 0.65 * scale; frond.rotation.set(-(0.22 + (f % 3) * 0.14), f * GOLDEN_ANGLE, 0); frond.castShadow = true; g.add(frond);
  }
  return g;
}

function buildHarakeke(scale = 1.0) {
  const g = new THREE.Group(), bladeGeo = makeCurvedBladeGeometry(1.45 * scale, 0.068 * scale, 0.38 * scale, 6);
  const leafMat = new THREE.MeshStandardMaterial({ color: '#3b5431', roughness: 0.56, side: THREE.DoubleSide });
  for (let i = 0; i < 18; i++) { const m = new THREE.Mesh(bladeGeo, leafMat); m.rotation.set(-0.18 - (i / 18) * 0.42, i * GOLDEN_ANGLE, 0); m.scale.setScalar(0.82 + (i % 4) * 0.1); g.add(m); }
  const korariMat = new THREE.MeshStandardMaterial({ color: '#3d2220', roughness: 0.72 }), podMat = new THREE.MeshStandardMaterial({ color: '#768f3c', roughness: 0.6 });
  for (let k = 0; k < 2; k++) {
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.014 * scale, 0.022 * scale, 2.1 * scale, 6), korariMat);
    stalk.position.set((k - 0.5) * 0.14 * scale, 1.0 * scale, (k - 0.5) * 0.1 * scale); stalk.rotation.z = (k - 0.5) * 0.14; g.add(stalk);
    for (let p = 0; p < 5; p++) {
      const pod = new THREE.Mesh(new THREE.CapsuleGeometry(0.018 * scale, 0.08 * scale, 4, 6), podMat);
      pod.position.set(stalk.position.x + Math.cos(p * 2.1) * 0.09 * scale, (1.55 + p * 0.11) * scale, Math.sin(p * 2.1) * 0.09 * scale); pod.rotation.z = 0.5; g.add(pod);
    }
  }
  return g;
}

function buildRengarenga(scale = 1.0) {
  const g = new THREE.Group(), strapGeo = makeCurvedBladeGeometry(0.68 * scale, 0.095 * scale, 0.28 * scale, 6);
  const leafMat = new THREE.MeshStandardMaterial({ color: '#4d6b44', roughness: 0.52, side: THREE.DoubleSide });
  for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(strapGeo, leafMat); m.rotation.set(-0.28 - (i / 12) * 0.35, i * GOLDEN_ANGLE, 0); g.add(m); }
  const starMat = new THREE.MeshStandardMaterial({ color: '#f8f5ee', roughness: 0.65 }), budMat = new THREE.MeshStandardMaterial({ color: '#e2b5c2', roughness: 0.62 });
  for (let s = 0; s < 3; s++) for (let f = 0; f < 5; f++) {
    const fl = new THREE.Mesh(new THREE.OctahedronGeometry(0.028 * scale, 0), f === 4 ? budMat : starMat);
    fl.position.set(Math.cos(s * 2.1 + f * 0.6) * 0.18 * scale, (0.48 + f * 0.07) * scale, Math.sin(s * 2.1 + f * 0.6) * 0.18 * scale); g.add(fl);
  }
  return g;
}

function buildOioi(scale = 1.0) {
  const g = new THREE.Group(), culmGeo = new THREE.CylinderGeometry(0.006 * scale, 0.009 * scale, 0.95 * scale, 5);
  const culmMat = new THREE.MeshStandardMaterial({ color: '#5c7361', roughness: 0.78 }), tipMat = new THREE.MeshStandardMaterial({ color: '#9c6848', roughness: 0.82 }), nodeMat = new THREE.MeshStandardMaterial({ color: '#33241d', roughness: 0.9 });
  for (let i = 0; i < 18; i++) {
    const a = i * GOLDEN_ANGLE, rad = 0.04 + (i / 18) * 0.18 * scale;
    const c = new THREE.Mesh(culmGeo, i % 3 === 0 ? tipMat : culmMat);
    c.position.set(Math.cos(a) * rad, 0.45 * scale, Math.sin(a) * rad); c.rotation.set(Math.sin(a) * 0.22, 0, -Math.cos(a) * 0.22); g.add(c);
    if (i % 3 === 0) { const band = new THREE.Mesh(new THREE.TorusGeometry(0.009 * scale, 0.003 * scale, 4, 6), nodeMat); band.rotation.x = Math.PI * 0.5; band.position.set(c.position.x, 0.52 * scale, c.position.z); g.add(band); }
  }
  return g;
}

function buildTiKouka(scale = 1.0) {
  const g = new THREE.Group(), h = 2.6 * scale, barkMat = new THREE.MeshStandardMaterial({ color: '#5e5347', roughness: 0.96 }), swordMat = new THREE.MeshStandardMaterial({ color: '#6b7e3c', roughness: 0.58, side: THREE.DoubleSide });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * scale, 0.13 * scale, h, 9), barkMat); trunk.position.y = h * 0.5; trunk.castShadow = true; g.add(trunk);
  const swordGeo = makeCurvedBladeGeometry(0.88 * scale, 0.042 * scale, 0.18 * scale, 5);
  for (let head = 0; head < 2; head++) {
    const hx = head === 0 ? -0.22 * scale : 0.24 * scale, hy = h + (head === 0 ? 0.18 : 0.06) * scale;
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.045 * scale, 0.065 * scale, 0.5 * scale, 7), barkMat);
    branch.position.set(hx * 0.5, h - 0.05 * scale, 0); branch.rotation.z = head === 0 ? 0.45 : -0.45; g.add(branch);
    for (let i = 0; i < 18; i++) { const m = new THREE.Mesh(swordGeo, swordMat); m.position.set(hx, hy, 0); m.rotation.set(-0.65 + (i / 18) * 1.1, i * GOLDEN_ANGLE, 0); g.add(m); }
  }
  return g;
}

function createWaihekeSky() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      uTime: { value: 0 }, uZenith: { value: new THREE.Color('#2d1f2d') }, uMid: { value: new THREE.Color('#8e6a77') },
      uHorizon: { value: new THREE.Color('#e8b28d') }, uCloudDark: { value: new THREE.Color('#4a3441') }, uCloudLit: { value: new THREE.Color('#f4c8a6') },
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
        float sunAmt=max(0.0,dot(d,uSunDir)); sky+=uCloudLit*pow(sunAmt,6.0)*0.28;
        if(d.y>0.01){
          vec2 cuv=d.xz/(d.y+0.26)*0.92+vec2(uTime*0.0045,-uTime*0.002);
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

function buildWaihekeHouse(tex, glassMat, waterMat) {
  const house = new THREE.Group(), interiorLights = [], emissiveMats = [];
  const concreteMat = new THREE.MeshStandardMaterial({ map: tex.concreteMap, normalMap: tex.concreteNorm, normalScale: new THREE.Vector2(0.85, 0.85), color: '#c2b9b2', roughness: 0.84, metalness: 0.03 });
  const concreteDarkMat = new THREE.MeshStandardMaterial({ map: tex.concreteMap, normalMap: tex.concreteNorm, normalScale: new THREE.Vector2(0.95, 0.95), color: '#9b918a', roughness: 0.88, metalness: 0.03 });
  const cedarMat = new THREE.MeshStandardMaterial({ map: tex.cedarMap, normalMap: tex.cedarNorm, normalScale: new THREE.Vector2(1.0, 1.0), color: '#342a26', roughness: 0.76, metalness: 0.04 });
  const mullionMat = new THREE.MeshStandardMaterial({ color: '#171618', roughness: 0.34, metalness: 0.65 });
  const roofMat = new THREE.MeshStandardMaterial({ color: '#2c2c30', roughness: 0.44, metalness: 0.52 });
  const plasterMat = new THREE.MeshStandardMaterial({ color: '#f2e6d6', roughness: 0.88, metalness: 0.01 });
  const oakMat = new THREE.MeshStandardMaterial({ map: tex.oakMap, color: '#e2bd90', roughness: 0.46, metalness: 0.04 });
  const linenMat = new THREE.MeshStandardMaterial({ color: '#ece3d8', roughness: 0.92 });
  const warmFabricMat = new THREE.MeshStandardMaterial({ color: '#d7c3b0', roughness: 0.9 });
  const darkCabinetMat = new THREE.MeshStandardMaterial({ color: '#2b2523', roughness: 0.55 });
  const woodFurnMat = new THREE.MeshStandardMaterial({ color: '#a8784e', roughness: 0.52 });

  const makeLampMat = (hex = '#ffcf88', intensity = 3.2) => {
    const m = new THREE.MeshStandardMaterial({ color: '#fff4df', emissive: new THREE.Color(hex), emissiveIntensity: intensity, roughness: 0.25 });
    emissiveMats.push({ mat: m, base: intensity }); return m;
  };
  const lampMat = makeLampMat('#ffc878', 3.4), ceilingGlowMat = makeLampMat('#ffd99d', 2.4);
  const addBox = (w, h, d, x, y, z, mat, cast = true, recv = true) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = recv; house.add(m); return m;
  };

  addBox(6.8, 3.6, 5.4, -4.6, -1.8, -0.3, concreteDarkMat);
  addBox(5.2, 3.4, 5.2, 5.2, -1.7, -0.2, concreteMat);
  addBox(4.5, 2.9, 0.24, 5.2, -1.65, 2.32, cedarMat);
  for (let i = 0; i < 16; i++) { const bx = 3.25 + i * 0.26; if (bx > 3.65 && bx < 4.55) continue; addBox(0.05, 2.86, 0.06, bx, -1.65, 2.46, cedarMat, true, false); }
  addBox(0.82, 2.76, 0.08, 4.1, -1.65, 2.38, makeLampMat('#ffbe66', 2.5), false, false);
  const stairGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 2.86), glassMat); stairGlass.position.set(4.1, -1.65, 2.44); house.add(stairGlass);

  addBox(5.4, 0.42, 2.6, 5.2, -2.55, 4.1, concreteDarkMat);
  const poolWater = new THREE.Mesh(new THREE.PlaneGeometry(4.9, 2.1), waterMat); poolWater.rotation.x = -Math.PI * 0.5; poolWater.position.set(5.2, -2.32, 4.1); house.add(poolWater);

  const underLight = new THREE.PointLight(0xffb463, 6.5, 11, 1.5); underLight.position.set(0.5, -0.45, 0.8); house.add(underLight); interiorLights.push({ light: underLight, base: 6.5 });

  const mainY = 0.0, mainW = 18.6, mainH = 3.25, mainD = 5.8;
  addBox(mainW + 0.55, 0.44, mainD + 0.35, 0.2, mainY + 0.16, 0.0, concreteMat);
  addBox(mainW + 0.55, 0.36, mainD + 0.35, 0.2, mainY + mainH + 0.18, 0.0, concreteMat);
  addBox(0.42, mainH + 0.4, mainD + 0.3, -9.05, mainY + mainH * 0.5 + 0.16, 0.0, concreteMat);
  addBox(0.42, mainH + 0.4, mainD + 0.3, 9.45, mainY + mainH * 0.5 + 0.16, 0.0, concreteMat);
  addBox(11.6, 0.14, mainD + 0.4, 3.9, mainY + mainH + 0.42, 0.0, roofMat);
  for (let sx = -1.6; sx <= 9.5; sx += 0.48) addBox(0.04, 0.06, mainD + 0.36, sx, mainY + mainH + 0.51, 0.0, roofMat, false, false);
  addBox(2.8, 0.08, 1.1, 0.4, mainY + mainH + 0.52, 0.3, mullionMat, false, false);

  addBox(mainW - 0.4, 0.08, mainD - 0.3, 0.2, mainY + 0.40, 0.0, oakMat, false, true);
  addBox(mainW - 0.4, mainH, 0.22, 0.2, mainY + 0.4 + mainH * 0.5, -mainD * 0.5 + 0.18, plasterMat, true, true);
  addBox(0.18, mainH, 3.2, -2.2, mainY + 0.4 + mainH * 0.5, -1.1, plasterMat);
  addBox(0.18, mainH, 4.2, 5.4, mainY + 0.4 + mainH * 0.5, -0.6, plasterMat);
  addBox(mainW - 0.4, 0.06, mainD - 0.3, 0.2, mainY + mainH, 0.0, plasterMat, false, false);

  addBox(2.4, 0.92, 0.95, -6.9, mainY + 0.90, 0.35, darkCabinetMat);
  addBox(2.48, 0.07, 1.02, -6.9, mainY + 1.38, 0.35, plasterMat);
  addBox(2.6, 2.4, 0.65, -7.2, mainY + 1.62, -2.35, darkCabinetMat);
  for (const sx of [-7.5, -6.9, -6.3]) addBox(0.36, 0.68, 0.36, sx, mainY + 0.78, 1.12, woodFurnMat);

  addBox(4.2, 0.03, 3.1, -3.4, mainY + 0.455, 0.25, linenMat, false, true);
  addBox(2.5, 0.44, 0.96, -3.6, mainY + 0.66, -0.85, linenMat);
  addBox(2.5, 0.48, 0.24, -3.6, mainY + 0.98, -1.24, linenMat);
  addBox(0.95, 0.44, 0.92, -5.05, mainY + 0.66, 0.45, warmFabricMat);
  addBox(0.95, 0.44, 0.92, -2.1, mainY + 0.66, 0.35, warmFabricMat);
  const ct1 = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.42, 0.34, 18), woodFurnMat); ct1.position.set(-3.7, mainY + 0.61, 0.32); house.add(ct1);
  const ct2 = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.30, 0.42, 16), woodFurnMat); ct2.position.set(-2.95, mainY + 0.65, 0.52); house.add(ct2);
  const artMat = new THREE.MeshStandardMaterial({ color: '#394637', roughness: 0.7 });
  addBox(1.45, 1.15, 0.06, -4.5, mainY + 2.05, -2.55, artMat, false, false);
  addBox(1.35, 1.15, 0.06, -2.55, mainY + 2.05, -2.55, artMat, false, false);

  addBox(1.05, 0.46, 0.98, -0.45, mainY + 0.67, 0.55, linenMat);
  addBox(1.05, 0.52, 0.24, -0.45, mainY + 1.02, 0.14, linenMat);
  const lampShadeM = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.28, 16), lampMat); lampShadeM.position.set(-1.35, mainY + 1.75, 0.45); house.add(lampShadeM);

  addBox(2.45, 0.08, 1.05, 3.3, mainY + 1.16, 0.2, woodFurnMat);
  addBox(0.09, 0.74, 0.85, 2.35, mainY + 0.79, 0.2, woodFurnMat);
  addBox(0.09, 0.74, 0.85, 4.25, mainY + 0.79, 0.2, woodFurnMat);
  addBox(2.1, 0.08, 0.38, 3.3, mainY + 0.84, 0.95, woodFurnMat);

  addBox(2.15, 0.48, 2.25, 7.65, mainY + 0.68, -0.35, linenMat);
  addBox(2.15, 0.65, 0.18, 7.65, mainY + 1.15, -1.42, warmFabricMat);
  addBox(0.55, 0.48, 0.48, 6.25, mainY + 0.68, -1.15, woodFurnMat);
  addBox(0.55, 0.48, 0.48, 8.95, mainY + 0.68, -1.15, woodFurnMat);
  const bLamp1 = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.24, 14), lampMat); bLamp1.position.set(8.95, mainY + 1.14, -1.15); house.add(bLamp1);

  for (const lx of [-6.8, -3.4, 0.0, 3.3, 7.6]) {
    const puck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 12), ceilingGlowMat); puck.position.set(lx, mainY + mainH - 0.04, 0.35); house.add(puck);
    const pt = new THREE.PointLight(0xffbd6b, 14.5, 11.5, 1.55); pt.position.set(lx, mainY + mainH - 0.55, 0.45); house.add(pt); interiorLights.push({ light: pt, base: 14.5 });
  }

  const frontZ = mainD * 0.5 - 0.06;
  const frontGlass = new THREE.Mesh(new THREE.PlaneGeometry(mainW - 0.3, mainH - 0.05), glassMat); frontGlass.position.set(0.2, mainY + 0.4 + mainH * 0.5, frontZ); house.add(frontGlass);
  addBox(mainW - 0.1, 0.09, 0.14, 0.2, mainY + 0.42, frontZ, mullionMat);
  addBox(mainW - 0.1, 0.09, 0.14, 0.2, mainY + mainH + 0.02, frontZ, mullionMat);
  for (const mx of [-8.82, -6.2, -3.85, -1.45, -1.15, 1.45, 1.75, 4.45, 5.45, 7.25, 9.22]) addBox(0.075, mainH + 0.06, 0.16, mx, mainY + 0.4 + mainH * 0.5, frontZ, mullionMat);
  addBox(0.38, mainH + 0.06, 0.36, 1.6, mainY + 0.4 + mainH * 0.5, frontZ - 0.06, cedarMat);
  addBox(0.46, mainH + 0.06, 0.36, 5.42, mainY + 0.4 + mainH * 0.5, frontZ - 0.06, cedarMat);

  const upY = mainY + mainH + 0.36, upX = -5.0, upW = 8.8, upH = 3.05, upD = 5.4;
  addBox(upW + 0.4, 0.34, upD + 0.35, upX, upY + upH + 0.16, 0.0, concreteMat);
  addBox(0.42, upH + 0.4, upD + 0.3, upX - upW * 0.5 - 0.02, upY + upH * 0.5, 0.0, concreteMat);
  addBox(0.42, upH + 0.4, upD + 0.3, upX + upW * 0.5 + 0.02, upY + upH * 0.5, 0.0, concreteMat);
  addBox(upW, upH, 0.24, upX, upY + upH * 0.5, -upD * 0.5 + 0.14, plasterMat);
  addBox(0.24, upH, upD, upX + upW * 0.5 - 0.05, upY + upH * 0.5, 0.0, cedarMat);
  addBox(upW - 0.2, 0.08, upD - 0.2, upX, upY + 0.04, 0.0, oakMat, false, true);
  addBox(3.15, upH, 0.32, upX - 0.15, upY + upH * 0.5, upD * 0.5 - 0.08, cedarMat);
  for (let i = 0; i < 14; i++) addBox(0.05, upH - 0.06, 0.06, upX - 1.65 + i * 0.23, upY + upH * 0.5, upD * 0.5 + 0.09, cedarMat, true, false);
  addBox(1.85, 0.46, 2.0, upX - 3.1, upY + 0.28, -0.35, linenMat);
  addBox(1.85, 0.58, 0.16, upX - 3.1, upY + 0.72, -1.28, warmFabricMat);
  addBox(1.55, 0.44, 1.85, upX + 3.25, upY + 0.26, -0.35, linenMat);
  addBox(0.95, 2.35, 0.12, upX + 2.15, upY + 1.24, -1.4, makeLampMat('#ffcb7e', 1.4), false, false);

  const upFrontZ = upD * 0.5 - 0.06;
  const upGlass = new THREE.Mesh(new THREE.PlaneGeometry(upW - 0.3, upH - 0.06), glassMat); upGlass.position.set(upX, upY + upH * 0.5, upFrontZ); house.add(upGlass);
  for (const ux of [upX - 4.2, upX - 2.95, upX - 1.72, upX + 1.45, upX + 2.85, upX + 4.2]) addBox(0.075, upH, 0.14, ux, upY + upH * 0.5, upFrontZ, mullionMat);
  for (const ux of [upX - 3.0, upX + 2.75]) {
    const pt = new THREE.PointLight(0xffb862, 13.5, 9.5, 1.5); pt.position.set(ux, upY + upH - 0.55, 0.4); house.add(pt); interiorLights.push({ light: pt, base: 13.5 });
  }
  return { house, interiorLights, emissiveMats };
}

function buildCoastalTree(tex, seedInit, scale = 1.0, spreadBias = 1.0) {
  const rng = makeRng(seedInit), group = new THREE.Group(), branchMats = [], leafMats = [], leafCols = [];
  const dummy = new THREE.Object3D(), Y = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3(), q = new THREE.Quaternion();
  const addLimb = (p0, p1, r0) => {
    v.subVectors(p1, p0); const len = v.length(); if (len < 0.05) return;
    q.setFromUnitVectors(Y, v.clone().normalize());
    branchMats.push(new THREE.Matrix4().compose(p0.clone().lerp(p1, 0.5), q, new THREE.Vector3(r0, len, r0)));
  };
  const grow = (origin, dir, len, rad, depth) => {
    let p = origin.clone(), d = dir.clone().normalize(), r = rad;
    const steps = depth === 0 ? 4 : 2;
    for (let s = 0; s < steps; s++) {
      const seg = (len / steps) * (0.85 + rng() * 0.3);
      d.x += (rng() - 0.5) * (depth === 0 ? 0.25 : 0.42); d.z += (rng() - 0.5) * (depth === 0 ? 0.25 : 0.42);
      d.y = Math.max(depth >= 2 ? 0.06 : 0.28, d.y + (rng() - 0.38) * 0.24); d.normalize();
      const next = p.clone().addScaledVector(d, seg); addLimb(p, next, r); p = next; r *= 0.78;
    }
    if (depth >= 2) {
      const sprays = depth === 3 ? 5 : 3;
      for (let k = 0; k < sprays; k++) {
        dummy.position.set(p.x + (rng() - 0.5) * 1.45 * scale, p.y + (rng() - 0.35) * 0.95 * scale, p.z + (rng() - 0.5) * 1.45 * scale);
        dummy.rotation.set((rng() - 0.5) * 0.85, rng() * Math.PI * 2, (rng() - 0.5) * 0.75);
        const sc = (1.35 + rng() * 1.1) * scale; dummy.scale.set(sc, sc * (0.85 + rng() * 0.3), sc); dummy.updateMatrix();
        leafMats.push(dummy.matrix.clone());
        const shade = 0.72 + rng() * 0.42; leafCols.push(new THREE.Color(0.24 * shade, 0.31 * shade, 0.22 * shade));
      }
      if (depth >= 3) return;
    }
    const children = depth === 0 ? 4 : (depth === 1 ? 3 : 2);
    for (let c = 0; c < children; c++) {
      const az = (c / children) * Math.PI * 2 + rng() * 0.9, spread = (depth === 0 ? 0.52 : 0.58) * spreadBias + rng() * 0.25;
      const cd = new THREE.Vector3(d.x * 0.45 + Math.cos(az) * spread, Math.max(0.18, d.y * 0.75 + (rng() - 0.25) * 0.25), d.z * 0.45 + Math.sin(az) * spread).normalize();
      grow(p, cd, len * (0.68 + rng() * 0.14), r * 0.82, depth + 1);
    }
  };
  grow(new THREE.Vector3(0, -0.4, 0), new THREE.Vector3((rng() - 0.5) * 0.2, 0.96, (rng() - 0.5) * 0.15), 4.2 * scale, 0.28 * scale, 0);
  if (rng() > 0.35) grow(new THREE.Vector3(0.35 * scale, -0.4, 0.2 * scale), new THREE.Vector3(0.25, 0.92, -0.18), 3.4 * scale, 0.20 * scale, 0);
  const barkMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.72, 1.0, 1.0, 7, 1), new THREE.MeshStandardMaterial({ color: '#332924', roughness: 0.94 }), branchMats.length);
  branchMats.forEach((m, i) => barkMesh.setMatrixAt(i, m)); barkMesh.castShadow = true; barkMesh.receiveShadow = true; group.add(barkMesh);
  const leafMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshStandardMaterial({ map: tex.leafSprayTex, alphaTest: 0.36, side: THREE.DoubleSide, roughness: 0.88 }), leafMats.length);
  leafMats.forEach((m, i) => { leafMesh.setMatrixAt(i, m); leafMesh.setColorAt(i, leafCols[i]); }); leafMesh.castShadow = true; leafMesh.receiveShadow = true; group.add(leafMesh);
  return group;
}

function buildDistantWaihekeRidges() {
  const group = new THREE.Group(), ridgeMats = [];
  for (const L of [{ dist: 52, h: 11, color: '#39323a', seed: 1.1 }, { dist: 86, h: 19, color: '#534452', seed: 2.7 }, { dist: 128, h: 27, color: '#705868', seed: 4.3 }]) {
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
  const rng = makeRng(709), dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.24, 8, 8), new THREE.MeshBasicMaterial({ color: '#ffbb66' }), 18), dummy = new THREE.Object3D();
  for (let i = 0; i < 18; i++) {
    const a = -0.35 + rng() * 0.95, dist = 42 + rng() * 34;
    dummy.position.set(Math.sin(a) * dist, 1.5 + rng() * 3.8, -Math.cos(a) * dist); dummy.scale.setScalar(0.6 + rng() * 1.2); dummy.updateMatrix(); dots.setMatrixAt(i, dummy.matrix);
  }
  group.add(dots);
  return { group, dots, ridgeMats };
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
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x523f4d, 0.0085);

  const camera = new THREE.PerspectiveCamera(36, sz0.w / sz0.h, 0.2, 400);
  const heroTarget = new THREE.Vector3(0.4, 1.95, 0.0), heroPos = new THREE.Vector3(-0.6, 2.35, 25.5);
  camera.position.copy(heroPos);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.06; controls.target.copy(heroTarget);
  controls.minDistance = 9; controls.maxDistance = 48; controls.maxPolarAngle = Math.PI * 0.495; controls.minPolarAngle = Math.PI * 0.14;

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(sz0.w, sz0.h), 0.24, 0.65, 0.84);
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  const hemiLight = new THREE.HemisphereLight(0xd9a8b8, 0x3b2824, 0.72); scene.add(hemiLight);
  const sunLight = new THREE.DirectionalLight(0xf6ba92, 1.65); sunLight.position.set(16, 11, -24); sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048); sunLight.shadow.camera.near = 2; sunLight.shadow.camera.far = 80;
  sunLight.shadow.camera.left = -22; sunLight.shadow.camera.right = 22; sunLight.shadow.camera.top = 18; sunLight.shadow.camera.bottom = -14; sunLight.shadow.bias = -0.0005;
  scene.add(sunLight);
  const frontFill = new THREE.DirectionalLight(0xc8a4b8, 0.52); frontFill.position.set(-10, 8, 22); scene.add(frontFill);

  const tex = buildArchTextures();
  const sky = createWaihekeSky(); scene.add(sky.mesh);
  const ridges = buildDistantWaihekeRidges(); scene.add(ridges.group);

  const hillGeo = new THREE.PlaneGeometry(86, 68, 72, 56); hillGeo.rotateX(-Math.PI * 0.5);
  const hp = hillGeo.attributes.position; for (let i = 0; i < hp.count; i++) hp.setY(i, hillsideHeight(hp.getX(i), hp.getZ(i)));
  hillGeo.computeVertexNormals();
  const hillMesh = new THREE.Mesh(hillGeo, new THREE.MeshStandardMaterial({ map: tex.soilMap, normalMap: tex.soilNorm, normalScale: new THREE.Vector2(0.95, 0.95), color: '#7c5848', roughness: 0.94 }));
  hillMesh.receiveShadow = true; scene.add(hillMesh);

  const glassMat = createSharpArchitecturalGlass('clear');
  const waterMat = createSchlickWaterMaterial(tex.waterNorm);
  const { house, interiorLights, emissiveMats } = buildWaihekeHouse(tex, glassMat, waterMat);
  scene.add(house);

  for (const ts of [
    { x: -12.6, z: 2.2, sc: 1.38, seed: 101, spread: 1.15 }, { x: -11.4, z: -4.8, sc: 1.25, seed: 204, spread: 1.05 },
    { x: 12.8, z: 1.8, sc: 1.48, seed: 309, spread: 1.22 }, { x: 11.2, z: -4.2, sc: 1.28, seed: 412, spread: 1.12 },
    { x: 0.8, z: -9.5, sc: 1.15, seed: 518, spread: 1.05 }, { x: -5.8, z: -10.5, sc: 1.22, seed: 625, spread: 1.08 },
    { x: 6.8, z: -10.2, sc: 1.12, seed: 731, spread: 1.02 }
  ]) {
    const t = buildCoastalTree(tex, ts.seed, ts.sc, ts.spread); t.position.set(ts.x, hillsideHeight(ts.x, ts.z), ts.z); scene.add(t);
  }

  const place = (obj, x, z, rotY = 0) => { obj.position.set(x, hillsideHeight(x, z) - 0.04, z); obj.rotation.y = rotY; scene.add(obj); };
  place(buildNikauPalm(1.12), -10.8, 3.8, 0.4); place(buildNikauPalm(0.95), 10.6, 3.4, 2.2);
  place(buildTiKouka(1.05), -8.9, 5.4, 1.1); place(buildTiKouka(0.92), 9.2, 5.0, 2.7);
  for (const [x, z, sc, r] of [[-7.2, 4.2, 1.05, 0.2], [-4.5, 4.8, 0.95, 1.5], [-1.4, 4.3, 1.0, 2.3], [1.6, 4.6, 0.92, 0.8], [8.4, 4.1, 1.0, 1.9]]) place(buildHarakeke(sc), x, z, r);
  for (const [x, z, sc, r] of [[-6.1, 3.6, 1.1, 0.5], [-3.1, 3.8, 1.0, 1.2], [-0.4, 3.4, 1.05, 2.1], [2.1, 3.8, 0.95, 0.9], [7.8, 5.2, 1.05, 2.8]]) place(buildRengarenga(sc), x, z, r);
  for (const [x, z, sc, r] of [[-8.2, 4.9, 1.0, 0.3], [-5.2, 5.6, 1.1, 1.7], [-2.2, 5.1, 0.95, 2.5], [0.8, 5.4, 1.05, 0.6], [3.2, 5.8, 1.0, 1.4]]) place(buildOioi(sc), x, z, r);

  let currentEnvRT = null;
  const MOODS = {
    twilight: { zenith: '#2a1d2a', mid: '#8e6a77', horizon: '#e8b28d', cloudDark: '#483240', cloudLit: '#f4c7a4', fog: 0x523f4d, fogDensity: 0.0082, exposure: 1.08, sunCol: 0xf6ba92, sunInt: 1.55, sunPos: [16, 10, -24], hemiSky: 0xd9a8b8, hemiGnd: 0x3b2824, hemiInt: 0.68, frontInt: 0.48, interiorMult: 1.0, bloom: 0.24, dotsVis: true, ridges: ['#39323a', '#534452', '#705868'], waterSky: '#9c7a88' },
    golden:   { zenith: '#3c587a', mid: '#c48d7a', horizon: '#ffd29d', cloudDark: '#7b5c58', cloudLit: '#ffe1b8', fog: 0x9b7e76, fogDensity: 0.0062, exposure: 1.12, sunCol: 0xffcf94, sunInt: 2.55, sunPos: [24, 14, 18], hemiSky: 0xffe4c8, hemiGnd: 0x5a4438, hemiInt: 0.82, frontInt: 0.42, interiorMult: 0.58, bloom: 0.14, dotsVis: false, ridges: ['#494a44', '#6b645e', '#94837c'], waterSky: '#d9a88c' },
    day:      { zenith: '#4c7fb0', mid: '#9ec4df', horizon: '#e4eef5', cloudDark: '#b8c8d4', cloudLit: '#ffffff', fog: 0xcbdbe6, fogDensity: 0.0046, exposure: 1.14, sunCol: 0xfff8ec, sunInt: 2.85, sunPos: [18, 28, 22], hemiSky: 0xdff0ff, hemiGnd: 0x6b6052, hemiInt: 0.92, frontInt: 0.45, interiorMult: 0.24, bloom: 0.06, dotsVis: false, ridges: ['#586b5c', '#7c8f88', '#a3b5b5'], waterSky: '#a8cbe2' }
  };

  function applyMood(key) {
    const m = MOODS[key] || MOODS.twilight;
    if (currentEnvRT) currentEnvRT.dispose();
    currentEnvRT = buildProceduralHDRIBL(renderer, key);
    scene.environment = currentEnvRT.texture;
    scene.environmentIntensity = key === 'twilight' ? 0.55 : 0.78;
    sky.mat.uniforms.uZenith.value.set(m.zenith); sky.mat.uniforms.uMid.value.set(m.mid); sky.mat.uniforms.uHorizon.value.set(m.horizon);
    sky.mat.uniforms.uCloudDark.value.set(m.cloudDark); sky.mat.uniforms.uCloudLit.value.set(m.cloudLit);
    scene.fog.color.setHex(m.fog); scene.fog.density = m.fogDensity; renderer.toneMappingExposure = m.exposure;
    sunLight.color.setHex(m.sunCol); sunLight.intensity = m.sunInt; sunLight.position.set(...m.sunPos);
    hemiLight.color.setHex(m.hemiSky); hemiLight.groundColor.setHex(m.hemiGnd); hemiLight.intensity = m.hemiInt;
    frontFill.intensity = m.frontInt; bloomPass.strength = m.bloom; ridges.dots.visible = m.dotsVis;
    ridges.ridgeMats.forEach((rm, i) => rm.color.set(m.ridges[i]));
    waterMat.uniforms.uSunDir.value.set(...m.sunPos).normalize(); waterMat.uniforms.uSunCol.value.setHex(m.sunCol); waterMat.uniforms.uSkyCol.value.set(m.waterSky);
    interiorLights.forEach(({ light, base }) => { light.intensity = base * m.interiorMult; });
    emissiveMats.forEach(({ mat, base }) => { mat.emissiveIntensity = base * Math.max(0.25, m.interiorMult); });
    uiRoot.querySelectorAll('.mood-btn[data-mood]').forEach(b => {
      const on = b.dataset.mood === key; b.setAttribute('aria-pressed', String(on));
      if (hostEl) { b.style.background = on ? '#240B21' : 'transparent'; b.style.color = on ? '#FFFDFB' : '#654A4E'; }
    });
  }
  applyMood('twilight');
  uiRoot.querySelectorAll('.mood-btn[data-mood]').forEach(btn => btn.addEventListener('click', () => applyMood(btn.dataset.mood)));

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
    renderer.setPixelRatio(computeAdaptiveDPR(s.w, s.h)); renderer.setSize(s.w, s.h, false); composer.setSize(s.w, s.h);
  };
  window.addEventListener('resize', onResize);

  let raf = 0, alive = true, last = performance.now();
  function animate(now) {
    if (!alive) return;
    raf = requestAnimationFrame(animate);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    sky.mat.uniforms.uTime.value += dt; waterMat.uniforms.uTime.value += dt;
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
    dispose: () => { alive = false; cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); controls.dispose(); currentEnvRT?.dispose(); renderer.dispose(); if (hostEl) hostEl.innerHTML = ''; }
  };
  window.__waihekeHero = api;
  return api;
}

if (document.getElementById('stage')) mountWaihekeHero(null);
