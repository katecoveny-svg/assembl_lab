import * as T from './vendor/three.webgpu.min.js';

export function dressedDeck(){
 // Long sawn grain, small latewood bands and no dirt or distress overlay.
 const c=document.createElement('canvas');c.width=1024;c.height=256;
 const ctx=c.getContext('2d'),im=ctx.createImageData(c.width,c.height);
 let n=11073;const rnd=()=>((n=Math.imul(n,1664525)+1013904223>>>0)/4294967296);
 for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
  const t=x/c.width*Math.PI*2,h=y/c.height*Math.PI*2;
  const stripe=12*h+.87*Math.sin(t+.62*Math.sin(h*2))+.35*Math.cos(t*2-h);
  const fiber=Math.cos(stripe*4+.25*Math.sin(t-h)),ring=Math.exp(-11*(1+Math.sin(stripe)));
  const l=4*Math.sin(stripe)+2.5*fiber-8*ring+(rnd()-.5)*3.2;
  const i=(x+y*c.width)*4;im.data[i]=175+l;im.data[i+1]=148+l*.91;im.data[i+2]=116+l*.78;im.data[i+3]=255;
 }
 ctx.putImageData(im,0,0);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=8;return tex;
}
export function deckFixings(scene){
 const locations=[];for(let row=0;row<16;row++){const z=2.19+row*.149;for(let j=0;j<23;j++){const x=-6.92+j*.625;
  for(const off of [-.042,.042])locations.push([x,-.049,z+off])}}
 const steel=new T.MeshStandardMaterial({color:0x9b9a89,roughness:.59,metalness:.46});
 const screws=new T.InstancedMesh(new T.CylinderGeometry(.0032,.0032,.0013,8),steel,locations.length),m=new T.Matrix4();
 locations.forEach(([x,y,z],i)=>screws.setMatrixAt(i,m.makeTranslation(x,y,z)));scene.add(screws);
}
export function floweringSprays(sites){
 // Bound anthers and filaments to the terminal sprays. Each umbel has a darker calyx at its base.
 const verts=[],col=[],idx=[],silhouettes=[],uv=[];let seed=2331;
 const rnd=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
 const red=new T.Color(0xbc241b),warm=new T.Color(0xd53420),anther=new T.Color(0xd1a45b),base=new T.Color(0x652923);
 function tri(a,b,c,t){const k=verts.length/3;for(const p of [a,b,c]){verts.push(...p);col.push(t.r,t.g,t.b)}idx.push(k,k+1,k+2)}
 for(const site of sites){
  if(rnd()>.29)continue;
  const [px,py,pz]=site;
  // Crossing fans carry the fine, curved stamens at distances where a single filament is subpixel.
  const tilt=rnd()*Math.PI,span=.105+rnd()*.04;
  for(let k=0;k<2;k++){const a=tilt+k*Math.PI/2,dx=Math.cos(a)*span,dz=Math.sin(a)*span;
   const quad=[[px-dx,py-.015,pz-dz],[px+dx,py-.015,pz+dz],[px+dx,py+span*1.4,pz+dz],[px-dx,py+span*1.4,pz-dz]];
   for(const i of [0,1,2,0,2,3]){silhouettes.push(...quad[i]);uv.push(...[[0,0],[1,0],[1,1],[0,1]][i])}}
  const clump=4+Math.floor(rnd()*3);
  for(let fl=0;fl<clump;fl++){const dir=rnd()*6.283,reach=rnd()*.09,x=px+Math.cos(dir)*reach,y=py+rnd()*.028,z=pz+Math.sin(dir)*reach,span=.034+rnd()*.025;
   for(let k=0;k<21;k++){const a=k*2.3999+rnd()*.26,r=span*Math.sqrt((k+.5)/21),dx=Math.cos(a)*r,dz=Math.sin(a)*r,up=.025+.032*(1-r/span)+rnd()*.010;
    const w=.0024,sx=-Math.sin(a)*w,sz=Math.cos(a)*w;
    const root=[x+dx*.08,y,z+dz*.08],mid=[x+dx*.49,y+up*.72,z+dz*.49],end=[x+dx,y+up,z+dz];
    tri(root,[mid[0]+sx,mid[1],mid[2]+sz],[mid[0]-sx,mid[1],mid[2]-sz],base);
    tri([mid[0]+sx,mid[1],mid[2]+sz],[mid[0]-sx,mid[1],mid[2]-sz],end,k%3?red:warm);
    if(k%4===0)tri([end[0]-sx,end[1],end[2]-sz],[end[0]+sx,end[1],end[2]+sz],[end[0],end[1]+.0027,end[2]],anther)
   }
  }
 }
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setAttribute('color',new T.Float32BufferAttribute(col,3));geo.setIndex(idx);geo.computeVertexNormals();
 const group=new T.Group();group.add(new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,roughness:.74,side:T.DoubleSide})));
 const c=document.createElement('canvas');c.width=256;c.height=192;const ctx=c.getContext('2d');
 for(const [ox,oy,rad] of [[88,145,66],[154,122,84],[55,124,47],[185,145,54]]){
  for(let k=0;k<94;k++){const a=-Math.PI*.99+rnd()*Math.PI*.99,l=rad*(.41+.59*Math.sqrt(rnd())),x=ox+Math.cos(a)*l,y=oy+Math.sin(a)*l;
   const t=rnd();ctx.strokeStyle=t<.26?'#81251f':t<.74?'#bf2421':'#de4031';ctx.lineWidth=1.8+rnd()*1.5;ctx.beginPath();ctx.moveTo(ox,oy);ctx.quadraticCurveTo(ox+(x-ox)*.34,oy+(y-oy)*.90,x,y);ctx.stroke();
   if(k%3===0){ctx.fillStyle='#d78f58';ctx.fillRect(x,y,1.55,1.45)}}}
 const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;const fans=new T.BufferGeometry();
 fans.setAttribute('position',new T.Float32BufferAttribute(silhouettes,3));fans.setAttribute('uv',new T.Float32BufferAttribute(uv,2));fans.computeVertexNormals();
 group.add(new T.Mesh(fans,new T.MeshStandardMaterial({map:texture,alphaTest:.26,side:T.DoubleSide,roughness:.79})));return group;
}
