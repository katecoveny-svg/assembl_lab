import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
function model(){
 const context=vm.createContext({console,URL,Math,Date,performance:{now:()=>0},setTimeout:()=>0,clearTimeout(){},addEventListener(){},location:{pathname:'/study/m/claw.html',href:'http://localhost/'},document:{currentScript:null,documentElement:{setAttribute(){}},querySelector:()=>null},window:{}});
 vm.runInContext(readFileSync(new URL('kit.js',root),'utf8'),context);context.StudyKit=context.window.StudyKit;let cfg;
 context.StudyKit.mount=c=>{cfg=c;return{state:c.state}};vm.runInContext(readFileSync(new URL('m/claw.js',root),'utf8'),context);
 const {lesson:L,state:s}=cfg,e={A:null,B:null},api={state:s};
 return {cfg,L,s,e,api,control:id=>cfg.controls.find(c=>c.id===id),prepare:k=>L.prepare(k,s,api,e),capture:k=>{const r=L.capture(k,s,api,e);if(!r.error){e[k]=JSON.parse(JSON.stringify(r));if(k==='A')e.B=null}return r}};
}
test('claw: same seeded run produces reproducible A/B evidence; phases do not own the simulation',()=>{
 const m=model();m.prepare('A');const a=m.capture('A');assert.equal(a.raw.plays,10);assert.equal(a.raw.probability,.15);
 m.prepare('B');const b=m.capture('B');assert.equal(b.raw.plays,1000);assert.equal(b.raw.runId,a.raw.runId);assert.equal(b.raw.probability,.15);
 assert.equal(m.cfg.chips().rf[1],b.fields['Relative frequency']);assert.equal(a.raw.plays,10);
 m.L.reset();m.prepare('A');const a2=m.capture('A');m.prepare('B');const b2=m.capture('B');assert.equal(a2.raw.wins,a.raw.wins);assert.equal(b2.raw.wins,b.raw.wins);
 assert.equal(m.cfg.challenges[2].check(),true);
});
test('claw: changed probability, wrong sample count and unrelated run cannot be passed off as B',()=>{
 const m=model();assert.ok(m.capture('A').error);assert.match(m.prepare('B'),/fresh A/);m.prepare('A');m.capture('A');
 m.control('play10').onClick();assert.match(m.prepare('B'),/fresh A/);
 m.prepare('A');m.capture('A');m.control('pHold').set(m.s,.5);assert.equal(m.s.plays,0);assert.equal(m.s.hist.length,0);assert.ok(m.capture('B').error);
 m.prepare('A');m.capture('A');m.control('reset').onClick();m.control('play1000').onClick();assert.ok(m.capture('B').error);
});
test('claw: original RNG and formula outputs retained, payout isolated from conditional tree',()=>{
 const m=model();m.control('play1000').onClick();assert.equal(m.s.wins,154);assert.equal(m.cfg.chips().p[1],'0.150');assert.equal(m.cfg.chips().ev[1],'−$0.80 a play');
 m.control('mode').set(m.s,'payout');m.control('play100').onClick();assert.equal(m.s.wins,8);assert.equal(m.s.outcomes.length,40);
 m.cfg.onStep(m.s,m.cfg.steps.find(x=>x.k==='tree'));assert.equal(m.s.mode,'random');assert.equal(m.s.plays,0);
 m.control('pGrab').set(m.s,.8);assert.equal(m.cfg.challenges[0].check(),true);
 m.control('pGrab').set(m.s,.6);m.control('prize').set(m.s,14);assert.equal(m.cfg.challenges[1].check(),true);
 assert.match(m.cfg.steps.find(x=>x.k==='value').exam(),/\$14.00/);
});
test('claw: Reset cancels animation; repeat click cannot resample an active single trial',()=>{
 const m=model();m.control('play1').onClick();const plays=m.s.plays;assert.ok(m.s.anim);m.control('play1').onClick();assert.equal(m.s.plays,plays);
 m.control('reset').onClick();assert.equal(m.s.anim,null);assert.equal(m.s.plays,0);assert.equal(m.s.lastWin,null);assert.equal(m.s.outcomes.length,0);
});
