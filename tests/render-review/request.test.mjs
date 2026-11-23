import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ROUTE,bodyFor,routesFor} from '../../render-review/review.mjs';
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

test('only the existing Lab preview host can fall back to the fixed production endpoint',()=>{
  const live='https://lab.assembl.co.nz/api/render';
  assert.deepEqual(routesFor('https://branch-a.assembl-lab.pages.dev'),[ROUTE,live]);
  for(const bad of ['null','http://x.assembl-lab.pages.dev','https://x.assembl-lab.pages.dev.evil.invalid','https://x.assembl-lab.pages.dev:1234','https://lab.assembl.co.nz'])assert.deepEqual(routesFor(bad),[ROUTE]);
});

test('finish notes are optional, trimmed and constrained to the server limit',()=>{
  assert.equal(JSON.parse(bodyFor({...opts,setting:'  dark roof, retain existing masonry  '})).look.setting,'dark roof, retain existing masonry');
  assert.throws(()=>bodyFor({...opts,setting:'x'.repeat(121)}),/120/);
  assert.throws(()=>bodyFor({...opts,setting:42}),/120/);
});
