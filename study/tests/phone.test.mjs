import test from 'node:test';import assert from 'node:assert/strict';
import {current,original,mount,json} from './phone-harness.mjs';
const equal=(a,b)=>assert.deepEqual(a.snapshot(),b.snapshot());
const pair=()=>[mount(original),mount(current)];
const set=(apps,id,v)=>apps.forEach(a=>a.control(id).set(a.s,v));
test('single scientific model, all charts, controls, tick and challenge code remain unchanged',()=>{
 for(const [a,b] of [['const s=','// ---- drawing'],['function drawClose','const steps='],['const CH=','// every number'],['  controls:[','  papers:']]){
  assert.ok(original.includes(a)&&current.includes(a),a);const endOld=original.indexOf(b,original.indexOf(a)),endNew=current.indexOf(b,current.indexOf(a));assert.ok(endOld>0&&endNew>0,b);
  assert.equal(current.slice(current.indexOf(a),endNew),original.slice(original.indexOf(a),endOld));
 }
 const a=mount();assert.equal(a.cfg.steps.length,9);assert.equal(a.cfg.controls.length,15);assert.equal(a.cfg.challenges.length,5);
});
test('charging trajectories and particles match across power, efficiency, resistance, capacity and varying dt',()=>{
 for(const P of [5,20,45])for(const eff of [.6,.85,1])for(const r of [.01,.08,.3])for(const mAh of [2000,3349,5000]){
  const apps=pair();for(const [id,v]of Object.entries({Pchg:P,eff,r,mAh}))set(apps,id,v);
  for(const a of apps){a.topic('ccv');a.restart();a.advance(150,[.01,.03,.05]);}equal(...apps);
  for(const soc of [.49,.5,.8,.999,1]){for(const a of apps){a.s.soc=soc;a.s.playing=true;a.advance(5)}equal(...apps)}
 }
});
test('energy, internal and parallel control bounds retain identical outputs',()=>{
 const apps=pair();for(const k of ['charge','energy','internal','circuit']){
  apps.forEach(a=>a.topic(k));
  for(const [id,values]of Object.entries({mAh:[2000,3349,5000],hours:[2,5,12],Iload:[.2,3,4],r:[.01,.03,.04,.3],Iscreen:[.2,1.2,2],Imodem:[.1,.5,1.5]}))for(const v of values){set(apps,id,v);equal(...apps)}
  apps.forEach(a=>{a.restart();a.advance(900)});equal(...apps);
 }
});
test('all wireless turn counts, frequency and gap bounds use unchanged induction estimates',()=>{
 const apps=pair();apps.forEach(a=>a.topic('wireless'));
 for(let N=5;N<=20;N++)for(const f of [100,140,200])for(const gap of [0,2,8]){set(apps,'N',N);set(apps,'f',f);set(apps,'gap',gap);equal(...apps)}
});
test('25 capacitor combinations, parameter resets, stops and repeated topic/restart transitions match',()=>{
 const apps=pair();for(const C of [100,470,1000,2200,4700])for(const R of [1,10,22,47,100]){
  apps.forEach(a=>a.topic('capacitor'));set(apps,'C',C);set(apps,'R',R);
  apps.forEach(a=>{a.restart();a.advance(60)});equal(...apps);apps.forEach(a=>a.advance(600));equal(...apps);assert.equal(apps[1].s.playing,false);
  set(apps,'C',C);assert.equal(apps[1].s.vcap,0);assert.equal(apps[1].s.tcap,0);
 }
 for(const k of apps[0].cfg.steps.map(s=>s.k).concat(apps[0].cfg.steps.map(s=>s.k).reverse())){apps.forEach(a=>{a.topic(k);a.restart();a.advance(40);a.s.playing=false});equal(...apps)}
});
test('five original challenge wins and failures are preserved',()=>{
 const wins=[{mAh:5000},{mAh:3349,hours:7},{mAh:3349,Pchg:15,eff:1},{Iload:3,r:.03},{C:1000,R:100}];
 wins.forEach((settings,i)=>{const apps=pair();for(const [id,v]of Object.entries(settings))set(apps,id,v);apps.forEach(a=>a.topic('test'));equal(...apps);assert.equal(apps[1].cfg.challenges[i].check(),true)});
 const apps=pair();apps.forEach(a=>a.topic('test'));equal(...apps);
});
test('taper wording and both visual labels follow measured default and altered current limits',()=>{
 const app=mount(),st=app.topic('ccv'),copy=st.lab+st.cap+st.exam+st.trap;
 assert.doesNotMatch(copy,/80\s*%/);assert.match(copy,/49% and 50%/);assert.match(copy,/depends on charger power, efficiency and internal resistance/);
 for(const [soc,phase,expected]of [[.49,'constant current','4.39 A'],[.50,'current tapering','4.38 A'],[.80,'current tapering','1.75 A']]){
  app.s.soc=soc;assert.equal(app.window.phase(),phase);assert.equal(app.window.visual(st).phase,phase);assert.equal(app.cfg.chips().Inow[1],expected);assert.match(app.cfg.drawMain(app.s,st),new RegExp(phase));
 }
 app.s.soc=.5;app.control('Pchg').set(app.s,5);assert.equal(app.window.phase(),'constant current');app.control('r').set(app.s,.3);assert.equal(app.window.phase(),'constant current');app.control('Pchg').set(app.s,45);assert.equal(app.window.phase(),'current tapering');
 assert.match(current,/Wireless spacing is shown at 5×/);
});
