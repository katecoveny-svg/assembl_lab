// First-person navigation shared by keyboard and touch. Coordinates are model metres.
export function houseWalk(blocks) {
  const pad=.14, eye=1.64;
  const doors=[[.04,1.70],[1.81,3.48]];
  let pose=null,saved=null,target=null,destination=null;
  function clear(x,z){
    if(x < -6.94 || x > 7.02 || z < -1.88 || z > 4.26)return false;
    if(z>1.83 && z<2.10 && !doors.some(([l,r])=>x>l+pad&&x<r-pad))return false;
    if(z>=2.10)return x> -6.45 && !(Math.abs(z-3.12)<.20&&Math.abs(x+.05)<.20);
    return !blocks.some(([l,r,b,t])=>x>l-pad&&x<r+pad&&z>b-pad&&z<t+pad);
  }
  function clearLine(x,z,toX,toZ){
    const steps=Math.max(1,Math.ceil(Math.hypot(toX-x,toZ-z)/.07));
    for(let i=1;i<=steps;i++)if(!clear(x+(toX-x)*i/steps,z+(toZ-z)*i/steps))return false;
    return true;
  }
  function route(x,z){
    const end={x,z};
    if(clearLine(pose.x,pose.z,x,z))return [end];
    // Walk around actual furniture and through clear doorways using a small visibility graph.
    const nodes=[pose,end];
    for(const [l,r,b,t] of blocks)for(const px of [l-pad-.035,r+pad+.035])for(const pz of [b-pad-.035,t+pad+.035]){
      if(clear(px,pz))nodes.push({x:px,z:pz});
    }
    for(const [l,r] of doors)for(const pz of [1.64,2.22])nodes.push({x:(l+r)/2,z:pz});
    const cost=nodes.map(()=>Infinity),previous=nodes.map(()=>-1),done=new Set();
    cost[0]=0;
    while(true){
      let from=-1;
      for(let i=0;i<nodes.length;i++)if(!done.has(i)&&cost[i]<Infinity&&(from===-1||cost[i]<cost[from]))from=i;
      if(from<0)return null;
      if(from===1)break;
      done.add(from);const a=nodes[from];
      for(let j=1;j<nodes.length;j++){
        if(done.has(j))continue;const b=nodes[j],next=cost[from]+Math.hypot(b.x-a.x,b.z-a.z);
        if(next<cost[j]&&clearLine(a.x,a.z,b.x,b.z)){previous[j]=from;cost[j]=next;}
      }
    }
    const steps=[];for(let i=1;i>0;i=previous[i])steps.unshift(nodes[i]);return steps;
  }
  function face(yaw,step){
    const angle=Math.atan2(Math.sin(yaw-pose.yaw),Math.cos(yaw-pose.yaw));
    pose.yaw+=angle*Math.min(1,step);
  }
  return {
    start(){pose=saved&&clear(saved.x,saved.z)?{...saved}:{x:1.32,z:1.53,yaw:-.95,pitch:-.21};return pose},
    request(x,z){
      target=destination=null;if(!pose||!Number.isFinite(x+z))return false;
      // Stop on the nearest accessible part of the floor when a tap lands on a furnishing.
      const desiredX=x,desiredZ=z;
      if(!clear(x,z)){
        let nearest=null;
        for(const distance of [.23,.45,.68,.9]){
          for(let i=0;i<16;i++){const angle=i*Math.PI/8,px=desiredX+distance*Math.cos(angle),pz=desiredZ+distance*Math.sin(angle);
            if(clear(px,pz)&&(!nearest||Math.hypot(px-pose.x,pz-pose.z)<nearest.d))nearest={x:px,z:pz,d:Math.hypot(px-pose.x,pz-pose.z)};
          }
          if(nearest)break;
        }
        if(!nearest)return false;x=nearest.x;z=nearest.z;
      }
      target=route(x,z);
      return !!target;
    },
    visit(room,instant){
      const places={living:[1.32,1.53,-.95,-.21],kitchen:[-.62,1.21,.60,-.15],bedroom:[-4.49,1.11,.95,-.14]};
      const choice=places[room];if(!pose||!choice)return false;
      const [x,z,yaw,pitch]=choice;
      if(instant){Object.assign(pose,{x,z,yaw,pitch});target=destination=null;return true;}
      target=route(x,z);destination=target?{yaw,pitch}:null;return !!target;
    },
    advance(dt){
      if(!pose)return false;
      if(!target){
        if(!destination)return false;
        const a=Math.atan2(Math.sin(destination.yaw-pose.yaw),Math.cos(destination.yaw-pose.yaw));
        if(Math.abs(a)<.012){pose.yaw=destination.yaw;pose.pitch=destination.pitch;destination=null;return false;}
        face(destination.yaw,dt*5);pose.pitch+=(destination.pitch-pose.pitch)*Math.min(1,dt*5);return true;
      }
      const x=target[0].x-pose.x,z=target[0].z-pose.z,length=Math.hypot(x,z);
      if(destination&&length>.08)face(Math.atan2(-x,-z),dt*3);
      const step=Math.min(1,Math.min(dt,.07)*1.75/Math.max(length,.00001));
      pose.x+=x*step;pose.z+=z*step;if(step===1){target.shift();if(!target.length)target=null}
      return !!(target||destination);
    },
    cancel(){target=destination=null},
    stop(){saved=pose;pose=null;target=destination=null},
    get pose(){return pose},
    look(dx,dy){if(pose){pose.yaw-=dx;pose.pitch=Math.max(-1.05,Math.min(.96,pose.pitch-dy))}},
    move(front,side,dt){
      if(!pose)return;target=destination=null;
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
export function walkInput({button,surface,stage,pad,start,stop,look,move,clickFloor,advance,cancel,grab}){
  const keys=new Set();let onScreen=true,walk=false,drag=null,stick=null,axis=[0,0],frame=0,last=0;
  const accepted=['KeyW','KeyA','KeyS','KeyD','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'];
  function animate(now){
    const dt=last?(now-last)/1000:0;last=now;
    const steering=keys.size||axis.some(Boolean);
    if(steering)move(axis[1]+Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown')),axis[0]+Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')),dt);
    const travelling=!steering&&advance(dt);
    if(steering||travelling)frame=requestAnimationFrame(animate);else{frame=0;last=0}
  }
  function wake(){if(!frame)frame=requestAnimationFrame(animate)}
  function release(){cancel();keys.clear();axis=[0,0];stick=drag=null;cancelAnimationFrame(frame);frame=last=0;pad.style.removeProperty('--dx');pad.style.removeProperty('--dy')}
  function toggle(on,focus=true){
    if(on===walk)return;
    if(on&&!start())return;
    walk=on;stage.toggleAttribute('data-first-person',on);button.setAttribute('aria-pressed',String(on));button.textContent=on?'View exterior':'Enter house';
    if(on){if(focus)surface.focus({preventScroll:true})}else{release();stop()}
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
  surface.addEventListener('pointerdown',e=>{
    if(!walk||!e.isPrimary||e.button!==0)return;
    cancel();drag={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false,piece:grab(e)};
    e.stopImmediatePropagation();surface.setPointerCapture(e.pointerId);surface.focus({preventScroll:true});
  },true);
  surface.addEventListener('pointermove',e=>{
    if(!drag||drag.id!==e.pointerId)return;e.stopImmediatePropagation();
    if(!drag.moved&&Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)<5)return;
    drag.moved=true;
    if(drag.piece)drag.piece(e);else look((e.clientX-drag.x)*.0032,(e.clientY-drag.y)*.0032);
    drag.x=e.clientX;drag.y=e.clientY;
  },true);
  surface.addEventListener('pointerup',e=>{
    if(drag?.id!==e.pointerId)return;
    if(!drag.moved&&clickFloor(e))wake();
    drag=null;
  });
  surface.addEventListener('lostpointercapture',()=>{drag=null});
  // Letter keys can move immediately on arrival without stealing focus from links or inputs.
  window.addEventListener('keydown',e=>{
    if(!onScreen||!walk||e.target!==document.body||!['KeyW','KeyA','KeyS','KeyD'].includes(e.code)||e.ctrlKey||e.metaKey||e.altKey)return;
    e.preventDefault();surface.focus({preventScroll:true});keys.add(e.code);wake();
  });
  function steer(e){const r=pad.getBoundingClientRect(),x=(e.clientX-r.left-r.width/2)/(r.width*.35),y=(e.clientY-r.top-r.height/2)/(r.height*.35),d=Math.max(1,Math.hypot(x,y));axis=[x/d,-y/d];pad.style.setProperty('--dx',axis[0]*21+'px');pad.style.setProperty('--dy',-axis[1]*21+'px');wake()}
  pad.onpointerdown=e=>{stick=e.pointerId;pad.setPointerCapture(stick);steer(e)};
  pad.onpointermove=e=>{if(stick===e.pointerId)steer(e)};
  pad.onlostpointercapture=()=>{stick=null;axis=[0,0];pad.style.removeProperty('--dx');pad.style.removeProperty('--dy')};
  window.addEventListener('blur',release);surface.addEventListener('blur',release);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)release()});
  new IntersectionObserver(([e])=>{onScreen=e.isIntersecting;if(!onScreen)release()}).observe(stage);
  return {travel:wake,enter:(focus=true)=>toggle(true,focus),leave:()=>toggle(false),active:()=>walk};
}
