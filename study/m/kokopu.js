(()=>{
/* The kōkopu machine: a banded kōkopu (Galaxias fasciatus) in a shaded stream pool, for NCEA Level 3 Biology AS 91603
   (responses of plants and animals to their external environment). One model drives the drawing, the 3D bench and the
   challenges: a biological clock (zeitgeber, entrainment, free-running), a fish that hunts by its lateral line at night,
   eggs that wait out of the water for a second flood, and a choice chamber where whitebait follow adult odour. */
const K=StudyKit,TAU=Math.PI*2;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),lerp=(a,b,t)=>a+(b-a)*t;
const wrap24=h=>((h%24)+24)%24, wrapPi=a=>{while(a>Math.PI)a-=TAU;while(a<-Math.PI)a+=TAU;return a};
const hm=h=>{h=wrap24(h);const H=Math.floor(h),M=Math.floor((h-H)*60);return String(H).padStart(2,"0")+":"+String(M).padStart(2,"0")};

// ---------------------------------------------------------------- the model
const FREE=24.7;                        // illustrative free-running period in constant darkness (hours)
const POOL={x0:-3.7,x1:2.15,z0:-1.75,z1:2.0,floor:.62,surf:2.05};
const BANK={x:-3.05,y:.78,z:-1.45};      // the dark gap under the undercut bank, where the fish rests by day
const SHELF={x0:2.75,top:2.18};         // the grassy margin that only floods in high water
const s={
  hour:12,day:0,light:"LD",onset:18.5,dur:9.5,rec:[],ddDays:0,shiftDays:0,
  f:{x:-.6,y:1.35,z:.5,h:Math.PI,v:.35,tx:0,ty:1.35,tz:0,mode:"cruise",strike:0},
  moths:[],caught:0,missed:0,llBlock:false,mid:0,
  fday:0,level:0,floodT:-1,eggs:"none",eggAge:0,hatchT:-1,note:"",wetEarly:false,
  mz:{odour:"kokopu",flow:true,metal:false,fish:[],a:0,b:0},
  part:"",seed:11};
function rnd(){let t=s.seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}

// the clock: lights go off at 18:00 (or 00:00 after a 6-hour shift); 12 hours of dark
const darkStart=l=>l==="shift"?0:18;
const isDark=(l,h)=>l==="DD"||wrap24(h-darkStart(l))<12;
const isActive=h=>wrap24(h-s.onset)<s.dur;
const phaseErr=()=>{let e=wrap24(darkStart(s.light)+.5-s.onset);if(e>12)e-=24;return e};
function newDay(){s.rec.push({light:s.light,bins:new Array(48).fill(0),dark:new Array(48).fill(0)});if(s.rec.length>12)s.rec.shift()}
function clockReset(light){s.light=light||s.light;s.hour=12;s.day=0;s.rec=[];newDay();s.ddDays=0;s.shiftDays=0;
  if(s.light!=="DD")s.onset=darkStart(s.light)+.5}
function setLight(l){if(l===s.light)return;s.light=l;s.ddDays=0;s.shiftDays=0}
function clockTick(dt){const step=dt*6;   // 6 model hours per second: a day every 4 seconds
  for(let k=0;k<4;k++){const d=step/4;const prev=s.hour;s.hour+=d;
    const r=s.rec[s.rec.length-1];const bin=Math.floor(wrap24(s.hour)*2)%48;
    if(r){r.bins[bin]=isActive(s.hour)&&rnd()>.04?1:(rnd()<.015?1:r.bins[bin]);r.dark[bin]=isDark(s.light,s.hour)?1:0}
    if(s.hour>=24){s.hour-=24;s.day++;
      // once a day the clock is nudged: towards dusk by the light cue (at most 1.5 h a day), or it drifts by its own period
      if(s.light==="DD"){s.onset=wrap24(s.onset+(FREE-24));s.ddDays++}
      else{const e=phaseErr();s.onset=wrap24(s.onset+clamp(e,-1.5,1.5));if(s.light==="shift")s.shiftDays++}
      newDay()}}}

// the pool fish: a small steering model (heading h: 0 = towards +x)
function steer(dt,tx,ty,tz,spd,turn=1.8){const f=s.f;const dx=tx-f.x,dz=tz-f.z,dist=Math.hypot(dx,dz);
  const want=Math.atan2(-dz,dx);const dh=wrapPi(want-f.h);f.h=wrapPi(f.h+clamp(dh,-turn*dt,turn*dt));
  const sp=dist<.15?0:spd*(1-.55*Math.min(1,Math.abs(dh)/1.6))*Math.min(1,dist/.6+.25);f.v=lerp(f.v,sp,1-Math.pow(.02,dt));
  f.x+=Math.cos(f.h)*f.v*dt;f.z+=-Math.sin(f.h)*f.v*dt;f.y=lerp(f.y,ty,1-Math.pow(.25,dt));
  const flood=s.level>.55;f.x=clamp(f.x,POOL.x0,flood?4.1:POOL.x1);f.z=clamp(f.z,POOL.z0,POOL.z1);return dist}
function wander(k){const f=s.f;f.tx=lerp(k==="flood"?-.6:POOL.x0+.4,POOL.x1-.3,rnd());f.tz=lerp(POOL.z0+.3,POOL.z1-.3,rnd());f.ty=lerp(1.0,1.65,rnd())}
const mothTarget=()=>{if(s.llBlock)return null;let best=null,bd=3.4;for(const m of s.moths){if(m.state!=="on")continue;const d=Math.hypot(m.x-s.f.x,m.z-s.f.z);if(d<bd){bd=d;best=m}}return best};
function dropMoth(x,z){if(s.moths.filter(m=>m.state==="on").length>=3)return;
  s.moths.push({id:++s.mid,x:x??lerp(POOL.x0+.4,POOL.x1-.3,rnd()),z:z??lerp(POOL.z0+.3,POOL.z1-.3,rnd()),t:0,state:"on"})}
function fishTick(dt,k){const f=s.f;let mode="cruise";
  const night=k==="ripples"||((k==="night"||k==="freerun"||k==="test")&&isActive(s.hour));
  const resting=(k==="night"||k==="freerun"||k==="test")&&!isActive(s.hour);
  const moth=(k==="ripples"||k==="test")?mothTarget():null;
  if(k==="fish")mode="hold";else if(moth)mode="hunt";else if((k==="flood"||k==="test")&&s.floodT>=0&&s.level>.15&&s.eggs==="none")mode="spawn";else if(resting)mode="rest";
  f.mode=mode;
  if(mode==="hold"){f.x=lerp(f.x,.55+Math.sin(performance.now()/5000)*.12,1-Math.pow(.3,dt));f.z=lerp(f.z,1.0,1-Math.pow(.3,dt));f.y=lerp(f.y,1.4,1-Math.pow(.3,dt));f.h=wrapPi(f.h+clamp(wrapPi(Math.PI-f.h),-dt,dt));f.v=.12}
  else if(mode==="rest"){steer(dt,BANK.x,BANK.y,BANK.z,.5,1.4);if(Math.hypot(f.x-BANK.x,f.z-BANK.z)<.35)f.h=wrapPi(f.h+clamp(wrapPi(-.25-f.h),-dt*.8,dt*.8))}
  else if(mode==="hunt"){const d=steer(dt,moth.x,f.strike>0?POOL.surf-.12:1.75,moth.z,1.5,2.6);
    if(d<.45)f.strike+=dt;else f.strike=Math.max(0,f.strike-dt);
    if(d<.32&&f.y>POOL.surf-.5){moth.state="caught";moth.t=0;s.caught++;f.strike=0;K.sfx&&K.sfx("pop")}}
  else if(mode==="spawn"){steer(dt,3.4,s.level>.6?2.4:1.9,f.tz||.4,2.2,3);if(!f.tz||Math.abs(f.tz)>1.8)f.tz=lerp(-1.4,1.4,rnd())}
  else{if(Math.hypot(f.tx-f.x,f.tz-f.z)<.5||f.tx===0)wander(k);if(f.tx>POOL.x1)wander(k);steer(dt,f.tx,f.ty,f.tz,night?.85:.55)}}
function mothTick(dt){for(const m of s.moths){m.t+=dt;if(m.state==="on"&&m.t>8){m.state="away";m.t=0;s.missed++}}
  s.moths=s.moths.filter(m=>m.state==="on"||m.t<1.2)}

// floods and eggs: spawning on the first high flow, 3–4 weeks of development out of the water, hatching on the next flood
const READY=21;
function floodLevel(t){if(t<0)return 0;if(t<1)return t;if(t<5)return 1;if(t<6.5)return 1-(t-5)/1.5;return 0}
function sendFlood(){if(s.floodT>=0&&s.floodT<6.5)return;s.floodT=0;s.wetEarly=false}
function floodTick(dt){s.fday+=dt*2;                      // two model days a second
  if(s.floodT>=0){s.floodT+=dt;s.level=floodLevel(s.floodT);if(s.floodT>6.5){s.floodT=-1;s.level=0}}
  if((s.eggs==="dev"||s.eggs==="ready")&&s.level<.5){s.eggAge+=dt*2;if(s.eggAge>=READY)s.eggs="ready"}
  if(s.level>.55){
    if(s.eggs==="none"&&s.f.mode==="spawn"&&s.f.x>2.7){s.eggs="dev";s.eggAge=0;s.note="Eggs laid in the flooded grass"}
    else if(s.eggs==="ready"){s.eggs="hatched";s.hatchT=0;s.note="The second flood: the eggs hatch and the larvae are swept downstream";K.sfx&&K.sfx("win")}
    else if(s.eggs==="dev"&&s.eggAge<READY&&!s.wetEarly){s.wetEarly=true;s.note="Wet again, but not ready: the embryos need 3–4 weeks"}}
  if(s.hatchT>=0)s.hatchT+=dt}
function resetBank(){s.eggs="none";s.eggAge=0;s.fday=0;s.hatchT=-1;s.note="";s.floodT=-1;s.level=0}

// the choice chamber: a trunk into the current, then two arms. Arm A carries water from an adult tank, arm B plain stream water
const MZ={trunk:3.6,arm:3.7};
const attractive=()=>s.mz.flow&&s.mz.odour==="kokopu"&&!s.mz.metal;
function release(n=20){const fs=s.mz.fish;for(let i=0;i<n;i++)fs.push({seg:"trunk",t:rnd()*.08,lat:(rnd()-.5)*.5,arm:null,counted:false,sp:.8+rnd()*.5,wig:rnd()*TAU});
  while(fs.length>80)fs.shift()}
function clearMaze(){s.mz.fish=[];s.mz.a=0;s.mz.b=0}
function mazeTick(dt){const z=s.mz;
  for(const f of z.fish){f.wig+=dt*9;
    if(f.seg==="trunk"){if(z.flow)f.t+=dt*f.sp*.24*(rnd()<.03?0:1);else f.t=clamp(f.t+(rnd()-.5)*dt*.9,0,.7);
      f.lat=clamp(f.lat+(rnd()-.5)*dt*.6,-.28,.28);
      if(f.t>=1){f.seg="arm";f.t=0;const pA=attractive()?.82:.5;f.arm=rnd()<pA?"A":"B"}}
    else{f.t=Math.min(.92,f.t+dt*f.sp*(z.flow?.22:.05));f.lat=clamp(f.lat+(rnd()-.5)*dt*.6,-.28,.28);
      if(!f.counted&&f.t>.45){f.counted=true;if(f.arm==="A")z.a++;else z.b++}}}}
const mazeStats=()=>{const z=s.mz,n=z.a+z.b;return{n,pref:n?z.a/n:0,base:z.fish.filter(f=>f.seg==="trunk").length}};
const ODOUR={kokopu:"Adult banded kōkopu",inanga:"Adult īnanga",koaro:"Adult kōaro",none:"No fish (plain water)"};

function tick(st0,dt,st){const k=st.k;
  if(k==="night"||k==="freerun"||k==="test")clockTick(dt);
  if(k!=="maze")fishTick(dt,k);
  if(k==="ripples"||k==="test")mothTick(dt);
  if(k==="flood"||k==="test")floodTick(dt);
  if(k==="maze"||k==="test")mazeTick(dt)}

// ---------------------------------------------------------------- 2D drawings (the fallback, and the close-up graphs)
const INK="#222A55",MUTED="#6E6A86",SEA="#BFDDF5",DEEP="#2A7D63",OLIVE="#6B5B33",BAND="#E9DB9F",CREAM="#F1E8CF";
const FS=`font-family="Instrument Sans,system-ui,sans-serif"`;
const txt=(x,y,t,o="")=>`<text x="${x}" y="${y}" ${FS} font-size="11" fill="${INK}" ${o}>${t}</text>`;
// a side view of a banded kōkopu, snout to the right, length l
function fishPath(l){const P=[[0,.02],[.02,.36],[.06,.62],[.12,.82],[.24,.98],[.38,1],[.52,.93],[.66,.78],[.78,.6],[.88,.46],[.9,.44]];
  const H=.085*l;const top=P.map(([u,h])=>[l*(1-u),-h*H*1.04]),bot=P.slice().reverse().map(([u,h])=>[l*(1-u),h*H*.92]);
  return "M"+top.map(p=>p[0].toFixed(1)+","+p[1].toFixed(1)).join(" L")+" L"+bot.map(p=>p[0].toFixed(1)+","+p[1].toFixed(1)).join(" L")+"Z"}
function fishSVG(x,y,l,flip,o={}){const H=.085*l;
  let g=`<g transform="translate(${x},${y}) scale(${flip?-1:1},1) translate(${-l/2},0)">`;
  // caudal, dorsal and anal fins set far back, pectoral low behind the head
  g+=`<path d="M${l*.13},${-H*.4} L${-l*.02},${-H*1.05} Q${-l*.05},0 ${-l*.02},${H*1.05} L${l*.13},${H*.4}Z" fill="#B99A5B" opacity=".85"/>`;
  g+=`<path d="M${l*.34},${-H*.78} Q${l*.29},${-H*1.75} ${l*.22},${-H*1.5} L${l*.2},${-H*.62}Z" fill="#B99A5B" opacity=".85"/>`;
  g+=`<path d="M${l*.33},${H*.62} Q${l*.28},${H*1.5} ${l*.21},${H*1.3} L${l*.2},${H*.5}Z" fill="#B99A5B" opacity=".85"/>`;
  g+=`<path d="${fishPath(l)}" fill="${OLIVE}" stroke="#3E3622" stroke-width="1"/>`;
  g+=`<path d="${fishPath(l)}" fill="url(#kbelly)"/>`;
  for(let i=0;i<14;i++){const u=.24+i*.048;const xx=l*(1-u);g+=`<path d="M${xx},${-H*.95} q${-l*.012},${H*.5} ${l*.004},${H*1.2}" stroke="${BAND}" stroke-width="${l*.008}" fill="none" opacity="${.5+.4*(i/14)}" stroke-linecap="round"/>`}
  g+=`<path d="M${l*.84},${-H*.6} q${-l*.02},${H*.6} 0,${H*1.1}" stroke="#3E3622" stroke-width="1.2" fill="none" opacity=".6"/>`;
  g+=`<ellipse cx="${l*.8}" cy="${H*.15}" rx="${l*.025}" ry="${H*.2}" fill="#BFD6E8" opacity=".9"/>`;
  g+=`<path d="M${l*.82},${H*.35} q${-l*.06},${H*.5} ${-l*.11},${H*.45}" stroke="#B99A5B" stroke-width="${l*.03}" fill="none" stroke-linecap="round" opacity=".9"/>`;
  g+=`<path d="M${l*.84},${-H*.05} L${l*.1},${-H*.08}" stroke="${o.ll?"#2AA88A":"#D8CB94"}" stroke-width="${o.ll?2.4:1}" fill="none" opacity="${o.ll?1:.6}" stroke-dasharray="${o.ll?"":"3 2"}"/>`;
  g+=`<circle cx="${l*.93}" cy="${-H*.32}" r="${l*.03}" fill="#C79A3E"/><circle cx="${l*.935}" cy="${-H*.32}" r="${l*.017}" fill="#151515"/>`;
  return g+`</g>`}
const DEFS=`<defs><linearGradient id="kbelly" x1="0" y1="0" x2="0" y2="1"><stop offset=".45" stop-color="${CREAM}" stop-opacity="0"/><stop offset=".8" stop-color="${CREAM}" stop-opacity=".95"/></linearGradient>
<linearGradient id="kwater" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#CFE6F6"/><stop offset="1" stop-color="#A9CFE6"/></linearGradient></defs>`;
function poolSVG(night,level){let o=`<rect x="30" y="40" width="580" height="250" rx="16" fill="${night?"#2B3466":"#FFFFFF"}" stroke="#DCD6EA"/>`;
  const wy=lerp(120,84,level);o+=`<rect x="44" y="${wy}" width="552" height="${270-wy}" rx="8" fill="url(#kwater)" opacity="${night?.55:.9}"/>`;
  o+=`<path d="M44,270 Q140,250 230,262 T420,258 T596,262 L596,276 L44,276Z" fill="#CBBFA9"/>`;
  o+=`<path d="M44,${wy-6} L170,${wy-6} L170,${wy+52} Q120,${wy+70} 44,${wy+60}Z" fill="#8A6E4E"/>`;
  o+=`<path d="M500,${120} L596,${110} L596,276 L500,276Z" fill="#B9A887"/>`;
  for(let i=0;i<14;i++)o+=`<path d="M${506+i*6.5},118 q3,-16 ${(i%3)-1}, -28" stroke="#6E9A55" stroke-width="2" fill="none"/>`;
  return o}
function actogram(x,y,w,h){const rows=10,rec=s.rec.slice(-rows);const rh=h/rows;let o=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#FFFFFF" stroke="#DCD6EA"/>`;
  // double-plotted: each row shows day n then day n+1, so a drifting rhythm reads as a slanted line
  rec.forEach((r,i)=>{const nx=rec[i+1];const yy=y+i*rh;
    for(let b=0;b<96;b++){const src=b<48?r:nx;if(!src)continue;const bb=b%48;const xx=x+b*w/96;
      if(src.dark[bb])o+=`<rect x="${xx}" y="${yy}" width="${w/96+.3}" height="${rh}" fill="#E6E2F0"/>`;
      if(src.bins[bb])o+=`<rect x="${xx}" y="${yy+rh*.25}" width="${w/96+.3}" height="${rh*.6}" fill="${INK}"/>`}});
  for(let hh=0;hh<=48;hh+=6){const xx=x+hh*w/48;o+=`<line x1="${xx}" y1="${y+h}" x2="${xx}" y2="${y+h+4}" stroke="${MUTED}"/>`+txt(xx-6,y+h+15,String(hh%24).padStart(2,"0"),`font-size="9" fill="${MUTED}"`)}
  return o+txt(x,y-6,"Actogram (double-plotted): each row is one day and the next",`font-size="10" fill="${MUTED}"`)}

function drawMain(st0,st){const k=st.k;let o=DEFS;
  if(k==="maze"){o+=`<rect x="30" y="30" width="580" height="270" rx="16" fill="#FFFFFF" stroke="#DCD6EA"/>`;
    o+=`<path d="M300,280 L300,170 L170,70 M300,170 L430,70" stroke="#DCE8F6" stroke-width="44" fill="none" stroke-linecap="round"/>`;
    o+=`<circle cx="160" cy="58" r="34" fill="#E9E1F7" stroke="#CFC3EA"/><circle cx="440" cy="58" r="34" fill="#EEF4FB" stroke="#CFE0F2"/>`;
    o+=txt(108,112,"A: "+ODOUR[s.mz.odour])+txt(420,112,"B: plain water");
    s.mz.fish.forEach(f=>{let x,y;if(f.seg==="trunk"){x=300+f.lat*40;y=280-110*f.t}else{const sx=f.arm==="A"?-1:1;x=300+sx*130*f.t+f.lat*30;y=170-100*f.t}o+=`<ellipse cx="${x}" cy="${y}" rx="3" ry="7" fill="#D9B45A"/>`});
    const m=mazeStats();o+=txt(40,292,`Chose A: ${s.mz.a} · chose B: ${s.mz.b} · still in the trunk: ${m.base}`,`font-size="12"`);return o}
  const night=k==="ripples"||((k==="night"||k==="freerun"||k==="test")&&isDark(s.light,s.hour));
  o+=poolSVG(night,s.level);
  const fx=lerp(60,560,(s.f.x-POOL.x0)/(4.2-POOL.x0)),fy=lerp(262,96,(s.f.y-.6)/(2.4-.6));
  o+=fishSVG(fx,fy,150,Math.cos(s.f.h)<0,{ll:k==="ripples"&&!s.llBlock||s.part==="ll"});
  if(k==="ripples"||k==="test")s.moths.filter(m=>m.state==="on").forEach(m=>{const mx=lerp(60,560,(m.x-POOL.x0)/(4.2-POOL.x0));const wy=lerp(120,84,s.level);
    for(let r=1;r<4;r++)o+=`<ellipse cx="${mx}" cy="${wy}" rx="${r*12+(m.t*20%12)}" ry="${r*3}" fill="none" stroke="#fff" opacity="${.8-r*.2}"/>`;o+=`<path d="M${mx-8},${wy-4} l8,4 l8,-4 l-8,-2z" fill="#B7A68A"/>`});
  if(k==="flood"||k==="test"){if(s.eggs!=="none"&&s.eggs!=="hatched")for(let i=0;i<10;i++)o+=`<circle cx="${510+i*8}" cy="${116-(i%3)*3}" r="3" fill="#F6EED8" stroke="#C8B98F"/>`+(s.eggAge>10?`<circle cx="${510+i*8}" cy="${116-(i%3)*3}" r="1" fill="#222"/>`:"")}
  o+=txt(44,32,k==="flood"||k==="maze"?"":(night?"Night":"Day")+(k==="night"||k==="freerun"||k==="test"?" · "+hm(s.hour):""),`font-size="12" fill="${MUTED}"`);
  return o}
function drawClose(st0,st){const k=st.k;
  if(k==="night"||k==="freerun"||k==="test")return actogram(28,26,372,190);
  if(k==="flood"){let o=`<rect x="20" y="20" width="380" height="200" fill="#fff" stroke="#DCD6EA"/>`;
    o+=txt(30,38,"Egg development (days out of the water)",`font-size="10" fill="${MUTED}"`);
    const X=d=>40+d*(340/35);o+=`<rect x="${X(READY)}" y="50" width="${X(28)-X(READY)}" height="130" fill="#E3F2EA"/>`+txt(X(READY)+4,64,"3–4 weeks: ready",`font-size="10" fill="${DEEP}"`);
    o+=`<line x1="40" y1="180" x2="380" y2="180" stroke="${MUTED}"/>`;for(let d=0;d<=35;d+=7)o+=txt(X(d)-4,196,String(d),`font-size="9" fill="${MUTED}"`);
    if(s.eggs!=="none")o+=`<rect x="40" y="120" width="${X(Math.min(35,s.eggAge))-40}" height="22" rx="6" fill="${s.eggs==="hatched"?"#BFE8D6":"#F6EED8"}" stroke="#C8B98F"/>`+txt(46,135,s.eggs==="hatched"?"hatched":Math.floor(s.eggAge)+" days");
    o+=txt(30,214,s.note||"Send a flood: the adults spawn in the flooded grass.",`font-size="10.5"`);return o}
  if(k==="maze"){const m=mazeStats();let o=`<rect x="20" y="20" width="380" height="200" fill="#fff" stroke="#DCD6EA"/>`+txt(30,38,"Where the whitebait went",`font-size="10" fill="${MUTED}"`);
    const mx=Math.max(10,s.mz.a,s.mz.b);const bar=(x,n,c,l)=>`<rect x="${x}" y="${180-130*n/mx}" width="70" height="${130*n/mx}" rx="6" fill="${c}"/>`+txt(x,198,l,`font-size="10"`)+txt(x+28,174-130*n/mx,String(n),`font-weight="600"`);
    o+=bar(80,s.mz.a,"#D9CBF2","A: odour")+bar(230,s.mz.b,"#BFDDF5","B: plain");
    o+=txt(30,214,m.n?`${Math.round(m.pref*100)}% of ${m.n} chose arm A`:"Release some whitebait.",`font-size="10.5"`);return o}
  if(k==="ripples"){let o=`<rect x="20" y="20" width="380" height="200" fill="#fff" stroke="#DCD6EA"/>`+txt(30,38,"The lateral line: a canal of neuromasts along each side",`font-size="10" fill="${MUTED}"`);
    o+=`<path d="M40,120 Q210,96 380,120" stroke="${s.llBlock?"#C9C3D6":DEEP}" stroke-width="10" fill="none" stroke-linecap="round" opacity=".35"/>`;
    for(let i=0;i<10;i++){const x=56+i*34,y=120-Math.sin((x-40)/340*Math.PI)*24;o+=`<circle cx="${x}" cy="${y}" r="5" fill="${s.llBlock?"#C9C3D6":DEEP}"/><path d="M${x},${y-5} l0,-12" stroke="${s.llBlock?"#C9C3D6":DEEP}" stroke-width="2"/>`}
    o+=`<path d="M300,64 q12,-10 24,0 q12,10 24,0" stroke="#7FB7E8" stroke-width="2" fill="none"/>`+txt(296,56,"ripples",`font-size="10" fill="${MUTED}"`);
    o+=txt(30,184,`Caught ${s.caught} · flew off ${s.missed}`,`font-weight="600"`)+txt(30,204,s.llBlock?"Lateral line blocked (lab test): the fish can't locate prey in the dark.":"Neuromasts bend with water movement and fire nerve signals.",`font-size="10.5"`);return o}
  // the fish: a labelled side view
  let o=DEFS+`<rect x="10" y="10" width="400" height="240" fill="#fff" stroke="#DCD6EA"/>`+fishSVG(210,128,300,false,{ll:s.part==="ll"});
  const call=(x1,y1,x2,y2,t)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${MUTED}"/>`+txt(x2+(x2<x1?-4:4),y2+4,t,`font-size="10" ${x2<x1?'text-anchor="end"':""}`);
  o+=call(335,116,372,60,"eye")+call(300,132,330,200,"bluish patch")+call(220,126,240,212,"lateral line")+call(290,150,300,236,"pectoral fin");
  o+=call(120,98,90,40,"dorsal fin, set far back")+call(160,112,170,40,"pale bands over the back");return o}

// ---------------------------------------------------------------- steps
const ALLP=["play","light","restart","moth","ll","flood","bank","odour","flow","metal","release","clear"];
const steps=[
 {k:"fish",lab:"The kōkopu",onStep:()=>{Object.assign(s.f,{x:.55,y:1.4,z:1.0,h:Math.PI,v:.1});s.part=s.part||"ll"},cap:"A banded kōkopu, found only in Aotearoa. Adults are about 200 mm long and live in shaded pools of small streams. Tap a part to see what it senses.",speed:1,controls:[],
  big:"<b>The big idea:</b> every response in this machine starts with a sense. Light reaches the eyes, water movement reaches the lateral line, and chemicals reach the nostrils.",
  exam:"Banded kōkopu are endemic to New Zealand. Adults (about 200 mm, up to 260 mm) live in pools of small, shaded streams, shelter under banks, logs and boulders, and feed mostly at night on insects that fall onto the water.",
  trap:"Calling whitebait one species. Whitebait are the juveniles of several native fish, and banded kōkopu is one of them.",chips:["species","length","home"],kupu:["kōkopu","piha","rongo kakara"]},
 {k:"night",lab:"Night shift",cap:"Lights on 06:00–18:00. Watch the actogram build: the kōkopu rests under the bank all day and comes out soon after dark.",speed:1,speedLabel:"≈ 6 hours a second",controls:["play","restart"],
  big:"<b>The big idea:</b> the kōkopu is nocturnal. The change from light to dark is the zeitgeber that entrains its biological clock, so activity starts at about the same time each evening.",
  exam:"The actogram shows the banded kōkopu is nocturnal: its activity period starts soon after the lights go off and ends around dawn. Light is the zeitgeber. Each day the light–dark cycle resets (entrains) the internal clock to a 24-hour period, so activity stays in step with night. Being active at night may let it feed on insects falling onto the water while lowering the risk from predators that hunt by sight.",
  trap:"Saying it's active because it's dark. Darkness is the cue that sets the clock; the internal clock drives the rhythm.",chips:["time","lights","state","onset"],kupu:["moeao"],onStep:()=>{clockReset("LD")}},
 {k:"freerun",lab:"No sunset",cap:"Switch the lights to constant darkness. With no zeitgeber the rhythm keeps going, but on its own period, so activity starts a little later every day. Then try a 6-hour shift.",speed:1,speedLabel:"≈ 6 hours a second",controls:["play","light","restart"],
  big:"<b>The big idea:</b> a rhythm that continues without any cue is endogenous: it comes from an internal clock. Its free-running period is rarely exactly 24 hours, so it drifts until a zeitgeber entrains it again.",
  exam:"In constant darkness there is no zeitgeber, so the rhythm free-runs. Activity still occurs in a regular cycle, but with a period of about 24.7 hours, so the onset is later each day and the actogram slants to the right. This shows the rhythm is endogenous. When a light–dark cycle returns, the clock is gradually re-entrained, shifting a limited amount each day.",
  trap:"Saying the rhythm stops in constant darkness, or that re-entrainment happens overnight. It keeps cycling, and it shifts a little each day.",chips:["lights","period","onset","ddays"],kupu:["moeao"],onStep:()=>{if(s.rec.length<3)clockReset("LD")}},
 {k:"ripples",lab:"Ripples",cap:"Night in the pool. Tap the water (or drop a moth) and watch the kōkopu find it by the ripples. Then block the lateral line and try again.",speed:1,controls:["moth","ll"],
  big:"<b>The big idea:</b> the lateral line senses water movement. At night the kōkopu turns towards the ripples of a struggling insect and strikes: a directional response to a mechanical stimulus. Block it in the model and the moth goes unnoticed.",
  exam:"The lateral line is a row of neuromasts along each side of the fish that detect water movement. Ripples from an insect struggling on the surface stimulate the neuromasts, so the banded kōkopu can locate and orient towards prey in the dark, when vision is limited.",
  trap:"Saying the fish sees its prey at night. It detects the water movement with its lateral line.",chips:["caught","missed","sense"],kupu:["kōkopu"],onStep:()=>{s.moths=[];if(!s.moths.length)dropMoth()}},
 {k:"flood",lab:"Flood cue",cap:"Autumn. Send a flood: the adults spawn among the flooded grass on the bank. When the water drops, the eggs sit out of the water. Send the next flood at the right time.",speed:1,speedLabel:"≈ 2 days a second",controls:["play","flood","bank"],
  big:"<b>The big idea:</b> an environmental cue times the response. Spawning happens on a flood, and hatching waits for the next one, so the larvae hatch straight into high water that carries them to the sea.",
  exam:"Banded kōkopu spawn in autumn and early winter during floods, laying eggs among flooded vegetation at the stream edge. When the water drops, the eggs develop out of the water for about 3–4 weeks, then wait. Hatching is triggered by the next flood that covers them, so the larvae are swept downstream to the sea, where they spend their first months.",
  trap:"Saying the eggs hatch after a fixed number of days. Development takes 3–4 weeks, but hatching waits for a flood.",chips:["day","level","eggage","eggs"],kupu:["waipuke","kukune"],onStep:()=>{if(s.eggs==="hatched")resetBank()}},
 {k:"maze",lab:"Choice chamber",cap:"Migrating whitebait in a choice chamber. Water flows down both arms; arm A comes from a tank of adult fish. Release whitebait and see which arm they pick. Change the adults, the flow or the water.",speed:1,controls:["odour","flow","metal","release","clear"],
  big:"<b>The big idea:</b> whitebait swim into the current, then follow the odour of adults of their own species. This chemical cue may help them choose streams where adult banded kōkopu already live.",
  exam:"Migrating banded kōkopu whitebait swim against the current (positive rheotaxis). In a choice chamber they choose water carrying the odour of adult banded kōkopu, but show no preference for water from adult īnanga or kōaro. This species-specific chemical cue may help them select suitable stream habitat during their upstream migration. After exposure to a trace of cadmium, the preference disappears, so pollution can disrupt this navigation cue.",
  trap:"Saying they smell food. They are attracted to the odour of adults of their own species.",chips:["odour","chA","chB","pref"],kupu:["hekenga","rongo kakara"],onStep:()=>{if(!s.mz.fish.length){clearMaze();release(20)}}},
 {k:"test",lab:"Test yourself",cap:"Use the controls to answer each one, then press Check. The machine marks you with the same model it runs.",speed:1,speedLabel:"≈ 6 hours a second",controls:ALLP,
  big:"<b>Exam tip:</b> name the stimulus, the receptor, the response and the type of response (taxis, rhythm, timed by a cue), then explain the advantage for survival or reproduction.",
  chips:["time","lights","onset","eggs","pref"]}
];

const KUPU=[
 {mi:"kōkopu",en:"banded kōkopu (Galaxias fasciatus); also used for some other small native fish",ta:2868},
 {mi:"moeao",en:"nocturnal",ta:47541,chip:"state"},
 {mi:"piha",en:"gills (of a fish)",ta:5553,note:"Also the blowhole of a whale."},
 {mi:"rongo kakara",en:"sense of smell",ta:40229},
 {mi:"waipuke",en:"flood; to flood",ta:9067,chip:"level"},
 {mi:"kukune",en:"embryo, fertilised egg",ta:11084},
 {mi:"hekenga",en:"migration",ta:1044}];

function chips(){const m=mazeStats();const act=isActive(s.hour);return{
  species:["SPECIES","Galaxias fasciatus"],length:["ADULT LENGTH","about 200 mm"],home:["HOME","shaded stream pools"],
  time:["CLOCK",hm(s.hour)+(isDark(s.light,s.hour)?" · dark":" · light")],
  lights:["LIGHTS",s.light==="LD"?"on 06:00–18:00":s.light==="shift"?"shifted: on 12:00–24:00":"always off",s.light!=="LD"],
  state:["KŌKOPU",act?"active, feeding":"resting under the bank",act],
  onset:["ACTIVITY STARTS",hm(s.onset)],
  period:["PERIOD",s.light==="DD"?FREE+" h (free-running)":"24 h (entrained)",s.light==="DD"],
  ddays:["DAYS IN THE DARK",String(s.ddDays)],
  caught:["MOTHS CAUGHT",String(s.caught),true],missed:["FLEW OFF",String(s.missed)],
  sense:["SENSE",s.llBlock?"lateral line blocked":"lateral line working",s.llBlock],
  day:["AUTUMN DAY",String(Math.floor(s.fday))],level:["WATER",s.level>.5?"flood":"normal",s.level>.5],
  eggage:["EGG AGE",s.eggs==="none"?"no eggs":s.eggs==="hatched"?"hatched":Math.floor(s.eggAge)+" days"],
  eggs:["EGGS",{none:"none yet",dev:"developing",ready:"ready, waiting for water",hatched:"hatched"}[s.eggs],s.eggs==="ready"||s.eggs==="hatched"],
  odour:["ARM A",ODOUR[s.mz.odour]+(s.mz.metal?" · cadmium":"")+(s.mz.flow?"":" · no flow")],
  chA:["CHOSE ARM A",String(s.mz.a),true],chB:["CHOSE ARM B",String(s.mz.b)],
  pref:["PREFERENCE",m.n?Math.round(m.pref*100)+"% to arm A (n = "+m.n+")":"no choices yet",m.n>=10&&m.pref>=.65]}}

// ---------------------------------------------------------------- the 3D bench
function kokopu3d(S){const {THREE,mat,PAL}=S;const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
  const ZM=V3(15,0,0);                     // the choice chamber sits to the right of the pool
  let seed=5;const r01=()=>(seed=(seed*16807)%2147483647)/2147483647;
  const tmp=V3(0,0,0),tmp2=V3(0,0,0);

  // ---- canvas textures for the fish skin (u: snout→tail, v: around the body from the top)
  function canvasTex(w,h,draw,srgb=true){const c=document.createElement("canvas");c.width=w;c.height=h;const g=c.getContext("2d");draw(g,w,h);
    const t=new THREE.CanvasTexture(c);if(srgb)t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;t.wrapS=THREE.RepeatWrapping;return t}
  const mix=(a,b,t)=>{const A=new THREE.Color(a),B=new THREE.Color(b);return "#"+A.lerp(B,clamp(t,0,1)).getHexString()};
  const SPECIES={
    kokopu:{H:.085,W:.072,back:"#26231A",flank:"#5C4526",gold:"#8F7240",belly:"#E9DEC0",bands:true,patch:true,fin:"#B8955A"},
    inanga:{H:.06,W:.05,back:"#5E6650",flank:"#A3A892",gold:"#C4C6B4",belly:"#EEF0E8",bands:false,speck:true,fin:"#C2C2B0"},
    koaro:{H:.07,W:.058,back:"#3E4A30",flank:"#6B6A3C",gold:"#C8A24A",belly:"#E9E2C8",bands:false,flecks:true,fin:"#9C8E5A"}};
  function skin(sp){const P=SPECIES[sp];let rs=17;const rr=()=>(rs=(rs*16807)%2147483647)/2147483647;
    const map=canvasTex(1024,512,(g,w,h)=>{
      for(let y=0;y<h;y++){const v=y/h,d=Math.abs(v-.5);   // d: 0 at the belly, .5 along the back
        g.fillStyle=d<.11?P.belly:d<.2?mix(P.belly,P.gold,(d-.11)/.09):d<.32?mix(P.gold,P.flank,(d-.2)/.12):mix(P.flank,P.back,(d-.32)/.18);g.fillRect(0,y,w,1)}
      // a darker head top and snout
      const hg=g.createLinearGradient(0,0,w*.2,0);hg.addColorStop(0,"rgba(30,25,15,.45)");hg.addColorStop(1,"rgba(30,25,15,0)");
      g.fillStyle=hg;g.fillRect(0,0,w*.2,h*.3);g.fillRect(0,h*.7,w*.2,h*.3);
      // fine speckles
      for(let i=0;i<2600;i++){const x=rr()*w,y=rr()*h,d=Math.abs(y/h-.5);if(d<.14)continue;g.fillStyle=`rgba(25,20,10,${.12+rr()*.18})`;g.beginPath();g.arc(x,y,.6+rr()*1.6,0,TAU);g.fill()}
      if(P.bands){g.lineCap="round";
        for(let i=0;i<22;i++){const u=.22+Math.pow(i/21,.82)*.75+(rr()-.5)*.012;const fade=clamp((u-.2)/.14,0,1);g.strokeStyle=`rgba(230,206,138,${.3+.32*fade})`;g.lineWidth=1.8+rr()*2.0;
          const lw=g.lineWidth,ss=g.strokeStyle;for(const pass of [0,1]){g.lineWidth=pass?lw:lw*2.6;g.strokeStyle=pass?ss:`rgba(236,214,150,${.12+.12*fade})`;
          for(const side of [0,1]){g.beginPath();const v0=side?.62:0,v1=side?1:.38;for(let k=0;k<=24;k++){const v=lerp(v0,v1,k/24);const d=Math.abs(v-.5);if(d<.13)continue;
              const x=(u+.006*Math.sin(v*TAU*3+i)+.004*Math.sin(v*40+i*2))*w,y=v*h;if(k===0||Math.abs(lerp(v0,v1,(k-1)/24)-.5)<.13)g.moveTo(x,y);else g.lineTo(x,y)}g.stroke()}}}}
      if(P.flecks){for(let i=0;i<180;i++){const x=(.15+rr()*.85)*w,y=rr()*h,d=Math.abs(y/h-.5);if(d<.15)continue;g.fillStyle=`rgba(232,196,96,${.5+rr()*.4})`;g.beginPath();g.ellipse(x,y,2+rr()*5,1.5+rr()*3,rr()*3,0,TAU);g.fill()}}
      if(P.speck){for(let i=0;i<600;i++){const x=rr()*w,y=rr()*h,d=Math.abs(y/h-.5);if(d<.25)continue;g.fillStyle=`rgba(40,45,30,${.25+rr()*.3})`;g.beginPath();g.arc(x,y,1+rr()*1.8,0,TAU);g.fill()}}
      // gill cover edge and the bluish patch behind it, above the pectoral fin
      g.strokeStyle="rgba(35,28,16,.55)";g.lineWidth=3;for(const v of [[.12,.42],[.58,.88]]){g.beginPath();for(let k=0;k<=20;k++){const vv=lerp(v[0],v[1],k/20);const x=(.155+.012*Math.sin((vv-.5)*TAU))*w;k?g.lineTo(x,vv*h):g.moveTo(x,vv*h)}g.stroke()}
      if(P.patch)for(const v of [.315,.685]){const gr=g.createRadialGradient(.19*w,v*h,0,.19*w,v*h,26);gr.addColorStop(0,"rgba(196,222,240,.95)");gr.addColorStop(.6,"rgba(170,200,226,.55)");gr.addColorStop(1,"rgba(170,200,226,0)");g.fillStyle=gr;g.fillRect(.19*w-30,v*h-30,60,60)}
      // the mouth line at the snout
      g.strokeStyle="rgba(20,16,10,.8)";g.lineWidth=4;for(const v of [.4,.6]){g.beginPath();g.moveTo(0,v*h);g.lineTo(.035*w,(v<.5?v+.025:v-.025)*h);g.stroke()}
      // a faint lateral line
      g.strokeStyle="rgba(232,224,186,.45)";g.lineWidth=1.6;for(const v of [.25,.75]){g.beginPath();g.moveTo(.17*w,v*h);g.lineTo(w,v*h);g.stroke()}});
    const emi=canvasTex(1024,512,(g,w,h)=>{g.fillStyle="#000";g.fillRect(0,0,w,h);g.strokeStyle="#fff";g.lineWidth=3.5;for(const v of [.25,.75]){g.beginPath();g.moveTo(.17*w,v*h);g.lineTo(w*.99,v*h);g.stroke();
      for(let i=0;i<26;i++){g.beginPath();g.arc((.19+i*.031)*w,v*h,4.2,0,TAU);g.fillStyle="#fff";g.fill()}}});
    const bump=canvasTex(512,256,(g,w,h)=>{g.fillStyle="#808080";g.fillRect(0,0,w,h);for(let i=0;i<5000;i++){g.fillStyle=`rgba(${rr()<.5?0:255},${rr()<.5?0:255},${rr()<.5?0:255},.05)`;g.fillRect(rr()*w,rr()*h,2,2)}},false);
    return {map,emi,bump,P}}
  function finTex(colour){return canvasTex(256,256,(g,w,h)=>{g.clearRect(0,0,w,h);const c=new THREE.Color(colour);const rgb=`${Math.round(c.r*255)},${Math.round(c.g*255)},${Math.round(c.b*255)}`;
    const gr=g.createLinearGradient(0,0,w,0);gr.addColorStop(0,`rgba(${rgb},.96)`);gr.addColorStop(.75,`rgba(${rgb},.8)`);gr.addColorStop(1,`rgba(${rgb},.5)`);g.fillStyle=gr;g.fillRect(0,0,w,h);
    g.strokeStyle="rgba(92,68,30,.5)";g.lineWidth=2.2;for(let i=0;i<=20;i++){g.beginPath();g.moveTo(0,h*(i/20));g.lineTo(w,h*(i/20)+((i/20)-.5)*h*.18);g.stroke()}
    const eg=g.createLinearGradient(0,0,w,0);eg.addColorStop(.7,"rgba(0,0,0,0)");eg.addColorStop(1,"rgba(70,50,22,.35)");g.fillStyle=eg;g.fillRect(0,0,w,h)})}

  // ---- one fish: a lofted body with a superellipse section, a swimming wave down the body, fins that bend with it
  const sm=(e0,e1,x)=>{const t=clamp((x-e0)/(e1-e0),0,1);return t*t*(3-2*t)};
  const PH=[[0,.05],[.012,.46],[.035,.68],[.07,.82],[.13,.92],[.24,.99],[.34,1],[.48,.95],[.6,.85],[.7,.71],[.79,.57],[.86,.49],[.9,.46]];
  const PW=[[0,.05],[.012,.52],[.035,.8],[.07,.95],[.13,1.02],[.24,1.0],[.36,.93],[.48,.82],[.6,.68],[.7,.54],[.79,.42],[.86,.33],[.9,.3]];
  const prof=(P,u)=>{for(let i=1;i<P.length;i++)if(u<=P[i][0]){const [a,va]=P[i-1],[b,vb]=P[i];const t=(u-a)/(b-a);const k=t*t*(3-2*t);return lerp(va,vb,k)}return P[P.length-1][1]};
  function makeFish(sp,L,o={}){const SK=skin(sp),P=SK.P;const NS=o.lo?28:72,NR=o.lo?14:30,SE=.9;
    const g=new THREE.Group();const hy=u=>P.H*L*prof(PH,u),hz=u=>P.W*L*prof(PW,u),yc=u=>-.008*L*(1-sm(0,.22,u))-.004*L*sm(.3,.6,u);
    const X=u=>L/2-u*L;
    const pos=[],uv=[],idx=[],us=[];
    for(let i=0;i<=NS;i++){const u=SE*Math.pow(i/NS,1.25);const a=hy(u),b=hz(u),c=yc(u);
      for(let j=0;j<=NR;j++){const th=Math.PI/2-TAU*j/NR;const cy=Math.sin(th),cz=Math.cos(th);const n=2.15;
        const y=c+a*Math.sign(cy)*Math.pow(Math.abs(cy),2/n)*(cy<0?1.04:1),z=b*Math.sign(cz)*Math.pow(Math.abs(cz),2/n);
        pos.push(X(u),y,z);uv.push(u/SE,j/NR);us.push(u)}}
    for(let i=0;i<NS;i++)for(let j=0;j<NR;j++){const a=i*(NR+1)+j,b=a+NR+1;idx.push(a,b,a+1,b,b+1,a+1)}
    // snout and tail caps
    const tip=pos.length/3;pos.push(X(-.006),yc(0),0);uv.push(0,.5);us.push(0);for(let j=0;j<NR;j++)idx.push(tip,j+1,j);
    const end=pos.length/3;pos.push(X(SE),yc(SE),0);uv.push(1,.5);us.push(SE);const last=NS*(NR+1);for(let j=0;j<NR;j++)idx.push(end,last+j,last+j+1);
    const geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));geo.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));geo.setIndex(idx);
    geo.computeVertexNormals();const base=Float32Array.from(pos),U=Float32Array.from(us);
    const skinM=new THREE.MeshPhysicalMaterial({map:SK.map,emissiveMap:SK.emi,emissive:new THREE.Color("#5FE3C2"),emissiveIntensity:0,bumpMap:SK.bump,bumpScale:.6,
      roughness:.4,metalness:0,clearcoat:.7,clearcoatRoughness:.16,sheen:.25,sheenColor:new THREE.Color("#F0D58E"),sheenRoughness:.45,envMapIntensity:.55,iridescence:o.lo?0:.22,iridescenceIOR:1.3,transparent:!!o.ghost,opacity:o.ghost?.78:1});
    const body=new THREE.Mesh(geo,skinM);body.castShadow=!o.ghost;body.receiveShadow=true;g.add(body);
    // fins in the body's mid-plane (u, y) pairs, then paired fins on their own pivots
    const finM=new THREE.MeshPhysicalMaterial({map:finTex(P.fin),transparent:true,side:THREE.DoubleSide,roughness:.5,clearcoat:.4,depthWrite:false,emissive:new THREE.Color("#3A2A12"),emissiveIntensity:.35,sheen:.5,sheenColor:new THREE.Color("#F2DDA0")});
    const fins=[];
    function midFin(pts){const V=pts.map(([u,y])=>new THREE.Vector2(X(u),y));const sh=new THREE.Shape();sh.moveTo(V[0].x,V[0].y);sh.splineThru(V.slice(1,-1));sh.lineTo(V[V.length-1].x,V[V.length-1].y);sh.closePath();const fg=new THREE.ShapeGeometry(sh,28);
      const p=fg.attributes.position;const fu=new Float32Array(p.count),fuv=new Float32Array(p.count*2);let mnx=1e9,mxx=-1e9,mny=1e9,mxy=-1e9;
      for(let i=0;i<p.count;i++){mnx=Math.min(mnx,p.getX(i));mxx=Math.max(mxx,p.getX(i));mny=Math.min(mny,p.getY(i));mxy=Math.max(mxy,p.getY(i))}
      for(let i=0;i<p.count;i++){fu[i]=(L/2-p.getX(i))/L;fuv[i*2]=(p.getX(i)-mnx)/(mxx-mnx||1);fuv[i*2+1]=(p.getY(i)-mny)/(mxy-mny||1)}
      fg.setAttribute("uv",new THREE.BufferAttribute(fuv,2));const m=new THREE.Mesh(fg,finM);m.renderOrder=3;g.add(m);fins.push({m,base:Float32Array.from(p.array),u:fu});return m}
    const top=u=>yc(u)+hy(u)*.97,bot=u=>yc(u)-hy(u)*.92;
    const HH=P.H*L;
    midFin([[.86,top(.86)*.62],[.9,HH*.72],[.95,HH*.98],[.99,HH*.9],[1.012,HH*.42],[1.018,0],[1.012,-HH*.42],[.99,-HH*.9],[.95,-HH*.98],[.9,-HH*.72],[.86,bot(.86)*.62]]);
    midFin([[.645,top(.645)-.004],[.662,top(.662)+HH*.5],[.69,top(.69)+HH*.85],[.73,top(.73)+HH*.86],[.77,top(.77)+HH*.55],[.795,top(.795)+HH*.15],[.805,top(.805)-.004]]);
    midFin([[.66,bot(.66)+.004],[.675,bot(.675)-HH*.45],[.705,bot(.705)-HH*.72],[.745,bot(.745)-HH*.7],[.785,bot(.785)-HH*.4],[.805,bot(.805)-HH*.1],[.815,bot(.815)+.004]]);
    function pairFin(u,yk,len,wid,down){const out=[];for(const side of [1,-1]){const piv=new THREE.Group();g.add(piv);
        const sh=new THREE.Shape();sh.moveTo(0,-wid*.32);sh.splineThru([new THREE.Vector2(len*.45,-wid*.62),new THREE.Vector2(len*.9,-wid*.42),new THREE.Vector2(len*1.04,0),new THREE.Vector2(len*.86,wid*.42),new THREE.Vector2(len*.4,wid*.52)]);sh.lineTo(0,wid*.3);sh.closePath();
        const fg=new THREE.ShapeGeometry(sh,24);const p=fg.attributes.position;const fuv=new Float32Array(p.count*2);for(let i=0;i<p.count;i++){fuv[i*2]=p.getX(i)/len;fuv[i*2+1]=(p.getY(i)+wid)/(2*wid)}fg.setAttribute("uv",new THREE.BufferAttribute(fuv,2));
        const m=new THREE.Mesh(fg,finM);m.renderOrder=3;m.rotation.set(Math.PI/2*side*0+down*side,0,0);m.rotation.order="YXZ";
        const holder=new THREE.Group();holder.add(m);holder.rotation.y=Math.PI+side*.45;holder.rotation.z=0;piv.add(holder);
        piv.userData={u,y:yc(u)+hy(u)*yk,z:side*hz(u)*.92,side,m,holder};out.push(piv)}return out}
    const pect=pairFin(.16,-.5,P.H*L*1.45,P.H*L*.62,-.7),pelv=pairFin(.47,-.78,P.H*L*.8,P.H*L*.38,-.9);
    // eyes: bronze iris, dark pupil, clear-coated
    const eyes=[];for(const side of [1,-1]){const e=new THREE.Group();const r=P.H*L*.47;
      const iris=new THREE.Mesh(new THREE.SphereGeometry(r,24,18),new THREE.MeshPhysicalMaterial({color:"#D2A64C",roughness:.2,clearcoat:1,clearcoatRoughness:.04,emissive:new THREE.Color("#3C2A08"),emissiveIntensity:.4}));
      const pup=new THREE.Mesh(new THREE.SphereGeometry(r*.62,20,14),new THREE.MeshPhysicalMaterial({color:"#0E0E10",roughness:.1,clearcoat:1}));pup.position.z=side*r*.48;pup.position.x=r*.08;
      const rim=new THREE.Mesh(new THREE.TorusGeometry(r*.98,r*.13,10,36),new THREE.MeshPhysicalMaterial({color:"#2A2416",roughness:.4}));rim.rotation.y=Math.PI/2;rim.position.z=side*r*.12;
      const glint=new THREE.Mesh(new THREE.SphereGeometry(r*.16,10,8),new THREE.MeshBasicMaterial({color:"#ffffff"}));glint.position.set(r*.3,r*.32,side*r*.86);
      e.add(iris,pup,rim,glint);e.userData={u:.075,y:yc(.075)+hy(.075)*.34,z:side*hz(.075)*.72};g.add(e);eyes.push(e)}
    const wave=(u,t,A,fr)=>A*L*(.08+.92*u*u)*Math.sin(TAU*(u*1.05)-fr*t);
    const dwave=(u,t,A,fr)=>{const e=.01;return (wave(u+e,t,A,fr)-wave(u-e,t,A,fr))/(2*e)/(-L)};
    const P0=geo.attributes.position;const NRv=NR+1;
    function pose(t,A,fr,flap){const p=P0.array;for(let i=0;i<U.length;i++){p[i*3]=base[i*3];p[i*3+1]=base[i*3+1];p[i*3+2]=base[i*3+2]+wave(U[i],t,A,fr)}
      P0.needsUpdate=true;geo.computeVertexNormals();
      // weld the seam normals so the back has no crease
      const n=geo.attributes.normal.array;for(let i=0;i<=NS;i++){const a=i*NRv,b=a+NR;for(let c=0;c<3;c++){const m=(n[a*3+c]+n[b*3+c])/2;n[a*3+c]=m;n[b*3+c]=m}}
      for(const f of fins){const pa=f.m.geometry.attributes.position;const q=pa.array;for(let i=0;i<f.u.length;i++){q[i*3]=f.base[i*3];q[i*3+1]=f.base[i*3+1];q[i*3+2]=f.base[i*3+2]+wave(f.u[i],t,A,fr)}pa.needsUpdate=true}
      for(const pv of [...pect,...pelv]){const d=pv.userData;pv.position.set(X(d.u),d.y,d.z+wave(d.u,t,A,fr));pv.rotation.y=-Math.atan(dwave(d.u,t,A,fr));
        d.holder.rotation.y=Math.PI+d.side*(.55+.22*Math.sin(t*flap+(d.side>0?0:1.4)));d.m.rotation.x=d.side*(-.55+.12*Math.sin(t*flap*.8))}
      for(const e of eyes){const d=e.userData;e.position.set(X(d.u),d.y,d.z+wave(d.u,t,A,fr));e.rotation.y=-Math.atan(dwave(d.u,t,A,fr))}}
    pose(0,.02,6,3);
    const point=(u,yk,side)=>V3(X(u),yc(u)+hy(u)*yk,side*hz(u)*.98);
    return {g,body,skin:skinM,pect,eyes,pose,point,L}}

  // ---- the stream pool: a frosted case with gravel, an undercut bank, ferns, a log and a grassy margin
  const pool=S.group();
  const caseW=9.2,caseD=5.2,caseH=3.2;
  const box=S.acrylicCase(caseW,caseH,caseD,PAL.case.mint,{opacity:.2});pool.add(box);
  const plinth=S.rbox(caseW+.5,.32,caseD+.5,.14,mat("plastic",PAL.case.mint,{rough:.55,coat:.2}));plinth.position.y=-.16;pool.add(plinth);
  // gravel
  const pebG=new THREE.SphereGeometry(1,14,10);const NPEB=900;const pebs=S.swarm(NPEB,pebG,mat("plastic","#ffffff",{rough:.78,coat:.06}),{colors:true});pool.add(pebs);
  const PEB=["#A89878","#8C7B60","#C2B08C","#76695A","#9C8F7C","#B9A47E","#6D6A66","#8F8A80","#C9B795"];
  for(let i=0;i<NPEB;i++){const x=lerp(-4.45,2.7,r01()),z=lerp(-2.45,2.45,r01());const sc=.035+Math.pow(r01(),2)*.1;const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(r01()*3,r01()*3,r01()*3));
    pebs.putS(i,x,.06+sc*.45+r01()*.08,z,sc*(1.2+r01()*.5),sc*.62,sc*(1+r01()*.4),q);pebs.tint(i,PEB[i%PEB.length])}pebs.done();
  const bed=S.rbox(caseW-.15,.18,caseD-.15,.06,mat("matte","#A99878"));bed.position.set(0,.09,0);pool.add(bed);
  // boulders: smooth, slightly lumpy
  function rock(sc,col){const geo=new THREE.SphereGeometry(1,48,32);const p=geo.attributes.position;
    for(let i=0;i<p.count;i++){tmp.fromBufferAttribute(p,i);const n=1+.09*Math.sin(tmp.x*2.1+tmp.y*1.3)+.06*Math.sin(tmp.z*2.7+tmp.x*1.6)+.025*Math.sin(tmp.y*4.4);tmp.multiplyScalar(n);p.setXYZ(i,tmp.x,tmp.y,tmp.z)}
    geo.computeVertexNormals();const m=new THREE.Mesh(geo,mat("plastic",col,{rough:.7,coat:.12}));m.scale.set(...sc);m.castShadow=true;m.receiveShadow=true;return m}
  [[-.6,.38,-1.6,[.75,.42,.6],"#857C6E"],[1.4,.32,1.7,[.6,.34,.5],"#958B7B"],[-2.4,.3,1.75,[.5,.3,.45],"#7C7468"],[2.0,.45,-1.55,[.62,.5,.55],"#8E8475"]].forEach(([x,y,z,sc,c])=>{const r=rock(sc,c);r.position.set(x,y,z);r.rotation.y=r01()*3;pool.add(r)});
  // the undercut bank (back left): a soil block with an overhanging lip, roots hanging into the dark gap
  const soil=mat("plastic","#8C6E4E",{rough:.8,coat:.1}),soilDark=mat("plastic","#6E553B",{rough:.85,coat:.05});
  const bankBack=S.rbox(3.2,2.95,1.0,.12,soil);bankBack.position.set(-3.0,1.47,-2.05);pool.add(bankBack);
  const lip=S.rbox(3.2,.62,1.5,.26,soil);lip.position.set(-3.0,2.38,-1.2);pool.add(lip);
  const lipEdge=S.tube([[-4.55,2.1,-.48],[-3.6,2.0,-.42],[-2.6,2.06,-.46],[-1.45,2.12,-.5]],.17,soil,{seg:24,rs:12});pool.add(lipEdge);
  const hollow=S.rbox(3.0,1.5,.5,.1,mat("matte","#3E3226"));hollow.position.set(-3.0,1.3,-1.4);pool.add(hollow);
  const moss=S.rbox(3.25,.12,2.35,.06,mat("plastic","#7FA45E",{rough:.7,coat:.15}));moss.position.set(-3.0,2.98,-1.72);pool.add(moss);
  for(let i=0;i<9;i++){const x=-4.3+i*.32+r01()*.15;const pts=[[x,2.1,-.55],[x+(r01()-.5)*.25,1.75,-.62],[x+(r01()-.5)*.35,1.35-r01()*.35,-.7+r01()*.15]];pool.add(S.tube(pts,.03+r01()*.025,soilDark,{seg:20,rs:6}))}
  // ferns arching out over the water from the bank
  const leafG=new THREE.SphereGeometry(1,8,6);const leaves=S.swarm(900,leafG,mat("plastic","#ffffff",{rough:.55,coat:.3}),{colors:true,cast:true});pool.add(leaves);let li=0;
  const FERN=["#5E8F4A","#6E9F55","#4F7E3E","#7AAE5E"];
  function fern(ox,oz,dir,len,lift){const pts=[];for(let k=0;k<=6;k++){const t=k/6;pts.push(V3(ox+dir.x*len*t,3.0+lift*Math.sin(t*Math.PI*.8)-t*t*.9,oz+dir.z*len*t))}
    const curve=new THREE.CatmullRomCurve3(pts);pool.add(S.tube(curve,.022,mat("plastic","#4E6B36",{rough:.6}),{seg:30,rs:6}));
    for(let k=2;k<34;k++){const t=k/34;const p=curve.getPoint(t),tg=curve.getTangent(t);const side=V3(-tg.z,0,tg.x).normalize();const sz=.2*(1-t*.75);
      for(const sg of [1,-1]){if(li>=900)break;const q=new THREE.Quaternion().setFromUnitVectors(V3(1,0,0),side.clone().multiplyScalar(sg).add(V3(0,-.25,0)).normalize());
        leaves.putS(li,p.x+side.x*sg*sz*.8,p.y-.02,p.z+side.z*sg*sz*.8,sz,sz*.08,sz*.32,q);leaves.tint(li,FERN[(k+li)%4]);li++}}}
  fern(-3.6,-1.9,V3(.8,0,.6).normalize(),3.0,.5);fern(-2.6,-2.0,V3(.35,0,.94).normalize(),2.6,.6);fern(-4.2,-1.4,V3(.95,0,.3).normalize(),2.4,.35);fern(-1.9,-2.2,V3(.7,0,.7).normalize(),2.2,.45);
  for(;li<900;li++)leaves.put(li,0,-50,0,.001);leaves.done();
  // a mossy log across the back right
  pool.add(S.tube([[.1,.55,-2.3],[1.4,.62,-2.05],[2.5,.75,-1.95]],.2,mat("plastic","#7B6046",{rough:.75,coat:.15}),{seg:24,rs:16}));
  // the grassy margin (right): only covered by water in a flood
  const shelf=S.rbox(1.75,SHELF.top-.05,caseD-.25,.1,soil);shelf.position.set(3.68,(SHELF.top-.05)/2,0);pool.add(shelf);
  const turf=S.rbox(1.8,.1,caseD-.2,.05,mat("plastic","#8DB46A",{rough:.7,coat:.15}));turf.position.set(3.68,SHELF.top-.02,0);pool.add(turf);
  const bladeG=new THREE.ConeGeometry(.022,.55,4);bladeG.translate(0,.275,0);const blades=S.swarm(260,bladeG,mat("plastic","#ffffff",{rough:.6,coat:.25}),{colors:true});pool.add(blades);
  const GR=["#7FAE5A","#93BD68","#6E9C4C","#A5C87A","#88B060"];const bladeAt=[];
  for(let i=0;i<260;i++){const x=lerp(2.85,4.5,r01()),z=lerp(-2.4,2.4,r01());const q=new THREE.Quaternion().setFromEuler(new THREE.Euler((r01()-.5)*.6,r01()*3,(r01()-.5)*.6));const h=.6+r01()*.9;bladeAt.push([x,z,q,h]);
    blades.putS(i,x,SHELF.top,z,1,h,1,q);blades.tint(i,GR[i%GR.length])}blades.done();
  // water: a body and a surface; the level rises in a flood
  const water=new THREE.Mesh(new THREE.BoxGeometry(caseW-.2,1,caseD-.2),new THREE.MeshPhysicalMaterial({color:"#7FBFCF",roughness:.12,transparent:true,opacity:.17,depthWrite:false,clearcoat:1}));
  water.renderOrder=4;pool.add(water);
  const surf=new THREE.Mesh(new THREE.PlaneGeometry(caseW-.2,caseD-.2),new THREE.MeshPhysicalMaterial({color:"#CDEBF2",roughness:.06,transparent:true,opacity:.16,depthWrite:false,clearcoat:1,side:THREE.DoubleSide}));
  surf.rotation.x=-Math.PI/2;surf.renderOrder=5;pool.add(surf);
  const setLevel=lv=>{const y=POOL.surf+lv*.55;water.scale.y=y-.2;water.position.y=.2+(y-.2)/2;surf.position.y=y;return y};
  // ripple rings for moths, splash rings for strikes
  const ringG=new THREE.RingGeometry(.9,1,48);ringG.rotateX(-Math.PI/2);
  const rings=[...Array(12)].map(()=>{const m=new THREE.Mesh(ringG,new THREE.MeshBasicMaterial({color:"#ffffff",transparent:true,opacity:0,depthWrite:false}));m.renderOrder=6;pool.add(m);return m});
  // moths: a body and two wings that flutter on the surface
  const mothM=mat("plastic","#B9A784",{rough:.6,coat:.2}),wingM=new THREE.MeshPhysicalMaterial({color:"#CDBE9C",roughness:.7,side:THREE.DoubleSide,transparent:true,opacity:.95});
  const moths=[...Array(3)].map(()=>{const g=new THREE.Group();const b=S.sphere(.06,mothM,{seg:12});b.scale.set(1,.7,2.2);g.add(b);
    const wg=new THREE.CircleGeometry(.2,20);wg.scale(1,.55,1);const wl=new THREE.Mesh(wg,wingM),wr=new THREE.Mesh(wg,wingM);wl.position.set(.17,0,0);wr.position.set(-.17,0,0);
    const pl=new THREE.Group(),pr=new THREE.Group();pl.add(wl);pr.add(wr);g.add(pl,pr);g.userData={pl,pr};g.visible=false;pool.add(g);return g});
  // eggs among the grass, with eye spots that appear as the embryos develop; larvae swept away after hatching
  const eggG=new THREE.SphereGeometry(1,12,9);const eggs=S.swarm(60,eggG,new THREE.MeshPhysicalMaterial({color:"#F7EFD8",roughness:.15,transmission:.0,transparent:true,opacity:.92,clearcoat:1}));pool.add(eggs);
  const eyesI=S.swarm(60,eggG,mat("plastic","#1A1A1E",{rough:.3}));pool.add(eyesI);
  const eggAt=[...Array(60)].map(()=>[lerp(2.9,4.4,r01()),lerp(-2.2,2.2,r01()),SHELF.top+.05+r01()*.35]);
  const larvG=new THREE.CylinderGeometry(.012,.004,.22,5);larvG.rotateZ(Math.PI/2);const larvae=S.swarm(40,larvG,mat("acrylic","#F3E6C2",{opacity:.75}));pool.add(larvae);
  // the lab clock: a 24-hour dial showing light and dark, and when the fish is active
  const clockP=S.panel(420,420,1.45);clockP.position.set(3.55,4.35,-2.3);pool.add(clockP);
  const clockPost=S.cyl(.04,.04,1.2,mat("metal"));clockPost.position.set(3.55,3.45,-2.33);pool.add(clockPost);
  function drawClock(){clockP.redraw((g,w,h)=>{const cx=w/2,cy=h/2,R=w*.42;g.fillStyle="#FFFFFF";g.beginPath();g.arc(cx,cy,R+16,0,TAU);g.fill();g.strokeStyle="#DCD6EA";g.lineWidth=4;g.stroke();
    const ang=hh=>-Math.PI/2+hh/24*TAU;
    for(let b=0;b<48;b++){const hh=b/2;const dark=isDark(s.light,hh+.25);g.fillStyle=dark?"#2B3466":"#F7E7A6";g.beginPath();g.moveTo(cx,cy);g.arc(cx,cy,R,ang(hh),ang(hh+.5)+.01);g.closePath();g.fill()}
    g.lineWidth=16;g.strokeStyle="#2A7D63";g.beginPath();g.arc(cx,cy,R-26,ang(s.onset),ang(s.onset+s.dur));g.stroke();
    g.fillStyle="#FFFFFF";g.beginPath();g.arc(cx,cy,R-44,0,TAU);g.fill();
    g.fillStyle="#222A55";g.font="600 56px Instrument Sans, system-ui";g.textAlign="center";g.fillText(hm(s.hour),cx,cy+12);
    g.font="600 22px Instrument Sans, system-ui";g.fillStyle="#6E6A86";g.fillText(isActive(s.hour)?"KŌKOPU ACTIVE":"RESTING",cx,cy+50);
    g.save();g.translate(cx,cy);g.rotate(ang(s.hour)+Math.PI/2);g.fillStyle="#222A55";g.fillRect(-4,-R-6,8,62);g.restore();
    g.font="600 20px IBM Plex Mono, monospace";g.fillStyle="#222A55";["00","06","12","18"].forEach((t,i)=>{const a=ang(i*6);g.fillText(t,cx+Math.cos(a)*(R+2)*.86,cy+Math.sin(a)*(R+2)*.86+7)})})}

  // the fish itself
  const L=2.2;const fish=makeFish("kokopu",L);pool.add(fish.g);fish.g.traverse(o=>{if(o.isMesh&&o!==fish.body)o.castShadow=false});

  // ---- the choice chamber: a trunk and two arms in frosted acrylic, header tanks, a release box
  const maze=S.group();maze.position.copy(ZM);
  const mplate=S.rbox(8.4,.3,10.2,.14,mat("plastic",PAL.case.lavender,{rough:.55,coat:.2}));mplate.position.set(0,-.15,-.1);maze.add(mplate);
  const ac=mat("acrylic","#E6F1FA",{opacity:.32});const wM=new THREE.MeshPhysicalMaterial({color:"#A9D3EA",roughness:.1,transparent:true,opacity:.42,depthWrite:false,clearcoat:1});
  const J=V3(0,0,.7),REL=V3(0,0,4.3);const armEnd=sx=>V3(sx*2.5,0,-2.9);
  function trough(a,b){const d=b.clone().sub(a),len=d.length();const g=new THREE.Group();g.position.copy(a.clone().add(b).multiplyScalar(.5));g.rotation.y=Math.atan2(d.x,d.z);
    const fl=S.rbox(.95,.08,len+.5,.04,mat("plastic","#FFFFFF",{rough:.4}));fl.position.y=.04;g.add(fl);
    for(const sx of [-1,1]){const w=S.rbox(.06,.55,len+.5,.02,ac,{cast:false});w.position.set(sx*.47,.32,0);w.renderOrder=2;g.add(w)}
    const wt=new THREE.Mesh(new THREE.BoxGeometry(.88,.32,len+.45),wM);wt.position.y=.24;wt.renderOrder=3;g.add(wt);maze.add(g);return g}
  trough(REL,J);trough(J,armEnd(-1));trough(J,armEnd(1));
  const hub=S.cyl(.62,.62,.08,mat("plastic","#FFFFFF",{rough:.4}),{seg:24});hub.position.set(J.x,.04,J.z);maze.add(hub);
  const relBox=S.acrylicCase(1.3,.7,1.0,PAL.case.butter,{opacity:.3});relBox.position.set(REL.x,0,REL.z+.55);maze.add(relBox);
  const tanks={};for(const [k,sx] of [["A",-1],["B",1]]){const e=armEnd(sx);const t=S.cyl(.95,.95,1.7,mat("acrylic",k==="A"?"#E9E1F7":"#E7F1FA",{opacity:.35}),{seg:40,cast:false});t.position.set(e.x+sx*.3,.95,e.z-.75);t.renderOrder=2;maze.add(t);
    const tw=S.cyl(.9,.9,1.25,new THREE.MeshPhysicalMaterial({color:k==="A"?"#C9BDE8":"#A9D3EA",roughness:.1,transparent:true,opacity:.4,depthWrite:false}),{seg:40,cast:false});tw.position.set(e.x+sx*.3,.72,e.z-.75);tw.renderOrder=3;maze.add(tw);
    const rim=S.torus(.95,.04,mat("metal"),{rs:8,ts:48});rim.rotation.x=Math.PI/2;rim.position.set(e.x+sx*.3,1.8,e.z-.75);maze.add(rim);tanks[k]={pos:V3(e.x+sx*.3,.72,e.z-.75)}}
  // adults in tank A: one of three species, small and swimming slowly in circles
  const adults={};for(const sp of ["kokopu","inanga","koaro"]){const a=makeFish(sp,1.15,{lo:false});a.g.visible=false;a.g.scale.setScalar(1);maze.add(a.g);adults[sp]=a}
  // whitebait: small, golden and translucent
  const wbG=(()=>{const f=makeFish("kokopu",.42,{lo:true});const g=f.body.geometry.clone();return g})();
  const wb=S.swarm(80,wbG,new THREE.MeshPhysicalMaterial({color:"#E9CF8A",roughness:.3,transparent:true,opacity:.86,clearcoat:.8}),{cast:false});maze.add(wb);
  const odourP=S.puffs(90,"#C7B3EE",{});maze.add(odourP);const flowP=S.puffs(70,"#FFFFFF",{additive:false});maze.add(flowP);
  const odourSeed=[...Array(90)].map(()=>[r01(),r01()-.5]),flowSeed=[...Array(70)].map(()=>[r01(),r01()-.5,r01()<.5?-1:1]);
  const mazePos=(f)=>{let a,b,t=f.t;if(f.seg==="trunk"){a=REL;b=J}else{a=J;b=armEnd(f.arm==="A"?-1:1)}const p=a.clone().lerp(b,t);const d=b.clone().sub(a).normalize();const side=V3(-d.z,0,d.x);p.addScaledVector(side,f.lat);return {p,d}};

  // ---------------------------------------------------------------- labels and picks
  const lEye=S.label({off:[30,-34]}),lLL=S.label({off:[24,40]}),lGill=S.label({off:[-30,46]}),lFin=S.label({off:[-36,-30]}),lBand=S.label({off:[30,-46]});
  const lFish=S.label({cls:"big",off:[34,-40]}),lMoth=S.label({cls:"hot",off:[30,-30]}),lEggs=S.label({cls:"hot",off:[-40,-40]}),lWater=S.label({off:[30,30]});
  const lA=S.label({cls:"big",off:[-30,-50]}),lB=S.label({cls:"big",off:[30,-50]}),lRel=S.label({off:[30,20]}),lJ=S.label({cls:"hot",off:[40,-10]});
  const PARTS={eye:["Eye","sight by day; little use at night"],ll:["Lateral line","senses water movement"],gill:["Gill cover","the bluish patch behind it helps identify the species"],fin:["Pectoral fins","large: juveniles use them to climb wet rock"],band:["Pale bands","continue over the back behind the dorsal fin"]};
  const partHTML=k=>s.part===k?PARTS[k][0]+"<small>"+PARTS[k][1]+"</small>":PARTS[k][0];
  S.pick(fish.body,hit=>{const st=S.api.step;if(st.k!=="fish")return;const lp=fish.g.worldToLocal(hit.point.clone());const u=(L/2-lp.x)/L;s.part=u<.11?"eye":u<.22?"gill":u>.6?"band":"ll"});
  fish.pect.forEach(p=>S.pick(p,()=>{if(S.api.step.k==="fish")s.part="fin"}));
  fish.eyes.forEach(e=>S.pick(e,()=>{if(S.api.step.k==="fish")s.part="eye"}));
  const tapPlane=new THREE.Mesh(new THREE.PlaneGeometry(POOL.x1-POOL.x0+.4,POOL.z1-POOL.z0+.4),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));tapPlane.material.colorWrite=false;
  tapPlane.rotation.x=-Math.PI/2;tapPlane.position.set((POOL.x0+POOL.x1)/2,POOL.surf+.02,(POOL.z0+POOL.z1)/2);pool.add(tapPlane);
  S.pick(tapPlane,hit=>{const k=S.api.step.k;if(k!=="ripples"&&k!=="test")return;const lp=pool.worldToLocal(hit.point.clone());dropMoth(clamp(lp.x,POOL.x0+.2,POOL.x1-.1),clamp(lp.z,POOL.z0+.2,POOL.z1-.2))});

  // ---------------------------------------------------------------- views
  S.view("fish",[-.55,2.15,4.45],[.42,1.38,1.0],{min:2.0,max:18});
  S.view("night",[2.4,6.4,12.4],[-.4,1.4,0],{min:5,max:30});
  S.view("freerun",[2.4,6.4,12.4],[-.4,1.6,0],{min:5,max:30});
  S.view("ripples",[.6,8.6,8.2],[-.6,1.6,.2],{min:4,max:28});
  S.view("flood",[8.2,4.6,7.6],[2.9,1.9,.2],{min:4,max:26});
  S.view("maze",[ZM.x+.4,9.4,ZM.z+10.6],[ZM.x,.4,ZM.z+.4],{min:5,max:34});
  S.view("all",[7.4,13.5,25],[7.4,1,0],{min:8,max:60});
  S.setShadowBox(13,[6,0,0]);S.goView("fish",true);
  if(/[?&]debug\b/.test(location.search))try{window.__kokopu={S,s}}catch(e){}

  // ---------------------------------------------------------------- night and day
  const hemi=S.scene.children.find(o=>o.isHemisphereLight),fillL=S.scene.children.find(o=>o.isDirectionalLight&&o!==S.sun);
  const PAPER=new THREE.Color(PAL.paper),NIGHT=new THREE.Color("#2A3263"),SUNC=new THREE.Color("#fff3e4"),MOON=new THREE.Color("#B9C8FF");
  const moonL=new THREE.PointLight("#9FB6FF",0,30,1.4);moonL.position.set(-2,7.5,3);S.scene.add(moonL);
  let nightK=0;
  function setNight(n,dt){nightK=lerp(nightK,n,1-Math.pow(.02,dt));const k=nightK;
    S.scene.background.copy(PAPER).lerp(NIGHT,k*.92);if(S.scene.fog)S.scene.fog.color.copy(S.scene.background);
    S.sun.intensity=lerp(2.4,.55,k);S.sun.color.copy(SUNC).lerp(MOON,k);S.scene.environmentIntensity=lerp(.5,.16,k);
    if(hemi)hemi.intensity=lerp(.35,.1,k);if(fillL)fillL.intensity=lerp(.45,.15,k);moonL.intensity=k*3.2}

  let lastClock=-1;const q=new THREE.Quaternion();
  return {
    step(st){const k=st.k;S.goView(k==="test"?"all":k);s.part=k==="fish"?(s.part||"ll"):""},
    update(st0,st,dt,t){const k=st.k;
      // lighting
      const dark=k==="ripples"||((k==="night"||k==="freerun"||k==="test")&&isDark(s.light,s.hour));setNight(dark?1:0,dt);
      // water level and the fish
      const y=setLevel(s.level);const f=s.f;
      fish.g.position.set(f.x,Math.min(f.y,y-.18),f.z);fish.g.rotation.set(0,f.h,0);
      const sp=k==="maze"?.1:f.v;const A=.018+Math.min(.07,sp*.06),fr=4+sp*8;fish.pose(t,A,fr,3+sp*5);
      const vy=(f.y-(fish.g.userData.py??f.y))/Math.max(dt,1e-3);fish.g.userData.py=f.y;fish.g.userData.pitch=lerp(fish.g.userData.pitch||0,clamp(vy*.6,-.35,.35),.08);fish.g.rotation.z=fish.g.userData.pitch;
      tapPlane.visible=k==="ripples"||k==="test";
      fish.skin.emissiveIntensity=lerp(fish.skin.emissiveIntensity,(k==="fish"&&s.part==="ll")||(k==="ripples"&&!s.llBlock&&f.mode==="hunt")?.85:0,.12);
      fish.g.visible=k!=="maze";
      // anatomy labels
      const showParts=k==="fish";const camL=fish.g.worldToLocal(S.camera.position.clone());const sd=camL.z>=0?1:-1;
      const wp=(u,yk)=>fish.g.localToWorld(fish.point(u,yk,sd));
      lEye.show(showParts).at(fish.g.localToWorld(fish.eyes[sd>0?0:1].position.clone())).set(partHTML("eye")).cls(s.part==="eye"?"hot":"");
      lLL.show(showParts).at(wp(.45,0)).set(partHTML("ll")).cls(s.part==="ll"?"hot":"");
      lGill.show(showParts).at(wp(.19,-.1)).set(partHTML("gill")).cls(s.part==="gill"?"hot":"");
      lFin.show(showParts).at(fish.g.localToWorld(fish.pect[sd>0?0:1].position.clone())).set(partHTML("fin")).cls(s.part==="fin"?"hot":"");
      lBand.show(showParts).at(wp(.74,.9)).set(partHTML("band")).cls(s.part==="band"?"hot":"");
      // the clock and the fish's state
      const clockOn=k==="night"||k==="freerun"||k==="test";clockP.visible=clockOn;clockPost.visible=clockOn;
      if(clockOn&&Math.abs(s.hour-lastClock)>.05){drawClock();lastClock=s.hour}
      lFish.show(k==="night"||k==="freerun").at(fish.g.position.clone().add(V3(0,.4,0))).set(isActive(s.hour)?"Active<small>out in the pool, feeding</small>":"Resting<small>in the dark under the bank</small>");
      // moths and ripples
      const live=s.moths.filter(m=>m.state==="on"||m.state==="caught"||m.state==="away");
      moths.forEach((g,i)=>{const m=live[i];if(!m||m.state==="caught"&&m.t>.15||m.state==="away"&&m.t>.8){g.visible=false;return}g.visible=k==="ripples"||k==="test";
        const up=m.state==="away"?m.t*2.5:0;g.position.set(m.x,y+.04+up,m.z);g.rotation.y=m.id;const fl=.5+.45*Math.sin(t*(m.state==="away"?40:22)+m.id);g.userData.pl.rotation.z=fl;g.userData.pr.rotation.z=-fl});
      let ri=0;for(const m of live){if(ri>=12)break;const n=m.state==="caught"?3:m.state==="on"?3:0;for(let j=0;j<n&&ri<12;j++,ri++){const R=rings[ri];const ph=((t*.9+j/3+m.id*.13)%1);
          const big=m.state==="caught";R.visible=k==="ripples"||k==="test";R.position.set(m.x,y+.01,m.z);const rad=big?.2+m.t*3:.12+ph*1.1;R.scale.setScalar(rad);R.material.opacity=big?Math.max(0,.9-m.t):.55*(1-ph)}}
      for(;ri<12;ri++)rings[ri].visible=false;
      const mt=s.moths.find(m=>m.state==="on");
      lMoth.show((k==="ripples"||k==="test")&&!!mt).at(mt?V3(mt.x,y+.1,mt.z):tmp).set(mt?(s.llBlock?"Moth on the surface<small>lateral line blocked: not detected</small>":f.mode==="hunt"?"Ripples detected<small>turning towards the source</small>":"Moth on the surface<small>too far away to sense yet</small>"):"");
      // eggs and larvae
      const showEggs=s.eggs==="dev"||s.eggs==="ready";const dev=clamp(s.eggAge/READY,0,1);
      for(let i=0;i<60;i++){const [x,z,ey]=eggAt[i];if(showEggs&&k!=="maze"){eggs.put(i,x,ey,z,.045);eyesI.put(i,x+.03,ey+.01,z+.03,dev>.45?.012+.006*dev:.0001)}else{eggs.put(i,0,-20,0,.001);eyesI.put(i,0,-20,0,.001)}}eggs.done();eyesI.done();
      for(let i=0;i<40;i++){if(s.hatchT>=0&&s.hatchT<6&&k!=="maze"){const tt=s.hatchT*.9+i*.04;const x=lerp(3.6,-4.4,clamp(tt/3.2,0,1))+Math.sin(i)*.3,z=Math.sin(i*1.7)*1.8;larvae.put(i,x,y-.15-Math.abs(Math.sin(i))*.4,z,1,0,Math.sin(t*6+i)*.3,0)}else larvae.put(i,0,-20,0,.001)}larvae.done();
      for(let i=0;i<260;i++){const [x,z,qq,h]=bladeAt[i];blades.putS(i,x,SHELF.top,z,1,h*(1+(s.level>.5?.0:0)),1,qq)}
      if(s.level>.3){for(let i=0;i<260;i++){const [x,z,qq,h]=bladeAt[i];q.copy(qq).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0,0,Math.sin(t*2+x*3)*.25*s.level)));blades.putS(i,x,SHELF.top,z,1,h,1,q)}}blades.done();
      lEggs.show((k==="flood"||k==="test")&&s.eggs!=="none").at(V3(3.6,SHELF.top+.4,.6)).set(s.eggs==="hatched"?"Hatched<small>larvae swept downstream to the sea</small>":s.eggs==="ready"?"Eggs ready<small>"+Math.floor(s.eggAge)+" days: waiting for water</small>":"Eggs developing<small>"+Math.floor(s.eggAge)+" days out of the water</small>");
      lWater.show(k==="flood").at(V3(-1.2,y,1.6)).set(s.level>.5?"Flood<small>water over the grassy bank</small>":"Normal flow<small>the bank is dry</small>");
      // the choice chamber
      const z=s.mz;const showM=k==="maze"||k==="test";
      for(const sp in adults){const a=adults[sp];a.g.visible=showM&&z.odour===sp;if(a.g.visible){const tp=tanks.A.pos;const ang=t*.5;a.g.position.set(tp.x+Math.cos(ang)*.45,tp.y-.05,tp.z+Math.sin(ang)*.45);a.g.rotation.y=-ang-Math.PI/2;a.pose(t,.03,6,4)}}
      z.fish.forEach((w,i)=>{if(i>=80)return;const {p,d}=mazePos(w);q.setFromUnitVectors(V3(1,0,0),d.clone().normalize());
        q.multiply(new THREE.Quaternion().setFromAxisAngle(V3(0,1,0),Math.sin(w.wig)*.25));wb.putS(i,p.x,.24,p.z,1,1,1,q)});
      for(let i=z.fish.length;i<80;i++)wb.put(i,0,-20,0,.001);wb.done();wb.visible=showM;
      // odour plume down arm A and the trunk; flow particles down both arms
      const showO=showM&&z.flow&&z.odour!=="none";
      odourSeed.forEach(([u,l],i)=>{if(!showO){odourP.put(i,0,-20,0,0,0);return}const ph=(u+t*.12)%1;let p;if(ph<.5){p=armEnd(-1).lerp(J,ph*2)}else{p=J.clone().lerp(REL,(ph-.5)*2)}
        const d=ph<.5?J.clone().sub(armEnd(-1)).normalize():REL.clone().sub(J).normalize();const sd=V3(-d.z,0,d.x);p.addScaledVector(sd,l*.6);odourP.put(i,p.x,.3,p.z,.2*(1-Math.abs(l)*1.4),380)});odourP.done();
      flowSeed.forEach(([u,l,sx],i)=>{if(!(showM&&z.flow)){flowP.put(i,0,-20,0,0,0);return}const ph=(u+t*.2)%1;const p=ph<.5?armEnd(sx).lerp(J,ph*2):J.clone().lerp(REL,(ph-.5)*2);p.x+=l*.5;flowP.put(i,p.x,.42,p.z,.5,150)});flowP.done();
      const ms=mazeStats();
      lA.show(k==="maze").at(V3(ZM.x+tanks.A.pos.x,1.9,tanks.A.pos.z)).set("Arm A<small>"+ODOUR[z.odour]+(z.metal?" · cadmium":"")+"</small><b>"+z.a+" chose</b>");
      lB.show(k==="maze").at(V3(ZM.x+tanks.B.pos.x,1.9,tanks.B.pos.z)).set("Arm B<small>plain stream water</small><b>"+z.b+" chose</b>");
      lRel.show(k==="maze").at(V3(ZM.x,.8,REL.z+.6)).set("Release<small>"+(z.flow?"water flows towards here":"no flow: no current to swim into")+"</small>");
      lJ.show(k==="maze"&&ms.n>0).at(V3(ZM.x+J.x,.6,J.z)).set(Math.round(ms.pref*100)+"% chose A<small>n = "+ms.n+"</small>");
    }}
}

// ---------------------------------------------------------------- mount
StudyKit.mount({kupu:KUPU,scene3d:kokopu3d,
  eyebrow:"Biology · Animal responses",title:"The kōkopu machine",crumb:"NCEA Level 3 Biology · responses of plants and animals to their external environment",homeHash:"l3",
  fig:"FIG. 31 · A STREAM POOL AT NIGHT",railTitle:"How a native fish responds to its world",
  badge:{label:"NCEA L3 Biology 91603",exam:"2026-11-17T14:00:00+13:00",examText:"Tue 17 Nov, 2pm"},
  mainBox:"0 0 640 330",mainLabel:"A banded kōkopu in a shaded stream pool",closeBox:"0 0 420 260",
  state:s,steps,
  controls:[{type:"play"},
    {type:"button",id:"restart",label:"Start the record again",onClick:()=>clockReset()},
    {type:"select",id:"light",label:"Lights",options:[["LD","On 06:00–18:00"],["DD","Constant darkness"],["shift","Shifted 6 hours later"]],get:()=>s.light,set:(x,v)=>setLight(v)},
    {type:"button",id:"moth",label:"Drop a moth",onClick:()=>dropMoth()},
    {type:"toggle",id:"ll",label:"Block the lateral line (lab test)",get:()=>s.llBlock,set:(x,v)=>{s.llBlock=v}},
    {type:"button",id:"flood",label:"Send a flood",onClick:()=>{sendFlood();s.playing=true}},
    {type:"button",id:"bank",label:"New autumn",onClick:()=>resetBank()},
    {type:"select",id:"odour",label:"Tank A holds",options:Object.entries(ODOUR),get:()=>s.mz.odour,set:(x,v)=>{s.mz.odour=v;clearMaze()}},
    {type:"toggle",id:"flow",label:"Water flowing",get:()=>s.mz.flow,set:(x,v)=>{s.mz.flow=v;clearMaze()}},
    {type:"toggle",id:"metal",label:"Trace of cadmium (48 h)",get:()=>s.mz.metal,set:(x,v)=>{s.mz.metal=v;clearMaze()}},
    {type:"button",id:"release",label:"Release 20 whitebait",onClick:()=>{release(20);s.playing=true}},
    {type:"button",id:"clear",label:"Empty the chamber",onClick:()=>clearMaze()}],
  tick,drawMain,drawClose,chips,
  challenges:[
    {q:"Make the rhythm free-run: keep the kōkopu in constant darkness for at least 5 days.",check:()=>s.light==="DD"&&s.ddDays>=5,
      ok:"Yes: with no zeitgeber the onset drifts later each day. The rhythm is endogenous, with its own free-running period.",no:()=>s.light!=="DD"?"Not yet: set the lights to constant darkness and press Play.":`Not yet: ${s.ddDays} day${s.ddDays===1?"":"s"} so far. ${s.playing?"Keep it running.":"Press Play and keep it running."}`},
    {q:"Shift the light–dark cycle by 6 hours and keep going until the fish is re-entrained.",check:()=>s.light==="shift"&&s.shiftDays>=3&&Math.abs(phaseErr())<1,
      ok:"Yes: the light cue reset the clock a little each day until activity started just after the new dusk.",no:()=>s.light!=="shift"?"Not yet: choose “Shifted 6 hours later” and press Play.":"Not yet: the onset is still catching up. Re-entrainment takes several days."},
    {q:"Hatch the eggs: spawn on one flood, let the eggs develop, then send the second flood.",check:()=>s.eggs==="hatched",
      ok:"Yes: the eggs waited out of the water until they were ready, then the next flood triggered hatching.",no:()=>s.eggs==="none"?"Not yet: send a flood so the adults can spawn in the flooded grass.":s.eggs==="dev"?`Not yet: the eggs are ${Math.floor(s.eggAge)} days old. They need about 3 weeks.`:"Nearly: the eggs are ready. Send a flood."},
    {q:"Show the whitebait's preference: get at least 20 choices with 65% or more choosing arm A.",check:()=>{const m=mazeStats();return m.n>=20&&m.pref>=.65},
      ok:"Yes: with flowing water and adult banded kōkopu in tank A, most whitebait chose the odour of their own species.",no:()=>{const m=mazeStats();return m.n<20?`Not yet: only ${m.n} choices. Release more whitebait.`:"Not yet: they're choosing at random. Which adults, and what water conditions, give them a cue to follow?"}}],
  papers:[{label:"NZQA: Biology past exams",url:"https://www2.nzqa.govt.nz/ncea/subjects/past-exams-and-exemplars/biology/"},{label:"DOC: banded kōkopu",url:"https://www.doc.govt.nz/nature/native-animals/freshwater-fish/banded-kokopu/"},{label:"NIWA: banded kōkopu",url:"https://niwa.co.nz/freshwater/nzffd/NIWA-fish-atlas/fish-species/banded_kokopu"}],
  truth:"The pool, the clock and the numbers are simplified to show the ideas: the 24.7-hour free-running period, the 6-hour shift, the detection range and the choice percentages are illustrative. The banded kōkopu facts come from DOC, NIWA and published research: adults about 200 mm (up to 260 mm); mostly active at night; prey ripples sensed by the lateral line; spawning in streamside vegetation during autumn and early-winter floods, with eggs developing out of the water for 3–4 weeks and hatching on a later flood (Charteris et al. 2003); and whitebait attracted to the odour of adult banded kōkopu but not adult īnanga or kōaro, an attraction lost after 48 hours in 0.5 µg/L cadmium (C. F. Baker, University of Auckland PhD, 2000).",
  footer:"Covers AS 91603: biological rhythms and actograms (zeitgeber, entrainment, free-running period, activity periods), orientation and navigation cues (lateral line, odour, current), and a breeding response timed by an environmental cue."
});
})();
