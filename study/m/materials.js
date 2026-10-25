(()=>{
"use strict";
// The materials lab: seven materials, four bench tests, a particle zoom, conduction, the hammer test, jobs and a power-line trade-off.
// Property values are typical textbook values (see truth line). Drawings are built as SVG strings; the kit redraws them on every change.
const $=id=>document.getElementById(id);
const r1=n=>Math.round(n*10)/10;
const fmt=(x,d=0)=>Number(x).toLocaleString("en-NZ",{maximumFractionDigits:d,minimumFractionDigits:d});
const hs=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)};
const mod=(a,b)=>((a%b)+b)%b;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const PH=()=>{try{return matchMedia("(max-width:600px)").matches}catch(e){return false}};

// ---------- the materials
const M={
  cu:{n:"Copper",sh:"Copper",type:"metal",tn:"Metallic",rho:8.96,rhoT:"8.96",mp:1085,mp2:1085,mpT:"1085 °C",elec:true,heat:"high",mall:true,tough:true,sol:false,burn:false,
    ham:"Bends",parts:"Metal ions + free electrons",force:"Metallic bonding (strong)",c1:"#F4AE7F",c2:"#B65A2A",top:"#F8D0AE",side:"#9A4A20"},
  al:{n:"Aluminium",sh:"Aluminium",type:"metal",tn:"Metallic",rho:2.70,rhoT:"2.70",mp:660,mp2:660,mpT:"660 °C",elec:true,heat:"high",mall:true,tough:true,sol:false,burn:false,
    ham:"Bends",parts:"Metal ions + free electrons",force:"Metallic bonding (strong)",c1:"#F5F8FB",c2:"#A3AFBD",top:"#FFFFFF",side:"#7E8B9B"},
  nacl:{n:"Sodium chloride",sh:"Salt",type:"ionic",tn:"Ionic",rho:2.16,rhoT:"2.16",mp:801,mp2:801,mpT:"801 °C",elec:false,heat:"low",mall:false,tough:false,sol:true,burn:false,
    ham:"Shatters",parts:"Na⁺ and Cl⁻ ions",force:"Ionic bonds (strong)",c1:"#FFFFFF",c2:"#DCE6EF",top:"#FFFFFF",side:"#C9D7E4"},
  wax:{n:"Paraffin wax",sh:"Wax",type:"molec",tn:"Molecular",rho:0.9,rhoT:"about 0.9",mp:46,mp2:68,mpT:"46–68 °C",elec:false,heat:"low",mall:false,tough:false,sol:false,burn:true,
    ham:"Squashes",parts:"Separate molecules",force:"Weak forces between molecules",c1:"#FFF2C9",c2:"#EAC874",top:"#FFF7DD",side:"#D9B45E"},
  hdpe:{n:"Polyethylene (HDPE)",sh:"HDPE",type:"poly",tn:"Polymer",rho:0.95,rhoT:"about 0.95",mp:130,mp2:130,mpT:"about 130 °C",elec:false,heat:"low",mall:false,tough:true,sol:false,burn:true,
    ham:"Dents, no crack",parts:"Very long chain molecules",force:"Weak forces between chains",c1:"#EFF7FC",c2:"#C3DAEA",top:"#F7FBFE",side:"#AAC6DA"},
  dia:{n:"Diamond",sh:"Diamond",type:"net",tn:"Covalent network",rho:3.51,rhoT:"3.51",mp:3550,mp2:3550,mpT:"above 3500 °C",elec:false,heat:"high",mall:false,tough:false,sol:false,burn:false,
    ham:"Won't dent, can chip",parts:"Carbon atoms, 4 bonds each",force:"Covalent bonds in 3D",c1:"#E9FBFF",c2:"#A6E3F5",top:"#F4FDFF",side:"#8ACFE5"},
  gra:{n:"Graphite",sh:"Graphite",type:"layer",tn:"Covalent layers",rho:2.2,rhoT:"about 2.2",mp:3600,mp2:3600,mpT:"above 3500 °C",elec:true,heat:"high",mall:false,tough:false,sol:false,burn:false,
    ham:"Flakes",parts:"Carbon layers + free electrons",force:"Covalent in layers, weak between",c1:"#737A8A",c2:"#3A3E47",top:"#80869A",side:"#2D3038"}
};
const ORDER=["cu","al","nacl","wax","hdpe","dia","gra"];
const TYPEC={metal:"#2F8FD8",ionic:"#FF6B4A",molec:"#F0A020",poly:"#2FA65A",net:"#7B61FF",layer:"#6A57E0"};

// ---------- jobs for "pick for the job"
const JOBS=[
  {id:"wire",n:"Electrical wire",need:[["Conducts electricity as a solid",k=>M[k].elec],["Bends and draws into thin wire",k=>M[k].mall],["Lowest resistance of these",k=>k==="cu"]],
    ex:"Copper suits electrical wire: its delocalised electrons are free to move, so it conducts very well, and its layers of ions can slide, so it can be drawn into thin wire without breaking."},
  {id:"drill",n:"Drill bit tip",need:[["Hardest material",k=>k==="dia"],["Stays solid when very hot",k=>M[k].mp>=3500],["Carries heat away",k=>M[k].heat==="high"]],
    ex:"Diamond suits a drill tip: every carbon atom is covalently bonded to four others in a 3D network, so it is extremely hard and doesn't melt from the heat of drilling."},
  {id:"pencil",n:"Pencil “lead”",need:[["Soft: rubs off onto paper",k=>k==="gra"||k==="wax"],["Leaves a dark grey mark",k=>k==="gra"],["Doesn't dissolve when wet",k=>!M[k].sol]],
    ex:"Graphite suits pencil “lead”: its layers are held together only by weak forces, so they slide off onto the paper and leave a dark mark."},
  {id:"board",n:"Chopping board",need:[["Doesn't dissolve in water",k=>!M[k].sol],["Tough: won't shatter or crumble",k=>M[k].tough],["Survives hot washing",k=>M[k].mp>100],["Light: less dense than water",k=>M[k].rho<1]],
    ex:"HDPE suits a chopping board: its long tangled chains make it tough rather than brittle, it doesn't dissolve, it survives hot washing (it melts at about 130 °C) and it's light."},
  {id:"candle",n:"Candle",need:[["Melts below 100 °C",k=>M[k].mp<100],["Burns as a fuel",k=>M[k].burn],["Doesn't dissolve in water",k=>!M[k].sol]],
    ex:"Paraffin wax suits a candle: the forces between its molecules are weak, so it melts at a low temperature, and the liquid wax is drawn up the wick and burns."},
  {id:"can",n:"Drink can",need:[["Rolls into thin sheets",k=>M[k].mall],["Low density (under 3 g/cm³)",k=>M[k].rho<3],["Doesn't dissolve in the drink",k=>!M[k].sol]],
    ex:"Aluminium suits drink cans: like all metals it is malleable, so it can be rolled into thin sheets, and its density is only 2.70 g/cm³, so the can is light."},
  {id:"deice",n:"De-icing roads",need:[["Dissolves in water",k=>M[k].sol],["Stays solid on the truck",k=>M[k].mp>100]],
    ex:"Sodium chloride suits de-icing roads: it is an ionic solid that dissolves in water, and the dissolved ions lower the freezing point of the water, so ice melts."},
  {id:"handle",n:"Frying-pan handle",need:[["Stays cool: poor heat conductor",k=>M[k].heat==="low"],["Stays solid near a hot element",k=>M[k].mp>200],["Tough: won't shatter",k=>M[k].tough]],
    ex:"None of these is perfect for a pan handle. HDPE insulates and is tough but softens at about 130 °C; salt insulates but is brittle; copper conducts heat to your hand. Real handles use heat-set plastics or wood."}
];
const JOB=id=>JOBS.find(j=>j.id===id)||JOBS[0];
const fitOf=(jid,k)=>{const j=JOB(jid);if(!k||!M[k])return{pass:0,n:j.need.length,full:false,res:j.need.map(()=>null)};const res=j.need.map(nd=>!!nd[1](k));const pass=res.filter(Boolean).length;return{pass,n:j.need.length,full:pass===j.need.length,res}};

// ---------- the power-line trade-off (same resistance per km)
const RES={cu:1.68e-8,al:2.65e-8}, DEN={cu:8960,al:2700}, RKM=0.1;           // Ω·m, kg/m³, target Ω per km
const AREA=k=>RES[k]*1000/RKM;                 // m² for 0.1 Ω per km
const KGKM=k=>AREA(k)*1000*DEN[k];             // kg per km of conductor
const DIAM=k=>2*Math.sqrt(AREA(k)/Math.PI)*1000; // mm

// ---------- state
const s={mat:"cu",temp:20,t:0,dis:0,cstate:"solid",hamMat:"ionic",shift:0,job:"wire",picks:{},len:10,line:"",why:""};

// ---------- bench figure look (StudyKit.fig): paper floor, frosted mint acrylic panels, painted samples with a floor shadow
const F=StudyKit.fig,PAL=F.palette,TINT=PAL.case.mint,TD=F.deep(TINT),PR=PAL.product,NAVY="#262E5C",RAIL="#6E7A8C",LINE="#3A4466";
const tintOf=(h,k)=>{const n=parseInt(h.slice(1),16),c=[(n>>16)&255,(n>>8)&255,n&255].map(v=>Math.round(v+(255-v)*k));return "#"+c.map(v=>v.toString(16).padStart(2,"0")).join("")};
// the oblique depth of a panel (top and side faces), drawn without pointer events so tap targets keep their exact rectangles
const depth=(x,y,w,h,d,fill,st,shadow)=>{const dy=-d*.55;return `<g pointer-events="none">${shadow?F.shadow(x,y+h,w+d,{len:Math.min(46,w*.22),opacity:.12}):""}<path d="M${r1(x+6)},${y} l${d},${r1(dy)} h${r1(w-12)} l${-d},${r1(-dy)}z" fill="${fill}" fill-opacity=".75" stroke="${st}" stroke-width="1"/><path d="M${x+w},${r1(y+6)} l${d},${r1(dy)} v${r1(h-12)} l${-d},${r1(-dy)}z" fill="${TD}" fill-opacity=".35" stroke="${st}" stroke-width="1"/></g>`};
// ---------- small drawing helpers
const T=(x,y,t,o={})=>`<text x="${r1(x)}" y="${r1(y)}" font-size="${o.s||13}" font-weight="${o.w||600}" fill="${o.f||"var(--ink)"}"${o.a?` text-anchor="${o.a}"`:""}${o.cl?` class="${o.cl}"`:""}${o.ls?` letter-spacing="${o.ls}"`:""}${o.op!=null?` opacity="${o.op}"`:""}>${t}</text>`;
let VB="";
function vb(w,h){const v=`0 0 ${w} ${h}`;if(v!==VB){const el=$("k-main");if(el){el.setAttribute("viewBox",v);VB=v}}}
function defs(p){return `<defs>${ORDER.map(k=>`<linearGradient id="${p}g-${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${M[k].c1}"/><stop offset="1" stop-color="${M[k].c2}"/></linearGradient>`).join("")}
<radialGradient id="${p}glow"><stop offset="0" stop-color="#FFE68A" stop-opacity=".95"/><stop offset=".45" stop-color="#FFC23D" stop-opacity=".45"/><stop offset="1" stop-color="#FFB020" stop-opacity="0"/></radialGradient>
<linearGradient id="${p}water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#CBE9FB" stop-opacity=".75"/><stop offset="1" stop-color="#82C4EE" stop-opacity=".85"/></linearGradient>
<linearGradient id="${p}hot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE07A"/><stop offset="1" stop-color="#FF6B4A"/></linearGradient>
<linearGradient id="${p}steel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9EEF3"/><stop offset="1" stop-color="#A9B4C2"/></linearGradient></defs>`}
const card=(x,y,w,h,o={})=>depth(x,y,w,h,o.d!=null?o.d:9,TINT,TD,true)+`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx||18}" fill="${o.f||"#EAF7F0"}" fill-opacity="${o.f?1:.88}" stroke="${!o.st||o.st==="var(--line)"?TD:o.st}" stroke-width="${o.sw||1.3}"${o.cl?` class="${o.cl}"`:""}/><path d="M${x+16},${y+5} h${Math.min(w*.4,110)}" stroke="#fff" stroke-opacity=".9" stroke-width="2.4" stroke-linecap="round" pointer-events="none"/>`;
function pill(cx,y,txt,kind,o={}){const w=o.w||Math.max(70,txt.length*7.4+24),h=o.h||26;const F={good:["#DDF5EA","#11634C"],bad:["#FFE9E3","#B2412A"],sun:["#FFF1C2","#7A5600"],none:["var(--fill)","var(--body)"]}[kind||"none"];
  return `<rect x="${r1(cx-w/2)}" y="${y}" width="${r1(w)}" height="${h}" rx="${h/2}" fill="${F[0]}"/>`+T(cx,y+h/2+4.6,txt,{a:"middle",s:o.s||13,w:700,f:F[1]})}
function box(cx,cy,w,h,d,front,top,side,st){const dx=d*.75,dy=-d*.55,x=r1(cx-w/2-dx/2),y=r1(cy-h/2-dy/2);
  return `<path d="M${x},${r1(y+h)} h${r1(w+dx)} l${r1(Math.max(10,w*.3))},${r1(Math.max(10,w*.3)*.32+4)} h${r1(-w-dx)}z" fill="${PAL.shadow}" opacity=".16" pointer-events="none"/><path d="M${x},${y} l${r1(dx)},${r1(dy)} h${r1(w)} l${r1(-dx)},${r1(-dy)}z" fill="${top}" ${st}/><path d="M${r1(x+w)},${y} l${r1(dx)},${r1(dy)} v${r1(h)} l${r1(-dx)},${r1(-dy)}z" fill="${side}" ${st}/><rect x="${x}" y="${y}" width="${r1(w)}" height="${r1(h)}" fill="${front}" ${st}/>`}
// a sample of each material, about 70 units wide at sc = 1
function sample(k,cx,cy,sc,p){sc=sc||1;const m=M[k],S=v=>r1(v*sc);const st=`stroke="${LINE}" stroke-width="${r1(1.2*Math.max(.75,Math.min(1.4,sc)))}" stroke-linejoin="round"`;
  if(k==="cu"||k==="al")return box(cx,cy,S(70),S(26),S(22),`url(#${p}g-${k})`,m.top,m.side,st)+`<path d="M${r1(cx-S(36))},${r1(cy-S(2))} h${S(38)}" stroke="#fff" stroke-opacity=".6" stroke-width="${S(3)}" stroke-linecap="round"/>`;
  if(k==="nacl")return box(cx,cy,S(44),S(44),S(30),`url(#${p}g-nacl)`,m.top,m.side,st)+`<path d="M${r1(cx-S(20))},${r1(cy-S(6))} l${S(12)},${S(12)} M${r1(cx-S(6))},${r1(cy+S(10))} l${S(9)},${S(9)}" stroke="#AFC3D6" stroke-width="${S(1.6)}" stroke-linecap="round"/>`;
  if(k==="wax"){const w=S(46),h=S(40),ry=S(9),x=r1(cx-w/2),y=r1(cy-h/2+ry/2);
    return `<path d="M${x},${y} v${h} a${r1(w/2)},${ry} 0 0 0 ${w},0 v${-h}" fill="url(#${p}g-wax)" ${st}/><ellipse cx="${r1(cx)}" cy="${y}" rx="${r1(w/2)}" ry="${ry}" fill="${m.top}" ${st}/><path d="M${r1(cx)},${y} v${-S(10)}" stroke="var(--ink)" stroke-width="${S(2.2)}" stroke-linecap="round"/>`}
  if(k==="hdpe")return box(cx,cy,S(78),S(14),S(34),`url(#${p}g-hdpe)`,m.top,m.side,st)+`<circle cx="${r1(cx+S(26))}" cy="${r1(cy-S(9))}" r="${S(4)}" fill="#fff" ${st}/>`;
  if(k==="dia"){const P=(a,b)=>`${r1(cx+S(a))},${r1(cy+S(b))}`;
    return `<path d="M${P(-15,-20)} L${P(15,-20)} L${P(28,-7)} L${P(0,26)} L${P(-28,-7)}Z" fill="url(#${p}g-dia)" ${st}/><path d="M${P(-28,-7)} H${r1(cx+S(28))} M${P(-15,-20)} L${P(-8,-7)} L${P(0,26)} M${P(15,-20)} L${P(8,-7)} L${P(0,26)} M${P(-8,-7)} L${P(0,-20)} L${P(8,-7)}" fill="none" stroke="#5FB8D6" stroke-width="${S(1.3)}"/><path d="M${P(20,-30)} l${S(3)},${S(-7)} l${S(3)},${S(7)} l${S(7)},${S(3)} l${S(-7)},${S(3)} l${S(-3)},${S(7)} l${S(-3)},${S(-7)} l${S(-7)},${S(-3)}z" fill="#FFE07A"/>`}
  if(k==="gra")return box(cx,cy,S(64),S(28),S(20),`url(#${p}g-gra)`,m.top,m.side,st)+[0,1,2].map(i=>`<path d="M${r1(cx-S(34))},${r1(cy-S(6)+S(i*7))} h${S(56)}" stroke="#9AA2B4" stroke-opacity=".7" stroke-width="${S(1.4)}"/>`).join("");
  return ""}
function tile(x,y,w,h,k,sel,act,p,o={}){const on=sel===k;
  return `<g data-act="${act}:${k}">${depth(x,y,w,h,5,on?TINT:"#FFFFFF",TD,false)}<rect class="hov" x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="${on?TINT:"#FFFFFF"}" fill-opacity="${on?.9:.82}" stroke="${on?"var(--acc)":TD}" stroke-width="${on?3:1.1}"/>${sample(k,x+w/2,y+(o.nolab?h/2:h*.44),o.sc||.56,p)}${o.nolab?"":T(x+w/2,y+h-11,M[k].sh,{a:"middle",s:o.fs||12.5,w:700,f:on?"var(--ink)":"var(--body)"})}</g>`}
function lerpC(a,b,f){const A=a.match(/\w\w/g).map(h=>parseInt(h,16)),B=b.match(/\w\w/g).map(h=>parseInt(h,16));return "#"+A.map((v,i)=>Math.round(v+(B[i]-v)*f).toString(16).padStart(2,"0")).join("")}
const meltState=(k,T)=>T>=M[k].mp2?"melted":T>=M[k].mp?"melting":"solid";

// ---------- bench stations (each 165 x 230)
function stCircuit(x,y,k,p){const on=M[k].elec;let o=`<g transform="translate(${x},${y})">`+card(0,0,165,230)+T(82.5,26,"Conducts?",{a:"middle",s:15,w:700});
  o+=`<path d="M64,62 H24 V176 H44 M101,62 H140 V104 M140,144 V176 H121" fill="none" stroke="#9A5A32" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/><path d="M64,62 H24 V176 H44 M101,62 H140 V104 M140,144 V176 H121" fill="none" stroke="${PAL.copper}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
  if(on)o+=`<circle cx="82.5" cy="58" r="46" fill="url(#${p}glow)"/>`;
  o+=`<circle cx="82.5" cy="56" r="19" fill="${on?"#FFE68A":"#F4F7FA"}" stroke="var(--ink)" stroke-width="2"/><path d="M75,60 q7.5,-12 15,0" fill="none" stroke="${on?"#E08A00":"var(--rose)"}" stroke-width="2"/><rect x="74" y="73" width="17" height="12" rx="3" fill="var(--moon)" stroke="var(--ink)" stroke-width="1.6"/><path d="M82.5,85 V62" stroke="var(--ink)" stroke-width="0"/>`;
  o+=F.cyl(140,104,11,40,{colour:PR.butter,kind:"painted",shadow:false})+`<rect x="136" y="97" width="8" height="5" rx="2" fill="${RAIL}"/>`+T(140,131,"+",{a:"middle",s:15,w:700});
  o+=sample(k,82.5,170,.62,p)+`<circle cx="44" cy="176" r="5" fill="var(--hot)" stroke="var(--ink)" stroke-width="1.5"/><circle cx="121" cy="176" r="5" fill="var(--ink)"/>`;
  o+=pill(82.5,194,on?"Lights up":"Stays dark",on?"good":"none",{w:118})+`</g>`;return o}
function stHeat(x,y,k,T0,p){const ms=meltState(k,T0),f=clamp((T0-20)/1000,0,1);let o=`<g transform="translate(${x},${y})">`+card(0,0,165,230)+T(70,26,"Heat it",{a:"middle",s:15,w:700});
  const coil=f<.5?lerpC("5B5670","FF6B4A",f*2):lerpC("FF6B4A","FFD36B",(f-.5)*2);
  if(T0>60)o+=[0,1,2].map(i=>`<path d="M${36+i*30},150 q-7,-10 0,-20 t0,-20" fill="none" stroke="var(--hot)" stroke-opacity="${r1(.15+.6*f)}" stroke-width="2" stroke-linecap="round"/>`).join("");
  const m=M[k];
  if(ms==="melted"){const hot=T0>500;o+=`<ellipse cx="68" cy="154" rx="44" ry="8" fill="${hot?`url(#${p}hot)`:`url(#${p}g-${k})`}" stroke="var(--ink)" stroke-width="1.5"/><ellipse cx="54" cy="152" rx="10" ry="2.4" fill="#fff" opacity=".55"/>`}
  else if(ms==="melting"){o+=`<ellipse cx="68" cy="155" rx="38" ry="6.5" fill="url(#${p}g-${k})" stroke="var(--ink)" stroke-width="1.5"/>`+`<g transform="translate(68,140) scale(1,.7) translate(-68,-140)">${sample(k,68,136,.62,p)}</g>`}
  else o+=sample(k,68,134,.66,p);
  o+=F.box(10,179,118,12,{colour:"#7C869A",kind:"metal",d:8,r:3,shadowLen:28})+`<rect x="20" y="170" width="98" height="9" rx="3" fill="${coil}" stroke="${LINE}" stroke-width="1"/>`+F.box(14,158,110,12,{colour:PAL.steel,kind:"metal",d:8,r:3,shadow:false});
  const lv=clamp((T0-20)/1180,0,1)*100;
  o+=`<rect x="139" y="46" width="14" height="114" rx="7" fill="#fff" fill-opacity=".75" stroke="${TD}" stroke-width="1.4"/><rect x="143" y="${r1(152-lv)}" width="6" height="${r1(lv+8)}" rx="3" fill="${PR.strawberry}"/><path d="M142.5,52 v100" stroke="#fff" stroke-opacity=".9" stroke-width="1.6" stroke-linecap="round"/><circle cx="146" cy="166" r="10" fill="${PR.strawberry}" stroke="#A8455E" stroke-width="1.4"/><circle cx="143" cy="163" r="3" fill="#fff" opacity=".7"/>`+T(146,40,fmt(T0)+"°",{a:"middle",s:12,w:700});
  o+=pill(82.5,194,ms==="melted"?"Melted":ms==="melting"?"Melting":"Still solid",ms==="solid"?"none":"sun",{w:118})+`</g>`;return o}
function stHammer(x,y,k,p){const m=M[k];let o=`<g transform="translate(${x},${y})">`+card(0,0,165,230)+T(82.5,26,"Hammer it",{a:"middle",s:15,w:700});
  o+=F.shadow(50,190,72,{len:26,opacity:.16})+`<path d="M38,170 H128 L116,190 H50Z" fill="${PAL.steelDark}" stroke="${RAIL}" stroke-width="1.3" stroke-linejoin="round"/>`+F.box(28,160,110,12,{colour:PAL.steel,kind:"metal",d:7,r:3,shadow:false});
  o+=`<g transform="rotate(-18 112 70)"><rect x="104" y="44" width="10" height="64" rx="4" fill="#D69A5C" stroke="var(--ink)" stroke-width="1.5"/><rect x="88" y="98" width="44" height="24" rx="5" fill="url(#${p}steel)" stroke="var(--ink)" stroke-width="1.6"/></g>`;
  o+=`<path d="M48,112 l-10,-6 M52,102 l-6,-10 M62,98 l-1,-11" stroke="var(--rose)" stroke-width="2" stroke-linecap="round"/>`;
  const cx=78,cy=148;
  if(k==="cu"||k==="al")o+=`<path d="M40,154 Q78,138 116,154 L116,161 Q78,146 40,161Z" fill="url(#${p}g-${k})" stroke="var(--ink)" stroke-width="1.5" stroke-linejoin="round"/>`;
  else if(k==="nacl")o+=[[-26,8,-18],[-8,2,12],[10,6,-30],[26,10,24],[-36,-14,40],[34,-12,-10],[0,-20,60]].map(([dx,dy,a],i)=>`<path d="M${cx+dx-7},${cy+dy+4} l7,-11 l8,6 l-4,9z" transform="rotate(${a} ${cx+dx} ${cy+dy})" fill="#F6F9FC" stroke="var(--ink)" stroke-width="1.3" stroke-linejoin="round"/>`).join("")+`<path d="M60,128 l-6,-8 M96,128 l7,-8 M78,124 v-10" stroke="var(--hot)" stroke-width="2.2" stroke-linecap="round"/>`;
  else if(k==="wax")o+=`<path d="M40,160 q4,-12 18,-12 q8,-6 20,-2 q12,-6 22,2 q14,0 16,12z" fill="url(#${p}g-wax)" stroke="var(--ink)" stroke-width="1.5"/>`;
  else if(k==="hdpe")o+=`<path d="M36,152 h28 q14,10 28,0 h28 v8 h-84z" fill="url(#${p}g-hdpe)" stroke="var(--ink)" stroke-width="1.5" stroke-linejoin="round"/>`;
  else if(k==="dia")o+=sample("dia",cx,cy-4,.62,p)+`<path d="M104,130 l8,-4 l-2,8z M50,134 l-7,-3 l3,7z" fill="#BFEFFB" stroke="var(--ink)" stroke-width="1"/>`;
  else o+=`<rect x="44" y="148" width="66" height="12" rx="3" fill="url(#${p}g-gra)" stroke="var(--ink)" stroke-width="1.5"/>`+[[40,138,20],[112,140,-25],[56,132,40],[100,130,10],[78,128,-15]].map(([a,b,r])=>`<rect x="${a}" y="${b}" width="9" height="4" rx="1.5" transform="rotate(${r} ${a} ${b})" fill="#4A4F5B"/>`).join("");
  const good=k==="cu"||k==="al"||k==="hdpe";
  o+=pill(82.5,194,m.ham,good?"good":k==="nacl"?"bad":"none",{w:Math.max(118,m.ham.length*7.2+24)})+`</g>`;return o}
function stWater(x,y,k,p){const m=M[k];let o=`<g transform="translate(${x},${y})">`+card(0,0,165,230)+T(82.5,26,"In water",{a:"middle",s:15,w:700})+T(82.5,44,m.rhoT+" g/cm³",{a:"middle",s:12,w:600,f:"var(--rose)"});
  const water=`<path d="M38,94 V170 q0,10 10,10 h70 q10,0 10,-10 V94z" fill="url(#${p}water)"/>`;
  const glass=F.shadow(46,184,74,{len:28,opacity:.13})+`<path d="M34,58 V172 q0,12 12,12 h74 q12,0 12,-12 V58" fill="#fff" fill-opacity=".18" stroke="#6F9CC2" stroke-width="2" stroke-linejoin="round"/><path d="M30,58 h8 M128,58 h8" stroke="#6F9CC2" stroke-width="2" stroke-linecap="round"/><path d="M42,66 V160" stroke="#fff" stroke-opacity=".85" stroke-width="2.4" stroke-linecap="round"/>`;
  let res,kind;
  if(m.sol){const f=Math.min(1,.3+s.dis),sc=.5*(1-.8*f);o+=water;
    for(let i=0;i<22;i++){const ix=44+mod(hs(i)*76+Math.sin(s.t*.8+i)*6,76),iy=100+mod(hs(i+40)*74+Math.cos(s.t*.7+i*1.3)*5,74);if(hs(i+7)>f+.1)continue;const na=i%2===0;
      o+=`<circle cx="${r1(ix)}" cy="${r1(iy)}" r="${na?3.4:4.6}" fill="${na?"var(--hot)":"var(--land)"}" stroke="var(--ink)" stroke-width=".8"/>`}
    if(sc>.08)o+=sample(k,82,168,sc,p);res="Dissolves";kind="good"}
  else if(m.rho<1){o+=sample(k,82,92,.56,p)+`<path d="M38,94 V170 q0,10 10,10 h70 q10,0 10,-10 V94z" fill="url(#${p}water)" opacity=".8"/>`;res="Floats";kind="sun"}
  else{o+=water+sample(k,82,166,.5,p)+`<path d="M38,94 V170 q0,10 10,10 h70 q10,0 10,-10 V94z" fill="#82C4EE" opacity=".22"/>`;res="Sinks, no change";kind="none"}
  o+=`<path d="M38,94 h90" stroke="#5AA9DE" stroke-width="2"/>`+glass;
  o+=pill(82.5,194,res,kind,{w:126})+`</g>`;return o}

function drawBench(p){const ph=PH();let o=defs(p),k=s.mat;
  if(!ph){vb(720,352);o+=F.floor(720,352);
    ORDER.forEach((m,i)=>o+=tile(18+i*98,12,90,80,m,k,"mat",p));
    [stCircuit(12,110,k,p),stHeat(189,110,k,s.temp,p),stHammer(366,110,k,p),stWater(543,110,k,p)].forEach(g=>o+=g)}
  else{vb(400,722);o+=F.floor(400,722);
    ORDER.forEach((m,i)=>{const r=i<4?0:1,c=i<4?i:i-4,off=r?49:0;o+=tile(10+off+c*96,10+r*84,90,76,m,k,"mat",p)});
    const sc=1.14,pos=[[12,184],[206,184],[12,446],[206,446]];
    [stCircuit,(x,y,kk,pp)=>stHeat(x,y,kk,s.temp,pp),stHammer,stWater].forEach((fn,i)=>{o+=`<g transform="translate(${pos[i][0]},${pos[i][1]}) scale(${sc})">${fn(0,0,k,p)}</g>`})}
  return o}

// ---------- particles inside a circle (zoom, conduct)
function particles(k,cx,cy,r,o){const T0=o.T,t=o.t,typ=M[k].type,p=o.p;const st=o.state||(T0>=M[k].mp2?"molten":"solid");const melt=st==="molten";
  const amp=1+4*clamp((T0-20)/1180,0,1)+(melt?1.5:0),wob=(n,a)=>Math.sin(t*10+n*1.7+a)*amp;let g="";
  const W=2*r+60,X0=cx-r-30,Y0=cy-r-30;
  if(typ==="metal"){const sp=50;let n=0;
    for(let y=cy-r-sp;y<=cy+r+sp;y+=sp*.87){const row=Math.round((y-cy)/(sp*.87));for(let x=cx-r-sp+(mod(row,2)?sp/2:0);x<=cx+r+sp;x+=sp){n++;let px=x+wob(n,0),py=y+wob(n,2);
      if(melt){px+=Math.sin(n*3.1+t*1.4)*15;py+=Math.cos(n*2.3+t*1.2)*15}
      g+=`<circle cx="${r1(px)}" cy="${r1(py)}" r="18" fill="url(#${p}g-${k})" stroke="var(--ink)" stroke-width="1.4"/>`+T(px,py+6,"+",{a:"middle",s:18,w:700})}}
    for(let i=0;i<70;i++){const vx=(hs(i+3)-.5)*110+(o.drift?70:0),vy=(hs(i+4)-.5)*110*(o.drift?.4:1);const ex=X0+mod(hs(i)*W+t*vx,W),ey=Y0+mod(hs(i+77)*W+t*vy,W);
      g+=`<circle cx="${r1(ex)}" cy="${r1(ey)}" r="5" fill="var(--sun)" stroke="#9A6400" stroke-width="1"/>`}}
  else if(typ==="ionic"){
    if(st==="dissolved"){for(let i=0;i<46;i++){const wx=X0+mod(hs(i+300)*W+Math.sin(t*.9+i)*10,W),wy=Y0+mod(hs(i+500)*W+Math.cos(t*.8+i*1.7)*10,W),a=hs(i+9)*360+t*30;
        g+=`<g transform="translate(${r1(wx)},${r1(wy)}) rotate(${r1(a)})"><circle r="7" fill="var(--sea)" stroke="var(--ink)" stroke-width="1"/><circle cx="-7" cy="-5" r="4" fill="#fff" stroke="var(--ink)" stroke-width="1"/><circle cx="7" cy="-5" r="4" fill="#fff" stroke="var(--ink)" stroke-width="1"/></g>`}
      for(let i=0;i<16;i++){const na=i%2===0,dr=o.drift?(na?-30:30):0;const ix=X0+mod(hs(i+50)*W+t*dr+Math.sin(t*1.3+i)*9,W),iy=Y0+mod(hs(i+90)*W+Math.cos(t*1.1+i)*9,W);
        g+=ion(ix,iy,na)}}
    else{const sp=44;let n=0;for(let i=-Math.ceil(r/sp)-1;i<=Math.ceil(r/sp)+1;i++)for(let j=-Math.ceil(r/sp)-1;j<=Math.ceil(r/sp)+1;j++){n++;const na=mod(i+j,2)===0;
        let px=cx+i*sp+wob(n,0),py=cy+j*sp+wob(n,2);
        if(melt){const dr=o.drift?(na?-26:26):0;px=X0+mod(px-X0+Math.sin(n*2.9+t*1.5)*16+t*dr,W);py+=Math.cos(n*2.1+t*1.3)*16}
        g+=ion(px,py,na)}}}
  else if(typ==="molec"){let n=0;const half=T0>=M[k].mp&&!melt;
    for(let y=cy-r-10;y<=cy+r+10;y+=30)for(let x=cx-r-40+(mod(Math.round(y),60)<30?0:30);x<=cx+r+40;x+=78){n++;let px=x+wob(n,0),py=y+wob(n,2),a=0;
      if(melt||(half&&hs(n)<.5)){px+=Math.sin(n*2.3+t*1.2)*22;py+=Math.cos(n*1.9+t)*16;a=Math.sin(n*3+t*.9)*50}
      else g+=`<path d="M${r1(px)},${r1(py+9)} v12" stroke="var(--rose)" stroke-width="2" stroke-dasharray="2 3"/>`;
      g+=`<g transform="translate(${r1(px)},${r1(py)}) rotate(${r1(a)})"><path d="M-30,0 l12,-6 l12,6 l12,-6 l12,6 l12,-6" fill="none" stroke="#B88A20" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>${[-30,-18,-6,6,18,30].map((q,i)=>`<circle cx="${q}" cy="${i%2?-6:0}" r="3.6" fill="#E9C25A" stroke="var(--ink)" stroke-width=".9"/>`).join("")}</g>`}}
  else if(typ==="poly"){const nC=6,gap=2*r/nC;
    for(let c=0;c<nC;c++){const yc=cy-r+gap*(c+.5);let d="",pts=[];
      for(let x=cx-r-40;x<=cx+r+40;x+=12){const y=yc+15*Math.sin(x*.045+c*1.9+(melt?t*1.6:0))+20*Math.sin(x*.013+c*2.3+(melt?t*.7:0))+Math.sin(t*10+x*.3+c)*amp*.6;pts.push([x,y]);d+=(d?" L":"M")+r1(x)+","+r1(y)}
      if(c<nC-1&&!melt)for(let x=cx-r;x<=cx+r;x+=56){const y=yc+15*Math.sin(x*.045+c*1.9)+20*Math.sin(x*.013+c*2.3);g+=`<path d="M${r1(x)},${r1(y+8)} v${r1(gap-16)}" stroke="var(--rose)" stroke-width="2" stroke-dasharray="2 3"/>`}
      g+=`<path d="${d}" fill="none" stroke="var(--land)" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>`+pts.filter((q,i)=>i%2===0).map(q=>`<circle cx="${r1(q[0])}" cy="${r1(q[1])}" r="3.4" fill="#2B8A4E"/>`).join("")}}
  else if(typ==="net"){const sp=54;let b="",back="",front="",n=0;
    for(let i=-Math.ceil(r/sp)-1;i<=Math.ceil(r/sp)+1;i++)for(let j=-Math.ceil(r/sp)-1;j<=Math.ceil(r/sp)+1;j++){n++;const x=cx+i*sp,y=cy+j*sp,bx=x+sp/2,by=y+sp/2,w1=wob(n,0),w2=wob(n,2);
      [[0,0],[sp,0],[0,sp],[sp,sp]].forEach(([a,c])=>{b+=`M${r1(bx+w2)},${r1(by+w1)} L${r1(x+a+w1)},${r1(y+c+w2)} `});
      back+=`<circle cx="${r1(bx+w2)}" cy="${r1(by+w1)}" r="8.5" fill="#A7A2C2" stroke="var(--ink)" stroke-width="1"/>`;front+=`<circle cx="${r1(x+w1)}" cy="${r1(y+w2)}" r="11.5" fill="#3B3653" stroke="var(--ink)" stroke-width="1"/>`}
    g+=`<path d="${b}" stroke="#8C88A8" stroke-width="4" stroke-linecap="round"/>`+back+front}
  else if(typ==="layer"){const a=15,hw=Math.sqrt(3)*a;
    for(let l=0;l<3;l++){const yl=cy-r*.62+l*r*.62;let d="";
      for(let row=0;row<3;row++)for(let col=-1;col<Math.ceil((2*r+120)/hw);col++){const hx=col*hw+(row%2?hw/2:0),hy=row*1.5*a;
        d+=`M${r1(hx)},${r1(hy-a)} L${r1(hx+hw/2)},${r1(hy-a/2)} L${r1(hx+hw/2)},${r1(hy+a/2)} L${r1(hx)},${r1(hy+a)} L${r1(hx-hw/2)},${r1(hy+a/2)} L${r1(hx-hw/2)},${r1(hy-a/2)}Z `}
      g+=`<g transform="translate(${r1(cx-r-30+wob(l,0)*.5)},${r1(yl-14)}) skewX(-40) scale(1,.36)"><path d="${d}" fill="#E7E9EF" fill-opacity=".55" stroke="#4A4F5B" stroke-width="3" vector-effect="non-scaling-stroke"/></g>`;
      if(l<2)for(let x=cx-r+20;x<=cx+r;x+=64)g+=`<path d="M${x},${r1(yl+16)} V${r1(yl+r*.62-22)}" stroke="var(--rose)" stroke-width="2" stroke-dasharray="2 3"/>`;
      for(let i=0;i<10;i++){const v=(hs(i+l*20)-.5)*120+(o.drift?70:0);const ex=X0+mod(hs(i+l*31)*W+t*v,W),ey=yl-6+(hs(i+l*13)-.5)*14;g+=`<circle cx="${r1(ex)}" cy="${r1(ey)}" r="5" fill="var(--sun)" stroke="#9A6400" stroke-width="1"/>`}}}
  return g}
function ion(x,y,na){return na?`<circle cx="${r1(x)}" cy="${r1(y)}" r="11.5" fill="${PR.strawberry}" stroke="${LINE}" stroke-width="1.1"/><circle cx="${r1(x-4)}" cy="${r1(y-4)}" r="3" fill="#fff" opacity=".5"/>`+T(x,y+5,"+",{a:"middle",s:15,w:700,f:NAVY})
  :`<circle cx="${r1(x)}" cy="${r1(y)}" r="17.5" fill="${PR.lime}" stroke="${LINE}" stroke-width="1.1"/><circle cx="${r1(x-6)}" cy="${r1(y-6)}" r="4" fill="#fff" opacity=".45"/>`+T(x,y+6,"−",{a:"middle",s:19,w:700,f:NAVY})}
function lens(k,cx,cy,r,o,p){const id=p+"clip"+Math.round(cx);return `<clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath><ellipse cx="${r1(cx+r*.35)}" cy="${r1(cy+r*.92)}" rx="${r1(r*.95)}" ry="${r1(r*.16)}" fill="${PAL.shadow}" opacity=".13"/><circle cx="${cx}" cy="${cy}" r="${r+10}" fill="${PAL.steel}" stroke="${RAIL}" stroke-width="1.6"/><path d="M${r1(cx-(r+5)*.8)},${r1(cy-(r+5)*.6)} A${r+5},${r+5} 0 0 1 ${r1(cx-(r+5)*.1)},${r1(cy-(r+5)*.99)}" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="3" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="${o.bg||"#FBFCFE"}"/><g clip-path="url(#${id})">${particles(k,cx,cy,r,{...o,p})}</g><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${RAIL}" stroke-width="2.2"/>`}
const LEG={metal:[["ion","Metal ion"],["e","Free electron"]],ionic:[["na","Na⁺ ion"],["cl","Cl⁻ ion"]],molec:[["mol","Wax molecule"],["weak","Weak force"]],
  poly:[["chain","Polymer chain"],["weak","Weak force"]],net:[["c","Carbon atom"],["bond","Covalent bond"]],layer:[["sheet","Carbon layer"],["e","Free electron"],["weak","Weak force"]]};
function legend(k,x,y,p,col){const items=LEG[M[k].type];let o="";items.forEach(([key,lab],i)=>{const X=col?x:x+i*120,Y=col?y+i*28:y;let sym="";
  if(key==="ion")sym=`<circle cx="${X+9}" cy="${Y}" r="9" fill="url(#${p}g-${k})" stroke="var(--ink)" stroke-width="1.2"/>`;
  else if(key==="e")sym=`<circle cx="${X+9}" cy="${Y}" r="5" fill="var(--sun)" stroke="#9A6400"/>`;
  else if(key==="na")sym=`<circle cx="${X+9}" cy="${Y}" r="7" fill="${PR.strawberry}" stroke="${LINE}"/>`;
  else if(key==="cl")sym=`<circle cx="${X+9}" cy="${Y}" r="9.5" fill="${PR.lime}" stroke="${LINE}"/>`;
  else if(key==="mol")sym=`<path d="M${X},${Y+3} l6,-5 l6,5 l6,-5" fill="none" stroke="#B88A20" stroke-width="3.5" stroke-linejoin="round"/>`;
  else if(key==="weak")sym=`<path d="M${X+9},${Y-9} v18" stroke="var(--rose)" stroke-width="2.4" stroke-dasharray="2 3"/>`;
  else if(key==="chain")sym=`<path d="M${X},${Y} q5,-8 10,0 t10,0" fill="none" stroke="var(--land)" stroke-width="4" stroke-linecap="round"/>`;
  else if(key==="c")sym=`<circle cx="${X+9}" cy="${Y}" r="8" fill="#3B3653"/>`;
  else if(key==="bond")sym=`<path d="M${X},${Y} h20" stroke="#8C88A8" stroke-width="4" stroke-linecap="round"/>`;
  else if(key==="sheet")sym=`<path d="M${X+4},${Y+6} l6,-12 h12 l-6,12z" fill="#E7E9EF" stroke="#4A4F5B" stroke-width="2"/>`;
  o+=sym+T(X+28,Y+4.5,lab,{s:12.5,w:600,f:"var(--body)"})});return o}

function drawZoom(p){const ph=PH(),k=s.mat,m=M[k],ms=meltState(k,s.temp);let o=defs(p);
  const stateTxt=ms==="melted"?"Liquid":ms==="melting"?"Melting":"Solid";
  if(!ph){vb(720,410);o+=F.floor(720,410);
    o+=card(18,18,236,374)+sample(k,136,104,1.45,p);
    o+=`<rect x="36" y="168" width="${r1(Math.min(200,m.tn.length*8.4+28))}" height="28" rx="14" fill="${tintOf(TYPEC[m.type],.72)}" stroke="${TYPEC[m.type]}" stroke-width="1.2"/>`+T(50,187,m.tn,{s:13.5,w:700,f:NAVY});
    o+=T(36,224,m.n,{s:20,w:700,cl:"mf"});
    o+=T(36,250,`${stateTxt} at ${fmt(s.temp)} °C`,{s:14,w:600,f:ms==="solid"?"var(--body)":"#B2412A"});
    o+=legend(k,36,290,p,true);
    o+=`<path d="M200,84 L393,52 M200,126 L393,358" stroke="var(--rose)" stroke-opacity=".45" stroke-width="2" stroke-dasharray="5 6"/>`;
    o+=lens(k,500,205,178,{T:s.temp,t:s.t},p)}
  else{vb(400,560);o+=F.floor(400,560);
    o+=sample(k,62,58,.95,p)+T(118,44,m.n,{s:18,w:700,cl:"mf"});
    o+=`<rect x="118" y="56" width="${r1(Math.min(200,m.tn.length*8.4+28))}" height="26" rx="13" fill="${tintOf(TYPEC[m.type],.72)}" stroke="${TYPEC[m.type]}" stroke-width="1.2"/>`+T(132,74,m.tn,{s:13,w:700,f:NAVY});
    o+=T(118,104,`${stateTxt} at ${fmt(s.temp)} °C`,{s:13.5,w:600,f:ms==="solid"?"var(--body)":"#B2412A"});
    o+=lens(k,200,300,170,{T:s.temp,t:s.t},p);
    o+=legend(k,24,500,p,false).replace(/x="(\d+(\.\d+)?)"/g,(a,b)=>a)}
  return o}

// ---------- conduction
function effState(k,st){if(st==="molten"&&M[k].mp>=3500)return "nomelt";if(st==="dissolved"&&!M[k].sol)return "insol";return st}
function conducts(k,st){const e=effState(k,st);if(M[k].type==="metal"||k==="gra")return true;if(k==="nacl")return e==="molten"||e==="dissolved";return false}
function carriers(k,st){const e=effState(k,st);if(M[k].type==="metal"||k==="gra")return "Delocalised electrons";if(k==="nacl")return e==="molten"||e==="dissolved"?"Ions, free to move":"Ions, held in place";if(k==="dia")return "None: electrons all in bonds";return "None: neutral molecules"}
function circuit(k,st,p,on){const e=effState(k,st),m=M[k];let o="";
  const flow=on?` stroke-dasharray="0.1 14" stroke-dashoffset="${r1(-s.t*40)}"`:"";
  o+=`<path d="M40,44 H16 V112 H120 V142 M100,44 H226 M274,44 H318 V112 H220 V142" fill="none" stroke="#9A5A32" stroke-width="4.4" stroke-linejoin="round" stroke-linecap="round"/><path d="M40,44 H16 V112 H120 V142 M100,44 H226 M274,44 H318 V112 H220 V142" fill="none" stroke="${PAL.copper}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`;
  if(on)o+=`<path d="M318,112 H220 M120,112 H16 V44 H40 M100,44 H226 M274,44 H318 V112" fill="none" stroke="var(--sun)" stroke-width="5"${flow} stroke-linecap="round"/>`;
  o+=F.box(40,30,60,28,{colour:PR.butter,kind:"plastic",d:7,r:7,shadow:false})+`<rect x="100" y="38" width="6" height="12" rx="2" fill="${RAIL}"/>`+T(54,49,"−",{a:"middle",s:17,w:700})+T(88,50,"+",{a:"middle",s:16,w:700});
  if(on)o+=`<circle cx="250" cy="42" r="54" fill="url(#${p}glow)"/>`;
  o+=`<circle cx="250" cy="40" r="22" fill="${on?"#FFE68A":"#F4F7FA"}" stroke="var(--ink)" stroke-width="2"/><path d="M242,44 q8,-13 16,0" fill="none" stroke="${on?"#E08A00":"var(--rose)"}" stroke-width="2"/><rect x="226" y="34" width="10" height="14" rx="2" fill="var(--moon)" stroke="var(--ink)" stroke-width="1.5"/><rect x="264" y="34" width="10" height="14" rx="2" fill="var(--moon)" stroke="var(--ink)" stroke-width="1.5"/>`;
  // container
  if(e==="molten"){o+=[0,1,2].map(i=>`<path d="M${130+i*40},300 q-9,-12 0,-24 q6,8 4,-16 q12,14 6,34z" fill="var(--hot)" opacity=".85"/>`).join("");
    const liq=m.type==="metal"||k==="nacl"?`url(#${p}hot)`:`url(#${p}g-${k})`;
    o+=F.shadow(90,276,160,{len:50,opacity:.14})+`<path d="M74,160 L90,276 H250 L266,160Z" fill="${PAL.steelDark}" stroke="${RAIL}" stroke-width="1.6" stroke-linejoin="round"/><path d="M84,170 L96,262" stroke="#fff" stroke-opacity=".5" stroke-width="2.4" stroke-linecap="round"/><path d="M80,180 L92,266 H248 L260,180Z" fill="${liq}" stroke="var(--ink)" stroke-width="1.2"/>`;
    o+=T(170,240,"molten",{a:"middle",s:13,w:700,f:m.type==="metal"||k==="nacl"?"#7A2A10":"var(--body)"})}
  else if(e==="dissolved"||e==="insol"){o+=`<path d="M80,170 V262 q0,12 12,12 h156 q12,0 12,-12 V170z" fill="url(#${p}water)"/>`;
    if(e==="dissolved")for(let i=0;i<26;i++){const ix=90+mod(hs(i)*150+Math.sin(s.t+i)*6+(i%2?1:-1)*s.t*(on?10:0),150),iy=182+mod(hs(i+40)*86+Math.cos(s.t*.8+i)*5,86),na=i%2===0;
      o+=`<circle cx="${r1(ix)}" cy="${r1(iy)}" r="${na?4:5.5}" fill="${na?"var(--hot)":"var(--land)"}" stroke="var(--ink)" stroke-width=".8"/>`}
    else o+=solidBar(k,p,250);
    o+=F.shadow(92,280,156,{len:50,opacity:.13})+`<path d="M76,150 V264 q0,16 16,16 h156 q16,0 16,-16 V150" fill="#fff" fill-opacity=".15" stroke="#6F9CC2" stroke-width="2.2"/><path d="M86,160 V262" stroke="#fff" stroke-opacity=".85" stroke-width="2.4" stroke-linecap="round"/><path d="M80,170 h180" stroke="#5AA9DE" stroke-width="2"/>`}
  else o+=solidBar(k,p,206);
  o+=F.box(113,134,14,e==="solid"||e==="nomelt"?72:118,{colour:PAL.steel,kind:"metal",d:5,r:2,shadow:false})+F.box(213,134,14,e==="solid"||e==="nomelt"?72:118,{colour:PAL.steel,kind:"metal",d:5,r:2,shadow:false});
  o+=T(102,150,"−",{a:"middle",s:20,w:700})+T(240,150,"+",{a:"middle",s:19,w:700});
  const note=e==="nomelt"?`${m.sh} doesn't melt below about 3500 °C`:e==="insol"?`${m.sh} doesn't dissolve: it's still a solid`:"";
  if(note)o+=T(170,300,note,{a:"middle",s:13,w:600,f:"var(--body)"});
  return o}
function stLabel(k,st){const e=effState(k,st),m=M[k],lc=/^[A-Z]+$/.test(m.sh)?m.sh:m.sh.toLowerCase();return e==="molten"?`Molten ${lc}`:e==="dissolved"?`${m.sh} dissolved in water`:`Solid ${lc}`}
function solidBar(k,p,y){const m=M[k];return F.shadow(96,y+12,160,{len:44,opacity:.14})+`<path d="M96,${y-22} l10,-5.5 h148 l-10,5.5z" fill="${m.top}" stroke="${LINE}" stroke-width="1.2"/><path d="M244,${y-22} l10,-5.5 v34 l-10,5.5z" fill="${m.side}" stroke="${LINE}" stroke-width="1.2"/><rect x="96" y="${y-22}" width="148" height="34" rx="3" fill="url(#${p}g-${k})" stroke="${LINE}" stroke-width="1.4"/><path d="M106,${y-14} h70" stroke="#fff" stroke-opacity=".5" stroke-width="3" stroke-linecap="round"/>`}
function drawConduct(p){const ph=PH(),k=s.mat,on=conducts(k,s.cstate),e=effState(k,s.cstate);let o=defs(p);
  const pst=e==="molten"?"molten":e==="dissolved"?"dissolved":"solid",T0=pst==="molten"?M[k].mp2+80:20;
  const lo={T:T0,t:s.t,state:pst,drift:on};
  const ends=(cx,cy,r)=>`<rect x="${cx-r+2}" y="${cy-r*.55}" width="10" height="${r*1.1}" rx="3" fill="#7C849A" opacity=".9"/><rect x="${cx+r-12}" y="${cy-r*.55}" width="10" height="${r*1.1}" rx="3" fill="#7C849A" opacity=".9"/>`;
  if(!ph){vb(720,400);o+=F.floor(720,400)+card(14,14,350,372);
    o+=`<g transform="translate(18,34)">${circuit(k,s.cstate,p,on)}</g>`+T(189,370,stLabel(k,s.cstate),{a:"middle",s:16,w:700,cl:"mf"});
    o+=`<path d="M300,226 L400,90 M300,256 L400,330" stroke="var(--line)" stroke-width="2" stroke-dasharray="5 5"/>`;
    o+=lens(k,548,206,160,lo,p)+ends(548,206,160)+T(548-160+14,206-160*.55-8,"−",{a:"middle",s:16,w:700})+T(548+160-7,206-160*.55-8,"+",{a:"middle",s:16,w:700});
    o+=pill(548,372,on?"Charges flow: bulb on":"Nothing free to move",on?"good":"none",{w:220,h:24})}
  else{vb(400,640);o+=F.floor(400,640)+card(10,10,380,326);
    o+=`<g transform="translate(30,8)">${circuit(k,s.cstate,p,on)}</g>`+T(200,324,stLabel(k,s.cstate),{a:"middle",s:15,w:700,cl:"mf"});
    o+=lens(k,200,474,138,lo,p)+ends(200,474,138);
    o+=pill(200,616,on?"Charges flow: bulb on":"Nothing free to move",on?"good":"none",{w:220,h:22})}
  return o}

// ---------- hammer test
function drawHammer(p){const ph=PH(),W=ph?400:720,H=ph?400:380,metal=s.hamMat==="metal",sh=s.shift;let o=defs(p);vb(W,H);
  o+=F.floor(W,H);
  const cols=ph?5:9,sp=ph?52:60,rows=4,x0=ph?112:W/2-(cols-1)*sp/2+30,yb=H-(ph?56:70),cracked=!metal&&sh>=.9;
  const lift=cracked?24:0,tilt=cracked?-5:0,dx=sh*sp;
  const rowY=j=>yb-j*sp*.92;
  // base slab
  o+=F.box(x0-sp*.75,yb+sp*.42,(cols-1)*sp+sp*1.5,14,{colour:PAL.steel,kind:"metal",d:12,r:4,shadowLen:60});
  let fixed="",moving="",fx="";
  const ionAt=(x,y,i,j)=>metal?`<circle cx="${r1(x)}" cy="${r1(y)}" r="21" fill="url(#${p}g-cu)" stroke="var(--ink)" stroke-width="1.5"/>`+T(x,y+6.5,"+",{a:"middle",s:19,w:700}):ion2(x,y,mod(i+j,2)===0);
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const x=x0+i*sp,y=rowY(j);if(j<2)fixed+=ionAt(x,y,i,j);else moving+=ionAt(x+dx,y,i,j)}
  if(metal){let e="";const xa=x0-sp*.6,xb=x0+(cols-1)*sp+sp*.6+dx;for(let i=0;i<cols*rows*1.6;i++){const ex=xa+hs(i)*(xb-xa),ey=rowY(3)-sp*.5+hs(i+50)*(sp*.92*3+sp);
      if(ey<rowY(1)-sp*.46&&ex<x0-sp*.5+dx)continue;e+=`<circle cx="${r1(ex)}" cy="${r1(ey)}" r="5.5" fill="var(--sun)" stroke="#9A6400" stroke-width="1"/>`}
    o+=fixed+`<g>${moving}</g>`+e}
  else{
    // forces across the interface between row 1 (fixed) and row 2 (moving)
    for(let i=0;i<cols;i++){const xm=x0+i*sp+dx,jf=Math.round(i+sh);if(jf<0||jf>=cols)continue;const xf=x0+jf*sp,same=mod(i+2,2)===mod(jf+1,2),ya=rowY(1),yb2=rowY(2);
      const near=1-Math.abs((i+sh)-jf);if(near<.35)continue;
      if(same&&sh>.45){const op=r1(clamp((sh-.45)/.4,0,1));fx+=`<g opacity="${op}" stroke="var(--warn)" stroke-width="3" stroke-linecap="round" fill="none"><path d="M${r1(xm)},${r1(yb2+24-lift)} v${-14} m-6,6 l6,-6 l6,6"/><path d="M${r1(xf)},${r1(ya-24)} v14 m-6,-6 l6,6 l6,-6"/></g>`}
      else if(!same&&sh<.4)fx+=`<path d="M${r1(xm)},${r1(yb2+20)} L${r1(xf)},${r1(ya-20)}" stroke="var(--good)" stroke-width="2.5" stroke-dasharray="3 4" opacity=".8"/>`}
    o+=fixed+`<g transform="translate(0,${-lift}) rotate(${tilt} ${x0} ${rowY(2)})">${moving}</g>`+fx;
    if(cracked){let d=`M${x0-sp*.7},${r1(rowY(1)-sp*.46)}`;for(let i=0;i<=cols*2;i++)d+=` L${r1(x0-sp*.7+i*sp/2)},${r1(rowY(1)-sp*.46+(i%2?9:-9))}`;o+=`<path d="${d}" fill="none" stroke="var(--warn)" stroke-width="3.5" stroke-linejoin="round"/>`}}
  // hammer pushing the top layers
  const hx=x0-sp*.62+dx,hy=(rowY(2)+rowY(3))/2-lift;
  o+=`<g transform="translate(${r1(hx)},${r1(hy)})"><rect x="-64" y="-8" width="44" height="16" rx="5" fill="#D69A5C" stroke="var(--ink)" stroke-width="1.5"/><rect x="-24" y="-30" width="26" height="60" rx="6" fill="url(#${p}steel)" stroke="var(--ink)" stroke-width="1.8"/></g>`;
  o+=`<path d="M${r1(hx-90)},${r1(hy-44)} h40 m-8,-6 l8,6 l-8,6" fill="none" stroke="var(--rose)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
  const title=metal?"Metal: layers slide":"Ionic: like charges meet";
  o+=T(20,32,title,{s:ph?17:19,w:700,cl:"mf"});
  const st=metal?["Still bonded","good"]:cracked?["Cracked!","bad"]:sh>.45?["Like charges repel","sun"]:["Holding together","none"];
  o+=ph?pill(20+80,46,st[0],st[1],{w:160,h:26,s:13}):pill(W-20-90,14,st[0],st[1],{w:180,h:28,s:13.5});
  return o}
function ion2(x,y,na){return na?`<circle cx="${r1(x)}" cy="${r1(y)}" r="15" fill="${PR.strawberry}" stroke="${LINE}" stroke-width="1.2"/><circle cx="${r1(x-5)}" cy="${r1(y-5)}" r="3.6" fill="#fff" opacity=".5"/>`+T(x,y+6,"+",{a:"middle",s:18,w:700,f:NAVY})
  :`<circle cx="${r1(x)}" cy="${r1(y)}" r="22" fill="${PR.lime}" stroke="${LINE}" stroke-width="1.2"/><circle cx="${r1(x-7)}" cy="${r1(y-7)}" r="5" fill="#fff" opacity=".45"/>`+T(x,y+7,"−",{a:"middle",s:22,w:700,f:NAVY})}

// ---------- job icons (drawn in a 60 x 60 box centred on 0,0)
const ICON={
  wire:`<path d="M-22,14 C-30,-8 -6,-20 4,-6 S26,10 20,-14" fill="none" stroke="#C8743F" stroke-width="7" stroke-linecap="round"/><path d="M-22,14 C-30,-8 -6,-20 4,-6 S26,10 20,-14" fill="none" stroke="#F4B27F" stroke-width="2.5" stroke-linecap="round"/><rect x="12" y="-28" width="16" height="12" rx="3" fill="var(--ink)"/><path d="M16,-28 v-6 M24,-28 v-6" stroke="var(--ink)" stroke-width="2.4"/>`,
  drill:`<rect x="-26" y="-8" width="22" height="16" rx="3" fill="var(--sea)" stroke="var(--ink)" stroke-width="1.5"/><path d="M-4,-5 H18 L26,0 L18,5 H-4Z" fill="#C9D2DC" stroke="var(--ink)" stroke-width="1.5"/><path d="M2,-5 l5,10 M9,-5 l5,10" stroke="var(--ink)" stroke-width="1.2"/><path d="M24,-3 l6,3 l-6,3z" fill="#BFEFFB" stroke="var(--ink)"/>`,
  pencil:`<g transform="rotate(-35)"><rect x="-26" y="-6" width="38" height="12" fill="var(--sun)" stroke="var(--ink)" stroke-width="1.5"/><path d="M12,-6 L26,0 L12,6Z" fill="#F4D3A8" stroke="var(--ink)" stroke-width="1.5"/><path d="M21,-2 L26,0 L21,2Z" fill="#3A3E47"/><rect x="-32" y="-6" width="6" height="12" fill="#FF8FA3" stroke="var(--ink)" stroke-width="1.5"/></g>`,
  board:`<rect x="-26" y="-16" width="48" height="32" rx="8" fill="#E6F2FA" stroke="var(--ink)" stroke-width="1.6"/><circle cx="14" cy="-7" r="3.5" fill="#fff" stroke="var(--ink)" stroke-width="1.3"/><path d="M-16,8 L10,-2" stroke="#9AA7B6" stroke-width="5" stroke-linecap="round"/><path d="M10,-2 l12,-5" stroke="var(--ink)" stroke-width="4" stroke-linecap="round"/>`,
  candle:`<rect x="-10" y="-6" width="20" height="30" rx="3" fill="#FFF0C2" stroke="var(--ink)" stroke-width="1.6"/><path d="M0,-6 v-6" stroke="var(--ink)" stroke-width="2"/><path d="M0,-30 q8,10 0,18 q-8,-8 0,-18z" fill="var(--sun)" stroke="#D97706" stroke-width="1.3"/>`,
  can:`<rect x="-13" y="-24" width="26" height="48" rx="6" fill="var(--hot)" stroke="var(--ink)" stroke-width="1.6"/><rect x="-13" y="-4" width="26" height="12" fill="#fff" opacity=".8"/><ellipse cx="0" cy="-24" rx="13" ry="3.5" fill="#E2E8EF" stroke="var(--ink)" stroke-width="1.3"/>`,
  deice:`<path d="M-28,18 L-8,-14 H8 L28,18Z" fill="#5B5670" stroke="var(--ink)" stroke-width="1.5"/><path d="M0,-12 v6 M0,0 v6 M0,12 v5" stroke="#fff" stroke-width="2.4"/><path d="M-18,-22 l4,4 m0,-4 l-4,4 M14,-24 l4,4 m0,-4 l-4,4" stroke="var(--sea)" stroke-width="2"/>${[[-14,10],[-6,4],[12,8],[18,14],[-20,15]].map(([a,b])=>`<rect x="${a}" y="${b}" width="3.5" height="3.5" fill="#fff" stroke="var(--ink)" stroke-width=".6"/>`).join("")}`,
  handle:`<ellipse cx="-8" cy="4" rx="20" ry="12" fill="#5B5670" stroke="var(--ink)" stroke-width="1.6"/><ellipse cx="-8" cy="2" rx="15" ry="8" fill="#7C7896"/><rect x="10" y="-2" width="22" height="8" rx="4" transform="rotate(-12 10 2)" fill="#3A3E47" stroke="var(--ink)" stroke-width="1.5"/><path d="M-14,-14 q-4,-6 0,-12 M-4,-14 q-4,-6 0,-12" fill="none" stroke="var(--hot)" stroke-width="2" stroke-linecap="round"/>`
};
function jobTile(x,y,w,h,j,on,small){return `<g data-act="job:${j.id}">${depth(x,y,w,h,5,on?TINT:"#FFFFFF",TD,false)}<rect class="hov" x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="${on?TINT:"#FFFFFF"}" fill-opacity="${on?.9:.82}" stroke="${on?"var(--acc)":TD}" stroke-width="${on?3:1.1}"/><g transform="translate(${x+w/2},${y+(small?h/2-6:h*.42)}) scale(${small?.72:.8})">${ICON[j.id]}</g>${T(x+w/2,y+h-9,j.n.replace("Frying-pan handle","Pan handle").replace("De-icing roads","De-icing").replace("Electrical wire","Wire").replace("Chopping board","Board").replace("Drill bit tip","Drill tip").replace("Pencil “lead”","Pencil"),{a:"middle",s:11.5,w:700,f:on?"var(--ink)":"var(--body)"})}</g>`}
function needsList(x,y,w,j,k,rowH){const f=fitOf(j.id,k);let o="";
  j.need.forEach((nd,i)=>{const r=f.res[i],Y=y+i*rowH;o+=`<rect x="${x}" y="${Y}" width="${w}" height="${rowH-8}" rx="12" fill="${r===null?"var(--paper)":r?"#E5F6EE":"#FFF0EC"}" stroke="${r===null?"var(--line)":"none"}"/>`;
    o+=`<circle cx="${x+20}" cy="${Y+(rowH-8)/2}" r="11" fill="${r===null?"var(--fill)":r?"var(--good)":"var(--warn)"}"/>`+(r===null?"":r?`<path d="M${x+14},${Y+(rowH-8)/2} l4,4 l8,-8" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`:`<path d="M${x+15},${Y+(rowH-8)/2-5} l10,10 m0,-10 l-10,10" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>`);
    o+=T(x+40,Y+(rowH-8)/2+4.5,nd[0],{s:13,w:600,f:"var(--ink)"})});
  return {svg:o,f}}
function drawUse(p){const ph=PH(),j=JOB(s.job),k=s.picks[s.job]||"";let o=defs(p);
  const fitBar=(x,y,w,f)=>{const pc=f.n?f.pass/f.n:0;return `<rect x="${x}" y="${y}" width="${w}" height="14" rx="7" fill="var(--fill)"/><rect x="${x}" y="${y}" width="${r1(w*pc)}" height="14" rx="7" fill="${f.full?"var(--good)":pc>=.5?"var(--sun)":"var(--warn)"}"/>`};
  const verdict=f=>!k?"Pick a material":f.full?"Perfect fit":j.id==="handle"?"No perfect fit here":f.pass>=f.n-1?"Close, but not quite":"Poor fit";
  if(!ph){vb(720,470);o+=F.floor(720,470);
    JOBS.forEach((jj,i)=>o+=jobTile(10+i*88.5,10,82,78,jj,jj.id===s.job));
    o+=card(14,102,200,276)+`<g transform="translate(114,190) scale(2)">${ICON[j.id]}</g>`+T(114,300,j.n,{a:"middle",s:17,w:700,cl:"mf"})+T(114,324,`needs ${j.need.length} things`,{a:"middle",s:13,w:600,f:"var(--rose)"});
    o+=T(232,246,"+",{a:"middle",s:30,w:700,f:"var(--rose)"});
    o+=card(250,102,170,276,{st:k?"var(--line)":"var(--rose)"})+(k?"":`<rect x="250" y="102" width="170" height="276" rx="18" fill="none" stroke="var(--paper)" stroke-width="2" stroke-dasharray="7 7"/>`)+(k?sample(k,335,206,1.25,p)+T(335,300,M[k].sh,{a:"middle",s:17,w:700,cl:"mf"})+T(335,324,M[k].tn,{a:"middle",s:13,w:600,f:TYPEC[M[k].type]}):T(335,232,"?",{a:"middle",s:48,w:700,f:"var(--rose)",cl:"mf"})+T(335,276,"pick a material",{a:"middle",s:13,w:600,f:"var(--rose)"}));
    const nl=needsList(436,102,270,j,k,j.need.length>3?54:62);o+=nl.svg;
    o+=T(436,352,verdict(nl.f),{s:15,w:700,cl:"mf",f:nl.f.full?"var(--good)":"var(--ink)"})+T(706,352,k?`${nl.f.pass} of ${nl.f.n}`:"",{a:"end",s:14,w:700})+fitBar(436,362,270,nl.f);
    ORDER.forEach((m,i)=>o+=tile(14+i*99,394,92,66,m,k,"pick",p,{sc:.48,fs:12}))}
  else{const HH=418+j.need.length*46+44;vb(400,HH);o+=F.floor(400,HH);
    JOBS.forEach((jj,i)=>o+=jobTile(8+(i%4)*97,8+Math.floor(i/4)*80,91,74,jj,jj.id===s.job,true));
    o+=card(8,172,188,170)+`<g transform="translate(102,232) scale(1.45)">${ICON[j.id]}</g>`+T(102,306,j.n,{a:"middle",s:15,w:700,cl:"mf"})+T(102,326,`needs ${j.need.length} things`,{a:"middle",s:12,w:600,f:"var(--rose)"});
    o+=card(204,172,188,170,{st:k?"var(--line)":"var(--rose)"})+(k?"":`<rect x="204" y="172" width="188" height="170" rx="18" fill="none" stroke="var(--paper)" stroke-width="2" stroke-dasharray="7 7"/>`)+(k?sample(k,298,240,1,p)+T(298,306,M[k].sh,{a:"middle",s:15,w:700,cl:"mf"})+T(298,326,M[k].tn,{a:"middle",s:12,w:600,f:TYPEC[M[k].type]}):T(298,250,"?",{a:"middle",s:44,w:700,f:"var(--rose)",cl:"mf"})+T(298,290,"pick a material",{a:"middle",s:13,w:600,f:"var(--rose)"}));
    ORDER.forEach((m,i)=>o+=tile(8+i*55.5,352,50,52,m,k,"pick",p,{sc:.36,nolab:true}));
    const nl=needsList(8,418,384,j,k,46);o+=nl.svg;
    const yy=418+j.need.length*46+16;o+=T(8,yy,verdict(nl.f),{s:15,w:700,cl:"mf",f:nl.f.full?"var(--good)":"var(--ink)"})+T(392,yy,k?`${nl.f.pass} of ${nl.f.n}`:"",{a:"end",s:14,w:700})+fitBar(8,yy+10,384,nl.f)}
  return o}

// ---------- power lines
function pylon(x,g,top){const h=g-top;return F.shadow(x-20,g,40,{len:30,opacity:.13})+`<g stroke="${RAIL}" stroke-width="2.2" fill="none" stroke-linejoin="round"><path d="M${x-20},${g} L${x-6},${top} M${x+20},${g} L${x+6},${top}"/>${[0,1,2,3].map(i=>{const y1=g-i*h/4,y2=g-(i+1)*h/4,w1=20-14*i/4,w2=20-14*(i+1)/4;return `<path d="M${r1(x-w1)},${r1(y1)} L${r1(x+w2)},${r1(y2)} M${r1(x+w1)},${r1(y1)} L${r1(x-w2)},${r1(y2)}" stroke-width="1.2"/>`}).join("")}<path d="M${x-34},${top+8} H${x+34}" stroke-width="3"/><path d="M${x-30},${top+8} v8 M${x+30},${top+8} v8" stroke-width="2"/></g>`}
function lineScene(x0,y0,W,k,p,ph){const kgkm=KGKM(k),maxkg=KGKM("cu"),sag=14+40*kgkm/maxkg,dia=DIAM(k),col=k==="cu"?"#C8743F":"#8E9AAA";let o="";
  const g=y0+150,top=y0+44,xa=x0+(ph?40:250),xb=x0+W-40;
  o+=`<path d="M${x0},${g} H${x0+W}" stroke="${TD}" stroke-opacity=".55" stroke-width="2" stroke-linecap="round"/>`;
  o+=pylon(xa,g,top)+pylon(xb,g,top);
  const y1=top+16,mx=(xa+xb)/2;o+=`<path d="M${xa+30},${y1} Q${mx},${r1(y1+2*sag)} ${xb-30},${y1}" fill="none" stroke="${col}" stroke-width="${r1(dia*.3)}" stroke-linecap="round"/>`;
  o+=`<path d="M${mx},${y1} V${r1(y1+sag)}" stroke="var(--rose)" stroke-width="1.6" stroke-dasharray="3 3"/>`+T(mx+8,y1+sag/2+4,"sag",{s:11.5,w:600,f:"var(--rose)"});
  return o}
function lineInfo(x,y,k,p,ph){const m=M[k],kg=KGKM(k),A=AREA(k)*1e6,d=DIAM(k);let o="";
  o+=T(x,y+22,m.n,{s:18,w:700,cl:"mf"})+T(x,y+42,`${m.rhoT} g/cm³`,{s:13,w:600,f:"var(--rose)"});
  o+=`<circle cx="${x+22}" cy="${y+76}" r="${r1(d*1.1)}" fill="${k==="cu"?"#E59562":"#C3CCD7"}" stroke="var(--ink)" stroke-width="1.6"/>`+T(x+52,y+72,`${fmt(A)} mm²`,{s:13,w:700})+T(x+52,y+90,"cable area",{s:11.5,w:600,f:"var(--rose)"});
  const bw=(ph?150:170)*kg/KGKM("cu");o+=`<rect x="${x}" y="${y+108}" width="${r1(bw)}" height="14" rx="7" fill="${k==="cu"?"#E59562":"#AEB9C6"}"/>`+T(x,y+140,`${fmt(kg/1000*s.len,1)} t for ${s.len} km`,{s:13,w:700});
  return o}
function drawTrade(p){const ph=PH();let o=defs(p);
  if(!ph){vb(720,400);o+=F.floor(720,400);
    ["cu","al"].forEach((k,i)=>{const y=12+i*192;const pick=s.line===k;o+=`<g data-act="line:${k}">`+card(10,y,700,180,{st:pick?"var(--acc)":"var(--line)",sw:pick?3:1.5})+lineInfo(28,y+4,k,p,false)+lineScene(14,y+6,692,k,p,false)+`</g>`})}
  else{vb(400,540);o+=F.floor(400,540);
    ["cu","al"].forEach((k,i)=>{const y=8+i*266;const pick=s.line===k;o+=`<g data-act="line:${k}">`+card(8,y,384,256,{st:pick?"var(--acc)":"var(--line)",sw:pick?3:1.5})+lineInfo(24,y+2,k,p,true).replace(/<rect x="24" y="\d+(\.\d+)?" width/,m=>m)+`<g transform="translate(0,${92})">${lineScene(8,y+12,384,k,p,true)}</g>`+`</g>`})}
  return o}

// ---------- test dashboard
const passConduct=()=>s.mat==="nacl"&&(s.cstate==="molten"||s.cstate==="dissolved");
const passHammer=()=>s.hamMat==="ionic"&&s.shift>=.9;
const fullJobs=()=>JOBS.filter(j=>fitOf(j.id,s.picks[j.id]).full).length;
const passLine=()=>s.line==="al"&&s.why==="light";
function drawTest(p){const ph=PH();let o=defs(p);
  const items=[["conduct","Molten or dissolved",passConduct(),`<g transform="scale(.9)"><circle cx="0" cy="-10" r="22" fill="${passConduct()?"#FFE68A":"#F4F7FA"}" stroke="var(--ink)" stroke-width="2"/><rect x="-9" y="12" width="18" height="12" rx="3" fill="var(--moon)" stroke="var(--ink)" stroke-width="1.5"/></g>`],
    ["hammer","Shatter the crystal",passHammer(),`<g transform="scale(.62)">${[[-24,-24,1],[24,-24,0],[-24,24,0],[24,24,1]].map(([a,b,na])=>ion2(a+(b<0&&passHammer()?18:0),b-(b<0&&passHammer()?14:0),na)).join("")}${passHammer()?`<path d="M-50,-4 l12,-6 l12,6 l12,-6 l12,6 l12,-6 l12,6 l12,-6 l12,6" fill="none" stroke="var(--warn)" stroke-width="4"/>`:""}</g>`],
    ["use","Three perfect fits",fullJobs()>=3,`<g transform="translate(-34,0) scale(.55)">${ICON.wire}</g><g transform="scale(.55)">${ICON.drill}</g><g transform="translate(34,0) scale(.55)">${ICON.candle}</g>`],
    ["tradeoff","Power-line metal",passLine(),`<g transform="scale(.62)">${pylon(-54,40,-40)}${pylon(54,40,-40)}<path d="M-24,-24 Q0,-6 24,-24" fill="none" stroke="${passLine()?"#8E9AAA":"#C8743F"}" stroke-width="5"/></g>`]];
  const tileT=(x,y,w,h,it,i)=>{const [k,lab,ok,art]=it;return `<g data-act="go:${k}">`+card(x,y,w,h,{st:ok?"var(--good)":"var(--line)",sw:ok?3:1.5,f:ok?"#F2FBF7":"var(--paper)"})+
    `<circle cx="${x+24}" cy="${y+24}" r="14" fill="var(--acc)"/>`+T(x+24,y+29,String(i+1),{a:"middle",s:14,w:700,f:"#fff"})+
    `<g transform="translate(${x+w/2},${y+h*.42})">${art}</g>`+T(x+w/2,y+h-52,lab,{a:"middle",s:12.5,w:700})+pill(x+w/2,y+h-38,ok?"Done ✓":"Not yet",ok?"good":"none",{w:96,h:24})+`</g>`};
  if(!ph){vb(720,250);o+=F.floor(720,250);items.forEach((it,i)=>o+=tileT(10+i*177,14,168,222,it,i))}
  else{vb(400,460);o+=F.floor(400,460);items.forEach((it,i)=>o+=tileT(8+(i%2)*196,8+Math.floor(i/2)*224,188,214,it,i))}
  return o}

// ---------- the close-up: a property card for a material (or cable cross-sections)
function propCard(k,p){const m=M[k];let o=defs(p)+F.floor(420,300)+card(10,10,400,280);
  o+=`<path d="M10,28 a18,18 0 0 1 18,-18 h364 a18,18 0 0 1 18,18 v26 h-400z" fill="${TINT}" stroke="${TD}" stroke-width="1.2"/><circle cx="32" cy="36.5" r="6" fill="${TYPEC[m.type]}"/>`+T(44,41,m.tn.toUpperCase(),{s:13,w:700,f:NAVY,ls:".06em"})+T(394,41,m.n,{a:"end",s:15,w:700,f:NAVY,cl:"mf"});
  o+=`<circle cx="84" cy="150" r="58" fill="#fff" fill-opacity=".8" stroke="${TD}" stroke-opacity=".5"/>`+sample(k,84,152,1.2,p);
  // density bar 0–10 with water line
  const X=170,Wd=220,dx=v=>X+Wd*Math.min(v,10)/10;
  o+=T(X,86,"Density",{s:12,w:700,f:"var(--rose)"})+T(X+Wd,86,`${m.rhoT} g/cm³`,{a:"end",s:12.5,w:700});
  o+=`<rect x="${X}" y="94" width="${Wd}" height="12" rx="6" fill="var(--fill)"/>`+ORDER.map(q=>`<circle cx="${r1(dx(M[q].rho))}" cy="100" r="3" fill="var(--rose)" opacity=".45"/>`).join("")+`<rect x="${X}" y="94" width="${r1(dx(m.rho)-X)}" height="12" rx="6" fill="${PR.blueberry}"/><path d="M${r1(dx(1))},89 v22" stroke="#5AA9DE" stroke-width="2" stroke-dasharray="2 2"/>`+T(dx(1)+3,122,"water",{s:10.5,w:600,f:"#3B86B8"});
  // melting point scale 0–1200, arrow beyond
  const my=150,mx=v=>X+Wd*Math.min(v,1200)/1200;
  o+=T(X,my-8,"Melts",{s:12,w:700,f:"var(--rose)"})+T(X+Wd,my-8,m.mpT,{a:"end",s:12.5,w:700});
  o+=`<rect x="${X}" y="${my}" width="${Wd}" height="12" rx="6" fill="var(--fill)"/><rect x="${X}" y="${my}" width="${r1(mx(m.mp)-X)}" height="12" rx="6" fill="${PR.strawberry}"/>`+(m.mp>1200?`<path d="M${X+Wd+2},${my+6} l8,0 m-4,-4 l4,4 l-4,4" stroke="var(--hot)" stroke-width="2" fill="none"/>`:"");
  // four badges
  const B=[["Conducts",m.elec?"yes, as a solid":k==="nacl"?"molten/dissolved":"no",m.elec],["Hammer",m.ham,m.mall||k==="hdpe"],["Water",m.sol?"dissolves":m.rho<1?"floats":"sinks",m.sol],["Held by",m.force.replace(" (strong)",""),/strong/.test(m.force)||m.type==="net"]];
  B.forEach(([a,b,on],i)=>{const bx=X-6+(i%2)*118,by=186+Math.floor(i/2)*48;o+=`<rect x="${bx}" y="${by}" width="114" height="42" rx="12" fill="${on?"#E8F3FC":"var(--paper)"}" stroke="var(--line)"/>`+T(bx+10,by+16,a,{s:10.5,w:700,f:"var(--rose)",ls:".04em"})+T(bx+10,by+33,b.length>17?b.slice(0,16)+"…":b,{s:12,w:700})});
  return o}
function emptyCard(p){return defs(p)+F.floor(420,300)+card(10,10,400,280,{st:"var(--rose)"})+`<rect x="10" y="10" width="400" height="280" rx="18" fill="none" stroke="var(--chalk)" stroke-width="2" stroke-dasharray="8 8"/>`+T(210,140,"?",{a:"middle",s:56,w:700,f:"var(--rose)",cl:"mf"})+T(210,188,"Pick a material to see its property card",{a:"middle",s:14,w:600,f:"var(--body)"})}
function crossCard(p){let o=defs(p)+F.floor(420,300)+card(10,10,400,280)+T(26,40,"Same resistance, different cables",{s:15,w:700,cl:"mf"});
  ["cu","al"].forEach((k,i)=>{const cx=110+i*200,d=DIAM(k),r=d*3.2,A=AREA(k)*1e6,kg=KGKM(k);
    o+=`<circle cx="${cx}" cy="128" r="${r1(r)}" fill="${k==="cu"?"#E59562":"#C3CCD7"}" stroke="var(--ink)" stroke-width="2"/>`+T(cx,128+5,`${fmt(d,1)} mm`,{a:"middle",s:12.5,w:700})+
      T(cx,206,M[k].n,{a:"middle",s:15,w:700,cl:"mf"})+T(cx,226,`${fmt(A)} mm² · ${fmt(DEN[k]/1000,2)} g/cm³`,{a:"middle",s:12,w:600,f:"var(--body)"})+T(cx,256,`${fmt(kg)} kg per km`,{a:"middle",s:15,w:700,f:k==="al"?"var(--good)":"var(--ink)"})});
  o+=T(210,284,`aluminium: ${fmt(AREA("al")/AREA("cu"),2)}× the area, ${fmt(KGKM("al")/KGKM("cu")*100)}% of the mass`,{a:"middle",s:11.5,w:600,f:"var(--rose)"});
  return o}

// ---------- exam lines that follow the material
const ZOOMX={metal:k=>`${M[k].n} is made of positive metal ions in a sea of delocalised electrons. The strong attraction between the ions and electrons acts in all directions, so a lot of energy is needed to separate the particles and it melts at a high temperature (${M[k].mpT}).`,
  ionic:()=>"Sodium chloride is a lattice of Na⁺ and Cl⁻ ions held by strong ionic bonds in all directions, so a lot of energy is needed to separate the ions and it melts at 801 °C.",
  molec:()=>"Paraffin wax is made of separate molecules. The forces between the molecules are weak, so little energy is needed to separate them and it melts at only about 46–68 °C.",
  poly:()=>"Polyethylene is made of very long chain molecules. Strong covalent bonds hold each chain together, but the forces between the chains are weak, so it softens and melts at about 130 °C.",
  net:()=>"In diamond every carbon atom is covalently bonded to four others in a 3D network. Melting would mean breaking many strong covalent bonds, so it is very hard and doesn't melt below about 3500 °C.",
  layer:()=>"Graphite is made of layers of carbon atoms, each covalently bonded to three others, with weak forces between the layers. The layers slide easily, so graphite is soft and slippery."};
const CONDX={metal:k=>`${M[k].n} conducts as a solid and when molten because its delocalised electrons are free to move through the structure and carry the current.`,
  ionic:()=>"Solid sodium chloride doesn't conduct because its ions are held in fixed positions. When it is molten or dissolved in water the ions are free to move, so it conducts.",
  molec:()=>"Paraffin wax doesn't conduct, solid or molten, because it is made of neutral molecules: there are no charged particles free to move.",
  poly:()=>"Polyethylene doesn't conduct because its long chain molecules are neutral: there are no charged particles free to move, which is why it's used as an insulator.",
  net:()=>"Diamond doesn't conduct because each carbon uses all four outer electrons in covalent bonds, so there are no free electrons or ions to carry a current.",
  layer:()=>"Graphite conducts because each carbon bonds to only three others, leaving one delocalised electron per atom that can move along the layers."};
let lastExam="";
function setExam(t){if(t===lastExam)return;const el=$("k-exam");if(el){el.textContent=t;lastExam=t}}

// ---------- steps
const steps=[
  {k:"bench",lab:"Test bench",cap:"Pick a sample and run four quick tests: does it conduct, melt, bend or dissolve?",speed:1,controls:["play","mat","temp"],chips:["type","rho","mp","elec","water","ham"],
    exam:"Copper conducts and bends without breaking because it is a metal. Sodium chloride doesn't conduct as a solid and shatters when hit because it is ionic.",
    trap:"Dense doesn't mean hard: diamond is only 3.51 g/cm³ but it's the hardest natural material.",
    big:"Every property comes from the particles and how strongly they're held together."},
  {k:"zoom",lab:"Zoom in",cap:"Zoom right in to the particles. Turn up the heat: they vibrate harder, then break free and melt.",speed:1,controls:["play","mat","temp"],chips:["type","parts","force","state"],
    exam:ZOOMX.metal("cu"),trap:"Melting a molecular solid doesn't break the bonds inside molecules, only the weak forces between them.",
    big:"Strong forces in all directions mean a high melting point; weak forces between molecules mean a low one."},
  {k:"conduct",lab:"Why it conducts",cap:"A current needs charged particles that are free to move. Change the state and watch what flows.",speed:1,controls:["play","mat","cstate"],chips:["carriers","free","bulb"],
    exam:CONDX.metal("cu"),trap:"Dissolved salt conducts because its ions move, not because of free electrons.",
    big:"No charged particles free to move means no current."},
  {k:"hammer",lab:"Hammer test",cap:"Push the top layers along. Metal layers slide and stay bonded; ionic layers line up like charges and crack.",controls:["hamMat","shift"],chips:["lattice","push","result"],
    exam:"Metals are malleable because layers of ions can slide over each other while the delocalised electrons keep holding them together. Ionic solids are brittle: when a layer shifts, ions with the same charge line up, repel, and the crystal splits.",
    trap:"Hard isn't the same as tough: diamond is the hardest material, but a sharp blow can chip it.",
    big:"Metallic bonding doesn't point in one direction, so metal layers can slide without breaking."},
  {k:"use",lab:"Pick for the job",cap:"Choose a job, then the material whose properties fit it best. Watch the ticks.",controls:["job","pick"],chips:["job","pick","fit"],
    exam:JOBS[0].ex,trap:"Don't just name a property: link it to the particles, then to the job.",
    big:"Property, particles, use: an Excellence answer explains all three links."},
  {k:"tradeoff",lab:"Trade-off",cap:"Same resistance, two metals. Aluminium needs a thicker cable, but it's about half the weight.",controls:["len","line","why"],chips:["cuM","alM","R","area"],
    exam:"Copper conducts better, but aluminium's density is only 2.70 g/cm³ compared with 8.96 g/cm³. For the same resistance an aluminium cable has about half the mass, so it sags less, pylons can be further apart and it costs less. Real lines wrap aluminium strands around a steel core for strength.",
    trap:"The best conductor isn't automatically the best choice: weigh up mass, cost and strength too.",
    big:"Evaluating means weighing more than one property against the job."},
  {k:"test",lab:"Test yourself",cap:"Four challenges. Use the controls here or go back to any step: your choices carry over.",controls:["mat","cstate","hamMat","shift","job","pick","line","why"],chips:["done"],
    exam:"For an evaluate question: name the property the use needs, explain it with the particles and forces, then weigh up a trade-off.",
    trap:"Saying “it's strong” isn't enough: say which particles, which forces, and what that means for the job.",
    big:"Structure decides properties; properties decide uses."}
];

// ---------- the 3D bench (../kit3d.js): one materials lab with six zones the camera flies between. A test bench (circuit,
// hotplate, swinging hammer, beaker), a particle zoom in an acrylic cube over a hotplate, a conduction rig with its own
// particle lens, a sliding-layer lattice you push with a block, a job bench, and two overhead lines. Every zone reads the same
// state the drawing and the challenges use (s.mat, s.temp, s.cstate, s.hamMat, s.shift, s.job, s.picks, s.len, s.line).
function materials3d(S){const {THREE,mat,PAL}=S;const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
  const mtx=new THREE.Matrix4(),TOP=.3,UP=V3(0,1,0),qq=new THREE.Quaternion(),tmp=new THREE.Vector3(),tv=new THREE.Vector3();
  const ZB=V3(-11.5,0,-6.2),ZZ=V3(0,0,-6.2),ZC=V3(11.2,0,-6.2),ZH=V3(-11.5,0,6.4),ZU=V3(0,0,6.4),ZT=V3(11.5,0,6.4);
  const plinth=(c,w,d,tint)=>{const p=S.rbox(w,.3,d,.12,mat("plastic",tint,{rough:.55,coat:.2}));p.position.set(c.x,.15,c.z);S.scene.add(p);return p};
  const pB=plinth(ZB,11.2,6.2,PAL.case.mint),pZ=plinth(ZZ,8.4,6.2,PAL.case.lavender),pC=plinth(ZC,9.6,6.2,PAL.case.sky),
    pH=plinth(ZH,10.2,6.2,PAL.case.lavender),pU=plinth(ZU,9.6,6.4,PAL.case.mint),pT=plinth(ZT,10.6,6.4,PAL.case.sky);
  const zoneG=c=>{const g=S.group();g.position.set(c.x,TOP,c.z);return g};
  const white=mat("plastic","#ffffff",{rough:.35}),ink=mat("plastic",PAL.ink,{rough:.4}),steel=mat("metal",PAL.steel,{rough:.3}),steelD=mat("metal",PAL.steelDark,{rough:.35}),copperM=mat("metal",PAL.copper,{rough:.28});
  const addGlowM=(c,o)=>new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:o??0,depthWrite:false,blending:THREE.AdditiveBlending});
  const putBond=(sw,i,ax,ay,az,bx,by,bz,r)=>{tv.set(bx-ax,by-ay,bz-az);const L=tv.length()||1e-3;qq.setFromUnitVectors(UP,tv.multiplyScalar(1/L));sw.putS(i,(ax+bx)/2,(ay+by)/2,(az+bz)/2,r,L,r,qq)};
  const wrap=(v,B)=>((v+B)%(2*B)+2*B)%(2*B)-B;
  // ---------------------------------------------------------------- the seven samples as little toy objects
  const SM={cu:mat("metal",PAL.copper,{rough:.24}),al:mat("metal","#DCE2EA",{rough:.3}),nacl:mat("plastic","#F7FAFD",{rough:.42,coat:.35}),wax:mat("plastic","#F6E3A6",{rough:.5,coat:.15}),
    hdpe:mat("plastic","#E1EDF7",{rough:.4}),dia:mat("plastic","#CFF3FB",{rough:.04,coat:1}),gra:mat("plastic","#50566A",{rough:.7,coat:.1})};
  const ION={cu:PAL.copper,al:"#C5CEDA"};
  function mkSample(k,sc=1,o={}){const g=new THREE.Group();const m=SM[k];
    if(k==="cu"||k==="al"){if(o.bent){const geo=new THREE.BoxGeometry(1,.3,.5,24,2,2);const p=geo.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i);p.setY(i,p.getY(i)+.34*(x*2)*(x*2)-.02)}geo.computeVertexNormals();g.add(S.mesh(geo,m,{at:[0,.17,0]}))}
      else g.add(S.rbox(1.0,.3,.5,.06,m,{at:[0,.15,0]}))}
    else if(k==="nacl"){const c=S.rbox(.58,.58,.58,.035,m,{at:[0,.29,0]});c.rotation.y=.45;g.add(c);
      for(const [a,b] of [[-.12,.1],[.08,-.06]]){const ln=S.box(.2,.012,.012,mat("plastic","#BCD0E2"),{at:[a,.4+b,.29],cast:false});ln.rotation.z=.8;c.add(ln);ln.position.set(a,b,.295)}}
    else if(k==="wax"){g.add(S.cyl(.3,.3,.6,m,{at:[0,.3,0]}));g.add(S.cyl(.018,.018,.14,ink,{at:[0,.66,0],seg:8}))}
    else if(k==="hdpe"){g.add(S.rbox(1.05,.16,.62,.06,m,{at:[0,.08,0]}));g.add(S.cyl(.07,.07,.165,white,{at:[.37,.085,.14],seg:20}))}
    else if(k==="dia"){const d=S.mesh(new THREE.OctahedronGeometry(.34,0),m);d.scale.set(1,1.2,1);d.position.y=.42;d.rotation.y=.5;g.add(d)}
    else{for(let i=0;i<4;i++)g.add(S.rbox(.95,.07,.5,.02,i%2?mat("plastic","#666C80",{rough:.7,coat:.1}):m,{at:[i*.02,.04+i*.075,0]}))}
    g.scale.setScalar(sc);return g}
  const perK=(parent,sc,at,o)=>{const r={};ORDER.forEach(k=>{const g=mkSample(k,sc,o);g.position.set(...at);g.visible=false;parent.add(g);r[k]=g});r.show=k=>ORDER.forEach(q=>r[q].visible=q===k);return r};

  // ================================================================ ZONE 1: the test bench
  const gB=zoneG(ZB);
  // the sample shelf: tap a sample to load it into all four tests
  const shelf=[];ORDER.forEach((k,i)=>{const g=S.group(gB);g.position.set(-4.2+i*1.4,0,-2.15);
    g.add(S.cyl(.5,.54,.1,white,{at:[0,.05,0],seg:40}));const ring=S.torus(.5,.03,S.M.glow(PAL.case.mint,0),{at:[0,.11,0],rot:[Math.PI/2,0,0],cast:false});g.add(ring);
    const smp=mkSample(k,.62);smp.position.y=.1;g.add(smp);S.pick(g,()=>{S.api.state.mat=k;S.api.state.dis=0});shelf.push({k,g,smp,ring})});
  const stationBase=x=>{const b=S.rbox(2.4,.1,2.5,.05,mat("plastic","#ffffff",{rough:.5,coat:.2}),{at:[x,.05,.55]});gB.add(b);return b};
  // -- station 1: does it conduct? battery, bulb and a sample clipped into the loop
  const X1=-4.1,X2=-1.37,X3=1.37,X4=4.1;stationBase(X1);stationBase(X2);stationBase(X3);stationBase(X4);
  const c1=S.group(gB);c1.position.set(X1,.1,.55);
  const bat=S.group(c1);bat.position.set(-.62,.2,-.55);bat.rotation.x=Math.PI/2;bat.add(S.cyl(.17,.17,.62,mat("plastic",PAL.product.butter,{rough:.35}),{seg:32}));bat.add(S.cyl(.17,.17,.1,ink,{at:[0,-.33,0],seg:32}));bat.add(S.cyl(.06,.06,.06,steel,{at:[0,.34,0],seg:16}));
  c1.add(S.cyl(.12,.14,.2,steel,{at:[.25,.1,-.75],seg:24}));
  const bulb1=S.sphere(.26,mat("glass","#ffffff",{opacity:.22}),{at:[.25,.44,-.75],cast:false});bulb1.renderOrder=6;c1.add(bulb1);
  const fil1M=S.M.glow("#FFC24A",0);c1.add(S.tube([[.17,.24,-.75],[.17,.42,-.75],[.21,.5,-.75],[.25,.42,-.75],[.29,.5,-.75],[.33,.42,-.75],[.33,.24,-.75]],.012,fil1M,{seg:60,cast:false}));
  const halo1=S.sphere(.42,addGlowM("#FFD76A"),{at:[.25,.44,-.75],cast:false});c1.add(halo1);
  const loop1=new THREE.CatmullRomCurve3([[-.62,.2,-.24],[-.75,.2,.3],[-.5,.2,.62],[-.34,.2,.62],[.34,.2,.62],[.6,.2,.62],[.72,.2,.1],[.6,.2,-.55],[.38,.2,-.75],[.1,.2,-.75],[-.3,.2,-.9],[-.62,.2,-.86]].map(p=>V3(...p)),true,"centripetal");
  c1.add(S.tube(loop1,.025,copperM,{seg:180,closed:true}));
  for(const x of [-.4,.4])c1.add(S.rbox(.18,.12,.24,.03,steelD,{at:[x,.06,.62]}));
  const smp1=perK(c1,.5,[0,.13,.62]);
  const chg1=S.swarm(22,new THREE.SphereGeometry(.035,10,8),mat("glow","#FFD76A",2));c1.add(chg1);
  // -- station 2: heat it. hotplate, glowing coil, thermometer; the sample slumps into a puddle above its melting point
  const c2=S.group(gB);c2.position.set(X2,.1,.55);
  c2.add(S.rbox(1.6,.24,1.6,.08,steel,{at:[-.15,.12,0]}));
  const coil2M=S.M.glow("#FF6A3D",0);c2.add(S.tube(Array.from({length:60},(_,i)=>{const a=i/59*Math.PI*6;const r=.1+.5*(i/59);return [-.15+Math.cos(a)*r,.25,Math.sin(a)*r]}),.022,coil2M,{seg:220,cast:false}));
  const smp2=perK(c2,.62,[-.15,.26,0]);
  const puddleM=new THREE.MeshPhysicalMaterial({color:"#ffffff",roughness:.15,clearcoat:1,emissive:"#000000"});
  const puddle=S.mesh(new THREE.CylinderGeometry(.5,.55,.05,40),puddleM,{at:[-.15,.27,0]});c2.add(puddle);
  const th2=S.group(c2);th2.position.set(.88,0,-.2);th2.add(S.rbox(.3,.06,.3,.03,white,{at:[0,.03,0]}));
  th2.add(S.cyl(.06,.06,1.7,mat("glass","#ffffff",{opacity:.3}),{at:[0,1.0,0],cast:false}));th2.add(S.sphere(.1,mat("glow",PAL.product.strawberry,.5),{at:[0,.16,0]}));
  const spirit2=S.cyl(.03,.03,1,mat("glow",PAL.product.strawberry,.5),{seg:10});th2.add(spirit2);
  const haze2=S.puffs(26,"#FFB27A",{additive:true});c2.add(haze2);const hz=[];for(let i=0;i<26;i++)hz.push({x:0,y:0,z:0,life:Math.random()*2});
  // -- station 3: hammer it. an anvil and a hammer on a pivot that swings and strikes
  const c3=S.group(gB);c3.position.set(X3,.1,.55);
  c3.add(S.rbox(1.3,.22,.9,.06,steelD,{at:[-.15,.11,0]}));c3.add(S.rbox(1.0,.2,.7,.06,steel,{at:[-.15,.32,0]}));
  c3.add(S.cyl(.06,.06,1.3,steel,{at:[.85,.65,-.35],seg:12}));c3.add(S.sphere(.09,ink,{at:[.85,1.3,-.35]}));
  const hamPiv=S.group(c3);hamPiv.position.set(.85,1.3,0);
  hamPiv.add(S.cyl(.045,.05,1.0,mat("plastic","#D69A5C",{rough:.5}),{at:[-.5,0,0],rot:[0,0,Math.PI/2],seg:12}));
  hamPiv.add(S.rbox(.3,.42,.3,.05,steel,{at:[-1.0,-.02,0]}));
  const smp3=perK(c3,.48,[-.15,.42,0]),bent3=perK(c3,.48,[-.15,.42,0],{bent:true});
  const shardGeo=new THREE.TetrahedronGeometry(.07,0),shards=S.swarm(36,shardGeo,mat("plastic","#ffffff",{rough:.3}),{colors:true,cast:true});c3.add(shards);
  const sh3=[];for(let i=0;i<36;i++)sh3.push({x:0,y:-9,z:0,vx:0,vy:0,vz:0,r:0,live:false});
  const spark3=S.puffs(20,"#FFE08A",{additive:true});c3.add(spark3);const sp3=[];for(let i=0;i<20;i++)sp3.push({x:0,y:0,z:0,vx:0,vy:0,life:0});
  let hamPhase=0,lastHit=-1;
  // -- station 4: in water. a beaker; salt dissolves, light samples float, dense ones sink
  const c4=S.group(gB);c4.position.set(X4,.1,.55);
  const wM=mat("liquid",PAL.water,{opacity:.32});wM.depthWrite=false;
  const water4=S.cyl(.56,.56,1.0,wM,{at:[0,.55,0],cast:false,seg:48});water4.renderOrder=4;c4.add(water4);
  const glass4=S.mesh(new THREE.CylinderGeometry(.62,.62,1.4,48,1,true),mat("glass","#E6F2FC",{opacity:.14}),{cast:false});glass4.position.y=.75;glass4.renderOrder=6;c4.add(glass4);
  c4.add(S.cyl(.62,.62,.05,mat("glass","#E6F2FC",{opacity:.35}),{at:[0,.03,0],cast:false,seg:48}));c4.add(S.torus(.62,.02,mat("glass","#ffffff",{opacity:.5}),{at:[0,1.45,0],rot:[Math.PI/2,0,0],cast:false}));
  const smp4=perK(c4,.44,[0,.06,0]);
  const ions4=S.swarm(30,new THREE.SphereGeometry(1,12,10),mat("plastic","#ffffff",{rough:.35}),{colors:true});c4.add(ions4);
  for(let i=0;i<30;i++)ions4.tint(i,i%2?PAL.product.lime:PAL.product.strawberry);
  const lB=[S.label({off:[-10,-48]}),S.label({off:[0,-56]}),S.label({off:[0,-56]}),S.label({off:[10,-48]})],lMat=S.label({cls:"big",off:[0,-44]});

  // ================================================================ the lattice (shared by the zoom and conduction zones)
  const LB=S.group(),LBOX=1.5;
  const ionSw=S.swarm(560,new THREE.SphereGeometry(1,18,14),mat("plastic","#ffffff",{rough:.32,coat:.55}),{colors:true});LB.add(ionSw);
  const bondSw=S.swarm(760,new THREE.CylinderGeometry(1,1,1,8,1),mat("plastic","#ffffff",{rough:.5,coat:.2}),{colors:true});LB.add(bondSw);
  const elSw=S.swarm(140,new THREE.SphereGeometry(1,12,10),mat("glow","#FFD24A",1.9));LB.add(elSw);
  const lcase=S.acrylicCase(LBOX*2+.5,LBOX*2+.5,LBOX*2+.5,PAL.case.lavender,{opacity:.1});lcase.position.y=-LBOX-.25;LB.add(lcase);
  const plates=S.group(LB);for(const sx of [-1,1]){plates.add(S.rbox(.08,LBOX*2,LBOX*2,.03,steelD,{at:[sx*(LBOX+.12),0,0]}))}
  let LT=null;
  const rnd=(i)=>hs(i*1.37+.11);
  function buildLattice(k){const typ=M[k].type;const L={k,typ,at:[],bonds:[],weak:[],el:[],water:[]};
    const add=(x,y,z,c,r,o={})=>{L.at.push(Object.assign({x,y,z,c,r,a1:rnd(L.at.length)*6.28,a2:rnd(L.at.length+500)*6.28,a3:rnd(L.at.length+900)*6.28},o));return L.at.length-1};
    if(typ==="metal"){const sp=.58;for(let i=0;i<6;i++)for(let j=0;j<5;j++)for(let l=0;l<5;l++)add((i-2.5)*sp,(j-2)*sp,(l-2)*sp,ION[k],.2);
      for(let i=0;i<120;i++)L.el.push({x:(rnd(i+40)*2-1)*LBOX,y:(rnd(i+80)*2-1)*LBOX,z:(rnd(i+120)*2-1)*LBOX,vx:(rnd(i+3)-.5)*.9,vy:(rnd(i+5)-.5)*.9,vz:(rnd(i+7)-.5)*.9,plane:null})}
    else if(typ==="ionic"){const sp=.5;for(let i=0;i<6;i++)for(let j=0;j<6;j++)for(let l=0;l<6;l++){const na=(i+j+l)%2===0;add((i-2.5)*sp,(j-2.5)*sp,(l-2.5)*sp,na?PAL.product.strawberry:PAL.product.lime,na?.13:.21,{na})}
      for(let i=0;i<60;i++)L.water.push({x:(rnd(i+700)*2-1)*LBOX,y:(rnd(i+760)*2-1)*LBOX,z:(rnd(i+820)*2-1)*LBOX,a:rnd(i+880)*6.28})}
    else if(typ==="molec"){let m=0;for(let j=0;j<6;j++)for(let l=0;l<5;l++)for(let xi=0;xi<2;xi++){const cx=(xi-.5)*1.5+(j%2?.2:-.2),cy=(j-2.5)*.48,cz=(l-2)*.6;const first=L.at.length;
        for(let b=0;b<8;b++){add(cx,cy,cz,"#E9C25A",.075,{mol:m,lx:(b-3.5)*.16,ly:(b%2?.06:-.06)});if(b)L.bonds.push([L.at.length-2,L.at.length-1,.03])}m++}
      L.nmol=m;L.molc=[];for(let i=0;i<m;i++)L.molc.push({a:rnd(i+300)*6.28,b:rnd(i+340)*6.28});
      for(let i=0;i<m;i++){const j=i+10;if(j<m)L.weak.push([i*8+3,j*8+3])}}
    else if(typ==="poly"){for(let c=0;c<7;c++){const yc=(c-3)*.4,zc=((c*3)%7-3)*.36;for(let b=0;b<44;b++){add(0,0,0,"#5DBB7E",.07,{ch:c,u:-1.6+b*3.2/43,yc,zc});if(b)L.bonds.push([L.at.length-2,L.at.length-1,.045])}}
      for(let c=0;c<6;c++)for(let b=4;b<44;b+=10)L.weak.push([c*44+b,(c+1)*44+b])}
    else if(typ==="net"){const a=1.45,pts=[],B=[[0,0,0],[.5,.5,0],[.5,0,.5],[0,.5,.5]];
      for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)for(let l=-1;l<=1;l++)for(const b of B)for(const o of [0,.25]){const x=(i+b[0]+o)*a,y=(j+b[1]+o)*a,z=(l+b[2]+o)*a;if(Math.abs(x)<=LBOX+.01&&Math.abs(y)<=LBOX+.01&&Math.abs(z)<=LBOX+.01)pts.push([x,y,z])}
      pts.forEach(p=>add(p[0],p[1],p[2],"#5A5478",.13));const d0=a*Math.sqrt(3)/4;
      for(let i=0;i<L.at.length;i++)for(let j=i+1;j<L.at.length;j++){const A=L.at[i],Bq=L.at[j];if(Math.abs(Math.hypot(A.x-Bq.x,A.y-Bq.y,A.z-Bq.z)-d0)<.02)L.bonds.push([i,j,.045])}}
    else{const bl=.3,hw=Math.sqrt(3)*bl;const layers=[-1,0,1];
      layers.forEach((ly,li)=>{const y=ly*.9;const idx={};const key=(c,r)=>c+","+r;
        for(let r=-6;r<=6;r++)for(let c=-6;c<=6;c++){const x=c*hw+(r%2?hw/2:0)+(li===1?hw/2:0),z=r*1.5*bl;
          for(const [dx,dz,tag] of [[0,-bl,"a"],[0,bl,"b"]]){const px=x+dx*0,pz=z+dz;if(Math.abs(px)>LBOX||Math.abs(pz)>LBOX)continue;idx[key(c,r)+tag]=add(px,y,pz,"#5C6275",.1,{layer:li})}}
        const n0=L.at.length;});
      for(let i=0;i<L.at.length;i++)for(let j=i+1;j<L.at.length;j++){const A=L.at[i],Bq=L.at[j];if(A.layer!==Bq.layer)continue;if(Math.abs(Math.hypot(A.x-Bq.x,A.z-Bq.z)-bl)<.02)L.bonds.push([i,j,.035])}
      for(let i=0;i<90;i++)L.el.push({x:(rnd(i+40)*2-1)*LBOX,y:(Math.floor(rnd(i+60)*3)-1)*.9+.16,z:(rnd(i+120)*2-1)*LBOX,vx:(rnd(i+3)-.5)*.9,vy:0,vz:(rnd(i+7)-.5)*.9,plane:1});
      for(let li=0;li<2;li++)for(let q=0;q<4;q++){const x=-1.05+q*.7;L.weak.push({x,y0:(li-1)*.9+.12,y1:li*.9-.12})}}
    L.at.forEach((a,i)=>ionSw.tint(i,a.c));
    L.bonds.forEach((b,i)=>bondSw.tint(i,typ==="net"?"#A8A3C4":typ==="poly"?"#4FA570":typ==="layer"?"#7C8296":"#C9A040"));
    return L}
  const PINK=PAL.product.strawberry;
  function updateLattice(L,state,T,drift,t){const typ=L.typ;const melt=state==="molten",dis=state==="dissolved",half=state==="melting";
    const amp=.025+.075*S.clamp((T-20)/1180,0,1)+(melt?.04:0),w=S.REDUCED?0:1;const B=LBOX;let n=0,nb=0,ne=0;const P=[];
    const vib=(a,s)=>Math.sin(t*11*w+a)*amp*s;
    const flow=(a,i)=>{const dx=Math.sin(t*.7+a.a1)*.5+Math.sin(t*.31+a.a3)*.35,dy=Math.sin(t*.6+a.a2)*.5,dz=Math.cos(t*.5+a.a3)*.5;return [wrap(a.x+dx*w+(drift?(a.na?-1:1)*t*.35:0)*(typ==="ionic"?1:0),B),wrap(a.y+dy*w,B),wrap(a.z+dz*w,B)]};
    if(typ==="molec"){const mc=L.molc;L.at.forEach((a,i)=>{const free=melt||(half&&hs(a.mol)<.5);let cx=a.x,cy=a.y,cz=a.z,rot=0;
        if(free){const m=mc[a.mol];cx=wrap(a.x+Math.sin(t*.5*w+m.a)*.55,B);cy=wrap(a.y+Math.sin(t*.43*w+m.b)*.4,B);cz=wrap(a.z+Math.cos(t*.37*w+m.a)*.4,B);rot=Math.sin(t*.4*w+m.b)*1.3}
        const c=Math.cos(rot),s2=Math.sin(rot);const x=cx+a.lx*c+vib(a.a1,1),z=cz+a.lx*s2+vib(a.a3,1),y=cy+a.ly+vib(a.a2,1);P.push([x,y,z,free]);ionSw.put(n++,x,y,z,a.r)})}
    else if(typ==="poly"){L.at.forEach(a=>{const ph=melt?t*w:0;const x=a.u+(melt?Math.sin(t*.4*w+a.ch)*.25:0),y=a.yc+.14*Math.sin(a.u*2.6+a.ch*1.9+ph*1.6)+.12*Math.sin(a.u*.9+a.ch*2.3+ph*.7)+vib(a.a1+a.u*3,.6),
        z=a.zc+.16*Math.sin(a.u*1.7+a.ch*.7+ph)+vib(a.a2+a.u*3,.6);P.push([x,y,z]);ionSw.put(n++,x,y,z,a.r)})}
    else if(typ==="ionic"&&dis){L.at.forEach((a,i)=>{if(i<40){const sp=1.6;const x=wrap((rnd(i+11)*2-1)*B+Math.sin(t*.8*w+a.a1)*.2+(drift?(a.na?-1:1)*t*.3:0),B),y=wrap((rnd(i+31)*2-1)*B+Math.cos(t*.7*w+a.a2)*.2,B),z=(rnd(i+51)*2-1)*B*.9;ionSw.put(n++,x,y,z,a.r);ionSw.tint(n-1,i%2?PAL.product.lime:PAL.product.strawberry)}});
      L.water.forEach((q,i)=>{const x=wrap(q.x+Math.sin(t*.9*w+q.a)*.15,B),y=wrap(q.y+Math.cos(t*.8*w+q.a)*.15,B),z=q.z,a=q.a+t*.6*w;ionSw.put(n,x,y,z,.11);ionSw.tint(n++,PAL.water);
        ionSw.put(n,x+Math.cos(a)*.12,y+.07,z+Math.sin(a)*.12,.06);ionSw.tint(n++,"#ffffff");ionSw.put(n,x-Math.cos(a)*.12,y+.07,z-Math.sin(a)*.12,.06);ionSw.tint(n++,"#ffffff")})}
    else{L.at.forEach((a,i)=>{let x,y,z;if(melt&&(typ==="metal"||typ==="ionic")){[x,y,z]=flow(a,i)}else{x=a.x+vib(a.a1,1);y=a.y+vib(a.a2,1);z=a.z+vib(a.a3,1)}P.push([x,y,z]);ionSw.put(n++,x,y,z,a.r);
        if(typ==="ionic")ionSw.tint(n-1,a.c)})}
    ionSw.count=n;
    if(!(typ==="ionic")){L.bonds.forEach((b,i)=>{const A=P[b[0]],Bq=P[b[1]];if(!A||!Bq)return;putBond(bondSw,nb++,A[0],A[1],A[2],Bq[0],Bq[1],Bq[2],b[2]);});
      L.bonds.forEach((b,i)=>bondSw.tint(i,typ==="net"?"#A8A3C4":typ==="poly"?"#4FA570":typ==="layer"?"#7C8296":"#C9A040"))}
    // weak forces between molecules / chains / layers: thin pink struts, only while the solid holds together
    if(!melt&&(typ==="molec"||typ==="poly")){L.weak.forEach(([i,j])=>{const A=P[i],Bq=P[j];if(!A||!Bq||A[3]||Bq[3])return;putBond(bondSw,nb,A[0],A[1],A[2],Bq[0],Bq[1],Bq[2],.012);bondSw.tint(nb++,PINK)})}
    if(typ==="layer"){L.weak.forEach(q=>{putBond(bondSw,nb,q.x,q.y0,.9,q.x,q.y1,.9,.012);bondSw.tint(nb++,PINK)})}
    bondSw.count=nb;
    L.el.forEach(e=>{let x=wrap(e.x+e.vx*t*w+(drift?.55*t:0),B),y=e.plane?e.y+Math.sin(t*3+e.x*5)*.03:wrap(e.y+e.vy*t*w,B),z=wrap(e.z+e.vz*t*w,B);elSw.put(ne++,x,y,z,.055)});elSw.count=ne;
    ionSw.done();bondSw.done();elSw.done();return P}

  // ================================================================ ZONE 2: zoom in
  const gZ=zoneG(ZZ);
  const LZ=V3(ZZ.x+1.3,TOP+2.15,ZZ.z);
  gZ.add(S.rbox(3.8,.28,3.6,.1,steel,{at:[1.3,.14,0]}));
  const coilZM=S.M.glow("#FF6A3D",0);gZ.add(S.tube(Array.from({length:80},(_,i)=>{const a=i/79*Math.PI*8;const r=.15+1.45*(i/79);return [1.3+Math.cos(a)*r,.3,Math.sin(a)*r]}),.03,coilZM,{seg:320,cast:false}));
  const pedZ=S.group(gZ);pedZ.position.set(-2.6,0,.4);pedZ.add(S.cyl(.6,.7,.5,white,{at:[0,.25,0],seg:40}));
  const smpZ=perK(pedZ,1.0,[0,.5,0]);
  const lensZ=S.group(gZ);lensZ.position.set(-1.25,1.25,.25);lensZ.rotation.y=Math.PI/2;
  lensZ.add(S.torus(.42,.05,mat("plastic",PAL.case.blush,{rough:.3}),{cast:false}));const lg=S.mesh(new THREE.CircleGeometry(.42,40),mat("glass","#ffffff",{opacity:.2}),{cast:false});lensZ.add(lg);
  lensZ.add(S.cyl(.04,.04,.6,mat("plastic",PAL.case.blush),{at:[0,-.7,0],seg:10}));
  const cone=S.mesh(new THREE.CylinderGeometry(.42,1.9,2.4,40,1,true),new THREE.MeshBasicMaterial({color:"#ffffff",transparent:true,opacity:.07,depthWrite:false,side:THREE.DoubleSide}),{cast:false});
  cone.rotation.z=-Math.PI/2;cone.position.set(0,.9,0);
  const coneG=S.group(gZ);coneG.position.set(-1.25,1.25,.25);coneG.add(cone);cone.position.set(1.2,0,0);
  const lZname=S.label({cls:"big",off:[-20,-60]}),lZstate=S.label({off:[-20,-14]}),lZleg=[S.label({off:[40,-30]}),S.label({off:[40,24]}),S.label({off:[-40,30]})];

  // ================================================================ ZONE 3: why it conducts
  const gC=zoneG(ZC);
  const LC=V3(ZC.x+2.4,TOP+1.55,ZC.z+.3);
  gC.add(S.rbox(5.2,.1,4.8,.06,mat("plastic","#ffffff",{rough:.5,coat:.2}),{at:[-1.6,.05,0]}));
  const batC=S.group(gC);batC.position.set(-3.2,.38,-1.55);batC.rotation.z=Math.PI/2;batC.add(S.cyl(.26,.26,1.0,mat("plastic",PAL.product.butter,{rough:.35}),{seg:32}));batC.add(S.cyl(.26,.26,.14,ink,{at:[0,.52,0],seg:32}));batC.add(S.cyl(.09,.09,.08,steel,{at:[0,-.54,0],seg:16}));
  gC.add(S.cyl(.18,.2,.3,steel,{at:[-.6,.15,-1.6],seg:24}));
  const bulbC=S.sphere(.4,mat("glass","#ffffff",{opacity:.22}),{at:[-.6,.68,-1.6],cast:false});bulbC.renderOrder=6;gC.add(bulbC);
  const filCM=S.M.glow("#FFC24A",0);gC.add(S.tube([[-.72,.36,-1.6],[-.72,.62,-1.6],[-.66,.74,-1.6],[-.6,.62,-1.6],[-.54,.74,-1.6],[-.48,.62,-1.6],[-.48,.36,-1.6]],.016,filCM,{seg:60,cast:false}));
  const haloC=S.sphere(.55,addGlowM("#FFD76A"),{at:[-.6,.68,-1.6],cast:false});gC.add(haloC);
  const lampC=new THREE.PointLight("#FFC873",0,5,1.6);lampC.position.set(-.6,.7,-1.4);gC.add(lampC);
  const EX=[-2.35,-.85],EY=1.5;
  const loopC=new THREE.CatmullRomCurve3([[-3.75,.38,-1.55],[-3.9,.38,-.6],[-3.4,.5,.2],[-2.6,EY+.1,.4],[EX[0],EY,.55],[EX[0],EY,.55],[-1.6,EY+.25,.55],[EX[1],EY,.55],[-.4,EY,.3],[.15,.6,-.4],[0,.25,-1.4],[-.45,.25,-1.6],[-1.5,.38,-1.6],[-2.65,.38,-1.55]].map(p=>V3(...p)),true,"centripetal");
  // the wire: a battery-bulb loop with a gap across the electrodes (the gap is bridged only by the sample)
  const wireC=S.tube(new THREE.CatmullRomCurve3([[EX[1],EY,.55],[-.4,EY,.3],[.15,.6,-.4],[0,.25,-1.4],[-.45,.25,-1.6]].map(p=>V3(...p))),.035,copperM,{seg:80});gC.add(wireC);
  gC.add(S.tube(new THREE.CatmullRomCurve3([[-.75,.25,-1.6],[-1.5,.38,-1.6],[-2.65,.38,-1.55]].map(p=>V3(...p))),.035,copperM,{seg:40}));
  gC.add(S.tube(new THREE.CatmullRomCurve3([[-3.75,.38,-1.55],[-3.9,.38,-.6],[-3.4,.5,.2],[-2.6,EY+.1,.4],[EX[0],EY,.55]].map(p=>V3(...p))),.035,copperM,{seg:60}));
  const elecs=EX.map(x=>{const e=S.cyl(.06,.06,1,steel,{seg:14});gC.add(e);return e});
  for(const x of EX){gC.add(S.sphere(.08,ink,{at:[x,EY,.55]}))}
  const lPlus=S.label({off:[14,-16]}).set("+"),lMinus=S.label({off:[-14,-16]}).set("−");
  // three containers: a bar across the electrodes, a crucible on a burner, a beaker of water
  const conC=S.group(gC);conC.position.set(-1.6,0,.55);
  const barC={};ORDER.forEach(k=>{const b=S.rbox(1.9,.36,.5,.06,SM[k]);b.visible=false;conC.add(b);barC[k]=b});
  const cruc=S.group(conC);cruc.add(S.cyl(.5,.5,.12,steelD,{at:[0,.06,0],seg:32}));
  const cprof=[new THREE.Vector2(.45,0),new THREE.Vector2(.5,.02),new THREE.Vector2(.9,.95),new THREE.Vector2(.84,.97),new THREE.Vector2(.46,.08),new THREE.Vector2(0,.08)];
  const crucM=mat("metal",PAL.steelDark,{rough:.35});const cBody=S.mesh(new THREE.LatheGeometry(cprof,48),crucM);crucM.side=THREE.DoubleSide;cBody.position.y=.3;cruc.add(cBody);
  const meltM=new THREE.MeshStandardMaterial({color:"#ffffff",emissive:"#000000",roughness:.25});const meltTop=S.mesh(new THREE.CylinderGeometry(.8,.48,.7,40),meltM,{at:[0,.7,0]});cruc.add(meltTop);
  const flameC=S.puffs(40,"#FF8A4A",{additive:true});cruc.add(flameC);const flc=[];for(let i=0;i<40;i++)flc.push({x:0,y:0,z:0,life:Math.random()});
  for(const a of [0,2.1,4.2])cruc.add(S.cyl(.03,.03,.32,steelD,{at:[Math.cos(a)*.42,.16,Math.sin(a)*.42],seg:8}));
  const beak=S.group(conC);const bwM=mat("liquid",PAL.water,{opacity:.32});bwM.depthWrite=false;
  const bwater=S.cyl(.88,.88,1.0,bwM,{at:[0,.55,0],cast:false,seg:48});bwater.renderOrder=4;beak.add(bwater);
  const bglass=S.mesh(new THREE.CylinderGeometry(.94,.94,1.3,48,1,true),mat("glass","#E6F2FC",{opacity:.14}),{cast:false});bglass.position.y=.7;bglass.renderOrder=6;beak.add(bglass);
  beak.add(S.cyl(.94,.94,.05,mat("glass","#E6F2FC",{opacity:.35}),{at:[0,.03,0],cast:false,seg:48}));
  const barInW={};ORDER.forEach(k=>{const b=S.rbox(1.0,.3,.42,.05,SM[k],{at:[0,.2,0]});b.visible=false;beak.add(b);barInW[k]=b});
  const ionsC=S.swarm(40,new THREE.SphereGeometry(1,12,10),mat("plastic","#ffffff",{rough:.35}),{colors:true});beak.add(ionsC);for(let i=0;i<40;i++)ionsC.tint(i,i%2?PAL.product.lime:PAL.product.strawberry);
  const chgC=S.swarm(40,new THREE.SphereGeometry(.05,10,8),mat("glow","#FFD76A",2));gC.add(chgC);
  const lCstate=S.label({cls:"big",off:[-30,40]}),lCflow=S.label({off:[30,-50]}),lCcar=S.label({off:[30,40]});

  // ================================================================ ZONE 4: the hammer test (sliding layers)
  const gH=zoneG(ZH);
  const HC=9,HR=4,HD=3,HSP=.6,HX0=-(HC-1)/2*HSP+.4,HY0=.75;
  gH.add(S.rbox((HC+1.4)*HSP,.3,HD*HSP+.8,.08,steel,{at:[.4,.15,0]}));
  const hIon=S.swarm(HC*HR*HD,new THREE.SphereGeometry(1,20,16),mat("plastic","#ffffff",{rough:.3,coat:.6}),{colors:true,cast:true});hIon.castShadow=true;gH.add(hIon);
  const hEl=S.swarm(90,new THREE.SphereGeometry(.06,10,8),mat("glow","#FFD24A",1.9));gH.add(hEl);
  const hEls=[];for(let i=0;i<90;i++)hEls.push({u:rnd(i+200),v:rnd(i+230),w:rnd(i+260),vu:(rnd(i+290)-.5)*.12,vv:(rnd(i+320)-.5)*.2});
  const rowY=j=>HY0+j*HSP*.92;
  const pusher=S.group(gH);
  const pHead=S.rbox(.36,1.15,HD*HSP+.3,.06,steel);pusher.add(pHead);
  pusher.add(S.cyl(.08,.08,1.4,mat("plastic","#D69A5C",{rough:.5}),{at:[-.88,0,0],rot:[0,0,Math.PI/2],seg:14}));
  pusher.add(S.sphere(.14,mat("plastic",PAL.product.peach,{rough:.35}),{at:[-1.6,0,0]}));
  const repel=[];for(let i=0;i<HC;i++)repel.push([S.arrow("#E8503A",{r:.035}),S.arrow("#E8503A",{r:.035})]);repel.forEach(p=>p.forEach(a=>gH.add(a)));
  const attr=S.swarm(HC,new THREE.CylinderGeometry(1,1,1,6),mat("plastic",PAL.product.lime,{rough:.4}));gH.add(attr);
  const crackPts=[];for(let i=0;i<=HC*2+2;i++)crackPts.push([HX0-HSP*.8+i*HSP/2,(rowY(1)+rowY(2))/2+(i%2?.06:-.06),(HD-1)/2*HSP+.33]);
  const crack=S.tube(crackPts,.025,S.M.glow("#FF5A4A",4.5),{seg:120,cast:false,type:"catmullrom",tension:0});crack.visible=false;gH.add(crack);
  const burstH=S.puffs(40,"#FF9A6A",{additive:true});gH.add(burstH);const bh=[];for(let i=0;i<40;i++)bh.push({x:0,y:0,z:0,vx:0,vy:0,life:0});let wasCracked=false;
  // lattice choice tokens: a copper cube and a salt cube you can tap
  const tok=(x,k,val)=>{const g=S.group(gH);g.position.set(x,0,2.25);g.add(S.cyl(.38,.42,.1,white,{at:[0,.05,0],seg:32}));const rg=S.torus(.38,.03,S.M.glow(PAL.case.lavender,0),{at:[0,.11,0],rot:[Math.PI/2,0,0],cast:false});g.add(rg);
    const sm=mkSample(k,.5);sm.position.y=.1;g.add(sm);S.pick(g,()=>{S.api.state.hamMat=val});return {g,rg,val}};
  const toks=[tok(-4.2,"cu","metal"),tok(-3.25,"nacl","ionic")];
  let grabDX=0;
  S.dragger(pHead,{normal:V3(0,0,1),start:p=>{const lp=gH.worldToLocal(p.clone());grabDX=lp.x-pusher.position.x},move:p=>{const lp=gH.worldToLocal(p.clone());const x=lp.x-grabDX;const x0=HX0-HSP*.75;
    S.api.state.shift=Math.round(S.clamp((x-x0)/HSP,0,1)*20)/20}});
  const lHt=S.label({cls:"big",off:[-20,-40]}),lHres=S.label({cls:"hot",off:[30,-30]}),lHdrag=S.label({off:[-20,44]}).set("Drag the block →"),lHtok=S.label({off:[0,30]}).set("Tap a lattice");

  // ================================================================ ZONE 5: pick for the job
  const gU=zoneG(ZU);
  function jobModel(id){const g=new THREE.Group();
    if(id==="wire"){const pts=[];for(let i=0;i<=80;i++){const a=i/80*Math.PI*6;pts.push([Math.cos(a)*.3,.12+i/80*.5,Math.sin(a)*.3])}g.add(S.tube(pts,.05,copperM,{seg:240}));
      g.add(S.rbox(.26,.2,.2,.04,ink,{at:[.42,.75,0]}));for(const z of [-.05,.05])g.add(S.box(.12,.025,.025,steel,{at:[.6,.78,z]}))}
    else if(id==="drill"){g.add(S.rbox(.5,.36,.36,.08,mat("plastic",PAL.case.sky,{rough:.35}),{at:[-.35,.3,0]}));const bit=S.cyl(.05,.08,.6,steel,{at:[.2,.3,0],rot:[0,0,-Math.PI/2],seg:16});g.add(bit);
      const tip=S.mesh(new THREE.OctahedronGeometry(.08,0),SM.dia);tip.position.set(.55,.3,0);g.add(tip);g.add(S.rbox(.2,.36,.2,.05,mat("plastic",PAL.case.sky),{at:[-.45,.05,0]}))}
    else if(id==="pencil"){const pg=S.group(g);pg.position.y=.18;pg.rotation.z=.35;pg.add(S.cyl(.08,.08,.8,mat("plastic",PAL.product.butter,{rough:.4}),{rot:[0,0,Math.PI/2],seg:6}));
      pg.add(S.cyl(0,.08,.2,mat("plastic","#F4D3A8"),{at:[.5,0,0],rot:[0,0,-Math.PI/2],seg:6}));pg.add(S.cyl(0,.03,.07,SM.gra,{at:[.57,0,0],rot:[0,0,-Math.PI/2],seg:10}));
      pg.add(S.cyl(.08,.08,.1,mat("plastic",PAL.product.strawberry),{at:[-.45,0,0],rot:[0,0,Math.PI/2],seg:12}))}
    else if(id==="board"){g.add(S.rbox(.95,.08,.6,.06,SM.hdpe,{at:[0,.04,0]}));g.add(S.cyl(.06,.06,.085,white,{at:[.34,.045,.15],seg:16}));g.add(S.rbox(.5,.02,.1,.01,steel,{at:[-.05,.1,-.05]}));g.add(S.rbox(.2,.05,.07,.02,ink,{at:[.28,.11,-.05]}))}
    else if(id==="candle"){g.add(S.cyl(.17,.17,.55,SM.wax,{at:[0,.275,0]}));g.add(S.cyl(.012,.012,.08,ink,{at:[0,.59,0],seg:6}));const fl=S.mesh(new THREE.SphereGeometry(.07,16,12),mat("glow","#FFB347",2.4),{cast:false});fl.scale.set(1,1.8,1);fl.position.y=.72;g.add(fl)}
    else if(id==="can"){g.add(S.cyl(.2,.2,.6,mat("plastic",PAL.product.strawberry,{rough:.3}),{at:[0,.3,0],seg:32}));g.add(S.cyl(.18,.2,.04,mat("metal","#DCE2EA"),{at:[0,.62,0],seg:32}));g.add(S.cyl(.205,.205,.14,white,{at:[0,.32,0],seg:32}))}
    else if(id==="deice"){g.add(S.rbox(1.0,.08,.6,.03,mat("plastic","#5B5670",{rough:.7}),{at:[0,.04,0]}));for(let i=0;i<3;i++)g.add(S.box(.16,.01,.04,white,{at:[-.3+i*.3,.085,0]}));
      for(let i=0;i<9;i++){const c=S.box(.05,.05,.05,SM.nacl,{at:[-.4+hs(i)*.8,.11,-.25+hs(i+9)*.5]});c.rotation.y=i;g.add(c)}}
    else{const pan=S.mesh(new THREE.LatheGeometry([new THREE.Vector2(0,0),new THREE.Vector2(.32,0),new THREE.Vector2(.38,.12),new THREE.Vector2(.35,.12),new THREE.Vector2(.3,.03),new THREE.Vector2(0,.03)],40),mat("metal","#5B5670",{rough:.4}));g.add(pan);
      g.add(S.cyl(.045,.04,.55,mat("plastic","#3A3E47",{rough:.6}),{at:[.62,.12,0],rot:[0,0,Math.PI/2-.15],seg:14}))}
    return g}
  const jobs=JOBS.map((j,i)=>{const g=S.group(gU);g.position.set(-3.85+i*1.1,0,-2.3);g.add(S.cyl(.46,.5,.1,white,{at:[0,.05,0],seg:36}));
    const rg=S.torus(.46,.03,S.M.glow(PAL.case.mint,0),{at:[0,.11,0],rot:[Math.PI/2,0,0],cast:false});g.add(rg);const m=jobModel(j.id);m.scale.setScalar(.62);m.position.y=.1;g.add(m);
    S.pick(g,()=>{S.api.state.job=j.id});return {id:j.id,g,rg}});
  const heroJ=S.group(gU);heroJ.position.set(-2.6,0,.25);heroJ.add(S.cyl(.85,.95,.4,white,{at:[0,.2,0],seg:48}));
  const heroModels={};JOBS.forEach(j=>{const m=jobModel(j.id);m.scale.setScalar(1.45);m.position.y=.4;m.visible=false;heroJ.add(m);heroModels[j.id]=m});
  const heroM=S.group(gU);heroM.position.set(-.3,0,.25);heroM.add(S.cyl(.85,.95,.4,white,{at:[0,.2,0],seg:48}));const heroRing=S.torus(.86,.04,S.M.glow(PAL.product.lime,0),{at:[0,.41,0],rot:[Math.PI/2,0,0],cast:false});heroM.add(heroRing);
  const heroS=perK(heroM,1.15,[0,.4,0]);const qmark=S.group(heroM);
  for(let i=0;i<10;i++){const a=i/10*Math.PI*2;qmark.add(S.sphere(.06,mat("plastic",PAL.case.blush),{at:[Math.cos(a)*.45,.6,Math.sin(a)*.45]}))}
  const plus=S.group(gU);plus.position.set(-1.45,.75,.25);plus.add(S.rbox(.36,.1,.1,.04,mat("plastic",PAL.case.blush)));plus.add(S.rbox(.1,.36,.1,.04,mat("plastic",PAL.case.blush)));
  // the needs board: one lamp per need, and a fit bar that fills
  const needB=S.group(gU);needB.position.set(2.5,0,.1);needB.add(S.rbox(2.6,.16,2.4,.06,white,{at:[0,.08,0]}));
  const lamps=[0,1,2,3].map(i=>{const l=S.sphere(.13,S.M.glow("#cccccc",0),{at:[-.95,.3,-.85+i*.5]});needB.add(l);needB.add(S.cyl(.16,.18,.08,steelD,{at:[-.95,.2,-.85+i*.5],seg:20}));return l});
  needB.add(S.cyl(.09,.09,2.2,mat("plastic","#E8E4F0"),{at:[0,.28,1.0],rot:[0,0,Math.PI/2],seg:16}));
  const fitM=S.M.glow(PAL.product.lime,.5);const fitBar=S.cyl(.1,.1,1,fitM,{at:[0,.28,1.0],rot:[0,0,Math.PI/2],seg:16});needB.add(fitBar);
  const picks=ORDER.map((k,i)=>{const g=S.group(gU);g.position.set(-3.6+i*1.2,0,2.35);g.add(S.cyl(.48,.52,.1,white,{at:[0,.05,0],seg:36}));
    const rg=S.torus(.48,.03,S.M.glow(PAL.product.lime,0),{at:[0,.11,0],rot:[Math.PI/2,0,0],cast:false});g.add(rg);const sm=mkSample(k,.55);sm.position.y=.1;g.add(sm);
    S.pick(g,()=>{const st=S.api.state;st.picks[st.job]=k});return {k,g,rg}});
  const lNeeds=[0,1,2,3].map(()=>S.label({off:[22,0],lead:false})),lJob=S.label({cls:"big",off:[-10,-70]}),lPick=S.label({off:[0,-80]}),lFit=S.label({off:[0,30]}),lUhint=S.label({off:[0,40]});

  // ================================================================ ZONE 6: the trade-off (two overhead lines)
  const gT=zoneG(ZT);
  const PX=[-3.7,3.3],LZs={cu:-1.35,al:1.35},PH3=3.0;
  function pylon(x,z){const g=S.group(gT);g.position.set(x,0,z);const lm=steelD;
    for(const [a,b] of [[-1,-1],[1,-1],[-1,1],[1,1]]){const leg=S.cyl(.03,.045,PH3,lm,{seg:8});leg.position.set(a*.22,PH3/2,b*.22);leg.rotation.set(-b*.1,0,a*.1);g.add(leg)}
    for(let i=1;i<5;i++){const y=i*PH3/5,w=.48-.3*i/5;g.add(S.box(w,.025,.025,lm,{at:[0,y,.22-.06*i/5]}));g.add(S.box(.025,.025,w,lm,{at:[.22-.06*i/5,y,0]}))}
    g.add(S.rbox(.08,.08,.9,.03,lm,{at:[0,PH3,0]}));g.add(S.cyl(.06,.06,.2,mat("plastic","#ffffff"),{at:[0,PH3-.12,0],seg:12}));g.add(S.cyl(.12,.15,.08,mat("plastic","#ffffff",{rough:.5}),{at:[0,.04,0],seg:20}));return g}
  const lines={};["cu","al"].forEach(k=>{const z=LZs[k];const p1=pylon(PX[0],z),p2=pylon(PX[1],z);
    const kg=KGKM(k),sag=.25+.95*kg/KGKM("cu"),r=.012*DIAM(k)/3;const ya=PH3-.24,xa=PX[0],xb=PX[1];const pts=[];
    for(let i=0;i<=40;i++){const u=i/40;pts.push(V3(S.lerp(xa,xb,u),ya-sag*4*u*(1-u),z))}
    const curve=new THREE.CatmullRomCurve3(pts);const cab=S.tube(curve,r,k==="cu"?copperM:mat("metal","#C3CCD7",{rough:.3}),{seg:120});gT.add(cab);
    const hit=S.mesh(new THREE.TubeGeometry(curve,40,.22,6,false),new THREE.MeshBasicMaterial({visible:false}));gT.add(hit);
    const sel=S.mesh(new THREE.TubeGeometry(curve,80,r+.05,10,false),addGlowM(PAL.product.lime,0),{cast:false});gT.add(sel);
    const pad=S.rbox(8.0,.04,1.0,.04,mat("plastic","#ffffff",{rough:.5,coat:.2}),{at:[(PX[0]+PX[1])/2,.02,z]});gT.add(pad);
    const col=S.group(gT);col.position.set(4.5,0,z);const colM=k==="cu"?copperM:mat("metal","#C3CCD7",{rough:.3});const colBar=S.cyl(.26,.26,1,colM,{seg:32});col.add(colBar);col.add(S.cyl(.32,.34,.06,white,{at:[0,.03,0],seg:32}));
    const disc=S.cyl(r*6,r*6,.06,colM,{at:[0,0,0],rot:[Math.PI/2,0,0],seg:32});const discG=S.group(gT);discG.position.set(-4.6,.9,z);discG.add(disc);discG.add(S.cyl(.03,.03,.9,steelD,{at:[0,-.45,0],seg:8}));
    const flow=S.swarm(14,new THREE.SphereGeometry(.04,10,8),mat("glow","#FFD76A",2));gT.add(flow);
    [p1,p2,hit,cab,pad].forEach(o=>S.pick(o,()=>{S.api.state.line=k}));
    lines[k]={curve,sel,colBar,flow,sag,z,lab:S.label({off:[k==="cu"?-24:24,k==="cu"?-44:40]}),lcol:S.label({off:[24,-10]}),ldisc:S.label({off:[-20,k==="cu"?-34:34]})}});

  // ================================================================ the test: four beacons over the zones (tap to go there)
  const beacons=[["conduct",ZC,passConduct,"Molten or dissolved"],["hammer",ZH,passHammer,"Shatter the crystal"],["use",ZU,()=>fullJobs()>=3,"Three perfect fits"],["tradeoff",ZT,passLine,"Power-line metal"]].map(([k,Z,fn,txt],i)=>{
    const g=S.group();g.position.set(Z.x+(k==="use"?4.4:k==="tradeoff"?-4.7:k==="hammer"?4.5:-4.1),TOP,Z.z+(k==="conduct"||k==="use"||k==="hammer"?-2.5:2.5));
    g.add(S.cyl(.05,.05,1.6,steel,{at:[0,.8,0],seg:10}));g.add(S.cyl(.3,.34,.1,white,{at:[0,.05,0],seg:24}));const orb=S.sphere(.3,S.M.glow("#cccccc",.1),{at:[0,1.85,0]});g.add(orb);
    S.pick(g,()=>{const j=steps.findIndex(x=>x.k===k);if(j>=0){StudyKit.sfx&&StudyKit.sfx("whoosh");S.api.setStep(j)}});return {k,g,orb,fn,txt,n:i+1,lab:S.label({off:[0,-34]})}});
  [pB,pZ,pC,pH,pU,pT].forEach((p,i)=>{const k=["bench","zoom","conduct","hammer","use","tradeoff"][i];S.pick(p,()=>{if(S.api.step.k==="test"){const j=steps.findIndex(x=>x.k===k);if(j>=0)S.api.setStep(j)}})});

  // ---------------------------------------------------------------- views
  S.view("bench",[ZB.x+.6,6.3,ZB.z+10.2],[ZB.x,.9,ZB.z+.2],{min:3,max:26});
  S.view("zoom",[ZZ.x+1.4,4.6,ZZ.z+9.2],[ZZ.x+.2,1.9,ZZ.z],{min:2.5,max:22});
  S.view("conduct",[ZC.x+.6,4.8,ZC.z+9.0],[ZC.x+.1,1.3,ZC.z],{min:2.5,max:22});
  S.view("hammer",[ZH.x+.3,4.4,ZH.z+9.2],[ZH.x-.4,1.4,ZH.z+.2],{min:2.5,max:22});
  S.view("use",[ZU.x+.4,7.0,ZU.z+10.4],[ZU.x,.8,ZU.z+.3],{min:2.5,max:22});
  S.view("tradeoff",[ZT.x+.6,7.4,ZT.z+9.0],[ZT.x,1.1,ZT.z+.3],{min:3,max:26});
  S.view("all",[0,15,20.5],[0,.2,.6],{min:6,max:60});
  const zoneOf=k=>k==="test"?"all":k;const centers={bench:ZB,zoom:ZZ,conduct:ZC,hammer:ZH,use:ZU,tradeoff:ZT};
  const L_B=[...lB,lMat],L_Z=[lZname,lZstate,...lZleg],L_C=[lCstate,lCflow,lCcar,lPlus,lMinus],L_H=[lHt,lHres,lHdrag,lHtok],L_U=[...lNeeds,lJob,lPick,lFit,lUhint],L_T=[];
  ["cu","al"].forEach(k=>L_T.push(lines[k].lab,lines[k].lcol,lines[k].ldisc));
  const groupsL={bench:L_B,zoom:L_Z,conduct:L_C,hammer:L_H,use:L_U,tradeoff:L_T};
  let zone="bench",firstStep=true;S.goView("bench",true);
  let latKey="",curLat=null;
  const lerpCol=(a,b,f)=>new THREE.Color(a).lerp(new THREE.Color(b),S.clamp(f,0,1));
  return {
    step(st){zone=zoneOf(st.k);S.goView(zone,firstStep);firstStep=false;const c=centers[zone];S.setShadowBox(zone==="all"?20:6,c?[c.x,0,c.z]:[0,0,0]);
      Object.entries(groupsL).forEach(([z,arr])=>arr.forEach(l=>l.show(z===zone)));beacons.forEach(b=>{b.lab.show(zone==="all");b.g.visible=zone==="all"})},
    update(s,st,dt,t){const k=s.mat,m=M[k],run=s.playing&&!S.REDUCED;
      // ---- bench
      shelf.forEach(o=>{const on=o.k===k;o.smp.position.y=S.lerp(o.smp.position.y,on?.35+Math.sin(t*2)*.04:.1,.12);o.smp.rotation.y+=on&&!S.REDUCED?dt*.8:0;o.ring.material.emissiveIntensity=on?1.8:0;o.ring.material.color.set(on?PAL.case.mint:"#E4E0EC")});
      [smp1,smp2,smp4].forEach(r=>r.show(k));
      const on1=m.elec;fil1M.emissiveIntensity=S.lerp(fil1M.emissiveIntensity,on1?5.5:0,.15);halo1.material.opacity=on1?.35:0;
      for(let i=0;i<22;i++){const u=((i/22)+(on1&&run?t*.12:0))%1;loop1.getPointAt(u,tmp);chg1.put(i,tmp.x,tmp.y,tmp.z,on1?1:0)}chg1.done();
      const ms=meltState(k,s.temp),f2=S.clamp((s.temp-20)/1000,0,1);coil2M.emissiveIntensity=S.lerp(coil2M.emissiveIntensity,.15+f2*4.5,.1);
      coil2M.emissive.copy(lerpCol("#FF4A2A","#FFD36B",f2));
      ORDER.forEach(q=>{const g=smp2[q];if(q!==k)return;g.visible=ms!=="melted";g.scale.set(.62*(ms==="melting"?1.15:1),.62*(ms==="melting"?.6:1),.62*(ms==="melting"?1.15:1))});
      puddle.visible=ms!=="solid";const hotLiq=s.temp>500;puddleM.color.set(hotLiq?"#FFB070":m.c1);puddleM.emissive.set(hotLiq?"#FF6A2A":"#000000");puddleM.emissiveIntensity=hotLiq?.9:0;puddle.scale.set(ms==="melted"?1.2:.9,1,ms==="melted"?1.2:.9);
      const lv=S.clamp((s.temp-20)/1180,0,1);spirit2.scale.y=.05+lv*1.5;spirit2.position.y=.2+spirit2.scale.y/2;
      for(let i=0;i<hz.length;i++){const p=hz[i];p.life-=dt;if(p.life<=0){p.life=1.5+Math.random();p.x=-.15+(Math.random()-.5)*.8;p.z=(Math.random()-.5)*.8;p.y=.4}p.y+=dt*.5;haze2.put(i,p.x+Math.sin(t*3+i)*.03,p.y,p.z,s.temp>60?(.15+.35*f2)*Math.min(1,p.life):0,90+140*f2)}haze2.done();
      // hammer: raise, swing, strike, recover (a purely visual loop while playing)
      if(run)hamPhase=(hamPhase+dt/3.0)%1;const ph=hamPhase;const ang=ph<.55?S.lerp(0,1.25,S.ease(Math.min(1,ph/.5))):ph<.62?S.lerp(1.25,-.08,(ph-.55)/.07):S.lerp(-.08,0,Math.min(1,(ph-.62)/.1));
      hamPiv.rotation.z=-ang;const struck=ph>=.62&&ph<.97;const hitNow=ph>=.62&&lastHit<.62;lastHit=ph;
      ORDER.forEach(q=>{smp3[q].visible=false;bent3[q].visible=false});
      if(k==="cu"||k==="al"){(struck?bent3:smp3)[k].visible=true}
      else if(k==="nacl"){smp3[k].visible=!struck}
      else{const g=smp3[k];g.visible=true;const sq=struck?(k==="wax"?[1.35,.45]:k==="hdpe"?[1.06,.82]:k==="gra"?[1.1,.6]:[1,1]):[1,1];g.scale.set(.48*sq[0],.48*sq[1],.48*sq[0])}
      if(hitNow){const n=k==="nacl"?36:k==="gra"?18:k==="dia"?5:0;for(let i=0;i<36;i++){const p=sh3[i];p.live=i<n;if(!p.live)continue;const a=Math.random()*6.28,v=k==="gra"?.8:1.6+Math.random()*1.4;p.x=-.15+(Math.random()-.5)*.2;p.y=.6;p.z=(Math.random()-.5)*.2;p.vx=Math.cos(a)*v;p.vz=Math.sin(a)*v*.6;p.vy=1.2+Math.random()*1.8;p.r=Math.random()*6;
          shards.tint(i,k==="gra"?"#5C6275":k==="dia"?"#CFF3FB":"#F4F8FC")}
        if(k==="dia"||k==="cu"||k==="al")for(let i=0;i<20;i++){const q=sp3[i];q.life=.4+Math.random()*.3;q.x=-.15;q.y=.62;q.z=0;q.vx=(Math.random()-.5)*3;q.vy=Math.random()*2.5}}
      for(let i=0;i<36;i++){const p=sh3[i];if(!p.live||!struck){shards.put(i,0,-9,0,0);continue}p.vy-=9*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
        const floorY=Math.abs(p.x+.15)<.5&&Math.abs(p.z)<.35?.45:Math.abs(p.x+.15)<.65&&Math.abs(p.z)<.45?.24:.05;if(p.y<floorY){p.y=floorY;p.vy*=-.25;p.vx*=.6;p.vz*=.6}p.r+=dt*p.vx*3;shards.put(i,p.x,p.y,p.z,k==="gra"?.8:1,p.r,p.r*.7,0)}shards.done();
      for(let i=0;i<20;i++){const q=sp3[i];q.life-=dt;q.vy-=6*dt;q.x+=q.vx*dt;q.y+=q.vy*dt;spark3.put(i,q.x,q.y,q.z,q.life>0?Math.min(1,q.life*2.5):0,70)}spark3.done();
      // water
      ORDER.forEach(q=>{if(q!==k)return;const g=smp4[q];if(m.sol){const f=Math.min(1,.3+s.dis);const sc=.44*(1-.8*f);g.scale.setScalar(Math.max(.02,sc));g.position.y=.06;g.visible=sc>.05}
        else if(m.rho<1){g.scale.setScalar(.44);g.position.y=1.0+Math.sin(t*1.6)*.025;g.rotation.z=Math.sin(t*1.1)*.04}else{g.scale.setScalar(.44);g.position.y=.06;g.rotation.z=0}});
      {const f=m.sol?Math.min(1,.3+s.dis):0;for(let i=0;i<30;i++){const vis=m.sol&&hs(i+7)<f+.1;const a=hs(i)*6.28+t*.2*(i%3?1:-1),r=.12+hs(i+30)*.4;ions4.put(i,Math.cos(a)*r,.15+((hs(i+60)*.85+t*.03*(i%2?1:-1))%.85+.85)%.85,Math.sin(a)*r,vis?(i%2?.055:.04):0)}ions4.done()}
      const res1=on1?"Lights up":"Stays dark",res2=ms==="melted"?"Melted":ms==="melting"?"Melting":"Still solid",res4=m.sol?"Dissolves":m.rho<1?"Floats":"Sinks, no change";
      const sp=(c,dx,dy,dz)=>tmp.set(ZB.x+c+dx,TOP+dy,ZB.z+.55+dz);
      lB[0].at(sp(X1,0,1.0,-.75)).set(`Conducts?<b>${res1}</b>`);lB[1].at(sp(X2,-.15,.9,0)).set(`Heat to ${fmt(s.temp)} °C<b>${res2}</b>`);
      lB[2].at(sp(X3,-.15,.75,0)).set(`Hammer it<b>${m.ham}</b>`);lB[3].at(sp(X4,0,1.5,0)).set(`In water<b>${res4}</b><small>${m.rhoT} g/cm³</small>`);
      lMat.at(tmp.set(ZB.x-4.2+ORDER.indexOf(k)*1.4,TOP+1.15,ZB.z-2.15)).set(`${m.n}<small>${m.tn} · tap a sample</small>`);
      // ---- lattice: in the zoom zone it follows the heat; in the conduction zone it follows the chosen state
      const inC=zone==="conduct";const e=effState(k,s.cstate);
      const lstate=inC?(e==="molten"?"molten":e==="dissolved"?"dissolved":"solid"):(ms==="melted"?"molten":ms==="melting"?"melting":"solid");
      const lT=inC?(lstate==="molten"?m.mp2+80:20):s.temp;const drift=inC&&conducts(k,s.cstate);
      if(latKey!==k){latKey=k;curLat=buildLattice(k)}
      const tgt=inC?LC:LZ;LB.position.copy(tgt);const sc=inC?.62:1;LB.scale.setScalar(sc);plates.visible=inC;
      const P=updateLattice(curLat,lstate,lT,drift,t);
      // ---- zoom zone
      smpZ.show(k);smpZ[k].rotation.y=S.REDUCED?0:t*.4;coilZM.emissiveIntensity=S.lerp(coilZM.emissiveIntensity,.1+f2*4.5,.1);coilZM.emissive.copy(lerpCol("#FF4A2A","#FFD36B",f2));
      lZname.at(tmp.set(ZZ.x-2.6,TOP+1.4,ZZ.z+.4)).set(`${m.n}<small>${m.tn}</small>`);
      lZstate.at(tmp.set(LZ.x,LZ.y+LBOX+.3,LZ.z)).set(`${ms==="melted"?"Liquid":ms==="melting"?"Melting":"Solid"} at ${fmt(s.temp)} °C<small>${m.parts}</small>`).cls(ms==="solid"?"":"hot");
      const legs=LEG[m.type];lZleg.forEach((l,i)=>{const it=legs[i];l.show(zone==="zoom"&&!!it);if(!it)return;let pnt=null;
        if(it[0]==="e"&&curLat.el.length){const q=curLat.el[0];elSw.getMatrixAt(0,mtx);pnt=tv.setFromMatrixPosition(mtx)}
        else if(it[0]==="weak"||it[0]==="bond"){const b=it[0]==="weak"?bondSw.count-1:0;if(b>=0){bondSw.getMatrixAt(b,mtx);pnt=tv.setFromMatrixPosition(mtx)}}
        else{const idx=it[0]==="cl"?1:it[0]==="na"?0:Math.min(curLat.at.length-1,it[0]==="ion"?7:11);ionSw.getMatrixAt(idx,mtx);pnt=tv.setFromMatrixPosition(mtx)}
        if(pnt){pnt.multiplyScalar(sc).add(LB.position);l.at(pnt).set(it[1])}});
      // ---- conduction zone
      const onC=conducts(k,s.cstate);filCM.emissiveIntensity=S.lerp(filCM.emissiveIntensity,onC?6:0,.15);haloC.material.opacity=onC?.22:0;lampC.intensity=onC?2.2:0;
      const solidLike=e==="solid"||e==="nomelt";const molten=e==="molten",wet=e==="dissolved"||e==="insol";
      ORDER.forEach(q=>{barC[q].visible=q===k&&solidLike;barC[q].position.set(0,EY-.2,0);barInW[q].visible=q===k&&e==="insol"});
      cruc.visible=molten;beak.visible=wet;
      if(molten){const hot=m.type==="metal"||k==="nacl";meltM.color.set(hot?"#FFB070":m.c1);meltM.emissive.set(hot?"#FF6A2A":"#000000");meltM.emissiveIntensity=hot?1.1:0}
      for(let i=0;i<flc.length;i++){const p=flc[i];p.life-=dt*1.4;if(p.life<=0){p.life=1;const a=Math.random()*6.28;p.x=Math.cos(a)*.3;p.z=Math.sin(a)*.3}flameC.put(i,p.x*(p.life),.05+(1-p.life)*.35,p.z*p.life,molten?p.life*.7:0,160*p.life)}flameC.done();
      const eLen=solidLike?.25:molten?1.0:1.15,eTop=EY;elecs.forEach((el,i)=>{el.scale.y=eLen;el.position.set(EX[i],eTop-eLen/2,.55)});
      for(let i=0;i<40;i++){const na=i%2===0,vis=e==="dissolved";const x=wrap(-.7+hs(i)*1.4+(onC&&run?(na?-1:1)*t*.15:0)+Math.sin(t+i)*.03,.75),y=.15+hs(i+40)*.8+Math.cos(t*.8+i)*.02,z=(hs(i+80)-.5)*1.1;ionsC.put(i,x,y,z,vis?(na?.05:.07):0)}ionsC.done();
      for(let i=0;i<40;i++){const u=((i/40)+(onC&&run?t*.08:0))%1;loopC.getPointAt(u,tmp);chgC.put(i,tmp.x,tmp.y,tmp.z,onC?1:0)}chgC.done();
      lCstate.at(tmp.set(ZC.x-1.6,TOP+.2,ZC.z+1.6)).set(stLabel(k,s.cstate)+(e==="nomelt"?`<small>${m.sh} doesn't melt below about 3500 °C</small>`:e==="insol"?`<small>${m.sh} doesn't dissolve: it's still a solid</small>`:""));
      lCflow.at(tmp.set(ZC.x-.6,TOP+1.2,ZC.z-1.6)).set(onC?"Charges flow<b>Bulb on</b>":"Nothing free to move<b>Bulb off</b>").cls(onC?"hot":"");
      lCcar.at(tmp.set(LC.x,LC.y-LBOX*.62-.1,LC.z)).set(`Charge carriers<b>${carriers(k,s.cstate)}</b>`);
      lMinus.at(tmp.set(EX[0]+ZC.x,TOP+EY+.1,ZC.z+.55));lPlus.at(tmp.set(EX[1]+ZC.x,TOP+EY+.1,ZC.z+.55));
      // ---- hammer zone (sliding layers)
      const metal=s.hamMat==="metal",sh=s.shift,cracked=!metal&&sh>=.9,dx=sh*HSP,lift=cracked?.32:0,tilt=cracked?.07:0;
      const px=HX0,py=rowY(2);let n=0;
      for(let j=0;j<HR;j++)for(let i=0;i<HC;i++)for(let d=0;d<HD;d++){let x=HX0+i*HSP,y=rowY(j),z=(d-(HD-1)/2)*HSP;const w=S.REDUCED?0:1;x+=Math.sin(t*6*w+i*1.7+j*2.3+d)*.01;
        if(j>=2){x+=dx;if(cracked){const rx=x-px,ry=y-py;x=px+rx*Math.cos(tilt)-ry*Math.sin(tilt);y=py+rx*Math.sin(tilt)+ry*Math.cos(tilt)+lift}}
        const na=(i+j+d)%2===0;hIon.put(n,x,y,z,metal?.27:na?.19:.28);hIon.tint(n++,metal?PAL.copper:na?PAL.product.strawberry:PAL.product.lime)}
      hIon.done();
      for(let i=0;i<90;i++){const q=hEls[i];const u=((q.u+(S.REDUCED?0:t*q.vu))%1+1)%1,v=((q.v+(S.REDUCED?0:t*q.vv*.3))%1+1)%1;const y=rowY(0)-.25+v*(rowY(3)-rowY(0)+.5);const x=HX0-.3+u*((HC-1)*HSP+.6)+(y>(rowY(1)+rowY(2))/2?dx:0);
        hEl.put(i,x,y,(q.w-.5)*(HD*HSP),metal?1:0)}hEl.done();
      for(let i=0;i<HC;i++){const jf=Math.round(i+sh),near=1-Math.abs((i+sh)-jf);const same=((i+2)%2)===((jf+1)%2);const zf=(HD-1)/2*HSP+.32;const show=!metal&&jf>=0&&jf<HC&&near>=.35;
        const xm=HX0+i*HSP+dx,xf=HX0+jf*HSP,ya=rowY(1),yb2=rowY(2)+lift;
        if(show&&same&&sh>.45){const k2=S.clamp((sh-.45)/.4,0,1)*.5;repel[i][0].set(tmp.set(xm,yb2-.05,zf),V3(0,1,0),k2);repel[i][1].set(tmp.set(xf,ya+.05,zf),V3(0,-1,0),k2)}else{repel[i][0].visible=repel[i][1].visible=false}
        if(show&&!same&&sh<.4){putBond(attr,i,xm,yb2-.2,zf,xf,ya+.2,zf,.025)}else attr.put(i,0,-9,0,0)}attr.done();
      crack.visible=cracked;crack.position.y=lift*.4;
      if(cracked&&!wasCracked){for(let i=0;i<40;i++){const q=bh[i];q.x=HX0+Math.random()*(HC-1)*HSP;q.y=(rowY(1)+rowY(2))/2;q.z=(Math.random()-.5)*HD*HSP;q.vx=(Math.random()-.5)*1.5;q.vy=Math.random()*1.6;q.life=.6+Math.random()*.6}}wasCracked=cracked;
      for(let i=0;i<40;i++){const q=bh[i];q.life-=dt;q.x+=q.vx*dt;q.y+=q.vy*dt;burstH.put(i,q.x,q.y,q.z,q.life>0?Math.min(1,q.life):0,120)}burstH.done();
      pusher.position.set(HX0-HSP*.75+dx-.1,(rowY(2)+rowY(3))/2+lift,0);pusher.rotation.z=cracked?tilt*.5:0;
      toks.forEach(o=>{const on=o.val===s.hamMat;o.rg.material.emissiveIntensity=on?1.8:0;o.rg.material.color.set(on?PAL.case.lavender:"#E4E0EC");o.g.position.y=on?.05:0});
      const stt=metal?["Still bonded","Layers slide"]:cracked?["Cracked!","Like charges repel"]:sh>.45?["Like charges repel","Push further"]:["Holding together","Opposite charges attract"];
      lHt.at(tmp.set(ZH.x+HX0+.2,TOP+rowY(3)+.6,ZH.z)).set(metal?"Metal: layers slide<small>delocalised electrons keep holding them</small>":"Ionic: like charges meet<small>layers shift by one ion</small>");
      lHres.at(tmp.set(ZH.x+HX0+(HC-1)*HSP+dx,TOP+rowY(3)+lift,ZH.z)).set(`${stt[0]}<small>pushed ${Math.round(sh*100)}% of a gap</small>`).cls(cracked?"hot":"");
      lHdrag.at(tmp.set(ZH.x+pusher.position.x-.6,TOP+pusher.position.y+.5,ZH.z));lHtok.at(tmp.set(ZH.x-3.7,TOP+.5,ZH.z+2.25));
      // ---- use zone
      const j=JOB(s.job),pk=s.picks[s.job]||"",fit=fitOf(s.job,pk);
      jobs.forEach(o=>{const on=o.id===s.job;o.rg.material.emissiveIntensity=on?1.8:0;o.rg.material.color.set(on?PAL.case.mint:"#E4E0EC");o.g.position.y=on?.06:0});
      JOBS.forEach(q=>{const hm=heroModels[q.id];hm.visible=q.id===s.job;if(hm.visible&&!S.REDUCED)hm.rotation.y=Math.sin(t*.5)*.5});
      ORDER.forEach(q=>{const g=heroS[q];g.visible=q===pk;if(g.visible&&!S.REDUCED)g.rotation.y=t*.5});qmark.visible=!pk;if(!pk&&!S.REDUCED)qmark.rotation.y=t*.8;
      heroRing.material.emissiveIntensity=fit.full?2:0;heroRing.material.color.set(fit.full?PAL.product.lime:"#E4E0EC");
      picks.forEach(o=>{const on=o.k===pk;o.rg.material.emissiveIntensity=on?1.8:0;o.rg.material.color.set(on?PAL.product.lime:"#E4E0EC");o.g.position.y=on?.06:0});
      lamps.forEach((l,i)=>{const r=fit.res[i];l.visible=i<j.need.length;l.material.color.set(r===null||r===undefined?"#D8D4E2":r?PAL.product.lime:"#F07A6A");l.material.emissive.set(r===null||r===undefined?"#000000":r?PAL.product.lime:"#F06050");l.material.emissiveIntensity=r===null||r===undefined?0:1.4});
      const pc=fit.n?fit.pass/fit.n:0;fitBar.scale.y=Math.max(.001,2.2*pc);fitBar.position.x=-1.1+1.1*pc;fitM.color.set(fit.full?PAL.product.lime:pc>=.5?PAL.product.butter:"#F07A6A");fitM.emissive.copy(fitM.color);
      lNeeds.forEach((l,i)=>{const nd=j.need[i];l.show(zone==="use"&&!!nd);if(!nd)return;const r=fit.res[i];l.at(tmp.set(ZU.x+2.5-.95,TOP+.3,ZU.z+.1-.85+i*.5)).set(`${r===null?"·":r?"✓":"✗"} ${nd[0]}`)});
      lJob.at(tmp.set(ZU.x-2.6,TOP+1.3,ZU.z+.25)).set(`${j.n}<small>needs ${j.need.length} things · tap a job</small>`);
      lPick.at(tmp.set(ZU.x-.3,TOP+1.5,ZU.z+.25)).set(pk?`${M[pk].sh}<small>${M[pk].tn}</small>`:"Pick a material<small>tap one in the front row</small>");
      const verdict=!pk?"Pick a material":fit.full?"Perfect fit":j.id==="handle"?"No perfect fit here":fit.pass>=fit.n-1?"Close, but not quite":"Poor fit";
      lFit.at(tmp.set(ZU.x+2.5,TOP+.4,ZU.z+1.1)).set(`${verdict}${pk?`<b>${fit.pass} of ${fit.n}</b>`:""}`).cls(fit.full?"hot":"");lUhint.hide();
      // ---- trade-off zone
      const maxT=KGKM("cu")*50/1000;
      ["cu","al"].forEach(q=>{const L=lines[q],ton=KGKM(q)*s.len/1000;L.sel.material.opacity=s.line===q?.55+.2*Math.sin(t*3):0;
        const h=.1+2.6*ton/maxT;L.colBar.scale.y=h;L.colBar.position.y=.06+h/2;
        for(let i=0;i<14;i++){const u=((i/14)+(run||!S.REDUCED?t*.06:0))%1;L.curve.getPointAt(u,tmp);L.flow.put(i,tmp.x,tmp.y,tmp.z,1)}L.flow.done();
        L.lab.at(tmp.set(ZT.x-.2,TOP+PH3-.2-L.sag,ZT.z+L.z)).set(`${M[q].n}<b>${M[q].rhoT} g/cm³</b><small>${fmt(KGKM(q))} kg per km · sag ∝ weight</small>`).cls(s.line===q?"hot":"");
        L.lcol.at(tmp.set(ZT.x+4.5,TOP+.06+h,ZT.z+L.z)).set(`<b>${fmt(ton,1)} t</b><small>for ${s.len} km</small>`);
        L.ldisc.at(tmp.set(ZT.x-4.6,TOP+.9,ZT.z+L.z)).set(`<b>${fmt(AREA(q)*1e6)} mm²</b><small>${fmt(DIAM(q),1)} mm cable</small>`)});
      // ---- test beacons
      beacons.forEach(b=>{const ok=b.fn();b.orb.material.color.set(ok?PAL.product.lime:"#D8D4E2");b.orb.material.emissive.set(ok?PAL.product.lime:"#9A96B0");b.orb.material.emissiveIntensity=ok?1.6+.4*Math.sin(t*3):.15;
        b.lab.at(tmp.set(b.g.position.x,TOP+2.3,b.g.position.z)).set(`${b.n} · ${b.txt}<b>${ok?"Done ✓":"Not yet"}</b>`).cls(ok?"hot":"")});
    }};
}

// ---------- mount
const matOpts=ORDER.map(k=>[k,M[k].n]);
const api=StudyKit.mount({scene3d:materials3d,
  eyebrow:"Chemistry · Materials", title:"The materials lab", crumb:"NCEA Level 1 Chemistry and Biology · physical properties of materials", homeHash:"l1",
  fig:"MATERIALS LAB", railTitle:"How particles decide properties",
  badge:{label:"NCEA L1 Chem & Bio 92023",exam:"2026-11-19T14:00:00+13:00",examText:"Thu 19 Nov, 2pm"},
  mainBox:"0 0 720 352", mainLabel:"The materials lab: samples, tests and particle diagrams", closeBox:"0 0 420 300",
  state:s, steps,
  controls:[{type:"play"},
    {type:"select",id:"mat",label:"Material",options:matOpts,get:()=>s.mat,set:(x,v)=>{s.mat=v;s.dis=0}},
    {type:"range",id:"temp",label:"Heat to",min:20,max:1200,step:5,get:()=>s.temp,set:(x,v)=>{s.temp=v},fmt:()=>fmt(s.temp)+" °C"},
    {type:"select",id:"cstate",label:"State",options:[["solid","Solid"],["molten","Molten"],["dissolved","Dissolved in water"]],get:()=>s.cstate,set:(x,v)=>{s.cstate=v}},
    {type:"select",id:"hamMat",label:"Lattice",options:[["metal","Metal (copper)"],["ionic","Ionic (salt)"]],get:()=>s.hamMat,set:(x,v)=>{s.hamMat=v}},
    {type:"range",id:"shift",label:"Push top layers",min:0,max:1,step:.05,get:()=>s.shift,set:(x,v)=>{s.shift=v},fmt:()=>Math.round(s.shift*100)+"% of a gap"},
    {type:"select",id:"job",label:"Job",options:JOBS.map(j=>[j.id,j.n]),get:()=>s.job,set:(x,v)=>{s.job=v}},
    {type:"select",id:"pick",label:"Material for this job",options:[["","Choose…"],...matOpts],get:()=>s.picks[s.job]||"",set:(x,v)=>{s.picks[s.job]=v}},
    {type:"range",id:"len",label:"Line length",min:1,max:50,step:1,get:()=>s.len,set:(x,v)=>{s.len=v},fmt:()=>s.len+" km"},
    {type:"select",id:"line",label:"Use for the line",options:[["","Choose…"],["cu","Copper"],["al","Aluminium"]],get:()=>s.line,set:(x,v)=>{s.line=v}},
    {type:"select",id:"why",label:"Because",options:[["","Choose…"],["cond","it conducts better"],["light","lighter for the same resistance"],["hard","it's harder"],["melt","higher melting point"]],get:()=>s.why,set:(x,v)=>{s.why=v}}],
  tick:(x,dt,st)=>{s.t+=dt;if(st.k==="bench"&&s.mat==="nacl")s.dis=Math.min(1,s.dis+dt*.1)},
  drawMain:(x,st)=>{const p="mm";
    if(st.k==="zoom")setExam(ZOOMX[M[s.mat].type](s.mat));
    else if(st.k==="conduct")setExam(CONDX[M[s.mat].type](s.mat));
    else if(st.k==="use"){const pk=s.picks[s.job],f=fitOf(s.job,pk);setExam(f.full||(s.job==="handle"&&pk)?JOB(s.job).ex:"Find a perfect fit for this job and the model answer appears here.")}
    else lastExam="";
    if(st.k==="bench")return drawBench(p);if(st.k==="zoom")return drawZoom(p);if(st.k==="conduct")return drawConduct(p);if(st.k==="hammer")return drawHammer(p);
    if(st.k==="use")return drawUse(p);if(st.k==="tradeoff")return drawTrade(p);return drawTest(p)},
  drawClose:(x,st)=>{const p="mc";if(st.k==="tradeoff")return crossCard(p);if(st.k==="hammer")return propCard(s.hamMat==="metal"?"cu":"nacl",p);if(st.k==="use")return s.picks[s.job]?propCard(s.picks[s.job],p):emptyCard(p);return propCard(s.mat,p)},
  chips:()=>{const m=M[s.mat],on=conducts(s.mat,s.cstate),j=JOB(s.job),pk=s.picks[s.job],f=fitOf(s.job,pk),ms=meltState(s.mat,s.temp),done=[passConduct(),passHammer(),fullJobs()>=3,passLine()].filter(Boolean).length;
    const res=s.hamMat==="metal"?"Slides, still bonded":s.shift>=.9?"Cracked":s.shift>.45?"Like charges repel":"Holding";
    return {type:["Type",m.tn],rho:["Density",m.rhoT+" g/cm³"],mp:["Melts",m.mpT],elec:["Conducts (solid)",m.elec?"Yes":"No",m.elec],water:["In water",m.sol?"Dissolves":m.rho<1?"Floats":"Sinks"],ham:["Hammer",m.ham],
      parts:["Particles",m.parts],force:["Held by",m.force],state:[`At ${fmt(s.temp)} °C`,ms==="melted"?"Liquid":ms==="melting"?"Melting":"Solid",ms!=="solid"],
      carriers:["Charge carriers",carriers(s.mat,s.cstate)],free:["Free to move?",on?"Yes":"No",on],bulb:["Bulb",on?"On":"Off",on],
      lattice:["Lattice",s.hamMat==="metal"?"Metal (copper)":"Ionic (salt)"],push:["Pushed",Math.round(s.shift*100)+"% of a gap"],result:["Result",res,s.hamMat==="ionic"&&s.shift>=.9],
      job:["Job",j.n],pick:["Material",pk?M[pk].n:"none yet"],fit:["Fit",pk?`${f.pass} of ${f.n}`:"–",f.full],
      cuM:["Copper line",fmt(KGKM("cu")*s.len/1000,1)+" t"],alM:["Aluminium line",fmt(KGKM("al")*s.len/1000,1)+" t",true],R:["Resistance",fmt(RKM*s.len,1)+" Ω each"],area:["Al cable area",fmt(AREA("al")/AREA("cu"),2)+"× copper"],
      done:["Challenges done",`${done} of 4`,done===4]}},
  challenges:[
    {q:"Find the material that conducts only when it's molten or dissolved, and make it conduct.",check:passConduct,
      ok:"Yes: sodium chloride. Its ions are fixed in the solid but free to move when molten or dissolved.",
      no:()=>s.mat!=="nacl"?"Not that material. Which one is made of ions?":"Right material. Now melt it or dissolve it in water."},
    {q:"Make the ionic crystal shatter in the hammer test.",check:passHammer,ok:"Crack! Like charges lined up and repelled, so the crystal split.",
      no:()=>s.hamMat!=="ionic"?"Switch the lattice to ionic (salt) first.":"Push the top layers further, until like charges sit on top of each other."},
    {q:"Get a perfect fit for three different jobs.",check:()=>fullJobs()>=3,ok:"Three perfect fits: property, particles, use.",
      no:()=>`${fullJobs()} of 3 so far. Pick a job, then find the material that ticks every need.`},
    {q:"Choose the metal for long overhead power lines, and why.",check:passLine,ok:"Yes: aluminium. Same resistance at about half the mass.",
      no:()=>s.line==="cu"?"Copper conducts better, but compare the mass per km.":s.line!=="al"?"Choose a metal for the line first.":s.why==="cond"?"Aluminium's right, but copper actually conducts better. What's aluminium's real advantage?":"Aluminium's right. Now pick the reason that matches the numbers."}],
  papers:[{label:"NZQA: Chemistry and Biology",url:"https://www2.nzqa.govt.nz/ncea/subjects/past-exams-and-exemplars/chemistry-and-biology/"}],
  truth:"Property values are typical textbook values: wax melts over a range (about 46–68 °C) and HDPE softens near 130 °C depending on the grade. Diamond and graphite change only above about 3500 °C. Particle diagrams are 2D sketches of 3D structures. Power-line cables are sized for the same resistance (0.1 Ω per km) using resistivities of 1.68 × 10⁻⁸ Ω·m for copper and 2.65 × 10⁻⁸ Ω·m for aluminium; sag is drawn in proportion to weight per metre.",
  footer:"Covers AS 92023: metallic, ionic, molecular, polymer and covalent network materials, how their particles and forces explain density, conductivity, melting point, solubility, malleability and hardness, and how those properties decide their uses."
});

// taps on the drawing (every choice is also in the controls)
// the drawing is re-rendered every animation frame, so find what is under the pointer now rather than trusting e.target
$("k-main").addEventListener("click",e=>{let el=e.target;try{const q=document.elementFromPoint(e.clientX,e.clientY);if(q)el=q}catch(err){}const g=el&&el.closest&&el.closest("[data-act]");if(!g)return;const [a,v]=g.getAttribute("data-act").split(":");
  if(a==="go"){const i=steps.findIndex(x=>x.k===v);if(i>=0){StudyKit.sfx("whoosh");api.setStep(i)}return}
  if(a==="mat"){s.mat=v;s.dis=0}else if(a==="job")s.job=v;else if(a==="pick")s.picks[s.job]=v;else if(a==="line")s.line=v;else return;
  StudyKit.sfx("pop");api.redraw()});
let lastPH=PH();addEventListener("resize",()=>{if(PH()!==lastPH){lastPH=PH();VB="";api.redraw()}});
})();
