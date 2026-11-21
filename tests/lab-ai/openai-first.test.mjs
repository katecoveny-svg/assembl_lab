// The two lab guides answer on OpenAI first when OPENAI_API_KEY is set, and fall back to Claude. Offline: fetch is stubbed.
// GPT-6 Astra takes tools only on the Responses API, so that is the shape checked here.
import test from "node:test";
import assert from "node:assert/strict";

const OA = "sk-test-openai-000", AN = "sk-test-anthropic-000";
const post = (url, body) => new Request(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const user = (text) => ({ role: "user", content: [{ type: "text", text }] });
const msgs = { messages: [user("What is this page?")], state: {} };
const oaText = (text) => new Response(JSON.stringify({ model: "gpt-6.2-astra", status: "completed", output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text }] }] }), { status: 200 });
const anReply = (text) => new Response(JSON.stringify({ model: "claude-fable-5-2", stop_reason: "end_turn", content: [{ type: "text", text }] }), { status: 200 });
function stub(handler) { const calls = []; globalThis.fetch = async (url, init) => { const c = { url: String(url), init, body: JSON.parse(init.body) }; calls.push(c); return handler(c.url, c.body, calls.length); }; return calls; }
const fresh = (f) => import(`../../functions/api/${f}.js?t=${Math.random()}`);
const FILES = [["archipro-agent", "https://lab.assembl.co.nz/api/archipro-agent", "assembl.archipro.agent"], ["home-agent", "https://lab.assembl.co.nz/api/home-agent", "assembl.home.agent"]];

for (const [file, url, type] of FILES) {
  test(`${file}: OpenAI answers first, on the Responses API, with nothing stored`, async () => {
    const { onRequest, TOOLS } = await fresh(file);
    const calls = stub((u) => u.includes("openai.com") ? oaText("Kia ora.") : anReply("no"));
    const r = await onRequest({ request: post(url, msgs), env: { OPENAI_API_KEY: OA, ANTHROPIC_API_KEY: AN } }), j = await r.json();
    assert.equal(r.status, 200); assert.equal(j.type, type); assert.equal(j.provider, "openai"); assert.equal(j.model, "gpt-6.2-astra");
    assert.equal(calls.length, 1); assert.equal(calls[0].url, "https://api.openai.com/v1/responses");
    const b = calls[0].body;
    assert.equal(b.model, "gpt-6.2-astra"); assert.equal(b.store, false); assert.ok(b.instructions.length > 50); assert.ok(b.max_output_tokens > 0);
    assert.deepEqual(b.input, [{ role: "user", content: "What is this page?" }]);
    assert.equal(b.tools.length, TOOLS.length);
    assert.deepEqual(Object.keys(b.tools[0]).sort(), ["description", "name", "parameters", "strict", "type"]); assert.equal(b.tools[0].type, "function"); assert.equal(b.tools[0].strict, false);
    assert.deepEqual(j.content, [{ type: "text", text: "Kia ora." }]);
    assert.ok(!JSON.stringify(j).includes(OA) && !JSON.stringify(j).includes(AN));
  });
  test(`${file}: a tool call and its reasoning come back in the page's shape, and replay on the next turn`, async () => {
    const { onRequest, TOOLS } = await fresh(file);
    const name = TOOLS[0].name;
    const calls = stub((u, b, n) => n === 1
      ? new Response(JSON.stringify({ model: "gpt-6.2-astra", output: [{ type: "reasoning", id: "rs_1", summary: [], encrypted_content: "ENC" }, { type: "function_call", id: "fc_1", call_id: "call_1", name, arguments: "{\"a\":1}" }, { type: "function_call", id: "fc_2", call_id: "call_2", name: "not_a_tool", arguments: "{}" }] }), { status: 200 })
      : oaText("Done."));
    const j = await (await onRequest({ request: post(url, msgs), env: { OPENAI_API_KEY: OA } })).json();
    assert.equal(j.stop_reason, "tool_use");
    assert.equal(j.content.length, 2); assert.equal(j.content[0].type, "redacted_thinking"); assert.ok(j.content[0].data.startsWith("oa1:"));
    assert.deepEqual(j.content[1], { type: "tool_use", id: "call_1", name, input: { a: 1 } });
    const next = { messages: [user("What is this page?"), { role: "assistant", content: j.content }, { role: "user", content: [{ type: "tool_result", tool_use_id: "call_1", content: "{\"ok\":true}" }] }], state: {} };
    const j2 = await (await onRequest({ request: post(url, next), env: { OPENAI_API_KEY: OA } })).json();
    assert.deepEqual(j2.content, [{ type: "text", text: "Done." }]);
    assert.deepEqual(calls[1].body.input, [
      { role: "user", content: "What is this page?" },
      { type: "reasoning", id: "rs_1", summary: [], encrypted_content: "ENC" },
      { type: "function_call", call_id: "call_1", name, arguments: "{\"a\":1}" },
      { type: "function_call_output", call_id: "call_1", output: "{\"ok\":true}" },
    ]);
  });
  test(`${file}: if the model refuses the optional reasoning fields, the same request is sent once without them`, async () => {
    const { onRequest } = await fresh(file);
    const calls = stub((u, b, n) => n === 1 ? new Response(JSON.stringify({ error: { message: "x", type: "invalid_request_error", param: "reasoning.effort", code: "unsupported_value" } }), { status: 400 }) : oaText("Still fine."));
    const j = await (await onRequest({ request: post(url, msgs), env: { OPENAI_API_KEY: OA } })).json();
    assert.deepEqual(j.content, [{ type: "text", text: "Still fine." }]);
    assert.equal(calls.length, 2); assert.ok("reasoning" in calls[0].body && "include" in calls[0].body); assert.ok(!("reasoning" in calls[1].body) && !("include" in calls[1].body));
  });
  test(`${file}: falls back to Claude when OpenAI fails, and Claude never sees OpenAI's carried reasoning`, async () => {
    const { onRequest, TOOLS } = await fresh(file);
    const calls = stub((u) => u.includes("openai.com") ? new Response("{\"error\":{\"message\":\"server\",\"type\":\"server_error\"}}", { status: 500 }) : anReply("From Claude."));
    const hist = { messages: [user("Hi"), { role: "assistant", content: [{ type: "redacted_thinking", data: "oa1:{\"type\":\"reasoning\",\"id\":\"rs_1\",\"summary\":[],\"encrypted_content\":\"ENC\"}" }, { type: "tool_use", id: "call_1", name: TOOLS[0].name, input: {} }] }, { role: "user", content: [{ type: "tool_result", tool_use_id: "call_1", content: "ok" }] }], state: {} };
    const r = await onRequest({ request: post(url, hist), env: { OPENAI_API_KEY: OA, ANTHROPIC_API_KEY: AN } }), j = await r.json();
    assert.equal(r.status, 200); assert.match(j.model, /claude/); assert.deepEqual(j.content, [{ type: "text", text: "From Claude." }]);
    const an = calls.find((c) => c.url.includes("anthropic.com")); assert.ok(an);
    assert.ok(!JSON.stringify(an.body.messages).includes("oa1:"), "carried OpenAI reasoning is stripped before Claude");
    assert.equal(calls.filter((c) => c.url.includes("openai.com")).length, 1);
  });
  test(`${file}: when both fail, the reply says why OpenAI refused, without the key or the message text`, async () => {
    const { onRequest } = await fresh(file);
    stub((u) => u.includes("openai.com") ? new Response(JSON.stringify({ error: { message: `bad key ${OA}`, type: "invalid_request_error", param: "tools", code: "unsupported_parameter" } }), { status: 400 }) : new Response("{\"error\":{\"type\":\"invalid_request_error\",\"message\":\"credit balance is too low\"}}", { status: 400 }));
    const r = await onRequest({ request: post(url, msgs), env: { OPENAI_API_KEY: OA, ANTHROPIC_API_KEY: AN } }), t = await r.text(), j = JSON.parse(t);
    assert.ok(r.status >= 500); assert.equal(j.error, "model_error");
    assert.deepEqual(j.openai, { status: 400, code: "unsupported_parameter", param: "tools", type: "invalid_request_error" });
    assert.ok(!t.includes(OA) && !t.includes(AN) && !t.includes("bad key"));
  });
  test(`${file}: without an OpenAI key nothing changes: Claude answers`, async () => {
    const { onRequest } = await fresh(file);
    const calls = stub(() => anReply("Claude only."));
    const r = await onRequest({ request: post(url, msgs), env: { ANTHROPIC_API_KEY: AN } }), j = await r.json();
    assert.equal(r.status, 200); assert.equal(calls.length, 1); assert.match(calls[0].url, /anthropic\.com/); assert.equal(j.provider, undefined);
  });
  test(`${file}: status names the first provider and leaks no key`, async () => {
    const { onRequest } = await fresh(file);
    const sj = await (await onRequest({ request: new Request(url), env: { OPENAI_API_KEY: OA } })).json();
    assert.equal(sj.configured, true); assert.equal(sj.first, "openai"); assert.equal(sj.model, "gpt-6.2-astra"); assert.ok(!JSON.stringify(sj).includes(OA));
    const s2 = await (await onRequest({ request: new Request(url), env: { ANTHROPIC_API_KEY: AN } })).json();
    assert.equal(s2.first, "anthropic"); assert.match(s2.model, /claude/);
  });
}
