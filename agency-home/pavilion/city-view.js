import * as THREE from 'three';
import {createWorld} from 'https://lab.assembl.co.nz/auckland/live/scene.js?v=dd0baa0eb7';
import {subscribeReports} from './vehicle-reports.js?v=00fa4f7d40';
const tell=(type,data={})=>parent.postMessage({city:type,...data},location.origin);
const canvas=document.querySelector('canvas'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
const phone=innerWidth<680;
let world, rows=new Map(),selected=null,firstVisit=true,unsubscribe;
const hosted=parent!==window && document.referrer && new URL(document.referrer).origin===location.origin;
let preferred='bus';
function choose(v) {
  if(!v)return;
  selected=v.id;preferred=v.mode;
  const ground=v.mode==='ferry'?0:world.heightAt(v.x,v.z);
  const distance={bus:21,ferry:58,train:95}[v.mode]*(phone?1.34:1);
  world.controls.minDistance=14;
  world.select(v.id);
  world.flyTo([v.x,ground+(v.mode==='ferry'?3.5:1.7),v.z],distance,.36,(v.heading||0)+1.84,v.mode==='bus');
  tell('selection',{selected:v});
}
function candidates(mode){
  return [...rows.values()].filter(v=>v.mode===mode).sort((a,b)=>{
    const score=v=>Math.hypot(v.x+1754,v.z+378)+Math.max(0,Date.now()/1000-v.ts)*4;
    return score(a)-score(b);
  });
}
function followMode(mode,cycle=false){
  const available=candidates(mode);
  const clear=mode==='bus'?available.filter(v=>world.hasStreetView(v)):available;
  const choices=clear.length?clear:available;
  if(!choices.length)return;
  const i=cycle?choices.findIndex(v=>v.id===selected):-1;
  choose(choices[(i+1)%choices.length]);
}
function showReports(report, requestedId) {
  if(!report.available){
    rows.clear();selected=null;world.unfollow();world.setVehicles([]);
    tell('modes',{modes:{}});tell('unavailable');return;
  }
  rows=new Map(report.vehicles.map(v=>[v.id,v]));
  world.setVehicles(report.vehicles);
  if(selected&&!rows.has(selected)){selected=null;world.unfollow();}
  const modes=Object.fromEntries(['bus','ferry','train'].map(k=>[k,candidates(k).length]));
  tell('modes',{modes});
  if(requestedId && rows.has(requestedId))choose(rows.get(requestedId));
  else if(!selected && rows.size)followMode(modes[preferred]?preferred:Object.keys(modes).find(k=>modes[k]));
  const recent=report.vehicles.reduce((ts,v)=>Math.max(ts,v.ts),0);
  tell('updates',{count:rows.size,ts:recent,selected:selected&&rows.get(selected)});
  if(requestedId && !rows.has(requestedId))tell('expired');
}
function orbit(angle,zoom=1){
  world.stopFlight();world.unfollow();
  const offset=world.camera.position.clone().sub(world.controls.target);
  const distance=THREE.MathUtils.clamp(offset.length()*zoom,14,2300);
  offset.applyAxisAngle(new THREE.Vector3(0,1,0),angle).setLength(distance);
  world.camera.position.copy(world.controls.target).add(offset);world.controls.update();
}
function installInput(){
  // Native document scrolling has priority over map wheel zoom and vertical touch drags.
  world.controls.disconnect();canvas.style.touchAction='pan-y pinch-zoom';
  let start;
  canvas.onpointerdown=e=>{if(e.isPrimary&&e.button===0){start={x:e.clientX,y:e.clientY,last:e.clientX,id:e.pointerId};canvas.setPointerCapture(e.pointerId)}};
  canvas.onpointermove=e=>{if(start?.id!==e.pointerId)return;
    if(Math.abs(e.clientX-start.x)>5&&Math.abs(e.clientX-start.x)>Math.abs(e.clientY-start.y)){
      orbit(-(e.clientX-start.last)/canvas.clientWidth*2.45);start.dragged=true;
    }
    start.last=e.clientX;
  };
  canvas.onpointerup=e=>{if(start?.id!==e.pointerId)return;
    if(!start.dragged&&Math.hypot(e.clientX-start.x,e.clientY-start.y)<9){
      const id=world.pick(e.clientX,e.clientY,phone?32:19),v=rows.get(id);
      if(v)choose(v)
    }
    start=null;
  };
  canvas.onpointercancel=()=>{start=null};
  canvas.onkeydown=e=>{const keys={ArrowLeft:[-.12,1],ArrowRight:[.12,1],'+':[0,.84],'=':[0,.84],'-':[0,1.19]};
    if(keys[e.key]){e.preventDefault();orbit(...keys[e.key])}
  };
}
// Project the cleared harbour-facing upper elevation onto the existing model's relief.
async function finishQuayFront(){
 const terminal=world.scene.children.find(obj=>obj.name.startsWith('Ferry Building /'));
 if(!terminal)return;
 const photo=await new THREE.TextureLoader().loadAsync('./assets/ferry-quay-front.webp');
 photo.colorSpace=THREE.SRGBColorSpace;photo.anisotropy=Math.min(8,world.renderer.capabilities.getMaxAnisotropy());
 for(const mesh of terminal.children){
  if(!mesh.isMesh)continue;
  const mat=mesh.material;mat.onBeforeCompile=shader=>{
   shader.uniforms.quayFront={value:photo};
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vQuay; varying float vQuayFace;')
    .replace('#include <begin_vertex>','#include <begin_vertex>\nvQuay=position;vQuayFace=-normal.z;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vQuay; varying float vQuayFace; uniform sampler2D quayFront;')
    .replace('#include <color_fragment>',`#include <color_fragment>
     vec2 uv=vec2(.5-vQuay.x/63.4,(vQuay.y-7.1)/14.6);
     if(vQuay.z < -6.9 && vQuayFace>.5 && uv.x>=0. && uv.x<=1. && uv.y>=0. && uv.y<=1.){
      vec3 masonry=texture2D(quayFront,uv).rgb;
      diffuseColor.rgb=mix(diffuseColor.rgb,masonry,smoothstep(.5,.92,vQuayFace)*.91);
     }`);
  };mat.needsUpdate=true;
 }
}
// Real glazing colour and spandrel detail on taller curtain walls. Keep the surveyed roofs.
async function finishCityGlass(){
 const buildings=world.scene.getObjectByName('buildings_OSM_render_height');
 if(!buildings)return;
 const glass=await new THREE.TextureLoader().loadAsync('./assets/quay-glazing.webp');
 glass.colorSpace=THREE.SRGBColorSpace;glass.wrapS=glass.wrapT=THREE.MirroredRepeatWrapping;
 glass.anisotropy=Math.min(8,world.renderer.capabilities.getMaxAnisotropy());
 const material=buildings.material,previous=material.onBeforeCompile;
 material.onBeforeCompile=function(shader,renderer){
  previous.call(this,shader,renderer);
  shader.uniforms.quayGlass={value:glass};
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D quayGlass;').replace('vec2 roofUV =',`
   float facingGlass=smoothstep(22.,47.,bH)*isWall*smoothstep(2.2,5.,vFac.y);
   vec2 glazingUV=vFac.xy/vec2(24.,17.)+vec2(bSeed,.23*bSeed);
   vec3 realPane=texture2D(quayGlass,glazingUV).rgb;
   float skyFraction=smoothstep(.1,.86,vFac.y/max(1.,bH));
   realPane=mix(realPane,vec3(.19,.29,.36),.12+.24*skyFraction);
   diffuseColor.rgb=mix(diffuseColor.rgb,realPane,facingGlass*(.52+.28*bSeed));
   vec2 roofUV =`);
 };
 material.needsUpdate=true;
}
async function start(){
  world=await createWorld(canvas,{phone});
  installInput();
  finishQuayFront().catch(()=>{});
  finishCityGlass().catch(()=>{});
  // Resolve rooftop photography before flight and wait for the first painted city frame.
  let startTime=performance.now();
  world.onFrame=()=>{
    if(!firstVisit||(!world.stats().aerial&&performance.now()-startTime<2200))return;
    firstVisit=false;world.onFrame=null;tell('ready');
  };
  addEventListener('message',e=>{
    if(!hosted||e.origin!==location.origin||e.source!==parent)return;
    if(e.data?.city==='positions')showReports(e.data.report,e.data.requestedId);
    if(e.data?.city==='select'){
      const vehicle=rows.get(e.data.id);if(vehicle)choose(vehicle);else tell('expired');
    }
    if(e.data?.city==='next')followMode(preferred,true);
    if(e.data?.city==='follow'&&['bus','ferry','train'].includes(e.data.mode))followMode(e.data.mode,true);
  });
  if(hosted)tell('subscribe');else unsubscribe=subscribeReports(showReports,15000);
  canvas.addEventListener('webglcontextlost',()=>tell('failed'),{once:true});
  window.cityView={world,rows:()=>[...rows.values()]};
}
start().catch(()=>tell('failed'));
addEventListener('pagehide',()=>unsubscribe?.());
