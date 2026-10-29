import {reduce,readSession,saveSession,cardiacOutput,phasePose,STEPS,KEY,canAnimate} from './model.js';
import {diagram} from './diagram.js';
import {graphicsLifecycle} from './lifecycle.js';
const $=id=>document.getElementById(id);
const activities={explore:['Follow one complete circuit','Start at the body. Follow the lower-oxygen route through the right heart to the lungs, then the higher-oxygen route through the left heart back to the body.'],predict:['Make a prediction','What happens to forward output if heart rate increases while forward stroke volume stays fixed? Write your reason before you test it.'],investigate:['Change one thing','Capture A. Keep one input fixed, change the other, then capture B. Try a second comparison after clearing the cards.'],explain:['Explain with evidence','Use the values in A and B to explain the change in L/min. Compare your result with your prediction. Name one thing this model cannot tell you.']};
const topics={circulation:'Body → venae cavae → right atrium → tricuspid → right ventricle → pulmonary valve → pulmonary arteries → lungs → pulmonary veins → left atrium → mitral → left ventricle → aortic valve → aorta → body.',valves:'Pause in filling, all-closed contraction, ejection and all-closed relaxation. Which group can be open together? Use “Reveal aortic outlet” to see the posterior aortic valve in 3D.',output:'Forward output = heart rate × forward stroke volume ÷ 1,000, in L/min. Change one input at a time to distinguish its effect. Wall movement is illustrative and does not measure stroke volume.'};
const structures={Labels_RA:'Right atrium: receives lower-oxygen blood from the body via the venae cavae.',Labels_RV:'Right ventricle: sends blood through the pulmonary valve and arteries to the lungs.',Labels_LA:'Left atrium: receives higher-oxygen blood from the lungs via four pulmonary veins. Brought forward in this teaching section.',Labels_LV:'Left ventricle: sends blood through the aortic valve and aorta to the body. Its muscular wall is thicker.',Labels_Tricuspid:'Tricuspid: three leaflets, between right atrium and right ventricle. Opens during filling.',Labels_Mitral:'Mitral: two leaflets, between left atrium and left ventricle. Opens during filling.',Labels_PulmonaryValve:'Pulmonary valve: three leaflets at the right ventricular outlet. Opens during ejection.',Labels_AorticValve:'Aortic valve: three leaflets between the left ventricular outflow and aorta. Use the outlet reveal to see its posterior position.',Labels_Aorta:'Aorta: carries higher-oxygen blood from the left ventricle toward the body.',Labels_PulmonaryVeins:'Pulmonary veins: bring higher-oxygen blood from the lungs into the left atrium.',Labels_Pulmonary:'Pulmonary arteries: carry lower-oxygen blood away from the right ventricle toward the lungs.',Labels_VenaeCavae:'Venae cavae: return lower-oxygen blood from the body to the right atrium.',Labels_Septum:'Septum: separates right and left sides. The two pumps work in series, with no direct chamber-to-chamber flow across the septum.'};
function boot(){
 let storage;try{storage=sessionStorage}catch{}let state=readSession(storage),disposed=false,frame=0,last=0,status='loading',scene=null;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),events=new AbortController();
 const listen=(el,event,fn)=>el.addEventListener(event,fn,{signal:events.signal});
 const hashStep=location.hash.slice(1);if(STEPS.includes(hashStep))state=reduce(state,{type:'set',key:'step',value:hashStep});
 const graphics=graphicsLifecycle(async signal=>{const {createScene}=await import('./scene.js');if(signal.aborted)throw new DOMException('Cancelled','AbortError');return createScene($('three'),signal,()=>graphics.fail(Error('Graphics context lost')))},(next,instance)=>{if(disposed)return;status=next;scene=instance;render()});
 function save(){const ok=saveSession(storage,state);if(!ok)$('privacy').textContent='Storage is unavailable. Your work stays in memory while this page remains open and is never sent anywhere. Reloading or leaving may lose it.'}
 function dispatch(a,{persist=true,animate=false}={}){state=reduce(state,a);render(animate);if(persist)save();clock()}
 function set(key,value){dispatch({type:'set',key,value})}
 const permitted=()=>canAnimate(state,{reducedMotion:reduced.matches,hidden:document.hidden,disposed});
 function clock(){if(permitted()&&!frame){last=0;frame=requestAnimationFrame(tick)}else if(!permitted()&&frame){cancelAnimationFrame(frame);frame=0;last=0}}
 function tick(t){frame=0;if(!permitted())return;if(last)state=reduce(state,{type:'advance',seconds:(t-last)/1000});last=t;render(true);frame=requestAnimationFrame(tick)}
 function render(animate=false){
  const p=phasePose(state.phase);$('phase').value=Math.round(state.phase*1000);$('phase-value').textContent=`${Math.round(state.phase*100)}%`;$('phase-name').textContent=p.phaseName;$('phase').setAttribute('aria-valuetext',`${Math.round(state.phase*100)} percent: ${p.phaseName}`);
  $('valve-status').textContent=`AV valves ${p.av>.05?'opening / open':'closed'} · semilunar valves ${p.semilunar>.05?'opening / open':'closed'}`;
  graphics.update(state);if(status!=='ready')$('diagram').innerHTML=diagram(state);
  if(animate)return;
  $('three').hidden=status!=='ready';$('diagram').hidden=status==='ready';
  $('graphics-status').textContent=({loading:'Loading 3D. Keep investigating with the functional simplified diagram.',error:'3D is unavailable. The simplified diagram uses the same settings, phase and calculation. Your work is kept; retry when ready.',diagram:'Simplified diagram · functional circulation circuit, not anatomical shape.',ready:state.view==='outflow'?'Aortic outlet reveal · atria, right heart and lower-oxygen vessels hidden; retained structures keep their positions. Pulmonary veins remain in the batched vessel mesh.':'Detailed 3D teaching section · drag to orbit. Keyboard alternatives: front view, outlet reveal and structure descriptions.'})[status];
  $('retry').hidden=status!=='error';$('front').disabled=status!=='ready';$('view').disabled=status!=='ready';$('cutaway').disabled=status!=='ready'||state.view==='outflow';
  for(const k of ['heartRate','strokeVolume','topic','mode','structure'])$(k).value=state[k];
  $('heartRate').setAttribute('aria-valuetext',`${state.heartRate} beats per minute`);$('strokeVolume').setAttribute('aria-valuetext',`${state.strokeVolume} millilitres per beat`);
  $('heartRate-value').textContent=`${state.heartRate} bpm`;$('strokeVolume-value').textContent=`${state.strokeVolume} mL/beat`;
  $('output').innerHTML=`${cardiacOutput(state.heartRate,state.strokeVolume).toFixed(2)} <small>L/min</small>`;$('equation').textContent=`${state.heartRate} bpm × ${state.strokeVolume} mL/beat ÷ 1,000`;
  for(const [id,text]of [['cutaway','Cutaway'],['arrows','Route arrows']]){$(id).textContent=`${text} ${state[id]?'on':'off'}`;$(id).setAttribute('aria-pressed',state[id])}
  $('arrows').disabled=status==='ready'&&state.view==='outflow';if($('arrows').disabled)$('arrows').textContent='Route arrows hidden';
  $('view').textContent=state.view==='outflow'?'Show whole heart':'Reveal aortic outlet';$('play').textContent=state.playing?'Pause cycle':'Play cycle';$('play').disabled=reduced.matches;
  $('motion-note').textContent=reduced.matches?'Reduced motion is on: use the phase slider or presets. Continuous play is disabled.':'Starts paused. Playback follows heart rate; phase proportions are fixed teaching approximations.';
  $('structure-note').textContent=structures[state.structure]||'Choose a name to trace its role. Text and arrows accompany the oxygenation colours.';
  const index=STEPS.indexOf(state.step);for(const b of document.querySelectorAll('[data-step]')){if(b.dataset.step===state.step)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current')}
  $('step-count').textContent=`${index+1} / 4 — ${state.step}`;[$('activity-title').textContent,$('activity-copy').textContent]=activities[state.step];$('topic-note').textContent=topics[state.topic];
  $('prediction-panel').hidden=!['predict','investigate','explain'].includes(state.step);$('reflection-panel').hidden=state.step!=='explain';
  for(const k of ['prediction','reflection'])if($(k).value!==state[k])$(k).value=state[k];
  $('previous').disabled=index===0;$('next').disabled=index===3;
  for(const slot of ['A','B']){const c=state[slot];$('capture-'+slot).textContent=c?`${c.heartRate} bpm × ${c.strokeVolume} mL/beat\n${c.output.toFixed(2)} L/min\n${phasePose(c.phase).phaseName} · ${c.topic}\nPrediction: ${c.prediction||'No prediction recorded.'}`:'Not captured yet.';document.querySelector(`[data-capture="${slot}"]`).disabled=!!c;document.querySelector(`[data-clear="${slot}"]`).hidden=!c}
  if(state.A&&state.B){const d=state.B.output-state.A.output;let controls=state.A.heartRate!==state.B.heartRate&&state.A.strokeVolume!==state.B.strokeVolume?'Both inputs changed. This comparison cannot isolate one input’s effect.':state.A.heartRate===state.B.heartRate&&state.A.strokeVolume===state.B.strokeVolume?'Both inputs stayed the same. Change one to investigate an effect.':'One input changed; the other stayed fixed.';$('comparison').textContent=`B − A = ${d>=0?'+':''}${d.toFixed(2)} L/min. ${controls}`}else $('comparison').textContent='Capture both settings to compare their forward output.';
 }
 function navigate(step,push=true){if(!STEPS.includes(step))return;set('step',step);if(push&&location.hash!==`#${step}`)history.pushState(null,'',`#${step}`)}
 for(const b of document.querySelectorAll('[data-step]'))listen(b,'click',()=>navigate(b.dataset.step));
 listen($('previous'),'click',()=>navigate(STEPS[STEPS.indexOf(state.step)-1]));listen($('next'),'click',()=>navigate(STEPS[STEPS.indexOf(state.step)+1]));
 listen(window,'popstate',()=>navigate(STEPS.includes(location.hash.slice(1))?location.hash.slice(1):'explore',false));
 for(const k of ['heartRate','strokeVolume'])listen($(k),'input',()=>set(k,+$(k).value));
 listen($('phase'),'input',()=>set('phase',+$('phase').value/1000));
 for(const b of document.querySelectorAll('[data-phase]'))listen(b,'click',()=>set('phase',+b.dataset.phase));
 listen($('play'),'click',()=>{if(!reduced.matches)set('playing',!state.playing)});
 listen($('topic'),'change',()=>set('topic',$('topic').value));listen($('structure'),'change',()=>set('structure',$('structure').value));
 listen($('mode'),'change',()=>{set('mode',$('mode').value);graphics.choose(state.mode)});
 listen($('retry'),'click',()=>graphics.choose(state.mode));
 listen($('cutaway'),'click',()=>{if(status==='ready')set('cutaway',!state.cutaway)});listen($('arrows'),'click',()=>set('arrows',!state.arrows));
 listen($('view'),'click',()=>{if(status==='ready')set('view',state.view==='whole'?'outflow':'whole')});listen($('front'),'click',()=>scene?.front());
 for(const k of ['prediction','reflection'])listen($(k),'input',()=>set(k,$(k).value));
 for(const b of document.querySelectorAll('[data-capture]'))listen(b,'click',()=>{dispatch({type:'capture',slot:b.dataset.capture});$('notice').textContent=`${b.dataset.capture} saved. Its values will stay fixed until cleared.`});
 for(const b of document.querySelectorAll('[data-clear]'))listen(b,'click',()=>{dispatch({type:'clear',slot:b.dataset.clear});$('notice').textContent=`${b.dataset.clear} cleared. You can capture a new setting.`});
 listen($('reset'),'click',()=>{$('reset-confirm').hidden=false;$('reset-yes').focus()});listen($('reset-no'),'click',()=>{$('reset-confirm').hidden=true;$('reset').focus()});
 listen($('reset-yes'),'click',()=>{try{storage?.removeItem(KEY)}catch{}dispatch({type:'reset'},{persist:false});history.replaceState(null,'','#explore');$('reset-confirm').hidden=true;$('notice').textContent='This lab’s saved work was cleared. Starting settings restored.';graphics.choose(state.mode);$('reset').focus()});
 listen(reduced,'change',()=>{if(reduced.matches)set('playing',false);render()});listen(document,'visibilitychange',()=>{if(document.hidden)set('playing',false);clock()});
 render();save();graphics.choose(state.mode);
 return ()=>{if(disposed)return;state=reduce(state,{type:'set',key:'playing',value:false});save();disposed=true;cancelAnimationFrame(frame);events.abort();graphics.dispose()};
}
let dispose=boot();window.addEventListener('pagehide',()=>dispose());window.addEventListener('pageshow',e=>{if(e.persisted)dispose=boot()});
