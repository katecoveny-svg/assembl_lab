import test from 'node:test';import assert from 'node:assert/strict';
import {current,mount,browser,json} from './phone-harness.mjs';
test('both graphics directions preserve nondefault charging/capacitor values, particles, time, pause and topic',()=>{
 for(const topic of ['ccv','capacitor']){
  const tab=browser();let app=mount(current,'http://localhost/study/m/phone.html?debug#'+topic,tab);
  for(const [id,v] of Object.entries({Pchg:35,eff:.7,r:.12,C:4700,R:47}))app.control(id).set(app.s,v);
  app.restart();app.advance(90);app.s.playing=false;const before=json(app.s);
  for(const lite of [true,false]){app=mount(current,app.switch(),tab);assert.deepEqual(json(app.s),before);assert.equal(app.location.hash,'#'+topic);assert.equal(app.location.searchParams.has('lite'),lite);assert.equal(app.location.searchParams.has('debug'),true);assert.equal(app.redraws,1);assert.equal(tab.items.size,0)}
  app.restart();assert.equal(app.s.playing,true);assert.equal(topic==='ccv'?app.s.tchg:app.s.tcap,0);
 }
});
test('running state is retained, snapshot is consumed once, bad/cross-topic data does not restore',()=>{
 const tab=browser();let app=mount(current,'http://localhost/study/m/phone.html#ccv',tab);app.restart();app.advance(20);
 const before=json(app.s),target=app.switch();app=mount(current,target,tab);assert.deepEqual(json(app.s),before);assert.equal(mount(current,target,tab).redraws,0);
 const wrong=app.switch().replace('#ccv','#capacitor');assert.equal(mount(current,wrong,tab).redraws,0);assert.equal(tab.items.size,0);
 const broken=app.switch();tab.items.set([...tab.items.keys()][0],'{bad');assert.equal(mount(current,broken,tab).redraws,0);
});
test('storage failure gives no navigation URL and cannot mutate the current experiment',()=>{
 const tab=browser(),app=mount(current,'http://localhost/study/m/phone.html#ccv',tab);app.restart();app.advance(20);const before=json(app.s);tab.storage.setItem=()=>{throw Error('blocked')};assert.throws(()=>app.switch(),/blocked/);assert.deepEqual(json(app.s),before);
});
