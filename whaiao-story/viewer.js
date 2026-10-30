import * as THREE from 'three';
import {OrbitControls} from '/assets/vendor/three/addons/controls/OrbitControls.js';
export function createViewer(host,onRoom,onStatus){
 const canvas=document.createElement('canvas');
 let renderer;
 try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'low-power'});}catch{throw Error('This browser is showing the plan view. The story and comparisons still work.');}
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 canvas.setAttribute('aria-label','Illustrative community pavilion. Drag to orbit; use the named viewpoints for keyboard navigation.');canvas.tabIndex=0;
 host.append(canvas);
 const scene=new THREE.Scene();scene.background=new THREE.Color('#e9e6df');
 const camera=new THREE.PerspectiveCamera(36,1,.1,300);camera.position.set(24,21,27);
 const controls=new OrbitControls(camera,canvas);controls.target.set(0,0,0);controls.enableDamping=false;controls.minDistance=3;controls.maxDistance=75;controls.maxPolarAngle=Math.PI*.48;controls.enablePan=true;
 const hemi=new THREE.HemisphereLight(0xfffbf0,0xb5b0a0,2.5);scene.add(hemi);
 const sun=new THREE.DirectionalLight(0xfff3dc,4);sun.position.set(-18,28,20);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-25;sun.shadow.camera.right=25;sun.shadow.camera.top=25;sun.shadow.camera.bottom=-25;sun.shadow.normalBias=.035;scene.add(sun);
 const fill=new THREE.DirectionalLight(0xd9e3f3,1.3);fill.position.set(20,9,-15);scene.add(fill);
 const M={
  stone:new THREE.MeshStandardMaterial({color:'#d8d1c7',roughness:.91}),
  wall:new THREE.MeshStandardMaterial({color:'#ede8df',roughness:.87}),
  timber:new THREE.MeshStandardMaterial({color:'#af8865',roughness:.7}),
  dark:new THREE.MeshStandardMaterial({color:'#444b46',roughness:.78}),
  roof:new THREE.MeshStandardMaterial({color:'#7b827b',roughness:.72,side:THREE.DoubleSide}),
  glass:new THREE.MeshStandardMaterial({color:'#c6dbd5',transparent:true,opacity:.3,roughness:.2,metalness:.1,depthWrite:false}),
  ground:new THREE.MeshStandardMaterial({color:'#c5c8b8',roughness:1}),
  leaf:new THREE.MeshStandardMaterial({color:'#8d9a7b',roughness:1}),
  seat:new THREE.MeshStandardMaterial({color:'#c2a7a2',roughness:.8}),
  table:new THREE.MeshStandardMaterial({color:'#e8dbc6',roughness:.72}),
  path:new THREE.MeshStandardMaterial({color:'#e3dfd6',roughness:1})
 };
 const model=new THREE.Group(),roofs=new THREE.Group(),shelter=new THREE.Group(),garden=new THREE.Group();scene.add(model);model.add(roofs,shelter,garden);
 const pickables=[];let custom=null,isVisible=true,stopped=false,raf=0,tween=null,current={roof:true,option:'shelter',light:'day'};
 function box(parent,name,size,pos,mat,room,rotation=0){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);mesh.name=name;mesh.position.set(...pos);mesh.rotation.y=rotation;mesh.castShadow=true;mesh.receiveShadow=true;if(room){mesh.userData.room=room;pickables.push(mesh);}parent.add(mesh);return mesh;
 }
 function cylinder(parent,name,radius,height,pos,mat){
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,14),mat);mesh.name=name;mesh.position.set(...pos);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
 }
 box(model,'Site study base',[27,.32,19],[0,-.42,0],M.ground);
 box(model,'Terrace',[23,.2,3.2],[0,-.16,6.5],M.timber,'arrival');
 box(model,'Courtyard',[8,.14,7],[0,-.18,1.5],M.path,'outside');
 function building(x,z,w,d,room,label){
  const h=3.1;
  box(model,label+' floor',[w,.24,d],[x,0,z],M.stone,room);
  box(model,label+' back wall',[w,h,.17],[x,h/2,z-d/2],M.wall,room);
  box(model,label+' outer wall',[.17,h,d],[x+(x<0?-w/2:w/2),h/2,z],M.wall,room);
  const frontZ=z+d/2;
  box(model,label+' front glazing',[w-.35,h-.35,.055],[x,h/2,frontZ],M.glass,room);
  box(model,label+' garden glazing',[.055,h-.35,d-.4],[x+(x<0?w/2:-w/2),h/2,z],M.glass,room);
  for(let i=0;i<5;i++)box(model,label+' front mullion '+i,[.06,h,.09],[x-w/2+i*w/4,h/2,frontZ],M.dark,room);
  for(const zz of [-1,1])box(model,label+' lintel '+zz,[w,.09,.12],[x,zz<0?.12:h,frontZ],M.dark);
  for(const side of [-1,1]){
   const slope=new THREE.Mesh(new THREE.BoxGeometry(w/2+.2,.14,d+.7),M.roof);slope.name=label+' roof '+side;slope.position.set(x+side*w/4,h+.35,z);slope.rotation.z=-side*.15;slope.castShadow=true;roofs.add(slope);
  }
  const count=Math.round(d/.23),geo=new THREE.BoxGeometry(.045,h,.075),slats=new THREE.InstancedMesh(geo,M.timber,count),dummy=new THREE.Object3D();
  for(let i=0;i<count;i++){dummy.position.set(x+(x<0?-w/2-.1:w/2+.1),h/2,z-d/2+i*d/count);dummy.updateMatrix();slats.setMatrixAt(i,dummy.matrix);}
  slats.name=label+' timber battens';slats.castShadow=true;model.add(slats);
 }
 building(-6,-.6,8,8.5,'gather','Shared room');building(5,1,6,6,'make','Flexible room');
 box(model,'Rear link floor',[14,.2,2],[-.5,-.02,-5.5],M.stone);
 box(model,'Rear link wall',[14,2.8,.16],[-.5,1.4,-6.5],M.wall);
 box(roofs,'Rear link roof',[14.6,.14,2.5],[-.5,3.02,-5.5],M.roof);
 function table(x,z,room,scale=1){
  box(model,'Movable table top',[2.1*scale,.09,.9*scale],[x,.82,z],M.table,room);
  for(const dx of [-.8,.8])for(const dz of [-.3,.3])box(model,'Table leg',[.05,.72,.05],[x+dx*scale,.42,z+dz*scale],M.dark);
  for(const dx of [-.65,.65])for(const dz of [-.68,.68]){box(model,'Chair seat',[.45,.08,.45],[x+dx,.45,z+dz],M.seat);box(model,'Chair back',[.45,.45,.06],[x+dx,.69,z+dz+Math.sign(dz)*.2],M.timber);}
 }
 table(-6,-2,'gather');table(-6,1,'gather');table(5,1,'make',.8);
 box(model,'Shared room storage',[.5,1.1,3],[-9.45,.65,-1],M.timber);
 box(model,'Workshop storage',[3,1.2,.5],[5,.7,-1.55],M.wall);
 for(const x of [-4,0,4,8])cylinder(model,'Canopy post',.055,2.9,[x,1.4,4.1],M.dark);
 const canopyA=box(shelter,'Deeper canopy',[14,.12,2],[-.5,2.95,4],M.roof);
 const canopyB=box(garden,'Shallower canopy',[14,.12,1],[-.5,2.95,3.5],M.roof);
 box(shelter,'Smaller planting bed',[6,.2,3],[-.2,-.08,1.4],M.ground,'outside');
 box(garden,'Larger planting bed',[8,.2,4],[-.2,-.08,1.4],M.ground,'outside');
 function planting(parent,count,span){for(let i=0;i<count;i++){const x=(i%4-1.5)*span/4,z=Math.floor(i/4)*.9+.4;cylinder(parent,'Plant stem',.025,.5,[x,.3,z],M.timber);const plant=new THREE.Mesh(new THREE.IcosahedronGeometry(.32,1),M.leaf);plant.position.set(x,.65,z);plant.scale.set(1,.8,1);parent.add(plant);}}
 planting(shelter,8,5);planting(garden,12,7);
 for(const [x,z] of [[-12,-5],[11,-5],[11,6],[-12,6]]){cylinder(model,'Tree trunk',.12,2.2,[x,.8,z],M.timber);const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(1.25,2),M.leaf);crown.position.set(x,2.2,z);crown.castShadow=true;model.add(crown);}
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=null;
 canvas.addEventListener('pointerdown',e=>down={x:e.clientX,y:e.clientY});
 canvas.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>5||custom)return;const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(pickables,false).find(x=>x.object.visible);if(hit)onRoom(hit.object.userData.room);});
 function draw(){
  raf=0;if(stopped||!isVisible||document.hidden)return;
  if(tween){const q=Math.min(1,(performance.now()-tween.start)/700),t=1-Math.pow(1-q,3);camera.position.lerpVectors(tween.from,tween.to,t);controls.target.lerpVectors(tween.targetFrom,tween.targetTo,t);if(q===1)tween=null;}
  controls.update();renderer.render(scene,camera);if(tween)request();
 }
 function request(){if(!raf&&!stopped)raf=requestAnimationFrame(draw);}
 function view(position,target){
  if(custom){fit();return;}
  const to=new THREE.Vector3(...position),tar=new THREE.Vector3(...target),narrow=host.clientWidth<600;if(narrow){to.sub(tar).multiplyScalar(1.35).add(tar);}
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){camera.position.copy(to);controls.target.copy(tar);tween=null;}else tween={from:camera.position.clone(),to,targetFrom:controls.target.clone(),targetTo:tar,start:performance.now()};
  request();
 }
 controls.addEventListener('start',()=>{tween=null;});controls.addEventListener('change',request);
 canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();if(e.key==='Home'){view([24,21,27],[0,0,0]);return;}const offset=camera.position.clone().sub(controls.target),s=new THREE.Spherical().setFromVector3(offset);s.theta+=e.key==='ArrowLeft'?-.15:e.key==='ArrowRight'?.15:0;s.phi=THREE.MathUtils.clamp(s.phi+(e.key==='ArrowUp'?-.12:e.key==='ArrowDown'?.12:0),.15,Math.PI*.48);camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(s));request();});
 const resize=()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();request();};
 const ro=new ResizeObserver(resize);ro.observe(host);
 const io=new IntersectionObserver(es=>{isVisible=es[0].isIntersecting;if(isVisible)request();});io.observe(host);
 const visible=()=>{if(!document.hidden)request();};document.addEventListener('visibilitychange',visible);
 function update(state){
  current=state;roofs.visible=state.roof;shelter.visible=state.option==='shelter';garden.visible=!shelter.visible;
  canopyA.visible=canopyB.visible=state.roof;
  const evening=state.light==='evening';scene.background.set(evening?'#d8d2d1':'#e9e6df');hemi.intensity=evening?1.6:2.5;sun.intensity=evening?2.4:4;sun.color.set(evening?'#ffd0ab':'#fff3dc');sun.position.set(evening?-26:-18,evening?9:28,20);request();
 }
 function fit(){const object=custom||model,b=new THREE.Box3().setFromObject(object),size=b.getSize(new THREE.Vector3()),centre=b.getCenter(new THREE.Vector3()),d=Math.max(size.x,size.y,size.z)*2.1;camera.position.copy(centre).add(new THREE.Vector3(d,d*.7,d));controls.target.copy(centre);controls.maxDistance=Math.max(75,d*3);controls.minDistance=Math.max(.05,d*.025);camera.near=Math.max(.01,d/2000);camera.far=Math.max(300,d*20);camera.updateProjectionMatrix();request();}
 async function loadGLB(buffer){
  const {GLTFLoader}=await import('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js');
  const result=await new Promise((resolve,reject)=>new GLTFLoader().parse(buffer,'',resolve,reject));
  if(stopped)return;clearCustom();custom=result.scene;scene.add(custom);model.visible=false;fit();onStatus('Your model is open locally. Demonstration chapter anchors are hidden because they do not describe this model.');
 }
 function clearCustom(){if(custom){scene.remove(custom);custom.traverse(o=>{o.geometry?.dispose();if(o.material){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>{for(const value of Object.values(m))if(value?.isTexture)value.dispose();m.dispose();});}});custom=null;}model.visible=true;update(current);}
 function capture(){renderer.render(scene,camera);return canvas.toDataURL('image/png');}
 function dispose(){stopped=true;cancelAnimationFrame(raf);ro.disconnect();io.disconnect();document.removeEventListener('visibilitychange',visible);controls.dispose();clearCustom();model.traverse(o=>o.geometry?.dispose());Object.values(M).forEach(m=>m.dispose());renderer.dispose();canvas.remove();}
 update(current);resize();request();
 return {view,update,loadGLB,resetModel:()=>{clearCustom();view([24,21,27],[0,0,0]);},capture,fit,dispose};
}
