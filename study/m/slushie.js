(()=>{
// The slushie machine: an original countertop slush maker of assembly's own design (not modelled on any real product), cut open on a
// lab bench. For NCEA Level 2 Chemistry AS91164 (changes of state, attractions between particles, energy changes) and Year 10 science
// (energy transfer and transformation, energy flow diagrams, percentage efficiency).
// One model drives everything: an energy balance on 1 kg of drink, using the sourced latent heat of water (334 J/g) and the sourced
// freezing points of sugar syrup. The machine's powers, its thermostat setting, the slush bands, the crystal sizes and the particle
// window are the model's own, and the page says so.
const K=StudyKit,F=K.fig,P=F.palette,esc=K.esc;
const INK="#262E5C",MUTED="#6E6A86",GRID="#ECE6F0",AXIS="#8F9BAA",GHOST="#9AA3B5",SKYD="#3A6FB8",MINTD="#2A7D63",PEACHD="#B2552D",LAVD="#6A50BE";
const ICEC="#8FC3F0",WARMC="#F6B384",ELEC="#C9B8F0",DRINK="#E8688A",FROST="#F7E3EA";

// ================================================================ sourced numbers
const LF=334;   // J to freeze (or melt) 1 g of water: "heat of fusion of 334 joules/gram" (Case Western Reserve University physics demonstrations)
const CW=4.18;  // J g⁻¹ °C⁻¹ for liquid water (same source)
const CI=2.0;   // J g⁻¹ °C⁻¹ for ice near 0 °C (Chemistry LibreTexts table of specific heats: 2.01)
// How far below 0 °C sugar syrup starts to freeze: grams of sucrose per 100 g of water → °C below zero.
// University of Guelph Food Science, "Freezing curve calculation" (data from Leighton 1927, after Pickering 1891).
const FPD=[[0,0],[3,.18],[6,.35],[9,.53],[12,.72],[15,.90],[18,1.10],[21,1.29],[24,1.47],[27,1.67],[30,1.86],[33,2.03],[36,2.21],[39,2.40],[42,2.60],[45,2.78],[48,2.99],[51,3.20],[54,3.42],[57,3.63],[60,3.85],[63,4.10],[66,4.33],[69,4.54],[72,4.77],[75,5.00],[78,5.26],[81,5.53],[84,5.77],[87,5.99],[90,6.23],[93,6.50],[96,6.80],[99,7.04],[102,7.32],[105,7.56],[108,7.80],[111,8.04],[114,8.33],[117,8.62],[120,8.92],[123,9.19],[126,9.45],[129,9.71],[132,9.96],[135,10.22],[138,10.47],[141,10.72],[144,10.97],[147,11.19],[150,11.41],[153,11.63],[156,11.88],[159,12.14],[162,12.40],[165,12.67],[168,12.88],[171,13.08],[174,13.28],[177,13.48],[180,13.68]];
function fpd(S){if(S<=0)return 0;for(let i=1;i<FPD.length;i++)if(S<=FPD[i][0]){const a=FPD[i-1],b=FPD[i];return a[1]+(b[1]-a[1])*(S-a[0])/(b[0]-a[0])}
  const a=FPD[FPD.length-2],b=FPD[FPD.length-1];return b[1]+(b[1]-a[1])/(b[0]-a[0])*(S-b[0])}
function sAt(d){if(d<=0)return 0;for(let i=1;i<FPD.length;i++)if(d<=FPD[i][1]){const a=FPD[i-1],b=FPD[i];return a[0]+(b[0]-a[0])*(d-a[1])/(b[1]-a[1])}
  const a=FPD[FPD.length-2],b=FPD[FPD.length-1];return b[0]+(b[0]-a[0])/(b[1]-a[1])*(d-b[1])}
const sOfW=w=>100*w/(100-w), wOfS=S=>100*S/(100+S);     // % sugar by mass ⇄ g of sugar per 100 g of water
const tfOf=w=>-fpd(sOfW(w));                             // where a drink with w% sugar starts to freeze

// ================================================================ the model's own choices (illustrative: not measured on any machine)
const M=1000,T0=20,TROOM=20,TSET=-3,HYS=.3,UA=1.0,STIR=4;           // g of drink; °C; W of heat leaking in per °C; W of stirring
const P_COMP=120,P_COMP_BLK=135,P_FAN=8,P_AUG=12,EFF=.85;            // W of electricity; the compressor motor's efficiency
const QC0=200,QCK=4,G_VENT=.5,SHELL0=150,SHELL_JAM=250;             // W the drum takes from the drink at −3 °C (more when it is warmer)
const PHI_JAM=.70,PHI_STIFF=.55,PHI_SLUSH=.25,TMAX=90*60;           // share of the drink that is ice: jams, too stiff, slush
function iceEq(T,w){if(w<=0)return T<0?M:0;const S0=sOfW(w),d=-T;if(d<=fpd(S0))return 0;return M*(1-w/100)*(1-S0/sAt(d))}
const Hof=(T,mi)=>CW*(M-mi)*T+CI*mi*T-LF*mi;                      // J, measured from the all-liquid drink at 0 °C
function solve(H,w){
  if(w<=0){if(H>=0)return {T:H/(CW*M),mi:0};if(H>=-LF*M)return {T:0,mi:-H/LF};return {T:(H+LF*M)/(CI*M),mi:M}}
  let lo=-40,hi=60;for(let k=0;k<46;k++){const m=(lo+hi)/2;if(Hof(m,iceEq(m,w))>H)hi=m;else lo=m}
  const T=(lo+hi)/2;return {T,mi:iceEq(T,w)}}
const phiSet=w=>iceEq(TSET,w)/M;                                  // share of ice once the machine holds the drink at −3 °C
const outcome=f=>f>=PHI_JAM?"block":f>=PHI_STIFF?"stiff":f>=PHI_SLUSH?"slush":f>=.02?"runny":"syrup";
const OUT={block:"an ice block: the auger jams",stiff:"too stiff: the auger strains",slush:"slush",runny:"runny: mostly syrup",syrup:"syrup: it hardly freezes"};
let MIN_SLUSH=40,MAX_SLUSH=0,MIN_NOJAM=40;for(let w=0;w<=40;w++){const o=outcome(phiSet(w));if(o==="slush"){MIN_SLUSH=Math.min(MIN_SLUSH,w);MAX_SLUSH=Math.max(MAX_SLUSH,w)}if(o!=="block")MIN_NOJAM=Math.min(MIN_NOJAM,w)}

let runId=0;
const s={w:20,auger:true,comp:true,vents:true,playing:false,run:null,ghost:null,part:"",reading:0,ansE:0,ansW:0,anim:0};
function makeRun(){const H0=Hof(T0,0);return {id:++runId,w:s.w,t:0,H:H0,H0,T:T0,mi:0,sus:0,shell:0,size:.16,jam:false,on:true,reached:false,tReach:null,tIce:null,
  Ein:0,Eq:0,Eback:0,dmi:0,pts:[[0,T0,0]],ls:0,started:false,capped:false}}
function newRun(){if(s.run&&s.run.started&&s.run.t>=120)s.ghost=s.run;s.run=makeRun()}
const augerOn=r=>s.auger&&!r.jam;
// the machine's power flows right now, in watts
function powers(r){const run=s.comp&&r.on,aug=augerOn(r),g=(s.vents?1:G_VENT)/(1+r.shell/SHELL0);
  const qc=run?Math.max(0,(QC0+QCK*(r.T-TSET))*g):0,pc=run?(s.vents?P_COMP:P_COMP_BLK):0,pf=run?P_FAN:0,pa=aug?P_AUG:0;
  return {qc,pc,pf,pa,run,stir:aug?STIR:0,leak:UA*(TROOM-r.T),back:qc+pc+pf,pin:pc+pf+pa}}
function step1(r,h){
  // the thermostat switches the compressor off at −3 °C and back on 0.3 °C above it
  if(s.comp){if(r.on&&r.T<=TSET){r.on=false;if(!r.reached){r.reached=true;r.tReach=r.t}}else if(!r.on&&r.T>=TSET+HYS)r.on=true}
  if(s.auger&&!r.jam&&r.shell>=SHELL_JAM)r.jam=true;           // an auger can't turn once it is frozen in
  const p=powers(r);r.H+=(-p.qc+p.leak+p.stir)*h;r.Ein+=p.pin*h;r.Eq+=p.qc*h;r.Eback+=p.back*h;
  const o=solve(r.H,r.w),d=o.mi-r.mi,aug=augerOn(r);
  // new ice: scraped into the drink as fine crystals, or left to build up on the drum
  if(d>0){if(aug){r.size=(r.size*r.sus+.16*d)/(r.sus+d);r.sus+=d}else r.shell+=d}
  else if(d<0){let m=-d;const a=Math.min(m,r.sus);r.sus-=a;m-=a;r.shell=Math.max(0,r.shell-m)}
  // a turning auger scrapes an ice layer off the drum in coarse chunks
  if(aug&&r.shell>0){const sc=Math.min(r.shell,3*h);r.size=(r.size*r.sus+.95*sc)/Math.max(1e-6,r.sus+sc);r.shell-=sc;r.sus+=sc}
  r.dmi+=(d/h-r.dmi)*Math.min(1,h/15);
  r.mi=o.mi;r.T=o.T;r.t+=h;
  if(r.tIce==null&&r.mi>.5)r.tIce=r.t;
  if(aug&&r.mi/M>=PHI_JAM)r.jam=true;
  if(r.jam&&r.mi/M<.5&&r.shell<60)r.jam=false}
function integrate(r,dt,rec){let left=dt;r.started=true;
  while(left>1e-9&&!r.capped){const h=Math.min(1,left,TMAX-r.t);if(h<=1e-9){r.capped=true;break}step1(r,h);left-=h;
    if(rec&&r.t-r.ls>=10-1e-9){r.pts.push([r.t,r.T,r.mi]);r.ls=r.t}
    if(r.t>=TMAX-1e-9)r.capped=true}}
const eTotal=r=>r.H0-r.H,eFreeze=r=>LF*r.mi,eCool=r=>eTotal(r)-eFreeze(r);
const frozenFrac=r=>r.w<=0?r.mi/M:Math.min(1,r.mi/(M*(1-r.w/100)));
const syrupS=r=>r.w<=0?0:sOfW(r.w)/Math.max(.02,1-frozenFrac(r));
const fmtT=T=>{const v=Math.round(T*10)/10;return (v<0?"−":"")+Math.abs(v).toFixed(1)+" °C"};
const fmtK=J=>{const v=Math.round(J/100)/10;return (v<0?"−":"")+Math.abs(v).toFixed(1)+" kJ"};
const minsec=t=>`${Math.floor(t/60)} min ${String(Math.floor(t%60)).padStart(2,"0")} s`;
const sizeTxt=r=>!augerOn(r)&&r.shell>2?"coarse: growing on the drum":r.mi<.5?"none yet":r.size<.35?"fine: smooth":r.size<.6?"mixed: a bit grainy":"coarse: crunchy";
function stateNow(r){const f=r.mi/M;if(r.jam)return "jammed: an ice block";if(r.mi<.5)return "liquid";
  if(!s.auger)return "ice building up on the drum";
  if(f>=PHI_STIFF)return "too stiff: the auger strains";if(f>=PHI_SLUSH)return "slush";return r.reached?"runny: mostly syrup":"ice forming"}
let touched=false;try{["pointerdown","keydown"].forEach(e=>addEventListener(e,()=>{touched=true},{once:true,capture:true}))}catch(e){}
const sfx=n=>{if(touched)K.sfx(n)};
const mix=(a,b,k)=>{const h=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));const A=h(a),B=h(b);return "#"+A.map((v,i)=>Math.round(v+(B[i]-v)*Math.max(0,Math.min(1,k))).toString(16).padStart(2,"0")).join("")};

// ================================================================ the particle window: a slowed-down sketch of the ice front on the drum
// Water molecules lock into an open, hexagonal lattice (drawn flat, so each has three neighbours here; real ice is 3D).
// Sugar molecules can't join the ice, so they crowd into the syrup ahead of it. Counts, sizes and speeds are illustrative.
const LR=1.5,YD=-1.02,BL=.2,RO=.062,RHO=21;
const LW={t:0,sites:[],mols:[],sug:[],fx:[],heat:[],grid:[],fill:0,area:0,areaFill:-1,lockT:0,spawnT:0,runId:-1};
(()=>{const a1x=Math.sqrt(3)*BL,a2x=Math.sqrt(3)/2*BL,a2y=1.5*BL;
  for(let n2=0;n2<16;n2++)for(let n1=-16;n1<=16;n1++)for(const dy of [0,BL]){const x=n1*a1x+n2*a2x-a1x*.25,y=YD+.11+n2*a2y+dy;
    if(Math.hypot(x,y)<LR-.1&&y>YD+.05)LW.sites.push({x,y,m:null,claim:false,nb:[]})}
  LW.sites.sort((a,b)=>a.y-b.y||Math.abs(a.x)-Math.abs(b.x));
  LW.sites.forEach((a,i)=>{a.i=i;LW.sites.forEach((b,j)=>{if(j>i&&Math.abs(Math.hypot(a.x-b.x,a.y-b.y)-BL)<.01){a.nb.push(j);b.nb.push(i)}})});
  for(let x=-LR;x<=LR;x+=.1)for(let y=YD;y<=LR;y+=.1){if(Math.hypot(x,y)>LR-.06)continue;let best=-1,bd=.19;LW.sites.forEach((q,i)=>{const d=Math.hypot(q.x-x,q.y-y);if(d<bd){bd=d;best=i}});LW.grid.push(best)}})();
function lwArea(){if(LW.areaFill===LW.fill)return LW.area;let n=0;for(const i of LW.grid)if(i<0||!LW.sites[i].m)n++;LW.areaFill=LW.fill;return LW.area=n*.01}
function freeSpot(){let x=0,y=LR-.3;for(let k=0;k<30;k++){const a=Math.random()*6.283,rad=Math.sqrt(Math.random())*(LR-.15);x=Math.cos(a)*rad;y=Math.max(YD+.12,Math.sin(a)*rad);
  if(!LW.sites.some(q=>q.m&&Math.abs(q.x-x)<.22&&q.y>y-.14))break}return [x,y]}
function spawnMol(top){const a=top?Math.PI*(.18+Math.random()*.64):0,rad=LR-.1,fs=top?null:freeSpot();
  return {x:top?Math.cos(a)*rad:fs[0],y:top?Math.sin(a)*rad:fs[1],dir:Math.random()*6.283,th:Math.random()*6.283,w:(Math.random()-.5)*4,rnd:Math.random(),st:"liq",a:top?0:1,out:false,site:null,k:0}}
function wall(m,rr){const d=Math.hypot(m.x,m.y),lim=LR-rr;if(d>lim){m.x*=lim/d;m.y*=lim/d;m.dir=Math.atan2(-m.y,-m.x)+(Math.random()-.5)}if(m.y<YD+rr){m.y=YD+rr;m.dir=Math.PI/2+(Math.random()-.5)}}
function nextSite(force){for(const st of LW.sites){if(st.m||st.claim)continue;if(!(st.y<YD+.2||st.nb.some(j=>LW.sites[j].m)))continue;
    if(!force){const g=LW.sug.find(g=>!g.out&&Math.hypot(g.x-st.x,g.y-st.y)<.26);if(g){g.dir=Math.atan2(g.y-st.y,g.x-st.x);continue}}
    return st}return null}
function lwTick(dt){const snap=!(dt>0);dt=Math.min(dt||0,.05);LW.t+=dt;const r=s.run;
  if(LW.runId!==r.id){LW.runId=r.id;for(const st of LW.sites){if(st.m){st.m.st="liq";st.m.site=null;st.m.dir=Math.PI/2}st.m=null;st.claim=false}
    LW.mols.forEach(m=>{if(m.st==="lock"){m.st="liq";m.site=null}});LW.fill=0}
  const v0=.42*Math.max(.7,Math.min(1.5,1+r.T/40));
  const target=Math.round(frozenFrac(r)*LW.sites.length);
  const locking=LW.mols.filter(m=>m.st==="lock").length,gap=target-LW.fill-locking;
  if(gap>0){
    if(snap||gap>12){for(let n=0;n<gap;n++){const st=nextSite(true);if(!st)break;const m=spawnMol(false);m.x=st.x;m.y=st.y;m.st="ice";m.site=st;st.m=m;LW.mols.push(m);LW.fill++}}
    else{LW.lockT-=dt;if(LW.lockT<=0){const st=nextSite(false);if(st){let best=null,bd=9;for(const m of LW.mols){if(m.st!=="liq"||m.out)continue;const d=Math.hypot(m.x-st.x,m.y-st.y);if(d<bd&&m.y>st.y-.05){bd=d;best=m}}
      if(best){best.st="lock";best.site=st;st.claim=true;best.k=0;best.x0=best.x;best.y0=best.y;LW.lockT=.14}}}}}
  else if(target<LW.fill){const many=snap||LW.fill-target>12;LW.lockT-=dt;if(many||LW.lockT<=0){const n=many?LW.fill-target:1;
    for(let k=0;k<n;k++){let top=null;for(let i=LW.sites.length-1;i>=0;i--)if(LW.sites[i].m){top=LW.sites[i];break}if(!top)break;
      const m=top.m;top.m=null;m.st="liq";m.site=null;m.dir=Math.PI/2+(Math.random()-.5)*2;m.a=1;LW.fill--;if(!many)LW.fx.push({x:m.x,y:m.y,t:LW.t,exo:false})}LW.lockT=.14}}
  for(const m of LW.mols)if(m.st==="lock"){m.k+=dt/.35;const k=Math.min(1,m.k),e=k*k*(3-2*k);m.x=m.x0+(m.site.x-m.x0)*e;m.y=m.y0+(m.site.y-m.y0)*e;
    if(m.k>=1||snap){m.st="ice";m.site.m=m;m.site.claim=false;m.x=m.site.x;m.y=m.site.y;LW.fill++;if(!snap){LW.fx.push({x:m.x,y:m.y,t:LW.t,exo:true});LW.heat.push({x:m.x,y:m.y,t:LW.t})}}}
  // keep the liquid at the model's make-up: water, plus sugar at (an exaggerated) share of the syrup
  const area=lwArea(),xs=Math.min(.3,syrupS(r)*.0032),sugT=r.w<=0?0:Math.round(area*RHO*xs),watT=Math.max(0,Math.round(area*RHO)-3*sugT);
  const liq=LW.mols.filter(m=>m.st==="liq"&&!m.out),sug=LW.sug.filter(g=>!g.out);
  if(snap||watT-liq.length>16||sugT-sug.length>4){const fade=!snap;while(liq.length<watT){const m=spawnMol(false);if(fade)m.a=0;LW.mols.push(m);liq.push(m)}while(sug.length<sugT){const g=spawnMol(false);g.st="sug";if(fade)g.a=0;LW.sug.push(g);sug.push(g)}}
  else{LW.spawnT-=dt;while(LW.spawnT<=0&&(liq.length<watT||sug.length<sugT)){if(liq.length<watT){const m=spawnMol(true);LW.mols.push(m);liq.push(m)}else{const g=spawnMol(true);g.st="sug";LW.sug.push(g);sug.push(g)}LW.spawnT+=.07}if(LW.spawnT<0)LW.spawnT=0}
  if(liq.length>watT){liq.sort((a,b)=>b.y-a.y);const ex=liq.length-watT;for(let i=0;i<ex&&i<(snap?ex:2);i++)liq[i].out=true}
  if(sug.length>sugT){sug.sort((a,b)=>b.y-a.y);const ex=sug.length-sugT;for(let i=0;i<ex&&i<(snap?ex:1);i++)sug[i].out=true}
  if(snap){LW.mols=LW.mols.filter(m=>!m.out);LW.sug=LW.sug.filter(g=>!g.out)}
  // motion: the liquid tumbles and jostles; ice molecules only vibrate in place; sugar drifts slowly and is pushed ahead of the ice
  const ice=LW.sites.filter(q=>q.m),all=LW.mols.filter(m=>m.st==="liq");
  const iceTop=x=>{let y=-9;for(const q of ice)if(Math.abs(q.x-x)<.2&&q.y>y)y=q.y;return y};   // the liquid stays above the ice front
  for(const m of all){m.a=m.out?m.a-dt*2.5:Math.min(1,m.a+dt*2.5);m.dir+=(Math.random()-.5)*7*dt;const sp=v0*(.55+.9*m.rnd);m.x+=Math.cos(m.dir)*sp*dt;m.y+=Math.sin(m.dir)*sp*dt;m.th+=m.w*dt;
    wall(m,RO+.02);for(const q of ice){const dx=m.x-q.x,dy=m.y-q.y,d=Math.hypot(dx,dy);if(d<.17&&d>1e-6){m.x=q.x+dx/d*.17;m.y=q.y+dy/d*.17;m.dir=Math.atan2(dy,dx)+(Math.random()-.5)}}
    const it=iceTop(m.x);if(it>-9&&m.y<it+.13){m.y=it+.13;m.dir=Math.PI/2+(Math.random()-.5)}}
  for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++){const a=all[i],b=all[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d<.15&&d>1e-6){const o=(.15-d)/2,nx=dx/d,ny=dy/d;a.x-=nx*o;a.y-=ny*o;b.x+=nx*o;b.y+=ny*o}}
  for(const g of LW.sug){g.a=g.out?g.a-dt*2:Math.min(1,g.a+dt*2);g.dir+=(Math.random()-.5)*3*dt;const sp=v0*.32;g.x+=Math.cos(g.dir)*sp*dt;g.y+=Math.sin(g.dir)*sp*dt;g.th+=g.w*.25*dt;wall(g,.21);
    for(const q of ice){const dx=g.x-q.x,dy=g.y-q.y,d=Math.hypot(dx,dy);if(d<.27&&d>1e-6){g.x=q.x+dx/d*.27;g.y=q.y+dy/d*.27;g.dir=Math.atan2(dy,dx)}}
    for(const m of all){const dx=m.x-g.x,dy=m.y-g.y,d=Math.hypot(dx,dy);if(d<.23&&d>1e-6){m.x=g.x+dx/d*.23;m.y=g.y+dy/d*.23}}
    for(const h of LW.sug)if(h!==g){const dx=h.x-g.x,dy=h.y-g.y,d=Math.hypot(dx,dy);if(d<.4&&d>1e-6){const o=(.4-d)/2;g.x-=dx/d*o;g.y-=dy/d*o;h.x+=dx/d*o;h.y+=dy/d*o}}}
  LW.mols=LW.mols.filter(m=>!(m.out&&m.a<=0));LW.sug=LW.sug.filter(g=>!(g.out&&g.a<=0));
  LW.fx=LW.fx.filter(f=>LW.t-f.t<.6);LW.heat=LW.heat.filter(h=>LW.t-h.t<.9)}
// where to draw the hydrogen atoms: in the ice, along the bonds to neighbours; in the liquid, at the molecule's own angle (104.5°)
function hAtoms(m){if(m.st==="ice"&&m.site){const nb=m.site.nb.slice(0,2).map(j=>LW.sites[j]);if(nb.length===2)return nb.map(q=>{const a=Math.atan2(q.y-m.y,q.x-m.x);return [Math.cos(a),Math.sin(a)]})}
  return [[Math.cos(m.th-.91),Math.sin(m.th-.91)],[Math.cos(m.th+.91),Math.sin(m.th+.91)]]}
function liquidBonds(max){const L=LW.mols.filter(m=>m.st==="liq"&&!m.out),o=[];for(let i=0;i<L.length&&o.length<max;i++)for(let j=i+1;j<L.length&&o.length<max;j++){const d=Math.hypot(L[i].x-L[j].x,L[i].y-L[j].y);if(d<.2)o.push([L[i],L[j]])}return o}
function iceBonds(){const o=[];for(const q of LW.sites)if(q.m)for(const j of q.nb)if(j>q.i&&LW.sites[j].m)o.push([q.m,LW.sites[j].m]);return o}

// ================================================================ pens: one drawing, two outputs (the SVG under the bench, and screens in 3D)
const FONT="'Instrument Sans',system-ui,sans-serif";
function svgPen(){let o="";const f=n=>Math.round(n*10)/10;
  const paint=(st,line)=>`fill="${st.fill||"none"}"${st.stroke?` stroke="${st.stroke}" stroke-width="${st.lw||1}"`:""}${st.dash?` stroke-dasharray="${st.dash.join(" ")}"`:""}${st.op!=null?` opacity="${st.op}"`:""}${line?` stroke-linecap="round" stroke-linejoin="round"`:""}`;
  return {rect(x,y,w,h,st={}){o+=`<rect x="${f(x)}" y="${f(y)}" width="${f(Math.max(0,w))}" height="${f(Math.max(0,h))}" rx="${st.r||0}" ${paint(st)}/>`},
    line(pts,st={}){if(pts.length<2)return;o+=`<path d="${pts.map((p,i)=>(i?"L":"M")+f(p[0])+","+f(p[1])).join("")}${st.close?"Z":""}" ${paint(st,true)}/>`},
    circle(x,y,r,st={}){o+=`<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" ${paint(st)}/>`},
    text(x,y,t,st={}){const tt=st.caps?String(t).toUpperCase():String(t);o+=`<text x="${f(x)}" y="${f(y)}" text-anchor="${st.anchor||"start"}" style="font:${st.weight||600} ${st.size||10}px ${FONT};fill:${st.fill||INK};letter-spacing:${st.caps?".06em":"0"}"${st.op!=null?` opacity="${st.op}"`:""}>${esc(tt)}</text>`},
    out:()=>o}}
function canvasPen(g,k){const set=st=>{g.globalAlpha=st.op!=null?st.op:1;g.setLineDash(st.dash?st.dash.map(d=>d*k):[]);g.lineWidth=(st.lw||1)*k;g.lineCap="round";g.lineJoin="round"};
  return {rect(x,y,w,h,st={}){set(st);g.beginPath();const r=(st.r||0)*k;if(g.roundRect)g.roundRect(x*k,y*k,Math.max(0,w)*k,Math.max(0,h)*k,r);else g.rect(x*k,y*k,w*k,h*k);if(st.fill){g.fillStyle=st.fill;g.fill()}if(st.stroke){g.strokeStyle=st.stroke;g.stroke()}g.globalAlpha=1},
    line(pts,st={}){if(pts.length<2)return;set(st);g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0]*k,p[1]*k):g.moveTo(p[0]*k,p[1]*k));if(st.close)g.closePath();if(st.fill){g.fillStyle=st.fill;g.fill()}if(st.stroke){g.strokeStyle=st.stroke;g.stroke()}g.globalAlpha=1;g.setLineDash([])},
    circle(x,y,r,st={}){set(st);g.beginPath();g.arc(x*k,y*k,r*k,0,Math.PI*2);if(st.fill){g.fillStyle=st.fill;g.fill()}if(st.stroke){g.strokeStyle=st.stroke;g.stroke()}g.globalAlpha=1},
    text(x,y,t,st={}){g.globalAlpha=st.op!=null?st.op:1;g.font=`${st.weight||600} ${(st.size||10)*k}px Instrument Sans, system-ui, sans-serif`;g.fillStyle=st.fill||INK;g.textAlign=st.anchor==="middle"?"center":st.anchor==="end"?"right":"left";
      try{g.letterSpacing=st.caps?`${(.06*(st.size||10)*k).toFixed(1)}px`:"0px"}catch(e){}g.fillText(st.caps?String(t).toUpperCase():String(t),x*k,y*k);g.globalAlpha=1}}}
const decim=(pts,n)=>{if(pts.length<=n)return pts;const o=[],st=(pts.length-1)/(n-1);for(let i=0;i<n;i++)o.push(pts[Math.round(i*st)]);return o};
const NICE=[10,15,20,30,45,60,90];
function arrowV(p,x,y0,y1,c,lw){p.line([[x,y0],[x,y1]],{stroke:c,lw:lw||1.6});const d=y1>y0?-6:6;p.line([[x-4,y1+d],[x,y1],[x+4,y1+d]],{stroke:c,lw:lw||1.6})}

// ---- the cooling curve: probe temperature against time, with the previous drink as a dashed line
function drawCurve(p,st){const W=420,H=260,r=s.run,g=s.ghost&&s.ghost!==r?s.ghost:null,test=st&&st.k==="test";
  const X0=46,X1=W-14,Y0=H-36,Y1=58,TL=-6,TH=22;
  let tm=Math.max(r.t,15*60);if(g)tm=Math.max(tm,g.t);tm=(NICE.find(n=>n*60>=tm-1e-6)||90)*60;
  const X=t=>X0+t/tm*(X1-X0),Y=T=>Y0-(Math.max(TL,Math.min(TH,T))-TL)/(TH-TL)*(Y0-Y1);
  p.rect(0,0,W,H,{fill:"#FFFFFF",r:14});
  p.text(16,22,"Cooling curve",{size:11.5,weight:700});p.text(16,36,"probe temperature, 1 kg of drink",{size:9.5,weight:500,fill:MUTED});
  p.text(W-16,22,`${r.w}% sugar`,{anchor:"end",size:10.5,weight:700,fill:SKYD});
  if(g){p.line([[W-128,33],[W-114,33]],{stroke:GHOST,lw:2,dash:[4,3]});p.text(W-16,36,`previous: ${g.w}%`,{anchor:"end",size:9.5,weight:500,fill:MUTED})}
  for(let T=-5;T<=20;T+=5){p.line([[X0,Y(T)],[X1,Y(T)]],{stroke:T===0?"#C6D0DE":GRID,lw:T===0?1.4:1});p.text(X0-6,Y(T)+3.5,T<0?"−"+(-T):String(T),{anchor:"end",size:9.5,weight:500,fill:MUTED})}
  p.text(X0-8,Y(20)-12,"°C",{anchor:"end",size:9.5,weight:600,fill:MUTED});
  const step={10:2,15:5,20:5,30:5,45:15,60:10,90:15}[Math.round(tm/60)]||10;
  for(let mn=0;mn<=tm/60+1e-6;mn+=step){p.line([[X(mn*60),Y0],[X(mn*60),Y0+4]],{stroke:AXIS});p.text(X(mn*60),Y0+15,String(mn),{anchor:"middle",size:9.5,weight:500,fill:MUTED})}
  p.line([[X0,Y1-4],[X0,Y0],[X1,Y0]],{stroke:AXIS,lw:1.2});p.text((X0+X1)/2,H-5,"time (minutes)",{anchor:"middle",size:10,weight:600,fill:MUTED});
  p.line([[X0,Y(TSET)],[X1,Y(TSET)]],{stroke:MINTD,lw:1,dash:[2,4],op:.8});p.text(X1-2,Y(TSET)+13,"thermostat: −3 °C",{anchor:"end",size:9,weight:600,fill:MINTD});
  if(g)p.line(decim(g.pts.concat([[g.t,g.T,g.mi]]).filter(q=>q[0]<=tm),240).map(q=>[X(q[0]),Y(q[1])]),{stroke:GHOST,lw:2,dash:[5,4]});
  const pts=decim(r.pts.concat([[r.t,r.T,r.mi]]),320);let seg=[],ice=false;
  const flush=()=>{if(seg.length>1)p.line(seg,{stroke:ice?SKYD:"#E07A52",lw:2.6})};
  for(const q of pts){const now=q[2]>.5;if(now!==ice&&seg.length){const last=seg[seg.length-1];flush();seg=[last];ice=now}else ice=now;seg.push([X(q[0]),Y(q[1])])}flush();
  if(r.tIce!=null&&!test){const tf=tfOf(r.w),y=Y(tf),xa=X(r.tIce);p.line([[Math.max(X0,xa-30),y],[Math.min(X1,xa+90)]].map((q,i)=>i?[q[0],y]:q),{stroke:SKYD,lw:1,dash:[3,3]});
    p.text(Math.min(X1-4,xa+6),y-7,r.w?`ice starts to form at ${fmtT(tf)}`:"flat at 0 °C while the water freezes",{size:9.5,weight:700,fill:SKYD})}
  if(r.started)p.circle(X(Math.min(r.t,tm)),Y(r.T),4.4,{fill:"#FFFFFF",stroke:INK,lw:1.6});
  else p.text((X0+X1)/2,Y(9),"Press Play to start cooling",{anchor:"middle",size:12,weight:600,fill:MUTED});
  p.line([[X0+10,Y1+6],[X0+24,Y1+6]],{stroke:"#E07A52",lw:2.6});p.text(X0+28,Y1+9.5,"liquid cooling",{size:9,weight:600,fill:MUTED});
  p.line([[X0+104,Y1+6],[X0+118,Y1+6]],{stroke:SKYD,lw:2.6});p.text(X0+122,Y1+9.5,"ice forming",{size:9,weight:600,fill:MUTED})}
// ---- energy taken out of the drink, split into a temperature change and a change of state
function drawSplit(p){const W=420,H=260,r=s.run;p.rect(0,0,W,H,{fill:"#FFFFFF",r:14});
  p.text(16,22,"Energy taken out of the drink",{caps:true,size:10.5});p.text(16,37,"so far, since it went in at 20 °C",{size:9.5,weight:500,fill:MUTED});
  const ec=Math.max(0,eCool(r)),ef=eFreeze(r),max=Math.max(420e3,ec+ef),x0=16,bw=W-32,w1=bw*ec/max,w2=bw*ef/max;
  p.rect(x0,50,bw,24,{fill:"#F2EEF6",r:8});if(w1>.5)p.rect(x0,50,w1,24,{fill:WARMC,r:8});if(w2>.5)p.rect(x0+w1,50,w2,24,{fill:ICEC,r:8});
  p.text(x0,96,"Cooling: temperature falls",{size:10.5,weight:700,fill:PEACHD});p.text(x0,112,`E = mcΔT   ${fmtK(ec)}`,{size:10.5,weight:600});p.text(x0,127,"the particles slow down",{size:9.5,weight:500,fill:MUTED});
  p.text(W/2+6,96,"Freezing: a change of state",{size:10.5,weight:700,fill:SKYD});p.text(W/2+6,112,`E = mL   ${fmtK(ef)}`,{size:10.5,weight:600});p.text(W/2+6,127,"attractions form; temperature steady",{size:9.5,weight:500,fill:MUTED});
  p.rect(16,142,W-32,100,{fill:"#F4F8FC",r:10});p.text(28,162,"Freezing so far",{caps:true,size:9.5,fill:MUTED});
  p.text(28,182,`${Math.round(r.mi)} g of ice × 334 J g⁻¹ = ${fmtK(r.mi*LF)}`,{size:11.5,weight:700});
  p.text(28,203,"Cooling 1 g of liquid water by 1 °C takes 4.18 J. Freezing 1 g",{size:9.5,weight:500,fill:MUTED});
  p.text(28,217,"takes 334 J: as much as cooling it by about 80 °C.",{size:9.5,weight:500,fill:MUTED})}
// ---- where sugar syrup starts to freeze (the sourced table), with this drink's path as it freezes
function drawFP(p){const W=420,H=260,r=s.run;p.rect(0,0,W,H,{fill:"#FFFFFF",r:14});
  p.text(16,22,"Where sugar syrup starts to freeze",{size:11.5,weight:700});p.text(16,36,"data: University of Guelph (Leighton 1927)",{size:9,weight:500,fill:MUTED});
  const X0=46,X1=W-16,Y0=H-36,Y1=60,XM=45,DM=5,X=w=>X0+w/XM*(X1-X0),Y=d=>Y1+Math.min(DM,d)/DM*(Y0-Y1);
  for(let d=0;d<=DM;d++){p.line([[X0,Y(d)],[X1,Y(d)]],{stroke:GRID});p.text(X0-6,Y(d)+3.5,d?"−"+d:"0",{anchor:"end",size:9.5,weight:500,fill:MUTED})}
  p.text(X0-6,Y1-9,"°C",{anchor:"end",size:9.5,weight:600,fill:MUTED});
  for(let w=0;w<=40;w+=10){p.line([[X(w),Y0],[X(w),Y0+4]],{stroke:AXIS});p.text(X(w),Y0+15,w+"%",{anchor:"middle",size:9.5,weight:500,fill:MUTED})}
  p.line([[X0,Y1-4],[X0,Y0],[X1,Y0]],{stroke:AXIS,lw:1.2});p.text((X0+X1)/2,H-5,"sugar in the syrup (% by mass)",{anchor:"middle",size:10,weight:600,fill:MUTED});
  const tbl=FPD.filter(q=>wOfS(q[0])<=XM&&q[1]<=DM+.3).map(q=>[X(wOfS(q[0])),Y(q[1])]);p.line(tbl,{stroke:INK,lw:2});tbl.forEach(q=>p.circle(q[0],q[1],1.9,{fill:INK}));
  p.line([[X0,Y(-TSET)],[X1,Y(-TSET)]],{stroke:MINTD,lw:1.2,dash:[3,4]});p.text(X1-2,Y(-TSET)+13,"the machine holds −3 °C",{anchor:"end",size:9,weight:600,fill:MINTD});
  const w0=r.w,d0=fpd(sOfW(w0));
  if(r.mi>.5&&w0>0){const wn=wOfS(syrupS(r)),path=[];for(let i=0;i<=30;i++){const w=w0+(wn-w0)*i/30;path.push([X(w),Y(fpd(sOfW(w)))])}p.line(path,{stroke:SKYD,lw:4,op:.55});
    p.circle(X(wn),Y(fpd(syrupS(r))),5.5,{fill:SKYD,stroke:"#FFFFFF",lw:1.5});p.circle(X0+14,Y0-14,4.5,{fill:SKYD,stroke:"#FFFFFF",lw:1.5});p.text(X0+24,Y0-10.5,`syrup now: ${Math.round(wn)}% sugar, freezes at ${fmtT(-fpd(syrupS(r)))}`,{size:9.5,weight:700,fill:SKYD})}
  p.circle(X(w0),Y(d0),5,{fill:"#FFFFFF",stroke:"#E07A52",lw:2});
  p.circle(X0+14,Y0-32,4.2,{fill:"#FFFFFF",stroke:"#E07A52",lw:2});p.text(X0+24,Y0-28.5,w0?`your drink: ${w0}% sugar, starts freezing at ${fmtT(-d0)}`:"pure water: freezes at 0 °C, all of it",{size:9.5,weight:700,fill:"#C0603A"});
  p.text(W-16,22,`${Math.round(r.mi/M*100)}% ice`,{anchor:"end",size:10.5,weight:700,fill:SKYD});p.text(W-16,36,stateNow(r),{anchor:"end",size:9.5,weight:600,fill:MUTED})}
// ---- the change of state as an energy change
function drawBonds(p){const W=420,H=260,r=s.run;p.rect(0,0,W,H,{fill:"#FFFFFF",r:14});
  p.text(16,22,"Energy and the change of state",{caps:true,size:10.5});
  const xa=22,xb=196,yL=66,yS=162;
  p.line([[xa,yL],[xb,yL]],{stroke:"#E07A52",lw:2.6});p.text(xa,yL-8,"liquid water: molecules move past each other",{size:9.5,weight:600,fill:"#C0603A"});
  p.line([[xa,yS],[xb,yS]],{stroke:SKYD,lw:2.6});p.text(xa,yS+16,"ice: held in a lattice by hydrogen bonds",{size:9.5,weight:600,fill:SKYD});
  arrowV(p,40,yL+6,yS-6,"#E07A52",2);p.text(50,yL+20,"freezing: 334 J g⁻¹ released",{size:9.5,weight:700,fill:"#C0603A"});p.text(50,yL+33,"exothermic",{size:9.5,weight:500,fill:MUTED});
  arrowV(p,186,yS-6,yL+6,SKYD,2);p.text(176,yS-28,"melting: 334 J g⁻¹ taken in",{anchor:"end",size:9.5,weight:700,fill:SKYD});p.text(176,yS-15,"endothermic",{anchor:"end",size:9.5,weight:500,fill:MUTED});
  const x2=232;p.text(x2,58,"Right now",{caps:true,size:9.5,fill:MUTED});const rate=r.dmi;
  if(rate>.005){p.text(x2,78,`ice forming: ${rate.toFixed(2)} g s⁻¹`,{size:10.5,weight:700,fill:SKYD});p.text(x2,94,`releasing ${Math.round(rate*LF)} J s⁻¹ (W)`,{size:10,weight:600});p.text(x2,109,"the refrigerant carries it away",{size:9.5,weight:500,fill:MUTED})}
  else if(rate<-.005){p.text(x2,78,`ice melting: ${(-rate).toFixed(2)} g s⁻¹`,{size:10.5,weight:700,fill:"#C0603A"});p.text(x2,94,`taking in ${Math.round(-rate*LF)} J s⁻¹ (W)`,{size:10,weight:600});p.text(x2,109,"from the warmer room",{size:9.5,weight:500,fill:MUTED})}
  else{p.text(x2,78,r.mi>.5?"ice and syrup steady":"no ice yet",{size:10.5,weight:700,fill:INK});p.text(x2,94,r.mi>.5?`${Math.round(r.mi)} g of ice`:`drink at ${fmtT(r.T)}`,{size:10,weight:600})}
  // same mass, more room: ice is less dense
  const bx=x2,by=128;p.rect(bx,by,50,52,{fill:"#FCEBEF",stroke:"#E7A5B6",r:6});p.rect(bx+70,by-8,58,60,{fill:"#EEF6FF",stroke:"#9FC4E8",r:6});
  for(let i=0;i<12;i++){p.circle(bx+8+(i%4)*11.5+((i>>2)%2)*3,by+10+Math.floor(i/4)*14,3.4,{fill:"#6FA3E8"});const hx=bx+70+9+(i%4)*13.4,hy=by-8+10+Math.floor(i/4)*17+((i%2)?4:0);p.circle(hx,hy,3.4,{fill:"#6FA3E8"})}
  p.text(bx+25,by+66,"water",{anchor:"middle",size:9,weight:600,fill:MUTED});p.text(bx+99,by+66,"ice",{anchor:"middle",size:9,weight:600,fill:MUTED});
  p.text(16,H-30,"Same molecules, more room: ice is about 9% less dense than",{size:9.5,weight:500,fill:MUTED});p.text(16,H-16,"liquid water, so ice crystals float (USGS).",{size:9.5,weight:500,fill:MUTED})}
// ---- what the auger changes
function drawAug(p){const W=420,H=260,r=s.run,pw=powers(r);p.rect(0,0,W,H,{fill:"#FFFFFF",r:14});
  p.text(16,22,"What the auger changes",{caps:true,size:10.5});p.text(W-16,22,r.jam?"auger jammed":s.auger?"auger turning":"auger stopped",{anchor:"end",size:10.5,weight:700,fill:r.jam||!s.auger?"#C0603A":MINTD});
  const bar=(y,lab,val,max,txt,c)=>{p.text(16,y,lab,{size:10,weight:600});p.text(W-16,y,txt,{anchor:"end",size:10,weight:700,fill:INK});p.rect(16,y+6,W-32,12,{fill:"#F2EEF6",r:6});p.rect(16,y+6,Math.max(6,(W-32)*Math.min(1,val/max)),12,{fill:c,r:6})};
  bar(50,"Heat taken from the drink",pw.qc,320,pw.run?`${Math.round(pw.qc)} W`:"compressor resting",ICEC);
  bar(88,"Ice stuck to the drum",r.shell,300,`${Math.round(r.shell)} g`,"#CFE3F5");
  bar(126,"Crystal size (model)",!augerOn(r)&&r.shell>2?1:r.mi>.5?r.size:0,1,sizeTxt(r),ELEC);
  // a sketch of each texture
  const cA=[110,206],cB=[310,206],on=augerOn(r);
  p.circle(cA[0],cA[1],36,{fill:"#FCEFF3",stroke:on?MINTD:"#DCD6EA",lw:on?2.4:1.2});p.circle(cB[0],cB[1],36,{fill:"#FCEFF3",stroke:!on?"#C0603A":"#DCD6EA",lw:!on?2.4:1.2});
  const hex=(x,y,rr)=>{const pts=[];for(let i=0;i<=6;i++)pts.push([x+rr*Math.cos(i*Math.PI/3),y+rr*Math.sin(i*Math.PI/3)]);p.line(pts,{fill:"#FFFFFF",stroke:"#9FC4E8",lw:1})};
  for(let i=0;i<26;i++){const a=i*2.4,d=6+((i*37)%24);hex(cA[0]+Math.cos(a)*d,cA[1]+Math.sin(a)*d,2.6)}
  [[-14,-10,9],[12,-14,8],[2,12,11],[-18,14,6],[20,10,7]].forEach(([dx,dy,rr])=>hex(cB[0]+dx,cB[1]+dy,rr));
  p.text(cA[0]+46,cA[1]-8,"turning:",{size:9.5,weight:700,fill:MINTD});p.text(cA[0]+46,cA[1]+6,"many small",{size:9,weight:500,fill:MUTED});p.text(cA[0]+46,cA[1]+18,"crystals",{size:9,weight:500,fill:MUTED});
  p.text(cB[0]-46,cB[1]-8,"stopped:",{anchor:"end",size:9.5,weight:700,fill:"#C0603A"});p.text(cB[0]-46,cB[1]+6,"fewer, bigger",{anchor:"end",size:9,weight:500,fill:MUTED});p.text(cB[0]-46,cB[1]+18,"crystals",{anchor:"end",size:9,weight:500,fill:MUTED})}
// ---- where the energy goes: an energy flow (Sankey) diagram with the live powers
function band(p,x0,y0,h0,x1,y1,c,op){if(h0<.6)return;const pts=[],n=18;for(let i=0;i<=n;i++){const u=i/n,e=u*u*(3-2*u);pts.push([x0+(x1-x0)*u,y0+(y1-y0)*e])}
  const bot=pts.map(q=>[q[0],q[1]+h0]).reverse();p.line(pts.concat(bot),{fill:c,close:true,op:op||.9})}
function drawSankey(p){const W=420,H=260,r=s.run,pw=powers(r);p.rect(0,0,W,H,{fill:"#FFFFFF",r:14});
  p.text(16,22,"Where the energy goes",{caps:true,size:10.5});
  p.text(16,36,pw.run?"right now, in watts (joules every second)":!s.comp?"cooling switched off: only the auger runs":"compressor resting: the drink is at −3 °C",{size:9.5,weight:500,fill:MUTED});
  const tot=pw.pin+pw.qc,k=Math.min(.42,112/Math.max(1,tot)),hE=pw.pin*k,hQ=pw.qc*k,xL=16,xN=196,xR=W-130,yTop=52;
  // sources (left) → machine (middle) → destinations (right)
  const yE=yTop,yQ=yTop+hE+14;
  p.rect(xL,yE,10,hE,{fill:LAVD,r:2});p.rect(xL,yQ,10,hQ,{fill:SKYD,r:2});
  band(p,xL+10,yE,hE,xN,yTop,ELEC);band(p,xL+10,yQ,hQ,xN,yTop+hE,ICEC);
  p.rect(xN,yTop,12,hE+hQ,{fill:"#DCD6EA",r:3});
  const hB=pw.back*k,hA=(pw.pa-pw.stir)*k,hS=pw.stir*k;
  band(p,xN+12,yTop,hB,xR,yTop,WARMC);band(p,xN+12,yTop+hB,hA,xR,yTop+hB+12,"#F9D2B8");band(p,xN+12,yTop+hB+hA,hS,xR,yTop+hB+hA+26,"#F7C3D0");
  p.text(xL+14,yE+Math.max(10,hE/2)+3,`electricity ${Math.round(pw.pin)} W`,{size:10,weight:700,fill:LAVD});
  if(pw.run)p.text(xL+14,yE+Math.max(10,hE/2)+16,`compressor ${pw.pc} · fan ${pw.pf} · auger ${pw.pa}`,{size:8.5,weight:600,fill:MUTED});
  if(hQ>1)p.text(xL+14,yQ+hQ/2+4,`heat from the drink ${Math.round(pw.qc)} W`,{size:10,weight:700,fill:SKYD});
  if(hB>1){p.text(xR+6,yTop+hB/2+1,`heat out the back`,{size:10,weight:700,fill:PEACHD});p.text(xR+6,yTop+hB/2+14,`${Math.round(pw.back)} W`,{size:11,weight:700,fill:PEACHD})}
  if(hA>.3)p.text(xR+6,yTop+hB+12+hA/2+3,`auger motor warmth ${pw.pa-pw.stir} W`,{size:8.5,weight:600,fill:MUTED});
  if(hS>.3)p.text(xR+6,yTop+hB+hA+26+hS/2+5,`stirring heat into drink ${pw.stir} W`,{size:8.5,weight:600,fill:MUTED});
  p.rect(16,H-62,W-32,50,{fill:"#F7F4FB",r:10});
  if(pw.run){p.text(26,H-44,`Compressor motor: ${Math.round(pw.pc*EFF)} W useful work ÷ ${pw.pc} W in = ${Math.round(EFF*100)}% efficient (illustrative)`,{size:9.5,weight:600});
    p.text(26,H-29,`Heat moved from the drink for each joule the compressor uses: ${(pw.qc/pw.pc).toFixed(1)} J (illustrative)`,{size:9.5,weight:500,fill:MUTED});
    p.text(26,H-16,"Energy in = energy out: every watt in ends up as heat in the room.",{size:9.5,weight:500,fill:MUTED})}
  else p.text(26,H-34,"With the compressor off, no heat is moved: the drink slowly warms.",{size:9.5,weight:600})}
const PANEL={sankey:drawSankey,split:drawSplit,bonds:drawBonds,fp:drawFP,aug:drawAug,curve:drawCurve};
const SCREEN_B={machine:"sankey",curve:"split",bonds:"bonds",sugar:"fp",auger:"aug",energy:"sankey",test:"sankey"};
const CLOSE={machine:"sankey",curve:"curve",bonds:"bonds",sugar:"fp",auger:"aug",energy:"sankey",test:"curve"};

// ================================================================ the loop the refrigerant runs round (cm, in the machine's own frame)
// x across the machine, y up from its feet, z from the back (−15) to the front (+21). The bowl's axis is at y = 23.6.
const AX=23.6,ZB=1.5,LEV=26.4,HX0=-10,HX1=6.5,HTURN=7.5,AZ0=-11,AZ1=8,ATURN=3.45,CM=.25;   // CM: scene units per cm (25 per metre)
const ROWS=[13.5,11.5,9.5,7.5,5.5,3.5],CDX=8.5,CDZ=-12.8;
function condPts(){const pts=[];ROWS.forEach((y,i)=>{const L2R=i%2===0,xa=L2R?-CDX:CDX,xb=L2R?CDX:-CDX;for(let k=0;k<=8;k++)pts.push([xa+(xb-xa)*k/8,y,CDZ]);
  if(i<ROWS.length-1){const sg=L2R?1:-1;for(let k=1;k<8;k++){const a=Math.PI/2-Math.PI*k/8;pts.push([xb+sg*Math.cos(a),y-1+Math.sin(a),CDZ])}}});return pts}
const LOOP=(()=>{const S=[],add=(type,pts)=>S.push({type,pts});
  add("comp",[[-5,9.6,-10.7],[-5,11.4,-9],[-5,13.4,-7]]);
  add("hot",[[-5,13.4,-7],[-5,14.3,-8.6],[-6.6,14.3,-11.3],[-8.5,13.5,-12.8]]);
  add("cond",condPts());
  add("liq",[[-8.5,3.5,-12.8],[-9.6,3,-11.6],[-9.6,2.4,-2],[-9.4,2.4,4],[-7.4,2.4,6],[-4.6,2.4,6],[-1.4,2.4,6],[3.2,2.4,6],[5.4,2.8,5.3],[6,4,5],[6,5.3,5]]);
  add("valve",[[6,5.3,5],[6,7.5,5]]);
  add("cold",[[6,7.5,5],[6,9.4,4.6],[6,12.6,1.2],[4.6,14.2,-5.6],[2.6,14.6,-11],[1.6,16.4,-13.3],[1.2,21.4,-13.4],[1.0,23.2,-12.6],[1.8,23.6,-11],[2.75,23.6,-10]]);
  const n=Math.round(HTURN*28),hp=[];for(let i=0;i<=n;i++){const u=i/n,th=u*HTURN*2*Math.PI;hp.push([2.75*Math.cos(th),AX+2.75*Math.sin(th),HX0+(HX1-HX0)*u])}
  add("evap",hp);
  add("inside",[hp[n],[0,AX,HX1+.5],[0,AX,-11.5],[-1,AX,-12.6]]);
  add("suct",[[-1,AX,-12.6],[-1.2,21.4,-13.4],[-1.6,16.4,-13.5],[-2.6,14.6,-12],[-4.2,12.6,-11.2],[-5,9.6,-10.7]]);
  const SPD={comp:2.2,hot:1,cond:.7,liq:.32,valve:.4,cold:.9,evap:.75,inside:2.2,suct:1.15};
  const COL={hot:["#EE8B7E","#EE8B7E"],cond:["#EE8B7E","#F6C4A4"],liq:["#F6C4A4","#EFD9CC"],valve:["#EFD9CC","#8FC3F0"],cold:["#8FC3F0","#8FC3F0"],evap:["#8FC3F0","#B9D9F5"],inside:["#B9D9F5","#B9D9F5"],suct:["#B9D9F5","#D3E0EE"],comp:["#D3E0EE","#EE8B7E"]};
  const SZ={hot:[.36,.36],cond:[.36,.25],liq:[.23,.23],valve:[.23,.28],cold:[.27,.27],evap:[.28,.3],inside:[.3,.3],suct:[.32,.34],comp:[.34,.36]};
  const pts=[];S.forEach(sec=>{const n=sec.pts.length;sec.pts.forEach((q,i)=>{if(pts.length&&i===0)return;const u=n>1?i/(n-1):0;pts.push({p:q,type:sec.type,u,
    col:mix(COL[sec.type][0],COL[sec.type][1],u),sz:SZ[sec.type][0]+(SZ[sec.type][1]-SZ[sec.type][0])*u,hide:sec.type==="comp"||sec.type==="inside"||sec.type==="valve"})})});
  let tau=0;pts[0].tau=0;for(let i=1;i<pts.length;i++){const a=pts[i-1].p,b=pts[i].p,d=Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2]);tau+=d/SPD[pts[i].type];pts[i].tau=tau}
  return {secs:S,pts,tau}})();
function loopAt(ph){const L=LOOP.pts,T=((ph%1)+1)%1*LOOP.tau;let lo=0,hi=L.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(L[m].tau<=T)lo=m;else hi=m}
  const a=L[lo],b=L[hi],u=(T-a.tau)/Math.max(1e-9,b.tau-a.tau);return {x:a.p[0]+(b.p[0]-a.p[0])*u,y:a.p[1]+(b.p[1]-a.p[1])*u,z:a.p[2]+(b.p[2]-a.p[2])*u,a,b,u}}

// ================================================================ the drawing (fallback without WebGL, and with ?lite)
function lwSVG(cx,cy,rad,acc){const k=rad/LR,X=x=>cx+x*k,Y=y=>cy-y*k,f=n=>n.toFixed(1);let o="";
  o+=`<circle cx="${cx+5}" cy="${cy+6}" r="${rad+6}" fill="${P.shadow}" opacity=".12"/><circle cx="${cx}" cy="${cy}" r="${rad+6}" fill="#fff" stroke="${acc}" stroke-width="3"/><circle cx="${cx}" cy="${cy}" r="${rad}" fill="#FBF3F5"/>`;
  o+=`<clipPath id="sl-lens"><circle cx="${cx}" cy="${cy}" r="${rad}"/></clipPath><g clip-path="url(#sl-lens)"><rect x="${cx-rad}" y="${f(Y(YD))}" width="${rad*2}" height="${rad}" fill="${P.steel}"/><rect x="${cx-rad}" y="${f(Y(YD))}" width="${rad*2}" height="3" fill="#EAF4FC"/>`;
  for(const [a,b] of iceBonds())o+=`<line x1="${f(X(a.x))}" y1="${f(Y(a.y))}" x2="${f(X(b.x))}" y2="${f(Y(b.y))}" stroke="${SKYD}" stroke-width="2" stroke-dasharray="3 2.5" opacity=".85"/>`;
  for(const [a,b] of liquidBonds(30))o+=`<line x1="${f(X(a.x))}" y1="${f(Y(a.y))}" x2="${f(X(b.x))}" y2="${f(Y(b.y))}" stroke="${SKYD}" stroke-width="1" stroke-dasharray="2 2.5" opacity=".35"/>`;
  for(const g of LW.sug){const a=Math.max(0,Math.min(1,g.a));for(const [dx,n] of [[-.085,6],[.09,5]]){const pts=[];for(let i=0;i<n;i++){const t=g.th+i*2*Math.PI/n;pts.push(`${f(X(g.x+dx*Math.cos(g.th)+Math.cos(t)*.085))},${f(Y(g.y+dx*Math.sin(g.th)+Math.sin(t)*.085))}`)}
    o+=`<polygon points="${pts.join(" ")}" fill="#F9D2B8" stroke="${PEACHD}" stroke-width="1.3" opacity="${a.toFixed(2)}"/>`}}
  for(const m of LW.mols){const a=Math.max(0,Math.min(1,m.a));if(a<=.02)continue;const hs=hAtoms(m);
    for(const h of hs)o+=`<circle cx="${f(X(m.x+h[0]*.075))}" cy="${f(Y(m.y+h[1]*.075))}" r="${f(.036*k)}" fill="#fff" stroke="#8FA3BD" stroke-width=".7" opacity="${a.toFixed(2)}"/>`;
    o+=`<circle cx="${f(X(m.x))}" cy="${f(Y(m.y))}" r="${f(RO*k)}" fill="${m.st==="liq"?"#9CC4F2":"#3466B8"}" stroke="${INK}" stroke-opacity=".3" opacity="${a.toFixed(2)}"/>`}
  for(const fx of LW.fx){const u=(LW.t-fx.t)/.6;o+=`<circle cx="${f(X(fx.x))}" cy="${f(Y(fx.y))}" r="${f((.06+u*.2)*k)}" fill="none" stroke="${fx.exo?"#E9875E":SKYD}" stroke-width="2" opacity="${(1-u).toFixed(2)}"/>`}
  for(const h of LW.heat){const u=(LW.t-h.t)/.9;o+=`<circle cx="${f(X(h.x))}" cy="${f(Y(h.y+(YD-.1-h.y)*u))}" r="${f(.035*k)}" fill="#E9875E" opacity="${(1-u).toFixed(2)}"/>`}
  o+=`</g><path d="M${cx-rad*.62},${cy-rad*.7} a${rad*.95},${rad*.95} 0 0 1 ${rad*.9},${-rad*.22}" stroke="#fff" stroke-width="3" fill="none" opacity=".8" stroke-linecap="round"/>`;
  return o}
function drawMain(x,st){if(has3D)return "";const r=s.run,k=st.k;if(!(s.playing&&st.speed))lwTick(0);
  const X=z=>132+(z+15)*7.2,Y=y=>306-y*7.2,C=7.2,pw=powers(r),run=pw.run,phi=r.mi/M,t=s.anim,f=n=>n.toFixed(1),aug=augerOn(r);let o=F.floor(640,330);
  // the power cord, the front step and drip tray
  o+=`<path d="M${X(-15)},${Y(3)} C${X(-17)},${Y(3)} ${X(-17)},306 ${X(-21)},310" fill="none" stroke="#3A4152" stroke-width="3"/>`;
  o+=F.box(X(11),Y(2.5),10*C,2.5*C,{colour:"#F3F1EC",kind:"plastic",d:12,r:3,shadowLen:26});
  o+=`<rect x="${X(11.6)}" y="${Y(3.2)}" width="${8.8*C}" height="5" rx="2" fill="${P.steel}" stroke="${P.steelDark}"/>`;
  // the base: a frosted case, cut open
  o+=F.acrylic(X(-15),Y(15),26*C,15*C,{tint:P.case.sky,d:16,r:8,shadowLen:60});
  o+=`<rect x="${X(-13.9)}" y="${Y(14.4)}" width="${2.2*C}" height="${11.6*C}" rx="2" fill="#E7ECF2" stroke="${P.steelDark}"/>`;
  ROWS.forEach(y=>o+=`<circle cx="${X(-12.8)}" cy="${Y(y)}" r="${.45*C}" fill="#D59A6A" stroke="#9E6A44"/>`);
  o+=`<ellipse cx="${X(-10.2)}" cy="${Y(8.2)}" rx="${.7*C}" ry="${3.4*C}" fill="#FFFFFF" stroke="#B9C3D0"/><ellipse cx="${X(-10.2)}" cy="${Y(8.2)}" rx="${.3*C}" ry="${(run?1.2+Math.abs(Math.sin(t*14))*1.8:2.6)*C}" fill="#CFECDD" stroke="#8FBFA9"/>`;
  o+=F.cyl(X(-7),Y(13.2),3.6*C,11.2*C,{colour:"#F6B384",kind:"plastic",shadow:false});
  o+=`<circle cx="${X(6)}" cy="${Y(2.4)}" r="${.7*C}" fill="#D59A6A" stroke="#9E6A44"/>`;
  // pipes (side view of the loop), then the refrigerant flowing round
  const col={hot:"#D88A6A",cond:"#D59A6A",liq:"#D59A6A",cold:"#9CC8EE",evap:"#9AA9BA",suct:"#C7DCEF"};
  for(const sec of LOOP.secs){if(!col[sec.type])continue;o+=`<path d="${sec.pts.map((q,i)=>(i?"L":"M")+f(X(q[2]))+","+f(Y(q[1]))).join("")}" fill="none" stroke="${col[sec.type]}" stroke-width="${sec.type==="suct"?4:sec.type==="evap"?1.6:2.6}" stroke-linecap="round" stroke-linejoin="round"${sec.type==="evap"?' opacity=".55"':""}/>`}
  o+=`<rect x="${X(5)-5}" y="${Y(7.4)}" width="10" height="${2.2*C}" rx="2" fill="${P.steel}" stroke="${P.steelDark}"/><rect x="${X(5)-6}" y="${Y(8.6)}" width="12" height="${1*C}" rx="2" fill="#D9CBF2" stroke="${LAVD}"/>`;
  if(r.started)for(let i=0;i<70;i++){const q=loopAt(i/70+(run?t/14:s.flowPh||0));if(q.a.hide)continue;o+=`<circle cx="${f(X(q.z))}" cy="${f(Y(q.y))}" r="${f(q.a.sz*C*.9)}" fill="${q.a.col}" stroke="#fff" stroke-width=".6"/>`}
  // the rear housing with the auger motor, and the saddles
  o+=F.acrylic(X(-15.3),Y(29),3.4*C,14*C,{tint:P.case.sky,d:10,r:4,balls:false,shadow:false});
  o+=`<circle cx="${X(-13.6)}" cy="${Y(18.6)}" r="${1.8*C}" fill="#CFECDD" stroke="#8FBFA9"/>`;
  [-4,7].forEach(z=>o+=`<rect x="${X(z-1.1)}" y="${Y(18)}" width="${2.2*C}" height="${3*C}" rx="3" fill="#FFFFFF" stroke="#C9CDD6"/>`);
  // the bowl: liquid (or slush), the drum, any ice on it, the auger and crystals
  const bx=X(-12.1),by=Y(29.2),bw=27.2*C,bh=11.2*C,ix=X(-11.8),iy=Y(28.9),iw=26.6*C,ih=10.6*C;
  o+=`<clipPath id="sl-bowl"><rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" rx="${5.3*C}"/></clipPath><g clip-path="url(#sl-bowl)">`;
  const liqC=r.jam?"#F6DCE3":mix(DRINK,FROST,Math.min(1,phi/.6));o+=`<rect x="${ix}" y="${Y(LEV)}" width="${iw}" height="${(LEV-18)*C}" fill="${liqC}" opacity="${(.55+.4*Math.min(1,phi/.6)).toFixed(2)}"/>`;
  const rot=s.augRot||0,AY=a=>Y(AX+4.2*Math.sin(a)),th=z=>ATURN*2*Math.PI*(z-AZ0)/(AZ1-AZ0)+rot;
  const helix=front=>{let d="",on=false;for(let z=AZ0;z<=AZ1+1e-6;z+=.25){const a=th(z),vis=Math.cos(a)>0===front;if(vis){d+=(on?"L":"M")+f(X(z))+","+f(AY(a));on=true}else on=false}return d};
  o+=`<path d="${helix(false)}" fill="none" stroke="#8FCDB4" stroke-width="3" opacity=".6"/>`;
  const dl=r.shell/200;if(dl>.02)o+=`<rect x="${X(-11-dl)}" y="${Y(AX+2.6+dl)}" width="${(20.6+2*dl)*C}" height="${(5.2+2*dl)*C}" rx="${(2.6+dl)*C}" fill="#F4FAFF" stroke="#BFD8EE" opacity=".9"/>`;
  o+=`<rect x="${X(-11)}" y="${Y(AX+2.6)}" width="${20.6*C}" height="${5.2*C}" rx="${2.6*C}" fill="${r.T<5&&run?"#DCE9F4":P.steel}" stroke="${P.steelDark}"/>`;
  if(dl>.02)o+=`<rect x="${X(-11-dl)}" y="${Y(AX+2.6+dl)}" width="${(20.6+2*dl)*C}" height="${(5.2+2*dl)*C}" rx="${(2.6+dl)*C}" fill="#F4FAFF" fill-opacity=".55" stroke="#BFD8EE"/>`;
  o+=`<path d="${helix(true)}" fill="none" stroke="#7FC4A8" stroke-width="3.4"/>`;
  const nC=Math.round(Math.min(1,r.sus/M/.55)*80),cs=1.4+3.6*r.size;
  for(let i=0;i<nC;i++){const z=-11+25*((i*.618)%1),a=i*2.39+(aug?t*.8:0),rr=3.1+1.9*((i*.37)%1);let y=AX+rr*Math.sin(a);if(!aug)y=Math.min(LEV-.4,y+3);if(y>LEV-.3)y=LEV-.3-((i*.13)%.6);
    o+=`<circle cx="${f(X(z))}" cy="${f(Y(y))}" r="${f(cs)}" fill="#FFFFFF" stroke="#C9DBEC" stroke-width=".8"/>`}
  o+=`</g>`;
  o+=`<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="${5.6*C}" fill="#EEF6FF" fill-opacity=".16" stroke="#7E9CBD" stroke-width="1.6"/><path d="M${X(-7)},${Y(28.6)} H${X(6)}" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>`;
  [-6.5,9.5].forEach(z=>o+=`<rect x="${X(z)-2}" y="${by-1}" width="4" height="${bh+2}" rx="2" fill="${P.steel}" stroke="${P.steelDark}" stroke-width=".8"/>`);
  o+=`<rect x="${X(-.8)}" y="${Y(30.3)}" width="${5.6*C}" height="${1.1*C}" rx="3" fill="#F3B8C8" stroke="#C98798"/>`;
  // probe, tap and handle
  o+=`<path d="M${X(12)},${Y(31)} V${Y(21)}" stroke="${P.steelDark}" stroke-width="3" stroke-linecap="round"/><rect x="${X(11.4)}" y="${Y(33.4)}" width="${1.2*C}" height="${2.4*C}" rx="3" fill="#3C4557"/>`;
  o+=`<rect x="${X(11.1)}" y="${Y(19.8)}" width="${3*C}" height="${3*C}" rx="4" fill="#FFFFFF" stroke="#C9CDD6"/><rect x="${X(12.1)}" y="${Y(16.8)}" width="${1.2*C}" height="${2.3*C}" fill="${P.steel}" stroke="${P.steelDark}"/>`;
  o+=`<path d="M${X(13.6)},${Y(19.4)} L${X(17.4)},${Y(23.4)}" stroke="#E79AAE" stroke-width="5" stroke-linecap="round"/><circle cx="${X(17.6)}" cy="${Y(23.6)}" r="5" fill="#fff" stroke="#C98798"/>`;
  // warm air out of the back vents
  if(run)for(let i=0;i<5;i++){const u=((t*.6+i/5)%1);o+=`<circle cx="${f(X(-15.5)-u*42)}" cy="${f(Y(5+i*1.8)-u*14)}" r="${f(5+u*8)}" fill="${WARMC}" opacity="${(.5*(1-u)).toFixed(2)}"/>`}
  // the particle window, looking at the ice front on the drum
  const lens=k==="bonds"||k==="sugar"||k==="test";
  if(lens){o+=`<path d="M462,108 L${X(2)},${Y(AX)} M462,196 L${X(2)},${Y(AX)}" stroke="${SKYD}" stroke-width="1" stroke-dasharray="3 4" opacity=".5"/>`;o+=lwSVG(538,152,86,SKYD);o+=`<text class="t-lab" x="538" y="52" text-anchor="middle">PARTICLE WINDOW</text>`}
  // labels
  const pill=(x,y,a,b,ax,ay,anchor)=>o+=F.pill(x,y,a,{sub:b,ax,ay,anchor});
  if(k==="machine"){pill(12,232,"Compressor","squeezes the gas: it gets hot",X(-8),Y(9),"start");pill(12,150,"Condenser + fan","heat out the back",X(-13),Y(11),"start");
    pill(420,268,"Expansion valve","pressure drops: very cold",X(5),Y(6.5),"start");pill(410,78,"Evaporator drum","takes heat from the drink",X(-4),Y(AX),"start");pill(420,140,"Auger","scrapes ice off the drum",X(4),Y(AX+4),"start");pill(430,206,"Tap + drip tray","pull to pour",X(13),Y(17),"start")}
  else if(!lens){pill(430,96,"Drink",`${fmtT(r.T)} · ${Math.round(phi*100)}% ice`,X(4),Y(LEV-1),"start");pill(430,160,k==="energy"?"Heat out the back":"Heat from the drink",k==="energy"?`${Math.round(pw.back)} W`:`${Math.round(pw.qc)} W`,k==="energy"?X(-15.5):X(-4),k==="energy"?Y(8):Y(AX),"start");
    if(k==="auger")pill(430,220,"Ice on the drum",`${Math.round(r.shell)} g`,X(-2),Y(AX-2.6),"start");if(k==="energy")pill(12,232,"Electricity in",`${Math.round(pw.pin)} W`,X(-17),Y(1.5),"start")}
  o+=`<text class="t-ink" x="${lens?452:628}" y="24" text-anchor="${lens?"end":"end"}">${esc(fmtT(r.T))} · ${Math.round(phi*100)}% ice · ${esc(stateNow(r))}</text>`;
  return o}
function drawClose(x,st){
  const extra=document.getElementById?.("slushie-extra-chart"),kind=st.k==="curve"?"split":st.k==="test"?"sankey":null;
  if(extra){extra.hidden=!kind;if(kind){const r=s.run,pw=powers(r),key=[kind,r.id,s.comp,s.vents,Math.round(r.T*10),Math.round(r.mi),Math.round(pw.qc),pw.pin].join("|");if(extra.dataset.key!==key){extra.dataset.key=key;const pen=svgPen();PANEL[kind](pen,st);extra.innerHTML='<p>'+ (kind==="split"?"Second screen · cooling and freezing":"Energy flow · the same run")+'</p><svg viewBox="0 0 420 260" role="img" aria-label="'+(kind==="split"?"Energy removed by cooling and freezing":"Current energy flow")+'">'+pen.out()+'</svg>'}}}
  const p=svgPen();PANEL[CLOSE[st.k]||"curve"](p,st);return p.out()}

// ================================================================ the 3D bench
let has3D=false,MG=null;
// Async asset loading never owns or restores lesson state. A late success reads the current topic/run.
function slushie3d(S){
  let world=null,failed=false;const host=S.canvas.parentElement,figure=host.parentElement;
  const status=()=>document.getElementById("slushie-load-status");
  host.style.visibility="hidden";figure.classList.remove("s3-on");figure.classList.add("slushie-loading");
  if(status())status().textContent="Loading live 3D · static Blender render shown";
  document.documentElement.dataset.slushieAsset="loading";
  const fail=e=>{if(failed)return;failed=true;has3D=false;host.style.display="none";host.setAttribute("aria-hidden","true");figure.classList.remove("s3-on","slushie-loading");document.getElementById("k-main").removeAttribute("aria-hidden");document.documentElement.dataset.slushieAsset="fallback";document.querySelector(".slushie-parts").hidden=true;if(status())status().textContent="3D unavailable · simplified live diagram, controls and charts remain available";S.api.redraw();console.warn("Slushie model unavailable",e)};
  import("./slushie-asset.js").then(async m=>{
    const asset=await m.loadSlushie(S);m.lightSlushie(S);world=slushieBench(S,asset);
    world.step(S.api.step);world.update(s,S.api.step,0,0);
    document.getElementById("k-main").setAttribute("aria-hidden","true");figure.classList.remove("slushie-loading");figure.classList.add("s3-on");host.style.visibility="visible";
    host.querySelector(".s3-ov").setAttribute("aria-hidden","true");
    document.getElementById("slushie-parts").disabled=false;
    document.documentElement.dataset.slushieAsset="ready";if(status())status().textContent="Live 3D · illustrative ice and heat flow · glass differs from the Blender render";
    host.querySelector(".s3-hint").textContent="Drag to turn · + / − to zoom · Home to reset";
  }).catch(fail);
  return {step(st){world?.step(st)},resize(w,h){world?.resize?.(w,h)},update(...args){if(world&&!failed)try{world.update(...args)}catch(e){fail(e)}}};
}

function slushieBench(S,asset){const {THREE,mat}=S,PAL=S.PAL,V3=(x,y,z)=>new THREE.Vector3(x,y,z),TOP=.3,tmp=V3(0,0,0);
  const steel=mat("metal",PAL.steel,{rough:.28}),white=mat("plastic","#FFFFFF",{rough:.4}),offW=mat("plastic","#F3F1EC",{rough:.45}),dark=mat("plastic","#3A4152",{rough:.5});
  // the bench: one sky plinth
  const bench=S.rbox(10,TOP,12,.14,mat("plastic","#e5ede6",{rough:.55,coat:.2}));bench.position.set(.4,TOP/2,.2);S.scene.add(bench);
  // the machine, at real size: 32 cm tall, 22 cm wide and 36 cm deep (with its drip tray)
  MG=asset;const mach=MG.g,PT=MG.parts;mach.position.set(0,TOP,0);S.scene.add(mach);
  const W=(x,y,z)=>mach.localToWorld(V3(x*CM,y*CM,z*CM));mach.updateMatrixWorld(true);
  // warm air leaving the back, and the power cord to a wall plug at the back of the bench
  const warm=S.puffs(36,"#F6B384");S.scene.add(warm);const WP=Array.from({length:36},()=>({life:0,x:0,y:0,z:0}));
  const cordPts=[W(9.6,.6,-19.6),V3(2.6,TOP+.06,-5.6),V3(4.2,TOP+.06,-6.1),V3(5.4,TOP+.25,-6.3)];S.scene.add(S.tube(cordPts,.09,dark,{seg:40}));
  const plug=S.rbox(.9,.55,.5,.1,white);plug.position.set(5.85,TOP+.28,-6.3);S.scene.add(plug);
  const cordCurve=new THREE.CatmullRomCurve3(cordPts),zap=S.puffs(10,"#B9A5EA");S.scene.add(zap);
  // ---- the lab clock on its stand, wired to the probe
  const clk=S.group();clk.position.set(-6.4,TOP,1.8);clk.rotation.y=.5;
  clk.add(S.rbox(1.3,.12,1.0,.05,offW,{at:[0,.06,0]}));clk.add(S.cyl(.06,.06,1.05,steel,{at:[0,.6,-.05],seg:12}));
  clk.add(S.cyl(1.22,1.22,.16,white,{rot:[Math.PI/2,0,0],at:[0,2.25,-.1],seg:48}));const clockP=S.panel(420,420,2.3);clockP.position.set(0,2.25,.0);clk.add(clockP);
  clk.updateMatrixWorld(true);
  const probeWire=S.tube([W(1.5,33.4,12),W(1.5,36,12.6),V3(-1.8,TOP+2.8,4.4),V3(-4.8,TOP+.9,3.2),clk.localToWorld(V3(.3,1.2,-.2))],.05,dark,{seg:60});S.scene.add(probeWire);
  // ---- two screens: the cooling curve, and a second screen that follows the step
  const screen=(x,z,w,ry,y0)=>{const gg=S.group();gg.position.set(x,TOP,z);gg.rotation.y=ry;const hU=w*260/420,cy=y0+hU/2;
    for(const sx of [-w/2+.4,w/2-.4]){gg.add(S.cyl(.06,.06,cy,steel,{at:[sx,cy/2,-.12],seg:12}));gg.add(S.rbox(.7,.08,.7,.04,offW,{at:[sx,.04,-.12]}))}
    gg.add(S.rbox(w+.3,hU+.3,.12,.08,white,{at:[0,cy,-.08]}));const pn=S.panel(1000,620,w);pn.position.set(0,cy,0);gg.add(pn);return {g:gg,pn,key:"",t:0}};
  const SA=screen(-10.0,-3.0,6.2,.42,3.0),SB=screen(10.4,-3.6,6.2,-.42,3.0);
  // ---- the particle window: a magnifier on an arm, looking at the ice front on the drum
  const LS=1.05,lens=S.group();lens.position.set(6.6,4.5,5.0);lens.rotation.set(-.1,.15,0);
  lens.add(S.torus(LR*LS+.09,.1,mat("plastic",PAL.deep.sky,{rough:.35}),{ts:72}));
  lens.add(S.cyl(LR*LS+.05,LR*LS+.05,.06,mat("plastic","#FBF3F5",{rough:.7,coat:.1}),{rot:[Math.PI/2,0,0],at:[0,0,-.06],seg:64,cast:false}));
  lens.add(S.cyl(.3,.3,.26,mat("plastic",PAL.case.sky,{rough:.4}),{rot:[Math.PI/2,0,0],at:[0,0,-.22],seg:24}));
  {const sh=new THREE.Shape();const a0=Math.asin(YD/LR);sh.moveTo(Math.cos(a0)*LR*LS,YD*LS);sh.absarc(0,0,LR*LS,a0,Math.PI-a0,true);sh.lineTo(Math.cos(a0)*LR*LS,YD*LS);
    const dm=new THREE.Mesh(new THREE.ShapeGeometry(sh,32),mat("metal",PAL.steel,{rough:.3}));dm.position.z=-.02;lens.add(dm);
    const fr=S.box(2*Math.cos(a0)*LR*LS,.04,.02,mat("flat","#EAF4FC"),{cast:false});fr.position.set(0,YD*LS+.02,-.01);lens.add(fr)}
  const front=S.cyl(LR*LS+.05,LR*LS+.05,.02,mat("glass","#ffffff",{opacity:.07}),{rot:[Math.PI/2,0,0],at:[0,0,.22],seg:64,cast:false});front.renderOrder=9;lens.add(front);
  S.scene.add(lens);
  const lstand=S.group();lstand.position.set(7.0,TOP,4.6);lstand.add(S.rbox(1.0,.1,1.0,.04,offW,{at:[0,.05,0]}));lstand.add(S.cyl(.06,.06,2.4,steel,{at:[0,1.2,0],seg:14}));S.scene.add(lstand);
  const lensArm=S.tube([[7.0,TOP+2.4,4.6],[6.95,TOP+2.55,4.7],[6.7,4.5-LR*LS-.2,4.95],[6.62,4.5-LR*LS-.05,5.0]],.05,steel,{seg:24});S.scene.add(lensArm);
  const O=S.swarm(170,new THREE.SphereGeometry(RO*LS,10,8),mat("plastic","#ffffff",{rough:.35}),{colors:true});lens.add(O);
  const Hs=S.swarm(340,new THREE.SphereGeometry(.036*LS,7,5),mat("plastic","#ffffff",{rough:.35}),{});lens.add(Hs);
  const ring6=S.swarm(24,new THREE.TorusGeometry(.085*LS,.024*LS,6,6),mat("plastic","#F49A5E",{rough:.4}),{});lens.add(ring6);
  const ring5=S.swarm(24,new THREE.TorusGeometry(.085*LS,.024*LS,6,5),mat("plastic","#F49A5E",{rough:.4}),{});lens.add(ring5);
  const hb=S.swarm(240,new THREE.CylinderGeometry(.012*LS,.012*LS,1,5),mat("flat",PAL.deep.sky,{opacity:.75,depthWrite:false}),{});lens.add(hb);
  const fx=S.puffs(30,"#F6A27E");lens.add(fx);const fxm=S.puffs(20,"#8FC3F0");lens.add(fxm);const heatP=S.puffs(30,"#F09872");lens.add(heatP);
  const lensRays=S.group();
  {lens.updateMatrixWorld(true);const tgt=W(2.4,AX,1),lm=mat("flat",PAL.deep.sky,{opacity:.26,depthWrite:false});
    [[0,1],[0,-1],[1,0],[-1,0]].forEach(([a,b])=>{const p0=lens.localToWorld(V3(a*(LR*LS+.1),b*(LR*LS+.1),0));const m=S.tube([[p0.x,p0.y,p0.z],[tgt.x,tgt.y,tgt.z]],.012,lm,{seg:2,cast:false});m.renderOrder=4;lensRays.add(m)})}
  // ---- picks: tap a part to name it
  const PARTS={comp:["Compressor","squeezes the refrigerant gas, so it gets hot"],cond:["Condenser","hot gas gives its heat to the air and turns to liquid"],fan:["Fan","pulls room air through the condenser, out the back"],
    valve:["Expansion valve","a narrow gap: the pressure drops and the refrigerant gets very cold"],drum:["Evaporator drum","refrigerant boils inside, taking heat from the drink"],aug:["Auger","turns round the drum, scraping off ice as it forms"],
    tap:["Tap and drip tray","outlet for the drink; dispensing is not simulated"],probe:["Thermometer probe","feeds the cooling curve"],motor:["Auger motor","turns the auger through the back wall"]};
  [["comp",PT.comp],["cond",PT.cond],["fan",PT.fan],["valve",PT.valve],["drum",PT.drum],["aug",PT.aug],["tap",PT.tap],["tap",PT.handle],["probe",PT.probe],["motor",PT.motor]].forEach(([k,o])=>{if(o)S.pick(o,()=>choosePart(k))});
  const picker=document.getElementById("slushie-parts"),explanation=document.getElementById("slushie-part-description");
  if(picker){for(const [key,[name]] of Object.entries(PARTS)){const option=document.createElement("option");option.value=key;option.textContent=name;picker.append(option)}picker.onchange=()=>{choosePart(picker.value);S.api.redraw()}}
  // ---- labels
  const LP={};const at={comp:[-5,13.4,-7],cond:[-8.6,13.8,-12.8],fan:[3.5,11.4,-10.2],valve:[6,8.6,5],drum:[0,AX+2.6,-6],aug:[0,AX+4.7,4],tap:[0,15,13],probe:[1.5,33.4,12],motor:[0,20.4,-15]};
  const off={comp:[-40,30],cond:[-40,-40],fan:[30,-50],valve:[40,36],drum:[-46,-56],aug:[40,-44],tap:[40,30],probe:[30,-36],motor:[-40,-30]};
  Object.keys(PARTS).forEach(k=>LP[k]=S.label({off:off[k]}));
  const lDrink=S.label({cls:"big",off:[44,-56]}),lBack=S.label({cls:"big",off:[-50,-40]}),lPow=S.label({off:[30,26]}),lLens=S.label({cls:"big",off:[30,-70]}),lShell=S.label({cls:"hot",off:[-40,50]}),lComp=S.label({off:[-40,40]});
  // Focus on the active mechanism. Charts and particles retain their own topic views.
  const frameViews=()=>{const w=S.canvas.clientWidth||700,h=S.canvas.clientHeight||560,f=Math.max(1,.8/(w/h));
    const views={machine:[[12,9,16],[0,4.1,.2]],curve:[[-13,9,19],[-4.3,4.5,0]],bonds:[[9,6.2,13.4],[6.2,4.5,4.6]],sugar:[[14,10,20],[4,4.6,0]],auger:[[6.8,8.6,10],[0,6.15,.35]],energy:[[13,8,-17],[0,3.8,-.5]],all:[[-13,10,22],[-3.8,4,0]]};
    for(const [name,[pos,target]] of Object.entries(views)){
      let position=pos.map((v,i)=>target[i]+(v-target[i])*f);
      if(name==="machine"||name==="energy"){
        const tg=V3(...target),direction=V3(...pos).sub(tg).normalize(),right=V3(0,0,0).crossVectors(direction,V3(0,1,0)).normalize(),up=V3(0,0,0).crossVectors(right,direction).normalize();
        const tan=Math.tan(THREE.MathUtils.degToRad(S.camera.fov/2)),bb=MG.assetBounds;let distance=0;
        for(const point of MG.framingPoints){const p=point.clone().add(V3(0,TOP,0)).sub(tg);distance=Math.max(distance,p.dot(direction)+1.08*Math.max(Math.abs(p.dot(up))/tan,Math.abs(p.dot(right))/(tan*w/h)))}
        position=tg.clone().addScaledVector(direction,distance).toArray();
      }
      S.view(name,position,target,{min:name==="auger"?4:6,max:50,dur:.6,arc:0});
    }
  };frameViews();
  const SHOW={machine:["comp","cond","fan","valve","drum","aug","tap","probe","motor"],curve:[lDrink,"probe"],bonds:[lLens,lDrink],sugar:[lDrink],auger:["aug",lShell,lDrink],energy:[lBack,lPow,"comp","cond","fan"],test:[lDrink,lBack,lComp]};
  S.goView("machine",true);S.setShadowBox(13,[0,0,-.5]);has3D=true;
  if(/[?&]debug\b/.test(location.search))try{window.__slushie=Object.assign(window.__slushie||{},{S,s,MG})}catch(e){}
  let currentView="machine",curShow=[],augRot=0,fanAngle=0,fanK=0,flowK=0,flowPh=0,augK=0,clockKey="",lastRun=s.run.id;
  const reviewing=new URLSearchParams(location.search).has("review");let frames=[],lastFrame=0,lastReport=0,medianFrameMs=0,p95FrameMs=0;
  const DI=Array.from({length:240},()=>({th:Math.random()*6.283,z:-4.7+Math.random()*12.4,sz:0,gr:.6+Math.random()*.8,pd:0}));
  const SI=Array.from({length:420},(x,i)=>({th:Math.random()*6.283,rho:3.1+Math.random()*1.8,z:-11+Math.random()*24.5,rnd:Math.random(),sp:(Math.random()-.5)*4}));
  function choosePart(key){s.part=key;Object.values(LP).concat([lDrink,lBack,lPow,lLens,lShell,lComp]).forEach(l=>l.hide());curShow=key&&LP[key]?[LP[key]]:[];curShow.forEach(l=>l.show())}
  const q=new THREE.Quaternion(),UP=V3(0,1,0),dir=V3(0,0,0),col=new THREE.Color();
  return {
    resize(){this.step(S.api.step);S.goView(currentView,true)},
    step(st){const link=document.getElementById("slushie-graphics-link");if(link)link.href="?lite#"+st.k;const k=st.k,narrow=S.canvas.clientWidth<1.35*S.canvas.clientHeight,v=narrow&&["curve","sugar","test"].includes(k)?"machine":k==="test"?"all":k;currentView=v;frameViews();S.goView(v);
      S.setShadowBox(v==="all"?14:9,v==="all"?[0,0,-.5]:[0,0,0]);if(k!=="machine")s.part="";MG.rig.setView({cutaway:k==="machine"||k==="energy"||k==="test",mechanism:k==="auger",showCup:false});SA.g.visible=!narrow&&(k==="curve"||k==="test");SB.g.visible=!narrow&&k==="sugar";lens.visible=k==="bonds";clk.visible=!narrow&&(k==="curve"||k==="test");probeWire.visible=false;lstand.visible=lensArm.visible=lensRays.visible=lens.visible;
      curShow=(SHOW[k]||[]).map(x=>typeof x==="string"?LP[x]:x).slice(0,narrow?1:3);Object.values(LP).concat([lDrink,lBack,lPow,lLens,lShell,lComp]).forEach(l=>l.hide());curShow.forEach(l=>l.show())},
    update(x,st,dt,t){const r=s.run,k=st.k,pw=powers(r),run=pw.run,aug=augerOn(r),phi=r.mi/M,red=S.REDUCED,elapsedDt=dt;
      if(reviewing){const now=performance.now();if(lastFrame&&now-lastFrame<250)frames.push(now-lastFrame);lastFrame=now;if(now-lastReport>500){lastReport=now;frames=frames.slice(-180);const sorted=[...frames].sort((a,b)=>a-b);medianFrameMs=sorted[Math.floor(sorted.length/2)]||0;p95FrameMs=sorted[Math.floor(sorted.length*.95)]||0}}
      if(lastRun!==r.id){lastRun=r.id;augRot=fanAngle=flowPh=0;fanK=augK=flowK=0;DI.forEach(c=>{c.sz=0;c.pd=0})}
      if(!s.playing||red)dt=0;
      lwTick(dt*(red?.5:1));
      // motors: fan and refrigerant run with the compressor; the auger with its own motor
      fanK=run?S.lerp(fanK,1,.06):0;augK=aug?S.lerp(augK,1,.08):0;flowK=run?S.lerp(flowK,1,.04):0;
      fanAngle-=dt*fanK*16;augRot+=dt*augK*Math.PI;s.augRot=augRot;
      flowPh+=dt*flowK/14;s.flowPh=flowPh;
      for(let i=0;i<170;i++){const p=loopAt(i/170+flowPh),v=MG.flowPoint(p);if(p.a.hide||!v){PT.refr.put(i,0,-99,0,.0001);continue}PT.refr.put(i,v.x,v.y,v.z,p.a.sz*CM*.65);col.set(p.a.col);PT.refr.setColorAt(i,col)}PT.refr.done();
      MG.setHeat(pw.qc,pw.back,k==="machine"||k==="energy");
      const cold=S.clamp((6-r.T)/10,0,1)*(s.comp?1:.5),dl=r.shell/200;
      MG.rig.setVisualState({augerAngle:augRot,fanAngle,ventBlocked:!s.vents,shellVisible:dl>.01,
        shellRadialScale:(2.6+dl)/2.6,shellAxialScale:1+dl/11.6,
        drinkColor:mix("#f2b6a9",FROST,r.jam?1:Math.min(1,phi/.6)),drinkOpacity:r.jam?.8:.24+.36*Math.min(1,phi/.6),
        drumColor:mix(PAL.steel,"#EAF4FC",cold),statusColor:r.jam?"#F07A8E":run?"#7FE3B5":"#B9B8C4"});
      // ice crystals on the drum: grow while ice forms, flicked off when the auger's blade passes
      const forming=run&&(r.mi>.5||r.T<tfOf(r.w)+.4),tb=ATURN*2*Math.PI/(AZ1-AZ0);
      for(let i=0;i<240;i++){const c=DI[i];const bth=augRot+(c.z+6.8)*(ATURN*2*Math.PI/16.5),d=Math.atan2(Math.sin(bth-c.th),Math.cos(bth-c.th));
        if(aug&&c.pd<0&&d>=0&&d<1)c.sz=0;c.pd=d;
        c.sz=forming?Math.min(aug?1:1.6,c.sz+dt*c.gr*(aug?1.2:.45)):Math.max(0,c.sz-dt*.4);
        const rr=Math.min(2.66*(1+dl/2.6),4.9),sc=c.sz*(.34+(aug?0:.18))*CM;if(sc<.002||c.z>AZ1){PT.drumIce.put(i,0,-99,0,.0001);continue}
        dir.set(Math.cos(c.th),Math.sin(c.th),0);q.setFromUnitVectors(UP,dir);PT.drumIce.putS(i,rr*Math.cos(c.th)*CM,(AX+rr*Math.sin(c.th))*CM,c.z*CM,sc,sc*1.2,sc,q)}PT.drumIce.done();
      // crystals spread through the drink: swirled by the auger, or floating up when it stops
      const nS=Math.round(Math.min(1,(r.sus/M)/.55)*420)+(r.jam?60:0),cs=(.2+.55*r.size)*CM;
      for(let i=0;i<420;i++){const c=SI[i];if(i>=nS){PT.susIce.put(i,0,-99,0,.0001);continue}
        if(aug){c.th+=dt*augK*(.9+.6*c.rnd);c.z+=dt*augK*.6*(c.rnd-.4);if(c.z>13)c.z=-11;if(c.z<-11.5)c.z=12.5}
        else{const top=Math.PI/2+(c.rnd-.5)*1.6;c.th+=(top-c.th)*Math.min(1,dt*.8);c.rho+=(4.6-c.rho)*Math.min(1,dt*.5)}
        const lim=c.z>9.5?Math.sqrt(Math.max(0,27.5-(c.z-9.5)**2)):c.z<-6.5?Math.sqrt(Math.max(0,27.5-(c.z+6.5)**2)):5.25;const rho=Math.min(c.rho,lim-.45);
        if(rho<3.0){PT.susIce.put(i,0,-99,0,.0001);continue}let y=AX+rho*Math.sin(c.th);const xx=rho*Math.cos(c.th);if(y>LEV-.25)y=LEV-.25-c.rnd*.5;
        MG.putCrystal(i,xx*CM,y*CM,c.z*CM,cs*(.7+.6*c.rnd)*(r.jam?1.6:1),c.th+c.sp*t*.1,c.rnd*6,c.sp)}PT.susIce.done();
      // warm air out of the back, sized by the heat the back gives out
      WP.forEach((c,i)=>{if(c.life<=0&&run&&Math.random()<dt*pw.back/90){const p=W((Math.random()-.5)*14,3+Math.random()*10,-15.6);c.life=1;c.x=p.x;c.y=p.y;c.z=p.z}
        if(c.life>0){c.life-=dt*.55;c.z-=dt*.9;c.y+=dt*.45}warm.put(i,c.x,c.y,c.z,Math.max(0,Math.sin(c.life*Math.PI))*.4,220)});warm.done();
      for(let i=0;i<10;i++){const u=((t*.35+i/10)%1),p=cordCurve.getPointAt(1-u);zap.put(i,p.x,p.y+.05,p.z,pw.pin>0?.75*Math.sin(u*Math.PI):0,40)}zap.done();
      if(reviewing)S.canvas.dataset.review=JSON.stringify({status:"ready",medianFrameMs,p95FrameMs,topic:k,unitsPerMetre:25,runId:r.id,curveKey:SA.key,temperatureC:r.T,iceMassG:r.mi,shellMassG:r.shell,augerOn:aug,compressorOn:run,ventsClear:s.vents,jammed:r.jam,playing:s.playing,augerAngle:augRot,fanAngle,drinkOpacity:MG.rig.nodes.DRINK_VOLUME.children.find(o=>o.isMesh)?.material.opacity,cutaway:!MG.rig.nodes.SERVICE_PANEL.visible,mechanism:!MG.rig.nodes.DRINK_VOLUME.visible,calls:S.renderer.info.render.calls,triangles:S.renderer.info.render.triangles,pixelRatio:S.renderer.getPixelRatio(),camera:S.camera.position.toArray(),target:S.controls.target.toArray(),bounds:[MG.assetBounds.min.toArray(),MG.assetBounds.max.toArray()]});
      // ---- the particle window
      const isK=k==="bonds"||k==="sugar"||k==="test"||k==="all";let n=0,nh=0,nb=0,n6=0,n5=0;
      for(const m of LW.mols){const a=Math.max(0,Math.min(1,m.a));if(a<=.02||n>=170)continue;const jx=m.st==="ice"?Math.sin(t*13+m.rnd*40)*.008:0,jy=m.st==="ice"?Math.cos(t*11+m.rnd*30)*.008:0;
        O.put(n,(m.x+jx)*LS,(m.y+jy)*LS,.04,a);O.tint(n,m.st==="liq"?"#9CC4F2":"#3466B8");n++;
        for(const h of hAtoms(m)){if(nh>=340)break;Hs.put(nh++,(m.x+jx+h[0]*.075)*LS,(m.y+jy+h[1]*.075)*LS,.07,a)}}
      for(let i=n;i<170;i++)O.put(i,0,0,-9,.0001);for(let i=nh;i<340;i++)Hs.put(i,0,0,-9,.0001);O.done();Hs.done();
      const bonds=iceBonds().concat(liquidBonds(36));for(const [a,b] of bonds){if(nb>=240)break;const dx=b.x-a.x,dy=b.y-a.y,L=Math.hypot(dx,dy);if(L<1e-4)continue;dir.set(dx/L,dy/L,0);q.setFromUnitVectors(UP,dir);
        const th=a.st==="ice"?1.7:.7;hb.putS(nb++,(a.x+dx/2)*LS,(a.y+dy/2)*LS,.02,th,L*LS*(a.st==="ice"?.78:.6),th,q)}for(let i=nb;i<240;i++)hb.put(i,0,0,-9,.0001);hb.done();
      for(const g2 of LW.sug){const a=Math.max(0,Math.min(1,g2.a));if(a<=.02)continue;const cx=Math.cos(g2.th),sy=Math.sin(g2.th);
        if(n6<24)ring6.put(n6++,(g2.x-cx*.085)*LS,(g2.y-sy*.085)*LS,.05,a,0,0,g2.th);if(n5<24)ring5.put(n5++,(g2.x+cx*.09)*LS,(g2.y+sy*.09)*LS,.05,a,0,0,g2.th)}
      for(let i=n6;i<24;i++)ring6.put(i,0,0,-9,.0001);for(let i=n5;i<24;i++)ring5.put(i,0,0,-9,.0001);ring6.done();ring5.done();
      let nf=0,nm=0;for(const f2 of LW.fx){const u=(LW.t-f2.t)/.6;if(f2.exo&&nf<30)fx.put(nf++,f2.x*LS,f2.y*LS,.12,.9*(1-u),90+u*260);else if(!f2.exo&&nm<20)fxm.put(nm++,f2.x*LS,f2.y*LS,.12,.9*(1-u),90+u*260)}
      for(let i=nf;i<30;i++)fx.put(i,0,0,-9,0,1);for(let i=nm;i<20;i++)fxm.put(i,0,0,-9,0,1);fx.done();fxm.done();
      let nhp=0;for(const h of LW.heat){const u=(LW.t-h.t)/.9;if(nhp<30)heatP.put(nhp++,h.x*LS,(h.y+(YD-.12-h.y)*u)*LS,.12,.9*(1-u),70)}for(let i=nhp;i<30;i++)heatP.put(i,0,0,-9,0,1);heatP.done();
      // ---- screens (redrawn only when something changed)
      const kA=[k,r.id,r.pts.length,r.started,s.ghost&&s.ghost.id,r.tIce!=null].join("|");SA.t-=elapsedDt;
      if(kA!==SA.key&&SA.t<=0){SA.key=kA;SA.t=.2;SA.pn.redraw((g2,w,h)=>drawCurve(canvasPen(g2,w/420),st))}
      const kind=SCREEN_B[k]||"sankey",kB=[kind,k,r.id,Math.round(pw.qc),pw.pin,Math.round(r.mi),Math.round(r.shell),s.auger,r.jam,Math.round(r.dmi*100),s.comp,s.vents].join("|");SB.t-=elapsedDt;
      if(kB!==SB.key&&SB.t<=0){SB.key=kB;SB.t=.25;SB.pn.redraw((g2,w,h)=>PANEL[kind](canvasPen(g2,w/420),st))}
      const ck=[Math.floor(r.t/5),fmtT(r.T),Math.round(eTotal(r)/1000)].join("|");if(ck!==clockKey){clockKey=ck;clockP.redraw((g2,w,h)=>drawClock(g2,w,h,r))}
      if(picker&&picker.value!==s.part)picker.value=s.part;
      if(explanation)explanation.textContent=PARTS[s.part]?PARTS[s.part].join(" — "):"Choose a part, or tap one in the model.";
      // ---- labels
      for(const kk in LP){const L=LP[kk];if(!curShow.includes(L))continue;const a=at[kk];L.at(MG.hotspots[kk]?MG.hotspots[kk].getWorldPosition(tmp):W(a[0],a[1],a[2])).set(s.part===kk?`${PARTS[kk][0]}<small>${PARTS[kk][1]}</small>`:PARTS[kk][0]).cls(s.part===kk?"hot":"")}
      lDrink.at(W(-3.5,LEV,4)).set(`Drink<b>${fmtT(r.T)} · ${Math.round(phi*100)}% ice</b><small>${stateNow(r)}</small>`);
      lBack.at(W(0,9,-15.8)).set(`Heat out the back<b>${Math.round(pw.back)} W</b><small>${run?"heat from the drink + compressor and fan":s.comp?"compressor resting":"cooling switched off"}</small>`);
      lPow.at(V3(5.85,TOP+.6,-6.3)).set(`Electricity in<b>${Math.round(pw.pin)} W</b>`);
      lComp.at(W(-5,13.4,-7)).set(`Compressor<b>${!s.comp?"off":run?"running":"resting"}</b>`);
      lLens.at(lens.localToWorld(tmp.set(-.4,LR*LS+.15,0))).set(`Particle window<b>${LW.fill?Math.round(frozenFrac(r)*100)+"% of the water is ice":"all liquid"}</b><small>${r.dmi>.005?"molecules locking in: energy given out":r.dmi<-.005?"ice melting: energy taken in":"blue: water · orange rings: sugar"}</small>`);
      lShell.at(W(-2.4,AX-2.8,-4)).set(`Ice on the drum<b>${Math.round(r.shell)} g</b><small>${aug?"auger scraping it off":"nothing scrapes it off"}</small>`)}};
}
// ---- the lab clock: time on a dial, with the probe reading and the energy taken out so far
function drawClock(g,w,h,r){const cx=w/2,cy=h/2,R=w*.46;g.clearRect(0,0,w,h);g.fillStyle="#FFFFFF";g.beginPath();g.arc(cx,cy,R,0,6.283);g.fill();g.strokeStyle="#DCD6EA";g.lineWidth=6;g.stroke();
  for(let i=0;i<60;i++){const a=-Math.PI/2+i/60*6.283,l=i%5?10:20;g.strokeStyle=i%5?"#C9C3D8":"#4E4868";g.lineWidth=i%5?2:4;g.beginPath();g.moveTo(cx+Math.cos(a)*(R-14),cy+Math.sin(a)*(R-14));g.lineTo(cx+Math.cos(a)*(R-14-l),cy+Math.sin(a)*(R-14-l));g.stroke()}
  const a=-Math.PI/2+(r.t%3600)/3600*6.283;g.strokeStyle="#3A6FB8";g.lineWidth=8;g.lineCap="round";g.beginPath();g.moveTo(cx,cy);g.lineTo(cx+Math.cos(a)*(R-46),cy+Math.sin(a)*(R-46));g.stroke();
  g.fillStyle="#3A6FB8";g.beginPath();g.arc(cx,cy,10,0,6.283);g.fill();
  g.textAlign="center";g.fillStyle="#6E6A86";g.font="600 22px Instrument Sans, system-ui";g.fillText("LAB CLOCK",cx,cy-R*.52);
  g.fillStyle="#222A55";g.font="600 58px Instrument Sans, system-ui";g.fillText(fmtT(r.T),cx,cy+R*.36);
  g.font="500 26px IBM Plex Mono, ui-monospace, monospace";g.fillStyle="#4E4868";g.fillText(`${Math.floor(r.t/60)}:${String(Math.floor(r.t%60)).padStart(2,"0")}`,cx,cy-R*.24);
  g.font="600 21px Instrument Sans, system-ui";g.fillStyle="#6E6A86";g.fillText(`energy out ${fmtK(eTotal(r))}`,cx,cy+R*.6)}

// ================================================================ steps
const SP=60;
const std=o=>{Object.assign(s,{w:20,auger:true,comp:true,vents:true},o||{});newRun()};
const primeToIce=more=>{const r=s.run;let n=0;while(r.mi<(more||1)&&!r.capped&&n++<6000)integrate(r,1,true)};
const steps=[
 {k:"machine",lab:"The machine",cap:"A countertop slushie machine, cut open. Electricity drives a compressor that pumps refrigerant round a sealed loop. In the steel drum inside the bowl, the refrigerant takes heat from the drink. At the back, the condenser and fan give that heat to the room. Tap a part to name it.",speed:SP,speedLabel:"60× real time",controls:["play","fresh"],
  big:"<b>The big idea:</b> a slushie machine doesn't add cold. It moves heat. The refrigerant soaks up heat from the drink at the cold drum, the compressor pushes it round to the warm condenser at the back, and the fan blows that heat into the room. Electrical energy keeps the loop going.",
  exam:"The refrigerant evaporates inside the drum, absorbing heat from the drink, so the drink cools. The compressor squeezes the gas, which raises its temperature. In the condenser the refrigerant condenses and releases heat to the room. The machine transfers heat from the cold drink to the warmer room, using electrical energy to do it.",
  trap:"Saying the machine puts 'cold' into the drink. Cold isn't something that moves: heat moves out of the drink and into the refrigerant.",
  chips:["pin","qc","qout","temp"],onStep:()=>{std();s.playing=true}},
 {k:"curve",lab:"Cooling curve",cap:"Pure water this time (0% sugar). Press Play and watch the probe. The temperature falls, then stays flat at 0 °C while ice forms, even though the machine keeps taking heat out. The second screen splits the energy into cooling and freezing.",speed:SP,speedLabel:"60× real time",controls:["play","fresh","skip","w"],
  big:"<b>The big idea:</b> on a cooling curve, a sloping line means the particles are slowing down, so the temperature falls. The flat part is the change of state. The energy removed there comes from attractions forming as the water freezes, not from the particles slowing, so the temperature stays the same.",
  exam:"While the water freezes, its temperature stays at 0 °C. Heat is still being removed, but this energy is released as attractions (intermolecular forces) form between the water molecules as they join the solid, so the particles don't slow down and the temperature stays the same. Energy for a temperature change is E = mcΔT; energy for a change of state is E = mL, with L = 334 J g⁻¹ for water.",
  trap:"Thinking the machine has stopped working on the flat part. It is taking heat out just as fast; that energy is released as the ice forms.",
  chips:["temp","time","ice","ecool","efrz"],onStep:()=>{std({w:0});s.playing=true}},
 {k:"bonds",lab:"Particles and bonds",cap:"Look through the particle window at the ice front on the drum. Water molecules in the liquid tumble past each other. As heat is taken away, some lock into the ice lattice, and each one gives out a little energy (the orange flash). Switch the cooling off and watch the ice melt.",speed:SP,speedLabel:"60× real time",controls:["play","fresh","comp"],
  big:"<b>The big idea:</b> freezing forms attractions between water molecules, so it is exothermic: energy is released, and the machine carries it away. Melting breaks those attractions, so it is endothermic: energy has to be taken in from the surroundings. In water these attractions are hydrogen bonds. For AS91164 you can call them intermolecular forces; you don't have to name the type.",
  exam:"When water freezes, attractions (intermolecular forces) form between the molecules as they settle into a fixed lattice, and energy is released to the surroundings, so freezing is exothermic. Melting is endothermic, because energy must be absorbed to break the attractions between the molecules. In ice these attractions are hydrogen bonds, which hold the molecules in an open lattice, so ice is less dense than liquid water and floats.",
  trap:"Saying the covalent bonds inside each water molecule break when ice melts. Only the attractions between molecules break; every H₂O stays whole.",
  chips:["temp","ice","state","comp"],onStep:()=>{std();primeToIce(30);s.playing=true}},
 {k:"sugar",lab:"Why sugar makes slush",cap:"Sugar gets in the way. Its molecules make it harder for water to join the ice, so a sugary drink starts to freeze below 0 °C. As ice forms, the syrup left behind gets more concentrated and freezes at an even lower temperature. Change the sugar and see what the machine makes at −3 °C.",speed:SP,speedLabel:"60× real time",controls:["play","fresh","skip","w"],
  big:"<b>The big idea:</b> pure water freezes solid at one temperature. Syrup doesn't: as it freezes, the sugar is left in less and less water, so its freezing point keeps dropping. At the machine's −3 °C the drink settles as ice crystals in syrup: slush. Too little sugar and it sets hard; too much and it barely freezes.",
  exam:"Dissolved sugar lowers the freezing point of water, so the drink starts to freeze below 0 °C. Only the water freezes, so as ice forms the remaining solution becomes more concentrated and its freezing point falls further. At a fixed temperature, freezing stops when the syrup's freezing point reaches that temperature, leaving a mixture of ice crystals and syrup.",
  trap:"Saying the sugar freezes too. The ice crystals are pure water; the sugar stays in the syrup between them.",
  chips:["sugar","fp","syrup","fpnow","ice","state"],onStep:()=>{std();s.playing=true}},
 {k:"auger",lab:"The auger",cap:"The auger turns round the cold drum and scrapes ice off as soon as it forms, so the crystals stay tiny and the slush stays smooth. Stop the auger and watch: ice builds up on the drum, the crystals grow big, and less heat comes out of the drink.",speed:SP,speedLabel:"60× real time",controls:["play","fresh","skip","auger"],
  big:"<b>The big idea:</b> the drum is the coldest place, so ice forms there first. Scraping it off often makes lots of small crystals spread through the syrup. Without scraping, ice coats the drum. Ice conducts heat poorly, so the layer slows the cooling, and the crystals that form grow large. How fast is the model's own.",
  exam:"Scraping and stirring remove ice from the cold surface as it forms, so many small crystals form instead of a few large ones, which gives a smooth texture. If ice is left to build up on the drum it insulates it, so heat is removed from the drink more slowly.",
  trap:"Thinking the auger makes the drink colder. Stirring actually adds a little heat; it helps by keeping the cold drum clear and the crystals small.",
  chips:["auger","crystals","qc","shell","state"],onStep:()=>{std();primeToIce(60);s.playing=true}},
 {k:"energy",lab:"Energy and efficiency",cap:"Follow the energy. Electrical energy comes in at the plug. Heat is taken out of the drink. Both leave the back of the machine as heat. Block the back vents and the condenser can't get rid of its heat, so the cooling slows.",speed:SP,speedLabel:"60× real time",controls:["play","fresh","comp","vents"],
  big:"<b>The big idea:</b> energy is conserved. Heat out the back = heat taken from the drink + the electrical energy used by the compressor and fan. That's why the back is warm. No machine is 100% efficient: some electrical energy is wasted as heat and sound in the motors.",
  exam:"Energy is transferred and transformed, never used up. The motors transform electrical energy into kinetic energy, and the machine transfers heat from the drink to the room. The heat given out at the back equals the heat taken from the drink plus the electrical energy put in, so the back is warmer than the room. Percentage efficiency = useful energy out ÷ total energy in × 100.",
  trap:"Thinking the heat at the back comes only from the motor. Most of it is heat that was taken out of the drink.",
  chips:["pin","qc","qout","eff","comp"],onStep:()=>{std();s.playing=true}},
 {k:"test",lab:"Test yourself",cap:"Four challenges. Set up a drink, press Play (or Skip 5 min), then press Check. The machine marks you from the same model that runs the bench.",speed:SP,speedLabel:"60× real time",controls:["play","fresh","skip","w","auger","reading","ansE","ansW"],
  big:"<b>Exam tip:</b> for a change of state, say what happens to the particles (attractions form or break), whether energy is released or absorbed, and why the temperature stays steady. Give units for every energy.",
  chips:["temp","ice","sugar","state","comp","pcf","qc"],onStep:()=>{std();s.playing=false}}];
// ---- kupu Māori: te reo terms for this machine, each checked in Te Aka Māori Dictionary (ta = word id)
const KUPU=[
 {mi:"tio",en:"ice; freezing",ta:8127,chip:"ice",note:"Te Aka gives ice, freezing cold as its third sense and freezing as its second."},
 {mi:"whakatio",en:"to freeze",ta:12572,note:"Te Aka also lists whakatoka, to solidify."},
 {mi:"rewa",en:"to melt",ta:6746,note:"Also means to float, or to set off."},
 {mi:"tioata",en:"crystal",ta:40349,chip:"crystals"},
 {mi:"huka",en:"sugar, sucrose",ta:1547,chip:"sugar",note:"A loanword."},
 {mi:"rāpoi ngota",en:"molecule",ta:40165},
 {mi:"totoka",en:"solid; to become solid",ta:8538},
 {mi:"paemahana",en:"temperature",ta:39927,chip:"temp"},
 {mi:"pūngao",en:"energy",ta:40075},
 {mi:"wera",en:"heat",ta:9229,chip:"qout",note:"Also means hot, or to burn."}];
Object.entries({machine:["pūngao","wera"],curve:["paemahana","whakatio","pūngao"],bonds:["rāpoi ngota","totoka","rewa","tio"],sugar:["huka","whakatio","paemahana"],auger:["tioata","tio"],energy:["pūngao","wera"]}).forEach(([k,a])=>{const st=steps.find(x=>x.k===k);if(st)st.kupu=a});
// ---- challenges: marked from the model
const CH=[
 {q:"Find the least sugar that still makes slush. Run a drink until the machine holds it at −3 °C as slush (not too stiff, not jammed), using as little sugar as you can.",
  check:()=>{const r=s.run;return r.reached&&!r.jam&&s.auger&&r.shell<30&&outcome(phiSet(r.w))==="slush"&&r.w===MIN_SLUSH},
  ok:()=>`Yes: ${MIN_SLUSH}% sugar is the least that makes slush in this model. With less, more of the water freezes at −3 °C, so it gets too stiff (and below ${MIN_NOJAM}% it sets solid). Above about ${MAX_SLUSH}% it stays runny.`,
  no:()=>{const r=s.run,o=outcome(phiSet(r.w));if(!s.auger||r.shell>=30)return "Keep the auger turning: without it you get ice on the drum, not slush.";if(!r.reached&&!r.jam)return "Run the drink until the machine reaches −3 °C (Play, or Skip 5 min), then Check.";
    if(r.jam||o==="block")return `${r.w}% sugar sets solid and jams the auger. Add more sugar.`;if(o==="stiff")return `${r.w}% sugar is too stiff: too much of the water freezes. Add a little more sugar.`;
    if(o==="slush")return "That's slush. Can you make slush with less sugar? Try one step lower.";return `${r.w}% sugar stays runny at −3 °C. Use less sugar.`}},
 {q:"Run a drink with any sugar from 5% to 30% until ice starts to form. Read the temperature where its cooling curve flattens, and set <b>Your reading</b> to it.",
  check:()=>{const r=s.run;return r.w>=5&&r.w<=30&&r.tIce!=null&&Math.abs(s.reading-tfOf(r.w))<=.2},
  ok:()=>`Yes: a ${s.run.w}% drink starts to freeze at ${fmtT(tfOf(s.run.w))}. Sugar lowers the freezing point below 0 °C.`,
  no:()=>{const r=s.run;if(r.w<5||r.w>30)return "Use a drink with 5% to 30% sugar.";if(r.tIce==null)return "Run it until ice starts to form (the curve turns blue and flattens), then read off the temperature.";
    return `Not quite: ${fmtT(s.reading)} isn't where this curve flattens. Find the bend where the line goes from steep to nearly flat.`}},
 {q:"Pause when the bowl holds at least 200 g of ice. Use E = mL (L = 334 J g⁻¹) to work out how much energy was removed to freeze that ice, and set <b>Your answer</b> in kJ.",
  check:()=>{const r=s.run;return r.mi>=200&&!s.playing&&Math.abs(s.ansE-r.mi*LF/1000)<=1.5},
  ok:()=>{const r=s.run;return `Yes: ${Math.round(r.mi)} g × 334 J g⁻¹ = ${fmtK(r.mi*LF)}. That energy was released as hydrogen bonds formed, and the refrigerant carried it away.`},
  no:()=>{const r=s.run;if(r.mi<200)return `Only ${Math.round(r.mi)} g of ice so far. Keep it running.`;if(s.playing)return "Pause first, so the ice reading stays still.";
    return "Not yet. E = m × L: grams × J g⁻¹ gives joules; divide by 1000 for kJ."}},
 {q:"The back of the machine is warm. While the compressor is running, pause and set <b>Heat out the back</b> to the power the back gives to the room, in watts.",
  check:()=>{const p=powers(s.run);return p.run&&!s.playing&&Math.abs(s.ansW-p.back)<=4},
  ok:()=>{const p=powers(s.run);return `Yes: ${Math.round(p.qc)} W from the drink + ${p.pc+p.pf} W for the compressor and fan = ${Math.round(p.back)} W. Energy is conserved, so the back gives out more heat than the drink loses.`},
  no:()=>{const p=powers(s.run);if(!p.run)return "The compressor is resting (or switched off). Start a fresh drink, or wait for it to switch back on, then pause.";if(s.playing)return "Pause first, so the readings stay still.";
    return "Not yet. Energy in = energy out: add the heat taken from the drink to the electrical power of the compressor and fan."}}];
// ---- mount
const CFG={postprocessing:false,kupu:KUPU,caseTint:"sky",accent:"#3A6FB8",scene3d:slushie3d,
  eyebrow:"Chemistry · Changes of state",title:"The slushie machine",crumb:"Year 10 science · NCEA Level 2 Chemistry AS91164 Demonstrate understanding of bonding, structure, properties and energy changes",homeHash:"l2",
  fig:"FIG. 35 · A SLUSHIE MACHINE, CUT OPEN",railTitle:"How a drink turns to slush",
  badge:{label:"NCEA L2 Chemistry 91164",exam:"2026-11-16T14:00:00+13:00",examText:"Mon 16 Nov, 2pm"},
  mainBox:"0 0 640 330",mainPhoneBig:true,mainLabel:"A countertop slushie machine on a lab bench, cut open: compressor, condenser and fan, expansion valve and a cold drum in a clear bowl with an auger, a thermometer probe, lab clock, cooling and energy diagrams, and a particle window",closeBox:"0 0 420 260",
  state:s,steps,
  controls:[{type:"play"},
    {type:"button",id:"fresh",label:"Fresh drink",onClick:()=>{newRun()}},
    {type:"button",id:"skip",label:"Skip 5 min",onClick:()=>{const r=s.run;if(r.capped)return;integrate(r,300,true)}},
    {type:"range",id:"w",label:"Sugar",min:0,max:40,step:1,get:()=>s.w,set:(x,v)=>{v=Math.round(v);if(s.w!==v){s.w=v;newRun()}},fmt:()=>s.w+"%"},
    {type:"toggle",id:"auger",label:"Auger",get:()=>s.auger,set:(x,v)=>{s.auger=v},labelFn:()=>s.run.jam?"Auger: jammed":s.auger?"Auger: on":"Auger: off"},
    {type:"toggle",id:"comp",label:"Cooling",get:()=>s.comp,set:(x,v)=>{s.comp=v;if(v)s.run.on=true},labelFn:()=>s.comp?"Cooling: on":"Cooling: off"},
    {type:"toggle",id:"vents",label:"Back vents",get:()=>!s.vents,set:(x,v)=>{s.vents=!v},labelFn:()=>s.vents?"Back vents: clear":"Back vents: blocked"},
    {type:"range",id:"reading",label:"Your reading",min:-4,max:0,step:.1,get:()=>s.reading,set:(x,v)=>{s.reading=Math.round(v*10)/10},fmt:()=>fmtT(s.reading)},
    {type:"range",id:"ansE",label:"Your answer",min:0,max:340,step:1,get:()=>s.ansE,set:(x,v)=>{s.ansE=Math.round(v)},fmt:()=>s.ansE+" kJ"},
    {type:"range",id:"ansW",label:"Heat out the back",min:0,max:500,step:1,get:()=>s.ansW,set:(x,v)=>{s.ansW=Math.round(v)},fmt:()=>s.ansW+" W"}],
  tick:(x,dt,st)=>{const r=s.run;s.anim+=dt;if(r.capped){s.playing=false;return}integrate(r,dt*st.speed,true);if(r.capped)s.playing=false;if(!has3D)lwTick(dt)},
  drawMain,drawClose,
  chips:(x,st)=>{const r=s.run,p=powers(r),f=r.mi/M,S=syrupS(r);return{
    temp:["DRINK",fmtT(r.T),true],time:["TIME",minsec(r.t)],ice:["ICE",`${Math.round(f*100)}% · ${Math.round(r.mi)} g`,f>0],
    sugar:["SUGAR",`${r.w}% by mass`,st.k==="sugar"],fp:["STARTS FREEZING AT",fmtT(tfOf(r.w))],
    syrup:["SYRUP NOW",`${Math.round(r.mi>.5?wOfS(S):r.w)}% sugar`],fpnow:["SYRUP FREEZES AT",fmtT(-fpd(S))],
    ecool:["COOLING (mcΔT)",fmtK(Math.max(0,eCool(r)))],efrz:["FREEZING (mL)",fmtK(eFreeze(r)),r.mi>0],state:["STATE",stateNow(r),true],
    pin:["ELECTRICITY IN",`${Math.round(p.pin)} W`],qc:["HEAT FROM THE DRINK",`${Math.round(p.qc)} W`,st.k==="auger"],qout:["HEAT OUT THE BACK",`${Math.round(p.back)} W`,true],
    pcf:["COMPRESSOR + FAN",p.run?`${p.pc+p.pf} W`:"0 W (resting)"],eff:["MOTOR EFFICIENCY",`${Math.round(EFF*100)}% (model)`],
    auger:["AUGER",r.jam?"jammed":s.auger?"turning":"stopped",!s.auger||r.jam],crystals:["CRYSTALS",sizeTxt(r)],shell:["ICE ON THE DRUM",`${Math.round(r.shell)} g`],
    comp:["COMPRESSOR",!s.comp?"switched off":r.on?"running":"resting at −3 °C"]}},
  challenges:CH,
  papers:[{label:"NZQA: Chemistry past exams",url:"https://www2.nzqa.govt.nz/ncea/subjects/past-exams-and-exemplars/chemistry/"},
    {label:"2025 paper, AS91164",url:"https://www.nzqa.govt.nz/nqfdocs/ncea-resource/exams/2025/91164-exm-2025.pdf"},
    {label:"2025 marking schedule",url:"https://www.nzqa.govt.nz/nqfdocs/ncea-resource/schedules/2025/91164-ass-2025.pdf"}],
  truth:"The machine is assembly's own design, not a model of any product. Real numbers: freezing (or melting) 1 g of water takes 334 J, and warming 1 g of liquid water by 1 °C takes 4.18 J (Case Western Reserve University); ice takes about 2 J g⁻¹ °C⁻¹ (Chemistry LibreTexts). The freezing points of sugar syrup come from a University of Guelph Food Science table (Leighton 1927, after Pickering 1891). Ice is about 9% less dense than liquid water (USGS), because hydrogen bonds hold its molecules in an open structure with hexagonal channels (Chemistry LibreTexts). Heat out = heat in + work for any refrigerator (OpenStax College Physics). The model's own choices: 1 kg of drink starting at 20 °C in a 20 °C room; the syrup is given water's heat capacity; the thermostat holds −3 °C; the powers (120 W compressor, 8 W fan, 12 W auger, about 200 W taken from the drink), the 85% motor efficiency, how fast ice builds up on a still drum, the crystal sizes, and the slush bands (25–55% ice is slush; 70% jams the auger). Real drinks can cool a little below their freezing point before ice first forms; the model leaves this out. The particle window is a flat, slowed-down sketch: real ice is 3D, the sugar is exaggerated, and molecules are not to scale.",
  footer:"Covers AS91164 energy changes: changes of state, attractions between particles (hydrogen bonding in ice), exothermic and endothermic changes and energy calculations with E = mL. Also Year 10 science: energy transfer and transformation, conservation of energy, energy flow diagrams and percentage efficiency."
};
// "View in your space": the machine alone (no bench, labels or screens), at real size: 1 scene unit = 4 cm
CFG.ar={build:S=>MG?.g,unitsPerMetre:25,scale:"real",label:"Put it on your bench"};
const API=StudyKit.mount(CFG);
if(document.querySelector?.(".playmain")){
  const extra=document.createElement("section");extra.id="slushie-extra-chart";extra.className="slushie-extra-chart";extra.hidden=true;document.querySelector(".lower").before(extra);
  const canvas=document.querySelector(".playmain .canvas"),poster=document.createElement("img");poster.className="slushie-poster";poster.src="/assets/models/slushie/slushie-hero.webp";poster.alt="Static Blender render of the slushie machine";canvas.append(poster);
  const note=document.createElement("p");note.className="slushie-view-note";note.innerHTML=`<span id="slushie-load-status" role="status">Simplified live diagram · controls and charts remain available</span><a href="?lite${location.hash}" id="slushie-graphics-link">Use simplified view</a>`;canvas.after(note);
  const parts=document.createElement("div");parts.className="slushie-parts";parts.innerHTML='<label for="slushie-parts">Inside the machine</label><select id="slushie-parts" disabled><option value="">Choose a part</option></select><p id="slushie-part-description" aria-live="polite">Choose a part, or tap one in the model.</p>';note.after(parts);
  const link=note.querySelector("a"),lite=/[?&]lite\b/.test(location.search);if(lite){link.textContent="Try live 3D";parts.hidden=true;link.href=location.pathname+location.hash}
  link.onclick=()=>{link.href=(lite?location.pathname:"?lite")+location.hash};
  window.addEventListener("hashchange",()=>{link.href=(lite?location.pathname:"?lite")+location.hash});
}
if(/[?&]debug\b/.test(location.search))try{window.__slushie=Object.assign(window.__slushie||{},{s,LW,API,integrate,powers,phiSet,tfOf,MIN_SLUSH,MAX_SLUSH,MIN_NOJAM,outcome})}catch(e){}
})();
