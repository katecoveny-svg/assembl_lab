// "Make it a film" (/api/film): every check runs offline. fetch is stubbed, keys are fake, Google is never called.
// Run with:  node --test tests/photo-film/*.test.mjs
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  onRequest, checkFilmInput, buildFilmPrompt, geminiFilmRequest, readFilm, mp4Info, aspectOf, planSegments, makeHandle, readHandle, estimateOf,
  _resetCounters, limitsOf, partMaxOf, modeOf, FILM_PROMPTS, DEFAULT_MODEL, MESSAGES, LABEL, MAX_BODY, MAX_VIDEO, MIN_SECONDS, PART_MAX,
} from '../../functions/api/film.js';
import { LABEL as PHOTO_LABEL } from '../../functions/api/render.js';

const KEY = 'fake-gemini-KEY-7c1d';
const ENV = { GEMINI_API_KEY: KEY };
const LAB = 'https://lab.assembl.co.nz';

// --- a made-up MP4: only the boxes the function reads (ftyp, moov/mvhd, trak/tkhd, mdia/hdlr) --------------------------------
const be32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const box = (type, ...kids) => { const body = kids.flat(); return [...be32(8 + body.length), ...Buffer.from(type), ...body]; };
function mp4({ seconds = 8, w = 1280, h = 720, timescale = 1000, pad = 0, v1 = false } = {}) {
  const dur = Math.round(seconds * timescale);
  const mvhd = v1 ? box('mvhd', [1, 0, 0, 0], new Array(16).fill(0), be32(timescale), be32(0), be32(dur), new Array(80).fill(0)) : box('mvhd', [0, 0, 0, 0], be32(0), be32(0), be32(timescale), be32(dur), new Array(80).fill(0));
  const tkhd = box('tkhd', [0, 0, 0, 3], new Array(72).fill(0), be32(w * 65536), be32(h * 65536));
  const sound = box('trak', box('tkhd', [0, 0, 0, 3], new Array(72).fill(0), be32(0), be32(0)), box('mdia', box('hdlr', [0, 0, 0, 0], be32(0), [...Buffer.from('soun')], new Array(12).fill(0))));
  const vide = box('trak', tkhd, box('mdia', box('hdlr', [0, 0, 0, 0], be32(0), [...Buffer.from('vide')], new Array(12).fill(0))));
  return Buffer.from([...box('ftyp', [...Buffer.from('isom')], be32(512)), ...box('moov', mvhd, sound, vide), ...box('mdat', new Array(pad).fill(9))]);
}
const vurl = (b) => `data:video/mp4;base64,${b.toString('base64')}`;
const png = (w, h) => Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, ...be32(w), ...be32(h), 8, 6, 0, 0, 0, 1, 2, 3]);
const PNG = `data:image/png;base64,${png(1280, 720).toString('base64')}`;
const CLIP = vurl(mp4());
const OUTV = Buffer.from('a generated mp4').toString('base64');

// --- Google's answers, in the shapes its docs give ------------------------------------------------------------------------
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const running = (id = 'v1_job42') => reply({ id, object: 'interaction', model: DEFAULT_MODEL, status: 'in_progress' });
const done = (data = OUTV) => reply({ id: 'v1_job42', object: 'interaction', model: DEFAULT_MODEL, status: 'completed', steps: [
  { type: 'user_input', content: [{ type: 'text', text: '...' }] },
  { type: 'thought', content: [{ type: 'thought', text: 'planning' }] },
  { type: 'model_output', content: [{ type: 'video', mime_type: 'video/mp4', data }] },
] });

async function call({ method = 'POST', env = ENV, body, raw, origin = LAB, ip = '203.0.113.9', handler = () => running(), query = '', headers = {} } = {}) {
  const calls = [], warns = [], real = globalThis.fetch, warn = console.warn;
  console.warn = (...a) => warns.push(a.map(String).join(' '));
  globalThis.fetch = async (u, init) => { calls.push({ url: String(u), method: init?.method ?? 'GET', headers: init?.headers, body: init?.body ? JSON.parse(init.body) : null }); return handler(calls.at(-1)); };
  try {
    const h = { 'content-type': 'application/json', ...headers };
    if (origin) h.origin = origin;
    if (ip) h['cf-connecting-ip'] = ip;
    const init = { method, headers: h };
    const b = body ?? { video: CLIP };
    if (method === 'POST') init.body = raw ?? JSON.stringify('confirm' in b ? b : { ...b, confirm: true });
    const res = await onRequest({ request: new Request(`https://lab.assembl.co.nz/api/film${query}`, init), env });
    const text = await res.text();
    let json = null; try { json = JSON.parse(text); } catch { /* 204 */ }
    return { status: res.status, headers: res.headers, json, text, calls, warns };
  } finally { globalThis.fetch = real; console.warn = warn; }
}
const noKey = (r) => { assert.ok(!r.text.includes(KEY), 'key in an answer'); for (const w of r.warns) assert.ok(!w.includes(KEY) && !w.includes('203.0.113.9'), 'key or IP in a log line'); };

beforeEach(() => _resetCounters());

// --- the clip ---------------------------------------------------------------------------------------------------------------
test('MP4 boxes: length from the movie header (v0 and v1), size from the video track (not the sound track)', () => {
  assert.deepEqual(mp4Info(mp4({ seconds: 8 })), { seconds: 8, w: 1280, h: 720 });
  assert.deepEqual(mp4Info(mp4({ seconds: 4.5, w: 720, h: 1280, timescale: 90000, v1: true })), { seconds: 4.5, w: 720, h: 1280 });
  assert.equal(mp4Info(Buffer.from('not an mp4 at all, not even close')), null);
  assert.equal(mp4Info(Buffer.from([...box('ftyp', [...Buffer.from('isom')]), ...box('mdat', [1, 2, 3])])), null, 'no movie header');
  assert.equal(aspectOf(1280, 720), '16:9'); assert.equal(aspectOf(720, 1280), '9:16'); assert.equal(aspectOf(1920, 1088), '16:9');
  assert.equal(aspectOf(1040, 780), null); assert.equal(aspectOf(0, 0), null);
});

test('parts: whole seconds within the limit, as even as they go, covering every frame once, each after the first guided', () => {
  const p = planSegments(384, 24, 10);
  assert.deepEqual(p.map((x) => [x.from, x.to, x.seconds, x.ask, x.guided]), [[0, 192, 8, 8, false], [192, 384, 8, 8, true]]);
  assert.deepEqual(planSegments(240, 24, 10).map((x) => x.seconds), [10]);
  assert.deepEqual(planSegments(408, 24, 10).map((x) => x.seconds), [9, 8]);
  assert.deepEqual(planSegments(384, 24, 15).map((x) => x.seconds), [8, 8]);
  const odd = planSegments(396, 24, 15); assert.deepEqual(odd.map((x) => [x.seconds, x.ask]), [[8, 8], [8.5, 9]]);
  for (const [f, fps, max] of [[384, 24, 10], [1000, 24, 10], [2400, 24, 15], [73, 24, 10], [720, 30, 10]]) {
    const q = planSegments(f, fps, max);
    assert.equal(q[0].from, 0); assert.equal(q.at(-1).to, f);
    for (let k = 1; k < q.length; k++) assert.equal(q[k].from, q[k - 1].to);
    for (const x of q) { assert.ok(x.seconds <= max + 1e-9 && x.seconds >= MIN_SECONDS - 1e-9, JSON.stringify(x)); assert.ok(x.ask >= MIN_SECONDS && x.ask <= max); }
  }
  assert.throws(() => planSegments(60, 24, 10), /shorter than 3 s/);
  assert.throws(() => planSegments(0, 24, 10));
});

test('input checks run before anything is counted or sent', () => {
  const ok = checkFilmInput({ video: CLIP }, ENV);
  assert.equal(ok.error, undefined); assert.equal(ok.seconds, 8); assert.equal(ok.aspect, '16:9'); assert.equal(ok.resolution, '720p'); assert.equal(ok.mode, 'background');
  const cases = [
    [{}, 'video_required'], [[], 'bad_json'], [null, 'bad_json'], [{ video: 'x' }, 'video_required'], [{ video: 'data:video/webm;base64,AAAA' }, 'video_unreadable'],
    [{ video: vurl(Buffer.from('junk junk junk junk junk')) }, 'video_unreadable'],
    [{ video: vurl(mp4({ seconds: 12 })) }, 'video_too_long'], [{ video: vurl(mp4({ seconds: 2 })) }, 'video_too_short'],
    [{ video: vurl(mp4({ w: 1040, h: 780 })) }, 'video_shape'],
    [{ video: CLIP, still: 'nope' }, 'still_unreadable'], [{ video: CLIP, guide: 'data:image/png;base64,QUJD' }, 'still_unreadable'],
    [{ video: CLIP, resolution: '4k' }, 'bad_resolution'], [{ video: CLIP, mode: 'later' }, 'bad_mode'],
    [{ video: CLIP, look: { time: 'dusk' } }, 'bad_time'], [{ video: CLIP, look: { season: 'spring' } }, 'bad_season'],
  ];
  for (const [b, e] of cases) assert.equal(checkFilmInput(b, ENV).error, e, JSON.stringify(b).slice(0, 80));
  // the part limit: 10 s by default, raised to at most 15 by FILM_SEGMENT_MAX_S
  assert.equal(checkFilmInput({ video: vurl(mp4({ seconds: 12 })) }, { ...ENV, FILM_SEGMENT_MAX_S: '15' }).seconds, 12);
  assert.equal(checkFilmInput({ video: vurl(mp4({ seconds: 16 })) }, { ...ENV, FILM_SEGMENT_MAX_S: '99' }).error, 'video_too_long');
  assert.equal(partMaxOf({}), PART_MAX); assert.equal(partMaxOf({ FILM_SEGMENT_MAX_S: '99' }), 15); assert.equal(partMaxOf({ FILM_SEGMENT_MAX_S: '1' }), 3);
  assert.equal(checkFilmInput({ video: vurl(mp4({ seconds: 7.6 })) }, ENV).seconds, 8, 'Google is asked for whole seconds');
  assert.equal(checkFilmInput({ video: CLIP, still: PNG, guide: PNG, mode: 'wait', resolution: '360p', look: { time: 'golden' } }, ENV).still.type, 'image/png');
});

// --- GET status ---------------------------------------------------------------------------------------------------------------
test('GET status: no paid call; configured or not; model, part limit, modes, estimates, label; the key never shown', async () => {
  const off = await call({ method: 'GET', env: {} });
  assert.equal(off.status, 200); assert.equal(off.calls.length, 0); assert.equal(off.json.configured, false);
  assert.equal(off.json.type, 'assembl.planstudio.film.status'); assert.equal(off.json.model, DEFAULT_MODEL); assert.equal(DEFAULT_MODEL, 'gemini-omni-1.2-flash');
  assert.equal(off.json.part_max_s, 10); assert.equal(off.json.mode, 'background'); assert.equal(off.json.label, LABEL); assert.equal(LABEL, PHOTO_LABEL);
  assert.equal(off.json.prompt_revision, FILM_PROMPTS); assert.equal(off.json.needs_confirm, true); assert.equal(off.json.stores_films, false);
  assert.equal(off.json.estimate.per_part_10s_720p.usd, 0.7);
  const on = await call({ method: 'GET', env: { ...ENV, FILM_GEMINI_MODEL: 'gemini-omni-1.1-flash', FILM_SEGMENT_MAX_S: '15', FILM_GEMINI_MODE: 'wait', FILM_DAILY_CAP: '3' } });
  assert.equal(on.json.configured, true); assert.equal(on.json.model, 'gemini-omni-1.1-flash'); assert.equal(on.json.part_max_s, 15); assert.equal(on.json.mode, 'wait');
  assert.equal(on.json.limits.daily_cap, 3); assert.equal(on.json.estimate.per_part_10s_720p.usd, null, 'no price claimed for another model');
  noKey(off); noKey(on);
});

test('estimates from Google\'s price: US$12 per 1M video tokens, 5,792 tokens a second at 720p', () => {
  assert.equal(estimateOf({}, 8, '720p').usd, 0.56); assert.equal(estimateOf({}, 10, '360p').usd, 0.23); assert.equal(estimateOf({}, 10, '1080p').usd, 1.04);
});

// --- POST: gates ---------------------------------------------------------------------------------------------------------------
test('refused before anything is counted or sent: method, origin, no key, size, bad JSON, bad clip', async () => {
  for (const [opts, status, err] of [
    [{ method: 'PUT' }, 405, 'method'], [{ origin: 'https://evil.example' }, 403, 'origin'], [{ origin: null }, 403, 'origin'],
    [{ env: {} }, 503, 'not_configured'], [{ raw: '{not json' }, 400, 'bad_json'], [{ body: { video: 'x' } }, 400, 'video_required'],
    [{ body: { video: vurl(mp4({ seconds: 11 })) } }, 400, 'video_too_long'], [{ headers: { 'content-length': String(MAX_BODY + 1) } }, 413, 'too_large'],
  ]) {
    const r = await call(opts);
    assert.equal(r.status, status, err); assert.equal(r.json.error, err); assert.equal(r.calls.length, 0, err); assert.equal(r.json.label, LABEL); noKey(r);
  }
  const big = await call({ body: { video: vurl(mp4({ pad: MAX_VIDEO + 10 })) } });
  assert.equal(big.status, 413); assert.equal(big.json.error, 'video_too_large'); assert.equal(big.calls.length, 0);
});

test('confirm: true or 402 with the estimate, nothing sent, nothing counted', async () => {
  const r = await call({ body: { video: CLIP, confirm: false } });
  assert.equal(r.status, 402); assert.equal(r.json.error, 'confirm_spend'); assert.equal(r.json.estimate.usd, 0.56); assert.equal(r.calls.length, 0);
  const s = await call({ body: { video: CLIP } }); assert.equal(s.status, 202, 'not counted: the next confirmed part still goes');
  const t = await call({ body: { video: CLIP, confirm: 'yes' } }); assert.equal(t.status, 402);
});

test('caps: per minute, per IP a day and in all; counted when sent, success or not', async () => {
  const env = { ...ENV, FILM_IP_PER_MINUTE: '2', FILM_IP_PER_DAY: '3', FILM_DAILY_CAP: '4' };
  assert.equal((await call({ env })).status, 202);
  assert.equal((await call({ env, handler: () => reply({ error: { code: 'internal' } }, 500) })).status, 502, 'a failed call still counts');
  const third = await call({ env }); assert.equal(third.status, 429); assert.equal(third.json.error, 'slow_down'); assert.equal(third.calls.length, 0);
  _resetCounters();
  const e2 = { ...env, FILM_IP_PER_MINUTE: '9' };
  for (let k = 0; k < 3; k++) assert.equal((await call({ env: e2 })).status, 202);
  const day = await call({ env: e2 }); assert.equal(day.json.error, 'ip_daily');
  assert.equal((await call({ env: e2, ip: '198.51.100.4' })).status, 202, 'another connection still has its own');
  const all = await call({ env: e2, ip: '198.51.100.5' }); assert.equal(all.json.error, 'daily_cap');
  assert.deepEqual(limitsOf({}), { per_minute: 2, per_ip_day: 8, daily_cap: 20, polls_per_minute: 30 });
});

// --- POST: the request Google gets -----------------------------------------------------------------------------------------------
test('background (default): Google gets the clip, stills and prompt, edit task, 720p, whole seconds, background + store; 202 with a handle', async () => {
  const r = await call({ body: { video: CLIP, still: PNG, guide: PNG, part: 1, look: { time: 'golden', season: 'summer' } } });
  assert.equal(r.status, 202); assert.equal(r.json.status, 'running'); assert.ok(r.json.handle); assert.ok(r.json.poll.startsWith('/api/film?handle='));
  assert.equal(r.json.label, LABEL); assert.equal(r.json.part, 1); assert.equal(r.json.estimate.usd, 0.56); assert.ok(!('video' in r.json), 'never a film before Google says so');
  const c = r.calls[0];
  assert.equal(c.url, 'https://generativelanguage.googleapis.com/v1beta/interactions'); assert.equal(c.method, 'POST');
  assert.equal(c.headers['x-goog-api-key'], KEY); assert.equal(c.headers['api-revision'], '2026-05-20');
  assert.equal(c.body.model, DEFAULT_MODEL); assert.equal(c.body.background, true); assert.equal(c.body.store, true);
  assert.deepEqual(c.body.response_format, { type: 'video', aspect_ratio: '16:9', resolution: '720p', duration: '8s', delivery: 'inline' });
  assert.deepEqual(c.body.generation_config, { video_config: { task: 'edit' } });
  assert.deepEqual(c.body.input.map((x) => x.type), ['video', 'image', 'image', 'text']);
  assert.equal(c.body.input[0].mime_type, 'video/mp4'); assert.equal(c.body.input[0].data, CLIP.split(',')[1]);
  assert.equal(c.body.input[3].text, buildFilmPrompt({ time: 'golden', season: 'summer' }, { still: true, guide: true }));
  noKey(r);
});

test('wait mode: background false, store false; the film comes back only with Google\'s completed status', async () => {
  const r = await call({ body: { video: CLIP, mode: 'wait', resolution: '360p' }, handler: () => done() });
  assert.equal(r.status, 200); assert.equal(r.json.status, 'completed'); assert.equal(r.json.video, `data:video/mp4;base64,${OUTV}`);
  assert.equal(r.json.label, LABEL); assert.equal(r.json.resolution, '360p'); assert.equal(r.json.seconds, 8);
  assert.equal(r.calls[0].body.background, false); assert.equal(r.calls[0].body.store, false); assert.equal(r.calls.length, 1, 'nothing to delete: Google kept nothing');
  assert.equal(modeOf({ FILM_GEMINI_MODE: 'wait' }), 'wait'); assert.equal(modeOf({ FILM_GEMINI_MODE: 'odd' }), 'background');
  _resetCounters();
  const task = await call({ env: { ...ENV, FILM_GEMINI_TASK: '' } }); assert.equal(task.calls[0].body.generation_config, undefined, 'task left to the model');
  const model = await call({ env: { ...ENV, FILM_GEMINI_MODEL: 'gemini-omni-1.1-flash' } }); assert.equal(model.calls[0].body.model, 'gemini-omni-1.1-flash');
});

test('polling: running until Google says completed with a video; then the film, the label, and Google\'s copy deleted', async () => {
  const start = await call();
  const h = start.json.handle;
  const r1 = await call({ method: 'GET', query: `?handle=${h}`, origin: null, handler: () => running() });
  assert.equal(r1.status, 200); assert.equal(r1.json.status, 'running'); assert.ok(!('video' in r1.json)); assert.equal(r1.json.label, LABEL);
  assert.equal(r1.calls[0].url, 'https://generativelanguage.googleapis.com/v1beta/interactions/v1_job42'); assert.equal(r1.calls[0].method, 'GET');
  const r2 = await call({ method: 'GET', query: `?handle=${h}`, handler: (c) => (c.method === 'DELETE' ? reply({}) : done()) });
  assert.equal(r2.json.status, 'completed'); assert.equal(r2.json.video, `data:video/mp4;base64,${OUTV}`); assert.equal(r2.json.label, LABEL);
  assert.ok(r2.calls.some((c) => c.method === 'DELETE' && c.url.endsWith('/interactions/v1_job42')), 'deleted at Google');
  // completed without a video is not a film
  const r3 = await call({ method: 'GET', query: `?handle=${h}`, handler: (c) => (c.method === 'DELETE' ? reply({}) : reply({ id: 'v1_job42', status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'text', text: 'sorry' }] }] })) });
  assert.equal(r3.status, 502); assert.equal(r3.json.error, 'no_video'); assert.ok(!('video' in r3.json));
  const r4 = await call({ method: 'GET', query: `?handle=${h}`, handler: (c) => (c.method === 'DELETE' ? reply({}) : reply({ id: 'v1_job42', status: 'failed', error: { code: 'video_safety' } })) });
  assert.equal(r4.json.error, 'declined');
  const gone = await call({ method: 'GET', query: `?handle=${h}`, handler: () => reply({ error: { code: 'not_found' } }, 404) });
  assert.equal(gone.status, 410); assert.equal(gone.json.error, 'gone');
  for (const x of [start, r1, r2, r3, r4, gone]) noKey(x);
});

test('handles: signed with a secret from the key; tampered, foreign, stale or malformed handles are refused without calling Google', async () => {
  const h = await makeHandle(ENV, { id: 'v1_abc', m: DEFAULT_MODEL, s: 8, p: 0, t: Date.now() });
  assert.equal((await readHandle(ENV, h)).id, 'v1_abc');
  assert.equal(await readHandle({ GEMINI_API_KEY: 'another-key' }, h), null, 'another deployment cannot poll it');
  assert.equal(await readHandle({ ...ENV, FILM_HANDLE_SECRET: 's3' }, h), null);
  const [b, s] = h.split('.');
  const forged = Buffer.from(JSON.stringify({ id: 'v1_other', m: 'x', s: 8, t: Date.now() })).toString('base64url');
  assert.equal(await readHandle(ENV, `${forged}.${s}`), null);
  assert.equal(await readHandle(ENV, `${b}.${s.slice(0, -2)}AA`), null);
  assert.equal(await readHandle(ENV, await makeHandle(ENV, { id: 'v1_old', t: Date.now() - 25 * 3600_000 })), null, 'older than a day');
  assert.equal(await readHandle(ENV, await makeHandle(ENV, { id: 'bad id/../x', t: Date.now() })), null);
  for (const bad of ['', 'x', 'a.b.c', '../etc', 'a'.repeat(3000)]) assert.equal(await readHandle(ENV, bad), null);
  const r = await call({ method: 'GET', query: `?handle=${forged}.${s}` });
  assert.equal(r.status, 404); assert.equal(r.json.error, 'bad_handle'); assert.equal(r.calls.length, 0);
  const o = await call({ method: 'GET', query: `?handle=${h}`, origin: 'https://evil.example' }); assert.equal(o.status, 403); assert.equal(o.calls.length, 0);
  assert.ok(!h.includes(KEY));
});

test('polls are capped per minute', async () => {
  const h = await makeHandle(ENV, { id: 'v1_abc', t: Date.now() });
  const env = { ...ENV, FILM_POLLS_PER_MINUTE: '2' };
  assert.equal((await call({ method: 'GET', env, query: `?handle=${h}` })).json.status, 'running');
  assert.equal((await call({ method: 'GET', env, query: `?handle=${h}` })).json.status, 'running');
  const r = await call({ method: 'GET', env, query: `?handle=${h}` }); assert.equal(r.status, 429); assert.equal(r.calls.length, 0);
});

test('Google\'s errors in plain words, with a code; nothing shown rather than a guess', async () => {
  for (const [handler, status, err] of [
    [() => reply({ error: { code: 'invalid_argument', message: 'background not supported' } }, 400), 502, 'refused'],
    [() => reply({ error: { code: 'rate_limit_exceeded' } }, 429), 503, 'busy'],
    [() => reply({ error: { code: 'deadline_exceeded' } }, 504), 504, 'timeout'],
    [() => reply({ error: { code: 'video_safety', message: 'blocked' } }, 400), 422, 'declined'],
    [() => reply({ error: { code: 'internal' } }, 500), 502, 'model_error'],
    [() => reply({ id: 'v1_x', status: 'completed', steps: [] }), 502, 'no_video'],
    [() => reply({ id: 'v1_x', status: 'failed' }), 502, 'model_error'],
    [() => reply({ status: 'in_progress' }), 502, 'model_error'],
    [() => { throw new Error('socket hang up'); }, 502, 'model_error'],
    [() => { const e = new Error('aborted'); e.name = 'AbortError'; throw e; }, 504, 'timeout'],
  ]) {
    _resetCounters();
    const r = await call({ body: { video: CLIP, mode: 'wait' }, handler });
    assert.equal(r.status, status, err); assert.equal(r.json.error, err); assert.equal(r.json.message, MESSAGES[err]); assert.equal(r.json.label, LABEL); assert.ok(!('video' in r.json));
    noKey(r);
  }
  for (const m of Object.values(MESSAGES)) assert.ok(!/\bAI\b/.test(m), m);
});

test('reading Google\'s answer: the last video of the model output; thoughts and text skipped; running is not finished', () => {
  assert.deepEqual(readFilm({ status: 'in_progress' }), { running: true });
  assert.equal(readFilm({ status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'video', mime_type: 'video/mp4', data: 'QQ==' }, { type: 'video', data: 'Qg==' }] }] }).video, 'data:video/mp4;base64,Qg==');
  assert.equal(readFilm({ status: 'completed', steps: [{ type: 'thought', content: [{ type: 'video', data: 'QQ==' }] }] }).error, 'no_video');
  assert.equal(readFilm({ status: 'in_progress', steps: [{ type: 'model_output', content: [{ type: 'video', data: 'QQ==' }] }] }).running, true, 'a partial answer is still running');
  assert.equal(readFilm({ error: { code: 'video_safety' } }).error, 'declined');
});

test('the prompt: keeps the camera path and every building element; only materials, light, sky and planting change; no people or text', () => {
  const p = buildFilmPrompt({ time: 'overcast' }, { still: true, guide: true });
  for (const s of ['same camera path', 'same path, speed, lens, framing and horizon in every frame', 'One continuous shot, no cuts',
    "the stair's run, its turns, its landings and every step", 'every balustrade post and glass panel', 'the deck edges, the roof line and fascia, and every pole and pile',
    'Do not add, remove, move, resize, widen or straighten any building element', 'Only the materials, light, sky and planting may change',
    'reference image shows the look to match', 'geometry comes from the video', 'last frame of the previous part', 'overcast New Zealand sky',
    'New Zealand native species only', 'No people, no text, no captions, no watermark, no logos.', 'no music, no voices', 'Keep everything else the same.'])
    assert.ok(p.includes(s), s);
  const plain = buildFilmPrompt();
  assert.ok(!/reference image|guide image|Light:/.test(plain)); assert.ok(!/\bAI\b/.test(p + plain));
  const g = geminiFilmRequest(ENV, { video: 'AA==', prompt: 'x', seconds: 5, aspect: '9:16', resolution: '1080p', mode: 'wait' });
  assert.deepEqual(g.body.response_format, { type: 'video', aspect_ratio: '9:16', resolution: '1080p', duration: '5s', delivery: 'inline' });
});

test('OPTIONS answers CORS for the lab only', async () => {
  const ok = await call({ method: 'OPTIONS' }); assert.equal(ok.status, 204); assert.equal(ok.headers.get('access-control-allow-origin'), LAB);
  const no = await call({ method: 'OPTIONS', origin: 'https://evil.example' }); assert.equal(no.headers.get('access-control-allow-origin'), null);
  const prev = await call({ method: 'OPTIONS', origin: 'https://agent-photo-film-1123.assembl-lab.pages.dev' }); assert.ok(prev.headers.get('access-control-allow-origin'));
});
