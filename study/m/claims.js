(()=>{
"use strict";
/* The claim checker: critique a science-related claim (NCEA L1 Science, AS 91923).
   FocusFizz, @study.with.tia, the post, the studies and every number here are invented for learning.
   The drawing has two layouts: a wide one (640 x 400) and a tall one for phones (360 wide), chosen when it draws. */
const K=window.StudyKit, esc=K.esc;
const mq=(()=>{try{return matchMedia("(max-width:600px)")}catch(e){return {matches:false}}})();
const nar=()=>!!mq.matches;

// ---------- tiny drawing helpers
const T=(x,y,str,o={})=>`<text x="${x}" y="${y}" text-anchor="${o.a||"start"}" style="font:${o.w||500} ${o.s||14}px ${o.r?"var(--as-display)":"var(--display)"};fill:${o.f||"var(--ink)"}${o.ls?`;letter-spacing:${o.ls}px`:""}${o.st?";"+o.st:""}"${o.x?" "+o.x:""}>${o.raw?str:esc(str)}</text>`;
const TL=(x,y,lines,o={},lh)=>`<text x="${x}" y="${y}" text-anchor="${o.a||"start"}" style="font:${o.w||500} ${o.s||14}px ${o.r?"var(--as-display)":"var(--display)"};fill:${o.f||"var(--ink)"}${o.ls?`;letter-spacing:${o.ls}px`:""}">${lines.map((l,i)=>`<tspan x="${x}" dy="${i?(lh||(o.s||14)*1.3):0}">${esc(l)}</tspan>`).join("")}</text>`;
function wrap(str,max){const out=[];let line="";String(str).split(/\s+/).forEach(w=>{if(!line)line=w;else if((line+" "+w).length<=max)line+=" "+w;else{out.push(line);line=w}});if(line)out.push(line);return out}
const R=(x,y,w,h,r,fill,extra)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"${extra?" "+extra:""}/>`;
const fmtP=d=>(d>=0?"+":"−")+Math.abs(d).toFixed(Math.abs(d)<10?1:0)+"%";

// ---------- colours for the four lenses
const LENS={who:{c:"var(--hot)",soft:"#FFE6DF",t:"WHO'S BEHIND IT",long:"FocusFizz paid for this post, and FocusFizz sells the drink.",short:"Paid post: FocusFizz sells the drink."},
  hype:{c:"#8B5CF6",soft:"#EFE7FF",t:"HYPE WORDS",long:"Proven, natural, chemical-free, detox: big words, no numbers.",short:"Proven, natural, chemical-free, detox."},
  claim:{c:"#E69A00",soft:"#FFF1C7",t:"THE CLAIM",long:"Drinking FocusFizz raises your test scores by 20%.",short:"The drink raises scores by 20%."},
  ev:{c:"var(--sea)",soft:"#E2F0FB",t:"THE EVIDENCE",long:"12 students compared with their last quiz. No comparison group.",short:"12 students vs last quiz. No control."}};
const LORDER=["who","hype","claim","ev"];

// ---------- sources and the four trust checks (1 = yes, .5 = partly, 0 = no)
const CHECKS=["Expert","Independent","Peer-reviewed","Data shown"];
const SRC={
  ad:{name:"FocusFizz advert",chan:"Bus-stop poster",c:[0,0,0,0]},
  inf:{name:"Influencer, paid by FocusFizz",chan:"15-second video",c:[0,0,0,.5]},
  news:{name:"News story about a study",chan:"News website",c:[.5,1,.5,.5]},
  journal:{name:"Peer-reviewed journal article",chan:"Science journal",c:[1,1,1,1]},
  gov:{name:"Government health agency",chan:"Official health website",c:[1,1,.5,.5]}};
const score=id=>SRC[id].c.reduce((a,b)=>a+b,0);
const trustWord=v=>v>=3.5?"High trust":v>=2.5?"Good trust":v>=1.5?"Some trust":v>0?"Low trust":"Very low trust";

// ---------- hype words and what a scientist would write
const WORDS=[
  {id:"proven",w:"Proven",sci:"The results suggest…",why:"One study can't prove a claim. Evidence supports an idea, and it gets stronger when other scientists repeat the result."},
  {id:"chem",w:"Chemical-free",sci:"Made of water, sugar and plant extracts",why:"Everything is made of chemicals, including water (H₂O). A chemical-free drink is impossible."},
  {id:"natural",w:"100% natural",sci:"Contains plant extracts",why:"Natural doesn't mean safe or effective. Some natural substances are poisons, and many medicines are made in labs."},
  {id:"boosts",w:"Boosts",sci:"Raised the average score by __ marks compared with a control group",why:"'Boosts' is vague. By how much, compared with what, and measured how?"},
  {id:"detox",w:"Detox",sci:"(no measurable claim)",why:"Your liver and kidneys clear waste. A detox claim rarely names a toxin or shows it leaving the body."},
  {id:"tested",w:"Clinically tested",sci:"Tested on 12 students by the company",why:"Tested doesn't mean it worked. Ask how many people, who ran it, and whether there was a control group."}];

// ---------- the hidden-factor data: 24 made-up summer days at a beach town
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const DAYS=(()=>{const r=mulberry(20261125);return [...Array(24)].map(()=>{const t=17+r()*13;return {t,ice:Math.max(10,Math.round(28+11*(t-17)+(r()-.5)*44)),burn:Math.max(0,Math.round(1+1.15*(t-17)+(r()-.5)*5))}})})();
const CORR=(()=>{const n=DAYS.length,mx=DAYS.reduce((a,d)=>a+d.ice,0)/n,my=DAYS.reduce((a,d)=>a+d.burn,0)/n;let sxy=0,sxx=0,syy=0;DAYS.forEach(d=>{sxy+=(d.ice-mx)*(d.burn-my);sxx+=(d.ice-mx)**2;syy+=(d.burn-my)**2});
  const r=sxy/Math.sqrt(sxx*syy),b=sxy/sxx;return {r,b,a:my-b*mx}})();
const tCol=t=>{const u=Math.max(0,Math.min(1,(t-17)/13)),A=[47,155,216],B=[255,176,32],C=[255,92,64];const [p,q,v]=u<.5?[A,B,u*2]:[B,C,(u-.5)*2];return `rgb(${p.map((x,i)=>Math.round(x+(q[i]-x)*v)).join(",")})`};

// ---------- state
const s={playing:false,
  hl:{who:false,hype:false,claim:false,ev:false},
  src:"inf",
  n:10,all:[],last:null,swing:false,steady:false,acc:0,
  f:{control:false,random:false,same:false,blind:false,big:false},
  reveal:false,
  word:"proven",flipped:new Set(["proven"]),flipAt:0,
  verdict:""};
const FAIR=[["control","Control group","Control"],["random","Random groups","Random"],["same","Same test","Same test"],["blind","Blind","Blind"],["big","Big sample","Big sample"]];
const fairN=()=>FAIR.filter(([k])=>s.f[k]).length;

// ---------- the "no real effect" study: both groups' scores come from the same spread (mean 60, sd 15)
function gauss(){let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function runStudy(){const n=s.n;let a=0,b=0;for(let i=0;i<n;i++){a+=60+15*gauss();b+=60+15*gauss()}a/=n;b/=n;
  const r={n,d:(a-b)/b*100};s.all.push(r);if(s.all.length>800)s.all.shift();s.last=r;
  if(n<=10&&r.d>=15)s.swing=true;
  const big=s.all.filter(x=>x.n>=200).slice(-10);if(big.length>=10&&big.every(x=>Math.abs(x.d)<8))s.steady=true}
const shown=()=>s.all.filter(x=>x.n===s.n).slice(-90);
const bigCount=()=>{const big=s.all.filter(x=>x.n>=200);let k=0;for(let i=big.length-1;i>=0&&Math.abs(big[i].d)<8;i--)k++;return Math.min(10,k)};

// =====================================================================================================================
// STEP 1 · the post, pulled apart
function can(x,y,sc,blank){return `<g transform="translate(${x},${y}) scale(${sc})">${R(-17,-34,34,68,9,blank?"var(--moon)":"var(--hot)")}${R(-17,-34,34,8,4,"rgba(0,0,0,.14)")}${blank?T(0,8,"?",{s:24,w:700,a:"middle",f:"var(--paper)",r:1}):`${R(-17,-9,34,20,2,"var(--paper)")}${T(0,6,"FF",{s:13,w:700,a:"middle",f:"var(--hot)",r:1})}<path d="M-9,-22 l5,-6 l2,4 l5,-7" fill="none" stroke="var(--paper)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`}${R(-12,30,24,4,2,"rgba(0,0,0,.12)")}</g>`}
function phone(hl){
  const H=(on,y,h,c,op)=>on?R(15,y,220,h,7,c,`opacity="${op}"`):"";
  let o=`<rect width="250" height="364" rx="36" fill="var(--ink)"/>${R(9,9,232,346,28,"var(--paper)")}${R(100,17,50,7,3.5,"var(--ink)")}`;
  o+=H(hl.who,35,40,LENS.who.c,.2)+H(hl.hype,175,24,LENS.hype.c,.22)+H(hl.claim,199,36,LENS.claim.c,.3)+H(hl.hype,237,34,LENS.hype.c,.22)+H(hl.ev,273,50,LENS.ev.c,.22);
  o+=`<circle cx="34" cy="55" r="14" fill="var(--sun)"/>`+T(34,60,"T",{s:14,w:700,a:"middle",r:1})+T(56,52,"@study.with.tia",{s:13,w:700})+T(56,67,"Paid partnership · FocusFizz",{s:11,w:600,f:"var(--rose)"});
  o+=[0,1,2].map(i=>`<circle cx="${214+i*7}" cy="55" r="2" fill="var(--rose)"/>`).join("");
  o+=R(21,80,208,90,14,"url(#ccSky)")+`<circle cx="62" cy="112" r="20" fill="var(--sun)" opacity=".85"/>`;
  o+=[[178,98],[196,128],[88,150],[160,152]].map(([x,y],i)=>`<path d="M${x},${y-7} l2,5 l5,2 l-5,2 l-2,5 l-2,-5 l-5,-2 l5,-2z" fill="var(--paper)" opacity="${.95-i*.15}"/>`).join("");
  o+=can(125,126,.9);
  o+=T(24,192,"Clinically proven!",{s:15,w:700});
  o+=TL(24,212,["FocusFizz boosts test","scores by 20%."],{s:14,w:600},17);
  o+=TL(24,251,["100% natural, chemical-free","brain detox."],{s:13,w:500},16);
  o+=TL(24,289,["Our study: 12 students drank it","before a quiz and scored 20%","higher than last time."],{s:12,w:500,f:"var(--body)"},15);
  o+=`<path d="M28,334 c-4,-4 -10,-2 -10,3 c0,5 10,10 10,10 c0,0 10,-5 10,-10 c0,-5 -6,-7 -10,-3z" fill="var(--hot)"/>`+T(44,343,"12.4k",{s:12,w:700})+R(96,333,16,12,3,"none",`stroke="var(--rose)" stroke-width="1.6"`)+T(118,343,"318",{s:12,w:600,f:"var(--rose)"});
  return o}
const SKY=`<linearGradient id="ccSky" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#BFE3FF"/><stop offset="1" stop-color="#FFE3B8"/></linearGradient>`;
function lensCard(k,x,y,w,h,short){const L=LENS[k],on=s.hl[k];const lines=wrap(short?L.short:L.long,Math.floor((w-30)/(short?6.9:7.9)));
  return `<g data-act="hl:${k}">${R(x,y,w,h,16,on?L.soft:"var(--paper)",on?"":`stroke="var(--line)" stroke-width="2" stroke-dasharray="5 5"`)}${on?R(x,y+12,5,h-24,2.5,L.c):""}
  ${T(x+16,y+24,L.t,{s:11.5,w:700,f:on?L.c:"var(--rose)",ls:.8})}
  ${on?TL(x+16,y+(short?44:48),lines,{s:short?13:15,w:600},short?17:19):`<g>${T(x+16,y+(short?50:54),"Tap to light it up",{s:short?13:14,w:600,f:"var(--rose)"})}</g>`}</g>`}
function drawApart(){
  const defs=`<defs>${SKY}</defs>`;
  if(nar()){const sc=1.12,px=180-125*sc,py=12;let o=defs+`<g transform="translate(${px},${py}) scale(${sc})">${phone(s.hl)}</g>`;
    const y0=py+364*sc+16;LORDER.forEach((k,i)=>{o+=lensCard(k,14+(i%2)*170,y0+Math.floor(i/2)*104,162,94,true)});
    return {vb:`0 0 360 ${y0+104*2+6}`,o}}
  let o=defs+`<g transform="translate(40,18)">${phone(s.hl)}</g>`;
  const from={who:18+55,hype:18+187,claim:18+217,ev:18+298};
  LORDER.forEach((k,i)=>{const y=22+i*92;if(s.hl[k])o+=`<path d="M${40+236},${from[k]} C300,${from[k]} 296,${y+39} 322,${y+39}" fill="none" stroke="${LENS[k].c}" stroke-width="2.5" stroke-linecap="round"/><circle cx="${40+236}" cy="${from[k]}" r="4.5" fill="${LENS[k].c}"/>`;
    o+=lensCard(k,322,y,296,78)});
  return {vb:"0 0 640 400",o}}

// STEP 2 · who says so: the source, a trust dial and four check lights
function srcArt(id){
  if(id==="ad")return `${R(22,8,156,150,12,"var(--ink)")}${R(30,16,140,134,8,"#FFE6DF")}${T(100,46,"NEW!",{s:24,w:700,a:"middle",f:"var(--hot)",r:1})}${can(100,94,.95)}${T(100,144,"Brain fuel",{s:15,w:700,a:"middle"})}${R(52,158,10,36,3,"var(--ink)")}${R(138,158,10,36,3,"var(--ink)")}`;
  if(id==="inf")return `${R(52,4,96,180,20,"var(--ink)")}${R(58,10,84,168,15,"url(#ccSky)")}<circle cx="100" cy="88" r="22" fill="rgba(255,255,255,.85)"/><path d="M93,77 L112,88 L93,99z" fill="var(--hot)"/>${R(66,20,34,18,9,"var(--hot)")}${T(83,33,"#ad",{s:12,w:700,a:"middle",f:"var(--paper)"})}${R(66,150,68,6,3,"rgba(255,255,255,.7)")}${R(66,150,26,6,3,"var(--paper)")}`+
    [[160,40,1],[170,74,.8],[154,112,.6]].map(([x,y,o])=>`<path d="M${x},${y} c-4,-4 -10,-2 -10,3 c0,5 10,10 10,10 c0,0 10,-5 10,-10 c0,-5 -6,-7 -10,-3z" fill="var(--hot)" opacity="${o}"/>`).join("");
  if(id==="news")return `${R(8,18,184,158,12,"var(--paper)",`stroke="var(--ink)" stroke-width="3"`)}${R(8,18,184,24,12,"var(--ink)")}${R(8,30,184,12,0,"var(--ink)")}${[0,1,2].map(i=>`<circle cx="${22+i*11}" cy="30" r="3.5" fill="var(--paper)"/>`).join("")}`+
    TL(20,66,["Fizzy drink linked","to better grades"],{s:15,w:700},18)+R(20,94,70,58,8,"#BFE3FF")+can(55,123,.55)+[100,112,124,136,148].map(y=>R(100,y,78-(y%3)*8,6,3,"var(--fill)")).join("");
  if(id==="journal")return `<path d="M34,6 h104 l28,28 v156 h-132z" fill="var(--paper)" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round"/><path d="M138,6 v28 h28" fill="var(--fill)" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round"/>`+
    R(48,22,80,8,4,"var(--ink)")+R(48,36,64,6,3,"var(--rose)")+T(48,62,"Methods",{s:11,w:700,f:"var(--sea)"})+R(48,68,104,5,2.5,"var(--fill)")+R(48,78,96,5,2.5,"var(--fill)")+T(48,102,"Results",{s:11,w:700,f:"var(--sea)"})+
    `<line x1="52" y1="160" x2="150" y2="160" stroke="var(--ink)" stroke-width="2"/>`+[[62,40,"var(--sea)"],[96,42,"var(--rose)"]].map(([x,h,c])=>R(x,160-h,24,h,4,c)+`<path d="M${x+12},${160-h-8} v16 M${x+7},${160-h-8} h10 M${x+7},${160-h+8} h10" stroke="var(--ink)" stroke-width="1.6" fill="none"/>`).join("")+
    `<g transform="translate(118,128) rotate(-14)">${R(-44,-14,90,28,8,"var(--good)")}${T(1,5,"PEER REVIEWED",{s:10.5,w:700,a:"middle",f:"var(--paper)",ls:.6})}</g>`;
  return `${R(26,6,148,182,14,"var(--paper)",`stroke="var(--ink)" stroke-width="3"`)}<path d="M100,20 l26,10 v18 c0,18 -12,28 -26,34 c-14,-6 -26,-16 -26,-34 v-18z" fill="var(--sea)"/><path d="M89,50 l8,8 l15,-16" fill="none" stroke="var(--paper)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`+
    T(100,104,"Health advice",{s:14,w:700,a:"middle"})+[122,142,162].map(y=>`<circle cx="48" cy="${y}" r="6" fill="var(--good)"/>${R(62,y-3,90,6,3,"var(--fill)")}`).join("")}
function dial(cx,cy,r,v){const seg=["#FF6B4A","#FF9A3D","#FFC23D","#9ACD4A","#2FB36B"];let o="";
  const P=(a,rr)=>[cx+Math.cos(a)*rr,cy-Math.sin(a)*rr];
  seg.forEach((c,i)=>{const a0=Math.PI-i*Math.PI/5-.02,a1=Math.PI-(i+1)*Math.PI/5+.02,[x0,y0]=P(a0,r),[x1,y1]=P(a1,r),[x2,y2]=P(a1,r-26),[x3,y3]=P(a0,r-26);
    o+=`<path d="M${x0},${y0} A${r},${r} 0 0 1 ${x1},${y1} L${x2},${y2} A${r-26},${r-26} 0 0 0 ${x3},${y3}z" fill="${c}"/>`});
  const a=Math.PI-v/4*Math.PI,[nx,ny]=P(a,r-34);
  o+=`<line x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" stroke="var(--ink)" stroke-width="7" stroke-linecap="round" style="transition:all .5s"/><circle cx="${cx}" cy="${cy}" r="13" fill="var(--ink)"/><circle cx="${cx}" cy="${cy}" r="5" fill="var(--paper)"/>`;
  o+=T(cx-r+13,cy+22,"0",{s:13,w:700,a:"middle",f:"var(--rose)"})+T(cx+r-13,cy+22,"4",{s:13,w:700,a:"middle",f:"var(--rose)"});
  return o}
function light(x,y,v){const col=v>=1?"var(--good)":v>0?"var(--sun)":"var(--fill)",ic=v>=1?`<path d="M${x-7},${y} l5,5 l9,-10" fill="none" stroke="var(--paper)" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>`:v>0?`<line x1="${x-7}" y1="${y}" x2="${x+7}" y2="${y}" stroke="var(--ink)" stroke-width="3.4" stroke-linecap="round"/>`:`<path d="M${x-6},${y-6} l12,12 M${x+6},${y-6} l-12,12" stroke="var(--rose)" stroke-width="3" stroke-linecap="round"/>`;
  return `<circle cx="${x}" cy="${y}" r="19" fill="${col}"/>${ic}`}
function lights(x0,y,gap,c){return CHECKS.map((n,i)=>{const v=c[i],x=x0+i*gap;return light(x,y,v)+`${T(x,y+38,n,{s:12,w:700,a:"middle",f:v>0?"var(--ink)":"var(--rose)"})}${T(x,y+54,v>=1?"yes":v>0?"partly":"no",{s:11.5,w:600,a:"middle",f:"var(--rose)"})}`}).join("")}
function drawSource(){const S=SRC[s.src],v=score(s.src),defs=`<defs>${SKY}</defs>`;
  if(nar()){let o=defs+`<g transform="translate(80,10)">${srcArt(s.src)}</g>`+T(180,228,S.name,{s:17,w:700,a:"middle"})+T(180,248,S.chan,{s:13,w:600,a:"middle",f:"var(--rose)"});
    o+=dial(180,410,130,v)+T(180,448,`${v} of 4 checks`,{s:20,w:600,a:"middle",r:1})+T(180,470,trustWord(v),{s:13,w:700,a:"middle",f:"var(--rose)"});
    CHECKS.forEach((n,i)=>{const x=34+(i%2)*168,y=506+Math.floor(i/2)*50,v=S.c[i];o+=`<g transform="translate(${x},${y}) scale(.8)">${light(0,0,v)}</g>`+T(x+24,y-1,n,{s:13.5,w:700,f:v>0?"var(--ink)":"var(--rose)"})+T(x+24,y+15,v>=1?"yes":v>0?"partly":"no",{s:12,w:600,f:"var(--rose)"})});
    return {vb:"0 0 360 590",o}}
  let o=defs+R(22,22,236,356,24,"var(--paper)")+`<g transform="translate(40,44)">${srcArt(s.src)}</g>`;
  const nl=wrap(S.name,22);o+=TL(140,272,nl,{s:17,w:700,a:"middle"},21);
  const cw=Math.min(200,S.chan.length*7.4+30);o+=R(140-cw/2,272+nl.length*21+4,cw,28,14,"var(--fill)")+T(140,272+nl.length*21+23,S.chan,{s:12.5,w:700,a:"middle",f:"var(--body)"});
  o+=dial(456,176,140,v)+T(456,226,`${v} of 4 checks`,{s:22,w:600,a:"middle",r:1})+T(456,248,trustWord(v),{s:13,w:700,a:"middle",f:"var(--rose)"});
  o+=lights(318,302,92,S.c);
  return {vb:"0 0 640 400",o}}

// STEP 3 · how many people: no real effect, so every gap is chance
const KEEN="var(--sun)",MIX=["var(--sea)","var(--land)","#8B5CF6","var(--hot)","#2BB3C0"],SKIN=["#F2C9A0","#C98E62","#8D5A3B","#E8B48A","#B07650"];
function kid(x,y,sc,col,skin){return `<g transform="translate(${x},${y}) scale(${sc})"><path d="M-11,20 q0,-16 11,-16 q11,0 11,16z" fill="${col}"/><circle cy="-6" r="8" fill="${skin}"/></g>`}
function glass(x,y,sc){return `<g transform="translate(${x},${y}) scale(${sc})"><path d="M-14,-28 h28 l-4,58 h-20z" fill="rgba(47,143,216,.18)" stroke="var(--sea)" stroke-width="2.5" stroke-linejoin="round"/><path d="M-12,-8 h24 l-2.6,36 h-18.8z" fill="var(--sea)" opacity=".55"/></g>`}
function crowd(x,y,n,cols,rows,r,gap){let o="";const shown=Math.min(n,cols*rows);for(let i=0;i<shown;i++){const cx=x+(i%cols)*gap,cy=y+Math.floor(i/cols)*gap;o+=kid(cx,cy,r,MIX[(i*7)%5],SKIN[(i*3)%5])}return o}
function drawSample(){const runs=shown(),L=s.last&&s.last.n===s.n?s.last:null,N=nar();
  const W=N?360:640,ax0=N?26:56,ax1=N?334:584,base=N?446:334,top=N?190:192,px=(ax1-ax0)/80,X=d=>ax0+(Math.max(-40,Math.min(40,d))+40)*px,dot=N?3.7:6,step=N?8:13;
  let o="";
  // two groups
  const pan=(x,y,w,h,title,fill,drink,i)=>{const cols=N?7:9,rows=N?4:3,gap=N?19:25,per=cols*rows;let g=R(x,y,w,h,18,fill)+T(x+16,y+26,title,{s:N?14:16,w:700})+T(x+w-14,y+26,`${s.n} students`,{s:N?12:13,w:600,a:"end",f:"var(--rose)"});
    g+=drink+crowd(x+(N?24:32),y+(N?52:52),s.n,cols,rows,N?.78:.86,gap);if(s.n>per)g+=T(x+w-(N?14:52),y+h-(N?12:16),`+ ${s.n-per} more`,{s:12,w:700,a:"end",f:"var(--rose)"});return g};
  if(N){o+=pan(12,10,164,150,"FocusFizz","#FFE9E3","",0)+pan(184,10,164,150,"Water","#E4F1FC","",1)}
  else{o+=pan(24,16,288,150,"FocusFizz","#FFE9E3",can(288,128,.48),0)+pan(328,16,288,150,"Water","#E4F1FC",glass(592,128,.58),1)}
  // the fake-headline zone and the strip
  o+=R(X(15),top,X(40)-X(15)+dot,base-top,10,"var(--sun)",`opacity=".16"`)+T(X(40),top+16,"‘It works!’ zone",{s:N?11.5:12.5,w:700,a:"end",f:"#9A6A00"});
  o+=`<line x1="${X(0)}" y1="${top+(N?22:4)}" x2="${X(0)}" y2="${base}" stroke="var(--ink)" stroke-width="2" stroke-dasharray="4 5"/>`+T(X(0),top+(N?14:-6),"no real effect",{s:N?11.5:12.5,w:700,a:"middle",f:"var(--ink)"});
  o+=`<line x1="${ax0-6}" y1="${base+dot+2}" x2="${ax1+6}" y2="${base+dot+2}" stroke="var(--ink)" stroke-width="2.5" stroke-linecap="round"/>`;
  [-40,-20,0,20,40].forEach(v=>{o+=`<line x1="${X(v)}" y1="${base+dot+2}" x2="${X(v)}" y2="${base+dot+9}" stroke="var(--ink)" stroke-width="2"/>`+T(X(v),base+dot+(N?24:26),(v>0?"+":v<0?"−":"")+Math.abs(v)+"%",{s:12,w:700,a:"middle",f:"var(--rose)"})});
  if(!N)[-30,-10,10,30].forEach(v=>{o+=`<line x1="${X(v)}" y1="${base+dot+2}" x2="${X(v)}" y2="${base+dot+6}" stroke="var(--rose)" stroke-width="1.5"/>`});
  o+=T(N?180:320,base+dot+(N?42:44)-(N?0:0),"FocusFizz score minus water score",{s:N?11.5:12,w:600,a:"middle",f:"var(--rose)"});
  const stack={};runs.forEach((r,i)=>{const b=Math.round(Math.max(-40,Math.min(40,r.d))/2);const k=stack[b]=(stack[b]||0)+1;const cy=base-(k-1)*step;if(cy<top+20)return;
    const big=r.d>=15,isL=r===L;o+=`<circle cx="${X(b*2)}" cy="${cy}" r="${dot}" fill="${big?"var(--sun)":"var(--sea)"}" stroke="${big?"var(--ink)":"var(--paper)"}" stroke-width="${big?1.6:1}"${isL?` class="cc-pop"`:""}/>`;
    if(isL)o+=`<circle cx="${X(b*2)}" cy="${cy}" r="${dot+5}" fill="none" stroke="var(--ink)" stroke-width="2"/>`});
  if(L){const b=Math.round(Math.max(-40,Math.min(40,L.d))/2),k=stack[b]||1,cy=Math.max(top+28,base-(k-1)*step);
    o+=T(X(b*2),cy-dot-10,fmtP(L.d),{s:N?13:15,w:700,a:"middle",r:1});
    if(L.d>=15){const bw=N?224:250,bx=N?(360-bw)/2:600-bw,by=N?166:172;o+=`<g class="cc-pop">${R(bx,by,bw,N?24:28,12,"var(--ink)")}${T(bx+bw/2,by+(N?16:19),`Headline: “Boosts scores by ${Math.round(L.d)}%!”`,{s:N?12:13.5,w:700,a:"middle",f:"var(--sun)"})}</g>`}}
  if(!runs.length){const cx=N?180:320,cy=base-58,bw=N?190:230;o+=R(cx-bw/2,cy-22,bw,34,17,"var(--paper)",`stroke="var(--line)" stroke-width="2"`)+T(cx,cy+1,"Run a study to start",{s:N?14:16,w:600,a:"middle",f:"var(--rose)",r:1})}
  return {vb:`0 0 ${W} ${N?512:400}`,o}}

// STEP 4 · fair test board
function quiz(x,y,lab){return `<g transform="translate(${x},${y})">${R(-15,-19,30,38,5,"var(--paper)",`stroke="var(--ink)" stroke-width="2"`)}${[0,1,2].map(i=>R(-9,-11+i*8,18-(i%2)*5,3.5,1.75,"var(--line)")).join("")}${T(0,34,lab,{s:11.5,w:700,a:"middle",f:"var(--ink)"})}</g>`}
function cup(x,y,sc){return `<g transform="translate(${x},${y}) scale(${sc})"><path d="M-15,-24 h30 l-4,50 h-22z" fill="var(--moon)" stroke="var(--ink)" stroke-width="2" stroke-linejoin="round"/>${T(0,9,"?",{s:20,w:700,a:"middle",f:"var(--paper)",r:1})}</g>`}
function fairPanel(x,y,w,h,isA,N){const F=s.f,n=F.big?30:6,cols=F.big?(N?10:10):(N?6:6);
  if(!isA&&!F.control){return R(x,y,w,h,20,"var(--paper)",`stroke="var(--line)" stroke-width="2.5" stroke-dasharray="7 6"`)+T(x+w/2,y+h/2-6,"No comparison group",{s:N?16:18,w:700,a:"middle",f:"var(--rose)",r:1})+T(x+w/2,y+h/2+18,"Only “last time” to compare with",{s:N?12.5:13,w:600,a:"middle",f:"var(--rose)"})}
  let o=R(x,y,w,h,20,isA?"#FFE9E3":"#E4F1FC");
  const title=F.blind?(isA?"Drink 1":"Drink 2"):(isA?"FocusFizz group":"Water group");
  o+=T(x+16,y+28,title,{s:N?15:16,w:700});
  o+=F.blind?cup(x+w-30,y+38,.7):isA?can(x+w-30,y+38,.62):glass(x+w-30,y+38,.62);
  const gap=F.big?(N?24:24):(N?44:46),sc=F.big?.78:1.15,x0=x+(F.big?24:30),y0=y+(F.big?62:74);
  for(let i=0;i<n;i++){const keen=F.random?((i*5+(isA?1:3))%3===0):(isA?true:(i%4===0));
    o+=kid(x0+(i%cols)*gap,y0+Math.floor(i/cols)*(F.big?(N?26:30):(N?46:48)),sc,keen?KEEN:MIX[(i*2+(isA?0:1))%5],SKIN[(i*3+(isA?0:2))%5])}
  o+=quiz(x+w-30,y+h-46,F.same?"Quiz A":(isA?"Quiz A":"Quiz B"));
  return o}
function drawFair(){const N=nar(),k=fairN();let o="";
  if(N){o+=fairPanel(12,10,336,168,true,N)+fairPanel(12,188,336,168,false,N);
    FAIR.forEach(([id,,l],i)=>{const x=12+(i%2)*172,y=372+Math.floor(i/2)*46,on=s.f[id];o+=`<g data-act="fair:${id}">${R(x,y,164,38,19,on?"var(--good)":"var(--paper)",on?"":`stroke="var(--line)" stroke-width="2"`)}<circle cx="${x+20}" cy="${y+19}" r="9" fill="${on?"var(--paper)":"var(--fill)"}"/>${on?`<path d="M${x+15},${y+19} l4,4 l7,-8" fill="none" stroke="var(--good)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`:""}${T(x+36,y+24,l,{s:13.5,w:700,f:on?"var(--paper)":"var(--ink)"})}</g>`});
    const by=372+3*46+8;o+=R(12,by,240,20,10,"var(--fill)")+R(12,by,Math.max(20,240*k/5),20,10,k===5?"var(--good)":k>=3?"var(--sun)":"var(--hot)")+T(348,by+16,`Fair: ${k} of 5`,{s:15,w:600,a:"end",r:1});
    return {vb:`0 0 360 ${by+30}`,o}}
  o+=fairPanel(20,16,292,232,true,N)+fairPanel(328,16,292,232,false,N);
  FAIR.forEach(([id,,l],i)=>{const x=20+i*121,y=264,on=s.f[id];o+=`<g data-act="fair:${id}">${R(x,y,114,44,22,on?"var(--good)":"var(--paper)",on?"":`stroke="var(--line)" stroke-width="2"`)}<circle cx="${x+20}" cy="${y+22}" r="9" fill="${on?"var(--paper)":"var(--fill)"}"/>${on?`<path d="M${x+15},${y+22} l4,4 l7,-8" fill="none" stroke="var(--good)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`:""}${T(x+36,y+27,l,{s:13.5,w:700,f:on?"var(--paper)":"var(--ink)"})}</g>`});
  o+=T(20,346,"FAIRNESS",{s:12,w:700,f:"var(--rose)",ls:1})+R(20,356,500,24,12,"var(--fill)")+R(20,356,Math.max(24,500*k/5),24,12,k===5?"var(--good)":k>=3?"var(--sun)":"var(--hot)",`style="transition:width .4s"`)+T(620,377,`${k} of 5`,{s:24,w:600,a:"end",r:1});
  return {vb:"0 0 640 400",o}}

// STEP 5 · linked or caused: ice blocks and sunburn, and the hidden factor
function drawCause(){const N=nar();let o="";
  const px0=N?52:76,px1=N?342:380,py0=N?24:30,py1=N?256:318,X=v=>px0+v/200*(px1-px0),Y=v=>py1-v/20*(py1-py0);
  o+=R(px0,py0,px1-px0,py1-py0,12,"var(--paper)");
  [0,50,100,150,200].forEach(v=>{o+=`<line x1="${X(v)}" y1="${py0}" x2="${X(v)}" y2="${py1}" stroke="var(--line)" stroke-width="1"/>`+T(X(v),py1+18,String(v),{s:12,w:600,a:"middle",f:"var(--rose)"})});
  [0,5,10,15,20].forEach(v=>{o+=`<line x1="${px0}" y1="${Y(v)}" x2="${px1}" y2="${Y(v)}" stroke="var(--line)" stroke-width="1"/>`+T(px0-8,Y(v)+4,String(v),{s:12,w:600,a:"end",f:"var(--rose)"})});
  o+=T((px0+px1)/2,py1+(N?38:40),"Ice blocks sold in a day",{s:N?13:14,w:700,a:"middle"});
  o+=`<text transform="translate(${N?16:26},${(py0+py1)/2}) rotate(-90)" text-anchor="middle" style="font:700 ${N?13:14}px var(--display);fill:var(--ink)">Sunburn cases</text>`;
  o+=`<line x1="${X(10)}" y1="${Y(CORR.a+CORR.b*10)}" x2="${X(200)}" y2="${Y(Math.min(20,CORR.a+CORR.b*200))}" stroke="var(--rose)" stroke-width="2.5" stroke-dasharray="6 6"/>`;
  DAYS.forEach(d=>{o+=`<circle cx="${X(d.ice)}" cy="${Y(d.burn)}" r="${N?6:7.5}" fill="${s.reveal?tCol(d.t):"var(--sea)"}" stroke="var(--paper)" stroke-width="2" style="transition:fill .5s"/>`});
  if(s.reveal){const lx=px0+10,ly=py0+10;o+=R(lx,ly,172,30,15,"rgba(255,255,255,.94)",`stroke="var(--line)"`)+T(lx+12,ly+20,"cooler",{s:12,w:700,f:"var(--rose)"})+[0,1,2,3,4].map(i=>`<circle cx="${lx+62+i*12}" cy="${ly+15}" r="5" fill="${tCol(17+i*13/4)}"/>`).join("")+T(lx+124,ly+20,"hotter",{s:12,w:700,f:"var(--rose)"})}
  // the diagram
  const D=N?{sx:180,sy:376,ix:90,iy:482,bx:270,by:482,nw:112,v:0}:{sx:584,sy:96,ix:466,iy:196,bx:466,by:340,nw:120,v:1};
  const node=(cx,cy,lab,icon)=>R(cx-D.nw/2,cy-30,D.nw,60,16,"var(--paper)",`stroke="var(--line)" stroke-width="2"`)+icon+T(cx,cy+22,lab,{s:N?13:12.5,w:700,a:"middle"});
  const pop=(cx,cy)=>`<g transform="translate(${cx},${cy-8})">${R(-5,-14,10,24,5,"#FF8FB1")}${R(-5,-14,10,9,4,"#FFD1DE")}<line x1="0" y1="10" x2="0" y2="18" stroke="#C58B53" stroke-width="3" stroke-linecap="round"/></g>`;
  const burn=(cx,cy)=>`<g transform="translate(${cx},${cy-8})"><circle r="11" fill="#FF9E80"/><circle cx="-4" cy="-2" r="1.6" fill="var(--ink)"/><circle cx="4" cy="-2" r="1.6" fill="var(--ink)"/><path d="M-4,5 q4,-3 8,0" stroke="var(--ink)" stroke-width="1.6" fill="none" stroke-linecap="round"/></g>`;
  const arrow=(x1,y1,x2,y2,c,dash)=>{const a=Math.atan2(y2-y1,x2-x1),hx=x2-Math.cos(a)*12,hy=y2-Math.sin(a)*12;return `<line x1="${x1}" y1="${y1}" x2="${hx}" y2="${hy}" stroke="${c}" stroke-width="3.5" stroke-linecap="round"${dash?` stroke-dasharray="6 7"`:""}/><path d="M${x2},${y2} L${hx-Math.sin(a)*7},${hy+Math.cos(a)*7} L${hx+Math.sin(a)*7},${hy-Math.cos(a)*7}z" fill="${c}"/>`};
  const mx=(D.ix+D.bx)/2,my=(D.iy+D.by)/2;
  o+=D.v?arrow(D.ix,D.iy+32,D.bx,D.by-34,s.reveal?"var(--moon)":"var(--rose)",true):arrow(D.ix+D.nw/2+2,D.iy,D.bx-D.nw/2-4,D.by,s.reveal?"var(--moon)":"var(--rose)",true);
  if(!s.reveal)o+=`<circle cx="${mx+(D.v?26:0)}" cy="${my-(D.v?0:22)}" r="13" fill="var(--rose)"/>`+T(mx+(D.v?26:0),my-(D.v?0:22)+5,"?",{s:16,w:700,a:"middle",f:"var(--paper)",r:1});
  else o+=`<g class="cc-pop"><circle cx="${mx}" cy="${my}" r="13" fill="var(--hot)"/><path d="M${mx-5},${my-5} l10,10 M${mx+5},${my-5} l-10,10" stroke="var(--paper)" stroke-width="3" stroke-linecap="round"/></g>`;
  o+=node(D.ix,D.iy,"Ice blocks",pop(D.ix,D.iy-4))+node(D.bx,D.by,"Sunburn",burn(D.bx,D.by-4));
  const from=(tx,ty)=>{const a=Math.atan2(ty-D.sy,tx-D.sx);return [D.sx+Math.cos(a)*50,D.sy+Math.sin(a)*50]};
  if(s.reveal){o+=D.v?arrow(...from(D.ix+D.nw/2+6,D.iy-4),D.ix+D.nw/2+6,D.iy-4,"var(--ink)")+arrow(...from(D.bx+D.nw/2+6,D.by-12),D.bx+D.nw/2+6,D.by-12,"var(--ink)"):arrow(D.sx-14,D.sy+40,D.ix+6,D.iy-34,"var(--ink)")+arrow(D.sx+14,D.sy+40,D.bx-6,D.by-34,"var(--ink)");
    o+=`<g class="cc-pop"><circle cx="${D.sx}" cy="${D.sy}" r="30" fill="var(--sun)"/>${[...Array(10)].map((_,i)=>{const a=i*Math.PI/5;return `<line x1="${D.sx+Math.cos(a)*36}" y1="${D.sy+Math.sin(a)*36}" x2="${D.sx+Math.cos(a)*44}" y2="${D.sy+Math.sin(a)*44}" stroke="var(--sun)" stroke-width="4" stroke-linecap="round"/>`}).join("")}</g>`+T(D.sx,D.sy-52,"Hot, sunny day",{s:N?14:13.5,w:700,a:"middle"})}
  else o+=`<circle cx="${D.sx}" cy="${D.sy}" r="30" fill="var(--paper)" stroke="var(--line)" stroke-width="2.5" stroke-dasharray="6 5"/>`+T(D.sx,D.sy+8,"?",{s:24,w:700,a:"middle",f:"var(--rose)",r:1})+T(D.sx,D.sy-44,"Something else?",{s:N?13:12.5,w:700,a:"middle",f:"var(--rose)"});
  return {vb:N?"0 0 360 528":"0 0 640 400",o}}

// STEP 6 · hype words flipped into science words
function drawWords(){const N=nar(),W=WORDS.find(w=>w.id===s.word)||WORDS[0],anim=Date.now()-s.flipAt<450;let o="";
  const cardSm=(w,x,y,cw,ch,fs)=>{const sel=w.id===s.word,fl=s.flipped.has(w.id);return `<g data-act="word:${w.id}">${R(x,y,cw,ch,16,sel?"var(--acc)":"var(--paper)",sel?"":`stroke="${fl?"var(--good)":"var(--line)"}" stroke-width="2"`)}
    ${T(x+cw/2,y+ch/2+(fl&&!sel?0:5),w.w,{s:fs,w:700,a:"middle",f:sel?"var(--paper)":"var(--ink)"})}${fl&&!sel?T(x+cw/2,y+ch/2+20,"flipped ✓",{s:11.5,w:700,a:"middle",f:"var(--good)"}):""}</g>`};
  const big=(x,y,w,h)=>{const sci=wrap(W.sci,Math.floor((w-48)/9.6)),why=wrap(W.why,Math.floor((w-48)/7.3));let g=`<g${anim?` class="cc-flip"`:""}>`+R(x,y,w,h,24,"var(--paper)",`stroke="var(--line)" stroke-width="2"`)+R(x+24,y+14,44,6,3,"var(--acc)");
    let yy=y+38;g+=T(x+24,yy,"THE POST SAYS",{s:11.5,w:700,f:"var(--rose)",ls:.8});yy+=34;
    g+=T(x+24,yy,`“${W.w}”`,{s:26,w:600,r:1,f:"var(--ink)"});const tw=Math.min(w-48,(W.w.length+2)*13.6);g+=`<line x1="${x+22}" y1="${yy-9}" x2="${x+24+tw}" y2="${yy-9}" stroke="var(--hot)" stroke-width="4" stroke-linecap="round" opacity=".85"/>`;
    yy+=30;g+=T(x+24,yy,"A SCIENTIST WOULD WRITE",{s:11.5,w:700,f:"var(--good)",ls:.8});yy+=28;
    g+=TL(x+24,yy,sci,{s:18,w:700},23);yy+=sci.length*23+14;
    g+=`<line x1="${x+24}" y1="${yy-6}" x2="${x+w-24}" y2="${yy-6}" stroke="var(--line)" stroke-width="2"/>`;yy+=18;
    g+=T(x+24,yy,"WHY",{s:11.5,w:700,f:"var(--rose)",ls:.8});yy+=22;g+=TL(x+24,yy,why,{s:14,w:500,f:"var(--body)"},19);return g+"</g>"};
  if(N){WORDS.forEach((w,i)=>{o+=cardSm(w,12+(i%3)*114,10+Math.floor(i/3)*68,106,60,w.w.length>10?12.5:14.5)});o+=big(12,152,336,360);return {vb:"0 0 360 524",o}}
  WORDS.forEach((w,i)=>{o+=cardSm(w,22+(i%2)*152,28+Math.floor(i/2)*118,142,104,17)});
  o+=big(334,24,284,352);
  return {vb:"0 0 640 400",o}}

// STEP 7 · the verdict board
function drawTest(){const N=nar();const k=fairN(),v=score(s.src);
  const items=[
    {t:"Source",ok:s.src==="journal",part:v>=2,st:s.src==="journal"?"Peer-reviewed: passes all four checks":`${SRC[s.src].name}: ${v} of 4 checks`},
    {t:"Sample size",ok:s.swing&&s.steady,part:s.swing||s.steady,st:s.swing&&s.steady?"Chance faked a win at small n, not at 200+":s.swing?"Chance faked a win. Now try 200+ per group":"Run tiny studies until chance fakes +15%"},
    {t:"Fair test",ok:k===5,part:k>=3,st:`${k} of 5 features switched on`},
    {t:"Verdict",ok:s.verdict==="weak",part:false,st:s.verdict==="weak"?"Weak: tiny study, no control, paid post":s.verdict?"Not quite. Weigh up the evidence":"Choose your verdict"}];
  let o="";const tile=(it,i,x,y,w,h)=>{const col=it.ok?"var(--good)":it.part?"var(--sun)":"var(--fill)";const rr=N?24:34,cx=x+(N?38:58),cy=y+h/2;
    let g=R(x,y,w,h,22,it.ok?"#E3F6EE":"var(--paper)",`stroke="${it.ok?"var(--good)":"var(--line)"}" stroke-width="2"`)+`<circle cx="${cx}" cy="${cy}" r="${rr}" fill="${col}"/>`;
    g+=it.ok?`<path d="M${cx-rr*.42},${cy} l${rr*.3},${rr*.3} l${rr*.55},-${rr*.6}" fill="none" stroke="var(--paper)" stroke-width="${N?4.5:6}" stroke-linecap="round" stroke-linejoin="round"/>`:T(cx,cy+(N?7:10),String(i+1),{s:N?20:28,w:600,a:"middle",r:1,f:it.part?"var(--ink)":"var(--rose)"});
    const tx=x+(N?74:106),lines=wrap(it.st,N?30:22);g+=T(tx,cy-(N?(lines.length>1?16:6):(lines.length>1?20:8)),it.t,{s:N?16:19,w:600,r:1})+TL(tx,cy+(N?(lines.length>1?4:14):(lines.length>1?4:16)),lines,{s:N?12.5:14,w:500,f:"var(--body)"},N?16:19);return g};
  if(N){items.forEach((it,i)=>{o+=tile(it,i,12,10+i*96,336,86)});return {vb:"0 0 360 398",o}}
  items.forEach((it,i)=>{o+=tile(it,i,20+(i%2)*306,22+Math.floor(i/2)*186,294,170)});
  if(s.verdict==="weak")o+=`<g transform="translate(548,346) rotate(-8)"><g class="cc-pop">${R(-74,-20,148,40,10,"rgba(255,255,255,.85)",`stroke="var(--hot)" stroke-width="3.5"`)}${T(0,8,"WEAK CLAIM",{s:19,w:700,a:"middle",f:"var(--hot)",ls:1.5})}</g></g>`;
  return {vb:"0 0 640 400",o}}

function drawMain(st,step){const f={apart:drawApart,source:drawSource,sample:drawSample,fair:drawFair,cause:drawCause,words:drawWords,test:drawTest}[step.k]||drawApart;
  const r=f();try{document.getElementById("k-main").setAttribute("viewBox",r.vb)}catch(e){}return r.o}

// =====================================================================================================================
const steps=[
  {k:"apart",lab:"Pull it apart",cap:"A post makes a big promise. Light up each lens: who's behind it, the hype, the claim and the evidence.",
    controls:["hlWho","hlHype","hlClaim","hlEv","hlAll"],chips:["found","claim","ev","who"],
    exam:"The claim is that drinking FocusFizz raises test scores by 20%. The only evidence is the company's own study of 12 students, compared with their last quiz instead of a control group, so it can't show the drink caused the change.",
    trap:"Don't just repeat the claim: say what evidence backs it, and what's missing.",
    big:"Every claim has three parts to check: what's claimed, the evidence behind it, and who's saying it."},
  {k:"source",lab:"Who says so?",cap:"Same claim, different messenger. Pick a source and watch the trust dial move.",
    controls:["src"],chips:["src","trust","chan"],
    exam:"The post was paid for by FocusFizz, which sells the drink, so the source has a conflict of interest. A peer-reviewed article by independent scientists that shows its data would be more reliable.",
    trap:"Lots of likes and views don't make a source reliable: popularity isn't peer review.",
    big:"Trust grows when a source is expert, independent, peer-reviewed and shows its data."},
  {k:"sample",lab:"How many?",cap:"Here the drink does nothing at all. Run studies and watch chance fake a result when groups are small.",speed:true,
    controls:["play","run","n","clear"],chips:["n","real","last","spread","count"],
    exam:"With only 12 students, random variation alone could produce a 20% difference in scores. A much larger sample reduces the effect of chance, so its result would be more reliable.",
    trap:"A big percentage from a tiny sample isn't strong evidence: it may just be chance.",
    big:"Small samples swing by chance; bigger samples settle close to the truth."},
  {k:"fair",lab:"Fair test",cap:"Design a fair test for FocusFizz. Each feature you switch on fills the fairness meter.",
    controls:["fControl","fRandom","fSame","fBlind","fBig"],chips:["fair","per","missing"],
    exam:"A fair test needs a control group given water, students put into groups at random, the same test for both groups, and blinding so nobody knows who had which drink. The FocusFizz study had none of these.",
    trap:"Comparing with “last time” isn't a control: students may simply have studied more or had an easier quiz.",
    big:"A fair test changes one thing and keeps everything else the same."},
  {k:"cause",lab:"Linked or caused?",cap:"Ice-block sales and sunburn rise together. Does one cause the other? Reveal what's hiding.",
    controls:["reveal"],chips:["r","hidden","cause"],
    exam:`Ice-block sales and sunburn cases show a strong positive correlation (r ≈ ${CORR.r.toFixed(2)}), but ice blocks don't cause sunburn. Both go up on hot, sunny days, which is the hidden factor.`,
    trap:"Correlation doesn't prove causation: look for a hidden factor that drives both.",
    big:"Two things rising together doesn't mean one causes the other."},
  {k:"words",lab:"Science words",cap:"Hype words sound scientific. Flip each card to see what a scientist would write instead.",
    controls:["word"],chips:["flipped","word"],
    exam:"“Chemical-free” is misleading because everything, including water, is made of chemicals. Scientists use cautious words like “the results suggest” because one small study can't prove a claim.",
    trap:"“Natural” doesn't mean safe, and it doesn't mean it works.",
    big:"Science language is precise and careful; hype language is vague and certain."},
  {k:"test",lab:"Your verdict",cap:"Check the claim like an examiner: the source, the sample, a fair test, then your verdict.",
    controls:["src","n","run","fControl","fRandom","fSame","fBlind","fBig","verdict"],chips:["done","trust","fair"],
    exam:"Overall the claim is weak. It rests on a tiny study of 12 students with no control group, run by the company that sells the drink, and it uses hype words instead of data.",
    trap:"A judgement needs reasons: “it's weak” on its own won't earn the marks.",
    big:"Judge a claim on its evidence, not on how confident it sounds."}];

const hlTog=(k,l)=>({type:"toggle",id:"hl"+k[0].toUpperCase()+k.slice(1),label:l,get:()=>s.hl[k],set:(x,v)=>{s.hl[k]=v}});
const fTog=(k,l)=>({type:"toggle",id:"f"+k[0].toUpperCase()+k.slice(1),label:l,get:()=>s.f[k],set:(x,v)=>{s.f[k]=v}});
const api=K.mount({
  eyebrow:"Science · Claims and evidence",title:"The claim checker",crumb:"NCEA Level 1 Science · science-related claims",homeHash:"l1",
  fig:"FIG. · A POST ABOUT A BRAIN DRINK",railTitle:"Check a claim like a scientist",
  badge:{label:"NCEA L1 Science 91923",exam:"2026-11-25T14:00:00+13:00",examText:"Wed 25 Nov, 2pm"},
  mainBox:"0 0 640 400",mainLabel:"An invented social media post about a brain drink, and the tools to check its claim",
  state:s,steps,
  controls:[
    hlTog("who","Who's behind it"),hlTog("hype","Hype words"),hlTog("claim","The claim"),hlTog("ev","The evidence"),
    {type:"button",id:"hlAll",label:"Show all",onClick:()=>{const all=LORDER.every(k=>s.hl[k]);LORDER.forEach(k=>s.hl[k]=!all)}},
    {type:"select",id:"src",label:"Source",options:[["ad","FocusFizz advert"],["inf","Influencer, paid by FocusFizz"],["news","News story about a study"],["journal","Peer-reviewed journal article"],["gov","Government health agency"]],get:()=>s.src,set:(x,v)=>{s.src=v}},
    {type:"play"},
    {type:"button",id:"run",label:"Run a study",onClick:()=>runStudy()},
    {type:"range",id:"n",label:"Students per group",min:5,max:500,step:5,get:()=>s.n,set:(x,v)=>{s.n=v},fmt:()=>String(s.n)},
    {type:"button",id:"clear",label:"Clear",onClick:()=>{s.all=s.all.filter(r=>r.n!==s.n);s.last=null}},
    fTog("control","Control group"),fTog("random","Random groups"),fTog("same","Same test"),fTog("blind","Blind"),fTog("big","Big sample"),
    {type:"toggle",id:"reveal",label:"Reveal the hidden factor",get:()=>s.reveal,set:(x,v)=>{s.reveal=v}},
    {type:"select",id:"word",label:"Hype word",options:WORDS.map(w=>[w.id,w.w]),get:()=>s.word,set:(x,v)=>{setWord(v)}},
    {type:"select",id:"verdict",label:"Your verdict",options:[["","Choose a verdict…"],["strong","Strong: a clinical study backs it"],["weak","Weak: tiny study, no control, paid post"],["natural","Weak: natural drinks can't work"],["popular","Strong: 12.4k people liked it"]],get:()=>s.verdict,set:(x,v)=>{s.verdict=v}}],
  tick:(x,dt)=>{s.acc+=dt;if(s.acc>=.32){s.acc=0;runStudy()}},
  drawMain:(x,st)=>drawMain(x,st),
  chips:()=>{const sh=shown(),v=score(s.src),k=fairN(),done=[s.src==="journal",s.swing&&s.steady,k===5,s.verdict==="weak"].filter(Boolean).length;
    const mn=sh.length?Math.min(...sh.map(r=>r.d)):0,mx=sh.length?Math.max(...sh.map(r=>r.d)):0,found=LORDER.filter(k=>s.hl[k]).length;
    return {found:["Lenses on",`${found} of 4`,found===4],claim:["The claim",s.hl.claim?"+20% test scores":"?"],ev:["Evidence",s.hl.ev?"12 students, no control":"?"],who:["Behind it",s.hl.who?"FocusFizz (paid post)":"?"],
      src:["Source",SRC[s.src].name],trust:["Trust checks",`${v} of 4`,v===4],chan:["Channel",SRC[s.src].chan],
      n:["Per group",`${s.n} students`],real:["Real effect","none (0%)"],last:["Last study",s.last&&s.last.n===s.n?fmtP(s.last.d):"–",!!(s.last&&s.last.n===s.n&&s.last.d>=15)],
      spread:["Results range",sh.length>1?`${fmtP(mn)} to ${fmtP(mx)}`:"–"],count:["Studies run",String(sh.length)],
      fair:["Fair test",`${k} of 5`,k===5],per:["Per group",s.f.big?"30 students":"6 students"],missing:["Missing",k===5?"nothing":FAIR.filter(([id])=>!s.f[id]).map(f=>f[1].toLowerCase()).slice(0,2).join(", ")+(5-k>2?"…":"")],
      r:["Correlation",`strong, r = ${CORR.r.toFixed(2)}`],hidden:["Hidden factor",s.reveal?"hot, sunny days":"?",s.reveal],cause:["Ice blocks cause sunburn?",s.reveal?"No":"?"],
      flipped:["Cards flipped",`${s.flipped.size} of 6`,s.flipped.size===6],word:["Hype word",(WORDS.find(w=>w.id===s.word)||WORDS[0]).w],
      done:["Checks done",`${done} of 4`,done===4]}},
  challenges:[
    {q:"Pick a source that passes all four trust checks.",check:()=>s.src==="journal",ok:"Yes: expert, independent, peer-reviewed, and it shows its data.",
      no:()=>`${SRC[s.src].name} passes ${score(s.src)} of 4. Which source is checked by other scientists and shows its data?`},
    {q:"No real effect here. Run tiny studies (5 or 10 per group) until chance “finds” a gain of +15% or more.",check:()=>s.swing,ok:"There it is: a big “effect” from pure chance. That's why 12 students isn't enough.",
      no:"Not yet. Set students per group to 5 or 10 and keep pressing Run a study."},
    {q:"Now run 10 studies in a row with 200 or more per group. Can chance still fake a big gain?",check:()=>s.steady,ok:"No: all ten land close to zero. Big samples drown out chance.",
      no:()=>`${bigCount()} of 10 so far with 200+ per group. Slide students per group to 200 or more and keep running.`},
    {q:"Switch on all five fair-test features, then give your verdict on the FocusFizz post.",check:()=>fairN()===5&&s.verdict==="weak",ok:"Spot on: a fair test would settle it, and the post's evidence is weak.",
      no:()=>fairN()<5?`${fairN()} of 5 features on. Which ones are still missing?`:s.verdict?"Check your verdict: what does the evidence actually show?":"All five on. Now choose your verdict."}],
  papers:[{label:"NZQA: Science",url:"https://www2.nzqa.govt.nz/ncea/subjects/past-exams-and-exemplars/science/"}],
  truth:"FocusFizz, @study.with.tia, the post, the sources and every study and data point here are invented for learning. The sample simulation gives both drinks exactly the same effect (none), so every gap you see is chance.",
  footer:"Covers AS 91923: identifying a science-related claim, critiquing the evidence behind it (sample size, fair testing, correlation and causation), the source and channel, and the use of science language."
});
function setWord(v){if(v!==s.word){s.word=v;s.flipped.add(v);s.flipAt=Date.now()}}
// tap the drawing too: lenses, fair-test features, word cards
document.getElementById("k-main").addEventListener("click",e=>{const t=e.target.closest("[data-act]");if(!t)return;const [a,v]=t.dataset.act.split(":");
  if(a==="hl")s.hl[v]=!s.hl[v];else if(a==="fair")s.f[v]=!s.f[v];else if(a==="word")setWord(v);else return;
  K.sfx("pop");api.redraw()});
try{mq.addEventListener("change",()=>api.redraw())}catch(e){}
})();
