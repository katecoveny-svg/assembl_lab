import {GLTFLoader} from '../../ar/vendor/three/loaders/GLTFLoader.js';
// The house design scene: a white card model on a stepped green contour site, made in Blender
// (assets/models/house/build_house.py). Named nodes are driven by the lesson's state: the massing stages grow out of the
// site, the house turns under a real sun, clipping planes cut plans and sections (with solid "poché" where the cut is),
// and the camera moves between perspective and near-orthographic views by changing its field of view (a dolly zoom).
// Three.js axes: x east, y up (y = 0 is the lower floor, RL 10.000), z SOUTH (north is -z).
export function houseScene(S,L){
  const {THREE,scene,renderer,camera,canvas,controls}=S,host=canvas.parentElement,figure=host.parentElement,s=L.state;
  renderer.localClippingEnabled=true;renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1.02;
  scene.background=new THREE.Color('#F3EEE6');scene.fog=null;scene.environmentIntensity=.5;
  if(S.bloom)S.bloom.strength=0;
  S.ground.position.y=-2.7;S.ground.material.opacity=.16;
  const sun=S.sun;sun.intensity=2.5;Object.assign(sun.shadow.camera,{left:-27,right:27,top:27,bottom:-27,near:1,far:180});sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias=-.0006;sun.shadow.normalBias=.05;sun.shadow.radius=3;sun.target.position.set(0,0,-1);
  controls.minPolarAngle=0;controls.maxPolarAngle=Math.PI/2;
  const D2R=Math.PI/180,V3=(x,y,z)=>new THREE.Vector3(x,y,z),plan=(x,y,z)=>V3(x,z,-y);   // plan (x east, y north, z up) → three
  // ---------------------------------------------------------------- clipping: one vertical section plane, one horizontal plane per level
  const OFF=1e4,secPlane=new THREE.Plane(V3(-1,0,0),OFF),planeL=new THREE.Plane(V3(0,-1,0),OFF),planeU=new THREE.Plane(V3(0,-1,0),OFF);
  // ---------------------------------------------------------------- the camera: views as (target, azimuth, polar, half-size, field of view)
  const VIEWS={
    site:{t:[0,.6,-1],th:2.5,ph:.98,R:20,fov:30},
    massing:{t:[0,1.2,-.6],th:2.42,ph:1.02,R:10.5,fov:11},
    plans:{t:[0,.2,-1.8],th:0,ph:.0004,R:6.8,fov:2},
    section:{t:[0,1.2,-1.6],th:Math.PI/2+.3,ph:1.22,R:7.4,fov:18},
    elev:{t:[0,1.7,-1.5],th:Math.PI,ph:Math.PI/2-.0004,R:8.4,fov:2},
    iso:{t:[0,1.2,-1.4],th:Math.PI*.75,ph:Math.acos(1/Math.sqrt(3)),R:10.4,fov:2},
    persp:{t:[0,1.6,-1.2],th:2.28,ph:1.32,R:10.6,fov:42},
    test:{t:[0,.6,-1],th:2.5,ph:.98,R:20,fov:30}};
  const viewKey=()=>{const v=L.view();return v==='conv'?(s.dview==='plan'?'plans':s.dview):v};
  let anim=null,cur=null,touched=false;controls.addEventListener('start',()=>{touched=true;anim=null});
  const distFor=(R,fov)=>{const a=camera.aspect||1.6,v=fov*D2R/2,h=Math.atan(Math.tan(v)*a);return R/Math.tan(Math.min(v,h))};
  const pose=()=>{const off=camera.position.clone().sub(controls.target),sph=new THREE.Spherical().setFromVector3(off);
    return{t:controls.target.clone(),th:sph.theta,ph:sph.phi,R:sph.radius*Math.tan(Math.min(camera.fov*D2R/2,Math.atan(Math.tan(camera.fov*D2R/2)*(camera.aspect||1.6)))),fov:camera.fov}};
  function apply(p){camera.fov=p.fov;const d=distFor(p.R,p.fov);controls.target.copy(p.t);
    camera.position.copy(p.t).add(new THREE.Vector3().setFromSpherical(new THREE.Spherical(d,Math.max(1e-4,p.ph),p.th)));
    controls.minDistance=d*.3;controls.maxDistance=d*2.4;camera.updateProjectionMatrix()}
  function goTo(key,instant){const v=VIEWS[key]||VIEWS.site;cur=key;touched=false;const to={t:V3(...v.t),th:v.th,ph:v.ph,R:v.R,fov:v.fov};
    if(key==='section')to.t.x=s.cut-1.2;
    if(instant||S.REDUCED){anim=null;apply(to);return}
    const from=pose();let dth=to.th-from.th;while(dth>Math.PI)dth-=2*Math.PI;while(dth<-Math.PI)dth+=2*Math.PI;anim={from,to:{...to,th:from.th+dth},t0:performance.now()}}
  const ez=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  function stepAnim(){if(!anim)return;const p=Math.min(1,(performance.now()-anim.t0)/1500),k=ez(p),a=anim.from,b=anim.to;
    // field of view eases in log space, so the zoom between perspective and orthographic feels even
    apply({t:a.t.clone().lerp(b.t,k),th:a.th+(b.th-a.th)*k,ph:a.ph+(b.ph-a.ph)*k,R:a.R+(b.R-a.R)*k,fov:Math.exp(Math.log(a.fov)+(Math.log(b.fov)-Math.log(a.fov))*k)});
    if(p>=1)anim=null}
  // ---------------------------------------------------------------- the sun path, the view, the boundary, the section frame
  const fx=new THREE.Group();scene.add(fx);
  const sunGroup=new THREE.Group();fx.add(sunGroup);const RS=27;
  const sunDir=(se,h)=>{const v=L.sunVec(se,h);return V3(v.e,v.u,-v.n)};
  const arcs={};
  for(const se of Object.keys(L.SEASONS)){const pts=[];for(let h=3;h<=21;h+=.1){const d=sunDir(se,h);if(d.y>-.02)pts.push(d.multiplyScalar(RS))}
    const geo=new THREE.BufferGeometry().setFromPoints(pts);const line=new THREE.Line(geo,new THREE.LineDashedMaterial({color:'#D9922A',dashSize:.7,gapSize:.5,transparent:true,opacity:.9}));line.computeLineDistances();
    const tube=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),120,.07,6,false),new THREE.MeshBasicMaterial({color:'#E39B2D'}));
    const dots=new THREE.Group();for(let h=4;h<=20;h++){const d=sunDir(se,h);if(d.y>0){const m=new THREE.Mesh(new THREE.SphereGeometry(.22,12,8),new THREE.MeshBasicMaterial({color:'#E39B2D'}));m.position.copy(d.multiplyScalar(RS));dots.add(m)}}
    sunGroup.add(line,tube,dots);arcs[se]={line,tube,dots}}
  const glowTex=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),r=g.createRadialGradient(64,64,0,64,64,64);
    r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.25,'rgba(255,255,255,.5)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,128,128);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t})();
  const sunBall=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),new THREE.MeshBasicMaterial({color:'#FFC45C'}));
  const sunGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:'#FFB347',transparent:true,depthWrite:false,opacity:.85}));sunGlow.scale.setScalar(6);sunBall.add(sunGlow);sunGroup.add(sunBall);
  // the view: a pale blue fan from the living room, turning with the house
  const pivot=new THREE.Group();fx.add(pivot);
  const fan=new THREE.Mesh(new THREE.CircleGeometry(15,32,Math.PI/2-.44,.88),new THREE.MeshBasicMaterial({color:'#6FAEE0',transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide}));
  fan.rotation.x=-Math.PI/2;fan.position.copy(plan(2.75,2.75,.06));fan.renderOrder=4;pivot.add(fan);
  // the site boundary: a red chain line following the stepped card contours
  {const pts=[],B=L.SITE,edge=(x0,y0,x1,y1)=>{const n=Math.ceil(Math.hypot(x1-x0,y1-y0)/.2);let last=null;for(let i=0;i<=n;i++){const x=x0+(x1-x0)*i/n,y=y0+(y1-y0)*i/n,h=Math.max(L.terr(x,y),-1.5)+.05;if(last!==null&&Math.abs(h-last)>.01)pts.push(plan(x,y,last));pts.push(plan(x,y,h));last=h}};
    edge(B.x0,B.y0,B.x1,B.y0);edge(B.x1,B.y0,B.x1,B.y1);edge(B.x1,B.y1,B.x0,B.y1);edge(B.x0,B.y1,B.x0,B.y0);
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineDashedMaterial({color:'#D2463C',dashSize:.9,gapSize:.35}));line.computeLineDistances();fx.add(line);fx.userData.boundary=line}
  // the section frame: a red rectangle where the cut is
  const frame=new THREE.Group();fx.add(frame);{const m=new THREE.MeshBasicMaterial({color:'#D2463C'}),W=.07,z0=-11,z1=8,y0=-2.75,y1=6.4;
    [[0,(y0+y1)/2,z0,W,y1-y0,W],[0,(y0+y1)/2,z1,W,y1-y0,W],[0,y0,0,W,W,z1-z0],[0,y1,0,W,W,z1-z0]].forEach(([x,y,z,a,b,c])=>{const bx=new THREE.Mesh(new THREE.BoxGeometry(a,b,c),m);bx.position.set(x,y,z);frame.add(bx)})}
  // ---------------------------------------------------------------- labels
  const pill={main:S.label({cls:'big'}),view:S.label({lead:false}),street:S.label({lead:false})},roomPills=L.ROOMS.map(r=>({r,p:S.label({lead:false})}));
  // ---------------------------------------------------------------- the Blender model
  let N={},ready=false;const grow={MASS_1:0,MASS_2:0,MASS_3:0,HOUSE:1};const roomMats={};
  new GLTFLoader().load('/assets/models/house/house.glb',g=>{
    const root=g.scene;root.traverse(o=>{if(o.name)N[o.name]=o});scene.add(root);
    const under=(o,name)=>{let p=o;while(p){if(p.name===name)return true;p=p.parent}return false};
    const meshes=[];root.traverse(o=>{if(o.isMesh)meshes.push(o)});
    for(const o of meshes){const m=o.material.clone();o.material=m;o.castShadow=!m.transparent;o.receiveShadow=true;
      if(m.transparent){m.depthWrite=false;m.side=THREE.DoubleSide;o.renderOrder=3}else m.side=THREE.FrontSide;   // back faces are left to the poché
      const inHouse=under(o,'HOUSE'),inMass=/^MASS_/.test(o.name);
      const planes=inMass?[]:inHouse?(under(o,'LEVEL_LOWER')||o.name==='STAIR'?[secPlane,planeL]:under(o,'LEVEL_UPPER')?[secPlane,planeU]:[secPlane]):[secPlane];
      m.clippingPlanes=planes;m.clipShadows=true;
      if(o.name==='TREE_CANOPIES'){m.flatShading=true;m.needsUpdate=true}
      // poché: the inside faces drawn flat and dark, so a cut through a solid reads as solid
      if(!m.transparent&&planes.length&&!/^ROOM_/.test(o.name)){const pc=new THREE.Mesh(o.geometry,new THREE.MeshBasicMaterial({color:/TERRAIN|BASE|WATER|STREET|PATH/.test(o.name)?'#5E7A4E':'#2B2228',side:THREE.BackSide,clippingPlanes:planes}));pc.castShadow=pc.receiveShadow=false;o.add(pc)}
      if(/^ROOM_|^DECK$/.test(o.name))roomMats[o.name]={m,base:m.color.clone()}}
    // the eaves and floors are a touch warmer than the walls, like the card and balsa of a real model
    ['ROOF_LOWER','ROOF_UPPER'].forEach(n=>N[n]&&N[n].material.color.set('#D9D4CC'));
    ['MASS_1','MASS_2','MASS_3'].forEach(n=>{N[n].scale.y=.001;N[n].visible=false});
    ready=true;goTo(viewKey(),true);
    document.getElementById('k-main').setAttribute('aria-hidden','true');figure.classList.add('s3-on');host.style.visibility='visible';
    canvas.setAttribute('aria-label','A white card model of a split-level house on a stepped green hillside, made in Blender. Drag to turn, plus and minus to zoom. The drawing below matches the view.');
    document.documentElement.dataset.houseAsset='ready';
  },undefined,e=>{host.style.visibility='hidden';figure.classList.remove('s3-on');document.getElementById('k-main').removeAttribute('aria-hidden');document.documentElement.dataset.houseAsset='fallback';console.warn('House model unavailable',e)});

  let lastKey='',lastAspect=0,lastNow=0;const tmpC=new THREE.Color(),FIXED=V3(-.45,.62,-.64).normalize(),SECL=V3(.62,.7,-.35).normalize(),TOP=V3(-.25,.92,-.3).normalize();
  const ease=(a,b,k)=>a+(b-a)*k;
  return {resize(){if(ready&&!touched&&cur&&Math.abs(camera.aspect-lastAspect)>.01){lastAspect=camera.aspect;goTo(cur,true)}},update(st,stp,dt,t){
    if(!ready)return;
    // animations run on the wall clock, so a slow device skips frames instead of crawling
    const now=performance.now();dt=Math.min(1,(now-(lastNow||now))/1000);lastNow=now;
    const v=L.view(),key=viewKey(),k=Math.min(1,dt*5);
    if(key!==lastKey){lastKey=key;goTo(key,false)}
    stepAnim();
    // keep the section cut in the middle of the picture as it slides (unless the student has taken the camera)
    if(key==='section'&&!anim&&!touched){const want=s.cut-1.2,d=(want-controls.target.x)*Math.min(1,dt*4);controls.target.x+=d;camera.position.x+=d}
    {const d=camera.position.distanceTo(controls.target);camera.near=Math.max(.05,d-75);camera.far=d+160;camera.updateProjectionMatrix()}
    // ---- which form is standing: the massing stages in the massing step, otherwise the finished house
    const stageNode=v==='massing'?L.STAGES[s.stage].node:'HOUSE';
    const othersDown=['MASS_1','MASS_2','MASS_3','HOUSE'].every(n=>n===stageNode||grow[n]<.35);
    for(const n of ['MASS_1','MASS_2','MASS_3','HOUSE']){const want=n===stageNode&&othersDown?1:0;grow[n]=S.REDUCED?want:want>grow[n]?Math.min(want,grow[n]+dt*1.6):Math.max(want,grow[n]-dt*3.2);
      const o=N[n];if(!o)continue;const x=grow[n],e=x<1?1+2.2*Math.pow(x-1,3)+1.2*Math.pow(x-1,2):1;o.scale.y=Math.max(.001,e);o.visible=x>.01}
    // ---- turning the house (site step only)
    const rot=(v==='site'||(v==='test'&&s.view==='site'))?s.rot:0;
    for(const n of ['MASS_1','MASS_2','MASS_3','HOUSE'])if(N[n])N[n].rotation.y=ease(N[n].rotation.y,-rot*D2R,k);
    pivot.rotation.y=N.HOUSE.rotation.y;
    // ---- the sun: real in the site step, a fixed afternoon light elsewhere
    const onSite=v==='site';sunGroup.visible=onSite;fan.visible=onSite;fx.userData.boundary.visible=onSite||v==='massing';
    let dir=key==='section'?SECL:key==='plans'?TOP:FIXED,lightK=1;
    if(onSite){for(const se in arcs){const on=se===s.season;arcs[se].tube.visible=on;arcs[se].dots.visible=on;arcs[se].line.visible=!on}
      const d=sunDir(s.season,s.hour);sunBall.position.copy(d).multiplyScalar(RS);sunBall.visible=d.y>-.02;dir=d.y>.02?d:V3(0,1,0);lightK=Math.min(1,Math.max(0,d.y/.12))}
    sun.position.copy(dir).multiplyScalar(70);sun.intensity=ease(sun.intensity,2.6*lightK,k);
    scene.environmentIntensity=ease(scene.environmentIntensity,onSite&&lightK<.2?.28:.5,k);
    // ---- plans and sections: clipping planes
    const planMode=key==='plans';
    planeL.constant=planMode&&s.level==='lower'?1.2:OFF;planeU.constant=planMode&&s.level==='upper'?2.6:OFF;
    secPlane.constant=key==='section'?s.cut:OFF;frame.visible=key==='section';frame.position.x=s.cut;
    if(N.LEVEL_UPPER)N.LEVEL_UPPER.visible=!(planMode&&s.level==='lower');
    if(N.ROOF_UPPER)N.ROOF_UPPER.visible=!planMode;if(N.ROOF_LOWER)N.ROOF_LOWER.visible=!(planMode&&s.level==='lower');
    if(N.TREES)N.TREES.visible=!planMode;
    // ---- room colours on the plan (rooms or zones), plain floors elsewhere
    for(const r of L.ROOMS){const rm=roomMats[r.node];if(!rm)continue;const want=planMode?tmpC.set(L.roomCol(r,s.colour)):rm.base;rm.m.color.lerp(want,k)}
    roomPills.forEach(({r,p})=>{const on=planMode&&r.lv===s.level&&grow.HOUSE>.9;if(on){const cx=r.id==='entry'?4.6:(r.x0+r.x1)/2,cy=r.id==='entry'?-2.6:r.id==='hall'?-3.9:(r.y0+r.y1)/2;p.set(r.id==='bath'?'Bath':r.n).at(plan(cx,cy,(r.lv==='lower'?0:1.4)+.05)).show(true)}else p.show(false)});
    // ---- the readout pill
    let at=null,txt='';
    if(onSite){const alt=L.sunAlt(s.season,s.hour);if(alt>0){at=sunBall.position.clone().add(V3(0,1.4,0));txt=`Sun · ${L.clock(s.hour)} · ${Math.round(alt)}° up`}else{at=V3(0,6,0);txt='The Sun has set'}
      const f=V3(Math.sin(-N.HOUSE.rotation.y),0,-Math.cos(-N.HOUSE.rotation.y));pill.view.set('View').at(plan(2.75,2.75,0).add(f.multiplyScalar(14))).show(true);pill.street.set('Street').at(plan(-9,-14,2.5)).show(true)}
    else{pill.view.show(false);pill.street.show(false)}
    if(v==='massing'){at=plan(0,1,5.6);txt=`0${s.stage+1} · ${L.STAGES[s.stage].n}`}
    else if(key==='plans'){at=plan(-7,-4.5,(s.level==='lower'?0:1.4)+.1);txt=`${L.levelName(s.level)} · cut 1.2 m above the floor`}
    else if(key==='section'){at=V3(s.cut,6.4,-8);txt=`Section A–A · x = ${s.cut.toFixed(1)} m`}
    else if(v==='conv'){at=plan(-7,0,5.2);txt=L.DVIEWS[s.dview].long}
    if(at)pill.main.set(txt).at(at).show(true);else pill.main.show(false);
  }};
}
