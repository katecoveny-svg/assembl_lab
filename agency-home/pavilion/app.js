import {installExplore} from './explore.js';
import {lab} from './lab.js';
const $=s=>document.querySelector(s);
const asset=name=>'/pavilion/assets/'+name;
const pictures=new IntersectionObserver(entries=>{
 for(const {target,isIntersecting} of entries){
  if(!isIntersecting)continue;
  if(target.dataset.image){
   if(target.dataset.small){target.sizes='100vw';target.srcset=asset(target.dataset.small)+' 780w, '+asset(target.dataset.image)+' 1600w'}
   target.src=asset(target.dataset.image);delete target.dataset.image
  }
  pictures.unobserve(target)
 }
},{rootMargin:'180px'});
for(const img of document.querySelectorAll('[data-image]'))pictures.observe(img);
lab(asset);
const vista=$('#vista'),journey=$('.journey'),settings=new URLSearchParams(location.search),reduced=matchMedia('(prefers-reduced-motion: reduce)');
if(settings.has('match'))document.documentElement.classList.add('match-camera');
let exploring=false,detail=null;
let intervals=[],lastPaint=0;let world,p=0,paused=reduced.matches,visible=true,time=0,prev=0,id=0,gustAt=-10,manual=null,scrolled=window.scrollY,trace=false,lx=.5,ly=.49,dirty=true;
function event(name,value){window.dispatchEvent(new CustomEvent('assembl:interaction',{detail:{name,value}}))}
function bounds(){const r=journey.getBoundingClientRect();return {top:r.top+scrollY,range:Math.max(1,r.height-$('.pinned').offsetHeight)}}
let touring=false,tourTime=0,tourFrom=0,carry=0,carryOrigin=0;
const tourControl=$('#pavilion-tour');
function scrollPosition(){
 const b=bounds(),f=Math.max(0,Math.min(1,(scrollY-b.top)/b.range)),u=f<.5?f*2:(f-.5)*2;
 const eased=u*u*(3-2*u);return settings.has('match')?f:f<.5?eased*.5:.5+eased*.5;
}
function stopTour(){
 if(!touring)return;
 touring=false;carry=p-scrollPosition();carryOrigin=scrollY;manual=p;
 tourControl.hidden=true;
}
function startTour(){
 touring=true;tourTime=0;tourFrom=p;prev=performance.now();tourControl.hidden=false;wake();
}
tourControl.onclick=stopTour;
vista.addEventListener('pointerdown',stopTour,{passive:true,capture:true});
vista.addEventListener('keydown',stopTour,{capture:true});
window.addEventListener('wheel',stopTour,{passive:true});
let furnishedWorld=null;
function furnishInterior(){
 if(!world||p<.61||furnishedWorld===world)return;
 const current=world;furnishedWorld=current;
 current.furnishLivingRoom().then(()=>{if(world===current){dirty=true;wake()}}).catch(()=>{});
}
function sync(){if(!touring&&!exploring&&!paused&&manual===null){p=Math.max(0,Math.min(1,scrollPosition()+carry*Math.max(0,1-Math.abs(scrollY-carryOrigin)/300)))}furnishInterior();document.querySelectorAll('[data-shot]').forEach(b=>b.setAttribute('aria-pressed',String(!detail&&Math.abs(p-Number(b.dataset.shot))<=.25)));dirty=true;wake()}
function frame(now){id=0;if(!world||!visible||document.hidden)return;const delta=Math.min(.1,Math.max(0,(now-prev)/1000));const active=!paused||time-gustAt<3.6;
 if(dirty||(active&&now-prev>=(1000/30-.6))){if(active)time+=delta;
 if(touring&&!paused){
  tourTime+=delta;
  const t=Math.min(1,tourTime/38);
  p=tourFrom+(.56-tourFrom)*(t*t*(3-2*t)*.55+t*.45);
  if(t===1)stopTour();
 }
 prev=now;world.draw(p,time,Math.max(0,1-(time-gustAt)/3.6));if(settings.has('profile')){if(lastPaint&&now-lastPaint<250)intervals.push(now-lastPaint);if(intervals.length>500)intervals.shift();lastPaint=now}dirty=false;vista.dataset.position=p.toFixed(3)}
 if(active)id=requestAnimationFrame(frame)}
function wake(){if(!id)id=requestAnimationFrame(frame)}
function jump(t,view=null){stopTour();carry=0;free.leave(false);free.releaseGlance();detail=view;world?.setDetail(view);document.querySelectorAll("[data-detail]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.detail===view)));manual=t;p=t;if(!paused&&!reduced.matches){const b=bounds();let u=t<.5?t*2:(t-.5)*2;const inv=.5-Math.sin(Math.asin(1-2*u)/3);const coordinate=settings.has('match')?t:(t<.5?inv*.5:.5+inv*.5);window.scrollTo(0,b.top+coordinate*b.range+(t===1&&!settings.has('match')?Math.min(95,innerHeight*.09):0))}sync();event('pavilion_view',view??t)}
function traceAt(x,y){lx=Math.min(1,Math.max(0,x));ly=Math.min(1,Math.max(0,y));vista.style.setProperty('--mx',(lx*100)+'%');vista.style.setProperty('--my',(ly*100)+'%')}
vista.addEventListener('pointermove',e=>{if(trace){const b=vista.getBoundingClientRect();traceAt((e.clientX-b.x)/b.width,(e.clientY-b.y)/b.height)}});
vista.addEventListener('pointerdown',e=>{if(trace){const b=vista.getBoundingClientRect();traceAt((e.clientX-b.x)/b.width,(e.clientY-b.y)/b.height)}});
vista.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;if(trace){e.preventDefault();traceAt(lx+(e.key==='ArrowRight'?.06:e.key==='ArrowLeft'?-.06:0),ly+(e.key==='ArrowDown'?.06:e.key==='ArrowUp'?-.06:0))}else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();jump(Math.min(1,Math.max(0,p+(e.key==='ArrowLeft'?-.25:.25))))}});
document.querySelectorAll('[data-shot]').forEach(b=>b.onclick=()=>jump(Number(b.dataset.shot)));
document.querySelectorAll('[data-detail]').forEach(b=>b.onclick=()=>{jump(['deck','tree'].includes(b.dataset.detail)?.5:1,b.dataset.detail);b.closest('details')?.removeAttribute('open')});
function resumePath(){if(detail&&!exploring){detail=null;world?.setDetail(null);document.querySelectorAll('[data-detail]').forEach(b=>b.setAttribute('aria-pressed','false'));sync()}}
window.addEventListener('wheel',resumePath,{passive:true});window.addEventListener('touchmove',resumePath,{passive:true});
window.addEventListener('keydown',e=>{if(['PageDown','PageUp','End'].includes(e.key))resumePath()});
$('#trace').onclick=()=>{trace=!trace;$('.tracing').hidden=!trace;$('#trace').setAttribute('aria-pressed',String(trace));if(trace)vista.focus({preventScroll:true});event('pavilion_grid',trace)};
function motionLabel(){$('#pause').setAttribute('aria-pressed',String(paused));$('#pause').textContent=paused?'Resume motion':'Pause motion'}
$('#pause').onclick=()=>{stopTour();paused=!paused;motionLabel();dirty=true;wake()};
$('#gust').onclick=()=>{gustAt=time;dirty=true;wake();event('pavilion_gust',true)};
function staticMode(reason){
 stopTour();
 free.lost();world=null;window.pavilionStatus=undefined;
 vista.dataset.renderer='still';delete vista.dataset.ready;
 $('#gpu').replaceChildren();journey.classList.add('still');
 $('.scene-controls').hidden=true;enter.hidden=false;enter.disabled=false;
 note.textContent=reason==='slow'?'Still view · Open 3D when you’re ready.':'Still view · You can try 3D again.';
}
window.addEventListener('scroll',()=>{if(Math.abs(scrollY-scrolled)>1){stopTour();if(!detail)manual=null;scrolled=scrollY}sync()},{passive:true});
new ResizeObserver(()=>{world?.size();sync()}).observe(vista);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){dirty=true;wake()}});
reduced.addEventListener('change',()=>{paused=reduced.matches;if(paused)stopTour();motionLabel();dirty=true;wake()});
document.addEventListener('click',e=>{let a=e.target.closest('a');if(a?.closest('#lab'))event(a.target==='_blank'?'demo_launch':'brief_selected',a.href);if(a?.href.startsWith('mailto:'))event('contact_open',a.hash||'email')});
async function start(signal){
 if(settings.get('renderer')==='still')throw new Error('Still view requested');
 const {openPavilion}=await import('./world.js');signal.throwIfAborted();
 const force=settings.get('renderer')==='webgl';
 let candidate;
 try{candidate=await openPavilion($('#gpu'),asset,force,signal)}catch(error){
  if(force||signal.aborted)throw error;
  candidate=await openPavilion($('#gpu'),asset,true,signal);
 }
 const renderer=candidate.renderer;
 try {
  signal.throwIfAborted();candidate.size();candidate.draw(p,0,0);
  const queue=renderer.backend.device?.queue;
  if(queue){
   let onAbort;
   try{
    await Promise.race([queue.onSubmittedWorkDone(),new Promise((_,reject)=>{
     onAbort=()=>reject(signal.reason);signal.addEventListener('abort',onAbort,{once:true});
    })]);
   }finally{signal.removeEventListener('abort',onAbort)}
  }
  signal.throwIfAborted();
 }catch(error){renderer.dispose();throw error}
 world=candidate;
 const lost=()=>{if(world===candidate)staticMode('context lost')};
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();lost()},{once:true});
 renderer.backend.device?.lost.then(lost);
 vista.dataset.ready='true';vista.dataset.renderer=world.backend;journey.classList.remove('still');
 document.documentElement.classList.remove('no-js');$('#backend').textContent=world.backend;
 $('.scene-controls').hidden=false;enter.hidden=true;note.textContent='';motionLabel();free.ready();sync();
 window.pavilionStatus=()=>({touring,exploring,detail,backend:world.backend,draw:world.renderer.info.render,position:p,paused,visible,triangles:Math.round(world.triangleCount),pose:world.pose(),intervals});
 requestAnimationFrame(()=>{if(world!==candidate)return;
  candidate.refine().then(()=>{if(world===candidate){dirty=true;wake()}}).catch(()=>{});
 });
}

const free=installExplore(vista,{
 available:()=>!!world,paused:()=>paused,
 togglePause(){paused=!paused;motionLabel();dirty=true;wake()},
 lock(value){stopTour();exploring=value;if(value&&trace){trace=false;$('.tracing').hidden=true;$('#trace').setAttribute('aria-pressed','false')}},
 inside:()=>world?.inside(),step:(f,r)=>world?.step(f,r),resetWalk:()=>world?.resetWalk(),setCamera(view){world?.setExplore(view)},repaint(){dirty=true;wake()}
});
const enter=$('#enter-pavilion'),note=$('#load-note'),poster=$('#scene-poster');
let pending=null,automaticTried=false,heroVisible=false,timer=0;
function eligible(){
 const net=navigator.connection;
 return !document.hidden&&heroVisible&&!reduced.matches&&!net?.saveData&&!matchMedia('(prefers-reduced-data: reduce)').matches
  &&!['slow-2g','2g','3g'].includes(net?.effectiveType)&&!(net?.downlink>0&&net.downlink<.7)
  &&!(navigator.deviceMemory>0&&navigator.deviceMemory<4)
  &&!(navigator.hardwareConcurrency>0&&navigator.hardwareConcurrency<4)
  &&!!(navigator.gpu||window.WebGL2RenderingContext)&&settings.get('renderer')!=='still';
}
function loadWorld(automatic=false){
 if(world)return;
 if(pending){
  if(automatic)return;
  if(pending.controller.signal.aborted){pending.retry=true;return}
  pending.automatic=false;clearTimeout(pending.timeout);enter.disabled=true;note.textContent='Opening the pavilion…';return;
 }
 const job={controller:new AbortController(),automatic,retry:false};
 pending=job;automaticTried=true;vista.toggleAttribute('data-warming',automatic);
 if(automatic)job.timeout=setTimeout(()=>{if(job.automatic)job.controller.abort('slow')},10000);
 else {enter.disabled=true;note.textContent='Opening the pavilion…'}
 start(job.controller.signal).then(()=>{if(job.automatic&&eligible()&&!job.interacted)startTour()}).catch(()=>{
  staticMode(job.controller.signal.reason||'renderer unavailable');
 }).finally(()=>{
  clearTimeout(job.timeout);pending=null;vista.removeAttribute('data-warming');
  if(job.retry)loadWorld();
 });
}
// Scroll or a deliberate gesture during first-frame compilation also hands the camera to the visitor.
function claimCamera(){if(pending){pending.interacted=true;vista.removeAttribute('data-warming')}stopTour()}
window.addEventListener('scroll',claimCamera,{passive:true});
window.addEventListener('pointerdown',claimCamera,{passive:true,capture:true});
window.addEventListener('keydown',claimCamera,{capture:true});
enter.hidden=false;enter.onclick=()=>loadWorld();
$('#explore-house').addEventListener('click',()=>loadWorld());
async function consider(){
 if(automaticTried||!eligible())return;
 try {await poster.decode()}catch{return}
 const sample=performance.getEntriesByName(poster.currentSrc).at(-1);
 if(sample?.transferSize>20000&&sample.duration>1600&&sample.transferSize/sample.duration<160)return;
 // Let the loaded poster paint before downloading Three.js or compiling any shaders.
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  if(!automaticTried&&!world&&eligible())loadWorld(true);
 }));
}
function visibilityChange(){
 clearTimeout(timer);
 if(pending?.automatic&&!eligible())pending.controller.abort('poster');
 if(!automaticTried&&eligible())timer=setTimeout(consider,250);
}
new IntersectionObserver(([entry])=>{
 visible=entry.isIntersecting;heroVisible=entry.intersectionRatio>=.15;
 if(visible){dirty=true;wake()}visibilityChange();
},{threshold:[0,.15]}).observe(vista);
document.addEventListener('visibilitychange',visibilityChange);
reduced.addEventListener('change',visibilityChange);
navigator.connection?.addEventListener('change',visibilityChange);
function studioStyles(){
 if(!document.getElementById('studio-styles')){const link=document.createElement('link');link.id='studio-styles';link.rel='stylesheet';link.href='/pavilion/studio.css';document.head.append(link)}
}
$('#studio-details').addEventListener('toggle',()=>{if($('#studio-details').open)studioStyles()});
function showAddressedSection(){
 const id=location.hash.slice(1),target=document.getElementById(id),details=$('#studio-details');
 if(target&&details.contains(target)&&!details.open){details.open=true;requestAnimationFrame(()=>target.scrollIntoView())}
}
showAddressedSection();addEventListener('hashchange',showAddressedSection);
const guideButton=$('#ask-fab');guideButton.hidden=false;let loadingGuide;
async function firstGuideClick(){
 if(loadingGuide)return;
 guideButton.setAttribute('aria-busy','true');
 try{
  studioStyles();loadingGuide=import('/guide.js');await loadingGuide;
  const oldTop=guideButton.getBoundingClientRect().top;
  $('#studio-details').open=true;window.scrollBy(0,guideButton.getBoundingClientRect().top-oldTop);
  guideButton.removeEventListener('click',firstGuideClick);guideButton.click();
 }catch{loadingGuide=null;guideButton.textContent='Retry guide'}
 finally{guideButton.removeAttribute('aria-busy')}
}
guideButton.addEventListener('click',firstGuideClick);
