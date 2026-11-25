// Render-only 16A consent-plan study. Local east/north coordinates are retained;
// no street address, location fix, address map, LiDAR model or energy estimate.
import * as T from 'three';
import { PANEL, inRings } from './roof.mjs';
import { drawCanopy, seed01 } from './foliage.mjs';
const deg=Math.PI/180, P=(x,y,z)=>new T.Vector3(x,y,z), mx=48;
const recipeUrl=new URL('./study16a.json',import.meta.url);

export async function loadStudy16a(){
 const r=await fetch(recipeUrl); if(!r.ok) throw Error('The 16A plan study could not be read.');
 return r.json();
}
export function roofOutline(unit){
 const W=Math.max(...unit.walls.filter(w=>w.axis==='x').map(w=>w.to),...unit.walls.filter(w=>w.axis==='z').map(w=>w.at));
 const D=Math.max(...unit.walls.filter(w=>w.axis==='z').map(w=>w.to),...unit.walls.filter(w=>w.axis==='x').map(w=>w.at));
 const {pitchDeg,eave,verge}=unit.roof, pitch=pitchDeg*deg, slope=Math.tan(pitch);
 const eastNorth=(u,v)=>[unit.origin[0]+u*unit.u[0]+v*unit.v[0],unit.origin[1]+u*unit.u[1]+v*unit.v[1]];
 const plane=(v)=>unit.ffl+unit.plate+.22+(D/2-Math.abs(v-D/2))*slope;
 return {W,D,pitch,eave,verge,plane,eastNorth};
}
export function studyPanels(recipe){
 const out=[];
 for(const [key,unit] of Object.entries(recipe.units)){
  const {W,D,pitch,eave,verge,plane,eastNorth}=roofOutline(unit);
  const cos=Math.cos(pitch), sin=Math.sin(pitch), U=P(unit.u[0],0,-unit.u[1]),V=P(unit.v[0],0,-unit.v[1]);
  const n=P(-unit.v[0]*sin,cos,unit.v[1]*sin), az=(Math.atan2(n.x,-n.z)/deg+360)%360;
  const h0=.64-verge,h1=W+verge-.64,v0=.60-eave,v1=D/2-.50;
  const stepU=PANEL.l+.05,stepV=(PANEL.w+.045)*cos, nu=Math.floor((h1-h0+.05)/stepU),nv=Math.floor((v1-v0+.045*cos)/stepV);
  for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){
   const u=(h0+h1)/2+(i-(nu-1)/2)*stepU,v=(v0+v1)/2+(j-(nv-1)/2)*stepV;
   const [e,nn]=eastNorth(u,v);
   out.push({e,n:nn,z:plane(v)+.055+PANEL.standoff/cos,azimuth:az,landscape:true,normal:[n.x,-n.z,n.y],unit:key,u,v});
  }
 }
 return out;
}
function heightFn(dat){
 const b=atob(dat.data), a=new Uint16Array(dat.nx*dat.nz);
 for(let i=0;i<a.length;i++) a[i]=b.charCodeAt(i*2)|b.charCodeAt(i*2+1)<<8;
 return (e,n)=>{
  const x=(e-dat.x0)/dat.h,y=(n-dat.z0)/dat.h;
  const ix=Math.max(0,Math.min(dat.nx-2,Math.floor(x))),iy=Math.max(0,Math.min(dat.nz-2,Math.floor(y)));
  const f=Math.max(0,Math.min(1,x-ix)),g=Math.max(0,Math.min(1,y-iy)),k=iy*dat.nx+ix;
  return dat.base+dat.scale*(a[k]*(1-f)*(1-g)+a[k+1]*f*(1-g)+a[k+dat.nx]*(1-f)*g+a[k+dat.nx+1]*f*g);
 };
}
function buildMaterial(color, material){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
 const ctx=canvas.getContext('2d'), im=ctx.createImageData(256,256);
 for(let y=0;y<256;y++) for(let x=0;x<256;x++){
  const grain=seed01(Math.floor(y/3)*23+Math.floor(x/5)*417), fine=seed01(x+y*347);
  const v=material==='wood'? .78+.12*grain+.10*fine : .75+.15*grain+.1*fine;
  const i=(y*256+x)*4; im.data.set([v*255,v*255,v*255,255],i);
 }
 ctx.putImageData(im,0,0);const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(material==='wood'?6:3,3);
 return new T.MeshStandardMaterial({color,map:tex,roughness:material==='wood'?.76:.88,side:T.DoubleSide});
}
function box(w,h,d,x,y,z,mat){const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;return m;}
function studyHome(unit,ground,toScene,key){
 const {W,D,pitch,eave,verge,plane,eastNorth}=roofOutline(unit), root=new T.Group(), q=unit.ffl, [e,n]=eastNorth(0,0);
 root.name=key+' proposed home · sourced gable'; root.position.copy(toScene(e,n,q));root.rotation.y=Math.atan2(unit.u[1],unit.u[0]);
 const roof=new T.MeshStandardMaterial({color:0x373d3f,roughness:.54,metalness:.36}), trim=new T.MeshStandardMaterial({color:0x313537,roughness:.55,metalness:.3});
 const cedar=buildMaterial(0x814d31,'wood'), dark=buildMaterial(0x444647,'wood'), deck=buildMaterial(0x9c8063,'wood'), glass=new T.MeshPhysicalMaterial({color:0x52645c,roughness:.16,metalness:.12,clearcoat:1,clearcoatRoughness:.13});
 const length=W+2*verge, sloped=(D/2+eave)/Math.cos(pitch);
 for(const s of [-1,1]){
  const v=D/2+s*(D/2+eave)/2, y=plane(v)-q;
  const sheet=box(length,.04,sloped,W/2,y+.012,v,roof);sheet.rotation.x=s*pitch;root.add(sheet);
  for(let i=0;i<Math.floor(length/.19);i++){const r=box(.024,.022,sloped,W/2-length/2+.09+i*.19,y+.043,v,trim);r.rotation.x=s*pitch;root.add(r);}
  const eaveV=s<0?-eave:D+eave, eaveY=plane(eaveV)-q;
  root.add(box(length+.04,.14,.10,W/2,eaveY-.077,eaveV,trim));
  for(const x of [-verge,W+verge]){const m=box(.085,.16,sloped,x,y-.059,v,trim);m.rotation.x=s*pitch;root.add(m);}
 }
 root.add(box(length+.03,.09,.16,W/2,plane(D/2)-q+.038,D/2,trim));
 // Window and door bounds come from the plan, not guessed placements.
 for(const w of unit.walls){
  const alongX=w.axis==='x', H=unit.plate, L=w.to-w.from, out=w.at===0?-1:1, base=off=>w.at+out*off;
  function wall(a,b,lo,hi,m,dep=.13,off=0){if(b-a<.005||hi-lo<.005)return; const c=(a+b)/2,y=(lo+hi)/2;root.add(alongX?box(b-a,hi-lo,dep,c,y,base(off),m):box(dep,hi-lo,b-a,base(off),y,c,m));}
  const bounds=[w.from,...w.openings.flatMap(o=>[o.a,o.b]),w.to].sort((a,b)=>a-b);
  for(let i=0;i<bounds.length-1;i++){
   const a=bounds[i],b=bounds[i+1], o=w.openings.find(o=>o.a<=(a+b)/2&&o.b>=(a+b)/2);
   const m=alongX&&out<0?cedar:dark;
   if(!o){wall(a,b,0,H,m);continue;}
   wall(a,b,0,o.sill,m);wall(a,b,o.head,H,m);wall(a,b,o.sill,o.head,trim,.16,.006);
   wall(a+.045,b-.045,o.sill+.045,o.head-.045,glass,.052,.085);
  }
  if(!alongX){const shape=new T.Shape();shape.moveTo(0,H);shape.lineTo(D/2,plane(D/2)-q);shape.lineTo(D,H);shape.closePath();const g=new T.ShapeGeometry(shape);g.rotateY(-Math.PI/2);g.translate(w.at,0,0);const m=new T.Mesh(g,dark);m.castShadow=m.receiveShadow=true;root.add(m);}
 }
 root.add(box(W,.24,D,W/2,-.13,D/2,dark));
 for(const u of [.2,W/2,W-.2])for(const v of [.2,D-.2]){
  const lev=ground(...eastNorth(u,v))-q, h=Math.max(.10,-lev+.21);
  root.add(box(.18,h,.18,u,lev+h/2,v,deck));
 }
 const ds=unit.deck;
 // A deliberately simple deck band underneath the documented deck span.
 root.add(box(ds.u1-ds.u0,.22,1.72,(ds.u0+ds.u1)/2,-.15,-.86,deck));
 return root;
}

function contextDwelling(parts, scene){
 const walls=buildMaterial(0xccc3b0,'ground'), roof=buildMaterial(0x565b58,'ground');
 for(const spec of Object.values(parts)){
  const pts=spec.rect.map(([e,n])=>scene.toScene(e,n,spec.ffl+2.45));
  const len=pts[1].distanceTo(pts[0]),wid=pts[3].distanceTo(pts[0]), v=pts[1].clone().sub(pts[0]).normalize(), c=pts[0].clone().lerp(pts[2],.5);
  const mass=box(len,2.65,wid,c.x,c.y-1.325,c.z,walls);
  mass.rotation.y=Math.atan2(-v.z,v.x);scene.look.add(mass);
  const ridgeLen=Math.max(0,len-wid);const l=c.clone().addScaledVector(v,-ridgeLen/2),r=c.clone().addScaledVector(v,ridgeLen/2);
  l.y=r.y=spec.ridge-scene.site.z0;
  const verts=[pts[0],pts[1],r,pts[0],r,l,pts[1],pts[2],r,pts[2],pts[3],l,pts[2],l,r,pts[3],pts[0],l];
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts.flatMap(vv=>vv.toArray()),3));g.computeVertexNormals();
  const shade=new T.Mesh(g,roof);shade.castShadow=shade.receiveShadow=true;scene.look.add(shade);
 }
}
export function buildStudy16a(scene,recipe) {
 const toScene=scene.toScene.bind(scene), ground=heightFn(recipe.dtm);
 const G=new T.PlaneGeometry(88,72,176,144);G.rotateX(-Math.PI/2);const vertices=G.attributes.position;
 const cols=[],greenA=new T.Color(0x3f512d),greenB=new T.Color(0x6a7543),patio=new T.Color(0xa1988d),t=new T.Color();
 const rings=recipe.impervious.polys.map(r=>[r]);
 const walk=new T.Color(0xb3a699), gravel=new T.Color(0x8b7864);
 const houseAccess=Object.values(recipe.units).map(unit=>{const {W,D,eastNorth}=roofOutline(unit);return{unit,W,D,ring:[[eastNorth(.65,D),eastNorth(3,D),eastNorth(3,D+4),eastNorth(.65,D+4),eastNorth(.65,D)]]};});
 for(let i=0;i<vertices.count;i++){
  const e=vertices.getX(i)+20,n=-vertices.getZ(i)-15, p=toScene(e,n,ground(e,n));vertices.setXYZ(i,p.x,p.y,p.z);
  const u=.48+.31*Math.sin(e*.23+n*.15)+.09*(seed01(i)-.5);
  t.copy(greenA).lerp(greenB,u);if(rings.some(r=>inRings(e,n,r))) t.copy(patio).multiplyScalar(.86+.20*seed01(i));
  if(houseAccess.some(({ring})=>inRings(e,n,ring)))t.copy(walk).multiplyScalar(.88+.14*seed01(i));
  cols.push(t.r,t.g,t.b);
 }
 G.setAttribute('color',new T.Float32BufferAttribute(cols,3));G.computeVertexNormals();
 const groundMat=buildMaterial(0xffffff,'ground');groundMat.vertexColors=true;groundMat.map.repeat.set(53,51);
 const surface = new T.Mesh(G,groundMat);surface.receiveShadow=true;scene.look.add(surface);
 for(const [key,u] of Object.entries(recipe.units))scene.look.add(studyHome(u,ground,toScene,key));
 contextDwelling(recipe.existing,scene);
 // Survey tree positions only; tree heights/species here are illustrative.
 const trees=recipe.trees.map(([e,n],i)=>({e,n,ground:ground(e,n),height:5+i*.65,radius:2.25+i*.18,kind:'tree'}));
 for(let i=0;i<13;i++){const f=i/12,[a,b]=recipe.hedge;const e=a[0]+(b[0]-a[0])*f,n=a[1]+(b[1]-a[1])*f;trees.push({e,n,ground:ground(e,n),height:1.15,radius:.66,kind:'shrub'});}
 for(const {unit,W,D} of houseAccess){
  const {eastNorth}=roofOutline(unit);
  for(let i=0;i<8;i++){
   const u=.4+(W-.8)*i/7,v=-1.3-.18*seed01(i+31),[e,n]=eastNorth(u,v);
   trees.push({e,n,ground:ground(e,n),height:.5+.43*seed01(i+61),radius:.35+.22*seed01(i+32),kind:'shrub'});
  }
 }
 scene.look.add(drawCanopy(trees,scene.tier==='high',{e:20,n:-10},toScene));
 return {trees:trees.length};
}
