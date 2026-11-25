import {plantPohutukawa} from './pohutukawa.js';
import * as T from './vendor/three.webgpu.min.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {HDRLoader} from './vendor/HDRLoader.js';
import {RoundedBoxGeometry} from './vendor/RoundedBoxGeometry.js';
import {RectAreaLightTexturesLib} from './vendor/RectAreaLightTexturesLib.js';
import {ao} from './vendor/GTAONode.js';
import {finePanicles} from './panicles.js';
import {furnishRoom} from './interior.js';
import {buildCoast,addSedges,grade,plantable,pathX} from './landscape.js';
import {buildBoards} from './metric.js';
import {houseParts} from './house-parts.js';

export async function openPavilion(host,asset,forceGL=false){
 const renderer=new T.WebGPURenderer({antialias:true,forceWebGL:forceGL,alpha:false});
 await renderer.init();renderer.setPixelRatio(Math.min(devicePixelRatio,host.clientWidth<=680?1.15:1.55));renderer.shadowMap.enabled=true;
 renderer.shadowMap.type=T.PCFShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.13;
 const scene=new T.Scene(), camera=new T.PerspectiveCamera(45,1,.065,1000),cube=new T.BoxGeometry(),matrix=new T.Matrix4(),q=new T.Quaternion();
 const v=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
 let seed=92731;const rand=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296),range=(a,b)=>a+(b-a)*rand();
 const texLoader=new T.TextureLoader(),glLoader=new GLTFLoader();
 const refinements=[];
 const unit=document.createElement('canvas');unit.width=unit.height=1;
 const brush=unit.getContext('2d');brush.fillStyle='#8080ff';brush.fillRect(0,0,1,1);
 function surface(name){
   if(!/(?:-normal|-n)\.webp$/.test(name))return texLoader.loadAsync(asset(name));
   const texture=new T.CanvasTexture(unit);
   refinements.push(async()=>{const detail=await texLoader.loadAsync(asset(name));texture.image=detail.image;texture.needsUpdate=true});
   return Promise.resolve(texture);
 }
 let refined=false;
 async function refine(){if(refined)return;refined=true;
   while(refinements.length){await Promise.allSettled(refinements.splice(0,2).map(load=>load()))}
 }
 const [sky,wood,blackwood,grit,chair,fern,shrub,grass,softgoods,terrain,pillows]=await Promise.all([
   new HDRLoader().loadAsync(asset('kloofendal_38d_partly_cloudy_puresky.hdr')),
   ...['cedar','charred','sandy_gravel'].map(n=>surface(n+'.webp')),
   ...['mid_century_lounge_chair','fern_02','shrub_03','grass_medium_01','softgoods','gulf-terrain','linen-pillows'].map(n=>glLoader.loadAsync(asset(n+'.glb')))
 ]);
 sky.mapping=T.EquirectangularReflectionMapping;scene.environment=sky;scene.background=sky;scene.backgroundRotation.y=scene.environmentRotation.y=0;
 scene.backgroundIntensity=1.22;scene.environmentIntensity=1.15;
 for(const t of [wood,blackwood,grit]){t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=6}
 const mat=(c,r=.8,map=null,extra={})=>new T.MeshStandardMaterial({color:c,roughness:r,map,...extra});
 const [brick,brickN,rockTex,rockN,deckMap]=await Promise.all(['dark_brick_wall','dark_brick_wall-normal','rock_face_03','rock_face_03-normal','deck'].map(n=>surface(n+'.webp')));
 for(const tex of [brick,brickN,rockTex,rockN,deckMap]){tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=6}
 for(const tex of [brick,rockTex,deckMap])tex.colorSpace=T.SRGBColorSpace;
 const newNames=['rough_linen','rough_linen-n','brown_planks_08','brown_planks_08-n','plastered_wall_04','plastered_wall_04-n','aerial_grass_rock','aerial_grass_rock-n','concrete_wall_006','concrete_wall_006-n','plan16a'];
 const [fabric,fabricN,oakMap,oakN,plaster,plasterN,pasture,pastureN,concrete,concreteN,print]=await Promise.all(newNames.map(n=>surface(n+'.webp')));
 for(const [i,t] of [fabric,fabricN,oakMap,oakN,plaster,plasterN,pasture,pastureN,concrete,concreteN,print].entries()){
   t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;if(!newNames[i].endsWith('-n'))t.colorSpace=T.SRGBColorSpace
 }
 fabric.repeat.set(5,5);fabricN.repeat.set(5,5);
 const [floorAO,wallAO,ripple,pillowNormal,landcover,seaPhoto]=await Promise.all(['floor-ao.png','wall-ao.png','bay-ripple.png','pillow-weave-n.webp','gulf-landcover.webp','gulf-water.webp'].map(n=>surface(n)));
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
 const pine=mat(0xaaa087,.88,deckMap),cedar=mat(0xf2e1c4,.7,wood),dark=mat(0x98978d,.79,blackwood),edge=mat(0x252522,.43),metal=mat(0x252828,.3,null,{metalness:.55});
 const deck=mat(0xc7c3ae,.89,deckMap),wall=lime,stone=mat(0x625f54,.77,grit),warmwhite=mat(0xebe1cb),linen=mat(0xb6a592),glow=mat(0xffecc5,.4,null,{emissive:0xffbd67,emissiveIntensity:2.6});
 for(const m of [pine,cedar,dark,deck]){m.userData.grain=true;m.userData.repeatMetres=m===dark?1.75:2.8}
 const glass=new T.MeshPhysicalNodeMaterial({color:0xeaf0ed,roughness:.047,metalness:0,ior:1.5,clearcoat:1,clearcoatRoughness:.045,transparent:true,depthWrite:false});
 const {normalView,positionViewDirection,float}=T.TSL;
 const grazing=float(1).sub(normalView.dot(positionViewDirection).abs().clamp()).pow(4);
 glass.opacityNode=float(.037).add(grazing.mul(.46));
 const boxes=new Map();
 function register(m,transform){if(!boxes.has(m))boxes.set(m,[]);boxes.get(m).push(transform.clone())}
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
 const pitch=.085,roof=z=>2.91+z*pitch;
 box(0,roof(.55)+.10,.55,15.44,.2,6.13,edge,-Math.atan(pitch));
 for(let i=0;i<122;i++){const x=-7.64+i*.126;box(x,roof(.53)-.028,.53,.123,.045,6.1,cedar,-Math.atan(pitch))}
 for(let i=0;i<29;i++){const x=-7.53+i*.54;box(x,roof(.55)+.218,.55,.022,.043,6.08,metal,-Math.atan(pitch))}
 box(0,roof(3.6)+.065,3.61,15.5,.245,.052,metal);
 // Continuous weatherboard screen on each end and a recessed solid service bay.
 function cladEnd(x){box(x,1.37,-.04,.13,2.76,4.22,dark);for(let i=0;i<34;i++){const z=-2.09+i*.126,h=roof(z)-.04;box(x+Math.sign(x)*.087,h/2,z,.045,h,.118,dark)}}
 cladEnd(-7.14);
 box(7.14,1.43,-.93,.18,2.86,2.33,lime);box(7.252,1.43,-.93,.039,2.86,2.33,dark);
 for(let j=0;j<18;j++)box(7.283,1.43,-2.048+j*.132,.027,2.86,.122,dark);
 box(7.14,.273,1.13,.19,.546,1.76,lime);box(7.14,2.955,1.15,.21,.34,1.84,lime);
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
 box(7.16,1.66,1.12,.012,2.18,1.72,glass);
 for(const z of [.22,1.08,2.0])box(7.12,1.66,z,.12,2.27,.047,metal);
 for(const y of [.55,2.78]){box(7.12,y,1.12,.12,.048,1.8,metal);box(7.035,y+(y<1?-.03:.03),1.12,.24,.032,1.89,oak)}
 for(const z of [.20,2.02])box(7.03,1.66,z,.26,2.28,.041,oak);
 // Two pale, board-marked residual walls read through the terrace, with a shadow joint below the cap.
 box(-6.83,1.46,2.55,.24,2.92,2.13,stoneCast);box(-6.83,2.945,2.55,.27,.043,2.15,metal);
 for(let row=0;row<17;row++){const y=.13+row*.164;box(-6.699,y,2.55,.005,.004,2.11,stoneCast)}
 
 box(-2.65,1.31,-2.08,8.98,2.62,.13,wall);box(6.32,1.31,-2.08,1.64,2.62,.13,wall);
 box(3.65,.46,-2.08,3.7,.92,.13,wall);box(3.65,2.52,-2.08,3.7,.28,.13,wall);
 for(const x of [1.84,4.41,5.48])box(x,1.65,-2.06,.044,1.48,.15,metal);
 for(const y of [.926,2.37])box(3.65,y,-2.06,3.72,.058,.17,metal);
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
 box(-3.55,.48,-1.57,5.6,.87,.78,cedar);box(-3.55,.947,-1.55,5.72,.065,.88,stone);
 for(let i=0;i<8;i++){let x=-6.01+i*.7;box(x,.48,-1.164,.681,.80,.035,dark);box(x,.81,-1.136,.21,.018,.026,metal)}
 box(-3.62,1.81,-1.79,5.47,.043,.41,cedar);box(-3.62,1.777,-1.72,5.30,.012,.055,glow);
 box(-2.9,.92,.26,3.02,.105,.85,stone);box(-2.9,.46,.26,2.6,.85,.64,cedar);
 for(const x of [-3.73,-2.83,-1.93]){cylinder(x,.65,.99,.2,.185,.065,cedar);for(const dx of [-.13,.13])for(const dz of [-.10,.10])box(x+dx,.33,.99+dz,.032,.64,.032,metal)}
 for(let i=0;i<3;i++){let x=-3.93+i*.97;box(x,2.56,.23,.009,.73,.009,metal);cylinder(x,2.12,.23,.085,.145,.11,metal);cylinder(x,2.06,.23,.125,.125,.01,glow)}
 const limestone=mat(0xc6c4b6,.74,plaster,{normalMap:concreteN,normalScale:new T.Vector2(.11,.11)});
 furnishRoom({scene,mesh,box,cylinder,softgoods,chair,cloth,oak,plaster:lime,metal,limestone,print,linenBump:fabricN,evalFloor,pillows,pillowNormal});
 const vase=mesh(new T.LatheGeometry([[.12,0],[.22,.09],[.25,.24],[.2,.39],[.099,.48],[.094,.50]].map(([a,b])=>new T.Vector2(a,b)),32),stone,-5.75,.978,-1.44);
 {
 const [floorAO,wallAO,ripple,pillowNormal,landcover,seaPhoto]=await Promise.all(['floor-ao.png','wall-ao.png','bay-ripple.png','pillow-weave-n.webp','gulf-landcover.webp','gulf-water.webp'].map(n=>surface(n)));
 landcover.colorSpace=seaPhoto.colorSpace=T.SRGBColorSpace;landcover.anisotropy=seaPhoto.anisotropy=8;
 ripple.wrapS=ripple.wrapT=T.RepeatWrapping;ripple.repeat.set(205,205);ripple.anisotropy=8;
 const litFloor=new T.MeshStandardNodeMaterial({roughness:.76,map:oakMap,normalMap:oakN,normalScale:new T.Vector2(.14,.14)});
 const evalFloor=T.TSL.texture(floorAO,T.TSL.vec2(T.TSL.positionWorld.x.div(14.4).add(.5),T.TSL.positionWorld.z.div(4.24).add(.5))).r;
 litFloor.colorNode=T.TSL.texture(oakMap).rgb.mul(evalFloor.pow(1.25));litFloor.userData={grain:true,repeatMetres:2.8};
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
 for(let i=0;i<3;i++)box(0,roof(3.60)+.10-i*.033,3.636,15.46,.014,.02,edge);
 box(0,-.137,4.499,14.41,.116,.028,deck);box(0,-.204,4.49,14.36,.012,.018,metal);
 buildBoards(boxes,scene,glass);

 const contactCanvas=document.createElement('canvas');contactCanvas.width=contactCanvas.height=128;const cc=contactCanvas.getContext('2d'),gradient=cc.createRadialGradient(64,64,1,64,64,64);gradient.addColorStop(0,'rgba(28,25,20,.67)');gradient.addColorStop(.55,'rgba(28,25,20,.36)');gradient.addColorStop(1,'rgba(28,25,20,0)');cc.fillStyle=gradient;cc.fillRect(0,0,128,128);const contactMap=new T.CanvasTexture(contactCanvas);
 for(const [x,z,w,d,yy] of [[3.42,-1.34,3.35,1.16,.069],[3.64,.19,1.83,.99,.094],[5.88,.26,1.09,1.04,.092]]){
 const sh=mesh(new T.PlaneGeometry(w,d),new T.MeshBasicMaterial({map:contactMap,transparent:true,depthWrite:false}),x,yy,z);sh.rotation.x=-Math.PI/2;sh.castShadow=false}
 const ground=grade;
 buildCoast({scene,mesh,mat,map:pasture,normal:pastureN,grit,rockTex,rockN,rand,range,terrain,ripple,landcover,seaPhoto});
 const windTime=T.TSL.uniform(0),gustStrength=T.TSL.uniform(0);
 addSedges({scene,range,rand,timeNode:windTime,gustNode:gustStrength});finePanicles(scene,windTime,gustStrength);
 const hemi=new T.HemisphereLight(0xe5edf2,0x99968b,.24);scene.add(hemi);
 const sun=new T.DirectionalLight(0xfff2da,2.6);sun.position.set(.6390*30,.6128*30,.4649*30);sun.target.position.set(0,0,0);scene.add(sun,sun.target);sun.castShadow=true;
 Object.assign(sun.shadow.camera,{left:-18,right:18,top:14,bottom:-13,near:.2,far:65});sun.shadow.mapSize.set(2048,2048);sun.shadow.normalBias=.003;sun.shadow.bias=-.00007;
 const fill=new T.DirectionalLight(0xe4eef6,.12);fill.position.set(2,6,-3);scene.add(fill);
 for(const x of [-3,3]){const lamp=new T.SpotLight(0xffead2,3.3,5,1.04,.86,2);lamp.position.set(x,2.64,.20);lamp.target.position.set(x,.35,-.65);scene.add(lamp,lamp.target)}
 // Area emitters fill the actual apertures. They provide broad indoor sky transport without point hotspots.
 T.RectAreaLightNode.setLTC(RectAreaLightTexturesLib.init());
 const aperture=(pos,aim,w,h,power,color)=>{const l=new T.RectAreaLight(color,power,w,h);l.position.set(...pos);l.lookAt(...aim);scene.add(l)};
 aperture([7.13,1.61,1.12],[2.5,1.18,0],1.76,2.15,1.7,0xf4f4ed);
 aperture([3.64,1.66,-2.07],[3.66,.45,1],3.58,1.40,2.3,0xe9f0f4);
 aperture([3.80,1.49,2.05],[3.31,1.0,-1],6.35,2.74,1.25,0xf5eee0);
 const tmp=new T.Object3D(),wind=[];
 function instantiate(geo,m,placements,windFactor=0,cast=true){if(!placements.length)return;const o=new T.InstancedMesh(geo,m,placements.length);o.castShadow=cast;o.receiveShadow=true;
   for(let i=0;i<placements.length;i++){const [x,y,z,s,a]=placements[i];tmp.position.set(x,y,z);tmp.scale.setScalar(s);tmp.rotation.set(0,a,0);tmp.updateMatrix();o.setMatrixAt(i,tmp.matrix)}
   scene.add(o);if(windFactor)wind.push({o,placements,windFactor});return o
 }
 function scanPlant(g,count,scale,zone,windFactor){if(host.clientWidth<=680)count=Math.ceil(count*.57);const all=g.scene.children.filter(o=>o.isMesh||o.children.length);const variants=all;
   variants.forEach((src,j)=>{const locations=[];for(let i=j;i<count;i+=variants.length){let [x,z]=zone();locations.push([x,ground(x,z)-.018,z,range(...scale),range(0,6.28)])}src.traverse(n=>{if(n.isMesh){
     const m=n.material.clone();m.side=T.DoubleSide;m.transparent=false;m.alphaTest=.42;m.roughness=.84;
     const stride=host.clientWidth<=680?(g===shrub?4:2):(g===shrub?2:1);
     instantiate(n.geometry,m,locations.filter((_,index)=>index%stride===0),windFactor)
   }})})
 }
 const around=()=>{let x,z;do{x=range(-17,16);z=range(-8,16)}while(!plantable(x,z));return [x,z]};
 const fernHollow=()=>{let x,z;do{x=range(-13,8);z=range(2,11)}while(!plantable(x,z));return [x,z]};
 scanPlant(fern,77,[.91,1.36],fernHollow,.02);scanPlant(shrub,88,[1.21,2.37],around,.016);scanPlant(grass,450,[1.9,3.3],around,.024);
 // Rooted harakeke fans: folded longitudinal ridges catch different amounts of sun on each face.
 function flax(seedIdx){const verts=[],col=[],faces=[];for(let i=0;i<32;i++){const angle=(i%2?0:Math.PI)+range(-.62,.62)+Math.floor(i/11)*1.02,L=range(.53,1.5),W=range(.029,.066),curl=range(.32,1.2),off=range(-.066,.066),base=verts.length/3;
  const tone=new T.Color().setRGB(range(.039,.09),range(.075,.135),range(.018,.045));for(let k=0;k<=10;k++){const t=k/10,dist=L*(.07*t+curl*t*t*.78),h=L*(1.65*t-.94*t*t-(curl*.28)*t*t*t),wx=Math.cos(angle),wz=-Math.sin(angle),width=W*(1-t**1.8)*(.67+.34*Math.sin(t*Math.PI)),cx=Math.sin(angle)*dist+off,cz=Math.cos(angle)*dist;
   for(const side of [-1,0,1]){verts.push(cx+side*wx*width,h+(side===0?width*.49:0),cz+side*wz*width);const f=(side===0?1.22:side===1?.87:1)*(1+.18*t);col.push(tone.r*f,tone.g*f,tone.b*f)}
   if(k<10){const a=base+k*3;faces.push(a,a+3,a+1,a+1,a+3,a+4,a+1,a+4,a+2,a+2,a+4,a+5)}
  }}let geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setAttribute('color',new T.Float32BufferAttribute(col,3));geo.setIndex(faces);geo.computeVertexNormals();return geo}
 const bladeMat=mat(0xffffff,.66,null,{vertexColors:true,side:T.DoubleSide});
 for(let j=0;j<3;j++){let spots=[];for(let i=0;i<12;i++){let [x,z]=around();spots.push([x,ground(x,z),z,range(.61,1.37),range(0,6.28)])}instantiate(flax(j),bladeMat,spots,.054)}
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
 await plantPohutukawa(scene,ground,name=>texLoader.loadAsync(asset(name)),host.clientWidth<=680);
 let triangleCount=0;scene.traverse(o=>{if(o.isMesh)triangleCount+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1)});
 const optical=renderer.backend.isWebGPUBackend&&host.clientWidth>680;
 let post,focusDistance,focusWidth;
 if(optical){
   const {pass,uniform,vec2,vec4,uv}=T.TSL,scenePass=pass(scene,camera),image=scenePass.getTextureNode(),depth=scenePass.getTextureNode('depth');
   const distance=scenePass.getViewZNode().negate();focusDistance=uniform(14);focusWidth=uniform(2.6);
   const blur=distance.sub(focusDistance).abs().div(distance.max(.5)).mul(focusWidth).clamp(0,5.0);
   const delta=vec2(1).div(T.TSL.screenSize).mul(blur);
   let rgb=image.rgb.mul(.25);
   for(let i=0;i<8;i++){let a=i*Math.PI/4;rgb=rgb.add(image.sample(uv().add(delta.mul(vec2(Math.cos(a),Math.sin(a))))).rgb.mul(.09375))}
   const contact=ao(depth,null,camera);contact.resolutionScale=.5;contact.samples.value=9;contact.radius.value=.42;contact.thickness.value=.4;
   post=new T.PostProcessing(renderer);post.outputNode=vec4(rgb.mul(contact.getTextureNode().r.mul(.38).add(.62)),1)
 }
 const backend=renderer.backend.isWebGPUBackend?'WebGPU':'WebGL 2';
 host.replaceChildren(renderer.domElement);renderer.domElement.setAttribute('aria-hidden','true');
 const match=new URLSearchParams(location.search).has('match');
 const positions=[v(12.1,.67,13.8),v(5.8,.73,8.45),(match?v(1.55,1.40,1.48):v(.89,1.49,1.69))],targets=[v(.02,1.02,.65),v(.07,1.21,.12),(match?v(4.28,1.27,-1.25):v(4.08,1.14,-.78))];
 const camPath=new T.CatmullRomCurve3(positions,false,'centripetal'),aimPath=new T.CatmullRomCurve3(targets,false,'centripetal');
 let explorePose=null;
 function size(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
 function draw(progress,time,gust){windTime.value=time;gustStrength.value=gust;let p=Math.max(0,Math.min(1,progress));const cp=camPath.getPoint(p),aim=aimPath.getPoint(p);
   if(camera.aspect<1.24){const f=Math.max(0,1.24-camera.aspect);cp.z+=17.8*f*(1-p)**1.5;cp.x+=4.9*f*(1-p);aim.x+=.65*f}
   camera.fov=match?42-3*p:42+14*p*p;camera.updateProjectionMatrix();
   if(explorePose){
    const {yaw,pitch,travel}=explorePose;
    if(p<.62){
     const offset=cp.clone().sub(aim),sphere=new T.Spherical().setFromVector3(offset);
     sphere.theta+=yaw*.69;sphere.phi=T.MathUtils.clamp(sphere.phi-pitch,.52,1.67);
     sphere.radius*=1-travel*.68;cp.copy(aim).add(offset.setFromSpherical(sphere));
     cp.y=Math.max(cp.y,ground(cp.x,cp.z)+.98);
    }else{
     const dir=aim.clone().sub(cp).normalize(),sphere=new T.Spherical().setFromVector3(dir);
     sphere.theta+=yaw;sphere.phi=T.MathUtils.clamp(sphere.phi-pitch,.5,2.55);dir.setFromSpherical(sphere);
     cp.addScaledVector(dir,travel*.7);aim.copy(cp).addScaledVector(dir,3.8);
    }
   }
   camera.position.copy(cp);camera.lookAt(aim);
   for(const {o,placements,windFactor} of wind){for(let i=0;i<placements.length;i++){const [x,y,z,s,a]=placements[i];const front=Math.exp(-Math.pow((time%6.8)*3.9-x*.52-z*.34-4.5,2)/13);const wave=.26*Math.sin(time*1.18+x*.51+z*.35)+.11*Math.sin(time*2.07-z*.19)+gust*(.22+1.1*front)*Math.sin(time*2.51-x*.33);
     tmp.position.set(x,y,z);tmp.scale.setScalar(s);tmp.rotation.set(wave*windFactor*.47,a,wave*windFactor,'ZXY');tmp.updateMatrix();o.setMatrixAt(i,tmp.matrix)}o.instanceMatrix.needsUpdate=true}
   if(post){const detail=match?0:Math.exp(-Math.pow((p-.17)/.073,2));focusDistance.value=T.MathUtils.lerp(cp.distanceTo(aim),4.15,detail*.88);focusWidth.value=2.18+detail*2.7;post.render()}else renderer.render(scene,camera)
 }
 size();return {backend,draw,size,refine,setExplore(view){explorePose=view},renderer,triangleCount,pose:()=>({position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),fov:camera.fov,aspect:camera.aspect})}
}
