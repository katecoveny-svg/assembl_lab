import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createService,readJson,parseCatalogue,MAX_BODY } from './service.mjs';
import { createHandler } from './server.mjs';
const now=()=>Date.parse('2026-11-09T12:00:00Z');
const quake=(quality='best')=>({type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Point',coordinates:[174,-41]},properties:{publicID:'test1',time:'2026-11-09T10:00:00Z',magnitude:3.1,depth:12,locality:'Test only',quality}}]});
const response=p=>new Response(JSON.stringify(p),{headers:{'content-type':'application/json'}});
const catalogue={success:true,result:{count:1,results:[{id:'test',title:'Synthetic metadata',license_title:'Unknown',license_url:'javascript:alert(1)',metadata_modified:'2025-01-01'}]}};
test('observations reuse evidence DTO and retain distinct event/retrieval times',async()=>{
 const r=await createService({now,fetcher:async()=>response(quake())})('recent_earthquakes');assert.equal(r.status,'available');assert.notEqual(r.records[0].observedAt,r.retrievedAt);assert.equal(r.records[0].licence.name,'CC BY 3.0 NZ');assert.match(r.sha256,/^[a-f0-9]{64}$/);assert.equal(r.expiresAt,'2026-11-09T12:05:00.000Z');
});
test('deleted events excluded, empty is available, malformed rows fail closed',async()=>{
 for(const [payload,status,count] of [[quake('deleted'),'available',0],[{type:'FeatureCollection',features:[]},'available',0],[quake('changed'),'unavailable',0],[{type:'FeatureCollection',features:[{}]},'unavailable',0]]){const r=await createService({now,fetcher:async()=>response(payload)})('recent_earthquakes');assert.equal(r.status,status);assert.equal(r.records.length,count);}
});
test('invalid arguments never reach network; no URL/key controls',async()=>{
 const call=createService({fetcher:()=>{throw Error('must not fetch')}});
 for(const args of [{url:'https://example.com'},{apiKey:'secret'},[],null])await assert.rejects(call('recent_earthquakes',args));
 for(const args of [{query:''},{query:'a'.repeat(121)},{query:'x',limit:11},{query:'x',limit:1.5},{query:'x',url:'https://example.com'}])await assert.rejects(call('search_nz_catalogue',args));
});
test('catalogue is metadata only; unknown licence stays unknown',async()=>{
 const call=createService({now,fetcher:async(url,opts)=>{assert.match(url,/rows=5/);assert.equal(opts.redirect,'error');assert.equal(opts.credentials,'omit');return response(catalogue);}});
 const r=await call('search_nz_catalogue',{query:'schools'});assert.equal(r.status,'available');assert.equal(r.records[0].observedAt,null);assert.equal(r.records[0].licence.url,null);assert.equal(r.records[0].kind,'catalogue discovery');assert.throws(()=>parseCatalogue({success:false},'now'));
});
test('rate limit survives failed fetch and query changes',async()=>{
 let n=0;const call=createService({now,fetcher:async()=>{n++;throw Error('private error detail');}});
 const first=await call('search_nz_catalogue',{query:'a'});assert.equal(first.retrievedAt,null);assert.equal(first.records.length,0);assert.ok(!JSON.stringify(first).includes('private error'));
 assert.equal((await call('search_nz_catalogue',{query:'b'})).error,'rate_limited');assert.equal(n,1);
});
test('successful earlier results never become silent stale fallback',async()=>{
 let time=now(),n=0;const call=createService({now:()=>time,fetcher:async()=>{if(n++)throw Error();return response(quake());}});
 const a=await call('recent_earthquakes');time+=360000;const b=await call('recent_earthquakes');assert.equal(b.status,'unavailable');assert.deepEqual(b.records,[]);assert.ok(time>Date.parse(a.expiresAt));
});
test('deadlines include stalled response bodies; concurrency fails fast',async()=>{
 const fetcher=async()=>new Response(new ReadableStream({start(){}}),{headers:{'content-type':'application/json'}});
 const call=createService({fetcher,timeoutMs:25});const first=call('recent_earthquakes');assert.equal((await call('search_nz_catalogue',{query:'a'})).error,'busy');assert.equal((await first).error,'source_timeout');
});
test('response size, HTTP error, content type and fixed source checks',async()=>{
 await assert.rejects(readJson('https://example.com'));
 const bad=[new Response('x',{status:429}),new Response('not json'),new Response('x'.repeat(MAX_BODY+1),{headers:{'content-type':'application/json'}}),new Response('{}',{headers:{'content-type':'application/json','content-length':String(MAX_BODY+1)}})];
 for(const r of bad){const result=await createService({fetcher:async()=>r})('recent_earthquakes');assert.equal(result.status,'unavailable');}
});
test('MCP lifecycle, protocol errors and tool result',async()=>{
 const h=createHandler(async()=>({status:'available',records:[]}));const request=(id,method,params)=>h({jsonrpc:'2.0',id,method,params});
 assert.equal((await request(1,'tools/list')).error.code,-32000);
 assert.equal((await request(2,'initialize',{protocolVersion:'2025-11-25',clientInfo:{name:'test',version:'1'},capabilities:{}})).result.protocolVersion,'2025-11-25');
 assert.equal(await h({jsonrpc:'2.0',method:'notifications/initialized'}),null);
 assert.equal((await request(3,'tools/list')).result.tools.length,2);
 assert.equal((await request(4,'tools/call',{name:'recent_earthquakes'})).result.isError,false);
 assert.equal((await request(5,'tools/call',{name:'fetch_url'})).error.code,-32602);
 assert.equal((await h([])).error.code,-32600);
});
test('actual subprocess stdio emits JSON only and rejects oversized input',()=>{
 const init={jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-11-25',clientInfo:{name:'test',version:'1'},capabilities:{}}};
 const input=[init,{jsonrpc:'2.0',method:'notifications/initialized'},{jsonrpc:'2.0',id:2,method:'tools/list'}].map(JSON.stringify).join('\n')+'\n';
 const r=spawnSync(process.execPath,['tools/nz-data-mcp/server.mjs'],{input,encoding:'utf8',timeout:3000});assert.equal(r.status,0,r.stderr);assert.equal(r.stdout.trim().split('\n').length,2);assert.equal(JSON.parse(r.stdout.trim().split('\n')[1]).result.tools.length,2);
 const huge=spawnSync(process.execPath,['tools/nz-data-mcp/server.mjs'],{input:'x'.repeat(8193),encoding:'utf8',timeout:3000});assert.equal(huge.status,1);assert.equal(huge.stdout,'');
});
test('final wire result cap accounts for duplicate structured/text content',async()=>{
 const h=createHandler(async()=>({status:'available',text:'"'.repeat(60000)}));
 await h({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-11-25',clientInfo:{name:'test',version:'1'},capabilities:{}}});
 await h({jsonrpc:'2.0',method:'notifications/initialized'});
 const r=await h({jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'recent_earthquakes'}});assert.equal(r.result.isError,true);assert.equal(r.result.content[0].text,'response_too_large');
});
test('protocol structure errors differ from model-correctable tool validation errors',async()=>{
 const h=createHandler();const req=(id,method,params)=>h({jsonrpc:'2.0',id,method,params});
 assert.equal((await req(1,'initialize',{protocolVersion:'2025-11-25',clientInfo:true,capabilities:[]})).error.code,-32602);
 await req(2,'initialize',{protocolVersion:'unknown',clientInfo:{name:'test',version:'1'},capabilities:{}});
 await h({jsonrpc:'2.0',method:'notifications/initialized'});
 assert.equal((await req(3,'tools/call',{name:'recent_earthquakes',arguments:[]})).error.code,-32602);
 assert.equal((await req(4,'tools/call',{name:'search_nz_catalogue',arguments:{query:'x',limit:99}})).result.isError,true);
 assert.equal((await req(5,'tools/list',{cursor:'bogus'})).error.code,-32602);
});
