// Roof Solar 16A study only. Keep the traced survey triangles, original UVs on
// the timber and roof, native plant positions, address calculations and PV overlay.
const mix=(a,b,t)=>a+(b-a)*t;
const clamp=(v,min=0,max=1)=>Math.min(max,Math.max(min,v));
const smooth=t=>t*t*(3-2*t);
function hash(x,z){
 let h=Math.imul(x,73856093)^Math.imul(z,19349663);
 h=Math.imul(h^(h>>>16),0x45d9f3b);h=Math.imul(h^(h>>>16),0x45d9f3b);
 return ((h^(h>>>16))>>>0)/4294967296;
}
export function noise(x,z){
 const a=Math.floor(x),b=Math.floor(z),u=smooth(x-a),v=smooth(z-b);
 return mix(mix(hash(a,b),hash(a+1,b),u),mix(hash(a,b+1),hash(a+1,b+1),u),v);
}
export function lawnColor(e,n){
 const patch=noise(e*.31,n*.29), fine=noise(e*1.8,n*1.7), grit=hash(Math.floor(e*120),Math.floor(n*120));
 const worn=clamp((noise(e*.105+4,n*.122)-.57)*2.2)*.37;
 const tint=(patch-.5)*16+(fine-.5)*11+(grit-.5)*11;
 return [mix(83,119,worn)+tint,mix(94,109,worn)+tint,mix(59,73,worn)+tint*.72];
}
function surfaceMap(T, doc, width, height, pixel){
 const c=doc.createElement('canvas');c.width=width;c.height=height;
 const ctx=c.getContext('2d',{alpha:false});
 const img=ctx.createImageData(width,height);
 for(let y=0,i=0;y<height;y++)for(let x=0;x<width;x++,i+=4){
  const [r,g,b]=pixel(x,y,width,height);
  img.data[i]=r;img.data[i+1]=g;img.data[i+2]=b;img.data[i+3]=255;
 }
 ctx.putImageData(img,0,0);
 const map=new T.CanvasTexture(c);map.colorSpace='srgb';map.anisotropy=4;
 return map;
}
export function applyStudyFinish({app,T,doc}){
 const ground=[],beds=[],wood=[],steel=[],leaf=[],gravel=[];
 for(const l of app.built.layers){
  l.object?.traverse(o=>{
   if(!o.isMesh||Array.isArray(o.material)||!o.geometry.attributes.position)return;
   if(l.id==='ground'&&/^ground_(lawn|context)$/.test(o.name))ground.push(o);
   if(l.id==='planting'&&o.userData.source==='proposed'){
    if(/^bed_16[CD]_/.test(o.name))beds.push(o);
    if(o.isInstancedMesh&&o.userData.kind==='planting'&&o.geometry.attributes.color)leaf.push(o);
   }
   if(l.id==='planting'&&/^path_[123]$/.test(o.name)&&o.userData.source==='scaled')gravel.push(o);
   if(l.id==='homes'&&/^(north|south)_deck_boards$/.test(o.name))wood.push(o);
   if(l.id==='homes'&&o.name==='roof_sheets')steel.push(o);
   if(l.id==='existing'&&/^existing_(west|east)_roof$/.test(o.name))steel.push(o);
  });
 }
 const v=new T.Vector3();
 const cloned=m=>{const material=m.material.clone();m.material=material;return material;};
 // A single non-repeating tile over both exact, joined survey/context domains.
 // Sample positions in metres so that the visible edge cannot break into pattern blocks.
 if(ground.length){
  let x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity;
  for(const m of ground){
   m.updateWorldMatrix(true,false);
   const p=m.geometry.attributes.position;
   for(let i=0;i<p.count;i++){
    v.fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld);
    x0=Math.min(x0,v.x);x1=Math.max(x1,v.x);z0=Math.min(z0,v.z);z1=Math.max(z1,v.z);
   }
  }
  const size=app.phone||app.lowTier?512:1024;
  const map=surfaceMap(T,doc,size,size,(x,y,w,h)=>lawnColor(mix(x0,x1,x/(w-1)),mix(z1,z0,y/(h-1))));
  for(const m of ground){
   const g=m.geometry.clone();const p=g.attributes.position,uv=g.attributes.uv;if(!uv)continue;
   for(let i=0;i<p.count;i++){
    v.fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld);
    uv.setXY(i,(v.x-x0)/Math.max(.001,x1-x0),(v.z-z0)/Math.max(.001,z1-z0));
   }
   const mat=cloned(m);mat.map=map;mat.color.setHex(0xffffff);mat.normalMap=null;mat.roughnessMap=null;mat.roughness=.94;m.geometry=g;
  }
 }
 const bark=surfaceMap(T,doc,256,256,(x,y)=>{
  const n=(noise(x*.28+y*.09,y*.72)-.5)*27+(hash(x,y)-.5)*14;
  const flake=Math.pow(clamp((noise(x*.11-y*.06,y*.37)-.53)*3.2),2)*28;
  return [70+n+flake,50+n+flake*.65,38+n+flake*.4];
 });
 for(const m of gravel){
  const mat=cloned(m);mat.color.setHex(0xd1c6b5);mat.roughnessMap=null;mat.roughness=.98;
  mat.normalScale?.multiplyScalar(.78);
 }
 for(const m of beds){
  const mat=cloned(m);mat.map=bark;mat.color.setHex(0xffffff);mat.roughnessMap=null;mat.roughness=.95;
  mat.normalScale?.multiplyScalar(.4);
 }
 for(const m of steel){
  const mat=cloned(m);
  mat.roughnessMap=null;
  mat.roughness=labeledRoof(m.name)? .86 : .73;
  mat.normalScale?.multiplyScalar(labeledRoof(m.name)? .43 : .66);
  if(mat.clearcoat!==undefined){mat.clearcoat=.07;mat.clearcoatRoughness=.53;}
  mat.envMapIntensity=.62;
 }
 for(const m of wood){
  const mat=cloned(m);mat.color.setHex(0xe8d8cc);mat.roughnessMap=null;mat.roughness=.89;mat.normalScale?.multiplyScalar(.6);
  const g=m.geometry.clone(),p=g.attributes.position,original=g.attributes.color;
  const rgb=new Float32Array(p.count*3);
  const rows=new Map();
  // Slight variation across the span of the merged boards. Preserve their
  // existing grain texture, positions, UVs, creases and framing.
  for(let i=0;i<p.count;i++){
   const r=Math.floor(Math.abs(p.getZ(i))*9.6+.16);
   const tone=rows.get(r)??(.84+.16*hash(r,83));
   rows.set(r,tone);
   rgb[i*3]=tone*(original?.getX(i)??1);rgb[i*3+1]=tone*(original?.getY(i)??1);rgb[i*3+2]=tone*(original?.getZ(i)??1);
  }
  g.setAttribute('color',new T.Float32BufferAttribute(rgb,3));
  m.geometry=g;mat.vertexColors=true;
 }
 for(const m of leaf){
  const g=m.geometry.clone(),p=g.attributes.position,c=g.attributes.color;
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
   const soften=.73+.31*noise(x*3.4+y*.85,z*3.1-y*.31);
   const dry=clamp(noise(x*5.1+9,z*4.4+y*3)-.55)*.17;
   c.setXYZ(i,c.getX(i)*(soften+dry),c.getY(i)*soften,c.getZ(i)*(.88*soften+dry*.2));
  }
  c.needsUpdate=true; m.geometry=g;
  const mat=cloned(m);mat.roughness=.82;mat.envMapIntensity=.57;
 }
 return {ground:ground.length,beds:beds.length,wood:wood.length,steel:steel.length,foliage:leaf.length,gravel:gravel.length};
}
const labeledRoof=name=>name.startsWith('existing_');
