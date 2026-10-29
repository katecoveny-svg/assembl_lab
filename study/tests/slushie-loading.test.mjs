import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../m/slushie.js',import.meta.url),'utf8');
const factory=source.slice(source.indexOf('function slushie3d('),source.indexOf('function slushieBench(')).replace('import("./slushie-asset.js")','modulePromise');
const turn=()=>new Promise(r=>setImmediate(r));
function setup(){
 let resolve,reject;const modulePromise=new Promise((a,b)=>{resolve=a;reject=b});
 const element=()=>({style:{},dataset:{},textContent:'',disabled:true,hidden:false,attrs:{},setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]},classList:{values:new Set(),add(...x){x.forEach(v=>this.values.add(v))},remove(...x){x.forEach(v=>this.values.delete(v))}}});
 const nodes={};for(const id of ['slushie-load-status','k-main','slushie-parts','.slushie-parts','.s3-hint','.s3-ov'])nodes[id]=element();
 const figure=element(),host=element();host.parentElement=figure;host.querySelector=k=>nodes[k];const canvas=element();canvas.parentElement=host;
 const calls=[],s={run:{id:1}},api={step:{k:'machine'},redraw(){calls.push(['redraw'])}},S={canvas,api};
 const root=element(),ctx=vm.createContext({modulePromise,S,s,has3D:false,console:{warn(){}},document:{documentElement:root,getElementById:k=>nodes[k],querySelector:k=>nodes[k]},slushieBench(){return {step(st){calls.push(['step',st.k])},update(state,st){calls.push(['update',state.run.id,st.k])}}}});
 vm.runInContext(factory+'; globalThis.world=slushie3d(S);',ctx);
 return {resolve,reject,ctx,nodes,host,figure,root,calls,s,api,world:ctx.world};
}
test('a late asset completion uses the current topic and reset run, not captured loading state',async()=>{
 const t=setup();assert.equal(t.root.dataset.slushieAsset,'loading');assert.equal(t.host.style.visibility,'hidden');
 t.api.step={k:'energy'};t.s.run={id:9};t.world.step(t.api.step);
 t.resolve({loadSlushie:async()=>({}),lightSlushie(){}});await turn();
 assert.deepEqual(t.calls,[['step','energy'],['update',9,'energy']]);assert.equal(t.root.dataset.slushieAsset,'ready');assert.equal(t.host.style.visibility,'visible');assert.equal(t.nodes['slushie-parts'].disabled,false);
});
test('module/load failure never exposes an empty live scene and retains the diagram',async()=>{
 const t=setup();t.reject(new Error('404'));await turn();assert.equal(t.root.dataset.slushieAsset,'fallback');assert.equal(t.host.style.display,'none');assert.equal(t.ctx.has3D,false);assert.equal(t.nodes['.slushie-parts'].hidden,true);assert.ok(t.calls.some(x=>x[0]==='redraw'));assert.equal(t.figure.classList.values.has('s3-on'),false);
});
test('first-frame error fails before claiming live 3D',async()=>{
 const t=setup();t.ctx.slushieBench=()=>({step(){},update(){throw new Error('bad rig')}});t.resolve({loadSlushie:async()=>({}),lightSlushie(){}});await turn();assert.equal(t.root.dataset.slushieAsset,'fallback');assert.equal(t.host.style.visibility,'hidden');assert.match(t.nodes['slushie-load-status'].textContent,/3D unavailable/);
});
