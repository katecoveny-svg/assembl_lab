import {tourSeconds,tourKeys} from './tour-score.js?v=9741e33a49';

function tourTravel(t){
 const position=t*(tourKeys.length-1),i=Math.floor(position);
 const a=tourKeys[i][0],b=tourKeys[Math.min(i+1,tourKeys.length-1)][0];
 return (a+(b-a)*(position-i))/10000;
}
function cameraDining(progress){
 const target=progress*10000;
 let low=0,high=tourKeys.length-1;
 while(high-low>1){const middle=(low+high)>>1;if(tourKeys[middle][0]<=target)low=middle;else high=middle}
 const [x,a]=tourKeys[low],[y,b]=tourKeys[high];
 return (a+(b-a)*Math.max(0,Math.min(1,(target-x)/Math.max(1,y-x))))/10000;
}
import {walkInput} from './house-walk.js?v=ee2f6128a2';
import {installExplore} from './explore.js?v=832259faaa';
import {lab} from './lab.js?v=86bf7f87fc';
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
const cinema=document.documentElement.classList.contains('agency-landing'),filmMotion=$('#film-motion');
let syncMedium=()=>{},handover=()=>{};
let requestedRoom=null,stillRoom=null;
const roofButton=$('#inspect-roof');
let roofRequested=false,roofPhase=0;
const roofAmount=()=>roofPhase*roofPhase*(3-2*roofPhase);
let room=null,roomMove=null,preferWebGL=false;
let exploring=false,detail=null;
let intervals=[],lastPaint=0;let world,p=0,paused=reduced.matches,visible=true,time=0,prev=0,id=0,gustAt=-10,manual=null,scrolled=window.scrollY,trace=false,lx=.5,ly=.49,dirty=true;
function event(name,value){window.dispatchEvent(new CustomEvent('assembl:interaction',{detail:{name,value}}))}
function bounds(){const r=journey.getBoundingClientRect();return {top:r.top+scrollY,range:Math.max(1,r.height-$('.pinned').offsetHeight)}}
let arrival=null;
let touring=false,tourTime=0,tourFrom=0,carry=0,carryOrigin=0;
const tourControl=$('#pavilion-tour');
function scrollPosition(at=scrollY){
 const b=bounds();return Math.max(0,Math.min(1,(at-b.top)/b.range));
}
function stopTour(){
 if(!touring)return;
 touring=false;carry=p-scrollPosition(scrolled);carryOrigin=scrolled;manual=p;
 tourControl.hidden=true;if(cinema)syncMedium();
}
function startTour(){
 touring=true;tourTime=0;tourFrom=p;prev=performance.now();tourControl.hidden=cinema;if(cinema)syncMedium();wake();
}
tourControl.onclick=stopTour;
vista.addEventListener('pointerdown',stopTour,{passive:true,capture:true});
vista.addEventListener('keydown',stopTour,{capture:true});
window.addEventListener('wheel',stopTour,{passive:true});
let finishesWorld=null,furnishedWorld=null,landscapedWorld=null;
function furnishExterior(){
 if(!world||!visible||document.hidden||landscapedWorld===world||p>.62&&!garden?.active&&!['deck','tree'].includes(detail))return;
 const current=world;landscapedWorld=current;
 current.refinePlanting().then(()=>{if(world===current){dirty=true;wake()}}).catch(()=>{});
}
function furnishInterior(){
 if(world&&finishesWorld!==world&&(p>.18||detail||room&&room!=='outside')){
  const current=world;finishesWorld=current;
  current.refineFinishes().then(()=>{if(world===current){dirty=true;wake()}}).catch(()=>{});
 }

 if(!world||detail||garden?.active||p<.61||furnishedWorld===world)return;
 const current=world;furnishedWorld=current;
 current.furnishLivingRoom().then(()=>{if(world===current){dirty=true;wake()}}).catch(()=>{});
}
function sync(){if(!cinema&&!room&&!garden?.active&&!touring&&!exploring&&!paused&&manual===null){p=Math.max(0,Math.min(1,scrollPosition()+carry*Math.max(0,1-Math.abs(scrollY-carryOrigin)/300)))}furnishInterior();document.querySelectorAll('[data-shot]').forEach(b=>b.setAttribute('aria-pressed',String(!garden?.active&&!detail&&Math.abs(p-Number(b.dataset.shot))<.13)));dirty=true;wake()}
const titleLayer=$('.scene-titles'),chapterText=$('#journey-chapter');
function easeBetween(value,low,high){
 const t=Math.min(1,Math.max(0,(value-low)/(high-low)));return t*t*(3-2*t);
}
function liftAt(value){
 if(exploring||garden?.active||detail||(room&&!['roof','outside'].includes(room))||(settings.has('match')&&room!=='roof'))return 0;
 return easeBetween(value,.055,.30)*(1-easeBetween(value,.42,.65));
}
function titleFrame(value,lift){
 const chapter=detail==='kitchen'||room==='kitchen'?'Kitchen':room==='living'?'Living room':room==='roof'?'Roof lift':value<.14?'Approach':value<.48?'Roof lift':value<.67?'Threshold':value<.84?'Living room':'Kitchen';
 if(chapterText.textContent!==chapter)chapterText.textContent=chapter;
 const fade=easeBetween(value,.018,.17);
 titleLayer.style.setProperty('--title-alpha',(1-fade).toFixed(3));
 titleLayer.style.setProperty('--title-shift',(-60*fade).toFixed(1)+'px');
 titleLayer.style.setProperty('--line-shift',(44*fade).toFixed(1)+'px');
 titleLayer.style.setProperty('--roof-alpha',easeBetween(lift,.57,.94).toFixed(3));
 titleLayer.style.setProperty('--roof-shift',((1-lift)*28).toFixed(1)+'px');
 vista.toggleAttribute('data-manual-detail',!!detail);
}
// Cold and no-GPU entries keep moving through the same photographed model viewpoints on scroll.
const still=document.querySelector('#journey-still');
let queuedShot='',stillRequest=0;
journey.dataset.scrollStills='';
function scrollStill(){if(cinema)return;
 if(world||room||reduced.matches){still.hidden=true;queuedShot='';stillRequest++;return}
 const value=scrollPosition();
 const which=value<.18?'':value<.52?'roof':value<.86?'living':'kitchen';
 titleFrame(value,liftAt(value));
 if(queuedShot===which)return;
 queuedShot=which;const ticket=++stillRequest;
 if(!which){still.hidden=true;return}
 const image=new Image();
 image.src=asset('room-'+which+(matchMedia('(max-width:680px)').matches?'-phone':'')+'.webp');
 image.decode().then(()=>{
  if(ticket!==stillRequest||world||room||reduced.matches)return;
  still.src=image.src;still.hidden=false;
 }).catch(()=>{});
}
addEventListener('scroll',scrollStill,{passive:true});reduced.addEventListener('change',scrollStill);
function frame(now){id=0;if(!world||!visible||document.hidden)return;const delta=Math.min(.1,Math.max(0,(now-prev)/1000));const active=!paused||time-gustAt<3.6;
 furnishExterior();
 if(dirty||roofPhase!==Number(roofRequested)||(active&&now-prev>=(1000/30-.6))){if(active)time+=delta;
 const roofTarget=Number(roofRequested);
 roofPhase=reduced.matches?roofTarget:roofPhase+Math.sign(roofTarget-roofPhase)*Math.min(Math.abs(roofTarget-roofPhase),delta/.98);
 if(arrival!==null&&roofPhase===0){
  arrival=paused?1:Math.min(1,arrival+delta/10.5);
  p=arrival*.76;
  if(arrival===1){arrival=null;walking.enter(false);syncMedium()}
 }
 if(touring&&!paused){
  tourTime+=delta;
  const t=Math.min(1,tourTime/(cinema?tourSeconds:27));
  // Give the visitor half the walk inside, after crossing the open slider.
  const phase=cinema?tourTravel(t):t*t*(3-2*t)*.55+t*.45;
  p=tourFrom+(1-tourFrom)*phase;
  if(t===1)stopTour();
 }
 if(roomMove){
   const step=paused?1:Math.min(1,(now-roomMove.since)/1400),blend=step*step*(3-2*step);
   p=roomMove.from+(roomMove.to-roomMove.from)*blend;
   if(step===1)roomMove=null;
 }
 furnishInterior();
 const guided=!room&&!detail&&!exploring&&!garden?.active&&!settings.has('match');
 const lift=cinema?0:liftAt(p);if(cinema)journey.toggleAttribute('data-walking',p>.21);prev=now;
 try{world.draw(p,time,Math.max(0,1-(time-gustAt)/3.6),lift,guided,cinema&&guided?cameraDining(p):0,arrival===null?null:arrival+(.5-Math.cos(arrival*Math.PI)*.5-arrival)*.60,roofAmount())}
 catch{staticMode('render failed');return}
 if(cinema)syncLens();titleFrame(p,lift);if(settings.has('profile')){if(lastPaint&&now-lastPaint<250)intervals.push(now-lastPaint);if(intervals.length>500)intervals.shift();lastPaint=now}dirty=false;vista.dataset.position=p.toFixed(3)}
 if(active||roomMove||arrival!==null||roofPhase!==Number(roofRequested))id=requestAnimationFrame(frame)}
function wake(){if(!id)id=requestAnimationFrame(frame)}
function jump(t,view=null){roomMove=null;finishGarden();setRoom(view==='kitchen'?'kitchen':t===1&&!view?'living':null);stopTour();carry=0;free.leave(false);free.releaseGlance();detail=view;world?.setDetail(view);document.querySelectorAll("[data-detail]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.detail===view)));manual=t;p=t;if(!paused&&!reduced.matches){const b=bounds();const coordinate=t;window.scrollTo(0,b.top+coordinate*b.range+(t===1&&!settings.has('match')?Math.min(95,innerHeight*.09):0))}sync();event('pavilion_view',view??t)}
function traceAt(x,y){lx=Math.min(1,Math.max(0,x));ly=Math.min(1,Math.max(0,y));vista.style.setProperty('--mx',(lx*100)+'%');vista.style.setProperty('--my',(ly*100)+'%')}
vista.addEventListener('pointermove',e=>{if(trace){const b=vista.getBoundingClientRect();traceAt((e.clientX-b.x)/b.width,(e.clientY-b.y)/b.height)}});
vista.addEventListener('pointerdown',e=>{if(trace){const b=vista.getBoundingClientRect();traceAt((e.clientX-b.x)/b.width,(e.clientY-b.y)/b.height)}});
vista.addEventListener('keydown',e=>{if(garden?.active||cinema)return;if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;if(trace){e.preventDefault();traceAt(lx+(e.key==='ArrowRight'?.06:e.key==='ArrowLeft'?-.06:0),ly+(e.key==='ArrowDown'?.06:e.key==='ArrowUp'?-.06:0))}else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();jump(Math.min(1,Math.max(0,p+(e.key==='ArrowLeft'?-.25:.25))))}});
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
 const last=world?.walker.pose;
 if(last&&last.z<=2.1){
  stillRoom=last.x< -3.84?'bedroom':last.x<.1?'kitchen':'living';
  requestedRoom=stillRoom;
 }
 arrival=null;closeEditor();hideLens();$('.house-tools').hidden=true;if(walkButton){walking.leave();walkButton.hidden=true}
 finishGarden();garden=null;gardenButton.hidden=true;stopTour();if(roomMove){p=roomMove.to;roomMove=null}
 const failed=world;world=null;window.pavilionStatus=undefined;
 if(failed?.backend==='WebGPU')preferWebGL=true;
 free.lost();if(failed){try{failed.renderer.dispose()}catch{}}

 titleFrame(0,0);vista.dataset.renderer='still';delete vista.dataset.ready;
 if(cinema){roofPhase=Number(roofRequested);showRoomStill();syncLens()}syncMedium();
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
 const {openPavilion}=await import('./world.js?v=20fd784ecb');signal.throwIfAborted();
 const force=preferWebGL||settings.get('renderer')==='webgl';
 let candidate,drawnP,drawnDetail;
 async function firstFrame(webgl){
  const scene=await openPavilion($('#gpu'),asset,webgl,signal);
  try{
   signal.throwIfAborted();drawnP=p;drawnDetail=detail;
   scene.setDetail(detail);scene.size();scene.draw(p,0,0,liftAt(p),false,0,cinema?0:null);
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
 world=candidate;delete vista.dataset.roomStill;if(cinema){
  walkButton.hidden=false;$('.house-tools').hidden=false;
  if(requestedRoom){const room=requestedRoom,keepRoof=roofRequested;requestedRoom=null;visitRoom(room,true);if(keepRoof)setRoofInspection(true,true)}else if(reduced.matches){walking.enter(false)}else{arrival=0;walkButton.textContent='Step inside';prev=performance.now()}
  candidate.refineFinishes().then(()=>{if(world===candidate)repaintGarden()}).catch(()=>{});
  candidate.furniture().then(room=>{if(world===candidate)layout=room}).catch(()=>{});
 }handover();if(drawnP!==p||drawnDetail!==detail){world.setDetail(detail);world.draw(p,0,0,liftAt(p))}
 const lost=()=>{if(world===candidate)staticMode('context lost')};
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();lost()},{once:true});
 renderer.backend.device?.lost.then(lost);
 vista.dataset.ready='true';vista.dataset.renderer=world.backend;journey.classList.remove('still');
 document.documentElement.classList.remove('no-js');$('#backend').textContent=world.backend;
 $('.scene-controls').hidden=false;gardenButton.hidden=false;enter.hidden=true;note.textContent='';motionLabel();free.ready();sync();
 window.pavilionStatus=()=>({dog:world.dogPose(),treesReady:world.treesReady(),windTime:time,walking:world.walker.pose,arrival,touring,finishesReady:world.finishesReady(),exploring,detail,roofLift:cinema?roofAmount():liftAt(p),layout:layout?.positions(),garden:garden?{active:garden.active,planted:garden.count()}:null,backend:world.backend,draw:world.renderer.info.render,position:p,paused,visible,triangles:Math.round(world.triangleCount),pose:world.pose(),intervals});
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

let layout=null,editorTicket=0,editorName='';
const editing=()=>Boolean(editorName);
const editor=$('#house-editor'),controls=$('.house-tools'),paint=$('#paint-house'),arrange=$('#arrange-house'),surface=$('#gpu');
function closeEditor(focus=false){
 const previous=editorName;editorTicket++;editorName='';
 if(!previous)return;
 layout?.leave();finishGarden();journey.removeAttribute('data-edit');editor.hidden=true;
 controls.hidden=!world;$('#paint-tools').hidden=$('#arrange-tools').hidden=true;
 if(focus&&cinema&&world)walking.enter(false);
 if(focus)(previous==='garden'?paint:arrange).focus({preventScroll:true});
 repaintGarden();
}
async function openEditor(mode){
 if(!world||editing())return;
 setRoofInspection(false,true);
 const current=world,ticket=++editorTicket;editorName=mode;
 arrival=null;walking.leave();stopTour();free.leave(false);free.releaseGlance();roomMove=null;detail=null;world.setDetail(null);
 controls.hidden=true;editor.hidden=false;journey.dataset.edit=mode;$('#edit-help').textContent='Opening…';
 const report=message=>{$('#edit-status').textContent=message};
 try{
  if(mode==='garden'){
   const bed=await current.gardenBed();if(ticket!==editorTicket||current!==world)return;
   garden=bed;
   garden.activate({surface,vista,repaint:repaintGarden,announce:n=>report(n+' clumps planted'),close:()=>closeEditor(true)});
   garden.brush($('#plant-brush').value);
   $('#paint-tools').hidden=false;$('#edit-help').textContent='Paint across the soil. Arrow keys move the brush, Space plants.';
   vista.focus({preventScroll:true});
  }else{
   const room=await current.furniture();if(ticket!==editorTicket||current!==world)return;
   layout=room;p=.76;manual=p;furnishInterior();
   layout.activate(surface,$('#piece-choice'),repaintGarden,report,()=>closeEditor(true));
   $('#arrange-tools').hidden=false;$('#edit-help').textContent='Drag a piece across the floor, or choose one and use the arrow keys.';
   surface.focus({preventScroll:true});
  }
  repaintGarden();
 }catch{if(ticket===editorTicket){closeEditor(true);$('#pavilion-model-hint').textContent='Could not open the editor. Please try again.'}}
}
paint.onclick=()=>openEditor('garden');arrange.onclick=()=>openEditor('room');
$('#edit-done').onclick=()=>closeEditor(true);
$('#plant-brush').onchange=e=>{garden?.brush(e.target.value);vista.focus({preventScroll:true})};
$('#bed-undo').onclick=()=>{garden?.undo();$('#edit-status').textContent=(garden?.count()??0)+' clumps planted';repaintGarden();vista.focus({preventScroll:true})};
$('#layout-reset').onclick=()=>{layout?.reset();repaintGarden();$('#edit-status').textContent='Original layout restored';surface.focus({preventScroll:true})};
new IntersectionObserver(([entry])=>{if(!entry.isIntersecting&&editing())closeEditor()}).observe(vista);
const walkButton=$('#walk-house');
const walking=walkInput({button:walkButton,surface:$('#gpu'),stage:journey,pad:$('#walk-pad'),
 start(){if(!world||!cinema||editing())return false;arrival=null;stopTour();free.releaseGlance();world.walker.start();p=.76;detail=null;world.setDetail(null);setRoom(null);manual=p;roomMove=null;dirty=true;wake();return true},
 stop(){world?.walker.stop();manual=p=0;dirty=true;wake();queueMicrotask(syncMedium)},
 clickFloor:e=>world?.floorTarget(e),
 advance(dt){if(!world)return false;const more=world.walker.advance(dt);dirty=true;wake();return more},
 cancel:()=>world?.walker.cancel(),
 grab(e){const drag=layout?.grab(e,surface,world?.walker.pose);return drag?event=>{if(drag(event)){dirty=true;wake()}}:null},
 look(dx,dy){world?.walker.look(dx,dy);dirty=true;wake()},
 move(forward,right,dt){world?.walker.move(forward,right,dt);dirty=true;wake()}
});
function showRoomStill(){
 const value=roofRequested?'roof':stillRoom;
 const image=$('#room-poster');
 if(value==='living'||value==='bedroom'){
  // Preserve the actual living-room optics for the daylight comparison, including on a narrow screen.
  const small=matchMedia('(max-width:680px)').matches;
  const file=value==='living'?'room-living-browser.webp':small?'room-bedroom-phone.webp':'room-bedroom.webp';
  vista.dataset.room=value;image.src=asset(file);image.hidden=false;
  image.alt=value==='living'?'Inside the Waiheke living room, facing the linen sofa and leather chair.':'Inside the Waiheke bedroom, looking past the bed to timber joinery.';
 }else{window.pavilionEntry.show(value)}
 if(value)vista.dataset.roomStill=value;else delete vista.dataset.roomStill;
}
function setRoofInspection(value,instant=false){
 if(!roofButton||(!roofRequested&&!value&&roofPhase===0))return;
 roofRequested=value;
 if(instant||!world||reduced.matches)roofPhase=Number(value);
 roofButton.setAttribute('aria-pressed',String(value));roofButton.textContent=value?'Lower roof':'Lift roof';
 journey.toggleAttribute('data-roof-inspect',value);surface.inert=value;
 if(value){world?.walker.cancel();hideLens()}
 if(!world)showRoomStill();
 syncMedium();syncLens();dirty=true;wake();
}
if(roofButton){
 roofButton.onclick=()=>{setRoofInspection(!roofRequested);event('pavilion_roof',roofRequested)};
 journey.addEventListener('keydown',e=>{if(roofRequested&&e.key==='Escape'){e.preventDefault();setRoofInspection(false);roofButton.focus({preventScroll:true})}});
 walkButton.addEventListener('click',()=>{if(roofRequested)setRoofInspection(false,true)},{capture:true});
}
function visitRoom(room,firstLoad=false){
  setRoofInspection(false,true);
  stillRoom=room;
  if(!world){
   requestedRoom=room;showRoomStill();syncMedium();syncLens();
   if(!automaticTried&&settings.get('renderer')!=='still'&&!navigator.connection?.saveData&&!matchMedia('(prefers-reduced-data: reduce)').matches)loadWorld();
   return;
  }
  if(editing())closeEditor();
  walking.enter(false);
  if(world.walker.visit(room,firstLoad||reduced.matches)){walking.travel();dirty=true;wake();}
}
for(const link of document.querySelectorAll('[data-walk-to]')){
  link.addEventListener('click',e=>{
    if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    e.preventDefault();vista.scrollIntoView({block:'center',behavior:'instant'});
    visitRoom(link.dataset.walkTo);
  });
}
const free=installExplore(vista,{
 available:()=>!!world&&arrival===null&&!editing()&&!garden?.active&&!walking.active(),paused:()=>paused,
 togglePause(){paused=!paused;motionLabel();dirty=true;wake()},
 lock(value){stopTour();roomMove=null;exploring=value;if(value&&trace){trace=false;$('.tracing').hidden=true;$('#trace').setAttribute('aria-pressed','false')}},
 inside:()=>world?.inside(),step:(f,r)=>world?.step(f,r),resetWalk:()=>world?.resetWalk(),setCamera(view){world?.setExplore(view)},repaint(){dirty=true;wake()}
});
const enter=$('#enter-pavilion'),note=$('#load-note'),poster=$('#scene-poster');
let pending=null,automaticTried=false,heroVisible=false,timer=0;
function eligible(){
 const net=navigator.connection;
 if(cinema)return heroVisible&&!document.hidden&&!net?.saveData&&!matchMedia('(prefers-reduced-data: reduce)').matches&&settings.get('renderer')!=='still'&&!!(navigator.gpu||window.WebGL2RenderingContext);
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
 job.timeout=setTimeout(()=>expireLoad(job),automatic?(cinema?90000:12000):45000);
 if(!automatic){enter.disabled=true;note.textContent='Opening the pavilion…'}
 start(job.controller.signal).then(()=>{if(!cinema&&job.automatic&&eligible()&&!job.interacted&&!reduced.matches)startTour()}).catch(()=>{
  staticMode(job.controller.signal.reason||'renderer unavailable');
 }).finally(()=>{
  clearTimeout(job.timeout);pending=null;vista.removeAttribute('data-warming');
  if(job.retry)loadWorld();
 });
}
// Scroll or a deliberate gesture during first-frame compilation also hands the camera to the visitor.
function claimCamera(e){if(cinema&&filmMotion.contains(e.target instanceof Node?e.target:null))return;if(pending){pending.interacted=true;vista.removeAttribute('data-warming')}stopTour()}
window.addEventListener('scroll',claimCamera,{passive:true});
window.addEventListener('pointerdown',claimCamera,{passive:true,capture:true});
window.addEventListener('keydown',claimCamera,{capture:true});
enter.hidden=false;enter.onclick=()=>loadWorld();
if(settings.get('renderer')==='still'){enter.hidden=true;note.textContent='Still views'}
if(vista.dataset.room)chooseRoom(vista.dataset.room);
async function consider(){
 if(automaticTried||!eligible())return;
 if(cinema){loadWorld(true);return}
 try {await poster.decode()}catch{return}
 const sample=performance.getEntriesByName(poster.currentSrc).at(-1);
 if(sample?.transferSize>20000&&sample.duration>1600&&sample.transferSize/sample.duration<160)return;
 // Let the loaded poster paint before downloading Three.js or compiling any shaders.
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  if(!automaticTried&&!world&&!room&&eligible()&&(!cinema||!paused))loadWorld(true);
 }));
}
function visibilityChange(){
 clearTimeout(timer);
 if(pending?.automatic&&!eligible())pending.controller.abort('poster');
 if(!automaticTried&&eligible())timer=setTimeout(consider,cinema?0:250);
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

if(cinema){
 const hint=$('#pavilion-model-hint');
 vista.setAttribute('aria-label','Waiheke Pavilion model. Drag or use the arrow keys to look around.');
 function status(){
  const supported = settings.get('renderer') !== 'still' && !!(navigator.gpu || window.WebGL2RenderingContext);
  const conserve = navigator.connection?.saveData || matchMedia('(prefers-reduced-data: reduce)').matches;
  const loading = supported && (!!pending || (!automaticTried && !conserve));
  filmMotion.hidden = !!world || !supported || loading;
  filmMotion.disabled=!!pending&&!world;
  filmMotion.textContent=conserve&&!automaticTried?'Load interactive model':'Retry 3D';
  controls.hidden=editing()||(!world&&!roofButton);
  paint.hidden=arrange.hidden=!world;
  const roomNames={living:'Living room',kitchen:'Kitchen',bedroom:'Bedroom'};
  hint.textContent=roofRequested?(world?'Roof lifted':'Roof lifted · Still view'):!world&&stillRoom?roomNames[stillRoom]+' · Still view':world?(arrival!==null?'Entering the house…':walking.active()?'Walk through the house':'Exterior view'):loading?'Loading the house…':'Still view';
 }
 syncMedium=status;
 handover=status;
 filmMotion.onclick=()=>{
  if(!world){loadWorld();status();return}
 };
 const refresh=new MutationObserver(status);
 refresh.observe(vista,{attributes:true,attributeFilter:['data-ready','data-warming']});
 status();
}

// Register the offline light-transport pass to the live camera. Movement always releases the lens.
const lens=$('#room-lens'),lensButton=$('#daylight-lens'),lensImage=lens.querySelector('img');
let lensPinned=false,lensHovered=false,registered=false,lensX=.5,lensY=.55,lensWidth=0,lensHeight=0;
function hideLens(){
 registered=false;lensPinned=false;lensHovered=false;lensButton.hidden=true;lensButton.setAttribute('aria-pressed','false');
 lens.removeAttribute('data-on');lens.removeAttribute('data-pinned');
}
function syncLens(){
 const pose=world?.walker.pose;
 const stillLiving=!world&&vista.dataset.roomStill==='living';
 const aligned=stillLiving||pose&&Math.abs(pose.x-1.32)<.002&&Math.abs(pose.z-1.53)<.002&&Math.abs(pose.yaw+.95)<.0005&&Math.abs(pose.pitch+.21)<.0005
  &&!Object.values(layout?.positions()||{}).some(([x,z])=>Math.abs(x)+Math.abs(z)>.002);
 if(!aligned||roofRequested||roofPhase>0){if(registered)hideLens();return}
 const w=surface.clientWidth,h=surface.clientHeight;
 if(!w||!h)return;
 // Both images use the same optical centre. On a wide stage use only the part the source camera saw.
 const verticalFov=stillLiving||w<h?77:59;
 const scaledHeight=stillLiving?Math.max(h,w/1.75):h*Math.tan(77*Math.PI/360)/Math.tan(verticalFov*Math.PI/360);
 if(registered&&w===lensWidth&&h===lensHeight&&parseFloat(lens.style.getPropertyValue('--gate'))===scaledHeight)return;
 registered=true;lensWidth=w;lensHeight=h;lensButton.hidden=false;
 vista.style.setProperty('--base-gate',scaledHeight+'px');
 lens.style.setProperty('--gate',scaledHeight+'px');
 if(!lensImage.hasAttribute('src'))lensImage.src='/pavilion/assets/living-daylight.webp';
 if(lensPinned)moveLens(lensX,lensY);
}
function moveLens(x,y){
 const gateH=parseFloat(lens.style.getPropertyValue('--gate'))||lensHeight;
 const radius=Math.min(176,Math.max(65,innerWidth*.1));
 const margin=gateH*1.75+1>=lensWidth?0:Math.min(.5,((lensWidth-gateH*1.75)/2+radius)/lensWidth);
 lensX=Math.min(1-margin,Math.max(margin,x));lensY=Math.min(1,Math.max(0,y));
 lens.style.setProperty('--x',lensX*100+'%');lens.style.setProperty('--y',lensY*100+'%');
 lens.style.setProperty('--image-x',(50+(lensX-.5)*100*lensWidth/(gateH*1.75))+'%');
 lens.style.setProperty('--image-y',(50+(lensY-.5)*100*lensHeight/gateH)+'%');
 lens.toggleAttribute('data-on',registered&&lensImage.complete&&lensImage.naturalWidth>0);
}
function pointLens(e){
 const r=vista.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
 const gateWidth=parseFloat(lens.style.getPropertyValue('--gate'))*1.75;
 if(!lensPinned&&Math.abs(x-.5)*r.width>gateWidth/2){lensHovered=false;lens.removeAttribute('data-on');return}
 lensHovered=true;moveLens(x,y);
}
vista.addEventListener('pointermove',e=>{if(registered&&(lensPinned||e.pointerType==='mouse'&&!e.buttons))pointLens(e)});
vista.addEventListener('pointerleave',()=>{lensHovered=false;if(!lensPinned)lens.removeAttribute('data-on')});
surface.addEventListener('pointerdown',()=>{lens.removeAttribute('data-on')},{capture:true});
lensButton.onclick=()=>{
 lensPinned=!lensPinned;lensButton.setAttribute('aria-pressed',String(lensPinned));lens.toggleAttribute('data-pinned',lensPinned);
 if(lensPinned)moveLens(.5,.57);else lens.removeAttribute('data-on');
};
lens.addEventListener('pointerdown',pointLens);
lensButton.addEventListener('keydown',e=>{
 if(!lensPinned)return;
 const d={ArrowLeft:[-.08,0],ArrowRight:[.08,0],ArrowUp:[0,-.08],ArrowDown:[0,.08]}[e.key];
 if(d){e.preventDefault();moveLens(lensX+d[0],lensY+d[1])}if(e.key==='Escape')lensButton.click();
});
lensImage.addEventListener('load',()=>{if(lensPinned||lensHovered)moveLens(lensX,lensY)});

new ResizeObserver(()=>{if(!world&&stillRoom)showRoomStill();syncLens()}).observe(vista);

// A project link should open the roof view it names. Keep the running scene and
// the visitor's renderer preference when they arrive from the homepage index.
const roofLink=document.querySelector('[data-open-roof]');
if(cinema && roofLink){
 roofLink.addEventListener('click',event=>{
  if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  event.preventDefault();
  const target=new URL(location.href);
  target.searchParams.set('view','pavilion');target.searchParams.set('roof','lift');target.hash='pavilion';
  if(target.href!==location.href)history.pushState(history.state,'',target);
  setRoofInspection(true);
  document.getElementById('pavilion').scrollIntoView({behavior:'instant'});
  roofButton.focus({preventScroll:true});
 });
 if(settings.get('roof')==='lift')setRoofInspection(true);
}
