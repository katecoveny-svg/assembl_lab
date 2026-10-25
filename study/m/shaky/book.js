/* Shaky Isles: a 3D pop-up book for NCEA Level 2 Earth and Space Science 91191 (causes of extreme Earth events in NZ).
   One open book on a desk. Each lesson is a spread: text on the left page, a paper model that pops up on the right.
   Every lesson runs Predict → Test → Prove. Models are deterministic and simplified; numbers on screen come from the
   small models in each lesson (labelled "model") or from published figures (cited in Prove). Pencil look: Lambert
   lighting with screen-space hatching in the shadows, plus graphite edges. */
import * as THREE from "three";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import {RoundedBoxGeometry} from "three/addons/geometries/RoundedBoxGeometry.js";
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

// ---------------------------------------------------------------- sound (quiet, after a tap, off by default)
let AC=null,soundOn=store.get("studysound","off")!=="off"&&store.get("shakysound","off")==="on";
function ac(){if(!AC){const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;AC=new C()}if(AC.state==="suspended")AC.resume();return AC}
function noise(dur,f0,f1,gain){if(!soundOn)return;const a=ac();if(!a)return;const n=a.sampleRate*dur,b=a.createBuffer(1,n,a.sampleRate),d=b.getChannelData(0);
  for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,1.4);const s=a.createBufferSource();s.buffer=b;
  const f=a.createBiquadFilter();f.type="lowpass";f.frequency.setValueAtTime(f0,a.currentTime);f.frequency.exponentialRampToValueAtTime(f1,a.currentTime+dur);
  const g=a.createGain();g.gain.value=gain;s.connect(f).connect(g).connect(a.destination);s.start()}
const sfx={flip:()=>noise(.35,3200,700,.06),rumble:()=>noise(2.4,180,40,.5),boom:()=>noise(1.6,900,60,.4),pop:()=>noise(.08,2400,1800,.05),
  win:()=>{if(!soundOn)return;const a=ac();if(!a)return;[523,659,784].forEach((f,i)=>{const o=a.createOscillator(),g=a.createGain();o.frequency.value=f;g.gain.setValueAtTime(0,a.currentTime+i*.09);g.gain.linearRampToValueAtTime(.05,a.currentTime+i*.09+.02);g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+i*.09+.4);o.connect(g).connect(a.destination);o.start(a.currentTime+i*.09);o.stop(a.currentTime+i*.09+.45)})},
  wave:()=>noise(3.5,600,90,.25)};

// ---------------------------------------------------------------- renderer
const canvas=$("gl"),stage=$("stage");
let renderer=null;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:"high-performance"});}catch(e){renderer=null}
if(!renderer){$("nogl").hidden=false;$("hint").hidden=true}
const PX={value:Math.min(window.devicePixelRatio||1,2)};
if(renderer){renderer.setPixelRatio(PX.value);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08}
const scene=new THREE.Scene();
scene.background=new THREE.Color(0xe7dfd0);
scene.fog=new THREE.Fog(0xe7dfd0,16,34);
const camera=new THREE.PerspectiveCamera(34,1,.05,80);
camera.position.set(1.4,6,7);
let controls=null;
if(renderer){controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.08;controls.minDistance=2.2;controls.maxDistance=15;
  controls.maxPolarAngle=1.36;controls.minPolarAngle=.12;controls.screenSpacePanning=false;controls.rotateSpeed=.7;
  controls.addEventListener("start",()=>{$("hint").classList.add("gone");camTween=null})}

// light: a window to the upper left, a soft sky fill
scene.add(new THREE.HemisphereLight(0xfffaf0,0xb9ad98,1.25));
const sun=new THREE.DirectionalLight(0xfff4e2,2.1);sun.position.set(-5,9,4);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:1,far:25});sun.shadow.bias=-.0004;sun.shadow.normalBias=.02;
scene.add(sun);scene.add(sun.target);

// ---------------------------------------------------------------- pencil materials
export const HATCH={value:1};
const matCache=new Map();
export function sketch(color,o={}){
  const key=[color,o.opacity||1,o.side||0,o.scale||5,o.flat?1:0,o.emissive||0].join("|");
  if(!o.fresh&&matCache.has(key))return matCache.get(key);
  const m=new THREE.MeshLambertMaterial({color,transparent:(o.opacity||1)<1,opacity:o.opacity||1,side:o.side||THREE.FrontSide,emissive:o.emissive||0x000000,depthWrite:(o.opacity||1)>=1,flatShading:!!o.flat});
  const sc=(o.scale||5).toFixed(1);
  m.onBeforeCompile=sh=>{sh.uniforms.uHatch=HATCH;sh.uniforms.uPx=PX;
    sh.fragmentShader=sh.fragmentShader.replace("#include <common>","#include <common>\nuniform float uHatch;uniform float uPx;\nfloat hl(float v,float w){float f=abs(fract(v)-.5);return 1.-smoothstep(w-.06,w+.06,f);}")
    .replace("#include <dithering_fragment>",`#include <dithering_fragment>
      vec2 q=gl_FragCoord.xy/(uPx*${sc});
      float lum=dot(gl_FragColor.rgb,vec3(.299,.587,.114));
      float ink=hl(q.x+q.y,.08)*smoothstep(.80,.56,lum);
      ink=max(ink,hl(q.x-q.y,.08)*smoothstep(.56,.36,lum));
      ink=max(ink,hl(q.y*1.41,.09)*smoothstep(.36,.16,lum));
      gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(.22,.2,.19),ink*.40*uHatch);`)};
  m.customProgramCacheKey=()=>"sk"+sc;
  if(!o.fresh)matCache.set(key,m);
  return m;
}
const EDGE=new THREE.LineBasicMaterial({color:0x332e2a,transparent:true,opacity:.78});
export function edges(m,th=30,mat){const e=new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry,th),mat||EDGE);e.raycast=()=>{};m.add(e);return m}
export function mesh(geo,color,o={}){const m=new THREE.Mesh(geo,o.mat||sketch(color,o));m.castShadow=o.cast!==false;m.receiveShadow=o.receive!==false;if(o.edges!==false)edges(m,o.th);return m}
export function flatMat(color,o={}){return new THREE.MeshBasicMaterial({color,transparent:true,opacity:o.opacity??1,side:THREE.DoubleSide,depthWrite:o.depthWrite??false})}

// ---------------------------------------------------------------- desk and book
const PAGE_W=3.0,PAGE_D=4.0,TOP=.36; // right page spans x 0.05..3.05, the model sits on y=TOP
function woodTexture(){const c=document.createElement("canvas");c.width=c.height=1024;const g=c.getContext("2d");
  g.fillStyle="#e4dac7";g.fillRect(0,0,1024,1024);
  for(let i=0;i<220;i++){const y=Math.random()*1024,a=.025+Math.random()*.05;g.strokeStyle=`rgba(120,95,60,${a})`;g.lineWidth=.6+Math.random()*2.4;g.beginPath();
    let x=0;g.moveTo(0,y);while(x<1024){x+=40;g.lineTo(x,y+Math.sin(x*.004+i)*6+Math.sin(x*.02+i*3)*1.5)}g.stroke()}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,3);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t}
const desk=new THREE.Mesh(new THREE.PlaneGeometry(60,60),new THREE.MeshLambertMaterial({map:woodTexture()}));
desk.rotation.x=-Math.PI/2;desk.receiveShadow=true;scene.add(desk);

const paperCol="#f8f5ee";
function pageEdgeTex(){const c=document.createElement("canvas");c.width=512;c.height=64;const g=c.getContext("2d");g.fillStyle="#efe9dd";g.fillRect(0,0,512,64);
  for(let y=1;y<64;y+=2.2){g.fillStyle=`rgba(110,95,75,${.08+Math.random()*.1})`;g.fillRect(0,y,512,.7)}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
const edgeTex=pageEdgeTex();
function pageCanvas(){const c=document.createElement("canvas");c.width=1024;c.height=1366;return c}
const leftC=pageCanvas(),rightC=pageCanvas();
const leftT=new THREE.CanvasTexture(leftC),rightT=new THREE.CanvasTexture(rightC);
[leftT,rightT].forEach(t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8});
const book=new THREE.Group();scene.add(book);
const cover=mesh(new RoundedBoxGeometry(6.5,.11,4.36,3,.04),0x2c5446,{th:40});cover.position.set(0,.055,0);book.add(cover);
const band=mesh(new THREE.BoxGeometry(6.52,.112,.16),0xb4532a,{edges:false});band.position.set(0,.055,1.9);book.add(band);
function pageBlock(x,tex){
  const side=new THREE.MeshLambertMaterial({map:edgeTex});
  const top=new THREE.MeshLambertMaterial({map:tex});
  const m=new THREE.Mesh(new THREE.BoxGeometry(PAGE_W,.25,PAGE_D),[side,side,top,side,side,side]);
  m.position.set(x,.11+.125,0);m.castShadow=true;m.receiveShadow=true;book.add(m);return m}
pageBlock(-PAGE_W/2-.04,leftT);pageBlock(PAGE_W/2+.04,rightT);
const gutter=new THREE.Mesh(new THREE.PlaneGeometry(.5,PAGE_D),new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,map:(()=>{const c=document.createElement("canvas");c.width=64;c.height=4;const g=c.getContext("2d");const gr=g.createLinearGradient(0,0,64,0);gr.addColorStop(0,"rgba(60,45,30,0)");gr.addColorStop(.5,"rgba(60,45,30,.22)");gr.addColorStop(1,"rgba(60,45,30,0)");g.fillStyle=gr;g.fillRect(0,0,64,4);const t=new THREE.CanvasTexture(c);return t})()}));
gutter.rotation.x=-Math.PI/2;gutter.position.set(0,TOP+.002,0);book.add(gutter);

// page art: the left page carries the lesson in print; the right page is a quiet plate with the figure caption
const SERIF='"Newsreader", Georgia, serif',SANS='"Instrument Sans", system-ui, sans-serif';
function wrap(g,text,x,y,maxW,lh){const words=text.split(" ");let line="";for(const w of words){const t=line?line+" "+w:w;if(g.measureText(t).width>maxW&&line){g.fillText(line,x,y);y+=lh;line=w}else line=t}if(line)g.fillText(line,x,y);return y+lh}
function paper(g){g.fillStyle=paperCol;g.fillRect(0,0,1024,1366);
  for(let i=0;i<5000;i++){g.fillStyle=`rgba(90,70,40,${Math.random()*.035})`;g.fillRect(Math.random()*1024,Math.random()*1366,1.4,1.4)}}
function drawPages(L){
  let g=leftC.getContext("2d");paper(g);
  const gr=g.createLinearGradient(1024,0,880,0);gr.addColorStop(0,"rgba(60,45,30,.16)");gr.addColorStop(1,"rgba(60,45,30,0)");g.fillStyle=gr;g.fillRect(860,0,164,1366);
  g.fillStyle="#7a7166";g.font=`600 26px ${SANS}`;g.fillText("SHAKY ISLES  ·  LESSON "+L.n+" OF "+LESSONS.length,96,130);
  g.fillStyle="#b4532a";g.font=`400 230px ${SERIF}`;g.fillText(String(L.n),84,370);
  g.fillStyle="#2a2521";g.font=`500 76px ${SERIF}`;let y=wrap(g,L.title,96,480,800,84);
  g.fillStyle="#4a433c";g.font=`italic 400 40px ${SERIF}`;y=wrap(g,L.short,96,y+30,780,56);
  g.strokeStyle="rgba(59,54,50,.35)";g.lineWidth=2;g.beginPath();g.moveTo(96,y+20);g.lineTo(300,y+20);g.stroke();
  g.fillStyle="#7a7166";g.font=`italic 400 30px ${SERIF}`;g.fillText(String(L.n*2),96,1300);
  leftT.needsUpdate=true;
  g=rightC.getContext("2d");paper(g);
  const gr2=g.createLinearGradient(0,0,150,0);gr2.addColorStop(0,"rgba(60,45,30,.16)");gr2.addColorStop(1,"rgba(60,45,30,0)");g.fillStyle=gr2;g.fillRect(0,0,160,1366);
  g.fillStyle="#7a7166";g.font=`italic 400 32px ${SERIF}`;g.fillText(L.fig,150,1250);
  g.font=`600 22px ${SANS}`;g.fillText("SIMPLIFIED MODEL · NOT TO SCALE",150,1300);
  g.font=`italic 400 30px ${SERIF}`;g.textAlign="right";g.fillText(String(L.n*2+1),930,1300);g.textAlign="left";
  rightT.needsUpdate=true}

// a turning page for lesson changes
const turnGeo=new THREE.PlaneGeometry(PAGE_W,PAGE_D,28,1);
const turnBase=turnGeo.attributes.position.array.slice();
const turnMat=new THREE.MeshLambertMaterial({color:paperCol,side:THREE.DoubleSide});
const turn=new THREE.Mesh(turnGeo,turnMat);turn.castShadow=true;turn.visible=false;book.add(turn);
function setTurn(t,dir){const p=turnGeo.attributes.position.array;
  for(let i=0;i<p.length;i+=3){const u=turnBase[i]+PAGE_W/2+.04,z=-turnBase[i+1];
    let a=Math.PI*t-Math.sin(Math.PI*t)*.55*(u/PAGE_W);if(dir<0)a=Math.PI-a;
    p[i]=Math.cos(a)*u;p[i+1]=TOP+.004+Math.sin(a)*u;p[i+2]=z}
  turnGeo.attributes.position.needsUpdate=true;turnGeo.computeVertexNormals()}

// ---------------------------------------------------------------- tiny tweens
const tweens=[];
function tween(dur,fn,done){const t={t0:performance.now(),dur:RM?1:dur*1000,fn,done};tweens.push(t);if(RM){fn(1);}return t}
const ease={out:t=>1-Math.pow(1-t,3),inout:t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2,back:t=>{const c=1.5;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2)}};
function runTweens(now){for(let i=tweens.length-1;i>=0;i--){const w=tweens[i],k=Math.min(1,(now-w.t0)/w.dur);w.fn(k);if(k>=1){tweens.splice(i,1);w.done&&w.done()}}}

// ---------------------------------------------------------------- labels in 3D (HTML, crisp, never in the a11y tree)
const tagLayer=$("tags");
class Tags{constructor(){this.list=[]}
  add(obj,html,o={}){const el=document.createElement("div");el.className="tag "+(o.cls||"");el.innerHTML=html;el.style.opacity="0";tagLayer.appendChild(el);
    const t={obj,el,off:new THREE.Vector3(...(o.off||[0,0,0])),show:true,fade:0};this.list.push(t);return t}
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

// ---------------------------------------------------------------- pop-up: parts fold up off the page, one after another
const pops=[];
export function pop(obj,delay=0){obj.userData.pop={delay,base:obj.scale.clone()};pops.push(obj);return obj}
function popIn(list,cb){let n=0;list.forEach(o=>{const p=o.userData.pop;o.scale.set(p.base.x,.001,p.base.z);o.visible=true;
  setTimeout(()=>{sfx.pop();tween(.7,k=>{const e=ease.back(k);o.scale.set(p.base.x,Math.max(.001,p.base.y*e),p.base.z)},()=>{if(++n===list.length&&cb)cb()})},RM?0:p.delay*1000)});if(!list.length&&cb)cb()}
function popOut(list,cb){if(!list.length||RM){cb&&cb();return}let n=0;list.forEach(o=>{const p=o.userData.pop;tween(.35,k=>{o.scale.y=Math.max(.001,p.base.y*(1-ease.inout(k)))},()=>{if(++n===list.length&&cb)cb()})})}

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
let cur=-1,api=null,group=null,lessonPops=[],tab="predict",picked=null,tagAlpha=0,busy=false;
const answers=JSON.parse(store.get("shakypredict","{}"));
function viewFor(L){const a=stage.clientWidth/Math.max(1,stage.clientHeight);const v=L.view;
  const t=new THREE.Vector3(...v.target),p=new THREE.Vector3(...v.pos);const d=p.clone().sub(t);if(stage.clientWidth<600)t.x+=(1.54-t.x)*.6;
  const k=camK(a);d.multiplyScalar(k);return {pos:t.clone().add(d),target:t}}
let camTween=null;
// how far to pull the camera back for this stage shape: closer on small screens (the model sits on the right page), further on tall ones
function camK(a){if(stage.clientWidth<600)return a<.9?.62/a*.9:.62;return a<1.25?Math.min(1.9,1.2/a):1}
function flyTo(pos,target,dur=1.4){if(!controls)return;const p0=camera.position.clone(),t0=controls.target.clone();
  const p1=new THREE.Vector3(...pos),t1=new THREE.Vector3(...target);
  const a=stage.clientWidth/Math.max(1,stage.clientHeight);{const d=p1.clone().sub(t1);if(stage.clientWidth<600)t1.x+=(1.54-t1.x)*.6;d.multiplyScalar(camK(a));p1.copy(t1).add(d)}
  camTween=tween(dur,k=>{const e=ease.inout(k);camera.position.lerpVectors(p0,p1,e);controls.target.lerpVectors(t0,t1,e)},()=>camTween=null)}

function build(i){const L=LESSONS[i];
  group=new THREE.Group();group.position.set(PAGE_W/2+.04,TOP,0);book.add(group);
  pops.length=0;
  api=L.build(group,ctx);
  lessonPops=pops.slice();lessonPops.forEach(o=>{o.visible=false});
  drawPages(L)}
function teardown(){if(!group)return;book.remove(group);group.traverse(o=>{if(o.geometry)o.geometry.dispose()});group=null;tags.clear();api&&api.dispose&&api.dispose();api=null}

function go(i,first){if(busy||i<0||i>=LESSONS.length||i===cur)return;busy=true;const dir=i>cur?1:-1;
  setPlaying(false);
  const next=()=>{teardown();cur=i;store.set("shakylesson",String(i));build(i);
    const L=LESSONS[i];const v=viewFor(L);
    if(first&&controls){camera.position.copy(v.pos);controls.target.copy(v.target)}else flyTo(L.view.pos,L.view.target,1.6);
    popIn(lessonPops,()=>{busy=false});tagAlpha=0;
    renderSheet();ctx.live(`Lesson ${L.n}: ${L.title}`);
    canvas.setAttribute("aria-label",`Lesson ${L.n} model: ${L.alt}`)};
  if(first||!group){next();return}
  popOut(lessonPops,()=>{sfx.flip();turn.visible=true;tagAlpha=0;
    tween(.9,k=>setTurn(ease.inout(k),dir),()=>{turn.visible=false});
    setTimeout(next,RM?0:450)})}

// ---------------------------------------------------------------- the sheet: predict, test, prove
function setTab(t,focus){tab=t;document.querySelectorAll(".tabs [role=tab]").forEach(b=>{const on=b.dataset.tab===t;b.setAttribute("aria-selected",on);b.tabIndex=on?0:-1;if(on&&focus)b.focus()});renderPane()}
document.querySelectorAll(".tabs [role=tab]").forEach((b,n,all)=>{b.onclick=()=>setTab(b.dataset.tab);
  b.onkeydown=e=>{const i=[...all].indexOf(b);let j=null;if(e.key==="ArrowRight")j=(i+1)%all.length;if(e.key==="ArrowLeft")j=(i+all.length-1)%all.length;if(e.key==="Home")j=0;if(e.key==="End")j=all.length-1;
    if(j!==null){e.preventDefault();setTab(all[j].dataset.tab,true)}}});
function renderSheet(){const L=LESSONS[cur];$("lesson-num").textContent=L.n+".";$("lesson-title").textContent=L.title;
  $("dockTitle").innerHTML=`<b>${L.n}</b> ${esc(L.title)}`;$("bPrev").disabled=cur===0;$("bNext").disabled=cur===LESSONS.length-1;
  picked=answers[L.id]??null;setTab(picked===null?"predict":"test")}
function markTabs(){const L=LESSONS[cur];$("tab-predict").classList.toggle("done",answers[L.id]!=null);$("tab-test").classList.toggle("done",done.has(L.id));}
function renderPane(){const L=LESSONS[cur],P=L.predict,pane=$("pane");markTabs();
  if(tab==="predict"){const a=answers[L.id];
    pane.innerHTML=`<h2>${esc(P.q)}</h2><p class="fine">Make your call before you touch the model. There's no penalty for being wrong; it's how the next part sticks.</p>
      <div class="opts" role="radiogroup" aria-label="Your prediction">${P.opts.map((o,n)=>`<button class="opt${a!=null?(n===P.a?" right":n===a?" wrong":""):""}" role="radio" aria-checked="${a===n}" data-n="${n}"><b>${"ABC"[n]}</b><span>${esc(o)}</span></button>`).join("")}</div>
      ${a!=null?`<div class="note ${a===P.a?"ok":"no"}"><b>${a===P.a?"Good call.":"Not quite, and that's useful."}</b> ${esc(P.why)}</div><button class="btn primary" id="toTest">Now test it on the model →</button>`:""}`;
    pane.querySelectorAll(".opt").forEach(b=>b.onclick=()=>{answers[L.id]=+b.dataset.n;store.set("shakypredict",JSON.stringify(answers));renderPane();const f=pane.querySelector("#toTest");f&&f.focus()});
    const t=pane.querySelector("#toTest");if(t)t.onclick=()=>setTab("test",true)}
  else if(tab==="test"){
    pane.innerHTML=`<p class="lede">${esc(L.testIntro)}</p>${api.controls()}<div class="read" id="read" aria-live="off"></div>
      <div class="chal${done.has(L.id)?" done":""}" id="chal"><h3>Challenge</h3><p>${esc(L.challenge)}</p><div class="st" id="chalSt">${done.has(L.id)?"✓ Done. Pass it again any time.":""}</div></div>
      <button class="btn" id="toProve">Prove it: the explanation and exam line →</button>`;
    api.bind(pane);renderReadouts();pane.querySelector("#toProve").onclick=()=>setTab("prove",true)}
  else{
    pane.innerHTML=`${L.prove.map((p,n)=>n===0?`<p class="lede">${p}</p>`:`<p>${p}</p>`).join("")}
      <h3>In the exam</h3><div class="ladder">${L.exam.map((e,n)=>`<div><b>${["A","M","E"][n]}</b><span>${e}</span></div>`).join("")}</div>
      <p class="fine">A = Achieved (describe), M = Merit (explain how or why), E = Excellence (discuss, linking causes and effects).</p>
      ${L.kupu.length?`<h3>Kupu Māori</h3><div class="kupu">${L.kupu.map(k=>`<a href="https://maoridictionary.co.nz/word/${k.ta}" target="_blank" rel="noopener" title="Open in Te Aka Māori Dictionary"><b lang="mi">${esc(k.mi)}</b>${esc(k.en)}</a>`).join("")}</div>
      <p class="fine">Each kupu links to its Te Aka Māori Dictionary entry.${L.kupuNote?" "+esc(L.kupuNote):""}</p>`:""}
      <h3>Sources</h3><ul class="src">${L.sources.map(s=>`<li><a href="${s[1]}" target="_blank" rel="noopener">${esc(s[0])}</a></li>`).join("")}</ul>
      ${cur<LESSONS.length-1?`<button class="btn primary" id="toNext">Turn the page: ${esc(LESSONS[cur+1].title)} →</button>`:`<button class="btn primary" id="toExam">Open the exam room →</button>`}`;
    const n=pane.querySelector("#toNext");if(n)n.onclick=()=>go(cur+1);const x=pane.querySelector("#toExam");if(x)x.onclick=openExam}
  pane.scrollTop=0}
let lastRead="";
function renderReadouts(){const el=$("read");if(!el||!api||!api.readouts)return;const rows=api.readouts();
  const html=rows.map(r=>`<div><span>${esc(r[0])}</span><b class="${r[2]||""}">${esc(r[1])}</b></div>`).join("");if(html!==lastRead){el.innerHTML=html;lastRead=html}}
function pass(msg){const L=LESSONS[cur];const first=!done.has(L.id);done.add(L.id);saveDone();logStudy("pass");sfx.win();
  const c=$("chal"),s=$("chalSt");if(c){c.classList.add("done");s.textContent="✓ "+msg}markTabs();ctx.live("Challenge passed. "+msg);
  if(first&&done.size===LESSONS.length)setTimeout(()=>ctx.live("All five challenges done. Try the exam room."),1500)}

// ---------------------------------------------------------------- dialogs: contents and exam room
const dlg=$("dlg");
function openDlg(html,onOpen){$("dlgBody").innerHTML=html;if(typeof dlg.showModal==="function")dlg.showModal();else dlg.setAttribute("open","");onOpen&&onOpen()}
function openContents(){openDlg(`<h2 id="dlg-h">Contents</h2><p class="fine">NCEA Level 2 Earth and Space Science 91191: the causes of extreme Earth events in New Zealand. Exam: Tuesday 1 December 2026, 9.30 am.</p>
  <ol class="toc">${LESSONS.map((L,i)=>`<li><button data-i="${i}" ${i===cur?'aria-current="true"':""}><span class="n">${L.n}</span><span class="t">${esc(L.title)}<small>${esc(L.short)}</small></span><span class="d">${done.has(L.id)?"✓":""}</span></button></li>`).join("")}
  <li><button data-exam="1"><span class="n">★</span><span class="t">Exam room<small>Practice questions with model answers</small></span><span class="d"></span></button></li></ol>`,
  ()=>{$("dlgBody").querySelectorAll("button[data-i]").forEach(b=>b.onclick=()=>{dlg.close();go(+b.dataset.i)});$("dlgBody").querySelector("[data-exam]").onclick=()=>{dlg.close();openExam()}})}
function openExam(){openDlg(`<h2 id="dlg-h">Exam room</h2><p class="fine">Questions in the style of 91191. Write your answer first (on paper or in your head), then open the model answer. Past papers and the official assessment schedules are on the <a href="https://www2.nzqa.govt.nz/ncea/subjects/past-exams-and-exemplars/earth-and-space-science/" target="_blank" rel="noopener">NZQA Earth and Space Science page</a>.</p>
  ${LESSONS.map(L=>`<div class="exam-q"><p><b>${L.n}.</b> ${esc(L.examQ)}</p><details><summary>Show an Excellence-level answer</summary><p class="fine" style="margin-top:8px">${L.examA}</p></details></div>`).join("")}
  <p class="fine">These are practice questions written for this book. They are not NZQA questions, and NZQA has not reviewed them.</p>`)}

// ---------------------------------------------------------------- dock
let playing=false;
function setPlaying(on){playing=on;$("bPlay").classList.toggle("playing",on);$("bPlay").setAttribute("aria-label",on?"Pause the model":"Run the model");api&&api.play&&api.play(on)}
$("bPrev").onclick=()=>go(cur-1);$("bNext").onclick=()=>go(cur+1);
$("bPlay").onclick=()=>{ac();if(tab!=="test")setTab("test");setPlaying(!playing)};
$("bContents").onclick=openContents;$("bExam").onclick=openExam;
const setSound=on=>{soundOn=on;store.set("shakysound",on?"on":"off");if(on)store.set("studysound","on");$("bSound").setAttribute("aria-pressed",on);$("bSound").setAttribute("aria-label",on?"Sound on":"Sound off")};
setSound(soundOn);$("bSound").onclick=()=>{setSound(!soundOn);if(soundOn){ac();sfx.pop()}};
const setClean=on=>{HATCH.value=on?0:1;store.set("shakyclean",on?"1":"0");$("bClean").setAttribute("aria-pressed",on)};
setClean(store.get("shakyclean","0")==="1");$("bClean").onclick=()=>setClean(HATCH.value===1);
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
function resize(){const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer&&renderer.setSize(w,h,false);
}
new ResizeObserver(resize).observe(stage);addEventListener("resize",resize);
let last=performance.now(),rt=0;
const camOff=new THREE.Vector3();
function loop(now){requestAnimationFrame(loop);const dt=Math.min(.05,(now-last)/1000);last=now;
  runTweens(now);
  if(api&&api.update)api.update(dt,now/1000);
  if(!busy)tagAlpha=Math.min(1,tagAlpha+dt*2.5);
  if(controls){controls.update();const t=controls.target;t.x=THREE.MathUtils.clamp(t.x,-3,4);t.z=THREE.MathUtils.clamp(t.z,-2.5,2.5);t.y=THREE.MathUtils.clamp(t.y,0,2.5)}
  if(shake.t>0){shake.t-=dt;const a=shake.amp*Math.min(1,shake.t*2);camOff.set((Math.random()-.5)*a,(Math.random()-.5)*a,(Math.random()-.5)*a);camera.position.add(camOff)}else camOff.set(0,0,0);
  if(renderer)renderer.render(scene,camera);
  if(shake.t>0)camera.position.sub(camOff);
  placeTags(tagAlpha);
  rt+=dt;if(rt>.12){rt=0;renderReadouts()}}

// fonts first, so the printed pages use the book's type
const startAt=Math.min(LESSONS.length-1,Math.max(0,+(new URLSearchParams(location.search).get("lesson")||0)-1||+store.get("shakylesson","0")||0));
logStudy("open");
Promise.race([Promise.all([document.fonts.load(`500 76px ${SERIF}`),document.fonts.load(`italic 400 40px ${SERIF}`),document.fonts.load(`600 26px ${SANS}`)]),new Promise(r=>setTimeout(r,1500))])
  .finally(()=>{resize();go(startAt,true);requestAnimationFrame(loop);setTimeout(()=>$("hint").classList.add("gone"),6000)});
