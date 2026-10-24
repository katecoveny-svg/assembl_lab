(()=>{
// The downhill machine: build a bike in the garage, then ride one fictional trail inspired by the Redwoods,
// Whakarewarewa Forest, Rotorua. Real physics, and your build feeds every step.
// Units: metres, seconds, kilograms. g = 9.8. Height is "y" (up), distance along the ground is "x".
const g=9.8, RHO=1.2, C_STEEL=500, AIR_T=18;
const esc=StudyKit.esc;
const fmt=(x,d=0)=>{let v=Number(x);if(!isFinite(v))v=0;if(Math.abs(v)<0.5*Math.pow(10,-d))v=0;return v.toLocaleString("en-NZ",{maximumFractionDigits:d,minimumFractionDigits:d})};
const kJ=J=>Math.abs(J)>=1000?fmt(J/1000,1)+" kJ":fmt(J)+" J";
const REDUCED=matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- the garage: parts and what they do to the physics
const SURF={dry:"Dry hardpack",mud:"Wet and muddy",roots:"Wet roots"};
const WHEELS={
  fast:{n:"Fast rollers",d:"low knobs, harder rubber",mu:{dry:.62,mud:.30,roots:.22},crr:{dry:.030,mud:.060,roots:.040},dm:-0.5,knobs:36,kh:.6,kw:1.4,wall:"#CDB68F"},
  trail:{n:"Trail knobs",d:"the all-rounder",mu:{dry:.70,mud:.40,roots:.28},crr:{dry:.040,mud:.070,roots:.050},dm:0,knobs:26,kh:1.0,kw:1.7,wall:null},
  mud:{n:"Mud spikes",d:"tall spaced spikes dig in",mu:{dry:.66,mud:.55,roots:.36},crr:{dry:.050,mud:.068,roots:.055},dm:0.3,knobs:17,kh:1.8,kw:1.5,wall:null},
  dh:{n:"DH sticky",d:"soft rubber, tough casing",mu:{dry:.78,mud:.45,roots:.33},crr:{dry:.052,mud:.080,roots:.060},dm:0.8,knobs:30,kh:1.2,kw:1.9,wall:"#CDB68F"}};
const BARS={low:{n:"Low flat",w:760,rise:10,dcda:-0.03},mid:{n:"Mid rise",w:780,rise:25,dcda:0},high:{n:"High rise",w:800,rise:40,dcda:0.03}};
const COLOURS={red:{n:"Red",main:"#C4432F",dark:"#86281B",hi:"#EC7A62"},black:{n:"Black",main:"#2C2C31",dark:"#141417",hi:"#5E5E68"},teal:{n:"Teal",main:"#3A857B",dark:"#215751",hi:"#73BBAF"}};
const CREAM="#E9DFC8",CREAM_D="#C9BCA0",GOLD="#C99A3E",GOLD_HI="#F0CF84",BLK="#1D1D21";
const MODELS={
  flow:{n:"FLOW",kind:"Park / jump",line:"Short and poppy. Loves jumps and pump track.",mass:15.0,fork:"single",travel:0.16,k:50,cda:0.50,rotor:180,rmass:0.26,colour:"red",wheels:"fast",bars:"mid",
    saddle:"cream",lowers:"frame",stanch:"#34343A",shock:"air",
    geo:{ra:[-26,-15],fa:[26.5,-15],bb:[0,-14],ha:65,fl:21.5,ht:4.5,st:[-7.5,-35],seat:[-9.5,-38],tt:[-6,-28.5],mp:[-2.5,-19],rk:[-10.5,-27],rp:[-6.3,-28],sh:[[8,-27.5],[-3.2,-24.8]]}},
  drop:{n:"DROP",kind:"Downhill",line:"Long, low and calm at speed. Built for steep.",mass:16.4,fork:"dual",travel:0.20,k:34,cda:0.53,rotor:203,rmass:0.38,colour:"black",wheels:"dh",bars:"high",
    saddle:"dark",lowers:"cream",stanch:GOLD,shock:"coil",
    geo:{ra:[-27,-15],fa:[28.5,-15],bb:[0,-13.5],ha:63,fl:23,ht:5.5,st:[-8,-34],seat:[-10.5,-36.5],tt:[-6.8,-30.5],mp:[-2.6,-18.6],rk:[-11.5,-28.5],rp:[-6.6,-30.6],sh:[[3.6,-18.6],[-1.6,-31.6]]}},
  ridge:{n:"RIDGE",kind:"Enduro / trail",line:"Pedals up, rips down. One bike for the whole forest.",mass:15.3,fork:"single",travel:0.17,k:45,cda:0.52,rotor:200,rmass:0.34,colour:"teal",wheels:"trail",bars:"mid",
    saddle:"frame",lowers:"cream",stanch:GOLD,shock:"air",
    geo:{ra:[-26.5,-15],fa:[27.5,-15],bb:[0,-14],ha:64,fl:22.5,ht:5,st:[-8.2,-38],seat:[-10.6,-41.5],tt:[-7,-32.5],mp:[-2.6,-19],rk:[-11.2,-29.5],rp:[-7,-31.2],sh:[[5.5,-22],[-2.6,-30.8]]}}};
const EXTRA={guard:0.15,pod:0.25};
const STOCK=m=>({model:m,colour:MODELS[m].colour,wheels:MODELS[m].wheels,bars:MODELS[m].bars});
const s={m:55,limit:45,grip:"dry",slow:false,attack:true,
  b:Object.assign(STOCK("drop"),{guard:false,pod:false,plate:"13",tag:"JACK"}),k:MODELS.drop.k,
  x:2,y:0,v:0,air:null,t:0,dist:0,heatB:0,heatF:0,samples:[],last:0,fc:0,fcv:0,finished:false,crash:"",lipV:0,jump:null,airPath:[],lastRun:null,ghost:null,aNow:0,brakeN:0,dust:[],gspin:0,tagA:0,tagV:0,
  v0:40,tr:0.8,sx:0,sv:0,stt:0,sphase:"ready",sdust:[],
  fh:1.2,fy:1.2,fvy:0,fx:0,fvx:0,fmax:0,fphase:"ready"};
// saved build (this device only)
const KEY="studybike.build.v1";
try{const j=JSON.parse(localStorage.getItem(KEY)||"null");if(j&&MODELS[j.model]){
  ["model","colour","wheels","bars"].forEach(k=>{if(j[k]&&({model:MODELS,colour:COLOURS,wheels:WHEELS,bars:BARS})[k][j[k]])s.b[k]=j[k]});
  s.b.guard=!!j.guard;s.b.pod=!!j.pod;if(typeof j.plate==="string")s.b.plate=cleanPlate(j.plate);if(typeof j.tag==="string")s.b.tag=cleanTag(j.tag);
  s.k=(j.k>=10&&j.k<=100)?Math.round(j.k):MODELS[s.b.model].k;if(j.m>=35&&j.m<=100)s.m=Math.round(j.m)}}catch(e){}
function save(){try{localStorage.setItem(KEY,JSON.stringify(Object.assign({},s.b,{k:s.k,m:s.m})))}catch(e){}}
function cleanPlate(t){return String(t).replace(/\D/g,"").slice(0,3)}
function cleanTag(t){return String(t).toUpperCase().replace(/[^A-Z0-9ĀĒĪŌŪ \-]/g,"").slice(0,8)}
const MD=()=>MODELS[s.b.model], WH=()=>WHEELS[s.b.wheels], BR=()=>BARS[s.b.bars], CL=()=>COLOURS[s.b.colour];
const bikeMass=()=>MD().mass+WH().dm+(s.b.guard?EXTRA.guard:0)+(s.b.pod?EXTRA.pod:0);
const M=()=>s.m+bikeMass();
const CDA=()=>MD().cda+BR().dcda+(s.b.pod?0.005:0)+(s.attack?0:0.08);
const MU=(gr=s.grip)=>WH().mu[gr], CRR=(gr=s.grip)=>WH().crr[gr];
const TRAVEL=()=>MD().travel;
const buildName=()=>`${MD().n} · ${WH().n}`;
const rotorT=()=>AIR_T+s.heatB/(MD().rmass*C_STEEL);

// ---------- the trail: [length, grade, label, step]. A step in height between segments draws a vertical face.
const PLAN=[[8,0,"Start gate"],[45,-0.45,"The chute"],[25,-0.2,"Root garden"],[20,-0.05,"Berm"],[30,-0.35,"Drop"],[4,0.32,"Lip"],
  [6,0,"Gap",-2.6],[20,-0.35,"Landing",1.4],[21,-0.15,"Fast section"],[4,0.25,"Wooden roller"],[4,-0.55,"Wooden roller"],[21,-0.15,"Fast section"],[20,-0.02,"Compression"],[40,-0.1,"Home straight"],[60,0.03,"Finish"]];
const SEG=[];{let x=0,y=70;PLAN.forEach(([L,gr,n,step])=>{if(step)y+=step;SEG.push({x0:x,x1:x+L,y0:y,y1:y+L*gr,n,gr});x+=L;y+=L*gr})}
const segAt=x=>x<0?SEG[0]:SEG.find(q=>x>=q.x0&&x<q.x1)||SEG[SEG.length-1];
const trackY=x=>{if(x<0)return SEG[0].y0;const q=segAt(x);return q.y0+(q.y1-q.y0)*(x-q.x0)/(q.x1-q.x0)};
const slope=x=>segAt(x).gr;
const SLIP=SEG.find(q=>q.n==="Lip"),SGAP=SEG.find(q=>q.n==="Gap"),SFIN=SEG[SEG.length-1],SBERM=SEG.find(q=>q.n==="Berm"),SROLL=SEG.filter(q=>q.n==="Wooden roller");
const LIP=SLIP.x1, GAP_END=SGAP.x1, FINISH=SFIN.x0, TRAIL_END=SFIN.x1, TOP=SEG[0].y0;
s.y=TOP;

function resetRun(){Object.assign(s,{x:2,y:TOP,v:4,air:null,t:0,dist:0,heatB:0,heatF:0,samples:[{t:0,d:0,v:4}],last:0,fc:0,fcv:0,finished:false,crash:"",lipV:0,jump:null,airPath:[],aNow:0,brakeN:0,dust:[]})}
function resetStop(){s.sx=0;s.sv=s.v0/3.6;s.stt=0;s.sphase="ready";s.sdust=[]}
function resetFork(){s.fy=s.fh;s.fvy=0;s.fx=0;s.fvx=0;s.fmax=0;s.fphase="fall"}

// ---------- physics on the trail
function forces(x,v){const th=Math.atan(slope(x)),c=Math.cos(th);
  return {th,grav:-g*Math.sin(th),roll:CRR()*g*c,air:0.5*RHO*CDA()*v*v/M(),brakeMax:MU()*g*c}}
// how far the fork squashes when the front (45% of the mass) lands with normal speed vn: ½mv² + mgx = ½kx²
function forkUse(vn){const mf=0.45*M(),k=s.k*1000,F0=mf*g;return (F0+Math.sqrt(F0*F0+k*mf*vn*vn))/k}
function kickFork(frac){const w=12;s.fc=0;s.fcv=Math.min(1.25,frac)*w/0.546}
function puff(x,y,n,spread,up){for(let i=0;i<n&&s.dust.length<90;i++)s.dust.push({x:x+(Math.random()-0.5)*spread,y:y+Math.random()*0.15,vx:(Math.random()-0.6)*1.4,vy:up*(0.4+Math.random()),life:1,max:0.7+Math.random()*0.8,r:0.08+Math.random()*0.1})}
function tickTrail(dt){
  const sub=12;for(let i=0;i<sub;i++){const d=dt/sub;s.t+=d;
    if(s.air){const a=s.air,sp=Math.hypot(a.vx,a.vy),k=0.5*RHO*CDA()*sp/M();a.vx-=k*a.vx*d;a.vy-=(g+k*a.vy)*d;s.x+=a.vx*d;s.y+=a.vy*d;s.dist+=sp*d;s.v=sp;
      if(s.airPath.length<400)s.airPath.push([s.x,s.y]);
      if(s.y<=trackY(s.x)){const th=Math.atan(slope(s.x)),vpar=a.vx*Math.cos(th)+a.vy*Math.sin(th),vn=Math.max(0,-(-a.vx*Math.sin(th)+a.vy*Math.cos(th)));
        s.air=null;s.y=trackY(s.x);const fx=forkUse(vn);s.jump={dist:s.x-LIP,cleared:s.x>=GAP_END,v:s.lipV,impact:vn,forkX:fx,bottom:fx>TRAVEL()};
        kickFork(fx/TRAVEL());puff(s.x,s.y,16,1.6,1);snd.thud(Math.min(1,vn/6));
        if(s.x<GAP_END){s.crash="Came up short and cased the landing. More speed at the lip.";s.v=0;s.playing=false;return}
        s.v=Math.max(0,vpar)}
      continue}
    const F=forces(s.x,s.v);let aFree=F.grav-F.roll*(s.v>0.01?1:0)-F.air;
    const target=s.finished?0:s.limit/3.6;let aB=0;
    if(s.v>target){aB=Math.min(F.brakeMax,Math.max(0,(s.v-target)/d*0.15+aFree))}
    if(s.finished)aB=F.brakeMax*0.6;
    const a=aFree-aB;s.aNow+=(a-s.aNow)*0.04;s.brakeN+=(aB*M()-s.brakeN)*0.04;
    const v0=s.v;s.v=Math.max(0,s.v+a*d);const vm=(v0+s.v)/2;
    s.heatB+=M()*aB*vm*d;s.heatF+=M()*(F.roll+F.air)*vm*d;
    const px=s.x;s.x+=vm*Math.cos(F.th)*d;s.dist+=vm*d;
    if(px<LIP&&s.x>=LIP){s.lipV=s.v;const th=Math.atan(SLIP.gr);s.x=LIP;s.y=SLIP.y1;s.air={vx:s.v*Math.cos(th),vy:s.v*Math.sin(th)};s.airPath=[[s.x,s.y]];continue}
    s.y=trackY(s.x);
    if(!s.finished&&s.x>=FINISH){s.finished=true;s.lastRun={time:s.t,avg:s.dist/s.t,cleared:!!(s.jump&&s.jump.cleared),limit:s.limit,m:s.m,grip:s.grip,build:buildName(),model:s.b.model,wheels:s.b.wheels,rotorT:rotorT(),mass:M()};
      s.ghost={samples:s.samples.slice(),label:buildName()+" · brakes above "+(s.limit>=80?"never":s.limit+" km/h")}}
    if(s.finished&&s.v<=0.01){s.playing=false;return}
    if(!s.finished&&s.v<=0.01&&F.grav<=0&&s.t>1){s.crash="Stopped. The trail flattened out and you ran out of speed.";s.playing=false;return}}
  if(s.t-s.last>=0.1){s.last=s.t;s.samples.push({t:s.t,d:s.dist,v:s.v})}
  // dust from the rear tyre when the brakes are working hard
  if(!s.air&&s.brakeN>120&&s.v>1&&Math.random()<Math.min(1,s.brakeN/500)*dt*40){const th=Math.atan(slope(s.x));puff(s.x-1.55*Math.cos(th),trackY(s.x-1.55),1+(s.brakeN>500?1:0),0.4,0.8)}
  s.dust.forEach(p=>{p.life-=dt/p.max;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy*=1-dt*1.5;p.vx*=1-dt*1.2;p.r+=dt*0.35});s.dust=s.dust.filter(p=>p.life>0);
  // fork spring after a landing (visual, as a fraction of travel)
  const w=12;s.fcv+=(-w*w*s.fc-2*0.5*w*s.fcv)*dt;s.fc=Math.max(-0.1,Math.min(1.1,s.fc+s.fcv*dt));
  // the gear tag swings like a pendulum in an accelerating frame: tan θ = a/g
  const tgt=Math.atan2(-s.aNow,g)*180/Math.PI*1.2;s.tagV+=((tgt-s.tagA)*30-s.tagV*3)*dt;s.tagA+=s.tagV*dt;
}
// ---------- stopping distance on a flat run-out
const LOGX=25;
function tickStop(dt){if(s.sphase==="ready")s.sphase="see";s.stt+=dt;const mu=MU();
  if(s.sphase==="see"){s.sx+=s.sv*dt;if(s.stt>=s.tr){s.sphase="brake";s.thinkAt=s.sx}}
  else if(s.sphase==="brake"){const v=Math.max(0,s.sv-mu*g*dt);s.sx+=(s.sv+v)/2*dt;s.sv=v;
    if(v>0.5&&Math.random()<dt*30)for(let i=0;i<2;i++)s.sdust.push({x:s.sx-1.2+Math.random()*0.3,y:0,vx:-Math.random()*0.8,vy:0.5+Math.random(),life:1,max:0.8+Math.random()*0.7,r:0.1});
    if(v<=0){s.sphase="stopped";s.playing=false}}
  s.sdust.forEach(p=>{p.life-=dt/p.max;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy*=1-dt*1.6;p.r+=dt*0.35});s.sdust=s.sdust.filter(p=>p.life>0)}
function stopNums(v0=s.v0,tr=s.tr,gr=s.grip){const v=v0/3.6,mu=MU(gr),think=v*tr,brake=v*v/(2*mu*g);return{v,think,brake,total:think+brake,mu}}
// ---------- the fork: a spring (F = kx) catching a drop
function forkNums(){const mf=0.45*M(),k=s.k*1000,F0=mf*g,x=(F0+Math.sqrt(F0*F0+2*k*F0*s.fh))/k,T=TRAVEL();return{mf,k,sag:F0/k,x,F:k*Math.min(x,T),T}}
function tickFork(dt){const N=forkNums(),T=N.T;const sub=20;for(let i=0;i<sub;i++){const d=dt/sub;
  if(s.fphase==="fall"){s.fvy-=g*d;s.fy+=s.fvy*d;if(s.fy<=0){s.fy=0;s.fvx=-s.fvy;s.fphase="squash";snd.thud(0.8)}}
  else if(s.fphase==="squash"){const c=s.fvx<0?2*0.35*Math.sqrt(N.k*N.mf):0;const a=(N.mf*g-N.k*s.fx-c*s.fvx)/N.mf;s.fvx+=a*d;s.fx=Math.max(0,Math.min(T,s.fx+s.fvx*d));
    if(s.fx>=T&&s.fvx>0)s.fvx=0;s.fmax=Math.max(s.fmax,s.fx);if(Math.abs(s.fvx)<0.004&&Math.abs(s.fx-N.sag)<0.004){s.fphase="settled";s.playing=false}}}}

// =====================================================================================
// ---------- drawing: the bike, side-on, facing right. Units: 1 unit ≈ 2.5 cm; wheels touch y = 0.
const ik=(A,B,l1,l2,dir)=>{const dx=B[0]-A[0],dy=B[1]-A[1];let d=Math.min(Math.hypot(dx,dy),l1+l2-0.01);const a=Math.atan2(dy,dx),c=(l1*l1+d*d-l2*l2)/(2*l1*d),b=Math.acos(Math.max(-1,Math.min(1,c)));return[A[0]+Math.cos(a+dir*b)*l1,A[1]+Math.sin(a+dir*b)*l1]};
const P2=p=>`${p[0].toFixed(2)},${p[1].toFixed(2)}`;
const add=(p,q,k=1)=>[p[0]+q[0]*k,p[1]+q[1]*k];
function tube(a,b,w,C,ctrl){const d=ctrl?`M${P2(a)} Q${P2(ctrl)} ${P2(b)}`:`M${P2(a)} L${P2(b)}`;const ang=Math.atan2(b[1]-a[1],b[0]-a[0]),nx=Math.sin(ang),ny=-Math.cos(ang),o=w*0.22;
  return `<path d="${d}" stroke="${C.main}" stroke-width="${w}" fill="none" stroke-linecap="round"/><path d="${d}" stroke="${C.dark}" stroke-width="${w*0.3}" fill="none" stroke-linecap="round" transform="translate(${(-nx*o).toFixed(2)},${(-ny*o).toFixed(2)})" opacity=".55"/><path d="${d}" stroke="${C.hi}" stroke-width="${w*0.2}" fill="none" stroke-linecap="round" transform="translate(${(nx*o).toFixed(2)},${(ny*o).toFixed(2)})" opacity=".75"/>`}
function heatTint(T){if(T<70)return "";const f=Math.min(1,(T-70)/330);return `rgba(${Math.round(200+55*f)},${Math.round(150-60*f)},${Math.round(60-30*f)},${(0.15+0.7*f).toFixed(2)})`}
function wheel(c,spin,W,rotorR,heat,caliperAng,detail){const [x,y]=c;let o="";
  // tyre casing and sidewall
  o+=`<circle cx="${x}" cy="${y}" r="15.15" fill="none" stroke="#1B1A1D" stroke-width="3.9"/>`;
  if(W.wall)o+=`<circle cx="${x}" cy="${y}" r="14.2" fill="none" stroke="${W.wall}" stroke-width="1.7"/>`;
  else o+=`<circle cx="${x}" cy="${y}" r="15.6" fill="none" stroke="#3A383D" stroke-width="0.5"/>`;
  // tread: knobs around the outside, turning with the wheel
  let kp="";const n=W.knobs;for(let i=0;i<n;i++){const a=spin+i*2*Math.PI/n,ca=Math.cos(a),sa=Math.sin(a),r0=16.95,h=W.kh*(i%2?0.8:1),hw=W.kw/2*(i%2?0.8:1);
    const p1=[x+ca*r0-sa*hw,y+sa*r0+ca*hw],p2=[x+ca*(r0+h)-sa*hw*0.8,y+sa*(r0+h)+ca*hw*0.8],p3=[x+ca*(r0+h)+sa*hw*0.8,y+sa*(r0+h)-ca*hw*0.8],p4=[x+ca*r0+sa*hw,y+sa*r0-ca*hw];
    kp+=`M${P2(p1)}L${P2(p2)}L${P2(p3)}L${P2(p4)}Z`}
  o+=`<path d="${kp}" fill="#1B1A1D"/>`;
  // rim
  o+=`<circle cx="${x}" cy="${y}" r="12.75" fill="none" stroke="#141416" stroke-width="1.4"/><circle cx="${x}" cy="${y}" r="12.05" fill="none" stroke="#4A4850" stroke-width="0.35"/>`;
  // spokes (two-cross lacing)
  if(detail){let sp="";for(let i=0;i<24;i++){const a=spin+i*Math.PI/12,a2=a+(i%2?0.42:-0.42);sp+=`M${P2([x+Math.cos(a)*1.9,y+Math.sin(a)*1.9])}L${P2([x+Math.cos(a2)*11.4,y+Math.sin(a2)*12])}`}
    o+=`<path d="${sp}" stroke="#77737C" stroke-width="0.28" fill="none"/>`}
  else{let sp="";for(let i=0;i<8;i++){const a=spin+i*Math.PI/4;sp+=`M${x},${y}L${P2([x+Math.cos(a)*11.4,y+Math.sin(a)*11.4])}`}o+=`<path d="${sp}" stroke="#77737C" stroke-width="0.5" fill="none"/>`}
  // disc rotor: rim, cut-outs, spider
  o+=`<circle cx="${x}" cy="${y}" r="${rotorR}" fill="none" stroke="#B9B6BC" stroke-width="1.15"/>`;
  const tint=heatTint(heat);if(tint)o+=`<circle cx="${x}" cy="${y}" r="${rotorR}" fill="none" stroke="${tint}" stroke-width="1.4"/>`;
  if(detail){let hp="";for(let i=0;i<10;i++){const a=spin*1+i*Math.PI/5;hp+=`M${P2([x+Math.cos(a)*(rotorR-0.3),y+Math.sin(a)*(rotorR-0.3)])}m-.22,0a.22,.22 0 1,0 .44,0a.22,.22 0 1,0 -.44,0`}o+=`<path d="${hp}" fill="#3A383D"/>`}
  let sd="";for(let i=0;i<5;i++){const a=spin+i*2*Math.PI/5;sd+=`M${P2([x+Math.cos(a)*1.6,y+Math.sin(a)*1.6])}L${P2([x+Math.cos(a+0.25)*(rotorR-0.6),y+Math.sin(a+0.25)*(rotorR-0.6)])}`}
  o+=`<path d="${sd}" stroke="#9C99A0" stroke-width="0.6" fill="none"/>`;
  // caliper
  const ca=caliperAng;o+=`<g transform="translate(${x},${y}) rotate(${ca*180/Math.PI})"><rect x="${rotorR-1.6}" y="-1.6" width="3.2" height="3.2" rx="0.8" fill="#2A2A2F" stroke="#55545C" stroke-width="0.25"/></g>`;
  // hub
  o+=`<circle cx="${x}" cy="${y}" r="2.1" fill="#2A2A2F"/><circle cx="${x}" cy="${y}" r="0.8" fill="#8E8B92"/>`;
  return o}
function geoPts(b,comp){const Md=MODELS[b.model],G=Md.geo,ha=G.ha*Math.PI/180,u=[-Math.cos(ha),-Math.sin(ha)];
  const HB0=add(G.fa,u,G.fl),HT0=add(HB0,u,G.ht);const sh=p=>{const t=Math.max(0,Math.min(1,(p[0]-G.ra[0])/(HB0[0]-G.ra[0])));return[p[0]-u[0]*comp*t,p[1]-u[1]*comp*t]};
  const P={u,ha,RA:G.ra,FA:G.fa,HB:sh(HB0),HT:sh(HT0),BB:sh(G.bb),ST:sh(G.st),SEAT:sh(G.seat),TT:sh(G.tt),MP:sh(G.mp),RP:sh(G.rp),RK:G.rk,SH0:sh(G.sh[0]),SH1:sh(G.sh[1])};
  P.UC=Md.fork==="dual"?add(P.HT,u,1.6):P.HB;
  P.SB=Md.fork==="dual"?add(P.UC,u,0.9):add(P.HT,u,1.6);
  P.CL=add(P.SB,[1,0],Md.fork==="dual"?2:2.4);P.CL[1]-=0.2;
  const R=BARS[b.bars].rise/25;P.GR=[P.CL[0]-1.3,P.CL[1]-R-0.3];
  P.PF=add(P.BB,[6.6,0]);P.PR=add(P.BB,[-6.6,0]);
  return P}
// o: {b, spin, comp (0..1 of travel), rider, pose (0 attack, 1 upright), crouch, tag (deg), heat (°C), light, detail}
function bikeSVG(o){const b=o.b,Md=MODELS[b.model],C=COLOURS[b.colour],W=WHEELS[b.wheels],G=Md.geo;
  const travelU=Md.travel/0.025,comp=Math.max(0,Math.min(1,o.comp||0))*travelU,P=geoPts(b,comp),u=P.u;
  const spin=o.spin||0,detail=o.detail!==false,rr=Md.rotor/50*1.15;
  let out="";
  // the far leg and arm sit behind the bike
  const RD=o.rider?riderPts(P,o):null;
  if(RD)out+=riderBack(RD);
  // wheels
  out+=wheel(P.RA,spin,W,rr,o.heat||0,-2.2,detail)+wheel(P.FA,spin,W,rr,o.heat||0,-2.05,detail);
  // drivetrain: chain, cassette, mech
  const cs=P.RA,ch=P.BB;out+=`<path d="M${P2(add(ch,[0,-3.7]))} L${P2(add(cs,[0,-2.9]))} M${P2(add(ch,[0,3.7]))} L${P2(add(cs,[1.3,5.4]))} L${P2(add(cs,[0.6,2.9]))}" stroke="#56535B" stroke-width="0.8" fill="none" stroke-dasharray="0.7 0.35"/>`;
  out+=`<circle cx="${cs[0]}" cy="${cs[1]}" r="2.9" fill="none" stroke="#6B6870" stroke-width="1.2" stroke-dasharray="0.5 0.3"/><path d="M${P2(add(cs,[0.2,0.6]))} l1.4,3.4 l-0.6,2" stroke="#2A2A2F" stroke-width="1.1" fill="none" stroke-linecap="round"/><circle cx="${cs[0]+1.3}" cy="${cs[1]+5.4}" r="0.8" fill="#2A2A2F"/>`;
  // rear end: chainstay and seatstay
  out+=tube(P.MP,P.RA,3.4,C)+tube(P.RA,P.RK,2.7,C);
  out+=`<path d="M${P2(add(P.MP,[-1.5,1]))} L${P2(add(P.RA,[5,0.2]))}" stroke="${CREAM}" stroke-width="1.6" stroke-linecap="round" opacity=".95"/>`;
  out+=`<circle cx="${P.RA[0]}" cy="${P.RA[1]}" r="1.6" fill="${C.dark}"/>`;
  // main frame
  const ttCtrl=b.model==="flow"?[ (P.HT[0]+P.TT[0])/2, Math.max(P.HT[1],P.TT[1])+1.6 ]:null;
  out+=tube(P.HB,P.BB,5.4,C)+tube(P.BB,P.ST,4,C)+tube(add(P.HT,u,-0.9),P.TT,3.8,C,ttCtrl);
  // gusset and skid plate
  out+=`<path d="M${P2(add(P.BB,[3.2,-1.2]))} Q${P2(add(P.BB,[1.2,3.4]))} ${P2(add(P.BB,[-2.6,1.6]))}" stroke="${CREAM}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  // shock and linkage
  const s0=P.SH0,s1=P.SH1,sl=Math.hypot(s1[0]-s0[0],s1[1]-s0[1]),sa=Math.atan2(s1[1]-s0[1],s1[0]-s0[0])*180/Math.PI;
  out+=`<g transform="translate(${P2(s0)}) rotate(${sa.toFixed(1)})">`;
  if(Md.shock==="coil"){out+=`<rect x="0" y="-1.1" width="${sl}" height="2.2" rx="1" fill="#2A2A2F"/>`;let cz="";const n=9;for(let i=0;i<=n;i++){const xx=sl*0.18+i*(sl*0.62)/n;cz+=`${i?"L":"M"}${xx.toFixed(2)},${i%2?-2.2:2.2}`}
    out+=`<path d="${cz}" stroke="${b.colour==="black"?"#D98A2B":GOLD}" stroke-width="0.9" fill="none" stroke-linejoin="round"/><rect x="${sl*0.12}" y="-2.6" width="1" height="5.2" fill="#3A3A40"/>`}
  else{out+=`<rect x="${sl*0.4}" y="-0.55" width="${sl*0.55}" height="1.1" fill="${GOLD_HI}"/><rect x="0" y="-1.75" width="${sl*0.55}" height="3.5" rx="1.4" fill="#2A2A2F"/><rect x="${sl*0.05}" y="-1.2" width="${sl*0.45}" height="0.5" fill="#55545C"/><rect x="${sl*0.42}" y="-1.9" width="1.2" height="3.8" rx=".4" fill="${b.colour==="red"?CREAM:"#C24A2F"}"/>`}
  out+=`<circle cx="0" cy="0" r=".9" fill="#55545C"/><circle cx="${sl}" cy="0" r=".9" fill="#55545C"/></g>`;
  // rocker link
  out+=`<path d="M${P2(P.RK)} L${P2(P.RP)} L${P2(s1)}" stroke="${C.dark}" stroke-width="2.6" fill="none" stroke-linejoin="round" stroke-linecap="round"/><path d="M${P2(P.RK)} L${P2(P.RP)} L${P2(s1)}" stroke="${C.hi}" stroke-width="0.5" fill="none" opacity=".6" transform="translate(0,-0.5)"/>`;
  [P.RK,P.RP,P.MP].forEach(q=>out+=`<circle cx="${q[0]}" cy="${q[1]}" r="0.95" fill="#2A2A2F"/><circle cx="${q[0]}" cy="${q[1]}" r="0.35" fill="#AAA6AE"/>`);
  // head tube
  out+=`<path d="M${P2(P.HT)} L${P2(P.HB)}" stroke="${C.main}" stroke-width="4.6" stroke-linecap="round"/><path d="M${P2(P.HT)} L${P2(P.HB)}" stroke="${C.hi}" stroke-width="0.8" stroke-linecap="round" opacity=".6" transform="translate(-1,0)"/>`;
  // seat post and saddle
  const seat=P.SEAT,sc=Md.saddle==="cream"?CREAM:Md.saddle==="dark"?BLK:C.main;
  out+=`<path d="M${P2(P.ST)} L${P2(add(seat,[0.6,1.2]))}" stroke="#2A2A2F" stroke-width="2.2" stroke-linecap="round"/>`;
  out+=`<path d="M${P2(add(seat,[-4.2,0.2]))} Q${P2(add(seat,[-4,-1.6]))} ${P2(add(seat,[-1,-1.3]))} L${P2(add(seat,[4.3,-0.5]))} Q${P2(add(seat,[4.9,0.4]))} ${P2(add(seat,[3.6,0.6]))} L${P2(add(seat,[-3,1]))}Z" fill="${sc}" stroke="#141416" stroke-width="0.3"/>`;
  // gear tag hanging off the saddle rail
  if(b.tag){const tp=add(seat,[-2.6,1.1]);out+=`<g transform="translate(${P2(tp)}) rotate(${(o.tag||0).toFixed(1)})"><line x1="0" y1="0" x2="0" y2="1.6" stroke="#2A2A2F" stroke-width="0.3"/><rect x="-2.4" y="1.5" width="4.8" height="6.4" rx="1" fill="${b.colour==="black"?CREAM:C.main}" stroke="#141416" stroke-width="0.25"/><circle cx="0" cy="2.4" r="0.45" fill="#141416"/>
    <text x="0" y="5.6" text-anchor="middle" style="font:700 1.75px var(--display);letter-spacing:.02em" fill="${b.colour==="black"?"#2A2A2F":"#fff"}" ${b.tag.length>4?`textLength="4.2" lengthAdjust="spacingAndGlyphs"`:""}>${esc(b.tag)}</text></g>`}
  // name on the top tube, model on the down tube
  if(b.tag){const a=Math.atan2(P.TT[1]-P.HT[1],P.TT[0]-P.HT[0])*180/Math.PI+180,mid=[(P.HT[0]*0.55+P.TT[0]*0.45),(P.HT[1]*0.55+P.TT[1]*0.45)+(ttCtrl?0.9:0)];
    out+=`<text transform="translate(${P2(mid)}) rotate(${a.toFixed(1)})" text-anchor="middle" y="0.75" style="font:700 2.1px var(--display);letter-spacing:.06em" fill="${b.colour==="black"?CREAM:"#fff"}">${esc(b.tag)}</text>`}
  {const a=Math.atan2(P.BB[1]-P.HB[1],P.BB[0]-P.HB[0])*180/Math.PI+180,mid=[(P.HB[0]+P.BB[0])/2,(P.HB[1]+P.BB[1])/2];
    out+=`<text transform="translate(${P2(mid)}) rotate(${a.toFixed(1)})" text-anchor="middle" y="1.05" style="font:700 3px var(--display);letter-spacing:.3em" fill="${CREAM}">${Md.n}</text>`}
  // fork: lowers (fixed to the axle), stanchions slide into them, crown(s)
  const FA=P.FA,lowTop=add(FA,u,Md.fork==="dual"?10.5:9.5),lc=Md.lowers==="cream"?CREAM:C.main;
  const stTop=Md.fork==="dual"?add(P.UC,u,0.6):P.HB;
  out+=`<path d="M${P2(lowTop)} L${P2(stTop)}" stroke="${Md.stanch}" stroke-width="${Md.fork==="dual"?2.5:2.3}" stroke-linecap="round"/>`;
  if(Md.stanch===GOLD)out+=`<path d="M${P2(lowTop)} L${P2(stTop)}" stroke="${GOLD_HI}" stroke-width="0.6" stroke-linecap="round" transform="translate(-0.5,0)"/>`;
  out+=`<path d="M${P2(add(FA,u,-1.1))} L${P2(lowTop)}" stroke="${lc}" stroke-width="3.5" stroke-linecap="round"/><path d="M${P2(add(FA,u,-0.6))} L${P2(lowTop)}" stroke="${Md.lowers==="cream"?"#fff":C.hi}" stroke-width="0.7" stroke-linecap="round" opacity=".7" transform="translate(-0.9,0)"/>`;
  out+=`<path d="M${P2(add(FA,u,-0.6))} L${P2(add(FA,u,4))}" stroke="${Md.lowers==="cream"?CREAM_D:C.dark}" stroke-width="1" stroke-linecap="round" transform="translate(1.1,0.2)" opacity=".7"/>`;
  out+=`<path d="M${P2(add(lowTop,[0,0]))} q2.2,-0.4 2.7,1.9" stroke="${lc}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`; // arch
  const crown=(c,len)=>{const n=[Math.sin(P.ha),-Math.cos(P.ha)];return `<path d="M${P2(add(c,n,-len*0.45))} L${P2(add(c,n,len*0.55))}" stroke="#1F1F23" stroke-width="2.4" stroke-linecap="round"/>`};
  out+=crown(P.HB,4.4);if(Md.fork==="dual")out+=crown(P.UC,4.8);
  // front mudguard
  if(b.guard){let gp="";for(let a=-2.5;a<=-1.0;a+=0.07)gp+=`${gp?"L":"M"}${P2([FA[0]+Math.cos(a)*18.9,FA[1]+Math.sin(a)*18.9])}`;out+=`<path d="${gp}" stroke="${BLK}" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="${gp}" stroke="${b.colour==="black"?CREAM:C.main}" stroke-width="0.5" fill="none" stroke-linecap="round" opacity=".8"/>`;
    let rp="";for(let a=-1.6;a<=-0.95;a+=0.07)rp+=`${rp?"L":"M"}${P2([P.RA[0]+Math.cos(a)*18.8,P.RA[1]+Math.sin(a)*18.8])}`;out+=`<path d="${rp}" stroke="${BLK}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`}
  // cockpit: stem, bars, grips, lever
  const CLp=P.CL,GR=P.GR;
  out+=`<path d="M${P2(P.SB)} L${P2(CLp)}" stroke="#1F1F23" stroke-width="2" stroke-linecap="round"/>`;
  out+=`<path d="M${P2(CLp)} Q${P2(add(CLp,[0.4,(GR[1]-CLp[1])*0.7]))} ${P2(GR)}" stroke="#1F1F23" stroke-width="1.35" fill="none" stroke-linecap="round"/>`;
  out+=`<path d="M${P2(add(GR,[-1.4,0.3]))} L${P2(add(GR,[1.2,-0.3]))}" stroke="${b.model==="flow"?CREAM:"#2A2A2F"}" stroke-width="1.9" stroke-linecap="round"/><path d="M${P2(add(GR,[0.8,0]))} l2.6,1.4" stroke="#55545C" stroke-width="0.55" stroke-linecap="round"/>`;
  out+=`<circle cx="${CLp[0]}" cy="${CLp[1]}" r=".85" fill="#2A2A2F"/>`;
  // accessory pod: camera + light
  if(b.pod){const pm=add(CLp,[0.4,-1.7]);out+=`<path d="M${P2(add(CLp,[0.2,-0.5]))} L${P2(add(pm,[0,0.8]))}" stroke="#2A2A2F" stroke-width="0.8"/><rect x="${pm[0]-1.6}" y="${pm[1]-1.6}" width="3.4" height="2.5" rx=".5" fill="#1B1B1F"/><circle cx="${pm[0]+1.2}" cy="${pm[1]-0.35}" r=".8" fill="#3D5F78" stroke="#0E0E10" stroke-width=".25"/>`+
    `<rect x="${pm[0]-1.4}" y="${pm[1]-3.4}" width="3.1" height="1.6" rx=".7" fill="#2A2A2F"/><rect x="${pm[0]+1.4}" y="${pm[1]-3.3}" width=".6" height="1.4" rx=".2" fill="${o.light?"#FFF4C9":"#DAD3BF"}"/>`;
    if(o.light)out+=`<path d="M${pm[0]+2},${pm[1]-2.6} l26,-4 l0,9 z" fill="url(#bkBeam)" opacity=".9"/>`}
  // number plate: a race plate on the bars, seen at an angle
  if(b.plate){const pp=add(CLp,[2.8,-0.1]);out+=`<g transform="translate(${P2(pp)}) rotate(-6) scale(.62,1)"><path d="M-4.2,-3.4 Q0,-4.8 4.2,-3.4 L3.6,2.4 Q0,4.4 -3.6,2.4Z" fill="${b.colour==="black"?CREAM:"#F4EFE4"}" stroke="#141416" stroke-width=".35"/><text x="0" y="1.5" text-anchor="middle" style="font:800 ${b.plate.length>2?3.6:4.6}px var(--display);font-style:italic" fill="#1B1B1F">${esc(b.plate)}</text></g>`}
  // cranks and flat pedals (level pedals)
  out+=`<circle cx="${P.BB[0]}" cy="${P.BB[1]}" r="3.7" fill="none" stroke="#3A3A40" stroke-width="0.9" stroke-dasharray="0.55 0.3"/><circle cx="${P.BB[0]}" cy="${P.BB[1]}" r="3.1" fill="none" stroke="#2A2A2F" stroke-width="0.6"/>`;
  out+=`<path d="M${P2(P.BB)} L${P2(P.PF)}" stroke="#1F1F23" stroke-width="1.6" stroke-linecap="round"/><rect x="${P.PF[0]-1.9}" y="${P.PF[1]-0.6}" width="3.8" height="1.2" rx=".3" fill="#2A2A2F"/><circle cx="${P.BB[0]}" cy="${P.BB[1]}" r="1.1" fill="#55545C"/>`;
  if(RD)out+=riderFront(RD,b);
  return `<g transform="translate(0,-2)">${out}</g>`}
const P2len=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
// ---------- the rider, built from the bike's contact points (feet on pedals, hands on grips)
const JERSEY="#334049",JERSEY_D="#232C33",PANTS="#28282D",PANTS_D="#1A1A1E",SKIN_GLOVE="#1E1E22";
function riderPts(P,o){const up=o.pose||0,cr=Math.max(0,o.crouch||0);
  const hip=[P.BB[0]-10.5+2.5*up,P.BB[1]-26+3.5*0*up-3.5*up+cr*4.5];
  const sh=[P.GR[0]-8.4-4.4*up,P.GR[1]-9.4-7.5*up+cr*3.2];
  const head=[sh[0]+4.6-1.8*up,sh[1]-6.2];
  const fF=add(P.PF,[0,-1.2]),fR=add(P.PR,[0,-1.2]);
  return {hip,sh,head,fF,fR,kF:ik(hip,fF,16,16.2,-1),kR:ik(hip,fR,16,16.2,-1),el:ik(sh,P.GR,10.8,10.4,1),elR:ik(add(sh,[-1,0.5]),add(P.GR,[-0.6,0.2]),10.8,10.4,1),GR:P.GR,up}}
const limb=(a,b,c,w,col)=>`<path d="M${P2(a)} L${P2(b)} L${P2(c)}" stroke="${col}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
const shoe=(f,col)=>`<path d="M${P2(add(f,[-3.6,0.4]))} q0,-1.8 1.8,-2 l3,0.2 q1.6,0.3 1.7,1.7 l0,0.4z" fill="${col}"/>`;
function riderBack(R){return limb(R.hip,R.kR,R.fR,5.6,PANTS_D)+shoe(R.fR,"#121214")+limb(add(R.sh,[-1,0.5]),R.elR,add(R.GR,[-0.6,0.2]),3.6,JERSEY_D)}
function riderFront(R,b){const C=COLOURS[b.colour];let o="";
  // thigh + shin with a knee pad, then the shoe on the pedal
  o+=limb(R.hip,R.kF,R.fF,6,PANTS)+`<circle cx="${R.kF[0]}" cy="${R.kF[1]}" r="2.6" fill="#3A3A40"/>`+shoe(R.fF,"#141416");
  // torso with a slightly rounded back
  const mid=[(R.hip[0]+R.sh[0])/2-2.2,(R.hip[1]+R.sh[1])/2-1.2];
  o+=`<path d="M${P2(R.hip)} Q${P2(mid)} ${P2(R.sh)}" stroke="${JERSEY}" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M${P2(add(R.hip,[0.6,1.5]))} Q${P2(add(mid,[1.2,1.8]))} ${P2(add(R.sh,[1.6,1.4]))}" stroke="${C.main}" stroke-width="1.2" fill="none" opacity=".9"/>`;
  o+=`<circle cx="${R.hip[0]}" cy="${R.hip[1]}" r="3.7" fill="${PANTS}"/>`;
  // arm with a stripe, glove on the grip
  o+=limb(R.sh,R.el,R.GR,3.9,JERSEY)+`<path d="M${P2(add(R.sh,[0.4,0]))} L${P2(R.el)}" stroke="${C.main}" stroke-width="0.9" stroke-linecap="round" opacity=".9"/><circle cx="${R.GR[0]}" cy="${R.GR[1]}" r="1.75" fill="${SKIN_GLOVE}"/>`;
  // full-face helmet, goggles, chin bar, and the helmet camera on top
  const h=R.head;o+=`<path d="M${P2(add(R.sh,[0.5,-1]))} L${P2(add(h,[-1,3]))}" stroke="${JERSEY_D}" stroke-width="3" stroke-linecap="round"/>`;
  o+=`<g transform="translate(${P2(h)}) rotate(${(8-R.up*10).toFixed(1)}) scale(.92)"><path d="M-5.3,0.8 C-5.6,-4.6 -1.6,-6.4 1.4,-6 C4.6,-5.6 6.4,-3 6.2,0.2 L6.4,3.4 Q6.2,5.6 3.6,5.8 L0.4,5.6 Q-3.6,5.4 -5.3,0.8Z" fill="#EDE5D3" stroke="#141416" stroke-width=".3"/>`+
    `<path d="M-4.6,-2.6 Q0,-6.6 5.6,-2.2" stroke="${C.main}" stroke-width="1.3" fill="none"/><path d="M1.6,-5.9 L8.6,-5.1 L6.6,-3.6 Z" fill="${BLK}"/>`+
    `<path d="M1.4,-2.4 L6.3,-2.2 L6.3,0.6 L1.6,0.6Z" fill="#E39A2D" stroke="#141416" stroke-width=".45"/><path d="M2.2,-1.8 L5.2,-1.7" stroke="#FFF3D0" stroke-width=".45" opacity=".8"/>`+
    `<path d="M1.6,0.6 L6.3,0.6 L6.2,2.4 Q4,2.9 2,2.6Z" fill="#2A2A2F"/><path d="M1.2,2.7 Q4,3.4 6.5,2.5 L6.5,4.4 Q5.6,5.9 3.4,5.8 L0.8,5.5Z" fill="#DCD1BB" stroke="#141416" stroke-width=".3"/><path d="M4.2,3.6 l1.6,-.2 M4.2,4.5 l1.6,-.2" stroke="#55545C" stroke-width=".45"/><path d="M1.2,2.7 Q4,3.4 6.5,2.5" stroke="${C.main}" stroke-width=".7" fill="none"/>`+
    `<path d="M-4.6,-0.9 L1.4,-1" stroke="#141416" stroke-width="1"/>`+
    `<rect x="-2.2" y="-8.4" width="2.6" height="2" rx=".4" fill="${BLK}"/><circle cx="0" cy="-7.4" r=".55" fill="#3D5F78"/></g>`;
  return o}

// =====================================================================================
// ---------- scenery helpers
const R=n=>(Math.sin(n*127.1+n*n*0.013)*43758.5453)%1, rnd=n=>Math.abs(R(n));
function arrow(x1,y1,x2,y2,c,w=3,lab="",lx=0,ly=0){const a=Math.atan2(y2-y1,x2-x1),L=Math.hypot(x2-x1,y2-y1);if(L<4)return"";const h=9;
  return `<line x1="${x1}" y1="${y1}" x2="${x2-Math.cos(a)*h*0.6}" y2="${y2-Math.sin(a)*h*0.6}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/><path d="M${x2},${y2} L${x2-h*Math.cos(a-0.45)},${y2-h*Math.sin(a-0.45)} L${x2-h*Math.cos(a+0.45)},${y2-h*Math.sin(a+0.45)}Z" fill="${c}"/>${lab?`<text class="t-ink" x="${x2+lx}" y="${y2+ly}" style="font-weight:600;paint-order:stroke;stroke:var(--paper);stroke-width:3px">${lab}</text>`:""}`}
// a redwood trunk: tapering, fibrous grooves, a flared base
function trunk(x,yTop,yBase,w,col,dark,hi,seed,flare=1.5){const t=w*0.82,f=w*flare;let o=`<path d="M${x-t/2},${yTop} L${x+t/2},${yTop} L${x+w/2},${yBase-26} Q${x+w/2},${yBase-6} ${x+f/2},${yBase} L${x-f/2},${yBase} Q${x-w/2},${yBase-6} ${x-w/2},${yBase-26}Z" fill="${col}"/>`;
  let gr="";const n=Math.max(2,Math.round(w/7));for(let i=0;i<n;i++){const fx=(i+0.5)/n-0.5+(rnd(seed+i)-0.5)*0.12;gr+=`M${(x+fx*t).toFixed(1)},${yTop} Q${(x+fx*w+(rnd(seed+i*3)-0.5)*4).toFixed(1)},${((yTop+yBase)/2).toFixed(1)} ${(x+fx*f*0.95).toFixed(1)},${yBase}`}
  o+=`<path d="${gr}" stroke="${dark}" stroke-width="${Math.max(0.8,w*0.05).toFixed(1)}" fill="none" opacity=".55"/>`;
  o+=`<path d="M${x-t*0.28},${yTop} L${x-w*0.3},${yBase-20}" stroke="${hi}" stroke-width="${(w*0.09).toFixed(1)}" opacity=".35"/><path d="M${x+t*0.36},${yTop} L${x+w*0.38},${yBase-16}" stroke="#000" stroke-width="${(w*0.16).toFixed(1)}" opacity=".13"/>`;
  return o}
// a fern frond cluster as one path (cheap to draw)
function fern(x,y,sz,col,seed,op=1){let d="";const n=5+Math.floor(rnd(seed)*3);for(let i=0;i<n;i++){const a=(-75+i*150/(n-1)+(rnd(seed+i)-0.5)*14)*Math.PI/180,L=sz*(0.75+rnd(seed+i*2)*0.5),ex=x+Math.sin(a)*L,ey=y-Math.cos(a)*L*0.9,cx=x+Math.sin(a)*L*0.45,cy=y-L*0.85;
    d+=`M${x.toFixed(1)},${y.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}`;
    for(let j=1;j<6;j++){const t=j/6,px=(1-t)*(1-t)*x+2*(1-t)*t*cx+t*t*ex,py=(1-t)*(1-t)*y+2*(1-t)*t*cy+t*t*ey,ll=L*0.2*(1-t*0.6);d+=`M${px.toFixed(1)},${py.toFixed(1)} l${(-ll*0.6).toFixed(1)},${(-ll*0.5).toFixed(1)} M${px.toFixed(1)},${py.toFixed(1)} l${(ll*0.6).toFixed(1)},${(-ll*0.45).toFixed(1)}`}}
  return `<path d="${d}" stroke="${col}" stroke-width="${Math.max(1,sz*0.06).toFixed(1)}" fill="none" stroke-linecap="round" opacity="${op}"/>`}
// a ponga (tree fern): thin trunk, a crown of drooping fronds
function ponga(x,yb,h,col,seed){const top=yb-h;let d=`M${x},${yb} Q${x+(rnd(seed)-0.5)*10},${(yb+top)/2} ${x},${top}`;let f="";
  for(let i=0;i<8;i++){const a=(-160+i*45+(rnd(seed+i)-0.5)*16)*Math.PI/180,L=h*0.42*(0.8+rnd(seed+i*5)*0.4),ex=x+Math.cos(a)*L,ey=top+Math.abs(Math.sin(a))*L*0.15+L*0.35;f+=`M${x},${top} Q${(x+Math.cos(a)*L*0.55).toFixed(1)},${(top-L*0.32).toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}`}
  return `<path d="${d}" stroke="${col}" stroke-width="${(h*0.05).toFixed(1)}" fill="none"/><path d="${f}" stroke="${col}" stroke-width="${(h*0.06).toFixed(1)}" fill="none" stroke-linecap="round"/>`}
const DEFS=`<defs><linearGradient id="bkSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E4E8D6"/><stop offset=".55" stop-color="#EFE8D6"/><stop offset="1" stop-color="#D9D3BE"/></linearGradient>
  <linearGradient id="bkRay" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF4D2" stop-opacity=".6"/><stop offset="1" stop-color="#FFF4D2" stop-opacity="0"/></linearGradient>
  <linearGradient id="bkMist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EDE8D8" stop-opacity="0"/><stop offset=".7" stop-color="#E8E2CF" stop-opacity=".65"/><stop offset="1" stop-color="#E2DCC6" stop-opacity=".9"/></linearGradient>
  <linearGradient id="bkSoil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6A4D39"/><stop offset="1" stop-color="#33251C"/></linearGradient>
  <linearGradient id="bkBeam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFF6D0" stop-opacity=".8"/><stop offset="1" stop-color="#FFF6D0" stop-opacity="0"/></linearGradient>
  <radialGradient id="bkSpot" cx=".55" cy=".45" r=".6"><stop offset="0" stop-color="#FFF8EA"/><stop offset="1" stop-color="#FFF8EA" stop-opacity="0"/></radialGradient></defs>`;
const BARK="#8E4A34",BARK_D="#5E2C1D",BARK_HI="#C27C5E",FERN="#5C8445",FERN_D="#33502D",TRAIL="#B48C63",TRAIL_HI="#D6B387",SOIL="#5B4433";

// ---------- the trail scene
const TRACKSTEPS=["drop","graph","forces","energy","jump"];
function drawTrail(st){
  const W=800,Hh=420,SC=20,cx=s.x,cy=s.air?s.y:trackY(s.x),RX=290,RY=262,X=x=>RX+(x-cx)*SC,Y=y=>RY-(y-cy)*SC;
  let o=DEFS+`<rect width="${W}" height="${Hh}" fill="url(#bkSky)"/>`;
  // far redwoods in the mist (slow parallax)
  const lay=(p,sp,w0,w1,col,op,seed,yb)=>{let r="";const off=cx*SC*p;for(let k=Math.floor((off-120)/sp);k<=Math.floor((off+W+120)/sp);k++){const sx=k*sp+rnd(seed+k)*sp*0.7-off,w=w0+rnd(seed+k*7)*(w1-w0);r+=`<g opacity="${op}">${trunk(sx,-10,yb+rnd(k+seed)*20,w,col,BARK_D,BARK_HI,k+seed,1.3)}</g>`}return r};
  o+=lay(0.12,46,8,16,"#C9A496",0.5,11,300)+lay(0.25,70,14,24,"#B98270",0.55,23,320);
  o+=`<rect width="${W}" height="${Hh}" fill="url(#bkMist)"/>`;
  // light shafts through the canopy
  for(let k=0;k<5;k++){const sx=((k*210-cx*SC*0.08)%1050+1050)%1050-150;o+=`<path d="M${sx},0 l70,0 l${170+k*12},${Hh} l-${110+k*8},0z" fill="url(#bkRay)" opacity=".7"/>`}
  // mid layer: redwoods with ponga and ferns at their feet
  {const p=0.5,sp=95,off=cx*SC*p;for(let k=Math.floor((off-150)/sp);k<=Math.floor((off+W+150)/sp);k++){const sx=k*sp+rnd(k*3+5)*60-off,w=22+rnd(k+41)*20;o+=trunk(sx,-10,338,w,"#9A5A44",BARK_D,BARK_HI,k*9,1.5)}
    o+=`<path d="M0,${Hh} L0,330 ${Array.from({length:17},(_,i)=>`Q${i*50+25},${314+rnd(Math.floor(off/50)+i)*10} ${i*50+50},${330}`).join(" ")} L${W},${Hh}Z" fill="#4F6B41" opacity=".75"/>`;
    for(let k=Math.floor((off-100)/130);k<=Math.floor((off+W+100)/130);k++){const sx=k*130+rnd(k*5+2)*80-off;o+=ponga(sx,336,70+rnd(k)*40,"#3F5B36",k)}}
  // near redwoods standing on the hillside (move with the trail)
  for(let k=Math.floor((cx-18)/9);k<=Math.floor((cx+30)/9);k++){const xt=k*9+rnd(k*3)*5;const sx=X(xt),w=30+rnd(k)*22,yb=Y(trackY(xt))+8;if(xt>LIP-3&&xt<GAP_END+3)continue;o+=trunk(sx,-10,yb,w,BARK,BARK_D,BARK_HI,k*13,1.7)}
  // the berm: a banked wall of dirt behind the trail
  const x0=cx-16,x1=Math.min(TRAIL_END,cx+27);
  if(SBERM.x1>x0&&SBERM.x0<x1){let bp=`M${X(SBERM.x0-2)},${Y(trackY(SBERM.x0-2))}`;for(let q=SBERM.x0-2;q<=SBERM.x1+2;q+=0.5){const t=(q-SBERM.x0+2)/(SBERM.x1-SBERM.x0+4);bp+=` L${X(q)},${Y(trackY(q)+Math.sin(t*Math.PI)*2.4)}`}bp+=` L${X(SBERM.x1+2)},${Y(trackY(SBERM.x1+2))}Z`;
    o+=`<path d="${bp}" fill="#7B5A41"/><path d="${bp}" fill="none" stroke="#A47E58" stroke-width="2"/>`;for(let q=SBERM.x0+1;q<SBERM.x1;q+=3)o+=`<path d="M${X(q)},${Y(trackY(q)+0.5)} q${SC*1.2},-${SC*0.9} ${SC*2.4},-${SC*0.4}" stroke="#5E432F" stroke-width="1.2" fill="none" opacity=".6"/>`}
  // ground: soil, trail surface
  let path=`M${X(x0)},${Hh+10}`;if(x0<0)path+=` L${X(x0)},${Y(TOP)} L${X(0)},${Y(TOP)}`;
  SEG.forEach(sg=>{if(sg.x1<x0||sg.x0>x1)return;const a=Math.max(x0,sg.x0),b=Math.min(x1,sg.x1);path+=` L${X(a)},${Y(trackY(a))} L${X(b-0.001)},${Y(sg.y0+(sg.y1-sg.y0)*(b-sg.x0)/(sg.x1-sg.x0))}`});
  path+=` L${X(x1)},${Hh+10}Z`;
  o+=`<path d="${path}" fill="url(#bkSoil)"/><path d="${path}" fill="none" stroke="${TRAIL}" stroke-width="6" stroke-linejoin="round"/><path d="${path}" fill="none" stroke="${TRAIL_HI}" stroke-width="1.6" stroke-linejoin="round" transform="translate(0,-2.2)" opacity=".8"/>`;
  // needle litter and stones in the soil
  let lit="";for(let k=Math.floor(x0/0.9);k<x1/0.9;k++){const fx=k*0.9+rnd(k+3)*0.6,yy=Y(trackY(fx))+6+rnd(k)*40;lit+=`M${X(fx).toFixed(1)},${yy.toFixed(1)} l${(4+rnd(k*2)*5).toFixed(1)},${(rnd(k*5)*3-1).toFixed(1)}`}o+=`<path d="${lit}" stroke="#8E6A4C" stroke-width="1" opacity=".5"/>`;
  // root garden: roots across the trail
  SEG.filter(sg=>sg.n==="Root garden"&&sg.x1>x0&&sg.x0<x1).forEach(sg=>{for(let q=sg.x0+1;q<sg.x1;q+=1.8)o+=`<path d="M${X(q)},${Y(trackY(q))+2} q${6+rnd(q)*4},-${5+rnd(q*3)*3} ${14+rnd(q*7)*6},1" stroke="#6E4A31" stroke-width="3.2" fill="none" stroke-linecap="round"/><path d="M${X(q)+2},${Y(trackY(q))} q6,-4 11,-1" stroke="#9A6E4C" stroke-width="1" fill="none" opacity=".7"/>`});
  // wooden roller: a timber deck over a hump
  if(SROLL[0].x0<x1&&SROLL[1].x1>x0){const a=SROLL[0].x0-0.6,b=SROLL[1].x1+0.6;let d=`M${X(a)},${Y(trackY(a))}`;const pts=[];for(let q=a;q<=b+0.01;q+=0.25){pts.push([X(q),Y(trackY(q))]);d+=` L${X(q)},${Y(trackY(q))}`}
    o+=`<path d="${d}" stroke="#6E4B2C" stroke-width="10" fill="none" stroke-linejoin="round" transform="translate(0,4)"/><path d="${d}" stroke="#C49360" stroke-width="6" fill="none" stroke-linejoin="round"/>`;
    let pl="";for(let i=0;i<pts.length;i+=2)pl+=`M${pts[i][0]},${pts[i][1]-3} l0,6`;o+=`<path d="${pl}" stroke="#7B5532" stroke-width="1"/>`;
    for(let q=a+0.5;q<b;q+=2.2)o+=`<rect x="${X(q)-2}" y="${Y(trackY(q))+6}" width="4" height="22" fill="#5E3F25"/>`}
  // the gap jump: a built lip with a wooden face, and the landing
  if(LIP>x0-2&&LIP<x1+2){const lx=X(LIP),ly=Y(SLIP.y1),fy=Y(SGAP.y0);o+=`<path d="M${X(SLIP.x0)},${Y(SLIP.y0)} L${lx},${ly}" stroke="#C49360" stroke-width="5" stroke-linecap="round"/><path d="M${lx},${ly} L${lx},${fy}" stroke="#8C6440" stroke-width="5"/>`;
    for(let k=0;k<3;k++)o+=`<path d="M${lx-2},${ly+8+k*12} l0,6" stroke="#E9DFC8" stroke-width="3"/>`}
  // ferns along the trail edge
  for(let k=Math.floor(x0/2.3);k<x1/2.3;k++){const fx=k*2.3+rnd(k)*1.2;if(fx>LIP-1.5&&fx<GAP_END+1.5)continue;if(fx>SROLL[0].x0-1&&fx<SROLL[1].x1+1)continue;o+=fern(X(fx),Y(trackY(fx))+5,10+rnd(k+1)*14,rnd(k*3)>0.5?FERN:"#6F9A50",k)}
  // signs: start, jump, distance markers, finish
  const sign=(x,txt)=>{if(x<x0-2||x>x1+2)return"";const sx=X(x),sy=Y(trackY(x));return`<line x1="${sx}" y1="${sy}" x2="${sx}" y2="${sy-48}" stroke="#3a2f2a" stroke-width="2.5"/><rect x="${sx-2}" y="${sy-66}" width="${txt.length*7.6+14}" height="20" rx="3" fill="#F4EEE2" stroke="#3a2f2a"/><text class="t-lab" x="${sx+5}" y="${sy-52}" style="fill:#3a2f2a">${txt}</text>`};
  o+=sign(4,"START")+sign(LIP-7,"GAP JUMP")+sign(SROLL[0].x0-3,"ROLLER")+sign(100,"100 m")+sign(200,"200 m");
  if(FINISH>x0-3&&FINISH<x1+3){const fx=X(FINISH),fy=Y(trackY(FINISH));o+=`<line x1="${fx}" y1="${fy}" x2="${fx}" y2="${fy-96}" stroke="#3a2f2a" stroke-width="3"/>`;for(let i=0;i<8;i++)for(let j=0;j<2;j++)o+=`<rect x="${fx+i*7}" y="${fy-96+j*7}" width="7" height="7" fill="${(i+j)%2?"#fff":"#222"}"/>`;o+=`<text class="t-lab" x="${fx+4}" y="${fy-70}" style="fill:#3a2f2a">FINISH</text>`}
  // jump arc of the last jump
  if(st.k==="jump"&&s.airPath.length>1)o+=`<polyline points="${s.airPath.map(p=>`${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(" ")}" fill="none" stroke="var(--sun)" stroke-width="2.5" stroke-dasharray="5 4"/>`;
  // dust behind the rider
  s.dust.forEach(p=>o+=`<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="${(p.r*SC).toFixed(1)}" fill="#CDAE86" opacity="${(p.life*0.55).toFixed(2)}"/>`);
  // rider and bike
  const ang=s.air?Math.atan2(s.air.vy,s.air.vx):Math.atan(slope(s.x)),deg=-ang*180/Math.PI,bx=X(s.x),by=Y(s.y),SCB=1.35;
  o+=`<ellipse cx="${bx}" cy="${Y(trackY(s.x))+3}" rx="${40}" ry="4.5" fill="#000" opacity="${s.air?0.1:0.25}"/>`;
  o+=`<g transform="translate(${bx},${by}) rotate(${deg.toFixed(2)}) scale(${SCB})">${bikeSVG({b:s.b,spin:s.dist/0.37,comp:Math.max(0,s.fc),rider:true,pose:s.attack?0:1,crouch:Math.max(0,s.fc)*1.2,tag:s.tagA,heat:rotorT(),light:s.b.pod,detail:true})}</g>`;
  // speed lines
  if(s.v>8)for(let i=0;i<4;i++){const yy=by-26-i*13,L=(s.v-6)*3.2;o+=`<line x1="${bx-50-i*6}" y1="${yy}" x2="${bx-50-i*6-L}" y2="${yy+L*Math.tan(ang)}" stroke="#fff" stroke-width="2" opacity=".55"/>`}
  // forces on the rider
  if(st.k==="forces"&&!s.air){const F=forces(s.x,s.v),th=F.th,c=Math.cos(th),sn=Math.sin(th),K=0.07,cx0=bx+Math.sin(th)*44,cy0=by-Math.cos(th)*44;
    const Wt=M()*g,N=Wt*c,Res=M()*(F.roll+F.air),B=s.brakeN;const tx=c,ty=-sn,nx=-sn,ny=-c;
    // centre of mass and the line of the weight: it must land between the tyres or you tip
    const com=s.attack?[-3,-32]:[-2,-41],gx=bx+(com[0]*c-com[1]*-sn)*SCB,gy=by+(com[0]*-sn+com[1]*c)*SCB,rearX=bx+(-25.5*c)*SCB,frontX=bx+(27*c)*SCB;
    o+=`<line x1="${gx}" y1="${gy}" x2="${gx}" y2="${Y(trackY(s.x+(gx-bx)/SC))}" stroke="var(--earth)" stroke-width="1.5" stroke-dasharray="3 3"/><circle cx="${gx}" cy="${gy}" r="6" fill="#fff" stroke="var(--ink)" stroke-width="1.5"/><path d="M${gx-6},${gy} A6,6 0 0,1 ${gx},${gy-6} L${gx},${gy}Z M${gx+6},${gy} A6,6 0 0,1 ${gx},${gy+6} L${gx},${gy}Z" fill="var(--ink)"/>`;
    o+=`<text class="t-lab" x="${gx-10}" y="${gy-12}" text-anchor="end" style="fill:#2A2420;font-weight:600;paint-order:stroke;stroke:#F4EEE2;stroke-width:3px">CENTRE OF MASS</text>`;
    o+=arrow(cx0,cy0,cx0,cy0+Wt*K,"var(--earth)",3.5);
    o+=arrow(cx0,cy0,cx0+nx*N*K,cy0+ny*N*K,"var(--good)",3.5);
    o+=arrow(cx0-12,cy0+10,cx0-12-tx*Res*K*2.2,cy0+10-ty*Res*K*2.2,"var(--hot)",3);
    if(B>5)o+=arrow(cx0-12,cy0-10,cx0-12-tx*B*K,cy0-10-ty*B*K,"var(--warn)",3)}
  // foreground ferns rushing past (fast parallax)
  {const p=1.5,sp=170,off=cx*SC*p;for(let k=Math.floor((off-200)/sp);k<=Math.floor((off+W+200)/sp);k++){const sx=k*sp+rnd(k*11)*90-off;o+=fern(sx,Hh+20,50+rnd(k*7)*40,"#1E2C1A",k*3,0.72)}}
  // helmet-cam inset
  o+=gopro(W);
  const seg=segAt(s.x);
  o+=`<rect x="12" y="12" width="262" height="46" rx="9" fill="var(--paper)" opacity=".93"/><text class="t-lab" x="22" y="30">${s.finished?"FINISHED":seg.n.toUpperCase()} · ${fmt(s.dist)} m</text><text class="t-ink" x="22" y="49" style="font-size:15px;font-weight:600">${fmt(s.t,1)} s · ${fmt(s.v*3.6)} km/h</text>`;
  if(s.crash)o+=`<rect x="150" y="160" width="500" height="64" rx="10" fill="var(--paper)" stroke="var(--hot)" stroke-width="2"/><text class="t-ink" x="400" y="186" text-anchor="middle" style="font-weight:600">${s.crash.split(". ")[0]}.</text><text class="t-lab" x="400" y="208" text-anchor="middle">${(s.crash.split(". ")[1]||"").toUpperCase()} · PRESS RESTART</text>`;
  if(s.finished&&!s.playing&&s.lastRun)o+=`<rect x="190" y="146" width="420" height="86" rx="10" fill="var(--paper)" stroke="var(--ink)" stroke-width="1.5"/><text class="t-ink" x="400" y="176" text-anchor="middle" style="font-size:18px;font-weight:600">${fmt(s.lastRun.time,1)} s</text><text class="t-lab" x="400" y="198" text-anchor="middle">AVERAGE SPEED ${fmt(s.lastRun.avg,1)} m/s = ${fmt(s.lastRun.avg*3.6)} km/h</text><text class="t-lab" x="400" y="216" text-anchor="middle">${s.lastRun.cleared?"GAP CLEARED":"GAP NOT CLEARED"} · ${esc(s.lastRun.build.toUpperCase())}</text>`;
  return o}
// a first-person "helmet cam": the trail rushing towards you, redwoods streaming past, your bars at the bottom
function gopro(W){const x0=W-236,y0=12,w=224,h=132,cx=x0+w/2,hz=y0+h*0.4;const tilt=s.air?0:Math.atan(slope(s.x))*60,C=CL();
  let o=`<clipPath id="bkCam"><rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="12"/></clipPath><g clip-path="url(#bkCam)"><rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="#2b3a2f"/>`;
  o+=`<g transform="rotate(${tilt*0.25},${cx},${hz})"><rect x="${x0-40}" y="${y0-40}" width="${w+80}" height="${hz-y0+40}" fill="#D7DEC9"/><rect x="${x0-40}" y="${hz}" width="${w+80}" height="${h}" fill="#3F5A35"/>`;
  o+=`<path d="M${cx-5},${hz} L${cx+5},${hz} L${cx+96},${y0+h+20} L${cx-96},${y0+h+20}Z" fill="${TRAIL}"/><path d="M${cx-5},${hz} L${cx-96},${y0+h+20} M${cx+5},${hz} L${cx+96},${y0+h+20}" stroke="#8C6A48" stroke-width="2"/>`;
  const items=[];for(let i=0;i<12;i++){const z=((i*3.6-s.dist)%43+43)%43+1.2;items.push([z,i])}items.sort((a,b)=>b[0]-a[0]);
  items.forEach(([z,i])=>{const side=i%2?1:-1,sx=cx+side*(12+300/z),th=Math.min(260,1500/z),tw=Math.max(2,90/z),fade=Math.min(1,0.3+3/z);
    o+=`<path d="M${sx-tw*0.4},${hz-th*0.85} L${sx+tw*0.4},${hz-th*0.85} L${sx+tw*0.6},${hz+th*0.12} L${sx-tw*0.6},${hz+th*0.12}Z" fill="${BARK}" opacity="${fade}"/>`;
    if(i%3===0)o+=`<ellipse cx="${cx+side*(8+170/z)}" cy="${hz+th*0.1}" rx="${Math.max(2,60/z)}" ry="${Math.max(1,24/z)}" fill="${FERN}" opacity="${fade}"/>`});
  for(let i=0;i<6;i++){const z=((i*7-s.dist)%42+42)%42+1;const yy=hz+(h*0.58)*(1.2/z)*3;o+=`<line x1="${cx-40/z*6}" y1="${yy}" x2="${cx+40/z*6}" y2="${yy}" stroke="#6e5238" stroke-width="${Math.max(0.6,6/z)}"/>`}
  if(s.b.pod)o+=`<path d="M${cx},${y0+h} L${cx-70},${hz+8} L${cx+70},${hz+8}Z" fill="#FFF3C4" opacity=".16"/>`;
  o+=`</g>`;
  // your handlebars and the back of the plate
  o+=`<path d="M${x0-10},${y0+h-6} Q${cx},${y0+h-22} ${x0+w+10},${y0+h-6}" stroke="#141416" stroke-width="7" fill="none"/><rect x="${cx-9}" y="${y0+h-24}" width="18" height="14" rx="3" fill="#1F1F23"/>`;
  if(s.b.plate)o+=`<path d="M${cx-22},${y0+h-32} Q${cx},${y0+h-40} ${cx+22},${y0+h-32} L${cx+18},${y0+h-14} L${cx-18},${y0+h-14}Z" fill="${C.main}" opacity=".95"/>`;
  o+=`<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="12" fill="none" stroke="#111" stroke-width="3"/>`;
  o+=`<circle cx="${x0+16}" cy="${y0+16}" r="4.5" fill="#E0463A" opacity="${(Math.floor(s.t*2)%2)?1:0.25}"/><text x="${x0+26}" y="${y0+20}" fill="#fff" style="font:600 11px var(--mono)">REC · HELMET CAM</text>`;
  o+=`<text x="${x0+w-12}" y="${y0+34}" fill="#fff" text-anchor="end" style="font:600 22px var(--mono);paint-order:stroke;stroke:rgba(0,0,0,.35);stroke-width:3px">${fmt(s.v*3.6)}<tspan style="font-size:11px"> km/h</tspan></text></g>`;
  return o}
// ---------- the garage
function drawGarage(){const W=800,Hh=420,fl=352,Md=MD(),C=CL(),Wh=WH(),Br=BR();
  let o=DEFS+`<rect width="${W}" height="${Hh}" fill="#ECE3D3"/>`;
  // a window onto the redwoods
  o+=`<rect x="30" y="34" width="170" height="168" rx="6" fill="#DCE3CF"/>`;
  for(let k=0;k<5;k++)o+=trunk(44+k*34+rnd(k)*10,34,202,10+rnd(k+4)*14,"#B88471",BARK_D,BARK_HI,k,1.2);
  o+=ponga(64,202,46,"#56724A",3)+ponga(160,202,54,"#56724A",7);
  o+=`<rect x="30" y="34" width="170" height="168" rx="6" fill="#fff" opacity=".18"/><path d="M115,34 V202 M30,118 H200" stroke="#F4EEE2" stroke-width="6"/><rect x="30" y="34" width="170" height="168" rx="6" fill="none" stroke="#F4EEE2" stroke-width="8"/><rect x="22" y="200" width="186" height="9" rx="2" fill="#C9B79A"/>`;
  // pegboard with spare parts
  o+=`<rect x="590" y="24" width="190" height="128" rx="6" fill="#D9C7A6"/>`;let peg="";for(let i=0;i<12;i++)for(let j=0;j<8;j++)peg+=`M${600+i*15.5},${34+j*15.5}h.01`;o+=`<path d="${peg}" stroke="#B49C77" stroke-width="3" stroke-linecap="round"/>`;
  o+=`<g transform="translate(636,86) scale(1.45)">${wheel([0,0],0.3,WHEELS.mud,4.6,0,-2.2,false)}</g><path d="M690,52 q20,-14 40,0 M690,82 q24,-12 48,0" stroke="#1F1F23" stroke-width="4" fill="none" stroke-linecap="round"/><rect x="694" y="102" width="18" height="26" rx="4" fill="#C4432F"/><rect x="718" y="102" width="18" height="26" rx="4" fill="${CREAM}"/><rect x="742" y="102" width="18" height="26" rx="4" fill="#3A857B"/>`;
  // floor and spotlight
  o+=`<rect x="0" y="${fl}" width="${W}" height="${Hh-fl}" fill="#B98C66"/>`;let pl="";for(let i=0;i<12;i++)pl+=`M${i*76+(i%2)*30},${fl} L${i*76+(i%2)*30-40},${Hh}`;o+=`<path d="M0,${fl+22} H${W} M0,${fl+48} H${W}" stroke="#A47A55" stroke-width="1.5"/><path d="${pl}" stroke="#A47A55" stroke-width="1.2"/>`;
  o+=`<ellipse cx="450" cy="${fl-110}" rx="320" ry="220" fill="url(#bkSpot)" opacity=".85"/><ellipse cx="450" cy="${fl+6}" rx="220" ry="13" fill="#000" opacity=".16"/>`;
  // the model name and its colours
  o+=`<text x="232" y="66" style="font:700 40px var(--display);letter-spacing:.2em" fill="#2A2420">${Md.n}</text>`;
  o+=`<rect x="234" y="78" width="34" height="9" rx="2" fill="${C.main}"/><rect x="272" y="78" width="34" height="9" rx="2" fill="${CREAM}" stroke="#C9BCA0"/><text class="t-lab" x="316" y="87" style="fill:#5A4636;letter-spacing:.12em">${Md.kind.toUpperCase()}</text>`;
  if(innerWidth>560)o+=`<text class="t-body" x="234" y="110" style="fill:#5A4636">${esc(Md.line)}</text>`;
  // mini stand + the bike
  const narrow=innerWidth<=560,bxx=narrow?420:450,SCL=narrow?5.3:4.4;
  o+=`<path d="M${bxx-30},${fl} L${bxx-7},${fl-50} L${bxx+7},${fl-50} L${bxx+30},${fl}" stroke="#1F1F23" stroke-width="6" fill="none" stroke-linejoin="round"/><rect x="${bxx-36}" y="${fl-4}" width="72" height="6" rx="2" fill="#1F1F23"/>`;
  o+=`<g transform="translate(${bxx},${fl}) scale(${SCL})">${bikeSVG({b:s.b,spin:s.gspin,comp:0.08,rider:false,tag:Math.sin(s.gspin*0.9)*6,heat:0,light:s.b.pod,detail:true})}</g>`;
  // callouts: short labels; the spec card below has every number
  if(narrow)return o;
  const G=geoPts(s.b,0),at=p=>[bxx+p[0]*SCL,fl+(p[1]-2)*SCL];
  const call=(p,tx,ty,l1,l2,end)=>{const q=at(p),lx=end?tx+4:tx-4;return `<path d="M${q[0].toFixed(1)},${q[1].toFixed(1)} L${lx},${ty-4}" stroke="#2A2420" stroke-width="1" fill="none"/><circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="3" fill="#2A2420" stroke="#F4EEE2" stroke-width="1"/><text class="t-lab" x="${tx}" y="${ty}" text-anchor="${end?"end":"start"}" style="fill:#2A2420;font-weight:600">${l1}</text><text class="t-lab" x="${tx}" y="${ty+15}" text-anchor="${end?"end":"start"}" style="fill:#6A5444">${l2}</text>`};
  o+=call(add(G.FA,G.u,13),664,246,`${Md.fork==="dual"?"DUAL":"SINGLE"} CROWN`,`${fmt(Md.travel*1000)} mm · k ${s.k}`);
  o+=call(add(G.FA,[11,9]),664,322,Wh.n.toUpperCase(),`μ ${fmt(Wh.mu.dry,2)} DRY`);
  o+=call(G.GR,664,178,`${Br.n.toUpperCase()}`,`${Br.w} mm BARS`);
  o+=call(add(G.RA,[0,-4.2]),226,256,`${Md.rotor} mm ROTORS`,`${fmt(Md.rmass*1000)} g A PAIR`,true);
  o+=call(add(G.BB,[-5,-9]),226,322,`BIKE ${fmt(bikeMass(),1)} kg`,`RIDER ${s.m} kg`,true);
  return o}
function drawStop(){const W=800,SC=18,X=x=>110+x*SC,gy=300;const N=stopNums();
  let o=DEFS+`<rect width="${W}" height="420" fill="url(#bkSky)"/>`;
  for(let k=0;k<12;k++){const sx=k*72+rnd(k)*30,w=12+rnd(k+2)*12;o+=`<g opacity=".5">${trunk(sx,-10,gy-30,w,"#C9A496",BARK_D,BARK_HI,k,1.2)}</g>`}
  o+=`<rect width="${W}" height="420" fill="url(#bkMist)" opacity=".6"/>`;
  for(let k=0;k<8;k++){const sx=k*112+rnd(k+9)*50,w=26+rnd(k+3)*20;o+=trunk(sx,-10,gy+4,w,BARK,BARK_D,BARK_HI,k*5,1.6)}
  for(let k=0;k<9;k++)o+=ponga(30+k*95+rnd(k)*40,gy+2,50+rnd(k+1)*30,"#46633B",k);
  o+=`<rect x="0" y="${gy}" width="${W}" height="120" fill="url(#bkSoil)"/><line x1="0" x2="${W}" y1="${gy}" y2="${gy}" stroke="${s.grip==="roots"?"#8E6A48":TRAIL}" stroke-width="6"/>`;
  if(s.grip==="roots")for(let q=0;q<40;q+=2.4)o+=`<path d="M${X(q)},${gy+1} q8,-5 18,0" stroke="#5E3F26" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M${X(q)+3},${gy-1} q6,-3 11,0" stroke="#D8E4E8" stroke-width="1" fill="none" opacity=".7"/>`;
  if(s.grip==="mud")for(let q=0;q<40;q+=1.5)o+=`<ellipse cx="${X(q)+rnd(q)*10}" cy="${gy+2}" rx="${6+rnd(q*3)*8}" ry="2" fill="#4A3524" opacity=".8"/>`;
  for(let m=0;m<=35;m+=5)o+=`<line x1="${X(m)}" x2="${X(m)}" y1="${gy+6}" y2="${gy+14}" stroke="#E8DCCB"/><text class="t-lab" x="${X(m)}" y="${gy+28}" text-anchor="middle" style="fill:#E8DCCB">${m} m</text>`;
  // the fallen log
  o+=`<ellipse cx="${X(LOGX)+16}" cy="${gy-12}" rx="38" ry="13" fill="#7A4A35"/><path d="M${X(LOGX)-14},${gy-20} q20,-4 56,0" stroke="#5E3523" stroke-width="2" fill="none"/><ellipse cx="${X(LOGX)-20}" cy="${gy-12}" rx="6" ry="12" fill="#C79A72"/><ellipse cx="${X(LOGX)-20}" cy="${gy-12}" rx="3" ry="6.5" fill="none" stroke="#9C7050" stroke-width="1"/>`;
  // planned distances
  o+=`<rect x="${X(0)}" y="${gy+40}" width="${N.think*SC}" height="14" fill="var(--sun)"/><rect x="${X(N.think)}" y="${gy+40}" width="${N.brake*SC}" height="14" fill="var(--hot)"/>`;
  o+=`<text class="t-lab" x="${X(0)}" y="${gy+72}" style="fill:#F5EFE4">THINKING ${fmt(N.think,1)} m</text><text class="t-lab" x="${X(N.think)+4}" y="${gy+92}" style="fill:#F5EFE4">BRAKING ${fmt(N.brake,1)} m</text>`;
  s.sdust.forEach(p=>o+=`<circle cx="${X(p.x).toFixed(1)}" cy="${(gy-p.y*SC).toFixed(1)}" r="${(p.r*SC).toFixed(1)}" fill="#CDAE86" opacity="${(p.life*0.55).toFixed(2)}"/>`);
  const bx=X(s.sx),braking=s.sphase==="brake";o+=`<ellipse cx="${bx}" cy="${gy+3}" rx="44" ry="4" fill="#000" opacity=".25"/><g transform="translate(${bx},${gy}) rotate(${braking?1.5:0}) scale(1.45)">${bikeSVG({b:s.b,spin:s.sx/0.37,comp:braking?0.45:0.05,rider:true,pose:0,crouch:braking?0.4:0,tag:braking?24:0,heat:0,light:s.b.pod,detail:true})}</g>`;
  if(s.sphase==="see"||s.sphase==="ready")o+=`<text class="t-ink" x="${bx+10}" y="${gy-120}" style="font-weight:600">${s.sphase==="ready"?"Press play":"Log! (reacting…)"}</text>`;
  if(braking)o+=`<text class="t-ink" x="${bx+10}" y="${gy-120}" style="font-weight:600">Brakes on</text>`;
  const hit=N.total>LOGX;
  if(s.sphase==="stopped")o+=`<rect x="200" y="40" width="400" height="60" rx="10" fill="var(--paper)" stroke="${hit?"var(--hot)":"var(--good)"}" stroke-width="2"/><text class="t-ink" x="400" y="66" text-anchor="middle" style="font-weight:600">${hit?"Hit the log":"Stopped in time"}: ${fmt(N.total,1)} m</text><text class="t-lab" x="400" y="86" text-anchor="middle">${fmt(s.v0)} KM/H · ${fmt(s.tr,1)} s REACTION · ${SURF[s.grip].toUpperCase()} · ${WH().n.toUpperCase()}</text>`;
  return o}
function drawFork(){const W=800,gy=340,N=forkNums(),PX=90,T=N.T;
  let o=DEFS+`<rect width="${W}" height="420" fill="url(#bkSky)"/>`;
  for(let k=0;k<7;k++){const sx=60+k*120+rnd(k)*40,w=24+rnd(k+3)*16;o+=`<g opacity=".55">${trunk(sx,-10,gy,w,"#B98270",BARK_D,BARK_HI,k,1.3)}</g>`}
  o+=`<rect width="${W}" height="420" fill="url(#bkMist)" opacity=".5"/>`;
  o+=`<rect x="0" y="${gy}" width="${W}" height="90" fill="url(#bkSoil)"/><line x1="0" x2="${W}" y1="${gy}" y2="${gy}" stroke="${TRAIL}" stroke-width="5"/>`;
  // the ledge you roll off
  const lt=gy-s.fh*PX;o+=`<path d="M0,${lt} L410,${lt} Q418,${lt} 418,${lt+8} L418,${gy} L0,${gy}Z" fill="#6A4D39"/><path d="M0,${lt} L414,${lt}" stroke="${TRAIL}" stroke-width="5"/>`+fern(60,lt+4,24,FERN,3)+fern(150,lt+4,20,FERN,8)+fern(300,lt+4,22,"#6F9A50",5);
  o+=`<line x1="436" x2="436" y1="${gy}" y2="${lt}" stroke="var(--ink)"/><path d="M430,${gy} h12 M430,${lt} h12" stroke="var(--ink)"/><text class="t-ink" x="428" y="${(gy+lt)/2}" text-anchor="end" style="font-weight:600;paint-order:stroke;stroke:#6A4D39;stroke-width:3px;fill:#F4EEE2">${fmt(s.fh,1)} m</text>`;
  const comp=Math.min(T,s.fx)/T, y=gy-s.fy*PX;
  o+=`<ellipse cx="560" cy="${gy+3}" rx="${60}" ry="5" fill="#000" opacity="${0.12+0.15*(1-s.fy/Math.max(0.3,s.fh))}"/><g transform="translate(560,${y}) scale(2.2)">${bikeSVG({b:s.b,spin:0,comp,rider:true,pose:0,crouch:comp*1.4,tag:s.fphase==="squash"?-20*comp:0,heat:0,light:s.b.pod,detail:true})}</g>`;
  // travel gauge
  const gx=716,gt=120,gh=200,f=Math.min(1,s.fx/T),fm=Math.min(1,s.fmax/T);o+=`<rect x="${gx}" y="${gt}" width="34" height="${gh}" rx="6" fill="var(--paper)" stroke="var(--ink)"/><rect x="${gx}" y="${gt+gh-f*gh}" width="34" height="${f*gh}" rx="6" fill="${s.fmax>=T-0.001?"var(--hot)":"var(--sun)"}"/>`;
  o+=`<line x1="${gx-6}" x2="${gx+40}" y1="${gt+gh-fm*gh}" y2="${gt+gh-fm*gh}" stroke="var(--ink)" stroke-dasharray="3 2"/><text class="t-lab" x="${gx+17}" y="${gt-10}" text-anchor="middle">TRAVEL</text><text class="t-ink" x="${gx+17}" y="${gt+gh+18}" text-anchor="middle">${fmt(s.fx*1000)} mm</text><text class="t-lab" x="${gx-4}" y="${gt+6}" text-anchor="end">${fmt(T*1000)}</text><text class="t-lab" x="${gx-4}" y="${gt+gh}" text-anchor="end">0</text>`;
  if(s.fmax>=T-0.001)o+=`<text class="t-ink" x="${gx+17}" y="${gt-30}" text-anchor="middle" style="font-weight:600;fill:var(--hot)">Bottomed out!</text>`;
  o+=`<rect x="10" y="12" width="560" height="40" rx="8" fill="var(--paper)" opacity=".9"/><text class="t-lab" x="20" y="28">${MD().n} · ${MD().fork==="dual"?"DUAL":"SINGLE"}-CROWN ${fmt(T*1000)} mm · k ${s.k} N/mm · ${fmt(M(),1)} kg</text><text class="t-lab" x="20" y="44">FRONT CARRIES ABOUT 45% · HERE THE SPRING ALSO STANDS IN FOR YOUR LEGS</text>`;
  return o}

// ---------- close-up panels
function axes(w,h,xl,yl){return `<line x1="46" y1="${h-34}" x2="${w-12}" y2="${h-34}" stroke="var(--ink)"/><line x1="46" y1="14" x2="46" y2="${h-34}" stroke="var(--ink)"/><text class="t-lab" x="${w-12}" y="${h-3}" text-anchor="end">${xl}</text><text class="t-lab" x="52" y="12">${yl}</text>`}
function graph(key){const w=420,h=260,S=s.samples,GS=s.ghost&&key==="v"?s.ghost.samples:[],T=Math.max(10,(s.lastRun?s.lastRun.time:30)+4,S.length?S[S.length-1].t:0,GS.length?GS[GS.length-1].t:0);
  const ymax=key==="d"?Math.max(50,Math.ceil((S.length?S[S.length-1].d:0)/50)*50,300):Math.max(10,Math.ceil(Math.max(...S.map(p=>p.v),...GS.map(p=>p.v),5)/5)*5);
  const X=t=>46+t/T*(w-60),Y=v=>h-34-v/ymax*(h-62);let o=axes(w,h,"TIME (s)",key==="d"?"DISTANCE (m)":"SPEED (m/s)");
  for(let t=0;t<=T;t+=5)o+=`<text class="t-lab" x="${X(t)}" y="${h-20}" text-anchor="middle">${t}</text>`;
  for(let k=0;k<=ymax;k+=ymax/5)o+=`<line x1="46" x2="${w-12}" y1="${Y(k)}" y2="${Y(k)}" stroke="var(--line)"/><text class="t-lab" x="40" y="${Y(k)+3}" text-anchor="end">${fmt(k)}</text>`;
  if(GS.length>1){o+=`<polyline points="${GS.map(p=>`${X(p.t).toFixed(1)},${Y(p.v).toFixed(1)}`).join(" ")}" fill="none" stroke="var(--rose)" stroke-width="1.6" stroke-dasharray="4 3" opacity=".8"/><text class="t-lab" x="${w-14}" y="62" text-anchor="end">- - LAST RUN: ${esc(s.ghost.label.toUpperCase())}</text>`}
  if(S.length>1)o+=`<polyline points="${S.map(p=>`${X(p.t).toFixed(1)},${Y(p[key]).toFixed(1)}`).join(" ")}" fill="none" stroke="var(--hot)" stroke-width="2.4"/>`;
  if(key==="v"&&S.length>1){o+=`<polygon points="${X(0)},${Y(0)} ${S.map(p=>`${X(p.t).toFixed(1)},${Y(p.v).toFixed(1)}`).join(" ")} ${X(S[S.length-1].t)},${Y(0)}" fill="var(--hot)" opacity=".1"/>`;
    o+=`<text class="t-ink" x="${w-14}" y="30" text-anchor="end">gradient now = a = ${fmt(s.aNow,1)} m/s²</text><text class="t-lab" x="${w-14}" y="46" text-anchor="end">SHADED AREA = DISTANCE = ${fmt(s.dist)} m</text>`}
  if(key==="d"&&S.length>1){const p=S[S.length-1];o+=`<text class="t-ink" x="${w-14}" y="30" text-anchor="end">steeper line = faster</text><text class="t-lab" x="${w-14}" y="46" text-anchor="end">AVERAGE SO FAR ${fmt(p.t?p.d/p.t:0,1)} m/s</text>`}
  return o}
function fbd(){const w=420,h=260,F=forces(s.x,s.v),Wt=M()*g,par=M()*F.grav,N=Wt*Math.cos(F.th),Res=M()*(F.roll+F.air),B=s.brakeN,net=par-Res-B;
  const th=F.th,K=0.15,cx=120,cy=122,tx=Math.cos(th),ty=-Math.sin(th),nx=-Math.sin(th),ny=-Math.cos(th);
  let o=`<line x1="${cx-tx*110}" y1="${cy+16-ty*110}" x2="${cx+tx*110}" y2="${cy+16+ty*110}" stroke="${TRAIL}" stroke-width="4"/>`;
  o+=`<g transform="translate(${cx},${cy}) rotate(${-th*180/Math.PI})"><rect x="-18" y="-20" width="36" height="36" rx="6" fill="var(--fill)" stroke="var(--ink)"/></g>`;
  o+=arrow(cx,cy,cx,cy+Wt*K,"var(--earth)",3);
  o+=arrow(cx,cy,cx+nx*N*K,cy+ny*N*K,"var(--good)",3);
  if(par>1)o+=`<g opacity=".8">${arrow(cx,cy,cx+tx*par*K,cy+ty*par*K,"var(--earth)",2)}</g>`;
  o+=arrow(cx-nx*6,cy-ny*6,cx-nx*6-tx*Res*K,cy-ny*6-ty*Res*K,"var(--hot)",3);
  if(B>5)o+=arrow(cx+nx*8,cy+ny*8,cx+nx*8-tx*B*K,cy+ny*8-ty*B*K,"var(--warn)",3);
  const L=[["var(--earth)","Weight",Wt],["var(--good)","Support",N],["var(--earth)","Down-slope pull",par],["var(--hot)","Friction + air",Res],["var(--warn)","Brakes",B]];
  L.forEach(([c,n,v],i)=>{o+=`<rect x="248" y="${22+i*20}" width="10" height="10" rx="2" fill="${c}"/><text class="t-ink" x="264" y="${31+i*20}">${n} <tspan style="font-weight:600">${fmt(v)} N</tspan></text>`});
  const bal=Math.abs(net)<30;
  o+=`<text class="t-ink" x="248" y="140" style="font-weight:600;fill:${bal?"var(--good)":"var(--hot)"}">${bal?"Balanced along the slope":"Unbalanced"}</text>`;
  o+=`<text class="t-lab" x="248" y="160">NET = PULL − DRAG − BRAKES</text><text class="t-ink" x="248" y="180">${fmt(par)} − ${fmt(Res)} − ${fmt(B)} = ${fmt(net)} N</text>`;
  o+=`<text class="t-lab" x="248" y="206">a = F ÷ m = ${fmt(net)} ÷ ${fmt(M(),1)}</text><text class="t-ink" x="248" y="226">= ${fmt(net/M(),1)} m/s² · ${bal?"steady speed":net>0?"speeding up":"slowing down"}</text>`;
  o+=`<text class="t-lab" x="16" y="248">DRAG AREA ${fmt(CDA(),2)} m² (${s.attack?"ATTACK POSITION":"SITTING UP"}) · Crr ${fmt(CRR(),3)}</text>`;
  return o}
function energyBars(){const w=420,h=260,Ep=M()*g*(TOP-s.y),Ek=0.5*M()*s.v*s.v;const bars=[["Ep lost",Ep,"var(--earth)"],["Kinetic",Ek,"var(--hot)"],["Brake heat",s.heatB,"var(--sun)"],["Friction + air",s.heatF,"var(--warn)"]];
  const max=Math.max(1000,M()*g*(TOP-SFIN.y0));let o="";bars.forEach(([n,E,c],i)=>{const x=24+i*80,bh=170,hh=Math.min(1,E/max)*bh;o+=`<rect x="${x}" y="${34}" width="56" height="${bh}" fill="var(--paper)" stroke="var(--line)"/><rect x="${x}" y="${34+bh-hh}" width="56" height="${hh}" fill="${c}"/><text class="t-ink" x="${x+28}" y="${28+bh-hh}" text-anchor="middle">${kJ(E)}</text><text class="t-lab" x="${x+28}" y="${222}" text-anchor="middle">${n.toUpperCase()}</text>`});
  // the brake rotors warming up: Q = mcΔT
  const T=rotorT(),Md=MD(),tx=356,tt=40,th=150,f=Math.min(1,(T-AIR_T)/400);
  o+=`<rect x="${tx}" y="${tt}" width="22" height="${th}" rx="11" fill="var(--paper)" stroke="var(--ink)"/><rect x="${tx+5}" y="${tt+th-10-f*(th-20)}" width="12" height="${10+f*(th-20)}" rx="6" fill="${T>250?"var(--hot)":"var(--sun)"}"/><circle cx="${tx+11}" cy="${tt+th+6}" r="11" fill="${T>250?"var(--hot)":"var(--sun)"}" stroke="var(--ink)"/>`;
  o+=`<text class="t-lab" x="${tx+11}" y="${tt-10}" text-anchor="middle">ROTORS</text><text class="t-ink" x="${tx+11}" y="${tt+th+34}" text-anchor="middle" style="font-weight:600">${fmt(T)} °C</text>`;
  o+=`<text class="t-lab" x="${w/2-20}" y="${246}" text-anchor="middle">Ep LOST = Ek + HEAT · ${kJ(Ep)} ≈ ${kJ(Ek+s.heatB+s.heatF)}</text><text class="t-lab" x="${w/2-20}" y="${258}" text-anchor="middle">ΔT = Q ÷ mc = ${kJ(s.heatB)} ÷ (${fmt(Md.rmass,2)} kg × 500) IF NO HEAT ESCAPED</text>`;return o}
function jumpPanel(){const w=420,h=260,SC=14,ox=40,oy=118,X=x=>ox+(x-(LIP-6))*SC,Y=y=>oy-(y-SLIP.y1)*SC;let o="";
  let p=`M${X(LIP-6)},${h}`;for(let x=LIP-6;x<=LIP+22;x+=0.25)p+=` L${X(x)},${Y(trackY(x))}`;p+=` L${X(LIP+22)},${h}Z`;o+=`<path d="${p}" fill="${SOIL}"/>`;
  if(s.airPath.length>1)o+=`<polyline points="${s.airPath.map(q=>`${X(q[0]).toFixed(1)},${Y(q[1]).toFixed(1)}`).join(" ")}" fill="none" stroke="var(--sun)" stroke-width="2.5" stroke-dasharray="5 4"/>`;
  o+=`<text class="t-lab" x="${X(LIP)}" y="${Y(SLIP.y1)-10}" text-anchor="middle">LIP</text><text class="t-lab" x="${X((LIP+GAP_END)/2)}" y="${Y(SGAP.y0)+16}" text-anchor="middle" style="fill:#F5EFE4">GAP 6 m</text>`;
  const J=s.jump;o+=`<rect x="8" y="8" width="404" height="66" rx="8" fill="var(--paper)"/><text class="t-ink" x="16" y="28">${J?`Left the lip at ${fmt(J.v,1)} m/s (${fmt(J.v*3.6)} km/h)`:s.lipV?`In the air at ${fmt(s.lipV,1)} m/s…`:"Ride to the jump to see your arc"}</text>`;
  if(J)o+=`<text class="t-lab" x="16" y="46">FLEW ${fmt(J.dist,1)} m · ${J.cleared?"CLEARED THE GAP":"SHORT"} · LANDING HIT ${fmt(J.impact,1)} m/s</text><text class="t-lab" x="16" y="64" style="${J.bottom?"fill:var(--hot)":""}">FORK USED ${fmt(Math.min(J.forkX,TRAVEL())*1000)} OF ${fmt(TRAVEL()*1000)} mm${J.bottom?" · BOTTOMED OUT":""}</text>`;
  return o}
function stopPanel(){const N=stopNums();return `<text class="t-lab" x="16" y="28">STOPPING DISTANCE = THINKING + BRAKING</text>
  <text class="t-ink" x="16" y="58">Thinking = speed × reaction time</text><text class="t-ink" x="16" y="78">= ${fmt(N.v,1)} m/s × ${fmt(s.tr,1)} s = <tspan style="font-weight:600">${fmt(N.think,1)} m</tspan></text>
  <text class="t-ink" x="16" y="110">Braking = v² ÷ (2 × μ × g)</text><text class="t-ink" x="16" y="130">= ${fmt(N.v,1)}² ÷ (2 × ${fmt(N.mu,2)} × 9.8) = <tspan style="font-weight:600">${fmt(N.brake,1)} m</tspan></text>
  <text class="t-lab" x="16" y="150">μ ${fmt(N.mu,2)} = ${WH().n.toUpperCase()} ON ${SURF[s.grip].toUpperCase()}</text>
  <text class="t-ink" x="16" y="180" style="font-weight:600">Total ${fmt(N.total,1)} m · log at ${LOGX} m</text>
  <text class="t-lab" x="16" y="208">DOUBLE THE SPEED → THINKING ×2, BRAKING ×4</text><text class="t-lab" x="16" y="226">AT ${fmt(s.v0*2)} KM/H: ${fmt(N.think*2+N.brake*4,1)} m</text><text class="t-lab" x="16" y="244">MASS CANCELS OUT: F = μmg AND a = F ÷ m = μg</text>`}
function springPanel(){const w=420,h=260,N=forkNums(),T=N.T,X=x=>46+x/0.25*(w-70),Fmax=Math.max(3000,N.k*0.25),Y=F=>h-34-F/Fmax*(h-60);let o=axes(w,h,"COMPRESSION x (mm)","FORCE F (N)");
  for(let mm=0;mm<=250;mm+=50)o+=`<text class="t-lab" x="${X(mm/1000)}" y="${h-20}" text-anchor="middle">${mm}</text>`;
  o+=`<rect x="${X(T)}" y="14" width="${X(0.25)-X(T)}" height="${h-48}" fill="var(--hot)" opacity=".08"/><text class="t-lab" x="${(X(T)+X(0.25))/2}" y="30" text-anchor="middle">BOTTOM</text><text class="t-lab" x="${(X(T)+X(0.25))/2}" y="42" text-anchor="middle">OUT</text>`;
  o+=`<line x1="${X(0)}" y1="${Y(0)}" x2="${X(0.25)}" y2="${Y(N.k*0.25)}" stroke="var(--earth)" stroke-width="2.4"/>`;
  o+=`<circle cx="${X(N.sag)}" cy="${Y(N.k*N.sag)}" r="5" fill="var(--good)"/><text class="t-lab" x="${X(N.sag)+8}" y="${Y(N.k*N.sag)+14}">SAG ${fmt(N.sag*1000)} mm</text>`;
  const xm=Math.min(N.x,T);o+=`<circle cx="${X(xm)}" cy="${Y(N.k*xm)}" r="5" fill="var(--hot)"/><text class="t-lab" x="${X(xm)-8}" y="${Y(N.k*xm)-10}" text-anchor="end">LANDING ${fmt(N.x*1000)} mm</text>`;
  o+=`<text class="t-ink" x="${w-14}" y="${h-46}" text-anchor="end">F = kx = ${fmt(N.k)} × ${fmt(xm,3)} = ${fmt(N.k*xm)} N</text>`;return o}
// the spec card: every number your build changes
function specCard(){const w=420,Md=MD(),Wh=WH(),Br=BR(),C=CL(),onC=s.b.colour==="black"?CREAM:"#fff";
  const rows=[
    ["MASS  bike + rider",`${fmt(bikeMass(),1)} + ${s.m} = ${fmt(M(),1)} kg`],
    ["WEIGHT  W = mg",`${fmt(M(),1)} × 9.8 = ${fmt(M()*g)} N`],
    ["TYRES",`${Wh.n}`],
    ["GRIP μ  dry · mud · roots",`${fmt(Wh.mu.dry,2)} · ${fmt(Wh.mu.mud,2)} · ${fmt(Wh.mu.roots,2)}`],
    ["ROLLING Crr  dry · mud · roots",`${fmt(Wh.crr.dry,3)} · ${fmt(Wh.crr.mud,3)} · ${fmt(Wh.crr.roots,3)}`],
    ["FORK",`${Md.fork==="dual"?"Dual":"Single"} crown · ${fmt(Md.travel*1000)} mm · k ${s.k} N/mm`],
    ["BARS",`${Br.n} · ${Br.w} mm`],
    ["DRAG AREA CdA",`${fmt(CDA(),2)} m²`],
    ["AIR DRAG AT 40 km/h  ½ρCdAv²",`${fmt(0.5*RHO*CDA()*Math.pow(40/3.6,2))} N`],
    ["ROTORS",`${Md.rotor} mm · ${fmt(Md.rmass*1000)} g a pair`]];
  let o=`<rect x="0" y="0" width="${w}" height="260" fill="var(--as-card,var(--paper))"/><rect x="0" y="0" width="${w}" height="36" fill="${C.main}"/><rect x="0" y="33" width="${w}" height="3" fill="${CREAM}"/>`;
  o+=`<text x="14" y="24" style="font:700 16px var(--display);letter-spacing:.18em" fill="${onC}">${Md.n}</text><text x="${w-14}" y="23" text-anchor="end" style="font:600 12px var(--display);letter-spacing:.06em" fill="${onC}">SPEC CARD${s.b.plate?" · #"+esc(s.b.plate):""}${s.b.tag?" · "+esc(s.b.tag):""}</text>`;
  rows.forEach(([l,v],i)=>{const y=58+i*21.5;if(i%2)o+=`<rect x="6" y="${y-15}" width="${w-12}" height="21.5" rx="4" fill="var(--as-line,var(--line))" opacity=".45"/>`;
    o+=`<text x="14" y="${y}" style="font:500 10.5px var(--mono);letter-spacing:.03em;fill:var(--as-muted,var(--rose))">${l}</text><text x="${w-14}" y="${y}" text-anchor="end" style="font:600 13.5px var(--display);fill:var(--as-ink,var(--ink))">${v}</text>`});
  return o}

// =====================================================================================
// ---------- sound: freewheel ticks, tyre roar and wind that follow your speed (Web Audio, made only after a tap)
const snd=(()=>{let ctx=null,N={},gest=false,mutedC=null;
  const isMuted=()=>{if(mutedC!==null)return mutedC;try{mutedC=localStorage.getItem("studysound")==="off"}catch(e){mutedC=false}return mutedC};
  function init(){if(ctx||isMuted())return;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;try{ctx=new AC()}catch(e){return}
    const sr=ctx.sampleRate,nb=ctx.createBuffer(1,sr*2,sr),d=nb.getChannelData(0);let b=0;for(let i=0;i<d.length;i++){b=0.97*b+0.03*(Math.random()*2-1);d[i]=(Math.random()*2-1)*0.5+b*4}
    const src=ctx.createBufferSource();src.buffer=nb;src.loop=true;
    const master=ctx.createGain();master.gain.value=0;master.connect(ctx.destination);
    const mk=(type,f,q)=>{const x=ctx.createBiquadFilter();x.type=type;x.frequency.value=f;if(q)x.Q.value=q;return x};
    const tyre=mk("lowpass",220,0.7),gT=ctx.createGain(),wind=mk("bandpass",900,0.6),gW=ctx.createGain(),hiss=mk("highpass",2600),gB=ctx.createGain();
    gT.gain.value=gW.gain.value=gB.gain.value=0;src.connect(tyre).connect(gT).connect(master);src.connect(wind).connect(gW).connect(master);src.connect(hiss).connect(gB).connect(master);
    // the freewheel: one pawl click per loop; loop rate follows wheel speed
    const cl=Math.round(sr/40),cb=ctx.createBuffer(1,cl,sr),cd=cb.getChannelData(0);for(let i=0;i<Math.min(cl,Math.round(sr*0.0016));i++)cd[i]=Math.sin(i*2*Math.PI*3800/sr)*Math.exp(-i/(sr*0.0004));
    const cs=ctx.createBufferSource();cs.buffer=cb;cs.loop=true;const gC=ctx.createGain();gC.gain.value=0;cs.connect(gC).connect(master);
    src.start();cs.start();N={master,gT,gW,gB,gC,cs,tyre,wind}}
  const on=()=>{gest=true;if(!isMuted())init();if(ctx&&ctx.state==="suspended"&&!isMuted())ctx.resume().catch(()=>{})};
  addEventListener("pointerdown",on,true);addEventListener("keydown",on,true);
  addEventListener("storage",e=>{if(e.key==="studysound")mutedC=null});
  function syncMute(){mutedC=null;if(isMuted()){if(ctx){N.master.gain.setTargetAtTime(0,ctx.currentTime,0.02);setTimeout(()=>ctx&&isMuted()&&ctx.suspend().catch(()=>{}),120)}}else if(gest)on()}
  // v (m/s), brake (N), active (moving on a ride step)
  function update(v,brake,active){if(!ctx)return;const t=ctx.currentTime,live=active&&!isMuted()&&!document.hidden&&v>0.15;
    N.master.gain.setTargetAtTime(live?1:0,t,live?0.05:0.12);if(!live)return;
    const sp=Math.min(1,v/16);N.gT.gain.setTargetAtTime(0.045*Math.min(1,v/10),t,0.08);N.tyre.frequency.setTargetAtTime(140+v*22,t,0.1);
    N.gW.gain.setTargetAtTime(0.05*sp*sp,t,0.1);N.wind.frequency.setTargetAtTime(500+v*70,t,0.1);
    N.gB.gain.setTargetAtTime(v>0.6?0.022*Math.min(1,brake/700):0,t,0.06);
    // 24 clicks per wheel turn; wheel radius 0.37 m
    const rate=v/(2*Math.PI*0.37)*24;N.cs.playbackRate.setTargetAtTime(Math.max(0.05,rate/40),t,0.05);N.gC.gain.setTargetAtTime(0.02*Math.min(1,v/2)*(1-0.6*sp),t,0.05)}
  function thud(k){if(!ctx||isMuted()||document.hidden)return;const t=ctx.currentTime,o=ctx.createOscillator(),gg=ctx.createGain();o.type="sine";o.frequency.setValueAtTime(110,t);o.frequency.exponentialRampToValueAtTime(45,t+0.18);
    gg.gain.setValueAtTime(0.0001,t);gg.gain.exponentialRampToValueAtTime(0.09*k+0.01,t+0.01);gg.gain.exponentialRampToValueAtTime(0.0001,t+0.25);o.connect(gg).connect(ctx.destination);o.start(t);o.stop(t+0.3)}
  return {update,thud,syncMute}})();

// =====================================================================================
// ---------- rider tips: a real skill for each step, and the physics that makes it work
const TIPS={
  garage:["Check your tyre pressure","Squeeze the tyres before every ride. Too soft and the rim can hit roots and rocks; too hard and the tyre skips about.","Pressure = force ÷ area, so the contact patch is roughly your weight on that wheel ÷ the tyre pressure. Softer tyres flatten into a bigger patch with more grip, but squash and un-squash more as they roll, so rolling resistance goes up."],
  drop:["Look ahead, not at your front wheel","Lift your eyes and look where you want to go, a few seconds down the trail.","At 40 km/h you travel 11 m every second. If you only look 5 m ahead, everything arrives before you've had time to react. Looking further gives your brain the time it needs."],
  graph:["Pump the rollers","Instead of pedalling, push the bike down into the back of each roller and let it come up over the front.","Pushing down on a down-slope makes the ground push back harder, and part of that support force points forwards along the trail. Your legs do work on the bike, so it gains kinetic energy. Watch the speed–time graph rise on the wooden roller."],
  forces:["Get into the attack position","Pedals level, knees and elbows bent, hips back, chest low, eyes up.","Crouching lowers your centre of mass, so the line of your weight stays between the tyres on steep chutes and you're harder to tip over. It also shrinks your frontal area: try sitting up and watch the air resistance grow."],
  energy:["Brake before the berm, not in it","Do your slowing on the straight, then let go of the brakes through the turn.","Your tyres can only give so much friction (about μ × the support force). In a turn, friction is already busy pushing you sideways round the corner. Ask it to brake as well and it runs out, and the tyres skid. Braking also turns your kinetic energy into heat in the rotors: watch the thermometer."],
  jump:["Compress, then let the bike come up","Push down into the face of the lip, then relax your arms and legs and let the bike rise to you. Don't yank on the bars.","Once your tyres leave the lip, only gravity and air act on you, so the path of your centre of mass is set at take-off. Your speed at the lip is the thing that decides whether you clear the gap. Session a jump at slower speeds first."],
  stop:["Ride within your sight line","Only go as fast as you could stop in the distance you can see.","Stopping distance = thinking + braking, and braking distance grows with speed squared. Around a blind corner on wet roots, the safe speed is a lot lower than it feels."],
  fork:["Soft knees and elbows","Land with your arms and legs bent so they can bend some more.","The same kinetic energy has to be taken away on landing. Work = force × distance, so stopping over a longer distance (fork plus legs) means a smaller force on you. Your helmet's foam works the same way."],
  test:["Change one thing at a time","Like a fair test in science: swap one part, ride, compare with your last run.","If you change the tyres and the bars at once, you can't tell which one made the difference. The dashed ghost line on the speed–time graph is your last run."]};

// ---------- steps
const steps=[
 {k:"garage",lab:"The garage",cap:"Choose a bike and build it. Every part changes a real number in the physics, and the rest of the machine uses your build.",speed:1,controls:["m"],
  big:"<b>The big idea:</b> mass, grip, rolling resistance, suspension stiffness and air resistance are all numbers you can change. Change the bike and every later step changes with it.",
  exam:"Mass is the amount of matter in an object, measured in kilograms. Weight is the force of gravity on that mass, measured in newtons: W = mg. A 72 kg rider and bike has a weight of 72 × 9.8 ≈ 706 N on Earth.",
  trap:"Mixing up mass and weight. Mass is in kg and is the same everywhere. Weight is a force in N and depends on gravity (W = mg).",chips:["mass","weight","mu","travel","cda"],onStep:()=>{s.playing=!REDUCED}},
 {k:"drop",lab:"Drop in",cap:"Press play to drop into the trail. The helmet cam shows your speed. Speed = distance ÷ time: watch how far you go each second.",speed:1,speedLabel:"real time",controls:["play","restart","limit","slow"],
  big:"<b>The big idea:</b> average speed = total distance ÷ total time. Your speed at any moment (instantaneous speed) changes all the way down.",
  exam:"Average speed = distance ÷ time. If the rider covers 248 m in 22 s, the average speed is 248 ÷ 22 ≈ 11.3 m/s, which is 11.3 × 3.6 ≈ 41 km/h. The instantaneous speed is higher on the steep chute and lower in the berm.",
  trap:"Mixing units. Change km/h to m/s by dividing by 3.6 before using it in a formula.",chips:["time","dist","speed","avg"],onStep:()=>{resetRun()}},
 {k:"graph",lab:"Speed–time graph",cap:"The speed–time graph builds as you ride. Steep parts are big accelerations. Flat parts mean steady speed, where you're dragging the brakes. Change your build in the garage and race your last run.",speed:1,speedLabel:"real time",controls:["play","restart","limit","slow"],
  big:"<b>The big idea:</b> on a speed–time graph, the gradient is the acceleration and the area under the line is the distance travelled.",
  exam:"On a speed–time graph the gradient shows acceleration: a = change in speed ÷ time. A horizontal line means constant speed, so the acceleration is zero. The area under the graph is the distance travelled.",
  trap:"Reading a distance–time graph as if it were speed–time. A flat line on distance–time means stopped; on speed–time it means moving at a steady speed.",chips:["time","speed","accel","dist"],onStep:()=>{resetRun()}},
 {k:"forces",lab:"Forces on the rider",cap:"Arrows show the forces on the rider. When your speed is steady, the down-slope pull is cancelled by friction, air and brakes. Slide the speed limit up to let go of the brakes, or sit up and feel the air.",speed:1,speedLabel:"real time",controls:["play","restart","m","limit","grip","pose","slow"],
  big:"<b>The big idea:</b> balanced forces mean steady speed (or staying still). Unbalanced forces change speed: a = F ÷ m.",
  exam:"When the rider travels at a constant speed the forces along the slope are balanced: the component of weight down the slope equals friction, air resistance and the braking force, so the net force is zero and there is no acceleration. When the rider releases the brakes, the forces become unbalanced and the rider accelerates (a = F_net ÷ m).",
  trap:"Thinking you need a forward force to keep moving at a steady speed. At constant speed the forces are balanced.",chips:["speed","net","accel","mass","drag"],onStep:()=>{resetRun()}},
 {k:"energy",lab:"Where the energy goes",cap:"Every metre you drop turns gravitational potential energy into other forms. Watch how much becomes speed and how much becomes heat in your brake rotors.",speed:1,speedLabel:"real time",controls:["play","restart","m","limit","slow"],
  big:"<b>The big idea:</b> energy is conserved. Ep lost = Ek gained + heat (brakes, friction and air resistance).",
  exam:"As the rider descends, gravitational potential energy (Ep = mgh) is transformed into kinetic energy (Ek = ½mv²). Some energy is transformed into heat in the brake rotors and by friction and air resistance, so Ek at the bottom is less than the Ep lost. Energy is not used up; it changes form.",
  trap:"Saying energy is 'lost' or 'used up'. Say it is transformed (changed) into heat and sound.",chips:["ep","ek","heat","rotor"],onStep:()=>{resetRun()}},
 {k:"jump",lab:"The gap jump",cap:"At the lip you become a projectile. Gravity pulls you down at 9.8 m/s² while you keep moving forwards. Too slow and you'll case the landing. Your fork catches the landing.",speed:1,speedLabel:"real time",controls:["play","restart","limit","slow"],
  big:"<b>The big idea:</b> in the air the only forces are gravity and air resistance. Faster at the lip means more distance before you land.",
  exam:"Once the rider leaves the lip, the only significant force is gravity (plus a little air resistance). The rider keeps their horizontal speed but accelerates downwards at 9.8 m/s², so the path is a curve. A higher speed at the lip means the rider travels further horizontally before landing.",
  trap:"Thinking a heavier rider falls faster in the air. Without air resistance, mass does not change how fast you fall.",chips:["lip","flew","speed"],onStep:()=>{resetRun();s.x=LIP-60;s.y=trackY(s.x);s.v=8}},
 {k:"stop",lab:"Stopping distance",cap:"A log has fallen across the trail 25 m ahead. You need time to react, then the brakes need distance to stop you. Try mud, wet roots, more speed, a slower reaction, or different tyres in the garage.",speed:1,speedLabel:"real time",controls:["play","restart","v0","tr","grip"],
  big:"<b>The big idea:</b> stopping distance = thinking distance + braking distance. Braking distance grows with speed squared.",
  exam:"Stopping distance = thinking distance + braking distance. Thinking distance = speed × reaction time, so it doubles when speed doubles. Braking distance depends on speed squared, so doubling the speed makes it about four times longer. Mud lowers the friction between the tyres and the trail, so the braking distance increases.",
  trap:"Assuming double the speed means double the braking distance. It's four times as far.",chips:["think","brake","stopd","mu"],onStep:()=>{resetStop()}},
 {k:"fork",lab:"Suspension spring",get cap(){return `Drop off a ledge and the fork spring catches you. A stiffer spring compresses less. Too soft and you bottom out the ${fmt(TRAVEL()*1000)} mm of travel on your ${MD().n}.`},speed:1,speedLabel:"real time",controls:["play","restart","k","fh","m"],
  big:"<b>The big idea:</b> a spring obeys Hooke's law, F = kx. It stores energy when it's squashed (elastic potential energy) and gives it back.",
  exam:"The fork spring obeys Hooke's law, F = kx: the force is proportional to the compression. A spring with a larger spring constant k compresses less for the same force. On landing, the rider's kinetic energy is transferred into elastic potential energy in the spring, and the damper turns some of it into heat so the bike doesn't bounce.",
  trap:"Using millimetres in F = kx when k is in N/m. Convert to metres first: 120 mm = 0.12 m.",chips:["k","comp","force"],onStep:()=>{resetFork()}},
 {k:"test",lab:"Test yourself",cap:"Five challenges. Use the controls from any step and the garage, then press Check.",controls:["restart","limit","m","grip","v0","tr","k","fh"],chips:["time","stopd","comp","rotor"],
  big:"<b>Exam tip:</b> say which forces act, whether they're balanced, and what that means for the speed. Show the formula, the numbers and the unit."}];

// ---------- challenges (two use the garage)
const ROTOR_MAX=125;
const CH=[
  {q:"Clear the gap and finish in under 25 seconds without crashing. (Go to Drop in, set the brake speed, ride it, then come back.)",check:()=>!!(s.lastRun&&s.lastRun.cleared&&s.lastRun.time<25),ok:()=>`Yes: ${fmt(s.lastRun.time,1)} s on ${s.lastRun.build} ${s.lastRun.limit>=80?"with no brakes":"braking above "+s.lastRun.limit+" km/h"}.`,no:()=>s.lastRun?`Your last run: ${fmt(s.lastRun.time,1)} s, gap ${s.lastRun.cleared?"cleared":"not cleared"}. Brake less (raise the brake speed).`:"No finished run yet. Ride the trail from Drop in."},
  {q:"In the mud at 40 km/h, choose a reaction time that stops you before the log at 25 m.",check:()=>s.grip==="mud"&&s.v0===40&&stopNums().total<25,ok:()=>`Yes: ${fmt(stopNums().total,1)} m. Braking alone takes ${fmt(stopNums().brake,1)} m in mud on ${WH().n}, so you can only spend ${fmt(25-stopNums().brake,1)} m thinking.`,
    no:()=>s.grip!=="mud"||s.v0!==40?"Set the trail to wet and muddy and the speed to 40 km/h first.":stopNums().brake+11.11*0.3>=25?`Braking alone takes ${fmt(stopNums().brake,1)} m on ${WH().n}, so even the fastest reaction won't do it. Fit grippier wheels in the garage.`:`Not yet: ${fmt(stopNums().total,1)} m. Thinking distance = 11.1 m/s × reaction time.`},
  {get q(){return `Set the spring so a 1.5 m drop uses between 75% and 95% of your ${MD().n}'s ${fmt(TRAVEL()*1000)} mm of travel.`},check:()=>s.fh===1.5&&forkNums().x>=0.75*TRAVEL()&&forkNums().x<=0.95*TRAVEL(),ok:()=>`Yes: ${fmt(forkNums().x*1000)} mm of ${fmt(TRAVEL()*1000)} mm with k = ${s.k} N/mm. Plenty of travel used, no bottoming out.`,no:()=>s.fh!==1.5?"Set the drop height to 1.5 m first (Suspension spring step).":`Not yet: ${fmt(forkNums().x*1000)} mm of ${fmt(TRAVEL()*1000)} mm. ${forkNums().x>0.95*TRAVEL()?"Stiffer spring (bigger k).":"Softer spring (smaller k)."}`},
  {q:"Garage: on wet roots at 30 km/h with a 0.5 s reaction time, build a bike that stops within 15 m.",check:()=>stopNums(30,0.5,"roots").total<=15,ok:()=>{const N=stopNums(30,0.5,"roots");return `Yes: ${WH().n} grip μ = ${fmt(N.mu,2)} on roots. ${fmt(N.think,1)} m thinking + ${fmt(N.brake,1)} m braking = ${fmt(N.total,1)} m.`},
    no:()=>{const N=stopNums(30,0.5,"roots");return `${WH().n}: μ = ${fmt(N.mu,2)} on roots, ${fmt(N.think,1)} + ${fmt(N.brake,1)} = ${fmt(N.total,1)} m. Braking distance = v² ÷ (2μg), so you need a bigger μ. Swap wheels in the garage.`}},
  {q:`Garage: FLOW has small 180 mm rotors. Build a FLOW, brake above 45 km/h (or lower) on dry hardpack, and finish a run with the rotors under ${ROTOR_MAX} °C. Which parts help, and why?`,check:()=>!!(s.lastRun&&s.lastRun.model==="flow"&&s.lastRun.grip==="dry"&&s.lastRun.limit<=45&&s.lastRun.rotorT<ROTOR_MAX),
    ok:()=>`Yes: ${fmt(s.lastRun.rotorT)} °C on ${s.lastRun.build}. Less mass means less Ep to get rid of; heavier rotors need more energy per degree (Q = mcΔT); more rolling resistance and drag take some energy so the brakes don't have to.`,
    no:()=>!s.lastRun?"No finished run yet. Build a FLOW, then ride from Drop in with the brake speed at 45 km/h or less.":s.lastRun.model!=="flow"?`Your last run was on ${s.lastRun.build}. Choose FLOW in the garage, then ride again.`:s.lastRun.grip!=="dry"?"Set the trail to dry hardpack (Forces step) and ride again.":s.lastRun.limit>45?`Your last run ${s.lastRun.limit>=80?"had no brakes":"braked above "+s.lastRun.limit+" km/h"}. Set the brake speed to 45 km/h or less and ride again.`:`Your last run: ${fmt(s.lastRun.rotorT)} °C on ${s.lastRun.build}. Think Q = mcΔT: what makes Q smaller, or m bigger?`}];

// ---------- the garage panel and the rider-tip card (built once, after the kit mounts)
const CSS=`.bk-garage{flex:1 1 100%;display:grid;gap:10px;min-width:0}
.bk-models{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.bk-model{appearance:none;border:1px solid var(--as-line,var(--line));background:var(--as-card,var(--paper));border-radius:16px;padding:6px 6px 8px;cursor:pointer;display:grid;gap:1px;text-align:left;color:var(--ink);font:inherit;transition:transform .15s ease,box-shadow .2s ease;min-width:0}
.bk-model:hover{transform:translateY(-1px)}
.bk-model svg{width:100%;height:auto;background:#ECE3D3;border-radius:8px;margin-bottom:4px}
.bk-model b{font:700 14px var(--display);letter-spacing:.16em}
.bk-model span{font:500 10.5px var(--as-font,var(--mono));color:var(--as-muted,var(--rose));text-transform:uppercase;letter-spacing:.05em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bk-model[aria-pressed="true"]{border-color:var(--as-mint,var(--ink));background:var(--as-mintsoft,var(--paper));box-shadow:0 0 0 3px var(--as-mintsoft,var(--glow))}
.bk-row{display:flex;flex-wrap:wrap;align-items:center;gap:6px 6px}
.bk-l{font:600 11px var(--as-font,var(--mono));color:var(--as-muted,var(--rose));text-transform:uppercase;letter-spacing:.04em;min-width:7.6em}
.bk-opt{appearance:none;border:1px solid var(--as-line,var(--line));background:var(--as-card,var(--paper));color:var(--as-ink,var(--ink));border-radius:999px;padding:6px 12px;font:500 12.5px var(--as-font,var(--mono));cursor:pointer}
.bk-opt small{color:var(--rose);margin-left:5px;font-size:10.5px}
.bk-opt[aria-pressed="true"]{background:var(--as-mintsoft,var(--sun));border-color:var(--as-mint,var(--ink));color:var(--as-ink,#2A1426);font-weight:600}.bk-opt[aria-pressed="true"] small{color:var(--as-mintink,#5A3A1A)}
.bk-sw i{display:inline-block;width:13px;height:13px;border-radius:50%;vertical-align:-2px;border:1px solid rgba(0,0,0,.3);margin-right:-3px}
.bk-sw i+i{margin-right:6px}
.bk-in{font:600 13px var(--as-mono,var(--mono));border:1px solid var(--as-line,var(--ink));border-radius:10px;padding:6px 9px;background:var(--as-card,var(--paper));color:var(--as-ink,var(--ink));width:6.2em;text-transform:uppercase}
.bk-in.tag{width:8.4em}
.bk-tip{border-left:5px solid var(--as-mint,var(--sun))!important}
.bk-tip .tt{color:var(--as-ink,var(--ink));font-weight:600;margin:0 0 3px}
.bk-tip .tw{font-size:13px;margin-top:7px}
.bk-tip .tw b{font:600 10.5px var(--as-font,var(--mono));letter-spacing:.08em;text-transform:uppercase;color:var(--as-mintink,var(--rose));margin-right:6px}
@media (max-width:560px){.bk-l{min-width:0;flex-basis:100%}.bk-model span{font-size:9px}}`;
function thumb(m){const b=Object.assign(STOCK(m),{colour:m===s.b.model?s.b.colour:MODELS[m].colour,guard:false,pod:false,plate:"",tag:""});return `<svg viewBox="-47 -55 98 60" aria-hidden="true"><ellipse cx="2" cy="1" rx="44" ry="2.4" fill="#000" opacity=".12"/>${bikeSVG({b,spin:0.4,comp:0.08,rider:false,detail:false})}</svg>`}
const garageUI=(()=>{let el=null;const q=sel=>el?el.querySelectorAll(sel):[];
  function change(fn,sound){fn();save();refresh();StudyKit.sfx(sound||"pop");api.redraw()}
  function build(){const ctl=document.getElementById("k-ctl");if(!ctl||el)return;
    const st=document.createElement("style");st.textContent=CSS;document.head.appendChild(st);
    el=document.createElement("div");el.className="bk-garage";el.setAttribute("role","group");el.setAttribute("aria-label","Build your bike");
    const opt=(attr,k,label,small)=>`<button type="button" class="bk-opt" data-${attr}="${k}" aria-pressed="false">${label}${small?`<small>${small}</small>`:""}</button>`;
    const kg=d=>d===0?"":(d>0?"+":"−")+fmt(Math.abs(d)*1000)+" g";
    el.innerHTML=`<div class="bk-models">${Object.keys(MODELS).map(m=>`<button type="button" class="bk-model" data-model="${m}" aria-pressed="false"><span class="th">${thumb(m)}</span><b>${MODELS[m].n}</b><span>${MODELS[m].kind} · ${fmt(MODELS[m].travel*1000)} mm</span></button>`).join("")}</div>
      <div class="bk-row"><span class="bk-l">Frame colour</span>${Object.keys(COLOURS).map(c=>`<button type="button" class="bk-opt bk-sw" data-colour="${c}" aria-pressed="false"><i style="background:${COLOURS[c].main}"></i><i style="background:${CREAM}"></i>${COLOURS[c].n} + cream</button>`).join("")}</div>
      <div class="bk-row"><span class="bk-l">Wheels</span>${Object.keys(WHEELS).map(w=>opt("wheels",w,WHEELS[w].n,kg(WHEELS[w].dm))).join("")}</div>
      <div class="bk-row"><span class="bk-l">Handlebars</span>${Object.keys(BARS).map(k=>opt("bars",k,BARS[k].n,BARS[k].w+" mm")).join("")}</div>
      <div class="bk-row"><span class="bk-l">Extras</span>${opt("x","guard","Mudguard","+150 g")}${opt("x","pod","Camera + light pod","+250 g")}</div>
      <div class="bk-row"><label class="bk-l" for="bk-plate">Number plate</label><input class="bk-in" id="bk-plate" inputmode="numeric" maxlength="3" autocomplete="off" placeholder="13"><label class="bk-l" for="bk-tag" style="min-width:0;margin-left:6px">Gear tag</label><input class="bk-in tag" id="bk-tag" maxlength="8" autocomplete="off" placeholder="NAME" spellcheck="false"><button type="button" class="btn" id="bk-stock">Back to stock</button></div>`;
    ctl.prepend(el);
    q("[data-model]").forEach(b=>b.onclick=()=>change(()=>{const m=b.dataset.model;if(m!==s.b.model){Object.assign(s.b,STOCK(m));s.k=MODELS[m].k}},"whoosh"));
    q("[data-colour]").forEach(b=>b.onclick=()=>change(()=>{s.b.colour=b.dataset.colour}));
    q("[data-wheels]").forEach(b=>b.onclick=()=>change(()=>{s.b.wheels=b.dataset.wheels}));
    q("[data-bars]").forEach(b=>b.onclick=()=>change(()=>{s.b.bars=b.dataset.bars}));
    q("[data-x]").forEach(b=>b.onclick=()=>change(()=>{const k=b.dataset.x;s.b[k]=!s.b[k]}));
    const pl=el.querySelector("#bk-plate"),tg=el.querySelector("#bk-tag");
    pl.oninput=()=>{const v=cleanPlate(pl.value);if(pl.value!==v)pl.value=v;s.b.plate=v;save();StudyKit.sfx("tick");api.redraw()};
    tg.oninput=()=>{const v=cleanTag(tg.value);if(tg.value.toUpperCase()!==v)tg.value=v;s.b.tag=v;save();StudyKit.sfx("tick");api.redraw()};
    el.querySelector("#bk-stock").onclick=()=>change(()=>{Object.assign(s.b,STOCK(s.b.model));s.k=MD().k},"whoosh");
    refresh()}
  function refresh(){if(!el)return;q("[data-model]").forEach(b=>{b.setAttribute("aria-pressed",b.dataset.model===s.b.model);b.querySelector(".th").innerHTML=thumb(b.dataset.model)});
    q("[data-colour]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.colour===s.b.colour));q("[data-wheels]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.wheels===s.b.wheels));
    q("[data-bars]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.bars===s.b.bars));q("[data-x]").forEach(b=>b.setAttribute("aria-pressed",!!s.b[b.dataset.x]));
    const pl=el.querySelector("#bk-plate"),tg=el.querySelector("#bk-tag");if(document.activeElement!==pl)pl.value=s.b.plate;if(document.activeElement!==tg)tg.value=s.b.tag}
  return {build,refresh,show:v=>{if(el)el.hidden=!v}}})();
const tipUI=(()=>{let el=null;
  function build(){const side=document.querySelector(".side"),ex=document.getElementById("k-examcard");if(!side||el)return;el=document.createElement("div");el.className="card bk-tip";el.setAttribute("aria-live","polite");side.insertBefore(el,ex)}
  function set(k){if(!el)return;const t=TIPS[k];el.hidden=!t;if(!t)return;el.innerHTML=`<h3>Rider tip</h3><p class="tt">${esc(t[0])}</p><p>${esc(t[1])}</p><p class="tw"><b>Why it works</b>${esc(t[2])}</p>`}
  return {build,set}})();

// ---- kupu Māori: te reo terms for this machine, each checked in Te Aka Māori Dictionary (ta = word id). Sources and notes: te-reo-notes.md
const KUPU=[
 {mi:"tōpana",en:"force",ta:40375,chip:"net"},
 {mi:"tōpana taurite",en:"balanced forces",ta:40395},
 {mi:"tere",en:"speed",ta:7953,chip:["speed", "avg", "lip"]},
 {mi:"whakahohoro",en:"acceleration, speeding up",ta:12447,chip:"accel"},
 {mi:"pūngao",en:"energy",ta:40075},
 {mi:"pūngao neke",en:"kinetic energy",ta:47721,chip:"ek"},
 {mi:"pūngao moe",en:"potential energy",ta:47720,chip:"ep"},
 {mi:"waku",en:"friction",ta:12421}];
Object.entries({"garage": ["waku"], "drop": ["tere", "whakahohoro"], "graph": ["tere", "whakahohoro"], "forces": ["tōpana", "tōpana taurite", "waku"], "energy": ["pūngao", "pūngao moe", "pūngao neke"], "jump": ["tere"], "stop": ["waku", "tere"], "fork": ["tōpana"]}).forEach(([k,a])=>{const st=steps.find(x=>x.k===k);if(st)st.kupu=a});
const api=StudyKit.mount({kupu:KUPU,
  eyebrow:"Science · Forces and motion", title:"The downhill machine", crumb:"Year 9 and 10 Science · forces, motion and energy, with NCEA Level 1 ideas", homeHash:"y9",
  fig:"FIG. 10 · THE REDWOODS, WHAKAREWAREWA FOREST", railTitle:"Build it, ride the physics",
  badge:{label:"Forces and motion · Years 9–11"},
  mainBox:"0 0 800 420", mainPhoneBig:true, mainLabel:"A downhill mountain bike and rider in a redwood forest, with a helmet camera view and force arrows", closeBox:"0 0 420 260",
  state:s, steps,
  onStep:(x,st)=>{garageUI.show(st.k==="garage");tipUI.set(st.k)},
  controls:[{type:"play"},{type:"button",id:"restart",label:"Restart",onClick:(x,api)=>{const st=api.step;st.onStep&&st.onStep();s.playing=true}},
    {type:"toggle",id:"slow",label:"Slow motion",get:()=>s.slow,set:(x,v)=>{s.slow=v}},
    {type:"toggle",id:"pose",label:"Attack position",get:()=>s.attack,set:(x,v)=>{s.attack=v},labelFn:()=>s.attack?"Attack position":"Sitting up"},
    {type:"range",id:"limit",label:"Brake above",min:20,max:80,step:1,get:()=>s.limit,set:(x,v)=>{s.limit=v},fmt:()=>s.limit>=80?"no brakes":s.limit+" km/h"},
    {type:"range",id:"m",label:"Rider mass",min:35,max:100,step:1,get:()=>s.m,set:(x,v)=>{s.m=v;save();garageUI.refresh()},fmt:()=>`${s.m} kg + ${fmt(bikeMass(),1)} kg bike`},
    {type:"select",id:"grip",label:"Trail",options:[["dry","Dry hardpack"],["mud","Wet and muddy"],["roots","Wet roots"]],get:()=>s.grip,set:(x,v,api)=>{s.grip=v;if(api&&api.step.k==="stop")resetStop()}},
    {type:"range",id:"v0",label:"Speed",min:10,max:60,step:1,get:()=>s.v0,set:(x,v)=>{s.v0=v;resetStop()},fmt:()=>s.v0+" km/h"},
    {type:"range",id:"tr",label:"Reaction time",min:0.3,max:2,step:0.1,get:()=>s.tr,set:(x,v)=>{s.tr=Math.round(v*10)/10;resetStop()},fmt:()=>fmt(s.tr,1)+" s"},
    {type:"range",id:"k",label:"Spring",min:10,max:100,step:1,get:()=>s.k,set:(x,v)=>{s.k=v;save();resetFork();s.fphase="ready"},fmt:()=>s.k+" N/mm"},
    {type:"range",id:"fh",label:"Drop height",min:0.3,max:2,step:0.1,get:()=>s.fh,set:(x,v)=>{s.fh=Math.round(v*10)/10;resetFork();s.fphase="ready"},fmt:()=>fmt(s.fh,1)+" m"}],
  tick:(x,dt,st)=>{const d=dt*(s.slow?0.35:1);if(st.k==="garage"){s.gspin+=dt*2.2}
    else if(TRACKSTEPS.includes(st.k)){if(!s.crash&&!(s.finished&&s.v<=0.01))tickTrail(d)}else if(st.k==="stop"){if(s.sphase!=="stopped")tickStop(d)}else if(st.k==="fork"){if(s.fphase==="ready")s.fphase="fall";if(s.fphase!=="settled")tickFork(d)}},
  drawMain:(x,st)=>st.k==="garage"?drawGarage():TRACKSTEPS.includes(st.k)||st.k==="test"?drawTrail(st):st.k==="stop"?drawStop():drawFork(),
  drawClose:(x,st)=>st.k==="garage"?specCard():st.k==="drop"?graph("d"):st.k==="graph"?graph("v"):st.k==="forces"?fbd():st.k==="energy"?energyBars():st.k==="jump"?jumpPanel():st.k==="stop"?stopPanel():st.k==="fork"?springPanel():graph("v"),
  chips:()=>{const F=forces(s.x,s.v),net=M()*F.grav-M()*(F.roll+F.air)-s.brakeN,N=stopNums(),K=forkNums();return{
    mass:["MASS",fmt(M(),1)+" kg"],weight:["WEIGHT",fmt(M()*g)+" N",true],mu:["GRIP μ",fmt(MU(),2)+" "+(s.grip==="dry"?"dry":s.grip==="mud"?"mud":"roots")],travel:["TRAVEL",fmt(TRAVEL()*1000)+" mm"],cda:["DRAG AREA",fmt(CDA(),2)+" m²"],
    time:["TIME",fmt(s.t,1)+" s"],dist:["DISTANCE",fmt(s.dist)+" m"],speed:["SPEED",`${fmt(s.v,1)} m/s · ${fmt(s.v*3.6)} km/h`,true],avg:["AVERAGE",s.t>0.5?fmt(s.dist/s.t,1)+" m/s":"–"],
    accel:["ACCELERATION",fmt(s.aNow,1)+" m/s²"],net:["NET FORCE",fmt(net)+" N",true],drag:["AIR",fmt(M()*F.air)+" N"],
    ep:["Ep LOST",kJ(M()*g*(TOP-s.y))],ek:["Ek",kJ(0.5*M()*s.v*s.v),true],heat:["HEAT",kJ(s.heatB+s.heatF)],rotor:["ROTORS",fmt(rotorT())+" °C"],
    lip:["LIP SPEED",s.lipV?fmt(s.lipV*3.6)+" km/h":"–",true],flew:["JUMP",s.jump?fmt(s.jump.dist,1)+" m":"–"],
    think:["THINKING",fmt(N.think,1)+" m"],brake:["BRAKING",fmt(N.brake,1)+" m"],stopd:["STOPPING",fmt(N.total,1)+" m",true],
    k:["k",fmt(K.k)+" N/m"],comp:["LANDING SQUASH",fmt(K.x*1000)+" mm",K.x>K.T],force:["SPRING FORCE",fmt(K.F)+" N"]}},
  challenges:CH,
  papers:[{label:"NZQA: Physics, Earth and Space Science",url:"https://www2.nzqa.govt.nz/ncea/subjects/past-exams-and-exemplars/physics-earth-and-space-science/"},{label:"NZQA: Science past exams",url:"https://www2.nzqa.govt.nz/ncea/subjects/past-exams-and-exemplars/"}],
  truth:"A fictional trail inspired by the Redwoods, Whakarewarewa Forest, Rotorua. Uses g = 9.8 N/kg and air density 1.2 kg/m³. Bike masses (14.5–18.4 kg), drag areas (0.47–0.65 m²), rolling resistance (0.03–0.08) and tyre grip (μ 0.22–0.78) are typical estimates, not measurements of real bikes. The fork spring also stands in for your legs, so k is stiffer than a real fork spring. Rotor temperatures assume all the braking heat stays in the rotors (a top estimate; real rotors also lose heat to the air). The rider brakes to hold the speed you choose. Bikes and riders are drawn larger than the trail so you can see them.",
  footer:"Covers Year 9–10 forces and motion: mass and weight, speed, distance–time and speed–time graphs, balanced and unbalanced forces, a = F/m, Ep and Ek, heat and Q = mcΔT, projectiles, stopping distance, pressure and Hooke's law. Energy ideas link to NCEA L1 AS 92047."
});

garageUI.build();tipUI.build();garageUI.show(api.step.k==="garage");tipUI.set(api.step.k);
try{document.getElementById("k-snd").addEventListener("click",()=>snd.syncMute())}catch(e){}
// ride sounds follow the simulation
(function loop(){const st=api.step;let v=0,br=0;
  if(s.playing&&TRACKSTEPS.includes(st.k)&&!s.crash){v=s.v;br=s.air?0:s.brakeN}
  else if(s.playing&&st.k==="stop"&&(s.sphase==="see"||s.sphase==="brake")){v=s.sv;br=s.sphase==="brake"?M()*MU()*g:0}
  snd.update(v,br,v>0);requestAnimationFrame(loop)})();
})();
