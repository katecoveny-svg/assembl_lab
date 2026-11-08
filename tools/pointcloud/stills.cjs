// Renders the lab home's point-cloud stills (lab/pc/stills/*.webp) with the shared engine, in headless Chromium.
//   python3 -m http.server 8766   (from the repo root, in another shell)
//   node tools/pointcloud/stills.cjs [only-this-id …]        then: python3 tools/pointcloud/webp.py
// Needs Playwright (npm i -D playwright, or a global install). Sources are the lab's own renders and posters, never third-party footage.
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const OUT = path.resolve(__dirname, '../../lab/pc/stills'), BASE = process.env.LAB_URL || 'http://localhost:8766';
const P = (id, src, w = 1206, h = 824, extra = {}) => ({ id, kind: 'image', src, w, h, ...extra });
const MC = { claw: { rot: 0.45, camY: 0.6 }, slushie: { rot: 0.45, camY: 0.6 }, phone: { rot: 0.35, camY: 1.2 }, vinyl: { camY: 1.2 }, house: { rot: 0.7, camY: 1.4 }, windtunnel: { within: 4.2, maxY: 2, rot: 0.75, camY: 0.75 },
  // the Sun, Earth and Moon share the origin in the model (the page moves them): set them out in a line, the star row below by colour
  earthspace: { camY: 0.5, lookY: 0.3, rot: 0, place: { SUN: [-3.6, 0.3, -1.2, 1.25], MOON: [2.1, 0.7, 0.6, 1], STAR_: [null, -2.4, 0.6, 0.32, 0.5] } } };
const JOBS = [
  { id: 'jump-sims', kind: 'glb', src: '/assets/models/cafe/cafe-venue.glb', w: 800, h: 500 }, { id: 'jump-study', kind: 'glb', src: '/assets/models/windtunnel/windtunnel.glb', w: 800, h: 500, rot: 0.75, camY: 0.6, lookY: 0.12 },
  { id: 'jump-architecture', kind: 'hall', w: 800, h: 500 }, { id: 'jump-play', kind: 'knot', w: 800, h: 500 },
  // Plan Studio landing: the hero fallback, the model step and the three social formats (the same views the point-cloud page exports)
  { id: 'ps-hero', kind: 'hall', w: 1600, h: 1000, rot: 0.62, scale: 1.3, n: 180000, sizeScale: 1.45 }, { id: 'ps-model', kind: 'hall', w: 1600, h: 900, rot: 0.9, camY: 1.5, lookY: 0.1, scale: 1.2, n: 180000, sizeScale: 1.45 },
  { id: 'ps-reel', kind: 'hall', w: 1080, h: 1920, rot: 0.6, camY: 1.1, camZ: 3.6, lookY: 0.16, scale: 0.5, n: 180000, sizeScale: 1.3 }, { id: 'ps-feed', kind: 'hall', w: 1080, h: 1350, rot: -0.55, camY: 0.95, lookY: 0.18, scale: 0.68, n: 180000, sizeScale: 1.35 },
  // the lab home: the hero's Auckland (its first paint and no-WebGL picture: on no ground, framed and tilted as the live hero, so
  // the still fades into the live cloud with no seam), the twin cards and Sea State's door
  // three sizes for srcset: retina desktops, desktops, phones; every point the bake has, smaller points as the picture grows
  { id: 'hero-auckland-2x', kind: 'auckland', w: 1760, h: 1320, n: 300000, sizeScale: 1.05, tilt: 0.66, fit: [0.94, 0.94], trim: 0.002, clear: true },
  { id: 'hero-auckland', kind: 'auckland', w: 1280, h: 960, n: 300000, sizeScale: 0.98, tilt: 0.66, fit: [0.94, 0.94], trim: 0.002, clear: true },
  { id: 'hero-auckland-sm', kind: 'auckland', w: 720, h: 540, n: 160000, sizeScale: 0.82, tilt: 0.66, fit: [0.94, 0.94], trim: 0.002, clear: true },   // phones
  ...['store', 'ed', 'dairy', 'energy', 'cars'].map((t) => ({ id: 'twin-' + t, kind: 'twin', w: 1440, h: 900, n: 200000, sizeScale: 1.35, rot: 0.5, camY: 1.15, lookY: 0.12 })),
  { id: 'twin-cafe', kind: 'glb', src: '/assets/models/cafe/cafe-venue.glb', w: 1440, h: 900, n: 220000, sizeScale: 1.35 },
  { id: 'jump-sea', kind: 'sea', w: 800, h: 500, rot: 0.5, camY: 0.9, lookY: 0.08 },
  // the study machines, from each machine's own model (Guess the world is a chart, so its bubbles are drawn in code)
  ...Object.entries({ windtunnel: '/assets/models/windtunnel/windtunnel.glb', earthspace: '/assets/models/earthspace/earthspace.glb', house: '/assets/models/house/house.glb',
    socials: '/assets/models/socials/socials-desk.glb', claw: '/assets/models/claw/claw-atelier.glb', slushie: '/assets/models/slushie/slushie-atelier.glb',
    particles: '/assets/models/particles/particles-apparatus.glb', lines: '/assets/models/lines/lines-tanks.glb', bike: '/assets/models/bike/assembl-bike-atelier-web.glb',
    vinyl: '/assets/models/vinyl/assembl-vinyl-atelier-web.glb', phone: '/assets/models/phone/assembl-phone-atelier-web.glb', heart: '/study/m/heart/assets/heart_pump_lab.glb' })
    .map(([m, src]) => ({ id: 'mc-' + m, kind: 'glb', src, w: 1280, h: 960, n: 200000, sizeScale: 1.35, fit: [0.8, 0.8], ...(MC[m] || {}) })),
  { id: 'mc-world', kind: 'bubbles', w: 1280, h: 960, n: 160000, sizeScale: 1.3, fit: [0.82, 0.78] },
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
