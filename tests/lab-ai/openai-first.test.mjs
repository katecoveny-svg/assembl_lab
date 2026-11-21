// The two lab guides answer on OpenAI first when OPENAI_API_KEY is set, and fall back to Claude. Offline: fetch is stubbed.
import test from "node:test";
import assert from "node:assert/strict";

const OA = "sk-test-openai-000", AN = "sk-test-anthropic-000";
const post = (url, body) => new Request(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const msgs = { messages: [{ role: "user", content: [{ type: "text", text: "What is this page?" }] }], state: {} };
const oaReply = (text) => new Response(JSON.stringify({ model: "gpt-6.2-astra", choices: [{ message: { content: text } }] }), { status: 200 });
const anReply = (text) => new Response(JSON.stringify({ model: "claude-fable-5-2", stop_reason: "end_turn", content: [{ type: "text", text }] }), { status: 200 });
function stub(handler) { const calls = []; globalThis.fetch = async (url, init) => { calls.push({ url: String(url), init }); return handler(String(url), init); }; return calls; }
const fresh = (f) => import(`../../functions/api/${f}.js?t=${Math.random()}`);

for (const [file, url, type] of [["archipro-agent", "https://lab.assembl.co.nz/api/archipro-agent", "assembl.archipro.agent"], ["home-agent", "https://lab.assembl.co.nz/api/home-agent", "assembl.home.agent"]]) {
  test(`${file}: OpenAI answers first on gpt-6.2-astra when its key is set`, async () => {
    const { onRequest } = await fresh(file);
    const calls = stub((u) => u.includes("openai.com") ? oaReply("Kia ora.") : anReply("no"));
    const r = await onRequest({ request: post(url, msgs), env: { OPENAI_API_KEY: OA, ANTHROPIC_API_KEY: AN } }), j = await r.json();
    assert.equal(r.status, 200); assert.equal(j.type, type); assert.equal(j.provider, "openai"); assert.equal(j.model, "gpt-6.2-astra");
    assert.equal(calls.length, 1); assert.match(calls[0].url, /api\.openai\.com/);
    assert.equal(JSON.parse(calls[0].init.body).model, "gpt-6.2-astra");
    assert.deepEqual(j.content, [{ type: "text", text: "Kia ora." }]);
    assert.ok(!JSON.stringify(j).includes(OA) && !JSON.stringify(j).includes(AN));
  });
  test(`${file}: falls back to Claude when OpenAI fails`, async () => {
    const { onRequest } = await fresh(file);
    const calls = stub((u) => u.includes("openai.com") ? new Response("{\"error\":{\"message\":\"server\"}}", { status: 500 }) : anReply("From Claude."));
    const r = await onRequest({ request: post(url, msgs), env: { OPENAI_API_KEY: OA, ANTHROPIC_API_KEY: AN } }), j = await r.json();
    assert.equal(r.status, 200); assert.match(j.model, /claude/); assert.deepEqual(j.content, [{ type: "text", text: "From Claude." }]);
    assert.ok(calls.some((c) => c.url.includes("anthropic.com")));
    assert.equal(calls.filter((c) => c.url.includes("openai.com")).length, 1, "OpenAI is not retried on the same model");
  });
  test(`${file}: without an OpenAI key nothing changes: Claude answers`, async () => {
    const { onRequest } = await fresh(file);
    const calls = stub(() => anReply("Claude only."));
    const r = await onRequest({ request: post(url, msgs), env: { ANTHROPIC_API_KEY: AN } }), j = await r.json();
    assert.equal(r.status, 200); assert.equal(calls.length, 1); assert.match(calls[0].url, /anthropic\.com/); assert.equal(j.provider, undefined);
  });
  test(`${file}: OpenAI key alone is enough, and status names the first provider without leaking keys`, async () => {
    const { onRequest } = await fresh(file);
    stub(() => oaReply("ok"));
    const s = await onRequest({ request: new Request(url), env: { OPENAI_API_KEY: OA } }), sj = await s.json();
    assert.equal(sj.configured, true); assert.equal(sj.first, "openai"); assert.equal(sj.model, "gpt-6.2-astra"); assert.ok(!JSON.stringify(sj).includes(OA));
    const r = await onRequest({ request: post(url, msgs), env: { OPENAI_API_KEY: OA } }); assert.equal(r.status, 200);
    const s2 = await (await onRequest({ request: new Request(url), env: { ANTHROPIC_API_KEY: AN } })).json();
    assert.equal(s2.first, "anthropic"); assert.match(s2.model, /claude/);
  });
}
test("home-agent: a tool call from OpenAI comes back in the page's own shape", async () => {
  const { onRequest, TOOLS } = await fresh("home-agent");
  stub(() => new Response(JSON.stringify({ model: "gpt-6.2-astra", choices: [{ message: { content: null, tool_calls: [{ id: "call_1", type: "function", function: { name: TOOLS[0].name, arguments: "{}" } }, { id: "call_2", type: "function", function: { name: "not_a_tool", arguments: "{}" } }] } }] }), { status: 200 }));
  const j = await (await onRequest({ request: post("https://lab.assembl.co.nz/api/home-agent", msgs), env: { OPENAI_API_KEY: OA } })).json();
  assert.equal(j.stop_reason, "tool_use"); assert.deepEqual(j.content, [{ type: "tool_use", id: "call_1", name: TOOLS[0].name, input: {} }]);
});
