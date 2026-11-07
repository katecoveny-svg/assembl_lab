// Renders the lab home's point-cloud stills (lab/pc/stills/*.webp) with the shared engine, in headless Chromium.
//   python3 -m http.server 8766   (from the repo root, in another shell)
//   node tools/pointcloud/stills.cjs [only-this-id …]        then: python3 tools/pointcloud/webp.py
// Needs Playwright (npm i -D playwright, or a global install). Sources are the lab's own renders and posters, never third-party footage.
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const OUT = path.resolve(__dirname, '../../lab/pc/stills'), BASE = process.env.LAB_URL || 'http://localhost:8766';
const P = (id, src, w = 1206, h = 824, extra = {}) => ({ id, kind: 'image', src, w, h, ...extra });
const JOBS = [
  { id: 'jump-sims', kind: 'glb', src: '/assets/models/cafe/cafe-venue.glb', w: 800, h: 500 }, { id: 'jump-study', kind: 'glb', src: '/assets/models/windtunnel/windtunnel.glb', w: 800, h: 500, rot: 0.75, camY: 0.6, lookY: 0.12 },
  { id: 'jump-architecture', kind: 'hall', w: 800, h: 500 }, { id: 'jump-play', kind: 'knot', w: 800, h: 500 },
  // Plan Studio landing: the hero fallback, the model step and the three social formats (the same views the point-cloud page exports)
  { id: 'ps-hero', kind: 'hall', w: 1600, h: 1000, rot: 0.62, scale: 1.3, n: 180000, sizeScale: 1.45 }, { id: 'ps-model', kind: 'hall', w: 1600, h: 900, rot: 0.9, camY: 1.5, lookY: 0.1, scale: 1.2, n: 180000, sizeScale: 1.45 },
  { id: 'ps-reel', kind: 'hall', w: 1080, h: 1920, rot: 0.6, camY: 1.1, camZ: 3.6, lookY: 0.16, scale: 0.5, n: 180000, sizeScale: 1.3 }, { id: 'ps-feed', kind: 'hall', w: 1080, h: 1350, rot: -0.55, camY: 0.95, lookY: 0.18, scale: 0.68, n: 180000, sizeScale: 1.35 },
  { id: 'ps-square', kind: 'hall', w: 1080, h: 1080, rot: 1.2, camY: 0.75, lookY: 0.22, scale: 0.98, n: 180000, sizeScale: 1.35 },
];
(async () => {
  const only = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1600, height: 1000 } }); p.on('pageerror', (e) => console.error('page error:', e.message));
  await p.goto(BASE + '/tools/pointcloud/stills.html'); await p.waitForFunction(() => window.ready, null, { timeout: 60000 });
  for (const j of JOBS.filter((j) => !only.length || only.includes(j.id))) {
    const url = await p.evaluate((job) => window.renderStill(job), j);
    fs.writeFileSync(path.join(OUT, j.id + '.png'), Buffer.from(url.split(',')[1], 'base64')); console.log('rendered', j.id);
  }
  await b.close();
})();
