// assembly Print Lab: a parametric downhill-bike display model you can print.
// Look and proportions follow the downhill build in /study/m/bike.js: a long, low frame with a sloping top tube,
// a coil shock driven by a rocker link, a dual-crown fork with gold stanchions and cream lowers, chunky knobbly
// tyres, flat pedals, riser bars and a low saddle. The frame points below are that bike's, in its own units
// (1 unit is 1/32 of the tyre's outside diameter here), so wheel size scales the whole bike and wheelbase
// stretches the front end.
// Units are millimetres. Three.js space is Y-up with the bike pointing +X and its drive side facing +Z.
// The STL and 3MF exports turn the model Z-up for slicers and sit it on the bed.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

export const DEFAULTS={name:'My downhill bike',wheelbase:125,wheelDiameter:70,frame:'#353B4D',accent:'#F3E9D6',suspension:200,detail:'standard',base:true};
export const RANGES={wheelbase:[110,170,5],wheelDiameter:[54,102,2],suspension:[160,220,10]};
// colours from the downhill machine's garage (frame) and the kit's pastel family (details)
export const FRAME_SWATCHES=[['Black','#353B4D'],['Red','#D9533F'],['Teal','#3C9888'],['Sky','#6FA3E8']];
export const DETAIL_SWATCHES=[['Cream','#F3E9D6'],['Gold','#D9A646'],['Mint','#BFE8D6'],['Blush','#F3B8C8']];
export const HEAD_ANGLE=63; // degrees, the reference downhill build's head angle

// The wheel must suit the wheelbase or the tyres hit the frame: keep wheelbase ÷ diameter between 1.65 and 2.05.
export function wheelRange(wb){return[Math.ceil(wb/2.05/2)*2,Math.floor(wb/1.65/2)*2]}
export function normalise(opt={}){
 const o={...DEFAULTS,...opt};
 const num=(v,a,b,d)=>{v=Number(v);return Number.isFinite(v)?Math.min(b,Math.max(a,v)):d};
 o.wheelbase=num(o.wheelbase,RANGES.wheelbase[0],RANGES.wheelbase[1],DEFAULTS.wheelbase);
 const [lo,hi]=wheelRange(o.wheelbase);o.wheelDiameter=num(o.wheelDiameter,lo,hi,Math.min(hi,Math.max(lo,DEFAULTS.wheelDiameter)));
 o.suspension=num(o.suspension,RANGES.suspension[0],RANGES.suspension[1],DEFAULTS.suspension);
 o.detail=o.detail==='fine'?'fine':'standard';o.base=o.base!==false;
 const hex=v=>/^#[0-9a-f]{6}$/i.test(String(v));if(!hex(o.frame))o.frame=DEFAULTS.frame;if(!hex(o.accent))o.accent=DEFAULTS.accent;
 o.name=String(o.name??'').trim().slice(0,30)||DEFAULTS.name;
 return o;
}

// ---------------------------------------------------------------- the layout (shared with drawing.js)
// Side-elevation points in millimetres: x along the bike (wheelbase centred on 0), y up from the plinth top.
export function bikeLayout(opt={}){
 const o=normalise(opt),s=o.wheelDiameter/32,wbU=o.wheelbase/s;
 const ha=HEAD_ANGLE*Math.PI/180,u=[-Math.cos(ha),Math.sin(ha)],f=[Math.sin(ha),Math.cos(ha)];
 const add=(p,d,k)=>[p[0]+d[0]*k,p[1]+d[1]*k];
 const toward=(a,b,d)=>{const dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy);return[a[0]+dx/L*d,a[1]+dy/L*d]};
 const RA=[-27,16],FA=[-27+wbU,16];
 const HB=add(FA,u,23),HT=add(HB,u,5.5),UC=add(HT,u,1.25);
 const U={RA,FA,BB:[0,14.5],HB,HT,LC:add(HB,u,-0.9),UC,CL:[UC[0]+2.0,UC[1]+1.1],
  ST:[-8,35],SEAT:[-10.4,37.4],TT:[-6.8,31.5],MP:[-2.6,19.6],RK:[-11.5,29.5],RP:[-6.6,31.6],
  SH0:[3.6,19.8],SH1:[-1.6,32.6],PF:[6.6,14.5],PR:[-6.6,14.5]};
 // the stays run wide around the tyre, then step in to the main pivot and the rocker
 U.K1=toward(RA,U.MP,17.4);U.K2=toward(RA,U.RK,17.4);
 const shift=-(RA[0]+FA[0])/2,P={};
 for(const k in U)P[k]=[(U[k][0]+shift)*s,U[k][1]*s];
 const mm=v=>v*s,R=mm(16);
 const dims={
  R,tyreC:mm(13.4),tyreT:mm(1.8),tyreHalf:mm(2.15),rim:mm(11.75),
  forkZ:mm(2.75),stayZ:mm(2.45),barHalf:mm(15.6),barRise:mm(1.5),barSweep:mm(.55),barR:mm(.55),gripR:mm(.78),
  pedalZ:mm(4.4),pedalHalf:mm(1.5),
  down:[mm(1.3),mm(1.1)],top:mm(.92),seat:mm(.98),head:mm(1.32),chain:mm(.62),sstay:mm(.52),stanchion:mm(.7),lower:mm(1.0),
  saddleLen:mm(9.4),saddleHalf:mm(2.05),saddleTop:P.SEAT[1]+mm(1.3)
 };
 const margin=6,x0=P.RA[0]-R-margin,x1=P.FA[0]+R+margin,len=x1-x0;
 const plinth=o.base?{x0,x1,len,width:Math.max(46,Math.round(len*.32)),thick:6}:null;
 return{o,s,u,f,P,dims,plinth};
}

// ---------------------------------------------------------------- the model
export function createBike(_three,opt={}){
 const L=bikeLayout(opt),{o,s,P,dims,plinth}=L,fine=o.detail==='fine';
 const mm=v=>v*s,V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),Y=V(0,1,0);
 const at=(p,z=0)=>V(p[0],p[1],z);
 const u3=V(L.u[0],L.u[1],0),f3=V(L.f[0],L.f[1],0);
 const SEG=fine?20:12,MIN_R=.45; // thinnest printable rod: 0.9 mm across
 const thin=r=>Math.max(MIN_R,r);
 const buckets=new Map();
 const put=(key,geo)=>{if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(geo)};

 // primitives (each one is a closed, outward-facing solid so the exports slice cleanly)
 function rod(key,a,b,r1,r2=r1,sides=SEG){const d=V().subVectors(b,a),len=d.length();if(len<1e-6)return;
  const g=new THREE.CylinderGeometry(r2,r1,len,sides,1,false);
  g.applyMatrix4(new THREE.Matrix4().compose(V().addVectors(a,b).multiplyScalar(.5),new THREE.Quaternion().setFromUnitVectors(Y,d.normalize()),V(1,1,1)));put(key,g)}
 function ball(key,p,r){const g=new THREE.SphereGeometry(r,SEG,Math.max(6,Math.round(SEG*.6)));g.translate(p.x,p.y,p.z);put(key,g)}
 function capsule(key,a,b,r1,r2=r1){rod(key,a,b,r1,r2);ball(key,a,r1);ball(key,b,r2)}
 function zcyl(key,p,r,z0,z1,sides=SEG){const g=new THREE.CylinderGeometry(r,r,Math.abs(z1-z0),sides);g.rotateX(Math.PI/2);g.translate(p.x,p.y,(z0+z1)/2);put(key,g)}
 function obox(key,size,centre,xAxis,yAxis,radius=0){
  const x=xAxis.clone().normalize(),z=V().crossVectors(x,yAxis).normalize(),y=V().crossVectors(z,x);
  const rr=Math.min(radius,size[0]/2-1e-3,size[1]/2-1e-3,size[2]/2-1e-3);
  const g=rr>0.05?new RoundedBoxGeometry(size[0],size[1],size[2],2,rr):new THREE.BoxGeometry(size[0],size[1],size[2]);
  g.applyMatrix4(new THREE.Matrix4().makeBasis(x,y,z).setPosition(centre));put(key,g)}
 function extrude(key,shape,z0,thick,bevel=0){
  const b=Math.min(bevel,thick*.4);
  const g=new THREE.ExtrudeGeometry(shape,{depth:Math.max(.05,thick-2*b),bevelEnabled:b>0,bevelThickness:b,bevelSize:b,bevelSegments:2,curveSegments:fine?18:10});
  g.translate(0,0,z0-thick/2+b);put(key,g);return g}
 const poly=pts=>new THREE.Shape(pts.map(p=>new THREE.Vector2(p[0],p[1])));
 function ring(key,c,rOut,rIn,z,th,n=fine?64:40){const sh=new THREE.Shape();sh.absarc(c.x,c.y,rOut,0,Math.PI*2,false);
  const h=new THREE.Path();h.absarc(c.x,c.y,rIn,0,Math.PI*2,true);sh.holes.push(h);extrude(key,sh,z,th);}
 // convex outline around a few circles (for link plates and lugs)
 function hull(circles,n=14){const pts=[];circles.forEach(([x,y,r])=>{for(let i=0;i<n;i++){const a=i/n*Math.PI*2;pts.push([x+Math.cos(a)*r,y+Math.sin(a)*r])}});
  pts.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);const lo=[],hi=[];
  for(const p of pts){while(lo.length>1&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p)}
  for(let i=pts.length-1;i>=0;i--){const p=pts[i];while(hi.length>1&&cr(hi[hi.length-2],hi[hi.length-1],p)<=0)hi.pop();hi.push(p)}
  hi.pop();lo.pop();return lo.concat(hi)}
 // a tube along a curve with flat end caps, so it is watertight
 function cappedTube(curve,tseg,r,rseg=8){
  const g=new THREE.TubeGeometry(curve,tseg,r,rseg,false);
  const pos=g.attributes.position,cap=[];
  for(const [i,t,sign] of [[0,0,-1],[tseg,1,1]]){const c=curve.getPointAt(t),T=curve.getTangentAt(t).multiplyScalar(sign);
   for(let j=0;j<rseg;j++){const a=V().fromBufferAttribute(pos,i*(rseg+1)+j),b=V().fromBufferAttribute(pos,i*(rseg+1)+j+1);
    const n=V().subVectors(a,c).cross(V().subVectors(b,c));const tri=n.dot(T)>=0?[c,a,b]:[c,b,a];
    tri.forEach(p=>cap.push(p.x,p.y,p.z))}}
  const cg=new THREE.BufferGeometry();cg.setAttribute('position',new THREE.Float32BufferAttribute(cap,3));cg.computeVertexNormals();return[g,cg]}

 // ---------------- wheels: knobbly tyre, rim, laced spokes, hub, rotor and caliper
 function wheel(c,front){
  const Rc=dims.tyreC,rt=dims.tyreT;
  const tyre=new THREE.TorusGeometry(Rc,rt,fine?18:12,fine?84:56);tyre.translate(c.x,c.y,0);put('rubber',tyre);
  const n=fine?36:30;
  for(let k=0;k<n;k++){const a=-Math.PI/2+k*2*Math.PI/n,rad=V(Math.cos(a),Math.sin(a)),tan=V(-Math.sin(a),Math.cos(a));
   obox('rubber',[mm(1.1),mm(1.0),mm(1.55)],c.clone().addScaledVector(rad,mm(15.5)),tan,rad); // centre knob, its face on the 16-unit radius
   const a2=a+Math.PI/n,rad2=V(Math.cos(a2),Math.sin(a2)),tan2=V(-Math.sin(a2),Math.cos(a2));
   for(const sg of [-1,1]){const phi=sg*.95,nrm=rad2.clone().multiplyScalar(Math.cos(phi)).add(V(0,0,Math.sin(phi)));
    obox('rubber',[mm(.95),mm(.8),mm(.9)],c.clone().addScaledVector(rad2,Rc).addScaledVector(nrm,rt+mm(.18)),tan2,nrm)}}
  const rim=new THREE.TorusGeometry(dims.rim,mm(.55),8,fine?72:48);rim.translate(c.x,c.y,0);put('dark',rim);
  zcyl('steel',c,mm(.95),-mm(2.6),mm(2.6));
  for(const z of [-mm(1.2),mm(1.2)])zcyl('steel',c,mm(1.55),z-mm(.16),z+mm(.16));
  zcyl('steelDark',c,mm(.5),-(front?mm(3.5):mm(3.0)),front?mm(3.5):mm(3.0),10);
  const ns=fine?24:16;
  for(let i=0;i<ns;i++){const a=i*Math.PI*2/ns,side=i%2?1:-1,a2=a+side*.42;
   rod('steelDark',V(c.x+Math.cos(a)*mm(1.35),c.y+Math.sin(a)*mm(1.35),side*mm(1.2)),V(c.x+Math.cos(a2)*mm(11.6),c.y+Math.sin(a2)*mm(11.6),0),thin(mm(.16)),thin(mm(.16)),6)}
  // disc brake on the non-drive side
  const rz=-mm(1.9),rth=Math.max(.8,mm(.3));
  ring('steel',c,mm(3.7),mm(2.75),rz,rth);
  zcyl('steel',c,mm(1.45),rz-rth/2,rz+rth/2);
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5+.3,d=V(Math.cos(a),Math.sin(a));obox('steel',[mm(2.2),mm(.6),rth],c.clone().addScaledVector(d,mm(1.95)).setZ(rz),d,V(-d.y,d.x))}
  const ca=(front?140:25)*Math.PI/180,cd=V(Math.cos(ca),Math.sin(ca));
  obox('dark',[mm(1.25),mm(1.9),mm(1.5)],c.clone().addScaledVector(cd,mm(3.7)).setZ(-mm(2.2)),cd,V(-cd.y,cd.x),mm(.3));
 }
 const RA=at(P.RA),FA=at(P.FA),BB=at(P.BB);
 wheel(RA,false);wheel(FA,true);

 // ---------------- front triangle
 const HB=at(P.HB),HT=at(P.HT),UC=at(P.UC),LC=at(P.LC),CL=at(P.CL),ST=at(P.ST),TT=at(P.TT),MP=at(P.MP),SEAT=at(P.SEAT);
 rod('frame',HB.clone().addScaledVector(u3,-mm(.25)),HT.clone().addScaledVector(u3,mm(.2)),dims.head*1.05,dims.head*.95); // head tube
 const dtTop=HB.clone().addScaledVector(u3,mm(1.1)),ttFront=HT.clone().addScaledVector(u3,-mm(.95));
 capsule('frame',dtTop,BB,dims.down[0],dims.down[1]);                // down tube, oversized at the head
 rod('frame',ttFront,TT,dims.top,dims.top*.92);ball('frame',TT,dims.top*.95); // sloping top tube
 rod('frame',BB,ST,dims.seat,dims.seat*.96);                          // seat tube
 const sDir=V().subVectors(ST,BB).normalize();
 rod('dark',ST.clone().addScaledVector(sDir,-mm(.55)),ST.clone().addScaledVector(sDir,mm(.25)),dims.seat*1.18); // seat clamp
 // head gusset: a web between the top and down tubes behind the head tube
 {const tdir=V().subVectors(TT,ttFront).normalize(),ddir=V().subVectors(BB,dtTop).normalize();
  const g1=ttFront.clone().addScaledVector(tdir,mm(3.4)),g2=dtTop.clone().addScaledVector(ddir,mm(4.2));
  extrude('frame',poly([[ttFront.x,ttFront.y],[g1.x,g1.y],[g2.x,g2.y],[dtTop.x,dtTop.y]]),0,mm(1.05),mm(.18))}
 zcyl('frame',BB,mm(1.35),-mm(1.75),mm(1.75));                        // bottom bracket shell
 // main pivot lug on the seat tube and shock mount on the down tube
 extrude('frame',poly(hull([[MP.x,MP.y,mm(1.05)],[P.BB[0]-mm(.4),P.BB[1]+mm(2.2),mm(1.0)]])),0,mm(1.9),mm(.2));
 zcyl('dark',MP,mm(.78),-mm(1.55),mm(1.55));
 const SH0=at(P.SH0),SH1=at(P.SH1),ddn=V().subVectors(BB,dtTop).normalize();
 obox('frame',[mm(2.2),mm(1.5),mm(1.7)],SH0.clone().addScaledVector(V(-ddn.y,ddn.x),-mm(.35)),ddn,V(-ddn.y,ddn.x),mm(.35));

 // ---------------- rear triangle: chainstays, seatstays, dropouts and the rocker link
 const K1=at(P.K1),K2=at(P.K2),RK=at(P.RK),RP=at(P.RP),sz=dims.stayZ;
 for(const sg of [-1,1]){
  capsule('frame',RA.clone().setZ(sg*sz),K1.clone().setZ(sg*sz),dims.chain);
  capsule('frame',K1.clone().setZ(sg*sz),MP.clone().setZ(sg*mm(1.05)),dims.chain,dims.chain*1.05);
  capsule('frame',RA.clone().setZ(sg*sz),K2.clone().setZ(sg*sz),dims.sstay);
  capsule('frame',K2.clone().setZ(sg*sz),RK.clone().setZ(sg*mm(.85)),dims.sstay);
  const cs=V().subVectors(K1,RA).normalize();
  obox('frame',[mm(2.7),mm(2.5),mm(.8)],RA.clone().addScaledVector(cs,mm(.35)).setZ(sg*sz),cs,V(-cs.y,cs.x),mm(.45));
  extrude('dark',poly(hull([[RK.x,RK.y,mm(.72)],[RP.x,RP.y,mm(.85)],[SH1.x,SH1.y,mm(.72)]])),sg*mm(1.2),Math.max(.9,mm(.45)),mm(.12));
 }
 for(const p of [RK,RP,SH1])zcyl('steelDark',p,mm(.42),-mm(1.62),mm(1.62),10);
 zcyl('frame',RP,mm(.75),-mm(1.0),mm(1.0));

 // ---------------- coil shock with a piggyback reservoir; travel sets the number of coils (visual only)
 {const d=V().subVectors(SH1,SH0),len=d.length();d.normalize();const nrm=V(-d.y,d.x);const fwd=nrm.x>0?nrm:nrm.clone().negate();
  const p=k=>SH0.clone().addScaledVector(d,len*k);
  zcyl('dark',SH0,mm(.55),-mm(.8),mm(.8));zcyl('dark',SH1,mm(.55),-mm(.95),mm(.95));
  rod('dark',SH0.clone().addScaledVector(d,mm(.35)),p(.6),mm(.58));                     // body
  rod('steel',p(.56),SH1.clone().addScaledVector(d,-mm(.45)),mm(.3));                    // shaft
  capsule('dark',p(.32).addScaledVector(fwd,mm(1.0)),p(.62).addScaledVector(fwd,mm(1.0)),mm(.48)); // reservoir
  rod('dark',p(.6).addScaledVector(fwd,mm(.2)),p(.6).addScaledVector(fwd,mm(.9)),mm(.32));
  rod('dark',p(.15),p(.19),mm(1.18));rod('dark',p(.83),p(.87),mm(1.18));               // spring collars
  const turns=Math.max(6,Math.min(9,Math.round(o.suspension/25))),k0=.19,k1=.83,cr=mm(.95),wire=thin(mm(.22)),per=fine?44:28,pts=[];
  for(let i=0;i<=turns*per;i++){const t=i/(turns*per),a=t*turns*Math.PI*2;pts.push(V(Math.cos(a)*cr,(k0+(k1-k0)*t)*len,Math.sin(a)*cr))}
  // the helix is built standing up in local space, then turned to lie along the shock
  const M=new THREE.Matrix4().compose(SH0,new THREE.Quaternion().setFromUnitVectors(Y,d),V(1,1,1));
  cappedTube(new THREE.CatmullRomCurve3(pts),turns*per,wire,7).forEach(g=>{g.applyMatrix4(M);put('coil',g)});
 }

 // ---------------- dual-crown fork
 const fz=dims.forkZ,top=FA.clone().addScaledVector(u3,mm(13.8));
 for(const sg of [-1,1]){
  capsule('accent',FA.clone().addScaledVector(u3,-mm(.9)).setZ(sg*fz),top.clone().setZ(sg*fz),dims.lower,dims.lower*.98); // lowers
  rod('dark',top.clone().addScaledVector(u3,-mm(.35)).setZ(sg*fz),top.clone().addScaledVector(u3,mm(.3)).setZ(sg*fz),dims.lower*1.1); // seal
  rod('gold',FA.clone().addScaledVector(u3,mm(12.6)).setZ(sg*fz),UC.clone().addScaledVector(u3,mm(.55)).setZ(sg*fz),dims.stanchion); // stanchions
 }
 obox('dark',[mm(2.7),mm(1.5),2*(fz+dims.lower+mm(.3))],LC,f3,u3,mm(.45)); // lower crown
 obox('dark',[mm(2.2),mm(1.1),2*(fz+dims.stanchion+mm(.35))],UC,f3,u3,mm(.4)); // upper crown
 rod('dark',HT,UC.clone().addScaledVector(u3,mm(.6)),mm(.8));                     // steerer

 // ---------------- cockpit: direct-mount stem, riser bars, grips and brake levers
 {const sa=UC.clone().addScaledVector(u3,mm(.35)),sd=V().subVectors(CL,sa);
  obox('dark',[sd.length()+mm(1.0),mm(1.1),mm(1.6)],V().addVectors(sa,CL).multiplyScalar(.5),sd,Y,mm(.35));
  zcyl('dark',CL,mm(.85),-mm(1.5),mm(1.5));
  for(const sg of [-1,1]){
   const p0=CL.clone(),p1=CL.clone().setZ(sg*mm(1.9)),p2=V(CL.x-dims.barSweep*.45,CL.y+dims.barRise,sg*mm(5.0)),p3=V(CL.x-dims.barSweep,CL.y+dims.barRise,sg*dims.barHalf);
   capsule('dark',p0,p1,dims.barR);capsule('dark',p1,p2,dims.barR);rod('dark',p2,p3,dims.barR); // the bar end sits inside the grip
   const bd=V().subVectors(p3,p2).normalize();
   rod('rubber',p3.clone().addScaledVector(bd,-mm(4.3)),p3.clone().addScaledVector(bd,mm(.2)),dims.gripR);
   const mc=p2.clone().addScaledVector(bd,mm(5.6));
   obox('dark',[mm(1.5),mm(.75),mm(.9)],mc.clone().add(V(mm(.35),mm(.25),0)),V(1,0,0),Y,mm(.25));
   rod('steelDark',mc.clone().add(V(mm(.8),0,0)),mc.clone().add(V(mm(2.5),-mm(.9),sg*mm(1.8))),thin(mm(.2)),thin(mm(.17)),8);
  }}

 // ---------------- saddle and seat post
 {const post0=ST.clone().addScaledVector(sDir,-mm(1.4)),post1=SEAT.clone().add(V(0,mm(.45),0));rod('dark',post0,post1,mm(.62));
  const outline=[[4.8,.35],[4.1,.72],[1.6,.9],[-1.3,1.55],[-3.7,2.05],[-4.6,1.55],[-4.75,0],[-4.6,-1.55],[-3.7,-2.05],[-1.3,-1.55],[1.6,-.9],[4.1,-.72],[4.8,-.35]];
  const curve=new THREE.CatmullRomCurve3(outline.map(([x,z])=>V(mm(x),mm(z),0)),true,'centripetal');
  const sh=new THREE.Shape(curve.getPoints(fine?64:40).map(p=>new THREE.Vector2(p.x,p.y)));
  const th=mm(1.0),b=mm(.3);
  const g=new THREE.ExtrudeGeometry(sh,{depth:th,bevelEnabled:true,bevelThickness:b,bevelSize:b,bevelSegments:2,curveSegments:fine?18:10});
  g.rotateX(Math.PI/2);g.translate(0,th+b,0);g.rotateZ(4*Math.PI/180);g.translate(SEAT.x+mm(.35),SEAT.y,0);put('saddle',g)}

 // ---------------- drivetrain on the drive side (+Z): cranks, flat pedals, chainring, chain, cassette, mech
 {const cz=mm(1.6),cth=Math.max(.8,mm(.35)),rr=mm(3.3),teeth=fine?34:28,gp=[];
  for(let i=0;i<teeth*4;i++){const a=i/(teeth*4)*Math.PI*2,r=(i%4===1||i%4===2)?rr+mm(.32):rr-mm(.05);gp.push([BB.x+Math.cos(a)*r,BB.y+Math.sin(a)*r])}
  const sh=poly(gp),hole=new THREE.Path();hole.absarc(BB.x,BB.y,rr-mm(.75),0,Math.PI*2,true);sh.holes.push(hole);extrude('steelDark',sh,cz,cth);
  for(let i=0;i<4;i++){const a=i*Math.PI/2+.4,d=V(Math.cos(a),Math.sin(a));obox('dark',[rr,mm(.6),cth],BB.clone().addScaledVector(d,rr*.5).setZ(cz),d,V(-d.y,d.x))}
  zcyl('steelDark',BB,mm(.5),-mm(3.35),mm(3.35));
  for(const [pt,sg] of [[at(P.PF),1],[at(P.PR),-1]]){
   const a=BB.clone().setZ(sg*mm(3.0)),b=pt.clone().setZ(sg*mm(3.0)),dd=V().subVectors(b,a);
   obox('dark',[dd.length()+mm(1.1),mm(1.0),mm(.6)],V().addVectors(a,b).multiplyScalar(.5),dd,Y,mm(.28));
   zcyl('steelDark',pt,mm(.32),sg*mm(3.0),sg*(dims.pedalZ),10);
   obox('dark',[mm(3.4),mm(.62),mm(3.0)],pt.clone().setZ(sg*dims.pedalZ),V(1,0,0),Y,mm(.25));
  }
  const cas=new THREE.CylinderGeometry(mm(1.3),mm(2.7),mm(.9),fine?28:18);cas.rotateX(Math.PI/2);cas.translate(RA.x,RA.y,mm(1.75));put('steelDark',cas);
  const mz=mm(2.85),dp=V(RA.x+mm(.45),RA.y-mm(2.1),mz);
  obox('dark',[mm(1.0),mm(3.2),mm(.7)],dp,V(1,-.15,0),V(.15,1,0),mm(.3));
  const up=V(RA.x+mm(.75),RA.y-mm(1.0),mz),lp=V(RA.x+mm(.2),RA.y-mm(3.4),mz);
  zcyl('steelDark',up,mm(.6),mz-mm(.45),mz+mm(.45),14);zcyl('steelDark',lp,mm(.6),mz-mm(.45),mz+mm(.45),14);
  const cw=thin(mm(.2));
  rod('steelDark',V(BB.x,BB.y+rr,cz),V(RA.x,RA.y+mm(2.35),mm(1.75)),cw,cw,8);
  rod('steelDark',V(BB.x,BB.y-rr,cz),V(lp.x,lp.y-mm(.55),mz),cw,cw,8);
 }

 // ---------------- display plinth with two wheel cradles
 if(plinth){
  const b=1.2,r=7,{x0,x1,width:W,thick:T}=plinth,hw=W/2-b,xa=x0+b,xb=x1-b;
  const sh=new THREE.Shape();sh.moveTo(xa+r,-hw);sh.lineTo(xb-r,-hw);sh.quadraticCurveTo(xb,-hw,xb,-hw+r);sh.lineTo(xb,hw-r);sh.quadraticCurveTo(xb,hw,xb-r,hw);
  sh.lineTo(xa+r,hw);sh.quadraticCurveTo(xa,hw,xa,hw-r);sh.lineTo(xa,-hw+r);sh.quadraticCurveTo(xa,-hw,xa+r,-hw);
  const g=new THREE.ExtrudeGeometry(sh,{depth:T-2*b,bevelEnabled:true,bevelThickness:b,bevelSize:b,bevelSegments:2,curveSegments:8});
  g.rotateX(Math.PI/2);g.translate(0,-b,0);put('plinth',g);
  for(const c of [RA,FA]){const w=mm(8),rp=mm(14.6),R=dims.R,th0=-Math.PI/2+Math.asin(w/rp),th1=-Math.PI/2-Math.asin(w/rp);
   const cs=new THREE.Shape();cs.moveTo(c.x-w,-.4);cs.lineTo(c.x+w,-.4);cs.lineTo(c.x+w,R+Math.sin(th0)*rp);cs.absarc(c.x,R,rp,th0,th1,true);cs.lineTo(c.x-w,-.4);
   extrude('accent',cs,0,mm(6.2),mm(.45))}
 }

 // ---------------- materials and one merged mesh per material
 const plastic=(c,rough=.36,coat=.6)=>new THREE.MeshPhysicalMaterial({color:new THREE.Color(c),roughness:rough,metalness:0,clearcoat:coat,clearcoatRoughness:.25});
 const metal=(c,rough=.3)=>new THREE.MeshPhysicalMaterial({color:new THREE.Color(c),roughness:rough,metalness:1,clearcoat:.3});
 const lum=new THREE.Color(o.frame).getHSL({h:0,s:0,l:0}).l;
 const materials={
  frame:plastic(o.frame,.3,.75),accent:plastic(o.accent,.4,.5),rubber:plastic('#3C4557',.86,.05),dark:plastic('#3A4152',.42,.45),
  saddle:plastic('#2C3445',.62,.2),gold:plastic('#D9A646',.22,.85),coil:plastic(lum<.3?'#D98A2B':'#D9A646',.28,.8),
  steel:metal('#CBD3DD',.24),steelDark:metal('#8F9BAA',.32),plinth:plastic('#FFF8EC',.55,.25)};
 const NAMES={frame:'Frame and rocker',accent:'Fork lowers and cradles',rubber:'Tyres and grips',dark:'Rims, crowns, cockpit and shock',saddle:'Saddle',gold:'Fork stanchions',coil:'Shock spring',steel:'Hubs, rotors and shaft',steelDark:'Spokes, chain and drivetrain',plinth:'Display plinth'};
 const group=new THREE.Group();group.name=o.name;
 for(const [key,list] of buckets){
  const clean=list.map(g=>{let gg=g.index?g.toNonIndexed():g;for(const a of Object.keys(gg.attributes))if(a!=='position'&&a!=='normal')gg.deleteAttribute(a);if(!gg.attributes.normal)gg.computeVertexNormals();return gg});
  const merged=mergeGeometries(clean,false);clean.forEach(g=>g.dispose());list.forEach(g=>g.dispose());
  const m=new THREE.Mesh(merged,materials[key]);m.name=NAMES[key]||key;m.castShadow=true;m.receiveShadow=true;group.add(m);
 }
 group.updateMatrixWorld(true);
 const stats=measure(group,o,plinth);
 return{group,materials,points:P,layout:L,stats,options:o};
}

// ---------------------------------------------------------------- measurements
function measure(group,o,plinth){
 let triangles=0,volume=0;const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
 group.traverse(m=>{if(!m.isMesh)return;const p=m.geometry.attributes.position;triangles+=p.count/3;let v=0;
  for(let i=0;i<p.count;i+=3){a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1);c.fromBufferAttribute(p,i+2);v+=a.dot(b.cross(c))/6}volume+=Math.abs(v)});
 const box=new THREE.Box3().setFromObject(group),size=box.getSize(new THREE.Vector3());
 return{triangles,bounds:{x:+size.x.toFixed(1),y:+size.y.toFixed(1),z:+size.z.toFixed(1)},length:+size.x.toFixed(1),height:+size.y.toFixed(1),width:+size.z.toFixed(1),
  volume:Math.round(volume),solidCm3:+(volume/1000).toFixed(1),units:'mm',name:o.name,wheelbase:o.wheelbase,wheelDiameter:o.wheelDiameter,suspension:o.suspension,detail:o.detail,base:o.base,plinth:plinth?{length:+plinth.len.toFixed(1),width:plinth.width,thick:plinth.thick}:null,headAngle:HEAD_ANGLE};
}

// ---------------------------------------------------------------- exports
// Triangles in print space: Z up, the lowest point on the bed (z = 0) and the footprint starting at x = y = 0.
export function triangleData(group){
 group.updateMatrixWorld(true);const out=[];const v=new THREE.Vector3();
 group.traverse(m=>{if(!m.isMesh)return;const p=m.geometry.attributes.position,idx=m.geometry.index,n=idx?idx.count:p.count;
  for(let i=0;i<n;i+=3){const t=[];for(let k=0;k<3;k++){v.fromBufferAttribute(p,idx?idx.getX(i+k):i+k).applyMatrix4(m.matrixWorld);t.push(new THREE.Vector3(v.x,-v.z,v.y))}out.push(t)}});
 const min=new THREE.Vector3(Infinity,Infinity,Infinity);out.forEach(t=>t.forEach(p=>min.min(p)));
 out.forEach(t=>t.forEach(p=>p.sub(min)));return out;
}
const ascii=s=>String(s).replace(/[^\x20-\x7e]/g,'-');
export function makeSTL(group,name='bike display model'){
 const tris=triangleData(group),buffer=new ArrayBuffer(84+tris.length*50),view=new DataView(buffer);
 const head=ascii(`assembly Print Lab - ${name} - mm`).slice(0,80);for(let i=0;i<head.length;i++)view.setUint8(i,head.charCodeAt(i));
 view.setUint32(80,tris.length,true);let off=84;const ab=new THREE.Vector3(),ac=new THREE.Vector3(),n=new THREE.Vector3();
 for(const [a,b,c] of tris){ab.subVectors(b,a);ac.subVectors(c,a);n.crossVectors(ab,ac);const l=n.length();if(l>0)n.multiplyScalar(1/l);
  for(const p of [n,a,b,c]){view.setFloat32(off,p.x,true);view.setFloat32(off+4,p.y,true);view.setFloat32(off+8,p.z,true);off+=12}view.setUint16(off,0,true);off+=2}
 return new Blob([buffer],{type:'model/stl'});
}
const crcTable=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function crc32(data){let c=0xffffffff;for(const b of data)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0}
function zipStore(entries){const enc=new TextEncoder(),files=entries.map(([name,text])=>({name:enc.encode(name),data:typeof text==='string'?enc.encode(text):text}));let localSize=0,centralSize=0;
 for(const f of files){f.crc=crc32(f.data);localSize+=30+f.name.length+f.data.length;centralSize+=46+f.name.length}
 const out=new Uint8Array(localSize+centralSize+22),v=new DataView(out.buffer);let p=0;const u16=n=>{v.setUint16(p,n,true);p+=2},u32=n=>{v.setUint32(p,n,true);p+=4},bytes=b=>{out.set(b,p);p+=b.length};
 for(const f of files){f.offset=p;u32(0x04034b50);u16(20);u16(0x800);u16(0);u16(0);u16(0);u32(f.crc);u32(f.data.length);u32(f.data.length);u16(f.name.length);u16(0);bytes(f.name);bytes(f.data)}
 const central=p;for(const f of files){u32(0x02014b50);u16(20);u16(20);u16(0x800);u16(0);u16(0);u16(0);u32(f.crc);u32(f.data.length);u32(f.data.length);u16(f.name.length);u16(0);u16(0);u16(0);u16(0);u32(0);u32(f.offset);bytes(f.name)}
 const centralLength=p-central;u32(0x06054b50);u16(0);u16(0);u16(files.length);u16(files.length);u32(centralLength);u32(central);u16(0);
 return new Blob([out],{type:'model/3mf'});
}
const xml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function make3MF(group,name='bike display model'){
 const tris=triangleData(group),verts=[],tri=[],lookup=new Map();
 const vid=p=>{const k=p.x.toFixed(4)+','+p.y.toFixed(4)+','+p.z.toFixed(4);let i=lookup.get(k);if(i===undefined){i=verts.length;lookup.set(k,i);verts.push(k.split(','))}return i};
 for(const t of tris){const ids=t.map(vid);if(ids[0]!==ids[1]&&ids[1]!==ids[2]&&ids[0]!==ids[2])tri.push(ids)}
 const model=`<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="en-NZ" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><metadata name="Title">${xml(name)}</metadata><metadata name="Designer">assembly Print Lab</metadata><metadata name="Description">Downhill bike display model. Not rideable or safety-certified. Units: millimetres.</metadata><resources><object id="1" type="model" name="${xml(name)}"><mesh><vertices>${verts.map(v=>`<vertex x="${v[0]}" y="${v[1]}" z="${v[2]}"/>`).join('')}</vertices><triangles>${tri.map(t=>`<triangle v1="${t[0]}" v2="${t[1]}" v3="${t[2]}"/>`).join('')}</triangles></mesh></object></resources><build><item objectid="1"/></build></model>`;
 const types=`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>`;
 const rels=`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>`;
 return zipStore([['[Content_Types].xml',types],['_rels/.rels',rels],['3D/3dmodel.model',model]]);
}
