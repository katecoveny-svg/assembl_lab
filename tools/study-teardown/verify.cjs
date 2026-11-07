#!/usr/bin/env node
// The study teardown verify loop. Records what the page really draws, frame by frame, and tells you how much of the
// run stood still ("stood still for 577 of 1,319 frames"). Also: the model's hand checks, the console redrawing from
// the frame's state, sideways scroll at phone width, page errors, a reduced-motion pass, and screenshots at 1440 and
// 390 plus a contact sheet of exact frames through one cycle. You cannot watch a page; you can read its frames.
//
//   node tools/study-teardown/verify.cjs /study/teardown/four-stroke/            (serves this repo on a free port)
//   node tools/study-teardown/verify.cjs https://<preview>/study/teardown/four-stroke/ --share '<vercel share url>'
//
//   --out <dir>        screenshots and report.json (default: <os tmp>/study-teardown/<id>)
//   --seconds 8        how long to record real frames
//   --max-still 0.2    fail if more than this fraction of recorded frames stood still
//   --threshold 0.0005 a frame "stood still" when less than this fraction of its pixels changed
//   --sizes 1440x900,390x844
//   --share <url>      open this first (a Vercel share link sets the preview's access cookie)
//   --no-reduced       skip the reduced-motion pass     --no-sheet   skip the contact sheet
//
// Wrap it on the shared build machine:  flock /dev/shm/heavy.lock node tools/study-teardown/verify.cjs ...
// Needs Playwright (require('playwright')) and a Chromium it can launch. Written for assembl; MIT-licensed ideas from
// elvarofficial/teardown (review by frames), no code copied.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const {chromium} = require('playwright');

const argv = process.argv.slice(2);
const flag = (k) => argv.includes('--' + k);
const opt = (k, d) => {
  const i = argv.indexOf('--' + k);
  return i === -1 ? d : argv[i + 1];
};
const VALUED = new Set(['out', 'seconds', 'max-still', 'threshold', 'sizes', 'share', 'root']);
let target = null;
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) {
    if (VALUED.has(argv[i].slice(2))) i++;
  } else target = target || argv[i];
}
if (!target) {
  console.error('usage: node tools/study-teardown/verify.cjs <url | /site/path/> [--share url] [--out dir] [--seconds 8] [--max-still 0.2]');
  process.exit(2);
}
const ROOT = path.resolve(opt('root', path.join(__dirname, '../..')));
const SECONDS = Number(opt('seconds', 8));
const MAX_STILL = Number(opt('max-still', 0.2));
const THRESH = Number(opt('threshold', 0.0005));
const SIZES = opt('sizes', '1440x900,390x844').split(',').map((s) => s.split('x').map(Number));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const n = (x) => Number(x).toLocaleString('en-NZ');

// ------------------------------------------------------------------ a tiny static server for local runs
const MIME = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2', '.wasm': 'application/wasm'};
function serve(root) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      let f = path.join(root, p);
      if (!f.startsWith(root)) return res.writeHead(403).end();
      if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
      if (!fs.existsSync(f)) return res.writeHead(404).end('not found');
      res.writeHead(200, {'content-type': MIME[path.extname(f)] || 'application/octet-stream'});
      fs.createReadStream(f).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

// ------------------------------------------------------------------ the frame sampler, injected before the page runs
// WebGL contexts are asked to keep their drawing buffer, so the sampler can read the frame that is on screen. Each
// display frame, the largest canvas is shrunk to 160 x 90 and compared with the last one.
const SAMPLER = (thresh) => {
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, attrs) {
    if (/webgl/.test(type)) attrs = Object.assign({}, attrs, {preserveDrawingBuffer: true});
    return orig.call(this, type, attrs);
  };
  const V = (window.__tdv = {on: false, threshold: thresh, frames: 0, still: 0, streak: 0, maxStreak: 0, consoleSame: 0, modelSame: 0, times: [], diffs: []});
  const W = 160;
  const H = 90;
  let c2 = null;
  let g = null;
  let prev = null;
  V.reset = () => {
    prev = null;
    Object.assign(V, {frames: 0, still: 0, streak: 0, maxStreak: 0, consoleSame: 0, modelSame: 0, times: [], diffs: [], lastText: null, lastSig: null});
  };
  const pick = () => {
    let best = null;
    let area = 0;
    for (const c of document.querySelectorAll('canvas')) {
      const r = c.getBoundingClientRect();
      if (r.width * r.height > area && r.width > 60) {
        area = r.width * r.height;
        best = c;
      }
    }
    return best;
  };
  const sample = (ts) => {
    if (!V.on) return;
    const cv = pick();
    if (!cv) return;
    if (!c2) {
      c2 = document.createElement('canvas');
      c2.width = W;
      c2.height = H;
      g = c2.getContext('2d', {willReadFrequently: true});
    }
    g.drawImage(cv, 0, 0, W, H);
    const d = g.getImageData(0, 0, W, H).data;
    const text = [...document.querySelectorAll('[data-live]')].map((x) => x.textContent).join('|');
    const api = window.STUDY_TEARDOWN;
    const sig = api && api.signature ? api.signature() : null;
    if (!prev) {
      prev = new Uint8ClampedArray(d);
      V.lastText = text;
      V.lastSig = sig;
      return;
    }
    let changed = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (Math.abs(d[i] - prev[i]) + Math.abs(d[i + 1] - prev[i + 1]) + Math.abs(d[i + 2] - prev[i + 2]) > 12) changed++;
    }
    prev.set(d);
    const frac = changed / (W * H);
    V.frames++;
    V.times.push(ts);
    V.diffs.push(Math.round(frac * 1e5) / 1e5);
    if (frac < V.threshold) {
      V.still++;
      V.streak++;
      V.maxStreak = Math.max(V.maxStreak, V.streak);
    } else V.streak = 0;
    if (text === V.lastText) V.consoleSame++;
    V.lastText = text;
    if (sig !== null && sig === V.lastSig) V.modelSame++;
    V.lastSig = sig;
  };
  const raf = window.requestAnimationFrame.bind(window);
  const tick = (ts) => {
    try {
      sample(ts);
    } catch (e) {
      V.err = String(e);
    }
    raf(tick);
  };
  raf(tick);
};

async function record(page, seconds) {
  await page.evaluate(() => {
    window.__tdv.reset();
    window.__tdv.on = true;
  });
  await sleep(seconds * 1000);
  return page.evaluate(() => {
    const V = window.__tdv;
    V.on = false;
    const t = V.times;
    const fps = t.length > 1 ? ((t.length - 1) * 1000) / (t[t.length - 1] - t[0]) : 0;
    return {frames: V.frames, still: V.still, maxStreak: V.maxStreak, consoleSame: V.consoleSame, modelSame: V.modelSame, fps: Math.round(fps * 10) / 10, err: V.err || null,
      meanChange: V.diffs.length ? V.diffs.reduce((a, b) => a + b, 0) / V.diffs.length : 0};
  });
}

(async () => {
  let srv = null;
  let url = target;
  if (!/^https?:/.test(target)) {
    srv = await serve(ROOT);
    url = `http://127.0.0.1:${srv.address().port}${target.startsWith('/') ? '' : '/'}${target}`;
  }
  const id = (url.replace(/\/+$/, '').split('/').pop() || 'page').replace(/[^a-z0-9-]/gi, '') || 'page';
  const OUT = path.resolve(opt('out', path.join(os.tmpdir(), 'study-teardown', id)));
  fs.mkdirSync(OUT, {recursive: true});
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM || undefined,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars'],
    proxy: proxy && /^https?:\/\/(?!127\.0\.0\.1|localhost)/.test(url) ? {server: proxy, bypass: 'localhost,127.0.0.1'} : undefined,
  });
  const report = {url, when: new Date().toISOString(), out: OUT, sizes: {}, errors: [], checks: [], fail: []};
  const ctx = await browser.newContext({deviceScaleFactor: 1});
  await ctx.addInitScript(SAMPLER, THRESH);
  if (opt('share')) {
    const p = await ctx.newPage();
    await p.goto(opt('share'), {waitUntil: 'load', timeout: 60000});
    await p.close();
  }
  const open = async (w, h, media = {}) => {
    const page = await ctx.newPage();
    await page.setViewportSize({width: w, height: h});
    await page.emulateMedia({reducedMotion: media.reduced ? 'reduce' : 'no-preference'});
    page.on('pageerror', (e) => report.errors.push(`[${w}] ${e.message}`));
    page.on('console', (m) => m.type() === 'error' && report.errors.push(`[${w}] console: ${m.text()}`));
    await page.goto(url, {waitUntil: 'load', timeout: 90000});
    const kit = await page
      .waitForFunction(() => window.STUDY_TEARDOWN && window.STUDY_TEARDOWN.ready, null, {timeout: 30000})
      .then(() => true)
      .catch(() => false);
    await page.evaluate(() => document.fonts && document.fonts.ready);
    if (kit && !media.reduced) await page.waitForFunction(() => window.STUDY_TEARDOWN.introDone, null, {timeout: 20000}).catch(() => {});
    await sleep(1200);
    return {page, kit};
  };
  const shot = async (page, name, o = {}) => {
    const f = path.join(OUT, `${id}-${name}.png`);
    await page.screenshot({path: f, fullPage: !!o.full, timeout: 120000});
    return f;
  };

  // ---------------------------------------------------------------- desktop: record, interact, sheet
  const [DW, DH] = SIZES[0];
  {
    const {page, kit} = await open(DW, DH);
    report.kit = kit;
    report.shots = [await shot(page, String(DW))];
    const rec = await record(page, SECONDS);
    rec.stillFraction = rec.frames ? rec.still / rec.frames : 1;
    report.sizes[DW] = {record: rec};
    if (kit) {
      report.checks = await page.evaluate(() => window.STUDY_TEARDOWN.checks());
      // the panels must redraw from state: step the machine and read the console twice
      const read = (f) => page.evaluate((x) => {
        const T = window.STUDY_TEARDOWN;
        T.seek(x * T.period);
        return [...document.querySelectorAll('[data-live]')].map((e) => e.textContent).join('|');
      }, f);
      const a = await read(0.14);
      const b = await read(0.64);
      report.consoleFollowsState = a !== b;
      await page.evaluate(() => window.STUDY_TEARDOWN.freeze(false));
      const api = (fn, ...args) => page.evaluate(([f, a2]) => window.STUDY_TEARDOWN[f](...a2), [fn, args]);
      await api('setAssembly', 0);
      await sleep(4200);
      report.shots.push(await shot(page, `${DW}-apart`));
      await api('setAssembly', 1, true);
      await api('select', 'crank');
      await api('toggle', 'isolate', true);
      await sleep(900);
      report.shots.push(await shot(page, `${DW}-isolate`));
      await api('toggle', 'isolate', false);
      await api('select', 'all');
      await api('toggle', 'cut', false);
      await api('setMode', 'night');
      await sleep(900);
      report.shots.push(await shot(page, `${DW}-night-closed`));
      await api('setMode', 'light');
      await api('toggle', 'cut', true);
      if (!flag('no-sheet')) {
        const period = await page.evaluate(() => window.STUDY_TEARDOWN.period);
        const beats = [0, 1, 2, 3, 4, 4.25, 5, 6, 7].map((k) => (k / 8) * period);
        const stage = page.locator('.tdk-stage');
        const tiles = [];
        for (const p of beats) {
          const s = await page.evaluate((x) => window.STUDY_TEARDOWN.seek(x), p);
          const buf = await stage.screenshot({timeout: 120000});
          tiles.push({p, label: `${Math.round(p)}° · ${s.stroke || ''}`, b64: buf.toString('base64')});
        }
        await page.evaluate(() => window.STUDY_TEARDOWN.freeze(false));
        const sheet = await ctx.newPage();
        await sheet.setViewportSize({width: 1500, height: 900});
        await sheet.setContent(`<style>body{margin:0;background:#F9F6F2;font:12px 'IBM Plex Mono',monospace;color:#33212F}div{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:6px}figure{margin:0;position:relative}img{width:100%;display:block;border-radius:8px}figcaption{position:absolute;left:8px;top:6px;background:#F9F6F2;padding:2px 6px;border-radius:6px}</style><div>${tiles
          .map((t) => `<figure><img src="data:image/png;base64,${t.b64}"><figcaption>${t.label}</figcaption></figure>`)
          .join('')}</div>`);
        await sheet.waitForTimeout(300);
        const f = path.join(OUT, `${id}-sheet.png`);
        await sheet.screenshot({path: f, fullPage: true});
        report.shots.push(f);
        await sheet.close();
      }
    }
    await page.close();
  }

  // ---------------------------------------------------------------- the other sizes: screenshots and sideways scroll
  for (const [w, h] of SIZES.slice(1)) {
    const {page} = await open(w, h);
    report.shots.push(await shot(page, String(w)));
    report.shots.push(await shot(page, `${w}-full`, {full: true}));
    const ov = await page.evaluate(() => {
      const W = document.documentElement.clientWidth;
      const wide = [...document.querySelectorAll('body *')]
        .filter((e) => {
          const r = e.getBoundingClientRect();
          return r.width && r.right > W + 1 && getComputedStyle(e).position !== 'fixed';
        })
        .slice(0, 6)
        .map((e) => `${e.tagName.toLowerCase()}.${String(e.className).split(' ')[0]} → ${Math.round(e.getBoundingClientRect().right)}px`);
      return {scroll: document.documentElement.scrollWidth - W, wide};
    });
    const rec = await record(page, Math.min(4, SECONDS));
    rec.stillFraction = rec.frames ? rec.still / rec.frames : 1;
    report.sizes[w] = {overflow: ov, record: rec};
    if (ov.scroll > 0) report.fail.push(`sideways scroll of ${ov.scroll}px at ${w} wide (${ov.wide.join(', ')})`);
    await page.close();
  }

  // ---------------------------------------------------------------- reduced motion: it should hold still until asked
  if (!flag('no-reduced')) {
    const {page} = await open(DW, DH, {reduced: true});
    report.shots.push(await shot(page, `${DW}-reduced`));
    const rec = await record(page, 3);
    rec.stillFraction = rec.frames ? rec.still / rec.frames : 1;
    report.reduced = rec;
    await page.close();
  }
  await browser.close();
  if (srv) srv.close();

  // ---------------------------------------------------------------- verdict
  const R = report.sizes[DW].record;
  if (!R.frames) report.fail.push('no frames recorded: no canvas, or the page never drew');
  else if (R.stillFraction > MAX_STILL) report.fail.push(`stood still for ${n(R.still)} of ${n(R.frames)} frames (${Math.round(R.stillFraction * 100)}%), more than ${Math.round(MAX_STILL * 100)}%`);
  if (report.kit && report.consoleFollowsState === false) report.fail.push('the console did not change when the machine moved');
  for (const k of report.checks.filter((c) => !c.pass)) report.fail.push(`model check failed: ${k.name} (${k.got} vs ${k.want})`);
  for (const e of report.errors) report.fail.push(e);
  if (report.reduced && report.reduced.stillFraction < 0.9) report.warn = `reduced motion still moved in ${Math.round((1 - report.reduced.stillFraction) * 100)}% of frames`;
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));

  console.log(`\n${url}`);
  console.log(`  recorded ${SECONDS} s at ${DW}: ${n(R.frames)} frames, ${R.fps} fps`);
  console.log(`  stood still for ${n(R.still)} of ${n(R.frames)} frames (${Math.round((R.stillFraction || 0) * 100)}%), longest still run ${n(R.maxStreak)} frames`);
  if (report.kit) {
    console.log(`  console unchanged in ${n(R.consoleSame)} of ${n(R.frames)} frames; model state unchanged in ${n(R.modelSame)}`);
    console.log(`  model checks: ${report.checks.filter((c) => c.pass).length} of ${report.checks.length} agree with the hand calculation`);
  }
  for (const [w, s] of Object.entries(report.sizes)) if (s.overflow) console.log(`  ${w} wide: sideways scroll ${s.overflow.scroll}px`);
  if (report.reduced) console.log(`  reduced motion: still in ${Math.round(report.reduced.stillFraction * 100)}% of ${n(report.reduced.frames)} frames`);
  if (report.warn) console.log(`  warning: ${report.warn}`);
  console.log(`  screenshots: ${OUT}`);
  if (report.fail.length) {
    console.log('  FAIL\n   - ' + report.fail.join('\n   - '));
    process.exit(1);
  }
  console.log('  PASS');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
