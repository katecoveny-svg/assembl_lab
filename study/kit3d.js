/* kit3d.js: the shared real-time 3D bench for the study machines.
   A machine hands StudyKit.mount a scene factory (cfg.scene3d, or StudyKit.scenes[id]); kit.js imports this module and
   calls attach(). The factory builds a small world on a paper-white cyclorama and gets called every frame with the
   machine's live state, so the same model that marks the challenges drives the 3D. The SVG drawing stays in the page
   underneath as the fallback (no WebGL, ?lite, or the import fails).
   Look: soft studio light (RoomEnvironment), one warm key with soft navy shadows to the lower right, clear-coated toy
   plastics, frosted acrylic, real metal, neutral tone mapping so the pastels stay pastel, gentle bloom on hot things. */
import * as THREE from "three";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import {RoomEnvironment} from "three/addons/environments/RoomEnvironment.js";
import {RoundedBoxGeometry} from "three/addons/geometries/RoundedBoxGeometry.js";
import {EffectComposer} from "three/addons/postprocessing/EffectComposer.js";
import {RenderPass} from "three/addons/postprocessing/RenderPass.js";
import {UnrealBloomPass} from "three/addons/postprocessing/UnrealBloomPass.js";
import {OutputPass} from "three/addons/postprocessing/OutputPass.js";

export const PAL={paper:"#F7F3EC",ink:"#222A55",shadow:"#1B2452",
  case:{blush:"#F3B8C8",mint:"#BFE8D6",lavender:"#D9CBF2",butter:"#F7E7A6",sky:"#BFDDF5",peach:"#F9D2B8"},
  deep:{sky:"#3A6FB8",mint:"#2A7D63",lavender:"#6A50BE",blush:"#B5466F",butter:"#8A6510",peach:"#B2552D"},
  product:{strawberry:"#E8688A",blueberry:"#6FA3E8",lime:"#96C94E",butter:"#F2C83C",peach:"#F49A5E"},
  copper:"#C97A4A",steel:"#CBD3DD",steelDark:"#8F9BAA",cream:"#FFF8EC",concrete:"#E6E0D6",water:"#7FB7E8",hot:"#FF7A45"};
const CSS=`.s3-host{position:absolute;inset:0;border-radius:inherit;overflow:hidden}
.s3-host canvas{display:block;width:100%;height:100%;outline:none;touch-action:none;cursor:grab}
.s3-host canvas:active{cursor:grabbing}.s3-host canvas.pick{cursor:pointer}
.s3-host canvas:focus-visible{box-shadow:inset 0 0 0 3px var(--as-focus,#2F8FD8)}
.s3-ov{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.s3-ov svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.s3-pill{position:absolute;left:0;top:0;transform:translate(-9999px,0);white-space:nowrap;background:#fff;border:1px solid #DCD6EA;border-radius:999px;padding:3px 10px 4px;
  font:600 10.5px/1.25 var(--as-font,"Instrument Sans",system-ui,sans-serif);letter-spacing:.06em;text-transform:uppercase;color:var(--as-ink,#222A55);box-shadow:0 2px 0 rgba(27,36,82,.08);transition:opacity .25s}
.s3-pill b{display:block;font-size:13px;letter-spacing:0;text-transform:none;font-weight:600}
.s3-pill small{display:block;font-weight:500;letter-spacing:.02em;text-transform:none;color:var(--as-muted,#6E6A86);font-size:11px}
.s3-pill.big b{font-size:17px}.s3-pill.hot{background:var(--acc,#3A6FB8);border-color:transparent;color:#fff}.s3-pill.hot small{color:rgba(255,255,255,.85)}
.s3-pill.off{opacity:0}
.s3-hint{position:absolute;left:12px;bottom:10px;margin:0;font:600 10.5px var(--as-font,system-ui);letter-spacing:.05em;text-transform:uppercase;color:var(--as-muted,#6E6A86);
  background:rgba(255,255,255,.85);padding:4px 10px;border-radius:999px;pointer-events:none;transition:opacity .6s}
.s3-hint.gone{opacity:0}
.s3-badge{position:absolute;right:12px;top:10px;font:600 10px var(--as-font,system-ui);letter-spacing:.06em;text-transform:uppercase;color:var(--as-muted,#6E6A86);background:rgba(255,255,255,.8);padding:3px 9px;border-radius:999px;pointer-events:none}
.canvas.s3-on{min-height:280px}.canvas.s3-on>svg#k-main{opacity:0;pointer-events:none}
@media (max-width:820px){.s3-pill{font-size:9.5px;padding:2px 8px 3px}.s3-pill b{font-size:12px}.s3-pill.big b{font-size:14px}}`;

const isMobile=()=>matchMedia("(max-width: 820px), (pointer: coarse)").matches;
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const lerp=(a,b,t)=>a+(b-a)*t;

export function attach(api,cfg,factory,kit){
  const host0=document.querySelector(".playmain .canvas");if(!host0)throw new Error("no canvas");
  if(!document.getElementById("s3-css")){const st=document.createElement("style");st.id="s3-css";st.textContent=CSS;document.head.appendChild(st)}
  const REDUCED=matchMedia("(prefers-reduced-motion: reduce)").matches;
  const host=document.createElement("div");host.className="s3-host";
  const canvas=document.createElement("canvas");canvas.tabIndex=0;canvas.setAttribute("role","img");
  canvas.setAttribute("aria-label",(cfg.mainLabel||cfg.title||"3D model")+". A 3D model you can turn: drag or use the arrow keys to orbit, + and − to zoom, Home to reset the view.");
  const ov=document.createElement("div");ov.className="s3-ov";const ovs=document.createElementNS("http://www.w3.org/2000/svg","svg");ov.appendChild(ovs);
  const hint=document.createElement("p");hint.className="s3-hint";hint.textContent=isMobile()?"Drag to turn · pinch to zoom":"Drag to turn · scroll to zoom · tap the glowing parts";
  host.append(canvas,ov,hint);
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:"high-performance"});
  const mobile=isMobile(),HQ=!mobile&&!/[?&]lq\b/.test(location.search);
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,HQ?2:1.5));
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1.0;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  host0.classList.add("s3-on");host0.appendChild(host);

  const scene=new THREE.Scene();const bg=new THREE.Color(PAL.paper);scene.background=bg;scene.fog=new THREE.Fog(bg,40,90);
  const camera=new THREE.PerspectiveCamera(32,1,.05,400);camera.position.set(8,6,10);
  const pm=new THREE.PMREMGenerator(renderer);scene.environment=pm.fromScene(new RoomEnvironment(),.04).texture;scene.environmentIntensity=.5;pm.dispose();
  scene.add(new THREE.HemisphereLight(0xffffff,0xd9d2e6,.35));
  const fill=new THREE.DirectionalLight(0xffffff,.45);fill.position.set(4,5,9);scene.add(fill);
  const sun=new THREE.DirectionalLight(0xfff3e4,2.4);sun.position.set(-6,11,5);sun.castShadow=true;
  sun.shadow.mapSize.set(HQ?2048:1024,HQ?2048:1024);sun.shadow.bias=-.0004;sun.shadow.normalBias=.025;sun.shadow.radius=4;
  Object.assign(sun.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:1,far:60});scene.add(sun,sun.target);
  // the cyclorama: a paper floor that only shows shadows and fades into the background
  const ground=new THREE.Mesh(new THREE.CircleGeometry(80,64),new THREE.ShadowMaterial({color:new THREE.Color(PAL.shadow),opacity:.3}));
  ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;ground.renderOrder=-1;scene.add(ground);

  let composer=null,bloom=null;
  if(HQ&&cfg.postprocessing!==false){try{composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
    bloom=new UnrealBloomPass(new THREE.Vector2(256,256),.5,.35,2.2);composer.addPass(bloom);composer.addPass(new OutputPass())}catch(e){composer=null}}

  const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.08;controls.enablePan=false;
  controls.maxPolarAngle=1.42;controls.minPolarAngle=.08;controls.rotateSpeed=.7;controls.zoomSpeed=.8;controls.minDistance=1.5;controls.maxDistance=60;
  let userTouched=false;controls.addEventListener("start",()=>{userTouched=true;hint.classList.add("gone");tween=null});

  // ---------------------------------------------------------------- materials
  const cache=new Map();
  const C=c=>c instanceof THREE.Color?c:new THREE.Color(c);
  const M={
    plastic:(c,o={})=>new THREE.MeshPhysicalMaterial({color:C(c),roughness:o.rough??.38,metalness:0,clearcoat:o.coat??.65,clearcoatRoughness:.25,sheen:.25,sheenColor:new THREE.Color(0xffffff),...o.extra}),
    matte:(c,o={})=>new THREE.MeshStandardMaterial({color:C(c),roughness:o.rough??.85,metalness:0}),
    metal:(c=PAL.steel,o={})=>new THREE.MeshPhysicalMaterial({color:C(c),roughness:o.rough??.28,metalness:1,clearcoat:.3}),
    acrylic:(c,o={})=>new THREE.MeshPhysicalMaterial({color:C(c),roughness:o.rough??.12,metalness:0,clearcoat:1,clearcoatRoughness:.05,transparent:true,opacity:o.opacity??.38,
      depthWrite:false,side:o.side??THREE.DoubleSide,ior:1.45,specularIntensity:1}),
    glass:(c=0xffffff,o={})=>HQ&&o.real?new THREE.MeshPhysicalMaterial({color:C(c),roughness:o.rough??.04,metalness:0,transmission:1,thickness:o.thickness??.3,ior:1.5,transparent:true})
      :new THREE.MeshPhysicalMaterial({color:C(c),roughness:o.rough??.05,metalness:0,clearcoat:1,transparent:true,opacity:o.opacity??.14,depthWrite:false,side:THREE.DoubleSide,specularIntensity:1}),
    glow:(c,i=2)=>new THREE.MeshStandardMaterial({color:C(c),emissive:C(c),emissiveIntensity:i,roughness:.4,toneMapped:true}),
    flat:(c,o={})=>new THREE.MeshBasicMaterial({color:C(c),transparent:o.opacity!=null,opacity:o.opacity??1,depthWrite:o.depthWrite??true,side:o.side??THREE.FrontSide}),
    liquid:(c,o={})=>new THREE.MeshPhysicalMaterial({color:C(c),roughness:.1,metalness:0,clearcoat:1,transparent:true,opacity:o.opacity??.8,depthWrite:o.depthWrite??true}),
  };
  // mat("glow", colour, intensity, {fresh}) takes its options fourth; every other kind takes them third
  const mat=(kind,c,o,o2)=>{const fresh=(o&&o.fresh)||(o2&&o2.fresh);const key=kind+"|"+(c instanceof THREE.Color?c.getHexString():c)+"|"+JSON.stringify(o??{});if(fresh)return M[kind](c,o);if(!cache.has(key))cache.set(key,M[kind](c,o));return cache.get(key)};

  // ---------------------------------------------------------------- geometry helpers
  const shadowy=(m,cast=true,rec=true)=>{m.traverse(o=>{if(o.isMesh){o.castShadow=cast;o.receiveShadow=rec}});return m};
  const mesh=(geo,material,o={})=>{const m=new THREE.Mesh(geo,material);m.castShadow=o.cast!==false&&!material.transparent;m.receiveShadow=o.receive!==false;
    if(o.at)m.position.set(...o.at);if(o.rot)m.rotation.set(...o.rot);if(o.parent)o.parent.add(m);return m};
  const rbox=(w,h,d,r,material,o={})=>mesh(new RoundedBoxGeometry(w,h,d,o.seg??4,Math.min(r,w/2-1e-3,h/2-1e-3,d/2-1e-3)),material,o);
  const box=(w,h,d,material,o={})=>mesh(new THREE.BoxGeometry(w,h,d),material,o);
  const cyl=(rt,rb,h,material,o={})=>mesh(new THREE.CylinderGeometry(rt,rb,h,o.seg??40,1,!!o.open),material,o);
  const sphere=(r,material,o={})=>mesh(new THREE.SphereGeometry(r,o.seg??32,Math.round((o.seg??32)*.75)),material,o);
  const torus=(r,t,material,o={})=>mesh(new THREE.TorusGeometry(r,t,o.rs??16,o.ts??64,o.arc??Math.PI*2),material,o);
  const tube=(pts,r,material,o={})=>{const curve=(pts instanceof THREE.Curve)?pts:new THREE.CatmullRomCurve3(pts.map(p=>p.isVector3?p:new THREE.Vector3(...p)),!!o.closed,o.type||"centripetal",o.tension??.5);
    const m=mesh(new THREE.TubeGeometry(curve,o.seg??Math.max(24,pts.length*12),r,o.rs??12,!!o.closed),material,o);m.userData.curve=curve;return m};
  // the signature case: a frosted acrylic box with steel edge rails and corner balls (as in the vending machine and pinball)
  function acrylicCase(w,h,d,tint,o={}){const g=new THREE.Group();const R=o.rail??Math.min(w,h,d)*.025;
    const body=rbox(w,h,d,R*1.2,mat("acrylic",tint,{opacity:o.opacity??.26}),{cast:false});body.position.y=h/2;body.renderOrder=2;g.add(body);
    const railM=mat("plastic",o.railColor||tint,{rough:.3});
    const xs=[-w/2,w/2],ys=[0,h],zs=[-d/2,d/2];
    for(const x of xs)for(const z of zs){const r=cyl(R,R,h,railM,{seg:12});r.position.set(x,h/2,z);g.add(r)}
    for(const y of ys)for(const z of zs){const r=cyl(R,R,w,railM,{seg:12,rot:[0,0,Math.PI/2]});r.position.set(0,y,z);g.add(r)}
    for(const y of ys)for(const x of xs){const r=cyl(R,R,d,railM,{seg:12,rot:[Math.PI/2,0,0]});r.position.set(x,y,0);g.add(r)}
    const ballM=mat("plastic",o.ballColor||"#ffffff",{rough:.25});
    for(const x of xs)for(const y of ys)for(const z of zs){const b=sphere(R*1.9,ballM,{seg:16});b.position.set(x,y,z);g.add(b)}
    g.userData.body=body;return g}
  // a vector arrow that can be re-aimed every frame
  function arrow(color,o={}){const g=new THREE.Group();const m=o.mat||mat("plastic",color,{rough:.3});const r=o.r??.035;
    const shaft=cyl(r,r,1,m,{seg:14});const head=cyl(0,r*2.6,r*6,m,{seg:18});g.add(shaft,head);g.visible=false;
    g.set=(from,vec,scale=1)=>{const L=vec.length()*scale;if(L<1e-4){g.visible=false;return}g.visible=true;const hl=Math.min(r*6,L*.5);
      shaft.scale.set(1,Math.max(1e-3,L-hl),1);shaft.position.set(0,(L-hl)/2,0);head.scale.set(1,hl/(r*6),1);head.position.set(0,L-hl/2,0);
      g.position.copy(from);g.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vec.clone().normalize())};
    return g}
  // a pool of small instanced things (particles, molecules, cars...)
  function swarm(n,geo,material,o={}){const im=new THREE.InstancedMesh(geo,material,n);im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);im.castShadow=o.cast??false;im.receiveShadow=false;
    if(o.colors){im.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(n*3),3)}
    const d=new THREE.Object3D(),col=new THREE.Color();
    im.put=(i,x,y,z,s=1,rx=0,ry=0,rz=0)=>{d.position.set(x,y,z);d.rotation.set(rx,ry,rz);d.scale.setScalar(s);d.updateMatrix();im.setMatrixAt(i,d.matrix)};
    im.putS=(i,x,y,z,sx,sy,sz,q)=>{d.position.set(x,y,z);if(q)d.quaternion.copy(q);else d.rotation.set(0,0,0);d.scale.set(sx,sy,sz);d.updateMatrix();im.setMatrixAt(i,d.matrix)};
    im.tint=(i,c)=>{col.set(c);im.setColorAt(i,col)};
    im.done=()=>{im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true};
    im.frustumCulled=false;return im}
  // a soft round sprite texture for glows, steam and sparks
  let softTex=null;const soft=()=>{if(softTex)return softTex;const c=document.createElement("canvas");c.width=c.height=64;const g=c.getContext("2d");const gr=g.createRadialGradient(32,32,0,32,32,32);
    gr.addColorStop(0,"rgba(255,255,255,1)");gr.addColorStop(.4,"rgba(255,255,255,.55)");gr.addColorStop(1,"rgba(255,255,255,0)");g.fillStyle=gr;g.fillRect(0,0,64,64);softTex=new THREE.CanvasTexture(c);return softTex};
  function puffs(n,color,o={}){const geo=new THREE.BufferGeometry();const pos=new Float32Array(n*3),alpha=new Float32Array(n),size=new Float32Array(n);
    geo.setAttribute("position",new THREE.BufferAttribute(pos,3));geo.setAttribute("a",new THREE.BufferAttribute(alpha,1));geo.setAttribute("s",new THREE.BufferAttribute(size,1));
    const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:o.additive?THREE.AdditiveBlending:THREE.NormalBlending,
      uniforms:{map:{value:soft()},color:{value:C(color)},scale:{value:1}},
      vertexShader:`attribute float a;attribute float s;varying float va;uniform float scale;void main(){va=a;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=s*scale/-mv.z;gl_Position=projectionMatrix*mv;}`,
      fragmentShader:`uniform sampler2D map;uniform vec3 color;varying float va;void main(){vec4 t=texture2D(map,gl_PointCoord);gl_FragColor=vec4(color,t.a*va);if(gl_FragColor.a<.01)discard;}`});
    const p=new THREE.Points(geo,m);p.frustumCulled=false;p.renderOrder=5;
    p.put=(i,x,y,z,a,s)=>{pos[i*3]=x;pos[i*3+1]=y;pos[i*3+2]=z;alpha[i]=a;size[i]=s};
    p.done=()=>{geo.attributes.position.needsUpdate=true;geo.attributes.a.needsUpdate=true;geo.attributes.s.needsUpdate=true};
    p.n=n;return p}
  // a live 2D panel inside the scene (graphs, gauges, screens) drawn with canvas 2D
  function panel(wPx,hPx,wU,o={}){const c=document.createElement("canvas");c.width=wPx;c.height=hPx;const g=c.getContext("2d");const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();
    const hU=wU*hPx/wPx;const m=new THREE.Mesh(new THREE.PlaneGeometry(wU,hU),new THREE.MeshBasicMaterial({map:t,transparent:true,toneMapped:false,side:THREE.DoubleSide}));m.renderOrder=3;
    m.g=g;m.c=c;m.redraw=fn=>{g.clearRect(0,0,wPx,hPx);fn(g,wPx,hPx);t.needsUpdate=true};m.hU=hU;return m}

  // ---------------------------------------------------------------- labels: crisp HTML pills pinned to points in the scene
  const labels=[];
  function label(o={}){const el=document.createElement("div");el.className="s3-pill"+(o.cls?" "+o.cls:"");ov.appendChild(el);
    const ln=document.createElementNS("http://www.w3.org/2000/svg","g");ovs.appendChild(ln);
    const L={el,ln,anchor:new THREE.Vector3(),off:o.off||[18,-26],on:true,html:"",lead:o.lead!==false,
      at(v){this.anchor.copy(v);return this},set(html){if(html!==this.html){this.html=html;el.innerHTML=html}return this},
      show(b=true){this.on=b;return this},hide(){this.on=false;return this},cls(c){el.className="s3-pill"+(c?" "+c:"");return this}};
    labels.push(L);return L}
  const pv=new THREE.Vector3();
  function placeLabels(w,h){const acc=(getComputedStyle(document.documentElement).getPropertyValue("--acc")||"#3A6FB8").trim();
    for(const L of labels){if(!L.on){L.el.style.transform="translate(-9999px,0)";L.ln.innerHTML="";continue}
      pv.copy(L.anchor).project(camera);if(pv.z>1||pv.z<-1){L.el.style.transform="translate(-9999px,0)";L.ln.innerHTML="";continue}
      const ax=(pv.x*.5+.5)*w,ay=(-pv.y*.5+.5)*h;const bw=L.el.offsetWidth,bh=L.el.offsetHeight;
      let x=ax+L.off[0],y=ay+L.off[1]-bh/2;if(L.off[0]<0)x-=bw;x=clamp(x,4,w-bw-4);y=clamp(y,4,h-bh-4);
      L.el.style.transform=`translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
      L.ln.innerHTML=L.lead?`<path d="M${ax.toFixed(1)},${ay.toFixed(1)} L${(x+(ax<x?0:bw)).toFixed(1)},${(y+bh/2).toFixed(1)}" stroke="${acc}" stroke-width="1.2" fill="none" opacity=".8"/><circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="2.8" fill="${acc}"/>`:""}}

  // ---------------------------------------------------------------- picking and dragging
  const ray=new THREE.Raycaster(),ptr=new THREE.Vector2();const picks=[];let hover=null,drag=null,downAt=null;
  function pick(obj,fn,o={}){const P={obj,fn,o};picks.push(P);obj.userData.pick=P;return P}
  function dragger(obj,o){return pick(obj,null,{drag:o})}
  function hitTest(e){const r=canvas.getBoundingClientRect();ptr.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);ray.setFromCamera(ptr,camera);
    const live=picks.filter(p=>{let v=true;p.obj.traverseAncestors(a=>{if(!a.visible)v=false});return v&&p.obj.visible});
    const hits=ray.intersectObjects(live.map(p=>p.obj),true);if(!hits.length)return null;let o=hits[0].object;while(o&&!o.userData.pick)o=o.parent;return o?{p:o.userData.pick,hit:hits[0]}:null}
  const dragPlane=new THREE.Plane(),dragPt=new THREE.Vector3();
  canvas.addEventListener("pointerdown",e=>{const h=hitTest(e);downAt=[e.clientX,e.clientY,h];
    if(h&&h.p.o.drag){drag=h.p;controls.enabled=false;const n=h.p.o.drag.normal||camera.getWorldDirection(new THREE.Vector3()).negate();dragPlane.setFromNormalAndCoplanarPoint(n,h.hit.point);
      canvas.setPointerCapture(e.pointerId);h.p.o.drag.start&&h.p.o.drag.start(h.hit.point);hint.classList.add("gone")}});
  canvas.addEventListener("pointermove",e=>{if(drag){const r=canvas.getBoundingClientRect();ptr.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);ray.setFromCamera(ptr,camera);
      if(ray.ray.intersectPlane(dragPlane,dragPt)){drag.o.drag.move(dragPt.clone());api.redraw()}return}
    if(e.pointerType==="mouse"){const h=hitTest(e);const p=h?h.p:null;if(p!==hover){hover=p;canvas.classList.toggle("pick",!!p)}}});
  const up=e=>{if(drag){drag.o.drag.end&&drag.o.drag.end();drag=null;controls.enabled=true;api.redraw();return}
    if(downAt&&Math.hypot(e.clientX-downAt[0],e.clientY-downAt[1])<6&&downAt[2]&&downAt[2].p.fn){kit&&kit.sfx&&kit.sfx("pop");downAt[2].p.fn(downAt[2].hit);api.redraw()}downAt=null};
  canvas.addEventListener("pointerup",up);canvas.addEventListener("pointercancel",()=>{drag=null;controls.enabled=true;downAt=null});
  // keyboard orbit
  canvas.addEventListener("keydown",e=>{const sph=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));let used=true;
    if(e.key==="ArrowLeft")sph.theta-=.12;else if(e.key==="ArrowRight")sph.theta+=.12;else if(e.key==="ArrowUp")sph.phi=clamp(sph.phi-.1,controls.minPolarAngle,controls.maxPolarAngle);
    else if(e.key==="ArrowDown")sph.phi=clamp(sph.phi+.1,controls.minPolarAngle,controls.maxPolarAngle);else if(e.key==="+"||e.key==="=")sph.radius=Math.max(controls.minDistance,sph.radius*.88);
    else if(e.key==="-"||e.key==="_")sph.radius=Math.min(controls.maxDistance,sph.radius*1.12);else if(e.key==="Home"){goView(curView,true);e.preventDefault();return}else used=false;
    if(used){e.preventDefault();tween=null;camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(sph));hint.classList.add("gone")}});

  // ---------------------------------------------------------------- camera views and flights
  const views={};let curView=null,tween=null;
  function view(name,pos,target,o={}){views[name]={pos:new THREE.Vector3(...pos),target:new THREE.Vector3(...target),o}}
  function goView(name,instant){const v=views[name];if(!v)return;curView=name;userTouched=false;
    controls.minDistance=v.o.min??1.5;controls.maxDistance=v.o.max??60;
    if(instant||REDUCED){tween=null;camera.position.copy(v.pos);controls.target.copy(v.target);return}
    tween={t:0,dur:v.o.dur??1.6,p0:camera.position.clone(),t0:controls.target.clone(),p1:v.pos,t1:v.target,arc:v.o.arc??.18}}
  // follow: gently keep a moving thing in frame (the target eases towards it unless the user is orbiting)
  let follow=null;const setFollow=(fn,k=.06,always=false)=>{follow=fn?{fn,k,always}:null};

  // ---------------------------------------------------------------- frame loop
  let W=0,H=0;
  function resize(){const r=host.getBoundingClientRect();const w=Math.max(1,Math.round(r.width)),h=Math.max(1,Math.round(r.height));if(w===W&&h===H)return;W=w;H=h;
    renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();if(composer){composer.setSize(w,h);bloom&&bloom.resolution.set(w/2,h/2)}
    world&&world.resize&&world.resize(w,h)}
  try{new ResizeObserver(resize).observe(host)}catch(e){addEventListener("resize",resize)}
  let visible=true;try{new IntersectionObserver(es=>{visible=es[0].isIntersecting}).observe(host)}catch(e){}
  const clock=new THREE.Clock();let t=0;
  const S={THREE,scene,camera,renderer,controls,canvas,PAL,HQ,mobile,REDUCED,mat,M,mesh,rbox,box,cyl,sphere,torus,tube,acrylicCase,arrow,swarm,puffs,panel,label,pick,dragger,view,goView,setFollow,shadowy,
    sun,ground,RoundedBoxGeometry,ease,clamp,lerp,api,kit,get t(){return t},get bloom(){return bloom},
    setShadowBox(half,center=[0,0,0]){Object.assign(sun.shadow.camera,{left:-half,right:half,top:half,bottom:-half});sun.shadow.camera.updateProjectionMatrix();
      sun.target.position.set(...center);sun.position.set(center[0]-half*.5,center[1]+half*1.1,center[2]+half*.45)},
    group(parent){const g=new THREE.Group();(parent||scene).add(g);return g}};
  let world=null;
  try{world=factory(S)||{}}catch(e){console.warn("3D scene failed to build",e);host.remove();host0.classList.remove("s3-on");throw e}
  let lastStep=null;
  function frame(){requestAnimationFrame(frame);if(!visible||document.hidden){clock.getDelta();return}
    resize();const dt=Math.min(.05,clock.getDelta());t+=dt;const st=api.step;
    if(st!==lastStep){lastStep=st;try{world.step&&world.step(st,api.state)}catch(e){console.warn(e)}}
    try{world.update&&world.update(api.state,st,dt,t)}catch(e){console.warn(e)}
    if(tween){tween.t+=dt/tween.dur;const k=ease(Math.min(1,tween.t));camera.position.lerpVectors(tween.p0,tween.p1,k);
      camera.position.y+=Math.sin(k*Math.PI)*tween.arc*tween.p0.distanceTo(tween.p1);controls.target.lerpVectors(tween.t0,tween.t1,k);if(tween.t>=1)tween=null}
    if(!tween&&follow&&(follow.always||!userTouched)){const v=follow.fn();if(v){const d=v.clone().sub(controls.target).multiplyScalar(1-Math.pow(1-follow.k,dt*60));controls.target.add(d);camera.position.add(d)}}
    controls.update();placeLabels(W,H);
    if(composer)composer.render();else renderer.render(scene,camera)}
  resize();requestAnimationFrame(frame);
  return S;
}
