// Fixed-camera proof made from the same Plan Studio mesh builder as the editable
// model. Temporary meshes are never inserted into the real scene or exported.
import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { openingSpan, pointInPoly, wallFacing } from "./model.js";

const at=(p,y=0)=>new T.Vector3(p[0]/1000,y,-p[1]/1000);
const flat=(p,d,n)=>[p[0]+d[0]*n,p[1]+d[1]*n];
function doorCamera(P,a,b,aspect) {
  const s=openingSpan(P,a), t=b?openingSpan(P,b):s, centre=s.mid.map((v,i)=>(v+t.mid[i])/2);
  const o=wallFacing(P,s.w).out;
  const sides=[[-o[0],-o[1]],o];
  const horizontal= Math.max(7.6,Math.min(18,(Math.abs(a.at-(b?.at??a.at))+a.w)/1000+7.6));
  const wanted=horizontal/(2*Math.tan(Math.PI*44/360)*aspect)*1000;
  // Prefer the real room; an exterior view is the controlled fallback if no
  // room has enough depth for the requested crop.
  const depths=[wanted,Math.max(2900,wanted*.76),2200];
  const inside=depths.map(n=>({n,p:flat(flat(centre,sides[0],n),s.d,-n*.36)})).find(v=>P.rooms.some(r=>pointInPoly(v.p,r.poly)));
  const exterior=flat(flat(centre,sides[1],wanted),s.d,-wanted*.36);
  const p=inside?.p??exterior;
  const lens=inside?Math.max(44,Math.min(77,2*Math.atan(horizontal*500/(aspect*inside.n))*180/Math.PI)):44;
  const camera=new T.PerspectiveCamera(lens,aspect,.04,110);
  camera.position.copy(at(p,1.86));camera.lookAt(at(centre,Math.min(1.5,a.h/1000*.63)));
  return {camera,centre,inside:!!inside};
}

function decorateDoor(root,P,o,material) {
  const s=openingSpan(P,o);if(!s)return;
  const n=[-s.d[1],s.d[0]], reveal=Math.max(.06,s.w.t/2000+.018), height=o.h/1000, sill=o.sill/1000;
  const angle=Math.atan2(s.d[1],s.d[0]), r=.03;
  function trim(w,h,p,y,side){
    const mesh=new T.Mesh(new RoundedBoxGeometry(w,h,.052,2,.007),material);
    mesh.position.copy(at(flat(p,n,side*reveal*1000),y));mesh.rotation.y=angle;
    mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);
  }
  for(const side of [-1,1]){
    trim(r*2,height+r,s.a,sill+(height+r)/2,side);
    trim(r*2,height+r,s.b,sill+(height+r)/2,side);
    trim(o.w/1000+r*2,r*2,s.mid,sill+height,side);
  }
}

// Illustrative open leaves are tucked against the opening's sides. The cut in
// the canonical wall still comes from the genuine opening dimensions.
function openInReview(root,P,o,timber,metal,side){
  const cut=root.getObjectByName("OPENING_"+o.id),s=openingSpan(P,o);if(!cut||!s)return;
  cut.visible=false;
  const out=wallFacing(P,s.w).out, count=o.kind==="door-double"?2:1;
  const r=side?[-out[0],-out[1]]:out;
  const n=[-s.d[1],s.d[0]], depth=(n[0]*r[0]+n[1]*r[1])*s.w.t*.24;
  const length=o.w/1000/count-.029, height=o.h/1000-.055;
  for(let i=0;i<count;i++){
    const hinge=flat(i?s.b:s.a,n,depth),sign=i?-1:1,edge=sign*Math.cos(1.12);
    const l=[s.d[0]*edge+r[0]*Math.sin(1.12),s.d[1]*edge+r[1]*Math.sin(1.12)];
    const g=new T.Group(),door=new T.Mesh(new RoundedBoxGeometry(length,height,.068,2,.009),timber);
    g.position.copy(at(hinge,o.sill/1000+.027));g.rotation.y=Math.atan2(l[1],l[0]);
    door.position.set(length/2,height/2,0);door.castShadow=door.receiveShadow=true;g.add(door);
    for(const z of [-1,1]){
      const handle=new T.Mesh(new RoundedBoxGeometry(.135,.025,.046,2,.006),metal);
      handle.position.set(length-.12,1.02,z*.059);handle.castShadow=true;g.add(handle);
    }
    root.add(g);
  }
}
function floorTexture() {
  const c=document.createElement("canvas");c.width=c.height=512;
  const g=c.getContext("2d");let seed=4261;
  const rand=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
  const height=64;
  for(let k=0;k<8;k++){
    const y=k*height, tone=174+Math.round(rand()*29);
    g.fillStyle=`rgb(${tone},${tone-24},${tone-44})`;g.fillRect(0,y,512,height);
    for(let i=0;i<73;i++){
      const v=y+rand()*height,x=rand()*490,len=14+rand()*370;
      g.beginPath();g.moveTo(x,v);g.bezierCurveTo(x+len*.32,v-1,x+len*.65,v+2,x+len,v-1);
      const shade=rand()>.68?"250,230,200":"65,39,27";g.strokeStyle=`rgba(${shade},${(.018+rand()*.092).toFixed(3)})`;g.lineWidth=.45+rand()*.8;g.stroke();
    }
    const x=Math.round(rand()*512);g.fillStyle="rgba(75,51,46,.21)";g.fillRect(x,y,1,64);
    g.fillStyle="rgba(85,53,40,.34)";g.fillRect(0,y,512,1);
    g.fillStyle="rgba(255,244,218,.24)";g.fillRect(0,y+1,512,1);
  }
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=6;t.repeat.set(10,12);
  return t;
}

function canvasFrom(renderer) {
  const source=renderer.domElement,out=document.createElement("canvas");
  out.width=source.width;out.height=source.height;
  out.getContext("2d").drawImage(source,0,0);return out;
}
export function captureDoorScene(stage,current,proposed,id,w,h) {
  const {renderer,scene:studio,S}=stage, A=current.openings.find(x=>x.id===id), B=proposed?.openings.find(x=>x.id===id);
  if(!A||!openingSpan(current,A))return null;
  const lens=doorCamera(current,A,B,w/h), {camera,centre}=lens;
  const scene=new T.Scene();scene.environment=studio.environment;scene.environmentIntensity=.58;
  scene.background=new T.Color("#eee5da");
  const env=new T.HemisphereLight("#f6eddf","#926350",1.22);scene.add(env);
  const key=new T.DirectionalLight("#fff0d8",3.4);
  const v=at(centre);
  const span=openingSpan(current,A), out=wallFacing(current,span.w).out;
  key.position.copy(at(flat(flat(centre,out,8700),span.d,-6400),5.2));key.target.position.copy(v);
  key.castShadow=true;key.shadow.mapSize.set(w>900?1536:1024,w>900?1536:1024);
  Object.assign(key.shadow.camera,{left:-13,right:13,bottom:-12,top:12,near:.1,far:28});
  key.shadow.camera.updateProjectionMatrix();key.shadow.bias=-.00012;key.shadow.normalBias=.024;
  const bounce=new T.DirectionalLight("#fff0e5",1.12);
  bounce.position.copy(camera.position).add(new T.Vector3(-2,3,1));bounce.target.position.copy(v);
  scene.add(key,key.target,bounce,bounce.target);
  const woodMap=floorTexture();
  const timber=new T.MeshStandardMaterial({map:woodMap,color:"#f5e7d4",roughness:.47});
  const doorMap=woodMap.clone();doorMap.repeat.set(1,2);doorMap.rotation=Math.PI/2;doorMap.needsUpdate=true;
  const leaf=new T.MeshStandardMaterial({map:doorMap,color:"#a07751",roughness:.58});
  const hardware=new T.MeshStandardMaterial({color:"#896843",metalness:.66,roughness:.38});
  const trim=new T.MeshStandardMaterial({color:"#735948",roughness:.54,metalness:.02});
  const plaster=new T.MeshStandardMaterial({color:"#e5d9cb",roughness:.78});
  const groundMat=new T.MeshStandardMaterial({color:"#908870",roughness:1});
  const around=new T.Mesh(new T.PlaneGeometry(150,150),groundMat);
  around.rotation.x=-Math.PI/2;around.position.y=-.035;around.receiveShadow=true;scene.add(around);
  const size=renderer.getSize(new T.Vector2()), dpi=renderer.getPixelRatio(), exposure=renderer.toneMappingExposure,
    shadows=renderer.shadowMap.enabled, auto=renderer.autoClear, scissors=renderer.getScissor(new T.Vector4()),
    viewport=renderer.getViewport(new T.Vector4()), scissorTest=renderer.getScissorTest();
  try {
    renderer.setPixelRatio(1);renderer.setSize(w,h,false);renderer.toneMappingExposure=1.08;
    renderer.shadowMap.enabled=true;renderer.setScissorTest(false);renderer.autoClear=true;
    const get=(P,o)=>{
      const m=S.buildModel(P,{furniture:false,cutaway:false});
      try {
        m.traverse(mesh=>{
          if(!mesh.isMesh)return;
          if(mesh.name==="SLAB")mesh.material=timber;
          if(mesh.material?.name==="lining-plasterboard")mesh.material=plaster;
        });
        decorateDoor(m,P,o,trim);openInReview(m,P,o,leaf,hardware,lens.inside);scene.add(m);
        renderer.render(scene,camera);return canvasFrom(renderer);
      } finally {
        scene.remove(m);const g=new Set();m.traverse(obj=>{if(obj.geometry)g.add(obj.geometry);});g.forEach(o=>o.dispose());
      }
    };
    const before=get(current,A);
    return {before,after: B?get(proposed,B):null,inside:lens.inside};
  } finally {
    key.shadow.dispose();woodMap.dispose();doorMap.dispose();[timber,leaf,hardware,trim,plaster,groundMat].forEach(m=>m.dispose());around.geometry.dispose();
    renderer.toneMappingExposure=exposure;renderer.shadowMap.enabled=shadows;renderer.autoClear=auto;
    renderer.setPixelRatio(dpi);renderer.setSize(size.x,size.y,false);
    renderer.setViewport(viewport);renderer.setScissor(scissors);renderer.setScissorTest(scissorTest);
    stage.render();
  }
}
