/* Shaky Isles: a 3D pop-up book for NCEA Level 2 Earth and Space Science 91191 (causes of extreme Earth events in NZ).
   A chunky pop-up book floats in a toy-box world at golden hour. Each lesson is a spread: the lesson on the left page,
   a model that pops up on the right. Every lesson runs Predict → Test → Prove and earns two stars.
   Look: toon shading with bold outlines, saturated colours per lesson, glowing heat (bloom), drifting clouds.
   "Comic view" in the dock adds screen-space hatching in the shadows. Models are deterministic and simplified;
   numbers on screen come from each lesson's small model (labelled "model") or from published figures (cited in Prove). */
import * as THREE from "three";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import {RoundedBoxGeometry} from "three/addons/geometries/RoundedBoxGeometry.js";
import {EffectComposer} from "three/addons/postprocessing/EffectComposer.js";
import {RenderPass} from "three/addons/postprocessing/RenderPass.js";
import {UnrealBloomPass} from "three/addons/postprocessing/UnrealBloomPass.js";
import {OutputPass} from "three/addons/postprocessing/OutputPass.js";
import {LineSegments2} from "three/addons/lines/LineSegments2.js";
import {LineSegmentsGeometry} from "three/addons/lines/LineSegmentsGeometry.js";
import {LineMaterial} from "three/addons/lines/LineMaterial.js";
import {LESSONS} from "./lessons.js";

const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const RM=matchMedia("(prefers-reduced-motion: reduce)").matches;
const store={get(k,d){try{const v=localStorage.getItem(k);return v===null?d:v}catch(e){return d}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
const nzDay=t=>new Date(t).toLocaleDateString("en-CA",{timeZone:"Pacific/Auckland"});
// same log the study hub reads for streaks: {d, m, kind, t}
function logStudy(kind){try{const L=JSON.parse(store.get("studylog","[]"));L.push({d:nzDay(Date.now()),m:"shaky",kind,t:Date.now()});store.set("studylog",JSON.stringify(L.slice(-800)))}catch(e){}}
const done=new Set(JSON.parse(store.get("shakydone","[]")));
const saveDone=()=>store.set("shakydone",JSON.stringify([...done]));
const answers=JSON.parse(store.get("shakypredict","{}"));
const stars=()=>LESSONS.reduce((n,L)=>n+(answers[L.id]!=null?1:0)+(done.has(L.id)?1:0),0);

// ---------------------------------------------------------------- sound (quiet, after a tap, off by default)
let AC=null,soundOn=store.get("studysound","off")!=="off"&&store.get("shakysound","off")==="on";
function ac(){if(!AC){const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;AC=new C()}if(AC.state==="suspended")AC.resume();return AC}
function noise(dur,f0,f1,gain){if(!soundOn)return;const a=ac();if(!a)return;const n=a.sampleRate*dur,b=a.createBuffer(1,n,a.sampleRate),d=b.getChannelData(0);
  for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,1.4);const s=a.createBufferSource();s.buffer=b;
  const f=a.createBiquadFilter();f.type="lowpass";f.frequency.setValueAtTime(f0,a.currentTime);f.frequency.exponentialRampToValueAtTime(f1,a.currentTime+dur);
  const g=a.createGain();g.gain.value=gain;s.connect(f).connect(g).connect(a.destination);s.start()}
function notes(fs,gap,type){if(!soundOn)return;const a=ac();if(!a)return;fs.forEach((f,i)=>{const o=a.createOscillator(),g=a.createGain(),t=a.currentTime+i*gap;o.type=type||"triangle";o.frequency.value=f;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.06,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.45);o.connect(g).connect(a.destination);o.start(t);o.stop(t+.5)})}
const sfx={flip:()=>noise(.35,3200,700,.06),rumble:()=>noise(2.4,180,40,.5),boom:()=>noise(1.6,900,60,.4),pop:()=>notes([880+Math.random()*300],0,"sine"),
  win:()=>notes([523,659,784,1047],.08),star:()=>notes([784,1175],.07),wave:()=>noise(3.5,600,90,.25)};

// ---------------------------------------------------------------- renderer and world
const canvas=$("gl"),stage=$("stage");
let renderer=null;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:"high-performance"});}catch(e){renderer=null}
if(!renderer){$("nogl").hidden=false;$("hint").hidden=true}
const PX={value:Math.min(window.devicePixelRatio||1,2)};
if(renderer){renderer.setPixelRatio(PX.value);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NeutralToneMapping||THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;renderer.localClippingEnabled=true}
const scene=new THREE.Scene();
const HORIZON=new THREE.Color(0xc4e6ff);
scene.fog=new THREE.Fog(HORIZON,18,40);
const camera=new THREE.PerspectiveCamera(34,1,.05,90);
camera.position.set(1.4,6,7);
let controls=null;
if(renderer){controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.08;controls.minDistance=2.2;controls.maxDistance=15;
  controls.maxPolarAngle=1.36;controls.minPolarAngle=.12;controls.screenSpacePanning=false;controls.rotateSpeed=.7;
  controls.addEventListener("start",()=>{$("hint").classList.add("gone");camTween=null})}

// sky: a gradient dome from clear blue to a peach horizon
const sky=new THREE.Mesh(new THREE.SphereGeometry(60,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,
  uniforms:{top:{value:new THREE.Color(0x4aa8ee)},mid:{value:new THREE.Color(0xffd6c2)},bot:{value:HORIZON}},
  vertexShader:"varying vec3 vp;void main(){vp=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vp,1.);}",
  fragmentShader:"uniform vec3 top,mid,bot;varying vec3 vp;void main(){float h=normalize(vp).y;vec3 c=h>.18?mix(mid,top,smoothstep(.18,.75,h)):mix(bot,mid,smoothstep(-.05,.18,h));gl_FragColor=vec4(c,1.);}"}));
scene.add(sky);
// ground: a warm round mat that melts into the horizon
function groundTex(){const c=document.createElement("canvas");c.width=c.height=1024;const g=c.getContext("2d");
  const gr=g.createRadialGradient(512,512,40,512,512,512);gr.addColorStop(0,"#eef8ff");gr.addColorStop(.5,"#d6eeff");gr.addColorStop(1,"#c4e6ff");g.fillStyle=gr;g.fillRect(0,0,1024,1024);
  g.fillStyle="rgba(255,255,255,.75)";for(let y=16;y<1024;y+=32)for(let x=16+(y/32%2)*16;x<1024;x+=32){const d=Math.hypot(x-512,y-512);if(d<470){g.beginPath();g.arc(x,y,2.4,0,7);g.fill()}}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t}
const ground=new THREE.Mesh(new THREE.CircleGeometry(30,64),new THREE.MeshLambertMaterial({map:groundTex()}));
ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);

// light: warm low sun from the upper left, cool sky fill
scene.add(new THREE.HemisphereLight(0xcfeaff,0xffc9a3,1.05));
const sun=new THREE.DirectionalLight(0xfff0d8,1.75);sun.position.set(-5,9,4);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:1,far:25});sun.shadow.bias=-.0004;sun.shadow.normalBias=.02;
scene.add(sun);scene.add(sun.target);

// ---------------------------------------------------------------- materials: toon colour, bold outlines, optional comic hatching, glow
export const HATCH={value:0};
const GRAD=(()=>{const d=new Uint8Array([70,140,205,255]);const t=new THREE.DataTexture(d,4,1,THREE.RedFormat);t.minFilter=t.magFilter=THREE.NearestFilter;t.needsUpdate=true;return t})();
const matCache=new Map();
export function sketch(color,o={}){
  const key=[color,o.opacity||1,o.side||0,o.glow||0,o.flat?1:0].join("|");
  if(!o.fresh&&matCache.has(key))return matCache.get(key);
  const op=o.opacity||1;
  const m=new THREE.MeshToonMaterial({color,gradientMap:GRAD,transparent:op<1,opacity:op,side:o.side||THREE.FrontSide,depthWrite:op>=1,
    emissive:o.glow?color:0x000000,emissiveIntensity:o.glow||0});
  m.onBeforeCompile=sh=>{sh.uniforms.uHatch=HATCH;sh.uniforms.uPx=PX;
    sh.fragmentShader=sh.fragmentShader.replace("#include <common>","#include <common>\nuniform float uHatch;uniform float uPx;\nfloat hl(float v,float w){float f=abs(fract(v)-.5);return 1.-smoothstep(w-.06,w+.06,f);}")
    .replace("#include <dithering_fragment>",`#include <dithering_fragment>
      vec2 q=gl_FragCoord.xy/(uPx*5.);
      float lum=dot(gl_FragColor.rgb,vec3(.299,.587,.114));
      float ink=hl(q.x+q.y,.08)*smoothstep(.7,.45,lum);
      ink=max(ink,hl(q.x-q.y,.08)*smoothstep(.45,.25,lum));
      gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(.16,.13,.25),ink*.5*uHatch);`)};
  m.customProgramCacheKey=()=>"toon";
  if(!o.fresh)matCache.set(key,m);
  return m;
}
const LINE=new LineMaterial({color:0x2a2140,linewidth:2.1,transparent:true,opacity:.92});
const LINE_SOFT=new LineMaterial({color:0x2a2140,linewidth:1.3,transparent:true,opacity:.55});
export function edges(m,th=30,soft){const g=new LineSegmentsGeometry().fromEdgesGeometry(new THREE.EdgesGeometry(m.geometry,th));const e=new LineSegments2(g,soft?LINE_SOFT:LINE);e.raycast=()=>{};m.add(e);return m}
export function mesh(geo,color,o={}){const m=new THREE.Mesh(geo,o.mat||sketch(color,o));m.castShadow=o.cast!==false;m.receiveShadow=o.receive!==false;if(o.edges!==false)edges(m,o.th,o.soft);return m}
export function flatMat(color,o={}){const m=new THREE.MeshBasicMaterial({color,transparent:true,opacity:o.opacity??1,side:THREE.DoubleSide,depthWrite:o.depthWrite??false});if(o.glow)m.color.multiplyScalar(o.glow);return m}

// clouds drifting around the book
const clouds=new THREE.Group();scene.add(clouds);
{const cm=sketch(0xffffff,{fresh:true}),R=(()=>{let s=4;return()=>(s=(s*16807)%2147483647)/2147483647})();
  for(let i=0;i<7;i++){const c=new THREE.Group();const n=4+Math.floor(R()*3);
    for(let k=0;k<n;k++){const r=.35+R()*.45;const p=new THREE.Mesh(new THREE.SphereGeometry(r,18,12),cm);p.position.set((k-n/2)*.5+R()*.2,R()*.25,R()*.3);p.scale.y=.75;p.castShadow=false;c.add(p)}
    const a=i/7*Math.PI*2+R(),rad=8+R()*4;c.position.set(Math.cos(a)*rad,2.6+R()*2.2,Math.sin(a)*rad-2);c.rotation.y=-a;c.userData.bob=R()*6;clouds.add(c)}}

// ---------------------------------------------------------------- book
const PAGE_W=3.0,PAGE_D=4.0,TOP=.36; // right page spans x 0.05..3.05, the model sits on y=TOP
const paperCol="#fffaf2";
function pageEdgeTex(){const c=document.createElement("canvas");c.width=512;c.height=64;const g=c.getContext("2d");g.fillStyle="#f6eee2";g.fillRect(0,0,512,64);
  for(let y=1;y<64;y+=2.6){g.fillStyle="rgba(160,120,120,.16)";g.fillRect(0,y,512,.8)}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
const edgeTex=pageEdgeTex();
function pageCanvas(){const c=document.createElement("canvas");c.width=1024;c.height=1366;return c}
const leftC=pageCanvas(),rightC=pageCanvas();
const leftT=new THREE.CanvasTexture(leftC),rightT=new THREE.CanvasTexture(rightC);
[leftT,rightT].forEach(t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8});
const book=new THREE.Group();scene.add(book);
const coverMat=sketch(0xf2603f,{fresh:true});
const cover=mesh(new RoundedBoxGeometry(6.56,.16,4.42,4,.06),0,{mat:coverMat,th:40});cover.position.set(0,.08,0);book.add(cover);
const spine=mesh(new THREE.CylinderGeometry(.13,.13,4.42,16,1,false,Math.PI,Math.PI),0,{mat:coverMat,th:50});spine.rotation.x=Math.PI/2;spine.position.set(0,.03,0);book.add(spine);
const ribbonMat=sketch(0x7b61ff,{fresh:true});const ribbon=mesh(new THREE.BoxGeometry(.12,.02,.9),0,{mat:ribbonMat,th:40});ribbon.position.set(.25,.17,2.55);ribbon.rotation.y=-.12;book.add(ribbon);
function pageBlock(x,tex){
  const side=new THREE.MeshLambertMaterial({map:edgeTex});
  const top=new THREE.MeshLambertMaterial({map:tex});
  const m=new THREE.Mesh(new THREE.BoxGeometry(PAGE_W,.22,PAGE_D),[side,side,top,side,side,side]);
  m.position.set(x,.14+.11,0);m.castShadow=true;m.receiveShadow=true;edges(m,30,true);book.add(m);return m}
pageBlock(-PAGE_W/2-.04,leftT);pageBlock(PAGE_W/2+.04,rightT);
const gutter=new THREE.Mesh(new THREE.PlaneGeometry(.5,PAGE_D),new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,map:(()=>{const c=document.createElement("canvas");c.width=64;c.height=4;const g=c.getContext("2d");const gr=g.createLinearGradient(0,0,64,0);gr.addColorStop(0,"rgba(120,60,80,0)");gr.addColorStop(.5,"rgba(120,60,80,.2)");gr.addColorStop(1,"rgba(120,60,80,0)");g.fillStyle=gr;g.fillRect(0,0,64,4);return new THREE.CanvasTexture(c)})()}));
gutter.rotation.x=-Math.PI/2;gutter.position.set(0,TOP+.002,0);book.add(gutter);

// page art: a bold lesson card on the left, a dotted plate with the caption on the right
const DISPLAY='"Fredoka", "Instrument Sans", system-ui, sans-serif',SANS='"Instrument Sans", system-ui, sans-serif';
function wrap(g,text,x,y,maxW,lh){const words=text.split(" ");let line="";for(const w of words){const t=line?line+" "+w:w;if(g.measureText(t).width>maxW&&line){g.fillText(line,x,y);y+=lh;line=w}else line=t}if(line)g.fillText(line,x,y);return y+lh}
function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
function star(g,cx,cy,r,fill,stroke){g.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr2=i%2?r*.45:r;g.lineTo(cx+Math.cos(a)*rr2,cy+Math.sin(a)*rr2)}g.closePath();if(fill){g.fillStyle=fill;g.fill()}g.lineWidth=6;g.strokeStyle=stroke;g.lineJoin="round";g.stroke()}
function paper(g,acc){g.fillStyle=paperCol;g.fillRect(0,0,1024,1366);g.fillStyle=acc+"22";for(let y=40;y<1366;y+=44)for(let x=40;x<1024;x+=44){g.beginPath();g.arc(x,y,2.6,0,7);g.fill()}}
function drawPages(L){const acc=L.acc;
  let g=leftC.getContext("2d");paper(g,acc);
  const gr=g.createLinearGradient(1024,0,880,0);gr.addColorStop(0,"rgba(120,60,80,.14)");gr.addColorStop(1,"rgba(120,60,80,0)");g.fillStyle=gr;g.fillRect(860,0,164,1366);
  g.fillStyle=acc;rr(g,96,96,330,64,32);g.fill();g.fillStyle="#fff";g.font=`600 30px ${DISPLAY}`;g.fillText("LESSON "+L.n+" OF "+LESSONS.length,126,140);
  g.fillStyle="#2a2140";g.beginPath();g.arc(196,330,104,0,7);g.fill();g.fillStyle=acc;g.beginPath();g.arc(186,320,104,0,7);g.fill();
  g.fillStyle="#fff";g.font=`700 150px ${DISPLAY}`;g.textAlign="center";g.fillText(String(L.n),186,372);g.textAlign="left";
  const got=[answers[L.id]!=null,done.has(L.id)];got.forEach((on,i)=>star(g,370+i*96,330,40,on?acc:null,"#2a2140"));
  g.fillStyle="#2a2140";g.font=`600 80px ${DISPLAY}`;let y=wrap(g,L.title,96,540,820,88);
  g.strokeStyle=acc;g.lineWidth=10;g.lineCap="round";g.beginPath();for(let x=0;x<=260;x+=4)g.lineTo(100+x,y-36+Math.sin(x/18)*8);g.stroke();
  g.fillStyle="#4b4662";g.font=`500 40px ${SANS}`;wrap(g,L.short,96,y+40,800,56);
  g.fillStyle="#9a92b0";g.font=`600 30px ${DISPLAY}`;g.fillText(String(L.n*2),96,1300);
  leftT.needsUpdate=true;
  g=rightC.getContext("2d");paper(g,acc);
  const gr2=g.createLinearGradient(0,0,150,0);gr2.addColorStop(0,"rgba(120,60,80,.14)");gr2.addColorStop(1,"rgba(120,60,80,0)");g.fillStyle=gr2;g.fillRect(0,0,160,1366);
  g.font=`600 32px ${DISPLAY}`;const w=g.measureText(L.fig).width;g.fillStyle="#fff";rr(g,140,1208,w+56,64,32);g.fill();g.strokeStyle=acc;g.lineWidth=4;g.stroke();
  g.fillStyle="#2a2140";g.fillText(L.fig,168,1252);
  g.fillStyle="#9a92b0";g.font=`600 22px ${SANS}`;g.fillText("SIMPLIFIED MODEL · NOT TO SCALE",150,1310);
  g.font=`600 30px ${DISPLAY}`;g.textAlign="right";g.fillText(String(L.n*2+1),930,1310);g.textAlign="left";
  rightT.needsUpdate=true}

// a turning page for lesson changes
const turnGeo=new THREE.PlaneGeometry(PAGE_W,PAGE_D,28,1);
const turnBase=turnGeo.attributes.position.array.slice();
const turn=new THREE.Mesh(turnGeo,new THREE.MeshLambertMaterial({color:paperCol,side:THREE.DoubleSide}));turn.castShadow=true;turn.visible=false;book.add(turn);
function setTurn(t,dir){const p=turnGeo.attributes.position.array;
  for(let i=0;i<p.length;i+=3){const u=turnBase[i]+PAGE_W/2+.04,z=-turnBase[i+1];
    let a=Math.PI*t-Math.sin(Math.PI*t)*.55*(u/PAGE_W);if(dir<0)a=Math.PI-a;
    p[i]=Math.cos(a)*u;p[i+1]=TOP+.004+Math.sin(a)*u;p[i+2]=z}
  turnGeo.attributes.position.needsUpdate=true;turnGeo.computeVertexNormals()}

// ---------------------------------------------------------------- post: bloom picks out anything hotter than white (magma, glowing lines)
let composer=null,bloom=null;
if(renderer){try{composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
  bloom=new UnrealBloomPass(new THREE.Vector2(256,256),1.1,.6,1.0);composer.addPass(bloom);composer.addPass(new OutputPass())}catch(e){console.warn('bloom off',e);composer=null}}
canvas.dataset.bloom=composer?"on":"off";

// ---------------------------------------------------------------- tiny tweens
const tweens=[];
function tween(dur,fn,done){const t={t0:performance.now(),dur:RM?1:dur*1000,fn,done};tweens.push(t);if(RM){fn(1);}return t}
const ease={out:t=>1-Math.pow(1-t,3),inout:t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2,back:t=>{const c=1.7;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2)}};
function runTweens(now){for(let i=tweens.length-1;i>=0;i--){const w=tweens[i],k=Math.min(1,(now-w.t0)/w.dur);w.fn(k);if(k>=1){tweens.splice(i,1);w.done&&w.done()}}}

// ---------------------------------------------------------------- labels in 3D (HTML, crisp, never in the a11y tree)
const tagLayer=$("tags");
class Tags{constructor(){this.list=[]}
  add(obj,html,o={}){const el=document.createElement("div");el.className="tag "+(o.cls||"");el.innerHTML=html;el.style.opacity="0";tagLayer.appendChild(el);
    const t={obj,el,off:new THREE.Vector3(...(o.off||[0,0,0])),show:true};this.list.push(t);return t}
  clear(){this.list.forEach(t=>t.el.remove());this.list=[]}}
const tags=new Tags();
const tmpV=new THREE.Vector3();
function placeTags(alpha){const w=stage.clientWidth,h=stage.clientHeight;
  for(const t of tags.list){let o=t.obj,vis=true;while(o){if(!o.visible||o.scale.y<.3){vis=false;break}o=o.parent}
    if(!t.show||!vis||alpha<.05){t.el.style.opacity="0";continue}
    t.obj.updateWorldMatrix(true,false);tmpV.copy(t.off).applyMatrix4(t.obj.matrixWorld).project(camera);
    if(tmpV.z>1||Math.abs(tmpV.x)>1.15||Math.abs(tmpV.y)>1.15){t.el.style.opacity="0";continue}
    const x=(tmpV.x*.5+.5)*w,y=(-tmpV.y*.5+.5)*h;
    t.el.style.transform=`translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,calc(-100% - 8px))`;t.el.style.opacity=String(alpha)}}

// ---------------------------------------------------------------- pop-up: parts spring up off the page, one after another
const pops=[];
export function pop(obj,delay=0){obj.userData.pop={delay,base:obj.scale.clone()};pops.push(obj);return obj}
function popIn(list,cb){let n=0;list.forEach(o=>{const p=o.userData.pop;o.scale.set(p.base.x,.001,p.base.z);o.visible=true;
  setTimeout(()=>{sfx.pop();tween(.75,k=>{const e=ease.back(k);o.scale.set(p.base.x*(.85+.15*Math.min(1,e)),Math.max(.001,p.base.y*e),p.base.z*(.85+.15*Math.min(1,e)))},()=>{o.scale.copy(p.base);if(++n===list.length&&cb)cb()})},RM?0:p.delay*1000)});if(!list.length&&cb)cb()}
function popOut(list,cb){if(!list.length||RM){cb&&cb();return}let n=0;list.forEach(o=>{const p=o.userData.pop;tween(.32,k=>{o.scale.y=Math.max(.001,p.base.y*(1-ease.inout(k)))},()=>{if(++n===list.length&&cb)cb()})})}

// ---------------------------------------------------------------- celebration: confetti over the stage
const fx=$("fx"),fxg=fx.getContext("2d");let bits=[];
function confetti(n,x,y){if(RM)return;const r=stage.getBoundingClientRect();fx.width=r.width*PX.value;fx.height=r.height*PX.value;const cols=["#F2603F","#FF7A2F","#7B61FF","#12A386","#2F8FD8","#FF6FA8"];
  const cx=x??r.width/2,cy=y??r.height*.45;for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=4+Math.random()*7;bits.push({x:cx,y:cy,vx:Math.cos(a)*s,vy:Math.sin(a)*s-6,r:Math.random()*6,vr:(Math.random()-.5)*.4,w:6+Math.random()*6,h:4+Math.random()*4,c:cols[i%cols.length],life:1.6+Math.random()*.6})}}
function stepFx(dt){if(!bits.length)return;fxg.setTransform(PX.value,0,0,PX.value,0,0);fxg.clearRect(0,0,fx.width,fx.height);
  bits=bits.filter(b=>(b.life-=dt)>0);for(const b of bits){b.vy+=22*dt;b.x+=b.vx*60*dt*.5;b.y+=b.vy*60*dt*.5;b.vx*=.985;b.r+=b.vr;fxg.save();fxg.translate(b.x,b.y);fxg.rotate(b.r);fxg.globalAlpha=Math.min(1,b.life);fxg.fillStyle=b.c;fxg.fillRect(-b.w/2,-b.h/2,b.w,b.h);fxg.restore()}
  if(!bits.length)fxg.clearRect(0,0,fx.width,fx.height)}

// Allen, the study dachshund from the hub, cheers you on (if the study kit is on the page)
let allen=null;try{if(window.StudyKit&&StudyKit.companion)allen=StudyKit.companion($("allenSpot"))}catch(e){allen=null}
const say=(html,ms)=>{try{allen&&allen.speak(html,ms)}catch(e){}};
const cheer=ok=>{try{allen&&allen.react(ok)}catch(e){}};

// ---------------------------------------------------------------- the context each lesson builds against
const shake={amp:0,t:0};
const ctx={THREE,sketch,mesh,edges,flatMat,pop,HATCH,TOP,
  tag:(obj,html,o)=>tags.add(obj,html,o),
  sfx,
  shake:(amp,dur)=>{if(RM)return;shake.amp=amp;shake.t=dur},
  refresh:()=>renderReadouts(),
  pass:(msg)=>pass(msg),
  live:(msg)=>{$("live").textContent=msg},
  focus:(pos,target,dur)=>flyTo(pos,target,dur),
  rm:RM};

// ---------------------------------------------------------------- lessons
let cur=-1,api=null,group=null,lessonPops=[],tab="predict",tagAlpha=0,busy=false;
// how far to pull the camera back for this stage shape: closer on small screens (the model sits on the right page), further on tall ones
function camK(a){if(stage.clientWidth<600)return a<.9?.62/a*.9:.62;return a<1.25?Math.min(1.9,1.2/a):1}
function viewFor(L){const a=stage.clientWidth/Math.max(1,stage.clientHeight);const v=L.view;
  const t=new THREE.Vector3(...v.target),p=new THREE.Vector3(...v.pos);const d=p.clone().sub(t);if(stage.clientWidth<600)t.x+=(1.54-t.x)*.6;
  d.multiplyScalar(camK(a));return {pos:t.clone().add(d),target:t}}
let camTween=null;
function flyTo(pos,target,dur=1.4){if(!controls)return;const p0=camera.position.clone(),t0=controls.target.clone();
  const v=viewFor({view:{pos,target}});
  camTween=tween(dur,k=>{const e=ease.inout(k);camera.position.lerpVectors(p0,v.pos,e);controls.target.lerpVectors(t0,v.target,e)},()=>camTween=null)}

const onAcc=hex=>{const c=new THREE.Color(hex),lin=v=>v,L=.2126*lin(c.r)+.7152*lin(c.g)+.0722*lin(c.b);return (1.05/(L+.05))>=(L+.05)/.069?"#ffffff":"#2a2140"};
function setAccent(L){document.documentElement.style.setProperty("--acc",L.acc);document.documentElement.style.setProperty("--onacc",onAcc(L.acc));document.documentElement.style.setProperty("--accsoft",L.acc+"22");
  const c0=coverMat.color.clone(),c1=new THREE.Color(L.acc);tween(.8,k=>coverMat.color.lerpColors(c0,c1,k));
  const r0=ribbonMat.color.clone(),r1=new THREE.Color(L.acc2||"#7b61ff");tween(.8,k=>ribbonMat.color.lerpColors(r0,r1,k))}
function build(i){const L=LESSONS[i];
  group=new THREE.Group();group.position.set(PAGE_W/2+.04,TOP,0);book.add(group);
  pops.length=0;
  api=L.build(group,ctx);
  lessonPops=pops.slice();lessonPops.forEach(o=>{o.visible=false});
  drawPages(L)}
function teardown(){if(!group)return;book.remove(group);group.traverse(o=>{if(o.geometry)o.geometry.dispose()});group=null;tags.clear();api&&api.dispose&&api.dispose();api=null}
function flash(L){const f=$("flash");if(RM){f.hidden=true;return}f.innerHTML=`<span>Lesson ${L.n}</span><b>${esc(L.title)}</b>`;f.hidden=false;f.classList.remove("go");void f.offsetWidth;f.classList.add("go");setTimeout(()=>{f.hidden=true},2300)}

function go(i,first){if(busy||i<0||i>=LESSONS.length||i===cur)return;busy=true;const dir=i>cur?1:-1;
  setPlaying(false);
  const next=()=>{teardown();cur=i;store.set("shakylesson",String(i));const L=LESSONS[i];setAccent(L);build(i);
    const v=viewFor(L);
    if(first&&controls){camera.position.copy(v.pos);controls.target.copy(v.target)}else flyTo(L.view.pos,L.view.target,1.6);
    popIn(lessonPops,()=>{busy=false});tagAlpha=0;flash(L);
    renderSheet();ctx.live(`Lesson ${L.n}: ${L.title}`);
    canvas.setAttribute("aria-label",`Lesson ${L.n} model: ${L.alt}`);
    setTimeout(()=>say(answers[L.id]==null?`Lesson ${L.n}! Make your <b>prediction</b> first, then we test it.`:`Back to lesson ${L.n}. Try the <b>challenge</b>!`,4200),first?1200:900)};
  if(first||!group){next();return}
  popOut(lessonPops,()=>{sfx.flip();turn.visible=true;tagAlpha=0;
    tween(.9,k=>setTurn(ease.inout(k),dir),()=>{turn.visible=false});
    setTimeout(next,RM?0:450)})}

// ---------------------------------------------------------------- the sheet: predict, test, prove
function setTab(t,focus){tab=t;document.querySelectorAll(".tabs [role=tab]").forEach(b=>{const on=b.dataset.tab===t;b.setAttribute("aria-selected",on);b.tabIndex=on?0:-1;if(on&&focus)b.focus()});renderPane()}
document.querySelectorAll(".tabs [role=tab]").forEach((b,n,all)=>{b.onclick=()=>setTab(b.dataset.tab);
  b.onkeydown=e=>{const i=[...all].indexOf(b);let j=null;if(e.key==="ArrowRight")j=(i+1)%all.length;if(e.key==="ArrowLeft")j=(i+all.length-1)%all.length;if(e.key==="Home")j=0;if(e.key==="End")j=all.length-1;
    if(j!==null){e.preventDefault();setTab(all[j].dataset.tab,true)}}});
function renderStars(){const n=stars();$("starCount").textContent=n;$("starBox").setAttribute("aria-label",`${n} of ${LESSONS.length*2} stars`);
  const L=LESSONS[cur];if(!L)return;$("lessonStars").innerHTML=[answers[L.id]!=null,done.has(L.id)].map((on,i)=>`<i class="${on?"on":""}" title="${i?"Challenge":"Prediction"}">★</i>`).join("")}
function renderSheet(){const L=LESSONS[cur];$("lesson-num").textContent=L.n;$("lesson-title").textContent=L.title;
  $("dockTitle").innerHTML=`<b>${L.n}</b> ${esc(L.title)}`;$("bPrev").disabled=cur===0;$("bNext").disabled=cur===LESSONS.length-1;
  renderStars();setTab(answers[L.id]==null?"predict":"test")}
function markTabs(){const L=LESSONS[cur];$("tab-predict").classList.toggle("done",answers[L.id]!=null);$("tab-test").classList.toggle("done",done.has(L.id));}
function earned(){renderStars();drawPages(LESSONS[cur]);const b=$("starBox");b.classList.remove("bump");void b.offsetWidth;b.classList.add("bump");sfx.star()}
function renderPane(){const L=LESSONS[cur],P=L.predict,pane=$("pane");markTabs();
  if(tab==="predict"){const a=answers[L.id];
    pane.innerHTML=`<h2>${esc(P.q)}</h2><p class="fine">Make your call before you touch the model. Being wrong is fine: it's how the next bit sticks.</p>
      <div class="opts" role="radiogroup" aria-label="Your prediction">${P.opts.map((o,n)=>`<button class="opt${a!=null?(n===P.a?" right":n===a?" wrong":""):""}" role="radio" aria-checked="${a===n}" data-n="${n}"><b>${"ABC"[n]}</b><span>${esc(o)}</span></button>`).join("")}</div>
      ${a!=null?`<div class="note ${a===P.a?"ok":"no"}"><b>${a===P.a?"Good call!":"Not quite, and that's useful."}</b> ${esc(P.why)}</div><button class="kb primary" id="toTest">Now test it on the model →</button>`:""}`;
    pane.querySelectorAll(".opt").forEach(b=>b.onclick=()=>{const first=answers[L.id]==null;answers[L.id]=+b.dataset.n;store.set("shakypredict",JSON.stringify(answers));renderPane();
      const ok=+b.dataset.n===P.a;if(first){earned();if(ok){const r=b.getBoundingClientRect(),s=stage.getBoundingClientRect();confetti(40,Math.min(s.width-40,Math.max(40,r.left-s.left+40)),s.height*.6)}}cheer(ok);
      const f=pane.querySelector("#toTest");f&&f.focus()});
    const t=pane.querySelector("#toTest");if(t)t.onclick=()=>setTab("test",true)}
  else if(tab==="test"){
    pane.innerHTML=`<p class="lede">${esc(L.testIntro)}</p>${api.controls()}<div class="read" id="read" aria-live="off"></div>
      <div class="chal${done.has(L.id)?" done":""}" id="chal"><h3><span aria-hidden="true">★</span> Challenge</h3><p>${esc(L.challenge)}</p><div class="st" id="chalSt">${done.has(L.id)?"✓ Done! Pass it again any time.":""}</div></div>
      <button class="kb" id="toProve">Prove it: the explanation and exam line →</button>`;
    api.bind(pane);renderReadouts();pane.querySelector("#toProve").onclick=()=>setTab("prove",true)}
  else{
    pane.innerHTML=`${L.prove.map((p,n)=>n===0?`<p class="lede">${p}</p>`:`<p>${p}</p>`).join("")}
      <h3>In the exam</h3><div class="ladder">${L.exam.map((e,n)=>`<div><b>${["A","M","E"][n]}</b><span>${e}</span></div>`).join("")}</div>
      <p class="fine">A = Achieved (describe), M = Merit (explain how or why), E = Excellence (discuss, linking causes and effects).</p>
      ${L.kupu.length?`<h3>Kupu Māori</h3><div class="kupu">${L.kupu.map(k=>`<a href="https://maoridictionary.co.nz/word/${k.ta}" target="_blank" rel="noopener" title="Open in Te Aka Māori Dictionary"><b lang="mi">${esc(k.mi)}</b>${esc(k.en)}</a>`).join("")}</div>
      <p class="fine">Each kupu links to its Te Aka Māori Dictionary entry.${L.kupuNote?" "+esc(L.kupuNote):""}</p>`:""}
      <h3>Sources</h3><ul class="src">${L.sources.map(s=>`<li><a href="${s[1]}" target="_blank" rel="noopener">${esc(s[0])}</a></li>`).join("")}</ul>
      ${cur<LESSONS.length-1?`<button class="kb primary" id="toNext">Turn the page: ${esc(LESSONS[cur+1].title)} →</button>`:`<button class="kb primary" id="toExam">Open the exam room →</button>`}`;
    const n=pane.querySelector("#toNext");if(n)n.onclick=()=>go(cur+1);const x=pane.querySelector("#toExam");if(x)x.onclick=openExam}
  pane.scrollTop=0}
let lastRead="";
function renderReadouts(){const el=$("read");if(!el||!api||!api.readouts)return;const rows=api.readouts();
  const html=rows.map(r=>`<div><span>${esc(r[0])}</span><b class="${r[2]||""}">${esc(r[1])}</b></div>`).join("");if(html!==lastRead){el.innerHTML=html;lastRead=html}}
function pass(msg){const L=LESSONS[cur];const first=!done.has(L.id);done.add(L.id);saveDone();logStudy("pass");sfx.win();
  const c=$("chal"),s=$("chalSt");if(c){c.classList.add("done");s.textContent="✓ "+msg}markTabs();ctx.live("Challenge passed. "+msg);
  confetti(first?90:40);cheer(true);if(first)earned();
  if(first&&done.size===LESSONS.length)setTimeout(()=>{ctx.live("All five challenges done. Try the exam room.");say("All five challenges done! Try the <b>exam room</b>.",6000)},2500)}

// ---------------------------------------------------------------- dialogs: contents and exam room
const dlg=$("dlg");
function openDlg(html,onOpen){$("dlgBody").innerHTML=html;if(typeof dlg.showModal==="function")dlg.showModal();else dlg.setAttribute("open","");onOpen&&onOpen()}
function openContents(){openDlg(`<h2 id="dlg-h">Contents</h2><p class="fine">NCEA Level 2 Earth and Space Science 91191: the causes of extreme Earth events in New Zealand. Exam: Tuesday 1 December 2026, 9.30 am. You have <b>${stars()} of ${LESSONS.length*2}</b> stars.</p>
  <ol class="toc">${LESSONS.map((L,i)=>`<li><button data-i="${i}" style="--c:${L.acc}" ${i===cur?'aria-current="true"':""}><span class="n">${L.n}</span><span class="t">${esc(L.title)}<small>${esc(L.short)}</small></span><span class="d" aria-label="${(answers[L.id]!=null)+done.has(L.id)} of 2 stars">${[answers[L.id]!=null,done.has(L.id)].map(on=>`<i class="${on?"on":""}">★</i>`).join("")}</span></button></li>`).join("")}
  <li><button data-exam="1" style="--c:#2a2140"><span class="n">🎓</span><span class="t">Exam room<small>Practice questions with model answers</small></span><span class="d"></span></button></li></ol>`,
  ()=>{$("dlgBody").querySelectorAll("button[data-i]").forEach(b=>b.onclick=()=>{dlg.close();go(+b.dataset.i)});$("dlgBody").querySelector("[data-exam]").onclick=()=>{dlg.close();openExam()}})}
function openExam(){openDlg(`<h2 id="dlg-h">Exam room</h2><p class="fine">Questions in the style of 91191. Write your answer first (on paper or in your head), then open the model answer. Past papers and the official assessment schedules are on the <a href="https://www2.nzqa.govt.nz/ncea/subjects/past-exams-and-exemplars/earth-and-space-science/" target="_blank" rel="noopener">NZQA Earth and Space Science page</a>.</p>
  ${LESSONS.map(L=>`<div class="exam-q" style="--c:${L.acc}"><p><b>${L.n}.</b> ${esc(L.examQ)}</p><details><summary>Show an Excellence-level answer</summary><p class="fine" style="margin-top:8px">${L.examA}</p></details></div>`).join("")}
  <p class="fine">These are practice questions written for this book. They are not NZQA questions, and NZQA has not reviewed them.</p>`)}

// ---------------------------------------------------------------- dock
let playing=false;
function setPlaying(on){playing=on;$("bPlay").classList.toggle("playing",on);$("bPlay").setAttribute("aria-label",on?"Pause the model":"Run the model");api&&api.play&&api.play(on)}
$("bPrev").onclick=()=>go(cur-1);$("bNext").onclick=()=>go(cur+1);
$("bPlay").onclick=()=>{ac();if(tab!=="test")setTab("test");setPlaying(!playing)};
$("bContents").onclick=openContents;$("bExam").onclick=openExam;$("starBox").onclick=openContents;
const setSound=on=>{soundOn=on;store.set("shakysound",on?"on":"off");if(on)store.set("studysound","on");$("bSound").setAttribute("aria-pressed",on);$("bSound").setAttribute("aria-label",on?"Sound on":"Sound off")};
setSound(soundOn);$("bSound").onclick=()=>{setSound(!soundOn);if(soundOn){ac();sfx.pop()}};
const setComic=on=>{HATCH.value=on?1:0;store.set("shakycomic",on?"1":"0");$("bClean").setAttribute("aria-pressed",on)};
setComic(store.get("shakycomic","0")==="1");$("bClean").onclick=()=>setComic(HATCH.value===0);
$("sheetToggle").onclick=()=>{if(innerWidth>860)return;const s=$("sheet");s.classList.toggle("min");$("sheetToggle").setAttribute("aria-expanded",!s.classList.contains("min"));resize()};
addEventListener("keydown",e=>{if(e.target.closest("input,textarea,select,dialog"))return;if(e.key==="PageDown"||(e.key==="ArrowRight"&&e.altKey))go(cur+1);if(e.key==="PageUp"||(e.key==="ArrowLeft"&&e.altKey))go(cur-1)});

// ---------------------------------------------------------------- tap on the model (optional; every action also has a button)
const ray=new THREE.Raycaster(),ptr=new THREE.Vector2();let down=null;
canvas.addEventListener("pointerdown",e=>{down=[e.clientX,e.clientY]});
canvas.addEventListener("pointerup",e=>{if(!down||!group)return;const moved=Math.hypot(e.clientX-down[0],e.clientY-down[1]);down=null;if(moved>6)return;
  const r=canvas.getBoundingClientRect();ptr.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ptr,camera);
  const hit=ray.intersectObjects(group.children,true).find(h=>{let o=h.object;while(o){if(o.userData.onTap)return true;o=o.parent}return false});
  if(hit){let o=hit.object;while(!o.userData.onTap)o=o.parent;o.userData.onTap();ac()}});

// ---------------------------------------------------------------- size and loop
function resize(){const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();
  if(renderer){renderer.setSize(w,h,false);composer&&composer.setSize(w,h);bloom&&bloom.resolution.set(w*.5,h*.5)}
  LINE.resolution.set(w,h);LINE_SOFT.resolution.set(w,h)}
new ResizeObserver(resize).observe(stage);addEventListener("resize",resize);
let last=performance.now(),rt=0;
const camOff=new THREE.Vector3();
function loop(now){requestAnimationFrame(loop);const dt=Math.min(.05,(now-last)/1000);last=now;const t=now/1000;
  runTweens(now);
  if(api&&api.update)api.update(dt,t);
  if(!RM){clouds.rotation.y+=dt*.012;clouds.children.forEach(c=>{c.position.y+=Math.sin(t*.5+c.userData.bob)*.0012})}
  if(!busy)tagAlpha=Math.min(1,tagAlpha+dt*2.5);
  if(controls){controls.update();const tg=controls.target;tg.x=THREE.MathUtils.clamp(tg.x,-3,4);tg.z=THREE.MathUtils.clamp(tg.z,-2.5,2.5);tg.y=THREE.MathUtils.clamp(tg.y,0,2.5)}
  if(shake.t>0){shake.t-=dt;const a=shake.amp*Math.min(1,shake.t*2);camOff.set((Math.random()-.5)*a,(Math.random()-.5)*a,(Math.random()-.5)*a);camera.position.add(camOff)}else camOff.set(0,0,0);
  if(renderer){if(composer)composer.render(dt);else renderer.render(scene,camera)}
  if(shake.t>0)camera.position.sub(camOff);
  placeTags(tagAlpha);stepFx(dt);
  rt+=dt;if(rt>.12){rt=0;renderReadouts()}}

// fonts first, so the printed pages use the book's type
const qL=parseInt(new URLSearchParams(location.search).get("lesson"),10);
const startAt=Math.min(LESSONS.length-1,Math.max(0,qL>0?qL-1:(parseInt(store.get("shakylesson","0"),10)||0)));
logStudy("open");
Promise.race([Promise.all([document.fonts.load(`600 80px ${DISPLAY}`),document.fonts.load(`700 150px ${DISPLAY}`),document.fonts.load(`500 40px ${SANS}`)]),new Promise(r=>setTimeout(r,1500))])
  .finally(()=>{resize();go(startAt,true);requestAnimationFrame(loop);setTimeout(()=>$("hint").classList.add("gone"),6000)});
