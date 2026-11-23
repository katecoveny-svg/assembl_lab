// /api/agent-judge (functions/api/agent-judge.js): the judgement asked by the interior agent and the look expert's critique, on the
// plan reader's provider chain (OpenAI gpt-6.2-astra, then Gemini, then Anthropic; the next on any error or bad output). Its schemas
// and prompts are the same as the rules files'. Offline: fetch is stubbed, keys are fake, nothing leaves this process.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as J from '../../functions/api/agent-judge.js';
import * as IR from '../../architecture/js/agents/interior-rules.js';
import * as LR from '../../architecture/js/agents/look-rules.js';
import { createJob, runJob, approve, STATUS } from '../../architecture/js/conductor.js';

const K = { ANTHROPIC_API_KEY: 'fake-anth-KEY-111', OPENAI_API_KEY: 'fake-oai-KEY-222', GEMINI_API_KEY: 'fake-gem-KEY-333' };
const IMG = 'data:image/jpeg;base64,' + Buffer.from('not really a jpeg').toString('base64');
const INTERIOR = { style_brief: 'Warm timber.', finishes: [], rooms: [{ name: 'Hall', layout: 'banquet', why: 'a dinner' }], notes: '' };
const LOOK = { scores: { materials: 3, light: 4, composition: 4, realism: 3, match: null }, notes: ['Warm the glass.'], summary: 'Close.' };
const ok = (b) => new Response(JSON.stringify(b), { status: 200 });
const openaiOk = (p) => ok({ model: 'gpt-x', choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(p) } }] });
const geminiOk = (p) => ok({ modelVersion: 'gem-x', candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(p) }] } }] });
const anthropicOk = (p) => ok({ model: 'claude-x', stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(p) }] });

async function run(body, handlers, env = K, method = 'POST') {
  const calls = [], real = globalThis.fetch, warn = console.warn;
  console.warn = () => {};
  globalThis.fetch = async (url, init) => {
    const host = new URL(url).host, name = host.includes('anthropic') ? 'anthropic' : host.includes('openai') ? 'openai' : 'gemini';
    calls.push({ name, body: JSON.parse(init.body), headers: init.headers });
    return handlers[name]();
  };
  try {
    const res = await J.onRequest({ request: new Request('https://x.test/api/agent-judge', method === 'GET' ? { method } : { method, body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }), env });
    const text = await res.text();
    return { status: res.status, text, json: JSON.parse(text), calls };
  } finally { globalThis.fetch = real; console.warn = warn; }
}
const interiorBody = { mode: 'interior', input: { brief: 'calm', rooms: [{ name: 'Hall', use: 'event-hall', area_m2: 200, layouts: ['banquet', 'conference'], now: 'banquet' }], finishes: [] } };

test('the function\'s schemas and prompts are the rules files\' own', () => {
  assert.deepEqual(J.INTERIOR_SCHEMA, IR.JUDGE_SCHEMA); assert.equal(J.INTERIOR_SYSTEM, IR.JUDGE_SYSTEM); assert.equal(J.INTERIOR_PROMPTS, IR.JUDGE_PROMPTS);
  assert.deepEqual(J.LOOK_SCHEMA, LR.CRITIQUE_SCHEMA); assert.equal(J.LOOK_SYSTEM, LR.CRITIQUE_SYSTEM); assert.equal(J.LOOK_PROMPTS, LR.CRITIQUE_PROMPTS);
});

test('interior: OpenAI answers first on gpt-6.2-astra, text only, strict schema; the key never comes back', async () => {
  const r = await run(interiorBody, { openai: () => openaiOk(INTERIOR) });
  assert.equal(r.status, 200); assert.equal(r.json.provider, 'openai'); assert.equal(r.json.src, 'model judgement'); assert.deepEqual(r.json.answer, INTERIOR);
  assert.equal(r.calls.length, 1); assert.equal(r.calls[0].body.model, 'gpt-6.2-astra');
  assert.equal(r.calls[0].body.response_format.json_schema.strict, true);
  assert.ok(!JSON.stringify(r.calls[0].body.messages).includes('image_url'));
  assert.ok(!r.text.includes('fake-'), 'no key in the answer');
});

test('the chain moves on: an error from OpenAI goes to Gemini, a bad answer from Gemini goes to Anthropic', async () => {
  const a = await run(interiorBody, { openai: () => new Response('x', { status: 500 }), gemini: () => geminiOk(INTERIOR) });
  assert.equal(a.json.provider, 'gemini'); assert.deepEqual(a.calls.map((c) => c.name), ['openai', 'gemini']);
  const b = await run(interiorBody, { openai: () => new Response('x', { status: 429 }), gemini: () => geminiOk({ style_brief: 3 }), anthropic: () => anthropicOk(INTERIOR) });
  assert.equal(b.json.provider, 'anthropic'); assert.deepEqual(b.calls.map((c) => c.name), ['openai', 'gemini', 'anthropic']);
  const c = await run(interiorBody, { openai: () => new Response('x', { status: 500 }), gemini: () => new Response('x', { status: 500 }), anthropic: () => new Response('x', { status: 500 }) });
  assert.equal(c.status, 502); assert.equal(c.json.tried.length, 3);
});

test('look: up to three stills, then the architect\'s render last; refused without a still', async () => {
  const r = await run({ mode: 'look', images: [IMG, IMG, IMG, IMG], views: ['three-quarter', 'entry', 'aerial'], render: IMG }, { openai: () => openaiOk(LOOK) });
  assert.equal(r.status, 200); assert.deepEqual(r.json.answer, LOOK);
  const parts = r.calls[0].body.messages[1].content;
  assert.equal(parts.filter((p) => p.type === 'image_url').length, 4, 'three stills and the render');
  assert.match(parts[0].text, /then the architect's own render/);
  const g = await run({ mode: 'look', images: [IMG] }, { openai: () => new Response('x', { status: 500 }), gemini: () => geminiOk(LOOK) });
  assert.equal(g.json.provider, 'gemini'); assert.equal(g.calls[1].body.contents[0].parts.filter((p) => p.inline_data).length, 1);
  assert.equal((await run({ mode: 'look', images: [] }, {})).status, 400);
  assert.equal((await run({ mode: 'look', images: ['http://x/y.jpg'] }, {})).status, 400);
  assert.equal((await run({ mode: 'other' }, {})).status, 400);
  assert.equal((await run({ mode: 'interior', input: {} }, {})).status, 400);
});

test('not set up: GET says so, POST answers 503 and calls no one', async () => {
  const g = await run(null, {}, {}, 'GET');
  assert.equal(g.json.configured, false); assert.deepEqual(Object.keys(g.json.prompts), ['interior', 'look']);
  const p = await run(interiorBody, {}, {});
  assert.equal(p.status, 503); assert.equal(p.calls.length, 0);
});

test('the conductor: a person gate waits as "needs a person", is never passed by the conductor, and goes on once a person approves', async () => {
  let t = 0; const now = () => new Date(Date.UTC(2026, 10, 23, 0, 0, t++)).toISOString();
  const job = createJob({ id: 'j', kind: 'interior', project_id: 'p', steps: [{ id: 'propose' }, { id: 'judge', paid: true }, { id: 'approve', person: true }] }, now);
  const ran = [];
  const h = { propose: async () => { ran.push('propose'); }, judge: { run: async ({ paid }) => { paid('one judgement'); ran.push('judge'); }, when: () => false }, approve: { run: async () => { ran.push('approve'); }, approval: () => 'A person looks at the proposal and says yes.' } };
  await runJob(job, h, { now });
  assert.deepEqual(ran, ['propose']); assert.equal(job.steps[2].status, STATUS.person); assert.equal(job.steps[2].reason, 'A person looks at the proposal and says yes.');
  assert.equal(job.steps[1].calls, 0, 'the paid step was not needed and made no call');
  await runJob(job, h, { now });
  assert.deepEqual(ran, ['propose'], 'running again does not pass the gate');
  assert.throws(() => approve(job, 'approve', ' '), /person/);
  approve(job, 'approve', 'A person', now);
  await runJob(job, h, { now });
  assert.deepEqual(ran, ['propose', 'approve']); assert.equal(job.status, STATUS.done); assert.equal(job.steps[2].approved_by, 'A person');
});
