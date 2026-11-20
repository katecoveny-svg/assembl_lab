import * as THREE from 'three/webgpu';

export interface PbrTextureSet {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
}

function makeCanvas(size = 1024): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  return [c, ctx];
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  repeatX: number,
  repeatY: number,
  isColor: boolean
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 8;
  if (isColor) tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * High-resolution 1024px Colorsteel / Colorcote ZR8 Paneldek dark vertical standing-seam metal.
 * Features crisp raised seam ribs, subtle satin oil-canning sheen, and micro-brushed roughness.
 */
export function createStandingSeamTextures(hexColor = '#23262a'): PbrTextureSet {
  const size = 1024;
  const [albedoC, aCtx] = makeCanvas(size);
  const [roughC, rCtx] = makeCanvas(size);
  const [bumpC, bCtx] = makeCanvas(size);

  aCtx.fillStyle = hexColor;
  aCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = 'rgb(96,96,96)';
  rCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = 'rgb(122,122,122)';
  bCtx.fillRect(0, 0, size, size);

  const trays = 12;
  const tw = size / trays;
  for (let i = 0; i < trays; i++) {
    const x = i * tw;
    const grad = aCtx.createLinearGradient(x, 0, x + tw, 0);
    grad.addColorStop(0, 'rgba(255,255,255,0.07)');
    grad.addColorStop(0.2, 'rgba(0,0,0,0.02)');
    grad.addColorStop(0.55, 'rgba(255,255,255,0.035)');
    grad.addColorStop(1, 'rgba(0,0,0,0.08)');
    aCtx.fillStyle = grad;
    aCtx.fillRect(x, 0, tw, size);

    for (let s = 0; s < 14; s++) {
      const sx = x + 10 + ((s * 23 + i * 7) % (tw - 16));
      rCtx.fillStyle = s % 2 ? 'rgba(128,128,128,0.22)' : 'rgba(72,72,72,0.22)';
      rCtx.fillRect(sx, 0, 2, size);
    }

    aCtx.fillStyle = 'rgba(0,0,0,0.72)';
    aCtx.fillRect(x, 0, 6, size);
    aCtx.fillStyle = 'rgba(255,255,255,0.18)';
    aCtx.fillRect(x + 6, 0, 3, size);
    aCtx.fillStyle = 'rgba(0,0,0,0.35)';
    aCtx.fillRect(x + 9, 0, 3, size);

    bCtx.fillStyle = 'rgb(252,252,252)';
    bCtx.fillRect(x + 4, 0, 6, size);
    bCtx.fillStyle = 'rgb(40,40,40)';
    bCtx.fillRect(x, 0, 4, size);

    rCtx.fillStyle = 'rgb(64,64,64)';
    rCtx.fillRect(x + 4, 0, 6, size);
  }

  return {
    map: finalizeTexture(albedoC, 3, 2, true),
    roughnessMap: finalizeTexture(roughC, 3, 2, false),
    bumpMap: finalizeTexture(bumpC, 3, 2, false),
  };
}

/**
 * High-resolution 1024px Abodo Vulcan Vertical Cedar / Charred Shou Sugi Ban shiplap cladding.
 */
export function createCedarCladdingTextures(charred = false): PbrTextureSet {
  const size = 1024;
  const [albedoC, aCtx] = makeCanvas(size);
  const [roughC, rCtx] = makeCanvas(size);
  const [bumpC, bCtx] = makeCanvas(size);

  const boards = 16;
  const bw = size / boards;

  for (let i = 0; i < boards; i++) {
    const x = i * bw;
    const tone = (Math.sin(i * 19.31) * 0.5 + 0.5) * 24 - 12;
    const r = charred ? 38 + tone * 0.35 : 132 + tone;
    const g = charred ? 35 + tone * 0.35 : 96 + tone * 0.78;
    const b = charred ? 34 + tone * 0.35 : 68 + tone * 0.55;

    aCtx.fillStyle = `rgb(${r},${g},${b})`;
    aCtx.fillRect(x, 0, bw, size);

    const rv = charred ? 185 + (i % 4) * 10 : 162 + (i % 4) * 12;
    rCtx.fillStyle = `rgb(${rv},${rv},${rv})`;
    rCtx.fillRect(x, 0, bw, size);

    bCtx.fillStyle = 'rgb(212,212,212)';
    bCtx.fillRect(x, 0, bw, size);

    for (let f = 0; f < 34; f++) {
      const fx = x + 4 + ((f * 17 + i * 11) % (bw - 8));
      aCtx.fillStyle = charred ? 'rgba(12,10,10,0.32)' : 'rgba(62,38,22,0.16)';
      aCtx.fillRect(fx, 0, 1.5, size);
      bCtx.fillStyle = 'rgba(150,150,150,0.32)';
      bCtx.fillRect(fx, 0, 1.2, size);
    }

    aCtx.fillStyle = 'rgba(14,10,8,0.88)';
    aCtx.fillRect(x, 0, 5, size);
    rCtx.fillStyle = 'rgb(248,248,248)';
    rCtx.fillRect(x, 0, 5, size);
    bCtx.fillStyle = 'rgb(22,22,22)';
    bCtx.fillRect(x, 0, 5, size);
  }

  return {
    map: finalizeTexture(albedoC, 3, 2, true),
    roughnessMap: finalizeTexture(roughC, 3, 2, false),
    bumpMap: finalizeTexture(bumpC, 3, 2, false),
  };
}

/**
 * Weathered Kwila / Vitex architectural exterior timber decking planks with shadow gaps.
 */
export function createTimberDeckTextures(): PbrTextureSet {
  const size = 1024;
  const [albedoC, aCtx] = makeCanvas(size);
  const [roughC, rCtx] = makeCanvas(size);
  const [bumpC, bCtx] = makeCanvas(size);

  const planks = 14;
  const ph = size / planks;
  for (let i = 0; i < planks; i++) {
    const y = i * ph;
    const d = ((i * 29) % 20) - 10;
    aCtx.fillStyle = `rgb(${124 + d},${102 + d * 0.8},${84 + d * 0.65})`;
    aCtx.fillRect(0, y, size, ph);

    const rv = 154 + (i % 4) * 14;
    rCtx.fillStyle = `rgb(${rv},${rv},${rv})`;
    rCtx.fillRect(0, y, size, ph);
    bCtx.fillStyle = 'rgb(205,205,205)';
    bCtx.fillRect(0, y, size, ph);

    for (let g = 0; g < 24; g++) {
      const gy = y + 5 + ((g * 13 + i * 7) % (ph - 10));
      aCtx.fillStyle = 'rgba(58,42,30,0.16)';
      aCtx.fillRect(0, gy, size, 1.5);
    }

    aCtx.fillStyle = 'rgba(16,13,11,0.92)';
    aCtx.fillRect(0, y, size, 5);
    bCtx.fillStyle = 'rgb(18,18,18)';
    bCtx.fillRect(0, y, size, 5);
    rCtx.fillStyle = 'rgb(245,245,245)';
    rCtx.fillRect(0, y, size, 5);
  }

  return {
    map: finalizeTexture(albedoC, 3, 3, true),
    roughnessMap: finalizeTexture(roughC, 3, 3, false),
    bumpMap: finalizeTexture(bumpC, 3, 3, false),
  };
}

/**
 * Honed Waikato river-aggregate concrete architectural slabs.
 */
export function createHonedConcreteTextures(): PbrTextureSet {
  const size = 1024;
  const [albedoC, aCtx] = makeCanvas(size);
  const [roughC, rCtx] = makeCanvas(size);
  const [bumpC, bCtx] = makeCanvas(size);

  aCtx.fillStyle = '#c2bcb2';
  aCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = 'rgb(132,132,132)';
  rCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = 'rgb(134,134,134)';
  bCtx.fillRect(0, 0, size, size);

  for (let i = 0; i < 4200; i++) {
    const x = (Math.sin(i * 78.233) * 0.5 + 0.5) * size;
    const y = (Math.cos(i * 45.164) * 0.5 + 0.5) * size;
    const r = 1 + (i % 5);
    const v = 140 + (i % 60);
    aCtx.fillStyle = `rgba(${v},${v - 5},${v - 11},0.22)`;
    aCtx.beginPath();
    aCtx.arc(x, y, r, 0, Math.PI * 2);
    aCtx.fill();

    const rv = 105 + (i % 75);
    rCtx.fillStyle = `rgba(${rv},${rv},${rv},0.24)`;
    rCtx.fillRect(x, y, r * 2, r * 2);
  }

  return {
    map: finalizeTexture(albedoC, 4, 4, true),
    roughnessMap: finalizeTexture(roughC, 4, 4, false),
    bumpMap: finalizeTexture(bumpC, 4, 4, false),
  };
}

/**
 * 1024px Veincut Roman Travertine PBR maps (horizontal sedimentary bands & fine natural mineral pores)
 * for kitchen waterfall islands, fluted drum coffee tables, and bathroom vanities.
 */
export function createVeincutTravertineTextures(): PbrTextureSet {
  const size = 1024;
  const [albedoC, aCtx] = makeCanvas(size);
  const [roughC, rCtx] = makeCanvas(size);
  const [bumpC, bCtx] = makeCanvas(size);

  aCtx.fillStyle = '#dfd5c6';
  aCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = 'rgb(96,96,96)';
  rCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = 'rgb(156,156,156)';
  bCtx.fillRect(0, 0, size, size);

  // Horizontal sedimentary veincut striations
  for (let y = 0; y < size; y += 3) {
    const wave = Math.sin(y * 0.045) * 0.5 + Math.sin(y * 0.13) * 0.3 + Math.cos(y * 0.018) * 0.2;
    const delta = Math.round(wave * 18);
    aCtx.fillStyle = `rgba(${214 + delta},${202 + delta},${185 + delta},0.55)`;
    aCtx.fillRect(0, y, size, 3);

    const rv = Math.max(62, Math.min(168, 98 - delta * 2));
    rCtx.fillStyle = `rgba(${rv},${rv},${rv},0.45)`;
    rCtx.fillRect(0, y, size, 3);
  }

  // Organic mineral veins & shallow travertine pores
  for (let i = 0; i < 650; i++) {
    const x = (Math.sin(i * 43.17) * 0.5 + 0.5) * size;
    const y = (Math.cos(i * 91.73) * 0.5 + 0.5) * size;
    const w = 14 + (i % 56);
    const h = 1.5 + (i % 4);
    const dark = i % 3 === 0;
    aCtx.fillStyle = dark ? 'rgba(154,138,118,0.34)' : 'rgba(246,241,232,0.42)';
    aCtx.fillRect(x, y, w, h);

    if (dark) {
      bCtx.fillStyle = 'rgba(72,72,72,0.55)';
      bCtx.fillRect(x, y, w * 0.7, h);
      rCtx.fillStyle = 'rgba(186,186,186,0.55)';
      rCtx.fillRect(x, y, w * 0.7, h);
    }
  }

  return {
    map: finalizeTexture(albedoC, 2, 2, true),
    roughnessMap: finalizeTexture(roughC, 2, 2, false),
    bumpMap: finalizeTexture(bumpC, 2, 2, false),
  };
}

/**
 * 1024px Heavy Tactile Bouclé Wool Micro-Weave PBR maps for Simon James / Nodi NZ upholstery.
 */
export function createBoucleFabricTextures(baseHex = '#e9e2d6'): PbrTextureSet {
  const size = 1024;
  const [albedoC, aCtx] = makeCanvas(size);
  const [roughC, rCtx] = makeCanvas(size);
  const [bumpC, bCtx] = makeCanvas(size);

  aCtx.fillStyle = baseHex;
  aCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = 'rgb(228,228,228)';
  rCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = 'rgb(122,122,122)';
  bCtx.fillRect(0, 0, size, size);

  // Subtle cross-woven yarn grid
  for (let i = 0; i < size; i += 8) {
    aCtx.fillStyle = i % 16 === 0 ? 'rgba(160,148,132,0.14)' : 'rgba(255,252,246,0.16)';
    aCtx.fillRect(i, 0, 3, size);
    aCtx.fillRect(0, i, size, 3);
  }

  // Dense bouclé wool loops (knotted slubs for tactile bump & micro-shadow)
  for (let i = 0; i < 9000; i++) {
    const x = (Math.sin(i * 12.9898 + 0.4) * 0.5 + 0.5) * size;
    const y = (Math.cos(i * 78.233 + 1.1) * 0.5 + 0.5) * size;
    const rad = 2.2 + (i % 4) * 0.9;
    const light = i % 2 === 0;
    aCtx.fillStyle = light ? 'rgba(252,248,240,0.42)' : 'rgba(176,164,148,0.28)';
    aCtx.beginPath();
    aCtx.arc(x, y, rad, 0, Math.PI * 2);
    aCtx.fill();

    const bv = light ? 228 : 74;
    bCtx.fillStyle = `rgba(${bv},${bv},${bv},0.55)`;
    bCtx.beginPath();
    bCtx.arc(x, y, rad, 0, Math.PI * 2);
    bCtx.fill();
  }

  return {
    map: finalizeTexture(albedoC, 5, 5, true),
    roughnessMap: finalizeTexture(roughC, 5, 5, false),
    bumpMap: finalizeTexture(bumpC, 5, 5, false),
  };
}

/**
 * 1024px Handmade Glazed Ivory Zellige Tile PBR maps (Tile Space NZ aesthetic)
 * with organic kiln-fired glaze ripples, slight tile-to-tile tonal variation, and matte grout.
 */
export function createZelligeTileTextures(): PbrTextureSet {
  const size = 1024;
  const [albedoC, aCtx] = makeCanvas(size);
  const [roughC, rCtx] = makeCanvas(size);
  const [bumpC, bCtx] = makeCanvas(size);

  // Matte warm-putty grout background
  aCtx.fillStyle = '#c8bfb3';
  aCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = 'rgb(235,235,235)';
  rCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = 'rgb(36,36,36)';
  bCtx.fillRect(0, 0, size, size);

  const grid = 8;
  const cell = size / grid;
  const grout = 4;

  for (let row = 0; row < grid; row++) {
    for (let col = 0; col < grid; col++) {
      const idx = row * grid + col;
      const x = col * cell + grout;
      const y = row * cell + grout;
      const w = cell - grout * 2;
      const h = cell - grout * 2;

      const shift = Math.round(Math.sin(idx * 17.3) * 11);
      const r = 240 + shift;
      const g = 235 + shift;
      const b = 225 + shift;

      const grad = aCtx.createLinearGradient(x, y, x + w, y + h);
      grad.addColorStop(0, `rgb(${Math.min(255, r + 6)},${Math.min(255, g + 5)},${Math.min(255, b + 4)})`);
      grad.addColorStop(0.55, `rgb(${r},${g},${b})`);
      grad.addColorStop(1, `rgb(${r - 9},${g - 10},${b - 11})`);
      aCtx.fillStyle = grad;
      aCtx.fillRect(x, y, w, h);

      // Glossy handmade glaze roughness (low roughness = glossy ceramic reflection)
      const rv = 34 + (idx % 5) * 9;
      rCtx.fillStyle = `rgb(${rv},${rv},${rv})`;
      rCtx.fillRect(x, y, w, h);

      // Slightly undulating handmade tile face height
      const bv = 190 + Math.round(Math.cos(idx * 9.7) * 28);
      bCtx.fillStyle = `rgb(${bv},${bv},${bv})`;
      bCtx.fillRect(x + 2, y + 2, w - 4, h - 4);
    }
  }

  return {
    map: finalizeTexture(albedoC, 3, 1.5, true),
    roughnessMap: finalizeTexture(roughC, 3, 1.5, false),
    bumpMap: finalizeTexture(bumpC, 3, 1.5, false),
  };
}

/**
 * Scandinavian wide-plank matte oiled European oak flooring.
 */
export function createScandiOakTextures(): PbrTextureSet {
  const size = 1024;
  const [albedoC, aCtx] = makeCanvas(size);
  const [roughC, rCtx] = makeCanvas(size);
  const [bumpC, bCtx] = makeCanvas(size);

  const planks = 8;
  const ph = size / planks;
  for (let i = 0; i < planks; i++) {
    const y = i * ph;
    const delta = ((i * 37) % 18) - 9;
    aCtx.fillStyle = `rgb(${206 + delta},${179 + delta * 0.8},${144 + delta * 0.7})`;
    aCtx.fillRect(0, y, size, ph);

    rCtx.fillStyle = `rgb(${112 + (i % 3) * 12},${112 + (i % 3) * 12},${112 + (i % 3) * 12})`;
    rCtx.fillRect(0, y, size, ph);
    bCtx.fillStyle = 'rgb(196,196,196)';
    bCtx.fillRect(0, y, size, ph);

    for (let g = 0; g < 32; g++) {
      const gy = y + 4 + ((g * 19 + i * 11) % (ph - 8));
      aCtx.fillStyle = 'rgba(138,106,74,0.14)';
      aCtx.fillRect(0, gy, size, 1.5);
    }
    aCtx.fillStyle = 'rgba(108,84,60,0.45)';
    aCtx.fillRect(0, y, size, 2.5);
    bCtx.fillStyle = 'rgb(75,75,75)';
    bCtx.fillRect(0, y, size, 2.5);
  }

  return {
    map: finalizeTexture(albedoC, 3, 3, true),
    roughnessMap: finalizeTexture(roughC, 3, 3, false),
    bumpMap: finalizeTexture(bumpC, 3, 3, false),
  };
}

/**
 * Natural Waiheke coastal hillside terrain (dark volcanic loam, fern mulch, coastal grass).
 */
export function createNzHillsideTextures(): PbrTextureSet {
  const size = 1024;
  const [albedoC, aCtx] = makeCanvas(size);
  const [roughC, rCtx] = makeCanvas(size);
  const [bumpC, bCtx] = makeCanvas(size);

  aCtx.fillStyle = '#36442c';
  aCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = 'rgb(232,232,232)';
  rCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = 'rgb(128,128,128)';
  bCtx.fillRect(0, 0, size, size);

  for (let i = 0; i < 6500; i++) {
    const x = (Math.sin(i * 12.9898) * 0.5 + 0.5) * size;
    const y = (Math.cos(i * 78.233) * 0.5 + 0.5) * size;
    const r = 2 + (i % 13);
    const tone = i % 4;
    aCtx.fillStyle =
      tone === 0
        ? 'rgba(42,58,34,0.28)'
        : tone === 1
          ? 'rgba(72,82,52,0.24)'
          : tone === 2
            ? 'rgba(54,46,36,0.26)'
            : 'rgba(88,92,62,0.18)';
    aCtx.beginPath();
    aCtx.arc(x, y, r, 0, Math.PI * 2);
    aCtx.fill();

    const bv = 90 + (i % 80);
    bCtx.fillStyle = `rgba(${bv},${bv},${bv},0.25)`;
    bCtx.fillRect(x, y, r, r);
  }

  return {
    map: finalizeTexture(albedoC, 8, 8, true),
    roughnessMap: finalizeTexture(roughC, 8, 8, false),
    bumpMap: finalizeTexture(bumpC, 8, 8, false),
  };
}

/**
 * High-detail alpha-cutout botanical texture for NZ Ponga / Silver Fern pinnate fronds.
 */
export function createPongaFrondTexture(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(512);
  ctx.clearRect(0, 0, 512, 512);

  ctx.strokeStyle = '#3f5a2c';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(256, 510);
  ctx.quadraticCurveTo(254, 256, 256, 12);
  ctx.stroke();

  const pairs = 26;
  for (let i = 0; i < pairs; i++) {
    const t = i / (pairs - 1);
    const y = 478 - t * 448;
    const envelope = Math.sin(t * Math.PI * 0.92 + 0.14);
    const len = Math.max(18, envelope * 218);
    const w = Math.max(5, envelope * 15);

    for (const dir of [-1, 1]) {
      const grad = ctx.createLinearGradient(256, y, 256 + dir * len, y - 16);
      grad.addColorStop(0, '#2e4e26');
      grad.addColorStop(0.55, '#436932');
      grad.addColorStop(1, '#587f40');
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.moveTo(256, y);
      ctx.quadraticCurveTo(256 + dir * len * 0.55, y - w * 1.15, 256 + dir * len, y - 18);
      ctx.quadraticCurveTo(256 + dir * len * 0.5, y + w * 0.65, 256, y + 6);
      ctx.closePath();
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * High-detail alpha-cutout botanical leaf-cluster card for gnarled coastal Pōhutukawa canopy.
 */
export function createPohutukawaClusterTexture(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(512);
  ctx.clearRect(0, 0, 512, 512);

  ctx.strokeStyle = '#3d3129';
  ctx.lineWidth = 5;
  for (let b = 0; b < 7; b++) {
    const a = (b / 6 - 0.5) * 2.1 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(256, 360);
    ctx.lineTo(256 + Math.cos(a) * 170, 260 + Math.sin(a) * 165);
    ctx.stroke();
  }

  for (let i = 0; i < 85; i++) {
    const a = (i * 2.39996) % (Math.PI * 2);
    const rad = Math.sqrt(i / 85) * 185;
    const lx = 256 + Math.cos(a) * rad;
    const ly = 256 + Math.sin(a) * rad * 0.85;
    const rot = a + Math.sin(i * 3.1) * 0.6;
    const lw = 24 + (i % 14);
    const lh = 12 + (i % 7);

    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(rot);
    const shade = i % 3;
    ctx.fillStyle = shade === 0 ? '#273e28' : shade === 1 ? '#365233' : '#4a6144';
    ctx.beginPath();
    ctx.ellipse(0, 0, lw, lh, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(180,196,170,0.28)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-lw * 0.75, 0);
    ctx.lineTo(lw * 0.75, 0);
    ctx.stroke();
    ctx.restore();
  }

  for (let f = 0; f < 5; f++) {
    const fx = 155 + f * 52;
    const fy = 150 + ((f * 37) % 110);
    ctx.strokeStyle = 'rgba(166, 38, 42, 0.85)';
    ctx.lineWidth = 1.6;
    for (let s = 0; s < 14; s++) {
      const sa = (s / 14) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx + Math.cos(sa) * 15, fy + Math.sin(sa) * 15);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Procedural HDR-style equirectangular twilight/golden/day NZ coastal sky map for PMREM IBL reflections.
 */
export function createSkyEnvTexture(hours: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  const isDusk = hours >= 18.0 || hours <= 6.8;
  const isGolden = !isDusk && (hours >= 16.2 || hours <= 8.4);

  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  if (isDusk) {
    grad.addColorStop(0.0, '#1e1c2e');
    grad.addColorStop(0.28, '#463c58');
    grad.addColorStop(0.46, '#b88378');
    grad.addColorStop(0.51, '#f4bc8a');
    grad.addColorStop(0.56, '#485266');
    grad.addColorStop(1.0, '#181c22');
  } else if (isGolden) {
    grad.addColorStop(0.0, '#4f6d96');
    grad.addColorStop(0.32, '#a8b7c9');
    grad.addColorStop(0.48, '#f4d3b0');
    grad.addColorStop(0.53, '#fce3c2');
    grad.addColorStop(0.58, '#667582');
    grad.addColorStop(1.0, '#2a332a');
  } else {
    grad.addColorStop(0.0, '#4a7cb8');
    grad.addColorStop(0.35, '#9ec3e6');
    grad.addColorStop(0.50, '#e3eef7');
    grad.addColorStop(0.55, '#7a95a8');
    grad.addColorStop(1.0, '#364431');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  const sunX = 240 + ((hours - 6) / 14) * 560;
  const sunY = isDusk ? 248 : isGolden ? 220 : 140;
  const sunGrad = ctx.createRadialGradient(sunX, sunY, 6, sunX, sunY, 130);
  sunGrad.addColorStop(0, 'rgba(255, 245, 224, 0.95)');
  sunGrad.addColorStop(0.25, isDusk ? 'rgba(255, 182, 128, 0.55)' : 'rgba(255, 238, 200, 0.45)');
  sunGrad.addColorStop(1, 'rgba(255, 200, 150, 0)');
  ctx.fillStyle = sunGrad;
  ctx.fillRect(0, 0, 1024, 512);

  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Soft radial ambient-occlusion contact shadow texture placed beneath sculpted
 * Scandinavian furniture pieces so they sit physically grounded on the oak floor.
 */
export function createSoftContactShadowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 256);
  const grad = ctx.createRadialGradient(128, 128, 18, 128, 128, 122);
  grad.addColorStop(0, 'rgba(20, 14, 10, 0.42)');
  grad.addColorStop(0.55, 'rgba(20, 14, 10, 0.18)');
  grad.addColorStop(1, 'rgba(20, 14, 10, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}
