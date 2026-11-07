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
