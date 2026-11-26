import * as T from './vendor/three.webgpu.min.js';

const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t)};
function noise(x,z){return .47*Math.sin(x*.51+Math.sin(z*.24))+.30*Math.sin(z*.69+x*.27)+.18*Math.sin(z*1.65-x*1.3)}
export const pathX=z=>9.61+.34*(z-3.12)+.54*Math.sin((z-3.12)*.44);
export function grade(x,z){
 const base=-.81-.128*(clamp(z,-4,13)+2.1);
 const away=smooth(3.7,12,Math.abs(x))*.7+smooth(4.2,10,z)*.7;
 const coastalFall=smooth(10,41,x)*4.5+smooth(4,26,-z)*6.3+smooth(17,40,z)*5.2;
 return base+away*(noise(x*.47,z*.47)*.53+.11*noise(x*1.42,z*1.42))-coastalFall+.12*Math.sin(x*.48)*smooth(3,9,z)
}
const grassField=(x,z)=>.5+.22*Math.sin(.52*x+.29*z)+.17*Math.sin(.23*x-.81*z)+.12*Math.cos(.93*x+.32*z);
export function plantable(x,z){return !(x>-7.65&&x<9.51&&z>-2.85&&z<4.7)&&!(z>2.5&&Math.abs(x-pathX(z))<1.12)&&grade(x,z)>-4.4}
export function buildCoast({scene,mesh,mat,map,normal,grit,rockTex,rockN,rand,range,loadHeadland,ripple,landcover,seaPhoto}){
 const geo=new T.PlaneGeometry(98,78,154,106);geo.rotateX(-Math.PI/2);const p=geo.attributes.position,uv=geo.attributes.uv,colors=[];
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,grade(x,z));uv.setXY(i,x/9.3,z/9.3);
  const d=clamp(Math.hypot(Math.max(Math.abs(x)-7.15,0),Math.max(Math.abs(z-1.25)-3.2,0))/1.65);
  const a=.49+.29*smooth(0,1,grassField(x,z))+.15*d;colors.push(a*.96,a,a*.84)}
 geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeVertexNormals();mesh(geo,mat(0xb4b59e,1,map,{normalMap:normal,normalScale:new T.Vector2(.25,.25),vertexColors:true}));
 const ribbon=new T.PlaneGeometry(1,1,11,80),rp=ribbon.attributes.position,ru=ribbon.attributes.uv,rc=[];
 for(let i=0;i<rp.count;i++){const u=ru.getX(i),t=ru.getY(i),z=2.54+t*21,x=pathX(z)+(u-.5)*(1.59+.18*Math.sin(z*.4))+.07*noise(z,0);rp.setXYZ(i,x,grade(x,z)+.025,z);ru.setXY(i,u*2.1,t*24);let a=.64+.27*Math.sin(Math.PI*u)+.09*noise(x*4.1,z*3.8);rc.push(a,a*.99,a*.91)}
 ribbon.setAttribute('color',new T.Float32BufferAttribute(rc,3));ribbon.computeVertexNormals();mesh(ribbon,mat(0xb6afa3,.96,grit,{vertexColors:true,bumpMap:grit,bumpScale:.009,side:T.DoubleSide}));
 // A broken gravel shoulder helps the approach sit into the grass instead of drawing a ribbon over it.
 const gravel=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),mat(0xb4afa2,.91,grit),3100),piece=new T.Object3D();
 // Keep this local sequence independent from the tree and planting generators.
 let gravelSeed=2701;const local=()=>((gravelSeed=Math.imul(1664525,gravelSeed)+1013904223>>>0)/4294967296);
 for(let i=0;i<gravel.count;i++){
  const z=3+local()*16,side=i%2?1:-1,x=pathX(z)+side*(i<420?.58+local()*.42:local()*.79);
  piece.position.set(x,grade(x,z)+.025,z);const size=i<420?.012+local()*.029:.007+local()*.015;
  piece.scale.set(size*1.4,size*.48,size);piece.rotation.set(local()*.3,local()*6.28,local()*.5);piece.updateMatrix();gravel.setMatrixAt(i,piece.matrix);
  const tone=.59+local()*.35;gravel.setColorAt(i,new T.Color(tone,tone*.98,tone*.91));
 }
 gravel.receiveShadow=true;scene.add(gravel);
 const rockMat=mat(0x94958a,.92,rockTex,{normalMap:rockN,normalScale:new T.Vector2(.48,.48)});
 // Cluster geological outcrops on one bank and partly bury each stone.
 const locations=[[-7.9,6.4,1.25],[-3.4,8,.73],[3.7,7.5,.73],[10.1,5.0,.51],[8.0,5.9,.64],[-8.4,-2.8,.8]];
 const g=new T.IcosahedronGeometry(1,1);for(const [cx,cz,a] of locations){for(let i=0;i<6;i++){const x=cx+range(-.8,.8)*a,z=cz+range(-.55,.55)*a;if(!plantable(x,z))continue;const m=mesh(g,rockMat,x,grade(x,z)-.09,z);m.scale.set(range(.39,.76)*a,range(.21,.48)*a,range(.31,.69)*a);m.rotation.set(range(-.24,.22),rand()*6.28,range(-.19,.28))}}
 // The camera sees the bay to the east and north. Distinct low headlands leave uninterrupted water between them.
 const addGeoUV=(g,ox=0,oz=0)=>{const a=g.attributes.position,uv=new Float32Array(a.count*2);for(let i=0;i<a.count;i++){uv[2*i]=((a.getX(i)+ox)*17+9800)/27700;uv[2*i+1]=1-((a.getZ(i)+oz)*17+11500)/22100}g.setAttribute('uv',new T.BufferAttribute(uv,2))};
 const seaGeom=new T.PlaneGeometry(2900,2500);seaGeom.rotateX(-Math.PI/2);addGeoUV(seaGeom,75,0);
 const water=mesh(seaGeom,new T.MeshPhysicalMaterial({color:0xb7cacb,map:seaPhoto,metalness:.01,roughness:.44,envMapIntensity:.29,specularIntensity:.27,normalMap:ripple,normalScale:new T.Vector2(.23,.19),clearcoat:.035,clearcoatRoughness:.45}),75,-4.97,0);water.castShadow=false;
 loadHeadland(terrain=>{
 const land=terrain.scene.children[0];land.geometry.computeVertexNormals();addGeoUV(land.geometry);const vegetation=new T.MeshStandardNodeMaterial({roughness:1});
 const {positionWorld:W,texture,vec3}=T.TSL;
 const cover=texture(landcover).rgb;
 const crown=W.x.mul(.97).add(W.z.mul(.62)).sin().mul(W.z.mul(.77).sub(W.x.mul(.29)).sin()).mul(.052);
 const patch=W.x.mul(.24).add(W.z.mul(.105).sin().mul(2.1)).sin().mul(W.z.mul(.43).sin()).mul(.079);
 vegetation.colorNode=cover.mul(vec3(.85,.89,.81)).mul(crown.add(patch).add(1));land.material=vegetation;land.castShadow=false;land.receiveShadow=false;scene.add(land);
 });
 scene.fog=new T.FogExp2(0xc4cdd0,.0024);
 return water;
}
export function addSedges({scene,range,rand,timeNode,gustNode}){
 const coarse=innerWidth<=680,spot=[],model=new T.Object3D();
 const material=new T.MeshStandardNodeMaterial({color:0xffffff,roughness:.82,vertexColors:true,side:T.DoubleSide});
 const {attribute,positionLocal,float,vec3,normalLocal}=T.TSL;
 const root=attribute('clumpRoot','vec3'),anchor=attribute('bend','float'),h=positionLocal.y.max(0);
 const phase=root.x.mul(.56).add(root.z.mul(.34)).add(timeNode.mul(1.29));
 const pulse=phase.sin().mul(.50).add(phase.mul(.43).sub(timeNode.mul(.81)).sin().mul(.27));
 const breeze=pulse.mul(.055).add(gustNode.mul(.16).mul(phase.mul(.80).sin()));
 const displacement=anchor.mul(anchor).mul(breeze);
 material.positionNode=positionLocal.add(vec3(displacement,h.mul(displacement.abs()).mul(-.16),displacement.mul(.32)));
 // A low transition of single blades closes the soil gaps around the larger, wind-facing clumps.
 {
 const blades=[],tones=[],edges=[],weight=[];for(let i=0;i<15;i++){
  const a=range(0,6.28),x=range(-.2,.2),z=range(-.2,.2),len=range(.07,.24),w=range(.006,.019),base=blades.length/3;
  blades.push(x-w,0,z,x+w,0,z,x+Math.cos(a)*len*.58,len,z+Math.sin(a)*len*.58);
  const f=range(.68,1.32);tones.push(.045*f,.059*f,.021*f,.055*f,.065*f,.028*f,.12*f,.14*f,.058*f);edges.push(base,base+1,base+2);weight.push(0,0,len)}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(blades,3));g.setAttribute('color',new T.Float32BufferAttribute(tones,3));g.setAttribute('bend',new T.Float32BufferAttribute(weight,1));g.setIndex(edges);g.computeVertexNormals();
 const count=coarse?1800:3600,roots=[],o=new T.InstancedMesh(g,material,count);for(let i=0;i<count;i++){let x,z;do{x=range(-15,15);z=range(-6,16)}while(!plantable(x,z));const y=grade(x,z)-.013;roots.push(x,y,z);model.position.set(x,y,z);model.rotation.y=range(0,6.28);model.scale.setScalar(range(.7,1.54));model.updateMatrix();o.setMatrixAt(i,model.matrix)}
 g.setAttribute('clumpRoot',new T.InstancedBufferAttribute(new Float32Array(roots),3));o.receiveShadow=true;o.castShadow=false;scene.add(o)
 }
 // Short, folded sedge blades form irregular humped masses, with a copper fringe in weathered clumps.
 for(let k=0;k<4;k++){
  const positions=[],colors=[],weights=[],indices=[];let N=coarse?16:23;
  for(let j=0;j<N;j++){let dir=range(0,Math.PI*2),len=range(.31,.83),arc=range(.35,.92),w=range(.009,.019),base=positions.length/3;
   const dx=Math.sin(dir),dz=Math.cos(dir),ox=range(-.058,.058),oz=range(-.058,.058),light=range(.78,1.16);
   for(let m=0;m<8;m++){let t=m/7,d=len*(.11*t+arc*t*t),y=len*(1.5*t-.83*t*t-.30*t*t*t),width=w*(1-t*.99);
    const dry=k===1||j%8===0,col=[(dry?.157:.074)*light,(dry?.147:.096)*light,(dry?.066:.035)*light];
    for(let side of [-1,0,1]){positions.push(ox+dx*d+dz*width*side,y+(side===0?width*.68:0),oz+dz*d-dx*width*side);const f=(.48+.61*t)*(side===0?1.12:1);colors.push(col[0]*f,col[1]*f,col[2]*f);weights.push(t*len)}
    if(m<7){let a=base+m*3;indices.push(a,a+1,a+3,a+1,a+4,a+3,a+1,a+2,a+4,a+2,a+5,a+4)}
   }}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setAttribute('bend',new T.Float32BufferAttribute(weights,1));geo.setIndex(indices);geo.computeVertexNormals();
  const placements=[],roots=[];let count=coarse?235:405;
  while(placements.length<count){let x=range(-14,15),z=range(-6,15.9);if(!plantable(x,z))continue;const mask=grassField(x,z)+.22*Math.exp(-((z-5.6)**2)/3);if(mask<range(.23,.94))continue;
   const h=grade(x,z)-.012,s=range(.68,1.4)*(.83+.32*mask);roots.push(x,h,z);model.position.set(x,h,z);model.rotation.y=range(0,6.28);model.scale.setScalar(s);model.updateMatrix();placements.push(model.matrix.clone())}
  geo.setAttribute('clumpRoot',new T.InstancedBufferAttribute(new Float32Array(roots),3));let o=new T.InstancedMesh(geo,material,placements.length);placements.forEach((m,i)=>o.setMatrixAt(i,m));o.castShadow=false;o.receiveShadow=true;scene.add(o)
 }
}

// Rengarenga drifts beside the approach. One shared mesh carries folded strap leaves,
// branched flowering stalks and six-tepalled flowers; roots sit just under the local grade.
export function plantArrivalBorder(scene){
 const vertices=[],colors=[],indices=[];
 const v=(x,y,z)=>new T.Vector3(x,y,z);
 function pt(p,c){vertices.push(p.x,p.y,p.z);colors.push(...c);return vertices.length/3-1}
 const green=[.11,.28,.115],light=[.20,.37,.16],white=[.94,.90,.79],pollen=[.81,.56,.12];
 function stalk(a,b,r){
  const d=b.clone().sub(a).normalize(),u=d.clone().cross(v(.31,.05,.91)).normalize(),w=d.clone().cross(u);
  const start=vertices.length/3;
  for(const p of [a,b])for(let i=0;i<5;i++){
   const t=i*2*Math.PI/5;pt(p.clone().addScaledVector(u,r*Math.cos(t)).addScaledVector(w,r*Math.sin(t)),green)
  }
  for(let i=0;i<5;i++){const j=(i+1)%5;indices.push(start+i,start+j,start+5+i,start+j,start+5+j,start+5+i)}
 }
 for(let i=0;i<15;i++){
  const angle=i*2.39996,len=.34+.24*(.5+.5*Math.sin(i*1.73)),dx=Math.cos(angle),dz=Math.sin(angle);
  const base=vertices.length/3;
  for(let j=0;j<=9;j++){
   const t=j/9,reach=len*t**1.42,width=.037*Math.sin(Math.PI*(.05+.95*t))**.65;
   for(const k of [-1,0,1])pt(v(dx*reach+dz*width*k,len*(1.57*t-1.09*t*t)+width*(k===0?.42:0),dz*reach-dx*width*k),k===0?light:green);
   if(j){const n=base+j*3;indices.push(n-3,n-2,n,n-2,n+1,n,n-2,n-1,n+1,n-1,n+2,n+1)}
  }
 }
 for(let stem=0;stem<3;stem++){
  const a=stem*2.39996,tip=v(.15*Math.cos(a),.66+.085*Math.cos(stem),.15*Math.sin(a));
  stalk(v(0,-.025,0),tip,.0038);
  for(let i=0;i<9;i++){
   const t=.54+.048*i,ang=i*2.4+a,root=tip.clone().multiplyScalar(t);
   const end=root.clone().add(v(.13*Math.cos(ang)*(1-.55*i/9),.07,.13*Math.sin(ang)*(1-.55*i/9)));
   stalk(root,end,.0016);
   for(let petal=0;petal<6;petal++){
    const d=ang+petal*Math.PI/3,dx=Math.cos(d),dz=Math.sin(d);
    const start=pt(end,pollen);
    pt(end.clone().add(v(.010*dx+.004*dz,-.003,.010*dz-.004*dx)),white);
    pt(end.clone().add(v(.021*dx,-.010,.021*dz)),white);
    pt(end.clone().add(v(.010*dx-.004*dz,-.003,.010*dz+.004*dx)),white);
    indices.push(start,start+1,start+2,start,start+2,start+3);
   }
  }
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();
 const beds=[[5.4,5.7,9],[8.4,5.1,8],[11.9,5.5,6],[10.8,1.6,7],[-4.5,5.8,7]];
 const mesh=new T.InstancedMesh(g,new T.MeshStandardMaterial({side:T.DoubleSide,vertexColors:true,roughness:.67}),beds.reduce((n,b)=>n+b[2],0));
 const obj=new T.Object3D();let n=0;
 for(const [cx,cz,count] of beds)for(let i=0;i<count;i++){
  const a=i*2.39996+cx*.64,r=.36*Math.sqrt(i),x=cx+Math.cos(a)*r,z=cz+.63*Math.sin(a)*r;
  obj.position.set(x,grade(x,z)-.028,z);obj.rotation.y=a;obj.scale.setScalar(.81+.24*Math.sin(i*3.63+cx));obj.updateMatrix();mesh.setMatrixAt(n++,obj.matrix);
 }
 mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh)
}
