import {phasePose} from './phase-pose.js';
export {phasePose};
export const KEY='assembl-heart-session-v1';
export const STEPS=['explore','predict','investigate','explain'];
export const TOPICS=['circulation','valves','output'];
export const LIMITS={heartRate:[40,180],strokeVolume:[20,140]};
const bounded=(n,range,fallback)=>Number.isFinite(n)?Math.max(range[0],Math.min(range[1],n)):fallback;
export const defaults=()=>({version:1,heartRate:75,strokeVolume:70,phase:.25,playing:false,step:'explore',topic:'circulation',mode:'3d',view:'whole',arrows:true,cutaway:true,structure:'',prediction:'',reflection:'',A:null,B:null});
// Forward stroke volume is mL leaving one ventricle per beat. Two pumps in series:
// do not add left and right output. Values are independent illustrative inputs.
export function cardiacOutput(heartRate,strokeVolume){
 if(!Number.isFinite(heartRate)||!Number.isFinite(strokeVolume)||heartRate<0||strokeVolume<0)throw new RangeError('Use finite non-negative bpm and mL/beat');
 return heartRate*strokeVolume/1000;
}
export function snapshot(s){return Object.freeze({heartRate:s.heartRate,strokeVolume:s.strokeVolume,output:cardiacOutput(s.heartRate,s.strokeVolume),phase:s.phase,topic:s.topic,prediction:s.prediction});}
function restoreCapture(c){if(!c||typeof c!=='object')return null;
 if(!Object.entries(LIMITS).every(([k,[a,b]])=>Number.isFinite(c[k])&&c[k]>=a&&c[k]<=b))return null;
 return snapshot({...c,phase:Number.isFinite(c.phase)?phasePose(c.phase).phase:.25,topic:TOPICS.includes(c.topic)?c.topic:'circulation',prediction:typeof c.prediction==='string'?c.prediction.slice(0,2000):''});
}
export function restore(raw){let v;try{v=typeof raw==='string'?JSON.parse(raw):raw}catch{return defaults()}
 if(!v||v.version!==1)return defaults();const s=defaults();
 for(const k of Object.keys(LIMITS))s[k]=bounded(v[k],LIMITS[k],s[k]);
 if(Number.isFinite(v.phase))s.phase=phasePose(v.phase).phase;
 for(const [k,list]of Object.entries({step:STEPS,topic:TOPICS,mode:['3d','diagram'],view:['whole','outflow']}))if(list.includes(v[k]))s[k]=v[k];
 for(const k of ['arrows','cutaway'])if(typeof v[k]==='boolean')s[k]=v[k];
 for(const k of ['prediction','reflection','structure'])if(typeof v[k]==='string')s[k]=v[k].slice(0,k==='structure'?100:2000);
 s.A=restoreCapture(v.A);s.B=restoreCapture(v.B);return s;
}
export const serialize=s=>JSON.stringify({...s,playing:false});
export const canAnimate=(s,{reducedMotion=false,hidden=false,disposed=false}={})=>s.playing&&!reducedMotion&&!hidden&&!disposed;
export function reduce(s,a){
 if(a.type==='reset')return defaults();
 if(a.type==='advance')return s.playing&&Number.isFinite(a.seconds)&&a.seconds>=0?{...s,phase:phasePose(s.phase+Math.min(a.seconds,.1)*s.heartRate/60).phase}:s;
 if(a.type==='capture'&&['A','B'].includes(a.slot))return s[a.slot]?s:{...s,[a.slot]:snapshot(s)};
 if(a.type==='clear'&&['A','B'].includes(a.slot))return {...s,[a.slot]:null};
 if(a.type==='set'){
  const {key,value}=a;
  if(key in LIMITS)return {...s,[key]:bounded(value,LIMITS[key],s[key])};
  if(key==='phase'&&Number.isFinite(value))return {...s,phase:phasePose(value).phase,playing:false};
  if(['playing','arrows','cutaway'].includes(key)&&typeof value==='boolean')return {...s,[key]:value};
  const choices={step:STEPS,topic:TOPICS,mode:['3d','diagram'],view:['whole','outflow']};
  if(choices[key]?.includes(value))return {...s,[key]:value};
  if(['prediction','reflection','structure'].includes(key)&&typeof value==='string')return {...s,[key]:value.slice(0,key==='structure'?100:2000)};
 }
 return s;
}
export function readSession(storage){try{return restore(storage.getItem(KEY))}catch{return defaults()}}
export function saveSession(storage,s){try{storage.setItem(KEY,serialize(s));return true}catch{return false}}
