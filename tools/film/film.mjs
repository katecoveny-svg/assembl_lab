#!/usr/bin/env node
// The photoreal fly-through, end to end, from the lab's 3D page (/plan-studio/twins/drop/, sample plan hero.plan.json).
// Every pixel comes from the model; nothing generative. Needs Node 22.18+ (it runs the bake's TypeScript directly),
// Google Chrome, `playwright-core` (npm i -D playwright-core, or set PLAYWRIGHT_CORE to its folder) and ffmpeg.
//
//   node tools/film/film.mjs bake  [--spp 64] [--workers 6]            trace the light → plan-studio/twins/drop/twin/bake/hero.gi.bin
//   node tools/film/film.mjs stills --out DIR [--views 'On the deck,Living room'] [--photoreal] [--w 1600 --h 900 --samples 8]
//   node tools/film/film.mjs film  --out FILE.mp4 [--w 1920 --h 1080 --samples 8] [--from 0 --to N] [--keep]
//   node tools/film/film.mjs film  --out films/flythrough-4k.mp4 --w 3840 --h 2160 --samples 16 --crf 16   (the 4K master)
//
// --soft  software rendering (SwiftShader) for machines without a GPU, as on assembl's build box. Without it Chrome
//         uses the real GPU (Metal on a Mac). Frames go to a folder next to the output and are deleted after encoding
//         unless --keep. The film carries the caption "Rendered from the model. A visualisation, not a photograph."
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { Worker } from 'node:worker_threads';
import { execFileSync } from 'node:child_process';
import { bakeWithPool, unpackScene } from '../../plan-studio/twins/src/twin/photoreal/bakeRun.ts';
import { packBake } from '../../plan-studio/twins/src/twin/photoreal/bakeCore.ts';
import { encodePNG } from './png.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2), cmd = argv[0];
const o = { spp: 64, workers: Math.max(1, Math.min(8, os.cpus().length - 0)), w: 1920, h: 1080, samples: 8, views: 'Approach,On the deck,Living room,Kitchen,Bedroom', out: '', from: 0, to: -1, crf: 18, preset: 'veryfast', plan: 'hero.plan.json', soft: false, photoreal: false, keep: false, chrome: '', cams: '', look: '', ap: -1 };
for (let i = 1; i < argv.length; i++) {
  const k = argv[i].replace(/^--/, '');
  if (['soft', 'photoreal', 'keep'].includes(k)) { o[k] = true; continue; }
  const v = argv[++i]; o[k] = typeof o[k] === 'number' ? Number(v) : v;
}
const stamp = () => new Date().toISOString().slice(11, 19);
const log = (...a) => console.log(stamp(), ...a);

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
  for (const p of ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', 'C:/Program Files/Google/Chrome/Application/chrome.exe']) if (fs.existsSync(p)) return p;
  throw new Error('Chrome not found: pass --chrome PATH');
}

const BASE = 'http://twin.local';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.bin': 'application/octet-stream', '.txt': 'text/plain', '.woff2': 'font/woff2' };

/** open the 3D page on the sample plan; the repo is served straight from disk; POSTs to /__film/* go to `sinks` */
async function openPage(query, sinks = {}) {
  const { chromium } = playwright();
  const args = ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--hide-scrollbars', '--mute-audio', '--js-flags=--max-old-space-size=4096'];
  if (o.soft) args.push('--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist');
  else args.push('--ignore-gpu-blocklist', '--enable-gpu', ...(process.platform === 'darwin' ? ['--use-angle=metal'] : []));
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on('console', (m) => { const t = m.text(); if (/^\[(film|bake|photoreal)\]/.test(t) || m.type() === 'error') log(t.slice(0, 300)); });
  page.on('pageerror', (e) => log('PAGEERROR', String(e).slice(0, 300)));
  await page.route(BASE + '/**', async (route) => {
    const req = route.request(), url = new URL(req.url());
    if (url.pathname.startsWith('/__film/')) { const fn = sinks[url.pathname]; if (fn) await fn(req.postDataBuffer(), url); return route.fulfill({ status: 200, body: 'ok' }); }
    let f = path.normalize(path.join(ROOT, decodeURIComponent(url.pathname)));
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) return route.fulfill({ status: 404, body: 'not found' });
    return route.fulfill({ status: 200, body: fs.readFileSync(f), headers: { 'content-type': TYPES[path.extname(f)] ?? 'application/octet-stream' } });
  });
  const t0 = Date.now();
  await page.goto(`${BASE}/plan-studio/twins/drop/?plan=${o.plan}&still=1${query}`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction("document.getElementById('status').textContent.startsWith('Ready')", null, { timeout: 900000, polling: 1000 });
  await page.waitForFunction('!!window.__photoreal', null, { timeout: 300000, polling: 500 });
  log(`page ready in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  return { browser, page };
}

function nodePool(n) {
  const ws = [];
  const call = (w, msg, want, transfer = []) => new Promise((res, rej) => {
    const wk = ws[w];
    const on = (d) => { if (d.type === want) { wk.off('message', on); res(d); } };
    wk.on('message', on); wk.once('error', rej);
    wk.postMessage(msg, transfer);
  });
  return {
    size: n,
    async init(w, d) { ws[w] = new Worker(new URL('./bake-worker.mjs', import.meta.url)); await call(w, { type: 'init', d }, 'ready'); },
    async cache(w, c) { await call(w, { type: 'cache', cache: c }, 'cached'); },
    async job(w, j) { const d = await call(w, { type: 'job', ...j }, 'done', [j.samples.buffer]); return d.out; },
    close() { ws.forEach((w) => w.terminate()); },
  };
}

const bakeFile = () => path.join(ROOT, 'plan-studio/twins/drop/twin/bake', o.plan.replace(/\.plan\.json$/, '') + '.gi.bin');

async function bake() {
  const t0 = Date.now();
  const tmp = path.join(os.tmpdir(), `photoreal-scene-${process.pid}.bin`);
  const { browser, page } = await openPage('&photoreal=hold', { '/__film/scene': (b) => fs.writeFileSync(tmp, b) });
  const st = await page.evaluate(() => window.__photoreal.enable({ exportUrl: '/__film/scene' }));
  await browser.close();
  const tExport = Date.now();
  log(`scene exported: ${(fs.statSync(tmp).size / 1e6).toFixed(1)} MB, ${st.samples} light points, ${st.occluderTris} occluder triangles (${((tExport - t0) / 1000).toFixed(0)} s with the page)`);
  const buf = fs.readFileSync(tmp); fs.unlinkSync(tmp);
  const I = unpackScene(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const r = await bakeWithPool(I, nodePool(o.workers), { spp: o.spp, log: (m) => log(m) });
  const out = packBake(r.E, r.D, { hash: I.hash, spp: o.spp, seconds: r.timing.total, workers: o.workers, timing: r.timing, made: new Date().toISOString().slice(0, 10), by: 'tools/film/film.mjs bake', sun: I.sun });
  fs.mkdirSync(path.dirname(bakeFile()), { recursive: true });
  fs.writeFileSync(bakeFile(), Buffer.from(out));
  log(`bake written: ${path.relative(ROOT, bakeFile())} ${(out.byteLength / 1e6).toFixed(2)} MB; trace ${r.timing.total} s on ${o.workers} threads; peak memory ${(process.memoryUsage().rss / 1e6).toFixed(0)} MB (main)`);
}

async function stills() {
  if (!o.out) throw new Error('--out DIR');
  fs.mkdirSync(o.out, { recursive: true });
  const { browser, page } = await openPage(o.photoreal ? '&photoreal=hold' : '');
  if (o.photoreal) log('photoreal:', JSON.stringify(await page.evaluate(() => window.__photoreal.enable({}))).slice(0, 400));
  if (o.look) await page.evaluate((l) => { Object.assign(window.__photoreal.look, l); window.__photoreal.pr.syncLook(); }, JSON.parse(o.look));
  const items = [...o.views.split(',').filter(Boolean).map((v) => ['v', v]), ...o.cams.split(';').filter(Boolean).map((c) => ['c', c])];
  for (const [n, [kind, v]] of items.entries()) {
    const t = Date.now();
    if (kind === 'v') await page.evaluate((v) => { const a = window.__twin, i = a.built.path.findIndex((k) => k.label === v); if (i < 0) throw new Error('no view ' + v); a.goTo(i); }, v);
    else await page.evaluate((c) => { const a = window.__twin, q = c.split(',').map(Number); a.camera.position.set(q[0], q[1], q[2]); a.controls.target.set(q[3], q[4], q[5]); a.controls.update(); }, v);
    // close-ups (--cams) get a little depth of field by default (aperture radius in mm, focus on the look point)
    const ap = o.ap >= 0 ? o.ap : kind === 'c' ? 3 : 0;
    const url = await page.evaluate((s) => window.__photoreal.still(s), { w: o.w, h: o.h, samples: o.photoreal ? o.samples : 1, caption: !!o.photoreal, ap });
    const f = path.join(o.out, `${o.photoreal ? 'photoreal' : 'current'}-${(kind === 'v' ? v : 'cam' + n).replace(/\W+/g, '_')}.png`);
    fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'));
    log(`wrote ${f} in ${((Date.now() - t) / 1000).toFixed(0)} s`);
  }
  await browser.close();
}

async function film() {
  if (!o.out) throw new Error('--out FILE.mp4');
  const frames = o.out.replace(/\.mp4$/, '') + '-frames';
  fs.mkdirSync(frames, { recursive: true });
  const { browser, page } = await openPage('&photoreal=hold', {
    '/__film/frame': (b, url) => fs.writeFileSync(path.join(frames, `f_${String(url.searchParams.get('f')).padStart(5, '0')}.png`), encodePNG(b, Number(url.searchParams.get('w')), Number(url.searchParams.get('h')))),
  });
  log('photoreal:', JSON.stringify(await page.evaluate(() => window.__photoreal.enable({}))).slice(0, 300));
  const spec = await page.evaluate(() => ({ fps: window.__photoreal.spec.fps, frames: window.__photoreal.path.frames() }));
  const to = o.to < 0 ? spec.frames : Math.min(spec.frames, o.to);
  const t0 = Date.now();
  // in runs of 24 frames so a long film reports as it goes
  for (let a = o.from; a < to; a += 24) {
    const r = await page.evaluate((x) => window.__photoreal.film(x), { from: a, to: Math.min(to, a + 24), w: o.w, h: o.h, samples: o.samples, url: '/__film/frame' });
    const done = Math.min(to, a + 24) - o.from, el = (Date.now() - t0) / 1000;
    log(`frames ${a}–${Math.min(to, a + 24) - 1}: ${(r.seconds / r.frames).toFixed(1)} s a frame; ${done}/${to - o.from} done, about ${((el / done) * (to - o.from - done) / 60).toFixed(0)} min to go`);
  }
  await browser.close();
  const args = ['-y', '-v', 'error', '-framerate', String(spec.fps), '-start_number', String(o.from), '-i', path.join(frames, 'f_%05d.png'), '-c:v', 'libx264', '-preset', o.preset, '-crf', String(o.crf), '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart', o.out];
  execFileSync('ffmpeg', args, { stdio: 'inherit' });
  log(`wrote ${o.out} ${(fs.statSync(o.out).size / 1e6).toFixed(1)} MB (${to - o.from} frames at ${spec.fps} fps, ${o.w}×${o.h}, ${o.samples} sub-frames each)`);
  if (!o.keep) fs.rmSync(frames, { recursive: true, force: true });
}

const run = { bake, stills, film }[cmd];
if (!run) { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 17).join('\n')); process.exit(1); }
run().catch((e) => { console.error(e); process.exit(1); });
