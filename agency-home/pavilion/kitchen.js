import * as T from './vendor/three.webgpu.min.js';
import {RoundedBoxGeometry} from './vendor/RoundedBoxGeometry.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

export function fitKitchen(scene,oak,stone,glazeNormal){
 const bins=new Map(),mat=(color,roughness,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
 const hardware=mat(0x836b48,.35,.65),graphite=mat(0x282b2c,.48,.24),steel=mat(0xbec2c3,.31,.86),black=mat(0x111b1e,.14,.40),rubber=mat(0x161918,.84),milk=mat(0xe1ddd3,.46),glaze=mat(0xc3c1b7,.25),etch=mat(0x747e7c,.45,.53),timber=oak.clone();
 timber.color.setHex(0x99816b);const v=(x,y,z)=>new T.Vector3(x,y,z);
 function add(g,m,x,y,z,rot){if(rot)g.applyMatrix4(new T.Matrix4().makeRotationFromEuler(new T.Euler(...rot)));g.translate(x,y,z);
  if(m===timber&&g.attributes.uv){
    const p=g.attributes.position,uv=g.attributes.uv,offset=x*.573;
    for(let k=0;k<p.count;k++)uv.setXY(k,p.getY(k)/2.1+offset,(p.getX(k)+p.getZ(k))/.94);
   }
   if(g.index)g=g.toNonIndexed();if(!g.attributes.uv)g.setAttribute('uv',new T.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));if(!bins.has(m))bins.set(m,[]);bins.get(m).push(g)}
 function box(x,y,z,w,h,d,r,m){add(new RoundedBoxGeometry(w,h,d,2,Math.min(r,w*.45,h*.45,d*.45)),m,x,y,z)}
 function tube(points,rad,m){const p=points.map(a=>v(...a));add(new T.TubeGeometry(new T.CatmullRomCurve3(p),Math.max(12,p.length*6),rad,9),m,0,0,0)}
 function turn(x,y,z,profile,m){add(new T.LatheGeometry(profile.map(([radius,h])=>new T.Vector2(radius,h)),40),m,x,y,z)}
 const y=.981,back=-1.969,front=-1.348,far=-3.165,end=-.80,sinkX=-1.52;
 box(-1.985,.131,-1.702,2.33,.126,.49,.003,graphite);box(-1.983,.444,-1.681,2.35,.515,.571,.006,timber);
 // Hand-finished ceramic courses. Each tile has a shallow crown and a glazed, slightly irregular face.
 const grout=mat(0xafa897,.89);
 box(-1.985,1.40,-1.966,2.365,.80,.018,.002,grout);
 const tileTones=[0x73877c,0x84968a,0x799387,0x8b9c8d,0x819484,0x889b8e];
 const ceramics=tileTones.map((color,i)=>new T.MeshPhysicalMaterial({
  color,roughness:.22+i*.008,clearcoat:.74,clearcoatRoughness:.14+i*.007,
  normalMap:glazeNormal,normalScale:new T.Vector2(.37,.27),clearcoatNormalMap:glazeNormal,
  clearcoatNormalScale:new T.Vector2(.40,.31)
 }));
 // Separate piled-glaze edges surround an undulating face. Each strip occupies its own mortar bed.
 const cols=12,rows=12,pitchX=2.36/cols,pitchY=.747/rows;
 function firedFace(w,h,seed){
  const grid=new T.PlaneGeometry(w,h,8,4),position=grid.attributes.position,uv=grid.attributes.uv,colour=[];
  for(let k=0;k<position.count;k++){
   const u=uv.getX(k),v=uv.getY(k),edge=Math.min(u,1-u,v,1-v);
   const dome=Math.sin(Math.PI*u)*Math.sin(Math.PI*v);
   const warp=.0011*Math.sin(6.3*u+seed)*Math.sin(4*v+seed*.71);
   position.setZ(k,.0034*dome+warp);
   const tone=edge<.01?.81:1+.025*Math.sin(seed+u*2.7+v);
   colour.push(tone,tone,tone);
   uv.setXY(k,u*.64+(seed*.19)%1,v*.29+(seed*.36)%1);
  }
  grid.setAttribute('color',new T.Float32BufferAttribute(colour,3));
  grid.computeVertexNormals();return grid;
 }
 ceramics.forEach(m=>m.vertexColors=true);
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
  const seed=i*19+j*37,cx=far+(i+.5)*pitchX,cy=1.015+(j+.5)*pitchY;
  add(firedFace(pitchX-.0025,pitchY-.0023,seed),ceramics[(seed+i*j)%ceramics.length],cx,cy,-1.946+Math.sin(seed)*.0012);
 }
 // Inset upper fronts and projecting underside give the shelf a soffit and the glaze a highlight.
 const lacquer=mat(0xaaa797,.64),shadowLine=mat(0x484138,.76);
 box(-1.985,2.21,-1.82,2.36,.86,.31,.008,shadowLine);
 for(let i=0;i<4;i++){
  const x=-3.165+(i+.5)*.59;
  box(x,2.21,-1.647,.586,.85,.028,.005,lacquer);
  box(x,1.803,-1.631,.545,.009,.006,.002,timber);
 }
 box(-1.985,1.781,-1.794,2.36,.022,.293,.003,timber);
 const diffuser=new T.MeshStandardMaterial({color:0xf5dfbf,emissive:0xffdbaf,emissiveIntensity:.62,roughness:.52});
 box(-1.985,1.767,-1.74,2.23,.005,.009,.002,diffuser);
 // A real aperture in the solid-surface bench, with four returns under an undermount bowl.
 const left=sinkX-.235,right=sinkX+.235,near=-1.442,deep=-1.824;
 function roundRect(path,x0,y0,x1,y1,r){
  path.moveTo(x0+r,y0);path.lineTo(x1-r,y0);path.quadraticCurveTo(x1,y0,x1,y0+r);path.lineTo(x1,y1-r);path.quadraticCurveTo(x1,y1,x1-r,y1);path.lineTo(x0+r,y1);path.quadraticCurveTo(x0,y1,x0,y1-r);path.lineTo(x0,y0+r);path.quadraticCurveTo(x0,y0,x0+r,y0);return path
 }
 const counter=roundRect(new T.Shape(),far,-front,end,-back,.006);
 counter.holes.push(roundRect(new T.Path(),left,-near,right,-deep,.044));
 const counterMesh=new T.ExtrudeGeometry(counter,{depth:.026,bevelEnabled:true,bevelSize:.002,bevelThickness:.002,bevelSegments:2,curveSegments:12});
 counterMesh.rotateX(-Math.PI/2);add(counterMesh,stone,0,y-.028,0);
 box(-1.983,1.025,back+.009,2.36,.09,.019,.003,stone);
 const profile=[[-.23,0],[-.226,-.018],[-.207,-.147],[-.174,-.179],[0,-.185]];
 const bowl=new T.BufferGeometry(),pts=[],idx=[];
 for(const [width,h] of profile){for(let i=0;i<=64;i++){const t=i/64*2*Math.PI,c=Math.cos(t),s=Math.sin(t);
   pts.push(sinkX+Math.abs(width)*Math.sign(c)*Math.abs(c)**.28,y+h-.006,(deep+near)/2+Math.abs(width)*.815*Math.sign(s)*Math.abs(s)**.28)}}
 for(let j=0;j<profile.length-1;j++)for(let i=0;i<64;i++){const a=j*65+i;idx.push(a,a+1,a+65,a+1,a+66,a+65)}
 bowl.setAttribute('position',new T.Float32BufferAttribute(pts,3));bowl.setIndex(idx);bowl.computeVertexNormals();const bowlMetal=steel.clone();bowlMetal.color.setHex(0xbbbfc2);bowlMetal.roughness=.37;bowlMetal.side=T.DoubleSide;add(bowl,bowlMetal,0,0,0);
 turn(sinkX,.800,-1.635,[[.031,0],[.031,.003],[.019,.005],[.012,.003]],graphite);
 add(new T.CylinderGeometry(.021,.021,.006,36),steel,sinkX,.805,-1.635);
 for(let i=0;i<9;i++){const a=i*Math.PI*2/9;add(new T.CylinderGeometry(.0023,.0023,.001,9),rubber,sinkX+.014*Math.cos(a),.809,-1.635+.014*Math.sin(a))}
 tube([[sinkX+.13,y,-1.888],[sinkX+.13,1.203,-1.888],[sinkX+.13,1.293,-1.853],[sinkX+.13,1.298,-1.772],[sinkX+.13,1.266,-1.702],[sinkX+.13,1.215,-1.693]],.012,steel);
 turn(sinkX+.13,y,-1.888,[[.024,0],[.026,.006],[.019,.018],[.017,.089]],steel);
 tube([[sinkX+.145,1.04,-1.888],[sinkX+.202,1.057,-1.88],[sinkX+.203,1.114,-1.878]],.006,steel);
 // 600 mm oven with gasket, separate door glass and inner racks. Knobs rotate about the front axis.
 const oven=-2.65,z=front+.022;
 for(const [cx,w] of [[-3.056,.214],[-2.072,.552],[-1.546,.493],[-1.046,.493]]){
  box(cx,.551,front-.015,w-.008,.716,.031,.0035,timber);
  box(cx,.837,front+.024,w*.43,.012,.013,.005,hardware);for(const stop of [-1,1])box(cx+stop*w*.18,.837,front+.014,.010,.012,.020,.003,hardware)}
 box(oven,.548,z,.597,.708,.037,.006,graphite);box(oven,.81,z+.018,.586,.123,.013,.003,steel);
 box(oven,.488,z+.031,.54,.443,.022,.012,rubber);box(oven,.483,z+.041,.489,.344,.006,.009,black);
 for(let j=0;j<3;j++)box(oven,.414+j*.052,z+.045,.39,.002,.001,.0003,etch);
 for(const dx of [-.233,.233]){add(new T.CylinderGeometry(.026,.024,.023,36),graphite,oven+dx,.815,z+.033,[Math.PI/2,0,0]);box(oven+dx,.832,z+.046,.0024,.009,.002,.0003,milk)}
 box(oven,.812,z+.026,.126,.044,.004,.003,black);
 for(const dx of [-.218,.218])box(oven+dx,.713,z+.041,.016,.020,.065,.004,steel);
 box(oven,.716,z+.072,.457,.022,.023,.008,steel);
 // Four induction zones are 150–200 mm across, etched flat into a radiused glass surface.
 box(oven,y+.005,-1.655,.59,.009,.513,.004,black);
 for(const [dx,dz,r] of [[-.135,-.11,.082],[.132,-.11,.10],[-.13,.10,.097],[.135,.10,.076]]){
  add(new T.TorusGeometry(r,.0009,4,60),etch,oven+dx,y+.011,-1.655+dz,[Math.PI/2,0,0])}
 // Dark shadow seams and oak returns integrate the refrigerator into the tall end of the run.
 box(-3.815,1.105,-1.68,.028,2.08,.626,.003,timber);box(-3.154,1.105,-1.68,.022,2.08,.626,.003,timber);
 box(-3.486,2.139,-1.68,.688,.032,.624,.004,timber);
 const fridgeX=-3.486;
 box(fridgeX,1.109,-1.702,.625,2.06,.593,.012,graphite);
 for(const [h,cy] of [[1.267,1.505],[.726,.493]])box(fridgeX,cy,front+.038,.604,h,.050,.006,timber);
 for(const cy of [.676,1.166])box(fridgeX+.251,cy,front+.083,.014,.307,.039,.006,hardware);
 // Black pump, crimp ring, pale paper on amber glass. No borrowed brand graphics.
 const amber=new T.MeshPhysicalMaterial({color:0x814520,roughness:.21,clearcoat:1,clearcoatRoughness:.10,metalness:.06});
 const bottleX=sinkX-.34,bottleZ=-1.795;
 turn(bottleX,y,bottleZ,[[0,0],[.029,0],[.033,.005],[.034,.013],[.034,.098],[.032,.108],[.021,.119],[.013,.122],[.013,.138],[0,.138]],amber);
 const labelCanvas=document.createElement('canvas');labelCanvas.width=512;labelCanvas.height=192;const c=labelCanvas.getContext('2d');c.fillStyle='#ddd5c4';c.fillRect(0,0,512,192);c.fillStyle='#37362f';c.font='19px sans-serif';c.fillText('HAND WASH',73,69);c.fillRect(73,81,119,2);c.font='10px sans-serif';c.fillText('300 mL',74,101);
 const label=new T.CanvasTexture(labelCanvas);label.colorSpace=T.SRGBColorSpace;
 add(new T.CylinderGeometry(.0343,.0343,.060,48,1,true,Math.PI*.80,Math.PI*1.84),new T.MeshStandardMaterial({map:label,roughness:.88}),bottleX,y+.058,bottleZ);
 turn(bottleX,y+.122,bottleZ,[[.015,0],[.015,.019],[.009,.020],[.006,.025],[.006,.039],[.010,.041],[.010,.047]],rubber);
 box(bottleX+.014,y+.168,bottleZ,.048,.009,.016,.003,graphite);
 // Honed elliptical breakfast table with a recessed apron and two curved-back oak chairs.
 const oakSeat=oak.clone();oakSeat.color.setHex(0x9b7956);
 const tableX=-2.12,tableZ=.49;
 const edge=new T.Shape();edge.absellipse(0,0,.635,.355,0,Math.PI*2,false,0);
 const slab=new T.ExtrudeGeometry(edge,{depth:.034,bevelEnabled:true,bevelSegments:3,bevelSize:.008,bevelThickness:.005,curveSegments:48});slab.rotateX(-Math.PI/2);add(slab,stone,tableX,.785,tableZ);
 for(const dx of [-.30,.30])box(tableX+dx,.426,tableZ,.071,.69,.351,.022,oakSeat);
 const chairCord=mat(0xbbaa86,.98);
 function diningChair(x,z,rotation){
  const chair=new T.Group(), parts=[];
  function piece(g,m,px,py,pz){const o=new T.Mesh(g,m);o.position.set(px,py,pz);chair.add(o);parts.push(o)}
  function limb(a,b,r0,r1){const d=v(...b).sub(v(...a)),g=new T.CylinderGeometry(r1,r0,d.length(),16);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(v(0,1,0),d.normalize()));piece(g,oakSeat,...a.map((n,i)=>(n+b[i])/2))}
  const saddle=new RoundedBoxGeometry(.421,.041,.366,3,.020);
  piece(saddle,oakSeat,0,.463,0);
  // Cords span the seat and turn on its curved rail. They share one batched material.
  const rush=chairCord;
  for(let j=0;j<34;j++){
   const z=-.164+j*.0099,span=.385-.064*(Math.abs(z)/.169)**3;
   const curve=new T.CatmullRomCurve3([v(-span/2,.472,z),v(-span*.43,.491,z),v(0,.481,z),v(span*.43,.491,z),v(span/2,.472,z)]);
   piece(new T.TubeGeometry(curve,10,.0044,5),rush,0,0,0);
  }
  for(const sx of [-1,1])for(const sz of [-1,1])limb([sx*.159,.069,sz*.145],[sx*.126,.452,sz*.107],.014,.022);
  for(const sx of [-1,1])limb([sx*.136,.46,.108],[sx*.175,.747,.097],.016,.013);
  const back=new T.BoxGeometry(.451,.072,.032,30,3,1),bp=back.attributes.position;
  for(let i=0;i<bp.count;i++){
   const sx=bp.getX(i),u=sx/.2255,sy=bp.getY(i);
   bp.setXYZ(i,sx,.772+sy*(1-.28*u*u)-.035*u*u,.172+bp.getZ(i)-.125*u*u);
  }
  back.computeVertexNormals();piece(back,oakSeat,0,0,0);
  chair.position.set(x,0,z);chair.rotation.y=rotation;chair.updateWorldMatrix(true,true);
  for(const o of parts)add(o.geometry.applyMatrix4(o.matrixWorld),o.material,0,0,0)
 }
 diningChair(-2.93,.48,-Math.PI/2);diningChair(-1.31,.49,Math.PI/2);
 // A narrow rail, hand-thrown bowls and upright cutting boards keep the worktop clear.
 box(-2.855,1.544,-1.833,.57,.023,.23,.006,oak);
 for(const [ix,iz] of [[-2.83,-1.79],[-2.61,-1.81]])for(let i=0;i<2;i++)
  turn(ix,1.558+i*.017,iz,[[.029,0],[.053,.004],[.079,.036],[.081,.054],[.077,.055],[.07,.037],[.039,.01],[0,.008]],glaze);
 for(const [w,h,x] of [[.194,.309,-1.012],[.117,.217,-.955]])box(x,y+h/2,-1.924,w,h,.022,.011,timber);
 // A folded tea towel, two nesting cups and a thrown breakfast carafe establish human scale.
 const earthen=mat(0x67594b,.72),celadon=mat(0x899381,.39);
 turn(-2.26,.827,.51,[[.001,0],[.063,0],[.083,.016],[.089,.12],[.073,.168],[.044,.209],[.044,.237],[.048,.241],[.048,.247],[.040,.247],[.039,.224]],earthen);
 for(const [x,z,m] of [[-2.11,.58,celadon],[-1.96,.46,glaze]]){
  turn(x,.827,z,[[0,0],[.030,0],[.035,.008],[.041,.075],[.040,.080],[.036,.081],[.034,.073],[.026,.011],[0,.009]],m);
  tube([[x+.036,.843,z],[x+.061,.85,z],[x+.061,.881,z],[x+.040,.889,z]],.0045,m);
 }
 const tea=new T.PlaneGeometry(.29,.37,20,28),tp=tea.attributes.position,tu=tea.attributes.uv,tc=[];
 for(let k=0;k<tp.count;k++){
  const u=tu.getX(k),v=tu.getY(k),fold=.009*Math.sin(4*u*Math.PI+v*.8),bend=Math.max(0,.43-v);
  tp.setXYZ(k,-1.078+(u-.5)*.288+.012*Math.sin(v*3),y+.015+fold-bend*.35,-1.342-(v-.43)*.38+Math.min(0,v-.43)*.36);
  const stripe=(u>.094&&u<.16)||(u>.80&&u<.855),c=new T.Color(stripe?0x5e665b:0xb0a38e);tc.push(c.r,c.g,c.b);
 }
 tea.setAttribute('color',new T.Float32BufferAttribute(tc,3));tea.computeVertexNormals();
 add(tea,new T.MeshStandardMaterial({side:T.DoubleSide,vertexColors:true,roughness:1}),0,0,0);
 // Contact darkens gradually beneath the shelf, behind the plinth, and below the tableware.
 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;
 const ctx=shadowCanvas.getContext('2d'),gradient=ctx.createRadialGradient(32,32,0,32,32,32);
 gradient.addColorStop(0,'#231a13bf');gradient.addColorStop(.55,'#302a1e73');gradient.addColorStop(1,'#302a1e00');
 ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
 const contact=new T.MeshBasicMaterial({map:new T.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
 for(const [x,z,w,d,h] of [[-2.26,.51,.27,.19,.826],[-2.11,.58,.115,.092,.826],[-1.96,.46,.115,.092,.826],[-2.12,.49,1.53,.83,.073],[-2.31,-1.45,3.45,.42,.071]]){
  const shade=new T.Mesh(new T.PlaneGeometry(w,d),contact);shade.rotation.x=-Math.PI/2;shade.position.set(x,h,z);scene.add(shade);
 }
 const railShade=document.createElement('canvas');railShade.width=2;railShade.height=64;
 const sc=railShade.getContext('2d'),ramp=sc.createLinearGradient(0,0,0,64);
 ramp.addColorStop(0,'#36291d68');ramp.addColorStop(.29,'#36291d2d');ramp.addColorStop(1,'#36291d00');
 sc.fillStyle=ramp;sc.fillRect(0,0,2,64);
 const shade=new T.Mesh(new T.PlaneGeometry(.57,.095),new T.MeshBasicMaterial({map:new T.CanvasTexture(railShade),transparent:true,depthWrite:false}));
 shade.position.set(-2.855,1.485,-1.935);scene.add(shade);
 for(const [m,geos] of bins){const g=mergeGeometries(geos,false);const o=new T.Mesh(g,m);o.castShadow=o.receiveShadow=true;scene.add(o);for(const geo of geos)geo.dispose()}
}
