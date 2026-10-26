/* kitchen3d.js: the kitchen machine's "Where it all lives" as a real-time 3D kitchen.
   A fridge whose door swings open (interior light, glass shelves, a frosted crisper, door bins), a timber bench and an
   open pantry. Every food on the plan is a small 3D object placed where it keeps best, with a glowing ring in its
   eat-by colour (the "first few days" ones pulse). It reads window.__kitchenScene, which the page's drawScene() writes,
   so the plan, the photo scan and the shopping list all show up here. The SVG stays underneath as the fallback. */
import * as THREE from "three";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import {RoomEnvironment} from "three/addons/environments/RoomEnvironment.js";
import {RoundedBoxGeometry} from "three/addons/geometries/RoundedBoxGeometry.js";

const svg=document.getElementById("fridge");
const ok=svg&&!/[?&]lite\b/.test(location.search)&&(()=>{try{const c=document.createElement("canvas");return !!(c.getContext("webgl2")||c.getContext("webgl"))}catch(e){return false}})();
if(ok)start();

function start(){
const REDUCED=matchMedia("(prefers-reduced-motion: reduce)").matches;
const host=document.createElement("div");host.className="k3d";
host.innerHTML=`<canvas aria-label="A 3D kitchen: the fridge, bench and pantry with this week's food placed where it keeps best. Drag to look around; tap the fridge door to open or close it; tap a food to see its name." role="img" tabindex="0"></canvas><div class="k3d-ov"></div><p class="k3d-hint">Drag to look around · tap the door · tap a food</p>`;
const css=document.createElement("style");css.textContent=`.k3d{position:relative;width:100%;aspect-ratio:520/440;border-radius:18px;overflow:hidden;touch-action:pan-y}
.k3d canvas{display:block;width:100%;height:100%;outline:none;cursor:grab}.k3d canvas:active{cursor:grabbing}
.k3d-ov{position:absolute;inset:0;pointer-events:none}
.k3d-pill{position:absolute;left:0;top:0;transform:translate(-9999px,0);white-space:nowrap;background:var(--chalk,#fff);color:var(--ink,#240B21);border:1px solid var(--line-2,#e5dde0);border-radius:999px;padding:4px 11px 5px;font:600 11.5px var(--display,system-ui);box-shadow:0 8px 20px -12px #240B2166;transition:opacity .2s}
.k3d-pill small{display:block;font:500 10px var(--mono,monospace);letter-spacing:.04em;color:var(--rose,#8b6d73)}
.k3d-pill.zone{font:500 9.5px var(--mono,monospace);letter-spacing:.1em;text-transform:uppercase;color:var(--rose,#8b6d73);padding:3px 8px;box-shadow:none}
.k3d-pill.head{text-align:center;font:600 13.5px var(--display,system-ui);padding:6px 14px 7px;border-radius:14px}
.k3d-hint{position:absolute;left:10px;bottom:8px;margin:0;font:500 10px var(--mono,monospace);letter-spacing:.04em;color:var(--rose,#8b6d73);background:color-mix(in srgb,var(--chalk,#fff) 80%,transparent);padding:3px 9px;border-radius:999px;pointer-events:none;transition:opacity .6s}
.k3d-hint.gone{opacity:0}`;
document.head.appendChild(css);
svg.style.display="none";svg.parentNode.insertBefore(host,svg);
const canvas=host.querySelector("canvas"),ov=host.querySelector(".k3d-ov"),hint=host.querySelector(".k3d-hint");

const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,matchMedia("(pointer:coarse)").matches?1.75:2));
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NeutralToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();
const pm=new THREE.PMREMGenerator(renderer);scene.environment=pm.fromScene(new RoomEnvironment(),.04).texture;scene.environmentIntensity=.55;pm.dispose();
const hemi=new THREE.HemisphereLight(0xffffff,0xd9cdd1,.45);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff1e2,2.1);sun.position.set(-3.5,6,4.5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.radius=4;sun.shadow.bias=-.0004;sun.shadow.normalBias=.02;
Object.assign(sun.shadow.camera,{left:-4,right:4,top:4,bottom:-4,near:.5,far:20});scene.add(sun);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.ShadowMaterial({color:0x240B21,opacity:.22}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
const camera=new THREE.PerspectiveCamera(30,520/440,.05,60);
const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.08;controls.enablePan=false;controls.minDistance=3.4;controls.maxDistance=10;
controls.minPolarAngle=.55;controls.maxPolarAngle=1.42;controls.minAzimuthAngle=-.75;controls.maxAzimuthAngle=.75;controls.target.set(.7,1.0,0);
camera.position.set(1.25,2.5,7.4);controls.addEventListener("start",()=>hint.classList.add("gone"));

// ---- materials
const cache=new Map();
const M=(c,o={})=>{const k=c+JSON.stringify(o);if(!o.fresh&&cache.has(k))return cache.get(k);
  const m=o.glass?new THREE.MeshPhysicalMaterial({color:c,roughness:.08,metalness:0,clearcoat:1,transparent:true,opacity:o.op??.22,depthWrite:false,side:THREE.DoubleSide})
    :o.glow?new THREE.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:o.glow,roughness:.4})
    :new THREE.MeshPhysicalMaterial({color:c,roughness:o.r??.42,metalness:o.m??0,clearcoat:o.cc??.5,clearcoatRoughness:.3,transparent:!!o.op,opacity:o.op??1});
  if(!o.fresh)cache.set(k,m);return m};
const mesh=(g,m,p,x=0,y=0,z=0)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=!m.transparent;o.receiveShadow=true;(p||scene).add(o);return o};
const rb=(w,h,d,r,m,p,x,y,z)=>mesh(new RoundedBoxGeometry(w,h,d,3,Math.min(r,w/2-.001,h/2-.001,d/2-.001)),m,p,x,y,z);

// ---- fridge: body opens to the front, door hinged on its right edge
const FW=1.1,FH=2.0,FD=.78,T=.05,FX=-.55;
const fridge=new THREE.Group();fridge.position.set(FX,0,0);scene.add(fridge);
const shell=M("#F4F1F1",{r:.3,cc:.8});
rb(FW,T,FD,.02,shell,fridge,0,FH-T/2,0);rb(FW,.12,FD,.03,shell,fridge,0,.06,0);
rb(T,FH,FD,.02,shell,fridge,-FW/2+T/2,FH/2,0);rb(T,FH,FD,.02,shell,fridge,FW/2-T/2,FH/2,0);rb(FW,FH,T,.02,shell,fridge,0,FH/2,-FD/2+T/2);
const inner=mesh(new THREE.PlaneGeometry(FW-2*T,FH-.2),new THREE.MeshStandardMaterial({color:"#ffffff",emissive:"#FFF6E8",emissiveIntensity:.35,roughness:.8}),fridge,0,FH/2+.02,-FD/2+T+.003);inner.receiveShadow=true;
const fl=new THREE.PointLight("#FFF3DE",3.2,2.4,1.6);fl.position.set(0,FH-.25,.05);fridge.add(fl);
const SH=[1.28,.82];SH.forEach(y=>{const g=rb(FW-2*T-.01,.025,FD-T-.06,.008,M("#DDEFF5",{glass:true,op:.45}),fridge,0,y,.0);g.renderOrder=2;
  mesh(new THREE.BoxGeometry(FW-2*T-.01,.03,.02),M("#E9E4E6",{r:.3}),fridge,0,y,FD/2-.06)});
const crisper=rb(FW-2*T-.03,.42,FD-T-.12,.03,M("#DCEFE2",{glass:true,op:.5}),fridge,0,.36,-.02);crisper.renderOrder=3;
mesh(new THREE.BoxGeometry(.24,.035,.03),M("#BFD6C6",{r:.3}),fridge,0,.52,FD/2-.1);
// the door
const doorPivot=new THREE.Group();doorPivot.position.set(-FW/2,0,FD/2);fridge.add(doorPivot);   // hinged on the left, swinging away from the bench
const door=new THREE.Group();door.position.set(FW/2,0,0);doorPivot.add(door);
rb(FW,FH-.02,.07,.03,M("#F7F5F5",{r:.25,cc:.9}),door,0,FH/2,.035);
rb(.035,.7,.05,.017,M("#D9CDD1",{m:.6,r:.25}),door,FW/2-.1,1.25,.1);   // handle on the free edge
[.42,1.0,1.55].forEach(y=>{const b=rb(FW-.16,.16,.16,.03,M("#E8F2F7",{glass:true,op:.5}),door,0,y,-.09);b.renderOrder=3});
let doorOpen=0,doorWant=1;
// ---- bench and pantry
const BX=.95,bench=new THREE.Group();bench.position.set(BX,0,.05);scene.add(bench);
rb(1.05,.86,.62,.03,M("#F3EEEA",{r:.45}),bench,0,.43,0);rb(1.13,.06,.7,.02,M("#D9B48F",{r:.55,cc:.3}),bench,0,.89,0);
[-.26,.26].forEach(x=>rb(.012,.012,.012,.006,M("#9C8E95",{m:.7}),bench,x,.62,.315));
rb(.5,.28,.02,.01,M("#E9E2DD",{r:.5}),bench,-.26,.47,.312);rb(.5,.28,.02,.01,M("#E9E2DD",{r:.5}),bench,.26,.47,.312);
const PX=2.15,pantry=new THREE.Group();pantry.position.set(PX,0,-.05);scene.add(pantry);
const ptm=M("#EDE2D2",{r:.5,cc:.2});
rb(.95,1.7,.06,.02,ptm,pantry,0,.85,-.27);rb(.06,1.7,.6,.02,ptm,pantry,-.445,.85,0);rb(.06,1.7,.6,.02,ptm,pantry,.445,.85,0);rb(.95,.06,.6,.02,ptm,pantry,0,1.67,0);rb(.95,.08,.6,.02,ptm,pantry,0,.04,0);
const PS=[.5,1.05];PS.forEach(y=>rb(.85,.035,.55,.01,M("#E2D3BE",{r:.5}),pantry,0,y,0));
const pdoor=rb(.48,1.62,.04,.02,M("#E6D6C1",{r:.45}),pantry,.47+.24*Math.cos(1.1),.85,.3+.24*Math.sin(1.1));pdoor.rotation.y=-1.1;

// ---- food: a small model per item, by name first, then by group
// ---- the room: a timber floor plinth, a tiled splashback with a window, a pendant and a plant
{const tileTex=(()=>{const c=document.createElement("canvas");c.width=512;c.height=256;const g=c.getContext("2d");g.fillStyle="#F6F1EC";g.fillRect(0,0,512,256);
  for(let y=0;y<256;y+=32)for(let x=(y/32)%2?-32:0;x<512;x+=64){g.fillStyle="#FFFFFF";g.fillRect(x+2,y+2,60,28);g.fillStyle="rgba(214,196,190,.35)";g.fillRect(x+2,y+28,60,2)}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,3);t.anisotropy=8;return t})();
 const woodTex=(()=>{const c=document.createElement("canvas");c.width=512;c.height=512;const g=c.getContext("2d");for(let i=0;i<8;i++){g.fillStyle=["#E6CDAE","#E1C6A4","#EAD3B6","#DDBF9C"][i%4];g.fillRect(0,i*64,512,64);g.fillStyle="rgba(150,110,70,.12)";g.fillRect(0,i*64,512,2);
   for(let k=0;k<6;k++){g.strokeStyle="rgba(150,110,70,.10)";g.beginPath();g.moveTo(0,i*64+10+k*9);g.bezierCurveTo(170,i*64+4+k*9,340,i*64+18+k*9,512,i*64+8+k*9);g.stroke()}}
   const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2,1);t.anisotropy=8;return t})();
 const floor=rb(4.6,.12,2.3,.05,new THREE.MeshPhysicalMaterial({map:woodTex,roughness:.6,clearcoat:.4}),scene,.8,-.06,.45);floor.castShadow=false;
 const wall=mesh(new THREE.BoxGeometry(4.6,2.7,.08),new THREE.MeshStandardMaterial({map:tileTex,roughness:.5}),scene,.8,1.35,-.72);wall.castShadow=false;
 rb(4.62,.06,.12,.02,M("#E9DED6"),scene,.8,2.73,-.7);
 // a window above the bench with a soft sky behind
 const win=new THREE.Group();win.position.set(.95,1.75,-.67);scene.add(win);
 rb(.9,.7,.05,.02,M("#FFFFFF",{r:.3}),win,0,0,0);
 const sky=mesh(new THREE.PlaneGeometry(.78,.58),new THREE.MeshBasicMaterial({color:"#BFDDF5",toneMapped:false}),win,0,0,.03);sky.castShadow=false;
 mesh(new THREE.SphereGeometry(.06,16,12),new THREE.MeshBasicMaterial({color:"#FFE7A8",toneMapped:false}),win,.22,.14,.035);
 [-.15,.18].forEach(x=>{const h=mesh(new THREE.ConeGeometry(.16,.18,5),new THREE.MeshBasicMaterial({color:"#9FC79A",toneMapped:false}),win,x,-.2,.035);h.scale.z=.1});
 rb(.03,.62,.04,.01,M("#FFFFFF"),win,0,0,.045);rb(.82,.03,.04,.01,M("#FFFFFF"),win,0,0,.045);
 rb(1,.04,.14,.01,M("#FFFFFF"),win,0,-.37,.06);
 // a pendant over the bench, warm and glowing
 mesh(new THREE.CylinderGeometry(.006,.006,.55,6),M("#3A2A33"),scene,.95,2.45,.1);
 const shade=mesh(new THREE.ConeGeometry(.17,.16,24,1,true),M("#F3B8C8",{r:.5}),scene,.95,2.12,.1);shade.material.side=THREE.DoubleSide;
 mesh(new THREE.SphereGeometry(.05,16,12),new THREE.MeshStandardMaterial({color:"#FFF1D0",emissive:"#FFE2A0",emissiveIntensity:2}),scene,.95,2.05,.1);
 const pl=new THREE.PointLight("#FFD9A0",1.4,3,1.5);pl.position.set(.95,2.0,.15);scene.add(pl);
 // a potted plant by the pantry and a little herb pot on the bench
 const pot=new THREE.Group();pot.position.set(2.85,0,.55);scene.add(pot);
 mesh(new THREE.CylinderGeometry(.15,.11,.28,20),M("#E39E80",{r:.6}),pot,0,.14,0);
 for(let i=0;i<7;i++){const a=i/7*Math.PI*2;const lf=mesh(new THREE.SphereGeometry(.09,10,8),M("#6FAE6A",{r:.7,cc:0}),pot,Math.cos(a)*.1,.42+(i%3)*.08,Math.sin(a)*.1);lf.scale.set(.6,1.5,.35);lf.rotation.set(Math.sin(a)*.5,a,Math.cos(a)*.5)}
 const herb=new THREE.Group();herb.position.set(1.36,.92,-.18);scene.add(herb);mesh(new THREE.CylinderGeometry(.05,.04,.08,14),M("#FFFFFF",{r:.4}),herb,0,.04,0);
 for(let i=0;i<5;i++)mesh(new THREE.SphereGeometry(.03,8,6),M("#5FA34F",{r:.7,cc:0}),herb,Math.cos(i*1.3)*.025,.1+i%2*.02,Math.sin(i*1.3)*.025);}
const FRESH={today:"#E56B79",week:"#E7A64A",fine:"#6CC390"};
const fruitBall=(c,r=.055)=>{const g=new THREE.Group();mesh(new THREE.SphereGeometry(r,20,16),M(c,{r:.35,cc:.8}),g,0,r,0);mesh(new THREE.CylinderGeometry(.005,.005,.025,6),M("#7A5A3A"),g,0,2*r+.008,0);return g};
const pile=(n,make,sp=.075)=>{const g=new THREE.Group();for(let i=0;i<n;i++){const o=make();o.position.set((i%3-1)*sp+(Math.floor(i/3)%2)*sp*.5,Math.floor(i/3)*sp*.75,((i*7)%3-1)*sp*.4);o.rotation.y=i*1.3;g.add(o)}return g};
const SHAPES={
 apples:()=>pile(5,()=>fruitBall("#D9545C")),oranges:()=>pile(5,()=>fruitBall("#F09A3E",.058)),
 kiwifruit:()=>pile(5,()=>{const g=new THREE.Group();const m=mesh(new THREE.SphereGeometry(.045,16,12),M("#8A6A45",{r:.9,cc:0}),g,0,.04,0);m.scale.set(1,.85,1.3);return g}),
 bananas:()=>{const g=new THREE.Group();for(let i=0;i<4;i++){const c=new THREE.QuadraticBezierCurve3(new THREE.Vector3(-.13,.07,0),new THREE.Vector3(0,-.02,0),new THREE.Vector3(.13,.07,0));const m=mesh(new THREE.TubeGeometry(c,16,.025,10),M("#F2CE4A",{r:.5}),g,0,.03,(i-1.5)*.035);m.rotation.x=(i-1.5)*.15}return g},
 strawberries:()=>{const g=new THREE.Group();rb(.2,.07,.14,.01,M("#BFE3F2",{glass:true,op:.6}),g,0,.035,0);for(let i=0;i<6;i++){const m=mesh(new THREE.ConeGeometry(.025,.045,10),M("#E0414F",{r:.4}),g,(i%3-1)*.055,.085,(Math.floor(i/3)-.5)*.05);m.rotation.x=Math.PI}return g},
 broccoli:()=>{const g=new THREE.Group();mesh(new THREE.CylinderGeometry(.022,.03,.09,8),M("#9BC77E"),g,0,.045,0);[[0,.12,0,.06],[.05,.1,.02,.045],[-.05,.1,-.01,.045],[.01,.1,.05,.045]].forEach(([x,y,z,r])=>mesh(new THREE.SphereGeometry(r,12,10),M("#4E9A4E",{r:.8,cc:0}),g,x,y,z));return g},
 carrots:()=>{const g=new THREE.Group();for(let i=0;i<4;i++){const m=mesh(new THREE.ConeGeometry(.02,.18,10),M("#F07F2E",{r:.5}),g,(i-1.5)*.045,.02,0);m.rotation.z=Math.PI/2;mesh(new THREE.ConeGeometry(.015,.05,6),M("#5FA34F"),g,(i-1.5)*.045+.11,.02,0).rotation.z=-Math.PI/2}return g},
 lettuce:()=>{const g=new THREE.Group();const m=mesh(new THREE.SphereGeometry(.09,16,12),M("#9ED37A",{r:.7,cc:.1}),g,0,.08,0);m.scale.y=.8;mesh(new THREE.SphereGeometry(.07,14,10),M("#C5E8A0",{r:.7}),g,0,.11,.01);return g},
 tomatoes:()=>pile(4,()=>{const g=fruitBall("#E5423B",.05);mesh(new THREE.ConeGeometry(.02,.012,5),M("#4E8C3E"),g,0,.104,0);return g}),
 courgettes:()=>{const g=new THREE.Group();for(let i=0;i<2;i++){const m=mesh(new THREE.CapsuleGeometry(.026,.16,6,12),M("#3F7F3F",{r:.4}),g,0,.03,(i-.5)*.06);m.rotation.z=Math.PI/2}return g},
 asparagus:()=>{const g=new THREE.Group();for(let i=0;i<7;i++){const m=mesh(new THREE.CylinderGeometry(.008,.01,.22,6),M("#6FA552"),g,(i%4-1.5)*.018,.11,(Math.floor(i/4)-.5)*.02)}mesh(new THREE.TorusGeometry(.04,.008,6,16),M("#C8574F"),g,0,.08,0).rotation.x=Math.PI/2;return g},
 potatoes:()=>pile(6,()=>{const g=new THREE.Group();const m=mesh(new THREE.SphereGeometry(.05,12,10),M("#C79A63",{r:.9,cc:0}),g,0,.04,0);m.scale.set(1.25,.85,1);return g},.085),
 milk:()=>{const g=new THREE.Group();rb(.11,.24,.11,.03,M("#FFFFFF",{r:.3}),g,0,.12,0);mesh(new THREE.CylinderGeometry(.025,.025,.04,12),M("#3A7BD5"),g,0,.26,0);rb(.112,.07,.112,.01,M("#7EB2EE"),g,0,.1,0);return g},
 eggs:()=>{const g=new THREE.Group();rb(.26,.05,.13,.01,M("#D9CBB8",{r:.9,cc:0}),g,0,.025,0);for(let i=0;i<6;i++){const m=mesh(new THREE.SphereGeometry(.024,12,10),M("#F3E2C8",{r:.5}),g,(i%3-1)*.075,.065,(Math.floor(i/3)-.5)*.055);m.scale.y=1.25}return g},
 cheese:()=>{const g=new THREE.Group();const s=new THREE.Shape();s.moveTo(0,0);s.lineTo(.16,0);s.lineTo(0,.1);s.closePath();const m=mesh(new THREE.ExtrudeGeometry(s,{depth:.07,bevelEnabled:true,bevelSize:.006,bevelThickness:.006,bevelSegments:2}),M("#F5C84B",{r:.5}),g,-.06,0,-.035);m.rotation.x=0;return g},
 butter:()=>{const g=new THREE.Group();rb(.15,.06,.08,.01,M("#F7E08A",{r:.4}),g,0,.03,0);rb(.152,.02,.082,.005,M("#ffffff"),g,0,.045,0);return g},
 bread:()=>{const g=new THREE.Group();rb(.26,.13,.13,.06,M("#C98A4B",{r:.7,cc:.1}),g,0,.065,0);for(let i=0;i<3;i++)mesh(new THREE.BoxGeometry(.012,.01,.1),M("#E8B98A"),g,(i-1)*.06,.13,0);return g},
 "beef mince":()=>{const g=new THREE.Group();rb(.2,.04,.13,.012,M("#2B2B33",{r:.6}),g,0,.02,0);const m=mesh(new THREE.SphereGeometry(.06,14,10),M("#C9606E",{r:.8,cc:0}),g,0,.04,0);m.scale.set(1.4,.4,.95);rb(.205,.012,.135,.004,M("#E9F4FA",{glass:true,op:.5}),g,0,.065,0);return g}};
const GROUP={fruit:"#E8688A",veg:"#6FB36A",vegetable:"#6FB36A",dairy:"#EDEFF5",meat:"#D46A78",seafood:"#7FB2D6",bakery:"#C98A4B",leftovers:"#B59BD6",drinks:"#7EB2EE",condiment:"#E3A65A",pantry:"#D9C3A0",frozen:"#BFDDF5"};
function makeFood(t){const key=(t.name||"").toLowerCase();let g=null;
  for(const k of Object.keys(SHAPES)){if(key===k||key.startsWith(k)||key.includes(k)){g=SHAPES[k]();break}}
  if(!g){g=new THREE.Group();const c=GROUP[t.group]||"#E5DDE2";rb(.15,.12,.11,.03,M(c,{r:.45}),g,0,.06,0);rb(.152,.035,.112,.01,M("#ffffff",{r:.5}),g,0,.085,0)}
  if(!t.have)g.traverse(o=>{if(o.isMesh){o.material=M("#B9979D",{glass:true,op:.28});o.castShadow=false}});
  // the eat-by ring, and a little beacon above it
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.085,.008,8,32),M(FRESH[t.fresh]||FRESH.fine,{glow:1.4,fresh:true}));ring.rotation.x=Math.PI/2;ring.position.y=.006;g.add(ring);
  g.userData={t,ring};return g}

// ---- slots: where each zone puts things (world coordinates)
const zoneSlots={
 fridge:{max:8,at:i=>[FX-.32+(i%4)*.21,i<4?SH[0]+.03:SH[1]+.03,-.08+(i%2)*.06]},
 crisper:{max:4,at:i=>[FX-.32+i*.21,.2,0]},
 door:{max:4,at:i=>[0,0,0]},   // placed on the door, see below
 bench:{max:6,at:i=>[BX-.38+(i%3)*.38,.92,-.14+Math.floor(i/3)*.26]},
 pantry:{max:6,at:i=>[PX-.27+(i%3)*.27,(i<3?PS[0]:PS[1])+.02,-.05]}};
let foods=[],labels=[];const tmp=new THREE.Vector3();
function pill(cls){const el=document.createElement("div");el.className="k3d-pill "+(cls||"");ov.appendChild(el);return el}
const zoneLbl=[["Fridge",()=>new THREE.Vector3(FX,FH+.12,.2)],["Crisper",()=>new THREE.Vector3(FX,.06,.45)],["Bench",()=>new THREE.Vector3(BX,.25,.4)],["Pantry · cool and dark",()=>new THREE.Vector3(PX,1.82,.1)]].map(([n,f])=>{const el=pill("zone");el.textContent=n;return {el,f}});
const headEl=pill("head");let sel=null;const selEl=pill();selEl.style.opacity=0;
function build(sceneData){foods.forEach(f=>f.g.parent&&f.g.parent.remove(f.g));foods=[];
  const filled={};(sceneData.tiles||[]).forEach((t,i)=>{const z=zoneSlots[t.where]?t.where:"fridge";const k=filled[z]||0;if(k>=zoneSlots[z].max)return;filled[z]=k+1;
    const g=makeFood(t);
    if(z==="door"){door.add(g);g.position.set(-.33+(k%4)*.22,[.42,1.0,1.55][Math.min(2,Math.floor(k/4))]+.08,-.09);g.scale.setScalar(.85)}
    else{const [x,y,zz]=zoneSlots[z].at(k);g.position.set(x,y,zz);scene.add(g)}
    g.rotation.y+=(i*0.7)%0.6-.3;g.scale.multiplyScalar(1.35);const f={g,t,born:performance.now()+(REDUCED?0:i*70),base:g.position.y};g.scale.multiplyScalar(REDUCED?1:.001);f.target=(z==="door"?.85:1)*1.35;foods.push(f)});
  headEl.innerHTML=`${sceneData.head||""}<small>${sceneData.sub||""}</small>`;sel=null;selEl.style.opacity=0}

// ---- picking: tap the fridge door to open or close it, tap a food for its name
const ray=new THREE.Raycaster(),ptr=new THREE.Vector2();let down=null;
canvas.addEventListener("pointerdown",e=>{down=[e.clientX,e.clientY]});
canvas.addEventListener("pointerup",e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>6)return;down=null;const r=canvas.getBoundingClientRect();
  ptr.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);ray.setFromCamera(ptr,camera);
  const hit=ray.intersectObjects([...foods.map(f=>f.g),door],true)[0];if(!hit){sel=null;selEl.style.opacity=0;return}
  let o=hit.object;while(o&&!o.userData.t&&o!==door)o=o.parent;
  if(o===door||!o){doorWant=doorWant?0:1;return}
  sel=foods.find(f=>f.g===o);const t=o.userData.t;selEl.innerHTML=`${t.name}<small>${t.have?{today:"eat in the first few days",week:"eat this week",fine:"plenty of time"}[t.fresh]:"on the shopping list"}</small>`;selEl.style.opacity=1;hint.classList.add("gone")});

// ---- theme: the page has a dark mode; the shadows and the interior glow follow it
function theme(){const dark=getComputedStyle(document.documentElement).getPropertyValue("--paper").trim().toLowerCase()==="#150912";
  ground.material.opacity=dark?.5:.22;hemi.intensity=dark?.3:.45;scene.environmentIntensity=dark?.42:.55}
theme();matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change",theme);

// ---- loop
function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  const portrait=w/h<1.05;camera.fov=portrait?38:30;camera.updateProjectionMatrix();
  // on narrow screens step back so the open door and the pantry both stay in frame
  const want=portrait||w<560?9.3:7.6,d=camera.position.distanceTo(controls.target);camera.position.sub(controls.target).multiplyScalar(want/d).add(controls.target)}
new ResizeObserver(resize).observe(host);resize();
let visible=true;new IntersectionObserver(es=>visible=es[0].isIntersecting).observe(host);
const clock=new THREE.Clock();
function place(el,v,dx=0,dy=0){tmp.copy(v).project(camera);if(tmp.z>1){el.style.transform="translate(-9999px,0)";return}
  const w=host.clientWidth,h=host.clientHeight,bw=el.offsetWidth,bh=el.offsetHeight;let x=(tmp.x*.5+.5)*w-bw/2+dx,y=(-tmp.y*.5+.5)*h-bh/2+dy;
  x=Math.max(4,Math.min(w-bw-4,x));y=Math.max(4,Math.min(h-bh-4,y));el.style.transform=`translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`}
function frame(){requestAnimationFrame(frame);if(!visible||document.hidden){clock.getDelta();return}
  const dt=Math.min(.05,clock.getDelta()),t=clock.elapsedTime,now=performance.now();
  doorOpen+=(doorWant-doorOpen)*(REDUCED?1:Math.min(1,dt*3.2));doorPivot.rotation.y=-doorOpen*1.95;fl.intensity=3.2*doorOpen;inner.material.emissiveIntensity=.08+.3*doorOpen;
  for(const f of foods){const a=Math.max(0,Math.min(1,(now-f.born)/500));const k=a<1?1+Math.sin(a*Math.PI)*.18*(1-a):1;const s=Math.max(.001,f.target*(a<1?a*k:1));f.g.scale.setScalar(s);
    f.g.position.y=f.base+(a<1?(1-a)*(1-a)*.25:0);
    const ring=f.g.userData.ring;if(f.t.fresh==="today"&&!REDUCED){ring.material.emissiveIntensity=1.4+Math.sin(t*4)*.9;ring.scale.setScalar(1+Math.sin(t*4)*.06)}
    if(f===sel){f.g.position.y=f.base+.03+Math.sin(t*6)*.01}}
  controls.update();renderer.render(scene,camera);
  zoneLbl.forEach(z=>place(z.el,z.f()));place(headEl,new THREE.Vector3(.8,2.62,-.6));
  if(sel)place(selEl,sel.g.getWorldPosition(tmp.clone()).add(new THREE.Vector3(0,.32,0)))}
if(window.__kitchenScene)build(window.__kitchenScene);
addEventListener("kitchen:scene",e=>build(e.detail));
// open the door on first view, so the reveal is the first thing that happens
doorWant=0;setTimeout(()=>{doorWant=1},REDUCED?0:500);
frame();
}
