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

function drawWrapped(S, x, y, margin, drawAt) {
  drawAt(x, y);
  if (x < margin) drawAt(x + S, y);
  if (x > S - margin) drawAt(x - S, y);
  if (y < margin) drawAt(x, y + S);
  if (y > S - margin) drawAt(x, y - S);
}

/**
 * 11 Authentic Aotearoa NZ Landscape Surface Textures (Channels 0–10 across 3 RGBA splatmaps).
 */
export function createNZSurfaceTextures() {
  // 0: Natural sunlit spring/summer NZ Ryegrass & White Clover Lawn
  const lawn = makeCanvasTexture((ctx, S) => {
    const rand = makeSeededRand(101);
    ctx.fillStyle = '#4e7535';
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 680; i++) {
      const x = rand() * S;
      const y = rand() * S;
      const r = 10 + rand() * 28;
      ctx.fillStyle = rand() > 0.5 ? 'rgba(66,102,44,0.26)' : 'rgba(104,142,64,0.22)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 9400; i++) {
      const x = rand() * S;
      const y = rand() * S;
      const len = 5 + rand() * 13;
      const ang = (rand() - 0.5) * 1.4 - Math.PI * 0.5;
      const g = Math.floor(96 + rand() * 54);
      const r = Math.floor(g * (0.64 + rand() * 0.14));
      const b = Math.floor(g * (0.34 + rand() * 0.10));
      ctx.strokeStyle = `rgba(${r},${g},${b},${0.45 + rand() * 0.45})`;
      ctx.lineWidth = 0.8 + rand() * 1.0;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      ctx.stroke();
    }
    // Subtle natural white clover flecks
    for (let i = 0; i < 90; i++) {
      const x = rand() * S;
      const y = rand() * S;
      ctx.fillStyle = 'rgba(232,238,214,0.26)';
      ctx.beginPath();
      ctx.arc(x, y, 1.3 + rand() * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // 1: Daltons Black Bark Mulch (deep rich composted bark chips)
  const mulch = makeCanvasTexture((ctx, S) => {
    const rand = makeSeededRand(202);
    ctx.fillStyle = '#120e0b';
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 2600; i++) {
      const x = rand() * S;
      const y = rand() * S;
      const v = 13 + Math.floor(rand() * 18);
      ctx.fillStyle = `rgb(${v + 6},${v + 2},${v})`;
      ctx.fillRect(x, y, 3, 3);
    }
    for (let i = 0; i < 1750; i++) {
      const x = rand() * S;
      const y = rand() * S;
      const w = 8 + rand() * 22;
      const h = 4 + rand() * 9;
      const ang = rand() * Math.PI;
      const tone = Math.floor(19 + rand() * 24);
      const warm = Math.floor(rand() * 11);
      drawWrapped(S, x, y, 22, (ox, oy) => {
        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(ang);
        ctx.fillStyle = 'rgba(5,3,2,0.72)';
        ctx.fillRect(-w * 0.5 + 1.5, -h * 0.5 + 1.5, w, h);
        ctx.fillStyle = `rgb(${tone + 10 + warm},${tone + 4 + Math.floor(warm * 0.5)},${tone})`;
        ctx.beginPath();
        ctx.roundRect(-w * 0.5, -h * 0.5, w, h, 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(${tone + 26},${tone + 16},${tone + 9},0.30)`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-w * 0.35, 0);
        ctx.lineTo(w * 0.35, 0);
        ctx.stroke();
        ctx.restore();
      });
    }
  });

  // 2: Pine Bark Nuggets (20–40 mm warm reddish-brown radiata bark)
  const pine_bark = makeCanvasTexture((ctx, S) => {
    const rand = makeSeededRand(212);
    ctx.fillStyle = '#24140c';
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 1200; i++) {
      const x = rand() * S;
      const y = rand() * S;
      const w = 14 + rand() * 24;
      const h = 9 + rand() * 15;
      const ang = rand() * Math.PI;
      const r = 74 + Math.floor(rand() * 44);
      const g = 42 + Math.floor(rand() * 26);
      const b = 26 + Math.floor(rand() * 16);
      drawWrapped(S, x, y, 26, (ox, oy) => {
        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(ang);
        ctx.fillStyle = 'rgba(10,5,2,0.68)';
        ctx.beginPath();
        ctx.roundRect(-w * 0.5 + 2, -h * 0.5 + 2, w, h, 5);
        ctx.fill();
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.beginPath();
        ctx.roundRect(-w * 0.5, -h * 0.5, w, h, 5);
        ctx.fill();
        ctx.strokeStyle = `rgba(${Math.min(255, r + 32)},${Math.min(255, g + 22)},${Math.min(255, b + 14)},0.34)`;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(-w * 0.32, -h * 0.12);
        ctx.lineTo(w * 0.32, h * 0.12);
        ctx.stroke();
        ctx.restore();
      });
    }
  });

  // 3: Arborist Natural Woodchip
  const woodchip = makeCanvasTexture((ctx, S) => {
    const rand = makeSeededRand(222);
    ctx.fillStyle = '#3c2e1f';
    ctx.fillRect(0, 0, S, S);
    const palettes = [
      [158, 128, 92], [134, 102, 68], [176, 148, 108],
      [108, 82, 54], [146, 118, 84], [92, 70, 48],
    ];
    for (let i = 0; i < 2100; i++) {
      const x = rand() * S;
      const y = rand() * S;
      const w = 10 + rand() * 24;
      const h = 3.5 + rand() * 7.5;
      const ang = rand() * Math.PI;
      const col = palettes[Math.floor(rand() * palettes.length)];
      const shade = 0.85 + rand() * 0.3;
      drawWrapped(S, x, y, 22, (ox, oy) => {
        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(ang);
        ctx.fillStyle = 'rgba(20,14,8,0.55)';
        ctx.fillRect(-w * 0.5 + 1.2, -h * 0.5 + 1.2, w, h);
        ctx.fillStyle = `rgb(${Math.min(255, Math.floor(col[0] * shade))},${Math.min(255, Math.floor(col[1] * shade))},${Math.min(255, Math.floor(col[2] * shade))})`;
        ctx.fillRect(-w * 0.5, -h * 0.5, w, h);
        ctx.restore();
      });
    }
  });

  // 4: Canterbury Greywacke Chip (10–20 mm angular crushed blue-grey quarry chip)
  const greywacke = makeCanvasTexture((ctx, S) => {
    const rand = makeSeededRand(414);
    ctx.fillStyle = '#2d3034';
    ctx.fillRect(0, 0, S, S);
    const palettes = [
      [88, 92, 98], [72, 76, 82], [116, 120, 126],
      [138, 142, 148], [62, 66, 70], [102, 104, 106], [156, 160, 165],
    ];
    for (let i = 0; i < 2400; i++) {
      const x = rand() * S;
      const y = rand() * S;
      const r = 4.2 + rand() * 6.8;
      const sides = 4 + Math.floor(rand() * 3);
      const baseAng = rand() * Math.PI * 2;
      const col = palettes[Math.floor(rand() * palettes.length)];
      const shade = 0.82 + rand() * 0.34;
      const pts = [];
      for (let s = 0; s < sides; s++) {
        const a = baseAng + (s / sides) * Math.PI * 2 + (rand() - 0.5) * 0.45;
        const rad = r * (0.68 + rand() * 0.52);
        pts.push([Math.cos(a) * rad, Math.sin(a) * rad]);
      }
      drawWrapped(S, x, y, 16, (ox, oy) => {
        ctx.save();
        ctx.translate(ox, oy);
        ctx.fillStyle = 'rgba(12,14,16,0.62)';
        ctx.beginPath();
        ctx.moveTo(pts[0][0] + 1.2, pts[0][1] + 1.4);
        for (let s = 1; s < sides; s++) ctx.lineTo(pts[s][0] + 1.2, pts[s][1] + 1.4);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = `rgb(${Math.min(255, Math.floor(col[0] * shade))},${Math.min(255, Math.floor(col[1] * shade))},${Math.min(255, Math.floor(col[2] * shade))})`;
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let s = 1; s < sides; s++) ctx.lineTo(pts[s][0], pts[s][1]);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = `rgba(220,226,235,${0.14 + rand() * 0.22})`;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        ctx.lineTo(pts[1][0], pts[1][1]);
        ctx.stroke();
        ctx.restore();
      });
    }
  });

  // 5: Oamaru / Lime Chip Path (crushed warm cream limestone)
  const limestone = makeCanvasTexture((ctx, S) => {
    const rand = makeSeededRand(515);
    ctx.fillStyle = '#9e9b92';
    ctx.fillRect(0, 0, S, S);
    const palettes = [
      [226, 224, 216], [212, 208, 198], [238, 236, 230],
      [196, 193, 184], [220, 218, 212], [182, 179, 170],
    ];
    for (let i = 0; i < 2200; i++) {
      const x = rand() * S;
      const y = rand() * S;
      const r = 4.5 + rand() * 7.2;
      const sides = 4 + Math.floor(rand() * 3);
      const baseAng = rand() * Math.PI * 2;
      const col = palettes[Math.floor(rand() * palettes.length)];
      const pts = [];
      for (let s = 0; s < sides; s++) {
        const a = baseAng + (s / sides) * Math.PI * 2 + (rand() - 0.5) * 0.42;
        const rad = r * (0.7 + rand() * 0.48);
        pts.push([Math.cos(a) * rad, Math.sin(a) * rad]);
      }
      drawWrapped(S, x, y, 16, (ox, oy) => {
        ctx.save();
        ctx.translate(ox, oy);
        ctx.fillStyle = 'rgba(72,68,60,0.42)';
        ctx.beginPath();
        ctx.moveTo(pts[0][0] + 1.2, pts[0][1] + 1.4);
        for (let s = 1; s < sides; s++) ctx.lineTo(pts[s][0] + 1.2, pts[s][1] + 1.4);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let s = 1; s < sides; s++) ctx.lineTo(pts[s][0], pts[s][1]);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });
    }
  });

  // 6: Waikato River Pebble (20–40 mm smooth multi-tone NZ riverstones)
  const pebbles = makeCanvasTexture((ctx, S) => {
    const rand = makeSeededRand(404);
    ctx.fillStyle = '#2c2a26';
    ctx.fillRect(0, 0, S, S);
    const palettes = [
      [130, 127, 120], [104, 100, 92], [150, 144, 132],
      [88, 92, 96], [142, 129, 108], [114, 111, 104], [74, 73, 70],
    ];
    for (let i = 0; i < 950; i++) {
      const x = rand() * S;
      const y = rand() * S;
      const rx = 5 + rand() * 11;
      const ry = 4 + rand() * 8;
      const ang = rand() * Math.PI;
      const col = palettes[Math.floor(rand() * palettes.length)];
      const shade = 0.84 + rand() * 0.3;
      drawWrapped(S, x, y, 20, (ox, oy) => {
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
      });
    }
  });

  // 7: Black Basalt / Polished River Stones
  const black_stones = makeCanvasTexture((ctx, S) => {
    const rand = makeSeededRand(707);
    ctx.fillStyle = '#0d0f11';
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 860; i++) {
      const x = rand() * S;
      const y = rand() * S;
      const rx = 6 + rand() * 11;
      const ry = 4.5 + rand() * 8;
      const ang = rand() * Math.PI;
      const v = 24 + Math.floor(rand() * 24);
      drawWrapped(S, x, y, 20, (ox, oy) => {
        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(ang);
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.beginPath();
        ctx.ellipse(1.6, 2.0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        const grad = ctx.createRadialGradient(-rx * 0.3, -ry * 0.3, 0.8, 0, 0, Math.max(rx, ry));
        grad.addColorStop(0, `rgb(${v + 56},${v + 60},${v + 66})`);
        grad.addColorStop(0.35, `rgb(${v + 12},${v + 14},${v + 18})`);
        grad.addColorStop(1, `rgb(${Math.max(8, v - 12)},${Math.max(9, v - 11)},${Math.max(11, v - 9)})`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }
  });

  // 8: Firth Piazza 50 Concrete Pavers — Black Sands (400×200 running bond)
  const pavers = makeCanvasTexture((ctx, S) => {
    const rand = makeSeededRand(303);
    ctx.fillStyle = '#252729';
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
        const base = 58 + Math.floor((rand() - 0.5) * 14);
        ctx.fillStyle = `rgb(${base},${base + 2},${base + 5})`;
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = 'rgba(145,152,160,0.22)';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
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

  // 9: Central Otago Schist Flagstone
  const schist = makeCanvasTexture((ctx, S) => {
    const rand = makeSeededRand(505);
    ctx.fillStyle = '#34322c';
    ctx.fillRect(0, 0, S, S);
    const pts = [];
    const n = 22;
    for (let i = 0; i < n; i++) {
      pts.push({
        x: rand() * S,
        y: rand() * S,
        r: 104 + Math.floor((rand() - 0.5) * 32),
        g: 101 + Math.floor((rand() - 0.5) * 28),
        b: 90 + Math.floor((rand() - 0.5) * 24),
        gold: rand() > 0.65 ? 16 : 0,
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
          d[idx] = 44; d[idx + 1] = 42; d[idx + 2] = 37; d[idx + 3] = 255;
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

  // 10: Weathered Kwila Hardwood Decking (140 mm architectural boards)
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
      const r = Math.floor(108 + tone);
      const g = Math.floor(60 + tone * 0.6);
      const bl = Math.floor(36 + tone * 0.4);
      ctx.fillStyle = `rgb(${r},${g},${bl})`;
      ctx.fillRect(0, y, S, h);
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
      ctx.fillStyle = 'rgba(205,148,108,0.16)';
      ctx.fillRect(0, y, S, 1.5);
    }
  });

  return {
    lawn, mulch, pine_bark, woodchip,
    greywacke, limestone, pebbles, black_stones,
    pavers, schist, kwila,
  };
}

/**
 * Draw a razor-sharp 2048px 1:100 NZ Coastal Architectural Site Plan directly onto a Canvas
 * so users in Plan / Site-Plan Brush mode can paint 3D garden beds straight onto an architectural sheet.
 */
export function drawSampleSitePlanToCanvas(canvas, terrainSize = 34) {
  const S = canvas.width || 2048;
  const ctx = canvas.getContext('2d');
  const pxPerM = S / terrainSize;
  const toX = (wx) => (wx + terrainSize * 0.5) * pxPerM;
  const toY = (wz) => (wz + terrainSize * 0.5) * pxPerM;

  ctx.fillStyle = '#FBF9F5';
  ctx.fillRect(0, 0, S, S);

  // 1 m subtle metric architectural grid
  ctx.strokeStyle = 'rgba(36, 11, 33, 0.055)';
  ctx.lineWidth = 1.2;
  for (let m = -Math.floor(terrainSize / 2); m <= Math.floor(terrainSize / 2); m++) {
    const x = toX(m);
    const y = toY(m);
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(S, y); ctx.stroke();
  }

  // Legal Cadastral Boundary (dashed architectural line)
  const bx0 = toX(-15), by0 = toY(-15), bw = 30 * pxPerM, bh = 30 * pxPerM;
  ctx.save();
  ctx.strokeStyle = '#240B21';
  ctx.lineWidth = 4;
  ctx.setLineDash([20, 10, 5, 10]);
  ctx.strokeRect(bx0, by0, bw, bh);
  ctx.restore();

  // Soft setback line (2.5 m)
  ctx.save();
  ctx.strokeStyle = 'rgba(145, 106, 112, 0.45)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 10]);
  ctx.strokeRect(toX(-12.5), toY(-12.5), 25 * pxPerM, 25 * pxPerM);
  ctx.restore();

  // Contours (0.5 m dashed topo lines)
  ctx.save();
  ctx.strokeStyle = 'rgba(101, 74, 78, 0.24)';
  ctx.lineWidth = 1.8;
  for (let i = -3; i <= 4; i++) {
    ctx.beginPath();
    for (let wx = -15; wx <= 15; wx += 1.5) {
      const wz = i * 3.6 + Math.sin(wx * 0.2 + i) * 1.4;
      const px = toX(wx), py = toY(wz);
      if (wx === -15) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();

  // Coastal Pavilion Architectural Footprint & Rooms
  ctx.fillStyle = '#EFE9E1';
  ctx.strokeStyle = '#240B21';
  ctx.lineWidth = 4.5;
  ctx.fillRect(toX(-12.8), toY(-12.8), 15.2 * pxPerM, 5.2 * pxPerM);
  ctx.strokeRect(toX(-12.8), toY(-12.8), 15.2 * pxPerM, 5.2 * pxPerM);

  // Kwila Deck hatched zone
  ctx.fillStyle = '#E8DCCB';
  ctx.fillRect(toX(-7.8), toY(-7.6), 9.8 * pxPerM, 3.2 * pxPerM);
  ctx.strokeStyle = '#7A5C3C';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(toX(-7.8), toY(-7.6), 9.8 * pxPerM, 3.2 * pxPerM);
  for (let z = -7.4; z <= -4.5; z += 0.28) {
    ctx.beginPath();
    ctx.moveTo(toX(-7.8), toY(z));
    ctx.lineTo(toX(2.0), toY(z));
    ctx.strokeStyle = 'rgba(122, 92, 60, 0.25)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  // Pool zone outline
  ctx.fillStyle = 'rgba(56, 178, 208, 0.18)';
  ctx.strokeStyle = '#0E5B78';
  ctx.lineWidth = 3;
  ctx.fillRect(toX(3.55), toY(-9.05), 4.5 * pxPerM, 2.5 * pxPerM);
  ctx.strokeRect(toX(3.55), toY(-9.05), 4.5 * pxPerM, 2.5 * pxPerM);

  // Typography annotations
  ctx.fillStyle = '#240B21';
  ctx.font = '600 28px "Instrument Sans", sans-serif';
  ctx.fillText('NZ COASTAL PAVILION — 1:100 SITE PLAN', toX(-14.3), toY(-13.6));
  ctx.font = '500 22px "IBM Plex Mono", monospace';
  ctx.fillStyle = '#654A4E';
  ctx.fillText('LIVING PAVILION (FFL 14.20)', toX(-5.2), toY(-10.1));
  ctx.fillText('KWILA DECK', toX(-4.6), toY(-5.8));
  ctx.fillText('PLUNGE POOL', toX(3.9), toY(-7.6));
  ctx.fillText('NORTH ↑ · LOT 30.0 × 30.0 m (900 m²)', toX(-14.3), toY(14.3));

  // Scale bar (0 — 5 m — 10 m)
  const sbX = toX(4.5), sbY = toY(14.1);
  ctx.fillStyle = '#240B21';
  ctx.fillRect(sbX, sbY, 5 * pxPerM, 10);
  ctx.strokeStyle = '#240B21';
  ctx.lineWidth = 2;
  ctx.strokeRect(sbX, sbY, 10 * pxPerM, 10);
  ctx.font = '500 20px "IBM Plex Mono", monospace';
  ctx.fillText('0m', sbX, sbY - 8);
  ctx.fillText('5m', sbX + 5 * pxPerM - 12, sbY - 8);
  ctx.fillText('10m', sbX + 10 * pxPerM - 18, sbY - 8);
}

/**
 * Generates a bright sunlit NZ coastal backyard sample photo data URL for instant 1-click Photo Match testing.
 */
export function buildSampleBackyardPhotoDataUrl() {
  const W = 1280, H = 720;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');

  // Crisp NZ coastal sky
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.48);
  sky.addColorStop(0, '#5a97d4');
  sky.addColorStop(0.6, '#9fc7e8');
  sky.addColorStop(1, '#dcebf7');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H * 0.50);

  // Distant Hauraki Gulf headland silhouettes
  ctx.fillStyle = '#7f9aad';
  ctx.beginPath();
  ctx.moveTo(0, H * 0.46);
  ctx.quadraticCurveTo(W * 0.25, H * 0.37, W * 0.52, H * 0.44);
  ctx.quadraticCurveTo(W * 0.80, H * 0.39, W, H * 0.45);
  ctx.lineTo(W, H * 0.52);
  ctx.lineTo(0, H * 0.52);
  ctx.closePath();
  ctx.fill();

  // Warm sunlit timber boundary fence
  ctx.fillStyle = '#8b745d';
  ctx.fillRect(0, H * 0.41, W, H * 0.11);
  ctx.strokeStyle = 'rgba(56,42,30,0.35)';
  ctx.lineWidth = 2;
  for (let x = 0; x < W; x += 28) {
    ctx.beginPath(); ctx.moveTo(x, H * 0.41); ctx.lineTo(x, H * 0.52); ctx.stroke();
  }

  // Sunlit coastal lawn foreground
  const grass = ctx.createLinearGradient(0, H * 0.50, 0, H);
  grass.addColorStop(0, '#6a8f46');
  grass.addColorStop(0.5, '#557d36');
  grass.addColorStop(1, '#3e6226');
  ctx.fillStyle = grass;
  ctx.fillRect(0, H * 0.50, W, H * 0.50);

  return c.toDataURL('image/jpeg', 0.88);
}
