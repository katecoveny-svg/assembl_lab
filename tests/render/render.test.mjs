// "Make it a photo" (/api/render): every check runs offline. fetch is stubbed, keys are fake, Google is never called.
// Run with:  node --test tests/render/*.test.mjs
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  onRequest, checkInput, buildPrompt, geminiRequest, readAnswer, imageSize, nearestRatio, allowedOrigin, cleanSetting, limitsOf,
  _resetCounters, estimateOf, ESTIMATES, RENDER_PROMPTS, DEFAULT_MODELS, MESSAGES, LABEL, RATIOS, MAX_BODY, MAX_IMAGE, SETTING_MAX,
} from '../../functions/api/render.js';

const KEY = 'fake-gemini-KEY-9f3a';
const ENV = { GEMINI_API_KEY: KEY };
const LAB = 'https://lab.assembl.co.nz';

// --- made-up image files: only the header is real, which is all the function reads ---------------------------------------
const be32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const be16 = (n) => [(n >>> 8) & 255, n & 255];
const le16 = (n) => [n & 255, (n >>> 8) & 255];
const le24 = (n) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255];
const png = (w, h, pad = 200) => Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, ...be32(w), ...be32(h), 8, 6, 0, 0, 0, ...new Array(pad).fill(7)]);
const jpeg = (w, h) => Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...be16(16), 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xdb, ...be16(4), 0, 0, 0xff, 0xc0, ...be16(17), 8, ...be16(h), ...be16(w), 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1, 0xff, 0xda, 0, 0]);
const webpX = (w, h) => Buffer.from([...Buffer.from('RIFF'), 0, 0, 0, 0, ...Buffer.from('WEBP'), ...Buffer.from('VP8X'), 10, 0, 0, 0, 0, 0, 0, 0, ...le24(w - 1), ...le24(h - 1), 0, 0]);
const webpL = (w, h) => { const b = ((w - 1) & 0x3fff) | (((h - 1) & 0x3fff) << 14); return Buffer.from([...Buffer.from('RIFF'), 0, 0, 0, 0, ...Buffer.from('WEBP'), ...Buffer.from('VP8L'), 5, 0, 0, 0, 0x2f, b & 255, (b >>> 8) & 255, (b >>> 16) & 255, (b >>> 24) & 255, 0, 0, 0, 0, 0]); };
const webpLossy = (w, h) => Buffer.from([...Buffer.from('RIFF'), 0, 0, 0, 0, ...Buffer.from('WEBP'), ...Buffer.from('VP8 '), 10, 0, 0, 0, 0, 0, 0, 0x9d, 0x01, 0x2a, ...le16(w), ...le16(h), 0, 0]);
const url = (type, buf) => `data:${type};base64,${buf.toString('base64')}`;
const PNG = url('image/png', png(1500, 1000));
const OUT = Buffer.from('a generated jpeg').toString('base64');

// --- Google's answers, in the shapes its docs give ------------------------------------------------------------------------
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const interactionOk = (data = OUT, model = 'gemini-nano-banana-2.1') => reply({
  id: 'v1_x', object: 'interaction', model, status: 'completed',
  steps: [
    { type: 'thought', summary: [{ type: 'text', text: 'composing' }, { type: 'image', mime_type: 'image/jpeg', data: 'VEhPVUdIVA==' }], signature: 'abc' },
    { type: 'model_output', content: [{ type: 'image', mime_type: 'image/jpeg', data }] },
  ],
  usage: { total_tokens: 2400 },
});

async function call({ method = 'POST', env = ENV, body, raw, origin = LAB, ip = '203.0.113.7', handler = () => interactionOk(), headers = {} } = {}) {
  const calls = [], warns = [], real = globalThis.fetch, warn = console.warn;
  console.warn = (...a) => warns.push(a.map(String).join(' '));
  globalThis.fetch = async (u, init) => { calls.push({ url: String(u), init, body: init?.body ? JSON.parse(init.body) : null }); return handler(calls.at(-1)); };
  try {
    const h = { 'content-type': 'application/json', ...headers };
    if (origin) h.origin = origin;
    if (ip) h['cf-connecting-ip'] = ip;
    const init = { method, headers: h };
    // every paid request carries confirm: true unless a test says otherwise
    const b = body ?? { image: PNG, quality: 'fast', look: { time: 'golden' } };
    if (method === 'POST') init.body = raw ?? JSON.stringify('confirm' in b ? b : { ...b, confirm: true });
    const res = await onRequest({ request: new Request('https://lab.assembl.co.nz/api/render', init), env });
    const text = await res.text();
    let json = null; try { json = JSON.parse(text); } catch { /* 204 */ }
    return { status: res.status, headers: res.headers, json, calls, warns };
  } finally { globalThis.fetch = real; console.warn = warn; }
}

beforeEach(() => _resetCounters());

// --- GET status -----------------------------------------------------------------------------------------------------------
test('GET answers status with no paid call: not configured', async () => {
  const r = await call({ method: 'GET', env: {} });
  assert.equal(r.status, 200); assert.equal(r.calls.length, 0);
  assert.equal(r.json.type, 'assembl.planstudio.render.status');
  assert.equal(r.json.configured, false);
  assert.deepEqual(r.json.models, { fast: 'gemini-nano-banana-2.1', best: 'gemini-3-pro-image' });
  assert.equal(r.json.prompt_revision, RENDER_PROMPTS); assert.equal(RENDER_PROMPTS, '2026-11-23a');
  assert.deepEqual({ ...r.json.limits }, { per_minute: 6, per_ip_day: 40, daily_cap: 100, max_body_bytes: 5_000_000, max_image_bytes: 4_000_000, max_line_bytes: 1_500_000, setting_chars: 120, counted_in: 'isolate' });
  assert.equal(r.json.stores_images, false); assert.equal(r.json.label, LABEL); assert.equal(r.json.api, 'interactions');
  assert.ok(!JSON.stringify(r.json).includes(KEY));
});

test('GET: configured with either key name, env overrides shown, the key never shown', async () => {
  for (const env of [{ GEMINI_API_KEY: KEY }, { GOOGLE_API_KEY: KEY }]) {
    const r = await call({ method: 'GET', env: { ...env, RENDER_GEMINI_FAST_MODEL: 'gemini-3.1-flash-lite-image', RENDER_GEMINI_BEST_MODEL: 'gemini-x-pro', RENDER_DAILY_CAP: '12', RENDER_IP_PER_MINUTE: '2', RENDER_IP_PER_DAY: '9', RENDER_GEMINI_API: 'generate-content' } });
    assert.equal(r.json.configured, true); assert.equal(r.calls.length, 0);
    assert.deepEqual(r.json.models, { fast: 'gemini-3.1-flash-lite-image', best: 'gemini-x-pro' });
    assert.equal(r.json.limits.daily_cap, 12); assert.equal(r.json.limits.per_minute, 2); assert.equal(r.json.limits.per_ip_day, 9);
    assert.equal(r.json.api, 'generate_content');
    assert.ok(!JSON.stringify(r.json).includes(KEY));
  }
});

// --- CORS and origin --------------------------------------------------------------------------------------------------------
test('origins: lab.assembl.co.nz and its pages.dev previews only, https only', () => {
  for (const o of ['https://lab.assembl.co.nz', 'https://assembl-lab.pages.dev', 'https://agent-render-1122.assembl-lab.pages.dev', 'https://3f2a9c1b.assembl-lab.pages.dev']) assert.equal(allowedOrigin(o), true, o);
  for (const o of [null, '', 'null', 'http://lab.assembl.co.nz', 'https://lab.assembl.co.nz.evil.test', 'https://evil-assembl-lab.pages.dev', 'https://assembl-lab.pages.dev.evil.test', 'https://other.pages.dev', 'https://assembl.co.nz', 'https://study.assembl.co.nz', 'https://lab.assembl.co.nz:8443', 'https://a.b.assembl-lab.pages.dev']) assert.equal(allowedOrigin(o), false, String(o));
});

test('OPTIONS and answers carry CORS headers for allowed origins only', async () => {
  const ok = await call({ method: 'OPTIONS', origin: 'https://x1.assembl-lab.pages.dev' });
  assert.equal(ok.status, 204); assert.equal(ok.headers.get('access-control-allow-origin'), 'https://x1.assembl-lab.pages.dev');
  assert.match(ok.headers.get('access-control-allow-methods'), /POST/);
  const bad = await call({ method: 'OPTIONS', origin: 'https://evil.test' });
  assert.equal(bad.headers.get('access-control-allow-origin'), null);
  const g = await call({ method: 'GET', origin: LAB });
  assert.equal(g.headers.get('access-control-allow-origin'), LAB); assert.equal(g.headers.get('cache-control'), 'no-store');
});

test('POST from another origin, or with no origin, is refused before anything is read or sent', async () => {
  for (const origin of ['https://evil.test', null]) {
    const r = await call({ origin });
    assert.equal(r.status, 403); assert.equal(r.json.error, 'origin'); assert.equal(r.calls.length, 0);
    assert.equal(r.json.message, MESSAGES.origin);
  }
});

test('no key: 503 not_configured in plain words, nothing sent', async () => {
  const r = await call({ env: {} });
  assert.equal(r.status, 503); assert.equal(r.json.error, 'not_configured'); assert.equal(r.calls.length, 0);
  assert.match(r.json.message, /no Google Gemini key/);
});

test('other methods: 405', async () => {
  const r = await call({ method: 'PUT', raw: '{}' });
  assert.equal(r.status, 405); assert.equal(r.calls.length, 0);
});

// --- input checks -----------------------------------------------------------------------------------------------------------
test('bodies over 5 MB are refused, by length header or by counting a streamed body', async () => {
  const big = 'x'.repeat(MAX_BODY + 1);
  const a = await call({ raw: big });
  assert.equal(a.status, 413); assert.equal(a.json.error, 'too_large'); assert.equal(a.calls.length, 0);
  // a streamed body has no length header: the function counts as it reads and stops past 5 MB
  const chunk = new Uint8Array(1_000_000).fill(120);
  let sent = 0;
  const stream = new ReadableStream({ pull(c) { if (sent >= 7) return c.close(); sent++; c.enqueue(chunk); } });
  const real = globalThis.fetch; let hits = 0; globalThis.fetch = async () => { hits++; return interactionOk(); };
  try {
    const res = await onRequest({ request: new Request('https://lab.assembl.co.nz/api/render', { method: 'POST', body: stream, duplex: 'half', headers: { origin: LAB } }), env: ENV });
    assert.equal(res.status, 413); assert.equal(hits, 0); assert.ok(sent <= 7);
  } finally { globalThis.fetch = real; }
});

test('a body of exactly 5 MB is read (the limit is "over 5 MB")', async () => {
  const obj = { image: PNG, look: { time: 'midday' }, confirm: true };
  const raw = JSON.stringify(obj) + ' '.repeat(MAX_BODY - JSON.stringify(obj).length);
  assert.equal(Buffer.byteLength(raw), MAX_BODY);
  const r = await call({ raw });
  assert.equal(r.status, 200); assert.equal(r.calls.length, 1);
});

test('bad JSON and missing images', async () => {
  assert.equal((await call({ raw: '{nope' })).json.error, 'bad_json');
  assert.equal((await call({ raw: '[1,2]' })).json.error, 'bad_json');
  assert.equal((await call({ body: { look: { time: 'golden' } } })).json.error, 'image_required');
  assert.equal((await call({ body: { image: 'https://x.test/a.png', look: { time: 'golden' } } })).json.error, 'image_required');
  const r = await call({ body: { look: { time: 'golden' } } });
  assert.equal(r.status, 400); assert.equal(r.calls.length, 0);
});

test('images: PNG, JPEG and WebP are read from their own headers; anything else or a mislabelled file is refused', () => {
  assert.deepEqual(imageSize('image/png', png(1400, 900)), { w: 1400, h: 900 });
  assert.deepEqual(imageSize('image/jpeg', jpeg(1280, 720)), { w: 1280, h: 720 });
  assert.deepEqual(imageSize('image/webp', webpX(1000, 1500)), { w: 1000, h: 1500 });
  assert.deepEqual(imageSize('image/webp', webpL(777, 555)), { w: 777, h: 555 });
  assert.deepEqual(imageSize('image/webp', webpLossy(640, 480)), { w: 640, h: 480 });
  assert.equal(imageSize('image/png', jpeg(800, 600)), null);
  assert.equal(imageSize('image/jpeg', png(800, 600)), null);
  assert.equal(imageSize('image/webp', png(800, 600)), null);
  const c = (image) => checkInput({ image, look: { time: 'golden' } }).error;
  assert.equal(c(url('image/gif', Buffer.from('GIF89a......'))), 'image_unreadable');
  assert.equal(c(url('image/png', jpeg(800, 600))), 'image_unreadable');
  assert.equal(c('data:image/png;base64,***'), 'image_unreadable');
  assert.equal(c(url('image/png', png(200, 900))), 'image_size');
  assert.equal(c(url('image/png', png(5000, 900))), 'image_size');
  assert.equal(c(url('image/jpeg', jpeg(1280, 720))), undefined);
  assert.equal(c(url('image/webp', webpX(1000, 1500))), undefined);
});

test('images over 4 MB decoded are refused (checked directly: a 5 MB body cannot carry one)', () => {
  const big = 'data:image/png;base64,' + png(1000, 1000, 199).toString('base64') + 'A'.repeat(Math.ceil(MAX_IMAGE * 4 / 3));
  assert.equal(checkInput({ image: big, look: { time: 'golden' } }).error, 'image_too_large');
  assert.ok(Math.ceil(MAX_IMAGE * 4 / 3) > MAX_BODY);
});

test('quality and look are checked; quality defaults to fast', () => {
  const base = { image: PNG, look: { time: 'golden' } };
  assert.equal(checkInput(base).quality, 'fast');
  assert.equal(checkInput({ ...base, quality: 'best' }).quality, 'best');
  assert.equal(checkInput({ ...base, quality: 'ultra' }).error, 'bad_quality');
  assert.equal(checkInput({ image: PNG }).error, 'bad_time');
  assert.equal(checkInput({ image: PNG, look: { time: 'dusk' } }).error, 'bad_time');
  for (const time of ['morning', 'midday', 'golden', 'overcast']) assert.equal(checkInput({ image: PNG, look: { time } }).error, undefined);
  assert.equal(checkInput({ image: PNG, look: { time: 'golden', season: 'autumn' } }).error, 'bad_season');
  assert.equal(checkInput({ image: PNG, look: { time: 'golden', season: 'winter' } }).look.season, 'winter');
  assert.equal(checkInput({ image: PNG, look: { time: 'golden', season: '' } }).look.season, undefined);
  assert.equal(checkInput({ image: PNG, look: { time: 'golden', setting: 'x'.repeat(SETTING_MAX) } }).error, undefined);
  assert.equal(checkInput({ image: PNG, look: { time: 'golden', setting: 'x'.repeat(SETTING_MAX + 1) } }).error, 'setting_too_long');
  assert.equal(checkInput({ image: PNG, look: { time: 'golden', setting: 42 } }).error, 'setting_too_long');
  assert.equal(cleanSetting('  Coastal\n\tridge <script>{x}</script>  '), 'Coastal ridge script x /script');
});

test('refused input is never counted and never sent', async () => {
  const env = { ...ENV, RENDER_IP_PER_MINUTE: '1' };
  for (let i = 0; i < 5; i++) assert.equal((await call({ env, body: { image: PNG, look: { time: 'nope' } } })).json.error, 'bad_time');
  const r = await call({ env });
  assert.equal(r.status, 200); assert.equal(r.calls.length, 1);
});

test('spending is explicit: no confirm: true, no call and no count, and the answer carries the estimate', async () => {
  const env = { ...ENV, RENDER_IP_PER_MINUTE: '1' };
  for (const confirm of [undefined, false, 'yes', 1]) {
    const body = { image: PNG, quality: 'best', look: { time: 'golden' }, confirm };
    const r = await call({ env, body });
    assert.equal(r.status, 402); assert.equal(r.json.error, 'confirm_spend'); assert.equal(r.calls.length, 0);
    assert.equal(r.json.estimate.usd, 0.15); assert.equal(r.json.estimate.model, 'gemini-3-pro-image'); assert.match(r.json.estimate.text, /US\$0\.134/);
  }
  assert.equal((await call({ env })).status, 200); // nothing above was counted against the one a minute
});

test('GET carries the estimate for each quality; an overridden model is sent to Google\'s price page, not guessed', async () => {
  const r = await call({ method: 'GET' });
  assert.equal(r.json.needs_confirm, true);
  assert.deepEqual(r.json.estimate.fast, { model: 'gemini-nano-banana-2.1', ...ESTIMATES.fast });
  assert.deepEqual(r.json.estimate.best, { model: 'gemini-3-pro-image', ...ESTIMATES.best });
  assert.match(ESTIMATES.fast.text, /US\$0\.0336/);
  const o = estimateOf({ RENDER_GEMINI_FAST_MODEL: 'gemini-3.1-flash-lite-image' }, 'fast');
  assert.equal(o.usd, null); assert.match(o.text, /gemini-3\.1-flash-lite-image.*Google's pricing page/);
});

// --- prompt -----------------------------------------------------------------------------------------------------------------
test('prompt: keeps the view and every building element, NZ light and native planting, no people, text, watermark or logos', () => {
  const p = buildPrompt({ time: 'golden', season: 'winter', setting: 'Bush ridge' }, '3:2');
  for (const s of ['architectural photograph', 'exact 3D model view', 'same position, lens, framing and horizon', 'wall, opening, window, door, roof line, deck', 'proportion exactly as drawn',
    'Do not add, remove, move, resize, widen or straighten any building element', "the stair's run, its turns, its landings and every step", 'every balustrade post and glass panel',
    'the deck edges, the roof line and fascia, and every pole and pile', 'Only the materials, light, sky and planting may change',
    'New Zealand native species only', 'only on ground that can be seen', 'hides no part of the building',
    'No people, no text, no watermark, no logos.', "one image at the input's aspect ratio (3:2)", 'golden-hour New Zealand sun', 'Winter:', '"Bush ridge"', 'never changes the building'])
    assert.ok(p.includes(s), s);
  const plain = buildPrompt({ time: 'overcast' }, '16:9');
  assert.ok(plain.includes('overcast New Zealand sky')); assert.ok(!plain.includes('Setting')); assert.ok(!/Summer:|Winter:/.test(plain));
  assert.ok(!/line drawing|black line/.test(p), 'no drawing, no words about one');
  assert.ok(buildPrompt({ time: 'morning', season: 'summer' }, '1:1').includes('Summer:'));
  assert.ok(buildPrompt({ time: 'midday' }, '1:1').includes('midday New Zealand sun'));
});

test('the prompt sent is the one built, with the setting cleaned', async () => {
  const r = await call({ body: { image: PNG, quality: 'fast', look: { time: 'morning', season: 'summer', setting: 'Hillside\nabove the harbour' } } });
  assert.equal(r.status, 200);
  assert.equal(r.calls[0].body.input[0].text, buildPrompt({ time: 'morning', season: 'summer', setting: 'Hillside above the harbour' }, '3:2'));
});

test('aspect ratio: the nearest shape Google makes', () => {
  assert.equal(nearestRatio(1500, 1000), '3:2'); assert.equal(nearestRatio(1400, 900), '3:2'); assert.equal(nearestRatio(1920, 1080), '16:9');
  assert.equal(nearestRatio(1000, 1000), '1:1'); assert.equal(nearestRatio(900, 1600), '9:16'); assert.equal(nearestRatio(780, 1000), '4:5');
  assert.equal(nearestRatio(2560, 1080), '21:9'); assert.equal(nearestRatio(4000, 500), '21:9'); assert.equal(nearestRatio(1200, 900), '4:3');
  for (const r of RATIOS) { const [a, b] = r.split(':').map(Number); assert.equal(nearestRatio(a * 100, b * 100), r); }
});

// --- model selection and the request ------------------------------------------------------------------------------------------
test('fast: Nano Banana 2.1 at 1K, least thinking, JPEG out at the view\'s ratio, Google keeps nothing', async () => {
  const r = await call({ body: { image: url('image/jpeg', jpeg(1920, 1080)), quality: 'fast', look: { time: 'midday' } } });
  assert.equal(r.status, 200); assert.equal(r.calls.length, 1);
  const c = r.calls[0];
  assert.equal(c.url, 'https://generativelanguage.googleapis.com/v1beta/interactions');
  assert.ok(!c.url.includes(KEY));
  assert.equal(c.init.headers['x-goog-api-key'], KEY); assert.equal(c.init.headers['api-revision'], '2026-05-20');
  assert.equal(c.body.model, DEFAULT_MODELS.fast); assert.equal(c.body.model, 'gemini-nano-banana-2.1');
  assert.deepEqual(c.body.response_format, { type: 'image', mime_type: 'image/jpeg', aspect_ratio: '16:9', image_size: '1K' });
  assert.deepEqual(c.body.generation_config, { thinking_level: 'minimal' });
  assert.equal(c.body.store, false);
  assert.equal(c.body.input.length, 2); assert.equal(c.body.input[0].type, 'text');
  assert.deepEqual(c.body.input[1], { type: 'image', mime_type: 'image/jpeg', data: jpeg(1920, 1080).toString('base64') });
});

test('best: Nano Banana Pro at 2K with its own thinking', async () => {
  const r = await call({ body: { image: PNG, quality: 'best', look: { time: 'golden' } }, handler: () => interactionOk(OUT, 'gemini-3-pro-image') });
  const b = r.calls[0].body;
  assert.equal(b.model, 'gemini-3-pro-image'); assert.equal(b.response_format.image_size, '2K'); assert.equal(b.response_format.aspect_ratio, '3:2');
  assert.equal(b.generation_config, undefined); assert.equal(b.store, false);
  assert.equal(r.json.model, 'gemini-3-pro-image'); assert.equal(r.json.quality, 'best');
});

test('model ids come from the environment when set', async () => {
  const env = { ...ENV, RENDER_GEMINI_FAST_MODEL: 'gemini-3.1-flash-lite-image', RENDER_GEMINI_BEST_MODEL: 'gemini-next-pro-image' };
  assert.equal((await call({ env, body: { image: PNG, quality: 'fast', look: { time: 'golden' } } })).calls[0].body.model, 'gemini-3.1-flash-lite-image');
  const best = await call({ env, body: { image: PNG, quality: 'best', look: { time: 'golden' } } });
  assert.equal(best.calls[0].body.model, 'gemini-next-pro-image'); assert.equal(best.calls[0].body.generation_config, undefined);
  // a Pro model put on fast gets no thinking level (Google documents none for Pro)
  const g = geminiRequest({ RENDER_GEMINI_FAST_MODEL: 'gemini-3-pro-image' }, 'fast', 'p', { type: 'image/png', data: 'AA==' }, '1:1');
  assert.equal(g.body.generation_config, undefined);
});

test('the answer: the final image only (thought images skipped), the model, the prompt revision, the time taken', async () => {
  const r = await call();
  assert.equal(r.status, 200);
  assert.equal(r.json.image, `data:image/jpeg;base64,${OUT}`);
  assert.equal(r.json.model, 'gemini-nano-banana-2.1'); assert.equal(r.json.prompt_revision, RENDER_PROMPTS);
  assert.equal(typeof r.json.took_ms, 'number'); assert.ok(r.json.took_ms >= 0);
  assert.equal(r.json.aspect_ratio, '3:2'); assert.equal(r.json.label, LABEL);
  assert.equal(LABEL, 'Generated from the model view by Google Gemini. Not a photograph, and not a checked drawing.');
});

test('generateContent, if switched to: the legacy request and answer shapes', async () => {
  const env = { ...ENV, RENDER_GEMINI_API: 'generate_content' };
  const r = await call({ env, body: { image: PNG, quality: 'best', look: { time: 'overcast' } }, handler: () => reply({ modelVersion: 'gemini-3-pro-image', candidates: [{ finishReason: 'STOP', content: { parts: [{ thought: true, inlineData: { mimeType: 'image/png', data: 'VEhPVUdIVA==' } }, { text: 'here it is' }, { inlineData: { mimeType: 'image/png', data: OUT } }] } }] }) });
  assert.equal(r.status, 200);
  const c = r.calls[0];
  assert.equal(c.url, 'https://generativelanguage.googleapis.com/v1/models/gemini-3-pro-image:generateContent');
  assert.equal(c.init.headers['x-goog-api-key'], KEY);
  assert.deepEqual(c.body.generationConfig, { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '3:2', imageSize: '2K' } });
  assert.equal(c.body.contents[0].parts[1].inline_data.data, PNG.split(',')[1]);
  assert.equal(r.json.image, `data:image/png;base64,${OUT}`); assert.equal(r.json.model, 'gemini-3-pro-image');
});

test('readAnswer: the schema before May 2026 (outputs) is still read; blocked and empty answers are told apart', () => {
  assert.equal(readAnswer({ outputs: [{ type: 'text', text: 'x' }, { type: 'image', mime_type: 'image/jpeg', data: OUT }] }).image, `data:image/jpeg;base64,${OUT}`);
  assert.equal(readAnswer({ steps: [{ type: 'model_output', content: [{ type: 'text', text: 'I cannot' }] }] }).error, 'no_image');
  assert.equal(readAnswer({ steps: [{ type: 'thought', summary: [{ type: 'image', data: OUT }] }] }).error, 'no_image');
  assert.equal(readAnswer({ status: 'failed', steps: [] }).error, 'model_error');
  assert.equal(readAnswer({ error: { code: 'image_safety', message: 'x' } }).error, 'declined');
  assert.equal(readAnswer({ error: { code: 'no_image' } }).error, 'no_image');
  assert.equal(readAnswer({ candidates: [{ finishReason: 'IMAGE_SAFETY', content: { parts: [] } }] }).error, 'declined');
  assert.equal(readAnswer({ promptFeedback: { blockReason: 'SAFETY' } }).error, 'declined');
});

// --- error mapping ------------------------------------------------------------------------------------------------------------
test('Google errors become plain-English answers, and the key is never logged', async () => {
  const cases = [
    [() => reply({ error: { code: 'rate_limit_exceeded', message: 'slow' } }, 429), 503, 'busy'],
    [() => reply({ error: { code: 'service_unavailable', message: 'down' } }, 503), 503, 'busy'],
    [() => reply({ error: { code: 'image_safety', message: 'blocked' } }, 400), 422, 'declined'],
    [() => reply({ error: { code: 'prohibited_content' } }, 400), 422, 'declined'],
    [() => reply({ error: { code: 'deadline_exceeded' } }, 504), 504, 'timeout'],
    [() => reply({ error: { code: 'authentication', message: 'bad key' } }, 401), 502, 'model_error'],
    [() => reply({ error: { code: 'model_not_found' } }, 404), 502, 'model_error'],
    [() => new Response('<html>oops</html>', { status: 500 }), 502, 'model_error'],
    [() => new Response('not json', { status: 200 }), 502, 'model_error'],
    [() => reply({ status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'text', text: 'no' }] }] }), 502, 'no_image'],
    [() => reply({ status: 'failed', error: { code: 'image_other' } }), 422, 'declined'],
    [() => { const e = new Error('aborted'); e.name = 'AbortError'; throw e; }, 504, 'timeout'],
    [() => { throw new Error('socket hang up'); }, 502, 'model_error'],
  ];
  for (const [handler, status, error] of cases) {
    _resetCounters();
    const r = await call({ handler });
    assert.equal(r.status, status, error); assert.equal(r.json.error, error);
    assert.equal(r.json.message, MESSAGES[error]); assert.ok(!r.json.image);
    for (const w of r.warns) assert.ok(!w.includes(KEY), 'key in a log line');
    assert.ok(!r.warns.join(' ').includes('203.0.113.7'), 'IP in a log line');
  }
});

test('every error code has a plain-English message with no bare "AI"', () => {
  for (const [code, msg] of Object.entries(MESSAGES)) {
    assert.ok(msg.length > 10 && /[.!]$/.test(msg), code);
    assert.ok(!/\bAI\b/.test(msg), code);
  }
});

// --- limits -------------------------------------------------------------------------------------------------------------------
test('per IP: 6 a minute, then "slow down" with a retry time; another IP is not held up', async () => {
  for (let i = 0; i < 6; i++) assert.equal((await call()).status, 200, `call ${i + 1}`);
  const seventh = await call();
  assert.equal(seventh.status, 429); assert.equal(seventh.json.error, 'slow_down'); assert.equal(seventh.json.retry_after, 60); assert.equal(seventh.calls.length, 0);
  assert.equal((await call({ ip: '198.51.100.4' })).status, 200);
});

test('per IP: 40 a day', async () => {
  const env = { ...ENV, RENDER_IP_PER_MINUTE: '1000' };
  for (let i = 0; i < 40; i++) assert.equal((await call({ env })).status, 200);
  const r = await call({ env });
  assert.equal(r.status, 429); assert.equal(r.json.error, 'ip_daily'); assert.equal(r.calls.length, 0);
});

test('all callers: RENDER_DAILY_CAP a day (default 100), across IPs', async () => {
  assert.equal(limitsOf({}).daily_cap, 100);
  const env = { ...ENV, RENDER_DAILY_CAP: '3' };
  for (const ip of ['192.0.2.1', '192.0.2.2', '192.0.2.3']) assert.equal((await call({ env, ip })).status, 200);
  const r = await call({ env, ip: '192.0.2.4' });
  assert.equal(r.status, 429); assert.equal(r.json.error, 'daily_cap'); assert.equal(r.calls.length, 0);
});

test('a request sent to Google counts even when Google fails (it may still be billed)', async () => {
  const env = { ...ENV, RENDER_DAILY_CAP: '2' };
  assert.equal((await call({ env, handler: () => reply({ error: { code: 'api_error' } }, 500) })).status, 502);
  assert.equal((await call({ env, handler: () => reply({ error: { code: 'api_error' } }, 500) })).status, 502);
  assert.equal((await call({ env })).json.error, 'daily_cap');
});

test('with a KV binding the counts live there, keyed by a hash, never by the IP, and hold across instances', async () => {
  const store = new Map(), puts = [];
  const RENDER_KV = { get: async (k) => store.get(k) ?? null, put: async (k, v, o) => { puts.push([k, v, o]); store.set(k, v); } };
  const env = { ...ENV, RENDER_KV, RENDER_IP_PER_MINUTE: '2' };
  assert.equal((await call({ method: 'GET', env })).json.limits.counted_in, 'kv');
  assert.equal((await call({ env })).status, 200);
  _resetCounters(); // a fresh isolate: only KV remembers
  assert.equal((await call({ env })).status, 200);
  _resetCounters();
  assert.equal((await call({ env })).json.error, 'slow_down');
  for (const [k, v, o] of puts) {
    assert.ok(k.startsWith('render:')); assert.ok(!k.includes('203.0.113.7')); assert.match(v, /^\d+$/); assert.ok(o.expirationTtl >= 60);
  }
});

test('without KV, Cloudflare\'s Cache API holds the counts (per data centre); stored values are counts, never images', async () => {
  const store = new Map(), saved = globalThis.caches;
  globalThis.caches = { default: { match: async (u) => (store.has(String(u)) ? new Response(store.get(String(u))) : undefined), put: async (u, res) => { store.set(String(u), await res.text()); } } };
  try {
    const env = { ...ENV, RENDER_IP_PER_MINUTE: '1' };
    assert.equal((await call({ method: 'GET', env })).json.limits.counted_in, 'cache');
    assert.equal((await call({ env })).status, 200);
    _resetCounters();
    assert.equal((await call({ env })).json.error, 'slow_down');
    for (const [u, v] of store) { assert.ok(u.startsWith('https://lab.assembl.co.nz/api/render/_limits/')); assert.ok(!u.includes('203.0.113.7')); assert.match(v, /^\d+$/); }
  } finally { if (saved === undefined) delete globalThis.caches; else globalThis.caches = saved; }
});

test('a broken shared counter falls back to the in-isolate one', async () => {
  const RENDER_KV = { get: async () => { throw new Error('kv down'); }, put: async () => { throw new Error('kv down'); } };
  const env = { ...ENV, RENDER_KV, RENDER_IP_PER_MINUTE: '1' };
  assert.equal((await call({ env })).status, 200);
  assert.equal((await call({ env })).json.error, 'slow_down');
});

// --- the line drawing of the same view (agent/photo-film-1123) -----------------------------------------------------------------
const LINE = url('image/png', png(1500, 1000));
test('line drawing: the prompt names it, asks every building edge to lie on its black lines, and never to draw them', () => {
  const p = buildPrompt({ time: 'golden' }, '3:2', true);
  for (const s of ['The second image is a line drawing of exactly the same view', 'every black line is an edge of the building', 'grey lines are furniture, planting and ground',
    'every edge of the building in the photograph must lie on a black line of the drawing', 'every black line must still be an edge', 'Do not draw the lines',
    "the stair's run, its turns, its landings and every step", 'Only the materials, light, sky and planting may change', 'No people, no text, no watermark, no logos.'])
    assert.ok(p.includes(s), s);
  assert.ok(!/\bAI\b/.test(p));
});

test('line drawing: checked before anything is counted: readable, the view\'s shape, not too large', () => {
  const base = { image: PNG, quality: 'fast', look: { time: 'golden' } };
  assert.equal(checkInput({ ...base, line: LINE }).line.type, 'image/png');
  assert.equal(checkInput({ ...base, line: '' }).line, null);
  assert.equal(checkInput(base).line, null);
  assert.equal(checkInput({ ...base, line: 'nonsense' }).error, 'line_unreadable');
  assert.equal(checkInput({ ...base, line: 42 }).error, 'line_unreadable');
  assert.equal(checkInput({ ...base, line: url('image/png', Buffer.from('not a png at all, really not')) }).error, 'line_unreadable');
  assert.equal(checkInput({ ...base, line: url('image/png', png(1000, 1000)) }).error, 'line_shape');
  assert.equal(checkInput({ ...base, line: url('image/png', png(150, 100)) }).error, 'line_shape');
  assert.equal(checkInput({ ...base, line: url('image/jpeg', jpeg(1512, 1000)) }).line.type, 'image/jpeg'); // within 1.5% of 3:2
  assert.equal(checkInput({ ...base, line: url('image/png', png(1500, 1000, 1_600_000)) }).error, 'line_too_large');
});

test('line drawing: sent to Google as the second image (both APIs), the reply says it was used, refusals cost nothing', async () => {
  const r = await call({ body: { image: PNG, line: LINE, quality: 'fast', look: { time: 'golden' } } });
  assert.equal(r.status, 200); assert.equal(r.json.line_used, true); assert.equal(r.json.label, LABEL);
  const inp = r.calls[0].body.input;
  assert.equal(inp.length, 3); assert.equal(inp[1].data, PNG.split(',')[1]); assert.equal(inp[2].type, 'image'); assert.equal(inp[2].data, LINE.split(',')[1]);
  assert.equal(inp[0].text, buildPrompt({ time: 'golden' }, '3:2', true));
  const g = geminiRequest({ ...ENV, RENDER_GEMINI_API: 'generate_content' }, 'best', 'p', { type: 'image/png', data: 'AA==' }, '3:2', { type: 'image/png', data: 'BB==' });
  assert.deepEqual(g.body.contents[0].parts.map((x) => x.inline_data?.data ?? x.text), ['p', 'AA==', 'BB==']);
  const plain = await call({ body: { image: PNG, quality: 'fast', look: { time: 'golden' } } });
  assert.equal(plain.json.line_used, false); assert.equal(plain.calls[0].body.input.length, 2);
  _resetCounters();
  const bad = await call({ body: { image: PNG, line: url('image/png', png(900, 900)), quality: 'fast', look: { time: 'golden' } } });
  assert.equal(bad.status, 400); assert.equal(bad.json.error, 'line_shape'); assert.equal(bad.calls.length, 0);
  const big = await call({ body: { image: PNG, line: url('image/png', png(1500, 1000, 1_600_000)), quality: 'fast', look: { time: 'golden' } } });
  assert.equal(big.status, 413); assert.equal(big.calls.length, 0);
  const st = await call({ method: 'GET' });
  assert.equal(st.json.accepts_line, true); assert.ok(st.json.limits.max_line_bytes > 0);
  for (const x of [r, plain, bad, big, st]) assert.ok(!JSON.stringify(x.json).includes(KEY), 'key in an answer');
});
