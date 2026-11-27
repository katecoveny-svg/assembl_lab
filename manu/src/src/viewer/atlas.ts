// One specimen rig and one WebGL context for the entire guide.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createBird, type BirdHandle } from '../engine/bird';
import { NZ_SPECIES } from '../engine/nz/species';
import { MEASURED } from '../engine/nz/measured';
import { LM } from '../engine/nz/shell';
import { createBranch, GRIP_X, loadBranch, perchFrames } from '../engine/env/branch';

import { dressBranch } from '../engine/nz/flora';

export async function openPlate(canvas: HTMLCanvasElement, scaleMark: HTMLElement, showDetail: (on:boolean)=>void) {
  const stage = canvas.parentElement!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const renderer = new THREE.WebGLRenderer({canvas, alpha:true, antialias:true, powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 700 ? 1.4 : 1.8));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFShadowMap;
  renderer.toneMapping=THREE.NeutralToneMapping;
  const scene=new THREE.Scene(), camera=new THREE.OrthographicCamera(-1,1,1,-1,.01,30);
  const env=new RoomEnvironment(), generator=new THREE.PMREMGenerator(renderer);
  const reflections=generator.fromScene(env,.04);scene.environment=reflections.texture;env.dispose();generator.dispose();
  const sky=new THREE.HemisphereLight(0xfff8eb,0x777467,1.18);
  const key=new THREE.DirectionalLight(0xfff1d5,1.65), rim=new THREE.DirectionalLight(0xdbe8ff,1);
  key.position.set(-2.5,3.6,3.2);rim.position.set(3,2,-3);
  key.castShadow=true;key.shadow.mapSize.setScalar(innerWidth<650?512:1024);
  Object.assign(key.shadow.camera,{left:-1.6,right:1.6,bottom:-1.6,top:1.6,near:.2,far:12});
  key.shadow.bias=-.001;key.shadow.normalBias=.016;scene.add(sky,key,rim);
  const spin=new THREE.Group(), holder=new THREE.Group();spin.add(holder);scene.add(spin);
  const branch = (await loadBranch('/manu/models/perch.glb').catch(() => createBranch())).group;
  dressBranch(branch, 'kowhai');
  const contact=perchFrames(branch);holder.add(branch);
  const target=new THREE.Vector3(), normalCentre=new THREE.Vector3(), head=new THREE.Vector3();
  const worldY=new THREE.Vector3(0,1,0), worldX=new THREE.Vector3(1,0,0), q=new THREE.Quaternion();
  const home=new THREE.Quaternion();
  // The bird faces +Z; seen from +Z, a positive yaw brings the bill to screen right.
  home.setFromEuler(new THREE.Euler(.06,1.06,0,'YXZ'));spin.quaternion.copy(home);
  let bird:BirdHandle|null=null, current='', zoom=1, magnification=1, shared=false, close=false, paused=false;
  let dusk=false, light=0, visible=true, frame=0, last=0, turn=0, vx=0, vy=0, resetTurn=false, baseSpan=2;
  let entrance=1, direction=1;
  let width=1,height=1; const pointers=new Map<number,THREE.Vector2>();
  let lastDistance=0;
  const resetZoom=()=>{zoom=1;close=false;showDetail(false);turn=0;vx=0;vy=0;resetTurn=true;};
  function rotate(y:number,x:number){spin.quaternion.premultiply(q.setFromAxisAngle(worldY,y)).premultiply(q.setFromAxisAngle(worldX,x));}
  function adjustZoom(factor:number){close=false;zoom=THREE.MathUtils.clamp(zoom*factor,.55,3.4);showDetail(zoom>2.2);wake();}
  function measure(){
    width=Math.max(1,stage.clientWidth);height=Math.max(1,stage.clientHeight);
    renderer.setSize(width,height,false);wake();
  }
  function wake(){if(!frame&&visible&&!document.hidden)frame=requestAnimationFrame(draw);}
  function draw(now:number){
    frame=0;if(!visible||document.hidden||!bird)return;
    const dt=Math.min(.05,(now-last)/1000||.016);last=now;
    const blend=reduced.matches?1:1-Math.exp(-dt*8);
    magnification=THREE.MathUtils.lerp(magnification,zoom,blend);
    light=THREE.MathUtils.lerp(light,+dusk,blend);renderer.toneMappingExposure=1.11-.1*light;
    scene.environmentIntensity=.78-.50*light;sky.intensity=.85-.43*light;rim.intensity=1+light*.85;
    key.color.setRGB(1,.91-light*.24,.75-light*.37);
    if(resetTurn){spin.quaternion.slerp(home,blend);if(spin.quaternion.angleTo(home)<.001)resetTurn=false;}
    if(!pointers.size){
      const step=turn*blend;turn-=step;rotate(step+vx*dt,vy*dt);
      vx*=Math.exp(-dt*6);vy*=Math.exp(-dt*6);
    }
    if(!paused&&!reduced.matches)bird.update(dt);
    entrance=Math.min(1,entrance+dt/.36);
    spin.position.x=direction*.18*(1-entrance)**3;
    const physical=shared?MEASURED[current].length/500:1;
    spin.scale.setScalar(physical);holder.position.copy(normalCentre).multiplyScalar(-1);
    if(close){head.copy(bird.rig.rest.head.worldPos).add(bird.root.position);holder.position.lerp(head.negate(),.78);}
    const span=(shared?2.1:baseSpan)/magnification;
    const aspect=width/height,half=span/2/Math.min(1,aspect);camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;
    camera.position.set(0,0,6);camera.lookAt(target);camera.updateProjectionMatrix();
    const pixels=height/(2*half)*physical*LM*50/MEASURED[current].length;
    scaleMark.style.width=pixels+'px';
    renderer.render(scene,camera);
    if(entrance<1||!paused&&!reduced.matches||resetTurn||Math.abs(turn)>1e-5||Math.abs(vx)+Math.abs(vy)>.002||Math.abs(zoom-magnification)>.001||Math.abs(light-(+dusk))>.002)wake();
  }
  function select(id:string) {
    if(!NZ_SPECIES[id])throw Error('Unknown bird');
    if(bird){holder.remove(bird.root);bird.dispose();}
    const order=Object.keys(NZ_SPECIES);
    direction=Math.sign(order.indexOf(id)-order.indexOf(current));
    entrance=current&&id!==current&&!reduced.matches?0:1;
    current=id;const species=NZ_SPECIES[id];
    bird=createBird({species:{...species,plumage:{density:width < 650 ? .85 : .62,fuzzLayers:width<650?2:4}}});
    if(width<650)bird.feathers.contour.castShadow=false;
    bird.root.position.x=GRIP_X;bird.layer<any>('hop').home=GRIP_X;bird.setPerch(contact,[GRIP_X,GRIP_X]);
    bird.mind.quiet=true;bird.mind.pinGaze=[18,6,0];holder.add(bird.root);bird.update(0);
    const box=new THREE.Box3(),pt=new THREE.Vector3();
    bird.root.updateMatrixWorld(true);

    // Sample in holder space even when the visitor switches from a rotated or zoomed view.
    const localInv=holder.matrixWorld.clone().invert();
    // AABB must be sampled before external presentation transforms.
    box.makeEmpty();bird.root.traverse(o=>{const m=o as THREE.SkinnedMesh;if(!m.isSkinnedMesh)return;const mx=localInv.clone().multiply(m.matrixWorld);
      const pos=m.geometry.getAttribute('position');for(let i=0;i<pos.count;i+=19)box.expandByPoint(m.getVertexPosition(i,pt).applyMatrix4(mx));
    });
    box.getCenter(normalCentre);const size=box.getSize(pt);baseSpan=Math.max(size.z,size.y,size.x)*1.42;
    resetZoom();spin.quaternion.copy(home);magnification=1;resetTurn=false;if(frame)cancelAnimationFrame(frame);frame=0;draw(performance.now());wake();
  }
  stage.onpointerdown=e=>{if(e.button!==0)return;resetTurn=false;turn=vx=vy=0;pointers.set(e.pointerId,new THREE.Vector2(e.clientX,e.clientY));stage.setPointerCapture(e.pointerId);lastDistance=0;};
  stage.onpointermove=e=>{const p=pointers.get(e.pointerId);if(!p)return;
    const dx=e.clientX-p.x,dy=e.clientY-p.y;p.set(e.clientX,e.clientY);
    if(pointers.size===2){const [a,b]=[...pointers.values()],d=a.distanceTo(b);if(lastDistance>0)adjustZoom(d/lastDistance);lastDistance=d;}
    else{const k=Math.PI/Math.max(240,Math.min(width,height)*.72);rotate(dx*k,dy*k);vx=reduced.matches?0:THREE.MathUtils.clamp(dx*k*13,-1.8,1.8);vy=reduced.matches?0:THREE.MathUtils.clamp(dy*k*13,-1.8,1.8);}
    wake();
  };
  const release=(e:PointerEvent)=>{pointers.delete(e.pointerId);lastDistance=0;wake();};stage.onpointerup=stage.onpointercancel=release;
  stage.addEventListener('wheel',e=>{e.preventDefault();adjustZoom(Math.exp(-e.deltaY*(e.ctrlKey ? .009 : .0017)));},{passive:false});
  stage.ondblclick=()=>{resetZoom();wake();};stage.onkeydown=e=>{let yes=true;switch(e.key){
    case 'ArrowLeft':rotate(-.18,0);break;case 'ArrowRight':rotate(.18,0);break;case 'ArrowUp':rotate(0,-.18);break;case 'ArrowDown':rotate(0,.18);break;
    case '+':case '=':adjustZoom(1.25);break;case '-':adjustZoom(.8);break;case '0':resetZoom();break;default:yes=false;
  }if(yes){e.preventDefault();wake();}};
  new ResizeObserver(measure).observe(stage);
  new IntersectionObserver(([e])=>{visible=e.isIntersecting;if(visible)wake();}).observe(stage);
  document.addEventListener('visibilitychange',wake);reduced.addEventListener('change',wake);measure();
  return {select,zoom:adjustZoom,turn(n:number){if(reduced.matches)rotate(n,0);else turn+=n;wake();},reset(){resetZoom();wake();},
    detail(){close=zoom<=2.2;zoom=close?2.35:1;wake();return close;},scale(on:boolean){shared=on;resetZoom();wake();},
    dusk(on:boolean){dusk=on;wake();},pause(on:boolean){paused=on;wake();},get state(){return {bird:current,zoom,shared,close,dusk,paused,rotation:spin.quaternion.toArray(),width,height,scale:spin.scale.x,draws:renderer.info.render.calls};}};
}
