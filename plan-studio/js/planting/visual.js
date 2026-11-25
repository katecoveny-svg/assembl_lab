// Original lightweight Three.js planting silhouettes. The fixtures have no
// renderer dependency; this file is loaded only from the optional landscape tool.
import * as T from "three";
import {PLANTS,displayPhase} from "./catalog.js";
const GOLDEN=2.39996323;
const material=new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:.88,metalness:0});
function source(species,phase){
  const pos=[],color=[],indices=[];
  const c=(r,g,b)=>new T.Color(r,g,b);
  const leaf=(y,theta,L,width,start,slope,spread,shade)=>{
    const n=6, shift=pos.length/3,dx=Math.cos(theta),dz=Math.sin(theta),sx=-dz,sz=dx;
    for(let i=0;i<=n;i++){
      const f=i/n,s=start+spread*f*f,level=y+L*(slope*f-(slope>.58?.33:.44)*f*f);
      const wide=width*Math.max(.027,(1-f)*(.22+.85*Math.sin(Math.PI*f)));
      const k=shade.clone().multiplyScalar(.79+.24*f);
      for(const side of [-1,0,1]){
        pos.push(dx*s+sx*wide*side,level+Math.abs(side)*wide*.24,dz*s+sz*wide*side);
        color.push(k.r*(side===0?1.11:1),k.g*(side===0?1.1:1),k.b);
      }
      if(i)for(let t=0;t<2;t++){const a=shift+(i-1)*3+t,b=a+3;indices.push(a,b,a+1,b,b+1,a+1);}
    }
  };
  const stalk=(a,b,ra,rb,clr)=>{
    const n=6,first=pos.length/3;
    const dir=new T.Vector3(...b).sub(new T.Vector3(...a)).normalize(),left=new T.Vector3(1,0,0).cross(dir).normalize(),up=dir.clone().cross(left).normalize();
    for(let l=0;l<2;l++)for(let i=0;i<n;i++){
      const t=i/n*Math.PI*2,v=new T.Vector3(...(l?b:a)),radius=l?rb:ra;v.addScaledVector(left,Math.cos(t)*radius).addScaledVector(up,Math.sin(t)*radius);
      pos.push(...v);color.push(clr.r,clr.g,clr.b);
    }
    for(let i=0;i<n;i++){const j=(i+1)%n;indices.push(first+i,first+j,first+n+i,first+n+i,first+j,first+n+j);}
  };
  if(species==="harakeke"){
    for(let i=0;i<21;i++){const t=i*GOLDEN,f=(i%7)/7,y=.13+f*.23;leaf(y,t,.96+f*.23,.032+i%4*.006,.024,1.07,.42+f*.22,c(.13+f*.089,.24+f*.127,.055+f*.018));}
    if(phase!=="leaf")for(let n=0;n<2;n++){
      const d=n?-.16:.15, z=n?-.09:.11, H=1.39+n*.19;
      const stem=c(.14,.083,.064);stalk([d*.14,0,z*.17],[d,H,z],.025,.014,stem);
      for(let j=0;j<9;j++){
        const y=H-.39+j*.047, theta=j*GOLDEN+n, x=d*(y/H), zz=z*(y/H);
        const dx=Math.cos(theta)*(.20-j*.009),dz=Math.sin(theta)*(.20-j*.009), t=[x+dx,y+.12,zz+dz];
        stalk([x,y,zz],t,.012,.004,stem);
        for(let k=0;k<3;k++){
          const p=[t[0]-dx*k*.13,t[1]-k*.029,t[2]-dz*k*.13];
          const q=[p[0]+dx*.12,p[1]+.08,p[2]+dz*.12];
          stalk(p,q,.014,.006,phase==="flower"?c(.62+k*.047,.15+k*.045,.039):c(.20,.152,.09));
        }
      }
    }
  } else if(species==="toetoe"||species==="coastal-toetoe"){
    for(let i=0;i<18;i++){const f=(i%7)/7;leaf(.12,i*GOLDEN,1.12+f*.41,.018,.022,.97,.65+f*.28,c(.23+f*.09,.33+f*.06,.14));}
    if(species==="toetoe"||phase==="flower")for(let i=0;i<7;i++){
      const a=i*GOLDEN, x=Math.cos(a)*(.20+i*.015),z=Math.sin(a)*(.23+i*.015),y=1.39+i*.09;
      stalk([x*.19,0,z*.15],[x,y,z],.013,.008,c(.33,.25,.115));
      for(let j=0;j<6;j++)stalk([x*j/24+x,y-j*.05,z],[x+.13+Math.cos(a)*j*.018,y+.32-j*.065,z+Math.sin(a)*j*.024],.045-j*.003,.016,c(.70,.59,.36));
    }
  }else{
    let prev=[0,0,0];
    for(let i=1;i<=7;i++){const p=[.1*Math.sin(i*.41),i*.42,-.10*Math.cos(i*.41)+.10];stalk(prev,p,.091-i*.006,.083-i*.006,c(.22+i*.006,.167+i*.006,.112));prev=p;}
    for(let i=0;i<25;i++){const f=(i%8)/8;leaf(prev[1]-.15+f*.35,i*GOLDEN,.56+f*.12,.025+f*.013,.047,.89,.62+f*.25,c(.14+f*.076,.29+f*.097,.081));}
  }
  const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(pos,3));g.setAttribute("color",new T.Float32BufferAttribute(color,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
const geometry=new Map();
function prototypes(species,month){
  const phase=displayPhase(species,month),k=species+"|"+phase;
  if(!geometry.has(k))geometry.set(k,source(species,phase));return geometry.get(k);
}
export function layer(y,records,month=0) {
  const o=new T.Group();o.name="Proposed planting";
  const dot=new T.Object3D();let i=0;
  for(const species of Object.keys(PLANTS)){
    const rows=records.filter(p=>p.species===species);if(!rows.length)continue;
    const m=new T.InstancedMesh(prototypes(species,month), material,rows.length);
    m.castShadow=m.receiveShadow=true;
    m.name=species;m.userData={phase:displayPhase(species,month),proposed:true};
    rows.forEach((p,j)=>{
      dot.position.set(p.x,y,p.z);dot.rotation.set(0,p.angle,0);dot.scale.setScalar(p.scale);dot.updateMatrix();m.setMatrixAt(j,dot.matrix);
      const shade=.87+Math.abs(Math.sin((++i+p.x*17+p.z*3)*13.151))*.16;m.setColorAt(j,new T.Color(shade,shade,shade));
    });
    o.add(m);
  }
  o.userData.dispose=()=>o.traverse(p=>{if(p.isInstancedMesh)p.dispose();});
  return o;
}
const LINEMAT={bed:new T.LineBasicMaterial({color:"#d6a9ad",depthTest:false}),exclusion:new T.LineBasicMaterial({color:"#ffd6d0",depthTest:false}),hard:new T.LineBasicMaterial({color:"#6f5967",transparent:true,opacity:.32,depthTest:false}),draft:new T.LineBasicMaterial({color:"#f8f2e9",depthTest:false})};
function ring3(poly,y,t,closed=true){
  const g=new T.BufferGeometry().setFromPoints(poly.map(([x,z])=>new T.Vector3(x,y,z)));
  const line=closed?new T.LineLoop(g,LINEMAT[t]):new T.Line(g,LINEMAT[t]);line.renderOrder=70;return line;
}
function fill3(poly,y,col){
  const s=new T.Shape(poly.map(([x,z])=>new T.Vector2(x,-z)));
  const g=new T.ShapeGeometry(s), mat=new T.MeshBasicMaterial({color:col,transparent:true,opacity:.24,depthWrite:false,side:T.DoubleSide});
  g.rotateX(-Math.PI/2);
  const mesh=new T.Mesh(g,mat);mesh.position.y=y;mesh.userData.ownMat=true;return mesh;
}
export function outlines(f,data,draft) {
  const o=new T.Group(), y=f.y+.019;
  for(const [rows,k] of [[f.hard,"hard"],[data.beds,"bed"],[data.exclusions,"exclusion"]]){
    for(const p of rows){o.add(ring3(p,y,k));if(k!=="hard")o.add(fill3(p,y,k==="bed"?"#e3d0d2":"#c26b75"));}
  }
  if(draft?.length){o.add(ring3(draft,y,"draft",false));
    for(const p of draft){
      const mesh=new T.Mesh(new T.CircleGeometry(.12,10),new T.MeshBasicMaterial({color:"#fffdfb",depthTest:false,side:T.DoubleSide}));mesh.rotation.x=-Math.PI/2;mesh.position.set(p[0],y,p[1]);mesh.userData.ownMat=true;o.add(mesh);
    }
  }
  o.userData.dispose=()=>o.traverse(p=>{p.geometry?.dispose();if(p.userData.ownMat)p.material?.dispose();});return o;
}
export function cursor(){
  const m=new T.LineLoop(new T.BufferGeometry().setFromPoints(Array.from({length:56},(_,i)=>new T.Vector3(Math.sin(i/56*2*Math.PI),0,Math.cos(i/56*2*Math.PI)))),LINEMAT.draft);
  m.renderOrder=90;return m;
}
