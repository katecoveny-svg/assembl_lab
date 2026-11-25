import './garden.css';
import {stampSweep,revealNear} from './gardenBrush.js';
import * as THREE from 'three/webgpu';
import { proposedPohutukawa } from './nativeTrees';
export function mountGarden(a) {
 const header=document.querySelector('body > header');
 const query=new URLSearchParams(location.search);
 const garden=query.has('garden');
 const link=document.createElement('a');
 link.textContent=garden?'Back to full twin':'Explore proposed planting';
 link.className='pill garden-entry';
 query.delete('still'); if(garden)query.delete('garden'); else {query.set('garden','');query.set('still','');}
 link.href=garden?'./':'./garden.html?'+query.toString();
 if(!garden){header?.append(link);return;}
 document.body.append(link);
 document.body.classList.add('garden-study');
 const el=document.createElement('section');
 el.className='garden-bar'; el.setAttribute('aria-label','Garden study');
 el.innerHTML='<span class="garden-name">16C <small>Plant the garden</small></span><div><button class="brush-mode" aria-pressed="true">Brush on</button> <button class="brush-reset">Reset</button><small>Drag across the marked bed</small><output id="garden-amount" aria-live="polite"></output></div><label class="garden-light">Season<select aria-label="Season"><option value="12-21 17">Summer</option><option value="06-21 12">Winter</option></select></label>';
 document.body.append(el);
 const out=el.querySelector('output'),season=el.querySelector('select');
 function finishGarden(a) {
  // All changes are look-only and belong to this isolated opt-in study.
  const templates=[];
  a.scene.traverse(m=>{if((m.name==='ground_lawn' || /^bed_16C/.test(m.name))&&m.material?.map)templates.push(m);});
  for(const mesh of templates) {
   const lawn=mesh.name==='ground_lawn', g=mesh.geometry.clone(), p=g.attributes.position, uv=g.attributes.uv;
   let x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity;
   for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);x0=Math.min(x0,x);x1=Math.max(x1,x);z0=Math.min(z0,z);z1=Math.max(z1,z);}
   for(let i=0;i<p.count;i++)uv.setXY(i,(p.getX(i)-x0)/(x1-x0),(p.getZ(i)-z0)/(z1-z0));
   const c=document.createElement('canvas');c.width=c.height=lawn?1024:256;
   const cx=c.getContext('2d');let seed=13+Math.round(x0*193), rand=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
   const d=cx.createImageData(c.width,c.height);
   for(let i=0;i<d.data.length;i+=4){const j=i/4,x=j%c.width,y=Math.floor(j/c.width);
    const n=Math.sin(x*.064+Math.sin(y*.042)*1.7)*2.5+Math.sin(x*.019+y*.026)*4.8+(rand()-.5)*12;
    const color=lawn?[73,91,44]:[64,48,34];for(let k=0;k<3;k++)d.data[i+k]=color[k]+n;d.data[i+3]=255;}
   cx.putImageData(d,0,0);
   for(let i=0;i<(lawn?85000:6000);i++){const x=rand()*c.width,y=rand()*c.height,shade=Math.floor(rand()*34),w=(lawn?.35:1)+rand()*(lawn?1.4:4);cx.fillStyle=lawn?'rgba('+[61+shade,76+shade,38+shade,.46]+')':'rgba('+[63+shade,42+shade,29+shade,.57]+')';cx.fillRect(x,y,w,w*(.5+rand()));}
   const m=mesh.material.clone(), tex=m.map.clone();
   tex.source=new tex.source.constructor(c);tex.repeat.set(1,1);tex.offset.set(0,0);tex.needsUpdate=true;
   m.map=tex;m.normalMap=null;m.roughnessMap=null;m.roughness=.93;mesh.geometry=g;mesh.material=m;
  }
  a.scene.traverse(m=>{
   if(!m.isInstancedMesh||m.userData.source!=='proposed'||! /^(nikau|ponga|wheki)_/.test(m.name))return;
   const g=m.geometry.clone(),p=g.attributes.position,c=g.attributes.color;if(!c)return;
   for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),r=Math.hypot(x,z);
    if(r<.25&&y<4.4){
     const v=.84+.075*Math.cos(y*41)+.055*Math.sin(Math.atan2(z,x)*5+y*2);
     c.setXYZ(i,c.getX(i)*v,c.getY(i)*v,c.getZ(i)*v);
    }
    if(r>.45&&y>1.2){const bend=(Math.sin(y*2.5+x*1.9)*.025)*r;p.setXYZ(i,x*1.07,y-.032*r*r+bend,z*1.07);}
   }
   p.needsUpdate=true;c.needsUpdate=true;g.computeVertexNormals();g.computeBoundingSphere();m.geometry=g;m.computeBoundingSphere();
  });
 }
 function start(a) {
  finishGarden(a);
  a.orbitOn=false;
  const group=a.scene.getObjectByName('brush-placements');
  let bed;a.scene.traverse(m=>{if(m.userData.brush)bed=m;});
  if(!group || !bed){out.textContent='Planting bed unavailable';return;}
  const coord=window.__at;
  const bb=new THREE.Box3().setFromObject(bed), centre=bb.getCenter(new THREE.Vector3());
  let eye=coord('16C',5.25,12.7,2.65);a.camera.position.copy(eye);a.controls.target.copy(centre).add(new THREE.Vector3(0,.28,0));a.controls.update();
  const native=proposedPohutukawa(), at=coord('16C',1.75,8.45,0);
  at.y=a.built.support?.(at)??at.y;native.position.copy(at);a.scene.add(native);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.59,.64,56),new THREE.MeshBasicMaterial({color:0xfff2d6,side:THREE.DoubleSide,transparent:true,opacity:.95,depthWrite:false}));
  ring.rotation.x=-Math.PI/2; ring.visible=false; a.scene.add(ring);
  const boundary=new THREE.LineSegments(new THREE.EdgesGeometry(bed.geometry),new THREE.LineBasicMaterial({color:0xe6c7a9,transparent:true,opacity:.7}));
  boundary.matrixAutoUpdate=false;boundary.matrix.copy(bed.matrixWorld);boundary.position.y+=.005;a.scene.add(boundary);
  const groups=[];
  group.updateWorldMatrix(true,true);
  group.traverse(m=>{if(!m.isInstancedMesh)return;const rows=[], buf=m.instanceMatrix.array;
     for(let i=0;i<m.count;i++)rows.push({matrix:buf.slice(i*16,i*16+16),p:new THREE.Vector3(buf[i*16+12],buf[i*16+13],buf[i*16+14]).applyMatrix4(m.matrixWorld),seen:false});
     groups.push({m,rows});});
  const total=groups.reduce((n,g)=>n+g.rows.length,0);
  let count=0;
  function render(announce=false){count=0;for(const g of groups){let n=0;for(const row of g.rows) if(row.seen){g.m.instanceMatrix.array.set(row.matrix,n++*16);}g.m.count=n;g.m.instanceMatrix.needsUpdate=true;count+=n;}el.dataset.visible=count;el.dataset.total=total;el.dataset.meshes=groups.length;if(announce)out.textContent=count+' of '+total+' plants';}
  const ray=new THREE.Raycaster(), ndc=new THREE.Vector2(), canvas=a.canvas;
  const downward=new THREE.Vector3(0,-1,0);
  function snap(p){ray.set(new THREE.Vector3(p.x,bb.max.y+5,p.z),downward);return ray.intersectObject(bed,false)[0]?.point;}
  function pick(e){const box=canvas.getBoundingClientRect();ndc.set((e.clientX-box.left)/box.width*2-1,1-(e.clientY-box.top)/box.height*2);ray.setFromCamera(ndc,a.camera);return ray.intersectObject(bed,false)[0]?.point;}
  function reticle(p){ring.visible=!!p;if(p){ring.position.copy(p);ring.position.y+=.12;}}
  function mark(p){return groups.map(g=>revealNear(g.rows,p)).some(Boolean);}
  let pointer=null,last=null;
  function finish(){if(pointer!==null){pointer=null;last=null;render(true);}}
  canvas.tabIndex=0;
  canvas.setAttribute('aria-label','Planting bed. Use arrow keys to move the brush and Space to plant; Tab for buttons.');
  let k=groups[0]?.rows[0]?.p.clone()??centre.clone();
  const mode=el.querySelector('.brush-mode');
  const paint=()=>mode.getAttribute('aria-pressed')==='true';
  const toggle=(on)=>{mode.setAttribute('aria-pressed',String(on));mode.textContent=on?'Brush on':'Orbit';a.controls.enabled=!on;canvas.style.touchAction=on?'none':'';ring.visible=false;finish();};
  mode.onclick=()=>toggle(!paint());toggle(true);
  el.querySelector('.brush-reset').onclick=()=>{for(const g of groups)for(const row of g.rows)row.seen=false;render(true);};
  canvas.addEventListener('pointerdown',e=>{if(!paint()||pointer!==null||e.button!==0)return;const p=pick(e);if(!p)return;pointer=e.pointerId;canvas.setPointerCapture(pointer);last=p;reticle(p);if(mark(p))render();});
  canvas.addEventListener('pointermove',e=>{if(!paint())return;const p=pick(e);reticle(p);if(pointer!==e.pointerId)return;
    if(!p){last=null;return;}const changed=stampSweep(last,p,snap,mark);last=p;if(changed)render();});
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(ev,finish);
  canvas.addEventListener('pointerleave',()=>{if(pointer===null)reticle(null);});
  canvas.addEventListener('focus',()=>{if(paint())reticle(snap(k));});
  canvas.addEventListener('blur',()=>reticle(null));
  canvas.addEventListener('keydown',e=>{if(!paint())return;const key=e.key;
    if(key===' '){e.preventDefault();e.stopImmediatePropagation();mark(snap(k));render(true);return;}
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(key))return;
    e.preventDefault();e.stopImmediatePropagation();const forward=a.controls.target.clone().sub(a.camera.position).setY(0).normalize(),right=forward.clone().cross(new THREE.Vector3(0,1,0));
    const proposed=k.clone().addScaledVector(key==='ArrowLeft'||key==='ArrowRight'?right:forward,key==='ArrowLeft'||key==='ArrowDown'?-.22:.22);
    const hit=snap(proposed);if(hit)k.copy(hit);reticle(snap(k));},true);
  season.onchange=()=>{native.userData.bloom(season.value.startsWith('12'));document.querySelector('[data-sunpreset="'+season.value+'"]')?.click();};
  season.onchange();render(true);
  window.__gardenProof={bed,groups,pick};
 }
 start(a);
}
