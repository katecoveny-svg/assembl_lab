// Generates a realistic 1920×1080 NZ Coastal Backyard Sample Photo data URL
// so Photo Backdrop mode (?mode=photo) works immediately before uploading a custom photo.

export function buildSampleBackyardPhotoDataUrl() {
  const W = 1920, H = 1080;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');

  // Crisp Waitematā coastal afternoon sky gradient
  const sky = g.createLinearGradient(0, 0, 0, H * 0.50);
  sky.addColorStop(0, '#5A8CC2');
  sky.addColorStop(0.55, '#9BC2E0');
  sky.addColorStop(1, '#E6EFEF');
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H * 0.52);

  // Soft coastal cumulus clouds
  g.fillStyle = 'rgba(255, 253, 250, 0.55)';
  for (const [cx, cy, rx, ry] of [
    [340, 170, 210, 42], [450, 155, 140, 34],
    [1360, 140, 260, 48], [1510, 165, 165, 36],
    [920, 220, 180, 28],
  ]) {
    g.beginPath();
    g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
  }

  // Distant Rangitoto Island silhouette & Waitematā harbour water
  const horizonY = Math.round(H * 0.45);
  g.fillStyle = '#738C9E';
  g.beginPath();
  g.moveTo(W * 0.44, horizonY);
  g.quadraticCurveTo(W * 0.58, horizonY - 62, W * 0.68, horizonY - 96);
  g.lineTo(W * 0.72, horizonY - 90);
  g.quadraticCurveTo(W * 0.80, horizonY - 56, W * 0.94, horizonY);
  g.closePath();
  g.fill();

  const sea = g.createLinearGradient(0, horizonY, 0, horizonY + 86);
  sea.addColorStop(0, '#6A94AE');
  sea.addColorStop(1, '#4C748C');
  g.fillStyle = sea;
  g.fillRect(0, horizonY, W, 86);

  // Architectural cedar boundary paling fence along mid-backyard
  const fenceTop = horizonY + 18;
  const fenceBot = horizonY + 135;
  g.fillStyle = '#755A44';
  g.fillRect(0, fenceTop, W * 0.62, fenceBot - fenceTop);
  g.strokeStyle = 'rgba(42, 28, 18, 0.35)';
  g.lineWidth = 2;
  for (let x = 0; x < W * 0.62; x += 26) {
    g.beginPath();
    g.moveTo(x, fenceTop);
    g.lineTo(x, fenceBot);
    g.stroke();
  }
  // Capping rail
  g.fillStyle = '#5C4432';
  g.fillRect(0, fenceTop - 6, W * 0.62, 10);

  // Contemporary dark timber weatherboard house corner on left
  g.fillStyle = '#2B282A';
  g.fillRect(0, 120, 340, fenceBot - 40);
  g.strokeStyle = 'rgba(255,255,255,0.06)';
  g.lineWidth = 2;
  for (let y = 140; y < fenceBot - 40; y += 22) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(340, y);
    g.stroke();
  }
  // Warm illuminated window glow
  g.fillStyle = '#D4CFC7';
  g.fillRect(60, 210, 195, 210);
  g.strokeStyle = '#1E1C1E';
  g.lineWidth = 10;
  g.strokeRect(60, 210, 195, 210);

  // Sunlit coastal lawn slope (foreground ground plane where user brushes 3D gardens!)
  const lawn = g.createLinearGradient(0, fenceBot - 20, 0, H);
  lawn.addColorStop(0, '#5F7A3F');
  lawn.addColorStop(0.45, '#526D34');
  lawn.addColorStop(1, '#3E5526');
  g.fillStyle = lawn;
  g.fillRect(0, fenceBot - 20, W, H - (fenceBot - 20));

  // Subtle organic grass texture variation
  let s = 88;
  const rnd = () => ((s = (s * 48271) % 2147483647) / 2147483647);
  for (let i = 0; i < 4200; i++) {
    const x = rnd() * W;
    const y = fenceBot - 15 + rnd() * (H - fenceBot + 15);
    const depth = (y - fenceBot) / (H - fenceBot);
    g.fillStyle = rnd() > 0.5 ? 'rgba(132, 158, 86, 0.16)' : 'rgba(38, 56, 22, 0.16)';
    g.fillRect(x, y, 4 + depth * 18, 2 + depth * 4);
  }

  // Warm Kwila timber deck corner in bottom-left foreground
  g.fillStyle = '#75492D';
  g.beginPath();
  g.moveTo(0, H - 220);
  g.lineTo(540, H - 155);
  g.lineTo(420, H);
  g.lineTo(0, H);
  g.closePath();
  g.fill();
  g.strokeStyle = 'rgba(32, 16, 8, 0.45)';
  g.lineWidth = 3;
  for (let k = 1; k < 9; k++) {
    const t = k / 9;
    g.beginPath();
    g.moveTo(0, H - 220 + t * 220);
    g.lineTo(540 - t * 120, H - 155 + t * 155);
    g.stroke();
  }

  return c.toDataURL('image/jpeg', 0.88);
}
