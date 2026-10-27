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
const COLOURS={red:{n:"Red",main:"#D9533F",dark:"#9A3324",hi:"#F2917C"},black:{n:"Black",main:"#353B4D",dark:"#1F2433",hi:"#6E7891"},teal:{n:"Teal",main:"#3C9888",dark:"#246358",hi:"#7FCABB"}};
const CREAM="#F3E9D6",CREAM_D="#CFC0A2",GOLD="#D9A646",GOLD_HI="#F5D88E",BLK="#2C3445";
// bench figure materials (StudyKit.fig): rubber tyres, brushed steel, the peach case tint
const FG=StudyKit.fig,PAL=FG.palette,PEACH=PAL.case.peach,PEACH_D=FG.deep(PEACH),RUB="#3C4557",RUB_D="#2C3445",RUB_HI="#5A6478",STEEL=PAL.steel,STEEL_D=PAL.steelDark,INK="#262E5C",SUB="#6E6A86",AXIS="#8F9BAA";
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
  o+=`<circle cx="${x}" cy="${y}" r="15.15" fill="none" stroke="${RUB}" stroke-width="3.9"/><circle cx="${x}" cy="${y}" r="16.6" fill="none" stroke="${RUB_HI}" stroke-width="0.45" opacity=".8"/>`;
  if(W.wall)o+=`<circle cx="${x}" cy="${y}" r="14.2" fill="none" stroke="${W.wall}" stroke-width="1.7"/>`;
  else o+=`<circle cx="${x}" cy="${y}" r="15.6" fill="none" stroke="${RUB_HI}" stroke-width="0.5"/>`;
  // tread: knobs around the outside, turning with the wheel
  let kp="";const n=W.knobs;for(let i=0;i<n;i++){const a=spin+i*2*Math.PI/n,ca=Math.cos(a),sa=Math.sin(a),r0=16.95,h=W.kh*(i%2?0.8:1),hw=W.kw/2*(i%2?0.8:1);
    const p1=[x+ca*r0-sa*hw,y+sa*r0+ca*hw],p2=[x+ca*(r0+h)-sa*hw*0.8,y+sa*(r0+h)+ca*hw*0.8],p3=[x+ca*(r0+h)+sa*hw*0.8,y+sa*(r0+h)-ca*hw*0.8],p4=[x+ca*r0+sa*hw,y+sa*r0-ca*hw];
    kp+=`M${P2(p1)}L${P2(p2)}L${P2(p3)}L${P2(p4)}Z`}
  o+=`<path d="${kp}" fill="${RUB}"/>`;
  // rim
  o+=`<circle cx="${x}" cy="${y}" r="12.75" fill="none" stroke="${RUB_D}" stroke-width="1.4"/><circle cx="${x}" cy="${y}" r="12.05" fill="none" stroke="${STEEL_D}" stroke-width="0.35"/>`;
  // spokes (two-cross lacing)
  if(detail){let sp="";for(let i=0;i<24;i++){const a=spin+i*Math.PI/12,a2=a+(i%2?0.42:-0.42);sp+=`M${P2([x+Math.cos(a)*1.9,y+Math.sin(a)*1.9])}L${P2([x+Math.cos(a2)*11.4,y+Math.sin(a2)*12])}`}
    o+=`<path d="${sp}" stroke="${STEEL_D}" stroke-width="0.28" fill="none"/>`}
  else{let sp="";for(let i=0;i<8;i++){const a=spin+i*Math.PI/4;sp+=`M${x},${y}L${P2([x+Math.cos(a)*11.4,y+Math.sin(a)*11.4])}`}o+=`<path d="${sp}" stroke="${STEEL_D}" stroke-width="0.5" fill="none"/>`}
  // disc rotor: rim, cut-outs, spider
  o+=`<circle cx="${x}" cy="${y}" r="${rotorR}" fill="none" stroke="${STEEL}" stroke-width="1.15"/><circle cx="${x}" cy="${y}" r="${rotorR+0.5}" fill="none" stroke="${STEEL_D}" stroke-width="0.2"/>`;
  const tint=heatTint(heat);if(tint)o+=`<circle cx="${x}" cy="${y}" r="${rotorR}" fill="none" stroke="${tint}" stroke-width="1.4"/>`;
  if(detail){let hp="";for(let i=0;i<10;i++){const a=spin*1+i*Math.PI/5;hp+=`M${P2([x+Math.cos(a)*(rotorR-0.3),y+Math.sin(a)*(rotorR-0.3)])}m-.22,0a.22,.22 0 1,0 .44,0a.22,.22 0 1,0 -.44,0`}o+=`<path d="${hp}" fill="${STEEL_D}"/>`}
  let sd="";for(let i=0;i<5;i++){const a=spin+i*2*Math.PI/5;sd+=`M${P2([x+Math.cos(a)*1.6,y+Math.sin(a)*1.6])}L${P2([x+Math.cos(a+0.25)*(rotorR-0.6),y+Math.sin(a+0.25)*(rotorR-0.6)])}`}
  o+=`<path d="${sd}" stroke="${STEEL_D}" stroke-width="0.6" fill="none"/>`;
  // caliper
  const ca=caliperAng;o+=`<g transform="translate(${x},${y}) rotate(${ca*180/Math.PI})"><rect x="${rotorR-1.6}" y="-1.6" width="3.2" height="3.2" rx="0.8" fill="#3A4152" stroke="#7A849A" stroke-width="0.25"/></g>`;
  // hub
  o+=`<circle cx="${x}" cy="${y}" r="2.1" fill="${STEEL_D}"/><circle cx="${x}" cy="${y}" r="1.1" fill="${STEEL}"/><circle cx="${x-0.4}" cy="${y-0.4}" r="0.4" fill="#fff"/>`;
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
  out+=`<circle cx="${cs[0]}" cy="${cs[1]}" r="2.9" fill="none" stroke="#6B6870" stroke-width="1.2" stroke-dasharray="0.5 0.3"/><path d="M${P2(add(cs,[0.2,0.6]))} l1.4,3.4 l-0.6,2" stroke="#3A4152" stroke-width="1.1" fill="none" stroke-linecap="round"/><circle cx="${cs[0]+1.3}" cy="${cs[1]+5.4}" r="0.8" fill="#3A4152"/>`;
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
  if(Md.shock==="coil"){out+=`<rect x="0" y="-1.1" width="${sl}" height="2.2" rx="1" fill="#3A4152"/>`;let cz="";const n=9;for(let i=0;i<=n;i++){const xx=sl*0.18+i*(sl*0.62)/n;cz+=`${i?"L":"M"}${xx.toFixed(2)},${i%2?-2.2:2.2}`}
    out+=`<path d="${cz}" stroke="${b.colour==="black"?"#D98A2B":GOLD}" stroke-width="0.9" fill="none" stroke-linejoin="round"/><rect x="${sl*0.12}" y="-2.6" width="1" height="5.2" fill="#4A5266"/>`}
  else{out+=`<rect x="${sl*0.4}" y="-0.55" width="${sl*0.55}" height="1.1" fill="${GOLD_HI}"/><rect x="0" y="-1.75" width="${sl*0.55}" height="3.5" rx="1.4" fill="#3A4152"/><rect x="${sl*0.05}" y="-1.2" width="${sl*0.45}" height="0.5" fill="#7A849A"/><rect x="${sl*0.42}" y="-1.9" width="1.2" height="3.8" rx=".4" fill="${b.colour==="red"?CREAM:"#C24A2F"}"/>`}
  out+=`<circle cx="0" cy="0" r=".9" fill="#7A849A"/><circle cx="${sl}" cy="0" r=".9" fill="#7A849A"/></g>`;
  // rocker link
  out+=`<path d="M${P2(P.RK)} L${P2(P.RP)} L${P2(s1)}" stroke="${C.dark}" stroke-width="2.6" fill="none" stroke-linejoin="round" stroke-linecap="round"/><path d="M${P2(P.RK)} L${P2(P.RP)} L${P2(s1)}" stroke="${C.hi}" stroke-width="0.5" fill="none" opacity=".6" transform="translate(0,-0.5)"/>`;
  [P.RK,P.RP,P.MP].forEach(q=>out+=`<circle cx="${q[0]}" cy="${q[1]}" r="0.95" fill="#3A4152"/><circle cx="${q[0]}" cy="${q[1]}" r="0.35" fill="#AAA6AE"/>`);
  // head tube
  out+=`<path d="M${P2(P.HT)} L${P2(P.HB)}" stroke="${C.main}" stroke-width="4.6" stroke-linecap="round"/><path d="M${P2(P.HT)} L${P2(P.HB)}" stroke="${C.hi}" stroke-width="0.8" stroke-linecap="round" opacity=".6" transform="translate(-1,0)"/>`;
  // seat post and saddle
  const seat=P.SEAT,sc=Md.saddle==="cream"?CREAM:Md.saddle==="dark"?BLK:C.main;
  out+=`<path d="M${P2(P.ST)} L${P2(add(seat,[0.6,1.2]))}" stroke="#3A4152" stroke-width="2.2" stroke-linecap="round"/>`;
  out+=`<path d="M${P2(add(seat,[-4.2,0.2]))} Q${P2(add(seat,[-4,-1.6]))} ${P2(add(seat,[-1,-1.3]))} L${P2(add(seat,[4.3,-0.5]))} Q${P2(add(seat,[4.9,0.4]))} ${P2(add(seat,[3.6,0.6]))} L${P2(add(seat,[-3,1]))}Z" fill="${sc}" stroke="#1F2433" stroke-width="0.3"/>`;
  // gear tag hanging off the saddle rail
  if(b.tag){const tp=add(seat,[-2.6,1.1]);out+=`<g transform="translate(${P2(tp)}) rotate(${(o.tag||0).toFixed(1)})"><line x1="0" y1="0" x2="0" y2="1.6" stroke="#3A4152" stroke-width="0.3"/><rect x="-2.4" y="1.5" width="4.8" height="6.4" rx="1" fill="${b.colour==="black"?CREAM:C.main}" stroke="#1F2433" stroke-width="0.25"/><circle cx="0" cy="2.4" r="0.45" fill="#1F2433"/>
    <text x="0" y="5.6" text-anchor="middle" style="font:700 1.75px var(--display);letter-spacing:.02em" fill="${b.colour==="black"?"#3A4152":"#fff"}" ${b.tag.length>4?`textLength="4.2" lengthAdjust="spacingAndGlyphs"`:""}>${esc(b.tag)}</text></g>`}
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
  const crown=(c,len)=>{const n=[Math.sin(P.ha),-Math.cos(P.ha)];return `<path d="M${P2(add(c,n,-len*0.45))} L${P2(add(c,n,len*0.55))}" stroke="#2C3445" stroke-width="2.4" stroke-linecap="round"/>`};
  out+=crown(P.HB,4.4);if(Md.fork==="dual")out+=crown(P.UC,4.8);
  // front mudguard
  if(b.guard){let gp="";for(let a=-2.5;a<=-1.0;a+=0.07)gp+=`${gp?"L":"M"}${P2([FA[0]+Math.cos(a)*18.9,FA[1]+Math.sin(a)*18.9])}`;out+=`<path d="${gp}" stroke="${BLK}" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="${gp}" stroke="${b.colour==="black"?CREAM:C.main}" stroke-width="0.5" fill="none" stroke-linecap="round" opacity=".8"/>`;
    let rp="";for(let a=-1.6;a<=-0.95;a+=0.07)rp+=`${rp?"L":"M"}${P2([P.RA[0]+Math.cos(a)*18.8,P.RA[1]+Math.sin(a)*18.8])}`;out+=`<path d="${rp}" stroke="${BLK}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`}
  // cockpit: stem, bars, grips, lever
  const CLp=P.CL,GR=P.GR;
  out+=`<path d="M${P2(P.SB)} L${P2(CLp)}" stroke="#2C3445" stroke-width="2" stroke-linecap="round"/>`;
  out+=`<path d="M${P2(CLp)} Q${P2(add(CLp,[0.4,(GR[1]-CLp[1])*0.7]))} ${P2(GR)}" stroke="#2C3445" stroke-width="1.35" fill="none" stroke-linecap="round"/>`;
  out+=`<path d="M${P2(add(GR,[-1.4,0.3]))} L${P2(add(GR,[1.2,-0.3]))}" stroke="${b.model==="flow"?CREAM:"#3A4152"}" stroke-width="1.9" stroke-linecap="round"/><path d="M${P2(add(GR,[0.8,0]))} l2.6,1.4" stroke="#7A849A" stroke-width="0.55" stroke-linecap="round"/>`;
  out+=`<circle cx="${CLp[0]}" cy="${CLp[1]}" r=".85" fill="#3A4152"/>`;
  // accessory pod: camera + light
  if(b.pod){const pm=add(CLp,[0.4,-1.7]);out+=`<path d="M${P2(add(CLp,[0.2,-0.5]))} L${P2(add(pm,[0,0.8]))}" stroke="#3A4152" stroke-width="0.8"/><rect x="${pm[0]-1.6}" y="${pm[1]-1.6}" width="3.4" height="2.5" rx=".5" fill="#2C3445"/><circle cx="${pm[0]+1.2}" cy="${pm[1]-0.35}" r=".8" fill="#3D5F78" stroke="#1F2433" stroke-width=".25"/>`+
    `<rect x="${pm[0]-1.4}" y="${pm[1]-3.4}" width="3.1" height="1.6" rx=".7" fill="#3A4152"/><rect x="${pm[0]+1.4}" y="${pm[1]-3.3}" width=".6" height="1.4" rx=".2" fill="${o.light?"#FFF4C9":"#DAD3BF"}"/>`;
    if(o.light)out+=`<path d="M${pm[0]+2},${pm[1]-2.6} l26,-4 l0,9 z" fill="url(#bkBeam)" opacity=".9"/>`}
  // number plate: a race plate on the bars, seen at an angle
  if(b.plate){const pp=add(CLp,[2.8,-0.1]);out+=`<g transform="translate(${P2(pp)}) rotate(-6) scale(.62,1)"><path d="M-4.2,-3.4 Q0,-4.8 4.2,-3.4 L3.6,2.4 Q0,4.4 -3.6,2.4Z" fill="${b.colour==="black"?CREAM:"#F4EFE4"}" stroke="#1F2433" stroke-width=".35"/><text x="0" y="1.5" text-anchor="middle" style="font:800 ${b.plate.length>2?3.6:4.6}px var(--display);font-style:italic" fill="#2C3445">${esc(b.plate)}</text></g>`}
  // cranks and flat pedals (level pedals)
  out+=`<circle cx="${P.BB[0]}" cy="${P.BB[1]}" r="3.7" fill="none" stroke="#4A5266" stroke-width="0.9" stroke-dasharray="0.55 0.3"/><circle cx="${P.BB[0]}" cy="${P.BB[1]}" r="3.1" fill="none" stroke="#3A4152" stroke-width="0.6"/>`;
  out+=`<path d="M${P2(P.BB)} L${P2(P.PF)}" stroke="#2C3445" stroke-width="1.6" stroke-linecap="round"/><rect x="${P.PF[0]-1.9}" y="${P.PF[1]-0.6}" width="3.8" height="1.2" rx=".3" fill="#3A4152"/><circle cx="${P.BB[0]}" cy="${P.BB[1]}" r="1.1" fill="#7A849A"/>`;
  if(RD)out+=riderFront(RD,b);
  return `<g transform="translate(0,-2)">${out}</g>`}
const P2len=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
// ---------- the rider, built from the bike's contact points (feet on pedals, hands on grips)
const JERSEY="#6FA3E8",JERSEY_D="#4C7FC4",PANTS="#3C4557",PANTS_D="#2C3445",SKIN_GLOVE="#2C3445";
function riderPts(P,o){const up=o.pose||0,cr=Math.max(0,o.crouch||0);
  const hip=[P.BB[0]-10.5+2.5*up,P.BB[1]-26+3.5*0*up-3.5*up+cr*4.5];
  const sh=[P.GR[0]-8.4-4.4*up,P.GR[1]-9.4-7.5*up+cr*3.2];
  const head=[sh[0]+4.6-1.8*up,sh[1]-6.2];
  const fF=add(P.PF,[0,-1.2]),fR=add(P.PR,[0,-1.2]);
  return {hip,sh,head,fF,fR,kF:ik(hip,fF,16,16.2,-1),kR:ik(hip,fR,16,16.2,-1),el:ik(sh,P.GR,10.8,10.4,1),elR:ik(add(sh,[-1,0.5]),add(P.GR,[-0.6,0.2]),10.8,10.4,1),GR:P.GR,up}}
const limb=(a,b,c,w,col)=>`<path d="M${P2(a)} L${P2(b)} L${P2(c)}" stroke="${col}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
const shoe=(f,col)=>`<path d="M${P2(add(f,[-3.6,0.4]))} q0,-1.8 1.8,-2 l3,0.2 q1.6,0.3 1.7,1.7 l0,0.4z" fill="${col}"/>`;
function riderBack(R){return limb(R.hip,R.kR,R.fR,5.6,PANTS_D)+shoe(R.fR,"#1F2433")+limb(add(R.sh,[-1,0.5]),R.elR,add(R.GR,[-0.6,0.2]),3.6,JERSEY_D)}
function riderFront(R,b){const C=COLOURS[b.colour];let o="";
  // thigh + shin with a knee pad, then the shoe on the pedal
  o+=limb(R.hip,R.kF,R.fF,6,PANTS)+`<circle cx="${R.kF[0]}" cy="${R.kF[1]}" r="2.6" fill="#4A5266"/>`+shoe(R.fF,"#1F2433");
  // torso with a slightly rounded back
  const mid=[(R.hip[0]+R.sh[0])/2-2.2,(R.hip[1]+R.sh[1])/2-1.2];
  o+=`<path d="M${P2(R.hip)} Q${P2(mid)} ${P2(R.sh)}" stroke="${JERSEY}" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M${P2(add(R.hip,[0.6,1.5]))} Q${P2(add(mid,[1.2,1.8]))} ${P2(add(R.sh,[1.6,1.4]))}" stroke="${C.main}" stroke-width="1.2" fill="none" opacity=".9"/>`;
  o+=`<circle cx="${R.hip[0]}" cy="${R.hip[1]}" r="3.7" fill="${PANTS}"/>`;
  // arm with a stripe, glove on the grip
  o+=limb(R.sh,R.el,R.GR,3.9,JERSEY)+`<path d="M${P2(add(R.sh,[0.4,0]))} L${P2(R.el)}" stroke="${C.main}" stroke-width="0.9" stroke-linecap="round" opacity=".9"/><circle cx="${R.GR[0]}" cy="${R.GR[1]}" r="1.75" fill="${SKIN_GLOVE}"/>`;
  // full-face helmet, goggles, chin bar, and the helmet camera on top
  const h=R.head;o+=`<path d="M${P2(add(R.sh,[0.5,-1]))} L${P2(add(h,[-1,3]))}" stroke="${JERSEY_D}" stroke-width="3" stroke-linecap="round"/>`;
  o+=`<g transform="translate(${P2(h)}) rotate(${(8-R.up*10).toFixed(1)}) scale(.92)"><path d="M-5.3,0.8 C-5.6,-4.6 -1.6,-6.4 1.4,-6 C4.6,-5.6 6.4,-3 6.2,0.2 L6.4,3.4 Q6.2,5.6 3.6,5.8 L0.4,5.6 Q-3.6,5.4 -5.3,0.8Z" fill="#FFFFFF" stroke="#1F2433" stroke-width=".3"/>`+
    `<path d="M-4.6,-2.6 Q0,-6.6 5.6,-2.2" stroke="${C.main}" stroke-width="1.3" fill="none"/><path d="M1.6,-5.9 L8.6,-5.1 L6.6,-3.6 Z" fill="${BLK}"/>`+
    `<path d="M1.4,-2.4 L6.3,-2.2 L6.3,0.6 L1.6,0.6Z" fill="#F2C83C" stroke="#1F2433" stroke-width=".45"/><path d="M2.2,-1.8 L5.2,-1.7" stroke="#FFF3D0" stroke-width=".45" opacity=".8"/>`+
    `<path d="M1.6,0.6 L6.3,0.6 L6.2,2.4 Q4,2.9 2,2.6Z" fill="#3A4152"/><path d="M1.2,2.7 Q4,3.4 6.5,2.5 L6.5,4.4 Q5.6,5.9 3.4,5.8 L0.8,5.5Z" fill="#E6EAF0" stroke="#1F2433" stroke-width=".3"/><path d="M4.2,3.6 l1.6,-.2 M4.2,4.5 l1.6,-.2" stroke="#7A849A" stroke-width=".45"/><path d="M1.2,2.7 Q4,3.4 6.5,2.5" stroke="${C.main}" stroke-width=".7" fill="none"/>`+
    `<path d="M-4.6,-0.9 L1.4,-1" stroke="#1F2433" stroke-width="1"/>`+
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
// the bench palette for the forest: painted bark, lime ferns, and the hillside as a solid cross-section of earth
const BARK="#C98B70",BARK_D="#A0664E",BARK_HI="#EDC0A8",FERN="#8DBF5A",FERN_D="#5E8F3C",TRAIL="#EBCDA6",TRAIL_HI="#FAEBD6",SOIL="#D4A47F",SOIL_D="#A87C5C",STRATA="#BC8C68";
// a slab of ground: profile pts (screen, left to right) → lit top surface running back (up-right) and a front face down to yb
function slab(pts,d,yb,o){o=o||{};const dx=d,dy=-0.55*d,top=o.top||TRAIL,face=o.face||SOIL,edge=o.edge||SOIL_D;let p=pts.map(q=>`${q[0].toFixed(1)},${q[1].toFixed(1)}`),r=pts.slice().reverse().map(q=>`${(q[0]+dx).toFixed(1)},${(q[1]+dy).toFixed(1)}`);
  let g=`<path d="M${p.join(" L")} L${r.join(" L")}Z" fill="${top}" stroke="${edge}" stroke-width="1.2" stroke-linejoin="round"/>`;
  const a=pts[0],b=pts[pts.length-1];g+=`<path d="M${p.join(" L")} L${b[0].toFixed(1)},${yb} L${a[0].toFixed(1)},${yb}Z" fill="${face}" stroke="${edge}" stroke-width="1.4" stroke-linejoin="round"/>`;
  // strata: the layers of the cut, following the profile
  if(o.strata!==false)[[24,.55],[62,.4],[110,.3]].forEach(([k,op])=>g+=`<path d="M${pts.map(q=>`${q[0].toFixed(1)},${(q[1]+k).toFixed(1)}`).join(" L")}" fill="none" stroke="${STRATA}" stroke-width="1.6" opacity="${op}" stroke-dasharray="${k>60?"10 7":"none"}"/>`);
  g+=`<path d="M${p.join(" L")}" fill="none" stroke="${TRAIL_HI}" stroke-width="2" stroke-linejoin="round" opacity=".9"/>`;
  return g}
// a redwood as a painted cylinder standing on the ground
const redwood=(x,yb,rx,yTop)=>FG.cyl(x,yTop,rx,yb-yTop,{colour:BARK,kind:"painted",shadow:false});
// a trail sign: a steel post and a white board
const board=(sx,sy,txt)=>`<line x1="${sx}" y1="${sy}" x2="${sx}" y2="${sy-48}" stroke="${STEEL_D}" stroke-width="3" stroke-linecap="round"/><line x1="${sx-.8}" y1="${sy-2}" x2="${sx-.8}" y2="${sy-46}" stroke="#fff" stroke-width=".9" opacity=".8"/><path d="M${sx+2},${sy-46} h${txt.length*7.6+14} l4,3 v20 h${-(txt.length*7.6+14)}z" fill="${PAL.shadow}" opacity=".12"/><rect x="${sx-2}" y="${sy-66}" width="${txt.length*7.6+14}" height="20" rx="6" fill="#fff" stroke="${PAL.pill.line}"/><text class="t-lab" x="${sx+5}" y="${sy-52}" style="fill:${INK}">${txt}</text>`;
// a label pill like StudyKit.fig.pill, but keeping the label's own case (kg and mm stay lower case)
function pillAs(x,y,t1,t2,ax,ay,end){const fs=10,w=Math.max(String(t1).length*fs*0.66,String(t2).length*fs*0.56)+18,h=fs*2.9,px=end?x-w:x,ex=ax<px?px:ax>px+w?px+w:ax;
  return `<path d="M${ax.toFixed(1)},${ay.toFixed(1)} L${ex.toFixed(1)},${(y+h/2).toFixed(1)}" fill="none" stroke="${PAL.pill.ink}" stroke-width="1.1" opacity=".7"/><circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="2.6" fill="${PAL.pill.ink}" stroke="#fff" stroke-width=".8"/><path d="M${px+5},${y+h} h${w} l5,4 h${-w}z" fill="${PAL.shadow}" opacity=".08"/><rect x="${px.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${h}" rx="${(h/2.6).toFixed(1)}" fill="#fff" stroke="${PAL.pill.line}"/><text x="${(px+9).toFixed(1)}" y="${y+fs*1.32}" style="font:700 ${fs}px var(--as-font,'Instrument Sans',sans-serif);letter-spacing:.06em;fill:${PAL.pill.ink}">${t1}</text><text x="${(px+9).toFixed(1)}" y="${y+fs*2.45}" style="font:500 ${fs*0.95}px var(--as-font,'Instrument Sans',sans-serif);fill:#6E6A86">${t2}</text>`}
// an info card: white with a navy floor shadow
const infoCard=(x,y,w,h,stroke)=>`<rect x="${x+6}" y="${y+8}" width="${w}" height="${h}" rx="12" fill="${PAL.shadow}" opacity=".1"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="#fff" stroke="${stroke||PAL.pill.line}" stroke-width="${stroke?2:1}"/>`;

// ---------- the trail scene
const TRACKSTEPS=["drop","graph","forces","energy","jump"];
function drawTrail(st){
  const W=800,Hh=420,SC=20,cx=s.x,cy=s.air?s.y:trackY(s.x),RX=290,RY=262,X=x=>RX+(x-cx)*SC,Y=y=>RY-(y-cy)*SC,D=26;
  let o=DEFS+FG.floor(W,Hh);
  // far redwoods: pale painted trunks (slow parallax)
  const lay=(p,sp,w0,w1,col,op,seed,yb)=>{let r="";const off=cx*SC*p;for(let k=Math.floor((off-120)/sp);k<=Math.floor((off+W+120)/sp);k++){const sx=k*sp+rnd(seed+k)*sp*0.7-off,w=w0+rnd(seed+k*7)*(w1-w0),b=yb+rnd(k+seed)*20;r+=`<rect x="${(sx-w/2).toFixed(1)}" y="-10" width="${w.toFixed(1)}" height="${(b+10).toFixed(1)}" fill="${col}"/><rect x="${(sx-w*0.3).toFixed(1)}" y="-10" width="${(w*0.14).toFixed(1)}" height="${(b+10).toFixed(1)}" fill="#fff" opacity=".35"/>`}return `<g opacity="${op}">${r}</g>`};
  o+=lay(0.25,70,14,24,"#EBD3C6",0.55,23,320);
  // mid layer: redwoods with ponga at their feet on a soft lime bank
  {const p=0.5,sp=95,off=cx*SC*p;for(let k=Math.floor((off-150)/sp);k<=Math.floor((off+W+150)/sp);k++){const sx=k*sp+rnd(k*3+5)*60-off,w=22+rnd(k+41)*20;o+=`<rect x="${(sx-w/2).toFixed(1)}" y="-10" width="${w.toFixed(1)}" height="348" fill="#E7C2AE"/><rect x="${(sx+w*0.18).toFixed(1)}" y="-10" width="${(w*0.32).toFixed(1)}" height="348" fill="#DBB09B"/><rect x="${(sx-w*0.34).toFixed(1)}" y="-10" width="${(w*0.12).toFixed(1)}" height="348" fill="#fff" opacity=".4"/>`}
    o+=`<path d="M0,${Hh} L0,330 ${Array.from({length:17},(_,i)=>`Q${i*50+25},${314+rnd(Math.floor(off/50)+i)*10} ${i*50+50},${330}`).join(" ")} L${W},${Hh}Z" fill="#CFE4B0" stroke="#A9C985"/>`;
    for(let k=Math.floor((off-100)/130);k<=Math.floor((off+W+100)/130);k++){const sx=k*130+rnd(k*5+2)*80-off;o+=ponga(sx,336,70+rnd(k)*40,"#9CC46E",k)}}
  // near redwoods: painted cylinders standing at the back of the trail (they move with it)
  for(let k=Math.floor((cx-18)/9);k<=Math.floor((cx+30)/9);k++){const xt=k*9+rnd(k*3)*5;const w=30+rnd(k)*22,yb=Y(trackY(xt))-D*0.55*0.6;if(xt>LIP-3&&xt<GAP_END+3)continue;o+=redwood(X(xt)+D*0.6,yb,w/2,-14)}
  // the berm: a banked wall of dirt behind the trail
  const x0=cx-16,x1=Math.min(TRAIL_END,cx+27);
  if(SBERM.x1>x0&&SBERM.x0<x1){let bp=`M${X(SBERM.x0-2)},${Y(trackY(SBERM.x0-2))}`;for(let q=SBERM.x0-2;q<=SBERM.x1+2;q+=0.5){const t=(q-SBERM.x0+2)/(SBERM.x1-SBERM.x0+4);bp+=` L${X(q)},${Y(trackY(q)+Math.sin(t*Math.PI)*2.4)}`}bp+=` L${X(SBERM.x1+2)},${Y(trackY(SBERM.x1+2))}Z`;
    o+=`<path d="${bp}" fill="${TRAIL}" stroke="${SOIL_D}" stroke-width="1.4"/>`;for(let q=SBERM.x0+1;q<SBERM.x1;q+=3)o+=`<path d="M${X(q)},${Y(trackY(q)+0.5)} q${SC*1.2},-${SC*0.9} ${SC*2.4},-${SC*0.4}" stroke="${TRAIL_HI}" stroke-width="1.6" fill="none" opacity=".9"/>`}
  // the hillside: a solid cut of earth with the trail as its lit top surface
  const pts=[];if(x0<0)pts.push([X(x0),Y(TOP)],[X(0),Y(TOP)]);
  SEG.forEach(sg=>{if(sg.x1<x0||sg.x0>x1)return;const a=Math.max(x0,sg.x0),b=Math.min(x1,sg.x1);pts.push([X(a),Y(trackY(a))],[X(b-0.001),Y(sg.y0+(sg.y1-sg.y0)*(b-sg.x0)/(sg.x1-sg.x0))])});
  pts.push([X(x1),pts[pts.length-1][1]]);
  o+=slab(pts,D,Hh+10);
  // root garden: roots across the trail
  SEG.filter(sg=>sg.n==="Root garden"&&sg.x1>x0&&sg.x0<x1).forEach(sg=>{for(let q=sg.x0+1;q<sg.x1;q+=1.8)o+=`<path d="M${X(q)},${Y(trackY(q))+2} q${6+rnd(q)*4},-${5+rnd(q*3)*3} ${14+rnd(q*7)*6},1" stroke="#A8775A" stroke-width="3.2" fill="none" stroke-linecap="round"/><path d="M${X(q)+2},${Y(trackY(q))} q6,-4 11,-1" stroke="#E2B796" stroke-width="1" fill="none" opacity=".9"/>`});
  // wooden roller: a timber deck over a hump, on posts
  if(SROLL[0].x0<x1&&SROLL[1].x1>x0){const a=SROLL[0].x0-0.6,b=SROLL[1].x1+0.6;let d=`M${X(a)},${Y(trackY(a))}`;const pts2=[];for(let q=a;q<=b+0.01;q+=0.25){pts2.push([X(q),Y(trackY(q))]);d+=` L${X(q)},${Y(trackY(q))}`}
    for(let q=a+0.5;q<b;q+=2.2)o+=`<rect x="${X(q)-2}" y="${Y(trackY(q))+6}" width="4" height="22" fill="#B98A5E" stroke="#8C6440" stroke-width=".8"/>`;
    o+=`<path d="${d}" stroke="#8C6440" stroke-width="10" fill="none" stroke-linejoin="round" transform="translate(0,4)"/><path d="${d}" stroke="#D9AE7C" stroke-width="6" fill="none" stroke-linejoin="round"/><path d="${d}" stroke="#F2D3AA" stroke-width="1.4" fill="none" stroke-linejoin="round" transform="translate(0,-2)"/>`;
    let pl="";for(let i=0;i<pts2.length;i+=2)pl+=`M${pts2[i][0]},${pts2[i][1]-3} l0,6`;o+=`<path d="${pl}" stroke="#A47A50" stroke-width="1"/>`}
  // the gap jump: a built lip with a wooden face, and the landing
  if(LIP>x0-2&&LIP<x1+2){const lx=X(LIP),ly=Y(SLIP.y1),fy=Y(SGAP.y0);o+=`<path d="M${X(SLIP.x0)},${Y(SLIP.y0)} L${lx},${ly}" stroke="#D9AE7C" stroke-width="5" stroke-linecap="round"/><path d="M${lx},${ly} L${lx},${fy}" stroke="#B98A5E" stroke-width="5"/>`;
    for(let k=0;k<3;k++)o+=`<path d="M${lx-2},${ly+8+k*12} l0,6" stroke="#fff" stroke-width="3"/>`}
  // ferns along the trail edge
  for(let k=Math.floor(x0/2.3);k<x1/2.3;k++){const fx=k*2.3+rnd(k)*1.2;if(fx>LIP-1.5&&fx<GAP_END+1.5)continue;if(fx>SROLL[0].x0-1&&fx<SROLL[1].x1+1)continue;o+=fern(X(fx),Y(trackY(fx))+5,10+rnd(k+1)*14,rnd(k*3)>0.5?FERN:FERN_D,k)}
  // signs: start, jump, distance markers, finish
  const sign=(x,txt)=>{if(x<x0-2||x>x1+2)return"";return board(X(x),Y(trackY(x)),txt)};
  o+=sign(4,"START")+sign(LIP-7,"GAP JUMP")+sign(SROLL[0].x0-3,"ROLLER")+sign(100,"100 m")+sign(200,"200 m");
  if(FINISH>x0-3&&FINISH<x1+3){const fx=X(FINISH),fy=Y(trackY(FINISH));o+=`<line x1="${fx}" y1="${fy}" x2="${fx}" y2="${fy-96}" stroke="${STEEL_D}" stroke-width="3.4" stroke-linecap="round"/><line x1="${fx-.9}" y1="${fy-2}" x2="${fx-.9}" y2="${fy-94}" stroke="#fff" stroke-width="1" opacity=".8"/>`;for(let i=0;i<8;i++)for(let j=0;j<2;j++)o+=`<rect x="${fx+i*7}" y="${fy-96+j*7}" width="7" height="7" fill="${(i+j)%2?"#fff":INK}"/>`;o+=`<rect x="${fx}" y="${fy-96}" width="56" height="14" fill="none" stroke="${INK}" stroke-width=".8"/><text class="t-lab" x="${fx+4}" y="${fy-70}" style="fill:${INK}">FINISH</text>`}
  // jump arc of the last jump
  if(st.k==="jump"&&s.airPath.length>1)o+=`<polyline points="${s.airPath.map(p=>`${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(" ")}" fill="none" stroke="${GOLD}" stroke-width="2.5" stroke-dasharray="5 4"/>`;
  // dust behind the rider
  s.dust.forEach(p=>o+=`<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="${(p.r*SC).toFixed(1)}" fill="#E8CBA6" opacity="${(p.life*0.7).toFixed(2)}"/>`);
  // rider and bike, with a navy shadow on the trail
  const ang=s.air?Math.atan2(s.air.vy,s.air.vx):Math.atan(slope(s.x)),deg=-ang*180/Math.PI,bx=X(s.x),by=Y(s.y),SCB=1.35;
  o+=`<ellipse cx="${bx+10}" cy="${Y(trackY(s.x))+1}" rx="${44}" ry="4.5" fill="${PAL.shadow}" opacity="${s.air?0.1:0.24}"/>`;
  o+=`<g transform="translate(${bx},${by}) rotate(${deg.toFixed(2)}) scale(${SCB})">${bikeSVG({b:s.b,spin:s.dist/0.37,comp:Math.max(0,s.fc),rider:true,pose:s.attack?0:1,crouch:Math.max(0,s.fc)*1.2,tag:s.tagA,heat:rotorT(),light:s.b.pod,detail:true})}</g>`;
  // speed lines
  if(s.v>8)for(let i=0;i<4;i++){const yy=by-26-i*13,L=(s.v-6)*3.2;o+=`<line x1="${bx-50-i*6}" y1="${yy}" x2="${bx-50-i*6-L}" y2="${yy+L*Math.tan(ang)}" stroke="${AXIS}" stroke-width="2" stroke-linecap="round" opacity=".5"/>`}
  // forces on the rider
  if(st.k==="forces"&&!s.air){const F=forces(s.x,s.v),th=F.th,c=Math.cos(th),sn=Math.sin(th),K=0.07,cx0=bx+Math.sin(th)*44,cy0=by-Math.cos(th)*44;
    const Wt=M()*g,N=Wt*c,Res=M()*(F.roll+F.air),B=s.brakeN;const tx=c,ty=-sn,nx=-sn,ny=-c;
    // centre of mass and the line of the weight: it must land between the tyres or you tip
    const com=s.attack?[-3,-32]:[-2,-41],gx=bx+(com[0]*c-com[1]*-sn)*SCB,gy=by+(com[0]*-sn+com[1]*c)*SCB,rearX=bx+(-25.5*c)*SCB,frontX=bx+(27*c)*SCB;
    o+=`<line x1="${gx}" y1="${gy}" x2="${gx}" y2="${Y(trackY(s.x+(gx-bx)/SC))}" stroke="var(--earth)" stroke-width="1.5" stroke-dasharray="3 3"/><circle cx="${gx}" cy="${gy}" r="6" fill="#fff" stroke="var(--ink)" stroke-width="1.5"/><path d="M${gx-6},${gy} A6,6 0 0,1 ${gx},${gy-6} L${gx},${gy}Z M${gx+6},${gy} A6,6 0 0,1 ${gx},${gy+6} L${gx},${gy}Z" fill="var(--ink)"/>`;
    o+=FG.pill(gx-14,gy-30,"Centre of mass",{anchor:"end",ax:gx-5,ay:gy-4,size:9});
    o+=arrow(cx0,cy0,cx0,cy0+Wt*K,"var(--earth)",3.5);
    o+=arrow(cx0,cy0,cx0+nx*N*K,cy0+ny*N*K,"var(--good)",3.5);
    o+=arrow(cx0-12,cy0+10,cx0-12-tx*Res*K*2.2,cy0+10-ty*Res*K*2.2,"var(--hot)",3);
    if(B>5)o+=arrow(cx0-12,cy0-10,cx0-12-tx*B*K,cy0-10-ty*B*K,"var(--warn)",3)}
  // foreground ferns rushing past (fast parallax)
  {const p=1.5,sp=170,off=cx*SC*p;for(let k=Math.floor((off-200)/sp);k<=Math.floor((off+W+200)/sp);k++){const sx=k*sp+rnd(k*11)*90-off;o+=fern(sx,Hh+20,50+rnd(k*7)*40,FERN_D,k*3,0.4)}}
  // helmet-cam inset
  o+=gopro(W);
  const seg=segAt(s.x);
  o+=infoCard(12,12,262,46)+`<text class="t-lab" x="22" y="30">${s.finished?"FINISHED":seg.n.toUpperCase()} · ${fmt(s.dist)} m</text><text class="t-ink" x="22" y="49" style="font-size:15px;font-weight:600">${fmt(s.t,1)} s · ${fmt(s.v*3.6)} km/h</text>`;
  if(s.crash)o+=infoCard(150,160,500,64,"var(--hot)")+`<text class="t-ink" x="400" y="186" text-anchor="middle" style="font-weight:600">${s.crash.split(". ")[0]}.</text><text class="t-lab" x="400" y="208" text-anchor="middle">${(s.crash.split(". ")[1]||"").toUpperCase()} · PRESS RESTART</text>`;
  if(s.finished&&!s.playing&&s.lastRun)o+=infoCard(190,146,420,86,INK)+`<text class="t-ink" x="400" y="176" text-anchor="middle" style="font-size:18px;font-weight:600">${fmt(s.lastRun.time,1)} s</text><text class="t-lab" x="400" y="198" text-anchor="middle">AVERAGE SPEED ${fmt(s.lastRun.avg,1)} m/s = ${fmt(s.lastRun.avg*3.6)} km/h</text><text class="t-lab" x="400" y="216" text-anchor="middle">${s.lastRun.cleared?"GAP CLEARED":"GAP NOT CLEARED"} · ${esc(s.lastRun.build.toUpperCase())}</text>`;
  return o}
// a first-person "helmet cam": the trail rushing towards you, redwoods streaming past, your bars at the bottom; a screen in a frosted peach case
function gopro(W){const x0=W-236,y0=12,w=224,h=132,cx=x0+w/2,hz=y0+h*0.4;const tilt=s.air?0:Math.atan(slope(s.x))*60,C=CL();
  let o=FG.acrylic(x0-7,y0-6,w+14,h+13,{tint:PEACH,d:9,r:16,opacity:.6,balls:false,shadowLen:24});
  o+=`<clipPath id="bkCam"><rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="12"/></clipPath><g clip-path="url(#bkCam)"><rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="#CFE4B0"/>`;
  o+=`<g transform="rotate(${tilt*0.25},${cx},${hz})"><rect x="${x0-40}" y="${y0-40}" width="${w+80}" height="${hz-y0+40}" fill="${PAL.paper}"/><rect x="${x0-40}" y="${hz}" width="${w+80}" height="${h}" fill="#BCD99A"/>`;
  o+=`<path d="M${cx-5},${hz} L${cx+5},${hz} L${cx+96},${y0+h+20} L${cx-96},${y0+h+20}Z" fill="${TRAIL}"/><path d="M${cx-5},${hz} L${cx-96},${y0+h+20} M${cx+5},${hz} L${cx+96},${y0+h+20}" stroke="${SOIL_D}" stroke-width="2"/>`;
  const items=[];for(let i=0;i<12;i++){const z=((i*3.6-s.dist)%43+43)%43+1.2;items.push([z,i])}items.sort((a,b)=>b[0]-a[0]);
  items.forEach(([z,i])=>{const side=i%2?1:-1,sx=cx+side*(12+300/z),th=Math.min(260,1500/z),tw=Math.max(2,90/z),fade=Math.min(1,0.3+3/z);
    o+=`<path d="M${sx-tw*0.4},${hz-th*0.85} L${sx+tw*0.4},${hz-th*0.85} L${sx+tw*0.6},${hz+th*0.12} L${sx-tw*0.6},${hz+th*0.12}Z" fill="${BARK}" opacity="${fade}"/>`;
    if(i%3===0)o+=`<ellipse cx="${cx+side*(8+170/z)}" cy="${hz+th*0.1}" rx="${Math.max(2,60/z)}" ry="${Math.max(1,24/z)}" fill="${FERN}" opacity="${fade}"/>`});
  for(let i=0;i<6;i++){const z=((i*7-s.dist)%42+42)%42+1;const yy=hz+(h*0.58)*(1.2/z)*3;o+=`<line x1="${cx-40/z*6}" y1="${yy}" x2="${cx+40/z*6}" y2="${yy}" stroke="${SOIL_D}" stroke-width="${Math.max(0.6,6/z)}"/>`}
  if(s.b.pod)o+=`<path d="M${cx},${y0+h} L${cx-70},${hz+8} L${cx+70},${hz+8}Z" fill="#FFF3C4" opacity=".3"/>`;
  o+=`</g>`;
  // your handlebars and the back of the plate
  o+=`<path d="M${x0-10},${y0+h-6} Q${cx},${y0+h-22} ${x0+w+10},${y0+h-6}" stroke="${RUB}" stroke-width="7" fill="none"/><path d="M${x0-10},${y0+h-9} Q${cx},${y0+h-25} ${x0+w+10},${y0+h-9}" stroke="${RUB_HI}" stroke-width="1.4" fill="none"/><rect x="${cx-9}" y="${y0+h-24}" width="18" height="14" rx="3" fill="${RUB_D}"/>`;
  if(s.b.plate)o+=`<path d="M${cx-22},${y0+h-32} Q${cx},${y0+h-40} ${cx+22},${y0+h-32} L${cx+18},${y0+h-14} L${cx-18},${y0+h-14}Z" fill="${C.main}" opacity=".95"/>`;
  o+=`<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="12" fill="none" stroke="${PEACH_D}" stroke-width="2.4"/>`;
  o+=`<rect x="${x0+8}" y="${y0+7}" width="123" height="18" rx="9" fill="#fff" fill-opacity=".85"/><circle cx="${x0+18}" cy="${y0+16}" r="4.5" fill="#E0463A" opacity="${(Math.floor(s.t*2)%2)?1:0.25}"/><text x="${x0+27}" y="${y0+20}" fill="${INK}" style="font:600 10.5px var(--mono)">REC · HELMET CAM</text>`;
  o+=`<rect x="${x0+w-90}" y="${y0+7}" width="84" height="34" rx="10" fill="#fff" fill-opacity=".85"/><text x="${x0+w-12}" y="${y0+34}" fill="${INK}" text-anchor="end" style="font:600 22px var(--mono)">${fmt(s.v*3.6)}<tspan style="font-size:11px"> km/h</tspan></text></g>`;
  return o}
// ---------- the garage
function drawGarage(){const W=800,Hh=420,fl=352,Md=MD(),C=CL(),Wh=WH(),Br=BR();
  // the workshop: a frosted peach case on the paper, with a painted floor slab the bike stands on
  let o=DEFS+FG.floor(W,Hh)+FG.shadow(18,fl+16,770,{len:44,opacity:.14});
  o+=FG.acrylic(18,14,752,fl-14,{tint:PEACH,d:16,r:18,opacity:.42,shadow:false});
  o+=FG.box(10,fl,768,16,{colour:"#F3DCC8",kind:"painted",d:16,r:3,shadow:false});
  // a window onto the redwoods: a frosted sky panel with painted trees
  o+=`<rect x="30" y="34" width="170" height="168" rx="10" fill="${PAL.case.sky}" fill-opacity=".55" stroke="${FG.deep(PAL.case.sky)}" stroke-width="1.2"/>`;
  for(let k=0;k<5;k++){const tx=44+k*34+rnd(k)*10,tw=10+rnd(k+4)*14;o+=`<rect x="${(tx-tw/2).toFixed(1)}" y="34" width="${tw.toFixed(1)}" height="168" fill="${BARK}" opacity=".75"/><rect x="${(tx-tw*0.3).toFixed(1)}" y="34" width="${(tw*0.16).toFixed(1)}" height="168" fill="#fff" opacity=".4"/>`}
  o+=ponga(64,202,46,FERN_D,3)+ponga(160,202,54,FERN_D,7);
  o+=`<path d="M115,34 V202 M30,118 H200" stroke="#fff" stroke-width="6"/><rect x="30" y="34" width="170" height="168" rx="10" fill="none" stroke="#fff" stroke-width="7"/><path d="M42,46 l40,0" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`+FG.box(22,202,186,8,{colour:"#FFFFFF",kind:"plastic",d:8,r:2,shadow:false,sw:1});
  // the parts board: mint plastic with peg holes, a spare wheel, bars, and three tins of frame paint
  o+=FG.box(590,24,190,128,{colour:PAL.mintPlastic,kind:"plastic",d:10,r:8,shadow:false});let peg="";for(let i=0;i<12;i++)for(let j=0;j<8;j++)peg+=`M${600+i*15.5},${34+j*15.5}h.01`;o+=`<path d="${peg}" stroke="${FG.deep(PAL.mintPlastic)}" stroke-width="3" stroke-linecap="round" opacity=".55"/>`;
  o+=`<g transform="translate(636,86) scale(1.45)">${wheel([0,0],0.3,WHEELS.mud,4.6,0,-2.2,false)}</g><path d="M690,52 q20,-14 40,0 M690,82 q24,-12 48,0" stroke="${RUB}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M692,50 q18,-12 36,0" stroke="${RUB_HI}" stroke-width="1" fill="none"/>`;
  [[703,COLOURS.red.main],[727,CREAM],[751,COLOURS.teal.main]].forEach(([x,c])=>o+=FG.cyl(x,108,9,22,{colour:c,kind:"painted",shadow:false}));
  // the model name and its colours
  o+=`<text x="232" y="66" style="font:700 40px var(--display);letter-spacing:.2em" fill="${INK}">${Md.n}</text>`;
  o+=FG.box(234,78,34,9,{colour:C.main,kind:"painted",d:5,r:2,shadow:false,sw:1})+FG.box(272,78,34,9,{colour:CREAM,kind:"painted",d:5,r:2,shadow:false,sw:1})+`<text class="t-lab" x="316" y="87" style="fill:${SUB};letter-spacing:.12em">${Md.kind.toUpperCase()}</text>`;
  if(innerWidth>560)o+=`<text class="t-body" x="234" y="110" style="fill:${SUB}">${esc(Md.line)}</text>`;
  // a steel workstand + the bike, its long navy shadow on the floor
  const narrow=innerWidth<=560,bxx=narrow?420:450,SCL=narrow?5.3:4.4;
  o+=FG.shadow(bxx-44*SCL,fl,90*SCL,{len:70,h:5,opacity:.2});
  o+=`<path d="M${bxx-30},${fl} L${bxx-7},${fl-50} L${bxx+7},${fl-50} L${bxx+30},${fl}" stroke="${STEEL_D}" stroke-width="6.5" fill="none" stroke-linejoin="round"/><path d="M${bxx-30},${fl} L${bxx-7},${fl-50} L${bxx+7},${fl-50} L${bxx+30},${fl}" stroke="${STEEL}" stroke-width="3.6" fill="none" stroke-linejoin="round"/><path d="M${bxx-27},${fl-3} L${bxx-6},${fl-48}" stroke="#fff" stroke-width="1.2" opacity=".8"/>`+FG.box(bxx-36,fl-5,72,5,{colour:STEEL,kind:"metal",d:6,r:2,shadow:false,sw:1});
  o+=`<g transform="translate(${bxx},${fl}) scale(${SCL})">${bikeSVG({b:s.b,spin:s.gspin,comp:0.08,rider:false,tag:Math.sin(s.gspin*0.9)*6,heat:0,light:s.b.pod,detail:true})}</g>`;
  // callouts: label pills with leaders; the spec card below has every number
  if(narrow)return o;
  const G=geoPts(s.b,0),at=p=>[bxx+p[0]*SCL,fl+(p[1]-2)*SCL];
  const call=(p,tx,ty,l1,l2,end)=>{const q=at(p);return pillAs(tx,ty-13,l1,l2,q[0],q[1],end)};
  o+=call(add(G.FA,G.u,13),664,246,`${Md.fork==="dual"?"DUAL":"SINGLE"} CROWN`,`${fmt(Md.travel*1000)} mm · k ${s.k}`);
  o+=call(add(G.FA,[11,9]),664,322,Wh.n.toUpperCase(),`μ ${fmt(Wh.mu.dry,2)} DRY`);
  o+=call(G.GR,664,178,`${Br.n.toUpperCase()}`,`${Br.w} mm BARS`);
  o+=call(add(G.RA,[0,-4.2]),226,256,`${Md.rotor} mm ROTORS`,`${fmt(Md.rmass*1000)} g A PAIR`,true);
  o+=call(add(G.BB,[-5,-9]),226,322,`BIKE ${fmt(bikeMass(),1)} kg`,`RIDER ${s.m} kg`,true);
  return o}
function drawStop(){const W=800,SC=18,X=x=>110+x*SC,gy=300;const N=stopNums();
  let o=DEFS+FG.floor(W,420);
  // the forest behind: pale far trunks, then painted redwoods and ponga standing at the back of the run-out
  for(let k=0;k<12;k++){const sx=k*72+rnd(k)*30,w=12+rnd(k+2)*12;o+=`<rect x="${(sx-w/2).toFixed(1)}" y="-10" width="${w.toFixed(1)}" height="${gy-20}" fill="#EBD3C6" opacity=".6"/>`}
  for(let k=0;k<9;k++)o+=ponga(30+k*95+rnd(k)*40,gy-12,50+rnd(k+1)*30,"#9CC46E",k);
  for(let k=0;k<8;k++){const sx=k*112+rnd(k+9)*50,w=26+rnd(k+3)*20;o+=redwood(sx+12,gy-8,w/2,-14)}
  // the flat run-out: a slab of earth, the trail its lit top
  o+=slab([[-20,gy],[W+20,gy]],22,gy+24,{strata:false,top:s.grip==="roots"?"#D0AE8C":TRAIL});
  if(s.grip==="roots")for(let q=0;q<40;q+=2.4)o+=`<path d="M${X(q)},${gy-3} q8,-5 18,0" stroke="#A8775A" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M${X(q)+3},${gy-5} q6,-3 11,0" stroke="#FFFFFF" stroke-width="1" fill="none" opacity=".8"/>`;
  if(s.grip==="mud")for(let q=0;q<40;q+=1.5)o+=`<ellipse cx="${X(q)+rnd(q)*10+6}" cy="${gy-5}" rx="${6+rnd(q*3)*8}" ry="2.4" fill="#A47A5C" opacity=".8"/>`;
  for(let m=0;m<=35;m+=5)o+=`<line x1="${X(m)}" x2="${X(m)}" y1="${gy+6}" y2="${gy+14}" stroke="${SOIL_D}" stroke-width="1.4"/><text class="t-lab" x="${X(m)}" y="${gy+38}" text-anchor="middle" style="fill:${INK}">${m} m</text>`;
  // the fallen log: a wooden cylinder lying across the trail
  {const lx=X(LOGX)-20,ly=gy-12,wd=FG.mat("wood","#C9A072");o+=FG.shadow(lx,gy,60,{len:30,h:3,opacity:.18})+`<path d="M${lx},${ly-12} h56 a6,12 0 0 1 0,24 h-56z" fill="${wd.fill}" stroke="${wd.stroke}" stroke-width="1.2"/><path d="M${lx+4},${ly-8} h48" stroke="${wd.hi}" stroke-width="2.4" stroke-linecap="round"/><path d="M${lx+6},${ly+4} q20,3 46,0" stroke="${wd.stroke}" stroke-width="1" fill="none" opacity=".6"/><ellipse cx="${lx}" cy="${ly}" rx="6" ry="12" fill="#EBCB9F" stroke="${wd.stroke}" stroke-width="1.2"/><ellipse cx="${lx}" cy="${ly}" rx="3" ry="6.5" fill="none" stroke="${wd.stroke}" stroke-width="1"/>`}
  // planned distances: two painted bars on the paper
  o+=FG.box(X(0),gy+46,N.think*SC,14,{colour:PAL.product.butter,kind:"painted",d:6,shadow:false,sw:1})+FG.box(X(N.think),gy+46,N.brake*SC,14,{colour:PAL.product.strawberry,kind:"painted",d:6,shadowLen:24,sw:1});
  o+=`<text class="t-lab" x="${X(0)}" y="${gy+78}" style="fill:${INK}">THINKING ${fmt(N.think,1)} m</text><text class="t-lab" x="${X(N.think)+4}" y="${gy+96}" style="fill:${INK}">BRAKING ${fmt(N.brake,1)} m</text>`;
  s.sdust.forEach(p=>o+=`<circle cx="${X(p.x).toFixed(1)}" cy="${(gy-p.y*SC).toFixed(1)}" r="${(p.r*SC).toFixed(1)}" fill="#E8CBA6" opacity="${(p.life*0.7).toFixed(2)}"/>`);
  const bx=X(s.sx),braking=s.sphase==="brake";o+=`<ellipse cx="${bx+10}" cy="${gy+1}" rx="48" ry="4" fill="${PAL.shadow}" opacity=".22"/><g transform="translate(${bx},${gy}) rotate(${braking?1.5:0}) scale(1.45)">${bikeSVG({b:s.b,spin:s.sx/0.37,comp:braking?0.45:0.05,rider:true,pose:0,crouch:braking?0.4:0,tag:braking?24:0,heat:0,light:s.b.pod,detail:true})}</g>`;
  if(s.sphase==="see"||s.sphase==="ready")o+=`<text class="t-ink" x="${bx+10}" y="${gy-120}" style="font-weight:600;paint-order:stroke;stroke:${PAL.paper};stroke-width:3px">${s.sphase==="ready"?"Press play":"Log! (reacting…)"}</text>`;
  if(braking)o+=`<text class="t-ink" x="${bx+10}" y="${gy-120}" style="font-weight:600;paint-order:stroke;stroke:${PAL.paper};stroke-width:3px">Brakes on</text>`;
  const hit=N.total>LOGX;
  if(s.sphase==="stopped")o+=infoCard(200,40,400,60,hit?"var(--hot)":"var(--good)")+`<text class="t-ink" x="400" y="66" text-anchor="middle" style="font-weight:600">${hit?"Hit the log":"Stopped in time"}: ${fmt(N.total,1)} m</text><text class="t-lab" x="400" y="86" text-anchor="middle">${fmt(s.v0)} KM/H · ${fmt(s.tr,1)} s REACTION · ${SURF[s.grip].toUpperCase()} · ${WH().n.toUpperCase()}</text>`;
  return o}
function drawFork(){const W=800,gy=340,N=forkNums(),PX=90,T=N.T;
  let o=DEFS+FG.floor(W,420);
  for(let k=0;k<7;k++){const sx=60+k*120+rnd(k)*40,w=24+rnd(k+3)*16;o+=`<rect x="${(sx-w/2).toFixed(1)}" y="-10" width="${w.toFixed(1)}" height="${gy}" fill="#EBD3C6" opacity=".7"/><rect x="${(sx-w*0.3).toFixed(1)}" y="-10" width="${(w*0.14).toFixed(1)}" height="${gy}" fill="#fff" opacity=".4"/>`}
  // the ground: a slab of earth
  o+=slab([[-20,gy],[W+20,gy]],18,gy+30,{strata:false});
  // the ledge you roll off: a solid block of earth with a lit top
  const lt=gy-s.fh*PX;o+=FG.shadow(0,gy,418,{len:26,h:3,opacity:.16})+FG.box(-20,lt,438,gy-lt,{colour:SOIL,kind:"painted",d:16,r:0,shadow:false,stroke:SOIL_D})+`<path d="M-20,${lt+1} H418" stroke="${TRAIL_HI}" stroke-width="2"/>`+(gy-lt>40?`<path d="M-20,${lt+26} H418" stroke="${STRATA}" stroke-width="1.6" opacity=".5"/>`:"")+fern(60,lt+2,24,FERN,3)+fern(150,lt+2,20,FERN,8)+fern(300,lt+2,22,FERN_D,5);
  o+=`<line x1="436" x2="436" y1="${gy}" y2="${lt}" stroke="${INK}"/><path d="M430,${gy} h12 M430,${lt} h12" stroke="${INK}"/><text class="t-ink" x="428" y="${(gy+lt)/2}" text-anchor="end" style="font-weight:600;paint-order:stroke;stroke:#fff;stroke-width:3px;fill:${INK}">${fmt(s.fh,1)} m</text>`;
  const comp=Math.min(T,s.fx)/T, y=gy-s.fy*PX;
  o+=`<ellipse cx="572" cy="${gy+1}" rx="${64}" ry="5" fill="${PAL.shadow}" opacity="${0.1+0.14*(1-s.fy/Math.max(0.3,s.fh))}"/><g transform="translate(560,${y}) scale(2.2)">${bikeSVG({b:s.b,spin:0,comp,rider:true,pose:0,crouch:comp*1.4,tag:s.fphase==="squash"?-20*comp:0,heat:0,light:s.b.pod,detail:true})}</g>`;
  // travel gauge: a frosted tube filled to the fork's compression
  const gx=716,gt=120,gh=200,f=Math.min(1,s.fx/T),fm=Math.min(1,s.fmax/T);o+=FG.tube(gx,gt,34,gh,f,{tint:PEACH,fill:s.fmax>=T-0.001?PAL.product.strawberry:PAL.product.butter,shadowLen:30});
  o+=`<line x1="${gx-6}" x2="${gx+40}" y1="${gt+gh-fm*gh}" y2="${gt+gh-fm*gh}" stroke="${INK}" stroke-dasharray="3 2"/><text class="t-lab" x="${gx+17}" y="${gt-14}" text-anchor="middle">TRAVEL</text><text class="t-ink" x="${gx+17}" y="${gt+gh+26}" text-anchor="middle">${fmt(s.fx*1000)} mm</text><text class="t-lab" x="${gx-4}" y="${gt+6}" text-anchor="end">${fmt(T*1000)}</text><text class="t-lab" x="${gx-4}" y="${gt+gh}" text-anchor="end">0</text>`;
  if(s.fmax>=T-0.001)o+=`<text class="t-ink" x="${gx+17}" y="${gt-30}" text-anchor="middle" style="font-weight:600;fill:var(--hot)">Bottomed out!</text>`;
  o+=infoCard(10,12,560,40)+`<text class="t-lab" x="20" y="28">${MD().n} · ${MD().fork==="dual"?"DUAL":"SINGLE"}-CROWN ${fmt(T*1000)} mm · k ${s.k} N/mm · ${fmt(M(),1)} kg</text><text class="t-lab" x="20" y="44">FRONT CARRIES ABOUT 45% · HERE THE SPRING ALSO STANDS IN FOR YOUR LEGS</text>`;
  return o}

// ---------- close-up panels
function axes(w,h,xl,yl){return FG.acrylic(40,22,w-48,h-54,{tint:PEACH,d:6,r:12,opacity:.2,balls:false,shadowLen:16})+`<line x1="46" y1="${h-34}" x2="${w-12}" y2="${h-34}" stroke="${AXIS}" stroke-width="1.4"/><line x1="46" y1="14" x2="46" y2="${h-34}" stroke="${AXIS}" stroke-width="1.4"/><text class="t-lab" x="${w-12}" y="${h-3}" text-anchor="end">${xl}</text><text class="t-lab" x="52" y="12">${yl}</text>`}
function graph(key){const w=420,h=260,S=s.samples,GS=s.ghost&&key==="v"?s.ghost.samples:[],T=Math.max(10,(s.lastRun?s.lastRun.time:30)+4,S.length?S[S.length-1].t:0,GS.length?GS[GS.length-1].t:0);
  const ymax=key==="d"?Math.max(50,Math.ceil((S.length?S[S.length-1].d:0)/50)*50,300):Math.max(10,Math.ceil(Math.max(...S.map(p=>p.v),...GS.map(p=>p.v),5)/5)*5);
  const X=t=>46+t/T*(w-60),Y=v=>h-34-v/ymax*(h-62);let o=axes(w,h,"TIME (s)",key==="d"?"DISTANCE (m)":"SPEED (m/s)");
  for(let t=0;t<=T;t+=5)o+=`<text class="t-lab" x="${X(t)}" y="${h-20}" text-anchor="middle">${t}</text>`;
  for(let k=0;k<=ymax;k+=ymax/5)o+=`<line x1="46" x2="${w-12}" y1="${Y(k)}" y2="${Y(k)}" stroke="${AXIS}" stroke-opacity=".3"/><text class="t-lab" x="40" y="${Y(k)+3}" text-anchor="end">${fmt(k)}</text>`;
  if(GS.length>1){o+=`<polyline points="${GS.map(p=>`${X(p.t).toFixed(1)},${Y(p.v).toFixed(1)}`).join(" ")}" fill="none" stroke="${PAL.product.blueberry}" stroke-width="1.8" stroke-dasharray="4 3"/><text class="t-lab" x="${w-14}" y="62" text-anchor="end">- - LAST RUN: ${esc(s.ghost.label.toUpperCase())}</text>`}
  if(S.length>1)o+=`<polyline points="${S.map(p=>`${X(p.t).toFixed(1)},${Y(p[key]).toFixed(1)}`).join(" ")}" fill="none" stroke="${PAL.product.strawberry}" stroke-width="2.6" stroke-linejoin="round"/>`;
  if(key==="v"&&S.length>1){o+=`<polygon points="${X(0)},${Y(0)} ${S.map(p=>`${X(p.t).toFixed(1)},${Y(p.v).toFixed(1)}`).join(" ")} ${X(S[S.length-1].t)},${Y(0)}" fill="${PAL.product.strawberry}" opacity=".16"/>`;
    o+=`<text class="t-ink" x="${w-14}" y="30" text-anchor="end">gradient now = a = ${fmt(s.aNow,1)} m/s²</text><text class="t-lab" x="${w-14}" y="46" text-anchor="end">SHADED AREA = DISTANCE = ${fmt(s.dist)} m</text>`}
  if(key==="d"&&S.length>1){const p=S[S.length-1];o+=`<text class="t-ink" x="${w-14}" y="30" text-anchor="end">steeper line = faster</text><text class="t-lab" x="${w-14}" y="46" text-anchor="end">AVERAGE SO FAR ${fmt(p.t?p.d/p.t:0,1)} m/s</text>`}
  return o}
function fbd(){const w=420,h=260,F=forces(s.x,s.v),Wt=M()*g,par=M()*F.grav,N=Wt*Math.cos(F.th),Res=M()*(F.roll+F.air),B=s.brakeN,net=par-Res-B;
  const th=F.th,K=0.15,cx=120,cy=122,tx=Math.cos(th),ty=-Math.sin(th),nx=-Math.sin(th),ny=-Math.cos(th);
  let o=`<line x1="${cx-tx*110+5}" y1="${cy+16-ty*110+8}" x2="${cx+tx*110+5}" y2="${cy+16+ty*110+8}" stroke="${PAL.shadow}" stroke-width="7" opacity=".1" stroke-linecap="round"/><line x1="${cx-tx*110}" y1="${cy+16-ty*110}" x2="${cx+tx*110}" y2="${cy+16+ty*110}" stroke="${SOIL}" stroke-width="7" stroke-linecap="round"/><line x1="${cx-tx*110}" y1="${cy+14-ty*110}" x2="${cx+tx*110}" y2="${cy+14+ty*110}" stroke="${TRAIL_HI}" stroke-width="2" stroke-linecap="round"/>`;
  o+=`<g transform="translate(${cx},${cy}) rotate(${-th*180/Math.PI})">${FG.box(-18,-20,36,36,{colour:PEACH,kind:"painted",d:9,r:5,shadow:false})}</g>`;
  o+=arrow(cx,cy,cx,cy+Wt*K,"var(--earth)",3);
  o+=arrow(cx,cy,cx+nx*N*K,cy+ny*N*K,"var(--good)",3);
  if(par>1)o+=`<g opacity=".8">${arrow(cx,cy,cx+tx*par*K,cy+ty*par*K,"var(--earth)",2)}</g>`;
  o+=arrow(cx-nx*6,cy-ny*6,cx-nx*6-tx*Res*K,cy-ny*6-ty*Res*K,"var(--hot)",3);
  if(B>5)o+=arrow(cx+nx*8,cy+ny*8,cx+nx*8-tx*B*K,cy+ny*8-ty*B*K,"var(--warn)",3);
  const L=[["var(--earth)","Weight",Wt],["var(--good)","Support",N],["var(--earth)","Down-slope pull",par],["var(--hot)","Friction + air",Res],["var(--warn)","Brakes",B]];
  L.forEach(([c,n,v],i)=>{o+=`<rect x="248" y="${22+i*20}" width="10" height="10" rx="3" fill="${c}" stroke="${INK}" stroke-opacity=".25"/><text class="t-ink" x="264" y="${31+i*20}">${n} <tspan style="font-weight:600">${fmt(v)} N</tspan></text>`});
  const bal=Math.abs(net)<30;
  o+=`<text class="t-ink" x="248" y="140" style="font-weight:600;fill:${bal?"var(--good)":"var(--hot)"}">${bal?"Balanced along the slope":"Unbalanced"}</text>`;
  o+=`<text class="t-lab" x="248" y="160">NET = PULL − DRAG − BRAKES</text><text class="t-ink" x="248" y="180">${fmt(par)} − ${fmt(Res)} − ${fmt(B)} = ${fmt(net)} N</text>`;
  o+=`<text class="t-lab" x="248" y="206">a = F ÷ m = ${fmt(net)} ÷ ${fmt(M(),1)}</text><text class="t-ink" x="248" y="226">= ${fmt(net/M(),1)} m/s² · ${bal?"steady speed":net>0?"speeding up":"slowing down"}</text>`;
  o+=`<text class="t-lab" x="16" y="248">DRAG AREA ${fmt(CDA(),2)} m² (${s.attack?"ATTACK POSITION":"SITTING UP"}) · Crr ${fmt(CRR(),3)}</text>`;
  return o}
function energyBars(){const w=420,h=260,Ep=M()*g*(TOP-s.y),Ek=0.5*M()*s.v*s.v;const bars=[["Ep lost",Ep,PAL.product.blueberry],["Kinetic",Ek,PAL.product.strawberry],["Brake heat",s.heatB,PAL.product.butter],["Friction + air",s.heatF,PAL.product.peach]];
  const max=Math.max(1000,M()*g*(TOP-SFIN.y0));let o="";bars.forEach(([n,E,c],i)=>{const x=24+i*80,bh=170,hh=Math.min(1,E/max)*bh;const f=hh/bh;o+=FG.tube(x,30,56,bh-10,f,{tint:PEACH,fill:c,shadowLen:22})+`<text class="t-ink" x="${x+28}" y="${(30+(bh-10)*(1-f)-(f>0.02?14:-2)).toFixed(1)}" text-anchor="middle" style="paint-order:stroke;stroke:#fff;stroke-width:3px">${kJ(E)}</text><text class="t-lab" x="${x+28}" y="${222}" text-anchor="middle">${n.toUpperCase()}</text>`});
  // the brake rotors warming up: Q = mcΔT
  const T=rotorT(),Md=MD(),tx=356,tt=40,th=150,f=Math.min(1,(T-AIR_T)/400);
  {const tc=T>250?PAL.product.strawberry:PAL.product.butter,tm=FG.mat("painted",tc);o+=`<rect x="${tx}" y="${tt}" width="22" height="${th}" rx="11" fill="${PEACH}" fill-opacity=".35" stroke="${PEACH_D}" stroke-width="1.2"/><rect x="${tx+5}" y="${tt+th-10-f*(th-20)}" width="12" height="${10+f*(th-20)}" rx="6" fill="${tc}" stroke="${tm.stroke}" stroke-width=".8"/><path d="M${tx+5},${tt+12} v${th-30}" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/><circle cx="${tx+13}" cy="${tt+th+9}" r="11" fill="${PAL.shadow}" opacity=".12"/><circle cx="${tx+11}" cy="${tt+th+6}" r="11" fill="${tc}" stroke="${tm.stroke}"/><circle cx="${tx+7.5}" cy="${tt+th+2.5}" r="3" fill="${tm.hi}"/>`}
  o+=`<text class="t-lab" x="${tx+11}" y="${tt-10}" text-anchor="middle">ROTORS</text><text class="t-ink" x="${tx+11}" y="${tt+th+34}" text-anchor="middle" style="font-weight:600">${fmt(T)} °C</text>`;
  o+=`<text class="t-lab" x="${w/2-20}" y="${246}" text-anchor="middle">Ep LOST = Ek + HEAT · ${kJ(Ep)} ≈ ${kJ(Ek+s.heatB+s.heatF)}</text><text class="t-lab" x="${w/2-20}" y="${258}" text-anchor="middle">ΔT = Q ÷ mc = ${kJ(s.heatB)} ÷ (${fmt(Md.rmass,2)} kg × 500) IF NO HEAT ESCAPED</text>`;return o}
function jumpPanel(){const w=420,h=260,SC=14,ox=40,oy=118,X=x=>ox+(x-(LIP-6))*SC,Y=y=>oy-(y-SLIP.y1)*SC;let o="";
  let p=`M${X(LIP-6)},${h}`;for(let x=LIP-6;x<=LIP+22;x+=0.25)p+=` L${X(x)},${Y(trackY(x))}`;p+=` L${X(LIP+22)},${h}Z`;{const jp=[];for(let x=LIP-6;x<=LIP+22;x+=0.25)jp.push([X(x),Y(trackY(x))]);o+=slab(jp,14,h+4,{strata:false})}
  if(s.airPath.length>1)o+=`<polyline points="${s.airPath.map(q=>`${X(q[0]).toFixed(1)},${Y(q[1]).toFixed(1)}`).join(" ")}" fill="none" stroke="${GOLD}" stroke-width="2.5" stroke-dasharray="5 4"/>`;
  o+=`<text class="t-lab" x="${X(LIP)}" y="${Y(SLIP.y1)-10}" text-anchor="middle">LIP</text><text class="t-lab" x="${X((LIP+GAP_END)/2)}" y="${Y(SGAP.y0)+16}" text-anchor="middle" style="fill:${INK}">GAP 6 m</text>`;
  const J=s.jump;o+=infoCard(8,8,404,66)+`<text class="t-ink" x="16" y="28">${J?`Left the lip at ${fmt(J.v,1)} m/s (${fmt(J.v*3.6)} km/h)`:s.lipV?`In the air at ${fmt(s.lipV,1)} m/s…`:"Ride to the jump to see your arc"}</text>`;
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
  o+=`<rect x="${X(T)}" y="14" width="${X(0.25)-X(T)}" height="${h-48}" fill="${PAL.product.strawberry}" opacity=".14"/><text class="t-lab" x="${(X(T)+X(0.25))/2}" y="30" text-anchor="middle">BOTTOM</text><text class="t-lab" x="${(X(T)+X(0.25))/2}" y="42" text-anchor="middle">OUT</text>`;
  o+=`<line x1="${X(0)}" y1="${Y(0)}" x2="${X(0.25)}" y2="${Y(N.k*0.25)}" stroke="${PAL.product.blueberry}" stroke-width="2.6"/>`;
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
  let o=`<rect x="0" y="0" width="${w}" height="260" fill="#fff"/><rect x="0" y="0" width="${w}" height="36" fill="${C.main}"/><rect x="0" y="0" width="${w}" height="3" fill="${C.hi}"/><rect x="0" y="33" width="${w}" height="3" fill="${CREAM}"/>`;
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
// ---------- NCEA Level 2/3 extension: the downhill run (AS91171 mechanics, AS91524 mechanical systems)
// Think Coronet Peak: a run dropping 120 m vertically over 400 m of track; a 72 kg skier reaches the bottom at 34 m/s.
// Figures from the NCEA Everyday-Engineering Practice Pack; the turn's radius, grip and entry speed are estimates.
const SKISTEPS=["run","work","model","turn"];
// figure materials: the shared bench recipe (StudyKit.figMat)
const FM=StudyKit.figMat,K_SKI=FM("metal","#D8DEE8"),K_SUIT=FM("painted","#E8664A"),K_HEAD=FM("painted","#F2B8B8"),K_SNOW=FM("plastic","#F7FAFC"),K_TRACK=FM("rubber","#B9C7D6");
s.ski={m:72,h:120,L:400,v:34,mu:0.5,r:30,vt:20,x:0,t:0,phase:"ready"};
const SK={
  theta:()=>Math.asin(Math.min(1,s.ski.h/s.ski.L)), ep:()=>s.ski.m*g*s.ski.h, ek:()=>0.5*s.ski.m*s.ski.v*s.ski.v,
  loss:()=>Math.max(0,1-SK.ek()/SK.ep()), vfree:()=>Math.sqrt(2*g*s.ski.h), comp:()=>s.ski.m*g*Math.sin(SK.theta()),
  fres:()=>Math.max(0,SK.ep()-SK.ek())/s.ski.L, anet:()=>s.ski.v*s.ski.v/(2*s.ski.L), vmax:()=>Math.sqrt(s.ski.mu*g*s.ski.r),
  fc:()=>s.ski.m*s.ski.vt*s.ski.vt/s.ski.r, rmin:()=>s.ski.vt*s.ski.vt/(s.ski.mu*g), bank:()=>Math.atan(s.ski.vt*s.ski.vt/(s.ski.r*g))*180/Math.PI};
function resetSki(){s.ski.x=0;s.ski.t=0;s.ski.phase="ready"}
function tickSki(dt){if(s.ski.phase==="done")return;s.ski.phase="go";const a=SK.anet();s.ski.t+=dt*3;const x=0.5*a*s.ski.t*s.ski.t;if(x>=s.ski.L){s.ski.x=s.ski.L;s.ski.phase="done";s.playing=false}else s.ski.x=x}
function drawSki(st){const W=800,H=420;let o=FG.floor(W,H);
  if(st.k==="turn")return o+drawTurn();
  const th=SK.theta(),x0=90,y0=70,len=560,dx=len*Math.cos(th),dy=len*Math.sin(th)*(0.9);
  // the run as a solid cross-section of snow: a lit top surface running back, a white front face, a navy shadow on the paper
  o+=FG.shadow(x0-60,H-2,dx+180,{len:40,opacity:.12});
  {const sp=[[x0-60,y0],[x0,y0],[x0+dx,y0+dy],[x0+dx+120,y0+dy]],D=22,ox=D,oy=-0.55*D,P=q=>`${q[0].toFixed(1)},${q[1].toFixed(1)}`;
    o+=`<path d="M${sp.map(P).join(" L")} L${sp.slice().reverse().map(q=>P([q[0]+ox,q[1]+oy])).join(" L")}Z" fill="#FFFFFF" stroke="${K_SNOW.stroke}" stroke-width="1.4" stroke-linejoin="round"/>`;
    o+=`<path d="M${P([x0+dx+120,y0+dy])} l${ox},${oy} V${H} h${-ox}Z" fill="#E3ECF5" stroke="${K_SNOW.stroke}" stroke-width="1.2"/>`;
    o+=`<path d="M${x0-60},${y0} L${x0},${y0} L${x0+dx},${y0+dy} L${x0+dx+120},${y0+dy} L${x0+dx+120},${H} L${x0-60},${H}Z" fill="${PAL.case.sky}" fill-opacity=".35" stroke="${K_SNOW.stroke}" stroke-width="2"/>`;
    o+=`<path d="M${x0-56},${y0+3} L${x0+2},${y0+3} L${x0+dx+2},${y0+dy+3} L${x0+dx+116},${y0+dy+3}" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round" opacity=".9"/>`}
  o+=`<path d="M${x0-60},${H} L${x0-60},${y0} M${x0},${y0} L${x0+dx},${y0+dy}" fill="none" stroke="#B9C7D6" stroke-width="1" stroke-dasharray="4 4"/>`;
  // dimensions
  o+=`<line x1="${x0+dx+60}" y1="${y0}" x2="${x0+dx+60}" y2="${y0+dy}" stroke="${GOLD}" stroke-width="2"/><text x="${x0+dx+68}" y="${y0+dy/2+4}" class="t-ink">h = ${fmt(s.ski.h)} m</text>`;
  o+=`<text x="${x0+dx/2-40}" y="${y0+dy/2-14}" class="t-ink" transform="rotate(${th*0.9*180/Math.PI} ${x0+dx/2} ${y0+dy/2})">track ${fmt(s.ski.L)} m · θ = ${fmt(th*180/Math.PI,1)}°</text>`;
  // skier
  const f=s.ski.x/s.ski.L,sx=x0+dx*f,sy=y0+dy*f;const v=Math.sqrt(2*SK.anet()*s.ski.x);
  o+=`<g transform="translate(${sx},${sy-18}) rotate(${th*0.9*180/Math.PI})"><ellipse cx="6" cy="12" rx="18" ry="2.6" fill="${PAL.shadow}" opacity=".18"/><circle cx="0" cy="-14" r="7" ${K_HEAD.attrs}/><path d="M-4,-18 a5,5 0 0 1 5,-2" stroke="${K_HEAD.hi}" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M0,-7 L-4,8 M0,-7 L5,6 M-6,-2 L6,-4" stroke="${K_SUIT.fill}" stroke-width="3.5" stroke-linecap="round"/><path d="M0,-7 L-4,8 M0,-7 L5,6 M-6,-2 L6,-4" stroke="${K_SUIT.hi}" stroke-width="1" stroke-linecap="round" opacity=".6"/><path d="M-14,10 L16,10" stroke="${K_SKI.stroke}" stroke-width="5" stroke-linecap="round"/><path d="M-14,10 L16,10" stroke="${K_SKI.fill}" stroke-width="3" stroke-linecap="round"/><path d="M-12,9 L14,9" stroke="${K_SKI.hi}" stroke-width="1" stroke-linecap="round"/></g>`;
  if(st.k==="work"){// force components at the skier
    const sc=0.5;const comp=SK.comp()*sc,W_=s.ski.m*g*sc*0.6;const ang=th;
    const arrow=(x,y,ddx,ddy,c,lab)=>`<line x1="${x}" y1="${y}" x2="${x+ddx}" y2="${y+ddy}" stroke="${c}" stroke-width="3" marker-end="url(#skArr)"/><text x="${x+ddx+6}" y="${y+ddy+4}" class="t-ink">${lab}</text>`;
    o+=`<defs><marker id="skArr" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8Z" fill="context-stroke"/></marker></defs>`;
    o+=arrow(sx,sy,0,W_*0.5,"#5B6B7E",`mg = ${fmt(s.ski.m*g)} N`)+arrow(sx,sy,comp*Math.cos(ang)*0.5,comp*Math.sin(ang)*0.5,HOT_SKI,`mg sin θ = ${fmt(SK.comp())} N`)+arrow(sx,sy,-SK.fres()*sc*0.5*Math.cos(ang),-SK.fres()*sc*0.5*Math.sin(ang),"#3A857B",`resistance ≈ ${fmt(SK.fres())} N`)}
  // energy bars
  const Ep=SK.ep(),Ek=SK.ek(),lost=Math.max(0,Ep-Ek);const bx=80,by=350,bw=200;
  const bar=(x,label,val,frac,c)=>`${frac*120>0.5?FG.box(x,by-frac*120,bw-20,frac*120,{colour:c,kind:"painted",d:12,r:2,shadowLen:30,sw:1}):""}<text x="${x+(bw-20)/2}" y="${by+18}" text-anchor="middle" class="t-lab">${label}</text><text x="${x+(bw-20)/2}" y="${by-frac*120-12}" text-anchor="middle" class="t-ink">${kJ(val)}</text>`;
  if(st.k!=="model"){o+=bar(bx,"Ep LOST",Ep,1,PAL.product.butter)+bar(bx+bw,"Ek AT THE BOTTOM",Ek,Ek/Ep,PAL.product.strawberry)+bar(bx+2*bw,"FRICTION + AIR",lost,lost/Ep,PAL.product.blueberry)}
  else{const vf=SK.vfree();o+=FG.acrylic(60,250,680,140,{tint:PEACH,d:12,r:16,opacity:.5,balls:false,shadow:false})+`<g transform="translate(60,250)"><rect x="6" y="6" width="668" height="128" rx="11" fill="#fff" fill-opacity=".88"/><text x="16" y="30" class="t-lab">FRICTIONLESS MODEL v = √(2gh)</text><text x="16" y="58" class="t-big" style="font-size:22px">${fmt(vf,1)} m/s</text><text x="16" y="84" class="t-ink">= ${fmt(vf*3.6)} km/h, ignoring all resistance</text><text x="360" y="30" class="t-lab">REAL EXIT SPEED</text><text x="360" y="58" class="t-big" style="font-size:22px">${fmt(s.ski.v,1)} m/s</text><text x="360" y="84" class="t-ink">model overestimates by ${fmt((vf/s.ski.v-1)*100)}%</text><text x="16" y="118" class="t-ink">the real speed is ${fmt(s.ski.v/vf*100)}% of the model: friction (W = Fd over ${fmt(s.ski.L)} m) and drag (∝ v²) took ${fmt(SK.loss()*100)}% of the energy</text></g>`}
  o+=`<text x="${x0-40}" y="${y0-20}" class="t-ink">${s.ski.phase==="go"?`${fmt(s.ski.t,1)} s · ${fmt(v,1)} m/s`:s.ski.phase==="done"?`bottom: ${fmt(s.ski.v,1)} m/s in ${fmt(s.ski.t,1)} s`:"press play"}</text>`;
  return o}
const HOT_SKI="#E8664A";
function drawTurn(){const W=800,H=420;let o=`<text x="30" y="36" class="t-lab">THE CHECK TURN · RADIUS ${fmt(s.ski.r)} m · ENTRY ${fmt(s.ski.vt)} m/s · SNOW GRIP μ = ${fmt(s.ski.mu,2)} (EDGED, ESTIMATE)</text>`;
  const cx=330,cy=250,R=Math.min(170,s.ski.r*2.2);
  const tp=`M${cx-R-140},${cy+R+40} C${cx-R-60},${cy+R+40} ${cx-R},${cy+R} ${cx-R},${cy} A${R},${R} 0 0 1 ${cx+R},${cy} C${cx+R},${cy+R} ${cx+R+60},${cy+R+40} ${cx+R+140},${cy+R+40}`;
  o+=`<path d="${tp}" fill="none" stroke="${PAL.shadow}" stroke-width="28" stroke-linecap="round" opacity=".12" transform="translate(10,12)"/><path d="${tp}" fill="none" stroke="${K_TRACK.stroke}" stroke-width="28" stroke-linecap="round" transform="translate(0,4)"/>`;
  o+=`<path d="M${cx-R-140},${cy+R+40} C${cx-R-60},${cy+R+40} ${cx-R},${cy+R} ${cx-R},${cy} A${R},${R} 0 0 1 ${cx+R},${cy} C${cx+R},${cy+R} ${cx+R+60},${cy+R+40} ${cx+R+140},${cy+R+40}" fill="none" stroke="${K_TRACK.stroke}" stroke-width="28" stroke-linecap="round"/><path d="M${cx-R-140},${cy+R+40} C${cx-R-60},${cy+R+40} ${cx-R},${cy+R} ${cx-R},${cy} A${R},${R} 0 0 1 ${cx+R},${cy} C${cx+R},${cy+R} ${cx+R+60},${cy+R+40} ${cx+R+140},${cy+R+40}" fill="none" stroke="${K_TRACK.fill}" stroke-width="24" stroke-linecap="round"/><path d="${tp}" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".7" transform="translate(0,-6)"/>`;
  o+=`<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#6B7A99" stroke-dasharray="4 5"/><line x1="${cx}" y1="${cy}" x2="${cx+R*Math.cos(-0.8)}" y2="${cy+R*Math.sin(-0.8)}" stroke="#6B7A99"/><text x="${cx+R*0.5*Math.cos(-0.8)+6}" y="${cy+R*0.5*Math.sin(-0.8)}" class="t-ink">r</text>`;
  const a=-0.8,px=cx+R*Math.cos(a),py=cy+R*Math.sin(a);const ok=s.ski.vt<=SK.vmax();
  o+=`<circle cx="${px}" cy="${py}" r="9" fill="${ok?"#3A857B":HOT_SKI}" stroke="${BLK}" stroke-width="1.5"/>`;
  o+=`<defs><marker id="skArr2" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8Z" fill="context-stroke"/></marker></defs>`;
  const fl=Math.min(90,SK.fc()/12);o+=`<line x1="${px}" y1="${py}" x2="${px-fl*Math.cos(a)}" y2="${py-fl*Math.sin(a)}" stroke="${HOT_SKI}" stroke-width="3" marker-end="url(#skArr2)"/><text x="${px-fl*Math.cos(a)-10}" y="${py-fl*Math.sin(a)+22}" class="t-ink">Fc = mv²/r = ${fmt(SK.fc())} N</text>`;
  const vl=s.ski.vt*3;o+=`<line x1="${px}" y1="${py}" x2="${px-vl*Math.sin(a)}" y2="${py+vl*Math.cos(a)}" stroke="#2F6DB5" stroke-width="3" marker-end="url(#skArr2)"/><text x="${px-vl*Math.sin(a)+8}" y="${py+vl*Math.cos(a)}" class="t-ink">v = ${fmt(s.ski.vt)} m/s</text>`;
  o+=FG.acrylic(470,60,310,150,{tint:PEACH,d:10,r:14,opacity:.5,balls:false,shadowLen:22})+`<g transform="translate(470,60)"><rect x="6" y="6" width="298" height="138" rx="10" fill="#fff" fill-opacity=".88"/><text x="16" y="28" class="t-lab">FRICTION SUPPLIES THE CENTRIPETAL FORCE</text><text x="16" y="56" class="t-ink">max friction = μmg = ${fmt(s.ski.mu*s.ski.m*g)} N</text><text x="16" y="80" class="t-ink">needs mv²/r = ${fmt(SK.fc())} N</text><text x="16" y="110" class="t-big" style="fill:${ok?"#3A857B":HOT_SKI}">${ok?"holds the turn":"skids out"}</text><text x="16" y="136" class="t-ink">v max = √(μgr) = ${fmt(SK.vmax(),1)} m/s</text></g>`;
  o+=FG.acrylic(470,230,310,80,{tint:PEACH,d:10,r:14,opacity:.5,balls:false,shadowLen:22})+`<g transform="translate(470,230)"><rect x="6" y="6" width="298" height="68" rx="10" fill="#fff" fill-opacity=".88"/><text x="16" y="28" class="t-lab">LEVEL 3: A BERMED (BANKED) TURN</text><text x="16" y="52" class="t-ink">no friction needed at tan θ = v²/(rg)</text><text x="16" y="72" class="t-ink">here θ = ${fmt(SK.bank(),1)}°</text></g>`;
  return o}
function skiPanel(st){const w=420,h=260;let o="";
  if(st.k==="run"){o+=`<text class="t-lab" x="14" y="22">THE WORKING</text>`;const rows=[["Ep = mgh",`${fmt(s.ski.m)} × 9.8 × ${fmt(s.ski.h)} = ${kJ(SK.ep())}`],["Ek = ½mv²",`0.5 × ${fmt(s.ski.m)} × ${fmt(s.ski.v)}² = ${kJ(SK.ek())}`],["dissipated",`${kJ(SK.ep()-SK.ek())} = ${fmt(SK.loss()*100)}% of Ep`],["where it went","heat in the snow and skis, air"]];rows.forEach((r,i)=>{o+=`<text class="t-lab" x="14" y="${54+i*40}">${r[0].toUpperCase()}</text><text class="t-ink" x="14" y="${72+i*40}">${r[1]}</text>`});return o}
  if(st.k==="work"){o+=`<text class="t-lab" x="14" y="22">FORCES ALONG THE RUN</text>`;const th=SK.theta();const rows=[["sin θ = h ÷ L",`${fmt(s.ski.h)} ÷ ${fmt(s.ski.L)} = ${fmt(Math.sin(th),2)} → θ = ${fmt(th*180/Math.PI,1)}°`],["down the slope: mg sin θ",`${fmt(SK.comp())} N`],["average resistance: W ÷ d",`${kJ(SK.ep()-SK.ek())} ÷ ${fmt(s.ski.L)} m = ${fmt(SK.fres())} N`],["net force and a = F/m",`${fmt(SK.comp()-SK.fres())} N → ${fmt((SK.comp()-SK.fres())/s.ski.m,2)} m/s²`],["check: v² = 2ad",`√(2 × ${fmt(SK.anet(),2)} × ${fmt(s.ski.L)}) = ${fmt(Math.sqrt(2*SK.anet()*s.ski.L),1)} m/s`]];rows.forEach((r,i)=>{o+=`<text class="t-lab" x="14" y="${50+i*42}">${r[0].toUpperCase()}</text><text class="t-ink" x="14" y="${68+i*42}">${r[1]}</text>`});return o}
  if(st.k==="model"){o+=`<text class="t-lab" x="14" y="22">EXIT SPEED AGAINST VERTICAL DROP</text>`;const X=hh=>46+hh/250*340,Y=v=>220-v/75*160;let d="",d2="";for(let i=0;i<=50;i++){const hh=i*5;d+=(i?"L":"M")+X(hh).toFixed(1)+","+Y(Math.sqrt(2*g*hh)).toFixed(1);d2+=(i?"L":"M")+X(hh).toFixed(1)+","+Y(Math.sqrt(2*g*hh*(1-SK.loss()))).toFixed(1)}
    o+=FG.acrylic(40,54,352,172,{tint:PEACH,d:6,r:12,opacity:.2,balls:false,shadowLen:16})+`<line x1="46" x2="386" y1="220" y2="220" stroke="${AXIS}" stroke-width="1.4"/><line x1="46" x2="46" y1="50" y2="220" stroke="${AXIS}" stroke-width="1.4"/><path d="${d}" fill="none" stroke="#6B7A99" stroke-width="2" stroke-dasharray="5 4"/><path d="${d2}" fill="none" stroke="${HOT_SKI}" stroke-width="2.4"/>`;
    o+=`<circle cx="${X(s.ski.h)}" cy="${Y(SK.vfree())}" r="5" fill="#fff" stroke="${BLK}"/><circle cx="${X(s.ski.h)}" cy="${Y(s.ski.v)}" r="6" fill="var(--sun)" stroke="${BLK}"/><text class="t-lab" x="386" y="238" text-anchor="end">VERTICAL DROP (0–250 m)</text><text class="t-ink" x="54" y="44">dashed: frictionless √(2gh) · solid: with ${fmt(SK.loss()*100)}% lost</text>`;return o}
  o+=`<text class="t-lab" x="14" y="22">MAXIMUM SPEED AGAINST TURN RADIUS · v = √(μgr)</text>`;const X=r=>46+r/120*340,Y=v=>220-v/30*160;let d="";for(let i=1;i<=60;i++){const r=i*2;d+=(i>1?"L":"M")+X(r).toFixed(1)+","+Y(Math.sqrt(s.ski.mu*g*r)).toFixed(1)}
  o+=FG.acrylic(40,54,352,172,{tint:PEACH,d:6,r:12,opacity:.2,balls:false,shadowLen:16})+`<line x1="46" x2="386" y1="220" y2="220" stroke="${AXIS}" stroke-width="1.4"/><line x1="46" x2="46" y1="50" y2="220" stroke="${AXIS}" stroke-width="1.4"/><path d="${d}" fill="none" stroke="${HOT_SKI}" stroke-width="2.4"/><circle cx="${X(s.ski.r)}" cy="${Y(s.ski.vt)}" r="6" fill="${s.ski.vt<=SK.vmax()?"#3A857B":HOT_SKI}" stroke="${BLK}"/><text class="t-lab" x="386" y="238" text-anchor="end">RADIUS (0–120 m)</text><text class="t-ink" x="54" y="44">below the line holds; above it skids. r min at ${fmt(s.ski.vt)} m/s = ${fmt(SK.rmin())} m</text>`;return o}
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
  run:["Scrub speed early, not late","On a long fall line, make your speed checks at the top where the slope is kinder.","Kinetic energy grows with speed squared, so the energy you must shed in a check turn at 34 m/s is four times what it is at 17 m/s. Early, small checks cost less than one big one."],
  work:["Keep your weight over your feet","Stand against the slope with your mass stacked over the skis, not leaning back.","The normal force is mg cos θ. Lean back and the skis unweight, grip drops, and you can't use friction to control the run."],
  model:["Trust the trail, not the calculator","Trail designers shape runs so that real speeds stay well below the frictionless number.","Traverses and rolling terrain shorten the effective fall line: less Ep is converted per metre travelled, so the shape of the trail, not just its slope, sets your speed."],
  turn:["Edge early, before the turn bites","Roll onto the edges as you enter the turn so friction is ready when the centripetal demand peaks.","Friction can only supply up to μN. The turn needs mv²/r. Set the edge before the demand arrives and the turn holds; late, and you skid out."],
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
 {k:"run",lab:"NCEA: the ski run",cap:"Level 2 and 3. Think Coronet Peak: a run dropping 120 m over 400 m of track. A 72 kg skier reaches the bottom at 34 m/s. Press play; the bars show the energy the slope gave and where it went.",speed:1,speedLabel:"3× real time",controls:["play","restart","skm","skh","skl","skv"],
  big:"<b>The big idea:</b> energy conservation with a leak. Ep lost = Ek gained + work done against friction and air. The gap between mgh and ½mv² is what the run dissipated.",
  exam:"Ep = mgh = 72 × 9.8 × 120 = 8.47 × 10⁴ J. At the bottom Ek = ½mv² = 0.5 × 72 × 34² = 4.16 × 10⁴ J, so (8.47 − 4.16) ÷ 8.47 ≈ 51 % of the original energy was dissipated by friction and air resistance.",
  trap:"Using the track length (400 m) as h in mgh. Only the vertical drop counts for gravitational potential energy.",chips:["skep","skek","skloss","skv"],onStep:()=>{resetSki()}},
 {k:"work",lab:"NCEA: forces on the slope",cap:"Where did 43 kJ go? Work = force × distance along the track. Resolve the skier's weight: the component down the slope drives the run; an average resistive force opposes it.",speed:1,speedLabel:"3× real time",controls:["play","restart","skm","skh","skl","skv"],
  big:"<b>The big idea:</b> resolve weight into mg sin θ (down the slope) and mg cos θ (into the slope). Work done against resistance W = Fd lets you turn an energy gap into an average force.",
  exam:"sin θ = 120 ÷ 400 = 0.30, so θ = 17.5°. The component of weight down the slope is mg sin θ = 72 × 9.8 × 0.30 = 212 N. The 4.31 × 10⁴ J dissipated over 400 m gives an average resistive force of W ÷ d = 108 N, so the net force is about 104 N and the average acceleration is F ÷ m ≈ 1.4 m s⁻².",
  trap:"Resolving with cos instead of sin. Down the slope is mg sin θ; the normal force is mg cos θ.",chips:["sktheta","skcomp","skfres","ska"],onStep:()=>{resetSki()}},
 {k:"model",lab:"NCEA: the frictionless model",cap:"The lab's twin computes an 'exit speed' with v = √(2gh), frictionless. Compare it with the real 34 m/s, and see why a course designer uses trail shape, not just slope, to keep skiers safe on a steeper pitch.",speed:0,controls:["skh","skl","skv"],
  big:"<b>The big idea:</b> a model is only as good as what it leaves out. Because v ∝ √E, a 51 % energy loss is a 30 % speed loss, and the frictionless number overestimates by about 43 %. Excellence answers quantify the gap and say what to do about it.",
  exam:"The frictionless prediction is v = √(2 × 9.8 × 120) = 48.5 m s⁻¹ against the real 34 m s⁻¹, an overestimate of about 43 % in speed, because the model ignores the work done against friction (W = Fd over 400 m) and drag, which grows with v². Designers add traverses, check turns and rolling terrain: shortening the effective fall line converts less Ep per metre travelled, so trail shape, not just slope, sets speed.",
  trap:"Comparing energies as if they were speeds. Halving the kinetic energy only cuts the speed to 71 % (v ∝ √E).",chips:["skvfree","skv","skloss"]},
 {k:"turn",lab:"NCEA: the check turn",cap:"Level 2 circular motion, with a Level 3 berm. In a turn, friction between edged skis and snow must supply the centripetal force mv²/r. Change the radius, the entry speed and the grip: does the turn hold?",speed:0,controls:["skr","skvt","skmu"],
  big:"<b>The big idea:</b> centripetal force is not an extra force; it is the name for the net inward force. On flat snow that is friction, limited to μN, so v max = √(μgr). On a bermed turn part of the normal force points inward too.",
  exam:"For a 30 m radius turn with μ = 0.5, the maximum friction is μmg = 0.5 × 72 × 9.8 = 353 N, and the turn needs mv²/r = 72 × 20² ÷ 30 = 960 N at 20 m s⁻¹, so the skier skids out. The fastest speed the turn can hold is v = √(μgr) = √(0.5 × 9.8 × 30) = 12.1 m s⁻¹. Level 3: on a banked turn with no friction, tan θ = v²/(rg).",
  trap:"Treating centripetal force as a separate force to add to the diagram. Draw the real forces (friction, normal, weight); their inward resultant is the centripetal force.",chips:["skfc","skfmax","skvmax","skbank"]},
 {k:"test",lab:"Test yourself",cap:"Eight challenges: five on the trail and three on the NCEA ski run. Use the controls from any step and the garage, then press Check.",controls:["restart","limit","m","grip","v0","tr","k","fh","skh","skv","skr","skvt","skmu"],chips:["time","stopd","comp","rotor","skloss","skvmax"],
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
    no:()=>!s.lastRun?"No finished run yet. Build a FLOW, then ride from Drop in with the brake speed at 45 km/h or less.":s.lastRun.model!=="flow"?`Your last run was on ${s.lastRun.build}. Choose FLOW in the garage, then ride again.`:s.lastRun.grip!=="dry"?"Set the trail to dry hardpack (Forces step) and ride again.":s.lastRun.limit>45?`Your last run ${s.lastRun.limit>=80?"had no brakes":"braked above "+s.lastRun.limit+" km/h"}. Set the brake speed to 45 km/h or less and ride again.`:`Your last run: ${fmt(s.lastRun.rotorT)} °C on ${s.lastRun.build}. Think Q = mcΔT: what makes Q smaller, or m bigger?`},
  {q:"NCEA ski run (120 m drop): set a real exit speed at which less than 40% of the energy is dissipated.",check:()=>s.ski.h===120&&SK.loss()<0.4,ok:()=>`Yes: at ${fmt(s.ski.v)} m/s, Ek = ${kJ(SK.ek())} of ${kJ(SK.ep())}, so only ${fmt(SK.loss()*100)}% was lost.`,no:()=>s.ski.h!==120?"Set the vertical drop back to 120 m first.":`Not yet: ${fmt(SK.loss()*100)}% lost at ${fmt(s.ski.v)} m/s. You need ½mv² > 0.6 × mgh, so v > √(1.2 × 9.8 × 120) = ${fmt(Math.sqrt(1.2*g*120),1)} m/s.`},
  {q:"Check turn: with μ = 0.50 and a 20 m/s entry, find the smallest radius (to the nearest 5 m) that holds the turn.",check:()=>Math.abs(s.ski.mu-0.5)<1e-9&&s.ski.vt===20&&s.ski.r>=SK.rmin()&&s.ski.r<SK.rmin()+5,ok:()=>`Yes: r min = v² ÷ (μg) = 400 ÷ 4.9 = ${fmt(SK.rmin(),1)} m, so ${fmt(s.ski.r)} m holds: friction ${fmt(s.ski.mu*s.ski.m*g)} N against mv²/r = ${fmt(SK.fc())} N.`,no:()=>Math.abs(s.ski.mu-0.5)>1e-9||s.ski.vt!==20?"Set μ = 0.50 and the entry speed to 20 m/s first.":s.ski.r<SK.rmin()?`Not yet: at ${fmt(s.ski.r)} m the turn needs ${fmt(SK.fc())} N but friction can only give ${fmt(s.ski.mu*s.ski.m*g)} N. r ≥ v² ÷ (μg).`:`That holds, but a smaller radius would too. r min = v² ÷ (μg) = ${fmt(SK.rmin(),1)} m.`},
  {q:"Trail design: keep the frictionless exit speed √(2gh) under 30 m/s by limiting the vertical drop.",check:()=>SK.vfree()<30,ok:()=>`Yes: a ${fmt(s.ski.h)} m drop gives √(2 × 9.8 × ${fmt(s.ski.h)}) = ${fmt(SK.vfree(),1)} m/s even with no friction. That is what traverses do: they split a big drop into small ones.`,no:()=>`Not yet: ${fmt(s.ski.h)} m gives ${fmt(SK.vfree(),1)} m/s. v² = 2gh, so h must be under 30² ÷ (2 × 9.8) = ${fmt(900/(2*g),1)} m.`}];

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
Object.entries({"garage": ["waku"], "drop": ["tere", "whakahohoro"], "graph": ["tere", "whakahohoro"], "forces": ["tōpana", "tōpana taurite", "waku"], "energy": ["pūngao", "pūngao moe", "pūngao neke"], "jump": ["tere"], "stop": ["waku", "tere"], "fork": ["tōpana"], "run": ["pūngao moe", "pūngao neke", "waku"], "work": ["tōpana", "waku", "whakahohoro"], "model": ["tere", "pūngao"], "turn": ["tōpana", "tere"]}).forEach(([k,a])=>{const st=steps.find(x=>x.k===k);if(st)st.kupu=a});
// ---------- the 3D bench (../kit3d.js): your bike in 3D, built from the same geometry the drawing uses (geoPts, riderPts), with a
// working fork (stanchions slide into the lowers), a coil shock that really compresses, brake rotors that glow as they heat up and a
// helmeted rider (no face). It rides a 1:1 hillside of the trail profile (SEG) through redwoods, runs out to a log for stopping
// distance, drops off a ledge onto its fork spring, and sits on a turntable in the garage beside an exploded view of the
// suspension. The NCEA steps get a snow run and a check turn. Everything reads the model: tickTrail, tickStop, tickFork, SK.
function bike3d(S){const {THREE,mat}=S,P3=S.PAL;const V3=(x,y,z)=>new THREE.Vector3(x,y,z);const PT=.3,U=.025;
  const GZ=V3(-16,0,60),FZ=V3(-7,0,60),KZ=V3(5,0,60),TZ=V3(19.5,0,60),SZ=V3(-17,0,75.4),TX0=100,TY0=-12;
  const plinth=(x,z,w,d,tint)=>{const p=S.rbox(w,PT,d,.12,mat("plastic",tint,{rough:.55,coat:.2}));p.position.set(x,PT/2,z);S.scene.add(p);return p};
  const steel=mat("metal",P3.steel,{rough:.25}),steelD=mat("metal",P3.steelDark,{rough:.3}),rub=mat("plastic",RUB,{rough:.85,coat:.05}),dark=mat("plastic","#3A4152",{rough:.45}),white=mat("plastic","#ffffff",{rough:.4}),cream=mat("plastic",CREAM,{rough:.45});
  const unitCyl=new THREE.CylinderGeometry(1,1,1,14),Y1=V3(0,1,0),tmp=V3(0,0,0),tq=new THREE.Quaternion();
  const rodMesh=(material,parent)=>{const m=S.mesh(unitCyl,material);parent.add(m);return m};
  const setRod=(m,a,b,r)=>{const d=tmp.subVectors(b,a);const L=d.length();if(L<1e-5){m.visible=false;return}m.visible=true;m.position.copy(a).addScaledVector(d,.5);m.quaternion.setFromUnitVectors(Y1,d.multiplyScalar(1/L));m.scale.set(r,L,r)};
  const W2=(p,z=0)=>V3(p[0]*U,-p[1]*U,z);
  // a coil: a helix one unit tall, scaled along its axis so it really squashes
  const coilGeo=(turns,r,tr)=>{const pts=[];for(let i=0;i<=turns*24;i++){const a=i/24*Math.PI*2;pts.push(V3(Math.cos(a)*r,i/(turns*24),Math.sin(a)*r))}return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),turns*40,tr,6,false)};
  const shockCoil=coilGeo(9,1,.13);
  // ================================================================ the bike (and rider), rebuilt from geoPts every frame
  function makeBike(withRider){const g=new THREE.Group();const frameM=S.M.plastic(COLOURS.black.main,{rough:.32});const accM=S.M.plastic(CREAM,{rough:.4});const stM=S.M.plastic(GOLD,{rough:.22});
    const wheels=[0,1].map(()=>{const w=new THREE.Group();g.add(w);
      w.add(S.torus(.333,.042,rub,{rs:12,ts:56}));w.add(S.torus(.296,.012,dark,{rs:8,ts:48}));w.add(S.cyl(.026,.026,.13,steel,{rot:[Math.PI/2,0,0],seg:16}));
      const sp=[];for(let i=0;i<24;i++){const a=i*Math.PI/12,a2=a+(i%2?.42:-.42),z=i%2?.03:-.03;sp.push(Math.cos(a)*.02,Math.sin(a)*.02,z,Math.cos(a2)*.29,Math.sin(a2)*.29,0)}
      const sg=new THREE.BufferGeometry();sg.setAttribute("position",new THREE.Float32BufferAttribute(sp,3));w.add(new THREE.LineSegments(sg,new THREE.LineBasicMaterial({color:P3.steelDark})));
      const rotM=S.M.glow(P3.hot,0);rotM.color.set(P3.steel);rotM.metalness=.8;rotM.roughness=.3;const rotor=S.mesh(new THREE.RingGeometry(.072,.1,40),rotM,{cast:false});rotor.material.side=THREE.DoubleSide;rotor.position.z=.075;w.add(rotor);
      w.add(S.cyl(.02,.02,.02,steelD,{rot:[Math.PI/2,0,0],at:[0,0,.075]}));
      const knobs=S.swarm(80,new THREE.BoxGeometry(1,1,1),rub,{cast:true});w.add(knobs);return {w,rotM,knobs,key:""}});
    const cal=[0,1].map(()=>{const c=S.rbox(.07,.07,.04,.015,dark);g.add(c);return c});
    const rods={};["down","seat","top","cs1","cs2","ss1","ss2","head","stem","post","l1","l2","s1","s2","s3","s4","crankF","crankR","shockBody","shockRod"].forEach(k=>rods[k]=rodMesh(k[0]==="s"&&k.length===2?stM:["l1","l2"].includes(k)?accM:["shockBody"].includes(k)?dark:["shockRod","post","crankF","crankR","stem"].includes(k)?steelD:frameM,g));
    const crown=S.rbox(.07,.045,.2,.015,dark);g.add(crown);const crown2=S.rbox(.07,.04,.2,.015,dark);g.add(crown2);
    const bar=rodMesh(dark,g),grips=[0,1].map(()=>rodMesh(mat("plastic","#1F2433",{rough:.7}),g));const saddle=S.rbox(.24,.05,.1,.025,mat("plastic",BLK,{rough:.6}));g.add(saddle);
    const ring=S.torus(.085,.012,steelD,{rs:6,ts:28});g.add(ring);const pedals=[0,1].map(()=>{const p=S.rbox(.09,.02,.08,.01,dark);g.add(p);return p});
    const coil=S.mesh(shockCoil,mat("plastic",GOLD,{rough:.3}));g.add(coil);const airCan=rodMesh(dark,g);
    const guard=S.torus(.4,.012,mat("plastic",BLK,{rough:.5}),{arc:1.2,rs:6,ts:16});g.add(guard);const pod=S.rbox(.06,.05,.07,.015,dark);g.add(pod);const podLight=S.sphere(.022,S.M.glow("#FFF4D6",3),{cast:false});g.add(podLight);
    const plate=S.rbox(.02,.1,.14,.02,white);g.add(plate);
    let RD=null;if(withRider){const jer=mat("plastic",JERSEY,{rough:.5}),jerD=mat("plastic",JERSEY_D,{rough:.5}),pants=mat("plastic",PANTS,{rough:.6}),pantsD=mat("plastic",PANTS_D,{rough:.6});
      RD={torso:rodMesh(jer,g),hipB:S.sphere(1,pants),thF:rodMesh(pants,g),shF:rodMesh(pants,g),thR:rodMesh(pantsD,g),shR:rodMesh(pantsD,g),uaF:rodMesh(jer,g),faF:rodMesh(jer,g),uaR:rodMesh(jerD,g),faR:rodMesh(jerD,g),neck:rodMesh(jerD,g),
        kneeF:S.sphere(1,dark),kneeR:S.sphere(1,dark),gF:S.sphere(1,mat("plastic",SKIN_GLOVE)),gR:S.sphere(1,mat("plastic",SKIN_GLOVE)),shoeF:S.rbox(.15,.06,.08,.02,mat("plastic","#1F2433")),shoeR:S.rbox(.15,.06,.08,.02,mat("plastic","#1F2433")),helmet:new THREE.Group()};
      [RD.hipB,RD.kneeF,RD.kneeR,RD.gF,RD.gR,RD.shoeF,RD.shoeR,RD.helmet].forEach(m=>g.add(m));
      const hm=RD.helmet;hm.add(S.sphere(.13,white,{seg:24}));const stripe=S.torus(.128,.014,frameM,{rot:[Math.PI/2,0,0],arc:Math.PI});stripe.rotation.set(0,Math.PI/2,0);hm.add(stripe);
      const gog=S.rbox(.07,.06,.17,.02,mat("plastic",P3.product.butter,{rough:.15,coat:1}));gog.position.set(.1,.0,0);hm.add(gog);
      const chin=S.rbox(.08,.06,.15,.03,mat("plastic","#E6EAF0",{rough:.4}));chin.position.set(.1,-.08,0);hm.add(chin);
      const peak=S.rbox(.12,.015,.16,.006,dark);peak.position.set(.1,.12,0);peak.rotation.z=-.25;hm.add(peak);hm.add(S.rbox(.06,.045,.04,.01,dark,{at:[-.01,.14,0]}))}
    let lastWheels="";
    function update(o){const b=o.b,Md=MODELS[b.model],C=COLOURS[b.colour],Wh=WHEELS[b.wheels];frameM.color.set(C.main);stM.color.set(Md.stanch);rods.l1.material=rods.l2.material=Md.lowers==="frame"?frameM:accM;
      const travelU=Md.travel/U,comp=Math.max(0,Math.min(1,o.comp||0))*travelU,P=geoPts(b,comp),u=P.u,uW=V3(u[0],-u[1],0);
      // wheels and their knobs (tread pattern follows the wheel choice)
      if(b.wheels!==lastWheels){lastWheels=b.wheels;wheels.forEach(w=>{const n=Wh.knobs,kh=Wh.kh*U,kw=Wh.kw*U;let i=0;for(let k=0;k<n;k++){const a=k/n*Math.PI*2;
          w.knobs.putS(i++,Math.cos(a)*(.375+kh/2-.004),Math.sin(a)*(.375+kh/2-.004),0,kh,kw,.05,tq.setFromAxisAngle(V3(0,0,1),a-Math.PI/2));
          const a2=a+Math.PI/n;for(const z of [-.036,.036])w.knobs.putS(i++,Math.cos(a2)*(.36+kh/2),Math.sin(a2)*(.36+kh/2),z,kh*.8,kw*.7,.025,tq.setFromAxisAngle(V3(0,0,1),a2-Math.PI/2))}
          for(;i<80;i++)w.knobs.put(i,0,0,0,.0001);w.knobs.done()})}
      const hf=S.clamp(((o.heat||0)-70)/330,0,1);
      [P.RA,P.FA].forEach((p,i)=>{const w=wheels[i];w.w.position.copy(W2(p));w.w.rotation.z=-(o.spin||0);w.rotM.emissiveIntensity=hf*6;w.rotM.color.set(hf>.02?"#E9A27A":P3.steel);
        cal[i].position.copy(W2(p,.085)).add(V3(Math.cos(i?-2.05:-2.2)*.1,-Math.sin(i?-2.05:-2.2)*.1,0))});
      // frame
      const HB=W2(P.HB),HT=W2(P.HT),BB=W2(P.BB),ST=W2(P.ST),TT=W2(P.TT),MP=W2(P.MP),RA=W2(P.RA),RK=W2(P.RK),FA=W2(P.FA);
      setRod(rods.down,HB,BB,.03);setRod(rods.seat,BB,ST,.023);setRod(rods.top,HT.clone().addScaledVector(uW,-.9*U),TT,.022);setRod(rods.head,HB.clone().addScaledVector(uW,-.01),HT.clone().addScaledVector(uW,.01),.032);
      for(const [k,z] of [["cs1",.055],["cs2",-.055]])setRod(rods[k],V3(MP.x,MP.y,z*.4),V3(RA.x,RA.y,z),.016);
      for(const [k,z] of [["ss1",.055],["ss2",-.055]])setRod(rods[k],V3(RA.x,RA.y,z),V3(RK.x,RK.y,z*.3),.013);
      // fork: lowers fixed to the axle, stanchions hang from the crown and slide in as the fork compresses
      const fl=Md.geo.fl*U,dual=Md.fork==="dual",topC=dual?W2(P.UC):HB;
      for(const [k,z] of [["l1",.07],["l2",-.07]]){const a=V3(FA.x,FA.y,z),b2=a.clone().addScaledVector(uW,fl*.58);setRod(rods[k],a.addScaledVector(uW,-.02),b2,.024)}
      for(const [k,z] of [["s1",.07],["s2",-.07]])setRod(rods[k],V3(HB.x,HB.y,z).addScaledVector(uW,-fl*.6),V3(topC.x,topC.y,z),.017);
      for(const [k,z] of [["s3",.07],["s4",-.07]])rods[k].visible=false;
      crown.position.copy(HB);crown.quaternion.setFromUnitVectors(Y1,uW);crown2.visible=dual;if(dual){crown2.position.copy(topC);crown2.quaternion.copy(crown.quaternion)}
      const SB=W2(P.SB),CL=W2(P.CL);setRod(rods.stem,HT,CL,.018);
      const bw=BARS[b.bars].w/2000,GRp=W2(P.GR);setRod(bar,V3(CL.x,CL.y,-bw),V3(CL.x,CL.y,bw),.013);setRod(grips[0],V3(CL.x,CL.y,bw-.11),V3(CL.x,CL.y,bw),.017);setRod(grips[1],V3(CL.x,CL.y,-bw),V3(CL.x,CL.y,-bw+.11),.017);
      const SEAT=W2(P.SEAT);setRod(rods.post,ST,SEAT,.015);saddle.position.copy(SEAT).add(V3(.02,.02,0));
      ring.position.copy(BB).setZ(.06);const PF=W2(P.PF,.1),PR=W2(P.PR,-.1);setRod(rods.crankF,V3(BB.x,BB.y,.08),V3(PF.x,PF.y,.08),.012);setRod(rods.crankR,V3(BB.x,BB.y,-.08),V3(PR.x,PR.y,-.08),.012);pedals[0].position.copy(PF);pedals[1].position.copy(PR);
      // shock: the coil really squashes as the frame compresses
      const s0=W2(P.SH0),s1=W2(P.SH1),sd=s1.clone().sub(s0),sl=sd.length(),sn=sd.clone().normalize();
      setRod(rods.shockBody,s0,s0.clone().addScaledVector(sn,sl*.55),.016);setRod(rods.shockRod,s0,s1,.008);
      const isCoil=Md.shock==="coil";coil.visible=isCoil;airCan.visible=!isCoil;
      if(isCoil){coil.position.copy(s0).addScaledVector(sn,sl*.18);coil.quaternion.setFromUnitVectors(Y1,sn);const cr=.026;coil.scale.set(cr,sl*.62,cr);coil.material.color&&coil.material.color.set(b.colour==="black"?"#D98A2B":GOLD)}
      else setRod(airCan,s0,s0.clone().addScaledVector(sn,sl*.55),.027);
      guard.visible=!!b.guard;guard.position.copy(FA).setZ(0);guard.rotation.z=Math.atan2(uW.y,uW.x)-.6;
      pod.visible=podLight.visible=!!b.pod;pod.position.copy(CL).add(V3(.04,.05,0));podLight.position.copy(CL).add(V3(.08,.05,0));plate.position.copy(CL).add(V3(.07,-.05,0));
      // rider
      if(RD){RD.helmet.visible=o.rider;Object.values(RD).forEach(m=>{if(m.isObject3D)m.visible=!!o.rider});if(o.rider){const R2=riderPts(P,{pose:o.pose||0,crouch:o.crouch||0});
        const hip=W2(R2.hip),sh=W2(R2.sh),hd=W2(R2.head),kF=W2(R2.kF,.11),kR=W2(R2.kR,-.11),fF=W2(R2.fF,.1),fR=W2(R2.fR,-.1),el=W2(R2.el,.17),elR=W2(R2.elR,-.17),gF=V3(CL.x,CL.y,bw-.06),gR=V3(CL.x,CL.y,-bw+.06);
        setRod(RD.torso,hip,sh,.12);RD.hipB.position.copy(hip);RD.hipB.scale.setScalar(.12);
        setRod(RD.thF,V3(hip.x,hip.y,.1),kF,.06);setRod(RD.shF,kF,fF,.048);setRod(RD.thR,V3(hip.x,hip.y,-.1),kR,.06);setRod(RD.shR,kR,fR,.048);
        RD.kneeF.position.copy(kF);RD.kneeF.scale.setScalar(.06);RD.kneeR.position.copy(kR);RD.kneeR.scale.setScalar(.06);
        setRod(RD.uaF,V3(sh.x,sh.y,.16),el,.04);setRod(RD.faF,el,gF,.034);setRod(RD.uaR,V3(sh.x,sh.y,-.16),elR,.04);setRod(RD.faR,elR,gR,.034);
        RD.gF.position.copy(gF);RD.gF.scale.setScalar(.035);RD.gR.position.copy(gR);RD.gR.scale.setScalar(.035);
        RD.shoeF.position.copy(fF).add(V3(.02,.03,0));RD.shoeR.position.copy(fR).add(V3(.02,.03,0));
        const hc=hd.clone().add(V3(.02,.02,0));setRod(RD.neck,sh,hc,.045);RD.helmet.position.copy(hc);RD.helmet.rotation.z=-(8-(o.pose||0)*10)*Math.PI/180}}
      return P}
    return {g,update,wheels}}
  const bikes={trail:makeBike(true),stop:makeBike(true),fork:makeBike(true),garage:makeBike(false)};
  for(const k in bikes)S.scene.add(bikes[k].g);
  const stanM={garage:S.M.plastic(GOLD,{rough:.22})};
  // ================================================================ the trail: a 1:1 cut of hillside following SEG, with the trail as its lit top
  const tz=S.group();tz.position.set(TX0,TY0,0);
  {const sh=new THREE.Shape();const x0=-30,x1=TRAIL_END+40;sh.moveTo(x0,-TY0);sh.lineTo(x0,TOP);sh.lineTo(0,TOP);SEG.forEach(q=>{sh.lineTo(q.x0,q.y0);sh.lineTo(q.x1,q.y1)});const ye=SEG[SEG.length-1].y1;sh.lineTo(x1,ye);sh.lineTo(x1,-TY0);sh.lineTo(x0,-TY0);
    const eg=new THREE.ExtrudeGeometry(sh,{depth:12,bevelEnabled:false,steps:1});eg.translate(0,0,-9.8);const hill=S.mesh(eg,mat("plastic",SOIL,{rough:.8,coat:.05}));hill.receiveShadow=false;tz.add(hill);
    const strip=(z0,z1,c,dy)=>{const pos=[],idx=[];const pts=[[x0,TOP],[0,TOP]];SEG.forEach(q=>{pts.push([q.x0,q.y0],[q.x1,q.y1])});pts.push([x1,ye]);
      pts.forEach(([x,y],i)=>{pos.push(x,y+dy,z0,x,y+dy,z1);if(i){const a=(i-1)*2;idx.push(a,a+2,a+1,a+1,a+2,a+3)}});const gg=new THREE.BufferGeometry();gg.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));gg.setIndex(idx);gg.computeVertexNormals();
      const m=S.mesh(gg,mat("plastic",c,{rough:.85,coat:.05}),{cast:false});m.material.side=THREE.DoubleSide;tz.add(m);return m};
    strip(-1.4,1.4,TRAIL,.02);strip(-9.8,-1.4,"#CFE4B0",.01);strip(1.4,2.2,"#CFE4B0",.01)}
  // redwoods behind the trail, ponga and ferns at their feet, roots in the root garden, planks on the wooden roller, gate and finish arch
  {let seed=3;const r=()=>(seed=(seed*16807)%2147483647)/2147483647;const NT=110,trunks=S.swarm(NT,new THREE.CylinderGeometry(.42,.6,1,14),mat("plastic",BARK,{rough:.7,coat:.1}),{colors:true,cast:true});tz.add(trunks);
    let i=0;for(let x=-24;x<TRAIL_END+30&&i<NT;x+=3.2+r()*3){if(x>LIP-4&&x<GAP_END+3&&r()<.6)continue;const z=-3.2-r()*6,rr=.5+r()*.8,h=34+r()*14,yb=trackY(Math.max(0,x))-1;trunks.putS(i,x,yb+h/2,z,rr,h,rr);trunks.tint(i++,r()<.5?BARK:"#B97C63")}
    for(;i<NT;i++)trunks.put(i,0,-99,0,.001);trunks.done();
    const NF=160,fronds=S.swarm(NF,new THREE.SphereGeometry(1,10,6),mat("plastic",FERN,{rough:.6}),{colors:true});tz.add(fronds);
    for(let k=0;k<NF;k++){const x=-20+r()*(TRAIL_END+40),front=k%4===0,z=front?1.85+r()*.3:-1.8-r()*6.5,yb=trackY(Math.max(0,Math.min(TRAIL_END,x)));const s2=front?.14+r()*.12:.5+r()*.7;
      fronds.putS(k,x,yb+s2*.35,z,s2*1.4,s2*.5,s2*1.1,tq.setFromAxisAngle(Y1,r()*6));fronds.tint(k,r()<.5?FERN:FERN_D)}fronds.done();
    const SR=SEG.find(q=>q.n==="Root garden");const roots=S.swarm(24,unitCyl,mat("plastic","#A8775A",{rough:.6}));tz.add(roots);
    for(let k=0;k<24;k++){const x=SR.x0+1+k*(SR.x1-SR.x0-2)/24+r()*.5;roots.putS(k,x,trackY(x)+.03,(r()-.5)*.6,.05,2.6,.05,tq.setFromEuler(new THREE.Euler(Math.PI/2,0,(r()-.5)*.8)))}roots.done();
    const planks=S.swarm(40,new THREE.BoxGeometry(1,1,1),mat("plastic","#C9A072",{rough:.6}));tz.add(planks);let pi=0;SROLL.forEach(q=>{for(let k=0;k<20&&pi<40;k++){const x=q.x0+(k+.5)*(q.x1-q.x0)/20;const th=Math.atan(q.gr);planks.putS(pi++,x,trackY(x)+.04,0,.17,.06,2.6,tq.setFromAxisAngle(V3(0,0,1),th))}});planks.done();
    const arch=(x,c1)=>{const y=trackY(x);for(const z of [-1.6,1.6])tz.add(S.cyl(.08,.08,3,mat("plastic",c1,{rough:.4}),{at:[x,y+1.5,z]}));tz.add(S.rbox(.25,.45,3.6,.08,mat("plastic",c1,{rough:.4}),{at:[x,y+3.1,0]}))};
    arch(1,P3.product.peach);arch(FINISH,P3.product.strawberry);
    // the berm: a banked wall of dirt on the outside of the corner
    const pos=[],idx=[];const n=20;for(let k=0;k<=n;k++){const x=SBERM.x0-2+k*(SBERM.x1-SBERM.x0+4)/n,h=Math.sin(k/n*Math.PI)*1.8,y=trackY(x);pos.push(x,y,-1.4,x,y+h,-2.6-h*.3);if(k){const a=(k-1)*2;idx.push(a,a+2,a+1,a+1,a+2,a+3)}}
    const bg=new THREE.BufferGeometry();bg.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));bg.setIndex(idx);bg.computeVertexNormals();const berm=S.mesh(bg,mat("plastic",TRAIL,{rough:.85}));berm.material.side=THREE.DoubleSide;tz.add(berm)}
  const dustP=S.puffs(90,"#E8CBA6");tz.add(dustP);
  const airDots=S.swarm(140,new THREE.SphereGeometry(.05,8,6),mat("glow",P3.product.strawberry,1.2));tz.add(airDots);
  // forces on the rider
  const FA_={w:S.arrow("#5B6B7E",{r:.04}),n:S.arrow(P3.deep.sky,{r:.035}),par:S.arrow(HOT_SKI,{r:.04}),res:S.arrow("#3A857B",{r:.04}),brk:S.arrow(P3.product.butter,{r:.04}),net:S.arrow(P3.deep.lavender,{r:.05})};for(const k in FA_)tz.add(FA_[k]);
  // energy columns and the live graph screen ride along with you
  const rideAlong=S.group(tz);
  const ecol=[["Ep lost",P3.product.blueberry],["Ek",P3.product.strawberry],["Heat",P3.product.peach]].map(([n,c],i)=>{const g=new THREE.Group();g.position.set(-3.2+i*.75,0,-3.4);rideAlong.add(g);
    const H=2.6;g.add(S.cyl(.26,.28,.1,white,{at:[0,.05,0]}));const fm=mat("liquid",c,{opacity:1});const fill=S.cyl(.2,.2,1,fm,{seg:28});g.add(fill);const sh=S.cyl(.24,.24,H,mat("acrylic","#ffffff",{opacity:.22}),{at:[0,.1+H/2,0],cast:false,seg:28});sh.renderOrder=4;g.add(sh);
    g.add(S.torus(.24,.02,mat("plastic",P3.case.peach),{at:[0,.1+H,0],rot:[Math.PI/2,0,0]}));return {g,fill,H,n}});
  const scrStand=new THREE.Group();rideAlong.add(scrStand);scrStand.position.set(2.6,-.3,-2.8);scrStand.add(S.cyl(.05,.07,1.7,steel,{at:[0,.85,0]}));scrStand.add(S.rbox(3.55,2.05,.08,.06,mat("plastic","#ffffff",{rough:.4}),{at:[0,2.6,-.05]}));
  const scr=S.panel(640,360,3.4);scr.position.set(0,2.6,.01);scrStand.add(scr);let scrKey="";
  // ================================================================ stopping distance: a 1:1 run-out with a log 25 m ahead
  plinth(SZ.x+18,SZ.z,46,4.4,P3.case.peach);const sz=S.group();sz.position.set(SZ.x,PT,SZ.z);
  const runout=S.rbox(42,.05,2.6,.02,mat("plastic",TRAIL,{rough:.85}),{at:[17,.025,0]});sz.add(runout);
  const logG=new THREE.Group();logG.position.set(LOGX,.24,0);logG.add(S.cyl(.24,.24,2.8,mat("plastic","#C9A072",{rough:.7}),{rot:[Math.PI/2,0,0],seg:24}));for(const z of [-1.4,1.4])logG.add(S.cyl(.22,.22,.02,mat("plastic","#EBCB9F",{rough:.6}),{rot:[Math.PI/2,0,0],at:[0,0,z],seg:24}));sz.add(logG);
  const thinkBar=S.rbox(1,.05,.34,.02,mat("plastic",P3.product.butter,{rough:.4})),brakeBar=S.rbox(1,.05,.34,.02,mat("plastic",P3.product.strawberry,{rough:.4}));thinkBar.position.set(0,.03,1.65);brakeBar.position.set(0,.03,1.65);sz.add(thinkBar,brakeBar);
  const ticksS=S.swarm(9,new THREE.BoxGeometry(.04,.02,.3),mat("plastic",SOIL_D));sz.add(ticksS);for(let k=0;k<9;k++)ticksS.put(k,k*5,.06,1.2,1);ticksS.done();
  const mudS=S.swarm(30,new THREE.CylinderGeometry(1,1,1,16),mat("plastic","#A47A5C",{rough:.15,coat:1}));sz.add(mudS);const rootS=S.swarm(30,unitCyl,mat("plastic","#A8775A",{rough:.6}));sz.add(rootS);
  {let sd=9;const r=()=>(sd=(sd*16807)%2147483647)/2147483647;for(let k=0;k<30;k++){mudS.putS(k,k*1.3+r()*.6,.055,(r()-.5)*1.8,.3+r()*.4,.012,.18+r()*.2);rootS.putS(k,k*1.35+r()*.5,.06,(r()-.5)*.4,.05,2.4,.05,tq.setFromEuler(new THREE.Euler(Math.PI/2,0,(r()-.5)*.7)))}mudS.done();rootS.done()}
  const sdustP=S.puffs(60,"#E8CBA6");sz.add(sdustP);
  // ================================================================ the fork: a ledge, the drop, a big spring and a travel gauge
  plinth(FZ.x+.6,FZ.z,7.4,4,P3.case.mint);const fz=S.group();fz.position.set(FZ.x,PT,FZ.z);
  const ledge=S.rbox(3.2,1,2.6,.04,mat("plastic",SOIL,{rough:.8}),{});fz.add(ledge);const ledgeTop=S.rbox(3.2,.04,2.6,.02,mat("plastic",TRAIL,{rough:.8}));fz.add(ledgeTop);
  const BIGC=coilGeo(8,1,.09);const bigCoil=S.mesh(BIGC,mat("metal",GOLD,{rough:.25}));fz.add(bigCoil);const plateTop=S.cyl(.3,.3,.06,steel,{seg:32}),plateBot=S.cyl(.3,.3,.06,steel,{at:[2.9,.03,-.9],seg:32});fz.add(plateTop,plateBot);
  const gaugeT=S.cyl(.17,.17,2,mat("acrylic","#ffffff",{opacity:.22}),{cast:false,seg:28});gaugeT.position.set(3.7,1.0+.06,-.9);gaugeT.renderOrder=4;fz.add(gaugeT);fz.add(S.cyl(.2,.2,.06,white,{at:[3.7,.03,-.9]}));
  const gaugeM=S.M.plastic(P3.product.butter,{rough:.3});const gaugeF=S.cyl(.14,.14,1,gaugeM,{seg:24});fz.add(gaugeF);const gaugeMax=S.box(.42,.012,.42,mat("plastic",P3.ink),{cast:false});fz.add(gaugeMax);
  const fArrowK=S.arrow(P3.deep.mint,{r:.04}),fArrowW=S.arrow(HOT_SKI,{r:.04});fz.add(fArrowK,fArrowW);
  fz.add(S.rbox(3.4,2.2,.1,.05,mat("plastic","#ffffff",{rough:.45}),{at:[.9,1.6,-1.85]}));const fpan=S.panel(560,330,3.1);fpan.position.set(.9,1.6,-1.79);fz.add(fpan);let fpKey="";
  // ================================================================ the garage: a turntable and an exploded view of the suspension
  plinth(GZ.x+.4,GZ.z,7.6,5,P3.case.peach);const gz=S.group();gz.position.set(GZ.x,PT,GZ.z);
  gz.add(S.rbox(7.2,3.2,.14,.07,mat("plastic",P3.case.mint,{rough:.5}),{at:[.4,1.6,-2.2]}));{const pegs=S.swarm(120,new THREE.CylinderGeometry(.03,.03,.02,8),mat("plastic",P3.deep.mint),{});gz.add(pegs);for(let k=0;k<120;k++)pegs.putS(k,-2.9+(k%20)*.34,.5+Math.floor(k/20)*.45,-2.12,1,1,1,tq.setFromAxisAngle(V3(1,0,0),Math.PI/2));pegs.done()}
  const turn=S.group(gz);turn.position.set(-1,0,.1);turn.add(S.cyl(1.35,1.4,.1,mat("plastic","#ffffff",{rough:.35}),{at:[0,.05,0],seg:48}));turn.add(S.torus(1.36,.02,mat("plastic",P3.case.peach),{rot:[Math.PI/2,0,0],at:[0,.1,0]}));
  const ex=S.group(gz);ex.position.set(2.2,0,-.4);ex.add(S.rbox(1.8,.1,1.2,.04,white,{at:[0,.05,0]}));ex.add(S.cyl(.03,.03,2.4,steel,{at:[-.6,1.25,0]}));ex.add(S.cyl(.03,.03,2.4,steel,{at:[.6,1.25,0]}));
  const exF={crown:S.rbox(.5,.08,.16,.03,dark),st1:rodMesh(stanM.garage,ex),st2:rodMesh(stanM.garage,ex),lo1:rodMesh(cream,ex),lo2:rodMesh(cream,ex),spr:S.mesh(coilGeo(10,1,.12),mat("metal",GOLD,{rough:.25})),axle:rodMesh(steel,ex),
    sEye1:S.torus(.05,.018,steelD,{rs:8,ts:16}),sBody:rodMesh(dark,ex),sRod:rodMesh(steel,ex),sCoil:S.mesh(coilGeo(9,1,.12),mat("plastic",GOLD,{rough:.3})),sCollar:S.cyl(.06,.06,.03,mat("plastic",HOT_SKI,{rough:.4}),{seg:20}),sEye2:S.torus(.05,.018,steelD,{rs:8,ts:16})};
  [exF.crown,exF.spr,exF.sEye1,exF.sCoil,exF.sCollar,exF.sEye2].forEach(m=>ex.add(m));
  gz.add(S.rbox(2.3,1.45,.08,.05,mat("plastic","#ffffff",{rough:.4}),{at:[-2.2,2.35,-2.05]}));const spec=S.panel(512,320,2.2);spec.position.set(-2.2,2.35,-2.0);gz.add(spec);let specKey="";
  // ================================================================ NCEA: the snow run and the check turn
  plinth(KZ.x+.2,KZ.z,13.6,5,P3.case.sky);const kz=S.group();kz.position.set(KZ.x,PT,KZ.z);let runKey="",runMesh=null;const RUNL=10;
  const skier=new THREE.Group();kz.add(skier);{const suit=mat("plastic","#E8664A",{rough:.4});skier.add(S.mesh(new THREE.CapsuleGeometry(.1,.2,6,12),suit,{at:[0,.42,0]}));skier.add(S.sphere(.09,white,{at:[.02,.68,0]}));
    skier.add(S.rbox(.05,.04,.13,.015,mat("plastic",P3.product.butter,{rough:.15,coat:1}),{at:[.08,.68,0]}));for(const z of [-.06,.06]){skier.add(S.cyl(.035,.035,.3,mat("plastic",PANTS),{at:[0,.17,z],seg:8}));skier.add(S.rbox(.75,.02,.05,.01,mat("metal","#D8DEE8",{rough:.2}),{at:[.05,.01,z]}))}
    for(const z of [-.14,.14])skier.add(S.cyl(.008,.008,.6,steelD,{at:[-.05,.3,z],rot:[0,0,.3],seg:6}))}
  const KA={w:S.arrow("#5B6B7E",{r:.03}),par:S.arrow(HOT_SKI,{r:.035}),res:S.arrow("#3A857B",{r:.035})};for(const k in KA)kz.add(KA[k]);
  const hBar=S.box(.05,1,.05,mat("plastic",GOLD,{rough:.3}));kz.add(hBar);const sprayP=S.puffs(50,"#ffffff");kz.add(sprayP);const spr=[];for(let i=0;i<50;i++)spr.push({x:0,y:0,z:0,vx:0,vy:0,life:0});
  const kcol=[["Ep lost",P3.product.butter],["Ek at the bottom",P3.product.strawberry],["Friction + air",P3.product.blueberry]].map(([n,c],i)=>{const g=new THREE.Group();g.position.set(1.7+i*.85,0,1.55);kz.add(g);const H=2.2;
    g.add(S.cyl(.26,.28,.08,white,{at:[0,.04,0]}));const fill=S.cyl(.2,.2,1,mat("liquid",c,{opacity:1}),{seg:24});g.add(fill);const sh=S.cyl(.24,.24,H,mat("acrylic","#ffffff",{opacity:.22}),{at:[0,.08+H/2,0],cast:false,seg:24});sh.renderOrder=4;g.add(sh);return {g,fill,H,n}});
  const vcol=[["Frictionless √(2gh)",P3.case.lavender],["Real",P3.product.strawberry]].map(([n,c],i)=>{const g=new THREE.Group();g.position.set(-5.3+i*.9,0,1.55);kz.add(g);g.add(S.cyl(.3,.32,.08,white,{at:[0,.04,0]}));
    const fill=S.cyl(.24,.24,1,mat("liquid",c,{opacity:1}),{seg:24});g.add(fill);return {g,fill,n}});
  plinth(TZ.x,TZ.z,8,5,P3.case.sky);const tzn=S.group();tzn.position.set(TZ.x,PT,TZ.z);tzn.add(S.cyl(3.7,3.7,.06,mat("plastic","#F7FAFC",{rough:.5}),{at:[0,.03,0],seg:64}));
  let trackKey="",track=null,bermM=null;const tskier=skier.clone();tzn.add(tskier);tskier.scale.setScalar(.7);
  const TA={fc:S.arrow(HOT_SKI,{r:.035}),fr:S.arrow("#3A857B",{r:.035}),v:S.arrow(P3.deep.sky,{r:.03})};for(const k in TA)tzn.add(TA[k]);const tspray=S.puffs(40,"#ffffff");tzn.add(tspray);const tsp=[];for(let i=0;i<40;i++)tsp.push({x:0,y:0,z:0,vx:0,vz:0,life:0});
  // ================================================================ labels
  const L=o=>S.label(o);
  const lab={trail:{spd:L({cls:"big",off:[-40,-74]}),seg:L({off:[-30,-50]}),crash:L({cls:"hot big",off:[0,-70]}),w:L({off:[18,10]}),n:L({off:[-20,-20]}),par:L({off:[20,16]}),res:L({off:[-24,10]}),brk:L({off:[-24,-14]}),net:L({cls:"hot",off:[24,-10]}),
      e0:L({off:[-20,-24]}),e1:L({off:[0,-34]}),e2:L({off:[20,-24]}),rot:L({off:[24,24]}),lip:L({cls:"hot",off:[-60,40]}),jump:L({cls:"big",off:[24,-30]}),gap:L({off:[0,30]})},
    stop:{bike:L({cls:"big",off:[0,-56]}),think:L({off:[0,30],lead:false}),brake:L({off:[0,30],lead:false}),log:L({off:[20,-40]}),m0:L({off:[0,26],lead:false}),res:L({cls:"hot big",off:[0,-60]})},
    fork:{drop:L({off:[-30,-20]}),x:L({cls:"big",off:[26,-20]}),F:L({cls:"hot",off:[26,10]}),W:L({off:[-26,10]}),gauge:L({off:[20,-30]}),spr:L({off:[-30,-30]})},
    garage:{name:L({cls:"big",off:[-30,-40]}),fork:L({off:[30,-20]}),spring:L({off:[30,0]}),shock:L({off:[30,20]}),damp:L({off:[-30,30]}),wheels:L({off:[-30,30]})},
    ski:{v:L({cls:"big",off:[24,-40]}),h:L({off:[20,0]}),track:L({off:[0,-30]}),c0:L({off:[-30,-40]}),c1:L({off:[0,-64]}),c2:L({off:[26,-40]}),w:L({off:[18,10]}),par:L({off:[20,20]}),res:L({off:[-20,-20]}),v0:L({off:[-30,-30]}),v1:L({cls:"hot",off:[30,-20]})},
    turn:{fc:L({cls:"hot",off:[24,26]}),fr:L({off:[24,-30]}),ok:L({cls:"big",off:[0,-50]}),r:L({off:[-20,0],lead:false}),bank:L({off:[30,-10]})}};
  const zoneOfStep=k=>k==="garage"?"garage":TRACKSTEPS.includes(k)?"trail":k==="stop"?"stop":k==="fork"?"fork":["run","work","model"].includes(k)?"ski":k==="turn"?"turn":"all";
  S.view("garage",[GZ.x+1.2,2.3,GZ.z+7.2],[GZ.x+.4,1.15,GZ.z],{min:2,max:20});
  S.view("stop",[SZ.x+14,9.5,SZ.z+20],[SZ.x+14,.2,SZ.z],{min:4,max:50});
  S.view("fork",[FZ.x+1.2,2.3,FZ.z+7.4],[FZ.x+.7,1.25,FZ.z],{min:2,max:20});
  S.view("ski",[KZ.x+.2,5.8,KZ.z+13.6],[KZ.x,1.7,KZ.z],{min:3,max:30});
  S.view("turn",[TZ.x+.4,5.2,TZ.z+7.2],[TZ.x,.2,TZ.z],{min:3,max:30});
  S.view("all",[3,24,101],[3,0,66.5],{min:6,max:90});
  let zone="all",follow=null;S.goView("all",true);
  if(/[?&]debug\b/.test(location.search))try{window.__bike={S,s}}catch(e){}
  const riderW=()=>{const x=s.x,y=s.air?s.y:trackY(Math.max(0,x));return V3(TX0+x,TY0+y,0)};
  const allLabels=[];for(const z in lab)for(const k in lab[z])allLabels.push(lab[z][k]);
  const tl=V3(0,0,0),money=null;
  const drawGraph=(g,w,h,key)=>{const Smp=s.samples,GS=s.ghost&&key==="v"?s.ghost.samples:[],T=Math.max(10,(s.lastRun?s.lastRun.time:30)+4,Smp.length?Smp[Smp.length-1].t:0,GS.length?GS[GS.length-1].t:0);
    const vmax=key==="v"?Math.max(15,...Smp.map(p=>p.v),...GS.map(p=>p.v)):Math.max(100,FINISH+20);const X=tt=>70+tt/T*(w-100),Y=v=>h-50-v/vmax*(h-100);
    g.fillStyle="#fff";g.beginPath();g.roundRect(0,0,w,h,24);g.fill();g.strokeStyle="#C9C2DC";g.lineWidth=3;g.beginPath();g.moveTo(70,30);g.lineTo(70,h-50);g.lineTo(w-24,h-50);g.stroke();
    g.fillStyle="#222A55";g.font="700 24px Instrument Sans, system-ui";g.textAlign="left";g.fillText(key==="v"?"SPEED–TIME":"DISTANCE–TIME",84,40);
    g.fillStyle="#6E6A86";g.font="600 18px Instrument Sans, system-ui";g.fillText(key==="v"?"speed (m/s)":"distance (m)",84,64);g.textAlign="right";g.fillText("time (s) →",w-28,h-18);
    const line=(arr,c,wd,dash)=>{if(arr.length<2)return;g.strokeStyle=c;g.lineWidth=wd;g.setLineDash(dash||[]);g.lineCap="round";g.beginPath();arr.forEach((p,i)=>g[i?"lineTo":"moveTo"](X(p.t),Y(key==="v"?p.v:p.d)));g.stroke();g.setLineDash([])};
    if(GS.length)line(GS,"#B9B3CC",5,[10,8]);line(Smp,key==="v"?P3.deep.blush:P3.deep.sky,6);
    if(Smp.length){const p=Smp[Smp.length-1];g.fillStyle="#222A55";g.beginPath();g.arc(X(p.t),Y(key==="v"?p.v:p.d),9,0,7);g.fill()}};
  return {
    step(st){zone=zoneOfStep(st.k);allLabels.forEach(l=>l.hide());
      if(zone==="trail"){const p=riderW();const far=st.k==="jump";S.view("trail",[p.x+(far?3.5:2.2),p.y+(far?5.6:4.4),far?13.5:9.6],[p.x+1.4,p.y+.8,0],{min:2.5,max:30});S.goView("trail");
        S.setFollow(()=>riderW().add(V3(1.4,.8,0)),.3,true)}
      else{S.setFollow(null);S.goView(zone)}
      const sb={garage:[5,[GZ.x,0,GZ.z]],stop:[22,[SZ.x+18,0,SZ.z]],fork:[5,[FZ.x,0,FZ.z]],ski:[8,[KZ.x,0,KZ.z]],turn:[5,[TZ.x,0,TZ.z]],all:[36,[3,0,68]]};if(sb[zone])S.setShadowBox(...sb[zone])},
    update(s,st,dt,t){const k=st.k,Z=zone;const show=(z,key,c=true)=>lab[z][key].show(Z===z&&c);
      // ---------------- trail
      {const x=s.x,y=s.air?s.y:trackY(Math.max(0,x)),th=s.air?Math.atan2(s.air.vy,s.air.vx)*.6:Math.atan(slope(Math.max(0,x)));
        const B=bikes.trail;B.g.position.set(TX0+x,TY0+y,0);B.g.rotation.z=th;B.update({b:s.b,comp:Math.max(0,s.fc),spin:s.dist/.375,heat:rotorT(),pose:s.attack?0:1,crouch:Math.max(0,s.fc)*1.2,rider:true});
        if(Z==="trail")S.setShadowBox(7,[TX0+x,TY0+y,0]);
        for(let i=0;i<90;i++){const p=s.dust[i];if(p)dustP.put(i,p.x,p.y,((i*37)%10)/10-.5,p.life*.7,p.r*900);else dustP.put(i,0,-99,0,0,1)}dustP.done();
        const ap=s.airPath,na=ap.length,showAir=Z==="trail"&&na>1;for(let i=0;i<140;i++){const j=Math.floor(i/140*na);if(showAir&&i<na&&ap[j])airDots.put(i,ap[j][0],ap[j][1]+.35,0,1);else airDots.put(i,0,-99,0,.001)}airDots.done();
        const tv=V3(Math.cos(th),Math.sin(th),0),nv=V3(-Math.sin(th),Math.cos(th),0),c=V3(x,y,0).addScaledVector(nv,1.0);
        const F=forces(Math.max(0,x),s.v),Wt=M()*g,N=Wt*Math.cos(F.th),par=M()*F.grav,res=M()*(F.roll+F.air),brk=s.brakeN,net=par-res-brk,ks=1/450,on=Z==="trail"&&k==="forces"&&!s.air;
        for(const kk in FA_)FA_[kk].visible=false;
        if(on){FA_.w.set(c,V3(0,-Wt,0),ks);FA_.n.set(c,nv.clone().multiplyScalar(N),ks);FA_.par.set(c.clone().addScaledVector(nv,.12),tv.clone().multiplyScalar(par),ks);FA_.res.set(c.clone().addScaledVector(nv,-.12),tv.clone().multiplyScalar(-res),ks);
          FA_.brk.set(c.clone().addScaledVector(nv,-.28),tv.clone().multiplyScalar(-brk),ks);FA_.net.set(c.clone().addScaledVector(nv,.75),tv.clone().multiplyScalar(net),ks*2)}
        const wl=(v)=>tl.copy(v).add(V3(TX0,TY0,0));
        show("trail","w",on);lab.trail.w.at(wl(c.clone().add(V3(0,-Wt*ks,0)))).set(`Weight<b>${fmt(Wt)} N</b>`);show("trail","n",on);lab.trail.n.at(wl(c.clone().addScaledVector(nv,N*ks))).set(`Normal<b>${fmt(N)} N</b>`);
        show("trail","par",on);lab.trail.par.at(wl(c.clone().addScaledVector(nv,.12).addScaledVector(tv,par*ks))).set(`Down-slope pull<b>${fmt(par)} N</b>`);
        show("trail","res",on);lab.trail.res.at(wl(c.clone().addScaledVector(nv,-.12).addScaledVector(tv,-res*ks))).set(`Friction + air<b>${fmt(res)} N</b>`);
        show("trail","brk",on&&brk>5);lab.trail.brk.at(wl(c.clone().addScaledVector(nv,-.28).addScaledVector(tv,-brk*ks))).set(`Brakes<b>${fmt(brk)} N</b>`);
        show("trail","net",on);lab.trail.net.at(wl(c.clone().addScaledVector(nv,.75).addScaledVector(tv,net*ks*2))).set(`Net force<b>${fmt(net)} N</b><small>${Math.abs(net)<20?"balanced: steady speed":net>0?"speeding up":"slowing down"}</small>`);
        // energy columns and screen ride along behind you
        rideAlong.position.set(x,trackY(Math.max(0,Math.min(TRAIL_END,x))),0);const showE=Z==="trail"&&k==="energy";ecol.forEach(e=>e.g.visible=showE);scrStand.visible=Z==="trail"&&(k==="drop"||k==="graph");
        const Et=Math.max(1,M()*g*(TOP-SFIN.y0)),Ep=M()*g*(TOP-y),Ek=.5*M()*s.v*s.v,Ht=s.heatB+s.heatF;[Ep,Ek,Ht].forEach((E,i)=>{const e=ecol[i],f=S.clamp(E/Et,0,1)*e.H;e.fill.scale.y=Math.max(.002,f);e.fill.position.y=.1+f/2;
          show("trail","e"+i,showE);lab.trail["e"+i].at(wl(V3(x+e.g.position.x,rideAlong.position.y+.1+e.H,e.g.position.z))).set(`${e.n}<b>${kJ(E)}</b>`)});
        show("trail","rot",showE);lab.trail.rot.at(wl(V3(x+.7,y+.38,.1))).set(`Brake rotors<b>${fmt(rotorT())} °C</b>`);
        if(scrStand.visible){const key=k+"|"+s.samples.length+"|"+(s.ghost?s.ghost.samples.length:0);if(key!==scrKey){scrKey=key;scr.redraw((g2,w,h)=>drawGraph(g2,w,h,k==="graph"?"v":"d"))}}
        show("trail","spd");lab.trail.spd.at(wl(V3(x,y+1.9,0))).set(`${fmt(s.v*3.6)} km/h<small>${fmt(s.v,1)} m/s · ${fmt(s.t,1)} s · ${fmt(s.dist)} m</small>`);
        const sg=segAt(Math.max(0,x));show("trail","seg");lab.trail.seg.at(wl(V3(x-1,y+.05,1.4))).set(s.finished?"Finished":sg.n);
        show("trail","crash",!!s.crash||(s.finished&&s.v<.02));lab.trail.crash.at(wl(V3(x,y+1.5,0))).set(s.crash?`${s.crash.split(". ")[0]}.<small>Press Restart</small>`:`${fmt(s.lastRun?s.lastRun.time:s.t,1)} s<small>average ${fmt(s.lastRun?s.lastRun.avg:0,1)} m/s</small>`);
        const jumpOn=k==="jump";show("trail","lip",jumpOn);lab.trail.lip.at(wl(V3(LIP,SLIP.y1+.1,0))).set(`Lip<b>${s.lipV?fmt(s.lipV*3.6)+" km/h":"–"}</b>`);
        show("trail","gap",jumpOn);lab.trail.gap.at(wl(V3((SGAP.x0+SGAP.x1)/2,SGAP.y0,1))).set(`Gap ${fmt(GAP_END-LIP)} m`);
        show("trail","jump",jumpOn&&!!s.jump);if(s.jump)lab.trail.jump.at(wl(V3(LIP+s.jump.dist,trackY(LIP+s.jump.dist)+.2,0))).set(`${fmt(s.jump.dist,1)} m${s.jump.cleared?"":" (short)"}<small>fork used ${fmt(s.jump.forkX*1000)} of ${fmt(TRAVEL()*1000)} mm${s.jump.bottom?" · bottomed out":""}</small>`)}
      // ---------------- stopping distance
      {const N=stopNums(),SCB=1.5,lim=LOGX-.24-1.08*SCB,bx=Math.min(s.sx,lim),hit=N.total>LOGX&&s.sx>=lim,braking=s.sphase==="brake";
        const B=bikes.stop;B.g.position.set(SZ.x+bx,PT,SZ.z);B.g.scale.setScalar(SCB);B.g.rotation.z=hit?-.08:braking?-.02:0;B.update({b:s.b,comp:braking?.45:.05,spin:s.sx/.375,heat:braking?150:0,pose:0,crouch:braking?.4:0,rider:true});
        thinkBar.scale.x=Math.max(.01,N.think);thinkBar.position.x=N.think/2;brakeBar.scale.x=Math.max(.01,N.brake);brakeBar.position.x=N.think+N.brake/2;
        mudS.visible=s.grip==="mud";rootS.visible=s.grip==="roots";
        for(let i=0;i<60;i++){const p=s.sdust[i];if(p)sdustP.put(i,p.x,p.y+.1,((i*37)%10)/10-.5,p.life*.7,p.r*1400);else sdustP.put(i,0,-99,0,0,1)}sdustP.done();
        const sw=v=>tl.set(SZ.x+v.x,PT+v.y,SZ.z+v.z);
        show("stop","bike");lab.stop.bike.at(sw(V3(bx+.6,2.6,0))).set(s.sphase==="ready"?"Press play":s.sphase==="see"?`Log! (reacting…)<small>${fmt(s.v0)} km/h · ${fmt(s.tr,1)} s</small>`:braking?`Brakes on<small>${fmt(s.sv*3.6)} km/h</small>`:N.total>LOGX?"Hit the log":"Stopped");
        show("stop","think");lab.stop.think.at(sw(V3(N.think/2,.05,1.65))).set(`Thinking<b>${fmt(N.think,1)} m</b>`);show("stop","brake");lab.stop.brake.at(sw(V3(N.think+N.brake/2,.05,1.65))).set(`Braking<b>${fmt(N.brake,1)} m</b><small>μ = ${fmt(N.mu,2)} · ${SURF[s.grip]}</small>`);
        show("stop","log");lab.stop.log.at(sw(V3(LOGX,.5,0))).set(`Log<b>${LOGX} m</b>`);show("stop","m0");lab.stop.m0.at(sw(V3(0,.05,1.2))).set("0 m");
        show("stop","res",s.sphase==="stopped");lab.stop.res.at(sw(V3(LOGX-4,3.6,0))).set(`${N.total>LOGX?"Hit the log":"Stopped in time"}: ${fmt(N.total,1)} m`)}
      // ---------------- the fork spring
      {const N=forkNums(),T=N.T,fh=s.fh;ledge.scale.y=fh;ledge.position.set(-1.7,fh/2,0);ledgeTop.position.set(-1.7,fh+.01,0);
        const comp=Math.min(T,s.fx)/T,B=bikes.fork;B.g.position.set(FZ.x+.75,PT+s.fy,FZ.z);B.update({b:s.b,comp,spin:0,heat:0,pose:0,crouch:comp*1.4,rider:true});
        const L0=1.7,Lc=L0*(1-.7*Math.min(1,s.fx/T));bigCoil.position.set(2.9,.06,-.9);bigCoil.scale.set(.24,Lc,.24);plateTop.position.set(2.9,.09+Lc,-.9);
        const f=Math.min(1,s.fx/T),fm=Math.min(1,s.fmax/T);gaugeF.scale.y=Math.max(.002,f*2);gaugeF.position.set(3.7,.06+f,-.9);gaugeM.color.set(s.fmax>=T-.001?P3.product.strawberry:P3.product.butter);gaugeMax.position.set(3.7,.06+fm*2,-.9);
        const FAx=V3(.75+.7,s.fy+.375,.2),Fk=N.k*Math.min(s.fx,T),Wf=N.mf*g;fArrowK.visible=fArrowW.visible=false;if(s.fphase==="squash"||s.fphase==="settled"){fArrowK.set(FAx.clone().add(V3(.15,-.35,0)),V3(0,1,0),Math.max(.15,Fk/4000));}fArrowW.set(V3(.75+.1,s.fy+1.1,.4),V3(0,-1,0),Math.max(.2,Wf/4000)*3);
        const pk=[s.k,s.fh,s.m,Math.round(s.fx*1000),Math.round(s.fmax*1000)].join("|");if(pk!==fpKey){fpKey=pk;fpan.redraw((g2,w,h)=>{g2.fillStyle="#fff";g2.beginPath();g2.roundRect(0,0,w,h,24);g2.fill();
          const Fmax=Math.max(3000,N.k*.25),X=x=>70+x/.25*(w-100),Y=F=>h-50-F/Fmax*(h-100);g2.strokeStyle="#C9C2DC";g2.lineWidth=3;g2.beginPath();g2.moveTo(70,30);g2.lineTo(70,h-50);g2.lineTo(w-24,h-50);g2.stroke();
          g2.fillStyle="#222A55";g2.font="700 24px Instrument Sans, system-ui";g2.textAlign="left";g2.fillText("HOOKE'S LAW  F = kx",84,42);g2.fillStyle="#6E6A86";g2.font="600 18px Instrument Sans, system-ui";g2.fillText("force (N)",84,66);g2.textAlign="right";g2.fillText("compression x (m) →",w-28,h-18);
          g2.strokeStyle=HOT_SKI;g2.setLineDash([8,6]);g2.lineWidth=3;g2.beginPath();g2.moveTo(X(T),30);g2.lineTo(X(T),h-50);g2.stroke();g2.setLineDash([]);g2.fillStyle=HOT_SKI;g2.textAlign="center";g2.fillText(`travel ${fmt(T*1000)} mm`,X(T),26+0);
          g2.strokeStyle=P3.deep.mint;g2.lineWidth=6;g2.lineCap="round";g2.beginPath();g2.moveTo(X(0),Y(0));g2.lineTo(X(Math.min(.25,Fmax/N.k)),Y(Math.min(Fmax,N.k*.25)));g2.stroke();
          const xx=Math.min(s.fx,T);g2.fillStyle="#222A55";g2.beginPath();g2.arc(X(xx),Y(N.k*xx),10,0,7);g2.fill();g2.textAlign="left";g2.font="600 20px IBM Plex Mono, monospace";g2.fillText(`k = ${fmt(N.k)} N/m`,90,96)})}
        const fw=v=>tl.set(FZ.x+v.x,PT+v.y,FZ.z+v.z);
        show("fork","drop");lab.fork.drop.at(fw(V3(-1.7,fh,0))).set(`Ledge<b>${fmt(fh,1)} m</b>`);show("fork","x");lab.fork.x.at(fw(V3(1.45,s.fy+.6,.2))).set(`Fork squash<b>${fmt(s.fx*1000)} mm</b><small>of ${fmt(T*1000)} mm travel${s.fmax>=T-.001?" · bottomed out!":""}</small>`);
        show("fork","F",s.fphase!=="fall"&&s.fphase!=="ready");lab.fork.F.at(fw(FAx.clone().add(V3(.15,-.35+Math.max(.15,Fk/4000),0)))).set(`Spring force F = kx<b>${fmt(Fk)} N</b>`);
        show("fork","W");lab.fork.W.at(fw(V3(.85,s.fy+1.1-Math.max(.2,Wf/4000)*3,.4))).set(`Front weight<b>${fmt(Wf)} N</b><small>45% of ${fmt(M(),1)} kg × g</small>`);
        show("fork","gauge");lab.fork.gauge.at(fw(V3(3.7,2.1,-.9))).set(`Travel used<b>${fmt(f*100)}%</b>`);show("fork","spr");lab.fork.spr.at(fw(V3(2.9,.1+Lc,-.9))).set(`Spring<small>k = ${s.k} N/mm</small>`)}
      // ---------------- garage
      {if(!bikes.garage.g.parent||bikes.garage.g.parent!==turn){turn.add(bikes.garage.g);bikes.garage.g.position.set(-.05,.1,0)}turn.rotation.y=S.REDUCED?.5:.5+Math.sin(t*.3)*.7;
        const Md=MD();bikes.garage.update({b:s.b,comp:.08,spin:s.gspin,heat:0,rider:false});stanM.garage.color.set(Md.stanch);
        const e=S.REDUCED?.6:.5+.5*Math.sin(t*.9),R2=(m,a,b,r)=>setRod(m,a,b,r);
        exF.axle.visible=true;R2(exF.axle,V3(-.55,.35,0),V3(.05,.35,0),.02);R2(exF.lo1,V3(-.37,.38,0),V3(-.37,.98,0),.04);R2(exF.lo2,V3(-.13,.38,0),V3(-.13,.98,0),.04);
        exF.spr.position.set(-.25,1.02+.12*e,0);exF.spr.scale.set(.06,.45,.06);R2(exF.st1,V3(-.37,1.08+.35*e,0),V3(-.37,1.78+.35*e,0),.03);R2(exF.st2,V3(-.13,1.08+.35*e,0),V3(-.13,1.78+.35*e,0),.03);exF.crown.position.set(-.25,1.85+.5*e,0);
        exF.sEye1.position.set(.35,.42,0);R2(exF.sBody,V3(.35,.5+.12*e,0),V3(.35,.95+.12*e,0),.04);R2(exF.sRod,V3(.35,.95+.12*e,0),V3(.35,1.95+.45*e,0),.012);exF.sCoil.position.set(.35,1.0+.3*e,0);exF.sCoil.scale.set(.065,.55,.065);
        exF.sCoil.visible=Md.shock==="coil";exF.sCollar.position.set(.35,1.6+.38*e,0);exF.sEye2.position.set(.35,2.02+.5*e,0);
        const sk=[s.b.model,s.b.wheels,s.b.bars,s.b.colour,s.b.guard,s.b.pod,s.m,s.grip,s.attack].join("|");if(sk!==specKey){specKey=sk;spec.redraw((g2,w,h)=>{g2.fillStyle="#222A55";g2.beginPath();g2.roundRect(0,0,w,h,24);g2.fill();
          g2.fillStyle=COLOURS[s.b.colour].main;g2.beginPath();g2.roundRect(24,22,12,44,6);g2.fill();g2.fillStyle="#fff";g2.font="700 34px Instrument Sans, system-ui";g2.textAlign="left";g2.fillText(Md.n,48,56);
          g2.fillStyle="rgba(255,255,255,.65)";g2.font="600 18px Instrument Sans, system-ui";g2.fillText(`${Md.kind.toUpperCase()} · ${WH().n.toUpperCase()}`,48,84);
          const row=(y,l,v)=>{g2.fillStyle="rgba(255,255,255,.7)";g2.font="600 20px Instrument Sans, system-ui";g2.textAlign="left";g2.fillText(l,28,y);g2.fillStyle="#fff";g2.font="700 24px IBM Plex Mono, monospace";g2.textAlign="right";g2.fillText(v,w-28,y)};
          row(132,"MASS",`${fmt(M(),1)} kg`);row(170,"WEIGHT",`${fmt(M()*g)} N`);row(208,"GRIP μ",`${fmt(MU(),2)}`);row(246,"TRAVEL",`${fmt(TRAVEL()*1000)} mm`);row(284,"DRAG AREA",`${fmt(CDA(),2)} m²`)})}
        const gw=v=>tl.set(GZ.x+v.x,PT+v.y,GZ.z+v.z);
        show("garage","name");lab.garage.name.at(gw(V3(-1,1.5,.1))).set(`${Md.n}<small>${fmt(bikeMass(),1)} kg bike · ${s.m} kg rider</small>`);
        show("garage","fork");lab.garage.fork.at(gw(V3(2.2-.25,1.85+.5*e,-.4))).set(`Fork<small>${Md.fork==="dual"?"dual":"single"} crown · ${fmt(TRAVEL()*1000)} mm travel</small>`);
        show("garage","spring");lab.garage.spring.at(gw(V3(2.2-.25,1.2+.12*e,-.4))).set(`Spring<small>k = ${s.k} N/mm: F = kx</small>`);
        show("garage","shock");lab.garage.shock.at(gw(V3(2.2+.35,1.6+.38*e,-.4))).set(`Rear shock<small>${Md.shock==="coil"?"coil spring":"air spring"}</small>`);
        show("garage","damp");lab.garage.damp.at(gw(V3(2.2+.35,.7,-.4))).set("Damper<small>turns bounce into heat</small>");
        show("garage","wheels");lab.garage.wheels.at(gw(V3(-1.6,.5,.4))).set(`${WH().n}<small>μ ${fmt(MU("dry"),2)} dry · ${fmt(MU("mud"),2)} mud</small>`)}
      // ---------------- NCEA snow run
      {const th=SK.theta(),Ld=Math.min(RUNL,5.2/Math.max(.05,Math.sin(th))),Hh=Ld*Math.sin(th),hx=Ld*Math.cos(th),x0=-hx/2-.6;
        const rk=th.toFixed(4);if(rk!==runKey){runKey=rk;if(runMesh){kz.remove(runMesh);runMesh.geometry.dispose()}const sh=new THREE.Shape();sh.moveTo(x0-1.2,0);sh.lineTo(x0-1.2,Hh);sh.lineTo(x0,Hh);sh.lineTo(x0+hx,.06);sh.lineTo(x0+hx+1.8,.06);sh.lineTo(x0+hx+1.8,0);sh.lineTo(x0-1.2,0);
          const eg=new THREE.ExtrudeGeometry(sh,{depth:1.6,bevelEnabled:true,bevelSize:.05,bevelThickness:.05,bevelSegments:2});eg.translate(0,0,-.8);runMesh=new THREE.Mesh(eg,[mat("plastic","#DCE8F3",{rough:.55}),mat("plastic","#FBFDFF",{rough:.45})]);runMesh.castShadow=runMesh.receiveShadow=true;kz.add(runMesh)}
        const f=s.ski.x/s.ski.L,v=Math.sqrt(2*SK.anet()*s.ski.x);skier.position.set(x0+f*hx,Hh*(1-f)+.06+.05,0);skier.rotation.z=-th*(f<1?1:0);
        const moving=s.ski.phase==="go";for(let i=0;i<50;i++){const p=spr[i];if(p.life<=0&&moving&&Math.random()<.4){p.x=skier.position.x-.3;p.y=skier.position.y;p.z=(Math.random()-.5)*.3;p.vx=-.4-Math.random()*.5;p.vy=.5+Math.random()*.6;p.life=.8}
          if(p.life>0){p.life-=dt;p.vy-=2*dt;p.x+=p.vx*dt;p.y+=p.vy*dt}sprayP.put(i,p.x,p.y,p.z,p.life>0?p.life*.8:0,120)}sprayP.done();
        hBar.scale.y=Math.max(.01,Hh);hBar.position.set(x0+hx+.3,.06+Hh/2,-.95);
        const isModel=k==="model",isWork=k==="work";kcol.forEach(c=>c.g.visible=!isModel);vcol.forEach(c=>c.g.visible=isModel);
        const Ept=SK.ep(),Epf=s.ski.m*g*s.ski.h*f,Ekf=.5*s.ski.m*v*v,lost=Math.max(0,Epf-Ekf);[Epf,Ekf,lost].forEach((E,i)=>{const c=kcol[i],hh=S.clamp(E/Ept,0,1)*c.H;c.fill.scale.y=Math.max(.002,hh);c.fill.position.y=.08+hh/2});
        const vf=SK.vfree();[vf,s.ski.v].forEach((vv,i)=>{const c=vcol[i],hh=vv/20;c.fill.scale.y=hh;c.fill.position.y=.08+hh/2});
        for(const kk in KA)KA[kk].visible=false;const cm=skier.position.clone().add(V3(0,.45,0)),tv=V3(Math.cos(th),-Math.sin(th),0);
        if(isWork){const ks=1/300;KA.w.set(cm,V3(0,-s.ski.m*g,0),ks);KA.par.set(cm.clone().add(V3(0,.1,.2)),tv.clone().multiplyScalar(SK.comp()),ks*2);KA.res.set(cm.clone().add(V3(0,.1,-.2)),tv.clone().multiplyScalar(-SK.fres()),ks*2)}
        const kw=v2=>tl.set(KZ.x+v2.x,PT+v2.y,KZ.z+v2.z);
        show("ski","v");lab.ski.v.at(kw(skier.position.clone().add(V3(0,.8,0)))).set(s.ski.phase==="go"?`${fmt(v,1)} m/s<small>${fmt(s.ski.t,1)} s</small>`:s.ski.phase==="done"?`Bottom: ${fmt(s.ski.v,1)} m/s<small>in ${fmt(s.ski.t,1)} s</small>`:"Press play");
        show("ski","h");lab.ski.h.at(kw(V3(x0+hx+.3,.06+Hh/2,-.95))).set(`h = ${fmt(s.ski.h)} m`);show("ski","track");lab.ski.track.at(kw(V3(x0+hx*.45,Hh*.55+.2,.8))).set(`track ${fmt(s.ski.L)} m · θ = ${fmt(th*180/Math.PI,1)}°`);
        kcol.forEach((c,i)=>{show("ski","c"+i,!isModel);lab.ski["c"+i].at(kw(V3(c.g.position.x,.1+c.H,1.55))).set(`${c.n}<b>${kJ(i===0?Ept:i===1?SK.ek():Math.max(0,Ept-SK.ek()))}</b>${i===2?`<small>${fmt(SK.loss()*100)}% dissipated</small>`:""}`)});
        show("ski","w",isWork);lab.ski.w.at(kw(cm.clone().add(V3(0,-s.ski.m*g/300,0)))).set(`mg<b>${fmt(s.ski.m*g)} N</b>`);show("ski","par",isWork);lab.ski.par.at(kw(cm.clone().add(V3(0,.1,.2)).addScaledVector(tv,SK.comp()/150))).set(`mg sin θ<b>${fmt(SK.comp())} N</b>`);
        show("ski","res",isWork);lab.ski.res.at(kw(cm.clone().add(V3(0,.1,-.2)).addScaledVector(tv,-SK.fres()/150))).set(`Resistance ≈<b>${fmt(SK.fres())} N</b><small>W ÷ d</small>`);
        show("ski","v0",isModel);lab.ski.v0.at(kw(V3(vcol[0].g.position.x,.1+vf/20,1.55))).set(`Frictionless<b>${fmt(vf,1)} m/s</b>`);show("ski","v1",isModel);lab.ski.v1.at(kw(V3(vcol[1].g.position.x,.1+s.ski.v/20,1.55))).set(`Real<b>${fmt(s.ski.v)} m/s</b><small>model is ${fmt((vf/s.ski.v-1)*100)}% too fast</small>`)}
      // ---------------- NCEA check turn
      {const r=s.ski.r,rr=Math.min(3.3,r*.034),vt=s.ski.vt,ok=vt<=SK.vmax(),key=r+"|"+SK.bank().toFixed(2);
        if(key!==trackKey){trackKey=key;if(track){tzn.remove(track);track.geometry.dispose()}track=S.torus(rr,.09,mat("plastic","#B9C7D6",{rough:.6}),{rot:[Math.PI/2,0,0],rs:8,ts:96});track.scale.set(1,1,.3);track.position.y=.07;tzn.add(track)}
        const w=Math.min(2.5,vt/Math.max(rr,.3)*.15);const cyc=ok?1e9:(Math.PI*.7)/w+1.4,tt=(t%cyc);let ang,pos;
        if(ok||tt<(Math.PI*.7)/w){ang=(ok?t*w:tt*w);pos=V3(Math.cos(ang)*rr,.08,-Math.sin(ang)*rr)}else{const a0=Math.PI*.7,d=(tt-a0/w)*vt*.12;ang=a0;pos=V3(Math.cos(a0)*rr,.08,-Math.sin(a0)*rr).add(V3(-Math.sin(a0),0,-Math.cos(a0)).multiplyScalar(d))}
        tskier.position.copy(pos);tskier.rotation.set(0,ang+Math.PI,0);const lean=Math.atan(vt*vt/(r*g));tskier.rotateX(Math.min(.9,lean)*(ok?1:.6));
        const inward=V3(-Math.cos(ang),0,Math.sin(ang)),tang=V3(-Math.sin(ang),0,-Math.cos(ang)),cm=pos.clone().add(V3(0,.35,0));for(const kk in TA)TA[kk].visible=false;
        TA.fc.set(cm,inward,Math.min(3,SK.fc()/500));TA.fr.set(cm.clone().add(V3(0,.18,0)),inward,Math.min(3,s.ski.mu*s.ski.m*g/500));TA.v.set(cm.clone().add(V3(0,-.12,0)),tang,Math.min(1.5,vt/16));
        for(let i=0;i<40;i++){const p=tsp[i];if(p.life<=0&&Math.random()<(ok?.15:.5)){p.x=pos.x;p.y=.12;p.z=pos.z;const o2=ok?.3:1;p.vx=(Math.random()-.5)*o2-tang.x*.3;p.vz=(Math.random()-.5)*o2-tang.z*.3;p.life=.7}
          if(p.life>0){p.life-=dt;p.x+=p.vx*dt;p.z+=p.vz*dt}tspray.put(i,p.x,p.y+.05,p.z,p.life>0?p.life:0,90)}tspray.done();
        const tw=v2=>tl.set(TZ.x+v2.x,PT+v2.y,TZ.z+v2.z);
        show("turn","fc");lab.turn.fc.at(tw(cm.clone().addScaledVector(inward,Math.min(3,SK.fc()/500)))).set(`Needs mv²/r<b>${fmt(SK.fc())} N</b>`);
        show("turn","fr");lab.turn.fr.at(tw(cm.clone().add(V3(0,.18,0)).addScaledVector(inward,Math.min(3,s.ski.mu*s.ski.m*g/500)))).set(`Friction can give μmg<b>${fmt(s.ski.mu*s.ski.m*g)} N</b>`);
        show("turn","ok");lab.turn.ok.cls(ok?"big":"hot big");lab.turn.ok.at(tw(V3(0,1.2,-rr))).set(ok?`Holds the turn<small>v max = √(μgr) = ${fmt(SK.vmax(),1)} m/s</small>`:`Skids out<small>v max = √(μgr) = ${fmt(SK.vmax(),1)} m/s</small>`);
        show("turn","r");lab.turn.r.at(tw(V3(0,.1,0))).set(`r = ${fmt(r)} m`);show("turn","bank");lab.turn.bank.at(tw(V3(rr+.1,.1,0))).set(`Level 3 berm<b>${fmt(SK.bank(),1)}°</b><small>tan θ = v²/(rg)</small>`)}
    }};
}
const api=StudyKit.mount({kupu:KUPU,caseTint:"peach",scene3d:bike3d,
  eyebrow:"Science · Forces and motion", title:"The downhill machine", crumb:"Year 9 and 10 Science · forces, motion and energy, with NCEA Level 1 ideas, plus four NCEA Level 2–3 steps on a ski run (AS91171, AS91524)", homeHash:"y9",
  fig:"FIG. 10 · THE REDWOODS, WHAKAREWAREWA FOREST", railTitle:"Build it, ride the physics",
  badge:{label:"Years 9–11 · NCEA L2 91171 · L3 91524"},
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
    {type:"range",id:"fh",label:"Drop height",min:0.3,max:2,step:0.1,get:()=>s.fh,set:(x,v)=>{s.fh=Math.round(v*10)/10;resetFork();s.fphase="ready"},fmt:()=>fmt(s.fh,1)+" m"},
    {type:"range",id:"skm",label:"Skier mass",min:40,max:110,step:1,get:()=>s.ski.m,set:(x,v)=>{s.ski.m=v},fmt:()=>s.ski.m+" kg"},
    {type:"range",id:"skh",label:"Vertical drop",min:20,max:250,step:5,get:()=>s.ski.h,set:(x,v)=>{s.ski.h=v;if(s.ski.L<s.ski.h)s.ski.L=s.ski.h;resetSki()},fmt:()=>s.ski.h+" m"},
    {type:"range",id:"skl",label:"Track length",min:100,max:1000,step:10,get:()=>s.ski.L,set:(x,v)=>{s.ski.L=Math.max(v,s.ski.h);resetSki()},fmt:()=>s.ski.L+" m"},
    {type:"range",id:"skv",label:"Real exit speed",min:5,max:60,step:1,get:()=>s.ski.v,set:(x,v)=>{s.ski.v=Math.min(v,Math.floor(SK.vfree()));resetSki()},fmt:()=>`${s.ski.v} m/s · ${fmt(s.ski.v*3.6)} km/h`},
    {type:"range",id:"skr",label:"Turn radius",min:10,max:120,step:5,get:()=>s.ski.r,set:(x,v)=>{s.ski.r=v},fmt:()=>s.ski.r+" m"},
    {type:"range",id:"skvt",label:"Entry speed",min:5,max:30,step:1,get:()=>s.ski.vt,set:(x,v)=>{s.ski.vt=v},fmt:()=>s.ski.vt+" m/s"},
    {type:"range",id:"skmu",label:"Snow grip μ",min:0.1,max:0.8,step:0.05,get:()=>s.ski.mu,set:(x,v)=>{s.ski.mu=Math.round(v*100)/100},fmt:()=>fmt(s.ski.mu,2)}],
  tick:(x,dt,st)=>{const d=dt*(s.slow?0.35:1);if(st.k==="garage"){s.gspin+=dt*2.2}
    else if(SKISTEPS.includes(st.k)){tickSki(dt)}
    else if(TRACKSTEPS.includes(st.k)){if(!s.crash&&!(s.finished&&s.v<=0.01))tickTrail(d)}else if(st.k==="stop"){if(s.sphase!=="stopped")tickStop(d)}else if(st.k==="fork"){if(s.fphase==="ready")s.fphase="fall";if(s.fphase!=="settled")tickFork(d)}},
  drawMain:(x,st)=>st.k==="garage"?drawGarage():SKISTEPS.includes(st.k)?drawSki(st):TRACKSTEPS.includes(st.k)||st.k==="test"?drawTrail(st):st.k==="stop"?drawStop():drawFork(),
  drawClose:(x,st)=>FG.floor(420,260)+(st.k==="garage"?specCard():SKISTEPS.includes(st.k)?skiPanel(st):st.k==="drop"?graph("d"):st.k==="graph"?graph("v"):st.k==="forces"?fbd():st.k==="energy"?energyBars():st.k==="jump"?jumpPanel():st.k==="stop"?stopPanel():st.k==="fork"?springPanel():graph("v")),
  chips:()=>{const F=forces(s.x,s.v),net=M()*F.grav-M()*(F.roll+F.air)-s.brakeN,N=stopNums(),K=forkNums();return{
    mass:["MASS",fmt(M(),1)+" kg"],weight:["WEIGHT",fmt(M()*g)+" N",true],mu:["GRIP μ",fmt(MU(),2)+" "+(s.grip==="dry"?"dry":s.grip==="mud"?"mud":"roots")],travel:["TRAVEL",fmt(TRAVEL()*1000)+" mm"],cda:["DRAG AREA",fmt(CDA(),2)+" m²"],
    time:["TIME",fmt(s.t,1)+" s"],dist:["DISTANCE",fmt(s.dist)+" m"],speed:["SPEED",`${fmt(s.v,1)} m/s · ${fmt(s.v*3.6)} km/h`,true],avg:["AVERAGE",s.t>0.5?fmt(s.dist/s.t,1)+" m/s":"–"],
    accel:["ACCELERATION",fmt(s.aNow,1)+" m/s²"],net:["NET FORCE",fmt(net)+" N",true],drag:["AIR",fmt(M()*F.air)+" N"],
    ep:["Ep LOST",kJ(M()*g*(TOP-s.y))],ek:["Ek",kJ(0.5*M()*s.v*s.v),true],heat:["HEAT",kJ(s.heatB+s.heatF)],rotor:["ROTORS",fmt(rotorT())+" °C"],
    lip:["LIP SPEED",s.lipV?fmt(s.lipV*3.6)+" km/h":"–",true],flew:["JUMP",s.jump?fmt(s.jump.dist,1)+" m":"–"],
    think:["THINKING",fmt(N.think,1)+" m"],brake:["BRAKING",fmt(N.brake,1)+" m"],stopd:["STOPPING",fmt(N.total,1)+" m",true],
    k:["k",fmt(K.k)+" N/m"],comp:["LANDING SQUASH",fmt(K.x*1000)+" mm",K.x>K.T],force:["SPRING FORCE",fmt(K.F)+" N"],
    skep:["Ep = mgh",kJ(SK.ep())],skek:["Ek = ½mv²",kJ(SK.ek()),true],skloss:["DISSIPATED",fmt(SK.loss()*100)+"%",true],skv:["REAL EXIT SPEED",`${fmt(s.ski.v)} m/s`],skvfree:["FRICTIONLESS √(2gh)",`${fmt(SK.vfree(),1)} m/s`,true],
    sktheta:["SLOPE θ",`${fmt(SK.theta()*180/Math.PI,1)}° (sin θ = ${fmt(Math.sin(SK.theta()),2)})`],skcomp:["mg sin θ",`${fmt(SK.comp())} N`,true],skfres:["AVERAGE RESISTANCE",`${fmt(SK.fres())} N`],ska:["AVERAGE a",`${fmt(SK.anet(),2)} m/s²`],
    skfc:["NEEDS mv²/r",`${fmt(SK.fc())} N`,true],skfmax:["FRICTION CAN GIVE",`${fmt(s.ski.mu*s.ski.m*g)} N`],skvmax:["v MAX = √(μgr)",`${fmt(SK.vmax(),1)} m/s`,s.ski.vt>SK.vmax()],skbank:["BERM ANGLE",`${fmt(SK.bank(),1)}°`]}},
  challenges:CH,
  papers:[{label:"NZQA: Physics, Earth and Space Science",url:"https://www2.nzqa.govt.nz/ncea/subjects/past-exams-and-exemplars/physics-earth-and-space-science/"},{label:"NZQA: Science past exams",url:"https://www2.nzqa.govt.nz/ncea/subjects/past-exams-and-exemplars/"},{label:"NZQA: L2 Physics 91171 (mechanics)",url:"https://www.nzqa.govt.nz/ncea/assessment/view-detailed.do?standardNumber=91171"},{label:"NZQA: L3 Physics 91524 (mechanical systems)",url:"https://www.nzqa.govt.nz/ncea/assessment/view-detailed.do?standardNumber=91524"}],
  truth:"The NCEA ski-run steps use the practice pack's figures (120 m drop over 400 m, 72 kg, 34 m/s); the turn's radius, entry speed and snow grip μ are estimates, and the skier is animated at three times real time with a constant average acceleration. A fictional trail inspired by the Redwoods, Whakarewarewa Forest, Rotorua. Uses g = 9.8 N/kg and air density 1.2 kg/m³. Bike masses (14.5–18.4 kg), drag areas (0.47–0.65 m²), rolling resistance (0.03–0.08) and tyre grip (μ 0.22–0.78) are typical estimates, not measurements of real bikes. The fork spring also stands in for your legs, so k is stiffer than a real fork spring. Rotor temperatures assume all the braking heat stays in the rotors (a top estimate; real rotors also lose heat to the air). The rider brakes to hold the speed you choose. Bikes and riders are drawn larger than the trail so you can see them.",
  footer:"Covers Year 9–10 forces and motion: mass and weight, speed, distance–time and speed–time graphs, balanced and unbalanced forces, a = F/m, Ep and Ek, heat and Q = mcΔT, projectiles, stopping distance, pressure and Hooke's law. Energy ideas link to NCEA L1 AS 92047. The four NCEA steps cover L2 AS91171 (energy conservation, work, force components, circular motion) and L3 AS91524 (circular motion with multiple forces, banked turns)."
});

garageUI.build();tipUI.build();garageUI.show(api.step.k==="garage");tipUI.set(api.step.k);
try{document.getElementById("k-snd").addEventListener("click",()=>snd.syncMute())}catch(e){}
// ride sounds follow the simulation
(function loop(){const st=api.step;let v=0,br=0;
  if(s.playing&&TRACKSTEPS.includes(st.k)&&!s.crash){v=s.v;br=s.air?0:s.brakeN}
  else if(s.playing&&st.k==="stop"&&(s.sphase==="see"||s.sphase==="brake")){v=s.sv;br=s.sphase==="brake"?M()*MU()*g:0}
  snd.update(v,br,v>0);requestAnimationFrame(loop)})();
})();
