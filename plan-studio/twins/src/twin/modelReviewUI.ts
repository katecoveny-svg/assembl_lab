import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { GLASS, readReview, safeLayer, sha256, type GlassMode, type Point } from './modelReviewRules';
import type { App } from './app';
import type { Dressed } from './dressModel';
import type { HandoffSite } from './handoff';
import type { FlightPath } from './flightPath';

export async function reviewPanel(app:App, o:{
  model:THREE.Object3D; bytes:ArrayBuffer; site:HandoffSite|null; dress:Dressed;
  bounds:THREE.Box3; fallback:()=>FlightPath; ground:(x:number,z:number)=>number;
}):Promise<HTMLElement> {
  const el=document.createElement('section'); el.className='card model-review';
  const add=<K extends keyof HTMLElementTagNameMap>(tag:K,t:string,parent:HTMLElement=el)=>{
    const n=document.createElement(tag);n.textContent=t; parent.append(n);return n;
  };
  add('h3','Model review');
  const glass=add('label','Glass finish '), selection=add('select','',glass);
  selection.setAttribute('aria-label','Glass finish');
  for(const g of GLASS){const op=add('option',g.label,selection);op.value=g.id;}
  selection.disabled=!o.dress.glassCount;
  selection.onchange=()=>o.dress.setGlass(selection.value as GlassMode);
  add('p',o.dress.glassCount?'Appearance studies only. The original, patterned and frosted glazing are preserved.':'No plain named glazing is available to preview.');
  const info=add('p','');info.setAttribute('role','status');
  const files=o.site?.files;
  let review:ReturnType<typeof readReview>|null=null;
  if(files?.walk_review){
    try{
      if(files.walk_review.size>64*1024) throw Error('Walkthrough setup must be smaller than 64 KB.');
      review=readReview(JSON.parse(await files.walk_review.text()),await sha256(o.bytes));
      selection.value='authored'; o.dress.setGlass('authored');
    }catch(e){info.textContent=(e as Error).message;}
  }
  add('h4','Architect-supplied Māori design layers');
  for(const side of ['interior','exterior'] as const) {
    const t=side[0].toUpperCase()+side.slice(1);const lab=add('label','',add('div',''));
    const cb=add('input','',lab);cb.type='checkbox';
    lab.append(' '+t);
    const asset=side==='interior'?files?.design_interior:files?.design_exterior;
    const v=review?.layers[side]; const msg=add('small','',add('div',''));
    cb.disabled=true;msg.textContent='No verified layer attached for this model.';
    if(!asset||!v) continue;
    if(asset.size>24*1024*1024){msg.textContent='Layer exceeds the 24 MB limit.';continue;}
    try{
      const bytes=await asset.arrayBuffer();
      if(await sha256(bytes)!==v.sha256||!safeLayer(bytes))throw Error('Layer does not match approval or is not a self-contained GLB.');
      const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
      const layer=(await loader.parseAsync(bytes,'')).scene;
      layer.name=`review_design_${side}`;layer.visible=false;
      layer.traverse(node=>{if((node as THREE.Mesh).isMesh){(node as THREE.Mesh).castShadow=true;(node as THREE.Mesh).receiveShadow=true;}});
      o.model.add(layer);
      cb.disabled=false;cb.onchange=()=>{layer.visible=cb.checked;};
      msg.textContent=`Source: ${v.credit} · Recorded approval: ${v.approvedBy}`;
    }catch(e){msg.textContent=(e as Error).message;}
  }
  add('h4','Points of interest');
  const desc=add('p','Walk with the existing controls, or choose a view below. Walk in an opened IFC or GLB does not stop at walls. Views are stops, not an approved route.');
  const actions=add('div','');actions.className='model-review-points';
  const detail=add('p','');detail.setAttribute('aria-live','polite');
  const markerRoot=document.createElement('div');markerRoot.className='model-review-markers';app.canvas.parentElement?.append(markerRoot);
  let markerItems:{b:HTMLButtonElement,get:()=>{eye:THREE.Vector3,look:THREE.Vector3}}[]=[];
  type NavItem={label:string,note:string,get:()=>{eye:THREE.Vector3,look:THREE.Vector3}};
  const workingBounds=o.bounds.clone().expandByScalar(350);
  const points=(review?.points??[]).filter(p=>{
    o.model.updateWorldMatrix(true,false);
    return workingBounds.containsPoint(o.model.localToWorld(new THREE.Vector3(...p.eye)))&&workingBounds.containsPoint(o.model.localToWorld(new THREE.Vector3(...p.look)));
  });
  if (review && points.length!==review.points.length) info.textContent='One or more setup points lie outside the model review area and were skipped.';
  let sig = '';
  const rebuild=()=>{
    const flight = points.length ? [] : o.fallback().shots.filter(s=>s.x!==null&&s.z!==null);
    const items:NavItem[]=points.length?points.map((p:Point)=>({label:p.label,note:p.note,get:()=>{
      o.model.updateWorldMatrix(true,false);
      return {eye:o.model.localToWorld(new THREE.Vector3(...p.eye)),look:o.model.localToWorld(new THREE.Vector3(...p.look))};
    }})):flight.map((s,i)=>({label:s.label,note:s.note||s.where,get:()=>{
      const x=s.x!,z=s.z!,y=o.ground(x,z)+s.h,next=flight[i+1];
      const eye=new THREE.Vector3(x,y,z), look=next?new THREE.Vector3(next.x!,o.ground(next.x!,next.z!)+next.h,next.z!):o.bounds.getCenter(new THREE.Vector3());
      if (eye.distanceToSquared(look)<.04)look.z-=1;
      return {eye,look};
    }}));
    const key=points.length?'private':JSON.stringify(flight.map(s=>[s.id,s.label,s.x,s.z,s.h,s.note,s.where]));
    if(key===sig)return;
    sig=key; actions.replaceChildren();markerRoot.replaceChildren(); markerItems=[];
    if(!items.length){add('small','No placed points yet. Open a saved fly-through or attach a matching walkthrough setup to this project.',actions); return;}
    items.forEach((it,i)=>{
      const jump=()=>{const {eye,look}=it.get();app.focusReviewPoint(eye,look);detail.textContent=it.note||it.label;};
      const b=add('button',it.label,actions);b.className='pill';b.type='button';b.onclick=jump;
      const marker=add('button',String(i+1),markerRoot);marker.type='button';marker.title=it.label;marker.setAttribute('aria-label',`Go to ${it.label}`);marker.onclick=jump;
      markerItems.push({b:marker,get:it.get});
    });
    desc.textContent=points.length?'Choose a stop tied to this model revision. In Walk mode, click the numbered points. Wall collisions are not checked.':'These stops come from the current fly-through. In Walk mode, click the numbered points. Wall collisions are not checked.';
  };
  rebuild();
  let since=0;
  const projected=new THREE.Vector3(), camSpace=new THREE.Vector3();
  app.onFrame.push(dt=>{
    since+=dt;if(since>.7){rebuild();since=0;}
    markerRoot.hidden=!app.isWalking;
    if(markerRoot.hidden)return;
    app.camera.updateMatrixWorld();
    for(const {b,get} of markerItems){
      const world=get().eye;
      camSpace.copy(world).applyMatrix4(app.camera.matrixWorldInverse);
      projected.copy(world).project(app.camera);
      b.hidden=camSpace.z>=-1 || projected.z>1 || Math.abs(projected.x)>.98 || Math.abs(projected.y)>.98;
      if(!b.hidden){b.style.left=`${50+50*projected.x}%`;b.style.top=`${50-50*projected.y}%`;}
    }
  });
  return el;
}
