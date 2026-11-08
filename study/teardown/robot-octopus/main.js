import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {sample,reachedGoal,TAU} from './model.js';
const $=id=>document.getElementById(id), calm=matchMedia('(prefers-reduced-motion: reduce)').matches;
let playing=!calm, exploded=false, clock=0, spread=0, last=performance.now();
const params={frequency:.5,wavelength:12,mode:'ripple'};
$('play').textContent=playing?'Pause':'Play';$('play').setAttribute('aria-pressed',String(playing));
let renderer;
try{renderer=new T.WebGLRenderer({canvas:$('scene'),antialias:true,alpha:true});}catch(e){$('status').textContent='3D is unavailable in this browser. The wave controls and science still work.';}
const scene=new T.Scene(),camera=new T.PerspectiveCamera(38,1,.1,100),target=new T.Vector3();
const body=new T.Group(),shell=new T.Group(),core=new T.Group(),arms=[];
let controls;
const mat=(colour,metal=0,rough=.4)=>new T.MeshStandardMaterial({color:colour,metalness:metal,roughness:rough});
const plum=mat('#704658',.35),rose=mat('#c697ac',.4),ivory=mat('#e7ddd4',.35),dark=mat('#281725',.3),steel=mat('#9c999e',.65),glass=mat('#302830',.5,.2);
const mesh=(geo,m,parent,pos=[0,0,0],scale=[1,1,1])=>{const o=new T.Mesh(geo,m);o.position.set(...pos);o.scale.set(...scale);parent.add(o);return o;};
const sphere=new T.SphereGeometry(1,24,16),jointGeo=new T.SphereGeometry(1,12,8),linkGeo=new T.CylinderGeometry(1,1,1,12);
const unitY=new T.Vector3(0,1,0),dir=new T.Vector3();
if(renderer){
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
 scene.add(new T.HemisphereLight('#fff6ed','#342133',2.2));
 for(const [color,power,pos] of [['#fff7ed',35,[2,7,5]],['#d1b8c8',28,[-5,3,-3]],['#f3ede5',20,[5,2,-5]]]){const l=new T.PointLight(color,power,25);l.position.set(...pos);scene.add(l);}
 scene.add(body);body.add(shell,core);
 // Rounded manufactured shell, seam rings, vents and screw heads; original design.
 mesh(sphere,plum,shell,[0,.65,0],[.88,.86,.88]);
 mesh(new T.TorusGeometry(.79,.025,8,64),ivory,shell,[0,.35,0]).rotation.x=Math.PI/2;
 mesh(new T.TorusGeometry(.61,.035,8,64),steel,core,[0,.28,0]).rotation.x=Math.PI/2;
 mesh(new T.CylinderGeometry(.55,.65,.4,48),dark,core,[0,.1,0]);
 for(let i=0;i<8;i++){const a=i*TAU/8;mesh(sphere,rose,core,[Math.sin(a)*.47,.4,Math.cos(a)*.47],[.06,.17,.06]);mesh(new T.CylinderGeometry(.025,.025,.04,6),ivory,shell,[Math.sin(a)*.72,.39,Math.cos(a)*.72]);}
 // Two sensor lenses face the student. White surrounds and dark lenses are physical geometry.
 for(const x of [-.32,.32]){mesh(sphere,ivory,shell,[x,.78,.73],[.20,.23,.13]);mesh(sphere,glass,shell,[x,.78,.83],[.115,.14,.065]);mesh(sphere,ivory,shell,[x-.03,.83,.885],[.023,.028,.012]);}
 for(let i=0;i<5;i++)mesh(new T.BoxGeometry(.035,.2,.03),dark,shell,[(i-2)*.10,1.18,.58]).rotation.x=-.5;
 const floor=mesh(new T.CircleGeometry(5,96),new T.MeshBasicMaterial({color:'#342131',transparent:true,opacity:.6}),scene,[0,-.58,0]);floor.rotation.x=-Math.PI/2;
 const ring=mesh(new T.RingGeometry(3.48,3.49,100),new T.MeshBasicMaterial({color:'#886678',side:T.DoubleSide,transparent:true,opacity:.35}),scene,[0,-.565,0]);ring.rotation.x=-Math.PI/2;
 for(let arm=0;arm<8;arm++){
  const g=new T.Group();body.add(g);const a=arm*TAU/8;
  const links=[],joints=[],pads=[];
  for(let j=0;j<17;j++){joints.push(mesh(jointGeo,steel,g));if(j<16){links.push(mesh(linkGeo,j%4===0?ivory:plum,g));const p=new T.Group();mesh(new T.CylinderGeometry(.055,.07,.055,12),rose,p);mesh(new T.TorusGeometry(.047,.012,6,16),ivory,p,[0,-.03,0]).rotation.x=Math.PI/2;g.add(p);pads.push(p);}}
  arms.push({g,a,links,joints,pads});
 }
 controls=new OrbitControls(camera,$('scene'));controls.enableDamping=!calm;controls.dampingFactor=.08;controls.enablePan=false;controls.minDistance=7;controls.maxDistance=18;controls.maxPolarAngle=Math.PI/2.05;controls.minPolarAngle=.15;
 function size(){const w=$('scene').clientWidth,h=$('scene').clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();resetView();}
 function resetView(){const mobile=$('scene').clientWidth<760;camera.position.set(mobile?6:5.5,mobile?8:6.8,mobile?9:9);controls.target.set(mobile?0:-.7,.2,0);controls.update();}
 $('reset').onclick=resetView;new ResizeObserver(size).observe($('scene'));size();$('status').hidden=true;
 $('scene').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','=',' '].includes(e.key))return;e.preventDefault();if(e.key===' '){$('play').click();return;}const offset=camera.position.clone().sub(controls.target),s=new T.Spherical().setFromVector3(offset);if(e.key==='ArrowLeft')s.theta-=.12;if(e.key==='ArrowRight')s.theta+=.12;if(e.key==='ArrowUp')s.phi-=.12;if(e.key==='ArrowDown')s.phi+=.12;if(e.key==='+'||e.key==='=')s.radius*=.9;if(e.key==='-')s.radius*=1.1;s.phi=T.MathUtils.clamp(s.phi,.15,Math.PI/2.05);s.radius=T.MathUtils.clamp(s.radius,7,18);camera.position.copy(controls.target).add(new T.Vector3().setFromSpherical(s));controls.update();});
}
function updateUI(){
 const s=sample(clock,params);$('frequencyOut').value=params.frequency.toFixed(2)+' Hz';$('wavelengthOut').value=params.wavelength+' cm';$('speed').value=Number(s.speed.toFixed(2)).toString();
 const won=reachedGoal(s);document.querySelector('.challenge').classList.toggle('success',won);$('feedback').textContent=won?'You’ve got it! Can you find a different combination?':'Try the two sliders. There’s more than one way.';
}
for(const name of ['frequency','wavelength','mode'])$(name).addEventListener('input',()=>{params[name]=name==='mode'?$(name).value:Number($(name).value);updateUI();});
$('play').onclick=()=>{playing=!playing;$('play').textContent=playing?'Pause':'Play';$('play').setAttribute('aria-pressed',String(playing));};
$('apart').onclick=()=>{exploded=!exploded;$('apart').textContent=exploded?'Put together':'Take apart';$('apart').setAttribute('aria-pressed',String(exploded));if(calm)spread=exploded?1:0;};
function render(now){
 const dt=Math.min((now-last)/1000,.05);last=now;if(playing&&!document.hidden)clock+=dt;
 spread+=(Number(exploded)-spread)*Math.min(1,dt*6);const s=sample(clock,params);
 if(renderer){
  shell.position.y=spread*1.7;core.position.y=spread*.5;
  for(let k=0;k<8;k++){const {g,a,links,joints,pads}=arms[k];g.position.set(Math.sin(a)*spread*.6,0,Math.cos(a)*spread*.6);
   const positions=s.arms[k].map(p=>new T.Vector3(Math.sin(a)*(.7+p.distance/10),p.lift/10-.05,Math.cos(a)*(.7+p.distance/10)));
   positions.forEach((p,j)=>{const r=.11*(1-j/22);joints[j].position.copy(p);joints[j].scale.setScalar(r);if(j<16){const next=positions[j+1],link=links[j];link.position.copy(p).add(next).multiplyScalar(.5);dir.subVectors(next,p);link.quaternion.setFromUnitVectors(unitY,dir.clone().normalize());link.scale.set(r*.9,dir.length(),r*.9);pads[j].position.copy(link.position);pads[j].position.y-=r*.9;pads[j].scale.setScalar(1-j/24);}});
  }controls.update();renderer.render(scene,camera);
 }
 const points=Array.from({length:81},(_,j)=>{const x=j/80*280,distance=j/80*24,y=32-Math.sin(TAU*(distance/params.wavelength-params.frequency*clock))*20;return `${j?'L':'M'}${x.toFixed(1)},${y.toFixed(1)}`;});$('wavePath').setAttribute('d',points.join(' '));
 requestAnimationFrame(render);
}
updateUI();requestAnimationFrame(render);
window.ASSEMBL_WAVE_LAB={sample:()=>sample(clock,params),get playing(){return playing;},get exploded(){return exploded;}};
