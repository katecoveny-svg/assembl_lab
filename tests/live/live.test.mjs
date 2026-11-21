import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { onRequest } from '../../functions/api/live.js';
import { onRequest as onTrades } from '../../functions/api/trades-feeds.js';
import { UA, TIMEOUT_MS, clearMemo } from '../../api/_feeds/util.js';
import { unzip, docxParagraphs } from '../../api/_feeds/zip.js';
import legacy from '../../api/live.js';
import { fx, json, text, withFetch, host } from './helpers.mjs';

// Offline: fetch is stubbed with small saved responses, nothing leaves this process. The function is called the way Cloudflare calls it:
// onRequest({ request, env }) with a plain Request and an empty env.
const ROOT = new URL('../../', import.meta.url).pathname;
const POWER_CSV = 'PointOfConnection,TradingDate,TradingPeriod,DollarsPerMegawattHour\n' + Array.from({ length: 48 }, (_, i) => `OTA2201,2026-11-20,${i + 1},${100 + i}`).join('\n') + '\nHAM2201,2026-11-20,1,999\n';
const FX = { date: '2026-11-20', rates: { USD: 0.5504, AUD: 0.8, CNY: 3.9, GBP: 0.41, EUR: 0.47, JPY: 85 } };
const routes = (over = {}) => [
  [host('api.open-meteo.com'), () => (over.weather ? over.weather() : json(fx('weather')))],
  [host('api.frankfurter.dev'), () => (over.fx ? over.fx() : json(FX))],
  [host('emidatasets.blob.core.windows.net'), () => (over.power ? over.power() : text(POWER_CSV))],
];
const get = async (url, { method = 'GET', env = {} } = {}) => { const res = await onRequest({ request: new Request(url, { method }), env }); return { res, body: method === 'HEAD' || res.status === 204 ? null : await res.json() }; };
const BASE = 'https://lab.assembl.co.nz/api/live/';
test.beforeEach(() => clearMemo());

test('v2: feeds=weather,fx answers the documented shape with truth labels', async () => {
  await withFetch(routes(), async () => {
    const { res, body } = await get(BASE + '?feeds=weather,fx&place=auckland');
    assert.equal(res.status, 200);
    assert.equal(body.type, 'assembl.feeds'); assert.equal(body.version, 2); assert.equal(body.place, 'auckland'); assert.ok(body.district); assert.ok(Date.parse(body.fetchedAt));
    const w = body.feeds.weather;
    assert.equal(w.id, 'weather'); assert.equal(w.truth, 'Live'); assert.equal(w.truthLabel, 'Live'); assert.equal(w.unit, '°C'); assert.ok(w.source.name && w.source.url); assert.ok(w.fetchedAt);
    assert.equal(w.status, 'live'); assert.equal(typeof w.value, 'number');
    assert.equal(body.feeds.fx.id, 'fx'); assert.equal(body.feeds.fx.values.rates.USD, 0.5504);
    assert.equal(body.unknown, undefined);
  });
});

test('v1: no feeds gives assembl.live with weather and power, unchanged shape', async () => {
  await withFetch(routes(), async () => {
    const { res, body } = await get(BASE + '?place=auckland');
    assert.equal(res.status, 200);
    assert.deepEqual(Object.keys(body), ['type', 'version', 'fetchedAt', 'weather', 'power', 'errors']);
    assert.equal(body.type, 'assembl.live'); assert.equal(body.version, 1); assert.deepEqual(body.errors, []);
    assert.ok(body.weather.tempC != null && Array.isArray(body.weather.hourly.time) && body.weather.source.url);
    assert.equal(body.power.node.includes('OTA2201'), true); assert.equal(body.power.periods.length, 48); assert.ok(body.power.source.url);
  });
});

test('v1: a feed that fails is null and its error is listed, the other still answers', async () => {
  await withFetch(routes({ power: () => text('nope', 500) }), async () => {
    const { body } = await get(BASE + '?place=auckland');
    assert.equal(body.power, null); assert.ok(body.weather);
    assert.equal(body.errors.length, 1); assert.match(body.errors[0], /power|HTTP 500|node/i);
  });
});

test('an unknown feed is named in unknown, with the list of real ones; known feeds still answer', async () => {
  await withFetch(routes(), async () => {
    const { body } = await get(BASE + '?feeds=nonsense,fx,__proto__');
    assert.deepEqual(body.unknown, ['nonsense', '__proto__']);
    assert.ok(body.available.includes('weather') && body.available.includes('site'));
    assert.equal(body.feeds.fx.id, 'fx'); assert.equal(body.feeds.nonsense, undefined);
  });
});

test('one feed failing gives {id, error} for it and a short cache; the others succeed', async () => {
  await withFetch(routes({ fx: () => text('down', 503) }), async () => {
    const { res, body } = await get(BASE + '?feeds=fx,weather');
    assert.equal(res.status, 200);
    assert.deepEqual(Object.keys(body.feeds.fx).sort(), ['error', 'id']); assert.equal(body.feeds.fx.id, 'fx'); assert.match(body.feeds.fx.error, /503/);
    assert.equal(body.feeds.weather.truth, 'Live');
    const sm = +/s-maxage=(\d+)/.exec(res.headers.get('cache-control'))[1];
    assert.ok(sm <= 300, 'a failure must not be cached for long, got ' + sm);
  });
});

test('place and district are checked against the known lists (prototype names fall back to the default)', async () => {
  await withFetch(routes(), async () => {
    const a = (await get(BASE + '?feeds=fx&place=constructor&district=__proto__')).body;
    assert.equal(a.place, 'auckland'); assert.equal(a.district, 'auckland-district');
    assert.equal((await get(BASE + '?feeds=fx&place=wellington')).body.place, 'wellington');
  });
});

test('the path works with and without the trailing slash and gives the same answer', async () => {
  await withFetch(routes(), async () => {
    const a = await get('https://lab.assembl.co.nz/api/live/?feeds=fx'), b = await get('https://lab.assembl.co.nz/api/live?feeds=fx');
    assert.equal(a.res.status, 200); assert.equal(b.res.status, 200);
    assert.equal(a.body.feeds.fx.values.rates.USD, b.body.feeds.fx.values.rates.USD);
  });
});

test('headers: CORS, nosniff, JSON, cache-control from the shortest cadence; OPTIONS, HEAD and POST', async () => {
  await withFetch(routes(), async () => {
    const { res } = await get(BASE + '?feeds=weather');
    assert.equal(res.headers.get('access-control-allow-origin'), '*'); assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.match(res.headers.get('content-type'), /application\/json/);
    assert.match(res.headers.get('cache-control'), /^public, s-maxage=900, stale-while-revalidate=3600$/); // weather is hourly
    const daily = await get(BASE + '?feeds=fx'); assert.match(daily.res.headers.get('cache-control'), /s-maxage=3600/);
    const mixed = await get(BASE + '?feeds=fx,weather'); assert.match(mixed.res.headers.get('cache-control'), /s-maxage=900/, 'the shortest cadence wins');
    const v1 = await get(BASE); assert.match(v1.res.headers.get('cache-control'), /s-maxage=900/);
    const opt = await get(BASE, { method: 'OPTIONS' }); assert.equal(opt.res.status, 204); assert.equal(opt.res.headers.get('access-control-allow-origin'), '*'); assert.match(opt.res.headers.get('access-control-allow-methods'), /GET/);
    const head = await get(BASE + '?feeds=weather', { method: 'HEAD' }); assert.equal(head.res.status, 200); assert.equal(await head.res.text(), '');
    const post = await get(BASE, { method: 'POST' }); assert.equal(post.res.status, 405); assert.match(post.res.headers.get('allow'), /GET/);
  });
});

test('a snapshot feed (tariffs, grocery) is "Latest published", marked snapshot, and fetches nothing', async () => {
  await withFetch([], async (calls) => {
    const { body } = await get(BASE + '?feeds=tariffs,grocery&place=auckland');
    for (const id of ['tariffs', 'grocery']) { const f = body.feeds[id]; assert.equal(f.truth, 'Latest published', id); assert.equal(f.status, 'snapshot', id); assert.match(f.truthLabel, /^Latest published/); assert.ok(f.source.url); }
    assert.equal(calls.length, 0, 'snapshots are bundled JSON: no network and no file system');
  });
});

test('upstream calls identify as lab.assembl.co.nz and carry an abort signal for the 8 second timeout', async () => {
  assert.equal(TIMEOUT_MS, 8000); assert.match(UA, /\+https:\/\/lab\.assembl\.co\.nz\)$/); assert.doesNotMatch(UA, /vercel/);
  await withFetch(routes(), async (calls) => {
    await get(BASE + '?feeds=weather,fx');
    assert.ok(calls.length >= 2);
    for (const c of calls) { assert.equal(c.init.headers['user-agent'], UA); assert.ok(c.init.signal instanceof AbortSignal); }
  });
});

test('a slow upstream is cut off by the timeout and becomes {id, error}', async () => {
  const real = globalThis.setTimeout;
  globalThis.setTimeout = (fn, ms, ...a) => real(fn, ms === TIMEOUT_MS ? 20 : ms, ...a); // run the 8 s timer fast
  try {
    await withFetch([[host('api.frankfurter.dev'), (u, init) => new Promise((_, rej) => init.signal.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError'))))]], async () => {
      const { body } = await get(BASE + '?feeds=fx');
      assert.ok(body.feeds.fx.error); assert.equal(body.feeds.fx.id, 'fx');
    });
  } finally { globalThis.setTimeout = real; }
});

test('the site feed is registered and a bad point is a clear {id, error}, not a failure of the answer', async () => {
  await withFetch([], async (calls) => {
    const { res, body } = await get(BASE + '?feeds=site&lat=51.5&lon=-0.12');
    assert.equal(res.status, 200); assert.equal(body.feeds.site.id, 'site'); assert.match(body.feeds.site.error, /inside New Zealand/); assert.equal(calls.length, 0);
    assert.match((await get(BASE + '?feeds=site')).body.feeds.site.error, /lat and lon/);
  });
});

test('trades-feeds is served too: the same shape, CORS and cache headers', async () => {
  const codehub = (u) => u.host === 'codehub.building.govt.nz', stats = (u) => u.host === 'www.stats.govt.nz';
  await withFetch([[codehub, () => text('', 404)], [stats, () => text('', 404)]], async () => {
    const res = await onTrades({ request: new Request('https://lab.assembl.co.nz/api/trades-feeds/'), env: {} });
    const b = await res.json();
    assert.equal(res.status, 200); assert.equal(b.type, 'assembl.trades-feeds'); assert.equal(b.version, 1);
    assert.ok(b.feeds.determinations.error && b.feeds.consents.error, 'sources that do not answer become {error}');
    assert.equal(res.headers.get('access-control-allow-origin'), '*'); assert.match(res.headers.get('cache-control'), /s-maxage=900/);
    assert.equal((await onTrades({ request: new Request('https://x.test/api/trades-feeds/', { method: 'POST' }) })).status, 405);
  });
});

test('the old Node entry (api/live.js) gives the same body through the same code', async () => {
  await withFetch(routes(), async () => {
    const headers = {}; let status, out;
    const res = { setHeader: (k, v) => { headers[k] = v; }, status(s) { status = s; return this; }, json(b) { out = b; return this; } };
    await legacy({ url: '/api/live/?feeds=fx&place=auckland', query: {} }, res);
    assert.equal(status, 200); assert.equal(out.type, 'assembl.feeds'); assert.equal(headers['Access-Control-Allow-Origin'], '*'); assert.match(headers['Cache-Control'], /s-maxage=3600/);
  });
});

// ---- the zip reader (Web APIs only) -------------------------------------------------------------------------------------------------
function makeZip(files) { // a tiny zip writer for the test: stored and deflated entries
  const parts = [], central = []; let off = 0; const le = (n, b) => { const x = Buffer.alloc(b); b === 2 ? x.writeUInt16LE(n) : x.writeUInt32LE(n); return x; };
  for (const [name, data, method] of files) {
    const nm = Buffer.from(name), raw = Buffer.from(data), body = method === 0 ? raw : zlib.deflateRawSync(raw);
    const lh = Buffer.concat([le(0x04034b50, 4), le(20, 2), le(0, 2), le(method, 2), le(0, 2), le(0, 2), le(0, 4), le(body.length, 4), le(raw.length, 4), le(nm.length, 2), le(0, 2), nm, body]);
    central.push(Buffer.concat([le(0x02014b50, 4), le(20, 2), le(20, 2), le(0, 2), le(method, 2), le(0, 2), le(0, 2), le(0, 4), le(body.length, 4), le(raw.length, 4), le(nm.length, 2), le(0, 2), le(0, 2), le(0, 2), le(0, 2), le(0, 4), le(off, 4), nm]));
    parts.push(lh); off += lh.length;
  }
  const cd = Buffer.concat(central);
  return new Uint8Array(Buffer.concat([...parts, cd, le(0x06054b50, 4), le(0, 2), le(0, 2), le(files.length, 2), le(files.length, 2), le(cd.length, 4), le(off, 4), le(0, 2)]));
}
test('unzip reads stored and deflated entries from a Uint8Array, and docxParagraphs reads the paragraphs', async () => {
  const xml = '<w:document><w:p><w:r><w:t>NORTHLAND FACTSHEET: April - June 2026</w:t></w:r></w:p><w:p><w:r><w:t>SSED performance</w:t></w:r></w:p><w:p><w:r><w:t>Tāmaki &amp; co</w:t></w:r></w:p></w:document>';
  const z = await unzip(makeZip([['a.txt', 'hello', 0], ['word/document.xml', xml, 8]]));
  assert.deepEqual(z.names, ['a.txt', 'word/document.xml']); assert.equal(z.read('a.txt'), 'hello'); assert.equal(z.read('nope'), null);
  assert.deepEqual(await docxParagraphs(makeZip([['word/document.xml', xml, 8]])), ['NORTHLAND FACTSHEET: April - June 2026', 'SSED performance', 'Tāmaki & co']);
  await assert.rejects(unzip(new Uint8Array([1, 2, 3])), /not a zip/);
});

// ---- nothing in the Workers bundle reaches for Node ---------------------------------------------------------------------------------
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/(^|\s)\/\/.*$/, '$1')).join('\n');
function reachable(entry, seen = new Set()) { // the entry and every relative module it imports, found from the import lines
  const f = path.resolve(entry); if (seen.has(f)) return seen; seen.add(f);
  if (!f.endsWith('.js')) return seen;
  for (const m of strip(fs.readFileSync(f, 'utf8')).matchAll(/(?:import|export)[^'"\n]*?from\s*["'](\.[^"']+)["']/g)) reachable(path.resolve(path.dirname(f), m[1]), seen);
  return seen;
}
test('static scan: code under functions/ and everything it imports has no process, Buffer, require, fs, path or node: modules at load', () => {
  const files = new Set(); for (const e of ['functions/api/live.js', 'functions/api/trades-feeds.js']) reachable(path.join(ROOT, e), files);
  const list = [...files].map((f) => path.relative(ROOT, f));
  for (const must of ['api/_feeds/index.js', 'api/_feeds/site.js', 'api/_feeds/zip.js', 'api/_feeds/handle.js', 'api/_feeds/snapshots/qsdep.json']) assert.ok(list.includes(must), 'scan should reach ' + must);
  const bad = [];
  for (const f of files) {
    if (!f.endsWith('.js')) continue;
    const src = strip(fs.readFileSync(f, 'utf8')), rel = path.relative(ROOT, f);
    const checks = [[/\bBuffer\b/, 'Buffer'], [/\brequire\s*\(/, 'require('], [/\bcreateRequire\b/, 'createRequire'], [/\bimport\s*\(\s*["']node:/, 'import node:'], [/from\s*["'](node:[\w/]+|fs|path|zlib|module|crypto|os|child_process|http|https|stream|util)["']/, 'a Node module'],
      [/\b__dirname\b|\b__filename\b|import\.meta\.url/, '__dirname / import.meta.url'], [/\breadFileSync\b|\bfs\./, 'fs']];
    for (const [re, name] of checks) if (re.test(src)) bad.push(`${rel}: ${name}`);
    // process is allowed only as the guarded read in util.js's envVar(), which runs inside a function, never at load
    const procs = [...src.matchAll(/.*\bprocess\b.*/g)].map((m) => m[0]);
    for (const l of procs) if (!(rel === 'api/_feeds/util.js' && /typeof process !== "undefined"/.test(l))) bad.push(`${rel}: process (${l.trim().slice(0, 70)})`);
  }
  assert.deepEqual(bad, []);
});

test('run with process and require removed (as on Workers; Buffer is covered by the scan, Node\'s own fetch needs it): imports and answers from a plain Request and an empty env', () => {
  const child = `
    import fs from 'node:fs';
    const w = fs.readFileSync(${JSON.stringify(path.join(ROOT, 'tests/live/fixtures/weather.json'))}, 'utf8');
    const out = [];
    new Response(''); new Request('https://x.test'); new Headers(); new AbortController(); new Blob([]); new TextDecoder(); new DecompressionStream('deflate-raw'); // load Node's lazy web classes first
    for (const g of ['process', 'require']) { try { delete globalThis[g]; } catch (e) {} }
    out.push(['gone', typeof globalThis.process, typeof globalThis.require].join(','));
    globalThis.fetch = async (u) => new Response(String(u).includes('open-meteo') ? w : '', { status: String(u).includes('open-meteo') ? 200 : 404 });
    const { onRequest } = await import(${JSON.stringify(path.join(ROOT, 'functions/api/live.js'))});
    const res = await onRequest({ request: new Request('https://lab.assembl.co.nz/api/live/?feeds=weather,tariffs,footprint&lat=-36.8&lon=175.08'), env: {} });
    const b = await res.json();
    out.push(res.status, b.feeds.weather.truth, b.feeds.tariffs.status, b.feeds.footprint.error ? 'footprint-error' : 'footprint-ok');
    console.log(JSON.stringify(out));
  `;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', child], { encoding: 'utf8', timeout: 30000 });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout.trim().split('\n').at(-1)), ['gone,undefined,undefined', 200, 'Live', 'snapshot', 'footprint-error']);
});
