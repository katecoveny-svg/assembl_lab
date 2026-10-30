import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
export const current=readFileSync(new URL('../m/bike.js',import.meta.url),'utf8');
export const original=execFileSync('git',['show','6bbf37d:study/m/bike.js'],{encoding:'utf8'});
const kit=readFileSync(new URL('../kit.js',import.meta.url),'utf8');
export const json=x=>JSON.parse(JSON.stringify(x));
export function browser(){const items=new Map(),local=new Map();let serial=0;return {items,local,storage:{getItem:k=>items.get(k)||null,setItem:(k,v)=>items.set(k,v),removeItem:k=>items.delete(k)},nonce:()=>`bike-switch-${++serial}`}}
export function mount(source=current,url='http://localhost/study/m/bike.html#garage',tab=browser()){
 let seed=12345;const math=Object.create(Math);math.random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
 const listeners={},location=new URL(url),window={addEventListener:(k,fn)=>{listeners[k]=fn},history:{replaceState(a,b,url){location.href=url}},sessionStorage:tab.storage,crypto:{randomUUID:tab.nonce}};
 const ctx=vm.createContext({console,URL,Math:math,Date,matchMedia:()=>({matches:false}),performance:{now:()=>0},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:()=>0,addEventListener(){},localStorage:{getItem:k=>tab.local.get(k)||null,setItem:(k,v)=>tab.local.set(k,v)},location,document:{currentScript:null,documentElement:{setAttribute(){}},querySelector:()=>null,getElementById:()=>null,addEventListener:(k,fn)=>{listeners[k]=fn}},window});
 vm.runInContext(kit,ctx);ctx.StudyKit=window.StudyKit;let cfg,step,redraws=0;
 ctx.StudyKit.mount=c=>{cfg=c;step=c.steps.find(st=>st.k===location.hash.slice(1))||c.steps[0];c.state.playing??=true;c.onStep?.(c.state,step);step.onStep?.();if(step.k==='test')c.state.playing=false;return{state:c.state,get step(){return step},redraw(){redraws++}}};
 source=source.replace('const api=StudyKit.mount(',"window.model={geoPts,riderPts,MODELS,BARS,WHEELS,STOCK,stopNums,forkNums,resetRun,resetStop,resetFork,resetSki,SK,save};window.transfer=typeof viewTransfer==='undefined'?null:viewTransfer;const api=StudyKit.mount(");
 vm.runInContext(source,ctx);
 return {s:cfg.state,cfg,location,window,tab,get redraws(){return redraws},ctx,listeners,model:window.model,control:id=>cfg.controls.find(c=>c.id===id),topic(k){step=cfg.steps.find(st=>st.k===k);cfg.onStep?.(cfg.state,step);step.onStep?.();if(k==='test')cfg.state.playing=false;return step},advance(n,dt=1/60){for(let i=0;i<n&&cfg.state.playing&&step.speed;i++)cfg.tick(cfg.state,Array.isArray(dt)?dt[i%dt.length]:dt,step)},switch(){return window.transfer.prepare(cfg.state,step.k)},snapshot(){return json({s:cfg.state,chips:cfg.chips(cfg.state,step),checks:cfg.challenges.map(c=>[c.check(),c.check()?c.ok():c.no()]),chart:cfg.drawClose(cfg.state,step)})}};
}
