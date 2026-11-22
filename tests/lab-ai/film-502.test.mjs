// /api/film: Google's failures never leave as a 502 or 504 (the lab's own domain swaps those for Cloudflare's plain-text
// "error code: 502" page, which hid the reason), and Google's reason, in either of its error shapes, is passed on.
// Offline: fetch is stubbed, the key is fake. Run with:  node --test tests/lab-ai/film-502.test.mjs
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { onRequest, errorOf, upstreamOf, _resetCounters } from '../../functions/api/film.js';

const KEY = 'fake-gemini-KEY-502';
const be32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const box = (type, ...kids) => { const b = kids.flat(); return [...be32(8 + b.length), ...Buffer.from(type), ...b]; };
function clip(seconds = 3, w = 640, h = 360) {
  const mvhd = box('mvhd', [0, 0, 0, 0], be32(0), be32(0), be32(1000), be32(seconds * 1000), new Array(80).fill(0));
  const vide = box('trak', box('tkhd', [0, 0, 0, 3], new Array(72).fill(0), be32(w * 65536), be32(h * 65536)), box('mdia', box('hdlr', [0, 0, 0, 0], be32(0), [...Buffer.from('vide')], new Array(12).fill(0))));
  const b = Buffer.concat([Buffer.from(box('ftyp', [...Buffer.from('isom')], be32(512))), Buffer.from(box('moov', mvhd, vide)), Buffer.from(box('mdat', new Array(32).fill(9)))]);
  return `data:video/mp4;base64,${b.toString('base64')}`;
}
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
async function send(handler, mode = 'wait') {
  const real = globalThis.fetch, warn = console.warn, warns = [];
  console.warn = (...a) => warns.push(a.join(' '));
  globalThis.fetch = async () => handler();
  try {
    const request = new Request('https://lab.assembl.co.nz/api/film', { method: 'POST', headers: { origin: 'https://lab.assembl.co.nz', 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.7' }, body: JSON.stringify({ video: clip(), resolution: '360p', mode, confirm: true }) });
    const res = await onRequest({ request, env: { GEMINI_API_KEY: KEY } });
    const text = await res.text();
    return { status: res.status, text, json: JSON.parse(text), warns };
  } finally { globalThis.fetch = real; console.warn = warn; }
}
beforeEach(() => _resetCounters());

test('every way Google can fail answers with something other than 502 or 504, as JSON', async () => {
  const bad = { code: 400, message: 'Invalid value at response_format', status: 'INVALID_ARGUMENT' };
  const cases = [
    () => reply([{ error: bad }], 400),
    () => reply({ error: bad }, 400),
    () => reply({ error: { code: 500, status: 'INTERNAL', message: 'x' } }, 500),
    () => reply({ error: { code: 503, status: 'UNAVAILABLE' } }, 503),
    () => reply({ error: { code: 504, status: 'DEADLINE_EXCEEDED' } }, 504),
    () => reply('not json at all', 502),
    () => reply({ id: 'v1_x', status: 'completed', steps: [] }),
    () => { throw new Error('socket hang up'); },
    () => { const e = new Error('aborted'); e.name = 'AbortError'; throw e; },
  ];
  for (const [i, h] of cases.entries()) {
    _resetCounters();
    const r = await send(h);
    assert.ok(r.status !== 502 && r.status !== 504, `case ${i} answered ${r.status}`);
    assert.ok(r.json.error && r.json.message, `case ${i} has a reason`);
    assert.ok(!r.text.includes(KEY));
  }
});

test('Google\'s array-shaped bad-request error is read: it is "refused", with Google\'s own words passed on', async () => {
  const r = await send(() => reply([{ error: { code: 400, message: 'Invalid value at response_format.delivery', status: 'INVALID_ARGUMENT' } }], 400));
  assert.equal(r.status, 424); assert.equal(r.json.error, 'refused');
  assert.deepEqual(r.json.upstream, { http: 400, code: '400', status: 'INVALID_ARGUMENT', message: 'Invalid value at response_format.delivery' });
  assert.ok(r.warns.some((w) => w.includes('INVALID_ARGUMENT')), 'the log line has the reason too');
});

test('errorOf and upstreamOf: both shapes, clipped, a key-shaped string removed', () => {
  assert.equal(errorOf([{ error: { code: 400 } }]).code, 400);
  assert.equal(errorOf({ error: { code: 1 } }).code, 1);
  assert.equal(errorOf('x'), null); assert.equal(errorOf([]), null); assert.equal(errorOf(null), null);
  const u = upstreamOf(400, [{ error: { code: 400, status: 'INVALID_ARGUMENT', message: 'bad key AIzaSyA1234567890abcdefgh ' + 'y'.repeat(400) } }]);
  assert.ok(!u.message.includes('AIza')); assert.ok(u.message.length <= 300);
  assert.deepEqual(upstreamOf(502, 'html'), { http: 502, code: undefined, status: undefined, message: undefined });
});
