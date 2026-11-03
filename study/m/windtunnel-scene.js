import {GLTFLoader} from '../../ar/vendor/three/loaders/GLTFLoader.js';
// The wind tunnel scene: the Blender model (assets/models/windtunnel/build_windtunnel.py) of a single-seater on a rolling
// road in a chalk-white wind tunnel. The rear wing and its flap turn with the controls, the wheels, road and fan run with
// the wind speed, force arrows are scaled from the lesson's numbers (1 m of arrow = 5,000 N), and the smoke and streak
// particles ride the lesson's simplified 2D stream-function sketch (windtunnel.js, FLOW). It is an illustration, not CFD.
export function windtunnelScene(S,L){
  const {THREE,scene,renderer,camera,canvas}=S,host=canvas.parentElement,figure=host.parentElement,s=L.state,FLOW=L.FLOW;
  const D2R=Math.PI/180,clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),ease=(a,b,k)=>a+(b-a)*k;
  scene.background=new THREE.Color('#F5F1F2');scene.fog=null;S.ground.visible=false;S.setShadowBox(4.6,[-.2,0,0]);
  renderer.toneMappingExposure=1.0;if(S.bloom){S.bloom.threshold=.96;S.bloom.strength=.22;S.bloom.radius=.4}
  // ---------------------------------------------------------------- camera views (pulled back on tall, narrow screens)
  const VIEWS={drag:[[3.0,1.2,6.1],[-.55,.45,0]],downforce:[[-5.6,2.5,4.5],[-.9,.55,0]],forces:[[.3,1.25,9.4],[-.1,.62,0]],flow:[[1.2,1.75,8.6],[-.4,.62,0]],
    drs:[[-2.3,1.25,4.9],[-1.7,.72,0]],test:[[6.4,2.4,6.9],[-.1,.45,0]]};
  let aspectK=0;
  function setViews(aspect){const k=clamp(1.75/Math.max(.4,aspect),1,2.1);if(Math.abs(k-aspectK)<.05)return false;aspectK=k;
    for(const [n,[p,t]] of Object.entries(VIEWS)){const P=new THREE.Vector3(...p),Tg=new THREE.Vector3(...t);S.view(n,Tg.clone().add(P.sub(Tg).multiplyScalar(k)).toArray(),t,{min:1.6,max:16,dur:1.3})}return true}
  setViews(1.9);
  let N={},ready=false,lastView='';
  // ---------------------------------------------------------------- force arrows: drawn over everything, like a free-body diagram
  const amat=c=>new THREE.MeshStandardMaterial({color:new THREE.Color(c),roughness:.45,depthTest:false,transparent:true,opacity:.96});
  const mk=c=>{const a=S.arrow(c,{r:.045,mat:amat(c)});a.traverse(o=>{o.renderOrder=20;o.castShadow=false});scene.add(a);return a};
  const AR={drag:mk('#C2566A'),down:mk('#6A50BE'),weight:mk('#3B1737'),nf:mk('#3A6FB8'),nr:mk('#3A6FB8'),thrust:mk('#2A7D63')};
  const pill={drag:S.label({off:[-16,-26]}),down:S.label({off:[16,-10]}),weight:S.label({off:[16,10]}),nf:S.label({off:[16,-8]}),thrust:S.label({off:[14,24]}),main:S.label({cls:'big',off:[18,-34]}),aux:S.label({off:[-18,30]})};
  Object.values(pill).forEach(p=>p.hide());
  const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
  // ---------------------------------------------------------------- airflow: streaks (line segments coloured by speed) and smoke puffs
  const NA=S.mobile?420:900,NS=S.mobile?260:480;
  const A={x:new Float32Array(NA),h:new Float32Array(NA),z:new Float32Array(NA),stall:new Float32Array(NA)};
  // the streaks start from a rake of fixed heights, so together they trace out streamlines
  const RAKE=[];for(let h=.12;h<1.62;h+=.1)for(const z of [-.32,0,.32])RAKE.push([h,z]);
  const spawnA=(i,anyX)=>{A.x[i]=anyX?FLOW.X0+Math.random()*(FLOW.X1-FLOW.X0):FLOW.X1-.05-Math.random()*.25;const r=RAKE[i%RAKE.length];A.h[i]=r[0];A.z[i]=r[1];A.stall[i]=0;
    if(FLOW.blocked(A.x[i],A.h[i]))A.x[i]=FLOW.X1-.05};
  const sg=new THREE.BufferGeometry(),spos=new Float32Array(NA*6),scol=new Float32Array(NA*6);sg.setAttribute('position',new THREE.BufferAttribute(spos,3));sg.setAttribute('color',new THREE.BufferAttribute(scol,3));
  const smat=new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.7,depthWrite:false});const streaks=new THREE.LineSegments(sg,smat);streaks.frustumCulled=false;streaks.renderOrder=4;scene.add(streaks);
  const SLOW=new THREE.Color('#9C8AD0'),FAST=new THREE.Color('#D46A7E'),BG=new THREE.Color('#F5F1F2'),cc=new THREE.Color(),ct=new THREE.Color();
  const puffs=S.puffs(NS,'#7A5A96');puffs.renderOrder=6;scene.add(puffs);
  const P={x:new Float32Array(NS),h:new Float32Array(NS),z:new Float32Array(NS),age:new Float32Array(NS).fill(99),jz:new Float32Array(NS),jh:new Float32Array(NS)};let nextPuff=0,puffClock=0;
  const vel=[0,0];
  // ---------------------------------------------------------------- the Blender model
  let roadTex=null;const endplates=[];
  new GLTFLoader().load('/assets/models/windtunnel/windtunnel.glb',g=>{
    const root=g.scene;root.traverse(o=>{if(o.name)N[o.name]=o;if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
    scene.add(root);
    // calmer reflections on the gloss paint, so the plum stays plum in a bright white room
    root.traverse(o=>{if(o.isMesh&&o.material&&/body_plum|blush|chalk_paint|helmet/.test(o.material.name)){o.material.envMapIntensity=.55;if('clearcoatRoughness' in o.material)o.material.clearcoatRoughness=.12}});
    ['TUNNEL_FLOOR','TUNNEL_WALL_FAR','TUNNEL_WALL_NEAR','TUNNEL_CEILING','TURNTABLE','TURNTABLE_RING','ROLLING_ROAD','SCREEN_FRAME','FAN_WALL','CONTROL_WINDOW','CONTROL_WINDOW_FRAME'].forEach(n=>{const o=N[n];if(o)o.traverse(m=>{if(m.isMesh)m.castShadow=false})});
    N.TUNNEL?.traverse(m=>{if(m.isMesh&&/CEILING_LIGHT|SCREEN_BAR|WALL_LINE/.test(m.name))m.castShadow=false});
    // the rolling road: a belt that runs under the car at the wind's speed
    {const c=document.createElement('canvas');c.width=256;c.height=32;const x=c.getContext('2d');x.fillStyle='#A39AA0';x.fillRect(0,0,256,32);x.fillStyle='#B6AEB3';for(let i=0;i<8;i++)x.fillRect(i*32,0,10,32);
      roadTex=new THREE.CanvasTexture(c);roadTex.colorSpace=THREE.SRGBColorSpace;roadTex.wrapS=roadTex.wrapT=THREE.RepeatWrapping;const m=N.ROLLING_ROAD.material;m.map=roadTex;m.color.set('#ffffff');m.needsUpdate=true}
    // the rear endplates fade to see-through in the airflow and flap views, so the wing's side profile shows
    const eps=[];root.traverse(o=>{if(o.isMesh&&/^(REAR_ENDPLATE|ENDPLATE_STRIPE)/.test(o.name))eps.push(o)});
    for(const m of eps){m.material=m.material.clone();m.material.transparent=true;m.castShadow=false;endplates.push(m)}
    // tap the rear wing to open or close the flap; drag the smoke wand up and down
    const wingMeshes=[N.REAR_WING_MAIN,N.REAR_WING_FLAP_MESH].filter(Boolean);
    wingMeshes.forEach(m=>S.pick(m,()=>{s.drs=!s.drs;S.api.redraw()}));
    const carriage=N.WAND_CARRIAGE||N.SMOKE_WAND;
    if(carriage)S.dragger(carriage,{normal:new THREE.Vector3(0,0,1),move:p=>{s.wand=Math.round(clamp(p.y,.1,1.5)*20)/20;if(s.view!=='flow'&&s.view!=='test')s.view='flow'}});
    FLOW.solve(s.wing,s.drs);for(let i=0;i<NA;i++)spawnA(i,true);
    ready=true;S.goView(s.view,true);lastView=s.view;
    document.getElementById('k-main').setAttribute('aria-hidden','true');figure.classList.add('s3-on');host.style.visibility='visible';
    canvas.setAttribute('aria-label','An open-wheel race car made in Blender, on a rolling road in a wind tunnel, with force arrows and smoke lines. Drag to turn, plus and minus to zoom. Tap the rear wing to open the flap; drag the smoke wand up and down.');
    document.documentElement.dataset.windtunnelAsset='ready';
  },undefined,e=>{host.style.visibility='hidden';figure.classList.remove('s3-on');document.getElementById('k-main').removeAttribute('aria-hidden');document.documentElement.dataset.windtunnelAsset='fallback';console.warn('Wind tunnel model unavailable',e)});

  // the smoke wand's own line: a soft tube along the streamline from the nozzle, rebuilt when the wand or the wing moves
  const smokeMat=new THREE.MeshBasicMaterial({color:new THREE.Color('#5E3F75'),transparent:true,opacity:.68,depthWrite:false});let smokeTube=null,smokeKey='';
  function smokeLine(h){const k=h.toFixed(2)+'|'+s.wing+'|'+s.drs;if(k===smokeKey)return;smokeKey=k;if(smokeTube){scene.remove(smokeTube);smokeTube.geometry.dispose()}
    const p=FLOW.trace(4.2,h,600,.03).map(([x,z],i)=>new THREE.Vector3(x,z,0));if(p.length<4){smokeTube=null;return}
    smokeTube=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p),Math.min(400,p.length*2),.036,8,false),smokeMat);smokeTube.renderOrder=5;scene.add(smokeTube)}
  let wingA=s.wing,flapA=L.flapAngle(s.drs),wandH=s.wand;
  return {resize(w,h){if(setViews(w/Math.max(1,h))&&ready)S.goView(s.view,true)},update(st,stp,dt,t){
    if(!ready)return;const v=s.view,k=Math.min(1,dt*6),f=L.F();
    if(v!==lastView){lastView=v;S.goView(v)}
    FLOW.solve(s.wing,s.drs);
    const U=S.REDUCED?0:s.speed/300*7;            // the particles' speed on screen in m/s: far slower than the real air
    // ---- the car: the rear wing and flap turn, the wheels spin, the road and the fan run
    wingA=ease(wingA,s.wing,k);flapA=ease(flapA,L.flapAngle(s.drs),k);
    N.REAR_WING.rotation.set(0,0,-wingA*D2R);
    const epo=(v==='drs'||v==='flow')?.28:1;endplates.forEach(m=>{m.material.opacity=ease(m.material.opacity,epo,k);m.material.depthWrite=m.material.opacity>.95});N.REAR_WING_FLAP.rotation.set(0,0,-flapA*D2R);
    for(const [n,r] of [['WHEEL_FL',.33],['WHEEL_FR',.33],['WHEEL_RL',.345],['WHEEL_RR',.345]])if(N[n])N[n].rotation.z-=dt*U/r;
    if(roadTex)roadTex.offset.x+=dt*U*.5;
    if(N.TUNNEL_FAN)N.TUNNEL_FAN.rotation.x+=dt*U*.9;
    wandH=ease(wandH,s.wand,k);if(N.SMOKE_WAND)N.SMOKE_WAND.position.y=wandH;
    // ---- streaks: every particle rides the stream-function sketch; colour shows its speed (lavender slow, rose fast)
    const showA=s.speed>0&&v!=='forces';streaks.visible=showA;smat.opacity=v==='flow'?.95:.4;
    if(showA){for(let i=0;i<NA;i++){FLOW.vel(A.x[i],A.h[i],vel);const sp=Math.hypot(vel[0],vel[1]);
        A.x[i]+=vel[0]*U*dt;A.h[i]+=vel[1]*U*dt;A.stall[i]=sp<.06?A.stall[i]+dt:0;
        if(A.x[i]<FLOW.X0+.1||A.h[i]<.01||A.h[i]>FLOW.Z1-.05||A.stall[i]>1.5||FLOW.blocked(A.x[i],A.h[i]))spawnA(i,false);
        const len=.22+.3*sp,j=i*6,ux=sp>1e-4?vel[0]/sp:-1,uz=sp>1e-4?vel[1]/sp:0;
        spos[j]=A.x[i];spos[j+1]=A.h[i];spos[j+2]=A.z[i];spos[j+3]=A.x[i]-ux*len;spos[j+4]=A.h[i]-uz*len;spos[j+5]=A.z[i];
        cc.copy(SLOW).lerp(FAST,clamp((sp-.7)/.8,0,1));ct.copy(cc).lerp(BG,.75);
        scol[j]=cc.r;scol[j+1]=cc.g;scol[j+2]=cc.b;scol[j+3]=ct.r;scol[j+4]=ct.g;scol[j+5]=ct.b}
      sg.attributes.position.needsUpdate=true;sg.attributes.color.needsUpdate=true}
    // ---- smoke from the wand: soft puffs that drift with the flow and slowly spread
    const showP=s.speed>0&&(v==='flow'||v==='test');puffs.visible=showP;
    if(showP)smokeLine(Math.round(wandH*100)/100);if(smokeTube)smokeTube.visible=showP;
    if(showP){puffClock+=dt;const rate=60+U*30;while(puffClock>1/rate){puffClock-=1/rate;const i=nextPuff;nextPuff=(nextPuff+1)%NS;
        P.x[i]=4.24;P.h[i]=wandH;P.z[i]=0;P.age[i]=0;P.jz[i]=(Math.random()*2-1);P.jh[i]=(Math.random()*2-1)}
      puffs.material.uniforms.scale.value=(host.clientHeight||400)/(2*Math.tan(camera.fov*D2R/2));
      for(let i=0;i<NS;i++){if(P.age[i]>30){puffs.put(i,0,-50,0,0,0);continue}
        FLOW.vel(P.x[i],P.h[i],vel);P.x[i]+=vel[0]*U*dt;P.h[i]+=vel[1]*U*dt+P.jh[i]*.012*dt;P.z[i]+=P.jz[i]*.05*dt;P.age[i]+=dt;
        const gone=P.x[i]<FLOW.X0+.2||FLOW.blocked(P.x[i],P.h[i]);if(gone)P.age[i]=99;
        puffs.put(i,P.x[i],P.h[i],P.z[i],gone?0:clamp(.5-P.age[i]*.025,.12,.5)*Math.min(1,P.age[i]*8),.12+P.age[i]*.05)}
      puffs.done()}
    // ---- force arrows and their labels: 1 m = 2,000 N when only the horizontal forces are shown, 1 m = 5,000 N for the full diagram
    const NPA=(v==='drag'||v==='drs')?1/2000:1/5000,sc=NPA>1/3000?'arrow scale 1 m = 2,000 N':'arrow scale 1 m = 5,000 N';
    const on={drag:['drag','test','drs','forces'].includes(v),down:['downforce','forces','drs','test'].includes(v),weight:['downforce','forces'].includes(v),n:v==='forces',thrust:v==='forces'};
    const tip=(a,from,vec)=>from.clone().add(vec.clone().multiplyScalar(NPA));
    const dragFrom=V3(-2.45,.6,0),dragVec=V3(-f.D,0,0);
    if(on.drag){AR.drag.set(dragFrom,dragVec,NPA);pill.drag.set(`<b>Drag ${L.KN(f.D)}</b><small>${sc}</small>`).at(tip(0,dragFrom,dragVec)).show(f.D>1)}else{AR.drag.visible=false;pill.drag.hide()}
    const dTop=V3(v==='drs'?-2.15:-.45,(v==='drs'?1.25:1.2)+f.L*NPA,0);
    if(on.down){AR.down.set(dTop,V3(0,-f.L,0),NPA);pill.down.set(`<b>Downforce ${L.KN(f.L)}</b>${v==='forces'?'':`<small>${sc}</small>`}`).at(dTop).show(f.L>1)}else{AR.down.visible=false;pill.down.hide()}
    const com=N.CENTRE_OF_MASS?N.CENTRE_OF_MASS.getWorldPosition(new THREE.Vector3()):V3(-.25,.3,0);
    if(on.weight){AR.weight.set(com,V3(0,-L.WEIGHT,0),NPA);pill.weight.set(`<b>Weight ${L.KN(L.WEIGHT)}</b>`).at(tip(0,com,V3(0,-L.WEIGHT,0))).show()}else{AR.weight.visible=false;pill.weight.hide()}
    const nTot=L.WEIGHT+f.L;
    if(on.n){AR.nf.set(V3(1.55,0,0),V3(0,nTot/2,0),NPA);AR.nr.set(V3(-1.62,0,0),V3(0,nTot/2,0),NPA);pill.nf.set(`<b>Normal ${L.KN(nTot)}</b><small>both axles</small>`).at(V3(1.55,nTot/2*NPA,0)).show()}else{AR.nf.visible=AR.nr.visible=false;pill.nf.hide()}
    if(on.thrust){const fr=V3(-1.62,.03,0);AR.thrust.set(fr,V3(f.D,0,0),NPA);pill.thrust.set(`<b>Thrust ${L.KN(f.D)}</b>`).at(tip(0,fr,V3(f.D,0,0))).show(f.D>1)}else{AR.thrust.visible=false;pill.thrust.hide()}
    // ---- one readout where it matters
    let at=null,txt='';pill.aux.hide();
    if(s.speed<=0){at=V3(0,1.3,0);txt='<b>Wind off</b><small>turn up the wind speed</small>'}
    else if(v==='forces'){at=V3(-2.4,1.25,0);txt=`<b>P = Fv = ${L.fmt(f.P/1000)} kW</b><small>${f.P>450000?'more than the 450 kW engine':'thrust = drag: forces balanced'}</small>`}
    else if(v==='flow'){at=V3(4.25,wandH,0);const g=L.smokeGoes();txt=`<b>Smoke wand · ${L.fmt(s.wand,2)} m</b><small>${g==='under'?'smoke passes under the rear wing':g==='into'?'smoke hits the rear wing':g==='over'?'smoke passes over the rear wing':'smoke passes well above'}</small>`;
      const E=L.elements(s.wing,s.drs)[0].p[4];pill.aux.set('<b>Faster air under the wing</b><small>lower pressure · simplified sketch</small>').at(V3(E[0],E[1]-.12,0)).show()}
    else if(v==='drs'){const fl=N.REAR_WING_FLAP_MESH;at=fl?fl.getWorldPosition(new THREE.Vector3()).add(V3(.12,.08,0)):V3(-2.3,1,0);txt=s.drs?'<b>Flap open: slot open</b><small>less drag, less downforce</small>':'<b>Flap closed</b><small>tap the wing to open it</small>'}
    else if(v==='downforce'){at=null}
    if(at)pill.main.set(txt).at(at).show();else pill.main.hide();
  }};
}
