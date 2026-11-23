// "Make photoreal still + film" (plan-studio/twins/src/twin/brandFilm.ts, photoFinish.ts): the plan of clips, the estimate shown
// before anything is spent, the stroke-by-stroke order of the title card's drawing, where the brand sits, the gate, and that the
// page and the lab's endpoints agree. Offline: no call to Google, no browser. The brand here is a generic placeholder.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as B from '../../plan-studio/twins/src/twin/brandFilm.ts';
import * as R from '../../functions/api/render.js';
import * as F from '../../functions/api/film.js';
import { readBrandDrawing, readBrand } from '../../plan-studio/twins/src/twin/practiceLook.ts';
import { brandDrawingRecord, brandRecord } from '../../architecture/js/handoff.js';

const src = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('the still goes at the highest-quality tier: Nano Banana Pro at 4K, with its own price, confirm required', async () => {
  assert.ok(R.QUALITIES.includes('finest'));
  assert.equal(R.DEFAULT_MODELS.finest, 'gemini-3-pro-image');
  assert.equal(R.DEFAULT_MODELS.finest, B.STILL_MODEL);
  assert.equal(R.estimateOf({}, 'finest').usd, B.PRICES.still.usd);
  assert.match(R.ESTIMATES.finest.text, /US\$0\.24/);
  const env = { GEMINI_API_KEY: 'test-key-not-real' };
  const req = R.geminiRequest(env, 'finest', 'p', { type: 'image/jpeg', data: 'AAAA' }, '16:9', null);
  assert.equal(req.body.response_format.image_size, '4K');
  assert.equal(req.body.model, 'gemini-3-pro-image');
  assert.ok(!('generation_config' in req.body), "Pro's thinking is fixed: no thinking level is sent");
  assert.equal(req.body.store, false);
  assert.match(R.buildPrompt({ time: 'midday' }, '16:9', true, { finish: true }), /photographic only.*Keep every building edge, every opening and the camera position/s);
  assert.doesNotMatch(R.buildPrompt({ time: 'midday' }, '16:9', true), /photographic only/);
  // the still-only path still refuses to spend without confirm
  const r = await R.onRequest({ request: new Request('https://lab.assembl.co.nz/api/render', { method: 'POST', headers: { origin: 'https://lab.assembl.co.nz', 'content-type': 'application/json' }, body: JSON.stringify({ image: 'data:image/png;base64,' + Buffer.from(png(320, 288)).toString('base64'), quality: 'finest', look: { time: 'midday' } }) }), env });
  assert.equal(r.status, 402); const j = await r.json(); assert.equal(j.error, 'confirm_spend'); assert.equal(j.estimate.usd, 0.26);
});

test('the film goes to Gemini Omni 1.2 Flash, the only video model on the API (Veo 3.1 preview shut down); 1080p is the best the lab sends', () => {
  assert.equal(F.DEFAULT_MODEL, B.FILM_MODEL);
  assert.ok(F.RESOLUTIONS.includes('1080p') && !F.RESOLUTIONS.includes('4k'));
  assert.equal(B.FILM_SIZES[0], '1080p', 'the button defaults to the highest size the lab takes');
  for (const s of B.FILM_SIZES) assert.ok(F.RESOLUTIONS.includes(s));
  // page and server per-second prices agree
  for (const s of B.FILM_SIZES) assert.ok(Math.abs(F.estimateOf({}, 1, s).per_second - B.PRICES.filmPerSecond[s]) < 1e-3, s);
  assert.match(F.buildFilmPrompt({}, { still: true }), /no logos/);
});

test('the estimate: still + clips + critique, rounded to cents, with words for each line', () => {
  const parts = B.planParts(13, [{ id: '01', arrive: 0 }, { id: '02', arrive: 6.4 }], 10);
  const e = B.estimate({ still: true, parts, size: '1080p', judge: true });
  assert.equal(e.still, 0.26);
  assert.ok(Math.abs(e.film - (13 * 0.104256 + 2 * 0.02)) < 0.01, String(e.film));
  assert.equal(e.judge, 0.06);
  assert.ok(Math.abs(e.total - (e.still + e.film + e.judge)) < 0.011);
  assert.equal(e.lines.length, 3); assert.match(e.lines[1], /2 clips, 13 s/);
  const four = B.estimate({ still: true, parts: B.planParts(4, [{ id: '01', arrive: 0 }]), size: '720p', judge: false });
  assert.equal(four.film, Math.round((4 * 5792 * 12 / 1e6 + 0.02) * 100) / 100);
  assert.equal(four.judge, 0); assert.equal(four.lines.length, 2);
  assert.equal(B.estimate({ still: true, parts: [], size: '1080p', judge: false }).total, 0.26);
});

test('clips: cut where each shot arrives, each 3 to 10 s, whole seconds, covering the film exactly', () => {
  const cases = [
    [13, [0, 6.4], 10], [4, [0], 10], [27.5, [0, 4, 5, 18], 10], [31, [0, 2, 25, 29.5], 10], [9, [0, 1, 2, 3, 4, 5, 6, 7], 10], [45, [0, 44], 15], [3, [0, 1], 10],
  ];
  for (const [d, arrivals, max] of cases) {
    const parts = B.planParts(d, arrivals.map((a, i) => ({ id: String(i + 1).padStart(2, '0'), arrive: a })), max);
    assert.equal(parts[0].from, 0); assert.equal(parts[parts.length - 1].to, d);
    for (let i = 1; i < parts.length; i++) assert.equal(parts[i].from, parts[i - 1].to, 'no gaps');
    for (const p of parts) { assert.ok(p.seconds >= 3 - 1e-9 && p.seconds <= max + 1e-9, `${d}: ${p.seconds}`); assert.ok(p.ask >= 3 && p.ask <= max); assert.ok(Number.isInteger(p.from)); }
  }
  const p = B.planParts(13, [{ id: '01', arrive: 0 }, { id: '02', arrive: 6.4 }]);
  assert.deepEqual(p.map((x) => [x.from, x.to, x.shots]), [[0, 6, ['01']], [6, 13, ['02']]]);
  assert.throws(() => B.planParts(2.5, []), /shorter than 3 s/);
});

test('the title card draws a drawing stroke by stroke: each line in turn, left to right, along its length', () => {
  const w = 40, h = 20, ink = new Uint8Array(w * h);
  for (let x = 2; x < 15; x++) ink[5 * w + x] = 255;          // stroke A: a line, left
  for (let y = 2; y < 18; y++) ink[y * w + 25] = 255;          // stroke B: an upright, right
  ink[10 * w + 30] = 20;                                       // too faint to count
  const t = B.revealOrder(ink, w, h);
  assert.equal(t[10 * w + 30], -1); assert.equal(t[0], -1);
  const A = [...Array(13)].map((_, i) => t[5 * w + 2 + i]), Bv = [...Array(16)].map((_, i) => t[(2 + i) * w + 25]);
  for (let i = 1; i < A.length; i++) assert.ok(A[i] > A[i - 1], 'A is drawn along its length');
  assert.ok(Math.max(...A) <= Math.min(...Bv) + 1e-6, 'A, on the left, is drawn before B');
  assert.ok(Math.abs(Math.max(...Bv) - 1) < 1e-6, 'the last pixel is drawn at the end');
  assert.deepEqual([...B.revealOrder(ink, w, h)], [...t], 'deterministic');
  // inks of the two kinds of drawing file, and the model's own line drawing
  assert.deepEqual([...B.inkOf(new Uint8Array([255, 255, 255, 255, 0, 0, 0, 255]), 'mask')], [255, 0]);
  assert.deepEqual([...B.inkOf(new Uint8Array([10, 20, 30, 200, 10, 20, 30, 0]), 'image')], [200, 0]);
  assert.deepEqual([...B.inkOfLineDrawing(new Uint8Array([0, 0, 0, 255, 255, 255, 255, 255]))], [255, 0]);
});

test('the brand sits inside the frame at any size: bug bottom right, cards fit, the still strip below the picture', () => {
  for (const [W, H] of [[1920, 1080], [1280, 720], [1400, 900], [390, 844], [720, 1280]]) {
    const bug = B.bugBox(W, H, { w: 300, h: 80 });
    assert.ok(bug.x + bug.w <= W && bug.y + bug.h <= H && bug.x > W * 0.8 && bug.y > H * 0.85, `${W}x${H} bug`);
    assert.ok(bug.w <= W * 0.09 + 1 && bug.h <= H * 0.06 + 1);
    for (const kind of ['title', 'end']) {
      const L = B.cardLayout(W, H, { w: 900, h: 560 }, kind);
      assert.ok(L.draw.x >= 0 && L.draw.y >= 0 && L.draw.x + L.draw.w <= W + 0.5 && L.draw.y + L.draw.h <= H + 0.5, `${W}x${H} ${kind} drawing`);
      assert.ok(Math.abs(L.draw.w / L.draw.h - 900 / 560) < 1e-6, 'the drawing keeps its shape');
      assert.ok(L.lines.every((y) => y < H), `${W}x${H} ${kind} text`);
    }
    const f = B.footerLayout(W, H, { w: 300, h: 80 });
    assert.ok(f.band >= 36 && f.band <= Math.max(36, H * 0.05 + 1)); assert.ok(f.logo.y >= H, 'the strip is below the picture, never over it');
  }
  assert.equal(B.cardLayout(1920, 1080, null, 'title').draw, null);
  assert.ok(B.titleProgress(0, 2.5) === 0 && B.titleProgress(2.5 * 0.7, 2.5) === 1 && B.titleProgress(2.4, 2.5) === 1);
  assert.equal(B.END_LINE, 'Visualisation, not for construction');
  assert.ok(B.TITLE_SECS >= 2 && B.TITLE_SECS <= 3 && B.END_SECS >= 2);
});

test('the gate: geometry decides, the critique only informs; drift is never passed', () => {
  const g = B.gateOf({ verdict: 'holds', score: 0.812 }, { match: 4, summary: 'same view' });
  assert.equal(g.verdict, 'holds'); assert.equal(g.geometry, 0.81); assert.equal(g.match, 4); assert.match(g.words, /For a person to review/);
  assert.equal(B.gateOf({ verdict: 'drifts', score: 0.5 }, { match: 5 }).verdict, 'drifts', 'a high critique score never passes a drift');
  assert.equal(B.gateOf(null, { match: 5 }).verdict, 'not checked');
  assert.equal(B.FINISH_LABEL, 'AI-finished from the browser render, look only — not a design change');
});

test('the brand is read from the workspace at run time; nothing of a practice is in the code', () => {
  const drawing = { src: 'data:image/png;base64,AAAA', mode: 'mask', colour: '#8ba2ff' };
  assert.deepEqual(readBrandDrawing(JSON.stringify({ name: 'Sample Practice', logo: '', drawing })), drawing);
  assert.equal(readBrandDrawing(JSON.stringify({ name: 'Sample Practice' })), null);
  assert.equal(readBrandDrawing(JSON.stringify({ drawing: { src: 'javascript:alert(1)' } })), null);
  assert.equal(readBrandDrawing(JSON.stringify({ drawing: { ...drawing, src: 'data:image/png;base64,' + 'A'.repeat(1_600_000) } })), null);
  assert.equal(readBrandDrawing(JSON.stringify({ drawing: { ...drawing, colour: 'red;x' } })).colour, '#8BA2FF');
  assert.equal(readBrandDrawing('not json'), null);
  assert.deepEqual(readBrand(JSON.stringify({ name: 'Sample Practice', logo: '', drawing })), { name: 'Sample Practice', logo: '' }, 'the header brand is unchanged');
  assert.deepEqual(brandDrawingRecord(drawing), drawing);
  assert.equal(brandDrawingRecord({ src: 'data:image/svg+xml;base64,AAAA' }), null);
  assert.equal(brandRecord('Sample Practice').drawing, undefined);
  // no practice's name, address or drawing in the new code: the brand comes from BRAND_KEY only
  for (const f of ['../../plan-studio/twins/src/twin/photoFinish.ts', '../../plan-studio/twins/src/twin/brandFilm.ts']) {
    const s = src(f);
    assert.doesNotMatch(s, /whaiao|data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]{40}/i, f);
    assert.match(s, /FINISH_LABEL/);
  }
  assert.match(src('../../plan-studio/twins/src/twin/photoFinish.ts'), /BRAND_KEY/);
});

test('the page wires the button to the lab endpoints only, with confirm, and saves back with the existing kinds', () => {
  const s = src('../../plan-studio/twins/src/twin/photoFinish.ts'), fl = src('../../plan-studio/twins/src/twin/flightUI.ts');
  assert.match(fl, /import\('\.\/photoFinish'\)/);
  assert.match(s, /Make photoreal still \+ film/); assert.match(s, /Photoreal still \(AI-finished\)/);
  assert.match(s, /quality: 'finest'.*confirm: true/); assert.match(s, /resolution: size, mode: 'background'.*confirm: true/);
  assert.ok(s.indexOf('await ask(') < s.indexOf("postJson('/api/render'") || s.indexOf('if (!(await ask(') > 0, 'the estimate is asked before anything is sent');
  assert.doesNotMatch(s, /generativelanguage|api\.openai|x-goog-api-key|API_KEY/, 'no key or provider address on the page');
  assert.match(s, /putBackRecord\(host\.handoffId, 'shot'/); assert.match(s, /putBackRecord\(host\.handoffId, 'film'/);
  assert.doesNotMatch(src('../../plan-studio/twins/src/twin/handoff.ts'), /'photoreal'/, 'no new kind');
  assert.match(s, /fp\.status !== 'confirmed'/, 'the film is made from the confirmed path only');
});

// a tiny valid PNG (grey), for the request checks
function png(w, h) {
  const zlib = globalThis.process.getBuiltinModule('node:zlib');
  const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 0;
  const raw = Buffer.alloc((w + 1) * h, 128); for (let y = 0; y < h; y++) raw[y * (w + 1)] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
