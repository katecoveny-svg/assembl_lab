import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const old=execFileSync('git',['show','ecf6cdb:study/m/slushie.js'],{encoding:'utf8'}),current=readFileSync(new URL('../m/slushie.js',import.meta.url),'utf8');
function mount(source){
 const ctx=vm.createContext({console,URL,Math,Date,performance:{now:()=>0},setTimeout:()=>0,clearTimeout(){},addEventListener(){},location:{search:'',pathname:'/study/m/slushie.html',href:'http://localhost/'},document:{currentScript:null,documentElement:{setAttribute(){}},querySelector:()=>null},window:{}});
 vm.runInContext(readFileSync(new URL('../kit.js',import.meta.url),'utf8'),ctx);ctx.StudyKit=ctx.window.StudyKit;let cfg;ctx.StudyKit.mount=c=>{cfg=c;return{state:c.state}};vm.runInContext(source,ctx);
 cfg.steps[0].onStep();
 return {cfg,s:cfg.state,control:id=>cfg.controls.find(c=>c.id===id)};
}
const json=x=>JSON.parse(JSON.stringify(x));
function equal(a,b){assert.deepEqual(json(a.s.run),json(b.s.run));assert.deepEqual(json(a.cfg.chips(a.s,{k:'test'})),json(b.cfg.chips(b.s,{k:'test'})));assert.deepEqual(json(a.cfg.challenges.map(c=>c.check())),json(b.cfg.challenges.map(c=>c.check())));}
test('scientific model, charts, controls, topics and challenge definitions are unchanged',()=>{
 for(const [a,b] of [['// ================================================================ pens:','// ================================================================ the loop'],['const SP=60;','const CFG=']])assert.equal(current.slice(current.indexOf(a),current.indexOf(b)),old.slice(old.indexOf(a),old.indexOf(b)));
 assert.equal(current.slice(0,current.indexOf('// ================================================================ pens:')),old.slice(0,old.indexOf('// ================================================================ pens:')));
 assert.equal(current.slice(current.indexOf('  controls:['),current.indexOf('  papers:')),old.slice(old.indexOf('  controls:['),old.indexOf('  papers:')));
});
test('all sugar values preserve enthalpy, thermostat, ice partition and challenge results across the full run',()=>{
 const a=mount(old),b=mount(current);
 for(let w=0;w<=40;w++){
  for(const m of [a,b]){m.control('w').set(m.s,w);m.control('fresh').onClick()}
  for(let j=0;j<18;j++){a.control('skip').onClick();b.control('skip').onClick();equal(a,b)}
 }
});
test('auger stop/restart, blocked vents and cooling toggles retain exact original trajectories',()=>{
 const a=mount(old),b=mount(current);
 for(const id of ['auger','vents','comp','comp','vents','auger']){
  for(const m of [a,b])m.control(id).set(m.s,!m.control(id).get(m.s));
  for(let j=0;j<5;j++){a.control('skip').onClick();b.control('skip').onClick();equal(a,b)}
 }
 for(const m of [a,b])m.control('fresh').onClick();equal(a,b);
});
test('all topic initialisation, repeated resets, student answers and 60x playback remain equivalent',()=>{
 const a=mount(old),b=mount(current);
 for(let i=0;i<a.cfg.steps.length;i++){
  a.cfg.steps[i].onStep();b.cfg.steps[i].onStep();equal(a,b);
  for(let t=0;t<60;t++){a.cfg.tick(a.s,1/30,a.cfg.steps[i]);b.cfg.tick(b.s,1/30,b.cfg.steps[i])}equal(a,b);
  for(const id of ['reading','ansE','ansW']){for(const m of [a,b])m.control(id).set(m.s,id==='reading'?-2:id==='ansE'?67:328);equal(a,b)}
  for(const m of [a,b]){m.control('fresh').onClick();m.control('fresh').onClick()}equal(a,b);
 }
});
