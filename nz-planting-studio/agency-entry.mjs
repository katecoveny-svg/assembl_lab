import {duration, gardenView, journeyPose, reachable, roomView} from './garden-walk.mjs?v=1';

const studio=window.__nzStudio;
const parentOrigin=document.referrer ? new URL(document.referrer).origin : location.origin;
const send=(type,extra={})=>parent.postMessage({studio:'assembl-planting',type,...extra},parentOrigin);
const gy=studio.terrainEngine.getHeight(-5.5,-10.2);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const canvas=document.querySelector('#canvas-wrap canvas');
const controls=studio.controls;
controls.enableZoom=false; controls.enablePan=false;
controls.minDistance=.25; controls.minPolarAngle=.31; controls.maxPolarAngle=Math.PI*.78;
studio.setSunHour(9.65);
studio.setTool('paint-mix');
// The editor's translucent pool barrier guide crosses this room. The full editor
// owns that technical overlay; the homepage presents the furnished building.
if(studio.poolEngine?.nczGroup) {
  studio.poolEngine.config.showF9Zone=false;
  studio.poolEngine.nczGroup.visible=false;
}

const wrap=canvas.parentElement;
const style=document.createElement('link');
style.rel='stylesheet'; style.href=new URL('./agency-walk.css?v=1',import.meta.url).href;
document.head.append(style);
const nav=document.createElement('nav');
nav.className='agency-journey'; nav.setAttribute('aria-label','Garden and house');
const tour=document.createElement('button'), garden=document.createElement('button'), instruction=document.createElement('span');
tour.type=garden.type='button'; garden.textContent='Back to garden'; instruction.className='journey-sr';
instruction.setAttribute('role','status'); nav.append(tour,garden,instruction); wrap.append(nav);
canvas.tabIndex=0;

let mode='garden', elapsed=0, frame=0, last=0, inView=true, interacted=false, goal=null;
let yaw=0, pitch=0, pointer=null;
const exteriorFov=studio.camera.fov;
// The garden reads well with the original lens. Widen gently as the walls draw
// close so the arrival holds the seating, floor and dining area in a single view.
function place(view) {
  const u=Math.max(0,Math.min(1,(-5.6-view[2])/3.15));
  const fov=exteriorFov+(56-exteriorFov)*u*u*(3-2*u);
  if(Math.abs(studio.camera.fov-fov)>.001) {
    studio.camera.fov=fov;
    studio.camera.updateProjectionMatrix();
  }
  studio.setCamera(view[0],gy+view[1],view[2],view[3],gy+view[4],view[5]);
}
function stopClock() { cancelAnimationFrame(frame); frame=0; last=0; }
function isInside() { return studio.camera.position.z < -8.10; }
function changeMode(next) {
  mode=next; goal=null; pointer=null; keys.clear();
  const inside=next==='room';
  controls.enableRotate=!inside;
  studio.setTool(inside?'orbit':'paint-mix');
  // setTool can also change OrbitControls: inside we rotate at the eye, outside around the bed.
  controls.enabled=!inside;
  const look=controls.target.clone().sub(studio.camera.position);
  yaw=Math.atan2(look.x,-look.z); pitch=Math.atan2(look.y,Math.hypot(look.x,look.z));
  wrap.dataset.walk=mode;send('walk',{mode:next});
  tour.textContent=next==='tour'?'Pause walk':next==='paused'?'Continue inside':'Walk inside';
  const hadTourFocus=document.activeElement===tour;
  tour.hidden=inside;
  if(inside && hadTourFocus)canvas.focus({preventScroll:true});
  garden.hidden=next==='garden';
  const hint=inside?'Living room. Drag to look, tap the floor to walk, or use arrow keys. Escape returns to the garden.':
    'Coastal garden. Brush across the soil, or press Enter to plant. Walk inside follows the path to the living room.';
  canvas.setAttribute('aria-label',hint);
  instruction.textContent=inside?hint:'';
}
const keys=new Set();
function returnToGarden() {
  stopClock(); elapsed=0; controls.enabled=true; place(gardenView); changeMode('garden');
}
function pauseWalk() {
  if(mode!=='tour')return;
  stopClock(); changeMode(isInside()?'room':'paused');
}
function tick(now) {
  frame=0;
  if(!inView||document.hidden){last=0;return;}
  const dt=last?Math.min(.3,(now-last)/1000):0; last=now;
  if(mode==='tour') {
    elapsed=Math.min(duration,elapsed+dt*1000);
    const crossed=isInside();
    place(journeyPose(elapsed/duration));
    if(!crossed&&isInside())send('threshold');
    if(elapsed>=duration)changeMode('room');
  } else if(mode==='room') stepInside(dt);
  schedule();
}
function schedule() {
  if(!frame&&inView&&!document.hidden&&(mode==='tour'||(mode==='room'&&(goal||keys.size))))frame=requestAnimationFrame(tick);
  else if(!frame)last=0;
}
function startWalk() {
  stopClock();
  if(reduced.matches) { place(roomView); changeMode('room'); return; }
  if(mode!=='paused'){elapsed=0;place(gardenView);}
  changeMode('tour'); schedule();
}
function renderEye(x,z) {
  const y=studio.camera.position.y, length=3, flat=Math.cos(pitch)*length;
  studio.setCamera(x,y,z,x+Math.sin(yaw)*flat,y+Math.sin(pitch)*length,z-Math.cos(yaw)*flat);
}
function stepInside(dt) {
  const eye=studio.camera.position;
  const forward=Number(keys.has('w')||keys.has('arrowup'))-Number(keys.has('s')||keys.has('arrowdown'));
  const strafe=Number(keys.has('d'))-Number(keys.has('a'));
  yaw+=(Number(keys.has('arrowright'))-Number(keys.has('arrowleft')))*dt*1.3;
  if(forward||strafe||keys.size) {
    const factor=dt*1.25/Math.max(1,Math.hypot(strafe,forward));
    const to=[eye.x+(Math.sin(yaw)*forward+Math.cos(yaw)*strafe)*factor,
      eye.z+(-Math.cos(yaw)*forward+Math.sin(yaw)*strafe)*factor];
    renderEye(...reachable([eye.x,eye.z],to)); return;
  }
  if(!goal)return;
  const dx=goal[0]-eye.x,dz=goal[1]-eye.z,distance=Math.hypot(dx,dz);
  const move=Math.min(1,1.35*dt/Math.max(distance,.0001));
  renderEye(eye.x+dx*move,eye.z+dz*move);
  if(distance<.008||move===1)goal=null;
}
function tapFloor(event) {
  const rect=canvas.getBoundingClientRect(),eye=studio.camera.position;
  const ray=eye.clone().set(2*(event.clientX-rect.left)/rect.width-1,1-2*(event.clientY-rect.top)/rect.height,.5)
    .unproject(studio.camera).sub(eye).normalize();
  if(ray.y>-.045)return;
  const distance=(gy+.235-eye.y)/ray.y;
  goal=reachable([eye.x,eye.z],[eye.x+ray.x*distance,eye.z+ray.z*distance]);
  if(reduced.matches){renderEye(...goal);goal=null;}else schedule();
}
function cameraPointer(event) {
  if(!event.isPrimary || event.target!==canvas)return;
  if(event.type==='pointerdown')interacted=true;
  if(mode==='tour' && event.type==='pointerdown')pauseWalk();
  if(mode!=='room')return;
  event.stopImmediatePropagation();
  if(event.type==='pointerdown') {
    if(event.button!==0)return;
    goal=null; pointer={id:event.pointerId,x:event.clientX,y:event.clientY,yaw,pitch,drag:false};
    canvas.setPointerCapture(event.pointerId);
  } else if(pointer?.id===event.pointerId) {
    const dx=event.clientX-pointer.x,dy=event.clientY-pointer.y;
    if(event.type==='pointermove' && (pointer.drag||Math.hypot(dx,dy)>5)) {
      pointer.drag=true; yaw=pointer.yaw-dx*.004;
      pitch=Math.max(-.85,Math.min(.72,pointer.pitch+dy*.0035));
      renderEye(studio.camera.position.x,studio.camera.position.z);
    } else if(event.type==='pointerup'||event.type==='pointercancel') {
      if(event.type==='pointerup'&&!pointer.drag)tapFloor(event);
      pointer=null;
    }
  }
}
for(const type of ['pointerdown','pointermove','pointerup','pointercancel'])window.addEventListener(type,cameraPointer,{capture:true,passive:true});
canvas.addEventListener('pointerdown',event=>{
  if(event.isPrimary && event.button===0)studio.setTool(studio.hitsBuilding(event.clientX,event.clientY)?'orbit':'paint-mix');
},{capture:true});
window.addEventListener('pointerup',()=>{if(mode!=='room')studio.setTool('paint-mix');});
canvas.addEventListener('wheel',event=>event.stopImmediatePropagation(),{capture:true,passive:true});
canvas.addEventListener('keydown',event=>{
  interacted=true;
  if(event.altKey||event.ctrlKey||event.metaKey)return;
  if(event.key==='Escape'){event.preventDefault();returnToGarden();return;}
  const key=event.key.toLowerCase();
  if(!['arrowleft','arrowright','arrowup','arrowdown','w','a','s','d','enter',' '].includes(key))return;
  if(mode==='tour')pauseWalk();
  if(mode==='room' && ['arrowleft','arrowright','arrowup','arrowdown','w','a','s','d'].includes(key)){
    event.preventDefault();goal=null;keys.add(key);schedule();
  } else if(key==='enter'||key===' '){
    event.preventDefault(); if(mode==='room')returnToGarden();else plant();
  }
});
window.addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));
canvas.addEventListener('blur',()=>keys.clear());
tour.onclick=()=>{interacted=true;if(mode==='tour')pauseWalk();else startWalk();};
garden.onclick=()=>{returnToGarden();canvas.focus({preventScroll:true});};
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){stopClock();keys.clear();}else schedule();
});
reduced.addEventListener('change',()=>{if(reduced.matches)pauseWalk();});
returnToGarden();
function plant() {
  studio.setTool('paint-mix');
  const engine = studio.engine;
  const candidates = [];
  const margin = engine.terrainSize * .46 - studio.state.brushRadius;
  for (const row of [.94,.81,.67,.53,.40]) {
    for (const col of [.08,.26,.44,.62,.80,.94]) {
      const point = studio.exposedSoil(innerWidth*col,innerHeight*row);
      if (point && Math.abs(point.x) < margin && Math.abs(point.z) < margin) candidates.push(point);
    }
  }
  const nearby = p => engine.plants.reduce((n,k) => n+(Math.hypot(k.x-p.x,k.z-p.z)<1.6),0);
  candidates.forEach(p => {p.neighbours=nearby(p);});
  candidates.sort((a,b) => a.neighbours-b.neighbours);
  const points = [];
  for (const candidate of candidates) {
    if (points.every(p => Math.hypot(p.x-candidate.x,p.z-candidate.z)>.9)) points.push(candidate);
    if (points.length===4) break;
  }
  let added = 0;
  if (points.length) {
    const undo = engine.undoStack.slice(), redo = engine.redoStack.slice();
    engine.pushUndoState();
    const original = engine.undoStack.at(-1);
    for (const point of points) {
      added = studio.plantMixAt(point.x,point.z);
      if (added) break;
      // A full brush still paints mulch. A failed attempt must not change the
      // visible ground, bill or user's undo history before trying another point.
      engine.splatDataA.set(original.splatA);
      engine.splatDataB.set(original.splatB);
      engine.splatDataC.set(original.splatC);
    }
    if (!added) {
      engine.undoStack = undo;
      engine.redoStack = redo;
    }
    studio.updateStatsUI();
  }
  send('patch',{added});
}
window.addEventListener('message', async e => {
  if (e.source !== parent || e.origin !== parentOrigin || e.data?.studio !== 'assembl-planting') return;
  if (e.data.type === 'visibility') { inView = !!e.data.visible; document.documentElement.toggleAttribute('data-garden-idle', !inView); if(inView)schedule();else{stopClock();keys.clear();} return; }
  if(e.data.type==='continue-bed'){
    try {
      const {encodeBed}=await import('./public-bed.mjs?v=1');
      const month=Number(document.querySelector('#season-slider').value);
      const year=Number(document.querySelector('.yr-btn.active').dataset.year);
      send('continue-bed',{payload:await encodeBed(studio,month,year)});
    } catch { send('bed-unavailable'); }
    return;
  }
  if(!['mix','season','year','undo','plant'].includes(e.data.type))return;
  interacted=true;
  if(mode==='room'||isInside())returnToGarden();else pauseWalk();
  if (e.data.type === 'mix') {
    const choice = {coast:0, fern:1, flowers:4}[e.data.value];
    if (choice !== undefined) document.querySelectorAll('#cards-rail .card')[choice]?.click();
  }
  if (e.data.type === 'season') {
    const month = {summer:11.4, autumn:3.4, winter:6.4, spring:9.4}[e.data.value];
    if (month !== undefined) {
      const range = document.querySelector('#season-slider'); range.value = month;
      range.dispatchEvent(new Event('input', {bubbles:true}));
    }
  }
  if (e.data.type === 'year' && ['1','4','7','12'].includes(e.data.value)) {
    document.querySelector('.yr-btn[data-year="'+e.data.value+'"]')?.click();
  }
  if (e.data.type === 'undo') {
    const count=studio.engine.undoStack.length;
    document.querySelector('#btn-undo')?.click();
    send('undo-result',{changed:studio.engine.undoStack.length<count});
  }
  if (e.data.type === 'plant') plant();
});
try {
  await studio.present();
  send('ready');
  if(!reduced.matches&&!navigator.connection?.saveData && mode==='garden' && !interacted)startWalk();
  const total = document.querySelector('#bom-total');
  if (total) {
    const publish = () => send('estimate', {total:total.textContent.trim()});
    new MutationObserver(publish).observe(total,{subtree:true,childList:true,characterData:true});
    publish();
  }
} catch { send('unavailable'); }
