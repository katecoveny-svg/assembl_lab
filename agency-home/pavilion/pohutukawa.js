import {floweringSprays} from './coastal-finish.js';
import * as T from './vendor/three.webgpu.min.js';

const point=(x,y,z)=>new T.Vector3(x,y,z);
const up=point(0,1,0);
function geometry(vertices,uvs,indices,tones){
 const geo=new T.BufferGeometry();
 geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
 geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
 if(tones)geo.setAttribute('color',new T.Float32BufferAttribute(tones,3));
 geo.setIndex(indices);geo.computeVertexNormals();return geo;
}
function specimen(seed,wood,leaves,foreground=false) {
 let state=seed;
 const random=()=>((state=Math.imul(1664525,state)+1013904223>>>0)/4294967296);
 const between=(a,b)=>a+(b-a)*random();
 const terminals=[],woodTones=[],trunk=[],woodUV=[],woodIndex=[],blades=[],leafUV=[],leafIndex=[],tones=[];
 // Continuous taper, eccentric rings and grain measured along the limb. Ends meet inside their parent.
 function limb(points,r0,r1){
  const curve=new T.CatmullRomCurve3(points,false,'centripetal');
  const rings=r0>.16?25:6,sides=r0>.16?23:6,frames=curve.computeFrenetFrames(rings,false);
  const start=trunk.length/3,len=curve.getLength(),phase=between(0,6.28);
  for(let i=0;i<=rings;i++){
   const f=i/rings,c=curve.getPointAt(f),r=T.MathUtils.lerp(r0,r1,f);
   for(let j=0;j<=sides;j++){
    const ang=j/sides*2*Math.PI,twist=ang+phase+f*.48;
    const groove=Math.pow(.5+.5*Math.cos(twist*7+.9*Math.sin(5*f+phase)),6);
    const ridge=.105*Math.cos(3*twist)+.079*Math.sin(5*twist-f*.35)-.1*groove;
    const ridged=r*(1+ridge);
    const v=c.clone().addScaledVector(frames.normals[i],Math.cos(ang)*ridged).addScaledVector(frames.binormals[i],Math.sin(ang)*ridged);
    trunk.push(v.x,v.y,v.z);woodUV.push(j/sides*Math.max(.45,r0*2.15),f*len/1.7);
    const patina=.95-.25*groove+.07*Math.sin(4*twist+f*9);woodTones.push(patina*.98,patina,patina);
    if(i<rings&&j<sides){const a=start+i*(sides+1)+j,b=a+sides+1;woodIndex.push(a,b+1,b,a,a+1,b+1)}
   }
  }
  return curve;
 }
 const lamina=[],laminaColor=[],laminaUV=[],laminaIndex=[];
 function leafPair(root,heading){
  const tangent=point(Math.cos(heading),.36,Math.sin(heading)).normalize();
  const cross=point(-tangent.z,0,tangent.x).normalize();
  for(const side of [-1,1]){
   const tip=tangent.clone().addScaledVector(cross,side*.82).normalize();
   const across=point(-tip.z,.24*side,tip.x).normalize();
   const length=between(.075,.115),width=length*.23,start=lamina.length/3;
   for(const [along,apart,ridge] of [[0,0,0],[.44,-1,0],[.48,0,.006],[.51,1,0],[1,0,-.012]]){
    const position=root.clone().addScaledVector(tip,length*along).addScaledVector(across,width*apart);
    lamina.push(position.x,position.y+ridge,position.z);laminaUV.push(along,(apart+1)/2);
    const tint=.70+.42*along+.08*Math.cos(heading);laminaColor.push(.10*tint,.19*tint,.095*tint);
   }
   for(const n of [0,1,2,0,2,3,1,4,2,2,4,3])laminaIndex.push(start+n);
  }
 }
 function spray(root,direction,size){
  const F=direction.normalize(),right=point(1,0,0).cross(F).normalize().applyAxisAngle(F,between(-1.45,1.45)),normal=F.clone().cross(right).normalize();
  const col=Math.floor(random()*4),u=col%2*.5,v=Math.floor(col/2)*.5,k=blades.length/3;
  const shade=between(.72,1.19);
  for(const [x,y] of [[-.5,0],[.5,0],[-.5,.52],[.5,.52],[-.5,1],[.5,1]]){
   const pos=root.clone().addScaledVector(F,y*size).addScaledVector(right,x*size).addScaledVector(normal,.085*Math.sin(y*Math.PI)*size);
   blades.push(pos.x,pos.y,pos.z);leafUV.push(u+(x+.5)*.497+.001,v+y*.497+.001);
   const a=shade*(.69+y*.31);tones.push(a,a,a);
  }
  leafIndex.push(k,k+1,k+2,k+2,k+1,k+3,k+2,k+3,k+4,k+4,k+3,k+5);
 }
 function twigs(start,heading,length,radius,level){
  const axis=point(Math.cos(heading),0,Math.sin(heading)),side=point(-axis.z,0,axis.x);
  const rise=length*between(.37,.94),end=start.clone().addScaledVector(axis,length).addScaledVector(up,rise);
  const mid=start.clone().lerp(end,.48).addScaledVector(side,between(-.32,.32)*length).addScaledVector(up,between(-.22,.17)*length);
  const curve=limb([start,mid,end],radius,radius*.49);
  if(level>0){
   const count=level===2?3:2;
   for(let i=0;i<count;i++){const t=i===0?.99:between(.5,.88);
    twigs(curve.getPoint(t),heading+(i===0?between(-.45,.45):(i===1?1:-1)*between(.54,1.52)),length*between(.62,.83),radius*between(.44,.62),level-1)}
  }else{
   for(let j=0;j<13;j++){
    const t=between(.22,1),p=curve.getPoint(t),az=heading+between(-2.1,2.1);
    const shoot=point(Math.cos(az),between(.15,1.24),Math.sin(az)).normalize();
    if(j%3===0)terminals.push(p.clone().addScaledVector(shoot,.45).toArray());
    if(foreground){
     const size=between(.36,.63);
     for(let n=1;n<=6;n++)leafPair(p.clone().addScaledVector(shoot,size*n/6),az+n*.57);
     if(j%3===0)spray(p,shoot,size*.83);
    }else {spray(p,shoot,between(.46,.82));spray(p.clone().addScaledVector(shoot,.27),point(shoot.x+.45,between(.15,1.1),shoot.z-.35),between(.44,.70));}
   }
  }
 }
 const base=point(0,-.18,0),joint=point(-.27,1.18,.04);
 limb([base,point(-.04,.38,.08),joint],.54,.39);
 for(let j=0;j<7;j++){const h=j*.9+between(-.22,.22),d=point(Math.cos(h),0,Math.sin(h));limb([point(0,.36,0),d.clone().multiplyScalar(.62).add(point(0,.06,0)),d.clone().multiplyScalar(between(.92,1.23)).add(point(0,-.19,0))],.23,.045)}
 // Unequal low forks: one long seaward arm and one short, high, sheltered crown.
 for(const [x,y,z,spread,girth] of [[-2.75,2.50,.24,1.86,.34],[.68,3.48,-.59,1.34,.31],[1.95,2.68,1.05,1.66,.3],[-1.21,3.07,-1.64,1.37,.25],[-.63,2.26,1.92,1.58,.24]]){
  const end=point(x+between(-.25,.2),y+between(-.16,.28),z),start=joint.clone().add(point(between(-.15,.08),between(-.61,.05),between(-.1,.1)));
  const curve=limb([start,start.clone().add(point(x*.31,.32,z*.17)),start.clone().lerp(end,.61).add(point(-.25,.14,.26)),end.clone().add(point(-.18,-.52,.16)),end],girth,girth*.49);
  const h=Math.atan2(z,x);for(const d of [-.86,.26,1.12])twigs(curve.getPoint(d===.26?1:between(.62,.88)),h+d+between(-.22,.22),spread*between(.82,1.17),girth*.49,2);
 }
 const group=new T.Group();
 for(const [geo,mat] of [[geometry(trunk,woodUV,woodIndex,woodTones),wood],[geometry(blades,leafUV,leafIndex,tones),leaves]]){
  const m=new T.Mesh(geo,mat);m.castShadow=m.receiveShadow=true;group.add(m)
 }
 if(laminaIndex.length){
  const m=new T.Mesh(geometry(lamina,laminaUV,laminaIndex,laminaColor),new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:.61}));
  m.castShadow=m.receiveShadow=true;group.add(m);
 }
 group.add(floweringSprays(terminals));return group;
}
export async function plantPohutukawa(scene,ground,load,small){
 const [bark,bump,sprigs]=await Promise.all(['pohutukawa-bark.webp','pohutukawa-bark-n.webp','pohutukawa-sprays.webp'].map(load));
 bark.colorSpace=sprigs.colorSpace=T.SRGBColorSpace;
 for(const m of [bark,bump]){m.wrapS=m.wrapT=T.RepeatWrapping;m.anisotropy=4}
 sprigs.anisotropy=6;
 const wood=new T.MeshStandardMaterial({map:bark,vertexColors:true,normalMap:bump,normalScale:new T.Vector2(.85,.85),roughness:.94,side:T.DoubleSide});
 const leaf=new T.MeshStandardMaterial({map:sprigs,alphaTest:.37,side:T.DoubleSide,roughness:.76,vertexColors:true});
 const variants=[257,501,791].map((s,i)=>specimen(s,wood,leaf,i===0));
 const sites=[[-12.4,1.85,1.12,-.48],[-23.5,6.0,.77,1.9],[-19.5,-4.8,.7,2.62],[15,-6,.69,2.03],[9.1,-11.2,.61,-.82],[-16,-11.4,.64,-1.2],[18,-3.3,.67,1.6],[-9,-19,.54,.73],[-1.8,-11.4,.43,2.4]];
 for(const [i,[x,z,s,yaw]] of sites.entries()){
  if(small&&i>4)continue;
  const o=variants[i%3].clone(true);if(i>1&&i!==4)o.remove(o.children.at(-1));o.position.set(x,ground(x,z),z);o.rotation.y=yaw;o.scale.set(s,s*(i===0?1.07:1),s);scene.add(o)
 }
}
