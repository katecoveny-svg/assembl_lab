// Allen the tutor: the server's guard rails (api/tutor.js). The model call itself is mocked; browser behaviour
// (tools acting on a machine, exam mode, offline notes) is reviewed with Playwright against the real handler.
import test from 'node:test';import assert from 'node:assert/strict';
const {cleanMessages,TOOLS,SYSTEM,default:handler}=await import('../../api/tutor.js');
const call=async(body,env={})=>{const old={...process.env};Object.assign(process.env,env);let status=200,json,headers={};
  const res={status(n){status=n;return res},json(o){json=o},setHeader(k,v){headers[k]=v}};
  try{await handler({method:'POST',body,headers:{'x-forwarded-for':'10.0.0.'+Math.floor(Math.random()*250)}},res)}finally{process.env=old}return {status,json,headers}};
test('conversations must start with the student and alternate',()=>{
  assert.equal(cleanMessages([{role:'assistant',content:'hi'}]),null);
  assert.equal(cleanMessages([{role:'user',content:'a'},{role:'user',content:'b'}]),null);
  assert.ok(cleanMessages([{role:'user',content:'What is relative frequency?'}]));
  assert.equal(cleanMessages('nope'),null);
});
test('only known tools, bounded text and small images get through',()=>{
  const m=cleanMessages([{role:'user',content:'go'},{role:'assistant',content:[{type:'tool_use',id:'a',name:'delete_everything',input:{}},{type:'text',text:'ok'}]},{role:'user',content:[{type:'text',text:'x'.repeat(20000)}]}]);
  assert.deepEqual(m[1].content.map(b=>b.type),['text']);assert.equal(m[2].content[0].text.length,6000);
  const big={type:'image',source:{type:'base64',media_type:'image/jpeg',data:'A'.repeat(2_400_000)}};
  assert.equal(cleanMessages([{role:'user',content:[big,{type:'text',text:'q'}]}]),null);
  const svg={type:'image',source:{type:'base64',media_type:'image/svg+xml',data:'AAAA'}};
  assert.deepEqual(cleanMessages([{role:'user',content:[svg,{type:'text',text:'q'}]}])[0].content.map(b=>b.type),['text']);
});
test('the tutor teaches before telling, and is honest about marking',()=>{
  assert.match(SYSTEM,/Ask the student to try an answer before you give one/);assert.match(SYSTEM,/not official NZQA marking/);
  assert.match(SYSTEM,/never guess a standard number/);assert.match(SYSTEM,/1737/);
  assert.deepEqual(TOOLS.map(t=>t.name).sort(),['go_to_step','press_button','set_control','suggest_machine']);
});
test('without a key the endpoint says so, and the page falls back to the machine notes',async()=>{
  const r=await call({messages:[{role:'user',content:'hi'}]},{ANTHROPIC_API_KEY:''});assert.equal(r.status,501);assert.equal(r.json.error,'not_configured');
});
test('student turns are capped per visitor; tool round trips are not counted',async()=>{
  const real=globalThis.fetch;globalThis.fetch=async()=>new Response(JSON.stringify({content:[{type:'text',text:'ok'}],stop_reason:'end_turn'}),{status:200});
  try{const env={ANTHROPIC_API_KEY:'k',TUTOR_PER_VISITOR:'1'};const ip='10.9.9.9';
    const go=async body=>{let status=200,json,h={};const res={status(n){status=n;return res},json(o){json=o},setHeader(k,v){h[k]=v}};const old={...process.env};Object.assign(process.env,env);try{await handler({method:'POST',body,headers:{'x-forwarded-for':ip}},res)}finally{process.env=old}return {status,json,h}};
    assert.equal((await go({messages:[{role:'user',content:'first'}]})).status,200);
    const tool={messages:[{role:'user',content:'first'},{role:'assistant',content:[{type:'tool_use',id:'t1',name:'go_to_step',input:{step:'test'}}]},{role:'user',content:[{type:'tool_result',tool_use_id:'t1',content:'{"ok":true}'}]}]};
    assert.equal((await go(tool)).status,200,'a tool result is not a new turn');
    assert.equal((await go({messages:[{role:'user',content:'second'}]})).status,429);
  }finally{globalThis.fetch=real}
});
