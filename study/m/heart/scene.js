import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createHeartRig} from './heart-rig.js';
function free(root){const geometries=new Set(),materials=new Set();root?.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])materials.add(m)});for(const g of geometries)g.dispose();for(const m of materials)m.dispose()}
export async function createScene(host,signal,onLost){
 const response=await fetch(new URL('./assets/heart_pump_lab.glb',import.meta.url),{signal});if(!response.ok)throw Error('Model unavailable');
 const bytes=await response.arrayBuffer();if(signal.aborted)throw new DOMException('Cancelled','AbortError');
 const gltf=await new GLTFLoader().parseAsync(bytes,'');const root=gltf.scene;
 if(signal.aborted){free(root);throw new DOMException('Cancelled','AbortError')}
 let renderer,controls,observer,dead=false;const markers=[];let state,lastView='';
 const scene=new T.Scene();const camera=new T.OrthographicCamera(-.12,.12,.11,-.11,.001,3);
 function dispose(){if(dead)return;dead=true;observer?.disconnect();controls?.dispose();renderer?.domElement.removeEventListener('webglcontextlost',lost);free(root);renderer?.dispose();renderer?.forceContextLoss();renderer?.domElement.remove();for(const m of markers){m.el.remove();m.line.remove()}}
 function lost(e){e.preventDefault();if(!dead)onLost()}
 try{
 const rig=createHeartRig(root);renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor('#ffffff');renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
 renderer.domElement.setAttribute('aria-label','Detailed heart teaching cutaway. Drag to orbit; labelled structure and view controls are available below.');renderer.domElement.setAttribute('role','img');
 controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.enablePan=false;controls.minZoom=.6;controls.maxZoom=2.2;controls.target.set(0,.032,0);
 scene.add(root,new T.HemisphereLight(0xffffff,0xd0c9d6,2.2));for(const [pos,power]of [[[.2,.3,.2],2.8],[[-.2,.10,.2],1.2],[[0,.2,-.2],1.8]]){const l=new T.DirectionalLight(0xffffff,power);l.position.set(...pos);scene.add(l)}
 for(const [name,label]of [['Labels_RA','Right atrium'],['Labels_RV','Right ventricle'],['Labels_LA','Left atrium'],['Labels_LV','Left ventricle'],['Labels_AorticValve','Aortic valve'],['Labels_Aorta','Aorta']]){const el=document.createElement('span');el.className='marker';el.textContent=label;el.setAttribute('aria-hidden','true');const line=document.createElement('span');line.className='marker-leader';line.setAttribute('aria-hidden','true');markers.push({node:rig.names.get(name),el,line,name});host.append(line,el)}
 function draw(){
  if(dead||!state)return;renderer.render(scene,camera);
  const {width,height}=host.getBoundingClientRect(),compact=width<500,placed=[];
  for(const m of markers){
   m.el.hidden=state.view==='outflow'?!['Labels_LV','Labels_AorticValve','Labels_Aorta'].includes(m.name):!['Labels_RA','Labels_RV','Labels_LA','Labels_LV'].includes(m.name);m.line.hidden=m.el.hidden;
   if(m.el.hidden)continue;
   const v=m.node.getWorldPosition(new T.Vector3()).project(camera),x=(v.x+1)/2*width,y=(1-v.y)/2*height;
   const offset=({Labels_RA:-55,Labels_RV:-55,Labels_LA:55,Labels_LV:55,Labels_AorticValve:-80,Labels_Aorta:45})[m.name];
   const w=m.el.offsetWidth,h=m.el.offsetHeight,pad=5;
   const tx=Math.max(w/2+pad,Math.min(width-w/2-pad,compact?(offset<0?w/2+pad:width-w/2-pad):x+offset));
   let ty=Math.max(h/2+pad,Math.min(height-h/2-pad,y));
   // Keep label boxes apart even after an orbit projects nearby anchors together.
   for(const box of placed)if(Math.abs(tx-box.x)<(w+box.w)/2+5&&Math.abs(ty-box.y)<(h+box.h)/2+6){
    const below=box.y+(h+box.h)/2+6;
    ty=below+h/2+pad<=height?below:Math.max(h/2+pad,box.y-(h+box.h)/2-6);
   }
   placed.push({x:tx,y:ty,w,h});m.el.style.left=`${tx}px`;m.el.style.top=`${ty}px`;
   const dx=tx-x,dy=ty-y;
   m.line.style.cssText=`left:${x}px;top:${y}px;width:${Math.hypot(dx,dy)}px;transform-origin:0 50%;transform:rotate(${Math.atan2(dy,dx)}rad)`;
  }
 }
 function front(){camera.position.set(state?.view==='outflow'?.065:0,.10,.34);controls.target.set(.012,.032,0);camera.zoom=1;camera.updateProjectionMatrix();controls.update();draw()}
 function update(s){state=s;root.traverse(o=>o.visible=true);rig.setCutaway(s.cutaway||s.view==='outflow');rig.setArrows(s.arrows);rig.applyPhase(s.phase);
  if(s.view==='outflow')for(const o of rig.names.get('HeartRoot').children){if(!['Chamber_L_Ventricle','Valve_Mitral','Valve_Aortic','Vessels_OxygenRich','Labels'].includes(o.name)&&!o.name.startsWith('Papillary_Mitral')&&!o.name.startsWith('Chord_Mitral')&&!o.name.startsWith('Vessel_Aort'))o.visible=false}
  if(lastView!==s.view){lastView=s.view;front()}draw();host.dataset.triangles=renderer.info.render.triangles;host.dataset.hinges=rig.summary().hinges;
 }
 function resize(){const {width,height}=host.getBoundingClientRect();if(!width||!height)return;const half=.108;camera.left=-half*width/height;camera.right=half*width/height;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();renderer.setSize(width,height);draw()}
 controls.addEventListener('change',draw);renderer.domElement.addEventListener('webglcontextlost',lost);observer=new ResizeObserver(resize);observer.observe(host);host.prepend(renderer.domElement);resize();
 if(signal.aborted){dispose();throw new DOMException('Cancelled','AbortError')}
 return {update,front,dispose};
 }catch(e){dispose();throw e}
}
