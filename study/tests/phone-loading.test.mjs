import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../m/phone.js',import.meta.url),'utf8');
const factory=source.slice(source.indexOf('function phone3d('),source.indexOf('const CFG=')).replace('import("./phone-asset.js")','modulePromise');
const turn=()=>new Promise(r=>setImmediate(r));
function setup(){let resolve,reject,leave;const modulePromise=new Promise((a,b)=>{resolve=a;reject=b});const element=()=>({style:{},dataset:{},textContent:'',hidden:false,disabled:true,attrs:{},setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]},classList:{values:new Set(),add(...a){a.forEach(v=>this.values.add(v))},remove(...a){a.forEach(v=>this.values.delete(v))}}});
 const nodes={};for(const k of ['phone-load-status','k-main','.phone-parts','phone-part','.s3-ov','.s3-hint'])nodes[k]=element();const figure=element(),host=element();host.parentElement=figure;host.querySelector=k=>nodes[k];const canvas=element();canvas.parentElement=host;
 const calls=[],s={soc:.2},api={step:{k:'charge'},redraw(){calls.push('redraw')}},S={canvas,api,renderer:{render(){calls.push('render')}}},root=element();
 const ctx=vm.createContext({modulePromise,S,s,phoneVisual:()=>({}),console:{warn(){}},window:{addEventListener(k,fn){leave=fn}},document:{documentElement:root,getElementById:k=>nodes[k],querySelector:k=>nodes[k]}});
 vm.runInContext(factory+';globalThis.world=phone3d(S)',ctx);
 const loaded={step(st){calls.push(['step',st.k])},update(state,st){calls.push(['update',state.soc,st.k])},dispose(){calls.push('dispose')}};
 return {resolve,reject,calls,s,api,root,nodes,host,figure,loaded,world:ctx.world,leave:()=>leave({persisted:false})};
}
test('late load uses current topic/settings/pause and verifies first render before readiness',async()=>{
 const t=setup();assert.equal(t.root.dataset.phoneAsset,'loading');t.api.step={k:'capacitor'};t.s.soc=.7;t.s.playing=false;t.world.step(t.api.step);t.resolve({loadPhone:async()=>t.loaded});await turn();assert.deepEqual(t.calls,[['step','capacitor'],['update',.7,'capacitor'],'render']);assert.equal(t.root.dataset.phoneAsset,'ready');assert.equal(t.host.style.visibility,'visible');
});
test('import/load/first-pose failure shows live diagram without false ready status',async()=>{
 for(const mode of ['import','load','pose']){const t=setup();if(mode==='import')t.reject(Error('404'));else t.resolve({loadPhone:async()=>{if(mode==='load')throw Error('bad GLB');t.loaded.update=()=>{throw Error('bad pose')};return t.loaded}});await turn();assert.equal(t.root.dataset.phoneAsset,'fallback');assert.equal(t.host.style.display,'none');assert.ok(t.calls.includes('redraw'));if(mode==='pose')assert.ok(t.calls.includes('dispose'));assert.ok(!t.calls.includes('render'))}
});
test('page exit during a pending load disposes the eventual asset without claiming readiness',async()=>{
 const t=setup();t.leave();t.resolve({loadPhone:async()=>t.loaded});await turn();assert.deepEqual(t.calls,['dispose']);assert.notEqual(t.root.dataset.phoneAsset,'ready');
});
