import * as THREE from 'three';

function makeSeededRand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function makeCanvasTexture(drawFn, size = 512, repeat = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.repeat.set(repeat, repeat);
  tex.needsUpdate = true;
  return tex;
}

export function createNZSurfaceTextures() {
  // 0: NZ Ryegrass & Clover Lawn
  const lawn = makeCanvasTexture((ctx, S) => {
    const rand = makeSeededRand(101);
    ctx.fillStyle = '#3e5e2c';
    ctx.fillRect(0, 0, S, S);
    // Subtle earthy soil undertones
    for (let i = 0; i < 600; i++) {
      const x = rand() * S;
      const y = rand() * S;
      const r = 8 + rand() * 24;
      ctx.fillStyle = rand() > 0.5 ? 'rgba(54,84,36,0.22)' : 'rgba(78,108,46,0.18)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Fine directional ryegrass blades
    for (let i = 0; i < 8500; i++) {
      const x = rand() * S;
      const y = rand() * S;
      const len = 5 + rand() * 14;
      const ang = (rand() - 0.5) * 1.4 - Math.PI * 0.5;
      const g = Math.floor(85 + rand() * 62);
      const r = Math.floor(g * (0.58 + rand() * 0.16));
      const b = Math.floor(g * (0.34 + rand() * 0.12));
      ctx.strokeStyle = `rgba(${r},${g},${b},${0.45 + rand() * 0.45})`;
      ctx.lineWidth = 0.8 + rand() * 1.1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      ctx.stroke();
    }
  });

  // 1: Daltons Black Bark Mulch (rich organic dark composted bark chips)
  const mulch = makeCanvasTexture((ctx, S) => {
    const rand = makeSeededRand(202);
    ctx.fillStyle = '#1b1512';
    ctx.fillRect(0, 0, S, S);
    // Fine dark humus base
    for (let i = 0; i < 2500; i++) {
      const x = rand() * S;
      const y = rand() * S;
      const v = 18 + Math.floor(rand() * 24);
      ctx.fillStyle = `rgb(${v + 7},${v + 2},${v})`;
      ctx.fillRect(x, y, 3, 3);
    }
    // Layered bark chips with shadow and highlight rim
    for (let i = 0; i < 1600; i++) {
      const x = rand() * S;
      const y = rand() * S;
      const w = 8 + rand() * 22;
      const h = 4 + rand() * 9;
      const ang = rand() * Math.PI;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      // Drop shadow
      ctx.fillStyle = 'rgba(8,5,4,0.65)';
      ctx.fillRect(-w * 0.5 + 1.5, -h * 0.5 + 1.5, w, h);
      // Chip body (deep espresso/charcoal brown)
      const tone = Math.floor(26 + rand() * 34);
      const warm = Math.floor(rand() * 14);
      ctx.fillStyle = `rgb(${tone + 12 + warm},${tone + 5 + Math.floor(warm * 0.5)},${tone})`;
      ctx.beginPath();
      ctx.roundRect(-w * 0.5, -h * 0.5, w, h, 2);
      ctx.fill();
      // Subtle fibrous grain line
      ctx.strokeStyle = `rgba(${tone + 34},${tone + 20},${tone + 12},0.35)`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-w * 0.35, 0);
      ctx.lineTo(w * 0.35, 0);
      ctx.stroke();
      ctx.restore();
    }
  });

  // 2: Firth Piazza 50 Concrete Pavers — Black Sands (400×200 running bond)
  const pavers = makeCanvasTexture((ctx, S) => {
    const rand = makeSeededRand(303);
    ctx.fillStyle = '#252729'; // Mortar/sand joint
    ctx.fillRect(0, 0, S, S);
    const cols = 4;
    const rows = 8;
    const pw = S / cols;
    const ph = S / rows;
    const gap = 3.5;

    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * (pw * 0.5);
      for (let c = -1; c <= cols; c++) {
        const x = c * pw + offset + gap * 0.5;
        const y = r * ph + gap * 0.5;
        const w = pw - gap;
        const h = ph - gap;
        const base = 60 + Math.floor((rand() - 0.5) * 14);
        ctx.fillStyle = `rgb(${base},${base + 2},${base + 5})`;
        ctx.fillRect(x, y, w, h);
        // Subtle bevel highlight top/left
        ctx.strokeStyle = `rgba(145,152,160,0.22)`;
        ctx.lineWidth = 1.2;
        ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
        // Fine volcanic black-sands aggregate speckle
        for (let k = 0; k < 55; k++) {
          const sx = x + 2 + rand() * (w - 4);
          const sy = y + 2 + rand() * (h - 4);
          const v = base + Math.floor((rand() - 0.5) * 32);
          ctx.fillStyle = `rgba(${v},${v + 1},${v + 3},0.55)`;
          ctx.fillRect(sx, sy, 1.5, 1.5);
        }
      }
    }
  });

  // 3: Waikato Coarse River Pebbles (20–40mm smooth multi-tone NZ riverstones)
  const pebbles = makeCanvasTexture((ctx, S) => {
    const rand = makeSeededRand(404);
    ctx.fillStyle = '#33312c';
    ctx.fillRect(0, 0, S, S);
    const palettes = [
      [135, 132, 124], [108, 104, 96], [156, 149, 136],
      [90, 94, 98], [148, 134, 112], [118, 115, 108], [76, 75, 72]
    ];
    for (let i = 0; i < 950; i++) {
      const x = rand() * S;
      const y = rand() * S;
      const rx = 5 + rand() * 11;
      const ry = 4 + rand() * 8;
      const ang = rand() * Math.PI;
      const col = palettes[Math.floor(rand() * palettes.length)];
      const shade = 0.84 + rand() * 0.3;
      const drawStone = (ox, oy) => {
        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(ang);
        ctx.fillStyle = 'rgba(12,11,10,0.55)';
        ctx.beginPath();
        ctx.ellipse(1.5, 1.8, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        const grad = ctx.createRadialGradient(-rx * 0.25, -ry * 0.25, 1, 0, 0, Math.max(rx, ry));
        grad.addColorStop(0, `rgb(${Math.min(255, col[0] * shade + 24)},${Math.min(255, col[1] * shade + 22)},${Math.min(255, col[2] * shade + 18)})`);
        grad.addColorStop(1, `rgb(${Math.floor(col[0] * shade * 0.72)},${Math.floor(col[1] * shade * 0.72)},${Math.floor(col[2] * shade * 0.72)})`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };
      drawStone(x, y);
      // Seamless wrap near edges
      if (x < 20) drawStone(x + S, y);
      if (x > S - 20) drawStone(x - S, y);
      if (y < 20) drawStone(x, y + S);
      if (y > S - 20) drawStone(x, y - S);
    }
  });

  // 4: Central Otago Schist Flagstone (irregular split mica-grey & warm gold slabs)
  const schist = makeCanvasTexture((ctx, S) => {
    const rand = makeSeededRand(505);
    ctx.fillStyle = '#383630';
    ctx.fillRect(0, 0, S, S);
    // Voronoi-like organic stone slabs
    const pts = [];
    const n = 22;
    for (let i = 0; i < n; i++) {
      pts.push({
        x: rand() * S,
        y: rand() * S,
        r: 108 + Math.floor((rand() - 0.5) * 32),
        g: 105 + Math.floor((rand() - 0.5) * 28),
        b: 94 + Math.floor((rand() - 0.5) * 24),
        gold: rand() > 0.65 ? 16 : 0
      });
    }
    const img = ctx.getImageData(0, 0, S, S);
    const d = img.data;
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        let d1 = 1e9, d2 = 1e9, best = pts[0];
        for (let i = 0; i < n; i++) {
          let dx = Math.abs(x - pts[i].x);
          let dy = Math.abs(y - pts[i].y);
          if (dx > S * 0.5) dx = S - dx;
          if (dy > S * 0.5) dy = S - dy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < d1) { d2 = d1; d1 = dist; best = pts[i]; }
          else if (dist < d2) { d2 = dist; }
        }
        const edge = d2 - d1;
        const idx = (y * S + x) * 4;
        if (edge < 4.5) {
          d[idx] = 46; d[idx + 1] = 44; d[idx + 2] = 39; d[idx + 3] = 255;
        } else {
          const grain = Math.sin(x * 0.14 + y * 0.05) * 7 + (rand() - 0.5) * 14;
          const sheen = edge < 9 ? 10 : 0;
          d[idx] = Math.max(0, Math.min(255, best.r + best.gold + grain + sheen));
          d[idx + 1] = Math.max(0, Math.min(255, best.g + best.gold * 0.7 + grain + sheen));
          d[idx + 2] = Math.max(0, Math.min(255, best.b + grain + sheen));
          d[idx + 3] = 255;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
  });

  // 5: Kwila Hardwood Decking (140mm architectural boards)
  const kwila = makeCanvasTexture((ctx, S) => {
    const rand = makeSeededRand(606);
    ctx.fillStyle = '#1c100a';
    ctx.fillRect(0, 0, S, S);
    const boards = 8;
    const bh = S / boards;
    const gap = 3.5;
    for (let b = 0; b < boards; b++) {
      const y = b * bh + gap * 0.5;
      const h = bh - gap;
      const tone = (rand() - 0.5) * 20;
      const r = Math.floor(114 + tone);
      const g = Math.floor(64 + tone * 0.6);
      const bl = Math.floor(39 + tone * 0.4);
      ctx.fillStyle = `rgb(${r},${g},${bl})`;
      ctx.fillRect(0, y, S, h);
      // Longitudinal hardwood grain streaks
      for (let i = 0; i < 65; i++) {
        const gy = y + rand() * h;
        const alpha = 0.06 + rand() * 0.14;
        ctx.strokeStyle = rand() > 0.5 ? `rgba(52,24,10,${alpha})` : `rgba(165,104,66,${alpha})`;
        ctx.lineWidth = 0.7 + rand() * 1.4;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.bezierCurveTo(S * 0.33, gy + (rand() - 0.5) * 3, S * 0.66, gy + (rand() - 0.5) * 3, S, gy);
        ctx.stroke();
      }
      // Subtle board bevel highlight
      ctx.fillStyle = 'rgba(205,148,108,0.16)';
      ctx.fillRect(0, y, S, 1.5);
    }
  });

  return { lawn, mulch, pavers, pebbles, schist, kwila };
}
