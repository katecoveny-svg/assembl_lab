import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../m/vinyl.js',import.meta.url),'utf8');
const factory=source.slice(source.indexOf('function vinyl3d('),source.indexOf('const CFG=')).replace("import('./vinyl-asset.js')",'modulePromise');
const turn=()=>new Promise(r=>setImmediate(r));
function setup(){
 let resolve,reject,leave,loadSignal;const modulePromise=new Promise((a,b)=>{resolve=a;reject=b});
 const el=()=>({style:{},dataset:{},textContent:'',hidden:false,attrs:{},setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]},replaceChildren(){},classList:{add(){},remove(){}}});
 const nodes=Object.fromEntries(['vinyl-load-status','k-main','.vinyl-parts','.s3-ov','.s3-hint'].map(k=>[k,el()])),figure=el(),host=el();host.parentElement=figure;host.querySelector=k=>nodes[k];const canvas=el();canvas.parentElement=host;
 const calls=[],s={rpm:45,playing:false},api={step:{k:'spin'},redraw(){calls.push('redraw')}},S={canvas,api,scene:{children:[]},THREE:{Color:class{}},camera:{updateProjectionMatrix(){}},ground:{material:{}},sun:{},renderer:{render(){calls.push('render')}}},root=el();
 const world={step(st){calls.push(['step',st.k])},update(state,st){calls.push(['update',state.rpm,state.playing,st.k])},dispose(){calls.push('world.dispose')}};
 const asset={dispose(){calls.push('asset.dispose')},disposeRoots(){calls.push('roots.dispose')}};
 const ctx=vm.createContext({modulePromise,S,s,AbortController,vinylWorld:()=>world,console:{warn(){}},window:{addEventListener(k,fn){leave=fn}},document:{documentElement:root,getElementById:k=>nodes[k],querySelector:k=>nodes[k]}});
 vm.runInContext(factory+';globalThis.wrapper=vinyl3d(S)',ctx);
 return {resolve,reject,calls,s,api,S,root,nodes,host,world,asset,ctx,wrapper:ctx.wrapper,leave:()=>leave({persisted:false}),get signal(){return loadSignal},module:{loadVinyl:async(S,signal)=>{loadSignal=signal;return asset}}};
}
test('late asset uses the current settings/topic/pause and only reports ready after a successful real render',async()=>{
 const t=setup();t.s.rpm=78;t.api.step={k:'formats'};t.wrapper.step(t.api.step);assert.equal(t.root.dataset.vinylAsset,'loading');t.resolve(t.module);await turn();assert.deepEqual(t.calls,[['step','formats'],['update',78,false,'formats'],'render']);assert.equal(t.root.dataset.vinylAsset,'ready');assert.equal(t.host.style.visibility,'visible');
});
test('import, asset, build, first pose and renderer failures show live fallback and clean up owned work',async()=>{
 for(const mode of ['import','asset','build','pose','render']){const t=setup();if(mode==='import')t.reject(Error('404'));else{
  if(mode==='asset')t.module.loadVinyl=async()=>{throw Error('bad bytes')};if(mode==='build')t.ctx.vinylWorld=()=>{throw Error('build')};if(mode==='pose')t.world.update=()=>{throw Error('pose')};if(mode==='render')t.S.renderer.render=()=>{throw Error('render')};t.resolve(t.module);
 }await turn();assert.equal(t.root.dataset.vinylAsset,'fallback',mode);assert.equal(t.host.style.display,'none');assert.ok(t.calls.includes('redraw'));if(mode==='build')assert.ok(t.calls.includes('roots.dispose'));if(['pose','render'].includes(mode))assert.ok(t.calls.includes('world.dispose'))}
});
test('exit aborts pending loading and disposes late results; no false ready or subsequent rendering',async()=>{
 const t=setup();let done;t.module.loadVinyl=async(S,signal)=>{t.pendingSignal=signal;return new Promise(r=>{done=r})};t.resolve(t.module);await turn();t.leave();assert.equal(t.pendingSignal.aborted,true);done(t.asset);await turn();assert.deepEqual(t.calls,['asset.dispose']);assert.notEqual(t.root.dataset.vinylAsset,'ready');t.wrapper.update();assert.deepEqual(t.calls,['asset.dispose']);
});
