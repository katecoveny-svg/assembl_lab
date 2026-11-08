// Renders the Moving house sim's stills (moving/still.webp and moving/still-sm.webp): the whole journey as one frame, the page's
// first paint behind the live cloud and its picture without WebGL. Uses the page itself (?still), so the still matches the cloud.
//   python3 -m http.server 8342 --bind 127.0.0.1   (from the repo root, in another shell)
//   node moving/render-stills.cjs        (needs Playwright and Python's Pillow for the WebP step)
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const BASE = process.env.LAB_URL || 'http://127.0.0.1:8342', OUT = __dirname;
const JOBS = [{ id: 'still', w: 1600, h: 1000, dpr: 1 }, { id: 'still-sm', w: 390, h: 844, dpr: 2 }];
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const j of JOBS) {
    const ctx = await b.newContext({ viewport: { width: j.w, height: j.h }, deviceScaleFactor: j.dpr, reducedMotion: 'reduce' });
    const p = await ctx.newPage(); p.on('pageerror', (e) => console.error('page error:', e.message));
    await p.goto(BASE + '/moving/?still'); await p.waitForFunction(() => window.__stillReady, null, { timeout: 120000 }); await p.waitForTimeout(800);
    const url = await p.evaluate(() => document.getElementById('mv-canvas').toDataURL('image/png'));
    const png = path.join(OUT, j.id + '.png'); fs.writeFileSync(png, Buffer.from(url.split(',')[1], 'base64'));
    execFileSync('python3', ['-c', `from PIL import Image; im = Image.open(${JSON.stringify(png)}).convert('RGB'); im.save(${JSON.stringify(png.replace(/\.png$/, '.webp'))}, quality=82, method=6); print(im.size)`], { stdio: 'inherit' });
    fs.unlinkSync(png); console.log('rendered', j.id); await ctx.close();
  }
  await b.close();
})();
