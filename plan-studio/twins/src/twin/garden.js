import './garden.css';
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
 el.innerHTML='<span class="garden-name">16A <small>Native garden study</small></span><div><label for="garden-range">Reveal proposed planting</label><input id="garden-range" type="range" min="0" max="100" value="100" disabled><output for="garden-range" id="garden-amount">Loading</output></div><label class="garden-light">Light<select disabled aria-label="Seasonal light"><option value="12-21 17">Summer</option><option value="06-21 12">Winter</option></select></label>';
 document.body.append(el);
 const slider=el.querySelector('input'),out=el.querySelector('output'),season=el.querySelector('select');
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
  a.orbitOn=false; a.goTo(3); const key=a.built.path[3];
  const coord=window.__at; a.camera.position.copy(coord?coord('16C',3.0,13.5,1.9):key.eye); a.controls.target.copy(coord?coord('16C',1.7,8.15,1.45):key.look); a.controls.update();
  const native=proposedPohutukawa();
  const at=coord?.('16C',1.75,8.45,0);
  if(at){at.y=a.built.support?.(at)??at.y;native.position.copy(at); a.scene.add(native);}
  const right=a.camera.position.clone().sub(a.controls.target); const norm=Math.hypot(right.z,right.x)||1; const rx=right.z/norm,rz=-right.x/norm;
  let min=Infinity,max=-Infinity;const groups=[];
  a.scene.traverse(m=>{
   if(!m.isInstancedMesh||m.userData.kind!=='planting'||m.userData.source!=='proposed')return;
   const original=m.instanceMatrix.array.slice(), depth=[], n=m.count;
   m.updateWorldMatrix(true,false);
   const loc=a.camera.position.clone();
   for(let i=0;i<n;i++){loc.set(original[16*i+12],original[16*i+13],original[16*i+14]).applyMatrix4(m.matrixWorld); const d=rx*loc.x+rz*loc.z;depth.push({i,d});min=Math.min(min,d);max=Math.max(max,d);}
   depth.sort((a,b)=>a.d-b.d);
   // The first N instances are rendered. Reorder once; do not allocate any new geometry on scrubs.
   depth.forEach(({i},j)=>m.instanceMatrix.array.set(original.subarray(i*16,i*16+16),j*16));
   m.instanceMatrix.needsUpdate=true;groups.push({m,depth});
  });
  const total=groups.reduce((n,g)=>n+g.depth.length,0);
  if(!total){out.textContent='Planting unavailable';return;}
  slider.disabled=false;season.disabled=false;
  const render=()=>{let n=0;const f=Number(slider.value)/100,t=min+(max-min)*f;for(const g of groups){
   let low=0,high=g.depth.length;while(low<high){const mid=(low+high)>>1;if(g.depth[mid].d<=t)low=mid+1;else high=mid;}
   g.m.count=f===0?0:f===1?g.depth.length:low;n+=g.m.count;
  }out.textContent=slider.value+'%';slider.setAttribute('aria-valuetext',slider.value+'% of the landscape revealed');
  native.visible=Boolean(at)&&f>=.84; el.dataset.visible=n;el.dataset.total=total;el.dataset.meshes=groups.length;};
  slider.addEventListener('input',render);render();
  const light=()=>{native.userData.bloom(season.value.startsWith('12'));document.querySelector('[data-sunpreset="'+season.value+'"]')?.click()};season.onchange=light;light();
 }
 start(a);
}
