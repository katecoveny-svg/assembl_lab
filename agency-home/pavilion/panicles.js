import * as T from './vendor/three.webgpu.min.js';
import {grade} from './landscape.js';

// A few near culms resolve into spikelets. Far clumps stay economical.
export function finePanicles(scene,time,gust){
 const pos=[],color=[],rootPhase=[],bend=[],indices=[];let seed=981;
 const rnd=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296),v=(x,y,z)=>new T.Vector3(x,y,z);
 function blade(a,b,width,tone,phase,k){const base=pos.length/3,mid=a.clone().lerp(b,.54);const axis=b.clone().sub(a).normalize();
  const side=new T.Vector3().crossVectors(axis,v(.17,.34,.87)).normalize().multiplyScalar(width);
  for(const [p,w] of [[a,0],[mid.clone().add(side),.5],[mid.clone().sub(side),.5],[b,1]]){pos.push(p.x,p.y,p.z);color.push(tone[0],tone[1],tone[2]);rootPhase.push(phase);bend.push(k+w*.027)}
  indices.push(base,base+1,base+2,base+1,base+3,base+2)
 }
 const locations=[[8.45,10.72],[7.92,11.47],[-4.35,6.6],[5.75,7.20],[9.46,8.10]];
 for(const [cx,cz] of locations){for(let stem=0;stem<4;stem++){
  const x=cx+(rnd()-.5)*.28,z=cz+(rnd()-.5)*.28,y=grade(x,z)-.025,h=1.49+rnd()*.97,angle=rnd()*2.3-1.15,lean=.36+rnd()*.28,phase=x*.52+z*.32;
  const point=t=>v(x+Math.cos(angle)*lean*t*t,y+h*(1.14*t-.14*t*t)-Math.max(0,t-.78)**2*4.3,z+Math.sin(angle)*lean*t*t);
  for(let i=0;i<19;i++)blade(point(i/19),point((i+1)/19),.0057,[.17,.16,.077],phase,(i/19)**2);
  for(let j=0;j<39;j++){const t=.748+.245*j/39,a=point(t),f=(t-.748)/.245,span=(.052+.103*Math.sin(f*Math.PI))*(1-.66*f),direction=angle+(j%2?1:-1)*(.54+rnd()*.9);
   for(let n=0;n<3;n++){const L=span*(.75+rnd()*.42),mid=a.clone().add(v(Math.cos(direction)*L*.7,L*.29,Math.sin(direction)*L*.7));
    const end=mid.clone().add(v(Math.cos(direction)*L*.75,-L*(.43+rnd()*.30),Math.sin(direction)*L*.75));blade(a,mid,.0036,[.49,.42,.26],phase,t*t);
    for(let a0=0;a0<5;a0++){const at=mid.clone().lerp(end,a0/5);const tip=at.clone().add(v(.016+.04*Math.cos(direction),-.035-rnd()*.036,.05*Math.sin(direction)));blade(at,tip,.0033,[.68,.61,.43],phase,t*t)}
   }}
 }}
 const g=new T.BufferGeometry();for(const [name,arr,item] of [['position',pos,3],['color',color,3],['driftPhase',rootPhase,1],['rootWeight',bend,1]])g.setAttribute(name,new T.Float32BufferAttribute(arr,item));g.setIndex(indices);g.computeVertexNormals();
 const material=new T.MeshStandardNodeMaterial({color:0xfff6df,roughness:.65,vertexColors:true,side:T.DoubleSide});
 const {attribute,positionLocal,vec3}=T.TSL,w=attribute('rootWeight','float'),ph=attribute('driftPhase','float');const front=ph.mul(.84).sub(time.mul(1.13)).add(ph.mul(.29).add(time.mul(.42)).sin()).sin().mul(.5).add(.5);const wave=front.mul(front).mul(.105).add(ph.add(time.mul(1.61)).sin().mul(.047).add(ph.mul(.43).sub(time.mul(.91)).sin().mul(.026)).add(gust.mul(ph.mul(.62).add(time.mul(2.6)).sin()).mul(.145))).mul(w);
 material.positionNode=positionLocal.add(vec3(wave,wave.abs().mul(-.13),wave.mul(.35)));const o=new T.Mesh(g,material);o.castShadow=o.receiveShadow=true;scene.add(o)
}
