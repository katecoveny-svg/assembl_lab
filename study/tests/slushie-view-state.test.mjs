import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../m/slushie.js',import.meta.url),'utf8');
const kit=readFileSync(new URL('../kit.js',import.meta.url),'utf8');
const json=x=>JSON.parse(JSON.stringify(x));
function browser(){
 const items=new Map();let serial=0;
 return {storage:{getItem:k=>items.get(k)||null,setItem:(k,v)=>items.set(k,v),removeItem:k=>items.delete(k)},items,nonce:()=>`switch-${++serial}`};
}
function mount(url,tab){
 const location=new URL(url),history={replaceState(a,b,url){location.href=url}};
 const window={history,sessionStorage:tab.storage,crypto:{randomUUID:tab.nonce}};
 const ctx=vm.createContext({console,URL,Math,Date,performance:{now:()=>0},setTimeout:()=>0,clearTimeout(){},addEventListener(){},location,document:{currentScript:null,documentElement:{setAttribute(){}},querySelector:()=>null},window});
 vm.runInContext(kit,ctx);ctx.StudyKit=window.StudyKit;let cfg,redraws=0;
 ctx.StudyKit.mount=c=>{cfg=c;const step=c.steps.find(st=>st.k===location.hash.slice(1))||c.steps[0];step.onStep();return{state:c.state,step,redraw(){redraws++}}};
 // Expose only the actual production transfer object to this VM test harness.
 vm.runInContext(source.replace('const API=StudyKit.mount(CFG);','window.transfer=viewTransfer;const API=StudyKit.mount(CFG);'),ctx);
 return {s:cfg.state,cfg,location,window,get redraws(){return redraws},control:id=>cfg.controls.find(c=>c.id===id),switch(){return window.transfer.prepare(cfg.state,Math.max(cfg.state.run.id,cfg.state.ghost?.id||0),location.hash.slice(1))}};
}
test('both renderer directions preserve the exact nondefault frozen, paused experiment and topic after mount defaults',()=>{
 const tab=browser();let app=mount('http://localhost/study/m/slushie.html?review#sugar',tab);
 app.control('w').set(app.s,0);
 for(let n=0;n<4;n++)app.control('skip').onClick();
 app.control('fresh').onClick(); // retain previous run as comparison evidence
 for(let n=0;n<4;n++)app.control('skip').onClick();
 app.s.playing=false;app.s.reading=-2;app.s.ansE=67;app.s.ansW=328;
 app.control('auger').set(app.s,false);app.control('vents').set(app.s,true);
 assert.ok(app.s.run.mi>0);assert.ok(app.s.run.t>0);assert.ok(app.s.ghost);
 for(const lite of [true,false]){
  const before=json(app.s),target=app.switch();assert.equal(new URL(target).searchParams.has('lite'),lite);
  app=mount(target,tab);
  assert.deepEqual(json(app.s),before);assert.equal(app.redraws,1);
  assert.equal(app.location.hash,'#sugar');assert.equal(app.location.searchParams.has('review'),true);
  assert.equal(app.location.searchParams.has('slushie-view'),false);assert.equal(tab.items.size,0);
 }
 const oldId=app.s.run.id;app.control('fresh').onClick();assert.ok(app.s.run.id>oldId);assert.equal(app.s.run.w,0);assert.equal(app.s.run.t,0);
});
test('playing state survives either direction, snapshot is single use, and ordinary topic changes still initialise',()=>{
 const tab=browser();let app=mount('http://localhost/study/m/slushie.html#energy',tab);
 app.s.playing=true;app.control('skip').onClick();
 for(let n=0;n<2;n++){const before=json(app.s),target=app.switch();app=mount(target,tab);assert.deepEqual(json(app.s),before);const replay=mount(target,tab);assert.equal(replay.redraws,0);assert.equal(replay.s.run.t,0)}
 app.cfg.steps.find(st=>st.k==='sugar').onStep();assert.equal(app.s.w,20);assert.equal(app.s.run.t,0);
});
test('unavailable storage cannot produce a navigation target, and corrupted or mismatched transfers are not restored',()=>{
 const tab=browser(),app=mount('http://localhost/study/m/slushie.html#sugar',tab),before=json(app.s);
 tab.storage.setItem=()=>{throw Error('storage blocked')};assert.throws(()=>app.switch(),/storage blocked/);assert.deepEqual(json(app.s),before);
 const next=browser(),sourceApp=mount('http://localhost/study/m/slushie.html#sugar',next);
 const wrongTopic=sourceApp.switch().replace('#sugar','#energy');assert.equal(mount(wrongTopic,next).redraws,0);assert.equal(next.items.size,0);
 const broken=sourceApp.switch();next.items.set([...next.items.keys()][0],'{broken');assert.equal(mount(broken,next).redraws,0);assert.equal(next.items.size,0);
});
