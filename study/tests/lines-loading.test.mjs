import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
// Runs the real lines3d factory from study/m/lines.js against an inert stand-in for the kit3d bench, so the Blender-tank
// glue can be checked without WebGL: what happens when the asset loads, fails, or its first frame throws.
const source=readFileSync(new URL('../m/lines.js',import.meta.url),'utf8');
const factory=source.slice(source.indexOf('function lines3d('),source.indexOf('StudyKit.mount')>0?source.indexOf('const CFG='):undefined)
  .replace('import("./lines-asset.js")','modulePromise');
const model=source.slice(source.indexOf('const s='),source.indexOf('// ---------- drawing'));
const turn=()=>new Promise(r=>setImmediate(r));
// anything the scene builder asks for is a harmless object: numbers read as 0, calls and constructors return another stand-in
function inert(log){const f=function(){};let p;p=new Proxy(f,{get:(t,k)=>k===Symbol.toPrimitive?()=>0:k==='then'?undefined:k===Symbol.iterator?undefined:(k in t&&k!=='prototype'&&k!=='name'&&k!=='length')?t[k]:p,
  set:(t,k,v)=>{t[k]=v;return true},apply:()=>p,construct:()=>p});return p}
function setup(){
 let resolve,reject;const modulePromise=new Promise((a,b)=>{resolve=a;reject=b});
 const ds={},status={textContent:''},S=inert();
 const api={state:null,step:{k:'rate'},redraw(){}};
 const ctx=vm.createContext({modulePromise,console:{warn(){}},Math,Object,Array,
   document:{documentElement:{dataset:ds},getElementById:k=>k==='lines-load-status'?status:null}});
 vm.runInContext(model+factory+';globalThis.s=s;globalThis.lev=lev;',ctx);
 api.state=ctx.s;
 const Sx=new Proxy(S,{get:(t,k)=>k==='api'?api:k==='clamp'?(x,a,b)=>Math.max(a,Math.min(b,x)):k==='lerp'?(a,b,t)=>a+(b-a)*t:k==='REDUCED'?true:k==='PAL'?{case:{},product:{},deep:{}}:k==='THREE'?S:t[k]});
 ctx.Sx=Sx;vm.runInContext('globalThis.world=lines3d(Sx);',ctx);
 return {resolve,reject,ctx,ds,status,api,world:ctx.world,s:ctx.s};
}
function fakeAsset(calls,{throwOn}={}){
 const node=()=>({position:{set(){},x:0},visible:true,add(){},parent:null});
 const tank=()=>({float:node(),wheel:node()});
 return {holders:{A:node(),B:node()},scale:3,contract:{level_mapping:{floor_y_gltf_m:.187,metres_per_litre:.01}},
   rig:{tanks:{A:tank(),B:tank()},setTank(k,v){if(throwOn)throw new Error(throwOn);calls.push([k,JSON.parse(JSON.stringify(v))])}}};
}
test('while loading, the drawn tanks are used and the page says so',()=>{
 const t=setup();assert.equal(t.world.tanks,'loading');assert.equal(t.ds.linesTanks,'loading');assert.match(t.status.textContent,/simplified tanks shown meanwhile/);
});
test('a loaded asset receives litres from the existing lev() and the lesson’s own tap and drain conditions',async()=>{
 const t=setup(),calls=[];t.resolve({loadLinesTanks:async()=>fakeAsset(calls)});await turn();await turn();
 assert.equal(t.world.tanks,'blender');assert.equal(t.ds.linesTanks,'blender');assert.match(t.status.textContent,/Blender tanks/);
 Object.assign(t.s,{mA:6,cA:10,t:10,B:false});calls.length=0;t.world.update(t.s,{k:'rate'},0,0);
 assert.deepEqual(calls,[['A',{litres:70,rate:6,filling:true,draining:false}]]);
 Object.assign(t.s,{mA:3,cA:10,t:10,B:true,mB:-2,cB:80});calls.length=0;t.world.update(t.s,{k:'meet'},0,0);
 assert.deepEqual(calls,[['A',{litres:40,rate:3,filling:true,draining:false}],['B',{litres:60,rate:-2,filling:false,draining:true}]]);
 Object.assign(t.s,{mA:-4,cA:80,t:20,B:false});calls.length=0;t.world.update(t.s,{k:'drain'},0,0);
 assert.deepEqual(calls,[['A',{litres:0,rate:-4,filling:false,draining:false}]]);
 calls.length=0;t.world.update(t.s,{k:'scooter'},0,0);assert.deepEqual(calls,[]);
});
test('a failed load keeps the simplified 3D tanks and says why, without touching the experiment',async()=>{
 const t=setup(),before=JSON.stringify(t.s);t.reject(new Error('404'));await turn();await turn();
 assert.equal(t.world.tanks,'fallback');assert.equal(t.ds.linesTanks,'fallback');assert.match(t.status.textContent,/unavailable · simplified 3D tanks shown/);
 t.world.update(t.s,{k:'rate'},0,0);assert.equal(JSON.stringify(t.s),before);
});
test('a rig that throws on its first frame falls back before claiming the Blender tanks',async()=>{
 const t=setup();t.resolve({loadLinesTanks:async()=>fakeAsset([],{throwOn:'bad rig'})});await turn();await turn();
 assert.equal(t.world.tanks,'fallback');assert.notEqual(t.ds.linesTanks,'blender');
});
