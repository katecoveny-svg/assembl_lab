import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ROUTE,bodyFor} from '../../render-review/review.mjs';
const frame='data:image/png;base64,AAAA';
const service={configured:true,needs_confirm:true,estimate:{best:{usd:.15}}};
const opts={frame,guide:'',time:'golden',consent:true,service};
test('signed-off request selects the best model on the existing same-origin route',()=>{
  assert.equal(ROUTE,'/api/render');
  assert.deepEqual(JSON.parse(bodyFor(opts)),{image:frame,quality:'best',look:{time:'golden'},confirm:true});
});
test('unconfirmed or unconfigured never builds a paid request',()=>{
  assert.throws(()=>bodyFor({...opts,consent:false}),/Approve/);
  assert.throws(()=>bodyFor({...opts,service:{...service,configured:false}}),/required/);
  assert.throws(()=>bodyFor({...opts,service:{...service,estimate:{best:{usd:null}}}}),/required/);
});
test('rejects unexpected inputs, caps size and retains an optional guide',()=>{
  for(const delta of [{frame:'https://example.invalid'},{guide:'x'},{time:'x'},{service:{...service,limits:{max_body_bytes:10}}}])assert.throws(()=>bodyFor({...opts,...delta}));
  assert.equal(JSON.parse(bodyFor({...opts,guide:frame})).line,frame);
});
