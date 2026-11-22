#!/usr/bin/env node
// The photoreal fly-through, end to end, from the lab's 3D page (/plan-studio/twins/drop/, sample plan hero.plan.json).
// Every pixel comes from the model; nothing generative. Needs Node 22.18+ (it runs the bake's TypeScript directly),
// Google Chrome, `playwright-core` (npm i -D playwright-core, or set PLAYWRIGHT_CORE to its folder) and ffmpeg.
//
//   node tools/film/film.mjs bake  [--spp 64] [--workers 6]            trace the light → plan-studio/twins/drop/twin/bake/hero.gi.bin
//   node tools/film/film.mjs stills --out DIR [--views 'On the deck,Living room'] [--photoreal] [--w 1600 --h 900 --samples 8]
//   node tools/film/film.mjs film  --out FILE.mp4 [--w 1920 --h 1080 --samples 8] [--from 0 --to N] [--keep] [--encode]
//        (frames already rendered are kept: run it again after a stop and it carries on; --encode only encodes)
//   node tools/film/film.mjs film  --out films/flythrough-4k.mp4 --w 3840 --h 2160 --samples 16 --crf 16   (the 4K master)
//   node tools/film/film.mjs geo-film  --out DIR [--w 1280 --h 720 --samples 2] [--from 0 --to N] [--keep] [--encode]
//        the fly-through in the twin's NORMAL look with its geometry passes (line drawing, depth, normals, part mask),
//        frame by frame, resumable; encodes the films, the clips for Google Gemini (no caption) and a contact sheet
//   node tools/film/film.mjs geo-still --out DIR --name NAME [--view 'On the deck' | --cams ex,ey,ez,lx,ly,lz --fov 42] [--w --h]
//        one view in the normal look and its passes (the line drawing goes to /api/render beside the view)
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
import { bakeWithPool, sceneFrom } from '../../plan-studio/twins/src/twin/photoreal/bakeRun.ts';
import { packBake } from '../../plan-studio/twins/src/twin/photoreal/bakeCore.ts';
import { encodePNG, decodePNG } from './png.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2), cmd = argv[0];
const o = { name: 'view', fov: 0, samplesGeo: 2, beauty: true, spp: 64, workers: Math.max(1, Math.min(8, os.cpus().length - 0)), w: 1920, h: 1080, samples: 8, views: 'Approach,On the deck,Living room,Kitchen,Bedroom', out: '', from: 0, to: -1, crf: 18, preset: 'veryfast', plan: 'hero.plan.json', soft: false, photoreal: false, keep: false, chrome: '', cams: '', look: '', ap: -1, encode: false };
for (let i = 1; i < argv.length; i++) {
  const k = argv[i].replace(/^--/, '');
  if (['soft', 'photoreal', 'keep', 'encode'].includes(k)) { o[k] = true; continue; }
  if (k === 'no-beauty') { o.beauty = false; continue; }
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
    const fail = (e) => { wk.off('message', on); rej(e); };
    const on = (d) => { if (d.type === want) { wk.off('message', on); wk.off('error', fail); res(d); } };
    wk.on('message', on); wk.once('error', fail);
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
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'photoreal-scene-'));
  let meta = null;
  const sink = (b, url) => {
    const part = url.searchParams.get('part');
    if (part === 'meta') { meta = JSON.parse(b.toString('utf8')); return; }
    fs.appendFileSync(path.join(tmp, part), b); // parts arrive in order, 8 MB at a time
  };
  const { browser, page } = await openPage('&photoreal=hold', { '/__film/scene': sink });
  const st = await page.evaluate(() => window.__photoreal.enable({ exportUrl: '/__film/scene' }));
  await browser.close();
  const tExport = Date.now();
  log(`scene exported: ${(st.exported / 1e6).toFixed(1)} MB, ${st.samples} light points, ${st.occluderTris} occluder triangles (${((tExport - t0) / 1000).toFixed(0)} s with the page)`);
  const I = sceneFrom(meta, (k) => { const b = fs.readFileSync(path.join(tmp, k)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); });
  fs.rmSync(tmp, { recursive: true, force: true });
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
  const name = (f) => path.join(frames, `f_${String(f).padStart(5, '0')}.png`);
  const specFile = JSON.parse(fs.readFileSync(path.join(ROOT, 'plan-studio/twins/src/twin/photoreal/flythrough.json'), 'utf8'));
  const total = Math.round(specFile.duration * specFile.fps), to = o.to < 0 ? total : Math.min(total, o.to);
  const missing = () => { const m = []; for (let f = o.from; f < to; f++) if (!fs.existsSync(name(f))) m.push(f); return m; };
  // frames already on disk are kept, so a render that stops (a crash, a restart) carries on where it was
  if (!o.encode && missing().length) {
    const { browser, page } = await openPage('&photoreal=hold', {
      '/__film/frame': (b, url) => { const f = name(url.searchParams.get('f')); fs.writeFileSync(f + '.tmp', encodePNG(b, Number(url.searchParams.get('w')), Number(url.searchParams.get('h')))); fs.renameSync(f + '.tmp', f); },
    });
    log('photoreal:', JSON.stringify(await page.evaluate(() => window.__photoreal.enable({}))).slice(0, 300));
    const t0 = Date.now(), todo = missing();
    let done = 0;
    // contiguous runs of up to 24 missing frames, so a long film reports as it goes
    for (let i = 0; i < todo.length;) {
      let j = i; while (j + 1 < todo.length && todo[j + 1] === todo[j] + 1 && j - i < 23) j++;
      const r = await page.evaluate((x) => window.__photoreal.film(x), { from: todo[i], to: todo[j] + 1, w: o.w, h: o.h, samples: o.samples, url: '/__film/frame' });
      done += j - i + 1;
      const el = (Date.now() - t0) / 1000;
      log(`frames ${todo[i]}–${todo[j]}: ${(r.seconds / r.frames).toFixed(1)} s a frame (render ${(r.timing.render / Math.max(1, r.timing.frames) / 1000).toFixed(1)} s, read-back ${(r.timing.read / Math.max(1, r.timing.frames) / 1000).toFixed(1)} s); ${done}/${todo.length}, about ${((el / done) * (todo.length - done) / 60).toFixed(0)} min to go`);
      i = j + 1;
    }
    await browser.close();
  }
  const left = missing();
  if (left.length) throw new Error(`${left.length} frames still missing (first ${left[0]}): run again to carry on`);
  const args = ['-y', '-v', 'error', '-framerate', String(specFile.fps), '-start_number', String(o.from), '-i', path.join(frames, 'f_%05d.png'), '-frames:v', String(to - o.from), '-c:v', 'libx264', '-preset', o.preset, '-crf', String(o.crf), '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart', o.out];
  const te = Date.now();
  execFileSync('ffmpeg', args, { stdio: 'inherit' });
  log(`wrote ${o.out} ${(fs.statSync(o.out).size / 1e6).toFixed(1)} MB (${to - o.from} frames at ${specFile.fps} fps, ${o.w}×${o.h}, ${o.samples} sub-frames each); encode ${((Date.now() - te) / 1000).toFixed(0)} s`);
  if (!o.keep) fs.rmSync(frames, { recursive: true, force: true });
}


// ---- geometry passes in the twin's normal look -------------------------------------------------------------------------
const MODEL_CAPTION = 'Rendered from the model. A visualisation, not a photograph.';
export const GEMINI_LABEL = 'Generated from the model view by Google Gemini. Not a photograph, and not a checked drawing.';
const KINDS = ['beauty', 'line', 'mask', 'depth', 'normal'];
/** a sink that writes each POSTed picture as PNG: name(kind, f) → file */
const pngSink = (name) => (b, url) => {
  const q = url.searchParams, f = name(q.get('kind'), q.get('f'));
  fs.writeFileSync(f + '.tmp', encodePNG(b, Number(q.get('w')), Number(q.get('h')), Number(q.get('ch'))));
  fs.renameSync(f + '.tmp', f);
};
async function savePNGDataURL(page, expr, args, file) {
  const url = await page.evaluate(expr, args);
  fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
}

async function geoStill() {
  if (!o.out) throw new Error('--out DIR');
  fs.mkdirSync(o.out, { recursive: true });
  const w = o.w === 1920 ? 1280 : o.w, h = o.h === 1080 ? 720 : o.h;
  const file = (kind) => path.join(o.out, `${o.name}-${kind}.png`);
  const { browser, page } = await openPage('', { '/__film/geo': pngSink((kind) => file(kind)) });
  if (o.view) await page.evaluate((v) => { const a = window.__twin, i = a.built.path.findIndex((k) => k.label === v); if (i < 0) throw new Error('no view ' + v); a.goTo(i); }, o.view);
  await page.waitForTimeout(o.view ? 4000 : 500);
  const cam = o.cams ? o.cams.split(',').map(Number) : undefined;
  const r = await page.evaluate((x) => window.__photoreal.geoStill(x), { w, h, url: '/__film/geo', name: o.name, samples: o.samplesGeo > 2 ? o.samplesGeo : 4, cam, fov: o.fov || undefined });
  await savePNGDataURL(page, (x) => window.__photoreal.captionPNG(x.w, x.h, x.t), { w, h, t: GEMINI_LABEL }, path.join(o.out, `caption-gemini-${w}x${h}.png`));
  await browser.close();
  fs.writeFileSync(file('camera').replace(/\.png$/, '.json'), JSON.stringify({ ...r.camera, w, h, plan: o.plan, made: new Date().toISOString() }, null, 1));
  log(`wrote ${KINDS.map(file).join(', ')}; camera ${JSON.stringify(r.camera)}`);
}

async function geoFilm() {
  if (!o.out) throw new Error('--out DIR');
  const w = o.w === 1920 ? 1280 : o.w, h = o.h === 1080 ? 720 : o.h;
  const frames = path.join(o.out, 'frames');
  fs.mkdirSync(frames, { recursive: true });
  const name = (kind, f) => path.join(frames, `${kind}_${String(f).padStart(5, '0')}.png`);
  const specFile = JSON.parse(fs.readFileSync(path.join(ROOT, 'plan-studio/twins/src/twin/photoreal/flythrough.json'), 'utf8'));
  const fps = specFile.fps, total = Math.round(specFile.duration * fps), to = o.to < 0 ? total : Math.min(total, o.to);
  const kinds = o.beauty ? KINDS : KINDS.slice(1);
  const done = (f) => kinds.every((k) => fs.existsSync(name(k, f)));
  const missing = () => { const m = []; for (let f = o.from; f < to; f++) if (!done(f)) m.push(f); return m; };
  const capModel = path.join(o.out, `caption-model-${w}x${h}.png`), capGemini = path.join(o.out, `caption-gemini-${w}x${h}.png`);
  if (!o.encode && (missing().length || !fs.existsSync(capModel))) {
    const { browser, page } = await openPage('', { '/__film/geo': pngSink(name) });
    await savePNGDataURL(page, (x) => window.__photoreal.captionPNG(x.w, x.h, x.t), { w, h, t: MODEL_CAPTION }, capModel);
    await savePNGDataURL(page, (x) => window.__photoreal.captionPNG(x.w, x.h, x.t), { w, h, t: GEMINI_LABEL }, capGemini);
    const t0 = Date.now(), todo = missing();
    let n = 0;
    for (let i = 0; i < todo.length;) {
      let j = i; while (j + 1 < todo.length && todo[j + 1] === todo[j] + 1 && j - i < 23) j++;
      const r = await page.evaluate((x) => window.__photoreal.geoFilm(x), { from: todo[i], to: todo[j] + 1, w, h, samples: o.samplesGeo, url: '/__film/geo', beauty: o.beauty });
      n += j - i + 1;
      const el = (Date.now() - t0) / 1000;
      log(`frames ${todo[i]}–${todo[j]}: ${(r.seconds / r.frames).toFixed(1)} s a frame (colour ${(r.timing.render / Math.max(1, r.timing.frames) / 1000).toFixed(1)} s a sub-frame; passes ${(r.timing.passes.render / Math.max(1, r.timing.passes.passes) / 1000).toFixed(2)} s render, ${(r.timing.passes.read / Math.max(1, r.timing.passes.passes) / 1000).toFixed(2)} s read-back); ${n}/${todo.length}, about ${((el / n) * (todo.length - n) / 60).toFixed(0)} min to go`);
      i = j + 1;
    }
    await browser.close();
  }
  const left = missing();
  if (left.length) throw new Error(`${left.length} frames still missing (first ${left[0]}): run again to carry on`);
  // films: captioned copies to watch; uncaptioned clips to send to Google Gemini (a caption in its input could be copied)
  const enc = (kind, out, caption, crf = o.crf) => {
    const args = ['-y', '-v', 'error', '-framerate', String(fps), '-start_number', String(o.from), '-i', path.join(frames, `${kind}_%05d.png`)];
    if (caption) args.push('-i', caption, '-filter_complex', '[0:v][1:v]overlay=0:0,format=yuv420p');
    args.push('-frames:v', String(to - o.from), '-c:v', 'libx264', '-preset', o.preset, '-crf', String(crf), '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart', '-an', out);
    execFileSync('ffmpeg', args, { stdio: 'inherit' });
    log(`wrote ${out} ${(fs.statSync(out).size / 1e6).toFixed(1)} MB`);
  };
  if (o.beauty) { enc('beauty', path.join(o.out, 'geometry-normal-look.mp4'), capModel); enc('beauty', path.join(o.out, 'gemini-input-normal-look.mp4'), null, 20); }
  enc('line', path.join(o.out, 'geometry-line.mp4'), capModel);
  enc('line', path.join(o.out, 'gemini-input-line.mp4'), null, 20);
  enc('depth', path.join(o.out, 'geometry-depth.mp4'), capModel);
  enc('normal', path.join(o.out, 'geometry-normals.mp4'), capModel);
  contactSheet(o.out, name, kinds.filter((k) => k !== 'mask'), o.from, to, fps);
  // the line drawings and part masks stay (small): the geometry check reads them for every frame
  if (!o.keep) for (const k of ['beauty', 'depth', 'normal']) for (let f = o.from; f < to; f++) fs.rmSync(name(k, f), { force: true });
  fs.writeFileSync(path.join(o.out, 'film.json'), JSON.stringify({ w, h, fps, from: o.from, to, samples: o.samplesGeo, plan: o.plan, spec: 'plan-studio/twins/src/twin/photoreal/flythrough.json', made: new Date().toISOString(), caption: MODEL_CAPTION }, null, 1));
}

/** rows = passes, columns = six moments of the film; each cell 320 × 180 (box-filtered) */
function contactSheet(out, name, kinds, from, to, fps) {
  const cols = 6, cw = 320, chh = 180, gap = 4;
  const at = Array.from({ length: cols }, (_, k) => Math.min(to - 1, from + Math.round(((to - 1 - from) * k) / (cols - 1))));
  const W = cols * cw + (cols + 1) * gap, H = kinds.length * chh + (kinds.length + 1) * gap, img = new Uint8Array(W * H * 3).fill(245);
  kinds.forEach((kind, r) => at.forEach((f, c) => {
    const p = decodePNG(fs.readFileSync(name(kind, f))), sx = p.w / cw, sy = p.h / chh;
    for (let y = 0; y < chh; y++) for (let x = 0; x < cw; x++) {
      let a = [0, 0, 0], nn = 0;
      for (let yy = Math.floor(y * sy); yy < Math.floor((y + 1) * sy); yy++) for (let xx = Math.floor(x * sx); xx < Math.floor((x + 1) * sx); xx++) {
        const i = (yy * p.w + xx) * p.ch; for (let k = 0; k < 3; k++) a[k] += p.px[i + (p.ch >= 3 ? k : 0)]; nn++;
      }
      const o2 = ((gap + r * (chh + gap) + y) * W + gap + c * (cw + gap) + x) * 3;
      for (let k = 0; k < 3; k++) img[o2 + k] = Math.round(a[k] / nn);
    }
  }));
  const file = path.join(out, 'contact.png');
  fs.writeFileSync(file, encodePNG(img, W, H, 3));
  log(`wrote ${file}: rows ${kinds.join(', ')}; columns at ${at.map((f) => (f / fps).toFixed(1) + ' s').join(', ')}`);
}

const run = { bake, stills, film, 'geo-film': geoFilm, 'geo-still': geoStill }[cmd];
if (!run) { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 22).join('\n')); process.exit(1); }
run().catch((e) => { console.error(e); process.exit(1); });
