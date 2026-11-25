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
let exploring=false;
let intervals=[],lastPaint=0;let world,p=0,paused=reduced.matches,visible=true,time=0,prev=0,id=0,gustAt=-10,manual=null,scrolled=window.scrollY,trace=false,lx=.5,ly=.49,dirty=true;
function event(name,value){window.dispatchEvent(new CustomEvent('assembl:interaction',{detail:{name,value}}))}
function bounds(){const r=journey.getBoundingClientRect();return {top:r.top+scrollY,range:Math.max(1,r.height-$('.pinned').offsetHeight)}}
function sync(){if(!exploring&&!paused&&manual===null){const b=bounds();const f=Math.max(0,Math.min(1,(scrollY-b.top)/b.range));const u=f<.5?f*2:(f-.5)*2;const eased=u*u*(3-2*u);p=settings.has('match')?f:(f<.5?eased*.5:.5+eased*.5)}document.querySelectorAll('[data-shot]').forEach(b=>b.setAttribute('aria-pressed',String(Math.abs(p-Number(b.dataset.shot))<=.25)));dirty=true;wake()}
function frame(now){id=0;if(!world||!visible||document.hidden)return;const delta=Math.min(.1,Math.max(0,(now-prev)/1000));const active=!paused||time-gustAt<3.6;
 if(dirty||(active&&now-prev>=(1000/30-.6))){if(active)time+=delta;prev=now;world.draw(p,time,Math.max(0,1-(time-gustAt)/3.6));if(settings.has('profile')){if(lastPaint&&now-lastPaint<250)intervals.push(now-lastPaint);if(intervals.length>500)intervals.shift();lastPaint=now}dirty=false;vista.dataset.position=p.toFixed(3)}
 if(active)id=requestAnimationFrame(frame)}
function wake(){if(!id)id=requestAnimationFrame(frame)}
function jump(t){free.leave(false);manual=t;p=t;if(!paused&&!reduced.matches){const b=bounds();let u=t<.5?t*2:(t-.5)*2;const inv=.5-Math.sin(Math.asin(1-2*u)/3);const coordinate=settings.has('match')?t:(t<.5?inv*.5:.5+inv*.5);window.scrollTo(0,b.top+coordinate*b.range+(t===1&&!settings.has('match')?Math.min(95,innerHeight*.09):0))}sync();event('pavilion_view',t)}
function traceAt(x,y){lx=Math.min(1,Math.max(0,x));ly=Math.min(1,Math.max(0,y));vista.style.setProperty('--mx',(lx*100)+'%');vista.style.setProperty('--my',(ly*100)+'%')}
vista.addEventListener('pointermove',e=>{if(trace){const b=vista.getBoundingClientRect();traceAt((e.clientX-b.x)/b.width,(e.clientY-b.y)/b.height)}});
vista.addEventListener('pointerdown',e=>{if(trace){const b=vista.getBoundingClientRect();traceAt((e.clientX-b.x)/b.width,(e.clientY-b.y)/b.height)}});
vista.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;if(trace){e.preventDefault();traceAt(lx+(e.key==='ArrowRight'?.06:e.key==='ArrowLeft'?-.06:0),ly+(e.key==='ArrowDown'?.06:e.key==='ArrowUp'?-.06:0))}else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();jump(Math.min(1,Math.max(0,p+(e.key==='ArrowLeft'?-.25:.25))))}});
document.querySelectorAll('[data-shot]').forEach(b=>b.onclick=()=>jump(Number(b.dataset.shot)));
$('#trace').onclick=()=>{trace=!trace;$('.tracing').hidden=!trace;$('#trace').setAttribute('aria-pressed',String(trace));if(trace)vista.focus({preventScroll:true});event('pavilion_grid',trace)};
function motionLabel(){$('#pause').setAttribute('aria-pressed',String(paused));$('#pause').textContent=paused?'Resume motion':'Pause motion'}
$('#pause').onclick=()=>{paused=!paused;motionLabel();dirty=true;wake()};
$('#gust').onclick=()=>{gustAt=time;dirty=true;wake();event('pavilion_gust',true)};
function staticMode(reason){free.lost();enter.hidden=true;note.textContent='Still view';$('#gpu').replaceChildren();world=null;journey.classList.add('still');vista.dataset.renderer='still';vista.dataset.reason=reason;$('.scene-controls').hidden=true}
new IntersectionObserver(([e])=>{visible=e.isIntersecting;if(visible){dirty=true;wake()}},{rootMargin:'45px'}).observe(vista);
window.addEventListener('scroll',()=>{if(Math.abs(scrollY-scrolled)>1){manual=null;scrolled=scrollY}sync()},{passive:true});
new ResizeObserver(()=>{world?.size();sync()}).observe(vista);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){dirty=true;wake()}});
reduced.addEventListener('change',()=>{paused=reduced.matches;motionLabel();dirty=true;wake()});
document.addEventListener('click',e=>{let a=e.target.closest('a');if(a?.closest('#lab'))event(a.target==='_blank'?'demo_launch':'brief_selected',a.href);if(a?.href.startsWith('mailto:'))event('contact_open',a.hash||'email')});
async function start(){if(settings.get('renderer')==='still'){staticMode('requested');return}
 const {openPavilion}=await import('./world.js');let force=settings.get('renderer')==='webgl';try{world=await openPavilion($('#gpu'),asset,force)}catch(e){if(force)throw e;world=await openPavilion($('#gpu'),asset,true)}
 world.size();world.draw(p,0,0);
 const canvas=world.renderer.domElement;canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();staticMode('context lost')},{once:true});
 world.renderer.backend.device?.lost.then(()=>{if(world)staticMode('device lost')});
 document.documentElement.classList.remove('no-js');vista.dataset.renderer=world.backend;$('#backend').textContent=world.backend;$('.scene-controls').hidden=false;enter.hidden=true;note.textContent='';motionLabel();free.ready();sync();requestAnimationFrame(()=>requestAnimationFrame(()=>world?.refine().then(()=>{dirty=true;wake()})));
 window.pavilionStatus=()=>({exploring,backend:world.backend,draw:world.renderer.info.render,position:p,paused,visible,triangles:Math.round(world.triangleCount),pose:world.pose(),intervals});
}

const free=installExplore(vista,{
 available:()=>!!world,paused:()=>paused,
 togglePause(){paused=!paused;motionLabel();dirty=true;wake()},
 lock(value){exploring=value;if(value&&trace){trace=false;$('.tracing').hidden=true;$('#trace').setAttribute('aria-pressed','false')}},
 setCamera(view){world?.setExplore(view)},repaint(){dirty=true;wake()}
});
const enter=$('#enter-pavilion'),note=$('#load-note');let attempted=false;
function loadWorld(){
 if(attempted)return;
 attempted=true;enter.disabled=true;note.textContent='Loading the pavilion…';
 // Reserve the scroll sequence while the visitor is at the scene, so visiting the Lab never moves it.
 document.documentElement.classList.remove('no-js');
 requestAnimationFrame(()=>start().catch(()=>staticMode('renderer unavailable')));
}
enter.hidden=false;enter.addEventListener('click',loadWorld);
function approach(){
 if(attempted||reduced.matches||navigator.connection?.saveData||!matchMedia('(min-width:681px) and (pointer:fine)').matches)return;
 const r=vista.getBoundingClientRect();
 if(scrollY>35&&r.top<=96&&r.top> -80&&r.bottom>innerHeight/2)loadWorld();
}
addEventListener('scroll',approach,{passive:true});
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
