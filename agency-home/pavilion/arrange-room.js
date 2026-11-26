import * as T from './vendor/three.webgpu.min.js';

// The same footprints are used by the floor-plan editor and first-person collision detection.
export function arrangeRoom(camera,objects,obstacles){
 const slots={sofa:7,coffee:8,chair:9};
 const original=obstacles.map(rect=>rect.slice());
 const ray=new T.Raycaster(),pointer=new T.Vector2(),floor=new T.Plane(new T.Vector3(0,1,0),-.08);
 const dog=[4.60,5.34,.64,1.06];
 let active=false,selected='coffee',controller=null;
 function move(key,dx,dz){
  const object=objects[key],slot=slots[key];
  if(!object)return false;
  const [l,r,b,t]=original[slot],x=T.MathUtils.clamp(dx,1.12-l,6.91-r),z=T.MathUtils.clamp(dz,-1.92-b,1.79-t);
  const next=[l+x,r+x,b+z,t+z];
  const overlaps=([a,h,c,f])=>next[0]<h&&next[1]>a&&next[2]<f&&next[3]>c;
  if(obstacles.some((rect,i)=>i!==slot&&overlaps(rect))||overlaps(dog))return false;
  object.position.set(x,0,z);obstacles[slot]=next;return true;
 }
  function aim(e,surface){
   const rect=surface.getBoundingClientRect();
   pointer.set((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2);
   ray.setFromCamera(pointer,camera);
  }
  function pick(e,surface){
   aim(e,surface);const roots=Object.values(objects);
   for(const hit of ray.intersectObjects(roots,true)){
    if(hit.object.userData.contact)continue;
    let root=hit.object;while(root.parent&&!roots.includes(root))root=root.parent;
    const entry=Object.entries(objects).find(([,group])=>group===root);
    if(entry)return {key:entry[0],point:hit.point};
   }
  }
 function grab(e,surface,viewer){
  // Only grab furnishings from the living room, never through an exterior wall.
  if(!viewer||viewer.x<1.03||viewer.z>1.83)return null;
  const hit=pick(e,surface);if(!hit)return null;
  const {key,point:anchor}=hit,plane=new T.Plane(new T.Vector3(0,1,0),-anchor.y);
  const origin=objects[key].position.clone();
  return event=>{
   aim(event,surface);const p=ray.ray.intersectPlane(plane,new T.Vector3());if(!p)return false;
   const slot=slots[key],before=objects[key].position.clone();
   if(!move(key,origin.x+p.x-anchor.x,origin.z+p.z-anchor.z))return false;
   const [l,r,b,t]=obstacles[slot];
   if(viewer.x>l-.15&&viewer.x<r+.15&&viewer.z>b-.15&&viewer.z<t+.15){move(key,before.x,before.z);return false}
   return true;
  };
 }
 function activate(surface,select,repaint,report,close){
  active=true;controller=new AbortController();
  let drag=null;
  const listen=(el,type,fn)=>el.addEventListener(type,fn,{signal:controller.signal});
  function choose(key){selected=key;select.value=key;report(objects[key]?.name??'Loading chair…')}
  choose(selected);
  listen(select,'change',()=>{choose(select.value);surface.focus({preventScroll:true})});
  listen(surface,'pointerdown',e=>{
   if(!e.isPrimary||e.button!==0)return;
   const key=pick(e,surface)?.key;if(!key)return;
   const point=ray.ray.intersectPlane(floor,new T.Vector3());if(!point)return;
   choose(key);surface.focus({preventScroll:true});surface.setPointerCapture(e.pointerId);
   drag={id:e.pointerId,p:point,origin:objects[key].position.clone()};surface.dataset.dragging='';
  });
  listen(surface,'pointermove',e=>{
   if(!drag||drag.id!==e.pointerId)return;
   aim(e,surface);const point=ray.ray.intersectPlane(floor,new T.Vector3());if(!point)return;
   const x=drag.origin.x+point.x-drag.p.x,z=drag.origin.z+point.z-drag.p.z;
   if(move(selected,x,z))repaint();
  });
  function end(){drag=null;delete surface.dataset.dragging}
  for(const type of ['pointercancel','lostpointercapture','pointerup'])listen(surface,type,end);
  listen(surface,'keydown',e=>{
   if(e.key==='Escape'){e.preventDefault();close();return}
   const delta={ArrowLeft:[-.12,0],ArrowRight:[.12,0],ArrowUp:[0,-.12],ArrowDown:[0,.12]}[e.key];
   if(!delta||!objects[selected])return;
   e.preventDefault();e.stopPropagation();
   const p=objects[selected].position;move(selected,p.x+delta[0],p.z+delta[1]);repaint();
  });
  controller.signal.addEventListener('abort',end,{once:true});
 }
 return {activate,grab,get active(){return active},
  frame(cp,aim){const phone=camera.aspect<1;cp.set(4.12,phone?6.55:3.95,phone?2.35:1.76);aim.set(4.12,.11,-.16);camera.fov=phone?72:64},
  positions(){return Object.fromEntries(Object.entries(objects).map(([k,o])=>[k,[o.position.x,o.position.z]]))},
  reset(){for(const [key,slot] of Object.entries(slots)){objects[key]?.position.set(0,0,0);obstacles[slot]=original[slot].slice()}},
  leave(){controller?.abort();active=false}
 };
}
