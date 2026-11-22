import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest, SCHEMA, SITE_SCHEMA, ELEV_SCHEMA, SYSTEM, SITE_SYSTEM, PROMPTS, validate, toGeminiSchema } from '../../functions/api/plan-read.js';

// Offline: fetch is stubbed, keys are fake, nothing leaves this process.
const K = { ANTHROPIC_API_KEY: 'fake-anth-KEY-111', OPENAI_API_KEY: 'fake-oai-KEY-222', GEMINI_API_KEY: 'fake-gem-KEY-333' };
const IMG = 'data:image/png;base64,' + Buffer.from('not really a png').toString('base64');
const GOOD = { scale_text: null, north_deg: null, walls: [{ x1: 0, y1: 0, x2: 10, y2: 0, thickness_px: 3, external: true, confidence: 0.9 }], openings: [], rooms: [], dimensions: [], notes: 'ok' };
const GOOD_SITE = (() => { const o = { scale_text: null, north_deg: null, building: { points: [] }, decks: [], stairs: [], paths: [], hard: [], retaining: [], planting: [], trees: [], boundary: [], notes: '' }; return o; })();
const GOOD_ELEV = { views: [], notes: '' };
const ok = (b) => new Response(JSON.stringify(b), { status: 200 });
const anthropicOk = (plan) => ok({ model: 'claude-x', stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(plan) }] });
const openaiOk = (plan) => ok({ model: 'gpt-x', choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(plan) } }] });
const geminiOk = (plan) => ok({ modelVersion: 'gem-x', candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(plan) }] } }] });

async function run({ method = 'POST', env = {}, mode, handlers = {}, image = IMG }) {
  const calls = [], real = globalThis.fetch, warn = console.warn;
  console.warn = () => {};
  globalThis.fetch = async (url, init) => {
    const host = new URL(url).host, name = host.includes('anthropic') ? 'anthropic' : host.includes('openai') ? 'openai' : host.includes('googleapis') ? 'gemini' : 'other';
    calls.push({ name, url, init, body: init?.body ? JSON.parse(init.body) : null });
    const h = handlers[name]; if (!h) throw new Error('unexpected provider ' + name);
    return h(calls.at(-1));
  };
  try {
    const req = new Request('https://x.test/api/plan-read/', method === 'POST' ? { method, body: JSON.stringify({ image, mode }), headers: { 'content-type': 'application/json' } } : { method });
    const res = await onRequest({ request: req, env });
    const text = await res.text();
    return { status: res.status, text, json: JSON.parse(text), calls };
  } finally { globalThis.fetch = real; console.warn = warn; }
}

test('no keys gives 503 and makes no call', async () => {
  const r = await run({ env: {} });
  assert.equal(r.status, 503); assert.equal(r.json.error, 'not_configured'); assert.equal(r.calls.length, 0);
});

test('only an OpenAI key: one OpenAI call, provider openai', async () => {
  const r = await run({ env: { OPENAI_API_KEY: K.OPENAI_API_KEY }, handlers: { openai: () => openaiOk(GOOD) } });
  assert.equal(r.status, 200);
  assert.deepEqual(r.calls.map((c) => c.name), ['openai']);
  assert.equal(r.json.provider, 'openai'); assert.equal(r.json.src, 'ai'); assert.equal(r.json.model, 'gpt-x'); assert.equal(r.json.mode, 'plan');
  assert.deepEqual(r.json.plan, GOOD);
  const b = r.calls[0].body;
  assert.equal(b.response_format.type, 'json_schema'); assert.equal(b.response_format.json_schema.strict, true);
  assert.deepEqual(b.response_format.json_schema.schema, SCHEMA);
  assert.equal(b.messages[0].content, SYSTEM);
  assert.equal(b.messages[1].content[1].image_url.url, IMG);
  assert.equal(r.calls[0].init.headers.authorization, 'Bearer ' + K.OPENAI_API_KEY);
});

test('OpenAI 500 then Gemini answers', async () => {
  const r = await run({ env: K, handlers: { openai: () => new Response('boom', { status: 500 }), gemini: () => geminiOk(GOOD) } });
  assert.equal(r.status, 200); assert.equal(r.json.provider, 'gemini'); assert.equal(r.json.model, 'gem-x');
  assert.deepEqual(r.calls.map((c) => c.name), ['openai', 'gemini']);
  const g = r.calls[1];
  assert.equal(g.body.contents[0].parts[0].inline_data.mime_type, 'image/png');
  assert.equal(g.body.contents[0].parts[0].inline_data.data, IMG.split(',')[1]);
  assert.equal(g.body.generationConfig.responseMimeType, 'application/json');
  assert.equal(g.body.systemInstruction.parts[0].text, SYSTEM);
  assert.ok(!JSON.stringify(g.body.generationConfig.responseSchema).includes('additionalProperties'));
  assert.equal(g.url.includes(K.GEMINI_API_KEY), false);
});

test('OpenAI schema-invalid JSON falls through to the next provider', async () => {
  const bad = { ...GOOD, walls: 'not an array' };
  const r = await run({ env: K, handlers: { openai: () => openaiOk(bad), gemini: () => geminiOk(GOOD) } });
  assert.equal(r.status, 200); assert.equal(r.json.provider, 'gemini'); assert.equal(r.calls.length, 2);
});

test('missing required key, non-finite number and bad enum all fail validation', () => {
  assert.ok(validate({ ...GOOD, notes: undefined }, SCHEMA));
  assert.ok(validate({ ...GOOD, walls: [{ ...GOOD.walls[0], x1: Infinity }] }, SCHEMA));
  assert.ok(validate({ ...GOOD, openings: [{ kind: 'gate', x1: 0, y1: 0, x2: 1, y2: 1, confidence: 1 }] }, SCHEMA));
  assert.equal(validate(GOOD, SCHEMA), null);
});

test('all providers fail gives 502 model_error', async () => {
  const r = await run({ env: K, handlers: { openai: () => new Response('x', { status: 500 }), gemini: () => new Response('x', { status: 429 }), anthropic: () => new Response('x', { status: 402 }) } });
  assert.equal(r.status, 502); assert.equal(r.json.error, 'model_error'); assert.equal(r.calls.length, 3);
});

test('a thrown fetch (network or timeout) counts as a failure and moves on', async () => {
  const r = await run({ env: K, handlers: { openai: () => { throw new Error('net down'); }, gemini: () => geminiOk(GOOD) } });
  assert.equal(r.json.provider, 'gemini');
});

test('default order is openai, gemini, anthropic; PLANREAD_PROVIDERS is respected', async () => {
  const fail = () => new Response('x', { status: 500 });
  const h = { openai: fail, gemini: fail, anthropic: fail };
  assert.deepEqual((await run({ env: K, handlers: h })).calls.map((c) => c.name), ['openai', 'gemini', 'anthropic']);
  assert.deepEqual((await run({ env: { ...K, PLANREAD_PROVIDERS: 'anthropic, gemini' }, handlers: h })).calls.map((c) => c.name), ['anthropic', 'gemini']);
  const r = await run({ env: { ...K, PLANREAD_PROVIDERS: 'gemini,anthropic,openai' }, handlers: { ...h, gemini: () => geminiOk(GOOD) } });
  assert.equal(r.json.provider, 'gemini'); assert.equal(r.calls.length, 1);
});

test('a provider with no key is skipped; GOOGLE_API_KEY works for Gemini', async () => {
  const r = await run({ env: { GOOGLE_API_KEY: 'fake-goog-444', PLANREAD_PROVIDERS: 'openai,gemini' }, handlers: { gemini: () => geminiOk(GOOD) } });
  assert.deepEqual(r.calls.map((c) => c.name), ['gemini']); assert.equal(r.calls[0].init.headers['x-goog-api-key'], 'fake-goog-444');
});

test('GET status lists providers in order and leaks no key material', async () => {
  const env = { ...K, GOOGLE_API_KEY: 'fake-goog-444', PLANREAD_PROVIDERS: 'gemini,openai,anthropic', PLANREAD_OPENAI_MODEL: 'oai-custom' };
  const r = await run({ method: 'GET', env });
  assert.equal(r.status, 200); assert.equal(r.json.configured, true); assert.equal(r.json.host, 'cloudflare');
  assert.deepEqual(r.json.providers.map((p) => p.name), ['gemini', 'openai', 'anthropic']);
  assert.equal(r.json.model, r.json.providers[0].model);
  assert.equal(r.json.providers[1].model, 'oai-custom');
  for (const v of [...Object.values(K), 'fake-goog-444', 'KEY-111', 'KEY-222', 'KEY-333']) assert.ok(!r.text.includes(v), 'leaked ' + v);
  const none = await run({ method: 'GET', env: {} });
  assert.equal(none.json.configured, false); assert.equal(none.json.providers.every((p) => p.configured === false), true);
});

test('each mode sends its own schema to the provider', async () => {
  for (const [mode, schema, good] of [['plan', SCHEMA, GOOD], ['site', SITE_SCHEMA, GOOD_SITE], ['elevation', ELEV_SCHEMA, GOOD_ELEV]]) {
    const r = await run({ env: K, mode, handlers: { openai: () => openaiOk(good) } });
    assert.equal(r.status, 200, mode); assert.equal(r.json.mode, mode);
    assert.deepEqual(r.calls[0].body.response_format.json_schema.schema, schema, mode);
    const g = await run({ env: { ...K, PLANREAD_PROVIDERS: 'gemini' }, mode, handlers: { gemini: () => geminiOk(good) } });
    assert.deepEqual(g.calls[0].body.generationConfig.responseSchema, toGeminiSchema(schema), mode);
    const a = await run({ env: { ...K, PLANREAD_PROVIDERS: 'anthropic' }, mode, handlers: { anthropic: () => anthropicOk(good) } });
    assert.deepEqual(a.calls[0].body.output_config.format.schema, schema, mode);
  }
});

test('Anthropic request is unchanged from the original', async () => {
  const r = await run({ env: { ANTHROPIC_API_KEY: K.ANTHROPIC_API_KEY }, handlers: { anthropic: () => anthropicOk(GOOD) } });
  const c = r.calls[0];
  assert.equal(c.url, 'https://api.anthropic.com/v1/messages');
  assert.deepEqual(c.init.headers, { 'content-type': 'application/json', 'x-api-key': K.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'anthropic-beta': 'server-side-fallback-2026-07-01' });
  assert.deepEqual(c.body, {
    model: 'claude-opus-5-5', max_tokens: 16000, system: SYSTEM, fallbacks: 'default',
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
    messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: IMG.split(',')[1] } }, { type: 'text', text: 'Read this floor plan.' }] }],
  });
  assert.equal(r.json.provider, 'anthropic'); assert.equal(r.json.model, 'claude-x');
});

test('model names come from env', async () => {
  const r = await run({ env: { ...K, PLANREAD_PROVIDERS: 'openai', PLANREAD_OPENAI_MODEL: 'my-oai' }, handlers: { openai: () => openaiOk(GOOD) } });
  assert.equal(r.calls[0].body.model, 'my-oai');
  const g = await run({ env: { ...K, PLANREAD_PROVIDERS: 'gemini', PLANREAD_GEMINI_MODEL: 'my-gem' }, handlers: { gemini: () => geminiOk(GOOD) } });
  assert.ok(g.calls[0].url.includes('/models/my-gem:generateContent'));
});

test('a too-large sheet reported by every provider gives 422, not 502', async () => {
  const r = await run({ env: { OPENAI_API_KEY: K.OPENAI_API_KEY }, handlers: { openai: () => ok({ model: 'm', choices: [{ finish_reason: 'length', message: { content: '{' } }] }) } });
  assert.equal(r.status, 422); assert.equal(r.json.error, 'too_much_on_one_sheet');
});

test('daily cap counts requests, not attempts, and still returns 429', async () => {
  const fail = () => new Response('x', { status: 500 });
  const env = { ...K, PLANREAD_DAILY_CAP: '0' };
  const r = await run({ env, handlers: { openai: fail } });
  assert.equal(r.status, 429); assert.equal(r.json.error, 'daily_cap'); assert.equal(r.calls.length, 0);
});

test('bad image is rejected before any provider call', async () => {
  const r = await run({ env: K, image: 'nope', handlers: {} });
  assert.equal(r.status, 400); assert.equal(r.calls.length, 0);
});

// ---------------------------------------------------------------- 22 Nov: rooms keep printed names, small rooms, door kinds
const ROOM = { name: '?', x: 10, y: 10, w: 60, h: 200, fixtures: '', confidence: 0.8 };

test('a room needs name, box, fixtures and confidence; fixtures is an observation string', () => {
  assert.equal(validate({ ...GOOD, rooms: [ROOM] }, SCHEMA), null);
  assert.equal(validate({ ...GOOD, rooms: [{ ...ROOM, name: 'Bedroom 2', fixtures: 'bed' }] }, SCHEMA), null);
  const { fixtures, ...noFixtures } = ROOM;
  assert.match(validate({ ...GOOD, rooms: [noFixtures] }, SCHEMA), /fixtures: missing/);
  assert.match(validate({ ...GOOD, rooms: [{ ...ROOM, fixtures: null }] }, SCHEMA), /wrong type/);
  assert.deepEqual(SCHEMA.properties.rooms.items.required, ['name', 'x', 'y', 'w', 'h', 'fixtures', 'confidence']);
  // every field the page already reads is still there, with the same type
  for (const k of ['name', 'x', 'y', 'w', 'h', 'confidence']) assert.ok(SCHEMA.properties.rooms.items.properties[k], k);
  assert.deepEqual(SCHEMA.properties.openings.items.properties.kind.enum, ['door', 'door-double', 'window', 'glazing', 'opening']);
});

test('a reply from a provider that leaves out fixtures fails validation and falls through to the next provider', async () => {
  const { fixtures, ...old } = ROOM;
  const r = await run({ env: K, handlers: { openai: () => openaiOk({ ...GOOD, rooms: [old] }), gemini: () => geminiOk({ ...GOOD, rooms: [ROOM] }) } });
  assert.equal(r.status, 200); assert.equal(r.json.provider, 'gemini'); assert.deepEqual(r.json.plan.rooms, [ROOM]);
});

test('the Gemini schema carries the new room field and the kind descriptions', () => {
  const g = toGeminiSchema(SCHEMA).properties;
  assert.equal(g.rooms.items.properties.fixtures.type, 'STRING');
  assert.ok(g.rooms.items.required.includes('fixtures'));
  assert.match(g.openings.items.properties.kind.description, /door-double/);
});

test('the floor plan prompt: printed names only, "?" kept, small rooms, full-width multi-leaf doors, glazed doors', () => {
  assert.match(SYSTEM, /exactly as printed/);
  assert.match(SYSTEM, /"Bedroom 2"/);
  assert.match(SYSTEM, /the name is "\?"/);
  assert.match(SYSTEM, /Never name a room from its furniture/);
  assert.doesNotMatch(SYSTEM, /name the room from what is drawn/i);   // the old instruction to infer names is gone
  assert.match(SYSTEM, /halls, corridors/); assert.match(SYSTEM, /wardrobes/); assert.match(SYSTEM, /pantries/); assert.match(SYSTEM, /WCs/);
  assert.match(SYSTEM, /full width of the set/);
  assert.match(SYSTEM, /A glazed door is a door/);
  assert.match(SYSTEM, /Boxes do not overlap/);
  assert.match(SYSTEM, /return two walls, not one/);
});

test('the prompts describe drawings in general, not one house', () => {
  for (const p of [SYSTEM, SITE_SYSTEM]) {
    assert.doesNotMatch(p, /\b[A-Z]{1,3}-\d{2,4}\b/);                        // no sheet numbers
    assert.doesNotMatch(p, /\b\d{4,5}\b/);                               // no dimensions or levels from a real sheet
    assert.doesNotMatch(p, /\b\d+\.\d+\s*m\b/);
  }
});

test('the site prompt asks for parking drawn as a labelled outline', () => {
  assert.match(SITE_SYSTEM, /parking bays/); assert.match(SITE_SYSTEM, /carpark/);
});

test('GET status names the prompt revision, so a preview can be checked without a paid read', async () => {
  const r = await run({ method: 'GET', env: K });
  assert.equal(r.json.prompts, PROMPTS); assert.match(PROMPTS, /^\d{4}-\d{2}-\d{2}/);
  assert.equal(r.calls.length, 0);
});

test('every read carries the prompt revision, so the page knows what each opening kind means', async () => {
  const r = await run({ env: { OPENAI_API_KEY: K.OPENAI_API_KEY }, handlers: { openai: () => openaiOk(GOOD) } });
  assert.equal(r.status, 200); assert.equal(r.json.prompts, PROMPTS); assert.deepEqual(r.json.plan, GOOD);
});
