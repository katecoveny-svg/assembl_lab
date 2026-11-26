// Original Pavilion planting. Dimensions are scene metres. Site Scatter inspired the ground brush.
import * as T from './vendor/three.webgpu.min.js';
import {stampSweep} from './garden-sampling.js';

const TAU=Math.PI*2, centre={x:8.64,z:-.35}, radius=.62;
function randomSource(seed){
 return ()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296};
}
// A tapered bed between the east gable and the approach. Access starts at z=2.54.
function outline(a){
 const taper=1+.11*Math.sin(a)-.09*Math.sin(2*a)+.052*Math.cos(5*a)+.031*Math.sin(11*a)+.021*Math.sin(33*a);
 return {x:.93*Math.cos(a)*taper+.10*Math.sin(a),z:2.36*Math.sin(a)*taper};
}
function substrate(grade,rng){
 const coords=[],indices=[],uvs=[],colours=[],N=124,R=15;
 for(let j=0;j<=R;j++)for(let i=0;i<=N;i++){
  const r=j/R,o=outline(i/N*TAU),x=centre.x+r*o.x,z=centre.z+r*o.z;
  coords.push(x,grade(x,z)-.029+.085*(1-r**13),z);uvs.push(x/.94,z/.94);
  const light=.47+.12*Math.sin(x*3.8-z*4)+.10*Math.cos(z*5+x*6)+.05*rng();
  const c=new T.Color().setRGB(light,light*.97,light*.92);
  colours.push(c.r,c.g,c.b);
  if(j&&i){const k=j*(N+1)+i;indices.push(k,k-1,k-N-2,k,k-N-2,k-N-1)}
 }
 const geo=new T.BufferGeometry();
 geo.setAttribute('position',new T.Float32BufferAttribute(coords,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
 geo.setAttribute('color',new T.Float32BufferAttribute(colours,3));geo.setIndex(indices);geo.computeVertexNormals();
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#615241';ctx.fillRect(0,0,256,256);
 for(let i=0;i<17000;i++){
  const s=rng();ctx.fillStyle=['#312e26','#52483b','#81725c','#9e8c72','#493f34'][i%5];
  ctx.globalAlpha=.24+rng()*.55;ctx.save();ctx.translate(rng()*256,rng()*256);ctx.rotate(rng()*TAU);
  ctx.fillRect(0,0,s*s*3+.4,rng()*1.4+.4);ctx.restore();
 }
 const tex=new T.CanvasTexture(canvas);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;
 const soil=new T.Mesh(geo,new T.MeshStandardMaterial({map:tex,vertexColors:true,roughness:1,side:T.DoubleSide,bumpMap:tex,bumpScale:.018}));
 soil.receiveShadow=true;return soil;
}

// Each cross section has a sunlit and a folded face. Flat flax fans, arching tussocks,
// and fine upright coastal grass have different blade profiles and silhouettes.
function specimen(kind,seed){
 const rng=randomSource(seed),positions=[],colours=[],indices=[];
 function point(x,y,z,c,tone){
  positions.push(x,y,z);colours.push(c.r*tone,c.g*tone,c.b*tone);
 }
 function blade({a,h,reach,w,base,bend,colour,ox=0,oz=0,tip=.72}){
  const start=positions.length/3,L=8,dx=Math.cos(a),dz=Math.sin(a);
  for(let k=0;k<=L;k++){
   const u=k/L,sweep=base+reach*u**1.5,y=h*(u-bend*u**2.6);
   const x=ox+dx*sweep,z=oz+dz*sweep,width=w*Math.max(.012,(1-u**1.8))*(.70+.3*Math.sin(Math.PI*u));
   const shade=.63+.37*Math.sin(Math.PI*u*.78);
   point(x-dz*width,y,z+dx*width,colour,shade*tip);
   point(x-dx*width*.34,y+width*.12,z-dz*width*.34,colour,shade*1.15);
   point(x+dz*width,y,z-dx*width,colour,shade);
   if(k){const n=start+k*3;indices.push(n-3,n,n-2,n-2,n,n+1,n-2,n+1,n-1,n-1,n+1,n+2)}
  }
 }
 const flax=kind===0,fine=kind===2;
 const palette=flax?['#525c34','#737d45','#60432d','#374028','#866746']:fine?['#a49b68','#8d8954','#b6a277','#807850']:['#94804f','#a99865','#6c7048','#b7a374','#897348'];
 const number=flax?34:fine?50:72,fan=rng()*TAU;
 for(let i=0;i<number;i++){
  const s=rng(),a=flax?fan+(i%2)*Math.PI+((i%3)-1)*.52+(rng()-.5)*.50:i*2.39996+rng()*.34;
  blade({a,h:flax?.53+.78*s:fine?.18+.30*s:.31+.43*s,reach:flax?.13+.53*(1-s):fine?.075+rng()*.16:.16+.24*(1-s),
   w:flax?.017+.018*rng():fine?.0019+.0029*rng():.004+.005*rng(),base:rng()*(flax?.08:.055),
   bend:flax?.11+.34*(1-s):fine?.19+.28*(1-s):.29+.31*(1-s),colour:new T.Color(palette[Math.floor(rng()*palette.length)]),
   ox:(rng()-.5)*(flax?.15:.09),oz:(rng()-.5)*(flax?.11:.09)});
 }
 // Tapering, branched, dry seed culms stand above the fountain of blades.
 if(!flax)for(let j=0;j<(fine?6:11);j++){
  const a=rng()*TAU,h=(fine?.39:.57)+rng()*.22,reach=.09+rng()*.12,c=new T.Color(fine?'#a89a71':'#ba9c70');
  blade({a,h,reach,w:.0026,base:0,bend:.02,colour:c});
  for(let k=0;k<7;k++){
   const u=.69+k*.044,ba=a+(k%2?1:-1)*(.61+rng()*.44);
   const x=Math.cos(a)*reach*u**1.5,z=Math.sin(a)*reach*u**1.5,y=h*(u-.02*u**2.6);
   const start=positions.length/3,dx=Math.cos(ba),dz=Math.sin(ba),len=.027+(1-u)*.13;
   point(x,y,z,c,.83);point(x+dx*len*.64-dz*.004,y+.023,z+dz*len*.64+dx*.004,c,1.12);
   point(x+dx*len,y+.037,z+dz*len,c,1.23);point(x+dx*len*.64+dz*.004,y+.022,z+dz*len*.64-dx*.004,c,1);
   indices.push(start,start+1,start+2,start,start+2,start+3);
  }
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colours,3));g.setIndex(indices);g.computeVertexNormals();return g;
}

export function createGardenBed(scene,camera,grade){
 const rng=randomSource(196165),group=new T.Group(),soil=substrate(grade,rng),ray=new T.Raycaster(),ndc=new T.Vector2();
 group.add(soil);group.visible=false;scene.add(group);
 const up=new T.Vector3(0,-1,0);
 function ground(p){
  if(!p||p.x<7.64||p.x>9.72||p.z>2.42||p.z< -2.92)return null;
  ray.set(new T.Vector3(p.x,2,p.z),up);
  return ray.intersectObject(soil,false)[0]?.point??null;
 }

 // Slightly proud chips and pockets of exposed mineral soil catch actual scene light.
 const detritus=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),
  new T.MeshStandardMaterial({color:0xb79473,roughness:.98}),142);
 const chip=new T.Object3D(),smallRng=randomSource(9047);
 for(let i=0;i<detritus.count;i++){
  let p;do{p=ground({x:centre.x+(smallRng()-.5)*1.91,z:centre.z+(smallRng()-.5)*4.52})}while(!p);
  chip.position.copy(p);chip.rotation.set(smallRng()*.24,smallRng()*TAU,smallRng()*.38);
  const s=.009+smallRng()**2*.031;chip.scale.set(s,s*.26,s*(.29+smallRng()*.31));chip.updateMatrix();
  detritus.setMatrixAt(i,chip.matrix);detritus.setColorAt(i,new T.Color().setScalar(.20+smallRng()*.53));
 }
 detritus.receiveShadow=true;group.add(detritus);
 const rows=[],batches=[],material=new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:.78});
 for(let kind=0;kind<3;kind++){
  const batch=new T.InstancedMesh(specimen(kind,6749+kind),material,[30,90,180][kind]);
  batch.count=0;batch.frustumCulled=false;batch.castShadow=true;batch.receiveShadow=true;group.add(batch);batches.push(batch);
 }
 // Each stroke scatters new instances at its actual hit positions in world metres.
 let brush='mix',previous=null,undoStack=[];
 const spacing=[.46,.25,.15],counts=()=>batches.map((_,i)=>rows.filter(r=>r.kind===i).length);
 function dab(point){
  if(!point)return false;
  if(brush==='erase'){
   const old=rows.length;
   for(let i=rows.length-1;i>=0;i--)if(rows[i].p.distanceTo(point)<radius)rows.splice(i,1);
   return old!==rows.length;
  }
  const used=counts();let changed=false;
  for(let j=0;j<10;j++){
   const random=rng(),kind=brush==='mix'?(random<.12?0:random<.49?1:2):Number(brush);
   if(used[kind]>=batches[kind].instanceMatrix.count)continue;
   const a=rng()*TAU,r=j===0?0:radius*Math.sqrt(rng()),pos=ground({x:point.x+Math.cos(a)*r,z:point.z+Math.sin(a)*r});
   if(!pos||rows.some(row=>row.p.distanceTo(pos)<(spacing[kind]+spacing[row.kind])*.5))continue;
   const obj=new T.Object3D();obj.position.copy(pos);obj.position.y-=.012;obj.rotation.y=rng()*TAU;obj.scale.setScalar(.72+rng()*.44);obj.updateMatrix();
   rows.push({p:pos,kind,matrix:obj.matrix,born:performance.now()});used[kind]++;changed=true;
  }
  return changed;
 }
 function remember(){if(previous){undoStack.push(previous);if(undoStack.length>25)undoStack.shift();previous=null}}
 const ringPositions=new Float32Array(65*3),ringGeo=new T.BufferGeometry();
 ringGeo.setAttribute('position',new T.BufferAttribute(ringPositions,3));
 const ring=new T.Line(ringGeo,new T.LineBasicMaterial({color:0xfbf6f6,transparent:true,opacity:.91}));
 ring.frustumCulled=false;group.add(ring);
 let active=false,selected=ground(centre),controller=null;
 function updateRing(point){
  ring.visible=!!point;if(!point)return;selected=point;
  for(let i=0;i<=64;i++){const a=i/64*TAU,x=point.x+radius*Math.cos(a),z=point.z+radius*Math.sin(a);ringPositions.set([x,grade(x,z)+.081,z],i*3)}
  ringGeo.attributes.position.needsUpdate=true;
 }
 const sprout=new T.Matrix4(),scale=new T.Vector3(),motion=matchMedia('(prefers-reduced-motion: reduce)');
 let animation=0,requestPaint=null;
 function refresh(animate=false){
  cancelAnimationFrame(animation);animation=0;
  const now=performance.now();let growing=false;
  batches.forEach(b=>b.count=0);
  for(const row of rows){
   const batch=batches[row.kind],t=animate&&!motion.matches?Math.min(1,(now-row.born)/320):1;
   if(t<1){
    growing=true;
    const h=1-(1-t)**3;
    sprout.copy(row.matrix).scale(scale.set(.49+.51*h,.14+.86*h,.49+.51*h));
    batch.setMatrixAt(batch.count++,sprout);
   }else batch.setMatrixAt(batch.count++,row.matrix);
  }
  batches.forEach(b=>b.instanceMatrix.needsUpdate=true);
  if(growing&&active)animation=requestAnimationFrame(()=>{refresh(true);requestPaint?.()});
 }
 function count(){return batches.reduce((a,b)=>a+b.count,0)}
 function hit(e,rect){
  ndc.set((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2);
  ray.setFromCamera(ndc,camera);return ray.intersectObject(soil,false)[0]?.point??null;
 }
 function activate({surface,vista,repaint,announce,close}){
  active=true;requestPaint=repaint;group.visible=true;controller=new AbortController();
  const listen=(el,type,fn)=>el.addEventListener(type,fn,{signal:controller.signal});
  let stroke=null;
  function plant(from,to){
   const before=previous??rows.slice();
   if(stampSweep(from,to,ground,dab,.21)){previous=before;refresh(true);repaint()}
  }
  function finish(){if(stroke){remember();announce(count())}stroke=null}
  function get(e){return hit(e,surface.getBoundingClientRect())}
  listen(surface,'pointerdown',e=>{
   if(!e.isPrimary){finish();return}
   const p=get(e);if(e.button!==0||!p)return;
   const touch=e.pointerType==='touch';
   stroke={id:e.pointerId,x:e.clientX,y:e.clientY,p,armed:!touch};
   if(!touch){surface.setPointerCapture(e.pointerId);plant(null,p)}
   updateRing(p);repaint();
  });
  listen(surface,'pointermove',e=>{
   if(!e.isPrimary)return;
   const p=get(e);updateRing(p);
   if(stroke?.id===e.pointerId){
    if(!stroke.armed){
     const dx=Math.abs(e.clientX-stroke.x),dy=Math.abs(e.clientY-stroke.y);
     if(dy>6&&dy>dx){finish();return}if(dx<7)return;
     stroke.armed=true;surface.setPointerCapture(e.pointerId);plant(null,stroke.p);
    }
    if(p)plant(stroke.p,p);stroke.p=p;
   }
   repaint();
  });
  listen(surface,'pointerup',e=>{if(stroke?.id!==e.pointerId)return;if(!stroke.armed)plant(null,get(e));finish()});
  for(const type of ['pointercancel','lostpointercapture'])listen(surface,type,finish);
  listen(surface,'pointerleave',()=>{if(!stroke){ring.visible=false;repaint()}});
  listen(vista,'keydown',e=>{
   if(e.key==='Escape'){e.preventDefault();close();return}
   if(e.target!==vista||e.altKey||e.ctrlKey||e.metaKey)return;
   const dir={ArrowLeft:-1,ArrowRight:1,ArrowUp:-1,ArrowDown:1}[e.key];
   if(dir){
    // Camera faces west. Screen-right travels north; screen-up travels away from the eye.
    const a=selected??ground(centre),side=e.key==='ArrowRight'||e.key==='ArrowLeft';
    const p=ground({x:a.x+(side?.068:.20)*dir,z:a.z+(side?-.24:.068)*dir});
    if(p)updateRing(p);
   }else if(e.key===' '||e.key==='Enter'){plant(null,selected);remember();announce(count())}else return;
   e.preventDefault();repaint();
  });
  updateRing(ground(centre));announce(count());
 }
 return {activate,get active(){return active},count,
  frame(cp,aim){const narrow=camera.aspect<1;cp.set(narrow?13.6:12.85,narrow?2.08:1.78,1.43);aim.set(8.47,-.64,-.31);camera.fov=narrow?55:47},
  brush(value){if(['mix','0','1','2','erase'].includes(value))brush=value},
  undo(){const old=undoStack.pop();if(old){rows.splice(0,rows.length,...old);refresh()}},
  reset(){if(rows.length){previous=rows.slice();rows.length=0;remember();refresh()}updateRing(ground(centre))},
  leave(){remember();controller?.abort();active=false;requestPaint=null;refresh();ring.visible=false;group.visible=count()>0}
 };
}
