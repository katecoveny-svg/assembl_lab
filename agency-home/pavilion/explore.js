// The camera belongs to the native page until the visitor explicitly enters Explore.
export function installExplore(vista,options) {
 const entry=document.getElementById('free-enter'),bar=document.getElementById('free-bar');
 const exit=bar.querySelector('[data-exit]'),reset=bar.querySelector('[data-reset]'),pause=bar.querySelector('[data-wind]');
 const pointers=new Map();
 // Outside full Explore, one horizontal drag looks around. Vertical gestures remain native.
 let glance=null,glanceYaw=0,glancePitch=0;
 function releaseGlance(){
  glance=null;glanceYaw=0;glancePitch=0;
  if(!active){options.setCamera(null);options.repaint()}
 }
 let active=false,anchorY=0,yaw=0,pitch=0,travel=0;
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 function turn(to){return options.inside()?Math.atan2(Math.sin(to),Math.cos(to)):clamp(to,-.68,.68)}
 function takeStep(f,r){options.step(f,r);options.repaint()}
 for(const b of bar.querySelectorAll('[data-step]'))b.onclick=()=>takeStep(Number(b.dataset.step),0);
 function update(){options.setCamera(active?{yaw,pitch,travel}:null);options.repaint()}
 function resetView(){glance=null;glanceYaw=glancePitch=0;options.resetWalk();yaw=0;pitch=0;travel=0;update()}
 function windLabel(){pause.textContent=options.paused()?'Resume wind':'Pause wind';pause.setAttribute('aria-pressed',String(options.paused()))}
 function leave(focus=true){
  if(!active)return;active=false;pointers.clear();vista.classList.remove('free-camera');bar.hidden=true;entry.hidden=false;entry.setAttribute('aria-expanded','false');options.lock(false);resetView();
  if(focus)entry.focus({preventScroll:true})
 }
 entry.onclick=()=>{
  if(!options.available())return;
  options.lock(true);active=true;anchorY=scrollY;entry.hidden=true;bar.hidden=false;entry.setAttribute('aria-expanded','true');vista.classList.add('free-camera');bar.querySelector("[data-walk]").hidden=!options.inside();windLabel();resetView();vista.focus({preventScroll:true})
 };
 exit.onclick=()=>leave();reset.onclick=resetView;
 pause.onclick=()=>{options.togglePause();windLabel()};
 const separation=()=>{const [a,b]=pointers.values();return Math.hypot(a.x-b.x,a.y-b.y)};
 const surface=document.getElementById('gpu');
 surface.addEventListener('pointerdown',e=>{
  if(e.button!==0||pointers.size>=2||!options.available())return;
  if(!active){
   if(!e.isPrimary){releaseGlance();return}
   glance={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:glanceYaw,pitch:glancePitch,armed:false};
   return;
  }
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});surface.setPointerCapture(e.pointerId);
  vista.focus({preventScroll:true})
 });
 surface.addEventListener('pointermove',e=>{
  if(!active&&glance?.id===e.pointerId){
   const dx=e.clientX-glance.x,dy=e.clientY-glance.y;
   if(!glance.armed){
    if(Math.abs(dy)>Math.abs(dx)+4){glance=null;return}
    if(Math.abs(dx)<5)return;
    glance.armed=true;surface.setPointerCapture(e.pointerId);
   }
   glanceYaw=glance.yaw-dx*.006;glancePitch=clamp(glance.pitch+dy*.0018,-.13,.16);
   options.setCamera({yaw:glanceYaw,pitch:glancePitch,travel:0});options.repaint();return;
  }
  const previous=pointers.get(e.pointerId);if(!active||!previous)return;
  const oldSpan=pointers.size===2?separation():0;
  const x=e.clientX,y=e.clientY;pointers.set(e.pointerId,{x,y});
  if(pointers.size===2){const span=separation();if(oldSpan>8&&span>8)travel=clamp(travel+Math.log(span/oldSpan)*.98,-.35,.35)}
  else{yaw=turn(yaw-(x-previous.x)*.0032);pitch=clamp(pitch+(y-previous.y)*.0019,-.18,.22)}
  update()
 });
 for(const type of ['pointerup','pointercancel','lostpointercapture'])surface.addEventListener(type,e=>{pointers.delete(e.pointerId);if(glance?.id===e.pointerId)glance=null});
 surface.addEventListener('wheel',e=>{
  if(!active)return;e.preventDefault();const unit=e.deltaMode===1?16:e.deltaMode===2?vista.clientHeight:1;travel=clamp(travel-e.deltaY*unit*.00055,-.35,.35);update()
 },{passive:false});
 vista.addEventListener('keydown',e=>{
  if(!active&&document.documentElement.classList.contains('agency-landing')&&e.target===vista&&options.available()&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
   glanceYaw+=e.key==='ArrowLeft'?.14:e.key==='ArrowRight'?-.14:0;
   glancePitch=clamp(glancePitch+(e.key==='ArrowUp'?.05:e.key==='ArrowDown'?-.05:0),-.3,.3);
   options.setCamera({yaw:glanceYaw,pitch:glancePitch,travel:0});options.repaint();e.preventDefault();return;
  }
  if(!active)return;
  if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();leave();return}
  if(e.target!==vista||e.metaKey||e.ctrlKey||e.altKey)return;
  switch(e.key){
   case 'w':case 'W':takeStep(1,0);break;case 's':case 'S':takeStep(-1,0);break;case 'a':case 'A':takeStep(0,-1);break;case 'd':case 'D':takeStep(0,1);break;
   case 'ArrowLeft':yaw=turn(yaw-.073);break;
   case 'ArrowRight':yaw=turn(yaw+.073);break;
   case 'ArrowUp':pitch=clamp(pitch+.025,-.18,.22);break;
   case 'ArrowDown':pitch=clamp(pitch-.025,-.18,.22);break;
   case '+':case '=':travel=clamp(travel+.052,-.35,.35);break;
   case '-':travel=clamp(travel-.052,-.35,.35);break;
   case 'Home':case 'r':resetView();break;
   case ' ':options.togglePause();windLabel();break;
   default:return
  }
  e.preventDefault();e.stopImmediatePropagation();update()
 },true);
 vista.addEventListener('focusout',e=>{if(active&&e.relatedTarget&&!vista.contains(e.relatedTarget))leave(false)});
 window.addEventListener('scroll',()=>{if(!active&&(glance||glanceYaw||glancePitch))releaseGlance();if(active&&Math.abs(scrollY-anchorY)>14)leave(false)},{passive:true});
 return {releaseGlance,ready(){entry.hidden=false},lost(){leave(false);entry.hidden=true},isActive:()=>active,leave,windLabel}
}
