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

// ---------- mount
const matOpts=ORDER.map(k=>[k,M[k].n]);
const api=StudyKit.mount({
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
