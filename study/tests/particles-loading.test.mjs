import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const source=readFileSync(new URL('../m/particles.js',import.meta.url),'utf8');
const seg=(a,b)=>{const i=source.indexOf(a),j=source.indexOf(b,i);assert.ok(i>=0&&j>i,'missing '+a);return source.slice(i,j)};
const sha=x=>createHash('sha256').update(x).digest('hex');

test('the authoritative model, steps, lesson, controls, tick, chips and challenges are byte-identical to the pre-GLB machine',()=>{
 // Baseline: study/m/particles.js at e372529 (before the Blender apparatus). The GLB work only replaced the 3D bench.
 assert.equal(sha(seg('(()=>{','// ---------- drawing')),'90718ede96d61ae428fd69872f418caee30c976971b36c37af4146d1bbacba13');
 assert.equal(sha(seg('function jump(zone)','// ---------- the 3D bench')),'07bd919ee4b58f17427bc916cacd64ac74ac2be8e90532ecbbd02c84e5e3250a');
 assert.equal(sha(seg('  eyebrow:"Science','  footer:')),'b103329b2008eb9ca1da4af337fc2b22e14b2ff60f133a3d7a7904b8cfa2d14a');
 // the 3D bench reads the model; it never defines its own pressure, boiling point or phase model
 const bench=seg('function particlesBench(','const CFG=');
 for(const f of ['function pressure','function stateFrom','function boilPoint','function pressureAt','Math.random()*s.'])assert.ok(!bench.includes(f),f);
 assert.match(bench,/rig\.setVisualState\(\{volumeML:s\.vol,pressureKPa:p,/);assert.match(bench,/const Wd=s\.vol\*SY\.perML,p=pressure\(\)/);
});

test('palette: no canary yellow, additive glow or emissive material left on this machine',()=>{
 assert.ok(!/#F2C83C|#FFD76A|#F7E7A6|product\.butter|case\.butter/i.test(source));
 assert.ok(!/additive:true/.test(source));assert.ok(!/mat\("glow"/.test(source));assert.match(source,/postprocessing:false/);
});

const turn=()=>new Promise(r=>setImmediate(r));
function setup(){
 let resolve,reject;const modulePromise=new Promise((a,b)=>{resolve=a;reject=b});
 const element=()=>({style:{},dataset:{},textContent:'',hidden:false,attrs:{},setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]},classList:{values:new Set(),add(...x){x.forEach(v=>this.values.add(v))},remove(...x){x.forEach(v=>this.values.delete(v))},has(v){return this.values.has(v)}}});
 const nodes={};for(const id of ['particles-load-status','k-main','.s3-hint','.s3-ov'])nodes[id]=element();
 const figure=element(),host=element();host.parentElement=figure;host.querySelector=k=>nodes[k];const canvas=element();canvas.parentElement=host;
 const calls=[],events=[],s={vol:60,Q:0},api={step:{k:'heat'},redraw(){calls.push(['redraw'])}},S={canvas,api};
 const root=element();root.dispatchEvent=e=>events.push(e.type);
 const graphics={live:true};
 const pre=seg('const STATUS3=','function particles3d(');
 const ctx=vm.createContext({modulePromise,S,s,graphics,TOP3:.3,Event:class{constructor(t){this.type=t}},console:{warn(){}},
  document:{documentElement:root,getElementById:k=>nodes[k],querySelector:k=>nodes[k]},
  particlesBench(){return {step(st){calls.push(['step',st.k])},update(state,st){calls.push(['update',state.vol,st.k])}}}});
 vm.runInContext(pre+seg('function particles3d(','function particlesBench(').replace('import("./particles-asset.js")','modulePromise')+'; globalThis.world=particles3d(S);',ctx);
 return {resolve,reject,ctx,nodes,host,figure,root,calls,events,s,api,graphics,world:ctx.world};
}
const assetModule={loadParticles:async()=>({}),lightParticles(){}};

test('a late asset uses the current topic and experiment, and only then claims live 3D',async()=>{
 const t=setup();assert.equal(t.root.dataset.particlesAsset,'loading');assert.equal(t.host.style.visibility,'hidden');assert.ok(t.figure.classList.has('particles-loading'));
 t.api.step={k:'pressure'};t.s.vol=30;t.world.step(t.api.step);t.world.update(t.s,t.api.step,0,0);assert.deepEqual(t.calls,[]);
 t.resolve(assetModule);await turn();await turn();
 assert.deepEqual(t.calls,[['step','pressure'],['update',30,'pressure']]);assert.equal(t.root.dataset.particlesAsset,'ready');
 assert.equal(t.host.style.visibility,'visible');assert.ok(t.figure.classList.has('s3-on'));assert.equal(t.nodes['k-main'].attrs['aria-hidden'],'true');assert.deepEqual(t.events,['particles-asset']);
});
test('a late asset while the learner chose the drawing stays hidden behind the drawing',async()=>{
 const t=setup();t.graphics.live=false;t.resolve(assetModule);await turn();await turn();
 assert.equal(t.root.dataset.particlesAsset,'ready');assert.ok(!t.figure.classList.has('s3-on'));assert.equal(t.nodes['k-main'].attrs['aria-hidden'],undefined);
});
test('a failed load or wrong contract never shows an empty scene and keeps the live drawing',async()=>{
 const t=setup();t.reject(new Error('Unsupported particles rig contract'));await turn();
 assert.equal(t.root.dataset.particlesAsset,'fallback');assert.equal(t.host.style.display,'none');assert.ok(!t.figure.classList.has('s3-on'));assert.ok(!t.figure.classList.has('particles-loading'));
 assert.match(t.nodes['particles-load-status'].textContent,/3D unavailable/);assert.ok(t.calls.some(x=>x[0]==='redraw'));
});
test('a first-frame error fails before claiming live 3D',async()=>{
 const t=setup();t.ctx.particlesBench=()=>({step(){},update(){throw new Error('bad rig')}});t.resolve(assetModule);await turn();await turn();
 assert.equal(t.root.dataset.particlesAsset,'fallback');assert.equal(t.host.style.visibility,'hidden');
});
