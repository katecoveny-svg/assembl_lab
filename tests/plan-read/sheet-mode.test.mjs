// The "sheet" mode of /api/plan-read, used by the intake agent for a sheet with no text of its own. It rides the same provider chain
// as the plan reader (OpenAI, then Gemini, then Anthropic; the next on any error) and the same schema check. Offline: fetch is stubbed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest, SHEET_SCHEMA, SHEET_SYSTEM, SHEET_PROMPTS, validate } from '../../functions/api/plan-read.js';

const K = { ANTHROPIC_API_KEY: 'fake-anth-KEY-111', OPENAI_API_KEY: 'fake-oai-KEY-222', GEMINI_API_KEY: 'fake-gem-KEY-333' };
const IMG = 'data:image/jpeg;base64,' + Buffer.from('not really a jpeg').toString('base64');
const GOOD = { is_drawing_sheet: true, number: 'A-301', title: 'Sections', scale: '1:50', rev: 'B', date: null, register: [{ number: 'A-101', title: 'Site plan', rev: null }], confidence: 0.8, notes: '' };
const ok = (b) => new Response(JSON.stringify(b), { status: 200 });
const openaiOk = (p) => ok({ model: 'gpt-x', choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(p) } }] });
const geminiOk = (p) => ok({ modelVersion: 'gem-x', candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(p) }] } }] });
const anthropicOk = (p) => ok({ model: 'claude-x', stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(p) }] });

async function run(handlers, env = K) {
  const calls = [], real = globalThis.fetch, warn = console.warn;
  console.warn = () => {};
  globalThis.fetch = async (url, init) => {
    const host = new URL(url).host, name = host.includes('anthropic') ? 'anthropic' : host.includes('openai') ? 'openai' : 'gemini';
    calls.push({ name, body: JSON.parse(init.body) });
    return handlers[name]();
  };
  try {
    const res = await onRequest({ request: new Request('https://x.test/api/plan-read/', { method: 'POST', body: JSON.stringify({ image: IMG, mode: 'sheet' }), headers: { 'content-type': 'application/json' } }), env });
    const text = await res.text();
    return { status: res.status, text, json: JSON.parse(text), calls };
  } finally { globalThis.fetch = real; console.warn = warn; }
}

test('the sheet schema takes a good read and refuses one with a missing or mistyped field', () => {
  assert.equal(validate(GOOD, SHEET_SCHEMA), null);
  assert.match(validate({ ...GOOD, is_drawing_sheet: 'yes' }, SHEET_SCHEMA), /wrong type/);
  const { number, ...rest } = GOOD; assert.match(validate(rest, SHEET_SCHEMA), /number: missing/);
  assert.match(validate({ ...GOOD, register: [{ number: 5, title: null, rev: null }] }, SHEET_SCHEMA), /wrong type/);
});
test('OpenAI answers first on gpt-6.2-astra, with the sheet schema and a prompt that says: as printed, null when not printed', async () => {
  const r = await run({ openai: () => openaiOk(GOOD) });
  assert.equal(r.status, 200); assert.equal(r.json.provider, 'openai'); assert.equal(r.json.mode, 'sheet'); assert.equal(r.json.prompts, SHEET_PROMPTS); assert.deepEqual(r.json.plan, GOOD);
  assert.equal(r.calls.length, 1); assert.equal(r.calls[0].body.model, 'gpt-6.2-astra');
  assert.ok(r.calls[0].body.response_format.json_schema.schema.properties.is_drawing_sheet);
  assert.match(SHEET_SYSTEM, /exactly as printed/); assert.match(SHEET_SYSTEM, /null is better than a guess/);
  assert.ok(!r.text.includes('fake-oai-KEY'), 'no key in the reply');
});
test('when OpenAI is out Gemini answers, and Anthropic is never asked (the chain stops at the first valid answer)', async () => {
  const r = await run({ openai: () => new Response('{"error":"insufficient_quota"}', { status: 429 }), gemini: () => geminiOk(GOOD), anthropic: () => { throw new Error('not asked'); } });
  assert.equal(r.status, 200); assert.equal(r.json.provider, 'gemini'); assert.deepEqual(r.calls.map((c) => c.name), ['openai', 'gemini']);
});
test('when OpenAI and Gemini are out and Anthropic has no credit, the answer is a plain error, not a guess', async () => {
  const r = await run({ openai: () => new Response('', { status: 500 }), gemini: () => { throw new Error('network'); }, anthropic: () => new Response('{"error":"credit balance too low"}', { status: 400 }) });
  assert.equal(r.status, 502); assert.equal(r.json.error, 'model_error'); assert.deepEqual(r.calls.map((c) => c.name), ['openai', 'gemini', 'anthropic']);
});
test('an answer that is not valid for the sheet schema is rejected and the next provider is tried', async () => {
  const r = await run({ openai: () => openaiOk({ number: 'A-301' }), gemini: () => geminiOk('not json at all'), anthropic: () => anthropicOk(GOOD) });
  assert.equal(r.status, 200); assert.equal(r.json.provider, 'anthropic'); assert.deepEqual(r.calls.map((c) => c.name), ['openai', 'gemini', 'anthropic']);
});
test('with only Gemini configured, only Gemini is asked', async () => {
  const r = await run({ gemini: () => geminiOk(GOOD) }, { GEMINI_API_KEY: 'fake' });
  assert.equal(r.json.provider, 'gemini'); assert.deepEqual(r.calls.map((c) => c.name), ['gemini']);
});
