(()=>{
// The reaction machine: rates of reaction on a lab bench, for Years 9–10 science and NCEA Level 2 Chemistry (AS91166).
// One model drives everything: each run (marble chips in hydrochloric acid, or hydrogen peroxide with an optional
// manganese(IV) oxide catalyst), the rate graph, the 3D bench and the challenges. The particle window is a slowed-down
// sketch of the same trends. The amounts and equations are real; the rate constants and activation energies are illustrative.
const K=StudyKit,F=K.fig,P=F.palette,esc=K.esc;
const INK="#262E5C",MUTED="#6E6A86",GRID="#ECE6F0",LINE="#DCD6EA",ACC="#B2552D",SKYD="#3A6FB8",GHOST="#9AA3B5",MINTD="#2A7D63",BROWN="#9A4A22";

// ================================================================ the model
const R=8.314,T0=293.15,VM=24.06;                 // L per mole of gas at 20 °C and 101.3 kPa (ideal gas law)
const M_CACO3=100.1,M_CO2=44.0,M_O2=32.0;           // g/mol from the NCEA periodic table values (Ca 40.1, C 12.0, O 16.0)
const MARBLE=0.40,ACID_L=0.050,N_M=MARBLE/M_CACO3;  // 0.40 g of marble (the limiting reactant) and 50 mL of acid (in excess)
const PER_L=0.025,PER_C=0.32,N_P=PER_L*PER_C;       // 25 mL of 0.32 mol/L hydrogen peroxide
const MNO2_G=0.50;                                  // a 0.5 g spatula of MnO2, as in RSC Education's peroxide practical
const GAS={marble:{n:N_M,M:M_CO2,f:"CO₂"},perox:{n:N_P/2,M:M_O2,f:"O₂"}};
const VMAX=rx=>GAS[rx].n*VM*1000, MLOSS=rx=>GAS[rx].n*GAS[rx].M;   // mL of gas, g lost, when every bit has reacted
const M_START={marble:163.904,perox:138.735};        // illustrative balance readings at the start (flask, liquid, solid, cotton wool)
const startMass=r=>M_START[r.rx]+(r.rx==="perox"&&r.cat?MNO2_G:0);
const EA_M=50e3,EA_PU=75e3,EA_PC=50e3;              // illustrative activation energies, J/mol
const K_M=1/150,K_PC=Math.LN2/12,K_PU=K_PC*Math.exp(-(EA_PU-EA_PC)/(R*T0));
const SIG={large:1,small:3,powder:12};              // illustrative surface factors for the same 0.40 g
const SIZE_N={large:"large chips",small:"small chips",powder:"powder"};
const arrh=(Ea,T)=>Math.exp(-Ea/R*(1/(T+273.15)-1/T0));
const kOf=r=>r.rx==="marble"?K_M*arrh(EA_M,r.T)*SIG[r.size]:(r.cat?K_PC*arrh(EA_PC,r.T):K_PU*arrh(EA_PU,r.T));
const acidNow=(r,x)=>Math.max(0,r.c-2*N_M*x/ACID_L);
// x = fraction of the limiting reactant used up. Marble chips shrink, so their surface goes as (1-x)^(2/3); peroxide is first order.
function dxdt(r,x){if(x>=1)return 0;return r.rx==="marble"?kOf(r)*acidNow(r,x)*Math.pow(1-x,2/3):kOf(r)*(1-x)}
const TMAX=900,DONE=0.99,FULL=0.9995;
function integrate(r,dt,rec,hmax){hmax=hmax||0.05;let left=dt;
  while(left>1e-9&&!r.complete){
    const d=dxdt(r,r.x);let h=Math.min(left,hmax,d>1e-12?0.003/d:hmax,TMAX-r.t);
    if(h<=1e-9){r.complete=true;r.capped=r.x<FULL;break}
    const k2=dxdt(r,Math.min(1,r.x+d*h/2)),x0=r.x,t0=r.t;r.x=Math.min(1,r.x+k2*h);r.t+=h;left-=h;
    const vm=VMAX(r.rx),V0=x0*vm,V1=r.x*vm;
    if(r.t50==null&&V1>=50&&V0<50)r.t50=t0+(50-V0)/Math.max(1e-9,V1-V0)*h;
    if(r.tEnd==null&&r.x>=DONE)r.tEnd=t0+(DONE-x0)/Math.max(1e-9,r.x-x0)*h;
    if(r.x>=FULL){r.x=1;r.complete=true}
    else if(r.t>=TMAX-1e-9){r.complete=true;r.capped=true}
    if(rec&&(r.t-r.ls>=(r.t<300?0.5:1)||r.complete)){r.pts.push([r.t,r.x]);r.ls=r.t}}}
function predict(r){const q={rx:r.rx,T:r.T,c:r.c,size:r.size,cat:r.cat,t:0,x:0,complete:false,tEnd:null,t50:null};integrate(q,TMAX,false,0.5);return q.tEnd||TMAX}
let runId=0;
const s={rx:"marble",T:20,c:1,size:"small",cat:false,meas:"vol",playing:false,run:null,ghost:null};
function makeRun(){const r={id:++runId,rx:s.rx,T:s.T,c:s.c,size:s.size,cat:s.cat,t:0,x:0,ls:0,pts:[[0,0]],started:false,complete:false,capped:false,tEnd:null,t50:null};
  r.r0=VMAX(r.rx)*dxdt(r,0);r.pred=predict(r);return r}
s.run=makeRun();
// a new run: the last one becomes the faded "previous run" line on the graph, as in the exam's "add a second line" questions
function newRun(){if(s.run&&s.run.started&&s.run.t>=2)s.ghost=s.run;s.run=makeRun()}
function setting(k,v){if(s[k]===v)return;s[k]=v;newRun()}
const rateNow=r=>VMAX(r.rx)*dxdt(r,r.x);                 // mL/s
const massRate=r=>MLOSS(r.rx)*dxdt(r,r.x);               // g/s
const r0Mass=r=>r.r0/VMAX(r.rx)*MLOSS(r.rx);
const runTxt=r=>r.rx==="marble"?`${r.T} °C · ${r.c.toFixed(2)} mol L⁻¹ · ${SIZE_N[r.size]}`:`${r.T} °C · ${r.cat?"MnO₂ catalyst":"no catalyst"}`;
const FACT={marble:["T","c","size"],perox:["T","cat"]};
const FACT_N={T:"temperature",c:"acid concentration",size:"marble size",cat:"catalyst"};
const diffs=(a,b)=>FACT[a.rx].filter(k=>a[k]!==b[k]);
const n1=v=>v.toFixed(1),n2=v=>v.toFixed(2);
let touched=false;try{["pointerdown","keydown"].forEach(e=>addEventListener(e,()=>{touched=true},{once:true,capture:true}))}catch(e){}
const sfx=n=>{if(touched)K.sfx(n)};
const secs=t=>t==null?"–":t<100?n1(t)+" s":Math.round(t)+" s";
const rateTxt=v=>v>=10?n1(v):v>=0.1?n2(v):v>=0.001?v.toFixed(3):v>0?"< 0.001":"0";

// ================================================================ the equilibrium: 2NO2 ⇌ N2O4, forward exothermic
const DH_EQ=-56.9e3;                                 // J/mol for 2NO2 → N2O4 (Chemguide gives +56.9 kJ/mol for N2O4 → 2NO2)
const kcRatio=T=>Math.exp(-DH_EQ/R*(1/(T+273.15)-1/T0));   // Kc compared with its 20 °C value (van 't Hoff)
const EQ_N=24,EQ_K20=0.365;                          // 24 "NO2 units" in the window; the 20 °C mix is illustrative
function eqCounts(T){const Kw=EQ_K20*kcRatio(T);const a=(-1+Math.sqrt(1+8*Kw*EQ_N))/(4*Kw);return {a,b:(EQ_N-a)/2}}
const eqShare=T=>{const e=eqCounts(T);return e.a/(e.a+e.b)};

// ================================================================ the particle window (a slowed-down, illustrative sketch)
const LR=1.5,RA=.085,RS=.11,VS=.62;
const E0={marble:3.0,perU:6.5,perC:2.6};            // thresholds in the window's energy units
const kTv=T=>Math.pow((T+273.15)/T0,2.4);           // exaggerated so the difference shows
function erfc(x){const t=1/(1+.3275911*x);return t*(.254829592+t*(-.284496736+t*(1.421413741+t*(-1.453152027+t*1.061405429))))*Math.exp(-x*x)}
const Q15=x=>x<=0?1:erfc(Math.sqrt(x))+2*Math.sqrt(x/Math.PI)*Math.exp(-x);   // share of a 3D energy spread above x
const enough=(Ea,T)=>Q15(Ea/kTv(T));
const eaNow=r=>r.rx==="marble"?E0.marble:(r.cat?E0.perC:E0.perU);
function gauss(){let u=0,v=0;while(u===0)u=Math.random();while(v===0)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function sampleE(T){let q=0;for(let i=0;i<3;i++){const z=gauss();q+=z*z}return q/2*kTv(T)}
const LW={key:"",runId:-1,parts:[],sites:[],bubs:[],fx:[],ev:[],t:0,spawnT:0,forceT:0,out:{t:-9,why:""},site0:0,eq:null};
function lensMode(st){return st&&st.k==="equil"?"eq":(s.run.rx==="marble"?"m-"+s.run.size:"p-"+(s.run.cat?1:0))}
function buildSites(mode){const S=[];const add=(x,y,kind)=>{if(Math.hypot(x,y)<LR-.13)S.push({x,y,kind,alive:1,fade:0})};
  if(mode==="m-large"){for(let j=0;j<3;j++)for(let i=-4;i<=4;i++)add(i*.24,-1.12+j*.24,"caco3")}
  else if(mode==="m-small"){for(const x0 of [-.9,-.12,.66])for(let j=0;j<3;j++)for(let i=0;i<2;i++)add(x0+i*.24,-.98+j*.24,"caco3")}
  else if(mode==="m-powder"){[[-1.05,-.55],[-.55,-.95],[.05,-1.05],[.62,-.82],[-.75,-.05],[-.2,-.5],[.4,-.25],[.92,-.3],[-.15,.25]].forEach(([x,y])=>{add(x,y,"caco3");add(x+.23,y,"caco3")})}
  else if(mode==="p-1"){[[-.85,-.8],[-.25,-1.05],[.38,-.98],[.9,-.62],[.05,-.5]].forEach(([x,y])=>{add(x-.11,y,"mno2");add(x+.11,y,"mno2");add(x,y+.19,"mno2")})}
  return S}
function spawnPart(kind,T,top){const a=top?Math.PI*(.25+Math.random()*.5):Math.random()*6.283,rad=top?LR-.2:Math.sqrt(Math.random())*(LR-.3);
  let x=Math.cos(a)*rad,y=top?Math.sin(a)*rad:Math.abs(Math.sin(a)*rad)*.9+.0;if(!top&&kind!=="no2"&&kind!=="pair")y=Math.max(y,-.2);
  const E=sampleE(T),v=VS*Math.sqrt(2*E),d=top?-Math.PI/2+(Math.random()-.5)*1.4:Math.random()*6.283;
  return {kind,x,y,vx:Math.cos(d)*v,vy:Math.sin(d)*v,E,th:Math.random()*6.283,w:(Math.random()-.5)*5,a:top?0:1,dead:0}}
function setSpeed(p,T){p.E=sampleE(T);const v=VS*Math.sqrt(2*p.E),m=Math.hypot(p.vx,p.vy)||1;p.vx=p.vx/m*v;p.vy=p.vy/m*v}
function lensBuild(mode,st){LW.key=mode;LW.sites=buildSites(mode);LW.site0=LW.sites.length;LW.parts=[];LW.bubs=[];LW.fx=[];LW.ev=[];LW.runId=s.run.id;
  if(mode==="eq"){const e=eqCounts(s.T);let na=Math.round(e.a);if((EQ_N-na)%2)na++;for(let i=0;i<na;i++)LW.parts.push(spawnPart("no2",s.T,false));
    for(let i=0;i<(EQ_N-na)/2;i++)LW.parts.push(spawnPart("pair",s.T,false));LW.eq={fwd:[],rev:[],hist:[],histT:0};return}
  const tg=lensTarget();for(let i=0;i<tg;i++)LW.parts.push(spawnPart(s.run.rx==="marble"?"acid":"per",s.run.T,false))}
function lensTarget(){const r=s.run;return r.rx==="marble"?Math.max(1,Math.round(9*acidNow(r,r.started?r.x:0))):Math.round(14*(1-r.x))}
const sitesOn=()=>s.run.started&&(s.run.rx==="marble"||s.run.cat);
function lensEvent(ok,why,x,y){LW.ev.push({t:LW.t,ok});LW.fx.push({x,y,t:LW.t,ok});if(ok||LW.t-LW.out.t>1.3)LW.out={t:LW.t,why}}
function lensTick(dt,st){dt=Math.min(dt,.05);LW.t+=dt;const mode=lensMode(st);if(mode!==LW.key)lensBuild(mode,st);
  if(mode==="eq"){eqTick(dt);return}
  const r=s.run,T=r.T;
  if(LW.runId!==r.id){LW.runId=r.id;LW.sites.forEach(x=>{x.alive=1;x.fade=0});LW.bubs=[]}
  const react=r.started&&!r.complete,on=sitesOn();
  // the marble surface in the window follows the model: as the chips are used up, surface particles go
  if(r.rx==="marble"&&on){const alive=LW.sites.filter(x=>x.alive).length,target=r.x>=1?0:Math.ceil(LW.site0*(1-r.x)-1e-6);LW.forceT+=dt;
    if(alive>target&&(alive>target+1||LW.forceT>1.4||r.x>=1)){const top=LW.sites.filter(x=>x.alive).sort((a,b)=>b.y-a.y)[0];if(top){top.alive=0;LW.fx.push({x:top.x,y:top.y+RS,t:LW.t,ok:true});LW.bubs.push({x:top.x,y:top.y+RS,r:.07+Math.random()*.04,vy:.5});LW.forceT=0}}}
  LW.sites.forEach(x=>{x.fade=Math.max(0,Math.min(1,x.fade+(x.alive&&on?dt:-dt)*4))});
  // particles: keep the count at the model's concentration
  const want=lensTarget(),kind=r.rx==="marble"?"acid":"per";let live=LW.parts.filter(p=>!p.dead);
  LW.parts.forEach(p=>{if(p.kind!==kind&&!p.dead)p.dead=1});live=LW.parts.filter(p=>!p.dead);
  LW.spawnT-=dt;if(live.length<want&&LW.spawnT<=0){LW.parts.push(spawnPart(kind,T,true));LW.spawnT=.22}
  if(live.length>want){const p=live[live.length-1];p.dead=1}
  const alive=LW.sites.filter(x=>x.alive&&on);
  for(const p of LW.parts){if(p.dead){p.a-=dt*3;continue}p.a=Math.min(1,p.a+dt*3);p.x+=p.vx*dt;p.y+=p.vy*dt;p.th+=p.w*dt;
    const d=Math.hypot(p.x,p.y);if(d>LR-RA){const nx=p.x/d,ny=p.y/d,vn=p.vx*nx+p.vy*ny;if(vn>0){p.vx-=2*vn*nx;p.vy-=2*vn*ny}p.x=nx*(LR-RA);p.y=ny*(LR-RA)}
    for(const q of alive){const dx=p.x-q.x,dy=p.y-q.y,dd=Math.hypot(dx,dy);if(dd>=RA+RS||dd<1e-6)continue;const nx=dx/dd,ny=dy/dd,vn=p.vx*nx+p.vy*ny;
      p.x=q.x+nx*(RA+RS);p.y=q.y+ny*(RA+RS);if(vn>=0)continue;p.vx-=2*vn*nx;p.vy-=2*vn*ny;
      const Ea=q.kind==="mno2"?E0.perC:E0.marble,face=-(Math.cos(p.th)*nx+Math.sin(p.th)*ny)>=.5,hot=p.E>=Ea;
      const ok=react&&hot&&face&&s.playing!==false;
      lensEvent(ok,ok?"ok":!hot?"energy":"orient",q.x+nx*RS,q.y+ny*RS);
      if(ok){p.dead=1;LW.bubs.push({x:q.x+nx*(RS+.06),y:q.y+ny*(RS+.06),r:.06+Math.random()*.04,vy:.45+Math.random()*.2});
        if(q.kind==="caco3"){const n=LW.sites.filter(x=>x.alive).length,target=Math.ceil(LW.site0*(1-r.x)-1e-6);if(n>target){q.alive=0;LW.forceT=0}}}
      else if(Math.random()<.4)setSpeed(p,T);break}}
  // particle–particle bumps (peroxide without a catalyst can only react this way, and almost never has the energy)
  const lv=LW.parts.filter(p=>!p.dead);
  for(let i=0;i<lv.length;i++)for(let j=i+1;j<lv.length;j++){const a=lv[i],b=lv[j],dx=b.x-a.x,dy=b.y-a.y,dd=Math.hypot(dx,dy);if(dd>=2*RA||dd<1e-6)continue;
    const nx=dx/dd,ny=dy/dd,rv=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;const ov=(2*RA-dd)/2;a.x-=nx*ov;a.y-=ny*ov;b.x+=nx*ov;b.y+=ny*ov;if(rv>=0)continue;
    a.vx+=rv*nx;a.vy+=rv*ny;b.vx-=rv*nx;b.vy-=rv*ny;
    if(kind==="per"){const Er=(rv*rv)/(4*VS*VS);const face=(Math.cos(a.th)*nx+Math.sin(a.th)*ny)>=.5,hot=Er>=E0.perU,ok=react&&hot&&face&&s.playing!==false;
      lensEvent(ok,ok?"ok":!hot?"energy":"orient",(a.x+b.x)/2,(a.y+b.y)/2);if(ok){a.dead=1;LW.bubs.push({x:a.x,y:a.y,r:.07,vy:.5})}}
    a.E=(a.vx*a.vx+a.vy*a.vy)/(2*VS*VS);b.E=(b.vx*b.vx+b.vy*b.vy)/(2*VS*VS)}
  LW.parts=LW.parts.filter(p=>!(p.dead&&p.a<=0));
  for(const b of LW.bubs){b.y+=b.vy*dt;b.x+=Math.sin(LW.t*3+b.r*50)*.08*dt;b.vy=Math.min(.9,b.vy+dt*.3)}
  LW.bubs=LW.bubs.filter(b=>b.y<Math.sqrt(Math.max(0,LR*LR-b.x*b.x))-.08).slice(-30);
  LW.fx=LW.fx.filter(f=>LW.t-f.t<.5);LW.ev=LW.ev.filter(e=>LW.t-e.t<3)}
function eqTick(dt){const T=s.T,E=LW.eq,e=eqCounts(T);const kr=.22*Math.pow((T+273.15)/T0,8),kf=kr*e.b/Math.max(.5,e.a*(e.a-1)/2);
  for(const p of LW.parts){if(p.join){p.join.t+=dt;const o=p.join.o;const mx=(p.join.x0+o.join.x0)/2,my=(p.join.y0+o.join.y0)/2,k=Math.min(1,p.join.t/.3);p.x=S2(p.join.x0,mx,k);p.y=S2(p.join.y0,my,k);continue}
    p.x+=p.vx*dt;p.y+=p.vy*dt;p.th+=p.w*dt*.6;const d=Math.hypot(p.x,p.y),rr=LR-(p.kind==="pair"?.2:.11);if(d>rr){const nx=p.x/d,ny=p.y/d,vn=p.vx*nx+p.vy*ny;if(vn>0){p.vx-=2*vn*nx;p.vy-=2*vn*ny}p.x=nx*rr;p.y=ny*rr}}
  // finish joins
  for(const p of LW.parts){if(p.join&&!p.dead&&p.join.t>=.3&&p.join.lead){const o=p.join.o;p.dead=o.dead=1;const m=spawnPart("pair",T,false);m.x=(p.x+o.x)/2;m.y=(p.y+o.y)/2;m.th=Math.atan2(o.join.y0-p.join.y0,o.join.x0-p.join.x0);LW.parts.push(m);LW.fx.push({x:m.x,y:m.y,t:LW.t,ok:true})}}
  LW.parts=LW.parts.filter(p=>!p.dead);
  const A=LW.parts.filter(p=>p.kind==="no2"&&!p.join),B=LW.parts.filter(p=>p.kind==="pair");
  if(A.length>=2&&Math.random()<kf*A.length*(A.length-1)/2*dt){const a=A[Math.floor(Math.random()*A.length)];let best=null,bd=9;for(const b of A)if(b!==a){const d=Math.hypot(b.x-a.x,b.y-a.y);if(d<bd){bd=d;best=b}}
    if(best){a.join={o:best,t:0,x0:a.x,y0:a.y,lead:true};best.join={o:a,t:0,x0:best.x,y0:best.y};E.fwd.push(LW.t)}}
  if(B.length&&Math.random()<kr*B.length*dt){const m=B[Math.floor(Math.random()*B.length)];m.dead=1;const c=Math.cos(m.th),sn=Math.sin(m.th);
    for(const sg of [-1,1]){const p=spawnPart("no2",T,false);p.x=m.x+sg*c*.12;p.y=m.y+sg*sn*.12;const v=Math.hypot(p.vx,p.vy);p.vx=sg*c*v;p.vy=sg*sn*v;LW.parts.push(p)}
    LW.fx.push({x:m.x,y:m.y,t:LW.t,ok:false});E.rev.push(LW.t)}
  LW.parts=LW.parts.filter(p=>!p.dead);
  E.fwd=E.fwd.filter(t=>LW.t-t<5);E.rev=E.rev.filter(t=>LW.t-t<5);E.histT+=dt;if(E.histT>=.25){E.histT=0;E.hist.push([LW.t,eqNow()]);if(E.hist.length>200)E.hist.shift()}
  LW.fx=LW.fx.filter(f=>LW.t-f.t<.5)}
const S2=(a,b,k)=>a+(b-a)*k*k*(3-2*k);
function eqNow(){const a=LW.parts.filter(p=>p.kind==="no2").length,b=LW.parts.filter(p=>p.kind==="pair").length;return a+b?a/(a+b):0}
const lensRate=ok=>LW.ev.filter(e=>ok==null||e.ok===ok).length/3;

// ================================================================ pens: one drawing, two outputs (the SVG under the bench, and canvas screens in 3D)
const FONT="'Instrument Sans',system-ui,sans-serif";
function svgPen(){let o="";const f=n=>Math.round(n*10)/10;
  const paint=(st,line)=>`fill="${st.fill||"none"}"${st.stroke?` stroke="${st.stroke}" stroke-width="${st.lw||1}"`:""}${st.dash?` stroke-dasharray="${st.dash.join(" ")}"`:""}${st.op!=null?` opacity="${st.op}"`:""}${line?` stroke-linecap="round" stroke-linejoin="round"`:""}`;
  return {rect(x,y,w,h,st={}){o+=`<rect x="${f(x)}" y="${f(y)}" width="${f(Math.max(0,w))}" height="${f(Math.max(0,h))}" rx="${st.r||0}" ${paint(st)}/>`},
    line(pts,st={}){if(pts.length<2)return;o+=`<path d="${pts.map((p,i)=>(i?"L":"M")+f(p[0])+","+f(p[1])).join("")}${st.close?"Z":""}" ${paint(st,true)}/>`},
    circle(x,y,r,st={}){o+=`<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" ${paint(st)}/>`},
    text(x,y,t,st={}){const tt=st.caps?String(t).toUpperCase():String(t);o+=`<text x="${f(x)}" y="${f(y)}" text-anchor="${st.anchor||"start"}" style="font:${st.weight||600} ${st.size||10}px ${FONT};fill:${st.fill||INK};letter-spacing:${st.caps?".06em":"0"}">${esc(tt)}</text>`},
    out:()=>o}}
function canvasPen(g,k){const set=st=>{g.globalAlpha=st.op!=null?st.op:1;g.setLineDash(st.dash?st.dash.map(d=>d*k):[]);g.lineWidth=(st.lw||1)*k;g.lineCap="round";g.lineJoin="round"};
  return {rect(x,y,w,h,st={}){set(st);g.beginPath();const r=(st.r||0)*k;if(g.roundRect)g.roundRect(x*k,y*k,Math.max(0,w)*k,Math.max(0,h)*k,r);else g.rect(x*k,y*k,w*k,h*k);if(st.fill){g.fillStyle=st.fill;g.fill()}if(st.stroke){g.strokeStyle=st.stroke;g.stroke()}g.globalAlpha=1},
    line(pts,st={}){if(pts.length<2)return;set(st);g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0]*k,p[1]*k):g.moveTo(p[0]*k,p[1]*k));if(st.close)g.closePath();if(st.fill){g.fillStyle=st.fill;g.fill()}if(st.stroke){g.strokeStyle=st.stroke;g.stroke()}g.globalAlpha=1;g.setLineDash([])},
    circle(x,y,r,st={}){set(st);g.beginPath();g.arc(x*k,y*k,r*k,0,Math.PI*2);if(st.fill){g.fillStyle=st.fill;g.fill()}if(st.stroke){g.strokeStyle=st.stroke;g.stroke()}g.globalAlpha=1},
    text(x,y,t,st={}){g.globalAlpha=st.op!=null?st.op:1;g.font=`${st.weight||600} ${(st.size||10)*k}px Instrument Sans, system-ui, sans-serif`;g.fillStyle=st.fill||INK;g.textAlign=st.anchor==="middle"?"center":st.anchor==="end"?"right":"left";
      try{g.letterSpacing=st.caps?`${(.06*(st.size||10)*k).toFixed(1)}px`:"0px"}catch(e){}g.fillText(st.caps?String(t).toUpperCase():String(t),x*k,y*k);g.globalAlpha=1}}}
const NICE=[30,60,90,120,180,240,300,450,600,900];
const niceT=t=>NICE.find(n=>n>=t)||900;
const decim=(pts,n)=>{if(pts.length<=n)return pts;const o=[],st=(pts.length-1)/(n-1);for(let i=0;i<n;i++)o.push(pts[Math.round(i*st)]);return o};
// ---- the rate graph: gas collected (or change in mass) against time, with the previous run as a faded second line
function drawGraph(p,st){const W=420,H=260,r=s.run,g=s.ghost&&s.ghost.rx===r.rx&&s.ghost!==r?s.ghost:null,mass=s.meas==="mass";
  const X0=52,X1=W-16,Y0=H-38,Y1=50;
  let tm=Math.max(30,r.pred*1.22,r.t);if(g&&!g.capped)tm=Math.max(tm,g.complete?g.tEnd*1.22:g.t);tm=niceT(Math.min(tm,TMAX));
  const X=t=>X0+t/tm*(X1-X0),val=(run,x)=>mass?-x*MLOSS(run.rx):x*VMAX(run.rx),Y=v=>mass?Y1+(-v)/.2*(Y0-Y1):Y0-v/100*(Y0-Y1);
  p.rect(0,0,W,H,{fill:"#FFFFFF",r:14});
  const f=GAS[r.rx].f;
  p.text(16,22,mass?"Change in mass (g)":`${f} collected (mL)`,{size:11.5,weight:700,fill:INK});
  p.text(W-16,22,runTxt(r),{anchor:"end",size:10.5,weight:600,fill:ACC});
  if(g){p.line([[W-176,33],[W-160,33]],{stroke:GHOST,lw:2,dash:[4,3]});p.text(W-16,36,"previous: "+runTxt(g),{anchor:"end",size:9.5,weight:500,fill:MUTED})}
  // grid and axes
  const yt=mass?[0,-.05,-.1,-.15,-.2]:[0,20,40,60,80,100];
  yt.forEach(v=>{p.line([[X0,Y(v)],[X1,Y(v)]],{stroke:GRID,lw:1});p.text(X0-6,Y(v)+3.5,mass?(v===0?"0":v.toFixed(2)):String(v),{anchor:"end",size:9.5,weight:500,fill:MUTED})});
  const step={30:10,60:10,90:30,120:30,180:30,240:60,300:60,450:90,600:120,900:180}[tm]||tm/4;for(let t=0;t<=tm+1e-6;t+=step){p.line([[X(t),Y0],[X(t),Y0+4]],{stroke:"#8F9BAA",lw:1});p.text(X(t),Y0+16,String(Math.round(t)),{anchor:"middle",size:9.5,weight:500,fill:MUTED})}
  p.line([[X0,Y1-6],[X0,Y0],[X1,Y0]],{stroke:"#8F9BAA",lw:1.2});
  p.text((X0+X1)/2,H-6,"time (s)",{anchor:"middle",size:10,weight:600,fill:MUTED});
  const path=run=>decim(run.pts.filter(q=>q[0]<=tm+1e-6),260).map(q=>[X(q[0]),Y(val(run,q[1]))]);
  if(g){p.line(path(g),{stroke:GHOST,lw:2,dash:[5,4]})}
  // the plateau: the limiting reactant is used up
  if(r.complete&&!r.capped){const yv=Y(val(r,1));p.line([[X0,yv],[X1,yv]],{stroke:MINTD,lw:1,dash:[2,4],op:.8});p.text(X1-2,yv+(mass?14:-6),r.rx==="marble"?"all the marble has reacted":"all the H₂O₂ has broken down",{anchor:"end",size:9.5,weight:600,fill:MINTD})}
  // initial-rate tangent
  if(r.r0>1e-6){const sl=mass?-r0Mass(r):r.r0,lim=mass?.2/Math.max(1e-9,r0Mass(r)):100/r.r0,t1=Math.min(tm*.42,lim*.9);
    p.line([[X(0),Y(0)],[X(t1),Y(sl*t1)]],{stroke:SKYD,lw:1.6,dash:[5,4]});
    p.text(X(t1)+5,Y(sl*t1)+(mass?12:4),"initial rate",{size:9.5,weight:600,fill:SKYD})}
  if(r.pts.length>1)p.line(path(r),{stroke:ACC,lw:2.6});
  if(r.started){const v=val(r,r.x),cx=X(Math.min(r.t,tm)),cy=Y(v);
    if(!r.complete&&r.t>0){const rn=mass?-massRate(r):rateNow(r),dt=tm*.08,pts=[[X(Math.max(0,r.t-dt)),Y(v-rn*dt)],[X(Math.min(tm,r.t+dt)),Y(v+rn*dt)]];p.line(pts,{stroke:INK,lw:1.6});p.text(cx+6,cy+(mass?-8:16),"rate now = gradient",{size:9.5,weight:600,fill:INK})}
    p.circle(cx,cy,4.2,{fill:P.product.butter,stroke:INK,lw:1.4})}
  else p.text((X0+X1)/2,(Y0+Y1)/2,"Press Play to start the run",{anchor:"middle",size:12,weight:600,fill:MUTED})}
// ---- energy: the profile (with and without a catalyst) and how many collisions have enough energy
function drawEnergy(p,st){const W=420,H=260,r=s.run,per=r.rx==="perox",cat=per&&r.cat;
  p.rect(0,0,W,H,{fill:"#FFFFFF",r:14});
  // profile
  p.text(16,22,"Energy profile",{caps:true,size:10.5});p.text(16,36,per?"2H₂O₂ → 2H₂O + O₂":"CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂",{size:9.5,weight:500,fill:MUTED});
  const x0=22,x1=200,yb=226,yR=170,yP=204,yU=70,yC=126,ua=56,ub=170;
  p.line([[x0,yb],[x0,52]],{stroke:"#8F9BAA",lw:1.2});p.line([[x0-3,58],[x0,52],[x0+3,58]],{stroke:"#8F9BAA",lw:1.2});p.text(x0+5,58,"energy",{size:9,weight:500,fill:MUTED});
  p.line([[x0,yb],[x1,yb]],{stroke:"#8F9BAA",lw:1.2});p.text((x0+x1)/2,yb+14,"reaction progress",{anchor:"middle",size:9,weight:500,fill:MUTED});
  const curve=fn=>{const o=[];for(let i=0;i<=60;i++){const u=i/60,x=ua+(ub-ua)*u;o.push([x,fn(u)])}return [[x0+6,yR],...o,[x1-4,yP]]};
  const sm=u=>u*u*(3-2*u),base=u=>yR+(yP-yR)*sm(u);
  const unc=u=>base(u)-(yR-yU)*Math.exp(-Math.pow((u-.46)/.19,2));
  const cc=u=>base(u)-(yR-yC)*(Math.exp(-Math.pow((u-.33)/.12,2))+.82*Math.exp(-Math.pow((u-.64)/.12,2)));
  p.line(curve(unc),{stroke:INK,lw:2.2,op:cat?.5:1});
  if(per)p.line(curve(cc),{stroke:ACC,lw:cat?2.6:1.6,dash:cat?null:[5,4],op:cat?1:.7});
  const xa=ua+(ub-ua)*.46,arrow=(x,ya,yb2,c)=>{p.line([[x,ya],[x,yb2]],{stroke:c,lw:1.3});p.line([[x-3,yb2+5],[x,yb2],[x+3,yb2+5]],{stroke:c,lw:1.3})};
  p.line([[x0+6,yR],[xa+4,yR]],{stroke:GHOST,lw:1,dash:[2,3]});
  arrow(xa,yR,yU+2,INK);p.text(xa+5,(yR+yU)/2,"Ea",{size:10.5,weight:700,fill:INK});
  if(per){const xc=ua+(ub-ua)*.33;arrow(xc,yR,yC+2,ACC);p.text(xc-5,(yR+yC)/2+18,"Ea with",{anchor:"end",size:9,weight:700,fill:ACC});p.text(xc-5,(yR+yC)/2+29,"catalyst",{anchor:"end",size:9,weight:700,fill:ACC})}
  p.text(x0+6,yR-6,"reactants",{size:9,weight:500,fill:MUTED});p.text(x1-4,yP-6,"products",{anchor:"end",size:9,weight:500,fill:MUTED});
  // collision energies at this temperature
  const ex0=226,ex1=404,ey0=226,ey1=60,EM=9,X=E=>ex0+E/EM*(ex1-ex0),fE=(E,T)=>{const k=kTv(T);return 2/Math.sqrt(Math.PI)*Math.sqrt(E)/Math.pow(k,1.5)*Math.exp(-E/k)},Y=v=>ey0-v/.56*(ey0-ey1);
  p.text(ex0,22,"Collision energies",{caps:true,size:10.5});p.text(ex0,36,"illustrative spread at "+r.T+" °C",{size:9.5,weight:500,fill:MUTED});
  p.line([[ex0,ey0],[ex1,ey0]],{stroke:"#8F9BAA",lw:1.2});p.text((ex0+ex1)/2,ey0+14,"energy of a collision",{anchor:"middle",size:9,weight:500,fill:MUTED});
  const ea=eaNow(r),pts=T=>{const o=[];for(let i=0;i<=80;i++){const E=i/80*EM;o.push([X(E),Y(fE(E,T))])}return o};
  const fill=[];for(let i=0;i<=60;i++){const E=ea+i/60*(EM-ea);fill.push([X(E),Y(fE(E,r.T))])}fill.push([X(EM),ey0],[X(ea),ey0]);
  p.line(fill,{fill:cat?"#F6C9A9":"#F9D2B8",close:true,op:.9});
  if(r.T!==20)p.line(pts(20),{stroke:GHOST,lw:1.6,dash:[4,3]});
  p.line(pts(r.T),{stroke:INK,lw:2.2});
  const vline=(E,c,lab,dy,dash)=>{p.line([[X(E),ey0],[X(E),ey1+6]],{stroke:c,lw:1.5,dash});p.text(X(E)+4,ey1+16+dy,lab,{size:9.5,weight:700,fill:c})};
  if(per){vline(E0.perU,INK,"Ea",0,cat?[3,3]:null);vline(E0.perC,ACC,"Ea with catalyst",16,cat?null:[3,3])}else vline(E0.marble,INK,"Ea",0);
  const fr=enough(ea,r.T);p.text(ex1,ey0-30,`${Math.round(fr*1000)/10}%`,{anchor:"end",size:14,weight:700,fill:ACC});p.text(ex1,ey0-17,"have enough energy",{anchor:"end",size:9,weight:600,fill:ACC});
  if(r.T!==20)p.text(ex1,ey1-2,"dashed: 20 °C",{anchor:"end",size:9,weight:500,fill:MUTED})}
// ---- equilibrium: forward and reverse rates, and the share of NO2 over time
function drawEq(p){const W=420,H=260,T=s.T;p.rect(0,0,W,H,{fill:"#FFFFFF",r:14});
  p.text(16,22,"Dynamic equilibrium",{caps:true,size:10.5});p.text(16,38,"2NO₂(g) ⇌ N₂O₄(g)   forward reaction exothermic",{size:10,weight:600,fill:INK});
  const fw=LW.eq?LW.eq.fwd.length/5:0,rv=LW.eq?LW.eq.rev.length/5:0,mx=Math.max(4,fw,rv)*1.1;
  [["forward: 2NO₂ → N₂O₄",fw,ACC],["reverse: N₂O₄ → 2NO₂",rv,SKYD]].forEach(([l,v,c],i)=>{const y=66+i*40;p.text(16,y,l,{size:9.5,weight:600,fill:MUTED});p.rect(16,y+6,180,14,{fill:"#F2EEF6",r:7});p.rect(16,y+6,180*v/mx,14,{fill:c,r:7});p.text(200,y+17,n1(v)+" a second",{size:9.5,weight:600,fill:INK})});
  p.text(16,166,"in the window, last 5 s",{size:9,weight:500,fill:MUTED});
  const kc=kcRatio(T);p.text(16,196,`Kc at ${T} °C = ${kc>=1?n2(kc):kc.toFixed(3)} × its value at 20 °C`,{size:10,weight:600,fill:INK});
  p.text(16,212,T===20?"Change the temperature to shift the equilibrium.":T>20?"Hotter: the endothermic reverse reaction is favoured.":"Cooler: the exothermic forward reaction is favoured.",{size:9.5,weight:500,fill:MUTED});
  // share history
  const gx0=276,gx1=404,gy0=226,gy1=70;p.text(gx0,62,"Share of molecules that are NO₂",{size:9,weight:600,fill:MUTED});
  [0,.5,1].forEach(v=>{const y=gy0-v*(gy0-gy1);p.line([[gx0,y],[gx1,y]],{stroke:GRID});p.text(gx0-4,y+3,Math.round(v*100)+"%",{anchor:"end",size:8.5,weight:500,fill:MUTED})});
  const h=LW.eq?LW.eq.hist:[];if(h.length>1){const t1=h[h.length-1][0],X=t=>gx1-(t1-t)/40*(gx1-gx0);p.line(h.filter(q=>t1-q[0]<=40).map(q=>[X(q[0]),gy0-q[1]*(gy0-gy1)]),{stroke:BROWN,lw:2})}
  const eq=eqShare(T);p.line([[gx0,gy0-eq*(gy0-gy1)],[gx1,gy0-eq*(gy0-gy1)]],{stroke:ACC,lw:1,dash:[3,3]});p.text(gx1,gy0+14,"last 40 s",{anchor:"end",size:8.5,weight:500,fill:MUTED})}
function drawPanel(p,st){if(st.k==="equil")return drawEq(p);if(["collide","temp","catalyst"].includes(st.k))return drawEnergy(p,st);return drawGraph(p,st)}

// ================================================================ the drawing (fallback without WebGL, and with ?lite)
const lensSVG=(cx,cy,rad,st)=>{const k=rad/LR,X=x=>cx+x*k,Y=y=>cy-y*k;let o="";
  o+=`<circle cx="${cx+5}" cy="${cy+6}" r="${rad+6}" fill="${P.shadow}" opacity=".12"/><circle cx="${cx}" cy="${cy}" r="${rad+6}" fill="#fff" stroke="${ACC}" stroke-width="3"/><circle cx="${cx}" cy="${cy}" r="${rad}" fill="${LW.key==="eq"?"#FBF6F1":"#F3F8FC"}"/>`;
  for(const q of LW.sites){if(q.fade<=0)continue;const c=q.kind==="mno2"?"#4A3F44":"#F4EFE6";o+=`<circle cx="${X(q.x).toFixed(1)}" cy="${Y(q.y).toFixed(1)}" r="${(RS*k).toFixed(1)}" fill="${c}" stroke="${q.kind==="mno2"?"#2A2328":"#B9AE9C"}" stroke-width="1" opacity="${q.fade.toFixed(2)}"/>`}
  for(const b of LW.bubs)o+=`<circle cx="${X(b.x).toFixed(1)}" cy="${Y(b.y).toFixed(1)}" r="${(b.r*k).toFixed(1)}" fill="#fff" stroke="#9FB7CF" stroke-width="1"/>`;
  const ea=eaNow(s.run);
  for(const p of LW.parts){const a=Math.max(0,Math.min(1,p.a));if(a<=0)continue;
    if(p.kind==="pair"){const c=Math.cos(p.th)*.09,sn=Math.sin(p.th)*.09;o+=`<g opacity="${a.toFixed(2)}"><line x1="${X(p.x-c).toFixed(1)}" y1="${Y(p.y-sn).toFixed(1)}" x2="${X(p.x+c).toFixed(1)}" y2="${Y(p.y+sn).toFixed(1)}" stroke="#C9B9A6" stroke-width="3"/><circle cx="${X(p.x-c).toFixed(1)}" cy="${Y(p.y-sn).toFixed(1)}" r="${(.085*k).toFixed(1)}" fill="#EFE6DA" stroke="#B9A58E"/><circle cx="${X(p.x+c).toFixed(1)}" cy="${Y(p.y+sn).toFixed(1)}" r="${(.085*k).toFixed(1)}" fill="#EFE6DA" stroke="#B9A58E"/></g>`;continue}
    const col=p.kind==="no2"?"#B5653A":p.kind==="per"?"#A9B8F0":P.product.blueberry,hot=p.kind!=="no2"&&p.E>=ea;
    if(hot)o+=`<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="${(RA*k*2).toFixed(1)}" fill="${P.product.butter}" opacity="${(.45*a).toFixed(2)}"/>`;
    o+=`<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="${(RA*k).toFixed(1)}" fill="${col}" stroke="${INK}" stroke-opacity=".35" opacity="${a.toFixed(2)}"/>`;
    if(p.kind!=="no2")o+=`<circle cx="${X(p.x+Math.cos(p.th)*RA).toFixed(1)}" cy="${Y(p.y+Math.sin(p.th)*RA).toFixed(1)}" r="${(RA*k*.45).toFixed(1)}" fill="${P.product.lime}" stroke="${INK}" stroke-opacity=".3" opacity="${a.toFixed(2)}"/>`}
  for(const f of LW.fx){const u=(LW.t-f.t)/.5;o+=`<circle cx="${X(f.x).toFixed(1)}" cy="${Y(f.y).toFixed(1)}" r="${((.08+u*.25)*k).toFixed(1)}" fill="none" stroke="${f.ok?MINTD:"#8F9BAA"}" stroke-width="${f.ok?2.5:1.2}" opacity="${(1-u).toFixed(2)}"/>`}
  o+=`<path d="M${cx-rad*.62},${cy-rad*.7} a${rad*.95},${rad*.95} 0 0 1 ${rad*.9},${-rad*.22}" stroke="#fff" stroke-width="3" fill="none" opacity=".8" stroke-linecap="round"/>`;
  return o};
const FLK=[[-1,0],[-.3,-.72],[-.3,-1],[.3,-1],[.3,-.72],[1,0]];
function flaskSVG(cx,by,w,h,r,plug){const X=u=>cx+u*w,Y=v=>by+v*h;let o="";const per=r.rx==="perox",lvl=per?.2:.3;
  const hw=v=>1-(.7)*(v/.72);
  o+=`<ellipse cx="${cx+w*.3}" cy="${by+3}" rx="${w*1.2}" ry="${w*.12}" fill="${P.shadow}" opacity=".14"/>`;
  o+=`<path d="M${X(-hw(lvl))},${Y(-lvl)} L${X(-1)},${by} L${X(1)},${by} L${X(hw(lvl))},${Y(-lvl)}Z" fill="#CFE4F6" opacity=".7"/>`;
  // solids
  const started=r.started;let n=0;
  if(!per){const N={large:3,small:9,powder:40}[r.size],sz={large:.2,small:.12,powder:.045}[r.size]*w*Math.cbrt(Math.max(0,1-r.x));
    for(let i=0;i<N&&sz>.3;i++){const u=((i*.618)%1)*1.5-.75,yy=started?by-sz*.8-(r.size==="powder"?((i*7)%5)*sz*.6:0):by-h*.08-(i%6)*sz*1.6;const xx=started?X(u*.9):X(.45)+((i%2)-.5)*sz;
      o+=`<path d="M${xx-sz},${yy} l${sz*.5},${-sz*.8} l${sz},${sz*.1} l${sz*.5},${sz*.7} l${-sz*.4},${sz*.6} l${-sz*1.1},${-sz*.1}z" fill="#F4EFE6" stroke="#A89C88" stroke-width=".8"/>`}}
  else if(r.cat){for(let i=0;i<22;i++){const u=((i*.618)%1)*1.0-.5,xx=started?X(u):X(.45)+((i%3)-1)*2,yy=started?by-2-((i*5)%3)*2:by-h*.06-(i%7)*2.4;o+=`<circle cx="${xx.toFixed(1)}" cy="${yy.toFixed(1)}" r="1.9" fill="#4A3F44"/>`}}
  if(!started)o+=`<rect x="${X(.45)-w*.13}" y="${by-h*.42}" width="${w*.26}" height="${h*.4}" rx="${w*.08}" fill="#fff" fill-opacity=".35" stroke="#8FA9C4" stroke-width="1"/>`;
  // bubbles
  const rate=r.started&&!r.complete?dxdt(r,r.x)*VMAX(r.rx):0,nb=Math.min(18,Math.round(rate*3));
  for(let i=0;i<nb;i++){const ph=((r.t*.9+i*.37)%1),u=((i*.618)%1)*1.4-.7;o+=`<circle cx="${X(u*hw(ph*lvl)).toFixed(1)}" cy="${(by-ph*lvl*h).toFixed(1)}" r="${1.4+(i%3)*.6}" fill="#fff" stroke="#9FB7CF" stroke-width=".8"/>`}
  // glass
  o+=`<path d="${FLK.map((q,i)=>(i?"L":"M")+X(q[0]).toFixed(1)+","+Y(q[1]).toFixed(1)).join("")}" fill="#EEF6FF" fill-opacity=".25" stroke="#7E9CBD" stroke-width="1.6" stroke-linejoin="round"/>`;
  o+=`<path d="M${X(-.82)},${Y(-.1)} L${X(-.32)},${Y(-.6)}" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".85"/>`;
  if(plug==="bung")o+=`<rect x="${X(-.36)}" y="${Y(-1.08)}" width="${w*.72}" height="${h*.12}" rx="2" fill="#3C4557"/>`;
  else o+=`<g fill="#fff" stroke="#C9CDD6" stroke-width=".8">${[[-.2,-1.06],[.15,-1.08],[0,-1.14],[-.05,-1.0]].map(([u,v])=>`<circle cx="${X(u)}" cy="${Y(v)}" r="${w*.17}"/>`).join("")}</g>`;
  return o}
function drawMain(x,st){if(has3D)return "";const r=s.run;let o=F.floor(640,330);
  if(!(s.playing&&st.speed))lensTick(0,st);
  // the hot plate, the water bath and flask A
  const heat=Math.max(0,(r.T-20)/40);
  o+=F.box(176,292,170,14,{colour:P.steel,kind:"metal",d:12,r:3,shadowLen:40});
  o+=`<rect x="186" y="289" width="150" height="4" rx="2" fill="#FF7A45" opacity="${(.15+.85*heat).toFixed(2)}"/>`;
  o+=F.acrylic(184,174,152,116,{tint:P.case.sky,d:12,r:8,shadow:false,balls:false});
  o+=`<rect x="188" y="${st.k==="equil"?200:202}" width="144" height="86" rx="4" fill="#9CCBF0" opacity=".3"/>`;
  if(r.T<=15)[[200,198],[300,197],[316,199]].forEach(([a,b])=>o+=`<rect x="${a}" y="${b}" width="12" height="9" rx="2" fill="#fff" stroke="#9FB7CF"/>`);
  if(st.k==="equil"){const sh=eqShare(s.T);o+=`<rect x="200" y="150" width="22" height="130" rx="11" fill="${mix("#F4ECE2",BROWN,.15+sh*.75)}" stroke="#7E9CBD" stroke-width="1.4"/><path d="M205,160 v100" stroke="#fff" stroke-width="2" opacity=".7"/>`}
  o+=flaskSVG(266,286,44,108,r,"bung");
  o+=F.tube(318,150,9,132,(r.T+10)/80,{tint:P.case.sky,fill:P.product.strawberry,shadow:false});
  // delivery tube to the gas syringe on its stand
  o+=`<path d="M266,170 V100 H322" fill="none" stroke="#C8D6E4" stroke-width="5" stroke-linejoin="round"/><path d="M266,170 V100 H322" fill="none" stroke="#fff" stroke-width="1.5" opacity=".8"/>`;
  const V=r.x*VMAX(r.rx),bx0=326,bl=136,hx=bx0+4+(bl-8)*V/100;
  o+=F.box(368,300,80,6,{colour:"#F3F1EC",kind:"plastic",d:8,r:2});o+=`<rect x="404" y="70" width="5" height="232" fill="${P.steel}" stroke="${P.steelDark}"/>`;
  o+=`<rect x="${bx0}" y="88" width="${bl}" height="26" rx="6" fill="#EEF6FF" fill-opacity=".45" stroke="#7E9CBD" stroke-width="1.4"/><rect x="${bx0+3}" y="91" width="${Math.max(0,hx-bx0-3)}" height="20" fill="#FBE3D2" opacity=".6"/>`;
  for(let k=0;k<=10;k++){const xx=bx0+4+(bl-8)*k/10;o+=`<line x1="${xx}" y1="88" x2="${xx}" y2="${k%2?93:97}" stroke="${INK}" stroke-opacity=".5"/>`}
  o+=`<rect x="${hx}" y="90" width="6" height="22" rx="2" fill="#3C4557"/><rect x="${hx+6}" y="98" width="${bl+8}" height="6" fill="#fff" stroke="#C9CDD6"/><rect x="${hx+bl+14}" y="86" width="6" height="30" rx="2" fill="${P.product.butter}" stroke="#B89A3A"/>`;
  o+=`<rect x="398" y="84" width="16" height="34" rx="3" fill="#3A4152"/>`;
  o+=F.pill(332,40,"Gas syringe",{sub:`${n1(V)} mL ${GAS[r.rx].f}`,ax:400,ay:88});
  // the balance with flask B and its cotton wool plug
  o+=F.box(512,290,112,14,{colour:"#F3F1EC",kind:"plastic",d:12,r:4,shadowLen:30});
  o+=`<rect x="530" y="294" width="64" height="9" rx="2" fill="#DDE8D8" stroke="#8F9BAA"/><text x="562" y="301.5" text-anchor="middle" style="font:600 7.5px var(--mono);fill:${INK}">${(startMass(r)-r.x*MLOSS(r.rx)).toFixed(3)} g</text>`;
  o+=flaskSVG(568,289,34,86,r,"cotton");
  o+=F.pill(632,138,"Balance",{sub:"cotton wool lets gas out",ax:568,ay:204,anchor:"end"});
  o+=F.pill(12,262,"Water bath",{sub:`${r.T} °C${r.T<=15?" · ice":r.T>20?" · hot plate on":""}`,ax:190,ay:262});
  // the particle window, with a sight line to the chips
  o+=`<path d="M152,150 L250,270 M150,96 L250,262" stroke="${ACC}" stroke-width="1" stroke-dasharray="3 4" opacity=".5"/>`;
  o+=lensSVG(86,124,74,st);
  o+=`<text class="t-lab" x="86" y="34" text-anchor="middle">PARTICLE WINDOW</text>`;
  if(st.k==="catalyst"||(r.rx==="perox"))o+=F.pill(470,226,"Catalyst",{sub:r.cat?"MnO₂ 0.50 g · not used up":"no MnO₂ added",ax:300,ay:276});
  o+=`<text class="t-ink" x="624" y="24" text-anchor="end">${r.started?(r.complete?(r.capped?"Stopped at 15 min":"Finished"):"Reacting · "+Math.round(r.t)+" s"):"Ready: press Play"}</text>`;
  return o}
function drawClose(x,st){const p=svgPen();drawPanel(p,st);return p.out()}
const mix=(a,b,k)=>{const h=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));const A=h(a),B=h(b);return "#"+A.map((v,i)=>Math.round(v+(B[i]-v)*k).toString(16).padStart(2,"0")).join("")};

// ================================================================ the 3D bench
let has3D=false;
function reactions3d(S){const {THREE,mat}=S,P3=S.PAL;const V3=(x,y,z)=>new THREE.Vector3(x,y,z);const TOP=.3;
  const tmp=V3(0,0,0),tmp2=V3(0,0,0);
  const steel=mat("metal",P3.steel,{rough:.28}),steelD=mat("metal",P3.steelDark,{rough:.32}),white=mat("plastic","#FFFFFF",{rough:.4}),offW=mat("plastic","#F3F1EC",{rough:.45}),
    dark=mat("plastic","#3A4152",{rough:.5}),rubber=mat("plastic","#3C4557",{rough:.85,coat:.05}),accM=mat("plastic",ACC,{rough:.35}),butter=mat("plastic",P3.product.butter,{rough:.3});
  // the bench: one peach plinth
  const bench=S.rbox(20.6,TOP,9.4,.14,mat("plastic",P3.case.peach,{rough:.55,coat:.2}));bench.position.set(-1.1,TOP/2,-.1);S.scene.add(bench);
  // ---------------------------------------------------------------- shared flask parts
  const FL=[[0,0],[.98,0],[1.06,.05],[1.09,.16],[.43,2.42],[.37,2.56],[.36,3.12],[.42,3.17],[.43,3.27],[.36,3.3]].map(q=>new THREE.Vector2(q[0],q[1]));
  const flaskGeo=new THREE.LatheGeometry(FL,56);
  const rIn=h=>h<.16?1.0:Math.max(.33,1.0-(.64)*(h-.16)/2.26);
  const rockGeo=(()=>{const g=new THREE.IcosahedronGeometry(1,0);const pa=g.attributes.position;let sd=7;const rr=()=>(sd=(sd*16807)%2147483647)/2147483647;const m=new Map();
    for(let i=0;i<pa.count;i++){const k=[pa.getX(i),pa.getY(i),pa.getZ(i)].map(v=>v.toFixed(3)).join();if(!m.has(k))m.set(k,.75+rr()*.45);const f=m.get(k);pa.setXYZ(i,pa.getX(i)*f,pa.getY(i)*f*.78,pa.getZ(i)*f)}
    g.computeVertexNormals();return g})();
  const VIAL={x:.42,y:.03,z:-.12,r:.27,h:1.1};
  const LAY={};{let sd=11;const rr=()=>(sd=(sd*16807)%2147483647)/2147483647;
    const mk=(n,r,R,heap,vial)=>{const a=[];for(let i=0;i<n;i++){let x=0,z=0,tries=0;do{const ang=rr()*6.283,rad=Math.sqrt(rr())*R;x=Math.cos(ang)*rad;z=Math.sin(ang)*rad;tries++}while(!heap&&tries<60&&!a.every(c=>Math.hypot(c.x-x,c.z-z)>r*1.9));
      const d=Math.hypot(x,z)/R,v=vial(i,n);a.push({x,z,y:r*.7+(heap?(1-d)*.16+rr()*.05:0),r:r*(.85+rr()*.3),rx:rr()*6,ry:rr()*6,rz:rr()*6,vx:v[0],vy:v[1],vz:v[2]})}return a};
    const col=(i,n)=>[(rr()-.5)*.08,.21+i*.37,(rr()-.5)*.08],tri=(i,n)=>{const l=Math.floor(i/3),a=(i%3)*2.094+l*.6;return [Math.cos(a)*.11,.14+l*.24,Math.sin(a)*.11]},
      pile=hh=>(i,n)=>{const a=rr()*6.283,rad=Math.sqrt(rr())*.19;return [Math.cos(a)*rad,.05+rr()*hh,Math.sin(a)*rad]};
    LAY.large=mk(3,.2,.6,false,col);LAY.small=mk(12,.126,.7,false,tri);LAY.powder=mk(220,.047,.6,true,pile(.5));LAY.mno2=mk(46,.05,.5,true,pile(.22))}
  const bubGeo=new THREE.SphereGeometry(1,10,8);
  function makeFlask(at,plug){const g=S.group();g.position.copy(at);
    const sh=S.mesh(flaskGeo,mat("glass","#EEF6FF",{opacity:.16}),{cast:false});sh.renderOrder=7;g.add(sh);
    g.add(S.torus(1.07,.022,mat("glass","#ffffff",{opacity:.5}),{at:[0,.12,0],rot:[Math.PI/2,0,0],cast:false}));
    const liqM=mat("liquid","#CFE4F6",{fresh:true,opacity:.42});liqM.depthWrite=false;const liq=S.mesh(new THREE.CylinderGeometry(1,1,1,48),liqM,{cast:false});liq.renderOrder=5;g.add(liq);
    const surf=S.mesh(new THREE.CircleGeometry(1,48),mat("liquid","#EAF3FC",{fresh:true,opacity:.6}),{rot:[-Math.PI/2,0,0],cast:false});surf.material.depthWrite=false;surf.renderOrder=5;g.add(surf);
    const rocks=S.swarm(260,rockGeo,mat("plastic","#ffffff",{rough:.6,coat:.15}),{colors:true,cast:true});g.add(rocks);
    const bubs=S.swarm(140,bubGeo,mat("glass","#ffffff",{opacity:.5}),{});bubs.renderOrder=6;g.add(bubs);
    const fizz=S.puffs(30,"#ffffff");g.add(fizz);
    const vial=new THREE.Group();vial.position.set(VIAL.x,VIAL.y,VIAL.z);g.add(vial);
    const vt=S.mesh(new THREE.CylinderGeometry(VIAL.r,VIAL.r,VIAL.h,28,1,true),mat("glass","#F4FAFF",{opacity:.24}),{cast:false});vt.position.y=VIAL.h/2+.04;vt.renderOrder=6;vial.add(vt);
    const vb=S.mesh(new THREE.SphereGeometry(VIAL.r,20,10,0,Math.PI*2,Math.PI/2,Math.PI/2),mat("glass","#F4FAFF",{opacity:.24}),{cast:false});vb.position.y=.04;vb.renderOrder=6;vial.add(vb);
    vial.add(S.torus(VIAL.r,.02,mat("glass","#ffffff",{opacity:.6}),{at:[0,VIAL.h+.04,0],rot:[Math.PI/2,0,0],cast:false}));
    if(plug==="bung"){g.add(S.cyl(.37,.31,.36,rubber,{at:[0,3.3,0],seg:28}))}
    else{const cw=mat("matte","#FBFBF8",{rough:.95});[[0,3.36,0,.22],[.12,3.42,.05,.16],[-.1,3.44,-.04,.17],[.02,3.52,.08,.14],[-.06,3.27,.06,.16]].forEach(([x,y,z,r])=>g.add(S.sphere(r,cw,{at:[x,y,z],seg:14})))}
    const F_={g,liq,surf,rocks,bubs,fizz,vial,drop:0,runId:-1,level:-1,B:Array.from({length:140},()=>({life:0,x:0,y:0,z:0,v:0,r:0})),FZ:Array.from({length:30},()=>({life:0,x:0,y:0,z:0})),acc:0};
    return F_}
  function setLevel(Fk,h){Fk.level=h;Fk.liq.geometry.dispose();Fk.liq.geometry=new THREE.CylinderGeometry(rIn(h)-.03,rIn(0)-.03,h,48);Fk.liq.position.y=.04+h/2;Fk.surf.position.y=.04+h+.001;Fk.surf.scale.setScalar(rIn(h)-.03)}
  const cosA=Math.cos,sinA=Math.sin;
  function updFlask(Fk,r,dt,t,st){const lvl=r.rx==="marble"?.95:.62;if(Fk.level!==lvl)setLevel(Fk,lvl);
    if(Fk.runId!==r.id){Fk.runId=r.id;Fk.drop=0;Fk.B.forEach(b=>b.life=0)}
    Fk.drop=r.started?Math.min(1,Fk.drop+dt/(S.REDUCED?.2:.95)):0;
    const tip=S.ease(S.clamp(Fk.drop/.45,0,1))*1.32,fall=S.ease(S.clamp((Fk.drop-.35)/.65,0,1));Fk.vial.rotation.z=tip;
    const lay=r.rx==="marble"?LAY[r.size]:(r.cat?LAY.mno2:null),shrink=r.rx==="marble"?Math.cbrt(Math.max(0,1-r.x)):1,c=cosA(tip),sn=sinA(tip);let n=0;
    if(lay)for(const q of lay){const lx=q.vx*c-q.vy*sn,ly=q.vx*sn+q.vy*c;const vx=VIAL.x+lx,vy=VIAL.y+.04+ly,vz=VIAL.z+q.vz;
      const x=S.lerp(vx,q.x,fall),z=S.lerp(vz,q.z,fall),y=S.lerp(vy,q.y,fall)+Math.sin(fall*Math.PI)*.22;const sc=q.r*(r.started&&fall>.98?shrink:1);
      if(sc<.004)continue;Fk.rocks.put(n,x,y,z,sc,q.rx,q.ry,q.rz);Fk.rocks.tint(n,r.rx==="marble"?(n%3?"#F4EFE6":"#E9E3D8"):"#4A3F44");n++}
    for(let i=n;i<260;i++)Fk.rocks.put(i,0,-9,0,.0001);Fk.rocks.done();
    // bubbles: as many as the gas is coming off (per real second)
    const run=r.started&&!r.complete&&s.playing&&st.speed,gas=run?dxdt(r,r.x)*VMAX(r.rx)*st.speed:0;Fk.acc+=Math.min(70,gas*1.4)*dt;
    const src=lay&&fall>.98?lay:null;
    while(Fk.acc>=1){Fk.acc--;const b=Fk.B.find(q=>q.life<=0);if(!b)break;const q=src?src[Math.floor(Math.random()*src.length)]:{x:(Math.random()-.5)*1.2,z:(Math.random()-.5)*1.2,y:.1};
      b.x=q.x+(Math.random()-.5)*.1;b.z=q.z+(Math.random()-.5)*.1;b.y=(q.y||.1)+.05;b.v=.7+Math.random()*.6;b.r=.025+Math.random()*.035;b.life=1}
    Fk.B.forEach((b,i)=>{if(b.life>0){b.y+=b.v*dt;b.x+=Math.sin(t*6+i)*.05*dt;if(b.y>=.04+lvl){b.life=0;const z=Fk.FZ.find(q=>q.life<=0);if(z){z.life=.5;z.x=b.x;z.y=.04+lvl+.02;z.z=b.z}}}
      Fk.bubs.put(i,b.x,b.life>0?b.y:-9,b.z,b.life>0?b.r:.0001)});Fk.bubs.done();
    Fk.FZ.forEach((z,i)=>{if(z.life>0)z.life-=dt;Fk.fizz.put(i,z.x,z.y,z.z,Math.max(0,z.life)*.9,60)});Fk.fizz.done();
    Fk.liq.material.color.set(r.rx==="marble"?"#CFE4F6":"#D9E6FA")}
  // ---------------------------------------------------------------- the hot plate and water bath, with flask A in it
  const HP=V3(-5.0,TOP,.6);
  const hot=S.group();hot.position.copy(HP);
  hot.add(S.rbox(4.6,.55,4.2,.12,steel,{at:[0,.275,0]}));
  hot.add(S.rbox(4.3,.05,3.9,.04,mat("plastic","#3B4262",{rough:.6}),{at:[0,.565,0]}));
  hot.add(S.rbox(4.0,.2,.1,.05,dark,{at:[0,.26,2.12]}));
  const knob=S.cyl(.22,.22,.16,mat("plastic",P3.product.peach,{rough:.35}),{at:[1.35,.27,2.2],rot:[Math.PI/2,0,0],seg:28});hot.add(knob);
  hot.add(S.box(.04,.16,.04,white,{at:[1.35,.37,2.29]}));
  const lampM=mat("glow",P3.product.strawberry,0,{fresh:true});hot.add(S.sphere(.07,lampM,{at:[.8,.27,2.2]}));
  const glowM=mat("glow","#FF7A45",0,{fresh:true});[[0,.6,1.83,4.0,.035,.06],[0,.6,-1.83,4.0,.035,.06],[2.03,.6,0,.06,.035,3.6],[-2.03,.6,0,.06,.035,3.6]].forEach(([x,y,z,w,h,d])=>hot.add(S.box(w,h,d,glowM,{at:[x,y,z],cast:false})));
  const B0=TOP+.6;   // bath floor
  const bath=S.acrylicCase(4.0,2.2,3.6,P3.case.sky,{opacity:.13});bath.position.set(HP.x,B0,HP.z);S.scene.add(bath);
  const waterM=mat("liquid","#8CC2EE",{fresh:true,opacity:.32});waterM.depthWrite=false;const water=S.rbox(3.88,1.72,3.48,.06,waterM,{cast:false});water.position.set(HP.x,B0+.88,HP.z);water.renderOrder=3;S.scene.add(water);
  const flaskA=makeFlask(V3(HP.x,B0+.04,HP.z),"bung");
  // bath thermometer
  const th=S.group();th.position.set(HP.x-1.62,B0,HP.z+1.42);
  th.add(S.cyl(.075,.075,3.1,mat("glass","#ffffff",{opacity:.3}),{at:[0,1.65,0],cast:false}));th.add(S.sphere(.12,mat("glow",P3.product.strawberry,.6),{at:[0,.18,0]}));
  const spirit=S.cyl(.04,.04,1,mat("glow",P3.product.strawberry,.6),{seg:12});th.add(spirit);
  const thY=T=>.3+(T-0)/70*2.6;for(let T=10;T<=60;T+=10){th.add(S.box(.13,.012,.012,mat("flat",P3.ink,{opacity:.6}),{at:[-.09,thY(T),.06],cast:false}))}
  // ice for 10–15 °C, convection and steam for hot baths
  const ice=S.swarm(7,new S.RoundedBoxGeometry(.4,.36,.4,2,.06),mat("glass","#ffffff",{opacity:.55}),{});ice.renderOrder=4;S.scene.add(ice);
  const iceAt=[[-1.5,-1.3],[-.6,-1.45],[1.45,-1.3],[1.55,-.3],[1.5,1.1],[-1.5,.2],[.5,1.45]];
  const conv=S.puffs(40,"#FFE2CC");S.scene.add(conv);const CV=Array.from({length:40},()=>({life:0,x:0,y:0,z:0}));
  const steam=S.puffs(24,"#ffffff");S.scene.add(steam);const SM=Array.from({length:24},()=>({life:0,x:0,y:0,z:0}));
  // ---------------------------------------------------------------- the delivery tube and the gas syringe on a clamp stand
  const SX0=-2.45,SL=4.6,SY=3.55,SZ=-.6;
  const tubeM=mat("acrylic","#C9DAE8",{opacity:.85});
  S.scene.add(S.tube([[HP.x,B0+3.48,HP.z],[HP.x,B0+3.95,HP.z],[HP.x+.35,B0+4.25,HP.z-.25],[HP.x+1.3,B0+4.1,HP.z-.8],[SX0-.75,SY+.05,SZ],[SX0-.32,SY,SZ]],.06,tubeM,{seg:90,cast:false}));
  const syr=S.group();syr.position.set(0,0,SZ);
  const barrel=S.mesh(new THREE.CylinderGeometry(.42,.42,SL,40,1,true),mat("glass","#F4FAFF",{opacity:.2}),{cast:false,rot:[0,0,Math.PI/2]});barrel.position.set(SX0+SL/2,SY,0);barrel.renderOrder=6;syr.add(barrel);
  syr.add(S.cyl(.42,.42,.05,mat("glass","#F4FAFF",{opacity:.4}),{rot:[0,0,Math.PI/2],at:[SX0,SY,0],cast:false}));
  syr.add(S.cyl(.07,.1,.36,mat("glass","#F4FAFF",{opacity:.45}),{rot:[0,0,Math.PI/2],at:[SX0-.18,SY,0],cast:false}));
  syr.add(S.torus(.43,.03,mat("glass","#ffffff",{opacity:.6}),{rot:[0,Math.PI/2,0],at:[SX0+SL,SY,0],cast:false}));
  const tickM=mat("flat",P3.ink,{opacity:.55});for(let k=0;k<=20;k++){const x=SX0+.1+(SL-.2)*k/20;syr.add(S.box(.012,k%2?.1:.2,.012,tickM,{at:[x,SY+.42-(k%2?.05:.1),.12],cast:false}))}
  const scale=S.panel(1024,72,SL+.2);scale.position.set(SX0+SL/2,SY+.62,.05);syr.add(scale);
  scale.redraw((g,w,h)=>{g.font="600 30px Instrument Sans, system-ui";g.fillStyle="#4E4868";g.textAlign="center";for(let k=0;k<=10;k++)g.fillText(String(k*10),(.1+(SL-.2)*k/10)/(SL+.2)*w+0.0,h*.62);g.textAlign="right";g.font="600 24px Instrument Sans, system-ui";g.fillText("mL",w-6,h*.62)});
  const gasM=mat("acrylic","#FFE2CC",{fresh:true,opacity:.22});const gasFill=S.mesh(new THREE.CylinderGeometry(.39,.39,1,32),gasM,{cast:false,rot:[0,0,Math.PI/2]});gasFill.renderOrder=5;syr.add(gasFill);
  const plunger=new THREE.Group();syr.add(plunger);
  const phead=S.cyl(.4,.4,.18,rubber,{rot:[0,0,Math.PI/2],seg:32});plunger.add(phead);
  const prod=S.cyl(.11,.11,SL+.25,mat("plastic","#F4F6F8",{rough:.3}),{rot:[0,0,Math.PI/2],seg:16});prod.position.x=.09+(SL+.25)/2;plunger.add(prod);
  const thumb=S.cyl(.46,.46,.1,butter,{rot:[0,0,Math.PI/2],seg:36});thumb.position.x=.09+SL+.3;plunger.add(thumb);
  plunger.position.set(SX0,SY,0);
  // clamp stand
  const stand=S.group();stand.position.set(-.1,TOP,SZ-.75);
  stand.add(S.rbox(2.6,.14,1.5,.06,offW,{at:[0,.07,0]}));stand.add(S.cyl(.065,.065,4.4,steel,{at:[0,2.25,-.3],seg:16}));
  stand.add(S.rbox(.34,.34,.34,.06,dark,{at:[0,SY-TOP,-.3]}));stand.add(S.cyl(.045,.045,.75,steelD,{at:[0,SY-TOP,.1],rot:[Math.PI/2,0,0],seg:12}));
  stand.add(S.torus(.46,.05,accM,{at:[0,SY-TOP,.75],rot:[0,Math.PI/2,0],ts:40}));
  // ---------------------------------------------------------------- the balance with flask B (cotton wool lets the gas out)
  const BAL=V3(4.7,TOP,2.0);const bal=S.group();bal.position.copy(BAL);
  bal.add(S.rbox(3.1,.72,2.9,.16,mat("plastic","#F4F6F8",{rough:.35}),{at:[0,.36,0]}));
  bal.add(S.rbox(2.6,.04,2.4,.03,mat("plastic","#DDE2E8",{rough:.5}),{at:[0,.73,-.1]}));
  bal.add(S.cyl(1.2,1.2,.07,steel,{at:[0,.79,-.1],seg:48}));
  const lcdBox=S.rbox(2.0,.42,.1,.05,dark,{at:[0,.4,1.47]});bal.add(lcdBox);
  const lcd=S.panel(400,88,1.8);lcd.position.set(0,.4,1.53);bal.add(lcd);let lcdKey="";
  [-1.25,1.25].forEach(x=>bal.add(S.cyl(.1,.1,.06,mat("plastic",P3.product.peach),{at:[x,.4,1.48],rot:[Math.PI/2,0,0],seg:16})));
  const flaskB=makeFlask(V3(BAL.x,TOP+.83,BAL.z-.1),"cotton");
  // ---------------------------------------------------------------- MnO2 bottle, the three dishes of marble, the acid bottle
  const mno=S.group();mno.position.set(1.45,TOP,2.85);
  mno.add(S.cyl(.34,.36,.8,mat("glass","#B07A3E",{opacity:.75}),{at:[0,.4,0],cast:false}));mno.add(S.cyl(.2,.3,.16,mat("glass","#B07A3E",{opacity:.75}),{at:[0,.88,0],cast:false}));
  mno.add(S.cyl(.22,.22,.22,dark,{at:[0,1.05,0]}));mno.add(S.cyl(.26,.26,.3,mat("plastic","#3E3438",{rough:.8}),{at:[0,.2,0]}));
  const mnoHit=S.cyl(.5,.5,1.3,mat("flat","#ffffff",{opacity:0,depthWrite:false}),{at:[0,.65,0],cast:false});mnoHit.material.colorWrite=false;mno.add(mnoHit);
  S.pick(mnoHit,()=>{if(s.rx!=="perox"){s.rx="perox";s.cat=true;newRun()}else setting("cat",!s.cat)});
  const dishX={large:-8.85,small:-7.6,powder:-6.35},DZ=3.65;const dishes={};const dishRocks=S.swarm(90,rockGeo,mat("plastic","#ffffff",{rough:.6,coat:.15}),{colors:true});S.scene.add(dishRocks);
  {let n=0,sd=5;const rr=()=>(sd=(sd*16807)%2147483647)/2147483647;Object.entries(dishX).forEach(([k,x])=>{const g=S.group();g.position.set(x,TOP,DZ);
    g.add(S.cyl(.52,.52,.04,mat("glass","#F4FAFF",{opacity:.35}),{at:[0,.02,0],cast:false}));const wall=S.cyl(.53,.53,.12,mat("glass","#F4FAFF",{opacity:.25}),{at:[0,.08,0],cast:false,open:true});wall.renderOrder=6;g.add(wall);
    const ring=S.torus(.6,.035,accM,{at:[0,.02,0],rot:[Math.PI/2,0,0],ts:48});g.add(ring);const hit=S.cyl(.6,.6,.4,mat("flat","#ffffff",{opacity:0,depthWrite:false}),{at:[0,.2,0],cast:false});hit.material.colorWrite=false;g.add(hit);
    S.pick(hit,()=>{if(s.rx!=="marble"){s.rx="marble";s.size=k;newRun()}else setting("size",k)});
    const cnt={large:3,small:9,powder:70}[k],rad={large:.15,small:.09,powder:.032}[k];
    for(let i=0;i<cnt;i++){const a=rr()*6.28,d=Math.sqrt(rr())*(k==="powder"?.28:.3);dishRocks.put(n,x+Math.cos(a)*d,TOP+.05+rad*.7+(k==="powder"?(1-d/.28)*.06:0),DZ+Math.sin(a)*d,rad*(.85+rr()*.3),rr()*6,rr()*6,rr()*6);dishRocks.tint(n,i%3?"#F4EFE6":"#E9E3D8");n++}
    dishes[k]={g,ring}});for(let i=n;i<90;i++)dishRocks.put(i,0,-9,0,.0001);dishRocks.done()}
  const acid=S.group();acid.position.set(.25,TOP,2.95);
  acid.add(S.cyl(.38,.38,1.1,mat("glass","#E2EEF8",{opacity:.4}),{at:[0,.55,0],cast:false}));acid.add(S.cyl(.18,.32,.25,mat("glass","#E2EEF8",{opacity:.4}),{at:[0,1.22,0],cast:false}));acid.add(S.cyl(.2,.2,.18,mat("plastic",P3.product.blueberry,{rough:.4}),{at:[0,1.42,0]}));
  const acidLiq=S.cyl(.34,.34,.7,mat("liquid","#CFE4F6",{opacity:.5}),{at:[0,.4,0],cast:false});acidLiq.renderOrder=5;acid.add(acidLiq);
  acid.add(S.rbox(.5,.32,.02,.04,white,{at:[0,.6,.38],cast:false}));
  // ---------------------------------------------------------------- the particle window: a magnifier on an arm, looking at the chips in flask A
  const lens=S.group();lens.position.set(-9.1,4.2,1.7);lens.rotation.y=.42;
  const LS=1.2;   // window units → world units
  lens.add(S.torus(LR*LS+.09,.1,accM,{ts:72}));
  const lensBack=S.cyl(LR*LS+.05,LR*LS+.05,.06,mat("plastic","#F2F7FC",{rough:.7,coat:.1}),{rot:[Math.PI/2,0,0],at:[0,0,-.06],seg:64,cast:false});lens.add(lensBack);
  const lensBackM=lensBack.material;
  lens.add(S.cyl(.32,.32,.28,mat("plastic",P3.case.peach,{rough:.4}),{rot:[Math.PI/2,0,0],at:[0,0,-.22],seg:24}));
  const front=S.cyl(LR*LS+.05,LR*LS+.05,.02,mat("glass","#ffffff",{opacity:.08}),{rot:[Math.PI/2,0,0],at:[0,0,.2],seg:64,cast:false});front.renderOrder=8;lens.add(front);
  S.scene.add(lens);
  const lstand=S.group();lstand.position.set(-9.45,TOP,1.25);lstand.add(S.rbox(1.1,.12,1.1,.05,offW,{at:[0,.06,0]}));lstand.add(S.cyl(.06,.06,2.1,steel,{at:[0,1.1,0],seg:14}));S.scene.add(lstand);
  S.scene.add(S.tube([[-9.45,TOP+2.1,1.25],[-9.4,TOP+2.3,1.3],[-9.25,4.2-LR*LS-.25,1.55],[-9.18,4.2-LR*LS-.06,1.62]],.05,steel,{seg:30}));
  const lp=S.swarm(44,new THREE.SphereGeometry(RA*LS,16,12),mat("plastic","#ffffff",{rough:.35}),{colors:true});lens.add(lp);
  const lcap=S.swarm(44,new THREE.SphereGeometry(RA*LS*.48,12,8),mat("plastic",P3.product.lime,{rough:.35}),{});lens.add(lcap);
  const lsite=S.swarm(40,new THREE.SphereGeometry(RS*LS,16,12),mat("plastic","#ffffff",{rough:.5}),{colors:true});lens.add(lsite);
  const lbond=S.swarm(24,new THREE.CylinderGeometry(.025,.025,1,8),mat("plastic","#C9B9A6",{rough:.5}),{});lens.add(lbond);
  const lbub=S.swarm(30,new THREE.SphereGeometry(1,14,10),mat("glass","#ffffff",{opacity:.55}),{});lbub.renderOrder=9;lens.add(lbub);
  const lhalo=S.puffs(44,"#FFC46B",{additive:false});lhalo.renderOrder=3;lens.add(lhalo);
  const lfx=S.puffs(24,"#7FE3B5",{additive:false});lens.add(lfx);
  // sight lines from the window's rim to the chips
  {lens.updateMatrixWorld(true);const tgt=V3(HP.x,B0+.25,HP.z);const lm=mat("flat",ACC,{opacity:.28,depthWrite:false});
    [[0,1],[0,-1],[1,0],[-1,0]].forEach(([a,b])=>{const p0=lens.localToWorld(V3(a*(LR*LS+.1),b*(LR*LS+.1),0));const m=S.tube([[p0.x,p0.y,p0.z],[tgt.x,tgt.y,tgt.z]],.012,lm,{seg:2,cast:false});m.renderOrder=4;S.scene.add(m)});
    const tr=S.torus(.32,.015,mat("flat",ACC,{opacity:.6}),{at:[tgt.x,tgt.y,tgt.z],rot:[Math.PI/2,0,0],cast:false});S.scene.add(tr)}
  // ---------------------------------------------------------------- the equilibrium: a sealed tube of NO2 that dips into the bath
  const eqT=S.group();eqT.position.set(HP.x-1.25,0,HP.z-.95);S.scene.add(eqT);
  const tubeG=S.group();eqT.add(tubeG);
  const amp=S.mesh(new THREE.CapsuleGeometry(.3,2.0,8,24),mat("glass","#F4FAFF",{opacity:.25}),{cast:false});amp.renderOrder=7;tubeG.add(amp);
  const gasEqM=mat("liquid",BROWN,{fresh:true,opacity:.5});gasEqM.depthWrite=false;const gasEq=S.mesh(new THREE.CapsuleGeometry(.26,1.95,8,24),gasEqM,{cast:false});gasEq.renderOrder=6;tubeG.add(gasEq);
  tubeG.add(S.cyl(.05,.05,.3,mat("glass","#F4FAFF",{opacity:.4}),{at:[0,1.42,0],cast:false}));
  tubeG.add(S.cyl(.035,.035,1.6,steel,{at:[0,2.3,0],seg:10}));tubeG.add(S.torus(.33,.035,accM,{at:[0,1.0,0],rot:[Math.PI/2,0,0]}));
  let eqK=0,eqShown=0;
  // ---------------------------------------------------------------- the two screens: the rate graph, and energy (or equilibrium)
  const screen=(x,z,w,ry,y0)=>{const g=S.group();g.position.set(x,TOP,z);g.rotation.y=ry||0;const hU=w*260/420,cy=y0+hU/2;
    for(const sx of [-w/2+.4,w/2-.4]){g.add(S.cyl(.06,.06,cy,steel,{at:[sx,cy/2,-.12],seg:12}));g.add(S.rbox(.7,.08,.7,.04,offW,{at:[sx,.04,-.12]}))}
    g.add(S.rbox(w+.3,hU+.3,.12,.08,white,{at:[0,cy,-.08]}));const pn=S.panel(1000,620,w);pn.position.set(0,cy,.0);g.add(pn);S.scene.add(g);return {g,pn,hU,key:"",t:0}};
  const SCR={plot:screen(2.7,-3.95,6.4,-.06,4.0),energy:screen(-5.5,-3.95,5.0,.08,4.0)};
  // ---------------------------------------------------------------- picks
  const hitA=S.cyl(1.15,1.15,3.4,mat("flat","#ffffff",{opacity:0,depthWrite:false}),{at:[HP.x,B0+1.7,HP.z],cast:false});hitA.material.colorWrite=false;S.scene.add(hitA);
  S.pick(hitA,()=>{if(S.api.step.speed)s.playing=!s.playing});
  S.pick(knob,()=>{setting("T",s.T>=60?10:s.T+10)});
  const hitS=S.box(SL+.6,1.0,1.0,mat("flat","#ffffff",{opacity:0,depthWrite:false}),{at:[SX0+SL/2,SY,SZ],cast:false});hitS.material.colorWrite=false;S.scene.add(hitS);S.pick(hitS,()=>{s.meas="vol"});
  const hitB=S.box(3.1,1.0,2.9,mat("flat","#ffffff",{opacity:0,depthWrite:false}),{at:[BAL.x,TOP+.4,BAL.z],cast:false});hitB.material.colorWrite=false;S.scene.add(hitB);S.pick(hitB,()=>{s.meas="mass"});
  // ---------------------------------------------------------------- labels
  const lLens=S.label({cls:"big",off:[30,-58]}),lOut=S.label({off:[40,40]}),lA=S.label({off:[-40,-46]}),lSyr=S.label({cls:"big",off:[24,-40]}),lBal=S.label({cls:"big",off:[34,-30]}),
    lBath=S.label({off:[-40,30]}),lMno=S.label({off:[30,-26]}),lAcid=S.label({off:[-30,-30]}),lTube=S.label({cls:"big",off:[-36,-40]});
  const lDish=Object.keys(dishX).map(k=>S.label({off:[0,34]}));
  // ---------------------------------------------------------------- views
  S.view("collide",[-5.9,6.4,11.6],[-7.2,3.0,0.9],{min:4,max:28});
  S.view("measure",[0.4,10.2,20.5],[-.4,3.4,-.9],{min:6,max:40});
  S.view("conc",[-3.6,8.4,16.0],[-4.4,3.3,-.8],{min:5,max:36});
  S.view("temp",[-5.2,8.0,15.4],[-6.1,3.4,-.9],{min:5,max:34});
  S.view("surface",[-6.2,6.2,11.8],[-7.0,2.6,1.2],{min:4,max:30});
  S.view("catalyst",[-2.4,8.6,16.4],[-3.2,3.4,-.9],{min:5,max:36});
  S.view("equil",[-6.2,7.4,14.0],[-6.8,3.2,-.6],{min:4,max:32});
  S.view("all",[-1.0,13.5,25.5],[-1.2,3.0,-.8],{min:8,max:60});
  const SHOW={collide:[lLens,lOut,lA],measure:[lSyr,lBal,lA],conc:[lLens,lA,lAcid,lSyr],temp:[lLens,lBath,lA],surface:[lLens,lA,...lDish],catalyst:[lMno,lA,lSyr,lLens],equil:[lTube,lLens,lBath],test:[lSyr,lBal,lBath,lA]};
  const ALL=[lLens,lOut,lA,lSyr,lBal,lBath,lMno,lAcid,lTube,...lDish];
  S.goView("measure",true);S.setShadowBox(12,[-1,0,0]);
  has3D=true;
  const col=new THREE.Color(),bq=new THREE.Quaternion(),UP=V3(0,1,0);
  return {
    step(st){const k=st.k,v=k==="test"?"all":k;S.goView(v);S.setShadowBox(v==="all"||v==="measure"?13:8,v==="all"||v==="measure"?[-1,0,0]:[-5.5,0,.5]);ALL.forEach(l=>l.hide());(SHOW[k]||[]).forEach(l=>l.show())},
    update(x,st,dt,t){const r=s.run,k=st.k;
      // the particle window runs while the reaction is running (or waiting, or done); it pauses with the run
      const lensOn=k==="equil"||!(r.started&&!r.complete&&!s.playing);if(lensOn)lensTick(dt*(S.REDUCED?.4:1),st);else if(lensMode(st)!==LW.key)lensTick(0,st);
      updFlask(flaskA,r,dt,t,st);updFlask(flaskB,r,dt,t,st);
      // hot plate, bath, thermometer, ice and convection
      const heat=S.clamp((r.T-20)/40,0,1);glowM.emissiveIntensity=S.lerp(glowM.emissiveIntensity,heat*3,.08);lampM.emissiveIntensity=heat>0?2.4:0;knob.rotation.z=-(r.T-10)/50*4;
      spirit.scale.y=Math.max(.02,thY(r.T)-.25);spirit.position.y=.25+spirit.scale.y/2;
      waterM.color.set(r.T<=15?"#B9DDF6":"#9CCBF0");
      for(let i=0;i<7;i++){const a=iceAt[i];ice.put(i,HP.x+a[0],r.T<=15?B0+1.68+Math.sin(t*1.3+i)*.02:-9,HP.z+a[1],r.T<=15?1:.0001,0,i*.7,0)}ice.done();
      CV.forEach((c,i)=>{if(c.life<=0&&r.T>=30&&Math.random()<dt*(r.T-25)/12){c.life=1;c.x=HP.x+(Math.random()-.5)*3.4;c.z=HP.z+(Math.random()-.5)*3;if(Math.hypot(c.x-HP.x,c.z-HP.z)<1.2)c.x+=Math.sign(c.x-HP.x||1)*1.2;c.y=B0+.15}
        if(c.life>0){c.life-=dt*.6;c.y+=dt*.9}conv.put(i,c.x,c.y,c.z,Math.max(0,Math.sin(c.life*Math.PI))*.35,140)});conv.done();
      SM.forEach((c,i)=>{if(c.life<=0&&r.T>=45&&Math.random()<dt*(r.T-40)/14){c.life=1;c.x=HP.x+(Math.random()-.5)*3.2;c.z=HP.z+(Math.random()-.5)*2.8;c.y=B0+1.8}
        if(c.life>0){c.life-=dt*.45;c.y+=dt*.7;c.x+=dt*.1}steam.put(i,c.x,c.y,c.z,Math.max(0,Math.sin(c.life*Math.PI))*.4,420)});steam.done();
      // syringe
      const V=r.x*VMAX(r.rx),hx=SX0+.09+(SL-.2)*V/100;plunger.position.x=hx;gasFill.visible=V>.3;gasFill.scale.y=Math.max(.001,hx-SX0-.05);gasFill.position.set(SX0+.025+(hx-SX0-.05)/2,SY,0);
      // balance display
      const m=(startMass(r)-r.x*MLOSS(r.rx)).toFixed(3);if(m!==lcdKey){lcdKey=m;lcd.redraw((g,w,h)=>{g.fillStyle="#DCE8D6";g.fillRect(0,0,w,h);g.fillStyle="#22303A";g.font="500 54px IBM Plex Mono, ui-monospace, monospace";g.textAlign="right";g.fillText(m,w-74,h*.74);g.font="600 34px Instrument Sans, system-ui";g.fillText("g",w-26,h*.74)})}
      // dishes: the chosen size sits raised with a ring
      Object.entries(dishes).forEach(([kk,d])=>{d.ring.visible=r.rx==="marble"&&r.size===kk});
      // equilibrium tube
      const eqOn=k==="equil";eqShown=S.lerp(eqShown,eqOn?1:0,S.REDUCED?1:.06);eqT.visible=eqShown>.01;tubeG.position.y=S.lerp(B0+6.5,B0+1.35,eqShown);
      const share=eqShare(s.T);eqK=S.lerp(eqK,share,S.REDUCED?1:.03);col.set("#F4ECE2").lerp(col.clone().set(BROWN),.12+eqK*.8);gasEqM.color.copy(col);gasEqM.opacity=.3+eqK*.5;
      // ---- the particle window
      const isEq=LW.key==="eq",ea=eaNow(r);let n=0,nc=0,nb=0,nh=0;
      lensBackM.color.set(isEq?"#FBF6F1":"#F2F7FC");
      for(const p of LW.parts){const a=Math.max(0,Math.min(1,p.a));if(a<=.02)continue;const z=.04;
        if(p.kind==="pair"){const c=Math.cos(p.th)*.09,sn=Math.sin(p.th)*.09;if(n+1<44){lp.put(n,(p.x-c)*LS,(p.y-sn)*LS,z,a);lp.tint(n++,"#EFE6DA");lp.put(n,(p.x+c)*LS,(p.y+sn)*LS,z,a);lp.tint(n++,"#EFE6DA")}
          if(nb<24){tmp.set(c,sn,0).normalize();bq.setFromUnitVectors(UP,tmp);lbond.putS(nb++,p.x*LS,p.y*LS,z,1,.2*LS,1,bq)}continue}
        if(n>=44)break;lp.put(n,p.x*LS,p.y*LS,z,a);lp.tint(n,p.kind==="no2"?"#B5653A":p.kind==="per"?"#A9B8F0":P3.product.blueberry);n++;
        if(p.kind!=="no2"&&nc<44)lcap.put(nc++,(p.x+Math.cos(p.th)*RA)*LS,(p.y+Math.sin(p.th)*RA)*LS,z+.03,a);
        if(p.kind!=="no2"&&p.E>=ea&&nh<44)lhalo.put(nh++,p.x*LS,p.y*LS,z-.02,.6*a,130)}
      for(let i=n;i<44;i++)lp.put(i,0,0,-9,.0001);for(let i=nc;i<44;i++)lcap.put(i,0,0,-9,.0001);for(let i=nb;i<24;i++)lbond.put(i,0,0,-9,.0001);for(let i=nh;i<44;i++)lhalo.put(i,0,0,-9,0,1);
      lp.done();lcap.done();lbond.done();lhalo.done();
      let ns=0;for(const q of LW.sites){if(q.fade<=0||ns>=40)continue;lsite.put(ns,q.x*LS,q.y*LS,.04,q.fade);lsite.tint(ns++,q.kind==="mno2"?"#4A3F44":"#F4EFE6")}for(let i=ns;i<40;i++)lsite.put(i,0,0,-9,.0001);lsite.done();
      LW.bubs.forEach((b,i)=>{if(i<30)lbub.put(i,b.x*LS,b.y*LS,.06,b.r*LS)});for(let i=LW.bubs.length;i<30;i++)lbub.put(i,0,0,-9,.0001);lbub.done();
      LW.fx.forEach((f,i)=>{if(i<24){const u=(LW.t-f.t)/.5;lfx.put(i,f.x*LS,f.y*LS,.12,(f.ok?.9:.45)*(1-u),f.ok?120+u*220:70)}});for(let i=LW.fx.length;i<24;i++)lfx.put(i,0,0,-9,0,1);lfx.done();
      lfx.material.uniforms.color.value.set(isEq?"#F2B58A":"#5FD3A0");
      // ---- screens (redrawn only when something changed)
      const pk=[k,r.id,r.pts.length,r.started,r.complete,s.meas,s.ghost&&s.ghost.id,r.T].join("|");SCR.plot.t-=dt;
      if(pk!==SCR.plot.key&&SCR.plot.t<=0){SCR.plot.key=pk;SCR.plot.t=.15;SCR.plot.pn.redraw((g,w,h)=>drawGraph(canvasPen(g,w/420),st))}
      const ek=isEq?"eq|"+Math.floor(LW.t*4):[k,r.rx,r.cat,r.T].join("|");SCR.energy.t-=dt;
      if(ek!==SCR.energy.key&&SCR.energy.t<=0){SCR.energy.key=ek;SCR.energy.t=.2;SCR.energy.pn.redraw((g,w,h)=>(isEq?drawEq:drawEnergy)(canvasPen(g,w/420),st))}
      // ---- labels
      const cps=lensRate(),okps=lensRate(true);
      lLens.at(lens.localToWorld(tmp.set(.8,LR*LS+.15,0))).set(isEq?`Particle window<b>${Math.round(eqNow()*100)}% NO₂</b><small>brown NO₂ pairs up into colourless N₂O₄</small>`:`Particle window<b>${n1(cps)} hits a second</b><small>${n1(okps)} successful · a flash is a reaction</small>`);
      const why={ok:"✓ Enough energy, right way round: reacts",energy:"✗ Bounced: not enough energy",orient:"✗ Bounced: wrong way round",
        "":"Watch for a flash"}[LW.t-LW.out.t<2.2?LW.out.why:""];lOut.at(lens.localToWorld(tmp.set(1.0,-LR*LS-.05,0))).set(r.started?`<b>${why}</b>`:"<b>Press Play to drop the chips in</b>");
      lA.at(tmp.set(HP.x,B0+3.6,HP.z)).set(r.rx==="marble"?`Marble + acid<small>${r.c.toFixed(2)} mol L⁻¹ HCl · ${SIZE_N[r.size]}</small>`:`Hydrogen peroxide<small>${r.cat?"with 0.50 g MnO₂":"no catalyst"}</small>`);
      lSyr.at(tmp.set(SX0+SL*.55,SY+.5,SZ)).set(`Gas syringe<b>${n1(V)} mL</b><small>${GAS[r.rx].f} · ${Math.round(r.t)} s</small>`).cls(s.meas==="vol"?"big hot":"big");
      lBal.at(tmp.set(BAL.x+1.2,TOP+.75,BAL.z+.9)).set(`Balance<b>${m} g</b><small>cotton wool lets the gas out</small>`).cls(s.meas==="mass"?"big hot":"big");
      lBath.at(tmp.set(HP.x-1.7,B0+1.9,HP.z+1.6)).set(`Water bath<b>${r.T} °C</b><small>${r.T<=15?"ice added":r.T>20?"hot plate on":"room temperature"}</small>`);
      lMno.at(tmp.set(mno.position.x,TOP+1.2,mno.position.z)).set(`MnO₂ catalyst<small>${r.rx==="perox"&&r.cat?"0.50 g in · still 0.50 g after":"tap to add it"}</small>`);
      lAcid.at(tmp.set(acid.position.x,TOP+1.5,acid.position.z)).set(`Hydrochloric acid<b>${r.c.toFixed(2)} mol L⁻¹</b>`);
      lTube.at(tmp.set(eqT.position.x,tubeG.position.y+1.1,eqT.position.z)).set(`Sealed tube<b>2NO₂ ⇌ N₂O₄</b><small>${s.T} °C · ${s.T>20?"darker brown":s.T<20?"paler":"medium brown"}</small>`);
      Object.keys(dishX).forEach((kk,i)=>lDish[i].at(tmp.set(dishX[kk],TOP+.25,DZ)).set(`${SIZE_N[kk][0].toUpperCase()+SIZE_N[kk].slice(1)}`).cls(r.rx==="marble"&&r.size===kk?"hot":""));
    }};
}

// ================================================================ steps
const SP=10;
const std=o=>{Object.assign(s,{rx:"marble",T:20,c:1,size:"small",cat:false},o||{});newRun()};
const steps=[
 {k:"collide",lab:"Collisions",cap:"Zoom in on a marble chip in acid. Acid particles hit the chip all the time, but only some hits react. A collision needs enough energy and the right way round. Watch the window: a green flash is a successful collision.",speed:1,speedLabel:"real time",controls:["play","restart"],
  big:"<b>The big idea:</b> collision theory. Particles must collide to react, and a collision only works if it has at least the activation energy (Ea) and the particles are lined up the right way. The rate of reaction is the number of successful collisions per second.",
  exam:"For a reaction to happen, the reactant particles must collide with enough energy (at least the activation energy) and in the correct orientation. This is called a successful collision. The rate of reaction is the number of successful collisions per unit of time.",
  trap:"Saying particles react whenever they touch. Most collisions bounce off, because they don't have enough energy or they hit the wrong way round.",
  chips:["coll","succ","enough"],onStep:()=>{std({size:"large"});s.playing=true}},
 {k:"measure",lab:"Measuring rate",cap:"Press Play. The chips tip into the acid and CO₂ pushes the syringe out. A second flask sits on a balance with a cotton wool plug: the gas escapes, so the mass drops. Both give a graph that is steep at first, then flattens.",speed:SP,speedLabel:"10× real time",controls:["play","restart","skip","meas"],
  big:"<b>The big idea:</b> rate is how fast a product forms or a reactant is used up. On the graph it is the gradient: steepest at the start, flatter as the reactants are used up, and flat once the marble has gone.",
  exam:"The gradient of the graph is the rate of reaction. It is steepest at the start because the reactant particles are most concentrated, so there are the most successful collisions per second. As the marble and acid are used up there are fewer reactant particles to collide, so the rate decreases and the curve flattens. It is flat when all the marble has reacted.",
  trap:"Saying the reaction slows because the gas 'fills up'. It slows because there are fewer reactant particles left to collide, and stops when the limiting reactant (here, the marble) is used up.",
  chips:["gas","time","r0","rnow"],onStep:()=>{std();s.playing=true}},
 {k:"conc",lab:"Concentration",cap:"Change the acid concentration. More acid particles in the same volume means more collisions every second. Run one line, change the concentration, and the first run stays on the graph as a dashed line.",speed:SP,speedLabel:"10× real time",controls:["play","restart","skip","c","meas"],
  big:"<b>The big idea:</b> higher concentration means more particles per unit volume, so collisions happen more often and there are more successful collisions per second. The share of collisions that succeed doesn't change.",
  exam:"Increasing the concentration of the acid increases the number of acid particles per unit volume. Particles collide more frequently, so there are more successful collisions per second and the rate of reaction increases. The same mass of marble is used, so the same total volume of CO₂ forms; it just forms sooner.",
  trap:"Saying the particles move faster at a higher concentration. They don't: there are more of them, so collisions happen more often.",
  chips:["acid","coll","r0","gas"],onStep:()=>{std({c:.5});s.playing=true}},
 {k:"temp",lab:"Temperature",cap:"Turn the hot plate up, or drop the bath to 10 °C with ice. Hotter particles move faster, so they collide more often, and more of the collisions have enough energy. The graph on the left screen shows the spread of collision energies.",speed:SP,speedLabel:"10× real time",controls:["play","restart","skip","T"],
  big:"<b>The big idea:</b> temperature works in two ways: more frequent collisions, and a bigger share of collisions with at least the activation energy. The second effect is the bigger one. In this model the rate roughly doubles for every 10 °C rise.",
  exam:"At a higher temperature the particles have more kinetic energy and move faster. They collide more frequently, and a greater proportion of the collisions have energy equal to or greater than the activation energy. So there are more successful collisions per second and the rate of reaction increases.",
  trap:"Saying the activation energy gets lower when it's hotter. The activation energy stays the same; more of the particles have enough energy to get over it.",
  chips:["temp","enough","r0","tend"],onStep:()=>{std();s.playing=true}},
 {k:"surface",lab:"Surface area",cap:"The same 0.40 g of marble as large chips, small chips or powder. Tap a dish or use the menu. Only particles on the outside of a piece can be hit by acid, so smaller pieces give the acid more to collide with.",speed:SP,speedLabel:"10× real time",controls:["play","restart","skip","size"],
  big:"<b>The big idea:</b> cutting a solid into smaller pieces puts more of its particles on the surface. More particles can collide with the acid at once, so there are more successful collisions per second.",
  exam:"Powdered marble has a much greater surface area than the same mass of large chips. More calcium carbonate particles are exposed to the acid, so more collisions happen per second, giving more successful collisions per second and a faster rate of reaction. The total volume of CO₂ is the same because the mass of marble is the same.",
  trap:"Saying powder has 'more particles'. The same mass has the same number of particles; powder has more of them on the surface, where the acid can reach them.",
  chips:["size","surf","r0","tend"],onStep:()=>{std({size:"large"});s.playing=true}},
 {k:"catalyst",lab:"Catalyst",cap:"Now hydrogen peroxide: 2H₂O₂ → 2H₂O + O₂. On its own it breaks down so slowly you'd wait days. Tap the MnO₂ bottle (or the button) to add 0.50 g of manganese(IV) oxide, and oxygen pours out. The MnO₂ is still there at the end.",speed:SP,speedLabel:"10× real time",controls:["play","restart","skip","cat","T"],
  big:"<b>The big idea:</b> a catalyst provides an alternative pathway with a lower activation energy. A greater share of collisions now have enough energy, so the rate increases. The catalyst is not used up.",
  exam:"Manganese(IV) oxide is a catalyst. It provides an alternative reaction pathway with a lower activation energy. A greater proportion of collisions now have energy equal to or greater than the activation energy, so there are more successful collisions per second and the rate of reaction increases. The catalyst is not used up, so 0.50 g of MnO₂ is left at the end.",
  trap:"Saying a catalyst gives the particles more energy or makes them move faster. It lowers the energy they need, by giving the reaction a different route.",
  chips:["cat","enough","r0","gas"],onStep:()=>{std({rx:"perox",cat:false});s.playing=true}},
 {k:"equil",lab:"Equilibrium",cap:"A sealed tube of brown NO₂ dips into the bath. NO₂ molecules pair up to make colourless N₂O₄, and N₂O₄ splits back, both at the same time. Heat the bath and the tube goes darker; cool it and it goes paler.",speed:1,speedLabel:"real time",controls:["T"],
  big:"<b>The big idea:</b> dynamic equilibrium. In a closed system the forward and reverse reactions keep going at the same rate, so the amounts stay the same. Change the temperature and the equilibrium shifts to oppose the change.",
  exam:"2NO₂(g) ⇌ N₂O₄(g) is exothermic in the forward direction. At equilibrium the forward and reverse reactions happen at the same rate, so the concentrations stay constant. Increasing the temperature favours the endothermic reverse reaction, so the position of equilibrium shifts left: more brown NO₂ forms and the colour darkens. Kc gets smaller, because only a change in temperature changes the value of Kc.",
  trap:"Saying the reactions stop at equilibrium. Both keep going; they just go at the same rate.",
  chips:["temp","no2","fwd","rev","kc"],onStep:()=>{s.T=20;s.playing=true}},
 {k:"test",lab:"Test yourself",cap:"Four challenges. Set up a run, press Play (or Skip to the end), then press Check. The machine marks you from the same model that runs the bench.",speed:SP,speedLabel:"10× real time",controls:["play","restart","skip","rx","T","c","size","cat","meas"],
  big:"<b>Exam tip:</b> for every factor, say what changes about the particles, link it to the frequency of successful collisions, then to the rate. When you talk about the total amount of product, name the limiting reactant.",
  chips:["gas","time","r0","tend"],onStep:()=>{std();s.playing=false}}];
// ---- kupu Māori: te reo terms for this machine, each checked in Te Aka Māori Dictionary (ta = word id). Sources and notes: te-reo-notes.md
const KUPU=[
 {mi:"tauhohe matū",en:"chemical reaction",ta:40051},
 {mi:"pūmatū hohe",en:"reactant",ta:40182},
 {mi:"matūriki",en:"particle",ta:50542},
 {mi:"waikawa pūhaumāota",en:"hydrochloric acid",ta:40475,chip:"acid"},
 {mi:"hauhā",en:"carbon dioxide",ta:38806},
 {mi:"pāpātanga",en:"rate",ta:45822,chip:["r0","rnow"],note:"A maths term: a rate compares two quantities, here gas made and time."},
 {mi:"rōnaki",en:"gradient, slope",ta:13240,note:"Also means to glide or slope."},
 {mi:"paemahana",en:"temperature",ta:39927,chip:"temp",note:"Te Aka also lists pāmahana."},
 {mi:"horahanga mata",en:"surface area",ta:45668,chip:"surf"},
 {mi:"whākōkī",en:"catalyst",ta:40520,chip:"cat",note:"Te Aka also lists whakakōkī."}];
Object.entries({collide:["matūriki","tauhohe matū","pūmatū hohe"],measure:["hauhā","pāpātanga","rōnaki"],conc:["waikawa pūhaumāota","matūriki"],temp:["paemahana","matūriki"],surface:["horahanga mata"],catalyst:["whākōkī","tauhohe matū"],equil:["tauhohe matū","paemahana"]}).forEach(([k,a])=>{const st=steps.find(x=>x.k===k);if(st)st.kupu=a});
// ---- challenges: marked from the runs themselves
const either=fn=>[s.run,s.ghost].some(r=>r&&fn(r));
const CH=[
 {q:"Make the marble chips finish reacting (99%) in under 60 s. You can't use powder.",
  check:()=>either(r=>r.rx==="marble"&&r.size!=="powder"&&r.tEnd!=null&&r.tEnd<60),
  ok:()=>{const r=[s.run,s.ghost].find(r=>r&&r.rx==="marble"&&r.size!=="powder"&&r.tEnd!=null&&r.tEnd<60);return `Yes: ${runTxt(r)} finished in ${secs(r.tEnd)}. Hotter and more concentrated acid both mean more successful collisions per second.`},
  no:()=>{const r=s.run;return r.rx!=="marble"?"Switch the reaction to marble chips first.":r.size==="powder"?"No powder for this one: use chips, then change the temperature or the acid.":r.tEnd!=null?`Not yet: that run took ${secs(r.tEnd)}. Turn up the temperature or the acid concentration, then run it again.`:"Run it to the end first (Play, or Skip to the end), then Check."}},
 {q:"Draw a second line that starts twice as steep as the first, by changing only the acid concentration.",
  check:()=>{const a=s.ghost,b=s.run;return !!(a&&b&&b.started&&a.rx==="marble"&&b.rx==="marble"&&a.T===b.T&&a.size===b.size&&a.c!==b.c&&Math.abs(b.r0/a.r0-2)<.1)},
  ok:()=>`Yes: ${s.ghost.c.toFixed(2)} → ${s.run.c.toFixed(2)} mol L⁻¹ doubles the initial rate, ${rateTxt(s.ghost.r0)} → ${rateTxt(s.run.r0)} mL s⁻¹. Twice the acid particles per unit volume, twice as many collisions per second (in this model).`,
  no:()=>{const a=s.ghost,b=s.run;if(!a)return "Run the reaction for a few seconds first: that becomes the first line.";if(a.rx!=="marble"||b.rx!=="marble")return "Use the marble reaction for both runs.";if(a.T!==b.T||a.size!==b.size)return "Change only the concentration: keep the temperature and marble size the same as the first run.";if(!b.started)return "Press Play to draw the second line.";return `Not yet: the new line starts ${n2(b.r0/a.r0)}× as steep. What concentration is double ${a.c.toFixed(2)} mol L⁻¹?`}},
 {q:"Prove a factor changes the rate but not the total gas: run to the end twice, changing one factor, so the lines start at different steepness but finish at the same volume.",
  check:()=>{const a=s.ghost,b=s.run;if(!(a&&b&&a.complete&&b.complete&&!a.capped&&!b.capped&&a.rx===b.rx))return false;const d=diffs(a,b);return d.length===1&&Math.abs(a.x*VMAX(a.rx)-b.x*VMAX(b.rx))<.5&&Math.abs(Math.log(b.r0/a.r0))>Math.log(1.2)},
  ok:()=>{const d=diffs(s.ghost,s.run)[0];return `Yes: changing the ${FACT_N[d]} changed how fast (${rateTxt(s.ghost.r0)} → ${rateTxt(s.run.r0)} mL s⁻¹ at the start) but both made ${n1(s.run.x*VMAX(s.run.rx))} mL. The amount of ${s.run.rx==="marble"?"marble (the limiting reactant)":"hydrogen peroxide"} sets the total.`},
  no:()=>{const a=s.ghost,b=s.run;if(!a||!a.complete||a.capped)return "First run the reaction all the way to the end (Skip to the end works).";if(!b.complete||b.capped)return "Now change one factor and run the second line all the way to the end.";if(a.rx!==b.rx)return "Keep the same reaction for both runs.";const d=diffs(a,b);if(d.length===0)return "The last two runs had the same settings. Change exactly one factor, then run again.";if(d.length>1)return `You changed ${d.map(k=>FACT_N[k]).join(" and ")}. Change only one, so it's a fair test.`;return "That change barely altered the rate. Make a bigger change."}},
 {q:"Hydrogen peroxide at 20 °C: collect 50 mL of oxygen in under 20 s.",
  check:()=>either(r=>r.rx==="perox"&&r.T===20&&r.t50!=null&&r.t50<20),
  ok:()=>{const r=[s.run,s.ghost].find(r=>r&&r.rx==="perox"&&r.T===20&&r.t50!=null&&r.t50<20);return `Yes: 50 mL in ${secs(r.t50)}. The MnO₂ gives a pathway with a lower activation energy, so far more collisions succeed. It isn't used up.`},
  no:()=>{const r=s.run;return r.rx!=="perox"?"Switch the reaction to hydrogen peroxide.":r.T!==20?"Keep the bath at 20 °C for this one.":!r.cat?"At 20 °C without help it would take days. What can lower the activation energy?":"Run it until 50 mL is collected, then Check."}}];
// ---- mount
StudyKit.mount({kupu:KUPU,caseTint:"peach",accent:"#B2552D",scene3d:reactions3d,
  eyebrow:"Chemistry · Rates of reaction", title:"The reaction machine", crumb:"Year 9–10 science · NCEA Level 2 Chemistry AS91166 Demonstrate understanding of chemical reactivity", homeHash:"l2",
  fig:"FIG. 34 · A RATES-OF-REACTION BENCH", railTitle:"What makes a reaction go faster",
  badge:{label:"NCEA L2 Chemistry 91166",exam:"2026-11-16T14:00:00+13:00",examText:"Mon 16 Nov, 2pm"},
  mainBox:"0 0 640 330", mainPhoneBig:true, mainLabel:"A lab bench: a conical flask of marble chips and acid in a water bath on a hot plate, a gas syringe on a clamp stand, a second flask on a balance, and a particle window magnifying the chips", closeBox:"0 0 420 260",
  state:s, steps,
  controls:[{type:"play"},
    {type:"button",id:"restart",label:"New run",onClick:()=>{newRun();s.playing=false}},
    {type:"button",id:"skip",label:"Skip to the end",onClick:()=>{let r=s.run;if(r.complete){newRun();r=s.run}r.started=true;integrate(r,TMAX,true,.25);s.playing=false;if(!r.capped)sfx("ding")}},
    {type:"select",id:"rx",label:"Reaction",options:[["marble","Marble chips + hydrochloric acid"],["perox","Hydrogen peroxide"]],get:()=>s.rx,set:(x,v)=>setting("rx",v)},
    {type:"range",id:"T",label:"Temperature",min:10,max:60,step:5,get:()=>s.T,set:(x,v)=>setting("T",v),fmt:()=>s.T+" °C"},
    {type:"range",id:"c",label:"Acid",min:.25,max:2,step:.25,get:()=>s.c,set:(x,v)=>{setting("c",Math.round(v*100)/100);if(s.rx!=="marble")setting("rx","marble")},fmt:()=>s.c.toFixed(2)+" mol L⁻¹"},
    {type:"select",id:"size",label:"Marble",options:[["large","Large chips"],["small","Small chips"],["powder","Powder"]],get:()=>s.size,set:(x,v)=>{setting("size",v);if(s.rx!=="marble")setting("rx","marble")}},
    {type:"toggle",id:"cat",label:"MnO₂ catalyst",get:()=>s.cat&&s.rx==="perox",set:(x,v)=>{if(s.rx!=="perox"){s.rx="perox";s.cat=true;newRun()}else setting("cat",v)},labelFn:()=>s.rx!=="perox"?"Add MnO₂ (uses peroxide)":s.cat?"MnO₂ catalyst: in":"MnO₂ catalyst: out"},
    {type:"select",id:"meas",label:"Graph",options:[["vol","Gas collected (syringe)"],["mass","Change in mass (balance)"]],get:()=>s.meas,set:(x,v)=>{s.meas=v}}],
  tick:(x,dt,st)=>{if(st.k==="equil"){if(!has3D)lensTick(dt,st);return}
    let r=s.run;if(r.complete){newRun();r=s.run}
    if(!r.started){r.started=true;sfx("pop")}
    integrate(r,dt*st.speed,true);
    if(r.complete){s.playing=false;if(!r.capped)sfx("ding")}
    if(!has3D)lensTick(dt,st)},
  drawMain, drawClose,
  chips:(x,st)=>{const r=s.run,f=GAS[r.rx].f,mass=s.meas==="mass";return{
    gas:mass?["CHANGE IN MASS",`−${(r.x*MLOSS(r.rx)).toFixed(3)} g`,true]:[`${f} COLLECTED`,`${n1(r.x*VMAX(r.rx))} mL`,true],
    time:["TIME",`${Math.round(r.t)} s`],
    r0:["INITIAL RATE",mass?`${r0Mass(r).toFixed(4)} g s⁻¹`:`${rateTxt(r.r0)} mL s⁻¹`,st.k!=="measure"],
    rnow:["RATE NOW",r.complete?"0 (finished)":mass?`${massRate(r).toFixed(4)} g s⁻¹`:`${rateTxt(rateNow(r))} mL s⁻¹`],
    tend:["99% DONE IN",r.tEnd!=null?secs(r.tEnd):r.capped?"over 15 min":`≈ ${secs(r.pred)} (predicted)`],
    acid:["ACID",`${r.c.toFixed(2)} mol L⁻¹`,true],temp:["TEMPERATURE",`${st.k==="equil"?s.T:r.T} °C`,true],
    size:["MARBLE",SIZE_N[r.size],true],cat:["CATALYST",r.rx==="perox"&&r.cat?"MnO₂, 0.50 g":"none",true],
    coll:["HITS A SECOND",`${n1(lensRate())} in the window`,st.k==="collide"],succ:["SUCCESSFUL",`${n1(lensRate(true))} a second`,st.k==="collide"],
    enough:["ENOUGH ENERGY",`${Math.round(enough(eaNow(r),r.T)*1000)/10}% of collisions`],
    surf:["SURFACE PARTICLES",`${LW.sites.filter(q=>q.alive&&q.fade>0).length||LW.site0} in the window`],
    no2:["NO₂ IN THE WINDOW",`${Math.round(eqNow()*100)}% of molecules`,true],
    fwd:["FORWARD",`${n1(LW.eq?LW.eq.fwd.length/5:0)} a second`],rev:["REVERSE",`${n1(LW.eq?LW.eq.rev.length/5:0)} a second`],
    kc:["Kc vs 20 °C",`× ${kcRatio(s.T)>=1?n2(kcRatio(s.T)):kcRatio(s.T).toFixed(3)}`]}},
  challenges:CH,
  papers:[{label:"NZQA: Chemistry past exams",url:"https://www2.nzqa.govt.nz/ncea/subjects/past-exams-and-exemplars/chemistry/"},
    {label:"2025 paper, AS91166",url:"https://www.nzqa.govt.nz/nqfdocs/ncea-resource/exams/2025/91166-exm-2025.pdf"},
    {label:"2025 marking schedule",url:"https://www.nzqa.govt.nz/nqfdocs/ncea-resource/schedules/2025/91166-ass-2025.pdf"},
    {label:"2024 paper (rate graph question)",url:"https://www.nzqa.govt.nz/nqfdocs/ncea-resource/exams/2024/91166-exm-2024.pdf"}],
  truth:"The amounts and equations are real: 0.40 g of marble (CaCO₃, 100.1 g mol⁻¹) with 50 mL of hydrochloric acid in excess, and 25 mL of 0.32 mol L⁻¹ hydrogen peroxide with 0.50 g of manganese(IV) oxide (the amount in RSC Education's practical). Gas volumes are calculated for 20 °C and 101.3 kPa (24.1 L per mole); the balance readings are illustrative. How fast each run goes is illustrative: the rate constants, the activation energies (50 kJ mol⁻¹ for marble; 75 and 50 kJ mol⁻¹ for peroxide without and with the catalyst) and the surface factors for chips and powder were chosen to show the trends, not measured. The model holds each flask at the bath temperature, treats the rate as proportional to acid concentration, and ignores CO₂ that dissolves in the acid. The particle window is a slowed-down sketch that exaggerates the differences so you can see them. For the NO₂ tube, how Kc changes with temperature uses ΔH = −57 kJ mol⁻¹ (Chemguide); the share of NO₂ in the window is illustrative.",
  footer:"Covers AS91166 rates of reaction: collision theory and activation energy; the effect of concentration, temperature, surface area and a catalyst; energy profiles; reading rate from a graph. Introduces dynamic equilibrium and the effect of temperature on it. Also Year 9–10 science: chemical reactions and reaction rates."
});
window.__RX={s,integrate,TMAX,LW};
})();
