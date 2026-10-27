import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {DEFAULTS,createBike,makeSTL,make3MF} from './model.js';
import {drawingSVG} from './drawing.js';

const $=id=>document.getElementById(id);
const mode='public'; // the student download studio only; the private quote studio was left out
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const number=(id,min,max)=>Math.max(min,Math.min(max,Number($(id).value)||min));
const safeName=value=>String(value||DEFAULTS.name).trim().slice(0,30)||DEFAULTS.name;
const slug=value=>safeName(value).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'bike-model';
let current=null,scene=null,camera=null,renderer=null,orbit=null,ground=null,grid=null,rebuildFrame=0,renderFrame=0;

function optionsFromControls(){
 return{
  name:safeName($('modelName').value),
  wheelbase:number('wheelbase',160,220),
  wheelDiameter:number('wheelDiameter',56,78),
  suspension:number('suspension',130,200),
  frame:/^#[0-9a-f]{6}$/i.test($('frameColour').value)?$('frameColour').value:DEFAULTS.frame,
  accent:/^#[0-9a-f]{6}$/i.test($('accentColour').value)?$('accentColour').value:DEFAULTS.accent,
  detail:$('detail').value==='fine'?'fine':'standard',
  base:$('base').checked
 };
}
function updateOutputs(){
 $('wheelbaseOut').textContent=`${$('wheelbase').value} mm`;
 $('wheelDiameterOut').textContent=`${$('wheelDiameter').value} mm`;
 $('suspensionOut').textContent=`${$('suspension').value} mm travel reference`;
}
function download(name,content,type='application/octet-stream'){
 const blob=content instanceof Blob?content:new Blob([content],{type});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),2500);
}
function announce(text){$('modelStatus').textContent=text}
function disposeBike(){
 if(!current)return;
 current.group.traverse(object=>{if(object.isMesh)object.geometry.dispose()});
 Object.values(current.materials).forEach(material=>material.dispose());
 if(scene)scene.remove(current.group);
}
function fitCamera(){
 if(!camera||!orbit||!current)return;
 const box=new THREE.Box3().setFromObject(current.group),size=box.getSize(new THREE.Vector3()),centre=box.getCenter(new THREE.Vector3());
 const aspect=Math.max(.5,camera.aspect),fit=Math.max(size.y,size.x/aspect,size.z*.8);
 const distance=fit/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)))*(aspect<1?1.16:1.42);
 const direction=new THREE.Vector3(1.05,.55,1.35).normalize();
 camera.position.copy(centre).addScaledVector(direction,distance);
 camera.near=Math.max(.5,distance/1000);camera.far=Math.max(2000,distance*8);camera.updateProjectionMatrix();
 orbit.target.copy(centre);orbit.minDistance=Math.max(70,distance*.28);orbit.maxDistance=distance*2.8;orbit.update();
 requestRender();
}
function requestRender(){
 if(!renderer||renderFrame)return;
 renderFrame=requestAnimationFrame(()=>{renderFrame=0;if(scene&&camera)renderer.render(scene,camera)});
}
function makeFallback(){
 $('modelHost').hidden=true;$('modelFallback').hidden=false;
 $('modelFallback').innerHTML=drawingSVG(current.options,current.stats);
 announce('STATIC DRAWING · 3D VIEW UNAVAILABLE');
}
function initScene(){
 try{
  scene=new THREE.Scene();scene.background=new THREE.Color('#F7F3EC');
  camera=new THREE.PerspectiveCamera(35,1,1,3000);
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Interactive three-dimensional downhill-bike display model. Drag to orbit, scroll to zoom, or use Reset view.');
  $('modelHost').replaceChildren(canvas);
  scene.add(new THREE.HemisphereLight('#fffdf7','#a49c91',2.1));
  const key=new THREE.DirectionalLight('#fff7e9',3.1);key.position.set(-180,300,210);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-300;key.shadow.camera.right=300;key.shadow.camera.top=260;key.shadow.camera.bottom=-220;key.shadow.camera.near=1;key.shadow.camera.far=900;key.shadow.bias=-.00025;scene.add(key);
  const fill=new THREE.DirectionalLight('#DCF2E8',1.25);fill.position.set(200,100,-180);scene.add(fill);
  ground=new THREE.Mesh(new THREE.PlaneGeometry(1600,1600),new THREE.MeshStandardMaterial({color:'#F7F3EC',roughness:1}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
  grid=new THREE.GridHelper(700,35,'#b9b1a7','#d7d1ca');grid.material.transparent=true;grid.material.opacity=.24;scene.add(grid);
  orbit=new OrbitControls(camera,canvas);orbit.enableDamping=false;orbit.enablePan=true;orbit.screenSpacePanning=true;orbit.maxPolarAngle=Math.PI*.49;orbit.addEventListener('change',requestRender);orbit.listenToKeyEvents(canvas);
  const resize=()=>{const rect=$('modelHost').getBoundingClientRect(),w=Math.max(1,Math.round(rect.width)),h=Math.max(1,Math.round(rect.height));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();requestRender()};
  new ResizeObserver(resize).observe($('modelHost'));resize();
 }catch(error){
  console.warn('Print Lab is using its static drawing fallback.',error);
  if(renderer)renderer.dispose();renderer=null;scene=null;camera=null;orbit=null;
 }
}
function preflight(o,s){
 const longest=Math.max(s.bounds.x,s.bounds.y,s.bounds.z);
 const checks=[
  {ok:longest<=250,title:longest<=250?'Print envelope is classroom-scale':'Check your printer bed',text:`Longest axis ${longest.toFixed(1)} mm. Compare this with your printer’s usable build area.`},
  {ok:s.triangles<=120000,title:'Mesh detail recorded',text:`${s.triangles.toLocaleString('en-NZ')} triangles. A slicer may take longer with fine detail.`},
  {ok:false,title:'Fine features need inspection',text:'Spokes, chain and coil details are delicate. Preview every layer and consider scaling up if your slicer flags them.'},
  {ok:o.base,title:o.base?'Display plinth included':'No integrated display plinth',text:o.base?'Keep the plinth on the build plate as a starting orientation.':'Choose a stable orientation and expect more support material.'},
  {ok:false,title:'Intersecting shells must be united',text:'This is a display model made from overlapping components. Use your slicer’s union/overlap settings and inspect the sliced result.'}
 ];
 $('preflightChecks').innerHTML=`<ul class="preflight-list">${checks.map(c=>`<li class="${c.ok?'pass':'review'}"><b>${c.ok?'Ready to review':'Review'} · ${c.title}</b><span>${c.text}</span></li>`).join('')}</ul>`;
}
function rebuild(){
 rebuildFrame=0;updateOutputs();disposeBike();
 const options=optionsFromControls();current=createBike(THREE,options);
 if(scene)scene.add(current.group);
 const {stats:s}=current;
 $('statSize').textContent=`${s.bounds.x} × ${s.bounds.y} × ${s.bounds.z} mm`;
 $('statTriangles').textContent=s.triangles.toLocaleString('en-NZ');
 $('statMaterial').textContent=`≈ ${s.filament} cm³`;
 const drawing=drawingSVG(current.options,s);$('drawingSheet').innerHTML=drawing;
 if(renderer){$('modelFallback').hidden=true;$('modelHost').hidden=false;if(ground&&grid){const box=new THREE.Box3().setFromObject(current.group);ground.position.y=box.min.y-.12;grid.position.y=box.min.y-.1}fitCamera();announce(`MODEL READY · ${current.options.detail.toUpperCase()} DETAIL`)}else makeFallback();
 preflight(current.options,s);
 $('modelHost').dataset.ready='true';$('modelHost').dataset.triangles=String(s.triangles);
 document.documentElement.dataset.printlabReady='true';
}
function scheduleRebuild(){if(!rebuildFrame)rebuildFrame=requestAnimationFrame(rebuild)}

const tabs=['design','drawing','make'];
function selectView(view,focus=false,remember=true){
 if(!tabs.includes(view))view='design';
 tabs.forEach(name=>{const active=name===view;$('tab-'+name).setAttribute('aria-selected',String(active));$('tab-'+name).tabIndex=active?0:-1;$('view-'+name).hidden=!active});
 if(view==='design')requestRender();
 if(focus)$('tab-'+view).focus();
 if(remember)history.replaceState(null,'',view==='design'?'#workbench':'#'+view);
}
tabs.forEach((name,index)=>{
 $('tab-'+name).addEventListener('click',()=>selectView(name));
 $('tab-'+name).addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;selectView(tabs[next],true)});
});

$('bikeControls').addEventListener('submit',event=>event.preventDefault());
$('bikeControls').addEventListener('input',scheduleRebuild);$('bikeControls').addEventListener('change',scheduleRebuild);
$('resetModel').addEventListener('click',()=>{
 $('modelName').value=DEFAULTS.name;$('frameColour').value=DEFAULTS.frame;$('accentColour').value=DEFAULTS.accent;$('wheelbase').value=DEFAULTS.wheelbase;$('wheelDiameter').value=DEFAULTS.wheelDiameter;$('suspension').value=DEFAULTS.suspension;$('detail').value=DEFAULTS.detail;$('base').checked=DEFAULTS.base;rebuild();announce('STARTING MODEL RESTORED');
});
$('resetCamera').addEventListener('click',()=>{fitCamera();announce(renderer?'VIEW RESET':'STATIC DRAWING · 3D VIEW UNAVAILABLE')});
$('downloadSTL').addEventListener('click',()=>{try{announce('PREPARING STL…');download(`${slug(current.options.name)}.stl`,makeSTL(current.group,current.options.name));announce('STL DOWNLOADED · CHECK IT IN YOUR SLICER')}catch(error){console.error(error);announce('STL COULD NOT BE CREATED · PLEASE RESET AND TRY AGAIN')}});
$('download3MF').addEventListener('click',()=>{try{announce('PREPARING 3MF…');download(`${slug(current.options.name)}.3mf`,make3MF(current.group,current.options.name));announce('3MF DOWNLOADED · CHECK IT IN YOUR SLICER')}catch(error){console.error(error);announce('3MF COULD NOT BE CREATED · PLEASE RESET AND TRY AGAIN')}});
$('downloadSVG').addEventListener('click',()=>{download(`${slug(current.options.name)}-drawing.svg`,drawingSVG(current.options,current.stats),'image/svg+xml');announce('DRAWING DOWNLOADED')});
$('printDrawing').addEventListener('click',()=>{selectView('drawing');requestAnimationFrame(()=>requestAnimationFrame(()=>window.print()))});
$('downloadSpec').addEventListener('click',()=>{
 const record={format:'assembl Print Lab design record',version:1,createdAt:new Date().toISOString(),mode,settings:current.options,measurements:current.stats,files:{stl:`${slug(current.options.name)}.stl`,threeMF:`${slug(current.options.name)}.3mf`,drawing:`${slug(current.options.name)}-drawing.svg`},important:'Scale display model. Not rideable or safety-certified. STL and 3MF contain geometry, not preview colours. Intersecting component shells require slicer inspection.',learning:'Use the drawing and iteration notes as design-process evidence; follow your teacher’s current assessment conditions.'};
 download(`${slug(current.options.name)}-design.json`,JSON.stringify(record,null,2),'application/json');announce('DESIGN RECORD DOWNLOADED');
});

if(mode==='public'){
 if($('quoteZone'))$('quoteZone').hidden=true;$('tab-make').textContent='03 · Print files';document.body.dataset.printMode='public';
}


initScene();rebuild();
const initialView=location.hash.slice(1);selectView(tabs.includes(initialView)?initialView:'design',false,false);
window.addEventListener('pagehide',()=>{if(renderFrame)cancelAnimationFrame(renderFrame);if(rebuildFrame)cancelAnimationFrame(rebuildFrame);orbit?.dispose();renderer?.dispose()},{once:true});
