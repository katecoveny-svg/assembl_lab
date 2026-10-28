import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

const $ = id => document.getElementById(id);
const host=$('habitatViewport'), shell=host.parentElement, panel=$('panel-zoo');
const status=$('habitatStatus'), summary=$('habitatSummary'), tools=$('habitatTools');
const controlsList=[...panel.querySelectorAll('[data-zoo]')];
const low=new URLSearchParams(location.search).get('quality')==='low';
const drawing=new URLSearchParams(location.search).has('lite');
let renderer,scene,camera,orbit,world,frame=0;
const mats=new Map();
function material(colour,roughness=.8){const key=colour+':'+roughness;if(!mats.has(key))mats.set(key,new THREE.MeshStandardMaterial({color:colour,roughness}));return mats.get(key)}
const sphere=new THREE.SphereGeometry(1,20,14), stone=new THREE.IcosahedronGeometry(1,1);
function mesh(g,m,parent,x=0,y=0,z=0){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=!low;o.receiveShadow=true;parent.add(o);return o}
function ell(parent,c,x,y,z,sx,sy,sz){const o=mesh(sphere,material(c),parent,x,y,z);o.scale.set(sx,sy,sz);return o}
function box(parent,c,x,y,z,w,h,d,r=.12){return mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/3,h/3,d/3)),material(c),parent,x,y,z)}
function rod(parent,c,a,b,r=.07){const v=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));const o=mesh(new THREE.CylinderGeometry(r,r,v.length(),8),material(c),parent);o.position.copy(new THREE.Vector3(...a).add(new THREE.Vector3(...b)).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o}
function tree(parent,x,z,height=2.5){const g=new THREE.Group();parent.add(g);g.position.set(x,.22,z);rod(g,'#996c4d',[0,0,0],[.08,height*.72,0],.12);rod(g,'#996c4d',[0,height*.4,0],[-.4,height*.7,.1],.07);[[0,.85,0,.65],[-.4,.68,.12,.48],[.4,.7,-.12,.5],[.05,1.07,.04,.45]].forEach(([dx,h,dz,r],i)=>{const o=mesh(stone,material(['#6eab68','#91c582','#b1d89b','#83b978'][i]),g,dx,height*h,dz);o.scale.set(r,height*.3,r)});return g}
function bird(parent){const g=new THREE.Group();parent.add(g);g.position.set(.3,.28,.6);g.rotation.y=-2.6;
 ell(g,'#82a956',0,.52,0,.5,.53,.68);ell(g,'#648b43',-.34,.5,.12,.18,.39,.5);ell(g,'#739d4b',.34,.5,.12,.18,.39,.5);
 const tail=ell(g,'#587d3e',0,.28,.64,.24,.12,.5);tail.rotation.x=-.25;
 ell(g,'#a9c47b',0,.94,-.42,.39,.37,.31);
 for(const x of [-.16,.16]){ell(g,'#d9d9a0',x,.96,-.65,.19,.21,.08);ell(g,'#253b29',x,1.01,-.719,.047,.055,.035);ell(g,'#ffffff',x-.012,1.03,-.746,.013,.014,.008)}
 ell(g,'#e3d8af',0,.88,-.72,.09,.12,.095);
 for(const x of [-.23,.23]){rod(g,'#625849',[x,.05,-.1],[x,.2,-.04],.045);for(const dx of [-.08,0,.08])rod(g,'#625849',[x,.06,-.1],[x+dx,.045,-.3],.022)}
 for(let i=0;i<28;i++){const a=i*2.399,y=.28+(i%6)*.11,x=Math.cos(a)*.43,z=Math.sin(a)*.57;ell(g,i%3?'#bdd288':'#476f3a',x,y,z,.027,.05,.024)}
 return g;
}
function tuatara(parent){const g=new THREE.Group();parent.add(g);g.position.set(0,.32,.8);ell(g,'#89977b',0,.18,0,.3,.2,.65);ell(g,'#a1ad89',0,.22,-.64,.24,.17,.25);const tail=ell(g,'#788767',0,.12,.8,.14,.1,.65);tail.rotation.x=.07;for(const x of [-.27,.27])for(const z of [-.32,.35])rod(g,'#89977b',[x*.7,.2,z],[x*1.8,.02,z+.17],.07);for(let i=0;i<8;i++)mesh(new THREE.ConeGeometry(.07,.14,4),material('#d3d5ac'),g,0,.39,-.4+i*.13);for(const x of [-.19,.19])ell(g,'#222a55',x,.28,-.76,.035,.035,.035);return g}
function giraffe(parent){const g=new THREE.Group();parent.add(g);g.position.set(0,.23,.5);ell(g,'#e8bc77',0,1.1,0,.35,.38,.67);for(const x of [-.23,.23])for(const z of [-.42,.42])rod(g,'#e8bc77',[x,.1,z],[x,1.1,z],.065);rod(g,'#e8bc77',[0,1.2,-.43],[0,2.55,-.8],.14);ell(g,'#edc986',0,2.57,-.9,.2,.2,.36);for(const x of [-.14,.14]){ell(g,'#222a55',x,2.64,-1.05,.026,.03,.027);rod(g,'#95704c',[x,2.7,-.75],[x,2.91,-.75],.035);ell(g,'#e8bc77',x*1.7,2.68,-.68,.13,.07,.08)}for(let i=0;i<12;i++)ell(g,'#b5824f',i%2?.34:-.34,1.08+(i%3-.5)*.1,-.45+Math.floor(i/2)*.17,.018,.08,.065);return g}
function state(){return Object.fromEntries(controlsList.map(el=>[el.dataset.zoo,+el.value]))}
function disposeWorld(){if(!world)return;world.traverse(o=>{if(o.isMesh&&o.geometry!==sphere&&o.geometry!==stone)o.geometry.dispose()});scene.remove(world)}
function update(){const s=state(),sp=$('zooSpecies').value;
 const trees=Math.round(s.shade/12),logs=Math.round(s.enrichment/17),name={kakapo:'Kākāpō sanctuary',tuatara:'Tuatara habitat',giraffe:'Giraffe habitat'}[sp];
 $('habitatSpeciesLabel').textContent=name;
 summary.textContent=`Your design: ${s.space}% space setting, ${trees} shade trees, ${s.water}% water access, ${logs} enrichment features and ${s.quiet}% quiet retreat. Settings are illustrative, not real dimensions or care requirements.`;
 if(!scene)return;
 disposeWorld();world=new THREE.Group();scene.add(world);
 const width=5+s.space*.035,depth=5.8;
 box(world,'#bfe8d6',0,-.32,0,width+.5,.55,depth+.5,.25);
 box(world,'#aa8765',0,-.05,0,width,.3,depth,.16);
 box(world,'#c9d8a1',0,.15,0,width,.22,depth,.2);
 // Visible earth strata on the model's cut sides.
 for(let i=0;i<18;i++){const x=-width/2+.3+i*(width-.6)/17;ell(world,'#dcc3a1',x,-.05,depth/2+.002,.07,.035,.018)}
 // Rounded water basin grows continuously with water access.
 if(s.water>0){const w=Math.min(.2+s.water*.017,width*.19);ell(world,'#c7b99b',width*.29,.25,1.25,w+.13,.09,.75);ell(world,'#76b9cf',width*.29,.3,1.25,w,.045,.64);ell(world,'#bfe5e8',width*.29+.14,.34,1.18,w*.65,.015,.38)}
 // Keep plant positions inside the changing land footprint.
 for(let i=0;i<trees;i++){const x=-width*.38+(i%4)*(width*.75/3),z=-2.15+Math.floor(i/4)*.85;tree(world,x,z,1.65+(i%3)*.3)}
 const qw=s.quiet/100*1.5;
 if(qw>0){box(world,'#75976a',-width/2+.22+qw/2,.28,.4,qw,.08,3.6);for(let i=0;i<5;i++)ell(world,'#5f8f6c',-width/2+.35,.55,.1+i*.48,.23,.3+qw*.22,.27)}
 // Shade structure, with actual posts and roof thickness.
 if(s.shade>0){const x=width*.3,z=-.6,scale=.55+s.shade/130;const shelter=new THREE.Group();world.add(shelter);shelter.position.set(x,.25,z);shelter.scale.setScalar(scale);for(const a of [-.55,.55])for(const b of [-.45,.45])rod(shelter,'#a77b57',[a,0,b],[a,1.1,b],.06);const roof=box(shelter,'#f1c49e',0,1.18,0,1.5,.13,1.3);roof.rotation.z=.09;box(shelter,'#d2bd93',0,.1,0,1.4,.12,1.1)}
 for(let i=0;i<logs;i++){const x=-width*.28+(i%3)*width*.23,z=.2+Math.floor(i/3)*1.65;
 if(i%2===0){const log=rod(world,'#a57953',[x-.42,.4,z],[x+.42,.4,z+.1],.15);const end=mesh(new THREE.CylinderGeometry(.12,.12,.02,12),material('#e4c297'),world,x+.43,.4,z+.1);end.rotation.z=Math.PI/2;}
 else{const rock=mesh(stone,material('#b9b6c8'),world,x,.38,z);rock.scale.set(.34,.24,.4)}}
 ({kakapo:bird,tuatara,giraffe}[sp])(world);
 // Fern-like ground cover around the perimeter, separate from the shade canopy.
 for(let i=0;i<12;i++){const x=-width*.43+i*width*.078,z=2.5;for(let j=0;j<3;j++){const leaf=ell(world,'#779e68',x+(j-1)*.045,.31,z,.045,.22,.035);leaf.rotation.z=(j-1)*.45}}
 host.dataset.species=sp;host.dataset.trees=String(trees);host.dataset.enrichment=String(logs);host.dataset.space=String(s.space);host.dataset.water=String(s.water);host.dataset.quiet=String(s.quiet);
 requestRender();
}
function render(){frame=0;if(!renderer||panel.hidden||document.hidden)return;renderer.render(scene,camera);host.dataset.camera=camera.position.toArray().map(v=>v.toFixed(2)).join(',')}
function requestRender(){if(!frame)frame=requestAnimationFrame(render)}
function resize(){if(!renderer||panel.hidden)return;const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();requestRender()}
function view(action){const offset=camera.position.clone().sub(orbit.target);if(action==='reset'){camera.position.set(9,8,11);orbit.target.set(0,.7,0)}else if(action==='top'){camera.position.set(.01,13,.01);orbit.target.set(0,0,0)}else if(action==='left'||action==='right'){offset.applyAxisAngle(new THREE.Vector3(0,1,0),action==='left'?.3:-.3);camera.position.copy(orbit.target).add(offset)}else{offset.multiplyScalar(action==='in'?.85:1.18);offset.clampLength(6,23);camera.position.copy(orbit.target).add(offset)}orbit.update();requestRender()}
function fallback(message){shell.classList.remove('is-3d');tools.hidden=true;status.textContent=message;renderer?.dispose();renderer=null;cancelAnimationFrame(frame);frame=0}
controlsList.forEach(el=>el.addEventListener('input',()=>{update();$('zooScore').textContent='—';$('zooMeter').style.width='0';$('zooFeedback').textContent='Design changed. Test again to compare with the illustrative targets.'}));
$('zooSpecies').addEventListener('change',update);
try{
 if(drawing)throw new Error('Drawing mode selected');
 renderer=new THREE.WebGLRenderer({antialias:!low,alpha:false,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,low?1:1.5));renderer.shadowMap.enabled=!low;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 scene=new THREE.Scene();scene.background=new THREE.Color('#eaf3ed');
 camera=new THREE.PerspectiveCamera(38,1,.1,70);camera.position.set(9,8,11);
 scene.add(new THREE.HemisphereLight('#fff9ed','#91a79a',1.8));
 const sun=new THREE.DirectionalLight('#fff3da',2.8);sun.position.set(-4,10,6);sun.castShadow=!low;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-8,right:8,top:8,bottom:-8,near:1,far:30});sun.shadow.bias=-.001;sun.shadow.normalBias=.04;scene.add(sun);
 const fill=new THREE.DirectionalLight('#c1d9f4',1.1);fill.position.set(6,5,-7);scene.add(fill);
 const floor=mesh(new THREE.PlaneGeometry(200,200),material('#eaf3ed'),scene,0,-.64,0);floor.rotation.x=-Math.PI/2;floor.castShadow=false;
 const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Interactive three-dimensional habitat. Left and right arrows rotate; plus and minus zoom; Home resets. Camera buttons provide the same controls.');host.prepend(canvas);
 orbit=new OrbitControls(camera,canvas);orbit.target.set(0,.7,0);orbit.minDistance=6;orbit.maxDistance=23;orbit.maxPolarAngle=Math.PI*.48;orbit.enablePan=false;orbit.enableDamping=false;orbit.enableZoom=false;orbit.touches.ONE=THREE.TOUCH.ROTATE;orbit.update();
 // On touch screens, explicit buttons avoid trapping vertical page scrolling.
 if(matchMedia('(pointer: coarse)').matches){orbit.enableRotate=false;canvas.style.touchAction='pan-y';status.textContent='3D ready · use camera buttons to rotate and zoom. Swipe vertically to scroll.'}
 else status.textContent='3D ready · drag to orbit. Use camera buttons or focus the scene for arrow keys and + / −. No automatic motion.';
 orbit.addEventListener('change',requestRender);
 canvas.addEventListener('keydown',e=>{const actions={ArrowLeft:'left',ArrowRight:'right','+':'in','=':'in','-':'out',Home:'reset',ArrowUp:'top'};if(actions[e.key]){e.preventDefault();view(actions[e.key])}});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fallback('Drawing mode · graphics context was interrupted. Controls still work; reload to try 3D again.')});
 tools.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>view(b.dataset.view)));
 shell.classList.add('is-3d');tools.hidden=false;
 new ResizeObserver(resize).observe(host);new MutationObserver(resize).observe(panel,{attributes:true,attributeFilter:['hidden']});document.addEventListener('visibilitychange',requestRender);
 update();resize();
}catch(e){fallback(drawing?'Drawing mode selected · all habitat controls still work.':'Drawing mode · 3D is unavailable on this device. All habitat controls still work.');update()}
