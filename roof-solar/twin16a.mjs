import {applyStudyFinish} from './study-finish.mjs';
// Mount the existing published 16A viewer, not a second model. Roof positions are
// raycast onto the real corrugated sheets before the removable overlay is added.
const url='/plan-studio/twins/16a/?still=1';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
export async function mountTwin16a(host,active){
 const frame=document.createElement('iframe');
 frame.title='Two timber homes: interactive 16A solar design study';
 frame.style.visibility='hidden'; frame.src=url;
 host.replaceChildren(frame); host.hidden=false;
 let w, a;
 for(let i=0;i<400&&active();i++){
  w=frame.contentWindow;
  a=w?.__twin;
  if(a?.built&&a.controls&&w.__at&&a.status.textContent.startsWith('Ready'))break;
  if(a?.status?.textContent.includes('could not start'))throw Error(a.status.textContent);
  await delay(150);
 }
 if(!active())return;
 if(!a?.status?.textContent.startsWith('Ready'))throw Error('The 16A WebGPU viewer did not finish starting.');
 const d=frame.contentDocument, extra=d.createElement('style');
 // An incompatible update must fail closed, never corrupt the twin's renderer.
 if(!d.querySelector('script[type=module][src$="twin-DxICRSSm.js"]'))throw Error('The 16A viewer was updated. Its solar overlay needs a compatibility check.');
 const bridge=d.createElement('script');bridge.type='module';bridge.src='/roof-solar/twin16a-bridge.mjs';
 await new Promise((resolve,reject)=>{bridge.onload=resolve;bridge.onerror=()=>reject(Error('The solar overlay could not open with the current 16A viewer.'));d.head.append(bridge);});
 if(!active())return;
 const T=w.__roofThree16a;
 if(!T)throw Error('The compatible Three.js classes were not available.');
 extra.textContent='body{margin:0!important;padding:0!important}body>header,body>.skip,body>main>nav,#labels,#al-nav,#status,#tip,#inspect,#photoGo,#photoView,.compass,body>.lab-way{display:none!important}body>main{display:block!important;margin:0!important;height:100dvh!important}body>main>.stage{width:100%!important;height:100dvh!important;min-height:0!important;border-radius:0!important}body>main>.stage canvas{height:100%!important;width:100%!important}';
 d.head.append(extra);
 a.resize();
 const lines=a.built.layers.find(l=>l.id==="lines"); if(lines)await a.setLayer(lines,false);
 const homes=a.scene.getObjectByName('proposed_homes');
 if(!homes)throw Error('The twin does not identify its proposed homes.');
 a.scene.updateMatrixWorld(true);
 const siteFinish=applyStudyFinish({app:a,T,doc:d});
 const roofPoints=new T.Group();roofPoints.name='solar_design_study_overlay';
 // One shared, original monocrystalline laminate. Main busbars and clipped
 // cell corners remain visible at roof distance; mipmaps suppress finger-grid shimmer.
 const face=document.createElement('canvas');face.width=1024;face.height=640;
 const ink=face.getContext('2d'); ink.fillStyle='#20282b';ink.fillRect(0,0,1024,640);
 for(let col=0;col<10;col++)for(let row=0;row<6;row++){
   const x=8+col*101,y=7+row*105+(row>2?2:0), w=98,h=101,c=5;
   const k=(col*7+row*3)%5;
   ink.fillStyle='rgb('+[37+k,47+k,53+k].join(',')+')';ink.beginPath();
   for(const [dx,dy] of [[c,0],[w-c,0],[w,c],[w,h-c],[w-c,h],[c,h],[0,h-c],[0,c]])ink.lineTo(x+dx,y+dy);
   ink.closePath();ink.fill();
   ink.fillStyle='rgba(184,189,187,.26)';
   for(let b=1;b<6;b++)ink.fillRect(x+b*w/6,y+1,1,h-2);
   ink.fillStyle='rgba(166,181,184,.12)';
   for(let f=3;f<h-2;f+=4)ink.fillRect(x+2,y+f,w-4,.6);
 }
 const map=new T.CanvasTexture(face);map.colorSpace='srgb';map.anisotropy=4;
 const frameMat=new T.MeshPhysicalMaterial({color:0x676d6c,metalness:.78,roughness:.29});
 const cellsMat=new T.MeshPhysicalMaterial({map,color:0xffffff,metalness:.13,roughness:.34,clearcoat:.83,clearcoatRoughness:.12});
 const footMat=new T.MeshStandardMaterial({color:0x353b3d,metalness:.26,roughness:.61});
 const WB=1.72, LB=1.13;
 const ray=new T.Raycaster();
 const units={}; const systems=[]; const roofCenters={};
 for(const key of ['16C','16D']){
  const base=w.__at(key,0,0,0), roof=homes.children.find(h=>h.position.distanceTo(base)<.1)?.getObjectByName('roof_sheets');
  if(!roof?.isMesh)throw Error('The existing roof sheet group was not found for '+key+'.');
  function locate(u,v){const x=w.__at(key,u,v,8);ray.set(x,new T.Vector3(0,-1,0));return ray.intersectObject(roof,false)[0]?.point;}
  const u0=locate(4,1.6),u1=locate(5,1.6),v1=locate(4,2.5),v0=locate(4,.7);
  if(!u0||!u1||!v1||!v0)throw Error('Could not register the real roof slopes.');
  const u=new T.Vector3().subVectors(u1,u0).normalize(),v=new T.Vector3().subVectors(v1,v0).normalize(),n=new T.Vector3().crossVectors(v,u).normalize();
  if(n.y<0)n.negate();
  const matrix=new T.Matrix4().makeBasis(u,n,new T.Vector3().crossVectors(u,n));
  units[key]=0;systems.push(u0);roofCenters[key]=new T.Vector3();
  for(let row=0;row<2;row++)for(let col=0;col<5;col++){
   const uu=1.76+1.79*col,vv=.49+1.15*row;
   // Check the four corners against the real sheet as well as the midpoint.
   const x=locate(uu,vv);
   if(!x||![-.83,.83].every(du=>[-.54,.54].every(dv=>locate(uu+du,vv+dv))))continue;
   const g=new T.Group();g.name=key+' solar design module';g.position.copy(x).addScaledVector(n,.065);g.quaternion.setFromRotationMatrix(matrix);
   const m=new T.Mesh(new T.BoxGeometry(WB,.034,LB),frameMat);
   const pane=new T.Mesh(new T.BoxGeometry(WB-.036,.012,LB-.036),cellsMat);pane.position.y=.022;
   const rail=new T.Mesh(new T.BoxGeometry(WB*.96,.043,.12),footMat);rail.position.y=-.03;
   m.castShadow=pane.castShadow=true;m.receiveShadow=pane.receiveShadow=true;g.add(m,pane,rail);roofPoints.add(g);roofCenters[key].add(g.position);units[key]++;
  }
 }
 if(units['16C']!==10||units['16D']!==10)throw Error('Not all 20 panels landed on the actual sheets.');

 a.plain.add(roofPoints);
 const look=new T.Vector3().addVectors(...systems).multiplyScalar(.5);
 const close=roofCenters['16D'].multiplyScalar(1/units['16D']);
 const eyeOffset=new T.Vector3(-19,31,-17);
 const priorFog=a.scene.fog;
 const haze={isFog:true,color:a.sun.color.clone().setHex(0xabb7b2),near:22,far:90};
 function reset(view='detail'){
  const aspect=host.clientWidth/Math.max(1,host.clientHeight);
  const overview=view==='overview', house=view==='home';
  const target=overview?look:house?close.clone().add(new T.Vector3(-.28,-1.1,-.8)):close;
  const offset=overview?eyeOffset:house?new T.Vector3(.55,7.4,-12.8):new T.Vector3(2.6,2.7,-4.35);
  // Photographic depth only for the ground-oriented shot. The survey overview
  // stays clear, with its original surroundings and subject extents visible.
  a.scene.fog=house?haze:priorFog;
  a.controls.target.copy(target);
  a.camera.position.copy(target).addScaledVector(offset,aspect<1 ? (overview?1.36:house?1.28:1.20) : 1);
  a.controls.update();
 }
 // Use the twin’s own summer design-study date, never a live observation.
 const date=new Intl.DateTimeFormat('en-NZ',{timeZone:'Pacific/Auckland',year:'numeric',month:'numeric',day:'numeric'}).formatToParts(a.when);
 const part=k=>+date.find(i=>i.type===k).value;
 a.setSun(a.constructor.nzToUTC(part('year'),part('month'),part('day'),17));
 reset();frame.style.visibility='visible';
 return {app:a,frame,overlay:roofPoints,units,reset,siteFinish};
}
