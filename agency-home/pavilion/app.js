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
let room=null,roomMove=null;
let exploring=false,detail=null;
let intervals=[],lastPaint=0;let world,p=0,paused=reduced.matches,visible=true,time=0,prev=0,id=0,gustAt=-10,manual=null,scrolled=window.scrollY,trace=false,lx=.5,ly=.49,dirty=true;
function event(name,value){window.dispatchEvent(new CustomEvent('assembl:interaction',{detail:{name,value}}))}
function bounds(){const r=journey.getBoundingClientRect();return {top:r.top+scrollY,range:Math.max(1,r.height-$('.pinned').offsetHeight)}}
let touring=false,tourTime=0,tourFrom=0,carry=0,carryOrigin=0;
const tourControl=$('#pavilion-tour');
function scrollPosition(at=scrollY){
 const b=bounds(),f=Math.max(0,Math.min(1,(at-b.top)/b.range)),u=f<.5?f*2:(f-.5)*2;
 const eased=u*u*(3-2*u);return settings.has('match')?f:f<.5?eased*.5:.5+eased*.5;
}
function stopTour(){
 if(!touring)return;
 touring=false;carry=p-scrollPosition(scrolled);carryOrigin=scrolled;manual=p;
 tourControl.hidden=true;
}
function startTour(){
 touring=true;tourTime=0;tourFrom=p;prev=performance.now();tourControl.hidden=false;wake();
}
tourControl.onclick=stopTour;
vista.addEventListener('pointerdown',stopTour,{passive:true,capture:true});
vista.addEventListener('keydown',stopTour,{capture:true});
window.addEventListener('wheel',stopTour,{passive:true});
let furnishedWorld=null,landscapedWorld=null;
function furnishExterior(){
 if(!world||!visible||document.hidden||landscapedWorld===world||p>.62&&!garden?.active&&!['deck','tree'].includes(detail))return;
 const current=world;landscapedWorld=current;
 current.refinePlanting().then(()=>{if(world===current){dirty=true;wake()}}).catch(()=>{});
}
function furnishInterior(){
 if(!world||detail||garden?.active||p<.61||furnishedWorld===world)return;
 const current=world;furnishedWorld=current;
 current.furnishLivingRoom().then(()=>{if(world===current){dirty=true;wake()}}).catch(()=>{});
}
function sync(){if(!room&&!garden?.active&&!touring&&!exploring&&!paused&&manual===null){p=Math.max(0,Math.min(1,scrollPosition()+carry*Math.max(0,1-Math.abs(scrollY-carryOrigin)/300)))}furnishInterior();document.querySelectorAll('[data-shot]').forEach(b=>b.setAttribute('aria-pressed',String(!garden?.active&&!detail&&Math.abs(p-Number(b.dataset.shot))<.13)));dirty=true;wake()}
const titleLayer=$('.scene-titles');
function easeBetween(value,low,high){
 const t=Math.min(1,Math.max(0,(value-low)/(high-low)));return t*t*(3-2*t);
}
function liftAt(value){
 if(exploring||garden?.active||detail||(room&&!['roof','outside'].includes(room))||(settings.has('match')&&room!=='roof'))return 0;
 return easeBetween(value,.055,.30)*(1-easeBetween(value,.42,.65));
}
function titleFrame(value,lift){
 const fade=easeBetween(value,.018,.17);
 titleLayer.style.setProperty('--title-alpha',(1-fade).toFixed(3));
 titleLayer.style.setProperty('--title-shift',(-60*fade).toFixed(1)+'px');
 titleLayer.style.setProperty('--line-shift',(44*fade).toFixed(1)+'px');
 titleLayer.style.setProperty('--roof-alpha',easeBetween(lift,.57,.94).toFixed(3));
 titleLayer.style.setProperty('--roof-shift',((1-lift)*28).toFixed(1)+'px');
 vista.toggleAttribute('data-manual-detail',!!detail);
}
function frame(now){id=0;if(!world||!visible||document.hidden)return;const delta=Math.min(.1,Math.max(0,(now-prev)/1000));const active=!paused||time-gustAt<3.6;
 furnishExterior();
 if(dirty||(active&&now-prev>=(1000/30-.6))){if(active)time+=delta;
 if(touring&&!paused){
  tourTime+=delta;
  const t=Math.min(1,tourTime/38);
  p=tourFrom+(.56-tourFrom)*(t*t*(3-2*t)*.55+t*.45);
  if(t===1)stopTour();
 }
 if(roomMove){
   const step=paused?1:Math.min(1,(now-roomMove.since)/1400),blend=step*step*(3-2*step);
   p=roomMove.from+(roomMove.to-roomMove.from)*blend;
   if(step===1)roomMove=null;
 }
 const lift=liftAt(p);prev=now;world.draw(p,time,Math.max(0,1-(time-gustAt)/3.6),lift);titleFrame(p,lift);if(settings.has('profile')){if(lastPaint&&now-lastPaint<250)intervals.push(now-lastPaint);if(intervals.length>500)intervals.shift();lastPaint=now}dirty=false;vista.dataset.position=p.toFixed(3)}
 if(active||roomMove)id=requestAnimationFrame(frame)}
function wake(){if(!id)id=requestAnimationFrame(frame)}
function jump(t,view=null){roomMove=null;finishGarden();setRoom(view==='kitchen'?'kitchen':t===1&&!view?'living':null);stopTour();carry=0;free.leave(false);free.releaseGlance();detail=view;world?.setDetail(view);document.querySelectorAll("[data-detail]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.detail===view)));manual=t;p=t;if(!paused&&!reduced.matches){const b=bounds();let u=t<.5?t*2:(t-.5)*2;const inv=.5-Math.sin(Math.asin(1-2*u)/3);const coordinate=settings.has('match')?t:(t<.5?inv*.5:.5+inv*.5);window.scrollTo(0,b.top+coordinate*b.range+(t===1&&!settings.has('match')?Math.min(95,innerHeight*.09):0))}sync();event('pavilion_view',view??t)}
function traceAt(x,y){lx=Math.min(1,Math.max(0,x));ly=Math.min(1,Math.max(0,y));vista.style.setProperty('--mx',(lx*100)+'%');vista.style.setProperty('--my',(ly*100)+'%')}
vista.addEventListener('pointermove',e=>{if(trace){const b=vista.getBoundingClientRect();traceAt((e.clientX-b.x)/b.width,(e.clientY-b.y)/b.height)}});
vista.addEventListener('pointerdown',e=>{if(trace){const b=vista.getBoundingClientRect();traceAt((e.clientX-b.x)/b.width,(e.clientY-b.y)/b.height)}});
vista.addEventListener('keydown',e=>{if(garden?.active)return;if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;if(trace){e.preventDefault();traceAt(lx+(e.key==='ArrowRight'?.06:e.key==='ArrowLeft'?-.06:0),ly+(e.key==='ArrowDown'?.06:e.key==='ArrowUp'?-.06:0))}else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();jump(Math.min(1,Math.max(0,p+(e.key==='ArrowLeft'?-.25:.25))))}});
document.querySelectorAll('[data-shot]').forEach(b=>b.onclick=()=>jump(Number(b.dataset.shot)));
document.querySelectorAll('[data-detail]').forEach(b=>b.onclick=()=>{jump(['deck','tree'].includes(b.dataset.detail)?.5:1,b.dataset.detail);b.closest('details')?.removeAttribute('open')});
function resumePath(){if(!room&&!garden?.active&&detail&&!exploring){detail=null;world?.setDetail(null);document.querySelectorAll('[data-detail]').forEach(b=>b.setAttribute('aria-pressed','false'));sync()}}
window.addEventListener('wheel',resumePath,{passive:true});window.addEventListener('touchmove',resumePath,{passive:true});
window.addEventListener('keydown',e=>{if(['PageDown','PageUp','End'].includes(e.key))resumePath()});
$('#trace').onclick=()=>{trace=!trace;$('.tracing').hidden=!trace;$('#trace').setAttribute('aria-pressed',String(trace));if(trace)vista.focus({preventScroll:true});event('pavilion_grid',trace)};
function motionLabel(){$('#pause').setAttribute('aria-pressed',String(paused));$('#pause').textContent=paused?'Resume motion':'Pause motion'}
$('#pause').onclick=()=>{stopTour();paused=!paused;motionLabel();dirty=true;wake()};
$('#gust').onclick=()=>{gustAt=time;dirty=true;wake();event('pavilion_gust',true)};
function staticMode(reason){
 finishGarden();garden=null;gardenButton.hidden=true;stopTour();if(roomMove){p=roomMove.to;roomMove=null}
 free.lost();world=null;window.pavilionStatus=undefined;
 titleFrame(0,0);vista.dataset.renderer='still';delete vista.dataset.ready;
 $('#gpu').replaceChildren();journey.classList.add('still');
 $('.scene-controls').hidden=true;enter.hidden=false;enter.disabled=false;
 note.textContent=reason==='slow'?'Still view · Open 3D when you’re ready.':'Still view · You can try 3D again.';
}
window.addEventListener('scroll',()=>{if(Math.abs(scrollY-scrolled)>1){stopTour();if(room==='outside'&&!roomMove)setRoom(null);if(!detail)manual=null;scrolled=scrollY}sync()},{passive:true});
new ResizeObserver(()=>{world?.size();sync()}).observe(vista);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){dirty=true;wake()}});
reduced.addEventListener('change',()=>{paused=reduced.matches;if(paused)stopTour();motionLabel();dirty=true;wake()});
document.addEventListener('click',e=>{let a=e.target.closest('a');if(a?.closest('#lab,#architecture'))event(a.target==='_blank'?'demo_launch':'brief_selected',a.href);if(a?.href.startsWith('mailto:'))event('contact_open',a.hash||'email')});
async function start(signal){
 if(settings.get('renderer')==='still')throw new Error('Still view requested');
 const {openPavilion}=await import('./world.js');signal.throwIfAborted();
 const force=settings.get('renderer')==='webgl';
 let candidate,drawnP,drawnDetail;
 async function firstFrame(webgl){
  const scene=await openPavilion($('#gpu'),asset,webgl,signal);
  try{
   signal.throwIfAborted();drawnP=p;drawnDetail=detail;
   scene.setDetail(detail);scene.size();scene.draw(p,0,0,liftAt(p));
   const queue=scene.renderer.backend.device?.queue;
   if(queue){
    let abort;
    try{await Promise.race([queue.onSubmittedWorkDone(),new Promise((_,reject)=>{
     abort=()=>reject(signal.reason);signal.addEventListener('abort',abort,{once:true});
    })])}finally{signal.removeEventListener('abort',abort)}
   }
   signal.throwIfAborted();return scene;
  }catch(error){scene.renderer.dispose();throw error}
 }
 try{candidate=await firstFrame(force)}catch(error){
  if(force||signal.aborted)throw error;
  candidate=await firstFrame(true);
 }
 const renderer=candidate.renderer;
 world=candidate;if(drawnP!==p||drawnDetail!==detail){world.setDetail(detail);world.draw(p,0,0,liftAt(p))}
 const lost=()=>{if(world===candidate)staticMode('context lost')};
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();lost()},{once:true});
 renderer.backend.device?.lost.then(lost);
 vista.dataset.ready='true';vista.dataset.renderer=world.backend;journey.classList.remove('still');
 document.documentElement.classList.remove('no-js');$('#backend').textContent=world.backend;
 $('.scene-controls').hidden=false;gardenButton.hidden=false;enter.hidden=true;note.textContent='';motionLabel();free.ready();sync();
 window.pavilionStatus=()=>({touring,exploring,detail,roofLift:liftAt(p),garden:garden?{active:garden.active,planted:garden.count()}:null,backend:world.backend,draw:world.renderer.info.render,position:p,paused,visible,triangles:Math.round(world.triangleCount),pose:world.pose(),intervals});
 requestAnimationFrame(()=>{if(world!==candidate)return;
  candidate.refine().then(()=>{if(world===candidate){dirty=true;wake()}}).catch(()=>{});
 });
}

function setRoom(value){room=value;window.pavilionEntry.show(value)}
function chooseRoom(value){
 finishGarden();stopTour();free.leave(false);free.releaseGlance();carry=0;
 if(trace)$('#trace').click();
 const target=value==='roof'?.35:value==='outside'?0:1;
 const move=!!world&&!paused&&!reduced.matches&&(value==='roof'||(value==='outside'&&room==='roof'));
 roomMove=move?{from:p,to:target,since:performance.now()}:null;
 detail=value==='kitchen'?'kitchen':null;if(!move)p=target;manual=target;room=value;
 world?.setDetail(detail);
 document.querySelectorAll('[data-detail]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.detail===detail)));
 sync();event('pavilion_view',value);
 // The room still is immediate. Slow connections keep that view and may explicitly request the live renderer.
 const net=navigator.connection,constrained=net?.saveData||['3g','2g','slow-2g'].includes(net?.effectiveType)||net?.downlink>0&&(net.downlink<.7||net.downlink<2&&net.rtt>=100);
 if(!world&&settings.get('renderer')!=='still'&&(value==='roof'||!constrained&&!reduced.matches))loadWorld();
}
window.addEventListener('pavilion:room',e=>chooseRoom(e.detail));
const gardenButton=$('#garden-enter'),gardenBar=$('#garden-bar');
let garden=null,gardenTicket=0;
function repaintGarden(){dirty=true;wake()}
function planted(count){$('#garden-status').textContent=count===0?'The planting bed is clear.':count+' clumps planted.'}
function finishGarden(focus=false){
 gardenTicket++;gardenButton.disabled=false;if(!garden?.active)return;
 garden.leave();vista.classList.remove('planting');vista.removeAttribute('aria-describedby');
 gardenBar.hidden=true;gardenButton.setAttribute('aria-expanded','false');
 if(focus)gardenButton.focus({preventScroll:true});repaintGarden();
}
gardenButton.onclick=async()=>{
 if(!world||garden?.active)return;
 const ticket=++gardenTicket,current=world;gardenButton.disabled=true;stopTour();
 try{
  const bed=await current.gardenBed();if(ticket!==gardenTicket||world!==current)return;
  garden=bed;free.leave(false);free.releaseGlance();
  if(trace)$('#trace').click();
  garden.activate({surface:$('#gpu'),vista,repaint:repaintGarden,announce:planted,close:()=>finishGarden(true)});
  gardenBar.hidden=false;gardenButton.setAttribute('aria-expanded','true');vista.classList.add('planting');
  vista.setAttribute('aria-describedby','garden-help');vista.focus({preventScroll:true});repaintGarden();
  event('pavilion_garden_open',true);
 }catch{if(ticket===gardenTicket)note.textContent='Garden could not open. Select Garden to retry.'}
 finally{if(ticket===gardenTicket)gardenButton.disabled=false}
};
$('#garden-done').onclick=()=>finishGarden(true);
$('#garden-reset').onclick=()=>{garden?.reset();planted(0);repaintGarden();vista.focus({preventScroll:true})};

const free=installExplore(vista,{
 available:()=>!!world&&!garden?.active,paused:()=>paused,
 togglePause(){paused=!paused;motionLabel();dirty=true;wake()},
 lock(value){stopTour();roomMove=null;exploring=value;if(value&&trace){trace=false;$('.tracing').hidden=true;$('#trace').setAttribute('aria-pressed','false')}},
 inside:()=>world?.inside(),step:(f,r)=>world?.step(f,r),resetWalk:()=>world?.resetWalk(),setCamera(view){world?.setExplore(view)},repaint(){dirty=true;wake()}
});
const enter=$('#enter-pavilion'),note=$('#load-note'),poster=$('#scene-poster');
let pending=null,automaticTried=false,heroVisible=false,timer=0;
function eligible(){
 const net=navigator.connection;
 return !document.hidden&&heroVisible&&!reduced.matches&&!net?.saveData&&!matchMedia('(prefers-reduced-data: reduce)').matches
  &&!['slow-2g','2g','3g'].includes(net?.effectiveType)&&!(net?.downlink>0&&(net.downlink<.7||net.downlink<2&&net.rtt>=100))
  &&!(navigator.deviceMemory>0&&navigator.deviceMemory<4)
  &&!(navigator.hardwareConcurrency>0&&navigator.hardwareConcurrency<4)
  &&!!(navigator.gpu||window.WebGL2RenderingContext)&&settings.get('renderer')!=='still';
}
function expireLoad(job){
 job.controller.abort('slow');if(pending===job&&!world){enter.disabled=false;enter.hidden=false;note.textContent='Still view · Select Explore in 3D to retry.'}
}
function loadWorld(automatic=false){
 if(world)return;
 if(pending){
  if(automatic)return;
  if(pending.controller.signal.aborted){pending.retry=true;return}
  if(pending.automatic){pending.automatic=false;clearTimeout(pending.timeout);const job=pending;job.timeout=setTimeout(()=>expireLoad(job),35000)}enter.disabled=true;note.textContent='Opening the pavilion…';return;
 }
 const job={controller:new AbortController(),automatic,retry:false};
 pending=job;automaticTried=true;vista.toggleAttribute('data-warming',automatic);
 job.timeout=setTimeout(()=>expireLoad(job),automatic?12000:45000);
 if(!automatic){enter.disabled=true;note.textContent='Opening the pavilion…'}
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
if(settings.get('renderer')==='still'){enter.hidden=true;note.textContent='Still views'}
if(vista.dataset.room)chooseRoom(vista.dataset.room);
async function consider(){
 if(automaticTried||!eligible())return;
 try {await poster.decode()}catch{return}
 const sample=performance.getEntriesByName(poster.currentSrc).at(-1);
 if(sample?.transferSize>20000&&sample.duration>1600&&sample.transferSize/sample.duration<160)return;
 // Let the loaded poster paint before downloading Three.js or compiling any shaders.
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  if(!automaticTried&&!world&&!room&&eligible())loadWorld(true);
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
