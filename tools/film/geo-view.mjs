#!/usr/bin/env node
// One view of the twin and its geometry passes, for the free geometry check: opens the drop page on the sample plan
// (served straight from disk, no paid call), frames the view exactly as "Make it a photo" does, and writes
//   NAME-view.jpg   the view as the page would send it to Google Gemini
//   NAME-line.png   the line drawing of the same view from the model's own geometry (what the page sends beside it)
//   NAME-mask.png   the lossless part mask (walls, openings, roof, deck, balustrade, stair, poles…)
// Then: node tools/film/geocheck.mjs --photo PHOTO --line NAME-line.png --mask NAME-mask.png --reference NAME-view.jpg
//
//   node tools/film/geo-view.mjs --out DIR [--name view] [--plan hero.plan.json] [--w 1040 --h 786]
//        [--cams ex,ey,ez,lx,ly,lz] [--fov 42] [--soft] [--chrome PATH]
// --soft: software rendering (SwiftShader) for machines without a GPU. Needs playwright-core and Chrome.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const o = { out: '', name: 'view', plan: 'hero.plan.json', w: 1040, h: 786, cams: '', fov: 0, soft: false, chrome: '' };
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const k = argv[i].replace(/^--/, '');
  if (!(k in o)) throw new Error('unknown option --' + k);
  if (k === 'soft') { o.soft = true; continue; }
  const v = argv[++i]; o[k] = typeof o[k] === 'number' ? Number(v) : v;
}
if (!o.out) { console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 12).join('\n')); process.exit(1); }

function playwright() {
  const req = createRequire(import.meta.url);
  for (const p of [process.env.PLAYWRIGHT_CORE, 'playwright-core', '/usr/local/lib/python3.13/site-packages/playwright/driver/package']) {
    if (!p) continue;
    try { return req(p); } catch { /* next */ }
  }
  throw new Error('playwright-core not found: npm i -D playwright-core (or set PLAYWRIGHT_CORE)');
}
function chromePath() {
  if (o.chrome) return o.chrome;
  for (const p of ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium']) if (fs.existsSync(p)) return p;
  throw new Error('Chrome not found: pass --chrome PATH');
}
const BASE = 'http://twin.local';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.bin': 'application/octet-stream', '.woff2': 'font/woff2' };

const { chromium } = playwright();
const args = ['--hide-scrollbars', '--mute-audio'];
if (o.soft) args.push('--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist');
const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args });
try {
  // the stage is the page's 3D view: a viewport this size gives about a 1040 × 786 canvas beside the panel
  const page = await browser.newPage({ viewport: { width: o.w + 360, height: o.h + 114 } });
  page.on('pageerror', (e) => console.warn('page error:', String(e).slice(0, 200)));
  await page.route(BASE + '/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 404, body: 'no API here: nothing is sent to Google' });
    let f = path.normalize(path.join(ROOT, decodeURIComponent(url.pathname)));
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) return route.fulfill({ status: 404, body: 'not found' });
    return route.fulfill({ status: 200, body: fs.readFileSync(f), headers: { 'content-type': TYPES[path.extname(f)] ?? 'application/octet-stream' } });
  });
  await page.goto(`${BASE}/plan-studio/twins/drop/?plan=${encodeURIComponent(o.plan)}&geoview`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction("document.getElementById('status').textContent.startsWith('Ready')", null, { timeout: 900000, polling: 1000 });
  await page.waitForFunction('!!window.__geoview', null, { timeout: 120000, polling: 500 });
  if (o.cams) {
    const c = o.cams.split(',').map(Number);
    await page.evaluate(({ c, fov }) => { const a = window.__twin; a.camera.position.set(c[0], c[1], c[2]); a.controls.target.set(c[3], c[4], c[5]); if (fov) { a.camera.fov = fov; a.camera.updateProjectionMatrix(); } a.controls.update(); }, { c, fov: o.fov });
  }
  await page.waitForTimeout(2500);
  const r = await page.evaluate(async () => { const s = window.__geoview.shot(); const p = await window.__geoview.passes(s.crop, true); return { view: s.url, line: p.line, mask: p.mask, crop: s.crop }; });
  fs.mkdirSync(o.out, { recursive: true });
  for (const [k, ext] of [['view', 'jpg'], ['line', 'png'], ['mask', 'png']]) fs.writeFileSync(path.join(o.out, `${o.name}-${k}.${ext}`), Buffer.from(r[k].split(',')[1], 'base64'));
  console.log(`wrote ${o.name}-view.jpg, -line.png, -mask.png (${r.crop.dw} × ${r.crop.dh}) in ${o.out}`);
} finally { await browser.close(); }
