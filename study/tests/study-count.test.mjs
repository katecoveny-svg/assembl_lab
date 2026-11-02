// api/study-count.js: anonymous per-machine counts. Only known machine ids and kinds get through; nothing personal is logged.
import test from 'node:test';import assert from 'node:assert/strict';
const {cleanEvent,default:handler}=await import('../../api/study-count.js');
test('only a machine id, a known kind and an optional year group get through',()=>{
  assert.deepEqual(cleanEvent({m:'energy',k:'view',v:'l1'}),{m:'energy',k:'view',v:'l1'});
  assert.deepEqual(cleanEvent('{"m":"queue","k":"pass","v":"nope"}'),{m:'queue',k:'pass'});
  assert.equal(cleanEvent({m:'energy',k:'email'}),null);assert.equal(cleanEvent({m:'<script>',k:'view'}),null);assert.equal(cleanEvent({m:'x'.repeat(40),k:'view'}),null);
});
test('the handler logs one structured line and never echoes headers or the address',async()=>{
  const lines=[];const real=console.log;console.log=l=>lines.push(l);let status=0;const res={status(n){status=n;return res},end(){},json(){},setHeader(){}};
  try{await handler({method:'POST',body:{m:'vend',k:'hint'},headers:{'x-forwarded-for':'203.0.113.9','user-agent':'UA'}},res)}finally{console.log=real}
  assert.equal(status,204);const j=JSON.parse(lines[0]);assert.equal(j.type,'study.count');assert.equal(j.m,'vend');assert.equal(j.k,'hint');
  assert.ok(!lines[0].includes('203.0.113.9')&&!lines[0].includes('UA'));
});
