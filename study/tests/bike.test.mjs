import test from 'node:test';import assert from 'node:assert/strict';
import {current,original,mount,browser,json} from './bike-harness.mjs';
const pair=()=>[mount(original),mount(current)],equal=apps=>assert.deepEqual(apps[0].snapshot(),apps[1].snapshot());
const set=(apps,id,v)=>apps.forEach(a=>a.control(id).set(a.s,v));
const build=(apps,m,w='dh',bars='high')=>apps.forEach(a=>{Object.assign(a.s.b,a.model.STOCK(m),{wheels:w,bars});a.s.k=a.model.MODELS[m].k});
test('all original model, geometry, audio, topics, controls, charts and challenges remain source-identical',()=>{
 assert.equal(current.slice(0,current.indexOf('function bikeWorld(')),original.slice(0,original.indexOf('function bike3d(')));
 for(const [start,end]of [['  controls:[','  truth:'],['      // ---------------- NCEA snow run','function bike3d(S){']]){
  if(start.includes('NCEA')){const old=original.slice(original.indexOf(start),original.indexOf('const api=StudyKit.mount('));const now=current.slice(current.indexOf(start),current.indexOf(end));assert.equal(now,old)}
  else assert.equal(current.slice(current.indexOf(start),current.indexOf(end)),original.slice(original.indexOf(start),original.indexOf(end)));
 }
 const app=mount();assert.equal(app.cfg.steps.length,13);assert.equal(app.cfg.controls.length,18);assert.equal(app.cfg.challenges.length,8);
});
test('all three builds, tyre/bar choices and surfaces retain original stopping, fork, trail and ski outputs',()=>{
 const apps=pair();
 for(const m of ['flow','drop','ridge'])for(const w of ['fast','trail','mud','dh'])for(const bars of ['low','mid','high']){
  build(apps,m,w,bars);
  for(const k of apps[0].cfg.steps.map(st=>st.k)){apps.forEach(a=>{a.topic(k);a.s.playing=true});for(const grip of ['dry','mud','roots']){set(apps,'grip',grip);apps.forEach(a=>a.advance(3,[.01,.025,.04]));equal(apps)}}
 }
});
test('full runs, gap landing, previous-run comparison, restart and bottom-out remain equivalent',()=>{
 for(const model of ['flow','drop','ridge'])for(const limit of [20,45,80]){const apps=pair();build(apps,model);set(apps,'limit',limit);apps.forEach(a=>{a.topic('drop');a.s.playing=true;a.advance(3600)});equal(apps);apps.forEach(a=>{a.topic('graph');a.s.playing=true;a.advance(120)});equal(apps)}
 for(const spring of [10,34,100]){const apps=pair();set(apps,'k',spring);set(apps,'fh',2);apps.forEach(a=>{a.topic('fork');a.s.playing=true;a.advance(600)});equal(apps);apps.forEach(a=>a.control('restart').onClick(a.s,{step:a.cfg.steps.find(s=>s.k==='fork')}));equal(apps)}
});
test('graphics transfer preserves nested state, previous runs, saved build, pause and ski experiment in both directions',()=>{
 for(const topic of ['garage','drop','stop','fork','work','turn','test'])for(const playing of [false,true]){
  const tab=browser();let app=mount(current,'http://localhost/study/m/bike.html?debug#'+topic,tab);Object.assign(app.s.b,{model:'ridge',wheels:'mud',bars:'low',tag:'TEST',plate:'42'});app.s.playing=true;app.advance(20);app.s.playing=playing;app.s.ghost={samples:[{t:2,d:7,v:4}],label:'Saved comparison'};app.s.lastRun={time:23,cleared:true};app.s.ski.mu=.65;const before=json(app.s);
  for(const lite of [true,false]){app=mount(current,app.switch(),tab);assert.deepEqual(json(app.s),before);assert.equal(app.location.hash,'#'+topic);assert.equal(app.location.searchParams.has('lite'),lite);assert.equal(tab.items.size,0)}
 }
});
test('graphics transfer rejects missing, invalid, replayed and wrong-topic state without silent reuse',()=>{
 const tab=browser(),app=mount(current,undefined,tab);const target=app.switch();mount(current,target,tab);assert.equal(mount(current,target,tab).redraws,0);
 const wrong=app.switch().replace('#garage','#fork');assert.equal(mount(current,wrong,tab).redraws,0);
 const bad=app.switch();tab.items.set([...tab.items.keys()][0],'{bad');assert.equal(mount(current,bad,tab).redraws,0);
 const before=json(app.s);tab.storage.setItem=()=>{throw Error('blocked')};assert.throws(()=>app.switch(),/blocked/);assert.deepEqual(json(app.s),before);
});
test('all eight challenges retain successful evidence and feedback from the authoritative model',()=>{
 const fixtures=[
  a=>{Object.assign(a.s.b,a.model.STOCK('flow'));a.s.limit=45;a.topic('drop');a.s.playing=true;a.advance(4000)},
  a=>{a.s.grip='mud';a.s.v0=40;a.s.tr=.3;a.s.b.wheels='dh'},
  a=>{a.s.fh=1.5;for(let k=10;k<=100;k++){a.s.k=k;if(a.cfg.challenges[2].check())break}},
  a=>{a.s.b.wheels='dh'},
  a=>{Object.assign(a.s.b,a.model.STOCK('flow'),{wheels:'mud',bars:'high'});Object.assign(a.s,{m:35,attack:false,limit:45});a.topic('drop');a.s.playing=true;a.advance(4000)},
  a=>{a.s.ski.h=120;a.s.ski.v=40},a=>{Object.assign(a.s.ski,{mu:.5,vt:20,r:85})},a=>{a.s.ski.h=40}
 ];
 fixtures.forEach((configure,i)=>{const apps=pair();apps.forEach(configure);for(const a of apps)assert.equal(a.cfg.challenges[i].check(),true,'challenge '+i);equal(apps)});
});
test('saved build, labels and model stiffness survive ordinary reload without a graphics transfer',()=>{
 const tab=browser(),a=mount(current,undefined,tab);Object.assign(a.s.b,{model:'ridge',wheels:'mud',bars:'low',colour:'teal',guard:true,pod:true,plate:'42',tag:'RIDE'});a.s.k=65;a.model.save();const b=mount(current,undefined,tab);assert.deepEqual(json(b.s.b),json(a.s.b));assert.equal(b.s.k,a.s.k);
});
test('minimum and maximum stopping controls preserve complete outcomes for every build and surface',()=>{
 for(const model of ['flow','drop','ridge'])for(const grip of ['dry','mud','roots'])for(const speed of [10,60])for(const reaction of [.3,2]){
  const apps=pair();build(apps,model);set(apps,'grip',grip);set(apps,'v0',speed);set(apps,'tr',reaction);apps.forEach(a=>{a.topic('stop');a.s.playing=true;a.advance(1800)});equal(apps);assert.equal(apps[1].s.sphase,'stopped');
 }
});
