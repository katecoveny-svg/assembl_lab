// Renders delivery/still.webp: the sim's map as one still, rendered on no ground and laid on the page's own plum (#21121F, so no
// box edge shows and the file stays small), framed exactly as the live map frames itself, so
// the page's first paint and its no-WebGL picture sit where the cloud lands. Uses the page itself (?still).
//   python3 -m http.server 8341 --bind 127.0.0.1   (from the repo root, in another shell)
//   node delivery/still.cjs            (needs Playwright; Python with Pillow for the WebP)
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const BASE = process.env.LAB_URL || 'http://127.0.0.1:8341', W = 1400, OUT = path.resolve(__dirname, 'still');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const shot = async (h) => {
    const p = await b.newPage({ viewport: { width: W, height: h }, deviceScaleFactor: 1 }); p.on('pageerror', (e) => console.error('page error:', e.message));
    await p.goto(BASE + '/delivery/?still'); await p.waitForFunction(() => window.stillReady, null, { timeout: 120000 }); await p.waitForTimeout(800);
    const aspect = await p.evaluate(() => window.stillAspect); return { p, aspect };
  };
  let { p, aspect } = await shot(1000); await p.close();
  const H = Math.round(W / aspect); ({ p } = await shot(H));
  await p.locator('#map').screenshot({ path: OUT + '.png', omitBackground: true }); await p.close(); await b.close();
  execFileSync('python3', ['-c', `from PIL import Image; im = Image.open('${OUT}.png').convert('RGBA'); bg = Image.new('RGB', im.size, (33, 18, 31)); bg.paste(im, mask=im.split()[3]); bg.save('${OUT}.webp', quality=72, method=6); print(im.size)`], { stdio: 'inherit' });
  fs.unlinkSync(OUT + '.png'); console.log('wrote', OUT + '.webp', `${W}×${H}`);
})();
