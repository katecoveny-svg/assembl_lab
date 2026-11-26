import {build as bundle} from 'esbuild';
import {build} from '../build-public.mjs';
import {mkdtempSync,readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {spawn} from 'node:child_process';
const here=dirname(fileURLToPath(import.meta.url)),release=join(mkdtempSync(join(tmpdir(),'assembl-author-')),'site');
build(release);
const root=join(release,'public');
await bundle({entryPoints:[join(here,'editor.js')],outfile:join(root,'author-editor.js'),bundle:true,define:{'process.env.NODE_ENV':'"production"'}});
copyFileSync(join(here,'editor.html'),join(root,'editor.html'));
// Author-only adapter goes into the temporary rehearsal copy.
const app=join(root,'pavilion/app.js');
let code=readFileSync(app,'utf8').replace('cameraDining(p)','(rehearsalDining ?? cameraDining(p))');
code+='\nlet rehearsalDining=null;\n'+`
if(window.parent!==window){
 const ready=setInterval(()=>{if(world){clearInterval(ready);parent.postMessage('pavilion-ready',location.origin)}},150);
 addEventListener('message',e=>{
  if(e.origin!==location.origin||e.source!==parent||e.data?.type!=='waiheke-rehearsal'||!world)return;
  const {travel,dining}=e.data;if(![travel,dining].every(n=>Number.isFinite(n)&&n>=0&&n<=1))return;
  stopTour();paused=true;setRoom(null);manual=p=travel;rehearsalDining=dining;dirty=true;wake();
 });
}`;
writeFileSync(app,code);
const port=process.env.PORT||'19108';
const server=spawn('python3',['-m','http.server',port,'--bind','127.0.0.1','--directory',root],{stdio:'inherit'});
console.log('Open http://127.0.0.1:'+port+'/editor.html (Alt+\\ hides Theatre panels).');
for(const sig of ['SIGTERM','SIGINT'])process.on(sig,()=>server.kill(sig));
server.on('exit',code=>process.exitCode=code??0);
