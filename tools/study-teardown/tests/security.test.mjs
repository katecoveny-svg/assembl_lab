import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const original=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'assembl-teardown-security-'));
 const tools=path.join(root,'tools/study-teardown');
 fs.mkdirSync(tools,{recursive:true});
 fs.copyFileSync(path.join(original,'new-machine.cjs'),path.join(tools,'new-machine.cjs'));
 fs.cpSync(path.join(original,'template'),path.join(tools,'template'),{recursive:true});
 const run=(slug,title)=>spawnSync(process.execPath,[path.join(tools,'new-machine.cjs'),slug,title],{encoding:'utf8'});
 return {root,run};
}
test('scaffolder creates a plain title and refuses overwrite',()=>{
 const {root,run}=fixture();
 assert.equal(run('energy-test','Energy model').status,0);
 const p=path.join(root,'study/teardown/energy-test/main.js'),before=fs.readFileSync(p,'utf8');
 assert.notEqual(run('energy-test','Replacement').status,0);
 assert.equal(fs.readFileSync(p,'utf8'),before);
});
test('scaffolder rejects traversal and HTML or script titles before writing',()=>{
 const {root,run}=fixture();
 for(const slug of ['../outside','/tmp/outside','x/y','..'])assert.notEqual(run(slug,'Energy').status,0);
 for(const title of ['<img src=x onerror=alert(1)>',"x';alert(1);//",'*/alert(1)/*'])assert.notEqual(run('unsafe',title).status,0);
 assert.equal(fs.existsSync(path.join(root,'study')),false);
});
test('scaffolder rejects symlink ancestors without touching target',()=>{
 const {root,run}=fixture();
 const outside=fs.mkdtempSync(path.join(os.tmpdir(),'assembl-outside-'));
 fs.symlinkSync(outside,path.join(root,'study'));
 assert.notEqual(run('energy-test','Energy').status,0);
 assert.deepEqual(fs.readdirSync(outside),[]);
});

test('verification server confines paths and handles malformed URLs', async () => {
 const {createRequire} = await import('node:module');
 const require=createRequire(import.meta.url);
 const {serve}=require('../static-server.cjs');
 const http=await import('node:http');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'assembl-static-'));
 const outside=fs.mkdtempSync(path.join(os.tmpdir(),'assembl-static-out-'));
 fs.writeFileSync(path.join(root,'index.html'),'safe');
 fs.writeFileSync(path.join(outside,'secret.txt'),'private');
 fs.symlinkSync(outside,path.join(root,'linked'));
 fs.mkdirSync(path.join(root,'nested'));
 fs.symlinkSync(path.join(outside,'secret.txt'),path.join(root,'nested','index.html'));
 const server=await serve(root);
 const get=p=>new Promise((resolve,reject)=>{
  http.get({host:'127.0.0.1',port:server.address().port,path:p},r=>{let body='';r.on('data',d=>body+=d);r.on('end',()=>resolve({code:r.statusCode,body}));}).on('error',reject);
 });
 try {
  assert.deepEqual(await get('/'),{code:200,body:'safe'});
  for(const p of ['/linked/secret.txt','/nested/','/../'+path.basename(outside)+'/secret.txt','/%2e%2e/'+path.basename(outside)+'/secret.txt']) assert.equal((await get(p)).code,403,p);
  assert.equal((await get('/%ZZ')).code,400);
  assert.equal((await get('/%00')).code,400);
  assert.equal((await get('/missing')).code,404);
  assert.equal((await get('/')).code,200);
 } finally {await new Promise(r=>server.close(r));}
});
