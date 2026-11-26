// First-person navigation shared by keyboard and touch. Coordinates are model metres.
export function houseWalk(blocks) {
  const pad=.14, eye=1.64;
  const doors=[[.04,1.70],[1.81,3.48]];
  let pose=null;
  function clear(x,z){
    if(x < -6.94 || x > 7.02 || z < -1.88 || z > 4.26)return false;
    if(z>1.83 && z<2.10 && !doors.some(([l,r])=>x>l+pad&&x<r-pad))return false;
    if(z>=2.10)return x> -6.45 && !(Math.abs(z-3.12)<.20&&Math.abs(x+.05)<.20);
    return !blocks.some(([l,r,b,t])=>x>l-pad&&x<r+pad&&z>b-pad&&z<t+pad);
  }
  return {
    start(){pose={x:.91,z:2.83,yaw:0,pitch:-.045};return pose},
    stop(){pose=null},
    get pose(){return pose},
    look(dx,dy){if(pose){pose.yaw-=dx;pose.pitch=Math.max(-1.05,Math.min(.96,pose.pitch-dy))}},
    move(front,side,dt){
      if(!pose)return;
      const mag=Math.max(1,Math.hypot(front,side)),step=Math.min(dt,.07)*1.75/mag;
      const c=Math.cos(pose.yaw),s=Math.sin(pose.yaw);
      const x=pose.x+step*(side*c-front*s),z=pose.z-step*(front*c+side*s);
      if(clear(x,pose.z))pose.x=x;
      if(clear(pose.x,z))pose.z=z;
    },
    frame(cp,aim){
      if(!pose)return;
      const {x,z,yaw,pitch}=pose;
      const threshold=Math.max(0,Math.min(1,(2.17-z)/.25));
      cp.set(x,eye-.05+.117*threshold,z);
      aim.set(x-Math.sin(yaw)*Math.cos(pitch),cp.y+Math.sin(pitch),z-Math.cos(yaw)*Math.cos(pitch));
    }
  };
}
export function walkInput({button,surface,stage,pad,start,stop,look,move}){
  const keys=new Set();let walk=false,drag=null,stick=null,axis=[0,0],frame=0,last=0;
  const accepted=['KeyW','KeyA','KeyS','KeyD','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'];
  function animate(now){
    const dt=last?(now-last)/1000:0;last=now;
    move(axis[1]+Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown')),axis[0]+Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')),dt);
    if(keys.size||axis.some(Boolean))frame=requestAnimationFrame(animate);else{frame=0;last=0}
  }
  function wake(){if(!frame)frame=requestAnimationFrame(animate)}
  function release(){keys.clear();axis=[0,0];stick=drag=null;cancelAnimationFrame(frame);frame=last=0;pad.style.removeProperty('--dx');pad.style.removeProperty('--dy')}
  function toggle(on){
    if(on===walk)return;
    if(on&&!start())return;
    walk=on;stage.toggleAttribute('data-first-person',on);button.setAttribute('aria-pressed',String(on));button.textContent=on?'Leave walk':'Walk inside';
    if(on)surface.focus({preventScroll:true});else{release();stop()}
  }
  button.onclick=()=>toggle(!walk);
  surface.tabIndex=0;surface.setAttribute('role','group');surface.setAttribute('aria-label','Waiheke house. W A S D or arrows to walk, drag to look, Escape to leave.');
  surface.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&walk){e.preventDefault();toggle(false);button.focus({preventScroll:true});return}
    if(!accepted.includes(e.code)||e.metaKey||e.ctrlKey||e.altKey)return;
    if(!walk)toggle(true);if(!walk)return;e.preventDefault();e.stopImmediatePropagation();keys.add(e.code);wake();
  },true);
  window.addEventListener('keyup',e=>keys.delete(e.code));
  surface.addEventListener('keydown',e=>{if(walk&&e.key.toLowerCase()==='q')look(-.13,0);if(walk&&e.key.toLowerCase()==='e')look(.13,0)});
  surface.addEventListener('pointerdown',e=>{if(!walk||!e.isPrimary)return;e.stopImmediatePropagation();drag={id:e.pointerId,x:e.clientX,y:e.clientY};surface.setPointerCapture(e.pointerId);surface.focus({preventScroll:true})},true);
  surface.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;e.stopImmediatePropagation();look((e.clientX-drag.x)*.0032,(e.clientY-drag.y)*.0032);drag.x=e.clientX;drag.y=e.clientY},true);
  surface.addEventListener('lostpointercapture',()=>{drag=null});
  function steer(e){const r=pad.getBoundingClientRect(),x=(e.clientX-r.left-r.width/2)/(r.width*.35),y=(e.clientY-r.top-r.height/2)/(r.height*.35),d=Math.max(1,Math.hypot(x,y));axis=[x/d,-y/d];pad.style.setProperty('--dx',axis[0]*21+'px');pad.style.setProperty('--dy',-axis[1]*21+'px');wake()}
  pad.onpointerdown=e=>{stick=e.pointerId;pad.setPointerCapture(stick);steer(e)};
  pad.onpointermove=e=>{if(stick===e.pointerId)steer(e)};
  pad.onlostpointercapture=()=>{stick=null;axis=[0,0];pad.style.removeProperty('--dx');pad.style.removeProperty('--dy')};
  window.addEventListener('blur',release);surface.addEventListener('blur',release);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)release()});
  new IntersectionObserver(([e])=>{if(!e.isIntersecting&&walk)toggle(false)}).observe(stage);
  return {leave:()=>toggle(false),active:()=>walk};
}
