import {bedroom} from './bedroom.js';
import {deckGarden} from './deck-garden.js';
import {dressedDeck,deckFixings} from './coastal-finish.js';
import {fitKitchen} from './kitchen.js';
import {plantPohutukawa} from './pohutukawa.js';
import * as T from './vendor/three.webgpu.min.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {HDRLoader} from './vendor/HDRLoader.js';
import {RoundedBoxGeometry} from './vendor/RoundedBoxGeometry.js';
import {finePanicles} from './panicles.js';
import {furnishRoom} from './interior.js';
import {buildCoast,addSedges,grade,plantable,pathX} from './landscape.js';
import {buildBoards} from './metric.js';
import {houseParts} from './house-parts.js';

export async function openPavilion(host,asset,forceGL=false,signal){
 const renderer=new T.WebGPURenderer({antialias:true,forceWebGL:forceGL,alpha:false});
 const manager=new T.LoadingManager();let initialized=false;
 const abort=()=>manager.abort();
 signal?.addEventListener('abort',abort,{once:true});
 try {
 signal?.throwIfAborted();
 await renderer.init();initialized=true;signal?.throwIfAborted();
 const compactGL=host.clientWidth<=680&&!renderer.backend.isWebGPUBackend;
 renderer.setPixelRatio(Math.min(devicePixelRatio,compactGL?1:host.clientWidth<=680?1.15:1.55));renderer.shadowMap.enabled=true;
 renderer.shadowMap.type=T.PCFShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
 const scene=new T.Scene(), camera=new T.PerspectiveCamera(45,1,.065,1000),cube=new T.BoxGeometry(),matrix=new T.Matrix4(),q=new T.Quaternion();
 const v=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
 let seed=92731;const rand=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296),range=(a,b)=>a+(b-a)*rand();
 const texLoader=new T.TextureLoader(manager),glLoader=new GLTFLoader(manager);
 const refinements=[];
 const flatNormals=new Map();
 function surface(name){
  if(name==='studio-glaze-normal.webp'||!/(?:-normal|-n)\.webp$/.test(name))return texLoader.loadAsync(asset(name));
  // Immutable WebGL texture storage must already match the deferred image's dimensions.
  const width=name==='rough_linen-n.webp'?639:640,height=640;
  if(!flatNormals.has(width)){
   const flat=document.createElement('canvas');flat.width=width;flat.height=height;
   const paint=flat.getContext('2d');paint.fillStyle='#8080ff';paint.fillRect(0,0,width,height);flatNormals.set(width,flat);
  }
  const texture=new T.CanvasTexture(flatNormals.get(width));
  refinements.push(async()=>{const detail=await texLoader.loadAsync(asset(name));texture.image=detail.image;texture.needsUpdate=true});
  return Promise.resolve(texture);
 }
 let refined=false;
 async function refine(){if(refined)return;refined=true;
   if(!compactGL)await refineApertures().catch(()=>{});
   while(refinements.length){await Promise.allSettled(refinements.splice(0,2).map(load=>load()))}
 }
 const [sky,wood,blackwood,grit,chair,terrain]=await Promise.all([
   new HDRLoader(manager).loadAsync(asset('pavilion-daylight-512.hdr')),
   ...['cedar','charred','sandy_gravel'].map(n=>surface(n+'.webp')),
   ...['mid_century_lounge_chair','gulf-terrain'].map(n=>glLoader.loadAsync(asset(n+'.glb')))
 ]);
 signal?.throwIfAborted();
 sky.mapping=T.EquirectangularReflectionMapping;scene.environment=sky;scene.background=sky;scene.backgroundRotation.y=scene.environmentRotation.y=0;
 scene.backgroundIntensity=1.22;scene.environmentIntensity=1.15;
 for(const t of [wood,blackwood,grit]){t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=6}
 const mat=(c,r=.8,map=null,extra={})=>new T.MeshStandardMaterial({color:c,roughness:r,map,...extra});
 const [brick,brickN,rockTex,rockN,deckMap]=await Promise.all(['dark_brick_wall','dark_brick_wall-normal','rock_face_03','rock_face_03-normal','deck'].map(n=>surface(n+'.webp')));
 signal?.throwIfAborted();
 for(const tex of [brick,brickN,rockTex,rockN,deckMap]){tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=6}
 for(const tex of [brick,rockTex,deckMap])tex.colorSpace=T.SRGBColorSpace;
 const newNames=['rough_linen','rough_linen-n','brown_planks_08','brown_planks_08-n','plastered_wall_04','plastered_wall_04-n','aerial_grass_rock','aerial_grass_rock-n','concrete_wall_006','concrete_wall_006-n','plan16a'];
 const [fabric,fabricN,oakMap,oakN,plaster,plasterN,pasture,pastureN,concrete,concreteN,print]=await Promise.all(newNames.map(n=>surface(n+'.webp')));
 for(const [i,t] of [fabric,fabricN,oakMap,oakN,plaster,plasterN,pasture,pastureN,concrete,concreteN,print].entries()){
   t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;if(!newNames[i].endsWith('-n'))t.colorSpace=T.SRGBColorSpace
 }
 fabric.repeat.set(5,5);fabricN.repeat.set(5,5);
 signal?.throwIfAborted();
 const [floorAO,wallAO,ripple,landcover,seaPhoto]=await Promise.all(['floor-ao.png','wall-ao.png','bay-ripple.png','gulf-landcover.webp','gulf-water.webp'].map(n=>surface(n)));
 landcover.colorSpace=seaPhoto.colorSpace=T.SRGBColorSpace;landcover.anisotropy=seaPhoto.anisotropy=8;
 ripple.wrapS=ripple.wrapT=T.RepeatWrapping;ripple.repeat.set(205,205);ripple.anisotropy=8;
 const litFloor=new T.MeshStandardNodeMaterial({roughness:.76,map:oakMap,normalMap:oakN,normalScale:new T.Vector2(.14,.14)});
 const evalFloor=T.TSL.texture(floorAO,T.TSL.vec2(T.TSL.positionWorld.x.div(14.4).add(.5),T.TSL.positionWorld.z.div(4.24).add(.5))).r;
 litFloor.colorNode=T.TSL.texture(oakMap).rgb.mul(evalFloor.pow(1.25));litFloor.userData={grain:true,repeatMetres:2.8};
 const cloth=new T.MeshPhysicalMaterial({map:fabric,normalMap:fabricN,normalScale:new T.Vector2(.19,.19),roughness:.94,sheen:.27,sheenColor:0xd7d3c9,sheenRoughness:.87});
 const oak=mat(0xe6ddcd,.74,oakMap,{normalMap:oakN,normalScale:new T.Vector2(.24,.24)});oak.userData={grain:true,repeatMetres:2.8};
 const lime=new T.MeshStandardNodeMaterial({roughness:.95,map:plaster,normalMap:plasterN,normalScale:new T.Vector2(.16,.16)});lime.userData.repeatMetres=2.1;
 const rearFactor=T.TSL.texture(wallAO,T.TSL.vec2(T.TSL.positionWorld.x.div(14.4).add(.5),T.TSL.positionWorld.y.div(2.95))).r;
 const nearRear=T.TSL.positionWorld.z.add(2.04).abs().lessThan(.16);
 lime.colorNode=T.TSL.texture(plaster).rgb.mul(nearRear.select(rearFactor.pow(1.12),T.TSL.float(1)));
 const stoneCast=mat(0xd0d0c4,.91,concrete,{normalMap:concreteN,normalScale:new T.Vector2(.22,.22)});stoneCast.userData.repeatMetres=2.7;
 const pine=mat(0x817a74,.79,dressedDeck()),cedar=mat(0xf2e1c4,.7,wood),dark=mat(0x98978d,.79,blackwood),edge=mat(0x252522,.43),metal=mat(0x252828,.3,null,{metalness:.55});
 const deck=mat(0xf1e7d9,.61,dressedDeck()),wall=lime,stone=mat(0x625f54,.77,grit),warmwhite=mat(0xebe1cb),linen=mat(0xb6a592),glow=mat(0xffecc5,.4,null,{emissive:0xffbd67,emissiveIntensity:2.6});
 for(const m of [pine,cedar,dark,deck]){m.userData.grain=true;m.userData.repeatMetres=m===dark?1.75:2.8}
 const glass=new T.MeshPhysicalNodeMaterial({color:0xeaf0ed,roughness:.047,metalness:0,ior:1.5,clearcoat:1,clearcoatRoughness:.045,transparent:true,depthWrite:false});
 const {normalView,positionViewDirection,float}=T.TSL;
 const grazing=float(1).sub(normalView.dot(positionViewDirection).abs().clamp()).pow(4);
 glass.opacityNode=float(.012).add(grazing.mul(.21));
 const boxes=new Map(), roofParts=new Map();
 let sheet=boxes;
 function register(m,transform){if(!sheet.has(m))sheet.set(m,[]);sheet.get(m).push(transform.clone())}
 function box(x,y,z,w,h,d,m,rx=0,ry=0,rz=0){q.setFromEuler(new T.Euler(rx,ry,rz));register(m,matrix.compose(v(x,y,z),q,v(w,h,d)))}
 function mesh(geo,m,x=0,y=0,z=0){const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;scene.add(o);return o}
 function cylinder(x,y,z,r1,r2,h,m,sides=24){return mesh(new T.CylinderGeometry(r1,r2,h,sides),m,x,y,z)}
 const bits=houseParts(T).kinds;
 for(const offset of [-3.6,3.6])for(const items of Object.values(bits))for(const b of items){
   let {step}=b.pc;if(!['piles','bearers','joists','floor','dboards'].includes(step))continue;
   const t=new T.Matrix4().compose(b.pc.p,b.pc.q,v(1,1,1)).multiply(b.m);t.elements[12]+=offset;
   if(step==='piles'){const a=t.elements,top=a[13]+(Math.abs(a[1])+Math.abs(a[5])+Math.abs(a[9]))*.5,bottom=grade(a[12],a[14])-.19;
     box(a[12],(top+bottom)*.5,a[14],.14,top-bottom,.14,pine);
    }else register(step==='floor'?cedar:step==='dboards'?deck:pine,t)
 }
 // Deep standing-seam canopy, with the joinery set well back behind the eave.
 sheet=roofParts;
 const pitch=.085,roof=z=>2.91+z*pitch;
 box(0,roof(.55)+.10,.55,15.44,.2,6.13,edge,-Math.atan(pitch));
 for(let i=0;i<122;i++){const x=-7.64+i*.126;box(x,roof(.53)-.028,.53,.123,.045,6.1,cedar,-Math.atan(pitch))}
 for(let i=0;i<29;i++){const x=-7.53+i*.54;box(x,roof(.55)+.218,.55,.022,.043,6.08,metal,-Math.atan(pitch))}
 box(0,roof(3.6)+.065,3.61,15.5,.245,.052,metal);
 sheet=boxes;
 // Continuous weatherboard screen on each end and a recessed solid service bay.
 function cladEnd(x){box(x,1.37,-.04,.13,2.76,4.22,dark);for(let i=0;i<34;i++){const z=-2.09+i*.126,h=roof(z)-.04;box(x+Math.sign(x)*.087,h/2,z,.045,h,.118,dark)}}
 cladEnd(-7.14);
 box(7.14,1.43,-.93,.18,2.86,2.33,lime);box(7.252,1.43,-.93,.039,2.86,2.33,dark);
 for(let j=0;j<18;j++)box(7.283,1.43,-2.048+j*.132,.027,2.86,.122,dark);
 box(7.14,.273,1.13,.19,.546,1.76,lime);box(7.14,2.955,1.15,.21,.34,1.84,lime);
 // Close the gap between the rear lining and the pitched soffit with a continuous recessed head.
 const rearHead=roof(-2.015)-.051;
 box(0,(2.611+rearHead)/2,-2.014,14.21,rearHead-2.611,.122,cedar);
 box(0,rearHead-.012,-1.949,14.18,.013,.013,edge);
 // Oiled oak lining, 156 mm face with a 2 mm shadow joint. The lighter reveals retain daylight.
 const lining=mat(0xdaae86,.84,oakMap,{normalMap:oakN,normalScale:new T.Vector2(.10,.10)});
 lining.userData={grain:true,repeatMetres:2.6};
 function endBoards(z0,z1,y0,y1){
   const count=Math.ceil((z1-z0)/.158),width=(z1-z0)/count;
   for(let i=0;i<count;i++)box(7.046,(y0+y1)/2,z0+(i+.5)*width,.014,y1-y0,width-.002,lining)
 }
 function rearBoards(x0,x1,y0,y1){
   const count=Math.ceil((x1-x0)/.158),width=(x1-x0)/count;
   for(let i=0;i<count;i++)box(x0+(i+.5)*width,(y0+y1)/2,-2.009,width-.002,y1-y0,.019,lining)
 }
 endBoards(-2.09,.234,.073,2.854);endBoards(.235,2.008,.073,.537);endBoards(.235,2.008,2.794,3.09);
 rearBoards(.46,1.79,.073,2.614);rearBoards(5.52,7.1,.073,2.614);
 rearBoards(1.79,5.52,.073,.902);rearBoards(1.79,5.52,2.40,2.614);
 // Carry the charred external boards below the existing east sill and above its head.
 // The source aperture, interior returns, roof and post positions stay on their authored coordinates.
 function eastSpandrel(z0,z1,bottom,top){
  const n=Math.ceil((z1-z0)/.132),pitch=(z1-z0)/n;
  for(let i=0;i<n;i++)box(7.265,(bottom+top)/2,z0+(i+.5)*pitch,.037,top-bottom,pitch-.004,dark);
 }
 eastSpandrel(.235,2.008,.008,.527);eastSpandrel(.235,2.008,2.796,3.095);
 for(const y of [.527,2.799])box(7.251,y,1.12,.11,.018,1.80,metal);
 box(7.16,1.66,1.12,.012,2.18,1.72,glass);
 for(const z of [.22,1.08,2.0])box(7.12,1.66,z,.12,2.27,.047,metal);
 for(const y of [.55,2.78]){box(7.12,y,1.12,.12,.048,1.8,metal);box(7.035,y+(y<1?-.03:.03),1.12,.24,.032,1.89,oak)}
 for(const z of [.20,2.02])box(7.03,1.66,z,.26,2.28,.041,oak);
 // Two pale, board-marked residual walls read through the terrace, with a shadow joint below the cap.
 box(-6.83,1.46,2.55,.24,2.92,2.13,stoneCast);box(-6.83,2.945,2.55,.27,.043,2.15,metal);
 for(let row=0;row<17;row++){const y=.13+row*.164;box(-6.699,y,2.55,.005,.004,2.11,stoneCast)}
 
 box(-2.65,1.31,-2.08,8.98,2.62,.13,wall);box(6.32,1.31,-2.08,1.64,2.62,.13,wall);
 box(3.65,.46,-2.08,3.7,.92,.13,wall);box(3.65,2.52,-2.08,3.7,.28,.13,wall);
 for(const x of [1.84,4.41,5.48])box(x,1.65,-2.06,.029,1.48,.073,metal);
 for(const y of [.926,2.37])box(3.65,y,-2.06,3.72,.030,.077,metal);
 box(3.65,1.64,-2.08,3.55,1.41,.012,glass);
 for(let i=0;i<46;i++){let x=-7.05+i*.165;box(x,1.31,-1.997,.161,2.62,.032,cedar)}
const floorBase=mat(0x5c584e);box(0,.034,0,14.20,.042,4.12,floorBase);
 for(let row=0;row<22;row++){let z=-2.025+row*.188;let x=-7.09;for(let j=0;x<7.075;j++){
 const end=Math.min(7.09,x+(j===0?1.13+row%3*.63:2.84));box((x+end)/2,.057,z,end-x-.0018,.019,.185,litFloor);x=end}}
 for(const x of [-7.12,-5.35,-3.58,-1.8,-.025,1.75,3.53,5.30,7.09]){
   box(x,1.49,1.96,.047,2.98,.105,metal);
   box(x,2.69,1.99,.066,.038,.11,metal);
 }
 for(const x of [-6.24,-4.46,-2.69,-.91,.86,2.64,4.42,6.20]){
   if(x!==.86&&x!==2.64)box(x,1.46,1.956,1.72,2.88,.018,glass);
 }
 for(const y of [.069,2.86,3])box(0,y,1.96,14.22,.052,.111,metal);
 for(const x of [-7.11,-.05,7.11])box(x,roof(3.1)*.5,3.12,.087,roof(3.1),.087,metal);
 for(let i=0;i<23;i++)box(-7.04+i*.09,1.48,2.025,.049,2.97,.09,dark);
 // Purpose-made cabinetry, recessed lights, curtain folds and furniture establish scale.
 // One softly lit pendant over the breakfast table leaves the view from the new doorway clear.
 box(-2.12,2.67,.49,.01,.58,.01,metal);cylinder(-2.12,2.32,.49,.053,.178,.135,cedar);cylinder(-2.12,2.249,.49,.155,.155,.010,glow);
 const [glazeNormal,basketWeave]=await Promise.all(['studio-glaze-normal.webp','studio-wool.webp'].map(surface));
 for(const map of [glazeNormal,basketWeave]){map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=4}
 basketWeave.colorSpace=T.SRGBColorSpace;
 // Allocate the correct immutable texture extents. The six room maps arrive on the approach to the lift.
 const finishLoads=[];
 function lateFinish(name,size,initial){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d');ctx.fillStyle=initial;ctx.fillRect(0,0,size,size);
  const texture=new T.CanvasTexture(canvas);
  finishLoads.push(async()=>{const t=await texLoader.loadAsync(asset(name+'.webp'));texture.image=t.image;texture.needsUpdate=true});
  return texture;
 }
 const chipColor=lateFinish('chips-color',768,'#c1b4a1'),chipNormal=lateFinish('chips-relief',512,'#8080ff'),chipRough=lateFinish('chips-roughness',512,'#bdbdbd');
 const yarn=lateFinish('upholstery-yarn',512,'#c2b49a'),yarnNormal=lateFinish('upholstery-relief',640,'#8080ff'),yarnRough=lateFinish('upholstery-roughness',512,'#dbdbdb');
 let finishTask,finishesReady=false;
 function refineFinishes(){
  if(!finishTask)finishTask=Promise.all(finishLoads.map(load=>load())).then(()=>{finishesReady=true});
  return finishTask;
 }
 for(const t of [chipColor,chipNormal,chipRough,yarn,yarnNormal,yarnRough]){
  t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=6;
 }
 chipColor.colorSpace=yarn.colorSpace=T.SRGBColorSpace;
 for(const t of [chipColor,chipNormal,chipRough])t.repeat.set(1.9,1.9);
 for(const t of [yarn,yarnNormal,yarnRough])t.repeat.set(2.4,2.4);
 const weave=new T.MeshPhysicalMaterial({map:yarn,normalMap:yarnNormal,normalScale:new T.Vector2(.70,.70),roughness:.96,roughnessMap:yarnRough,sheen:.37,sheenRoughness:.79,sheenColor:0xd5bf9c});
 const slabStone=new T.MeshPhysicalMaterial({color:0xf4eee4,map:chipColor,normalMap:chipNormal,normalScale:new T.Vector2(.51,.51),roughnessMap:chipRough,roughness:.83,clearcoat:.14,clearcoatRoughness:.43});
 const limestone=mat(0xc6c4b6,.74,plaster,{normalMap:concreteN,normalScale:new T.Vector2(.11,.11)});
 furnishRoom({scene,mesh,box,cylinder,chair,cloth:weave,oak,plaster:lime,metal,limestone,print,linenBump:fabricN,evalFloor,slabStone,basketWeave});
 bedroom({mesh,box,cylinder,oak,cloth,metal,limestone,glow,basketWeave});
 fitKitchen(scene,oak,slabStone,glazeNormal);
 {
 const cloth=new T.PlaneGeometry(.63,2.78,100,18),pos=cloth.attributes.position;
 for(let i=0;i<pos.count;i++){const xx=pos.getX(i),yy=pos.getY(i),t=(yy+1.39)/2.78;pos.setXYZ(i,xx*(1-.12*t),yy+.014*Math.sin(xx*18)*(1-t),Math.sin(xx*61+t*.9)*(.029+.017*(1-t))+.018*Math.sin(xx*17-t*1.4))}
 cloth.computeVertexNormals();const drape=mat(0xd6d2c3,.97,fabric,{side:T.DoubleSide});const curtain=mesh(cloth,drape,6.86,1.47,1.28);curtain.rotation.y=-Math.PI/2;
 }
 // The hearth anchors the living room behind the veranda and breaks the long roof line.
 const masonry=mat(0x99948a,.94,brick,{normalMap:brickN,normalScale:new T.Vector2(.72,.72)});
 function masonryBlock(x,y,z,w,h,d){const g=new T.BoxGeometry(w,h,d),uv=g.attributes.uv;for(let i=0;i<uv.count;i++){const face=Math.floor(i/4);uv.setXY(i,uv.getX(i)*(face<2?d:w)/1.25,uv.getY(i)*(face===2||face===3?d:h)/1.25)}mesh(g,masonry,x,y,z)}
 masonryBlock(.12,1.99,-1.04,1.49,3.87,.91);box(.12,3.966,-1.04,1.57,.07,.99,metal);box(.12,.62,-.558,.89,.52,.046,edge);box(.12,.32,-.45,1.56,.09,.53,stone);
 
 // Brushed metal cable balustrade and a low gravel arrival terrace.
 for(let i=0;i<7;i++){let x=-7.12+i*2.12;box(x,.43,4.43,.032,.99,.032,metal)}
 for(let i=0;i<7;i++)box(-.76,.08+i*.128,4.43,12.72,i===6?.032:.008,.017,metal);
 for(let k=0;k<8;k++){box(7.34+k*.295,-.116-k*.162,3.16,.305,.105,1.43,deck);box(7.47+k*.295,-.183-k*.162,3.16,.04,.14,1.43,dark)}
 box(9.78,-1.49,3.16,1.15,.40,1.48,stone);box(8.34,-.81,2.49,2.67,.19,.09,dark,0,0,-.50);box(8.34,-.81,3.85,2.67,.19,.09,dark,0,0,-.50);
 ;
 // Faceted sash and glazing beads return into the aluminium extrusion. Open sliders stack at the jamb.
 for(const x of [-5.35,-3.58,-1.8,-.025,3.53,5.30,7.09]){
  for(const xx of [x-.032,x+.032])box(xx,1.45,1.973,.013,2.78,.019,metal);
  box(x+.05,1.02,2.022,.021,.215,.034,metal);
 }
 for(const z of [1.91,1.953,2.014])box(0,.080,z,14.16,.014,.014,metal);
 sheet=roofParts;
 for(let i=0;i<3;i++)box(0,roof(3.60)+.10-i*.033,3.636,15.46,.014,.02,edge);
 sheet=boxes;
 box(0,-.137,4.499,14.41,.116,.028,deck);box(0,-.204,4.49,14.36,.012,.018,metal);
 deckFixings(scene);deckGarden({scene,mesh,box,grade,trim:deck,grit});
 buildBoards(boxes,scene,glass);
 const roofStudy=new T.Group();scene.add(roofStudy);buildBoards(roofParts,roofStudy,glass);

 const contactCanvas=document.createElement('canvas');contactCanvas.width=contactCanvas.height=128;const cc=contactCanvas.getContext('2d'),gradient=cc.createRadialGradient(64,64,1,64,64,64);gradient.addColorStop(0,'rgba(28,25,20,.67)');gradient.addColorStop(.55,'rgba(28,25,20,.36)');gradient.addColorStop(1,'rgba(28,25,20,0)');cc.fillStyle=gradient;cc.fillRect(0,0,128,128);const contactMap=new T.CanvasTexture(contactCanvas);
 for(const [x,z,w,d,yy] of [[3.42,-1.34,2.65,1.02,.069],[3.64,.19,1.83,.99,.094],[5.88,.26,1.09,1.04,.092]]){
 const sh=mesh(new T.PlaneGeometry(w,d),new T.MeshBasicMaterial({map:contactMap,transparent:true,depthWrite:false}),x,yy,z);sh.rotation.x=-Math.PI/2;sh.castShadow=false}
 const ground=grade;
 buildCoast({scene,mesh,mat,map:pasture,normal:pastureN,grit,rockTex,rockN,rand,range,terrain,ripple,landcover,seaPhoto});
 const windTime=T.TSL.uniform(0),gustStrength=T.TSL.uniform(0);
 addSedges({scene,range,rand,timeNode:windTime,gustNode:gustStrength});finePanicles(scene,windTime,gustStrength);
 const hemi=new T.HemisphereLight(0xe5edf2,0x99968b,.24);scene.add(hemi);
 const sun=new T.DirectionalLight(0xffeed5,2.72);sun.position.set(.58*30,.47*30,.68*30);sun.target.position.set(0,0,0);scene.add(sun,sun.target);sun.castShadow=true;
 Object.assign(sun.shadow.camera,{left:-18,right:18,top:14,bottom:-13,near:.2,far:65});const shadowSize=compactGL?1024:2048;sun.shadow.mapSize.set(shadowSize,shadowSize);sun.shadow.normalBias=.003;sun.shadow.bias=-.00007;
 const fill=new T.DirectionalLight(0xe4eef6,.12);fill.position.set(2,6,-3);scene.add(fill);
 for(const x of [-3,3]){const lamp=new T.SpotLight(0xffead2,3.3,5,1.04,.86,2);lamp.position.set(x,2.64,.20);lamp.target.position.set(x,.35,-.65);scene.add(lamp,lamp.target)}
 // Area emitters fill the actual apertures. They provide broad indoor sky transport without point hotspots.
 async function refineApertures(){
 const {RectAreaLightTexturesLib}=await import('./vendor/RectAreaLightTexturesLib.js');
 T.RectAreaLightNode.setLTC(RectAreaLightTexturesLib.init());
 const aperture=(pos,aim,w,h,power,color)=>{const l=new T.RectAreaLight(color,power,w,h);l.position.set(...pos);l.lookAt(...aim);scene.add(l)};
 aperture([-2.25,1.58,1.93],[-2.05,1.15,-1.91],2.1,1.85,2.5,0xf3efe6);
 aperture([7.13,1.61,1.12],[2.5,1.18,0],1.76,2.15,1.7,0xf4f4ed);
 aperture([3.64,1.66,-2.07],[3.66,.45,1],3.58,1.40,2.3,0xe9f0f4);
 aperture([3.80,1.49,2.05],[3.31,1.0,-1],6.35,2.74,1.25,0xf5eee0);
 }
 const tmp=new T.Object3D(),wind=[];
 function instantiate(geo,m,placements,windFactor=0,cast=true){if(!placements.length)return;const o=new T.InstancedMesh(geo,m,placements.length);o.castShadow=cast;o.receiveShadow=true;
   for(let i=0;i<placements.length;i++){const [x,y,z,s,a]=placements[i];tmp.position.set(x,y,z);tmp.scale.setScalar(s);tmp.rotation.set(0,a,0);tmp.updateMatrix();o.setMatrixAt(i,tmp.matrix)}
   scene.add(o);if(windFactor)wind.push({o,placements,windFactor});return o
 }
 function scanPlant(g,count,scale,zone,windFactor,isShrub=false){if(host.clientWidth<=680)count=Math.ceil(count*.57);const all=g.scene.children.filter(o=>o.isMesh||o.children.length);const variants=all;
   variants.forEach((src,j)=>{const locations=[];for(let i=j;i<count;i+=variants.length){let [x,z]=zone();locations.push([x,ground(x,z)-.018,z,range(...scale),range(0,6.28)])}src.traverse(n=>{if(n.isMesh){
     const m=n.material.clone();m.side=T.DoubleSide;m.transparent=false;m.alphaTest=.42;m.roughness=.84;
     const stride=host.clientWidth<=680?(isShrub?4:2):(isShrub?2:1);
     instantiate(n.geometry,m,locations.filter((_,index)=>index%stride===0),windFactor)
   }})})
 }
 const around=()=>{let x,z;do{x=range(-17,16);z=range(-8,16)}while(!plantable(x,z));return [x,z]};
 const fernHollow=()=>{let x,z;do{x=range(-13,8);z=range(2,11)}while(!plantable(x,z));return [x,z]};
 async function refinePlanting(){
  // The procedural coastal planting is already present. Skip the three scanned layers on small WebGL devices.
  if(compactGL)return;
 const [fern,shrub,grass]=await Promise.all(['fern_02','shrub_03','grass_medium_01'].map(n=>glLoader.loadAsync(asset(n+'.glb'))));
 scanPlant(fern,77,[.91,1.36],fernHollow,.02);scanPlant(shrub,88,[1.21,2.37],around,.016,true);scanPlant(grass,450,[1.9,3.3],around,.024);
 // Shade-tolerant fronds emerge between the open eastern bays, with the central pile faces still visible.
 const shadeFernPositions=[[-5.61,4.62],[-5.29,4.46],[-.84,4.48],[-.55,4.58],[3.23,4.47],[3.50,4.60],[5.84,3.99]];
 let fernIndex=0;fern.scene.traverse(o=>{if(!o.isMesh)return;
  const material=o.material.clone();material.side=T.DoubleSide;material.alphaTest=.43;material.transparent=false;material.roughness=.88;
  const spots=shadeFernPositions.filter((_,i)=>i%3===fernIndex%3).map(([x,z],i)=>[x,ground(x,z)+.023,z,1.03+(i%2)*.19,x*.61]);
  instantiate(o.geometry,material,spots,.019);fernIndex++});
 }
 // Rooted harakeke fans: folded longitudinal ridges catch different amounts of sun on each face.
 function flax(seedIdx){const verts=[],col=[],faces=[];for(let i=0;i<32;i++){const angle=(i%2?0:Math.PI)+range(-.62,.62)+Math.floor(i/11)*1.02,L=range(.53,1.5),W=range(.029,.066),curl=range(.32,1.2),off=range(-.066,.066),base=verts.length/3;
  const tone=new T.Color().setRGB(range(.039,.09),range(.075,.135),range(.018,.045));for(let k=0;k<=10;k++){const t=k/10,dist=L*(.07*t+curl*t*t*.78),h=L*(1.65*t-.94*t*t-(curl*.28)*t*t*t),wx=Math.cos(angle),wz=-Math.sin(angle),width=W*(1-t**1.8)*(.67+.34*Math.sin(t*Math.PI)),cx=Math.sin(angle)*dist+off,cz=Math.cos(angle)*dist;
   for(const side of [-1,0,1]){verts.push(cx+side*wx*width,h+(side===0?width*.49:0),cz+side*wz*width);const f=(side===0?1.22:side===1?.87:1)*(1+.18*t);col.push(tone.r*f,tone.g*f,tone.b*f)}
   if(k<10){const a=base+k*3;faces.push(a,a+3,a+1,a+1,a+3,a+4,a+1,a+4,a+2,a+2,a+4,a+5)}
  }}let geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setAttribute('color',new T.Float32BufferAttribute(col,3));geo.setIndex(faces);geo.computeVertexNormals();return geo}
 const bladeMat=mat(0xffffff,.66,null,{vertexColors:true,side:T.DoubleSide});
 for(let j=0;j<3;j++){let spots=[];for(let i=0;i<12;i++){let [x,z]=around();spots.push([x,ground(x,z),z,range(.61,1.37),range(0,6.28)])}for(const [x,z] of [[-.25,-3.82],[3.6,-4.9],[6.3,-5.38],[8.85,-3.34],[-4.5,5.9],[-5.46,4.97],[.87,5.13],[5.6,5.15]]){const a=x+j*.31,b=z+j*.18;spots.push([a,ground(a,b),b,.71+.14*j,j*.88])}instantiate(flax(j),bladeMat,spots,.054)}
 // Arching culms and drooping spikelets share the depth buffer and light of the garden.
 const plumes=[],bladeColours=[],plumeIndex=[];
 function ribbon(a,b,w,col){let j=plumes.length/3;const across=v(.78,.04,-.44).multiplyScalar(w);for(const pt of [a.clone().sub(across),a.clone().add(across),b]){plumes.push(pt.x,pt.y,pt.z);bladeColours.push(col.r,col.g,col.b)}plumeIndex.push(j,j+1,j+2)}
 const straw=new T.Color(0x9b875d),silk=new T.Color(0xcdbc99);
 for(let k=0;k<9;k++){const theta=range(0,Math.PI*2),h=range(1.06,1.9),lean=range(.32,.85),dx=Math.cos(theta),dz=Math.sin(theta),start=v(range(-.13,.13),0,range(-.13,.13));
   const at=t=>v(start.x+dx*lean*t*t,h*t-.16*t**4,start.z+dz*lean*t*t);for(let k=0;k<9;k++){const a=at(k/9),b=at((k+1)/9);ribbon(a,b,.010,straw);ribbon(b,a,.008,straw)}
   for(let j=0;j<21;j++){const t=j/21,a=at(.73+.27*t);for(let y=0;y<3;y++){const off=range(-2.8,2.8),len=(.12+.17*Math.sin(t*Math.PI))*(1-t*.62),b=v(a.x+Math.cos(theta+off)*len,a.y+len*.32,a.z+Math.sin(theta+off)*len),end=b.clone().add(v(dx*.047,-len*.48,dz*.047));ribbon(a,b,.0045,silk);ribbon(b,end,.0065,silk)}}
 }
 const flower=new T.BufferGeometry();flower.setAttribute('position',new T.Float32BufferAttribute(plumes,3));flower.setAttribute('color',new T.Float32BufferAttribute(bladeColours,3));flower.setIndex(plumeIndex);flower.computeVertexNormals();
 const plants=[[8.5,11.85,1.17],[8.92,12.18,1.13],[6.65,10.67,1],[10.63,8.91,1.12],[-4.5,6.8,.91],[-5.8,7.9,1.03],[3.5,6.7,.94],[-7.5,7.2,1.09]];
 instantiate(flower,mat(0xf6ebce,.88,null,{vertexColors:true,side:T.DoubleSide}),plants.map(([x,z,k])=>[x,ground(x,z),z,k,range(0,6)]),.11);
 signal?.throwIfAborted();
 await plantPohutukawa(scene,ground,name=>texLoader.loadAsync(asset(name)),host.clientWidth<=680);
 // This Three revision chooses a uniform block for up to 1,000 instances. Some WebGL 2 devices
 // allow only 256 mat4 values. Give larger batches vertex-attribute storage while keeping the draw count.
 if(!renderer.backend.isWebGPUBackend){
  const gl=renderer.backend.gl,limit=Math.floor(gl.getParameter(gl.MAX_UNIFORM_BLOCK_SIZE)/64);
  scene.traverse(o=>{
   const matrices=o.instanceMatrix;
   if(!o.isInstancedMesh||matrices.count<=limit||matrices.count>1000)return;
   const storage=new Float32Array(1001*16);storage.set(matrices.array);
   o.instanceMatrix=new T.InstancedBufferAttribute(storage,16).setUsage(matrices.usage);
  });
 }
 let triangleCount=0;scene.traverse(o=>{if(o.isMesh)triangleCount+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1)});
 const backend=renderer.backend.isWebGPUBackend?'WebGPU':'WebGL 2';
 signal?.throwIfAborted();
 host.replaceChildren(renderer.domElement);renderer.domElement.setAttribute('aria-hidden','true');
 const match=new URLSearchParams(location.search).has('match');
 const positions=[v(13.65,1.42,15.65),v(5.8,.88,8.45),(match?v(1.55,1.40,1.48):v(.89,1.49,1.69))],targets=[v(.23,1.21,.40),v(.07,1.21,.12),(match?v(4.28,1.27,-1.25):v(4.08,1.14,-.78))];
 const camPath=new T.CatmullRomCurve3(positions,false,'centripetal'),aimPath=new T.CatmullRomCurve3(targets,false,'centripetal');
 let garden=null;
 async function gardenBed(){const {createGardenBed}=await import("./garden-bed.js");return garden??=createGardenBed(scene,camera,ground)}
 let explorePose=null,detail=null,indoors=false;
 const displacement=v(),direction=v(),stepRight=v(),next=v();
 const obstacles=[[-3.84,-.66,-2.1,-1.22],[-3.22,-1.02,.18,.80],[-4.04,-3.74,-2.1,.63],[-4.04,-3.74,1.59,2.04],[-7.03,-4.78,-1.19,.63],[-7.03,-4.95,-2.06,-1.49],[-.79,1.04,-1.69,-.10],[2.02,4.83,-1.88,-.73],[2.66,4.64,-.41,.79],[5.26,6.48,-.35,.91]];
 function canStand(x,z){return x> -6.87&&x<6.85&&z> -1.83&&z<1.81&&!obstacles.some(([x0,x1,z0,z1])=>x>x0&&x<x1&&z>z0&&z<z1)}
 function step(forward,right){if(!indoors||!explorePose)return;camera.getWorldDirection(direction);direction.y=0;direction.normalize();
  stepRight.set(-direction.z,0,direction.x);next.copy(camera.position).addScaledVector(direction,forward*.16).addScaledVector(stepRight,right*.16);
  if(canStand(next.x,camera.position.z))displacement.x+=next.x-camera.position.x;
  if(canStand(camera.position.x,next.z))displacement.z+=next.z-camera.position.z;
 }
 async function furnishLivingRoom(){
  const {scene:model}=await glLoader.loadAsync(asset('living-room-dog.glb'));
  // The reviewed metre-scale model is centred in XZ, with its lowest paw at Y=0.
  model.position.set(4.97,.0865,.84);
  model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
  const shade=new T.Mesh(new T.PlaneGeometry(.81,.35),new T.MeshBasicMaterial({map:contactMap,transparent:true,opacity:.72,depthWrite:false}));
  shade.rotation.x=-Math.PI/2;shade.position.set(4.97,.0878,.84);
  scene.add(shade,model);
 }
 function size(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
 function draw(progress,time,gust,roofLift=0,guided=false,benchPass=0){windTime.value=time;gustStrength.value=gust;let p=Math.max(0,Math.min(1,progress));const track=guided?Math.min(1,p/.76):p;
   const cp=camPath.getPoint(track),aim=aimPath.getPoint(track);
   if(guided&&p>.76){
    // Turn via the open aisle. Interpolating the look-at endpoints would aim straight into the camera.
    const turn=T.MathUtils.smoothstep(p,.76,1);
    const startYaw=Math.atan2(4.08-.89,-.78-1.69),endYaw=Math.atan2(-2.40+.28,-.95-1.64)+Math.PI*2;
    const yaw=T.MathUtils.lerp(startYaw,endYaw,turn);
    cp.lerp(v(-.28,1.39,1.64),turn);
    aim.set(cp.x+3.8*Math.sin(yaw),cp.y-.34,cp.z+3.8*Math.cos(yaw));
   }
   // Lift only the existing canopy, its lining and seams. Both still cast shadows on the rooms.
   roofStudy.position.set(0,roofLift*3.2,-roofLift*2.1);
   if(roofLift){cp.lerp(v(13.4,10.1,18.9),roofLift);aim.lerp(v(.1,2.65,0),roofLift)}
   if(camera.aspect<1.24){const f=Math.max(0,1.24-camera.aspect);cp.z+=17.8*f*(1-p)**1.5;cp.x+=4.9*f*(1-p);aim.x+=.65*f}
   camera.fov=match?42-3*p:42+14*p*p;if(guided&&p>.76)camera.fov=T.MathUtils.lerp(56,camera.aspect<1?69:51,T.MathUtils.smoothstep(p,.76,1));camera.updateProjectionMatrix();
   if(benchPass>0){
    cp.lerp(v(-2.75,1.34,-.39),benchPass);aim.lerp(v(-1.55,1.16,-1.83),benchPass);
    camera.fov=T.MathUtils.lerp(camera.fov,camera.aspect<1?57:43,benchPass);
   }
   if(detail==='kitchen'){cp.set(-.28,1.39,1.64);aim.set(-2.40,1.10,-.95);camera.fov=camera.aspect<1?69:51}
   if(detail==='bedroom'){cp.set(-4.17,1.33,-1.24);aim.set(-6.22,.83,.18);camera.fov=camera.aspect<1?70:56}
   if(detail==='basin'){cp.set(-1.10,1.37,-.77);aim.set(-1.74,1.12,-1.79);camera.fov=43}
   if(detail==='tree'){cp.set(-7.35,2.40,7.37);aim.set(-12.17,3.68,1.94);camera.fov=48}
   if(detail==='deck'){cp.set(6.75,1.41,4.0);aim.set(-1.10,1.04,2.61);camera.fov=57}
   if(garden?.active)garden.frame(cp,aim);
   indoors=!garden?.active&&p>.63&&!['deck','tree'].includes(detail);
   scene.environmentIntensity=indoors?.43:1.03;
   camera.updateProjectionMatrix();
   if(explorePose){
    const {yaw,pitch,travel}=explorePose;
    if(!indoors){
     const offset=cp.clone().sub(aim),sphere=new T.Spherical().setFromVector3(offset);
     sphere.theta+=yaw*.69;sphere.phi=T.MathUtils.clamp(sphere.phi-pitch,.52,1.67);
     sphere.radius*=1-travel*.68;cp.copy(aim).add(offset.setFromSpherical(sphere));
     cp.y=Math.max(cp.y,ground(cp.x,cp.z)+.98);
    }else{
     const dir=aim.clone().sub(cp).normalize(),sphere=new T.Spherical().setFromVector3(dir);
     sphere.theta+=yaw;sphere.phi=T.MathUtils.clamp(sphere.phi-pitch,.5,2.55);dir.setFromSpherical(sphere);
     cp.add(displacement);const dolly=cp.clone().addScaledVector(dir,travel*.45);if(canStand(dolly.x,dolly.z))cp.copy(dolly);aim.copy(cp).addScaledVector(dir,3.8);
    }
   }

   camera.position.copy(cp);camera.lookAt(aim);
   for(const {o,placements,windFactor} of wind){for(let i=0;i<placements.length;i++){const [x,y,z,s,a]=placements[i];const front=Math.exp(-Math.pow((time%6.8)*3.9-x*.52-z*.34-4.5,2)/13);const wave=.26*Math.sin(time*1.18+x*.51+z*.35)+.11*Math.sin(time*2.07-z*.19)+gust*(.22+1.1*front)*Math.sin(time*2.51-x*.33);
     tmp.position.set(x,y,z);tmp.scale.setScalar(s);tmp.rotation.set(wave*windFactor*.47,a,wave*windFactor,'ZXY');tmp.updateMatrix();o.setMatrixAt(i,tmp.matrix)}o.instanceMatrix.needsUpdate=true}
   renderer.render(scene,camera)
 }
 size();return {backend,draw,size,refine,refineFinishes,finishesReady:()=>finishesReady,refinePlanting,step,gardenBed,furnishLivingRoom,inside:()=>indoors,resetWalk:()=>displacement.set(0,0,0),setDetail(value){detail=value;displacement.set(0,0,0)},setExplore(view){explorePose=view;if(!view)displacement.set(0,0,0)},renderer,triangleCount,pose:()=>({position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),fov:camera.fov,aspect:camera.aspect})}
 } catch(error) {
   if(initialized)renderer.dispose();
   throw error;
 } finally {signal?.removeEventListener('abort',abort)}
}
