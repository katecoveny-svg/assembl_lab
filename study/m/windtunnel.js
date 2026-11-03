(()=>{
// The wind tunnel machine: an open-wheel single-seater built in Blender (assets/models/windtunnel/build_windtunnel.py),
// on a rolling road in a wind tunnel, for NCEA physics (Years 11 to 13, forces and mechanics).
// Five steps: drag, downforce and grip, the forces on the car and power, the airflow, and opening the rear-wing flap.
// Every number comes from F = ½ρv²CA with rounded, textbook-style coefficients (stated in the truth line), P = Fv,
// W = mg and a friction model for grip. The airflow is a simplified 2D stream-function sketch, not CFD, and says so.
const fmt=(x,d=0)=>Number(x).toLocaleString("en-NZ",{maximumFractionDigits:d,minimumFractionDigits:d});
const esc=t=>String(t??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
const FONT="'Instrument Sans',Helvetica,Arial,sans-serif",MONO="'IBM Plex Mono',Menlo,monospace";
const C={ink:"#240B21",paper:"#FFFDFB",chalk:"#F5F1F2",muted:"#654A4E",rose:"#916A70",line:"#E4D9DE",plum:"#3B1737",blush:"#F0B6C4",
  drag:"#C2566A",down:"#6A50BE",weight:"#3B1737",normal:"#3A6FB8",thrust:"#2A7D63",slow:"#9C8AD0",fast:"#D46A7E",floor:"#E6DEE2",tyre:"#2B2629"};
const T=(x,y,t,o={})=>`<text x="${x}" y="${y}" font-family="${o.mono?MONO:FONT}" font-size="${o.s||14}" font-weight="${o.w||400}" fill="${o.c||C.ink}" text-anchor="${o.a||"start"}"${o.op?` opacity="${o.op}"`:""}>${esc(t)}</text>`;
const RM=matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- the physics. ρ = 1.2 kg/m³, frontal area 1.5 m², mass 800 kg with the driver, g = 9.8 N/kg.
// Drag coefficient 0.70 to 1.09 and downforce area (C_L × A) 1.5 to 4.5 m² as the rear wing goes from 0° to 30°.
// Opening the flap (DRS) keeps 55% of the rear wing's drag and 40% of its downforce. Rolling resistance is ignored.
const RHO=1.2,AREA=1.5,MASS=800,G=9.8,PMAX=450000,MU=1.5,CD_BODY=0.55,CLA_BODY=0.6;
const wingCd=(a,drs)=>(0.15+0.013*a)*(drs?0.55:1);
const wingClA=(a,drs)=>(0.9+0.1*a)*(drs?0.4:1);
const Cd=(a,drs)=>CD_BODY+wingCd(a,drs);
const ClA=(a,drs)=>CLA_BODY+wingClA(a,drs);
const ms=kmh=>kmh/3.6;
const q=kmh=>0.5*RHO*ms(kmh)**2;
const drag=(kmh,a,drs)=>q(kmh)*Cd(a,drs)*AREA;
const down=(kmh,a,drs)=>q(kmh)*ClA(a,drs);
const WEIGHT=MASS*G;
const power=(kmh,a,drs)=>drag(kmh,a,drs)*ms(kmh);
const topSpeed=(a,drs)=>Math.cbrt(PMAX/(0.5*RHO*Cd(a,drs)*AREA))*3.6;
const grip=(kmh,a,drs)=>MU*(WEIGHT+down(kmh,a,drs));
const radius=(kmh,a,drs)=>MASS*ms(kmh)**2/grip(kmh,a,drs);

// ---------- state
const s={view:"drag",speed:200,wing:15,drs:false,wand:1.2};
const F=()=>({v:ms(s.speed),D:drag(s.speed,s.wing,s.drs),L:down(s.speed,s.wing,s.drs),P:power(s.speed,s.wing,s.drs),top:topSpeed(s.wing,s.drs),grip:grip(s.speed,s.wing,s.drs)});

// ---------- the car's side profile at the centre line (metres; x forward, z up), matching the Blender model
const BODY=[[2.66,.215],[2.45,.29],[2.2,.345],[1.85,.42],[1.45,.51],[1.0,.58],[.6,.63],[.32,.645],[.18,.66],[.06,.72],[-.06,.81],[-.2,.83],[-.31,.84],[-.42,.875],[-.7,.85],[-1.1,.71],[-1.45,.54],[-1.75,.45],[-1.98,.42],[-2.2,.38],[-2.38,.37],
  [-2.38,.27],[-2.15,.23],[-1.55,.068],[-1.55,.043],[1.07,.043],[1.07,.068],[1.2,.17],[1.6,.165],[2.0,.158],[2.3,.155],[2.55,.17],[2.66,.2]];
// wing elements in the same frame: [pivot-relative leading edge or trailing edge, chord, camber, thickness]
const RW_PIVOT=[-2.15,.84],FLAP_TE=[-.32,.12];
const rotY=(x,z,a)=>[x*Math.cos(a)+z*Math.sin(a),-x*Math.sin(a)+z*Math.cos(a)];   // Blender's turn about Y: positive raises the trailing edge
const flapAngle=drs=>drs?6:28;
// camber lines of each element as polylines in world x/z, so the 2D drawing, the flow sketch and the 3D model agree
function elements(a,drs){const A=a*Math.PI/180,f=flapAngle(drs)*Math.PI/180,out=[];
  const line=(fn,c,cam,th)=>{const p=[];for(let i=0;i<=8;i++){const t=i/8;p.push(fn(t,-cam*c*4*t*(1-t)))}out.push({p,th:th*c/2})};
  line((t,dz)=>{const [x,z]=rotY(.2-t*.4,-.02+dz,A);return [RW_PIVOT[0]+x,RW_PIVOT[1]+z]},.4,.06,.12);
  line((t,dz)=>{const [lx,lz]=rotY((1-t)*.24,dz,f),[x,z]=rotY(FLAP_TE[0]+lx,FLAP_TE[1]+lz,A);return [RW_PIVOT[0]+x,RW_PIVOT[1]+z]},.24,.06,.1);
  line((t,dz)=>{const [x,z]=rotY(-t*.34,dz,4*Math.PI/180);return [2.42+x,.1+z]},.34,.06,.1);
  line((t,dz)=>{const [x,z]=rotY(-t*.2,dz,22*Math.PI/180);return [2.15+x,.175+z]},.2,.07,.1);
  return out}

// ---------- the airflow: a simplified 2D stream-function sketch around the centre-line profile (not CFD).
// ψ solves Laplace's equation on a grid; the ground, the car and each wing hold their own constant ψ. The rear wing's ψ is
// raised with its angle (more air is drawn under it), which is how this sketch shows a wing turning the flow.
const FLOW=(()=>{const X0=-6,X1=5,Z1=3,H=.03,NX=Math.round((X1-X0)/H)+1,NZ=Math.round(Z1/H)+1;
  const psi=new Float32Array(NX*NZ),fix=new Int8Array(NX*NZ),U=new Float32Array(NX*NZ),W=new Float32Array(NX*NZ);let key="",first=true,wingPsi=1;
  const PSI_BODY=.07,PSI_FW=.05;
  const inPoly=(x,z,P)=>{let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const [xi,zi]=P[i],[xj,zj]=P[j];if((zi>z)!==(zj>z)&&x<(xj-xi)*(z-zi)/(zj-zi)+xi)c=!c}return c};
  const dSeg=(x,z,a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz)};
  function solve(a,drs){const k=a+"|"+drs;if(k===key)return;key=k;const E=elements(a,drs);
    const zc=E[0].p[4][1],G0=(.05+.006*a)*(drs?.4:1);wingPsi=zc+G0;const vals=[wingPsi,wingPsi-.02,PSI_FW,PSI_FW];
    fix.fill(0);for(let j=0;j<NZ;j++)for(let i=0;i<NX;i++){const x=X0+i*H,z=j*H,n=j*NX+i;
      if(j===0){fix[n]=1;psi[n]=0;continue}if(j===NZ-1||i===0||i===NX-1){fix[n]=1;psi[n]=z;continue}
      if(x>-2.5&&x<2.7&&z<.95&&inPoly(x,z,BODY)){fix[n]=1;psi[n]=PSI_BODY;continue}
      for(let e=0;e<4;e++){const p=E[e].p;let d=9;for(let m=0;m<p.length-1;m++)d=Math.min(d,dSeg(x,z,p[m],p[m+1]));if(d<Math.max(E[e].th,H*.6)){fix[n]=1;psi[n]=vals[e];break}}
      if(!fix[n]&&first)psi[n]=z}
    const it=first?260:90;first=false;
    for(let r=0;r<it;r++)for(let j=1;j<NZ-1;j++)for(let i=1;i<NX-1;i++){const n=j*NX+i;if(fix[n])continue;psi[n]+=1.9*((psi[n-1]+psi[n+1]+psi[n-NX]+psi[n+NX])*.25-psi[n])}
    // the air's velocity: towards -x, u = -∂ψ/∂z, w = ∂ψ/∂x (1 = the speed of the oncoming air)
    for(let j=1;j<NZ-1;j++)for(let i=1;i<NX-1;i++){const n=j*NX+i;if(fix[n]&&j>0){U[n]=W[n]=0;continue}U[n]=-(psi[n+NX]-psi[n-NX])/(2*H);W[n]=(psi[n+1]-psi[n-1])/(2*H)}}
  const at=(A,x,z)=>{const fi=(x-X0)/H,fj=z/H;if(fi<0||fj<0||fi>=NX-1||fj>=NZ-1)return null;const i=fi|0,j=fj|0,u=fi-i,v=fj-j,n=j*NX+i;
    return A[n]*(1-u)*(1-v)+A[n+1]*u*(1-v)+A[n+NX]*(1-u)*v+A[n+NX+1]*u*v};
  return {X0,X1,Z1,solve,vel(x,z,out){const u=at(U,x,z);if(u===null){out[0]=-1;out[1]=0;return out}out[0]=u;out[1]=at(W,x,z);return out},
    psiAt:(x,z)=>at(psi,x,z),get wingPsi(){return wingPsi},PSI_BODY,
    blocked:(x,z)=>{const i=Math.round((x-X0)/H),j=Math.round(z/H);return i>=0&&j>=0&&i<NX&&j<NZ&&fix[j*NX+i]===1&&j>0},
    trace(x,z,n=400,ds=.03){const p=[[x,z]],v=[0,0];for(let k=0;k<n;k++){this.vel(x,z,v);const sp=Math.hypot(v[0],v[1]);if(sp<.02)break;x+=v[0]/sp*ds;z+=v[1]/sp*ds;if(x<X0+.05||z<0||z>Z1)break;p.push([x,z])}return p},
    speedRatio(x,z){const v=this.vel(x,z,[0,0]);return Math.hypot(v[0],v[1])}}})();
// where the smoke goes: each streamline keeps its ψ, so compare the wand's ψ with the rear wing's
function smokeGoes(){FLOW.solve(s.wing,s.drs);const p=FLOW.psiAt(4.33,s.wand)??s.wand,w=FLOW.wingPsi;
  return p<w-.03?"under":Math.abs(p-w)<=.03?"into":p<1.45?"over":"above"}
const SMOKE_TXT={under:"over the car, then under the rear wing (the fast side)",into:"straight into the front edge of the rear wing",over:"over the top of the rear wing",above:"well above the car, hardly turned"};

// ---------- 2D drawings (shown when 3D can't load, and on phones in lite mode). 800 × 420. Side view, nose to the right.
let GY=338;const SX=x=>415+x*120,SZ=z=>GY-z*120;
const pts=P=>P.map(([x,z])=>`${SX(x).toFixed(1)},${SZ(z).toFixed(1)}`).join(" ");
function carSVG(o={}){const E=elements(s.wing,s.drs);let g=`<rect x="0" y="${SZ(0)}" width="800" height="${420-SZ(0)}" fill="${C.floor}"/><line x1="0" y1="${SZ(0)}" x2="800" y2="${SZ(0)}" stroke="#CDBFC6" stroke-width="2"/>`;
  g+=`<polygon points="${pts(BODY)}" fill="${C.plum}" stroke="${C.ink}" stroke-width="1.5" stroke-linejoin="round"/>`;
  g+=`<circle cx="${SX(-.1)}" cy="${SZ(.7)}" r="${.125*120}" fill="#F7F1F2" stroke="${C.ink}" stroke-width="1.5"/><path d="M${SX(-.1)},${SZ(.7)} m-15,-2 a15,15 0 0 1 30,0z" fill="#2C2A3E"/>`;
  g+=`<path d="M${SX(-.36)},${SZ(.6)} Q${SX(-.3)},${SZ(.9)} ${SX(.05)},${SZ(.9)} L${SX(.47)},${SZ(.89)} L${SX(.66)},${SZ(.6)}" fill="none" stroke="#2A2229" stroke-width="5" stroke-linecap="round"/>`;
  E.forEach((e,i)=>{g+=`<polyline points="${pts(e.p)}" fill="none" stroke="${i===1||i===3?C.blush:"#2A2229"}" stroke-width="${Math.max(3,e.th*240)}" stroke-linecap="round"/>`});
  g+=`<polygon points="${pts([[-1.84,.56],[-1.87,1.08],[-2.63,1.14],[-2.61,.6],[-2.36,.5]])}" fill="${C.plum}" opacity=".12" stroke="${C.plum}" stroke-opacity=".35" stroke-dasharray="4 4"/>`;
  [[1.55,.33],[-1.62,.345]].forEach(([x,r])=>{g+=`<circle cx="${SX(x)}" cy="${SZ(r)}" r="${r*120}" fill="${C.tyre}"/><circle cx="${SX(x)}" cy="${SZ(r)}" r="${.2*120}" fill="#D9D3D8"/><circle cx="${SX(x)}" cy="${SZ(r)}" r="5" fill="${C.blush}"/>`});
  return g}
function arrowSVG(x1,y1,x2,y2,col,label,o={}){const L=Math.hypot(x2-x1,y2-y1);if(L<4)return "";const ux=(x2-x1)/L,uy=(y2-y1)/L,hx=x2-ux*14,hy=y2-uy*14;
  return `<line x1="${x1}" y1="${y1}" x2="${hx}" y2="${hy}" stroke="${col}" stroke-width="6" stroke-linecap="round"/><polygon points="${x2},${y2} ${hx-uy*9},${hy+ux*9} ${hx+uy*9},${hy-ux*9}" fill="${col}"/>`+(label?T(o.lx??x2+8,o.ly??y2,label,{s:13,w:600,c:col,a:o.a||"start"}):"")}
const KN=n=>`${fmt(n)} N`;
// arrow scales in the 2D drawings (pixels per newton); each drawing says its scale
const PXN_DRAG=1/22,PXN_FBD=1/70;
const scaleNote=(n,clip)=>T(776,404,`arrows: 1 px = ${n} N${clip?' (longest arrow shortened to fit)':''}`,{s:11,a:'end',mono:true,c:C.muted});
function windLines(){let g="";const on=s.speed>0;for(let i=0;i<5;i++){const y=60+i*22;g+=`<path d="M780,${y} h-${30+s.speed/6}" stroke="#B7A9C9" stroke-width="2" stroke-linecap="round" ${on?"":`opacity=".3"`}/><polygon points="${750-s.speed/6},${y} ${758-s.speed/6},${y-4} ${758-s.speed/6},${y+4}" fill="#B7A9C9" ${on?"":`opacity=".3"`}/>`}return g+T(780,44,s.speed>0?"wind":"wind off",{s:12,a:"end",c:C.muted,mono:true})}
const BGD=()=>`<rect width="800" height="420" rx="14" fill="${C.chalk}"/>`;
const DRAW={
 drag(){GY=338;const f=F();let g=BGD()+windLines()+carSVG();const L0=f.D*PXN_DRAG,L=Math.min(300,L0);
   g+=arrowSVG(SX(.5),SZ(1.3),SX(.5)-L,SZ(1.3),C.drag,`Drag ${KN(f.D)}`,{a:"end",lx:SX(.5)-L-8,ly:SZ(1.3)+5})+scaleNote(22,L<L0);
   return g+T(24,40,`Drag = ½ρv²C_dA at ${s.speed} km/h`,{s:17,w:600})+T(24,64,`= ½ × 1.2 × ${fmt(f.v,1)}² × ${fmt(Cd(s.wing,s.drs),2)} × 1.5 = ${KN(f.D)}`,{s:14,mono:true,c:C.muted})+T(24,400,`Twice the speed (${fmt(Math.min(600,s.speed*2))} km/h) would mean four times the drag: ${KN(4*f.D)}`,{s:14,c:C.muted})},
 downforce(){GY=290;const f=F();let g=BGD()+windLines()+carSVG();const L0=f.L*PXN_FBD,Ld=Math.min(SZ(.9)-14,L0),Lw=WEIGHT*PXN_FBD;
   g+=arrowSVG(SX(-.45),SZ(.9)-Ld,SX(-.45),SZ(.9),C.down,`Downforce ${KN(f.L)}`,{lx:SX(-.45)+12,ly:SZ(.9)-Ld+14});
   g+=arrowSVG(SX(-.25),SZ(.3),SX(-.25),SZ(.3)+Lw,C.weight,`Weight ${KN(WEIGHT)}`,{lx:SX(-.25)+12,ly:SZ(.3)+Lw-4})+scaleNote(70,Ld<L0);GY=338;
   return g+T(24,40,`Downforce = ½ρv²C_LA = ${KN(f.L)}`,{s:17,w:600})+T(24,64,`${fmt(f.L/WEIGHT,2)} × the car's weight · rear wing at ${s.wing}°`,{s:14,c:C.muted})},
 forces(){GY=290;const f=F();let g=BGD()+windLines()+carSVG();const k=PXN_FBD,Lw=WEIGHT*k,L0=f.L*k,Ld=Math.min(SZ(.9)-14,L0),Ln=Math.min(SZ(0)-90,(WEIGHT+f.L)/2*k),Lh=f.D*k;
   g+=arrowSVG(SX(-.25),SZ(.3),SX(-.25),SZ(.3)+Lw,C.weight,`Weight ${KN(WEIGHT)}`,{lx:SX(-.25)+12,ly:SZ(.3)+Lw-4});
   g+=arrowSVG(SX(-.45),SZ(.9)-Ld,SX(-.45),SZ(.9),C.down,`Downforce ${KN(f.L)}`,{lx:SX(-.45)+12,ly:SZ(.9)-Ld+14});
   [[1.55],[-1.62]].forEach(([x],i)=>{g+=arrowSVG(SX(x),SZ(0),SX(x),SZ(0)-Ln,C.normal,i?"":`Normal ${KN(WEIGHT+f.L)} (both axles)`,{lx:SX(x)+12,ly:SZ(0)-Ln+12})});
   g+=arrowSVG(SX(-2.4),SZ(.55),SX(-2.4)-Lh,SZ(.55),C.drag,`Drag ${KN(f.D)}`,{a:"end",lx:SX(-2.4)-Lh-6,ly:SZ(.55)-14});
   g+=arrowSVG(SX(-1.62),SZ(.02),SX(-1.62)+Lh,SZ(.02),C.thrust,`Thrust ${KN(f.D)}`,{lx:SX(-1.62)+Lh+8,ly:SZ(.02)+20})+scaleNote(70,Ld<L0||Ln<(WEIGHT+f.L)/2*k);GY=338;
   return g+T(24,40,"Constant speed: forces balanced",{s:17,w:600})+T(24,64,`Thrust = drag · P = Fv = ${fmt(f.D)} × ${fmt(f.v,1)} = ${fmt(f.P/1000)} kW`,{s:14,c:f.P>PMAX?C.drag:C.muted})},
 flow(){GY=338;FLOW.solve(s.wing,s.drs);let g=BGD()+carSVG();if(s.speed<=0)return g+T(400,60,"Turn the wind on to see the airflow",{s:16,w:600,a:"middle",c:C.muted});
   for(let i=0;i<16;i++){const z=.12+i*.09;g+=`<polyline points="${pts(FLOW.trace(4.9,z,420,.04).filter(([x])=>x>-3.6))}" fill="none" stroke="${C.slow}" stroke-width="1.5" opacity=".75"/>`}
   g+=`<polyline points="${pts(FLOW.trace(4.33,s.wand,420,.03).filter(([x])=>x>-3.6))}" fill="none" stroke="${C.fast}" stroke-width="4" opacity=".9" stroke-linecap="round"/>`;
   g+=`<line x1="${SX(4.4)}" y1="${SZ(0)}" x2="${SX(4.4)}" y2="${SZ(1.7)}" stroke="#B9B3B8" stroke-width="3"/><rect x="${SX(4.33)-8}" y="${SZ(s.wand)-5}" width="20" height="10" rx="3" fill="${C.plum}"/>`;
   return g+T(24,40,"Smoke lines (a simplified sketch, not CFD)",{s:17,w:600})+T(24,64,`The smoke goes ${SMOKE_TXT[smokeGoes()]}`,{s:14,c:C.muted})},
 drs(){GY=338;const f=F(),o=s.drs?"closed":"open",c=drag(s.speed,s.wing,!s.drs),cl=down(s.speed,s.wing,!s.drs);let g=BGD()+windLines()+carSVG();const L0=f.D*PXN_DRAG,L=Math.min(300,L0);
   g+=arrowSVG(SX(.5),SZ(1.3),SX(.5)-L,SZ(1.3),C.drag,`Drag ${KN(f.D)}`,{a:"end",lx:SX(.5)-L-8,ly:SZ(1.3)+5})+scaleNote(22,L<L0);
   return g+T(24,40,s.drs?"Flap open (DRS): less drag, less downforce":"Flap closed: more downforce, more drag",{s:17,w:600})+T(24,64,`Drag ${KN(f.D)} (${o}: ${KN(c)}) · top speed ${fmt(f.top)} km/h`,{s:14,c:C.muted})+T(24,88,`Downforce ${KN(f.L)} (${o}: ${KN(cl)})`,{s:14,c:C.muted})}};
DRAW.test=()=>DRAW.forces();

// ---------- the close-up card for each step. 420 × 260.
function drawClose(){const v=s.view,f=F();let g=`<rect width="420" height="260" rx="14" fill="${C.paper}"/>`;
  if(v==="drag"){const X=k=>40+k/300*350,Y=d=>220-d/9000*180;let path="";for(let k=0;k<=300;k+=10)path+=`${k?"L":"M"}${X(k)},${Y(drag(k,s.wing,s.drs))}`;
    g+=`<line x1="40" y1="220" x2="395" y2="220" stroke="${C.line}" stroke-width="2"/><line x1="40" y1="220" x2="40" y2="34" stroke="${C.line}" stroke-width="2"/><path d="${path}" fill="none" stroke="${C.drag}" stroke-width="3"/>`;
    const h=s.speed/2;g+=`<circle cx="${X(h)}" cy="${Y(drag(h,s.wing,s.drs))}" r="5" fill="#fff" stroke="${C.drag}" stroke-width="2"/><circle cx="${X(s.speed)}" cy="${Y(f.D)}" r="7" fill="${C.drag}"/>`;
    return g+T(24,26,"Drag grows with speed squared",{s:15,w:600})+T(X(s.speed)-8,Y(f.D)-12,KN(f.D),{s:12,w:600,a:"end",mono:true})+T(X(h)+8,Y(drag(h,s.wing,s.drs))+18,`half the speed: ¼ (${KN(drag(h,s.wing,s.drs))})`,{s:11,c:C.muted})+T(40,244,"0",{s:11,c:C.muted,mono:true})+T(395,244,"300 km/h",{s:11,c:C.muted,a:"end",mono:true})}
  if(v==="downforce"){const r=radius(s.speed,s.wing,s.drs),r0=s.speed>0?MASS*f.v**2/(MU*WEIGHT):0,gl=f.grip/WEIGHT;
    g+=T(24,34,"Grip in a corner",{s:16,w:600})+T(24,60,"Max sideways friction = μ × (weight + downforce)",{s:12.5,c:C.muted});
    g+=T(24,92,`= 1.5 × (${fmt(WEIGHT)} + ${fmt(f.L)}) = ${KN(f.grip)}`,{s:13,mono:true})+T(24,118,`That's ${fmt(gl,1)} g sideways (1.5 g without downforce)`,{s:13});
    const bw=s.speed>0?Math.min(340,340*Math.min(1,r/Math.max(r0,1))):0;
    g+=T(24,156,`Tightest corner at ${s.speed} km/h (r = mv²/F):`,{s:13,w:600});
    g+=`<rect x="24" y="168" width="340" height="16" rx="8" fill="${C.line}"/><rect x="24" y="168" width="${bw}" height="16" rx="8" fill="${C.down}"/>`+T(24,206,s.speed>0?`with downforce ${fmt(r)} m · without ${fmt(r0)} m`:"set a speed to see",{s:13,mono:true});
    return g+T(24,240,"More downforce → more grip → faster through corners.",{s:12.5,c:C.muted})}
  if(v==="forces"||v==="test"){const rows=[["Weight W = mg",KN(WEIGHT),C.weight],["Downforce",KN(f.L),C.down],["Normal N = W + downforce",KN(WEIGHT+f.L),C.normal],["Drag",KN(f.D),C.drag],["Thrust (= drag at steady speed)",KN(f.D),C.thrust]];
    rows.forEach(([a,b,c],i)=>{g+=`<rect x="24" y="${22+i*28}" width="8" height="18" rx="3" fill="${c}"/>`+T(40,36+i*28,a,{s:13})+T(396,36+i*28,b,{s:13,a:"end",mono:true,w:500})});
    const k=Math.min(1.2,f.P/PMAX);g+=T(24,186,`Power needed P = Fv = ${fmt(f.P/1000)} kW`,{s:14,w:600,c:f.P>PMAX?C.drag:C.ink});
    g+=`<rect x="24" y="198" width="372" height="14" rx="7" fill="${C.line}"/><rect x="24" y="198" width="${Math.min(372,372*k/1.2)}" height="14" rx="7" fill="${f.P>PMAX?C.drag:C.thrust}"/><line x1="${24+372/1.2}" y1="192" x2="${24+372/1.2}" y2="218" stroke="${C.ink}" stroke-width="2"/>`;
    return g+T(24+372/1.2,236,"engine: 450 kW",{s:11,a:"middle",mono:true,c:C.muted})+T(24,252,f.P>PMAX?"More than the engine can give: the car can't hold this speed.":`Top speed with this wing: about ${fmt(f.top)} km/h`,{s:12,c:C.muted})}
  if(v==="flow"){FLOW.solve(s.wing,s.drs);const zx=x=>210+(x+2.2)*330,zz=z=>140-(z-.8)*330;const E=elements(s.wing,s.drs);
    g+=`<clipPath id="wc"><rect x="10" y="10" width="400" height="200" rx="10"/></clipPath><g clip-path="url(#wc)"><rect x="10" y="10" width="400" height="200" fill="${C.chalk}"/>`;
    for(let i=0;i<22;i++){const z=.45+i*.045;const p=FLOW.trace(-1.3,z,140,.012);g+=`<polyline points="${p.map(([x,z])=>`${zx(x).toFixed(1)},${zz(z).toFixed(1)}`).join(" ")}" fill="none" stroke="${C.slow}" stroke-width="1.4"/>`}
    E.slice(0,2).forEach((e,i)=>{g+=`<polyline points="${e.p.map(([x,z])=>`${zx(x)},${zz(z)}`).join(" ")}" fill="none" stroke="${i?C.blush:"#2A2229"}" stroke-width="${e.th*660}" stroke-linecap="round"/>`});
    g+=`</g>`;return g+T(24,232,"Lines bunch up under the wing: the air is faster there,",{s:12.5})+T(24,250,"so lower pressure under it. The wing is pushed down. (Sketch, not CFD.)",{s:12.5,c:C.muted})}
  if(v==="drs"){const c0=drag(s.speed,s.wing,false),c1=drag(s.speed,s.wing,true),l0=down(s.speed,s.wing,false),l1=down(s.speed,s.wing,true);
    const bar=(y,lab,a,b,col)=>`${T(24,y,lab,{s:13,w:600})}<rect x="24" y="${y+8}" width="${a/Math.max(a,1)*300}" height="12" rx="6" fill="${col}" opacity=".35"/><rect x="24" y="${y+8}" width="${b/Math.max(a,1)*300}" height="12" rx="6" fill="${col}"/>${T(332,y+19,a>0?`−${fmt((1-b/a)*100)}%`:"",{s:12,mono:true})}`;
    g+=T(24,30,"Opening the flap (DRS)",{s:16,w:600})+bar(56,`Drag ${KN(c0)} → ${KN(c1)}`,c0,c1,C.drag)+bar(104,`Downforce ${KN(l0)} → ${KN(l1)}`,l0,l1,C.down);
    return g+T(24,172,`Top speed ${fmt(topSpeed(s.wing,false))} → ${fmt(topSpeed(s.wing,true))} km/h (450 kW)`,{s:13,w:600})+T(24,200,"Less drag means more top speed on a straight.",{s:12.5,c:C.muted})+T(24,220,"Less downforce means less grip, so the flap",{s:12.5,c:C.muted})+T(24,238,"must close again before the corner.",{s:12.5,c:C.muted})}
  return g}

// ---------- steps
const ONE=(v,a,d)=>`At ${s.speed} km/h (${fmt(ms(s.speed),1)} m s⁻¹)`;
const steps=[
 {k:"drag",lab:"Drag",cap:"Turn up the wind speed and change the rear-wing angle. Watch the drag arrow: double the speed and it gets four times longer.",big:"<b>Drag</b> F = ½ρv²C<sub>d</sub>A pushes back on the car. It depends on <b>v²</b>: double the speed and the drag is <b>four times</b> as big. A steeper wing has a bigger drag coefficient C<sub>d</sub>.",trap:"Thinking drag doubles when speed doubles. Drag goes with speed <b>squared</b>, so ×2 speed gives ×4 drag (and ×3 gives ×9).",exam:()=>{const f=F();return `${ONE()} the drag force is F = ½ × 1.2 × ${fmt(f.v,1)}² × ${fmt(Cd(s.wing,s.drs),2)} × 1.5 ≈ ${fmt(f.D)} N. At twice the speed it would be four times as much, about ${fmt(4*f.D)} N.`},chips:["speed","drag","double"],controls:["speed","wing","dbl"]},
 {k:"downforce",lab:"Downforce and grip",cap:"The wings are upside-down aeroplane wings. Speed up and steepen the rear wing to push the car into the track.",big:"<b>Downforce</b> F = ½ρv²C<sub>L</sub>A is negative lift: the wings push air <b>up</b>, so the air pushes the car <b>down</b> (Newton's third law). More downforce means a bigger normal force, so more <b>friction (grip)</b> in corners.",trap:"Thinking downforce makes the car heavier. Its <b>mass</b> and <b>weight</b> don't change; the air pushes down as well, so the tyres are pressed harder onto the road.",exam:()=>{const f=F();return `${ONE()} with the rear wing at ${s.wing}°, the downforce is about ${fmt(f.L)} N, ${fmt(f.L/WEIGHT,2)} times the car's weight of ${fmt(WEIGHT)} N. The tyres can now give up to ${fmt(f.grip)} N of sideways friction.`},chips:["speed","down","ratio","grip"],controls:["speed","wing"]},
 {k:"forces",lab:"Forces and power",cap:"At a steady speed on a straight, the forces balance. Speed up and see how much power the engine must give.",big:"At <b>constant speed</b> the net force is zero: <b>thrust = drag</b> (forwards and backwards) and <b>normal force = weight + downforce</b> (up and down). The engine must supply power <b>P = Fv</b>. Top speed is where the power needed reaches the engine's maximum.",trap:"Thinking a car at top speed has more thrust than drag. At a <b>steady</b> top speed they are equal; it only speeds up while thrust is bigger than drag.",exam:()=>{const f=F();return `${ONE()} at a steady speed the thrust equals the drag, ${fmt(f.D)} N, so the power needed is P = Fv = ${fmt(f.D)} × ${fmt(f.v,1)} ≈ ${fmt(f.P/1000)} kW${f.P>PMAX?", more than the engine's 450 kW":""}. The normal force is ${fmt(WEIGHT)} + ${fmt(f.L)} = ${fmt(WEIGHT+f.L)} N.`},chips:["speed","thrust","power","top"],controls:["speed","wing"]},
 {k:"flow",lab:"Airflow",cap:"Move the smoke wand up and down. Where the smoke lines crowd together the air is faster. A simplified illustration, not a real flow simulation.",big:"<b>Streamlines</b> show the path of the air. Where they <b>bunch together</b> the air is moving <b>faster</b>, and faster air has <b>lower pressure</b>. Under the rear wing the air speeds up, so the pressure underneath is lower than on top: the wing is pushed down.",trap:"Thinking the air pushes the wing down only by hitting its top. Most downforce comes from the <b>low pressure under</b> the wing, where the air is faster.",exam:()=>`The smoke from ${fmt(s.wand,2)} m goes ${SMOKE_TXT[smokeGoes()]}. Under the rear wing the streamlines are closer together, so the air is faster and its pressure lower than above the wing, giving a net downward force.`,chips:["speed","wand","smoke"],controls:["wand","speed","wing"]},
 {k:"drs",lab:"Open the flap (DRS)",cap:"On a straight, the driver can open the rear-wing flap. Press the button and watch the drag and downforce drop.",big:"Opening the flap (a drag reduction system, <b>DRS</b>) flattens the rear wing. <b>Less drag</b> means more top speed for the same power; <b>less downforce</b> means less grip, so the flap closes for corners.",trap:"Thinking the flap adds power. The engine gives the same power; with less drag, P = Fv lets the car reach a <b>higher speed</b>.",exam:()=>{const c0=drag(s.speed,s.wing,false),c1=drag(s.speed,s.wing,true);return `${ONE()} opening the flap cuts the drag from ${fmt(c0)} N to ${fmt(c1)} N (${fmt((1-c1/Math.max(c0,1))*100)}% less), so the top speed with 450 kW rises from about ${fmt(topSpeed(s.wing,false))} to ${fmt(topSpeed(s.wing,true))} km/h. Downforce falls too, so there is less grip.`},chips:["drag","down","top"],controls:["drs","speed","wing"]},
 {k:"test",lab:"Test yourself",cap:"Seven challenges across the whole topic. Use the controls, then press Check.",chips:["speed","drag","down","power","ratio"],controls:["speed","wing","drs","wand"]}];

// kupu Māori reused verbatim from the other machines (Te Aka ids already checked there)
const KUPU=[{mi:"tōpana",en:"force",ta:40375,chip:["drag","down","thrust"]},{mi:"tōpana taurite",en:"balanced forces",ta:40395},{mi:"tere",en:"speed",ta:7953,chip:["speed"],note:"Also means quick or fast."},{mi:"taumaha",en:"weight",ta:7718,chip:"ratio"},{mi:"papatipu",en:"mass",ta:5179,note:"Papatipu also means ancestral land. In science it means mass."},{mi:"tō ā-papa",en:"gravity",ta:12845,note:"Te Aka also lists kume ā-papa."},{mi:"waku",en:"friction",ta:12421,chip:"grip"},{mi:"pūngao",en:"energy",ta:40075}];
Object.entries({drag:["tōpana","tere"],downforce:["tōpana","waku","taumaha"],forces:["tōpana taurite","taumaha","papatipu","tō ā-papa","pūngao"],flow:["tere"],drs:["tōpana","tere"]}).forEach(([k,a])=>{const st=steps.find(x=>x.k===k);if(st)st.kupu=a});

// ---------- practice questions: written for this machine in the style of NCEA physics, not real exam questions
const QUESTIONS=[
 {step:"drag",q:"A single-seater has a drag coefficient of 0.90 and a frontal area of 1.5 m². Calculate the drag force on it at 50 m s⁻¹. Take the density of air as 1.2 kg m⁻³."},
 {step:"drag",q:"The car's speed doubles from 40 m s⁻¹ to 80 m s⁻¹. Explain why the drag force becomes four times bigger, not twice as big."},
 {step:"downforce",q:"Explain how an upside-down wing produces downforce. Refer to the air being pushed and Newton's third law."},
 {step:"downforce",q:"The car (mass 800 kg) has C_L × A = 3.0 m². Calculate the speed at which the downforce equals the car's weight. Take g = 9.8 N kg⁻¹ and ρ = 1.2 kg m⁻³."},
 {step:"downforce",q:"Explain why downforce lets the car go round a corner faster, even though the car's mass has not changed. Refer to friction and the normal force."},
 {step:"downforce",q:"At 200 km/h the car takes a corner of radius 150 m. Calculate the centripetal force needed (mass 800 kg), and state which force provides it."},
 {step:"forces",q:"Draw a labelled free-body diagram for the car moving at a constant speed on a flat, straight track. Explain why the forces are balanced."},
 {step:"forces",q:"At 250 km/h the drag on the car is 4,700 N. Calculate the power the engine must deliver to keep the car at this speed."},
 {step:"forces",q:"The engine can deliver 450 kW. Explain why the car has a top speed, and why a steeper rear wing lowers that top speed."},
 {step:"flow",q:"Smoke lines bunch together under the rear wing. Explain what this shows about the speed and the pressure of the air there, and how this produces downforce."},
 {step:"drs",q:"When the driver opens the rear-wing flap, the drag coefficient falls. Explain why the top speed rises, and why the flap must be closed before a corner."}];
const QB_KEY="windtunnel-questions-v1";let ADDED=[];try{ADDED=JSON.parse(localStorage.getItem(QB_KEY)||"[]")}catch(e){}

let API;
API=StudyKit.mount({kupu:KUPU,scene3d:windtunnel3d,
  eyebrow:"Physics · Forces and mechanics", title:"The wind tunnel machine", crumb:"Drag, downforce and grip, balanced forces and power, airflow and streamlines, and opening the rear-wing flap, on an open-wheel race car in a wind tunnel", homeHash:"l2",
  fig:"FIG. 23 · A SINGLE-SEATER IN THE WIND TUNNEL", railTitle:"Drag, downforce, forces and airflow",
  badge:{label:"NCEA physics"},
  mainBox:"0 0 800 420", mainPhoneBig:true, mainLabel:"An open-wheel race car made in Blender, in a wind tunnel, with force arrows and smoke lines you can move", closeBox:"0 0 420 260",
  state:s, steps,
  onStep:(x,stp)=>{if(stp.k!=="test")s.view=stp.k;else s.view="test";if(stp.k==="drs"&&s.speed<100)s.speed=250},
  controls:[
    {type:"range",id:"speed",label:"Wind speed",min:0,max:300,step:5,get:()=>s.speed,set:(x,v)=>{s.speed=v},fmt:()=>`${s.speed} km/h`},
    {type:"range",id:"wing",label:"Rear-wing angle",min:0,max:30,step:1,get:()=>s.wing,set:(x,v)=>{s.wing=v},fmt:()=>`${s.wing}°`},
    {type:"button",id:"dbl",label:"× 2 Double the speed",onClick:()=>{s.speed=s.speed<=150?Math.max(50,s.speed*2):Math.round(s.speed/10)*5}},
    {type:"toggle",id:"drs",label:"Open the flap (DRS)",labelFn:()=>s.drs?"Flap open (DRS): close it":"Open the flap (DRS)",get:()=>s.drs,set:(x,v)=>{s.drs=v}},
    {type:"range",id:"wand",label:"Smoke wand height",min:.1,max:1.5,step:.05,get:()=>s.wand,set:(x,v)=>{s.wand=v},fmt:()=>`${fmt(s.wand,2)} m`}],
  drawMain:()=>DRAW[s.view](),
  drawClose,
  chips:()=>{const f=F(),h=s.speed/2;
    return{speed:["SPEED",`${s.speed} km/h · ${fmt(f.v,1)} m/s`,true],drag:["DRAG",KN(f.D)],double:s.speed<=150?["AT 2× THE SPEED",`${KN(drag(2*s.speed,s.wing,s.drs))} (×4)`]:["AT HALF THE SPEED",`${KN(drag(h,s.wing,s.drs))} (÷4)`],
      down:["DOWNFORCE",KN(f.L)],ratio:["DOWNFORCE VS WEIGHT",`${fmt(f.L/WEIGHT,2)} × weight`,f.L>=WEIGHT],grip:["GRIP",`${fmt(f.grip/WEIGHT,1)} g sideways`],
      thrust:["THRUST NEEDED",`${KN(f.D)} (= drag)`],power:["POWER NEEDED",`${fmt(f.P/1000)} kW`,f.P>PMAX],top:["TOP SPEED (450 kW)",`${fmt(f.top)} km/h`],
      wand:["SMOKE WAND",`${fmt(s.wand,2)} m up`],smoke:["SMOKE GOES",smokeGoes()==="under"?"under the rear wing":smokeGoes()==="into"?"into the wing":smokeGoes()==="over"?"over the rear wing":"above the car",smokeGoes()==="under"]}},
  challenges:[
    {q:"Find the speed where the drag is exactly four times as big as it is at 100 km/h.",check:()=>s.speed===200,ok:"Yes: 200 km/h. Twice the speed gives 2² = 4 times the drag.",no:()=>`At ${s.speed} km/h the drag is ${fmt(drag(s.speed,s.wing,s.drs)/drag(100,s.wing,s.drs),2)} times the drag at 100 km/h. Drag goes with v².`},
    {q:"Make the downforce bigger than the car's weight.",check:()=>down(s.speed,s.wing,s.drs)>WEIGHT,ok:()=>`Yes: ${KN(down(s.speed,s.wing,s.drs))} of downforce against ${KN(WEIGHT)} of weight. In theory it could stick to a ceiling at this speed.`,no:()=>`Downforce is ${KN(down(s.speed,s.wing,s.drs))}; the weight is ${KN(WEIGHT)}. Go faster or steepen the wing.`},
    {q:"With the rear wing at its steepest (30°), find the lowest speed where the downforce at least equals the weight.",check:()=>s.wing===30&&!s.drs&&down(s.speed,30,false)>=WEIGHT&&down(s.speed-5,30,false)<WEIGHT,ok:"Yes: about 195 km/h. From ½ρv²C_LA = mg, v = √(2mg ÷ ρC_LA) ≈ 54 m s⁻¹.",no:()=>s.wing!==30||s.drs?"Set the wing to 30° with the flap closed first.":down(s.speed,30,false)<WEIGHT?"Not enough downforce yet: go a little faster.":"That works, but try a slower speed."},
    {q:"Find a speed where holding that speed takes between 90 and 110 kW of power.",check:()=>{const P=power(s.speed,s.wing,s.drs);return P>=90000&&P<=110000},ok:()=>`Yes: P = Fv = ${fmt(drag(s.speed,s.wing,s.drs))} N × ${fmt(ms(s.speed),1)} m s⁻¹ ≈ ${fmt(power(s.speed,s.wing,s.drs)/1000)} kW.`,no:()=>`At ${s.speed} km/h the car needs ${fmt(power(s.speed,s.wing,s.drs)/1000)} kW. Power goes with v³, so small speed changes matter.`},
    {q:"Set up the wing for the highest possible top speed.",check:()=>s.wing===0&&s.drs,ok:()=>`Yes: the flattest wing with the flap open has the least drag, so 450 kW reaches about ${fmt(topSpeed(0,true))} km/h.`,no:"Less drag means a higher top speed. What makes the rear wing as flat as possible?"},
    {q:"Use the flap (DRS) to get the top speed above 310 km/h.",check:()=>s.drs&&topSpeed(s.wing,s.drs)>310,ok:()=>`Yes: about ${fmt(topSpeed(s.wing,s.drs))} km/h. Less drag, same power, higher speed.`,no:()=>!s.drs?"Open the flap first.":`Top speed is ${fmt(topSpeed(s.wing,s.drs))} km/h. Try a flatter wing as well.`},
    {q:"Move the smoke wand so the smoke passes under the rear wing, where the air speeds up.",check:()=>s.speed>0&&smokeGoes()==="under",ok:"Yes: the smoke squeezes under the rear wing. Faster air there means lower pressure, so the wing is pushed down.",no:()=>`Right now the smoke goes ${SMOKE_TXT[smokeGoes()]}. Lower the wand.`}],
  papers:[{label:"NZQA past exams: Physics (NCEA Level 2 mechanics)",url:"https://www2.nzqa.govt.nz/ncea/subjects/past-exams-and-exemplars/physics/"}],
  truth:"The car and its numbers are a generic open-wheel single-seater, not any real team's car or data. The coefficients are typical textbook-style estimates: drag coefficient 0.70 to 1.09 with a 1.5 m² frontal area, C_L × A from 1.5 to 4.5 m² as the rear wing steepens, tyre grip coefficient 1.5, mass 800 kg with the driver, 450 kW at the wheels, air density 1.2 kg/m³ and g = 9.8 N/kg. Rolling resistance, gears and changes in air density are ignored, and opening the flap simply keeps 55% of the rear wing's drag and 40% of its downforce. The smoke and streamlines are a simplified 2D stream-function sketch around the car's side profile to show the idea; they are not a CFD simulation, and the particles move far slower than the real air would.",
  footer:"Covers forces and mechanics for NCEA physics (Years 11 to 13): drag and F = ½ρv²C_dA, downforce as negative lift, Newton's third law, friction, the normal force and grip in corners (F = mv²/r), balanced forces and free-body diagrams, power P = Fv and top speed, streamlines and the link between air speed and pressure, and a drag reduction system."
});

// ---------- the practice question bank. Allen can add to it (study/tutor.js, add_question).
const bank={list:()=>[...QUESTIONS,...ADDED.map(x=>({...x,added:true}))],
  add(q){const item={step:steps.some(x=>x.k===q.step&&x.k!=="test")?q.step:"",q:String(q.question||"").replace(/[<>]/g,"").slice(0,900)};if(item.q.length<10)return null;ADDED.push(item);ADDED=ADDED.slice(-30);try{localStorage.setItem(QB_KEY,JSON.stringify(ADDED))}catch(e){}paintBank();return item}};
try{window.StudyKit.current.cfg.questionBank=bank}catch(e){}
const host=document.createElement("section");host.className="card qbank";host.setAttribute("aria-labelledby","qb-h");
const qcss=document.createElement("style");qcss.textContent=`.qbank{margin-top:18px}.qbank h3{margin:0 0 4px}.qbank>p{margin:0 0 14px;color:var(--as-muted,#654A4E);font-size:14px}.qbank ol{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.qbank li{border:1px solid var(--as-line,#E4D9DE);border-radius:14px;padding:12px 14px;display:grid;gap:8px}.qbank li b{font:600 11px "IBM Plex Mono",monospace;letter-spacing:.06em;color:#916A70;text-transform:uppercase}.qbank li .acts{display:flex;gap:8px;flex-wrap:wrap}
.qbank li.added{border-style:dashed}.qbank .q{font-size:15px;line-height:1.5}`;document.head.appendChild(qcss);
function paintBank(){const list=bank.list();host.innerHTML=`<h3 id="qb-h">Practice questions</h3><p>Written for this machine in the style of NCEA physics, not real exam questions. Open the tool for each one, or work through it with Allen. Ask Allen for more and he'll add them here.</p><ol>${list.map((x,i)=>`<li class="${x.added?"added":""}"><b>${esc((steps.find(st=>st.k===x.step)||{lab:"Forces and mechanics"}).lab)}${x.added?" · added by Allen":""}</b><span class="q">${esc(x.q)}</span><span class="acts">${x.step?`<button class="btn" type="button" data-qopen="${x.step}">Open the tool</button>`:""}<button class="btn primary" type="button" data-qallen="${i}">Work through it with Allen</button></span></li>`).join("")}</ol>`}
paintBank();
(document.querySelector(".card.practise")||document.querySelector(".bench")).insertAdjacentElement("afterend",host);
host.addEventListener("click",e=>{const o=e.target.closest("[data-qopen]"),a=e.target.closest("[data-qallen]");
  if(o){const i=steps.findIndex(x=>x.k===o.dataset.qopen);if(i>=0){API.setStep(i);try{document.querySelector(".bench").scrollIntoView({behavior:RM?"auto":"smooth",block:"start"})}catch(err){}}}
  if(a){const x=bank.list()[+a.dataset.qallen];dispatchEvent(new CustomEvent("allen:ask",{detail:{display:"Work through this practice question with me:\n\n"+x.q,
    text:`Here is a practice question for NCEA physics (forces and mechanics). Work through it with me step by step, and use this machine to show each part (switch to the right step and move the controls: the wind speed, the rear-wing angle, the flap and the smoke wand). Let me try each part before you give the answer.\n\n---\n${x.q}`}}))}});

// ---------- Download the CAD files: the race car from windtunnel.glb, exported by tools/cad/windtunnel_cad.py
// (sizes are checked by study/tests/cad-export.test.mjs)
const CAD_DIR="/assets/models/windtunnel/cad/";
const CAD=[
 {f:"race-car-1to20.stl",type:"STL",size:2573784,label:"STL to 3D print",n:"The whole car at 1:20, one closed, watertight solid (264 × 100 × 57 mm)",use:"Slice it in Cura, PrusaSlicer or Bambu Studio, or open it in any 3D app. Millimetres. The front-wing endplates and the engine-cover fin are under 1 mm thick at this size: a resin printer handles them, or thicken them first."},
 {f:"race-car.obj",type:"OBJ",size:3319857,label:"OBJ model",n:"The car at full size, with colours",use:"Opens in Blender, Fusion, SketchUp, Rhino and most 3D apps. In metres, one named object per part (wings, wheels, halo).",extra:{f:"race-car.mtl",type:"MTL",size:2394,why:"in the same folder gives it its colours."}},
 {f:"race-car-side.dxf",type:"DXF",size:211286,label:"DXF side elevation",n:"Side elevation at 1:20 on an A3 sheet, with dimensions",use:"Opens in AutoCAD, SketchUp, Fusion, DraftSight and LibreCAD (free). Millimetres, on named layers: length, wheelbase, height and overhangs."}];
const ccss=document.createElement("style");ccss.textContent=`.cadfiles{margin-top:18px}.cadfiles h3{margin:0 0 4px}.cadfiles>p{margin:0 0 12px;color:var(--as-muted,#654A4E);font-size:14px;line-height:1.5}.cadfiles ul{list-style:none;margin:0;padding:0;display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr))}
.cadfiles li{border:1px solid var(--as-line,#E4D9DE);border-radius:14px;padding:12px 14px;display:grid;gap:6px;align-content:start;min-width:0}.cadfiles li .btn{justify-self:start;max-width:100%;overflow-wrap:anywhere}
.cadfiles .meta{font:500 11px "IBM Plex Mono",monospace;letter-spacing:.04em;color:#916A70;text-transform:uppercase}.cadfiles .what{font-weight:600;font-size:14.5px;line-height:1.4;color:var(--as-plum,#240B21)}.cadfiles .use{font-size:14px;color:var(--as-muted,#654A4E);line-height:1.45}
.cadfiles .fn{text-transform:none;overflow-wrap:anywhere}.cadfiles .sheets>span.sh{white-space:nowrap}.cadfiles .also{font-size:13.5px;color:var(--as-muted,#654A4E)}.cadfiles a.small{font-weight:600;color:var(--as-plum,#240B21);overflow-wrap:anywhere}.cadfiles a:focus-visible{outline:2px solid #916A70;outline-offset:2px}
.cadfiles .sheets{display:flex;flex-wrap:wrap;gap:6px 14px;margin:12px 0 0;font-size:13.5px;color:var(--as-muted,#654A4E)}.cadfiles .note{margin:12px 0 0;font:500 11px/1.6 "IBM Plex Mono",monospace;color:#916A70}`;document.head.appendChild(ccss);
const fsize=b=>b>=1048576?`${(b/1048576).toFixed(1)} MB`:`${Math.max(1,Math.round(b/1024))} KB`;
const cadItem=(dir,x)=>`<li><a class="btn" href="${dir}${x.f}" download="${x.f}" data-cad="${x.f}">Download ${esc(x.label)}</a><span class="meta">${x.type} · ${fsize(x.size)} · <span class="fn">${esc(x.f)}</span></span><span class="what">${esc(x.n)}</span><span class="use">${esc(x.use)}</span>${x.extra?`<span class="also">Also: <a class="small" href="${dir}${x.extra.f}" download="${x.extra.f}" data-cad="${x.extra.f}">${esc(x.extra.f)}</a> (${x.extra.type} · ${fsize(x.extra.size)}) ${esc(x.extra.why)}</span>`:""}</li>`;
const cad=document.createElement("section");cad.className="card cadfiles";cad.setAttribute("aria-labelledby","cad-h");
cad.innerHTML=`<h3 id="cad-h">Download the CAD files</h3><p>Real CAD and 3D-print files of the car in this wind tunnel, made from the same Blender model as the 3D view, so you can open it in actual CAD software, measure it or print your own.</p><ul>${CAD.map(x=>cadItem(CAD_DIR,x)).join("")}</ul><p class="note">A generic practice model, not any real team's car. Simplified: outlines and shapes of the Blender model, not a design for manufacture.</p>`;
host.insertAdjacentElement("afterend",cad);

// ---------- the 3D scene (Blender model, windtunnel-scene.js). Lazy, so the lesson works if 3D can't load.
function windtunnel3d(S){let world=null;const host3=S.canvas.parentElement,figure=host3.parentElement;host3.style.visibility="hidden";figure.classList.remove("s3-on");
  import("./windtunnel-scene.js").then(m=>{world=m.windtunnelScene(S,{state:s,view:()=>s.view,F,FLOW,elements,flapAngle,WEIGHT,MASS,smokeGoes,KN,fmt});const r=host3.getBoundingClientRect();world.resize?.(r.width,r.height)}).catch(e=>{host3.style.visibility="hidden";figure.classList.remove("s3-on");console.warn("Wind tunnel 3D unavailable",e)});
  return {resize(...a){world?.resize?.(...a)},update(...a){world?.update?.(...a)}}}
})();
