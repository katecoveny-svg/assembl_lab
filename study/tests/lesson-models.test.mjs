import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
function model(name){
 const context=vm.createContext({console,URL,Math,Date,performance:{now:()=>0},setTimeout:()=>0,clearTimeout(){},addEventListener(){},location:{pathname:'/study/m/'+name+'.html',href:'http://localhost/'},document:{currentScript:null,documentElement:{setAttribute(){}},querySelector:()=>true},window:{}});
 vm.runInContext(readFileSync(new URL('kit.js',root),'utf8'),context);
 context.StudyKit=context.window.StudyKit;let cfg;
 context.StudyKit.mount=c=>{cfg=c;return{state:c.state,step:c.steps.find(x=>x.k===c.lesson.step)}};
 vm.runInContext(readFileSync(new URL('m/'+name+'.js',root),'utf8'),context);
 const {lesson:L,state:s}=cfg,st=cfg.steps.find(x=>x.k===L.step),api={state:s,step:st},e={A:null,B:null};
 st.onStep?.(s,st,api);
 return {cfg,L,s,st,api,e,prepare:k=>L.prepare(k,s,api,e),capture:k=>{const r=L.capture(k,s,api,e);if(!r.error)e[k]=JSON.parse(JSON.stringify(r));return r}};
}
test('sealed syringe: same gas and temperature, half volume doubles pressure',()=>{
 const m=model('particles');m.prepare('A');const a=m.capture('A');m.prepare('B');const b=m.capture('B');
 assert.equal(a.raw.pressure,101.3);assert.equal(b.raw.pressure,202.6);assert.equal(b.raw.pressure/a.raw.pressure,2);
 assert.equal(m.cfg.chips(m.s,m.st).press[1],'203 kPa');m.s.gasT=21;assert.ok(m.capture('B').error);
 assert.equal(a.raw.volume,60);m.L.reset(m.s,m.api);assert.equal(m.s.vol,60);assert.equal(m.s.playing,false);
});
test('tanks: shared equation at fixed time gives 40 and 70 L, within tank capacity',()=>{
 const m=model('lines');m.prepare('A');const a=m.capture('A');m.prepare('B');const b=m.capture('B');
 assert.equal(a.raw.level,40);assert.equal(b.raw.level,70);assert.equal(a.raw.time,b.raw.time);assert.equal(b.raw.initial,10);
 assert.equal(m.cfg.chips().now[1],'70 L');assert.equal(m.s.playing,false);m.s.t=0;assert.ok(m.capture('B').error);
 m.prepare('B');m.s.cA=15;assert.ok(m.capture('B').error);m.L.reset();assert.equal(m.s.t,0);
});
test('reactions: capture requires started 2s run, and B must retain captured A ghost',()=>{
 const m=model('reactions');m.prepare('A');assert.ok(m.capture('A').error);
 m.cfg.tick(m.s,.1,m.st,m.api);assert.ok(m.capture('A').error);m.cfg.tick(m.s,.11,m.st,m.api);
 const a=m.capture('A');assert.ok(!a.error);assert.equal(a.raw.concentration,.5);
 m.prepare('B');assert.equal(m.s.ghost.id,a.raw.id);assert.equal(m.s.c,1);m.cfg.tick(m.s,.21,m.st,m.api);
 const b=m.capture('B');assert.ok(!b.error);assert.ok(Math.abs(b.raw.initialRate/a.raw.initialRate-2)<1e-12);
 assert.equal(m.cfg.challenges[1].check(),true);assert.equal(a.raw.concentration,.5);
 m.s.run.T=25;assert.ok(m.capture('B').error);m.L.reset();assert.equal(m.s.ghost,null);assert.equal(m.s.playing,false);
});
test('reactions: changing run after A prevents unrelated B evidence',()=>{
 const m=model('reactions');m.prepare('A');m.cfg.tick(m.s,.21,m.st,m.api);m.capture('A');m.prepare('A');
 assert.match(m.prepare('B'),/Capture a current A/);assert.equal(m.s.c,.5);
});

test('tank explanation follows A, B and later control changes',()=>{
 const m=model('lines');m.prepare('A');assert.match(m.st.exam(),/gradient is 3 L\/min/);
 m.prepare('B');assert.match(m.st.exam(),/gradient is 6 L\/min/);assert.match(m.st.exam(),/L = 6t \+ 10/);
 m.s.mA=-2;assert.match(m.st.exam(),/loses 2 litres/);m.s.mA=0;assert.match(m.st.exam(),/stays constant/);
});
