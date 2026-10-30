import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {createLesson,embedCode} from '../shell.js';
function model(){const ctx={window:{},document:{documentElement:{dataset:{lesson:'climate'}}},StudyKit:{esc:s=>s,fig:{palette:{case:{sky:''},product:{strawberry:''}}}}};vm.createContext(ctx);vm.runInContext(fs.readFileSync(new URL('../../m/climate.js',import.meta.url),'utf8'),ctx);return ctx.window.ClimateMachine;}
function run(type){const m=model();for(let i=0;i<8;i++)m.setTile(i,type);const initial=m.flows();for(let i=0;i<100;i++)m.advance(.01,false);return {temperature:m.state.T,initial,final:m.flows(),state:m.state};}
test('same production model: baseline balanced; conservation and repeatable albedo response',()=>{const m=model();assert.ok(Math.abs(m.flows().N)<1e-10);const dark=run('ocean'),bright=run('ice');assert.equal(JSON.stringify(dark),JSON.stringify(run('ocean')));assert.ok(dark.temperature>bright.temperature);assert.ok(dark.initial.abs>bright.initial.abs);assert.equal(dark.initial.out,bright.initial.out);for(const r of [dark,bright]){assert.ok(Math.abs(r.final.abs+r.final.refl-340)<1e-9);assert.equal(r.state.A,m.state.A);assert.equal(r.state.fb,false);}assert.ok(Math.abs(dark.temperature-17.370661701655685)<1e-9);assert.ok(Math.abs(bright.temperature-2.9240307756514303)<1e-9); console.log('1-year dark/bright °C:',dark.temperature,bright.temperature);});
test('snapshots are independent copies and thermal restart is repeatable',()=>{const m=model();const snap=JSON.parse(JSON.stringify(m.state));m.setTile(0,'forest');m.advance(.01,false);assert.equal(snap.tiles[0],'ice');m.restartThermal();assert.equal(m.state.T,15);assert.equal(m.state.tiles[0],'forest');m.reset();assert.equal(m.state.tiles[0],'ice');});
const shot=(albedo,assisted=false)=>({assisted,inputs:{surfaceAlbedo:albedo}});
test('demonstration cannot satisfy independent work, including sparse B-only evidence',()=>{const l=createLesson([1,2,3]);l.demonstrate();l.snapshots=[shot(.06,true),shot(.7,true)];l.answers.transfer='Fictional learner: darker ground absorbs more.';l.attempt();assert.equal(l.progress.independentlyAttempted,false);l.freshAttempt();l.snapshots[1]=shot(.7);l.answers.transfer='Example';l.attempt();assert.equal(l.progress.independentlyAttempted,false);l.snapshots[0]=shot(.06);l.attempt();assert.equal(l.progress.independentlyAttempted,true);assert.equal(l.progress.watchedDemonstration,true);});
test('back preserves answers; reset and reopened state are fresh',()=>{const l=createLesson([1,2]);l.answers.predict='dark';l.move(1);l.move(-1);assert.equal(l.answers.predict,'dark');l.reset();assert.deepEqual(l.answers,{});assert.equal(l.mode,'explore');assert.equal(createLesson([1]).progress.explored,false);});
test('embed is narrowly scoped and has fallback, no privileged permissions or messages',()=>{const code=embedCode('https://example.test','/study/lessons/climate/','Climate');assert.match(code,/climate\/embed\//);assert.match(code,/title="Climate"/);assert.match(code,/loading="lazy"/);assert.match(code,/Open full experience/);assert.match(code,/camera 'none'/);assert.doesNotMatch(code,/allow-top-navigation|allow-forms|postMessage/);});

test('current submission rejects blank repeated and assisted attempts while preserving history',()=>{
  const l=createLesson([1]);
  l.snapshots=[shot(.06),shot(.7)];l.answers.transfer='Fictional learner explanation';
  assert.equal(l.attempt(),true);
  l.freshAttempt();
  assert.equal(l.attempt(),false);
  assert.equal(l.progress.independentlyAttempted,true);
  l.snapshots=[shot(.06),shot(.7)];l.answers.transfer='Another explanation';
  l.demonstrate();
  assert.equal(l.attempt(),false);
  assert.equal(l.progress.independentlyAttempted,true);
  assert.equal(l.progress.watchedDemonstration,true);
});
