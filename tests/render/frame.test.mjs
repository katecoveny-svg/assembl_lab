// "Make it a photo", page side: the helpers with no browser in them (photoFrame.ts, which Node loads by stripping its types)
// must agree with the server (functions/api/render.js), and the viewer must carry the label. Offline; nothing is sent.
// Run with:  node --test tests/render/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as F from '../../plan-studio/twins/src/twin/photoFrame.ts';
import * as S from '../../functions/api/render.js';

const src = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('page and server agree: label, shapes, setting length, estimates', () => {
  assert.equal(F.PHOTO_LABEL, S.LABEL);
  assert.deepEqual(F.RATIOS, S.RATIOS);
  assert.equal(F.SETTING_MAX, S.SETTING_MAX);
  assert.deepEqual(F.ESTIMATES, S.ESTIMATES);
  assert.deepEqual(F.TIMES.map(([k]) => k), S.TIMES);
  assert.deepEqual(F.SEASONS.map(([k]) => k).filter(Boolean), S.SEASONS);
});

test('page and server pick the same shape for any frame', () => {
  for (let w = 200; w <= 3200; w += 37) for (let h = 200; h <= 3200; h += 53) assert.equal(F.nearestRatio(w, h), S.nearestRatio(w, h), `${w}x${h}`);
});

test('the crop keeps the shape exactly, is centred, and stays inside the sizes the server takes', () => {
  for (const [w, h] of [[1040, 786], [2080, 1572], [390, 489], [1170, 1467], [2800, 1800], [1920, 1080], [300, 300], [5000, 1000], [257, 900]]) {
    const c = F.cropFor(w, h), r = F.ratioValue(c.ratio);
    assert.ok(Math.abs(c.dw / c.dh - r) < 1.5 / Math.min(c.dw, c.dh), `${w}x${h} keeps ${c.ratio}`);
    assert.ok(Math.max(c.dw, c.dh) <= F.MAX_EDGE || Math.min(c.dw, c.dh) <= F.MIN_EDGE + 1, `${w}x${h} long edge`);
    assert.ok(Math.min(c.dw, c.dh) >= F.MIN_EDGE - 1, `${w}x${h} short edge`);
    assert.ok(c.sx >= 0 && c.sy >= 0 && c.sx + c.sw <= w && c.sy + c.sh <= h, `${w}x${h} inside`);
    assert.ok(Math.abs(c.sx - (w - c.sx - c.sw)) <= 1 && Math.abs(c.sy - (h - c.sy - c.sh)) <= 1, `${w}x${h} centred`);
    assert.equal(S.nearestRatio(c.dw, c.dh), c.ratio, `${w}x${h}: the server reads the same shape back`);
  }
  // the desktop stage in the stills (1040 x 786) is trimmed by under one per cent to 4:3
  const d = F.cropFor(1040, 786);
  assert.equal(d.ratio, '4:3'); assert.ok(d.trimmed < 0.01);
});

test('the request the page sends passes the server\'s checks, carries confirm: true and a cleaned setting', () => {
  // a made-up PNG header at the shape the page would send
  const be32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, ...be32(1600), ...be32(1200), 8, 6, 0, 0, 0, 1, 2, 3]);
  const body = F.requestBody('data:image/png;base64,' + png.toString('base64'), 'best', 'overcast', 'winter', ' Ridge\nline <b> ');
  assert.equal(body.confirm, true);
  assert.deepEqual(body.look, { time: 'overcast', season: 'winter', setting: 'Ridge line b' });
  const ok = S.checkInput(body);
  assert.equal(ok.error, undefined); assert.equal(ok.quality, 'best'); assert.deepEqual(ok.dims, { w: 1600, h: 1200 });
  assert.deepEqual(F.requestBody('x', 'fast', 'golden', '', '   ').look, { time: 'golden' });
  // the line drawing of the same view rides along when the page could draw it, and passes the server's checks
  const withLine = F.requestBody('data:image/png;base64,' + png.toString('base64'), 'fast', 'golden', '', '', 'data:image/png;base64,' + png.toString('base64'));
  assert.equal(S.checkInput(withLine).line.type, 'image/png');
  assert.ok(!('line' in F.requestBody('x', 'fast', 'golden', '', '', null)));
  assert.equal(F.requestBody('x', 'fast', 'golden', '', 'y'.repeat(300)).look.setting.length, F.SETTING_MAX);
});

test('error words: the server\'s own message first, plain words otherwise', () => {
  assert.equal(F.errorText(503, { error: 'busy', message: S.MESSAGES.busy }), S.MESSAGES.busy);
  assert.match(F.errorText(0, null), /reach the lab/);
  assert.match(F.errorText(404, null), /not available/);
  assert.match(F.errorText(502, 'nonsense'), /Nothing is shown/);
  for (const s of [0, 400, 404, 413, 429, 500, 502]) assert.ok(!/\bAI\b/.test(F.errorText(s, null)));
});

test('recent photos: newest first, four at most, in memory only', () => {
  let list = [];
  for (let i = 0; i < 6; i++) list = F.keepRecent(list, { at: i });
  assert.deepEqual(list.map((r) => r.at), [5, 4, 3, 2]);
  const ui = src('../../plan-studio/twins/src/twin/photoUI.ts');
  assert.ok(!/localStorage|sessionStorage|indexedDB/.test(ui), 'nothing is kept beyond the tab');
});

test('small helpers: sun hour to light, file names, seconds', () => {
  assert.equal(F.timeFromSun(7), 'morning'); assert.equal(F.timeFromSun(12), 'midday'); assert.equal(F.timeFromSun(17.5), 'golden'); assert.equal(F.timeFromSun(NaN), 'golden');
  assert.equal(F.fileName('plan-to-twin', 'best', new Date(2026, 10, 22, 9, 5)), 'plan-to-twin-photo-best-2026-11-22-0905.jpg');
  assert.equal(F.seconds(1480), '1.5 s'); assert.equal(F.seconds(42400), '42 s');
  assert.equal(F.priceShort({ usd: 0.04 }), '≈US$0.04'); assert.equal(F.priceShort({ usd: null }), 'see price');
});

test('the viewer carries the label on the image, under it and in every download; customer words never say a bare "AI"', () => {
  const ui = src('../../plan-studio/twins/src/twin/photoUI.ts');
  assert.match(ui, /class="ph-stamp">\$\{esc\(PHOTO_LABEL\)\}/, 'on the image');
  assert.match(ui, /class="ph-label">\$\{esc\(PHOTO_LABEL\)\}/, 'under the image');
  assert.match(ui, /fillText\(PHOTO_LABEL/, 'burned into the download');
  assert.match(ui, /fetch\('\/api\/render', \{ method: 'POST'/);
  // every string the person reads: text between tags, button and title text, messages passed to say() and app.log()
  const words = [...ui.matchAll(/>([^<>{}$]{3,})</g), ...ui.matchAll(/(?:say|log|textContent = )\(?[`'"]([^`'"]{3,})[`'"]/g)].map((m) => m[1]);
  assert.ok(words.length > 15);
  for (const w of words) assert.ok(!/\bAI\b/.test(w), w);
});

test('registered in both twins with one lazy line each, so the film work merges cleanly', () => {
  const plan = src('../../plan-studio/twins/src/twin/projectPlan.ts'), a16 = src('../../plan-studio/twins/src/twin/project16a.ts');
  assert.equal((plan.match(/photoUI/g) || []).length, 1); assert.match(plan, /void import\('\.\/photoUI'\)\.then\(\(m\) => m\.mountPhoto\(app\)\)/);
  assert.equal((a16.match(/photoUI/g) || []).length, 1); assert.match(a16, /void import\('\.\/photoUI'\)\.then\(\(m\) => m\.mountPhoto\(app\)\)/);
});
