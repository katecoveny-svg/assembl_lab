// assembly Print Lab: customise the downhill bike, check its drawing, download STL / 3MF.
// Everything runs in the browser. The 3D view uses the same studio light as the study machines (kit3d.js):
// soft room light, a warm key with a soft navy shadow, neutral tone mapping so the pastels stay pastel.
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {DEFAULTS,RANGES,FRAME_SWATCHES,DETAIL_SWATCHES,wheelRange,normalise,createBike,makeSTL,make3MF} from './model.js';
import {drawingSVG} from './drawing.js';

const $=id=>document.getElementById(id);
const REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug=v=>String(v||DEFAULTS.name).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'bike-model';
const fmt=(n,d=1)=>Number(n).toLocaleString('en-NZ',{maximumFractionDigits:d});
const coils=t=>Math.max(6,Math.min(9,Math.round(t/25)));
let current=null,G=null,rebuildFrame=0,lastRadius=0;

// ---------------------------------------------------------------- controls
function swatches(host,list,input){
 host.innerHTML=list.map(([n,c])=>`<button type="button" class="pl-sw" data-c="${c}" aria-pressed="false" title="${n}"><i style="background:${c}"></i><span>${n}</span></button>`).join('');
 host.addEventListener('click',e=>{const b=e.target.closest('[data-c]');if(!b)return;input.value=b.dataset.c;input.dispatchEvent(new Event('input',{bubbles:true}))});
}
function markSwatches(){
 for(const [host,input] of [[$('frameSwatches'),$('frameColour')],[$('accentSwatches'),$('accentColour')]])
  host.querySelectorAll('[data-c]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.c.toLowerCase()===input.value.toLowerCase())));
}
function syncWheelRange(){
 const wb=Number($('wheelbase').value),[lo,hi]=wheelRange(wb),w=$('wheelDiameter'),prev=Number(w.value)||DEFAULTS.wheelDiameter;
 // read the value first: changing min and max can clamp it on the way through
 if(lo>Number(w.max)){w.max=hi;w.min=lo}else{w.min=lo;w.max=hi}
 w.value=String(Math.min(hi,Math.max(lo,prev)));
 $('wheelNote').textContent=`${lo}–${hi} mm suits a ${wb} mm wheelbase`;
}
function readOptions(){
 return normalise({name:$('modelName').value,wheelbase:$('wheelbase').value,wheelDiameter:$('wheelDiameter').value,suspension:$('suspension').value,
  frame:$('frameColour').value,accent:$('accentColour').value,detail:document.querySelector('input[name="detail"]:checked')?.value,base:$('base').checked});
}
function showOutputs(o){
 $('wheelbaseOut').textContent=`${o.wheelbase} mm`;$('wheelDiameterOut').textContent=`${o.wheelDiameter} mm`;
 $('suspensionOut').textContent=`${o.suspension} mm · ${coils(o.suspension)} coils`;
 markSwatches();
}
function setControls(o){
 $('modelName').value=o.name;$('frameColour').value=o.frame;$('accentColour').value=o.accent;$('wheelbase').value=o.wheelbase;
 syncWheelRange();$('wheelDiameter').value=o.wheelDiameter;$('suspension').value=o.suspension;
 document.querySelectorAll('input[name="detail"]').forEach(r=>r.checked=r.value===o.detail);$('base').checked=o.base;
}
function announce(t){$('modelStatus').textContent=t}

// ---------------------------------------------------------------- the 3D bench
function initScene(){
 try{
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1.0;renderer.setClearColor(0x000000,0);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('role','img');
  canvas.setAttribute('aria-label','A 3D downhill bike display model. Drag to turn it, scroll or pinch to zoom, or use the view buttons.');
  $('modelHost').replaceChildren(canvas);
  const scene=new THREE.Scene();
  const pm=new THREE.PMREMGenerator(renderer);scene.environment=pm.fromScene(new RoomEnvironment(),.04).texture;scene.environmentIntensity=.55;pm.dispose();
  scene.add(new THREE.HemisphereLight(0xffffff,0xd9d2e6,.4));
  const fill=new THREE.DirectionalLight(0xffffff,.5);fill.position.set(160,220,380);scene.add(fill);
  const sun=new THREE.DirectionalLight(0xfff3e4,2.4);sun.position.set(-220,420,190);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.0004;sun.shadow.normalBias=.35;sun.shadow.radius=4;
  Object.assign(sun.shadow.camera,{left:-240,right:240,top:240,bottom:-240,near:10,far:1400});scene.add(sun,sun.target);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(3000,3000),new THREE.ShadowMaterial({color:new THREE.Color('#1B2452'),opacity:.24}));
  ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
  const bedMat=new THREE.LineDashedMaterial({color:'#B2552D',dashSize:6,gapSize:4,transparent:true,opacity:.55});
  const bed=new THREE.LineLoop(new THREE.BufferGeometry(),bedMat);scene.add(bed);
  const camera=new THREE.PerspectiveCamera(30,1,1,6000);
  const orbit=new OrbitControls(camera,canvas);orbit.enableDamping=true;orbit.dampingFactor=.09;orbit.enablePan=false;
  orbit.minPolarAngle=0;orbit.maxPolarAngle=Math.PI*.495;orbit.rotateSpeed=.7;orbit.zoomSpeed=.8;
  G={renderer,scene,camera,orbit,ground,bed,sun,frame:0,tween:null,view:'three'};
  orbit.addEventListener('change',requestRender);
  orbit.addEventListener('start',()=>{G.tween=null;$('modelCase').classList.add('touched');setPressed(null)});
  orbit.listenToKeyEvents(canvas);
  const resize=()=>{const r=$('modelHost').getBoundingClientRect(),w=Math.max(1,Math.round(r.width)),h=Math.max(1,Math.round(r.height));
   renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();requestRender()};
  new ResizeObserver(resize).observe($('modelHost'));resize();
  return true;
 }catch(err){console.warn('Print Lab: 3D view unavailable, showing the drawing instead.',err);G=null;return false}
}
function requestRender(){if(G&&!G.frame)G.frame=requestAnimationFrame(tick)}
function tick(now){
 G.frame=0;
 if(G.tween){const t=Math.min(1,(now-G.tween.t0)/G.tween.ms),e=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  const dir=G.tween.d0.clone().lerp(G.tween.d1,e).normalize(),dist=G.tween.r0+(G.tween.r1-G.tween.r0)*e;
  G.orbit.target.lerpVectors(G.tween.c0,G.tween.c1,e);G.camera.position.copy(G.orbit.target).addScaledVector(dir,dist);
  if(t>=1)G.tween=null}
 const moved=G.orbit.update();
 G.renderer.render(G.scene,G.camera);
 if(moved||G.tween)requestRender();
}
const VIEWS={three:[.62,.34,1],side:[0,.04,1],front:[1,.08,.0001],top:[.0001,1,.035]};
function frameFor(view){
 const box=new THREE.Box3().setFromObject(current.group),sphere=box.getBoundingSphere(new THREE.Sphere()),c=box.getCenter(new THREE.Vector3());
 const v=G.camera.fov*Math.PI/180,h=2*Math.atan(Math.tan(v/2)*G.camera.aspect),size=box.getSize(new THREE.Vector3());
 // the 3/4 view fits the bounding sphere; the flat views fit the box's face with a small margin
 let dist;
 if(view==='three')dist=sphere.radius/Math.sin(Math.min(v,h)/2)*.78;
 else{const [w,hh,depth]=view==='side'?[size.x,size.y,size.z]:view==='front'?[size.z,size.y,size.x]:[size.x,size.z,size.y];
  dist=Math.max(w/2/Math.tan(h/2),hh/2/Math.tan(v/2))*1.12+depth/2}
 return{c,dist,dir:new THREE.Vector3(...VIEWS[view]).normalize(),radius:sphere.radius};
}
function setPressed(view){document.querySelectorAll('[data-view3d]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view3d===view)))}
function goView(view,animate=true){
 if(!G||!current)return;G.view=view;setPressed(view);
 const f=frameFor(view);
 G.camera.near=Math.max(1,f.dist/100);G.camera.far=f.dist*20;G.camera.updateProjectionMatrix();
 const d0=G.camera.position.clone().sub(G.orbit.target);
 if(!animate||REDUCED||d0.lengthSq()<1){G.orbit.target.copy(f.c);G.camera.position.copy(f.c).addScaledVector(f.dir,f.dist);G.orbit.update();requestRender();return}
 G.tween={t0:performance.now(),ms:520,c0:G.orbit.target.clone(),c1:f.c,d0:d0.clone().normalize(),d1:f.dir,r0:d0.length(),r1:f.dist};requestRender();
}
function placeBed(){
 if(!G||!current)return;const box=new THREE.Box3().setFromObject(current.group),c=box.getCenter(new THREE.Vector3()),b=Number($('bed').value)/2,y=box.min.y+.15;
 G.bed.geometry.dispose();G.bed.geometry=new THREE.BufferGeometry().setFromPoints([[-b,-b],[b,-b],[b,b],[-b,b]].map(([x,z])=>new THREE.Vector3(c.x+x,y,c.z+z)));G.bed.computeLineDistances();
 G.ground.position.y=box.min.y-.05;G.sun.target.position.copy(c);
}

// ---------------------------------------------------------------- rebuild everything from the controls
function dispose(){if(!current)return;current.group.traverse(m=>{if(m.isMesh)m.geometry.dispose()});Object.values(current.materials).forEach(m=>m.dispose());if(G)G.scene.remove(current.group)}
function rebuild(){
 rebuildFrame=0;syncWheelRange();const o=readOptions();showOutputs(o);
 const prev=current;dispose();current=createBike(THREE,o);const s=current.stats;
 $('statSize').textContent=`${fmt(s.length)} × ${fmt(s.width)} × ${fmt(s.height)} mm`;
 $('statTriangles').textContent=s.triangles.toLocaleString('en-NZ');
 $('statVolume').textContent=`≈ ${fmt(s.solidCm3)} cm³`;
 $('drawingSheet').innerHTML=drawingSVG(o,s);
 if(G){
  G.scene.add(current.group);$('modelFallback').hidden=true;$('modelHost').hidden=false;placeBed();
  const f=frameFor(G.view||'three');
  if(!prev||!lastRadius)goView(G.view||'three',false);
  else{const k=f.radius/lastRadius,off=G.camera.position.clone().sub(G.orbit.target).multiplyScalar(k);G.orbit.target.copy(f.c);G.camera.position.copy(f.c).add(off);G.orbit.update();requestRender()}
  lastRadius=f.radius;announce(`${o.detail==='fine'?'Fine':'Standard'} detail · ${s.triangles.toLocaleString('en-NZ')} triangles`);
 }else{$('modelHost').hidden=true;$('modelFallback').hidden=false;$('modelFallback').innerHTML=drawingSVG(o,s);announce('3D view unavailable on this device · showing the drawing')}
 preflight(o,s);
 document.documentElement.dataset.printlabReady='true';$('modelHost').dataset.triangles=String(s.triangles);
}
function scheduleRebuild(){if(!rebuildFrame)rebuildFrame=requestAnimationFrame(rebuild)}

function preflight(o,s){
 const bed=Number($('bed').value),fits=s.length<=bed&&s.width<=bed;
 const checks=[
  {ok:fits,t:fits?`Fits a ${bed} mm bed`:`Too big for a ${bed} mm bed`,d:fits?`Footprint ${fmt(s.length)} × ${fmt(s.width)} mm, ${fmt(s.height)} mm tall. Check your own printer’s build area too.`:`Footprint ${fmt(s.length)} × ${fmt(s.width)} mm. Shorten the wheelbase, choose smaller wheels, or use a bigger printer.`},
  {ok:o.base,t:o.base?'Flat plinth on the bed':'No plinth',d:o.base?'The plinth sits flat on the build plate and the tyres sit in two cradles.':'Only the tyre knobs touch the bed. It will need supports, and a stand or glue to display it.'},
  {ok:false,t:'Thin parts are 0.9 mm',d:'Spokes, chain, brake levers and the shock spring are 0.9 mm across, about two lines from a 0.4 mm nozzle. Print at 150% for a sturdier model.'},
  {ok:false,t:'Supports needed',d:'The frame, fork, bars and saddle overhang. Tree or organic supports are a good start. Preview every layer in your slicer.'},
  {ok:false,t:'Parts overlap, like welds',d:'The file is made of overlapping solid parts. Most slicers merge them when slicing; check the preview for gaps.'},
  {ok:s.triangles<=150000,t:`${s.triangles.toLocaleString('en-NZ')} triangles`,d:s.triangles<=150000?'A light file that slices quickly.':'A heavy file. Standard detail slices faster.'}
 ];
 $('preflightChecks').innerHTML=checks.map(c=>`<li class="${c.ok?'ok':'look'}"><b><span class="pl-dot" aria-hidden="true"></span>${esc(c.t)}<span class="sr"> (${c.ok?'ready':'check this'})</span></b><span>${esc(c.d)}</span></li>`).join('');
}

// ---------------------------------------------------------------- tabs: shape it, draw it, print it
const TABS=['design','drawing','make'];
function selectTab(name,focus=false,remember=true){
 if(!TABS.includes(name))name='design';
 TABS.forEach((t,i)=>{const on=t===name;$('tab-'+t).setAttribute('aria-selected',String(on));$('tab-'+t).tabIndex=on?0:-1;$('view-'+t).hidden=!on;$('tab-'+t).classList.toggle('done',TABS.indexOf(name)>i)});
 $('progBar').style.width=`${(TABS.indexOf(name)+1)/TABS.length*100}%`;
 if(name==='design')requestRender();
 if(focus)$('tab-'+name).focus();
 if(remember)history.replaceState(null,'',name==='design'?location.pathname:'#'+name);
}
TABS.forEach((t,i)=>{
 $('tab-'+t).addEventListener('click',()=>selectTab(t));
 $('tab-'+t).addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();
  const n=e.key==='Home'?0:e.key==='End'?TABS.length-1:(i+(e.key==='ArrowRight'?1:-1)+TABS.length)%TABS.length;selectTab(TABS[n],true)});
});
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>{selectTab(b.dataset.go);$('workbench').scrollIntoView({behavior:REDUCED?'auto':'smooth',block:'start'})}));

// ---------------------------------------------------------------- downloads
function download(name,content,type='application/octet-stream'){
 const blob=content instanceof Blob?content:new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);return blob;
}
const kb=b=>b.size>1048576?`${fmt(b.size/1048576)} MB`:`${Math.round(b.size/1024)} KB`;
function fileNote(t){$('fileStatus').textContent=t}
$('downloadSTL').addEventListener('click',()=>{try{const b=download(`${slug(current.options.name)}.stl`,makeSTL(current.group,current.options.name));fileNote(`STL saved (${kb(b)}). Open it in your slicer.`)}catch(e){console.error(e);fileNote('The STL could not be made. Reset the model and try again.')}});
$('download3MF').addEventListener('click',()=>{try{const b=download(`${slug(current.options.name)}.3mf`,make3MF(current.group,current.options.name));fileNote(`3MF saved (${kb(b)}). Open it in your slicer.`)}catch(e){console.error(e);fileNote('The 3MF could not be made. Reset the model and try again.')}});
$('downloadSpec').addEventListener('click',()=>{
 const o=current.options,s=current.stats,n=slug(o.name);
 const record={format:'assembly Print Lab design record',version:2,createdAt:new Date().toISOString(),settings:o,
  measurements:{units:'mm',length:s.length,width:s.width,height:s.height,wheelbase:o.wheelbase,wheelDiameter:o.wheelDiameter,headAngleDegrees:s.headAngle,plinth:s.plinth,triangles:s.triangles,solidVolumeCm3Upper:s.solidCm3},
  files:{stl:`${n}.stl`,threeMF:`${n}.3mf`,drawing:`${n}-drawing.svg`},
  notes:'Scale display model. Not rideable or safety-certified. STL and 3MF hold geometry only (no colours). Parts overlap and are merged by the slicer.',
  myReflection:{whatIChanged:'',why:'',whatITestedAfterPrinting:'',whatIWouldChangeNext:''}};
 download(`${n}-design.json`,JSON.stringify(record,null,2),'application/json');fileNote('Design record saved. Add your reflection to it.');
});
$('downloadSVG').addEventListener('click',()=>{download(`${slug(current.options.name)}-drawing.svg`,drawingSVG(current.options,current.stats),'image/svg+xml');$('drawStatus').textContent='Drawing saved as SVG.'});
$('printDrawing').addEventListener('click',()=>{selectTab('drawing');requestAnimationFrame(()=>requestAnimationFrame(()=>window.print()))});

// ---------------------------------------------------------------- wire up
swatches($('frameSwatches'),FRAME_SWATCHES,$('frameColour'));swatches($('accentSwatches'),DETAIL_SWATCHES,$('accentColour'));
for(const [id,[lo,hi,step]] of [['wheelbase',RANGES.wheelbase],['suspension',RANGES.suspension]])Object.assign($(id),{min:lo,max:hi,step});
$('bikeControls').addEventListener('submit',e=>e.preventDefault());
$('bikeControls').addEventListener('input',scheduleRebuild);$('bikeControls').addEventListener('change',scheduleRebuild);
$('bed').addEventListener('change',()=>{placeBed();preflight(current.options,current.stats);requestRender()});
$('resetModel').addEventListener('click',()=>{setControls(normalise(DEFAULTS));rebuild();if(G)goView('three');announce('Back to the starting bike')});
document.querySelectorAll('[data-view3d]').forEach(b=>b.addEventListener('click',()=>goView(b.dataset.view3d)));
setControls(normalise(DEFAULTS));
initScene();rebuild();
const first=location.hash.slice(1);selectTab(TABS.includes(first)?first:'design',false,false);
window.addEventListener('pagehide',()=>{if(G){cancelAnimationFrame(G.frame);G.orbit.dispose();G.renderer.dispose()}},{once:true});
