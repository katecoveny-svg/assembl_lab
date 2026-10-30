import test from 'node:test';import assert from 'node:assert/strict';
import {current,original,mount,browser,json} from './vinyl-harness.mjs';
const pair=()=>[mount(original),mount(current)],equal=apps=>assert.deepEqual(apps[0].snapshot(),apps[1].snapshot());
const set=(apps,id,v)=>apps.forEach(a=>a.control(id).set(a.s,v));

test('science, nine topics, eight controls, charts, tick and six challenge definitions stay unchanged',()=>{
 for(const [start,end]of [['const V_AIR=','// ---- sound'],['function drawMain','function vinyl3d'],['  controls:[','  papers:']]){
  const oldEnd=original.indexOf(end),newEnd=current.indexOf(end==='function vinyl3d'?'function vinylWorld':end);
  assert.equal(current.slice(current.indexOf(start),newEnd),original.slice(original.indexOf(start),oldEnd));
 }
 const app=mount();assert.equal(app.cfg.steps.length,9);assert.equal(app.cfg.controls.length,8);assert.equal(app.cfg.challenges.length,6);
});

test('rotation, slowed phase, pitch, charts and outputs match the baseline across parameter bounds and all topics',()=>{
 const apps=pair();
 for(const topic of apps[0].cfg.steps.map(st=>st.k))for(const format of ['lp','single'])for(const rpm of ['25','33.333','45','78']){
  apps.forEach(a=>{a.topic(topic);a.s.playing=true});set(apps,'format',format);set(apps,'rpm',rpm);
  for(const [id,values]of Object.entries({f:[55,440,1000,1760],needle:[6,8.8,11.9,14.6],amp:[.1,.6,1],db:[30,70,86,110]}))for(const value of values){set(apps,id,value);apps.forEach(a=>a.advance(3,[.01,.03,.08]));equal(apps)}
 }
});

test('six challenge wins, failures and repeated topic/format changes retain original outcomes',()=>{
 const wins=[{rpm:'45',f:440},{rpm:'33.333',f:1000,needle:8.6},{db:86},{rpm:'45'},{format:'lp',rpm:'33.333',needle:8.2},{format:'lp',rpm:'33.333',needle:11.9}];
 wins.forEach((settings,i)=>{const apps=pair();apps.forEach(a=>a.topic('test'));for(const [id,v]of Object.entries(settings))set(apps,id,v);equal(apps);assert.equal(apps[1].cfg.challenges[i].check(),true,i)});
 const apps=pair();apps.forEach(a=>a.topic('test'));equal(apps);assert.ok(apps[1].cfg.challenges.every(c=>!c.check()));
 for(let cycle=0;cycle<3;cycle++)for(const k of ['formats','groove','pitch','air','loud','test','spin']){apps.forEach(a=>a.topic(k));set(apps,'format','single');set(apps,'needle',14.6);assert.equal(apps[1].s.r,.088);set(apps,'format','lp');equal(apps)}
});

test('both graphics directions preserve paused and running format/radius/frequency/angles/time/topic',()=>{
 for(const playing of [false,true])for(const topic of ['formats','air','test']){
  const tab=browser();let app=mount(current,'http://localhost/study/m/vinyl.html?debug#'+topic,tab);
  for(const [id,v]of Object.entries({format:'single',rpm:'78',f:997,needle:7.3,db:86}))app.control(id).set(app.s,v);
  app.s.playing=true;app.advance(37);app.s.playing=playing;const before=json(app.s);
  for(const lite of [true,false]){app=mount(current,app.switch(),tab);assert.deepEqual(json(app.s),before);assert.equal(app.location.hash,'#'+topic);assert.equal(app.location.searchParams.has('lite'),lite);assert.equal(tab.items.size,0)}
 }
});

test('view transfer rejects invalid/replayed/cross-topic state; blocked storage leaves experiment intact',()=>{
 const tab=browser(),app=mount(current,undefined,tab),target=app.switch();mount(current,target,tab);assert.equal(mount(current,target,tab).redraws,0);
 const wrong=app.switch().replace('#spin','#air');assert.equal(mount(current,wrong,tab).redraws,0);
 const bad=app.switch();tab.items.set([...tab.items.keys()][0],'{bad');assert.equal(mount(current,bad,tab).redraws,0);
 const before=json(app.s);tab.storage.setItem=()=>{throw Error('blocked')};assert.throws(()=>app.switch(),/blocked/);assert.deepEqual(json(app.s),before);
});

test('audio is gesture-only, retains original tone envelope and frequency, replaces overlap and stops on topic/exit',()=>{
 const app=mount(),events=[],osc=[];let contexts=0;
 app.window.AudioContext=class{constructor(){contexts++;this.currentTime=10;this.state='running';this.destination={}}createOscillator(){const o={frequency:{},connect(){return {connect(){}}},start(){events.push('start')},stop(t){events.push(['stop',t])},disconnect(){events.push('disconnect')}};osc.push(o);return o}createGain(){return{gain:{setValueAtTime:(...a)=>events.push(['set',...a]),linearRampToValueAtTime:(...a)=>events.push(['linear',...a]),exponentialRampToValueAtTime:(...a)=>events.push(['exp',...a])},disconnect(){}}}};
 app.advance(100);app.topic('air');assert.equal(contexts,0);
 app.control('rpm').set(app.s,'45');app.control('hear').onClick();assert.equal(contexts,1);assert.ok(Math.abs(osc[0].frequency.value-594)<1e-9);assert.equal(osc[0].type,'triangle');assert.ok(events.some(e=>e[0]==='stop'&&e[1]===10.95));assert.ok(events.some(e=>e[0]==='linear'&&e[1]===.132&&e[2]===10.03));
 app.control('hear').onClick();assert.equal(contexts,1);assert.ok(events.some(e=>e[0]==='stop'&&e[1]===undefined));
 const before=events.length;app.topic('pitch');assert.ok(events.length>before);app.control('hear').onClick();app.listeners.pagehide();assert.deepEqual(events.at(-2),['stop',undefined]);app.control('hear').onClick();osc.at(-1).onended();const count=events.length;app.window.stopSound();assert.equal(events.length,count);
});
