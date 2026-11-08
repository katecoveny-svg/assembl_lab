// Renders the page's two still pictures from the live point clouds, in headless Chromium:
//   viaduct/still-map.webp   the waterfront at 8:20 pm on no ground (alpha), cropped to the part the live map fits to its box, so the
//                            first paint and the no-WebGL page show the same picture in the same place as the cloud that replaces it
//   viaduct/still-plan.webp  the floor plan inset at the same moment
//   python3 -m http.server 8343 --bind 127.0.0.1   (from the repo root, in another shell)
//   node viaduct/render-stills.cjs
// Needs Playwright (a global install is fine: NODE_PATH=$(npm root -g)).
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const BASE = process.env.LAB_URL || 'http://127.0.0.1:8343', T = '20:20';
const save = (name, url) => { fs.writeFileSync(path.join(__dirname, name), Buffer.from(url.split(',')[1], 'base64')); console.log('wrote', name); };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const errs = [];
  // the waterfront, alone, on no ground
  let p = await (await b.newContext({ viewport: { width: 1200, height: 760 }, reducedMotion: 'reduce' })).newPage(); p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`${BASE}/viaduct/?still=map&t=${T}`); await p.waitForFunction(() => window.__viaduct && window.__viaduct.ready, null, { timeout: 120000 });
  save('still-map.webp', await p.evaluate(() => { const s = window.__viaduct.stillFrame(window.__viaduct.t), img = new Image(); return new Promise((res) => { img.onload = () => {
    const b = s.box, pad = 6, x0 = Math.max(0, Math.floor(b.x0 - pad)), y0 = Math.max(0, Math.floor(b.y0 - pad)), x1 = Math.min(img.width, Math.ceil(b.x1 + pad)), y1 = Math.min(img.height, Math.ceil(b.y1 + pad));
    const c = document.createElement('canvas'); c.width = x1 - x0; c.height = y1 - y0; c.getContext('2d').drawImage(img, x0, y0, c.width, c.height, 0, 0, c.width, c.height); res(c.toDataURL('image/webp', 0.78)); }; img.src = s.map; }); }));
  // the floor plan inset, at twice the pixels
  p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, reducedMotion: 'reduce' })).newPage(); p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`${BASE}/viaduct/?t=${T}`); await p.waitForFunction(() => window.__viaduct && window.__viaduct.ready, null, { timeout: 120000 });
  save('still-plan.webp', await p.evaluate(() => { window.__viaduct.stillFrame(window.__viaduct.t); const c = document.getElementById('plan-canvas'), o = document.createElement('canvas'); o.width = c.width; o.height = c.height; window.__viaduct.stillFrame(window.__viaduct.t); o.getContext('2d').drawImage(c, 0, 0); return o.toDataURL('image/webp', 0.86); }));
  if (errs.length) console.error('page errors:', errs);
  await b.close();
})();
