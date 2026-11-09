// Optional proof using an already-installed, reviewed official SDK. Never installs packages.
// Usage: node tools/nz-data-mcp/sdk-smoke.mjs /absolute/path/to/@modelcontextprotocol/client
import assert from 'node:assert/strict';
import { pathToFileURL,fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
const directory=process.argv[2];
if(!directory)throw Error('Supply an existing official @modelcontextprotocol/client package directory; do not auto-install.');
const metadata=JSON.parse(await readFile(resolve(directory,'package.json'),'utf8'));
assert.equal(metadata.name,'@modelcontextprotocol/client');
const {Client}=await import(pathToFileURL(resolve(directory,'dist/index.mjs')));
const {StdioClientTransport}=await import(pathToFileURL(resolve(directory,'dist/stdio.mjs')));
// Explicit synthetic harness tests the actual server framing/handler, with no network request.
const server=pathToFileURL(fileURLToPath(new URL('./server.mjs',import.meta.url))).href;
const service=pathToFileURL(fileURLToPath(new URL('./service.mjs',import.meta.url))).href;
const code=`import {serve,createHandler} from ${JSON.stringify(server)};import {createService} from ${JSON.stringify(service)};await serve(process.stdin,process.stdout,createHandler(createService({fetcher:async()=>new Response(JSON.stringify({type:'FeatureCollection',features:[]}),{headers:{'content-type':'application/json'}})})));`;
const client=new Client({name:'assembl-sdk-proof',version:'1'},{versionNegotiation:{mode:'legacy'}});
const transport=new StdioClientTransport({command:process.execPath,args:['--input-type=module','-e',code],env:{},stderr:'pipe'});
try {
 await client.connect(transport,{timeout:3000});
 assert.equal(client.getServerVersion().name,'assembl-nz-data-review');
 assert.equal((await client.listTools()).tools.length,2);
 await client.ping();
 const good=await client.callTool({name:'recent_earthquakes',arguments:{}});
 assert.equal(good.isError,false);assert.equal(good.structuredContent.status,'available');assert.deepEqual(good.structuredContent.records,[]);
 const invalid=await client.callTool({name:'search_nz_catalogue',arguments:{query:'x',limit:99}});assert.equal(invalid.isError,true);
 await assert.rejects(client.callTool({name:'unknown_tool',arguments:{}}));
 console.log(JSON.stringify({sdk:metadata.name,version:metadata.version,transport:'stdio',protocol:'2025-11-25',passed:['initialize','listTools','ping','synthetic tool success','tool validation error','unknown tool protocol error','close'],liveSourceProof:false}));
} finally {await client.close();}
